/* The stats section on the 3D world, as ONE PAGE with three sections (2026-11-05). Layer: app (a page of the site); it reads the data files and the
   nodes' live feeds and decides nothing.

   History: three steps (2026-10-25, /stats/now, /stats/capabilities, /stats/ceiling, one card each) are folded into this one page, because the owner
   approved one clear page: the answer first, one headline throughput number, and everything else behind a click. The old addresses redirect here
   (js/pages/catalog.js, owned by the catalog), with ?s=capabilities or ?s=ceiling naming the section to open; both old ids are read below.

   THE PAGE, in this order, one section open at a time (the open one is the address's ?s= and the 3D's state):
     now          Now: "{ok} of {total} nodes answering", or "Nothing is live yet" and why, from the nodes' self-check (ArkPulse.get).
     throughput   Throughput: the ONE headline, the highest swaps/s into one node through the network (BENCH-015, derived from its rows). The summed lab
                  figure (BENCH-013, separate runs with no network, added up) is NOT the headline: it stands behind More as "lab sum, no network".
     operations   Operations: the chosen operation's fastest measured rate in its own unit (BENCH-013 matrix).
   Behind each section's More: the tables (per connection, p95 and room left), run ids, ISO weeks, devices, what limits it, what is not built.
   First view (the HUD, 2026-11-05): the answer "{ok} of {total} nodes answering", three numbers on the right (throughput, nodes, operations),
   section tabs, and one action: the explorer. "Devnet" is said once, as the kicker. The 3D show is js/space/shows/stats-now.mjs.
   The 3D: the ONE `stats` view (js/world2/world2-stage.mjs); now -> 'now', throughput -> 'ceiling', operations -> 'capabilities'.
   Words: the worldstats manifest (WORLDSTATS.*). Numbers: the data files, never typed here. A reading that does not exist says "No reading" and why;
   nothing becomes 0.

   Kept for the world host: data-panel and data-stage (the shared frame), the pt/pb pads, the stage picks, the tags layer, the legend.
   Removed on the HUD: the section heads (their names became tabs, their numbers the right column), "Devnet" beside the title.
   Removed before: the stepper, the per-step question cards and the "Next" action, the Now card's fleet facts (lab totals) as first-view facts.

   REDUCTION TEST (docs/PRODUCT-DESIGN-LAWS.md): 1 the question is the title; 2 the next question is the next section head; 3 one answer, Now;
   4 the facts behind it sit behind More; 5 nothing decorative; 6 conditions are one source line; 7 nothing more on first view; 8-9 the address names
   the open section; 10 what is not measured says No reading and why. */
(function () {
  'use strict';
  var W = ArkUI.worldSheet, node = W.node;
  var T = function (key, vars) { return W.text('WORLDSTATS.' + key, vars); };
  function H() { return window.ArkStatsHighlights || {}; }
  function caps() { return (window.DEFXN_CAPABILITIES || {}).capabilities || []; }
  function resolverIds() { return ((window.DEFXN_RESOLVERS || {}).resolvers || []).map(function (r) { return r.id; }); }
  function title(id) { return id.charAt(0).toUpperCase() + id.slice(1); }
  function fmt(n) { return Number(n).toLocaleString('en-US'); }
  var DATE = typeof Intl !== 'undefined' ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : null;
  function date(iso) { return DATE && iso ? DATE.format(new Date(iso + 'T00:00:00Z')) : iso || ''; }
  function ago(ms) {
    var min = Math.max(0, Math.round((Date.now() - ms) / 60000));
    if (min < 1) return T('AGO.NOW');
    if (min < 60) return T('AGO.MIN', { n: min });
    if (min < 1440) return T('AGO.HOUR', { n: Math.floor(min / 60) });
    return T('AGO.DAY', { n: Math.floor(min / 1440) });
  }

  /* ---------- the live readings, shared by every mount ----------
     The nodes' self-check (hourly) and the four live stats feeds of docs/stats/LIVE-DATA-CONTRACT.md, each read through the ONE client
     (js/ark/pulse-client.js). A feed is { status: wait | ok | stale | fail, data, why, at }. A live feed is asked again after its own interval_ms
     (2 s at the least, 60 s at the most); a feed that failed is asked again after 30 s. A reading older than 2 x interval_ms is stale: its data is
     kept only to say how old it is. */
  var FEEDS = {
    pulse: { client: 'get', every: 60000 },
    interactions: { client: 'interactions', live: true },
    capabilities: { client: 'capabilities', live: true },
    resolvers: { client: 'resolvers', live: true },
    runs: { client: 'runs', every: 60000 }
  };
  var feeds = {}, listeners = [], timers = {}, inflight = {};
  Object.keys(FEEDS).forEach(function (name) { feeds[name] = { status: 'wait', data: null, why: '', at: 0 }; });
  var pulse = feeds.pulse;
  function why(error) {
    var e = error || {}, m = String(e.message || '');
    if (e.name === 'AbortError') return T('PULSE.TIMEOUT');
    var http = /HTTP (\d+)/.exec(m); if (http) return T('PULSE.HTTP', { code: http[1] });
    if (/^Malformed/.test(m)) return T('PULSE.SHAPE');
    return T('PULSE.OFFLINE');
  }
  /* why a live stats feed has no reading, from the error the client threw (it keeps the host's refusal code) */
  function liveWhy(error) {
    var e = error || {}, m = String(e.message || '');
    if (e.code === 'FLEET_STATS_NOT_CONFIGURED') return T('LIVE.NOTCONFIGURED');
    if (e.code === 'FLEET_STATS_NOT_SERVED') return T('WHY.INTERACTIONS');
    if (e.status === 404) return T('LIVE.NOTSERVED');
    if (e.name === 'AbortError' || e.code === 'FLEET_STATS_TIMEOUT') return T('LIVE.TIMEOUT');
    if (/^Malformed/.test(m) || e.code === 'FLEET_STATS_MALFORMED') return T('LIVE.SHAPE');
    return T('LIVE.OFFLINE');
  }
  function settle(name, rec) {
    if (rec.status === 'ok' && FEEDS[name].live && ArkPulse.stale(rec.data)) rec = { status: 'stale', data: rec.data, why: T('LIVE.STALE', { age: liveAgo(rec.data) }), at: rec.at };
    feeds[name] = rec; if (name === 'pulse') pulse = rec;
  }
  function delayOf(name) {
    var F = FEEDS[name], rec = feeds[name], iv = rec.data && rec.data.interval_ms;
    if (rec.status === 'fail') return 30000;
    if (F.every) return F.every;
    return Math.max(2000, Math.min(60000, iv > 0 ? iv : 10000));
  }
  function poll(name) {
    var F = FEEDS[name];
    if (inflight[name]) return;
    if (!window.ArkPulse || typeof ArkPulse[F.client] !== 'function') {
      settle(name, { status: 'fail', data: null, why: name === 'pulse' ? T('PULSE.OFFLINE') : T('LIVE.NOCLIENT'), at: Date.now() }); tell(); return;
    }
    inflight[name] = true;
    ArkPulse[F.client]().then(function (r) { settle(name, { status: 'ok', data: r.data, why: '', at: Date.now() }); },
      function (e) { settle(name, { status: 'fail', data: null, why: name === 'pulse' ? why(e) : liveWhy(e), at: Date.now() }); })
      .then(function () { inflight[name] = false; tell(); schedule(name); });
  }
  function schedule(name) {
    clearTimeout(timers[name]);
    if (!listeners.length) return;
    timers[name] = setTimeout(function () { if (document.hidden) schedule(name); else poll(name); }, delayOf(name));
  }
  function tell() { listeners.slice().forEach(function (fn) { fn(pulse); }); }
  function watch(fn) {
    listeners.push(fn);
    if (listeners.length === 1) Object.keys(FEEDS).forEach(poll);
    return function () {
      var i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1);
      if (!listeners.length) Object.keys(timers).forEach(function (name) { clearTimeout(timers[name]); delete timers[name]; });
    };
  }
  /* how old a live reading is, by the host's age_ms (ArkPulse.age), so a visitor's clock does not have to agree with the node's */
  function liveAgo(data) { return ago(Date.now() - ArkPulse.age(data)); }
  /* a fact with no reading: the feed's reason, or the wait line */
  function noReading(label, rec, extra) { return Object.assign({ label: label, none: rec.status === 'wait' ? T('LIVE.WAIT') : rec.why }, extra || {}); }
  function fmt2(n) { return Number(n).toLocaleString('en-US', { maximumFractionDigits: n < 10 ? 2 : n < 100 ? 1 : 0 }); }
  function day(ms) { return date(new Date(ms).toISOString().slice(0, 10)); }
  /* the ISO week a run belongs to, derived from started_at_ms (the same rule as ArkSitePages.statsWeeks) */
  function weekOf(ms) { return window.ArkSitePages && ArkSitePages.isoWeek ? ArkSitePages.isoWeek(new Date(ms).toISOString().slice(0, 10)).number : '?'; }
  function newestRun(filter) {
    var runs = feeds.runs.status === 'ok' ? feeds.runs.data.runs.filter(filter || function () { return true; }) : [];
    return runs.reduce(function (a, b) { return !a || b.started_at_ms > a.started_at_ms ? b : a; }, null);
  }
  /* each capability (the ids of DEFXN_CAPABILITIES): requests/s now, p95 and room left from the live feed, null kept null, and why a cell has
     no reading: the node's own notBuilt reason when a run could not drive it */
  function liveCaps() {
    var rec = feeds.capabilities;
    if (rec.status !== 'ok') return null;
    var d = rec.data, nb = d.not_built || {};
    return caps().map(function (c) {
      var x = d.capabilities[c.id] || null, gone = nb[c.id] ? nb[c.id].reason : null, missing = gone || T('CAP.UNLISTED');
      return { id: c.id, row: x, why: {
        rate: x ? null : missing,
        p95: !x ? missing : x.p95_ms == null ? T('CAP.FEW') : null,
        room: !x ? missing : x.headroom_pct == null ? gone || (d.runs_error ? T('CAP.NORUNS') : T('CAP.NOCEILING')) : null } };
    });
  }
  function nodesOf(p) { return p.status === 'ok' ? p.data.nodes.map(function (n) { return { name: n.name, qps: n.qps, error: n.error || null }; }) : []; }
  /* the latest 100 interactions, as beads the world draws; a row with no latency_ms is not drawn (contract section 1) */
  function interactionsOf() {
    var rec = feeds.interactions, list = rec.status === 'ok' ? rec.data.interactions : [];
    return list.filter(function (x) { return x && typeof x.latency_ms === 'number'; }).slice(-100).map(function (x) { return { ms: x.latency_ms, ok: x.ok }; });
  }

  /* ---------- the room the page takes from the stage ----------
     The legend stands over the bottom of the stage. The stage frames the field in what is left, so the page measures it (CSS pixels from the stage's
     edges) and tells the world as state pt and pb. */
  var pad = { pt: 0, pb: 0 };
  function measure(f) {
    var pg = f.page, was = pg.hidden, vis = pg.style.visibility;
    if (was) { pg.hidden = false; pg.style.visibility = 'hidden'; }
    try {
      var sr = f.stage.getBoundingClientRect(), lg = f.stage.querySelector('.ws-legend');
      return { pt: 0, pb: lg ? Math.max(0, Math.round(sr.bottom - lg.getBoundingClientRect().top)) : 0 };
    } finally { if (was) { pg.hidden = true; pg.style.visibility = vis; } }
  }
  function track(ctx, d) {
    function go() {
      ctx.arm && ctx.arm(); var m = measure(ctx.f); if (m.pt === pad.pt && m.pb === pad.pb) return;
      pad = m; var h = W.host(); if (h && h.select) h.select(d.world(ctx.st));
    }
    var ro = window.ResizeObserver ? new ResizeObserver(go) : null;
    if (ro) { ctx.f.ro = ro; ro.observe(ctx.f.stage); var was = ctx.dispose; ctx.dispose = function () { ro.disconnect(); if (was) was(); }; }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
    /* the legend rises after fonts load, so the first measure reads it mid-motion: each animation on it is asked once for its finished promise */
    var seen = new WeakSet();
    function arm(el) { for (var n = el; n && n.getAnimations; n = n.parentElement) n.getAnimations().forEach(function (a) { if (!seen.has(a)) { seen.add(a); a.finished.then(go, function () {}); } }); }
    ctx.arm = function () { arm(ctx.f.stage); arm(ctx.f.stage.querySelector('.ws-legend')); };
    ctx.arm();
    ctx.f.stage.addEventListener('transitionend', go); ctx.f.stage.addEventListener('animationend', go);
  }

  /* a tick on a ruler or a title of one, placed by the world on its 3D point */
  function tick(id, text, at, cls, sub) { return { id: id, name: text, sub: sub || '', cls: 'small tick' + (cls ? ' ' + cls : ''), at: at }; }
  /* the legend under the stage: what one cube or one dotted line stands for in the section open. items: [swatch kind, words] */
  function unitKey(f, items) {
    var box = f.stage.querySelector('.ws-legend');
    if (!box) { box = node('ul', 'ws-legend rise'); box.setAttribute('aria-label', T('LEGEND.LABEL')); f.stage.appendChild(box); if (f.ro) f.ro.observe(box); }
    box.textContent = '';
    items.forEach(function (it) { var li = node('li'), sw = node('i', 'sw sw-' + it[0]); sw.setAttribute('aria-hidden', 'true'); li.appendChild(sw); li.appendChild(document.createTextNode(it[1])); box.appendChild(li); });
    pad = measure(f);
  }
  function ops() { return window.ArkStatsScale && ArkStatsScale.operations && H().operations ? ArkStatsScale.operations(H().operations.rows) : []; }
  function cubeRate() { return (window.ArkStatsScale && ArkStatsScale.CUBE_RATE) || 1000; }
  /* the headline: the row with the most swaps/s, so the number is the data's and never typed twice */
  function topPoint(cp) { return cp.byConnections.reduce(function (a, p) { return !a || p.swapsPerSecond > a.swapsPerSecond ? p : a; }, null); }

  /* ---------- the facts behind a More ---------- */
  function facts(rows) {
    var list = node('dl', 'ws-facts2');
    rows.forEach(function (r) {
      var cell = node('div', (r.none ? 'none' : '') + (r.wide ? ' wide' : '')); cell.appendChild(node('dt', null, r.label));
      var dd = node('dd');
      if (r.none) { dd.appendChild(node('b', null, T('NONE'))); dd.appendChild(node('small', null, r.none)); }
      else { dd.appendChild(node('b', null, r.value)); if (r.unit) dd.appendChild(node('span', null, r.unit)); if (r.sub) dd.appendChild(node('small', null, r.sub)); }
      cell.appendChild(dd); list.appendChild(cell);
    });
    return list;
  }
  /* a plain table: a head row and body rows; a cell is a string, or { none: reason } for a reading that does not exist */
  function table(head, rows) {
    var t = node('table'), hr = node('tr'), th = node('thead'), tb = node('tbody');
    head.forEach(function (h) { hr.appendChild(node('th', null, h)); }); th.appendChild(hr); t.appendChild(th);
    rows.forEach(function (r) {
      var tr = node('tr'); tr.appendChild(node('th', null, r[0]));
      r.slice(1).forEach(function (c) {
        var td = node('td');
        if (c && c.none) { td.className = 'none'; td.appendChild(node('b', null, T('NONE'))); td.appendChild(node('small', null, c.none)); } else td.appendChild(node('b', null, c));
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    t.appendChild(tb); return t;
  }

  /* ---------- the three sections ---------- */
  var SECS = ['now', 'throughput', 'operations'];
  var STAGE = { now: 'now', throughput: 'ceiling', operations: 'capabilities' };
  /* the old step ids the redirects carry (?s=capabilities, ?s=ceiling) name the section that replaced them */
  var OLD = { capabilities: 'operations', ceiling: 'throughput' };
  function secOf(s) { s = OLD[s] || s; return SECS.indexOf(s) >= 0 ? s : null; }

  function pageDef(key, dflt) {
    var list = ops(), ui = { secs: {} }, d = {
      view: 'stats', key: key, titleId: 'ws-stats-title', here: 'WORLDSTATS.HERE', note: false,
      parse: function (q) { var g = W.pick(list, q.get('c')); return { s: secOf(q.get('s')) || dflt, c: g ? g.id : '' }; },
      query: function (st) {
        var out = [];
        if (st.s !== 'now') out.push('s=' + st.s);
        if (st.s === 'operations' && st.c && list[0] && st.c !== list[0].id) out.push('c=' + st.c);
        return out.join('&');
      },
      world: function (st) {
        var s = st && st.s || dflt;
        return Object.assign(W.state('stats', { s: STAGE[s], c: st && st.c || '', pt: pad.pt, pb: pad.pb }), { nodes: nodesOf(pulse), interactions: interactionsOf() });
      },
      picks: { stagePick: function (a, b, ctx) {
        var p = W.picked(a, b);
        if (p.kind === 'operation' && p.id) ctx.set({ s: 'operations', c: p.id });
        else if (p.kind === 'station' && p.id) W.go(p.id);
      } },
      keys: function (e, st, ctx) {
        if (st.s !== 'operations') return;
        var step = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0; if (!step || !list.length) return;
        var i = list.findIndex(function (g) { return g.id === st.c; }); ctx.set({ c: list[(Math.max(0, i) + step + list.length) % list.length].id });
      }
    };

    /* one section on the HUD (css/space-frame.css): a tab in .hud-tabs that opens it, a .hud-stat on the right holding its one number with
       its unit, and a body in .hud-body (the source line and its More). Only the open section's body shows. */
    function section(ctx, s) {
      var id = 'ws-sec-' + s, tab = node('button'), body = node('div', 'ws-open'), stat = node('div', 'hud-stat');
      tab.type = 'button'; tab.setAttribute('role', 'tab'); tab.setAttribute('aria-controls', id); body.id = id; body.setAttribute('role', 'tabpanel');
      tab.addEventListener('click', function () { if (ctx.st.s !== s) ctx.set({ s: s }); });
      stat.appendChild(node('b')); stat.appendChild(node('span'));
      ui.tabs.appendChild(tab); ui.body.appendChild(body);
      return { tab: tab, body: body, stat: stat, means: '' };
    }
    /* a section's tab name, its stat (value and unit), and what the number measures (shown first in its open body) */
    function setHead(sec, name, value, unit, means) {
      sec.tab.textContent = name;
      sec.stat.firstChild.textContent = value; sec.stat.lastChild.textContent = unit || name;
      sec.stat.title = means || ''; sec.means = means || '';
    }
    /* a body: what the number measures, the source in plain words, and the More that holds the rest. The More stays open across redraws. */
    function setBody(sec, source, more) {
      var was = sec.body.querySelector('details'), open = !!(was && was.open);
      sec.body.textContent = '';
      if (sec.means) sec.body.appendChild(node('p', 'ws-note', sec.means));
      sec.body.appendChild(node('p', 'ws-source mono', source));
      var det = node('details', 'ws-live'), sum = node('summary'); sum.appendChild(node('span', null, T('MORE'))); det.appendChild(sum);
      more.forEach(function (el) { det.appendChild(el); });
      det.open = open; sec.body.appendChild(det);
    }
    /* the dock's chips: the open section's own controls (the operation picker), or none */
    function setChips(el) { ui.chips.textContent = ''; if (el) ui.chips.appendChild(el); }

    function renderNow(sec, open) {
      var p = pulse;
      if (p.status === 'ok') {
        var ok = p.data.nodes.filter(function (n) { return !n.error; }).length;
        setHead(sec, T('SEC.NOW'), T('NOW.COUNT', { ok: ok, total: p.data.nodes.length }), T('NOW.UNIT'), T('NOW.AGE', { age: ago(p.data.measured_at_ms) }));
        ui.answer.textContent = T('NOW.COUNT', { ok: ok, total: p.data.nodes.length }) + ' ' + T('NOW.UNIT');
      } else {
        setHead(sec, T('SEC.NOW'), T('NOW.NONE'), '', p.status === 'wait' ? T('PULSE.WAIT') : p.why);
        ui.answer.textContent = T('NOW.NONE') + '. ' + (p.status === 'wait' ? T('PULSE.WAIT') : p.why);
      }
      if (!open) return;
      var self = p.status === 'ok' ? { label: T('NOW.ROW.PULSE'), value: fmt(p.data.aggregate_qps), unit: T('UNIT.OPS.S') } : noReading(T('NOW.ROW.PULSE'), p);
      var cr = feeds.capabilities, live;
      if (cr.status === 'ok') {
        /* only the capabilities this site lists (the node may count others) */
        var rows = caps().map(function (c) { return cr.data.capabilities[c.id]; }).filter(Boolean), rates = rows.filter(function (c) { return c.per_second != null; });
        live = rates.length
          ? { label: T('NOW.LIVE'), value: fmt2(rates.reduce(function (a, c) { return a + c.per_second; }, 0)), unit: T('UNIT.REQ.S'),
              sub: T('NOW.LIVE.SUB', { errors: fmt(rows.reduce(function (a, c) { return a + c.errors; }, 0)), s: fmt(Math.round(cr.data.window_ms / 1000)), node: cr.data.node || '', age: liveAgo(cr.data) }) }
          : { label: T('NOW.LIVE'), none: T('LIVE.NOCAPS') };
      } else live = noReading(T('NOW.LIVE'), cr);
      var run = newestRun(), rr = feeds.runs, last;
      if (run) last = { label: T('NOW.RUN'), value: run.id, sub: T('NOW.RUN.SUB', { kind: run.kind, week: weekOf(run.started_at_ms), date: day(run.started_at_ms), device: run.device }), wide: true };
      else if (rr.status === 'ok') last = { label: T('NOW.RUN'), none: rr.data.next_run_at_ms ? T('RUN.NEXT', { date: day(rr.data.next_run_at_ms) }) : T('RUN.NONE'), wide: true };
      else last = noReading(T('NOW.RUN'), rr, { wide: true });
      setBody(sec, T('NOW.SOURCE'), [facts([self, live, last])]);
    }

    function renderThroughput(sec, open) {
      var cp = H().clientPath, F = (H().operations || {}).fleet, OPm = H().operations || {}, D = H().defiShard;
      if (!cp) { setHead(sec, T('SEC.THROUGHPUT'), T('NONE'), '', T('THRU.NODATA')); return; }
      var top = topPoint(cp), one = cp.byConnections[0], machine = cp.machine.replace(/,.*$/, '');
      setHead(sec, T('SEC.THROUGHPUT'), fmt(top.swapsPerSecond), T('UNIT.SWAPS.S'), T('THRU.MEANS'));
      if (!open) return;
      var rows = [
        { label: T('THRU.CONNS'), value: fmt(top.connections), sub: T('THRU.ONE', { n: fmt(one.swapsPerSecond) }) },
        { label: T('THRU.CORES'), value: T('THRU.CORES.OF', { used: cp.serverCoresAtCeiling, all: cp.cores }) }
      ];
      /* what limits it: the send to the replicas against the time to resolve (BENCH-012) */
      if (D) rows.push({ label: T('THRU.LIMIT'), value: fmt(Math.round(D.broadcastLatencyMs)), unit: T('UNIT.MS'), sub: T('THRU.LIMIT.SUB', { peers: D.peersReached, resolve: D.batchLatencyMs.toFixed(1), times: (D.broadcastLatencyMs / D.batchLatencyMs).toFixed(1), record: D.record }), wide: true });
      /* the summed lab figure, never the headline: separate runs with no network, added up (BENCH-013) */
      if (F) rows.push({ label: T('THRU.LAB'), value: fmt(F.parallelSwapsPerSecond), unit: T('UNIT.SWAPS.S'), sub: T('THRU.LAB.SUB', { nodes: F.nodes, record: OPm.record, date: date(OPm.date) }), wide: true });
      /* resolver load now (GET /api/fleet-resolvers), only the resolvers this site lists */
      var rr = feeds.resolvers;
      if (rr.status === 'ok') {
        var known = resolverIds(), ids = Object.keys(rr.data.resolvers).filter(function (id) { return known.indexOf(id) >= 0; }), secs = rr.data.window_ms / 1000;
        if (!ids.length || !(secs > 0)) rows.push({ label: T('CEIL.RES'), none: T('LIVE.NORES'), wide: true });
        else {
          var busy = ids.reduce(function (a, id) { return !a || rr.data.resolvers[id].swaps > rr.data.resolvers[a].swaps ? id : a; }, null), b = rr.data.resolvers[busy];
          rows.push({ label: T('CEIL.RES'), value: fmt2(ids.reduce(function (a, id) { return a + rr.data.resolvers[id].swaps; }, 0) / secs), unit: T('UNIT.SWAPS.S'),
            sub: T('CEIL.RES.SUB', { resolver: title(busy), batch: b.batch_ms_mean == null ? T('NONE') : fmt2(b.batch_ms_mean) + ' ' + T('UNIT.MS'), send: b.send_ms_mean == null ? T('NONE') : fmt2(b.send_ms_mean) + ' ' + T('UNIT.MS'), node: rr.data.node || '', age: liveAgo(rr.data) }), wide: true });
        }
      } else rows.push(noReading(T('CEIL.RES'), rr, { wide: true }));
      /* the newest stress or ceiling run the node filed (contract section 5) */
      var stress = newestRun(function (r) { return (r.kind === 'stress' || r.kind === 'ceiling') && r.ceiling.length; });
      if (stress) {
        var t2 = stress.ceiling.reduce(function (a, c) { return !a || c.per_second > a.per_second ? c : a; }, null);
        rows.push({ label: T('CEIL.RUN'), value: fmt2(t2.per_second), unit: T('UNIT.REQ.S'), sub: T('CEIL.RUN.SUB', { run: stress.id, n: fmt(t2.connections), date: day(stress.started_at_ms), device: stress.device }), wide: true });
      } else if (feeds.runs.status === 'ok') rows.push({ label: T('CEIL.RUN'), none: T('RUN.NOSTRESS'), wide: true });
      else rows.push(noReading(T('CEIL.RUN'), feeds.runs, { wide: true }));
      var per = table([T('THRU.COL.CONNS'), T('UNIT.SWAPS.S')], cp.byConnections.map(function (p) { return [fmt(p.connections), fmt(p.swapsPerSecond)]; }));
      setBody(sec, T('THRU.SOURCE', { machine: machine, date: date(cp.date) }),
        [node('p', 'ws-source mono', T('THRU.RUN', { record: cp.record })), node('p', 'ws-note', T('THRU.CAVEAT')), facts(rows), per]);
    }

    function renderOperations(sec, open, st) {
      var OPm = H().operations || {}, g = W.pick(list, st.c);
      if (!g) { setHead(sec, T('SEC.OPS'), T('NONE'), '', T('OPS.NODATA')); return; }
      var best = g.rows.slice().sort(function (a, b) { return b.rate - a.rate; })[0];
      setHead(sec, T('SEC.OPS'), fmt(best.rate), best.unit, T('OPS.MEANS', { op: g.name, variant: best.variant || g.name }));
      if (!open) return;
      var pick = node('div', 'ws-ops'); pick.setAttribute('role', 'group'); pick.setAttribute('aria-label', T('OPS.PICK'));
      list.forEach(function (x) { var b = node('button', 'hud-chip', x.name); b.type = 'button'; b.dataset.c = x.id; b.setAttribute('aria-pressed', x.id === g.id); pick.appendChild(b); });
      pick.addEventListener('click', function (e) { var b = e.target.closest('[data-c]'); if (b) d.ctx.set({ c: b.dataset.c }); });
      var rows = g.rows.filter(function (r) { return r !== best; }).map(function (r) { return { label: r.variant ? title(r.variant) : g.name, value: fmt(r.rate), unit: r.unit, sub: r.note }; });
      if ((OPm.notBuilt || []).length) rows.push({ label: T('OPS.NOTBUILT'), value: OPm.notBuilt.join(', '), wide: true });
      /* each capability, live: requests/s, p95 and room left, each cell its reading or "No reading" and why */
      var rec = feeds.capabilities, lc = liveCaps(), more = [node('p', 'ws-source mono', T('OPS.RUN', { record: OPm.record || '' })), facts(rows)];
      more.push(node('p', 'ws-note', rec.status === 'ok' ? T('CAP.LIVE.META', { s: fmt(Math.round(rec.data.window_ms / 1000)), node: rec.data.node || '', age: liveAgo(rec.data) }) : T('CAP.LIVE.TITLE')));
      if (lc) more.push(table([T('CAP.COL.NAME'), T('UNIT.REQ.S'), T('CAP.COL.P95'), T('CAP.COL.ROOM')], lc.map(function (r) {
        var x = r.row;
        return [title(r.id),
          r.why.rate ? { none: r.why.rate } : x.per_second != null ? fmt2(x.per_second) : { none: T('CAP.FEW') },
          r.why.p95 ? { none: r.why.p95 } : fmt2(x.p95_ms) + ' ' + T('UNIT.MS'),
          r.why.room ? { none: r.why.room } : fmt2(x.headroom_pct) + '%'];
      })));
      else more.push(facts([noReading(T('CAP.LIVE.TITLE'), rec)]));
      setBody(sec, T('OPS.SOURCE', { date: date(OPm.date || '') }), more); setChips(pick);
    }

    /* the 3D's labels and legend for the open section */
    function stageWords(f, s, st) {
      var tags = [];
      if (s === 'now') {
        var F = (H().operations || {}).fleet, beads = interactionsOf();
        unitKey(f, [['cube', T('KEY.CUBE.LAB', { n: fmt(cubeRate()) })], beads.length ? ['dot', T('KEY.BEADS', { n: fmt(beads.length) })] : ['none', T('KEY.LIVE')]]);
        if (F) tags.push(tick('v-total-swaps', fmt(F.parallelSwapsPerSecond), 'above'), tick('n-total-swaps', T('TAG.SWAPS'), 'below', 'grp', T('TAG.LAB')),
          tick('v-total-transfers', fmt(F.transfersPerSecond), 'above'), tick('n-total-transfers', T('TAG.TRANSFERS'), 'below', 'grp', T('TAG.LAB')));
        tags.push({ id: 'live', name: T('TAG.LIVE'), sub: beads.length ? T('TAG.LIVE.N', { n: fmt(beads.length) }) : T('NONE'), cls: 'small', at: 'left' });
      } else if (s === 'throughput') {
        var cp = H().clientPath; if (!cp) return;
        var top = topPoint(cp);
        unitKey(f, [['cube', T('KEY.CUBE.SWAPS', { n: fmt(cubeRate()) })], ['top', T('KEY.HIGHEST')]]);
        cp.byConnections.forEach(function (p) {
          var on = p === top;
          tags.push(tick('v-pt-' + p.connections, fmt(p.swapsPerSecond), 'above', on ? 'hot' : ''));
          tags.push(tick('n-pt-' + p.connections, T(p.connections === 1 ? 'TAG.CONN.ONE' : 'TAG.CONN.MANY', { n: fmt(p.connections) }), 'below', on ? 'hot' : ''));
        });
      } else {
        var g = W.pick(list, st.c), OPm = H().operations || {};
        unitKey(f, [['cube', T('KEY.CUBE.RATE', { n: fmt(cubeRate()) })], ['chosen', T('KEY.CHOSEN')], ['none', T('KEY.NOTBUILT')]]);
        list.forEach(function (x) {
          var on = g && x.id === g.id;
          x.rows.forEach(function (r, ri) { tags.push(tick('v-op-' + x.id + '-' + ri, fmt(r.rate), 'above', on ? 'hot' : '', x.rows.length > 1 ? r.variant : '')); });
          tags.push(tick('g-' + x.id, x.name, 'below', 'grp' + (on ? ' hot' : ''), x.rows.map(function (r) { return r.unit; }).filter(function (u, i, a) { return a.indexOf(u) === i; }).join(' · ')));
        });
        (OPm.notBuilt || []).forEach(function (nb) { tags.push(tick('n-nb-' + nb.toLowerCase().replace(/[^a-z0-9]+/g, '-'), nb, 'below', 'faint', T('TAG.NOTBUILT'))); });
      }
      W.tags(f.tags, tags);
    }

    /* the HUD (docs/design/space/SPACE.md "The page layout"): the sheet is .hud-left (kicker, title, the one answer, the section tabs, the
       open body); .hud-right holds the three numbers, the headline throughput first; .hud-dock holds the open section's chips and the one
       .hud-go. The middle of the screen is the 3D's. data-panel, data-stage, the tags layer and the legend stay where the world host reads them. */
    d.build = function (ctx) {
      d.ctx = ctx;
      ctx.f.page.classList.add('hud'); ctx.f.sheet.classList.add('hud-left');
      ctx.f.add(node('p', 'hud-kicker', T('DEVNET')));
      ui.title = ctx.f.add(node('h1', 'hud-title ws-q'), true); ui.title.id = 'ws-stats-title';
      ui.answer = ctx.f.add(node('p', 'hud-answer'), true); ui.answer.setAttribute('aria-live', 'polite');
      ui.tabs = ctx.f.add(node('div', 'hud-tabs')); ui.tabs.setAttribute('role', 'tablist'); ui.tabs.setAttribute('aria-label', T('TABS'));
      ui.body = ctx.f.add(node('div', 'hud-body'), true);
      SECS.forEach(function (s) { ui.secs[s] = section(ctx, s); });
      var right = node('aside', 'hud-right'), stats = node('div', 'hud-stats');
      right.setAttribute('aria-label', T('STATS'));
      ['throughput', 'now', 'operations'].forEach(function (s) { stats.appendChild(ui.secs[s].stat); });
      right.appendChild(stats); ctx.f.page.appendChild(right);
      var dock = node('div', 'hud-dock'); ui.chips = node('div', 'hud-chips');
      var go = W.link(node('a', 'hud-go', T('GO')), 'explorer');
      dock.appendChild(ui.chips); dock.appendChild(go); ctx.f.page.appendChild(dock);
      track(ctx, d);
      /* a live feed answering redraws the page and hands the world the nodes and the beads */
      var off = watch(function () { if (ctx.redraw) ctx.redraw(); var h = W.host(); if (h && h.select) h.select(d.world(ctx.st)); });
      var was = ctx.dispose; ctx.dispose = function () { off(); if (was) was(); };
    };
    d.render = function (st, ctx) {
      ctx.redraw = function () { d.render(ctx.st, ctx); };
      W.title(ui.title, T('TITLE'));
      if (st.s !== 'operations') setChips(null);
      SECS.forEach(function (s) {
        var sec = ui.secs[s], open = st.s === s;
        sec.tab.setAttribute('aria-selected', open); sec.tab.tabIndex = open ? 0 : -1; sec.body.hidden = !open;
        if (s === 'now') renderNow(sec, open); else if (s === 'throughput') renderThroughput(sec, open); else renderOperations(sec, open, st);
      });
      stageWords(ctx.f, st.s, st);
    };
    return d;
  }

  /* ---------- the page modules: one page; the two old ids open their section until the catalog redirects them ---------- */
  function module(key, dflt) { var inner = W.page(function () { return pageDef(key, dflt); }); return { prepare: function (page, settings) { return inner.prepare(page, settings); }, mount: function (hostEl) { return inner.mount(hostEl); } }; }
  ArkUI.pageModules.worldStatsNow = module('stats/now', 'now');
  ArkUI.pageModules.worldStatsCapabilities = module('stats/capabilities', 'operations');
  ArkUI.pageModules.worldStatsCeiling = module('stats/ceiling', 'throughput');
})();

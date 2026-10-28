/* The stats section on the 3D world, as ONE STORY in five steps (2026-10-25). Owner: "these 5 steps inside the stats the illustration is not coherent at
   all. it's freestyling no story no consistency and teaching", "the cards needs to be redesigned as well", "for the capabilities it is about measuring that
   speed, cause swap is a capability, transfer is the same", then "go".

   Then (2026-10-25): "I do not think we need all the 5 steps we can reduce the noise. audit and remove we are repeating ourselves nonstop." So three steps,
   each said once:
     1 /stats/now           The network: what all ten nodes do at once    BENCH-013 fleet row (each node at the same time, no network, added up), and what
                                                                           streams live (nothing yet: one fact says so)
     The network shows the fleet's totals only, never a node by name or one column per node: the fleet grows (owner, 2026-10-25).
     2 /stats/capabilities  How fast is each operation?                   BENCH-013 operation matrix (one machine, no network, each in its own unit)
     3 /stats/ceiling       How much does one node take, through the network?   BENCH-015 (the real WebSocket wire), and what limits it (BENCH-012's send)
   /stats/resolver, /stats/fleet and the week pages are retired: their keys redirect (js/pages/catalog.js).
   Every page stands on the ONE `stats` view (js/world/stats-stage.js): one illustration that changes shape for each step.

   THE CARD, the same on every step: the stepper (the three steps), the question as the title, ONE answer (a big number, its unit, and what it measures in
   one line), a few facts, the run it comes from and its date, and one action: the next step. The legend under the stage says what one cube stands for.
   Words: the worldstats manifest (WORLDSTATS.*). Numbers: the data files, never typed here. A reading that does not exist says "No reading" and why.

   LIVE (2026-10-28, docs/stats/LIVE-DATA-CONTRACT.md): every step also reads the node's live feeds through ArkPulse (interactions, capabilities,
   resolvers, runs). Now adds the live request rate, the beads of the latest interactions and the latest benchmark run (with its ISO week, derived
   from started_at_ms); Operations adds each capability's live rate, p95 and headroom; One node adds resolver load and the newest ceiling run. The
   dated records stay the answer and the offline copy. A feed that fails, or is older than 2 x interval_ms, says "No reading" and why, per fact;
   nothing becomes 0.

   REDUCTION TEST (docs/PRODUCT-DESIGN-LAWS.md), kept with the work: on every step 1 its question; 2 the next question; 3 one answer and what it measures;
   4 the facts behind it; 5 nothing; 6 conditions are one line, the device a fact; 7 nothing more; 8-9 the address; 10 what is not measured says so. */
(function () {
  'use strict';
  var W = ArkUI.worldSheet, node = W.node;
  var T = function (key, vars) { return W.text('WORLDSTATS.' + key, vars); };
  function H() { return window.ArkStatsHighlights || {}; }
  function caps() { return (window.DEFXN_CAPABILITIES || {}).capabilities || []; }
  function resolverIds() { return ((window.DEFXN_RESOLVERS || {}).resolvers || []).map(function (r) { return r.id; }); }
  function title(id) { return id.charAt(0).toUpperCase() + id.slice(1); }
  function fmt(n) { return Number(n).toLocaleString('en-US'); }
  var DATE = typeof Intl !== 'undefined' ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : null;
  function date(iso) { return DATE ? DATE.format(new Date(iso + 'T00:00:00Z')) : iso; }
  function dl(cls) { return node('dl', cls); }
  function ago(ms) {
    var min = Math.max(0, Math.round((Date.now() - ms) / 60000));
    if (min < 1) return T('AGO.NOW');
    if (min < 60) return T('AGO.MIN', { n: min });
    if (min < 1440) return T('AGO.HOUR', { n: Math.floor(min / 60) });
    return T('AGO.DAY', { n: Math.floor(min / 1440) });
  }

  /* ---------- the live readings, shared by every mount ----------
     The fleet pulse (hourly self-bench) and the four live stats feeds of docs/stats/LIVE-DATA-CONTRACT.md, each read through the ONE client
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
  /* each capability (the 18 ids of DEFXN_CAPABILITIES): requests/s now, p95 and headroom from the live feed, null kept null, and why a cell has
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

  /* ---------- the room the dashboard takes from the stage ----------
     The key readings stand over the top of the stage and the legend over its bottom. The stage frames the field in what is left, so the page measures
     both (CSS pixels from the stage's edges) and tells the world as state pt and pb. */
  var pad = { pt: 0, pb: 0 };
  function measure(f) {
    var pg = f.page, was = pg.hidden, vis = pg.style.visibility;
    if (was) { pg.hidden = false; pg.style.visibility = 'hidden'; }
    try {
      var sr = f.stage.getBoundingClientRect(), kp = f.stage.querySelector('.ws-kpis'), lg = f.stage.querySelector('.ws-legend');
      var pt = kp ? Math.max(0, Math.round(kp.getBoundingClientRect().bottom - sr.top)) : 0, pb = lg ? Math.max(0, Math.round(sr.bottom - lg.getBoundingClientRect().top)) : 0;
      return { pt: pt, pb: pb };
    } finally { if (was) { pg.hidden = true; pg.style.visibility = vis; } }
  }
  function track(ctx, d) {
    function go() {
      var m = measure(ctx.f); if (m.pt === pad.pt && m.pb === pad.pb) return;
      pad = m; var h = W.host(); if (h && h.select) h.select(d.world(ctx.st));
    }
    ctx.pads = go;
    var ro = window.ResizeObserver ? new ResizeObserver(go) : null;
    if (ro) { ctx.f.ro = ro; ro.observe(ctx.f.stage); var kp = ctx.f.stage.querySelector('.ws-kpis'); if (kp) ro.observe(kp); var was = ctx.dispose; ctx.dispose = function () { ro.disconnect(); if (was) was(); }; }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
  }

  /* a tick on a ruler or a title of one, placed by the world on its 3D point (no leader, no collision: a ruler is always read in full) */
  function tick(id, text, at, cls, sub) { return { id: id, name: text, sub: sub || '', cls: 'small tick' + (cls ? ' ' + cls : ''), at: at }; }
  /* the legend under the stage: what one cube, one bar or one dotted line stands for on the station in view. items: [swatch kind, words] */
  function unitKey(f, items) {
    var box = f.stage.querySelector('.ws-legend');
    if (!box) { box = node('ul', 'ws-legend rise'); box.setAttribute('aria-label', T('LEGEND.LABEL')); f.stage.appendChild(box); if (f.ro) f.ro.observe(box); }
    box.textContent = '';
    items.forEach(function (it) { var li = node('li'), sw = node('i', 'sw sw-' + it[0]); sw.setAttribute('aria-hidden', 'true'); li.appendChild(sw); li.appendChild(document.createTextNode(it[1])); box.appendChild(li); });
    pad = measure(f);
  }
  function ops() { return window.ArkStatsScale && ArkStatsScale.operations && H().operations ? ArkStatsScale.operations(H().operations.rows) : []; }
  function cubeRate() { return (window.ArkStatsScale && ArkStatsScale.CUBE_RATE) || 1000; }

  /* the latest 100 interactions (GET /api/fleet-interactions), as a stream the page hands the world: one bead for each; a row with no latency_ms
     is not drawn (contract section 1). Empty while the feed has no fresh reading, and the live line stays dotted. */
  function interactionsOf() {
    var rec = feeds.interactions, list = rec.status === 'ok' ? rec.data.interactions : [];
    return list.filter(function (x) { return x && typeof x.latency_ms === 'number'; }).slice(-100).map(function (x) { return { ms: x.latency_ms, ok: x.ok }; });
  }

  /* ---------- THREE STEPS, one illustration (js/world/stats-stage.js changes shape for each) ---------- */
  var STEPS = [{ kind: 'now', key: 'stats/now' }, { kind: 'capabilities', key: 'stats/capabilities' }, { kind: 'ceiling', key: 'stats/ceiling' }];
  function stepIndex(kind) { for (var i = 0; i < STEPS.length; i++) if (STEPS[i].kind === kind) return i; return -1; }
  function nextOf(kind) { return STEPS[(stepIndex(kind) + 1) % STEPS.length]; }
  function name(kind) { return T('STORY.' + kind.toUpperCase() + '.NAME'); }

  /* the stepper over every card: the three steps, with their numbers */
  function stepper(kind) {
    var bar = node('nav', 'ws-steps rise'); bar.setAttribute('aria-label', T('STORY.STEPS'));
    STEPS.forEach(function (s, i) {
      var a = W.link(node('a'), s.key); a.appendChild(node('b', null, String(i + 1))); a.appendChild(node('span', null, name(s.kind)));
      if (s.kind === kind) a.setAttribute('aria-current', 'step');
      bar.appendChild(a);
    });
    return bar;
  }
  /* THE CARD, the same on every step: the question, ONE answer and what it measures, a few facts, the run it comes from, the next step */
  function card(ctx, kind) {
    var f = ctx.f, ui = {};
    f.sheet.appendChild(stepper(kind));
    ui.title = f.add(node('h1', 'ws-q'), true); ui.title.id = 'ws-' + kind + '-title';
    ui.answer = f.add(node('div', 'ws-answer'), true);
    ui.body = f.add(node('div', 'ws-body'), true);
    ui.source = f.add(node('p', 'ws-source mono'), true);
    var box = node('div', 'wp-foot'), cta = W.cta('small'), nx = nextOf(kind); box.appendChild(cta); f.add(box);
    W.link(cta, nx.key); cta.say.textContent = T('STORY.NEXT', { q: (stepIndex(nx.kind) + 1) + ' · ' + name(nx.kind) });
    return ui;
  }
  function setAnswer(ui, value, unit, means) {
    ui.answer.textContent = '';
    var big = node('p', 'big'); big.appendChild(node('b', null, value)); if (unit) big.appendChild(node('span', null, unit)); ui.answer.appendChild(big);
    if (means) ui.answer.appendChild(node('p', 'means', means));
  }
  function facts(ui, rows) {
    var list = dl('ws-facts2'); ui.body.textContent = '';
    rows.forEach(function (r) {
      var cell = node('div', (r.none ? 'none' : '') + (r.wide ? ' wide' : '')); cell.appendChild(node('dt', null, r.label));
      var dd = node('dd');
      if (r.none) { dd.appendChild(node('b', null, T('NONE'))); dd.appendChild(node('small', null, r.none)); }
      else { dd.appendChild(node('b', null, r.value)); if (r.unit) dd.appendChild(node('span', null, r.unit)); if (r.sub) dd.appendChild(node('small', null, r.sub)); }
      cell.appendChild(dd); list.appendChild(cell);
    });
    ui.body.appendChild(list);
  }
  function stepDef(kind, key) {
    var ui = {}, d = {
      view: 'stats', key: key, titleId: 'ws-' + kind + '-title', here: 'WORLDSTATS.HERE', ui: ui, note: false,
      parse: function () { return {}; }, query: function () { return ''; },
      world: function (st) { return W.state('stats', { s: kind, c: st && st.c || '', pt: pad.pt, pb: pad.pb }); },
      picks: { stagePick: function (a, b) { var p = W.picked(a, b); if (p.kind === 'station' && p.id) W.go(p.id); } },
      build: function (ctx) {
        Object.assign(ui, card(ctx, kind)); track(ctx, d); if (d.more) d.more(ctx);
        /* every step redraws its card when a live feed answers (the Now step also hands the world the beads) */
        var off = watch(function () { if (ctx.redraw) ctx.redraw(); if (d.live) d.live(); });
        var was = ctx.dispose; ctx.dispose = function () { off(); if (was) was(); };
      }
    };
    return d;
  }

  /* ================================================================ 1 /stats/now: the network */
  function nowDef(key) {
    var d = stepDef('now', key), ui = d.ui, OPm = H().operations || {}, F = OPm.fleet;
    d.world = function () { return Object.assign(W.state('stats', { s: 'now', pt: pad.pt, pb: pad.pb }), { nodes: nodesOf(pulse), interactions: interactionsOf() }); };
    d.live = function () { var h = W.host(); if (h && h.select) h.select(d.world()); };
    d.render = function (st, ctx) {
      ctx.redraw = function () { d.render(st, ctx); };
      if (!F) return;
      W.title(ui.title, T('STORY.NOW.Q'));
      setAnswer(ui, fmt(F.parallelSwapsPerSecond), T('UNIT.SWAPS.S'), T('STORY.NOW.MEANS', { nodes: F.nodes, cores: F.cores }));
      /* the fleet's self-check if the pulse answered; else why there is no reading */
      var self = pulse.status === 'ok'
        ? { label: T('NOW.ROW.PULSE'), value: fmt(pulse.data.aggregate_qps), unit: T('UNIT.OPS.S'), sub: T('KPI.PULSE.SUB', { ok: pulse.data.nodes.filter(function (n) { return !n.error; }).length, total: pulse.data.nodes.length, age: ago(pulse.data.measured_at_ms) }) }
        : { label: T('NOW.ROW.PULSE'), none: pulse.status === 'wait' ? T('PULSE.WAIT') : pulse.why };
      /* live traffic: requests a second over every capability the node lists, in its window (GET /api/fleet-capabilities) */
      var cr = feeds.capabilities, live;
      if (cr.status === 'ok') {
        /* only the capabilities this site lists (the node may count others) */
        var rows = caps().map(function (c) { return cr.data.capabilities[c.id]; }).filter(Boolean);
        var rates = rows.filter(function (c) { return c.per_second != null; });
        live = rates.length
          ? { label: T('STORY.LIVE.TAG'), value: fmt2(rates.reduce(function (a, c) { return a + c.per_second; }, 0)), unit: T('UNIT.REQ.S'),
              sub: T('NOW.LIVE.SUB', { errors: fmt(rows.reduce(function (a, c) { return a + c.errors; }, 0)), s: fmt(Math.round(cr.data.window_ms / 1000)), node: cr.data.node || '', age: liveAgo(cr.data) }) }
          : { label: T('STORY.LIVE.TAG'), none: T('LIVE.NOCAPS') };
      } else live = noReading(T('STORY.LIVE.TAG'), cr);
      /* the newest benchmark run the node filed (GET /api/fleet-runs), with the ISO week it belongs to */
      var run = newestRun(), rr = feeds.runs, last;
      if (run) last = { label: T('NOW.RUN'), value: run.id, sub: T('NOW.RUN.SUB', { kind: run.kind, week: weekOf(run.started_at_ms), date: day(run.started_at_ms), device: run.device }), wide: true };
      else if (rr.status === 'ok') last = { label: T('NOW.RUN'), none: rr.data.next_run_at_ms ? T('RUN.NEXT', { date: day(rr.data.next_run_at_ms) }) : T('RUN.NONE'), wide: true };
      else last = noReading(T('NOW.RUN'), rr, { wide: true });
      facts(ui, [
        { label: T('STORY.NOW.NODES'), value: String(F.nodes), unit: T(F.nodes === 1 ? 'STORY.NODE.ONE' : 'STORY.NODE.MANY'), sub: T('STORY.CORE.MANY', { n: F.cores }) },
        { label: T('STORY.NOW.TRANSFERS'), value: fmt(F.transfersPerSecond), unit: T('STORY.UNIT.TRANSFERS') },
        { label: T('STORY.NOW.STORES'), value: fmt(F.storesPerSecond), unit: T('STORY.UNIT.RECORDS') },
        self, live, last
      ]);
      ui.source.textContent = T('STORY.SOURCE', { record: OPm.record, date: date(OPm.date) });
      var beads = interactionsOf();
      unitKey(ctx.f, [['cube', T('STORY.KEY.CUBE.SWAPS', { n: fmt(cubeRate()) })], beads.length ? ['dot', T('STORY.KEY.BEADS', { n: fmt(beads.length) })] : ['none', T('STORY.KEY.LIVE')]]);
      /* the totals only: no node is named or drawn on its own (the fleet grows) */
      var tags = [tick('v-total-swaps', fmt(F.parallelSwapsPerSecond), 'above', 'hot'), tick('n-total-swaps', T('STORY.NOW.SWAPS'), 'below', 'grp hot', T('UNIT.SWAPS.S')),
        tick('v-total-transfers', fmt(F.transfersPerSecond), 'above'), tick('n-total-transfers', T('STORY.NOW.TRANSFERS'), 'below', 'grp', T('STORY.UNIT.TRANSFERS')),
        { id: 'live', name: T('STORY.LIVE.TAG'), sub: beads.length ? T('STORY.LIVE.BEADS', { n: fmt(beads.length) }) : T('NONE'), cls: 'small', at: 'left' }];
      W.tags(ctx.f.tags, tags);
    };
    return d;
  }

  /* ================================================================ 2 /stats/capabilities: how fast is each operation? */
  function capsDef(key) {
    var d = stepDef('capabilities', key), ui = d.ui, list = ops(), OPm = H().operations || {};
    d.parse = function (q) { var g = W.pick(list, q.get('c')); return { c: g ? g.id : '' }; };
    d.query = function (st) { return st.c && list[0] && st.c !== list[0].id ? 'c=' + st.c : ''; };
    d.picks.stagePick = function (a, b, ctx) { var p = W.picked(a, b); if (p.kind === 'operation' && p.id) ctx.set({ c: p.id }); };
    d.keys = function (e, st, ctx) {
      var step = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0; if (!step || !list.length) return;
      var i = list.findIndex(function (g) { return g.id === st.c; }); ctx.set({ c: list[(Math.max(0, i) + step + list.length) % list.length].id });
    };
    d.more = function (ctx) {
      ui.pick = node('div', 'chips ws-ops rise'); ui.pick.setAttribute('role', 'group'); ui.pick.setAttribute('aria-label', T('STORY.CAPABILITIES.PICK'));
      ui.answer.parentNode.insertBefore(ui.pick, ui.answer);
      ui.pick.addEventListener('click', function (e) { var b = e.target.closest('[data-c]'); if (b) ctx.set({ c: b.dataset.c }); });
      /* each capability, live: folded under the card (depth, not length) */
      ui.live = node('details', 'ws-live rise'); ui.body.parentNode.insertBefore(ui.live, ui.body.nextSibling);
    };
    /* the live table: one row for each capability id, and in each cell the reading or "No reading" with its reason */
    function liveTable() {
      var rec = feeds.capabilities, rows = liveCaps(), open = ui.live.open;
      ui.live.textContent = '';
      var sum = node('summary'); sum.appendChild(node('span', null, T('CAP.LIVE.TITLE')));
      sum.appendChild(node('small', 'mono', rec.status === 'ok' ? T('CAP.LIVE.META', { s: fmt(Math.round(rec.data.window_ms / 1000)), node: rec.data.node || '', age: liveAgo(rec.data) }) : T('NONE')));
      ui.live.appendChild(sum); ui.live.open = open;
      if (!rows) { var p = node('p', 'none'); p.appendChild(node('b', null, T('NONE'))); p.appendChild(node('small', null, rec.status === 'wait' ? T('LIVE.WAIT') : rec.why)); ui.live.appendChild(p); return; }
      var table = node('table'), head = node('tr');
      [T('CAP.COL.NAME'), T('UNIT.REQ.S'), T('CAP.COL.P95'), T('CAP.COL.ROOM')].forEach(function (h) { head.appendChild(node('th', null, h)); });
      var thead = node('thead'); thead.appendChild(head); table.appendChild(thead);
      var body = node('tbody');
      function cell(tr, value, reason) {
        var td = node('td');
        if (reason) { td.className = 'none'; td.appendChild(node('b', null, T('NONE'))); td.appendChild(node('small', null, reason)); } else td.appendChild(node('b', null, value));
        tr.appendChild(td);
      }
      rows.forEach(function (r) {
        var tr = node('tr'), x = r.row; tr.appendChild(node('th', null, title(r.id)));
        cell(tr, x && x.per_second != null ? fmt2(x.per_second) : '', r.why.rate);
        cell(tr, x && x.p95_ms != null ? fmt2(x.p95_ms) + ' ' + T('UNIT.MS') : '', r.why.p95);
        cell(tr, x && x.headroom_pct != null ? fmt2(x.headroom_pct) + '%' : '', r.why.room);
        body.appendChild(tr);
      });
      table.appendChild(body); ui.live.appendChild(table);
    }
    d.render = function (st, ctx) {
      ctx.redraw = function () { d.render(st, ctx); };
      liveTable();
      var g = W.pick(list, st.c); if (!g) return;
      var best = g.rows.slice().sort(function (a, b) { return b.rate - a.rate; })[0];
      W.title(ui.title, T('STORY.CAPABILITIES.Q'));
      ui.pick.textContent = '';
      list.forEach(function (x) { var b = node('button', null, x.name); b.type = 'button'; b.dataset.c = x.id; b.setAttribute('aria-pressed', x.id === g.id); ui.pick.appendChild(b); });
      setAnswer(ui, fmt(best.rate), best.unit, T('STORY.CAPABILITIES.MEANS', { op: g.name, variant: best.variant || g.name }));
      facts(ui, g.rows.filter(function (r) { return r !== best; }).map(function (r) { return { label: r.variant ? r.variant.charAt(0).toUpperCase() + r.variant.slice(1) : g.name, value: fmt(r.rate), unit: r.unit, sub: r.note }; })
        .concat((OPm.notBuilt || []).length ? [{ label: T('STORY.CAPABILITIES.NOTBUILT'), value: OPm.notBuilt.join(', ') }] : []));
      ui.source.textContent = T('STORY.SOURCE', { record: OPm.record || '', date: date(OPm.date || '') });
      unitKey(ctx.f, [['cube', T('STORY.KEY.CUBE.RATE', { n: fmt(cubeRate()) })], ['chosen', T('LEGEND.CHOSEN')], ['none', T('STORY.KEY.NOTBUILT')]]);
      /* one label over each column (its rate, and the way it was run), one name under each operation (with its unit), one inside each dotted outline */
      var tags = [];
      list.forEach(function (x) {
        var on = x.id === g.id;
        x.rows.forEach(function (r, ri) { tags.push(tick('v-op-' + x.id + '-' + ri, fmt(r.rate), 'above', on ? 'hot' : '', x.rows.length > 1 ? r.variant : '')); });
        tags.push(tick('g-' + x.id, x.name, 'below', 'grp' + (on ? ' hot' : ''), x.rows.map(function (r) { return r.unit; }).filter(function (u, i, a) { return a.indexOf(u) === i; }).join(' · ')));
      });
      (OPm.notBuilt || []).forEach(function (nb) { tags.push(tick('n-nb-' + nb.toLowerCase().replace(/[^a-z0-9]+/g, '-'), nb, 'below', 'faint', T('STORY.NOTBUILT.TAG'))); });
      W.tags(ctx.f.tags, tags);
    };
    return d;
  }

  /* ================================================================ 3 /stats/ceiling: how much does one node take, through the network? */
  function ceilingDef(key) {
    var d = stepDef('ceiling', key), ui = d.ui, cp = H().clientPath, D = H().defiShard;
    d.render = function (st, ctx) {
      ctx.redraw = function () { d.render(st, ctx); };
      if (!cp) return;
      var top = cp.byConnections[cp.byConnections.length - 1], one = cp.byConnections[0];
      W.title(ui.title, T('STORY.CEILING.Q'));
      setAnswer(ui, fmt(cp.ceilingSwapsPerSecond), T('UNIT.SWAPS.S'), T('STORY.CEILING.MEANS', { n: fmt(top.connections), machine: cp.machine.replace(/,.*$/, '') }));
      var rows = [{ label: T('FIG.ONE'), value: fmt(one.swapsPerSecond), unit: T('UNIT.SWAPS.S') }, { label: T('CEILING.STRIP.CORES'), value: T('CEILING.CORES', { used: cp.serverCoresAtCeiling, all: cp.cores }) }];
      /* what limits it: the batch's one telling fact (BENCH-012), the send to the replicas against the time to resolve */
      if (D) rows.push({ label: T('STORY.CEILING.LIMIT'), value: fmt(Math.round(D.broadcastLatencyMs)), unit: T('UNIT.MS'), sub: T('STORY.CEILING.LIMIT.SUB', { peers: D.peersReached, resolve: D.batchLatencyMs.toFixed(1), times: (D.broadcastLatencyMs / D.batchLatencyMs).toFixed(1), record: D.record }), wide: true });
      /* resolver load now (GET /api/fleet-resolvers): swaps a second over every resolver, and the batch and send times of the busiest one */
      var rr = feeds.resolvers;
      if (rr.status === 'ok') {
        /* only the resolvers this site lists (the node also counts its own, e.g. perf) */
        var known = resolverIds(), ids = Object.keys(rr.data.resolvers).filter(function (id) { return known.indexOf(id) >= 0; }), secs = rr.data.window_ms / 1000;
        if (!ids.length || !(secs > 0)) rows.push({ label: T('CEIL.RES'), none: T('LIVE.NORES') });
        else {
          var busy = ids.reduce(function (a, id) { return !a || rr.data.resolvers[id].swaps > rr.data.resolvers[a].swaps ? id : a; }, null), b = rr.data.resolvers[busy];
          rows.push({ label: T('CEIL.RES'), value: fmt2(ids.reduce(function (a, id) { return a + rr.data.resolvers[id].swaps; }, 0) / secs), unit: T('UNIT.SWAPS.S'),
            sub: T('CEIL.RES.SUB', { resolver: title(busy), batch: b.batch_ms_mean == null ? T('NONE') : fmt2(b.batch_ms_mean) + ' ' + T('UNIT.MS'), send: b.send_ms_mean == null ? T('NONE') : fmt2(b.send_ms_mean) + ' ' + T('UNIT.MS'), node: rr.data.node || '', age: liveAgo(rr.data) }), wide: true });
        }
      } else rows.push(noReading(T('CEIL.RES'), rr, { wide: true }));
      /* the newest stress or ceiling run (contract section 5): its highest rate and at how many connections */
      var stress = newestRun(function (r) { return (r.kind === 'stress' || r.kind === 'ceiling') && r.ceiling.length; });
      if (stress) {
        var top2 = stress.ceiling.reduce(function (a, c) { return !a || c.per_second > a.per_second ? c : a; }, null);
        rows.push({ label: T('CEIL.RUN'), value: fmt2(top2.per_second), unit: T('UNIT.REQ.S'), sub: T('CEIL.RUN.SUB', { run: stress.id, n: fmt(top2.connections), date: day(stress.started_at_ms), device: stress.device }), wide: true });
      } else if (feeds.runs.status === 'ok') rows.push({ label: T('CEIL.RUN'), none: T('RUN.NOSTRESS'), wide: true });
      else rows.push(noReading(T('CEIL.RUN'), feeds.runs, { wide: true }));
      facts(ui, rows);
      ui.source.textContent = T('STORY.SOURCE', { record: cp.record, date: date(cp.date) });
      unitKey(ctx.f, [['cube', T('STORY.KEY.CUBE.SWAPS', { n: fmt(cubeRate()) })], ['top', T('STORY.KEY.HIGHEST')]]);
      var tags = [];
      cp.byConnections.forEach(function (p, i) {
        var on = i === cp.byConnections.length - 1;
        tags.push(tick('v-pt-' + p.connections, fmt(p.swapsPerSecond), 'above', on ? 'hot' : ''));
        tags.push(tick('n-pt-' + p.connections, T(p.connections === 1 ? 'STORY.CONN.ONE' : 'STORY.CONN.MANY', { n: fmt(p.connections) }), 'below', on ? 'hot' : ''));
      });
      W.tags(ctx.f.tags, tags);
    };
    return d;
  }

  /* ---------- the page modules ---------- */
  function module(build, key) { var inner = W.page(function () { return build(key); }); return { prepare: function (page, settings) { return inner.prepare(page, settings); }, mount: function (hostEl) { return inner.mount(hostEl); } }; }
  ArkUI.pageModules.worldStatsNow = module(nowDef, 'stats/now');
  ArkUI.pageModules.worldStatsCapabilities = module(capsDef, 'stats/capabilities');
  ArkUI.pageModules.worldStatsCeiling = module(ceilingDef, 'stats/ceiling');
})();

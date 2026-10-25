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

   REDUCTION TEST (docs/PRODUCT-DESIGN-LAWS.md), kept with the work: on every step 1 its question; 2 the next question; 3 one answer and what it measures;
   4 the facts behind it; 5 nothing; 6 conditions are one line, the device a fact; 7 nothing more; 8-9 the address; 10 what is not measured says so. */
(function () {
  'use strict';
  var W = ArkUI.worldSheet, node = W.node;
  var T = function (key, vars) { return W.text('WORLDSTATS.' + key, vars); };
  function H() { return window.ArkStatsHighlights || {}; }
  function caps() { return (window.DEFXN_CAPABILITIES || {}).capabilities || []; }
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

  /* ---------- the one live reading: the fleet pulse, shared by every mount ---------- */
  var pulse = { status: 'wait', data: null, why: '', at: 0 }, listeners = [], timer = 0, inflight = false;
  function why(error) {
    var e = error || {}, m = String(e.message || '');
    if (e.name === 'AbortError') return T('PULSE.TIMEOUT');
    var http = /HTTP (\d+)/.exec(m); if (http) return T('PULSE.HTTP', { code: http[1] });
    if (/^Malformed/.test(m)) return T('PULSE.SHAPE');
    return T('PULSE.OFFLINE');
  }
  function poll() {
    if (inflight || !window.ArkPulse) { if (!window.ArkPulse && pulse.status === 'wait') { pulse = { status: 'fail', data: null, why: T('PULSE.OFFLINE'), at: Date.now() }; tell(); } return; }
    inflight = true;
    ArkPulse.get().then(function (r) { pulse = { status: 'ok', data: r.data, why: '', at: Date.now() }; },
      function (e) { pulse = { status: 'fail', data: null, why: why(e), at: Date.now() }; })
      .then(function () { inflight = false; tell(); });
  }
  function tell() { listeners.slice().forEach(function (fn) { fn(pulse); }); }
  function watch(fn) {
    listeners.push(fn);
    if (!timer) { poll(); timer = setInterval(function () { if (!document.hidden) poll(); }, 60000); }
    return function () {
      var i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1);
      if (!listeners.length && timer) { clearInterval(timer); timer = 0; }
    };
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

  /* the latest 100 interactions, as a stream the page can hand the world: the pulse client does not return them yet (docs/stats/LIVE-DATA-CONTRACT.md),
     so this is empty until it does, and the live line says No reading */
  function interactionsOf(p) {
    var list = p.status === 'ok' && Array.isArray(p.data.interactions) ? p.data.interactions : [];
    return list.filter(function (x) { return x && typeof x.latency_ms === 'number'; }).slice(-100).map(function (x) { return { ms: x.latency_ms }; });
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
      build: function (ctx) { Object.assign(ui, card(ctx, kind)); track(ctx, d); if (d.more) d.more(ctx); }
    };
    return d;
  }

  /* ================================================================ 1 /stats/now: the network */
  function nowDef(key) {
    var d = stepDef('now', key), ui = d.ui, off = null, more = d.build, OPm = H().operations || {}, F = OPm.fleet;
    d.world = function () { return Object.assign(W.state('stats', { s: 'now', pt: pad.pt, pb: pad.pb }), { nodes: nodesOf(pulse), interactions: interactionsOf(pulse) }); };
    d.build = function (ctx) {
      more(ctx);
      off = watch(function () { ctx.redraw(); var h = W.host(); if (h && h.select) h.select(d.world()); });
      var was = ctx.dispose; ctx.dispose = function () { if (off) off(); if (was) was(); };
    };
    d.render = function (st, ctx) {
      ctx.redraw = function () { d.render(st, ctx); };
      if (!F) return;
      W.title(ui.title, T('STORY.NOW.Q'));
      setAnswer(ui, fmt(F.parallelSwapsPerSecond), T('UNIT.SWAPS.S'), T('STORY.NOW.MEANS', { nodes: F.nodes, cores: F.cores }));
      /* what streams now: the fleet's self-check if the pulse answered; else one line that says why there is no reading */
      var live = pulse.status === 'ok'
        ? { label: T('NOW.ROW.PULSE'), value: fmt(pulse.data.aggregate_qps), unit: T('UNIT.OPS.S'), sub: T('KPI.PULSE.SUB', { ok: pulse.data.nodes.filter(function (n) { return !n.error; }).length, total: pulse.data.nodes.length, age: ago(pulse.data.measured_at_ms) }) }
        : { label: T('STORY.LIVE.TAG'), none: pulse.status === 'wait' ? T('PULSE.WAIT') : T('WHY.INTERACTIONS') };
      facts(ui, [
        { label: T('STORY.NOW.NODES'), value: String(F.nodes), unit: T(F.nodes === 1 ? 'STORY.NODE.ONE' : 'STORY.NODE.MANY'), sub: T('STORY.CORE.MANY', { n: F.cores }) },
        { label: T('STORY.NOW.TRANSFERS'), value: fmt(F.transfersPerSecond), unit: T('STORY.UNIT.TRANSFERS') },
        { label: T('STORY.NOW.STORES'), value: fmt(F.storesPerSecond), unit: T('STORY.UNIT.RECORDS') },
        live
      ]);
      ui.source.textContent = T('STORY.SOURCE', { record: OPm.record, date: date(OPm.date) });
      unitKey(ctx.f, [['cube', T('STORY.KEY.CUBE.SWAPS', { n: fmt(cubeRate()) })], ['none', T('STORY.KEY.LIVE')]]);
      /* the totals only: no node is named or drawn on its own (the fleet grows) */
      var tags = [tick('v-total-swaps', fmt(F.parallelSwapsPerSecond), 'above', 'hot'), tick('n-total-swaps', T('STORY.NOW.SWAPS'), 'below', 'grp hot', T('UNIT.SWAPS.S')),
        tick('v-total-transfers', fmt(F.transfersPerSecond), 'above'), tick('n-total-transfers', T('STORY.NOW.TRANSFERS'), 'below', 'grp', T('STORY.UNIT.TRANSFERS')),
        { id: 'live', name: T('STORY.LIVE.TAG'), sub: T('NONE'), cls: 'small', at: 'left' }];
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
    };
    d.render = function (st, ctx) {
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
      if (!cp) return;
      var top = cp.byConnections[cp.byConnections.length - 1], one = cp.byConnections[0];
      W.title(ui.title, T('STORY.CEILING.Q'));
      setAnswer(ui, fmt(cp.ceilingSwapsPerSecond), T('UNIT.SWAPS.S'), T('STORY.CEILING.MEANS', { n: fmt(top.connections), machine: cp.machine.replace(/,.*$/, '') }));
      var rows = [{ label: T('FIG.ONE'), value: fmt(one.swapsPerSecond), unit: T('UNIT.SWAPS.S') }, { label: T('CEILING.STRIP.CORES'), value: T('CEILING.CORES', { used: cp.serverCoresAtCeiling, all: cp.cores }) }];
      /* what limits it: the batch's one telling fact (BENCH-012), the send to the replicas against the time to resolve */
      if (D) rows.push({ label: T('STORY.CEILING.LIMIT'), value: fmt(Math.round(D.broadcastLatencyMs)), unit: T('UNIT.MS'), sub: T('STORY.CEILING.LIMIT.SUB', { peers: D.peersReached, resolve: D.batchLatencyMs.toFixed(1), times: (D.broadcastLatencyMs / D.batchLatencyMs).toFixed(1), record: D.record }), wide: true });
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

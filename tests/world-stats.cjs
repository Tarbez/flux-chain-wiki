/* The stats section: three steps on ONE illustration that changes shape (js/pages/world-stats.js on the one `stats` stage, js/world/stats-stage.js).
   2026-10-25. What this pins, and why each case exists:
   - Three steps, in story order: /stats/now (the network), /stats/capabilities (how fast is each operation), /stats/ceiling (one node, through the network).
     The owner, 2026-10-25: "I do not think we need all the 5 steps ... we are repeating ourselves nonstop". The batch, the fleet and the week pages are
     retired: their keys redirect and their addresses open the new pages, so a saved link still lands.
   - One illustration, not five: one blockSet whose cubes take a new formation for each step, the rest sunk into the base (owner: "one illustration that is
     transformative into 5 states"); it stands on the ground grid by the network (owner: "zoom into the ground grid").
   - A cube is one stated unit and nothing is scaled: 1,000 a second; a column's cubes are its value rounded. No node is drawn or named: the network shows
     totals only (owner: "this is gonna grow ... we only show total nodes speed and stats no naming").
   - The card is the same on every step: stepper, question, one answer equal to the data, facts, the run and its date, the next step. Every word is the
     manifest's or a data file's, every number a data file's (or one derived here by an independent rule). What is not measured says "No reading", never 0. */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

/* ---- the catalog, as tests/world-measure.cjs loads it ---- */
const cx = vm.createContext({ console, ArkUI: {}, document: { write() {} } });
const run = (file) => vm.runInContext(read(file), cx, { filename: file });
run('js/content/manifest.js'); run('js/content/manifests/index.js');
vm.runInContext('ArkManifestIds', cx).forEach((id) => run('js/content/manifests/' + id + '.js'));
['js/content/learnings.js', 'js/content/article-index.js', 'js/content/resolutions.js', 'js/content/site-pages.js', 'js/pages/catalog.js'].forEach(run);
const catalog = vm.runInContext('ArkUI.pageCatalog', cx), SP = vm.runInContext('ArkSitePages', cx);
const plain = (v) => JSON.parse(JSON.stringify(v));
const statsWeeks = plain(SP.statsWeeks());

/* ---- the data the numbers must come from ---- */
const dataCx = vm.createContext({ console, window: {} });
dataCx.window = dataCx;
['js/content/stats-highlights.js', 'js/content/capabilities-data.js', 'js/content/resolvers-data.js'].forEach((f) => vm.runInContext(read(f), dataCx, { filename: f }));
const H = dataCx.ArkStatsHighlights, CD = dataCx.DEFXN_CAPABILITIES, RS = dataCx.DEFXN_RESOLVERS;

/* ================= 1 three steps, and the retired keys ================= */
const KEYS = ['stats/now', 'stats/capabilities', 'stats/ceiling'];
{
  const seo = vm.createContext({}); vm.runInContext(read('js/content/site-pages.js') + ';' + read('js/content/seo.js') + ';' + read('js/content/seo-data.js') + ';this.pages = ArkSEO.get().pages', seo);
  const MODULE = { 'stats/now': 'worldStatsNow', 'stats/capabilities': 'worldStatsCapabilities', 'stats/ceiling': 'worldStatsCeiling' };
  for (const key of KEYS) {
    assert(catalog[key] && catalog[key].journey === 'prove' && !catalog[key].redirect, key + ' is a page of the Prove journey');
    assert.equal(catalog[key].path, '/' + key); assert.equal(catalog[key].module, MODULE[key], key + ' is drawn by ' + MODULE[key]);
    assert(seo.pages[key] && seo.pages[key].title && seo.pages[key].description, key + ' has its SEO entry');
    const scripts = [...catalog[key].scripts];
    for (const need of ['js/ark/pulse-client.js', 'js/pages/world-sheet.js', 'js/pages/world-stats.js', 'js/content/stats-scale.js']) assert(scripts.includes(need), key + ' loads ' + need);
    assert(catalog[key].styles.includes('css/world-stats.css'), key + ' links its sheet');
  }
  assert.equal(SP.row('stats/now').lead, true, 'the network is where the Prove journey starts');
  assert.deepEqual(plain(SP.pages()).filter((r) => /^stats\//.test(r.key)).map((r) => r.key), KEYS, 'the page list holds the three steps, in story order, and no other stats page');
  /* why: a saved link to a retired page still lands on the page that took its place, never on a 404 */
  const RETIRED = { stats: 'stats/now', 'stats/gpu': 'stats/ceiling', 'stats/ledger': 'stats/capabilities', measured: 'stats/capabilities', 'stats/resolver': 'stats/ceiling', 'stats/fleet': 'stats/now' };
  for (const w of statsWeeks) RETIRED[w.key] = 'stats/now';
  for (const [old, to] of Object.entries(RETIRED)) {
    assert.equal(catalog[old].redirect, to, old + ' redirects to ' + to);
    assert(catalog[old].noindex && catalog[old].hiddenFromNavigation && catalog[old].journey === null, old + ' is never listed or indexed');
  }
  for (const [address, to] of [['/stats/resolver', 'stats/ceiling'], ['/stats/fleet', 'stats/now']].concat(statsWeeks.map((w) => [w.path, 'stats/now']))) assert((catalog[to].aliases || []).includes(address), address + ' opens ' + to);
  const host = read('js/world/world-host.js'), viewOf = vm.runInNewContext('(' + /var VIEW_OF = (\{[\s\S]*?\n  \});/.exec(host)[1] + ')');
  for (const k of KEYS) assert.equal(viewOf[k], 'stats', k + ' flies to the one view `stats`');
}

/* ================= 2 the stage: one illustration, its looks, its loops ================= */
const STAGE = read('js/world/stats-stage.js');
{
  const all = fs.readdirSync(path.join(ROOT, 'js/world')).filter((f) => f.endsWith('.js')).map((f) => read('js/world/' + f));
  assert.equal(all.join('\n').split(/S\.stage\(\{\s*name: 'stats'/).length - 1, 1, 'the stats stage is registered exactly once');
  assert.equal((STAGE.match(/\bk\.blockSet\(/g) || []).length, 1, 'one blockSet: the cubes change shape, they are never swapped for another set');
  assert(!/\bsetLook\b|\bk\.knobs\b|\bk\.C\.\w+\s*=[^=]|\bk\.lights\b|\bscene\.(background|fog)\s*=/.test(STAGE), 'the stage changes no look knob, theme colour or light');
  assert(!/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|0x[0-9a-fA-F]{6}\b/.test(STAGE.replace(/\/\*[\s\S]*?\*\//g, '')), 'no colour literal: every tone is a theme mix');
  assert(!/requestAnimationFrame|setInterval|setTimeout/.test(STAGE), 'no loop of its own: frames only while a cube travels');
  /* why: the fleet grows; the network shows totals only, never a node by name or a column per node */
  assert(!/perNode/.test(STAGE.replace(/\/\*[\s\S]*?\*\//g, '')), 'the stage never reads the per-node list');
}

/* ================= 3 the stage run against a stub of the world kit ================= */
{
  /* why a stub: the stage is WebGL, which node cannot draw. Its arithmetic is not: where each cube stands, how tall it is, which cubes are data. The stub records every
     place() call of the one blockSet, so what is pinned is what would be drawn. */
  class V3 { constructor(x, y, z) { this.x = x || 0; this.y = y || 0; this.z = z || 0; } set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } clone() { return new V3(this.x, this.y, this.z); } add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; } copy(v) { return this.set(v.x, v.y, v.z); } }
  class Col { constructor() { this.r = 0; this.g = 0; this.b = 0; } copy(c) { this.r = c.r; this.g = c.g; this.b = c.b; return this; } clone() { return new Col().copy(this); } lerp(c, t) { this.r += (c.r - this.r) * t; this.g += (c.g - this.g) * t; this.b += (c.b - this.b) * t; return this; } setRGB(r, g, b) { this.r = r; this.g = g; this.b = b; return this; } }
  class M4 { compose(p, q, s) { this.p = [p.x, p.y, p.z]; this.s = [s.x, s.y, s.z]; return this; } }
  const made = [], lines = { dots: [], lit: [] }, mixes = [];
  const THREE = { Matrix4: M4, Vector3: V3, Quaternion: class {}, Color: Col, Mesh: class { constructor() { this.position = new V3(); this.scale = { setScalar() {} }; } updateMatrix() {} }, MeshLambertMaterial: class { constructor() { this.color = new Col(); } } };
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const ease = { clamp01, inOut: (u) => u, out: (u) => u, glide: (u) => u, back: (u) => u };
  const k = {
    reduced: true, C: { canvas: new Col().setRGB(.05, .06, .07), network: new Col().setRGB(.2, .8, .6), signal: new Col().setRGB(.9, .5, .2), resolver: new Col().setRGB(.3, .4, .6), other: new Col().setRGB(.5, .5, .55), identity: new Col().setRGB(.6, .3, .5) }, scene: { add() {} }, panelMap: null,
    mix: (a, b, t) => { mixes.push([a, b, t]); return k.C[a].clone().lerp(k.C[b], t); }, onPaint() {}, wake() {}, moved() {}, bevel: () => ({}),
    blockSet(n, geo, opts) {
      const set = { n, opts, mesh: { material: {} }, placed: new Array(n).fill(null), tints: new Array(n).fill(null), place(i, m) { this.placed[i] = { p: m.p.slice(), s: m.s.slice() }; }, tint(i, c) { this.tints[i] = [c.r, c.g, c.b]; }, show() {} };
      made.push(set); return set;
    }
  };
  const W = { k, THREE, V: (x, y, z) => new V3(x, y, z), ease, lerp: (a, b, u) => a + (b - a) * u, HUB: { c: new V3(0, 0, 0) }, TAN: .4, D2R: Math.PI / 180, fit: (w, h, asp, fill) => Math.max(w / ((fill || .86) * 2 * .4 * asp), h / ((fill || .86) * 2 * .4)),
    grow: (w, a, b) => { const u = clamp01((w - a) / (b - a)); return u <= 0 ? 1e-4 : 1; }, num: (s, lo, hi) => Math.min(hi, Math.max(lo, parseInt(s, 10) || lo)),
    follower: (n) => { const f = { v: new Float32Array(n) }; f.step = (now, want) => { for (let i = 0; i < n; i++) f.v[i] = want(i); }; return f; },
    dots: { line: (a, b, count, reveal) => lines.dots.push([count, reveal]) }, lit: { line: (a, b, count, reveal) => lines.lit.push([count, reveal]) } };
  let def = null;
  const S = { ok: true, world: W, hooks: {}, debug: () => ({ dur: 0 }), stage: (d) => { def = d; } };
  const ctx = vm.createContext({ console, window: null, performance: { now: () => 1e6 }, ArkCopy: { text: () => '' } });
  ctx.window = ctx; ctx.DEFXNScene = S;
  for (const f of ['js/content/stats-highlights.js', 'js/content/capabilities-data.js', 'js/content/site-pages.js', 'js/content/stats-scale.js']) vm.runInContext(read(f), ctx, { filename: f });
  vm.runInContext(read('js/world/stats-stage.js'), ctx, { filename: 'js/world/stats-stage.js' });
  assert(def && def.name === 'stats', 'the stage registers itself as `stats` on the stub');

  const field = made[0];
  assert.equal(made.length, 1, 'one blockSet');
  const pose = (st) => { def.set(Object.assign({ view: 'stats' }, st), 1, true); def.pose(1, 0, 2e6); return field.placed.map((c) => ({ x: c.p[0], y: c.p[1], z: c.p[2], w: c.s[0], h: c.s[1], d: c.s[2] })); };
  const OPS = ctx.ArkStatsScale.operations(H.operations.rows), F = H.operations.fleet, CP = H.clientPath, UNIT = ctx.ArkStatsScale.CUBE_RATE;
  assert.equal(UNIT, 1000, 'one cube is 1,000 a second');
  const want = {
    now: Math.round(F.parallelSwapsPerSecond / UNIT) + Math.round(F.transfersPerSecond / UNIT),
    capabilities: OPS.reduce((n, g) => n + g.rows.reduce((m, r) => m + Math.round(r.rate / UNIT), 0), 0),
    ceiling: CP.byConnections.reduce((n, p) => n + Math.round(p.swapsPerSecond / UNIT), 0)
  };
  const shown = (cubes) => cubes.slice(0, -1).filter((c) => c.w > 1e-3);   /* the last instance is the base */
  for (const st of ['now', 'capabilities', 'ceiling', 'now']) {
    const cubes = pose({ s: st });
    assert.equal(cubes.length, field.n, st + ': every instance of the one set is placed');
    /* why: a cube counts one unit; a formation has exactly the cubes its values round to, and every other cube is sunk, not drawn as filler */
    assert.equal(shown(cubes).length, want[st], st + ': ' + want[st] + ' cubes, one for each 1,000 a second');
    assert.equal(new Set(shown(cubes).map((c) => [c.w, c.h, c.d].map((v) => v.toFixed(4)).join('/'))).size, 1, st + ': every cube is one size, never a scaled bar');
    const base = cubes[cubes.length - 1], xs = shown(cubes).map((c) => c.x);
    assert(base.w >= Math.max(...xs) - Math.min(...xs), st + ': the base resizes under the formation');
  }
  assert.equal(field.n, Math.max(want.now, want.capabilities, want.ceiling) + 1, 'the pool is as large as the largest formation, plus the base');
  /* the old routes' states draw the network: a retired key never reaches the stage with its own shape */
  assert.equal(shown(pose({ s: 'week-42' })).length, want.now, 'an unknown state draws the network');
  /* the operations come from the matrix by one rule: the words before a row's comma */
  assert.deepEqual(plain(OPS.map((g) => g.name)), [...new Set(H.operations.rows.map((r) => r.op.split(',')[0].trim()))], 'the operations are the matrix rows grouped by name, in matrix order');
}

/* ================= 4 the pages ================= */
function boot(opts) {
  opts = opts || {};
  const dom = new JSDOM('<!doctype html><body><div id="outlet"></div></body>', { runScripts: 'outside-only', url: 'http://127.0.0.1/', pretendToBeVisual: true });
  const w = dom.window, writes = [], went = [];
  w.eval('window.ArkUI = { pageModules: {}, pageCatalog: {}, route: {}, pageRouter: {} };');
  w.eval(read('js/content/manifest.js'));
  vm.runInContext('ArkManifestIds', cx).forEach((id) => w.eval(read('js/content/manifests/' + id + '.js')));
  ['js/content/site-pages.js', 'js/content/stats-highlights.js', 'js/content/stats-scale.js', 'js/content/network-data.js', 'js/content/capabilities-data.js', 'js/content/resolvers-data.js'].forEach((f) => w.eval(read(f)));
  let search = opts.query || '';
  w.ArkUI.pageCatalog = JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(catalog).map(([k, v]) => [k, { path: v.path }]))));
  w.ArkUI.pageRedirects = plain(vm.runInContext('ArkUI.pageRedirects', cx));
  w.ArkUI.route = { href: (p) => p, path: () => w.__path || '/', search: () => search, write(p, q, mode) { writes.push([p, q, mode]); search = q; w.__path = p; } };
  w.ArkUI.pageRouter = { navigate(page, settings) { went.push([page, settings && settings.query]); return Promise.resolve(true); } };
  if (opts.host) w.ArkWorldHost = opts.host;
  if (opts.pulse) w.ArkPulse = { get: opts.pulse };
  w.eval(read('js/pages/world-sheet.js')); w.eval(read('js/pages/world-stats.js'));
  return { w, writes, went };
}
function worldStub() {
  const calls = { state: [], select: [], on: [], off: [] };
  return { calls, state(st) { calls.state.push(plain(st)); }, select(st) { calls.select.push(plain(st)); }, on(name, fn) { calls.on.push([name, fn]); return () => calls.off.push(name); } };
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const failing = (status) => () => Promise.reject(Object.assign(new Error('HTTP ' + status + ' from /api/fleet-pulse'), {}));
function pulseOk() {
  return () => Promise.resolve({ endpoint: '/api/fleet-pulse', data: { measured_at_ms: Date.now() - 7 * 60000, aggregate_qps: 18400, total_entries: 4800, longest_ms: 900, errors: 0,
    nodes: [3200, 5100, 2100].map((q, i) => ({ name: 'n' + (i + 1), addr: 'a' + i, ok: 800, total: 800, elapsed_ms: 400, qps: q, error: null })) } });
}
async function mount(key, query, opts) {
  opts = opts || {};
  const b = boot({ query, host: opts.host, pulse: opts.pulse }); b.w.__path = catalog[key].path;
  const outlet = b.w.document.getElementById('outlet'), mod = b.w.ArkUI.pageModules[catalog[key].module];
  mod.prepare(key, query ? { query } : {});
  const page = mod.mount(outlet);
  if (opts.settle) await wait(opts.settle);
  return Object.assign(b, { page, outlet, mod });
}

/* the pool of words and of numbers a page may show */
const probe = boot('');
const pool = new Set(), patterns = [];
function addWords(text) { String(text).split(/\s+/).forEach((t) => { if (t) pool.add(t.replace(/^["'(]+|["'.,:;)!?]+$/g, '').toLowerCase()); }); }
for (const id of ['worldstats', 'worldmeasure', 'nav']) {
  for (const f of Object.values(probe.w.ArkManifest.get(id).fields)) { addWords(f.value); patterns.push(new RegExp('^' + f.value.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{\w+\}/g, '.+') + '$')); }
}
(function walk(v) { if (v == null) return; if (typeof v === 'string' || typeof v === 'number') addWords(v); else if (typeof v === 'object') Object.values(v).forEach(walk); })([H.operations, CD, RS.resolvers, H.defiShard, H.clientPath.machine, H.clientPath.mode, H.clientPath.replicationNote, H.infraResolvers.note, H.operations.record, H.clientPath.record]);
['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'to'].forEach((m) => pool.add(m));
function foreignWords(root) {
  const bad = [], walker = root.ownerDocument.createTreeWalker(root, 4);
  for (let n; (n = walker.nextNode());) {
    const text = n.textContent.trim(); if (!text) continue;
    if (patterns.some((p) => p.test(text))) continue;
    for (const raw of text.split(/\s+/)) {
      const token = raw.replace(/^["'(]+|["'.,:;)!?%]+$/g, '').toLowerCase();
      if (!token || /^[\d,.·+\-–—→←#/x%]+$/.test(token) || /^[a-z]$/.test(token) || pool.has(token) || pool.has(token.replace(/s$/, '')) || /^(bench|infra)-\d+$/.test(token) || /^docs\/evidence\//.test(token)) continue;
      bad.push(raw);
    }
  }
  return bad;
}
{ const d = probe.w.document.createElement('p'); d.textContent = 'Seamless typed sentence about gardens'; assert(foreignWords(d).length >= 3, 'foreignWords finds words that are in no manifest and no data file (a test that cannot fail proves nothing)'); }

/* every number on a page is a number of the data (or the one a rule here derives from it) */
const numbers = new Set();
function addNumber(n) { if (typeof n !== 'number' || !isFinite(n)) return; numbers.add(String(n)); numbers.add(n.toLocaleString('en-US')); }
(function walk(v) { if (v == null) return; if (typeof v === 'number') addNumber(v); else if (typeof v === 'string') (v.match(/\d[\d,.]*/g) || []).forEach((t) => numbers.add(t.replace(/[.,]$/, ''))); else if (typeof v === 'object') Object.values(v).forEach(walk); })([CD, H.defiShard, H.clientPath, H.operations, H.infraResolvers.audit.length, H.infraResolvers.note, statsWeeks, SP.statsRuns()]);
const D = H.defiShard;
[D.batchLatencyMs.toFixed(1), String(Math.round(D.broadcastLatencyMs)), String(Math.round(D.verifyLatencyMsBatched / D.batchLatencyMs * 100)), (D.signLatencyMs / D.batchLatencyMs * 100).toFixed(1), (1000 / D.broadcastLatencyMs).toFixed(1), (D.broadcastLatencyMs / D.batchLatencyMs).toFixed(1), String(H.infraResolvers.audit.filter((a) => /^yes/.test(a.resolver)).length), String(CD.capabilities.reduce((s, c) => s + c.count, 0)), '2026', '43', '1', '2'].forEach((n) => numbers.add(n));
for (const w of statsWeeks) { const a = new Date(w.from + 'T00:00:00Z'), b = new Date(w.to + 'T00:00:00Z'); [a, b].forEach((d) => numbers.add(String(d.getUTCDate()))); for (const r of w.runs) numbers.add(String(new Date(r.date + 'T00:00:00Z').getUTCDate())); }
numbers.add(CD.capabilities.reduce((s2, c) => s2 + (c.functions || 0), 0).toLocaleString('en-US'));   /* the strip's function total: a sum of the data, shown as is */
CD.capabilities.forEach((c) => { numbers.add(String(c.count)); numbers.add(String(c.functions)); const v = (c.version || '').split('.'); v.forEach((t) => numbers.add(t)); numbers.add(v.slice(0, 2).join('.')); });
/* the marks on a ruler are not readings but numbers the page must print (stats-scale.js). Derived here by a different loop: try the steps 1, 2, 5, 10, 20, 50, ... in
   order and keep the first that needs at most four ticks to reach the largest value. The latency ruler is 1, 10 and 100 ms by definition. */
function rulerMarks(max) { for (let step = 1; ; step *= (step.toString()[0] === '2' ? 2.5 : 2)) { if (Math.ceil(max / step) <= 4) { const out = []; for (let t = step; t < max + step; t += step) out.push(t); return out; } } }
for (const max of [H.clientPath.ceilingSwapsPerSecond, Math.max(...CD.capabilities.map((c) => c.count))]) rulerMarks(max).forEach((t) => addNumber(t));
[1, 10, 100].forEach(addNumber);
function foreignNumbers(root, extra) {
  const bad = [], text = Array.from(root.querySelectorAll('*')).filter((e) => !e.children.length).map((e) => e.textContent).join(' \n ');
  for (const t of text.match(/\d[\d,]*(?:\.\d+)?/g) || []) { const token = t.replace(/,$/, ''); if (!numbers.has(token) && !(extra && extra.has(token))) bad.push(token); }
  return bad;
}


(async () => {
  const OPS = probe.w.ArkStatsScale.operations(H.operations.rows), F = H.operations.fleet, CP = H.clientPath, fmt = (n) => Number(n).toLocaleString('en-US');
  const ANSWER = { 'stats/now': fmt(F.parallelSwapsPerSecond), 'stats/capabilities': fmt(OPS[0].rows.slice().sort((a, b) => b.rate - a.rate)[0].rate), 'stats/ceiling': fmt(CP.ceilingSwapsPerSecond) };
  const NEXT = { 'stats/now': 'stats/capabilities', 'stats/capabilities': 'stats/ceiling', 'stats/ceiling': 'stats/now' };
  const derived = new Set([(D.broadcastLatencyMs / D.batchLatencyMs).toFixed(1), D.batchLatencyMs.toFixed(1), String(Math.round(D.broadcastLatencyMs))]);
  for (const key of KEYS) {
    const host = worldStub(), m = await mount(key, '', { host, pulse: failing(502), settle: 20 }), page = m.page;
    const steps = [...page.querySelectorAll('.ws-steps a')];
    assert.deepEqual(steps.map((a) => a.dataset.sceneLink), KEYS, key + ': the stepper holds the three steps in story order');
    assert.equal(page.querySelector('.ws-steps a[aria-current]').dataset.sceneLink, key, key + ': and marks this one');
    assert.equal(page.querySelector('.ws-answer .big b').textContent, ANSWER[key], key + ': the one answer is the data\'s number');
    assert.equal(page.querySelector('.wp-foot a').dataset.sceneLink, NEXT[key], key + ': the one action leads to the next step');
    assert(/\d{1,2} \w{3} 2026/.test(page.querySelector('.ws-source').textContent), key + ': the card names its run\'s date');
    assert.deepEqual(foreignWords(page), [], key + ': every word is a word of the manifest or a data file');
    assert.deepEqual(foreignNumbers(page, derived), [], key + ': every number is a number of a data file (502 is the HTTP code the test makes the pulse answer)');
    assert(!/\blive\b/i.test(page.querySelector('.ws-answer').textContent), key + ': no answer says live');
    assert(![...page.querySelectorAll('.ws-facts2 dd b')].some((b) => b.textContent.trim() === '0'), key + ': no reading is shown as 0');
    assert.equal(host.calls.state[0].s, key.split('/')[1], key + ': the world is told the step');
    page.arkDispose(); assert.equal(host.calls.off.length, host.calls.on.length, key + ': every listener goes on dispose');
  }
  /* the network: totals only, and what streams now is one fact that says why there is no reading */
  {
    const m = await mount('stats/now', '', { host: worldStub(), pulse: failing(502), settle: 20 }), text = m.page.textContent;
    for (const nd of F.perNode) assert(!text.includes(nd.node), 'the network names no node (' + nd.node + ')');
    assert.equal(m.page.querySelectorAll('.ws-facts2 .none').length, 1, 'one fact says No reading: the live readings');
    assert(/No reading/.test(m.page.querySelector('.ws-facts2 .none').textContent), 'and it says No reading');
    const tags = [...m.page.querySelectorAll('.wp-tags .tag')].map((t) => t.dataset.tag);
    assert.deepEqual(tags.filter((t) => /node/.test(t)), [], 'no label for a single node');
    m.page.arkDispose();
  }
  /* capabilities: an operation is chosen by its chip, the address is replaced, the world told */
  {
    const host = worldStub(), m = await mount('stats/capabilities', '', { host, pulse: failing(502) });
    assert.deepEqual([...m.page.querySelectorAll('.ws-ops [data-c]')].map((b) => b.dataset.c), plain(OPS.map((g) => g.id)), 'one chip for each operation of the matrix');
    const swap = OPS.find((g) => g.name === 'Swap');
    [...m.page.querySelectorAll('[data-c]')].find((b) => b.dataset.c === swap.id).click();
    assert.deepEqual(m.writes.pop(), ['/stats/capabilities', 'c=' + swap.id, 'replace'], 'a choice replaces the entry');
    assert.equal(host.calls.select.at(-1).c, swap.id, 'and tells the world');
    assert.equal(m.page.querySelector('.ws-answer .big b').textContent, fmt(swap.rows.slice().sort((a, b) => b.rate - a.rate)[0].rate), 'the answer is the chosen operation\'s fastest measured way');
    m.page.arkDispose();
  }
  /* one node: what limits it is the batch's send, from BENCH-012 */
  {
    const m = await mount('stats/ceiling', '', { host: worldStub(), pulse: failing(502) }), lim = m.page.querySelector('.ws-facts2 .wide');
    assert(lim && lim.textContent.includes(String(Math.round(D.broadcastLatencyMs))) && lim.textContent.includes((D.broadcastLatencyMs / D.batchLatencyMs).toFixed(1)), 'one node says what limits it: the send, against the time to resolve');
    m.page.arkDispose();
  }
  /* a page mounts with no world at all */
  { const m = await mount('stats/now', '', { pulse: failing(502) }); assert(m.page.querySelector('.ws-answer .big b'), 'the page reads with no 3D'); m.page.arkDispose(); }
  console.log('world-stats: ok (3 steps, 1 illustration, ' + KEYS.length + ' pages, ' + Object.keys(probe.w.ArkManifest.get('worldstats').fields).length + ' manifest fields)');
})().catch((e) => { console.error(e); process.exit(1); });

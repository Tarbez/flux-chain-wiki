/* The 3D world follows every page that has a view of its own (js/world/world-host.js VIEW_OF), 2026-10-24.
   Owner: "you are porting UI, not the 3D from the mock, and that is wrong." The mockup flies the camera to a view-specific
   target for each page; on the site only home and the intro did. What this pins, and why each case exists:
   - Every route of the redesign has a view in VIEW_OF, and that view is one the scene or a stage registers (a view the
     scene does not know would silently fall back to the calm pose, which is the defect).
   - The page contract: state() is used by the next flight once and then forgotten; select() merges into the current state
     and reaches the scene; on() returns an off() that works; with no listener home keeps its click (a ring opens /chain)
     and the covered guard still wins; a click in the 3D that leaves for another view goes to that view's page.
   - Labels place for any view, not only home.
   - The 3D moved out of docs/home-redesign is not left there as a second copy, and the mockup loads the new places.
   Run with jsdom and a stub scene: no WebGL is needed here. The real flights are checked in a browser by hand
   (scratchpad world3d/run.cjs: camera against the mockup's, idle frames, page errors). */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const ROUTES = {
  chain: 'chain', 'chain/record': 'record', 'chain/open': 'open', 'chain/links': 'links',
  identity: 'idstart', 'identity/sign': 'idsign', 'identity/safe': 'idsafe', 'identity/you': 'idyou',
  resolvers: 'resolvers', fxn: 'fxn', ring: 'ring',
  /* 2026-10-24: /measured is /stats/capabilities now. The four fixed pages of the stats section share ONE view, `stats` (js/world/stats-stage.js), so a move between
     them is a camera flight inside one scene; the week pages come from the data and are added by the stage (tests/world-stats.cjs) */
  'stats/now': 'stats', 'stats/ceiling': 'stats', 'stats/capabilities': 'stats',
  /* works is the 60-second sequence now (its own `movie` stage, js/world/minute-experience.js), not the mockup's minute view */
  works: 'movie', 'works/resolve': 'resolve', 'works/layers': 'layers', 'works/life': 'life',
  trace: 'trace', zero: 'home', intro: 'intro',
  /* 2026-10-25: /account shows one identity over the whole network, the view the identity flow ends on */
  account: 'idvalue'
};
const hostSource = fs.readFileSync('js/world/world-host.js', 'utf8');

/* ---------- the catalog, as tests/world-pages.cjs loads it ---------- */
const context = vm.createContext({ console, ArkUI: {}, document: { write() {} } });
const load = (file) => vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
load('js/content/manifest.js');
load('js/content/manifests/index.js');
vm.runInContext('ArkManifestIds', context).forEach((id) => load('js/content/manifests/' + id + '.js'));
['js/content/learnings.js', 'js/content/article-index.js', 'js/content/resolutions.js', 'js/content/site-pages.js', 'js/pages/catalog.js'].forEach(load);
const catalog = vm.runInContext('ArkUI.pageCatalog', context);

/* ---------- 1 every route has a view the scene or a stage knows ---------- */
const BUILT_IN = ['home', 'chain', 'record', 'open', 'links'];   /* chains-scene.js target() */
const known = new Set(BUILT_IN.concat(['calm']));
for (const file of fs.readdirSync('js/world').filter((f) => f.endsWith('.js'))) {
  for (const m of fs.readFileSync('js/world/' + file, 'utf8').matchAll(/S\.stage\(\{\s*name: '(\w+)'/g)) known.add(m[1]);
}
const viewOf = JSON.parse(JSON.stringify(vm.runInNewContext('(' + /var VIEW_OF = (\{[\s\S]*?\n  \});/.exec(hostSource)[1] + ')')));
for (const [key, view] of Object.entries(ROUTES)) {
  assert(catalog[key], key + ' is a registered route');
  assert.equal(viewOf[key], view, key + ' flies to ' + view);
  assert(known.has(view), key + ': the view "' + view + '" is registered by the scene or a stage (' + [...known].sort().join(' ') + ')');
}
assert.deepEqual(Object.keys(viewOf).sort(), Object.keys(ROUTES).sort(), 'VIEW_OF names exactly the redesign routes');
/* a stage is registered once: a copy in the mockup and one in the world would draw twice */
const seen = {};
for (const dir of ['js/world', 'docs/home-redesign']) {
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    for (const m of fs.readFileSync(dir + '/' + file, 'utf8').matchAll(/S\.stage\(\{\s*name: '(\w+)'/g)) { assert(!seen[m[1]], 'stage ' + m[1] + ' is registered in ' + seen[m[1]] + ' and in ' + dir + '/' + file); seen[m[1]] = dir + '/' + file; }
  }
}

/* ---------- 2 the page contract, in jsdom with a stub scene ---------- */
/* what the host passes comes from another realm: compare plain copies */
const clone = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));
function boot() {
  const dom = new JSDOM('<!doctype html><body><div id="scene"><div data-ark-layer="persistent"></div></div></body>', { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, calls = { to: [], select: [], navigate: [], stages: [], pick: [] };
  w.HTMLCanvasElement.prototype.getContext = () => ({ getExtension() { return null; } });
  const mounts = [];
  w.ArkUI = {
    pageCatalog: catalog, prefersReducedMotion: () => false,
    pageRouter: { pages: {}, navigate(page, settings) { calls.navigate.push(clone([page, settings])); return Promise.resolve(); }, onMount(fn) { mounts.push(fn); } },
    sceneState: { page: 'zero', get() { return { page: this.page }; } }
  };
  w.ArkWorld = {
    get: () => ({ motion: { riseIn: 1, riseStagger: 1, riseOut: 1, flight: 1750, crane: 1, cardZoom: 1, cardZoomTime: 1 }, look: {} }),
    forRoute: () => ({ exit: { words: 'up' }, view: null }), onChange() {}
  };
  const hooks = {};
  w.DEFXNScene = {
    ok: true, hooks, world: { V: (x, y, z) => ({ x, y, z }), k: { setLook() {} }, N: { W: 1, H: 1 }, fit() { return 1; } },
    stage(def) { calls.stages.push(def.name); }, go() {},
    to(st, first) { calls.to.push(clone([st, first])); return { dur: 0, words: 0 }; }, select(st) { calls.select.push(clone(st)); },
    ringTarget(ri) { return ri === 1 ? { view: 'chain' } : { view: 'ring', st: { i: 'ring-' + ri } }; }
  };
  /* the scripts the host loads are the stub's job: every named global exists, and the others "load" at once */
  ['DEFXNDependencies', 'DEFXN_MARK', 'DEFXN_NETWORK', 'DEFXN_RECORDS', 'DEFXNRingKit', 'DEFXN_CAPABILITIES', 'DEFXN_RESOLVERS', 'DEFXN_FXN', 'DEFXN_CONCEPT', 'DEFXN_IDENTITY'].forEach((n) => { w[n] = w[n] || {}; });
  const loaded = [];
  w.document.head.appendChild = function (node) { if (node.tagName === 'SCRIPT') { loaded.push(node.src); w.setTimeout(() => node.onload && node.onload(), 0); return node; } return Object.getPrototypeOf(this).appendChild.call(this, node); };
  w.eval(hostSource);
  return { w, calls, mounts, hooks, loaded };
}
const wait = (w, ms) => new Promise((resolve) => w.setTimeout(resolve, ms));

(async () => {
  const t = boot(), host = t.w.ArkWorldHost;
  assert(host, 'the host stands');
  assert.equal(host.viewFor('chain/record'), 'record');
  assert.equal(host.viewFor('about'), 'calm', 'a page with no view of its own gets the calm pose');
  assert.equal(host.keyOf('idsign'), 'identity/sign');

  /* state() before the world is ready is kept for the first flight */
  host.state({ r: 'rec-1', step: 3 });
  assert.equal(host.ready, false);
  await wait(t.w, 500);
  assert(host.ready, 'the world starts once its scripts are loaded');
  for (const need of ['js/world/ring-stage.js', 'js/world/concept-stages.js', 'js/world/identity-stages.js', 'js/world/intro-stage.js', 'js/world/home-helix.js', 'js/content/concept-data.js']) {
    /* named globals already present are skipped; the stage files are listed by path */
    if (/world\//.test(need)) assert(t.loaded.some((s) => s.includes(need)), need + ' is loaded by the host');
  }
  assert(hostSource.includes("'js/content/concept-data.js'") && hostSource.includes("'js/content/identity-sample.js'"), 'the moved data is listed');
  assert.deepEqual(t.calls.stages, ['calm'], 'the host registers only the calm stage; the intro stage is in js/world/intro-stage.js');
  assert.equal(t.calls.to.length, 1, 'the first flight went at start');
  assert.deepEqual(t.calls.to[0][0], { r: 'rec-1', step: 3, view: 'home' }, 'the first flight carries the state');

  /* a flight uses the state once */
  host.state({ r: 'rec-2', tab: 'history' });
  host.fly('chain/open');
  assert.deepEqual(t.calls.to[1][0], { r: 'rec-2', tab: 'history', view: 'open' });
  host.fly('chain/links');
  assert.deepEqual(t.calls.to[2][0], { view: 'links' }, 'the state is consumed by the flight');

  /* select() merges into the current state and reaches the scene */
  host.state({ r: 'rec-3' }); host.fly('chain/record');
  host.select({ r: 'rec-4' });
  assert.deepEqual(t.calls.select[0], { r: 'rec-4', view: 'record' });
  host.select({ tab: 'x' });
  assert.deepEqual(t.calls.select[1], { r: 'rec-4', tab: 'x', view: 'record' }, 'a second change keeps the first');
  host.fly('stats/capabilities');
  host.select({ c: 'cap-1' });
  assert.deepEqual(t.calls.select[2], { c: 'cap-1', view: 'stats' }, 'a new flight starts a new state');

  /* on(): a page listens; off() stops it; no listener, home keeps today's click */
  t.w.ArkWorldHost.covered = false;
  host.fly('zero');
  t.hooks.pick('home', 2);
  assert.deepEqual(t.calls.navigate.pop(), ['chain', null], 'with no page handler a ring on home opens the chain');
  const got = [];
  const off = host.on('pick', (v, j) => got.push([v, j]));
  t.hooks.pick('chain', 5);
  assert.deepEqual(got, [['chain', 5]]);
  t.hooks.pick('home', 1);
  assert.equal(t.calls.navigate.length, 0, 'a page that listens takes the click from home too');
  off(); off();
  t.hooks.pick('home', 1);
  assert.deepEqual(t.calls.navigate.pop(), ['chain', null], 'off() gives the click back');
  host.covered = true; t.hooks.pick('home', 1);
  assert.equal(t.calls.navigate.length, 0, 'a worn card hides the rings: no click, with or without a listener');
  host.on('pick', () => got.push('covered')); t.hooks.pick('chain', 1);
  assert(!got.includes('covered'), 'covered wins over a page handler');
  host.covered = false;
  t.hooks.pick('home', -1);
  assert.equal(t.calls.navigate.length, 0, 'a click on nothing opens nothing');
  const rings = [], offRing = host.on('pickRing', (ri) => rings.push(ri));
  t.hooks.pickRing(7); assert.deepEqual(rings, [7]); offRing();
  t.hooks.pickRing(7); assert.deepEqual(t.calls.navigate.pop(), ['ring', { query: '?i=ring-7' }], 'a ring of the network opens its page, with its id');
  const hov = [], offHover = host.on('hover', (lab) => hov.push(lab && lab.name));
  t.hooks.hover({ name: 'Rec' }, 1, 2); t.hooks.hover(null); offHover(); t.hooks.hover({ name: 'late' });
  assert.deepEqual(hov, ['Rec', null]);
  const picks = [], offStage = host.on('stagePick', (kind, id) => picks.push(kind + ':' + id));
  t.hooks.stagePick('resolver', 'r1'); offStage(); assert.deepEqual(picks, ['resolver:r1']);

  /* S.open: a click in the 3D that leaves for another view */
  host.fly('zero');
  t.hooks.open('layers', { s: 0 }, {});
  assert.deepEqual(t.calls.navigate.pop(), ['works/layers', { query: '?s=0' }], 'the ground logo opens the layers page');
  const before = t.calls.to.length;
  host.fly('trace');
  t.hooks.open('trace', { s: 'rec-3' }, { replace: true });
  assert.equal(t.calls.navigate.length, 0, 'a choice inside the view stays on the page');
  assert.deepEqual(t.calls.select.pop(), { s: 'rec-3', view: 'trace' });
  t.hooks.open('open', { r: 'rec-9' }, {});
  assert.deepEqual(t.calls.navigate.pop(), ['chain/open', { query: '?r=rec-9' }]);
  t.hooks.open('nowhere', {}, {});
  assert.equal(t.calls.navigate.length, 0, 'a view with no page opens nothing');
  assert(t.calls.to.length > before);
  /* the carried state of S.open rides into the page's flight */
  host.fly('zero');
  t.hooks.open('open', { r: 'rec-9' }, {});
  host.fly('chain/open');
  assert.deepEqual(t.calls.to[t.calls.to.length - 1][0], { r: 'rec-9', view: 'open' });

  /* labels place for any view */
  const d = t.w.document, layer = host.tags('chain');
  assert.equal(host.tags('chain'), layer, 'one layer for a view');
  assert.equal(layer.dataset.for, 'chain'); assert(layer.classList.contains('tags'));
  layer.innerHTML = '<span class="tag" data-tag="a" data-at="above"></span>';
  host.fly('chain');
  const el = layer.firstChild;
  Object.defineProperty(el, 'offsetWidth', { value: 80 }); Object.defineProperty(el, 'offsetHeight', { value: 20 });
  t.w.innerWidth = 1440; t.w.innerHeight = 900;
  t.hooks.tags('chain', [{ id: 'a', x: 700, y: 450, on: true }]);
  assert(layer.classList.contains('here'), 'the layer of the view the camera is at is shown');
  assert(el.classList.contains('seen'), 'a label of the chain view is placed');
  assert.match(el.style.transform, /translate\(/);
  host.fly('chain/record');
  t.hooks.tags('chain', [{ id: 'a', x: 700, y: 450, on: true }]);
  assert(!el.classList.contains('seen') && !layer.classList.contains('here'), 'when the camera leaves, the labels of that view wipe out');
  d.querySelector('.world-tags[data-for="home"]');

  /* ---------- 3 the moved files are not left in the mockup, and the mockup loads the new places ---------- */
  const MOVED = ['js/world/identity-stages.js', 'js/world/concept-stages.js', 'js/world/ring-stage.js', 'js/world/intro-stage.js', 'js/world/home-helix.js', 'js/content/identity-sample.js', 'js/content/concept-data.js'];
  for (const file of MOVED) {
    assert(fs.existsSync(file), file + ' exists');
    assert(!fs.existsSync('docs/home-redesign/' + path.basename(file)), file + ' is not also in docs/home-redesign');
  }
  /* no long line of a moved file appears in a mockup file: one place for the same code */
  const stay = fs.readdirSync('docs/home-redesign').filter((f) => f.endsWith('.js')).map((f) => [f, fs.readFileSync('docs/home-redesign/' + f, 'utf8')]);
  for (const file of MOVED.filter((f) => !/content\//.test(f))) {
    for (const line of fs.readFileSync(file, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l.length > 70 && !l.startsWith('/*') && !l.startsWith('*'))) {
      for (const [name, text] of stay) assert(!text.includes(line), file + ' has a line that is also in docs/home-redesign/' + name + ': ' + line.slice(0, 60));
    }
  }
  assert(!/\blocation\.(hash|replace)/.test(fs.readFileSync('js/world/concept-stages.js', 'utf8') + fs.readFileSync('js/world/ring-stage.js', 'utf8') + fs.readFileSync('js/world/home-descent.js', 'utf8')), 'the 3D never writes the address itself: it asks S.open');
  const html = fs.readFileSync('docs/home-redesign/home-mockup.html', 'utf8');
  const srcs = [...html.matchAll(/<script src="([^"?]+)/g)].map((m) => m[1]);
  for (const src of srcs) assert(fs.existsSync(path.join('docs/home-redesign', src)), 'home-mockup.html loads ' + src + ' and it exists');
  for (const file of MOVED) assert(srcs.includes('../../' + file), 'home-mockup.html loads ' + file);
  const order = (a, b) => assert(srcs.indexOf('../../' + a) < srcs.indexOf(b.startsWith('js') ? '../../' + b : b), a + ' loads before ' + b);
  order('js/content/concept-data.js', 'js/world/concept-stages.js'); order('js/content/identity-sample.js', 'js/world/identity-stages.js');
  order('js/world/stages.js', 'js/world/ring-stage.js'); order('js/world/intro-stage.js', 'app.js');

  console.log('world-views: ok (' + Object.keys(ROUTES).length + ' routes, ' + known.size + ' views, ' + Object.keys(seen).length + ' stages once each)');
  t.w.close();
})().catch((error) => { console.error(error); process.exit(1); });

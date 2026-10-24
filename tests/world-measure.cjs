/* The redesign's pages on the 3D world: js/pages/world-measure.js (/resolvers, /measured, /fxn, /ring) and
   js/pages/world-works.js (/how-it-works, /how-it-works/resolve, /how-it-works/layers, /how-it-works/life, /trace),
   both on the frame js/pages/world-sheet.js. Each page is mounted in jsdom, the way the router mounts it.
   What this pins, and why each case exists:
   - Every module mounts into a page with class world-page, a [data-stage] box (the frame the camera fits), a [data-panel] slab
     and .rise items (ArkUI.worldRise animates them by transform and clip). A page missing any of them flies the camera at
     nothing or leaves its words standing while the page leaves.
   - Every word comes from a manifest. A key a page names that no manifest defines throws in ArkCopy.text, so the mount
     fails; and every word the page shows is a word of a manifest or of a data file (the pool of words below), so a
     sentence typed into the JS shows up here. The JS carries no sentence of its own.
   - The world is told the mockup's address state: state() while mounting, select() when a choice inside the page changes
     it, on() for clicks on 3D things; every off() runs when the page is disposed. A page still works when the world
     (ArkWorldHost.state) is not there.
   - A choice inside a page replaces the history entry and the address holds it (Back leaves the page).
   - Numbers come from the data files: the counts, the supply, the checked cases, the runs with their dates and sources. Nothing
     says "Live" (everything runs on a devnet).
   - The catalog points each route at its module, loads the shared frame first, and the old /resolvers module file is kept. */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

/* ---- the catalog, loaded as tests/world-pages.cjs loads it ---- */
const cx = vm.createContext({ console, ArkUI: {}, document: { write() {} } });
const run = (file) => vm.runInContext(read(file), cx, { filename: file });
run('js/content/manifest.js'); run('js/content/manifests/index.js');
vm.runInContext('ArkManifestIds', cx).forEach((id) => run('js/content/manifests/' + id + '.js'));
['js/content/learnings.js', 'js/content/article-index.js', 'js/content/resolutions.js', 'js/content/site-pages.js', 'js/pages/catalog.js'].forEach(run);
const catalog = vm.runInContext('ArkUI.pageCatalog', cx);

const ROUTES = {
  resolvers: ['worldResolvers', 'resolvers', 'js/pages/world-measure.js'], measured: ['worldMeasured', 'measured', 'js/pages/world-measure.js'],
  fxn: ['worldFxn', 'fxn', 'js/pages/world-measure.js'], ring: ['worldRing', 'ring', 'js/pages/world-measure.js'],
  /* works (In one minute) is the 60-second sequence now (worldMinuteMovie, js/pages/world-minute.js), held by tests/world-minute.cjs */
  'works/resolve': ['worldResolve', 'resolve', 'js/pages/world-works.js'],
  'works/layers': ['worldLayers', 'layers', 'js/pages/world-works.js'], 'works/life': ['worldLife', 'life', 'js/pages/world-works.js'], trace: ['worldTrace', 'trace', 'js/pages/world-works.js']
};
for (const [key, [module, , file]] of Object.entries(ROUTES)) {
  assert.equal(catalog[key].module, module, key + ' is drawn by ' + module);
  const scripts = [...catalog[key].scripts];
  assert(scripts.includes(file), key + ' loads ' + file);
  assert(scripts.indexOf('js/pages/world-sheet.js') >= 0 && scripts.indexOf('js/pages/world-sheet.js') < scripts.indexOf(file), key + ' loads the shared frame before its page file');
  assert(!scripts.includes('js/ark/blocks.js'), key + ' loads no Ark blocks');
}
assert(fs.existsSync(path.join(ROOT, 'js/pages/resolvers.js')), 'the old /resolvers page file is kept');
for (const css of ['css/world-measure.css', 'css/world-works.css']) assert(catalog.zero.styles === undefined || fs.existsSync(path.join(ROOT, css)), css + ' exists');

/* ---- one window ---- */
function boot(query, host) {
  const dom = new JSDOM('<!doctype html><body><div id="outlet"></div></body>', { runScripts: 'outside-only', url: 'http://127.0.0.1/', pretendToBeVisual: true });
  const w = dom.window, writes = [], went = [];
  w.eval('window.ArkUI = { pageModules: {}, pageCatalog: {}, route: {}, pageRouter: {} };');
  w.eval(read('js/content/manifest.js'));
  vm.runInContext('ArkManifestIds', cx).forEach((id) => w.eval(read('js/content/manifests/' + id + '.js')));
  ['js/content/network-data.js', 'js/content/capabilities-data.js', 'js/content/resolvers-data.js', 'js/content/fxn-data.js', 'js/content/records-sample.js'].forEach((f) => w.eval(read(f)));
  let search = query || '';
  w.ArkUI.pageCatalog = JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(catalog).map(([k, v]) => [k, { path: v.path }]))));
  w.ArkUI.route = { href: (p) => p, path: () => w.__path || '/', search: () => search, write(p, q, mode) { writes.push([p, q, mode]); search = q; w.__path = p; } };
  w.ArkUI.pageRouter = { navigate(page, settings) { went.push([page, settings && settings.query]); return Promise.resolve(true); } };
  if (host) w.ArkWorldHost = host;
  w.eval(read('js/pages/world-sheet.js')); w.eval(read('js/pages/world-measure.js')); w.eval(read('js/pages/world-works.js'));
  return { w, writes, went };
}
function worldStub() {
  const calls = { state: [], select: [], on: [], off: [] };
  return { calls, state(st) { calls.state.push(JSON.parse(JSON.stringify(st))); }, select(st) { calls.select.push(JSON.parse(JSON.stringify(st))); },
    on(name, fn) { calls.on.push([name, fn]); return () => calls.off.push(name); } };
}
function mount(key, query, host) {
  const b = boot(query, host); b.w.__path = catalog[key].path;
  const outlet = b.w.document.getElementById('outlet');
  const page = b.w.ArkUI.pageModules[ROUTES[key][0]].mount(outlet);
  return Object.assign(b, { page, outlet });
}

/* ---- the pool of words: every manifest value and every string or number of the data files ---- */
const pool = new Set(), patterns = [];
function addWords(text) { String(text).split(/\s+/).forEach((t) => { if (t) pool.add(t.replace(/^["'(]+|["'.,:;)!?]+$/g, '').toLowerCase()); }); }
const probe = boot('');
for (const id of ['worldmeasure', 'worldworks', 'nav']) {
  const m = probe.w.ArkManifest.get(id);
  for (const f of Object.values(m.fields)) { addWords(f.value); patterns.push(new RegExp('^' + f.value.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{\w+\}/g, '.+') + '$')); }
}
(function walk(v) { if (v == null) return; if (typeof v === 'string' || typeof v === 'number') addWords(v); else if (typeof v === 'object') Object.values(v).forEach(walk); })(
  [probe.w.DEFXN_CAPABILITIES, probe.w.DEFXN_RESOLVERS, probe.w.DEFXN_FXN, probe.w.DEFXN_RECORDS.records, probe.w.DEFXN_NETWORK.NAMED]);
function foreignWords(root) {
  const bad = [], walker = root.ownerDocument.createTreeWalker(root, 4);
  for (let n; (n = walker.nextNode());) {
    const text = n.textContent.trim(); if (!text) continue;
    if (patterns.some((p) => p.test(text))) continue;
    for (const raw of text.split(/\s+/)) {
      const token = raw.replace(/^["'(]+|["'.,:;)!?%]+$/g, '').toLowerCase();
      if (!token || /^[\d,.·+\-–—→←#/x%]+$/.test(token) || /^[a-z]$/.test(token) || pool.has(token) || pool.has(token.replace(/s$/, ''))) continue;
      bad.push(raw);
    }
  }
  return bad;
}

/* the check itself: a sentence typed into a page is found (why: a test that cannot fail proves nothing) */
{ const d = probe.w.document.createElement('p'); d.textContent = 'Seamless typed sentence about gardens'; assert(foreignWords(d).length >= 3, 'foreignWords finds words that are in no manifest and no data file'); }

/* ---- every page mounts, with its frame, its words and its world state ---- */
const CASES = [
  ['resolvers', '', { view: 'resolvers' }], ['resolvers', 'id=dao', { view: 'resolvers', id: 'dao' }],
  ['measured', '', { view: 'measured', tab: 'caps' }], ['measured', 'c=escrow&tab=runs', { view: 'measured', c: 'escrow', tab: 'runs' }],
  ['fxn', '', { view: 'fxn', g: 'mining', tab: 'supply' }], ['fxn', 'tab=fees', { view: 'fxn', g: 'computers', tab: 'fees' }], ['fxn', 'tab=money', { view: 'fxn', tab: 'money' }],
  ['ring', '', { view: 'ring', i: 'deark' }], ['ring', 'i=fxn', { view: 'ring', i: 'fxn' }], ['ring', 'i=resolver-1', { view: 'ring', i: 'resolver-1' }], ['ring', 'i=defxn', { view: 'ring', i: 'defxn' }], ['ring', 'i=fxn-ledger', { view: 'ring', i: 'fxn-ledger' }],
  /* works is the 60-second sequence now (tests/world-minute.cjs holds its state) */
  ['works/resolve', 'step=3', { view: 'resolve', step: 3 }], ['works/layers', 's=2', { view: 'layers', s: '2' }], ['works/life', 's=4', { view: 'life', s: '4' }],
  ['trace', '', { view: 'trace' }], ['trace', 's=research-summary', { view: 'trace' }]
];
for (const [key, query, want] of CASES) {
  const label = key + (query ? '?' + query : '');
  const host = worldStub(), m = mount(key, query, host), page = m.page;
  assert(page.classList.contains('world-page') && page.classList.contains('wp'), label + ': a world page');
  assert(page.querySelector('[data-stage]') && page.querySelector('[data-panel]'), label + ': the stage and the slab are marked');
  assert(page.querySelectorAll('.rise').length >= 4, label + ': its words rise (' + page.querySelectorAll('.rise').length + ' items)');
  assert(page.querySelector('h1') && page.getAttribute('aria-labelledby') === page.querySelector('h1').id, label + ': one heading names the page');
  assert.equal(host.calls.state.length, 1, label + ': state() once while mounting');
  for (const [k, v] of Object.entries(want)) assert.equal(host.calls.state[0][k], v, label + ': state().' + k + ' is ' + v + ' (got ' + host.calls.state[0][k] + ')');
  assert.equal(host.calls.state[0].view, want.view, label + ': the view');
  assert.deepEqual(foreignWords(page), [], label + ': every word is a manifest word or a data word');
  assert([...page.querySelectorAll('*')].every((e) => e.children.length || !/^live$/i.test(e.textContent.trim())), label + ': no tag says Live (devnet)');
  page.arkDispose(); assert.equal(host.calls.off.length, host.calls.on.length, label + ': every off() ran on dispose (' + host.calls.on.length + ' registered)');
  /* without a world the page still mounts */
  const bare = mount(key, query, null); assert(bare.page.querySelectorAll('.rise').length >= 4, label + ': mounts with no world'); bare.page.arkDispose();
}

/* ---- the router hands a page its query in prepare(), before it writes the address ---- */
/* why: a link from /resolvers to /measured?c=custody mounted the page before the address changed, and the page showed the first capability */
{
  const host = worldStub(), b = boot('', host); b.w.__path = '/measured';
  const mod = b.w.ArkUI.pageModules.worldMeasured; assert.equal(typeof mod.prepare, 'function', 'a page has prepare(page, settings)');
  mod.prepare('measured', { query: 'c=seal&tab=runs' });
  const page = mod.mount(b.w.document.getElementById('outlet'));
  assert.deepEqual([page.arkState().c, page.arkState().tab], ['seal', 'runs'], 'the page opens with the query it was navigated with, not the old address');
  assert.equal(host.calls.state[0].c, 'seal'); page.arkDispose();
}

/* ---- registered 3D clicks: pick, pickRing ---- */
{
  const pages = { resolvers: ['pick'], measured: ['pick'], fxn: ['pick'], ring: ['pickRing'], trace: ['pick'] };
  for (const [key, names] of Object.entries(pages)) {
    const host = worldStub(), m = mount(key, '', host);
    assert.deepEqual(host.calls.on.map((c) => c[0]), names, key + ' listens for ' + names.join(', '));
    m.page.arkDispose();
  }
}

/* ---- a choice inside a page: the address (replacing the entry), the world, the words ---- */
{
  const host = worldStub(), m = mount('resolvers', '', host), { w } = m;
  const dao = [...m.page.querySelectorAll('[data-id]')].find((b) => b.dataset.id === 'dao'); dao.click();
  assert.deepEqual(m.writes.pop(), ['/resolvers', 'id=dao', 'replace'], 'a resolver replaces the entry');
  assert.equal(host.calls.select.at(-1).id, 'dao', 'select() tells the world');
  assert(/DAO/.test(m.page.querySelector('h1').textContent) && /2 capabilities|1 capability|Built from/.test(m.page.querySelector('h1').textContent), 'the title names the resolver and what it is built from');
  const a = host.calls.on[0][1]; a('resolver', 'treasury'); assert.equal(host.calls.select.at(-1).id, 'treasury', 'a 3D pick of a resolver cube picks it');
  const names = [...m.page.querySelectorAll('.wp-tags .tag')].map((t) => t.dataset.tag); assert(names.includes('name') && names.includes('cap-custody'), 'the 3D labels are in the page');
  /* the numbers are the data file's */
  const R = w.DEFXN_RESOLVERS.resolvers; assert(m.page.querySelector('.eyebrow-dot').textContent.includes(String(R.length)), 'the resolver count is the data file\'s');
  m.page.arkDispose();
}
{
  const host = worldStub(), m = mount('measured', '', host), C = m.w.DEFXN_CAPABILITIES;
  const total = C.capabilities.reduce((s, c) => s + c.count, 0);
  assert(m.page.querySelector('.strip').textContent.includes(C.capabilities[0].count + ' of ' + total), 'the checked cases are the data file\'s');
  [...m.page.querySelectorAll('[role="tab"]')].find((t) => t.id === 'wm-tab-runs').click();
  assert.deepEqual(m.writes.pop(), ['/measured', 'tab=runs', 'replace'], 'the runs tab replaces the entry');
  assert.equal(host.calls.select.at(-1).tab, 'runs', 'select() tells the world about the tab');
  const runs = m.page.querySelector('#wm-runs'), text = runs.textContent;
  for (const run of C.runs) assert(text.includes(run.id) && text.includes(run.date) && text.includes(run.what), run.id + ' is named with its date');
  assert(text.includes(C.limit), 'the limit that comes with the runs is said');
  assert(!m.page.querySelector('#wm-caps') || m.page.querySelector('#wm-caps').hidden, 'the capabilities panel is out of the way on the runs tab');
  host.calls.on[0][1]('capability', 'seal'); assert.equal(host.calls.select.at(-1).c, 'seal', 'a 3D pick of a capability column picks it'); assert.equal(host.calls.select.at(-1).tab, 'caps');
  m.page.arkDispose();
}
{
  const host = worldStub(), m = mount('fxn', '', host), F = m.w.DEFXN_FXN;
  assert(m.page.querySelector('h1').textContent.includes(F.supply.toLocaleString('en-US')), 'the supply is the data file\'s');
  const pcts = [...m.page.querySelectorAll('#wm-supply [data-g]')].map((b) => b.querySelector('b').textContent); assert.equal(pcts.length, 8, 'eight parts of the supply');
  assert.equal(pcts.reduce((s, p) => s + parseInt(p, 10), 0), 100, 'the parts add to 100%');
  [...m.page.querySelectorAll('[role="tab"]')].find((t) => t.id === 'wm-tab-fees').click();
  assert.deepEqual(m.writes.pop(), ['/fxn', 'tab=fees', 'replace'], 'the fees tab replaces the entry and takes the first fee part');
  assert.equal(host.calls.select.at(-1).g, 'computers');
  assert(m.page.querySelector('#wm-fees').textContent.includes(F.fees.note), 'the fee note is the data file\'s');
  m.page.querySelector('#wm-supply').hidden = false;
  host.calls.on[0][1]('fxn', 'sale'); assert.equal(host.calls.select.at(-1).tab, 'supply', 'a 3D pick of a supply tile goes back to the supply tab'); assert.equal(host.calls.select.at(-1).g, 'sale');
  m.page.arkDispose();
}
{
  const host = worldStub(), m = mount('ring', 'i=resolver-1', host);
  const peers = m.page.querySelector('.peers a'); assert(peers, 'a kind with several rings has a way to the next');
  host.calls.on[0][1](m.w.DEFXN_NETWORK.IDS.indexOf('cr3tv'));
  assert.equal(host.calls.select.at(-1).i, 'cr3tv', 'a 3D pick of a ring opens it'); assert.deepEqual(m.writes.pop(), ['/ring', 'i=cr3tv', 'replace']);
  m.went.length = 0; host.calls.on[0][1](m.w.DEFXN_NETWORK.IDS.indexOf('fxn-ledger')); assert.deepEqual(m.went.pop(), ['fxn', ''], 'the FXN ledger opens the FXN supply');
  assert(m.page.textContent.includes('CR3'), 'the named network says its coin, from the data file');
  assert(!m.page.querySelector('.wp-note').textContent.includes('live chain') || /not a live chain|not live data/.test(m.page.querySelector('.wp-note').textContent), 'a ring says it is a shape, not a live chain');
  m.page.arkDispose();
}
{
  const host = worldStub(), m = mount('works/resolve', '', host);
  m.page.ownerDocument.dispatchEvent(new m.w.KeyboardEvent('keydown', { key: 'ArrowRight' }));
  assert.equal(host.calls.select.at(-1).step, 2, 'the right arrow moves to the next step'); assert.deepEqual(m.writes.pop(), ['/how-it-works/resolve', 'step=2', 'replace']);
  m.page.querySelectorAll('[data-seg]')[4].click(); assert.equal(host.calls.select.at(-1).step, 5);
  assert.equal(m.page.querySelector('.wp-cta').dataset.sceneLink, 'identity', 'the last step ends at Create your identity');
  m.page.arkDispose(); m.writes.length = 0;
  m.page.ownerDocument.dispatchEvent(new m.w.KeyboardEvent('keydown', { key: 'ArrowLeft' })); assert.equal(m.writes.length, 0, 'a disposed page no longer hears the arrows');
}
{
  /* the chapter strip, read from the second chapter: the first (works) is the 60-second sequence's own page now */
  const m = mount('works/resolve', '', worldStub());
  assert.deepEqual([...m.page.querySelectorAll('.chapters a')].map((a) => a.dataset.sceneLink), ['works', 'works/resolve', 'works/layers', 'works/life'], 'How it works links its chapters in order');
  assert.equal(m.page.dataset.chapter, 'resolve'); assert.equal(m.page.dataset.chapterIndex, '1');
  const L = mount('works/layers', '', worldStub()), c = L.w.DEFXN_CAPABILITIES.capabilities.length, r = L.w.DEFXN_RESOLVERS.resolvers.length;
  assert(L.page.textContent.includes(c + ' capabilities') && L.page.textContent.includes(r + ' resolvers'), 'Three layers counts capabilities and resolvers from their data files');
  assert.equal(L.page.querySelectorAll('.rows-pick li').length, 3, 'three layers');
  const T = mount('trace', '', worldStub()), recs = T.w.DEFXN_RECORDS.records;
  assert.equal(T.page.querySelectorAll('.trace li').length, recs.length, 'the trace lists every record of the sample');
  assert(T.page.querySelector('.trace li:last-child').textContent.includes('Genesis'), 'the first record is the genesis');
  T.page.querySelectorAll('.trace a')[2].click(); assert.deepEqual(T.writes.pop(), ['/trace', 's=' + recs[2].id, 'replace']);
  assert.equal(T.page.querySelector('.wp-cta').dataset.sceneLink, 'chain/open'); assert(T.page.querySelector('.wp-cta').href.includes('r=' + recs[2].id), 'the action opens the chosen record');
}

/* ---- the source: no sentence is typed into the JS, every key it names exists ---- */
for (const file of ['js/pages/world-sheet.js', 'js/pages/world-measure.js', 'js/pages/world-works.js']) {
  const code = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
  assert(!/(['"])[A-Z][a-z]+(?: [a-z]+){3,}[^'"\n]*\1/.test(code.replace(/^\s*\/\/.*$/gm, '')), file + ' spells out no sentence where a manifest key belongs');
  for (const m of code.matchAll(/'((?:WORLDMEASURE|WORLDWORKS)\.[A-Z0-9.]*[A-Z0-9])'/g)) assert(probe.w.ArkCopy.has(m[1]), file + ' names ' + m[1] + ', which no manifest defines');
}
console.log('world-measure: ok');

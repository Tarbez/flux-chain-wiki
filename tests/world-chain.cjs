/* The chain and identity pages that stand on the 3D world (js/pages/world-chain.js, js/pages/world-identity.js).
   What this pins, and why each case exists:
   - Every page of the nine-step flow is a catalog route with its own module, and the scripts it loads exist: a route that names
     a missing file shows a blank page.
   - Every word on every page is a manifest word or sample data. The manifests are mounted with each value replaced by a marker,
     and what is left after the markers and the sample data are taken out may hold no letter. A word typed into the page file
     would survive and fail this. (A screen can read right while one label is typed in the code, where the CMS cannot edit it.)
   - Every manifest key a page names exists, and every manifest field is read by a page: a renamed key cannot blank a heading,
     and a field nobody reads cannot sit in the CMS looking editable.
   - Each page marks the box the camera fits ([data-stage]), the slab ([data-panel]) and its rising words (.rise), and its
     heading is the page's label.
   - The world is told the view's state while the page mounts (ArkWorldHost.state), and again when a choice changes
     (ArkWorldHost.select) with the same address the page writes. A pick on a 3D tile that the page does not own returns false,
     so the host keeps its own default. Every listener the page registered is removed on dispose (off()).
   - Without the world (no ArkWorldHost) every page still mounts and reads. */
const fs = require('node:fs'), assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const read = (file) => fs.readFileSync(file, 'utf8');
function boot(search) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://127.0.0.1/' });
  const w = dom.window, log = { writes: [], navigates: [], state: [], select: [], on: [], off: 0, tags: {}, hover: [] };
  const route = { q: search || '', p: '/' };
  w.ArkUI = {
    pageModules: {},
    route: { search: () => route.q, href: (p) => p, path: () => route.p, write: (path, query, mode) => { route.p = path; route.q = query; log.writes.push([path, query, mode]); } },
    pageRouter: { navigate: (key, s) => { log.navigates.push([key, s && s.query]); return Promise.resolve(true); } }
  };
  w.document.write = () => {};
  const load = (file) => w.eval(read(file) + '\n//# sourceURL=' + file);
  load('js/content/manifest.js');
  load('js/content/manifests/index.js');
  for (const id of w.eval('ArkManifestIds')) load('js/content/manifests/' + id + '.js');
  ['js/content/learnings.js', 'js/content/article-index.js', 'js/content/resolutions.js', 'js/content/site-pages.js', 'js/pages/catalog.js'].forEach(load);
  return { w, log, load, route };
}
function world(w, log) {
  const handlers = {};
  w.ArkWorldHost = {
    state(st) { log.state.push(JSON.parse(JSON.stringify(st))); return this; }, select(st) { log.select.push(JSON.parse(JSON.stringify(st))); return this; },
    on(name, fn) { (handlers[name] = handlers[name] || []).push(fn); log.on.push(name); return () => { handlers[name].splice(handlers[name].indexOf(fn), 1); log.off++; }; },
    tags(view) { return log.tags[view] || (log.tags[view] = w.document.createElement('div')); },
    hoverRecord(j) { log.hover.push(j); }
  };
  return handlers;
}

const ROUTES = {
  chain: ['worldChain', 'chain'], 'chain/record': ['worldRecord', 'record'], 'chain/open': ['worldOpen', 'open'], 'chain/links': ['worldLinks', 'links'],
  identity: ['worldIdentity', 'idstart'], 'identity/sign': ['worldIdentitySign', 'idsign'], 'identity/safe': ['worldIdentitySafe', 'idsafe'], 'identity/you': ['worldIdentityYou', 'idyou']
};
const PATHS = { chain: '/chain', 'chain/record': '/chain/record', 'chain/open': '/chain/open', 'chain/links': '/chain/links', identity: '/identity', 'identity/sign': '/identity/sign', 'identity/safe': '/identity/safe', 'identity/you': '/identity/you' };

/* ---------- the catalog ---------- */
{
  const { w } = boot();
  const catalog = w.eval('ArkUI.pageCatalog');
  for (const [key, [module]] of Object.entries(ROUTES)) {
    assert(catalog[key], key + ' is a catalog page');
    assert.equal(catalog[key].module, module, key + ' is drawn by ' + module);
    assert.equal(catalog[key].path, PATHS[key], key + ' keeps its path');
    const scripts = catalog[key].scripts;
    assert(scripts.includes('js/pages/world-chain.js'), key + ' loads the shared frame');
    assert.equal(scripts.includes('js/pages/world-identity.js'), key.startsWith('identity'), key + ' loads the identity file only for the identity pages');
    for (const file of scripts) assert(fs.existsSync(file), key + ' names ' + file + ', which exists');
    assert(!scripts.includes('js/ark/blocks.js') && !scripts.includes('js/ark/vendor/ark-kit-public.js'), key + ' loads no Ark blocks');
  }
  assert(fs.existsSync('js/pages/chain.js'), 'the old chain page file stays in place');
  assert(!/\['\.\.\.'\]/.test(read('js/pages/catalog.js')), 'the catalog is not left half-edited');
}

/* ---------- the manifests: every key named exists, every field is read ---------- */
{
  const { w } = boot();
  const keys = w.eval('ArkCopy.keys()');
  for (const [file, prefixes] of [['js/pages/world-chain.js', ['WORLDCHAIN.']], ['js/pages/world-identity.js', ['WORLDIDENTITY.']]]) {
    const source = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
    const named = [...source.matchAll(/\bt\('([A-Z0-9.]+)'( \+|\)|,)/g)].map((m) => ({ key: m[1], prefix: m[2] === ' +' }));
    assert(named.length >= 10, file + ' names its words through t()');
    for (const n of named) {
      const ok = keys.some((k) => prefixes.some((p) => (n.prefix ? k.startsWith(p + n.key) : k === p + n.key)));
      assert(ok, file + ': ' + n.key + ' is named but no manifest defines it');
    }
    assert(!/'[A-Z][a-z]+(?: [A-Za-z',.]+){2,}'/.test(source.replace(/'[A-Z0-9.]+'/g, '')), file + ' spells out no sentence where a key belongs');
  }
  /* a field is read when its key, or a prefix a page builds it from, appears in the page code */
  const chainSource = read('js/pages/world-chain.js'), identitySource = read('js/pages/world-identity.js');
  const mention = (source, role) => {
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '');
    const literals = new Set([...code.matchAll(/'([A-Z0-9.]+)'/g)].map((m) => m[1]));
    const prefixes = [...code.matchAll(/'([A-Z0-9.]+)'\s*\+/g)].map((m) => m[1]);
    return literals.has(role) || prefixes.some((p) => role.startsWith(p));
  };
  for (const k of keys.filter((x) => x.startsWith('WORLDCHAIN.'))) {
    const role = k.slice('WORLDCHAIN.'.length);
    assert(mention(chainSource, role) || /^FLOW\./.test(role), 'the field ' + k + ' is read by a page');
  }
  for (const k of keys.filter((x) => x.startsWith('WORLDIDENTITY.'))) {
    const role = k.slice('WORLDIDENTITY.'.length);
    assert(mention(identitySource + chainSource, role), 'the field ' + k + ' is read by a page');
  }
}

/* ---------- every page mounts, with and without the world ---------- */
function mountAll(search, withWorld) {
  const out = {};
  for (const [key, [module, view]] of Object.entries(ROUTES)) {
    const b = boot(search[key] || '');
    const handlers = withWorld ? world(b.w, b.log) : null;
    ['js/content/records-sample.js', 'js/content/identity-sample.js', 'js/content/capabilities-data.js', 'js/pages/world-chain.js', 'js/pages/world-identity.js'].forEach(b.load);
    const host = b.w.document.createElement('div'); b.w.document.body.appendChild(host);
    b.route.p = PATHS[key];
    const page = b.w.ArkUI.pageModules[module].mount(host);
    out[key] = Object.assign(b, { host, page, handlers, module, view, key });
  }
  return out;
}

const withWorld = mountAll({}, true), withoutWorld = mountAll({}, false);
for (const [key, m] of Object.entries(withWorld)) {
  const page = m.page;
  assert(page.classList.contains('world-page'), key + ' is a world page');
  assert(page.querySelector('[data-stage]'), key + ' marks the box the camera fits');
  assert(page.querySelector('[data-panel]'), key + ' marks its slab');
  assert(page.querySelectorAll('.rise').length >= (key === 'chain/open' ? 1 : 3), key + ' has words that rise (' + page.querySelectorAll('.rise').length + ')');
  const label = page.getAttribute('aria-labelledby'), h1 = label && page.querySelector('#' + label);
  assert(h1 && h1.tagName === 'H1' && h1.textContent.trim(), key + ' is labelled by its heading');
  assert.equal(page.querySelectorAll('h1').length, 1, key + ' has one heading');
  assert(page.querySelector('.cta'), key + ' has its one action');
  assert.equal(page.querySelectorAll('.cta').length, 1, key + ' has one dominant action');
  assert(typeof page.arkDispose === 'function', key + ' cleans up on dispose');
  assert(withoutWorld[key].page.querySelectorAll('.rise').length >= 1, key + ' mounts with no world');
}

/* ---------- every word is a manifest word or sample data ---------- */
{
  const b = boot();
  b.load('js/content/records-sample.js'); b.load('js/content/identity-sample.js'); b.load('js/content/capabilities-data.js');
  const sample = [];
  const R = b.w.eval('DEFXN_RECORDS'), I = b.w.eval('DEFXN_IDENTITY');
  sample.push(R.chain);
  for (const r of R.records) {
    for (const v of [r.title, r.type, r.date, r.date && r.date.slice(0, 6), r.about, r.signedBy, r.state]) if (v) sample.push(v);
    for (const c of r.content || []) { sample.push(c.head); c.items.forEach((x) => sample.push(x)); }
    for (const p of r.provenance || []) { sample.push(p.what, p.by, p.date); }
    for (const l of r.links || []) { sample.push(l.title, l.note); }
  }
  sample.push(I.name); for (const d of I.devices) sample.push(d.name, d.note);
  const sorted = sample.filter(Boolean).sort((a, c) => c.length - a.length);
  const MARK = /§[A-Z0-9.]+§/g;
  const wanted = { 'chain': 'r=client-feedback&tab=activity', 'chain/record': '', 'chain/open': 'r=project-notes&tab=signature', 'chain/links': '', identity: '', 'identity/sign': 's=2', 'identity/safe': 's=1', 'identity/you': '' };
  for (const tab of ['', 'activity', 'content', 'details', 'signature', 'history']) {
    for (const key of Object.keys(ROUTES)) {
      const only = ROUTES[key][0];
      if (tab && !((key === 'chain' && tab === 'activity') || (key === 'chain/open' && tab !== 'activity'))) continue;
      const m = boot(tab ? 'r=project-notes&tab=' + tab : wanted[key]);
      world(m.w, m.log);
      /* every manifest value becomes a marker; a {placeholder} stays so the page can fill it */
      for (const man of m.w.eval('ArkManifest.all()')) for (const [role, f] of Object.entries(man.fields)) {
        f.value = f.value.split(/(\{\w+\})/).map((part) => (/^\{\w+\}$/.test(part) || !part.trim() ? part : '§' + man.id.toUpperCase() + '.' + role + '§')).join('');
      }
      ['js/content/records-sample.js', 'js/content/identity-sample.js', 'js/content/capabilities-data.js', 'js/pages/world-chain.js', 'js/pages/world-identity.js'].forEach(m.load);
      const host = m.w.document.createElement('div'); m.w.document.body.appendChild(host); m.route.p = PATHS[key];
      const page = m.w.ArkUI.pageModules[only].mount(host);
      const texts = [];
      const walk = m.w.document.createTreeWalker(page, 4); let n; while ((n = walk.nextNode())) texts.push(n.nodeValue);
      page.querySelectorAll('*').forEach((el) => ['aria-label', 'title', 'alt', 'placeholder'].forEach((a) => { if (el.getAttribute(a)) texts.push(el.getAttribute(a)); }));
      m.log.tags && Object.values(m.log.tags).forEach((layer) => layer.querySelectorAll('*').forEach((el) => texts.push(el.textContent)));
      /* the tag layer is a separate element: read its leaves too */
      let left = texts.join('\n').replace(MARK, ' ');
      for (const s of sorted) left = left.split(s).join(' ');
      /* a count the page fills in is a number, never a word */
      const letters = left.match(/[A-Za-z]{2,}/g) || [];
      assert.deepEqual(letters, [], key + (tab ? ' (tab ' + tab + ')' : '') + ' shows words that are neither manifest words nor sample data: ' + letters.join(' '));
    }
  }
}

/* ---------- the world is told the view's state, and a choice goes back to it ---------- */
const expected = {
  chain: { view: 'chain', r: 'project-notes', tab: 'records' }, 'chain/record': { view: 'record', r: 'project-notes' },
  'chain/open': { view: 'open', r: 'project-notes', tab: 'content' }, 'chain/links': { view: 'links', r: 'project-notes' },
  identity: { view: 'idstart' }, 'identity/sign': { view: 'idsign', s: 1 }, 'identity/safe': { view: 'idsafe', s: 0 }, 'identity/you': { view: 'idyou' }
};
for (const [key, m] of Object.entries(withWorld)) {
  assert.equal(m.log.state.length, 1, key + ' tells the world its state once while mounting');
  assert.deepEqual(m.log.state[0], expected[key], key + ' state()');
  assert.equal(m.log.select.length, 0, key + ' does not call select() on mount');
  assert.equal(m.log.writes.length, 0, key + ' does not rewrite the address on mount');
}
{
  const m = mountAll({ chain: 'r=client-feedback&tab=activity', 'chain/open': 'r=research-summary&tab=history', 'identity/sign': 's=3', 'identity/safe': 's=2', 'chain/links': 'r=initial-concept' }, true);
  assert.deepEqual(m.chain.log.state[0], { view: 'chain', r: 'client-feedback', tab: 'activity' }, 'the address carries the record and the tab');
  assert.deepEqual(m['chain/open'].log.state[0], { view: 'open', r: 'research-summary', tab: 'history' });
  assert.deepEqual(m['identity/sign'].log.state[0], { view: 'idsign', s: 3 });
  assert.deepEqual(m['identity/safe'].log.state[0], { view: 'idsafe', s: 2 });
  assert.deepEqual(m['chain/links'].log.state[0], { view: 'links', r: 'initial-concept' });
  assert.equal(m.chain.page.querySelector('#wc-activity').hidden, false, 'the activity tab is open when the address names it');
  assert.equal(m.chain.page.querySelector('#wc-records').hidden, true);
  const bad = mountAll({ chain: 'r=nope&tab=nope', 'identity/sign': 's=99' }, true);
  assert.deepEqual(bad.chain.log.state[0], { view: 'chain', r: 'project-notes', tab: 'records' }, 'an unknown record and tab fall back to the first');
  assert.deepEqual(bad['identity/sign'].log.state[0], { view: 'idsign', s: 3 }, 'a step out of range is held to the range');
}

/* a tab and a record pick change the address (replacing the entry) and tell the world */
{
  const m = withWorld.chain, tab = m.page.querySelector('#wc-tab-activity');
  tab.click();
  assert.deepEqual(m.log.writes.pop(), ['/chain', 'r=project-notes&tab=activity', 'replace'], 'a tab replaces the entry');
  assert.deepEqual(m.log.select.pop(), { view: 'chain', r: 'project-notes', tab: 'activity' }, 'select() after a tab');
  m.page.querySelector('#wc-tab-records').click(); m.log.writes.length = 0; m.log.select.length = 0;
  const row = m.page.querySelectorAll('#wc-records a')[2]; row.click();
  assert.deepEqual(m.log.writes.pop(), ['/chain', 'r=client-feedback', 'replace'], 'a record pick replaces the entry');
  assert.deepEqual(m.log.select.pop(), { view: 'chain', r: 'client-feedback', tab: 'records' }, 'select() after a record pick');
  assert.equal(m.page.querySelector('#wc-records a[aria-current="true"]').dataset.pick, 'client-feedback', 'the chosen row is marked');
  assert.equal(m.log.navigates.length, 0, 'a choice inside the page does not navigate');
  /* a pick on a 3D tile: the chosen tile opens the record, another tile moves the choice, another view's click is left alone */
  const pick = m.handlers.pick[0];
  assert.equal(pick('home', 1), false, 'a click for another view returns false, so the host keeps its default');
  assert.equal(pick('chain', 3), true); assert.deepEqual(m.log.select.pop(), { view: 'chain', r: 'research-summary', tab: 'records' });
  assert.equal(pick('chain', 2), true); assert.deepEqual(m.log.select.pop(), { view: 'chain', r: 'client-feedback', tab: 'records' });
  assert.equal(pick('chain', 2), true); assert.deepEqual(m.log.navigates.pop(), ['chain/record', 'r=client-feedback'], 'a click on the chosen tile leaves for its record');
  assert.equal(m.handlers.hover[0]({ rec: 1 }), false); m.page.querySelectorAll('#wc-records a')[1].dispatchEvent(new m.w.MouseEvent('mouseover', { bubbles: true }));
  assert.equal(m.log.hover.pop(), 1, 'a row tells the world which tile to lift');
  /* the arrow keys turn the ring */
  m.w.document.dispatchEvent(new m.w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.equal(m.log.select.pop().r, 'research-summary', 'the right arrow goes to the older record');
}
{
  const m = withWorld['chain/record'], pick = m.handlers.pick[0];
  assert.equal(pick('record', 0), true, 'the chosen tile opens the record'); assert.deepEqual(m.log.navigates.pop(), ['chain/open', 'r=project-notes']);
  assert.equal(pick('record', 2), true); assert.deepEqual(m.log.writes.pop(), ['/chain/record', 'r=client-feedback', 'push'], 'another tile is a new entry');
  assert.equal(m.page.querySelector('.wc-timeline a[aria-current="true"]').dataset.pick, 'client-feedback');
  const open = withWorld['chain/open'];
  open.page.querySelector('#wc-tab-signature').click();
  assert.deepEqual(open.log.select.pop(), { view: 'open', r: 'project-notes', tab: 'signature' });
  assert.equal(open.page.querySelector('#wc-panel-signature').hidden, false); assert.equal(open.page.querySelector('#wc-panel-content').hidden, true);
  const links = withWorld['chain/links'];
  links.page.querySelectorAll('.wc-groups a')[0].click();
  assert.deepEqual(links.log.writes.pop(), ['/chain/links', 'r=design-direction', 'replace'], 'a link row moves the choice');
}
{
  const sign = withWorld['identity/sign'];
  sign.page.querySelectorAll('.wi-story a')[1].click();
  assert.deepEqual(sign.log.writes.pop(), ['/identity/sign', 's=2', 'replace'], 'a step replaces the entry');
  assert.deepEqual(sign.log.select.pop(), { view: 'idsign', s: 2 });
  sign.page.querySelector('.wc-foot .cta').click();
  assert.deepEqual(sign.log.select.pop(), { view: 'idsign', s: 3 }, 'Next step moves to the next step');
  assert.equal(sign.page.querySelector('.wc-foot .cta').dataset.sceneLink, 'identity/safe', 'the last step leaves for Security');
  const safe = withWorld['identity/safe'];
  assert.equal(safe.page.querySelectorAll('.wi-rows a').length, 3, 'three safeguards');
  assert.equal(safe.page.querySelectorAll('.wi-rows .state').length, 2, 'two are marked Partial');
}

/* ---------- the strip, the links and the sample marks ---------- */
for (const [key, m] of Object.entries(withWorld)) {
  const strip = m.page.querySelector('.wc-flow');
  assert(strip, key + ' shows where it is in the nine steps');
  assert.equal(strip.querySelectorAll('.fl-segs a').length, 9, key + ' strip has nine steps');
  assert.equal(strip.querySelectorAll('.fl-segs a[aria-current="step"]').length, 1);
  for (const a of m.page.querySelectorAll('a[data-scene-link]')) assert(m.w.ArkUI.pageCatalog[a.dataset.sceneLink], key + ': ' + a.dataset.sceneLink + ' is a real route');
  assert(!m.page.querySelector('a[href^="#"]'), key + ' links through the site router, never a hash');
}
{
  const order = Object.values(ROUTES).map((x) => x[1]);
  const flow = ['identity', 'identity/sign', 'identity/safe', 'identity/you', 'chain', 'chain/record', 'chain/open', 'chain/links'];
  flow.forEach((key, i) => {
    const seg = withWorld[key].page.querySelectorAll('.fl-segs a'), current = [...seg].findIndex((a) => a.getAttribute('aria-current') === 'step');
    assert.equal(current, i, key + ' is step ' + (i + 1));
    assert.equal(seg[8].dataset.sceneLink, 'intro', 'the ninth step is the intro');
  });
  assert.equal(order.length, 8);
  assert(withWorld.chain.page.textContent.includes('Sample'), 'your chain says it is a sample');
  assert(withWorld['identity/you'].page.textContent.includes('Nothing here is live'), 'your identity says it is a sample');
}

/* ---------- dispose removes every listener the page added ---------- */
for (const [key, m] of Object.entries(withWorld)) {
  const registered = m.log.on.length;
  m.page.arkDispose();
  assert.equal(m.log.off, registered, key + ' removes every ArkWorldHost listener on dispose (' + registered + ')');
  const before = m.log.select.length;
  m.w.document.dispatchEvent(new m.w.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
  assert.equal(m.log.select.length, before, key + ' ignores the keys after dispose');
}
{
  const expectedOn = { chain: ['pick', 'hover'], 'chain/record': ['pick'], 'chain/open': ['pick'], 'chain/links': ['pick', 'hover'], identity: [], 'identity/sign': [], 'identity/safe': [], 'identity/you': [] };
  const fresh = mountAll({}, true);
  for (const [key, m] of Object.entries(fresh)) assert.deepEqual(m.log.on.slice().sort(), expectedOn[key].slice().sort(), key + ' listens for ' + (expectedOn[key].join(', ') || 'nothing'));
}

/* ---------- the layout contract in the stylesheets ---------- */
{
  const css = read('css/world-chain.css') + read('css/world-identity.css');
  assert(!/opacity\s*:/.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), 'nothing fades: no opacity in these sheets');
  assert(!/(^|[^-\w])#[0-9a-fA-F]{3,8}\b/.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), 'colours are theme tokens, never a hex');
  assert(!/(^|\})\s*(body|html|\*|:root)\s*[{,]/m.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), 'no global selector: a page sheet styles its own classes');
  assert(/@media \(max-width: 900px\)/.test(css) && /max-height: 760px/.test(css), 'the sheets fit a short screen and a phone');
}
console.log('world-chain: ok');

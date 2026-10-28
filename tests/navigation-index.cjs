const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

/* Named regression (2026-10-19, docs/ux-audit/pages.md P7): the menu's groups were four
   hand-written arrays plus a catch-all that pushed every unlisted page into "Evaluate -- live
   local mesh data, evidence", so the design mocks /treasury and /deposits and the design-system
   /palette were filed as live evidence. Groups are derived from each page's journey
   (js/content/site-pages.js).

   Since 2026-10-25 (owner-confirmed 2026-10-27) the header's every-page journey menu is the "you"
   panel (js/resolvers/header.js, its reduction test above HEADER_YOU_HEAD): you and your state with one
   action, your network as its own layer, then only the critical pages (headerCriticalPages: the page
   where each journey starts, plus the pages the bar itself links), each tagged with its journey. This
   builds the catalog from the real table (plus stub content routes), mounts the real header (decorate,
   then onMount, the way the CMS does; no kit loaded, so the bar's own fallback), and checks:
   - the panel's pages are exactly the derived set, in journey order, each linked once, each tagged with
     its own journey (the regression's guarantee, on the reduced list);
   - every journey but the previews has its way in (its lead page);
   - no mock or design preview is listed, and the mocks are still filed as previews, never evidence;
   - two layers, the first shown: "you" and "Network" (with its Back); a wallet module that cannot load
     hides the Network row and the rest works (the reduction test's item 10).
   Dropped: "every page with a journey is in the menu" and "no layered panels remain". The confirmed panel
   lists only the critical pages, and its network is a layer of its own. */
const sitePagesContext = vm.createContext({});
vm.runInContext(fs.readFileSync('js/content/site-pages.js', 'utf8'), sitePagesContext);
const ArkSitePages = sitePagesContext.ArkSitePages;
const catalog = {};
for (const row of ArkSitePages.pages()) catalog[row.key] = { path: row.path, title: row.label + ' — DEFXN', journey: row.journey, short: row.short, hiddenFromNavigation: !row.journey };
for (const id of ['network', 'agreement', 'authority', 'governance', 'register', 'measured']) catalog['concept/' + id] = { path: '/concept/' + id, title: id, journey: ArkSitePages.journeyOf('concept/' + id) };
for (const id of ['chain', 'substrate', 'validators']) catalog['article/' + id] = { path: '/learnings/' + id, title: id, journey: ArkSitePages.journeyOf('article/' + id) };
for (const id of ['website', 'payments', 'files']) catalog['resolutions/' + id] = { path: '/resolutions/' + id, title: id, journey: ArkSitePages.journeyOf('resolutions/' + id), nestedNavigation: true };
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<body><main><header id="h"><nav id="primary-navigation"></nav></header></main></body>', { runScripts: 'outside-only', url: 'http://localhost/', pretendToBeVisual: true });
const w = dom.window;
let header;
Object.assign(w, {
  ArkSitePages,
  ArkUI: {
    pageCatalog: catalog,
    lifecycleStages: [],
    register: (_name, definition) => { header = definition; },
    loadScript: () => Promise.resolve()
  },
  ArkCopy: { text: (value) => value },
  LearningContent: { find: (id) => ({ title: id }) }
});
w.eval(fs.readFileSync('js/ark/route.js', 'utf8'));
w.eval(fs.readFileSync('js/resolvers/header.js', 'utf8'));

(async () => {
  const el = w.document.getElementById('h');
  header.decorate(el);
  header.onMount(el);
  await new Promise((resolve) => setTimeout(resolve, 50)); // the wallet module's import settles (it cannot load here)
  const menu = w.document.getElementById('primary-navigation');

  /* the derived set, from the table: each journey's lead, and the pages the bar links, in journey order */
  const barPages = w.ArkUI.headerPages;
  const journeys = ArkSitePages.journeys().filter((j) => j.id !== 'preview');
  const expected = Array.from(journeys.flatMap((j) => ArkSitePages.pages().filter((row) => row.journey === j.id && row.key !== 'account' && (row.lead || barPages.includes(row.key))).map((row) => row.key))); // Array.from: the table's arrays are the vm context's realm
  const links = [...menu.querySelectorAll('a.nav-route-link')];
  const keys = links.map((link) => link.dataset.navRoute);
  assert.deepEqual(keys, expected, 'the panel lists exactly the critical pages, in journey order: each journey\'s lead and the bar\'s own pages');
  assert.equal(new Set(keys).size, keys.length, 'each exactly once');
  assert.equal(menu.dataset.pageCount, String(keys.length));
  for (const j of journeys) {
    const lead = ArkSitePages.pages().find((row) => row.journey === j.id && row.lead);
    assert(lead && keys.includes(lead.key), 'the ' + j.title + ' journey has its way in (its lead page)');
  }
  // every link is tagged with its own journey
  for (const link of links) {
    const key = link.dataset.navRoute, journey = ArkSitePages.journeys().find((j) => j.id === catalog[key].journey);
    assert.equal(link.querySelector('.header-you-page-meta').textContent, journey.title, key + ' is filed under its own journey');
    assert.equal(link.getAttribute('href'), catalog[key].path, key + ' links its own page');
  }
  // the regression itself: mocks and the design system are previews, never evidence, and never in the panel
  for (const mock of ['treasury', 'deposits', 'palette']) assert.equal(catalog[mock].journey, 'preview', mock + ' is a preview, not live evidence');
  assert(!keys.some((key) => catalog[key].journey === 'preview'), 'no design preview is listed');
  assert(!keys.includes('account') && !keys.some((key) => ['reference', 'notfound'].includes(key)), 'account is the panel\'s own head, and a page with no journey is not listed');

  // two layers: you (shown), then the network (hidden, with its Back)
  const layers = [...menu.querySelectorAll('.nav-layer')];
  assert.deepEqual(layers.map((l) => [l.dataset.navLayer, l.hidden]), [['you', false], ['network', true]], 'two layers: "you" shown first, "Network" behind it');
  assert(layers[1].querySelector('button.nav-layer-back'), 'the Network layer has a Back control');
  const head = layers[0].querySelector('.header-you-head');
  assert(head && head.querySelector('.header-account-name').textContent === 'Account' && head.querySelector('.header-account-status').textContent === 'Signed out', 'the head says who you are and your state');
  const go = head.querySelectorAll('a.header-you-go');
  assert.equal(go.length, 1, 'the head has one action');
  assert.equal(go[0].dataset.navRoute, 'auth', 'signed out, it leads to sign-in');
  assert.equal(layers[0].querySelector('.header-you-netrow').hidden, true, 'a wallet module that cannot load hides the Network row');
  assert(links.length > 0, 'and the rest still works');
  console.log('PASS: the "you" panel lists the ' + keys.length + ' critical pages once each, in journey order, each under its own journey (derived from js/content/site-pages.js), with no preview listed and no mock filed as evidence.');
})().catch((error) => { console.error(error); process.exit(1); });

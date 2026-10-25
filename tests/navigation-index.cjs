const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

/* Named regression (2026-10-19, docs/ux-audit/pages.md P7): the menu's groups were four
   hand-written arrays plus a catch-all that pushed every unlisted page into "Evaluate -- live
   local mesh data, evidence", so the design mocks /treasury and /deposits and the design-system
   /palette were filed as live evidence. Groups are now derived from each page's journey
   (js/content/site-pages.js). This builds the catalog from the real table (plus stub content
   routes) and checks the menu is exactly that: every page with a journey linked once, under its
   own journey, and no mock under "Prove". */
const sitePagesContext = vm.createContext({});
vm.runInContext(fs.readFileSync('js/content/site-pages.js', 'utf8'), sitePagesContext);
const ArkSitePages = sitePagesContext.ArkSitePages;
const catalog = {};
for (const row of ArkSitePages.pages()) catalog[row.key] = { path: row.path, title: row.label + ' — DEFXN', journey: row.journey, short: row.short, hiddenFromNavigation: !row.journey };
for (const id of ['network', 'agreement', 'authority', 'governance', 'register', 'measured']) catalog['concept/' + id] = { path: '/concept/' + id, title: id, journey: ArkSitePages.journeyOf('concept/' + id) };
for (const id of ['chain', 'substrate', 'validators']) catalog['article/' + id] = { path: '/learnings/' + id, title: id, journey: ArkSitePages.journeyOf('article/' + id) };
for (const id of ['website', 'payments', 'files']) catalog['resolutions/' + id] = { path: '/resolutions/' + id, title: id, journey: ArkSitePages.journeyOf('resolutions/' + id), nestedNavigation: true };
const ids = Object.keys(catalog).filter((key) => catalog[key].journey);
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<body><header><nav id="primary-navigation"></nav></header></body>', { runScripts: 'outside-only', url: 'http://localhost/' });
const w = dom.window;
let header;
Object.assign(w, {
  ArkSitePages,
  ArkUI: {
    pageCatalog: catalog,
    lifecycleStages: [],
    register: (_name, definition) => { header = definition; }
  },
  ArkCopy: { text: (value) => value },
  LearningContent: { find: (id) => ({ title: id }) }
});
w.eval(fs.readFileSync('js/ark/route.js', 'utf8'));
w.eval(fs.readFileSync('js/resolvers/header.js', 'utf8'));

const menu = w.document.getElementById('primary-navigation');
header.onMount({ querySelector: () => menu });
/* The menu is the Resolutions dropdown's layout: rows (one per journey, and the resolutions) of link chips. */
const rows = [...menu.querySelectorAll('.products-mega-row')];
const routeOf = (link) => link.dataset.navRoute;
assert.equal(menu.dataset.pageCount, String(ids.length));
const all = [...menu.querySelectorAll('a.nav-route-link')];
assert.equal(all.length, ids.length, 'every page with a journey is in the menu');
assert.equal(new Set(all.map(routeOf)).size, ids.length, 'and each exactly once');
assert(!all.some((link) => ['reference', 'notfound'].includes(routeOf(link))), 'a page with no journey (the reference reader) is in no group');
const journeys = ArkSitePages.journeys().map((j) => j.id);
// every link sits in its own journey's row (the resolutions' detail pages have a row of their own, filed under Build)
for (const row of rows) for (const link of row.querySelectorAll('a')) {
  const key = routeOf(link), group = row.dataset.group;
  assert.equal(group, key.indexOf('resolutions/') === 0 ? 'resolutions' : catalog[key].journey, key + ' is filed under its own journey');
}
assert(rows.every((row) => journeys.includes(row.dataset.group) || row.dataset.group === 'resolutions'), 'a row is a journey or the resolutions');
// the regression itself: mocks and the design system are previews, never evidence
for (const mock of ['treasury', 'deposits', 'palette']) assert.equal(catalog[mock].journey, 'preview', mock + ' is a preview, not live evidence');
const prove = rows.filter((row) => row.dataset.group === 'prove').flatMap((row) => [...row.querySelectorAll('a')].map(routeOf));
assert(!prove.some((key) => ['treasury', 'deposits', 'palette'].includes(key)), 'no mock is filed under Prove');
assert.equal(menu.querySelectorAll('.nav-layer').length, 0, 'no layered panels remain: one screen');
console.log('PASS: all ' + ids.length + ' pages with a journey are linked once, each under its own journey (derived from js/content/site-pages.js), with no mock filed as evidence.');

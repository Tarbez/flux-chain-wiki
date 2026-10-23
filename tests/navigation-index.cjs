const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Element {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.className = '';
    this.listeners = {};
    this.classList = {
      add: (...names) => { this.className += ' ' + names.join(' '); },
      remove: (...names) => { this.className = this.className.split(' ').filter((name) => !names.includes(name)).join(' '); }
    };
  }
  appendChild(child) { this.children.push(child); return child; }
  replaceChildren(...children) { this.children = children; }
  setAttribute(name, value) { this.attributes[name] = value; }
  getAttribute(name) { return this.attributes[name]; }
  addEventListener(name, listener) { this.listeners[name] = listener; }
  focus() { this.focused = true; }
  querySelector(selector) {
    const all = this.children.flatMap((child) => [child, ...child.descendants()]);
    if (selector === 'a') return all.find((child) => child.tagName === 'A');
    const target = selector.match(/^\[data-nav-target="([^"]+)"\]$/);
    return target ? all.find((child) => child.dataset.navTarget === target[1]) : null;
  }
  descendants() { return this.children.flatMap((child) => [child, ...child.descendants()]); }
  querySelectorAll(selector) {
    return this.descendants().filter((child) => selector === 'a' ? child.tagName === 'A' : false);
  }
}

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
let header;
let clockId = 0;
const timers = new Map();
function nextAnimationPhase() {
  const [id, callback] = timers.entries().next().value;
  timers.delete(id);
  callback();
}
const headerSandbox = {
  location: { protocol:'http:',pathname:'/',search:'',hash:'' },
  Tokens: { u: () => '1px' },
  ArkSitePages,
  ArkUI: {
    pageCatalog: catalog,
    lifecycleStages: ['intent', 'offer', 'agreement', 'fulfillment', 'receipt'].map((id) => ({ id, title: id })),
    register: (_name, definition) => { header = definition; }
  },
  ArkCopy: { text: (value) => value },
  LearningContent: { find: (id) => ({ title: id }) },
  document: { createElement: (tag) => new Element(tag) },
  window: {
    matchMedia: () => ({ matches: false }),
    setTimeout: (fn) => { const id = ++clockId; timers.set(id, fn); return id; },
    clearTimeout: (id) => { timers.delete(id); }
  }
};
vm.runInNewContext(fs.readFileSync('js/ark/route.js', 'utf8'), headerSandbox);
vm.runInNewContext(fs.readFileSync('js/resolvers/header.js', 'utf8'), headerSandbox);

const menu = new Element('nav');
const legacy = new Element('a');legacy.setAttribute('href', '#/what-is-a-resolver');legacy.href='#/what-is-a-resolver';menu.appendChild(legacy);
const host = { querySelector: () => menu };
header.onMount(host);
const layers = menu.children;
const layer = (name) => layers.find((item) => item.dataset.navLayer === name);
const linksIn = (name) => layer(name).querySelectorAll('a');
const routeOf = (link) => link.dataset.navRoute;
assert.equal(menu.dataset.pageCount, String(ids.length));
const all = menu.querySelectorAll('a');
assert.equal(all.length, ids.length, 'every page with a journey is in the menu');
assert.equal(new Set(all.map(routeOf)).size, ids.length, 'and each exactly once');
assert(!all.some((link) => ['reference', 'notfound'].includes(routeOf(link))), 'a page with no journey (the reference reader) is in no group');
assert(layers.every(item => item.dataset.navLayer), 'no legacy links remain behind the navigation layers');
assert(linksIn('build').includes(legacy), 'legacy hash links are reused inside their destination group');
assert.equal(legacy.href, '/what-is-a-resolver', 'reused links adopt the active clean-path routing mode');
const journeys = ArkSitePages.journeys().map((j) => j.id);
for (const name of journeys) assert.equal(layer(name).hidden, true, name + ' starts hidden');
assert.equal(layer('index').hidden, false);
// every link sits under its own page's journey (a sub-layer belongs to the journey of its parent)
const journeyOfLayer = (name) => journeys.includes(name) ? name : name === 'index' || !linksIn(name).length ? null : catalog[routeOf(linksIn(name)[0])].journey;
for (const item of layers.filter((l) => l.dataset.navLayer !== 'index')) for (const link of item.querySelectorAll('a'))
  assert.equal(catalog[routeOf(link)].journey, journeyOfLayer(item.dataset.navLayer), routeOf(link) + ' is filed under its own journey');
// the regression itself: mocks and the design system are previews, never evidence
for (const mock of ['treasury', 'deposits', 'palette']) assert.equal(catalog[mock].journey, 'preview', mock + ' is a preview, not live evidence');
const prove = layers.filter((l) => journeyOfLayer(l.dataset.navLayer) === 'prove').flatMap((l) => l.querySelectorAll('a').map(routeOf));
assert(!prove.some((key) => ['treasury', 'deposits', 'palette'].includes(key)), 'no mock is filed under Prove');
// children: a page under another listed page's path is grouped with it
const stages = layers.find((l) => l.dataset.navLayer === 'sub-lifecycle');
assert(stages, 'the lifecycle and its five stages get their own layer');
assert.equal(stages.querySelectorAll('a').length, 6, 'overview and all five stages remain reachable');
assert.equal(layer('sub-learnings').querySelectorAll('a').length, 4, 'the notes index and every article sit in one reading level');
layer('index').querySelector('[data-nav-target="understand"]').listeners.click();
assert.equal(menu.navLayers.current(), 'understand');
assert.equal(layer('index').hidden, false, 'first layer stays until its exit finishes');
assert.equal(layer('understand').hidden, true, 'second layer does not enter early');
nextAnimationPhase();
assert.equal(layer('index').hidden, true);
assert.equal(layer('understand').hidden, false);
nextAnimationPhase();
menu.navLayers.back();
nextAnimationPhase();
nextAnimationPhase();
assert.equal(menu.navLayers.current(), 'index');
menu.navLayers.reset();
assert.equal(menu.navLayers.current(), 'index');
assert.equal(layer('index').hidden, false);
layer('index').querySelector('[data-nav-target="prove"]').listeners.click();
assert.equal(timers.size, 1);
menu.navLayers.reset();
assert.equal(timers.size, 0, 'closing during an exit cancels the transition');
assert.equal(layer('prove').hidden, true);
console.log('PASS: all ' + ids.length + ' pages with a journey are linked once, each under its own journey (derived from js/content/site-pages.js), with no mock filed as evidence.');

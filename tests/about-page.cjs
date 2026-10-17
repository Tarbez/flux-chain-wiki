/* /about is built from the home page's own parts and kept short on purpose.

   Named regressions (2026-10-14): the page had grown to eight stacked sections and about 50
   pieces of copy (a promise banner, four "no" cards, three pillars, a forty-link resolution
   index, a three-step flow, a boundary strip and two disclosures), each with its own look, so
   it read as a different site from the home page and as an information dump. It is now five
   sections, the three layers are drawn instead of hidden behind a disclosure, and the
   resolution index is five counted tiles. This test holds the budget and the shared parts. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Element {
  constructor(tag) { this.tagName = tag; this.className = ''; this.children = []; this.dataset = {}; this.attrs = {}; this.listeners = {}; this._text = ''; this.classList = { add: (c) => { this.className = (this.className + ' ' + c).trim(); }, contains: (c) => this.className.split(' ').includes(c) }; }
  appendChild(child) { this.children.push(child); return child; }
  insertBefore(child) { this.children.unshift(child); return child; }
  replaceChildren(...children) { this.children = children; this._text = ''; }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'class') this.className = String(v); }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(k, fn) { this.listeners[k] = fn; }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(' '); }
  get childNodes() { return this.children; }
  all() { return [this, ...this.children.flatMap((c) => c.all())]; }
  byClass(name) { return this.all().filter((e) => String(e.className).split(' ').includes(name)); }
}
const context = { console, document: { write() {}, createElement: (t) => new Element(t), createElementNS: (_n, t) => new Element(t) } };
context.window = context;
vm.createContext(context);
for (const file of ['js/content/manifest.js', 'js/content/manifests/nav.js', 'js/content/manifests/about.js', 'js/content/manifests/resolutions.js', 'js/content/resolutions.js'])
  vm.runInContext(fs.readFileSync(file, 'utf8'), context);
vm.runInContext(`var ArkUI = { pageModules: {}, pageCatalog: {}, route: { href: function (p) { return '#' + p; } },
  el: function (tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; } };`, context);
for (const route of ['zero', 'resolutions', 'deployment', 'resolver', 'concept', 'explorer', 'download', 'reference']) vm.runInContext(`ArkUI.pageCatalog['${route}'] = { path: '/${route}' };`, context);
// about.js resolves its 'link'-kind fields through js/ark/dash-kit.js's resolveLinkField/linkEl.
vm.runInContext(fs.readFileSync('js/ark/dash-kit.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/pages/about.js', 'utf8'), context);

const page = context.ArkUI.pageModules.about.mount(new Element('main'));
// Law 18 ("one scroll, then it ends") collapsed the four content sections
// (promise, flow, resolve, pillars) behind the hero's one "02 / More"
// disclosure; they remain real nested sections, just not top-level ones.
const sections = page.children.filter((c) => /hl-(hero|section)/.test(c.className));
assert.equal(sections.length, 2, 'two top-level sections: hero (layers drawn) and More (the closing block is not a section)');
const morePartTitles = page.byClass('about-more-part');
assert.equal(morePartTitles.length, 4, 'the four collapsed sections (promise, flow, resolve, pillars) survive inside the disclosure');
assert(page.classList.contains('home-launch'), 'the page root is the home page\'s own container, so it inherits the home layout, type and colour');
for (const part of ['hl-hero', 'hl-title', 'hl-intro', 'hl-button', 'hl-section-head', 'hl-principles', 'hl-closing']) assert(page.byClass(part).length > 0, `uses the shared ${part}`);
assert(!page.all().some((e) => /about-(promise|pillar-grid|resolve-grid|flow-steps|map)\b/.test(e.className)), 'none of the old one-off layouts remain');

// The three layers are visible, not behind a disclosure.
assert.equal(page.byClass('about-slab').length, 3, 'three slabs drawn');
assert.equal(page.byClass('hl-case').length, 3, 'one button per layer');
assert(!page.all().some((e) => e.tagName === 'details' && /about-context/.test(e.className)), 'the layer model is not hidden behind a disclosure');
const tabs = page.byClass('hl-case');
tabs[2].listeners.click();
assert.equal(tabs[2].attrs['aria-pressed'], 'true');
assert.equal(page.byClass('about-layers-figure')[0].attrs['data-selected'], '2', 'choosing a layer lights its slab');
assert(page.byClass('about-layer-detail')[0].textContent.includes('Governance'), 'and shows its text');

// Colour is data: exactly one accent record, on the FXN chain layer.
assert.equal(page.byClass('about-slab-record-new').length, 1, 'one accent record in the whole figure');

// Information budget. The hero is the only always-visible section (Law 18,
// "one scroll, then it ends"), so IT stays tight; the four collapsed
// sections add real words but they are not visible clutter, so the total
// gets a looser cap that still catches a whole new section creeping in.
const heroWords = (page.byClass('about-hero')[0].textContent.match(/\S+/g) || []).length;
assert(heroWords <= 150, `the always-visible hero stays under 150 words (it has ${heroWords})`);
const words = (page.textContent.match(/\S+/g) || []).length;
assert(words <= 550, `the page (hero + one disclosure) stays under 550 words (it has ${words}); more means a section has crept back`);
assert.equal(page.byClass('about-group').length, 5, 'resolutions are five counted tiles, not a link per resolution');
assert(page.all().filter((e) => e.tagName === 'a').length <= 22, 'a short page has a short list of links');
assert.equal(page.all().filter((e) => e.tagName === 'details').length, 2, 'two disclosures: the collapsed "More" content and the evidence one');

// Every route link resolves.
for (const a of page.all().filter((e) => e.tagName === 'a' && e.dataset.sceneLink)) assert(context.ArkUI.pageCatalog[a.dataset.sceneLink], `${a.dataset.sceneLink} is a real route`);

// The panel is full-bleed (no dashboard card) for this page.
const panel = fs.readFileSync('js/ark/panel-continuity.js', 'utf8');
assert(/panelPage === 'about'\) return \{ left:0/.test(panel), 'about opens full-bleed, like home and chain');
assert(/continuity-host\[data-panel-page="about"\][^}]*border:0/.test(fs.readFileSync('css/about.css', 'utf8')), 'and without the card border');

console.log(`PASS: /about — hero plus one collapsed "More" section (four shared-part sections inside), three layers drawn and selectable, one accent, ${words} words, five resolution tiles, two disclosures.`);

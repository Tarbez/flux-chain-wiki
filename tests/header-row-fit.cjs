'use strict';
/* The desktop header keeps one row by moving its lowest-priority links into the MENU.

   Why this exists: above the 1040px compact breakpoint every core link stayed in the row and
   shrank, so at 1280px "How it works", "Mesh Explorer" and "Run DEFXN" wrapped onto two lines
   and Account read "Acc..." (tests/browser/public-header.mjs measures that in Chromium at
   1024-1920px). js/resolvers/header.js now measures the row and collapses links in
   HEADER_COLLAPSE_ORDER until it fits. Two things only a reading of the code would miss, each
   pinned here:
   - Account is never collapsed (it carries the visitor's own state) and the order is fixed:
     Stats first, Run DEFXN last.
   - when the collapsed set changes, the header announces it ('ark-header-refit'): the move
     happens a frame after whatever changed the row, and the editor's selection outline
     (js/main.js) was left 88px off the selected link without it (studio-flows statesui).
   The geometry is faked (plain objects with widths): the browser driver covers real layout. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const src = fs.readFileSync('js/resolvers/header.js', 'utf8');
const start = src.indexOf('var HEADER_COLLAPSE_ORDER');
const end = src.indexOf("ArkUI.register('RHEADER_V1'");
assert(start >= 0 && end > start, 'js/resolvers/header.js still defines the row fit before RHEADER_V1');
const main = fs.readFileSync('js/main.js', 'utf8');
assert(/addEventListener\('ark-header-refit', function \(\) \{[\s\S]{0,200}placeCmsLayoutUi\(\); emitCmsLayoutSelection\(\);/.test(main), 'the editor preview re-places its outline and re-reports the selection when the header re-fits');

/* a row: header 1280 wide with 40px padding each side and a 12px gap; identity 148, the link
   bar's width is the sum of its shown items + 8px gaps, then network 101 and MENU 80 */
function makeRow(widths, headerWidth) {
  const events = [];
  const item = (key, width) => ({ key, width, classes: new Set(), dataset: { headerItem: key },
    classList: { add(c) { this.owner.classes.add(c); }, remove(c) { this.owner.classes.delete(c); }, contains(c) { return this.owner.classes.has(c); } } });
  const items = Object.entries(widths).map(([key, width]) => { const it = item(key, width); it.classList.owner = it; return it; });
  const shown = () => items.filter((it) => !it.classes.has('header-collapsed'));
  const bar = { style: { display: 'flex', position: 'static' }, width: () => shown().reduce((s, it) => s + it.width, 0) + 8 * Math.max(0, shown().length - 1) };
  const fixed = (w) => ({ style: { display: 'flex', position: 'static' }, width: () => w });
  const children = [fixed(148), bar, fixed(101), fixed(80), { style: { display: 'none', position: 'absolute' }, width: () => 620 }];
  const header = {
    isConnected: true, children,
    getBoundingClientRect: () => ({ width: headerWidth }),
    querySelector: (sel) => { const m = /data-header-item="([^"]+)"/.exec(sel); return m ? items.find((it) => it.key === m[1]) || null : null; },
    dispatchEvent: (event) => { events.push(event.type); return true; },
  };
  return { header, items, events, collapsed: () => ['stats', 'deployment', 'about', 'explorer', 'resolutions', 'download', 'account'].filter((key) => items.some((it) => it.key === key && it.classes.has('header-collapsed'))) };
}
function load(row) {
  let observed = null;
  const context = vm.createContext({
    getComputedStyle: (el) => (el === row.header ? { columnGap: '12px', paddingLeft: '40px', paddingRight: '40px' } : { display: el.style.display, position: el.style.position }),
    ResizeObserver: class { constructor(cb) { observed = cb; } observe() {} },
    requestAnimationFrame: (fn) => { fn(); return 1; },
    CustomEvent: class { constructor(type) { this.type = type; } },
    document: {},
    ArkUI: {},   /* the slice publishes ArkUI.headerPages (since 2026-10-22); a page always has ArkUI */
  });
  for (const child of row.header.children) child.getBoundingClientRect = () => ({ width: child.width() });
  vm.runInContext(src.slice(start, end), context);
  vm.runInContext('fitHeaderRow', context)(row.header);
  return () => observed([]);
}
const LINKS = { resolutions: 135, about: 104, deployment: 124, explorer: 133, stats: 80, account: 163, download: 116 };

{
  /* 1280: links 855 + 6*8 = 903; 148+903+101+80 + 3*12 = 1268 > 1200 room: Stats goes */
  const row = makeRow(LINKS, 1280), fit = load(row);
  fit();
  assert.deepEqual(row.collapsed(), ['stats'], 'at 1280 only the lowest-priority link leaves the row');
  assert.deepEqual(row.events, ['ark-header-refit'], 'the change is announced');
  fit();
  assert.deepEqual(row.events, ['ark-header-refit'], 'an unchanged fit announces nothing');
}
{
  const row = makeRow(LINKS, 1024), fit = load(row);
  fit();
  assert.deepEqual(row.collapsed(), ['stats', 'deployment', 'about'], 'narrower: links leave in priority order, lowest first');
  assert(!row.collapsed().includes('account'), 'Account never leaves the row');
}
{
  const row = makeRow(LINKS, 1920), fit = load(row);
  fit();
  assert.deepEqual(row.collapsed(), [], 'wide enough: every link stays');
  assert.deepEqual(row.events, [], 'nothing changed, nothing announced');
}
{
  const row = makeRow(LINKS, 0), fit = load(row);
  fit();
  assert.deepEqual(row.collapsed(), [], 'not laid out (server render): nothing is collapsed');
}
{
  /* everything collapsible gone and still too wide: Account stays, the loop ends */
  const row = makeRow(LINKS, 500), fit = load(row);
  fit();
  assert.deepEqual(row.collapsed(), ['stats', 'deployment', 'about', 'explorer', 'resolutions', 'download']);
}
console.log('PASS: the header row collapses Stats, How it works, Overview, Mesh Explorer, Resolutions, Run DEFXN in that order until it fits, never Account, and announces each change.');

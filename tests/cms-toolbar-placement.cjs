'use strict';
/* Regression: the contextual toolbar covered the very element it was editing. As an accordion
   stack its height (up to 580px, counter-scaled to ~805 stage px at the usual 72% zoom) rarely
   fit above or below a selection on a 1280 x 921 stage, and the old last resort was
   `top: r.y + 2` -- right on top of the element. Seen in Chromium (tests/browser/
   studio-flows.mjs, component-02 screenshot): editing a component instance's heading, the
   preview updated underneath the toolbar where nobody could see it. Now: above, else below,
   else beside the selection; only when no side has room does it take the half of the stage
   away from it.
   Repointed 2026-10-18 for the icon bar (owner: "a horizontal bar with icons and those become
   popovers"): a ~330 x 36 bar, so above/below nearly always fit -- and above it must also clear
   the preview's own size/drag label (.ark-studio-label, drawn 24px above the selection by
   js/main.js), which a first draft of the bar parked itself on. The tall case stays covered
   (a bar wrapped on a narrow stage, or a selection that fills the stage). The side the bar
   took is recorded for its popover and tooltips, and the open popover is re-placed with it.
   Runs the real placeSelToolbar() from js/admin/admin.js. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const admin = require('./lib/admin-source.cjs').ADMIN;
const start = admin.indexOf('  function placeSelToolbar() {');
const end = admin.indexOf('  new ResizeObserver', start);
assert(start >= 0 && end > start, 'js/admin/admin.js still defines placeSelToolbar');
const code = admin.slice(start, end);

const SCALE = 0.72, STAGE = { offsetWidth: 1280, offsetHeight: 921 }, LABEL = 24;
function place(rect, size) {
  const box = { hidden: false, style: {}, dataset: {}, offsetWidth: size.w, offsetHeight: size.h, querySelector: () => null, classList: { toggle() {} } };
  let popPlaced = 0;
  const context = { $: () => box, scale: SCALE, stage: STAGE, state: { cmsExactSelection: { rect } } /* js/admin/state.js */, rectOfSelectionRect: (r) => ({ x: r.x, y: r.y, w: r.width, h: r.height }), placeToolbarPop: () => { popPlaced += 1; } };
  vm.createContext(context);
  vm.runInContext(code + '\nplaceSelToolbar();', context);
  return { x: parseFloat(box.style.left), y: parseFloat(box.style.top), w: size.w / SCALE, h: size.h / SCALE, side: box.dataset.side, maxWidth: parseFloat(box.style.maxWidth), popPlaced };
}
const overlaps = (a, r) => Math.min(a.x + a.w, r.x + r.width) > Math.max(a.x, r.x) && Math.min(a.y + a.h, r.y + r.height) > Math.max(a.y, r.y);
const inside = (a) => a.x >= 0 && a.y >= 0 && a.x + a.w <= STAGE.offsetWidth + 0.5 && a.y + a.h <= STAGE.offsetHeight + 0.5;

const BAR = { w: 330, h: 36 }, TALL = { w: 300, h: 580 };
const cases = {
  'a component instance mid-page (the screenshot case)': { x: 96, y: 360, width: 720, height: 46 },
  'a nav link at the top': { x: 355, y: 20, width: 140, height: 40 },
  'an element near the right edge': { x: 1000, y: 400, width: 220, height: 80 },
  'an element near the bottom left': { x: 40, y: 820, width: 300, height: 60 },
};
for (const [size, label] of [[BAR, 'bar'], [TALL, 'tall (wrapped/narrow)']]) {
  for (const [name, rect] of Object.entries(cases)) {
    const at = place(rect, size);
    assert(!overlaps(at, rect), `${label}, ${name}: the toolbar does not cover the selection (at ${JSON.stringify(at)})`);
    assert(inside(at), `${label}, ${name}: the toolbar stays on the stage`);
    assert.equal(at.popPlaced, 1, `${label}, ${name}: the open popover is re-placed with the bar`);
    assert.equal(at.side, at.y + at.h <= rect.y ? 'above' : 'below', `${label}, ${name}: records which side it took`);
  }
}
/* the bar goes above whenever there is room, clear of the preview's own drag label */
for (const rect of [{ x: 300, y: 600, width: 200, height: 50 }, cases['a component instance mid-page (the screenshot case)']]) {
  const at = place(rect, BAR);
  assert.equal(at.side, 'above', 'with room above, the bar sits above the selection');
  assert(at.y + at.h <= rect.y - LABEL, `above, the bar clears the ${LABEL}px drag label the preview draws over the selection (bar bottom ${at.y + at.h}, selection top ${rect.y})`);
}
/* at the top of the page there is no room above: below, still clear */
{
  const at = place(cases['a nav link at the top'], BAR);
  assert.equal(at.side, 'below', 'a selection at the very top gets the bar below it');
}
/* never wider than the stage as drawn on screen: the bar wraps instead */
{
  const at = place(cases['a nav link at the top'], BAR);
  assert.equal(at.maxWidth, STAGE.offsetWidth * SCALE - 8, 'the bar\'s max width is the stage\'s on-screen width');
}
console.log('PASS: the toolbar bar sits above, below or beside the selection -- clear of it and of its drag label.');

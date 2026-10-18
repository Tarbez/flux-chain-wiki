'use strict';
/* The Design check measures only the active route's own content, as the visitor is given it.

   Why this test exists: on an unchanged home page the score moved between runs (9/13, 6/13,
   7/13, 8/13) and the check reported "2 H1s compete for attention". The second H1 was
   #fallback -- the no-JavaScript copy of the page that js/main.js keeps for screen readers,
   marks aria-hidden and css/fallback.css clips to 1px -- and runs that landed mid-entrance
   measured text still fading in. checkMeasurable() (js/admin/admin.js) is the filter every
   rule's element list goes through; this runs the REAL function against the page shapes that
   fooled it. (The settling half -- route ready, fonts loaded, finite animations done -- needs a
   real browser: tests/browser/design-check-stable.mjs runs the check repeatedly on one page
   and requires identical readings.) jsdom has no layout, so each element's box is given by
   data-w/data-h (absent: a 100x20 box) and data-nobox means "no box at all" (display:none). */
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const { functionSource } = require('./lib/admin-source.cjs');

const dom = new JSDOM(`<!doctype html><body>
  <div id="scene">
    <main data-ark-page="zero"><h1 id="real">Not one chain.</h1><div style="height:0;overflow:visible" data-h="0"><p id="spill">Text spilling out of a zero-height wrapper is still painted.</p></div></main>
    <main data-ark-page="about" hidden data-nobox><h1 id="otherRoute">About</h1></main>
    <main data-ark-page="leaving" inert aria-hidden="true"><h1 id="outgoing">Leaving</h1></main>
  </div>
  <section id="fallback" aria-hidden="true" style="overflow:hidden" data-w="1" data-h="1"><h1 id="fallbackH1">Not one chain. A world of them.</h1></section>
  <div class="sr-only" style="overflow:hidden" data-w="1" data-h="1"><h2 id="srOnly">Visually hidden</h2></div>
  <p id="invisible" style="visibility:hidden">Laid out, never painted.</p>
  <div data-ark-studio-ui><span id="studio">Editor chrome drawn inside the preview</span></div>
</body>`);
const win = dom.window;
win.Element.prototype.getClientRects = function () { return this.closest('[data-nobox]') ? [] : [this.getBoundingClientRect()]; };
win.Element.prototype.getBoundingClientRect = function () {
  const w = this.hasAttribute('data-w') ? Number(this.dataset.w) : 100, h = this.hasAttribute('data-h') ? Number(this.dataset.h) : 20;
  return { x: 0, y: 0, top: 0, left: 0, width: w, height: h, right: w, bottom: h };
};
const context = vm.createContext({ window: win });
vm.runInContext(functionSource('checkMeasurable') + '\nthis.checkMeasurable = checkMeasurable;', context);
const measurable = (id) => context.checkMeasurable(win.document.getElementById(id));

assert.equal(measurable('real'), true, 'the active route\'s H1 is measured');
assert.equal(measurable('spill'), true, 'a zero-height wrapper that does not clip hides nothing');
assert.equal(measurable('fallbackH1'), false, 'the no-JS fallback (aria-hidden, clipped to 1px) is not a second H1');
assert.equal(measurable('srOnly'), false, 'any visually-hidden copy (a 1px box clipping its content) is left out the same way -- by shape, not by id');
assert.equal(measurable('otherRoute'), false, 'another route the router keeps mounted but hidden is not this page');
assert.equal(measurable('outgoing'), false, 'the route leaving mid-transition (inert, aria-hidden) is not this page');
assert.equal(measurable('invisible'), false, 'visibility:hidden is not painted');
assert.equal(measurable('studio'), false, 'the editor\'s own chrome inside the preview is not the page');
const detached = win.document.createElement('h1');
assert.equal(context.checkMeasurable(detached), false, 'an element no longer in the document is not measured');
assert.equal(context.checkMeasurable(null), false);

/* every rule's element list goes through it: no rule keeps its own looser filter */
const run = functionSource('runChecks');
assert(/const rendered = checkMeasurable;/.test(run), 'runChecks() measures through checkMeasurable()');
assert(!/getClientRects\(\)\.length/.test(run), 'no rule inside runChecks() falls back to "has a box" as its own visibility test');
console.log('PASS: the Design check counts only the active route\'s visible content -- not the no-JS fallback, other routes, an outgoing route or the editor\'s chrome.');

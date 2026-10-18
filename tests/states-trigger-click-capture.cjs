'use strict';
/* Regression: a state trigger that is a LINK navigated away instead of changing state --
   on the real public site, not only in the editor. The owner's own worked example is three
   nav links made into states; clicking the trigger link took the visitor to that link's
   page. Found in Chromium (tests/browser/studio-flows.mjs): the states click listener in
   js/main.js was a bubble-phase listener on `document` with only preventDefault(), so it
   ran AFTER every handler inside the page -- the scene's own link handler
   (js/hero-motion.js, `[data-scene-link]` -> navigate()) had already started the
   navigation. It is now a capture-phase listener that stops propagation once a trigger
   matches. Because capture on `document` is no longer shielded by the editor's own capture
   listener (stopPropagation does not stop other listeners on the same node), edit mode is
   gated explicitly -- the second case below.
   Real DOM event propagation (jsdom), the real ArkStates module, and the listener extracted
   verbatim from js/main.js. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const main = fs.readFileSync('js/main.js', 'utf8');
const marker = "  document.addEventListener('click', function (event) {\n    if (!window.ArkStates) return;";
const start = main.indexOf(marker);
assert(start >= 0, 'js/main.js still has the states click listener');
const end = main.indexOf('  }, true);', start);
assert(end > start, 'the states click listener is a capture-phase listener (ends with `}, true);`)');
const listener = main.slice(start, end + '  }, true);'.length);
/* a click moves what the group SHOWS, never the saved default (tests/cms-states-preview-default.cjs):
   the showing helpers and cmsShowState, extracted verbatim as well */
const cut = (from, to) => { const a = main.indexOf(from), b = main.indexOf(to, a + 1); assert(a >= 0 && b > a, 'js/main.js still has ' + from.trim()); return main.slice(a, b); };
const showing = cut('  var cmsStatesShowing = {};', '  /* Canvas-only mode (Part G') + cut('  function cmsShowState(', '  /* Layered-state edits from Studio');

function page({ previewEdit }) {
  const dom = new JSDOM('<body><div id="host"><header><nav data-ark-layout-key="k-nav"><a href="/how" data-scene-link="how" data-ark-layout-key="k-how">How it works</a></nav></header></div></body>');
  const doc = dom.window.document, host = doc.getElementById('host'), link = doc.querySelector('a');
  const navigations = [];
  /* the scene's own link handler, as js/hero-motion.js registers it: on an element INSIDE the page */
  host.addEventListener('click', (event) => { const t = event.target.closest('[data-scene-link]'); if (t) { event.preventDefault(); navigations.push(t.dataset.sceneLink); } });
  const context = { document: doc, host, cmsRoutePath: () => '/', cmsComponentsDraft: {}, cmsPreviewQuery: previewEdit, cmsPreviewEdit: previewEdit };
  context.window = { parent: {} };     /* inside the editor the page is an iframe: parent !== window */
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/content/states.js', 'utf8'), context);
  context.window.ArkStates = context.ArkStates;
  let draft = context.ArkStates.createStateGroup({}, '/', 'st1', ['k-nav'], 'k-how');
  draft = context.ArkStates.addState(draft, '/', 'st1', 'State 1');
  context.cmsStatesDraft = context.ArkStates.define(draft);
  context.ArkStates.renderAll(host, '/', context.cmsStatesDraft, {});
  vm.runInContext(showing + listener, context);
  const click = (el) => el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  return { context, host, link, navigations, click, current: () => vm.runInContext("cmsStatesView('/')", context).routes['/'].st1.current, savedDefault: () => context.cmsStatesDraft.routes['/'].st1.current };
}

{
  const p = page({ previewEdit: false });
  p.click(p.link);
  assert.deepEqual(p.navigations, [], 'clicking the trigger link did NOT navigate (it used to: the page\'s link handler ran first)');
  assert.equal(p.current(), 1, 'clicking the trigger link moved the group to state 1');
  assert.equal(p.savedDefault(), 0, 'and left the saved default alone: a visitor click is not an edit');
  const anchor = p.host.querySelector('[data-ark-state-anchor]');
  assert(anchor && anchor.style.display === '', 'state 1 is showing');
  assert.equal(p.host.querySelector('nav').style.display, 'none', 'state 0 is hidden');
  console.log('PASS: a link used as a state trigger changes the state and does not navigate.');
}
{
  const p = page({ previewEdit: false });
  p.click(p.host.querySelector('header'));
  assert.equal(p.current(), 0, 'a click that matches no trigger changes nothing');
  console.log('PASS: clicks elsewhere are left alone.');
}
{
  const p = page({ previewEdit: true });
  p.click(p.link);
  assert.equal(p.current(), 0, 'in the editor\'s Edit mode a click selects; it never advances a state');
  console.log('PASS: Edit mode in the editor never advances a state on click.');
}

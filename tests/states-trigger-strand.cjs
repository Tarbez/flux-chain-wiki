'use strict';
/* Regression: an explicit trigger INSIDE state 0 stranded the group on state 1 forever.
   The owner's worked example: make a container into states, then pick ONE button inside it
   with "Use this element as trigger". Clicking that button showed state 1 -- and hid state
   0, button included, so nothing clickable was left: ArkStates.triggerTargets() returned
   only the (now display:none) button. In the editor's Live mode and on the public page the
   visitor could never move on or get back. Found by clicking it in Chromium
   (tests/browser/studio-flows.mjs, flows "states" and "single").
   Now, while the explicit trigger is hidden with state 0, the showing state's own content is
   also a target (the 'self' rule). A trigger OUTSIDE state 0 is unaffected: it stays the one
   and only target. Real ArkStates against a real DOM (jsdom). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

function setup(triggerKey) {
  const dom = new JSDOM('<body><div id="host"><div data-ark-layout-key="k-card"><button data-ark-layout-key="k-next">Next</button></div><button data-ark-layout-key="k-outside">Outside</button></div></body>');
  const context = { document: dom.window.document };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/content/states.js', 'utf8'), context);
  const S = context.ArkStates, host = dom.window.document.getElementById('host');
  let draft = S.createStateGroup({}, '/', 'st1', ['k-card'], triggerKey);
  draft = S.addState(draft, '/', 'st1', 'State 1');
  /* give state 1 something to click, as the editor's "+ Add state" now always does */
  const content = () => { const a = host.querySelector('[data-ark-state-anchor]'); if (a && !a.firstChild) a.appendChild(dom.window.document.createElement('h2')).textContent = 'State 1'; return a && a.firstChild; };
  const click = (target) => { const id = S.findTriggerMatch(host, '/', draft, target); if (id) { draft = S.advance(draft, '/', id); S.render(host, '/', id, draft, {}); content(); } return id; };
  S.render(host, '/', 'st1', draft, {});
  return { S, host, click, content, current: () => draft.routes['/'].st1.current, el: (key) => host.querySelector('[data-ark-layout-key="' + key + '"]') };
}

{
  const t = setup('k-next');
  assert.equal(t.click(t.el('k-next')), 'st1', 'the nested button is the trigger at state 0');
  assert.equal(t.current(), 1);
  assert.equal(t.el('k-card').style.display, 'none', 'state 0 (and the trigger inside it) is hidden at state 1');
  assert.equal(t.click(t.content()), 'st1', 'at state 1 the showing content is clickable -- the group is not stranded (it used to be: no target was visible)');
  assert.equal(t.current(), 0, 'and it wraps back to state 0');
  assert.equal(t.click(t.el('k-card')), null, 'back at state 0 only the chosen button is the trigger, not the whole card');
  console.log('PASS: a trigger hidden with state 0 hands over to the showing state, so the group never strands.');
}
{
  const t = setup('k-outside');
  t.click(t.el('k-outside'));
  assert.equal(t.current(), 1);
  assert.equal(t.click(t.content()), null, 'a trigger that stays visible remains the only target -- clicking state 1\'s content does nothing');
  assert.equal(t.click(t.el('k-outside')), 'st1', 'the outside trigger keeps cycling');
  assert.equal(t.current(), 0);
  console.log('PASS: a trigger outside state 0 keeps its exact old behavior.');
}

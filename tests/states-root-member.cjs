'use strict';
/* Regression (reported from another agent's run, 2026-10-18): a state group whose state-0
   member is the persistent scene itself (#scene -- the root js/main.js renders every state
   group under, keyed 'id:scene' by ArkLayout.annotate) was never hidden on the public page.
   js/content/states.js resolved member keys with querySelectorAll() BELOW the root, which
   never returns the root; and the state's anchor, placed after that member, lands OUTSIDE
   the root, so a root-only anchor lookup missed it and every render made another one.
   Real ArkStates in jsdom. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<body><main><div id="scene" data-ark-layout-key="id:scene"><p data-ark-layout-key="k-p">page</p></div></main></body>');
const doc = dom.window.document, host = doc.getElementById('scene');
const context = vm.createContext({ document: doc });
vm.runInContext(fs.readFileSync('js/content/states.js', 'utf8'), context);
const S = context.ArkStates;
let v = S.createStateGroup({}, '/', 'st1', ['id:scene'], 'self');
v = S.addState(v, '/', 'st1', 'State 1');
v = S.setCurrent(v, '/', 'st1', 1);
S.render(host, '/', 'st1', v, {});
assert.equal(host.style.display, 'none', 'the root, as a state-0 member, is hidden while state 1 shows');
assert.equal(host.getAttribute('data-ark-state-group'), 'st1', 'and tagged with its group');
S.render(host, '/', 'st1', v, {});
const anchors = doc.querySelectorAll('[data-ark-state-anchor]');
assert.equal(anchors.length, 1, 'rendering again reuses the one anchor (it sits outside the root) instead of adding another');
assert.equal(anchors[0].previousElementSibling, host, 'the anchor sits right after the member it stands in for');
assert.deepEqual([...S.triggerTargets(host, '/', v, 'st1')].map((el) => el.getAttribute('data-ark-insert')), ['state-st1-1'], 'the showing state is the click target');
S.render(host, '/', 'st1', S.setCurrent(v, '/', 'st1', 0), {});
assert.equal(host.style.display, '', 'state 0 shows the root again');
assert.equal(anchors[0].style.display, 'none', 'and hides the state-1 anchor');
console.log('PASS: the root itself can be a state-0 member: hidden, shown, one anchor.');

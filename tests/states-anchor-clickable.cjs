'use strict';
/* Regression: a state made from a container inside the site header rendered and could not
   be clicked. The header's own CSS (css/navigation.css: `#scene .ark-header {...
   pointer-events:none}`, only its links and menus opt back in) is inherited by a state's
   anchor, which ArkStates inserts right after state 0's last member -- i.e. inside the
   header. State 1 showed, the visitor clicked it, and the click went through to the page
   behind: with a 'self' trigger (or an explicit trigger hidden with state 0) the group was
   stuck. Found in Chromium (tests/browser/studio-flows.mjs, flow "single"): Playwright
   reported the hero <div> "intercepts pointer events" over the state's own heading.
   A state's content IS a click target, so render() makes its anchor pointer-events:auto. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<body><div id="host"><header style="pointer-events:none"><nav data-ark-layout-key="k-nav"><a data-ark-layout-key="k-a">A</a></nav></header></div></body>');
const context = { document: dom.window.document };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/content/states.js', 'utf8'), context);
const S = context.ArkStates, host = dom.window.document.getElementById('host');
let draft = S.addState(S.createStateGroup({}, '/', 'st1', ['k-nav'], 'self'), '/', 'st1', 'State 1');
draft = S.setCurrent(draft, '/', 'st1', 1);
S.render(host, '/', 'st1', draft, {});
const anchor = host.querySelector('[data-ark-state-anchor]');
assert(anchor, 'state 1 has an anchor');
assert.equal(anchor.parentNode.tagName, 'HEADER', 'the anchor sits where state 0 was: inside the pointer-events:none header');
assert.equal(anchor.style.pointerEvents, 'auto', 'the showing state can be clicked even inside a pointer-events:none container');
console.log('PASS: a showing state\'s anchor is clickable wherever state 0 lived.');

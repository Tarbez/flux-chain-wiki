'use strict';
/* Regression: "Make into states" required 2+ selected layers, so the owner's other worked
   example -- "you can select a full div that contains elements" -- could not work: a whole
   container is ONE layer, and the menu item just sat greyed out with nothing saying why.
   Found clicking the real page (tests/browser/studio-flows.mjs, flow "single"). Now one
   layer is enough, and every disabled item in that menu says what it needs (AGENTS.md: a
   refusal names what it needs) instead of only greying out. Runs the real
   showCmsContextMenu/cmsMakeStates from js/main.js against the real ArkStates module. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const main = fs.readFileSync('js/main.js', 'utf8');
function extract(from, to, what) {
  const start = main.indexOf(from), end = main.indexOf(to, start + 1);
  assert(start >= 0 && end > start, what + ' is still where this test expects it');
  return main.slice(start, end);
}

function menuFor(count) {
  const dom = new JSDOM('<body></body>');
  const doc = dom.window.document, ran = [];
  const els = Array.from({ length: count }, () => doc.createElement('div'));
  const context = {
    document: doc, location: { origin: 'http://x' }, window: { innerWidth: 1280, innerHeight: 900, parent: { postMessage() {} } },
    cmsContextMenu: null, cmsContextTarget: null, cmsPreviewSelected: els[els.length - 1] || null, cmsPreviewSelections: els, cmsSelectionList: () => els,
    ensureCmsLayoutUi() { if (!context.cmsContextMenu) { context.cmsContextMenu = doc.createElement('div'); context.cmsContextMenu.hidden = true; doc.body.appendChild(context.cmsContextMenu); } },
    cmsIllustrationParts: () => [], placeCmsLayoutUi() {}, emitCmsLayoutSelection() {},
    cmsGroupSelection() {}, cmsUngroupSelection() {}, cmsMakeStates: () => ran.push('make-states'), cmsRemoveSelection() {}, cmsAlign() {}, cmsDistribute() {},
    cmsComponentRefusal: () => '', cmsMakeComponent() {},
  };
  vm.createContext(context);
  vm.runInContext(extract('  function setCmsContextMenuOpen(open) {', '  /* Reusable component edits', 'the context menu') + '\nthis.show = showCmsContextMenu;', context);
  context.show({ clientX: 10, clientY: 10, preventDefault() {}, stopPropagation() {} });
  const buttons = [...context.cmsContextMenu.querySelectorAll('button')];
  return { ran, item: (label) => buttons.find((b) => b.textContent.startsWith(label)) };
}

{
  const menu = menuFor(1);
  const make = menu.item('Make into states');
  assert.equal(make.disabled, false, 'one selected layer (a whole container) can be made into states');
  make.click();
  assert.deepEqual(menu.ran, ['make-states']);
  const group = menu.item('Group selection');
  assert.equal(group.disabled, true);
  assert.match(group.textContent, /needs 2\+ layers/, 'a disabled Group says what it needs');
  assert.equal(group.title, 'needs 2+ layers');
  assert.match(menu.item('Distribute horizontally').textContent, /needs 3\+ layers/, 'a disabled Distribute says what it needs');
  assert.match(menu.item('Align left').textContent, /needs 2\+ layers/, 'a disabled Align says what it needs');
  console.log('PASS: with one container selected, Make into states is enabled and every disabled item says what it needs.');
}
{
  const menu = menuFor(3);
  assert.equal(menu.item('Make into states').textContent, 'Make into states', 'an enabled item carries no "needs" note');
  assert.equal(menu.item('Distribute vertically').disabled, false);
  console.log('PASS: with three layers selected nothing is disabled or annotated.');
}

/* and cmsMakeStates itself builds a group from exactly one element */
{
  const dom = new JSDOM('<body><main id="host"><nav data-ark-layout-key="k-nav"><a data-ark-layout-key="k-a">A</a></nav></main></body>');
  const doc = dom.window.document, host = doc.getElementById('host'), nav = host.querySelector('nav'), posted = [];
  const context = { document: doc, location: { origin: 'http://x' }, host, posted, cmsStatesDraft: { version: 1, routes: {} }, cmsComponentsDraft: {} };
  context.window = { parent: { postMessage: (m) => posted.push(JSON.parse(JSON.stringify(m))) }, ArkLayout: { keyFor: () => 'k-generated' } };
  context.ArkLayout = context.window.ArkLayout;
  context.cmsSelectionList = () => [nav]; context.cmsRoutePath = () => '/'; context.cmsRealTree = () => []; context.emitCmsLayoutSelection = () => {};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/content/states.js', 'utf8'), context);
  context.window.ArkStates = context.ArkStates;
  /* what a group SHOWS is kept apart from its saved default (tests/cms-states-preview-default.cjs) */
  vm.runInContext(extract('  var cmsStatesShowing = {};', '  /* Canvas-only mode (Part G', 'the states showing helpers'), context);
  vm.runInContext(extract('  function cmsMakeStates() {', '  /* Layered-state edits from Studio', 'cmsMakeStates') + '\nthis.make = cmsMakeStates;', context);
  context.make();
  const message = posted.find((m) => m.type === 'defxn-cms-preview-states-replace');
  assert(message, 'making states from one element reports the new draft to the editor');
  assert.equal(message.created, true, 'and flags it as a NEW group, so the editor can open the States section and say what happened');
  const group = message.states.routes['/'][message.groupId];
  assert.deepEqual(group.states[0].members, ['k-nav'], 'state 0 is the one selected container');
  assert.equal(nav.getAttribute('data-ark-state-group'), message.groupId, 'the container is tagged in the page');
  console.log('PASS: cmsMakeStates turns a single selected container into state 0 of a new group.');
}

'use strict';
/* Part A of the follow-up Studio plan: Delete via keyboard and right-click, connected mode.
   There is no concept of deleting arbitrary hand-written real page content (it's hardcoded in
   the page module's JS, and never will be deletable) -- so cmsRemoveSelection in js/main.js
   must mean exactly one of three things, and must reuse the SAME downstream mechanisms the
   plan names rather than reimplementing them: a component instance removes through
   cmsComponentsCommand's existing 'remove-instance' action (the same one the inspector's own
   "Remove instance" button already posts); a layout group ungroups through the existing
   cmsUngroupSelection() (the same one the right-click menu's own "Ungroup" entry already
   calls); anything else gets the existing 'defxn-cms-preview-notice' postMessage, never a
   silent no-op or a crash. Extracted verbatim (not reimplemented) from js/main.js, same
   reason and same pattern as tests/cms-group-pick.cjs and tests/cms-group-selection.cjs:
   js/main.js touches `document`/`window` at its own top level, so the whole file can't load
   in a DOM-free vm context. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const src = fs.readFileSync('js/main.js', 'utf8');
const start = src.indexOf('  function cmsGroupRootOf(element) {');
const end = src.indexOf('  function cmsResolvePick(target) {');
assert(start >= 0 && end > start, 'js/main.js still defines cmsGroupRootOf/cmsComponentRootOf/cmsRemoveSelection together, right before cmsResolvePick');
const extracted = src.slice(start, end);

class FakeElement {
  constructor(tagName) { this.tagName = tagName.toUpperCase(); this.parentNode = null; this.children = []; this.attrs = {}; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  hasAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attrs, name); }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null; }
  setAttribute(name, value) { this.attrs[name] = String(value); }
}

function makeContext(host, selected) {
  const calls = { componentsCommand: [], ungroup: 0, posted: [] };
  const context = {
    host, cmsPreviewSelected: selected || null, cmsPreviewSelections: selected ? [selected] : [],
    cmsComponentsCommand: function (data) { calls.componentsCommand.push(data); },
    cmsUngroupSelection: function () { calls.ungroup++; },
    cmsRoutePath: function () { return '/test-route'; }, cmsLayoutScope: function () { return '/test-route'; },
    cmsGroupList: function () { return ['stub-groups']; },
    cmsRealTree: function () { return ['stub-tree']; },
    placeCmsLayoutUi: function () {},
    window: { parent: { postMessage: function (msg, origin) { calls.posted.push({ msg: msg, origin: origin }); } } },
    location: { origin: 'https://example.test' },
  };
  vm.createContext(context);
  vm.runInContext(extracted, context);
  return { context: context, calls: calls, cmsRemoveSelection: vm.runInContext('cmsRemoveSelection', context) };
}

// Case 1: a component-instance selection removes through the exact same remove-instance
// command the inspector's own "Remove instance" button already posts -- proving it's the
// same path, not a parallel one, and that selection is cleared and relayed afterwards.
{
  const host = new FakeElement('div');
  const instance = host.appendChild(new FakeElement('div'));
  instance.setAttribute('data-ark-component-key', 'k1');
  instance.setAttribute('data-ark-component-anchor', 'a1');
  const child = instance.appendChild(new FakeElement('p'));
  const { calls, cmsRemoveSelection, context } = makeContext(host, child);
  cmsRemoveSelection();
  assert.equal(calls.componentsCommand.length, 1, 'a component-instance selection removes through cmsComponentsCommand, not a parallel mechanism');
  const command = calls.componentsCommand[0];
  const note = 'the SAME action/anchorId/key shape the inspector\'s "Remove instance" button already posts';
  // vm-context object literals have a different realm's Object prototype, so compare fields
  // individually instead of assert.deepEqual/deepStrictEqual (which would fail on prototype
  // identity alone, a cross-realm artifact unrelated to what this is actually checking).
  assert.equal(command.action, 'remove-instance', note);
  assert.equal(command.route, '/test-route', note);
  assert.equal(command.anchorId, 'a1', note);
  assert.equal(command.key, 'k1', note);
  assert.equal(calls.ungroup, 0, 'never ungroups for a component instance');
  assert.equal(context.cmsPreviewSelected, null, 'selection clears after removing the instance');
  assert.equal(calls.posted.length, 1);
  assert.equal(calls.posted[0].msg.type, 'defxn-cms-preview-select');
  assert.equal(calls.posted[0].msg.selection, null, 'Studio is told the selection is now gone, the same message shape every other selection change already uses');
  console.log('PASS: a component-instance selection removes via the exact same remove-instance command the inspector button uses.');
}

// Case 2: a group selection ungroups through the exact same cmsUngroupSelection() the
// right-click menu's own "Ungroup" entry already calls -- its real children were always real
// page content, so "deleting" a group can only ever mean "stop grouping them."
{
  const host = new FakeElement('div');
  const group = host.appendChild(new FakeElement('div'));
  group.setAttribute('data-ark-layout-group', 'g1');
  const member = group.appendChild(new FakeElement('span'));
  const { calls, cmsRemoveSelection, context } = makeContext(host, member);
  cmsRemoveSelection();
  assert.equal(calls.ungroup, 1, 'a group selection ungroups through cmsUngroupSelection, not a parallel mechanism');
  assert.equal(calls.componentsCommand.length, 0, 'never removes a component instance for a group');
  assert.equal(context.cmsPreviewSelected, group, 'selection is escalated to the group root before ungrouping, matching cmsUngroupSelection\'s own expectation that cmsPreviewSelected IS the group');
  console.log('PASS: a group selection ungroups via the exact same cmsUngroupSelection the right-click menu already calls.');
}

// Case 3: a plain real element (neither a component instance nor a group) gets a notice, and
// does NOT throw, and does NOT remove anything -- it can never silently no-op.
{
  const host = new FakeElement('div');
  const plain = host.appendChild(new FakeElement('p'));
  const { calls, cmsRemoveSelection, context } = makeContext(host, plain);
  assert.doesNotThrow(function () { cmsRemoveSelection(); }, 'a plain element never throws');
  assert.equal(calls.componentsCommand.length, 0);
  assert.equal(calls.ungroup, 0);
  assert.equal(calls.posted.length, 1);
  assert.equal(calls.posted[0].msg.type, 'defxn-cms-preview-notice', 'a plain element gets a notice, not a silent no-op');
  assert.match(calls.posted[0].msg.message, /hid/i, 'the notice points at hiding, not deleting, real content');
  assert.equal(context.cmsPreviewSelected, plain, 'nothing is deselected or removed for a plain element');
  console.log('PASS: a plain real-element selection produces a notice, never a crash or a removal.');
}

// No selection at all: inert, nothing posted, nothing thrown.
{
  const host = new FakeElement('div');
  const { calls, cmsRemoveSelection } = makeContext(host, null);
  assert.doesNotThrow(function () { cmsRemoveSelection(); });
  assert.equal(calls.posted.length, 0, 'nothing is posted when there is no selection to act on');
  console.log('PASS: with no selection, cmsRemoveSelection is a safe no-op.');
}

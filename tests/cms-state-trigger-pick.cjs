'use strict';
/* Regression: cmsSelectionInfo (js/main.js) used to read data-ark-state-group off the exact
   selected element only, never an ancestor. ArkStates.render() only stamps that attribute on
   the literal state-zero member elements -- so selecting a container that was made into
   state zero as one whole unit (e.g. a nav div holding three buttons) found its group, but
   clicking down into one specific button INSIDE that container (to designate just that
   button, not the whole container, as the click trigger -- the owner's own worked example)
   found nothing: no States accordion, no "Use this element as trigger" button, no way to
   reach the feature at all for a nested element. Fixed by climbing to the nearest tagged
   ancestor, the same escalation cmsGroupRootOf/cmsComponentRootOf already use elsewhere in
   this file -- `key` must still report the literal clicked element, not the ancestor, so
   the trigger ends up pointing at the actual button. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const src = fs.readFileSync('js/main.js', 'utf8');
const start = src.indexOf('  function cmsSelectionInfo(element) {');
const end = src.indexOf('  function cmsSelectionList() {');
assert(start >= 0 && end > start, 'js/main.js still defines cmsSelectionInfo right before cmsSelectionList');
const extracted = src.slice(start, end);

class FakeElement {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.attrs = {}; this.parentNode = null; this.id = ''; }
  appendChild(child) { child.parentNode = this; return child; }
  setAttribute(name, value) { if (name === 'id') this.id = String(value); this.attrs[name] = String(value); }
  getAttribute(name) { return name === 'id' ? (this.id || null) : (Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null); }
  hasAttribute(name) { return name === 'id' ? !!this.id : Object.prototype.hasOwnProperty.call(this.attrs, name); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 10, height: 10 }; }
}

function run(host) {
  const context = {
    host,
    cmsRoutePath: () => '/',
    cmsLayoutBreakpoint: () => 'desktop',
    cmsLayoutEntry: () => ({}),
    cmsRectOf: (element) => element.getBoundingClientRect(),
  };
  vm.createContext(context);
  vm.runInContext(extracted, context);
  return vm.runInContext('cmsSelectionInfo', context);
}

{
  const host = new FakeElement('div');
  const container = host.appendChild(new FakeElement('div'));
  container.setAttribute('data-ark-layout-key', 'k-container');
  container.setAttribute('data-ark-state-group', 'st1');
  const button = container.appendChild(new FakeElement('button'));
  button.setAttribute('data-ark-layout-key', 'k-button');
  // no data-ark-state-group on the button itself -- only its ancestor has it

  const cmsSelectionInfo = run(host);
  const info = cmsSelectionInfo(button);
  assert.equal(info.key, 'k-button', 'the literal clicked element is still reported, not the ancestor');
  assert(info.stateGroup, 'a nested element inside a state-zero container resolves the group via its ancestor');
  assert.equal(info.stateGroup.groupId, 'st1');
  console.log('PASS: selecting a nested element inside a state-zero container still finds the enclosing group, while still reporting the nested element\'s own key for "use this element as trigger".');
}

{
  const host = new FakeElement('div');
  const plain = host.appendChild(new FakeElement('p'));
  plain.setAttribute('data-ark-layout-key', 'k-plain');
  const cmsSelectionInfo = run(host);
  assert.equal(cmsSelectionInfo(plain).stateGroup, null, 'an element with no state-group ancestor reports stateGroup: null, not a false match');
  console.log('PASS: an ordinary element outside any states group reports no state group.');
}

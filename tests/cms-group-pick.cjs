'use strict';
/* Bug: after grouping, clicking anywhere inside the new group re-selected whichever
   individual member was clicked (every member keeps its own data-ark-layout-key, so a plain
   closest() lookup never climbs to the group wrapper) -- so dragging right after a click
   moved just that one member instead of the group. cmsGroupRootOf/cmsResolvePick fix this
   the same way the admin's own instance picker already works: a click inside a group selects
   the group; a second click, while that group (or something inside it) is already the
   selection, drills in to the specific member. Extracted verbatim (not reimplemented) from
   js/main.js for the same reason as tests/cms-group-selection.cjs. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const src = fs.readFileSync('js/main.js', 'utf8');
const start = src.indexOf('  function cmsGroupRootOf(element) {');
const end = src.indexOf('  document.addEventListener(\'click\', function (event) {');
assert(start >= 0 && end > start, 'js/main.js still defines cmsGroupRootOf/cmsResolvePick right before the click handler that uses them');
const extracted = src.slice(start, end);

class FakeElement {
  constructor(tagName) { this.tagName = tagName.toUpperCase(); this.parentNode = null; this.children = []; this.attrs = {}; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  hasAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attrs, name); }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  contains(other) { for (var node = other; node; node = node.parentNode) if (node === this) return true; return false; }
}

function makeFns(host, cmsPreviewSelected) {
  const context = { host: host, cmsPreviewSelected: cmsPreviewSelected || null };
  vm.createContext(context);
  vm.runInContext(extracted, context);
  return { cmsGroupRootOf: vm.runInContext('cmsGroupRootOf', context), cmsResolvePick: vm.runInContext('cmsResolvePick', context) };
}

const host = new FakeElement('div');
const row = host.appendChild(new FakeElement('div'));
const group = row.appendChild(new FakeElement('div'));
group.setAttribute('data-ark-layout-group', 'g1');
const cardA = group.appendChild(new FakeElement('div'));
const valueA = cardA.appendChild(new FakeElement('strong'));
const cardB = group.appendChild(new FakeElement('div'));
const outsider = row.appendChild(new FakeElement('div'));

// cmsGroupRootOf: finds the nearest enclosing group for a deeply nested element, null outside one.
{
  const { cmsGroupRootOf } = makeFns(host);
  assert.equal(cmsGroupRootOf(valueA), group, 'a deeply nested element resolves to its enclosing group');
  assert.equal(cmsGroupRootOf(group), group, 'the group wrapper itself resolves to itself');
  assert.equal(cmsGroupRootOf(outsider), null, 'an element outside any group resolves to null');
  console.log('PASS: cmsGroupRootOf finds the nearest enclosing group, or null outside one.');
}

// cmsResolvePick: nothing selected yet, or something unrelated selected -> picking any member
// of a group selects the group (the actual bug: this used to return the member itself).
{
  const { cmsResolvePick } = makeFns(host, null);
  assert.equal(cmsResolvePick(valueA), group, 'with nothing selected, clicking a grouped member selects the group first');
}
{
  const { cmsResolvePick } = makeFns(host, outsider);
  assert.equal(cmsResolvePick(cardB), group, 'with an unrelated element selected, clicking a grouped member still selects the group first');
  console.log('PASS: the first click on a grouped member selects the group, not the member.');
}

// Already drilled in (the group, or a member of it, is the current selection) -> a further
// click on a member of that SAME group drills in to the specific member.
{
  const { cmsResolvePick } = makeFns(host, group);
  assert.equal(cmsResolvePick(valueA), valueA, 'once the group itself is selected, clicking a member drills in to that member');
}
{
  const { cmsResolvePick } = makeFns(host, cardA);
  assert.equal(cmsResolvePick(valueA), valueA, 'while already drilled into one member, clicking a nested child of that member stays drilled in');
  assert.equal(cmsResolvePick(cardB), cardB, 'and picking a sibling member within the same group also drills straight to it');
  console.log('PASS: once drilled into a group, further clicks on its members select them directly.');
}

// An element with no enclosing group is returned unchanged regardless of what is selected --
// this function must never affect ordinary, non-grouped selection.
{
  const { cmsResolvePick } = makeFns(host, group);
  assert.equal(cmsResolvePick(outsider), outsider, 'an element with no enclosing group is never redirected');
  console.log('PASS: ungrouped elements are picked directly, unaffected by any current group selection.');
}

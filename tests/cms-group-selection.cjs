'use strict';
/* js/main.js is the real site's bootstrap script -- it touches `document`/`window` at its
   own top level, so the whole file can't load in a DOM-free vm context the way
   js/content/layout.js can. cmsNearestCommonAncestor/cmsPromoteToChildOf are pure
   tree-traversal functions that only read `.parentNode`, so they're extracted verbatim (not
   reimplemented) by slicing between their own known boundaries, and exercised against a
   markup shape that mirrors real content: js/pages/home.js:277 puts a <strong> metric value
   and a <span> unit directly inside a shared card, but in general two "layers" that look
   adjacent on screen sit at different DOM depths (wrapped in spans/strongs/anchors) -- the
   bug this closes ("Grouping requires layers with the same parent") was requiring an exact
   parentNode match, which almost never held on real rendered markup. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const src = fs.readFileSync('js/main.js', 'utf8');
const start = src.indexOf('  function cmsNearestCommonAncestor(elements, root) {');
const mid = src.indexOf('  function cmsPromoteToChildOf(element, ancestor) {');
const end = src.indexOf('  function cmsGroupSelection() {');
assert(start >= 0 && mid > start && end > mid, 'js/main.js still defines cmsNearestCommonAncestor and cmsPromoteToChildOf next to cmsGroupSelection');
const extracted = src.slice(start, end);

class FakeElement {
  constructor(tagName) { this.tagName = tagName.toUpperCase(); this.parentNode = null; this.children = []; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
}

const context = { Math };
vm.createContext(context);
vm.runInContext(extracted, context);
const cmsNearestCommonAncestor = vm.runInContext('cmsNearestCommonAncestor', context);
const cmsPromoteToChildOf = vm.runInContext('cmsPromoteToChildOf', context);

/* Mirrors js/pages/home.js:277's real shape, generalized one level deeper: two stat cards,
   each with a wrapper and then the actual value/unit elements -- the common case where a
   "layer" the user clicks is several levels below the visual card boundary. */
const host = new FakeElement('div');
const row = host.appendChild(new FakeElement('div'));
const cardA = row.appendChild(new FakeElement('div'));
const wrapA = cardA.appendChild(new FakeElement('span'));
const valueA = wrapA.appendChild(new FakeElement('strong'));
const cardB = row.appendChild(new FakeElement('div'));
const wrapB = cardB.appendChild(new FakeElement('span'));
const valueB = wrapB.appendChild(new FakeElement('strong'));

const common = cmsNearestCommonAncestor([valueA, valueB], host);
assert.equal(common, row, 'the nearest common ancestor of two nested values is the row that actually contains both cards');
const promotedA = cmsPromoteToChildOf(valueA, common), promotedB = cmsPromoteToChildOf(valueB, common);
assert.equal(promotedA, cardA, 'a deeply nested value promotes up to its own card -- the thing a user actually means by "this layer"');
assert.equal(promotedB, cardB);
console.log('PASS: two nested values on sibling cards promote to their cards, the real failure case for "Grouping requires layers with the same parent."');

/* Elements that are already literal siblings must promote to themselves -- no behavior
   change for the case that already worked. */
const already = cmsNearestCommonAncestor([cardA, cardB], row);
assert.equal(already, row);
assert.equal(cmsPromoteToChildOf(cardA, row), cardA);
assert.equal(cmsPromoteToChildOf(cardB, row), cardB);
console.log('PASS: elements that are already direct siblings promote to themselves, unchanged.');

/* One selected element containing another has no sensible promotion -- cmsGroupSelection
   must refuse this case (covered by its own promoted.length < 2 check), not silently wrap
   an element around itself. */
assert.equal(cmsPromoteToChildOf(cardA, cardA), null, 'an element cannot be promoted to a child of itself');
console.log('PASS: an ancestor/descendant pair cannot be promoted into a nonsensical self-group.');

/* Two elements under genuinely unrelated branches still correctly find their real common
   ancestor, however high it sits -- cmsGroupSelection's own `common === host` check (not
   exercised here, since it needs the real host reference) is what then refuses to group
   across the whole page. */
const footer = host.appendChild(new FakeElement('div'));
const footerItem = footer.appendChild(new FakeElement('span'));
const rootCommon = cmsNearestCommonAncestor([valueA, footerItem], host);
assert.equal(rootCommon, host, 'two elements with nothing in common but the page root correctly resolve to the root, which the caller then refuses to group across');
console.log('PASS: unrelated elements correctly resolve all the way up to the shared root, not a false near-match.');

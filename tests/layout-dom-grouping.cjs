'use strict';
/* layout-content.cjs only exercises ArkLayout.group/ungroup as JSON bookkeeping -- it never
   calls apply()/buildGroups()/unwrapGroups(), the code that actually wraps selected canvas
   elements in a persistent <div>/<g> inside the real DOM. That is the riskiest, newest part
   of Studio's right-click grouping, so it gets its own minimal DOM: a hand-rolled element
   stub in the style of tests/mesh-drag.cjs, since this project carries no jsdom dependency. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const HTML_NS = 'http://www.w3.org/1999/xhtml';
const SVG_NS = 'http://www.w3.org/2000/svg';

class FakeElement {
  constructor(tagName, opts = {}) {
    this.tagName = tagName.toUpperCase();
    this.nodeType = 1;
    this.namespaceURI = opts.namespaceURI || HTML_NS;
    this.attrs = {};
    this.children = [];
    this.parentNode = null;
    this.id = opts.id || '';
    this.style = {};
  }
  get parentElement() { return this.parentNode; }
  setAttribute(name, value) { if (name === 'id') this.id = String(value); this.attrs[name] = String(value); }
  getAttribute(name) { if (name === 'id') return this.id || null; return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null; }
  hasAttribute(name) { return name === 'id' ? !!this.id : Object.prototype.hasOwnProperty.call(this.attrs, name); }
  removeAttribute(name) { delete this.attrs[name]; if (name === 'id') this.id = ''; }
  get previousElementSibling() {
    if (!this.parentNode) return null;
    const idx = this.parentNode.children.indexOf(this);
    return idx > 0 ? this.parentNode.children[idx - 1] : null;
  }
  get firstChild() { return this.children[0] || null; }
  appendChild(node) {
    if (node.parentNode) node.parentNode.children.splice(node.parentNode.children.indexOf(node), 1);
    node.parentNode = this; this.children.push(node); return node;
  }
  insertBefore(node, ref) {
    if (node.parentNode) node.parentNode.children.splice(node.parentNode.children.indexOf(node), 1);
    node.parentNode = this;
    const idx = ref ? this.children.indexOf(ref) : -1;
    if (idx < 0) this.children.push(node); else this.children.splice(idx, 0, node);
    return node;
  }
  remove() { if (this.parentNode) { this.parentNode.children.splice(this.parentNode.children.indexOf(this), 1); this.parentNode = null; } }
  querySelectorAll(selector) {
    const clauses = selector.split(',').map((s) => s.trim());
    const out = [];
    const walk = (node) => node.children.forEach((child) => {
      const hit = clauses.some((clause) => clause[0] === '[' ? child.hasAttribute(clause.slice(1, -1)) : child.tagName.toLowerCase() === clause.toLowerCase());
      if (hit) out.push(child);
      walk(child);
    });
    walk(this);
    return out;
  }
}

const context = vm.createContext({ document: { createElementNS: (ns, tag) => new FakeElement(tag, { namespaceURI: ns }) } });
vm.runInContext(fs.readFileSync('js/content/layout.js', 'utf8'), context);
const ArkLayout = vm.runInContext('ArkLayout', context);

/* --- Scenario 1: plain HTML cards, group two of three siblings --- */
(function htmlGrouping() {
  const root = new FakeElement('div');
  const parent = root.appendChild(new FakeElement('div'));
  const cardA = parent.appendChild(new FakeElement('div'));
  const cardB = parent.appendChild(new FakeElement('div'));
  const cardC = parent.appendChild(new FakeElement('div'));

  ArkLayout.annotate(root);
  const keyA = cardA.getAttribute('data-ark-layout-key'), keyB = cardB.getAttribute('data-ark-layout-key'), keyC = cardC.getAttribute('data-ark-layout-key');
  assert(keyA && keyB && keyC && keyA !== keyB && keyB !== keyC, 'structural keys are assigned and distinct before any grouping exists');

  let layout = ArkLayout.group(ArkLayout.sanitize({ version: 2, routes: {}, groups: {} }), '/', 'grp1', [keyA, keyB], 'Card group');
  ArkLayout.apply(root, '/', 1280, layout);

  assert.equal(parent.children.length, 2, 'grouping two of three siblings collapses them into one wrapper, leaving the third in place');
  const wrapper = parent.children[0];
  assert.equal(wrapper.tagName, 'DIV', 'an HTML parent groups into a <div>, not an SVG <g>');
  assert.equal(wrapper.getAttribute('data-ark-layout-group'), 'grp1');
  assert.equal(wrapper.getAttribute('data-ark-layout-key'), 'group:grp1');
  assert.deepEqual(wrapper.children, [cardA, cardB], 'the wrapper holds exactly the grouped elements, in original order');
  assert.equal(parent.children[1], cardC, 'the ungrouped sibling is untouched and keeps its position');
  assert.equal(wrapper.style.display, 'flex', 'the HTML wrapper is a real flex container, not a transparent passthrough');

  /* A second apply() (e.g. a resize or a re-render) must unwrap-then-rebuild identically,
     never nest a second wrapper and never lose or reorder a member. */
  ArkLayout.apply(root, '/', 1280, layout);
  assert.equal(parent.children.length, 2, 'reapplying the same layout is idempotent');
  const rewrapped = parent.children[0];
  assert.equal(rewrapped.getAttribute('data-ark-layout-group'), 'grp1');
  assert.deepEqual(rewrapped.children, [cardA, cardB], 'members round-trip through unwrap+rebuild with no drift');
  assert.notEqual(rewrapped, wrapper, 'the wrapper is rebuilt fresh each apply(), not reused by reference');

  /* Ungroup must restore the exact original flat sibling order. */
  layout = ArkLayout.ungroup(layout, '/', 'grp1');
  ArkLayout.apply(root, '/', 1280, layout);
  assert.deepEqual(parent.children, [cardA, cardB, cardC], 'ungrouping restores the original flat order with no wrapper left behind');

  console.log('PASS: HTML multi-select grouping creates a real <div> wrapper, round-trips, and ungroups cleanly.');
})();

/* Regression: `members` is recorded in selection (shift-click) order, not document order.
   A user who shift-clicks the lower element before the upper one must not have grouping
   silently swap their visual stacking -- the wrapper is a flex column, so DOM order is
   render order. Catches a real defect found 2026-10-16: grouping C-then-A rendered C above A. */
(function groupingNeverReordersByClickOrder() {
  const root = new FakeElement('div');
  const parent = root.appendChild(new FakeElement('div'));
  const cardA = parent.appendChild(new FakeElement('div'));
  parent.appendChild(new FakeElement('div'));
  const cardC = parent.appendChild(new FakeElement('div'));

  ArkLayout.annotate(root);
  const keyA = cardA.getAttribute('data-ark-layout-key'), keyC = cardC.getAttribute('data-ark-layout-key');

  /* Selection order is C then A (the user clicked bottom-to-top). */
  const layout = ArkLayout.group(ArkLayout.sanitize({ version: 2, routes: {}, groups: {} }), '/', 'grp2', [keyC, keyA], 'Group');
  ArkLayout.apply(root, '/', 1280, layout);

  const wrapper = parent.children.find((child) => child.getAttribute('data-ark-layout-group') === 'grp2');
  assert.deepEqual(wrapper.children, [cardA, cardC], 'grouping preserves document order regardless of the order elements were shift-clicked in');

  console.log('PASS: grouping out of click order still preserves visual/document order.');
})();

/* --- Scenario 2: SVG illustration primitives group into a real <g>, not a <div> --- */
(function svgGrouping() {
  const root = new FakeElement('div');
  const svg = root.appendChild(new FakeElement('svg', { namespaceURI: SVG_NS }));
  const illustration = svg.appendChild(new FakeElement('g', { namespaceURI: SVG_NS }));
  const pathA = illustration.appendChild(new FakeElement('path', { namespaceURI: SVG_NS }));
  const pathB = illustration.appendChild(new FakeElement('path', { namespaceURI: SVG_NS }));
  const circleC = illustration.appendChild(new FakeElement('circle', { namespaceURI: SVG_NS }));

  ArkLayout.annotate(root);
  const keyA = pathA.getAttribute('data-ark-layout-key'), keyB = pathB.getAttribute('data-ark-layout-key');

  let layout = ArkLayout.group(ArkLayout.sanitize({ version: 2, routes: {}, groups: {} }), '/', 'vec1', [keyA, keyB], 'Icon parts');
  ArkLayout.apply(root, '/', 1280, layout);

  assert.equal(illustration.children.length, 2, 'two of three illustration primitives collapse into one wrapper');
  const wrapper = illustration.children[0];
  assert.equal(wrapper.tagName, 'G', 'grouping inside an SVG parent produces a real <g>, matching SVG content rules -- never a <div>');
  assert.equal(wrapper.namespaceURI, SVG_NS, 'the wrapper is created in the SVG namespace so it actually renders as vector content');
  assert.deepEqual(wrapper.children, [pathA, pathB], 'the two selected vector primitives are the wrapper members');
  assert.equal(illustration.children[1], circleC, 'the unselected vector primitive stays a direct child of the illustration group');

  layout = ArkLayout.ungroup(layout, '/', 'vec1');
  ArkLayout.apply(root, '/', 1280, layout);
  assert.deepEqual(illustration.children, [pathA, pathB, circleC], 'ungrouping restores the original illustration structure');

  console.log('PASS: illustration/SVG primitives group into a real <g>, preserving vector semantics, and round-trip cleanly.');
})();

/* Regression: `display`/`flexDirection` were added to the `owned` reset list when the real
   visual-style Layout controls shipped (2026-10-16). apply()'s own reset pass -- and
   applyFrame()'s internal resetElement() call -- wipe every owned property before
   reapplying, so a group wrapper's default "flex column" (previously set once, directly, by
   buildGroups()) was being erased on every single apply() call, leaving a newly grouped box
   with no layout at all. Caught because a style control the group's OWN key never touched
   still broke its container behavior. */
(function groupKeepsFlexDefaultAcrossReapply() {
  const root = new FakeElement('div');
  const parent = root.appendChild(new FakeElement('div'));
  const cardA = parent.appendChild(new FakeElement('div'));
  const cardB = parent.appendChild(new FakeElement('div'));

  ArkLayout.annotate(root);
  const keyA = cardA.getAttribute('data-ark-layout-key'), keyB = cardB.getAttribute('data-ark-layout-key');
  let layout = ArkLayout.group(ArkLayout.sanitize({ version: 2, routes: {}, groups: {} }), '/', 'g1', [keyA, keyB], 'Group');
  ArkLayout.apply(root, '/', 1280, layout);
  let wrapper = parent.children.find((c) => c.getAttribute('data-ark-layout-group') === 'g1');
  assert.equal(wrapper.style.display, 'flex', 'a freshly built group wrapper is a real flex container');
  assert.equal(wrapper.style.flexDirection, 'column');

  /* Simulate a resize/re-render -- apply() runs again with the exact same layout. */
  ArkLayout.apply(root, '/', 1280, layout);
  wrapper = parent.children.find((c) => c.getAttribute('data-ark-layout-group') === 'g1');
  assert.equal(wrapper.style.display, 'flex', 'reapplying the same layout does not erase the group default');
  assert.equal(wrapper.style.flexDirection, 'column');

  /* A style edit on something else entirely must not erase the group's own default either. */
  layout = ArkLayout.set(layout, '/', keyA, 'desktop', { color: 'text-strong' });
  ArkLayout.apply(root, '/', 1280, layout);
  wrapper = parent.children.find((c) => c.getAttribute('data-ark-layout-group') === 'g1');
  assert.equal(wrapper.style.display, 'flex', 'an unrelated style edit elsewhere does not erase the group default');

  /* An explicit Layout override on the group's OWN key must still win over the default. */
  layout = ArkLayout.set(layout, '/', 'group:g1', 'desktop', { display: 'row' });
  ArkLayout.apply(root, '/', 1280, layout);
  wrapper = parent.children.find((c) => c.getAttribute('data-ark-layout-group') === 'g1');
  assert.equal(wrapper.style.flexDirection, 'row', 'an explicit display override on the group itself overrides the column default');

  console.log('PASS: a group wrapper keeps its flex-container default across every re-render, and an explicit override still wins.');
})();

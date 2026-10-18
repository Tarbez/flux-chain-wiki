'use strict';
/* Part B of the follow-up Studio plan: a real layers tree for connected mode.
   cmsRealTree (js/main.js) walks the actual rendered DOM, not the standalone dense-node
   tree the deleted admin-studio.html's renderLayers() used to walk -- extracted verbatim (not reimplemented)
   and run against stubbed dependencies, same reasoning as tests/cms-group-selection.cjs and
   tests/cms-remove-selection.cjs: js/main.js touches `document`/`window` at its own top
   level and can't load whole in a DOM-free vm context. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const src = fs.readFileSync('js/main.js', 'utf8');
const start = src.indexOf('  function cmsFrameFor(route, key, element) {');
const end = src.indexOf('  function cmsSelectionInfo(element) {');
assert(start >= 0 && end > start, 'js/main.js still defines cmsFrameFor..setCmsLayoutFrameForKey together, right before cmsSelectionInfo');
const extracted = src.slice(start, end);

class FakeElement {
  constructor(tagName) { this.tagName = tagName.toUpperCase(); this.parentNode = null; this.children = []; this.attrs = {}; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  hasAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attrs, name); }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null; }
  setAttribute(name, value) { this.attrs[name] = String(value); }
}

function makeContext(cmsLayoutDraft) {
  const context = {
    window: { ArkLayout: null, innerWidth: 1280 },
    cmsLayoutDraft: cmsLayoutDraft || { version: 2, routes: {}, groups: {}, labels: {} },
  };
  /* annotate() is a no-op here: the fixtures below set data-ark-layout-key directly, the
     same way the real ArkLayout.annotate() would have, so this test exercises cmsRealTree's
     OWN walking/skip/svg-collapse logic, not annotate()'s separate tag-whitelist logic
     (covered elsewhere, tests/layout-dom-grouping.cjs). merged() is a transparent pass-
     through: cmsFrameFor already does the only lookup that matters (route+key), so there is
     nothing for a fake merge to combine. */
  context.window.ArkLayout = context.ArkLayout = {
    annotate: () => [],
    /* A trimmed stand-in for the real ArkLayout.merged() (js/content/layout.js): at the
       fixed 1280px width used throughout this file, only the 'desktop' breakpoint applies --
       enough to exercise cmsFrameFor's own route+key lookup without re-deriving the real
       per-breakpoint merge logic, which is covered on its own in tests/layout-content.cjs. */
    merged: (entry) => Object.assign({}, entry && entry.desktop),
    labelFor: (draft, route, key) => (draft.labels && draft.labels[route] && draft.labels[route][key]) || '',
    /* the route's own entry only: these fixtures have no shell scope (tests/layout-shell-scope.cjs has) */
    entryFor: (draft, route, key) => (draft.routes && draft.routes[route] && draft.routes[route][key]) || null,
  };
  vm.createContext(context);
  vm.runInContext(extracted, context);
  return { context, cmsRealTree: vm.runInContext('cmsRealTree', context) };
}

// 1. Correct nesting: a plain tree of annotated elements produces a matching row tree.
{
  const host = new FakeElement('div');
  const section = host.appendChild(new FakeElement('section')); section.setAttribute('data-ark-layout-key', 'k-section');
  const heading = section.appendChild(new FakeElement('h2')); heading.setAttribute('data-ark-layout-key', 'k-heading');
  const para = section.appendChild(new FakeElement('p')); para.setAttribute('data-ark-layout-key', 'k-para');
  const { cmsRealTree } = makeContext();
  const tree = cmsRealTree(host, '/');
  assert.equal(tree.length, 1, 'one top-level row for the one direct child of host');
  assert.equal(tree[0].key, 'k-section'); assert.equal(tree[0].tag, 'section'); assert.equal(tree[0].hasChildren, true);
  assert.equal(tree[0].children.length, 2, 'the section has two annotated children');
  /* tree[0].children is a vm-realm array; .map() off it (species-constructed in that same
     realm) would compare false against a local-realm array under deepStrictEqual purely on
     prototype identity, an artifact unrelated to what this is actually checking -- the same
     cross-realm pitfall tests/cms-remove-selection.cjs already documents. Array.from() here
     copies into a local-realm array first. */
  assert.deepEqual(Array.from(tree[0].children).map((r) => r.key), ['k-heading', 'k-para'], 'children are in document order');
  assert.equal(tree[0].children[0].hasChildren, false, 'a leaf row (no annotated descendants) correctly reports hasChildren: false');
  console.log('PASS: a plain annotated DOM tree produces a matching, correctly nested row tree.');
}

// 2. hidden flag reads the same route+key frame lookup every other control already uses.
{
  const host = new FakeElement('div');
  const box = host.appendChild(new FakeElement('div')); box.setAttribute('data-ark-layout-key', 'k-hidden');
  const visible = host.appendChild(new FakeElement('div')); visible.setAttribute('data-ark-layout-key', 'k-visible');
  const draft = { version: 2, routes: { '/': { 'k-hidden': { desktop: { display: 'hide' } } } }, groups: {}, labels: {} };
  const { cmsRealTree } = makeContext(draft);
  const tree = cmsRealTree(host, '/');
  assert.equal(tree.find((r) => r.key === 'k-hidden').hidden, true, 'a key with frame.display === \'hide\' reports hidden: true');
  assert.equal(tree.find((r) => r.key === 'k-visible').hidden, false, 'a key with no hide override reports hidden: false');
  console.log('PASS: the hidden flag reflects the real stored/merged frame, not a separate tracked state.');
}

// 3. A whole <svg> collapses to one leaf row, regardless of what's nested inside it --
// its internal paths/shapes stay reachable only through "Enter illustration", never as rows.
{
  const host = new FakeElement('div');
  const svg = host.appendChild(new FakeElement('svg')); svg.setAttribute('data-ark-layout-key', 'k-svg');
  const g = svg.appendChild(new FakeElement('g')); g.setAttribute('data-ark-layout-key', 'k-g');
  const path = g.appendChild(new FakeElement('path')); path.setAttribute('data-ark-layout-key', 'k-path');
  const { cmsRealTree } = makeContext();
  const tree = cmsRealTree(host, '/');
  assert.equal(tree.length, 1); assert.equal(tree[0].key, 'k-svg');
  assert.equal(tree[0].hasChildren, false, 'an <svg> is always a leaf row, even though annotate() tagged elements inside it');
  assert.equal(tree[0].children.length, 0, 'nothing inside the svg is walked into child rows');
  console.log('PASS: a whole <svg> collapses to one leaf row, never a wall of internal shape rows.');
}

// 4. An element annotate() never tagged (no data-ark-layout-key) is skipped cleanly -- no
// row of its own, no crash, and any annotated descendant beneath it is still found (flattened
// up to the nearest annotated ancestor) rather than silently lost.
{
  const host = new FakeElement('div');
  const untagged = host.appendChild(new FakeElement('span')); // no data-ark-layout-key at all
  const rescued = untagged.appendChild(new FakeElement('strong')); rescued.setAttribute('data-ark-layout-key', 'k-rescued');
  const { cmsRealTree } = makeContext();
  let tree;
  assert.doesNotThrow(() => { tree = cmsRealTree(host, '/'); }, 'an untagged wrapper never crashes the walk');
  assert.equal(tree.length, 1, 'the untagged wrapper produces no row of its own');
  assert.equal(tree[0].key, 'k-rescued', 'an annotated descendant beneath an untagged wrapper is still found, not silently dropped');
  console.log('PASS: an un-annotated element is skipped cleanly, without losing an annotated descendant beneath it.');
}

// 5. The stored label (ArkLayout.setLabel/labelFor, via the real js/content/layout.js) wins
// over the tag-name fallback; an unlabeled row falls back to its own tag name.
{
  const host = new FakeElement('div');
  const titled = host.appendChild(new FakeElement('h1')); titled.setAttribute('data-ark-layout-key', 'k-title');
  const plain = host.appendChild(new FakeElement('p')); plain.setAttribute('data-ark-layout-key', 'k-plain');
  const draft = { version: 2, routes: {}, groups: {}, labels: { '/': { 'k-title': 'Hero heading' } } };
  const { cmsRealTree } = makeContext(draft);
  const tree = cmsRealTree(host, '/');
  assert.equal(tree.find((r) => r.key === 'k-title').label, 'Hero heading', 'a stored label is used as the row label');
  assert.equal(tree.find((r) => r.key === 'k-plain').label, 'p', 'an unlabeled row falls back to its own tag name');
  console.log('PASS: a stored label wins over the tag-name fallback.');
}

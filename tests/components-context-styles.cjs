'use strict';
/* The data half of "a component looks the same wherever it is placed" (the browser half,
   which measures computed styles on /download and /chain, is tests/browser/
   component-context.mjs -- jsdom has no real cascade to measure).

   Why this exists: a captured element now carries `x`, the styling its ANCESTORS gave it
   where it was captured (`#scene .how-chapter-header h1` on /download), re-minted on render
   as a pinned atom (ArkAtomizer.pin) so it survives being placed on a page where that rule
   does not match. This pins the parts a plausible simplification would quietly break:
   - sanitize() keeps a valid `x` and drops one that could break out of its rule ({ } <);
   - buildNode() turns `x` into ONE pinned class whose rule outranks `#scene h1` (2,1,0);
   - a capture of an element carrying a pinned class reads it back into `x` (capturing an
     instance must not lose its context styling), never into `s` as a plain atom;
   - a definition without `x` serializes to the exact bytes it had (old data files), and
     builds exactly as before;
   - outside a scene (no [data-page] ancestor, as here) capture adds no `x` at all. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const plain = (x) => JSON.parse(JSON.stringify(x));

const dom = new JSDOM('<!doctype html><html><head></head><body><h1 class="title">Hello</h1></body></html>');
const w = dom.window;
w.ArkCopy = { isKey: () => false, resolve: (v) => v };
w.matchMedia = () => ({ matches: false });
const context = vm.createContext(w);
for (const file of ['js/ark/atomizer.js', 'js/ark/flux.js', 'js/ark/runtime.js', 'js/content/layout.js', 'js/content/components.js']) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}
const C = vm.runInContext('ArkComponents', context);
const doc = w.document;
const X = 'font-size:46px;font-family:var(--font-sans);letter-spacing:-0.04em;color:hsl(var(--text-strong))';

/* sanitize */
const master = (tree) => ({ version: 1, masters: { m1: { resolver: 'RBLOCK_CAPTURED_V1', props: { heading: 'Hi' }, label: 'Hi', tree } }, routes: {} });
let clean = plain(C.sanitize(master([{ t: 'h1', c: 'title', x: X, k: [{ p: 'heading' }] }])));
assert.equal(clean.masters.m1.tree[0].x, X, 'a valid x survives sanitize()');
clean = plain(C.sanitize(master([{ t: 'h1', x: 'color:red}body{display:none', k: [{ p: 'heading' }] }])));
assert.equal(clean.masters.m1.tree[0].x, undefined, 'an x that could close its rule is dropped');
console.log('PASS: sanitize keeps a valid x and drops one that escapes its rule.');

/* build: one pinned class, a rule with id-level weight */
const built = C.buildNode({ t: 'h1', c: 'title', x: X, k: [{ p: 'heading' }] }, { heading: 'Hi' }, doc);
const pinClass = built.className.split(' ').find((cls) => /^kp/.test(cls));
assert.ok(pinClass, 'buildNode adds a pinned class for x');
assert.equal(built.className.split(' ')[0], 'title', "the element's own classes come first");
const sheet = [...doc.querySelectorAll('style[data-ark-ui="atoms"]')].map((s) => s.textContent).join('');
assert.ok(sheet.includes('.' + pinClass + ':is(.' + pinClass + ',#ark-pin#ark-pin){' + X + '}'), 'the pinned rule carries x verbatim at (2,1,0)');
const again = C.buildNode({ t: 'p', x: X }, {}, doc);
assert.ok(again.className.includes(pinClass), 'the same declarations mint the same class (deterministic, deduplicated)');
console.log('PASS: buildNode mints x as one deterministic pinned atom.');

/* re-capture reads the pinned class back into x */
doc.body.appendChild(built);
const recaptured = plain(C.capture([built]));
assert.equal(recaptured.tree[0].x, X, 'capturing an instance carries its pinned styling forward as x');
assert.equal(recaptured.tree[0].s, undefined, 'never as a plain (0,1,0) atom');
assert.equal(recaptured.tree[0].c, 'title');
console.log('PASS: a re-capture keeps x.');

/* no scene, no context pass */
const fresh = plain(C.capture([doc.querySelector('h1.title')]));
assert.equal(fresh.tree[0].x, undefined, 'outside a scene there is no neutral spot to compare with, so no x is invented');
console.log('PASS: capture outside a scene adds nothing.');

/* old data: same bytes, same build */
const old = master([{ t: 'h1', c: 'captured-title', k: [{ p: 'heading' }] }]);
const text = C.serialize(old);
assert.ok(!/"x"/.test(text), 'no x appears in a definition that had none');
assert.equal(C.serialize(C.sanitize(old)), text, 'and it serializes to the same bytes');
assert.equal(C.buildNode(old.masters.m1.tree[0], { heading: 'Hi' }, doc).outerHTML, '<h1 class="captured-title">Hi</h1>', 'and builds exactly as before');
console.log('PASS: definitions captured before x existed are unchanged.');

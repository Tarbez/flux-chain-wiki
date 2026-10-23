/* Regression (2026-10-20): "Make into component" refuses a selection that spans two containers.

   Why this exists: the instance takes the selection's place -- the originals are hidden and the
   instance's anchor goes after the last selected layer. When /download became Ark blocks, its title
   sits in the hero and its intro paragraph in a tab panel; selecting both made the instance appear
   inside the tab while the hero silently lost its title (tests/browser/studio-flows.mjs makecomp).
   There is no single place to stand in for two containers, so the editor refuses and says how --
   it never moves content between containers. Layers side by side in one container still work. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const src = fs.readFileSync('js/main.js', 'utf8');
const start = src.indexOf('  function cmsComponentRefusal(elements) {');
const end = src.indexOf('  /* "Make into component": the selection becomes a reusable component', start);
assert(start >= 0 && end > start, 'js/main.js still defines cmsComponentRefusal before cmsMakeComponent');

function el(parent) {
  return { parentNode: parent, namespaceURI: 'http://www.w3.org/1999/xhtml', tagName: 'P',
    closest() { return null; }, querySelector() { return null; } };
}
const host = { id: 'host' };
const context = { host };
vm.createContext(context);
vm.runInContext(src.slice(start, end), context);
const refusal = vm.runInContext('cmsComponentRefusal', context);

const hero = { id: 'hero' }, panel = { id: 'panel' };
const title = el(hero), lede = el(hero), intro = el(panel);

assert.equal(refusal([title, lede]), '', 'two layers side by side in one container can become a component');
assert.equal(refusal([title]), '', 'one layer can become a component');
assert.match(refusal([title, intro]), /side by side in one container/, 'a selection across two containers is refused, and the refusal says what to select instead');
console.log('PASS: Make into component accepts layers that share a container and refuses a selection across containers, naming the fix.');

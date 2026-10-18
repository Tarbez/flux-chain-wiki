'use strict';
/* ArkLayout undoes only what ArkLayout wrote.

   Why this exists: ArkLayout.apply(host, ...) runs one rAF after every page mount over the
   WHOLE scene host, and its resetElement() used to blank every property in its `owned` list
   (width, height, display, ...) on every annotated element, whether ArkLayout had ever
   written it or not. The router's continuity host (js/ark/panel-continuity.js) lives inside
   that host and is sized purely by inline left/top/width/height -- so the reset wiped its
   width and height, and /about (whose page is position:absolute; inset:0 inside the host)
   rendered 0px wide at every viewport, by direct load and by in-app navigation alike. No
   saved override was involved: layout-data.js was empty. Every sample of the code read fine;
   it took a real browser measuring the box (tests/browser/route-sweep.mjs).

   Uses jsdom so the style object is a real CSSStyleDeclaration (an unset property reads '',
   a write is normalized), not a plain-object stub. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><div id="host"><div class="page"><h1>Title</h1></div><div class="continuity-host"></div></div>');
const { window } = dom;
const context = vm.createContext({ document: window.document, window, WeakMap });
vm.runInContext(fs.readFileSync('js/content/layout.js', 'utf8'), context);
const ArkLayout = vm.runInContext('ArkLayout', context);

const host = window.document.getElementById('host');
const runtimeBox = host.querySelector('.continuity-host');
const heading = host.querySelector('h1');
const empty = ArkLayout.sanitize({ version: 2, routes: {}, groups: {} });

/* 1. Geometry the page runtime wrote survives an apply() that has nothing to apply. */
Object.assign(runtimeBox.style, { left: '0px', top: '84px', width: '1280px', height: '668px' });
ArkLayout.apply(host, '/about', 1280, empty);
assert.equal(runtimeBox.style.width, '1280px', 'apply() with no override leaves a runtime-sized box its width (the /about 0px defect)');
assert.equal(runtimeBox.style.height, '668px', 'and its height');
ArkLayout.apply(host, '/about', 1280, empty);
assert.equal(runtimeBox.style.width, '1280px', 'a second pass (resize, re-mount) does not wipe it either');
console.log('PASS: apply() never blanks inline geometry it did not write.');

/* 2. An override replaces the page's own inline value while it exists, and removing the
      override restores the page's value -- not '' (which would discard what the module wrote). */
heading.style.width = '420px';
const key = heading.getAttribute('data-ark-layout-key');
assert.ok(key, 'the heading was annotated by the first apply()');
let layout = ArkLayout.set(empty, '/about', key, 'desktop', { width: 300, color: 'text-strong' });
ArkLayout.apply(host, '/about', 1280, layout);
assert.equal(heading.style.width, '300px', 'the override wins while it exists');
assert.equal(heading.style.color, 'hsl(var(--text-strong))');
layout = ArkLayout.remove(layout, '/about', key);
ArkLayout.apply(host, '/about', 1280, layout);
assert.equal(heading.style.width, '420px', "removing the override restores the page module's own inline width");
assert.equal(heading.style.color, '', 'and clears the colour it alone wrote');
assert.equal(heading.hasAttribute('data-ark-layout-applied'), false);
console.log('PASS: removing an override restores what the page wrote before it.');

/* 3. A value someone else changed after ArkLayout wrote it is theirs: a later reset must not
      overwrite it with ArkLayout's remembered "before". */
layout = ArkLayout.set(empty, '/about', key, 'desktop', { width: 300 });
ArkLayout.apply(host, '/about', 1280, layout);
heading.style.width = '512px'; /* e.g. a runtime animation settling */
ArkLayout.apply(host, '/about', 1280, empty);
assert.equal(heading.style.width, '512px', "a value changed since ArkLayout's write is left alone");
console.log('PASS: a reset never clobbers a value written after ArkLayout\'s own.');

/* 4. The direct applyFrame() path the CMS uses for live edits follows the same rule. */
const box = window.document.createElement('div');
box.style.display = 'grid';
ArkLayout.applyFrame(box, { display: 'row' });
assert.equal(box.style.display, 'flex');
ArkLayout.applyFrame(box, {});
assert.equal(box.style.display, 'grid', "applyFrame() with an empty frame restores the element's own display");
console.log('PASS: applyFrame() restores the element\'s own values on reset.');

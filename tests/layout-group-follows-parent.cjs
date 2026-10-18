'use strict';
/* Regression: grouping two links of the header's navigation (a flex ROW) wrapped them in a
   group that was always a flex COLUMN -- the pair stacked 80px tall inside a 40px bar and
   the first link disappeared from view, the moment "Group selection" was clicked. Seen in a
   real browser (tests/browser/full-audit.mjs, layout-group surface screenshot); every group
   test passed because each used fake elements with no layout. The wrapper now takes its
   direction (and gap/alignment) from the parent's own computed layout: a row stays a row,
   anything else keeps the column default. An explicit Layout override on the group still wins.
   Runs the real js/content/layout.js against jsdom. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(`<!doctype html><style>
  nav { display: flex; flex-direction: row; gap: 12px; align-items: center; }
  .stack { display: block; }
</style><body><div id="root"><nav><a>One</a><a>Two</a><a>Three</a></nav><div class="stack"><p>A</p><p>B</p></div></div></body>`, { runScripts: 'outside-only' });
dom.window.eval(fs.readFileSync('js/content/layout.js', 'utf8'));
const { ArkLayout, document } = dom.window;
const root = document.getElementById('root');
ArkLayout.annotate(root);
const key = (sel, i) => root.querySelectorAll(sel)[i].getAttribute('data-ark-layout-key');
let layout = ArkLayout.sanitize({ version: 2, routes: {}, groups: {} });
layout = ArkLayout.group(layout, '/', 'links', [key('nav > a', 0), key('nav > a', 1)], 'Links');
layout = ArkLayout.group(layout, '/', 'paras', [key('.stack > p', 0), key('.stack > p', 1)], 'Paragraphs');
ArkLayout.apply(root, '/', 1280, layout);

const links = root.querySelector('[data-ark-layout-group="links"]');
assert(links && links.parentElement.tagName === 'NAV', 'the two links are grouped inside the nav');
assert.equal(links.style.display, 'flex');
assert.equal(links.style.flexDirection, 'row', 'a group inside a flex row stays a row');
assert.equal(links.style.gap, '12px', 'and keeps the row\'s spacing');
const paras = root.querySelector('[data-ark-layout-group="paras"]');
assert.equal(paras.style.flexDirection, 'column', 'a group inside block flow keeps the column default');

ArkLayout.apply(root, '/', 1280, layout);
assert.equal(root.querySelector('[data-ark-layout-group="links"]').style.flexDirection, 'row', 'a re-apply keeps the row');
layout = ArkLayout.set(layout, '/', 'group:links', 'desktop', { display: 'stack' });
ArkLayout.apply(root, '/', 1280, layout);
assert.equal(root.querySelector('[data-ark-layout-group="links"]').style.flexDirection, 'column', 'an explicit Layout override on the group still wins');
console.log('PASS: a layout group keeps the row/column arrangement its parent gave its members.');

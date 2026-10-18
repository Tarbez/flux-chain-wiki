'use strict';
/* Regression: the Design canvas's Pages tab listed every route as a bare <li> with a click
   handler -- no role, no tabindex -- so a keyboard user could not open a page from it at all,
   and the full-audit sweep (tests/browser/full-audit.mjs, which looks for buttons) found
   nothing there to press. Each row is now role="button", focusable, and opens on Enter/Space.
   Runs the real renderPages() from js/admin/admin.js against jsdom. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const admin = require('./lib/admin-source.cjs').ADMIN;
const start = admin.indexOf('  function renderPages() {');
const end = admin.indexOf('  function showLeft(', start);
assert(start >= 0 && end > start, 'js/admin/admin.js still defines renderPages() before showLeft()');
const { window } = new JSDOM('<!doctype html><div id="pagesPane"><ul id="pages"></ul></div>');
const opened = [];
const context = { document: window.document, $: (id) => window.document.getElementById(id), ic: () => '', realLinkIndex: () => [],
  state: { cmsRoutes: [{ path: '/', title: 'Home' }, { path: '/download', title: 'Download' }], cmsCurrentRoute: '/' }, /* shared state, js/admin/state.js */ openRoute: (p) => opened.push(p), Map };
vm.createContext(context);
vm.runInContext(admin.slice(start, end) + '\nrenderPages();', context);
const rows = [...window.document.querySelectorAll('#pages li')];
assert.equal(rows.length, 2);
for (const li of rows) { assert.equal(li.getAttribute('role'), 'button'); assert.equal(li.tabIndex, 0, 'each page row is reachable by Tab'); }
rows[1].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
assert.deepEqual(opened, ['/download'], 'Enter on a page row opens that page');
console.log('PASS: Pages rows are keyboard-operable buttons.');

'use strict';
/* Regression: the Encrypted content editor rendered NOTHING. renderSecretEditor() builds its
   two explanatory paragraphs as h('p', { class: 'hint' }, 'The body is AES-GCM ...') -- a
   string child -- and the editor's DOM builder h() passed every child straight to
   appendChild(), which throws on a string. The throw aborted the render, so a new encrypted
   item could not be opened, written or encrypted at all. Nothing but a real click showed it
   (tests/browser/full-audit.mjs, "encrypted: create, encrypt, Save, reload, decrypt,
   delete"); every logic test of the secret store passed. Fixed once in h() -- a string child
   becomes a text node -- so the same mistake anywhere else in the editor cannot recur.
   Runs the real h() from js/admin/admin.js against jsdom. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const admin = fs.readFileSync('js/admin/admin.js', 'utf8');
const start = admin.indexOf('  function h(tag, props) {');
const end = admin.indexOf('  function clone(value)', start);
assert(start >= 0 && end > start, 'js/admin/admin.js still defines h() right before clone()');

const { window } = new JSDOM('<!doctype html><body></body>');
const context = { document: window.document };
vm.createContext(context);
vm.runInContext(admin.slice(start, end) + '\nthis.h = h;', context);
const { h } = context;

const p = h('p', { class: 'hint' }, 'Encrypted for ', h('b', { text: '2' }), ' recipients.');
assert.equal(p.textContent, 'Encrypted for 2 recipients.', 'string children render as text, in order, beside element children');
assert.equal(p.className, 'hint');
assert.equal(h('div', {}, null, false, '').childNodes.length, 0, 'empty/absent children are still skipped');

/* the two calls that crashed are still written with string children -- which is now fine */
assert(/h\('p', \{ class: 'hint' \}, 'The body is AES-GCM/.test(admin), 'the secret editor still describes its encryption in a hint paragraph');
console.log('PASS: h() renders string children as text, so the Encrypted editor renders.');

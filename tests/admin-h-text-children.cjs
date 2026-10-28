'use strict';
/* Regression: the Encrypted content editor rendered NOTHING. renderSecretEditor() builds its
   two explanatory paragraphs as h('p', { class: 'hint' }, 'The body is AES-GCM ...') -- a
   string child -- and the editor's DOM builder h() passed every child straight to
   appendChild(), which throws on a string. The throw aborted the render, so a new encrypted
   item could not be opened, written or encrypted at all. Nothing but a real click showed it
   (tests/browser/full-audit.mjs, "encrypted: create, encrypt, Save, reload, decrypt,
   delete"); every logic test of the secret store passed. Fixed once in h() -- a string child
   becomes a text node -- so the same mistake anywhere else in the editor cannot recur.
   Runs the real h() from js/admin/admin.js against jsdom. Also locks the confirmed hint wording
   (owner-confirmed 2026-10-27): plain words on who can open it; the cipher under devDetails. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const admin = require('./lib/admin-source.cjs').ADMIN;
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

/* the call that crashed is still written with a string child -- which is now fine. Since
   2026-10-22 (docs/ux-audit/cms.md P1-2, owner-confirmed 2026-10-27) the hint says who can open
   the item, and the AES-GCM / nacl box detail sits under Developer details (devDetails). */
assert(/h\('p', \{ class: 'hint' \}, 'Only the people you add as readers below can open this/.test(admin), 'the secret editor still says who can open it, in a hint paragraph with a string child');
assert(!/h\('p', \{ class: 'hint' \}, '[^']*AES-GCM/.test(admin), 'no hint paragraph names the cipher: that is a developer detail');
assert(/devDetails\(\[\['Body', 'AES-GCM ciphertext'\]/.test(admin), 'the AES-GCM detail is kept, under Developer details');
console.log('PASS: h() renders string children as text, so the Encrypted editor renders.');

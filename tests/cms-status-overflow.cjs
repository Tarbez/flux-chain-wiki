'use strict';
/* Regression: docs/ux-audit/cms.md P1-16 (ledger PARTIAL until 2026-10-20). The editor said things
   in four places and the header's one-line status slot cut them to a few characters ("New page. Edit
   it, th...", "Loaded ..."), so the sentence that mattered could not be read anywhere. Held here:
     - a status message that does not fit the header slot ALSO appears in full in the editor's one
       notice (key "status"), in the tone it was said in (a refusal is a warning/danger notice);
     - a message that fits stays in the header alone: no second copy of every "Saved." ;
     - the next message that fits retires the notice of the previous long one (no stale sentence);
     - the header still carries the full text (title and textContent), so nothing that read it moves.
   jsdom has no layout, so the slot's measured widths are stubbed on the element. */
const assert = require('node:assert/strict');
const { bootForms } = require('./lib/admin-forms-dom.cjs');

const { document, A } = bootForms();
const el = document.getElementById('status');
const slot = (scroll, client) => { Object.defineProperty(el, 'scrollWidth', { value: scroll, configurable: true }); Object.defineProperty(el, 'clientWidth', { value: client, configurable: true }); };

slot(80, 80);
A.status('Saved.', 'ok');
assert(!document.querySelector('[data-notice="status"]'), 'a message that fits is not copied into a notice');

slot(520, 90);
const long = 'Loaded version #4 as unsaved drafts. Save to make it current: it is recorded as a new version.';
A.status(long, 'warn');
const n = document.querySelector('[data-notice="status"]');
assert(n, 'a message the slot cuts is also a notice');
assert.equal(n.querySelector('.notice-body').textContent, long, 'with its whole sentence');
assert.equal(n.dataset.tone, 'warning', 'in the tone it was said in');
assert.equal(el.textContent, long, 'the header still carries the full text');

A.status('Reverted.', 'ok'); slot(60, 90);
A.status('Reverted.', 'ok');
assert(!document.querySelector('[data-notice="status"]'), 'a later message that fits retires the long one\'s notice');
console.log('PASS: a status message the header slot cuts is also shown in full in the one notice; one that fits stays in the header.');

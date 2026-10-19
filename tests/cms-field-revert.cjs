'use strict';
/* "Revert to saved" in the toolbar's Content section: the explicit, visible, undoable way back
   that Escape used to be.

   Why this exists (docs/ux-audit/cms.md P0-2): Escape on the canvas silently put the old words
   back -- typing gone, no message, no undo. Escape now finishes the edit and KEEPS the words
   (js/main.js cmsInlineKey; tests/cms-content-lens.cjs), so going back needs its own control:
     - it reads the field's SAVED value (editor.js fieldValue(kind, id, key, true)), never a copy
       the toolbar kept;
     - it is refused, saying why, when there is nothing to go back to: the words are the saved
       ones, or the page was never saved;
     - it writes through the one field write (applyCmsCopyEdit -> setItemField), and says so in a
       notice whose Undo puts the typed words back.
   Runs the real editor.js / notice.js in jsdom (tests/lib/admin-forms-dom.cjs) and the real
   revertFieldButton() cut from js/admin/toolbar-sections.js. */
const assert = require('node:assert/strict');
const { bootForms } = require('./lib/admin-forms-dom.cjs');
const { functionSource } = require('./lib/admin-source.cjs');

const { window, document, A, state } = bootForms();
const edits = [];
A.provide({ renderList: () => {}, applyCmsCopyEdit: (edit) => { edits.push(edit); const [area, role] = [edit.field.split('.')[0].toLowerCase(), edit.field.split('.').slice(1).join('.')]; return A.setItemField('page', area, role, edit.value); } });
window.A = A; window.refuse = A.refuse;
window.eval(functionSource('revertFieldButton', require('node:fs').readFileSync('js/admin/toolbar-sections.js', 'utf8')) + ';window.revertFieldButton = revertFieldButton;');

/* ---- fieldValue: the draft, or the saved copy ---- */
const saved = A.fieldValue('page', 'home', 'EYEBROW', true);
assert.equal(typeof saved, 'string');
assert.equal(A.fieldValue('page', 'home', 'EYEBROW', false), saved, 'the fixture starts saved');
assert.equal(A.fieldValue('page', 'home', 'NO.SUCH', true), undefined, 'a field the page does not have has no value');

const content = { kind: 'page', id: 'home', fieldKey: 'EYEBROW', field: 'HOME.EYEBROW', label: 'Eyebrow' };
let button = window.revertFieldButton(content);
assert.equal(button.textContent, 'Revert to saved');
assert.equal(button.disabled, true, 'nothing to revert: refused');
assert.match(button.title, /^Nothing to revert: /, 'and says why');

/* ---- typed on the canvas, then reverted ---- */
A.setItemField('page', 'home', 'EYEBROW', saved + ' typed');
button = window.revertFieldButton(content);
assert.equal(button.disabled, false, 'changed words can be reverted');
button.click();
assert.equal(state.drafts.home.fields.EYEBROW.value, saved, 'Revert puts the saved words back in the draft');
assert.deepEqual(edits.map((e) => [e.field, e.value, e.final]), [['HOME.EYEBROW', saved, true]], 'through the one field write');
const told = document.querySelector('[data-notice="field-reverted"]');
assert(told && /Reverted “Eyebrow” to its saved words/.test(told.textContent), 'Revert says what it did');
[...told.querySelectorAll('[data-part="alert-action"]')].find((b) => b.textContent === 'Undo').click();
assert.equal(state.drafts.home.fields.EYEBROW.value, saved + ' typed', 'the notice\'s Undo brings the typed words back');

/* ---- a page never saved has nothing to go back to ---- */
A.createPage('fresh');
const fresh = window.revertFieldButton({ kind: 'page', id: 'fresh', fieldKey: 'TITLE', field: 'FRESH.TITLE', label: 'Heading' });
assert.equal(fresh.disabled, true);
assert.match(fresh.title, /has not been saved yet/, 'an unsaved page says it has no saved words yet');

console.log('PASS: "Revert to saved" reads the saved field, refuses when there is nothing to go back to, writes through the one field write and offers Undo.');

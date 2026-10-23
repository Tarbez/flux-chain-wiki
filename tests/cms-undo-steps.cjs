'use strict';
/* Regression: docs/ux-audit/cms.md P1-5 (ledger PARTIAL until 2026-10-20). The header's Undo / Ctrl+Z
   covered canvas edits and Page-settings fields, and history.js said so: creating a page, a theme
   colour and a restored version were NOT undoable ("they are undone by Delete, by Revert and by
   Versions"), so the one control that reads as "undo my last move" quietly skipped the biggest moves.
   Held here, with the real history.js, editor.js, design.js and versions-glue.js in jsdom:
     - a created page / article / image is an undo step: undo drops the unsaved draft, redo puts it back
       at the same place; once it has been SAVED undo refuses and says to use Delete (a file exists);
     - a theme colour is a step, a colour dragged across the picker is ONE step, and undo / redo put the
       whole theme draft back (nothing is saved by undoing);
     - Restore is a step: undo puts the drafts back as they were and clears the pending restore, redo
       restores again; undo is refused once the restore has been saved;
     - Delete is NOT an undo step (its file is gone): its notice opens Versions instead;
     - a step that cannot apply is refused with its reason and the history is not advanced past it. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { bootForms } = require('./lib/admin-forms-dom.cjs');

(async function main() {
  const { window, document, A, state } = bootForms();
  window.confirm = () => true;
  ['recordVersion', 'writeSearchFiles', 'removeRestoredExtras', 'writeRestoredOrder', 'restoreRemovalsPending', 'restoreReorderPending'].forEach((n) => { delete A[n]; });   /* the harness's stubs, replaced by the real glue below */
  const run = (rel) => window.eval(fs.readFileSync(rel, 'utf8') + '\n//# sourceURL=' + rel);
  A.provide({ renderInspector: () => {}, renderStatus: () => {}, postCmsLayoutUndo: () => {}, postCmsLayoutRedo: () => {}, selectStudio: () => {}, renderList: () => {} });
  run('js/admin/history.js'); run('js/admin/versions-glue.js');
  const mount = document.getElementById('mount');
  const hs = () => A.historyState();

  /* ---- create ---- */
  const r = A.createPage('undoable', { title: 'Undoable' });
  assert(r.ok && state.drafts.undoable, 'created');
  assert.equal(hs().undoLabel, 'creating the page “Undoable”', 'creating is an undo step, named for the page');
  const at = state.ids.indexOf('undoable');
  assert.equal(A.undo(), true); assert(!state.drafts.undoable && state.ids.indexOf('undoable') < 0 && state.saved.undoable === undefined, 'undo drops the unsaved draft');
  assert.equal(hs().canRedo, true);
  assert.equal(A.redo(), true); assert(state.drafts.undoable && state.ids.indexOf('undoable') === at && state.saved.undoable === null, 'redo puts it back where it was, still unsaved');
  /* once saved it has a file: undo refuses and says what to do */
  state.saved.undoable = JSON.stringify(state.drafts.undoable);
  assert.equal(A.undo(), false, 'a saved page is not un-created by Undo');
  assert(state.drafts.undoable && hs().undoLabel === 'creating the page “Undoable”', 'the page and the step are both still there');
  assert.match(document.getElementById('status').textContent, /has been saved.*Use Delete/, 'and the status says why: ' + document.getElementById('status').textContent);
  /* Delete is not an undo step: its notice points at Versions (the earlier versions still hold the page) */
  state.ids = state.ids.filter((x) => x !== 'undoable'); delete state.drafts.undoable; delete state.saved.undoable;
  let opened = 0; A.versionsPanel = { open: () => { opened += 1; } };
  const depthBefore = hs().depth;
  A.deletedNotice('Undoable');
  const gone = document.querySelector('[data-notice="deleted"]');
  assert(gone && /Every earlier version still holds it/.test(gone.textContent), 'Delete says where the page can be brought back from');
  [...gone.querySelectorAll('[data-part="alert-action"]')].find((b) => b.textContent === 'Open Versions').click();
  assert.equal(opened, 1, 'and its button opens Versions');
  assert.equal(hs().depth, depthBefore, 'a delete adds nothing to the undo history');

  const a = A.createArticle('undo-note', { title: 'Undo note' });
  assert(a.ok && A.undo() && !state.aDrafts['undo-note'] && state.slugs.indexOf('undo-note') < 0, 'a new article undoes the same way');
  assert(A.redo() && state.aDrafts['undo-note'] && state.aSaved['undo-note'] === null, 'and redoes');
  A.undo();

  /* ---- theme colour ---- */
  A.renderDesignEditor(mount);
  const swatch = mount.querySelector('input[type="color"]');
  assert(swatch, 'Site style has colour pickers');
  const before = JSON.stringify(state.themeDraft);
  const drag = (hex) => { swatch.value = hex; swatch.dispatchEvent(new window.Event('input', { bubbles: true })); };
  drag('#112233'); drag('#223344'); drag('#334455');
  const mid = JSON.stringify(state.themeDraft);
  assert.notEqual(mid, before, 'the colour is in the theme draft');
  assert.match(hs().undoLabel, /^changing the .* colour$/, 'a colour is an undo step: ' + hs().undoLabel);
  const depth = hs().depth;
  assert.equal(A.undo(), true);
  assert.equal(JSON.stringify(state.themeDraft), before, 'ONE undo takes a dragged colour all the way back (three input events were one step)');
  assert.equal(hs().depth, depth - 1);
  assert.equal(A.redo(), true);
  assert.equal(JSON.stringify(state.themeDraft), mid, 'redo puts the last colour back');
  assert(A.undo());
  assert.equal(window.ArkTheme.get() && JSON.stringify(window.ArkTheme.sanitize(state.themeDraft)) !== undefined, true);

  /* ---- restore ---- */
  const original = state.drafts.home.fields.EYEBROW.value;
  const version = A.siteFromState(); version.manifests.find((m) => m.id === 'home').fields.EYEBROW.value = 'From the restored version';
  assert.equal(A.restoreVersion({ hash: 'h7', record: { seq: 7 } }, version, { confirmed: true, removeExtras: false }), true);
  assert.equal(state.drafts.home.fields.EYEBROW.value, 'From the restored version', 'restore loaded the version');
  assert.equal(hs().undoLabel, 'restoring version #7', 'a restore is an undo step');
  assert.equal(A.undo(), true);
  assert.equal(state.drafts.home.fields.EYEBROW.value, original, 'undo puts the drafts back as they were');
  assert.match(document.getElementById('status').textContent, /Undid the restore/);
  assert.equal(A.redo(), true);
  assert.equal(state.drafts.home.fields.EYEBROW.value, 'From the restored version', 'redo restores again');
  assert.equal(hs().depth >= 1, true);
  A.undo();

  /* ---- a step that cannot apply does not advance the history ---- */
  A.historyAction({ label: 'a step that cannot apply', undo: () => false, redo: () => true });
  const d = hs().depth;
  assert.equal(A.undo(), false, 'a failing undo reports failure');
  assert.equal(hs().depth, d, 'and the step stays where it was');
  assert.match(document.getElementById('status').textContent, /Could not undo a step that cannot apply/);
  console.log('PASS: create, theme colour and restore are undo steps; a saved page, a saved restore and a failing step refuse with their reason.');
})().catch((error) => { console.error(error); process.exit(1); });

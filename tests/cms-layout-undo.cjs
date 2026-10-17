'use strict';
/* No layout/style edit in connected Studio (Frame, Layout, Spacing, Typography, Fill, Size,
   Effects, group, ungroup, align, distribute) ever reached the admin page's own undo stack --
   they all post straight to the preview iframe, which never recorded anything. cmsSnapshot/
   cmsRestore/cmsUndo/cmsRedoLayout close that gap inside js/main.js, next to cmsLayoutDraft,
   so every operation type is covered by one mechanism. Extracted verbatim (not reimplemented)
   and run against stubbed dependencies, same reasoning as tests/cms-group-selection.cjs: the
   real file touches `document`/`window` at its own top level and can't load whole in a
   DOM-free vm context. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const src = fs.readFileSync('js/main.js', 'utf8');
const start = src.indexOf('  function cmsSnapshotLayout() {');
const end = src.indexOf('  function beginCmsLayoutAction(');
assert(start >= 0 && end > start, 'js/main.js still defines cmsSnapshotLayout..cmsRedoLayout next to beginCmsLayoutAction');
const extracted = src.slice(start, end);

function makeContext(initialDraft) {
  const posted = [];
  const context = {
    window: { parent: {} }, location: { origin: 'https://defxn.example' },
    ArkLayout: { define: (v) => JSON.parse(JSON.stringify(v)), apply: () => {} },
    host: {}, cmsRoutePath: () => '/', cmsPreviewSelected: null,
    placeCmsLayoutUi: () => {}, emitCmsLayoutSelection: () => {}, cmsRealTree: () => [],
    cmsLayoutDraft: initialDraft, cmsLayoutUndo: [], cmsLayoutRedo: [],
  };
  context.window.parent.postMessage = (message) => posted.push(message);
  context.window.innerWidth = 1280;
  vm.createContext(context);
  vm.runInContext(extracted, context);
  return { context, posted };
}

/* A snapshot captures the state BEFORE a change, so undo restores exactly that; redo moves
   forward again to exactly what undo just left. */
(function basicRoundTrip() {
  const { context, posted } = makeContext({ version: 2, routes: {}, groups: {} });
  vm.runInContext('cmsSnapshotLayout()', context);
  context.cmsLayoutDraft = { version: 2, routes: { '/': { a: { desktop: { x: 10 } } } }, groups: {} };
  assert.equal(context.cmsLayoutUndo.length, 1, 'one edit pushes one undo entry');

  vm.runInContext('cmsUndoLayout()', context);
  assert.deepEqual(context.cmsLayoutDraft, { version: 2, routes: {}, groups: {} }, 'undo restores the pre-edit snapshot');
  assert.equal(context.cmsLayoutUndo.length, 0);
  assert.equal(context.cmsLayoutRedo.length, 1, 'the pre-undo state moves to the redo stack');

  vm.runInContext('cmsRedoLayout()', context);
  assert.deepEqual(context.cmsLayoutDraft, { version: 2, routes: { '/': { a: { desktop: { x: 10 } } } }, groups: {} }, 'redo restores exactly the state undo moved away from');
  assert.equal(context.cmsLayoutRedo.length, 0);

  assert(posted.some((m) => m.type === 'defxn-cms-preview-layout-replace'), 'restoring sends the resulting layout back up so admin.js stays in sync for Save');
  console.log('PASS: undo restores the pre-edit snapshot; redo restores exactly what undo moved away from.');
})();

/* A new edit after undoing must clear the redo stack -- the standard "no redoing a branch
   you've abandoned" rule every other undo system in this app already follows. */
(function newEditClearsRedo() {
  const { context } = makeContext({ version: 2, routes: {}, groups: {} });
  vm.runInContext('cmsSnapshotLayout()', context);
  context.cmsLayoutDraft = { version: 2, routes: { '/': { a: { desktop: { x: 1 } } } }, groups: {} };
  vm.runInContext('cmsUndoLayout()', context);
  assert.equal(context.cmsLayoutRedo.length, 1);
  vm.runInContext('cmsSnapshotLayout()', context);
  assert.equal(context.cmsLayoutRedo.length, 0, 'a fresh snapshot clears any pending redo');
  console.log('PASS: a new edit after undo clears the redo stack.');
})();

/* Undo/redo on an empty stack must no-op, not throw -- the toolbar buttons are only disabled
   client-side; a stray Ctrl+Z with nothing to undo must be harmless. */
(function emptyStackIsHarmless() {
  const { context, posted } = makeContext({ version: 2, routes: {}, groups: {} });
  vm.runInContext('cmsUndoLayout()', context);
  vm.runInContext('cmsRedoLayout()', context);
  assert.equal(posted.length, 0, 'undo/redo with nothing recorded does not even report a history change, let alone touch the draft');
  console.log('PASS: undo/redo with an empty stack is a harmless no-op.');
})();

/* After every snapshot and every restore, the parent is told whether undo/redo is now
   available, so the toolbar buttons reflect it instead of staying permanently enabled. */
(function reportsHistoryAvailability() {
  const { context, posted } = makeContext({ version: 2, routes: {}, groups: {} });
  vm.runInContext('cmsSnapshotLayout()', context);
  let last = posted.filter((m) => m.type === 'defxn-cms-preview-layout-history').pop();
  assert.deepEqual([last.canUndo, last.canRedo], [true, false], 'after one edit, undo is available and redo is not');
  vm.runInContext('cmsUndoLayout()', context);
  last = posted.filter((m) => m.type === 'defxn-cms-preview-layout-history').pop();
  assert.deepEqual([last.canUndo, last.canRedo], [false, true], 'after undoing the only edit, redo is available and undo is not');
  console.log('PASS: history availability is reported after every snapshot and restore.');
})();

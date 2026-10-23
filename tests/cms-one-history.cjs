'use strict';
/* ONE undo history for the editor (js/admin/history.js).

   Why this exists (docs/ux-audit/cms.md P1-5): Undo meant different things in different places.
   The header's undo covered only layout and style ("Nothing to undo: no layout or style edit on the
   canvas yet."), text typed on the canvas undid only with Ctrl+Z inside it, an edit in Page
   settings could not be undone at all, and the footer said "no undo" while the header's Undo was
   enabled. Now every edit is one entry in one timeline, in the order it was made: the canvas's own
   entries (it keeps their snapshots and reports each one) interleaved with fields written from the
   editor's forms -- and Undo takes back the newest, whichever kind it is.
   Runs the real history.js against recorded stand-ins for the canvas and setItemField. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function boot() {
  const calls = [], provided = {};
  const A = {
    state: { drafts: { home: { title: 'Home', fields: { TITLE: { label: 'Heading' } } } }, aDrafts: {} },
    later: (name) => (...args) => provided[name](...args),
    provide(names) { Object.assign(A, names); },
  };
  Object.assign(provided, {
    postCmsLayoutUndo: () => calls.push('canvas-undo'), postCmsLayoutRedo: () => calls.push('canvas-redo'),
    /* the real setItemField records a field edit through historyField unless the history is applying */
    setItemField: (kind, id, key, value) => { calls.push(['write', kind, id, key, value]); A.historyField(kind, id, key, 'whatever', value); return { ok: true }; },
    renderInspector: () => {}, renderStatus: () => {},
  });
  const context = { window: { ArkAdmin: A }, Date };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/admin/history.js', 'utf8'), context);
  return { A, calls };
}

{
  const { A, calls } = boot();
  assert.equal(A.historyState().canUndo, false, 'nothing to undo at first');
  A.historyCanvasPush('the text edit');                       /* typed on the canvas */
  A.historyField('page', 'home', 'TITLE', 'Old', 'New');      /* typed in Page settings */
  A.historyCanvasPush('the style or layout edit');            /* a style change */
  assert.equal(A.historyState().undoLabel, 'the style or layout edit', 'Undo names the newest edit');
  A.undo(); A.undo(); A.undo();
  assert.deepEqual(calls, ['canvas-undo', ['write', 'page', 'home', 'TITLE', 'Old'], 'canvas-undo'], 'undo walks back in the order the edits were made, each through the path that made it');
  assert.equal(A.historyState().canUndo, false);
  assert.equal(A.historyState().canRedo, true);
  calls.length = 0;
  A.redo(); A.redo();
  assert.deepEqual(calls, ['canvas-redo', ['write', 'page', 'home', 'TITLE', 'New']], 'redo replays forward');
  assert.equal(A.historyState().depth, 2, 'writing a value back is not a new entry');
  A.historyField('page', 'home', 'TITLE', 'New', 'Newer');
  assert.equal(A.historyState().canRedo, false, 'a new edit ends what could be redone');
  console.log('PASS: canvas edits and form edits share one undo history, undone in order, each by the path that made it.');
}

{
  const { A } = boot();
  A.historyField('page', 'home', 'TITLE', 'A', 'AB');
  A.historyField('page', 'home', 'TITLE', 'AB', 'ABC');      /* the next keystroke: same field, no pause */
  assert.equal(A.historyState().depth, 1, 'typing in one field is one entry until a pause');
  assert.match(A.historyState().undoLabel, /Heading.*Home/, 'the entry is named by the field and its page');
  A.historyField('page', 'home', 'TITLE', 'ABC', 'A');       /* typed back to where it began */
  assert.equal(A.historyState().depth, 0, 'an edit typed back to its start leaves nothing to undo');
  console.log('PASS: keystrokes in one field merge into one entry.');
}

{
  const { A, calls } = boot();
  A.historyField('page', 'home', 'TITLE', 'A', 'B');
  A.historyCanvasPush('the text edit');
  A.historyCanvasReset();                                    /* the canvas loaded another page */
  assert.equal(A.historyState().depth, 1, 'the canvas entries go with the page they were made on');
  A.undo();
  assert.deepEqual(calls, [['write', 'page', 'home', 'TITLE', 'A']], 'the form edit is still undoable after the canvas moved on');
  console.log('PASS: the canvas loading another page drops only its own entries.');
}

{
  /* the canvas forwards Ctrl/Cmd+Z instead of undoing on its own, and reports each new entry */
  const main = fs.readFileSync('js/main.js', 'utf8');
  assert(/type: 'defxn-cms-preview-undo-key', redo:/.test(main), 'the canvas forwards the undo key to the editor');
  assert(/cmsReportLayoutHistory\('push', 'the text edit'\)/.test(main) && /cmsReportLayoutHistory\('push', 'the style or layout edit'\)/.test(main), 'the canvas reports every new entry');
  const bridge = fs.readFileSync('js/admin/bridge.js', 'utf8');
  assert(/if \(event\.data\.reason === 'push'\) historyCanvasPush\(event\.data\.label\);/.test(bridge), 'the editor mirrors each canvas entry');
  assert(/historyCanvasReset\(\);/.test(bridge), 'a route change ends the canvas entries');
  const canvas = fs.readFileSync('js/admin/canvas.js', 'utf8');
  assert(!/'undo available' : 'no undo'/.test(canvas) && !/cmsLayoutCanUndo/.test(canvas), 'the footer no longer states an undo of its own that can disagree with the header');
  console.log('PASS: the canvas forwards its undo key and reports its entries; the footer keeps no second undo state.');
}

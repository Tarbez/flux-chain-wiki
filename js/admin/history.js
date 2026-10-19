/* =====================================================================
   ADMIN EDITOR · THE ONE UNDO HISTORY (js/admin/history.js)
   ---------------------------------------------------------------------
   Owns: undo(), redo(), historyState() -- one timeline of every edit, in the order the person
   made it, behind the header's Undo / Redo, Ctrl/Cmd+Z in the editor AND Ctrl/Cmd+Z on the
   canvas (js/main.js forwards the key here). Two kinds of entry share it:
     canvas   an edit the canvas preview made and keeps the snapshot of (typed words, a style,
              a frame, a group) -- js/main.js reports each one ('layout-history', reason
              'push'); undoing it asks the canvas to undo its own top entry
     field    a field written from one of the editor's own forms (Page settings, the toolbar's
              Content section, Revert to saved) through setItemField() -- undone here by writing
              the value back through the same setItemField(); typing in one field is ONE entry
              until the person pauses or moves to another field
   Why it exists (docs/ux-audit/cms.md P1-5): the header's undo covered only layout and style
   ("Nothing to undo: no layout or style edit on the canvas yet") while text typed on the canvas
   undid only with Ctrl+Z inside it, a Page settings edit not at all, and the footer said
   "no undo" while the header's undo was enabled.
   Limits, said rather than hidden: the canvas keeps its snapshots per page it has loaded, so
   its entries end when the canvas shows another page (historyCanvasReset, js/admin/bridge.js)
   while form edits stay undoable; creating or deleting a page, a theme colour and a restored
   version are not entries (they are undone by Delete, by Revert and by Versions).
   Must not: keep a second copy of a draft (the canvas holds its snapshots, setItemField the
   value) or apply an edit any other way than the path that made it.
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state;
  /* defined by files loaded after this one: resolved when called */
  var postCmsLayoutUndo = A.later('postCmsLayoutUndo'), postCmsLayoutRedo = A.later('postCmsLayoutRedo'),
      setItemField = A.later('setItemField'), renderInspector = A.later('renderInspector'), renderStatus = A.later('renderStatus');

  var MERGE_MS = 1500, LIMIT = 200;
  var undoStack = [], redoStack = [];
  var applying = false;   /* an undo/redo is writing: its own write is not a new entry */

  function changed() { try { renderInspector(); renderStatus(); } catch (e) { /* the header is not drawn yet */ } }
  function push(entry) {
    undoStack.push(entry); if (undoStack.length > LIMIT) undoStack.shift();
    redoStack.length = 0;
    changed();
  }
  /* the canvas made an edit and kept its snapshot (js/admin/bridge.js, 'layout-history' push) */
  function historyCanvasPush(label) { push({ kind: 'canvas', label: label || 'the canvas edit' }); }
  /* the canvas loaded another page: its snapshots went with the old one */
  function historyCanvasReset() {
    var keep = function (e) { return e.kind !== 'canvas'; };
    undoStack = undoStack.filter(keep); redoStack = redoStack.filter(keep);
    changed();
  }
  /* a field written from one of the editor's own forms (js/admin/editor.js setItemField) */
  function historyField(kind, id, key, before, after) {
    if (applying || before === after) return;
    var top = undoStack[undoStack.length - 1], now = Date.now();
    if (top && top.kind === 'field' && top.itemKind === kind && top.id === id && top.key === key && now - top.at < MERGE_MS && !redoStack.length) {
      top.after = after; top.at = now;
      if (top.before === top.after) undoStack.pop();
      changed(); return;
    }
    push({ kind: 'field', itemKind: kind, id: id, key: key, before: before, after: after, at: now, label: 'the edit to ' + fieldName(kind, id, key) });
  }
  function fieldName(kind, id, key) {
    var item = kind === 'page' ? state.drafts[id] : kind === 'article' ? state.aDrafts[id] : null;
    var f = kind === 'page' && item && item.fields ? item.fields[key] : null;
    return (f && f.label ? '“' + f.label + '”' : 'a field') + (item && item.title ? ' on ' + item.title : '');
  }
  function apply(entry, side) {
    if (entry.kind === 'canvas') { if (side === 'before') postCmsLayoutUndo(); else postCmsLayoutRedo(); return; }
    applying = true;
    try { setItemField(entry.itemKind, entry.id, entry.key, entry[side]); } finally { applying = false; }
  }
  function undo() {
    var entry = undoStack.pop(); if (!entry) return false;
    redoStack.push(entry); apply(entry, 'before'); changed(); return true;
  }
  function redo() {
    var entry = redoStack.pop(); if (!entry) return false;
    undoStack.push(entry); apply(entry, 'after'); changed(); return true;
  }
  function historyState() {
    var u = undoStack[undoStack.length - 1], r = redoStack[redoStack.length - 1];
    return { canUndo: !!u, canRedo: !!r, undoLabel: u ? u.label : '', redoLabel: r ? r.label : '', depth: undoStack.length };
  }
  A.provide({ historyCanvasPush: historyCanvasPush, historyCanvasReset: historyCanvasReset, historyField: historyField,
      historyState: historyState, redo: redo, undo: undo });
})();

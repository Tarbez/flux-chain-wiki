/* =====================================================================
   ADMIN EDITOR · ENTRY (js/admin/admin.js) -- loads last
   ---------------------------------------------------------------------
   Edits the page manifests in js/content/manifests/ and the articles in
   js/content/articles/, the same files the site reads its words from. With the project
   folder connected, Save writes the file in place; without it, Save downloads the file
   to drop into that folder. Nothing here knows any page's words: the form is built from
   each manifest's own fields. Publish sends the whole site to the mesh through the
   local publish host (scripts/publish-host.mjs); the owner key that signs it never
   leaves this browser (js/admin/publish.js).
   The editor is one file per concern under js/admin/ (core.js explains the module
   contract; state.js holds the shared state). This file starts it: the save shortcut,
   the unsaved-work warning, the public test surface window.ArkAdminApp, and the first
   load. Must not: grow features -- they belong in the file that owns their concern.
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, anyDirty = A.anyDirty, siteFromState = A.siteFromState,
      measureChecks = A.measureChecks, clone = A.clone, saveEverything = A.saveEverything,
      loadBodies = A.loadBodies, adoptArticles = A.adoptArticles, renderList = A.renderList,
      refreshMesh = A.refreshMesh, ensureVersionBaseline = A.ensureVersionBaseline,
      connectCanvas = A.connectCanvas, showLeft = A.showLeft, setLens = A.setLens;

  /* The editor's public surface, for the locked page and the browser tests. `unsaved`: the
     locked page asks before it signs out over unsaved work. */
  /* `site` is read-only: exactly what Publish would send right now (a fresh copy). The
     publish round-trip browser test (tests/browser/publish-flows.mjs) takes the real
     editor's payload from it instead of rebuilding one the editor might not send. */
  /* designCheck: the Design check's settled reading of the previewed page, the same run the
     button makes (tests/browser/design-check-stable.mjs runs it repeatedly on one page) */
  window.ArkAdminApp = { unsaved: function () { return anyDirty(); }, site: function () { return siteFromState(); },
    designCheck: function () { return measureChecks().then(function (checks) { return { settled: state.lastChecksSettled, checks: clone(checks) }; }); } };

  /* Step 5 (flickering-juggling-donut.md), the Ctrl/Cmd+S bug fix: this used to gate on
     currentDirty() (which, for state.kind === 'studio', only checked layout/components --
     missing states/canvas-transitions/element-motion, same defect as the old anyDirty())
     and then call saveCurrent(), which had NO branch for 'studio' at all and fell through
     to the generic single-page-save path using a stale state.current id -- silently doing
     the wrong thing while editing the visual canvas. It now gates on the fixed anyDirty()
     (true for ANY of the 13 drafts, regardless of which mode/kind is currently on screen)
     and calls saveEverything(), the one save action that is itself aware of every draft --
     so Ctrl/Cmd+S always does the right thing no matter which mode/kind is active. */
  document.addEventListener('keydown', function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key === 's') { event.preventDefault(); if (anyDirty()) saveEverything(); }
  });
  window.addEventListener('beforeunload', function (event) { if (anyDirty()) { event.preventDefault(); event.returnValue = ''; } });

  /* The first paint: the lens and its rail tab, then -- once every article body has loaded (a
     site without its articles would be sent to the canvas otherwise) -- the one canvas. Nothing
     else opens: no sheet, no form (the Page fields sheet opens only when asked for). */
  setLens(state.lens); showLeft(state.railTab[state.lens] || (state.lens === 'content' ? 'pages' : 'layers'), { remember: false });
  loadBodies(function () { adoptArticles(); state.articlesReady = true; connectCanvas(); renderList(); refreshMesh(); ensureVersionBaseline(); });
})();

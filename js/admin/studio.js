/* =====================================================================
   ADMIN EDITOR · STUDIO ENTRY AND DRAFT RELAY (js/admin/studio.js)
   ---------------------------------------------------------------------
   Owns: entering the visual canvas (selectStudio, renderStudioEditor), the real route
   list it shows (studioRoutes), and the applyStudio*() receivers that fold an edit the
   canvas preview computed (layout, components, states, canvas transitions, element
   motion) back into the drafts Save writes.
   Must not: compute an edit itself -- js/main.js inside the preview computes each one
   once; this only keeps the authoritative draft in step with it.
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, touch = A.touch, renderList = A.renderList, renderEditor = A.renderEditor,
      reloadPreview = A.reloadPreview, select = A.select, siteFromState = A.siteFromState, toast = A.toast;
  /* defined by files loaded after this one: resolved when called */
  var schedule = A.later('schedule'), syncCmsPreview = A.later('syncCmsPreview'),
      postCmsPreviewState = A.later('postCmsPreviewState'), layoutStage = A.later('layoutStage');

  function studioRoutes() {
    var seen = Object.create(null), out = [];
    Object.keys(ArkUI.pageCatalog || {}).forEach(function (key) {
      var def = ArkUI.pageCatalog[key] || {}, path = def.path;
      if (!path || seen[path]) return;
      seen[path] = true;
      out.push({ path: path, title: String(def.title || key).replace(/\s+[—-]\s+DEFXN.*$/, ''), seoId: def.seoId || '', seoArticle: def.seoArticle || '', key: key });
    });
    if (window.ArkSEO) ArkSEO.routes(state.ids.map(function (id) { return state.drafts[id]; }), state.slugs.map(function (slug) { return state.aDrafts[slug]; })).forEach(function (route) {
      if (!seen[route.path]) { seen[route.path] = true; out.push({ path: route.path, title: route.path === '/' ? 'Home' : route.path.split('/').filter(Boolean).pop().replace(/-/g, ' '), seoId: route.id || '', seoArticle: route.slug || '', key: '' }); }
    });
    return out.sort(function (a, b) { return a.path.localeCompare(b.path); });
  }
  /* Step 2 merge: sendStudioState()/sendStudioPreviewState() are deleted outright -- they
     used to push site state (siteFromState()) across the Studio<->Content-CMS document boundary
     via postMessage ('defxn-studio-load' on first connect, 'defxn-studio-preview-state' on
     every later refresh). That boundary no longer exists: renderStudioEditor() (below, next
     to the rest of the ported Studio code) reads siteFromState()/studioRoutes() directly,
     the same two calls these functions used to wrap in a message. */
  /* applyStudioPatches() (the receiver of the deleted Studio document's manifest/article/SEO
     patch relay) is deleted too: once that document was gone it had no caller, and Content
     mode's own editors mutate state.drafts/aDrafts/seoDraft directly. */
  function applyStudioLayoutPatch(patch) {
    if (!window.ArkLayout || !patch || typeof patch !== 'object' || !patch.route || (!patch.key && !patch.operation)) return;
    if (patch.operation === 'group') state.layoutDraft = ArkLayout.group(state.layoutDraft, patch.route, patch.id, patch.members || [], patch.label);
    else if (patch.operation === 'ungroup') state.layoutDraft = ArkLayout.ungroup(state.layoutDraft, patch.route, patch.id);
    else if (patch.operation === 'set-label') state.layoutDraft = ArkLayout.setLabel(state.layoutDraft, patch.route, patch.key, patch.label);
    else if (patch.operation === 'set-alt') state.layoutDraft = ArkLayout.setAlt(state.layoutDraft, patch.route, patch.key, patch.alt);
    else if (patch.reset) state.layoutDraft = ArkLayout.remove(state.layoutDraft, patch.route, patch.key, patch.breakpoint);
    else state.layoutDraft = ArkLayout.set(state.layoutDraft, patch.route, patch.key, patch.breakpoint || 'desktop', patch.frame || {});
    touch();
  }
  /* Studio's own Ctrl+Z/Ctrl+Shift+Z for layout/style edits is handled entirely inside the
     preview iframe (js/main.js keeps the undo/redo stacks next to cmsLayoutDraft, since every
     layout operation already converges there). This just keeps the authoritative copy here
     in sync with the result, the same way applyStudioLayoutPatch keeps it in sync with a
     forward edit, so Save still writes the post-undo state. */
  function applyStudioLayoutReplace(layout) {
    if (!window.ArkLayout || !layout || typeof layout !== 'object') return;
    state.layoutDraft = ArkLayout.sanitize(layout); touch();
  }
  /* Reusable component edits (js/content/components.js): every create-master/insert-
     instance/set-override/remove-instance/update-master command is computed once, inside
     the connected preview iframe (js/main.js's cmsComponentsCommand), and relayed up here
     as a whole-draft replace -- the same shape as applyStudioLayoutReplace above, not a
     second patch-application path recomputing the same mutation. */
  function applyStudioComponentsReplace(components) {
    if (!window.ArkComponents || !components || typeof components !== 'object') return;
    state.componentsDraft = ArkComponents.sanitize(components); touch();
  }
  /* Layered-state edits (js/content/states.js): every create-group/add-state/remove-
     state/set-trigger/set-default command is computed once, inside the
     connected preview iframe (js/main.js's cmsStatesCommand), and relayed up here as a
     whole-draft replace -- the exact same shape as applyStudioComponentsReplace above.
     The toolbar's "Preview" is NOT one of these: it only changes what the preview shows
     and never reaches this draft, so Save cannot turn a previewed state into the public
     default (regression: tests/cms-states-preview-default.cjs). */
  function applyStudioStatesReplace(states) {
    if (!window.ArkStates || !states || typeof states !== 'object') return;
    state.statesDraft = ArkStates.sanitize(states); touch();
  }
  /* Canvas-only mode's background transition (js/content/canvas-transitions.js):
     every field edit (effect/duration/easing) is computed once inside the connected
     preview iframe (js/main.js's cmsCanvasTransitionsCommand, the one document that
     actually has ArkCanvasTransitions loaded) and relayed up here as a whole-draft
     replace -- the exact same shape as applyStudioStatesReplace above. */
  function applyStudioCanvasTransitionsReplace(whole) {
    if (!window.ArkCanvasTransitions || !whole || typeof whole !== 'object') return;
    state.canvasTransitionsDraft = ArkCanvasTransitions.sanitize(whole); touch();
  }
  /* Animation-only mode's per-element overrides (js/content/element-motion.js): every
     field edit (direction/distance/duration/delay/easing) is computed once inside the
     connected preview iframe (js/main.js's cmsElementMotionCommand, the one document
     that actually has ArkElementMotion loaded) and relayed up here as a whole-draft
     replace -- the exact same shape as applyStudioCanvasTransitionsReplace above. */
  function applyStudioElementMotionReplace(whole) {
    if (!window.ArkElementMotion || !whole || typeof whole !== 'object') return;
    state.elementMotionDraft = ArkElementMotion.sanitize(whole); touch();
  }
  /* Step 5 (flickering-juggling-donut.md): saveStudioChanges() is deleted outright -- it
     covered 8 of the 13 real drafts (pages/articles/seo/layout/components/states/canvas-
     transitions/element-motion) in one pass, but wrapped the whole batch in a single
     try/catch, so one draft's validation error silently aborted every draft after it,
     unsaved, with no per-draft report. Its exact write logic for layout/components/states/
     canvas-transitions/element-motion (the 5 drafts with no dedicated per-item editor of
     their own) now lives inside saveEverything() (js/admin/save.js), alongside the other 8 drafts
     (pages/articles/assets/secrets/mesh-relief/theme/settings-defaults/seo) it never
     covered at all -- one function, all 13 drafts, each saved and reported independently. */
  function selectStudio() { state.kind = 'studio'; renderList(); renderEditor(); reloadPreview(); }
  /* reached through the header's #designSubSwitch (Canvas / Sitemap), wired next to setView() */

  /* =====================================================================
     Studio's own UI (Step 2 merge, 2026-10-17): ported from the old
     standalone admin-studio.html into this document's own scope -- since
     2026-10-18 split by concern across js/admin/ (this file, bridge.js,
     canvas.js, header.js, rail.js, toolbar-sections.js, toolbar.js,
     library.js, sitemap.js, design-check.js). Every postCmsX function
     (js/admin/bridge.js) still posts directly into the one real postMessage
     boundary that stays (cmsPreview, the real-site preview iframe) -- only
     the former Studio-document <-> editor hop is gone, replaced by direct
     calls into applyStudioLayoutPatch/applyStudioComponentsReplace/etc. above.
     ===================================================================== */
  /* Content mode on the current page's own editor. Studio's header used to carry a "Content
     CMS" button for this, a duplicate of the header's mode switch; the toolbar and Library
     actions that still jump there call this directly. */
  function openContentEditor() { select(state.current); }

  /* Step 2 merge: the standalone/embedded boot branches above (and the
     'defxn-studio-ready' handshake they used to end in) are deleted outright -- Studio is
     now rendered in-process by renderStudioEditor() (below), which does the equivalent first-entry setup (cmsConnected/cmsSourceSite/
     cmsRoutes/cmsCurrentRoute + the first layoutStage()/renderLayersPane()/renderInspector()/
     renderPageBtn()/renderStatus() paint) the moment state.kind actually becomes 'studio',
     instead of unconditionally at script-load time when there is nothing real to show yet
     (loadBodies() has not necessarily resolved articles/manifests at that point). */

  /* renderEditor()'s 'studio' branch (js/admin/editor.js): this used to inject a brand-new
     <iframe src="admin-studio.html">, so every Studio-internal state (cmsSourceSite,
     selection, device, view, etc.) reset on every visit and the real
     connection only happened once that iframe announced itself ready
     ('defxn-studio-load'/'defxn-studio-preview-state'). #studioRoot is now a static
     part of this document instead, so Studio's own state persists across visits (a
     side effect of removing the reload, not a regression); this function's only job
     is to refresh cmsSourceSite/cmsRoutes from the latest drafts on every entry, and to
     do the one-time first-connect setup (cmsCurrentRoute/undo-redo flags/the real
     preview iframe's first load) exactly once. */
  function renderStudioEditor() {
    state.cmsSourceSite = siteFromState();
    state.cmsRoutes = studioRoutes();
    if (!state.cmsConnected) {
      state.cmsConnected = true;
      state.cmsCurrentRoute = (state.cmsRoutes.find(function (r) { return r.path === '/'; }) || state.cmsRoutes[0] || { path: '/' }).path;
      state.cmsLayoutCanUndo = state.cmsLayoutCanRedo = false;
      schedule();
      syncCmsPreview(true);
      toast(state.cmsRoutes.length + ' real DEFXN routes loaded.');
    } else {
      schedule();
      postCmsPreviewState();
    }
    layoutStage();
  }
  A.provide({ applyStudioCanvasTransitionsReplace: applyStudioCanvasTransitionsReplace,
      applyStudioComponentsReplace: applyStudioComponentsReplace,
      applyStudioElementMotionReplace: applyStudioElementMotionReplace,
      applyStudioLayoutPatch: applyStudioLayoutPatch, applyStudioLayoutReplace: applyStudioLayoutReplace,
      applyStudioStatesReplace: applyStudioStatesReplace, openContentEditor: openContentEditor,
      renderStudioEditor: renderStudioEditor, selectStudio: selectStudio, studioRoutes: studioRoutes });
})();

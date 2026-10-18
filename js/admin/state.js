/* =====================================================================
   ADMIN EDITOR · SHARED STATE (js/admin/state.js)
   ---------------------------------------------------------------------
   Owns: `state`, the ONE object holding everything more than one editor file reads or
   writes: which mode/kind/item is on screen, every draft and its saved JSON (the per-id
   lists AND the single-object drafts: theme, settings defaults, SEO, mesh, layout,
   components, states, canvas transitions, element motion), the canvas preview's
   connection and selection, the open popover and toolbar section. And the dirty checks
   over those drafts: dirty/dirtyA/dirtyI/dirtyS, currentDirty, anyDirty.
   A variable only one file uses stays private to that file; one that two files touch
   lives here as state.<name> -- never a second copy, never passed around ad hoc.
   Must not: render, post messages, or save -- this is data and the checks over it.
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var clone = A.clone;
  /* defined by files loaded after this one: resolved when called */
  var reliefDirty = A.later('reliefDirty'), themeDirty = A.later('themeDirty'),
      settingsDefaultsDirty = A.later('settingsDefaultsDirty'), seoDirty = A.later('seoDirty'),
      singleDraftHandle = A.later('singleDraftHandle'),
      restoreRemovalsPending = A.later('restoreRemovalsPending'),
      restoreReorderPending = A.later('restoreReorderPending');

  /* ---- what is on screen, and the per-id drafts (pages, articles, images, encrypted items) ----
     Each list holds ids; drafts[id] is the edited copy, saved[id] the JSON of the saved one
     (null: never saved). */
  var state = { ids: ArkManifestIds.slice(), drafts: {}, saved: {}, current: null, dir: null,
                /* Step 3 (Design/Content mode switch, flickering-juggling-donut.md): mode is
                   one level ABOVE kind. contentKind/designKind remember which kind to land on
                   when re-entering each mode (so switching modes and back never loses a
                   selection or an in-progress draft -- nothing is torn down, kind's own state
                   -- state.current/aCurrent/etc. -- is untouched by a mode switch). mode starts
                   'design' to match kind's own existing default ('studio'); see kindMode(). */
                mode: 'design', contentKind: 'page', designKind: 'studio',
                kind: 'studio', slugs: [], aDrafts: {}, aSaved: {}, aCurrent: null, cdirs: null,
                assetIds: ArkAssetIds.slice(), assetDrafts: {}, assetSaved: {}, assetCurrent: null, assetDir: null,
                secretIds: ArkSecretIds.slice(), secretDrafts: {}, secretSaved: {}, secretCurrent: null, secretDir: null, secretPlaintext: {}, secretRecipientsText: {}, secretDecrypted: {},
                shapeIds: [], shapeLabels: {}, shapeCurrent: null };

  /* ---- the single-object drafts ---------------------------------------------------------
     Each is the live draft and, beside it, the JSON of its saved copy (what its dirty check
     compares against and what a version records). Which single drafts exist is ONE list,
     ArkAdminStore.drafts('single') (js/admin/store.js); singleDraftHandle() (js/admin/save.js)
     is how Save, Publish and the version history reach each of these. */
  /* the real layout, reusable components and layered states (js/content/layout.js,
     components.js, states.js): edited on the canvas, computed inside the preview, folded back
     here by the applyStudio*() receivers (js/admin/studio.js) */
  state.layoutDraft = window.ArkLayout ? ArkLayout.get() : { version: 1, routes: {} };
  state.layoutSaved = window.ArkLayout ? JSON.stringify(ArkLayout.sanitize(state.layoutDraft)) : JSON.stringify(state.layoutDraft);
  state.componentsDraft = window.ArkComponents ? ArkComponents.get() : { version: 1, masters: {}, routes: {} };
  state.componentsSaved = window.ArkComponents ? JSON.stringify(ArkComponents.sanitize(state.componentsDraft)) : JSON.stringify(state.componentsDraft);
  state.statesDraft = window.ArkStates ? ArkStates.get() : { version: 1, routes: {} };
  state.statesSaved = window.ArkStates ? JSON.stringify(ArkStates.sanitize(state.statesDraft)) : JSON.stringify(state.statesDraft);
  /* Canvas-only mode's background transition (Part G, follow-up plan) -- a single
     site-wide settings file, same draft/saved/dirty shape as layout/components/states
     above. Its editing UI is the canvas-transitions popover on the header's Background
     segment (#designBackgroundBtn), previewed on the canvas, but the actual persistence still goes through this exact
     draft-replace-then-save-on-next-Save-click pipeline: applyStudioCanvasTransitionsReplace
     keeps this in sync with every field edit Studio relays up, and saveEverything() (Step 5,
     flickering-juggling-donut.md -- superseded the old saveStudioChanges()) writes it the
     same way it writes states/components/layout. */
  state.canvasTransitionsDraft = window.ArkCanvasTransitions ? ArkCanvasTransitions.get() : { version: 1, effect: 'fade', outDuration: 220, inDuration: 260, easing: 'ease' };
  state.canvasTransitionsSaved = window.ArkCanvasTransitions ? JSON.stringify(ArkCanvasTransitions.sanitize(state.canvasTransitionsDraft)) : JSON.stringify(state.canvasTransitionsDraft);
  /* Animation-only mode's per-element animation overrides (Part H, follow-up plan) --
     same draft/saved/dirty shape as canvasTransitionsDraft above, addressed per route+
     key instead of one flat object. Its editing UI is the element-motion section of Studio's
     #selToolbar (js/admin/toolbar-sections.js), same not-a-separate-Design-tab-trip shape
     canvasTransitionsDraft's own comment describes, and persistence goes through this
     exact draft-replace-then-save-on-next-Save-click pipeline. */
  state.elementMotionDraft = window.ArkElementMotion ? ArkElementMotion.get() : { version: 1, routes: {} };
  state.elementMotionSaved = window.ArkElementMotion ? JSON.stringify(ArkElementMotion.sanitize(state.elementMotionDraft)) : JSON.stringify(state.elementMotionDraft);
  /* the shared relief tuning and each page's shape images (js/content/mesh-settings.js),
     edited in a page's Shape tab (js/admin/shapes.js) */
  state.meshDraft = (window.ArkMeshSettings && ArkMeshSettings.get()) || (window.ArkMeshSettings && ArkMeshSettings.defaults()) || { tuning: {}, pages: {} };
  state.meshSaved = window.ArkMeshSettings ? JSON.stringify(ArkMeshSettings.sanitize(state.meshDraft)) : null;
  /* the colour theme and the settings gear's site-wide defaults (js/content/theme.js,
     settings-defaults.js), edited in Theme & defaults (js/admin/design.js) */
  state.themeDraft = (window.ArkTheme && ArkTheme.get()) || (window.ArkTheme && ArkTheme.defaults()) || {};
  state.themeSaved = window.ArkTheme ? JSON.stringify(ArkTheme.sanitize(state.themeDraft)) : null;
  state.settingsDefaultsDraft = (window.ArkSiteDefaults && ArkSiteDefaults.get()) || (window.ArkSiteDefaults && ArkSiteDefaults.defaults()) || {};
  state.settingsDefaultsSaved = window.ArkSiteDefaults ? JSON.stringify(ArkSiteDefaults.sanitize(state.settingsDefaultsDraft)) : null;
  /* search and AI (js/content/seo.js), edited by every SEO panel (js/admin/seo.js) */
  state.seoDraft = (window.ArkSEO && ArkSEO.get()) || (window.ArkSEO && ArkSEO.defaults()) || { site: {}, pages: {}, articles: {} };
  state.seoSaved = window.ArkSEO ? JSON.stringify(ArkSEO.sanitize(state.seoDraft)) : null;

  /* every article body has loaded (loadBodies, js/admin/articles.js): until then the Content
     preview is sent no drafts, which would be a site without its articles */
  state.articlesReady = false;

  /* ---- the canvas preview: connection and what it reported -------------------------------
     Written by js/admin/bridge.js from the preview's messages (and by renderStudioEditor() on
     first entry); read by every canvas surface. */
  state.cmsConnected = false;
  /* the site the canvas preview renders: siteFromState(), with each relayed edit folded in */
  state.cmsSourceSite = null;
  /* the route the preview iframe was last pointed at (syncCmsPreview) */
  state.cmsPreviewRoute = '';
  /* the preview's selection (js/main.js's cmsSelectionInfo()): the primary one, and all of them */
  state.cmsExactSelection = null;
  state.cmsExactSelections = [];
  /* Real route list (studioRoutes(), js/admin/studio.js: deduplicated by path, {path, title,
     seoId, seoArticle, key} per route), replacing the deleted dense pages()/curPage. cmsCurrentRoute
     is a real path string ('/', '/journal', ...), not a dense id, and drives syncCmsPreview()'s
     iframe src and the Pages tab/sitemap. */
  state.cmsRoutes = [];
  state.cmsCurrentRoute = '/';
  /* true once the preview has reported 'defxn-cms-preview-ready' for what it was last sent (the design checks wait for it) */
  state.cmsPreviewReady = false;
  /* Frame/Layout/Spacing/Typography/Fill/Size/Effects edits, and group/ungroup/align/
     distribute, all post straight to the iframe and never touched this page's own
     undoStack/redoStack (the dense-node projection's own history, used for content edits) --
     so Ctrl+Z silently did nothing for any style or structural edit. The real undo history for
     these lives in the iframe next to cmsLayoutDraft (js/main.js), covering every operation
     uniformly; this page just relays the request and tracks whether one is available so
     undo()/redo() (js/admin/bridge.js) can try it first, and so the toolbar buttons reflect it. */
  state.cmsLayoutCanUndo = false;
  state.cmsLayoutCanRedo = false;
  /* Grouping lives in ArkLayout (the real DOM), not the CMS content tree the Layers tab
     walks, so a new group never showed up anywhere in the sidebar -- not a UI oversight, the
     two are genuinely different trees. This is that reflection: the iframe reports the
     current route's real groups on every selection/group/ungroup/ready message, and a group
     here is clickable to select it back in the canvas. */
  state.cmsGroups = [];
  /* Part B of the follow-up Studio plan: a real layers tree for connected mode. The iframe
     reports the current route's real DOM tree (js/main.js's cmsRealTree) on every ready/
     select/layout-change/components-replace message, the same "iframe reports its own real
     state" pattern cmsGroups above already uses -- never a separate poll. */
  state.cmsTree = [];
  /* Every place on the current page a Library block could be inserted, with whether a block
     there would be visible (js/main.js's cmsInsertionPoints) -- reported with every selection
     and components change, since "after the selection" depends on the selection. */
  state.cmsInsertPoints = [];
  /* What each state group on the previewed page is SHOWING ({ groupId: index }), reported by
     the preview -- separate from the draft's saved `current`, which is the group's default
     (js/main.js's cmsStatesShowing, regression: tests/cms-states-preview-default.cjs). */
  state.cmsStatesShowing = {};
  /* true while the preview's own right-click menu is open: the toolbar is drawn over the
     iframe where that menu opens and would swallow its clicks (js/main.js setCmsContextMenuOpen) */
  state.cmsContextMenuOpen = false;

  /* ---- the canvas view ------------------------------------------------------------------
     device: the breakpoint edited (an index into DEVICES, js/admin/canvas.js); live: Live
     (the page as a visitor uses it) instead of Edit; view: 'design' (the canvas) or 'map'
     (the sitemap). Set by the header's controls (js/admin/header.js) and setView()
     (js/admin/sitemap.js). */
  state.device = 0;
  state.live = false;
  state.view = 'design';

  /* ---- what one file opens and another closes or reads ----------------------------------
     popEl/popAnchor: the open header popover and the control it hangs from (openPop/closePop,
     js/admin/header.js). tbOpen/tbOpenKey/tbAutoOpen: the toolbar section open for which
     selection key, and an identity section waiting to open by itself (js/admin/toolbar.js; the
     preview protocol sets the last two when a selection is re-keyed or just made). libKey: the
     Library's repaint key ('' forces one; js/admin/library.js). lastChecksSettled: whether the
     last Design check reading was taken on a still page (js/admin/design-check.js).
     versionPreviewSite: a past version shown read-only from the Versions panel, which every
     preview reload keeps showing until "Back to current drafts" clears it
     (js/admin/versions-glue.js). */
  state.popEl = null;
  state.popAnchor = null;
  state.tbOpen = '';
  state.tbOpenKey = '';
  state.tbAutoOpen = null;
  state.libKey = '';
  state.lastChecksSettled = true;
  state.versionPreviewSite = null;

  /* ---- the dirty checks over those drafts, and the state they start from ---------------- */
  function layoutDirty() { return JSON.stringify(window.ArkLayout ? ArkLayout.sanitize(state.layoutDraft) : state.layoutDraft) !== state.layoutSaved; }
  function componentsDirty() { return JSON.stringify(window.ArkComponents ? ArkComponents.sanitize(state.componentsDraft) : state.componentsDraft) !== state.componentsSaved; }
  function statesDirty() { return JSON.stringify(window.ArkStates ? ArkStates.sanitize(state.statesDraft) : state.statesDraft) !== state.statesSaved; }
  function canvasTransitionsDirty() { return JSON.stringify(window.ArkCanvasTransitions ? ArkCanvasTransitions.sanitize(state.canvasTransitionsDraft) : state.canvasTransitionsDraft) !== state.canvasTransitionsSaved; }
  function elementMotionDirty() { return JSON.stringify(window.ArkElementMotion ? ArkElementMotion.sanitize(state.elementMotionDraft) : state.elementMotionDraft) !== state.elementMotionSaved; }
  if (window.ArkMeshSettings) ArkMeshSettings.pages().forEach(function (p) { state.shapeIds.push(p.id); state.shapeLabels[p.id] = p.label; });
  /* Shape pages are keyed by the catalog module id (zero, proximity, lab, about, concept), not
     the manifest id: 'home' the manifest is 'zero' the shape page; 'about' and 'concept' happen
     to already match. Pages with no manifest at all (proximity, lab -- the Demo/Lab pages) have
     no other editor, so they keep a shape entry of their own instead of being orphaned. */
  function shapePageId(manifestId) { return manifestId === 'home' ? 'zero' : manifestId; }
  function hasShape(manifestId) { return state.shapeIds.indexOf(shapePageId(manifestId)) >= 0; }
  function orphanShapeIds() {
    var mapped = state.ids.map(shapePageId);
    return state.shapeIds.filter(function (id) { return mapped.indexOf(id) < 0; });
  }
  state.ids.forEach(function (id) {
    var manifest = ArkManifest.get(id);
    state.drafts[id] = clone(manifest); state.saved[id] = JSON.stringify(manifest);
  });
  state.current = state.ids[0];
  state.assetIds.forEach(function (id) {
    var asset = ArkAsset.get(id);
    state.assetDrafts[id] = clone(asset); state.assetSaved[id] = JSON.stringify(asset);
  });
  state.secretIds.forEach(function (id) {
    var secret = ArkSecret.get(id);
    state.secretDrafts[id] = clone(secret); state.secretSaved[id] = JSON.stringify(secret);
  });

  /* Step 3: which top-level mode a given state.kind belongs to. 'studio' (the visual canvas)
     and 'design' (theme/settings-defaults) are Design mode's two sub-views; 'mesh' belongs to
     NEITHER mode -- it is a persistent header-level action (publish/deploy status), never
     editing, so visiting it must never change state.mode or state.contentKind/designKind.
     Every other kind is Content mode. */
  function kindMode(kind) { return kind === 'studio' || kind === 'design' ? 'design' : kind === 'mesh' ? null : 'content'; }
  /* Keeps state.mode and the contentKind/designKind "what to land on when this mode is
     re-entered" memory in sync with whatever state.kind actually is. Called from the top of
     renderList() -- which every select()/selectArticle()/selectDesign()/selectStudio()/
     setMode()/revert*()/delete*() call site already calls whenever state.kind changes -- so
     this one spot covers all of them without touching any of those existing functions, and
     runs before the nav re-renders so the mode switch and sub-switch below reflect the kind
     that was just set, not the previous render's mode. 'mesh' updates neither (see
     kindMode()): pressing Mesh must not silently change which mode you were in. */
  function syncMode() {
    var modeNow = kindMode(state.kind);
    if (modeNow === 'content') state.contentKind = state.kind;
    else if (modeNow === 'design') state.designKind = state.kind;
    if (modeNow) state.mode = modeNow;
  }

  function dirty(id) { return state.saved[id] === null || JSON.stringify(state.drafts[id]) !== state.saved[id] || (hasShape(id) && reliefDirty()); }
  function dirtyA(slug) { return state.aSaved[slug] === null || JSON.stringify(state.aDrafts[slug]) !== state.aSaved[slug]; }
  function dirtyI(id) { return state.assetSaved[id] === null || JSON.stringify(state.assetDrafts[id]) !== state.assetSaved[id]; }
  function dirtyS(id) { return state.secretSaved[id] === null || JSON.stringify(state.secretDrafts[id]) !== state.secretSaved[id]; }
  /* Step 5 (flickering-juggling-donut.md): currentDirty()'s 'studio' branch had the exact
     same 3-missing-checks defect as anyDirty() below -- states/canvasTransitions/
     elementMotion each already have a real dirty-check function, just never OR'd in here --
     so a dirty state/canvas-transition/element-motion draft left currentDirty() (and the
     Revert button's enabled state, its only remaining reader) falsely reporting clean. */
  function currentDirty() { return state.kind === 'article' ? dirtyA(state.aCurrent) : state.kind === 'asset' ? dirtyI(state.assetCurrent) : state.kind === 'secret' ? dirtyS(state.secretCurrent) : state.kind === 'design' ? (themeDirty() || settingsDefaultsDirty()) : state.kind === 'studio' ? (layoutDirty() || componentsDirty() || statesDirty() || canvasTransitionsDirty() || elementMotionDirty()) : state.kind === 'mesh' || state.kind === 'seo' ? false : dirty(state.current) || seoDirty(); }
  /* Step 5: anyDirty() backed the Publish gate and the beforeunload warning on all 13 real
     drafts except these 3 -- states/canvasTransitions/elementMotion each already have their
     own real dirty-check function (statesDirty()/canvasTransitionsDirty()/
     elementMotionDirty(), all defined above), just never OR'd in here. A dirty Studio
     states/canvas-transition/element-motion draft could be silently lost on Publish or on
     closing the tab. Fixed by adding the 3 missing checks, not by changing what any of them mean.
     The single-object drafts now come from ArkAdminStore.drafts('single') (js/admin/store.js),
     the same list Save and Publish use, so this cannot miss a draft a fourth time. */
  function anyDirty() { return state.ids.some(dirty) || state.slugs.some(dirtyA) || state.assetIds.some(dirtyI) || state.secretIds.some(dirtyS) || ArkAdminStore.drafts('single').some(function (d) { return singleDraftHandle(d.key).dirty(); }) || restoreRemovalsPending() || restoreReorderPending(); }
  A.provide({ anyDirty: anyDirty, canvasTransitionsDirty: canvasTransitionsDirty,
      componentsDirty: componentsDirty, currentDirty: currentDirty, dirty: dirty, dirtyA: dirtyA,
      dirtyI: dirtyI, dirtyS: dirtyS, elementMotionDirty: elementMotionDirty, hasShape: hasShape,
      layoutDirty: layoutDirty, orphanShapeIds: orphanShapeIds, shapePageId: shapePageId, state: state,
      statesDirty: statesDirty, syncMode: syncMode });
})();

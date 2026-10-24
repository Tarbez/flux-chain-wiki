/* =====================================================================
   ADMIN EDITOR · SHARED STATE (js/admin/state.js)
   ---------------------------------------------------------------------
   Owns: `state`, the ONE object holding everything more than one editor file reads or
   writes: the lens, the view and which item a form edits, every draft and its saved JSON (the per-id
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
                /* kind: which item the open form edits (page | article | asset | secret | shape) --
                   the Page fields sheet, the Media and Vault tabs, touch()/Revert/Delete all read
                   it. It is not a screen: the canvas is always there (state.view picks Canvas /
                   Sitemap / Theme, state.lens what a click on it edits). */
                kind: 'page', slugs: [], aDrafts: {}, aSaved: {}, aCurrent: null, cdirs: null,
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
     segment (#backgroundBtn), previewed on the canvas, but the actual persistence still goes through this exact
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
  /* The 3D world under every page (js/content/world.js): light, camera per route, flight and word
     timings, the first-visit story, exits. Edited in Design > World (js/admin/world.js) and
     previewed live in the canvas by its own message (notifyPreviewWorld, js/admin/bridge.js);
     the same draft/saved/dirty shape as the other single drafts. */
  state.worldDraft = window.ArkWorld ? ArkWorld.get() : { version: 1 };
  state.worldSaved = window.ArkWorld ? JSON.stringify(ArkWorld.sanitize(state.worldDraft)) : JSON.stringify(state.worldDraft);
  /* The skin policy (js/content/skin-policy.js): which rules a card skin may put on which part of the site.
     Edited in the Skin lab (js/admin/skin-lab.js), previewed on the canvas by its own message
     (notifyPreviewSkin, js/admin/bridge.js); the same draft/saved/dirty shape as the world. */
  state.skinPolicyDraft = window.ArkSkinPolicy ? ArkSkinPolicy.get() : { version: 1, allow: {}, families: {}, contrast: [] };
  state.skinPolicySaved = window.ArkSkinPolicy ? JSON.stringify(ArkSkinPolicy.sanitize(state.skinPolicyDraft)) : JSON.stringify(state.skinPolicyDraft);
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
  /* a route the canvas was asked for and could not open yet (an unsaved new page or article:
     the router learns addresses from the saved files) -- opened by itself after the next Save
     (js/admin/bridge.js routeRefused / reloadPreview) */
  state.cmsWantedRoute = '';
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
     (the page as a visitor uses it) instead of Edit; view: 'design' (the canvas), 'map'
     (the sitemap) 'theme' (Theme & defaults docked beside the canvas, which stays live) or 'world' (the 3D world's
     controls docked beside the canvas).
     Set by the header's controls (js/admin/header.js) and setView()
     (js/admin/sitemap.js); the device the canvas opens on is chosen by js/admin/canvas.js
     (initialDevice: the last explicit choice, else this screen's own breakpoint). */
  state.device = 0;
  state.live = false;
  state.view = 'design';

  /* ---- the lens: what a click on the canvas edits --------------------------------------
     'content' (the default when the editor opens: most edits are text) -- clicking text edits
     the manifest/article field it is bound to, the toolbar shows the Content section; 'design'
     -- the style toolbar, layers, groups, states, components. One canvas either way: the lens
     is posted to the preview as defxn-cms-preview-lens (js/admin/bridge.js) and decides which
     rail tab opens (railTab: the last tab used in each lens). Remembered per browser, a
     convenience only (js/admin/nav.js setLens writes it). */
  state.lens = 'content';
  try { if (localStorage.getItem('defxn-cms-lens') === 'design') state.lens = 'design'; } catch (e) { /* storage blocked: the default */ }
  state.railTab = { content: 'pages', design: 'layers' };
  try { var savedTabs = JSON.parse(localStorage.getItem('defxn-cms-rail-tab') || 'null'); if (savedTabs && typeof savedTabs === 'object') Object.keys(state.railTab).forEach(function (lens) { if (typeof savedTabs[lens] === 'string') state.railTab[lens] = savedTabs[lens]; }); } catch (e) { /* storage blocked or garbled: the defaults */ }

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
  /* the selection's commands as the canvas reports them (js/main.js cmsSelectionCommands): the
     toolbar's More menu draws them, the same list as the canvas's right-click menu */
  state.cmsSelectionCommands = [];
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
  function skinPolicyDirty() { return JSON.stringify(window.ArkSkinPolicy ? ArkSkinPolicy.sanitize(state.skinPolicyDraft) : state.skinPolicyDraft) !== state.skinPolicySaved; }
  function worldDirty() { return JSON.stringify(window.ArkWorld ? ArkWorld.sanitize(state.worldDraft) : state.worldDraft) !== state.worldSaved; }
  if (window.ArkMeshSettings) ArkMeshSettings.pages().forEach(function (p) { state.shapeIds.push(p.id); state.shapeLabels[p.id] = p.label; });
  /* Shape pages are keyed by the catalog module id (zero, about, concept), not
     the manifest id: 'home' the manifest is 'zero' the shape page; 'about' and 'concept' happen
     to already match. A page with no manifest at all would have no other editor, so it keeps a
     shape entry of its own instead of being orphaned. (The proximity and lab entries left with
     the /experiments page, the owner deleted it 2026-10-24; their saved data stays in
     js/content/mesh-settings-data.js, saved CMS data is never rewritten.) */
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

  function dirty(id) { return state.saved[id] === null || JSON.stringify(state.drafts[id]) !== state.saved[id] || (hasShape(id) && reliefDirty()); }
  function dirtyA(slug) { return state.aSaved[slug] === null || JSON.stringify(state.aDrafts[slug]) !== state.aSaved[slug]; }
  function dirtyI(id) { return state.assetSaved[id] === null || JSON.stringify(state.assetDrafts[id]) !== state.assetSaved[id]; }
  function dirtyS(id) { return state.secretSaved[id] === null || JSON.stringify(state.secretDrafts[id]) !== state.secretSaved[id]; }
  /* Step 5 (flickering-juggling-donut.md): currentDirty()'s 'studio' branch had the exact
     same 3-missing-checks defect as anyDirty() below -- states/canvasTransitions/
     elementMotion each already have a real dirty-check function, just never OR'd in here --
     so a dirty state/canvas-transition/element-motion draft left currentDirty() (and the
     Revert button's enabled state, its only remaining reader) falsely reporting clean. */
  function currentDirty() { return state.kind === 'article' ? dirtyA(state.aCurrent) : state.kind === 'asset' ? dirtyI(state.assetCurrent) : state.kind === 'secret' ? dirtyS(state.secretCurrent) : state.kind === 'design' ? (themeDirty() || settingsDefaultsDirty() || worldDirty()) : state.kind === 'studio' ? (layoutDirty() || componentsDirty() || statesDirty() || canvasTransitionsDirty() || elementMotionDirty()) : state.kind === 'mesh' || state.kind === 'seo' ? false : dirty(state.current) || seoDirty(); }
  /* Step 5: anyDirty() backed the Publish gate and the beforeunload warning on all 13 real
     drafts except these 3 -- states/canvasTransitions/elementMotion each already have their
     own real dirty-check function (statesDirty()/canvasTransitionsDirty()/
     elementMotionDirty(), all defined above), just never OR'd in here. A dirty Studio
     states/canvas-transition/element-motion draft could be silently lost on Publish or on
     closing the tab. Fixed by adding the 3 missing checks, not by changing what any of them mean.
     The single-object drafts now come from ArkAdminStore.drafts('single') (js/admin/store.js),
     the same list Save and Publish use, so this cannot miss a draft a fourth time. */
  function anyDirty() { return state.ids.some(dirty) || state.slugs.some(dirtyA) || state.assetIds.some(dirtyI) || state.secretIds.some(dirtyS) || ArkAdminStore.drafts('single').some(function (d) { return singleDraftHandle(d.key).dirty(); }) || restoreRemovalsPending() || restoreReorderPending(); }
  /* What is unsaved, counted the way a person names it, for the Save button (docs/ux-audit/cms.md P1-16: Save
     only went enabled or disabled, and no place said how much was waiting). The same drafts as anyDirty(). */
  function unsavedSummary() {
    var singles = ArkAdminStore.drafts('single').filter(function (d) { return singleDraftHandle(d.key).dirty(); }).length;
    var parts = [[state.ids.filter(dirty).length, 'page', 'pages'], [state.slugs.filter(dirtyA).length, 'article', 'articles'],
      [state.assetIds.filter(dirtyI).length, 'image', 'images'], [state.secretIds.filter(dirtyS).length, 'encrypted item', 'encrypted items'],
      [singles, 'site-wide setting', 'site-wide settings'], [restoreRemovalsPending() || restoreReorderPending() ? 1 : 0, 'restored version', 'restored versions']]
      .filter(function (p) { return p[0] > 0; });
    return { count: parts.reduce(function (n, p) { return n + p[0]; }, 0), words: parts.map(function (p) { return p[0] + ' ' + (p[0] === 1 ? p[1] : p[2]); }).join(', ') };
  }
  A.provide({ anyDirty: anyDirty, unsavedSummary: unsavedSummary, canvasTransitionsDirty: canvasTransitionsDirty,
      componentsDirty: componentsDirty, currentDirty: currentDirty, dirty: dirty, dirtyA: dirtyA,
      dirtyI: dirtyI, dirtyS: dirtyS, elementMotionDirty: elementMotionDirty, hasShape: hasShape,
      layoutDirty: layoutDirty, orphanShapeIds: orphanShapeIds, shapePageId: shapePageId, state: state,
      statesDirty: statesDirty, worldDirty: worldDirty, skinPolicyDirty: skinPolicyDirty });
})();

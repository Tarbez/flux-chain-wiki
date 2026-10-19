/* =====================================================================
   ADMIN EDITOR · STUDIO ENTRY AND DRAFT RELAY (js/admin/studio.js)
   ---------------------------------------------------------------------
   Owns: connecting the one canvas at startup (connectCanvas), the real route list it shows
   (studioRoutes), and the applyStudio*() receivers that fold an edit the
   canvas preview computed (layout, components, states, canvas transitions, element
   motion) back into the drafts Save writes.
   Must not: compute an edit itself -- js/main.js inside the preview computes each one
   once; this only keeps the authoritative draft in step with it.
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, touch = A.touch, siteFromState = A.siteFromState, toast = A.toast;
  /* defined by files loaded after this one: resolved when called */
  var schedule = A.later('schedule'), syncCmsPreview = A.later('syncCmsPreview'),
      layoutStage = A.later('layoutStage'), setView = A.later('setView'),
      setLens = A.later('setLens'), openPageFields = A.later('openPageFields'),
      pageFieldsFollow = A.later('pageFieldsFollow');

  function studioRoutes() {
    var seen = Object.create(null), out = [];
    Object.keys(ArkUI.pageCatalog || {}).forEach(function (key) {
      var def = ArkUI.pageCatalog[key] || {}, path = def.path;
      if (!path || seen[path]) return;
      seen[path] = true;
      out.push({ path: path, title: String(def.title || key).replace(/\s+[—-]\s+DEFXN.*$/, ''), seoId: def.seoId || '', seoArticle: def.seoArticle || '', key: key });
    });
    if (window.ArkSEO) ArkSEO.routes(state.ids.map(function (id) { return state.drafts[id]; }), state.slugs.map(function (slug) { return state.aDrafts[slug]; })).forEach(function (route) {
      /* a route only the drafts have (a page or article not saved yet) is named by its draft's own
         title -- the name the Pages rail and Page fields show -- not its slug: the canvas label said
         "pricing" over a page the rail called "Theory: Pricing" (docs/ux-audit/cms.md P0-1) */
      var draft = route.slug ? state.aDrafts[route.slug] : route.id ? state.drafts[route.id] : null;
      if (!seen[route.path]) { seen[route.path] = true; out.push({ path: route.path, title: (draft && draft.title) || (route.path === '/' ? 'Home' : route.path.split('/').filter(Boolean).pop().replace(/-/g, ' ')), seoId: route.id || '', seoArticle: route.slug || '', key: '' }); }
    });
    /* ONE name per page (docs/ux-audit/cms.md P1-3): a route a draft owns is called by the draft's
       title -- what Page settings edits and the Pages list shows -- in every surface that reads
       this list (the site map, the page SEO popover), never the catalog's longer SEO title */
    out.forEach(function (route) {
      var id = state.ids.filter(function (i) { return state.drafts[i] && state.drafts[i].route === route.path && state.drafts[i].group !== 'site'; })[0];
      var m = /^\/learnings\/([^/]+)$/.exec(route.path);
      var title = id ? state.drafts[id].title : m && state.aDrafts[m[1]] ? state.aDrafts[m[1]].title : '';
      if (title) route.title = title;
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
  /* The canvas is never torn down or re-entered: it is the workspace. These two names stay
     because the Versions panel, the toolbar and the Library call them: "show the canvas" and
     "edit this page's content". */
  function selectStudio() { setView('design'); }
  /* The toolbar's and the Library's "Open in Content": the Content lens, and this page's every
     field in the Page fields sheet -- transient, so it closes when the canvas moves to another
     page. (It used to switch to a second app, the Content CMS, and its own preview.) */
  function openContentEditor() { setLens('content'); openPageFields({ transient: true }); }

  /* Connect the one canvas, once, when the drafts have loaded (js/admin/admin.js): the site
     the preview renders (cmsSourceSite), the real routes, Home, and the first load of
     #cmsPreview. Every later draft change reaches it through notifyPreviewState() /
     reloadPreview() (js/admin/bridge.js). */
  function connectCanvas() {
    state.cmsSourceSite = siteFromState();
    state.cmsRoutes = studioRoutes();
    if (state.cmsConnected) return;
    state.cmsConnected = true;
    state.cmsCurrentRoute = (state.cmsRoutes.find(function (r) { return r.path === '/'; }) || state.cmsRoutes[0] || { path: '/' }).path;
    state.cmsLayoutCanUndo = state.cmsLayoutCanRedo = false;
    pageFieldsFollow(state.cmsCurrentRoute);   /* Home, not the site chrome that shares its route, is the page a form edits */
    schedule();
    syncCmsPreview(true);
    layoutStage();
  }
  A.provide({ applyStudioCanvasTransitionsReplace: applyStudioCanvasTransitionsReplace,
      applyStudioComponentsReplace: applyStudioComponentsReplace,
      applyStudioElementMotionReplace: applyStudioElementMotionReplace,
      applyStudioLayoutPatch: applyStudioLayoutPatch, applyStudioLayoutReplace: applyStudioLayoutReplace,
      applyStudioStatesReplace: applyStudioStatesReplace, connectCanvas: connectCanvas,
      openContentEditor: openContentEditor, selectStudio: selectStudio, studioRoutes: studioRoutes });
})();

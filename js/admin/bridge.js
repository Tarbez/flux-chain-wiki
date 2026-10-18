/* =====================================================================
   ADMIN EDITOR · CANVAS PREVIEW PROTOCOL (js/admin/bridge.js)
   ---------------------------------------------------------------------
   Owns: the one postMessage boundary left in the merged CMS -- the canvas preview iframe
   (#cmsPreview, the real site running js/main.js): every postCms*() message out, the
   one message listener in, schedule() (the batched repaint those messages trigger) and
   syncCmsPreview() (which route the iframe shows).
   Must not: build UI. A message updates state (state.cms*) and calls the renderers that
   own each surface (toolbar, layers, library, header, design check).
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, $ = A.$, toast = A.toast,
      applyStudioComponentsReplace = A.applyStudioComponentsReplace,
      applyStudioStatesReplace = A.applyStudioStatesReplace,
      applyStudioCanvasTransitionsReplace = A.applyStudioCanvasTransitionsReplace,
      applyStudioElementMotionReplace = A.applyStudioElementMotionReplace,
      applyStudioLayoutPatch = A.applyStudioLayoutPatch,
      applyStudioLayoutReplace = A.applyStudioLayoutReplace, anyDirty = A.anyDirty,
      saveEverything = A.saveEverything, siteFromState = A.siteFromState, studioRoutes = A.studioRoutes;
  /* defined by files loaded after this one: resolved when called */
  var renderLayersPane = A.later('renderLayersPane'), renderPages = A.later('renderPages'),
      renderLibrary = A.later('renderLibrary'), renderInspector = A.later('renderInspector'),
      renderPageBtn = A.later('renderPageBtn'), renderSitemap = A.later('renderSitemap'),
      renderStatus = A.later('renderStatus'), queueCheck = A.later('queueCheck'),
      refreshPop = A.later('refreshPop'), layoutStage = A.later('layoutStage'),
      openCanvasTransitionsPopover = A.later('openCanvasTransitionsPopover'),
      renderSelToolbar = A.later('renderSelToolbar'), openRoute = A.later('openRoute'),
      itemForRoute = A.later('itemForRoute');

  /* =========================================================================
     STEP 1 CLEANUP (2026-10-17): the dense typed-array document engine (node
     table, PROPS/PI, CSS compiler, theme tokens, pages()/linkIndex() over the
     dense tree) that used to live here has been deleted outright -- it backed
     only the standalone/disconnected prototype canvas, which the owner
     confirmed deleting. See the approved plan at the top of this session's
     work (flickering-juggling-donut.md). Sitemap and design-checks are ported
     below to read real data (cmsRoutes/cmsSourceSite) instead.
     ========================================================================= */

  /* =========================================================================
     Preview: the current page renders into a shadow root in the device frame
     ========================================================================= */
  const cmsPreview = $('cmsPreview');
  let rafQueued = false;
  /* STEP 1 CLEANUP: render() (the dense tree -> shadow-DOM builder) is deleted along with the
     rest of the standalone engine; schedule()'s one remaining job is to batch every
     connected-mode repaint into a single animation frame, same as before minus render() and
     the alive[curPage]/editingComp dense re-liveness checks. */
  function schedule() {
    if (rafQueued) return; rafQueued = true;
    requestAnimationFrame(() => {
      rafQueued = false;
      renderLayersPane(); renderPages(); renderLibrary(); renderInspector(); renderPageBtn();
      if (state.view === 'map') renderSitemap();
      renderStatus(); queueCheck(); refreshPop(); syncCmsPreview();
    });
  }
  /* Step 4 (flickering-juggling-donut.md): restrictMode (and its enter/exit/toggle, the
     #restrictBar banner, and the .canvas-mode/.anim-mode CSS classes) is retired outright,
     a deliberate decision rather than a default -- the plan explicitly asked for "ONE
     toolbar, not a toolbar PLUS a separate restricted-mode system bolted on the side."
     Canvas-transitions (site-wide, no selection to point a floating toolbar at) becomes
     openCanvasTransitionsPopover() (js/admin/header.js), reusing openPop()'s own positioning against
     the header's Background segment. Element-motion (per-element) folds into #selToolbar as one more
     accordion section (buildElementMotionSection()) shown for any real element selection --
     it never needed a separate "mode" at all: .anim-mode had no CSS rule of its own (grep
     confirms it), and the only thing entering it ever did beyond swapping the panel was
     land on the Layers tab, which selecting an element already does naturally. */
  /* =========================================================================
     DEFXN CMS bridge. The visual document is a projection of the real content
     registries; bindings on editable nodes point back to manifest/article keys.
     ========================================================================= */
  /* the preview's connection, selection and reports are shared state (state.cms*,
     js/admin/state.js): this file writes them from the messages below */
  /* STEP 1 CLEANUP: cmsRouteStatus/cmsManifestSections/cmsArticleSections/cmsSiteSpec and
     componentizeDefxn used to translate the real CMS payload (manifests/articles/SEO) into
     dense-tree page specs purely so this document's OWN dense-node text-editing UI (an
     "Authoritative content" textarea keyed by bindingOf()) could edit manifest/article/SEO
     fields through a second, invisible projection of the real content -- the dense `.frame`
     those nodes rendered into is never shown once connected (`.cms-connected .frame{display:
     none}`), and Content mode (the header's mode switch) already edits every one of
     those same manifest/article/SEO fields directly and visibly. That whole bridge -- the
     dense translation, bindingOf(), and collectCmsPatches()'s per-field value walk -- is
     deleted with Step 1 rather than ported: it duplicated Content CMS's own editors instead
     of being Studio-specific capability. Flagged plainly, same as the Versions/export
     deletion below: if the owner wants Studio to edit manifest/article/SEO text directly
     again, that is new work for a later step, not a port. */
  /* Step 2 merge: collectCmsPatches()/queueCmsSync() are deleted outright. They existed only
     to relay the (Step 1-deleted) dense manifest/article/SEO patch list up through
     window.parent.postMessage -- collectCmsPatches() already returned [] unconditionally
     (a stub), and queueCmsSync() had no caller left. There is no replacement because there
     is nothing left for either to do: a real manifest/article/SEO edit happens in Content
     CMS's own editors, which mutate state.drafts/state.seoDraft directly. */
  /* While the iframe is being pointed at another route, the page still in it must not be sent
     the drafts: after a delete it would receive a site without itself and remount from nothing
     ("page failed to load", tests/cms-preview-state-route.cjs). The post waits for the new
     route: its load handler sends it, or -- a fragment-only navigation fires no load -- the
     next ready does. */
  let navigating = false, postWaiting = false, arriving = '';
  /* The canvas was asked for `asked` and opened `shown` instead: the site's router knows a page's
     address from the SAVED files (the catalog, the article index), so a page or article that
     exists only as an unsaved draft cannot be routed to yet and the router falls back. Say so,
     with the remedy, and open it by itself after the next Save (reloadPreview). */
  function routeRefused(asked, shown) {
    state.cmsWantedRoute = asked;
    state.cmsCurrentRoute = state.cmsPreviewRoute = shown;
    A.status(asked + ' is not on the canvas yet: the site learns a new page\'s or article\'s address from the saved files, so it opens here once it is saved. Until then the canvas shows ' + shown + '; its words are in its Page fields.', 'warn');
    schedule();
  }
  function postCmsPreviewState() {
    if (!state.cmsConnected || !state.cmsSourceSite || !cmsPreview.contentWindow) return;
    if (navigating || state.cmsPreviewRoute !== (state.cmsCurrentRoute || '/')) { postWaiting = true; return; }
    postWaiting = false;
    /* versionPreviewSite: a past version shown read-only from the Versions panel, which every
       reload of the frame keeps showing until "Back to current drafts" clears it */
    state.cmsPreviewReady = false; /* the preview re-renders from this; the design checks wait for its ready */
    if (!state.versionPreviewSite) sentSignature = contentSignature(state.cmsSourceSite);
    cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-state', site: state.versionPreviewSite || state.cmsSourceSite }, window.location.origin);
  }
  /* ---- the drafts the canvas shows -----------------------------------------------------
     Content mode used to feed a second site iframe of its own (#frame, js/admin/preview.js,
     deleted 2026-10-18 with the two-app layout). Every content edit -- a form field, Media,
     Vault, Theme, a new or deleted page -- now reaches the ONE canvas here.
     Re-sent only when the CONTENT differs from what the canvas last received
     (contentSignature): the canvas-owned drafts (layout, components, states, canvas
     transitions, element motion) are computed inside the preview and relayed up through
     touch(), and re-sending them would remount the page under the very edit that produced
     them. Coalesced over 180 ms, so a typed word remounts the page once, not per key. The
     whole site is rebuilt from the drafts (siteFromState()) when it is sent, so the canvas
     never receives a stale copy of a draft another edit changed. */
  const CANVAS_OWNED = new Set(['layout', 'components', 'states', 'canvasTransitions', 'elementMotion']);
  let sentSignature = '', feedTimer = 0;
  function contentSignature(site) {
    const out = {};
    Object.keys(site || {}).forEach((key) => {
      if (CANVAS_OWNED.has(key)) return;
      /* an image's bytes are compared by length and tail, not stringified whole on every key press */
      out[key] = key === 'assets' ? (site.assets || []).map((a) => Object.assign({}, a, { dataBase64: a && a.dataBase64 ? a.dataBase64.length + ':' + a.dataBase64.slice(-48) : '' })) : site[key];
    });
    return JSON.stringify(out);
  }
  /* feedPending: a coalesced send is waiting (previewShowsDrafts must not swallow it) */
  let feedPending = false;
  function feedNow() {
    clearTimeout(feedTimer); feedPending = false;
    if (!state.cmsConnected || !state.articlesReady) return;
    const site = siteFromState();
    state.cmsRoutes = studioRoutes();
    if (contentSignature(site) === sentSignature) return;
    state.cmsSourceSite = site;
    postCmsPreviewState(); schedule();
  }
  function notifyPreviewState() {
    clearTimeout(feedTimer); feedPending = true;
    feedTimer = setTimeout(feedNow, 180);
  }
  /* The canvas already shows the drafts as they are now -- an edit typed INTO it (the Content
     lens's inline text): adopt them as sent, so the coalesced feed above does not remount the
     page under the caret. Call it after the draft is updated (touch()). */
  /* Another edit's send still waiting (a Page fields keystroke a moment before an inline commit)
     is not the canvas's yet: it goes now, carrying this edit too (the canvas re-renders in place),
     instead of being cancelled -- cancelling it lost that edit on the canvas (regression:
     tests/cms-preview-feed.cjs). */
  function previewShowsDrafts() {
    if (feedPending) { feedNow(); return; }
    clearTimeout(feedTimer);
    if (!state.cmsConnected) return;
    state.cmsSourceSite = siteFromState(); sentSignature = contentSignature(state.cmsSourceSite);
  }
  /* The site and routes the canvas will be sent, rebuilt from the drafts now -- before the canvas
     is pointed at a page that may exist only as an unsaved draft (a new page or article): its
     load handler sends this site. */
  function refreshCanvasSite() {
    clearTimeout(feedTimer); feedPending = false;
    state.cmsSourceSite = siteFromState(); state.cmsRoutes = studioRoutes();
  }
  /* Drafts changed structurally (a page or article added, deleted or restored; a Revert): the
     routes are re-derived and the canvas re-sent the site. If the page it shows no longer exists,
     it goes Home. */
  function reloadPreview() {
    if (!state.cmsConnected) return;
    clearTimeout(feedTimer); feedPending = false;
    state.cmsSourceSite = siteFromState(); state.cmsRoutes = studioRoutes();
    const wanted = state.cmsWantedRoute;
    if (wanted && (state.cmsRoutes.some((r) => r.path === wanted) || itemForRoute(wanted))) { state.cmsWantedRoute = ''; openRoute(wanted); }
    else if (!state.cmsRoutes.some((r) => r.path === state.cmsCurrentRoute)) openRoute('/');
    else postCmsPreviewState();
    schedule();
  }
  /* Live, without a remount: an image's new bytes (js/zero-webgl.js swaps the buffer for the
     asset id it uses), the mesh tuning and page shapes (same file), the colour theme
     (js/main.js). The coalesced full state above follows with the rest. */
  function postToCanvas(message) {
    if (!state.cmsConnected || !cmsPreview.contentWindow || state.versionPreviewSite) return;
    try { cmsPreview.contentWindow.postMessage(message, window.location.origin); } catch (error) { /* between routes: its load handler sends the full state */ }
  }
  function notifyPreviewAssets() {
    const assets = state.assetIds.map((id) => state.assetDrafts[id]).filter((a) => a && a.dataBase64);
    if (assets.length) postToCanvas({ type: 'flux-chain-preview-assets', assets });
  }
  function notifyPreviewMesh() { postToCanvas({ type: 'flux-chain-preview-mesh', settings: state.meshDraft }); }
  function notifyPreviewTheme() { postToCanvas({ type: 'flux-chain-preview-theme', theme: state.themeDraft }); }
  function postCmsPreviewMode() {
    if (!state.cmsConnected || !cmsPreview.contentWindow) return;
    cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-mode', mode: state.live ? 'live' : 'edit' }, window.location.origin);
  }
  /* The lens (state.lens; the header's #lensSwitch, js/admin/nav.js setLens): what a click on
     the canvas edits. Sent like the Edit/Live mode -- on every change, on every load, and after
     every ready (a remount rebuilds the page) -- so the canvas never acts in a lens the header
     does not show. */
  function postCmsPreviewLens() {
    if (!state.cmsConnected || !cmsPreview.contentWindow) return;
    cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-lens', lens: state.lens }, window.location.origin);
  }
  /* `key` is optional and only ever passed by the Layers panel's eye icon (Part B): it lets a
     hide toggle target a row that is not the current selection, reusing the exact same
     ArkLayout.set() mechanism (via js/main.js's setCmsLayoutFrameForKey) rather than first
     having to select that row. Every existing caller (Frame/Layout/Spacing/Typography/Fill/
     Size/Effects) omits it and keeps acting on cmsExactSelection, unchanged. */
  function postCmsLayoutCommand(frame, key) {
    if (!state.cmsConnected || !cmsPreview.contentWindow) return;
    cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-layout-command', frame, key }, window.location.origin);
  }
  function postCmsLayoutReset() {
    if (!state.cmsConnected || !cmsPreview.contentWindow) return;
    cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-layout-reset', breakpoint: ['desktop', 'tablet', 'phone'][state.device] }, window.location.origin);
  }
  function postCmsLayoutUndo() { if (!state.cmsConnected || !cmsPreview.contentWindow) return; cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-layout-undo' }, window.location.origin); }
  function postCmsLayoutRedo() { if (!state.cmsConnected || !cmsPreview.contentWindow) return; cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-layout-redo' }, window.location.origin); }
  /* STEP 1 CLEANUP: undo()/redo() used to fall back to this document's own dense undoStack/
     redoStack when the connected relay had nothing to undo; that dense op-log is deleted
     along with the rest of the standalone engine, so the only real undo history left is the
     one already relayed from the iframe (see the comment above). */
  function undo() { if (state.cmsLayoutCanUndo) postCmsLayoutUndo(); }
  function redo() { if (state.cmsLayoutCanRedo) postCmsLayoutRedo(); }
  function postCmsSelectGroup(id) { if (!state.cmsConnected || !cmsPreview.contentWindow) return; cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-select-group', id }, window.location.origin); }
  /* Select any annotated element by its stable key -- generalizes postCmsSelectGroup's
     existing message (select-by-group-id) rather than inventing a sibling message type, since
     js/main.js's handler for it is a two-line difference, not a different operation. */
  function postCmsSelectKey(key) { if (!state.cmsConnected || !cmsPreview.contentWindow) return; cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-select-group', key }, window.location.origin); }
  /* Rename a Layers panel row: writes through ArkLayout.setLabel inside the iframe, the same
     draft-mutate-then-relay shape every other layout edit already follows. */
  function postCmsSetLabel(key, label) { if (!state.cmsConnected || !cmsPreview.contentWindow) return; cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-set-label', route: state.cmsPreviewRoute, key, label }, window.location.origin); }
  /* a plain image's alt text, stored in ArkLayout.alts under the same route/key as every other per-element edit (js/main.js 'defxn-cms-preview-set-alt') */
  function postCmsSetAlt(key, alt) { if (!state.cmsConnected || !cmsPreview.contentWindow) return; cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-set-alt', route: state.cmsPreviewRoute, key, alt }, window.location.origin); }
  /* Delete/Backspace in connected mode: keyboard focus normally lives inside cmsPreview's own
     document once a real element is selected there (js/main.js gained its own keydown listener
     for that, Part A), so this parent handler's Delete/Backspace branch below only actually
     needs this for the one case where focus stayed in THIS document instead -- e.g. right
     after clicking a "Groups on this page" row, a parent-document button. js/main.js already
     knows the real selection (cmsPreviewSelected); this just asks it to act on it, the same
     "forward to the iframe" shape postCmsSelectGroup/postCmsLayoutOperation already use. */
  function postCmsRemoveSelection() { if (!state.cmsConnected || !cmsPreview.contentWindow) return; cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-remove-selection' }, window.location.origin); }
  function postCmsComponentsCommand(payload) {
    if (!state.cmsConnected || !cmsPreview.contentWindow) return;
    cmsPreview.contentWindow.postMessage(Object.assign({ type: 'defxn-cms-preview-components-command' }, payload), window.location.origin);
  }
  function cmsNextComponentId(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  /* Layered states (js/content/states.js): add-state/remove-state/remove-group/set-
     trigger/set-default/preview all post straight to the iframe, same shape as
     postCmsComponentsCommand above -- creating the group itself ("Make into states")
     is a direct call inside the iframe instead, since it acts on the selection that
     already lives there (see js/main.js's cmsMakeStates, mirroring cmsGroupSelection). */
  function postCmsStatesCommand(payload) {
    if (!state.cmsConnected || !cmsPreview.contentWindow) return;
    cmsPreview.contentWindow.postMessage(Object.assign({ type: 'defxn-cms-preview-states-command' }, payload), window.location.origin);
  }
  /* Canvas-only mode (Part G): a field edit (effect/duration/easing) posts straight to
     the iframe -- the exact same "this document has no copy of the real sanitize(),
     compute it once inside the iframe that does" shape as postCmsStatesCommand above --
     and "Preview this transition" is a separate one-shot message with no patch, handled
     entirely inside the iframe against its own persistent layer. */
  function postCmsCanvasTransitionsCommand(patch) {
    if (!state.cmsConnected || !cmsPreview.contentWindow) return;
    cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-canvas-transitions-command', patch }, window.location.origin);
  }
  function postCmsCanvasTransitionPreview() {
    if (!state.cmsConnected || !cmsPreview.contentWindow) return;
    cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-canvas-transitions-preview' }, window.location.origin);
  }
  /* Animation-only mode (Part H): the exact same shape as postCmsCanvasTransitionsCommand/
     postCmsCanvasTransitionPreview above, substituting element-motion's own route+key
     addressing (resolved inside the iframe from cmsPreviewSelected, the same selection
     cmsExactSelection here already mirrors) for canvas-transitions' single global object. */
  function postCmsElementMotionCommand(patch) {
    if (!state.cmsConnected || !cmsPreview.contentWindow) return;
    cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-element-motion-command', patch }, window.location.origin);
  }
  function postCmsElementMotionPreview(key) {
    if (!state.cmsConnected || !cmsPreview.contentWindow) return;
    cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-element-motion-preview', key }, window.location.origin);
  }
  function postCmsLayoutOperation(operation) {
    if (!state.cmsConnected || !cmsPreview.contentWindow) return;
    cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-layout-operation', operation }, window.location.origin);
  }
  /* STEP 1 CLEANUP: selectCmsPreviewKey() resolved a manifest-field key back to the (now
     deleted) dense bound node so the deleted "Authoritative content" textarea could edit it
     -- see the note above collectCmsPatches(). Deleted with it; the real Layers tree (Part B)
     already selects real elements by key via postCmsSelectKey/cmsExactSelection, unaffected. */
  function syncCmsPreview(force) {
    if (!state.cmsConnected) return;
    const route = state.cmsCurrentRoute || '/';
    if (force || state.cmsPreviewRoute !== route || !cmsPreview.getAttribute('src')) {
      state.cmsExactSelection = null; state.cmsExactSelections = [];
      /* The selection belonged to the old page, and so does the bar drawn for it: it goes now,
         not at the new page's ready (~1 s later). Until then it stayed drawn, and clickable,
         over the page being opened --
         a click on the new page's Overview link landed on the old bar's "Theme & defaults" and
         left Design mode (regression: tests/cms-route-change-hides-toolbar.cjs) */
      const staleBar = $('selToolbar'), stalePop = $('selToolbarPop');
      if (staleBar) staleBar.hidden = true;
      if (stalePop) stalePop.hidden = true;
      state.cmsPreviewRoute = route; state.cmsPreviewReady = false;
      navigating = true; arriving = route;
      cmsPreview.src = 'index.html?cms-preview=1#' + route;
    }
  }
  cmsPreview.addEventListener('load', () => { navigating = false; postCmsPreviewState(); postCmsPreviewMode(); postCmsPreviewLens(); layoutStage(); });

  /* Step 2 merge ("admin.js" below is the editor as it was then: one file): this used to be two listeners in two documents --
     admin-studio.html's own "window.addEventListener('message', ...)" (below, for messages
     FROM the real preview iframe, each one also relaying a mutation up to admin.js via a
     second window.parent.postMessage) PLUS admin.js's separate listener for messages FROM
     the Studio iframe (applyStudioPatches/applyStudioLayoutPatch/applyStudioComponentsReplace/
     etc., see saveStudioChanges() above). Now that Studio's code and admin.js's code share
     one scope, the only genuine postMessage boundary left is this one -- the real preview
     iframe (cmsPreview, js/main.js) -- so there is only one listener, and every "relay the
     mutation up to admin.js" line below is now a direct call to the exact same
     applyStudioXReplace/applyStudioLayoutPatch functions admin.js already defined (now js/admin/studio.js),
     in the same synchronous handler that also updates cmsSourceSite/cmsTree/cmsGroups and
     re-renders Studio's own UI -- one hop (iframe -> admin.js) instead of two
     (iframe -> Studio document -> admin.js). The old second branch
     (`if (event.source !== window.parent) return; ... 'defxn-studio-load'/'defxn-studio-
     preview-state'/'defxn-studio-saved'`) is deleted outright: those messages existed only
     to hand admin.js's state across the now-gone document boundary -- renderStudioEditor()
     (below) reads state.drafts / the various *Draft variables / siteFromState()
     directly instead. */
  /* ---- the Content lens: text edited on the canvas (js/main.js, "CONTENT LENS") ------------
     A copy-edit's `field` is the source field's address, derived in the preview:
       AREA.ROLE                 a manifest field (the copy key: HOME.TITLE -> page home, TITLE)
       article:<slug>/<path>     an article field (title, sections.0.1, questions.2)
       component:<anchor>/<instance>/<prop>  a component instance's prop -- its draft lives in the
                                 preview, which writes the override itself (set-override); here it
                                 only updates what the toolbar shows
     Pages and articles go through setItemField() (js/admin/editor.js), the one write every form
     uses, so dirty dots, Save, Revert, versions and every open form see the same edit.
     `canvasShows`: the canvas already shows this value -- typed into it, or Escape's revert,
     which put the words back itself. Then the draft (and state.cmsSourceSite) take it with no
     re-send, and previewShowsDrafts() records that the canvas has these drafts, so nothing
     rebuilds the page under the person typing and an inline commit never flashes the canvas.
     An undo/redo re-posted from the canvas history, and every edit from the toolbar's Content
     section, are NOT on the canvas yet: the site is re-sent, and the preview re-renders the
     route in place (page router refresh({ inPlace })). */
  function cmsCopyAddress(field) {
    const f = String(field || '');
    let m = /^article:([a-z0-9-]+)\/(.+)$/.exec(f);
    if (m) return { kind: 'article', id: m[1], key: m[2] };
    m = /^component:([^/]+)\/([^/]+)\/(.+)$/.exec(f);
    if (m) return { kind: 'component', anchorId: m[1], instanceKey: m[2], key: m[3] };
    m = /^([A-Z][A-Z0-9]*)\.([A-Z][A-Z0-9]*(?:\.[A-Z][A-Z0-9]*)*)$/.exec(f);
    if (m) return { kind: 'page', id: m[1].toLowerCase(), key: m[2] };
    return null;
  }
  function applyCmsCopyEdit(edit) {
    if (state.versionPreviewSite) { toast('A past version is showing: go back to the current drafts to edit text.'); return { ok: false }; }
    const at = cmsCopyAddress(edit.field), value = String(edit.value == null ? '' : edit.value);
    if (!at) { toast('Not edited: "' + edit.field + '" is not a field address (AREA.ROLE, article:<slug>/<field> or component:<anchor>/<instance>/<prop>).'); return { ok: false }; }
    if (state.cmsContent && state.cmsContent.field === edit.field) state.cmsContent.value = value;
    /* stale: the preview held a site sent while the words were typed and dropped it -- send the current one */
    if (at.kind === 'component') { if (edit.stale) notifyPreviewState(); renderSelToolbar(); return { ok: true }; }
    const result = A.setItemField(at.kind, at.id, at.key, value, { canvas: !edit.canvasShows });
    if (!result.ok) toast(result.refusal);
    else if (edit.canvasShows && edit.final) A.previewShowsDrafts();
    renderSelToolbar();
    return result;
  }
  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin || !event.data) return;
    if (event.source !== cmsPreview.contentWindow) return;
    if (event.data.points) state.cmsInsertPoints = event.data.points;
    if (event.data.showing) state.cmsStatesShowing = event.data.showing;
    if (event.data.type === 'defxn-cms-preview-ready') {
      state.cmsPreviewReady = true;
      let reposted = false;
      if (navigating) { navigating = false; if (postWaiting) { postCmsPreviewState(); reposted = true; } }
      if (!reposted && arriving) { const asked = arriving; arriving = ''; if (event.data.path && event.data.path !== asked) routeRefused(asked, event.data.path); }
      postCmsPreviewLens();
      /* the remount rebuilt the selected elements; the preview reports what is selected NOW
         (regression: tests/cms-selection-survives-remount.cjs) -- without it the toolbar kept
         editing a selection the page no longer had */
      if (Array.isArray(event.data.selections)) {
        /* the same element found again, under a new path key: a toolbar section open on it stays
           open (it closed under the cursor ~1 s after a page opened -- studio-flows makecomp) */
        if (event.data.sameSelection && event.data.selection && state.tbOpen && state.cmsExactSelection && state.tbOpenKey === state.cmsExactSelection.key) state.tbOpenKey = event.data.selection.key;
        state.cmsExactSelection = event.data.selection || null; state.cmsExactSelections = event.data.selections;
        state.cmsContent = event.data.content || null;
      }
      if (event.data.groups) state.cmsGroups = event.data.groups; if (event.data.tree) state.cmsTree = event.data.tree; renderInspector(); renderLayersPane(); state.libKey = ''; renderLibrary(); queueCheck(); }
    else if (event.data.type === 'defxn-cms-preview-error') toast('Preview update failed: ' + event.data.message);
    else if (event.data.type === 'defxn-cms-preview-copy-edit') applyCmsCopyEdit(Object.assign({}, event.data, { canvasShows: !event.data.stale && (!event.data.history || event.data.history === 'revert') }));
    else if (event.data.type === 'defxn-cms-preview-select') {
      state.cmsExactSelection = event.data.selection || null;
      state.cmsContent = event.data.content || null;
      state.cmsExactSelections = event.data.selections || (state.cmsExactSelection ? [state.cmsExactSelection] : []);
      if (event.data.groups) state.cmsGroups = event.data.groups;
      if (event.data.tree) state.cmsTree = event.data.tree;
      renderLayersPane();
      renderInspector();
      renderLibrary();
    } else if (event.data.type === 'defxn-cms-preview-components-replace') {
      if (state.cmsSourceSite) state.cmsSourceSite.components = event.data.components;
     
      if (event.data.tree) state.cmsTree = event.data.tree;
      applyStudioComponentsReplace(event.data.components);
      if (event.data.created) { state.tbAutoOpen = { key: 'cms-component', at: Date.now() }; toast('Made a component: it is in the Library to insert on any page, and this instance replaced the selection. Edit its definition from the Library or the toolbar.'); }
      state.libKey = ''; renderLibrary(); renderInspector(); renderLayersPane();
    } else if (event.data.type === 'defxn-cms-preview-states-showing') {
      /* a Live-mode click (or a toolbar Preview) changed what a group shows; the draft did not change */
      renderInspector();
    } else if (event.data.type === 'defxn-cms-preview-states-replace') {
      if (state.cmsSourceSite) state.cmsSourceSite.states = event.data.states;
     
      if (event.data.tree) state.cmsTree = event.data.tree;
      applyStudioStatesReplace(event.data.states);
      if (event.data.created) { state.tbAutoOpen = { key: 'cms-states', at: Date.now() }; toast('Made a state group: the selection is state 0. Use + Add state in the toolbar to add the next state.'); }
      renderInspector(); renderLayersPane();
    } else if (event.data.type === 'defxn-cms-preview-canvas-transitions-replace') {
      if (state.cmsSourceSite) state.cmsSourceSite.canvasTransitions = event.data.canvasTransitions;
      applyStudioCanvasTransitionsReplace(event.data.canvasTransitions);
      renderInspector();
    } else if (event.data.type === 'defxn-cms-preview-element-motion-replace') {
      if (state.cmsSourceSite) state.cmsSourceSite.elementMotion = event.data.elementMotion;
      applyStudioElementMotionReplace(event.data.elementMotion);
      renderInspector();
    } else if (event.data.type === 'defxn-cms-preview-layout-change' && event.data.patch) {
      state.cmsExactSelection = event.data.selection || state.cmsExactSelection;
      state.cmsExactSelections = event.data.selections || state.cmsExactSelections;
      if (event.data.groups) state.cmsGroups = event.data.groups;
      if (event.data.tree) state.cmsTree = event.data.tree;
      applyStudioLayoutPatch(event.data.patch);
      renderInspector(); renderLayersPane();
    } else if (event.data.type === 'defxn-cms-preview-layout-replace' && event.data.layout) {
      if (event.data.tree) state.cmsTree = event.data.tree;
      applyStudioLayoutReplace(event.data.layout);
      renderLayersPane();
    } else if (event.data.type === 'defxn-cms-preview-layout-history') {
      state.cmsLayoutCanUndo = !!event.data.canUndo; state.cmsLayoutCanRedo = !!event.data.canRedo; renderInspector();
    } else if (event.data.type === 'defxn-cms-preview-notice') toast(event.data.message || 'That operation is unavailable for this selection.');
    /* Step 4: js/main.js's unconditional "Edit canvas" context-menu entry still posts this
       exact message (that protocol is untouched, per scope) -- it used to call
       enterRestrictMode('canvas'); now it opens the same selection-independent popover
       the header's Background segment (#backgroundBtn) opens. */
    else if (event.data.type === 'defxn-cms-preview-enter-canvas-mode') openCanvasTransitionsPopover();
    /* Ctrl/Cmd+S pressed while focus is inside the canvas (js/main.js forwards it): the same
       gate and the same one save action as this document's own shortcut listener. */
    else if (event.data.type === 'defxn-cms-preview-save') { if (anyDirty()) saveEverything(); }
    else if (event.data.type === 'defxn-cms-preview-context-menu') { state.cmsContextMenuOpen = !!event.data.open; renderSelToolbar(); }
  });
  /* a click anywhere in the editor itself closes the preview's right-click menu, as a click
     inside the preview already does -- otherwise the toolbar stayed hidden behind a menu
     nobody could see was still open */
  document.addEventListener('pointerdown', () => {
    if (state.cmsContextMenuOpen && cmsPreview.contentWindow) cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-close-menu' }, window.location.origin);
  }, true);
  A.provide({ applyCmsCopyEdit: applyCmsCopyEdit, cmsCopyAddress: cmsCopyAddress,
      cmsNextComponentId: cmsNextComponentId, cmsPreview: cmsPreview,
      postCmsCanvasTransitionPreview: postCmsCanvasTransitionPreview,
      postCmsCanvasTransitionsCommand: postCmsCanvasTransitionsCommand,
      postCmsComponentsCommand: postCmsComponentsCommand,
      postCmsElementMotionCommand: postCmsElementMotionCommand,
      postCmsElementMotionPreview: postCmsElementMotionPreview, postCmsLayoutCommand: postCmsLayoutCommand,
      postCmsLayoutOperation: postCmsLayoutOperation, postCmsLayoutReset: postCmsLayoutReset,
      notifyPreviewAssets: notifyPreviewAssets, notifyPreviewMesh: notifyPreviewMesh,
      notifyPreviewState: notifyPreviewState, notifyPreviewTheme: notifyPreviewTheme,
      postCmsPreviewLens: postCmsPreviewLens, previewShowsDrafts: previewShowsDrafts,
      refreshCanvasSite: refreshCanvasSite, reloadPreview: reloadPreview,
      postCmsPreviewMode: postCmsPreviewMode, postCmsPreviewState: postCmsPreviewState,
      postCmsRemoveSelection: postCmsRemoveSelection, postCmsSelectGroup: postCmsSelectGroup,
      postCmsSelectKey: postCmsSelectKey, postCmsSetAlt: postCmsSetAlt, postCmsSetLabel: postCmsSetLabel,
      postCmsStatesCommand: postCmsStatesCommand, redo: redo, schedule: schedule,
      syncCmsPreview: syncCmsPreview, undo: undo });
})();

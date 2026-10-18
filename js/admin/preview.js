/* =====================================================================
   ADMIN EDITOR · CONTENT PREVIEW FRAME (js/admin/preview.js)
   ---------------------------------------------------------------------
   Owns: Content mode's preview (#frame): which route it shows (previewRoute,
   reloadPreview) and the messages that carry unsaved drafts into it -- assets, mesh
   tuning, theme, and the full defxn-cms-preview-state.
   Must not: talk to the canvas preview (#cmsPreview, js/admin/bridge.js) -- two frames,
   two protocols.
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, $ = A.$, siteFromState = A.siteFromState;

  /* ---- preview ------------------------------------------------------ */
  function previewRoute() {
    if (state.kind === 'mesh' || state.kind === 'studio') return null;
    if (state.kind === 'design') return '/'; /* colours apply everywhere; show them against Home */
    if (state.kind === 'article') return state.aCurrent ? '/learnings/' + state.aCurrent : null;
    if (state.kind === 'asset') return state.assetCurrent ? '/concept' : null;
    if (state.kind === 'shape') return state.shapeCurrent && ArkUI.pageCatalog[state.shapeCurrent] ? ArkUI.pageCatalog[state.shapeCurrent].path : null;
    var m = state.drafts[state.current];
    return m ? m.route : null;
  }
  function previewUrl() {
    var route = previewRoute();
    return 'index.html' + (route ? '#' + route : '');
  }
  function reloadPreview() {
    var route = previewRoute();
    $('previewPath').textContent = route || '—';
    $('open').href = previewUrl();
    $('previewNote').textContent = state.kind === 'mesh' ? 'The mesh has no live preview — see its status in the editor.' : state.kind === 'studio' ? 'Studio uses the real DEFXN renderer for its responsive edit and live preview.' : 'Choose a page to preview it.';
    var saved = state.kind === 'article' ? state.aSaved[state.aCurrent] : state.kind === 'asset' ? state.assetSaved[state.assetCurrent]
      : state.kind === 'secret' ? state.secretSaved[state.secretCurrent] : state.kind === 'shape' ? (state.shapeCurrent ? '' : null)
      : state.kind === 'design' ? '' : state.saved[state.current];
    var ready = !!route && saved !== undefined;
    $('frame').hidden = !ready; $('previewNote').hidden = ready;
    if (ready) {
      /* site-wide settings defaults arrive after load with the full preview state
         (notifyPreviewState, from this frame's load handler) -- never through localStorage */
      $('frame').src = 'index.html?preview=' + Date.now() + '#' + route;
      previewShowing = route;
    }
  }
  /* The route the preview frame was last pointed at. Drafts are posted only while the editor
     is still on that route: select()/delete*() re-render the editor (touch() posts the drafts)
     BEFORE reloadPreview() re-points the frame, so the old page received a site that no longer
     held it -- deleting the article on screen remounted it from nothing and logged "page failed
     to load" (regression: tests/cms-preview-state-route.cjs). The reload's own load handler
     posts the drafts for the new route. */
  var previewShowing = null;

  /* Unsaved image edits reach the preview iframe live, the same way a saved one reaches the real
     site: js/zero-webgl.js listens for this on every page (harmless outside a preview) and, for the
     asset id it actually uses, swaps its buffer in without touching anything on disk. */
  function notifyPreviewAssets() {
    var frame = $('frame'), win = frame && !frame.hidden && frame.contentWindow;
    if (!win) return;
    var assets = state.assetIds.map(function (id) { return state.assetDrafts[id]; }).filter(function (a) { return a && a.dataBase64; });
    if (!assets.length) return;
    try { win.postMessage({ type: 'flux-chain-preview-assets', assets: assets }, window.location.origin); } catch (error) { /* preview not ready yet; the next edit or the frame's own load retries */ }
  }
  /* Same idea as notifyPreviewAssets, for the shared relief tuning and each
     page's two shape images (js/content/mesh-settings.js, state.meshDraft): an edit shows its
     effect on the previewed page immediately, before Save writes anything. */
  function notifyPreviewMesh() {
    var frame = $('frame'), win = frame && !frame.hidden && frame.contentWindow;
    if (!win) return;
    try { win.postMessage({ type: 'flux-chain-preview-mesh', settings: state.meshDraft }, window.location.origin); } catch (error) { /* preview not ready yet; the next edit or the frame's own load retries */ }
  }
  /* Same idea again, for the colour theme (js/content/theme.js, state.themeDraft): a picked colour shows on
     the previewed page immediately, before Save writes anything. */
  function notifyPreviewTheme() {
    var frame = $('frame'), win = frame && !frame.hidden && frame.contentWindow;
    if (!win) return;
    try { win.postMessage({ type: 'flux-chain-preview-theme', theme: state.themeDraft }, window.location.origin); } catch (error) { /* preview not ready yet; the next edit or the frame's own load retries */ }
  }
  /* Send the complete unsaved CMS model into the real public renderer. Page
     modules remount from these in-memory registries, so preview uses the same
     HTML/CSS/components as deployment without writing a file first. */
  function notifyPreviewState() {
    var frame = $('frame'), win = frame && !frame.hidden && frame.contentWindow;
    if (!win || !state.articlesReady || previewShowing !== previewRoute()) return;
    try { win.postMessage({ type: 'defxn-cms-preview-state', site: siteFromState() }, window.location.origin); } catch (error) { /* iframe is between routes; its load handler retries */ }
  }

  $('frame').addEventListener('load', function () { notifyPreviewAssets(); notifyPreviewMesh(); notifyPreviewTheme(); notifyPreviewState(); });
  $('reload').addEventListener('click', reloadPreview);
  A.provide({ notifyPreviewAssets: notifyPreviewAssets, notifyPreviewMesh: notifyPreviewMesh,
      notifyPreviewState: notifyPreviewState, notifyPreviewTheme: notifyPreviewTheme,
      reloadPreview: reloadPreview });
})();

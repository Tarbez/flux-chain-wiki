/* =====================================================================
   ADMIN EDITOR · LENS AND ITEM SELECTION (js/admin/nav.js)
   ---------------------------------------------------------------------
   Owns: the lens -- Edit words / Edit style (state.lens 'content' / 'design'; setLens: what a
   click on the canvas edits) -- the
   select*() entry points that make one page / article / image / encrypted item the item a
   form edits (and, for a page or article, show it on the canvas), renderList() -- the
   repaint after anything that changes "is it dirty" (header dots, Save, the Pages tree) --
   and the --app-bar-h measurement.
   There is one workspace. Until 2026-10-18 this file switched between two apps (Content: a
   page list, a form and a preview frame of its own; Design: the canvas); the switch is now
   a lens on the one canvas, and the page list is the rail's Pages tab (js/admin/rail.js).
   Must not: draw a form (js/admin/panels.js mounts them) or tear down a draft when the
   lens changes -- a lens only changes what a canvas click edits.
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, $ = A.$, h = A.h;
  /* defined by files loaded after this one: resolved when called */
  var themeDirty = A.later('themeDirty'), settingsDefaultsDirty = A.later('settingsDefaultsDirty'),
      syncHeader = A.later('syncHeader'), refreshSaveButton = A.later('refreshSaveButton'),
      renderPages = A.later('renderPages'), openRoute = A.later('openRoute'), showLeft = A.later('showLeft'),
      postCmsPreviewLens = A.later('postCmsPreviewLens'), schedule = A.later('schedule'),
      refreshPanels = A.later('refreshPanels'), openMeshSheet = A.later('openMeshSheet'),
      refreshCanvasSite = A.later('refreshCanvasSite'), renderInspector = A.later('renderInspector');

  /* ---- the repaint after a draft changed -------------------------------------------------
     Every form calls it (it was the Content sidebar's list): the header (lens, views, the
     Theme view's dirty dot), the one Save button, and the rail's Pages tree with its dots. */
  function renderList() {
    syncLensButtons();
    /* Site style is in the More menu: its unsaved dot shows on More too, so it is seen closed */
    ['viewThemeBtn', 'accountBtn'].forEach(function (id) {
      var btn = $(id); if (!btn) return;
      var dot = btn.querySelector('.dot'); if (dot) dot.remove();
      if (themeDirty() || settingsDefaultsDirty()) btn.appendChild(h('span', { class: 'dot', role: 'img', 'aria-label': 'Unsaved Site style changes', title: 'Unsaved Site style changes' }));
    });
    syncHeader(); refreshSaveButton(); renderPages();
  }

  /* ---- the lens ------------------------------------------------------------------------ */
  function syncLensButtons() {
    ['content', 'design'].forEach(function (lens) {
      var b = $(lens === 'content' ? 'lensContentBtn' : 'lensDesignBtn');
      if (b) b.setAttribute('aria-pressed', String(state.lens === lens));
    });
  }
  /* Nothing is torn down: the selection, every draft and the open sheet stay. The canvas is told
     (defxn-cms-preview-lens, js/admin/bridge.js), the toolbar re-draws its sections for the lens
     (schedule()), and the rail opens the tab last used in this lens (Pages in Content, Layers in
     Design, by default). */
  function setLens(lens) {
    if (lens !== 'content' && lens !== 'design') return;
    var changed = lens !== state.lens;
    state.lens = lens;
    try { localStorage.setItem('defxn-cms-lens', lens); } catch (e) { /* a convenience only */ }
    syncLensButtons();
    syncHeader(); renderInspector();   /* what each lens shows: Design tips and the size note are Edit style's */
    if (!changed) return;
    showLeft(state.railTab[lens] || (lens === 'content' ? 'pages' : 'layers'), { remember: false });
    postCmsPreviewLens(); schedule();
  }
  $('lensContentBtn').addEventListener('click', function () { setLens('content'); });
  $('lensDesignBtn').addEventListener('click', function () { setLens('design'); });

  /* ---- the item a form edits -------------------------------------------------------------
     A page or an article is also a place: selecting it shows it on the canvas. An image or an
     encrypted item has no page of its own; selecting it opens its rail tab. */
  function select(id) {
    state.kind = 'page'; state.current = id;
    var m = state.drafts[id];
    if (m && m.route && state.cmsConnected) { refreshCanvasSite(); openRoute(m.route); }
    renderList(); refreshPanels();
  }
  function selectArticle(slug) {
    state.kind = 'article'; state.aCurrent = slug;
    if (slug && state.cmsConnected) { refreshCanvasSite(); openRoute('/learnings/' + slug); }
    renderList(); refreshPanels();
  }
  function selectAsset(id) { state.kind = 'asset'; state.assetCurrent = id; showLeft('media'); renderList(); refreshPanels(); }
  function selectSecret(id) { state.kind = 'secret'; state.secretCurrent = id; showLeft('vault'); renderList(); refreshPanels(); }
  /* the header's Mesh: publish and deploy status, in the sheet (js/admin/panels.js) */
  function selectMesh() { openMeshSheet(); }

  /* The header's real height, published as --app-bar-h on <html>. #studioRoot
     (css/studio-embed.css) docks below it, so the header's controls stay reachable at EVERY
     width: below ~1300px the header wraps (tests/browser/header-reach.mjs measures it), and a
     hardcoded offset once left the workspace painted over them. Observed, not computed once:
     the wrap changes with width, fonts and which controls are showing. */
  (function trackAppBarHeight() {
    var bar = document.querySelector('body > header.bar');
    if (!bar || typeof ResizeObserver !== 'function') return;
    function publish() { document.documentElement.style.setProperty('--app-bar-h', bar.getBoundingClientRect().height + 'px'); }
    new ResizeObserver(publish).observe(bar, { box: 'border-box' });
    publish();
  })();
  A.provide({ renderList: renderList, select: select, selectArticle: selectArticle,
      selectAsset: selectAsset, selectMesh: selectMesh, selectSecret: selectSecret, setLens: setLens });
})();

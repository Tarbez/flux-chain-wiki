/* =====================================================================
   ADMIN EDITOR · CANVAS STAGE (js/admin/canvas.js)
   ---------------------------------------------------------------------
   Owns: the device-sized stage the canvas preview sits in -- its size and zoom
   (layoutStage), the scale-corrected geometry (rectOf, rectOfSelectionRect), where
   #selToolbar sits next to the selection (placeSelToolbar), opening a route on the
   canvas, the Studio status strip, and the canvas keyboard (undo/redo, Delete).
   Must not: decide what the toolbar shows (js/admin/toolbar.js) -- only where it goes.
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, $ = A.$, cmsPreview = A.cmsPreview, schedule = A.schedule, redo = A.redo,
      undo = A.undo, postCmsRemoveSelection = A.postCmsRemoveSelection;
  /* defined by files loaded after this one: resolved when called */
  var placeToolbarPop = A.later('placeToolbarPop'), setView = A.later('setView'),
      closePop = A.later('closePop');

  /* =========================================================================
     Whole-document load / snapshot
     ========================================================================= */
  /* STEP 1 CLEANUP: clearAll/docSnapshot/loadDoc/buildFresh/replaceSite managed the dense
     tree's own whole-document load/undo-as-a-single-op mechanism (the "Versions"/sample-site/
     blank-site load paths) -- deleted with the dense engine; nothing in connected mode ever
     replaces the whole document (there is no dense document left to replace). */

  /* =========================================================================
     Selection, overlays, canvas interaction
     ========================================================================= */
  /* The dense canvas's own selection state (sel/hover/multiSel/elOf/drag) and the overlays it
     drove (#selBox/#hoverBox/#selTag/the padding boxes/multi-select boxes) are deleted: the
     real selection lives in the preview (js/main.js draws its own outline and handles), and
     the only overlay this document still positions is #selToolbar. */
  /* the breakpoint, Edit/Live and canvas/sitemap view are shared state (state.device/live/view,
     js/admin/state.js): the header sets them, this file sizes the stage by them */
  const DEVICES = [['Desktop', 1280], ['Tablet', 820], ['Phone', 390]];
  const stage = $('stage'), wrap = $('canvasWrap');
  let scale = 1;
  function layoutStage() {
    if (state.kind !== 'studio' || state.view !== 'design') return;
    const avail = wrap.clientWidth - (state.live ? 0 : 32);
    const w = state.live && state.device === 0 ? avail : DEVICES[state.device][1];
    scale = state.live && state.device === 0 ? 1 : Math.min(1, avail / w);
    cmsPreview.style.width = w + 'px'; stage.style.width = w + 'px';
    cmsPreview.style.height = (state.live ? Math.max(600, wrap.clientHeight) : Math.max(720, Math.round(w * .72))) + 'px';
    stage.style.transform = scale < 1 ? `scale(${scale})` : '';
    stage.style.marginLeft = scale < 1 ? '0' : 'auto';
    const h = cmsPreview.offsetHeight;
    stage.style.marginBottom = scale < 1 ? `${-(h - h * scale)}px` : '0';
    const routeTitle = (state.cmsRoutes.find((r) => r.path === state.cmsCurrentRoute) || {}).title || state.cmsCurrentRoute;
    $('devName').textContent = `${routeTitle} · ${DEVICES[state.device][0]} · ${w} px`;
    $('devScale').textContent = scale < 1 ? `shown at ${Math.round(scale * 100)}%` : '';
    placeSelToolbar();
  }
  function rectOf(el) { const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect(); return { x: (r.left - s.left) / scale, y: (r.top - s.top) / scale, w: r.width / scale, h: r.height / scale }; }
  /* #selToolbar's positioning, on top of rectOf()'s scale-corrected stage coordinates (the
     only overlay this document still places).
     cmsExactSelection.rect (reported by js/main.js's cmsSelectionInfo(), computed INSIDE the
     real-site preview iframe via that element's own getBoundingClientRect()) is already in
     the iframe's OWN internal CSS-pixel space -- i.e. the iframe's layout viewport at its
     simulated device width (w), never itself affected by this document's outer
     `stage.style.transform = scale(...)` (an ancestor transform in THIS document cannot
     reach into a cross-document iframe's own geometry). #cmsPreview sits flush at (0,0)
     inside #stage in connected mode (.frame is display:none, #cmsPreview is the first and
     only visible child, width:100%, no border/padding on either) -- rectOf(cmsPreview)
     measures that offset the same scale-corrected way as every other same-document rect
     here, which keeps this correct even if that flush layout ever changes, rather than
     hard-coding a zero offset. */
  function rectOfSelectionRect(infoRect) {
    const base = rectOf(cmsPreview), r = infoRect || { x: 0, y: 0, width: 0, height: 0 };
    return { x: base.x + r.x, y: base.y + r.y, w: r.width, h: r.height };
  }
  function selToolbarVisible() { return !state.live && state.view === 'design' && !state.cmsContextMenuOpen && !!(state.cmsExactSelection && state.cmsExactSelection.key); }
  function placeSelToolbar() {
    const box = $('selToolbar');
    if (box.hidden) return;
    box.style.transform = scale < 1 ? `scale(${1 / scale})` : '';
    /* the bar is counter-scaled to screen pixels, so "as wide as the stage" is the stage's
       ON-SCREEN width; past that it wraps onto a second row instead of overflowing the page */
    box.style.maxWidth = Math.max(160, (scale < 1 ? stage.offsetWidth * scale : stage.offsetWidth) - 8) + 'px';
    /* wrapped: the actions group starts row 2, so the hairline that ends the sections group
       would dangle at the end of row 1 (only its colour changes -- never its width, or the
       wrap point would flip back and forth between calls) */
    const acts = box.querySelector('.tb-actions');
    box.classList.toggle('wrapped', !!acts && acts.offsetTop > acts.offsetHeight / 2);
    const r = rectOfSelectionRect(state.cmsExactSelection && state.cmsExactSelection.rect);
    /* The bar's MEASURED size (box.offsetWidth/offsetHeight -- a layout property, unaffected
       by the counter-scale transform just applied above, so this is its real on-screen
       footprint; its height varies with which taxonomy sections are showing), clamped to the
       stage on every edge. */
    const bw = scale < 1 ? box.offsetWidth / scale : box.offsetWidth, bh = scale < 1 ? box.offsetHeight / scale : box.offsetHeight;
    /* gap 28: the preview draws its own size/drag label (.ark-studio-label, js/main.js) 24px
       above the selection; a smaller gap parked the bar on that drag handle */
    const fw = stage.offsetWidth, fh = stage.offsetHeight, gap = 28;
    /* Above, else below, else BESIDE the selection, never on top of it (regression:
       tests/cms-toolbar-placement.cjs). The old accordion toolbar was often taller than the
       room above or below an element, and its last resort was `r.y + 2` -- right over the
       element being edited, so a prop edit or a new state changed the preview where nobody
       could see it. The bar is one or two rows now, so above/below nearly always fit; when no
       side has room, it takes the half of the stage away from the element. */
    const clampX = (x) => Math.max(0, Math.min(x, fw - bw)), clampY = (y) => Math.max(0, Math.min(y, fh - bh));
    let top, left;
    if (r.y > bh + gap) { top = r.y - bh - gap; left = clampX(r.x); }
    else if (r.y + r.h + gap + bh < fh) { top = r.y + r.h + gap; left = clampX(r.x); }
    else if (r.x + r.w + gap + bw <= fw) { top = clampY(r.y); left = r.x + r.w + gap; }
    else if (r.x - gap - bw >= 0) { top = clampY(r.y); left = r.x - gap - bw; }
    else { top = clampY(r.y); left = r.x + r.w / 2 < fw / 2 ? fw - bw : 0; }
    box.style.top = top + 'px';
    box.style.left = left + 'px';
    /* which side of the selection the bar took: its popover and tooltips open on the far side */
    box.dataset.side = top + bh <= r.y ? 'above' : 'below';
    placeToolbarPop();
  }
  new ResizeObserver(() => layoutStage()).observe(wrap);
  wrap.addEventListener('scroll', () => placeSelToolbar(), { passive: true });

  /* STEP 1 CLEANUP: the #btnAdd popover (sections/elements/live-data tiles) only ever
     inserted into the dense tree -- deleted with it. #btnAdd is already CSS-hidden when
     connected (.cms-connected #btnAdd{display:none}), so this leaves no dead button. */
  function openRoute(path) {
    if (!path || path === state.cmsCurrentRoute) { if (state.view !== 'design') setView('design'); return; }
    state.cmsCurrentRoute = path;
    if (state.view !== 'design') setView('design');
    schedule();
  }
  /* STEP 1 CLEANUP: Export HTML / robots.txt-sitemap-llms.txt / Load sample / Start blank
     all operated on the deleted dense tree (exportHtml compiled it via compileNode(), which
     is gone) -- deleted with no replacement, same as the Versions feature above. The "More"
     menu that was left holding only the Shortcuts hint is gone too: that hint now sits in the
     header's account menu (admin-app.html #accountMenu). */

  /* =========================================================================
     Status bar, autosave, toolbar, keyboard
     ========================================================================= */
  let statusT = 0, studioStatusTimer = 0;
  function renderStatus() {
    const now = performance.now(); if (now - statusT < 150) { if (!studioStatusTimer) studioStatusTimer = setTimeout(() => { studioStatusTimer = 0; renderStatus(); }, 160); return; } statusT = now;
    $('studioStatus').innerHTML = `<span><b>${state.cmsRoutes.length}</b> routes</span><span>${state.cmsCurrentRoute}</span><span>${state.cmsLayoutCanUndo ? 'undo available' : 'no undo'}</span>`;
  }
  document.addEventListener('keydown', (e) => {
    if (state.kind !== 'studio') return;
    if (e.key === 'Escape' && state.popEl) { const a = state.popAnchor; closePop(); if (a) a.focus(); return; }
    const tag = (e.target.tagName || '').toLowerCase(), typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); redo(); return; }
    if (typing || state.live || state.view !== 'design') return;
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); postCmsRemoveSelection(); }
  });
  window.addEventListener('resize', layoutStage);
  A.provide({ DEVICES: DEVICES, layoutStage: layoutStage, openRoute: openRoute,
      placeSelToolbar: placeSelToolbar, renderStatus: renderStatus, selToolbarVisible: selToolbarVisible });
})();

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
      closePop = A.later('closePop'), pageFieldsFollow = A.later('pageFieldsFollow');

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
  /* [name, width, ArkLayout's breakpoint name] -- the index is state.device */
  const DEVICES = [['Desktop', 1280, 'desktop'], ['Tablet', 820, 'tablet'], ['Phone', 390, 'phone']];
  /* The breakpoint the canvas opens on: the one chosen last in this browser (#devices, remembered
     by rememberDevice() -- an explicit choice wins), else the one THIS screen is, by the site's
     own thresholds (ArkLayout.breakpoint of the editor's width): on a phone the canvas opens on
     the phone layout, at 100%, instead of the desktop page shrunk to 28% (measured 2026-10-18 at
     390px) -- a phone edit should be made where it will be seen. Only the first choice: a resize
     afterwards never switches the breakpoint under an edit. */
  const DEVICE_KEY = 'defxn-cms-device';
  function initialDevice() {
    let saved = null;
    try { saved = localStorage.getItem(DEVICE_KEY); } catch (e) { /* storage blocked: derived below */ }
    const bp = saved || (window.ArkLayout && ArkLayout.breakpoint ? ArkLayout.breakpoint(window.innerWidth) : 'desktop');
    return Math.max(0, DEVICES.findIndex((d) => d[2] === bp));
  }
  function rememberDevice(index) {
    try { localStorage.setItem(DEVICE_KEY, DEVICES[index][2]); } catch (e) { /* a convenience only */ }
  }
  state.device = initialDevice();
  const stage = $('stage'), wrap = $('canvasWrap');
  let scale = 1;
  /* The stage fills the canvas area: as wide as the breakpoint (zoomed down to fit when wider than
     the area) and exactly as tall as the room under the size label, so the page scrolls inside the
     canvas instead of leaving the area's lower half empty (it was a fixed max(720, 72% of the
     width) tall: at 390px a desktop page at 28% left 400px blank below it). The padding is read,
     not assumed: it changes at the narrow breakpoint (css/studio-embed.css). */
  const MIN_STAGE_H = 320;
  function layoutStage() {
    if (state.view === 'map') return;   /* the canvas shows in the Canvas and Theme views */
    const pad = getComputedStyle(wrap), padX = parseFloat(pad.paddingLeft) + parseFloat(pad.paddingRight), padY = parseFloat(pad.paddingTop) + parseFloat(pad.paddingBottom);
    const label = $('canvasTools'), labelH = label.offsetHeight ? label.offsetHeight + parseFloat(getComputedStyle(label).marginBottom) : 0;
    /* the notice banners above the canvas (js/admin/notice.js: no project folder, a page not
       saved yet) take their room from the stage, so the page still ends at the canvas's bottom */
    const banners = $('noticeBanners'), bannersH = banners && banners.offsetHeight ? banners.offsetHeight + parseFloat(getComputedStyle(banners).marginBottom) : 0;
    const avail = wrap.clientWidth - padX;
    const w = state.live && state.device === 0 ? avail : DEVICES[state.device][1];
    scale = state.live && state.device === 0 ? 1 : Math.min(1, avail / w);
    cmsPreview.style.width = w + 'px'; stage.style.width = w + 'px';
    cmsPreview.style.height = Math.max(MIN_STAGE_H, Math.floor((wrap.clientHeight - padY - labelH - bannersH) / scale)) + 'px';
    stage.style.transform = scale < 1 ? `scale(${scale})` : '';
    stage.style.marginLeft = scale < 1 ? '0' : 'auto';
    const h = cmsPreview.offsetHeight;
    stage.style.marginBottom = scale < 1 ? `${-(h - h * scale)}px` : '0';
    /* the page by the one name every list uses (js/admin/rail.js siteList), then its size */
    const row = A.siteList ? A.siteList().rows.find((r) => r.path === state.cmsCurrentRoute) : null;
    const routeTitle = (row && row.title) || (state.cmsRoutes.find((r) => r.path === state.cmsCurrentRoute) || {}).title || state.cmsCurrentRoute;
    $('devName').textContent = `${routeTitle} · ${DEVICES[state.device][0]} · ${w} px`;
    $('devName').title = `${routeTitle} (${state.cmsCurrentRoute}) at ${DEVICES[state.device][0].toLowerCase()} size, ${w} px wide`;
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
  function selToolbarVisible() { return !state.live && state.view !== 'map' && !state.cmsContextMenuOpen && !!(state.cmsExactSelection && state.cmsExactSelection.key); }
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
    /* the WHOLE selection, not only the layer clicked last: placed beside the last one, the bar sat
       on the other selected layer (a heading over its paragraph) and caught the right-click meant
       for it */
    const rects = (state.cmsExactSelections || []).map((sel) => sel && sel.rect).filter(Boolean);
    const union = rects.length > 1 ? rects.reduce((u, q) => { const x = Math.min(u.x, q.x), y = Math.min(u.y, q.y); return { x, y, width: Math.max(u.x + u.width, q.x + q.width) - x, height: Math.max(u.y + u.height, q.y + q.height) - y }; }) : null;
    const r = rectOfSelectionRect(union || (state.cmsExactSelection && state.cmsExactSelection.rect));
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
    followPopAnchor();
  }
  new ResizeObserver(() => layoutStage()).observe(wrap);
  if ($('noticeBanners')) new ResizeObserver(() => layoutStage()).observe($('noticeBanners'));
  wrap.addEventListener('scroll', () => placeSelToolbar(), { passive: true });
  /* The bar sits in the stage's own coordinates and moves with it by CSS; its popover is
     position:fixed (outside the zoomed stage, so it is never clipped by the canvas) and is
     placed in VIEWPORT coordinates from the bar's on-screen box -- so it is only right for as
     long as the bar stays where it was when the popover was placed. That box moves for reasons
     no handler above sees. Measured 2026-10-18 at a 1280 -> 1100 px resize: the resize handler
     placed both while #studioRoot still sat at the old header height; one frame later the
     header's wrapped height reached it (js/admin/nav.js publishes --app-bar-h from its own
     ResizeObserver) and the stage moved 40.7 px down. The popover followed only because the
     canvas also happened to shrink, firing the observer above; a move that resizes nothing
     (an ancestor scrolling, the line above the stage wrapping) left it 40 px behind its
     button, and the toolbar-popovers driver passed only behind a fixed 500 ms sleep.
     So while a popover is open, each frame compares the bar's on-screen box with the one the
     popover was placed from, and re-places it in that same frame when it moved, whatever moved
     it -- a rAF callback runs before the frame paints, so the popover is never drawn away from
     its bar (an IntersectionObserver's notification is a task queued after the frame, one
     frame late at best). It runs only while a popover is open (one getBoundingClientRect of
     the bar, free while layout is clean) and stops when it closes.
     Regression: tests/browser/toolbar-popovers.mjs "the popover follows its bar". */
  let popWatch = 0, popPlacedFrom = '';
  const barBox = () => { const r = $('selToolbar').getBoundingClientRect(); return [r.left, r.top, r.width, r.height].join(','); };
  function watchPopAnchor() {
    popWatch = 0;
    if ($('selToolbarPop').hidden || $('selToolbar').hidden) { popPlacedFrom = ''; return; }
    const now = barBox();
    if (popPlacedFrom && now !== popPlacedFrom) placeToolbarPop();
    popPlacedFrom = now;
    popWatch = requestAnimationFrame(watchPopAnchor);
  }
  /* called after every placement: the popover was just placed from the bar as it is now */
  function followPopAnchor() {
    if ($('selToolbarPop').hidden || $('selToolbar').hidden) return;
    popPlacedFrom = barBox();
    if (!popWatch) popWatch = requestAnimationFrame(watchPopAnchor);
  }
  /* the bar is placed from its measured size: a new size places it again */
  new ResizeObserver(() => placeSelToolbar()).observe($('selToolbar'));

  /* STEP 1 CLEANUP: the #btnAdd popover (sections/elements/live-data tiles) only ever
     inserted into the dense tree -- deleted with it. #btnAdd is already CSS-hidden when
     connected (.cms-connected #btnAdd{display:none}), so this leaves no dead button. */
  /* Show a page on the canvas (the Theme view keeps its settings beside it; the sitemap gives way
     to the canvas). The Page fields sheet follows the page (pageFieldsFollow, js/admin/panels.js). */
  function openRoute(path) {
    if (state.view === 'map') setView('design');
    if (!path || path === state.cmsCurrentRoute) return;
    state.cmsCurrentRoute = path;
    /* the canvas is about to show another page: a Design check asked for now waits for that
       page's ready, not the one still on screen (the iframe is re-pointed on the next frame) */
    state.cmsPreviewReady = false;
    pageFieldsFollow(path);
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
    /* one quiet line: how many pages the site has and which one is on the canvas. Undo's state is
       the header's Undo button (one history, js/admin/history.js) -- this line said "no undo"
       while that button was enabled (docs/ux-audit/cms.md P1-5). */
    $('studioStatus').innerHTML = `<span><b>${state.cmsRoutes.length}</b> pages</span><span>${A.esc(state.cmsCurrentRoute)}</span>`;
  }
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase(), typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); redo(); return; }
    if (typing || state.live || state.view === 'map') return;
    /* a key pressed in a form panel (the sheet, the Theme view, Media, Vault) is not about the canvas selection */
    if (e.target.closest && e.target.closest('#sheet, #themeView, #worldView, #skinView, #mediaPane, #vaultPane, #pagesPane')) return;
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); postCmsRemoveSelection(); }
  });
  window.addEventListener('resize', layoutStage);
  A.provide({ DEVICES: DEVICES, layoutStage: layoutStage, openRoute: openRoute, rememberDevice: rememberDevice,
      placeSelToolbar: placeSelToolbar, renderStatus: renderStatus, selToolbarVisible: selToolbarVisible });
})();

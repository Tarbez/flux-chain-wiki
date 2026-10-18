/* =====================================================================
   ADMIN EDITOR · HEADER AND POPOVERS (js/admin/header.js)
   ---------------------------------------------------------------------
   Owns: the one app header's canvas controls -- page picker, breakpoints, Edit/Live,
   undo/redo, the Design views (Canvas / Sitemap / Theme & defaults / Background) --
   syncHeader() (which of them show), renderInspector() (the selection repaint: toolbar,
   undo/redo state, breakpoint note), and the one header popover (openPop/closePop/
   refreshPop/menu) every header control opens, including the background-transition
   popover.
   Must not: own what a popover shows when another file builds it (page SEO: seo.js;
   Design check: design-check.js) -- it positions and opens, they fill.
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, $ = A.$, ic = A.ic, openRoute = A.openRoute, refuse = A.refuse, DEVICES = A.DEVICES,
      CMS_CANVAS_TRANSITIONS_DEFAULT = A.CMS_CANVAS_TRANSITIONS_DEFAULT,
      postCmsCanvasTransitionsCommand = A.postCmsCanvasTransitionsCommand, ctlSegField = A.ctlSegField,
      CMS_CANVAS_EFFECTS = A.CMS_CANVAS_EFFECTS, ctlField = A.ctlField,
      CMS_CANVAS_EASINGS = A.CMS_CANVAS_EASINGS,
      postCmsCanvasTransitionPreview = A.postCmsCanvasTransitionPreview, selectStudio = A.selectStudio,
      selectDesign = A.selectDesign, layoutStage = A.layoutStage, schedule = A.schedule,
      postCmsPreviewMode = A.postCmsPreviewMode, undo = A.undo, redo = A.redo;
  /* defined by files loaded after this one: resolved when called */
  var setView = A.later('setView'), renderSelToolbar = A.later('renderSelToolbar');

  /* false until the popover code below has run. In the single-file editor this held syncHeader()
     off until the Studio block's `let view`/popover state existed; view and the popover anchor
     are shared state now (js/admin/state.js), so it only says this file has finished loading. */
  var headerReady = false;

  /* the open popover's builder (its element and anchor are state.popEl/popAnchor): refreshPop() reruns it */
  let popBuild = null;
  function closePop() { if (state.popEl) { state.popEl.remove(); state.popEl = null; } if (state.popAnchor) state.popAnchor.setAttribute('aria-expanded', 'false'); state.popAnchor = null; popBuild = null; }
  function openPop(anchor, build, align) {
    if (state.popAnchor === anchor) { closePop(); return; }
    closePop();
    const p = document.createElement('div'); p.className = 'pop'; p.setAttribute('role', 'dialog');
    $('studioRoot').appendChild(p); state.popEl = p; state.popAnchor = anchor; popBuild = build; anchor.setAttribute('aria-expanded', 'true');
    p.dataset.align = align || 'left';
    build(p); positionPop();
    const f = p.querySelector('button, input, select'); if (f) f.focus({ preventScroll: true });
  }
  function positionPop() {
    if (!state.popEl || !state.popAnchor) return;
    const r = state.popAnchor.getBoundingClientRect(), pw = state.popEl.offsetWidth, ph = state.popEl.offsetHeight;
    let left = state.popEl.dataset.align === 'right' ? r.right - pw : r.left;
    left = Math.max(8, Math.min(left, innerWidth - pw - 8));
    let top = r.bottom + 6; if (top + ph > innerHeight - 8) top = Math.max(8, r.top - ph - 6);
    state.popEl.style.left = left + 'px'; state.popEl.style.top = top + 'px';
  }
  function refreshPop() {
    if (!state.popEl || !popBuild) return;
    if (popBuild.holdWhileEditing && state.popEl.contains(document.activeElement) && document.activeElement.matches('input, textarea, select')) return;
    const sc = state.popEl.scrollTop; state.popEl.textContent = ''; popBuild(state.popEl); state.popEl.scrollTop = sc; positionPop();
  }
  headerReady = true;
  document.addEventListener('pointerdown', (e) => { if (state.popEl && !state.popEl.contains(e.target) && !(state.popAnchor && state.popAnchor.contains(e.target))) closePop(); });
  window.addEventListener('resize', positionPop);
  function menu(box, items) {
    const m = document.createElement('div'); m.className = 'menu';
    for (const it of items) {
      if (it === '-') { const s = document.createElement('div'); s.className = 'sep'; m.appendChild(s); continue; }
      const b = document.createElement('button'); b.type = 'button'; b.innerHTML = `${ic(it.icon || 'cursor')}<span></span>${it.hint ? '<small></small>' : ''}`;
      b.children[1].textContent = it.label; if (it.hint) b.lastChild.textContent = it.hint; if (it.on) b.classList.add('on'); if (it.danger) b.style.color = 'var(--danger)';
      b.addEventListener('click', () => { closePop(); it.run(); }); m.appendChild(b);
    }
    box.appendChild(m);
  }

  /* page switcher popover in the top bar */
  function renderPageBtn() {
    const b = $('btnPage'), route = state.cmsRoutes.find((r) => r.path === state.cmsCurrentRoute);
    b.innerHTML = `${ic(route && route.seoArticle ? 'article' : state.cmsCurrentRoute === '/' ? 'home' : 'page')}<span></span><small></small>${ic('chev', 'sm')}`;
    b.children[1].textContent = (route && route.title) || state.cmsCurrentRoute; b.children[2].textContent = state.cmsCurrentRoute;
  }
  $('btnPage').addEventListener('click', (e) => openPop(e.currentTarget, (p) => {
    const h = document.createElement('h4'); h.textContent = 'Pages'; p.appendChild(h);
    const sorted = state.cmsRoutes.slice().sort((a, b) => a.path.localeCompare(b.path));
    const actions = [{ icon: 'sitemap', label: 'Open the sitemap', run: () => setView('map') }];
    menu(p, [...sorted.map((route) => ({ icon: route.seoArticle ? 'article' : route.path === '/' ? 'home' : 'page', label: route.title || route.path, hint: route.path, on: route.path === state.cmsCurrentRoute, run: () => openRoute(route.path) })), '-', ...actions]);
  }));

  function renderInspector() {
    renderSelToolbar();
    refuse($('btnUndo'), state.cmsLayoutCanUndo ? '' : 'Nothing to undo: no layout or style edit on the canvas yet.');
    refuse($('btnRedo'), state.cmsLayoutCanRedo ? '' : 'Nothing to redo: undo an edit first.');
    const bn = $('bpNote'); bn.hidden = state.device === 0 || state.live || state.view !== 'design';
    bn.title = state.device ? `Editing ${DEVICES[state.device][0].toLowerCase()} overrides: changes apply at this size only` : '';
    bn.innerHTML = state.device ? `${ic('warn', 'sm')}<span class="bp-text">${DEVICES[state.device][0]} overrides</span>` : '';
  }

  /* The one header's state (admin-app.html's #appBar): which Design view is pressed, and the
     canvas-only groups -- page picker, page SEO, rail toggle, breakpoints, undo/redo, Design
     check, Edit/Live -- shown only in Design -> Canvas, where they act on something. Called
     from renderList() (every kind change) and setView() (canvas <-> sitemap); `headerReady`
     holds it off until this block's own `let view` exists. */
  function syncHeader() {
    if (!headerReady) return;
    const studio = state.kind === 'studio', canvas = studio && state.view === 'design';
    $('designCanvasBtn').setAttribute('aria-pressed', String(canvas));
    $('designMapBtn').setAttribute('aria-pressed', String(studio && state.view === 'map'));
    $('designThemeBtn').setAttribute('aria-pressed', String(state.kind === 'design'));
    $('canvasNav').hidden = !canvas; $('canvasTools').hidden = !canvas;
    if (!canvas && state.popEl && $('appBar').contains(state.popAnchor)) closePop();
  }

  /* Canvas-transitions: site-wide, no selection involved, so it is reachable through a
     small popover (the header's Background segment, #designBackgroundBtn, and js/main.js's
     unconditional "Edit canvas" context-menu entry) instead of living in #selToolbar -- reusing
     openPop()'s own positioning rather than inventing a third system, per the plan's "your
     call on exact placement" for this one site-wide exception. No local re-render is wired
     into this ctx.set: the round trip (postCmsCanvasTransitionsCommand -> real iframe ->
     'defxn-cms-preview-canvas-transitions-replace' -> cmsSourceSite updated ->
     renderInspector() -> schedule()'s own refreshPop()) already repaints the open popover
     from the fresh cmsSourceSite, the same as it always has. */
  function renderCanvasTransitionsPopoverContent(pane) {
    const head = document.createElement('h4'); head.textContent = 'Background transition'; pane.appendChild(head);
    const note = document.createElement('p'); note.className = 'hint';
    note.textContent = 'How the background (lattice / atmosphere / brand-mesh) fades out and in between pages. Site-wide, not per page.';
    pane.appendChild(note);
    const cfg = Object.assign({}, CMS_CANVAS_TRANSITIONS_DEFAULT, (state.cmsSourceSite && state.cmsSourceSite.canvasTransitions) || {});
    const ctx = { get: (key) => cfg[key], set: (key, value) => postCmsCanvasTransitionsCommand({ [key]: value }) };
    pane.appendChild(ctlSegField(ctx, 'Effect', 'effect', CMS_CANVAS_EFFECTS));
    pane.appendChild(ctlField(ctx, 'Fade out (ms)', 'outDuration', { min: 0, max: 1200, step: 10 }));
    pane.appendChild(ctlField(ctx, 'Fade in (ms)', 'inDuration', { min: 0, max: 1200, step: 10 }));
    pane.appendChild(ctlSegField(ctx, 'Easing', 'easing', CMS_CANVAS_EASINGS));
    const preview = document.createElement('button'); preview.className = 'btn small primary'; preview.type = 'button';
    preview.textContent = 'Preview this transition'; preview.style.marginTop = '8px';
    preview.addEventListener('click', postCmsCanvasTransitionPreview);
    pane.appendChild(preview);
    const hint = document.createElement('p'); hint.className = 'hint';
    hint.textContent = 'Previews instantly in the connected site above -- no page navigation. Save still writes it to the project like every other Studio edit.';
    pane.appendChild(hint);
  }
  /* It previews on the real page, so it opens over the canvas: from Theme & defaults or the
     sitemap, Background first brings the canvas back. A second press closes it. */
  function openCanvasTransitionsPopover() {
    const anchor = $('designBackgroundBtn');
    if (state.popAnchor === anchor) { closePop(); return; }
    if (state.kind !== 'studio') selectStudio();
    if (state.view !== 'design') setView('design');
    openPop(anchor, renderCanvasTransitionsPopoverContent, 'left');
  }
  $('designBackgroundBtn').addEventListener('click', openCanvasTransitionsPopover);
  /* The header's Design views: Canvas and Sitemap are this canvas's two views (entering Studio
     first when Theme & defaults is showing); Theme & defaults is the site-wide config editor.
     Background is wired next to its popover (openCanvasTransitionsPopover). */
  function showDesignView(v) { if (state.kind !== 'studio') selectStudio(); setView(v); }
  $('designCanvasBtn').addEventListener('click', () => showDesignView('design'));
  $('designMapBtn').addEventListener('click', () => showDesignView('map'));
  $('designThemeBtn').addEventListener('click', () => selectDesign());

  $('devices').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; state.device = +b.dataset.d; for (const x of $('devices').children) x.setAttribute('aria-pressed', String(x === b)); if (state.view !== 'design') setView('design'); layoutStage(); schedule(); });
  $('mode').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    state.live = b.dataset.m === 'live'; for (const x of $('mode').children) x.setAttribute('aria-pressed', String(x === b));
    $('shell').classList.toggle('live', state.live); closePop();
    postCmsPreviewMode();
    if (state.live && state.view !== 'design') setView('design');
    layoutStage(); schedule();
  });
  $('btnUndo').addEventListener('click', undo);
  $('btnRedo').addEventListener('click', redo);
  A.provide({ closePop: closePop, openCanvasTransitionsPopover: openCanvasTransitionsPopover,
      openPop: openPop, refreshPop: refreshPop, renderInspector: renderInspector,
      renderPageBtn: renderPageBtn, syncHeader: syncHeader });
})();

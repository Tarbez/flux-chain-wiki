/* =====================================================================
   ADMIN EDITOR · HEADER AND POPOVERS (js/admin/header.js)
   ---------------------------------------------------------------------
   Owns: the one app header's page switcher (a search over the one page list, js/admin/rail.js
   siteList), the canvas strip's controls (screen size, Edit / Preview, the size note), the
   views (the page / Site map / Site style, in the More menu) and the Page transition popover,
   syncHeader() (which of them show), renderInspector() (the selection repaint: toolbar,
   undo/redo state, the size note), and the one header popover (openPop/closePop/refreshPop/
   menu) every header control opens -- registered with the one overlay stack (overlay.js), so
   Esc, a press outside or a press on the canvas close it the same way as every other.
   Must not: own what a popover shows when another file builds it (page SEO: seo.js;
   Design check: design-check.js) -- it positions and opens, they fill.
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, $ = A.$, ic = A.ic, h = A.h, overlay = A.overlay, openRoute = A.openRoute, refuse = A.refuse, DEVICES = A.DEVICES,
      CMS_CANVAS_TRANSITIONS_DEFAULT = A.CMS_CANVAS_TRANSITIONS_DEFAULT,
      postCmsCanvasTransitionsCommand = A.postCmsCanvasTransitionsCommand, ctlSegField = A.ctlSegField,
      CMS_CANVAS_EFFECTS = A.CMS_CANVAS_EFFECTS, ctlField = A.ctlField,
      CMS_CANVAS_EASINGS = A.CMS_CANVAS_EASINGS,
      postCmsCanvasTransitionPreview = A.postCmsCanvasTransitionPreview,
      layoutStage = A.layoutStage, schedule = A.schedule,
      postCmsPreviewMode = A.postCmsPreviewMode, rememberDevice = A.rememberDevice;
  /* defined by files loaded after this one: resolved when called */
  var setView = A.later('setView'), renderSelToolbar = A.later('renderSelToolbar'), siteList = A.later('siteList'),
      historyState = A.later('historyState'), undo = A.later('undo'), redo = A.later('redo');

  /* false until the popover code below has run. In the single-file editor this held syncHeader()
     off until the Studio block's `let view`/popover state existed; view and the popover anchor
     are shared state now (js/admin/state.js), so it only says this file has finished loading. */
  var headerReady = false;

  /* the open popover's builder (its element and anchor are state.popEl/popAnchor): refreshPop() reruns it */
  let popBuild = null;
  function closePop() { if (state.popEl) overlay.close(state.popEl, 'close'); }
  /* the popover's element leaves with it; whoever closes it (Esc, a press outside, the canvas,
     another popover, closePop) goes through here, via the overlay stack */
  function popClosed() {
    if (state.popEl) state.popEl.remove();
    state.popEl = null; state.popAnchor = null; popBuild = null;
  }
  function openPop(anchor, build, align) {
    if (state.popAnchor === anchor) { closePop(); return; }
    closePop();
    const p = document.createElement('div'); p.className = 'pop'; p.setAttribute('role', 'dialog');
    $('studioRoot').appendChild(p); state.popEl = p; state.popAnchor = anchor; popBuild = build;
    overlay.open(p, { anchor, level: 'popover', onClose: popClosed });
    p.dataset.align = align || 'left';
    build(p);
    /* the editor's one close button: a touch screen has no Esc */
    p.appendChild(overlay.closeButton(() => closePop()));
    positionPop();
    const f = p.querySelector('input[type="search"], button:not(.ov-close), input, select'); if (f) f.focus({ preventScroll: true });
  }
  /* A popover opened from the More menu hangs from More: its own item is hidden with the menu. */
  function placedFrom(anchor) {
    return anchor && anchor.isConnected && !anchor.closest('[hidden]') && anchor.getClientRects().length ? anchor : $('accountBtn');
  }
  function positionPop() {
    if (!state.popEl || !state.popAnchor) return;
    const r = placedFrom(state.popAnchor).getBoundingClientRect(), pw = state.popEl.offsetWidth, ph = state.popEl.offsetHeight;
    const right = state.popEl.dataset.align === 'right' || !placedFrom(state.popAnchor).closest('#pageNav, #canvasTools');
    let left = right ? r.right - pw : r.left;
    left = Math.max(8, Math.min(left, innerWidth - pw - 8));
    let top = r.bottom + 6; if (top + ph > innerHeight - 8) top = Math.max(8, r.top - ph - 6);
    state.popEl.style.left = left + 'px'; state.popEl.style.top = top + 'px';
  }
  function refreshPop() {
    if (!state.popEl || !popBuild) return;
    if (popBuild.holdWhileEditing && state.popEl.contains(document.activeElement) && document.activeElement.matches('input, textarea, select')) return;
    /* a popover whose content no preview message changes is not rebuilt under the pointer */
    if (popBuild.still) return;
    const sc = state.popEl.scrollTop; state.popEl.textContent = ''; popBuild(state.popEl); state.popEl.appendChild(overlay.closeButton(() => closePop())); state.popEl.scrollTop = sc; positionPop();
  }
  headerReady = true;
  window.addEventListener('resize', positionPop);
  function menu(box, items) {
    const m = document.createElement('div'); m.className = 'menu';
    for (const it of items) {
      if (it === '-') { const s = document.createElement('div'); s.className = 'sep'; m.appendChild(s); continue; }
      const b = document.createElement('button'); b.type = 'button'; b.innerHTML = `${ic(it.icon || 'cursor')}<span></span>${it.hint ? '<small></small>' : ''}`;
      b.children[1].textContent = it.label; if (it.hint) b.lastChild.textContent = it.hint; if (it.on) { b.classList.add('on'); b.setAttribute('aria-current', 'page'); } if (it.danger) b.classList.add('danger');
      if (it.title) b.title = it.title;
      b.addEventListener('click', () => { closePop(); it.run(); }); m.appendChild(b);
    }
    box.appendChild(m);
  }

  /* ---- the page switcher ----------------------------------------------------------------
     A quick search over THE page list -- the rail's Pages tab draws the same rows from the same
     siteList() (js/admin/rail.js), so a page has one name everywhere (docs/ux-audit/cms.md P1-3:
     /about was "About: everyone is our business partner" here, "DEFXN overview" in the rail and
     its H1 on the canvas) and one list to find it in (P1-4: two lists of 69, neither searchable). */
  function currentName() {
    const row = siteList().rows.find((r) => r.path === state.cmsCurrentRoute && r.on) || siteList().rows.find((r) => r.path === state.cmsCurrentRoute);
    return row ? row.title : state.cmsCurrentRoute;
  }
  function renderPageBtn() {
    const b = $('btnPage'), route = state.cmsRoutes.find((r) => r.path === state.cmsCurrentRoute);
    b.innerHTML = `${ic(route && route.seoArticle ? 'article' : state.cmsCurrentRoute === '/' ? 'home' : 'page')}<span></span><small></small>${ic('chev', 'sm')}`;
    b.children[1].textContent = currentName(); b.children[2].textContent = state.cmsCurrentRoute;
    b.setAttribute('aria-label', 'Page: ' + currentName() + ' (switch page)');
  }
  function renderPagePicker(p) {
    p.classList.add('page-pick');
    const list = siteList();
    const search = h('input', { type: 'search', class: 'pick-search', placeholder: 'Find a page', 'aria-label': 'Find a page by name or address', autocomplete: 'off', spellcheck: 'false' });
    const box = h('div', { class: 'menu pick-list', role: 'listbox', 'aria-label': 'Pages' });
    const empty = h('p', { class: 'hint', hidden: true, text: 'No page matches. Try part of its name or its address (like /about).' });
    const draw = () => {
      const q = search.value.trim().toLowerCase();
      box.textContent = '';
      let shown = 0;
      list.groups.forEach((group) => {
        const rows = group.rows.filter((r) => !q || r.title.toLowerCase().includes(q) || r.path.toLowerCase().includes(q));
        if (!rows.length) return;
        box.appendChild(h('h4', { text: group.name }));
        rows.forEach((r) => {
          shown++;
          const b = h('button', { type: 'button', class: 'pick-row' + (r.path === state.cmsCurrentRoute ? ' on' : ''), role: 'option', 'aria-selected': String(r.path === state.cmsCurrentRoute), title: 'Open ' + r.title + ' (' + r.path + ')' });
          b.innerHTML = `${ic(r.icon)}<span></span><small></small>`;
          b.children[1].textContent = r.title; b.children[2].textContent = r.path;
          b.addEventListener('click', () => { closePop(); r.onOpen(); });
          box.appendChild(b);
        });
      });
      empty.hidden = shown > 0;
    };
    /* the query outlives a repaint of the open popover (it is cleared when the picker opens anew) */
    search.value = pickQuery;
    search.addEventListener('input', () => { pickQuery = search.value; draw(); });
    /* Enter opens the first match; the arrow keys walk the list */
    search.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { const first = box.querySelector('.pick-row'); if (first) { e.preventDefault(); first.click(); } }
      if (e.key === 'ArrowDown') { const first = box.querySelector('.pick-row'); if (first) { e.preventDefault(); first.focus(); } }
    });
    box.addEventListener('keydown', (e) => {
      const rows = [...box.querySelectorAll('.pick-row')], i = rows.indexOf(document.activeElement);
      if (i < 0 || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
      e.preventDefault();
      const j = i + (e.key === 'ArrowDown' ? 1 : -1);
      if (j < 0) search.focus(); else if (rows[j]) rows[j].focus();
    });
    p.append(search, box, empty);
    draw();
    /* "Open in a new tab" was Content mode's preview pane's "Open" link: the page as a visitor
       loads it from the project (saved files, not these drafts) */
    menu(p, ['-', { icon: 'plus', label: 'New page or article…', run: () => A.later('openNewItem')() },
      { icon: 'sitemap', label: 'Site map', hint: 'every page and its links', run: () => setView('map') },
      { icon: 'ext', label: 'Open this page in a new tab', hint: 'as saved', run: () => window.open('index.html#' + state.cmsCurrentRoute, '_blank', 'noopener') }]);
    const on = box.querySelector('.pick-row.on'); if (on) on.scrollIntoView({ block: 'nearest' });
  }
  /* the page list does not change while the switcher is open: never rebuilt by refreshPop (it
     re-ran on every preview message and replaced the rows under the pointer) */
  renderPagePicker.still = true;
  let pickQuery = '';
  $('btnPage').addEventListener('click', (e) => { if (state.popAnchor !== e.currentTarget) pickQuery = ''; openPop(e.currentTarget, renderPagePicker); });

  /* The size note says, in words and beside the screen-size switch, what a style edit at this
     size applies to (docs/ux-audit/cms.md P1-13). Only where it is true: in Edit style, on a
     canvas, at tablet or phone size. Undo / Redo read the ONE history (js/admin/history.js). */
  const SCOPE = ['', 'Tablet and phone only', 'Phone only'];
  function renderInspector() {
    renderSelToolbar();
    const hist = historyState();
    refuse($('btnUndo'), hist.canUndo ? '' : 'Nothing to undo yet: text, style and layout edits can be undone here.');
    refuse($('btnRedo'), hist.canRedo ? '' : 'Nothing to redo: undo an edit first.');
    if (hist.canUndo) $('btnUndo').title = 'Undo ' + hist.undoLabel + ' (Ctrl/Cmd+Z)';
    if (hist.canRedo) $('btnRedo').title = 'Redo ' + hist.redoLabel + ' (Ctrl/Cmd+Shift+Z)';
    const bn = $('bpNote'); bn.hidden = state.device === 0 || state.live || state.view === 'map' || state.lens !== 'design';
    bn.title = state.device ? `Style changes you make now apply at ${DEVICES[state.device][0].toLowerCase()} size${state.device === 1 ? ' and smaller' : ''}; the desktop page keeps its own. Switch to Desktop to change every size.` : '';
    bn.innerHTML = state.device ? `${ic('warn', 'sm')}<b>${SCOPE[state.device]}</b><span> · style changes apply at this size</span>` : '';
  }

  /* The one header's state (admin-app.html's #appBar): which view is pressed, and the canvas
     tools (breakpoints, undo/redo, Design check, Edit/Live), which show whenever a canvas is on
     screen -- the Canvas view, and the Theme view, where the canvas stays live beside the
     settings. The page picker, its fields and its SEO show in every view. Called from
     renderList() (every draft change) and setView(). */
  function syncHeader() {
    if (!headerReady) return;
    for (const b of $('viewSwitch').querySelectorAll('[data-view]')) b.setAttribute('aria-pressed', String(b.dataset.view === state.view));
    $('canvasTools').hidden = state.view === 'map';
    /* Design tips are about how the page looks: the Edit style lens's, never a score shouting
       on every page in both lenses (docs/ux-audit/cms.md P1-10) */
    $('btnCheck').hidden = state.lens !== 'design';
    if (state.popEl && (($('canvasTools').contains(state.popAnchor) && state.view === 'map') || ($('btnCheck') === state.popAnchor && $('btnCheck').hidden))) closePop();
    document.body.dataset.lens = state.lens;
  }

  /* Canvas-transitions: site-wide, no selection involved, so it is reachable through a
     small popover (the header's Background segment, #backgroundBtn, and js/main.js's
     unconditional "Edit canvas" context-menu entry) instead of living in #selToolbar -- reusing
     openPop()'s own positioning rather than inventing a third system, per the plan's "your
     call on exact placement" for this one site-wide exception. No local re-render is wired
     into this ctx.set: the round trip (postCmsCanvasTransitionsCommand -> real iframe ->
     'defxn-cms-preview-canvas-transitions-replace' -> cmsSourceSite updated ->
     renderInspector() -> schedule()'s own refreshPop()) already repaints the open popover
     from the fresh cmsSourceSite, the same as it always has. */
  function renderCanvasTransitionsPopoverContent(pane) {
    /* "Page transition", not "Background": Site style's Background section is the backdrop layer
       itself (Contours, Fabric, Rift ...); this is how one page changes into the next
       (docs/ux-audit/cms.md P1-9). */
    const head = document.createElement('h4'); head.textContent = 'Page transition'; pane.appendChild(head);
    const note = document.createElement('p'); note.className = 'hint';
    note.textContent = 'How the page fades out and the next one fades in when a visitor moves between pages. One setting for the whole site.';
    pane.appendChild(note);
    const cfg = Object.assign({}, CMS_CANVAS_TRANSITIONS_DEFAULT, (state.cmsSourceSite && state.cmsSourceSite.canvasTransitions) || {});
    const ctx = { get: (key) => cfg[key], set: (key, value) => postCmsCanvasTransitionsCommand({ [key]: value }) };
    pane.appendChild(ctlSegField(ctx, 'Effect', 'effect', CMS_CANVAS_EFFECTS));
    pane.appendChild(ctlField(ctx, 'Fade out (ms)', 'outDuration', { min: 0, max: 1200, step: 10 }));
    pane.appendChild(ctlField(ctx, 'Fade in (ms)', 'inDuration', { min: 0, max: 1200, step: 10 }));
    pane.appendChild(ctlSegField(ctx, 'Easing', 'easing', CMS_CANVAS_EASINGS));
    const preview = document.createElement('button'); preview.className = 'btn small'; preview.type = 'button';
    preview.textContent = 'Preview this transition'; preview.style.marginTop = '8px';
    preview.addEventListener('click', postCmsCanvasTransitionPreview);
    pane.appendChild(preview);
    const hint = document.createElement('p'); hint.className = 'hint';
    hint.textContent = 'Plays on the page beside you without leaving it. Save keeps it, like every other change.';
    pane.appendChild(hint);
  }
  /* It previews on the real page, so it needs a canvas on screen: from the site map, Page
     transition first brings the canvas back. A second press closes it. */
  function openCanvasTransitionsPopover() {
    const anchor = $('backgroundBtn');
    if (state.popAnchor === anchor) { closePop(); return; }
    if (state.view === 'map') setView('design');
    openPop(anchor, renderCanvasTransitionsPopoverContent, 'left');
  }
  $('backgroundBtn').addEventListener('click', openCanvasTransitionsPopover);
  /* The views of the one site: the page, Site map, Site style (setView, js/admin/sitemap.js), in
     the More menu. Page transition is wired next to its popover (openCanvasTransitionsPopover). */
  for (const b of $('viewSwitch').querySelectorAll('[data-view]')) b.addEventListener('click', () => setView(b.dataset.view));

  /* The screen-size and Edit / Preview groups are Ark's toggle groups (js/admin/ark-host.js
     arkSegGroup): one pressed, one tab stop, arrows between the choices. The breakpoint buttons
     show state.device, which canvas.js chose before the first paint (the last choice, else this
     screen's own breakpoint); a press is an explicit choice: remembered. */
  const deviceButtons = [...$('devices').querySelectorAll('button')];
  A.arkSegGroup($('devices'), deviceButtons, { selected: deviceButtons.findIndex((b) => +b.dataset.d === state.device),
    onPick: (_i, b) => { state.device = +b.dataset.d; rememberDevice(state.device); if (state.view === 'map') setView('design'); layoutStage(); schedule(); } });
  const modeButtons = [...$('mode').querySelectorAll('button')];
  A.arkSegGroup($('mode'), modeButtons, { selected: modeButtons.findIndex((b) => (b.dataset.m === 'live') === !!state.live),
    onPick: (_i, b) => {
      state.live = b.dataset.m === 'live';
      $('shell').classList.toggle('live', state.live); closePop();
      syncHeader(); renderInspector();
      postCmsPreviewMode();
      if (state.live && state.view === 'map') setView('design');
      layoutStage(); schedule();
    } });
  $('btnUndo').addEventListener('click', () => undo());
  $('btnRedo').addEventListener('click', () => redo());
  A.provide({ closePop: closePop, openCanvasTransitionsPopover: openCanvasTransitionsPopover,
      openPop: openPop, refreshPop: refreshPop, renderInspector: renderInspector,
      renderPageBtn: renderPageBtn, syncHeader: syncHeader });
})();

/* =====================================================================
   ADMIN EDITOR · TOOLBAR SHELL (js/admin/toolbar.js)
   ---------------------------------------------------------------------
   Owns: #selToolbar and its one popover #selToolbarPop -- the bar beside the selection
   (chip, one icon per section, actions), which section is open, keyboard roving and
   focus that survives a repaint, and renderSelToolbar(), the type dispatch that picks
   the sections for what is selected.
   Must not: place itself (placeSelToolbar, js/admin/canvas.js) or hold a section's
   controls (js/admin/toolbar-sections.js).
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, ic = A.ic, $ = A.$, selToolbarVisible = A.selToolbarVisible,
      selToolbarKind = A.selToolbarKind, cmsTreeRowForKey = A.cmsTreeRowForKey,
      CMS_TAG_ICON = A.CMS_TAG_ICON, DEVICES = A.DEVICES, makeFrameCtx = A.makeFrameCtx,
      buildFrameSection = A.buildFrameSection, buildTypographySection = A.buildTypographySection,
      buildFillSection = A.buildFillSection, buildSpacingSection = A.buildSpacingSection,
      buildAltTextSection = A.buildAltTextSection, buildLayoutSection = A.buildLayoutSection,
      buildSizeSection = A.buildSizeSection, buildEffectsSection = A.buildEffectsSection,
      buildComponentInstanceSection = A.buildComponentInstanceSection,
      buildStateGroupSection = A.buildStateGroupSection,
      buildElementMotionSection = A.buildElementMotionSection,
      postCmsLayoutOperation = A.postCmsLayoutOperation, cmsPreview = A.cmsPreview,
      openContentEditor = A.openContentEditor, selectDesign = A.selectDesign,
      placeSelToolbar = A.placeSelToolbar;

  /* =========================================================================
     The toolbar SHELL (owner request 2026-10-18: "redesign into horizontal bar with icons
     and those become popovers"). The old shell stacked every section as an accordion row
     under a header chip -- up to 580px tall -- and covered the page it was editing. Now:
       #selToolbar     one compact row beside the selection (placeSelToolbar): the element
                       chip, one icon button per taxonomy section, a separator, the actions.
       #selToolbarPop  ONE popover holding the open section's controls, anchored to its
                       button. It lives outside the zoomed #stage (position: fixed in
                       #studioRoot), so it is never shrunk by the zoom or clipped by the
                       canvas scroller.
     The section builders above are the same builders: each asks for a body to fill
     (toolbarSection, which replaced accordion() for them) and fills it exactly as before.
     Only the OPEN section gets the real popover body; every other builder fills a detached
     element that is dropped. Running all of them is what registers each section's icon, so
     the taxonomy stays in one place -- renderSelToolbar's dispatch -- instead of a second
     "which sections exist" list that could drift from it.
     ========================================================================= */
  /* The sections that say WHAT the selection is. Their icons carry an accent mark, and the
     one just made by "Make into states" / "Make into component" opens by itself: when it did
     not (a collapsed row among six), the only visible change after Make into states was one
     more closed row and the owner read it as "I clicked it but nothing happened" (regression:
     tests/cms-toolbar-identity-sections-open.cjs). Value: the cmsExactSelection field that
     says the section applies. */
  const TB_IDENTITY = { 'cms-states': 'stateGroup', 'cms-component': 'component' };
  /* state.tbOpen (js/admin/state.js): the open section ('' = none) for the selection key
     state.tbOpenKey -- selecting something else closes it. state.tbAutoOpen: an identity section
     waiting for its selection (the preview's "created" message and the new selection are
     separate messages, in either order), dropped after a few seconds so a stale one never opens
     on a later selection. Those three are shared because the preview protocol (js/admin/
     bridge.js) sets them; the rest is this file's own. tbPopBody/tbPopTitle: the open section's
     popover body and title while renderSelToolbar() builds it. tbRoving: the bar button that
     holds the roving tab stop. */
  let tbPopBody = null, tbPopTitle = '', tbRoving = '';
  const TB_FOCUSABLE = 'button:not([disabled]), input, select, textarea';
  function toolbarSection(pane, key, title, icon) {
    const name = title.replace(/\s*\(\d+\)$/, ''), count = (/\((\d+)\)$/.exec(title) || [])[1];
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tb-btn' + (key in TB_IDENTITY ? ' identity' : '');
    b.dataset.tb = key; b.dataset.section = key; b.dataset.name = name; b.dataset.tip = title;
    b.setAttribute('aria-label', title); b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-controls', 'selToolbarPop'); b.setAttribute('aria-expanded', String(state.tbOpen === key));
    b.innerHTML = ic(icon) + (count ? `<span class="tb-count">${count}</span>` : '');
    b.addEventListener('click', () => setToolbarSection(state.tbOpen === key ? '' : key, true));
    pane.appendChild(b);
    if (state.tbOpen !== key) return document.createElement('div');
    tbPopTitle = title; return tbPopBody;
  }
  /* open (key) or close ('') the one popover. byUser: a click or a key press, so focus moves
     into the popover on open and back to its button on close; an outside click or a new
     selection closes without taking focus anywhere. */
  function setToolbarSection(key, byUser) {
    const was = state.tbOpen;
    state.tbOpen = key; state.tbOpenKey = key && state.cmsExactSelection ? state.cmsExactSelection.key : '';
    if (key) { state.tbAutoOpen = null; tbRoving = key; }
    renderSelToolbar();
    if (!byUser) return;
    if (key) { const body = $('selToolbarPop').querySelector('.tb-pop-body'), first = (body && body.querySelector(TB_FOCUSABLE)) || $('selToolbarPop').querySelector('.tb-pop-x'); if (first) first.focus({ preventScroll: true }); }
    else if (was) { const btn = $('selToolbar').querySelector(`[data-tb="${was}"]`); if (btn) btn.focus({ preventScroll: true }); }
  }
  function toolbarAction(group, id, icon, label, run, refusal) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tb-btn tb-act';
    b.dataset.tb = id; b.dataset.action = id; b.dataset.tip = refusal ? label + ' -- ' + refusal : label;
    b.setAttribute('aria-label', label); b.innerHTML = ic(icon);
    if (refusal) { b.disabled = true; b.title = refusal; }
    b.addEventListener('click', run);
    group.appendChild(b); return b;
  }
  /* The type-dispatch itself: given the current selection, decide which sections to show
     (the taxonomy above) and render them into #selToolbar using the consolidated builders.
     Wired as the "selection changed" repaint by renderInspector() (called from both
     schedule()'s rAF tick and directly from every relevant cmsPreview message handler --
     the exact same triggers renderElementPane() used to repaint on). A control edit
     re-renders too, so the open popover is rebuilt in place: focus, an uncommitted typed
     value and the scroll position carry over, so it never closes or drops input mid-edit. */
  function renderSelToolbar() {
    const box = $('selToolbar'), pop = $('selToolbarPop');
    if (!selToolbarVisible()) {
      /* the preview's right-click menu hides the bar only while it is open; anything else
         (Live, the sitemap, no selection) ends the editing session with it */
      if (!state.cmsContextMenuOpen) state.tbOpen = '';
      box.hidden = true; pop.hidden = true; return;
    }
    const key = state.cmsExactSelection.key, kind = selToolbarKind(state.cmsExactSelection);
    const sameEdit = !!state.tbOpen && state.tbOpenKey === key && !pop.hidden;
    if (state.tbOpenKey !== key) state.tbOpen = '';
    if (state.tbAutoOpen && Date.now() - state.tbAutoOpen.at > 5000) state.tbAutoOpen = null;
    if (state.tbAutoOpen && kind !== 'group' && state.cmsExactSelection[TB_IDENTITY[state.tbAutoOpen.key]]) { state.tbOpen = state.tbAutoOpen.key; state.tbOpenKey = key; state.tbAutoOpen = null; }
    const active = document.activeElement, barFocus = active && box.contains(active) ? active.dataset.tb : '';
    let popFocus = null;
    if (sameEdit && active && pop.contains(active)) {
      popFocus = { i: [...pop.querySelectorAll(TB_FOCUSABLE)].indexOf(active), tag: active.tagName, typed: active.tagName === 'TEXTAREA' || (active.tagName === 'INPUT' && /^(text|number|search|url|email)$/.test(active.type)), value: active.value };
      try { popFocus.start = active.selectionStart; popFocus.end = active.selectionEnd; } catch (e) { /* number inputs have no selection */ }
    }
    const popScroll = sameEdit && pop.querySelector('.tb-pop-body') ? pop.querySelector('.tb-pop-body').scrollTop : 0;
    box.hidden = false; box.textContent = '';
    box.dataset.key = key; box.dataset.kind = kind;
    box.setAttribute('aria-label', 'Selection: ' + (state.cmsExactSelection.label || key));
    const row = cmsTreeRowForKey(key);
    const chip = document.createElement('span'); chip.className = 'tb-chip'; chip.title = key;
    chip.innerHTML = ic(kind === 'group' ? 'grid' : CMS_TAG_ICON[row ? row.tag : ''] || 'box', 'sm') + '<span class="tb-chip-name"></span>';
    chip.querySelector('.tb-chip-name').textContent = state.cmsExactSelection.label || key;
    if (state.device) { const bp = document.createElement('span'); bp.className = 'tb-bp'; bp.textContent = DEVICES[state.device][0] + ' ↓'; bp.title = `Changes apply to ${DEVICES[state.device][0].toLowerCase()} and smaller. Orange dots are overrides; click one to reset it.`; chip.appendChild(bp); }
    box.appendChild(chip);
    tbPopBody = document.createElement('div'); tbPopBody.className = 'tb-pop-body'; tbPopTitle = '';
    const ctx = makeFrameCtx();
    if (kind === 'group') {
      buildFrameSection(box, ctx, true);
    } else {
      if (kind === 'text') { buildTypographySection(box, ctx); buildFillSection(box, ctx); buildSpacingSection(box, ctx); buildFrameSection(box, ctx, false); }
      else if (kind === 'image') { buildFrameSection(box, ctx, false); buildFillSection(box, ctx); buildAltTextSection(box); }
      /* Size (max width / min height) belongs to a box: buildSizeSection was ported and then never
         called, so those two stored frame keys had no control at all while tests/admin-studio.cjs
         asserted the panel existed (regression: tests/cms-toolbar-taxonomy.cjs) */
      else { buildLayoutSection(box, ctx); buildFillSection(box, ctx); buildSpacingSection(box, ctx); buildFrameSection(box, ctx, false); buildSizeSection(box, ctx); buildEffectsSection(box, ctx); }
      if (state.cmsExactSelection.component) buildComponentInstanceSection(box);
      if (state.cmsExactSelection.stateGroup) buildStateGroupSection(box);
      buildElementMotionSection(box);
    }
    if (state.tbOpen && !box.querySelector(`[data-section="${state.tbOpen}"]`)) state.tbOpen = '';
    /* two groups that each stay on one row, so a narrow bar wraps between sections and
       actions rather than mid-group; the hairline between them is the sections group's edge */
    const sections = document.createElement('div'); sections.className = 'tb-group tb-sections'; sections.append(...box.querySelectorAll('[data-section]'));
    const actions = document.createElement('div'); actions.className = 'tb-group tb-actions';
    box.append(sections, actions);
    /* Ungroup used to sit at the bottom of a group's Frame section; it is an action on the
       selection, not a property of it, so it is a bar button beside the others */
    if (kind === 'group') toolbarAction(actions, 'ungroup', 'layers', 'Ungroup', () => postCmsLayoutOperation('ungroup'));
    /* the same action as the canvas right-click menu's "Make into component" (js/main.js's
       cmsMakeComponent decides, and refuses with a reason, against the real selection) */
    const compRefusal = state.cmsExactSelections.some((sel) => sel.component || sel.stateGroup) ? 'Select page content, not an inserted block or a state group' : '';
    toolbarAction(actions, 'make-component', 'wand', 'Make into component', () => { if (state.cmsConnected && cmsPreview.contentWindow) cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-make-component' }, window.location.origin); }, compRefusal);
    toolbarAction(actions, 'content-cms', 'article', 'Open in Content', () => openContentEditor());
    toolbarAction(actions, 'design-controls', 'palette', 'Theme & defaults', () => selectDesign());
    /* one roving tab stop: Tab lands on the bar once, the arrow keys move along it */
    const buttons = [...box.querySelectorAll('button:not([disabled])')];
    const stop = buttons.find((b) => b.dataset.tb === (barFocus || tbRoving)) || buttons.find((b) => b.dataset.tb === state.tbOpen) || buttons[0];
    buttons.forEach((b) => { b.tabIndex = b === stop ? 0 : -1; });
    if (barFocus && stop) stop.focus({ preventScroll: true });
    if (state.tbOpen) {
      pop.textContent = '';
      pop.setAttribute('aria-label', tbPopTitle);
      const head = document.createElement('div'); head.className = 'tb-pop-head';
      head.innerHTML = `<span></span><button type="button" class="tb-pop-x" aria-label="Close" title="Close (Esc)">${ic('close', 'sm')}</button>`;
      head.firstChild.textContent = tbPopTitle;
      head.lastChild.addEventListener('click', () => setToolbarSection('', true));
      pop.append(head, tbPopBody);
      pop.hidden = false;
      tbPopBody.scrollTop = popScroll;
      const again = popFocus && popFocus.i >= 0 ? [...pop.querySelectorAll(TB_FOCUSABLE)][popFocus.i] : null;
      if (again && again.tagName === popFocus.tag) {
        if (popFocus.typed && again.value !== popFocus.value) again.value = popFocus.value;
        again.focus({ preventScroll: true });
        try { if (popFocus.typed && popFocus.start != null) again.setSelectionRange(popFocus.start, popFocus.end); } catch (e) { /* number inputs have no selection */ }
      }
    } else { pop.hidden = true; pop.textContent = ''; delete box.dataset.pop; }
    placeSelToolbar();
  }
  /* The popover hangs off its button on the side AWAY from the selection when it fits there
     (placeSelToolbar records which side of the selection the bar took), else on whichever
     side has more room, shortened to fit; clamped inside the viewport below the app header. */
  function placeToolbarPop() {
    const pop = $('selToolbarPop'), box = $('selToolbar');
    if (pop.hidden || box.hidden) return;
    const btn = box.querySelector(`[data-section="${state.tbOpen}"]`); if (!btn) return;
    const b = btn.getBoundingClientRect(), bar = box.getBoundingClientRect(), gap = 6;
    const minTop = Math.max(8, $('studioRoot').getBoundingClientRect().top + 8), maxBottom = innerHeight - 8;
    pop.style.maxHeight = '';
    const roomUp = bar.top - gap - minTop, roomDown = maxBottom - bar.bottom - gap;
    let ph = pop.offsetHeight;
    const preferUp = box.dataset.side === 'above';
    const up = preferUp ? (ph <= roomUp || roomUp >= roomDown) : !(ph <= roomDown || roomDown >= roomUp);
    const room = Math.max(120, up ? roomUp : roomDown);
    if (ph > room) { pop.style.maxHeight = room + 'px'; ph = room; }
    const pw = pop.offsetWidth;
    pop.style.top = (up ? bar.top - gap - ph : bar.bottom + gap) + 'px';
    box.dataset.pop = up ? 'up' : 'down';   /* the bar's tooltips use the other side */
    pop.style.left = Math.max(8, Math.min(b.left - 6, innerWidth - pw - 8)) + 'px';
  }
  $('selToolbar').addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.tbOpen) { e.preventDefault(); e.stopPropagation(); setToolbarSection('', true); return; }
    const buttons = [...$('selToolbar').querySelectorAll('button:not([disabled])')], i = buttons.indexOf(document.activeElement);
    if (i < 0) return;
    const j = e.key === 'ArrowRight' ? (i + 1) % buttons.length : e.key === 'ArrowLeft' ? (i - 1 + buttons.length) % buttons.length : e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : -1;
    if (j < 0) return;
    e.preventDefault();
    buttons.forEach((b, k) => { b.tabIndex = k === j ? 0 : -1; });
    tbRoving = buttons[j].dataset.tb; buttons[j].focus();
  });
  $('selToolbarPop').addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setToolbarSection('', true); } });
  /* outside click closes; so does a click into the preview, which never reaches this
     document as a pointer event -- only as this window losing focus to the iframe */
  document.addEventListener('pointerdown', (e) => { if (state.tbOpen && !$('selToolbarPop').contains(e.target) && !$('selToolbar').contains(e.target)) setToolbarSection('', false); });
  window.addEventListener('blur', () => setTimeout(() => { if (state.tbOpen && document.activeElement === cmsPreview) setToolbarSection('', false); }, 0));
  $('studioRoot').addEventListener('scroll', placeToolbarPop, { passive: true });
  A.provide({ placeToolbarPop: placeToolbarPop, renderSelToolbar: renderSelToolbar,
      toolbarSection: toolbarSection });
})();

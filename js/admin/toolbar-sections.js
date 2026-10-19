/* =====================================================================
   ADMIN EDITOR · TOOLBAR SECTIONS (js/admin/toolbar-sections.js)
   ---------------------------------------------------------------------
   Owns: the contextual toolbar's taxonomy -- selToolbarKind() (text / container /
   image / group from the real tag) -- and every section it can show: Frame, Layout,
   Spacing, Typography, Fill, Size, Effects, Alt text, Component instance, State group,
   Element animation. Each fills the body toolbarSection() hands it, with the shared
   ctl*Field builders.
   Must not: build its own field rows, or decide which sections show for a selection
   (renderSelToolbar's dispatch, js/admin/toolbar.js).
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, postCmsLayoutCommand = A.postCmsLayoutCommand, ctlField = A.ctlField, devDetails = A.devDetails,
      postCmsLayoutReset = A.postCmsLayoutReset, postCmsLayoutOperation = A.postCmsLayoutOperation,
      ctlSegField = A.ctlSegField, CMS_DISPLAY_TOKENS = A.CMS_DISPLAY_TOKENS,
      CMS_ALIGN_TOKENS = A.CMS_ALIGN_TOKENS, CMS_JUSTIFY_TOKENS = A.CMS_JUSTIFY_TOKENS,
      CMS_WRAP_VALUES = A.CMS_WRAP_VALUES, CMS_FONT_TOKENS = A.CMS_FONT_TOKENS,
      ctlSelectField = A.ctlSelectField, CMS_TYPE_SIZE_TOKENS = A.CMS_TYPE_SIZE_TOKENS,
      CMS_FONT_WEIGHT_STEPS = A.CMS_FONT_WEIGHT_STEPS, CMS_LINE_HEIGHT_TOKENS = A.CMS_LINE_HEIGHT_TOKENS,
      CMS_TEXT_ALIGN_VALUES = A.CMS_TEXT_ALIGN_VALUES, ctlSwatchField = A.ctlSwatchField,
      CMS_TEXT_TOKENS = A.CMS_TEXT_TOKENS, CMS_FILL_TOKENS = A.CMS_FILL_TOKENS,
      CMS_RADIUS_TOKENS = A.CMS_RADIUS_TOKENS, CMS_BORDER_VALUES = A.CMS_BORDER_VALUES,
      CMS_BORDER_TOKENS = A.CMS_BORDER_TOKENS, CMS_OPACITY_STEPS = A.CMS_OPACITY_STEPS,
      CMS_OVERFLOW_VALUES = A.CMS_OVERFLOW_VALUES, h = A.h, postCmsSetAlt = A.postCmsSetAlt,
      cmsMasterKind = A.cmsMasterKind, postCmsComponentsCommand = A.postCmsComponentsCommand,
      cmsMasterProps = A.cmsMasterProps, refuse = A.refuse, renderInspector = A.renderInspector,
      cmsNextComponentId = A.cmsNextComponentId, toast = A.toast,
      cmsBlockResolverLabel = A.cmsBlockResolverLabel, postCmsStatesCommand = A.postCmsStatesCommand,
      CMS_BLOCK_RESOLVERS = A.CMS_BLOCK_RESOLVERS,
      CMS_ELEMENT_MOTION_DEFAULT_ENTRY = A.CMS_ELEMENT_MOTION_DEFAULT_ENTRY,
      postCmsElementMotionCommand = A.postCmsElementMotionCommand,
      CMS_ELEMENT_MOTION_DIRECTIONS = A.CMS_ELEMENT_MOTION_DIRECTIONS,
      CMS_ELEMENT_MOTION_EASINGS = A.CMS_ELEMENT_MOTION_EASINGS,
      postCmsElementMotionPreview = A.postCmsElementMotionPreview;
  /* defined by files loaded after this one: resolved when called */
  var renderSelToolbar = A.later('renderSelToolbar'), toolbarSection = A.later('toolbarSection'),
      cmsOpenMasterInLibrary = A.later('cmsOpenMasterInLibrary');

  /* =========================================================================
     Step 4 (flickering-juggling-donut.md): the smart contextual floating toolbar.
     Replaces renderElementPane()'s fixed accordion list with a type-dispatch that shows
     only the sections relevant to what is selected, per the plan's taxonomy:
       text-bearing element  -> Typography, Fill, Spacing, Frame
       container             -> Layout, Fill, Spacing, Frame, Size, Effects
       image                 -> Frame, Fill, alt text
       layout group          -> Frame, Ungroup (no tag of its own, so no Typography/
                                 Layout/Fill/etc -- a group key has no real element behind
                                 it for those to style)
       component instance / state group -> their own section, ADDITIONALLY to whichever of
                                 the above applies (unchanged from the old accordion's own
                                 "alongside -- not instead of" behavior, since an instance or
                                 a states-group member is still a positioned, typed element)
       element animation     -> one more accordion section for any real (non-group)
                                 selection, folding in what used to be restrictMode === 'anim'
     ========================================================================= */
  /* Derived from how js/content/layout.js's own cleanFrame()/applyFrame() actually group
     properties (text styling vs. flex/grid container styling), not a fresh guess -- see
     also CMS_TAG_ICON above for the same real-tag categorization used for Layers-tree
     icons. Anything not listed falls through to 'container', the safe default: every
     unlisted real tag (div, section, header, footer, main, nav, aside, ul, ol, form,
     table, article, ...) is structurally a box, so defaulting it to Container is never a
     wrong answer the way a missing entry in an enumerated grammar rule would be -- only
     occasionally a slightly generic one. */
  const TOOLBAR_TEXT_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'button', 'span', 'strong', 'small', 'label'];
  const TOOLBAR_IMAGE_TAGS = ['img', 'svg', 'canvas', 'video', 'picture', 'figure'];
  /* cmsExactSelection carries no `tag` of its own (js/main.js's cmsSelectionInfo() never
     reports one) -- cmsTree (the real Layers tree payload, which DOES carry `tag` per row)
     is the signal the plan points at; this walks it once by key. */
  function cmsTreeRowForKey(key) {
    const walk = (rows) => { for (const row of rows) { if (row.key === key) return row; const found = walk(row.children || []); if (found) return found; } return null; };
    return walk(state.cmsTree);
  }
  function selToolbarKind(selection) {
    if (!selection || !selection.key) return null;
    if (selection.key.indexOf('group:') === 0) return 'group';
    const row = cmsTreeRowForKey(selection.key), tag = row ? row.tag : '';
    if (TOOLBAR_IMAGE_TAGS.indexOf(tag) >= 0) return 'image';
    if (TOOLBAR_TEXT_TAGS.indexOf(tag) >= 0) return 'text';
    return 'container';
  }
  /* The one Frame/Layout/Spacing/Typography/Fill/Size/Effects ctx, shared by every section
     a given renderSelToolbar() call builds -- exactly mirroring the old single `draft`
     object every one of those accordions used to close over and collectively mutate,
     posting the WHOLE draft on every change (the layout-command post patches the entry's
     breakpoint wholesale, not per field). `values` reproduces the 7-key numeric
     fallback the old field() closure computed once per render (x/y/width/height/rotation/
     scaleX/scaleY default to 0/0/rect.width/rect.height/0/1/1 when unset); every other
     numeric field (gap/pt/pr/pb/pl/mt/mb/maxw/minh) falls back to 0 via ctlField's own
     `?? 0`, the same as draft[key] || 0 did before. */
  function makeFrameCtx() {
    const frame = state.cmsExactSelection.frame || {}, rect = state.cmsExactSelection.rect || {};
    const draft = { ...frame };
    const values = { x: frame.x == null ? 0 : frame.x, y: frame.y == null ? 0 : frame.y, width: frame.width == null ? rect.width : frame.width, height: frame.height == null ? rect.height : frame.height, rotation: frame.rotation == null ? 0 : frame.rotation, scaleX: frame.scaleX == null ? 1 : frame.scaleX, scaleY: frame.scaleY == null ? 1 : frame.scaleY };
    return {
      get: (key) => (key in values ? values[key] : draft[key]),
      set: (key, value) => { draft[key] = value; state.cmsExactSelection.frame = { ...draft }; postCmsLayoutCommand(draft); renderSelToolbar(); },
    };
  }
  function buildFrameSection(pane, ctx, isGroup) {
    const body = toolbarSection(pane, 'cms-frame', 'Frame', 'move');
    body.append(ctlField(ctx, 'X', 'x'), ctlField(ctx, 'Y', 'y'), ctlField(ctx, 'Width', 'width'), ctlField(ctx, 'Height', 'height'), ctlField(ctx, 'Rotation', 'rotation'), ctlField(ctx, 'Scale X', 'scaleX', { step: '0.01' }), ctlField(ctx, 'Scale Y', 'scaleY', { step: '0.01' }));
    const reset = document.createElement('button'); reset.className = 'btn small'; reset.type = 'button'; reset.textContent = 'Reset for this screen size'; reset.title = 'Put this element back the way it is at this screen size before your changes'; reset.addEventListener('click', postCmsLayoutReset); body.appendChild(reset);
    body.appendChild(devDetails([['Screen size', state.cmsExactSelection.breakpoint || 'desktop'], ['Layout key', state.cmsExactSelection.key]]));
    if (state.cmsExactSelections.length > 1) {
      const align = document.createElement('div'); align.style.display = 'grid'; align.style.gridTemplateColumns = 'repeat(3,minmax(0,1fr))'; align.style.gap = '5px'; align.style.marginTop = '8px';
      [['Left', 'left'], ['Center X', 'hcenter'], ['Right', 'right'], ['Top', 'top'], ['Center Y', 'vcenter'], ['Bottom', 'bottom']].forEach(([label, op]) => { const b = document.createElement('button'); b.className = 'btn small'; b.type = 'button'; b.textContent = label; b.addEventListener('click', () => postCmsLayoutOperation(op)); align.appendChild(b); });
      body.appendChild(align);
      const group = document.createElement('button'); group.className = 'btn small primary'; group.type = 'button'; group.textContent = 'Group selection'; group.style.marginTop = '6px'; group.addEventListener('click', () => postCmsLayoutOperation('group')); body.appendChild(group);
      if (state.cmsExactSelections.length > 2) { const distribute = document.createElement('div'); distribute.style.display = 'flex'; distribute.style.gap = '5px'; distribute.style.marginTop = '6px'; [['Distribute X', 'distribute-horizontal'], ['Distribute Y', 'distribute-vertical']].forEach(([label, op]) => { const b = document.createElement('button'); b.className = 'btn small'; b.type = 'button'; b.textContent = label; b.addEventListener('click', () => postCmsLayoutOperation(op)); distribute.appendChild(b); }); body.appendChild(distribute); }
    }
  }
  function buildLayoutSection(pane, ctx) {
    const body = toolbarSection(pane, 'cms-layout', 'Layout', 'grid');
    body.appendChild(ctlSegField(ctx, 'Display', 'display', CMS_DISPLAY_TOKENS));
    const display = ctx.get('display');
    if (display === 'row' || display === 'grid' || display === 'stack' || !display) {
      body.appendChild(ctlField(ctx, 'Gap', 'gap'));
      body.appendChild(ctlSegField(ctx, 'Align', 'align', CMS_ALIGN_TOKENS));
    }
    if (display === 'row' || !display) {
      body.appendChild(ctlSegField(ctx, 'Justify', 'justify', CMS_JUSTIFY_TOKENS));
      body.appendChild(ctlSegField(ctx, 'Wrap', 'wrap', CMS_WRAP_VALUES));
    }
  }
  function buildSpacingSection(pane, ctx) {
    const body = toolbarSection(pane, 'cms-spacing', 'Spacing', 'spacing');
    const bm = document.createElement('div'); bm.className = 'boxm';
    [['pt', 't', 'Padding top'], ['pr', 'r', 'Padding right'], ['pb', 'b', 'Padding bottom'], ['pl', 'l', 'Padding left']].forEach(([key, cls, label]) => {
      const input = document.createElement('input'); input.className = 'ctl ' + cls; input.type = 'number'; input.min = '0'; input.value = String(ctx.get(key) ?? 0); input.setAttribute('aria-label', label);
      input.addEventListener('change', () => ctx.set(key, Number(input.value))); bm.appendChild(input);
    });
    const mid = document.createElement('div'); mid.className = 'mid'; mid.textContent = 'padding'; bm.appendChild(mid);
    body.appendChild(bm);
    body.append(ctlField(ctx, 'Margin ↑', 'mt'), ctlField(ctx, 'Margin ↓', 'mb'));
  }
  function buildTypographySection(pane, ctx) {
    const body = toolbarSection(pane, 'cms-type', 'Typography', 'type');
    body.appendChild(ctlSegField(ctx, 'Font', 'font', CMS_FONT_TOKENS));
    body.appendChild(ctlSelectField(ctx, 'Size', 'textSize', CMS_TYPE_SIZE_TOKENS));
    body.appendChild(ctlSegField(ctx, 'Weight', 'fw', CMS_FONT_WEIGHT_STEPS));
    body.appendChild(ctlSegField(ctx, 'Line height', 'lh', CMS_LINE_HEIGHT_TOKENS));
    body.appendChild(ctlSegField(ctx, 'Align', 'ta', CMS_TEXT_ALIGN_VALUES));
    body.appendChild(ctlSwatchField(ctx, 'Color', 'color', CMS_TEXT_TOKENS, false));
  }
  function buildFillSection(pane, ctx) {
    const body = toolbarSection(pane, 'cms-fill', 'Fill and border', 'fill');
    body.appendChild(ctlSwatchField(ctx, 'Background', 'bg', CMS_FILL_TOKENS, true));
    body.appendChild(ctlSegField(ctx, 'Radius', 'radius', CMS_RADIUS_TOKENS));
    body.appendChild(ctlSegField(ctx, 'Border', 'border', CMS_BORDER_VALUES));
    body.appendChild(ctlSwatchField(ctx, 'Border color', 'borderColor', CMS_BORDER_TOKENS, false));
  }
  function buildSizeSection(pane, ctx) {
    const body = toolbarSection(pane, 'cms-size', 'Size', 'size');
    body.appendChild(ctlField(ctx, 'Max width', 'maxw'));
    body.appendChild(ctlField(ctx, 'Min height', 'minh'));
    const hint = document.createElement('p'); hint.className = 'hint'; hint.textContent = 'Width and height for an exact size are in the Frame section above; these constrain it without pinning it.'; body.appendChild(hint);
  }
  function buildEffectsSection(pane, ctx) {
    const body = toolbarSection(pane, 'cms-effects', 'Effects', 'sparkle');
    body.appendChild(ctlSegField(ctx, 'Opacity', 'op', CMS_OPACITY_STEPS, (v) => v + '%'));
    body.appendChild(ctlSegField(ctx, 'Overflow', 'overflow', CMS_OVERFLOW_VALUES));
  }
  /* Image's 3rd taxonomy field: alt text. Stored in ArkLayout.alts (js/content/layout.js) --
     a plain <img> is page-module markup with no manifest/article field behind it, so the
     layout key this toolbar already edits Frame/Fill under is its only stable identity.
     js/main.js applies it to the live preview at once ('defxn-cms-preview-set-alt'), and on
     the public page and in the server render at every mount (ArkLayout.applyAlts). An image
     that is a component instance edits its alt as a resolver prop instead (Component
     instance, above) -- that is where its content lives. */
  function buildAltTextSection(pane) {
    const body = toolbarSection(pane, 'cms-alt', 'Alt text', 'image');
    const alt = state.cmsExactSelection.alt;
    if (!alt) {
      body.appendChild(h('p', { class: 'hint', text: 'This element has no text alternative of its own to set: alt text belongs on the <img> (or the <svg>, <canvas> or <video>) itself. Select the image inside it in Layers to describe it.' }));
      return;
    }
    /* `page` is the route shown, `route` the scope the edit is stored under (SHELL for the
       header): the value that applies on this page, from either (js/content/layout.js, "scopes") */
    const saved = window.ArkLayout ? ArkLayout.altFor(state.layoutDraft, state.cmsExactSelection.page || state.cmsExactSelection.route, state.cmsExactSelection.key) : '';
    const ctx = { get: () => saved, set: (_key, value) => postCmsSetAlt(state.cmsExactSelection.key, value) };
    const row = ctlField(ctx, alt.attr === 'alt' ? 'Alt text' : 'Label', 'alt', { type: 'textarea', name: 'alt-text',
      placeholder: alt.own ? 'Page default: ' + alt.own : alt.own === '' || alt.decorative ? 'Page default: decorative (screen readers skip it)' : 'Describe what this image shows' });
    row.classList.add('alt-row');
    body.appendChild(row);
    body.appendChild(h('p', { class: 'hint', text: (alt.attr === 'alt' ? 'Read aloud by screen readers and shown if the image fails to load.' : 'Sets this ' + (cmsTreeRowForKey(state.cmsExactSelection.key) || {}).tag + "'s accessible name (aria-label)" + (alt.decorative ? ', and stops treating it as decorative' : '') + '.') + ' Blank keeps the page\'s own value. Saved with the layout.' }));
  }
  /* A selected element that is a reusable-component instance root (js/content/
     components.js tags it; cmsSelectionInfo in js/main.js reports it as
     cmsExactSelection.component) gets its own override section, ALONGSIDE -- not instead
     of -- the taxonomy section(s) above, since an instance is both a positioned element and
     a content block. Each field writes a real setOverride() inside the connected preview
     iframe via postCmsComponentsCommand, the same draft-mutate-then-post shape every
     ctl*Field() (js/admin/controls.js) uses, just with its own one-off patch function (no shared ctx needed:
     there is exactly one control per resolver prop, not several reading/writing the same
     draft object). */
  function buildComponentInstanceSection(pane) {
    const comp = state.cmsExactSelection.component;
    const componentsState = (state.cmsSourceSite && state.cmsSourceSite.components) || { masters: {}, routes: {} };
    const master = componentsState.masters && componentsState.masters[comp.masterId];
    const anchorList = window.ArkComponents ? ArkComponents.instancesAt(componentsState, state.cmsExactSelection.page || state.cmsExactSelection.route, comp.anchorId) : [];
    const instance = anchorList.find((item) => item.key === comp.key);
    const overrides = (instance && instance.overrides) || {};
    const body = toolbarSection(pane, 'cms-component', 'Component instance', 'comp');
    /* named for what it is, never by its ids ("spot-mveixci6q6trc"); the ids are Developer details */
    const info = document.createElement('p'); info.className = 'hint'; info.innerHTML = '<b></b>';
    info.querySelector('b').textContent = master ? (/^spot-|^m[a-z0-9]{6,}$/.test(master.label || '') ? 'Made from your selection' : master.label) : 'A component whose definition is missing';
    body.appendChild(info);
    body.appendChild(devDetails([['Kind', master ? cmsMasterKind(master) : ''], ['Definition id', comp.masterId], ['Placed at', comp.anchorId], ['Instance', comp.key]]));
    const scope = document.createElement('p'); scope.className = 'hint';
    scope.textContent = master && master.detached ? 'Detached: this copy no longer follows any definition.' : 'Fields here override this instance only. Edit definition changes every instance.';
    body.appendChild(scope);
    /* one text field per prop (the shared ctlField): it shows the override, else the definition's value */
    const overrideCtx = { get: (prop) => (overrides[prop] !== undefined ? overrides[prop] : ((master && master.props[prop]) || '')),
      set: (prop, value) => postCmsComponentsCommand({ action: 'set-override', route: state.cmsExactSelection.page || state.cmsExactSelection.route, anchorId: comp.anchorId, key: comp.key, propPath: prop, value }) };
    cmsMasterProps(master).forEach((prop) => {
      const row = ctlField(overrideCtx, prop, prop, { type: 'text', placeholder: (master && master.props[prop]) || '' });
      if (overrides[prop] !== undefined) row.classList.add('ovr');
      body.appendChild(row);
    });
    const actions = document.createElement('div'); actions.style.display = 'flex'; actions.style.gap = '6px'; actions.style.marginTop = '6px';
    const resetAll = document.createElement('button'); resetAll.className = 'btn small'; resetAll.type = 'button'; resetAll.textContent = 'Reset overrides';
    refuse(resetAll, Object.keys(overrides).length ? '' : 'Nothing to reset: this instance overrides none of its definition\'s fields. Edit a field above to override it here.');
    resetAll.addEventListener('click', () => Object.keys(overrides).forEach((prop) => postCmsComponentsCommand({ action: 'set-override', route: state.cmsExactSelection.page || state.cmsExactSelection.route, anchorId: comp.anchorId, key: comp.key, propPath: prop, value: null })));
    const removeInst = document.createElement('button'); removeInst.className = 'btn small danger'; removeInst.type = 'button'; removeInst.textContent = 'Remove instance';
    removeInst.addEventListener('click', () => {
      postCmsComponentsCommand({ action: 'remove-instance', route: state.cmsExactSelection.page || state.cmsExactSelection.route, anchorId: comp.anchorId, key: comp.key });
      state.cmsExactSelection = null; state.cmsExactSelections = []; renderInspector();
    });
    /* Edit definition: the master's own fields, in the Library -- one place, so an edit there
       reaches every instance on every page. Detach: this instance keeps what it shows now
       (definition + its overrides) as its own private copy and stops following the
       definition (ArkComponents.detachInstance). */
    const editDef = document.createElement('button'); editDef.className = 'btn small'; editDef.type = 'button'; editDef.textContent = 'Edit definition';
    refuse(editDef, !master ? 'No definition to edit: this instance\'s master ' + comp.masterId + ' is missing from the components draft.' : master.detached ? 'No shared definition: a detached copy follows none. Edit its fields above instead.' : '');
    editDef.addEventListener('click', () => cmsOpenMasterInLibrary(comp.masterId));
    const detach = document.createElement('button'); detach.className = 'btn small'; detach.type = 'button'; detach.textContent = 'Detach';
    refuse(detach, !master ? 'Cannot detach: this instance\'s master ' + comp.masterId + ' is missing, so there is no content to copy.' : master.detached ? 'Already detached: this copy follows no definition.' : '');
    detach.addEventListener('click', () => {
      postCmsComponentsCommand({ action: 'detach-instance', route: state.cmsExactSelection.page || state.cmsExactSelection.route, anchorId: comp.anchorId, key: comp.key, id: cmsNextComponentId('m') });
      toast('Detached: this instance keeps its content and no longer follows the definition.');
    });
    actions.style.flexWrap = 'wrap';
    actions.append(editDef, detach, resetAll, removeInst); body.appendChild(actions);
  }
  /* Part E (earlier session): a selected element that is part of a layered-states group
     (tagged data-ark-state-group by js/content/states.js's own render(), reported back by
     js/main.js's cmsSelectionInfo) gets its own States section: every state listed, a way
     to preview each one, add a new one, remove one (never index 0), and pick the click
     trigger. Straight port into the new toolbar -- same fields, new container. */
  /* A state i >= 1 holds its content as component instances in the anchor
     ArkStates.anchorId(groupId, i) -- one new master + one instance, seeded with visible
     text through ArkComponents.starterProps so it never renders as nothing. `resolver`
     'like-state-0' asks the preview to derive the block from state 0's own markup instead
     (js/main.js's cmsSeedState -- the DOM it reads lives there, not here): a nav link for a
     nav of links, a heading for a heading (regression: tests/components-capture.cjs). */
  function addStateContent(groupId, index, resolver, text) {
    const masterId = cmsNextComponentId('m'), anchorId = window.ArkStates ? ArkStates.anchorId(groupId, index) : 'state-' + groupId + '-' + index;
    if (resolver === CMS_LIKE_STATE_0) { postCmsComponentsCommand({ action: 'seed-state', groupId, index, label: text, id: masterId, key: cmsNextComponentId('i') }); return; }
    const props = window.ArkComponents && ArkComponents.starterProps ? ArkComponents.starterProps(resolver, text) : {};
    postCmsComponentsCommand({ action: 'create-master', id: masterId, resolver, props, label: text + ' · ' + cmsBlockResolverLabel(resolver) });
    postCmsComponentsCommand({ action: 'insert-instance', anchorId, key: cmsNextComponentId('i'), masterId });
  }
  const CMS_LIKE_STATE_0 = 'like-state-0';
  function buildStateGroupSection(pane) {
    const groupId = state.cmsExactSelection.stateGroup.groupId;
    const statesState = (state.cmsSourceSite && state.cmsSourceSite.states) || { routes: {} };
    const group = window.ArkStates ? ArkStates.groupFor(statesState, state.cmsExactSelection.page || state.cmsExactSelection.route, groupId) : null;
    const body = toolbarSection(pane, 'cms-states', 'States' + (group ? ` (${group.states.length})` : ''), 'repeat');
    if (!group) {
      const missing = document.createElement('p'); missing.className = 'hint'; missing.textContent = 'This group is not on the current page.'; body.appendChild(missing);
      return;
    }
    /* What the preview SHOWS (cmsStatesShowing, reported by the preview -- a Live-mode click
       moves it too) is not the saved default (group.current): previewing a state used to
       write it as the default, so Save published whatever the editor was looking at
       (regression: tests/cms-states-preview-default.cjs). */
    const showing = typeof state.cmsStatesShowing[groupId] === 'number' && state.cmsStatesShowing[groupId] < group.states.length ? state.cmsStatesShowing[groupId] : group.current;
    group.states.forEach((st, i) => {
      const row = document.createElement('div'); row.className = 'row';
      const l = document.createElement('label'); l.textContent = (i === 0 ? '0 · ' : i + ' · ') + (st.label || (i === 0 ? 'Default' : 'New state'));
      const preview = document.createElement('button'); preview.type = 'button'; preview.className = 'btn small'; preview.textContent = showing === i ? 'Showing' : 'Preview';
      preview.title = 'Show this state here in the editor only -- visitors still see the default state';
      refuse(preview, showing === i ? 'Showing now: this state is the one in the preview. Preview another state to switch.' : '');
      preview.addEventListener('click', () => postCmsStatesCommand({ action: 'preview', groupId, index: i }));
      /* Preview and Remove share the control column: the row's third column is the narrow
         override-dot slot, and a Remove button put there was clipped to "Re". */
      const buttons = document.createElement('span'); Object.assign(buttons.style, { display: 'flex', gap: '6px', minWidth: '0' });
      preview.style.flex = '1 1 auto'; buttons.appendChild(preview);
      if (i > 0) {
        const rm = document.createElement('button'); rm.type = 'button'; rm.className = 'btn small danger'; rm.textContent = 'Remove';
        rm.addEventListener('click', () => postCmsStatesCommand({ action: 'remove-state', groupId, index: i }));
        buttons.appendChild(rm);
      }
      row.append(l, buttons, document.createElement('span')); body.appendChild(row);
      if (i > 0) {
        /* A block-type <select> + button, not the prompt() this used to be: a prompt that
           wanted the exact word "Text" silently did nothing for "text block" or Cancel. */
        const addRow = document.createElement('div'); addRow.className = 'state-add-block'; Object.assign(addRow.style, { display: 'flex', gap: '6px', margin: '0 0 6px 20px' });
        const kind = document.createElement('select'); kind.className = 'ctl'; kind.setAttribute('aria-label', 'Block type for state ' + i);
        [{ resolver: CMS_LIKE_STATE_0, label: 'Like state 0' }].concat(CMS_BLOCK_RESOLVERS).forEach((block) => { const o = document.createElement('option'); o.value = block.resolver; o.textContent = block.label; kind.appendChild(o); });
        const add = document.createElement('button'); add.type = 'button'; add.className = 'btn small'; add.textContent = '+ Add content block';
        add.addEventListener('click', () => { addStateContent(groupId, i, kind.value, st.label || ('State ' + i)); postCmsStatesCommand({ action: 'preview', groupId, index: i }); });
        addRow.append(kind, add); body.appendChild(addRow);
      }
    });
    /* The explicit, saved choice of which state visitors see first. Only this writes the
       group's `current`; Preview above never does. */
    const defaultCtx = { get: () => group.current, set: (_key, value) => postCmsStatesCommand({ action: 'set-default', groupId, index: Number(value) }) };
    const defaultRow = ctlSelectField(defaultCtx, 'Default state', 'current', group.states.map((_st, i) => i), (i) => i + ' · ' + (group.states[i].label || (i === 0 ? 'Default' : 'New state')));
    defaultRow.querySelector('select').title = 'The state visitors see first. Saved with the page.';
    body.appendChild(defaultRow);
    /* + Add state creates the state WITH visible content and shows it, instead of an empty
       state that renders nothing (regression: tests/cms-add-state-has-content.cjs): an empty
       state was invisible in the preview, and with the default 'self' trigger it was also
       unclickable, so the group stranded on it. The content is derived from state 0's own
       markup (regression: tests/components-capture.cjs), not a fixed big heading. */
    const addState = document.createElement('button'); addState.type = 'button'; addState.className = 'btn small primary'; addState.style.marginTop = '6px'; addState.textContent = '+ Add state';
    refuse(addState, group.states.length >= ArkStates.MAX_STATES ? `At the limit: a state group holds at most ${ArkStates.MAX_STATES} states. Remove one above to add another.` : '');
    addState.addEventListener('click', () => {
      const index = group.states.length, label = 'State ' + index;
      postCmsStatesCommand({ action: 'add-state', groupId, label });
      addStateContent(groupId, index, CMS_LIKE_STATE_0, label);
      postCmsStatesCommand({ action: 'preview', groupId, index });
    });
    body.appendChild(addState);
    const triggerNote = document.createElement('p'); triggerNote.className = 'hint';
    const triggerRow0 = group.trigger === 'self' ? null : cmsTreeRowForKey(group.trigger);
    triggerNote.textContent = group.trigger === 'self' ? 'A click on the first state moves it on.' : 'A click on ' + (triggerRow0 ? '"' + triggerRow0.label + '"' : 'the element you chose') + ' moves it on. While another state shows and that element is hidden with the first state, a click on the state showing moves on.';
    body.appendChild(triggerNote);
    body.appendChild(devDetails([['Group id', groupId], ['Trigger', group.trigger]]));
    const triggerRow = document.createElement('div'); triggerRow.style.display = 'flex'; triggerRow.style.gap = '6px'; triggerRow.style.flexWrap = 'wrap';
    const useSelf = document.createElement('button'); useSelf.type = 'button'; useSelf.className = 'btn small'; useSelf.textContent = 'A click on the first state moves it on';
    refuse(useSelf, group.trigger === 'self' ? 'Already so: a click on the first state moves this group on.' : '');
    useSelf.addEventListener('click', () => postCmsStatesCommand({ action: 'set-trigger', groupId, trigger: 'self' }));
    const useThis = document.createElement('button'); useThis.type = 'button'; useThis.className = 'btn small'; useThis.textContent = 'Use this element as trigger';
    refuse(useThis, !state.cmsExactSelection.key ? 'Select an element on the page first: the selected element becomes the trigger.' : group.trigger === state.cmsExactSelection.key ? 'Already the trigger: this element is what a click moves this group on with. Select another element to use it instead.' : '');
    useThis.addEventListener('click', () => postCmsStatesCommand({ action: 'set-trigger', groupId, trigger: state.cmsExactSelection.key }));
    triggerRow.append(useSelf, useThis); body.appendChild(triggerRow);
    const removeGroup = document.createElement('button'); removeGroup.type = 'button'; removeGroup.className = 'btn small danger'; removeGroup.style.marginTop = '8px'; removeGroup.textContent = 'Remove this states group';
    removeGroup.addEventListener('click', () => { postCmsStatesCommand({ action: 'remove-group', groupId }); });
    body.appendChild(removeGroup);
  }
  /* Element animation (Part H, earlier session): folded into the toolbar as one more
     section for any real (non-group) selection, replacing restrictMode === 'anim'
     entirely -- it never needed a separate mode: "show the animation controls" is one more
     icon in the bar opening one more popover, and the bar only exists when something is
     selected. */
  function buildElementMotionSection(pane) {
    const routes = (state.cmsSourceSite && state.cmsSourceSite.elementMotion && state.cmsSourceSite.elementMotion.routes) || {};
    const stored = (routes[state.cmsExactSelection.route] && routes[state.cmsExactSelection.route][state.cmsExactSelection.key]) || null;
    const cfg = Object.assign({}, CMS_ELEMENT_MOTION_DEFAULT_ENTRY, stored || {});
    const ctx = { get: (key) => cfg[key], set: (key, value) => postCmsElementMotionCommand({ [key]: value }) };
    const body = toolbarSection(pane, 'cms-element-motion', 'In / out animation', 'play');
    const note = document.createElement('p'); note.className = 'hint';
    note.textContent = `How "${state.cmsExactSelection.label || state.cmsExactSelection.key}" enters and leaves on route change. Overrides the default stagger for this element only; every other element keeps today's behavior.`;
    body.appendChild(note);
    body.appendChild(ctlSegField(ctx, 'Direction', 'direction', CMS_ELEMENT_MOTION_DIRECTIONS));
    body.appendChild(ctlField(ctx, 'Distance (px)', 'distance', { min: 0, max: 60, step: 1 }));
    body.appendChild(ctlField(ctx, 'Duration (ms)', 'duration', { min: 0, max: 1200, step: 10 }));
    body.appendChild(ctlField(ctx, 'Delay (ms)', 'delay', { min: 0, max: 1200, step: 10 }));
    body.appendChild(ctlSegField(ctx, 'Easing', 'easing', CMS_ELEMENT_MOTION_EASINGS));
    const preview = document.createElement('button'); preview.className = 'btn small primary'; preview.type = 'button';
    preview.textContent = 'Preview'; preview.style.marginTop = '8px';
    preview.addEventListener('click', () => postCmsElementMotionPreview(state.cmsExactSelection.key));
    body.appendChild(preview);
    const hint = document.createElement('p'); hint.className = 'hint';
    hint.textContent = 'Previews instantly in the connected site above -- no page navigation. Save still writes it to the project like every other Studio edit.';
    body.appendChild(hint);
  }
  /* The Content lens's section: what the selected text IS in the content -- the field it shows
     (label, address, file), its value (a paragraph field gets a textarea), and for a link the
     link field that holds its target -- or, for text no field holds, why it cannot be edited and
     what writes it. The binding is derived in the preview (js/main.js cmsContentInfo) and arrives
     with the selection as state.cmsContent. Edits go through applyCmsCopyEdit (js/admin/bridge.js)
     -> setItemField, the write the forms use; the value control carries the form's own
     data-cms-field address, so an edit made anywhere else (the page form, the canvas) shows here. */
  /* "Revert to saved": this field back to the words in its saved file -- the explicit way back
     that Escape used to be, now visible and undoable (the notice's Undo puts the words back). */
  function revertFieldButton(content) {
    const fieldValue = A.fieldValue, saved = fieldValue(content.kind, content.id, content.fieldKey, true);
    const now = fieldValue(content.kind, content.id, content.fieldKey, false);
    const button = document.createElement('button'); button.type = 'button'; button.className = 'btn small'; button.dataset.action = 'revert-field'; button.textContent = 'Revert to saved';
    refuse(button, saved === undefined ? 'Nothing saved to go back to: this ' + (content.kind === 'article' ? 'article' : 'page') + ' has not been saved yet. Save it first; Undo (Ctrl/Cmd+Z) takes back an edit until then.'
      : saved === now ? 'Nothing to revert: these are the saved words.' : '');
    button.addEventListener('click', () => {
      const before = fieldValue(content.kind, content.id, content.fieldKey, false);
      A.applyCmsCopyEdit({ field: content.field, value: saved, final: true });
      A.notice({ tone: 'info', key: 'field-reverted', title: 'Reverted “' + content.label + '” to its saved words',
        body: 'The canvas and Page fields show the saved words again. Undo puts back what you had typed.',
        actions: [{ label: 'Undo', run: () => A.applyCmsCopyEdit({ field: content.field, value: before, final: true }) }] });
    });
    return button;
  }
  function buildContentSection(pane) {
    /* a binding reported for another element (a message that moved the selection without one) is not this one's */
    const content = state.cmsContent && (!state.cmsContent.key || state.cmsContent.key === state.cmsExactSelection.key) ? state.cmsContent : null;
    /* "Details": the field's name, its words in a box, its link target, Revert -- opened on demand
       (by itself only for text that cannot be edited in place, whose explanation is the answer) */
    const body = toolbarSection(pane, 'cms-content', 'Content', 'text');
    const applyCmsCopyEdit = A.applyCmsCopyEdit;
    const p = (cls, text) => { const el = document.createElement('p'); el.className = cls; el.textContent = text; return el; };
    if (!content) { body.appendChild(p('hint', 'Nothing reported for this selection yet: click a piece of text on the canvas.')); return; }
    if (content.bound) {
      /* the field by its name ("Heading"); its copy key and file are Developer details (P1-2) */
      const info = document.createElement('p'); info.className = 'hint cms-content-field'; info.innerHTML = '<b></b> <span></span>';
      info.querySelector('b').textContent = content.label;
      info.querySelector('span').textContent = '· ' + (content.multiline ? 'a paragraph' : 'one line');
      const keyCode = document.createElement('code'); keyCode.textContent = content.field + '  ·  ' + content.file;
      const dev = devDetails([], [keyCode]); info.appendChild(dev);
      body.appendChild(info);
      /* How an edit on the canvas ends, said where the person is looking: nothing on screen did,
         and Escape threw the typing away (docs/ux-audit/cms.md P0-2). The keys are js/main.js's
         (cmsInlineKey): Escape and Enter keep the words; Enter is a new line only in a paragraph
         whose breaks the page shows. */
      body.appendChild(p('hint cms-content-keys', content.enterBreaks
        ? 'Click the text to edit it. Enter starts a new line · Ctrl/Cmd+Enter or Esc to finish (your words are kept).'
        : 'Click the text to edit it. Enter or Esc to finish (your words are kept)' + (content.multiline ? ' · Shift+Enter for a new line.' : '.')));
      const component = content.kind === 'component';
      const ctx = { get: () => content.value,
        set: (_k, value) => {
          if (!component) { applyCmsCopyEdit({ field: content.field, value, final: true }); return; }
          content.value = value;
          postCmsComponentsCommand({ action: 'set-override', route: state.cmsExactSelection.page || state.cmsExactSelection.route, anchorId: content.anchorId, key: content.instanceKey, propPath: content.fieldKey, value });
        } };
      const data = component ? {} : { cmsField: content.kind + ':' + content.id + ':' + content.fieldKey };
      body.appendChild(ctlField(ctx, 'Text', 'value',
        { type: content.multiline ? 'textarea' : 'text', rows: content.multiline ? 4 : undefined, id: 'cmsContentValue', live: !component, data, hint: 'The same words as on the page: type here when that is easier.' }));
      if (component) body.appendChild(p('hint', 'This instance\'s override: the definition keeps its own value.'));
      else body.appendChild(revertFieldButton(content));
      if (content.link && content.link.field) {
        const at = A.cmsCopyAddress(content.link.field);
        body.appendChild(A.linkPickerEl('Link target', 'cms-content-link', content.link.value,
          (value) => { content.link.value = value; applyCmsCopyEdit({ field: content.link.field, value, final: true }); },
          content.link.field, at ? at.kind + ':' + at.id + ':' + at.key : undefined));
      } else if (content.link) body.appendChild(p('hint cms-content-refusal', content.link.refusal));
    } else {
      body.appendChild(p('hint cms-content-refusal', content.reason));
      body.appendChild(p('hint', content.remedy));
      /* what writes the words and how a developer makes them editable (P1-2) */
      body.appendChild(devDetails([['Written by', content.source]], content.detail ? [p('hint', content.detail)] : []));
    }
    /* the whole form of the item this text belongs to (the page shown, when it belongs to none) */
    const all = document.createElement('button'); all.type = 'button'; all.className = 'btn small'; all.dataset.action = 'open-page-fields'; all.textContent = 'All fields of this page';
    refuse(all, typeof A.openPageFields === 'function' ? '' : 'Page fields are not available in this editor build: js/admin/ provides no openPageFields().');
    all.addEventListener('click', () => A.openPageFields(content.bound && content.kind !== 'component' ? { kind: content.kind, id: content.id, field: content.fieldKey } : {}));
    body.appendChild(all);
  }
  A.provide({ buildAltTextSection: buildAltTextSection, buildContentSection: buildContentSection,
      buildComponentInstanceSection: buildComponentInstanceSection,
      buildEffectsSection: buildEffectsSection, buildElementMotionSection: buildElementMotionSection,
      buildFillSection: buildFillSection, buildFrameSection: buildFrameSection,
      buildLayoutSection: buildLayoutSection, buildSizeSection: buildSizeSection,
      buildSpacingSection: buildSpacingSection, buildStateGroupSection: buildStateGroupSection,
      buildTypographySection: buildTypographySection, cmsTreeRowForKey: cmsTreeRowForKey,
      makeFrameCtx: makeFrameCtx, selToolbarKind: selToolbarKind });
})();

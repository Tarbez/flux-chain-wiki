/* =====================================================================
   BOOT
   ---------------------------------------------------------------------
   The only file that does anything when it loads; every other script
   just defines. Applies the tokens, renders the pattern, and tells the
   page it is live so the semantic fallback can step aside.

   If rendering throws, the fallback stays visible: the page degrades to
   readable text instead of a blank poster.
   ===================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var host = document.getElementById('scene');
  if (!host) return;
  // The router owns per-page reading positions. Native fragment restoration can
  // run after the first paint and clip a newly entered page's heading.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  /* A fixed, full-viewport layer behind everything else, for an optional admin-picked
     background style (js/ark/vendor/backgrounds.js -- design/ark-ui's generators, see
     scripts/sync-ark-backgrounds.cjs). Created once; style 'none' just leaves it empty,
     which is the site's original flat-canvas look, so this never runs when unused. */
  var backgroundHost = null, backgroundHandle = null;
  function backgroundElement() {
    if (backgroundHost) return backgroundHost;
    backgroundHost = document.createElement('div');
    backgroundHost.id = 'ark-background';
    backgroundHost.setAttribute('aria-hidden', 'true');
    backgroundHost.style.cssText = 'position:fixed;inset:0;z-index:-1;pointer-events:none';
    document.body.insertBefore(backgroundHost, document.body.firstChild);
    return backgroundHost;
  }
  /* Exactly one background shows at a time: an admin-picked ArkBackgrounds
     style, when set, replaces the site's own flat .hero-atmosphere layer
     instead of stacking on top of it and the lattice grid. */
  function applyBackground(background) {
    if (!window.ArkBackgrounds || !background) return;
    var style = background.style;
    if (backgroundHandle) { backgroundHandle.destroy(); backgroundHandle = null; }
    if (!style || style === 'none' || !ArkBackgrounds[style]) {
      if (backgroundHost) backgroundHost.replaceChildren();
      root.classList.remove('has-ark-background');
      return;
    }
    backgroundHandle = ArkBackgrounds[style].mount(backgroundElement());
    root.classList.add('has-ark-background');
  }

  try {
    ArkUI.base(Tokens.css());
    /* A later :root rule wins by source order, so this never touches tokens.js or the
       atomizer: it just appends the saved colour overrides (js/content/theme.js), if any. */
    var theme = window.ArkTheme ? (ArkTheme.get() || ArkTheme.defaults()) : null;
    if (theme) {
      if (theme.activeTheme && !localStorage.getItem('flux-chain-theme')) root.dataset.theme = theme.activeTheme;
      ArkUI.base(ArkTheme.css());
      /* Never mount a saved ArkBackgrounds preset on the public site: it read
         as an unwanted soft atmospheric glow. The grid (css/lattice.css) is
         the one background. */
    }
    var scene = ArkUI.render(F_SCENE_RZERO_V0, host);
    ArkUI.pageRouter = ArkUI.createPageRouter({ scene: scene, state: ArkUI.sceneState });
    /* Reusable content blocks (js/content/components.js) fill every [data-ark-insert]
       anchor a page module declares, on every mount -- one central call here instead of
       a repeated ArkComponents.render(...) line in each of the ~30 page modules, the same
       "centralize, don't duplicate" reasoning ArkLayout.apply below already follows for
       responsive positioning. Registered first so a freshly inserted block already has its
       data-ark-layout-key by the time ArkLayout's own (rAF-deferred) pass below runs. */
    if (window.ArkComponents) ArkUI.pageRouter.onMount(function (_pageElement, page) {
      var entry = ArkUI.pageCatalog && ArkUI.pageCatalog[page];
      ArkComponents.renderAll(host, entry && entry.path || ArkUI.route.path());
    });
    if (window.ArkLayout) ArkUI.pageRouter.onMount(function (_pageElement, page) {
      requestAnimationFrame(function () {
        var entry = ArkUI.pageCatalog && ArkUI.pageCatalog[page];
        ArkLayout.apply(host, entry && entry.path || ArkUI.route.path(), window.innerWidth);
      });
    });
    /* Layered states (Part E): a real, end-user-facing behavior, not a Studio-only
       convenience, so it is wired the same way ArkComponents is above -- a sibling
       ArkUI.pageRouter.onMount callback, unconditional, never gated behind the
       cmsPreview-only checks further down this file. Registered AFTER ArkLayout's own
       onMount (both above) and deferred through its own requestAnimationFrame: rAF
       callbacks queued in the same tick run in queue order, so this always runs right
       after ArkLayout.apply() has finished its reset-then-reapply pass for the new
       page -- running before it would have its state-0 display:none wiped the moment
       ArkLayout.apply()'s resetElement() clears every element's inline styles. */
    if (window.ArkStates) ArkUI.pageRouter.onMount(function (_pageElement, page) {
      requestAnimationFrame(function () {
        var entry = ArkUI.pageCatalog && ArkUI.pageCatalog[page];
        ArkStates.renderAll(host, entry && entry.path || ArkUI.route.path(), cmsStatesDraft, cmsComponentsDraft);
      });
    });
    root.classList.add('ark-live');
    var fallback = document.getElementById('fallback');
    if (fallback) fallback.setAttribute('aria-hidden', 'true');
  } catch (err) {
    root.classList.remove('js');                  /* reveal the fallback */
    if (window.console) console.error('[ark] scene failed to render', err);
  }

  /* The admin preview iframe posts an unsaved theme edit here so it shows its effect
     before Save writes anything -- same origin only (preview and admin are always the
     same host). Appending another colour override sheet keeps that half additive and
     reversible: each edit just wins over the last by source order, same as the saved
     one above. The background style is swapped outright, since only one can show. */
  var cmsPreviewQuery = new URLSearchParams(location.search).has('preview') || new URLSearchParams(location.search).has('cms-preview');
  var cmsPreviewEdit = true, cmsPreviewSelected = null, cmsPreviewSelections = [], cmsLayoutDraft = window.ArkLayout ? ArkLayout.get() : { version: 2, routes: {}, groups: {} };
  var cmsComponentsDraft = window.ArkComponents ? ArkComponents.get() : { version: 1, masters: {}, routes: {} };
  /* Layered states (Part E): seeded from the baked states-data.js, exactly like
     cmsLayoutDraft/cmsComponentsDraft above -- this is what every real visitor's click
     advances, in memory only, never persisted back anywhere: there is no analytics/
     write-back channel on this static site, and the two hand-coded precedents this
     generalizes (home.js's case-picker, about.js's layer tabs) both reset on reload the
     same way. Studio's own edits still flow through the normal draft-replace pipeline
     below (cmsStatesCommand), the same as cmsComponentsDraft. */
  var cmsStatesDraft = window.ArkStates ? ArkStates.get() : { version: 1, routes: {} };
  /* Canvas-only mode (Part G, follow-up plan): the site-wide background in/out
     transition, seeded from the baked canvas-transitions-data.js exactly like
     cmsStatesDraft/cmsComponentsDraft above. Unlike those, this never drives any
     DOM content here -- it only governs the one persistent-layer opacity transition
     js/ark/page-router.js's navigate() already applies on every real navigation --
     so it is read, not rendered, by anything in this file; Studio's own edits (field
     commands) and its one-shot "Preview this transition" round trip both flow
     through cmsCanvasTransitionsCommand below. */
  var cmsCanvasTransitionsDraft = window.ArkCanvasTransitions ? ArkCanvasTransitions.get() : { version: 1, effect: 'fade', outDuration: 220, inDuration: 260, easing: 'ease' };
  /* Animation-only mode (Part H, follow-up plan): per-element in/out stagger overrides,
     seeded from the baked element-motion-data.js exactly like cmsCanvasTransitionsDraft
     above. Unlike that single site-wide object, this is addressed per route+key the
     same way cmsLayoutDraft already is -- ArkUI.createPresence (js/ark/scene-state.js)
     reads the SAVED module state directly (window.ArkElementMotion.get()), never this
     unsaved draft, so a field edit here has no visible effect until either "Preview"
     (a one-shot animation built from this exact draft) or a real Save. */
  var cmsElementMotionDraft = window.ArkElementMotion ? ArkElementMotion.get() : { version: 1, routes: {} };
  var cmsLayoutFrame = null, cmsLayoutAction = null, cmsLayoutBox = null, cmsLayoutLabel = null, cmsLayoutHandles = [], cmsMultiBoxes = [], cmsContextMenu = null, cmsContextTarget = null;
  /* Undo/redo for every layout/style edit (frame, spacing, typography, fill, effects,
     group, ungroup, align, distribute). These never went through the admin page's own
     dense-node undo stack -- they post straight to this iframe -- so Studio's Ctrl+Z did
     nothing for any of them. cmsLayoutDraft is the one place all of those operations already
     converge, so a snapshot stack here covers every operation type uniformly instead of
     reimplementing an inverse for each one. */
  var cmsLayoutUndo = [], cmsLayoutRedo = [];
  function previewCopyText(value) { return String(value == null ? '' : value).replace(/\s+/g, '').trim(); }
  /* Page modules sometimes shape one manifest value into several spans instead of
     using ArkRuntime's copy resolver. In preview only, bind those exact rendered
     strings back to their source field as well. This keeps the production markup
     untouched while making hand-authored hero/card DOM click-to-edit. */
  function annotateCmsPreviewCopy(manifests) {
    if (!cmsPreviewQuery || !host || !Array.isArray(manifests)) return;
    var byText = new Map();
    manifests.forEach(function (manifest) {
      Object.keys((manifest && manifest.fields) || {}).forEach(function (role) {
        var value = previewCopyText(manifest.fields[role] && manifest.fields[role].value);
        if (!value || value.length < 2) return;
        var list = byText.get(value) || [];
        list.push(String(manifest.id).toLowerCase() + '.' + role); byText.set(value, list);
      });
    });
    host.querySelectorAll('h1,h2,h3,h4,p,a,button,label,li,dt,dd,strong,span,small').forEach(function (element) {
      var keys = byText.get(previewCopyText(element.textContent));
      if (!keys) return;
      var current = String(element.getAttribute('data-ark-copy-keys') || '').split(/\s+/).filter(Boolean);
      element.setAttribute('data-ark-copy-keys', Array.from(new Set(current.concat(keys))).join(' '));
    });
  }
  function cmsRoutePath() { return ArkUI.route && ArkUI.route.path ? ArkUI.route.path() : location.pathname; }
  function cmsLayoutBreakpoint() { return window.ArkLayout ? ArkLayout.breakpoint(window.innerWidth) : 'desktop'; }
  function cmsFrameFor(route, key) {
    var nodes = cmsLayoutDraft.routes && cmsLayoutDraft.routes[route], entry = nodes && nodes[key];
    return window.ArkLayout ? ArkLayout.merged(entry || {}, window.innerWidth) : {};
  }
  function cmsLayoutEntry(key) { return cmsFrameFor(cmsRoutePath(), key); }
  /* Part B of the follow-up Studio plan: a real layers tree for connected mode, replacing
     admin-studio.html's renderLayers() (which walks the standalone dense-node tree --
     meaningless here) with the actual rendered DOM. Walks depth-first from host's own
     children, including only elements ArkLayout.annotate() already tagged with a stable
     data-ark-layout-key -- an untagged wrapper produces no row of its own but is still
     walked through, so a valid annotated descendant is never silently dropped just because
     of an intermediate untagged element. A whole <svg> reads as one leaf row regardless of
     what annotate() tagged inside it: its internal paths/shapes stay reachable only through
     the existing "Enter illustration" escape hatch (cmsSelectIllustrationPart above), never
     as a wall of cluttering tree rows. */
  function cmsRealTree(host, route) {
    if (!host || !window.ArkLayout) return [];
    ArkLayout.annotate(host);
    function walk(parent) {
      var out = [];
      Array.prototype.forEach.call(parent.children || [], function (element) {
        var key = element.getAttribute && element.getAttribute('data-ark-layout-key'), tag = element.tagName ? element.tagName.toLowerCase() : '';
        if (!key) { out = out.concat(walk(element)); return; }
        var kids = tag === 'svg' ? [] : walk(element);
        var label = ArkLayout.labelFor(cmsLayoutDraft, route, key) || tag;
        out.push({ key: key, tag: tag, label: label, hidden: cmsFrameFor(route, key).display === 'hide', hasChildren: kids.length > 0, children: kids });
      });
      return out;
    }
    return walk(host);
  }
  /* Resolves any annotated element by its stable key, independent of the current selection
     -- the Layers panel's rename input and hide toggle both act on a tree ROW, which is
     usually not whatever happens to be selected right now (reusing cmsPreviewSelected the
     way setCmsLayoutFrame does would silently mutate the wrong element). */
  function cmsElementForKey(key) {
    if (!key || !window.ArkLayout) return null;
    var elements = ArkLayout.annotate(host);
    for (var i = 0; i < elements.length; i++) if (elements[i].getAttribute('data-ark-layout-key') === key) return elements[i];
    return null;
  }
  /* The hide toggle's "other half" of setCmsLayoutFrame: same ArkLayout.set() mechanism
     (via setCmsElementFrame below, commit=false so it only does the draft-mutate-and-apply
     half and never posts on its own), but keyed to an explicit element instead of
     cmsPreviewSelected, and reporting the REAL current selection/selections back to Studio
     (never the toggled row) so toggling a row that isn't selected cannot look like it
     silently selected something else. */
  function setCmsLayoutFrameForKey(key, frame, commit) {
    var element = cmsElementForKey(key);
    if (!element || !window.ArkLayout) return;
    if (commit) cmsSnapshotLayout();
    var info = cmsSelectionInfo(element);
    setCmsElementFrame(element, frame, false);
    if (commit) window.parent.postMessage({ type: 'defxn-cms-preview-layout-change', patch: { route: info.route, key: info.key, breakpoint: info.breakpoint, frame: frame },
      selection: cmsPreviewSelected && cmsSelectionInfo(cmsPreviewSelected), selections: cmsSelectionPayload(), groups: cmsGroupList(), tree: cmsRealTree(host, cmsRoutePath()) }, location.origin);
  }
  function cmsSelectionInfo(element) {
    var rect = element.getBoundingClientRect(), key = element.getAttribute('data-ark-layout-key') || '', frame = cmsLayoutEntry(key);
    /* A selected element that is itself a reusable-component instance root (js/content/
       components.js tags it with these three attributes on every render) reports which
       instance it is, so Studio's inspector can offer override editing for it -- reusing
       this same selection message rather than inventing a second one. */
    var componentKey = element.getAttribute('data-ark-component-key');
    var component = componentKey ? { key: componentKey, anchorId: element.getAttribute('data-ark-component-anchor'), masterId: element.getAttribute('data-ark-component-master') } : null;
    /* Part E: a state-0 member or a state's own anchor is tagged with its group id by
       ArkStates.render() (the same self-identifying pattern as the component attributes
       just above), so the inspector can show a States accordion for it without a second
       lookup table. Climb to the nearest tagged ANCESTOR (or self), the same escalation
       cmsGroupRootOf/cmsComponentRootOf already use -- without this, selecting a container
       that was made into state zero as one whole unit (e.g. a nav div holding three
       buttons) shows the accordion, but clicking down into one specific button inside it
       (to use THAT button, not the whole container, as the click trigger) found nothing,
       because only the exact selected elements ever carried the attribute, never their
       descendants. `key` below still reports the literal clicked element either way, so
       "Use this element as trigger" still targets the nested button, not the container. */
    var stateGroupNode = null;
    for (var stateNode = element; stateNode && stateNode !== host; stateNode = stateNode.parentNode) { if (stateNode.hasAttribute && stateNode.hasAttribute('data-ark-state-group')) { stateGroupNode = stateNode; break; } }
    var stateGroup = stateGroupNode ? { groupId: stateGroupNode.getAttribute('data-ark-state-group'), stateIndex: stateGroupNode.hasAttribute('data-ark-state-index') ? Number(stateGroupNode.getAttribute('data-ark-state-index')) : 0 } : null;
    return { key: key, route: cmsRoutePath(), breakpoint: cmsLayoutBreakpoint(), label: element.getAttribute('aria-label') || element.id || element.tagName.toLowerCase(),
      rect: { x: Math.round(rect.left), y: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height) }, frame: frame, component: component, stateGroup: stateGroup };
  }
  function cmsSelectionList() { return cmsPreviewSelections.filter(function (element) { return element && element.isConnected; }); }
  function cmsSelectionPayload() { return cmsSelectionList().map(cmsSelectionInfo); }
  function ensureCmsLayoutUi() {
    if (cmsLayoutBox || !cmsPreviewQuery) return;
    var style = document.createElement('style'); style.setAttribute('data-ark-studio-ui', '');
    style.textContent = 'svg [data-ark-layout-key]{pointer-events:all!important}.ark-studio-box,.ark-studio-multi{position:fixed;z-index:2147483645;border:1px solid #5d8df6;pointer-events:none;box-sizing:border-box}.ark-studio-multi{border-style:dashed}.ark-studio-label{position:fixed;z-index:2147483646;background:#5d8df6;color:white;padding:4px 7px;border-radius:4px;font:600 11px/1.2 system-ui;pointer-events:auto;cursor:move;white-space:nowrap;touch-action:none}.ark-studio-handle{position:fixed;z-index:2147483647;width:10px;height:10px;background:white;border:2px solid #5d8df6;border-radius:2px;box-sizing:border-box;touch-action:none}.ark-studio-handle[data-dir=nw],.ark-studio-handle[data-dir=se]{cursor:nwse-resize}.ark-studio-handle[data-dir=ne],.ark-studio-handle[data-dir=sw]{cursor:nesw-resize}.ark-studio-menu{position:fixed;z-index:2147483647;min-width:210px;padding:6px;background:#17191d;color:#f3f5f7;border:1px solid #3a3d44;border-radius:8px;box-shadow:0 12px 36px rgba(0,0,0,.38);font:500 12px/1.2 system-ui}.ark-studio-menu button{display:flex;width:100%;border:0;background:transparent;color:inherit;padding:7px 9px;border-radius:5px;text-align:left}.ark-studio-menu button:hover:not(:disabled){background:#2b3039}.ark-studio-menu button:disabled{opacity:.38;cursor:default}.ark-studio-menu hr{border:0;border-top:1px solid #343842;margin:5px 0}.ark-studio-menu small{display:block;color:#9ea6b5;padding:5px 9px}';
    document.head.appendChild(style);
    cmsLayoutBox = document.createElement('div'); cmsLayoutBox.className = 'ark-studio-box'; cmsLayoutBox.hidden = true; cmsLayoutBox.setAttribute('data-ark-studio-ui', '');
    cmsLayoutLabel = document.createElement('div'); cmsLayoutLabel.className = 'ark-studio-label'; cmsLayoutLabel.hidden = true; cmsLayoutLabel.setAttribute('data-ark-studio-ui', '');
    document.body.append(cmsLayoutBox, cmsLayoutLabel);
    ['nw', 'ne', 'se', 'sw'].forEach(function (dir) { var handle = document.createElement('div'); handle.className = 'ark-studio-handle'; handle.dataset.dir = dir; handle.hidden = true; handle.setAttribute('data-ark-studio-ui', ''); document.body.appendChild(handle); cmsLayoutHandles.push(handle); });
    cmsContextMenu = document.createElement('div'); cmsContextMenu.className = 'ark-studio-menu'; cmsContextMenu.hidden = true; cmsContextMenu.setAttribute('data-ark-studio-ui', ''); document.body.appendChild(cmsContextMenu);
  }
  function cmsUnionRect(elements) {
    var rects = elements.map(function (element) { return element.getBoundingClientRect(); });
    var left = Math.min.apply(null, rects.map(function (r) { return r.left; })), top = Math.min.apply(null, rects.map(function (r) { return r.top; }));
    var right = Math.max.apply(null, rects.map(function (r) { return r.right; })), bottom = Math.max.apply(null, rects.map(function (r) { return r.bottom; }));
    return { left: left, top: top, right: right, bottom: bottom, width: right - left, height: bottom - top };
  }
  function placeCmsLayoutUi() {
    ensureCmsLayoutUi();
    var selections = cmsSelectionList();
    cmsMultiBoxes.forEach(function (box) { box.remove(); }); cmsMultiBoxes = [];
    if (!cmsPreviewEdit || !selections.length) {
      if (cmsLayoutBox) cmsLayoutBox.hidden = cmsLayoutLabel.hidden = true; cmsLayoutHandles.forEach(function (h) { h.hidden = true; }); return;
    }
    cmsPreviewSelections = selections; cmsPreviewSelected = selections[selections.length - 1];
    selections.forEach(function (element) { var rr = element.getBoundingClientRect(), box = document.createElement('div'); box.className = 'ark-studio-multi'; box.setAttribute('data-ark-studio-ui', ''); Object.assign(box.style, { left: rr.left + 'px', top: rr.top + 'px', width: rr.width + 'px', height: rr.height + 'px' }); document.body.appendChild(box); cmsMultiBoxes.push(box); });
    var r = selections.length > 1 ? cmsUnionRect(selections) : cmsPreviewSelected.getBoundingClientRect();
    Object.assign(cmsLayoutBox.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' }); cmsLayoutBox.hidden = false;
    cmsLayoutLabel.textContent = (selections.length > 1 ? selections.length + ' layers' : (cmsPreviewSelected.getAttribute('aria-label') || cmsPreviewSelected.id || cmsPreviewSelected.tagName.toLowerCase())) + '  ' + Math.round(r.width) + ' × ' + Math.round(r.height);
    Object.assign(cmsLayoutLabel.style, { left: Math.max(2, r.left) + 'px', top: Math.max(2, r.top - 24) + 'px' }); cmsLayoutLabel.hidden = false;
    var points = [[r.left, r.top], [r.right, r.top], [r.right, r.bottom], [r.left, r.bottom]];
    cmsLayoutHandles.forEach(function (handle, i) { handle.hidden = false; handle.style.left = (points[i][0] - 5) + 'px'; handle.style.top = (points[i][1] - 5) + 'px'; });
  }
  /* Grouping lives entirely in ArkLayout (the real DOM + cmsLayoutDraft), a different tree
     than the CMS content structure the sidebar's own Layers tab walks (manifest/article
     fields) -- so a new group never appeared there, by construction, however the panel was
     wired. Rather than force those two different trees into one view, report the current
     route's real groups directly so Studio can show them as their own small list. */
  function cmsGroupList() {
    var groups = (cmsLayoutDraft.groups && cmsLayoutDraft.groups[cmsRoutePath()]) || {};
    return Object.keys(groups).map(function (id) { return { id: id, label: groups[id].label || 'Group', members: (groups[id].members || []).length }; });
  }
  function emitCmsLayoutSelection() {
    if (!cmsPreviewSelected) return;
    window.parent.postMessage({ type: 'defxn-cms-preview-select', keys: String(cmsPreviewSelected.getAttribute('data-ark-copy-keys') || '').split(/\s+/).filter(Boolean), selection: cmsSelectionInfo(cmsPreviewSelected), selections: cmsSelectionPayload(), groups: cmsGroupList(), tree: cmsRealTree(host, cmsRoutePath()) }, location.origin);
  }
  function setCmsElementFrame(element, frame, commit) {
    if (!element || !window.ArkLayout) return;
    var info = cmsSelectionInfo(element), patch = { route: info.route, key: info.key, breakpoint: info.breakpoint, frame: frame };
    cmsLayoutDraft = ArkLayout.set(cmsLayoutDraft, patch.route, patch.key, patch.breakpoint, patch.frame);
    /* Clearing the LAST stored property for a key (e.g. un-hiding an element that had no
       other overrides) makes sanitize() drop that key, and sometimes the whole route, from
       the draft entirely -- cmsLayoutDraft.routes[route] can then be undefined, so reading
       [key] off it directly used to throw and abort before applyFrame ever ran, leaving the
       element visually stuck in its old state even though the draft itself was already
       correct. Read defensively instead of assuming the path still exists. */
    var routeNodes = cmsLayoutDraft.routes && cmsLayoutDraft.routes[patch.route];
    ArkLayout.applyFrame(element, ArkLayout.merged(routeNodes && routeNodes[patch.key], window.innerWidth));
    if (commit) window.parent.postMessage({ type: 'defxn-cms-preview-layout-change', patch: patch, selection: cmsSelectionInfo(element), selections: cmsSelectionPayload(), tree: cmsRealTree(host, cmsRoutePath()) }, location.origin);
  }
  function setCmsLayoutFrame(frame, commit) {
    if (!cmsPreviewSelected || !window.ArkLayout) return;
    if (commit) cmsSnapshotLayout();
    setCmsElementFrame(cmsPreviewSelected, frame, commit); placeCmsLayoutUi();
  }
  function cmsSnapshotLayout() {
    cmsLayoutUndo.push(JSON.parse(JSON.stringify(cmsLayoutDraft))); if (cmsLayoutUndo.length > 100) cmsLayoutUndo.shift();
    cmsLayoutRedo.length = 0; cmsReportLayoutHistory();
  }
  function cmsReportLayoutHistory() { window.parent.postMessage({ type: 'defxn-cms-preview-layout-history', canUndo: cmsLayoutUndo.length > 0, canRedo: cmsLayoutRedo.length > 0 }, location.origin); }
  function cmsRestoreLayout(nextDraft) {
    cmsLayoutDraft = ArkLayout.define(nextDraft);
    ArkLayout.apply(host, cmsRoutePath(), window.innerWidth, cmsLayoutDraft);
    placeCmsLayoutUi(); emitCmsLayoutSelection();
    window.parent.postMessage({ type: 'defxn-cms-preview-layout-replace', layout: cmsLayoutDraft, tree: cmsRealTree(host, cmsRoutePath()) }, location.origin);
    cmsReportLayoutHistory();
  }
  function cmsUndoLayout() { if (!cmsLayoutUndo.length) return; cmsLayoutRedo.push(JSON.parse(JSON.stringify(cmsLayoutDraft))); cmsRestoreLayout(cmsLayoutUndo.pop()); }
  function cmsRedoLayout() { if (!cmsLayoutRedo.length) return; cmsLayoutUndo.push(JSON.parse(JSON.stringify(cmsLayoutDraft))); cmsRestoreLayout(cmsLayoutRedo.pop()); }
  function beginCmsLayoutAction(event, dir) {
    if (!cmsPreviewSelected || !cmsPreviewEdit || event.button !== 0) return;
    var r = cmsPreviewSelected.getBoundingClientRect(), current = cmsLayoutEntry(cmsPreviewSelected.getAttribute('data-ark-layout-key'));
    cmsLayoutAction = { dir: dir || 'move', sx: event.clientX, sy: event.clientY, rect: r, moved: false,
      frame: Object.assign({ x: 0, y: 0 }, current) };
    if ((dir || 'move') === 'move' && cmsSelectionList().length > 1) cmsLayoutAction.items = cmsSelectionList().map(function (element) { return { element: element, frame: Object.assign({ x: 0, y: 0 }, cmsLayoutEntry(element.getAttribute('data-ark-layout-key'))) }; });
    if (dir && dir !== 'move') { if (cmsLayoutAction.frame.width == null) cmsLayoutAction.frame.width = r.width; if (cmsLayoutAction.frame.height == null) cmsLayoutAction.frame.height = r.height; }
    if (dir && dir !== 'move') { event.preventDefault(); event.stopPropagation(); }
  }
  function cmsAlign(kind) {
    var elements = cmsSelectionList(); if (elements.length < 2) return;
    cmsSnapshotLayout();
    var union = cmsUnionRect(elements), rects = elements.map(function (element) { return element.getBoundingClientRect(); });
    elements.forEach(function (element, i) {
      var r = rects[i], current = cmsLayoutEntry(element.getAttribute('data-ark-layout-key')), dx = 0, dy = 0;
      if (kind === 'left') dx = union.left - r.left;
      else if (kind === 'hcenter') dx = union.left + union.width / 2 - (r.left + r.width / 2);
      else if (kind === 'right') dx = union.right - r.right;
      else if (kind === 'top') dy = union.top - r.top;
      else if (kind === 'vcenter') dy = union.top + union.height / 2 - (r.top + r.height / 2);
      else if (kind === 'bottom') dy = union.bottom - r.bottom;
      setCmsElementFrame(element, Object.assign({}, current, { x: (current.x || 0) + dx, y: (current.y || 0) + dy }), true);
    }); placeCmsLayoutUi(); emitCmsLayoutSelection();
  }
  function cmsDistribute(axis) {
    var elements = cmsSelectionList(); if (elements.length < 3) return;
    cmsSnapshotLayout();
    var items = elements.map(function (element) { return { element: element, rect: element.getBoundingClientRect() }; });
    items.sort(function (a, b) { return axis === 'horizontal' ? a.rect.left - b.rect.left : a.rect.top - b.rect.top; });
    var first = items[0].rect, last = items[items.length - 1].rect;
    for (var i = 1; i < items.length - 1; i++) {
      var item = items[i], ratio = i / (items.length - 1), current = cmsLayoutEntry(item.element.getAttribute('data-ark-layout-key')), dx = 0, dy = 0;
      if (axis === 'horizontal') dx = first.left + (last.left - first.left) * ratio - item.rect.left;
      else dy = first.top + (last.top - first.top) * ratio - item.rect.top;
      setCmsElementFrame(item.element, Object.assign({}, current, { x: (current.x || 0) + dx, y: (current.y || 0) + dy }), true);
    }
    placeCmsLayoutUi(); emitCmsLayoutSelection();
  }
  /* Real rendered markup is rarely as flat as two shift-clicked "layers" look: a heading and
     a badge that sit side by side on screen are almost never literal DOM siblings -- there is
     usually a wrapping span/strong/anchor in between. Requiring an exact parentNode match
     made grouping fail on almost any real selection, so instead: find each selected
     element's ancestor-or-self that IS a direct child of the whole selection's nearest
     common ancestor, and group those "promoted" nodes. That matches what a user actually
     means by "put these two things in a box together" -- the same way Figma groups a nested
     selection at the shallowest shared frame, not by demanding equal nesting depth. */
  function cmsNearestCommonAncestor(elements, root) {
    var chains = elements.map(function (element) {
      var chain = []; for (var node = element; node && node !== root.parentNode; node = node.parentNode) chain.unshift(node);
      return chain;
    });
    var minLen = Math.min.apply(null, chains.map(function (chain) { return chain.length; })), common = null;
    for (var i = 0; i < minLen; i++) {
      var candidate = chains[0][i];
      if (chains.every(function (chain) { return chain[i] === candidate; })) common = candidate; else break;
    }
    return common;
  }
  function cmsPromoteToChildOf(element, ancestor) {
    for (var node = element; node; node = node.parentNode) if (node.parentNode === ancestor) return node;
    return null;
  }
  function cmsGroupSelection() {
    var elements = cmsSelectionList(); if (elements.length < 2 || !window.ArkLayout) return;
    var common = cmsNearestCommonAncestor(elements, host);
    if (!common || common === host) { window.parent.postMessage({ type: 'defxn-cms-preview-notice', message: 'These layers are not part of the same section. Select layers inside the same card or section first.' }, location.origin); return; }
    var promoted = [];
    elements.forEach(function (element) { var p = cmsPromoteToChildOf(element, common); if (p && promoted.indexOf(p) < 0) promoted.push(p); });
    if (promoted.length < 2) { window.parent.postMessage({ type: 'defxn-cms-preview-notice', message: 'These layers are too close together to group separately. Try selecting their containers instead.' }, location.origin); return; }
    cmsSnapshotLayout();
    promoted.forEach(function (element) { if (!element.getAttribute('data-ark-layout-key')) element.setAttribute('data-ark-layout-key', ArkLayout.keyFor(element, host)); });
    var id = 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), members = promoted.map(function (element) { return element.getAttribute('data-ark-layout-key'); });
    cmsLayoutDraft = ArkLayout.group(cmsLayoutDraft, cmsRoutePath(), id, members, 'Group'); ArkLayout.apply(host, cmsRoutePath(), window.innerWidth, cmsLayoutDraft);
    cmsPreviewSelected = host.querySelector('[data-ark-layout-group="' + id + '"]'); cmsPreviewSelections = cmsPreviewSelected ? [cmsPreviewSelected] : [];
    window.parent.postMessage({ type: 'defxn-cms-preview-layout-change', patch: { operation: 'group', route: cmsRoutePath(), id: id, members: members, label: 'Group' }, selection: cmsPreviewSelected && cmsSelectionInfo(cmsPreviewSelected), selections: cmsSelectionPayload(), groups: cmsGroupList(), tree: cmsRealTree(host, cmsRoutePath()) }, location.origin);
    placeCmsLayoutUi(); emitCmsLayoutSelection();
  }
  function cmsUngroupSelection() {
    var element = cmsPreviewSelected, id = element && element.getAttribute('data-ark-layout-group'); if (!id || !window.ArkLayout) return;
    cmsSnapshotLayout();
    cmsLayoutDraft = ArkLayout.ungroup(cmsLayoutDraft, cmsRoutePath(), id); ArkLayout.apply(host, cmsRoutePath(), window.innerWidth, cmsLayoutDraft);
    cmsPreviewSelected = null; cmsPreviewSelections = [];
    window.parent.postMessage({ type: 'defxn-cms-preview-layout-change', patch: { operation: 'ungroup', route: cmsRoutePath(), id: id }, selection: null, selections: [], groups: cmsGroupList(), tree: cmsRealTree(host, cmsRoutePath()) }, location.origin); placeCmsLayoutUi();
  }
  function cmsIllustrationParts(element) {
    if (!element || !element.querySelectorAll) return [];
    var parts = Array.prototype.slice.call(element.querySelectorAll('svg,g,path,rect,circle,ellipse,line,polyline,polygon,text,canvas,img'));
    return parts.filter(function (part) { var r = part.getBoundingClientRect(); return r.width > 1 && r.height > 1; }).sort(function (a, b) { var ar = a.getBoundingClientRect(), br = b.getBoundingClientRect(); return br.width * br.height - ar.width * ar.height; });
  }
  function cmsSelectIllustrationPart(element) {
    var parts = cmsIllustrationParts(element), part = parts.find(function (candidate) { return candidate !== element && candidate.tagName.toLowerCase() !== 'svg' && candidate.tagName.toLowerCase() !== 'g'; }) || parts[0];
    if (!part) return; cmsPreviewSelected = part; cmsPreviewSelections = [part]; placeCmsLayoutUi(); emitCmsLayoutSelection();
  }
  function showCmsContextMenu(event) {
    ensureCmsLayoutUi(); var count = cmsSelectionList().length, isGroup = cmsPreviewSelected && cmsPreviewSelected.hasAttribute('data-ark-layout-group');
    cmsContextMenu.textContent = '';
    var add = function (label, run, disabled) { var button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.disabled = !!disabled; button.addEventListener('click', function () { cmsContextMenu.hidden = true; run(); }); cmsContextMenu.appendChild(button); };
    var note = document.createElement('small'); note.textContent = count + ' layer' + (count === 1 ? '' : 's') + ' selected · Shift-click adds layers'; cmsContextMenu.appendChild(note);
    /* Part F (follow-up plan): a mode-level action, not a selection action -- always
       present, never disabled, and never gated by cmsPreviewSelected/cmsContextTarget.
       Relays up to Studio (the shared infrastructure owner for restrictMode) rather than
       doing anything here, the same up-relay pattern cmsRemoveSelection/
       cmsComponentsCommand already use for parent-owned state. */
    add('Edit canvas', function () { window.parent.postMessage({ type: 'defxn-cms-preview-enter-canvas-mode' }, location.origin); }, false);
    if (cmsContextTarget && cmsPreviewSelections.indexOf(cmsContextTarget) < 0) add('Add this layer to selection', function () { cmsPreviewSelections.push(cmsContextTarget); cmsPreviewSelected = cmsContextTarget; placeCmsLayoutUi(); emitCmsLayoutSelection(); });
    if (cmsIllustrationParts(cmsPreviewSelected).length) add('Enter illustration', function () { cmsSelectIllustrationPart(cmsPreviewSelected); });
    if (cmsPreviewSelected && cmsPreviewSelected.namespaceURI === 'http://www.w3.org/2000/svg' && cmsPreviewSelected.parentElement) add('Select vector parent', function () { cmsPreviewSelected = cmsPreviewSelected.parentElement; cmsPreviewSelections = [cmsPreviewSelected]; placeCmsLayoutUi(); emitCmsLayoutSelection(); });
    add('Group selection in ' + ((cmsPreviewSelected && cmsPreviewSelected.namespaceURI === 'http://www.w3.org/2000/svg') ? '<g>' : '<div>'), cmsGroupSelection, count < 2);
    if (isGroup) add('Ungroup', cmsUngroupSelection, false);
    /* Part E: the owner's own worked example -- select a few real elements, make them
       "state zero," then add further states that a click cycles through. Enabled on
       the same 2+ selection requirement as "Group selection" above, since a single
       element can already be "state zero" trivially but the feature is about an
       actual multi-element selection becoming one addressable unit. */
    add('Make into states', cmsMakeStates, count < 2);
    add('Remove', cmsRemoveSelection, !cmsPreviewSelected);
    cmsContextMenu.appendChild(document.createElement('hr'));
    [['Align left', 'left'], ['Align horizontal centers', 'hcenter'], ['Align right', 'right'], ['Align top', 'top'], ['Align vertical centers', 'vcenter'], ['Align bottom', 'bottom']].forEach(function (item) { add(item[0], function () { cmsAlign(item[1]); }, count < 2); });
    add('Distribute horizontally', function () { cmsDistribute('horizontal'); }, count < 3); add('Distribute vertically', function () { cmsDistribute('vertical'); }, count < 3);
    Object.assign(cmsContextMenu.style, { left: Math.min(event.clientX, window.innerWidth - 230) + 'px', top: Math.min(event.clientY, window.innerHeight - 330) + 'px' }); cmsContextMenu.hidden = false;
    event.preventDefault(); event.stopPropagation();
  }
  /* Reusable component edits (js/content/components.js): unlike per-frame layout drags,
     every one of these is a single discrete action (create a master, insert an instance,
     edit an override, remove an instance), so each is applied as one whole-draft replace
     -- compute the new draft here with the real ArkComponents mutators, keep this iframe's
     cmsComponentsDraft and ArkComponents's own `current` in sync (ArkComponents.define,
     the same way cmsRestoreLayout() keeps cmsLayoutDraft in sync with ArkLayout.define),
     re-render the current route's anchors live, then relay the whole updated draft up to
     Studio. This is simpler than layout's patch-vs-replace split because there is no drag
     to throttle: one computation, done once, is the single source of truth, instead of the
     same mutation being recomputed independently in two places. */
  function cmsComponentsCommand(data) {
    if (!window.ArkComponents || !cmsPreviewQuery) return;
    var route = (data && data.route) || cmsRoutePath(), draft = cmsComponentsDraft;
    if (data.action === 'create-master') draft = ArkComponents.createMaster(draft, data.id, data.resolver, data.props, data.label);
    else if (data.action === 'update-master') draft = ArkComponents.updateMaster(draft, data.id, data.patch);
    else if (data.action === 'insert-instance') draft = ArkComponents.insertInstance(draft, route, data.anchorId, data.key, data.masterId);
    else if (data.action === 'set-override') draft = ArkComponents.setOverride(draft, route, data.anchorId, data.key, data.propPath, data.value);
    else if (data.action === 'remove-instance') draft = ArkComponents.removeInstance(draft, route, data.anchorId, data.key);
    else return;
    cmsComponentsDraft = ArkComponents.define(draft);
    ArkComponents.renderAll(host, route, cmsComponentsDraft);
    window.parent.postMessage({ type: 'defxn-cms-preview-components-replace', components: cmsComponentsDraft, anchors: ArkComponents.anchorsIn(host), tree: cmsRealTree(host, route) }, location.origin);
  }
  /* "Make into states" (js/main.js's own showCmsContextMenu, below): the current
     selection becomes state 0 of a brand-new group, the same direct-call shape
     cmsGroupSelection already uses for its own right-click action (not a postMessage
     round trip, since the selection already lives here). Every OTHER states edit
     (+ Add state, remove a state, change the trigger, preview a state) comes from
     Studio's inspector instead, so it is message-driven -- see cmsStatesCommand below,
     the same create-vs-edit split cmsGroupSelection/cmsComponentsCommand already have. */
  function cmsMakeStates() {
    var elements = cmsSelectionList();
    if (elements.length < 2 || !window.ArkStates || !window.ArkLayout) return;
    elements.forEach(function (element) { if (!element.getAttribute('data-ark-layout-key')) element.setAttribute('data-ark-layout-key', ArkLayout.keyFor(element, host)); });
    var route = cmsRoutePath(), groupId = 'st' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    var keys = elements.map(function (element) { return element.getAttribute('data-ark-layout-key'); });
    cmsStatesDraft = ArkStates.define(ArkStates.createStateGroup(cmsStatesDraft, route, groupId, keys, 'self'));
    ArkStates.render(host, route, groupId, cmsStatesDraft, cmsComponentsDraft);
    window.parent.postMessage({ type: 'defxn-cms-preview-states-replace', states: cmsStatesDraft, route: route, groupId: groupId, tree: cmsRealTree(host, route) }, location.origin);
    emitCmsLayoutSelection();
  }
  /* Layered-state edits from Studio's States inspector accordion: every add-state/
     remove-state/remove-group/set-trigger/set-current command is computed once here
     with the real ArkStates mutators, re-rendered for that one group live, then
     relayed up as a whole-draft replace -- the exact same shape as
     cmsComponentsCommand above. `set-current` (Studio's own "preview this state" row
     click) goes through this identical pipeline rather than a separate preview-only
     path: nothing in this app writes to disk except an explicit Save, so a preview
     click that is never followed by Save never reaches a saved file either, the same
     as any other unsaved edit here. */
  function cmsStatesCommand(data) {
    if (!window.ArkStates || !cmsPreviewQuery || !data) return;
    var route = (data && data.route) || cmsRoutePath(), draft = cmsStatesDraft;
    if (data.action === 'add-state') draft = ArkStates.addState(draft, route, data.groupId, data.label);
    else if (data.action === 'remove-state') draft = ArkStates.removeState(draft, route, data.groupId, data.index);
    else if (data.action === 'remove-group') draft = ArkStates.removeGroup(draft, route, data.groupId);
    else if (data.action === 'set-trigger') draft = ArkStates.setTrigger(draft, route, data.groupId, data.trigger);
    else if (data.action === 'set-current') draft = ArkStates.setCurrent(draft, route, data.groupId, data.index);
    else return;
    cmsStatesDraft = ArkStates.define(draft);
    if (data.groupId) ArkStates.render(host, route, data.groupId, cmsStatesDraft, cmsComponentsDraft);
    window.parent.postMessage({ type: 'defxn-cms-preview-states-replace', states: cmsStatesDraft, route: route, groupId: data.groupId,
      anchors: window.ArkComponents ? ArkComponents.anchorsIn(host) : [], tree: cmsRealTree(host, route) }, location.origin);
  }
  /* Canvas-only mode's field edits (effect/duration/easing, Part G): unlike layout/
     components/states, nothing here mutates real page content or needs re-rendering
     against a route -- it is one site-wide settings object -- so this just merges the
     patch, sanitizes it through the real ArkCanvasTransitions.define() (keeping this
     iframe's own module state and the relayed draft in sync, the same way every other
     cmsXCommand above does), and relays the whole updated draft up. Studio has no copy
     of ArkCanvasTransitions.sanitize() of its own (it is a single inline-script
     document with no <script src> for the content modules); computing the sanitized
     result once here, inside the one document that does have this module loaded, is
     the same "centralize, don't duplicate" reasoning the rest of this pipeline follows. */
  function cmsCanvasTransitionsCommand(data) {
    if (!window.ArkCanvasTransitions || !cmsPreviewQuery || !data) return;
    cmsCanvasTransitionsDraft = ArkCanvasTransitions.define(Object.assign({}, cmsCanvasTransitionsDraft, data.patch));
    window.parent.postMessage({ type: 'defxn-cms-preview-canvas-transitions-replace', canvasTransitions: cmsCanvasTransitionsDraft }, location.origin);
  }
  /* Studio's "Preview this transition" button: a one-shot round trip against the
     connected preview's own persistent layer, reusing the exact same apply() call
     js/ark/page-router.js's navigate() makes on every real navigation -- never a
     separate preview-only animation path. Reads whatever is currently defined
     (cmsCanvasTransitionsDraft's sanitized value, already live here from every prior
     field edit above), so the owner previews their unsaved draft, not last Save's. */
  function cmsCanvasTransitionsPreview() {
    if (!window.ArkCanvasTransitions || !cmsPreviewQuery) return;
    var persistentEl = scene && scene.querySelector && scene.querySelector('[data-ark-layer="persistent"]');
    if (!persistentEl) return;
    try {
      var outMs = ArkCanvasTransitions.apply(persistentEl, 'out');
      setTimeout(function () { try { ArkCanvasTransitions.apply(persistentEl, 'in'); } catch (e) {} }, outMs);
    } catch (e) {}
  }
  /* Animation-only mode's field edits (direction/distance/duration/delay/easing,
     Part H): resolved against the CURRENTLY SELECTED element (cmsPreviewSelected,
     the same selection every layout/components/states command above already acts
     on). This has no copy of ArkElementMotion.sanitize()/set() of its own (same
     "this document has no <script src>, compute it once inside the one document
     that does" reasoning cmsCanvasTransitionsCommand's own comment states) -- merge
     the patch through the real ArkElementMotion.set(), keep this iframe's own
     module state and the relayed draft in sync, relay the whole updated draft up.
     A patch with no selection, or a selection with no addressable key, is a safe
     no-op: Studio's own panel never shows these controls without a selection (the
     "Select an element..." hint takes their place instead), but every other
     selection-scoped command above guards the same way regardless of what the UI
     currently shows. */
  function cmsElementMotionCommand(data) {
    if (!window.ArkElementMotion || !cmsPreviewQuery || !data || !data.patch || !cmsPreviewSelected) return;
    var info = cmsSelectionInfo(cmsPreviewSelected);
    if (!info.key) return;
    cmsElementMotionDraft = ArkElementMotion.define(ArkElementMotion.set(cmsElementMotionDraft, info.route, info.key, data.patch));
    window.parent.postMessage({ type: 'defxn-cms-preview-element-motion-replace', elementMotion: cmsElementMotionDraft, selection: info }, location.origin);
  }
  /* Studio's "Preview" button (Part H): a one-shot round trip against the connected
     preview's own selected element. createPresence's real per-item stagger
     (js/ark/scene-state.js) only ever operates on a whole registered page's own
     item list from inside its own closure, so there is no single exported function
     to call for one arbitrary element directly -- this instead builds the exact
     same keyframe/transform SHAPE createPresence's own override branch does (same
     ArkElementMotion.vectorFor() table, same sign convention: entering travels FROM
     the offset point with sign +1, exiting travels TO it with sign -1), so the two
     can never describe the override differently even though they are not one
     literal shared call. Reads the DRAFT's current (possibly unsaved) value for the
     resolved key -- not whatever is already saved to window.ArkElementMotion -- so
     the owner previews exactly what they are about to save, the same "preview the
     unsaved draft" rule cmsCanvasTransitionsPreview above already follows. */
  function cmsElementMotionPreview(key) {
    if (!window.ArkElementMotion) return;
    var element = key ? cmsElementForKey(key) : cmsPreviewSelected;
    if (!element) return;
    var resolvedKey = key || element.getAttribute('data-ark-layout-key');
    if (!resolvedKey) return;
    var entry = ArkElementMotion.entryFor(cmsElementMotionDraft, cmsRoutePath(), resolvedKey) || ArkElementMotion.defaultEntry();
    var vec = ArkElementMotion.vectorFor(entry.direction);
    var base = getComputedStyle(element).transform;
    function offsetTransform(sign) {
      var ox = vec[0] * entry.distance * sign, oy = vec[1] * entry.distance * sign;
      return 'translate3d(' + ox + 'px,' + oy + 'px,0)' + (base === 'none' ? '' : ' ' + base);
    }
    try {
      var exit = element.animate([
        { opacity: getComputedStyle(element).opacity, transform: base },
        { opacity: 0, transform: offsetTransform(-1) }
      ], { duration: entry.duration, delay: 0, easing: entry.easing, fill: 'both' });
      Promise.resolve(exit.finished ? exit.finished.catch(function () {}) : null).then(function () {
        try { element.animate([
          { opacity: 0, transform: offsetTransform(1) },
          { opacity: 1, transform: base }
        ], { duration: entry.duration, delay: entry.delay, easing: entry.easing, fill: 'both' }); } catch (e) {}
      });
    } catch (e) {}
  }
  window.addEventListener('message', function (event) {
    if (event.origin !== location.origin) return;
    var data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'flux-chain-preview-theme' && data.theme) {
      if (!window.ArkTheme) return;
      if (data.theme.activeTheme) root.dataset.theme = data.theme.activeTheme;
      ArkUI.base(ArkTheme.css(data.theme));
      if (data.theme.background) applyBackground(data.theme.background);
      return;
    }
    if (data.type === 'defxn-cms-preview-mode' && event.source === window.parent && cmsPreviewQuery) {
      cmsPreviewEdit = data.mode !== 'live';
      if (!cmsPreviewEdit) { cmsPreviewSelected = null; cmsPreviewSelections = []; } placeCmsLayoutUi();
      return;
    }
    /* The Layers panel's eye icon targets a tree row, which is usually not whatever is
       currently selected -- data.key routes to setCmsLayoutFrameForKey (an explicit element,
       same ArkLayout.set() mechanism) instead of setCmsLayoutFrame (which always acts on
       cmsPreviewSelected, exactly as every Frame/Fill accordion control already relies on). */
    if (data.type === 'defxn-cms-preview-layout-command' && event.source === window.parent && cmsPreviewQuery && data.frame) {
      if (data.key) setCmsLayoutFrameForKey(data.key, data.frame, true); else setCmsLayoutFrame(data.frame, true);
      return;
    }
    if (data.type === 'defxn-cms-preview-layout-operation' && event.source === window.parent && cmsPreviewQuery) {
      if (data.operation === 'group') cmsGroupSelection();
      else if (data.operation === 'ungroup') cmsUngroupSelection();
      else if (data.operation === 'distribute-horizontal') cmsDistribute('horizontal');
      else if (data.operation === 'distribute-vertical') cmsDistribute('vertical');
      else cmsAlign(data.operation); return;
    }
    if (data.type === 'defxn-cms-preview-layout-undo' && event.source === window.parent && cmsPreviewQuery) { cmsUndoLayout(); return; }
    if (data.type === 'defxn-cms-preview-layout-redo' && event.source === window.parent && cmsPreviewQuery) { cmsRedoLayout(); return; }
    if (data.type === 'defxn-cms-preview-components-command' && event.source === window.parent && cmsPreviewQuery) { cmsComponentsCommand(data); return; }
    if (data.type === 'defxn-cms-preview-states-command' && event.source === window.parent && cmsPreviewQuery) { cmsStatesCommand(data); return; }
    if (data.type === 'defxn-cms-preview-canvas-transitions-command' && event.source === window.parent && cmsPreviewQuery) { cmsCanvasTransitionsCommand(data); return; }
    if (data.type === 'defxn-cms-preview-canvas-transitions-preview' && event.source === window.parent && cmsPreviewQuery) { cmsCanvasTransitionsPreview(); return; }
    if (data.type === 'defxn-cms-preview-element-motion-command' && event.source === window.parent && cmsPreviewQuery) { cmsElementMotionCommand(data); return; }
    if (data.type === 'defxn-cms-preview-element-motion-preview' && event.source === window.parent && cmsPreviewQuery) { cmsElementMotionPreview(data && data.key); return; }
    /* Forwarded from admin-studio.html's own keydown handler for the one case where that
       parent document, not this iframe, actually holds keyboard focus while connected (e.g.
       right after clicking a "Groups on this page" row in the sidebar, which is a parent-
       document button) -- see the keydown listener below for the normal case, where focus
       already lives here and this message is never sent. */
    if (data.type === 'defxn-cms-preview-remove-selection' && event.source === window.parent && cmsPreviewQuery) { cmsRemoveSelection(); return; }
    /* Select-by-id (an existing layout group) and select-by-key (any annotated element, the
       Layers panel row click -- Part B) are close enough in shape to share one handler: both
       just resolve a target element and select it, the only difference is how the target is
       found. A sibling message type would just duplicate this whole body for one line of
       difference. */
    if (data.type === 'defxn-cms-preview-select-group' && event.source === window.parent && cmsPreviewQuery && (data.id || data.key)) {
      var targetEl = data.key ? cmsElementForKey(data.key) : host.querySelector('[data-ark-layout-group="' + data.id + '"]');
      if (!targetEl) { window.parent.postMessage({ type: 'defxn-cms-preview-notice', message: data.key ? 'That element is not on the current page.' : 'That group is not on the current page.' }, location.origin); return; }
      cmsPreviewSelected = targetEl; cmsPreviewSelections = [targetEl];
      placeCmsLayoutUi(); emitCmsLayoutSelection(); return;
    }
    /* Rename a Layers panel row (Part B): writes through ArkLayout.setLabel the same way
       every other layout draft mutation does (snapshot first, for undo/redo), then relays
       the updated tree right away -- a label edit must feel instant, not wait for the next
       unrelated selection change to refresh the panel. */
    if (data.type === 'defxn-cms-preview-set-label' && event.source === window.parent && cmsPreviewQuery && data.key != null && window.ArkLayout) {
      var labelRoute = data.route || cmsRoutePath();
      cmsSnapshotLayout();
      cmsLayoutDraft = ArkLayout.setLabel(cmsLayoutDraft, labelRoute, data.key, data.label);
      window.parent.postMessage({ type: 'defxn-cms-preview-layout-change', patch: { route: labelRoute, key: data.key, operation: 'set-label', label: data.label },
        selection: cmsPreviewSelected && cmsSelectionInfo(cmsPreviewSelected), selections: cmsSelectionPayload(), groups: cmsGroupList(), tree: cmsRealTree(host, cmsRoutePath()) }, location.origin);
      return;
    }
    if (data.type === 'defxn-cms-preview-layout-reset' && event.source === window.parent && cmsPreviewQuery && cmsPreviewSelected && window.ArkLayout) {
      var resetInfo = cmsSelectionInfo(cmsPreviewSelected), reset = { route: resetInfo.route, key: resetInfo.key, breakpoint: data.breakpoint || resetInfo.breakpoint, reset: true };
      cmsSnapshotLayout();
      cmsLayoutDraft = ArkLayout.remove(cmsLayoutDraft, reset.route, reset.key, reset.breakpoint); ArkLayout.apply(host, reset.route, window.innerWidth, cmsLayoutDraft); placeCmsLayoutUi();
      window.parent.postMessage({ type: 'defxn-cms-preview-layout-change', patch: reset, selection: cmsSelectionInfo(cmsPreviewSelected), tree: cmsRealTree(host, reset.route) }, location.origin); return;
    }
    /* The complete CMS preview is deliberately accepted only inside an iframe
       opened with a preview query. It replaces the in-memory registries with
       unsaved drafts, then remounts the real route module. The same HTML, CSS,
       components and runtime therefore render here as on the deployed site. */
    if (data.type !== 'defxn-cms-preview-state' || !data.site || event.source !== window.parent ||
        !cmsPreviewQuery) return;
    var site = data.site;
    try {
      if (window.ArkManifest && Array.isArray(site.manifests)) site.manifests.forEach(function (manifest) { ArkManifest.define(manifest); });
      if (window.LearningContent && Array.isArray(site.articles)) {
        LearningContent.define(site.articles);
        site.articles.forEach(function (article) { if (article.sections) LearningContent.load(article.slug, article); });
      }
      if (window.ArkAsset && Array.isArray(site.assets)) site.assets.forEach(function (asset) { ArkAsset.define(asset); });
      if (window.ArkMeshSettings && site.meshSettings) ArkMeshSettings.define(site.meshSettings);
      if (window.ArkTheme && site.theme) {
        ArkTheme.define(site.theme);
        if (site.theme.activeTheme) root.dataset.theme = site.theme.activeTheme;
        ArkUI.base(ArkTheme.css(site.theme));
        if (site.theme.background) applyBackground(site.theme.background);
      }
      if (window.ArkSEO && site.seo) ArkSEO.define(site.seo);
      if (window.ArkLayout && site.layout) { cmsLayoutDraft = ArkLayout.define(site.layout); }
      if (window.ArkComponents && site.components) { cmsComponentsDraft = ArkComponents.define(site.components); }
      if (window.ArkStates && site.states) { cmsStatesDraft = ArkStates.define(site.states); }
      if (window.ArkCanvasTransitions && site.canvasTransitions) { cmsCanvasTransitionsDraft = ArkCanvasTransitions.define(site.canvasTransitions); }
      if (window.ArkElementMotion && site.elementMotion) { cmsElementMotionDraft = ArkElementMotion.define(site.elementMotion); }
      if (window.ArkSEO && ArkUI.pageCatalog) Object.keys(ArkUI.pageCatalog).forEach(function (key) {
        var entry = ArkUI.pageCatalog[key];
        if (!entry.cmsFallbackTitle) entry.cmsFallbackTitle = String(entry.title || key).replace(/\s+[—-]\s+(?:DEFXN|Flux Protocol).*$/, '');
        if (entry.seoArticle) {
          var article = LearningContent.find(entry.seoArticle);
          entry.title = ArkSEO.articleTitle(entry.seoArticle, article ? article.title : entry.cmsFallbackTitle);
        } else if (entry.seoId) {
          var manifest = ArkManifest.get(entry.seoId);
          entry.title = ArkSEO.pageTitle(entry.seoId, manifest ? manifest.title : entry.cmsFallbackTitle);
        }
      });
      var refreshed = ArkUI.pageRouter && ArkUI.pageRouter.refresh ? ArkUI.pageRouter.refresh() : Promise.resolve();
      Promise.resolve(refreshed).then(function () {
        annotateCmsPreviewCopy(site.manifests);
        if (window.ArkLayout) ArkLayout.apply(host, cmsRoutePath(), window.innerWidth, cmsLayoutDraft);
        if (window.ArkComponents) ArkComponents.renderAll(host, cmsRoutePath(), cmsComponentsDraft);
        if (window.ArkStates) ArkStates.renderAll(host, cmsRoutePath(), cmsStatesDraft, cmsComponentsDraft);
        placeCmsLayoutUi();
        window.parent.postMessage({ type: 'defxn-cms-preview-ready', path: ArkUI.route.path(), groups: cmsGroupList(), anchors: window.ArkComponents ? ArkComponents.anchorsIn(host) : [], tree: cmsRealTree(host, cmsRoutePath()) }, location.origin);
      }).catch(function (error) {
        window.parent.postMessage({ type: 'defxn-cms-preview-error', message: error.message }, location.origin);
        if (window.console) console.error('[ark] CMS preview refresh failed', error);
      });
    } catch (error) {
      window.parent.postMessage({ type: 'defxn-cms-preview-error', message: error.message }, location.origin);
      if (window.console) console.error('[ark] CMS preview state failed', error);
    }
  });
  /* In edit mode the exact public DOM remains visible and scrollable, but a
     click selects the manifest-backed element instead of following its link.
     Live mode removes this interception and behaves exactly like the site. */
  /* A grouped element keeps its own data-ark-layout-key, so a plain closest() lookup always
     resolves to the innermost clicked child, never the group wrapper around it -- so a click
     anywhere inside a just-created group silently re-selected a single member, and dragging
     from that point moved only that member instead of the whole group. Resolve a raw pick up
     to its nearest enclosing group, the same "select the frame first, click again to drill
     in" rule the admin's own instance picker (resolvePick in admin-studio.html) already uses:
     stay drilled in only while the current selection is already that same group or something
     inside it. */
  function cmsGroupRootOf(element) {
    for (var node = element; node && node !== host; node = node.parentNode) if (node.hasAttribute && node.hasAttribute('data-ark-layout-group')) return node;
    return null;
  }
  /* A click anywhere inside a reusable-component instance (e.g. the paragraph inside a quote
     block, or a heading inside a text block) must select the instance's own root, the thing
     Studio's override panel actually edits -- never a structural child key of no interest on
     its own. Same "select the frame first" escalation cmsGroupRootOf/cmsResolvePick already
     use for a just-created layout group, applied a second time for component instances. */
  function cmsComponentRootOf(element) {
    for (var node = element; node && node !== host; node = node.parentNode) if (node.hasAttribute && node.hasAttribute('data-ark-component-key')) return node;
    return null;
  }
  /* "Delete" in connected mode (Part A of the follow-up Studio plan) can never mean
     destroying arbitrary hand-written real page content -- there is no such concept, and
     never will be: it's hardcoded in the page module's JS. It means exactly one of three
     things, reusing cmsComponentRootOf/cmsGroupRootOf above rather than re-deriving the same
     two checks differently: a component instance is removed for real (the SAME path the
     inspector's own "Remove instance" button already uses -- cmsComponentsCommand's
     'remove-instance' action); a layout group is ungrouped (its real children were always
     real content, so "deleting" a group can only ever mean "stop grouping them," never
     destroy them -- the SAME cmsUngroupSelection() the right-click menu's own "Ungroup" entry
     already calls); anything else gets a notice explaining it can't be deleted, only hidden
     (Part B's eye icon, not built yet -- referenced by name only). */
  function cmsRemoveSelection() {
    var element = cmsPreviewSelected;
    if (!element) return;
    var compRoot = cmsComponentRootOf(element);
    if (compRoot) {
      cmsComponentsCommand({ action: 'remove-instance', route: cmsRoutePath(), anchorId: compRoot.getAttribute('data-ark-component-anchor'), key: compRoot.getAttribute('data-ark-component-key') });
      cmsPreviewSelected = null; cmsPreviewSelections = []; placeCmsLayoutUi();
      /* cmsComponentsCommand already relays the updated components draft up; the selection
         itself (now gone) also needs clearing in Studio -- reuse the existing '-select'
         message shape with a null selection instead of inventing a second message type. */
      window.parent.postMessage({ type: 'defxn-cms-preview-select', keys: [], selection: null, selections: [], groups: cmsGroupList(), tree: cmsRealTree(host, cmsRoutePath()) }, location.origin);
      return;
    }
    var groupRoot = cmsGroupRootOf(element);
    if (groupRoot) { cmsPreviewSelected = groupRoot; cmsUngroupSelection(); return; }
    window.parent.postMessage({ type: 'defxn-cms-preview-notice', message: 'This is real page content — it can’t be deleted here. Hide it from the Layers panel instead (coming soon).' }, location.origin);
  }
  function cmsResolvePick(target) {
    var root = cmsGroupRootOf(target);
    var resolved = (!root || root === target) ? target : ((cmsPreviewSelected && root.contains(cmsPreviewSelected)) ? target : root);
    var compRoot = cmsComponentRootOf(resolved);
    if (!compRoot || compRoot === resolved) return resolved;
    return (cmsPreviewSelected && compRoot.contains(cmsPreviewSelected)) ? resolved : compRoot;
  }
  document.addEventListener('click', function (event) {
    if (!cmsPreviewQuery || !cmsPreviewEdit || window.parent === window) return;
    if (event.target && event.target.closest && event.target.closest('[data-ark-studio-ui]')) return;
    if (window.ArkLayout) ArkLayout.annotate(host);
    var graphic = event.target && event.target.closest && event.target.closest('path,rect,circle,ellipse,line,polyline,polygon,svg,canvas,img,figure,picture,video');
    /* The last fallback, [data-ark-component-key], catches a click on a leaf that
       ArkLayout.annotate() never tags (RBLOCK_QUOTE_V1's <cite>, RBLOCK_DIVIDER_V1's bare
       <hr>) -- without it rawTarget is null there and the click silently selects nothing. */
    var rawTarget = graphic && graphic.hasAttribute('data-ark-layout-key') ? graphic : event.target && event.target.closest && (event.target.closest('[data-ark-copy-keys]') || event.target.closest('[data-ark-layout-key]') || event.target.closest('[data-ark-component-key]'));
    if (!rawTarget) return;
    var target = cmsResolvePick(rawTarget);
    event.preventDefault(); event.stopPropagation();
    if (event.shiftKey || event.metaKey || event.ctrlKey) {
      var at = cmsPreviewSelections.indexOf(target); if (at >= 0) cmsPreviewSelections.splice(at, 1); else cmsPreviewSelections.push(target);
      cmsPreviewSelected = cmsPreviewSelections[cmsPreviewSelections.length - 1] || null;
    } else { cmsPreviewSelected = target; cmsPreviewSelections = [target]; }
    placeCmsLayoutUi(); emitCmsLayoutSelection();
  }, true);
  /* Part E's real-visitor behavior: click-to-cycle a layered-state group. Deliberately
     UNCONDITIONAL -- no cmsPreviewQuery/cmsPreviewEdit/window.parent check -- unlike
     every CMS-editor listener above, since this has to run for every real visitor on
     the deployed site, not only inside Studio. A plain bubble-phase listener (no
     capture, no stopPropagation): while Studio is actively editing (cmsPreviewEdit
     true), the capture-phase selection listener above already calls
     event.stopPropagation() for any click on annotated content, which keeps this
     listener from ever firing during an actual edit session -- exactly like a real
     visitor never gets selection UI, an editor mid-edit never gets a surprise state
     advance. Studio's own "Live mode" toggle (cmsPreviewEdit=false) lets this through
     normally, so the click-to-cycle behavior can be tried from inside Studio too. */
  document.addEventListener('click', function (event) {
    if (!window.ArkStates) return;
    var route = cmsRoutePath(), groupId = ArkStates.findTriggerMatch(host, route, cmsStatesDraft, event.target);
    if (!groupId) return;
    event.preventDefault();
    cmsStatesDraft = ArkStates.define(ArkStates.advance(cmsStatesDraft, route, groupId));
    ArkStates.render(host, route, groupId, cmsStatesDraft, cmsComponentsDraft);
  });
  document.addEventListener('contextmenu', function (event) {
    if (!cmsPreviewQuery || !cmsPreviewEdit || window.parent === window) return;
    if (event.target && event.target.closest && event.target.closest('[data-ark-studio-ui]')) { if (!event.target.closest('.ark-studio-menu')) showCmsContextMenu(event); return; }
    if (window.ArkLayout) ArkLayout.annotate(host);
    var target = cmsPreviewSelections.find(function (element) { return element === event.target || element.contains(event.target); });
    if (!target) { var rawTarget = event.target && event.target.closest && event.target.closest('[data-ark-layout-key]'); target = rawTarget && cmsResolvePick(rawTarget); } if (!target) return;
    cmsContextTarget = target;
    if (!cmsPreviewSelections.length) { cmsPreviewSelected = target; cmsPreviewSelections = [target]; placeCmsLayoutUi(); emitCmsLayoutSelection(); }
    showCmsContextMenu(event);
  }, true);
  document.addEventListener('pointerdown', function (event) { if (cmsContextMenu && !(event.target && event.target.closest && event.target.closest('.ark-studio-menu'))) cmsContextMenu.hidden = true; }, true);
  document.addEventListener('pointerdown', function (event) {
    if (!cmsPreviewQuery || !cmsPreviewEdit || !cmsPreviewSelected) return;
    var handle = event.target && event.target.closest && event.target.closest('.ark-studio-handle');
    if (handle) { beginCmsLayoutAction(event, handle.dataset.dir); return; }
    if (event.target && event.target.closest && event.target.closest('.ark-studio-label')) { beginCmsLayoutAction(event, 'move'); return; }
    if (cmsPreviewSelected.contains(event.target)) beginCmsLayoutAction(event, 'move');
  }, true);
  window.addEventListener('pointermove', function (event) {
    if (!cmsLayoutAction) return;
    var a = cmsLayoutAction, dx = event.clientX - a.sx, dy = event.clientY - a.sy, f = Object.assign({}, a.frame), dir = a.dir;
    if (Math.hypot(dx, dy) < 5) return; a.moved = true; event.preventDefault();
    if (dir === 'move') {
      if (a.items) { a.items.forEach(function (item) { item.next = Object.assign({}, item.frame, { x: (item.frame.x || 0) + dx, y: (item.frame.y || 0) + dy }); setCmsElementFrame(item.element, item.next, false); }); placeCmsLayoutUi(); return; }
      f.x = a.frame.x + dx; f.y = a.frame.y + dy;
    }
    else {
      var left = dir.indexOf('w') >= 0, top = dir.indexOf('n') >= 0, width = Math.max(8, a.rect.width + (left ? -dx : dx)), height = Math.max(8, a.rect.height + (top ? -dy : dy));
      if (event.shiftKey) { var ratio = a.rect.width / Math.max(1, a.rect.height); if (width / height > ratio) height = width / ratio; else width = height * ratio; }
      f.width = width; f.height = height; if (left) f.x = a.frame.x + (a.rect.width - width); if (top) f.y = a.frame.y + (a.rect.height - height);
    }
    cmsLayoutFrame = f; setCmsLayoutFrame(f, false);
  }, true);
  window.addEventListener('pointerup', function () {
    if (!cmsLayoutAction) return; var action = cmsLayoutAction, moved = action.moved, frame = cmsLayoutFrame || action.frame; cmsLayoutAction = null; cmsLayoutFrame = null;
    if (moved && action.items) { cmsSnapshotLayout(); action.items.forEach(function (item) { setCmsElementFrame(item.element, item.next || item.frame, true); }); placeCmsLayoutUi(); emitCmsLayoutSelection(); }
    else if (moved) setCmsLayoutFrame(frame, true);
  }, true);
  window.addEventListener('resize', function () {
    if (window.ArkLayout) ArkLayout.apply(host, cmsRoutePath(), window.innerWidth, cmsLayoutDraft);
    /* Re-run right after ArkLayout.apply(), same ordering reason as the onMount rAF
       pair above: apply()'s own resetElement() pass would otherwise wipe a hidden
       state-0 member's display:none on every resize. */
    if (window.ArkStates) ArkStates.renderAll(host, cmsRoutePath(), cmsStatesDraft, cmsComponentsDraft);
    placeCmsLayoutUi();
  });
  document.addEventListener('scroll', placeCmsLayoutUi, true);
  /* Delete/Backspace for the connected canvas. admin-studio.html's own global keydown
     handler (line ~4138) calls removeSel(), which only operates on the standalone dense-node
     tree -- meaningless here. A click inside this iframe (the document.addEventListener
     ('click', ...) handler above) moves keyboard focus into it, so THIS listener, not the
     parent's, is what normally receives the keystroke once a real element is selected; the
     'defxn-cms-preview-remove-selection' message above covers the one case where focus
     stayed in the parent instead. Guarded the same way showCmsContextMenu's own trigger
     already is (cmsPreviewEdit), and never while the user is typing in a field, mirroring
     admin-studio.html's own `typing` check at line ~4141. */
  document.addEventListener('keydown', function (event) {
    if (!cmsPreviewQuery || !cmsPreviewEdit) return;
    if (event.key !== 'Delete' && event.key !== 'Backspace') return;
    var active = document.activeElement, tag = (active && active.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || (active && active.isContentEditable)) return;
    if (!cmsPreviewSelected) return;
    event.preventDefault();
    cmsRemoveSelection();
  });
})();

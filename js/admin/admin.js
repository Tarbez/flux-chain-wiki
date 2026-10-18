/* =====================================================================
   ADMIN PAGE
   ---------------------------------------------------------------------
   Edits the page manifests in js/content/manifests/ and the articles in
   js/content/articles/, the same files the site reads its words from. With the project folder connected, Save
   writes the file in place; without it, Save downloads the file to drop
   into that folder. Nothing here knows any page's words: the form is
   built from each manifest's own fields. Publish sends the whole site to the
   mesh through the local publish host (scripts/publish-host.mjs); the owner
   key that signs it never leaves this browser (js/admin/publish.js).
   ===================================================================== */
(function () {
  'use strict';

  /* This page is the editor. It is served only to a signed-in session and only makes sense inside the locked page (admin.html),
     which holds the identity's key. Opened on its own, it sends you back there instead of pretending to work. */
  var gate = null;
  try { gate = window.parent !== window ? window.parent.ArkGate : null; } catch (e) { gate = null; }
  if (!gate) { window.location.replace('admin.html'); return; }

  /* The real, shared <flux-authorization-dialog> (same element flux-dao-app
     registers via @deadark/ark-ui/elements) -- an ARIA/focus-trap/busy-state
     primitive with no template of its own; authorizePublish() below supplies
     the light-DOM content, same shape as ScopedAuthorizationDialog's. */
  if (window.ArkFluxElements) window.ArkFluxElements.defineFluxAuthorizationDialog();

  var $ = function (id) { return document.getElementById(id); };
  var GROUP_NAMES = { site: 'Site', page: 'Pages', theory: 'Theory pages' };

  function h(tag, props) {
    var node = document.createElement(tag);
    Object.keys(props || {}).forEach(function (key) {
      if (key === 'text') node.textContent = props[key];
      else if (key === 'class') node.className = props[key];
      else if (key.slice(0, 2) === 'on') node.addEventListener(key.slice(2), props[key]);
      else if (props[key] !== false && props[key] !== null) node.setAttribute(key, props[key] === true ? '' : props[key]);
    });
    /* A string child is text, not an error: renderSecretEditor passed two strings here and
       appendChild threw, so the whole Encrypted editor rendered nothing -- a new encrypted
       item could not even be opened (regression: tests/admin-h-text-children.cjs). */
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) node.appendChild(typeof arguments[i] === 'string' ? document.createTextNode(arguments[i]) : arguments[i]);
    return node;
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  /* A disabled control says why (law: a refusal names what it needs). Save, Revert and a
     colour's Default were greyed out with no explanation -- indistinguishable from broken
     (tests/browser/full-audit.mjs's sweep; regression: tests/admin-disabled-says-why.cjs).
     `reason` empty enables the button (restoring its own tooltip); anything else disables it and
     becomes its tooltip. */
  var NOTHING_TO_SAVE = 'Nothing to save: every draft matches its saved copy.';
  function refuse(button, reason) {
    if (!button) return;
    if (button.dataset.baseTitle === undefined) button.dataset.baseTitle = button.title || '';
    button.disabled = !!reason;
    button.title = reason || button.dataset.baseTitle;
  }

  var state = { ids: ArkManifestIds.slice(), drafts: {}, saved: {}, current: null, dir: null,
                /* Step 3 (Design/Content mode switch, flickering-juggling-donut.md): mode is
                   one level ABOVE kind. contentKind/designKind remember which kind to land on
                   when re-entering each mode (so switching modes and back never loses a
                   selection or an in-progress draft -- nothing is torn down, kind's own state
                   -- state.current/aCurrent/etc. -- is untouched by a mode switch). mode starts
                   'design' to match kind's own existing default ('studio'); see kindMode(). */
                mode: 'design', contentKind: 'page', designKind: 'studio',
                kind: 'studio', slugs: [], aDrafts: {}, aSaved: {}, aCurrent: null, cdirs: null,
                assetIds: ArkAssetIds.slice(), assetDrafts: {}, assetSaved: {}, assetCurrent: null, assetDir: null,
                secretIds: ArkSecretIds.slice(), secretDrafts: {}, secretSaved: {}, secretCurrent: null, secretDir: null, secretPlaintext: {}, secretRecipientsText: {}, secretDecrypted: {},
                shapeIds: [], shapeLabels: {}, shapeCurrent: null };
  var layoutDraft = window.ArkLayout ? ArkLayout.get() : { version: 1, routes: {} };
  var layoutSaved = window.ArkLayout ? JSON.stringify(ArkLayout.sanitize(layoutDraft)) : JSON.stringify(layoutDraft);
  function layoutDirty() { return JSON.stringify(window.ArkLayout ? ArkLayout.sanitize(layoutDraft) : layoutDraft) !== layoutSaved; }
  var componentsDraft = window.ArkComponents ? ArkComponents.get() : { version: 1, masters: {}, routes: {} };
  var componentsSaved = window.ArkComponents ? JSON.stringify(ArkComponents.sanitize(componentsDraft)) : JSON.stringify(componentsDraft);
  function componentsDirty() { return JSON.stringify(window.ArkComponents ? ArkComponents.sanitize(componentsDraft) : componentsDraft) !== componentsSaved; }
  var statesDraft = window.ArkStates ? ArkStates.get() : { version: 1, routes: {} };
  var statesSaved = window.ArkStates ? JSON.stringify(ArkStates.sanitize(statesDraft)) : JSON.stringify(statesDraft);
  function statesDirty() { return JSON.stringify(window.ArkStates ? ArkStates.sanitize(statesDraft) : statesDraft) !== statesSaved; }
  /* Canvas-only mode's background transition (Part G, follow-up plan) -- a single
     site-wide settings file, same draft/saved/dirty shape as layout/components/states
     above. Its editing UI is the canvas-transitions popover on the header's Background
     segment (#designBackgroundBtn), previewed on the canvas, but the actual persistence still goes through this exact
     draft-replace-then-save-on-next-Save-click pipeline: applyStudioCanvasTransitionsReplace
     keeps this in sync with every field edit Studio relays up, and saveEverything() (Step 5,
     flickering-juggling-donut.md -- superseded the old saveStudioChanges()) writes it the
     same way it writes states/components/layout. */
  var canvasTransitionsDraft = window.ArkCanvasTransitions ? ArkCanvasTransitions.get() : { version: 1, effect: 'fade', outDuration: 220, inDuration: 260, easing: 'ease' };
  var canvasTransitionsSaved = window.ArkCanvasTransitions ? JSON.stringify(ArkCanvasTransitions.sanitize(canvasTransitionsDraft)) : JSON.stringify(canvasTransitionsDraft);
  function canvasTransitionsDirty() { return JSON.stringify(window.ArkCanvasTransitions ? ArkCanvasTransitions.sanitize(canvasTransitionsDraft) : canvasTransitionsDraft) !== canvasTransitionsSaved; }
  /* Animation-only mode's per-element animation overrides (Part H, follow-up plan) --
     same draft/saved/dirty shape as canvasTransitionsDraft above, addressed per route+
     key instead of one flat object. Its editing UI is the element-motion section of Studio's
     #selToolbar (merged into this file from the deleted admin-studio.html), same not-a-separate-Design-tab-trip shape
     canvasTransitionsDraft's own comment describes, and persistence goes through this
     exact draft-replace-then-save-on-next-Save-click pipeline. */
  var elementMotionDraft = window.ArkElementMotion ? ArkElementMotion.get() : { version: 1, routes: {} };
  var elementMotionSaved = window.ArkElementMotion ? JSON.stringify(ArkElementMotion.sanitize(elementMotionDraft)) : JSON.stringify(elementMotionDraft);
  function elementMotionDirty() { return JSON.stringify(window.ArkElementMotion ? ArkElementMotion.sanitize(elementMotionDraft) : elementMotionDraft) !== elementMotionSaved; }
  if (window.ArkMeshSettings) ArkMeshSettings.pages().forEach(function (p) { state.shapeIds.push(p.id); state.shapeLabels[p.id] = p.label; });
  /* Shape pages are keyed by the catalog module id (zero, proximity, lab, about, concept), not
     the manifest id: 'home' the manifest is 'zero' the shape page; 'about' and 'concept' happen
     to already match. Pages with no manifest at all (proximity, lab -- the Demo/Lab pages) have
     no other editor, so they keep a shape entry of their own instead of being orphaned. */
  function shapePageId(manifestId) { return manifestId === 'home' ? 'zero' : manifestId; }
  function hasShape(manifestId) { return state.shapeIds.indexOf(shapePageId(manifestId)) >= 0; }
  function orphanShapeIds() {
    var mapped = state.ids.map(shapePageId);
    return state.shapeIds.filter(function (id) { return mapped.indexOf(id) < 0; });
  }
  state.ids.forEach(function (id) {
    var manifest = ArkManifest.get(id);
    state.drafts[id] = clone(manifest); state.saved[id] = JSON.stringify(manifest);
  });
  state.current = state.ids[0];
  state.assetIds.forEach(function (id) {
    var asset = ArkAsset.get(id);
    state.assetDrafts[id] = clone(asset); state.assetSaved[id] = JSON.stringify(asset);
  });
  state.secretIds.forEach(function (id) {
    var secret = ArkSecret.get(id);
    state.secretDrafts[id] = clone(secret); state.secretSaved[id] = JSON.stringify(secret);
  });

  /* Step 3: which top-level mode a given state.kind belongs to. 'studio' (the visual canvas)
     and 'design' (theme/settings-defaults) are Design mode's two sub-views; 'mesh' belongs to
     NEITHER mode -- it is a persistent header-level action (publish/deploy status), never
     editing, so visiting it must never change state.mode or state.contentKind/designKind.
     Every other kind is Content mode. */
  function kindMode(kind) { return kind === 'studio' || kind === 'design' ? 'design' : kind === 'mesh' ? null : 'content'; }
  /* Keeps state.mode and the contentKind/designKind "what to land on when this mode is
     re-entered" memory in sync with whatever state.kind actually is. Called from the top of
     renderList() -- which every select()/selectArticle()/selectDesign()/selectStudio()/
     setMode()/revert*()/delete*() call site already calls whenever state.kind changes -- so
     this one spot covers all of them without touching any of those existing functions, and
     runs before the nav re-renders so the mode switch and sub-switch below reflect the kind
     that was just set, not the previous render's mode. 'mesh' updates neither (see
     kindMode()): pressing Mesh must not silently change which mode you were in. */
  function syncMode() {
    var modeNow = kindMode(state.kind);
    if (modeNow === 'content') state.contentKind = state.kind;
    else if (modeNow === 'design') state.designKind = state.kind;
    if (modeNow) state.mode = modeNow;
  }

  function dirty(id) { return state.saved[id] === null || JSON.stringify(state.drafts[id]) !== state.saved[id] || (hasShape(id) && reliefDirty()); }
  function dirtyA(slug) { return state.aSaved[slug] === null || JSON.stringify(state.aDrafts[slug]) !== state.aSaved[slug]; }
  function dirtyI(id) { return state.assetSaved[id] === null || JSON.stringify(state.assetDrafts[id]) !== state.assetSaved[id]; }
  function dirtyS(id) { return state.secretSaved[id] === null || JSON.stringify(state.secretDrafts[id]) !== state.secretSaved[id]; }
  /* Step 5 (flickering-juggling-donut.md): currentDirty()'s 'studio' branch had the exact
     same 3-missing-checks defect as anyDirty() below -- states/canvasTransitions/
     elementMotion each already have a real dirty-check function, just never OR'd in here --
     so a dirty state/canvas-transition/element-motion draft left currentDirty() (and the
     Revert button's enabled state, its only remaining reader) falsely reporting clean. */
  function currentDirty() { return state.kind === 'article' ? dirtyA(state.aCurrent) : state.kind === 'asset' ? dirtyI(state.assetCurrent) : state.kind === 'secret' ? dirtyS(state.secretCurrent) : state.kind === 'design' ? (themeDirty() || settingsDefaultsDirty()) : state.kind === 'studio' ? (layoutDirty() || componentsDirty() || statesDirty() || canvasTransitionsDirty() || elementMotionDirty()) : state.kind === 'mesh' || state.kind === 'seo' ? false : dirty(state.current) || seoDirty(); }
  /* Step 5: anyDirty() backed the Publish gate and the beforeunload warning on all 13 real
     drafts except these 3 -- states/canvasTransitions/elementMotion each already have their
     own real dirty-check function (statesDirty()/canvasTransitionsDirty()/
     elementMotionDirty(), all defined above), just never OR'd in here. A dirty Studio
     states/canvas-transition/element-motion draft could be silently lost on Publish or on
     closing the tab. Fixed by adding the 3 missing checks, not by changing what any of them mean.
     The single-object drafts now come from ArkAdminStore.drafts('single') (js/admin/store.js),
     the same list Save and Publish use, so this cannot miss a draft a fourth time. */
  function anyDirty() { return state.ids.some(dirty) || state.slugs.some(dirtyA) || state.assetIds.some(dirtyI) || state.secretIds.some(dirtyS) || ArkAdminStore.drafts('single').some(function (d) { return singleDraftHandle(d.key).dirty(); }) || restoreRemovalsPending() || restoreReorderPending(); }

  var statusTimer = 0;
  function status(message, tone) {
    var el = $('status'); el.textContent = message || ''; el.dataset.tone = tone || '';
    window.clearTimeout(statusTimer);
    el.title = message || '';
    if (message && tone === 'ok') statusTimer = window.setTimeout(function () { el.textContent = ''; }, 6000);
  }

  /* ---- route choices, from the site's own catalog ------------------- */
  function routeOptions() {
    return Object.keys(ArkUI.pageCatalog).map(function (key) {
      var def = ArkUI.pageCatalog[key];
      return { key: key, label: def.title.replace(' — Flux Protocol', '') + '  ' + def.path };
    });
  }

  /* ---- reference-doc choices, from the generated allow-list ---------- */
  function docOptions() {
    return (ArkUI.referenceDocs || []).map(function (doc) { return { key: doc, label: doc }; });
  }

  /* ---- a 'link' field's tagged value, taken apart for the picker ----- */
  function parseLinkValue(value) {
    var m = /^(route|doc|url):([\s\S]*)$/.exec(value || '');
    return m ? { type: m[1], rest: m[2] } : { type: 'route', rest: '' };
  }

  /* The picker for a field of kind 'link' (js/content/manifest.js), modeled
     on the existing manifest.meta.next route picker (selectEl + routeOptions
     above): a type toggle, then the one control that type needs, always
     writing back the tagged string a 'link' field's value must be. `onchange`
     receives the new tagged value; callers choose where it goes (a manifest
     field's .value, or a LearningContent article's own string property), so
     this one renderer serves both admin.js call sites. */
  function linkPickerEl(labelText, keyHint, value, onchange) {
    var parsed = parseLinkValue(value);
    var typeId = 'lp-type-' + keyHint, valueId = 'lp-value-' + keyHint;
    var body = h('div', { class: 'field-link-value' });
    function renderValue() {
      body.textContent = '';
      if (parsed.type === 'route') {
        var routeSelect = h('select', { id: valueId });
        routeOptions().forEach(function (o) { routeSelect.appendChild(h('option', { value: o.key, text: o.label })); });
        routeSelect.value = parsed.rest;
        routeSelect.addEventListener('change', function () { parsed.rest = routeSelect.value; onchange('route:' + parsed.rest); touch(); });
        body.appendChild(routeSelect);
      } else if (parsed.type === 'doc') {
        var docSelect = h('select', { id: valueId });
        docOptions().forEach(function (o) { docSelect.appendChild(h('option', { value: o.key, text: o.label })); });
        docSelect.value = parsed.rest;
        docSelect.addEventListener('change', function () { parsed.rest = docSelect.value; onchange('doc:' + parsed.rest); touch(); });
        body.appendChild(docSelect);
      } else {
        var input = h('input', { id: valueId, type: 'url', value: parsed.rest });
        input.addEventListener('input', function () { parsed.rest = input.value; onchange('url:' + parsed.rest); touch(); });
        body.appendChild(input);
      }
    }
    var typeSelect = h('select', { id: typeId },
      h('option', { value: 'route', text: 'Internal page' }),
      h('option', { value: 'doc', text: 'Reference doc' }),
      h('option', { value: 'url', text: 'External URL' }));
    typeSelect.value = parsed.type;
    typeSelect.addEventListener('change', function () {
      parsed = { type: typeSelect.value, rest: '' };
      renderValue(); onchange(parsed.type + ':'); touch();
    });
    renderValue();
    var label = h('label', { for: typeId }, h('span', { text: labelText }));
    return h('div', { class: 'field field-link' }, label, typeSelect, body);
  }

  /* false until the Studio block's `let view`/popover state exist (syncHeader reads them) */
  var headerReady = false;
  /* ---- page list ---------------------------------------------------- */
  function renderList() {
    syncMode();
    var meshNav = $('meshNav');
    if (meshNav) meshNav.setAttribute('aria-current', String(state.kind === 'mesh'));

    /* Step 3: the top-level Content/Design switch, and (only while mode === 'design')
       Design's own canvas/theme sub-switch -- folding the old separate designNav/studioNav
       nav buttons into one mode with an in-mode choice, per the plan's end state. The dirty
       dot carries over unchanged from the old designNav button (themeDirty()||
       settingsDefaultsDirty() only) -- the Studio/canvas side's own dirty tracking
       (layout/components/states/canvas-transitions/element-motion) is Step 5's job, not
       this one's, so this deliberately does not grow a new dot for it. */
    var modeContentBtn = $('modeContentBtn'), modeDesignBtn = $('modeDesignBtn');
    if (modeContentBtn) modeContentBtn.setAttribute('aria-selected', String(state.mode === 'content'));
    if (modeDesignBtn) {
      modeDesignBtn.setAttribute('aria-selected', String(state.mode === 'design'));
      modeDesignBtn.querySelector('.dot') && modeDesignBtn.querySelector('.dot').remove();
      if (themeDirty() || settingsDefaultsDirty()) modeDesignBtn.appendChild(h('span', { class: 'dot', title: 'Unsaved global design changes' }));
    }
    var designSubSwitch = $('designSubSwitch');
    if (designSubSwitch) designSubSwitch.hidden = state.mode !== 'design';
    var designThemeBtn = $('designThemeBtn');
    if (designThemeBtn) {
      designThemeBtn.querySelector('.dot') && designThemeBtn.querySelector('.dot').remove();
      if (themeDirty() || settingsDefaultsDirty()) designThemeBtn.appendChild(h('span', { class: 'dot', title: 'Unsaved global design changes' }));
    }
    /* which Design view is pressed, and the canvas-only header groups: syncHeader() (Studio
       block below, next to the `view` it reads) */
    syncHeader(); refreshSaveButton();
    /* Content mode's own item list (pages/articles/images/secrets/shapes) and its "New X"
       forms are irrelevant while Design mode is active -- hide the whole wrapper rather than
       leave an empty, confusing sidebar. The Mesh status disclosure (a sibling of #contentNav,
       untouched here) stays visible regardless of mode. */
    var contentNav = $('contentNav');
    if (contentNav) contentNav.hidden = state.mode !== 'content';

    var list = $('pageList'); list.textContent = '';
    /* Step 3: this whole item list (previously built unconditionally regardless of nav
       selection) is Content mode's own output -- gated here, not just hidden by CSS on
       #contentNav above, so Design mode never even builds it. */
    if (state.mode === 'content') {
      ArkManifest.groups.forEach(function (group) {
        var ids = state.ids.filter(function (id) { return state.drafts[id].group === group; });
        if (!ids.length) return;
        list.appendChild(h('li', { class: 'side-group', 'data-icon': 'page', text: GROUP_NAMES[group] }));
        ids.forEach(function (id) {
          var button = h('button', { type: 'button', 'aria-current': String(state.kind === 'page' && id === state.current), 'data-id': id, onclick: function () { select(id); } },
            h('span', { text: state.drafts[id].title }), dirty(id) ? h('span', { class: 'dot', title: hasShape(id) ? 'Unsaved changes, including its images or shared shape tuning' : 'Unsaved changes' }) : null);
          list.appendChild(h('li', {}, button));
        });
      });
      if (state.slugs.length) list.appendChild(h('li', { class: 'side-group', 'data-icon': 'article', text: 'Articles' }));
      state.slugs.forEach(function (slug) {
        var button = h('button', { type: 'button', 'aria-current': String(state.kind === 'article' && slug === state.aCurrent), 'data-slug': slug, onclick: function () { selectArticle(slug); } },
          h('span', { text: state.aDrafts[slug].title || slug }), dirtyA(slug) ? h('span', { class: 'dot', title: 'Unsaved changes' }) : null);
        list.appendChild(h('li', {}, button));
      });
      if (state.assetIds.length) list.appendChild(h('li', { class: 'side-group', 'data-icon': 'image', text: 'Images' }));
      state.assetIds.forEach(function (id) {
        var button = h('button', { type: 'button', 'aria-current': String(state.kind === 'asset' && id === state.assetCurrent), 'data-asset': id, onclick: function () { selectAsset(id); } },
          h('span', { text: state.assetDrafts[id].label || id }), dirtyI(id) ? h('span', { class: 'dot', title: 'Unsaved changes' }) : null);
        list.appendChild(h('li', {}, button));
      });
      if (state.secretIds.length) list.appendChild(h('li', { class: 'side-group', 'data-icon': 'lock', text: 'Encrypted' }));
      state.secretIds.forEach(function (id) {
        var button = h('button', { type: 'button', 'aria-current': String(state.kind === 'secret' && id === state.secretCurrent), 'data-secret': id, onclick: function () { selectSecret(id); } },
          h('span', { text: state.secretDrafts[id].label || id }), dirtyS(id) ? h('span', { class: 'dot', title: 'Unsaved changes' }) : null);
        list.appendChild(h('li', {}, button));
      });
      var orphans = window.ArkMeshSettings ? orphanShapeIds() : [];
      if (orphans.length) list.appendChild(h('li', { class: 'side-group', 'data-icon': 'shape', text: 'Shapes' }));
      orphans.forEach(function (id) {
        var button = h('button', { type: 'button', 'aria-current': String(state.kind === 'shape' && id === state.shapeCurrent), 'data-shape': id, onclick: function () { selectShape(id); } },
          h('span', { text: state.shapeLabels[id] || id }), reliefDirty() ? h('span', { class: 'dot', title: 'Tuning or this page’s images have unsaved changes' }) : null);
        list.appendChild(h('li', {}, button));
      });
    }
  }

  function select(id) { state.kind = 'page'; state.current = id; renderList(); renderEditor(); reloadPreview(); }

  function selectArticle(slug) { state.kind = 'article'; state.aCurrent = slug; renderList(); renderEditor(); reloadPreview(); }

  function selectAsset(id) { state.kind = 'asset'; state.assetCurrent = id; renderList(); renderEditor(); reloadPreview(); }

  function selectSecret(id) { state.kind = 'secret'; state.secretCurrent = id; renderList(); renderEditor(); reloadPreview(); }

  function selectShape(id) { state.kind = 'shape'; state.shapeCurrent = id; renderList(); renderEditor(); reloadPreview(); }

  function selectMesh() { state.kind = 'mesh'; renderList(); renderEditor(); reloadPreview(); }

  /* Step 3: the one entry point for the top-level mode switch. Nothing is torn down --
     state.current/aCurrent/assetCurrent/secretCurrent/shapeCurrent and every draft stay
     exactly as they are; only state.kind changes, to whichever kind that mode's own
     contentKind/designKind last remembered (syncMode(), called from the top of renderList(),
     keeps those two fields current on every render -- see kindMode() above). This is why an
     unsaved edit in one mode is still there, and still dirty, after switching to the other
     mode and back. */
  function setMode(mode) {
    if (mode === state.mode) return;
    state.kind = mode === 'design' ? (state.designKind || 'studio') : (state.contentKind || 'page');
    renderList(); renderEditor(); reloadPreview();
  }
  if ($('modeContentBtn')) $('modeContentBtn').addEventListener('click', function () { setMode('content'); });
  if ($('modeDesignBtn')) $('modeDesignBtn').addEventListener('click', function () { setMode('design'); });
  /* Design's sub-views (#designSubSwitch) are wired in the Studio block below, next to
     setView(), the canvas/sitemap switch they drive. */
  /* The persistent header's real height, published once as --app-bar-h on <html>. #studioRoot
     (css/studio-embed.css) docks below it and sizes its 100vh-based panels by it, so the mode
     switch above stays reachable at EVERY width: below 1280px the one header wraps (89px at
     760px, 169px at 390px; one 52px row from 1280px -- measured in Chromium 2026-10-18,
     tests/browser/header-reach.mjs), and the old hardcoded 58px offset once left Studio
     painted over the switch. Observed, not computed once, because the wrap changes with
     width, fonts, and which canvas controls are showing. */
  (function trackAppBarHeight() {
    var bar = document.querySelector('body > header.bar');
    if (!bar || typeof ResizeObserver !== 'function') return;
    function publish() { document.documentElement.style.setProperty('--app-bar-h', bar.getBoundingClientRect().height + 'px'); }
    new ResizeObserver(publish).observe(bar, { box: 'border-box' });
    publish();
  })();

  /* ---- editor ------------------------------------------------------- */
  function sections(fields) {
    var order = [], by = {};
    Object.keys(fields).forEach(function (role) {
      var name = fields[role].section || 'Fields';
      if (!by[name]) { by[name] = []; order.push(name); }
      by[name].push(role);
    });
    return order.map(function (name) { return { name: name, roles: by[name] }; });
  }

  function fieldEl(manifest, role) {
    var field = manifest.fields[role], id = 'f-' + manifest.id + '-' + role.replace(/\./g, '-');
    if (field.kind === 'link') {
      var picker = linkPickerEl(field.label, id, field.value, function (v) { field.value = v; });
      picker.querySelector('label').appendChild(h('span', { class: 'field-key', text: manifest.id.toUpperCase() + '.' + role }));
      return picker;
    }
    var control = field.kind === 'text'
      ? h('textarea', { id: id, rows: 3, spellcheck: true })
      : h('input', { id: id, type: 'text', spellcheck: true });
    control.value = field.value;
    var wrap = h('div', { class: 'field' + (field.value ? '' : ' empty') },
      h('label', { for: id }, h('span', { text: field.label }), h('span', { class: 'field-key', text: manifest.id.toUpperCase() + '.' + role })),
      control);
    var count = field.kind === 'text' ? h('div', { class: 'count', text: field.value.length + ' characters' }) : null;
    if (count) wrap.appendChild(count);
    control.addEventListener('input', function () {
      field.value = control.value;
      wrap.classList.toggle('empty', !control.value);
      if (count) count.textContent = control.value.length + ' characters';
      touch();
    });
    return wrap;
  }

  function selectEl(labelText, value, options, onchange) {
    var id = 'm-' + labelText.replace(/\W+/g, '-').toLowerCase();
    var select = h('select', { id: id });
    options.forEach(function (o) { select.appendChild(h('option', { value: o.key, text: o.label })); });
    select.value = value;
    select.addEventListener('change', function () { onchange(select.value); touch(); });
    return h('div', { class: 'field' }, h('label', { for: id, text: labelText }), select);
  }

  function addPoint(manifest) {
    var n = ArkManifest.points(manifest) + 1, entries = Object.entries(manifest.fields), last = -1;
    entries.forEach(function (entry, i) { if (/^POINT\d+\./.test(entry[0])) last = i; });
    entries.splice(last + 1, 0,
      ['POINT' + n + '.TITLE', { label: 'Heading', kind: 'line', section: 'Point ' + n, value: 'New point.' }],
      ['POINT' + n + '.TEXT', { label: 'Text', kind: 'text', section: 'Point ' + n, value: 'Explain the point.' }]);
    manifest.fields = Object.fromEntries(entries);
  }
  function removePoint(manifest) {
    var n = ArkManifest.points(manifest);
    if (n <= 1) return;
    delete manifest.fields['POINT' + n + '.TITLE']; delete manifest.fields['POINT' + n + '.TEXT'];
  }

  function renderEditor() {
    /* Step 2 merge: Studio used to be a second document (an <iframe src="admin-studio.html">
       swapped into #editor), toggled by a '.studio-open' class on #cmsShell that hid the
       Content-CMS preview aside/padded #editor around the iframe. Studio is now inline
       markup in THIS document (#studioRoot, in admin-app.html, hidden by default) -- so
       entering/leaving 'studio' is just toggling which of the two top-level containers is
       hidden, same idea, no iframe to create or destroy. */
    var studio = state.kind === 'studio';
    if ($('cmsShell')) $('cmsShell').hidden = studio;
    if ($('studioRoot')) $('studioRoot').hidden = !studio;
    if (studio) { renderStudioEditor(); return; }
    if (state.kind === 'article') { renderArticleEditor(); return; }
    if (state.kind === 'asset') { renderAssetEditor(); return; }
    if (state.kind === 'secret') { renderSecretEditor(); return; }
    if (state.kind === 'shape') { renderShapeEditor(); return; }
    if (state.kind === 'mesh') { renderMeshEditor(); return; }
    if (state.kind === 'design') { renderDesignEditor(); return; }
    var root = $('editor'); root.textContent = '';
    var id = state.current, manifest = state.drafts[id];
    if (!manifest) { root.appendChild(h('p', { class: 'empty-state', text: 'Pick a page on the left.' })); return; }
    var revert = h('button', { id: 'revert', type: 'button', class: 'btn', text: 'Revert', onclick: revertCurrent });
    root.appendChild(h('div', { class: 'editor-head' },
      h('div', {}, h('h1', { text: manifest.title }), h('div', { class: 'route', text: manifest.route + '  ·  js/content/manifests/' + manifest.id + '.js' })),
      h('div', { class: 'editor-actions' }, revert)));

    var contentPanel = h('div', { class: 'editor-tab-flow' });
    if (manifest.meta.next || manifest.meta.placement) {
      var where = h('fieldset', {}, h('legend', { text: 'Where it goes' }));
      if (manifest.meta.placement) where.appendChild(selectEl('Shown on the theory page as', manifest.meta.placement,
        [{ key: 'row', label: 'A numbered row' }, { key: 'rail', label: 'A link beside the page' }], function (v) { manifest.meta.placement = v; }));
      if (manifest.meta.next) where.appendChild(selectEl('The onward link opens', manifest.meta.next, routeOptions(), function (v) { manifest.meta.next = v; }));
      contentPanel.appendChild(where);
    }
    sections(manifest.fields).forEach(function (section) {
      var set = h('fieldset', {}, h('legend', { text: section.name }));
      section.roles.forEach(function (role) { set.appendChild(fieldEl(manifest, role)); });
      contentPanel.appendChild(set);
    });
    if (manifest.fields['POINT1.TITLE']) {
      contentPanel.appendChild(h('div', { class: 'tools' },
        h('button', { type: 'button', class: 'btn', text: 'Add a point', onclick: function () { addPoint(manifest); touch(); renderEditor(); } }),
        h('button', { type: 'button', class: 'btn', text: 'Remove the last point', disabled: ArkManifest.points(manifest) <= 1, onclick: function () { removePoint(manifest); touch(); renderEditor(); } })));
    }
    var tabItems = [{ id: 'content', label: 'Content', content: contentPanel }];
    if (window.ArkMeshSettings && hasShape(id)) {
      var spid = shapePageId(id);
      var shapePanel = h('div', { class: 'editor-tab-flow' }, buildShapePickers(spid), buildPlacementPanel(spid));
      tabItems.push({ id: 'shape', label: 'Shape', content: shapePanel });
    }
    tabItems.push({ id: 'seo', label: 'SEO', content: h('div', { class: 'editor-tab-flow' }, buildPageSeoPanel(id, manifest.title)) });
    tabItems.push({ id: 'code', label: 'Code', content: buildCodePanel(id, manifest) });
    root.appendChild(ArkAdminPrimitives.tabs({ label: manifest.title + ' editor sections', items: tabItems, value: 'content', className: 'ark-tabs page-editor-tabs' }));
    if (manifest.group === 'theory') {
      root.appendChild(h('div', { class: 'danger-zone' },
        h('button', { type: 'button', class: 'btn danger', text: 'Delete this page', onclick: deleteCurrent })));
    }
    touch();
  }

  /* THE Save button: one, in the header (#save), for every mode -- the per-editor Save buttons
     and Studio's own "Save DEFXN" were duplicates of it (owner, 2026-10-18: one merged CMS). It
     calls saveEverything() (every dirty draft, not just what is on screen), so it enables
     whenever ANY of the drafts is dirty -- a dirty theme while looking at a clean page must not
     leave the one save action looking disabled. */
  function refreshSaveButton() { refuse($('save'), anyDirty() ? '' : NOTHING_TO_SAVE); }
  $('save').addEventListener('click', function () { saveEverything(); });

  /* update everything that depends on "is it dirty" without rebuilding the form */
  function touch() {
    var article = state.kind === 'article', asset = state.kind === 'asset', secret = state.kind === 'secret', now = currentDirty();
    var revert = $('revert');
    /* Revert stays scoped to the current section (it only ever reverts what is on screen), so
       it uses currentDirty(); the header's one Save covers every draft (refreshSaveButton). */
    refreshSaveButton();
    var neverSaved = (state.kind === 'design' ? themeSaved : article ? state.aSaved[state.aCurrent] : asset ? state.assetSaved[state.assetCurrent] : secret ? state.secretSaved[state.secretCurrent] : state.saved[state.current]) === null;
    refuse(revert, neverSaved ? 'Not saved yet: there is no saved version to revert to.' : now ? '' : 'Nothing to revert: this matches its saved copy.');
    if (state.kind === 'design') { renderList(); return; }
    var selector = article ? '.page-list button[data-slug="' + state.aCurrent + '"]' : asset ? '.page-list button[data-asset="' + state.assetCurrent + '"]' : secret ? '.page-list button[data-secret="' + state.secretCurrent + '"]' : '.page-list button[data-id="' + state.current + '"]';
    var button = document.querySelector(selector);
    if (button) {
      var dot = button.querySelector('.dot');
      if (now && !dot) button.appendChild(h('span', { class: 'dot', title: 'Unsaved changes' }));
      if (!now && dot) dot.remove();
    }
    notifyPreviewState();
  }

  function revertCurrent() {
    if (state.kind === 'article') { revertArticle(); return; }
    if (state.kind === 'asset') { revertAsset(); return; }
    if (state.kind === 'secret') { revertSecret(); return; }
    if (state.kind === 'design') { revertDesign(); return; }
    var id = state.current;
    if (window.ArkMeshSettings) meshDraft = ArkMeshSettings.get() || ArkMeshSettings.defaults();
    if (window.ArkTheme) themeDraft = ArkTheme.get() || ArkTheme.defaults();
    if (window.ArkSiteDefaults) settingsDefaultsDraft = ArkSiteDefaults.get() || ArkSiteDefaults.defaults();
    if (window.ArkSEO) seoDraft = ArkSEO.get() || ArkSEO.defaults();
    if (state.saved[id] === null) return;
    state.drafts[id] = JSON.parse(state.saved[id]); renderEditor(); renderList(); status('Reverted to the saved version.', '');
  }

  /* ---- saving ------------------------------------------------------- */
  function download(name, text) {
    var url = URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
    var a = h('a', { href: url, download: name }); document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  /* Step 5 (flickering-juggling-donut.md), the "one save model": saveEverything() replaces
     BOTH the old saveCurrent() (a per-state.kind dispatcher that only ever saved whichever
     ONE draft happened to be on screen -- and had no branch at all for Studio's drafts, so
     Ctrl+S while editing the canvas fell through to this function's generic page-save path
     using a stale state.current id, silently doing the wrong thing) AND the old
     saveStudioChanges() (which already covered pages/articles/seo/layout/components/states/
     canvas-transitions/element-motion in one pass, but wrapped the whole batch in a SINGLE
     try/catch -- one draft's validation error aborted every draft after it in the list,
     unsaved and unreported, collapsed into one generic error message).
     Every one of the 13 real drafts (manifests, articles, assets, secrets, mesh/shape
     settings, theme, site-wide settings-defaults, SEO, layout, components, states,
     canvas-transitions, element-motion) is checked and saved independently here: a thrown
     error for one draft is caught right where it happens, recorded against that draft by
     name, and never stops any of the others from being attempted and reported on their own
     merits. This is the ONE function every save calls -- the header's one Save button
     (#save, refreshSaveButton(); the per-section Save buttons and Studio's own second Save
     were folded into it), Ctrl/Cmd+S here, and Ctrl/Cmd+S forwarded from the canvas -- so
     no entry point can under-save relative to another, and Ctrl+S always does the right
     thing regardless of which mode/kind is active. */

  /* THE SINGLE-OBJECT DRAFTS, as this editor holds them. Which drafts exist is decided by ONE
     list, ArkAdminStore.drafts() in js/admin/store.js; this only says how the editor reaches
     each one: draft() the live draft, set(v) replaces it (a version restore), saved() its saved
     JSON text, dirty(), save(). saveEverything(), anyDirty() and siteFromState() (what Publish
     sends) iterate that list and come here, so Save and Publish cannot disagree again -- they
     once did: Save wrote 13 drafts and the published archive carried 8. A draft listed in
     store.js with no handles here throws, naming it, instead of being silently dropped. */
  function singleDraftHandle(key) {
    var handles = {
      meshSettings: { draft: function () { return meshDraft; }, set: function (v) { meshDraft = v; }, saved: function () { return meshSaved; }, dirty: reliefDirty, save: function () { return saveMeshDraft(null); } },
      theme: { draft: function () { return themeDraft; }, set: function (v) { themeDraft = v; }, saved: function () { return themeSaved; }, dirty: themeDirty, save: function () { return saveThemeDraft(null); } },
      settingsDefaults: { draft: function () { return settingsDefaultsDraft; }, set: function (v) { settingsDefaultsDraft = v; }, saved: function () { return settingsDefaultsSaved; }, dirty: settingsDefaultsDirty, save: function () { return saveSettingsDefaultsDraft(null); } },
      seo: { draft: function () { return seoDraft; }, set: function (v) { seoDraft = v; }, saved: function () { return seoSaved; }, dirty: seoDirty, save: function () { return saveSeoDraft(null); } },
      layout: { draft: function () { return layoutDraft; }, set: function (v) { layoutDraft = v; }, saved: function () { return layoutSaved; }, dirty: layoutDirty, save: async function () {
        if (state.cdirs) await ArkAdminStore.saveLayout(state.cdirs.content, layoutDraft);
        else download('layout-data.js', ArkLayout.serialize(layoutDraft));
        layoutDraft = ArkLayout.sanitize(layoutDraft); layoutSaved = JSON.stringify(layoutDraft); ArkLayout.define(layoutDraft);
      } },
      components: { draft: function () { return componentsDraft; }, set: function (v) { componentsDraft = v; }, saved: function () { return componentsSaved; }, dirty: componentsDirty, save: async function () {
        if (state.cdirs) await ArkAdminStore.saveComponents(state.cdirs.content, componentsDraft);
        else download('components-data.js', ArkComponents.serialize(componentsDraft));
        componentsDraft = ArkComponents.sanitize(componentsDraft); componentsSaved = JSON.stringify(componentsDraft); ArkComponents.define(componentsDraft);
      } },
      states: { draft: function () { return statesDraft; }, set: function (v) { statesDraft = v; }, saved: function () { return statesSaved; }, dirty: statesDirty, save: async function () {
        if (state.cdirs) await ArkAdminStore.saveStates(state.cdirs.content, statesDraft);
        else download('states-data.js', ArkStates.serialize(statesDraft));
        statesDraft = ArkStates.sanitize(statesDraft); statesSaved = JSON.stringify(statesDraft); ArkStates.define(statesDraft);
      } },
      canvasTransitions: { draft: function () { return canvasTransitionsDraft; }, set: function (v) { canvasTransitionsDraft = v; }, saved: function () { return canvasTransitionsSaved; }, dirty: canvasTransitionsDirty, save: async function () {
        if (state.cdirs) await ArkAdminStore.saveCanvasTransitions(state.cdirs.content, canvasTransitionsDraft);
        else download('canvas-transitions-data.js', ArkCanvasTransitions.serialize(canvasTransitionsDraft));
        canvasTransitionsDraft = ArkCanvasTransitions.sanitize(canvasTransitionsDraft); canvasTransitionsSaved = JSON.stringify(canvasTransitionsDraft); ArkCanvasTransitions.define(canvasTransitionsDraft);
      } },
      elementMotion: { draft: function () { return elementMotionDraft; }, set: function (v) { elementMotionDraft = v; }, saved: function () { return elementMotionSaved; }, dirty: elementMotionDirty, save: async function () {
        if (state.cdirs) await ArkAdminStore.saveElementMotion(state.cdirs.content, elementMotionDraft);
        else download('element-motion-data.js', ArkElementMotion.serialize(elementMotionDraft));
        elementMotionDraft = ArkElementMotion.sanitize(elementMotionDraft); elementMotionSaved = JSON.stringify(elementMotionDraft); ArkElementMotion.define(elementMotionDraft);
      } }
    };
    if (!Object.prototype.hasOwnProperty.call(handles, key)) throw new Error('js/admin/store.js lists the "' + key + '" draft, but js/admin/admin.js has no editor handles for it (singleDraftHandle), so it could not be saved, published or versioned. Add its handles there.');
    return handles[key];
  }

  async function saveEverything() {
    var results = [];
    function record(label, ok, message) { results.push({ label: label, ok: ok, message: message }); }
    async function attempt(label, dirtyNow, run) {
      if (!dirtyNow) return;
      try { await run(); record(label, true); }
      catch (error) { record(label, false, error && error.message ? error.message : String(error)); }
    }

    // items a confirmed Restore said to remove (Versions panel) -- through removeItemFile(), the
    // same removal path Delete uses. FIRST, so the registries no longer hold them when the drafts
    // below are sanitized and written (SEO keeps one entry per page in ArkManifest, for one).
    await removeRestoredExtras(attempt);

    // pages (manifests) -- js/content/manifests/*.js
    var changedPages = state.ids.filter(dirty);
    for (var i = 0; i < changedPages.length; i++) {
      var pid = changedPages[i];
      await attempt('Page "' + pid + '"', true, async function (id) {
        var manifest = state.drafts[id], problems = ArkManifest.problems(manifest);
        if (problems.length) throw new Error(problems.join('; '));
        var isNew = state.saved[id] === null;
        if (state.dir) await ArkAdminStore.save(state.dir, manifest, state.ids);
        else { download(id + '.js', ArkManifest.serialize(manifest)); if (isNew) download('index.js', ArkAdminStore.indexText(state.ids)); }
        state.saved[id] = JSON.stringify(manifest); ArkManifest.define(clone(manifest));
      }.bind(null, pid));
    }

    // articles -- js/content/articles/*.js
    var changedArticles = state.slugs.filter(dirtyA);
    for (var j = 0; j < changedArticles.length; j++) {
      var aslug = changedArticles[j];
      await attempt('Article "' + aslug + '"', true, async function (slug) {
        var article = state.aDrafts[slug], problems = LearningContent.problems(article);
        if (problems.length) throw new Error(problems.join('; '));
        var list = articleList(article);
        if (state.cdirs) await ArkAdminStore.saveArticle(state.cdirs, article, list);
        else { download(slug + '.js', LearningContent.serializeBody(article)); download('article-index.js', LearningContent.serializeIndex(list)); }
        state.aSaved[slug] = JSON.stringify(articleCopy(article)); LearningContent.put(clone(article));
      }.bind(null, aslug));
    }

    // images -- js/content/assets/*.js
    var changedAssets = state.assetIds.filter(dirtyI);
    for (var k = 0; k < changedAssets.length; k++) {
      var assetId = changedAssets[k];
      await attempt('Image "' + assetId + '"', true, async function (id) {
        var asset = state.assetDrafts[id], problems = ArkAsset.problems(asset);
        if (problems.length) throw new Error(problems.join('; '));
        var isNew = state.assetSaved[id] === null;
        if (state.assetDir) await ArkAdminStore.saveAsset(state.assetDir, asset, state.assetIds);
        else { download(id + '.js', ArkAsset.serialize(asset)); if (isNew) download('index.js', ArkAdminStore.indexTextAssets(state.assetIds)); }
        state.assetSaved[id] = JSON.stringify(asset); ArkAsset.define(clone(asset));
      }.bind(null, assetId));
    }

    // encrypted items -- js/content/secrets/*.js
    var changedSecrets = state.secretIds.filter(dirtyS);
    for (var m = 0; m < changedSecrets.length; m++) {
      var secretId = changedSecrets[m];
      await attempt('Secret "' + secretId + '"', true, async function (id) {
        var secret = state.secretDrafts[id], problems = ArkSecret.problems(secret);
        if (problems.length) throw new Error('encrypt the content first (' + problems.join('; ') + ')');
        var isNew = state.secretSaved[id] === null;
        if (state.secretDir) await ArkAdminStore.saveSecret(state.secretDir, secret, state.secretIds);
        else { download(id + '.js', ArkSecret.serialize(secret)); if (isNew) download('index.js', ArkAdminStore.indexTextSecrets(state.secretIds)); }
        state.secretSaved[id] = JSON.stringify(secret); ArkSecret.define(clone(secret));
      }.bind(null, secretId));
    }

    // a Restore that changed a list's order and nothing else in it: that list's index alone
    await writeRestoredOrder(attempt);
    // before the single drafts: SEO keys its per-page/per-article entries by these registries
    syncRegistryOrder();

    // every single-object draft -- js/content/<file>-data.js -- in the order js/admin/store.js
    // lists them, each through its own attempt(): mesh settings, theme, site-wide defaults, SEO,
    // layout, components, states, canvas transitions, element animation (singleDraftHandle()).
    var singles = ArkAdminStore.drafts('single');
    for (var n = 0; n < singles.length; n++) {
      var single = singles[n], handle;
      try { handle = singleDraftHandle(single.key); }
      catch (error) { record(single.label, false, error.message); continue; }
      await attempt(single.label, handle.dirty(), handle.save);
    }

    // sitemap.xml / robots.txt / llms.txt: derived from what is now saved (writeSearchFiles), and
    // named in the message only when one of them actually changed.
    try { var searchWritten = await writeSearchFiles(); if (searchWritten.length) record(searchWritten.join(', '), true); }
    catch (error) { record('sitemap.xml / robots.txt / llms.txt', false, error && error.message ? error.message : String(error)); }

    renderList(); touch(); reloadPreview();
    /* Keep Studio's own derived state (cmsSourceSite/cmsRoutes) and its own repaint in sync
       after ANY save, whichever mode it was pressed in -- siteFromState() folds in
       every draft this function just wrote, so Studio's canvas never shows stale content if
       the owner switches to it after saving from the Content side, or vice versa. */
    cmsSourceSite = siteFromState(); cmsRoutes = studioRoutes(); schedule();

    var succeeded = results.filter(function (r) { return r.ok; });
    var failed = results.filter(function (r) { return !r.ok; });
    var destination = (state.dir || state.cdirs || state.assetDir || state.secretDir) ? 'to the connected project' : '(downloaded)';
    var message;
    if (!results.length) message = 'Nothing to save: every draft already matches its saved copy.';
    else if (!failed.length) message = 'Saved ' + succeeded.length + ' item' + (succeeded.length === 1 ? '' : 's') + ' ' + destination + ': ' + succeeded.map(function (r) { return r.label; }).join(', ') + '.';
    else message = (succeeded.length ? 'Saved ' + succeeded.length + ' item' + (succeeded.length === 1 ? '' : 's') + ' ' + destination + ' (' + succeeded.map(function (r) { return r.label; }).join(', ') + '). ' : '') +
      failed.length + ' failed: ' + failed.map(function (r) { return r.label + ' (' + r.message + ')'; }).join('; ');
    /* Version history: what is now on disk becomes a version (js/admin/versions.js). */
    message += await recordVersion(succeeded.length);
    status(message, failed.length ? 'error' : (results.length ? 'ok' : ''));
    toast(message);
    return { succeeded: succeeded, failed: failed };
  }

  /* ONE removal path for a page / article / image / encrypted item. Delete (below) and a
     confirmed version Restore (removeRestoredExtras, in the version-history block) both remove
     through here, so the file, its index, the draft lists and the in-memory registry always
     leave together. `savedText` is the item's saved JSON when the caller has already taken it
     out of the lists (a restore's pending removal); otherwise the lists say whether a file exists.
     Each index is rewritten from the items that are SAVED, so it never names a file that is not
     there (an unsaved new item joins its index when it is saved). */
  var ITEM_KINDS = {
    page: { ids: 'ids', drafts: 'drafts', saved: 'saved', noun: 'Page', path: 'js/content/manifests/', dir: function () { return state.dir; },
            remove: function (id, rest) { return ArkAdminStore.remove(state.dir, id, rest); }, forget: function (id) { ArkManifest.remove(id); },
            /* rewrite only the index, in this order of saved ids (a restore that changed the order alone) */
            index: { file: 'js/content/manifests/index.js', write: function (ids) { return ArkAdminStore.writeIndex(state.dir, 'index.js', ArkAdminStore.indexText(ids)); } } },
    article: { ids: 'slugs', drafts: 'aDrafts', saved: 'aSaved', noun: 'Article', path: 'js/content/articles/', dir: function () { return state.cdirs; },
            remove: function (id, rest) { return ArkAdminStore.removeArticle(state.cdirs, id, rest.map(function (s) { return JSON.parse(state.aSaved[s]); })); }, forget: function (id) { LearningContent.remove(id); },
            index: { file: 'js/content/article-index.js', write: function (ids) { return ArkAdminStore.writeIndex(state.cdirs.content, 'article-index.js', LearningContent.serializeIndex(ids.map(function (s) { return JSON.parse(state.aSaved[s]); }))); } } },
    asset: { ids: 'assetIds', drafts: 'assetDrafts', saved: 'assetSaved', noun: 'Image', path: 'js/content/assets/', dir: function () { return state.assetDir; },
            remove: function (id, rest) { return ArkAdminStore.removeAsset(state.assetDir, id, rest); }, forget: function (id) { ArkAsset.remove(id); },
            index: { file: 'js/content/assets/index.js', write: function (ids) { return ArkAdminStore.writeIndex(state.assetDir, 'index.js', ArkAdminStore.indexTextAssets(ids)); } } },
    secret: { ids: 'secretIds', drafts: 'secretDrafts', saved: 'secretSaved', noun: 'Encrypted item', path: 'js/content/secrets/', dir: function () { return state.secretDir; },
            remove: function (id, rest) { return ArkAdminStore.removeSecret(state.secretDir, id, rest); },
            index: { file: 'js/content/secrets/index.js', write: function (ids) { return ArkAdminStore.writeIndex(state.secretDir, 'index.js', ArkAdminStore.indexTextSecrets(ids)); } },
            forget: function (id) { delete state.secretPlaintext[id]; delete state.secretRecipientsText[id]; delete state.secretDecrypted[id]; ArkSecret.remove(id); } }
  };
  async function removeItemFile(kind, id, savedText) {
    var k = ITEM_KINDS[kind];
    if (savedText != null || state[k.saved][id] != null) {
      if (!k.dir()) throw new Error(k.path + id + '.js was not removed. Missing: the connected project folder. To fix: connect it (Connect project folder) and Save again.');
      await k.remove(id, state[k.ids].filter(function (other) { return other !== id && state[k.saved][other] != null; }));
    }
    state[k.ids] = state[k.ids].filter(function (other) { return other !== id; });
    delete state[k.drafts][id]; delete state[k.saved][id]; k.forget(id);
  }
  /* The page and article registries (ArkManifest, LearningContent) in the editor's list order --
     the order the index files on disk have. A saved item joins its registry at the END
     (define()/put() append), so a page a Restore put back mid-list sat last in the registry, and
     everything keyed off the registry followed it: SEO's per-page map (ArkSEO.sanitize keys it by
     the registry) came out in a different key order, so the saved seo-data.js -- and the version's
     content address -- differed from the version being restored though no value did
     (regression: tests/browser/versions.mjs "Restore #8, Save"). */
  function syncRegistryOrder() {
    function rank(list) { var at = {}; list.forEach(function (id, i) { at[id] = i; }); return function (id) { return id in at ? at[id] : list.length; }; }
    var pageRank = rank(state.ids), pages = ArkManifest.all();
    var sorted = pages.slice().sort(function (a, b) { return pageRank(a.id) - pageRank(b.id); });
    if (sorted.some(function (p, i) { return p !== pages[i]; })) {
      pages.forEach(function (p) { ArkManifest.remove(p.id); });
      sorted.forEach(function (p) { ArkManifest.define(p); });
    }
    var articleRank = rank(state.slugs);
    if (window.LearningContent && Array.isArray(LearningContent.articles)) LearningContent.articles.sort(function (a, b) { return articleRank(a.slug) - articleRank(b.slug); });
  }
  /* What every Delete does once removeItemFile() has taken the file out: the derived root files
     follow at once (a deleted page leaves sitemap.xml/llms.txt now, not at the next Save), and the
     removal is recorded as its own version immediately, with the summary versions.js derives from
     the two snapshots ("manifests: -<id>"). Before 2026-10-18 nothing was recorded until the next
     Save, whose record then showed the removal mixed into unrelated edits, and a Delete followed
     by closing the tab left no version saying the file had gone. A pending Restore keeps its own
     claim (restoredFrom stays for the Save that writes it). -> a sentence for the status line. */
  async function afterDelete() {
    var note = '';
    try { var written = await writeSearchFiles(); if (written.length) note += ' Updated ' + written.join(', ') + '.'; }
    catch (error) { note += ' sitemap.xml/robots.txt/llms.txt were not updated (' + error.message + '); the next Save writes them.'; }
    return note + await recordVersion(1, { restoredFrom: '' });
  }
  /* A deleted page or article takes its entries in every other draft with it, in the same
     Delete: its SEO override (keyed by id) and whatever layout, states, components or element
     animation keyed by the route that went with it. Before this, the SEO draft still held the
     deleted page's entry, showed unsaved until the next Save, and the saved seo-data.js kept an
     orphan (regression: tests/delete-prunes-drafts.cjs). Which drafts key by page or route is
     ArkAdminStore.drafts()' byItem/byRoute, not a list here. The draft loses the entries; the
     SAVED copy is written without them only where it had them -- through the draft's own
     save(), with the draft swapped for the pruned saved value for that one write, so an
     unrelated unsaved edit in the same draft stays unsaved instead of being saved by a Delete.
     `routesBefore` is every route before the removal: a route is gone only when the site no
     longer has it. -> a sentence for the status line. */
  async function forgetDeleted(itemsKey, id, routesBefore) {
    var routesNow = studioRoutes().map(function (r) { return r.path; });
    var gone = { key: itemsKey, id: id, routes: routesBefore.filter(function (path) { return routesNow.indexOf(path) < 0; }) };
    var cleaned = [], failed = [];
    var singles = ArkAdminStore.drafts('single').filter(function (d) { return d.byItem || d.byRoute; });
    for (var i = 0; i < singles.length; i++) {
      var d = singles[i], handle = singleDraftHandle(d.key);
      if (!window[d.global]) continue;
      var draft = ArkAdminStore.forgetItem(d, handle.draft(), gone).value;
      var savedText = handle.saved(), saved = savedText ? ArkAdminStore.forgetItem(d, JSON.parse(savedText), gone) : { changed: false };
      if (saved.changed) {
        handle.set(saved.value);
        try { await handle.save(); cleaned.push(d.file + '-data.js'); }
        catch (error) { failed.push(d.file + '-data.js (' + (error && error.message ? error.message : error) + ')'); }
      }
      handle.set(draft);
    }
    return (cleaned.length ? ' Removed its entries from ' + cleaned.join(', ') + '.' : '') +
      (failed.length ? ' Its entries are still in ' + failed.join(', ') + '; the next Save removes them.' : '');
  }

  async function deleteCurrent() {
    if (state.kind === 'article') { await deleteArticle(); return; }
    if (state.kind === 'asset') { await deleteAsset(); return; }
    if (state.kind === 'secret') { await deleteSecret(); return; }
    var id = state.current, manifest = state.drafts[id];
    if (!state.dir && state.saved[id] !== null) { status('Connect the project folder to delete a page: this removes its file.', 'warn'); return; }
    if (!window.confirm('Delete "' + manifest.title + '"? This removes its file and its link on the theory page.')) return;
    var routesBefore = studioRoutes().map(function (r) { return r.path; });
    try { await removeItemFile('page', id); }
    catch (error) { status(error.message, 'error'); return; }
    var forgot = await forgetDeleted('manifests', id, routesBefore);
    state.current = state.ids[0]; renderList(); renderEditor(); reloadPreview(); status('Deleted ' + manifest.title + '.' + forgot + await afterDelete(), 'ok');
  }

  /* ---- articles ----------------------------------------------------- */
  function articleCopy(a) {
    var draft = { slug: a.slug, title: a.title, category: a.category, minutes: a.minutes, summary: a.summary, sections: clone(a.sections || []), numbers: !!a.numbers };
    ['relevance', 'reviewed', 'evidenceLabel', 'evidenceHref', 'relatedPage', 'actionLabel', 'actionPage'].forEach(function (key) { draft[key] = a[key] || ''; });
    if (a.core !== undefined) draft.core = a.core;
    if (a.questions !== undefined) draft.questions = clone(a.questions);
    return draft;
  }
  function adoptArticles() {
    state.slugs = LearningContent.articles.map(function (a) { return a.slug; });
    LearningContent.articles.forEach(function (a) { state.aDrafts[a.slug] = articleCopy(a); state.aSaved[a.slug] = JSON.stringify(articleCopy(a)); });
    state.aCurrent = state.slugs[0] || null;
  }
  /* article bodies load on demand on the site; the admin needs them all, so it loads them the same way */
  function loadBodies(done) {
    var pending = LearningContent.articles.filter(function (a) { return !a.sections; });
    if (!pending.length) { done(); return; }
    var left = pending.length;
    pending.forEach(function (a) {
      var script = document.createElement('script');
      script.src = 'js/content/articles/' + a.slug + '.js';
      script.onload = script.onerror = function () { left -= 1; if (left === 0) done(); };
      document.head.appendChild(script);
    });
  }

  function articleField(article, key, label, kind, fallback) {
    var id = 'a-' + article.slug + '-' + key;
    var control = kind === 'text' ? h('textarea', { id: id, rows: 3, spellcheck: true }) : h('input', { id: id, type: 'text', spellcheck: true });
    control.value = article[key] === undefined ? (fallback || '') : article[key];
    control.addEventListener('input', function () { article[key] = control.value; touch(); });
    return h('div', { class: 'field' }, h('label', { for: id }, h('span', { text: label })), control);
  }
  /* relatedPage/actionPage/evidenceHref are link data in spirit (a page key,
     a page key, a reference-doc path) even though LearningContent is not
     ArkManifest, so they get the same tagged route:/doc: picker -- see
     linkPickerEl above and LearningContent.problems()'s matching tag check. */
  function articleLinkField(article, key, label) {
    return linkPickerEl(label, 'a-' + article.slug + '-' + key, article[key], function (v) { article[key] = v; });
  }
  function partField(article, si, pi) {
    var section = article.sections[si], id = 'a-' + article.slug + '-s' + si + '-p' + pi;
    var control = pi === 0 ? h('input', { id: id, type: 'text', spellcheck: true }) : h('textarea', { id: id, rows: 4, spellcheck: true });
    control.value = section[pi];
    control.addEventListener('input', function () { section[pi] = control.value; touch(); });
    return h('div', { class: 'field' }, h('label', { for: id }, h('span', { text: pi === 0 ? 'Heading' : 'Paragraph ' + pi })), control);
  }
  function questionField(article, si) {
    var id = 'a-' + article.slug + '-s' + si + '-question';
    var control = h('input', { id: id, type: 'text', spellcheck: true });
    control.value = (article.questions || [])[si] || article.sections[si][0];
    control.addEventListener('input', function () {
      if (!article.questions) article.questions = article.sections.map(function (section) { return section[0]; });
      article.questions[si] = control.value;
      touch();
    });
    return h('div', { class: 'field' }, h('label', { for: id }, h('span', { text: 'Question / layer ' + (si + 2) })), control);
  }

  function renderArticleEditor() {
    var root = $('editor'); root.textContent = '';
    var slug = state.aCurrent, a = state.aDrafts[slug];
    if (!a) { root.appendChild(h('p', { class: 'empty-state', text: 'Pick an article on the left.' })); return; }
    var revert = h('button', { id: 'revert', type: 'button', class: 'btn', text: 'Revert', onclick: revertCurrent });
    root.appendChild(h('div', { class: 'editor-head' },
      h('div', {}, h('h1', { text: a.title || slug }), h('div', { class: 'route', text: '/learnings/' + slug + '  ·  js/content/articles/' + slug + '.js' })),
      h('div', { class: 'editor-actions' }, revert)));

    var card = h('fieldset', {}, h('legend', { text: 'Card' }));
    card.appendChild(articleField(a, 'title', 'Title', 'line'));
    card.appendChild(articleField(a, 'category', 'Category', 'line'));
    card.appendChild(articleField(a, 'minutes', 'Reading time', 'line'));
    card.appendChild(articleField(a, 'summary', 'Summary', 'text'));
    root.appendChild(card);

    var primary = h('fieldset', {}, h('legend', { text: 'Layer 1 / the core' }));
    primary.appendChild(articleField(a, 'core', 'Primary summary', 'text', a.summary));
    primary.appendChild(h('p', { class: 'field-key', text: 'The first view before readers open a question. Defaults to the card summary until edited.' }));
    root.appendChild(primary);

    var evidence = h('fieldset', {}, h('legend', { text: 'Editorial evidence and next move' }));
    evidence.appendChild(articleField(a, 'relevance', 'Why this article matters', 'text'));
    evidence.appendChild(articleField(a, 'reviewed', 'Last editorial review (YYYY-MM-DD)', 'line'));
    evidence.appendChild(articleField(a, 'evidenceLabel', 'Evidence link label', 'line'));
    evidence.appendChild(articleLinkField(a, 'evidenceHref', 'Evidence doc path'));
    evidence.appendChild(articleLinkField(a, 'relatedPage', 'Related mechanism page'));
    evidence.appendChild(articleField(a, 'actionLabel', 'Next-action label', 'line'));
    evidence.appendChild(articleLinkField(a, 'actionPage', 'Next-action page'));
    evidence.appendChild(h('p', { class: 'field-key', text: 'These form the reference layer. A review date records editorial review, not live capability verification.' }));
    root.appendChild(evidence);

    a.sections.forEach(function (section, si) {
      var box = h('fieldset', { class: 'section-box' }, h('legend', { text: 'Section ' + (si + 1) }));
      box.appendChild(questionField(a, si));
      section.forEach(function (part, pi) { box.appendChild(partField(a, si, pi)); });
      box.appendChild(h('div', { class: 'tools' },
        h('button', { type: 'button', class: 'btn', text: 'Add a paragraph', onclick: function () { section.push('New paragraph.'); touch(); renderEditor(); } }),
        h('button', { type: 'button', class: 'btn', text: 'Remove the last paragraph', disabled: section.length <= 2, onclick: function () { section.pop(); touch(); renderEditor(); } }),
        h('button', { type: 'button', class: 'btn', text: 'Remove this section', disabled: a.sections.length <= 1, onclick: function () { a.sections.splice(si, 1); if (a.questions) a.questions.splice(si, 1); touch(); renderEditor(); } })));
      root.appendChild(box);
    });
    root.appendChild(h('div', { class: 'tools' },
      h('button', { type: 'button', class: 'btn', text: 'Add a section', onclick: function () { a.sections.push(['New section.', 'Write the first paragraph.']); if (a.questions) a.questions.push('What does this section explain?'); touch(); renderEditor(); } })));

    var box = h('input', { id: 'a-numbers', type: 'checkbox' });
    box.checked = a.numbers;
    box.addEventListener('change', function () { a.numbers = box.checked; touch(); });
    root.appendChild(h('label', { class: 'check', for: 'a-numbers' }, box, h('span', { text: 'Show the table of starting values after the last section' })));

    root.appendChild(h('div', { class: 'danger-zone' },
      h('button', { type: 'button', class: 'btn danger', text: 'Delete this article', disabled: state.slugs.length <= 1, onclick: deleteCurrent })));
    touch();
  }

  /* the index, in reading order: saved articles only, so an unsaved draft never leaks into another article's save */
  function articleList(current) {
    return state.slugs.filter(function (s) { return s === current.slug || state.aSaved[s] !== null; })
      .map(function (s) { return s === current.slug ? current : JSON.parse(state.aSaved[s]); });
  }

  function revertArticle() {
    var slug = state.aCurrent;
    if (state.aSaved[slug] === null) return;
    state.aDrafts[slug] = JSON.parse(state.aSaved[slug]); renderEditor(); renderList(); status('Reverted to the saved version.', '');
  }

  /* Step 5: the old single-article saveArticleCurrent() is deleted -- its exact logic (same
     validation, same connected-project-or-download split, same state.aSaved/LearningContent
     update) now lives inside saveEverything()'s articles loop, the one function every Save
     entry point calls. See saveEverything() above for the article branch. */

  async function deleteArticle() {
    var slug = state.aCurrent, a = state.aDrafts[slug];
    if (state.slugs.length <= 1) { status('Keep at least one article: the site links each note to the next.', 'warn'); return; }
    if (!state.cdirs && state.aSaved[slug] !== null) { status('Connect the project folder to delete an article: this removes its file.', 'warn'); return; }
    if (!window.confirm('Delete "' + a.title + '"? This removes its file and its card on the Learnings page.')) return;
    var routesBefore = studioRoutes().map(function (r) { return r.path; });
    try { await removeItemFile('article', slug); }
    catch (error) { status(error.message, 'error'); return; }
    var forgot = await forgetDeleted('articles', slug, routesBefore);
    state.aCurrent = state.slugs[0]; renderList(); renderEditor(); reloadPreview(); status('Deleted ' + a.title + '.' + forgot + await afterDelete(), 'ok');
  }

  function articleBlueprint(slug) {
    return { slug: slug, title: 'New note', category: 'NOTES / ' + String(state.slugs.length + 1).padStart(3, '0'), minutes: '3 MIN READ',
             summary: 'Say what this note is about.', core: 'State the central idea clearly.', questions: ['What does this note explain?'],
             relevance: '', reviewed: '', evidenceLabel: '', evidenceHref: '', relatedPage: '', actionLabel: '', actionPage: '',
             sections: [['First heading', 'Write the first paragraph.']], numbers: false };
  }
  $('newArticleForm').addEventListener('submit', function (event) {
    event.preventDefault();
    var input = $('newSlug'), slug = input.value.trim();
    if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(slug)) { status('An article name is lowercase words joined by hyphens, starting with a letter.', 'error'); return; }
    if (state.aDrafts[slug]) { status('There is already an article called ' + slug + '.', 'error'); return; }
    state.slugs.push(slug); state.aDrafts[slug] = articleBlueprint(slug); state.aSaved[slug] = null;
    input.value = ''; selectArticle(slug); status('New article. Edit it, then Save to create it.', '');
  });

  /* ---- image assets --------------------------------------------------- */
  /* file -> {mime, dataBase64}, or a status message and nothing if the file fails validation */
  function readFileAsAsset(file, onReady) {
    if (ArkAsset.mimeTypes.indexOf(file.type) < 0) { status('That file type is not supported. Use PNG, JPEG, WebP or SVG.', 'error'); return; }
    if (file.size > ArkAsset.maxBytes) { status('That image is larger than ' + ArkAsset.sizeLabel(ArkAsset.maxBytes) + '.', 'error'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var result = reader.result, comma = result.indexOf(',');
      onReady({ mime: file.type, dataBase64: result.slice(comma + 1) });
    };
    reader.onerror = function () { status('Could not read that file.', 'error'); };
    reader.readAsDataURL(file);
  }

  function assetLabelField(asset) {
    var id = 'as-' + asset.id + '-label';
    var control = h('input', { id: id, type: 'text', spellcheck: true });
    control.value = asset.label;
    control.addEventListener('input', function () { asset.label = control.value; touch(); });
    return h('div', { class: 'field' }, h('label', { for: id, text: 'Label' }), control);
  }

  function renderAssetEditor() {
    var root = $('editor'); root.textContent = '';
    var id = state.assetCurrent, asset = state.assetDrafts[id];
    if (!asset) { root.appendChild(h('p', { class: 'empty-state', text: 'Pick an image on the left.' })); return; }
    var revert = h('button', { id: 'revert', type: 'button', class: 'btn', text: 'Revert', onclick: revertCurrent });
    root.appendChild(h('div', { class: 'editor-head' },
      h('div', {}, h('h1', { text: asset.label || id }), h('div', { class: 'route', text: 'js/content/assets/' + id + '.js' })),
      h('div', { class: 'editor-actions' }, revert)));

    var box = h('fieldset', {}, h('legend', { text: 'Image' }));
    var preview = h('img', { src: 'data:' + asset.mime + ';base64,' + asset.dataBase64, alt: asset.label, class: 'asset-preview' });
    box.appendChild(preview);
    box.appendChild(assetLabelField(asset));
    var file = h('input', { type: 'file', accept: ArkAsset.mimeTypes.join(',') });
    file.addEventListener('change', function () {
      var picked = file.files && file.files[0];
      if (!picked) return;
      readFileAsAsset(picked, function (next) {
        asset.mime = next.mime; asset.dataBase64 = next.dataBase64;
        preview.src = 'data:' + asset.mime + ';base64,' + asset.dataBase64;
        touch(); notifyPreviewAssets();
      });
    });
    box.appendChild(h('div', { class: 'field' }, h('label', { text: 'Replace the image' }), file));
    root.appendChild(box);

    root.appendChild(h('div', { class: 'danger-zone' },
      h('button', { type: 'button', class: 'btn danger', text: 'Delete this image', onclick: deleteCurrent })));
    touch();
  }

  function revertAsset() {
    var id = state.assetCurrent;
    if (state.assetSaved[id] === null) return;
    state.assetDrafts[id] = JSON.parse(state.assetSaved[id]); renderEditor(); renderList(); status('Reverted to the saved version.', '');
  }

  /* Step 5: the old single-image saveAssetCurrent() is deleted -- its exact logic now lives
     inside saveEverything()'s images loop. See saveEverything() above. */

  async function deleteAsset() {
    var id = state.assetCurrent, asset = state.assetDrafts[id];
    if (!state.assetDir && state.assetSaved[id] !== null) { status('Connect the project folder to delete an image: this removes its file.', 'warn'); return; }
    if (!window.confirm('Delete "' + (asset.label || id) + '"? Anything using this image (for example the concept page) falls back to its default.')) return;
    try { await removeItemFile('asset', id); }
    catch (error) { status(error.message, 'error'); return; }
    state.assetCurrent = state.assetIds[0] || null; renderList(); renderEditor(); reloadPreview(); status('Deleted ' + (asset.label || id) + '.' + await afterDelete(), 'ok');
  }

  function assetIdSlug(filename) {
    var base = filename.toLowerCase().replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'image';
    // A hash-style filename ("1b2d390dd280...jpg") slugifies to something that STARTS WITH A DIGIT,
    // which the id rule (^[a-z]) then refuses -- silently, from the user's point of view, since the
    // field already looks filled in. Never hand back a slug the validator would reject.
    if (!/^[a-z]/.test(base)) base = 'image-' + base;
    base = base.slice(0, 40).replace(/-+$/, '');
    if (!state.assetDrafts[base]) return base;
    var n = 2;
    while (state.assetDrafts[base + '-' + n]) n += 1;
    return base + '-' + n;
  }

  /* Read + validate the moment a file is chosen, so picking one is never silent: a thumbnail appears (or an
     error does) before "Add" is ever clicked, and the id auto-fills so a blank id field is not a dead end. */
  var newAssetPending = null;
  $('newAssetFile').addEventListener('change', function () {
    var preview = $('newAssetPreview'), idInput = $('newAssetId'), picked = this.files && this.files[0];
    newAssetPending = null; preview.hidden = true; preview.removeAttribute('src');
    if (!picked) return;
    readFileAsAsset(picked, function (next) {
      newAssetPending = next;
      preview.src = 'data:' + next.mime + ';base64,' + next.dataBase64;
      preview.hidden = false;
      if (!idInput.value.trim()) idInput.value = assetIdSlug(picked.name);
      status('', '');
    });
  });

  $('newAssetForm').addEventListener('submit', function (event) {
    event.preventDefault();
    var idInput = $('newAssetId'), id = idInput.value.trim();
    if (!newAssetPending) { status('Choose an image file.', 'error'); return; }
    if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id)) { status('An image name is lowercase words joined by hyphens, starting with a letter.', 'error'); return; }
    if (state.assetDrafts[id]) { status('There is already an image called ' + id + '.', 'error'); return; }
    state.assetIds.push(id);
    state.assetDrafts[id] = { id: id, label: id, mime: newAssetPending.mime, dataBase64: newAssetPending.dataBase64 };
    state.assetSaved[id] = null;
    newAssetPending = null;
    idInput.value = ''; $('newAssetFile').value = ''; $('newAssetPreview').hidden = true; $('newAssetPreview').removeAttribute('src');
    selectAsset(id); status('New image. Edit the label, then Save to create it.', '');
  });

  /* ---- encrypted content ---------------------------------------------- */
  /* The keypair that wraps a file key for "this browser": one per DeadArk identity when signed
     in, so the same person reuses the same media key across sessions; a stable local id
     otherwise, so a draft made before sign-in is still readable by the same browser after. */
  function mediaOwnerId() {
    var who = null;
    try { who = gate.identity(); } catch (e) { who = null; }
    return (who && who.publicKeyB64) || 'local-admin';
  }
  function ownMediaKeyPair() { return ArkContentCrypto.createOrLoadKeyPair(mediaOwnerId()); }

  function secretLabelField(secret) {
    var id = 'sec-' + secret.id + '-label';
    var control = h('input', { id: id, type: 'text', spellcheck: true });
    control.value = secret.label;
    control.addEventListener('input', function () { secret.label = control.value; touch(); });
    return h('div', { class: 'field' }, h('label', { for: id, text: 'Label' }), control);
  }

  function parseRecipientKeys(text) {
    return (text || '').split(/[\n,]/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  async function encryptSecretDraft(secret, id) {
    var recipients = parseRecipientKeys(state.secretRecipientsText[id]);
    var plaintext = (state.secretPlaintext[id] || '').trim();
    if (!recipients.length) { status('Add at least one recipient public key first.', 'error'); return; }
    if (!plaintext) { status('Write the content to encrypt first.', 'error'); return; }
    try {
      var result = await ArkContentCrypto.encryptForRecipients({ kind: 'flux_secret_payload', version: 1, title: secret.label, content: plaintext }, recipients);
      secret.ciphertextBase64 = result.ciphertextBase64; secret.metadata = result.metadata; secret.recipients = result.envelopes;
      state.secretPlaintext[id] = ''; delete state.secretDecrypted[id];
      touch(); renderEditor(); status('Encrypted for ' + recipients.length + ' recipient' + (recipients.length === 1 ? '' : 's') + '. Save to write it.', 'ok');
    } catch (error) { status('Could not encrypt: ' + error.message, 'error'); }
  }

  async function decryptSecretDraft(secret, id) {
    try {
      var own = ownMediaKeyPair();
      var read = await ArkContentCrypto.decryptForSelf(secret, own);
      if (read === null) { status('This browser’s key is not one of the recipients: cannot decrypt.', 'warn'); return; }
      state.secretDecrypted[id] = read.content || ''; renderEditor();
    } catch (error) { status('Could not decrypt: ' + error.message, 'error'); }
  }

  function renderSecretEditor() {
    var root = $('editor'); root.textContent = '';
    var id = state.secretCurrent, secret = state.secretDrafts[id];
    if (!secret) { root.appendChild(h('p', { class: 'empty-state', text: 'Pick an item on the left.' })); return; }
    var revert = h('button', { id: 'revert', type: 'button', class: 'btn', text: 'Revert', onclick: revertCurrent });
    root.appendChild(h('div', { class: 'editor-head' },
      h('div', {}, h('h1', { text: secret.label || id }), h('div', { class: 'route', text: 'js/content/secrets/' + id + '.js' })),
      h('div', { class: 'editor-actions' }, revert)));

    var about = h('fieldset', {}, h('legend', { text: 'Encrypted content' }),
      h('p', { class: 'hint' }, 'The body is AES-GCM ciphertext; the key is wrapped once per recipient with nacl box. Nothing on disk or on the mesh ever holds the plaintext — only what you encrypt here, in this browser, right now.'));
    about.appendChild(secretLabelField(secret));
    root.appendChild(about);

    var keyBox = h('fieldset', {}, h('legend', { text: 'Your key (this browser)' }));
    var own = ownMediaKeyPair();
    var keyField = h('input', { type: 'text', readonly: true, value: own.publicKey });
    var copyBtn = h('button', { type: 'button', class: 'btn', text: 'Copy', onclick: function () {
      navigator.clipboard.writeText(own.publicKey).then(function () { status('Copied your public key.', 'ok'); }).catch(function () { status('Could not copy; select and copy it by hand.', 'warn'); });
    } });
    keyBox.appendChild(h('div', { class: 'field' }, h('label', { text: 'Share this so someone can add you as a recipient' }), h('div', { class: 'new-row' }, keyField, copyBtn)));
    root.appendChild(keyBox);

    var hasCiphertext = !!secret.ciphertextBase64;
    if (hasCiphertext) {
      var lockedBox = h('fieldset', {}, h('legend', { text: 'Currently encrypted' }));
      lockedBox.appendChild(h('p', { class: 'hint' }, 'Encrypted for ' + (secret.recipients || []).length + ' recipient(s), ' + ArkSecret.sizeLabel(Math.floor((secret.ciphertextBase64.length * 3) / 4)) + '.'));
      var revealBtn = h('button', { type: 'button', class: 'btn', text: 'Decrypt to check', onclick: function () { decryptSecretDraft(secret, id); } });
      lockedBox.appendChild(revealBtn);
      if (state.secretDecrypted[id] !== undefined) {
        lockedBox.appendChild(h('div', { class: 'field' }, h('label', { text: 'Decrypted content (this browser only, not saved)' }),
          h('textarea', { rows: 6, readonly: true, text: state.secretDecrypted[id] })));
      }
      root.appendChild(lockedBox);
    }

    var writeBox = h('fieldset', {}, h('legend', { text: hasCiphertext ? 'Re-encrypt (replaces the content above)' : 'Write and encrypt' }));
    var recipientsArea = h('textarea', { rows: 3, spellcheck: false, placeholder: 'One recipient public key per line' });
    recipientsArea.value = state.secretRecipientsText[id] || '';
    recipientsArea.addEventListener('input', function () { state.secretRecipientsText[id] = recipientsArea.value; });
    writeBox.appendChild(h('div', { class: 'field' }, h('label', { text: 'Recipients (public keys)' }), recipientsArea));
    var addSelfBtn = h('button', { type: 'button', class: 'btn', text: 'Add my own key', onclick: function () {
      var lines = parseRecipientKeys(recipientsArea.value);
      if (lines.indexOf(own.publicKey) < 0) lines.push(own.publicKey);
      recipientsArea.value = lines.join('\n'); state.secretRecipientsText[id] = recipientsArea.value;
    } });
    writeBox.appendChild(addSelfBtn);
    var plaintextArea = h('textarea', { rows: 6, spellcheck: true, placeholder: 'The content to encrypt' });
    plaintextArea.value = state.secretPlaintext[id] || '';
    plaintextArea.addEventListener('input', function () { state.secretPlaintext[id] = plaintextArea.value; });
    writeBox.appendChild(h('div', { class: 'field' }, h('label', { text: 'Content' }), plaintextArea));
    writeBox.appendChild(h('button', { type: 'button', class: 'btn primary', text: 'Encrypt & lock', onclick: function () { encryptSecretDraft(secret, id); } }));
    root.appendChild(writeBox);

    root.appendChild(h('div', { class: 'danger-zone' },
      h('button', { type: 'button', class: 'btn danger', text: 'Delete this item', onclick: deleteCurrent })));
    touch();
  }

  function revertSecret() {
    var id = state.secretCurrent;
    if (state.secretSaved[id] === null) return;
    state.secretDrafts[id] = JSON.parse(state.secretSaved[id]); state.secretPlaintext[id] = ''; delete state.secretDecrypted[id];
    renderEditor(); renderList(); status('Reverted to the saved version.', '');
  }

  /* Step 5: the old single-secret saveSecretCurrent() is deleted -- its exact logic now
     lives inside saveEverything()'s secrets loop. See saveEverything() above. */

  async function deleteSecret() {
    var id = state.secretCurrent, secret = state.secretDrafts[id];
    if (!state.secretDir && state.secretSaved[id] !== null) { status('Connect the project folder to delete encrypted content: this removes its file.', 'warn'); return; }
    if (!window.confirm('Delete "' + (secret.label || id) + '"? This cannot be undone.')) return;
    try { await removeItemFile('secret', id); }
    catch (error) { status(error.message, 'error'); return; }
    state.secretCurrent = state.secretIds[0] || null; renderList(); renderEditor(); reloadPreview(); status('Deleted ' + (secret.label || id) + '.' + await afterDelete(), 'ok');
  }

  $('newSecretForm').addEventListener('submit', function (event) {
    event.preventDefault();
    var idInput = $('newSecretId'), id = idInput.value.trim();
    if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id)) { status('A name is lowercase words joined by hyphens, starting with a letter.', 'error'); return; }
    if (state.secretDrafts[id]) { status('There is already an item called ' + id + '.', 'error'); return; }
    state.secretIds.push(id);
    state.secretDrafts[id] = { id: id, label: id, ciphertextBase64: '', metadata: null, recipients: [] };
    state.secretSaved[id] = null; state.secretPlaintext[id] = ''; state.secretRecipientsText[id] = '';
    idInput.value = ''; selectSecret(id); status('New encrypted content. Write it and encrypt it, then Save.', '');
  });

  /* ---- new page ----------------------------------------------------- */
  function blueprint(id) {
    function line(label, value, section) { return { label: label, kind: 'line', section: section, value: value }; }
    function text(label, value, section) { return { label: label, kind: 'text', section: section, value: value }; }
    var fields = {
      EYEBROW: line('Eyebrow', 'THE FLUX SPEC / ' + id.toUpperCase(), 'Page'),
      TITLE: line('Heading', 'New page.', 'Page'),
      DECK: text('Intro', 'Introduce the page here.', 'Page'),
      CTA: line('Link on the theory page', 'NEW PAGE', 'Links')
    };
    for (var n = 1; n <= 3; n++) {
      fields['POINT' + n + '.TITLE'] = line('Heading', 'New point.', 'Point ' + n);
      fields['POINT' + n + '.TEXT'] = text('Text', 'Explain the point.', 'Point ' + n);
    }
    fields.NEXT = line('Onward link (an arrow is added)', 'OPEN THE TUTORIALS', 'Links');
    fields.BACK = line('Link back to the theory (an arrow is added)', 'THE THEORY', 'Links');
    return { id: id, title: 'Theory: ' + id.charAt(0).toUpperCase() + id.slice(1), route: '/concept/' + id, group: 'theory',
             meta: { placement: 'rail', next: 'learnings', back: 'concept' }, fields: fields };
  }

  $('newForm').addEventListener('submit', function (event) {
    event.preventDefault();
    var input = $('newId'), id = input.value.trim();
    if (!/^[a-z][a-z0-9]*$/.test(id)) { status('A page name is lowercase letters and digits, starting with a letter.', 'error'); return; }
    if (state.drafts[id]) { status('There is already a page called ' + id + '.', 'error'); return; }
    state.ids.push(id); state.drafts[id] = blueprint(id); state.saved[id] = null;
    input.value = ''; select(id); status('New page. Edit it, then Save to create it.', '');
  });

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
     page's two shape images (js/content/mesh-settings.js): an edit shows its
     effect on the previewed page immediately, before Save writes anything. */
  var meshDraft = (window.ArkMeshSettings && ArkMeshSettings.get()) || (window.ArkMeshSettings && ArkMeshSettings.defaults()) || { tuning: {}, pages: {} };
  var meshSaved = window.ArkMeshSettings ? JSON.stringify(ArkMeshSettings.sanitize(meshDraft)) : null;
  function notifyPreviewMesh() {
    var frame = $('frame'), win = frame && !frame.hidden && frame.contentWindow;
    if (!win) return;
    try { win.postMessage({ type: 'flux-chain-preview-mesh', settings: meshDraft }, window.location.origin); } catch (error) { /* preview not ready yet; the next edit or the frame's own load retries */ }
  }
  /* Same idea again, for the colour theme (js/content/theme.js): a picked colour shows on
     the previewed page immediately, before Save writes anything. */
  var themeDraft = (window.ArkTheme && ArkTheme.get()) || (window.ArkTheme && ArkTheme.defaults()) || {};
  var themeSaved = window.ArkTheme ? JSON.stringify(ArkTheme.sanitize(themeDraft)) : null;
  function notifyPreviewTheme() {
    var frame = $('frame'), win = frame && !frame.hidden && frame.contentWindow;
    if (!win) return;
    try { win.postMessage({ type: 'flux-chain-preview-theme', theme: themeDraft }, window.location.origin); } catch (error) { /* preview not ready yet; the next edit or the frame's own load retries */ }
  }
  /* Send the complete unsaved CMS model into the real public renderer. Page
     modules remount from these in-memory registries, so preview uses the same
     HTML/CSS/components as deployment without writing a file first. */
  function notifyPreviewState() {
    var frame = $('frame'), win = frame && !frame.hidden && frame.contentWindow;
    if (!win || !articlesReady || previewShowing !== previewRoute()) return;
    try { win.postMessage({ type: 'defxn-cms-preview-state', site: siteFromState() }, window.location.origin); } catch (error) { /* iframe is between routes; its load handler retries */ }
  }
  function themeDirty() { return !window.ArkTheme || JSON.stringify(ArkTheme.sanitize(themeDraft)) !== themeSaved; }
  async function saveThemeDraft(button) {
    try {
      if (state.cdirs) {
        await ArkAdminStore.saveTheme(state.cdirs.content, themeDraft);
        status('Saved js/content/theme-data.js', 'ok');
      } else {
        download('theme-data.js', ArkTheme.serialize(themeDraft));
        status('Downloaded theme-data.js. Put it in js/content/, or connect the project folder to save directly.', 'warn');
      }
    /* Step 5: re-throws (instead of swallowing and returning) now that saveEverything() is
       this function's only caller -- its own attempt() wrapper needs the rejection to report
       this draft as failed instead of silently treating it as succeeded. */
    } catch (error) { status(error.message, 'error'); throw error; }
    themeDraft = ArkTheme.sanitize(themeDraft);
    themeSaved = JSON.stringify(themeDraft);
    ArkTheme.define(themeDraft);
    if (button) button.disabled = true;
    renderList();
  }
  /* Same idea again, for the settings-gear's site-wide defaults (js/content/
     settings-defaults.js): what a first-time visitor sees before they ever touch the
     gear. They reach a running preview the way theme/mesh do, by message: the full
     defxn-cms-preview-state (siteFromState() carries settingsDefaults) and, for a
     single edit, the lighter defxn-cms-preview-site-defaults below. js/main.js
     re-defines ArkSiteDefaults from either and fires 'ark-site-defaults-preview', which
     the settings panel (scripts/settings-entry.js -> js/settings/panel.js) answers by
     showing what an unconfigured visitor lands on -- writing nothing to localStorage.
     (This replaced writing the draft into the visitor's own localStorage keys before a
     reload: on the shared origin that turned every preview into the owner's own stored
     "choice", which then hid every later site default from the owner's browser.) */
  var settingsDefaultsDraft = (window.ArkSiteDefaults && ArkSiteDefaults.get()) || (window.ArkSiteDefaults && ArkSiteDefaults.defaults()) || {};
  var settingsDefaultsSaved = window.ArkSiteDefaults ? JSON.stringify(ArkSiteDefaults.sanitize(settingsDefaultsDraft)) : null;
  var settingsDefaultsReloadTimer = 0;
  function settingsDefaultsDirty() { return !window.ArkSiteDefaults || JSON.stringify(ArkSiteDefaults.sanitize(settingsDefaultsDraft)) !== settingsDefaultsSaved; }
  function notifyPreviewSettingsDefaults() {
    if (!window.ArkSiteDefaults || versionPreviewSite) return; /* a previewed version keeps showing its own defaults */
    var message = { type: 'defxn-cms-preview-site-defaults', settingsDefaults: ArkSiteDefaults.sanitize(settingsDefaultsDraft) };
    [$('frame'), $('cmsPreview')].forEach(function (frame) {
      var win = frame && !frame.hidden && frame.contentWindow;
      if (win) try { win.postMessage(message, window.location.origin); } catch (error) { /* between routes; the frame's load handler sends the full state */ }
    });
  }
  async function saveSettingsDefaultsDraft(button) {
    try {
      if (state.cdirs) {
        await ArkAdminStore.saveSettingsDefaults(state.cdirs.content, settingsDefaultsDraft);
        status('Saved js/content/settings-defaults-data.js', 'ok');
      } else {
        download('settings-defaults-data.js', ArkSiteDefaults.serialize(settingsDefaultsDraft));
        status('Downloaded settings-defaults-data.js. Put it in js/content/, or connect the project folder to save directly.', 'warn');
      }
    /* Step 5: re-throws now that saveEverything() is this function's only caller -- see
       saveThemeDraft's matching comment above. */
    } catch (error) { status(error.message, 'error'); throw error; }
    settingsDefaultsDraft = ArkSiteDefaults.sanitize(settingsDefaultsDraft);
    settingsDefaultsSaved = JSON.stringify(settingsDefaultsDraft);
    ArkSiteDefaults.define(settingsDefaultsDraft);
    if (button) button.disabled = true;
    renderList();
  }
  function revertDesign() {
    themeDraft = (window.ArkTheme && (ArkTheme.get() || ArkTheme.defaults())) || {};
    settingsDefaultsDraft = (window.ArkSiteDefaults && (ArkSiteDefaults.get() || ArkSiteDefaults.defaults())) || {};
    notifyPreviewTheme();
    clearTimeout(settingsDefaultsReloadTimer);
    reloadPreview();
    renderDesignEditor();
    renderList();
    status('Reverted global design config.', '');
  }
  function selectDesign() { state.kind = 'design'; renderList(); renderEditor(); reloadPreview(); }
  /* A small live thumbnail of a background style, mounted right in the admin (not just the
     iframe): design/ark-ui's generators are pure DOM/SVG/canvas, so this is the same
     ArkBackgrounds.<key>.mount() the public site uses, just in a small fixed box. */
  function backgroundThumb(key) {
    var box = h('div', { class: 'bg-thumb' });
    if (window.ArkBackgrounds && ArkBackgrounds[key]) {
      try { ArkBackgrounds[key].mount(box); } catch (error) { box.appendChild(h('span', { class: 'bg-thumb-fallback', text: key })); }
    } else box.appendChild(h('span', { class: 'bg-thumb-fallback', text: key }));
    return box;
  }

  function buildDesignPanel(options) {
    options = options || {};
    var wrap = h('div', { class: 'page-law-panel' });
    if (!window.ArkTheme) { wrap.appendChild(h('p', { class: 'empty-state', text: 'Theme editing is unavailable on this page.' })); return wrap; }
    themeDraft = ArkTheme.sanitize(themeDraft);
    var active = themeDraft.activeTheme || 'ghost';
    var colorsBox = h('fieldset', { class: 'relief theme-core' }, h('legend', { text: 'Theme core' }));
    colorsBox.appendChild(h('p', { class: 'hint', text: 'Pick a theme and edit the actual core colours the site uses: canvas, surfaces, text, primary, complement and accent.' }));
    var themeSelect = h('select', { id: 'theme-active' });
    ArkTheme.themeOptions().forEach(function (theme) {
      themeSelect.appendChild(h('option', { value: theme.key, selected: theme.key === active, text: theme.label }));
    });
    var colorFields = h('div', { class: 'theme-fields' });
    function hslToHex(value) {
      var match = String(value || '').match(/^\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
      if (!match) return '#000000';
      var h0 = Number(match[1]) / 360, s = Number(match[2]) / 100, l = Number(match[3]) / 100;
      function hue(p, q, t) { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; }
      var q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
      var rgb = s === 0 ? [l, l, l] : [hue(p, q, h0 + 1 / 3), hue(p, q, h0), hue(p, q, h0 - 1 / 3)];
      return '#' + rgb.map(function (v) { return Math.round(v * 255).toString(16).padStart(2, '0'); }).join('');
    }
    function hexToHsl(hex) {
      var n = parseInt(hex.slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
      var max = Math.max(r, g, b), min = Math.min(r, g, b), h0 = 0, s = 0, l = (max + min) / 2, d = max - min;
      if (d) {
        s = l > .5 ? d / (2 - max - min) : d / (max + min);
        h0 = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
        h0 /= 6;
      }
      return Math.round(h0 * 360) + ' ' + Math.round(s * 100) + '% ' + Math.round(l * 100) + '%';
    }
    function computedThemeValue(theme, key) {
      var old = document.documentElement.getAttribute('data-theme');
      document.documentElement.setAttribute('data-theme', theme);
      var value = getComputedStyle(document.documentElement).getPropertyValue('--' + key).trim();
      if (old) document.documentElement.setAttribute('data-theme', old); else document.documentElement.removeAttribute('data-theme');
      return value;
    }
    function themeValue(theme, key) {
      return themeDraft.themes && themeDraft.themes[theme] && themeDraft.themes[theme][key] ? themeDraft.themes[theme][key] : computedThemeValue(theme, key);
    }
    function setThemeValue(theme, key, value) {
      if (!themeDraft.themes) themeDraft.themes = {};
      if (!themeDraft.themes[theme]) themeDraft.themes[theme] = {};
      themeDraft.themes[theme][key] = value;
    }
    function refreshColors() {
      active = themeDraft.activeTheme || active;
      colorFields.textContent = '';
      ArkTheme.semanticFields().forEach(function (f) {
        var id = 'semantic-' + active + '-' + f.key;
        var inherited = computedThemeValue(active, f.key);
        var current = themeValue(active, f.key);
        var swatch = h('input', { id: id, type: 'color', value: hslToHex(current) });
        var out = h('output', { text: current });
        var ALREADY_DEFAULT = 'Already this theme\u2019s default colour.';
        swatch.addEventListener('input', function () {
          var next = hexToHsl(swatch.value);
          setThemeValue(active, f.key, next);
          out.textContent = next;
          refuse(resetOne, '');
          notifyPreviewTheme(); touch();
        });
        var resetOne = h('button', { type: 'button', class: 'btn tiny', text: 'Default', onclick: function () {
          if (themeDraft.themes && themeDraft.themes[active]) delete themeDraft.themes[active][f.key];
          swatch.value = hslToHex(inherited); out.textContent = inherited; refuse(resetOne, ALREADY_DEFAULT);
          notifyPreviewTheme(); touch();
        } });
        refuse(resetOne, current === inherited ? ALREADY_DEFAULT : '');
        colorFields.appendChild(h('div', { class: 'theme-field' },
          h('div', { class: 'theme-field-head' }, h('label', { for: id, text: f.label }), resetOne),
          h('div', { class: 'theme-color-row' }, swatch, out)));
      });
    }
    themeSelect.addEventListener('change', function () {
      themeDraft.activeTheme = themeSelect.value;
      active = themeSelect.value;
      refreshColors(); notifyPreviewTheme(); touch();
    });
    colorsBox.appendChild(h('div', { class: 'theme-select-row' }, h('label', { for: 'theme-active', text: 'Editing theme' }), themeSelect));
    colorsBox.appendChild(colorFields);

    var bgBox = h('fieldset', { class: 'relief' }, h('legend', { text: 'Background' }));
    bgBox.appendChild(h('p', { class: 'hint', text: 'A layer behind every page (js/ark/vendor/backgrounds.js). None keeps the flat canvas colour.' }));
    var bgGrid = h('div', { class: 'bg-grid' });
    function refreshBackground() {
      bgGrid.textContent = '';
      ArkTheme.backgroundStyles().forEach(function (s) {
        var id = 'bg-' + s.key;
        var picked = themeDraft.background.style === s.key;
        var radio = h('input', { id: id, type: 'radio', name: 'bg-style', checked: picked });
        radio.addEventListener('change', function () {
          themeDraft.background = { style: s.key };
          notifyPreviewTheme(); touch(); refreshBackground();
        });
        var card = h('label', { for: id, class: 'bg-card' + (picked ? ' picked' : '') },
          radio, s.key === 'none' ? h('div', { class: 'bg-thumb bg-thumb-none' }) : backgroundThumb(s.key),
          h('span', { text: s.label }));
        bgGrid.appendChild(card);
      });
    }
    bgBox.appendChild(bgGrid);

    function refreshAll() { refreshColors(); refreshBackground(); touch(); }
    var removeBg = h('button', { type: 'button', class: 'btn', text: 'Remove background layer', onclick: function () { themeDraft.background = { style: 'none' }; refreshAll(); notifyPreviewTheme(); } });
    var removeTheme = h('button', { type: 'button', class: 'btn', text: 'Remove this theme override', onclick: function () { if (themeDraft.themes) delete themeDraft.themes[active]; refreshAll(); notifyPreviewTheme(); } });
    var removeAllThemes = h('button', { type: 'button', class: 'btn', text: 'Remove all theme overrides', onclick: function () { themeDraft.themes = {}; refreshAll(); notifyPreviewTheme(); } });
    var reset = h('button', { type: 'button', class: 'btn', text: 'Reset design to defaults', onclick: function () { themeDraft = ArkTheme.defaults(); refreshAll(); notifyPreviewTheme(); } });
    refreshAll();
    wrap.appendChild(colorsBox);
    wrap.appendChild(bgBox);
    wrap.appendChild(h('div', { class: 'tools' }, removeBg, removeTheme, removeAllThemes, reset));
    return wrap;
  }

  /* Site-wide settings-gear defaults (js/content/settings-defaults.js): what a
     first-time visitor sees before they ever touch the gear (theme + brand-mesh motif
     + its per-motif pattern config). Sits alongside buildDesignPanel's own colour/
     background editing -- same Design kind, same Save/Revert -- since it is the
     closer analog to ArkMeshSettings (site-wide, not per-page) than to ArkTheme's own
     mechanism, which this deliberately does NOT share state with. */
  function buildSettingsDefaultsPanel() {
    var wrap = h('fieldset', { class: 'relief' }, h('legend', { text: 'Settings-gear defaults' }));
    if (!window.ArkSiteDefaults) { wrap.appendChild(h('p', { class: 'empty-state', text: 'Settings-gear defaults editing is unavailable on this page.' })); return wrap; }
    settingsDefaultsDraft = ArkSiteDefaults.sanitize(settingsDefaultsDraft);
    wrap.appendChild(h('p', { class: 'hint', text: 'What a first-time visitor sees before they ever touch the settings gear (⚙) -- their own later choice, saved to their own browser, always wins over this.' }));

    var themeSelect = h('select', { id: 'defaults-theme' });
    ArkSiteDefaults.themeOptions().forEach(function (key) {
      themeSelect.appendChild(h('option', { value: key, selected: key === settingsDefaultsDraft.theme, text: key }));
    });
    themeSelect.addEventListener('change', function () {
      settingsDefaultsDraft.theme = themeSelect.value;
      notifyPreviewSettingsDefaults(); touch();
    });
    wrap.appendChild(h('div', { class: 'theme-select-row' }, h('label', { for: 'defaults-theme', text: 'Default theme' }), themeSelect));

    var motifSelect = h('select', { id: 'defaults-motif' });
    ArkSiteDefaults.motifs().forEach(function (key) {
      motifSelect.appendChild(h('option', { value: key, selected: key === settingsDefaultsDraft.motif, text: key }));
    });
    motifSelect.addEventListener('change', function () {
      settingsDefaultsDraft.motif = motifSelect.value;
      notifyPreviewSettingsDefaults(); touch();
    });
    wrap.appendChild(h('div', { class: 'theme-select-row' }, h('label', { for: 'defaults-motif', text: 'Default pattern' }), motifSelect));

    var editingSelect = h('select', { id: 'defaults-editing-motif' });
    ArkSiteDefaults.motifs().forEach(function (key) {
      editingSelect.appendChild(h('option', { value: key, selected: key === settingsDefaultsDraft.motif, text: key }));
    });
    wrap.appendChild(h('div', { class: 'theme-select-row' }, h('label', { for: 'defaults-editing-motif', text: 'Editing pattern config for' }), editingSelect));

    var controls = ArkSiteDefaults.controls();
    var fields = h('div', { class: 'relief-fields' });
    function refreshFields() {
      fields.textContent = '';
      var motif = editingSelect.value;
      var row = settingsDefaultsDraft.patternConfig[motif];
      Object.keys(controls).forEach(function (key) {
        var c = controls[key], id = 'defaults-' + motif + '-' + key;
        var out = h('output', { for: id, text: String(row[key]) });
        var input = h('input', { id: id, type: 'range', min: c.min, max: c.max, step: key === 'delay' ? .1 : 1, oninput: function () {
          var value = Number(input.value);
          if (!Number.isFinite(value)) return;
          row[key] = Math.max(c.min, Math.min(c.max, value));
          out.textContent = String(row[key]);
          notifyPreviewSettingsDefaults(); touch();
        } });
        input.value = row[key];
        fields.appendChild(h('div', { class: 'relief-field' },
          h('div', { class: 'relief-field-head' }, h('label', { for: id, text: key }), out),
          input));
      });
      var animateId = 'defaults-' + motif + '-animated';
      var animate = h('input', { id: animateId, type: 'checkbox', checked: row.animated, onchange: function () {
        row.animated = animate.checked;
        notifyPreviewSettingsDefaults(); touch();
      } });
      fields.appendChild(h('div', { class: 'relief-field' }, h('label', { for: animateId, text: 'Animate by default' }), animate));
    }
    editingSelect.addEventListener('change', refreshFields);
    refreshFields();
    wrap.appendChild(fields);

    var reset = h('button', { type: 'button', class: 'btn', text: 'Reset settings-gear defaults', onclick: function () {
      settingsDefaultsDraft = ArkSiteDefaults.defaults();
      themeSelect.value = settingsDefaultsDraft.theme;
      motifSelect.value = settingsDefaultsDraft.motif;
      editingSelect.value = settingsDefaultsDraft.motif;
      refreshFields();
      notifyPreviewSettingsDefaults(); touch();
    } });
    wrap.appendChild(h('div', { class: 'tools' }, reset));
    return wrap;
  }

  function buildCodePanel(id, manifest) {
    var box = h('div', { class: 'editor-tab-flow code-panel' });
    var inspector = h('fieldset', {}, h('legend', { text: 'Page structure' }));
    var view = h('textarea', { class: 'code-view', readonly: true });
    function manifestOutline() {
      var lines = ['page#' + id + ' "' + manifest.title + '"'];
      lines.push('  route: ' + (manifest.route || '/'));
      lines.push('  group: ' + (manifest.group || 'page'));
      Object.keys(manifest.fields || {}).forEach(function (key) {
        var value = String(manifest.fields[key] || '').replace(/\s+/g, ' ').trim();
        lines.push('  field[' + key + '] ' + (value ? '"' + value.slice(0, 96) + (value.length > 96 ? '...' : '') + '"' : '(empty)'));
      });
      return lines.join('\n');
    }
    function domOutline() {
      var frame = $('frame');
      var doc = frame && frame.contentDocument;
      var start = doc && (doc.querySelector('[data-page], [data-ark-page], main, #scene') || doc.body);
      if (!start) return manifestOutline();
      var lines = [];
      function walk(node, depth) {
        if (!node || node.nodeType !== 1 || depth > 5 || lines.length > 160) return;
        var label = node.tagName.toLowerCase();
        if (node.id) label += '#' + node.id;
        if (node.className && typeof node.className === 'string') label += '.' + node.className.trim().split(/\s+/).slice(0, 3).join('.');
        ['data-role', 'data-layer', 'data-ark-layer', 'data-page'].forEach(function (attr) { if (node.getAttribute(attr)) label += '[' + attr + '="' + node.getAttribute(attr) + '"]'; });
        lines.push('  '.repeat(depth) + label);
        Array.prototype.slice.call(node.children || []).forEach(function (child) { walk(child, depth + 1); });
      }
      walk(start, 0);
      return lines.join('\n') || manifestOutline();
    }
    function cleanTextFields() {
      Object.keys(manifest.fields || {}).forEach(function (key) {
        if (typeof manifest.fields[key] === 'string') manifest.fields[key] = manifest.fields[key].replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
      });
      view.value = manifestOutline();
      touch(); reloadPreview();
    }
    view.value = manifestOutline();
    inspector.appendChild(h('p', { class: 'hint', text: 'Inspect the generated page structure or the manifest fields. Cleaning trims empty whitespace without deleting real sections.' }));
    inspector.appendChild(view);
    inspector.appendChild(h('div', { class: 'tools' },
      h('button', { type: 'button', class: 'btn', text: 'Inspect preview divs', onclick: function () { view.value = domOutline(); } }),
      h('button', { type: 'button', class: 'btn', text: 'Show manifest fields', onclick: function () { view.value = manifestOutline(); } }),
      h('button', { type: 'button', class: 'btn', text: 'Clean text fields', onclick: cleanTextFields })));
    box.appendChild(inspector);
    return box;
  }

  function renderDesignEditor() {
    var root = $('editor'); root.textContent = '';
    var revert = h('button', { id: 'revert', type: 'button', class: 'btn', text: 'Revert', onclick: revertCurrent });
    refuse(revert, themeDirty() || settingsDefaultsDirty() ? '' : 'Nothing to revert: the theme and settings-gear defaults match their saved copy.');
    root.appendChild(h('div', { class: 'editor-head' },
      h('div', {}, h('h1', { text: 'Theme & defaults' }), h('div', { class: 'route', text: 'Site-wide · theme-data.js · settings-defaults-data.js · seo-data.js' })),
      h('div', { class: 'editor-actions' }, revert)));
    root.appendChild(buildDesignPanel());
    root.appendChild(buildSettingsDefaultsPanel());
    root.appendChild(buildSiteSeoPanel());
  }
  /* Step 3: the old standalone #designNav button is gone -- selectDesign() is now reached
     through #designThemeBtn, Design mode's own sub-switch (wired above, near setMode()). */

  /* ---- Studio: the complete visual CMS workspace -------------------- */
  var articlesReady = false;
  function studioRoutes() {
    var seen = Object.create(null), out = [];
    Object.keys(ArkUI.pageCatalog || {}).forEach(function (key) {
      var def = ArkUI.pageCatalog[key] || {}, path = def.path;
      if (!path || seen[path]) return;
      seen[path] = true;
      out.push({ path: path, title: String(def.title || key).replace(/\s+[—-]\s+DEFXN.*$/, ''), seoId: def.seoId || '', seoArticle: def.seoArticle || '', key: key });
    });
    if (window.ArkSEO) ArkSEO.routes(state.ids.map(function (id) { return state.drafts[id]; }), state.slugs.map(function (slug) { return state.aDrafts[slug]; })).forEach(function (route) {
      if (!seen[route.path]) { seen[route.path] = true; out.push({ path: route.path, title: route.path === '/' ? 'Home' : route.path.split('/').filter(Boolean).pop().replace(/-/g, ' '), seoId: route.id || '', seoArticle: route.slug || '', key: '' }); }
    });
    return out.sort(function (a, b) { return a.path.localeCompare(b.path); });
  }
  /* Step 2 merge: sendStudioState()/sendStudioPreviewState() are deleted outright -- they
     used to push site state (siteFromState()) across the Studio<->Content-CMS document boundary
     via postMessage ('defxn-studio-load' on first connect, 'defxn-studio-preview-state' on
     every later refresh). That boundary no longer exists: renderStudioEditor() (below, next
     to the rest of the ported Studio code) reads siteFromState()/studioRoutes() directly,
     the same two calls these functions used to wrap in a message. */
  /* applyStudioPatches() (the receiver of the deleted Studio document's manifest/article/SEO
     patch relay) is deleted too: once that document was gone it had no caller, and Content
     mode's own editors mutate state.drafts/aDrafts/seoDraft directly. */
  function applyStudioLayoutPatch(patch) {
    if (!window.ArkLayout || !patch || typeof patch !== 'object' || !patch.route || (!patch.key && !patch.operation)) return;
    if (patch.operation === 'group') layoutDraft = ArkLayout.group(layoutDraft, patch.route, patch.id, patch.members || [], patch.label);
    else if (patch.operation === 'ungroup') layoutDraft = ArkLayout.ungroup(layoutDraft, patch.route, patch.id);
    else if (patch.operation === 'set-label') layoutDraft = ArkLayout.setLabel(layoutDraft, patch.route, patch.key, patch.label);
    else if (patch.operation === 'set-alt') layoutDraft = ArkLayout.setAlt(layoutDraft, patch.route, patch.key, patch.alt);
    else if (patch.reset) layoutDraft = ArkLayout.remove(layoutDraft, patch.route, patch.key, patch.breakpoint);
    else layoutDraft = ArkLayout.set(layoutDraft, patch.route, patch.key, patch.breakpoint || 'desktop', patch.frame || {});
    touch();
  }
  /* Studio's own Ctrl+Z/Ctrl+Shift+Z for layout/style edits is handled entirely inside the
     preview iframe (js/main.js keeps the undo/redo stacks next to cmsLayoutDraft, since every
     layout operation already converges there). This just keeps the authoritative copy here
     in sync with the result, the same way applyStudioLayoutPatch keeps it in sync with a
     forward edit, so Save still writes the post-undo state. */
  function applyStudioLayoutReplace(layout) {
    if (!window.ArkLayout || !layout || typeof layout !== 'object') return;
    layoutDraft = ArkLayout.sanitize(layout); touch();
  }
  /* Reusable component edits (js/content/components.js): every create-master/insert-
     instance/set-override/remove-instance/update-master command is computed once, inside
     the connected preview iframe (js/main.js's cmsComponentsCommand), and relayed up here
     as a whole-draft replace -- the same shape as applyStudioLayoutReplace above, not a
     second patch-application path recomputing the same mutation. */
  function applyStudioComponentsReplace(components) {
    if (!window.ArkComponents || !components || typeof components !== 'object') return;
    componentsDraft = ArkComponents.sanitize(components); touch();
  }
  /* Layered-state edits (js/content/states.js): every create-group/add-state/remove-
     state/set-trigger/set-default command is computed once, inside the
     connected preview iframe (js/main.js's cmsStatesCommand), and relayed up here as a
     whole-draft replace -- the exact same shape as applyStudioComponentsReplace above.
     The toolbar's "Preview" is NOT one of these: it only changes what the preview shows
     and never reaches this draft, so Save cannot turn a previewed state into the public
     default (regression: tests/cms-states-preview-default.cjs). */
  function applyStudioStatesReplace(states) {
    if (!window.ArkStates || !states || typeof states !== 'object') return;
    statesDraft = ArkStates.sanitize(states); touch();
  }
  /* Canvas-only mode's background transition (js/content/canvas-transitions.js):
     every field edit (effect/duration/easing) is computed once inside the connected
     preview iframe (js/main.js's cmsCanvasTransitionsCommand, the one document that
     actually has ArkCanvasTransitions loaded) and relayed up here as a whole-draft
     replace -- the exact same shape as applyStudioStatesReplace above. */
  function applyStudioCanvasTransitionsReplace(whole) {
    if (!window.ArkCanvasTransitions || !whole || typeof whole !== 'object') return;
    canvasTransitionsDraft = ArkCanvasTransitions.sanitize(whole); touch();
  }
  /* Animation-only mode's per-element overrides (js/content/element-motion.js): every
     field edit (direction/distance/duration/delay/easing) is computed once inside the
     connected preview iframe (js/main.js's cmsElementMotionCommand, the one document
     that actually has ArkElementMotion loaded) and relayed up here as a whole-draft
     replace -- the exact same shape as applyStudioCanvasTransitionsReplace above. */
  function applyStudioElementMotionReplace(whole) {
    if (!window.ArkElementMotion || !whole || typeof whole !== 'object') return;
    elementMotionDraft = ArkElementMotion.sanitize(whole); touch();
  }
  /* Step 5 (flickering-juggling-donut.md): saveStudioChanges() is deleted outright -- it
     covered 8 of the 13 real drafts (pages/articles/seo/layout/components/states/canvas-
     transitions/element-motion) in one pass, but wrapped the whole batch in a single
     try/catch, so one draft's validation error silently aborted every draft after it,
     unsaved, with no per-draft report. Its exact write logic for layout/components/states/
     canvas-transitions/element-motion (the 5 drafts with no dedicated per-item editor of
     their own) now lives inside saveEverything() above, alongside the other 8 drafts
     (pages/articles/assets/secrets/mesh-relief/theme/settings-defaults/seo) it never
     covered at all -- one function, all 13 drafts, each saved and reported independently. */
  function selectStudio() { state.kind = 'studio'; renderList(); renderEditor(); reloadPreview(); }
  /* reached through the header's #designSubSwitch (Canvas / Sitemap), wired next to setView() */

  /* =====================================================================
     Studio's own UI (Step 2 merge, 2026-10-17): ported from the old
     standalone admin-studio.html, now in this same document/script scope.
     See flickering-juggling-donut.md, Step 2. The canvas/preview-iframe
     wiring, selection-overlay math, Layers tree, Library, right-panel
     accordions, Groups/Component-instance/States/canvas-transitions/
     element-motion panels, sitemap, design-checks, undo/redo UI, and the
     restrictMode system all move here verbatim; every postCmsX function
     below still posts directly into the one real postMessage boundary that
     stays (cmsPreview, the real-site preview iframe) -- only the former
     Studio-document <-> admin.js hop is gone, replaced by the direct calls
     into applyStudioLayoutPatch/applyStudioComponentsReplace/etc. above.
     ===================================================================== */

  const ic = (name, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  /* Content mode on the current page's own editor. Studio's header used to carry a "Content
     CMS" button for this, a duplicate of the header's mode switch; the toolbar and Library
     actions that still jump there call this directly. */
  function openContentEditor() { select(state.current); }

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
      if (view === 'map') renderSitemap();
      renderStatus(); queueCheck(); refreshPop(); syncCmsPreview();
    });
  }
  /* Step 4 (flickering-juggling-donut.md): restrictMode (and its enter/exit/toggle, the
     #restrictBar banner, and the .canvas-mode/.anim-mode CSS classes) is retired outright,
     a deliberate decision rather than a default -- the plan explicitly asked for "ONE
     toolbar, not a toolbar PLUS a separate restricted-mode system bolted on the side."
     Canvas-transitions (site-wide, no selection to point a floating toolbar at) becomes
     openCanvasTransitionsPopover() below, reusing openPop()'s own positioning against
     the header's Background segment. Element-motion (per-element) folds into #selToolbar as one more
     accordion section (buildElementMotionSection()) shown for any real element selection --
     it never needed a separate "mode" at all: .anim-mode had no CSS rule of its own (grep
     confirms it), and the only thing entering it ever did beyond swapping the panel was
     land on the Layers tab, which selecting an element already does naturally. */
  /* =========================================================================
     DEFXN CMS bridge. The visual document is a projection of the real content
     registries; bindings on editable nodes point back to manifest/article keys.
     ========================================================================= */
  let cmsConnected = false, cmsSourceSite = null, cmsPreviewRoute = '', cmsExactSelection = null, cmsExactSelections = [];
  /* Real route list (admin.js's own studioRoutes(): deduplicated by path, {path, title,
     seoId, seoArticle, key} per route), replacing the deleted dense pages()/curPage -- fed
     directly by the 'defxn-studio-load'/'defxn-studio-preview-state' messages below, never
     built locally. cmsCurrentRoute is a real path string ('/', '/journal', ...), not a
     dense id, and drives syncCmsPreview()'s iframe src and the Pages tab/sitemap below. */
  let cmsRoutes = [], cmsCurrentRoute = '/';
  /* true once the preview has reported 'defxn-cms-preview-ready' for what it was last sent (the design checks wait for it) */
  let cmsPreviewReady = false;
  /* The real DEFXN site's own design tokens and the layout enums the visual-style controls
     offer -- read straight from js/content/layout.js (ArkLayout, loaded by admin-app.html
     before this file), the one module that also validates and applies them. These used to be
     hand-copied here "because this document has no <script src>", true only of the deleted
     admin-studio.html; a copy could only drift from what cleanFrame() accepts
     (tests/admin-token-source.cjs fails if a literal copy comes back). */
  const CMS_TEXT_TOKENS = ArkLayout.TEXT_TOKENS;
  const CMS_FILL_TOKENS = ArkLayout.FILL_TOKENS;
  const CMS_BORDER_TOKENS = ArkLayout.BORDER_TOKENS;
  const CMS_FONT_TOKENS = ArkLayout.FONT_TOKENS;
  const CMS_TYPE_SIZE_TOKENS = ArkLayout.TYPE_SIZE_TOKENS;
  const CMS_RADIUS_TOKENS = ArkLayout.RADIUS_TOKENS;
  const CMS_DISPLAY_TOKENS = ArkLayout.DISPLAY_TOKENS;
  const CMS_ALIGN_TOKENS = ArkLayout.ALIGN_ITEMS_TOKENS;
  const CMS_JUSTIFY_TOKENS = ArkLayout.JUSTIFY_TOKENS;
  const CMS_LINE_HEIGHT_TOKENS = ArkLayout.LINE_HEIGHT_TOKENS;
  const CMS_BORDER_VALUES = ArkLayout.BORDER_VALUES;
  const CMS_WRAP_VALUES = ArkLayout.WRAP_VALUES;
  const CMS_OPACITY_STEPS = ArkLayout.OPACITY_STEPS;
  const CMS_OVERFLOW_VALUES = ArkLayout.OVERFLOW_VALUES;
  const CMS_FONT_WEIGHT_STEPS = ArkLayout.FONT_WEIGHT_STEPS;
  const CMS_TEXT_ALIGN_VALUES = ArkLayout.TEXT_ALIGN_VALUES;
  /* The background-transition and element-animation option lists, and the typed blocks
     the Library offers -- read from the modules that validate them (admin-app.html loads
     canvas-transitions.js, element-motion.js and components.js before this file). These were
     hand copies "because this document has no <script src>", true only of the deleted
     admin-studio.html; a copy can only drift from what sanitize() keeps
     (tests/admin-token-source.cjs fails if one comes back). */
  const CMS_CANVAS_EFFECTS = ArkCanvasTransitions.effects();
  const CMS_CANVAS_EASINGS = ArkCanvasTransitions.easings();
  const CMS_CANVAS_TRANSITIONS_DEFAULT = ArkCanvasTransitions.defaults();
  const CMS_ELEMENT_MOTION_DIRECTIONS = ArkElementMotion.directions();
  const CMS_ELEMENT_MOTION_EASINGS = ArkElementMotion.easings();
  const CMS_ELEMENT_MOTION_DEFAULT_ENTRY = ArkElementMotion.defaultEntry();
  /* the typed blocks ({ resolver, label, props }), each resolver's name and props next to each other in js/content/components.js */
  const CMS_BLOCK_RESOLVERS = ArkComponents.blocks();
  function cmsBlockResolverLabel(resolver) { return ArkComponents.labelOf(resolver); }
  function cmsBlockResolverProps(resolver) { const found = CMS_BLOCK_RESOLVERS.find((b) => b.resolver === resolver); return found ? found.props : []; }
  /* A master's editable props: a typed block's fixed list, or -- for a component made from a
     selection -- its own text/image slots, read from its tree by the one canonical
     ArkComponents.propsOf (admin-app.html loads js/content/components.js). */
  function cmsMasterProps(master) {
    if (!master) return [];
    return window.ArkComponents && ArkComponents.propsOf ? ArkComponents.propsOf(master) : cmsBlockResolverProps(master.resolver);
  }
  function cmsMasterKind(master) { return cmsBlockResolverLabel(master && master.resolver); }
  function cmsSeoValue(value) {
    value = value || {};
    return { t: value.title || '', d: value.description || '', img: value.ogImage || '', can: value.canonical || '' };
  }
  function cmsPageSeo(site, route) {
    const seo = site.seo || { pages: {}, articles: {} };
    if (route.seoArticle) return cmsSeoValue((seo.articles || {})[route.seoArticle]);
    return cmsSeoValue((seo.pages || {})[route.seoId]);
  }
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
     CMS's own editors, which mutate state.drafts/seoDraft directly in this same scope. */
  function postCmsPreviewState() {
    if (!cmsConnected || !cmsSourceSite || !cmsPreview.contentWindow) return;
    /* versionPreviewSite: a past version shown read-only from the Versions panel, which every
       reload of the frame keeps showing until "Back to current drafts" clears it */
    cmsPreviewReady = false; /* the preview re-renders from this; the design checks wait for its ready */
    cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-state', site: versionPreviewSite || cmsSourceSite }, window.location.origin);
  }
  function postCmsPreviewMode() {
    if (!cmsConnected || !cmsPreview.contentWindow) return;
    cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-mode', mode: live ? 'live' : 'edit' }, window.location.origin);
  }
  /* `key` is optional and only ever passed by the Layers panel's eye icon (Part B): it lets a
     hide toggle target a row that is not the current selection, reusing the exact same
     ArkLayout.set() mechanism (via js/main.js's setCmsLayoutFrameForKey) rather than first
     having to select that row. Every existing caller (Frame/Layout/Spacing/Typography/Fill/
     Size/Effects) omits it and keeps acting on cmsExactSelection, unchanged. */
  function postCmsLayoutCommand(frame, key) {
    if (!cmsConnected || !cmsPreview.contentWindow) return;
    cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-layout-command', frame, key }, window.location.origin);
  }
  function postCmsLayoutReset() {
    if (!cmsConnected || !cmsPreview.contentWindow) return;
    cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-layout-reset', breakpoint: ['desktop', 'tablet', 'phone'][device] }, window.location.origin);
  }
  /* Frame/Layout/Spacing/Typography/Fill/Size/Effects edits, and group/ungroup/align/
     distribute, all post straight to the iframe and never touched this page's own
     undoStack/redoStack (the dense-node projection's own history, used for content edits) --
     so Ctrl+Z silently did nothing for any style or structural edit. The real undo history for
     these lives in the iframe next to cmsLayoutDraft (js/main.js), covering every operation
     uniformly; this page just relays the request and tracks whether one is available so
     undo()/redo() below can try it first, and so the toolbar buttons reflect it. */
  let cmsLayoutCanUndo = false, cmsLayoutCanRedo = false;
  function postCmsLayoutUndo() { if (!cmsConnected || !cmsPreview.contentWindow) return; cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-layout-undo' }, window.location.origin); }
  function postCmsLayoutRedo() { if (!cmsConnected || !cmsPreview.contentWindow) return; cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-layout-redo' }, window.location.origin); }
  /* STEP 1 CLEANUP: undo()/redo() used to fall back to this document's own dense undoStack/
     redoStack when the connected relay had nothing to undo; that dense op-log is deleted
     along with the rest of the standalone engine, so the only real undo history left is the
     one already relayed from the iframe (see the comment above). */
  function undo() { if (cmsLayoutCanUndo) postCmsLayoutUndo(); }
  function redo() { if (cmsLayoutCanRedo) postCmsLayoutRedo(); }
  /* Grouping lives in ArkLayout (the real DOM), not the CMS content tree the Layers tab
     walks, so a new group never showed up anywhere in the sidebar -- not a UI oversight, the
     two are genuinely different trees. This is that reflection: the iframe reports the
     current route's real groups on every selection/group/ungroup/ready message, and a group
     here is clickable to select it back in the canvas. */
  let cmsGroups = [];
  function postCmsSelectGroup(id) { if (!cmsConnected || !cmsPreview.contentWindow) return; cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-select-group', id }, window.location.origin); }
  /* Part B of the follow-up Studio plan: a real layers tree for connected mode. The iframe
     reports the current route's real DOM tree (js/main.js's cmsRealTree) on every ready/
     select/layout-change/components-replace message, the same "iframe reports its own real
     state" pattern cmsGroups above already uses -- never a separate poll. */
  let cmsTree = [];
  /* Select any annotated element by its stable key -- generalizes postCmsSelectGroup's
     existing message (select-by-group-id) rather than inventing a sibling message type, since
     js/main.js's handler for it is a two-line difference, not a different operation. */
  function postCmsSelectKey(key) { if (!cmsConnected || !cmsPreview.contentWindow) return; cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-select-group', key }, window.location.origin); }
  /* Rename a Layers panel row: writes through ArkLayout.setLabel inside the iframe, the same
     draft-mutate-then-relay shape every other layout edit already follows. */
  function postCmsSetLabel(key, label) { if (!cmsConnected || !cmsPreview.contentWindow) return; cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-set-label', route: cmsPreviewRoute, key, label }, window.location.origin); }
  /* a plain image's alt text, stored in ArkLayout.alts under the same route/key as every other per-element edit (js/main.js 'defxn-cms-preview-set-alt') */
  function postCmsSetAlt(key, alt) { if (!cmsConnected || !cmsPreview.contentWindow) return; cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-set-alt', route: cmsPreviewRoute, key, alt }, window.location.origin); }
  /* Delete/Backspace in connected mode: keyboard focus normally lives inside cmsPreview's own
     document once a real element is selected there (js/main.js gained its own keydown listener
     for that, Part A), so this parent handler's Delete/Backspace branch below only actually
     needs this for the one case where focus stayed in THIS document instead -- e.g. right
     after clicking a "Groups on this page" row, a parent-document button. js/main.js already
     knows the real selection (cmsPreviewSelected); this just asks it to act on it, the same
     "forward to the iframe" shape postCmsSelectGroup/postCmsLayoutOperation already use. */
  function postCmsRemoveSelection() { if (!cmsConnected || !cmsPreview.contentWindow) return; cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-remove-selection' }, window.location.origin); }
  /* Every place on the current page a Library block could be inserted, with whether a block
     there would be visible (js/main.js's cmsInsertionPoints) -- reported with every selection
     and components change, since "after the selection" depends on the selection. */
  let cmsInsertPoints = [];
  /* What each state group on the previewed page is SHOWING ({ groupId: index }), reported by
     the preview -- separate from the draft's saved `current`, which is the group's default
     (js/main.js's cmsStatesShowing, regression: tests/cms-states-preview-default.cjs). */
  let cmsStatesShowing = {};
  function postCmsComponentsCommand(payload) {
    if (!cmsConnected || !cmsPreview.contentWindow) return;
    cmsPreview.contentWindow.postMessage(Object.assign({ type: 'defxn-cms-preview-components-command' }, payload), window.location.origin);
  }
  function cmsNextComponentId(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  /* Layered states (js/content/states.js): add-state/remove-state/remove-group/set-
     trigger/set-default/preview all post straight to the iframe, same shape as
     postCmsComponentsCommand above -- creating the group itself ("Make into states")
     is a direct call inside the iframe instead, since it acts on the selection that
     already lives there (see js/main.js's cmsMakeStates, mirroring cmsGroupSelection). */
  function postCmsStatesCommand(payload) {
    if (!cmsConnected || !cmsPreview.contentWindow) return;
    cmsPreview.contentWindow.postMessage(Object.assign({ type: 'defxn-cms-preview-states-command' }, payload), window.location.origin);
  }
  /* Canvas-only mode (Part G): a field edit (effect/duration/easing) posts straight to
     the iframe -- the exact same "this document has no copy of the real sanitize(),
     compute it once inside the iframe that does" shape as postCmsStatesCommand above --
     and "Preview this transition" is a separate one-shot message with no patch, handled
     entirely inside the iframe against its own persistent layer. */
  function postCmsCanvasTransitionsCommand(patch) {
    if (!cmsConnected || !cmsPreview.contentWindow) return;
    cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-canvas-transitions-command', patch }, window.location.origin);
  }
  function postCmsCanvasTransitionPreview() {
    if (!cmsConnected || !cmsPreview.contentWindow) return;
    cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-canvas-transitions-preview' }, window.location.origin);
  }
  /* Animation-only mode (Part H): the exact same shape as postCmsCanvasTransitionsCommand/
     postCmsCanvasTransitionPreview above, substituting element-motion's own route+key
     addressing (resolved inside the iframe from cmsPreviewSelected, the same selection
     cmsExactSelection here already mirrors) for canvas-transitions' single global object. */
  function postCmsElementMotionCommand(patch) {
    if (!cmsConnected || !cmsPreview.contentWindow) return;
    cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-element-motion-command', patch }, window.location.origin);
  }
  function postCmsElementMotionPreview(key) {
    if (!cmsConnected || !cmsPreview.contentWindow) return;
    cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-element-motion-preview', key }, window.location.origin);
  }
  function postCmsLayoutOperation(operation) {
    if (!cmsConnected || !cmsPreview.contentWindow) return;
    cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-layout-operation', operation }, window.location.origin);
  }
  /* STEP 1 CLEANUP: selectCmsPreviewKey() resolved a manifest-field key back to the (now
     deleted) dense bound node so the deleted "Authoritative content" textarea could edit it
     -- see the note above collectCmsPatches(). Deleted with it; the real Layers tree (Part B)
     already selects real elements by key via postCmsSelectKey/cmsExactSelection, unaffected. */
  function syncCmsPreview(force) {
    if (!cmsConnected) return;
    const route = cmsCurrentRoute || '/';
    if (force || cmsPreviewRoute !== route || !cmsPreview.getAttribute('src')) {
      cmsExactSelection = null; cmsExactSelections = [];
      cmsPreviewRoute = route; cmsPreviewReady = false;
      cmsPreview.src = 'index.html?cms-preview=1#' + route;
    }
  }
  cmsPreview.addEventListener('load', () => { postCmsPreviewState(); postCmsPreviewMode(); layoutStage(); });

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
  let device = 0, live = false, view = 'design';
  const DEVICES = [['Desktop', 1280], ['Tablet', 820], ['Phone', 390]];
  const stage = $('stage'), wrap = $('canvasWrap');
  let scale = 1;
  function layoutStage() {
    if (state.kind !== 'studio' || view !== 'design') return;
    const avail = wrap.clientWidth - (live ? 0 : 32);
    const w = live && device === 0 ? avail : DEVICES[device][1];
    scale = live && device === 0 ? 1 : Math.min(1, avail / w);
    cmsPreview.style.width = w + 'px'; stage.style.width = w + 'px';
    cmsPreview.style.height = (live ? Math.max(600, wrap.clientHeight) : Math.max(720, Math.round(w * .72))) + 'px';
    stage.style.transform = scale < 1 ? `scale(${scale})` : '';
    stage.style.marginLeft = scale < 1 ? '0' : 'auto';
    const h = cmsPreview.offsetHeight;
    stage.style.marginBottom = scale < 1 ? `${-(h - h * scale)}px` : '0';
    const routeTitle = (cmsRoutes.find((r) => r.path === cmsCurrentRoute) || {}).title || cmsCurrentRoute;
    $('devName').textContent = `${routeTitle} · ${DEVICES[device][0]} · ${w} px`;
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
  /* true while the preview's own right-click menu is open: the toolbar is drawn over the
     iframe where that menu opens and would swallow its clicks (js/main.js setCmsContextMenuOpen) */
  let cmsContextMenuOpen = false;
  function selToolbarVisible() { return !live && view === 'design' && !cmsContextMenuOpen && !!(cmsExactSelection && cmsExactSelection.key); }
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
    const r = rectOfSelectionRect(cmsExactSelection && cmsExactSelection.rect);
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

  let popEl = null, popAnchor = null, popBuild = null;
  function closePop() { if (popEl) { popEl.remove(); popEl = null; } if (popAnchor) popAnchor.setAttribute('aria-expanded', 'false'); popAnchor = null; popBuild = null; }
  function openPop(anchor, build, align) {
    if (popAnchor === anchor) { closePop(); return; }
    closePop();
    const p = document.createElement('div'); p.className = 'pop'; p.setAttribute('role', 'dialog');
    $('studioRoot').appendChild(p); popEl = p; popAnchor = anchor; popBuild = build; anchor.setAttribute('aria-expanded', 'true');
    p.dataset.align = align || 'left';
    build(p); positionPop();
    const f = p.querySelector('button, input, select'); if (f) f.focus({ preventScroll: true });
  }
  function positionPop() {
    if (!popEl || !popAnchor) return;
    const r = popAnchor.getBoundingClientRect(), pw = popEl.offsetWidth, ph = popEl.offsetHeight;
    let left = popEl.dataset.align === 'right' ? r.right - pw : r.left;
    left = Math.max(8, Math.min(left, innerWidth - pw - 8));
    let top = r.bottom + 6; if (top + ph > innerHeight - 8) top = Math.max(8, r.top - ph - 6);
    popEl.style.left = left + 'px'; popEl.style.top = top + 'px';
  }
  function refreshPop() {
    if (!popEl || !popBuild) return;
    if (popBuild.holdWhileEditing && popEl.contains(document.activeElement) && document.activeElement.matches('input, textarea, select')) return;
    const sc = popEl.scrollTop; popEl.textContent = ''; popBuild(popEl); popEl.scrollTop = sc; positionPop();
  }
  headerReady = true;
  document.addEventListener('pointerdown', (e) => { if (popEl && !popEl.contains(e.target) && !(popAnchor && popAnchor.contains(e.target))) closePop(); });
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

  /* STEP 1 CLEANUP: the #btnAdd popover (sections/elements/live-data tiles) only ever
     inserted into the dense tree -- deleted with it. #btnAdd is already CSS-hidden when
     connected (.cms-connected #btnAdd{display:none}), so this leaves no dead button. */
  function openRoute(path) {
    if (!path || path === cmsCurrentRoute) { if (view !== 'design') setView('design'); return; }
    cmsCurrentRoute = path;
    if (view !== 'design') setView('design');
    schedule();
  }

  /* =========================================================================
     Left rail: layers and pages
     ========================================================================= */
  const collapsedLayers = new Set();
  /* STEP 1 CLEANUP: renderLayers() (the dense-array walker, with its own drag-to-reorder via
     commitSeq) is deleted outright. renderLayersPane() below now always calls
     renderConnectedLayers() -- the real, connected-mode Layers tree (Part B) that already
     existed alongside it and shares zero code with it. */
  /* A real HTML tag has no TYPE_ICON slot (that array is indexed by the standalone dense-node
     TYPE enum) -- a small, purely cosmetic lookup, not a structural decision, so an unlisted
     tag just falls back to the generic 'box' icon rather than needing every real tag covered. */
  const CMS_TAG_ICON = { header: 'section', main: 'page', footer: 'section', section: 'section', article: 'article', nav: 'row', aside: 'box', div: 'box', h1: 'heading', h2: 'heading', h3: 'heading', h4: 'heading', p: 'text', a: 'link', button: 'button', img: 'image', svg: 'image', canvas: 'spark', video: 'image', picture: 'image', figure: 'image', form: 'field', ul: 'list', ol: 'list', li: 'box', span: 'text', strong: 'text', small: 'text', table: 'list', label: 'field' };
  /* Part B of the follow-up Studio plan: the connected-mode equivalent of renderLayers(),
     driven by cmsRealTree's payload (the real rendered DOM, reported by js/main.js) instead of
     the standalone dense-node tree. Deliberately NOT built by extending renderLayers() itself:
     that function is entangled with drag-reorder/dataset.id-as-number concepts a real DOM
     tree can't support (real elements can't be freely reordered the way standalone canvas
     nodes can) -- a parallel function keeps that entanglement out, while still reusing the
     exact same row markup conventions (.layer-toggle, role=treeitem, aria-selected, depth
     indentation via paddingLeft, the collapsedLayers Set -- which already tolerates the real
     string keys used here just as well as the standalone numeric ids it was written for). */
  function renderConnectedLayers() {
    const ul = $('layers'); if (ul.hidden) return; ul.textContent = '';
    const isSelectedKey = (key) => (cmsExactSelection && cmsExactSelection.key === key) || cmsExactSelections.some((s) => s && s.key === key);
    const walk = (row, depth) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'treeitem'); li.setAttribute('aria-selected', String(isSelectedKey(row.key)));
      li.style.paddingLeft = 6 + depth * 12 + 'px';
      if (row.hidden) li.style.opacity = '.55';
      li.innerHTML = `${row.hasChildren ? `<button class="layer-toggle" type="button" aria-label="${collapsedLayers.has(row.key) ? 'Expand' : 'Collapse'} ${esc(row.label)}" aria-expanded="${!collapsedLayers.has(row.key)}"></button>` : '<span class="layer-spacer"></span>'}${ic(CMS_TAG_ICON[row.tag] || 'box')}<input class="ctl nm-edit" aria-label="Layer name"><button class="btn icon quiet row-act eye-toggle" type="button" aria-pressed="${String(!!row.hidden)}" aria-label="${row.hidden ? 'Show' : 'Hide'} ${esc(row.label)}" title="${row.hidden ? 'Show this element' : 'Hide this element'}"></button>`;
      const nameInput = li.querySelector('.nm-edit');
      nameInput.value = row.label; nameInput.style.flex = '1 1 auto'; nameInput.style.minWidth = '0'; nameInput.style.padding = '2px 5px';
      nameInput.addEventListener('click', (event) => event.stopPropagation());
      nameInput.addEventListener('change', () => postCmsSetLabel(row.key, nameInput.value.trim()));
      const eyeBtn = li.querySelector('.eye-toggle');
      eyeBtn.innerHTML = ic('eye', 'sm'); if (row.hidden) eyeBtn.style.opacity = '1';
      eyeBtn.addEventListener('click', (event) => { event.stopPropagation(); postCmsLayoutCommand({ display: row.hidden ? null : 'hide' }, row.key); });
      if (row.hasChildren) li.querySelector('.layer-toggle').addEventListener('click', (event) => { event.stopPropagation(); if (collapsedLayers.has(row.key)) collapsedLayers.delete(row.key); else collapsedLayers.add(row.key); renderConnectedLayers(); });
      li.addEventListener('click', (event) => { if (event.target.closest('.layer-toggle') || event.target.closest('.eye-toggle') || event.target.closest('.nm-edit')) return; postCmsSelectKey(row.key); });
      ul.appendChild(li);
      if (!collapsedLayers.has(row.key)) row.children.forEach((child) => walk(child, depth + 1));
    };
    if (!cmsTree.length) { const empty = document.createElement('li'); empty.className = 'hint'; empty.style.padding = '8px 10px'; empty.textContent = 'No layout-tagged elements on this page yet.'; ul.appendChild(empty); return; }
    cmsTree.forEach((row) => walk(row, 0));
  }
  /* The Layers tab (and the main render loop below) always goes through this one dispatcher
     instead of calling renderConnectedLayers() directly -- room for a future second branch
     without a bespoke call site. Step 4: restrictMode's canvas-mode placeholder branch is
     gone (canvas-transitions is a selection-independent popover now, see
     openCanvasTransitionsPopover() below, with nothing left for the Layers tab to override);
     renderGroupsBrowse() (the relocated "Groups on this page" list, Step 4) is painted here
     too since every call site that repaints the Layers tree also needs it kept in sync. */
  function renderLayersPane() {
    renderGroupsBrowse();
    renderConnectedLayers();
  }
  /* "Groups on this page": a page-level browse/jump list (a real, clickable list of the
     current route's groups, click -> postCmsSelectGroup) that needs no current selection to
     make sense -- unlike every taxonomy section in the new #selToolbar (Step 4), which only
     exists because something is selected. Ported verbatim from the old 'cms-groups'
     accordion that used to sit at the top of renderElementPane(), just a new home. */
  function renderGroupsBrowse() {
    const box = $('groupsBrowse'); if (!box) return;
    box.textContent = '';
    if (!cmsGroups.length) { box.hidden = true; return; }
    box.hidden = false;
    const head = document.createElement('div'); head.className = 'groups-browse-head'; head.textContent = `Groups on this page (${cmsGroups.length})`; box.appendChild(head);
    const currentGroupId = cmsExactSelection && cmsExactSelection.key && cmsExactSelection.key.indexOf('group:') === 0 ? cmsExactSelection.key.slice(6) : null;
    for (const g of cmsGroups) {
      const row = document.createElement('button'); row.type = 'button'; row.className = 'myrow'; row.style.width = '100%'; row.style.marginBottom = '4px'; row.style.cursor = 'pointer';
      row.innerHTML = `${ic('box', 'sm')}<span></span><small></small>`;
      row.querySelector('span').textContent = g.label; row.querySelector('small').textContent = `${g.members} layers`;
      if (g.id === currentGroupId) { row.style.borderColor = 'var(--accent)'; row.style.color = 'var(--accent)'; }
      row.addEventListener('click', () => postCmsSelectGroup(g.id));
      box.appendChild(row);
    }
  }
  /* Real link index for the Pages tab/Sitemap/design-checks (Step 1 port): every manifest
     'link'-kind field value is tagged route:<key> / doc:<path> / url:<address>
     (js/content/manifest.js; parsed exactly like js/ark/dash-kit.js's resolveLinkField), so an
     internal "route:" link is resolved against cmsRoutes' own key -> path map. Replaces the
     deleted dense linkIndex(), which walked the dense tree's own href strings instead. */
  function realLinkIndex() {
    const out = [], manifests = (cmsSourceSite && cmsSourceSite.manifests) || [];
    const byKey = new Map(cmsRoutes.map((r) => [r.key, r.path]));
    for (const m of manifests) {
      const src = m.route || 'nav';
      for (const field of Object.values(m.fields || {})) {
        if (field.kind !== 'link') continue;
        const mm = /^(route|doc|url):(\S+)/.exec(field.value || '');
        if (!mm) continue;
        if (mm[1] === 'url') continue; // external, not part of the internal site graph
        const tgt = mm[1] === 'route' ? byKey.get(mm[2]) : mm[2];
        out.push({ src, tgt: tgt || null, ok: !!tgt });
      }
    }
    return out;
  }
  function renderPages() {
    const ul = $('pages'); if ($('pagesPane').hidden) return; ul.textContent = '';
    const inbound = new Map(); for (const l of realLinkIndex()) if (l.ok && l.tgt !== l.src) inbound.set(l.tgt, (inbound.get(l.tgt) || 0) + 1);
    const sorted = cmsRoutes.slice().sort((a, b) => a.path.localeCompare(b.path));
    for (const route of sorted) {
      const depth = Math.max(0, route.path.split('/').filter(Boolean).length - 1);
      const li = document.createElement('li'); li.setAttribute('aria-selected', String(route.path === cmsCurrentRoute)); li.style.paddingLeft = 6 + depth * 14 + 'px';
      const orphan = route.path !== '/' && !inbound.get(route.path);
      li.innerHTML = `${ic(route.seoArticle ? 'article' : route.path === '/' ? 'home' : 'page')}<span class="nm"></span>${orphan ? '<span class="tag" style="color:var(--warn);border-color:currentColor" title="No page links here">orphan</span>' : ''}<span class="sub"></span>`;
      li.querySelector('.nm').textContent = route.title || route.path; li.querySelector('.sub').textContent = route.path;
      /* a row that opens a page is a button to the keyboard and to assistive tech too -- it was a
         bare clickable <li>, unreachable by Tab (regression: tests/cms-pages-rows-are-buttons.cjs) */
      li.setAttribute('role', 'button'); li.tabIndex = 0; li.title = 'Open ' + route.path + ' on the canvas';
      li.addEventListener('click', () => openRoute(route.path));
      li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRoute(route.path); } });
      ul.appendChild(li);
    }
  }
  function showLeft(which) { $('tabLayers').setAttribute('aria-selected', String(which === 'layers')); $('tabPages').setAttribute('aria-selected', String(which === 'pages')); $('tabLib').setAttribute('aria-selected', String(which === 'lib')); $('layers').hidden = which !== 'layers'; $('pagesPane').hidden = which !== 'pages'; $('libPane').hidden = which !== 'lib'; schedule(); }
  $('tabLib').addEventListener('click', () => showLeft('lib'));
  $('tabLayers').addEventListener('click', () => showLeft('layers'));
  $('tabPages').addEventListener('click', () => showLeft('pages'));

  /* page switcher popover in the top bar */
  function renderPageBtn() {
    const b = $('btnPage'), route = cmsRoutes.find((r) => r.path === cmsCurrentRoute);
    b.innerHTML = `${ic(route && route.seoArticle ? 'article' : cmsCurrentRoute === '/' ? 'home' : 'page')}<span></span><small></small>${ic('chev', 'sm')}`;
    b.children[1].textContent = (route && route.title) || cmsCurrentRoute; b.children[2].textContent = cmsCurrentRoute;
  }
  $('btnPage').addEventListener('click', (e) => openPop(e.currentTarget, (p) => {
    const h = document.createElement('h4'); h.textContent = 'Pages'; p.appendChild(h);
    const sorted = cmsRoutes.slice().sort((a, b) => a.path.localeCompare(b.path));
    const actions = [{ icon: 'sitemap', label: 'Open the sitemap', run: () => setView('map') }];
    menu(p, [...sorted.map((route) => ({ icon: route.seoArticle ? 'article' : route.path === '/' ? 'home' : 'page', label: route.title || route.path, hint: route.path, on: route.path === cmsCurrentRoute, run: () => openRoute(route.path) })), '-', ...actions]);
  }));

  function renderInspector() {
    renderSelToolbar();
    refuse($('btnUndo'), cmsLayoutCanUndo ? '' : 'Nothing to undo: no layout or style edit on the canvas yet.');
    refuse($('btnRedo'), cmsLayoutCanRedo ? '' : 'Nothing to redo: undo an edit first.');
    const bn = $('bpNote'); bn.hidden = device === 0 || live || view !== 'design';
    bn.title = device ? `Editing ${DEVICES[device][0].toLowerCase()} overrides: changes apply at this size only` : '';
    bn.innerHTML = device ? `${ic('warn', 'sm')}<span class="bp-text">${DEVICES[device][0]} overrides</span>` : '';
  }

  /* The one header's state (admin-app.html's #appBar): which Design view is pressed, and the
     canvas-only groups -- page picker, page SEO, rail toggle, breakpoints, undo/redo, Design
     check, Edit/Live -- shown only in Design -> Canvas, where they act on something. Called
     from renderList() (every kind change) and setView() (canvas <-> sitemap); `headerReady`
     holds it off until this block's own `let view` exists. */
  function syncHeader() {
    if (!headerReady) return;
    const studio = state.kind === 'studio', canvas = studio && view === 'design';
    $('designCanvasBtn').setAttribute('aria-pressed', String(canvas));
    $('designMapBtn').setAttribute('aria-pressed', String(studio && view === 'map'));
    $('designThemeBtn').setAttribute('aria-pressed', String(state.kind === 'design'));
    $('canvasNav').hidden = !canvas; $('canvasTools').hidden = !canvas;
    if (!canvas && popEl && $('appBar').contains(popAnchor)) closePop();
  }

  /* This page's SEO, as a popover on the header's page picker: the fields that used to fill the
     right panel's SEO tab, from the same ArkSEO definitions (seoFieldsPanel). Site-wide SEO is
     not here -- it is site config, so it sits in Theme & defaults (buildSiteSeoPanel). */
  function renderPageSeoPop(p) {
    p.classList.add('seo-pop');
    const route = cmsRoutes.find((r) => r.path === cmsCurrentRoute) || { path: cmsCurrentRoute };
    const head = document.createElement('h4'); head.textContent = 'SEO \u00b7 ' + (route.title || route.path); p.appendChild(head);
    if (!window.ArkSEO) { p.appendChild(h('p', { class: 'hint', text: 'SEO editing is unavailable: js/content/seo.js did not load into the editor. Reload; if it persists, check admin-app.html still includes it.' })); return; }
    const map = route.seoArticle ? 'articles' : 'pages', id = route.seoArticle || route.seoId;
    if (id && seoDraft[map] && (seoDraft[map][id] || ArkSEO[map === 'pages' ? 'pageIds' : 'articleSlugs']().indexOf(id) >= 0)) {
      p.appendChild(h('p', { class: 'hint', text: (map === 'articles' ? 'Article ' : 'Page ') + id + ' \u00b7 ' + route.path + '. Blank fields derive from the page itself and the site defaults (Theme & defaults).' }));
      p.appendChild(seoFieldsPanel(ArkSEO.OVERRIDE_FIELDS, () => seoOverrideTarget(map, id), seoEdited));
    } else {
      p.appendChild(h('p', { class: 'hint seo-refusal', text: 'No SEO entry for ' + route.path + ': this route has no page id or article slug in js/pages/catalog.js, so there is nothing to store an override under. Give its catalog entry a seoId (pages) or seoArticle (articles) and it gets these fields.' }));
    }
    const site = document.createElement('button'); site.type = 'button'; site.className = 'btn small'; site.textContent = 'Site-wide SEO and AI crawlers';
    site.title = 'Theme & defaults holds the settings every page shares';
    site.addEventListener('click', () => { closePop(); openSiteSeo(); });
    p.appendChild(site);
  }
  /* a repaint (refreshPop, on every preview message) must not pull the caret out of a field */
  renderPageSeoPop.holdWhileEditing = true;
  function openPageSeo() { if (popAnchor !== $('btnPageSeo')) openPop($('btnPageSeo'), renderPageSeoPop, 'left'); }
  $('btnPageSeo').addEventListener('click', (e) => openPop(e.currentTarget, renderPageSeoPop, 'left'));
  /* Theme & defaults, scrolled to its site-wide SEO section */
  function openSiteSeo() {
    selectDesign();
    const box = $('siteSeo'); if (box) box.scrollIntoView({ block: 'start' });
  }

  /* The structure rail (Layers / Pages / Library) folds away so the canvas can take the full
     width; remembered per browser, a convenience only. */
  function setLeftRail(open) {
    $('shell').classList.toggle('rail-closed', !open);
    const b = $('btnLeftRail'); b.setAttribute('aria-pressed', String(open));
    b.title = open ? 'Hide the Layers / Pages / Library panel' : 'Show the Layers / Pages / Library panel';
    try { localStorage.setItem('defxn-studio-rail', open ? 'open' : 'closed'); } catch (e) {}
    layoutStage();
  }
  $('btnLeftRail').addEventListener('click', () => setLeftRail($('shell').classList.contains('rail-closed')));
  try { if (localStorage.getItem('defxn-studio-rail') === 'closed') { $('shell').classList.add('rail-closed'); $('btnLeftRail').setAttribute('aria-pressed', 'false'); } } catch (e) {}

  /* =========================================================================
     Step 4 (flickering-juggling-donut.md): consolidated control-builder functions.
     field/segField/selectField/swatchField used to be copy-pasted 3 separate times (the
     canvas-transitions pane, the element-motion pane, and the big per-element Frame/
     Layout/Spacing/Typography/Fill/Size/Effects block) -- all three shared the exact same
     DOM-building logic and differed only in WHERE a value is read from and WHERE a change
     is posted to. These are now ONE module-level set, parameterized by a small `ctx`
     object each caller supplies: `{ get(key), set(key, value) }`. `get` returns the
     control's current value; `set` performs the patch (and, when the change could affect
     what the panel should show next -- e.g. Display deciding whether Gap/Align/Justify
     appear -- `set` is also where a caller triggers its own re-render). This is a small,
     deliberate simplification over the 3 originals: those called an explicit re-render
     after a segField/swatchField click but not after a field/selectField change (relying
     on the plain <input>/<select> to already show its own new value); every ctx.set() here
     re-renders unconditionally instead, which is safe (these all fire on 'change', after
     the control has already lost focus, never on every keystroke) and removes the need to
     reason about which of the 4 builders needs the extra call. */
  /* opts.type 'text' or 'textarea' makes this a free-text field (the SEO panels' titles,
     URLs and summaries) -- same row, same ctx contract, the value passed through as a
     string instead of a Number; the default is the original numeric field. */
  function ctlField(ctx, label, key, opts) {
    opts = opts || {};
    const row = document.createElement('div'); row.className = 'row'; const l = document.createElement('label'); l.textContent = label;
    const textual = opts.type === 'text' || opts.type === 'textarea';
    const input = document.createElement(opts.type === 'textarea' ? 'textarea' : 'input'); input.className = 'ctl';
    if (!textual) {
      input.type = 'number';
      input.step = opts.step != null ? String(opts.step) : '1';
      if (opts.min != null) input.min = String(opts.min);
      if (opts.max != null) input.max = String(opts.max);
    } else {
      if (opts.type === 'text') input.type = 'text';
      if (opts.placeholder) input.placeholder = opts.placeholder;
      input.spellcheck = opts.spellcheck !== false;
    }
    if (opts.name) input.name = opts.name;
    /* opts.ariaLabel: a name that says more than the visible label ("Definition heading");
       opts.data: dataset entries a reader finds the field by (the new-block form's data-prop) */
    Object.keys(opts.data || {}).forEach((k) => { input.dataset[k] = opts.data[k]; });
    input.value = String(ctx.get(key) ?? (textual ? '' : 0)); input.setAttribute('aria-label', opts.ariaLabel || label);
    input.addEventListener('change', () => { if (textual) { ctx.set(key, input.value); return; } const v = Number(input.value); if (Number.isFinite(v)) ctx.set(key, v); });
    row.append(l, input, document.createElement('span')); return row;
  }
  /* What a choice is called, derived from the value it writes: 'text-muted' -> "Text muted",
     'h1' -> "H1", 700 -> "700". Segmented and select controls take a label FUNCTION of the
     value, never a list of labels parallel to the list of values: the parallel list drifted --
     the Radius control's third button read "Pill" and wrote the `control` token -- and a
     function of the value cannot point at a neighbour's (regression: tests/admin-control-labels.cjs). */
  function ctlLabel(value) {
    const text = String(value).replace(/-/g, ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  function ctlSegField(ctx, label, key, options, labelOf) {
    const name = labelOf || ctlLabel;
    const row = document.createElement('div'); row.className = 'row'; const l = document.createElement('label'); l.textContent = label;
    const seg = document.createElement('div'); seg.className = 'ctl-seg';
    options.forEach((opt) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = name(opt);
      b.setAttribute('aria-pressed', String(ctx.get(key) === opt));
      b.addEventListener('click', () => { if (ctx.get(key) !== opt) ctx.set(key, opt); });
      seg.appendChild(b);
    });
    row.append(l, seg, document.createElement('span')); return row;
  }
  /* opts.ariaLabel as in ctlField; the value is written as the option's string */
  function ctlSelectField(ctx, label, key, options, labelOf, opts) {
    const name = labelOf || ctlLabel;
    opts = opts || {};
    const row = document.createElement('div'); row.className = 'row'; const l = document.createElement('label'); l.textContent = label;
    const s = document.createElement('select'); s.className = 'ctl'; s.setAttribute('aria-label', opts.ariaLabel || label);
    options.forEach((v) => { const o = document.createElement('option'); o.value = String(v); o.textContent = name(v); s.appendChild(o); });
    s.value = String(ctx.get(key) ?? '') || String(options[0]);
    s.addEventListener('change', () => ctx.set(key, s.value));
    row.append(l, s, document.createElement('span')); return row;
  }
  function ctlSwatchField(ctx, label, key, tokens, allowNone) {
    const row = document.createElement('div'); row.className = 'row'; const l = document.createElement('label'); l.textContent = label;
    const sw = document.createElement('div'); sw.className = 'swatches';
    const pick = (v) => ctx.set(key, v);
    if (allowNone) { const b = document.createElement('button'); b.type = 'button'; b.className = 'none'; b.title = 'None'; b.setAttribute('aria-label', 'None'); b.setAttribute('aria-pressed', String(!ctx.get(key) || ctx.get(key) === 'none')); b.addEventListener('click', () => pick('none')); sw.appendChild(b); }
    tokens.forEach((tok) => { const b = document.createElement('button'); b.type = 'button'; b.title = tok; b.setAttribute('aria-label', tok); b.style.background = `hsl(var(--${tok}))`; b.setAttribute('aria-pressed', String(ctx.get(key) === tok)); b.addEventListener('click', () => pick(tok)); sw.appendChild(b); });
    row.append(l, sw, document.createElement('span')); return row;
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
    const cfg = Object.assign({}, CMS_CANVAS_TRANSITIONS_DEFAULT, (cmsSourceSite && cmsSourceSite.canvasTransitions) || {});
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
    if (popAnchor === anchor) { closePop(); return; }
    if (state.kind !== 'studio') selectStudio();
    if (view !== 'design') setView('design');
    openPop(anchor, renderCanvasTransitionsPopoverContent, 'left');
  }
  $('designBackgroundBtn').addEventListener('click', openCanvasTransitionsPopover);
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
    return walk(cmsTree);
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
    const frame = cmsExactSelection.frame || {}, rect = cmsExactSelection.rect || {};
    const draft = { ...frame };
    const values = { x: frame.x == null ? 0 : frame.x, y: frame.y == null ? 0 : frame.y, width: frame.width == null ? rect.width : frame.width, height: frame.height == null ? rect.height : frame.height, rotation: frame.rotation == null ? 0 : frame.rotation, scaleX: frame.scaleX == null ? 1 : frame.scaleX, scaleY: frame.scaleY == null ? 1 : frame.scaleY };
    return {
      get: (key) => (key in values ? values[key] : draft[key]),
      set: (key, value) => { draft[key] = value; cmsExactSelection.frame = { ...draft }; postCmsLayoutCommand(draft); renderSelToolbar(); },
    };
  }
  function buildFrameSection(pane, ctx, isGroup) {
    const body = toolbarSection(pane, 'cms-frame', 'Frame', 'move');
    body.append(ctlField(ctx, 'X', 'x'), ctlField(ctx, 'Y', 'y'), ctlField(ctx, 'Width', 'width'), ctlField(ctx, 'Height', 'height'), ctlField(ctx, 'Rotation', 'rotation'), ctlField(ctx, 'Scale X', 'scaleX', { step: '0.01' }), ctlField(ctx, 'Scale Y', 'scaleY', { step: '0.01' }));
    const meta = document.createElement('p'); meta.className = 'hint'; meta.textContent = `${cmsExactSelection.breakpoint || 'desktop'} · ${cmsExactSelection.key}`; body.appendChild(meta);
    const reset = document.createElement('button'); reset.className = 'btn small'; reset.type = 'button'; reset.textContent = 'Reset this breakpoint'; reset.addEventListener('click', postCmsLayoutReset); body.appendChild(reset);
    if (cmsExactSelections.length > 1) {
      const align = document.createElement('div'); align.style.display = 'grid'; align.style.gridTemplateColumns = 'repeat(3,minmax(0,1fr))'; align.style.gap = '5px'; align.style.marginTop = '8px';
      [['Left', 'left'], ['Center X', 'hcenter'], ['Right', 'right'], ['Top', 'top'], ['Center Y', 'vcenter'], ['Bottom', 'bottom']].forEach(([label, op]) => { const b = document.createElement('button'); b.className = 'btn small'; b.type = 'button'; b.textContent = label; b.addEventListener('click', () => postCmsLayoutOperation(op)); align.appendChild(b); });
      body.appendChild(align);
      const group = document.createElement('button'); group.className = 'btn small primary'; group.type = 'button'; group.textContent = 'Group selection'; group.style.marginTop = '6px'; group.addEventListener('click', () => postCmsLayoutOperation('group')); body.appendChild(group);
      if (cmsExactSelections.length > 2) { const distribute = document.createElement('div'); distribute.style.display = 'flex'; distribute.style.gap = '5px'; distribute.style.marginTop = '6px'; [['Distribute X', 'distribute-horizontal'], ['Distribute Y', 'distribute-vertical']].forEach(([label, op]) => { const b = document.createElement('button'); b.className = 'btn small'; b.type = 'button'; b.textContent = label; b.addEventListener('click', () => postCmsLayoutOperation(op)); distribute.appendChild(b); }); body.appendChild(distribute); }
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
    const alt = cmsExactSelection.alt;
    if (!alt) {
      body.appendChild(h('p', { class: 'hint', text: 'This element has no text alternative of its own to set: alt text belongs on the <img> (or the <svg>, <canvas> or <video>) itself. Select the image inside it in Layers to describe it.' }));
      return;
    }
    const saved = window.ArkLayout ? ArkLayout.altFor(layoutDraft, cmsExactSelection.route, cmsExactSelection.key) : '';
    const ctx = { get: () => saved, set: (_key, value) => postCmsSetAlt(cmsExactSelection.key, value) };
    const row = ctlField(ctx, alt.attr === 'alt' ? 'Alt text' : 'Label', 'alt', { type: 'textarea', name: 'alt-text',
      placeholder: alt.own ? 'Page default: ' + alt.own : alt.own === '' || alt.decorative ? 'Page default: decorative (screen readers skip it)' : 'Describe what this image shows' });
    row.classList.add('alt-row');
    body.appendChild(row);
    body.appendChild(h('p', { class: 'hint', text: (alt.attr === 'alt' ? 'Read aloud by screen readers and shown if the image fails to load.' : 'Sets this ' + (cmsTreeRowForKey(cmsExactSelection.key) || {}).tag + "'s accessible name (aria-label)" + (alt.decorative ? ', and stops treating it as decorative' : '') + '.') + ' Blank keeps the page\'s own value. Saved with the layout.' }));
  }
  /* A selected element that is a reusable-component instance root (js/content/
     components.js tags it; cmsSelectionInfo in js/main.js reports it as
     cmsExactSelection.component) gets its own override section, ALONGSIDE -- not instead
     of -- the taxonomy section(s) above, since an instance is both a positioned element and
     a content block. Each field writes a real setOverride() inside the connected preview
     iframe via postCmsComponentsCommand, the same draft-mutate-then-post shape every
     ctl*Field() above uses, just with its own one-off patch function (no shared ctx needed:
     there is exactly one control per resolver prop, not several reading/writing the same
     draft object). */
  function buildComponentInstanceSection(pane) {
    const comp = cmsExactSelection.component;
    const componentsState = (cmsSourceSite && cmsSourceSite.components) || { masters: {}, routes: {} };
    const master = componentsState.masters && componentsState.masters[comp.masterId];
    const anchorList = (componentsState.routes && componentsState.routes[cmsExactSelection.route] && componentsState.routes[cmsExactSelection.route][comp.anchorId]) || [];
    const instance = anchorList.find((item) => item.key === comp.key);
    const overrides = (instance && instance.overrides) || {};
    const body = toolbarSection(pane, 'cms-component', 'Component instance', 'comp');
    const info = document.createElement('p'); info.className = 'hint'; info.innerHTML = '<b></b><br><code></code>';
    info.querySelector('b').textContent = master ? master.label : comp.masterId;
    info.querySelector('code').textContent = master ? cmsMasterKind(master) + ' · ' + comp.anchorId : comp.anchorId;
    body.appendChild(info);
    const scope = document.createElement('p'); scope.className = 'hint';
    scope.textContent = master && master.detached ? 'Detached: this copy no longer follows any definition.' : 'Fields here override this instance only. Edit definition changes every instance.';
    body.appendChild(scope);
    /* one text field per prop (the shared ctlField): it shows the override, else the definition's value */
    const overrideCtx = { get: (prop) => (overrides[prop] !== undefined ? overrides[prop] : ((master && master.props[prop]) || '')),
      set: (prop, value) => postCmsComponentsCommand({ action: 'set-override', route: cmsExactSelection.route, anchorId: comp.anchorId, key: comp.key, propPath: prop, value }) };
    cmsMasterProps(master).forEach((prop) => {
      const row = ctlField(overrideCtx, prop, prop, { type: 'text', placeholder: (master && master.props[prop]) || '' });
      if (overrides[prop] !== undefined) row.classList.add('ovr');
      body.appendChild(row);
    });
    const actions = document.createElement('div'); actions.style.display = 'flex'; actions.style.gap = '6px'; actions.style.marginTop = '6px';
    const resetAll = document.createElement('button'); resetAll.className = 'btn small'; resetAll.type = 'button'; resetAll.textContent = 'Reset overrides';
    refuse(resetAll, Object.keys(overrides).length ? '' : 'Nothing to reset: this instance overrides none of its definition\'s fields. Edit a field above to override it here.');
    resetAll.addEventListener('click', () => Object.keys(overrides).forEach((prop) => postCmsComponentsCommand({ action: 'set-override', route: cmsExactSelection.route, anchorId: comp.anchorId, key: comp.key, propPath: prop, value: null })));
    const removeInst = document.createElement('button'); removeInst.className = 'btn small danger'; removeInst.type = 'button'; removeInst.textContent = 'Remove instance';
    removeInst.addEventListener('click', () => {
      postCmsComponentsCommand({ action: 'remove-instance', route: cmsExactSelection.route, anchorId: comp.anchorId, key: comp.key });
      cmsExactSelection = null; cmsExactSelections = []; renderInspector();
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
      postCmsComponentsCommand({ action: 'detach-instance', route: cmsExactSelection.route, anchorId: comp.anchorId, key: comp.key, id: cmsNextComponentId('m') });
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
    const groupId = cmsExactSelection.stateGroup.groupId;
    const statesState = (cmsSourceSite && cmsSourceSite.states) || { routes: {} };
    const group = (statesState.routes && statesState.routes[cmsExactSelection.route] && statesState.routes[cmsExactSelection.route][groupId]) || null;
    const body = toolbarSection(pane, 'cms-states', 'States' + (group ? ` (${group.states.length})` : ''), 'repeat');
    if (!group) {
      const missing = document.createElement('p'); missing.className = 'hint'; missing.textContent = 'This group is not on the current page.'; body.appendChild(missing);
      return;
    }
    /* What the preview SHOWS (cmsStatesShowing, reported by the preview -- a Live-mode click
       moves it too) is not the saved default (group.current): previewing a state used to
       write it as the default, so Save published whatever the editor was looking at
       (regression: tests/cms-states-preview-default.cjs). */
    const showing = typeof cmsStatesShowing[groupId] === 'number' && cmsStatesShowing[groupId] < group.states.length ? cmsStatesShowing[groupId] : group.current;
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
    triggerNote.textContent = group.trigger === 'self' ? 'Click trigger: the state-zero selection itself.' : 'Click trigger: ' + (triggerRow0 ? '"' + triggerRow0.label + '"' : 'a specific element') + ' (' + group.trigger + '). While another state shows and that element is hidden with state 0, clicking the showing state moves on.';
    body.appendChild(triggerNote);
    const triggerRow = document.createElement('div'); triggerRow.style.display = 'flex'; triggerRow.style.gap = '6px'; triggerRow.style.flexWrap = 'wrap';
    const useSelf = document.createElement('button'); useSelf.type = 'button'; useSelf.className = 'btn small'; useSelf.textContent = 'Use state-zero selection as trigger';
    refuse(useSelf, group.trigger === 'self' ? 'Already the trigger: a click on the state-zero selection moves this group on.' : '');
    useSelf.addEventListener('click', () => postCmsStatesCommand({ action: 'set-trigger', groupId, trigger: 'self' }));
    const useThis = document.createElement('button'); useThis.type = 'button'; useThis.className = 'btn small'; useThis.textContent = 'Use this element as trigger';
    refuse(useThis, !cmsExactSelection.key ? 'Select an element on the page first: the selected element becomes the trigger.' : group.trigger === cmsExactSelection.key ? 'Already the trigger: this element is what a click moves this group on with. Select another element to use it instead.' : '');
    useThis.addEventListener('click', () => postCmsStatesCommand({ action: 'set-trigger', groupId, trigger: cmsExactSelection.key }));
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
    const routes = (cmsSourceSite && cmsSourceSite.elementMotion && cmsSourceSite.elementMotion.routes) || {};
    const stored = (routes[cmsExactSelection.route] && routes[cmsExactSelection.route][cmsExactSelection.key]) || null;
    const cfg = Object.assign({}, CMS_ELEMENT_MOTION_DEFAULT_ENTRY, stored || {});
    const ctx = { get: (key) => cfg[key], set: (key, value) => postCmsElementMotionCommand({ [key]: value }) };
    const body = toolbarSection(pane, 'cms-element-motion', 'In / out animation', 'play');
    const note = document.createElement('p'); note.className = 'hint';
    note.textContent = `How "${cmsExactSelection.label || cmsExactSelection.key}" enters and leaves on route change. Overrides the default stagger for this element only; every other element keeps today's behavior.`;
    body.appendChild(note);
    body.appendChild(ctlSegField(ctx, 'Direction', 'direction', CMS_ELEMENT_MOTION_DIRECTIONS));
    body.appendChild(ctlField(ctx, 'Distance (px)', 'distance', { min: 0, max: 60, step: 1 }));
    body.appendChild(ctlField(ctx, 'Duration (ms)', 'duration', { min: 0, max: 1200, step: 10 }));
    body.appendChild(ctlField(ctx, 'Delay (ms)', 'delay', { min: 0, max: 1200, step: 10 }));
    body.appendChild(ctlSegField(ctx, 'Easing', 'easing', CMS_ELEMENT_MOTION_EASINGS));
    const preview = document.createElement('button'); preview.className = 'btn small primary'; preview.type = 'button';
    preview.textContent = 'Preview'; preview.style.marginTop = '8px';
    preview.addEventListener('click', () => postCmsElementMotionPreview(cmsExactSelection.key));
    body.appendChild(preview);
    const hint = document.createElement('p'); hint.className = 'hint';
    hint.textContent = 'Previews instantly in the connected site above -- no page navigation. Save still writes it to the project like every other Studio edit.';
    body.appendChild(hint);
  }
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
  /* tbOpen: the open section ('' = none) for the selection key tbOpenKey -- selecting
     something else closes it. tbAutoOpen: an identity section waiting for its selection
     (the preview's "created" message and the new selection are separate messages, in either
     order), dropped after a few seconds so a stale one never opens on a later selection.
     tbRoving: the bar button that holds the roving tab stop. */
  let tbOpen = '', tbOpenKey = '', tbAutoOpen = null, tbPopBody = null, tbPopTitle = '', tbRoving = '';
  const TB_FOCUSABLE = 'button:not([disabled]), input, select, textarea';
  function toolbarSection(pane, key, title, icon) {
    const name = title.replace(/\s*\(\d+\)$/, ''), count = (/\((\d+)\)$/.exec(title) || [])[1];
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tb-btn' + (key in TB_IDENTITY ? ' identity' : '');
    b.dataset.tb = key; b.dataset.section = key; b.dataset.name = name; b.dataset.tip = title;
    b.setAttribute('aria-label', title); b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-controls', 'selToolbarPop'); b.setAttribute('aria-expanded', String(tbOpen === key));
    b.innerHTML = ic(icon) + (count ? `<span class="tb-count">${count}</span>` : '');
    b.addEventListener('click', () => setToolbarSection(tbOpen === key ? '' : key, true));
    pane.appendChild(b);
    if (tbOpen !== key) return document.createElement('div');
    tbPopTitle = title; return tbPopBody;
  }
  /* open (key) or close ('') the one popover. byUser: a click or a key press, so focus moves
     into the popover on open and back to its button on close; an outside click or a new
     selection closes without taking focus anywhere. */
  function setToolbarSection(key, byUser) {
    const was = tbOpen;
    tbOpen = key; tbOpenKey = key && cmsExactSelection ? cmsExactSelection.key : '';
    if (key) { tbAutoOpen = null; tbRoving = key; }
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
      if (!cmsContextMenuOpen) tbOpen = '';
      box.hidden = true; pop.hidden = true; return;
    }
    const key = cmsExactSelection.key, kind = selToolbarKind(cmsExactSelection);
    const sameEdit = !!tbOpen && tbOpenKey === key && !pop.hidden;
    if (tbOpenKey !== key) tbOpen = '';
    if (tbAutoOpen && Date.now() - tbAutoOpen.at > 5000) tbAutoOpen = null;
    if (tbAutoOpen && kind !== 'group' && cmsExactSelection[TB_IDENTITY[tbAutoOpen.key]]) { tbOpen = tbAutoOpen.key; tbOpenKey = key; tbAutoOpen = null; }
    const active = document.activeElement, barFocus = active && box.contains(active) ? active.dataset.tb : '';
    let popFocus = null;
    if (sameEdit && active && pop.contains(active)) {
      popFocus = { i: [...pop.querySelectorAll(TB_FOCUSABLE)].indexOf(active), tag: active.tagName, typed: active.tagName === 'TEXTAREA' || (active.tagName === 'INPUT' && /^(text|number|search|url|email)$/.test(active.type)), value: active.value };
      try { popFocus.start = active.selectionStart; popFocus.end = active.selectionEnd; } catch (e) { /* number inputs have no selection */ }
    }
    const popScroll = sameEdit && pop.querySelector('.tb-pop-body') ? pop.querySelector('.tb-pop-body').scrollTop : 0;
    box.hidden = false; box.textContent = '';
    box.dataset.key = key; box.dataset.kind = kind;
    box.setAttribute('aria-label', 'Selection: ' + (cmsExactSelection.label || key));
    const row = cmsTreeRowForKey(key);
    const chip = document.createElement('span'); chip.className = 'tb-chip'; chip.title = key;
    chip.innerHTML = ic(kind === 'group' ? 'grid' : CMS_TAG_ICON[row ? row.tag : ''] || 'box', 'sm') + '<span class="tb-chip-name"></span>';
    chip.querySelector('.tb-chip-name').textContent = cmsExactSelection.label || key;
    if (device) { const bp = document.createElement('span'); bp.className = 'tb-bp'; bp.textContent = DEVICES[device][0] + ' ↓'; bp.title = `Changes apply to ${DEVICES[device][0].toLowerCase()} and smaller. Orange dots are overrides; click one to reset it.`; chip.appendChild(bp); }
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
      if (cmsExactSelection.component) buildComponentInstanceSection(box);
      if (cmsExactSelection.stateGroup) buildStateGroupSection(box);
      buildElementMotionSection(box);
    }
    if (tbOpen && !box.querySelector(`[data-section="${tbOpen}"]`)) tbOpen = '';
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
    const compRefusal = cmsExactSelections.some((sel) => sel.component || sel.stateGroup) ? 'Select page content, not an inserted block or a state group' : '';
    toolbarAction(actions, 'make-component', 'wand', 'Make into component', () => { if (cmsConnected && cmsPreview.contentWindow) cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-make-component' }, window.location.origin); }, compRefusal);
    toolbarAction(actions, 'content-cms', 'article', 'Open in Content', () => openContentEditor());
    toolbarAction(actions, 'design-controls', 'palette', 'Theme & defaults', () => selectDesign());
    /* one roving tab stop: Tab lands on the bar once, the arrow keys move along it */
    const buttons = [...box.querySelectorAll('button:not([disabled])')];
    const stop = buttons.find((b) => b.dataset.tb === (barFocus || tbRoving)) || buttons.find((b) => b.dataset.tb === tbOpen) || buttons[0];
    buttons.forEach((b) => { b.tabIndex = b === stop ? 0 : -1; });
    if (barFocus && stop) stop.focus({ preventScroll: true });
    if (tbOpen) {
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
    const btn = box.querySelector(`[data-section="${tbOpen}"]`); if (!btn) return;
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
    if (e.key === 'Escape' && tbOpen) { e.preventDefault(); e.stopPropagation(); setToolbarSection('', true); return; }
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
  document.addEventListener('pointerdown', (e) => { if (tbOpen && !$('selToolbarPop').contains(e.target) && !$('selToolbar').contains(e.target)) setToolbarSection('', false); });
  window.addEventListener('blur', () => setTimeout(() => { if (tbOpen && document.activeElement === cmsPreview) setToolbarSection('', false); }, 0));
  $('studioRoot').addEventListener('scroll', placeToolbarPop, { passive: true });
  let libKey = '';
  /* the Library's open definition editor / insertion-point picker (a master id, or '') */
  let libEditing = '', libPicking = '';
  function cmsOpenMasterInLibrary(id) {
    libEditing = id; libKey = ''; showLeft('lib'); renderLibrary();
    const row = $('libPane').querySelector('.lib-definition'); if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest' });
  }
  function postCmsHighlightPoint(id) {
    if (!cmsConnected || !cmsPreview.contentWindow) return;
    cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-highlight-point', id }, window.location.origin);
  }
  function renderLibrary() {
    const box = $('libPane'); if (box.hidden) return;
    {
      /* Reusable components (js/content/components.js): masters/instances/overrides are real
         DEFXN runtime state, round-tripped through the connected preview iframe exactly like
         every other authoritative edit here -- never a second, visual-only component system.
         insertInstance/setOverride/removeInstance/createMaster/updateMaster all run for real
         inside that iframe (js/main.js's cmsComponentsCommand), which is the one thing a
         prototype canvas component genuinely could not do against the real renderer. */
      const components = (cmsSourceSite && cmsSourceSite.components) || { masters: {}, routes: {} };
      /* a detached copy belongs to its one instance; it is not something to reuse */
      const masterIds = Object.keys(components.masters || {}).filter((id) => !components.masters[id].detached);
      if (libEditing && masterIds.indexOf(libEditing) < 0) libEditing = '';
      if (libPicking && masterIds.indexOf(libPicking) < 0) libPicking = '';
      const key = JSON.stringify(['cms-components', masterIds.map((id) => [id, components.masters[id]]), cmsInsertPoints, cmsPreviewRoute, libEditing, libPicking]);
      if (key === libKey && box.children.length) return;
      /* Never rebuild under someone typing: every selection in the preview re-reports the
         page's places, and a rebuild mid-edit replaced the definition field being typed in,
         so its change event fired on a fresh field holding the OLD value and the edit was
         silently lost (found driving the editor: tests/browser/studio-flows.mjs, makecomp).
         The rebuild waits until focus leaves the panel. */
      const typing = document.activeElement && box.contains(document.activeElement) && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if (typing && box.children.length) {
        if (!box.dataset.deferred) { box.dataset.deferred = '1'; box.addEventListener('focusout', () => { setTimeout(() => { if (box.contains(document.activeElement)) return; delete box.dataset.deferred; libKey = ''; renderLibrary(); }, 0); }, { once: true }); }
        return;
      }
      libKey = key; box.textContent = '';

      /* Insertion points come from the preview (js/main.js's cmsInsertionPoints), each with
         whether a block put there would be SEEN. A point too narrow to show anything is not
         offered -- /about's only page slot is 0px wide, and a block inserted there existed
         and was invisible (regression: tests/cms-insertion-points.cjs) -- but it is still
         named, with why, so a missing option does not read as a missing feature. A state's
         own content anchor is never a point (it belongs to the States section). */
      const usable = cmsInsertPoints.filter((point) => point.usable), unusable = cmsInsertPoints.filter((point) => !point.usable);
      const site = document.createElement('div'); site.className = 'libsec';
      const h = document.createElement('h4'); h.textContent = 'DEFXN reusable components'; site.appendChild(h);
      const note = document.createElement('p'); note.className = 'hint';
      note.textContent = usable.length
        ? `${usable.length} place${usable.length > 1 ? 's' : ''} to insert on this page: ${usable.map((point) => point.label).join('; ')}.`
        : 'No visible place to insert on this page yet. Select an element on the page to insert after it.';
      site.appendChild(note);
      if (unusable.length) {
        const skipped = document.createElement('p'); skipped.className = 'hint lib-skipped';
        skipped.textContent = 'Not offered: ' + unusable.map((point) => `${point.label} (${point.reason})`).join('; ') + '.';
        site.appendChild(skipped);
      }
      if (!masterIds.length) { const p = document.createElement('p'); p.className = 'hint'; p.textContent = 'No reusable blocks yet. Create one below, or select something on the page and choose Make into component, then insert it here or on any other route.'; site.appendChild(p); }
      const insertAt = (id, master, point) => {
        postCmsHighlightPoint('');
        postCmsComponentsCommand(point.kind === 'after'
          ? { action: 'insert-instance', after: point.after, key: cmsNextComponentId('i'), masterId: id }
          : { action: 'insert-instance', anchorId: point.anchorId, key: cmsNextComponentId('i'), masterId: id });
        libPicking = ''; libKey = '';
        toast(`Inserted ${master.label}: ${point.label}.`);
      };
      masterIds.forEach((id) => {
        const master = components.masters[id];
        const row = document.createElement('div'); row.className = 'myrow'; row.dataset.master = id;
        row.innerHTML = `${ic('comp', 'sm')}<span></span><small></small>`;
        row.querySelector('span').textContent = master.label; row.querySelector('small').textContent = cmsMasterKind(master);
        row.title = master.label + ' · ' + cmsMasterKind(master);
        Object.assign(row.querySelector('small').style, { flex: '0 1 auto', minWidth: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '35%' });
        const insert = document.createElement('button'); insert.className = 'btn small'; insert.type = 'button'; insert.textContent = 'Insert';
        insert.disabled = !usable.length;
        insert.title = usable.length ? (usable.length > 1 ? 'Choose where on this page' : 'Insert: ' + usable[0].label) : 'No visible place on this page: select an element on the page to insert after it';
        insert.setAttribute('aria-expanded', String(libPicking === id));
        /* One place inserts at once; several open a picker in the panel (not a prompt() that
           wanted an anchor id typed exactly): hovering or focusing a place outlines it in the
           preview, clicking inserts there. */
        insert.addEventListener('click', () => {
          if (usable.length === 1) { insertAt(id, master, usable[0]); renderLibrary(); return; }
          libPicking = libPicking === id ? '' : id; if (!libPicking) postCmsHighlightPoint('');
          libKey = ''; renderLibrary();
        });
        const edit = document.createElement('button'); edit.className = 'btn small'; edit.type = 'button'; edit.textContent = 'Edit';
        edit.title = 'Edit the definition: every instance, on every page, follows it';
        edit.setAttribute('aria-expanded', String(libEditing === id));
        edit.addEventListener('click', () => { libEditing = libEditing === id ? '' : id; libKey = ''; renderLibrary(); });
        row.append(insert, edit); site.appendChild(row);
        if (libPicking === id) {
          const picker = document.createElement('div'); picker.className = 'lib-picker'; picker.setAttribute('role', 'listbox'); picker.setAttribute('aria-label', 'Where to insert ' + master.label);
          Object.assign(picker.style, { display: 'grid', gap: '4px', margin: '2px 0 8px 22px' });
          usable.forEach((point) => {
            const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small lib-point'; b.setAttribute('role', 'option'); b.dataset.point = point.id;
            b.textContent = point.label; b.title = `${point.width}px wide here`;
            /* a place's label quotes page text; it wraps inside the panel instead of widening it */
            Object.assign(b.style, { justifyContent: 'flex-start', textAlign: 'left', whiteSpace: 'normal', overflowWrap: 'anywhere', maxWidth: '100%', height: 'auto', minHeight: '28px' });
            b.addEventListener('mouseenter', () => postCmsHighlightPoint(point.id)); b.addEventListener('focus', () => postCmsHighlightPoint(point.id));
            b.addEventListener('mouseleave', () => postCmsHighlightPoint('')); b.addEventListener('blur', () => postCmsHighlightPoint(''));
            b.addEventListener('click', () => { insertAt(id, master, point); renderLibrary(); });
            picker.appendChild(b);
          });
          const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'btn small'; cancel.textContent = 'Cancel';
          cancel.addEventListener('click', () => { libPicking = ''; postCmsHighlightPoint(''); libKey = ''; renderLibrary(); });
          picker.appendChild(cancel); site.appendChild(picker);
        }
        if (libEditing === id) {
          /* the definition itself: label and every prop (a captured component's are its own
             text/image slots) -- update-master, so every instance re-renders from it */
          const form = document.createElement('div'); form.className = 'lib-definition'; form.style.margin = '2px 0 8px 22px';
          /* the shared ctlField, with two ctx objects: a CTA block has a prop named `label` too */
          const labelCtx = { get: () => master.label, set: (_key, v) => postCmsComponentsCommand({ action: 'update-master', id, patch: { label: v } }) };
          const propsCtx = { get: (prop) => master.props[prop], set: (prop, v) => postCmsComponentsCommand({ action: 'update-master', id, patch: { props: Object.assign({}, master.props, { [prop]: v }) } }) };
          form.appendChild(ctlField(labelCtx, 'label', 'label', { type: 'text', ariaLabel: 'Definition label' }));
          cmsMasterProps(master).forEach((prop) => form.appendChild(ctlField(propsCtx, prop, prop, { type: 'text', ariaLabel: 'Definition ' + prop })));
          const uses = Object.keys(components.routes || {}).reduce((n, route) => n + Object.keys(components.routes[route]).reduce((m, a) => m + components.routes[route][a].filter((it) => it.masterId === id).length, 0), 0);
          const hint = document.createElement('p'); hint.className = 'hint'; hint.textContent = `Used ${uses} time${uses === 1 ? '' : 's'} across the site; every one follows these fields unless it overrides one.`;
          form.appendChild(hint); site.appendChild(form);
        }
      });
      box.appendChild(site);

      const form = document.createElement('div'); form.className = 'libsec';
      const fh = document.createElement('h4'); fh.innerHTML = '<span>New block</span>'; form.appendChild(fh);
      /* The new block being described, edited through the shared ctl*Field builders. Choosing
         another type starts its label and props over (they belong to the type). */
      const fresh = { resolver: CMS_BLOCK_RESOLVERS[0].resolver, label: '', props: {} };
      const startType = (resolver) => { fresh.resolver = resolver; fresh.label = cmsBlockResolverLabel(resolver) + ' block'; fresh.props = {}; };
      startType(fresh.resolver);
      const freshHost = document.createElement('div');
      const typeCtx = { get: () => fresh.resolver, set: (_key, resolver) => { startType(resolver); renderNewBlockFields(); } };
      const nameCtx = { get: () => fresh.label, set: (_key, v) => { fresh.label = v; } };
      const freshPropsCtx = { get: (prop) => fresh.props[prop], set: (prop, v) => { if (v) fresh.props[prop] = v; else delete fresh.props[prop]; } };
      function renderNewBlockFields() {
        freshHost.textContent = '';
        freshHost.append(ctlSelectField(typeCtx, 'Block type', 'resolver', CMS_BLOCK_RESOLVERS.map((b) => b.resolver), cmsBlockResolverLabel),
          ctlField(nameCtx, 'Label', 'label', { type: 'text' }),
          ...cmsBlockResolverProps(fresh.resolver).map((prop) => ctlField(freshPropsCtx, prop, prop, { type: 'text', data: { prop } })));
      }
      renderNewBlockFields();
      form.appendChild(freshHost);
      const create = document.createElement('button'); create.className = 'btn small primary'; create.type = 'button'; create.textContent = 'Create block';
      create.addEventListener('click', () => {
        const props = Object.assign({}, fresh.props);
        const label = fresh.label.trim() || cmsBlockResolverLabel(fresh.resolver);
        postCmsComponentsCommand({ action: 'create-master', id: cmsNextComponentId('m'), resolver: fresh.resolver, props, label });
        toast(`Created ${label}. Find it above to insert it on any route.`);
      });
      form.appendChild(create);
      box.appendChild(form);

      const actions = document.createElement('div'); actions.style.display = 'flex'; actions.style.gap = '6px'; actions.style.flexWrap = 'wrap'; actions.style.marginTop = '8px';
      const content = document.createElement('button'); content.className = 'btn small'; content.type = 'button'; content.textContent = 'Open in Content'; content.addEventListener('click', openContentEditor);
      const design = document.createElement('button'); design.className = 'btn small'; design.type = 'button'; design.textContent = 'Theme & defaults'; design.addEventListener('click', () => selectDesign());
      actions.append(content, design); box.appendChild(actions); return;
    }
  }

  /* =========================================================================
     Search and AI. Edits the real seoDraft (js/content/seo.js, saved to seo-data.js by
     saveEverything() like every other draft), every row derived from ArkSEO's field
     definitions by seoFieldRows() (see there). Two homes, by scope: the current route's own
     override is a popover on the header's page picker (renderPageSeoPop), and the site-wide
     fields plus the AI-crawler policy are a section of Theme & defaults (buildSiteSeoPanel) --
     they used to share a fixed right-hand SEO tab that took the canvas's width full time.
     Each edit is folded into cmsSourceSite and re-sent to the preview, whose router re-emits
     the page's <title>/meta/robots/canonical/JSON-LD (js/ark/page-router.js) from it, so the
     real output can be inspected before Save; the design checks re-run on it too.
     The AI-crawler list is ArkSEO.AI_BOTS -- the same list robots.txt is written from. */
  let seoPreviewT = 0;
  function seoEdited() {
    touch(); renderList();
    if (!cmsSourceSite) return;
    cmsSourceSite.seo = clone(seoDraft);
    /* one remount for a burst of edits (tabbing through fields commits each on 'change');
       the design checks re-run when the preview reports ready, never mid-remount */
    clearTimeout(seoPreviewT); seoPreviewT = setTimeout(postCmsPreviewState, 250);
  }
  function buildSiteSeoPanel() {
    const wrap = h('div', { class: 'page-law-panel', id: 'siteSeo' });
    if (!window.ArkSEO) { wrap.appendChild(h('p', { class: 'empty-state', text: 'SEO editing is unavailable: js/content/seo.js did not load into the editor. Reload; if it persists, check admin-app.html still includes it.' })); return wrap; }
    const site = h('fieldset', {}, h('legend', { text: 'Search · whole site' }),
      h('p', { class: 'hint', text: 'What every page falls back to: a page’s own SEO (Canvas → the search icon beside the page picker) overrides these.' }));
    site.appendChild(seoFieldsPanel(ArkSEO.SITE_FIELDS.filter((f) => f.group === 'site'), () => seoDraft.site, seoEdited));
    const ai = h('fieldset', {}, h('legend', { text: 'AI assistants and crawlers' }));
    ai.appendChild(seoFieldsPanel(ArkSEO.SITE_FIELDS.filter((f) => f.group === 'ai'), () => seoDraft.site, seoEdited));
    wrap.append(site, ai);
    return wrap;
  }

  /* =========================================================================
     Sitemap: page tree by address, links on demand, problems flagged
     ========================================================================= */
  let mapFocus = '';
  let mapZoom = 1;
  const MAPZOOM_MIN = 0.4, MAPZOOM_MAX = 2, MAPZOOM_STEP = 0.2;
  function applyMapZoom() {
    const box = $('mapView');
    const wrap = box.querySelector('.smzoom'), cv = box.querySelector('.smcanvas');
    if (wrap && cv) {
      const w = Number(wrap.dataset.w || 0), h = Number(wrap.dataset.h || 0);
      wrap.style.width = (w * mapZoom) + 'px'; wrap.style.height = (h * mapZoom) + 'px';
      cv.style.transform = 'scale(' + mapZoom + ')'; cv.style.transformOrigin = '0 0';
    }
    const pct = box.querySelector('.smzoom-pct'); if (pct) pct.textContent = Math.round(mapZoom * 100) + '%';
  }
  function setMapZoom(z) { mapZoom = Math.min(MAPZOOM_MAX, Math.max(MAPZOOM_MIN, z)); applyMapZoom(); }
  /* Step 1 port: reads cmsRoutes (real pages, admin.js's own studioRoutes()) and
     realLinkIndex() (real manifest 'link' fields, see above) instead of the deleted dense
     pages()/linkIndex(). Zoom/pan UI and interaction (applyMapZoom/setMapZoom/mapZoom,
     the SVG link-drawing, hover-to-preview) are unchanged -- only the data underneath is
     real now. mapFocus/pos are keyed by real route path strings instead of dense ids. */
  function renderSitemap() {
    const box = $('mapView'); box.textContent = '';
    const li = realLinkIndex(), ps = cmsRoutes, home = '/';
    const inbound = new Map(), outbound = new Map(), broken = new Map(), navTargets = new Set();
    for (const l of li) {
      if (!l.ok) { broken.set(l.src, (broken.get(l.src) || 0) + 1); continue; }
      if (l.src === 'nav') navTargets.add(l.tgt);
      if (l.tgt !== l.src || l.src === 'nav') inbound.set(l.tgt, (inbound.get(l.tgt) || 0) + 1);
      if (l.src !== 'nav' && l.tgt !== l.src) outbound.set(l.src, (outbound.get(l.src) || 0) + 1);
    }
    const bar = document.createElement('div'); bar.className = 'smbar';
    const totalBroken = [...broken.values()].reduce((a, b) => a + b, 0), orphans = ps.filter((p) => p.path !== home && !inbound.get(p.path)).length;
    bar.innerHTML = `<h2>Sitemap</h2><span class="sum">${ps.length} pages · ${ps.filter((p) => p.seoArticle).length} articles · ${li.filter((l) => l.ok).length} links${totalBroken ? ` · <b style="color:var(--danger)">${totalBroken} broken</b>` : ''}${orphans ? ` · <b style="color:var(--warn)">${orphans} unlinked</b>` : ''}</span><span class="spacer"></span><span class="smlegend"><span><i style="background:var(--accent)"></i>Links out</span><span><i style="background:var(--override)"></i>Links in</span></span>`;
    const zoomWrap = document.createElement('span'); zoomWrap.className = 'smzoomctl';
    const zOut = document.createElement('button'); zOut.className = 'btn small'; zOut.type = 'button'; zOut.textContent = '−'; zOut.setAttribute('aria-label', 'Zoom out'); zOut.addEventListener('click', () => setMapZoom(mapZoom - MAPZOOM_STEP));
    const zPct = document.createElement('button'); zPct.className = 'btn small smzoom-pct'; zPct.type = 'button'; zPct.textContent = Math.round(mapZoom * 100) + '%'; zPct.title = 'Reset zoom'; zPct.addEventListener('click', () => setMapZoom(1));
    const zIn = document.createElement('button'); zIn.className = 'btn small'; zIn.type = 'button'; zIn.textContent = '+'; zIn.setAttribute('aria-label', 'Zoom in'); zIn.addEventListener('click', () => setMapZoom(mapZoom + MAPZOOM_STEP));
    zoomWrap.append(zOut, zPct, zIn);
    bar.append(zoomWrap); box.appendChild(bar);
    const hint = document.createElement('p'); hint.className = 'hint'; hint.style.marginBottom = '12px'; hint.textContent = 'Hover or click a page to see its links. Pages in the header or footer are reachable from everywhere.'; box.appendChild(hint);
    // layout: home on top, first-level pages in columns, deeper pages under their parent
    const W = 196, H = 118, GX = 26, GY = 56;
    const level1 = ps.filter((p) => p.path !== home && p.path.split('/').filter(Boolean).length === 1);
    const deeper = ps.filter((p) => p.path !== home && !level1.includes(p));
    const kids = new Map();
    for (const p of deeper) { const parentPath = '/' + p.path.split('/').filter(Boolean)[0]; let pp = level1.find((r) => r.path === parentPath); if (!pp) { level1.push(p); continue; } (kids.get(pp.path) || kids.set(pp.path, []).get(pp.path)).push(p); }
    const cols = Math.max(1, level1.length), totalW = cols * W + (cols - 1) * GX;
    const pos = new Map(); pos.set(home, { x: (totalW - W) / 2, y: 0 });
    level1.forEach((p, i) => { const x = i * (W + GX); pos.set(p.path, { x, y: H + GY }); (kids.get(p.path) || []).forEach((k, j) => pos.set(k.path, { x, y: (H + GY) * 2 + j * (H + 16) })); });
    let maxY = 0; for (const v of pos.values()) maxY = Math.max(maxY, v.y + H);
    const sc = document.createElement('div'); sc.className = 'smscroll';
    const wrap = document.createElement('div'); wrap.className = 'smzoom'; wrap.dataset.w = totalW; wrap.dataset.h = maxY;
    const cv = document.createElement('div'); cv.className = 'smcanvas'; cv.style.width = totalW + 'px'; cv.style.height = maxY + 'px';
    const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'); svg.setAttribute('width', totalW); svg.setAttribute('height', maxY);
    svg.innerHTML = `<defs><marker id="ah-out" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 8 4 0 8z" fill="var(--accent)"/></marker><marker id="ah-in" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 8 4 0 8z" fill="var(--override)"/></marker></defs>`;
    const path = (d, stroke, extra) => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', stroke); for (const [k, v] of Object.entries(extra || {})) p.setAttribute(k, v); svg.appendChild(p); return p; };
    // hierarchy (quiet)
    const hp = pos.get(home);
    for (const p of level1) { const q = pos.get(p.path); if (!q) continue; path(`M${hp.x + W / 2} ${hp.y + H} V${hp.y + H + GY / 2} H${q.x + W / 2} V${q.y}`, 'var(--rule)', { 'stroke-width': 1.5 }); }
    for (const [p, ks] of kids) { const q = pos.get(p); ks.forEach((k) => { const r = pos.get(k.path); path(`M${q.x + 14} ${q.y + H} V${r.y + H / 2} H${r.x}`, 'var(--rule)', { 'stroke-width': 1.5 }); }); }
    const linkLayer = document.createElementNS(NS, 'g'); svg.appendChild(linkLayer);
    const drawLinks = (focus) => {
      linkLayer.textContent = '';
      if (!focus) return;
      const seen = new Set();
      for (const l of li) {
        if (!l.ok || l.tgt === l.src) continue;
        const out = l.src === focus && l.src !== 'nav', inn = l.tgt === focus && l.src !== 'nav';
        if (!out && !inn) continue;
        const key = l.src + '>' + l.tgt; if (seen.has(key)) continue; seen.add(key);
        const a = pos.get(l.src), b = pos.get(l.tgt); if (!a || !b) continue;
        const ax = a.x + W / 2, ay = a.y + H / 2, bx = b.x + W / 2, by = b.y + H / 2;
        const ex = bx + (ax < bx ? -W / 2 : ax > bx ? W / 2 : 0), ey = by + (ax === bx ? (ay < by ? -H / 2 : H / 2) : 0);
        const p = document.createElementNS(NS, 'path'); p.setAttribute('d', `M${ax} ${ay} C${ax} ${(ay + ey) / 2 - 30} ${ex} ${(ay + ey) / 2 - 30} ${ex} ${ey}`);
        p.setAttribute('fill', 'none'); p.setAttribute('stroke', out ? 'var(--accent)' : 'var(--override)'); p.setAttribute('stroke-width', 2); p.setAttribute('marker-end', `url(#ah-${out ? 'out' : 'in'})`); p.setAttribute('opacity', .85);
        linkLayer.appendChild(p);
      }
    };
    cv.appendChild(svg);
    for (const route of ps) {
      const pg = route.path, q = pos.get(pg); if (!q) continue;
      const c = document.createElement('div'); c.className = 'smcard' + (pg === cmsCurrentRoute ? ' cur' : ''); c.tabIndex = 0; c.setAttribute('role', 'button'); c.setAttribute('aria-pressed', String(pg === mapFocus));
      c.style.left = q.x + 'px'; c.style.top = q.y + 'px'; c.style.minHeight = H + 'px';
      const chips = [];
      if (pg === home) chips.push('<span class="chip info">Home</span>');
      if (navTargets.has(pg)) chips.push('<span class="chip info">In navigation</span>');
      if (pg !== home && !inbound.get(pg)) chips.push('<span class="chip warn">Nothing links here</span>');
      if (broken.get(pg)) chips.push(`<span class="chip bad">${broken.get(pg)} broken link${broken.get(pg) > 1 ? 's' : ''}</span>`);
      c.innerHTML = `<div class="t">${ic(route.seoArticle ? 'article' : pg === home ? 'home' : 'page')}<span></span></div><code></code><div class="st">${outbound.get(pg) || 0} out · ${inbound.get(pg) || 0} in</div><div class="chips">${chips.join('')}</div>`;
      c.querySelector('.t span').textContent = route.title || pg; c.querySelector('code').textContent = pg;
      const open = document.createElement('button'); open.className = 'btn small open'; open.innerHTML = ic('design', 'sm') + 'Open'; open.addEventListener('click', (e) => { e.stopPropagation(); openRoute(pg); });
      c.appendChild(open);
      c.addEventListener('pointerenter', () => drawLinks(pg));
      c.addEventListener('pointerleave', () => drawLinks(mapFocus));
      c.addEventListener('click', () => { mapFocus = mapFocus === pg ? '' : pg; for (const x of cv.querySelectorAll('.smcard')) x.setAttribute('aria-pressed', 'false'); c.setAttribute('aria-pressed', String(mapFocus === pg)); drawLinks(mapFocus); });
      c.addEventListener('dblclick', () => openRoute(pg));
      c.addEventListener('keydown', (e) => { if (e.key === 'Enter') openRoute(pg); });
      cv.appendChild(c);
    }
    drawLinks(mapFocus);
    wrap.appendChild(cv); sc.appendChild(wrap); box.appendChild(sc);
    sc.addEventListener('wheel', (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      setMapZoom(mapZoom + (e.deltaY < 0 ? MAPZOOM_STEP : -MAPZOOM_STEP));
    }, { passive: false });
    applyMapZoom();
  }
  function setView(v) {
    view = v;
    $('shell').classList.toggle('mapview', v === 'map'); $('designView').hidden = v !== 'design'; $('mapView').hidden = v !== 'map';
    if (v === 'map') { mapFocus = cmsCurrentRoute; mapZoom = 1; renderSitemap(); } else layoutStage();
    syncHeader(); schedule();
  }
  /* The header's Design views: Canvas and Sitemap are this canvas's two views (entering Studio
     first when Theme & defaults is showing); Theme & defaults is the site-wide config editor.
     Background is wired next to its popover (openCanvasTransitionsPopover). */
  function showDesignView(v) { if (state.kind !== 'studio') selectStudio(); setView(v); }
  $('designCanvasBtn').addEventListener('click', () => showDesignView('design'));
  $('designMapBtn').addEventListener('click', () => showDesignView('map'));
  $('designThemeBtn').addEventListener('click', () => selectDesign());

  /* =========================================================================
     Design check: the layout, color, typography and conversion rules as
     measurable checks on the rendered page, each with a fix where one is safe
     ========================================================================= */
  /* Step 1 port: these used to measure the dense-array `.frame`'s own rendered DOM via
     getComputedStyle, which is invisible once connected (.cms-connected .frame{display:
     none}) -- every rendered() check saw zero elements and reported false failures. They
     now read the real rendered page inside cmsPreview (same-origin iframe, so its document
     is directly readable) plus realLinkIndex()/cmsRoutes/cmsPageSeo.
     The original 14 rules (numbered in the comments below): 1-2 hierarchy, 3 ghost buttons,
     4 buttons stand out, 5 text contrast, 6 60-30-10 balance, 7 plain body font, 8 scanning,
     9 lead with the point, 10-11 links/reachability, 12 search, 13 AI, 14 audience. The
     port first kept only the 8 structural ones (1-2, 8-13): 3-7 measured colours against the
     deleted canvas's own palette (theme.colors/PALETTE_RGB). 3-7 are restored (2026-10-18)
     against the real page: computed colours of the real elements, composited over their
     real backdrop, and the real SDK tokens (--canvas/--primary/--accent..., --font-sans/
     --font-display/--font-mono) resolved inside the preview -- not a palette copied here.
     Two parts are NOT ported, on purpose: 7's second half (the body font must be on a hand-
     written list of "safe" faces -- the SDK's sans slot is the body face by definition, and a
     list of approved fonts is exactly the authored list the laws forbid), and the old checks'
     one-click fixes (they wrote the dense tree; a safe real fix would be an ArkLayout
     colour override per element, which is a design decision, so these offer "Show" instead).
     14 (who the site is for) read an audience field that only the deleted canvas had: no
     real draft stores one, so it reports notBuilt -- never pass, never 0 -- and names what
     would build it. A rule whose every candidate sits on an image/gradient (or a colour
     space this parser does not read) reports 'unmeasured' rather than a guess. Neither of
     those two states counts toward the score; the badge is passes / measured rules. */
  /* WHAT the checks measure: the active route's own content, as the visitor is given it. The
     score moved between runs on an unchanged home page (9/13, 6/13, 7/13, 8/13) and reported
     "2 H1s": the second H1 was #fallback, the no-JS copy main.js keeps for screen readers but
     marks aria-hidden and clips to 1px (css/fallback.css); and a run that landed mid-entrance
     measured text still fading in (presence animations, opacity 0 -> 1). An element counts
     only when nothing marks it as not-the-page -- `hidden`, `inert` (the router's outgoing or
     not-yet-shown route), aria-hidden="true", the editor's own [data-ark-studio-ui] chrome --
     it is not visibility:hidden, and no ancestor clips it to nothing (a box of 1px or less
     that hides its overflow or clips its paint). Structure, not a list of ids: any visually-
     hidden copy is left out the same way (regression: tests/design-check-measurable.cjs). */
  function checkMeasurable(el) {
    if (!el || !el.isConnected || !el.getClientRects().length) return false;
    const win = el.ownerDocument.defaultView;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      if (e.hidden || e.inert || e.getAttribute('aria-hidden') === 'true' || e.hasAttribute('data-ark-studio-ui')) return false;
      const st = win.getComputedStyle(e);
      if (st.visibility === 'hidden' || st.visibility === 'collapse') return false;
      const clips = st.overflow !== 'visible' || (st.clipPath && st.clipPath !== 'none') || (st.clip && st.clip !== 'auto');
      if (clips) { const r = e.getBoundingClientRect(); if (r.width <= 1 || r.height <= 1) return false; }
    }
    return true;
  }
  /* WHEN they measure: after the preview reported the route ready (cmsPreviewReady), its fonts
     loaded, the router finished its transition (#scene's data-transition) and every finite
     animation ended -- an infinite one (the hero's ambient motion) never ends and changes no
     rule. Resolves false if the page is still moving after `budget` ms; the popover says so
     rather than presenting a mid-animation reading as the page's. */
  async function previewSettled(budget) {
    const end = Date.now() + budget, pause = (ms) => new Promise((r) => setTimeout(r, ms));
    while (Date.now() < end) {
      const doc = (() => { try { return cmsPreview.contentDocument; } catch (e) { return null; } })();
      if (cmsPreviewReady && doc && doc.readyState === 'complete' && doc.body) {
        if (doc.fonts && doc.fonts.status !== 'loaded') { await Promise.race([doc.fonts.ready, pause(250)]); continue; }
        const scene = doc.getElementById('scene');
        const moving = (doc.getAnimations ? doc.getAnimations() : []).filter((a) => a.playState === 'running' && a.effect && Number.isFinite(a.effect.getComputedTiming().endTime));
        if (!(scene && scene.dataset.transition === 'running') && !moving.length) return true;
        if (moving.length) { await Promise.race([Promise.all(moving.map((a) => a.finished.catch(() => {}))), pause(250)]); continue; }
      }
      await pause(100);
    }
    return false;
  }
  let lastChecks = [], lastChecksSettled = true, checkRun = 0;
  /* the one way the checks run: settle, then measure; an older run that finishes late is dropped */
  async function measureChecks() {
    const run = ++checkRun;
    const settled = await previewSettled(6000);
    if (run !== checkRun) return lastChecks;
    lastChecksSettled = settled;
    runChecks();
    if (popAnchor === $('btnCheck')) refreshPop();
    return lastChecks;
  }
  function runChecks() {
    const out = [], add = (o) => out.push(o);
    const doc = (() => { try { return cmsPreview.contentDocument; } catch (e) { return null; } })();
    const route = cmsRoutes.find((r) => r.path === cmsCurrentRoute) || { path: cmsCurrentRoute };
    if (!doc || !doc.body) { lastChecks = out; return out; }
    const rendered = checkMeasurable;
    const fsz = (el) => parseFloat(getComputedStyle(el).fontSize);
    const words = (el) => (el.textContent || '').trim().split(/\s+/).filter(Boolean).length;
    const heads = [...doc.querySelectorAll('h1,h2,h3,h4')].filter(rendered);
    const h1s = heads.filter((el) => el.tagName === 'H1'), h2s = heads.filter((el) => el.tagName === 'H2');
    const paras = [...doc.querySelectorAll('p')].filter((el) => rendered(el) && words(el) > 0);
    // 1 one clear H1
    add({ law: 'Hierarchy', title: 'One H1 says what the page is about', status: h1s.length === 1 ? 'pass' : 'fail', detail: h1s.length === 1 ? `"${h1s[0].textContent.trim().slice(0, 60)}"` : h1s.length ? `${h1s.length} H1s compete for attention.` : 'This page has no H1.' });
    // 2 H1 > H2 > paragraph
    const h1z = h1s.length ? Math.max(...h1s.map(fsz)) : 0, h2z = h2s.length ? Math.max(...h2s.map(fsz)) : 0;
    const bodyParas = paras.filter((el) => words(el) > 12), pz = bodyParas.length ? Math.max(...bodyParas.map(fsz)) : 0;
    const hierOk = (!h1s.length || !h2z || h1z > h2z * 1.1) && (!h2s.length || !pz || h2z > pz * 1.1);
    add({ law: 'Hierarchy', title: 'Biggest for the most important', status: hierOk ? 'pass' : 'warn', detail: hierOk ? `H1 ${Math.round(h1z)} px, H2 ${Math.round(h2z)} px, text ${Math.round(pz)} px.` : `Sizes are close: H1 ${Math.round(h1z)} px, H2 ${Math.round(h2z)} px, text ${Math.round(pz)} px.` });
    /* ---- colour/typography measurement for rules 3-7 (see the comment above) ---- */
    const win = doc.defaultView, css = (el) => win.getComputedStyle(el);
    const notStudio = (el) => !el.closest('[data-ark-studio-ui]');
    const parseColor = (s) => {
      let m = /^rgba?\(([^)]+)\)$/.exec(s || '');
      if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); return { c: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 }; }
      m = /^color\(srgb ([^)]+)\)$/.exec(s || '');
      if (m) { const p = m[1].split(/[\s/]+/).filter(Boolean).map(parseFloat); return { c: p.slice(0, 3).map((v) => v * 255), a: p.length > 3 ? p[3] : 1 }; }
      return null;
    };
    const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const contrast = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
    const over = (top, a, under) => top.map((v, i) => v * a + under[i] * (1 - a));
    /* The colour actually painted behind `el` (its own fill included when `self`): layers
       are composited upward until an opaque one; an image/gradient on the way, or a colour
       this parser cannot read, makes it unknowable (null) rather than guessed. Nothing opaque
       all the way up is the browser canvas, which is white. */
    const backdrop = (el, self) => {
      const layers = [];
      for (let e = self ? el : el.parentElement; e; e = e.parentElement) {
        const st = css(e);
        if (st.backgroundImage && st.backgroundImage !== 'none') return null;
        const c = parseColor(st.backgroundColor); if (!c) return null;
        if (c.a > 0) layers.push(c);
        if (c.a >= 0.99) break;
      }
      let out = [255, 255, 255];
      for (let i = layers.length - 1; i >= 0; i--) out = over(layers[i].c, layers[i].a, out);
      return out;
    };
    const opacityOf = (el) => { let o = 1; for (let e = el; e; e = e.parentElement) o *= parseFloat(css(e).opacity); return o; };
    const keyOf = (el) => { const k = el && el.closest('[data-ark-layout-key]'); return k ? k.getAttribute('data-ark-layout-key') : ''; };
    const visible = (el) => rendered(el) && notStudio(el) && css(el).visibility !== 'hidden' && (() => { const r = el.getBoundingClientRect(); return r.width * r.height > 4; })() && opacityOf(el) > 0.05;
    const buttons = [...doc.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]')].filter(visible);
    const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const texts = [...doc.body.querySelectorAll('*')].filter((el) => !(el instanceof win.SVGElement) && ownText(el) && visible(el));
    const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
    // 3 ghost buttons: no fill of their own (transparent or nearly so, and no image/gradient)
    const ghosts = buttons.filter((el) => { const st = css(el), c = parseColor(st.backgroundColor); return (!st.backgroundImage || st.backgroundImage === 'none') && c && c.a < 0.5; });
    add({ law: 'Buttons', title: 'No ghost buttons', status: ghosts.length ? 'fail' : 'pass', show: keyOf(ghosts[0]),
      detail: ghosts.length ? `${plural(ghosts.length, 'outline-only button', 'outline-only buttons')} of ${buttons.length}. Visitors skip them; give each a solid fill.` : buttons.length ? `All ${plural(buttons.length, 'button has', 'buttons have')} a solid fill.` : 'No buttons on this page.' });
    // 4 calls to action stand out: a filled button's fill against what is behind it, >= 3:1
    let unknown4 = 0;
    const flat = buttons.filter((el) => !ghosts.includes(el)).filter((el) => { const fill = backdrop(el, true), behind = backdrop(el, false); if (!fill || !behind) { unknown4++; return false; } return contrast(fill, behind) < 3; });
    const filled = buttons.length - ghosts.length;
    add({ law: 'Buttons', title: 'Calls to action stand out', show: keyOf(flat[0]),
      status: !buttons.length ? 'warn' : filled && unknown4 === filled ? 'unmeasured' : flat.length ? 'fail' : 'pass',
      detail: !buttons.length ? 'No buttons on this page. Give visitors one clear next step.' : filled && unknown4 === filled ? `Every filled button sits on an image or gradient, so its contrast cannot be measured from colours alone.` : `${flat.length ? `${plural(flat.length, 'button blends', 'buttons blend')} into the background (under 3:1). Use the accent colour.` : `${filled - unknown4} filled ${filled - unknown4 === 1 ? 'button contrasts' : 'buttons contrast'} at least 3:1 with what is behind ${filled - unknown4 === 1 ? 'it' : 'them'}.`}${unknown4 ? ` ${unknown4} not measurable (image or gradient behind).` : ''}` });
    // 5 text contrast: WCAG AA, 4.5:1 (3:1 for large text), text colour composited with its own alpha and opacity
    let unknown5 = 0;
    const lowText = texts.filter((el) => {
      const st = css(el), fg = parseColor(st.color), bg = backdrop(el, true);
      if (!fg || !bg) { unknown5++; return false; }
      const size = parseFloat(st.fontSize), big = size >= 24 || (size >= 18.66 && Number(st.fontWeight) >= 700);
      return contrast(over(fg.c, fg.a * opacityOf(el), bg), bg) < (big ? 3 : 4.5);
    });
    add({ law: 'Contrast', title: 'Text is easy to read', show: keyOf(lowText[0]),
      status: texts.length && unknown5 === texts.length ? 'unmeasured' : lowText.length ? 'fail' : 'pass',
      detail: texts.length && unknown5 === texts.length ? 'All text sits on images or gradients; contrast cannot be measured from colours alone.' : `${lowText.length ? `${plural(lowText.length, 'text element falls', 'text elements fall')} below 4.5:1 (3:1 for large text), of ${texts.length - unknown5} measured.` : `All ${texts.length - unknown5} measured text elements meet WCAG AA.`}${unknown5 ? ` ${unknown5} not measurable (image or gradient behind).` : ''}` });
    // 6 60-30-10: painted area by nearest real SDK fill token, resolved inside the page
    const probe = doc.createElement('i'); probe.setAttribute('data-ark-studio-ui', ''); probe.style.display = 'none'; doc.body.appendChild(probe);
    const tokenRgb = {};
    /* an undefined token would make var() fall back to the inherited colour -- a false match -- so only defined ones are probed */
    for (const tok of ArkLayout.FILL_TOKENS) { if (!css(doc.documentElement).getPropertyValue('--' + tok).trim()) continue; probe.style.color = `hsl(var(--${tok}))`; const c = parseColor(css(probe).color); if (c) tokenRgb[tok] = c.c; }
    probe.remove();
    /* 60-30-10 names its three parts itself: the accent token is the 10, the brand pair
       (primary, and the complement it is paired with) the 30, every surface/meaning fill the
       60 -- the original rule's own neutral/brand/accent split, mapped onto the SDK's names. */
    const roleOf = (tok) => tok === 'accent' ? 'accent' : tok === 'primary' || tok === 'complement' ? 'brand' : 'neutral';
    const nearest = (rgb) => { let best = '', bd = Infinity; for (const [tok, v] of Object.entries(tokenRgb)) { const d = (v[0] - rgb[0]) ** 2 + (v[1] - rgb[1]) ** 2 + (v[2] - rgb[2]) ** 2; if (d < bd) { bd = d; best = tok; } } return best; };
    const area = { neutral: 0, brand: 0, accent: 0 };
    const measure = (el, inherited) => {
      if (!notStudio(el) || el instanceof win.SVGElement) return;
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
      const st = css(el), c = parseColor(st.backgroundColor);
      let mine = inherited;
      if (el.tagName === 'IMG' || el.tagName === 'VIDEO' || el.tagName === 'CANVAS' || (st.backgroundImage && st.backgroundImage !== 'none')) mine = 'skip';
      else if (c && c.a > 0.5) mine = roleOf(nearest(c.c));
      let kids = 0; for (const k of el.children) { const kr = k.getBoundingClientRect(); kids += kr.width * kr.height; measure(k, mine); }
      if (mine !== 'skip') area[mine] += Math.max(0, r.width * r.height - kids);
    };
    if (Object.keys(tokenRgb).length) measure(doc.body, 'neutral');
    const tot = area.neutral + area.brand + area.accent, pN = tot ? area.neutral / tot * 100 : 0, pB = tot ? area.brand / tot * 100 : 0, pA = tot ? area.accent / tot * 100 : 0;
    const ratioOk = pN >= 50 && pB <= 40 && pA <= 15, pct = (v) => (v > 0 && v < 10 ? v.toFixed(1) : String(Math.round(v)));
    add({ law: 'Color', title: '60-30-10 color balance', ratio: [pN, pB, pA],
      status: !tot ? 'unmeasured' : ratioOk ? 'pass' : 'warn',
      detail: !Object.keys(tokenRgb).length ? 'The page defines none of the SDK fill tokens (--canvas, --primary, --accent...), so there is nothing to measure balance against.' : !tot ? 'No measurable painted area on this page.' : `Neutral ${pct(pN)} % · brand ${pct(pB)} % · accent ${pct(pA)} %. ${ratioOk ? 'Accent stays reserved for calls to action.' : pA > 15 ? 'Too much accent: keep it for buttons only.' : pB > 40 ? 'Brand color dominates: let neutrals carry the page.' : 'Let neutral backgrounds carry most of the page.'}` });
    // 7 plain fonts for body text: long paragraphs set in the SDK's sans slot, not display/mono
    const rootSt = css(doc.documentElement), firstFace = (list) => String(list || '').split(',')[0].trim().replace(/^["']|["']$/g, '').toLowerCase();
    const faces = { sans: firstFace(rootSt.getPropertyValue('--font-sans')), display: firstFace(rootSt.getPropertyValue('--font-display')), mono: firstFace(rootSt.getPropertyValue('--font-mono')) };
    const longParas = paras.filter((el) => notStudio(el) && words(el) > 18);
    const decor = faces.sans ? longParas.filter((el) => { const f = firstFace(css(el).fontFamily); return f !== faces.sans && (f === faces.display || f === faces.mono); }) : [];
    add({ law: 'Typography', title: 'Plain fonts for body text', show: keyOf(decor[0]),
      status: !faces.sans ? 'unmeasured' : decor.length ? 'fail' : 'pass',
      detail: !faces.sans ? 'The page defines no --font-sans token, so there is no body face to compare paragraphs against.' : decor.length ? `${plural(decor.length, 'paragraph uses', 'paragraphs use')} the ${faces.display && decor.some((el) => firstFace(css(el).fontFamily) === faces.display) ? 'display' : 'mono'} face. Switch long text to the sans (body) font.` : `${longParas.length} long ${longParas.length === 1 ? 'paragraph is' : 'paragraphs are'} set in the body face (${faces.sans}).` });
    // 8 scannable
    const longP = paras.filter((el) => words(el) > 60);
    const sections = [...doc.querySelectorAll('section')].filter(rendered);
    const bare = sections.filter((el) => !el.querySelector('h1,h2,h3,h4') && words(el) > 40);
    add({ law: 'Scanning', title: 'Easy to scan', status: longP.length || bare.length ? 'warn' : 'pass', detail: longP.length || bare.length ? `${longP.length ? `${longP.length} paragraph${longP.length > 1 ? 's' : ''} over 60 words. ` : ''}${bare.length ? `${bare.length} section${bare.length > 1 ? 's' : ''} with no heading.` : ''}` : 'Short paragraphs, and every section has a heading.' });
    // 9 lead with the point
    const actions = [...doc.querySelectorAll('a[href],button')].filter(rendered);
    /* "the first screen" is a place on the PAGE, not in the window: measured from the top of the
       document (scroll of the window and of any scrolled container undone), so the reading is
       the same however far the preview happens to be scrolled */
    const pageTop = (el) => { let t = el.getBoundingClientRect().top + win.scrollY; for (let e = el.parentElement; e; e = e.parentElement) t += e.scrollTop; return t; };
    const firstActTop = actions.length ? Math.min(...actions.map(pageTop)) : Infinity;
    const leadOk = h1s.length && pageTop(h1s[0]) < 640 && (route.seoArticle || firstActTop < 760);
    add({ law: 'Layout', title: 'Lead with the point', status: leadOk ? 'pass' : 'warn', detail: leadOk ? 'The H1 and a next step are visible without scrolling.' : 'Put the H1 and one clear call to action in the first screen.' });
    // 10 links work (site-wide, real manifest link fields)
    const li = realLinkIndex(), bad = li.filter((l) => !l.ok);
    add({ law: 'Friction', title: 'Every link goes somewhere', status: bad.length ? 'fail' : 'pass', detail: bad.length ? `${bad.length} link${bad.length > 1 ? 's point' : ' points'} to a missing route.` : `${li.length} internal links, all working.` });
    // 11 every page reachable
    const inbound = new Set(li.filter((l) => l.ok && (l.tgt !== l.src || l.src === 'nav')).map((l) => l.tgt));
    const orph = cmsRoutes.filter((r) => r.path !== '/' && !inbound.has(r.path));
    add({ law: 'Friction', title: 'Every page can be reached', status: orph.length ? 'warn' : 'pass', detail: orph.length ? `Nothing links to ${orph.map((r) => r.path).join(', ')}.` : 'Every page has at least one link to it.' });
    // 12 search readiness (real SEO: cmsPageSeo/cmsSeoValue are pure functions over cmsSourceSite)
    const seo = cmsPageSeo(cmsSourceSite || {}, route);
    const title = seo.t || route.title || cmsCurrentRoute, desc = seo.d || '';
    const titleOk = title.length >= 15 && title.length <= 60, descOk = desc.length >= 50 && desc.length <= 160;
    add({ law: 'Search', title: 'Ready for search results', status: titleOk && descOk ? 'pass' : 'warn', detail: `Title ${title.length} chars${titleOk ? '' : ' (aim for 15-60)'} · description ${desc.length} chars${descOk ? '' : desc ? ' (aim for 50-160)' : ' (missing)'}.`, fix: 'seo', fixLabel: 'Open SEO' });
    // 13 AI assistants (site-wide bot policy, real cmsSourceSite.seo.site.bots)
    const siteSeo = (cmsSourceSite && cmsSourceSite.seo && cmsSourceSite.seo.site) || {};
    const bots = siteSeo.bots || {};
    const answerBotsOpen = ArkSEO.AI_BOTS.filter(([b, train]) => !train && (bots[b] || 'allow') === 'allow').length, answerBotsTotal = ArkSEO.AI_BOTS.filter((b) => !b[1]).length;
    add({ law: 'AI', title: 'Answer-ready for AI assistants', status: answerBotsOpen > 0 ? 'pass' : 'warn', detail: `${answerBotsOpen} of ${answerBotsTotal} answer/search bots allowed.`, fix: 'seo-site', fixLabel: 'Open site SEO' });
    // 14 designed for the visitor: needs a stated audience, which no real draft stores
    add({ law: 'Audience', title: 'Designed for the visitor', status: 'notBuilt',
      detail: 'Not built: this rule compares the design against who the site is for, and no saved draft stores that. The deleted canvas kept an audience note in its own theme; the real theme (js/content/theme.js) and SEO site settings have no such field. Add an audience field to one of them and this rule can be measured.' });
    lastChecks = out;
    const scored = out.filter((c) => c.status === 'pass' || c.status === 'warn' || c.status === 'fail');
    const score = scored.filter((c) => c.status === 'pass').length;
    const badge = $('scoreBadge'), btn = $('btnCheck'), frac = scored.length ? score / scored.length : 0;
    badge.textContent = `${score}/${scored.length}`; btn.classList.remove('good', 'mid', 'bad'); btn.classList.add(frac >= 0.85 ? 'good' : frac >= 0.6 ? 'mid' : 'bad');
    btn.title = `${score} of ${scored.length} measured rules pass` + (out.length > scored.length ? ` · ${out.length - scored.length} not measured (see the list)` : '');
    return out;
  }
  let checkT = 0;
  function queueCheck() { clearTimeout(checkT); checkT = setTimeout(() => { if (view === 'design') measureChecks().then(() => renderStatus()); }, 450); }
  function applyFix(c) {
    if (c.fix === 'seo') { closePop(); openPageSeo(); return; }
    if (c.fix === 'seo-site') { closePop(); openSiteSeo(); return; }
  }
  /* opens on the last reading at once, and repaints when the settled one lands (measureChecks) */
  $('btnCheck').addEventListener('click', (e) => { const opening = popAnchor !== e.currentTarget; openPop(e.currentTarget, (p) => {
    const checks = lastChecks;
    const head = document.createElement('div'); head.className = 'checkhead';
    const measured = checks.filter((c) => c.status === 'pass' || c.status === 'warn' || c.status === 'fail'), unmeasured = checks.length - measured.length;
    head.innerHTML = `<div><b>Design check · ${esc(cmsCurrentRoute)}</b><p>${measured.filter((c) => c.status === 'pass').length} of ${measured.length} measured rules pass${unmeasured ? ` · ${unmeasured} not measured` : ''}</p></div>`;
    if (!lastChecksSettled) head.firstChild.appendChild(h('p', { class: 'hint', text: 'Measured while the page was still moving: it had not finished loading fonts or animating after 6 seconds, so this reading can differ from the next. Check again once it is still.' }));
    p.appendChild(head);
    const ul = document.createElement('ul'); ul.className = 'checks';
    for (const c of checks) {
      const li = document.createElement('li'); li.className = c.status;
      li.innerHTML = `<span class="st">${ic(c.status === 'pass' ? 'check' : c.status === 'fail' ? 'close' : 'info')}</span><div><b></b><p></p></div>`;
      li.querySelector('b').textContent = `${c.law} · ${c.title}${c.status === 'notBuilt' ? ' · not built' : c.status === 'unmeasured' ? ' · not measured' : ''}`; li.querySelector('p').textContent = c.detail;
      li.dataset.check = c.title;
      const d = li.lastChild;
      if ((c.status === 'warn' || c.status === 'fail') && (c.fix || c.show)) {
        const acts = document.createElement('div'); acts.className = 'acts';
        if (c.fix) { const f = document.createElement('button'); f.className = 'btn small primary'; f.innerHTML = ic('wand', 'sm') + (c.fixLabel || 'Fix'); f.addEventListener('click', () => applyFix(c)); acts.appendChild(f); }
        /* select the first offending element in the preview, so the toolbar opens on it */
        if (c.show) { const s = document.createElement('button'); s.className = 'btn small'; s.textContent = 'Show'; s.addEventListener('click', () => { closePop(); postCmsSelectKey(c.show); }); acts.appendChild(s); }
        d.appendChild(acts);
      }
      ul.appendChild(li);
    }
    p.appendChild(ul);
  }, 'right'); if (opening) measureChecks(); });

  /* STEP 1 CLEANUP: the dense-encoding "Versions" feature (encodeDense/namedTree/base32/
     cidOf/publish, and the "History" tab/#paneVer that showed it) is deleted with no
     replacement, per the approved plan -- it froze a sha-256-addressed snapshot of the
     dense-array format specifically, which no longer exists, and there is no existing real-
     site version-history feature to port it to. If the owner wants real version history for
     the connected site later, that is new work, not a port -- flagged plainly here, same as
     every other capability this pass drops rather than silently losing. Content CMS's own
     Save already writes and publishes the real site. */
  function esc(s) { return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
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
    $('studioStatus').innerHTML = `<span><b>${cmsRoutes.length}</b> routes</span><span>${cmsCurrentRoute}</span><span>${cmsLayoutCanUndo ? 'undo available' : 'no undo'}</span>`;
  }
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2600); }

  $('devices').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; device = +b.dataset.d; for (const x of $('devices').children) x.setAttribute('aria-pressed', String(x === b)); if (view !== 'design') setView('design'); layoutStage(); schedule(); });
  $('mode').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    live = b.dataset.m === 'live'; for (const x of $('mode').children) x.setAttribute('aria-pressed', String(x === b));
    $('shell').classList.toggle('live', live); closePop();
    postCmsPreviewMode();
    if (live && view !== 'design') setView('design');
    layoutStage(); schedule();
  });
  $('btnUndo').addEventListener('click', undo);
  $('btnRedo').addEventListener('click', redo);
  document.addEventListener('keydown', (e) => {
    if (state.kind !== 'studio') return;
    if (e.key === 'Escape' && popEl) { const a = popAnchor; closePop(); if (a) a.focus(); return; }
    const tag = (e.target.tagName || '').toLowerCase(), typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); redo(); return; }
    if (typing || live || view !== 'design') return;
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); postCmsRemoveSelection(); }
  });
  window.addEventListener('resize', layoutStage);

  /* Step 2 merge: this used to be two listeners in two documents --
     admin-studio.html's own "window.addEventListener('message', ...)" (below, for messages
     FROM the real preview iframe, each one also relaying a mutation up to admin.js via a
     second window.parent.postMessage) PLUS admin.js's separate listener for messages FROM
     the Studio iframe (applyStudioPatches/applyStudioLayoutPatch/applyStudioComponentsReplace/
     etc., see saveStudioChanges() above). Now that Studio's code and admin.js's code share
     one scope, the only genuine postMessage boundary left is this one -- the real preview
     iframe (cmsPreview, js/main.js) -- so there is only one listener, and every "relay the
     mutation up to admin.js" line below is now a direct call to the exact same
     applyStudioXReplace/applyStudioLayoutPatch functions admin.js already defined (above),
     in the same synchronous handler that also updates cmsSourceSite/cmsTree/cmsGroups and
     re-renders Studio's own UI -- one hop (iframe -> admin.js) instead of two
     (iframe -> Studio document -> admin.js). The old second branch
     (`if (event.source !== window.parent) return; ... 'defxn-studio-load'/'defxn-studio-
     preview-state'/'defxn-studio-saved'`) is deleted outright: those messages existed only
     to hand admin.js's state across the now-gone document boundary -- renderStudioEditor()
     (below) reads state.drafts / the various *Draft variables / siteFromState()
     directly instead. */
  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin || !event.data) return;
    if (event.source !== cmsPreview.contentWindow) return;
    if (event.data.points) cmsInsertPoints = event.data.points;
    if (event.data.showing) cmsStatesShowing = event.data.showing;
    if (event.data.type === 'defxn-cms-preview-ready') { cmsPreviewReady = true; if (event.data.groups) cmsGroups = event.data.groups; if (event.data.tree) cmsTree = event.data.tree; toast('Exact DEFXN preview updated from unsaved CMS drafts.'); renderInspector(); renderLayersPane(); libKey = ''; renderLibrary(); queueCheck(); }
    else if (event.data.type === 'defxn-cms-preview-error') toast('Preview update failed: ' + event.data.message);
    else if (event.data.type === 'defxn-cms-preview-select') {
      cmsExactSelection = event.data.selection || null;
      cmsExactSelections = event.data.selections || (cmsExactSelection ? [cmsExactSelection] : []);
      if (event.data.groups) cmsGroups = event.data.groups;
      if (event.data.tree) cmsTree = event.data.tree;
      renderLayersPane();
      renderInspector();
      renderLibrary();
    } else if (event.data.type === 'defxn-cms-preview-components-replace') {
      if (cmsSourceSite) cmsSourceSite.components = event.data.components;
     
      if (event.data.tree) cmsTree = event.data.tree;
      applyStudioComponentsReplace(event.data.components);
      if (event.data.created) { tbAutoOpen = { key: 'cms-component', at: Date.now() }; toast('Made a component: it is in the Library to insert on any page, and this instance replaced the selection. Edit its definition from the Library or the toolbar.'); }
      libKey = ''; renderLibrary(); renderInspector(); renderLayersPane();
    } else if (event.data.type === 'defxn-cms-preview-states-showing') {
      /* a Live-mode click (or a toolbar Preview) changed what a group shows; the draft did not change */
      renderInspector();
    } else if (event.data.type === 'defxn-cms-preview-states-replace') {
      if (cmsSourceSite) cmsSourceSite.states = event.data.states;
     
      if (event.data.tree) cmsTree = event.data.tree;
      applyStudioStatesReplace(event.data.states);
      if (event.data.created) { tbAutoOpen = { key: 'cms-states', at: Date.now() }; toast('Made a state group: the selection is state 0. Use + Add state in the toolbar to add the next state.'); }
      renderInspector(); renderLayersPane();
    } else if (event.data.type === 'defxn-cms-preview-canvas-transitions-replace') {
      if (cmsSourceSite) cmsSourceSite.canvasTransitions = event.data.canvasTransitions;
      applyStudioCanvasTransitionsReplace(event.data.canvasTransitions);
      renderInspector();
    } else if (event.data.type === 'defxn-cms-preview-element-motion-replace') {
      if (cmsSourceSite) cmsSourceSite.elementMotion = event.data.elementMotion;
      applyStudioElementMotionReplace(event.data.elementMotion);
      renderInspector();
    } else if (event.data.type === 'defxn-cms-preview-layout-change' && event.data.patch) {
      cmsExactSelection = event.data.selection || cmsExactSelection;
      cmsExactSelections = event.data.selections || cmsExactSelections;
      if (event.data.groups) cmsGroups = event.data.groups;
      if (event.data.tree) cmsTree = event.data.tree;
      applyStudioLayoutPatch(event.data.patch);
      renderInspector(); renderLayersPane();
    } else if (event.data.type === 'defxn-cms-preview-layout-replace' && event.data.layout) {
      if (event.data.tree) cmsTree = event.data.tree;
      applyStudioLayoutReplace(event.data.layout);
      renderLayersPane();
    } else if (event.data.type === 'defxn-cms-preview-layout-history') {
      cmsLayoutCanUndo = !!event.data.canUndo; cmsLayoutCanRedo = !!event.data.canRedo; renderInspector();
    } else if (event.data.type === 'defxn-cms-preview-notice') toast(event.data.message || 'That operation is unavailable for this selection.');
    /* Step 4: js/main.js's unconditional "Edit canvas" context-menu entry still posts this
       exact message (that protocol is untouched, per scope) -- it used to call
       enterRestrictMode('canvas'); now it opens the same selection-independent popover
       the header's Background segment (#designBackgroundBtn) opens. */
    else if (event.data.type === 'defxn-cms-preview-enter-canvas-mode') openCanvasTransitionsPopover();
    /* Ctrl/Cmd+S pressed while focus is inside the canvas (js/main.js forwards it): the same
       gate and the same one save action as this document's own shortcut listener. */
    else if (event.data.type === 'defxn-cms-preview-save') { if (anyDirty()) saveEverything(); }
    else if (event.data.type === 'defxn-cms-preview-context-menu') { cmsContextMenuOpen = !!event.data.open; renderSelToolbar(); }
  });
  /* a click anywhere in the editor itself closes the preview's right-click menu, as a click
     inside the preview already does -- otherwise the toolbar stayed hidden behind a menu
     nobody could see was still open */
  document.addEventListener('pointerdown', () => {
    if (cmsContextMenuOpen && cmsPreview.contentWindow) cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-close-menu' }, window.location.origin);
  }, true);

  /* Step 2 merge: the standalone/embedded boot branches above (and the
     'defxn-studio-ready' handshake they used to end in) are deleted outright -- Studio is
     now rendered in-process by renderStudioEditor() (in admin.js, right after this ported
     block), which does the equivalent first-entry setup (cmsConnected/cmsSourceSite/
     cmsRoutes/cmsCurrentRoute + the first layoutStage()/renderLayersPane()/renderInspector()/
     renderPageBtn()/renderStatus() paint) the moment state.kind actually becomes 'studio',
     instead of unconditionally at script-load time when there is nothing real to show yet
     (loadBodies() has not necessarily resolved articles/manifests at that point). */

  /* renderEditor()'s 'studio' branch (above): this used to inject a brand-new
     <iframe src="admin-studio.html">, so every Studio-internal state (cmsSourceSite,
     selection, device, view, etc.) reset on every visit and the real
     connection only happened once that iframe announced itself ready
     ('defxn-studio-load'/'defxn-studio-preview-state'). #studioRoot is now a static
     part of this document instead, so Studio's own state persists across visits (a
     side effect of removing the reload, not a regression); this function's only job
     is to refresh cmsSourceSite/cmsRoutes from the latest drafts on every entry, and to
     do the one-time first-connect setup (cmsCurrentRoute/undo-redo flags/the real
     preview iframe's first load) exactly once. */
  function renderStudioEditor() {
    cmsSourceSite = siteFromState();
    cmsRoutes = studioRoutes();
    if (!cmsConnected) {
      cmsConnected = true;
      cmsCurrentRoute = (cmsRoutes.find(function (r) { return r.path === '/'; }) || cmsRoutes[0] || { path: '/' }).path;
      cmsLayoutCanUndo = cmsLayoutCanRedo = false;
      schedule();
      syncCmsPreview(true);
      toast(cmsRoutes.length + ' real DEFXN routes loaded.');
    } else {
      schedule();
      postCmsPreviewState();
    }
    layoutStage();
  }

  /* ---- SEO (js/content/seo.js) --------------------------------------- */
  /* Same shared-draft pattern as theme/mesh above: one object, edited here, written by Save. No
     live preview message -- a title/meta tag has no visible effect in the iframe to show early. */
  var seoDraft = (window.ArkSEO && ArkSEO.get()) || (window.ArkSEO && ArkSEO.defaults()) || { site: {}, pages: {}, articles: {} };
  var seoSaved = window.ArkSEO ? JSON.stringify(ArkSEO.sanitize(seoDraft)) : null;
  function seoDirty() { return !window.ArkSEO || JSON.stringify(ArkSEO.sanitize(seoDraft)) !== seoSaved; }
  async function saveSeoDraft(button) {
    try {
      if (state.cdirs) {
        await ArkAdminStore.saveSeo(state.cdirs.content, seoDraft);
        status('Saved js/content/seo-data.js', 'ok');
      } else {
        download('seo-data.js', ArkSEO.serialize(seoDraft));
        status('Downloaded seo-data.js. Put it in js/content/, or connect the project folder to save directly.', 'warn');
      }
    /* Step 5: re-throws now that saveEverything() is this function's only caller -- see
       saveThemeDraft's matching comment above. */
    } catch (error) { status(error.message, 'error'); throw error; }
    seoDraft = ArkSEO.sanitize(seoDraft);
    seoSaved = JSON.stringify(seoDraft);
    ArkSEO.define(seoDraft);
    if (button) button.disabled = true;
    renderList();
  }
  /* ONE control per ArkSEO field definition (js/content/seo.js's OVERRIDE_FIELDS/SITE_FIELDS),
     built with the shared ctl*Field builders -- no SEO panel lists a field itself. The merge
     (2026-10-17) rebuilt these panels from a hand-written list and quietly lost schemaType,
     aiSummary, canonical, noindex, lang, org, handle, llms and the per-bot crawler policy:
     they stayed in seo-data.js with no control. Deriving the rows from the same list
     sanitize() walks makes that loss unrepresentable (regression: tests/seo-fields.cjs).
     The control comes from the field's kind; the shown value is what ArkSEO.cleanField()
     would store, except free text, which shows exactly what was typed. */
  const SEO_TEXT_KINDS = { text: 'text', url: 'text', origin: 'text', pattern: 'text', longtext: 'textarea' };
  function seoFieldRows(fields, target, onEdited) {
    /* `target` may be a function returning the draft object: Save replaces seoDraft with its
       sanitized copy, and a panel still on screen must write into the new one, not the old. */
    var draft = function () { return typeof target === 'function' ? target() : target; };
    var rows = [];
    fields.forEach(function (f) {
      var ctx = { get: function (key) { return SEO_TEXT_KINDS[f.kind] && typeof draft()[key] === 'string' ? draft()[key] : ArkSEO.cleanField(f, draft()[key]); },
                  set: function (key, value) { draft()[key] = value; onEdited(f); } };
      if (f.kind === 'policy') {
        /* the bot policy is one stored field (a map) but one decision per crawler */
        rows.push(h('p', { class: 'hint', text: 'Answer bots fetch a page for a person asking now; training bots collect it for a model. Blocking one adds it to robots.txt.' }));
        ArkSEO.AI_BOTS.forEach(function (bot) {
          var name = bot[0];
          var botCtx = { get: function () { return ArkSEO.cleanField(f, draft()[f.key])[name] === 'block' ? 'block' : 'allow'; },
                         set: function (_key, value) { var next = Object.assign({}, ArkSEO.cleanField(f, draft()[f.key])); if (value === 'block') next[name] = 'block'; else delete next[name]; draft()[f.key] = next; onEdited(f); } };
          var row = ctlSegField(botCtx, name, name, ArkSEO.BOT_POLICIES);
          row.classList.add('seo-bot'); row.dataset.seoField = f.key; row.dataset.seoBot = name;
          row.title = bot[2] + (bot[1] ? ' (training)' : ' (answers)');
          rows.push(row);
        });
        return;
      }
      var row;
      if (f.kind === 'enum') row = ctlSelectField(ctx, f.label, f.key, (f.fallback ? [] : ['']).concat(f.options), function (o) { return o === '' ? (f.blankLabel || 'None') : o; });
      else if (f.kind === 'flag') row = ctlSegField(ctx, f.label, f.key, [false, true], function (v) { return v ? 'Yes' : 'No'; });
      else if (f.kind === 'onoff') row = ctlSegField(ctx, f.label, f.key, [1, 0], function (v) { return v ? 'Publish' : 'Off'; });
      else row = ctlField(ctx, f.label, f.key, { type: SEO_TEXT_KINDS[f.kind] || 'text', placeholder: f.placeholder, spellcheck: f.kind === 'text' || f.kind === 'longtext', name: 'seo-' + f.key });
      row.dataset.seoField = f.key;
      rows.push(row);
      /* A value that cleans to something else is not stored as typed -- say what it needed
         instead of letting the fallback land silently. */
      var raw = draft()[f.key];
      if (f.needs && typeof raw === 'string' && raw.trim() && ArkSEO.cleanField(f, raw) !== raw.trim().replace(/\/+$/, '')) {
        rows.push(h('p', { class: 'hint seo-refusal', text: 'Not used: ' + f.label.toLowerCase() + ' needs ' + f.needs + '. Until then ' + (ArkSEO.cleanField(f, raw) ? '"' + ArkSEO.cleanField(f, raw) + '"' : 'nothing') + ' is stored.' }));
      }
    });
    return rows;
  }
  /* A self-repainting box of seoFieldRows: segmented/select controls only show their new
     state after a repaint; free-text fields keep the caret (they commit on 'change'). */
  function seoFieldsPanel(fields, target, onEdited) {
    var box = h('div', { class: 'seo-controls' });
    function paint() { box.textContent = ''; seoFieldRows(fields, target, function (f) { onEdited(f); if (!SEO_TEXT_KINDS[f.kind] || f.needs) paint(); }).forEach(function (row) { box.appendChild(row); }); }
    paint();
    return box;
  }
  /* The per-route override entry a page/article's SEO is stored under, created on first edit. */
  function seoOverrideTarget(map, id) {
    var entries = seoDraft[map] || (seoDraft[map] = {});
    return entries[id] || (entries[id] = {});
  }

  /* Content mode: a page's own SEO tab. Every per-page field, from the same definitions
     the Design-mode SEO tab uses. */
  function buildPageSeoPanel(pageId, label) {
    var box = h('fieldset', {}, h('legend', { text: 'SEO' }));
    if (!window.ArkSEO) { box.appendChild(h('p', { class: 'empty-state', text: 'SEO editing is unavailable on this page: js/content/seo.js did not load. Reload the editor; if it persists, check that admin-app.html still includes it.' })); return box; }
    box.appendChild(h('p', { class: 'hint', text: 'These values belong to this page (' + ArkSEO.pageTitle(pageId, label) + '). Blank title and description derive from the page text and site defaults. Site-wide settings (base URL, language, AI crawlers) are in Design \u2192 Theme & defaults.' }));
    box.appendChild(seoFieldsPanel(ArkSEO.OVERRIDE_FIELDS, function () { return seoOverrideTarget('pages', pageId); }, function () { touch(); renderList(); }));
    return box;
  }

  $('frame').addEventListener('load', function () { notifyPreviewAssets(); notifyPreviewMesh(); notifyPreviewTheme(); notifyPreviewState(); });
  $('reload').addEventListener('click', reloadPreview);

  /* ---- mesh tuning + page shapes (js/content/mesh-settings.js) ------- */
  /* Built straight into a page's own editor (renderEditor, for a page hasShape() names),
     right where a person is already reading that page's fields, instead of a separate
     "Shapes" list to go find. meshDraft/meshSaved are shared module state so an edit on
     one page's screen and Save from another never disagree. */
  function reliefDirty() { return !window.ArkMeshSettings || JSON.stringify(ArkMeshSettings.sanitize(meshDraft)) !== meshSaved; }
  async function saveMeshDraft(button) {
    try {
      if (state.cdirs) {
        await ArkAdminStore.saveMeshSettings(state.cdirs.content, meshDraft);
        status('Saved js/content/mesh-settings-data.js', 'ok');
      } else {
        download('mesh-settings-data.js', ArkMeshSettings.serialize(meshDraft));
        status('Downloaded mesh-settings-data.js. Put it in js/content/, or connect the project folder to save directly.', 'warn');
      }
    /* Step 5: re-throws now that saveEverything() is this function's only caller -- see
       saveThemeDraft's matching comment above. */
    } catch (error) { status(error.message, 'error'); throw error; }
    meshDraft = ArkMeshSettings.sanitize(meshDraft);
    meshSaved = JSON.stringify(meshDraft);
    ArkMeshSettings.define(meshDraft);
    if (button) button.disabled = true;
    renderList();
  }
  /* An image file picked right next to a shape's own select, so adding a new
     photo never means leaving this screen for the Images list first. Reuses
     the same decode + id rules as the standalone "add image" form. */
  function quickAddAsset(file, onDone) {
    readFileAsAsset(file, function (next) {
      var id = assetIdSlug(file.name);
      state.assetIds.push(id);
      state.assetDrafts[id] = { id: id, label: id, mime: next.mime, dataBase64: next.dataBase64 };
      state.assetSaved[id] = null;
      onDone(id);
    });
  }
  /* One page's two shape layers, populated from every saved image, each with
     its own inline upload. Each layer can use the page's built-in behavior,
     an image, or no shape at all. */
  function buildShapePickers(pageId) {
    var box = h('fieldset', {}, h('legend', { text: 'Images' }));
    var page = meshDraft.pages[pageId];
    var hiddenId = 'shape-' + pageId + '-hidden';
    var hiddenBox = h('input', { id: hiddenId, type: 'checkbox' });
    hiddenBox.checked = !!page.hidden || (page.primaryMode === 'none' && page.surfaceMode === 'none');
    hiddenBox.addEventListener('change', function () {
      page.hidden = hiddenBox.checked;
      if (hiddenBox.checked) { page.primaryMode = 'none'; page.surfaceMode = 'none'; }
      else { if (page.primaryMode === 'none') page.primaryMode = page.primary ? 'image' : 'built-in'; if (page.surfaceMode === 'none') page.surfaceMode = page.surface ? 'image' : 'built-in'; }
      notifyPreviewMesh(); renderEditor(); renderList();
    });
    box.appendChild(h('div', { class: 'field field-inline' }, hiddenBox, h('label', { for: hiddenId, text: 'Hide both shapes for this page' })));
    box.appendChild(h('p', { class: 'hint', text: 'Shape 1 and Shape 2 can each use the built-in page shape, one of your images, or nothing.' }));
    ['primary', 'surface'].forEach(function (slot) {
      var id = 'shape-' + pageId + '-' + slot;
      var modeKey = slot + 'Mode';
      var modeId = id + '-mode';
      var mode = h('select', { id: modeId, onchange: function () {
        page[modeKey] = mode.value;
        page.hidden = page.primaryMode === 'none' && page.surfaceMode === 'none';
        notifyPreviewMesh(); renderEditor(); renderList();
      } });
      mode.appendChild(h('option', { value: 'built-in', text: 'Built-in shape' }));
      mode.appendChild(h('option', { value: 'image', text: 'Use image' }));
      mode.appendChild(h('option', { value: 'none', text: 'No shape' }));
      mode.value = page[modeKey] || (page[slot] ? 'image' : 'built-in');
      var select = h('select', { id: id, onchange: function () {
        page[slot] = select.value || null;
        if (select.value) page[modeKey] = 'image';
        notifyPreviewMesh(); renderEditor(); renderList();
      } });
      select.appendChild(h('option', { value: '', text: 'Choose an image' }));
      state.assetIds.forEach(function (assetId) {
        select.appendChild(h('option', { value: assetId, text: state.assetDrafts[assetId].label || assetId }));
      });
      select.value = page[slot] || '';
      var upload = h('input', { id: id + '-upload', type: 'file', accept: ArkAsset.mimeTypes.join(',') });
      upload.addEventListener('change', function () {
        var file = upload.files && upload.files[0];
        if (!file) return;
        quickAddAsset(file, function (assetId) {
          page[slot] = assetId;
          page[modeKey] = 'image';
          notifyPreviewAssets(); notifyPreviewMesh();
          renderEditor(); renderList();
          status('Added "' + assetId + '" and set it as this page’s ' + slot + ' image. Save the image and Save this page’s shapes to keep it.', 'ok');
        });
      });
      box.appendChild(h('div', { class: 'field' },
        h('label', { for: modeId, text: slot === 'primary' ? 'Shape 1' : 'Shape 2' }),
        mode,
        h('label', { for: id, class: 'hint', text: slot === 'primary' ? 'Image for Shape 1' : 'Image for Shape 2' }),
        select,
        h('label', { for: id + '-upload', class: 'hint', text: 'or upload a new image' }),
        upload));
    });
    return box;
  }
  /* This page's own size and screen position -- independent of the shared
     tuning below, since where a shape sits is a per-page layout choice, not
     a look shared by every page. Stored on meshDraft.pages[pageId] itself. */
  function buildPlacementPanel(pageId) {
    var box = h('fieldset', { class: 'relief' }, h('legend', { text: 'Size and position' }));
    box.appendChild(h('p', { class: 'hint', text: 'Where this page’s shape sits and how big it is. Shared tuning below still applies on top of this.' }));
    var fields = h('div', { class: 'relief-fields' });
    ArkMeshSettings.placementFields().forEach(function (f) {
      var id = 'place-' + pageId + '-' + f.key;
      var out = h('output', { for: id, text: String(meshDraft.pages[pageId][f.key]) });
      var input = h('input', { id: id, type: 'range', min: f.min, max: f.max, step: f.step, oninput: function () {
        meshDraft.pages[pageId][f.key] = Number(input.value);
        out.textContent = String(meshDraft.pages[pageId][f.key]);
        notifyPreviewMesh(); touch();
      } });
      input.value = meshDraft.pages[pageId][f.key];
      fields.appendChild(h('div', { class: 'relief-field' },
        h('div', { class: 'relief-field-head' }, h('label', { for: id, text: f.label }), out),
        input));
    });
    box.appendChild(fields);
    var reset = h('button', { type: 'button', class: 'btn', text: 'Reset size and position', onclick: function () {
      ArkMeshSettings.placementFields().forEach(function (f) { meshDraft.pages[pageId][f.key] = f.def; });
      notifyPreviewMesh(); renderEditor();
    } });
    box.appendChild(h('div', { class: 'tools' }, reset));
    return box;
  }
  function buildMeshTuningPanel() {
    var box = h('fieldset', { class: 'relief' }, h('legend', { text: 'Shared shape tuning' }));
    if (!window.ArkMeshSettings) return box;
    box.appendChild(h('p', { class: 'hint', text: 'Contrast, depth and particle count -- shared by every page’s shape images, not just this one. Drag a slider to see it change in the preview on the right; nothing is written until Save.' }));
    var fields = h('div', { class: 'relief-fields' });
    var reset = h('button', { type: 'button', class: 'btn', text: 'Reset tuning to defaults' });
    function refreshInputs() {
      fields.textContent = '';
      ArkMeshSettings.fields().forEach(function (f) {
        var id = 'relief-' + f.key;
        var out = h('output', { for: id, text: String(meshDraft.tuning[f.key]) });
        var input = h('input', { id: id, type: 'range', min: f.min, max: f.max, step: f.step, oninput: function () {
          meshDraft.tuning[f.key] = Number(input.value);
          out.textContent = String(meshDraft.tuning[f.key]);
          notifyPreviewMesh(); refreshSaveButton();
        } });
        input.value = meshDraft.tuning[f.key];
        fields.appendChild(h('div', { class: 'relief-field' },
          h('div', { class: 'relief-field-head' }, h('label', { for: id, text: f.label }), out),
          input));
      });
      refreshSaveButton();
    }
    reset.addEventListener('click', function () { meshDraft.tuning = ArkMeshSettings.defaults().tuning; refreshInputs(); notifyPreviewMesh(); });
    /* no Save of its own: the header's one Save (saveEverything) writes the tuning with every
       other dirty draft, so nothing is skipped because Save was pressed from this panel */
    refreshInputs();
    box.appendChild(fields);
    box.appendChild(h('div', { class: 'tools' }, reset));
    return box;
  }
  /* Only for a shape page with no manifest of its own (Demo, Lab): everything else edits its
     shapes inline on its real page (renderEditor, via hasShape/shapePageId above). */
  function renderShapeEditor() {
    var root = $('editor'); root.textContent = '';
    var id = state.shapeCurrent;
    if (!id || !window.ArkMeshSettings) { root.appendChild(h('p', { class: 'empty-state', text: 'Pick a page on the left.' })); return; }
    root.appendChild(h('div', { class: 'editor-head' },
      h('div', {}, h('h1', { text: state.shapeLabels[id] || id }), h('div', { class: 'route', text: 'js/content/mesh-settings-data.js' }))));
    root.appendChild(buildShapePickers(id));
    root.appendChild(buildPlacementPanel(id));
    root.appendChild(buildMeshTuningPanel());
  }

  /* ---- mesh deployment view ------------------------------------------
     A dedicated place to see the mesh the way it actually works: what is
     published right now, how that differs from what is saved here, and --
     the thing people otherwise assume wrong -- that none of it is
     encrypted. Read-only: writing the published copy onto disk stays
     scripts/pull-site.mjs's job, which already does that correctly with
     real file semantics (added/changed/removed per file); reimplementing
     a write path here would be a second place for the two to drift. */
  function meshRow(label, value) {
    return h('div', { class: 'mesh-row' }, h('span', { class: 'mesh-row-key', text: label }), h('span', { class: 'mesh-row-val mono', text: value || '—' }));
  }
  function buildMeshSecurityNote() {
    var box = h('fieldset', { class: 'mesh-security' }, h('legend', { text: 'What’s actually protected' }));
    box.appendChild(h('p', {}, h('strong', { text: 'Public: ' }),
      document.createTextNode('every page, article and image published here is one content-addressed archive on the mesh, unencrypted. Anyone who has the address (or finds the name record) can fetch and read all of it, the same as a public IPFS file. Publishing is distribution, not privacy.')));
    box.appendChild(h('p', {}, h('strong', { text: 'Encrypted content: ' }),
      document.createTextNode('an item under Encrypted is published the same way — content-addressed, fetchable by anyone — but its body is AES-GCM ciphertext and the file key is only wrapped for the recipients you chose. Only someone holding a matching secret key can read it; everyone else fetches opaque bytes.')));
    box.appendChild(h('p', {}, h('strong', { text: 'Signed, not secret: ' }),
      document.createTextNode('the record pointing flux-chain.ark at that address is signed by your identity so no one else can repoint the name — but the signature and the record are public too.')));
    box.appendChild(h('p', {}, h('strong', { text: 'Actually private: ' }),
      document.createTextNode('only your signing key, and only in this browser tab’s memory (js/admin/auth.js). It is never sent to the publish host, the miner, or the mesh, and is dropped on reload or sign-out. The sign-in gate protects who can edit and publish — it does not make the content itself confidential.')));
    box.appendChild(h('p', { class: 'hint' }, document.createTextNode('Rule of thumb: never put anything in a page, article or image you would not want permanently public. Once a version is pinned, other peers may already have copied it — publishing a newer version does not erase the old one from the mesh.')));
    return box;
  }
  function renderMeshEditor() {
    var root = $('editor'); root.textContent = '';
    var routeLabel = h('div', { class: 'route', text: 'P2P deployment' });
    root.appendChild(h('div', { class: 'editor-head' },
      h('div', {}, h('h1', { text: 'Mesh' }), routeLabel),
      h('div', { class: 'editor-actions' }, h('button', { type: 'button', class: 'btn', text: 'Refresh', onclick: function () { load(); } }))));

    var statusRows = h('div', { class: 'mesh-rows' });
    var diffText = h('p', { class: 'hint' });
    var liveSummary = h('p', { class: 'hint' });
    var liveList = h('ul', { class: 'mesh-list' });
    root.appendChild(h('fieldset', {}, h('legend', { text: 'Deployment status' }), statusRows));
    root.appendChild(h('fieldset', {}, h('legend', { text: 'Local vs. published' }), diffText));
    root.appendChild(h('fieldset', {}, h('legend', { text: 'What’s live on the mesh right now' }), liveSummary, liveList));
    root.appendChild(buildMeshSecurityNote());

    function fill(rows) { statusRows.textContent = ''; rows.forEach(function (r) { statusRows.appendChild(meshRow(r[0], r[1])); }); }

    async function load() {
      if (!mesh) {
        fill([['Publish host', 'Not reachable from this copy of the page']]);
        diffText.textContent = 'Open this page through the publish host (node scripts/publish-host.mjs) to compare.';
        liveSummary.textContent = ''; liveList.textContent = '';
        return;
      }
      fill([['Status', 'Checking…']]);
      diffText.textContent = 'Checking…';
      liveSummary.textContent = 'Checking…'; liveList.textContent = '';
      var info;
      try { info = await mesh.status(); }
      catch (error) { fill([['Status', error.message]]); diffText.textContent = ''; liveSummary.textContent = ''; return; }
      routeLabel.textContent = info.name + ' — P2P deployment';
      var rows = [['Reachable', info.reachable ? 'Yes' : 'No — ' + (info.detail || '')]];
      if (info.miner) rows.push(['Through', (info.miner.label || info.miner.statusBase) + (info.miner.networkId ? ' (network ' + info.miner.networkId + ')' : '')]);
      if (info.current) {
        rows.push(['Version', String(info.current.version)]);
        rows.push(['Address (CID)', info.current.cid]);
        rows.push(['Owner key', info.current.ownerPublicKey]);
        rows.push(['Updated', info.current.updatedAt]);
      } else rows.push(['Published', 'Not yet — Publish creates version 1.']);
      fill(rows);

      if (!info.current) {
        diffText.textContent = 'Nothing is published yet, so everything saved here is local-only.';
        liveSummary.textContent = 'Nothing published yet.'; liveList.textContent = '';
        return;
      }
      try {
        var pulled = await mesh.pullSite(); // { record, cid, site }
        var site = pulled.site;
        liveSummary.textContent = site.manifests.length + ' page(s), ' + site.articles.length + ' article(s), ' + site.assets.length + ' image(s), ' + ((site.secrets || []).length) + ' encrypted item(s) (see below).';
        liveList.textContent = '';
        site.manifests.forEach(function (m) { liveList.appendChild(h('li', { text: (m.title || m.id) + ' — ' + (m.route || m.id) })); });
        site.articles.forEach(function (a) { liveList.appendChild(h('li', { text: (a.title || a.slug) + ' (article)' })); });
        site.assets.forEach(function (a) { liveList.appendChild(h('li', { text: (a.label || a.id) + ' (image)' })); });

        var localPageIds = state.ids.filter(function (id) { return state.saved[id] !== null; });
        var localArticleSlugs = state.slugs.filter(function (s) { return state.aSaved[s] !== null; });
        var localAssetIds = state.assetIds.filter(function (id) { return state.assetSaved[id] !== null; });
        var meshPageIds = site.manifests.map(function (m) { return m.id; });
        var meshArticleSlugs = site.articles.map(function (a) { return a.slug; });
        var meshAssetIds = site.assets.map(function (a) { return a.id; });
        var notIn = function (list) { return function (x) { return list.indexOf(x) < 0; }; };
        var added = localPageIds.filter(notIn(meshPageIds)).concat(localArticleSlugs.filter(notIn(meshArticleSlugs))).concat(localAssetIds.filter(notIn(meshAssetIds)));
        var removed = meshPageIds.filter(notIn(localPageIds)).concat(meshArticleSlugs.filter(notIn(localArticleSlugs))).concat(meshAssetIds.filter(notIn(localAssetIds)));
        var unsaved = state.ids.filter(dirty).length + state.slugs.filter(dirtyA).length + state.assetIds.filter(dirtyI).length + (reliefDirty() ? 1 : 0);
        var parts = [];
        if (added.length) parts.push(added.length + ' saved here but not on the mesh yet (' + added.join(', ') + ')');
        if (removed.length) parts.push(removed.length + ' on the mesh but not here — Publish would remove these (' + removed.join(', ') + ')');
        if (unsaved) parts.push(unsaved + ' unsaved edit(s) in this browser, not even written to the project folder yet');
        diffText.textContent = parts.length ? parts.join('. ') + '.' : 'Every id saved here matches what is published. (This only compares which pages/articles/images exist, not their exact content — Publish always re-checks before it changes anything.)';
      } catch (error) {
        liveSummary.textContent = error.message; liveList.textContent = '';
        diffText.textContent = 'Could not compare.';
      }
    }
    load();
  }

  /* ---- project folder ----------------------------------------------- */
  var supported = typeof window.showDirectoryPicker === 'function';
  function keep(handle) {
    try {
      var open = indexedDB.open('flux-chain-admin', 1);
      open.onupgradeneeded = function () { open.result.createObjectStore('handles'); };
      open.onsuccess = function () { open.result.transaction('handles', 'readwrite').objectStore('handles').put(handle, 'project'); };
    } catch (e) { /* remembering the folder is a convenience; saving still works */ }
  }
  function recall(callback) {
    try {
      var open = indexedDB.open('flux-chain-admin', 1);
      open.onupgradeneeded = function () { open.result.createObjectStore('handles'); };
      open.onsuccess = function () {
        var get = open.result.transaction('handles').objectStore('handles').get('project');
        get.onsuccess = function () { callback(get.result || null); };
        get.onerror = function () { callback(null); };
      };
      open.onerror = function () { callback(null); };
    } catch (e) { callback(null); }
  }
  async function attach(handle) {
    state.dir = await ArkAdminStore.manifestsDir(handle);
    state.cdirs = await ArkAdminStore.contentDirs(handle);
    state.assetDir = await ArkAdminStore.assetsDir(handle);
    state.secretDir = await ArkAdminStore.secretsDir(handle);
    state.historyDir = window.ArkVersions ? await ArkVersions.historyDir(handle) : null;
    if (versionsPanel) versionsPanel.refresh();
    ensureVersionBaseline();
    $('connect').textContent = 'Project folder connected';
    $('connect').disabled = true;
    status('Saving writes straight into ' + handle.name + '/js/content.', 'ok');
  }
  $('connect').addEventListener('click', async function () {
    if (!supported) { status('This browser cannot write to a folder. Saving downloads each file instead; use Chrome or Edge to save in place.', 'warn'); return; }
    try {
      var handle = await window.showDirectoryPicker({ mode: 'readwrite', id: 'flux-chain-project' });
      await attach(handle); keep(handle);
    } catch (error) { if (error.name !== 'AbortError') status(error.message, 'error'); }
  });
  if (!supported) { $('connect').textContent = 'Saves as downloads in this browser'; $('connect').disabled = true; }
  else recall(function (handle) {
    if (!handle || !handle.queryPermission) return;
    handle.queryPermission({ mode: 'readwrite' }).then(function (permission) {
      if (permission === 'granted') return attach(handle);
      $('connect').textContent = 'Reconnect project folder';
    }).catch(function () {});
  });

  /* ---- the mesh ------------------------------------------------------ */
  /* Only when this page is served by the publish host: from a file: URL there is no host to talk to. */
  var publishing = false;   /* a refresh that finishes mid-publish must not re-enable the button */
  function short(text) { return text ? text.slice(0, 8) + '…' + text.slice(-6) : ''; }
  function authorizationDigest(text) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (bytes) {
      return Array.from(new Uint8Array(bytes)).map(function (byte) { return byte.toString(16).padStart(2, '0'); }).join('');
    });
  }
  /* Same inspect -> approve -> sign shape (and the same shared view-model,
     ArkAuthorizationView.scopedAuthorizationView) as flux-dao-app's
     ScopedAuthorizationDialog -- now the real <flux-authorization-dialog>
     element too, instead of a hand-rolled lookalike. The element itself is
     an ARIA/focus-trap/busy-state primitive with no visual template, so the
     markup below mirrors ark-ui.flux-authorization-react.ts's exactly: a
     dismissible backdrop over a panel, this page's own "admin-auth-*" CSS. */
  function authorizePublish(input) {
    var who = gate.identity();
    if (!who) return Promise.resolve(false);
    return authorizationDigest(input.signingMessage).then(function (digest) {
      return new Promise(function (resolve) {
        var titleId = 'authDialogTitle-' + Date.now(), descId = 'authDialogDesc-' + Date.now();
        var dialog = document.createElement('flux-authorization-dialog');
        dialog.action = 'flux.site.publish';
        dialog.capability = 'site.publish';
        dialog.setAttribute('aria-labelledby', titleId);
        dialog.setAttribute('aria-describedby', descId);
        var view = window.ArkAuthorizationView.scopedAuthorizationView({
          title: input.title,
          description: input.description,
          requester: who.displayName || 'Signed-in identity',
          network: 'Local publish host',
          authority: who.publicKeyB64,
          configuration: input.record.name || 'flux-chain.ark',
          scope: 'site.publish',
          action: 'flux.site.publish',
          manifestDigest: digest,
          claimStack: 'primary authorize flux.site.publish for exact name record ' + digest + '\nconstraint owner ' + who.publicKeyB64 + '\nfailure reject altered, expired or cross-site bytes\ntrust zero',
          manifest: input.record,
          authorizationBytes: input.signingMessage,
          actionPayloadBytes: input.signingMessage,
          facts: [{ label: 'Version', value: String(input.record.version || 'next') }, { label: 'Signing profile', value: who.securityProfile === 'hybrid-pq' ? 'Hybrid identity available; names/* record remains Ed25519' : 'Ed25519 name record' }]
        });
        var backdrop = h('div', { class: 'admin-auth-backdrop' });
        var panel = h('section', { class: 'admin-auth-panel' });
        var title = h('div', { class: 'admin-auth-title' }, h('span', { class: 'kicker', text: 'Scoped publish authorization' }), h('h2', { id: titleId, text: view.heading }));
        var close = h('button', { type: 'button', class: 'admin-auth-close', 'aria-label': 'Cancel authorization', text: '×' });
        panel.appendChild(h('header', {}, title, close));
        panel.appendChild(h('p', { id: descId, class: 'admin-auth-description', text: view.description }));
        var context = h('dl', { class: 'admin-auth-context' });
        view.rows.forEach(function (row) { context.appendChild(h('div', {}, h('dt', { text: row.label }), h('dd', { text: row.value }))); });
        panel.appendChild(context);
        panel.appendChild(h('div', { class: 'admin-auth-digest' }, h('small', { text: 'Exact manifest digest · SHA-256' }), h('code', { text: view.digest })));
        view.disclosures.forEach(function (item) {
          var details = document.createElement('details'); details.appendChild(h('summary', { text: item.label }));
          var pre = document.createElement('pre'); pre.textContent = item.text; details.appendChild(pre); panel.appendChild(details);
        });
        panel.appendChild(h('p', { class: 'admin-auth-safety', text: view.safety + ' This publish action still signs the existing Ed25519 names/* record contract.' }));
        var footer = h('footer', {}, h('button', { type: 'button', class: 'btn', text: 'Cancel' }), h('button', { type: 'button', class: 'btn primary', 'data-autofocus': true, text: 'Approve scopes & sign' })); panel.appendChild(footer);
        backdrop.appendChild(panel); dialog.appendChild(backdrop); document.body.appendChild(dialog);
        var cancelButton = footer.children[0], approveButton = footer.children[1], closed = false;
        function finish(ok) { if (closed) return; closed = true; dialog.remove(); resolve(ok); }
        function busy() { return dialog.state === 'signing'; }
        close.addEventListener('click', function () { if (!busy()) finish(false); });
        cancelButton.addEventListener('click', function () { if (!busy()) finish(false); });
        approveButton.addEventListener('click', function () {
          dialog.state = 'signing';
          close.disabled = true; cancelButton.disabled = true; approveButton.disabled = true;
          approveButton.textContent = 'Signing locally…';
          finish(true);
        });
        backdrop.addEventListener('mousedown', function (event) { if (event.target === backdrop && !busy()) finish(false); });
        /* Capture-phase so it runs before FluxDialogElement's own bubble-phase
           Escape handler, which otherwise closes the dialog mid-sign. */
        dialog.addEventListener('keydown', function (event) { if (busy() && event.key === 'Escape') event.stopPropagation(); }, true);
        dialog.open = true;
      });
    });
  }
  var mesh = window.ArkPublish ? ArkPublish.create({ identity: function () { return gate.identity(); }, authorize: authorizePublish }) : null;
  /* The whole site as Publish sends it (and as Studio's preview reads it): every draft
     ArkAdminStore.drafts() lists, in its order -- the same list saveEverything() saves, so the
     published archive (scripts/lib/site-bundle.mjs encodeSite) carries every draft a Save
     writes. It once carried 8 of 13: settings defaults, components, states, canvas transitions
     and element motion worked in the editor and on Save, and never reached the mesh. A single
     draft whose module is not loaded on this page is null ("use that module's defaults"). */
  function siteFromState() {
    var site = {};
    ArkAdminStore.drafts().forEach(function (d) {
      if (d.key === 'manifests') site.manifests = state.ids.map(function (id) { return clone(state.drafts[id]); });
      else if (d.key === 'articles') site.articles = state.slugs.map(function (slug) { return articleCopy(state.aDrafts[slug]); });
      else if (d.key === 'assets') site.assets = state.assetIds.map(function (id) { return clone(state.assetDrafts[id]); });
      else if (d.key === 'secrets') site.secrets = state.secretIds.map(function (id) { return clone(state.secretDrafts[id]); });
      else if (d.kind === 'single') site[d.key] = window[d.global] ? clone(singleDraftHandle(d.key).draft()) : null;
      else throw new Error('js/admin/store.js lists the per-id draft "' + d.key + '", which siteFromState() does not know how to publish. Add it here and in scripts/lib/site-bundle.mjs.');
    });
    return site;
  }

  /* why Publish is unavailable (law: a refusal names what it needs; tests/admin-disabled-says-why.cjs) */
  var PUBLISH_NEEDS_HOST = 'Cannot publish from this copy of the page: it reaches no miner. Open the copy the host serves (http://127.0.0.1:3437/admin.html) or double-click "Flux Chain Admin.command".';
  var PUBLISHING_NOW = 'Publishing now: wait for this version to finish.';
  async function refreshMesh() {
    var line = $('meshState'), owner = $('meshOwner');
    if (!mesh) {
      /* opened from disk: this page cannot reach a miner, but a plain link to the host's copy of it can be followed */
      line.textContent = 'This copy of the page cannot publish. Double-click "Flux Chain Admin.command" in the flux-chain folder, or use the copy served by the host: ';
      line.appendChild(h('a', { href: 'http://127.0.0.1:3437/admin.html', text: 'http://127.0.0.1:3437/admin.html' }));
      owner.textContent = ''; $('mesh').open = true;
      refuse($('publish'), PUBLISH_NEEDS_HOST);
      refuse($('meshRefresh'), PUBLISH_NEEDS_HOST);
      return;
    }
    try {
      var info = await mesh.status();
      var who = mesh.identity();
      var through = info.miner ? 'Publishing through ' + (info.miner.label || info.miner.statusBase) + (info.miner.networkId ? ' (network ' + info.miner.networkId + ')' : '') + '. ' : '';
      if (!info.reachable) line.textContent = (info.detail || 'The miner is not reachable.');
      else if (!info.current) line.textContent = through + info.name + ' is not published yet. Publish creates version 1.';
      else line.textContent = through + info.name + ' is at version ' + info.current.version + ', address ' + short(info.current.cid) + ', updated ' + info.current.updatedAt + '.';
      owner.textContent = who ? 'Signed in' + (who.displayName ? ' as ' + who.displayName : '') + '. Key ' + who.publicKeyB64 : 'Not signed in.';
      var chip = $('who'); if (chip) chip.textContent = who ? (who.displayName || 'signed in') + ' · ' + short(who.publicKeyB64) : '';
      if (info.current && who && info.current.ownerPublicKey !== who.publicKeyB64) {
        line.textContent += ' This identity does not own the name: sign in with the identity that does.';
      }
      refuse($('publish'), publishing ? PUBLISHING_NOW : info.reachable ? '' : 'Cannot publish: the miner is not reachable (' + (info.detail || 'no answer') + '). Start the miner or check its address, then Refresh.');
    } catch (error) { line.textContent = error.message; refuse($('publish'), 'Cannot publish: the miner status could not be read (' + error.message + '). Fix that, then Refresh.'); }
  }

  $('publish').addEventListener('click', async function () {
    if (!mesh) return;
    if (!mesh.identity()) {
      // A reload keeps the session but drops the signing key (js/admin/gate.js); get it back without losing this tab's edits.
      status('Choose your recovery file to unlock signing, then publish again.', 'warn');
      try { if (gate && gate.reauthenticate) gate.reauthenticate(); } catch (error) { /* the button click above still told them what to do */ }
      return;
    }
    if (anyDirty()) { status('Save your changes first, so the site files and the published copy match.', 'warn'); return; }
    var button = $('publish'); refuse(button, PUBLISHING_NOW); publishing = true;
    try {
      var result = await mesh.publishSite(siteFromState(), function (message) { status(message, ''); }, function (removes) {
        var what = removes ? removes.manifests.concat(removes.articles).concat(removes.assets).concat(removes.secrets || []).join(', ') : 'possibly some pages, articles, images or encrypted items (the published version could not be compared)';
        return window.confirm('This version removes what is published now: ' + what + '.\n\nThis page may be out of date, for example if its saves were only downloaded. Publish anyway?');
      });
      if (result.cancelled) status('Not published. Reload this page to pick up the project files, or run node scripts/pull-site.mjs to bring in the published copy.', 'warn');
      else if (result.unchanged) status('Nothing new to publish: version ' + result.version + ' already holds this content.', 'ok');
      else status('Published version ' + result.published + (result.confirmed ? ', confirmed by the miner reading it back.' : '. The miner has not read it back yet: refresh the Mesh panel.'), result.confirmed ? 'ok' : 'warn');
      /* The name record keeps no link to the version before it, so this is the only place a
         published address is remembered: a forward 'publish' record in the version history. */
      if (result && result.published) recordVersion(1, { kind: 'publish', published: { version: result.published, cid: result.cid || '' } });
    } catch (error) {
      status(error.message + (error.detail && error.detail.remedy && error.message.indexOf(error.detail.remedy) < 0 ? ' To fix: ' + error.detail.remedy : ''), 'error');
    }
    publishing = false; refuse(button, ''); refreshMesh();
  });
  $('meshRefresh').addEventListener('click', refreshMesh);
  $('meshNav').addEventListener('click', selectMesh);
  if (gate.localDevelopment && gate.localDevelopment()) { $('signOut').textContent = 'Sign out identity'; $('signOut').title = 'Drop the identity and signing key; local editing remains open.'; }
  $('signOut').addEventListener('click', function () { gate.signOut(); });
  /* The header's account menu: who is signed in, the project folder, shortcuts, sign-out --
     occasional actions, folded into one icon so the header keeps to one row. */
  function setAccountMenu(open) { $('accountMenu').hidden = !open; $('accountBtn').setAttribute('aria-expanded', String(open)); }
  $('accountBtn').addEventListener('click', function () { setAccountMenu($('accountMenu').hidden); });
  /* a menu action (Connect, Sign out) closes the menu; its result shows in the status line */
  $('accountMenu').addEventListener('click', function (event) { if (event.target.closest('button')) setAccountMenu(false); });
  document.addEventListener('pointerdown', function (event) { if (!$('accountMenu').hidden && !$('account').contains(event.target)) setAccountMenu(false); });
  $('account').addEventListener('keydown', function (event) { if (event.key === 'Escape' && !$('accountMenu').hidden) { setAccountMenu(false); $('accountBtn').focus(); } });
  /* the locked page asks before it signs out over unsaved work */
  /* `site` is read-only: exactly what Publish would send right now (a fresh copy). The
     publish round-trip browser test (tests/browser/publish-flows.mjs) takes the real
     editor's payload from it instead of rebuilding one the editor might not send. */
  /* designCheck: the Design check's settled reading of the previewed page, the same run the
     button makes (tests/browser/design-check-stable.mjs runs it repeatedly on one page) */
  window.ArkAdminApp = { unsaved: function () { return anyDirty(); }, site: function () { return siteFromState(); },
    designCheck: function () { return measureChecks().then(function (checks) { return { settled: lastChecksSettled, checks: clone(checks) }; }); } };

  /* ---- version history (js/admin/versions.js + js/admin/versions-panel.js) ------------
     The history is kept beside the site in cms-history/, through the same connected folder
     Save writes the site through. Publish cannot supply it: the name record has no link to
     the version before it (its archive now carries all 13 drafts, but only the latest). This block is only the
     glue between the store, the panel, and the drafts/preview/save that already live here. */
  var versionPreviewSite = null, versionPreviewReturn = null, pendingRestore = '';
  /* Items a confirmed Restore takes out of the site: { page: { id: savedJSON }, article, asset,
     secret }. They leave the lists at once (the editor and preview show the restored version),
     but their files stay until the next Save removes them through removeItemFile() -- so until
     then they are still part of what is on disk, and of savedSnapshot(). */
  var restoreRemovals = { page: {}, article: {}, asset: {}, secret: {} };
  var SNAPSHOT_KEY = { page: 'manifests', article: 'articles', asset: 'assets', secret: 'secrets' };
  function restoreRemovalsPending() {
    return !!restoreRemovals && Object.keys(restoreRemovals).some(function (kind) { return Object.keys(restoreRemovals[kind]).length > 0; });
  }
  /* Lists a Restore put back in the version's order while every item in them was already saved:
     no item is dirty, so no item save would rewrite the index -- the next Save writes the index
     alone (writeRestoredOrder). Without this a restore that differed only in order saved nothing,
     and its content address could never equal the version's. */
  var restoreReorder = { page: false, article: false, asset: false, secret: false };
  function restoreReorderPending() { return !!restoreReorder && Object.keys(restoreReorder).some(function (kind) { return restoreReorder[kind]; }); }
  async function writeRestoredOrder(attempt) {
    var kinds = Object.keys(restoreReorder).filter(function (kind) { return restoreReorder[kind]; });
    for (var i = 0; i < kinds.length; i++) {
      await attempt(ITEM_KINDS[kinds[i]].index.file + ' (order)', true, async function (kind) {
        var k = ITEM_KINDS[kind];
        if (!k.dir()) throw new Error(k.index.file + ' was not rewritten. Missing: the connected project folder. To fix: connect it (Connect project folder) and Save again.');
        await k.index.write(state[k.ids].filter(function (id) { return state[k.saved][id] != null; }));
        restoreReorder[kind] = false;
      }.bind(null, kinds[i]));
    }
  }
  /* Every draft exactly as it is saved now: the *Saved JSON each draft's own dirty check
     compares against. So a version records the files on disk -- never an unsaved draft, and
     never one whose save just failed. The keys are siteFromState()'s (both follow ArkAdminStore.drafts()),
     so a version previews through the same message the live drafts do. */
  function savedSnapshot() {
    function each(ids, saved, kind) {
      var out = ids.filter(function (id) { return saved[id] != null; }).map(function (id) { return JSON.parse(saved[id]); });
      Object.keys(restoreRemovals[kind]).forEach(function (id) { out.push(JSON.parse(restoreRemovals[kind][id])); }); /* still on disk until Save removes it */
      return out;
    }
    function one(text) { return text == null ? null : JSON.parse(text); }
    var snapshot = { manifests: each(state.ids, state.saved, 'page'), articles: each(state.slugs, state.aSaved, 'article'), assets: each(state.assetIds, state.assetSaved, 'asset'), secrets: each(state.secretIds, state.secretSaved, 'secret') };
    /* the single drafts in ArkAdminStore.drafts() order -- the same order this list was written in by hand before */
    ArkAdminStore.drafts('single').forEach(function (d) { snapshot[d.key] = one(singleDraftHandle(d.key).saved()); });
    return snapshot;
  }
  /* -> a sentence to append to the save message ('' when there is nothing to say) */
  async function recordVersion(savedCount, meta) {
    if (!savedCount || !state.historyDir || !window.ArkVersions) return '';
    /* a caller that names its own restoredFrom (afterDelete: '') does not consume a pending
       Restore -- that claim belongs to the Save that writes the restored drafts */
    var claimsRestore = !meta || !Object.prototype.hasOwnProperty.call(meta, 'restoredFrom');
    try {
      var result = await ArkVersions.record(state.historyDir, savedSnapshot(), Object.assign({ kind: 'save', restoredFrom: pendingRestore }, meta || {}));
      if (claimsRestore) pendingRestore = '';
      if (versionsPanel) versionsPanel.refresh();
      return result.unchanged ? '' : ' Recorded version #' + result.record.seq + '.';
    } catch (error) {
      return ' The version history was not updated (' + error.message + '); the files themselves were saved.';
    }
  }
  /* sitemap.xml / robots.txt / llms.txt into the connected project's root, from what is SAVED
     (savedSnapshot(): the files on disk, never an unsaved or failed draft), through the one
     generator publish/pull also uses (ArkSEO.searchFiles; scripts/lib/site-bundle.mjs
     projectFiles). Save and Delete call it, so the folder's root files never wait for a
     publish to catch up with an SEO edit. -> the names of the files that changed. */
  async function writeSearchFiles() {
    if (!state.cdirs || !state.cdirs.root || !window.ArkSEO || !ArkSEO.searchFiles) return [];
    var saved = savedSnapshot();
    return ArkAdminStore.saveSearchFiles(state.cdirs.root, ArkSEO.searchFiles(saved.seo || {}, saved.manifests, saved.articles));
  }
  /* An empty history starts from the project as it was found, so the first Save already has
     something to differ from -- and to restore. Needs the folder AND the article bodies (a
     snapshot taken before they load would record every article as missing). */
  function ensureVersionBaseline() {
    if (!state.historyDir || !articlesReady || !window.ArkVersions) return;
    ArkVersions.record(state.historyDir, savedSnapshot(), { kind: 'checkpoint', label: 'The project as first connected', ifEmpty: true })
      .then(function (result) { if (!result.unchanged && versionsPanel) versionsPanel.refresh(); })
      .catch(function (error) { status('Version history could not start: ' + error.message, 'warn'); });
  }
  /* Show a version in the real preview iframe, read-only: Design canvas, Live mode (clicks act
     like a visitor's, so nothing can be selected and edited against the wrong drafts). */
  function previewVersion(entry, snapshot) {
    if (!versionPreviewSite) versionPreviewReturn = { kind: state.kind, live: live };
    versionPreviewSite = snapshot;
    if (state.kind !== 'studio') selectStudio();
    if (!live) $('mode').querySelector('[data-m="live"]').click();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    syncCmsPreview(true);
  }
  function exitVersionPreview() {
    if (!versionPreviewSite) return;
    var back = versionPreviewReturn;
    versionPreviewSite = null; versionPreviewReturn = null;
    if (back && !back.live && live) $('mode').querySelector('[data-m="edit"]').click();
    syncCmsPreview(true);
    if (back && back.kind !== state.kind) { state.kind = back.kind; renderList(); renderEditor(); reloadPreview(); }
  }
  /* Restore = load the version as the current UNSAVED drafts. Nothing is written here; the next
     Save writes the files and records a new version naming this one (restoredFrom).
     A page/article/image/encrypted item that exists now but not in the version is listed by
     restorePlan() BEFORE anything changes (the Versions panel shows the exact files and asks).
     With options.removeExtras the next Save removes those files through removeItemFile(), the
     same path Delete uses -- the site's working files only: every version that holds them keeps
     them, so the removal is a new version, not a rewrite. Without it they are kept and named. */
  function itemOf(kind, id) { var text = restoreRemovals[kind][id] != null ? restoreRemovals[kind][id] : state[ITEM_KINDS[kind].saved][id]; return text == null ? null : JSON.parse(text); }
  function restorePlan(snapshot) {
    var removals = [];
    Object.keys(ITEM_KINDS).forEach(function (kind) {
      var k = ITEM_KINDS[kind], inVersion = {};
      (snapshot[SNAPSHOT_KEY[kind]] || []).forEach(function (value) { inVersion[kind === 'article' ? value.slug : value.id] = true; });
      state[k.ids].concat(Object.keys(restoreRemovals[kind])).forEach(function (id) {
        if (inVersion[id]) return;
        var unsaved = state[k.saved][id] === null && restoreRemovals[kind][id] == null, item = unsaved ? state[k.drafts][id] : itemOf(kind, id);
        var name = item && (item.title || item.label);
        removals.push({ kind: kind, id: id, unsaved: unsaved, file: k.path + id + '.js', label: k.noun + ' "' + id + '"' + (name && name !== id ? ' (' + name + ')' : '') });
      });
    });
    return { removals: removals, dirty: anyDirty() };
  }
  /* A second Restore before Save starts over from what is on disk: earlier pending removals go
     back into the lists first, so they are judged against the new version, not dropped twice. */
  function undoRestoreRemovals() {
    Object.keys(restoreRemovals).forEach(function (kind) {
      var k = ITEM_KINDS[kind];
      Object.keys(restoreRemovals[kind]).forEach(function (id) {
        var text = restoreRemovals[kind][id];
        if (state[k.ids].indexOf(id) < 0) state[k.ids].push(id);
        state[k.saved][id] = text; state[k.drafts][id] = JSON.parse(text);
      });
      restoreRemovals[kind] = {};
    });
  }
  /* saveEverything()'s last step: each pending removal is its own attempt, named in the Save
     message, and stays pending if it fails (its file is still there; the next Save retries). */
  async function removeRestoredExtras(attempt) {
    var kinds = Object.keys(restoreRemovals);
    for (var i = 0; i < kinds.length; i++) {
      var kind = kinds[i], ids = Object.keys(restoreRemovals[kind]);
      for (var j = 0; j < ids.length; j++) {
        await attempt('Removed ' + ITEM_KINDS[kind].path + ids[j] + '.js', true, async function (kind, id) {
          await removeItemFile(kind, id, restoreRemovals[kind][id]);
          delete restoreRemovals[kind][id];
        }.bind(null, kind, ids[j]));
      }
    }
  }
  function restoreVersion(entry, snapshot, options) {
    options = options || {};
    if (!options.confirmed && anyDirty() && !window.confirm('Restoring #' + entry.record.seq + ' replaces your unsaved changes with that version, as unsaved drafts. Continue?')) return false;
    undoRestoreRemovals();
    var kept = [], removing = [];
    function apply(kind, values, idOf) {
      var k = ITEM_KINDS[kind], idsKey = k.ids, draftsKey = k.drafts, savedKey = k.saved;
      var inVersion = {};
      var savedOrderBefore = state[idsKey].filter(function (id) { return state[savedKey][id] != null; }).join('\n');
      values.forEach(function (value) {
        var id = idOf(value); inVersion[id] = true;
        if (state[idsKey].indexOf(id) < 0) { state[idsKey].push(id); state[savedKey][id] = null; }
        state[draftsKey][id] = value;
      });
      state[idsKey] = state[idsKey].filter(function (id) {
        if (inVersion[id]) return true;
        if (state[savedKey][id] === null) { delete state[draftsKey][id]; delete state[savedKey][id]; return false; } /* an unsaved new item the version never had */
        if (options.removeExtras) {
          restoreRemovals[kind][id] = state[savedKey][id];
          delete state[draftsKey][id]; delete state[savedKey][id];
          removing.push(k.path + id + '.js'); return false;
        }
        kept.push(id); return true;
      });
      /* The version's own order, exactly. An item the current site no longer has used to be
         appended at the END, so a restored list could differ from the version in order alone and
         the restore's content address never equalled the version's (regression:
         tests/browser/versions.mjs "Delete, then Restore"). Items the person chose to keep follow,
         in their current order. */
      state[idsKey] = values.map(idOf).concat(state[idsKey].filter(function (id) { return !inVersion[id]; }));
      var savedAfter = state[idsKey].filter(function (id) { return state[savedKey][id] != null; });
      var stillSaved = {}; savedAfter.forEach(function (id) { stillSaved[id] = true; });
      if (savedOrderBefore.split('\n').filter(function (id) { return stillSaved[id]; }).join('\n') !== savedAfter.join('\n')) restoreReorder[kind] = true;
    }
    var s = snapshot;
    apply('page', s.manifests || [], function (m) { return m.id; });
    apply('article', s.articles || [], function (a) { return a.slug; });
    apply('asset', s.assets || [], function (a) { return a.id; });
    apply('secret', s.secrets || [], function (x) { return x.id; });
    (s.secrets || []).forEach(function (x) { delete state.secretDecrypted[x.id]; });
    ArkAdminStore.drafts('single').forEach(function (d) { if (s[d.key]) singleDraftHandle(d.key).set(s[d.key]); });
    if (state.ids.indexOf(state.current) < 0) state.current = state.ids[0];
    if (state.slugs.indexOf(state.aCurrent) < 0) state.aCurrent = state.slugs[0] || null;
    if (state.assetIds.indexOf(state.assetCurrent) < 0) state.assetCurrent = state.assetIds[0] || null;
    if (state.secretIds.indexOf(state.secretCurrent) < 0) state.secretCurrent = state.secretIds[0] || null;
    pendingRestore = entry.hash;
    cmsSourceSite = siteFromState(); cmsRoutes = studioRoutes();
    renderList(); renderEditor(); reloadPreview(); touch();
    var message = 'Loaded version #' + entry.record.seq + ' as unsaved drafts. Save to make it current: it is recorded as a new version, and every version stays in the history.';
    if (removing.length) message += ' Save also removes ' + removing.length + ' file' + (removing.length === 1 ? '' : 's') + ' #' + entry.record.seq + ' never had (the history keeps them): ' + removing.join(', ') + '.';
    if (kept.length) message += ' Kept, as you chose (not in #' + entry.record.seq + '): ' + kept.join(', ') + '.';
    status(message, 'warn');
    return true;
  }
  var versionsPanel = window.ArkVersionsPanel && $('versionsPanel') ? ArkVersionsPanel.create({
    h: h, root: $('versionsPanel'),
    dir: function () { return Promise.resolve(state.historyDir || null); },
    savedSnapshot: savedSnapshot, anyDirty: anyDirty, status: status, download: download,
    preview: previewVersion, exitPreview: exitVersionPreview, restore: restoreVersion, restorePlan: restorePlan,
    onToggle: function (open) { $('versionsNav').setAttribute('aria-expanded', String(open)); }
  }) : null;
  if (versionsPanel) $('versionsNav').addEventListener('click', versionsPanel.toggle);

  /* Step 5 (flickering-juggling-donut.md), the Ctrl/Cmd+S bug fix: this used to gate on
     currentDirty() (which, for state.kind === 'studio', only checked layout/components --
     missing states/canvas-transitions/element-motion, same defect as the old anyDirty())
     and then call saveCurrent(), which had NO branch for 'studio' at all and fell through
     to the generic single-page-save path using a stale state.current id -- silently doing
     the wrong thing while editing the visual canvas. It now gates on the fixed anyDirty()
     (true for ANY of the 13 drafts, regardless of which mode/kind is currently on screen)
     and calls saveEverything(), the one save action that is itself aware of every draft --
     so Ctrl/Cmd+S always does the right thing no matter which mode/kind is active. */
  document.addEventListener('keydown', function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key === 's') { event.preventDefault(); if (anyDirty()) saveEverything(); }
  });
  window.addEventListener('beforeunload', function (event) { if (anyDirty()) { event.preventDefault(); event.returnValue = ''; } });

  /* Step 2 merge: this used to also call sendStudioState() (now deleted) to push the
     just-loaded site into the Studio iframe once articles were ready. renderEditor()
     already covers that: if state.kind is still its default 'studio', it calls
     renderStudioEditor() (below), which reads this same fresh state directly. */
  loadBodies(function () { adoptArticles(); articlesReady = true; renderList(); renderEditor(); reloadPreview(); refreshMesh(); ensureVersionBaseline(); });
})();

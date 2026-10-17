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
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) node.appendChild(arguments[i]);
    return node;
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  var state = { ids: ArkManifestIds.slice(), drafts: {}, saved: {}, current: null, dir: null,
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
     above. Its editing UI lives entirely inside admin-studio.html's own canvas-mode
     panel (not a separate admin-app.html Design-tab trip, unlike settingsDefaultsDraft's
     own precedent), but the actual persistence still goes through this exact
     draft-replace-then-save-on-next-Save-click pipeline: applyStudioCanvasTransitionsReplace
     keeps this in sync with every field edit Studio relays up, and saveStudioChanges()
     below writes it the same way it already writes states/components/layout. */
  var canvasTransitionsDraft = window.ArkCanvasTransitions ? ArkCanvasTransitions.get() : { version: 1, effect: 'fade', outDuration: 220, inDuration: 260, easing: 'ease' };
  var canvasTransitionsSaved = window.ArkCanvasTransitions ? JSON.stringify(ArkCanvasTransitions.sanitize(canvasTransitionsDraft)) : JSON.stringify(canvasTransitionsDraft);
  function canvasTransitionsDirty() { return JSON.stringify(window.ArkCanvasTransitions ? ArkCanvasTransitions.sanitize(canvasTransitionsDraft) : canvasTransitionsDraft) !== canvasTransitionsSaved; }
  /* Animation-only mode's per-element animation overrides (Part H, follow-up plan) --
     same draft/saved/dirty shape as canvasTransitionsDraft above, addressed per route+
     key instead of one flat object. Its editing UI lives entirely inside admin-studio
     .html's own anim-mode panel, same not-a-separate-admin-app-Design-tab-trip shape
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

  function dirty(id) { return state.saved[id] === null || JSON.stringify(state.drafts[id]) !== state.saved[id] || (hasShape(id) && reliefDirty()); }
  function dirtyA(slug) { return state.aSaved[slug] === null || JSON.stringify(state.aDrafts[slug]) !== state.aSaved[slug]; }
  function dirtyI(id) { return state.assetSaved[id] === null || JSON.stringify(state.assetDrafts[id]) !== state.assetSaved[id]; }
  function dirtyS(id) { return state.secretSaved[id] === null || JSON.stringify(state.secretDrafts[id]) !== state.secretSaved[id]; }
  function currentDirty() { return state.kind === 'article' ? dirtyA(state.aCurrent) : state.kind === 'asset' ? dirtyI(state.assetCurrent) : state.kind === 'secret' ? dirtyS(state.secretCurrent) : state.kind === 'design' ? (themeDirty() || settingsDefaultsDirty()) : state.kind === 'studio' ? (layoutDirty() || componentsDirty()) : state.kind === 'mesh' || state.kind === 'seo' ? false : dirty(state.current) || seoDirty(); }
  function anyDirty() { return state.ids.some(dirty) || state.slugs.some(dirtyA) || state.assetIds.some(dirtyI) || state.secretIds.some(dirtyS) || reliefDirty() || themeDirty() || settingsDefaultsDirty() || layoutDirty() || componentsDirty() || seoDirty(); }

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

  /* ---- page list ---------------------------------------------------- */
  function renderList() {
    var meshNav = $('meshNav');
    if (meshNav) meshNav.setAttribute('aria-current', String(state.kind === 'mesh'));
    var designNav = $('designNav');
    if (designNav) designNav.setAttribute('aria-current', String(state.kind === 'design'));
    designNav && designNav.querySelector('.dot') && designNav.querySelector('.dot').remove();
    if (designNav && (themeDirty() || settingsDefaultsDirty())) designNav.appendChild(h('span', { class: 'dot', title: 'Unsaved global design changes' }));
    var studioNav = $('studioNav');
    if (studioNav) studioNav.setAttribute('aria-current', String(state.kind === 'studio'));
    var list = $('pageList'); list.textContent = '';
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

  function select(id) { state.kind = 'page'; state.current = id; renderList(); renderEditor(); reloadPreview(); }

  function selectArticle(slug) { state.kind = 'article'; state.aCurrent = slug; renderList(); renderEditor(); reloadPreview(); }

  function selectAsset(id) { state.kind = 'asset'; state.assetCurrent = id; renderList(); renderEditor(); reloadPreview(); }

  function selectSecret(id) { state.kind = 'secret'; state.secretCurrent = id; renderList(); renderEditor(); reloadPreview(); }

  function selectShape(id) { state.kind = 'shape'; state.shapeCurrent = id; renderList(); renderEditor(); reloadPreview(); }

  function selectMesh() { state.kind = 'mesh'; renderList(); renderEditor(); reloadPreview(); }

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
    if (state.kind === 'seo') { renderSeoEditor(); return; }
    var root = $('editor'); root.textContent = '';
    var id = state.current, manifest = state.drafts[id];
    if (!manifest) { root.appendChild(h('p', { class: 'empty-state', text: 'Pick a page on the left.' })); return; }
    var save = h('button', { id: 'save', type: 'button', class: 'btn primary', text: 'Save', onclick: saveCurrent });
    var revert = h('button', { id: 'revert', type: 'button', class: 'btn', text: 'Revert', onclick: revertCurrent });
    root.appendChild(h('div', { class: 'editor-head' },
      h('div', {}, h('h1', { text: manifest.title }), h('div', { class: 'route', text: manifest.route + '  ·  js/content/manifests/' + manifest.id + '.js' })),
      h('div', { class: 'editor-actions' }, revert, save)));

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

  /* update everything that depends on "is it dirty" without rebuilding the form */
  function touch() {
    var article = state.kind === 'article', asset = state.kind === 'asset', secret = state.kind === 'secret', now = currentDirty();
    var save = $('save'), revert = $('revert');
    if (save) save.disabled = !now;
    if (revert) revert.disabled = (state.kind === 'design' ? themeSaved : article ? state.aSaved[state.aCurrent] : asset ? state.assetSaved[state.assetCurrent] : secret ? state.secretSaved[state.secretCurrent] : state.saved[state.current]) === null || !now;
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

  async function saveCurrent() {
    if (state.kind === 'article') { await saveArticleCurrent(); return; }
    if (state.kind === 'asset') { await saveAssetCurrent(); return; }
    if (state.kind === 'secret') { await saveSecretCurrent(); return; }
    if (state.kind === 'design') { await saveThemeDraft($('save')); if (window.ArkSiteDefaults && settingsDefaultsDirty()) await saveSettingsDefaultsDraft(null); return; }
    var id = state.current, manifest = state.drafts[id];
    var bad = ArkManifest.problems(manifest);
    if (bad.length) { status('Cannot save: ' + bad.join('; '), 'error'); return; }
    var isNew = state.saved[id] === null;
    try {
      if (state.dir) {
        await ArkAdminStore.save(state.dir, manifest, state.ids);
        status('Saved js/content/manifests/' + id + '.js', 'ok');
      } else {
        download(id + '.js', ArkManifest.serialize(manifest));
        if (isNew) download('index.js', ArkAdminStore.indexText(state.ids));
        status('Downloaded ' + id + '.js' + (isNew ? ' and index.js' : '') + '. Put ' + (isNew ? 'them' : 'it') + ' in js/content/manifests/, or connect the project folder to save directly.', 'warn');
      }
    } catch (error) { status(error.message, 'error'); return; }
    state.saved[id] = JSON.stringify(manifest);
    ArkManifest.define(clone(manifest));
    if (window.ArkMeshSettings && hasShape(id) && reliefDirty()) await saveMeshDraft(null);
    if (window.ArkSEO && seoDirty()) await saveSeoDraft(null);
    renderList(); touch(); reloadPreview();
  }

  async function deleteCurrent() {
    if (state.kind === 'article') { await deleteArticle(); return; }
    if (state.kind === 'asset') { await deleteAsset(); return; }
    if (state.kind === 'secret') { await deleteSecret(); return; }
    var id = state.current, manifest = state.drafts[id];
    if (!state.dir && state.saved[id] !== null) { status('Connect the project folder to delete a page: this removes its file.', 'warn'); return; }
    if (!window.confirm('Delete "' + manifest.title + '"? This removes its file and its link on the theory page.')) return;
    try { if (state.saved[id] !== null) await ArkAdminStore.remove(state.dir, id, state.ids); }
    catch (error) { status(error.message, 'error'); return; }
    state.ids = state.ids.filter(function (other) { return other !== id; });
    delete state.drafts[id]; delete state.saved[id]; ArkManifest.remove(id);
    state.current = state.ids[0]; renderList(); renderEditor(); reloadPreview(); status('Deleted ' + manifest.title + '.', 'ok');
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
    var save = h('button', { id: 'save', type: 'button', class: 'btn primary', text: 'Save', onclick: saveCurrent });
    var revert = h('button', { id: 'revert', type: 'button', class: 'btn', text: 'Revert', onclick: revertCurrent });
    root.appendChild(h('div', { class: 'editor-head' },
      h('div', {}, h('h1', { text: a.title || slug }), h('div', { class: 'route', text: '/learnings/' + slug + '  ·  js/content/articles/' + slug + '.js' })),
      h('div', { class: 'editor-actions' }, revert, save)));

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

  async function saveArticleCurrent() {
    var slug = state.aCurrent, a = state.aDrafts[slug];
    var bad = LearningContent.problems(a);
    if (bad.length) { status('Cannot save: ' + bad.join('; '), 'error'); return; }
    var list = articleList(a);
    try {
      if (state.cdirs) {
        await ArkAdminStore.saveArticle(state.cdirs, a, list);
        status('Saved js/content/articles/' + slug + '.js', 'ok');
      } else {
        download(slug + '.js', LearningContent.serializeBody(a));
        download('article-index.js', LearningContent.serializeIndex(list));
        status('Downloaded ' + slug + '.js and article-index.js. Put ' + slug + '.js in js/content/articles/ and article-index.js in js/content/, or connect the project folder to save directly.', 'warn');
      }
    } catch (error) { status(error.message, 'error'); return; }
    state.aSaved[slug] = JSON.stringify(a);
    LearningContent.put(clone(a));
    renderList(); touch(); reloadPreview();
  }

  async function deleteArticle() {
    var slug = state.aCurrent, a = state.aDrafts[slug];
    if (state.slugs.length <= 1) { status('Keep at least one article: the site links each note to the next.', 'warn'); return; }
    if (!state.cdirs && state.aSaved[slug] !== null) { status('Connect the project folder to delete an article: this removes its file.', 'warn'); return; }
    if (!window.confirm('Delete "' + a.title + '"? This removes its file and its card on the Learnings page.')) return;
    var rest = state.slugs.filter(function (s) { return s !== slug && state.aSaved[s] !== null; }).map(function (s) { return JSON.parse(state.aSaved[s]); });
    try { if (state.aSaved[slug] !== null) await ArkAdminStore.removeArticle(state.cdirs, slug, rest); }
    catch (error) { status(error.message, 'error'); return; }
    state.slugs = state.slugs.filter(function (s) { return s !== slug; });
    delete state.aDrafts[slug]; delete state.aSaved[slug]; LearningContent.remove(slug);
    state.aCurrent = state.slugs[0]; renderList(); renderEditor(); reloadPreview(); status('Deleted ' + a.title + '.', 'ok');
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
    var save = h('button', { id: 'save', type: 'button', class: 'btn primary', text: 'Save', onclick: saveCurrent });
    var revert = h('button', { id: 'revert', type: 'button', class: 'btn', text: 'Revert', onclick: revertCurrent });
    root.appendChild(h('div', { class: 'editor-head' },
      h('div', {}, h('h1', { text: asset.label || id }), h('div', { class: 'route', text: 'js/content/assets/' + id + '.js' })),
      h('div', { class: 'editor-actions' }, revert, save)));

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

  async function saveAssetCurrent() {
    var id = state.assetCurrent, asset = state.assetDrafts[id];
    var bad = ArkAsset.problems(asset);
    if (bad.length) { status('Cannot save: ' + bad.join('; '), 'error'); return; }
    var isNew = state.assetSaved[id] === null;
    try {
      if (state.assetDir) {
        await ArkAdminStore.saveAsset(state.assetDir, asset, state.assetIds);
        status('Saved js/content/assets/' + id + '.js', 'ok');
      } else {
        download(id + '.js', ArkAsset.serialize(asset));
        if (isNew) download('index.js', ArkAdminStore.indexTextAssets(state.assetIds));
        status('Downloaded ' + id + '.js' + (isNew ? ' and index.js' : '') + '. Put ' + (isNew ? 'them' : 'it') + ' in js/content/assets/, or connect the project folder to save directly.', 'warn');
      }
    } catch (error) { status(error.message, 'error'); return; }
    state.assetSaved[id] = JSON.stringify(asset);
    ArkAsset.define(clone(asset));
    renderList(); touch(); reloadPreview();
  }

  async function deleteAsset() {
    var id = state.assetCurrent, asset = state.assetDrafts[id];
    if (!state.assetDir && state.assetSaved[id] !== null) { status('Connect the project folder to delete an image: this removes its file.', 'warn'); return; }
    if (!window.confirm('Delete "' + (asset.label || id) + '"? Anything using this image (for example the concept page) falls back to its default.')) return;
    try { if (state.assetSaved[id] !== null) await ArkAdminStore.removeAsset(state.assetDir, id, state.assetIds); }
    catch (error) { status(error.message, 'error'); return; }
    state.assetIds = state.assetIds.filter(function (other) { return other !== id; });
    delete state.assetDrafts[id]; delete state.assetSaved[id]; ArkAsset.remove(id);
    state.assetCurrent = state.assetIds[0] || null; renderList(); renderEditor(); reloadPreview(); status('Deleted ' + (asset.label || id) + '.', 'ok');
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
    var save = h('button', { id: 'save', type: 'button', class: 'btn primary', text: 'Save', onclick: saveCurrent });
    var revert = h('button', { id: 'revert', type: 'button', class: 'btn', text: 'Revert', onclick: revertCurrent });
    root.appendChild(h('div', { class: 'editor-head' },
      h('div', {}, h('h1', { text: secret.label || id }), h('div', { class: 'route', text: 'js/content/secrets/' + id + '.js' })),
      h('div', { class: 'editor-actions' }, revert, save)));

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

  async function saveSecretCurrent() {
    var id = state.secretCurrent, secret = state.secretDrafts[id];
    var bad = ArkSecret.problems(secret);
    if (bad.length) { status('Cannot save: encrypt the content first (' + bad.join('; ') + ')', 'error'); return; }
    var isNew = state.secretSaved[id] === null;
    try {
      if (state.secretDir) {
        await ArkAdminStore.saveSecret(state.secretDir, secret, state.secretIds);
        status('Saved js/content/secrets/' + id + '.js', 'ok');
      } else {
        download(id + '.js', ArkSecret.serialize(secret));
        if (isNew) download('index.js', ArkAdminStore.indexTextSecrets(state.secretIds));
        status('Downloaded ' + id + '.js' + (isNew ? ' and index.js' : '') + '. Put ' + (isNew ? 'them' : 'it') + ' in js/content/secrets/, or connect the project folder to save directly.', 'warn');
      }
    } catch (error) { status(error.message, 'error'); return; }
    state.secretSaved[id] = JSON.stringify(secret);
    ArkSecret.define(clone(secret));
    renderList(); touch(); reloadPreview();
  }

  async function deleteSecret() {
    var id = state.secretCurrent, secret = state.secretDrafts[id];
    if (!state.secretDir && state.secretSaved[id] !== null) { status('Connect the project folder to delete encrypted content: this removes its file.', 'warn'); return; }
    if (!window.confirm('Delete "' + (secret.label || id) + '"? This cannot be undone.')) return;
    try { if (state.secretSaved[id] !== null) await ArkAdminStore.removeSecret(state.secretDir, id, state.secretIds); }
    catch (error) { status(error.message, 'error'); return; }
    state.secretIds = state.secretIds.filter(function (other) { return other !== id; });
    delete state.secretDrafts[id]; delete state.secretSaved[id]; delete state.secretPlaintext[id]; delete state.secretRecipientsText[id]; delete state.secretDecrypted[id];
    ArkSecret.remove(id);
    state.secretCurrent = state.secretIds[0] || null; renderList(); renderEditor(); reloadPreview(); status('Deleted ' + (secret.label || id) + '.', 'ok');
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
      /* Always poke (not just when dirty): a Revert needs this to overwrite whatever an
         earlier, now-discarded edit already poked into the preview's localStorage, same
         as a Save needs it to stop treating the just-saved value as an unsaved draft. */
      if (state.kind === 'design' && window.ArkSiteDefaults) pokeSettingsDefaultsPreview();
      $('frame').src = 'index.html?preview=' + Date.now() + '#' + route;
    }
  }

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
    if (!win || !articlesReady) return;
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
    } catch (error) { status(error.message, 'error'); return; }
    themeDraft = ArkTheme.sanitize(themeDraft);
    themeSaved = JSON.stringify(themeDraft);
    ArkTheme.define(themeDraft);
    if (button) button.disabled = true;
    renderList();
  }
  /* Same idea again, for the settings-gear's site-wide defaults (js/content/
     settings-defaults.js): what a first-time visitor sees before they ever touch the
     gear. scripts/settings-entry.js (compiled to js/settings/panel.js) has no live
     re-init hook -- it reads localStorage exactly once, at module load -- so an
     unsaved draft can't reach the preview the way theme/mesh do, by posting a message
     into an already-running page. Previewing it needs a full iframe reload instead
     (see reloadPreview(), which calls pokeSettingsDefaultsPreview() right before
     bumping the preview's cache-busting src whenever the design kind has an unsaved
     defaults draft). notifyPreviewSettingsDefaults() just debounces that reload so
     dragging a slider doesn't reload the iframe on every 'input' event. */
  var settingsDefaultsDraft = (window.ArkSiteDefaults && ArkSiteDefaults.get()) || (window.ArkSiteDefaults && ArkSiteDefaults.defaults()) || {};
  var settingsDefaultsSaved = window.ArkSiteDefaults ? JSON.stringify(ArkSiteDefaults.sanitize(settingsDefaultsDraft)) : null;
  var settingsDefaultsReloadTimer = 0;
  function settingsDefaultsDirty() { return !window.ArkSiteDefaults || JSON.stringify(ArkSiteDefaults.sanitize(settingsDefaultsDraft)) !== settingsDefaultsSaved; }
  /* Preview-only plumbing: writes the draft into the SAME localStorage keys a real
     visitor's own gear choice would land in, directly on the preview iframe's own
     (same-origin) window, right before it reloads -- exactly as if that visitor had
     already made this exact choice. Never shipped to the real site (this file is
     admin-only) and never run outside this editor. This is a deliberate, documented
     trade-off: because it writes real visitor-facing keys on a shared origin, it is
     only ever called right before a preview reload, never left to persist as a side
     effect of merely opening the Design panel. */
  function pokeSettingsDefaultsPreview() {
    var frame = $('frame'), win = frame && !frame.hidden && frame.contentWindow;
    if (!win) return;
    var draft = ArkSiteDefaults.sanitize(settingsDefaultsDraft);
    try {
      win.localStorage.setItem('flux-chain-theme', draft.theme);
      win.localStorage.setItem('defxn-motif-v1', draft.motif);
      win.localStorage.setItem('defxn-pattern-config-v1', JSON.stringify(draft.patternConfig));
    } catch (error) { /* storage unavailable (private mode, etc.) -- preview just shows today's defaults */ }
  }
  function notifyPreviewSettingsDefaults() {
    clearTimeout(settingsDefaultsReloadTimer);
    settingsDefaultsReloadTimer = setTimeout(reloadPreview, 400);
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
    } catch (error) { status(error.message, 'error'); return; }
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
        swatch.addEventListener('input', function () {
          var next = hexToHsl(swatch.value);
          setThemeValue(active, f.key, next);
          out.textContent = next;
          resetOne.disabled = false;
          notifyPreviewTheme(); touch();
        });
        var resetOne = h('button', { type: 'button', class: 'btn tiny', text: 'Default', disabled: current === inherited, onclick: function () {
          if (themeDraft.themes && themeDraft.themes[active]) delete themeDraft.themes[active][f.key];
          swatch.value = hslToHex(inherited); out.textContent = inherited; resetOne.disabled = true;
          notifyPreviewTheme(); touch();
        } });
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
    var save = h('button', { id: 'save', type: 'button', class: 'btn primary', text: 'Save', onclick: function () { saveCurrent(); } });
    var revert = h('button', { id: 'revert', type: 'button', class: 'btn', text: 'Revert', onclick: revertCurrent });
    save.disabled = !(themeDirty() || settingsDefaultsDirty());
    revert.disabled = !(themeDirty() || settingsDefaultsDirty());
    root.appendChild(h('div', { class: 'editor-head' },
      h('div', {}, h('h1', { text: 'Design' }), h('div', { class: 'route', text: 'Global config · js/content/theme-data.js' })),
      h('div', { class: 'editor-actions' }, revert, save)));
    root.appendChild(buildDesignPanel());
    root.appendChild(buildSettingsDefaultsPanel());
  }
  if ($('designNav')) $('designNav').addEventListener('click', selectDesign);

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
      if (!seen[route.path]) { seen[route.path] = true; out.push({ path: route.path, title: route.path === '/' ? 'Home' : route.path.split('/').filter(Boolean).pop().replace(/-/g, ' '), seoId: '', seoArticle: '', key: '' }); }
    });
    return out.sort(function (a, b) { return a.path.localeCompare(b.path); });
  }
  /* Step 2 merge: sendStudioState()/sendStudioPreviewState() are deleted outright -- they
     used to push site state (siteFromState()) across the Studio<->Content-CMS document boundary
     via postMessage ('defxn-studio-load' on first connect, 'defxn-studio-preview-state' on
     every later refresh). That boundary no longer exists: renderStudioEditor() (below, next
     to the rest of the ported Studio code) reads siteFromState()/studioRoutes() directly,
     the same two calls these functions used to wrap in a message. */
  function applyStudioPatches(patches) {
    (patches || []).forEach(function (patch) {
      if (!patch || typeof patch !== 'object') return;
      if (patch.kind === 'manifest') {
        var manifest = state.drafts[patch.id], field = manifest && manifest.fields && manifest.fields[patch.role];
        if (field && typeof patch.value === 'string') field.value = patch.value;
      } else if (patch.kind === 'article') {
        var article = state.aDrafts[patch.slug];
        if (!article || typeof patch.value !== 'string') return;
        if (patch.field && Object.prototype.hasOwnProperty.call(article, patch.field)) article[patch.field] = patch.value;
        else if (Number.isInteger(patch.section) && Number.isInteger(patch.part) && article.sections[patch.section]) article.sections[patch.section][patch.part] = patch.value;
      } else if (patch.kind === 'seo' && patch.value && typeof patch.value === 'object') {
        var map = patch.scope === 'article' ? seoDraft.articles : seoDraft.pages;
        var target = patch.scope === 'site' ? seoDraft.site : map && (map[patch.id] || (map[patch.id] = { title: '', description: '', ogImage: '', canonical: '', schemaType: '', noindex: false, aiSummary: '', aiBlocked: false }));
        /* Beyond the original four string fields (title/description/ogImage/canonical),
           Studio's search/AI panel also edits schemaType/aiSummary (strings), noindex/
           aiBlocked/llms (booleans or 0/1), and the site's AI-crawler policy (an object
           keyed by bot name) -- all accepted here and reconciled into their real shape by
           ArkSEO.sanitize() in saveSeoDraft() below, the same as every other patch value. */
        if (target) Object.keys(patch.value).forEach(function (key) {
          var value = patch.value[key];
          if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || (value && typeof value === 'object')) target[key] = value;
        });
      }
    });
    renderList(); touch();
  }
  function applyStudioLayoutPatch(patch) {
    if (!window.ArkLayout || !patch || typeof patch !== 'object' || !patch.route || (!patch.key && !patch.operation)) return;
    if (patch.operation === 'group') layoutDraft = ArkLayout.group(layoutDraft, patch.route, patch.id, patch.members || [], patch.label);
    else if (patch.operation === 'ungroup') layoutDraft = ArkLayout.ungroup(layoutDraft, patch.route, patch.id);
    else if (patch.operation === 'set-label') layoutDraft = ArkLayout.setLabel(layoutDraft, patch.route, patch.key, patch.label);
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
     state/set-trigger/set-current/advance command is computed once, inside the
     connected preview iframe (js/main.js's cmsStatesCommand), and relayed up here as a
     whole-draft replace -- the exact same shape as applyStudioComponentsReplace above,
     including Studio's own "preview this state" row click: it is just another
     setCurrent call through this same pipeline, so only an explicit Save (below)
     ever writes it to disk -- previewing-then-navigating-away with no Save leaves the
     file untouched, like every other unsaved Studio edit in this app. */
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
  async function saveStudioChanges() {
    var changedPages = state.ids.filter(dirty), changedArticles = state.slugs.filter(dirtyA), wrote = 0;
    try {
      for (var i = 0; i < changedPages.length; i++) {
        var id = changedPages[i], manifest = state.drafts[id], problems = ArkManifest.problems(manifest);
        if (problems.length) throw new Error(id + ': ' + problems.join('; '));
        if (state.dir) await ArkAdminStore.save(state.dir, manifest, state.ids);
        else download(id + '.js', ArkManifest.serialize(manifest));
        state.saved[id] = JSON.stringify(manifest); ArkManifest.define(clone(manifest)); wrote += 1;
      }
      for (var j = 0; j < changedArticles.length; j++) {
        var slug = changedArticles[j], article = state.aDrafts[slug], articleProblems = LearningContent.problems(article);
        if (articleProblems.length) throw new Error(slug + ': ' + articleProblems.join('; '));
        var list = articleList(article);
        if (state.cdirs) await ArkAdminStore.saveArticle(state.cdirs, article, list);
        else { download(slug + '.js', LearningContent.serializeBody(article)); download('article-index.js', LearningContent.serializeIndex(list)); }
        state.aSaved[slug] = JSON.stringify(articleCopy(article)); wrote += 1;
      }
      if (seoDirty()) { await saveSeoDraft(null); wrote += 1; }
      if (layoutDirty()) {
        if (state.cdirs) await ArkAdminStore.saveLayout(state.cdirs.content, layoutDraft);
        else download('layout-data.js', ArkLayout.serialize(layoutDraft));
        layoutDraft = ArkLayout.sanitize(layoutDraft); layoutSaved = JSON.stringify(layoutDraft); ArkLayout.define(layoutDraft); wrote += 1;
      }
      if (componentsDirty()) {
        if (state.cdirs) await ArkAdminStore.saveComponents(state.cdirs.content, componentsDraft);
        else download('components-data.js', ArkComponents.serialize(componentsDraft));
        componentsDraft = ArkComponents.sanitize(componentsDraft); componentsSaved = JSON.stringify(componentsDraft); ArkComponents.define(componentsDraft); wrote += 1;
      }
      if (statesDirty()) {
        if (state.cdirs) await ArkAdminStore.saveStates(state.cdirs.content, statesDraft);
        else download('states-data.js', ArkStates.serialize(statesDraft));
        statesDraft = ArkStates.sanitize(statesDraft); statesSaved = JSON.stringify(statesDraft); ArkStates.define(statesDraft); wrote += 1;
      }
      if (canvasTransitionsDirty()) {
        if (state.cdirs) await ArkAdminStore.saveCanvasTransitions(state.cdirs.content, canvasTransitionsDraft);
        else download('canvas-transitions-data.js', ArkCanvasTransitions.serialize(canvasTransitionsDraft));
        canvasTransitionsDraft = ArkCanvasTransitions.sanitize(canvasTransitionsDraft); canvasTransitionsSaved = JSON.stringify(canvasTransitionsDraft); ArkCanvasTransitions.define(canvasTransitionsDraft); wrote += 1;
      }
      if (elementMotionDirty()) {
        if (state.cdirs) await ArkAdminStore.saveElementMotion(state.cdirs.content, elementMotionDraft);
        else download('element-motion-data.js', ArkElementMotion.serialize(elementMotionDraft));
        elementMotionDraft = ArkElementMotion.sanitize(elementMotionDraft); elementMotionSaved = JSON.stringify(elementMotionDraft); ArkElementMotion.define(elementMotionDraft); wrote += 1;
      }
      renderList(); reloadPreview();
      var message = wrote ? (state.dir ? 'Saved ' + wrote + ' DEFXN content file' + (wrote === 1 ? '' : 's') + ' to the connected project.' : 'Downloaded ' + wrote + ' changed DEFXN content file' + (wrote === 1 ? '' : 's') + '.') : 'DEFXN content is already saved.';
      status(message, 'ok');
      /* Step 2 merge: this used to postMessage a 'defxn-studio-saved' result down into the
         Studio iframe, which showed it as its own toast and then asked admin.js (via
         sendStudioState(), now deleted) to push a fresh site snapshot back down. Direct
         calls replace both hops: toast() is Studio's own function (same scope now), and
         the fresh cmsSourceSite/cmsRoutes snapshot is just read again right here. */
      toast(message);
      cmsSourceSite = siteFromState(); cmsRoutes = studioRoutes(); schedule();
    } catch (error) {
      status(error.message, 'error');
      toast(error.message);
    }
  }
  function selectStudio() { state.kind = 'studio'; renderList(); renderEditor(); reloadPreview(); }
  if ($('studioNav')) $('studioNav').addEventListener('click', selectStudio);

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
  $('btnContentCms').addEventListener('click', () => {
    /* Step 2 merge: this used to postMessage up to admin.js (embedded) or navigate to a
       separate document (opened standalone) -- Studio is never standalone or a separate
       document any more, so this is just the same direct call admin.js's own listener used
       to make on the Studio side's behalf. */
    select(state.current);
  });

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
  const studioDenseBox = $('studioFrameBox');
  const cmsPreview = $('cmsPreview');
  let editingComp = -1;
  let restrictMode = null;
  let rafQueued = false;
  /* STEP 1 CLEANUP: render() (the dense tree -> shadow-DOM builder) is deleted along with the
     rest of the standalone engine; schedule()'s one remaining job is to batch every
     connected-mode repaint into a single animation frame, same as before minus render() and
     the alive[curPage]/editingComp dense re-liveness checks. */
  function schedule() {
    if (rafQueued) return; rafQueued = true;
    requestAnimationFrame(() => {
      rafQueued = false;
      renderCompBar(); renderRestrictBar(); renderLayersPane(); renderPages(); renderLibrary(); renderInspector(); renderPageBtn();
      if (view === 'map') renderSitemap();
      renderStatus(); queueCheck(); refreshPop(); syncCmsPreview();
    });
  }
  /* restrictMode's own enter/exit/toggle, mirroring enterComp/exitComp exactly: force out of
     editingComp/live/map first (the same mutual exclusion enterComp itself already performs
     against live/map), then set the one state variable and re-render. */
  function applyRestrictModeClass() { $('shell').classList.toggle('canvas-mode', restrictMode === 'canvas'); $('shell').classList.toggle('anim-mode', restrictMode === 'anim'); }
  function enterRestrictMode(mode) {
    if (live) { live = false; for (const x of $('mode').children) x.setAttribute('aria-pressed', String(x.dataset.m === 'edit')); $('shell').classList.remove('live'); postCmsPreviewMode(); }
    if (view === 'map') setView('design');
    restrictMode = mode; applyRestrictModeClass(); closePop();
    /* Mirrors enterComp's own showLeft/showTab calls: anim mode's whole point is picking an
       element from the real Layers tree (kept visible for 'anim' only, see .canvas-mode .left
       above), so land there and on the Element tab (Part H's own panel) every time, rather
       than leaving whatever tab happened to be open before entering. Harmless for 'canvas'
       mode too -- its own CSS hides the left rail regardless of which tab is selected. */
    showLeft('layers'); showTab('tabEl', true);
    schedule();
  }
  function exitRestrictMode() { if (!restrictMode) return; restrictMode = null; applyRestrictModeClass(); schedule(); }
  /* Switching canvas -> anim via the banner's own toggle (not enterRestrictMode) needs the
     same "land on the real Layers tree" landing enterRestrictMode already does -- canvas
     mode's CSS hides the whole left rail regardless of which tab was last selected, so
     whatever tab that was (often 'pages' or 'lib', never touched by canvas mode) would
     otherwise reappear once the left rail comes back for anim. The reverse direction (anim
     -> canvas) needs no equivalent call: canvas mode hides .left outright. */
  function toggleRestrictMode() { if (restrictMode === 'canvas') restrictMode = 'anim'; else if (restrictMode === 'anim') restrictMode = 'canvas'; else return; applyRestrictModeClass(); if (restrictMode === 'anim') { showLeft('layers'); showTab('tabEl', true); } schedule(); }
  $('restrictSwitch').addEventListener('click', toggleRestrictMode);
  $('restrictDone').addEventListener('click', exitRestrictMode);
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
  /* The real DEFXN site's own design tokens (css/themes.css's :root block, read 2026-10-16),
     mirrored here -- not imported -- because this file is a deliberately dependency-free
     single document with no <script src>. Canonical copy: js/content/layout.js's TEXT_TOKENS/
     FILL_TOKENS/etc.; keep both in sync by hand if the real site's token names ever change. */
  const CMS_TEXT_TOKENS = ['text-strong', 'text', 'text-muted', 'text-faint', 'text-inverse'];
  const CMS_FILL_TOKENS = ['canvas', 'surface', 'raised', 'nested', 'overlay', 'primary', 'complement', 'accent', 'trust', 'live', 'warning', 'danger', 'hidden', 'reference'];
  const CMS_BORDER_TOKENS = ['border-subtle', 'border-default', 'border-strong'];
  const CMS_FONT_TOKENS = ['display', 'sans', 'mono'];
  const CMS_TYPE_SIZE_TOKENS = ['hero', 'h1', 'h2', 'h3', 'body', 'label', 'metadata'];
  const CMS_RADIUS_TOKENS = ['none', 'card', 'control', 'panel'];
  /* These four have no real site token (no gap/weight/line-height scale exists in css/*.css)
     -- fixed option lists mirroring js/content/layout.js's DISPLAY_TOKENS/etc, same reasoning
     as the token mirrors above: kept in sync by hand, not imported. */
  const CMS_DISPLAY_TOKENS = ['stack', 'row', 'grid', 'block', 'hide'];
  const CMS_ALIGN_TOKENS = ['stretch', 'start', 'center', 'end'];
  const CMS_JUSTIFY_TOKENS = ['start', 'center', 'end', 'between'];
  const CMS_LINE_HEIGHT_TOKENS = ['tight', 'snug', 'normal', 'loose'];
  /* Canvas-only mode (Part G): mirrors js/content/canvas-transitions.js's own EFFECTS/
     EASINGS enums, same reasoning as the token lists above -- this document has no
     <script src> for the content modules, so the small fixed option lists are
     duplicated here as literals, kept in sync by hand. */
  const CMS_CANVAS_EFFECTS = ['fade', 'fade-scale'];
  const CMS_CANVAS_EASINGS = ['ease', 'ease-out', 'ease-in-out'];
  const CMS_CANVAS_TRANSITIONS_DEFAULT = { version: 1, effect: 'fade', outDuration: 220, inDuration: 260, easing: 'ease' };
  /* Animation-only mode (Part H): mirrors js/content/element-motion.js's own DIRECTIONS
     enum/default entry, same reasoning as the token/enum lists above -- this document has
     no <script src> for the content modules. CMS_CANVAS_EASINGS (above) is reused directly
     for this panel's own easing picker rather than copied a second time, per the plan's own
     "reuse Part G's easing list for consistency across the two new systems" instruction. */
  const CMS_ELEMENT_MOTION_DIRECTIONS = ['up', 'down', 'left', 'right', 'none'];
  const CMS_ELEMENT_MOTION_DEFAULT_ENTRY = { direction: 'up', distance: 8, duration: 260, delay: 0, easing: 'ease' };
  /* The 6 generic block resolvers (js/resolvers/blocks/*.js) and their real prop names --
     mirrored, not imported, same reasoning as the token lists above. Canonical copy:
     js/content/components.js's RESOLVERS/RESOLVER_PROPS. */
  const CMS_BLOCK_RESOLVERS = [
    ['RBLOCK_TEXT_V1', 'Text', ['heading', 'body', 'align', 'size']],
    ['RBLOCK_CTA_V1', 'Button / link', ['label', 'href', 'variant']],
    ['RBLOCK_IMAGE_V1', 'Image', ['src', 'alt', 'caption']],
    ['RBLOCK_CARD_V1', 'Card', ['icon', 'title', 'text']],
    ['RBLOCK_QUOTE_V1', 'Quote', ['quote', 'attribution']],
    ['RBLOCK_DIVIDER_V1', 'Divider', []],
  ];
  function cmsBlockResolverLabel(resolver) { const found = CMS_BLOCK_RESOLVERS.find((r) => r[0] === resolver); return found ? found[1] : resolver; }
  function cmsBlockResolverProps(resolver) { const found = CMS_BLOCK_RESOLVERS.find((r) => r[0] === resolver); return found ? found[2] : []; }
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
     none}`), and Content CMS (`btnContentCms`, one click away) already edits every one of
     those same manifest/article/SEO fields directly and visibly. That whole bridge -- the
     dense translation, bindingOf(), and collectCmsPatches()'s per-field value walk -- is
     deleted with Step 1 rather than ported: it duplicated Content CMS's own editors instead
     of being Studio-specific capability. Flagged plainly, same as the Versions/export
     deletion below: if the owner wants Studio to edit manifest/article/SEO text directly
     again, that is new work for a later step, not a port.
     collectCmsPatches() stays as an empty stub so `$('btnCmsSave')`'s existing relay (below)
     keeps working unchanged -- it simply has nothing dense-sourced left to report. */
  /* Step 2 merge: collectCmsPatches()/queueCmsSync() are deleted outright. They existed only
     to relay the (Step 1-deleted) dense manifest/article/SEO patch list up through
     window.parent.postMessage -- collectCmsPatches() already returned [] unconditionally
     (a stub), and queueCmsSync() had no caller left. There is no replacement because there
     is nothing left for either to do: a real manifest/article/SEO edit happens in Content
     CMS's own editors, which mutate state.drafts/seoDraft directly in this same scope. */
  function postCmsPreviewState() {
    if (!cmsConnected || !cmsSourceSite || !cmsPreview.contentWindow) return;
    cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-state', site: cmsSourceSite }, window.location.origin);
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
     state" pattern cmsGroups/cmsComponentAnchors above already use -- never a separate poll. */
  let cmsTree = [];
  /* Select any annotated element by its stable key -- generalizes postCmsSelectGroup's
     existing message (select-by-group-id) rather than inventing a sibling message type, since
     js/main.js's handler for it is a two-line difference, not a different operation. */
  function postCmsSelectKey(key) { if (!cmsConnected || !cmsPreview.contentWindow) return; cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-select-group', key }, window.location.origin); }
  /* Rename a Layers panel row: writes through ArkLayout.setLabel inside the iframe, the same
     draft-mutate-then-relay shape every other layout edit already follows. */
  function postCmsSetLabel(key, label) { if (!cmsConnected || !cmsPreview.contentWindow) return; cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-set-label', route: cmsPreviewRoute, key, label }, window.location.origin); }
  /* Delete/Backspace in connected mode: keyboard focus normally lives inside cmsPreview's own
     document once a real element is selected there (js/main.js gained its own keydown listener
     for that, Part A), so this parent handler's Delete/Backspace branch below only actually
     needs this for the one case where focus stayed in THIS document instead -- e.g. right
     after clicking a "Groups on this page" row, a parent-document button. js/main.js already
     knows the real selection (cmsPreviewSelected); this just asks it to act on it, the same
     "forward to the iframe" shape postCmsSelectGroup/postCmsLayoutOperation already use. */
  function postCmsRemoveSelection() { if (!cmsConnected || !cmsPreview.contentWindow) return; cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-remove-selection' }, window.location.origin); }
  /* Reusable components (js/content/components.js): the current route's declared anchors,
     reported by the preview iframe on every ready/select/components-replace message -- the
     same "the iframe reports its own real state" pattern cmsGroups above already uses. */
  let cmsComponentAnchors = [];
  function postCmsComponentsCommand(payload) {
    if (!cmsConnected || !cmsPreview.contentWindow) return;
    cmsPreview.contentWindow.postMessage(Object.assign({ type: 'defxn-cms-preview-components-command' }, payload), window.location.origin);
  }
  function cmsNextComponentId(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  /* Layered states (js/content/states.js): add-state/remove-state/remove-group/set-
     trigger/set-current all post straight to the iframe, same shape as
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
      cmsPreviewRoute = route;
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
  /* sel/hover/multiSel/elOf are now permanently-unset standalone-canvas leftovers: nothing in
     connected mode sets sel to anything but -1 any more (select()/toggleMultiSelect() and
     every click/drag handler that drove the old dense canvas are deleted), which keeps
     rectOf()/placeOverlays()/placeMultiOverlays() below -- kept verbatim per the follow-up
     plan, since Step 4 reuses their exact positioning math for the new contextual toolbar --
     safely falling through to their "nothing selected" branch every time they run. */
  let sel = -1, hover = -1, device = 0, live = false, view = 'design';
  let multiSel = [];
  const elOf = [];
  /* drag.active stays false forever -- the drag system itself (beginDrag/freeMove/endDrag/
     doDrop/...) is deleted along with the rest of the standalone canvas, but placeOverlays()/
     placeMultiOverlays() below (kept verbatim, see above) still read drag.active. */
  const drag = { active: false };
  /* multiSel stays [] forever (toggleMultiSelect()/the click handlers that populated it are
     deleted), so this always returns [] -- placeMultiOverlays() below (kept verbatim) still
     calls it. */
  function multiSelIds() { return multiSel; }
  const DEVICES = [['Desktop', 1280], ['Tablet', 820], ['Phone', 390]];
  const stage = $('stage'), wrap = $('canvasWrap');
  let scale = 1;
  function layoutStage() {
    if (state.kind !== 'studio' || view !== 'design') return;
    const avail = wrap.clientWidth - (live ? 0 : 32);
    const w = live && device === 0 ? avail : DEVICES[device][1];
    scale = live && device === 0 ? 1 : Math.min(1, avail / w);
    studioDenseBox.style.width = w + 'px'; cmsPreview.style.width = w + 'px'; stage.style.width = w + 'px';
    cmsPreview.style.height = (live ? Math.max(600, wrap.clientHeight) : Math.max(720, Math.round(w * .72))) + 'px';
    stage.style.transform = scale < 1 ? `scale(${scale})` : '';
    stage.style.marginLeft = scale < 1 ? '0' : 'auto';
    const h = cmsPreview.offsetHeight;
    stage.style.marginBottom = scale < 1 ? `${-(h - h * scale)}px` : '0';
    const routeTitle = (cmsRoutes.find((r) => r.path === cmsCurrentRoute) || {}).title || cmsCurrentRoute;
    $('devName').textContent = `${routeTitle} · ${DEVICES[device][0]} · ${w} px`;
    $('devScale').textContent = scale < 1 ? `shown at ${Math.round(scale * 100)}%` : '';
    placeOverlays();
  }
  function rectOf(el) { const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect(); return { x: (r.left - s.left) / scale, y: (r.top - s.top) / scale, w: r.width / scale, h: r.height / scale }; }
  function put(box, r) { box.hidden = false; box.style.left = r.x + 'px'; box.style.top = r.y + 'px'; box.style.width = Math.max(0, r.w) + 'px'; box.style.height = Math.max(0, r.h) + 'px'; }
  function placeOverlays() {
    const sb = $('selBox'), hb = $('hoverBox'), tag = $('selTag'), pads = ['padT', 'padR', 'padB', 'padL'].map($);
    if (live || restrictMode || view !== 'design' || drag.active || sel < 0 || !elOf[sel] || !elOf[sel].isConnected || sel === curPage) { sb.hidden = tag.hidden = true; pads.forEach((p) => (p.hidden = true)); }
    else {
      const el = elOf[sel], r = rectOf(el);
      put(sb, r);
      const cs = getComputedStyle(el), pt = parseFloat(cs.paddingTop), pr = parseFloat(cs.paddingRight), pb = parseFloat(cs.paddingBottom), pl = parseFloat(cs.paddingLeft);
      put(pads[0], { x: r.x, y: r.y, w: r.w, h: pt }); put(pads[2], { x: r.x, y: r.y + r.h - pb, w: r.w, h: pb });
      put(pads[3], { x: r.x, y: r.y + pt, w: pl, h: r.h - pt - pb }); put(pads[1], { x: r.x + r.w - pr, y: r.y + pt, w: pr, h: r.h - pt - pb });
      tag.hidden = false;
      { const root = sel === editingComp; for (const k of ['tagUp', 'tagDown', 'tagDup', 'tagDel']) $(k).hidden = root; $('tagParent').hidden = root; $('tagGrip').hidden = root || !canDrag(sel); }
      $('selName').innerHTML = ic(TYPE_ICON[type[sel]], 'sm') + `<span></span>`; $('selName').lastChild.textContent = (isInstRoot(sel) ? '◆ ' : '') + nodeName(sel) + (isShared(sel) ? ' · on every page' : '') + (lockedStruct(sel) ? ' · in a component' : '');
      const th = scale < 1 ? 26 / scale : 26, fh = stage.offsetHeight;
      tag.style.left = Math.max(0, r.x) + 'px'; tag.style.top = (r.y > th ? r.y - th : r.y + r.h + 2 + th < fh ? r.y + r.h + 2 : r.y + 2) + 'px';
      tag.style.transform = scale < 1 ? `scale(${1 / scale})` : '';
    }
    if (live || restrictMode || view !== 'design' || drag.active || hover < 0 || hover === sel || hover === curPage || !elOf[hover] || !elOf[hover].isConnected) hb.hidden = true; else put(hb, rectOf(elOf[hover]));
    placeMultiOverlays();
  }
  let multiBoxes = [];
  function placeMultiOverlays() {
    const extra = multiSelIds().filter((id) => id !== sel);
    let i = 0;
    for (; i < extra.length; i++) {
      if (!multiBoxes[i]) { const b = document.createElement('div'); b.className = 'ov-box multi'; b.hidden = true; stage.appendChild(b); multiBoxes[i] = b; }
      const el = elOf[extra[i]];
      if (live || restrictMode || view !== 'design' || drag.active || cmsConnected || !el || !el.isConnected) multiBoxes[i].hidden = true; else put(multiBoxes[i], rectOf(el));
    }
    for (; i < multiBoxes.length; i++) multiBoxes[i].hidden = true;
  }
  new ResizeObserver(() => layoutStage()).observe(wrap);
  new ResizeObserver(() => layoutStage()).observe(studioDenseBox);
  wrap.addEventListener('scroll', () => placeOverlays(), { passive: true });

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
  function refreshPop() { if (popEl && popBuild) { const sc = popEl.scrollTop; popEl.textContent = ''; popBuild(popEl); popEl.scrollTop = sc; positionPop(); } }
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
  let dragLayer = -1;
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
     instead of calling renderLayers()/renderConnectedLayers() directly -- the same
     if (cmsConnected) {...} else {...} split renderElementPane() already uses for its own
     connected-vs-standalone content. */
  /* restrictMode (Part F) only overrides the Layers tab for CANVAS mode -- canvas mode has
     nothing to do with individual elements (its own CSS already hides the whole left rail,
     see .canvas-mode .left above), so this placeholder is only ever reachable through a
     stale render call, never actually visible. ANIM mode is the opposite and deliberately
     falls through to the exact same cmsConnected branch every other time: Part H's whole
     design depends on the real connected-mode Layers tree (Part B's renderConnectedLayers())
     staying usable while animating, since it is how the owner picks which element to
     animate -- an earlier draft of this dispatch routed anim mode to a placeholder here too,
     which would have made every element unreachable from the one panel that addresses them. */
  function renderLayersPane() {
    if (restrictMode === 'canvas') { renderRestrictLayersPane(); return; }
    renderConnectedLayers();
  }
  function renderRestrictLayersPane() {
    const ul = $('layers'); if (ul.hidden) return; ul.textContent = '';
    const li = document.createElement('li'); li.className = 'hint'; li.style.padding = '8px 10px';
    li.textContent = 'Canvas transition controls land here.';
    ul.appendChild(li);
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
      li.addEventListener('click', () => openRoute(route.path));
      ul.appendChild(li);
    }
  }
  function showLeft(which) { $('tabLayers').setAttribute('aria-selected', String(which === 'layers')); $('tabPages').setAttribute('aria-selected', String(which === 'pages')); $('tabLib').setAttribute('aria-selected', String(which === 'lib')); $('layers').hidden = which !== 'layers'; $('pagesPane').hidden = which !== 'pages'; $('libPane').hidden = which !== 'lib'; schedule(); }
  $('tabLib').addEventListener('click', () => showLeft('lib'));
  $('tabLayers').addEventListener('click', () => showLeft('layers'));
  $('tabPages').addEventListener('click', () => showLeft('pages'));

  /* page switcher popover in the top bar */
  function renderCompBar() { const b = $('compBar'); b.hidden = editingComp < 0 || view !== 'design' || live || restrictMode; if (b.hidden) return; const n = instancesOf(editingComp).length; $('compBarText').textContent = `Editing main component ${str.n[editingComp]} · changes update ${n} instance${n === 1 ? '' : 's'} at once`; }
  /* restrictMode's own floating banner, mirroring renderCompBar()'s exact shape: same hidden
     gating convention (view/live), a text span, and buttons -- switch to the sibling mode, or
     exit entirely. Gated the opposite way renderCompBar is gated on editingComp. */
  function renderRestrictBar() {
    const b = $('restrictBar'); b.hidden = !restrictMode || view !== 'design' || live;
    if (b.hidden) return;
    $('restrictBarText').textContent = restrictMode === 'canvas' ? 'Editing canvas' : 'Editing animations';
    $('restrictSwitch').textContent = restrictMode === 'canvas' ? 'Switch to animations' : 'Switch to canvas';
  }
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

  /* =========================================================================
     Inspector: collapsible groups so only what matters is open
     ========================================================================= */
  const openGroups = new Set(['component', 'data', 'access', 'seo', 'seoai', 'seock', 'page', 'content', 'link', 'layout', 'spacing', 'type', 'fill', 'cms-canvas-transitions', 'cms-element-motion']);
  try { const g = JSON.parse(localStorage.getItem('defxn-studio-groups') || 'null'); if (Array.isArray(g)) { openGroups.clear(); g.forEach((x) => openGroups.add(x)); openGroups.add('component'); openGroups.add('data'); } } catch (e) {}
  const GROUP_KEYS = { layout: ['display', 'cols', 'gap', 'align', 'justify', 'wrap'], spacing: ['pt', 'pr', 'pb', 'pl', 'mt', 'mb'], size: ['w', 'h', 'maxw', 'minh', 'ar'], position: ['pos', 'anchor', 'x', 'y', 'inset', 'z'], type: ['font', 'fs', 'fw', 'lh', 'ls', 'ta', 'color'], fill: ['bg', 'radius', 'border', 'bc', 'shadow'], effects: ['op', 'rot', 'overflow', 'blend'] };
  function accordion(pane, key, title, icon, id) {
    const d = document.createElement('details'); d.className = 'acc'; d.open = openGroups.has(key);
    const keys = GROUP_KEYS[key] || [];
    const n = id >= 0 ? keys.filter((k) => cell(id, PI[k], device) !== -1).length : 0;
    d.innerHTML = `<summary>${ic(icon)}<span></span>${n ? `<span class="cnt" title="${n} set at this size">${n}</span>` : ''}${ic('chev', 'chev')}</summary>`;
    d.querySelector('summary span').textContent = title;
    const body = document.createElement('div'); body.className = 'acc-body'; d.appendChild(body);
    d.addEventListener('toggle', () => { if (d.open) openGroups.add(key); else openGroups.delete(key); try { localStorage.setItem('defxn-studio-groups', JSON.stringify([...openGroups])); } catch (e) {} });
    pane.appendChild(d); return body;
  }

  let paneMuted = false;
  function renderInspector() {
    if (!$('paneEl').hidden) renderElementPane();
    if (!$('paneTheme').hidden && themePaneStale) renderThemePane();
    if (!$('paneSeo').hidden) renderSeoPane();
    $('btnUndo').disabled = !cmsLayoutCanUndo;
    $('btnRedo').disabled = !cmsLayoutCanRedo;
    const bn = $('bpNote'); bn.hidden = device === 0 || live || restrictMode || view !== 'design'; bn.innerHTML = device ? `${ic('warn', 'sm')}Editing ${DEVICES[device][0].toLowerCase()} overrides` : '';
  }
  /* restrictMode (Part F) takes priority over every other branch below -- including
     cmsConnected's own authoritative-content panel and editingComp's component inspector --
     the same way editingComp already wins over the plain standalone branch. It only ever
     fires when cmsConnected is also true (these modes only make sense against the real
     connected site); Part G/H fill the placeholder in with the real canvas/animation panel. */
  /* Canvas-only mode's real panel (Part G, follow-up plan): site-wide, not per-element --
     reads cmsSourceSite.canvasTransitions (relayed down from js/admin/admin.js's own
     canvasTransitionsDraft on every defxn-studio-load/preview-state message, the same
     siteFromState() round trip layout/components/states already use), and every field
     edit posts straight into the connected preview iframe (postCmsCanvasTransitionsCommand),
     which sanitizes it for real (via ArkCanvasTransitions.define(), the one document that
     actually has that module loaded) and relays the whole updated draft back up through
     this document to admin.js -- an explicit Save is still the only thing that ever
     writes it to disk, exactly like every other Studio-originated draft. */
  function renderCanvasTransitionsPane(pane) {
    pane.textContent = '';
    const head = document.createElement('div'); head.className = 'ins-head';
    const eh = document.createElement('div'); eh.className = 'elhead';
    eh.innerHTML = `<span class="tyb">${ic('sparkle', 'sm')}<span></span></span>`;
    eh.querySelector('.tyb span').textContent = 'Canvas transition';
    head.appendChild(eh);
    const note = document.createElement('p'); note.className = 'hint';
    note.textContent = 'How the background (lattice / atmosphere / brand-mesh) fades out and in between pages. Site-wide, not per page.';
    head.appendChild(note);
    pane.appendChild(head);
    const cfg = Object.assign({}, CMS_CANVAS_TRANSITIONS_DEFAULT, (cmsSourceSite && cmsSourceSite.canvasTransitions) || {});
    const body = accordion(pane, 'cms-canvas-transitions', 'Background transition', 'sparkle', -1);
    const patch = (key, value) => postCmsCanvasTransitionsCommand({ [key]: value });
    const segField = (label, key, options, labels) => {
      const row = document.createElement('div'); row.className = 'row'; const l = document.createElement('label'); l.textContent = label;
      const seg = document.createElement('div'); seg.className = 'ctl-seg';
      options.forEach((opt, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = (labels && labels[i]) || opt;
        b.setAttribute('aria-pressed', String(cfg[key] === opt));
        b.addEventListener('click', () => { if (cfg[key] !== opt) patch(key, opt); });
        seg.appendChild(b);
      });
      row.append(l, seg, document.createElement('span')); return row;
    };
    const durationField = (label, key) => {
      const row = document.createElement('div'); row.className = 'row'; const l = document.createElement('label'); l.textContent = label;
      const input = document.createElement('input'); input.className = 'ctl'; input.type = 'number'; input.min = '0'; input.max = '1200'; input.step = '10';
      input.value = String(cfg[key]); input.setAttribute('aria-label', label);
      input.addEventListener('change', () => { const v = Number(input.value); if (Number.isFinite(v)) patch(key, v); });
      row.append(l, input, document.createElement('span')); return row;
    };
    body.appendChild(segField('Effect', 'effect', CMS_CANVAS_EFFECTS, ['Fade', 'Fade + scale']));
    body.appendChild(durationField('Fade out (ms)', 'outDuration'));
    body.appendChild(durationField('Fade in (ms)', 'inDuration'));
    body.appendChild(segField('Easing', 'easing', CMS_CANVAS_EASINGS, ['Ease', 'Ease out', 'Ease in-out']));
    const preview = document.createElement('button'); preview.className = 'btn small primary'; preview.type = 'button';
    preview.textContent = 'Preview this transition'; preview.style.marginTop = '8px';
    preview.addEventListener('click', postCmsCanvasTransitionPreview);
    body.appendChild(preview);
    const hint = document.createElement('p'); hint.className = 'hint';
    hint.textContent = 'Previews instantly in the connected site above -- no page navigation. Save still writes it to the project like every other Studio edit.';
    body.appendChild(hint);
  }
  /* Animation-only mode's real panel (Part H, follow-up plan): per SELECTED element, not
     site-wide like Part G's canvas-transitions panel above -- reads cmsSourceSite.
     elementMotion (relayed down from js/admin/admin.js's own elementMotionDraft on every
     defxn-studio-load/preview-state message, the same siteFromState() round trip layout/
     components/states/canvasTransitions already use) for the CURRENT SELECTION's route+
     key (cmsExactSelection, set by the real Layers tree's own click-to-select handler --
     kept visible and usable in anim mode, see renderLayersPane()'s dispatch above). Every
     field edit posts straight into the connected preview iframe
     (postCmsElementMotionCommand), which sanitizes it for real (via ArkElementMotion.set()/
     .define(), the one document that actually has that module loaded) and relays the whole
     updated draft back up through this document to admin.js -- an explicit Save is still
     the only thing that ever writes it to disk, exactly like every other Studio-originated
     draft. With no element selected, this shows the same honest "pick something first"
     hint convention every other selection-scoped panel in this session already uses
     (e.g. "This group is not on the current page."), instead of a broken or empty form. */
  function renderElementMotionPane(pane) {
    pane.textContent = '';
    const head = document.createElement('div'); head.className = 'ins-head';
    const eh = document.createElement('div'); eh.className = 'elhead';
    eh.innerHTML = `<span class="tyb">${ic('sparkle', 'sm')}<span></span></span>`;
    eh.querySelector('.tyb span').textContent = 'Element animation';
    head.appendChild(eh);
    pane.appendChild(head);
    if (!cmsExactSelection || !cmsExactSelection.key) {
      const hint = document.createElement('p'); hint.className = 'hint';
      hint.textContent = 'Select an element in the Layers panel to animate it.';
      pane.appendChild(hint);
      return;
    }
    const note = document.createElement('p'); note.className = 'hint';
    note.textContent = `How "${cmsExactSelection.label || cmsExactSelection.key}" enters and leaves on route change. Overrides the default stagger for this element only; every other element keeps today's behavior.`;
    pane.appendChild(note);
    const routes = (cmsSourceSite && cmsSourceSite.elementMotion && cmsSourceSite.elementMotion.routes) || {};
    const stored = (routes[cmsExactSelection.route] && routes[cmsExactSelection.route][cmsExactSelection.key]) || null;
    const cfg = Object.assign({}, CMS_ELEMENT_MOTION_DEFAULT_ENTRY, stored || {});
    const body = accordion(pane, 'cms-element-motion', 'In / out animation', 'sparkle', -1);
    const patch = (key, value) => postCmsElementMotionCommand({ [key]: value });
    const segField = (label, key, options, labels) => {
      const row = document.createElement('div'); row.className = 'row'; const l = document.createElement('label'); l.textContent = label;
      const seg = document.createElement('div'); seg.className = 'ctl-seg';
      options.forEach((opt, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = (labels && labels[i]) || opt;
        b.setAttribute('aria-pressed', String(cfg[key] === opt));
        b.addEventListener('click', () => { if (cfg[key] !== opt) patch(key, opt); });
        seg.appendChild(b);
      });
      row.append(l, seg, document.createElement('span')); return row;
    };
    const numberField = (label, key, min, max, step) => {
      const row = document.createElement('div'); row.className = 'row'; const l = document.createElement('label'); l.textContent = label;
      const input = document.createElement('input'); input.className = 'ctl'; input.type = 'number'; input.min = String(min); input.max = String(max); input.step = String(step);
      input.value = String(cfg[key]); input.setAttribute('aria-label', label);
      input.addEventListener('change', () => { const v = Number(input.value); if (Number.isFinite(v)) patch(key, v); });
      row.append(l, input, document.createElement('span')); return row;
    };
    body.appendChild(segField('Direction', 'direction', CMS_ELEMENT_MOTION_DIRECTIONS, ['Up', 'Down', 'Left', 'Right', 'None']));
    body.appendChild(numberField('Distance (px)', 'distance', 0, 60, 1));
    body.appendChild(numberField('Duration (ms)', 'duration', 0, 1200, 10));
    body.appendChild(numberField('Delay (ms)', 'delay', 0, 1200, 10));
    body.appendChild(segField('Easing', 'easing', CMS_CANVAS_EASINGS, ['Ease', 'Ease out', 'Ease in-out']));
    const preview = document.createElement('button'); preview.className = 'btn small primary'; preview.type = 'button';
    preview.textContent = 'Preview'; preview.style.marginTop = '8px';
    preview.addEventListener('click', () => postCmsElementMotionPreview(cmsExactSelection.key));
    body.appendChild(preview);
    const hint = document.createElement('p'); hint.className = 'hint';
    hint.textContent = 'Previews instantly in the connected site above -- no page navigation. Save still writes it to the project like every other Studio edit.';
    body.appendChild(hint);
  }
  function renderElementPane() {
    const pane = $('paneEl');
    if (restrictMode) {
      if (restrictMode === 'canvas') { renderCanvasTransitionsPane(pane); return; }
      renderElementMotionPane(pane);
      return;
    }
    const focusId = document.activeElement && pane.contains(document.activeElement) ? document.activeElement.id : null, sc = pane.parentElement.scrollTop;
    pane.textContent = '';
    const route = cmsRoutes.find((r) => r.path === cmsCurrentRoute);
    const head = document.createElement('div'); head.className = 'ins-head';
    const eh = document.createElement('div'); eh.className = 'elhead';
    eh.innerHTML = `<span class="tyb">${ic(cmsExactSelection && cmsExactSelection.key ? 'cursor' : (route && route.seoArticle ? 'article' : 'page'), 'sm')}<span></span></span>`;
    eh.querySelector('.tyb span').textContent = cmsExactSelection && cmsExactSelection.key ? (cmsExactSelection.label || cmsExactSelection.key) : ((route && route.title) || cmsCurrentRoute);
    head.appendChild(eh);
    if (device) { const note = document.createElement('p'); note.className = 'hint'; note.innerHTML = `Changes apply to <b>${DEVICES[device][0].toLowerCase()}</b> and smaller. Orange dots are overrides; click one to reset it.`; head.appendChild(note); }
    pane.appendChild(head);
    {
      const exact = document.createElement('div'); exact.className = 'sect';
      /* STEP 1 CLEANUP: this used to branch on bindingOf(id) to show either an
         "Authoritative content" textarea (editing a dense node bound to a manifest/article
         field) or a "Managed route" panel (str.n[id]/str.h[id]) -- both read/wrote the now-
         deleted dense tree. Content CMS (one click away via "Content CMS" below) already
         edits every manifest/article field and every route's SEO directly; this note says so
         honestly instead of pretending the dense binding still resolves. Flagged plainly,
         same as the Versions/export and SEO-pane deletions elsewhere in this pass. */
      const note = document.createElement('p'); note.className = 'hint'; note.textContent = 'Content, SEO, and routing for this page are edited through the authoritative CMS controls -- open Content CMS below, or Search & AI for this route\'s title and description.'; exact.appendChild(note);
      const seo = document.createElement('button'); seo.className = 'btn small'; seo.type = 'button'; seo.innerHTML = ic('search', 'sm') + 'Search & AI'; seo.addEventListener('click', () => showTab('tabSeo')); exact.appendChild(seo);
      if (cmsGroups.length) {
        const groupsBody = accordion(pane, 'cms-groups', `Groups on this page (${cmsGroups.length})`, 'box', -1);
        const currentGroupId = cmsExactSelection && cmsExactSelection.key && cmsExactSelection.key.indexOf('group:') === 0 ? cmsExactSelection.key.slice(6) : null;
        for (const g of cmsGroups) {
          const row = document.createElement('button'); row.type = 'button'; row.className = 'myrow'; row.style.width = '100%'; row.style.marginBottom = '4px'; row.style.cursor = 'pointer';
          row.innerHTML = `${ic('box', 'sm')}<span></span><small></small>`;
          row.querySelector('span').textContent = g.label; row.querySelector('small').textContent = `${g.members} layers`;
          if (g.id === currentGroupId) { row.style.borderColor = 'var(--accent)'; row.style.color = 'var(--accent)'; }
          row.addEventListener('click', () => postCmsSelectGroup(g.id));
          groupsBody.appendChild(row);
        }
      }
      if (cmsExactSelection && cmsExactSelection.key) {
        const frameBody = accordion(pane, 'cms-frame', 'Frame', 'size', -1), frame = cmsExactSelection.frame || {}, rect = cmsExactSelection.rect || {};
        const values = { x: frame.x == null ? 0 : frame.x, y: frame.y == null ? 0 : frame.y, width: frame.width == null ? rect.width : frame.width, height: frame.height == null ? rect.height : frame.height, rotation: frame.rotation == null ? 0 : frame.rotation, scaleX: frame.scaleX == null ? 1 : frame.scaleX, scaleY: frame.scaleY == null ? 1 : frame.scaleY };
        const draft = { ...frame };
        const field = (label, key, step) => {
          const row = document.createElement('div'); row.className = 'row'; const l = document.createElement('label'); l.textContent = label;
          const input = document.createElement('input'); input.className = 'ctl'; input.type = 'number'; input.step = step || '1'; input.value = String(key in values ? values[key] : (draft[key] || 0)); input.setAttribute('aria-label', label);
          input.addEventListener('change', () => { draft[key] = Number(input.value); cmsExactSelection.frame = { ...draft }; postCmsLayoutCommand(draft); }); row.append(l, input, document.createElement('span')); return row;
        };
        /* Segmented choice and color-swatch controls for the style properties below, same
           draft-mutate-then-postCmsLayoutCommand pattern as field() above. Unlike a number
           input's own live value, a button needs the panel re-rendered to move which option
           shows pressed. */
        const segField = (label, key, options, labels) => {
          const row = document.createElement('div'); row.className = 'row'; const l = document.createElement('label'); l.textContent = label;
          const seg = document.createElement('div'); seg.className = 'ctl-seg';
          options.forEach((opt, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = (labels && labels[i]) || opt; b.setAttribute('aria-pressed', String(draft[key] === opt)); b.addEventListener('click', () => { draft[key] = opt; cmsExactSelection.frame = { ...draft }; postCmsLayoutCommand(draft); renderInspector(); }); seg.appendChild(b); });
          row.append(l, seg, document.createElement('span')); return row;
        };
        const selectField = (label, key, options) => {
          const row = document.createElement('div'); row.className = 'row'; const l = document.createElement('label'); l.textContent = label;
          const s = document.createElement('select'); s.className = 'ctl'; s.setAttribute('aria-label', label);
          options.forEach(([v, text]) => { const o = document.createElement('option'); o.value = v; o.textContent = text; s.appendChild(o); });
          s.value = draft[key] || options[0][0];
          s.addEventListener('change', () => { draft[key] = s.value; cmsExactSelection.frame = { ...draft }; postCmsLayoutCommand(draft); }); row.append(l, s, document.createElement('span')); return row;
        };
        const swatchField = (label, key, tokens, allowNone) => {
          const row = document.createElement('div'); row.className = 'row'; const l = document.createElement('label'); l.textContent = label;
          const sw = document.createElement('div'); sw.className = 'swatches';
          const pick = (v) => { draft[key] = v; cmsExactSelection.frame = { ...draft }; postCmsLayoutCommand(draft); renderInspector(); };
          if (allowNone) { const b = document.createElement('button'); b.type = 'button'; b.className = 'none'; b.title = 'None'; b.setAttribute('aria-label', 'None'); b.setAttribute('aria-pressed', String(!draft[key] || draft[key] === 'none')); b.addEventListener('click', () => pick('none')); sw.appendChild(b); }
          tokens.forEach((tok) => { const b = document.createElement('button'); b.type = 'button'; b.title = tok; b.setAttribute('aria-label', tok); b.style.background = `hsl(var(--${tok}))`; b.setAttribute('aria-pressed', String(draft[key] === tok)); b.addEventListener('click', () => pick(tok)); sw.appendChild(b); });
          row.append(l, sw, document.createElement('span')); return row;
        };
        frameBody.append(field('X', 'x'), field('Y', 'y'), field('Width', 'width'), field('Height', 'height'), field('Rotation', 'rotation'), field('Scale X', 'scaleX', '0.01'), field('Scale Y', 'scaleY', '0.01'));
        const meta = document.createElement('p'); meta.className = 'hint'; meta.textContent = `${cmsExactSelection.breakpoint || 'desktop'} · ${cmsExactSelection.key}`; frameBody.appendChild(meta);
        const reset = document.createElement('button'); reset.className = 'btn small'; reset.type = 'button'; reset.textContent = 'Reset this breakpoint'; reset.addEventListener('click', postCmsLayoutReset); frameBody.appendChild(reset);
        if (cmsExactSelections.length > 1) {
          const align = document.createElement('div'); align.style.display = 'grid'; align.style.gridTemplateColumns = 'repeat(3,minmax(0,1fr))'; align.style.gap = '5px'; align.style.marginTop = '8px';
          [['Left', 'left'], ['Center X', 'hcenter'], ['Right', 'right'], ['Top', 'top'], ['Center Y', 'vcenter'], ['Bottom', 'bottom']].forEach(([label, op]) => { const b = document.createElement('button'); b.className = 'btn small'; b.type = 'button'; b.textContent = label; b.addEventListener('click', () => postCmsLayoutOperation(op)); align.appendChild(b); });
          frameBody.appendChild(align);
          const group = document.createElement('button'); group.className = 'btn small primary'; group.type = 'button'; group.textContent = 'Group selection'; group.style.marginTop = '6px'; group.addEventListener('click', () => postCmsLayoutOperation('group')); frameBody.appendChild(group);
          if (cmsExactSelections.length > 2) { const distribute = document.createElement('div'); distribute.style.display = 'flex'; distribute.style.gap = '5px'; distribute.style.marginTop = '6px'; [['Distribute X', 'distribute-horizontal'], ['Distribute Y', 'distribute-vertical']].forEach(([label, op]) => { const b = document.createElement('button'); b.className = 'btn small'; b.type = 'button'; b.textContent = label; b.addEventListener('click', () => postCmsLayoutOperation(op)); distribute.appendChild(b); }); frameBody.appendChild(distribute); }
        }
        if (cmsExactSelection.key.indexOf('group:') === 0) { const ungroup = document.createElement('button'); ungroup.className = 'btn small'; ungroup.type = 'button'; ungroup.textContent = 'Ungroup'; ungroup.style.marginTop = '6px'; ungroup.addEventListener('click', () => postCmsLayoutOperation('ungroup')); frameBody.appendChild(ungroup); }
        /* Spacing, Typography, Fill, and Effects -- same real ArkLayout frame patch as the
           Frame panel above, so these are not a visual-only preview: they write the same
           inline styles onto the real rendered element and persist the same way. Wherever the
           real site defines a token (color, font, type size, radius) the control writes that
           token; where it defines none (padding/margin, opacity, overflow) the control writes
           a literal value, same as the real CSS itself already has to. */
        const layoutBody = accordion(pane, 'cms-layout', 'Layout', 'grid', -1);
        layoutBody.appendChild(segField('Display', 'display', CMS_DISPLAY_TOKENS, ['Stack', 'Row', 'Grid', 'Block', 'Hide']));
        if (draft.display === 'row' || draft.display === 'grid' || draft.display === 'stack' || !draft.display) {
          layoutBody.appendChild(field('Gap', 'gap'));
          layoutBody.appendChild(segField('Align', 'align', CMS_ALIGN_TOKENS, ['Fill', 'Start', 'Mid', 'End']));
        }
        if (draft.display === 'row' || !draft.display) {
          layoutBody.appendChild(segField('Justify', 'justify', CMS_JUSTIFY_TOKENS, ['Start', 'Mid', 'End', 'Apart']));
          layoutBody.appendChild(segField('Wrap', 'wrap', ['no', 'yes'], ['No', 'Yes']));
        }
        const spacingBody = accordion(pane, 'cms-spacing', 'Spacing', 'spacing', -1);
        const bm = document.createElement('div'); bm.className = 'boxm';
        [['pt', 't', 'Padding top'], ['pr', 'r', 'Padding right'], ['pb', 'b', 'Padding bottom'], ['pl', 'l', 'Padding left']].forEach(([key, cls, label]) => {
          const input = document.createElement('input'); input.className = 'ctl ' + cls; input.type = 'number'; input.min = '0'; input.value = String(draft[key] || 0); input.setAttribute('aria-label', label);
          input.addEventListener('change', () => { draft[key] = Number(input.value); cmsExactSelection.frame = { ...draft }; postCmsLayoutCommand(draft); }); bm.appendChild(input);
        });
        const mid = document.createElement('div'); mid.className = 'mid'; mid.textContent = 'padding'; bm.appendChild(mid);
        spacingBody.appendChild(bm);
        spacingBody.append(field('Margin ↑', 'mt'), field('Margin ↓', 'mb'));
        const typeBody = accordion(pane, 'cms-type', 'Typography', 'type', -1);
        typeBody.appendChild(segField('Font', 'font', CMS_FONT_TOKENS, ['Display', 'Sans', 'Mono']));
        typeBody.appendChild(selectField('Size', 'textSize', CMS_TYPE_SIZE_TOKENS.map((t) => [t, t.charAt(0).toUpperCase() + t.slice(1)])));
        typeBody.appendChild(segField('Weight', 'fw', [400, 500, 600, 700, 800], ['400', '500', '600', '700', '800']));
        typeBody.appendChild(segField('Line height', 'lh', CMS_LINE_HEIGHT_TOKENS, ['Tight', 'Snug', 'Normal', 'Loose']));
        typeBody.appendChild(segField('Align', 'ta', ['left', 'center', 'right'], ['Left', 'Center', 'Right']));
        typeBody.appendChild(swatchField('Color', 'color', CMS_TEXT_TOKENS, false));
        const fillBody = accordion(pane, 'cms-fill', 'Fill and border', 'fill', -1);
        fillBody.appendChild(swatchField('Background', 'bg', CMS_FILL_TOKENS, true));
        fillBody.appendChild(segField('Radius', 'radius', CMS_RADIUS_TOKENS, ['None', 'Card', 'Pill', 'Panel']));
        fillBody.appendChild(segField('Border', 'border', ['none', 'thin', 'thick'], ['None', 'Thin', 'Thick']));
        fillBody.appendChild(swatchField('Border color', 'borderColor', CMS_BORDER_TOKENS, false));
        const sizeBody = accordion(pane, 'cms-size', 'Size', 'size', -1);
        sizeBody.appendChild(field('Max width', 'maxw'));
        sizeBody.appendChild(field('Min height', 'minh'));
        const sizeHint = document.createElement('p'); sizeHint.className = 'hint'; sizeHint.textContent = 'Width and height for an exact size are in the Frame panel above; these constrain it without pinning it.'; sizeBody.appendChild(sizeHint);
        const fxBody = accordion(pane, 'cms-effects', 'Effects', 'sparkle', -1);
        fxBody.appendChild(segField('Opacity', 'op', [100, 80, 60, 40], ['100%', '80%', '60%', '40%']));
        fxBody.appendChild(segField('Overflow', 'overflow', ['visible', 'hidden', 'scroll'], ['Visible', 'Hidden', 'Scroll']));
      }
      /* A selected element that is a reusable-component instance root (js/content/
         components.js tags it; cmsSelectionInfo in js/main.js reports it as
         cmsExactSelection.component) gets its own override panel here, alongside -- not
         instead of -- the Frame/Spacing/etc. panels above, since an instance is both a
         positioned element and a content block. Each field writes a real setOverride()
         inside the connected preview iframe via postCmsComponentsCommand, the same
         draft-mutate-then-post pipeline as every field()/segField() above. */
      if (cmsExactSelection && cmsExactSelection.component) {
        const comp = cmsExactSelection.component;
        const componentsState = (cmsSourceSite && cmsSourceSite.components) || { masters: {}, routes: {} };
        const master = componentsState.masters && componentsState.masters[comp.masterId];
        const anchorList = (componentsState.routes && componentsState.routes[cmsExactSelection.route] && componentsState.routes[cmsExactSelection.route][comp.anchorId]) || [];
        const instance = anchorList.find((item) => item.key === comp.key);
        const overrides = (instance && instance.overrides) || {};
        const compBody = accordion(pane, 'cms-component', 'Component instance', 'comp', -1);
        const info = document.createElement('p'); info.className = 'hint'; info.innerHTML = '<b></b><br><code></code>';
        info.querySelector('b').textContent = master ? master.label : comp.masterId;
        info.querySelector('code').textContent = master ? cmsBlockResolverLabel(master.resolver) + ' · ' + comp.anchorId : comp.anchorId;
        compBody.appendChild(info);
        cmsBlockResolverProps(master ? master.resolver : '').forEach((prop) => {
          const row = document.createElement('div'); row.className = 'row';
          const l = document.createElement('label'); l.textContent = prop;
          const input = document.createElement('input'); input.className = 'ctl'; input.setAttribute('aria-label', prop);
          input.value = overrides[prop] !== undefined ? overrides[prop] : ((master && master.props[prop]) || '');
          if (overrides[prop] !== undefined) input.style.borderColor = 'hsl(var(--accent))';
          input.addEventListener('change', () => postCmsComponentsCommand({ action: 'set-override', route: cmsExactSelection.route, anchorId: comp.anchorId, key: comp.key, propPath: prop, value: input.value }));
          row.append(l, input, document.createElement('span')); compBody.appendChild(row);
        });
        const compActions = document.createElement('div'); compActions.style.display = 'flex'; compActions.style.gap = '6px'; compActions.style.marginTop = '6px';
        const resetAll = document.createElement('button'); resetAll.className = 'btn small'; resetAll.type = 'button'; resetAll.textContent = 'Reset overrides';
        resetAll.disabled = !Object.keys(overrides).length;
        resetAll.addEventListener('click', () => Object.keys(overrides).forEach((prop) => postCmsComponentsCommand({ action: 'set-override', route: cmsExactSelection.route, anchorId: comp.anchorId, key: comp.key, propPath: prop, value: null })));
        const removeInst = document.createElement('button'); removeInst.className = 'btn small danger'; removeInst.type = 'button'; removeInst.textContent = 'Remove instance';
        removeInst.addEventListener('click', () => {
          postCmsComponentsCommand({ action: 'remove-instance', route: cmsExactSelection.route, anchorId: comp.anchorId, key: comp.key });
          cmsExactSelection = null; cmsExactSelections = []; renderInspector();
        });
        compActions.append(resetAll, removeInst); compBody.appendChild(compActions);
      }
      /* Part E: a selected element that is part of a layered-states group (tagged
         data-ark-state-group by js/content/states.js's own render(), reported back by
         js/main.js's cmsSelectionInfo -- the same self-identifying pattern as .component
         just above) gets its own States accordion: every state listed, a way to preview
         each one, add a new one, remove one (never index 0), and pick the click trigger. */
      if (cmsExactSelection && cmsExactSelection.stateGroup) {
        const groupId = cmsExactSelection.stateGroup.groupId;
        const statesState = (cmsSourceSite && cmsSourceSite.states) || { routes: {} };
        const group = (statesState.routes && statesState.routes[cmsExactSelection.route] && statesState.routes[cmsExactSelection.route][groupId]) || null;
        const statesBody = accordion(pane, 'cms-states', 'States' + (group ? ` (${group.states.length})` : ''), 'comp', -1);
        if (!group) {
          const missing = document.createElement('p'); missing.className = 'hint'; missing.textContent = 'This group is not on the current page.'; statesBody.appendChild(missing);
        } else {
          group.states.forEach((st, i) => {
            const row = document.createElement('div'); row.className = 'row';
            const l = document.createElement('label'); l.textContent = (i === 0 ? '0 · ' : i + ' · ') + (st.label || (i === 0 ? 'Default' : 'New state'));
            const preview = document.createElement('button'); preview.type = 'button'; preview.className = 'btn small'; preview.textContent = group.current === i ? 'Showing' : 'Preview';
            preview.disabled = group.current === i;
            preview.addEventListener('click', () => postCmsStatesCommand({ action: 'set-current', groupId, index: i }));
            const row2 = document.createElement('span');
            if (i > 0) {
              const rm = document.createElement('button'); rm.type = 'button'; rm.className = 'btn small danger'; rm.textContent = 'Remove';
              rm.addEventListener('click', () => postCmsStatesCommand({ action: 'remove-state', groupId, index: i }));
              row2.appendChild(rm);
            }
            row.append(l, preview, row2); statesBody.appendChild(row);
            /* A state past 0 has no real content of its own yet until a block is added --
               reuses the exact same ArkComponents create-master/insert-instance commands
               the Library tab's own "insert a block" flow already uses (postCmsComponentsCommand),
               just targeting this state's own dedicated anchor id instead of a page-level
               one, so there is still only ONE content-insertion mechanism in this app. */
            if (i > 0) {
              const add = document.createElement('button'); add.type = 'button'; add.className = 'btn small'; add.style.marginLeft = '20px'; add.style.marginBottom = '6px'; add.textContent = '+ Add content block';
              add.addEventListener('click', () => {
                const choice = (prompt('Add which block?\n' + CMS_BLOCK_RESOLVERS.map((r) => r[1]).join(', '), CMS_BLOCK_RESOLVERS[0][1]) || '').trim();
                const found = CMS_BLOCK_RESOLVERS.find((r) => r[1].toLowerCase() === choice.toLowerCase());
                if (!found) return;
                const masterId = cmsNextComponentId('m'), anchorId = 'state-' + groupId + '-' + i;
                postCmsComponentsCommand({ action: 'create-master', id: masterId, resolver: found[0], props: {}, label: found[1] });
                postCmsComponentsCommand({ action: 'insert-instance', anchorId, key: cmsNextComponentId('i'), masterId });
              });
              statesBody.appendChild(add);
            }
          });
          const addState = document.createElement('button'); addState.type = 'button'; addState.className = 'btn small primary'; addState.style.marginTop = '6px'; addState.textContent = '+ Add state';
          addState.disabled = group.states.length >= 20;
          addState.addEventListener('click', () => postCmsStatesCommand({ action: 'add-state', groupId, label: 'State ' + group.states.length }));
          statesBody.appendChild(addState);
          const triggerNote = document.createElement('p'); triggerNote.className = 'hint';
          triggerNote.textContent = group.trigger === 'self' ? 'Click trigger: the state-zero selection itself.' : 'Click trigger: a specific element (' + group.trigger + ').';
          statesBody.appendChild(triggerNote);
          const triggerRow = document.createElement('div'); triggerRow.style.display = 'flex'; triggerRow.style.gap = '6px'; triggerRow.style.flexWrap = 'wrap';
          const useSelf = document.createElement('button'); useSelf.type = 'button'; useSelf.className = 'btn small'; useSelf.textContent = 'Use state-zero selection as trigger'; useSelf.disabled = group.trigger === 'self';
          useSelf.addEventListener('click', () => postCmsStatesCommand({ action: 'set-trigger', groupId, trigger: 'self' }));
          const useThis = document.createElement('button'); useThis.type = 'button'; useThis.className = 'btn small'; useThis.textContent = 'Use this element as trigger';
          useThis.disabled = !cmsExactSelection.key || group.trigger === cmsExactSelection.key;
          useThis.addEventListener('click', () => postCmsStatesCommand({ action: 'set-trigger', groupId, trigger: cmsExactSelection.key }));
          triggerRow.append(useSelf, useThis); statesBody.appendChild(triggerRow);
          const removeGroup = document.createElement('button'); removeGroup.type = 'button'; removeGroup.className = 'btn small danger'; removeGroup.style.marginTop = '8px'; removeGroup.textContent = 'Remove this states group';
          removeGroup.addEventListener('click', () => { postCmsStatesCommand({ action: 'remove-group', groupId }); });
          statesBody.appendChild(removeGroup);
        }
      }
      const actions = document.createElement('div'); actions.style.display = 'flex'; actions.style.gap = '6px'; actions.style.flexWrap = 'wrap';
      const content = document.createElement('button'); content.className = 'btn small'; content.type = 'button'; content.textContent = 'Content CMS'; content.addEventListener('click', () => $('btnContentCms').click());
      const design = document.createElement('button'); design.className = 'btn small'; design.type = 'button'; design.textContent = 'Design controls'; design.addEventListener('click', () => selectDesign());
      actions.append(content, design); exact.appendChild(actions); pane.appendChild(exact);
      if (focusId && $(focusId)) $(focusId).focus(); pane.parentElement.scrollTop = sc;
    }
  }
  let libKey = '';
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
      const masterIds = Object.keys(components.masters || {});
      const key = JSON.stringify(['cms-components', masterIds.map((id) => [id, components.masters[id].label, components.masters[id].resolver]), cmsComponentAnchors, cmsPreviewRoute]);
      if (key === libKey && box.children.length) return; libKey = key; box.textContent = '';

      const site = document.createElement('div'); site.className = 'libsec';
      const h = document.createElement('h4'); h.textContent = 'DEFXN reusable components'; site.appendChild(h);
      const note = document.createElement('p'); note.className = 'hint';
      note.textContent = cmsComponentAnchors.length
        ? `This route has ${cmsComponentAnchors.length} insertion point${cmsComponentAnchors.length > 1 ? 's' : ''}: ${cmsComponentAnchors.join(', ')}.`
        : 'This route has no insertion point (no [data-ark-insert] anchor) yet.';
      site.appendChild(note);
      if (!masterIds.length) { const p = document.createElement('p'); p.className = 'hint'; p.textContent = 'No reusable blocks yet. Create one below, then insert it here or on any other route.'; site.appendChild(p); }
      masterIds.forEach((id) => {
        const master = components.masters[id];
        const row = document.createElement('div'); row.className = 'myrow';
        row.innerHTML = `${ic('comp', 'sm')}<span></span><small></small>`;
        row.querySelector('span').textContent = master.label; row.querySelector('small').textContent = cmsBlockResolverLabel(master.resolver);
        const insert = document.createElement('button'); insert.className = 'btn small'; insert.type = 'button'; insert.textContent = 'Insert';
        insert.disabled = !cmsComponentAnchors.length;
        insert.title = cmsComponentAnchors.length ? 'Insert an instance of this block on the current route' : 'This route has no insertion point';
        insert.addEventListener('click', () => {
          const anchorId = cmsComponentAnchors.length > 1 ? (prompt('Insert into which anchor?\n' + cmsComponentAnchors.join(', '), cmsComponentAnchors[0]) || '').trim() : cmsComponentAnchors[0];
          if (!anchorId || cmsComponentAnchors.indexOf(anchorId) < 0) return;
          postCmsComponentsCommand({ action: 'insert-instance', anchorId, key: cmsNextComponentId('i'), masterId: id });
          toast(`Inserted ${master.label}.`);
        });
        row.appendChild(insert); site.appendChild(row);
      });
      box.appendChild(site);

      const form = document.createElement('div'); form.className = 'libsec';
      const fh = document.createElement('h4'); fh.innerHTML = '<span>New block</span>'; form.appendChild(fh);
      const typeRow = document.createElement('div'); typeRow.className = 'row';
      const typeLabel = document.createElement('label'); typeLabel.textContent = 'Block type';
      const typeSelect = document.createElement('select'); typeSelect.className = 'ctl';
      CMS_BLOCK_RESOLVERS.forEach(([res, resLabel]) => { const o = document.createElement('option'); o.value = res; o.textContent = resLabel; typeSelect.appendChild(o); });
      typeRow.append(typeLabel, typeSelect, document.createElement('span')); form.appendChild(typeRow);
      const nameRow = document.createElement('div'); nameRow.className = 'row';
      const nameLabel = document.createElement('label'); nameLabel.textContent = 'Label';
      const nameInput = document.createElement('input'); nameInput.className = 'ctl'; nameInput.type = 'text'; nameInput.value = cmsBlockResolverLabel(typeSelect.value) + ' block';
      nameRow.append(nameLabel, nameInput, document.createElement('span')); form.appendChild(nameRow);
      const propsHost = document.createElement('div');
      function renderBlockPropsForm() {
        propsHost.textContent = '';
        cmsBlockResolverProps(typeSelect.value).forEach((prop) => {
          const row = document.createElement('div'); row.className = 'row';
          const l = document.createElement('label'); l.textContent = prop;
          const input = document.createElement('input'); input.className = 'ctl'; input.type = 'text'; input.dataset.prop = prop;
          row.append(l, input, document.createElement('span')); propsHost.appendChild(row);
        });
      }
      renderBlockPropsForm();
      typeSelect.addEventListener('change', () => { nameInput.value = cmsBlockResolverLabel(typeSelect.value) + ' block'; renderBlockPropsForm(); });
      form.appendChild(propsHost);
      const create = document.createElement('button'); create.className = 'btn small primary'; create.type = 'button'; create.textContent = 'Create block';
      create.addEventListener('click', () => {
        const props = {};
        propsHost.querySelectorAll('input').forEach((input) => { if (input.value) props[input.dataset.prop] = input.value; });
        const label = nameInput.value.trim() || cmsBlockResolverLabel(typeSelect.value);
        postCmsComponentsCommand({ action: 'create-master', id: cmsNextComponentId('m'), resolver: typeSelect.value, props, label });
        toast(`Created ${label}. Find it above to insert it on any route.`);
      });
      form.appendChild(create);
      box.appendChild(form);

      const actions = document.createElement('div'); actions.style.display = 'flex'; actions.style.gap = '6px'; actions.style.flexWrap = 'wrap'; actions.style.marginTop = '8px';
      const content = document.createElement('button'); content.className = 'btn small'; content.type = 'button'; content.textContent = 'Open Content CMS'; content.addEventListener('click', () => $('btnContentCms').click());
      const design = document.createElement('button'); design.className = 'btn small'; design.type = 'button'; design.textContent = 'Open Design'; design.addEventListener('click', () => selectDesign());
      actions.append(content, design); box.appendChild(actions); return;
    }
  }

  /* =========================================================================
     Theme pane: site and audience first, then the 60-30-10 palette with live
     contrast checks, font pairs and the global scale
     ========================================================================= */
  let themePaneStale = true;
  function renderThemePane() {
    themePaneStale = false;
    const pane = $('paneTheme'); pane.textContent = '';
    const exact = document.createElement('div'); exact.className = 'sect';
    const title = document.createElement('h3'); title.textContent = 'DEFXN design system';
    const note = document.createElement('p'); note.className = 'hint'; note.textContent = 'The canvas is rendering the real DEFXN CSS and components. Use the authoritative Design controls for palettes, semantic colors, backgrounds, and theme overrides; changes appear here before Save.';
    const open = document.createElement('button'); open.type = 'button'; open.className = 'btn primary'; open.textContent = 'Open DEFXN Design controls';
    open.addEventListener('click', () => selectDesign());
    exact.append(title, note, open); pane.appendChild(exact);
  }
  function showTab(which, quiet) {
    for (const [t, p] of [['tabEl', 'paneEl'], ['tabTheme', 'paneTheme'], ['tabSeo', 'paneSeo']]) { $(t).setAttribute('aria-selected', String(t === which)); $(p).hidden = t !== which; }
    themePaneStale = true; if (!quiet) renderInspector();
  }
  $('tabEl').addEventListener('click', () => showTab('tabEl'));
  $('tabTheme').addEventListener('click', () => showTab('tabTheme'));
  $('tabSeo').addEventListener('click', () => showTab('tabSeo'));

  /* =========================================================================
     Search and AI: real per-route SEO (cmsPageSeo/cmsSeoValue, already pure
     functions over cmsSourceSite -- no dense tree involved) plus the AI
     crawler bot list. FluxGate (the exported-page password/email gate
     decryptor) and robotsTxt/sitemapXml/llmsTxt (static-file generators for
     the deleted Export feature) are deleted outright with Step 1 -- see the
     Versions/export deletion note further down. The rich site-wide SEO
     editing this pane used to offer (AI crawler policy per bot, llms.txt
     toggle, schema type, language/org/handle, noindex) has NO Content-CMS
     equivalent today and is NOT ported in this step: it read/wrote the
     dense tree directly (seoOf/setSeo), same as the deleted "Authoritative
     content" panel. Flagged plainly, same as that deletion: a real SEO
     editor belongs in Content CMS, not duplicated here against an invisible
     dense proxy -- building it there is new work for a later step. */
  const AI_BOTS = [
    ['GPTBot', 'OpenAI · trains models', 1], ['OAI-SearchBot', 'ChatGPT search answers', 0], ['ChatGPT-User', 'ChatGPT reading a page for a user', 0],
    ['ClaudeBot', 'Anthropic · trains models', 1], ['Claude-SearchBot', 'Claude search answers', 0], ['Claude-User', 'Claude reading a page for a user', 0],
    ['PerplexityBot', 'Perplexity answers', 0], ['Google-Extended', 'Gemini training and grounding', 1], ['Applebot-Extended', 'Apple Intelligence training', 1],
    ['CCBot', 'Common Crawl dataset', 1], ['Bytespider', 'ByteDance training', 1], ['meta-externalagent', 'Meta AI training', 1],
  ];
  function renderSeoPane() {
    const pane = $('paneSeo');
    pane.textContent = '';
    const route = cmsRoutes.find((r) => r.path === cmsCurrentRoute) || {};
    const seo = cmsPageSeo(cmsSourceSite || {}, route);
    const exact = document.createElement('div'); exact.className = 'sect';
    const title = document.createElement('h3'); title.textContent = 'Search · ' + (seo.t || route.title || cmsCurrentRoute);
    const note = document.createElement('p'); note.className = 'hint';
    note.textContent = (seo.d || 'No description set yet.') + ' Search title, description, and the rest of this route\'s SEO are edited through the authoritative CMS controls.';
    const open = document.createElement('button'); open.type = 'button'; open.className = 'btn primary'; open.textContent = 'Open Content CMS';
    open.addEventListener('click', () => $('btnContentCms').click());
    exact.append(title, note, open); pane.appendChild(exact);
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
    view = v; for (const b of $('view').children) b.setAttribute('aria-pressed', String(b.dataset.v === v));
    $('shell').classList.toggle('mapview', v === 'map'); $('designView').hidden = v !== 'design'; $('mapView').hidden = v !== 'map';
    if (v === 'map') { if (restrictMode) exitRestrictMode(); mapFocus = cmsCurrentRoute; mapZoom = 1; renderSitemap(); } else layoutStage();
    schedule();
  }
  $('view').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setView(b.dataset.v); });

  /* =========================================================================
     Design check: the layout, color, typography and conversion rules as
     measurable checks on the rendered page, each with a fix where one is safe
     ========================================================================= */
  /* Step 1 port: these used to measure the dense-array `.frame`'s own rendered DOM via
     getComputedStyle, which is invisible once connected (.cms-connected .frame{display:
     none}) -- every rendered() check saw zero elements and reported false failures (very
     likely the "background-control panel appearing empty"-class bug the owner reported).
     Checks that only make sense as pixel/color measurement against this document's own
     design tokens (ghost buttons, button contrast, text contrast, 60-30-10 balance, plain-
     font body text) are DROPPED rather than force-ported: there is no real equivalent of
     theme.colors/PALETTE_RGB for the real site's CSS custom properties without new design-
     token integration work, which is out of scope for this step -- flagged plainly rather
     than silently losing the capability. The structural checks (heading hierarchy, one H1,
     scannability, lead-with-the-point, links, reachability, SEO/AI readiness) ARE ported,
     reading the real rendered page inside cmsPreview (same-origin iframe, so its document is
     directly readable) plus realLinkIndex()/cmsRoutes/cmsPageSeo. */
  let lastChecks = [];
  function runChecks() {
    const out = [], add = (o) => out.push(o);
    const doc = (() => { try { return cmsPreview.contentDocument; } catch (e) { return null; } })();
    const route = cmsRoutes.find((r) => r.path === cmsCurrentRoute) || { path: cmsCurrentRoute };
    if (!doc || !doc.body) { lastChecks = out; return out; }
    const rendered = (el) => el && el.isConnected && el.getClientRects().length;
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
    // 8 scannable
    const longP = paras.filter((el) => words(el) > 60);
    const sections = [...doc.querySelectorAll('section')].filter(rendered);
    const bare = sections.filter((el) => !el.querySelector('h1,h2,h3,h4') && words(el) > 40);
    add({ law: 'Scanning', title: 'Easy to scan', status: longP.length || bare.length ? 'warn' : 'pass', detail: longP.length || bare.length ? `${longP.length ? `${longP.length} paragraph${longP.length > 1 ? 's' : ''} over 60 words. ` : ''}${bare.length ? `${bare.length} section${bare.length > 1 ? 's' : ''} with no heading.` : ''}` : 'Short paragraphs, and every section has a heading.' });
    // 9 lead with the point
    const actions = [...doc.querySelectorAll('a[href],button')].filter(rendered);
    const firstActTop = actions.length ? Math.min(...actions.map((el) => el.getBoundingClientRect().top)) : Infinity;
    const leadOk = h1s.length && h1s[0].getBoundingClientRect().top < 640 && (route.seoArticle || firstActTop < 760);
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
    const answerBotsOpen = AI_BOTS.filter(([b, , train]) => !train && (bots[b] || 'allow') === 'allow').length, answerBotsTotal = AI_BOTS.filter((b) => !b[2]).length;
    add({ law: 'AI', title: 'Answer-ready for AI assistants', status: answerBotsOpen > 0 ? 'pass' : 'warn', detail: `${answerBotsOpen} of ${answerBotsTotal} answer/search bots allowed.`, fix: 'seo', fixLabel: 'Open SEO' });
    lastChecks = out;
    const score = out.filter((c) => c.status === 'pass').length;
    const badge = $('scoreBadge'), btn = $('btnCheck'), frac = score / out.length;
    badge.textContent = `${score}/${out.length}`; btn.classList.remove('good', 'mid', 'bad'); btn.classList.add(frac >= 0.85 ? 'good' : frac >= 0.6 ? 'mid' : 'bad');
    return out;
  }
  let checkT = 0;
  function queueCheck() { clearTimeout(checkT); checkT = setTimeout(() => { if (view === 'design' && !restrictMode) { runChecks(); if (popAnchor === $('btnCheck')) refreshPop(); renderStatus(); } }, 450); }
  function applyFix(c) {
    if (c.fix === 'seo') { closePop(); showTab('tabSeo'); return; }
  }
  $('btnCheck').addEventListener('click', (e) => { runChecks(); openPop(e.currentTarget, (p) => {
    const checks = lastChecks;
    const head = document.createElement('div'); head.className = 'checkhead';
    head.innerHTML = `<div><b>Design check · ${esc(cmsCurrentRoute)}</b><p>${checks.filter((c) => c.status === 'pass').length} of ${checks.length} rules pass</p></div>`;
    p.appendChild(head);
    const ul = document.createElement('ul'); ul.className = 'checks';
    for (const c of checks) {
      const li = document.createElement('li'); li.className = c.status;
      li.innerHTML = `<span class="st">${ic(c.status === 'pass' ? 'check' : c.status === 'warn' ? 'info' : 'close')}</span><div><b></b><p></p></div>`;
      li.querySelector('b').textContent = `${c.law} · ${c.title}`; li.querySelector('p').textContent = c.detail;
      const d = li.lastChild;
      if (c.status !== 'pass' && c.fix) {
        const acts = document.createElement('div'); acts.className = 'acts';
        const f = document.createElement('button'); f.className = 'btn small primary'; f.innerHTML = ic('wand', 'sm') + (c.fixLabel || 'Fix'); f.addEventListener('click', () => applyFix(c)); acts.appendChild(f);
        d.appendChild(acts);
      }
      ul.appendChild(li);
    }
    p.appendChild(ul);
  }, 'right'); });

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
     is gone) -- deleted with no replacement, same as the Versions feature above. The
     Shortcuts hint is trimmed to what still does something now that duplicate/group/ungroup/
     nudge/double-click-to-edit (all standalone-canvas-only) are gone.
  */
  $('btnMore').addEventListener('click', (e) => openPop(e.currentTarget, (p) => {
    const k = document.createElement('p'); k.className = 'hint'; k.style.padding = '6px 8px 2px'; k.innerHTML = '<b>Shortcuts</b> · Ctrl+Z undo · Ctrl+Shift+Z redo · Esc closes a menu';
    p.appendChild(k);
  }, 'right'));

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
    if (live && restrictMode) exitRestrictMode();
    if (live && view !== 'design') setView('design');
    layoutStage(); schedule();
  });
  $('btnUndo').addEventListener('click', undo);
  $('btnRedo').addEventListener('click', redo);
  document.addEventListener('keydown', (e) => {
    if (state.kind !== 'studio') return;
    if (e.key === 'Escape' && popEl) { const a = popAnchor; closePop(); if (a) a.focus(); return; }
    if (e.key === 'Escape' && restrictMode) { exitRestrictMode(); return; }
    const tag = (e.target.tagName || '').toLowerCase(), typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); redo(); return; }
    if (typing || live || restrictMode || view !== 'design') return;
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
    if (event.data.type === 'defxn-cms-preview-ready') { if (event.data.groups) cmsGroups = event.data.groups; if (event.data.anchors) cmsComponentAnchors = event.data.anchors; if (event.data.tree) cmsTree = event.data.tree; toast('Exact DEFXN preview updated from unsaved CMS drafts.'); renderInspector(); renderLayersPane(); libKey = ''; renderLibrary(); }
    else if (event.data.type === 'defxn-cms-preview-error') toast('Preview update failed: ' + event.data.message);
    else if (event.data.type === 'defxn-cms-preview-select') {
      cmsExactSelection = event.data.selection || null;
      cmsExactSelections = event.data.selections || (cmsExactSelection ? [cmsExactSelection] : []);
      if (event.data.groups) cmsGroups = event.data.groups;
      if (event.data.tree) cmsTree = event.data.tree;
      renderLayersPane();
      renderInspector();
    } else if (event.data.type === 'defxn-cms-preview-components-replace') {
      if (cmsSourceSite) cmsSourceSite.components = event.data.components;
      if (event.data.anchors) cmsComponentAnchors = event.data.anchors;
      if (event.data.tree) cmsTree = event.data.tree;
      applyStudioComponentsReplace(event.data.components);
      libKey = ''; renderLibrary(); renderInspector(); renderLayersPane();
    } else if (event.data.type === 'defxn-cms-preview-states-replace') {
      if (cmsSourceSite) cmsSourceSite.states = event.data.states;
      if (event.data.anchors) cmsComponentAnchors = event.data.anchors;
      if (event.data.tree) cmsTree = event.data.tree;
      applyStudioStatesReplace(event.data.states);
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
    else if (event.data.type === 'defxn-cms-preview-enter-canvas-mode') enterRestrictMode('canvas');
  });
  $('btnCmsSave').addEventListener('click', () => {
    if (!cmsConnected) { toast('Open Studio first to write the project files.'); return; }
    /* Step 2 merge: saveStudioChanges() (defined above, alongside the rest of admin.js's
       13-draft save pipeline) is called directly -- no more patches/'defxn-studio-save'
       round trip, since there is no longer a second document to send it to. */
    toast('Saving changed DEFXN content…');
    saveStudioChanges();
  });

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
     selection, device, view, restrictMode, etc.) reset on every visit and the real
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
    } catch (error) { status(error.message, 'error'); return; }
    seoDraft = ArkSEO.sanitize(seoDraft);
    seoSaved = JSON.stringify(seoDraft);
    ArkSEO.define(seoDraft);
    if (button) button.disabled = true;
    renderList();
  }
  function selectSeo() { state.kind = 'seo'; renderList(); renderEditor(); reloadPreview(); }

  function seoOverrideField(save, labelPrefix, value, placeholder, kind, onchange) {
    var id = 'seo-' + labelPrefix.replace(/\W+/g, '-').toLowerCase() + '-' + kind;
    var control = kind === 'description'
      ? h('textarea', { id: id, rows: 2, spellcheck: true, placeholder: placeholder })
      : h('input', { id: id, type: 'text', spellcheck: true, placeholder: placeholder });
    control.value = value;
    control.addEventListener('input', function () { onchange(control.value); if (save) save.disabled = !seoDirty(); touch(); });
    return h('div', { class: 'field' }, h('label', { for: id, text: kind === 'description' ? 'Description' : 'Title' }), control);
  }

  function buildPageSeoPanel(pageId, label) {
    var box = h('fieldset', {}, h('legend', { text: 'SEO' }));
    if (!window.ArkSEO) { box.appendChild(h('p', { class: 'empty-state', text: 'SEO editing is unavailable on this page.' })); return box; }
    box.appendChild(h('p', { class: 'hint', text: 'These values belong to this page. Blank title and description derive from the page text and site defaults.' }));
    var entry = seoDraft.pages[pageId] || (seoDraft.pages[pageId] = { title: '', description: '', ogImage: '', canonical: '' });
    box.appendChild(seoOverrideField(null, pageId, entry.title, ArkSEO.pageTitle(pageId, label), 'title', function (v) { entry.title = v; }));
    box.appendChild(seoOverrideField(null, pageId, entry.description, seoDraft.site.defaultDescription || 'No default set', 'description', function (v) { entry.description = v; }));
    var advanced = h('div', { class: 'editor-tab-flow' });
    ['ogImage', 'canonical'].forEach(function (key) {
      var id = 'seo-' + pageId + '-' + key;
      var input = h('input', { id: id, type: 'text', spellcheck: false, placeholder: key === 'ogImage' ? '/assets/share.png or https://...' : '/about or https://...' });
      input.value = entry[key] || '';
      input.addEventListener('input', function () { entry[key] = input.value; touch(); });
      advanced.appendChild(h('div', { class: 'field' }, h('label', { for: id, text: key === 'ogImage' ? 'Social image' : 'Canonical URL' }), input));
    });
    box.appendChild(ArkAdminPrimitives.disclosure({ label: 'Advanced URLs', content: advanced }));
    return box;
  }

  function renderSeoEditor() {
    var root = $('editor'); root.textContent = '';
    root.appendChild(h('div', { class: 'editor-head' }, h('div', {}, h('h1', { text: 'SEO' }), h('div', { class: 'route', text: 'js/content/seo-data.js' }))));
    if (!window.ArkSEO) { root.appendChild(h('p', { class: 'empty-state', text: 'SEO editing is unavailable on this page.' })); return; }
    var save = h('button', { type: 'button', class: 'btn primary', text: 'Save', onclick: function () { saveSeoDraft(save); } });
    save.disabled = !seoDirty();

    var siteBox = h('fieldset', {}, h('legend', { text: 'Site' }));
    siteBox.appendChild(h('p', { class: 'hint', text: 'Used as the " — <name>" suffix on every page’s title, the fallback meta description, and (with a base URL) to generate sitemap.xml and robots.txt on Save/Publish.' }));
    var nameInput = h('input', { type: 'text', value: seoDraft.site.name || '' });
    nameInput.addEventListener('input', function () { seoDraft.site.name = nameInput.value; save.disabled = !seoDirty(); touch(); });
    siteBox.appendChild(h('div', { class: 'field' }, h('label', { text: 'Site name' }), nameInput));
    var urlInput = h('input', { type: 'text', value: seoDraft.site.baseUrl || '', placeholder: 'https://example.com' });
    urlInput.addEventListener('input', function () { seoDraft.site.baseUrl = urlInput.value; save.disabled = !seoDirty(); touch(); });
    siteBox.appendChild(h('div', { class: 'field' }, h('label', { text: 'Base URL (leave blank to skip sitemap.xml)' }), urlInput));
    var descInput = h('textarea', { rows: 2, value: seoDraft.site.defaultDescription || '' });
    descInput.addEventListener('input', function () { seoDraft.site.defaultDescription = descInput.value; save.disabled = !seoDirty(); touch(); });
    siteBox.appendChild(h('div', { class: 'field' }, h('label', { text: 'Default description' }), descInput));
    root.appendChild(siteBox);

    var pagesBox = h('fieldset', {}, h('legend', { text: 'Pages' }));
    pagesBox.appendChild(h('p', { class: 'hint', text: 'Blank uses the page’s own title/the default description above.' }));
    ArkSEO.pageEntries().forEach(function (p) {
      var entry = seoDraft.pages[p.id] || (seoDraft.pages[p.id] = { title: '', description: '' });
      var row = h('div', { class: 'relief-field' }, h('div', { class: 'relief-field-head' }, h('label', { text: p.label })));
      row.appendChild(seoOverrideField(save, p.id, entry.title, ArkSEO.pageTitle(p.id, p.label), 'title', function (v) { entry.title = v; }));
      row.appendChild(seoOverrideField(save, p.id, entry.description, seoDraft.site.defaultDescription || 'No default set', 'description', function (v) { entry.description = v; }));
      pagesBox.appendChild(row);
    });
    root.appendChild(pagesBox);

    if (ArkSEO.articleSlugs().length) {
      var articlesBox = h('fieldset', {}, h('legend', { text: 'Articles' }));
      ArkSEO.articleSlugs().forEach(function (slug) {
        var article = state.aDrafts[slug];
        var entry = seoDraft.articles[slug] || (seoDraft.articles[slug] = { title: '', description: '' });
        var row = h('div', { class: 'relief-field' }, h('div', { class: 'relief-field-head' }, h('label', { text: article ? article.title : slug })));
        row.appendChild(seoOverrideField(save, slug, entry.title, ArkSEO.articleTitle(slug, article && article.title), 'title', function (v) { entry.title = v; }));
        row.appendChild(seoOverrideField(save, slug, entry.description, (article && article.summary) || seoDraft.site.defaultDescription || 'No default set', 'description', function (v) { entry.description = v; }));
        articlesBox.appendChild(row);
      });
      root.appendChild(articlesBox);
    }
    root.appendChild(h('div', { class: 'tools' }, save));
  }
  if ($('seoNav')) $('seoNav').addEventListener('click', selectSeo);

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
    } catch (error) { status(error.message, 'error'); return; }
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
    var save = h('button', { type: 'button', class: 'btn primary', text: 'Save' });
    var reset = h('button', { type: 'button', class: 'btn', text: 'Reset tuning to defaults' });
    function refreshInputs() {
      fields.textContent = '';
      ArkMeshSettings.fields().forEach(function (f) {
        var id = 'relief-' + f.key;
        var out = h('output', { for: id, text: String(meshDraft.tuning[f.key]) });
        var input = h('input', { id: id, type: 'range', min: f.min, max: f.max, step: f.step, oninput: function () {
          meshDraft.tuning[f.key] = Number(input.value);
          out.textContent = String(meshDraft.tuning[f.key]);
          notifyPreviewMesh(); save.disabled = !reliefDirty();
        } });
        input.value = meshDraft.tuning[f.key];
        fields.appendChild(h('div', { class: 'relief-field' },
          h('div', { class: 'relief-field-head' }, h('label', { for: id, text: f.label }), out),
          input));
      });
      save.disabled = !reliefDirty();
    }
    reset.addEventListener('click', function () { meshDraft.tuning = ArkMeshSettings.defaults().tuning; refreshInputs(); notifyPreviewMesh(); });
    save.addEventListener('click', function () { saveMeshDraft(save); });
    refreshInputs();
    box.appendChild(fields);
    box.appendChild(h('div', { class: 'tools' }, save, reset));
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
  function siteFromState() {
    return { manifests: state.ids.map(function (id) { return clone(state.drafts[id]); }),
             articles: state.slugs.map(function (slug) { return articleCopy(state.aDrafts[slug]); }),
             assets: state.assetIds.map(function (id) { return clone(state.assetDrafts[id]); }),
             secrets: state.secretIds.map(function (id) { return clone(state.secretDrafts[id]); }),
             meshSettings: window.ArkMeshSettings ? clone(meshDraft) : null,
             theme: window.ArkTheme ? clone(themeDraft) : null,
             layout: window.ArkLayout ? clone(layoutDraft) : null,
             components: window.ArkComponents ? clone(componentsDraft) : null,
             states: window.ArkStates ? clone(statesDraft) : null,
             canvasTransitions: window.ArkCanvasTransitions ? clone(canvasTransitionsDraft) : null,
             elementMotion: window.ArkElementMotion ? clone(elementMotionDraft) : null,
             seo: window.ArkSEO ? clone(seoDraft) : null };
  }

  async function refreshMesh() {
    var line = $('meshState'), owner = $('meshOwner');
    if (!mesh) {
      /* opened from disk: this page cannot reach a miner, but a plain link to the host's copy of it can be followed */
      line.textContent = 'This copy of the page cannot publish. Double-click "Flux Chain Admin.command" in the flux-chain folder, or use the copy served by the host: ';
      line.appendChild(h('a', { href: 'http://127.0.0.1:3437/admin.html', text: 'http://127.0.0.1:3437/admin.html' }));
      owner.textContent = ''; $('publish').disabled = true; $('mesh').open = true;
      $('meshRefresh').disabled = true;
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
      $('publish').disabled = publishing || !info.reachable;
    } catch (error) { line.textContent = error.message; $('publish').disabled = true; }
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
    var button = $('publish'); button.disabled = true; publishing = true;
    try {
      var result = await mesh.publishSite(siteFromState(), function (message) { status(message, ''); }, function (removes) {
        var what = removes ? removes.manifests.concat(removes.articles).concat(removes.assets).concat(removes.secrets || []).join(', ') : 'possibly some pages, articles, images or encrypted items (the published version could not be compared)';
        return window.confirm('This version removes what is published now: ' + what + '.\n\nThis page may be out of date, for example if its saves were only downloaded. Publish anyway?');
      });
      if (result.cancelled) status('Not published. Reload this page to pick up the project files, or run node scripts/pull-site.mjs to bring in the published copy.', 'warn');
      else if (result.unchanged) status('Nothing new to publish: version ' + result.version + ' already holds this content.', 'ok');
      else status('Published version ' + result.published + (result.confirmed ? ', confirmed by the miner reading it back.' : '. The miner has not read it back yet: refresh the Mesh panel.'), result.confirmed ? 'ok' : 'warn');
    } catch (error) {
      status(error.message + (error.detail && error.detail.remedy && error.message.indexOf(error.detail.remedy) < 0 ? ' To fix: ' + error.detail.remedy : ''), 'error');
    }
    publishing = false; button.disabled = false; refreshMesh();
  });
  $('meshRefresh').addEventListener('click', refreshMesh);
  $('meshNav').addEventListener('click', selectMesh);
  if (gate.localDevelopment && gate.localDevelopment()) { $('signOut').textContent = 'Sign out identity'; $('signOut').title = 'Drop the identity and signing key; local editing remains open.'; }
  $('signOut').addEventListener('click', function () { gate.signOut(); });
  /* the locked page asks before it signs out over unsaved work */
  window.ArkAdminApp = { unsaved: function () { return anyDirty(); } };

  document.addEventListener('keydown', function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key === 's') { event.preventDefault(); if (currentDirty()) saveCurrent(); }
  });
  window.addEventListener('beforeunload', function (event) { if (anyDirty()) { event.preventDefault(); event.returnValue = ''; } });

  loadBodies(function () { adoptArticles(); articlesReady = true; renderList(); renderEditor(); reloadPreview(); refreshMesh(); sendStudioState(); });
})();

/* =====================================================================
   ADMIN EDITOR · PAGE EDITOR AND DISPATCH (js/admin/editor.js)
   ---------------------------------------------------------------------
   Owns: renderEditor(), the one dispatcher that draws whatever state.kind is on screen
   (delegating to the article/image/encrypted/shape/mesh/design/Studio editors), the
   page (manifest) editor itself -- fields, link pickers, points, its Content and Code tabs
   (the Shape tab is js/admin/shapes.js's, the SEO tab js/admin/seo.js's) -- touch() (refresh everything that depends on "is it dirty"), Revert, the
   header's Save button state, and the New page form.
   Must not: save (js/admin/save.js) or post to a preview frame directly
   (js/admin/preview.js does, from touch()).
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, h = A.h, $ = A.$, hasShape = A.hasShape, shapePageId = A.shapePageId,
      deleteCurrent = A.deleteCurrent, refuse = A.refuse, anyDirty = A.anyDirty,
      NOTHING_TO_SAVE = A.NOTHING_TO_SAVE, saveEverything = A.saveEverything,
      currentDirty = A.currentDirty, renderList = A.renderList, status = A.status, select = A.select;
  /* defined by files loaded after this one: resolved when called */
  var renderStudioEditor = A.later('renderStudioEditor'),
      renderArticleEditor = A.later('renderArticleEditor'),
      renderAssetEditor = A.later('renderAssetEditor'), renderSecretEditor = A.later('renderSecretEditor'),
      renderShapeEditor = A.later('renderShapeEditor'), renderMeshEditor = A.later('renderMeshEditor'),
      renderDesignEditor = A.later('renderDesignEditor'), buildShapePickers = A.later('buildShapePickers'),
      buildPlacementPanel = A.later('buildPlacementPanel'),
      buildPageSeoPanel = A.later('buildPageSeoPanel'), notifyPreviewState = A.later('notifyPreviewState'),
      revertArticle = A.later('revertArticle'), revertAsset = A.later('revertAsset'),
      revertSecret = A.later('revertSecret'), revertDesign = A.later('revertDesign'),
      reloadPreview = A.later('reloadPreview');

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
     this one renderer serves both call sites (a page's fields here, an article's in
     js/admin/articles.js). */
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
    var neverSaved = (state.kind === 'design' ? state.themeSaved : article ? state.aSaved[state.aCurrent] : asset ? state.assetSaved[state.assetCurrent] : secret ? state.secretSaved[state.secretCurrent] : state.saved[state.current]) === null;
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
    if (window.ArkMeshSettings) state.meshDraft = ArkMeshSettings.get() || ArkMeshSettings.defaults();
    if (window.ArkTheme) state.themeDraft = ArkTheme.get() || ArkTheme.defaults();
    if (window.ArkSiteDefaults) state.settingsDefaultsDraft = ArkSiteDefaults.get() || ArkSiteDefaults.defaults();
    if (window.ArkSEO) state.seoDraft = ArkSEO.get() || ArkSEO.defaults();
    if (state.saved[id] === null) return;
    state.drafts[id] = JSON.parse(state.saved[id]); renderEditor(); renderList(); status('Reverted to the saved version.', '');
  }

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
  A.provide({ linkPickerEl: linkPickerEl, refreshSaveButton: refreshSaveButton, renderEditor: renderEditor,
      revertCurrent: revertCurrent, touch: touch });
})();

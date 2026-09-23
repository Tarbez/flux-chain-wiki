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
                kind: 'page', slugs: [], aDrafts: {}, aSaved: {}, aCurrent: null, cdirs: null,
                assetIds: ArkAssetIds.slice(), assetDrafts: {}, assetSaved: {}, assetCurrent: null, assetDir: null,
                secretIds: ArkSecretIds.slice(), secretDrafts: {}, secretSaved: {}, secretCurrent: null, secretDir: null, secretPlaintext: {}, secretRecipientsText: {}, secretDecrypted: {},
                shapeIds: [], shapeLabels: {}, shapeCurrent: null };
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
  function currentDirty() { return state.kind === 'article' ? dirtyA(state.aCurrent) : state.kind === 'asset' ? dirtyI(state.assetCurrent) : state.kind === 'secret' ? dirtyS(state.secretCurrent) : state.kind === 'mesh' || state.kind === 'design' ? false : dirty(state.current); }
  function anyDirty() { return state.ids.some(dirty) || state.slugs.some(dirtyA) || state.assetIds.some(dirtyI) || state.secretIds.some(dirtyS) || reliefDirty() || themeDirty(); }

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
      return { key: key, label: def.title.replace(' — Flux Chain', '') + '  ' + def.path };
    });
  }

  /* ---- page list ---------------------------------------------------- */
  function renderList() {
    var meshNav = $('meshNav');
    if (meshNav) meshNav.setAttribute('aria-current', String(state.kind === 'mesh'));
    var designNav = $('designNav');
    if (designNav) designNav.setAttribute('aria-current', String(state.kind === 'design'));
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
    if (state.kind === 'article') { renderArticleEditor(); return; }
    if (state.kind === 'asset') { renderAssetEditor(); return; }
    if (state.kind === 'secret') { renderSecretEditor(); return; }
    if (state.kind === 'shape') { renderShapeEditor(); return; }
    if (state.kind === 'mesh') { renderMeshEditor(); return; }
    if (state.kind === 'design') { renderDesignEditor(); return; }
    var root = $('editor'); root.textContent = '';
    var id = state.current, manifest = state.drafts[id];
    if (!manifest) { root.appendChild(h('p', { class: 'empty-state', text: 'Pick a page on the left.' })); return; }
    var save = h('button', { id: 'save', type: 'button', class: 'btn primary', text: 'Save', onclick: saveCurrent });
    var revert = h('button', { id: 'revert', type: 'button', class: 'btn', text: 'Revert', onclick: revertCurrent });
    root.appendChild(h('div', { class: 'editor-head' },
      h('div', {}, h('h1', { text: manifest.title }), h('div', { class: 'route', text: manifest.route + '  ·  js/content/manifests/' + manifest.id + '.js' })),
      h('div', { class: 'editor-actions' }, revert, save)));

    if (manifest.meta.next || manifest.meta.placement) {
      var where = h('fieldset', {}, h('legend', { text: 'Where it goes' }));
      if (manifest.meta.placement) where.appendChild(selectEl('Shown on the theory page as', manifest.meta.placement,
        [{ key: 'row', label: 'A numbered row' }, { key: 'rail', label: 'A link beside the page' }], function (v) { manifest.meta.placement = v; }));
      if (manifest.meta.next) where.appendChild(selectEl('The onward link opens', manifest.meta.next, routeOptions(), function (v) { manifest.meta.next = v; }));
      root.appendChild(where);
    }
    sections(manifest.fields).forEach(function (section) {
      var set = h('fieldset', {}, h('legend', { text: section.name }));
      section.roles.forEach(function (role) { set.appendChild(fieldEl(manifest, role)); });
      root.appendChild(set);
    });
    if (manifest.fields['POINT1.TITLE']) {
      root.appendChild(h('div', { class: 'tools' },
        h('button', { type: 'button', class: 'btn', text: 'Add a point', onclick: function () { addPoint(manifest); touch(); renderEditor(); } }),
        h('button', { type: 'button', class: 'btn', text: 'Remove the last point', disabled: ArkManifest.points(manifest) <= 1, onclick: function () { removePoint(manifest); touch(); renderEditor(); } })));
    }
    if (window.ArkMeshSettings && hasShape(id)) {
      var spid = shapePageId(id);
      root.appendChild(buildShapePickers(spid));
      root.appendChild(buildPlacementPanel(spid));
      root.appendChild(buildMeshTuningPanel());
    }
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
    if (revert) revert.disabled = (article ? state.aSaved[state.aCurrent] : asset ? state.assetSaved[state.assetCurrent] : secret ? state.secretSaved[state.secretCurrent] : state.saved[state.current]) === null || !now;
    var selector = article ? '.page-list button[data-slug="' + state.aCurrent + '"]' : asset ? '.page-list button[data-asset="' + state.assetCurrent + '"]' : secret ? '.page-list button[data-secret="' + state.secretCurrent + '"]' : '.page-list button[data-id="' + state.current + '"]';
    var button = document.querySelector(selector);
    if (button) {
      var dot = button.querySelector('.dot');
      if (now && !dot) button.appendChild(h('span', { class: 'dot', title: 'Unsaved changes' }));
      if (!now && dot) dot.remove();
    }
  }

  function revertCurrent() {
    if (state.kind === 'article') { revertArticle(); return; }
    if (state.kind === 'asset') { revertAsset(); return; }
    if (state.kind === 'secret') { revertSecret(); return; }
    var id = state.current;
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
    return { slug: a.slug, title: a.title, category: a.category, minutes: a.minutes, summary: a.summary, sections: clone(a.sections || []), numbers: !!a.numbers };
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

  function articleField(article, key, label, kind) {
    var id = 'a-' + article.slug + '-' + key;
    var control = kind === 'text' ? h('textarea', { id: id, rows: 3, spellcheck: true }) : h('input', { id: id, type: 'text', spellcheck: true });
    control.value = article[key];
    control.addEventListener('input', function () { article[key] = control.value; touch(); });
    return h('div', { class: 'field' }, h('label', { for: id }, h('span', { text: label })), control);
  }
  function partField(article, si, pi) {
    var section = article.sections[si], id = 'a-' + article.slug + '-s' + si + '-p' + pi;
    var control = pi === 0 ? h('input', { id: id, type: 'text', spellcheck: true }) : h('textarea', { id: id, rows: 4, spellcheck: true });
    control.value = section[pi];
    control.addEventListener('input', function () { section[pi] = control.value; touch(); });
    return h('div', { class: 'field' }, h('label', { for: id }, h('span', { text: pi === 0 ? 'Heading' : 'Paragraph ' + pi })), control);
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

    a.sections.forEach(function (section, si) {
      var box = h('fieldset', { class: 'section-box' }, h('legend', { text: 'Section ' + (si + 1) }));
      section.forEach(function (part, pi) { box.appendChild(partField(a, si, pi)); });
      box.appendChild(h('div', { class: 'tools' },
        h('button', { type: 'button', class: 'btn', text: 'Add a paragraph', onclick: function () { section.push('New paragraph.'); touch(); renderEditor(); } }),
        h('button', { type: 'button', class: 'btn', text: 'Remove the last paragraph', disabled: section.length <= 2, onclick: function () { section.pop(); touch(); renderEditor(); } }),
        h('button', { type: 'button', class: 'btn', text: 'Remove this section', disabled: a.sections.length <= 1, onclick: function () { a.sections.splice(si, 1); touch(); renderEditor(); } })));
      root.appendChild(box);
    });
    root.appendChild(h('div', { class: 'tools' },
      h('button', { type: 'button', class: 'btn', text: 'Add a section', onclick: function () { a.sections.push(['New section.', 'Write the first paragraph.']); touch(); renderEditor(); } })));

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
             summary: 'Say what this note is about.', sections: [['First heading', 'Write the first paragraph.']], numbers: false };
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
    if (state.kind === 'mesh') return null;
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
    $('previewNote').textContent = state.kind === 'mesh' ? 'The mesh has no live preview — see its status in the editor.' : 'Save this page to preview it.';
    var saved = state.kind === 'article' ? state.aSaved[state.aCurrent] : state.kind === 'asset' ? state.assetSaved[state.assetCurrent]
      : state.kind === 'secret' ? state.secretSaved[state.secretCurrent] : state.kind === 'shape' ? (state.shapeCurrent ? '' : null)
      : state.kind === 'design' ? '' : state.saved[state.current];
    var ready = !!route && saved !== null && saved !== undefined;
    $('frame').hidden = !ready; $('previewNote').hidden = ready;
    if (ready) $('frame').src = 'index.html?preview=' + Date.now() + '#' + route;
  }

  /* Unsaved image edits reach the preview iframe live, the same way a saved one reaches the real
     site: js/zero-webgl.js listens for this on every page (harmless outside a preview) and, for the
     asset id it actually uses, swaps its buffer in without touching anything on disk. */
  function notifyPreviewAssets() {
    var frame = $('frame'), win = frame && !frame.hidden && frame.contentWindow;
    if (!win) return;
    var assets = state.assetIds.map(function (id) { return state.assetDrafts[id]; }).filter(function (a) { return a && a.dataBase64; });
    if (!assets.length) return;
    try { win.postMessage({ type: 'subzero-preview-assets', assets: assets }, window.location.origin); } catch (error) { /* preview not ready yet; the next edit or the frame's own load retries */ }
  }
  /* Same idea as notifyPreviewAssets, for the shared relief tuning and each
     page's two shape images (js/content/mesh-settings.js): an edit shows its
     effect on the previewed page immediately, before Save writes anything. */
  var meshDraft = (window.ArkMeshSettings && ArkMeshSettings.get()) || (window.ArkMeshSettings && ArkMeshSettings.defaults()) || { tuning: {}, pages: {} };
  var meshSaved = window.ArkMeshSettings ? JSON.stringify(ArkMeshSettings.sanitize(meshDraft)) : null;
  function notifyPreviewMesh() {
    var frame = $('frame'), win = frame && !frame.hidden && frame.contentWindow;
    if (!win) return;
    try { win.postMessage({ type: 'subzero-preview-mesh', settings: meshDraft }, window.location.origin); } catch (error) { /* preview not ready yet; the next edit or the frame's own load retries */ }
  }
  /* Same idea again, for the colour theme (js/content/theme.js): a picked colour shows on
     the previewed page immediately, before Save writes anything. */
  var themeDraft = (window.ArkTheme && ArkTheme.get()) || (window.ArkTheme && ArkTheme.defaults()) || {};
  var themeSaved = window.ArkTheme ? JSON.stringify(ArkTheme.sanitize(themeDraft)) : null;
  function notifyPreviewTheme() {
    var frame = $('frame'), win = frame && !frame.hidden && frame.contentWindow;
    if (!win) return;
    try { win.postMessage({ type: 'subzero-preview-theme', theme: themeDraft }, window.location.origin); } catch (error) { /* preview not ready yet; the next edit or the frame's own load retries */ }
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

  function renderDesignEditor() {
    var root = $('editor'); root.textContent = '';
    root.appendChild(h('div', { class: 'editor-head' }, h('div', {}, h('h1', { text: 'Design' }), h('div', { class: 'route', text: 'js/content/theme-data.js' }))));
    if (!window.ArkTheme) { root.appendChild(h('p', { class: 'empty-state', text: 'Theme editing is unavailable on this page.' })); return; }
    var save = h('button', { type: 'button', class: 'btn primary', text: 'Save' });
    var reset = h('button', { type: 'button', class: 'btn', text: 'Reset everything to defaults' });

    var colorsBox = h('fieldset', { class: 'relief' }, h('legend', { text: 'Shades' }));
    colorsBox.appendChild(h('p', { class: 'hint', text: 'The site’s colour palette (js/tokens.js). Nothing here is written until Save; the preview on the right updates as you pick.' }));
    var colorFields = h('div', { class: 'relief-fields' });
    function refreshColors() {
      colorFields.textContent = '';
      ArkTheme.colorFields().forEach(function (f) {
        var id = 'theme-' + f.key;
        var swatch = h('input', { id: id, type: 'color', value: themeDraft.colors[f.key] || f.def });
        swatch.addEventListener('input', function () {
          themeDraft.colors[f.key] = swatch.value;
          notifyPreviewTheme(); save.disabled = !themeDirty();
        });
        var revertOne = h('button', { type: 'button', class: 'btn tiny', text: 'Default', title: 'Reset just this colour', disabled: themeDraft.colors[f.key] === f.def, onclick: function () {
          themeDraft.colors[f.key] = f.def; swatch.value = f.def; revertOne.disabled = true;
          notifyPreviewTheme(); save.disabled = !themeDirty();
        } });
        colorFields.appendChild(h('div', { class: 'relief-field' },
          h('div', { class: 'relief-field-head' }, h('label', { for: id, text: f.label }), revertOne),
          swatch));
      });
    }
    colorsBox.appendChild(colorFields);

    var bgBox = h('fieldset', { class: 'relief' }, h('legend', { text: 'Background' }));
    bgBox.appendChild(h('p', { class: 'hint', text: 'A layer behind every page (js/ark/vendor/backgrounds.js, from design/ark-ui). ‘None’ keeps the site’s original flat canvas colour.' }));
    var bgGrid = h('div', { class: 'bg-grid' });
    function refreshBackground() {
      bgGrid.textContent = '';
      ArkTheme.backgroundStyles().forEach(function (s) {
        var id = 'bg-' + s.key;
        var picked = themeDraft.background.style === s.key;
        var radio = h('input', { id: id, type: 'radio', name: 'bg-style', checked: picked });
        radio.addEventListener('change', function () {
          themeDraft.background = { style: s.key };
          notifyPreviewTheme(); save.disabled = !themeDirty(); refreshBackground();
        });
        var card = h('label', { for: id, class: 'bg-card' + (picked ? ' picked' : '') },
          radio, s.key === 'none' ? h('div', { class: 'bg-thumb bg-thumb-none' }) : backgroundThumb(s.key),
          h('span', { text: s.label }));
        bgGrid.appendChild(card);
      });
    }
    bgBox.appendChild(bgGrid);

    function refreshAll() { refreshColors(); refreshBackground(); save.disabled = !themeDirty(); }
    reset.addEventListener('click', function () { themeDraft = ArkTheme.defaults(); refreshAll(); notifyPreviewTheme(); });
    save.addEventListener('click', function () { saveThemeDraft(save); });
    refreshAll();
    root.appendChild(colorsBox);
    root.appendChild(bgBox);
    root.appendChild(h('div', { class: 'tools' }, save, reset));
  }
  $('designNav').addEventListener('click', selectDesign);

  $('frame').addEventListener('load', function () { notifyPreviewAssets(); notifyPreviewMesh(); notifyPreviewTheme(); });
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
  /* One page's two image pickers ("Primary shape image" / "Surface shape
     image"), populated from every saved image, each with its own inline
     upload. "None" keeps that page's built-in orb/knot/word (zero) or
     reference symbol (other pages) -- unless "Hide this shape" is checked,
     which removes the shape entirely, overriding even a page (Theory) whose
     built-in shape normally shows without any image assigned. */
  function buildShapePickers(pageId) {
    var box = h('fieldset', {}, h('legend', { text: 'Images' }));
    var hiddenId = 'shape-' + pageId + '-hidden';
    var hiddenBox = h('input', { id: hiddenId, type: 'checkbox' });
    hiddenBox.checked = !!meshDraft.pages[pageId].hidden;
    hiddenBox.addEventListener('change', function () {
      meshDraft.pages[pageId].hidden = hiddenBox.checked;
      notifyPreviewMesh(); renderEditor(); renderList();
    });
    box.appendChild(h('div', { class: 'field field-inline' }, hiddenBox, h('label', { for: hiddenId, text: 'Hide this page’s shape entirely (no image, no built-in shape either)' })));
    box.appendChild(h('p', { class: 'hint', text: 'Replaces this page’s built-in shape with two of your images: one rising above the waterline, one sunk below it. Leave either as None to keep the built-in look for that half.' }));
    ['primary', 'surface'].forEach(function (slot) {
      var id = 'shape-' + pageId + '-' + slot;
      var select = h('select', { id: id, onchange: function () {
        meshDraft.pages[pageId][slot] = select.value || null;
        notifyPreviewMesh(); renderEditor(); renderList();
      } });
      select.appendChild(h('option', { value: '', text: 'None (built-in shape)' }));
      state.assetIds.forEach(function (assetId) {
        select.appendChild(h('option', { value: assetId, text: state.assetDrafts[assetId].label || assetId }));
      });
      select.value = meshDraft.pages[pageId][slot] || '';
      var upload = h('input', { id: id + '-upload', type: 'file', accept: ArkAsset.mimeTypes.join(',') });
      upload.addEventListener('change', function () {
        var file = upload.files && upload.files[0];
        if (!file) return;
        quickAddAsset(file, function (assetId) {
          meshDraft.pages[pageId][slot] = assetId;
          notifyPreviewAssets(); notifyPreviewMesh();
          renderEditor(); renderList();
          status('Added "' + assetId + '" and set it as this page’s ' + slot + ' image. Save the image and Save this page’s shapes to keep it.', 'ok');
        });
      });
      box.appendChild(h('div', { class: 'field' },
        h('label', { for: id, text: slot === 'primary' ? 'Primary shape image (rises above the waterline)' : 'Surface shape image (sinks below the waterline)' }),
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
        notifyPreviewMesh();
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
      document.createTextNode('the record pointing subzero.ark at that address is signed by your identity so no one else can repoint the name — but the signature and the record are public too.')));
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
      var open = indexedDB.open('subzero-admin', 1);
      open.onupgradeneeded = function () { open.result.createObjectStore('handles'); };
      open.onsuccess = function () { open.result.transaction('handles', 'readwrite').objectStore('handles').put(handle, 'project'); };
    } catch (e) { /* remembering the folder is a convenience; saving still works */ }
  }
  function recall(callback) {
    try {
      var open = indexedDB.open('subzero-admin', 1);
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
      var handle = await window.showDirectoryPicker({ mode: 'readwrite', id: 'subzero-project' });
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
  var mesh = window.ArkPublish ? ArkPublish.create({ identity: function () { return gate.identity(); } }) : null;
  function short(text) { return text ? text.slice(0, 8) + '…' + text.slice(-6) : ''; }
  function siteFromState() {
    return { manifests: state.ids.map(function (id) { return clone(state.drafts[id]); }),
             articles: state.slugs.map(function (slug) { return articleCopy(state.aDrafts[slug]); }),
             assets: state.assetIds.map(function (id) { return clone(state.assetDrafts[id]); }),
             secrets: state.secretIds.map(function (id) { return clone(state.secretDrafts[id]); }),
             meshSettings: window.ArkMeshSettings ? clone(meshDraft) : null,
             theme: window.ArkTheme ? clone(themeDraft) : null };
  }

  async function refreshMesh() {
    var line = $('meshState'), owner = $('meshOwner');
    if (!mesh) {
      /* opened from disk: this page cannot reach a miner, but a plain link to the host's copy of it can be followed */
      line.textContent = 'This copy of the page cannot publish. Double-click "SUBZERO Admin.command" in the subzero folder, or use the copy served by the host: ';
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
  $('signOut').addEventListener('click', function () { gate.signOut(); });
  /* the locked page asks before it signs out over unsaved work */
  window.ArkAdminApp = { unsaved: function () { return anyDirty(); } };

  document.addEventListener('keydown', function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key === 's') { event.preventDefault(); if (currentDirty()) saveCurrent(); }
  });
  window.addEventListener('beforeunload', function (event) { if (anyDirty()) { event.preventDefault(); event.returnValue = ''; } });

  loadBodies(function () { adoptArticles(); renderList(); renderEditor(); reloadPreview(); refreshMesh(); });
})();

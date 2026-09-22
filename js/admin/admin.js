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
                kind: 'page', slugs: [], aDrafts: {}, aSaved: {}, aCurrent: null, cdirs: null };
  state.ids.forEach(function (id) {
    var manifest = ArkManifest.get(id);
    state.drafts[id] = clone(manifest); state.saved[id] = JSON.stringify(manifest);
  });
  state.current = state.ids[0];

  function dirty(id) { return state.saved[id] === null || JSON.stringify(state.drafts[id]) !== state.saved[id]; }
  function dirtyA(slug) { return state.aSaved[slug] === null || JSON.stringify(state.aDrafts[slug]) !== state.aSaved[slug]; }
  function currentDirty() { return state.kind === 'article' ? dirtyA(state.aCurrent) : dirty(state.current); }
  function anyDirty() { return state.ids.some(dirty) || state.slugs.some(dirtyA); }

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
      return { key: key, label: def.title.replace(' — SUBZERO', '') + '  ' + def.path };
    });
  }

  /* ---- page list ---------------------------------------------------- */
  function renderList() {
    var list = $('pageList'); list.textContent = '';
    ArkManifest.groups.forEach(function (group) {
      var ids = state.ids.filter(function (id) { return state.drafts[id].group === group; });
      if (!ids.length) return;
      list.appendChild(h('li', { class: 'side-group', text: GROUP_NAMES[group] }));
      ids.forEach(function (id) {
        var button = h('button', { type: 'button', 'aria-current': String(state.kind === 'page' && id === state.current), 'data-id': id, onclick: function () { select(id); } },
          h('span', { text: state.drafts[id].title }), dirty(id) ? h('span', { class: 'dot', title: 'Unsaved changes' }) : null);
        list.appendChild(h('li', {}, button));
      });
    });
    if (state.slugs.length) list.appendChild(h('li', { class: 'side-group', text: 'Articles' }));
    state.slugs.forEach(function (slug) {
      var button = h('button', { type: 'button', 'aria-current': String(state.kind === 'article' && slug === state.aCurrent), 'data-slug': slug, onclick: function () { selectArticle(slug); } },
        h('span', { text: state.aDrafts[slug].title || slug }), dirtyA(slug) ? h('span', { class: 'dot', title: 'Unsaved changes' }) : null);
      list.appendChild(h('li', {}, button));
    });
  }

  function select(id) { state.kind = 'page'; state.current = id; renderList(); renderEditor(); reloadPreview(); }

  function selectArticle(slug) { state.kind = 'article'; state.aCurrent = slug; renderList(); renderEditor(); reloadPreview(); }

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
    if (manifest.group === 'theory') {
      root.appendChild(h('div', { class: 'danger-zone' },
        h('button', { type: 'button', class: 'btn danger', text: 'Delete this page', onclick: deleteCurrent })));
    }
    touch();
  }

  /* update everything that depends on "is it dirty" without rebuilding the form */
  function touch() {
    var article = state.kind === 'article', now = currentDirty();
    var save = $('save'), revert = $('revert');
    if (save) save.disabled = !now;
    if (revert) revert.disabled = (article ? state.aSaved[state.aCurrent] : state.saved[state.current]) === null || !now;
    var button = document.querySelector(article ? '.page-list button[data-slug="' + state.aCurrent + '"]' : '.page-list button[data-id="' + state.current + '"]');
    if (button) {
      var dot = button.querySelector('.dot');
      if (now && !dot) button.appendChild(h('span', { class: 'dot', title: 'Unsaved changes' }));
      if (!now && dot) dot.remove();
    }
  }

  function revertCurrent() {
    if (state.kind === 'article') { revertArticle(); return; }
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

  /* ---- new page ----------------------------------------------------- */
  function blueprint(id) {
    function line(label, value, section) { return { label: label, kind: 'line', section: section, value: value }; }
    function text(label, value, section) { return { label: label, kind: 'text', section: section, value: value }; }
    var fields = {
      EYEBROW: line('Eyebrow', 'THE SUBZERO THEORY / ' + id.toUpperCase(), 'Page'),
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
    if (state.kind === 'article') return state.aCurrent ? '/learnings/' + state.aCurrent : null;
    var m = state.drafts[state.current];
    return m ? m.route : null;
  }
  function previewUrl() {
    var route = previewRoute();
    return 'index.html' + (route ? '#' + route : '');
  }
  function reloadPreview() {
    var route = previewRoute();
    $('open').href = previewUrl();
    var saved = state.kind === 'article' ? state.aSaved[state.aCurrent] : state.saved[state.current];
    var ready = !!route && saved !== null && saved !== undefined;
    $('frame').hidden = !ready; $('previewNote').hidden = ready;
    if (ready) $('frame').src = 'index.html?preview=' + Date.now() + '#' + route;
  }
  $('reload').addEventListener('click', reloadPreview);

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
             articles: state.slugs.map(function (slug) { return articleCopy(state.aDrafts[slug]); }) };
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
    if (!mesh.identity()) { status('You are signed out. Reload the admin and sign in with your recovery file.', 'warn'); return; }
    if (anyDirty()) { status('Save your changes first, so the site files and the published copy match.', 'warn'); return; }
    var button = $('publish'); button.disabled = true; publishing = true;
    try {
      var result = await mesh.publishSite(siteFromState(), function (message) { status(message, ''); }, function (removes) {
        var what = removes ? removes.manifests.concat(removes.articles).join(', ') : 'possibly some pages or articles (the published version could not be compared)';
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
  $('signOut').addEventListener('click', function () { gate.signOut(); });
  /* the locked page asks before it signs out over unsaved work */
  window.ArkAdminApp = { unsaved: function () { return anyDirty(); } };

  document.addEventListener('keydown', function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key === 's') { event.preventDefault(); if (currentDirty()) saveCurrent(); }
  });
  window.addEventListener('beforeunload', function (event) { if (anyDirty()) { event.preventDefault(); event.returnValue = ''; } });

  loadBodies(function () { adoptArticles(); renderList(); renderEditor(); reloadPreview(); refreshMesh(); });
})();

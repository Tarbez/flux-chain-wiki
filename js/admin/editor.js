/* =====================================================================
   ADMIN EDITOR · PAGE FIELDS AND THE CONTENT FORMS' COMMON PATH (js/admin/editor.js)
   ---------------------------------------------------------------------
   Owns: renderPageFields(container, id) -- a page's (manifest's) whole form: every field,
   link pickers, points, its Content / Shape / SEO / Code tabs (the Shape tab's pieces are
   js/admin/shapes.js's, the SEO tab js/admin/seo.js's) -- drawn into WHATEVER container the
   shell hands it (the Page fields sheet, a test's detached div); and the path every content
   form shares: setItemField() (THE single-field draft write -- form inputs and the canvas's
   inline edits both call it), touch() (refresh everything that depends on "is it dirty"
   without rebuilding a form), revertItem(), createPage(), deleteItem(), the header's Save
   button state, and the panel registry that repaints a form in place keeping focus and caret.
   There is no centre-column dispatcher any more: the old renderEditor() drew whatever
   state.kind named into the fixed #editor column of the Content layout, which is gone (one
   workspace, 2026-10-18), and was deleted with it. The shell mounts each panel where it wants
   (js/admin/panels.js) and re-draws them with refreshPanels().
   Must not: save (js/admin/save.js) or post to a preview frame directly (the bridge,
   js/admin/bridge.js, does -- touch() asks it with notifyPreviewState()).
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, h = A.h, $ = A.$, hasShape = A.hasShape, shapePageId = A.shapePageId,
      refuse = A.refuse, anyDirty = A.anyDirty, NOTHING_TO_SAVE = A.NOTHING_TO_SAVE,
      saveEverything = A.saveEverything, status = A.status, notice = A.notice, ITEM_KINDS = A.ITEM_KINDS,
      dirty = A.dirty, dirtyA = A.dirtyA, dirtyI = A.dirtyI, dirtyS = A.dirtyS,
      removeItemFile = A.removeItemFile, forgetDeleted = A.forgetDeleted, afterDelete = A.afterDelete,
      ctlField = A.ctlField, ctlSelectField = A.ctlSelectField;
  /* defined by files loaded after this one: resolved when called */
  var buildShapePickers = A.later('buildShapePickers'), buildPlacementPanel = A.later('buildPlacementPanel'),
      buildPageSeoPanel = A.later('buildPageSeoPanel'), studioRoutes = A.later('studioRoutes'),
      deleteArticle = A.later('deleteArticle'), deleteAsset = A.later('deleteAsset'),
      deleteSecret = A.later('deleteSecret'), revertArticle = A.later('revertArticle'),
      revertAsset = A.later('revertAsset'), revertSecret = A.later('revertSecret'),
      revertDesign = A.later('revertDesign');
  /* The shell's refresh points (js/admin/nav.js, rail.js, bridge.js). The content forms run
     with or without a given surface on screen -- a test mounts one panel in a detached div, and
     the shell's surfaces change under them -- so a refresh nobody provides is skipped, never an
     error in the middle of an edit. Only refreshes go through here, never a draft write. */
  function hook(name) { return function () { if (typeof A[name] === 'function') return A[name].apply(this, arguments); }; }
  var renderList = hook('renderList'), refreshPanels = hook('refreshPanels'),
      notifyPreviewState = hook('notifyPreviewState'), reloadPreview = hook('reloadPreview'),
      syncCmsPreview = hook('syncCmsPreview');

  /* ---- route choices, from the site's own catalog ------------------- */
  function routeOptions() {
    return Object.keys(ArkUI.pageCatalog).map(function (key) {
      var def = ArkUI.pageCatalog[key];
      return { key: key, label: def.title.replace(' — Flux Protocol', '') + '  ' + def.path };
    });
  }

  /* ---- reference-doc choices, from the generated allow-list ---------- */
  /* A document is called by its name, read out of its path ("docs/evidence/bench-001-verification.md"
     -> "Bench 001 verification (evidence)"), never by the path itself (docs/ux-audit/cms.md P1-2);
     the path is the value it writes. Derived from the path, so a new document needs no label. */
  function docLabel(path) {
    var parts = String(path).replace(/\.md$/i, '').split('/').filter(function (p) { return p && p !== 'docs'; });
    var name = (parts.pop() || String(path)).replace(/[-_]+/g, ' ').trim();
    name = name.charAt(0).toUpperCase() + name.slice(1);
    return parts.length ? name + ' (' + parts.join(', ').replace(/[-_]+/g, ' ') + ')' : name;
  }
  function docOptions() {
    return (ArkUI.referenceDocs || []).map(function (doc) { return { key: doc, label: docLabel(doc) }; });
  }

  /* A select over the site's own data -- its routes, reference docs, shape pages -- takes its
     values and its labels from ONE list of { key, label }, so a label cannot drift from the value
     it writes (tests/admin-control-labels.cjs; these data-driven lists are checked by
     tests/admin-content-panels.cjs). */
  function contentChoices(options) { return options.map(function (o) { return o.key; }); }
  function contentLabel(options) { var by = {}; options.forEach(function (o) { by[o.key] = o.label; }); return function (key) { return by[key] === undefined ? String(key) : by[key]; }; }

  /* ---- a 'link' field's tagged value, taken apart for the picker ----- */
  function parseLinkValue(value) {
    var m = /^(route|doc|url):([\s\S]*)$/.exec(value || '');
    return m ? { type: m[1], rest: m[2] } : { type: 'route', rest: '' };
  }

  /* The picker for a field of kind 'link' (js/content/manifest.js): a type toggle, then the one
     control that type needs, always writing back the tagged string a 'link' field's value must
     be. `onchange` receives the new tagged value; callers choose where it goes (a manifest
     field through setItemField, an article's own string property), so this one renderer serves
     a page's fields here and an article's (js/admin/articles.js). The value select starts with
     "Not set" because a link with only its type ('route:') is what the draft holds right after
     the type changes -- a select showing its first page would claim a value the draft lacks.
     `onchange` persists the value (through setItemField, which also runs touch()). `bind` is
     the field's address (setItemField's kind:id:key), so an edit from elsewhere shows. */
  var LINK_TYPES = [{ key: 'route', label: 'Internal page' }, { key: 'doc', label: 'Reference doc' }, { key: 'url', label: 'External URL' }];
  function linkPickerEl(labelText, keyHint, value, onchange, note, bind) {
    var parsed = parseLinkValue(value);
    var typeId = 'lp-type-' + keyHint, valueId = 'lp-value-' + keyHint;
    var body = h('div', { class: 'field-link-value' });
    var box = h('div', { class: 'field field-link' });
    if (bind) box.dataset.cmsLink = bind;
    function renderValue() {
      body.textContent = '';
      var ctx = { get: function () { return parsed.rest; }, set: function (_key, v) { parsed.rest = v; onchange(parsed.type + ':' + parsed.rest); } };
      if (parsed.type === 'url') { body.appendChild(ctlField(ctx, 'Address', 'rest', { type: 'text', id: valueId, live: true, spellcheck: false })); return; }
      var options = [{ key: '', label: 'Not set' }].concat(parsed.type === 'route' ? routeOptions() : docOptions());
      body.appendChild(ctlSelectField(ctx, parsed.type === 'route' ? 'Page' : 'Document', 'rest', contentChoices(options), contentLabel(options), { id: valueId }));
    }
    var typeCtx = { get: function () { return parsed.type; }, set: function (_key, v) { parsed = { type: v, rest: '' }; renderValue(); onchange(parsed.type + ':'); } };
    var typeRow = ctlSelectField(typeCtx, labelText, 'type', contentChoices(LINK_TYPES), contentLabel(LINK_TYPES), { id: typeId });
    box.appendChild(typeRow);
    box.appendChild(body);
    if (note) { typeRow.children[2].className = 'field-key'; typeRow.children[2].textContent = note; }
    renderValue();
    /* an edit from elsewhere (the canvas, a Revert) re-reads the value; the picker that is being
       used keeps its own state */
    box.cmsSync = function (next) { if (box.contains(document.activeElement)) return; parsed = parseLinkValue(next); typeRow.children[1].value = parsed.type; renderValue(); };
    return box;
  }

  /* ---- the mounted panels -----------------------------------------------------------------
     Every content form is drawn by paintInto(): it records the panel (so a structural edit can
     repaint every form showing that item, attached or not), and a repaint keeps the focused
     control, its caret and the scroll position -- a repaint while someone types must not pull
     the caret out of the field (the canvas now remounts on every keystroke's draft, and the
     shell's refreshes re-mount panels on preview messages). */
  var mounted = [];
  function paintInto(container, record, build) {
    var active = document.activeElement, keep = null;
    if (active && active !== document.body && container.contains(active) && active.id) {
      keep = { id: active.id, start: null, end: null };
      try { keep.start = active.selectionStart; keep.end = active.selectionEnd; } catch (e) { /* a control with no caret */ }
    }
    var scroll = container.scrollTop;
    mounted = mounted.filter(function (r) { return r.container !== container && !(r.seen && !r.container.isConnected); });
    record.container = container; record.seen = container.isConnected; mounted.push(record);
    container.textContent = '';
    build(container);
    container.scrollTop = scroll;
    if (keep) {
      var again = Array.prototype.find.call(container.querySelectorAll('[id]'), function (el) { return el.id === keep.id; });
      if (again) {
        again.focus({ preventScroll: true });
        if (keep.start != null) try { again.setSelectionRange(keep.start, keep.end); } catch (e) { /* a control with no caret */ }
      }
    }
    refreshRevertButtons(container);
  }
  /* repaint every mounted panel that shows `kind` (and `id`, when given): a list panel
     (Media, Vault) records kind + ':list' and repaints on any change to that kind */
  function repaintPanels(kind, id) {
    mounted.slice().forEach(function (r) {
      if (r.kind === kind + ':list' || (r.kind === kind && (id === undefined || r.id === id)) || kind === '*') r.repaint();
    });
  }
  /* the list of items changed (created, deleted, reverted): every form and the shell's lists */
  function itemsChanged(kind, id) {
    repaintPanels(kind, id);
    renderList(); refreshPanels();
    emit(kind, id, 'items');
  }
  /* One event for whoever lists items with dirty dots (the rail's Pages tab, the sitemap):
     `ark-cms-drafts` on document, detail { kind, id, change: 'edit' | 'items' }. */
  function emit(kind, id, change) {
    try { document.dispatchEvent(new CustomEvent('ark-cms-drafts', { detail: { kind: kind, id: id, change: change } })); } catch (e) { /* no CustomEvent: nothing listens either */ }
  }

  /* ---- an item's dirty / saved state -------------------------------------------------------- */
  var DIRTY = { page: dirty, article: dirtyA, asset: dirtyI, secret: dirtyS };
  function itemExists(kind, id) { var k = ITEM_KINDS[kind]; return !!(k && state[k.drafts][id]); }
  function itemDirty(kind, id) { return !!(DIRTY[kind] && itemExists(kind, id) && DIRTY[kind](id)); }
  function neverSaved(kind, id) { var k = ITEM_KINDS[kind]; return !!k && state[k.saved][id] === null; }
  /* A panel's Revert button carries data-revert="<kind>:<id>" and says why it is disabled. */
  function refreshRevertButtons(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll('[data-revert]'), function (revert) {
      var at = revert.dataset.revert.indexOf(':'), kind = revert.dataset.revert.slice(0, at), id = revert.dataset.revert.slice(at + 1);
      if (kind === 'design') { refuse(revert, A.themeDirty() || A.settingsDefaultsDirty() ? '' : 'Nothing to revert: Site style matches what is saved.'); return; }
      refuse(revert, neverSaved(kind, id) ? 'Not saved yet: there is no saved version to revert to.' : itemDirty(kind, id) ? '' : 'Nothing to revert: this matches its saved copy.');
    });
  }
  /* every list row that names an item -- data-cms-item="<kind>:<id>" -- gets or loses its dot */
  function refreshDots(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll('[data-cms-item]'), function (row) {
      var at = row.dataset.cmsItem.indexOf(':'), now = itemDirty(row.dataset.cmsItem.slice(0, at), row.dataset.cmsItem.slice(at + 1)), dot = row.querySelector('.dot');
      if (now && !dot) row.appendChild(h('span', { class: 'dot', title: 'Unsaved changes' }));
      if (!now && dot) dot.remove();
    });
  }
  /* An item's head: its name, its address on the site (when it has one) and Revert. The file that
     holds it is a name the code uses, so it is the head's Developer details, never the subtitle
     (docs/ux-audit/cms.md P1-2: "js/content/assets/<id>.js" under an image's name). */
  function panelHead(title, address, kind, id, file) {
    var revert = h('button', { type: 'button', class: 'btn', text: 'Revert', 'data-revert': kind + ':' + id, onclick: function () { revertItem(kind, id); } });
    return h('div', { class: 'cms-form-head' },
      h('div', {}, h('h2', { text: title }), address ? h('div', { class: 'route', text: address }) : null, file ? A.devDetails([['File', file]]) : null),
      h('div', { class: 'editor-actions' }, revert));
  }

  /* ---- THE single-field draft write --------------------------------------------------------
     setItemField(kind, id, fieldKey, value, opts) -> { ok: true, changed } | { ok: false, refusal }
     The one path a content edit takes into a draft: every page/article form input calls it, and
     so does the canvas's inline editing (defxn-cms-preview-copy-edit, js/admin/bridge.js), so
     Save, dirty dots, Revert and versions see one kind of edit.
       kind 'page':    fieldKey is a manifest field role ('TITLE', 'NAV.PRODUCTS', 'POINT2.TEXT')
                       -> drafts[id].fields[role].value; or 'meta.placement' / 'meta.next' where
                       the page has them.
       kind 'article': a card / editorial property ('title', 'summary', 'core', 'relevance',
                       'evidenceHref', ...), 'sections.<i>.<j>' (j 0 = the heading),
                       'questions.<i>', or 'numbers' (a boolean).
     The value is a string (numbers: a boolean). Any other key is refused with what it needs --
     an edit never invents a field. opts.canvas === false: the edit came FROM the canvas, which
     already shows it -- the draft and the canvas's copy of the site are updated without
     remounting the preview under the person typing in it. Every form control bound to the
     field (data-cms-field="<kind>:<id>:<key>") shows the new value unless it has focus. */
  var ARTICLE_TEXT_KEYS = ['title', 'category', 'summary', 'core', 'relevance', 'reviewed', 'evidenceLabel', 'evidenceHref', 'relatedPage', 'actionLabel', 'actionPage'];
  /* `item`: the copy to read or write (default: the draft; savedFieldValue passes the saved one) */
  function fieldTarget(kind, id, key, item) {
    if (kind === 'page') {
      var m = item || state.drafts[id];
      if (!m) return { refusal: 'No page "' + id + '" to edit. Needs: an id from the Pages list (' + state.ids.join(', ') + ').' };
      if (key === 'meta.placement' || key === 'meta.next') {
        var meta = key.slice(5);
        if (!m.meta || !m.meta[meta]) return { refusal: 'Page "' + id + '" has no ' + key + ' to set: only pages that already link onward or sit on the theory page have it (js/content/manifests/' + id + '.js).' };
        return { get: function () { return m.meta[meta]; }, set: function (v) { m.meta[meta] = v; } };
      }
      var f = m.fields && m.fields[key];
      if (!f) return { refusal: 'Page "' + id + '" has no field "' + key + '". Its fields are ' + Object.keys(m.fields || {}).join(', ') + '; a new field is added in js/content/manifests/' + id + '.js, not by an edit.' };
      return { field: f, get: function () { return f.value; }, set: function (v) { f.value = v; } };
    }
    if (kind === 'article') {
      var a = item || state.aDrafts[id];
      if (!a) return { refusal: 'No article "' + id + '" to edit. Needs: a slug from the Articles list (' + state.slugs.join(', ') + ').' };
      /* the read time is derived from the words (LearningContent.readTime, js/content/learnings.js) and
         written by the serializer on Save: an edit to it would be silently replaced, so it is refused */
      if (key === 'minutes') return { refusal: 'Article "' + id + '": the read time is not edited; it is derived from the article\'s words (about ' + LearningContent.WORDS_PER_MINUTE + ' a minute) and written when the article is saved. To change it, change the sections.' };
      if (key === 'numbers') return { bool: true, get: function () { return a.numbers; }, set: function (v) { a.numbers = v; } };
      if (ARTICLE_TEXT_KEYS.indexOf(key) >= 0) return { get: function () { return a[key] === undefined ? (key === 'core' ? a.summary : '') : a[key]; }, set: function (v) { a[key] = v; } };
      var s = /^sections\.(\d+)\.(\d+)$/.exec(key), q = /^questions\.(\d+)$/.exec(key);
      if (s && a.sections[+s[1]] && +s[2] < a.sections[+s[1]].length) return { get: function () { return a.sections[+s[1]][+s[2]]; }, set: function (v) { a.sections[+s[1]][+s[2]] = v; } };
      if (q && a.sections[+q[1]]) return {
        get: function () { return (a.questions || [])[+q[1]] || a.sections[+q[1]][0]; },
        /* the first question written fills in the rest from the section headings, as before */
        set: function (v) { if (!a.questions) a.questions = a.sections.map(function (section) { return section[0]; }); a.questions[+q[1]] = v; } };
      return { refusal: 'Article "' + id + '" has no field "' + key + '". Editable: ' + ARTICLE_TEXT_KEYS.join(', ') + ', numbers, sections.<section>.<part> (0..' + (a.sections.length - 1) + '), questions.<section>.' };
    }
    return { refusal: 'setItemField edits pages and articles, not "' + kind + '". Needs: kind "page" or "article"; images and encrypted items are edited in the Media and Vault tabs.' };
  }
  function setItemField(kind, id, key, value, opts) {
    opts = opts || {};
    var t = fieldTarget(kind, id, key);
    if (t.refusal) return { ok: false, refusal: t.refusal };
    if (t.bool ? typeof value !== 'boolean' : typeof value !== 'string') return { ok: false, refusal: kind + ' "' + id + '" ' + key + ' takes ' + (t.bool ? 'true or false' : 'text') + ', not ' + (value === null ? 'null' : typeof value) + '.' };
    var before = t.get(), changed = before !== value;
    t.set(value);
    /* one entry in the ONE undo history (js/admin/history.js), unless the canvas already holds
       this edit in its own (an inline edit) or the history itself is writing it back */
    if (changed && opts.record !== false && opts.canvas !== false && typeof A.historyField === 'function') A.historyField(kind, id, key, before, value);
    if (opts.canvas === false && state.cmsSourceSite) foldIntoCanvasSite(kind, id, key);
    syncControls(kind + ':' + id + ':' + key, value);
    touch({ canvas: opts.canvas !== false, kind: kind, id: id });
    return { ok: true, changed: changed };
  }
  /* A field's value as it is now in the draft, or -- saved: true -- in the item's SAVED copy;
     undefined when there is none (an item never saved, a field it does not have). What the
     toolbar's "Revert to saved" goes back to (js/admin/toolbar-sections.js). */
  function fieldValue(kind, id, key, saved) {
    var item = null;
    if (saved) {
      var text = kind === 'page' ? state.saved[id] : kind === 'article' ? state.aSaved[id] : null;
      if (text == null) return undefined;
      try { item = JSON.parse(text); } catch (e) { return undefined; }
    }
    var t = fieldTarget(kind, id, key, item);
    return t.refusal ? undefined : t.get();
  }
  /* the canvas's copy of the site (state.cmsSourceSite) takes the one edited item from its draft,
     so the preview's next remount carries what was typed inline */
  function foldIntoCanvasSite(kind, id) {
    var site = state.cmsSourceSite, list = kind === 'page' ? site.manifests : site.articles, key = kind === 'page' ? 'id' : 'slug';
    if (!Array.isArray(list)) return;
    var at = list.findIndex(function (x) { return x && x[key] === id; });
    var copy = kind === 'page' ? JSON.parse(JSON.stringify(state.drafts[id])) : A.articleCopy(state.aDrafts[id]);
    if (at >= 0) list[at] = copy;
  }
  function syncControls(address, value) {
    var seen = [];
    var roots = [document].concat(mounted.map(function (r) { return r.container; }));
    roots.forEach(function (root) {
      Array.prototype.forEach.call(root.querySelectorAll('[data-cms-field], [data-cms-link]'), function (el) {
        if (seen.indexOf(el) >= 0 || (el.dataset.cmsField || el.dataset.cmsLink) !== address) return;
        seen.push(el);
        if (el.dataset.cmsLink) { el.cmsSync && el.cmsSync(value); return; }
        if (el !== document.activeElement) { if (el.type === 'checkbox') el.checked = !!value; else el.value = value; }
        decorate(el, value);
      });
    });
  }
  /* a page field's row shows whether it is empty (data-mark-empty) and, for a text field, how long it is */
  function decorate(control, value) {
    var row = control.closest('.row');
    if (!row || typeof value !== 'string') return;
    if (row.dataset.markEmpty) row.classList.toggle('empty', !value);
    var count = row.querySelector('.count');
    if (count) count.textContent = value.length + ' characters';
  }
  /* a form row bound to one field: the shared ctlField, writing through setItemField */
  function boundField(kind, id, key, label, opts) {
    var t = fieldTarget(kind, id, key);
    var row = ctlField({ get: function () { return t.get(); }, set: function (_k, v) { setItemField(kind, id, key, v); } }, label, key,
      Object.assign({ type: 'text', live: true }, opts));
    var control = row.children[1];
    control.dataset.cmsField = kind + ':' + id + ':' + key;
    row.classList.add('field');
    return row;
  }

  /* ---- a page's form ------------------------------------------------------------------------ */
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
    /* a field is called by its label; its copy key (HOME.PROMISE) is the form's Developer details,
       not a mono tag on every row (docs/ux-audit/cms.md P1-14) */
    var field = manifest.fields[role], id = 'f-' + manifest.id + '-' + role.replace(/\./g, '-');
    if (field.kind === 'link') {
      return linkPickerEl(field.label, id, field.value, function (v) { setItemField('page', manifest.id, role, v); }, null, 'page:' + manifest.id + ':' + role);
    }
    var text = field.kind === 'text';
    var row = boundField('page', manifest.id, role, field.label, { type: text ? 'textarea' : 'text', rows: 3, id: id });
    row.dataset.markEmpty = '1';
    if (!field.value) row.classList.add('empty');
    if (text) row.appendChild(h('div', { class: 'count', text: field.value.length + ' characters' }));
    return row;
  }

  function metaSelect(manifest, key, labelText, options) {
    var row = ctlSelectField({ get: function () { return manifest.meta[key.slice(5)]; }, set: function (_k, v) { setItemField('page', manifest.id, key, v); } },
      labelText, key, contentChoices(options), contentLabel(options), { id: 'm-' + labelText.replace(/\W+/g, '-').toLowerCase() });
    row.children[1].dataset.cmsField = 'page:' + manifest.id + ':' + key;
    row.classList.add('field');
    return row;
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

  /* "Show on page": the canvas scrolls to the first of a group's words it is showing, and the words
     are outlined for a moment (docs/ux-audit/cms.md P1-14). A field is found by its copy key
     (HOME.EYEBROW) in the canvas's own data-ark-copy-keys -- the same stamp the Content lens binds
     inline edits by. Says why when none of them is on this canvas page (a header word on a page
     that has no header, a hidden field). */
  var showFlash = null;
  function showOnPage(manifest, roles) {
    var frame = $('cmsPreview'), doc = null;
    try { doc = frame && frame.contentDocument; } catch (e) { doc = null; }
    if (!doc || state.cmsPreviewRoute !== manifest.route && manifest.group !== 'site') {
      status('Open ' + (manifest.title || manifest.route) + ' on the canvas to see where these words are.', 'warn'); return false;
    }
    var found = null;
    roles.some(function (role) {
      var key = manifest.id.toUpperCase() + '.' + role;
      found = Array.prototype.filter.call(doc.querySelectorAll('[data-ark-copy-keys]'), function (el) { return String(el.getAttribute('data-ark-copy-keys')).split(/\s+/).indexOf(key) >= 0; })[0] || null;
      return !!found;
    });
    if (!found) { status('None of these words are on the canvas right now. They may belong to a part of the page that is not showing.', 'warn'); return false; }
    if (found.scrollIntoView) found.scrollIntoView({ block: 'center', behavior: 'smooth' });
    if (showFlash) { showFlash.el.style.outline = showFlash.was; clearTimeout(showFlash.timer); }
    showFlash = { el: found, was: found.style.outline, timer: 0 };
    found.style.outline = '2px solid hsl(var(--reference, 210 80% 55%))';
    showFlash.timer = setTimeout(function () { if (showFlash && showFlash.el === found) { found.style.outline = showFlash.was; showFlash = null; } }, 1600);
    return true;
  }
  /* which groups of a page's fields are open: the first, until the person opens another; kept
     across the repaints a keystroke or a Revert causes */
  var groupsOpen = {};

  /* renderPageFields(container, item, opts): every manifest field of one page (or the site
     chrome, id 'nav'), in tabs Content / Shape (pages with a background shape) / SEO / Code,
     with Revert and -- for a theory page -- Delete. `item` is the manifest id (or { id }).
     opts.tab opens a tab ('content' | 'shape' | 'seo' | 'code'); the tab last used on that page
     is kept across repaints. Works at popover width (~420px) and full-sheet width: one column,
     every row a label over its control. Returns the container. */
  var tabFor = {};
  function renderPageFields(container, item, opts) {
    var id = item && typeof item === 'object' ? item.id : item;
    /* opts.tab opens that tab on MOUNT; a re-draw of the same page in the same container (the
       shell re-mounts with the same arguments) keeps the tab the person moved to */
    var prev = mounted.find(function (r) { return r.container === container; });
    if (opts && opts.tab && !(prev && prev.kind === 'page' && prev.id === id)) tabFor['page:' + id] = opts.tab;
    var record = { kind: 'page', id: id, repaint: function () { renderPageFields(container, id); } };
    paintInto(container, record, function (root) {
      root.classList.add('cms-form');
      var manifest = state.drafts[id];
      if (!manifest) { root.appendChild(h('p', { class: 'empty-state', text: id ? 'There is no page "' + id + '" any more (deleted, or never created). Pick a page in the Pages tab.' : 'Pick a page in the Pages tab.' })); return; }
      root.appendChild(panelHead(manifest.title, manifest.route, 'page', id));

      var contentPanel = h('div', { class: 'editor-tab-flow' });
      if (manifest.meta.next || manifest.meta.placement) {
        var where = h('fieldset', {}, h('legend', { text: 'Where it goes' }));
        if (manifest.meta.placement) where.appendChild(metaSelect(manifest, 'meta.placement', 'Shown on the theory page as',
          [{ key: 'row', label: 'A numbered row' }, { key: 'rail', label: 'A link beside the page' }]));
        if (manifest.meta.next) where.appendChild(metaSelect(manifest, 'meta.next', 'The onward link opens', routeOptions()));
        contentPanel.appendChild(where);
      }
      /* A field the page no longer shows says so in its own label ("... (unused on the current
         hero; kept for admin history)"): those wait under "Unused fields", folded, instead of
         sitting between the ones that matter (P1-14). Nothing is dropped. */
      var unusedRoles = Object.keys(manifest.fields).filter(function (role) { return /\bunused\b/i.test(manifest.fields[role].label || ''); });
      /* The fields are grouped by what is on screen (Hero, Status, Links ...): one Ark accordion item
         per group, drawn in the dress the Library's groups already have (css/studio-embed.css lib-group*: one
         accordion dress, not a second), the first open, each with the number of fields it holds and "Show on page".
         A page with one group is just that group, with nothing to fold. */
      var shown = sections(manifest.fields).map(function (section) {
        return { name: section.name, roles: section.roles.filter(function (role) { return unusedRoles.indexOf(role) < 0; }) };
      }).filter(function (section) { return section.roles.length; });
      var showButton = function (section) {
        return h('div', { class: 'tools' }, h('button', { type: 'button', class: 'btn tiny', 'data-action': 'show-on-page', text: 'Show on page',
          title: 'Scroll the canvas to these words', onclick: function () { showOnPage(manifest, section.roles); } }));
      };
      /* opts.field (a "All fields" jump from a word on the canvas) opens the group that holds it */
      var wanted = opts && opts.field ? shown.filter(function (section) { return section.roles.indexOf(opts.field) >= 0; })[0] : null;
      if (wanted) { var seen = groupsOpen['page:' + id] || []; if (seen.indexOf(wanted.name) < 0) groupsOpen['page:' + id] = seen.concat([wanted.name]); }
      if (shown.length === 1) {
        var only = h('fieldset', {}, h('legend', { text: shown[0].name }));
        shown[0].roles.forEach(function (role) { only.appendChild(fieldEl(manifest, role)); });
        only.appendChild(showButton(shown[0]));
        contentPanel.appendChild(only);
      } else if (shown.length) {
        var list = h('div', { class: 'lib-groups' }), folds = [];
        var openNames = groupsOpen['page:' + id] || [shown[0].name];
        shown.forEach(function (section) {
          var trigger = h('button', { type: 'button', class: 'lib-group-trigger' }, h('span', { text: section.name }), h('small', { class: 'lib-group-count', text: String(section.roles.length) }));
          var head = h('h3', { class: 'lib-group-head' }, trigger);
          var panel = h('div', { class: 'lib-group-rows' });
          section.roles.forEach(function (role) { panel.appendChild(fieldEl(manifest, role)); });
          panel.appendChild(showButton(section));
          var item = h('section', { class: 'lib-group', 'data-group': section.name, 'aria-label': section.name }, head, panel);
          folds.push({ value: section.name, item: item, header: head, trigger: trigger, panel: panel });
          list.appendChild(item);
        });
        contentPanel.appendChild(list);
        A.arkAccordion(list, folds, { label: 'Fields on this page', open: openNames,
          onChange: function (openValues) { groupsOpen['page:' + id] = openValues.slice(); } });
      }
      if (unusedRoles.length) {
        var unusedBody = h('div', {}, h('p', { class: 'hint', text: 'The page does not show these today. They are kept so nothing written in them is lost.' }));
        unusedRoles.forEach(function (role) { unusedBody.appendChild(fieldEl(manifest, role)); });
        contentPanel.appendChild(A.arkDisclosure({ label: 'Unused fields (' + unusedRoles.length + ')', content: unusedBody }));
      }
      contentPanel.appendChild(A.devDetails([['File', 'js/content/manifests/' + manifest.id + '.js'], ['Address', manifest.route]].concat(
        Object.keys(manifest.fields).map(function (role) { return [manifest.fields[role].label + (manifest.fields[role].section ? ' (' + manifest.fields[role].section + ')' : ''), manifest.id.toUpperCase() + '.' + role]; }))));
      if (manifest.fields['POINT1.TITLE']) {
        contentPanel.appendChild(h('div', { class: 'tools' },
          h('button', { type: 'button', class: 'btn', text: 'Add a point', onclick: function () { addPoint(manifest); touch(); repaintPanels('page', id); } }),
          h('button', { type: 'button', class: 'btn', text: 'Remove the last point', disabled: ArkManifest.points(manifest) <= 1, onclick: function () { removePoint(manifest); touch(); repaintPanels('page', id); } })));
      }
      /* the tabs in plain words (P1-14): ids stay (opts.tab, drivers) */
      var tabItems = [{ id: 'content', label: 'Text', content: contentPanel }];
      if (window.ArkMeshSettings && hasShape(id)) {
        var spid = shapePageId(id);
        tabItems.push({ id: 'shape', label: 'Shapes', content: h('div', { class: 'editor-tab-flow' }, buildShapePickers(spid), buildPlacementPanel(spid)) });
      }
      tabItems.push({ id: 'seo', label: 'Search & sharing', content: h('div', { class: 'editor-tab-flow' }, buildPageSeoPanel(id, manifest.title)) });
      tabItems.push({ id: 'code', label: 'Advanced', content: buildCodePanel(id, manifest) });
      var open = tabItems.some(function (t) { return t.id === tabFor['page:' + id]; }) ? tabFor['page:' + id] : 'content';
      root.appendChild(A.arkTabs({ label: manifest.title + ' editor sections', items: tabItems, value: open, className: 'page-editor-tabs',
        onChange: function (tab) { tabFor['page:' + id] = tab; } }));
      if (manifest.group === 'theory') {
        root.appendChild(h('div', { class: 'danger-zone' },
          h('button', { type: 'button', class: 'btn danger', text: 'Delete this page', onclick: function () { deleteItem('page', id); } })));
      }
    });
    refreshSaveButton();
    return container;
  }

  /* THE Save button: one, in the header (#save), for every view. It calls saveEverything()
     (every dirty draft, not just what is on screen), so it enables whenever ANY of the drafts is
     dirty -- a dirty theme while looking at a clean page must not leave the one save action
     looking disabled. */
  function refreshSaveButton() {
    var button = $('save'); if (!button) return;
    /* how much is waiting, on the button itself (cms.md P1-16): a count, and in its title what it is */
    var unsaved = A.unsavedSummary ? A.unsavedSummary() : { count: anyDirty() ? 1 : 0, words: '' };
    var label = button.querySelector('.save-label') || button;
    if (label === button) { var word = button.textContent.trim(); button.textContent = ''; label = h('span', { class: 'save-label', text: word }); button.appendChild(label); }
    var badge = button.querySelector('.save-count');
    if (unsaved.count && unsaved.words) {
      if (!badge) { badge = h('span', { class: 'save-count', 'aria-hidden': 'true' }); button.appendChild(badge); }
      badge.textContent = String(unsaved.count);
      button.setAttribute('aria-label', 'Save ' + unsaved.words);
      button.dataset.baseTitle = 'Save ' + unsaved.words + ' (Ctrl/Cmd+S)';
    } else {
      if (badge) badge.remove();
      button.removeAttribute('aria-label');
      button.dataset.baseTitle = 'Save every unsaved change (Ctrl/Cmd+S)';
    }
    refuse($('save'), anyDirty() ? '' : NOTHING_TO_SAVE);
  }
  if ($('save')) $('save').addEventListener('click', function () { saveEverything(); });

  /* touch(opts): update everything that depends on "is it dirty" without rebuilding any form --
     the Save button, every panel's Revert, every list row's dot -- and send the drafts to the
     canvas (unless opts.canvas === false: the edit came from the canvas). */
  function touch(opts) {
    opts = opts || {};
    refreshSaveButton();
    refreshRevertButtons(document);
    mounted.forEach(function (r) { if (!r.container.isConnected) refreshRevertButtons(r.container); });
    refreshDots(document);
    emit(opts.kind || state.kind, opts.id, 'edit');
    if (opts.canvas !== false) notifyPreviewState();
  }

  /* ---- Revert ------------------------------------------------------------------------------ */
  /* revertItem(kind, id): the item's draft goes back to its saved copy. A page's Revert also
     re-reads the mesh, theme, settings-defaults and SEO drafts from their loaded modules, as it
     always has. */
  function revertItem(kind, id) {
    if (kind === 'article') { revertArticle(id); return; }
    if (kind === 'asset') { revertAsset(id); return; }
    if (kind === 'secret') { revertSecret(id); return; }
    if (kind === 'design') { revertDesign(); return; }
    if (kind !== 'page') return;
    if (window.ArkMeshSettings) state.meshDraft = ArkMeshSettings.get() || ArkMeshSettings.defaults();
    if (window.ArkTheme) state.themeDraft = ArkTheme.get() || ArkTheme.defaults();
    if (window.ArkSiteDefaults) state.settingsDefaultsDraft = ArkSiteDefaults.get() || ArkSiteDefaults.defaults();
    if (window.ArkSEO) state.seoDraft = ArkSEO.get() || ArkSEO.defaults();
    if (state.saved[id] === null || state.saved[id] === undefined) return;
    state.drafts[id] = JSON.parse(state.saved[id]);
    itemsChanged('page', id); touch({ kind: 'page', id: id }); status('Reverted to the saved version.', '');
  }
  /* the item state.kind names (the form last opened) -- for callers that only know "current" */
  function currentItem() {
    return state.kind === 'article' ? ['article', state.aCurrent] : state.kind === 'asset' ? ['asset', state.assetCurrent]
      : state.kind === 'secret' ? ['secret', state.secretCurrent] : state.kind === 'design' ? ['design', ''] : ['page', state.current];
  }
  function revertCurrent() { var c = currentItem(); revertItem(c[0], c[1]); }

  /* ---- New page ----------------------------------------------------------------------------- */
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
  /* createPage(id) -> { ok, id } | { ok: false, refusal }: a new theory page draft (written by
     the next Save), made current (state.kind 'page'); the status line says what happened. */
  function createPage(id, opts) {
    id = String(id || '').trim();
    var title = opts && opts.title ? String(opts.title).trim() : '';
    if (!/^[a-z][a-z0-9]*$/.test(id)) return refused(title ? 'The title "' + title + '" gives no address: it needs at least one letter (a-z). Add one, or set the address under Developer details.' : 'A page address is lowercase letters and digits, starting with a letter.');
    if (state.drafts[id]) return refused('There is already a page at /concept/' + id + ' (“' + (state.drafts[id].title || id) + '”). Change the title, or the address under Developer details.');
    state.ids.push(id); state.drafts[id] = blueprint(id); state.saved[id] = null;
    /* asked for by its title (rail.js, the New panel): the name every list shows and its heading */
    if (title) { state.drafts[id].title = title; state.drafts[id].fields.TITLE.value = title; }
    state.kind = 'page'; state.current = id;
    itemsChanged('page', id); touch({ kind: 'page', id: id });
    createdNotice('page', id);
    return { ok: true, id: id };
  }
  /* What a create says, in full and where it is read: the item by the name every surface shows,
     that it is a draft until Save, and Save as its button. It was the header's status line, cut
     to "New page. Edit it, th..." (docs/ux-audit/cms.md P0-1). */
  function createdNotice(kind, id) {
    var item = kind === 'page' ? state.drafts[id] : state.aDrafts[id], route = kind === 'page' ? item.route : '/learnings/' + id;
    recordCreate(kind, id);
    status((kind === 'page' ? 'New page ' : 'New article ') + route + ': not saved yet.', '');
    notice({ tone: 'success', key: 'created', title: (kind === 'page' ? 'New page' : 'New article') + ' “' + item.title + '” (' + route + ')',
      body: 'It is on the canvas and its fields are open. It is a draft until you Save: the site gets its file and its address then.',
      actions: [{ label: 'Save now', run: function () { saveEverything(); } }] });
  }
  /* Creating is a step of the one undo history (js/admin/history.js; docs/ux-audit/cms.md P1-5).
     Undo drops the new draft -- but only while it is still a draft: once Save has written its file
     it is part of the site, and Delete (which asks, and keeps a version) is how it leaves. Redo puts
     the same draft back where it was in the list. */
  var CURRENT = { page: 'current', article: 'aCurrent', asset: 'assetCurrent', secret: 'secretCurrent' };
  function dropUnsavedDraft(kind, id) {
    var k = ITEM_KINDS[kind];
    if (!k || !state[k.drafts][id] || state[k.saved][id] !== null) return false;
    var route = kind === 'page' ? state.drafts[id].route : kind === 'article' ? '/learnings/' + id : '';
    state[k.ids] = state[k.ids].filter(function (other) { return other !== id; });
    delete state[k.drafts][id]; delete state[k.saved][id];
    if (state[CURRENT[kind]] === id) state[CURRENT[kind]] = state[k.ids][0] || null;
    afterItemRemoved(kind, id, route);
    return true;
  }
  function putBackDraft(kind, id, copy, at) {
    var k = ITEM_KINDS[kind];
    if (!k || state[k.drafts][id]) return false;
    state[k.ids].splice(Math.min(at, state[k.ids].length), 0, id);
    state[k.drafts][id] = JSON.parse(JSON.stringify(copy)); state[k.saved][id] = null;
    state.kind = kind; state[CURRENT[kind]] = id;
    itemsChanged(kind, id); touch({ kind: kind, id: id });
    hook(kind === 'page' ? 'select' : kind === 'article' ? 'selectArticle' : 'selectAsset')(id);
    return true;
  }
  function recordCreate(kind, id) {
    var k = ITEM_KINDS[kind];
    if (!k || typeof A.historyAction !== 'function' || !state[k.drafts][id]) return;
    var copy = JSON.parse(JSON.stringify(state[k.drafts][id])), at = state[k.ids].indexOf(id);
    var name = copy.title || copy.label || id;
    A.historyAction({ label: 'creating the ' + k.noun.toLowerCase() + ' \u201c' + name + '\u201d',
      can: function (way) { return way === 'undo' && state[k.drafts][id] && state[k.saved][id] !== null ? '\u201c' + name + '\u201d has been saved, so the site has its file now. Use Delete to remove it (it asks first, and keeps a version).' : ''; },
      undo: function () { return dropUnsavedDraft(kind, id); },
      redo: function () { return putBackDraft(kind, id, copy, at); } });
  }
  function refused(message) { status(message, 'error'); document.dispatchEvent(new CustomEvent('ark-cms-create-refused', { detail: { refusal: message } })); return { ok: false, refusal: message }; }
  /* The New page / New article / New image / New encrypted item forms: wherever the shell (or a
     panel) draws them, by id, a submit lands here -- delegated, so a form drawn after load works. */
  var CREATE_FORMS = {
    newForm: function () { var input = $('newId'), r = createPage(input.value, { title: newTitle() }); if (r.ok) { input.value = ''; landOn('page', r.id); } },
    newArticleForm: function () { var input = $('newSlug'), r = A.createArticle(input.value, { title: newTitle() }); if (r.ok) { input.value = ''; landOn('article', r.id); } }
  };
  /* A created page or article is where the person lands: on the canvas (the preview renders it
     from its draft, js/main.js) and in its own Page fields -- never Home's, which the header's
     Page fields opened while the canvas fell back to Home (docs/ux-audit/cms.md P0-1). */
  /* the title typed in the New panel (js/admin/rail.js), when the form came from there */
  function newTitle() { var t = $('newTitle'); return t ? t.value.trim() : ''; }
  function landOn(kind, id) {
    document.dispatchEvent(new CustomEvent('ark-cms-created', { detail: { kind: kind, id: id } }));
    hook(kind === 'page' ? 'select' : 'selectArticle')(id);
    hook('openPageFields')({ kind: kind, id: id });
  }
  document.addEventListener('submit', function (event) {
    var run = event.target && CREATE_FORMS[event.target.id];
    if (!run) return;
    event.preventDefault(); run(event);
  });

  /* ---- Delete ------------------------------------------------------------------------------- */
  /* deleteItem(kind, id): remove a page, article, image or encrypted item -- its file (with the
     project folder connected), its index entry, its entries in every other draft, the derived
     root files, and a version recording the removal. Asks first (window.confirm). */
  async function deleteItem(kind, id) {
    if (kind === 'article') return deleteArticle(id);
    if (kind === 'asset') return deleteAsset(id);
    if (kind === 'secret') return deleteSecret(id);
    if (kind === 'page') return deletePage(id);
    status('Nothing deleted: "' + kind + '" is not something Delete removes. Needs: page, article, asset or secret.', 'error');
  }
  /* The Delete question, worded once for every kind (docs/ux-audit/cms.md P2-11: native confirm -> Ark's
     AlertDialog): what goes, and whether it can be undone. A saved item's file is removed, but every earlier
     version still holds it (Versions); an item never saved has no file and no version, so it cannot come back. */
  function confirmDelete(noun, name, consequence, neverSaved) {
    return A.confirmDialog({ title: 'Delete the ' + noun + ' \u201c' + name + '\u201d?',
      message: consequence + '\n\n' + (neverSaved ? 'It has not been saved yet, so this cannot be undone.' : 'You can bring it back from Versions: restore a version from before this delete.'),
      confirmLabel: 'Delete ' + noun, cancelLabel: 'Keep it', tone: 'danger' });
  }
  async function deletePage(id) {
    var manifest = state.drafts[id];
    if (!manifest) { status('Nothing deleted: there is no page "' + id + '".', 'error'); return; }
    if (!state.dir && state.saved[id] !== null) { status('Connect the project folder to delete a page: this removes its file.', 'warn'); return; }
    if (!(await confirmDelete('page', manifest.title, 'This removes its file and its link on the theory page.', state.saved[id] === null))) return;
    var routesBefore = studioRoutes().map(function (r) { return r.path; });
    try { await removeItemFile('page', id); }
    catch (error) { status(error.message, 'error'); return; }
    var forgot = await forgetDeleted('manifests', id, routesBefore);
    if (state.current === id) state.current = state.ids[0];
    afterItemRemoved('page', id, manifest.route);
    status('Deleted ' + manifest.title + '.' + forgot + await afterDelete(), 'ok');
    deletedNotice(manifest.title);
  }
  /* What a Delete says besides the status line: it is not undone with Ctrl+Z (the file is gone and
     the earlier versions keep it -- history.js says why), so the way back is in the notice, one click
     from the list of versions (docs/ux-audit/cms.md P1-5). */
  function deletedNotice(what) {
    notice({ tone: 'info', key: 'deleted', title: 'Deleted \u201c' + what + '\u201d',
      body: 'Its file is gone from the project. Every earlier version still holds it: open Versions and restore the one from before this delete to bring it back.',
      actions: A.versionsPanel ? [{ label: 'Open Versions', run: function () { A.versionsPanel.open(); } }] : [] });
  }
  /* After a removal: the forms and lists repaint, and the canvas -- if it was showing the route
     that went -- moves to Home before anything is posted to it (a page sent a site without
     itself remounts from nothing: tests/cms-preview-state-route.cjs). */
  function afterItemRemoved(kind, id, route) {
    if (route && state.cmsCurrentRoute === route) { state.cmsCurrentRoute = '/'; syncCmsPreview(); }
    itemsChanged(kind, id); touch({ kind: kind, id: id }); reloadPreview();
  }

  /* ---- the Code tab -------------------------------------------------------------------------- */
  function buildCodePanel(id, manifest) {
    var box = h('div', { class: 'editor-tab-flow code-panel' });
    var inspector = h('fieldset', {}, h('legend', { text: 'Page structure' }));
    var view = h('textarea', { class: 'code-view', readonly: true });
    /* a field is { label, kind, section, value }: its VALUE is what the outline shows (it showed
       "[object Object]" for every field until 2026-10-18) */
    function manifestOutline() {
      var lines = ['page#' + id + ' "' + manifest.title + '"'];
      lines.push('  route: ' + (manifest.route || '/'));
      lines.push('  group: ' + (manifest.group || 'page'));
      Object.keys(manifest.fields || {}).forEach(function (key) {
        var value = String((manifest.fields[key] || {}).value || '').replace(/\s+/g, ' ').trim();
        lines.push('  field[' + key + '] ' + (value ? '"' + value.slice(0, 96) + (value.length > 96 ? '...' : '') + '"' : '(empty)'));
      });
      return lines.join('\n');
    }
    /* the canvas's real DOM, when the canvas is showing this page */
    function domOutline() {
      var frame = $('cmsPreview');
      if (!frame || state.cmsPreviewRoute !== manifest.route) return 'The canvas is not showing ' + manifest.route + ' -- open this page on the canvas to inspect its structure.\n\n' + manifestOutline();
      var doc = null; try { doc = frame.contentDocument; } catch (e) { doc = null; }
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
    /* trims trailing spaces and runs of blank lines in every text field's value, through the one
       field write (it compared each field OBJECT to a string, so it cleaned nothing until
       2026-10-18; regression: tests/admin-content-panels.cjs) */
    function cleanTextFields() {
      Object.keys(manifest.fields || {}).forEach(function (key) {
        var f = manifest.fields[key];
        if (!f || typeof f.value !== 'string' || f.kind === 'link') return;
        var clean = f.value.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
        if (clean !== f.value) setItemField('page', id, key, clean);
      });
      view.value = manifestOutline();
    }
    view.value = manifestOutline();
    inspector.appendChild(h('p', { class: 'hint', text: 'Inspect the generated page structure or the manifest fields. Cleaning trims empty whitespace without deleting real sections.' }));
    inspector.appendChild(view);
    inspector.appendChild(h('div', { class: 'tools' },
      h('button', { type: 'button', class: 'btn', text: 'Inspect canvas divs', onclick: function () { view.value = domOutline(); } }),
      h('button', { type: 'button', class: 'btn', text: 'Show manifest fields', onclick: function () { view.value = manifestOutline(); } }),
      h('button', { type: 'button', class: 'btn', text: 'Clean text fields', onclick: cleanTextFields })));
    box.appendChild(inspector);
    return box;
  }


  A.provide({ boundField: boundField, contentChoices: contentChoices, contentLabel: contentLabel, refreshList: renderList, createPage: createPage, createdNotice: createdNotice, confirmDelete: confirmDelete, deletedNotice: deletedNotice, recordCreate: recordCreate, deleteItem: deleteItem, fieldValue: fieldValue,
      itemDirty: itemDirty, itemsChanged: itemsChanged, linkPickerEl: linkPickerEl,
      paintInto: paintInto, panelHead: panelHead, refreshSaveButton: refreshSaveButton,
      renderPageFields: renderPageFields, repaintPanels: repaintPanels,
      revertCurrent: revertCurrent, revertItem: revertItem, setItemField: setItemField,
      afterItemRemoved: afterItemRemoved, touch: touch });
})();

/* =====================================================================
   ADMIN EDITOR · ARTICLES (js/admin/articles.js)
   ---------------------------------------------------------------------
   Owns: the article (LearningContent) editor -- loading every body, the draft copies,
   its fields and questions, Revert, Delete, and the New article form.
   Must not: write files itself (saveEverything / removeItemFile, js/admin/save.js).
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, clone = A.clone, h = A.h, touch = A.touch, linkPickerEl = A.linkPickerEl, $ = A.$,
      revertCurrent = A.revertCurrent, renderEditor = A.renderEditor, deleteCurrent = A.deleteCurrent,
      renderList = A.renderList, status = A.status, removeItemFile = A.removeItemFile,
      forgetDeleted = A.forgetDeleted, afterDelete = A.afterDelete, selectArticle = A.selectArticle;
  /* defined by files loaded after this one: resolved when called */
  var studioRoutes = A.later('studioRoutes'), reloadPreview = A.later('reloadPreview');

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
     entry point calls. See saveEverything() (js/admin/save.js) for the article branch. */

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
  A.provide({ adoptArticles: adoptArticles, articleCopy: articleCopy, articleList: articleList,
      deleteArticle: deleteArticle, loadBodies: loadBodies, renderArticleEditor: renderArticleEditor,
      revertArticle: revertArticle });
})();

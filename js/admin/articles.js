/* =====================================================================
   ADMIN EDITOR · ARTICLES (js/admin/articles.js)
   ---------------------------------------------------------------------
   Owns: the article (LearningContent) form -- renderArticleFields(container, slug), drawn
   into whatever container the shell gives it -- loading every body, the draft copies, its
   fields and questions (each written through setItemField, js/admin/editor.js), Revert,
   Delete, and creating an article (createArticle).
   Must not: write files itself (saveEverything / removeItemFile, js/admin/save.js).
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, clone = A.clone, h = A.h, touch = A.touch, linkPickerEl = A.linkPickerEl,
      status = A.status, removeItemFile = A.removeItemFile, forgetDeleted = A.forgetDeleted,
      afterDelete = A.afterDelete, setItemField = A.setItemField, boundField = A.boundField,
      paintInto = A.paintInto, panelHead = A.panelHead, repaintPanels = A.repaintPanels,
      itemsChanged = A.itemsChanged, afterItemRemoved = A.afterItemRemoved, deleteItem = A.deleteItem;
  /* defined by files loaded after this one: resolved when called */
  var studioRoutes = A.later('studioRoutes');

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

  /* one article property as a form row; the id (a-<slug>-<key>) is how a driver finds it */
  function articleField(article, key, label, kind) {
    return boundField('article', article.slug, key, label, { type: kind === 'text' ? 'textarea' : 'text', rows: 3, id: 'a-' + article.slug + '-' + key });
  }
  /* relatedPage/actionPage/evidenceHref are link data in spirit (a page key, a page key, a
     reference-doc path) even though LearningContent is not ArkManifest, so they get the same
     tagged route:/doc: picker -- see linkPickerEl (js/admin/editor.js) and
     LearningContent.problems()'s matching tag check. */
  function articleLinkField(article, key, label) {
    return linkPickerEl(label, 'a-' + article.slug + '-' + key, article[key], function (v) { setItemField('article', article.slug, key, v); }, null, 'article:' + article.slug + ':' + key);
  }
  function partField(article, si, pi) {
    return boundField('article', article.slug, 'sections.' + si + '.' + pi, pi === 0 ? 'Heading' : 'Paragraph ' + pi,
      { type: pi === 0 ? 'text' : 'textarea', rows: 4, id: 'a-' + article.slug + '-s' + si + '-p' + pi });
  }
  function questionField(article, si) {
    return boundField('article', article.slug, 'questions.' + si, 'Question / layer ' + (si + 2), { type: 'text', id: 'a-' + article.slug + '-s' + si + '-question' });
  }
  /* a structural edit (a section or paragraph added or removed): the draft changes, every form
     showing this article is redrawn */
  function restructure(slug, change) { change(); touch({ kind: 'article', id: slug }); repaintPanels('article', slug); }

  /* renderArticleFields(container, slug): every field of one article -- the card, layer 1, the
     editorial evidence and next move (all required before a new article saves:
     LearningContent.problems), each section with its question, the numbers table switch --
     with Revert and Delete. Returns the container. */
  function renderArticleFields(container, slug) {
    var record = { kind: 'article', id: slug, repaint: function () { renderArticleFields(container, slug); } };
    paintInto(container, record, function (root) {
      root.classList.add('cms-form');
      var a = state.aDrafts[slug];
      if (!a) { root.appendChild(h('p', { class: 'empty-state', text: slug ? 'There is no article "' + slug + '" any more (deleted, or never created). Pick an article in the Pages tab.' : 'Pick an article in the Pages tab.' })); return; }
      root.appendChild(panelHead(a.title || slug, '/learnings/' + slug + '  ·  js/content/articles/' + slug + '.js', 'article', slug));

      var card = h('fieldset', {}, h('legend', { text: 'Card' }));
      card.appendChild(articleField(a, 'title', 'Title', 'line'));
      card.appendChild(articleField(a, 'category', 'Category', 'line'));
      card.appendChild(articleField(a, 'minutes', 'Reading time', 'line'));
      card.appendChild(articleField(a, 'summary', 'Summary', 'text'));
      root.appendChild(card);

      var primary = h('fieldset', {}, h('legend', { text: 'Layer 1 / the core' }));
      primary.appendChild(articleField(a, 'core', 'Primary summary', 'text'));
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
          h('button', { type: 'button', class: 'btn', text: 'Add a paragraph', onclick: function () { restructure(slug, function () { section.push('New paragraph.'); }); } }),
          h('button', { type: 'button', class: 'btn', text: 'Remove the last paragraph', disabled: section.length <= 2, onclick: function () { restructure(slug, function () { section.pop(); }); } }),
          h('button', { type: 'button', class: 'btn', text: 'Remove this section', disabled: a.sections.length <= 1, onclick: function () { restructure(slug, function () { a.sections.splice(si, 1); if (a.questions) a.questions.splice(si, 1); }); } })));
        root.appendChild(box);
      });
      root.appendChild(h('div', { class: 'tools' },
        h('button', { type: 'button', class: 'btn', text: 'Add a section', onclick: function () { restructure(slug, function () { a.sections.push(['New section.', 'Write the first paragraph.']); if (a.questions) a.questions.push('What does this section explain?'); }); } })));

      var numbersId = 'a-' + slug + '-numbers';
      var box = h('input', { id: numbersId, type: 'checkbox', 'data-cms-field': 'article:' + slug + ':numbers' });
      box.checked = a.numbers;
      box.addEventListener('change', function () { setItemField('article', slug, 'numbers', box.checked); });
      root.appendChild(h('label', { class: 'check', for: numbersId }, box, h('span', { text: 'Show the table of starting values after the last section' })));

      root.appendChild(h('div', { class: 'danger-zone' },
        h('button', { type: 'button', class: 'btn danger', text: 'Delete this article', disabled: state.slugs.length <= 1, title: state.slugs.length <= 1 ? 'Keep at least one article: the site links each note to the next.' : '', onclick: function () { deleteItem('article', slug); } })));
    });
    return container;
  }

  /* the index, in reading order: saved articles only, so an unsaved draft never leaks into another article's save */
  function articleList(current) {
    return state.slugs.filter(function (s) { return s === current.slug || state.aSaved[s] !== null; })
      .map(function (s) { return s === current.slug ? current : JSON.parse(state.aSaved[s]); });
  }

  function revertArticle(slug) {
    if (slug === undefined) slug = state.aCurrent;
    if (state.aSaved[slug] === null || state.aSaved[slug] === undefined) return;
    state.aDrafts[slug] = JSON.parse(state.aSaved[slug]);
    itemsChanged('article', slug); touch({ kind: 'article', id: slug }); status('Reverted to the saved version.', '');
  }

  /* Step 5: the old single-article saveArticleCurrent() is deleted -- its exact logic (same
     validation, same connected-project-or-download split, same state.aSaved/LearningContent
     update) now lives inside saveEverything()'s articles loop, the one function every Save
     entry point calls. See saveEverything() (js/admin/save.js) for the article branch. */

  async function deleteArticle(slug) {
    if (slug === undefined) slug = state.aCurrent;
    var a = state.aDrafts[slug];
    if (!a) { status('Nothing deleted: there is no article "' + slug + '".', 'error'); return; }
    if (state.slugs.length <= 1) { status('Keep at least one article: the site links each note to the next.', 'warn'); return; }
    if (!state.cdirs && state.aSaved[slug] !== null) { status('Connect the project folder to delete an article: this removes its file.', 'warn'); return; }
    if (!window.confirm('Delete "' + a.title + '"? This removes its file and its card on the Learnings page.')) return;
    var routesBefore = studioRoutes().map(function (r) { return r.path; });
    try { await removeItemFile('article', slug); }
    catch (error) { status(error.message, 'error'); return; }
    var forgot = await forgetDeleted('articles', slug, routesBefore);
    if (state.aCurrent === slug) state.aCurrent = state.slugs[0];
    afterItemRemoved('article', slug, '/learnings/' + slug);
    status('Deleted ' + a.title + '.' + forgot + await afterDelete(), 'ok');
  }

  function articleBlueprint(slug) {
    return { slug: slug, title: 'New note', category: 'NOTES / ' + String(state.slugs.length + 1).padStart(3, '0'), minutes: '3 MIN READ',
             summary: 'Say what this note is about.', core: 'State the central idea clearly.', questions: ['What does this note explain?'],
             relevance: '', reviewed: '', evidenceLabel: '', evidenceHref: '', relatedPage: '', actionLabel: '', actionPage: '',
             sections: [['First heading', 'Write the first paragraph.']], numbers: false };
  }
  /* createArticle(slug) -> { ok, id } | { ok: false, refusal }: a new article draft (written by
     the next Save, which refuses it until its editorial fields are filled), made current. */
  function createArticle(slug) {
    slug = String(slug || '').trim();
    var refusal = !/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(slug) ? 'An article name is lowercase words joined by hyphens, starting with a letter.'
      : state.aDrafts[slug] ? 'There is already an article called ' + slug + '.' : '';
    if (refusal) { status(refusal, 'error'); return { ok: false, refusal: refusal }; }
    state.slugs.push(slug); state.aDrafts[slug] = articleBlueprint(slug); state.aSaved[slug] = null;
    state.kind = 'article'; state.aCurrent = slug;
    itemsChanged('article', slug); touch({ kind: 'article', id: slug });
    status('New article. Edit it, then Save to create it.', '');
    return { ok: true, id: slug };
  }
  A.provide({ adoptArticles: adoptArticles, articleCopy: articleCopy, articleList: articleList,
      createArticle: createArticle, deleteArticle: deleteArticle, loadBodies: loadBodies,
      renderArticleFields: renderArticleFields, revertArticle: revertArticle });
})();

/* =====================================================================
   A NOTE (/learnings/<slug>): one article on the story template (js/pages/story.js).
   ---------------------------------------------------------------------
   The old reader (js/resolvers/learnings.js, retired 2026-10-19, W3-LEARN) set its h1 and body in
   uppercase mono, replaced the question list with an empty panel for a second before an answer
   appeared, showed the answer view's tabs as bare numbers "00-11", drew a third disclosure look
   for its evidence, and ran 1.65-1.76 screens on a phone (docs/ux-audit/pages-ux-a.md
   /learnings/*). It is the story template now, so a note reads like every other guided page:

     breadcrumb   Home / Notes / this note
     hero         "Notes · n of 7", the title, and the note's record as details: its series,
                  its read time (derived from the words, LearningContent.readTime) and its
                  review date
     The idea     the core answer (the one depth control: The idea · How it works · Evidence)
     How it works the questions, as Ark's accordion -- the table of contents: each row is its
                  question, numbered by its place; opening one shows that section (its heading,
                  then its paragraphs), addressed as ?view=context&q=<n>. The old ?q=<n>
                  addresses still open their question. A list longer than LONG_TOC rows shows
                  its first half on a phone and folds the rest behind "Questions n-m" (Ark's
                  disclosure): eleven rows put the view at 1.91 screens at 390x844.
     Evidence     the editorial review date and the evidence document (Ark's facts; the doc link
                  resolves through the one link resolver), and the starting-values table where
                  the note has one
     callout      "When this was written": the dated-history note W1-CONTENT added, in sight on
                  every view beside the questions wider than 900px (boundaryAside), a press
                  away on a phone
     pager        the previous and next note in reading order, the related mechanism, the
                  note's own next step, and all notes

   The words are LearningContent's (js/content/articles/<slug>.js); this file holds none but the
   labels of the frame. Regression: tests/learnings-blocks.cjs. */
(function () {
  'use strict';

  function pad(n) { return String(n).padStart(2, '0'); }
  /* How many question rows stay in sight on a phone: all of them up to LONG_TOC, else the first
     half (measured 2026-10-19 at 390x844: 8 rows put How it works at 1.62-1.66 screens with the
     hero and pager, 11 rows at 1.86-1.91). */
  var LONG_TOC = 6;
  function shown(n) { return n > LONG_TOC ? Math.ceil(n / 2) : n; }
  function name(key) {
    var entry = ArkUI.pageCatalog && ArkUI.pageCatalog[key];
    return key === 'zero' ? 'Home' : entry ? String(entry.short || entry.title || key).split(' — ')[0] : key;
  }

  /* The table a note with `numbers: true` ends with (it was the reader's own, inline). */
  var STARTING_VALUES = {
    caption: 'The current starting values',
    columns: [{ key: 'choice', label: 'Choice' }, { key: 'value', label: 'Value' }, { key: 'meaning', label: 'What it means' }],
    rows: [
      { choice: 'Particle budget', value: '6,000–24,000', meaning: 'The number of sampled points, selected by screen size and hardware signal.' },
      { choice: 'Ribbons', value: '3 / 72 filaments', meaning: 'Three bands, each built from 24 continuous paths.' },
      { choice: 'Dissolution', value: '0% → 50%', meaning: 'Whole at home; partly dispersed in the experiment.' },
      { choice: 'Mesh transition', value: '1.8 seconds', meaning: 'Time to travel to the new target shape.' },
      { choice: 'Turn / tilt', value: '±180° / ±90°', meaning: 'Viewing angle around the form.' },
      { choice: 'Title preview', value: 'Up to 72 characters', meaning: 'The text used to generate the point addresses.' }
    ]
  };

  /* `was`: the layout keys of the hand-built reader, by block id -- the same shape for every note,
     so they are written from the structure the old reader built (header, question nav, sections,
     controls, exits, evidence), not pasted per note. Frozen censuses: tests/fixtures/layout-keys/
     learnings-<slug>.tsv; reasons in tests/learnings-blocks.cjs. */
  /* a field a note has filled in -- the one rule both the page and its pins use, so a pin never
     names an element the page did not draw (a new draft has no review date, evidence, related
     page or action yet) */
  function filled(value) { return typeof value === 'string' && value.trim() !== ''; }
  function relatedLinks(article) {
    var out = [];
    if (filled(article.relatedPage)) out.push('related');
    if (filled(article.actionPage) && filled(article.actionLabel) && (article.actionPage !== article.relatedPage || article.actionLabel)) out.push('action');
    out.push('all');
    return out;
  }
  function was(article) {
    var n = article.sections.length, out = {}, i, p;
    var item = function (k) { return '[data-ark-part="accordion-item"]:nth-of-type(' + k + ') [data-ark-part="accordion-content"] p:nth-of-type('; };
    out['article-hero'] = { ':root': { key: 'page:/header:1', self: true }, 'hero-title': 'page:/header:1/h1:1',
      'hero-meta': { key: 'page:/header:1/div:1', self: true }, '[data-ark-part="hero-meta"] > div:nth-of-type(1) > dd': 'page:/header:1/div:1/span:1' };
    out['article-body'] = { ':root': { key: 'page:/div:1', self: true }, '.story-main': { key: 'page:/div:1/div:1', self: true } };
    out['article-depth'] = { ':root': { key: 'page:/div:1/div:1/div:1', self: true }, 'tabs-trigger': 'page:/div:1/div:1/div:1/button:1', 'tabs-trigger#2': 'page:/div:1/div:1/div:1/button:2',
      'tabs-content': { key: 'page:/header:1/div:2', self: true },
      '[data-ark-part="tabs-content"] p': 'page:/header:1/div:2/p:1', 'eyebrow': 'page:/div:1/nav:1/p:1', 'eyebrow#2': 'page:/div:1/details:1/summary:1' };
    if (filled(article.relevance)) out['article-status'] = { 'alert-description': 'page:/header:1/div:2/p:2' };
    out['article-questions'] = { ':root': { key: 'page:/div:1/nav:1', self: true } };
    if (shown(n) < n) out['article-questions-rest'] = {};
    for (i = 0; i < n; i++) {
      /* row i is row j of its accordion: the first half's, or the folded rest's */
      var at = i < shown(n) ? out['article-questions'] : out['article-questions-rest'], j = i < shown(n) ? i : i - shown(n);
      var k = j ? '#' + (j + 1) : '', row = '[data-ark-part="accordion-item"]:nth-of-type(' + (j + 1) + ') ';
      at['accordion-trigger' + k] = 'page:/div:1/nav:1/button:' + (i + 2);
      /* the row's label (number · question) takes the question's key; its chevron, the row's marker, the number's */
      at[row + '[data-ark-part="accordion-trigger"] > .ark-accordion__title'] = 'page:/div:1/nav:1/button:' + (i + 2) + '/span:2';
      at[row + '[data-ark-part="accordion-trigger"] > .ark-accordion__icon'] = 'page:/div:1/nav:1/button:' + (i + 2) + '/span:1';
      at['accordion-content' + k] = { key: 'id:' + article.slug + '-section-' + i, self: true };
      at[item(j + 1) + '1)'] = 'page:/div:1/div:1/section:' + (i + 1) + '/h2:1';
      for (p = 1; p < article.sections[i].length; p++) at[item(j + 1) + (p + 1) + ')'] = 'page:/div:1/div:1/section:' + (i + 1) + '/p:' + p;
    }
    if (article.numbers) out['article-table'] = { ':root': { key: 'page:/div:1/div:1/section:' + n + '/div:1', self: true }, 'table': 'page:/div:1/div:1/section:' + n + '/div:1/table:1' };
    out['article-evidence'] = { ':root': { key: 'page:/div:1/details:1', self: true }, 'fact': 'page:/div:1/details:1/p:1' };
    if (filled(article.evidenceLabel) && filled(article.evidenceHref)) out['article-evidence']['fact-value#2'] = 'page:/div:1/details:1/a:1';
    out['article-pager'] = { ':root': { key: 'page:/div:1/nav:2', self: true } };
    var oldKey = { related: 'page:/div:1/nav:2/a:1', action: 'page:/div:1/nav:2/a:2', all: 'page:/header:1/div:1/a:1' };
    relatedLinks(article).forEach(function (link, at) { out['article-pager']['[data-ark-part="pager-related"] li:nth-of-type(' + (at + 1) + ') > a'] = oldKey[link]; });
    out.insert = 'page:/div:2';
    return out;
  }

  ArkUI.pageModules.article = {
    startingValues: STARTING_VALUES,
    was: was,
    shown: shown,
    mount: function (host, page) {
      var slug = page.slice(8), article = LearningContent.find(slug);
      var articles = LearningContent.articles, index = articles.indexOf(article), total = articles.length;
      var previous = index > 0 ? articles[index - 1] : null, next = articles[(index + 1) % total];
      var questions = article.questions || article.sections.map(function (section) { return section[0]; });
      var path = ArkUI.pageCatalog[page] ? ArkUI.pageCatalog[page].path : '/learnings/' + slug;
      var pins = was(article);
      var step = -1;

      /* How it works: one accordion row per question; its content is the section (heading first,
         then its paragraphs); the last row also carries the starting-values table. */
      var rows = article.sections.map(function (section, i) {
        var row = { value: 'q' + (i + 1), title: pad(i + 1) + ' · ' + questions[i], content: section.join('\n\n') };
        if (article.numbers && i === article.sections.length - 1) row.blocks = [{ block: 'table', id: 'article-table', was: pins['article-table'], props: STARTING_VALUES }];
        return row;
      });
      var evidence = [
        { block: 'eyebrow', props: { text: 'Evidence & editorial review' } },
        { block: 'facts', id: 'article-evidence', was: pins['article-evidence'], props: { label: 'Evidence & editorial review', columns: 1, items: [
          /* a draft that is not yet reviewed or linked says so -- never a blank value (refused) or a made-up one */
          { term: 'Editorial review', value: filled(article.reviewed) ? article.reviewed + '. This is not live capability verification.' : 'Not reviewed yet.' },
          filled(article.evidenceLabel) && filled(article.evidenceHref) ? { term: 'Evidence', value: article.evidenceLabel, href: article.evidenceHref } : { term: 'Evidence', value: 'No evidence linked yet.' }
        ] } }
      ];
      /* The table of contents: one accordion, or -- longer than LONG_TOC -- its first half and
         the rest folded on a phone (every row shows from 601px up). */
      function questionBlocks() {
        var k = shown(rows.length), list = [{ block: 'eyebrow', props: { text: 'Questions / ' + pad(rows.length) } },
          { block: 'accordion', id: 'article-questions', was: pins['article-questions'], props: { label: 'Questions', items: rows.slice(0, k), multiple: false, headingLevel: 2 } }];
        if (k < rows.length) list.push({ block: 'disclosure', id: 'article-questions-more', props: { foldBelow: 'phone',
          more: 'Questions ' + pad(k + 1) + '\u2013' + pad(rows.length), less: 'Hide questions ' + pad(k + 1) + '\u2013' + pad(rows.length),
          blocks: [{ block: 'accordion', id: 'article-questions-rest', was: pins['article-questions-rest'], props: { label: 'Questions ' + (k + 1) + ' to ' + rows.length, items: rows.slice(k), multiple: false, headingLevel: 2 } }] } });
        return list;
      }
      /* onward links only where the note names them: a new draft has no related page or action yet */
      var related = relatedLinks(article).map(function (link) {
        return link === 'related' ? { label: 'Related mechanism: ' + name(article.relatedPage.replace(/^route:/, '')), href: article.relatedPage }
          : link === 'action' ? { label: article.actionLabel, href: article.actionPage } : { label: 'All notes', href: 'route:learnings' };
      });

      var def = {
        page: page, id: 'article', className: 'article-story', titleId: 'article-title', was: pins, insertWas: pins.insert,
        crumbs: [{ label: 'Home', href: 'route:zero' }, { label: 'Notes', href: 'route:learnings' }, { label: article.title }],
        eyebrow: ArkUI.story.position('Notes', index, total),
        title: article.title,
        /* a fact with no value is left out, never shown blank: a new note has no review date until it is
           reviewed, and an empty meta value is a refused hero -- the whole page failed to mount, so the
           editor's canvas could not show a brand-new article (regression: tests/article-draft-mounts.cjs) */
        meta: [{ label: 'Series', value: article.category }, { label: 'Read time', value: String(LearningContent.readTime(article)).toLowerCase() }, { label: 'Reviewed', value: article.reviewed }]
          .filter(function (fact) { return typeof fact.value === 'string' && fact.value.trim(); }),
        depth: {
          focus: { text: article.core || article.summary },
          context: { blocks: questionBlocks() },
          reference: { blocks: evidence }
        },
        /* the dated-history note only when the note has one: a new draft's relevance is empty, and a
           callout with no body is refused (same regression as the empty Reviewed fact above) */
        boundary: article.relevance && String(article.relevance).trim() ? { tone: 'info', title: 'When this was written', body: article.relevance, actions: [{ label: 'What is a resolver', href: 'route:resolver' }] } : null,
        boundaryFold: 'phone', boundaryMore: 'When this was written', boundaryLess: 'Hide the note', boundaryAside: true,
        /* no summaries: "Previous note" / "Next note" only repeated the pager's own direction labels */
        pager: { label: 'Continue reading', relatedLabel: 'Continue from this note',
          prev: previous ? { label: previous.title, href: 'route:article/' + previous.slug } : { label: 'Notes from the work', href: 'route:learnings' },
          next: { label: next.title, href: 'route:article/' + next.slug },
          related: related },
        /* ?view=context&q=<n> opens question n; the idea's address is bare; ?q=<n> alone (the old
           reader's address) still opens its question. */
        query: function (view) { return view === 'focus' ? '' : view === 'context' && step >= 0 ? 'view=context&q=' + (step + 1) : 'view=' + view; },
        onRestore: function (params) { var q = Number(params.get('q')); if (q >= 1 && q <= rows.length) open(q - 1, true); },
        onView: function (view) { announce(view === 'context' ? step : -1); }
      };
      var el = ArkUI.story.mount(def, host);
      var triggers = Array.prototype.slice.call(el.querySelectorAll('#article-questions [data-ark-part="accordion-trigger"], #article-questions-rest [data-ark-part="accordion-trigger"]'));
      var fold = el.querySelector('#article-questions-more [data-ark-part="disclosure-trigger"]');
      /* one row open at a time across both halves (each accordion keeps its own to one) */
      function closeOthers(i) {
        triggers.forEach(function (t, j) { if (j !== i && t.getAttribute('aria-expanded') === 'true' && t.closest('[data-ark-block="accordion"]') !== triggers[i].closest('[data-ark-block="accordion"]')) t.click(); });
      }

      /* js/lattice.js draws the reading progress of a note from this event. */
      function announce(i) {
        if (typeof CustomEvent === 'undefined' || typeof window === 'undefined') return;
        window.dispatchEvent(new CustomEvent('article:choice', { detail: { index: i, total: rows.length } }));
      }
      /* Open question `i` through the accordion (never by hand), in the How it works view. */
      function open(i, quiet) {
        step = i;
        if (el.story.view() !== 'context') el.story.select('context', { quiet: true });
        if (fold && i >= shown(rows.length) && fold.getAttribute('aria-expanded') !== 'true') fold.click();
        if (triggers[i] && triggers[i].getAttribute('aria-expanded') !== 'true') triggers[i].click();
        announce(i);
        if (!quiet && ArkUI.route) ArkUI.route.write(path, 'view=context&q=' + (i + 1), 'push');
      }
      triggers.forEach(function (trigger, i) {
        trigger.addEventListener('click', function () {
          if (trigger.getAttribute('aria-expanded') !== 'true') return;
          closeOthers(i);
          step = i; announce(i);
          if (ArkUI.route) ArkUI.route.write(path, 'view=context&q=' + (i + 1), 'push');
        });
      });
      var initial = el.story.params();
      var asked = initial ? Number(initial.get('q')) : 0;
      if (asked >= 1 && asked <= rows.length) open(asked - 1, true);
      return el;
    }
  };
})();

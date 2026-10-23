/* =====================================================================
   THE NOTES INDEX (/learnings): one card per note, as Ark blocks.
   ---------------------------------------------------------------------
   The section is called Notes everywhere -- the menu and footer (js/content/site-pages.js), the
   breadcrumb, the corner link and this page (the URL stays /learnings so every address keeps
   working). It had four names: "learnings", "Notes", "TUTORIALS", "ALL LEARNINGS"
   (docs/ux-audit/pages-ux-a.md /learnings P1).

   Each card is the index entry LearningContent carries: title, excerpt (its summary), its series
   label, and the read time and review date, which are derived from the body and written onto the
   index by LearningContent.serializeIndex (js/content/learnings.js) -- never typed here. On a
   phone the first three cards are in sight and the rest a press away (Ark's disclosure,
   foldBelow 'phone'); from 601px up every card shows. Regression: tests/learnings-blocks.cjs. */
(function () {
  'use strict';

  var IN_SIGHT = 3;

  function pad(n) { return String(n).padStart(2, '0'); }

  /* The card's footer: "6 min read · Reviewed 2026-10-08". */
  function meta(article) {
    var parts = [String(article.minutes || '').toLowerCase()];
    if (article.reviewed) parts.push('Reviewed ' + article.reviewed);
    return parts.filter(Boolean).join(' · ');
  }
  function card(article) {
    return { eyebrow: article.category, title: article.title, description: article.summary, href: 'route:article/' + article.slug, meta: meta(article), headingLevel: 2 };
  }
  function grid(label, list) { return { block: 'card-grid', props: { label: label, columns: 3, alignRows: true, items: list.map(card) } }; }

  /* `was`: the layout keys of the hand-built index (tests/fixtures/layout-keys/learnings.tsv),
     derived by tests/lib/layout-continuity.cjs, never typed. */
  var WAS = {
    'learnings-hero': { ':root': { key: 'page:/div:1', self: true }, 'eyebrow': 'page:/div:1/p:1', 'hero-title': 'page:/div:1/h1:1', 'hero-lede': 'page:/div:1/p:2' },
    insert: 'page:/div:2'
  };
  /* the old list and its rows: the first three cards, then the folded rest */
  function cardsWas(from, to) {
    var was = {};
    for (var i = from; i < to; i++) {
      var k = i > from ? '#' + (i - from + 1) : '';
      was['card' + k] = { key: 'page:/div:1/ol:1/li:' + (i + 1), self: true };
      was['card-title' + k] = 'page:/div:1/ol:1/li:' + (i + 1) + '/a:1/h2:1';
      was['li:nth-of-type(' + (i - from + 1) + ') [data-ark-part="card-title"] > a'] = 'page:/div:1/ol:1/li:' + (i + 1) + '/a:1';
      /* the card's own arrow takes the hand-drawn arrow's key, so nothing inherits the row number's */
      was['li:nth-of-type(' + (i - from + 1) + ') [data-ark-part="card-title"] > a > span'] = 'page:/div:1/ol:1/li:' + (i + 1) + '/a:1/span:3';
      was['card-footer' + k] = 'page:/div:1/ol:1/li:' + (i + 1) + '/a:1/span:2';
      was['card-description' + k] = 'page:/div:1/ol:1/li:' + (i + 1) + '/p:1';
    }
    return was;
  }

  function spec() {
    var articles = LearningContent.articles;
    var list = [
      { block: 'breadcrumb', id: 'learnings-crumbs', props: { label: 'Your place', items: [{ label: 'Home', href: 'route:zero' }, { label: 'Notes' }] } },
      { block: 'hero', id: 'learnings-hero', was: WAS['learnings-hero'], props: { eyebrow: 'Notes / ' + pad(articles.length), title: 'Notes from the work.', density: 'compact',
        /* the cards are statements, not questions, so the lede does not say "Choose a question" (first-visit audit 2026-10-22, P2);
           the count is the index's own */
        lede: articles.length + ' notes from building DEFXN. Open one for its answer and its evidence.' } },
      { block: 'card-grid', id: 'learnings-notes', was: Object.assign({ ':root': { key: 'page:/div:1/ol:1', self: true } }, cardsWas(0, Math.min(IN_SIGHT, articles.length))),
        props: grid('Notes', articles.slice(0, IN_SIGHT)).props }
    ];
    if (articles.length > IN_SIGHT) {
      var rest = articles.slice(IN_SIGHT);
      list.push({ block: 'disclosure', id: 'learnings-more', props: { foldBelow: 'phone', more: 'Show the other ' + rest.length + ' notes', less: 'Show fewer notes',
        blocks: [Object.assign({ id: 'learnings-notes-more', was: cardsWas(IN_SIGHT, articles.length) }, grid('More notes', rest))] } });
    }
    /* No pager: every card leads on, and a pager under seven cards put the index at 1.71 screens
       at 1440x900 (measured 2026-10-19, W3-LEARN). */
    list.push({ insert: 'main', was: WAS.insert });
    return list;
  }

  ArkUI.pageModules.learnings = {
    spec: spec,
    mount: function (host) {
      return ArkUI.page(spec(), host, { page: 'learnings', terms: 'first-use', className: 'learnings-page', titleId: 'learnings-title' });
    }
  };
})();

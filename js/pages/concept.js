/* =====================================================================
   /concept -- "The operating model": the index of the theory questions, built from Ark blocks.
   Two groups of questions behind Ark tabs (one ARIA model; it was a pair of aria-pressed buttons
   in the browser's Arial, docs/ux-audit/pages-ux-a.md /concept): start with a question, or
   inspect evidence and activation (?view=more, the address js/ark/panel-continuity.js returns to
   from a rail question). Each question is a card; the chosen card is the next page's visual
   origin (data-continuity-card). The evidence group also opens the resolver's own math:
   /resolver-math had no inbound link (docs/ux-audit/pages.md P2; tests/site-exits.cjs).
   Questions are DERIVED from the theory manifests (ArkManifest.group('theory'), placement
   row | rail): a question the editor adds appears here with no code change.
   Regression: tests/story-blocks.cjs. */
(function () {
  'use strict';
  /* "Evidence & activation": at 390px "Inspect evidence & activation" was cut to "Inspect evidence & activa" with nothing
     to show it scrolled (first-visit audit 2026-10-22, P2). */
  var GROUPS = [{ value: 'row', label: 'Start with a question' }, { value: 'more', label: 'Evidence & activation' }];
  /* `was`: the layout keys of the hand-built index, by block id (tests/lib/layout-continuity.cjs,
     census tests/fixtures/layout-keys/concept.tsv); never typed. */
  var WAS = {
   "concept-hero": {
    "hero-title": "id:concept-title",
    "hero-lede": "page:/p:1"
   },
   "concept-groups": {
    "tabs-list": "page:/nav:2",
    "card": "page:/div:1/article:1",
    "card#2": "page:/div:1/article:2",
    "card#3": "page:/div:1/article:3",
    "eyebrow": "page:/div:1/article:1/span:1",
    "card-title": "page:/div:1/article:1/a:1",
    "card-description": "page:/div:1/article:1/span:2",
    "eyebrow#2": "page:/div:1/article:2/span:1",
    "card-title#2": "page:/div:1/article:2/a:1",
    "card-description#2": "page:/div:1/article:2/span:2",
    "eyebrow#3": "page:/div:1/article:3/span:1",
    "card-title#3": "page:/div:1/article:3/a:1",
    "card-description#3": "page:/div:1/article:3/span:2",
    "tabs-content": {
     "key": "page:/div:1",
     "self": true
    }
   },
   "concept-crumbs": {
    ":root": {
     "key": "page:/nav:1",
     "self": true
    },
    "breadcrumb-item#2": "page:/nav:1/a:1"
   },
   "insert": {
    "key": "page:/div:2",
    "self": true
   }
  };

  ArkUI.pageModules.concept = { mount: function (host) {
    function cards(group) {
      var items = ArkManifest.group('theory').filter(function (m) { return (m.meta.placement === 'rail' ? 'more' : 'row') === group; }).map(function (m) {
        return { title: 'copy:' + m.id.toUpperCase() + '.TITLE', description: m.title + ' / open explanation', href: 'route:concept/' + m.id };
      });
      if (group === 'more') items.push({ title: 'The math behind a resolver', description: 'Resolver math / open the page', href: 'route:resolver-math' });
      return items.map(function (item, i) { item.eyebrow = String(i + 1).padStart(2, '0'); item.headingLevel = 2; return item; });
    }
    var view = ArkUI.story.initialView('concept', ['row', 'more'], 'row');
    var el = ArkUI.page([
      { block: 'breadcrumb', id: 'concept-crumbs', was: WAS['concept-crumbs'], props: { label: 'Your place', items: [{ label: 'Home', href: 'route:zero' }, { label: 'Overview', href: ArkCopy.text('CONCEPT.BACK.HREF') }, { label: 'Operating model' }] } },
      { block: 'hero', id: 'concept-hero', was: WAS['concept-hero'], props: { title: 'copy:CONCEPT.TITLE', lede: 'copy:CONCEPT.DECK', density: 'compact' } },
      { block: 'tabs', id: 'concept-groups', was: WAS['concept-groups'], props: { label: 'Question group', defaultValue: view, items: GROUPS.map(function (g) {
        return { value: g.value, label: g.label, blocks: [{ block: 'card-grid', props: { label: g.label, columns: 3, items: cards(g.value) } }] };
      }) } },
      { insert: 'main', was: WAS.insert }
    ], null, { page: 'concept', className: 'story-concept', titleId: 'concept-title', terms: 'first-use' });
    var groups = ArkUI.story.bindTabs(el, el.querySelector('#concept-groups'), { page: 'concept', values: ['row', 'more'], fallback: 'row' });
    /* The chosen card is the next page's visual origin. */
    Array.prototype.forEach.call(el.querySelectorAll('#concept-groups [data-ark-part="card"]'), function (card) {
      var link = card.querySelector('a[data-scene-link]');
      if (link) card.dataset.continuityCard = link.getAttribute('data-scene-link');
    });
    el.arkDispose = groups.dispose;
    host.appendChild(el);
    return el;
  } };
})();

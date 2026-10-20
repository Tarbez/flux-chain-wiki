/* The resolver guide pages, on the story template (js/pages/story.js):
     /what-is-a-resolver          (catalog 'resolver')    -> js/pages/resolver-lab.js builds its def
     /start-from-something-real   (catalog 'references')  -> referencesDef below

   Converted in DEFXN polish Wave 3 (W3-GUIDE). The guide was a fourth hand-built depth control
   ("Answer / Understand why / Evidence", square Arial buttons: docs/ux-audit/pages-ux-b.md
   /start-from-something-real P1) beside a figure that phones lost (display:none). It is the one
   template now: the depth control is The idea / How it works / Evidence, the figure folds behind
   "Show the illustration" below 900px, and the boundary stays in sight in every view. Words stay
   in the manifests (copy: keys); the layout keys of the old page are pinned (`WAS`, derived by
   tests/lib/layout-continuity.cjs from the frozen census). Regression: tests/resolver-guide-blocks.cjs. */
(function () {
  'use strict';

  /* `was`: the key each element of the hand-built guide had, by block id (story.js names its blocks
     '<page>-crumbs', '-hero', '-body', '-depth', '-boundary', '-figure', '-pager'), so a CMS edit
     saved against it still lands. Started from tests/lib/layout-continuity.cjs's derive against
     the frozen census (tests/fixtures/layout-keys/start-from-something-real.tsv); every reshaped
     and retired key is listed with its reason in tests/resolver-guide-blocks.cjs. */
  var WAS = { references: {
    'references-crumbs': { ':root': 'page:/nav:1', 'breadcrumb-item': 'page:/nav:1/a:1', 'breadcrumb-item#2': 'page:/nav:1/span:1' },
    'references-hero': { eyebrow: 'page:/p:1', 'hero-title': 'id:references-title' },
    'references-body': { ':root': { key: 'page:/div:1', self: true }, ':scope > div:nth-of-type(1)': { key: 'page:/div:1/div:1', self: true } },
    'references-depth': { 'tabs-list': { key: 'page:/nav:2', self: true }, 'tabs-trigger': 'page:/nav:2/button:1', 'tabs-trigger#2': 'page:/nav:2/button:2', 'tabs-trigger#3': 'page:/nav:2/button:3',
      'tabs-content': { key: 'page:/div:1/div:1/div:1', self: true }, ':scope > div:nth-of-type(2) > p:nth-of-type(1)': 'page:/div:1/div:1/div:1/p:1' },
    'references-boundary': { ':root': 'page:/div:1/div:1/aside:1', 'alert-title': 'page:/div:1/div:1/aside:1/strong:1', 'alert-description': 'page:/div:1/div:1/aside:1/p:1' },
    'references-figure': { 'figure': { key: 'page:/div:1/figure:1', self: true }, 'figure-caption': 'page:/div:1/figure:1/figcaption:1',
      '.story-drawing': 'page:/div:1/figure:1/svg:1', '.story-record:nth-of-type(1)': 'page:/div:1/figure:1/div:1', '.story-record:nth-of-type(2)': 'page:/div:1/figure:1/div:2', '.story-record:nth-of-type(3)': 'page:/div:1/figure:1/div:3' },
    'references-pager': { ':root': { key: 'page:/nav:3', self: true }, ':scope > div:nth-of-type(1) > a:nth-of-type(1) > span:nth-of-type(2)': 'page:/nav:3/a:1',
      ':scope > div:nth-of-type(1) > a:nth-of-type(2) > span:nth-of-type(2)': 'page:/nav:3/a:2' },
    insert: 'page:/div:2'
  } };

  function referencesDef(page) {
    var manifest = ArkManifest.get(page), area = page.toUpperCase();
    function copy(role) { return 'copy:' + area + '.' + role; }
    function words(role) { return ArkCopy.text(area + '.' + role); }
    var was = WAS[page] || {};

    /* The figure: the drafting diagram and its three numbered records; How it works walks them. */
    var drawing = ArkUI.createStoryDiagram ? ArkUI.createStoryDiagram(page) : null;
    var plate = ArkUI.el('div', 'story-plate');
    if (drawing) plate.appendChild(drawing.element);
    var legend = ArkUI.el('div', 'story-legend'), records = [];
    ['Reference name', 'Source artifact', 'Dated observation'].forEach(function (label, i) {
      var record = ArkUI.el('div', 'story-record', label);
      record.dataset.diagramNumber = String(i + 1).padStart(2, '0');
      records.push(record); legend.appendChild(record);
    });
    plate.appendChild(legend);
    function mark(view) {
      var at = view === 'context' ? 1 : 0;
      records.forEach(function (record, i) { record.dataset.selected = String(view === 'context' && i === at); });
      if (drawing) drawing.select(at, false);
    }

    return {
      page: page, id: page, titleId: page + '-title', was: was, insertWas: was.insert,
      crumbs: [{ label: 'Home', href: words('HOME.HREF') }, { label: manifest.title }],
      eyebrow: copy('EYEBROW'), title: copy('TITLE'),
      depth: {
        focus: { text: copy('BODY1') },
        context: { text: copy('BODY3') },
        /* the evidence: the registry it is checked against (what a publishable reference needs) */
        reference: { text: copy('BODY3'), blocks: [{ block: 'actions', props: { label: 'Evidence', items: [{ label: 'Read the canonical evidence registry', href: words('SOURCE.HREF'), tone: 'link' }] } }] }
      },
      /* A refusal names what it needs: the boundary says the evidence is pending, and the remedy
         is the registry entry How it works lists. */
      boundary: { tone: 'drift', title: 'Essential boundary', body: copy('BODY2') },
      figure: drawing ? { slot: 'diagram', caption: 'Illustration / relationships, not live progress: ' + drawing.title.charAt(0) + drawing.title.slice(1).toLowerCase() + '.' } : undefined,
      slots: { diagram: plate },
      pager: { label: 'Continue',
        prev: manifest.meta.back ? { label: copy('BACK'), href: 'route:' + manifest.meta.back } : undefined,
        next: manifest.meta.next ? { label: copy('NEXT'), href: 'route:' + manifest.meta.next } : undefined },
      onView: function (view) { mark(view); },
      onFigureVisibility: function (node, visible) { if (drawing) drawing.visible(visible); },
      dispose: function () { if (drawing) drawing.dispose(); }
    };
  }

  /* /what-is-a-resolver carries two of the content audit's five diagrams (W4-S13), drawn from
     js/content/manifests/resolver.js `meta.diagrams` by js/pages/resolver-page-parts.js:
       resolver-layers      How it works, after the steps: base chain -> capabilities -> resolver chains,
                            with the capabilities and chains read from the dated registry snapshot
       launched-vs-served   Evidence, before the sources: a launched resolver answers nothing until a
                            provider announces for it
     The layers fold at every width (tall: open, How it works ran to 2.2 screens at 1440 and 2.8 on a phone), launched-versus-served too (open inline it took Evidence from 1.3 to 1.8 screens at 1440), each behind "Show ..." (Ark's disclosure: a press away, never removed) and
     leads with the plain sentence the page lost in its conversion (BODY2, BODY3 -- the manifest's
     words for them, which nothing rendered). */
  function addFigures(def) {
    var parts = ArkUI.resolverPageParts;
    if (!parts) return def;
    var layers = parts.figureBlock('resolver', 'resolver-layers', { id: 'resolver-layers', foldBelow: 'always', lead: 'copy:RESOLVER.BODY2', more: 'Show how the layers fit', less: 'Hide the layers' });
    var served = parts.figureBlock('resolver', 'launched-vs-served', { id: 'resolver-served', foldBelow: 'always', lead: 'copy:RESOLVER.BODY3', more: 'Show launched versus served', less: 'Hide launched versus served' });
    def.slots = def.slots || {};
    def.slots[layers.slot] = layers.node; def.slots[served.slot] = served.node;
    def.depth.context.blocks = (def.depth.context.blocks || []).concat([layers.spec]);
    var evidence = def.depth.reference.blocks || [], last = evidence.length - 1;
    /* before the Sources row, which stays the view's last line */
    def.depth.reference.blocks = evidence.slice(0, last).concat([served.spec], evidence.slice(last));
    return def;
  }

  ArkUI.pageModules.resolverGuide = {
    referencesDef: referencesDef,
    mount: function (host, page) {
      var def = page === 'resolver' ? addFigures(ArkUI.resolverLabDef(page)) : referencesDef(page);
      var el = ArkUI.story.mount(def, host);
      if (def.afterMount) def.afterMount(el);
      return el;
    }
  };
})();

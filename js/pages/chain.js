/* /chain: one record joining a holder's chain, step by step -- a page of Ark blocks (Wave 3).

   breadcrumb   the way home (it was a lone "<- Home" link, a third back-link style)
   hero         the page's heading, now visible (it was visually hidden, so a visitor landed on a
                row of tabs with no title: docs/ux-audit/pages-ux-a.md /chain), and the one-line
                plain intro the manifest already held (CHAIN.LEDE)
   cases        Ark tabs, one per example -- Swaps / Transfers / Staking / Governance. Switching
                changes only what the resolver reads at the end (js/pages/home-flow.js CASES): the
                sign/check/extend/replicate mechanism never changes, which is the point -- the
                chain has no idea which of these it admitted. Each tab holds the scene in Ark's
                figure frame; the scene plays once and settles, and only the shown one runs.
   anchor       the CMS insertion point

   The scene is drawn in HTML (home-flow.js drawScene), so the record's wire grammar stays at
   least 12px on a phone instead of the SVG's 6px. ?case=<id> opens that example (prepare).

   Layout keys: every element of the old page with words keeps the key it had (the `was` pins,
   derived by tests/lib/layout-continuity.cjs from the frozen census
   tests/fixtures/layout-keys/chain.tsv). Regression: tests/chain-blocks.cjs. */
(function () {
  'use strict';
  var preparedCase = null;

  /* `was`: the old page's layout key for each element that carries its words now, by spec entry
     id (refs: tests/lib/layout-continuity.cjs derive /chain, written as selectors). The scene was
     an SVG (svg:1 under the "now" tile) and is HTML now, so its keys are pinned field by field to
     the element that draws the same thing; the old shapes that have no element of their own any
     more (a box behind its text, a dash between fields) are listed as retired in
     tests/chain-blocks.cjs. The Swaps example was the one the census saw. */
  function flowWas(slot, base) {
    var scene = base + '/div:1/svg:1', at = slot + ' ', was = {};
    was[slot] = base;
    was[at + '.flow-scene'] = scene;
    was[at + '[data-panel="sign"]'] = scene + '/g:1';
    for (var b = 1; b <= 7; b++) {
      var block = at + '.flow-block[data-i="' + (b - 1) + '"]';
      was[block] = scene + '/g:1/g:' + b;
      was[block + ' .flow-block-text'] = scene + '/g:1/g:' + b + '/text:1';
      was[block + ' .flow-block-under'] = scene + '/g:1/g:' + b + '/text:2';
    }
    was[at + '[data-panel="check"]'] = scene + '/g:2';
    for (var l = 1; l <= 4; l++) {
      var lamp = at + '.flow-lamp:nth-child(' + l + ')';
      was[lamp] = scene + '/g:2/g:' + l;
      was[lamp + ' .flow-lamp-mark'] = scene + '/g:2/g:' + l + '/text:1';
      was[lamp + ' .flow-lamp-name'] = scene + '/g:2/g:' + l + '/text:2';
    }
    was[at + '[data-panel="check"] .flow-band-sub'] = scene + '/g:2/text:1';
    was[at + '[data-panel="extend"]'] = scene + '/g:3';
    for (var n = 1; n <= 5; n++) {
      var node = at + '.flow-node[data-i="' + (n - 1) + '"]';
      was[node] = scene + '/g:3/g:' + n;
      was[node + ' .flow-node-text'] = scene + '/g:3/g:' + n + '/text:1';
      if (n < 5) was[at + '.flow-chain > .flow-link:nth-child(' + (2 * n) + ')'] = scene + '/g:3/path:' + n;
    }
    was[at + '[data-panel="extend"] .flow-band-sub'] = scene + '/g:3/text:1';
    was[at + '[data-panel="replicate"]'] = scene + '/g:4';
    for (var p = 1; p <= 12; p++) was[at + '.flow-peer:nth-child(' + p + ')'] = scene + '/g:4/circle:' + p;
    was[at + '[data-panel="replicate"] .flow-band-sub'] = scene + '/g:4/text:1';
    was[at + '[data-panel="resolve"]'] = scene + '/g:5';
    was[at + '.flow-meaning-box'] = scene + '/g:5/rect:1';
    was[at + '.flow-meaning-text'] = scene + '/g:5/text:1';
    was[at + '.flow-meaning-who'] = scene + '/g:5/text:2';
    return was;
  }
  var WAS = {
    'chain-crumbs': { 'breadcrumb-item': 'page:/a:1', ':scope > ol > li:first-child': 'page:/a:1/span:1' },
    'chain-cases': Object.assign({ 'tabs-list': 'page:/div:1', 'figure-caption': { key: 'page:/div:2/div:1/svg:1/text:1', self: true } },
      flowWas('[data-ark-slot="flow-swaps"]', 'page:/div:2')),
    insert: { key: 'page:/div:3', self: true }
  };

  function spec(manifest, current) {
    return [
      { block: 'breadcrumb', id: 'chain-crumbs', was: WAS['chain-crumbs'], props: { label: 'Your place', items: [
        { label: 'Home', href: 'route:' + manifest.meta.back }, { label: 'The chain of chains' }
      ] } },
      { block: 'hero', id: 'chain-hero', was: WAS['chain-hero'], props: { title: manifest.title, lede: 'copy:CHAIN.LEDE', density: 'compact' } },
      { block: 'tabs', id: 'chain-cases', was: WAS['chain-cases'], props: {
        label: 'See it from a different resolver', variant: 'segmented', defaultValue: current,
        items: ArkUI.chainCases.map(function (c) {
          return { value: c.id, label: c.label, blocks: [{ block: 'figure', props: {
            kind: 'illustration', slot: 'flow-' + c.id,
            caption: 'Illustrative values · the record shape is the real wire grammar. Only what the resolver reads at the end changes between examples.'
          } }] };
        })
      } },
      { insert: 'main', was: WAS.insert }
    ];
  }

  ArkUI.pageModules.chain = {
    spec: spec,
    prepare: function (_page, settings) {
      var params = new URLSearchParams(settings && settings.query || ArkUI.route.search());
      var requested = params.get('case');
      preparedCase = ArkUI.chainCases.some(function (c) { return c.id === requested; }) ? requested : null;
    },
    mount: function (host) {
      var manifest = ArkManifest.get('chain');
      /* Each step links to the page that shows that part for real, through the site's one link
         resolver (js/ark/dash-kit.js). */
      function pageHref(key) { return ArkUI.dash.resolveLinkField('route:' + key).href; }
      var flows = {}, slots = {};
      ArkUI.chainCases.forEach(function (c) {
        slots['flow-' + c.id] = function () {
          var flow = flows[c.id] = ArkUI.buildChainFlow({ hrefFor: pageHref, caseId: c.id });
          flow.element.classList.add('chain-flow');
          return flow.element;
        };
      });
      var current = preparedCase || ArkUI.chainCases[0].id;
      var page = ArkUI.page(spec(manifest, current), host, { page: 'chain', className: 'chain-page', titleId: 'chain-title', slots: slots });
      /* A hidden tab's scene schedules nothing; the one a choice shows starts (and settles) again. */
      var tabs = page.querySelector('#chain-cases');
      function shown() {
        var selected = tabs && tabs.querySelector('[role="tab"][aria-selected="true"]');
        var index = selected ? Array.prototype.indexOf.call(selected.parentNode.children, selected) : 0;
        return flows[ArkUI.chainCases[index].id];
      }
      if (tabs) tabs.addEventListener('click', function () { var flow = shown(); if (flow) flow.restore(); });
      page.arkRestore = function () { var flow = shown(); if (flow) flow.restore(); };
      page.arkDispose = function () { Object.keys(flows).forEach(function (id) { flows[id].dispose(); }); };
      return page;
    }
  };
})();

/* /chain: one record joining a holder's chain, step by step -- a page of Ark blocks (Wave 3).

   breadcrumb   the way home (it was a lone "<- Home" link, a third back-link style)
   hero         the page's heading, now visible (it was visually hidden, so a visitor landed on a
                row of tabs with no title: docs/ux-audit/pages-ux-a.md /chain), and the one-line
                plain intro the manifest already held (CHAIN.LEDE)
   scene        ONE example's scene in Ark's figure frame, with its five steps as Ark tabs at the top
                (ArkUI.buildChainSteps): the open tab says its step and opens the page that shows that
                part for real -- the account step only to a visitor with an identity, since signed out
                it opened a sign-in form. Each record box is an Ark glossary term whose tip is the role
                letter's meaning (docs/ux-audit/ledger.md /chain). The scene plays once and settles.
   cases        under the scene, an Ark choice: Swaps / Transfers / Staking / Governance. Choosing one
                redraws the scene for it; only what the resolver reads at the end changes
                (js/pages/home-flow.js CASES), which is the point -- the chain has no idea which of these
                it admitted. Until the first-visit audit 2026-10-22 the examples were tabs around the
                scene, so its step tabs sat inside them: two rows of tabs before a word of the example.
   swap         with the Swaps example only, behind a disclosure under the choice: the swap as one
                signed resolution (meta.diagrams, drawn by resolver-page-parts.js)
   onward       what each resolver reads from the chain (CHAIN.NEXT -> CHAIN.NEXT.HREF) and where
                resolver chains come from (CHAIN.SOURCE.LINK -> CHAIN.SOURCE.HREF): both in the manifest
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
    was[at + '.flow-now'] = base + '/div:1';   /* the step picker now stands before it (as the list did), so it is pinned, not counted */
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
  /* The old step list (ol > li > a > number + name) is the step picker's tab list and tabs now: its
     list and each link keep their keys (the link's words lost the number: one label, "Sign"). */
  function stepsWas() {
    var was = { 'tabs-list': { key: 'page:/div:2/ol:1', self: true } };
    for (var k = 1; k <= 5; k++) was['tabs-trigger' + (k > 1 ? '#' + k : '')] = { key: 'page:/div:2/ol:1/li:' + k + '/a:1', self: true };
    /* the one step's words the census held, the quote under the scene (strong.flow-says, "An intent to swap..."):
       it is the Resolve step's quote, in that tab's panel */
    was['[data-value="resolve"] > p'] = { key: 'page:/div:2/div:1/strong:1', self: true };
    return was;
  }
  /* The old case buttons are the choice's options (each keeps its button's key); the scene's keys are
     pinned on the one scene the page opens with. */
  function casesWas() {
    var was = { 'choice-options': { key: 'page:/div:1', self: true } };
    for (var k = 1; k <= 4; k++) {
      var sfx = k > 1 ? '#' + k : '', old = 'page:/div:1/button:' + k;
      was['choice-option' + sfx] = old; was['choice-text' + sfx] = old + '/span:2';   /* as /what-is-a-resolver's choices */
    }
    return was;
  }
  var WAS = {
    'chain-crumbs': { 'breadcrumb-item': 'page:/a:1', ':scope > ol > li:first-child': 'page:/a:1/span:1' },
    'chain-scene': Object.assign({ 'figure-caption': { key: 'page:/div:2/div:1/svg:1/text:1', self: true } },
      flowWas('[data-ark-slot="flow"]', 'page:/div:2')),
    'chain-cases': casesWas(),
    insert: { key: 'page:/div:3', self: true }
  };

  /* The Swaps example's second picture: the swap as one signed resolution (the manifest's own diagram,
     drawn by js/pages/resolver-page-parts.js), behind Ark's disclosure under the scene. A swap is the one
     example whose resolution is a batch -- two intents, one signer, one signed result for the peers, and a
     second node's result refused -- so only that tab carries it. It replaced a smaller copy of the same
     diagram that stood inside the scene's Resolve panel (one renderer, not two). Null without the parts. */
  function swapFigure() {
    var parts = ArkUI.resolverPageParts;
    return parts ? parts.figureBlock('chain', 'swap-signed-resolution', { id: 'chain-swap', foldBelow: 'always', more: 'How a swap is resolved', less: 'Hide how a swap is resolved' }) : null;
  }

  function spec(manifest, current, swap) {
    return [
      { block: 'breadcrumb', id: 'chain-crumbs', was: WAS['chain-crumbs'], props: { label: 'Your place', items: [
        { label: 'Home', href: 'route:' + manifest.meta.back }, { label: 'The chain of chains' }
      ] } },
      { block: 'hero', id: 'chain-hero', was: WAS['chain-hero'], props: { title: manifest.title, lede: 'copy:CHAIN.LEDE', density: 'compact' } },
      /* one example, its five steps on top */
      { block: 'figure', id: 'chain-scene', was: WAS['chain-scene'], props: {
        kind: 'illustration', slot: 'flow',
        caption: 'Illustrative values · the record shape is the real wire grammar. Only what the resolver reads at the end changes between examples.'
      } },
      /* the same record, read by another resolver */
      { block: 'choice', id: 'chain-cases', was: WAS['chain-cases'], props: {
        label: 'The same record, read by another resolver', look: 'segmented', value: current,
        options: ArkUI.chainCases.map(function (c) { return { value: c.id, label: c.label }; })
      } }
    ].concat(swap ? [swap.spec] : [], [
      /* The way on: what each resolver reads from the chain (the manifest's next-step line), and where
         resolver chains come from (docs/ux-audit/ledger.md 3.4-x). */
      { block: 'actions', id: 'chain-onward', props: { label: 'Where next', items: [
        { label: 'copy:CHAIN.NEXT', href: ArkCopy.text('CHAIN.NEXT.HREF'), tone: 'secondary' },
        { label: 'copy:CHAIN.SOURCE.LINK', href: ArkCopy.text('CHAIN.SOURCE.HREF'), tone: 'ghost' }
      ] } },
      { insert: 'main', was: WAS.insert }
    ]);
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
      var slots = {}, swap = swapFigure(), flow = null, flows = {}, current = preparedCase || ArkUI.chainCases[0].id;
      if (swap) slots[swap.slot] = swap.node;
      /* the scene for one example, with its five steps at the top of the frame, each opening the page
         that shows that part for real */
      function build(caseId) {
        if (flows[caseId]) return flows[caseId];
        var next = flows[caseId] = ArkUI.buildChainFlow({ caseId: caseId });
        next.element.classList.add('chain-flow');
        ArkUI.buildChainSteps(next, caseId, { id: 'chain-steps-' + caseId, links: true, was: caseId === current ? stepsWas() : undefined });
        return next;
      }
      slots.flow = function () { flow = build(current); return flow.element; };
      var page = ArkUI.page(spec(manifest, current, swap), host, { page: 'chain', className: 'chain-page', titleId: 'chain-title', slots: slots });
      var swapBlock = swap && page.querySelector('#chain-swap');
      function showSwap(caseId) { if (swapBlock) swapBlock.hidden = caseId !== 'swaps'; }
      showSwap(current);
      /* Choosing an example puts its scene in the frame (each is built once, so the one the page opened
         with keeps its saved layout keys); a scene out of the frame is out of view and schedules nothing. */
      var cases = page.querySelector('#chain-cases');
      if (cases) cases.addEventListener('change', function (event) {
        if (!event.target.checked || !flow) return;
        var slot = flow.element.parentNode, old = flow;
        flow = build(event.target.value);
        if (slot && flow !== old) slot.replaceChild(flow.element, old.element);
        flow.restore();
        showSwap(event.target.value);
      });
      page.arkRestore = function () { if (flow) flow.restore(); };
      page.arkDispose = function () { Object.keys(flows).forEach(function (id) { flows[id].dispose(); }); };
      return page;
    }
  };
})();

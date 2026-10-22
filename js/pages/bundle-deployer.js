/* /bundle-deployer -- the FXN Bundle Deployer, the planned local CLI, as a page of Ark blocks.
   It describes a tool that is not released, never a live deploy action.

   Converted to data in DEFXN polish Wave 3 (W3-GUIDE). The hand-built page (an eyebrow and a
   status pill, a three-step list, a flow figure, a public/private table and a release aside) was
   2.0x the viewport on a phone, and its only way on was "Back to your account"
   (docs/ux-audit/pages-ux-a.md /bundle-deployer P1/P2). It is the hero, the Bundles hand-off,
   the two halves as tabs -- the three steps, and what becomes public -- the release boundary in
   sight, and a pager that leads on to running DEFXN from source, to resolving deployments and
   to /how-deployment-works (W5-PAGES: the page that explains what the deployer feeds into). Every word is kept; the words
   are the bundledeployer manifest's (copy: keys). Layout keys of the old page are pinned (`WAS`,
   tests/lib/layout-continuity.cjs). Regression: tests/task-pages-blocks.cjs. */
(function () {
  'use strict';

  /* `was`: the key each element of the hand-built page had, by block id, so a CMS edit saved
     against it still lands. Started from tests/lib/layout-continuity.cjs's derive against the
     frozen census (tests/fixtures/layout-keys/bundle-deployer.tsv) and settled by hand where a
     word matched by chance (a step's "01" is not the flow's "01"); every reshaped and retired key
     is listed with its reason in tests/task-pages-blocks.cjs. */
  var W = 'page:/div:2/section:1', B = 'page:/div:2/section:2';
  var WAS = {
    'bundledeployer-hero': { ':root': { key: 'page:/header:1', self: true }, eyebrow: 'page:/div:1/p:1', 'hero-title': 'id:bundledeployer-title', 'hero-lede': 'page:/header:1/p:1',
      ':scope > dl:nth-of-type(1) > div:nth-of-type(1) > dd:nth-of-type(1)': 'page:/div:1/span:1' },
    'bundledeployer-views': { ':root': { key: 'page:/div:2', self: true },
      'tabs-trigger': 'id:bundle-workflow-title', 'tabs-trigger#2': 'id:bundle-boundary-title', 'tabs-trigger#3': B + '/figure:1/figcaption:1',
      'tabs-content': { key: W, self: true }, 'tabs-content#2': { key: B, self: true }, 'tabs-content#3': { key: B + '/figure:1', self: true },
      ':scope > div:nth-of-type(3) > p:nth-of-type(1)': B + '/p:1', ':scope > div:nth-of-type(4) > p:nth-of-type(1)': B + '/figure:1/p:1',
      'accordion': { key: W + '/ol:1', self: true }, 'table': { key: B + '/table:1', self: true }, 'thead': B + '/table:1/thead:1', 'tbody': B + '/table:1/tbody:1',
      'stepper': { key: B + '/figure:1/ol:1', self: true } },
    'bundledeployer-release': { 'alert': { key: 'page:/aside:1', self: true }, 'alert-title': 'page:/aside:1/h2:1',
      ':scope > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': 'page:/aside:1/p:1',
      ':scope > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)': 'page:/aside:1/p:2' },
    'bundledeployer-pager': { ':scope > div:nth-of-type(1) > a:nth-of-type(1) > span:nth-of-type(2)': 'page:/aside:1/a:1' },
    insert: 'page:/div:3'
  };
  /* the cells carry copy keys, which an inherited pin does not outrank: each is pinned to its old cell */
  WAS['bundledeployer-views']['header-cell'] = B + '/table:1/thead:1/tr:1/th:1';
  WAS['bundledeployer-views']['header-cell#2'] = B + '/table:1/thead:1/tr:1/th:2';
  [1, 2, 3].forEach(function (row) { [1, 2].forEach(function (col) { var n = (row - 1) * 2 + col; WAS['bundledeployer-views']['cell' + (n > 1 ? '#' + n : '')] = B + '/table:1/tbody:1/tr:' + row + '/td:' + col; }); });
  [1, 2, 3].forEach(function (n) {
    var k = n > 1 ? '#' + n : '';
    WAS['bundledeployer-views']['accordion-item' + k] = W + '/ol:1/li:' + n + '/div:1';
    WAS['bundledeployer-views']['accordion-content' + k] = W + '/ol:1/li:' + n + '/div:1/p:1';
    WAS['bundledeployer-views']['step-title' + k] = B + '/figure:1/ol:1/li:' + n;
  });

  /* A page's name as the journey table spells it (js/content/site-pages.js), so a renamed page renames its link. */
  function pageLabel(key) {
    var row = typeof ArkSitePages !== 'undefined' ? ArkSitePages.pages().filter(function (p) { return p.key === key; })[0] : null;
    return row ? (row.short || row.label) : 'Deploy a resolver';
  }

  function spec() {
    var manifest = ArkManifest.get('bundledeployer');
    function copy(key) { return 'copy:BUNDLEDEPLOYER.' + key; }
    return [
      { block: 'breadcrumb', id: 'bundledeployer-crumbs', was: WAS['bundledeployer-crumbs'], props: { label: 'Your place', items: [{ label: 'Home', href: 'route:zero' }, { label: manifest.title }] } },
      { block: 'hero', id: 'bundledeployer-hero', was: WAS['bundledeployer-hero'], props: { eyebrow: copy('EYEBROW'), title: copy('TITLE'), lede: copy('DECK'), density: 'compact',
        meta: [{ label: 'Status', value: copy('STATUS') }] } },
      /* Explain + hand off (owner decision 2026-10-19): approving and pinning a bundle is the
         Bundles product, which runs on your own machine (no public site: the hand-off says so, and
         links its local address when this page is itself local). The family kit draws it
         (ArkUI.dash.productHandoff); the boundary table below stays: Bundles does not show it. Its sentence
         (BUNDLEDEPLOYER.HANDOFF) says what happens there: the block was a name and a button with no sentence
         (first-visit audit 2026-10-22). */
      { block: 'custom', id: 'bundledeployer-handoff', mount: function () { return ArkUI.dash.productHandoff && ArkUI.dash.productHandoff({ product: 'bundles', text: ArkCopy.text('BUNDLEDEPLOYER.HANDOFF') }) || document.createComment('no product kit'); } },
      /* the page's three parts, named by what they hold: the steps, what becomes public, and how a bundle travels (the
         labels were slogans, and the first tab opened on the bare line "Local CLI required": first-visit audit 2026-10-22) */
      { block: 'tabs', id: 'bundledeployer-views', was: WAS['bundledeployer-views'], props: { label: 'The deployer', items: [
        { value: 'steps', label: copy('WORKFLOW.TITLE'), blocks: [
          { block: 'accordion', props: { label: 'How a bundle is published', defaultOpen: ['step-1'], headingLevel: 3, items: [1, 2, 3].map(function (n) { return { value: 'step-' + n, title: copy('POINT' + n + '.TITLE'), content: copy('POINT' + n + '.TEXT') }; }) } }
        ] },
        { value: 'share', label: copy('BOUNDARY.TITLE'), content: copy('BOUNDARY.NOTE'), blocks: [
          { block: 'table', props: { caption: 'What becomes public, and what stays on your machine', columns: [{ key: 'pub', label: copy('BOUNDARY.PUBLIC') }, { key: 'loc', label: copy('BOUNDARY.LOCAL') }],
            rows: [1, 2, 3].map(function (n) { return { pub: copy('PUBLIC' + n), loc: copy('LOCAL' + n) }; }), maxHeight: 'none' } }
        ] },
        { value: 'flow', label: copy('FLOW.TITLE'), content: copy('FLOW.NOTE'), blocks: [
          { block: 'steps', props: { label: 'From your machine to the mesh', items: ['LOCAL', 'BUNDLE', 'MESH'].map(function (k) { return { title: copy('FLOW.' + k) }; }) } }
        ] }
      ] } },
      /* What is true today: the CLI is not released, and nothing here deploys. In sight from 601px
         up; on a phone, where the hero's status already says it, the detail is one press away. */
      { block: 'disclosure', id: 'bundledeployer-release', was: WAS['bundledeployer-release'], props: { foldBelow: 'phone', more: copy('POINT4.TITLE'), less: 'Hide the release status',
        blocks: [{ block: 'callout', props: { tone: 'drift', title: copy('POINT4.TITLE'), body: ArkCopy.text('BUNDLEDEPLOYER.POINT4.TEXT') + '\n\n' + ArkCopy.text('BUNDLEDEPLOYER.RELEASE.NOTE') } }] } },
      { insert: 'main', was: WAS.insert },
      { block: 'pager', id: 'bundledeployer-pager', was: WAS['bundledeployer-pager'], props: { label: 'Continue',
        prev: { label: copy('BACK'), href: 'route:' + manifest.meta.back },
        next: { label: 'Run DEFXN from source', href: 'route:download' },
        related: [{ label: 'Resolve your deployments', href: 'route:resolutions/deployments' }, { label: pageLabel('deployment'), href: 'route:deployment' }] } }
    ];
  }

  ArkUI.pageModules.bundledeployer = {
    spec: spec,
    mount: function (host) {
      return ArkUI.page(spec(), host, { page: 'bundledeployer', titleId: 'bundledeployer-title', terms: 'first-use' });
    }
  };
})();

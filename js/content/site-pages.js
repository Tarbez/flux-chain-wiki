/* The site's own pages and the journey each one belongs to: the one table the router catalog
   (js/pages/catalog.js), the "All pages" menu (js/resolvers/header.js), the footer strip
   (js/hero-motion.js), the sitemap and llms.txt (js/content/seo.js routes()) and the not-found
   page all read. Pure data with no dependencies, so it loads before js/content/seo.js (whose
   seo-data.js define() needs the page ids at load) and in every headless context that runs
   seo.js (scripts/lib/site-bundle.mjs, through js/admin/store.js's `needs`).

   Why it exists (2026-10-19, docs/ux-audit/pages.md P7): the lists that described the site
   were hand-written three times -- the menu's group arrays in header.js with a catch-all into
   "Evaluate -- live local mesh data, evidence", a second copy of the paths in seo.js
   EXTRA_PAGES with its own sitemap:false flags, and the catalog's hiddenFromNavigation -- and
   they had drifted: the design mocks /treasury and /deposits and the design-system /palette
   were filed under "live evidence", and /stats/gpu was in none of them. Now each page names
   its journey here once, and every list is derived from it (law: derive, don't author;
   regressions: tests/site-journeys.cjs, tests/navigation-index.cjs).

   A row: key (the catalog key), path, label (the fallback name when no SEO title is set),
   journey (one of JOURNEYS; null = a utility route that is in no list: the reference reader),
   seoId (the key its SEO override is stored under, when it differs from key), short (the
   name in a menu, when the label is longer), note (a parent's one-line description, shown
   when its children are grouped under it in the menu), lead (this page is where its journey
   starts: the footer strip links it). Content-derived routes (resolutions, articles, theory
   sheets) are not rows: FAMILIES gives their journey by key prefix. Saved SEO overrides are
   keyed by seoId, so a row's seoId never changes once published. */
var ArkSitePages = (function () {
  'use strict';
  var JOURNEYS = [
    { id: 'understand', title: 'Understand', note: 'What DEFXN is: the overview, how it works, agreements and the operating model' },
    { id: 'build', title: 'Build', note: 'Resolve something: resolutions, resolvers, your account and the tools that publish' },
    { id: 'prove', title: 'Prove', note: 'Measured evidence: benchmarks, the live mesh explorer and the evidence standard' },
    { id: 'run', title: 'Run', note: 'Operate a node: run from source and join a named network' },
    { id: 'read', title: 'Read', note: 'Notes and articles from the work' },
    { id: 'preview', title: 'Previews & lab', note: 'Design previews and illustrative models: not live data' }
  ];
  var PAGES = [
    { key: 'zero', path: '/', label: 'Home', seoId: 'home', journey: 'understand' },
    { key: 'about', path: '/about', label: 'Overview', journey: 'understand', lead: true },
    { key: 'resolutions', path: '/resolutions', label: 'Resolutions', journey: 'build', lead: true, note: 'Every thing you can resolve on the mesh, one page each' },
    { key: 'proximity', path: '/experiments', label: 'Interactive model', journey: 'preview', lead: true },
    { key: 'learnings', path: '/learnings', label: 'Notes', journey: 'read', lead: true, note: 'Choose an architectural question' },
    { key: 'explorer', path: '/explore', label: 'Mesh Explorer', journey: 'prove' },
    { key: 'palette', path: '/palette', label: 'Interface palette', journey: 'preview' },
    { key: 'resolver', path: '/what-is-a-resolver', label: 'What is a resolver?', journey: 'build' },
    { key: 'resolver-math', path: '/resolver-math', label: 'Resolver math', seoId: 'resolvermath', journey: 'build' },
    { key: 'resolvers', path: '/resolvers', label: 'Resolvers and capabilities', journey: 'build' },
    { key: 'references', path: '/start-from-something-real', label: 'Reference resolvers', journey: 'build' },
    { key: 'account', path: '/account', label: 'Your account', journey: 'build' },
    { key: 'account/domains', path: '/account/domains', label: 'Your domains', journey: 'build' },
    { key: 'bundledeployer', path: '/bundle-deployer', label: 'FXN Bundle Deployer', journey: 'build' },
    { key: 'treasury', path: '/treasury', label: 'Treasury preview', journey: 'preview' },
    { key: 'deposits', path: '/deposits', label: 'Deposit preview', journey: 'preview' },
    { key: 'stats', path: '/stats', label: 'Mesh performance', journey: 'prove', lead: true },
    { key: 'stats/gpu', path: '/stats/gpu', label: 'GPU benchmark detail', journey: 'prove' },
    { key: 'stats/ledger', path: '/stats/ledger', label: 'Ledger benchmark detail', journey: 'prove' },
    { key: 'deployment', path: '/how-deployment-works', label: 'Deploy a resolver', journey: 'understand', note: 'Six steps, from a grammar to a chain; the earlier agreement chapters stay beside it' },
    { key: 'how/ask', path: '/how-deployment-works/ask', label: 'State the request', journey: 'understand' },
    { key: 'how/work', path: '/how-deployment-works/work', label: 'Agree on the terms', journey: 'understand' },
    { key: 'how/check', path: '/how-deployment-works/check', label: 'Verify the result', journey: 'understand' },
    { key: 'reference', path: '/reference', label: 'Canonical reference', journey: null },
    { key: 'lifecycle', path: '/lifecycle', label: 'Agreement lifecycle', short: 'View the full lifecycle', journey: 'understand', note: 'Follow one request through five signed records' },
    { key: 'lifecycle/intent', path: '/lifecycle/intent', label: 'Intent / Agreement lifecycle', short: 'Intent', journey: 'understand' },
    { key: 'lifecycle/offer', path: '/lifecycle/offer', label: 'Offer / Agreement lifecycle', short: 'Offer', journey: 'understand' },
    { key: 'lifecycle/agreement', path: '/lifecycle/agreement', label: 'Agreement / Agreement lifecycle', short: 'Agreement', journey: 'understand' },
    { key: 'lifecycle/fulfillment', path: '/lifecycle/fulfillment', label: 'Fulfillment / Agreement lifecycle', short: 'Fulfillment', journey: 'understand' },
    { key: 'lifecycle/receipt', path: '/lifecycle/receipt', label: 'Receipt / Agreement lifecycle', short: 'Receipt', journey: 'understand' },
    { key: 'chain', path: '/chain', label: 'Every identity, its own chain', journey: 'understand' },
    { key: 'concept', path: '/concept', label: 'The operating model', journey: 'understand', note: 'Choose the mechanism you want to inspect' },
    { key: 'dao', path: '/dao', label: 'How DEFXN is governed', journey: 'understand' },
    { key: 'download', path: '/download', label: 'Run DEFXN from source', journey: 'run', lead: true },
    { key: 'deploy', path: '/deploy', label: 'Create or join a network', journey: 'run' }
  ];
  /* Routes derived from content registries (js/pages/catalog.js catalogContentRoutes and the
     resolutions loop): their journey comes from what kind of route they are, not a row. */
  var FAMILIES = [
    { prefix: 'resolutions/', journey: 'build' },
    { prefix: 'article/', journey: 'read' },
    { prefix: 'concept/', journey: 'understand' }
  ];
  function row(key) { for (var i = 0; i < PAGES.length; i++) if (PAGES[i].key === key) return PAGES[i]; return null; }
  /* The journey of any catalog key: its row's, else its family's, else null (in no list). */
  function journeyOf(key) {
    var r = row(key);
    if (r) return r.journey;
    for (var i = 0; i < FAMILIES.length; i++) if (String(key).indexOf(FAMILIES[i].prefix) === 0) return FAMILIES[i].journey;
    return null;
  }
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  return {
    journeys: function () { return copy(JOURNEYS); },
    pages: function () { return copy(PAGES); },
    families: function () { return copy(FAMILIES); },
    row: function (key) { var r = row(key); return r ? copy(r) : null; },
    journeyOf: journeyOf
  };
})();

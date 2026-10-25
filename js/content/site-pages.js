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
    { id: 'preview', title: 'Previews', note: 'Design previews: not live data' }
  ];
  var PAGES = [
    { key: 'zero', path: '/', label: 'Home', seoId: 'home', journey: 'understand' },
    { key: 'intro', path: '/intro', label: 'Enter the grid', seoId: 'home', journey: null, note: 'The first page of a fresh visit: the network from above, and one card that opens home' },
    { key: 'about', path: '/about', label: 'Overview', journey: 'understand', lead: true },
    { key: 'resolutions', path: '/resolutions', label: 'Resolutions', journey: 'build', lead: true, note: 'Every thing you can resolve on the mesh, one page each' },
    { key: 'learnings', path: '/learnings', label: 'Notes', journey: 'read', lead: true, note: 'Choose an architectural question' },
    { key: 'explorer', path: '/explore', label: 'Mesh Explorer', journey: 'prove' },
    { key: 'palette', path: '/palette', label: 'Interface palette', journey: 'preview', lead: true },   /* the lead since /experiments was deleted (owner, 2026-10-24) */
    { key: 'resolver', path: '/what-is-a-resolver', label: 'What is a resolver?', journey: 'build' },
    { key: 'resolver-math', path: '/resolver-math', label: 'Resolver math', seoId: 'resolvermath', journey: 'build' },
    { key: 'resolvers', path: '/resolvers', label: 'Resolvers and capabilities', journey: 'build' },
    { key: 'references', path: '/start-from-something-real', label: 'Reference resolvers', journey: 'build' },
    { key: 'auth', path: '/auth', label: 'Sign in', journey: null, note: 'Sign in with your FXN ID file; the master account opens after' },
    { key: 'account', path: '/account', label: 'Your account', journey: 'build' },
    { key: 'account/domains', path: '/account/domains', label: 'Your domains', journey: 'build' },
    { key: 'bundledeployer', path: '/bundle-deployer', label: 'FXN Bundle Deployer', journey: 'build' },
    { key: 'treasury', path: '/treasury', label: 'Treasury preview', journey: 'preview' },
    { key: 'deposits', path: '/deposits', label: 'Deposit preview', journey: 'preview' },
    /* The stats section (2026-10-24, owner: "/measured is where we show capabilities, benchmarks, live data"): one 3D stage,
       inner pages. It replaces /stats, /stats/gpu, /stats/ledger and /measured, whose keys stay in js/pages/catalog.js
       as redirects. Its week pages are not listed here: they come from STATS_RUNS below, one per week that holds a run. */
    /* the three steps of the stats section, in story order (2026-10-25: reduced from five, "we are repeating ourselves nonstop") */
    { key: 'stats/now', path: '/stats/now', label: 'Network stats', journey: 'prove', lead: true },
    { key: 'stats/capabilities', path: '/stats/capabilities', label: 'Operations, measured', journey: 'prove' },
    { key: 'stats/ceiling', path: '/stats/ceiling', label: 'One node, measured', journey: 'prove' },
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
    /* the redesign's views (docs/home-redesign/home-mockup.html), each on its own 3D view (js/world/world-host.js VIEW_OF).
       Pages A: your chain and the identity flow (js/pages/world-chain.js, js/pages/world-identity.js) */
    { key: 'chain/record', path: '/chain/record', label: 'Revisions', journey: 'understand' },
    { key: 'chain/open', path: '/chain/open', label: 'Record', journey: 'understand' },
    { key: 'chain/links', path: '/chain/links', label: 'Connections', journey: 'understand' },
    { key: 'identity', path: '/identity', label: 'Your FXN ID', journey: 'understand' },
    { key: 'identity/sign', path: '/identity/sign', label: 'Signing in', journey: 'understand' },
    { key: 'identity/safe', path: '/identity/safe', label: 'Security', journey: 'understand' },
    { key: 'identity/you', path: '/identity/you', label: 'Your identity', journey: 'understand' },
    /* Pages B: the network's numbers and how it works (js/pages/world-measure.js, js/pages/world-works.js) */
    { key: 'fxn', path: '/fxn', label: 'FXN supply', journey: 'understand' },
    { key: 'ring', path: '/ring', label: 'A chain of the network', journey: 'understand' },
    { key: 'works', path: '/how-it-works', label: 'In one minute', journey: 'understand' },
    { key: 'works/resolve', path: '/how-it-works/resolve', label: 'How a result is made', journey: 'understand' },
    { key: 'works/layers', path: '/how-it-works/layers', label: 'Three layers', journey: 'understand' },
    { key: 'works/life', path: '/how-it-works/life', label: 'Life of a resolver', journey: 'understand' },
    { key: 'trace', path: '/trace', label: 'Trace a record', journey: 'understand' },
    { key: 'concept', path: '/concept', label: 'The operating model', journey: 'understand', note: 'Choose the mechanism you want to inspect' },
    { key: 'dao', path: '/dao', label: 'How DEFXN is governed', journey: 'understand' },
    { key: 'download', path: '/download', label: 'Get FXN Browser', journey: 'run', lead: true },
    { key: 'deploy', path: '/deploy', label: 'Create or join a network', journey: 'run' }
  ];
  /* The dated runs the stats section can show with their figures, and the only source of its week pages. A run is listed
     here when js/content/stats-highlights.js (window.ArkStatsHighlights) holds its figures, because a week page must
     show numbers it can trace. The dates are repeated from that file so that a headless context (the sitemap, the
     server's route list) can derive the routes without it; tests/world-stats.cjs fails when the two disagree, and when a
     run is filed there that is missing here. A week is an ISO 8601 week (Monday to Sunday). Nothing is scheduled yet:
     a week page exists because a run was filed in that week, never because the week has begun. */
  var STATS_RUNS = [
    { record: 'BENCH-012', date: '2026-10-10' },
    { record: 'BENCH-013', date: '2026-10-10' },
    { record: 'INFRA-001', date: '2026-10-12' },
    { record: 'BENCH-015', date: '2026-10-15' }
  ];
  function utcDay(iso) { var p = String(iso).split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function isoDate(ms) { return new Date(ms).toISOString().slice(0, 10); }
  /* ISO 8601: the week belongs to the year of its Thursday; week 1 holds the year's first Thursday */
  function isoWeek(iso) {
    var day = utcDay(iso), dow = (new Date(day).getUTCDay() + 6) % 7, monday = day - dow * 864e5, thursday = monday + 3 * 864e5;
    var year = new Date(thursday).getUTCFullYear(), jan1 = Date.UTC(year, 0, 1);
    return { year: year, number: Math.floor((thursday - jan1) / 864e5 / 7) + 1, from: isoDate(monday), to: isoDate(monday + 6 * 864e5) };
  }
  /* the weeks that hold a run, oldest first: [{ number, year, key, path, from, to, runs: [{ record, date }] }] */
  function statsWeeks() {
    var byNumber = {};
    STATS_RUNS.forEach(function (run) {
      var w = isoWeek(run.date), id = w.year + '-' + w.number;
      (byNumber[id] = byNumber[id] || { number: w.number, year: w.year, from: w.from, to: w.to, runs: [] }).runs.push({ record: run.record, date: run.date });
    });
    return Object.keys(byNumber).map(function (id) {
      var w = byNumber[id]; w.key = 'stats/week-' + w.number; w.path = '/stats/week-' + w.number; return w;
    }).sort(function (a, b) { return a.year - b.year || a.number - b.number; });
  }
  /* The time axis of the stats stage and its tabs: every week from the first run's to the week of `today` (an ISO date), oldest first, at most
     `max` of them (the newest). A week with no run has key null: it has no page, and it is drawn empty. */
  function statsTimeline(today, max) {
    var weeks = statsWeeks(), now = isoWeek(today), out = [];
    if (!weeks.length) return out;
    var first = utcDay(weeks[0].from), last = Math.max(utcDay(now.from), utcDay(weeks[weeks.length - 1].from));
    for (var t = first; t <= last; t += 7 * 864e5) {
      var iso = isoDate(t), w = isoWeek(iso), page = weeks.filter(function (x) { return x.from === iso; })[0];
      out.push({ number: w.number, year: w.year, from: iso, to: w.to, key: page ? page.key : null, runs: page ? page.runs.length : 0, current: iso === now.from });
    }
    return out.slice(-(max || 12));
  }
  /* the week pages were retired on 2026-10-25 (every stats card names its run and date): js/pages/catalog.js redirects their keys to stats/now */
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
    statsRuns: function () { return copy(STATS_RUNS); },
    statsWeeks: function () { return copy(statsWeeks()); },
    statsTimeline: statsTimeline,
    isoWeek: isoWeek,
    journeyOf: journeyOf
  };
})();

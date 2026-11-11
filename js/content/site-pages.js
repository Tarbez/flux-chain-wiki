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
  /* The journeys, cut with the pages on 2026-11-05 (owner: about 85 pages down to 22). The previews journey went
     with its pages (/palette, /treasury, /deposits). */
  var JOURNEYS = [
    { id: 'understand', title: 'Understand', note: 'What DEFXN is: the grid, your chain and your FXN ID' },
    { id: 'build', title: 'Build', note: 'Resolve something with resolutions and resolvers' },
    { id: 'prove', title: 'Prove', note: 'Measured evidence: the live mesh explorer and the network stats' },
    { id: 'run', title: 'Run', note: 'Get FXN Browser and run a node' },
    { id: 'read', title: 'Read', note: 'Notes and articles from the work' }
  ];
  /* The pages that stay after the 2026-11-05 cut. A page that left is a row of RETIRED below, never deleted:
     its address keeps working and opens the page that now holds it. */
  /* The portal's 12 topics (owner, 2026-11-09, design P05: the ring of 12 stones is the main navigation), clockwise from the
     top. Each is a page at /fxn/<slug>, drawn by one template (js/pages/topic.js) from one row of js/content/topics.js. The
     order here is the ring's order; topics.js holds each topic's words and object. No journey: the ring and the jump bar
     lead to them, never the menu lists. */
  var TOPICS = ['id', 'records', 'keepers', 'capacity', 'chains', 'names', 'game', 'releases', 'apps', 'rules', 'deposits', 'network'];
  /* The pages that stay after the 2026-11-09 portal cut (design P05). A page that left is a row of RETIRED below, never deleted:
     its address keeps working and opens the page that now holds it. */
  var PAGES = [
    { key: 'zero', path: '/', label: 'Home', seoId: 'home', journey: 'understand' },
    { key: 'intro', path: '/intro', label: 'Home', seoId: 'home', journey: 'understand', lead: true, note: 'The home: what FXN is, and a link to each of the twelve topics' },
    { key: 'learn', path: '/learn', label: 'Learn', journey: 'understand', note: 'What a record is, every measured number, and the twelve topics' },
    { key: 'auth', path: '/auth', label: 'Sign in', journey: null, note: 'Sign in with your FXN ID file. The master account opens after.' },
    { key: 'account', path: '/account', label: 'Your account', journey: 'build' },
    { key: 'download', path: '/download', label: 'Get FXN Browser', journey: 'run', lead: true }
  ].concat(TOPICS.map(function (slug) { return { key: 'fxn/' + slug, path: '/fxn/' + slug, label: 'FXN ' + slug, journey: null, topic: slug }; }));
  /* The pages the 2026-11-05 cut retired: each old key keeps its old address, and opens `to`, the page that holds it now.
     `query` is what that page reads to open the right section (?s=<section>, ?i=<item>). js/pages/catalog.js turns every row
     into an ArkUI.pageRedirects entry with the old path as its alias, so a saved link still lands. The module files stay
     on disk, out of the catalog. `short` and `label` stay because a reader names the old pages by them: ArkUI.lifecycleStages
     (js/lattice.js, js/pages/lifecycle.js) is derived from the lifecycle/* rows. Keys that are routes derived from content
     (resolutions/<slug>, concept/<id>) are retired by their family in FAMILIES, not listed here. */
  var RETIRED = [
    /* the 2026-11-09 portal cut (design P05, docs/design/space/SPACE.md "Portal navigation (P05)"): each page's facts now live on
       the topic page or on Learn */
    { key: 'works', path: '/how-it-works', label: 'How it works', to: 'learn' },
    { key: 'learnings', path: '/learnings', label: 'Notes', to: 'learn' },
    { key: 'resolutions', path: '/resolutions', label: 'Resolutions', to: 'fxn/apps' },
    { key: 'resolvers', path: '/resolvers', label: 'Resolvers and capabilities', to: 'fxn/apps' },
    { key: 'explorer', path: '/explore', label: 'Mesh Explorer', to: 'fxn/network' },
    { key: 'stats/now', path: '/stats/now', label: 'Network stats', to: 'learn', query: 't=speed' },
    { key: 'chain', path: '/chain', label: 'Every identity, its own chain', to: 'fxn/chains' },
    { key: 'identity', path: '/identity', label: 'Your FXN ID', to: 'fxn/id' },
    { key: 'ring', path: '/ring', label: 'A chain of the network', to: 'fxn/keepers' },
    { key: 'about', path: '/about', label: 'Overview', to: 'zero' },
    { key: 'palette', path: '/palette', label: 'Interface palette', to: 'zero' },
    { key: 'treasury', path: '/treasury', label: 'Treasury preview', to: 'zero' },
    { key: 'deposits', path: '/deposits', label: 'Deposit preview', to: 'zero' },
    { key: 'reference', path: '/reference', label: 'Canonical reference', to: 'learn' },
    { key: 'how/ask', path: '/how-deployment-works/ask', label: 'State the request', to: 'learn' },
    { key: 'how/work', path: '/how-deployment-works/work', label: 'Agree on the terms', to: 'learn' },
    { key: 'how/check', path: '/how-deployment-works/check', label: 'Verify the result', to: 'learn' },
    { key: 'lifecycle', path: '/lifecycle', label: 'Agreement lifecycle', to: 'learn' },
    { key: 'lifecycle/intent', path: '/lifecycle/intent', label: 'Intent / Agreement lifecycle', short: 'Intent', to: 'learn' },
    { key: 'lifecycle/offer', path: '/lifecycle/offer', label: 'Offer / Agreement lifecycle', short: 'Offer', to: 'learn' },
    { key: 'lifecycle/agreement', path: '/lifecycle/agreement', label: 'Agreement / Agreement lifecycle', short: 'Agreement', to: 'learn' },
    { key: 'lifecycle/fulfillment', path: '/lifecycle/fulfillment', label: 'Fulfillment / Agreement lifecycle', short: 'Fulfillment', to: 'learn' },
    { key: 'lifecycle/receipt', path: '/lifecycle/receipt', label: 'Receipt / Agreement lifecycle', short: 'Receipt', to: 'learn' },
    { key: 'resolver', path: '/what-is-a-resolver', label: 'What is a resolver?', to: 'fxn/apps' },
    { key: 'references', path: '/start-from-something-real', label: 'Reference resolvers', to: 'fxn/apps' },
    { key: 'resolver-math', path: '/resolver-math', label: 'Resolver math', to: 'learn' },
    { key: 'concept', path: '/concept', label: 'The operating model', to: 'learn' },
    { key: 'dao', path: '/dao', label: 'How DEFXN is governed', to: 'learn' },
    { key: 'account/domains', path: '/account/domains', label: 'Your domains', to: 'account' },
    { key: 'bundledeployer', path: '/bundle-deployer', label: 'FXN Bundle Deployer', to: 'account' },
    { key: 'stats/capabilities', path: '/stats/capabilities', label: 'Operations, measured', to: 'learn', query: 't=speed' },
    { key: 'stats/ceiling', path: '/stats/ceiling', label: 'One node, measured', to: 'learn', query: 't=speed' },
    { key: 'chain/record', path: '/chain/record', label: 'Revisions', to: 'fxn/chains' },
    { key: 'chain/open', path: '/chain/open', label: 'Record', to: 'fxn/chains' },
    { key: 'chain/links', path: '/chain/links', label: 'Connections', to: 'fxn/chains' },
    { key: 'trace', path: '/trace', label: 'Trace a record', to: 'fxn/chains' },
    { key: 'identity/sign', path: '/identity/sign', label: 'Signing in', to: 'fxn/id' },
    { key: 'identity/safe', path: '/identity/safe', label: 'Security', to: 'fxn/id' },
    { key: 'identity/you', path: '/identity/you', label: 'Your identity', to: 'fxn/id' },
    { key: 'works/resolve', path: '/how-it-works/resolve', label: 'How a result is made', to: 'learn' },
    { key: 'works/layers', path: '/how-it-works/layers', label: 'Three layers', to: 'learn' },
    { key: 'works/life', path: '/how-it-works/life', label: 'Life of a resolver', to: 'learn' },
    { key: 'fxn', path: '/fxn', label: 'FXN supply', to: 'learn', query: 't=topics' },
    { key: 'deploy', path: '/deploy', label: 'Create or join a network', to: 'download' }
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
  /* the weeks that hold a run, oldest first: [{ number, year, key, path, from, to, runs: [{ record, date }] }]. `live` (optional) is the runs list
     of GET /api/fleet-runs: each run joins the week of its started_at_ms (UTC); STATS_RUNS stays the offline copy, and a record in both counts once. */
  function statsRunsWith(live) {
    var all = STATS_RUNS.slice(), seen = {};
    all.forEach(function (r) { seen[r.record] = true; });
    (live || []).forEach(function (r) { if (r && r.id && !seen[r.id] && r.started_at_ms >= 0) { seen[r.id] = true; all.push({ record: r.id, date: isoDate(r.started_at_ms) }); } });
    return all;
  }
  function statsWeeks(live) {
    var byNumber = {};
    statsRunsWith(live).forEach(function (run) {
      var w = isoWeek(run.date), id = w.year + '-' + w.number;
      (byNumber[id] = byNumber[id] || { number: w.number, year: w.year, from: w.from, to: w.to, runs: [] }).runs.push({ record: run.record, date: run.date });
    });
    return Object.keys(byNumber).map(function (id) {
      var w = byNumber[id]; w.key = 'stats/week-' + w.number; w.path = '/stats/week-' + w.number; return w;
    }).sort(function (a, b) { return a.year - b.year || a.number - b.number; });
  }
  /* The time axis of the stats stage and its tabs: every week from the first run's to the week of `today` (an ISO date), oldest first, at most
     `max` of them (the newest). A week with no run has key null: it has no page, and it is drawn empty. */
  function statsTimeline(today, max, live) {
    var weeks = statsWeeks(live), now = isoWeek(today), out = [];
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
  /* `to` (2026-11-05): the family is retired, and each of its keys opens that page; `query` names the key's own section by
     its slug (resolutions/files opens /resolutions?s=files), or by its whole key with `whole` (concept/depth opens
     /learnings?open=concept/depth). `keep` (here and in RETIRED): Notes opens that page in place by its own catalog
     entry (ArkUI.loadPage), so the entry keeps its own module and scripts and only its address moves. */
  var FAMILIES = [
    { prefix: 'resolutions/', journey: null, to: 'fxn/apps' },
    /* 2026-11-10 (owner): the articles are history ("nobody wants to know previous data"); each opens Learn. The files stay. */
    { prefix: 'article/', journey: null, to: 'learn' },
    { prefix: 'concept/', journey: null, to: 'learn' }
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
    retired: function () { return copy(RETIRED); },
    row: function (key) { var r = row(key); return r ? copy(r) : null; },
    statsRuns: function () { return copy(STATS_RUNS); },
    statsWeeks: function (live) { return copy(statsWeeks(live)); },
    statsTimeline: statsTimeline,
    isoWeek: isoWeek,
    journeyOf: journeyOf,
    /* the portal's 12 topics in the ring's order: [{ slug, key, path }] */
    topics: function () { return TOPICS.map(function (slug) { return { slug: slug, key: 'fxn/' + slug, path: '/fxn/' + slug }; }); }
  };
})();

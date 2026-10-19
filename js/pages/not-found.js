/* The page for an address no page answers (catalog key 'notfound', reached from
   js/ark/page-router.js resolve()).

   Why it exists (2026-10-19, docs/ux-audit/pages.md P8): an unknown path resolved to Home, so a
   mistyped or retired URL silently showed the home page and the visitor was never told that
   what they asked for is not here. A refusal names what it needs (workspace law): this page
   states the failure (no page at this address), the missing thing (the address it was asked
   for, verbatim), and the remedy (the closest real addresses, every journey's way in, Home).
   Nothing here is hand-listed: the closest pages and the ways in are derived from the catalog
   and js/content/site-pages.js. Regressions: tests/not-found-page.cjs,
   tests/browser/site-fixes.mjs. */
(function () {
  'use strict';

  /* Edit distance between two paths: how many single-character changes turn one into the other.
     A mistyped /stast is 2 from /stats; a retired /docs/foo is far from everything. */
  function distance(a, b) {
    var prev = [], cur, i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i];
      for (j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  }

  /* The listed pages (those with a journey) closest to `path`, best first: within an edit
     distance of a third of the address, or sharing its first segment. At most three. */
  function closest(path, catalog) {
    var lower = String(path).toLowerCase(), first = lower.split('/')[1] || '';
    return Object.keys(catalog).filter(function (key) { return catalog[key].journey && catalog[key].path !== '/'; })
      .map(function (key) { var p = catalog[key].path; return { key: key, d: distance(lower, p.toLowerCase()), same: first && p.split('/')[1] === first }; })
      .filter(function (c) { return c.same || c.d <= Math.max(2, Math.floor(lower.length / 3)); })
      .sort(function (a, b) { return a.d - b.d; })
      .slice(0, 3).map(function (c) { return c.key; });
  }

  function name(key) {
    var entry = ArkUI.pageCatalog[key];
    return key === 'zero' ? 'Home' : String(entry.short || entry.title || key).split(' — ')[0];
  }

  /* `was`: the key each element of the hand-built page had (tests/lib/layout-continuity.cjs against
     tests/fixtures/layout-keys/not-found.tsv); reasons in tests/task-pages-blocks.cjs. */
  var H = 'page:/div:1/header:1/div:1', O = 'page:/div:1/section:1';
  var WAS = {
    'not-found-crumbs': { ':root': 'page:/nav:1', 'breadcrumb-item': 'page:/nav:1/a:1', 'breadcrumb-item#2': 'page:/nav:1/span:1' },
    'not-found-hero': { ':root': { key: 'page:/div:1/header:1', self: true }, eyebrow: H + '/p:1', 'hero-lede': H + '/p:2', 'hero-meta': { key: H + '/p:3', self: true },
      'button': O + '/ul:1/li:1/a:1' },
    'not-found-onward': { ':root': { key: O, self: true }, eyebrow: O + '/p:1', 'section-title': O + '/h2:1' },
    'not-found-ways': { 'card-grid': { key: O + '/ul:1', self: true } },
    insert: 'page:/div:2'
  };
  /* each journey's row (the list's rows 2-7; row 1 was Home, now the hero's action) */
  for (var row = 2; row <= 7; row++) {
    var k = row > 2 ? '#' + (row - 1) : '';
    WAS['not-found-ways']['card' + k] = { key: O + '/ul:1/li:' + row, self: true };
    WAS['not-found-ways']['card-title' + k] = O + '/ul:1/li:' + row + '/a:1';
    WAS['not-found-ways']['card-description' + k] = O + '/ul:1/li:' + row + '/span:1';
  }

  /* The page, as Ark blocks (DEFXN polish Wave 3, W3-GUIDE): the refusal is the hero -- the failure
     (no page here), the missing thing (the address asked for, verbatim, as its detail) -- and the
     remedy is the closest real pages and every journey's way in, as cards. All derived from the
     catalog and js/content/site-pages.js. */
  /* only as many row pins as there are journeys (a pin that names nothing is refused) */
  function waysWas(count) {
    var was = { 'card-grid': WAS['not-found-ways']['card-grid'] };
    Object.keys(WAS['not-found-ways']).forEach(function (ref) { var m = /#(\d+)$/.exec(ref); if ((m ? +m[1] : 1) <= count) was[ref] = WAS['not-found-ways'][ref]; });
    return was;
  }
  function spec(asked) {
    var catalog = ArkUI.pageCatalog, near = closest(ArkUI.route.path(), catalog);
    var list = [
      { block: 'breadcrumb', id: 'not-found-crumbs', was: WAS['not-found-crumbs'], props: { label: 'Your place', items: [{ label: 'Home', href: 'route:zero' }, { label: 'Page not found' }] } },
      { block: 'hero', id: 'not-found-hero', was: WAS['not-found-hero'], props: { eyebrow: 'Not found', title: 'No page at this address.', density: 'compact',
        lede: 'Nothing on this site answers the address you opened. It may be mistyped, or the page may have moved.', meta: [{ label: 'You asked for', value: asked }],
        actions: [{ label: 'Home', href: 'route:zero', tone: 'primary' }] } }
    ];
    if (near.length) {
      list.push({ block: 'section-header', id: 'not-found-near', props: { eyebrow: 'Closest addresses', title: 'Did you mean one of these?', level: 2 } });
      list.push({ block: 'card-grid', id: 'not-found-near-list', props: { label: 'Closest addresses', columns: 3, items: near.map(function (key) {
        return { title: name(key), description: catalog[key].path, href: 'route:' + key };
      }) } });
    }
    var ways = [];
    ArkSitePages.journeys().forEach(function (journey) {
      var lead = ArkSitePages.pages().find(function (row) { return row.journey === journey.id && row.lead && catalog[row.key]; });
      if (lead) ways.push({ title: journey.title + ': ' + name(lead.key), description: journey.note, href: 'route:' + lead.key });
    });
    list.push({ block: 'section-header', id: 'not-found-onward', was: WAS['not-found-onward'], props: { eyebrow: 'Ways onward', title: 'Start from one of the site\u2019s journeys', level: 2 } });
    /* every journey's way in: in sight from 601px up; on a phone, under the closest addresses and
       Home, one press away (seven cards were two screens) */
    list.push({ block: 'disclosure', id: 'not-found-ways', was: waysWas(ways.length), props: { foldBelow: 'phone', more: 'Every journey\u2019s way in', less: 'Hide the journeys',
      blocks: [{ block: 'card-grid', props: { label: 'Ways onward', columns: 3, items: ways } }] } });
    list.push({ insert: 'main', was: WAS.insert });
    return list;
  }

  ArkUI.pageModules.notFound = {
    closest: closest,
    spec: spec,
    mount: function (host) {
      var asked = ArkUI.route.path() + (ArkUI.route.search() ? '?' + ArkUI.route.search() : '');
      var page = ArkUI.page(spec(asked), host, { page: 'notfound', titleId: 'not-found-title' });
      var code = page.querySelector('#not-found-hero [data-ark-part="hero-meta"] dd');
      if (code) code.setAttribute('data-not-found-address', '');
      return page;
    }
  };
})();

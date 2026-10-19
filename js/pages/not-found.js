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

  ArkUI.pageModules.notFound = {
    closest: closest,
    mount: function (host) {
      var D = ArkUI.dash, catalog = ArkUI.pageCatalog;
      var asked = ArkUI.route.path() + (ArkUI.route.search() ? '?' + ArkUI.route.search() : '');
      var shell = D.shell({
        pageClass: 'not-found-page', titleId: 'not-found-title',
        crumbs: [{ label: '← Home', key: 'zero' }, { label: 'Page not found' }],
        kicker: 'Not found',
        title: 'No page at this address.',
        lede: 'Nothing on this site answers the address you opened. It may be mistyped, or the page may have moved.'
      });
      var addressLine = D.el('p', 'not-found-address');
      addressLine.appendChild(document.createTextNode('You asked for '));
      var code = D.el('code', null, asked); code.dataset.notFoundAddress = '';
      addressLine.appendChild(code);
      addressLine.appendChild(document.createTextNode('.'));
      shell.headCopy.appendChild(addressLine);

      var near = closest(ArkUI.route.path(), catalog);
      if (near.length) {
        var nearPanel = D.panel('not-found-near', 'Closest addresses', 'Did you mean one of these?');
        var list = D.el('ul', 'not-found-list');
        near.forEach(function (key) {
          var item = D.el('li');
          item.appendChild(D.pageLink(name(key) + ' →', key, 'dash-link'));
          item.appendChild(D.el('span', 'not-found-path', catalog[key].path));
          list.appendChild(item);
        });
        nearPanel.appendChild(list);
        shell.body.appendChild(nearPanel);
      }

      var onward = D.panel('not-found-onward', 'Ways onward', 'Start from one of the site’s journeys');
      var ways = D.el('ul', 'not-found-list');
      var home = D.el('li'); home.appendChild(D.pageLink('← Home', 'zero', 'dash-link')); ways.appendChild(home);
      ArkSitePages.journeys().forEach(function (journey) {
        var lead = ArkSitePages.pages().find(function (row) { return row.journey === journey.id && row.lead && catalog[row.key]; });
        if (!lead) return;
        var item = D.el('li');
        item.appendChild(D.pageLink(journey.title + ': ' + name(lead.key) + ' →', lead.key, 'dash-link'));
        item.appendChild(D.el('span', 'not-found-path', journey.note));
        ways.appendChild(item);
      });
      onward.appendChild(ways);
      shell.body.appendChild(onward);

      var components = D.el('div'); components.setAttribute('data-ark-insert', 'main');
      shell.page.appendChild(components);
      host.appendChild(shell.page);
      return shell.page;
    }
  };
})();

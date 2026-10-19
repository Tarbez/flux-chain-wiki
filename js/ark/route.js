/* The one place that knows how this site writes and reads its address.
   Served over http(s) the address is a clean path (/explore, /learnings/<slug>?q=2).
   Opened from disk (file:) a path cannot be a route, so the same routes stay in the
   hash (#/explore). Old links of the form https://host/#/explore are still understood
   and rewritten to the clean path the first time they are opened. */
(function () {
  'use strict';
  var pathMode = typeof location !== 'undefined' && /^https?:$/.test(location.protocol);
  function legacy() { return typeof location !== 'undefined' && /^#\//.test(location.hash) ? location.hash.slice(1) : null; }
  function trim(path) { path = String(path || '/').replace(/\/+$/, ''); return path || '/'; }
  function build(path, search) { return path + (search ? '?' + search : ''); }
  var route = ArkUI.route = {
    pathMode: pathMode,
    /* What to put in an href or the history for a route path such as '/explore'. */
    href: function (path) { return pathMode ? path : '#' + path; },
    /* Current route path without query, e.g. '/learnings/some-slug'. */
    path: function () {
      var old = legacy();
      if (old !== null) return trim(old.split('?')[0]);
      return pathMode ? trim(location.pathname) : trim((location.hash || '').replace(/^#/, '').split('?')[0]);
    },
    /* Current query string without the '?'. */
    search: function () {
      var old = legacy();
      if (old !== null) { var i = old.indexOf('?'); return i < 0 ? '' : old.slice(i + 1); }
      if (pathMode) return location.search.replace(/^\?/, '');
      var hash = location.hash || '', j = hash.indexOf('?');
      return j < 0 ? '' : hash.slice(j + 1);
    },
    /* The value ArkUI's router.resolve() expects for the current address. */
    raw: function () {
      var old = legacy();
      if (old !== null) return '#' + old;
      return pathMode ? trim(location.pathname) : location.hash;
    },
    /* True while the address is still an old #/route link that should become a clean path. */
    isLegacyHash: function () { return pathMode && legacy() !== null; },
    current: function () { return build(route.path(), route.search()); },
    /* The query an in-site link carries: its explicit data-route-query, else the query already
       in its href. js/hero-motion.js rewrites every [data-scene-link] href on mount and passes
       the query on click; before 2026-10-19 both read data-route-query only, and no document
       link sets it -- js/ark/dash-kit.js docHref() and the pages' string-built links put the doc
       in the href (`/reference?doc=...&from=...`) -- so the rewrite stripped every doc link to
       bare /reference and the reader fell back to agreements.md: 71 evidence links on 41 routes
       opened the same unrelated document, and "Return to the explanation" went Home
       (docs/ux-audit/pages.md P1; regressions: tests/scene-link-query.cjs,
       tests/browser/site-fixes.mjs). */
    linkQuery: function (link) {
      if (link.dataset && link.dataset.routeQuery) return link.dataset.routeQuery;
      var href = (link.getAttribute && link.getAttribute('href')) || '', at = href.indexOf('?');
      return at < 0 ? '' : href.slice(at + 1).split('#')[0];
    },
    /* Write a route: push (default) or replace. A no-op when the address is already right. */
    write: function (path, search, mode) {
      var destination = route.href(build(path, search));
      var now = pathMode ? location.pathname + location.search : location.hash;
      if (now === destination && !route.isLegacyHash()) return;
      history[mode === 'replace' ? 'replaceState' : 'pushState'](null, '', destination);
    }
  };
})();

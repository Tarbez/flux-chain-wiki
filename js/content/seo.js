/* =====================================================================
   SEO (admin-editable page/article titles, descriptions, social images,
   canonical URLs, and the site's base URL)
   ---------------------------------------------------------------------
   Every route search engines and social previews see needs a <title> and
   a meta description; this module is the one place those live, editable
   inside that page in admin.html without touching a
   manifest or an article body.

     site      name (used as the " — <name>" suffix and the sitemap's
               default host), baseUrl (an absolute origin, e.g.
               "https://flux-chain.example" -- required for sitemap.xml/
               robots.txt to be generated at all; blank means "skip
               them", never a guessed host), defaultDescription (used
               when a page or article sets no override of its own).
     pages     per-page override, keyed by the SAME id ArkManifest uses
               for manifest-backed pages (home, about, concept, and every
               theory page), plus manifest-less experiment, notes, and
               lifecycle routes. Each entry: title, description,
               ogImage (an absolute URL or a path, made absolute with
               baseUrl), canonical (same rule).
     articles  per-article override, keyed by LearningContent's slug.

   Blank title/description means "derive it" (js/pages/catalog.js's
   ArkSEO.pageTitle/resolvePage/resolveArticle do the deriving) -- this
   file never guesses a value, it only remembers an explicit override.

   get() returns null only before the data file below has run at all
   (never in the shipped site, where seo-data.js always calls define(),
   even with {} -- which sanitizes to every page/article at "derive it").
   ===================================================================== */
var ArkSEO = (function () {
  'use strict';

  /* Pages with no manifest of their own: their copy is not admin-editable
     text, but their SEO title/description still are. */
  var EXTRA_PAGES = [
    { id: 'proximity', label: 'Interactive model' },
    { id: 'lab', label: 'Interactive model' },
    { id: 'learnings', label: 'Notes' },
    { id: 'explorer', label: 'Mesh Explorer' },
    { id: 'account', label: 'Your account' },
    { id: 'treasury', label: 'Treasury preview' },
    { id: 'deposits', label: 'Deposit preview' },
    { id: 'lifecycle', label: 'Agreement lifecycle' },
    { id: 'lifecycle/intent', label: 'Intent / Agreement lifecycle' },
    { id: 'lifecycle/offer', label: 'Offer / Agreement lifecycle' },
    { id: 'lifecycle/agreement', label: 'Agreement / Agreement lifecycle' },
    { id: 'lifecycle/fulfillment', label: 'Fulfillment / Agreement lifecycle' },
    { id: 'lifecycle/receipt', label: 'Receipt / Agreement lifecycle' }
  ];

  /* Every call here takes an optional explicit manifests/articles list, used where the
     live ArkManifest/LearningContent registries are not populated (site-bundle.mjs reads
     and writes a site object headlessly, never loading every content file into one
     registry) -- omit it in the browser, where those registries are the live content. */
  function pageEntries(manifests) {
    var list = manifests || (typeof ArkManifest !== 'undefined' ? ArkManifest.all() : []);
    /* group 'site' (e.g. nav) is shared chrome text, not a route of its own. */
    var out = [];
    list.filter(function (m) { return m.group !== 'site'; }).forEach(function (manifest) {
      out.push({ id: manifest.id, label: manifest.title });
      if (manifest.id !== 'resolutions') return;
      Object.keys(manifest.fields).forEach(function (role) {
        var field = manifest.fields[role];
        if (/^[A-Z]+\.TITLE$/.test(role) && field && field.label === 'Title') {
          out.push({ id: 'resolutions/' + role.split('.')[0].toLowerCase(), label: field.value });
        }
      });
    });
    return out.concat(EXTRA_PAGES);
  }
  function pageIds(manifests) { return pageEntries(manifests).map(function (p) { return p.id; }); }
  function articleSlugs(articles) {
    var list = articles || (typeof LearningContent !== 'undefined' ? LearningContent.articles : []);
    return list.map(function (a) { return a.slug; });
  }

  function sanitizeSite(s) {
    var baseUrl = s && typeof s.baseUrl === 'string' ? s.baseUrl.trim().replace(/\/+$/, '') : '';
    return {
      name: (s && typeof s.name === 'string' && s.name) || 'DEFXN',
      baseUrl: /^https?:\/\/[^/]+$/.test(baseUrl) ? baseUrl : '',
      defaultDescription: (s && typeof s.defaultDescription === 'string') ? s.defaultDescription : ''
    };
  }
  function sanitizeOverride(o) {
    return { title: (o && typeof o.title === 'string') ? o.title : '',
             description: (o && typeof o.description === 'string') ? o.description : '',
             ogImage: (o && typeof o.ogImage === 'string') ? o.ogImage.trim() : '',
             canonical: (o && typeof o.canonical === 'string') ? o.canonical.trim() : '' };
  }
  function sanitizeMap(map, ids) {
    var out = {};
    ids.forEach(function (id) { out[id] = sanitizeOverride(map && map[id]); });
    return out;
  }

  function sanitize(whole, manifests, articles) {
    return { site: sanitizeSite(whole && whole.site), pages: sanitizeMap(whole && whole.pages, pageIds(manifests)), articles: sanitizeMap(whole && whole.articles, articleSlugs(articles)) };
  }
  function defaults() { return sanitize({}); }
  function problems(whole) { if (!whole || typeof whole !== 'object') return ['seo must be an object']; return []; }

  var current = null;
  function define(whole) { current = sanitize(whole || {}); }
  function get() { return current ? JSON.parse(JSON.stringify(current)) : null; }

  /* '<page title> — <site name>', or just the site name for the home page
     (id 'home') -- the one spot every <title> in the site is built, so the
     admin's blank-means-derive rule only has to be true here. */
  function pageTitle(id, fallbackLabel) {
    var whole = get() || defaults();
    var override = (whole.pages[id] || {}).title;
    if (override) return override;
    if (id === 'home') return whole.site.name;
    return (fallbackLabel || id) + ' — ' + whole.site.name;
  }
  function articleTitle(slug, fallbackLabel) {
    var whole = get() || defaults();
    var override = (whole.articles[slug] || {}).title;
    if (override) return override || fallbackLabel;
    return (fallbackLabel || slug) + ' — ' + whole.site.name;
  }
  function pageDescription(id, fallbackText) {
    var whole = get() || defaults();
    var override = (whole.pages[id] || {}).description;
    return override || fallbackText || whole.site.defaultDescription;
  }
  function articleDescription(slug, fallbackText) {
    var whole = get() || defaults();
    var override = (whole.articles[slug] || {}).description;
    return override || fallbackText || whole.site.defaultDescription;
  }

  /* og:image / canonical overrides, blank when unset. Both are emitted only
     when they can be made absolute (an http(s) value, or a path plus the
     site's base URL) -- a relative URL is no use to a scraper and a guessed
     host is never invented. */
  function absoluteUrl(value) {
    var whole = get() || defaults();
    if (/^https?:\/\//.test(value)) return value;
    if (value.charAt(0) === '/' && whole.site.baseUrl) return whole.site.baseUrl + value;
    return '';
  }
  function ogImage(map, id) {
    var whole = get() || defaults();
    return absoluteUrl(((whole[map] || {})[id] || {}).ogImage || '');
  }
  function canonical(map, id) {
    var whole = get() || defaults();
    return absoluteUrl(((whole[map] || {})[id] || {}).canonical || '');
  }

  /* Every route a search engine should be told about: the fixed pages,
     every resolution, theory page, and article -- exactly what js/pages/catalog.js
     registers, without needing it loaded (site-bundle.mjs runs headless). */
  function routes(manifests, articles) {
    var out = [{ path: '/' }, { path: '/experiments' }, { path: '/experiments/lab' }, { path: '/learnings' }, { path: '/explore' }, { path: '/account' }, { path: '/treasury' }, { path: '/deposits' }, { path: '/about' }, { path: '/concept' }];
    EXTRA_PAGES.filter(function (page) { return page.id.indexOf('lifecycle') === 0; }).forEach(function (page) { out.push({ path: '/' + page.id }); });
    (manifests || []).filter(function (m) { return m.group !== 'site' && m.route; }).forEach(function (m) {
      if (!out.some(function (entry) { return entry.path === m.route; })) out.push({ path: m.route });
    });
    pageEntries(manifests).filter(function (page) { return page.id.indexOf('resolutions/') === 0; }).forEach(function (page) {
      out.push({ path: '/' + page.id });
    });
    (articles || []).forEach(function (a) { out.push({ path: '/learnings/' + a.slug }); });
    return out;
  }

  /* sitemap.xml text, or null when no baseUrl is set -- never emit URLs
     built from a guessed host. */
  function sitemap(whole, manifests, articles) {
    var site = sanitizeSite(whole && whole.site);
    if (!site.baseUrl) return null;
    var urls = routes(manifests, articles).map(function (r) {
      return '  <url><loc>' + site.baseUrl + r.path + '</loc></url>';
    }).join('\n');
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '\n</urlset>\n';
  }

  function robots(whole) {
    var site = sanitizeSite(whole && whole.site);
    return 'User-agent: *\nAllow: /\n' + (site.baseUrl ? '\nSitemap: ' + site.baseUrl + '/sitemap.xml\n' : '');
  }

  function serialize(whole, manifests, articles) {
    return '/* Live-tunable page/article titles, descriptions, social images, canonical URLs and\n' +
      '   the site\'s base URL (used to generate sitemap.xml/robots.txt). Edit these in\n' +
      '   each page in admin.html; this file is not meant for hand editing. */\n' +
      'ArkSEO.define(' + JSON.stringify(sanitize(whole, manifests, articles), null, 2) + ');\n';
  }

  return { pageEntries: pageEntries, pageIds: pageIds, articleSlugs: articleSlugs, defaults: defaults, sanitize: sanitize,
           problems: problems, define: define, get: get, pageTitle: pageTitle, articleTitle: articleTitle,
           pageDescription: pageDescription, articleDescription: articleDescription, ogImage: ogImage, canonical: canonical, routes: routes, sitemap: sitemap,
           robots: robots, serialize: serialize };
})();

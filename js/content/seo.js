/* =====================================================================
   SEO (admin-editable page/article titles, descriptions, social images,
   canonical URLs, structured data, search/AI visibility, and the site's
   base URL, language, owner and AI-crawler policy)
   ---------------------------------------------------------------------
   Every route search engines and social previews see needs a <title> and
   a meta description; this module is the one place those live, editable
   inside that page in admin.html without touching a
   manifest or an article body.

     site      name (used as the " — <name>" suffix and the sitemap's
               default host), baseUrl (an absolute origin, e.g.
               "https://flux-chain.example" -- required for sitemap.xml/
               llms.txt to be generated at all; blank means "skip them",
               never a guessed host), defaultDescription (used when a
               page or article sets no override of its own), lang (an
               IETF tag like "en" or "en-US", for <html lang> and
               og:locale-style use), org (schema.org type for the site's
               publisher/owner node: Organization, LocalBusiness or
               Person), handle (a social handle, e.g. "@yourstudio", for
               twitter:site), bots (a map of AI crawler user-agent name
               to "block", enforced in robots.txt -- absent/not "block"
               means allowed), llms (0 turns llms.txt off entirely;
               anything else, including unset, means "publish it").
     pages     per-page override, keyed by the SAME id ArkManifest uses
               for manifest-backed pages (home, about, concept, and every
               theory page), plus manifest-less experiment, notes, and
               lifecycle routes. Each entry: title, description,
               ogImage (an absolute URL or a path, made absolute with
               baseUrl), canonical (same rule), schemaType (a schema.org
               @type for this page's JSON-LD; blank means "derive it from
               the route kind"), noindex (true hides the page from
               regular search, via a robots meta tag, and from
               sitemap.xml/llms.txt), aiSummary (a short, quotable answer
               for AI assistants -- goes into llms.txt and the page's
               JSON-LD "abstract"; blank falls back to the description),
               aiBlocked (true disallows this one page for the AI
               crawlers that are otherwise allowed, in robots.txt, and
               drops it from llms.txt).
     articles  per-article override, same shape as pages, keyed by
               LearningContent's slug.

   Blank title/description means "derive it" (js/pages/catalog.js's
   ArkSEO.pageTitle/resolvePage/resolveArticle do the deriving) -- this
   file never guesses a value, it only remembers an explicit override.

   get() returns null only before the data file below has run at all
   (never in the shipped site, where seo-data.js always calls define(),
   even with {} -- which sanitizes to every page/article at "derive it").
   ===================================================================== */
var ArkSEO = (function () {
  'use strict';

  /* [user-agent, isTrainingBot] -- the AI crawlers a site owner can name in
     robots.txt. isTrainingBot marks the ones that scrape to train a model
     (as opposed to answering a live user request or indexing for search),
     since "allow answers, block training" is a meaningfully different
     policy from "block everything" or "allow everything". */
  /* [user-agent, isTrainingBot, who runs it and what for]. The third column is what an
     editor reads next to each bot's allow/block control -- kept here, beside the name it
     describes, so the admin never carries a second copy of this list. */
  var AI_BOTS = [
    ['GPTBot', 1, 'OpenAI · trains models'], ['OAI-SearchBot', 0, 'ChatGPT search answers'], ['ChatGPT-User', 0, 'ChatGPT reading a page for a user'],
    ['ClaudeBot', 1, 'Anthropic · trains models'], ['Claude-SearchBot', 0, 'Claude search answers'], ['Claude-User', 0, 'Claude reading a page for a user'],
    ['PerplexityBot', 0, 'Perplexity answers'], ['Google-Extended', 1, 'Gemini training and grounding'], ['Applebot-Extended', 1, 'Apple Intelligence training'],
    ['CCBot', 1, 'Common Crawl dataset'], ['Bytespider', 1, 'ByteDance training'], ['meta-externalagent', 1, 'Meta AI training']
  ];
  var SCHEMA_TYPES = ['WebPage', 'WebSite', 'Article', 'FAQPage', 'AboutPage', 'ContactPage', 'CollectionPage'];
  var ORG_TYPES = ['Organization', 'LocalBusiness', 'Person'];

  /* THE FIELD DEFINITIONS. Each stored SEO field is declared once, here, and both halves of
     its life are derived from that one entry: sanitizeSite()/sanitizeOverride() below build
     the stored object by walking these lists (so the stored key order IS this order -- it is
     what seo-data.js is serialized in, so reordering an entry rewrites that file), and the
     admin's SEO panels build one control per entry from the same list. Before this existed
     the fields were spelled out in sanitize AND hand-listed in the editor, and when the
     editor was rebuilt (the 2026-10-17 Studio merge) every field it forgot -- schemaType,
     aiSummary, canonical, noindex, lang, org, handle, llms, the bot policy -- silently stayed
     in the file with no way to change it. A field added here gets a control for free.

       kind     how a raw value is cleaned (CLEAN below) and which control edits it
       options  the allowed values, for 'enum'
       fallback the value a missing/invalid entry becomes ('' when absent)
       group    which panel section it sits in (site fields only: 'site' or 'ai')
       needs    what a value that cleans to something else was missing -- shown to the
                editor instead of silently storing the fallback */
  var OVERRIDE_FIELDS = [
    { key: 'title', kind: 'text', label: 'Title', placeholder: 'Blank derives it from the page title' },
    { key: 'description', kind: 'longtext', label: 'Description', placeholder: 'Blank uses the site default description' },
    { key: 'ogImage', kind: 'url', label: 'Social image', placeholder: '/assets/share.png or https://...' },
    { key: 'canonical', kind: 'url', label: 'Canonical URL', placeholder: '/about or https://...' },
    { key: 'schemaType', kind: 'enum', options: SCHEMA_TYPES, label: 'Structured data type', blankLabel: 'Derive from the route' },
    { key: 'noindex', kind: 'flag', label: 'Hide from search' },
    { key: 'aiSummary', kind: 'longtext', label: 'AI summary', placeholder: 'A short, quotable answer; blank uses the description' },
    { key: 'aiBlocked', kind: 'flag', label: 'Hide from AI crawlers' }
  ];
  var SITE_FIELDS = [
    { key: 'name', kind: 'text', fallback: 'DEFXN', group: 'site', label: 'Site name' },
    { key: 'baseUrl', kind: 'origin', group: 'site', label: 'Base URL', placeholder: 'https://example.com (blank skips sitemap.xml/llms.txt)', needs: 'an http(s) origin with no path, such as https://example.com' },
    { key: 'defaultDescription', kind: 'longtext', group: 'site', label: 'Default description' },
    { key: 'lang', kind: 'pattern', pattern: /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/, fallback: 'en', group: 'site', label: 'Language', placeholder: 'en or en-US', needs: 'a lowercase language tag such as en or en-US' },
    { key: 'org', kind: 'enum', options: ORG_TYPES, fallback: 'Organization', group: 'site', label: 'Published by' },
    { key: 'handle', kind: 'url', group: 'site', label: 'Social handle', placeholder: '@yourstudio' },
    { key: 'bots', kind: 'policy', group: 'ai', label: 'AI crawlers' },
    { key: 'llms', kind: 'onoff', group: 'ai', label: 'llms.txt' }
  ];
  var CLEAN = {
    text: function (v, f) { return typeof v === 'string' && (v || f.fallback == null) ? v : (f.fallback || ''); },
    longtext: function (v) { return typeof v === 'string' ? v : ''; },
    url: function (v) { return typeof v === 'string' ? v.trim() : ''; },
    origin: function (v) { var b = typeof v === 'string' ? v.trim().replace(/\/+$/, '') : ''; return /^https?:\/\/[^/]+$/.test(b) ? b : ''; },
    pattern: function (v, f) { return typeof v === 'string' && f.pattern.test(v) ? v : f.fallback; },
    enum: function (v, f) { return f.options.indexOf(v) >= 0 ? v : (f.fallback || ''); },
    flag: function (v) { return !!v; },
    onoff: function (v) { return v === 0 ? 0 : 1; },
    /* a map of bot name -> 'block'; absent means allowed, and only named AI_BOTS count */
    policy: function (v) { var out = {}; if (v && typeof v === 'object') AI_BOTS.forEach(function (bot) { if (v[bot[0]] === 'block') out[bot[0]] = 'block'; }); return out; }
  };
  function cleanFields(fields, raw) {
    var out = {};
    fields.forEach(function (f) { out[f.key] = CLEAN[f.kind](raw ? raw[f.key] : undefined, f); });
    return out;
  }

  /* Pages with no manifest of their own: their copy is not admin-editable
     text, but their SEO title/description still are. */
  var EXTRA_PAGES = [
    { id: 'proximity', path: '/experiments', label: 'Interactive model' },
    { id: 'lab', path: '/experiments/lab', label: 'Interactive model controls' },
    { id: 'learnings', path: '/learnings', label: 'Notes' },
    { id: 'explorer', path: '/explore', label: 'Mesh Explorer' },
    { id: 'palette', path: '/palette', label: 'Palette' },
    { id: 'resolvers', path: '/resolvers', label: 'FXN resolvers' },
    { id: 'account', path: '/account', label: 'Your account' },
    { id: 'account/domains', path: '/account/domains', label: 'Your domains' },
    { id: 'treasury', path: '/treasury', label: 'Treasury preview' },
    { id: 'deposits', path: '/deposits', label: 'Deposit preview' },
    { id: 'stats', path: '/stats', label: 'Mesh performance' },
    { id: 'stats/gpu', path: '/stats/gpu', label: 'GPU benchmark detail', sitemap: false },
    { id: 'stats/ledger', path: '/stats/ledger', label: 'Ledger benchmark detail', sitemap: false },
    { id: 'how/ask', path: '/how-deployment-works/ask', label: 'State the request', sitemap: false },
    { id: 'how/work', path: '/how-deployment-works/work', label: 'Agree on the terms', sitemap: false },
    { id: 'how/check', path: '/how-deployment-works/check', label: 'Verify the result', sitemap: false },
    { id: 'reference', path: '/reference', label: 'Canonical reference', sitemap: false },
    { id: 'lifecycle', path: '/lifecycle', label: 'Agreement lifecycle' },
    { id: 'lifecycle/intent', path: '/lifecycle/intent', label: 'Intent / Agreement lifecycle' },
    { id: 'lifecycle/offer', path: '/lifecycle/offer', label: 'Offer / Agreement lifecycle' },
    { id: 'lifecycle/agreement', path: '/lifecycle/agreement', label: 'Agreement / Agreement lifecycle' },
    { id: 'lifecycle/fulfillment', path: '/lifecycle/fulfillment', label: 'Fulfillment / Agreement lifecycle' },
    { id: 'lifecycle/receipt', path: '/lifecycle/receipt', label: 'Receipt / Agreement lifecycle' }
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

  /* Both walk the field definitions above (cleanFields) -- see that comment for why. */
  function sanitizeSite(s) { return cleanFields(SITE_FIELDS, s); }
  function sanitizeOverride(o) { return cleanFields(OVERRIDE_FIELDS, o); }
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
  function pageTitle(id, fallbackLabel) { return pageTitleIn(get() || defaults(), id, fallbackLabel); }
  function articleTitle(slug, fallbackLabel) { return articleTitleIn(get() || defaults(), slug, fallbackLabel); }
  /* The same rules against an explicit settings object. llmsTxt() needs these: it used to call
     pageTitle()/articleTitle(), which read the REGISTERED settings (define()), not the `whole` it
     was given -- so the same settings produced two llms.txt files: the editor's (settings
     registered) used the owner's title overrides, while publish/pull (scripts/lib/site-bundle.mjs
     runs this file with nothing registered) silently dropped every one. */
  function pageTitleIn(whole, id, fallbackLabel) {
    var override = (whole.pages[id] || {}).title;
    if (override) return override;
    if (id === 'home') return whole.site.name;
    return (fallbackLabel || id) + ' — ' + whole.site.name;
  }
  function articleTitleIn(whole, slug, fallbackLabel) {
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
  /* The remaining per-page overrides: a schema.org type for this page's JSON-LD (falling
     back to whatever the caller already knows the route kind to be), whether it's hidden
     from search/AI entirely, and the short answer an assistant can quote. */
  function schemaType(map, id, fallback) {
    var whole = get() || defaults(), override = ((whole[map] || {})[id] || {}).schemaType;
    return override || fallback || 'WebPage';
  }
  function noindex(map, id) {
    var whole = get() || defaults();
    return !!((whole[map] || {})[id] || {}).noindex;
  }
  function aiBlocked(map, id) {
    var whole = get() || defaults();
    return !!((whole[map] || {})[id] || {}).aiBlocked;
  }
  function aiSummary(map, id, fallbackText) {
    var whole = get() || defaults(), override = ((whole[map] || {})[id] || {}).aiSummary;
    return override || fallbackText || whole.site.defaultDescription;
  }
  function site() { return (get() || defaults()).site; }

  /* Every route a search engine should be told about: the fixed pages,
     every resolution, theory page, and article -- exactly what js/pages/catalog.js
     registers, without needing it loaded (site-bundle.mjs runs headless). Each entry
     carries the id/slug its SEO override is keyed by (besides 'path', the only field
     the one other caller -- js/admin/admin.js's studioRoutes() -- reads), so sitemap()/
     robots()/llmsTxt() can tell a noindex/AI-blocked route apart from a visible one. */
  function routes(manifests, articles) {
    var out = [{ path: '/', id: 'home' }];
    EXTRA_PAGES.filter(function (page) { return page.sitemap !== false; }).forEach(function (page) { if (!out.some(function (entry) { return entry.path === page.path; })) out.push({ path: page.path, id: page.id }); });
    (manifests || []).filter(function (m) { return m.group !== 'site' && m.route; }).forEach(function (m) {
      if (!out.some(function (entry) { return entry.path === m.route; })) out.push({ path: m.route, id: m.id });
    });
    pageEntries(manifests).filter(function (page) { return page.id.indexOf('resolutions/') === 0; }).forEach(function (page) {
      out.push({ path: '/' + page.id, id: page.id });
    });
    (articles || []).forEach(function (a) { out.push({ path: '/learnings/' + a.slug, slug: a.slug, lastmod: a.reviewed }); });
    return out;
  }
  function routeOverride(full, r) { return r.slug ? full.articles[r.slug] : (r.id ? full.pages[r.id] : null); }

  /* sitemap.xml text, or null when no baseUrl is set -- never emit URLs built from a
     guessed host. A noindex route is left out: it should not be, since a sitemap is a
     list of pages asking to be indexed. */
  function sitemap(whole, manifests, articles) {
    var site = sanitizeSite(whole && whole.site);
    if (!site.baseUrl) return null;
    var full = sanitize(whole, manifests, articles);
    var urls = routes(manifests, articles).filter(function (r) { var o = routeOverride(full, r); return !(o && o.noindex); }).map(function (r) {
      return '  <url>\n    <loc>' + site.baseUrl + r.path + '</loc>' + (r.lastmod ? '\n    <lastmod>' + r.lastmod + '</lastmod>' : '') + '\n  </url>';
    }).join('\n');
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '\n</urlset>\n';
  }

  /* robots.txt: a site-wide "block" for a given AI crawler disallows it entirely; short of
     that, a page marked aiBlocked is disallowed just for the crawlers that are otherwise
     open. Noindex is not a robots.txt concern (Disallow stops a page being crawled at all,
     which also hides the noindex meta tag the page would otherwise be crawled to see) --
     it is handled as a <meta name="robots"> tag instead, by the page itself at render time. */
  function robots(whole, manifests, articles) {
    var site = sanitizeSite(whole && whole.site);
    var full = sanitize(whole, manifests, articles);
    var hidden = routes(manifests, articles).filter(function (r) { var o = routeOverride(full, r); return o && o.aiBlocked; }).map(function (r) { return r.path === '/' ? '/$' : r.path; });
    var lines = [];
    AI_BOTS.forEach(function (bot) {
      var name = bot[0];
      if (site.bots[name] === 'block') { lines.push('User-agent: ' + name, 'Disallow: /', ''); }
      else if (hidden.length) { lines.push('User-agent: ' + name); hidden.forEach(function (h) { lines.push('Disallow: ' + h); }); lines.push('Allow: /', ''); }
    });
    lines.push('User-agent: *', 'Allow: /');
    if (site.baseUrl) lines.push('', 'Sitemap: ' + site.baseUrl + '/sitemap.xml');
    return lines.join('\n') + '\n';
  }

  /* llms.txt: a plain-text map of the site for AI assistants (llmstxt.org), one line per
     visible page/article with its quotable summary. site.llms === 0 turns it off outright;
     no baseUrl means no absolute links to publish, same rule as sitemap(). A noindex or
     AI-blocked route is left out, consistent with sitemap.xml and robots.txt. */
  function llmsTxt(whole, manifests, articles) {
    var site = sanitizeSite(whole && whole.site);
    if (site.llms === 0) return '# llms.txt is turned off for this site.\n';
    if (!site.baseUrl) return null;
    var full = sanitize(whole, manifests, articles);
    var labelById = {}; pageEntries(manifests).forEach(function (p) { labelById[p.id] = p.label; });
    var pageLines = [], articleLines = [];
    routes(manifests, articles).forEach(function (r) {
      var o = routeOverride(full, r);
      if (o && (o.noindex || o.aiBlocked)) return;
      var title = r.slug ? articleTitleIn(full, r.slug, r.slug) : pageTitleIn(full, r.id, labelById[r.id] || r.id);
      var summary = (o && (o.aiSummary || o.description)) || site.defaultDescription;
      var line = '- [' + title + '](' + site.baseUrl + r.path + ')' + (summary ? ': ' + summary : '');
      (r.slug ? articleLines : pageLines).push(line);
    });
    return '# ' + site.name + '\n\n> ' + (site.defaultDescription || '') + '\n\n## Pages\n\n' + pageLines.join('\n') + '\n' +
      (articleLines.length ? '\n## Articles\n\n' + articleLines.join('\n') + '\n' : '');
  }

  /* The site-root files derived from the SEO settings AND the pages and articles, as
     { 'sitemap.xml', 'robots.txt', 'llms.txt' } -> text, or null for "do not write it" (no
     baseUrl yet means no sitemap.xml and no llms.txt -- never a guessed host -- while
     robots.txt always ships: a bare "Allow: /" is harmless without one).
     The ONE answer to "which root files does this site have, with what text": the admin's
     Save and Delete (js/admin/store.js saveSearchFiles) and publish/pull
     (scripts/lib/site-bundle.mjs projectFiles) both take it from here. Until 2026-10-18 only
     publish/pull generated them, so a connected project's robots.txt/llms.txt went stale
     after every SEO edit until the next publish. */
  function searchFiles(whole, manifests, articles) {
    return { 'sitemap.xml': sitemap(whole, manifests, articles), 'robots.txt': robots(whole, manifests, articles), 'llms.txt': llmsTxt(whole, manifests, articles) };
  }

  function serialize(whole, manifests, articles) {
    return '/* Live-tunable page/article titles, descriptions, social images, canonical URLs,\n' +
      '   structured data, search/AI visibility, and the site\'s base URL, language, owner\n' +
      '   and AI-crawler policy (used to generate sitemap.xml/robots.txt/llms.txt). Edit\n' +
      '   these in each page in admin.html; this file is not meant for hand editing. */\n' +
      'ArkSEO.define(' + JSON.stringify(sanitize(whole, manifests, articles), null, 2) + ');\n';
  }

  return { pageEntries: pageEntries, pageIds: pageIds, articleSlugs: articleSlugs, defaults: defaults, sanitize: sanitize,
           problems: problems, define: define, get: get, pageTitle: pageTitle, articleTitle: articleTitle,
           pageDescription: pageDescription, articleDescription: articleDescription, ogImage: ogImage, canonical: canonical,
           schemaType: schemaType, noindex: noindex, aiBlocked: aiBlocked, aiSummary: aiSummary, site: site,
           routes: routes, sitemap: sitemap, robots: robots, llmsTxt: llmsTxt, searchFiles: searchFiles, serialize: serialize,
           /* the field definitions (read-only by convention) the admin builds its SEO controls from */
           OVERRIDE_FIELDS: OVERRIDE_FIELDS, SITE_FIELDS: SITE_FIELDS, AI_BOTS: AI_BOTS, SCHEMA_TYPES: SCHEMA_TYPES, ORG_TYPES: ORG_TYPES,
           /* what one field's raw value is stored as -- the same rule sanitize() applies */
           cleanField: function (field, value) { return CLEAN[field.kind](value, field); } };
})();

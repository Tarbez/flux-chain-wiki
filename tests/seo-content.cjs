const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
function load(context) {
  vm.runInContext(fs.readFileSync('js/content/manifest.js', 'utf8'), context, { filename: 'manifest.js' });
  const ids = fs.readdirSync('js/content/manifests').filter(name=>name.endsWith('.js') && name!=='index.js').map(name=>name.slice(0,-3));
  ids.forEach((id) => vm.runInContext(fs.readFileSync('js/content/manifests/' + id + '.js', 'utf8'), context, { filename: id + '.js' }));
  vm.runInContext(fs.readFileSync('js/content/resolutions.js', 'utf8'), context, { filename: 'resolutions.js' });
  vm.runInContext(fs.readFileSync('js/content/learnings.js', 'utf8'), context, { filename: 'learnings.js' });
  vm.runInContext(fs.readFileSync('js/content/article-index.js', 'utf8'), context, { filename: 'article-index.js' });
  vm.runInContext(fs.readFileSync('js/content/site-pages.js', 'utf8'), context, { filename: 'site-pages.js' });
  vm.runInContext(fs.readFileSync('js/content/seo.js', 'utf8'), context, { filename: 'seo.js' });
}
const context = vm.createContext({});
load(context);
const { ArkManifest, LearningContent, ArkResolutions, ArkSEO } = vm.runInContext('({ ArkManifest, LearningContent, ArkResolutions, ArkSEO })', context);

// pageEntries(): every non-'site'-group manifest plus every catalog-only SEO identity, and never 'nav'.
const pageIds = ArkSEO.pageIds();
assert(pageIds.indexOf('nav') < 0, 'group "site" (shared chrome, e.g. nav) is not a route and is excluded');
const extraIds = ['proximity', 'learnings', 'explorer', 'palette', 'resolvers', 'account', 'account/domains', 'treasury', 'deposits', 'stats', 'stats/gpu', 'stats/ledger', 'how/ask', 'how/work', 'how/check', 'reference', 'lifecycle', ...['intent','offer','agreement','fulfillment','receipt'].map(id=>'lifecycle/'+id), ...ArkResolutions.all().map(item=>'resolutions/'+item.slug)];
assert.equal(JSON.stringify(pageIds.slice().sort()), JSON.stringify(ArkManifest.all().filter((m) => m.group !== 'site').map((m) => m.id).concat(extraIds).sort()), 'pageIds includes manifest-less lifecycle and nested resolution pages');
assert.equal(JSON.stringify(ArkSEO.articleSlugs()), JSON.stringify(LearningContent.articles.map((a) => a.slug)), 'articleSlugs is every article, in order');

// get() is null before define() ever ran.
assert.equal(ArkSEO.get(), null, 'get() is null before a data file calls define()');
const defaults = ArkSEO.defaults();
assert.equal(defaults.site.name, 'DEFXN', 'default site name');
assert.equal(defaults.site.baseUrl, '', 'default base URL is blank -- never a guessed host');
assert.equal(defaults.site.lang, 'en', 'default language');
assert.equal(defaults.site.org, 'Organization', 'default owner type');
assert.equal(defaults.site.handle, '', 'default social handle is blank');
assert.equal(JSON.stringify(defaults.site.bots), '{}', 'default AI crawler policy blocks nobody');
assert.equal(defaults.site.llms, 1, 'llms.txt is on by default');
const DEFAULT_OVERRIDE = { title: '', description: '', ogImage: '', canonical: '', schemaType: '', noindex: false, aiSummary: '', aiBlocked: false };
pageIds.forEach((id) => assert.equal(JSON.stringify(defaults.pages[id]), JSON.stringify(DEFAULT_OVERRIDE), id + ' defaults to "derive it"'));

// sanitize(): a bad baseUrl (no scheme, trailing junk, not http(s)) is refused to blank; a good one survives, trailing slash trimmed.
assert.equal(ArkSEO.sanitize({ site: { baseUrl: 'not a url' } }).site.baseUrl, '', 'a malformed base URL is refused, never passed through');
assert.equal(ArkSEO.sanitize({ site: { baseUrl: 'ftp://example.com' } }).site.baseUrl, '', 'a non-http(s) base URL is refused');
assert.equal(ArkSEO.sanitize({ site: { baseUrl: 'https://example.com/' } }).site.baseUrl, 'https://example.com', 'a trailing slash is trimmed');
assert.equal(ArkSEO.sanitize({ pages: { home: { title: 'Custom title' } } }).pages.home.title, 'Custom title', 'a page title override survives sanitize()');
assert.equal(ArkSEO.sanitize({ pages: { home: { title: 42 } } }).pages.home.title, '', 'a non-string override is refused to blank (derive), never coerced');
assert.equal(Object.keys(ArkSEO.sanitize({ pages: { 'not-a-real-page': { title: 'x' } } }).pages).indexOf('not-a-real-page'), -1, 'an unknown page id is dropped, never carried through');

// define()/get() round-trip through sanitize().
const partial = { site: { name: 'Test Site', baseUrl: 'https://example.com', defaultDescription: 'Fallback text.' }, pages: { home: { title: 'Home override' } } };
ArkSEO.define(partial);
const sanitized = ArkSEO.sanitize(partial);
assert.equal(JSON.stringify(ArkSEO.get()), JSON.stringify(sanitized), 'get() returns exactly what define() sanitized');

// pageTitle/articleTitle: an override wins; blank derives "<label> — <site name>"; 'home' alone skips the label.
assert.equal(ArkSEO.pageTitle('home', 'Home'), 'Home override', 'an explicit override wins');
assert.equal(ArkSEO.pageTitle('about', 'About us'), 'About us — Test Site', 'a derived title is "<label> — <site name>"');
ArkSEO.define({ site: { name: 'Test Site' } });
assert.equal(ArkSEO.pageTitle('home', 'ignored'), 'Test Site', 'the home page derives to just the site name, no " — " suffix');
assert.equal(ArkSEO.articleTitle('some-slug', 'An Article'), 'An Article — Test Site', 'an article title derives the same way');

// pageDescription/articleDescription: override, else the passed fallback, else the site default.
ArkSEO.define({ site: { defaultDescription: 'Site default.' }, pages: { about: { description: 'About override.' } } });
assert.equal(ArkSEO.pageDescription('about', 'fallback text'), 'About override.', 'an explicit description override wins');
assert.equal(ArkSEO.pageDescription('home', 'fallback text'), 'fallback text', 'no override falls back to the passed text');
assert.equal(ArkSEO.pageDescription('home', ''), 'Site default.', 'no override and no fallback text falls back to the site default');

// sitemap(): null without a baseUrl (never a guessed host); real XML with one, listing every route.
assert.equal(ArkSEO.sitemap({ site: {} }, [], []), null, 'no baseUrl means no sitemap.xml, not a guessed host');
const manifests = ArkManifest.all();
const articles = LearningContent.articles;
context.ArkUI={};
context.ArkCopy={text:key=>key};
vm.runInContext(fs.readFileSync('js/pages/catalog.js','utf8'),context);
// /reference is the in-page document viewer: hiddenFromNavigation, no SEO identity of its own, so it is not a public route to list.
const publicEntries=Object.values(context.ArkUI.pageCatalog).filter(entry=>!entry.hiddenFromNavigation);
const catalogPaths=publicEntries.map(entry=>entry.path).sort();
assert.deepEqual(Array.from(ArkSEO.routes(manifests,articles),entry=>entry.path).sort(),catalogPaths,'SEO routes match every live public route exactly once');
for(const entry of publicEntries) if(entry.seoId) assert(pageIds.includes(entry.seoId),'editable SEO exists for '+entry.path);
const xml = ArkSEO.sitemap({ site: { baseUrl: 'https://example.com' } }, manifests, articles);
assert(xml.startsWith('<?xml'), 'sitemap.xml is real XML');
assert(xml.includes('<loc>https://example.com/</loc>'), 'the home route is listed');
assert(xml.includes('<loc>https://example.com/about</loc>'), 'the about route is listed');
manifests.filter((m) => m.group === 'theory').forEach((m) => assert(xml.includes('<loc>https://example.com' + m.route + '</loc>'), 'theory route ' + m.route + ' is listed'));
articles.forEach((a) => assert(xml.includes('<loc>https://example.com/learnings/' + a.slug + '</loc>'), 'article route for ' + a.slug + ' is listed'));

// robots(): always allows everything; the Sitemap line only appears with a baseUrl.
assert.equal(ArkSEO.robots({ site: {} }), 'User-agent: *\nAllow: /\n', 'robots.txt with no baseUrl has no Sitemap line');
assert(ArkSEO.robots({ site: { baseUrl: 'https://example.com' } }).includes('Sitemap: https://example.com/sitemap.xml'), 'robots.txt points at the sitemap once a baseUrl is set');

// schemaType/noindex/aiBlocked/aiSummary: override wins, else the caller's fallback, same
// derive-don't-guess rule as title/description above.
assert.equal(ArkSEO.schemaType('pages', 'home', 'WebSite'), 'WebSite', 'no override falls back to the caller-supplied type');
ArkSEO.define({ pages: { home: { schemaType: 'FAQPage' } } });
assert.equal(ArkSEO.schemaType('pages', 'home', 'WebSite'), 'FAQPage', 'an explicit schema type override wins');
assert.equal(ArkSEO.noindex('pages', 'home'), false, 'noindex defaults to false (indexed)');
ArkSEO.define({ pages: { home: { noindex: true } } });
assert.equal(ArkSEO.noindex('pages', 'home'), true);
assert.equal(ArkSEO.aiBlocked('pages', 'about'), false, 'aiBlocked defaults to false (open)');
ArkSEO.define({ pages: { about: { aiBlocked: true } } });
assert.equal(ArkSEO.aiBlocked('pages', 'about'), true);
ArkSEO.define({ site: { defaultDescription: 'Site fallback.' }, pages: { home: { aiSummary: 'A quotable answer.' } } });
assert.equal(ArkSEO.aiSummary('pages', 'home', 'ignored'), 'A quotable answer.', 'an explicit AI summary wins');
assert.equal(ArkSEO.aiSummary('pages', 'about', ''), 'Site fallback.', 'no AI summary and no passed text falls back to the site default, same as pageDescription');
assert.equal(ArkSEO.site().name, 'DEFXN', 'site() is a convenience accessor for the sanitized site object');

// sitemap(): a noindex route is left out entirely -- a sitemap asks to be indexed.
ArkSEO.define({ pages: { about: { noindex: true } } });
const sitemapNoindex = ArkSEO.sitemap({ site: { baseUrl: 'https://example.com' }, pages: { about: { noindex: true } } }, manifests, articles);
assert(!sitemapNoindex.includes('<loc>https://example.com/about</loc>'), 'a noindex page does not appear in sitemap.xml');
assert(sitemapNoindex.includes('<loc>https://example.com/</loc>'), 'an unrelated page is unaffected');
assert(!sitemapNoindex.includes('<lastmod>undefined</lastmod>'), 'an article with no reviewed date (LearningContent.articles is the lightweight index, not the full loaded body) omits lastmod rather than writing a broken tag');
const withReviewed = ArkSEO.sitemap({ site: { baseUrl: 'https://example.com' } }, manifests, [{ slug: 'x', reviewed: '2026-01-02' }]);
assert(withReviewed.includes('<lastmod>2026-01-02</lastmod>'), 'an article that does carry a reviewed date (the full per-article body admin.js actually passes) gets it as lastmod');

// robots(): a site-wide block disallows everything for that bot; a per-page aiBlocked
// disallows just that page for the bots that are otherwise open.
const blockedBot = ArkSEO.robots({ site: { bots: { GPTBot: 'block' } } });
assert(blockedBot.includes('User-agent: GPTBot\nDisallow: /'), 'a site-wide blocked bot is disallowed entirely');
assert(!/User-agent: ClaudeBot\nDisallow: \/\n/.test(blockedBot), 'a bot not in the block list is unaffected by another bot\'s block');
const perPageBlocked = ArkSEO.robots({ site: {}, pages: { about: { aiBlocked: true } } }, manifests, articles);
assert(perPageBlocked.includes('Disallow: /about'), 'an AI-blocked page is disallowed for the crawlers that are otherwise open');
assert(perPageBlocked.includes('User-agent: *\nAllow: /'), 'the generic crawler line is always present and unrestricted');

// llmsTxt(): off switch, no-baseUrl refusal, and a visible page/article actually listed.
assert.equal(ArkSEO.llmsTxt({ site: { llms: 0 } }), '# llms.txt is turned off for this site.\n', 'llms:0 turns it off outright');
assert.equal(ArkSEO.llmsTxt({ site: {} }), null, 'no baseUrl means no llms.txt, same rule as sitemap.xml');
const llms = ArkSEO.llmsTxt({ site: { baseUrl: 'https://example.com', defaultDescription: 'What this site is.' } }, manifests, articles);
assert(llms.startsWith('# DEFXN\n\n> What this site is.'), 'llms.txt opens with the site name and summary');
assert(llms.includes('## Pages') && llms.includes('https://example.com/about'), 'a visible page is listed under Pages');
if (articles.length) assert(llms.includes('## Articles') && llms.includes('https://example.com/learnings/' + articles[0].slug), 'a visible article is listed under Articles');
if (articles.length && articles[0].title) assert(llms.includes('- [' + articles[0].title + ' — DEFXN](https://example.com/learnings/' + articles[0].slug + ')'), 'an article is listed by its title, not its slug: until 2026-10-19 every article line read as its slug, and the published slug governance-without-a-validator-set reached llms.txt as a title carrying a retired word');
const llmsHidden = ArkSEO.llmsTxt({ site: { baseUrl: 'https://example.com' }, pages: { about: { noindex: true } } }, manifests, articles);
assert(!llmsHidden.includes('https://example.com/about'), 'a noindex page is left out of llms.txt too');

// Regression (2026-10-18): llmsTxt(whole) took its titles from the REGISTERED settings
// (define()) instead of `whole`, so the editor's Save (settings registered) and publish/pull
// (scripts/lib/site-bundle.mjs, nothing registered) wrote two different llms.txt files from the
// same settings -- the pull silently dropped every title override. The output must depend only
// on its arguments, whatever is registered.
const withTitles = { site: { baseUrl: 'https://example.com' }, pages: { home: { title: 'Home, by its owner' }, about: { title: 'About, by its owner' } } };
ArkSEO.define({ pages: { home: { title: 'A registered title that must not leak' } } });
const llmsRegistered = ArkSEO.llmsTxt(withTitles, manifests, articles);
ArkSEO.define({});
const llmsBlank = ArkSEO.llmsTxt(withTitles, manifests, articles);
assert.equal(llmsRegistered, llmsBlank, 'llms.txt depends on its arguments only, not on what define() registered');
assert(llmsBlank.includes('- [Home, by its owner](https://example.com/)') && llmsBlank.includes('- [About, by its owner](https://example.com/about)'), 'the title overrides passed in are the titles llms.txt lists');
assert.deepEqual(Object.keys(ArkSEO.searchFiles(withTitles, manifests, articles)), ['sitemap.xml', 'robots.txt', 'llms.txt'], 'searchFiles() names the three derived root files');
assert.equal(ArkSEO.searchFiles(withTitles, manifests, articles)['llms.txt'], llmsBlank, 'searchFiles() is llmsTxt()/robots()/sitemap(), not a second generator');

// problems() never blocks a well-formed object; only rejects a non-object.
assert.equal(ArkSEO.problems(partial).length, 0, 'a plain object has no problems');
assert(ArkSEO.problems(null).length, 'null is refused');

// serialize()/define() round-trips the exact sanitized object, given the same manifests/articles.
const source = ArkSEO.serialize(partial, manifests, articles);
const context2 = vm.createContext({});
load(context2);
vm.runInContext(source, context2);
const roundTripped = JSON.parse(JSON.stringify(vm.runInContext('ArkSEO.get()', context2)));
assert.equal(JSON.stringify(roundTripped), JSON.stringify(ArkSEO.sanitize(partial, manifests, articles)), 'serialize/define round-trips the exact sanitized object');

// Shipped metadata must cover the actual catalog, not just the test fixtures.
vm.runInContext(fs.readFileSync('js/content/seo-data.js','utf8'),context);
const shipped=ArkSEO.get();
const descriptions=[];
const titles=[];
for(const entry of publicEntries) {
 const metadata=entry.seoArticle?shipped.articles[entry.seoArticle]:shipped.pages[entry.seoId];
 assert(metadata.description.length>=60 && metadata.description.length<=190,'useful, concise description for '+entry.path);
 descriptions.push(metadata.description);
 titles.push(entry.seoArticle?ArkSEO.articleTitle(entry.seoArticle,entry.title):metadata.title);
 if(entry.seoId) assert(metadata.title.endsWith('DEFXN'),'page title names the product: '+entry.path);
}
assert.equal(new Set(descriptions).size,descriptions.length,'each public route has a distinct description');
assert.equal(new Set(titles).size,titles.length,'each public route has a distinct title');
assert.equal(shipped.site.baseUrl,'https://defxn.com','production origin, confirmed by the owner 2026-10-16, not a guessed host');
const html=fs.readFileSync('index.html','utf8');
assert(html.includes('<title>'+shipped.pages.home.title+'</title>'),'static home title matches editable metadata');
assert(html.includes('name="description" content="'+shipped.pages.home.description+'"'),'static home description matches editable metadata');
console.log('PASS: complete route metadata, overrides, sitemap/robots, and serialization.');

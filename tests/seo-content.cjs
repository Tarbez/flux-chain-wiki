const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
function load(context) {
  vm.runInContext(fs.readFileSync('js/content/manifest.js', 'utf8'), context, { filename: 'manifest.js' });
  const ids = ['nav', 'home', 'concept', 'about', 'purpose', 'depth', 'practice', 'notes', 'studio', 'spec'];
  ids.forEach((id) => vm.runInContext(fs.readFileSync('js/content/manifests/' + id + '.js', 'utf8'), context, { filename: id + '.js' }));
  vm.runInContext(fs.readFileSync('js/content/learnings.js', 'utf8'), context, { filename: 'learnings.js' });
  vm.runInContext(fs.readFileSync('js/content/article-index.js', 'utf8'), context, { filename: 'article-index.js' });
  vm.runInContext(fs.readFileSync('js/content/seo.js', 'utf8'), context, { filename: 'seo.js' });
}
const context = vm.createContext({});
load(context);
const { ArkManifest, LearningContent, ArkSEO } = vm.runInContext('({ ArkManifest, LearningContent, ArkSEO })', context);

// pageEntries(): every non-'site'-group manifest, plus the three manifest-less pages, and never 'nav'.
const pageIds = ArkSEO.pageIds();
assert(pageIds.indexOf('nav') < 0, 'group "site" (shared chrome, e.g. nav) is not a route and is excluded');
assert.equal(JSON.stringify(pageIds.slice().sort()), JSON.stringify(ArkManifest.all().filter((m) => m.group !== 'site').map((m) => m.id).concat(['proximity', 'lab', 'learnings']).sort()), 'pageIds is every routed manifest plus the three manifest-less pages');
assert.equal(JSON.stringify(ArkSEO.articleSlugs()), JSON.stringify(LearningContent.articles.map((a) => a.slug)), 'articleSlugs is every article, in order');

// get() is null before define() ever ran.
assert.equal(ArkSEO.get(), null, 'get() is null before a data file calls define()');
const defaults = ArkSEO.defaults();
assert.equal(defaults.site.name, 'Flux Chain', 'default site name');
assert.equal(defaults.site.baseUrl, '', 'default base URL is blank -- never a guessed host');
pageIds.forEach((id) => assert.equal(JSON.stringify(defaults.pages[id]), JSON.stringify({ title: '', description: '' }), id + ' defaults to "derive it"'));

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
const xml = ArkSEO.sitemap({ site: { baseUrl: 'https://example.com' } }, manifests, articles);
assert(xml.startsWith('<?xml'), 'sitemap.xml is real XML');
assert(xml.includes('<loc>https://example.com/</loc>'), 'the home route is listed');
assert(xml.includes('<loc>https://example.com/about</loc>'), 'the about route is listed');
manifests.filter((m) => m.group === 'theory').forEach((m) => assert(xml.includes('<loc>https://example.com' + m.route + '</loc>'), 'theory route ' + m.route + ' is listed'));
articles.forEach((a) => assert(xml.includes('<loc>https://example.com/learnings/' + a.slug + '</loc>'), 'article route for ' + a.slug + ' is listed'));

// robots(): always allows everything; the Sitemap line only appears with a baseUrl.
assert.equal(ArkSEO.robots({ site: {} }), 'User-agent: *\nAllow: /\n', 'robots.txt with no baseUrl has no Sitemap line');
assert(ArkSEO.robots({ site: { baseUrl: 'https://example.com' } }).includes('Sitemap: https://example.com/sitemap.xml'), 'robots.txt points at the sitemap once a baseUrl is set');

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

console.log('PASS: ArkSEO page/article overrides, title/description derivation, sitemap.xml/robots.txt generation, and the serialize/define round-trip.');

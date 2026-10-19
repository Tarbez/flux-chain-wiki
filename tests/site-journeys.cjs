/* Every list that describes the site is derived from one field: each page's journey.

   Named regression (2026-10-19, docs/ux-audit/pages.md P7): the "All pages" menu
   (js/resolvers/header.js), the sitemap's page list (js/content/seo.js EXTRA_PAGES) and the
   catalog's hiddenFromNavigation were three hand-written lists that had drifted: the menu's
   catch-all filed the design mocks /treasury and /deposits and the design-system /palette under
   "Evaluate -- live local mesh data, evidence"; /stats/gpu was in no list at all; and the scene's
   corner navigation, invisible on every route, was the only link to /experiments. Now
   js/content/site-pages.js names each page's journey once and the catalog, menu, footer strip,
   sitemap and llms.txt read it. (The menu itself: tests/navigation-index.cjs.) */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { loadCatalog } = require('./lib/site-catalog.cjs');

const { catalog, sitePages } = loadCatalog();
const journeyIds = sitePages.journeys().map((j) => j.id);
const rows = sitePages.pages();

// one table, every row loaded by the catalog with its journey
for (const row of rows) {
  assert(catalog[row.key], row.key + ' is a catalog route');
  assert.equal(catalog[row.key].path, row.path, row.key + ' path comes from the table');
  assert.equal(catalog[row.key].journey, row.journey, row.key + ' carries its journey');
  assert(row.journey === null || journeyIds.includes(row.journey), row.key + ' names a real journey');
}
for (const key of Object.keys(catalog)) assert('journey' in catalog[key], key + ' has a journey field (null = in no list)');
for (const key of Object.keys(catalog).filter((k) => /^(resolutions|article|concept)\//.test(k))) assert(catalog[key].journey, key + ' gets its family\'s journey');

// the regression itself: previews are previews, never evidence
for (const key of ['treasury', 'deposits', 'palette', 'proximity']) assert.equal(catalog[key].journey, 'preview', key + ' is filed as a preview, not live evidence');
assert.equal(catalog['stats/gpu'].journey, 'prove', '/stats/gpu is in the Prove journey, so it is listed at last');
assert.equal(catalog.reference.journey, null, 'the reference reader is a utility in no list');

// every journey has exactly one way in, and the footer strip and not-found page read it
for (const id of journeyIds) assert.equal(rows.filter((r) => r.journey === id && r.lead).length, 1, id + ' has exactly one lead page');
const hero = fs.readFileSync('js/hero-motion.js', 'utf8');
assert(/ArkSitePages\.journeys\(\)\.forEach/.test(hero) && /row\.lead/.test(hero) && /make\('a', 'site-footer-link'\)/.test(hero), 'the footer strip is derived from the journeys\' lead pages');
assert(!/corner-navigation|theory-invitation|HOME\.CORNER/.test(hero), 'the invisible corner navigation is gone');
// since 2026-10-19 the strip is the section-link row of the family footer (the kit's renderFooter),
// drawn into a host that keeps the strip's class, so its aria-current sync and the browser driver
// still find it
assert(/make\('div', 'site-footer-strip'\)/.test(hero) && /kit\.renderFooter\(foot, kit\.HOME\.id, \{ links: /.test(hero), 'the footer strip is the family footer\'s section links');

// the sitemap: home, then exactly the pages with a journey, the manifests, resolutions and articles
const seoCtx = vm.createContext({});
for (const file of ['js/content/manifest.js', 'js/content/learnings.js', 'js/content/article-index.js', 'js/content/site-pages.js', 'js/content/seo.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), seoCtx);
const seo = fs.readFileSync('js/content/seo.js', 'utf8');
assert(!/var EXTRA_PAGES\s*=/.test(seo), 'no second hand-written page list in seo.js');
const ArkSEO = seoCtx.ArkSEO;
const sitemapPaths = ArkSEO.routes([], []).map((r) => r.path);
const listed = rows.filter((r) => r.journey).map((r) => r.path);
assert.deepEqual([...new Set(sitemapPaths)].sort(), [...new Set(['/', ...listed])].sort(), 'the sitemap lists exactly home and the pages with a journey');
assert(!sitemapPaths.includes('/reference') && !sitemapPaths.includes('/not-found') && !sitemapPaths.includes('/experiments/lab'), 'no utility, not-found or merged-away address');

// seo.js refuses to run without the table rather than silently dropping SEO overrides
const bare = vm.createContext({});
vm.runInContext(fs.readFileSync('js/content/seo.js', 'utf8'), bare);
assert.throws(() => vm.runInContext('ArkSEO.pageIds([])', bare), /site-pages\.js/, 'without the table seo.js names what it needs');

console.log('PASS: ' + rows.length + ' pages, ' + journeyIds.length + ' journeys; catalog, footer strip and sitemap all derived from the one journey field.');

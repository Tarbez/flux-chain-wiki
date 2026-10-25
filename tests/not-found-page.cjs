/* An address no page answers gets a page that says so.

   Named regression (2026-10-19, docs/ux-audit/pages.md P8): js/ark/page-router.js resolve() fell
   back to 'zero', so a mistyped or retired URL silently showed Home and the visitor was never told
   that what they asked for is not here. Workspace law: a refusal names the failure, the missing
   thing and the remedy. The page must name the address verbatim, offer the closest real
   addresses, and every journey's way in -- all derived from the catalog and
   js/content/site-pages.js, never a hand list. The router half is in tests/page-router.cjs. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { loadCatalog } = require('./lib/site-catalog.cjs');

const checks = require('./lib/block-page-checks.cjs');
const { catalog, context } = loadCatalog();
assert(catalog.notfound && catalog.notfound.noindex && !catalog.notfound.journey, 'the not-found page exists, is noindex and is in no list');

/* Since 2026-10-19 (W3-GUIDE) the page is Ark blocks (js/pages/not-found.js): it is booted in the
   real site (jsdom, api/lib/render-core.mjs), never a toy DOM -- blocks need the real DOM API. */
(async () => {
  const seen = await checks.visit('/stats/noww', (window, page) => ({
    text: page.textContent,
    asked: (page.querySelector('[data-not-found-address]') || {}).textContent,
    hrefs: [...page.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'))
  }));
  assert.equal(seen.asked, '/stats/noww', 'it names the address that was asked for, verbatim');
  assert(/No page at this address/.test(seen.text), 'and says plainly that no page answers it');
  assert(seen.hrefs.includes('/stats/now'), 'a one-letter typo offers the page that was meant (2026-10-24: /stats is /stats/now, so the typo is of the new address)');
  assert(seen.hrefs.includes('/'), 'Home is always a way on');
  const leads = context.ArkSitePages.pages().filter((r) => r.lead).map((r) => r.path);
  for (const lead of leads) assert(seen.hrefs.includes(lead), 'every journey\'s way in is offered: ' + lead);
  assert.deepEqual(seen.refused, [], 'no block was refused');
  const ctx = vm.createContext({ ArkSitePages: context.ArkSitePages, ArkUI: { pageModules: {}, pageCatalog: catalog } });
  vm.runInContext(fs.readFileSync('js/pages/not-found.js', 'utf8'), ctx);
  const notFound = ctx.ArkUI.pageModules.notFound;
  assert.deepEqual(Array.from(notFound.closest('/resolutions/finances', catalog)).slice(0, 1), ['resolutions/finance'], 'a near miss inside a family finds its page');
  assert.equal(notFound.closest('/zzzz-qqqq-xxxx', catalog).length, 0, 'an address near nothing offers no false "did you mean"');
  console.log('PASS: an unknown address gets a page that names it, offers the closest real pages and every journey\'s way in.');
})().catch((error) => { console.error(error); process.exit(1); });

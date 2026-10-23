/* The real router catalog, loaded the way index.html loads it (js/content/site-pages.js, then
   js/pages/catalog.js), for tests that check a route's path, module or scripts.

   Why: those tests used to regex the catalog's SOURCE text ("resolutions: { path: '/resolutions'"),
   so the 2026-10-19 change that moved paths and journeys into js/content/site-pages.js broke
   every one of them while the catalog itself was right. Assert on the catalog the site builds,
   not on how its source happens to be spelled. */
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');

function loadCatalog() {
  const context = vm.createContext({ ArkUI: {}, ArkCopy: { text: (key) => key }, console });
  for (const file of ['js/content/learnings.js', 'js/content/article-index.js', 'js/content/resolutions.js', 'js/content/site-pages.js', 'js/pages/catalog.js'])
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  return { catalog: context.ArkUI.pageCatalog, sitePages: context.ArkSitePages, context };
}
module.exports = { loadCatalog };

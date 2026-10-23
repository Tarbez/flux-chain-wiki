'use strict';
/* run-tests-timeout-ms: 1500000 -- two server renders per route, 21 routes. */
/* /resolutions and its 20 detail pages (js/pages/resolutions.js) as a crawler gets them: every
   block server-rendered and styled by the static stylesheets only (no style attribute on a block,
   no injected rule), every folded tab and accordion panel in the HTML with its words, every id
   authored or Ark's reserved ark-r- kind, every aria reference resolving, and two renders
   byte-identical -- the checks every Wave 3 page runs (tests/lib/block-page-checks.cjs). Run alone
   (owner test law); `node tests/resolutions-ssr.cjs /resolutions/finance` checks one route.
   The pages themselves: tests/resolutions-blocks.cjs. */
const checks = require('./lib/block-page-checks.cjs');
const { catalog } = require('./lib/site-catalog.cjs').loadCatalog();

const ROUTES = { '/resolutions': ['resolutions', ['resolutions-', 'resolution-domain-']] };
for (const key of Object.keys(catalog).filter((k) => k.startsWith('resolutions/'))) {
  const slug = key.slice('resolutions/'.length);
  ROUTES['/' + key] = [key, ['resolution-' + slug + '-', 'resolution-title-' + slug]];
}

(async () => {
  const lines = [];
  for (const route of Object.keys(ROUTES).filter((r) => process.argv.length <= 2 || process.argv.slice(2).includes(r))) {
    const [page, idPrefix] = ROUTES[route];
    const { blocks, panels } = await checks.assertServerRender(route, page, { idPrefix });
    lines.push(`${route.replace('/resolutions/', '')} ${blocks}/${panels}`);
  }
  console.log('PASS: every resolution page is server-rendered from blocks, styled statically, folded views present, ids and aria references sound, renders identical (blocks/tab panels: ' + lines.join(', ') + ').');
})().catch((error) => { console.error(error); process.exit(1); });

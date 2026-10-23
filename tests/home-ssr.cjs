'use strict';
/* run-tests-timeout-ms: 600000 -- two server renders per route, 3 routes. */
/* /, /about and /chain (DEFXN polish Wave 3, W3-HOME) as a crawler gets them: every block
   server-rendered and styled by the static stylesheets only (no style attribute on a block, no
   injected rule), every folded view in the HTML with its words, every id authored or Ark's
   reserved ark-r- kind, every aria reference resolving, and two renders byte-identical -- the same
   checks every Wave 3 page runs (tests/lib/block-page-checks.cjs). The modules are specs built by
   ArkUI.page with none of the hand-built helpers. Run alone (owner test law); `node
   tests/home-ssr.cjs /about` checks one route. */
const fs = require('node:fs');
const path = require('node:path');
const checks = require('./lib/block-page-checks.cjs');

const ROUTES = {
  '/': ['zero', ['home-', 'hl-title'], 'js/pages/home.js'],
  '/about': ['about', 'about-', 'js/pages/about.js'],
  '/chain': ['chain', 'chain-', 'js/pages/chain.js']
};

(async () => {
  const lines = [];
  for (const route of Object.keys(ROUTES).filter((r) => process.argv.length <= 2 || process.argv.slice(2).includes(r))) {
    const [page, idPrefix, file] = ROUTES[route];
    checks.assertSourceIsSpec(fs.readFileSync(path.join(checks.ROOT, file), 'utf8'), file);
    const { blocks, panels } = await checks.assertServerRender(route, page, { idPrefix });
    lines.push(`${route} ${blocks}/${panels}`);
  }
  console.log('PASS: home, /about and /chain are server-rendered from blocks, styled statically, folded views present, ids and aria references sound, renders identical (blocks/tab panels: ' + lines.join(', ') + ').');
})().catch((error) => { console.error(error); process.exit(1); });

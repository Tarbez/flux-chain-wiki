'use strict';
/* run-tests-timeout-ms: 600000 -- two server renders per route, 3 routes. */
/* /, /about and /chain as a crawler gets them (DEFXN polish Wave 3, W3-HOME). Run alone (owner test law);
   `node tests/home-ssr.cjs /about` checks one route.

   / is the 3D world home since the owner confirmed it on 2026-10-27 (js/pages/home.js): it is not a page
   of Ark blocks, so the block checks (tests/lib/block-page-checks.cjs: assertSourceIsSpec, the block
   stylesheet's parts) do not fit it. What its server render must hold instead, the same guarantees
   measured on the world page:
   - the page is in the server HTML with its words: the heading (HOME.WORLD.TITLE, one row per line), the
     eyebrow, the lede, the main action and the three paths as real links a crawler can follow, the rail's
     dated fleet run and its capability list -- the words are there before any script runs;
   - it is styled by its static stylesheet (css/world-pages.css, linked in the HTML), and no part of it
     carries a style attribute except the rail's data marks (each capability's share of the strip and its
     bar: widths from the data, not styling);
   - every id is an authored home-* id, every aria reference resolves, one main heading;
   - two renders are identical byte for byte.
   /about keeps the shared block checks. /chain is a 3D world page now (js/pages/catalog.js chain -> worldChain,
   js/pages/world-chain.js; owner-confirmed 2026-10-27): its server render is locked in tests/chain-blocks.cjs, so it
   is no longer a block page here. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const checks = require('./lib/block-page-checks.cjs');

const ROUTES = {
  '/about': ['about', 'about-', 'js/pages/about.js']
};

/* the home manifest's words, read the way the site reads them */
function homeWords() {
  let manifest = null;
  vm.runInNewContext(fs.readFileSync(path.join(checks.ROOT, 'js/content/manifests/home.js'), 'utf8'), { ArkManifest: { define: (m) => { manifest = m; } } });
  return (key) => manifest.fields[key].value;
}

async function assertWorldHomeServerRender() {
  const { JSDOM } = require('jsdom');
  const { readIndexHtml, renderDocument, createLocalResources } = await import(path.join(checks.ROOT, 'api/lib/render-core.mjs'));
  const render = async () => renderDocument({ html: await readIndexHtml(checks.ROOT), url: 'https://defxn.com/', resources: createLocalResources(checks.ROOT), root: checks.ROOT, timeoutMs: 30000 });
  const html = await render();
  assert(/<link rel="stylesheet" data-ark-style="css\/world-pages\.css" href="\/css\/world-pages\.css\?v=[^"]+">/.test(html), '/: the document links the world pages\' static stylesheet');
  const doc = new JSDOM(html).window.document; // what a crawler holds: no scripts ran here
  const page = doc.querySelector('[data-ark-page="zero"][data-world-home]');
  assert(page, '/: the world home is in the server HTML');
  const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
  const word = homeWords();

  const h1 = page.querySelectorAll('h1');
  assert.equal(h1.length, 1, '/: one main heading');
  assert.equal(h1[0].id, 'home-title');
  assert.deepEqual([...h1[0].children].map((row) => row.textContent), word('WORLD.TITLE').split('\n'), '/: the heading\'s rows are HOME.WORLD.TITLE\'s lines');
  assert.equal(text(page.querySelector('.eyebrow')), word('WORLD.EYEBROW'), '/: the eyebrow is in the HTML');
  assert.equal(text(page.querySelector('.lede')), word('WORLD.LEDE1') + ' ' + word('WORLD.LEDE2'), '/: the lede is in the HTML');
  const main = page.querySelector('.copy > a.cta');
  assert(main && text(main) === word('WORLD.CTA') && main.getAttribute('href') === '/chain', '/: the main action is a real link to /chain');
  assert.deepEqual([...page.querySelectorAll('nav.paths a')].map((a) => [text(a.querySelector('b')), a.getAttribute('href')]),
    [[word('WORLD.TRACE.TITLE'), '/chain'], [word('WORLD.VERIFY.TITLE'), '/explore'], [word('WORLD.UNDERSTAND.TITLE'), '/about']], '/: the three paths are real links');
  const rail = page.querySelector('aside.rail');
  assert(rail, '/: the Measured rail is in the HTML');
  assert.equal(text(rail.querySelector('#home-measured')), word('WORLD.RAIL.TITLE'));
  /* the fleet run shows only figures a verified record carries (owner's pick, 2026-10-27); with none, one line says so */
  const tiles = rail.querySelectorAll('.rx-tiles > div').length, unverified = text(rail.querySelector('.rx-unverified'));
  assert(tiles >= 1 ? !unverified : unverified === word('WORLD.RAIL.UNVERIFIED'), '/: the fleet run has its verified tiles, or the line HOME.WORLD.RAIL.UNVERIFIED');
  assert(/\d{1,2} \w{3} \d{4}$/.test(text(rail.querySelector('.rx-when'))), '/: the rail\'s fleet run is in the HTML with its date');
  assert(rail.querySelectorAll('.rx-grid [data-cap-id]').length >= 1, '/: the capability list is in the HTML');
  assert(text(rail.querySelector('.rail-cta')) === word('WORLD.RAIL.CTA'), '/: the rail\'s action is in the HTML');

  const DATA_MARKS = '.rx-stack > i[data-seg], .rx-bar > i';
  const styled = [...page.querySelectorAll('[style]')].filter((el) => !el.matches(DATA_MARKS)).map((el) => el.tagName + '.' + el.className);
  assert.deepEqual(styled, [], '/: no part of the page carries a style attribute but the rail\'s data marks');
  for (const mark of page.querySelectorAll(DATA_MARKS)) assert(/^(flex:\d+ 1 0|width:\d+%)$/.test(mark.getAttribute('style')), '/: a data mark carries only its share: ' + mark.getAttribute('style'));

  const foreign = [...page.querySelectorAll('[id]')].map((el) => el.id).filter((id) => !/^home-/.test(id));
  assert.deepEqual(foreign, [], '/: every id is an authored home-* id');
  for (const el of [page, ...page.querySelectorAll('[aria-controls], [aria-labelledby]')]) {
    for (const ref of [el.getAttribute('aria-controls'), el.getAttribute('aria-labelledby')].filter(Boolean).flatMap((v) => v.split(/\s+/))) {
      assert(doc.getElementById(ref), `/: ${ref} (referenced by ${el.tagName}) exists in the server HTML`);
    }
  }
  const again = await render();
  assert.equal(again, html, '/: two server renders are identical');
  return { paths: page.querySelectorAll('nav.paths a').length, caps: rail.querySelectorAll('.rx-grid [data-cap-id]').length };
}

(async () => {
  const wanted = (route) => process.argv.length <= 2 || process.argv.slice(2).includes(route);
  const lines = [];
  if (wanted('/')) {
    const { paths, caps } = await assertWorldHomeServerRender();
    lines.push(`/ world home: ${paths} paths, ${caps} capabilities`);
  }
  for (const route of Object.keys(ROUTES).filter(wanted)) {
    const [page, idPrefix, file] = ROUTES[route];
    checks.assertSourceIsSpec(fs.readFileSync(path.join(checks.ROOT, file), 'utf8'), file);
    const { blocks, panels } = await checks.assertServerRender(route, page, { idPrefix });
    lines.push(`${route} ${blocks} blocks/${panels} tab panels`);
  }
  console.log('PASS: the world home is server-rendered with its words, links and rail, styled by its static sheet; /about is server-rendered from blocks; ids and aria references sound, renders identical (' + lines.join(', ') + ').');
})().catch((error) => { console.error(error); process.exit(1); });

'use strict';
/* run-tests-timeout-ms: 240000 */
/* /chain is the 3D world's your-chain page (worldChain, js/pages/world-chain.js); owner-confirmed 2026-10-27.

   Until 2026-10-25 this file held /chain as a page of Ark blocks (js/pages/chain.js, DEFXN polish Wave 3). The owner
   replaced that page with the world page; the old block module stays on disk, unused. What this file locks now:
   - the route: /chain is drawn by worldChain and loads only the world page's own scripts, and no route loads the old
     block module (js/pages/chain.js) or its block, figure and scene scripts any more;
   - the old module is kept on disk (removing it is the owner's call, not a side effect);
   - the visitor's page, in the real site: the world page mounts at /chain, and none of the old block page's parts do.

   The old page's named regressions, one by one:
   - "the page's H1 was visually hidden": still applies. The world page's heading is in the page, visible, and is the
     page's accessible name (aria-labelledby).
   - "one dominant action" (design laws): the world page has one filled action (.cta), and it leads on to the record.
   - "the way home": still applies. The page links Home through the router.
   - "the record's wire grammar was 6px; nothing below 12px" (css/home-flow.css): the scene it guarded is not on /chain
     any more. The world page's sizes are css/world-chain.css's own; they are not locked here (reported to the owner on
     2026-10-27: that sheet sets 10px and 11px text, and the type scale is 11/18/29).
   - "the scene cycled forever": the old scene is gone with the page; the world's own settling is the world tests' (defxn
     animations must settle).
   - "saved CMS data is never rewritten, so every old layout key still lands": dropped. Those keys named the old block
     page's elements (tests/fixtures/layout-keys/chain.tsv, kept as evidence); the world page is a different page, and
     js/content/layout-data.js holds no saved edit for /chain (asserted below, so a saved edit is never silently lost).
   - "no feature reduction" (four examples, five steps, the swap figure, ?case=): the owner's redesign replaced them with
     the world's chain views (/chain, /chain/record, /chain/open, /chain/links). Their behaviour is tests/world-chain.cjs's. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ROUTE = '/chain';
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

(async () => {
  /* ---- the route --------------------------------------------------------------------------- */
  const catalog = read('js/pages/catalog.js');
  assert(/^\s*chain: \{ module: 'worldChain', scripts: \['js\/content\/records-sample\.js', 'js\/pages\/world-chain\.js'\] \},/m.test(catalog), '/chain is drawn by worldChain from its sample records and the world page file');
  const code = catalog.replace(/\/\*[\s\S]*?\*\//g, '');
  assert(!/'js\/pages\/chain\.js'/.test(code), 'no route loads the old block page module');
  assert(!/module: 'chain'/.test(code), 'no route is drawn by the old block module');
  assert(fs.existsSync(path.join(ROOT, 'js/pages/chain.js')), 'the old block page module is kept on disk, unused');

  /* ---- no saved edit is stranded on the old page's keys --------------------------------------- */
  const layout = read('js/content/layout-data.js');
  assert(!/"\/chain"\s*:/.test(layout), 'no saved layout edit names /chain (the old block page\'s keys do not exist on the world page)');

  /* ---- what the visitor gets ----------------------------------------------------------------- */
  const { readIndexHtml, inspectDocument, createLocalResources } = await import('../api/lib/render-core.mjs');
  const seen = await inspectDocument({ html: await readIndexHtml(ROOT), url: 'https://defxn.com' + ROUTE, resources: createLocalResources(ROOT), root: ROOT, timeoutMs: 30000 }, (window) => {
    const page = window.document.querySelector('[data-ark-page="chain"]');
    if (!page) return { page: false };
    const h1 = page.querySelectorAll('h1');
    return {
      page: true,
      world: page.classList.contains('world-page'),
      module: window.ArkUI.pageCatalog.chain.module,
      h1: h1.length, h1Id: h1[0] && h1[0].id, h1Text: h1[0] ? h1[0].textContent.trim() : '', h1Hidden: !!h1[0] && /visually-hidden/.test(h1[0].className),
      labelledBy: page.getAttribute('aria-labelledby'),
      ctas: [...page.querySelectorAll('.cta')].map((a) => a.dataset.sceneLink || ''),
      home: page.querySelectorAll('a[data-scene-link="zero"]').length,
      oldParts: page.querySelectorAll('#chain-cases, #chain-swap, #chain-onward, .chain-flow, .flow, [data-ark-block]').length,
      refused: page.querySelectorAll('[data-ark-block-refused]').length
    };
  });
  assert(seen.page, '/chain mounts a page');
  assert(seen.world, 'the page at /chain is the world page');
  assert.equal(seen.module, 'worldChain');
  assert.equal(seen.oldParts, 0, 'none of the old block page\'s parts (examples, swap figure, scene, Ark blocks) is on it');
  assert.equal(seen.h1, 1, 'one heading');
  assert(!seen.h1Hidden && seen.h1Text.length > 0, 'the heading is visible and says something: ' + seen.h1Text);
  assert.equal(seen.labelledBy, seen.h1Id, 'the heading is the page\'s accessible name');
  assert.deepEqual(seen.ctas, ['chain/record'], 'one dominant action, and it leads on to the record');
  assert(seen.home >= 1, 'the page leads home through the router');
  assert.equal(seen.refused, 0, 'no block was refused');

  console.log('PASS: /chain is the world page (worldChain), with a visible heading as its name and one action on to the record; the old block page is kept on disk and loaded by no route.');
})().catch((error) => { console.error(error); process.exit(1); });

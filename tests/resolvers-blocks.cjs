'use strict';
/* run-tests-timeout-ms: 240000 */
/* /resolvers is the 3D world's resolvers page (worldResolvers, js/pages/world-measure.js); owner-confirmed 2026-10-27.

   Until 2026-10-25 this file held /resolvers as a page of Ark blocks (js/pages/resolvers.js, DEFXN polish Wave 3,
   W3-STATS). The owner replaced that page with the world page; the old block module stays on disk, unused. What this
   file locks now: the route, the kept file, and the old page's named regressions that still apply, measured on the new
   page in the real site. Its words-from-manifests and state-in-the-address checks are tests/world-measure.cjs's.

   The old page's named regressions, one by one:
   - Dead end (docs/ux-audit/pages-ux-b.md /resolvers P0): still applies. The page leads on past Home: to the measured
     capabilities and to how a result is made.
   - Nothing is typed by hand: still applies. The count is the data file's (js/content/resolvers-data.js, generated), and
     the page names every resolver the file holds.
   - Absent is not 0: still applies. "Who can change it" is in no resolver's data, and the page says the manifest's words
     for that ("Not in its manifest"), never 0 or a blank.
   - No data: still applies, as the world page's own empty state (RESOLVERS.EMPTY), never an empty list.
   - Two tile systems, the table's escaping "no value" cell, the per-view fold: the Ark blocks and tables they guarded are
     not on /resolvers any more.
   - Saved CMS data is never rewritten (tests/fixtures/layout-keys/resolvers.tsv, kept as evidence): dropped. Those keys
     named the old block page's elements; js/content/layout-data.js holds no saved edit for /resolvers (asserted below). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const ROUTE = '/resolvers';
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

(async () => {
  /* ---- the route --------------------------------------------------------------------------- */
  const route = require('./lib/site-catalog.cjs').loadCatalog().catalog.resolvers;
  assert.equal(route.module, 'worldResolvers', '/resolvers is drawn by the world page');
  assert.deepEqual([...route.scripts], ['js/content/network-data.js', 'js/content/capabilities-data.js', 'js/content/resolvers-data.js', 'js/pages/world-sheet.js', 'js/pages/world-measure.js'], 'it loads its data files, the shared frame, then its page file');
  assert(!route.scripts.includes('js/ark/blocks.js') && !route.scripts.includes('js/pages/resolvers.js'), 'and neither the Ark blocks nor the old block module');
  const catalog = read('js/pages/catalog.js').replace(/\/\*[\s\S]*?\*\//g, '');
  assert(!/'js\/pages\/resolvers\.js'/.test(catalog), 'no route loads the old block module');
  assert(fs.existsSync(path.join(ROOT, 'js/pages/resolvers.js')), 'the old block page module is kept on disk, unused');
  assert(!/"\/resolvers"\s*:/.test(read('js/content/layout-data.js')), 'no saved layout edit names /resolvers (the old block page\'s keys do not exist on the world page)');
  assert(/if \(!RES\.length\) \{ W\.title\(ui\.title, T\('RESOLVERS\.EMPTY\.TITLE'\)\)/.test(read('js/pages/world-measure.js')), 'with no resolvers in the data, the page says so (RESOLVERS.EMPTY), never an empty list');

  /* ---- the data the page must show --------------------------------------------------------- */
  const ctx = { window: {} }; ctx.window = ctx;
  vm.runInNewContext(read('js/content/resolvers-data.js'), ctx);
  const resolvers = JSON.parse(JSON.stringify(ctx.DEFXN_RESOLVERS.resolvers));
  assert(resolvers.length > 0, 'the data file holds resolvers');
  assert(resolvers.every((r) => !('control' in r)), 'no resolver\'s data names who can change it (so the page must say it is absent)');

  /* ---- what the visitor gets ----------------------------------------------------------------- */
  const { readIndexHtml, inspectDocument, createLocalResources } = await import('../api/lib/render-core.mjs');
  const seen = await inspectDocument({ html: await readIndexHtml(ROOT), url: 'https://defxn.com' + ROUTE, resources: createLocalResources(ROOT), root: ROOT, timeoutMs: 30000 }, (window) => {
    const page = window.document.querySelector('[data-ark-page="resolvers"]');
    if (!page) return { page: false };
    const facts = [...page.querySelectorAll('dt')].map((dt) => [dt.textContent.trim(), dt.nextElementSibling ? dt.nextElementSibling.textContent.trim() : null]);
    const h1 = page.querySelectorAll('h1');
    return {
      page: true, world: page.classList.contains('world-page'),
      h1: h1.length, named: !!h1[0] && page.getAttribute('aria-labelledby') === h1[0].id,
      text: page.textContent.replace(/\s+/g, ' '),
      picks: [...page.querySelectorAll('button[data-id]')].map((b) => b.textContent.trim()),
      facts,
      onward: [...new Set([...page.querySelectorAll('a[data-scene-link]')].map((a) => a.getAttribute('data-scene-link')).filter((k) => k !== 'zero'))],
      blocks: page.querySelectorAll('[data-ark-block]').length,
      words: { kicker: window.ArkCopy.text('WORLDMEASURE.RESOLVERS.KICKER'), who: window.ArkCopy.text('WORLDMEASURE.RESOLVERS.FACT.WHO'), unknown: window.ArkCopy.text('WORLDMEASURE.RESOLVERS.UNKNOWN') }
    };
  });
  assert(seen.page && seen.world, 'the page at /resolvers is the world page');
  assert.equal(seen.blocks, 0, 'none of the old block page\'s Ark blocks is on it');
  assert(seen.h1 === 1 && seen.named, 'one heading, and it is the page\'s accessible name');
  assert(seen.text.includes(seen.words.kicker.replace('{n}', resolvers.length)), 'the count is the data file\'s: ' + seen.words.kicker.replace('{n}', resolvers.length));
  assert.deepEqual(seen.picks, resolvers.map((r) => r.name), 'every resolver in the data file can be picked, in its order (no feature reduction)');
  const who = seen.facts.find(([term]) => term === seen.words.who);
  assert(who, 'the page has the row "' + seen.words.who + '"');
  assert.equal(who[1], seen.words.unknown, 'an absent fact is said in words ("' + seen.words.unknown + '"), never 0 or a blank');
  assert(seen.onward.length >= 1, 'the page is not a dead end: it leads on past Home (' + seen.onward.join(', ') + ')');

  console.log(`PASS: /resolvers is the world page (worldResolvers) with ${resolvers.length} resolvers from the data file, an absent fact said in words and a way on (${seen.onward.join(', ')}); the old block page is kept on disk and loaded by no route.`);
})().catch((error) => { console.error(error); process.exit(1); });

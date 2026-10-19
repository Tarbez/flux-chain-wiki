'use strict';
/* run-tests-timeout-ms: 240000 */
/* /palette, the pilot page of Ark blocks (js/pages/palette.js): a pure data spec built by
   ArkUI.page, and every CMS edit saved against the hand-built page it replaced still lands.

   Named regressions it holds:
   - Saved CMS data is never rewritten, so the conversion must keep every old layout key
     (tests/lib/layout-continuity.cjs against the frozen census
     tests/fixtures/layout-keys/palette.tsv). A key may only be reshaped (pinned to its successor
     though its words changed shape) or retired (nothing carries it now) with the reason below.
   - The old CMS anchor's path became the new tab list's: a new element must never inherit an
     old key it does not own (layout.js keys it '@new').
   - No feature reduction: every swatch, the button demo, the live theme name, the way home and
     the theme settings action are all still there. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const continuity = require('./lib/layout-continuity.cjs');

const ROOT = path.resolve(__dirname, '..');
const ROUTE = '/palette';

/* Why each old key whose words changed shape still lands on its successor. */
const reshaped = {
  'page:/div:1/header:1': 'the page header became the hero block: the same words, with the active theme after the lede',
  'page:/div:1/section:1': 'the Components section became the Components tab panel; its heading is the tab',
  'page:/div:1/section:2': 'the Primary section became a tab panel; its heading is the tab and the section title',
  'page:/div:1/section:3': 'the Secondary section became a tab panel',
  'page:/div:1/section:4': 'the Reference section became a tab panel',
  'page:/div:1/section:5': 'the Success section became the first item of the States accordion',
  'page:/div:1/section:6': 'the Warning section became the second item of the States accordion',
  'page:/div:1/section:7': 'the Danger section became the third item of the States accordion',
  'page:/div:1/section:8': 'the Neutrals section became the Neutrals tab panel'
};
/* Why nothing carries these keys now. */
const retired = {
  'page:/div:1': 'the inner column wrapper; a block page has none -- its root (page:/) is the column',
  'page:/div:1/nav:1/a:1/svg:1': 'the arrow icon js/hero-motion.js drew inside the old breadcrumb link; Ark\'s breadcrumb draws none',
  'page:/div:1/nav:1/a:1/svg:1/path:1': 'part of that icon',
  'page:/div:1/nav:1/a:1/svg:1/path:2': 'part of that icon'
};

(async () => {
  /* ---- the module is a spec of Ark blocks -------------------------------------------------- */
  const source = fs.readFileSync(path.join(ROOT, 'js/pages/palette.js'), 'utf8');
  assert(/ArkUI\.page\(spec\(familyName\(\)\), host,/.test(source), 'the page is built by ArkUI.page from its spec');
  assert(!/document\.createElement\('(section|header|h1|h2|nav)'/.test(source) && !/el\('(section|header|h1|h2|nav)'/.test(source), 'no hand-built page structure is left: headers, sections and navs are blocks');
  const catalog = fs.readFileSync(path.join(ROOT, 'js/pages/catalog.js'), 'utf8');
  assert(/palette: \{ module: 'palette', scripts: ArkUI\.blockScripts\.concat\(\['js\/pages\/palette\.js'\]\) \}/.test(catalog), 'the route loads the blocks before its module');

  /* ---- what the visitor gets: everything the old page had ---------------------------------- */
  const { readIndexHtml, inspectDocument, createLocalResources } = await import('../api/lib/render-core.mjs');
  const seen = await inspectDocument({ html: await readIndexHtml(ROOT), url: 'https://defxn.com' + ROUTE, resources: createLocalResources(ROOT), root: ROOT, timeoutMs: 30000 }, (window) => {
    const page = window.document.querySelector('[data-ark-page="palette"]');
    const blocks = [...page.querySelectorAll(':scope > [data-ark-block]')].map((el) => el.getAttribute('data-ark-block'));
    const tabs = [...page.querySelectorAll('#palette-views [role="tab"]')].map((el) => el.textContent.trim());
    return {
      blocks,
      tabs,
      swatches: page.querySelectorAll('.palette-swatch').length,
      demos: page.querySelectorAll('.palette-component').length,
      family: (page.querySelector('#palette-hero [data-ark-part="hero-meta"] dd') || {}).textContent,
      h1: (page.querySelector('h1') || {}).id,
      labelledBy: page.getAttribute('aria-labelledby'),
      home: [...page.querySelectorAll('a[data-scene-link="zero"]')].length,
      settings: [...page.querySelectorAll('button[data-action="open-theme-settings"]')].length,
      insert: page.querySelectorAll('[data-ark-insert="main"]').length,
      refused: page.querySelectorAll('[data-ark-block-refused]').length
    };
  });
  assert.deepEqual(seen.blocks, ['breadcrumb', 'hero', 'tabs', 'actions'], 'breadcrumb, hero, the views as tabs, the way on');
  assert.deepEqual(seen.tabs, ['Components', 'Primary', 'Secondary', 'Reference', 'States', 'Neutrals']);
  // 6 roles x (7 shades + ink) + 3 hue roles x 11 tones + 9 neutrals: every swatch the old page drew
  assert.equal(seen.swatches, 6 * 8 + 3 * 11 + 9, 'every swatch is still on the page (no feature reduction)');
  assert.equal(seen.demos, 5, 'the five action paints are still demonstrated');
  assert.equal(seen.family, 'Ember dark', 'the active theme is named (and follows a theme switch: js/pages/palette.js paintFamily)');
  assert.equal(seen.h1, 'palette-title', 'the heading keeps the id the old page gave it');
  assert.equal(seen.labelledBy, 'palette-title');
  assert(seen.home >= 2, 'the breadcrumb and the way on both lead Home through the router');
  assert.equal(seen.settings, 1, 'Theme settings is still an action on the page');
  assert.equal(seen.insert, 1, 'the CMS insertion anchor is still there');
  assert.equal(seen.refused, 0, 'no block was refused');

  /* ---- saved CMS edits still land ---------------------------------------------------------- */
  const census = continuity.readCensus(ROUTE);
  const after = await continuity.pageKeys(ROUTE);
  const tally = continuity.assertContinuity(census, after, { reshaped, retired });
  assert.equal(tally.kept + tally.reshaped + tally.retired, census.length, 'every old key is accounted for');
  const landed = await continuity.assertSavedEditsLand(ROUTE, census, { reshaped, retired });
  assert.equal(landed, census.length - 1 - Object.keys(retired).length, 'a saved frame on every old key but page:/ and the retired ones landed');
  assert(after.every((entry) => !/^id:ark-r-/.test(entry.key)), 'no generated (ark-r-) id became a layout key');

  console.log(`PASS: /palette is a spec of Ark blocks with nothing dropped; ${tally.kept} old layout keys kept, ${tally.reshaped} reshaped, ${tally.retired} retired, and ${landed} saved edits land.`);
})().catch((error) => { console.error(error); process.exit(1); });

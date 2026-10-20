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
     the theme settings action are all still there.
   - PA-2 (2026-10-20): the page hand-listed its tokens and had lost seven (overlay, drift, trust, live, role, badge,
     hidden). Every token the SDK defines (DEADARK_COLOR_TOKEN_NAMES) is a swatch now, the list is generated from the SDK
     (scripts/build-palette-tokens.cjs) and this test fails when that file is stale.
   - PA-7/PA-8: a Type tab (the SDK's three font slots and its scale) and a Contrast tab whose ratios are COMPUTED from the live
     theme. This test recomputes every cell with the SDK's own contrastRatio and compares. */
const assert = require('node:assert/strict');
const cp = require('node:child_process');
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
  'page:/div:1/section:8': 'the Neutrals section became the Tokens tab panel (it holds the neutrals, the meaning tokens, the borders and the state colours)',
  'page:/div:1/section:8/h2:1': 'its heading is the tab: "Neutrals" became "Tokens" when the tab grew to hold every SDK token',
  'page:/div:1/section:8/div:1': 'the neutrals grid gained the SDK tokens the old page omitted (overlay, text-inverse); the nine it had keep their keys by pin'
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
  assert(/palette: \{ module: 'palette', scripts: ArkUI\.blockScripts\.concat\(\['js\/content\/palette-tokens\.js', 'js\/pages\/palette\.js'\]\) \}/.test(catalog), 'the route loads the blocks, then the SDK token names, before its module');
  assert(!/var (NEUTRALS|TOKEN_LIST|COLORS) = \[/.test(source), 'the page lists no token by hand: NEUTRALS is derived from the SDK\'s order');
  const check = cp.spawnSync(process.execPath, [path.join(ROOT, 'scripts/build-palette-tokens.cjs'), '--check'], { encoding: 'utf8' });
  assert.equal(check.status, 0, 'js/content/palette-tokens.js is current against the installed SDK: ' + check.stderr);

  /* ---- what the visitor gets: everything the old page had ---------------------------------- */
  const { readIndexHtml, inspectDocument, createLocalResources } = await import('../api/lib/render-core.mjs');
  const sdk = require('@deadark/sdk/theme');
  const TOKENS = sdk.DEADARK_COLOR_TOKEN_NAMES, FONTS = sdk.DEADARK_FONT_TOKEN_NAMES, SCALE = Object.keys(sdk.DEADARK_TYPE_SCALE), ROLES = sdk.DEADARK_ROLE_LADDER_ROLES;
  const surfaces = TOKENS.slice(0, TOKENS.findIndex((n) => /^text/.test(n)));
  const textTokens = TOKENS.filter((n) => /^text/.test(n)), borderTokens = TOKENS.filter((n) => /^border/.test(n));
  const meaningTokens = TOKENS.slice(TOKENS.map((n) => /^border/.test(n)).lastIndexOf(true) + 1);
  const read = (window) => {
    const page = window.document.querySelector('[data-ark-page="palette"]');
    const blocks = [...page.querySelectorAll(':scope > [data-ark-block]')].map((el) => el.getAttribute('data-ark-block'));
    const tabs = [...page.querySelectorAll('#palette-views [role="tab"]')].map((el) => el.textContent.trim());
    const style = window.getComputedStyle(window.document.documentElement);
    const value = (name) => { let v = style.getPropertyValue('--' + name).trim(), m; while ((m = /^var\(\s*--([\w-]+)/.exec(v))) v = style.getPropertyValue('--' + m[1]).trim(); return v; };
    const table = (id) => { const t = page.querySelector('#' + id); return t ? [...t.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((c) => c.textContent.trim())) : null; };
    const head = (id) => { const t = page.querySelector('#' + id); return t ? [...t.querySelectorAll('thead th')].map((c) => c.textContent.trim()) : null; };
    return {
      blocks,
      tabs,
      swatches: page.querySelectorAll('.palette-swatch').length,
      titles: [...page.querySelectorAll('.palette-swatch')].map((el) => el.title),
      demos: page.querySelectorAll('.palette-component').length,
      specimens: ['solid', 'soft', 'quiet'].map((v) => page.querySelectorAll('button.palette-' + v + '.palette-demo').length),
      family: (page.querySelector('#palette-hero [data-ark-part="hero-meta"] dd') || {}).textContent,
      h1: (page.querySelector('h1') || {}).id,
      labelledBy: page.getAttribute('aria-labelledby'),
      home: [...page.querySelectorAll('a[data-scene-link="zero"]')].length,
      settings: [...page.querySelectorAll('button[data-action="open-theme-settings"]')].length,
      insert: page.querySelectorAll('[data-ark-insert="main"]').length,
      refused: page.querySelectorAll('[data-ark-block-refused]').length,
      values: Object.fromEntries(TOKENS.concat(ROLES.flatMap((r) => [r + '-ink', r + '-700', r + '-100', r])).map((n) => [n, value(n)])),
      textHead: head('palette-contrast-text'), textRows: table('palette-contrast-text'),
      roleHead: head('palette-contrast-roles'), roleRows: table('palette-contrast-roles'),
      slots: [...page.querySelectorAll('.palette-slot')].map((row) => ({ name: row.querySelector('b').textContent, meta: row.querySelector('small').textContent, face: row.querySelector('.palette-slot-sample').style.fontFamily })),
      fontValues: Object.fromEntries(FONTS.map((f) => [f, style.getPropertyValue('--font-' + f).trim()])),
      steps: [...page.querySelectorAll('.palette-step')].map((row) => ({ name: row.querySelector('code').textContent, meta: row.querySelector('small').textContent, size: row.querySelector('.palette-step-sample').style.fontSize })),
      scaleValues: Object.fromEntries(SCALE.map((s) => [s, style.getPropertyValue('--type-' + s).trim()])),
      ratios: [...page.querySelectorAll('[data-palette-ratio]')].map((el) => [el.getAttribute('data-palette-ratio'), el.textContent])
    };
  };
  const seen = await inspectDocument({ html: await readIndexHtml(ROOT), url: 'https://defxn.com' + ROUTE, resources: createLocalResources(ROOT), root: ROOT, timeoutMs: 30000 }, read);
  assert.deepEqual(seen.blocks, ['breadcrumb', 'hero', 'tabs', 'actions'], 'breadcrumb, hero, the views as tabs, the way on');
  assert.deepEqual(seen.tabs, ['Components', 'Primary', 'Secondary', 'Reference', 'Tokens', 'Type', 'Contrast'], 'seven tabs: Ark\'s tabs hold at most seven, so States and Neutrals share the Tokens tab');
  /* 6 roles x (7 shades + ink) + 3 hue roles x 11 tones, plus one swatch for every colour token the SDK defines */
  assert.equal(seen.swatches, 6 * 8 + 3 * 11 + TOKENS.length, 'every swatch the old page drew is still on the page, and every SDK colour token has one (no feature reduction)');
  for (const token of TOKENS) assert(seen.titles.includes('--' + token), 'the SDK token --' + token + ' is on the page (PA-2: the page omitted overlay, drift, trust, live, role, badge, hidden)');
  assert.equal(seen.demos, 5, 'the five action paints are still demonstrated');
  assert.deepEqual(seen.specimens, [1, 1, 1], 'the specimen buttons are the site\'s own variants (solid, soft, quiet): css/components.css paints them, the page adds no colour of its own');
  assert.equal(seen.family, 'Ember dark', 'the active theme is named (and follows a theme switch: js/pages/palette.js paintTheme)');
  assert.equal(seen.h1, 'palette-title', 'the heading keeps the id the old page gave it');
  assert.equal(seen.labelledBy, 'palette-title');
  assert(seen.home >= 2, 'the breadcrumb and the way on both lead Home through the router');
  assert.equal(seen.settings, 1, 'Theme settings is still an action on the page');
  assert.equal(seen.insert, 1, 'the CMS insertion anchor is still there');
  assert.equal(seen.refused, 0, 'no block was refused');

  /* ---- Type: the SDK's three slots and its derived scale, read from the live cascade -------- */
  assert.deepEqual(seen.slots.map((row) => row.name), FONTS, 'one specimen per SDK font slot');
  seen.slots.forEach((row) => {
    assert.equal(row.face, 'var(--font-' + row.name + ')', 'the ' + row.name + ' specimen is set in its own slot');
    const family = seen.fontValues[row.name].split(',')[0].replace(/^[\s"']+|[\s"']+$/g, '');
    assert(family && row.meta === '--font-' + row.name + ' · ' + family, 'and names the face the cascade gives it: ' + row.meta);
  });
  assert.deepEqual(seen.steps.map((row) => row.name), SCALE.map((n) => '--type-' + n), 'one scale row per SDK step, in the SDK\'s order');
  seen.steps.forEach((row, i) => {
    assert(row.meta.startsWith(seen.scaleValues[SCALE[i]].replace(/\s+/g, '')) || row.meta.replace(/\s+/g, '').startsWith(seen.scaleValues[SCALE[i]].replace(/\s+/g, '')), 'the row shows the declared value: ' + row.meta);
    assert(/max\(var\(--type-/.test(row.size) && /12px/.test(row.size), 'a sample is never set below the site\'s 12px floor: ' + row.size);
  });

  /* ---- Contrast: every cell recomputed with the SDK's own contrastRatio --------------------- */
  const cell = (fg, bg) => { const r = sdk.contrastRatio(seen.values[fg], seen.values[bg]); return (Math.floor(r * 100) / 100).toFixed(2) + ' · ' + (r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'Large text and edges' : 'Below 3'); };
  assert.deepEqual(seen.textHead, ['Token'].concat(surfaces.map((s) => 'on ' + s)), 'the contrast columns are the SDK\'s surfaces');
  const fgs = textTokens.concat(meaningTokens);
  assert.deepEqual(seen.textRows.map((r) => r[0]), fgs.map((t) => '--' + t), 'the rows are the SDK\'s text and meaning tokens');
  seen.textRows.forEach((row, i) => surfaces.forEach((bg, j) => assert.equal(row[j + 1], cell(fgs[i], bg), '--' + fgs[i] + ' on --' + bg + ' is computed, not typed')));
  assert.deepEqual(seen.roleHead, ['Role', 'Ink on base', '700 on 100', 'Base on canvas']);
  seen.roleRows.forEach((row, i) => {
    const r = ROLES[i];
    assert.equal(row[0], '--' + r);
    assert.equal(row[1], cell(r + '-ink', r), r + ': ink on base'); assert.equal(row[2], cell(r + '-700', r + '-100'), r + ': 700 on 100'); assert.equal(row[3], cell(r, 'canvas'), r + ': base on canvas');
  });
  assert.equal(seen.textRows.flat().filter((c) => c === 'No reading').length, 0, 'every pair was readable (absent is not a ratio)');
  seen.ratios.forEach(([token, text]) => assert.equal(text, cell(token, 'canvas').split(' · ')[0] + ':1 on canvas', '--' + token + ' swatch: ratio on the canvas'));
  assert.equal(seen.ratios.length, meaningTokens.length, 'each meaning swatch carries its ratio on the canvas (PA-8)');

  /* ---- a theme switch repaints the readings -------------------------------------------------- */
  const switched = await inspectDocument({ html: await readIndexHtml(ROOT), url: 'https://defxn.com' + ROUTE, resources: createLocalResources(ROOT), root: ROOT, timeoutMs: 30000 }, async (window) => {
    window.document.documentElement.dataset.theme = 'glacier';
    await new Promise((resolve) => setTimeout(resolve, 600));
    return read(window);
  });
  assert.equal(switched.family, 'Ember light', 'the theme name follows');
  assert.notDeepEqual(switched.textRows, seen.textRows, 'the contrast table follows a theme switch (a light theme is not the dark one)');
  switched.textRows.forEach((row, i) => surfaces.forEach((bg, j) => assert.equal(row[j + 1], (() => { const r = sdk.contrastRatio(switched.values[fgs[i]], switched.values[bg]); return (Math.floor(r * 100) / 100).toFixed(2) + ' · ' + (r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'Large text and edges' : 'Below 3'); })(), 'after the switch --' + fgs[i] + ' on --' + bg + ' is recomputed')));

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

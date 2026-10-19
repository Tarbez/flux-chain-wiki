'use strict';
/* run-tests-timeout-ms: 240000 */
/* /stats/gpu as a page of Ark blocks (js/pages/stats-gpu.js, DEFXN polish Wave 3, W3-STATS).

   Named regressions it holds:
   - Fold (docs/ux-audit/pages-ux-b.md /stats/gpu P1): the page was 2.03x the viewport on a
     desktop and 3.28x on a phone. It now answers first (the hero, its details the three numbers)
     and keeps the detail in five tabs; each view measures <= 1.6x at 1440x900 and 390x844 (W3-STATS
     report). Met by structure: every table row, bar and note is still in the page, and the notes
     that fold on a phone are Ark disclosures (a press away, never cut off).
   - Duplicated helpers (P2): esc, fmt, pct, tile, headRow, row and bars were the third copy of
     the same tile/table/bar code (with /resolvers and /stats/ledger). The blocks are Ark's now.
   - Dead Tab stops (P1, tests/a11y-chrome.cjs): bar rows are Ark meter rows -- list items,
     never Tab stops -- and each row's label carries the CPU the old hover tip named.
   - Orphan (P1): the page leads back to /stats, and /stats links here (tests/site-exits.cjs).
   - Saved CMS data is never rewritten: every old layout key still lands
     (tests/lib/layout-continuity.cjs against tests/fixtures/layout-keys/stats-gpu.tsv), reshaped
     or retired only with the reason below. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const continuity = require('./lib/layout-continuity.cjs');
const checks = require('./lib/block-page-checks.cjs');

const ROUTE = '/stats/gpu';
const T = 'page:/div:1/div:1';

/* Why each old key whose words changed shape still lands on its successor. */
const reshaped = {
  [T + '/article:1']: 'the hero tile became the hero block: the same words, its chips now labelled details beside the three numbers that answer the page',
  [T + '/article:1/p:3']: 'the date and status chips became the hero details',
  [T + '/article:1/p:3/span:1']: 'the date chip became the Measured detail, which now also says "registered grammar" and "measured, not production"',
  [T + '/article:2']: 'the "What touches the GPU" tile became the first tab panel; its label is the tab',
  [T + '/article:2/div:1']: 'the same proof table, now captioned with the tile\'s old heading',
  [T + '/article:2/div:1/table:1']: 'the same proof table, now captioned with the tile\'s old heading',
  [T + '/article:3']: 'the "So why was it fast?" tile became the second tab panel; its label is the tab',
  [T + '/article:3/ul:1']: 'the same three reasons, now a list of terms and their meanings (the census\'s 160-character cut falls one character later, so its words compare unequal)',
  [T + '/article:4']: 'the signature-verify tile became its own tab panel ("Per core: one signature verify"): heading, bars, note',
  [T + '/article:5']: 'the grammar-throughput tile became its own tab panel ("Per core: grammar throughput"): heading, bars, note',
  [T + '/article:6']: 'the "Over the real internet" tile became the last tab panel; its label is the tab',
  [T + '/article:6/div:1']: 'the same round-trip table, now captioned with the tile\'s old heading',
  [T + '/article:6/div:1/table:1']: 'the same round-trip table, now captioned with the tile\'s old heading',
  [T + '/article:7']: 'the "Read and verify" tile became the closing pager: the same two links under the same label',
  [T + '/div:1']: 'the CMS insertion anchor, kept: now its own row after the tabs',
  'id:statsgpu-why-title': 'the tile label "So why was it fast?" is now the tab "Why it was fast" (shortened so every tab shows on a desktop)',
  'id:statsgpu-sig-title': 'the tile label "Per core: one signature verify" is now the tab "Signature verify" (shortened so every tab shows on a desktop)',
  'id:statsgpu-grammar-title': 'the tile label "Per core: grammar throughput" is now the tab "Grammar throughput" (shortened so every tab shows on a desktop)',
  'id:statsgpu-wan-title': 'the tile label "Over the real internet" is now the tab "Over the internet" (shortened so every tab shows on a desktop)'
};
/* Why nothing carries these keys now. */
const retired = {
  'page:/div:1': 'the page column wrapper (stats-shell); a block page has none -- its root (page:/) is the column',
  [T]: 'the bento grid wrapper (stats-bento); the blocks sit directly in the page root',
  [T + '/article:1/a:1']: 'the hero\'s back link: the trail\'s "Mesh performance" and the pager\'s "Back to the main measurements" lead to the same page, and a third copy pushed the phone view past the fold rule',
  [T + '/article:1/a:1/span:1']: 'the hand-drawn "←" glyph of that back link',
  [T + '/article:1/p:3/span:2']: 'the "registered grammar" chip: its words joined the Measured detail, which keeps the date chip\'s key',
  [T + '/article:1/p:3/span:3']: 'the "measured, not production" chip: its words joined the Measured detail, which keeps the date chip\'s key'
};
for (const tr of [1, 2, 3, 4]) retired[T + '/article:2/div:1/table:1/tbody:1/tr:' + tr + '/td:2/strong:1'] = 'bold emphasis inside a table cell; Ark\'s table cells hold text only, and the cell keeps the key and the words';
for (const tr of [1, 2]) retired[T + '/article:6/div:1/table:1/tbody:1/tr:' + tr + '/td:4/strong:1'] = 'bold emphasis inside a table cell; Ark\'s table cells hold text only, and the cell keeps the key and the words';
for (const a of [4, 5]) for (const li of [1, 2, 3]) retired[T + '/article:' + a + '/ol:1/li:' + li + '/span:1/small:1'] = 'the CPU detail line inside the bar\'s name; Ark\'s bar list writes name and CPU as one label, which keeps the name\'s key and both words';
for (const a of [2, 6]) retired['page:/div:1/div:1/article:' + a + '/h2:1'] = 'the tile heading is now the caption of the table it introduced (same words); a <caption> is not a layout target (js/content/layout.js KEY_TAGS has no caption), so nothing can carry its key until captions become keyable';

(async () => {
  /* ---- the module is a spec of Ark blocks -------------------------------------------------- */
  const file = 'js/pages/stats-gpu.js';
  const source = fs.readFileSync(path.join(checks.ROOT, file), 'utf8');
  checks.assertSourceIsSpec(source, file);
  assert(/block: 'meter'/.test(source) && !/stats-bar-row|tabindex/.test(source), 'the bars are Ark\'s meter (rows are list items, never Tab stops)');
  const route = require('./lib/site-catalog.cjs').loadCatalog().catalog['stats/gpu'];
  assert.deepEqual([...route.scripts.slice(-2)], ['js/content/glossary.js', 'js/pages/stats-gpu.js'], 'the route loads the glossary, then the page');
  assert(route.scripts.includes('js/ark/blocks.js') && route.scripts.indexOf('js/ark/blocks.js') < route.scripts.indexOf(file), 'the route loads the blocks before its module');

  /* ---- what the visitor gets: everything the old page had ---------------------------------- */
  const seen = await checks.visit(ROUTE, (window, page) => ({
    tabs: [...page.querySelectorAll('#statsgpu-views [role="tab"]')].map((el) => el.textContent.trim()),
    tableRows: [...page.querySelectorAll('table')].map((t) => t.querySelectorAll('tbody tr').length),
    meterRows: [...page.querySelectorAll('[data-ark-block="meter"]')].map((m) => [...m.querySelectorAll('[data-ark-part="meter-label"]')].map((l) => l.textContent)),
    facts: page.querySelectorAll('[data-ark-part="fact"]').length,
    answer: [...page.querySelectorAll('#statsgpu-hero [data-ark-part="hero-meta"] dt')].map((el) => el.textContent),
    statsHome: page.querySelectorAll('a[data-scene-link="stats"]').length,
    evidence: [...page.querySelectorAll('a[data-scene-link="reference"]')].map((a) => decodeURIComponent(a.getAttribute('href'))),
    focusableRows: page.querySelectorAll('li[tabindex]').length,
    text: page.textContent
  }));
  assert.deepEqual(seen.blocks, ['breadcrumb', 'hero', 'tabs', 'pager'], 'trail, the answer (with its three numbers), the detail as tabs, the way on');
  assert.deepEqual(seen.tabs, ['What touches the GPU', 'Why it was fast', 'Signature verify', 'Grammar throughput', 'Over the internet']);
  assert.deepEqual(seen.answer, ['Our GPU work', 'One signature verify', 'Grammar throughput', 'Measured'], 'the hero answers with the three numbers and their date');
  assert.deepEqual(seen.tableRows, [4, 2], 'the four GPU checks and both round-trip paths (no feature reduction)');
  assert.equal(seen.meterRows.length, 2, 'both per-core bar lists');
  for (const rows of seen.meterRows) assert.deepEqual(rows, ['bk2 · Intel Xeon Gold 6230R @2.1 GHz', 'eul-4c · AMD EPYC 9355P (dedicated)', 'GPU box · AMD EPYC 9355 (shared, 8-core cap)'], 'each bar names its machine and CPU in visible text');
  assert.equal(seen.facts, 3, 'the three reasons it was fast');
  for (const figure of ['51.5 µs', '25.8 µs', '24.6 µs', '3,107 /s', '7,926 /s', '10,476 /s', '2,659/s', '4,980/s', '1,786/s', '5,205/s', 'other tenants']) assert(seen.text.includes(figure), 'the page still shows ' + figure);
  assert.equal(seen.focusableRows, 0, 'no list row is a Tab stop');
  assert(seen.statsHome >= 2, 'the trail and the pager both lead back to /stats through the router');
  assert(seen.evidence.some((href) => href.includes('docs/evidence/bench-003-rust-fleet-ceiling.md')), 'BENCH-003 §16 opens in the reference reader');
  assert.deepEqual(seen.refused, [], 'no block was refused');
  assert.deepEqual(seen.termsMissing, [], 'every glossary term has an entry in docs/glossary.md');
  assert(seen.terms.includes('ed25519'), 'jargon is glossed: ' + seen.terms.join(', '));
  assert.equal(seen.inserts, 1, 'the CMS insertion anchor is still there');
  assert.deepEqual(seen.h1, ['statsgpu-title'], 'one h1, keeping the id the old page gave it');
  assert.equal(seen.labelledBy, 'statsgpu-title');

  /* ---- the crawler's copy is styled, complete and deterministic ----------------------------- */
  const ssr = await checks.assertServerRender(ROUTE, 'stats/gpu', { idPrefix: 'statsgpu-' });

  /* ---- saved CMS edits still land ---------------------------------------------------------- */
  const census = continuity.readCensus(ROUTE);
  const after = await continuity.pageKeys(ROUTE);
  const tally = continuity.assertContinuity(census, after, { reshaped, retired });
  assert.equal(tally.kept + tally.reshaped + tally.retired, census.length, 'every old key is accounted for');
  const landed = await continuity.assertSavedEditsLand(ROUTE, census, { reshaped, retired });
  assert.equal(landed, census.length - 1 - Object.keys(retired).length, 'a saved frame on every old key but page:/ and the retired ones landed');
  assert(after.every((entry) => !/^id:ark-r-/.test(entry.key)), 'no generated (ark-r-) id became a layout key');

  console.log(`PASS: /stats/gpu is a spec of Ark blocks with nothing dropped (${ssr.blocks} blocks server-rendered styled, ${ssr.panels} tab panels); ${tally.kept} old layout keys kept, ${tally.reshaped} reshaped, ${tally.retired} retired, and ${landed} saved edits land.`);
})().catch((error) => { console.error(error); process.exit(1); });

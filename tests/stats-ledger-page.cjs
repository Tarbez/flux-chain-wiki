'use strict';
/* run-tests-timeout-ms: 240000 */
/* /stats/ledger as a page of Ark blocks (js/pages/stats-ledger.js, DEFXN polish Wave 3, W3-STATS).

   Named regressions it holds:
   - Overload (docs/ux-audit/pages-ux-b.md /stats/ledger P0): 2,636 words at 8.98x the viewport on a
     desktop and 14.6x on a phone, five raw numbers as headings, the intro opening on "(G, pos)" and
     "self-signed equivocation". It now answers in one plain sentence with the three numbers that
     matter, and keeps every table, bar, sample entry and note in seven tabs by question, the dated
     runs and side topics folded into accordions; each view measures <= 1.6x at 1440x900 and 390x844.
   - Duplicated helpers (P2): esc, fmt, pct, tile, headRow, row and cpuBars -- the blocks are Ark's.
   - Dead Tab stops (P1, tests/a11y-chrome.cjs): the CPU bars are Ark meter rows, never Tab stops,
     and each bar's detail is visible text (the facts beside the bars).
   - Name collision (2026-10-19, docs/ux-audit/pages.md P6): the dashboard and the article
     /learnings/a-resolver-by-construction shared the title "A finance resolver by construction"; the
     dashboard's h1 and catalog name are "Ledger benchmark detail".
   - The certified-capacity, sustained, burst, one-core, M2 and replication figures, the outer-hex
     removal, fork gossip, the TCP server and head-only replay all stay on the page, and the chain
     sample is a real signed ledger (every entry ends in a 64-byte Ed25519 signature).
   - Saved CMS data is never rewritten: every old layout key still lands
     (tests/lib/layout-continuity.cjs against tests/fixtures/layout-keys/stats-ledger.tsv), reshaped
     or retired only with the reason below. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const continuity = require('./lib/layout-continuity.cjs');
const checks = require('./lib/block-page-checks.cjs');

const ROUTE = '/stats/ledger';
const T = 'page:/div:1/div:1';

/* Why each old key whose words changed shape still lands on its successor. */
const reshaped = {
  [T + '/article:1']: 'the hero tile became the hero block: the eyebrow and title kept, a plain one-sentence answer and the three numbers that matter added; its precise statement moved to the "How it works" tab',
  [T + '/article:2']: 'the "What this closes by construction" tile became the "What it closes" tab panel',
  [T + '/article:3']: 'the "Where this lives in the spec" tile became an accordion item of the "How it works" tab',
  [T + '/article:3/ul:1']: 'the same five spec lines, now facts -- with the old hero chips (date, record type, spec version) added after them; the census\'s 160-character cut falls a character later',
  [T + '/article:4']: 'the chain-sample tile became the "On the wire" tab panel',
  [T + '/article:4/ol:1']: 'the five sample entries became the body of a table: position, payload, CID, entry',
  [T + '/article:5']: 'the newest certified fleet tile became an accordion item of the "Fleet runs" tab; its headline number opens the item',
  [T + '/article:6']: 'the sustained-admission tile became an accordion item of the "Fleet runs" tab; its headline number opens the item',
  [T + '/article:7']: 'the short-burst tile became an accordion item of the "Fleet runs" tab, its single-pair detail a nested item',
  [T + '/article:8']: 'the "Measured today" tile became an accordion item of the "One machine" tab; its headline number opens the item',
  [T + '/article:8/ol:1']: 'the CPU bars are Ark\'s bar list; each bar\'s detail line moved to the facts beside it',
  [T + '/article:9']: 'the Apple M2 audit tile became an accordion item of the "One machine" tab; its headline number opens the item',
  [T + '/article:9/p:4']: 'the "Read BENCH-005 →" line became an actions row holding the same link',
  [T + '/article:10']: 'the attack-suite tile became the "Attacks" tab panel',
  [T + '/article:11']: 'the durability tile became the "Durability" tab panel; its label opens the folded note',
  [T + '/article:12']: 'the fork-gossip tile became an accordion item of the "Attacks" tab; its headline opens the item',
  [T + '/article:13']: 'the TCP-server tile became an accordion item of the "On the wire" tab; its headline opens the item',
  [T + '/article:14']: 'the "What this does not yet do" tile became an accordion item of the "What it closes" tab',
  [T + '/article:14/ul:1']: 'the same nine lines, now facts (the census\'s 160-character cut falls a character later)',
  [T + '/article:14/ul:1/li:2']: 'the same line, now a fact: term and value (the census\'s 160-character cut falls a character later)',
  [T + '/article:14/ul:1/li:4']: 'the same line, now a fact: term and value (the census\'s 160-character cut falls a character later)',
  [T + '/article:14/ul:1/li:7']: 'the same line, now a fact: term and value (the census\'s 160-character cut falls a character later)',
  [T + '/article:14/ul:1/li:8']: 'the same line, now a fact: term and value (the census\'s 160-character cut falls a character later)',
  [T + '/div:1']: 'the CMS insertion anchor, kept: now its own row after the tabs',
  'id:statsledger-closes-title': 'the tile label "What this closes by construction" is the tab "What it closes" now, and its words open the table caption',
  'id:statsledger-sample-title': 'the tile label "A real chain of 5, byte for byte" is the tab "On the wire" now, and its words open the table caption',
  'id:statsledger-attacks-title': 'the tile label "Attack suite · 7 of 7 refused" is the tab "Attacks" now, and its words open the table caption'
};
for (const li of [1, 2, 3, 4, 5]) {
  reshaped[T + '/article:4/ol:1/li:' + li] = 'a sample entry became a table row (its "CID" label is the column heading now)';
  reshaped[T + '/article:4/ol:1/li:' + li + '/p:2'] = 'the entry\'s "CID …" line became the CID cell; "CID" is the column heading now';
}
for (const li of [1, 2, 3]) {
  reshaped[T + '/article:8/ol:1/li:' + li] = 'a CPU bar became an Ark bar row; its detail line moved to the facts beside the bars';
  reshaped[T + '/article:8/ol:1/li:' + li + '/span:1'] = 'the bar\'s name, without its detail line (now the matching fact beside the bars)';
}
for (const t of [[2, 1], [7, 1], [7, 2], [8, 1], [10, 1], [11, 1]]) {
  reshaped[T + '/article:' + t[0] + '/div:' + t[1]] = 'the same table, now with a caption that says what it shows';
  reshaped[T + '/article:' + t[0] + '/div:' + t[1] + '/table:1'] = 'the same table, now with a caption that says what it shows';
}
/* Why nothing carries these keys now. */
const retired = {
  'page:/div:1': 'the page column wrapper (stats-shell); a block page has none -- its root (page:/) is the column',
  [T]: 'the bento grid wrapper (stats-bento); the blocks sit directly in the page root',
  [T + '/article:1/p:3']: 'the hero chip row: its three chips are facts in "Where this lives in the spec" now, each keeping its key',
  [T + '/article:1/a:1']: 'the hero back link: the trail\'s "Mesh performance" and the pager\'s "Back to the main measurements" lead to the same page',
  [T + '/article:1/a:1/span:1']: 'the hand-drawn "←" glyph of that back link'
};
for (const a of [2, 4, 10, 11]) retired[T + '/article:' + a + '/h2:1'] = 'the tile heading is now the caption of the table it introduced (same words); a <caption> is not a layout target (js/content/layout.js KEY_TAGS has no caption), so nothing can carry its key until captions become keyable';
for (const li of [1, 2, 3, 4, 5]) {
  retired[T + '/article:4/ol:1/li:' + li + '/p:1'] = 'the entry\'s head line; its two words are the Position and Payload cells, which keep its two spans\' keys';
  retired[T + '/article:4/ol:1/li:' + li + '/p:2/span:1'] = 'the "CID" label of each sample entry; the table\'s CID column heading says it once';
}
for (const [key] of continuity.readCensus(ROUTE).map((e) => [e.key])) {
  if (/\/(p|td):\d+\/(strong|code):\d+$/.test(key)) retired[key] = 'inline emphasis or code inside a paragraph or cell; Ark text holds no inline markup, and the element around it keeps the key and every word';
}

(async () => {
  /* ---- the module is a spec of Ark blocks -------------------------------------------------- */
  const file = 'js/pages/stats-ledger.js';
  const source = fs.readFileSync(path.join(checks.ROOT, file), 'utf8');
  checks.assertSourceIsSpec(source, file);
  assert(/block: 'meter'/.test(source) && !/stats-bar-row|tabindex/.test(source), 'the CPU bars are Ark\'s meter (rows are list items, never Tab stops)');
  const route = require('./lib/site-catalog.cjs').loadCatalog().catalog['stats/ledger'];
  assert.equal(route.scripts[0], 'js/content/chain-sample.js', '/stats/ledger loads chain-sample.js first');
  assert.deepEqual([...route.scripts.slice(-2)], ['js/content/glossary/stats-ledger.js', file], 'the route loads its own glossary (the terms it renders), then the page');
  assert(route.scripts.indexOf('js/ark/blocks.js') > 0 && route.scripts.indexOf('js/ark/blocks.js') < route.scripts.indexOf(file), 'the route loads the blocks before its module');
  assert.equal(JSON.parse(JSON.stringify(vm.runInNewContext(fs.readFileSync('js/content/site-pages.js', 'utf8') + ';ArkSitePages.row("stats/ledger")'))).label, 'Ledger benchmark detail', 'its catalog name is its own, not the article\'s');
  assert(fs.readFileSync('js/pages/stats.js', 'utf8').includes("'route:stats/ledger'"), '/stats links to /stats/ledger');

  /* ---- what the visitor gets: everything the old page had ---------------------------------- */
  const sample = vm.runInNewContext(fs.readFileSync('js/content/chain-sample.js', 'utf8') + ';window.ArkChainSample', { window: {} });
  assert.equal(sample.entries.length, 5, 'five entries in the sample');
  assert.equal(sample.entries[0].payload, 'Genesis');
  assert.equal(sample.entries[3].payload, 'Spend');
  for (const e of sample.entries) {
    assert(/-S[0-9a-f]{128}$/.test(e.text), 'entry text ends in a 64-byte ed25519 signature: ' + e.pos);
    assert(/^G[0-9a-f]{64}-YLEDGERENTRY-/.test(e.text), 'entry starts with G<key>-YLEDGERENTRY-: ' + e.pos);
  }
  const seen = await checks.visit(ROUTE, (window, page) => ({
    tabs: [...page.querySelectorAll('#statsledger-views [role="tab"]')].map((el) => el.textContent.trim()),
    tables: [...page.querySelectorAll('table')].map((t) => t.querySelectorAll('tbody tr').length),
    sampleRows: [...page.querySelectorAll('table')].filter((t) => /byte for byte/.test(t.querySelector('caption').textContent)).map((t) => [...t.querySelectorAll('tbody tr')].map((tr) => tr.children[0].textContent))[0],
    meter: [...page.querySelectorAll('[data-ark-block="meter"] [data-ark-part="meter-label"]')].map((l) => l.textContent),
    accordion: [...page.querySelectorAll('[data-ark-part="accordion-trigger"]')].map((b) => b.textContent.trim()),
    meta: [...page.querySelectorAll('#statsledger-hero [data-ark-part="hero-meta"] dt')].map((el) => el.textContent),
    h1: (page.querySelector('h1') || {}).textContent,
    statsHome: page.querySelectorAll('a[data-scene-link="stats"]').length,
    docs: [...page.querySelectorAll('a[data-scene-link="reference"]')].map((a) => decodeURIComponent(a.getAttribute('href'))),
    focusableRows: page.querySelectorAll('li[tabindex]').length,
    text: page.textContent
  }));
  assert.deepEqual(seen.blocks, ['breadcrumb', 'hero', 'tabs', 'pager'], 'trail, the answer, the detail as tabs, the way on');
  /* What it closes leads (ledger recheck 2026-10-21, LG-5: the page opened on the mechanism) */
  assert.deepEqual(seen.tabs, ['What it closes', 'How it works', 'On the wire', 'Fleet runs', 'One machine', 'Attacks', 'Durability']);
  assert.deepEqual(seen.meta, ['Sustained, 6 nodes, 5 min', 'Attacks refused', 'Recovery vs live admission'], 'the hero answers with the three numbers that matter');
  assert.equal(seen.h1, 'Ledger benchmark detail', 'the dashboard h1 is its own name, not the article\'s');
  assert(seen.text.includes('a finance resolver by construction'), 'the old kicker is kept');
  assert.deepEqual(seen.tables, [4, 5, 7, 5, 3, 7, 4], 'every table row: what closes, the 5 sample entries, the 6-node burst, the single-pair runs, the one-core modes, the 7 attacks, the 4 replication modes');
  assert.deepEqual(seen.sampleRows, ['pos 0', 'pos 1', 'pos 2', 'pos 3', 'pos 4'], 'the real chain, genesis to the latest receive');
  assert.deepEqual(seen.meter, ['Grammar admit', 'Ed25519 verify', 'Chain head + append'], 'the CPU split');
  for (const title of ['Where this lives in the spec', 'What this does not yet do', 'TCP server · machine-to-machine ingress', 'Newest certified resolver fleet · 8 VPS nodes + local', 'Historical admission fleet · 6 nodes sustained for 5 minutes', 'Historical short-burst peak · 6 nodes, 868 ms', 'Single-pair detail · bk2 → mk2, 128 chains × 500 interleaved', 'Measured today', 'Current local resolver audit · Apple M2', 'Fork gossip · a third observer learns about equivocation']) {
    assert(seen.accordion.includes(title), 'the "' + title + '" topic is still on the page');
  }
  for (const figure of ['279,269 certified', '1,712,006 combined replica-applications/s', '61,398 all-replica logical ops/s', '812,268 transport', 'K-of-N peer replication', 'outer W<hex> expansion', '12,403', '79,654', '41,762', '22,559', 'LEDGERENTRY', 'flux-spec 0.4.2', 'hash chain']) {
    assert(seen.text.includes(figure), 'the page still says ' + figure);
  }
  assert.equal(seen.focusableRows, 0, 'no list row is a Tab stop');
  assert(seen.statsHome >= 2, 'the trail and the pager lead back to /stats through the router');
  for (const doc of ['docs/finance-ledger-design.md', 'docs/prototype-to-production.md', 'docs/evidence/bench-005-million-ops-audit.md']) assert(seen.docs.some((href) => href.includes(doc)), doc + ' opens in the reference reader');
  assert.deepEqual(seen.refused, [], 'no block was refused');
  assert.deepEqual(seen.termsMissing, [], 'every glossary term has an entry in docs/glossary.md');
  assert(['equivocation', 'cid', 'node', 'segment', 'fleet'].every((term) => seen.terms.includes(term)), 'jargon is glossed: ' + seen.terms.join(', '));
  assert.equal(seen.inserts, 1, 'the CMS insertion anchor is still there');
  assert.equal(seen.labelledBy, 'statsledger-title');

  /* ---- the crawler's copy is styled, complete and deterministic ----------------------------- */
  const ssr = await checks.assertServerRender(ROUTE, 'stats/ledger', { idPrefix: 'statsledger-' });

  /* ---- saved CMS edits still land ---------------------------------------------------------- */
  const census = continuity.readCensus(ROUTE);
  const after = await continuity.pageKeys(ROUTE);
  const tally = continuity.assertContinuity(census, after, { reshaped, retired });
  assert.equal(tally.kept + tally.reshaped + tally.retired, census.length, 'every old key is accounted for');
  const landed = await continuity.assertSavedEditsLand(ROUTE, census, { reshaped, retired });
  assert.equal(landed, census.length - 1 - Object.keys(retired).length, 'a saved frame on every old key but page:/ and the retired ones landed');
  assert(after.every((entry) => !/^id:ark-r-/.test(entry.key)), 'no generated (ark-r-) id became a layout key');

  console.log(`PASS: /stats/ledger is a spec of Ark blocks with nothing dropped (${ssr.blocks} blocks server-rendered styled, ${ssr.panels} tab panels); ${tally.kept} old layout keys kept, ${tally.reshaped} reshaped, ${tally.retired} retired, and ${landed} saved edits land.`);
})().catch((error) => { console.error(error); process.exit(1); });

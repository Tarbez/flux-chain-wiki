'use strict';
/* run-tests-timeout-ms: 240000 */
/* /resolvers as a page of Ark blocks (js/pages/resolvers.js, DEFXN polish Wave 3, W3-STATS).

   Named regressions it holds:
   - Dead end (docs/ux-audit/pages-ux-b.md /resolvers P0; pages.md P2): the page had no way on. It
     has a trail, the deploy actions and a pager to what-is-a-resolver, resolver math, reference
     resolvers, creating a network, the measured throughput on /stats and the live view.
   - Two tile systems (P2): the hand-built stats-tile hero, count tile, tables, chips and folds
     are Ark blocks now (hero details, tables, steps, accordion, disclosures).
   - Fold: one tab per question, each view <= 1.6x at 1440x900 and 390x844 (W3-STATS report).
   - Nothing is typed by hand: the counts, chain ids and compositions render from
     js/content/registry-snapshot.js, the words from the RESOLVER manifest (tests/registry-snapshot.mjs).
   - Absent is not 0: a control key the sources do not hold says "not in the sources" and is sent
     to Explore; a resolver that composes nothing says "none" (a reading); the capabilities
     launched on the development network are a measured 0, said as one.
   - An Ark table's absent cell carries a visually hidden "no value" that escapes the table's
     scroll region (position:absolute, no positioned ancestor) and added ~260px of blank scroll
     below this page on a phone; the cells say why instead (reported to the coordinator).
   - No snapshot: a refusal that names the missing file and the remedy, never an empty table.
   - Saved CMS data is never rewritten: every old layout key still lands
     (tests/lib/layout-continuity.cjs against tests/fixtures/layout-keys/resolvers.tsv), reshaped
     or retired only with the reason below. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const continuity = require('./lib/layout-continuity.cjs');
const checks = require('./lib/block-page-checks.cjs');

const ROUTE = '/resolvers';
const T = 'page:/div:1/div:1';

/* Why each old key whose words changed shape still lands on its successor. */
const reshaped = {
  [T + '/article:1']: 'the hero tile became the hero block: kicker, title and lede kept; the counts are its details now, the chips moved to "About this snapshot" and the live link to the pager',
  [T + '/article:1/p:2']: 'the same lede, now opening with what a resolver is (ledger recheck 2026-10-21, RV-2: the page never said it)',
  [T + '/article:2']: 'the counts tile became the hero\'s details: the same three counts (label first, then the number), plus the capabilities launched',
  [T + '/article:2/p:1']: 'a count row became a hero detail: its label first ("First-party chains"), then the number',
  [T + '/article:2/p:2']: 'a count row became a hero detail: its label first, then the number',
  [T + '/article:2/p:3']: 'a count row became a hero detail: its label first ("Capabilities"), then the number',
  [T + '/article:2/p:1/span:1']: 'the label "native resolver chains" is the detail label "First-party chains" now (shorter, so the phone view fits)',
  [T + '/article:2/p:3/span:1']: 'the label "capability manifests" is the detail label "Capabilities" now (shorter, so the phone view fits)',
  [T + '/article:3']: 'the resolver-chains tile became the first tab panel; its label is the tab',
  [T + '/article:4']: 'the capabilities tile became the second tab panel; its label is the tab',
  [T + '/article:5']: 'the bridge-chains tile became the third tab panel',
  [T + '/article:6']: 'the "Deploy your own" tile became the fourth tab panel; its label is the tab',
  [T + '/article:6/ol:1']: 'the deploy steps are Ark\'s steps now, each with its number',
  [T + '/article:6/p:2']: 'the six onward links: the two deploy links are this actions row, the other four are in the pager',
  [T + '/article:7']: 'the applications tile became the "Applications" tab panel',
  [T + '/article:7/details:1']: 'the fold around the applications: the tab is its fold now, and its label and introduction fold on a phone in this disclosure',
  [T + '/article:7/details:1/ul:1']: 'the application list became an accordion: one item per application',
  [T + '/article:8']: 'the boundary tile became "About this snapshot", which also holds the snapshot and devnet lines',
  [T + '/article:1/p:1']: 'the kicker is the hero eyebrow, "A resolver" for "Every resolver": Ark holds an eyebrow to 64 characters and, since 2026-10-19, measures the words a copy: key shows rather than the key -- the old 66 were refused (W3-ARK-FOLLOWUPS)',
  [T + '/article:4/div:1/table:1/tbody:1/tr:2/td:4']: 'a dash for "used by nothing" now says "none" -- a reading, not a missing one'
};
for (const [n, label] of [[3, 'resolver-chain'], [4, 'capability'], [5, 'bridge-chain']]) {
  const wrap = n === 5 ? T + '/article:5/details:1/div:1' : T + '/article:' + n + '/div:1';
  reshaped[wrap] = 'the same ' + label + ' table, now with a caption that says what it shows';
  reshaped[wrap + '/table:1'] = 'the same ' + label + ' table, now with a caption that says what it shows';
}
reshaped[T + '/article:3/div:1/table:1/tbody:1'] = 'the same twelve rows: a dash now says "none" or "not in the sources", and the Explore column moved to the list beside the table';
reshaped[T + '/article:4/div:1/table:1/tbody:1'] = 'the same five rows; a dash for "used by nothing" now says "none"';
reshaped[T + '/article:4/div:1/table:1/tbody:1/tr:2'] = 'the same row; its "used by" dash now says "none"';
for (let tr = 1; tr <= 12; tr++) {
  reshaped[T + '/article:3/div:1/table:1/tbody:1/tr:' + tr] = 'the same row: a dash now says "none" (composes nothing) or "not in the sources" (control key), and its Explore link is in the list beside the table';
  reshaped[T + '/article:3/div:1/table:1/tbody:1/tr:' + tr + '/td:4'] = 'the control-key dash now says why there is no value: "not in the sources" (Explore reads it)';
}
for (const tr of [1, 7, 8]) reshaped[T + '/article:3/div:1/table:1/tbody:1/tr:' + tr + '/td:2'] = 'a dash for "composes nothing" now says "none" -- a reading, not a missing one';
for (let li = 1; li <= 5; li++) reshaped[T + '/article:6/ol:1/li:' + li] = 'the same step, now numbered';
for (let li = 1; li <= 6; li++) reshaped[T + '/article:7/details:1/ul:1/li:' + li] = 'an application became an accordion item: its name the title, its status, summary, measurement and open issues inside';
/* Why nothing carries these keys now. */
const retired = {
  'page:/div:1': 'the page column wrapper (stats-shell); a block page has none -- its root (page:/) is the column',
  [T]: 'the bento grid wrapper (stats-bento); the blocks sit directly in the page root',
  [T + '/article:1/p:3']: 'the hero chip row: its two chips are lines of "About this snapshot" and its live link is in the pager, each keeping its key',
  [T + '/article:5/details:1']: 'the fold around the bridge table; the tab is its fold now',
  [T + '/article:3/div:1/table:1/thead:1/tr:1/th:6']: 'the Explore column\'s empty heading; the links moved to "Open in Explore · each chain"'
};
for (const k of [T + '/article:3/h2:1', T + '/article:4/h2:1', T + '/article:5/details:1/summary:1']) retired[k] = 'the heading is now the caption of the table it introduced (same words); a <caption> is not a layout target (js/content/layout.js KEY_TAGS has no caption), so nothing can carry its key until captions become keyable';
for (let li = 1; li <= 6; li++) retired[T + '/article:7/details:1/ul:1/li:' + li + '/p:1'] = 'the application\'s head line: its name is the accordion title and its status the first line inside, each keeping its key';
for (const { key } of continuity.readCensus(ROUTE)) {
  if (/\/(th|td):\d+\/(span|code|a):\d+(\/code:\d+)?$/.test(key) && !/td:5\/a:1$/.test(key)) retired[key] = 'a chip, code mark or dash inside a table cell; Ark\'s table cells hold text only, and the cell keeps the key and every word';
}
reshaped['page:/div:1/div:1/article:6/p:2/a:2'] = 'the same "Open Deploy" link; Ark\'s button also says, to a screen reader, that it opens another site';

(async () => {
  /* ---- the module is a spec of Ark blocks -------------------------------------------------- */
  const file = 'js/pages/resolvers.js';
  const source = fs.readFileSync(path.join(checks.ROOT, file), 'utf8');
  checks.assertSourceIsSpec(source, file);
  const route = require('./lib/site-catalog.cjs').loadCatalog().catalog.resolvers;
  assert(route.scripts.indexOf('js/ark/blocks.js') >= 0 && route.scripts.indexOf('js/ark/blocks.js') < route.scripts.indexOf(file), 'the route loads the blocks before its module');
  for (const data of ['js/content/registry-snapshot.js', 'js/content/resolver-applications.js']) assert(route.scripts.indexOf(data) >= 0 && route.scripts.indexOf(data) < route.scripts.indexOf(file), 'the route loads ' + data + ' before its module');

  /* ---- what the visitor gets: everything the old page had ---------------------------------- */
  const ctx = { window: {} }; ctx.window = ctx;
  vm.runInNewContext(fs.readFileSync('js/content/registry-snapshot.js', 'utf8') + ';' + fs.readFileSync('js/content/resolver-applications.js', 'utf8'), ctx);
  const plain = (v) => JSON.parse(JSON.stringify(v)); // this realm's arrays, for strict deepEqual
  const snap = plain(ctx.ArkRegistrySnapshot), apps = plain(ctx.ArkResolverApplications);
  const seen = await checks.visit(ROUTE, (window, page) => ({
    tabs: [...page.querySelectorAll('#registry-views [role="tab"]')].map((el) => el.textContent.trim()),
    tables: [...page.querySelectorAll('table')].map((t) => ({ caption: t.querySelector('caption').textContent, rows: [...t.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((c) => c.textContent)) })),
    absentCells: page.querySelectorAll('td[data-state="absent"], th[data-state="absent"]').length,
    meta: [...page.querySelectorAll('#registry-hero [data-ark-part="hero-meta"] div')].map((d) => d.textContent),
    explore: [...page.querySelectorAll('a.ark-facts__link')].map((a) => a.getAttribute('href')),
    steps: page.querySelectorAll('[data-ark-part="step"]').length,
    apps: [...page.querySelectorAll('#registry-views [data-ark-part="accordion-trigger"]')].map((b) => b.textContent.trim()),
    links: [...page.querySelectorAll('a[data-scene-link]')].map((a) => a.getAttribute('data-scene-link')),
    external: [...page.querySelectorAll('a[href^="https://"]')].map((a) => a.getAttribute('href')),
    text: page.textContent
  }));
  assert.deepEqual(seen.blocks, ['breadcrumb', 'hero', 'disclosure', 'tabs', 'pager'], 'trail, the answer, where the numbers come from, the detail as tabs, the way on');
  assert.deepEqual(seen.tabs, ['Resolver chains', 'Capabilities', 'Bridge chains', 'Deploy your own', 'Applications']);
  const c = snap.counts;
  assert.deepEqual(seen.meta, ['First-party chains' + c.nativeResolverChains, 'Bridge chains' + c.bridgeChains, 'Capabilities' + c.capabilities, 'Capabilities launched' + snap.observation.capabilitiesLaunched + ' on the development network · ' + snap.observation.date], 'the hero answers with the counts, from the snapshot');
  assert.deepEqual(seen.tables.map((t) => t.rows.length), [snap.resolvers.length, snap.capabilities.length, snap.bridges.length], 'every resolver chain, capability and bridge chain has its row (no feature reduction)');
  assert.deepEqual(seen.tables[0].rows.map((r) => r[0]), snap.resolvers.map((r) => r.chainId), 'chain ids come from the snapshot, in its order');
  assert.equal(seen.absentCells, 0, 'no absent cell is drawn: each says why instead (an Ark absent cell escapes the scroll region)');
  for (const r of snap.resolvers) {
    const row = seen.tables[0].rows.find((cells) => cells[0] === r.chainId);
    assert.equal(row[4], r.control ? r.control.slice(0, 12) : 'not in the sources', r.chainId + ': a control key the sources lack says so, never 0 or a blank');
    if (!r.composes.length) assert.equal(row[2], 'none', r.chainId + ': composing nothing is a reading ("none")');
  }
  assert.deepEqual(seen.explore, snap.resolvers.map((r) => 'https://explore.defxn.com/#' + encodeURIComponent(r.chainId)), 'every chain still opens in Explore, by its id');
  assert.equal(seen.steps, 5, 'the five deploy steps');
  for (const a of apps.applications) assert(seen.apps.includes(a.name), a.name + ' is still listed under Applications');
  assert(/In service|Draft/.test(seen.text) && seen.text.includes('Listed ' + apps.updated), 'each application keeps its status and the list its date');
  for (const target of ['resolver', 'resolver-math', 'references', 'deploy', 'stats']) assert(seen.links.includes(target), 'the page leads on to ' + target);
  assert(seen.external.includes('https://explore.defxn.com'), 'the live view is still linked');
  assert(seen.text.includes(snap.source.commit.slice(0, 7)) && seen.text.includes(snap.observation.date), 'the snapshot commit and the devnet date are named');
  assert.deepEqual(seen.refused, [], 'no block was refused');
  assert.deepEqual(seen.termsMissing, [], 'every glossary term has an entry in docs/glossary.md');
  assert(['resolver', 'capability', 'grammar', 'provider', 'control key'].every((t) => seen.terms.includes(t)), 'jargon is glossed: ' + seen.terms.join(', '));
  assert(!seen.terms.includes('served') && !seen.terms.includes('signer'), 'no homonym is glossed with the wrong meaning ("HTTP-served", "signer rotations")');
  assert.equal(seen.inserts, 1, 'the CMS insertion anchor is still there');
  assert.deepEqual(seen.h1, ['resolvers-title']);

  /* ---- no snapshot: a refusal that names what it needs --------------------------------------- */
  const doc = new (require('jsdom').JSDOM)('').window.document;
  const ArkUI = { pageModules: {} };
  vm.runInNewContext(source, { ArkUI, window: {}, ArkCopy: { text: () => 'x' }, document: doc });
  const empty = ArkUI.pageModules.resolvers.spec(null, null);
  const refusal = empty.find((e) => e.block === 'callout');
  assert(refusal && /did not load/.test(refusal.props.body) && /registry-snapshot\.js/.test(refusal.props.missing) && /snapshot-registry\.mjs --write/.test(refusal.props.remedy), 'a missing snapshot is refused by name: failure, missing file, remedy');
  assert(!empty.some((e) => e.block === 'tabs'), 'and no empty table stands in for "no resolvers"');

  /* ---- the crawler's copy is styled, complete and deterministic ----------------------------- */
  const ssr = await checks.assertServerRender(ROUTE, 'resolvers', { idPrefix: ['registry-', 'resolvers-title'] });

  /* ---- saved CMS edits still land ---------------------------------------------------------- */
  const census = continuity.readCensus(ROUTE);
  const after = await continuity.pageKeys(ROUTE);
  const tally = continuity.assertContinuity(census, after, { reshaped, retired });
  assert.equal(tally.kept + tally.reshaped + tally.retired, census.length, 'every old key is accounted for');
  const landed = await continuity.assertSavedEditsLand(ROUTE, census, { reshaped, retired });
  assert.equal(landed, census.length - 1 - Object.keys(retired).length, 'a saved frame on every old key but page:/ and the retired ones landed');
  assert(after.every((entry) => !/^id:ark-r-/.test(entry.key)), 'no generated (ark-r-) id became a layout key');

  console.log(`PASS: /resolvers is a spec of Ark blocks with nothing dropped (${ssr.blocks} blocks server-rendered styled, ${ssr.panels} tab panels); ${tally.kept} old layout keys kept, ${tally.reshaped} reshaped, ${tally.retired} retired, and ${landed} saved edits land.`);
})().catch((error) => { console.error(error); process.exit(1); });

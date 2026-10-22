'use strict';
/* run-tests-timeout-ms: 240000 */
/* /resolver-math as a page of Ark blocks (js/pages/resolver-math.js, DEFXN polish Wave 3, W3-STATS).

   Named regressions it holds:
   - Fold (docs/ux-audit/pages-ux-b.md /resolver-math P0): 8.54x the viewport on a desktop and
     13.58x on a phone, the equation then six sections of panels, tables and figures. The hero states
     the sum (its three numbers follow the equation since 2026-10-22); the equation is the first of four tabs; each view measures <= 1.6x
     at 1440x900 and 390x844 (W3-STATS report). Folding is structure: on a phone the equation, the
     builder and the explorer open with one press (Ark disclosures), never cut off.
   - Type-scale drift (P1): 22 font sizes, 9px kickers -- the shell, headings, tables and notes are
     Ark's now; css/resolver-math.css keeps only the live scenes, nothing below 12px.
   - The live scenes are real: the equation counts the census, the builder rebuilds the resolver
     without a term and the explorer runs the real engine (tests/resolver-algebra.cjs holds the
     claims); here, each is still on the page and still interactive.
   - Orphan (P1): the trail leads to What is a resolver?, the pager to /resolvers and the evidence.
   - Saved CMS data is never rewritten: every old layout key still lands -- the equation, the builder,
     the explorer and the drawings are pinned whole, so their own keys never moved
     (tests/lib/layout-continuity.cjs against tests/fixtures/layout-keys/resolver-math.tsv). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const continuity = require('./lib/layout-continuity.cjs');
const checks = require('./lib/block-page-checks.cjs');

const ROUTE = '/resolver-math';
const P = 'page:/div:1';

/* Why each old key whose words changed shape still lands on its successor. */
const reshaped = {
  'page:/nav:1': 'the hand-built trail became Ark\'s breadcrumb: the same three places',
  [P + '/header:1']: 'the page header became the hero block: the same eyebrow, title and lede (the sum\'s three numbers were its details until the first-visit audit 2026-10-22; they follow the equation now)',
  [P + '/div:2']: 'the builder\'s section head became the "Try it" tab panel ("Remove a term" until 2026-10-22); its heading is the figure\'s caption',
  [P + '/div:4']: 'the drawings\' section head became the "How records work" tab panel ("Two ideas" until 2026-10-22)',
  [P + '/div:5']: 'the two-drawing grid became an accordion, one drawing per item',
  [P + '/div:5/section:1']: 'the record drawing\'s panel became an accordion item; its label is the item\'s title',
  [P + '/div:5/section:2']: 'the signing drawing\'s panel became an accordion item; its label is the item\'s title',
  [P + '/div:5/section:1/figure:1']: 'the same drawing in Ark\'s figure, which also names its kind ("Illustration")',
  [P + '/div:5/section:2/figure:1']: 'the same drawing in Ark\'s figure, which also names its kind ("Illustration")',
  [P + '/div:6']: 'the "What is fixed" section head became the "Fixed vs bends" tab panel; since 2026-10-22 it is the "What is fixed, and what bends" disclosure in "How records work"',
  [P + '/div:7/section:2']: 'the "One letter, ten real cases" panel became an accordion item of the same name',
  [P + '/div:8']: 'the explorer\'s section head became the "Resolve a block" tab panel; since 2026-10-22 it is the "Resolve a block yourself" disclosure in "Try it"; its heading is the figure\'s caption',
  [P + '/div:10']: 'the rules\' section head became the "Rules and limits" tab panel',
  [P + '/div:11/section:2']: 'the "Written as algebra" panel became an accordion item of the same name; its lines are facts',
  [P + '/div:12']: 'the totals\' section head became the "What it adds up to" tab panel; since 2026-10-22 it is the totals note\'s panel in "Rules and limits"',
  [P + '/div:13/article:1']: 'the "Audited families built" tile is a fact after the equation (a hero detail until 2026-10-22): the number, then what it counts',
  [P + '/div:13/article:2']: 'the "Declared, not built" tile is a fact after the equation (a hero detail until 2026-10-22): the number, then what it counts',
  [P + '/div:13/article:1/p:2']: 'the tile\'s number is the fact\'s value now, followed by its line ("each with a measured limit")',
  [P + '/div:13/article:2/p:2']: 'the tile\'s number is the fact\'s value now, followed by its line ("things that cannot be made real today")',
  [P + '/div:13/section:1']: 'the prose panel became the totals note (a press away at every width since 2026-10-22, when it joined "Rules and limits"), with its links',
  [P + '/div:13/section:1/p:2']: 'the links row became an actions row: the same two links, and the deprecation ledger',
  [P + '/div:14']: 'the "Where this page stops being true" section head became an accordion item of the same name',
  [P + '/div:16/section:1']: 'the "Keep reading" panel became the closing pager under the same label',
  [P + '/div:16/section:1/div:1']: 'the reading links: the pager\'s list now (the deprecation ledger moved to the totals\' links)',
  [P + '/div:17']: 'the CMS insertion anchor, kept: now its own row after the tabs'
};
for (const wrap of [P + '/div:7/section:1/div:1', P + '/div:7/section:2/div:1', P + '/div:11/section:1/div:1', P + '/div:13/section:2/div:1', P + '/div:15/section:1/div:1']) {
  reshaped[wrap] = 'the same table, now with a caption that says what it shows';
  reshaped[wrap + '/table:1'] = 'the same table, now with a caption that says what it shows';
}
/* Why nothing carries these keys now. */
const retired = {
  [P]: 'the page column wrapper (dash shell); a block page has none -- its root (page:/) is the column',
  [P + '/header:1/div:1']: 'the header\'s copy wrapper; the hero lays out its own parts',
  [P + '/div:7']: 'the two-panel grid of the "fixed vs bends" section; its panels are this tab\'s table and accordion',
  [P + '/div:7/section:1']: 'the panel around the layers table; the table and its note are this tab\'s blocks now',
  [P + '/div:11']: 'the rules grid; the rules table and the algebra are this tab\'s blocks now',
  [P + '/div:11/section:1']: 'the panel around the rules table; the table is this tab\'s block now',
  [P + '/div:13']: 'the totals grid; its tiles are hero details, its prose a note, its table this tab\'s block',
  [P + '/div:13/section:2']: 'the panel around the limits table; the table is this tab\'s block now',
  [P + '/div:15']: 'the gaps grid; its table is the "Where this page stops being true" accordion item\'s',
  [P + '/div:15/section:1']: 'the panel around the gaps table',
  [P + '/div:16']: 'the "Keep reading" grid; the pager is its successor',
  [P + '/div:13/article:1/p:2/strong:1']: 'the tile\'s number element; the hero detail holds the number as text',
  [P + '/div:13/article:2/p:2/strong:1']: 'the tile\'s number element; the hero detail holds the number as text',
  [P + '/div:13/article:1/p:2/span:1']: 'the tile\'s empty unit; the count has no unit',
  [P + '/div:13/article:2/p:2/span:1']: 'the tile\'s empty unit; the count has no unit',
  [P + '/div:13/article:1/p:3']: 'the tile\'s line ("each with a measured limit"): its words follow the number in the hero detail',
  [P + '/div:13/article:2/p:3']: 'the tile\'s line ("things that cannot be made real today"): its words follow the number in the hero detail'
};
for (const k of [P + '/div:6/p:2', P + '/div:10/h2:1']) retired[k] = 'the line is now the caption of the table it introduced (same words); a <caption> is not a layout target (js/content/layout.js KEY_TAGS has no caption), so nothing can carry its key until captions become keyable';
for (const { key } of continuity.readCensus(ROUTE)) {
  if (/^page:\/nav:1\/a:\d+\/svg:1(\/path:\d+)?$/.test(key)) retired[key] = 'the arrow icon js/hero-motion.js drew inside the old breadcrumb link; Ark\'s breadcrumb draws none';
  if (/\/t[dh]:\d+\/(span|code):\d+$/.test(key) || /\/td:\d+\/span:\d+\/code:\d+$/.test(key)) retired[key] = 'a status tag or code mark inside a table cell; Ark\'s table cells hold text only, and the cell keeps the key and every word';
}
retired['page:/div:1/div:11/section:1/div:1/table:1/tbody:1/tr:2/td:3/span:1/span:1'] = 'the "measured — BENCH-012" note inside a table cell; the cell keeps the key and the words';

(async () => {
  /* ---- the module is a spec of Ark blocks -------------------------------------------------- */
  const file = 'js/pages/resolver-math.js';
  const source = fs.readFileSync(path.join(checks.ROOT, file), 'utf8');
  checks.assertSourceIsSpec(source, file);
  const route = require('./lib/site-catalog.cjs').loadCatalog().catalog['resolver-math'];
  assert(route.scripts.indexOf('js/ark/blocks.js') >= 0 && route.scripts.indexOf('js/ark/blocks.js') < route.scripts.indexOf(file), 'the route loads the blocks before its module');

  /* ---- what the visitor gets: everything the old page had ---------------------------------- */
  const ctx = { window: {} }; ctx.window = ctx;
  vm.runInNewContext(fs.readFileSync('js/content/resolver-algebra.js', 'utf8'), ctx);
  const ALG = ctx.ArkResolverAlgebra;
  const seen = await checks.visit(ROUTE, async (window, page) => {
    const sum = page.querySelectorAll('.rm-eq-sum .rm-eq-row:not(.rm-eq-total)').length;
    const cells = page.querySelectorAll('.rm-field-svg .rm-cell:not(.rm-cell-never)').length;
    const counted = [...page.querySelectorAll('.rm-eq-sum .rm-eq-row:not(.rm-eq-total) .rm-eq-n')].reduce((a, n) => a + Number(n.textContent.replace(/[^0-9]/g, '')), 0);
    const never = page.querySelectorAll('.rm-cell-never').length;
    // the builder really removes a term: untick the social verbs, AFOLLOW stops being sayable
    const social = [...page.querySelectorAll('.rm-term')].find((l) => /social verbs/.test(l.textContent)).querySelector('input');
    const said = () => [...page.querySelectorAll('.rm-say')].filter((li) => li.dataset.state === 'yes').length;
    const before = said();
    social.checked = false; social.dispatchEvent(new window.Event('change'));
    const after = said();
    social.checked = true; social.dispatchEvent(new window.Event('change'));
    // the explorer resolves what it is given
    const input = page.querySelector('#rm-block');
    input.value = 'AFOLLOW'; input.dispatchEvent(new window.Event('input'));
    const verdict = page.querySelector('.rm-verdict').dataset.state;
    return {
      tabs: [...page.querySelectorAll('#rm-views [role="tab"]')].map((el) => el.textContent.trim()),
      slots: [...page.querySelectorAll('[data-ark-slot]')].map((el) => el.getAttribute('data-ark-slot')),
      meta: [...page.querySelectorAll('#rm-hero [data-ark-part="hero-meta"] dt')].map((el) => el.textContent),
      sumFacts: [...page.querySelector('[data-ark-slot="equation"]').closest('[data-ark-part="tabs-content"]').querySelectorAll('[data-ark-part="fact-term"]')].map((el) => el.textContent),
      kinds: [...page.querySelectorAll('[data-ark-part="figure"]')].map((el) => el.getAttribute('data-kind')),
      tables: [...page.querySelectorAll('table')].map((t) => t.querySelectorAll('tbody tr').length),
      sum, cells, counted, never, before, after, verdict,
      chips: page.querySelectorAll('.rm-chip').length,
      links: [...page.querySelectorAll('a[data-scene-link]')].map((a) => a.getAttribute('data-scene-link')),
      docs: [...page.querySelectorAll('a[data-scene-link="reference"]')].map((a) => decodeURIComponent(a.getAttribute('href'))),
      text: page.textContent
    };
  });
  assert.deepEqual(seen.blocks, ['breadcrumb', 'hero', 'tabs', 'pager'], 'trail, the answer, the detail as tabs, the way on');
  /* First-visit audit 2026-10-22 (P1): seven tabs ("Two ideas", "Fixed vs bends", "Resolve a block"...) and
     three stats stood before the page said what it shows. Four views with plain names now, nothing
     dropped; the stats follow the equation they count, and the equation's figure is "Data" (a count
     read from the census), not "Live". */
  assert.deepEqual(seen.tabs, ['The equation', 'Try it', 'How records work', 'Rules and limits']);
  assert.deepEqual(seen.meta, [], 'the hero states the sum in one sentence; its numbers follow the equation');
  assert.deepEqual(seen.sumFacts, ['Definitions in the sum', 'Audited families built', 'Declared, not built'], 'the equation view ends with the sum and the audited counts');
  assert.deepEqual(seen.kinds, ['data', 'live', 'live', 'illustration', 'illustration'], 'the equation is data, the builder and the explorer run live, the drawings are illustrations');
  assert.deepEqual(seen.slots, ['equation', 'builder', 'explorer', 'record', 'signing'], 'the page\'s own live scenes, each in an Ark figure');
  assert(seen.sum >= 5 && seen.cells > 0 && seen.never === 2, 'the equation counts the census into one cell per definition, and draws the two nobody defined');
  assert.equal(seen.cells, seen.counted, 'one cell per definition: the field has as many cells as the terms of the sum add up to');
  assert(seen.counted >= ALG.roles.registered.length + ALG.verbs.all.length + ALG.manifestTypes.count, 'the sum counts the census (its exact terms: tests/resolver-algebra.cjs)');
  assert(seen.after < seen.before, 'unticking the social verbs makes fewer things sayable (' + seen.before + ' -> ' + seen.after + ')');
  assert.equal(seen.verdict, 'real', 'the explorer resolves AFOLLOW with the real engine');
  assert(seen.chips >= 16, 'every worked example is a chip to try');
  assert(seen.tables[0] > 0 && seen.tables[1] >= 10, 'the layers table and every observer case (from the engine, never typed)');
  assert.deepEqual(seen.tables.slice(2), [4, 4, 20], 'the four rules, the four gaps, and all twenty audited families');
  for (const status of ['Not built', 'Rejected, not pending', 'Overstated']) assert(seen.text.includes(status), 'the page states "' + status + '"');
  for (const name of ['a_forged_intent_fails_the_whole_batch', 'a_replica_stores_without_verifying', 'a_replayed_nonce_is_refused_and_named', 'a_reordered_batch_fails_the_audit']) assert(seen.text.includes(name), 'axiom evidence ' + name + ' is still cited');
  for (const target of ['resolver', 'resolvers', 'stats']) assert(seen.links.includes(target), 'the page leads on to ' + target);
  for (const doc of ['docs/resolver-math.md', 'docs/resolver-audit.md', 'docs/deprecated.md', 'docs/evidence/bench-012-defi-shard-signed-resolution.md']) assert(seen.docs.some((href) => href.includes(doc)), doc + ' opens in the reference reader');
  assert.deepEqual(seen.refused, [], 'no block was refused');
  assert.deepEqual(seen.termsMissing, [], 'every glossary term has an entry in docs/glossary.md');
  assert(seen.terms.includes('box'), 'jargon is glossed: ' + seen.terms.join(', '));
  assert.equal(seen.inserts, 1, 'the CMS insertion anchor is still there');
  assert.deepEqual(seen.h1, ['resolver-math-title']);

  /* ---- no census: a refusal that names what it needs ---------------------------------------- */
  const ArkUI = { pageModules: {}, dash: { el() {}, fmt: String } };
  let refusal = null;
  ArkUI.page = (spec) => { refusal = spec.find((e) => e.block === 'callout'); return {}; };
  vm.runInNewContext(source, { ArkUI, window: {} });
  ArkUI.pageModules.resolverMath.mount({});
  assert(refusal && /did not load/.test(refusal.props.body) && /resolver-algebra\.js/.test(refusal.props.missing) && /gen-resolver-algebra\.cjs --write/.test(refusal.props.remedy), 'a missing census is refused by name: failure, missing file, remedy');

  /* ---- the crawler's copy is styled, complete and deterministic ----------------------------- */
  const ssr = await checks.assertServerRender(ROUTE, 'resolver-math', { idPrefix: ['rm-', 'resolver-math-title'] });

  /* ---- saved CMS edits still land ---------------------------------------------------------- */
  const census = continuity.readCensus(ROUTE);
  const after = await continuity.pageKeys(ROUTE);
  const tally = continuity.assertContinuity(census, after, { reshaped, retired });
  assert.equal(tally.kept + tally.reshaped + tally.retired, census.length, 'every old key is accounted for');
  const landed = await continuity.assertSavedEditsLand(ROUTE, census, { reshaped, retired });
  assert.equal(landed, census.length - 1 - Object.keys(retired).length, 'a saved frame on every old key but page:/ and the retired ones landed');
  assert(after.every((entry) => !/^id:ark-r-/.test(entry.key)), 'no generated (ark-r-) id became a layout key');

  console.log(`PASS: /resolver-math is a spec of Ark blocks with nothing dropped (${ssr.blocks} blocks server-rendered styled, ${ssr.panels} tab panels, the equation, builder and explorer live); ${tally.kept} old layout keys kept, ${tally.reshaped} reshaped, ${tally.retired} retired, and ${landed} saved edits land.`);
})().catch((error) => { console.error(error); process.exit(1); });

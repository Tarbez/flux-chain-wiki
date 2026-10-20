'use strict';
/* run-tests-timeout-ms: 300000 */
/* / -- the family home -- as a page of Ark blocks (js/pages/home.js, DEFXN polish Wave 3).

   Named regressions it holds (docs/ux-audit/pages-ux-a.md /):
   - everything past the hero sat behind ONE "More" disclosure: 2.53x the viewport closed, 4.95x
     open on a desktop. The page is organised by the visitor's next question now: one Ark tabs
     control (See it work · Where do I start? · How it fits together · What is measured? ·
     Questions), each view short on its own (the fold is measured per view by the browser check);
   - the benchmark tiles showed the ten-node fleet figures (643,632 swaps/s, 69,895 transfers/s,
     6,044,992 records/s) as "BENCH-013", whose registry row is one machine and carries none of
     them, while /concept/spec -- built from the registry -- said otherwise. Every figure a tile
     shows must now be carried by a VERIFIED record in docs/evidence/registry.md (through the
     generated js/content/evidence-registry.js, held to the doc by --check), and a figure the
     registry does not verify is absent, "Not verified", never a number;
   - saved CMS data is never rewritten, so every old layout key still lands
     (tests/lib/layout-continuity.cjs against tests/fixtures/layout-keys/home.tsv). A key may only
     be reshaped (pinned to its successor though its words changed shape) or retired (nothing
     carries it now) with the reason below.
   - No feature reduction: the hero's words and its one primary action, the scene with its four
     examples and five steps, the transit map, the three paths with every action and reference,
     the three principles, the benchmarks, the live fleet signal, the FAQ, the closing line and
     every footer link are all still on the page. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const continuity = require('./lib/layout-continuity.cjs');

const ROOT = path.resolve(__dirname, '..');
const ROUTE = '/';
const MORE = 'page:/section:2/div:1/details:1/div:1';
const EVIDENCE = MORE + '/section:3';
const CLOSING = 'page:/footer:1';
const SCENE = 'page:/section:1/section:1/div:2/div:1';

/* Why each old key whose words changed shape still lands on its successor. */
const reshaped = {
  'page:/section:1/div:1': 'the hero\'s copy column became the hero block (the same words; the call to action is a button now)',
  'page:/section:1/div:1/div:1': 'the hero\'s action row: the line-shaped call to action is a real primary button now (audit: it did not read as one)',
  'page:/section:1/div:1/div:1/a:1': 'that call to action itself, "Follow the line", now the hero\'s primary button',
  'page:/section:1/div:1/div:1/a:1/span:3/small:1': '"Your history begins here", the old action\'s kicker, now opens the caption of the scene it pointed at',
  'page:/section:1/section:1': 'the hero\'s instrument (map, example picker, scene) is the first question, "See it work"',
  'page:/section:1/section:1/div:1/div:1': 'the example picker and its note became the scene\'s Ark tabs',
  'page:/section:1/section:1/div:1/div:1/div:1': 'the example buttons are the tabs\' list now (same four examples, same order)',
  'page:/section:1/section:1/div:1/div:1/p:1': '"Illustrative / not live traffic" is the scene\'s figure caption now, with what to notice',
  'page:/section:1/section:1/div:2': 'the scene\'s host is Ark\'s figure frame now',
  'page:/section:2/div:1/details:1': 'the one "More" disclosure became the row of questions (Ark tabs)',
  'page:/section:2/div:1/details:1/summary:1': 'the summary that opened "More" is the questions\' tab list',
  'id:hl-start': 'the find-your-place section is the "Where do I start?" view',
  [MORE + '/section:1/div:1']: 'the audience picker became Ark segmented tabs (with a fourth path for anyone not sure yet)',
  [MORE + '/section:1/div:1/div:1']: 'its tab list (the numbers before each name are gone)',
  'id:hl-audience-0': 'the Explore tab, without its "01"',
  'id:hl-audience-1': 'the Build tab, without its "02"',
  'id:hl-audience-2': 'the Operate tab, without its "03"',
  'id:hl-audience-panel': 'the selected path\'s panel (Explore)',
  [MORE + '/section:1/div:1/div:2/div:1']: 'the path\'s words are an Ark card now',
  [MORE + '/section:1/div:1/div:2/div:2']: 'the path\'s main action and its two references are one actions row now',
  [MORE + '/section:2']: 'the principles section is the "How it fits together" view',
  [MORE + '/section:2/p:1']: 'its deck ("Identity, execution and evidence...") opens the transit map\'s caption now',
  [MORE + '/section:2/div:1']: 'the three principle cards are an Ark accordion (one open at a time: the fold rule on a phone)',
  [MORE + '/section:2/div:1/article:1']: 'the Identity card is the accordion\'s first item',
  [MORE + '/section:2/div:1/article:2']: 'the Resolution card is the second',
  [MORE + '/section:2/div:1/article:3']: 'the Evidence card is the third',
  [MORE + '/section:2/div:1/article:1/h3:1']: 'the card title is the item\'s title, after its name: "Identity · A history with an author."',
  [MORE + '/section:2/div:1/article:2/h3:1']: 'likewise "Resolution · Rules that do useful work."',
  [MORE + '/section:2/div:1/article:3/h3:1']: 'likewise "Evidence · A claim you can inspect."',
  [EVIDENCE]: 'the evidence section is the "What is measured?" view',
  [EVIDENCE + '/p:1']: 'its deck said "benchmark fleet"; the figures come from the evidence registry now, and the deck says so (How to read them)',
  [EVIDENCE + '/div:1']: 'the lead tile\'s grid is the benchmarks row, every tile visible',
  [EVIDENCE + '/div:1/article:1']: 'the swap tile',
  [EVIDENCE + '/div:1/article:1/strong:1']: 'the swap figure: the registry\'s verified one (BENCH-013, one machine), no longer the unregistered ten-node sum',
  [EVIDENCE + '/div:1/article:1/p:2']: 'its detail kept only what the registry supports for this figure: network transport excluded',
  [EVIDENCE + '/div:2/details:1/div:1/div:1/article:1']: 'the transfer tile',
  [EVIDENCE + '/div:2/details:1/div:1/div:1/article:1/strong:1']: 'the transfer figure, from the registry (BENCH-013)',
  [EVIDENCE + '/div:2/details:1/div:1/div:1/article:1/p:2']: 'its detail, as for the swap tile',
  [EVIDENCE + '/div:2/details:1/div:1/div:1/article:2']: 'the storage tile',
  [EVIDENCE + '/div:2/details:1/div:1/div:1/article:2/strong:1']: 'the storage figure, from the registry (per replica, BENCH-013)',
  [EVIDENCE + '/div:2/details:1/div:1/div:1/article:2/span:1']: 'its unit as the registry states it: signed results/s',
  [EVIDENCE + '/div:2/details:1/div:1/div:1/article:2/p:2']: 'its detail: "Fleet-wide" was the unregistered claim; per replica, and the sentence about what a replica does, stay',
  [EVIDENCE + '/div:2/details:1/div:1/div:2']: 'the scope line, now the benchmarks\' provenance, derived from the registry',
  [EVIDENCE + '/div:2/details:1/div:1/div:2/p:1']: 'its words: "BENCH-013 · 10 nodes · 37 cores" was the claim the registry does not carry; the record\'s own status and claim replace it',
  [MORE + '/div:1']: 'the fleet signal is a stat tile in "The fleet now", absent (never 0) until a reading arrives',
  [MORE + '/div:1/span:1']: 'the "unavailable" state is the tile\'s absent reason now',
  [MORE + '/section:4']: 'the FAQ section is the "Questions" view',
  [CLOSING + '/div:2']: 'the closing\'s words are the "Not sure yet" path now',
  [CLOSING + '/div:2/a:1']: 'its "Explore DEFXN" line is the pager\'s next link',
  /* The scene's step list (ol > li > button > number, icon, name) is the step picker's Ark tabs now (ledger: `home-cycle-step`
     / `flow-record` were hand-built, 1.4:1 on their boundary): its list and each step's tab keep the old list's and button's keys. */
  [SCENE]: 'the scene\'s frame began with the step list\'s words; the list is the step picker above the scene\'s tile now (same words, then the tile)',
  [SCENE + '/ol:1']: 'the step list is the picker\'s tab list (the numbers before each name, and the icons, are gone)',
  [SCENE + '/ol:1/li:1/button:1']: 'step 1, Sign, is a tab: its label is the name alone',
  [SCENE + '/ol:1/li:2/button:1']: 'step 2, Check, likewise',
  [SCENE + '/ol:1/li:3/button:1']: 'step 3, Extend, likewise',
  [SCENE + '/ol:1/li:4/button:1']: 'step 4, Replicate, likewise',
  [SCENE + '/ol:1/li:5/button:1']: 'step 5, Resolve, likewise'
};

/* Why nothing carries these keys now. */
const retired = {
  'page:/section:1': 'the hero section held both the copy and the instrument; the copy is the hero block, the instrument the first question',
  'page:/section:1/div:1/h1:1/span:1': 'the heading\'s first line; the three lines are one heading\'s text now, which keeps the heading\'s key (id:hl-title)',
  'page:/section:1/div:1/h1:1/span:2': 'its second line, likewise',
  'page:/section:1/div:1/h1:1/span:3': 'its third line, likewise',
  'page:/section:1/div:1/div:1/a:1/span:1': 'the "you.fxn" chip drawn inside the old call to action; you.fxn is named in the scene\'s caption and drawn in the scene',
  'page:/section:1/div:1/div:1/a:1/span:2': 'the little track drawn inside the old call to action (no words)',
  'page:/section:1/div:1/div:1/a:1/span:3': 'the old call to action\'s two-line label; its lines keep their keys (the kicker, and "Follow the line" on the button\'s label)',
  'page:/section:1/section:1/div:1': 'it held the map and the example picker together; the picker is the scene\'s tabs, the map is in "How it fits together"',
  'page:/section:2': 'the section that held the one "More" disclosure; the disclosure became the question tabs',
  'page:/section:2/div:1': 'its wrapper, likewise',
  [MORE]: 'the disclosure\'s body; each part it held is a view of the question tabs',
  [MORE + '/section:1/div:1/div:1/button:1/span:1']: 'the "01" before Explore',
  [MORE + '/section:1/div:1/div:1/button:1/span:2']: 'the name span inside the Explore tab; the tab is one button now, keeping the tab\'s key',
  [MORE + '/section:1/div:1/div:1/button:2/span:1']: 'the "02" before Build',
  [MORE + '/section:1/div:1/div:1/button:2/span:2']: 'the name span inside the Build tab, likewise',
  [MORE + '/section:1/div:1/div:1/button:3/span:1']: 'the "03" before Operate',
  [MORE + '/section:1/div:1/div:1/button:3/span:2']: 'the name span inside the Operate tab, likewise',
  [MORE + '/section:1/div:1/div:2/div:2/nav:1']: 'the references\' own row; they joined the main action in one actions row',
  [MORE + '/section:2/div:1/article:1/p:1']: 'the "01 / Identity" label; the name opens the accordion item\'s title',
  [MORE + '/section:2/div:1/article:2/p:1']: 'the "02 / Resolution" label, likewise',
  [MORE + '/section:2/div:1/article:3/p:1']: 'the "03 / Evidence" label, likewise',
  [EVIDENCE + '/div:2']: 'the wrapper of the nested "See the other benchmarks" disclosure; every tile is shown at once now',
  [EVIDENCE + '/div:2/details:1']: 'that disclosure',
  [EVIDENCE + '/div:2/details:1/summary:1']: 'its summary',
  [EVIDENCE + '/div:2/details:1/div:1']: 'its body',
  [EVIDENCE + '/div:2/details:1/div:1/div:1']: 'the second grid of tiles; the tiles are one row now',
  [MORE + '/div:1/span:2']: '"Dated benchmark evidence below remains available": the absent tile says it in its reason, which keeps the unavailable state\'s key',
  [CLOSING]: 'the closing block: its words are the "Not sure yet" path, its links the pager',
  [CLOSING + '/div:2/a:1/span:1']: 'the "you.fxn" chip inside the closing call to action (it is in the scene\'s caption)',
  [CLOSING + '/div:2/a:1/span:2']: 'the little track drawn inside it (no words)',
  [CLOSING + '/div:2/a:1/span:3']: 'its two-line label; the lines keep their keys on the pager link\'s title and summary'
};
/* The decorative pieces, by structure rather than one by one. */
function retireUnder(census, prefix, reason, test) {
  for (const old of census) if (old.key.startsWith(prefix) && (!test || test(old.key)) && !retired[old.key] && !reshaped[old.key]) retired[old.key] = reason;
}
function prepare(census) {
  retireUnder(census, SCENE + '/ol:1/li:', 'the step list\'s list item, number, name span and icon: a tab is one element whose label is the name, which keeps the old button\'s key',
    (key) => /\/ol:1\/li:\d($|\/button:1\/(span|svg))/.test(key));
  retireUnder(census, CLOSING + '/div:1', 'the closing block\'s decorative art (aria-hidden, no words); the closing is a short path in "Where do I start?" now');
  retireUnder(census, MORE + '/section:2/div:1/article:', 'the decorative record studies ("01".."05", aria-hidden) on the principle cards', (key) => /\/article:\d\/div:1($|\/)/.test(key));
  /* The icons js/ark/icons.js drew beside labels, links and buttons; Ark's blocks draw none (the
     words carry the meaning). The two drawings keep theirs: they are pinned at their roots. */
  const DRAWINGS = ['page:/section:1/section:1/div:1/svg:1', 'page:/section:1/section:1/div:2/div:1'];
  retireUnder(census, 'page:/', 'an icon drawn beside the words (js/ark/icons.js); Ark\'s blocks draw no icons, the label carries the meaning',
    (key) => /\/svg:\d+(\/[a-z]+:\d+)*$/.test(key) && !DRAWINGS.some((d) => key.startsWith(d)));
  return { reshaped, retired };
}

module.exports = { prepare, ROUTE };

if (require.main === module) (async () => {
  /* ---- the registry module is the registry ---------------------------------------------- */
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/build-evidence-registry.cjs'), '--check'], { stdio: 'pipe' });
  const registry = require('../scripts/build-evidence-registry.cjs').parse(fs.readFileSync(path.join(ROOT, 'docs/evidence/registry.md'), 'utf8'));

  /* ---- the module is a spec of Ark blocks -------------------------------------------------- */
  const source = fs.readFileSync(path.join(ROOT, 'js/pages/home.js'), 'utf8');
  assert(/ArkUI\.page\(spec\(remembered\), host,/.test(source), 'the page is built by ArkUI.page from its spec');
  assert(!/createElement\('(section|header|h1|h2|h3|nav|footer|details)'/.test(source) && !/node\('(section|header|h1|h2|h3|nav|footer|details)'/.test(source), 'no hand-built page structure is left');
  assert(!/643,632|69,895|6,044,992/.test(source), 'no benchmark figure is typed into the page');
  const catalog = fs.readFileSync(path.join(ROOT, 'js/pages/catalog.js'), 'utf8');
  assert(/zero: \{ module: 'zero', scripts: ArkUI\.blockScripts\.concat\(\['js\/content\/evidence-registry\.js', 'js\/pages\/home-flow\.js', 'js\/ark\/pulse-client\.js', 'js\/pages\/home\.js'\]\) \}/.test(catalog), 'the route loads the blocks and the registry before its scene and module');

  /* ---- what the visitor gets: everything the old page had ---------------------------------- */
  const { readIndexHtml, inspectDocument, createLocalResources } = await import('../api/lib/render-core.mjs');
  const seen = await inspectDocument({ html: await readIndexHtml(ROOT), url: 'https://defxn.com' + ROUTE, resources: createLocalResources(ROOT), root: ROOT, timeoutMs: 30000 }, (window) => {
    const page = window.document.querySelector('[data-ark-page="zero"]');
    const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
    const tabsOf = (root) => [...root.querySelector(':scope > [data-ark-part="tabs-list"]').querySelectorAll('[role="tab"]')].map((t) => t.textContent.trim());
    const questions = page.querySelector('#home-questions');
    // (the five steps inside each scene are Ark tabs too; they are the scene's, not a view of the question)
    const nested = [...questions.querySelectorAll('[data-ark-block="tabs"]')].filter((tabs) => !tabs.closest('.flow'));
    const stats = [...page.querySelectorAll('[data-ark-part="stat"]')].map((s) => ({
      label: text(s.querySelector('[data-ark-part="stat-label"]')),
      number: text(s.querySelector('.ark-stat__number')),
      unit: text(s.querySelector('[data-ark-part="stat-unit"]')),
      absent: s.getAttribute('data-state') === 'absent',
      detail: text(s.querySelector('[data-ark-part="stat-detail"]'))
    }));
    return {
      blocks: [...page.querySelectorAll(':scope > [data-ark-block]')].map((el) => el.getAttribute('data-ark-block')),
      h1: { id: (page.querySelector('h1') || {}).id, count: page.querySelectorAll('h1').length, keys: (page.querySelector('h1') || { getAttribute() {} }).getAttribute('data-ark-copy-keys') },
      primary: [...page.querySelectorAll('#home-hero [data-tone="primary"]')].map((a) => text(a) + ' ' + a.getAttribute('data-scene-link')),
      questions: tabsOf(questions),
      paths: tabsOf(nested[0]), cases: tabsOf(nested[1]), evidence: tabsOf(nested[2]),
      scenes: page.querySelectorAll('.flow-rich').length,
      steps: [...page.querySelectorAll('.flow-rich')].map((f) => f.querySelectorAll(':scope > [data-ark-block="tabs"] > [data-ark-part="tabs-list"] [role="tab"]').length),
      handBuilt: page.querySelectorAll('.flow-ledger, .flow-record, .home-cycle-step, .flow-says').length,
      world: page.querySelectorAll('[data-ark-slot="world"] .world-line:not(.world-mine)').length,
      captions: [...page.querySelectorAll('[data-ark-part="figure-caption"]')].map(text),
      links: [...page.querySelectorAll('a[data-scene-link]')].map((a) => a.getAttribute('data-scene-link')),
      cards: [...page.querySelectorAll('[data-ark-block="card"]')].map((c) => text(c.querySelector('[data-ark-part="card-title"]'))),
      accordions: [...page.querySelectorAll('[data-ark-part="accordion-trigger"]')].map(text),
      stats,
      provenance: text(nested[2].querySelector('[data-ark-part="tabs-content"] > p')),
      registryLink: page.querySelectorAll('a[href*="docs%2Fevidence%2Fregistry.md"], a[href*="docs/evidence/registry.md"]').length,
      pager: text(page.querySelector('[data-ark-part="pager-next"]')),
      refused: page.querySelectorAll('[data-ark-block-refused]').length,
      insert: page.querySelectorAll('[data-ark-insert="main"]').length,
      all: text(page)
    };
  });
  assert.deepEqual(seen.blocks, ['hero', 'tabs'], 'the hero, then one control for the next question (the CMS anchor follows)');
  assert.equal(seen.h1.id, 'hl-title', 'the heading keeps the id the old page gave it');
  assert.equal(seen.h1.count, 1, 'one main heading');
  assert.equal(seen.h1.keys, 'HOME.TITLE', 'the heading is the manifest\'s HOME.TITLE (the Content lens binds it)');
  assert.deepEqual(seen.primary, ['Follow the line→ deployment'], 'one primary action, a real button, to the same place');
  assert.deepEqual(seen.questions, ['Where do I start?', 'See it work', 'How it fits together', 'What is measured?', 'Questions'], 'organised by the visitor\'s next question, not one "More", and the first view under the hero is the way in (the three paths), not the scene (ledger: promote Explore/Build/Operate under the hero)');
  assert.deepEqual(seen.cases, ['Swaps', 'Transfers', 'Staking', 'Governance'], 'every example is still offered');
  assert.deepEqual(seen.paths, ['Explore', 'Build', 'Operate', 'Not sure yet'], 'the three paths, plus the way on for anyone not sure yet');
  assert.deepEqual(seen.evidence, ['Benchmarks', 'The fleet now', 'How to read them']);
  assert.equal(seen.scenes, 4, 'one scene per example');
  assert(seen.steps.every((n) => n === 5), 'five steps in every scene, as Ark tabs');
  assert.equal(seen.handBuilt, 0, 'no hand-built step list (`flow-record`, `home-cycle-step`) or separate caption is left: the steps are Ark tabs (ledger: home-cycle-step / flow-record)');
  assert.equal(seen.world, 5, 'the transit map draws the five chains around yours');
  assert(seen.captions.some((c) => /Your history begins here/.test(c) && /Illustrative \/ not live traffic/.test(c) && /you\.fxn/.test(c)), 'the old action\'s kicker and the "not live" note introduce the scene');
  for (const route of ['deployment', 'about', 'chain', 'stats', 'resolver', 'resolvers', 'download', 'deploy', 'explorer', 'dao']) assert(seen.links.includes(route), 'still links ' + route);
  assert.deepEqual(seen.cards, ['See what makes DEFXN different.', 'Give your application a signed foundation.', 'Put your infrastructure to work.']);
  assert.deepEqual(seen.accordions, ['Identity · A history with an author.', 'Resolution · Rules that do useful work.', 'Evidence · A claim you can inspect.', 'What is a “chain of chains”?', 'What can I do today?', 'Does a signature guarantee a correct result?']);
  for (const words of ['Different ambitions. Common ground.', 'Independent histories. Shared possibilities.', 'Put the claims under a microscope.', 'Clarity comes first.', 'Start with the idea. Follow the evidence.', 'DEFXN / Independent histories. Connected possibilities.', 'These are resolution and storage benchmarks, not end-to-end transaction rates.', 'Go deeper into the resolver model', 'Read methodology & limits', 'Open the explorer', 'A network you can inspect'])
    assert(seen.all.includes(words), 'still says: ' + words);
  assert(/Explore DEFXN/.test(seen.pager) && /Every possibility starts with a history/.test(seen.pager), 'the closing call to action is the pager\'s next link');
  assert.equal(seen.refused, 0, 'no block was refused');
  assert.equal(seen.insert, 1, 'a CMS insertion anchor');
  assert(seen.registryLink >= 1, 'the evidence links the registry it reads');

  /* ---- every figure shown is the registry's, from a verified record ------------------------ */
  const verified = registry.filter((r) => r.verified);
  const shown = seen.stats.filter((s) => s.number);
  assert(shown.length >= 3, 'the three benchmark tiles show figures');
  for (const s of shown) {
    if (s.label === 'A network you can inspect') continue; // the live fleet reading, not a benchmark
    const carrier = verified.find((r) => r.evidence.includes(s.number + ' ' + s.unit));
    assert(carrier, `the "${s.label}" tile shows ${s.number} ${s.unit}, which no verified registry record carries`);
  }
  assert(/BENCH-013 · Local, verified · Every operation in its own unit/.test(seen.provenance), 'the row says which record and status its figures come from: ' + seen.provenance);
  const ten = seen.stats.find((s) => s.label === 'All ten nodes at once');
  assert(ten && ten.absent && !ten.number && /Not verified/.test(ten.detail), 'a figure the registry does not verify is absent, "Not verified", with no number');
  const fleet = seen.stats.find((s) => s.label === 'A network you can inspect');
  assert(fleet && fleet.absent && !fleet.number, 'the live fleet tile is absent (never 0) until a reading arrives');

  /* ---- saved CMS edits still land ---------------------------------------------------------- */
  const census = continuity.readCensus(ROUTE);
  prepare(census);
  const after = await continuity.pageKeys(ROUTE);
  const tally = continuity.assertContinuity(census, after, { reshaped, retired });
  assert.equal(tally.kept + tally.reshaped + tally.retired, census.length, 'every old key is accounted for');
  const landed = await continuity.assertSavedEditsLand(ROUTE, census, { reshaped, retired });
  assert.equal(landed, census.length - 1 - Object.keys(retired).length, 'a saved frame on every old key but page:/ and the retired ones landed');
  assert(after.every((entry) => !/^id:ark-r-/.test(entry.key)), 'no generated (ark-r-) id became a layout key');

  console.log(`PASS: / is a spec of Ark blocks organised by question, its figures are the evidence registry's; ${tally.kept} old layout keys kept, ${tally.reshaped} reshaped, ${tally.retired} retired, and ${landed} saved edits land.`);
})().catch((error) => { console.error(error); process.exit(1); });

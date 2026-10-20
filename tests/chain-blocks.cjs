'use strict';
/* run-tests-timeout-ms: 240000 */
/* /chain as a page of Ark blocks (js/pages/chain.js, DEFXN polish Wave 3).

   Named regressions it holds (docs/ux-audit/pages-ux-a.md /chain):
   - the page's H1 was visually hidden, so a visitor landed on a row of tabs with no title: the
     heading is the hero's, visible, with the manifest's one-line plain intro under it;
   - the record's wire grammar was SVG text about 6px tall on a 390px phone: the plain scene is
     HTML now, and no rule that draws it sets a font below 12px;
   - the scene cycled forever (60 frames a second while idle): it plays once and settles
     (tests/home-hero-scene.cjs drives that);
   - saved CMS data is never rewritten, so every old layout key still lands
     (tests/lib/layout-continuity.cjs against tests/fixtures/layout-keys/chain.tsv). A key may
     only be reshaped (pinned to its successor though its words changed shape) or retired
     (nothing carries it now) with the reason below.
   - No feature reduction: the four examples, the five steps (each still a link to the page that
     shows that part), the pause/play control, ?case= and the way home are all still there. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const continuity = require('./lib/layout-continuity.cjs');

const ROOT = path.resolve(__dirname, '..');
const ROUTE = '/chain';

const reshaped = {
  'page:/div:2/div:1/svg:1/text:1': 'the in-picture caption ("illustrative values · the record shape is the real wire grammar", 6px on a phone) is the figure caption now, with one more sentence'
};
const SCENE = 'page:/div:2/div:1/svg:1';
Object.assign(reshaped, {
  [SCENE + '/g:5']: 'the Resolve panel: the payload read stays, and the Swaps example now also draws the swap as signed resolution under it (ledger 4.5), so the panel\'s words grew',
  [SCENE + '/g:4']: 'the replicate panel: it now always carries its peer count (the SVG wrote the count only on the replicate step, so the census saw it empty)',
  [SCENE + '/g:4/text:1']: 'the peer count line itself, for the same reason',
  [SCENE + '/g:5/rect:1']: 'the box around the resolved meaning: in HTML the box holds its words (the SVG rect was empty, the texts its siblings)'
});
const retired = {
  'page:/a:1/svg:1': 'the arrow icon js/hero-motion.js drew inside the old back link; Ark\'s breadcrumb draws none',
  'page:/a:1/svg:1/path:1': 'part of that icon',
  'page:/a:1/svg:1/path:2': 'part of that icon',
  [SCENE + '/rect:1']: 'the SVG card behind every panel; Ark\'s figure frame is the card now'
};
for (let b = 1; b <= 7; b++) {
  retired[SCENE + '/g:1/g:' + b + '/rect:1'] = 'the SVG box behind a record field; in HTML the box and the field\'s text are one element, which keeps the text key';
  if (b < 7) retired[SCENE + '/g:1/g:' + b + '/path:1'] = 'the dash drawn between two record fields; CSS draws it (::after), so no element carries it';
}
/* The step list (ol > li > a > number, name) is the step picker's Ark tabs now (css/home-flow.css had styled it:
   `flow-record`, `home-cycle-step`, hand-built, 1.4:1 on its boundary). Its tab list and each step's tab keep the old
   list's and link's keys; the number and the name are one label in the tab, and the li wrapper is the tab itself. */
reshaped['page:/div:2'] = 'the scene\'s frame began with the step list\'s words; the list is the step picker above the scene\'s tile now (same words, then the tile)';
reshaped['page:/div:2/ol:1'] = 'the step list is the picker\'s tab list (the numbers before each name are gone)';
for (let k = 1; k <= 5; k++) {
  reshaped['page:/div:2/ol:1/li:' + k + '/a:1'] = 'step ' + k + ' is a tab now: its label is the name alone, without the number; the page it opens is in its panel';
  retired['page:/div:2/ol:1/li:' + k] = 'the list item round the step link: the tab is the step\'s one element now, which keeps the link\'s key';
  retired['page:/div:2/ol:1/li:' + k + '/a:1/span:1'] = 'the number before the step name (the tab\'s order says it)';
  retired['page:/div:2/ol:1/li:' + k + '/a:1/span:2'] = 'the name span inside the step link: the tab\'s label is the name, which keeps the tab\'s key';
}
for (let l = 1; l <= 4; l++) retired[SCENE + '/g:2/g:' + l + '/circle:1'] = 'the disc behind a check letter; in HTML the disc and the letter are one element, which keeps the letter key';
for (let n = 1; n <= 5; n++) retired[SCENE + '/g:3/g:' + n + '/rect:1'] = 'the box behind a chain position; in HTML the box and the position are one element, which keeps the position key';

(async () => {
  /* ---- the module is a spec of Ark blocks -------------------------------------------------- */
  const source = fs.readFileSync(path.join(ROOT, 'js/pages/chain.js'), 'utf8');
  assert(/ArkUI\.page\(spec\(manifest, current\), host,/.test(source), 'the page is built by ArkUI.page from its spec');
  assert(!/ArkUI\.el\('(section|header|h1|h2|nav|a)'/.test(source) && !/visually-hidden/.test(source), 'no hand-built page structure, and no visually hidden heading');
  const catalog = fs.readFileSync(path.join(ROOT, 'js/pages/catalog.js'), 'utf8');
  assert(/chain: \{ module: 'chain', scripts: ArkUI\.blockScripts\.concat\(\['js\/pages\/home-flow\.js', 'js\/pages\/chain\.js'\]\) \}/.test(catalog), 'the route loads the blocks before its scene and module');

  /* ---- nothing in the plain scene is drawn below 12px -------------------------------------- */
  const flowCss = fs.readFileSync(path.join(ROOT, 'css/home-flow.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of flowCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    for (const size of m[2].matchAll(/(?:font:[^;]*?|font-size:\s*)(\d+(?:\.\d+)?)px/g)) {
      if (+size[1] === 0) continue; // the ✓ swap hides the number's own glyphs
      assert(+size[1] >= 12, `css/home-flow.css "${m[1].trim().slice(0, 70)}" sets ${size[1]}px: the scene's text stays at least 12px (the record was 6px on a phone)`);
    }
  }

  /* ---- what the visitor gets: everything the old page had ---------------------------------- */
  const { readIndexHtml, inspectDocument, createLocalResources } = await import('../api/lib/render-core.mjs');
  const look = async (query) => inspectDocument({ html: await readIndexHtml(ROOT), url: 'https://defxn.com' + ROUTE + (query || ''), resources: createLocalResources(ROOT), root: ROOT, timeoutMs: 30000 }, (window) => {
    const page = window.document.querySelector('[data-ark-page="chain"]');
    const h1 = page.querySelector('h1');
    const tabs = [...page.querySelectorAll('#chain-cases > [data-ark-part="tabs-list"] [role="tab"]')];
    const panels = [...page.querySelectorAll('#chain-cases > [data-ark-part="tabs-content"]')];
    const shown = panels.find((p) => !p.hidden);
    return {
      blocks: [...page.querySelectorAll(':scope > [data-ark-block]')].map((el) => el.getAttribute('data-ark-block')),
      h1: { id: h1 && h1.id, text: h1 && h1.textContent.trim(), cls: h1 && h1.className },
      lede: (page.querySelector('#chain-hero [data-ark-part="hero-lede"]') || {}).textContent || '',
      tabs: tabs.map((t) => t.textContent.trim()),
      selected: tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'),
      flows: panels.map((p) => p.querySelectorAll('.flow').length),
      stepTabs: [...shown.querySelectorAll('.chain-flow > [data-ark-block="tabs"] > [data-ark-part="tabs-list"] [role="tab"]')].map((t) => t.textContent.trim()),
      stepPicker: shown.querySelectorAll('.chain-flow > [data-ark-block="tabs"]').length,
      handBuilt: shown.querySelectorAll('.flow-ledger, .flow-record, .home-cycle-step, .flow-says').length,
      steps: [...shown.querySelectorAll('.chain-flow > [data-ark-block="tabs"] > [data-ark-part="tabs-content"] a[data-scene-link]')].map((a) => a.getAttribute('data-scene-link')),
      says: [...shown.querySelectorAll('.chain-flow > [data-ark-block="tabs"] > [data-ark-part="tabs-content"]')].map((p) => p.textContent.replace(/See it for real.*$/, '').trim()),
      /* each box of the record: its letters (the term's trigger), its plain name, and the tooltip that says what the box is */
      fields: [...shown.querySelectorAll('.flow-record-format .flow-block')].map((li) => li.querySelector('.flow-block-text .ark-term__trigger').textContent + '|' + li.querySelector('.flow-block-under').textContent),
      tips: [...shown.querySelectorAll('.flow-record-format .flow-block')].map((li) => {
        const trigger = li.querySelector('.flow-block-text .ark-term__trigger'), tip = li.querySelector('.flow-block-text [data-ark-part="term-tip"]');
        return { described: !!tip && trigger.getAttribute('aria-describedby') === tip.id, role: tip && tip.getAttribute('role'), text: tip ? tip.textContent : '' };
      }),
      // the record list is real content: only a panel that is not the current step is aria-hidden
      formatHidden: shown.querySelector('.flow-record-format').closest('.flow-scene, svg').getAttribute('aria-hidden') === 'true' ||
        (shown.querySelector('.flow').dataset.step === '0') === (shown.querySelector('[data-panel="sign"]').getAttribute('aria-hidden') === 'true'),
      swap: [...shown.querySelectorAll('#flow-swap [data-ark-part="step-title"]')].map((li) => li.textContent.trim()),
      swapRefusal: [...shown.querySelectorAll('#flow-swap [data-ark-block="callout"]')].map((c) => c.textContent.replace(/\s+/g, ' ').trim()).join('|'),
      swapFold: [...shown.querySelectorAll('#flow-swap > [data-ark-part="disclosure-trigger"]')].map((b) => b.textContent.trim() + ':' + b.getAttribute('aria-expanded')),
      swapOnOtherCases: [...panels].filter((p) => p !== shown).reduce((n, p) => n + p.querySelectorAll('#flow-swap').length, 0),
      onward: [...page.querySelectorAll('#chain-onward a[data-scene-link]')].map((a) => a.getAttribute('data-scene-link') + ':' + a.textContent.replace(/\s+/g, ' ').trim()),
      toggles: shown.querySelectorAll('.flow-toggle').length,
      caption: (shown.querySelector('[data-ark-part="figure-caption"]') || {}).textContent || '',
      home: page.querySelectorAll('#chain-crumbs a[data-scene-link="zero"]').length,
      insert: page.querySelectorAll('[data-ark-insert="main"]').length,
      refused: page.querySelectorAll('[data-ark-block-refused]').length
    };
  });
  const seen = await look();
  assert.deepEqual(seen.blocks, ['breadcrumb', 'hero', 'tabs', 'actions'], 'breadcrumb, hero, the examples as tabs, the way on');
  assert.equal(seen.h1.id, 'chain-title', 'the heading keeps the id the old page gave it');
  assert.equal(seen.h1.text, 'Every identity, its own chain');
  assert(!/visually-hidden/.test(seen.h1.cls), 'the heading is visible');
  assert(seen.lede.includes('Watch one record join'), 'a one-line plain intro (CHAIN.LEDE) sits under the heading');
  assert.deepEqual(seen.tabs, ['Swaps', 'Transfers', 'Staking', 'Governance'], 'every example is still offered');
  assert.equal(seen.selected, 0, 'Swaps opens first, as before');
  assert.deepEqual(seen.flows, [1, 1, 1, 1], 'each example has its own scene');
  assert.equal(seen.stepPicker, 1, 'the five steps are one Ark tabs block at the top of the scene\'s frame');
  assert.deepEqual(seen.stepTabs, ['Sign', 'Check', 'Extend', 'Replicate', 'Resolve'], 'every step is a tab');
  assert.equal(seen.handBuilt, 0, 'no hand-built step list (`flow-record`, `home-cycle-step`) or separate caption is left');
  assert.deepEqual(seen.steps, ['account', 'stats', 'explorer', 'stats', 'resolver'], 'each step still opens the page that shows that part (a link in its panel)');
  assert(seen.says.every((words) => /^“.+”$/.test(words)), 'each step says what happens, as the scene\'s caption did: ' + JSON.stringify(seen.says));
  assert.equal(seen.tips.length, 7);
  /* Named regression (docs/ux-audit/ledger.md /chain, 2026-10-20): the grammar letters were unexplained -- each box
     had a plain caption but no tooltip. Each box is Ark's glossary term now, its tip the role letter's meaning from
     the registry (flx/flux-spec/registry/role-letters.json). */
  seen.tips.forEach((tip, i) => {
    assert(tip.described, 'box ' + (i + 1) + ': its trigger is described by its tip, so a screen reader hears it without opening anything');
    assert.equal(tip.role, 'tooltip');
    assert(/^[GYVMJCS] is the /.test(tip.text) && tip.text.length > 40, 'box ' + (i + 1) + ' says what the box is: ' + tip.text);
  });
  assert.deepEqual(seen.tips.map((tip) => tip.text[0]).join(''), 'GYVMJCS', 'one tooltip per box, in the record\'s order');
  assert.deepEqual(seen.fields, ['G|who', 'YLEDGERENTRY|what kind', 'V3|version', 'M1760…|when', 'J42|position', 'C2b9d…|extends', 'S9f1…|signature'], 'the record is the real wire grammar, field by field, with each field named in plain words');
  assert.equal(seen.formatHidden, false, 'the record format is real content, hidden from a screen reader only while another step is shown (the SVG was always aria-hidden)');
  /* ledger 4.5: the swap as signed resolution -- the manifest's own diagram (meta.diagrams[0]), under the Swaps payload */
  assert.deepEqual(seen.swap, ['Two intents enter', 'One signer resolves the batch', 'One signed result goes to peers'], 'the Swaps example draws the swap as signed resolution, in the manifest\'s own steps');
  assert(/A second node is refused.*resolved by studio\.fxn/.test(seen.swapRefusal), 'and a second node\'s result ends in the refusal "resolved by <signer>": ' + seen.swapRefusal);
  assert.deepEqual(seen.swapFold, ['How a swap is resolved:false'], 'folded behind Ark\'s disclosure so the Resolve step stays one box and a line (nothing removed)');
  assert.equal(seen.swapOnOtherCases, 0, 'only the Swaps example carries it (a transfer, a stake and a vote are not batches)');
  assert.deepEqual(seen.onward, ['resolvers:See what each resolver reads from the chain→', 'resolver:Where do resolver chains come from?→'], 'the way on: what each resolver reads (the manifest\'s CHAIN.NEXT, which nothing showed) and where resolver chains come from (ledger 3.4-x)');
  assert.equal(seen.toggles, 1, 'the pause/play control is still there');
  assert(/the record shape is the real wire grammar/i.test(seen.caption), 'the scene\'s caption is a real figure caption now');
  assert.equal(seen.home, 1, 'the breadcrumb leads home through the router');
  assert.equal(seen.insert, 1, 'the CMS insertion anchor is still there');
  assert.equal(seen.refused, 0, 'no block was refused');
  const staking = await look('?case=staking');
  assert.equal(staking.selected, 2, '?case=staking still opens the staking example');

  /* ---- saved CMS edits still land ---------------------------------------------------------- */
  const census = continuity.readCensus(ROUTE);
  const after = await continuity.pageKeys(ROUTE);
  const tally = continuity.assertContinuity(census, after, { reshaped, retired });
  assert.equal(tally.kept + tally.reshaped + tally.retired, census.length, 'every old key is accounted for');
  const landed = await continuity.assertSavedEditsLand(ROUTE, census, { reshaped, retired });
  assert.equal(landed, census.length - 1 - Object.keys(retired).length, 'a saved frame on every old key but page:/ and the retired ones landed');
  assert(after.every((entry) => !/^id:ark-r-/.test(entry.key)), 'no generated (ark-r-) id became a layout key');

  console.log(`PASS: /chain is a spec of Ark blocks with a visible heading and a 12px-or-larger record; ${tally.kept} old layout keys kept, ${tally.reshaped} reshaped, ${tally.retired} retired, and ${landed} saved edits land.`);
})().catch((error) => { console.error(error); process.exit(1); });

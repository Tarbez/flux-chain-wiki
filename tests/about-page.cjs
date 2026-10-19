'use strict';
/* run-tests-timeout-ms: 300000 */
/* /about as a page of Ark blocks (js/pages/about.js, DEFXN polish Wave 3).

   Named regressions it holds (docs/ux-audit/pages-ux-a.md /about):
   - everything past the hero sat behind ONE "More" disclosure (labelled by a 49px "More." heading):
     2.23x the viewport closed, 4.08x open on a desktop. It is one Ark tabs control now, each view
     short on its own (the fold is measured per view by the browser check);
   - the closing block borrowed home's layered hl-closing and its overlay hid the whole ending
     behind an 800px void (2026-10-19 P0). The ending is Ark blocks now -- the source boundary a
     callout in sight in every view, the closing line and links a pager -- and no hl-* part is left;
   - "See how DEFXN works" carried an external-link icon on an internal route: Ark derives the
     arrow from the href (→ in-site);
   - saved CMS data is never rewritten, so every old layout key still lands
     (tests/lib/layout-continuity.cjs against tests/fixtures/layout-keys/about.tsv). A key may only
     be reshaped (pinned to its successor though its words changed shape) or retired (nothing
     carries it now) with the reason below.
   - No feature reduction: the three layers are still drawn and selectable (the drawing follows the
     choice), and every word the page had is still on it -- the flow, the promise, the five counted
     resolution groups, the pillars, the boundary, the evidence and every link. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const continuity = require('./lib/layout-continuity.cjs');

const ROOT = path.resolve(__dirname, '..');
const ROUTE = '/about';
const BODY = 'page:/section:2/div:2/details:1/div:1';

const reshaped = {
  'page:/section:1/div:1': 'the hero\'s copy column is the hero block',
  'page:/section:1/section:1': 'the layer figure is the first view, "THREE BOUNDED LAYERS"',
  'page:/section:1/section:1/div:1': 'its label and layer picker: the picker is Ark segmented tabs, the label the view\'s tab',
  'page:/section:1/section:1/div:2': 'the drawing\'s stage is Ark\'s figure frame',
  'page:/section:2/div:2/details:1': 'the one "More" disclosure is the row of views (Ark tabs)',
  'page:/section:2/div:2/details:1/summary:1': 'the summary that opened it is the views\' tab list',
  [BODY + '/section:1']: 'the flow section is the "How it works" view',
  [BODY + '/section:1/div:1']: 'its three cards are an Ark steps list',
  [BODY + '/section:1/div:1/article:1']: 'the first step',
  [BODY + '/section:1/div:1/article:2']: 'the second step',
  [BODY + '/section:1/div:1/article:3']: 'the third step',
  [BODY + '/section:1/div:1/article:1/p:1']: 'the step\'s title: the "01 /" before "Resolve" is the step marker now',
  [BODY + '/section:1/div:1/article:2/p:1']: 'likewise "Resolver"',
  [BODY + '/section:1/div:1/article:3/p:1']: 'likewise "Resolution"',
  [BODY + '/section:2']: 'the promise section is "The promise" view',
  [BODY + '/section:2/div:1']: 'its four cards are an Ark facts list (compact: the fold rule on a phone)',
  [BODY + '/section:3']: 'the resolve section is the "What you can resolve" view',
  [BODY + '/section:3/div:1']: 'its five counted group tiles are an Ark facts list, each still one link',
  [BODY + '/section:3/div:1/a:1/h3:1']: 'the group\'s name, now with its count: "Build & publish · 4 resolutions"',
  [BODY + '/section:3/div:1/a:2/h3:1']: 'likewise for Value & finance',
  [BODY + '/section:3/div:1/a:3/h3:1']: 'likewise for People & organisations',
  [BODY + '/section:3/div:1/a:4/h3:1']: 'likewise for Intelligence & data',
  [BODY + '/section:3/div:1/a:5/h3:1']: 'likewise for Infrastructure & operations',
  [BODY + '/section:2/div:1/article:1']: 'the "No database" card is a fact (term and value), without its "01"',
  [BODY + '/section:2/div:1/article:2']: 'likewise "No hosting"',
  [BODY + '/section:2/div:1/article:3']: 'likewise "No fees"',
  [BODY + '/section:2/div:1/article:4']: 'likewise "No cloud"',
  [BODY + '/section:3/div:1/a:1']: 'the Build & publish tile is a fact whose value is the same one link',
  [BODY + '/section:3/div:1/a:2']: 'likewise Value & finance',
  [BODY + '/section:3/div:1/a:3']: 'likewise People & organisations',
  [BODY + '/section:3/div:1/a:4']: 'likewise Intelligence & data',
  [BODY + '/section:3/div:1/a:5']: 'likewise Infrastructure & operations',
  [BODY + '/section:4/div:1/article:1']: 'the first pillar is an Ark card, without its "01"',
  [BODY + '/section:4/div:1/article:2']: 'the second, without its "02"',
  [BODY + '/section:4/div:1/article:3']: 'the third, without its "03" and the coin mark',
  [BODY + '/section:4']: 'the pillars section is the "Who it is for" view',
  [BODY + '/section:4/div:1']: 'its three cards are an Ark card grid',
  'page:/footer:1/details:1': 'the evidence disclosure is the "Evidence & verification" view',
  'page:/footer:1/details:1/div:1': 'its two parts are Ark segmented tabs, one at a time',
  'page:/footer:1/details:1/div:1/section:1': '"What the source establishes" is the first of them',
  'page:/footer:1/details:1/div:1/section:2': '"How to verify it" is the second',
  'page:/footer:1/nav:1': 'the closing links are the pager\'s related links'
};
const retired = {
  'page:/section:1': 'the hero section held the copy and the layer figure; the copy is the hero block, the figure the first view',
  'page:/section:2': 'the section that held the one "More" disclosure; the disclosure became the views',
  'page:/section:2/div:1': 'its head, which existed only to label the disclosure ("02 / More", "More."; audit: a 49px heading for one disclosure)',
  'page:/section:2/div:1/p:1': '"02 / More", likewise',
  'page:/section:2/div:1/div:1': 'the wrapper of "More.", likewise',
  'page:/section:2/div:1/div:1/h2:1': '"More.", likewise',
  'page:/section:2/div:2': 'the disclosure\'s wrapper',
  [BODY]: 'the disclosure\'s body; each part it held is a view',
  'page:/footer:1': 'the closing block: its boundary is a callout in sight in every view, its evidence a view, its closing line and links the pager'
};
function retireWhere(census, test, reason) {
  for (const old of census) if (test(old.key) && !retired[old.key] && !reshaped[old.key]) retired[old.key] = reason;
}
function prepare(census) {
  /* the icons js/ark/icons.js drew beside labels, links and buttons; the layer drawing keeps its own */
  retireWhere(census, (key) => /\/svg:\d+(\/[a-z]+:\d+)*$/.test(key) && !key.startsWith('page:/section:1/section:1/div:2/svg:1'),
    'an icon drawn beside the words (js/ark/icons.js); Ark\'s blocks draw no icons, the label carries the meaning');
  retireWhere(census, (key) => new RegExp('^' + BODY.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '/section:[24]/div:1/article:\\d/p:1(/span:1)?$').test(key),
    'the card\'s "01".."04" numbering (and the FXN coin mark beside "03"): decoration; the facts and cards carry the words');
  retireWhere(census, (key) => new RegExp('^' + BODY.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '/section:3/div:1/a:\\d/p:1$').test(key),
    'the group\'s "N resolutions" count line; the count joined the group\'s name in its term');
  return { reshaped, retired };
}

module.exports = { prepare, ROUTE };

if (require.main === module) (async () => {
  /* ---- the module is a spec of Ark blocks -------------------------------------------------- */
  const source = fs.readFileSync(path.join(ROOT, 'js/pages/about.js'), 'utf8');
  assert(/ArkUI\.page\(spec\(manifest, groups\), host,/.test(source), 'the page is built by ArkUI.page from its spec');
  assert(!/node\('(section|header|h1|h2|h3|nav|footer|details)'/.test(source) && !/\bhl-/.test(source.replace(/\/\*[\s\S]*?\*\//g, '')), 'no hand-built page structure, and none of home\'s hl-* parts (the closing overlay defect)');
  const catalog = fs.readFileSync(path.join(ROOT, 'js/pages/catalog.js'), 'utf8');
  assert(/about: \{ module: 'about', scripts: ArkUI\.blockScripts\.concat\(\['js\/pages\/about\.js'\]\) \}/.test(catalog), 'the route loads the blocks before its module');
  const css = fs.readFileSync(path.join(ROOT, 'css/about.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert(!/\.ark-|about-(closing|boundary|launch|more)/.test(css), 'css/about.css draws only the layer drawing: no Ark block restyled, no old layout left');

  /* ---- what the visitor gets: everything the old page had ---------------------------------- */
  const { readIndexHtml, inspectDocument, createLocalResources } = await import('../api/lib/render-core.mjs');
  const seen = await inspectDocument({ html: await readIndexHtml(ROOT), url: 'https://defxn.com' + ROUTE, resources: createLocalResources(ROOT), root: ROOT, timeoutMs: 30000 }, (window) => {
    const page = window.document.querySelector('[data-ark-page="about"]');
    const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
    const tabsOf = (root) => [...root.querySelector(':scope > [data-ark-part="tabs-list"]').querySelectorAll('[role="tab"]')].map((t) => t.textContent.trim());
    const views = page.querySelector('#about-views');
    const nested = [...views.querySelectorAll('[data-ark-block="tabs"]')];
    // choosing a layer lights its slab: click Governance, read the drawing
    nested[0].querySelectorAll('[role="tab"]')[2].click();
    const lit = page.querySelector('.about-layers-figure').getAttribute('data-selected');
    return {
      blocks: [...page.querySelectorAll(':scope > [data-ark-block]')].map((el) => el.getAttribute('data-ark-block')),
      h1: (page.querySelector('h1') || {}).id,
      primary: [...page.querySelectorAll('#about-hero [data-tone="primary"]')].length,
      arrows: [...page.querySelectorAll('#about-hero a')].map((a) => a.getAttribute('data-scene-link') + ':' + (a.getAttribute('data-external') || 'in')),
      views: tabsOf(views), layers: tabsOf(nested[0]), evidence: tabsOf(nested[1]),
      slabs: page.querySelectorAll('.about-slab').length, accents: page.querySelectorAll('.about-slab-record-new').length, lit,
      boundary: text(page.querySelector('#about-boundary')),
      groups: [...page.querySelectorAll('[data-ark-part="fact-term"]')].map(text).filter((t) => /resolutions$/.test(t)),
      links: [...page.querySelectorAll('a[data-scene-link]')].map((a) => a.getAttribute('data-scene-link')),
      all: text(page),
      refused: page.querySelectorAll('[data-ark-block-refused]').length,
      insert: page.querySelectorAll('[data-ark-insert="main"]').length
    };
  });
  assert.deepEqual(seen.blocks, ['hero', 'callout', 'tabs'], 'the hero, the source boundary in sight, then one control for the views');
  assert.equal(seen.h1, 'about-title', 'the heading keeps the id the old page gave it');
  assert.equal(seen.primary, 1, 'one dominant next movement');
  assert(seen.arrows.every((a) => a.endsWith(':in')), 'both hero links are in-site, and say so (no external arrow on an internal route)');
  assert.deepEqual(seen.views, ['THREE BOUNDED LAYERS', 'How it works', 'The promise', 'What you can resolve', 'Who it is for', 'Evidence & verification']);
  assert.deepEqual(seen.layers, ['Directory', 'FXN chain', 'Governance'], 'one choice per layer');
  assert.deepEqual(seen.evidence, ['What the source establishes.', 'How to verify it.']);
  assert.equal(seen.slabs, 3, 'three slabs drawn');
  assert.equal(seen.accents, 1, 'colour is data: exactly one accent record, on the FXN chain layer');
  assert.equal(seen.lit, '2', 'choosing a layer lights its slab');
  assert(/Current source boundary/i.test(seen.boundary) && /remain unverified/.test(seen.boundary), 'the source boundary is in sight');
  assert.equal(seen.groups.length, 5, 'resolutions are five counted groups, not a link per resolution');
  for (const route of ['resolutions', 'deployment', 'resolver', 'concept', 'zero', 'explorer', 'download']) assert(seen.links.includes(route), 'still links ' + route);
  for (const words of ['State it. Resolve it. Check it.', 'No database. No hosting. No fees. No cloud.', 'One mesh. Every part of your work resolved on it.', 'A network of partners, not a platform.', 'See what resolves on the mesh.', 'READ DEFXN STATUS', 'EXPLORE THE DEFXN MODEL', 'Discovery finds the network.'])
    assert(seen.all.includes(words), 'still says: ' + words);
  assert.equal(seen.refused, 0, 'no block was refused');
  assert.equal(seen.insert, 1, 'the CMS insertion anchor is still there');

  /* ---- saved CMS edits still land ---------------------------------------------------------- */
  const census = continuity.readCensus(ROUTE);
  prepare(census);
  const after = await continuity.pageKeys(ROUTE);
  const tally = continuity.assertContinuity(census, after, { reshaped, retired });
  assert.equal(tally.kept + tally.reshaped + tally.retired, census.length, 'every old key is accounted for');
  const landed = await continuity.assertSavedEditsLand(ROUTE, census, { reshaped, retired });
  assert.equal(landed, census.length - 1 - Object.keys(retired).length, 'a saved frame on every old key but page:/ and the retired ones landed');
  assert(after.every((entry) => !/^id:ark-r-/.test(entry.key)), 'no generated (ark-r-) id became a layout key');

  console.log(`PASS: /about is a spec of Ark blocks, organised by view, the three layers drawn and selectable; ${tally.kept} old layout keys kept, ${tally.reshaped} reshaped, ${tally.retired} retired, and ${landed} saved edits land.`);
})().catch((error) => { console.error(error); process.exit(1); });

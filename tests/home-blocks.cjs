'use strict';
/* run-tests-timeout-ms: 300000 */
/* / -- the family home -- standing on the 3D world (js/pages/home.js, css/world-pages.css,
   js/world/world-host.js). The owner confirmed this design on 2026-10-27; it replaced the Ark block home.
   The file keeps its old name so its history stays readable; what it locks now is the world home's
   content, as its reduction test (the header comment of js/pages/home.js) promises it:
   - the words are the home manifest's (HOME.WORLD.*), none typed into the module: the eyebrow, the heading
     (one row per line of HOME.WORLD.TITLE, the last row the accent), the two lede sentences;
   - one main action, "Explore a record" to /chain, drawn as the outlined cut-corner; the three things you
     can do (Trace, Verify, Understand) as links into the site's own pages; the Measured rail's own action
     to the benchmarks is the page's one filled action (css/world-pages.css);
   - the rail: the dated fleet run, each figure named by what it counts, and every capability
     (js/content/capabilities-data.js), most checked cases first, so the list is derived, never typed;
   - the route loads the data, the rail and the module, styled by css/world-pages.css, and the world flies to
     its home view (VIEW_OF zero -> home);
   - the CMS insertion anchor every world page has (data-ark-insert="main").

   Named regressions, kept because they still apply:
   - the benchmark tiles showed the ten-node fleet figures (643,632 swaps/s, 69,895 transfers/s,
     6,044,992 records/s) as "BENCH-013", whose registry row is one machine and carries none of them,
     while /concept/spec -- built from the registry -- said otherwise. Every figure the home shows must be
     carried by a VERIFIED record in docs/evidence/registry.md (through the generated
     js/content/evidence-registry.js, held to the doc by --check). On the world home the rail shows them
     again. Fixed 2026-10-27 by the owner's pick: docs/home-redesign/make-capabilities.mjs keeps only the
     figures a verified record carries; with none, the rail says no fleet run is verified yet.
   - no benchmark figure is typed into the page module: the numbers come from the data file.
   - one main heading on the page.

   Dropped, with the reason (the thing each guarded is gone with the block home, by the owner's design):
   - the tab views by question (See it work, Where do I start?, ...), the four example scenes with five steps
     each, the transit map, the principle accordions, the FAQ and the pager: the world home has none of them,
     and its reduction test says so ("the block page ... and its tab views are gone with it");
   - layout-key continuity (tests/lib/layout-continuity.cjs against tests/fixtures/layout-keys/home.tsv):
     the block page's pins are gone with it (js/pages/home.js header). A CMS edit saved against an old
     block-home key no longer lands on /. The census file stays as evidence of the old page; it is never
     rewritten. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const ROUTE = '/';

module.exports = { ROUTE };

if (require.main === module) (async () => {
  /* ---- the registry module is the registry ---------------------------------------------- */
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/build-evidence-registry.cjs'), '--check'], { stdio: 'pipe' });
  const registry = require('../scripts/build-evidence-registry.cjs').parse(fs.readFileSync(path.join(ROOT, 'docs/evidence/registry.md'), 'utf8'));

  /* ---- the module: words from the manifest, no figure typed in --------------------------- */
  const source = fs.readFileSync(path.join(ROOT, 'js/pages/home.js'), 'utf8');
  assert(/ArkUI\.pageModules\.zero = \{/.test(source), 'js/pages/home.js mounts the zero route');
  assert(/function copy\(role\) \{ return ArkCopy\.text\('HOME\.WORLD\.' \+ role\); \}/.test(source), 'the words are read from the home manifest (HOME.WORLD.*)');
  assert(!/\d{1,3},\d{3}/.test(source.replace(/\/\*[\s\S]*?\*\//g, '')), 'no benchmark figure is typed into the page');
  assert(!/ArkUI\.page\(/.test(source), 'the world home is not an Ark block page any more');
  const catalog = fs.readFileSync(path.join(ROOT, 'js/pages/catalog.js'), 'utf8');
  assert(/zero: \{ module: 'zero', scripts: \['js\/content\/capabilities-data\.js', 'js\/world\/rail-capabilities\.js', 'js\/pages\/home\.js'\] \}/.test(catalog), 'the route loads the capability data and the rail before its module');
  assert(/modules: \{\s*zero: \['css\/world-pages\.css'\],/.test(catalog), 'the route is styled by css/world-pages.css');
  assert(/VIEW_OF = \{\s*zero: 'home',/.test(fs.readFileSync(path.join(ROOT, 'js/world/world-host.js'), 'utf8')), 'the world flies to its home view on /');

  /* ---- what the visitor gets (a jsdom boot through the server render: no WebGL here, so this is also the
     reduction test's item 10: the words, the actions and the rail all work without the 3D) ---- */
  const { readIndexHtml, inspectDocument, createLocalResources } = await import('../api/lib/render-core.mjs');
  /* returned as plain data: the window's arrays are another realm's, which deepEqual would refuse */
  const seen = JSON.parse(JSON.stringify(await inspectDocument({ html: await readIndexHtml(ROOT), url: 'https://defxn.com' + ROUTE, resources: createLocalResources(ROOT), root: ROOT, timeoutMs: 30000 }, (window) => {
    const { document, ArkCopy, ArkUI } = window;
    const page = document.querySelector('[data-ark-page="zero"]');
    const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
    const word = (role) => ArkCopy.text('HOME.WORLD.' + role);
    const href = (key) => ArkUI.route.href(ArkUI.pageCatalog[key].path);
    const actionOf = (a) => a && { text: text(a), link: a.getAttribute('data-scene-link'), href: a.getAttribute('href'), quiet: a.classList.contains('quiet') };
    const D = window.DEFXN_CAPABILITIES;
    return {
      world: page && page.hasAttribute('data-world-home') && page.classList.contains('home-world'),
      labelledBy: page && page.getAttribute('aria-labelledby'),
      parts: [...page.children].map((el) => el.tagName.toLowerCase() + '.' + el.className.split(' ')[0]),
      h1: [...page.querySelectorAll('h1')].map((h) => ({ id: h.id, rows: [...h.children].map((r) => r.tagName.toLowerCase() + ':' + r.textContent) })),
      title: word('TITLE').split('\n'),
      eyebrow: [text(page.querySelector('.eyebrow')), word('EYEBROW')],
      lede: [[...page.querySelectorAll('.lede > span')].map(text), [word('LEDE1'), word('LEDE2')]],
      main: [actionOf(page.querySelector('.copy > a.cta')), { text: word('CTA'), href: href('chain') }],
      paths: { label: [page.querySelector('nav.paths').getAttribute('aria-label'), word('PATHS.LABEL')],
        links: [...page.querySelectorAll('nav.paths a')].map((a) => ({ title: text(a.querySelector('b')), line: text(a.querySelector('small')), link: a.getAttribute('data-scene-link'), href: a.getAttribute('href') })),
        want: ['TRACE', 'VERIFY', 'UNDERSTAND'].map((r) => ({ title: word(r + '.TITLE'), line: word(r + '.LINE') })),
        hrefs: { chain: href('chain'), explorer: href('explorer'), about: href('about') } },
      filled: [...page.querySelectorAll('a.cta:not(.quiet)')].map(actionOf),
      railAction: { text: word('RAIL.CTA'), href: href('stats') },
      rail: {
        labelledBy: page.querySelector('aside.rail').getAttribute('aria-labelledby'),
        title: [text(page.querySelector('#home-measured')), word('RAIL.TITLE')],
        run: text(page.querySelector('.rx-fleet .rx-src')),
        when: text(page.querySelector('.rx-fleet .rx-when')),
        unverified: [text(page.querySelector('.rx-fleet .rx-unverified')), word('RAIL.UNVERIFIED')],
        tiles: [...page.querySelectorAll('.rx-tiles > div')].map((d) => ({ name: text(d.querySelector('dt')), number: text(d.querySelector('dd b')), unit: text(d.querySelector('dd span')) })),
        names: { 'ops/s': word('RAIL.OPS'), 'swaps/s': word('RAIL.SWAPS'), 'transfers/s': word('RAIL.TRANSFERS'), 'records/s': word('RAIL.RECORDS') },
        caps: [...page.querySelectorAll('.rx-grid [data-cap-id]')].map((b) => b.getAttribute('data-cap-id')),
        count: text(page.querySelector('[data-cap="count"]'))
      },
      data: { run: D.fleet.run, nodes: D.fleet.nodes, date: (D.runs.find((r) => r.id === D.fleet.run) || {}).date, figures: D.fleet.figures.map((f) => ({ unit: f.unit, value: f.value })),
        caps: D.capabilities.slice().sort((a, b) => b.count - a.count || (a.id < b.id ? -1 : 1)).map((c) => c.id), total: D.capabilities.reduce((s, c) => s + c.count, 0) },
      words: { oneRun: word('RAIL.ONERUN'), nodes: word('RAIL.NODES'), checked: word('RAIL.CHECKED') },
      inserts: page.querySelectorAll('[data-ark-insert="main"]').length,
      refused: page.querySelectorAll('[data-ark-block-refused]').length
    };
  })));

  assert.equal(seen.world, true, 'the page is the world home (.world-page.home-world[data-world-home])');
  assert.equal(seen.labelledBy, 'home-title', 'the page is named by its heading');
  assert.deepEqual(seen.parts, ['section.lead', 'aside.rail', 'div.world-insert'], 'the lead, the Measured rail, then the CMS anchor');
  assert.equal(seen.inserts, 1, 'a CMS insertion anchor, as every world page has');
  assert.equal(seen.refused, 0, 'nothing was refused');

  /* the words */
  assert.equal(seen.h1.length, 1, 'one main heading');
  assert.equal(seen.h1[0].id, 'home-title');
  assert(seen.title.length > 1, 'HOME.WORLD.TITLE has more than one line');
  assert.deepEqual(seen.h1[0].rows, seen.title.map((row, i) => (i === seen.title.length - 1 ? 'span:' : 'b:') + row), 'one row per line of HOME.WORLD.TITLE; the last row is the accent');
  assert.equal(seen.eyebrow[0], seen.eyebrow[1], 'the eyebrow is HOME.WORLD.EYEBROW');
  assert.deepEqual(seen.lede[0], seen.lede[1], 'the lede is HOME.WORLD.LEDE1 then LEDE2');

  /* the actions */
  const [main, wantMain] = seen.main;
  assert.deepEqual(main, { text: wantMain.text, link: 'chain', href: wantMain.href, quiet: true }, 'one main action, "' + wantMain.text + '", to /chain, drawn as the outlined cut-corner');
  assert.equal(seen.paths.label[0], seen.paths.label[1], 'the three things you can do are one named nav');
  assert.deepEqual(seen.paths.links.map((l) => ({ title: l.title, line: l.line })), seen.paths.want, 'Trace, Verify, Understand, each with its line, from the manifest');
  assert.deepEqual(seen.paths.links.map((l) => [l.link, l.href]), [['chain', seen.paths.hrefs.chain], ['explorer', seen.paths.hrefs.explorer], ['about', seen.paths.hrefs.about]], 'they lead to /chain, the explorer and the overview, as links the router follows');
  assert.deepEqual(seen.filled, [{ text: seen.railAction.text, link: 'stats', href: seen.railAction.href, quiet: false }], 'the page has one filled action: the rail\'s, to the benchmarks');

  /* the rail */
  assert.equal(seen.rail.labelledBy, 'home-measured');
  assert.equal(seen.rail.title[0], seen.rail.title[1], 'the rail is named HOME.WORLD.RAIL.TITLE');
  assert.equal(seen.rail.run, seen.data.run, 'the fleet names its run');
  assert.equal(seen.rail.when, `${seen.words.oneRun} · ${seen.data.nodes} ${seen.words.nodes} · ${seen.data.date}`, 'one run, its size and its date');
  assert.deepEqual(seen.rail.tiles.map((t) => t.unit), seen.data.figures.map((f) => f.unit), 'one tile per figure of the run');
  assert.equal(seen.rail.unverified[0], seen.data.figures.length ? '' : seen.rail.unverified[1], 'with no verified figure, one line says no fleet run is verified yet (HOME.WORLD.RAIL.UNVERIFIED)');
  assert.deepEqual(seen.rail.tiles.map((t) => t.name), seen.data.figures.map((f) => seen.rail.names[f.unit]), 'each figure is named by what it counts (HOME.WORLD.RAIL.*)');
  assert.deepEqual(seen.rail.tiles.map((t) => t.number), seen.data.figures.map((f) => new Intl.NumberFormat('en-US').format(f.value)), 'the figures are the data file\'s');
  assert.deepEqual(seen.rail.caps, seen.data.caps, 'every capability, most checked cases first (derived from js/content/capabilities-data.js)');
  assert.equal(seen.rail.count, `${seen.data.caps.length} · ${seen.data.total} ${seen.words.checked}`, 'how many capabilities and checked cases');

  /* ---- every figure shown is the registry's, from a verified record (named regression, last) ---- */
  const verified = registry.filter((r) => r.verified);
  const unbacked = seen.rail.tiles.filter((t) => !verified.some((r) => r.evidence.includes(t.number + ' ' + t.unit)));
  assert.deepEqual(unbacked, [], 'CODE BUG: the home rail shows figures no verified record in docs/evidence/registry.md carries (labelled "' + seen.rail.run + '")');

  console.log(`PASS: / is the world home: the manifest's words, one outlined main action and one filled rail action, the three paths, the dated ${seen.data.run} run and all ${seen.data.caps.length} capabilities, every figure from a verified registry record.`);
})().catch((error) => { console.error(error); process.exit(1); });

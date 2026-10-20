'use strict';
/* run-tests-timeout-ms: 3000000 -- the last case renders every route that loads a glossary twice (the whole glossary behind
   its file, then its own file): about 170 jsdom boots, a few seconds each on an idle machine. Run it alone (owner test law). */
/* The per-route glossary (docs/glossary.md -> js/content/glossary/<route>.js, scripts/build-glossary.cjs;
   docs/cms-architecture.md Budget). Every case names the defect it exists to catch.

   Why it exists: every route that glosses words used to ship the whole glossary, and its definitions alone are
   most of its size, so block+terms routes were 31.45 KB gz and /stats 32.87 against the +30 KB budget (R2).
   Shortening a definition would have made it worse; a route now ships the terms its own text uses. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');
const { execFileSync } = require('node:child_process');
const checks = require('./lib/block-page-checks.cjs');
const { loadCatalog } = require('./lib/site-catalog.cjs');
const builder = require('../scripts/build-glossary.cjs');

const ROOT = checks.ROOT;
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const gz = (file) => zlib.gzipSync(fs.readFileSync(path.join(ROOT, file)), { level: 9 }).length;
let passed = 0;
function test(name, fn) { return Promise.resolve().then(fn).then(() => { passed += 1; }, (error) => { console.error('FAIL ' + name); throw error; }); }
// jsdom prints a "Not implemented" line per getComputedStyle call: far past execFileSync's default buffer. Keep stdout and the lines that matter.
const build = (...args) => {
  const run = require('node:child_process').spawnSync(process.execPath, [path.join(ROOT, 'scripts/build-glossary.cjs'), ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 30 });
  const said = (run.stdout + '\n' + run.stderr).split('\n').filter((line) => line && !/^Not implemented:/.test(line)).join('\n');
  if (run.status !== 0) throw new Error('build-glossary ' + args.join(' ') + ' exited ' + run.status + '\n' + said.slice(-3000));
  return said + '\n';
};

/* The words the pages used and the glossary lacked (docs/ux-audit/ledger.md S5). */
const ADDED = ['mesh', 'resolution', 'fxn', 'fxn chain', 'bundle', 'tier', 'ops/s', 'dao', 'roster', 'threshold', 'substrate', 'auth kit', 'ghost id', 'miner presence'];
/* The routes the ledger names as jargon walls with no glossing, now wired. */
const WIRED = { stats: 'stats', 'stats/ledger': 'stats-ledger', 'resolver-math': 'resolver-math', resolvers: 'resolvers', explorer: 'explorer', account: 'account' };
const WIRED_SOURCE = { stats: 'js/pages/stats.js', 'stats/ledger': 'js/pages/stats-ledger.js', 'resolver-math': 'js/pages/resolver-math.js', resolvers: 'js/pages/resolvers.js', explorer: 'js/pages/explorer.js', account: 'js/pages/account.js' };

(async () => {
  const entries = builder.parse(read('docs/glossary.md'));
  const keys = entries.map((entry) => entry.key);

  await test('the doc defines the added words, each with the document it came from, and no tooltip carries that citation', () => {
    // Defect guarded: a definition typed from memory. Each entry ends with "Source: ..." (the reference reader shows it; a tooltip does not).
    for (const key of ADDED) {
      assert(keys.includes(key), key + ' is defined');
      const entry = entries.find((e) => e.key === key);
      assert(entry.definition.length > 40 && entry.definition.length < 320, key + ': a plain sentence or two, not a stub and not a paragraph (' + entry.definition.length + ')');
      assert(!/\bSource\b|\bSee\b|\.md\b/.test(entry.definition), key + ': the citation is not part of the tooltip: ' + entry.definition);
    }
    const doc = read('docs/glossary.md');
    for (const term of ['Mesh', 'Resolution', 'FXN', 'FXN chain', 'Bundle', 'Tier', 'Ops/s', 'DAO', 'Roster', 'Threshold', 'Substrate', 'Auth Kit', 'Ghost ID', 'Miner presence'])
      assert(new RegExp('\\*\\*' + term.replace(/[/]/g, '\\/') + '\\*\\* — [^\\n]* Source: ').test(doc), term + ' names its source in the doc');
  });

  await test('"quorum" is not a glossary term: it is retired vocabulary (docs/deprecated.md), and the current word is defined instead', () => {
    // Defect guarded: defining the word the deprecated-vocabulary law forbids, and teaching a visitor the agreement step this system does not have.
    assert(!keys.includes('quorum'), 'quorum is not defined');
    assert(keys.includes('threshold') && keys.includes('roster'), 'a decision that needs several signers is a roster and a threshold');
    assert(!/quorum/i.test(read('docs/glossary.md').replace(/`[^`]*`/g, '')), 'docs/glossary.md carries no retired word in prose (tests/no-deprecated-vocabulary.cjs scans it)');
  });

  await test('the builder keeps a pointer out of a tooltip and a sentence that merely begins "Source" in it', () => {
    assert.equal(builder.definitionOf('A thing. Source: [a](b.md), `c/d.md` ("q?").'), 'A thing.');
    assert.equal(builder.definitionOf('Open. See [resolvers](protocol/resolvers.md).'), 'Open.');
    assert.equal(builder.definitionOf('Open. Source code is open.'), 'Open. Source code is open.', 'only "Source:" is a pointer');
    assert.equal(builder.definitionOf('It is. (Until 2026-10-19 this read x.) See [r](p.md).'), 'It is.', 'a dated history note goes too');
  });

  await test('a route file adds its terms to the glossary already loaded, and never takes one away (the editor, a saved term block)', () => {
    // Defect guarded: the loader adds the whole glossary beside a saved term block, in either order with the route's own file.
    const full = read('js/content/glossary.js'), file = 'js/content/glossary/stats.js';
    const route = read(file);
    // window is the global, as in a browser: `var ArkGlossary = window.ArkGlossary || ...` reads what an earlier file left
    const load = (...sources) => { const ctx = vm.createContext({}); ctx.window = ctx; for (const source of sources) vm.runInContext(source, ctx); return Object.keys(ctx.ArkGlossary.map).length; };
    const own = builder.keysOf(route).length;
    assert.equal(load(route), own, 'alone, a route has just its terms');
    assert.equal(load(full, route), keys.length, 'the whole glossary first: still every term');
    assert.equal(load(route, full), keys.length, 'the route first: the whole glossary replaces it');
    assert(own < keys.length, 'a route does not ship the whole glossary');
  });

  const { catalog } = loadCatalog();

  await test('the catalog gives each route its own file by one rule; the whole glossary stays for the editor', () => {
    // Defect guarded: a route naming its file twice (here and in a list), or still loading all of it.
    const withFile = Object.keys(catalog).filter((key) => catalog[key].scripts.some((s) => /^js\/content\/glossary\//.test(s)));
    assert(withFile.length >= 40, 'many routes: ' + withFile.length);
    for (const key of withFile) {
      const listed = [...catalog[key].scripts].filter((s) => /^js\/content\/glossary/.test(s)); // [...]: the catalog is built in a vm realm
      assert.deepEqual(listed, ['js/content/glossary/' + key.replace(/\//g, '-') + '.js'], key + ' loads exactly its own file');
      assert(fs.existsSync(path.join(ROOT, listed[0])), key + ': ' + listed[0] + ' exists (node scripts/build-glossary.cjs)');
      assert(/^js\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.js$/.test(listed[0]), key + ': the loader accepts the path');
    }
    assert(!Object.keys(catalog).some((key) => catalog[key].scripts.includes('js/content/glossary.js')), 'no saved route loads the whole glossary');
    assert.match(read('js/pages/catalog.js'), /ArkUI\.glossaryScript = 'js\/content\/glossary\.js';/, 'the whole glossary is still named (the editor and the loader read it)');
    // a draft route (catalogContentRoutes after load) has no file until it is saved and built: it keeps the whole glossary
    const ctx = vm.createContext({ ArkUI: {}, ArkCopy: { text: (k) => k }, LearningContent: { articles: [] }, ArkManifest: { group: () => [] } });
    for (const file of ['js/content/site-pages.js', 'js/pages/catalog.js']) vm.runInContext(read(file), ctx, { filename: file });
    ctx.ArkUI.catalogContentRoutes([{ slug: 'hello-world', title: 'Hello', sections: [['a', 'b']] }], []);
    assert(ctx.ArkUI.pageCatalog['article/hello-world'].scripts.includes('js/content/glossary.js'), 'a draft article keeps the whole glossary');
  });

  await test('the jargon-wall routes the ledger names now ask for first-use terms and load their own glossary', () => {
    for (const [key, slug] of Object.entries(WIRED)) {
      assert(catalog[key].scripts.includes('js/content/glossary/' + slug + '.js'), key + ' loads its glossary');
      const source = read(WIRED_SOURCE[key]);
      assert(/terms: 'first-use'/.test(source), key + ': ' + WIRED_SOURCE[key] + " passes terms: 'first-use'");
      assert(!/\[\[(?!term\]\])[A-Za-z][A-Za-z ]*(\|[a-z0-9 -]+)?\]\]/.test(source), key + ': no hand-marked [[term]] left beside the first-use marking');
    }
    assert(!/function gloss\(/.test(read('js/pages/resolvers.js')), '/resolvers glosses by first use, not by its own keyed helper');
    for (const key of Object.keys(WIRED)) assert(fs.existsSync(path.join(ROOT, 'js/content/glossary/' + WIRED[key] + '.js')), key + ' has a file');
  });

  await test("a hero title is never glossed: first-use marks `text` props only (docs/ux-audit/ledger.md WR-4)", () => {
    const adapter = read('scripts/ark-blocks-adapter.js');
    assert(/propKind\(where\.block, where\.prop\) === 'text'/.test(adapter), 'the marker asks the block schema for the prop kind');
  });

  await test('the budget: block + a route glossary stays inside +30 KB gz of added JS (R2), measured with gzip -9', () => {
    // Defect guarded: the glossary growing back to the whole file on a route. Kit + adapter is the block route's bill (docs/cms-architecture.md Budget).
    const base = gz('js/ark/vendor/ark-kit-public.js') + gz('js/ark/blocks.js');
    const rows = [], over = [];
    for (const key of Object.keys(catalog)) {
      const file = catalog[key].scripts.find((s) => /^js\/content\/glossary\//.test(s));
      if (!file) continue;
      const bytes = gz(file);
      assert(bytes < gz('js/content/glossary.js'), key + ': a route file is smaller than the whole glossary');
      rows.push([key, bytes, base + bytes]);
      if (base + bytes > 30 * 1000) over.push(key + ' ' + ((base + bytes) / 1000).toFixed(2));
    }
    rows.sort((a, b) => b[1] - a[1]);
    console.log('route glossary (B gz): ' + rows.slice(0, 8).map((r) => r[0] + ' ' + r[1]).join(', ') + ' ... largest of ' + rows.length + '; kit+adapter ' + base + ' B');
    assert.deepEqual(over, [], 'every block+terms route fits +30 KB gz with kit + adapter + its glossary (' + (base / 1000).toFixed(2) + ' + file)');
  });

  for (const [route, key] of [['/stats', 'stats'], ['/resolvers', 'resolvers']]) {
    await test(route + ': every term keeps its definition in the tip at mount, as the trigger\'s accessible description, and the server render serialises it', async () => {
      // Defect guarded: a per-route glossary that dropped what the term block promises (pages-ux-a #6): the definition is there before anyone opens anything.
      const whole = new Map(entries.map((entry) => [entry.key, entry.definition]));
      const seen = await checks.visit(route, async (window, page) => {
        const terms = [...page.querySelectorAll('[data-ark-part="term"][data-term]')].map((el) => {
          const trigger = el.querySelector('[data-ark-part="term-trigger"]'), tip = el.querySelector('[data-ark-part="term-tip"]');
          return { key: el.getAttribute('data-term'), described: !!tip && trigger.getAttribute('aria-describedby') === tip.id, tip: tip ? tip.textContent : '' };
        });
        return { tips: terms };
      });
      assert.deepEqual(seen.termsMissing, [], route + ': no term lacks its definition');
      assert(seen.tips.length >= 5, route + ' glosses its jargon (' + seen.tips.length + ')');
      for (const term of seen.tips) {
        assert(term.described, route + ': "' + term.key + '" is the trigger\'s accessible description');
        assert.equal(term.tip, whole.get(term.key), route + ': "' + term.key + '" shows the glossary\'s own words');
      }
      const html = await (async () => {
        const core = await import(path.join(ROOT, 'api/lib/render-core.mjs'));
        return core.renderDocument({ html: await core.readIndexHtml(ROOT), url: 'https://defxn.com' + route, resources: core.createLocalResources(ROOT), root: ROOT, timeoutMs: 30000 });
      })();
      for (const term of seen.tips.slice(0, 5)) assert(html.includes(whole.get(term.key).replace(/&/g, '&amp;').replace(/</g, '&lt;')), route + ': the crawler\'s HTML holds the definition of "' + term.key + '"');
      assert.deepEqual(builder.keysOf(read('js/content/glossary/' + key + '.js')).filter((k) => !seen.tips.some((t) => t.key === k)), [], route + ': its file ships only terms it renders');
    });
  }

  await test('drift: every route renders exactly the terms its file ships, with the whole glossary and with its own (node scripts/build-glossary.cjs --check --routes)', () => {
    // Defect guarded: a page whose text changed so its term set is now wrong -- a new glossary word with no gloss, or a dead definition still shipped.
    process.stdout.write(build('--check', '--routes'));
  });

  console.log('ok glossary-routes (' + passed + ' cases)');
})().catch((error) => { console.error(error); process.exit(1); });

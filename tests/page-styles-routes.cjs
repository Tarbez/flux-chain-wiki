'use strict';
/* run-tests-timeout-ms: 900000 -- boots the whole site through jsdom once per route (about 65), one at a time. */
/* Every route renders styled by the sheets it loads, and the committed derivation is the one the code
   gives today.

   Why this exists (owner decision 2026-10-20): a route loads the shared sheets plus its own, so a sheet
   the derivation (scripts/page-styles.mjs) wrongly left out shows as a bare page. The derivation reads
   selectors' NAMES; this test asks the rendered DOM instead, with the browser's own selector matching,
   so it can catch what the reading missed (an escaped class, a pseudo it stripped wrongly, a class a
   shared library builds that no script spells out).

   For each route of the real catalog (ArkUI.pageCatalog, the articles, the 20 resolutions, the theory
   pages), rendered through tests/lib/block-page-checks.cjs visit() -- the real server render:
     1. the sheets the loader linked are the shared ones plus the route's own, and the route's own sit in
        the document head (so the server render of a crawler carries them) before css/components.css;
     2. EVERY sheet of the site that is not loaded here has no rule whose selector matches any element of
        the mounted page (states and pseudo-elements dropped: .a:hover::before asks for .a). The failure
        names the route, the sheet and the rule: the remedy is the rule's page naming the class where
        the derivation can see it, or the sheet being shared;
     3. at the end, scripts/page-styles.mjs's own check, fed the DOM these renders gave, finds the block
        in js/pages/catalog.js and the links in index.html exactly as committed (no drift). Run alone
        (owner test law); `node tests/page-styles-routes.cjs /stats /account` checks those routes only
        (and skips the drift check, which needs every route). */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const checks = require('./lib/block-page-checks.cjs');

const ROOT = checks.ROOT;
const only = process.argv.slice(2);

(async () => {
  const tool = await import(path.join(ROOT, 'scripts/page-styles.mjs'));
  const core = await import(path.join(ROOT, 'api/lib/render-core.mjs'));
  const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
  /* visit() asks for a mounted Ark page; a route not yet built from blocks (the docs reader) has none, and
     is rendered the same way without that question */
  const render = async (route, inspect) => {
    try { return await checks.visit(route, inspect); }
    catch (error) {
      if (!/mounted no page|Timed out/.test(error.message)) throw error;
      /* a boot that timed out on a loaded machine is retried with the wait doubled each time; a page that
         is broken fails the same way every time and the last error stands */
      for (let attempt = 0; ; attempt++) {
        try { return await core.inspectDocument({ html: await core.readIndexHtml(ROOT), url: 'https://defxn.com' + route, resources: core.createLocalResources(ROOT), root: ROOT, timeoutMs: 60000 * 2 ** attempt }, inspect); }
        catch (again) { if (attempt >= 2 || !/Timed out/.test(again.message)) throw again; }
      }
    }
  };

  const catalog = await render('/', (window) => ({
    routes: Object.entries(window.ArkUI.pageCatalog).map(([key, entry]) => ({ key, path: entry.path, module: entry.module, styles: entry.styles })),
    order: window.ArkUI.styleOrder.slice(),
    shared: window.ArkUI.pageStyles.shared.slice()
  }));
  const parsed = new Map(catalog.order.map((file) => [file, tool.parseSheet(read(file))]));
  const dom = new Map();
  const failures = [], skipped = new Set();
  let checked = 0;

  for (const route of catalog.routes.filter((r) => !only.length || only.includes(r.path))) {
    const seen = await render(route.path, async (window) => {
      await new Promise((resolve) => window.setTimeout(resolve, tool.SETTLE_MS));
      const document = window.document;
      const links = [...document.querySelectorAll('link[rel~="stylesheet"]')];
      const file = (link) => link.getAttribute('href').split('?')[0].replace(/^\/+/, '');
      const loaded = new Set(links.map(file));
      const missingLinks = [...catalog.shared, ...route.styles].filter((f) => !loaded.has(f));
      /* the route's own sheets are in the head -- the crawler's HTML carries them -- ahead of components.css */
      const own = route.styles.map((f) => links.findIndex((link) => file(link) === f));
      const components = links.findIndex((link) => file(link) === 'css/components.css');
      const misplaced = route.styles.filter((f, n) => own[n] < 0 || own[n] > components || links[own[n]].parentNode !== document.head);
      /* in cascade order, so the page cascades as it did when index.html linked everything */
      const linkedOrder = links.map(file).filter((f) => catalog.order.includes(f));
      const inOrder = linkedOrder.every((f, n) => n === 0 || catalog.order.indexOf(linkedOrder[n - 1]) < catalog.order.indexOf(f));
      const bare = [];
      for (const [sheet, { rules }] of parsed) {
        if (loaded.has(sheet)) continue;
        for (const rule of rules) for (const selector of rule.selectors) {
          const hit = tool.matchesIn(document, selector);
          if (hit === null) skipped.add(selector);
          else if (hit) { bare.push(sheet + ' { ' + selector + ' }'); break; }
        }
      }
      return { words: tool.domWords(window), missingLinks, misplaced, inOrder, bare: [...new Set(bare)].slice(0, 5), loaded: loaded.size };
    });
    checked += 1;
    if (!dom.has(route.module)) dom.set(route.module, new tool.Vocabulary());
    seen.words.forEach((word) => dom.get(route.module).words.add(word));
    if (seen.missingLinks.length) failures.push(`${route.path}: the loader did not link ${seen.missingLinks.join(', ')} before the page mounted`);
    if (seen.misplaced.length) failures.push(`${route.path}: ${seen.misplaced.join(', ')} are not in <head> ahead of css/components.css`);
    if (!seen.inOrder) failures.push(`${route.path}: the sheets are linked out of cascade order (ArkUI.styleOrder)`);
    if (seen.bare.length) failures.push(`${route.path} (${route.module}) renders elements that a sheet it does not load styles: ${seen.bare.join('; ')}`);
  }
  assert.deepEqual(failures, [], 'routes rendered with a sheet missing:\n  ' + failures.join('\n  '));

  /* the crawler's HTML itself (renderDocument is what api/render.mjs sends a bot) carries the route's links */
  const { renderDocument, readIndexHtml, createLocalResources } = core;
  const sample = catalog.routes.find((r) => r.styles.length && (!only.length || only.includes(r.path)));
  if (sample) {
    const html = await renderDocument({ html: await readIndexHtml(ROOT), url: 'https://defxn.com' + sample.path, resources: createLocalResources(ROOT), root: ROOT, timeoutMs: 30000 });
    const head = html.slice(0, html.indexOf('</head>'));
    for (const file of sample.styles) assert(new RegExp('<link[^>]*href="/' + file.replace(/[./]/g, '\\$&') + '\\?v=[^"]+"').test(head), `${sample.path}: the server render's <head> links ${file}, so the first paint is styled`);
    assert(head.indexOf(sample.styles[sample.styles.length - 1]) < head.indexOf('css/components.css'), sample.path + ': and before css/components.css');
  }

  if (!only.length) {
    const drift = await tool.problems({ dom });
    assert.deepEqual(drift, [], 'the committed derivation drifted from the code (node scripts/page-styles.mjs --write):\n  ' + drift.join('\n  '));
  }
  console.log(`PASS: ${checked} routes render with every sheet that styles them loaded (the shared ones + their module's), the crawler's <head> carries them in cascade order${only.length ? '' : ', and the committed derivation matches a fresh one'}; ${skipped.size} selectors could not be asked of the DOM (vendor pseudo-classes).`);
})().catch((error) => { console.error(error); process.exit(1); });

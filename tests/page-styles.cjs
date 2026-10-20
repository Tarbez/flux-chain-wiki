'use strict';
/* Per-route stylesheets, the parts that need no render (the render half is tests/page-styles-routes.cjs).

   Why this exists (owner decision 2026-10-20): index.html linked all ~47 stylesheets on every route.
   Now it links the shared sheets and each route adds only its own, derived by scripts/page-styles.mjs
   and written into js/pages/catalog.js. This file holds what must stay true of that without booting
   the site:

   1. The committed lists are coherent: index.html links exactly ArkUI.pageStyles.shared, in cascade
      order, with css/components.css last; every module's list is in cascade order and holds nothing
      index.html already links; every catalog route carries its module's list.
   2. No stylesheet is orphaned: every file in css/ and assets/kit/ is shared, some module's own, or
      linked by another document (the editor). An orphan is weight nobody loads or a page that lost
      its sheet -- both are silent.
   3. The parser and the selector reading behave (named cases, each with the reason it exists).
   4. The loader (js/ark/page-loader.js) links a route's sheets in cascade order, waits for them before
      the page resolves, never links one twice, is not stopped by a sheet that fails, and falls back
      to "everything the shell does not link" for an entry with no list. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { loadCatalog } = require('./lib/site-catalog.cjs');

const ROOT = path.resolve(__dirname, '..');

(async () => {
  const tool = await import(path.join(ROOT, 'scripts/page-styles.mjs'));
  const { catalog, context } = loadCatalog();
  const styles = JSON.parse(JSON.stringify(context.ArkUI.pageStyles)), order = JSON.parse(JSON.stringify(context.ArkUI.styleOrder)); // out of the vm realm, so deepEqual compares values
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

  /* ---- 1. the committed lists are coherent ---- */
  const linked = tool.indexSheets(html).map((sheet) => sheet.file);
  assert.deepEqual(linked, styles.shared, 'index.html links exactly the shared sheets, in cascade order (node scripts/page-styles.mjs --write)');
  assert.equal(linked[linked.length - 1], 'css/components.css', 'css/components.css is the last sheet linked: it decides interactive paint');
  assert.deepEqual(styles.shared, order.filter((file) => styles.shared.includes(file)), 'the shared list is in cascade order');
  assert(styles.shared.includes('css/ark-blocks.css') && styles.shared.includes('css/themes.css'), 'the block sheet and the theme sheet are shared: the server render serializes before any lazy sheet could arrive');
  for (const [module, files] of Object.entries(styles.modules)) {
    assert.deepEqual(files, order.filter((file) => files.includes(file)), module + ': its sheets are in cascade order');
    assert.deepEqual(files.filter((file) => styles.shared.includes(file)), [], module + ': lists nothing index.html already links');
    for (const file of files) assert(fs.existsSync(path.join(ROOT, file)), module + ' names ' + file + ', which does not exist');
  }
  for (const [key, entry] of Object.entries(catalog)) {
    assert(Array.isArray(entry.styles), key + ' has no styles list: its module "' + entry.module + '" is missing from ArkUI.pageStyles.modules (node scripts/page-styles.mjs --write)');
    assert.deepEqual([...entry.styles], styles.modules[entry.module], key + ': carries its module\'s list');
  }
  /* routes derived at run time by the editor's canvas (a draft article, a draft theory page) get the same lists */
  context.ArkUI.catalogContentRoutes([{ slug: 'draft', title: 'Draft', sections: [{}] }], [{ id: 'draft', route: '/draft' }]);
  assert.deepEqual([...context.ArkUI.pageCatalog['article/draft'].styles], styles.modules.article, 'a draft article route carries the article list');
  assert.deepEqual([...context.ArkUI.pageCatalog['concept/draft'].styles], styles.modules.theory, 'a draft theory route carries the theory list');

  /* ---- 2. no stylesheet is orphaned ---- */
  const claimed = new Set([...styles.shared, ...Object.values(styles.modules).flat()]);
  /* the editor's sheets (css/admin.css, css/studio-embed.css) are linked by admin*.html and are not the public site's to place */
  assert.deepEqual([...tool.editorSheets()].sort().filter((file) => claimed.has(file)), [], 'no editor sheet is also claimed by the public site');
  const orphans = tool.sheetFiles().filter((file) => !claimed.has(file));
  assert.deepEqual(orphans, [], 'orphaned stylesheets (no page module needs them, index.html and the editor do not link them): delete them or give a page their class');
  assert(tool.editorSheets().has('css/admin.css') && !tool.sheetFiles().includes('css/admin.css'), 'the editor sheet set is read from the editor documents');
  assert.deepEqual(tool.sheetFiles().filter((file) => !order.includes(file)), [], 'every sheet has a place in ArkUI.styleOrder (the cascade)');

  /* ---- 3. the reading of a stylesheet ---- */
  const needs = (selector) => [...tool.selectorNeeds(selector)].sort();
  assert.deepEqual(needs('#scene .a.b > .c:hover::before'), ['a', 'b', 'c', 'scene'], 'classes and ids are what a rule needs; pseudo-classes and elements are not');
  assert.deepEqual(needs('.a:not(.b) :is(.c, .d)'), ['a'], 'a class inside :not()/:is() only narrows or alternates: it is not required (a sheet is never dropped for a name it may not need)');
  assert.deepEqual(needs('body'), [], 'a rule that names no class or id applies to every page: its sheet is global, hence shared');
  assert.deepEqual(needs('.hero-alive[data-page="zero"]'), ['hero-alive', 'page:zero'], 'the router sets data-page to the route key, so its value is a route requirement');
  assert.deepEqual(needs('#scene .continuity-host[data-panel-page="account"]'), ['continuity-host', 'page:account', 'scene'], 'css/account.css hung off .continuity-host, which every page has; the attribute value is what makes it the account page\'s');
  assert.deepEqual(needs('#scene [data-domains-form] .x'), ['data-domains-form', 'scene', 'x'], 'an attribute rule needs the attribute some script sets');
  assert.deepEqual(needs('.md\\:flex'), ['md:flex'], 'an escaped class is read unescaped');
  const sheet = tool.parseSheet(`/* c */ @media (min-width: 900px) { .a, .b > c { color: red } } @keyframes spin { to { transform: none } } @font-face { font-family: "F"; src: url(x) } .d { content: "}" } @import "x.css";`);
  assert.deepEqual(sheet.rules.map((rule) => rule.selectors), [['.a', '.b > c'], ['.d']], 'rules inside @media are read, a } in a string closes nothing, comments and @import are skipped');
  assert([...sheet.keyframes].includes('spin') && [...sheet.fonts].includes('F'), 'keyframes and font-faces are what a sheet provides');
  const vocabulary = new tool.Vocabulary().addScript(`
    // a comment about .flow-comment and 'quoted-in-a-comment'
    el.className = 'is-live card'; x.classList.add("dash-span-" + n); el.dataset.panelPage = p;
    const html = '<div class="tile-a tile-b" id="tile-id" data-kind="x">' + y; const q = '#scene .stats-dash > [data-form]';
    const sentence = 'Flow of funds, in one place.'; const label = 'A plain sentence of copy'; const flow = 1; flow.run();`);
  for (const word of ['is-live', 'card', 'dash-span-', 'data-panel-page', 'tile-a', 'tile-b', 'tile-id', 'data-kind', 'scene', 'stats-dash', 'data-form'])
    assert(vocabulary.has(word), word + ' is read from a string literal, markup or selector');
  assert(!vocabulary.has('dash-span-6'), 'a name built from pieces is not guessed (a class is found by the DOM source, or by its sheet\'s other rules): matching by prefix made every dash-* class present for the whole site');
  for (const word of ['flow-comment', 'quoted-in-a-comment', 'Flow', 'funds', 'flow', 'run', 'plain', 'copy'])
    assert(!vocabulary.has(word), word + ' is not a name: a comment, an identifier, or a word of copy (reading every word made .flow "present" on any page whose text mentioned a flow)');
  /* a one-word literal IS read ('card' above): a rule on a class that is also a plain word may link its sheet needlessly -- safe, and
     measured: it is the cost of never dropping a sheet whose class a script spells out */

  /* ---- 4. the loader ---- */
  const dom = new JSDOM('<!doctype html><html><head><link rel="stylesheet" href="css/a.css?v=1"><link rel="stylesheet" href="css/z.css?v=1"></head><body></body></html>', { url: 'https://defxn.com/stats/gpu', runScripts: 'outside-only' });
  const { window } = dom;
  window.eval(`var ArkUI = { pageModules: { m: {} }, styleOrder: ['css/a.css', 'css/b.css', 'css/c.css', 'css/d.css', 'css/z.css'], pageStyles: { shared: ['css/a.css', 'css/z.css'], modules: {} } }; window.ArkUI = ArkUI;`);
  window.eval(fs.readFileSync(path.join(ROOT, 'js/ark/page-loader.js'), 'utf8'));
  const heads = () => [...window.document.querySelectorAll('link[rel~="stylesheet"]')].map((link) => link.getAttribute('href').split('?')[0]);
  let resolved = false;
  const pending = window.ArkUI.loadPage('p', { module: 'm', scripts: [], styles: ['css/c.css', 'css/b.css', 'css/a.css'] }).then(() => { resolved = true; });
  assert.deepEqual(heads(), ['css/a.css', '/css/b.css', '/css/c.css', 'css/z.css'], 'a late sheet is inserted at its place in the cascade, before the next sheet already linked, whatever order the page lists them in');
  assert(/^\/css\/b\.css\?v=\d/.test(window.document.querySelector('link[data-ark-style="css/b.css"]').getAttribute('href')), 'a page sheet is linked from the site root with the cache-bust tag');
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(resolved, false, 'the page does not resolve until its sheets have loaded: it is never painted bare');
  window.document.querySelector('link[data-ark-style="css/b.css"]').dispatchEvent(new window.Event('load'));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(resolved, false, 'one sheet loaded of two is not enough');
  window.document.querySelector('link[data-ark-style="css/c.css"]').dispatchEvent(new window.Event('load'));
  await pending;
  assert.equal(resolved, true, 'the page resolves when its last sheet has loaded');
  await window.ArkUI.loadPage('q', { module: 'm', scripts: [], styles: ['css/b.css', 'css/c.css'] });
  assert.equal(window.document.querySelectorAll('link[data-ark-style]').length, 2, 'a sheet is linked once, however many pages list it');

  const failing = window.ArkUI.loadPage('r', { module: 'm', scripts: [], styles: ['css/gone.css'] });
  const errors = [];
  window.console.error = (...args) => errors.push(args.join(' '));
  window.document.querySelector('link[data-ark-style="css/gone.css"]').dispatchEvent(new window.Event('error'));
  await failing;
  assert(errors.some((line) => line.includes('css/gone.css')), 'a sheet that fails to load is named in the console, and does not stop the page');
  assert.equal(window.document.querySelector('link[data-ark-style="css/gone.css"]'), null, 'a failed link is removed so the next visit tries again');

  const fallback = window.ArkUI.loadPage('s', { module: 'm', scripts: [] });
  assert.deepEqual([...window.document.querySelectorAll('link[data-ark-style]')].map((link) => link.getAttribute('data-ark-style')), ['css/b.css', 'css/c.css', 'css/d.css'], 'an entry with no styles list gets every sheet the shell does not link (already linked ones are not repeated)');
  void fallback;
  window.close();

  console.log('PASS: index.html links exactly the shared sheets with components.css last; every route carries its module\'s list; no stylesheet is orphaned (' + tool.sheetFiles().length + ' sheets, ' + claimed.size + ' claimed); the selector reading and the loader behave.');
})().catch((error) => { console.error(error); process.exit(1); });

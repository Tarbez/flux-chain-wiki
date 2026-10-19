'use strict';
/* A page or article that exists only as a draft is ON the canvas the moment it is created, under
   the name every surface gives it, with its own Page fields open.

   Why this exists (docs/ux-audit/cms.md P0-1): after "Add", the canvas kept showing Home while
   its label named the new page; the header's Page fields opened Home's fields; the explanation
   was the header status cut to "New page. Edit it, th..."; and a new article "hello-world" was
   called "New note" in the rail and in Delete's confirm. The cause: the site's router learned a
   page's address only from the SAVED files (js/pages/catalog.js ran once, at load), so a draft
   route fell back to Home, and three indicators disagreed about which page was current. Held:
     - js/pages/catalog.js derives article and theory-page routes in ONE function
       (ArkUI.catalogContentRoutes), which the canvas runs again on the drafts it is sent; a draft
       article's body is already loaded, so its (not yet existing) body file is not fetched;
     - js/ark/scene-state.js gives a route added later the same neutral scene state (the router
       refuses a page without one: "Unknown scene page" was the first thing this fix hit);
     - js/main.js navigates to the route the editor asked for only when THAT message made it
       routable -- any other route is the editor's to change;
     - the editor: the draft route is named by its draft's title, "hello-world" becomes
       "Hello world", and creating lands on the new item -- its Page fields, a notice naming it.
   tests/browser/cms-journeys.mjs walks it in Chromium (the canvas shows the new page's words). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { bootForms } = require('./lib/admin-forms-dom.cjs');
const { functionSource } = require('./lib/admin-source.cjs');

/* ---- js/pages/catalog.js: one derivation for saved and draft routes ---- */
{
  const ctx = vm.createContext({
    ArkUI: {},
    LearningContent: { articles: [{ slug: 'saved-note', title: 'Saved note' }] },
    ArkManifest: { group: (g) => (g === 'theory' ? [{ id: 'depth', route: '/concept/depth', group: 'theory' }] : []) },
    ArkCopy: { text: (key) => (key === 'DEPTH.TITLE' ? 'Depth.' : key === 'PRICING.TITLE' ? 'New page.' : '') },
  });
  vm.runInContext(fs.readFileSync('js/pages/catalog.js', 'utf8'), ctx);
  const cat = ctx.ArkUI.pageCatalog;
  assert.equal(cat['article/saved-note'].path, '/learnings/saved-note');
  assert(cat['article/saved-note'].scripts.includes('js/content/articles/saved-note.js'), 'a saved article loads its body file');
  assert.equal(cat['concept/depth'].path, '/concept/depth');
  const added = ctx.ArkUI.catalogContentRoutes(
    [{ slug: 'hello-world', title: 'Hello world', sections: [['First heading', 'Write the first paragraph.']] }],
    [{ id: 'pricing', route: '/concept/pricing', group: 'theory' }]);
  assert.deepEqual([...added], ['article/hello-world', 'concept/pricing'], 'the draft routes are added, and reported');
  assert.equal(cat['concept/pricing'].path, '/concept/pricing');
  assert.equal(cat['concept/pricing'].module, 'theory', 'a draft theory page renders with the same module as a saved one');
  assert.equal(cat['article/hello-world'].module, 'article');
  assert(!cat['article/hello-world'].scripts.some((s) => s.includes('articles/hello-world')), 'a draft article does not fetch a body file that does not exist until Save');
  assert.deepEqual([...ctx.ArkUI.catalogContentRoutes([{ slug: 'hello-world', title: 'Hello world', sections: [] }], [])], [], 'a route already known is not reported as added');
}

/* ---- js/ark/scene-state.js: a route added later gets scene state ---- */
{
  function Store() { const data = {}; this.get = (k) => data[k]; this.set = (k, v) => { data[k] = v; }; this.subscribe = () => () => {}; }
  const ctx = vm.createContext({ ArkUI: { pageCatalog: { zero: { path: '/' } } }, ArkEngines: { FluxMemoryStore: Store } });
  vm.runInContext(fs.readFileSync('js/ark/scene-state.js', 'utf8'), ctx);
  const scene = ctx.ArkUI.sceneState;
  assert.throws(() => scene.navigate('concept/pricing'), /Unknown scene page/, 'the fixture: an unknown page is refused');
  scene.addPages(['concept/pricing']);
  scene.navigate('concept/pricing');
  assert.equal(scene.get().page, 'concept/pricing', 'a route added after load can be navigated to');
  assert.deepEqual(JSON.parse(JSON.stringify(scene.pages['concept/pricing'])), { mesh: 'zero', dissolve: 0, depth: 0 }, 'with the neutral scene state every content page inherits');
}

/* ---- js/main.js + js/admin/bridge.js: the canvas is told the route, and opens only a new one ---- */
{
  const main = fs.readFileSync('js/main.js', 'utf8');
  const handler = main.slice(main.indexOf("if (data.type !== 'defxn-cms-preview-state' || !data.site"), main.indexOf('window.addEventListener(\'message\', cmsOnMessage);'));
  assert(/ArkUI\.catalogContentRoutes\(/.test(handler), 'the preview derives draft routes with the catalog\'s own function (not a copy)');
  assert(/ArkUI\.sceneState\.addPages\(draftRoutes\)/.test(handler), 'and gives them scene state');
  assert(/draftRoutes\.indexOf\(draftTarget\) >= 0 && draftTarget !== ArkUI\.pageRouter\.active/.test(handler), 'it navigates only to a route THIS message made routable, never away from one the person is on');
  assert(/openDraft \? ArkUI\.pageRouter\.navigate\(draftTarget, \{ history: 'replace' \}\)/.test(handler), 'and otherwise re-renders in place, as before');
  const bridge = fs.readFileSync('js/admin/bridge.js', 'utf8');
  assert(/type: 'defxn-cms-preview-state', site: [^}]*, route: state\.cmsCurrentRoute \|\| '\/'/.test(bridge), 'the editor tells the canvas which route it wants with every state');
}

/* ---- the editor: names, landing, notice ---- */
(async function main() {
  const { window, document, A, state } = bootForms();
  const opened = [], shown = [];
  A.provide({ select: (id) => shown.push(['page', id]), selectArticle: (slug) => shown.push(['article', slug]),
    openPageFields: (opts) => opened.push(opts), renderList: () => {} });
  document.body.insertAdjacentHTML('beforeend', '<form id="newForm"><input id="newId"></form><form id="newArticleForm"><input id="newSlug"></form>');
  const submit = (form) => document.getElementById(form).dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));

  document.getElementById('newId').value = 'pricing';
  submit('newForm');
  assert.deepEqual(shown.pop(), ['page', 'pricing'], 'the new page is shown on the canvas');
  assert.deepEqual(JSON.parse(JSON.stringify(opened.pop())), { kind: 'page', id: 'pricing' }, 'its OWN Page fields open, not the page that was showing');
  const pageNotice = document.querySelector('[data-notice="created"]');
  assert(pageNotice && pageNotice.textContent.includes('“' + state.drafts.pricing.title + '” (/concept/pricing)'), 'the notice names the page as the rail does, with its address');
  assert(/draft until you Save/.test(pageNotice.textContent) && [...pageNotice.querySelectorAll('[data-part="alert-action"]')].some((b) => b.textContent === 'Save now'), 'and says it is a draft until Save, with Save as its button');

  document.getElementById('newSlug').value = 'hello-world';
  submit('newArticleForm');
  assert.equal(state.aDrafts['hello-world'].title, 'Hello world', 'an article is named from what was typed, not "New note"');
  assert.deepEqual(shown.pop(), ['article', 'hello-world']);
  assert.deepEqual(JSON.parse(JSON.stringify(opened.pop())), { kind: 'article', id: 'hello-world' });
  assert.equal(document.querySelectorAll('[data-notice="created"]').length, 1, 'one "created" notice at a time');
  assert(document.querySelector('[data-notice="created"]').textContent.includes('“Hello world” (/learnings/hello-world)'));

  /* studioRoutes (js/admin/studio.js): a route only the drafts have is named by its draft */
  const seo = { routes: (pages, articles) => pages.filter((m) => m.group !== 'site').map((m) => ({ path: m.route, id: m.id })).concat(articles.map((a) => ({ path: '/learnings/' + a.slug, slug: a.slug }))) };
  const ctx = vm.createContext({ ArkUI: { pageCatalog: { zero: { path: '/', title: 'Home' } } }, state, ArkSEO: seo, window: { ArkSEO: seo } });
  vm.runInContext(functionSource('studioRoutes') + ';this.studioRoutes = studioRoutes;', ctx);
  const routes = ctx.studioRoutes();
  assert.equal(routes.find((r) => r.path === '/concept/pricing').title, state.drafts.pricing.title, 'the canvas label and the page picker name the draft page as the rail does');
  assert.equal(routes.find((r) => r.path === '/learnings/hello-world').title, 'Hello world');

  console.log('PASS: a draft page or article has a route on the canvas (one derivation with the saved ones), scene state, and its own name; creating lands on it with its Page fields and a notice that names it.');
})().catch((error) => { console.error(error); process.exit(1); });

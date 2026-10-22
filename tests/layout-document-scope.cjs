'use strict';
/* Saved CMS edits on /reference are stored per document, not per address (js/content/layout.js,
   "a page's layout scope" and "moved scopes").

   Why this exists -- owner decision 2026-10-22. Every /reference document is one route, and every
   per-element edit was stored under the route, so all documents shared one '/reference' bucket. An
   edit made on Agreements (the default document then) landed on whatever element had the same
   layout key in every other document: a frame on Agreements' second paragraph moved the second
   paragraph of the glossary, the whitepaper and the overview too. The default document is now a
   current one (js/pages/reference.js defaultDoc), so those Agreements edits would have shown on the
   overview the first time anybody opened /reference.

   What it holds:
   1. A page that declares a scope (data-ark-layout-scope="doc=<id>") has its edits stored and
      applied under '<route>?doc=<id>'; a page that declares nothing is keyed by its route as before.
   2. An edit saved on document A does not apply on document B, whether B replaces A in the same
      page root (the reader swaps documents in place) or is mounted fresh.
   3. Edits saved under the old shared '/reference' scope were made on Agreements: they are read as
      Agreements' own (layout frames, groups, labels, alts; state groups; element motion) and apply
      on Agreements only -- never on the new default or any other document. Where both the old and
      the new scope hold an entry for one key, nothing is lost: the newer one's fields win.

   Uses jsdom so the DOM (parents, attributes, document order) is real. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const ROUTE = '/reference';
const AGREEMENTS = 'docs/protocol/agreements.md';
const OVERVIEW = 'docs/overview.md';
const scopeOf = (doc) => ROUTE + '?doc=' + doc;
/* values built inside the vm context have its Object.prototype: compare them as plain data */
const plain = (value) => JSON.parse(JSON.stringify(value));

function load() {
  const dom = new JSDOM('<!doctype html><body><div id="scene"><header><nav><a>Home</a></nav></header><div class="outlet"></div></div></body>');
  const doc = dom.window.document;
  const context = vm.createContext({ document: doc, window: dom.window, console,
    ArkUI: { pageCatalog: { reference: { path: ROUTE }, about: { path: '/about' } } } });
  for (const file of ['js/content/layout.js', 'js/content/components.js', 'js/content/states.js', 'js/content/element-motion.js']) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  }
  const env = { doc, scene: doc.getElementById('scene'), $: (s) => doc.querySelector(s), run: (code) => vm.runInContext(code, context) };
  env.L = env.run('ArkLayout'); env.S = env.run('ArkStates'); env.M = env.run('ArkElementMotion');
  /* the reader's page root as js/pages/reference.js draws it: one section, the document inside, the
     scope declared on the root (declareScope) */
  env.page = () => env.$('[data-ark-page="reference"]');
  env.show = (docId, words) => {
    let page = env.page();
    if (!page) { page = doc.createElement('section'); page.setAttribute('data-ark-page', 'reference'); env.$('.outlet').appendChild(page); }
    page.setAttribute('data-ark-layout-scope', 'doc=' + docId);
    page.innerHTML = '<h1>' + words + '</h1><p>' + words + ' first</p><p>' + words + ' second</p>';
    return page;
  };
  env.second = () => env.page().querySelectorAll('p')[1];
  env.keyOf = (el) => env.L.keyFor(el, env.scene);
  env.applied = (el) => el.hasAttribute('data-ark-layout-applied');
  return env;
}

{
  /* 1. the scope a page declares, and a page that declares none */
  const env = load();
  env.show(AGREEMENTS, 'Agreements');
  assert.equal(env.L.pageScope(env.page()), scopeOf(AGREEMENTS), 'the page root names its document');
  assert.equal(env.L.scopeFor(ROUTE, env.scene), scopeOf(AGREEMENTS), 'scopeFor finds the page shown for the route under #scene');
  assert.equal(env.L.scopeFor(ROUTE, env.page()), scopeOf(AGREEMENTS), 'and from the page root itself');
  assert.equal(env.L.scopeFor(scopeOf(AGREEMENTS), env.scene), scopeOf(AGREEMENTS), 'a scope given comes back as it is');
  assert.equal(env.L.scopeFor(env.L.SHELL, env.scene), env.L.SHELL, 'so does the shell scope');
  assert.equal(env.L.scopeFor('/about', env.scene), '/about', 'a route whose page is not shown is its own scope');
  const about = env.doc.createElement('section'); about.setAttribute('data-ark-page', 'about'); about.innerHTML = '<h1>About</h1>';
  env.$('.outlet').appendChild(about);
  assert.equal(env.L.scopeFor('/about', env.scene), '/about', 'a page that declares nothing is keyed by its route, as before');
  assert.equal(env.L.pageScope(about), '/about');
  about.setAttribute('data-ark-layout-scope', 'doc=a b');
  assert.equal(env.L.pageScope(about), '/about', 'a qualifier with a space is no scope: the route stands');
  about.setAttribute('data-ark-layout-scope', 'x?y');
  assert.equal(env.L.pageScope(about), '/about', 'nor one that would start a second query');
  about.remove();
  /* the route part is always the page's own catalog route: a page cannot name a scope outside it */
  env.page().setAttribute('data-ark-layout-scope', 'doc=' + OVERVIEW);
  assert(env.L.pageScope(env.page()).indexOf(ROUTE + '?') === 0);
}

{
  /* 2. an edit saved on one document stays on that document */
  const env = load();
  env.show(AGREEMENTS, 'Agreements');
  const key = env.keyOf(env.second());
  assert.equal(key, env.keyOf(env.second()), 'the key is stable');
  let draft = env.L.set({}, env.L.scopeFor(ROUTE, env.scene), key, 'desktop', { op: 60 });
  assert.deepEqual(Object.keys(draft.routes), [scopeOf(AGREEMENTS)], 'the edit is stored under the document\'s scope, not the bare route');

  env.L.apply(env.scene, env.L.scopeFor(ROUTE, env.scene), 1280, draft);
  assert(env.applied(env.second()), 'it applies on the document it was made on');
  assert.equal(env.second().style.opacity, '0.6');

  /* the reader swaps the document in place (js/pages/reference.js update): same page root, new scope */
  env.show(OVERVIEW, 'Overview');
  assert.equal(env.keyOf(env.second()), key, 'the other document has an element with the very same key');
  env.L.apply(env.scene, env.L.scopeFor(ROUTE, env.scene), 1280, draft);
  assert(!env.applied(env.second()), 'and the edit made on Agreements does not land on it');
  assert.notEqual(env.second().style.opacity, '0.6');
  assert.equal(env.L.find(env.scene, key, scopeOf(AGREEMENTS)), null, 'Agreements\' scope names nothing on the overview page');
  assert(env.L.find(env.scene, key, scopeOf(OVERVIEW)), 'the overview\'s own scope does');
  assert(!env.L.inRoute(env.second(), scopeOf(AGREEMENTS)), 'the overview\'s content is not in Agreements\' scope');
  assert(env.L.inRoute(env.second(), scopeOf(OVERVIEW)), 'it is in its own');
  assert(env.L.inRoute(env.$('header a'), scopeOf(AGREEMENTS)), 'the shell is in every scope');

  /* an edit on the overview is its own, and both coexist */
  draft = env.L.set(draft, scopeOf(OVERVIEW), key, 'desktop', { op: 40 });
  env.L.apply(env.scene, scopeOf(OVERVIEW), 1280, draft);
  assert.equal(env.second().style.opacity, '0.4', 'the overview shows its own edit');
  env.show(AGREEMENTS, 'Agreements');
  env.L.apply(env.scene, env.L.scopeFor(ROUTE, env.scene), 1280, draft);
  assert.equal(env.second().style.opacity, '0.6', 'and Agreements still shows its own');

  /* labels and alts follow the same scope */
  draft = env.L.setLabel(draft, scopeOf(AGREEMENTS), key, 'Second paragraph');
  assert.equal(env.L.labelFor(draft, scopeOf(AGREEMENTS), key, env.second()), 'Second paragraph');
  assert.equal(env.L.labelFor(draft, scopeOf(OVERVIEW), key, env.second()), '', 'a layer name given on Agreements is not the overview\'s');
}

{
  /* 3. the old shared '/reference' scope: every edit in it was made on Agreements */
  const env = load();
  assert.equal(env.L.MOVED_SCOPES[ROUTE], scopeOf(AGREEMENTS), 'one table says where the old scope went');
  env.show(AGREEMENTS, 'Agreements');
  const key = env.keyOf(env.second()), h1 = env.keyOf(env.page().querySelector('h1'));
  const legacy = { version: 2,
    routes: { [ROUTE]: { [key]: { desktop: { op: 80, pt: 8 } } }, '/about': { 'page:/h1:1': { desktop: { op: 60 } } } },
    groups: { [ROUTE]: { g1: { members: [h1, key], label: 'Pair' } } },
    labels: { [ROUTE]: { [key]: 'Old name' } },
    alts: { [ROUTE]: { [key]: 'Old alt' } } };
  const read = env.L.sanitize(legacy);
  assert.deepEqual(Object.keys(read.routes).sort(), ['/about', scopeOf(AGREEMENTS)], 'the old bucket is read as Agreements\', other routes untouched');
  assert.deepEqual(plain(read.routes[scopeOf(AGREEMENTS)][key]), { desktop: { op: 80, pt: 8 } }, 'the frame arrives whole');
  assert.equal(read.groups[scopeOf(AGREEMENTS)].g1.label, 'Pair', 'groups move with it');
  assert.equal(read.labels[scopeOf(AGREEMENTS)][key], 'Old name', 'layer names move with it');
  assert.equal(read.alts[scopeOf(AGREEMENTS)][key], 'Old alt', 'alt text moves with it');
  assert(!read.routes[ROUTE] && !read.groups[ROUTE] && !read.labels[ROUTE] && !read.alts[ROUTE], 'nothing is left under the bare route to land on every document');
  assert.deepEqual(plain(env.L.sanitize(read)), plain(read), 'reading it again changes nothing: the next Save writes it forward as it is');
  assert(/"\/reference\?doc=docs\/protocol\/agreements\.md"/.test(env.L.serialize(legacy)), 'and Save writes it under Agreements\' scope');

  env.L.apply(env.scene, env.L.scopeFor(ROUTE, env.scene), 1280, legacy);
  assert(env.applied(env.second()), 'an old edit lands on Agreements');
  assert.equal(env.second().style.opacity, '0.8');
  env.show(OVERVIEW, 'Overview');
  env.L.apply(env.scene, env.L.scopeFor(ROUTE, env.scene), 1280, legacy);
  assert(!env.applied(env.second()), 'and on no other document: not on the overview, the new default');
  env.show('docs/glossary.md', 'Glossary');
  env.L.apply(env.scene, env.L.scopeFor(ROUTE, env.scene), 1280, legacy);
  assert(!env.applied(env.second()), 'not on the glossary either');

  /* both scopes hold an entry for one key: nothing is lost, the newer one's fields win */
  const both = env.L.sanitize({ routes: { [ROUTE]: { [key]: { desktop: { op: 80, pt: 8 }, phone: { pb: 4 } } }, [scopeOf(AGREEMENTS)]: { [key]: { desktop: { op: 60 } } } },
    labels: { [ROUTE]: { [key]: 'Old name', other: 'Kept' }, [scopeOf(AGREEMENTS)]: { [key]: 'New name' } } });
  assert.deepEqual(plain(both.routes[scopeOf(AGREEMENTS)][key]), { desktop: { op: 60, pt: 8 }, phone: { pb: 4 } }, 'frames merge field by field, the newer scope\'s over the old');
  assert.deepEqual(plain(both.labels[scopeOf(AGREEMENTS)]), { [key]: 'New name', other: 'Kept' }, 'labels: the newer one wins, the rest are kept');

  /* the other per-element stores read the old scope the same way */
  const states = env.S.sanitize({ version: 1, routes: { [ROUTE]: { st1: { trigger: 'self', current: 0, states: [{ label: 'Default', members: [key] }] } } } });
  assert.deepEqual(Object.keys(states.routes), [scopeOf(AGREEMENTS)], 'a state group made on Agreements stays on Agreements');
  const motion = env.M.sanitize({ version: 1, routes: { [ROUTE]: { [key]: { direction: 'left' } } } });
  assert.deepEqual(Object.keys(motion.routes), [scopeOf(AGREEMENTS)], 'element motion too');
  assert.equal(motion.routes[scopeOf(AGREEMENTS)][key].direction, 'left');
  assert(/function moveScopes\(map\) \{ return typeof ArkLayout !== 'undefined' && ArkLayout && ArkLayout\.moveScopes/.test(fs.readFileSync('js/content/components.js', 'utf8')), 'components.js reads its routes and spots through the same table');
}

console.log('PASS: /reference edits are stored per document; an edit on one document never lands on another; the old shared /reference edits land on Agreements only.');

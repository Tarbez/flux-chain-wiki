'use strict';
/* The layout key function's rules (js/content/layout.js, "layout keys").

   Why this exists: every per-element edit the editor saves is stored under route -> layout key,
   and keys were paths from #scene frozen the first time anything annotated the element. Which
   path depended on what else was mounted then: /chain's page was section:1 on a direct load and
   section:2 arriving from Home (the outgoing page still in the outlet), and its content mixed
   div:2 (outlet) and div:7 (continuity host) keys within one load. Measured 2026-10-18 on every
   catalog route: every route changed keys between a direct load and arriving from Home; 875 of
   /'s 1547 keys changed arriving from /learnings. So a saved edit landed on another element, or
   on none, depending on the visitor's history. Each rule below is one way that happened; the
   multi-history sweep over the real site is tests/browser/layout-key-stability.mjs.
   Uses jsdom so the DOM (children, attributes, document order) is real. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const SHELL = '<div class="layers"><div class="persistent"></div><div class="outlet"></div>'
  + '<header><nav><a>Overview</a><a>Docs</a></nav></header><div class="fx"></div></div>';
/* a routed page as its module mounts it */
const PAGE_A = '<section data-ark-page="a"><h1>A</h1><div class="one"><p>x</p><p>y</p></div><div class="two"><p>z</p></div></section>';
const PAGE_B = '<section data-ark-page="b"><div class="cards"><div><p>first</p></div><div><p>second</p></div><div><p>third</p></div></div><div class="tail"><em>leaf</em></div></section>';

function load(body) {
  const dom = new JSDOM(`<!doctype html><body><div id="scene">${body}</div></body>`);
  const context = vm.createContext({ document: dom.window.document, ArkUI: { pageCatalog: { a: { path: '/a' }, b: { path: '/b' } } } });
  vm.runInContext(fs.readFileSync('js/content/layout.js', 'utf8'), context, { filename: 'js/content/layout.js' });
  const doc = dom.window.document;
  return { doc, L: context.ArkLayout, scene: doc.getElementById('scene'), $: (s) => doc.querySelector(s) };
}
/* key -> a description of the element that holds it, for one page's content */
function pageKeys(env, page) {
  env.L.annotate(env.scene);
  const root = env.$(`[data-ark-page="${page}"]`);
  const own = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join('').trim();
  return [root, ...root.querySelectorAll('[data-ark-layout-key]')].map((el) => el.getAttribute('data-ark-layout-key') + ' = ' + el.tagName + ':' + own(el));
}
const shellKey = (env, selector) => { env.L.annotate(env.scene); return env.$(selector).getAttribute('data-ark-layout-key'); };

{
  /* 1. a page's keys are a function of its own content: alone in the outlet (direct load),
        behind the page it replaces (still leaving), or inside the continuity host appended to
        the scene -- the three places the router puts it */
  const direct = load(SHELL), behind = load(SHELL), hosted = load(SHELL);
  direct.$('.outlet').innerHTML = PAGE_B;
  behind.$('.outlet').innerHTML = PAGE_A + PAGE_B;
  hosted.$('.layers').insertAdjacentHTML('beforeend', '<div class="continuity-host" data-ark-transient="hold">' + PAGE_B + '</div>');
  const want = pageKeys(direct, 'b');
  assert.equal(want[0], 'page:/ = SECTION:', 'the page root is page:/');
  assert(want.includes('page:/div:1/div:2/p:1 = P:second'), 'content keys are paths from the page root: ' + want.join(', '));
  assert.deepEqual(pageKeys(behind, 'b'), want, 'arriving behind another page renumbers nothing (it used to be section:2)');
  assert.deepEqual(pageKeys(hosted, 'b'), want, 'inside the continuity host renumbers nothing (it used to be div:7)');
}
{
  /* 2. the shell keeps the format it always had, and nothing the router appends shifts it */
  const env = load(SHELL), before = shellKey(env, 'header nav a:nth-child(2)');
  assert.equal(before, 'path:div:1/header:1/nav:1/a:2', 'shell keys are still paths from the root passed in');
  env.$('.layers').insertAdjacentHTML('afterbegin', '<div class="stage-scene" data-ark-transient="hold"><p>held</p></div>');
  env.$('.layers').insertAdjacentHTML('beforeend', '<div class="continuity-host" data-ark-transient="hold"><div class="continuity-origin"><p>card</p></div></div>');
  assert.equal(shellKey(env, 'header nav a:nth-child(2)'), before, 'a held node before or after it is not counted');
  assert.equal(shellKey(env, '.layers > div.fx'), 'path:div:1/div:3', 'nor among same-tag siblings');
  assert.equal(env.$('.continuity-origin p').getAttribute('data-ark-layout-key'), null, 'what a held node holds is no route\'s content: not keyed');
}
{
  /* 3. a node that becomes held loses the key it had (a Home card turned continuity host carried
        Home's key into /chain); a key is recomputed on every pass, never kept from an earlier one */
  const env = load(SHELL);
  env.$('.outlet').innerHTML = PAGE_A;
  env.L.annotate(env.scene);
  const card = env.$('.one');
  assert.equal(card.getAttribute('data-ark-layout-key'), 'page:/div:1');
  env.$('.layers').appendChild(card); card.setAttribute('data-ark-transient', 'hold');
  env.L.annotate(env.scene);
  assert.equal(card.getAttribute('data-ark-layout-key'), null, 'a held node is not keyed, and its old key is removed');
  const stale = env.$('.two'); stale.setAttribute('data-ark-layout-key', 'path:div:1/div:7/section:1/div:2');
  env.L.annotate(env.scene);
  assert.equal(stale.getAttribute('data-ark-layout-key'), 'page:/div:1', 'a stale key on the element is replaced by its real one');
}
{
  /* 4. what the editor inserts never renumbers authored content: spot and state anchors are not
        counted, have keys of their own, and so does an instance's content; a hidden original
        (the element a component instance replaces) still counts -- it is authored */
  const env = load(SHELL);
  env.$('.outlet').innerHTML = PAGE_B;
  const want = pageKeys(env, 'b');
  const first = env.$('.cards > div');
  first.setAttribute('data-ark-component-replaced', 'spot-1');
  first.insertAdjacentHTML('afterend', '<div data-ark-insert="spot-1" data-ark-spot=""><div data-ark-component-key="i1"><p>instance</p></div></div>');
  env.$('.cards > div:nth-child(4)').insertAdjacentHTML('afterend', '<div data-ark-insert="state-g-1" data-ark-state-anchor=""><div data-ark-component-key="i2"><p>state one</p></div></div>');
  const now = pageKeys(env, 'b');
  for (const row of want) assert(now.includes(row), 'still there after inserting: ' + row);
  assert.equal(env.$('[data-ark-spot]').getAttribute('data-ark-layout-key'), 'insert:spot-1');
  assert.equal(env.$('[data-ark-component-key="i1"]').getAttribute('data-ark-layout-key'), 'component:i1');
  assert.equal(env.$('[data-ark-component-key="i2"] p').getAttribute('data-ark-layout-key'), 'component:i2/p:1');
}
{
  /* 5. a layout group wrapper is transparent: its members keep the keys they were saved under */
  const env = load(SHELL);
  env.$('.outlet').innerHTML = PAGE_B;
  const want = pageKeys(env, 'b');
  const cards = env.$('.cards'), wrap = env.doc.createElement('div');
  wrap.setAttribute('data-ark-layout-group', 'g1');
  cards.insertBefore(wrap, cards.children[1]); wrap.appendChild(cards.children[2]); wrap.appendChild(cards.children[2]);
  const now = pageKeys(env, 'b');
  for (const row of want) assert(now.includes(row), 'grouping renumbers nothing: ' + row);
  assert.equal(wrap.getAttribute('data-ark-layout-key'), 'group:g1');
}
{
  /* 6. copy keys: the runtime's count, the editor-only text binding does not (the public page
        never has it, so every edit saved under it was lost there); a repeat is numbered, the
        shell first and then the page whatever their document order */
  const env = load(SHELL);
  env.$('.outlet').innerHTML = '<section data-ark-page="a"><p data-ark-copy-keys="nav.docs">Docs</p><p data-ark-copy-keys="a.x" data-ark-copy-preview="">x</p></section>';
  env.$('header nav a:nth-child(2)').setAttribute('data-ark-copy-keys', 'nav.docs');
  env.L.annotate(env.scene);
  assert.equal(env.$('header nav a:nth-child(2)').getAttribute('data-ark-layout-key'), 'copy:nav.docs', 'the shell\'s copy comes first, though the outlet precedes the header');
  assert.equal(env.$('[data-ark-page] p').getAttribute('data-ark-layout-key'), 'copy:nav.docs#2', 'a repeat in the page is numbered');
  assert.equal(env.$('[data-ark-copy-preview]').getAttribute('data-ark-layout-key'), 'page:/p:2', 'an editor-only copy binding is not a key');
  for (const el of env.scene.querySelectorAll('[data-ark-layout-key]')) assert.equal(env.L.keyFor(el, env.scene), el.getAttribute('data-ark-layout-key'), 'keyFor() agrees with annotate() for ' + el.tagName);
  /* a second mounted page numbers its repeats on its own */
  env.$('.outlet').insertAdjacentHTML('beforeend', '<section data-ark-page="b"><p data-ark-copy-keys="nav.docs">Docs</p></section>');
  env.L.annotate(env.scene);
  assert.equal(env.$('[data-ark-page="b"] p').getAttribute('data-ark-layout-key'), 'copy:nav.docs#2', 'not #3: the other page is not in this route\'s scope');
  assert.equal(env.$('[data-ark-page="b"]').getAttribute('data-ark-layout-key'), 'page:/', 'the page root is page:/ even with an id assigned later');
}
{
  /* 7. a route's key resolves in that route's page only: while /b arrives, /a is still mounted
        first in the outlet with keys of the same shape -- it took /b's edits */
  const env = load(SHELL);
  env.$('.outlet').innerHTML = PAGE_A + PAGE_B;
  const found = env.L.find(env.scene, 'page:/div:1', '/b');
  assert(found && found.closest('[data-ark-page="b"]'), 'find() answers from the route\'s own page');
  assert.equal(env.L.find(env.scene, 'path:div:1/header:1/nav:1/a:1', '/b').textContent, 'Overview', 'and from the shell');
  env.L.apply(env.scene, '/b', 1280, { routes: { '/b': { 'page:/div:1': { desktop: { z: 7 } } } } });
  assert.equal(env.$('[data-ark-page="b"] > div').style.zIndex, '7', 'apply() styles /b\'s element');
  assert.equal(env.$('[data-ark-page="a"] > div').style.zIndex, '', 'and never /a\'s');
  assert.equal(env.L.inRoute(env.$('[data-ark-page="a"] p'), '/b'), false);
  /* an element annotate() does not tag (an <em> the editor promoted into a group) still resolves */
  const em = env.$('[data-ark-page="b"] em');
  assert.equal(env.L.keyFor(em, env.scene), 'page:/div:2/em:1');
  assert.equal(env.L.find(env.scene, 'page:/div:2/em:1', '/b'), em);
}
console.log('layout keys: scoped to the page, recomputed every pass, blind to what the runtime and editor insert');

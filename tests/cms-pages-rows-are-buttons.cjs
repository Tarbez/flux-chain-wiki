'use strict';
/* Regression: the canvas's Pages tab listed every route as a bare <li> with a click handler --
   no role, no tabindex -- so a keyboard user could not open a page from it at all, and the
   full-audit sweep (tests/browser/full-audit.mjs, which looks for buttons) found nothing there
   to press.
   Since 2026-10-18 the Pages tab is the one site tree (Content mode's page list and the canvas's
   Pages tab merged): each row's main control is a real <button> (Tab reaches it, Enter and Space
   press it) that opens the page on the canvas, and its Fields / Delete actions are buttons of
   their own beside it -- never a control nested inside another control.
   Runs the real renderPages() from js/admin/rail.js against jsdom. */
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const admin = require('./lib/admin-source.cjs').ADMIN;
function slice(from, to) {
  const start = admin.indexOf(from), end = admin.indexOf(to, start);
  assert(start >= 0 && end > start, 'the editor still has ' + from.trim());
  return admin.slice(start, end);
}
const code = slice('  function h(tag, props) {', '  function clone(') + slice('  const GROUP_NAMES = {', '  /* an edit anywhere changes a dirty dot');
const { window } = new JSDOM('<!doctype html><div id="pagesPane"><ul id="pages"></ul></div>');
const calls = [];
const state = {
  ids: ['nav', 'home', 'about', 'networks'], kind: 'page', current: 'home', cmsCurrentRoute: '/',
  drafts: { nav: { title: 'Site chrome', route: '/', group: 'site' }, home: { title: 'Home', route: '/', group: 'page' },
    about: { title: 'About', route: '/about', group: 'page' }, networks: { title: 'Networks', route: '/concept/networks', group: 'theory' } },
  slugs: ['first-steps'], aDrafts: { 'first-steps': { title: 'First steps' } }, aCurrent: null,
  cmsRoutes: [{ path: '/' }, { path: '/about' }, { path: '/concept/networks' }, { path: '/learnings/first-steps' }, { path: '/download', title: 'Download' }],
};
const context = { document: window.document, window: { ArkManifest: { groups: ['site', 'page', 'theory'] } }, CSS: { escape: (s) => s }, Map, Set,
  $: (id) => window.document.getElementById(id), ic: () => '', realLinkIndex: () => [], state,
  dirty: (id) => id === 'about', dirtyA: () => false, hasShape: () => false, closeDrawer: () => {},
  openRoute: (p) => calls.push(['route', p]), select: (id) => calls.push(['page', id]), selectArticle: (slug) => calls.push(['article', slug]),
  openPageFields: (o) => calls.push(['fields', o.kind, o.id]), deleteItem: (kind, id) => calls.push(['delete', kind, id]) };
vm.createContext(context);
vm.runInContext(code + '\nrenderPages();', context);

/* "More pages" (routes with no fields) starts folded; its head says how many it holds and unfolds it */
const moreHead = window.document.querySelector('#pages li.side-group > .layer-toggle[data-group="other"]');
assert(moreHead && moreHead.getAttribute('aria-expanded') === 'false' && /\(1\)/.test(moreHead.getAttribute('aria-label')), 'More pages starts folded, with its count, on the rail\'s own expand control');
assert.equal(window.document.querySelectorAll('#pages li.tree-row').length, 5, 'a folded group draws no rows');
moreHead.click();
const rows = [...window.document.querySelectorAll('#pages li.tree-row')];
assert.equal(rows.length, 6, 'every page, the site chrome, the article and the route with no manifest each get a row');
for (const li of rows) {
  const open = li.querySelector('button.tree-open');
  assert(open, 'each row opens its page with a real <button>');
  assert(!open.querySelector('button'), 'no control nested inside the open button');
}
/* grouped the way a person looks for a page, in plain names (docs/ux-audit/cms.md P1-2) */
const heads = [...window.document.querySelectorAll('#pages li.side-group > span')].map((el) => el.textContent);
assert.deepEqual(heads, ['Main pages', 'Guides', 'Articles', 'Header & footer', 'More pages'], 'the tree is grouped like the site, in plain names');
assert.equal(rows.find((li) => li.querySelector('.tree-open').dataset.path === '/download').querySelector('.nm').textContent, 'Download', 'a route with no fields is named, not a slug');

const byPath = (p) => rows.find((li) => li.querySelector('.tree-open').dataset.path === p && (p !== '/' || li.querySelector('.nm').textContent === 'Home'));
byPath('/about').querySelector('.tree-open').click();
byPath('/download').querySelector('.tree-open').click();
byPath('/learnings/first-steps').querySelector('.tree-open').click();
assert.deepEqual(calls.splice(0), [['page', 'about'], ['route', '/download'], ['article', 'first-steps']], 'a row opens its page: a page or article as the item a form edits, any other route on the canvas');

byPath('/about').querySelector('[aria-label="Fields of About"]').click();
assert.deepEqual(calls.splice(0), [['page', 'about'], ['fields', 'page', 'about']], 'Fields shows the page and opens its every field');
assert(!byPath('/download').querySelector('[aria-label^="Fields"]'), 'a route with no manifest offers no Fields: there is nothing to edit');
assert(!byPath('/about').querySelector('[aria-label^="Delete"]'), 'a main page cannot be deleted from the tree');
byPath('/concept/networks').querySelector('[aria-label="Delete Networks"]').click();
assert.deepEqual(calls.splice(0), [['delete', 'page', 'networks']], 'a theory page is deleted through the one delete path');
assert(byPath('/about').querySelector('.dot'), 'an unsaved page carries its dot');
assert.equal(byPath('/').getAttribute('aria-selected'), 'true', 'the page on the canvas is the selected row');
/* "Not linked" (ledger recheck 2026-10-21, pages.md P7c / cms.md P2-6): the site menu links every catalog page
   with a journey (js/resolvers/header.js), so only a page in no journey and no link field is marked; the marks
   on screen are explained once, under the list. Here no link field points anywhere (realLinkIndex is empty). */
const legend = window.document.querySelector('#pages li.tree-legend');
assert(legend && /Unsaved changes/.test(legend.textContent) && /Not linked: no menu entry and no page links here/.test(legend.textContent), 'the legend says what the dot and the not-linked mark mean');
assert(byPath('/download').querySelector('.tag.orphan'), 'with no menu and no link, a page is marked not linked');
{
  context.window.ArkUI = { pageCatalog: { about: { path: '/about', journey: 'understand' }, download: { path: '/download', journey: null, hiddenFromNavigation: true } } };
  vm.runInContext('renderPages();', context);
  const again = (p) => [...window.document.querySelectorAll('#pages li.tree-row')].find((li) => li.querySelector('.tree-open').dataset.path === p);
  assert(!again('/about').querySelector('.tag.orphan'), 'a page the site menu lists is not marked, though no link field points to it');
  assert(again('/download').querySelector('.tag.orphan'), 'a page in no journey (no menu entry) and no link field is still marked');
  assert.equal(again('/download').querySelector('.tag.orphan').getAttribute('aria-label'), 'Not linked: no menu entry and no page links here');
}
console.log('PASS: the Pages tree rows are keyboard-operable buttons that open, edit and delete pages; "not linked" counts the site menu and is explained.');

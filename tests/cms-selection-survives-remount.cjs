'use strict';
/* A preview selection survives a remount, and Studio is told what is selected afterwards.

   Why this exists: the editor preview (js/main.js) answers every 'defxn-cms-preview-state'
   -- sent on each frame load and each Studio re-render -- by REMOUNTING the whole route,
   about one second after the page is already annotated and clickable (measured 850-1060 ms
   on /download and /chain, M-series Mac, headless Chromium, 2026-10-18). A click in that
   window selected an element the remount then destroyed: the outline vanished, and Studio's
   toolbar (js/admin/admin.js) went on showing the destroyed selection. Clicking Detach there
   detached the instance in the draft, but the toolbar never heard of a new selection, so it
   kept offering "Detach" on the old master -- studio-flows `makecomp` failed "the toolbar does
   not say detached", and to a person Detach looked like it did nothing.

   The fix re-finds each selected element after the rebuild (cmsSelectionRefs ->
   cmsRestoreSelection: an instance root by its instance key, else the element itself while
   still in the page, else its layout key) and the ready message carries the selection as it
   is NOW, which Studio adopts. Uses jsdom so connectedness and attribute reads are real. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const main = fs.readFileSync('js/main.js', 'utf8');
const admin = require('./lib/admin-source.cjs').ADMIN;
function slice(src, from, to) {
  const a = src.indexOf(from), b = src.indexOf(to, a);
  assert(a >= 0 && b > a, `js/main.js still has ${from.trim()} followed by ${to.trim()}`);
  return src.slice(a, b);
}
const helpers = slice(main, '  function cmsComponentRoot(key) {', '  /* A new state\'s starter content')
  + slice(main, '  function cmsElementForKey(key) {', '  /* The hide toggle');

const PAGE = '<section><h1 data-ark-layout-key="k-title">Title</h1><p data-ark-layout-key="k-body">Body</p>'
  + '<div data-ark-component-key="i1" data-ark-component-master="m-old"><h2>Card</h2></div></section>';
const dom = new JSDOM(`<!doctype html><div id="host">${PAGE}</div>`);
const { window } = dom;
const host = window.document.getElementById('host');
const context = vm.createContext({ window, host, cmsPreviewSelections: [], cmsPreviewSelected: null, cmsRoutePath: () => '/' });
/* annotate()/find() are ArkLayout's; here the keys are already in the markup, so they only list
   and look them up */
window.ArkLayout = {
  annotate: (root) => Array.from(root.querySelectorAll('[data-ark-layout-key]')),
  find: (root, key) => Array.from(root.querySelectorAll('[data-ark-layout-key]')).find((el) => el.getAttribute('data-ark-layout-key') === key) || null,
};
context.ArkLayout = window.ArkLayout;
vm.runInContext(helpers, context);
const run = (code) => vm.runInContext(code, context);

function select(...elements) { context.cmsPreviewSelections = elements; context.cmsPreviewSelected = elements[elements.length - 1]; }
function remount(markup) { host.innerHTML = markup; }

{
  /* the reported case: an instance root selected, then the route remounts and the instance
     comes back as a new node -- with a new master after Detach */
  select(host.querySelector('[data-ark-component-key="i1"]'));
  remount(PAGE.replace('m-old', 'm-detached'));
  assert.equal(run('cmsRestoreSelection(cmsSelectionRefs())'), true, 'there was a selection to restore');
  const now = run('cmsPreviewSelected');
  assert(now && now.isConnected, 'the instance root is selected again after the remount, not a removed node');
  assert.equal(now.getAttribute('data-ark-component-master'), 'm-detached', 'the selection is the REBUILT instance, so its info names the new master');
}
{
  /* plain page content: found again by its layout key, multi-selection order kept */
  select(host.querySelector('[data-ark-layout-key="k-title"]'), host.querySelector('[data-ark-layout-key="k-body"]'));
  remount(PAGE);
  run('cmsRestoreSelection(cmsSelectionRefs())');
  assert.deepEqual(run('cmsPreviewSelections').map((el) => el.getAttribute('data-ark-layout-key')), ['k-title', 'k-body']);
  assert(run('cmsPreviewSelections').every((el) => el.isConnected), 'every restored element is in the page');
}
{
  /* something the remount removed drops out -- it never lingers as a destroyed selection */
  select(host.querySelector('[data-ark-layout-key="k-title"]'), host.querySelector('[data-ark-layout-key="k-body"]'));
  remount(PAGE.replace('<p data-ark-layout-key="k-body">Body</p>', ''));
  run('cmsRestoreSelection(cmsSelectionRefs())');
  assert.deepEqual(run('cmsPreviewSelections').map((el) => el.getAttribute('data-ark-layout-key')), ['k-title']);
  select(host.querySelector('[data-ark-layout-key="k-title"]'));
  remount('<section></section>');
  assert.equal(run('cmsRestoreSelection(cmsSelectionRefs())'), true, 'a selection existed, so Studio must hear that it is now empty');
  assert.equal(run('cmsPreviewSelected'), null, 'nothing left to select: the selection is empty, not the removed node');
}
{
  /* a layout key is a path, and a remount can renumber paths: what the old key now finds is a
     different element -- it is not selected in the old one's place */
  select(host.querySelector('[data-ark-layout-key="k-body"]'));
  remount(PAGE.replace('<p data-ark-layout-key="k-body">Body</p>', '<h3 data-ark-layout-key="k-body">Another block</h3>'));
  run('cmsRestoreSelection(cmsSelectionRefs())');
  assert.equal(run('cmsPreviewSelected'), null, 'a different element at the old key is not taken for the selection');
}
{
  /* no selection: nothing to report, so the ready message does not overwrite Studio's (empty) one */
  select();
  assert.equal(run('cmsRestoreSelection(cmsSelectionRefs())'), false);
}

/* wiring: the remount path restores before it reports, the report carries the selection, and
   Studio adopts it -- the end-to-end case is tests/browser/studio-flows.mjs `makecomp` */
const refresh = slice(main, "if (window.ArkStates) ArkStates.renderAll(host, cmsRoutePath(), cmsStatesView(cmsRoutePath()), cmsComponentsDraft);", '}).catch(');
assert(/keptRefs = cmsSelectionRefs\(\), reselected = cmsRestoreSelection\(keptRefs\)/.test(refresh), 'the preview-state remount re-finds the selection');
assert(refresh.indexOf('cmsRestoreSelection') < refresh.indexOf("type: 'defxn-cms-preview-ready'"), 'it is restored before the ready report is built (points depend on it)');
assert(/ready\.selections = cmsSelectionPayload\(\)/.test(refresh), 'the ready report carries the selection as it is after the remount');
const onReady = slice(admin, "if (event.data.type === 'defxn-cms-preview-ready') {", 'renderInspector();');
assert(/Array\.isArray\(event\.data\.selections\)[\s\S]*cmsExactSelection = event\.data\.selection \|\| null/.test(onReady), 'Studio replaces its selection with the one the ready report carries');
/* the restored element used to come back under a NEW path key (the remount renumbered the
   route's containers: path:div:1/div:2/... -> div:7, measured on /chain; keys are page-scoped
   now, tests/layout-keys.cjs), and a draft the remount applied can still move it, so comparing
   keys closed an open toolbar section under the cursor; the report says it is the same selection */
assert(/ready\.sameSelection = cmsPreviewSelections\.length === keptRefs\.length/.test(refresh), 'the ready report says whether every selected element was found again');
assert(/event\.data\.sameSelection[^\n]*tbOpenKey = event\.data\.selection\.key/.test(onReady), 'Studio keeps an open toolbar section open on the same selection under its new key');
console.log('PASS: a selection survives the preview remount (instance root by key, content by layout key, removed ones drop out) and Studio adopts it from the ready report.');

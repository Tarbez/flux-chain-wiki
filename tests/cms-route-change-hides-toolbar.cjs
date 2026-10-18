'use strict';
/* Opening another page in the editor takes the old selection's toolbar down at once.

   Why this exists: syncCmsPreview() (js/admin/admin.js) cleared the selection when the canvas
   moved to another route, but the contextual toolbar (#selToolbar) and its popover were only
   re-rendered when the new page reported ready -- measured 850-1060 ms later on /download and
   / (headless Chromium, 2026-10-18). For that second the old bar stayed drawn, and clickable,
   over the page being opened. studio-flows `points` clicked the home page's Overview link right
   after opening "/", and about one run in four the click landed on the stale bar's "Theme &
   defaults" action instead: the editor left Design mode and every later step failed with
   "element is not visible". It surfaced when the header's links moved (the row now fits by
   collapsing Stats) and Overview slid under where the /download bar had been. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const src = require('./lib/admin-source.cjs').ADMIN;
const start = src.indexOf('  function syncCmsPreview(force) {');
const end = src.indexOf("  cmsPreview.addEventListener('load'", start);
assert(start >= 0 && end > start, 'js/admin/admin.js still defines syncCmsPreview before the preview load listener');

function run(route, previous) {
  const nodes = { selToolbar: { hidden: false }, selToolbarPop: { hidden: false } };
  const context = vm.createContext({
    $: (id) => nodes[id] || null,
    /* the preview connection and selection are shared state (js/admin/state.js) */
    state: { cmsConnected: true, cmsCurrentRoute: route, cmsPreviewRoute: previous, cmsPreviewReady: true,
      cmsExactSelection: { key: 'id:download-title' }, cmsExactSelections: [{ key: 'id:download-title' }] },
    cmsPreview: { src: '', getAttribute: () => 'index.html?cms-preview=1#' + previous },
  });
  vm.runInContext(src.slice(start, end) + '\nsyncCmsPreview(false);', context);
  return { nodes, selection: context.state.cmsExactSelection, src: context.cmsPreview.src };
}

{
  const moved = run('/', '/download');
  assert.equal(moved.selection, null, 'the old page\'s selection is cleared');
  assert.equal(moved.nodes.selToolbar.hidden, true, 'the old selection\'s toolbar is hidden at once, not at the new page\'s ready');
  assert.equal(moved.nodes.selToolbarPop.hidden, true, 'and so is its open popover');
  assert(/#\/$/.test(moved.src), 'the preview is sent to the new route');
}
{
  const stayed = run('/download', '/download');
  assert.equal(stayed.nodes.selToolbar.hidden, false, 'no route change: the toolbar is left alone');
  assert.deepEqual(stayed.selection, { key: 'id:download-title' }, 'no route change: the selection is kept');
}
console.log('PASS: moving the canvas to another page hides the old selection\'s toolbar and popover at once.');

'use strict';
/* Regression: the owner's original report -- "make into states does not work at all, I
   clicked it but nothing happened". Found by a real click-through in Chromium
   (tests/browser/studio-flows.mjs), never visible to a code read: the preview's right-click
   menu (.ark-studio-menu, js/main.js) lives INSIDE the preview iframe, while the editor's
   contextual toolbar (#selToolbar, js/admin/admin.js) is drawn in the PARENT document on top
   of that whole iframe, right beside the selection -- exactly where the menu opens. The
   toolbar covered the menu, so "Make into states" (and Group, Remove, Align...) showed under
   the cursor and the click landed on a toolbar <summary> instead. Measured: with one nav
   link selected, document.elementFromPoint() at the "Make into states" item was a SUMMARY
   inside #selToolbar, and no state group was ever created.
   Fix: every open/close of the menu goes through setCmsContextMenuOpen(), which tells the
   editor; the editor hides the toolbar while the menu is open, and a click in the editor
   closes the menu. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const main = fs.readFileSync('js/main.js', 'utf8');
const admin = fs.readFileSync('js/admin/admin.js', 'utf8');

function extract(src, from, to, what) {
  const start = src.indexOf(from), end = src.indexOf(to, start + 1);
  assert(start >= 0 && end > start, what + ' is still where this test expects it');
  return src.slice(start, end);
}

/* the preview side: open/close posts the state up, and an item click closes before acting */
{
  const code = extract(main, '  function setCmsContextMenuOpen(open) {', '  /* Reusable component edits', 'setCmsContextMenuOpen + showCmsContextMenu');
  const dom = new JSDOM('<body></body>');
  const posted = [], ran = [];
  const context = {
    document: dom.window.document, location: { origin: 'http://x' },
    window: { innerWidth: 1280, innerHeight: 900, parent: { postMessage: (m) => posted.push(JSON.parse(JSON.stringify(m))) } },
    cmsContextMenu: null, cmsContextTarget: null,
    ensureCmsLayoutUi() { if (!context.cmsContextMenu) { context.cmsContextMenu = dom.window.document.createElement('div'); context.cmsContextMenu.hidden = true; dom.window.document.body.appendChild(context.cmsContextMenu); } },
    cmsIllustrationParts: () => [], placeCmsLayoutUi() {}, emitCmsLayoutSelection() {},
    cmsGroupSelection() {}, cmsUngroupSelection() {}, cmsMakeStates: () => ran.push('make-states'), cmsRemoveSelection() {}, cmsAlign() {}, cmsDistribute() {},
    cmsComponentRefusal: () => '', cmsMakeComponent() {},
  };
  const el = dom.window.document.createElement('a');
  context.cmsPreviewSelected = el; context.cmsPreviewSelections = [el]; context.cmsSelectionList = () => [el];
  vm.createContext(context);
  vm.runInContext(code + '\nthis.showCmsContextMenu = showCmsContextMenu; this.setCmsContextMenuOpen = setCmsContextMenuOpen;', context);
  // context.window is not the vm global, so `window.parent !== window` holds, as inside the real iframe
  context.showCmsContextMenu({ clientX: 10, clientY: 10, preventDefault() {}, stopPropagation() {} });
  assert.deepEqual(posted.pop(), { type: 'defxn-cms-preview-context-menu', open: true }, 'opening the menu tells the editor, so it can get its toolbar out of the way');
  const item = [...context.cmsContextMenu.querySelectorAll('button')].find((b) => b.textContent.startsWith('Make into states'));
  item.click();
  assert.deepEqual(posted.shift(), { type: 'defxn-cms-preview-context-menu', open: false }, 'clicking an item closes the menu and tells the editor before the action runs');
  assert.deepEqual(ran, ['make-states'], 'the item ran its action');
  assert(context.cmsContextMenu.hidden, 'the menu is hidden after an item click');
  context.setCmsContextMenuOpen(false);
  assert.equal(posted.length, 0, 'closing an already closed menu does not chatter');
  console.log('PASS: the preview tells the editor whenever its right-click menu opens and closes.');
}

/* every place that opens or closes the menu goes through that one function */
{
  const assignments = main.match(/cmsContextMenu\.hidden\s*=(?!=)/g) || [];
  assert.equal(assignments.length, 2, 'only the menu\'s creation and setCmsContextMenuOpen itself assign cmsContextMenu.hidden -- a direct assignment elsewhere would hide the menu without telling the editor, leaving its toolbar hidden (or covering the menu) again');
  assert(main.includes("data.type === 'defxn-cms-preview-close-menu'"), 'the preview closes its menu when the editor is clicked instead');
  console.log('PASS: no code path opens or closes the menu behind the editor\'s back.');
}

/* the editor side: the toolbar is not shown while the menu is open */
{
  const code = extract(admin, '  let cmsContextMenuOpen = false;', '  function placeSelToolbar() {', 'cmsContextMenuOpen + selToolbarVisible');
  const context = { live: false, view: 'design', cmsExactSelection: { key: 'k' } };
  vm.createContext(context);
  vm.runInContext(code + '\nthis.selToolbarVisible = selToolbarVisible; this.setOpen = (v) => { cmsContextMenuOpen = v; };', context);
  assert.equal(context.selToolbarVisible(), true, 'a selection shows the toolbar');
  context.setOpen(true);
  assert.equal(context.selToolbarVisible(), false, 'while the preview\'s menu is open the toolbar is not drawn over it');
  assert(/'defxn-cms-preview-context-menu'\) \{ cmsContextMenuOpen = !!event\.data\.open; renderSelToolbar\(\); \}/.test(admin), 'the editor tracks the menu state from the preview and repaints the toolbar');
  assert(/cmsContextMenuOpen && cmsPreview\.contentWindow\) cmsPreview\.contentWindow\.postMessage\(\{ type: 'defxn-cms-preview-close-menu' \}/.test(admin), 'a click in the editor closes the preview\'s menu, so the toolbar comes back');
  console.log('PASS: the editor hides its toolbar for exactly as long as the preview\'s menu is open.');
}

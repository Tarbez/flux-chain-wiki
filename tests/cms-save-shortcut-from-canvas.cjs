'use strict';
/* Regression: Ctrl/Cmd+S did nothing after editing on the canvas -- the normal case. Any
   click on the canvas moves keyboard focus into the preview iframe's own document, and only
   the EDITOR document (js/admin/admin.js) listened for the shortcut; key events never cross
   a frame boundary. Verified both ways in Chromium (tests/browser/studio-flows.mjs, "Save
   (Ctrl+S)" step): with the forward removed, states-data.js was never written; with it,
   saved. The preview (js/main.js) now forwards the shortcut to the editor, which runs the
   same gate and the same one save action (saveEverything) as its own listener. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const main = fs.readFileSync('js/main.js', 'utf8');
const admin = require('./lib/admin-source.cjs').ADMIN;
const start = main.indexOf('  function cmsForwardSaveShortcut(event) {');
const end = main.indexOf("  document.addEventListener('keydown'", start);
assert(start >= 0 && end > start, 'js/main.js defines cmsForwardSaveShortcut right before its keydown listener');
assert(/document\.addEventListener\('keydown', function \(event\) \{\n    if \(!cmsPreviewQuery \|\| cmsForwardSaveShortcut\(event\)\) return;/.test(main), 'the preview\'s keydown listener tries the save forward first, in edit AND live mode');

function run(inFrame) {
  const posted = [];
  const context = { location: { origin: 'http://x' } };
  context.window = inFrame ? { parent: { postMessage: (m) => posted.push(m) } } : null;
  vm.createContext(context);
  if (!inFrame) vm.runInContext('window = this; window.parent = this;', context);
  vm.runInContext(main.slice(start, end) + '\nthis.forward = cmsForwardSaveShortcut;', context);
  const key = (init) => { const e = Object.assign({ key: 's', ctrlKey: false, metaKey: false, prevented: false, preventDefault() { this.prevented = true; } }, init); return { handled: context.forward(e), prevented: e.prevented }; };
  return { posted, key };
}

{
  const t = run(true);
  assert.deepEqual(t.key({ ctrlKey: true }), { handled: true, prevented: true }, 'Ctrl+S inside the canvas is taken (and the browser\'s own Save Page suppressed)');
  assert.deepEqual(t.key({ metaKey: true, key: 'S' }), { handled: true, prevented: true }, 'Cmd+S with a capital S (Caps Lock or Shift) too');
  assert.deepEqual(t.posted.map((m) => m.type), ['defxn-cms-preview-save', 'defxn-cms-preview-save'], 'each is forwarded to the editor');
  assert.deepEqual(t.key({ key: 's' }), { handled: false, prevented: false }, 'a plain "s" is typing, not a shortcut');
  assert.deepEqual(t.key({ ctrlKey: true, key: 'z' }), { handled: false, prevented: false }, 'other shortcuts are left alone');
  console.log('PASS: Ctrl/Cmd+S pressed inside the canvas is forwarded to the editor.');
}
{
  const t = run(false);
  assert.deepEqual(t.key({ ctrlKey: true }), { handled: false, prevented: false }, 'the public page (not in a frame) leaves the browser\'s own Ctrl+S alone');
  console.log('PASS: outside the editor the shortcut is untouched.');
}
assert(/'defxn-cms-preview-save'\) \{ if \(anyDirty\(\)\) saveEverything\(\); \}/.test(admin), 'the editor answers the forward with the same anyDirty() gate and the same saveEverything() as its own Ctrl/Cmd+S listener');
console.log('PASS: the editor saves everything on a forwarded shortcut.');

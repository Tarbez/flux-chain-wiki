'use strict';
/* Regression: Save, Revert, Undo, Redo and a theme colour's Default were greyed out with no
   explanation -- a disabled button that does not say why reads as a broken one (law: a
   refusal names what it needs). Found by tests/browser/full-audit.mjs's sweep, which clicks
   every visible control and lists each disabled one that states no reason. Each now goes
   through refuse(button, reason): disabled exactly when there is a reason, and the reason is
   its tooltip; enabling restores the button's own tooltip ("Undo (Ctrl+Z)").
   Runs the real refuse() from js/admin/admin.js, and checks no site sets those buttons'
   disabled state around it. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const admin = fs.readFileSync('js/admin/admin.js', 'utf8');
const start = admin.indexOf('  var NOTHING_TO_SAVE =');
const end = admin.indexOf('\n  }\n', admin.indexOf('function refuse(', start)) + 4;
assert(start >= 0 && end > start, 'js/admin/admin.js defines NOTHING_TO_SAVE and refuse()');
const context = {};
vm.createContext(context);
vm.runInContext(admin.slice(start, end) + '\nthis.refuse = refuse; this.NOTHING_TO_SAVE = NOTHING_TO_SAVE;', context);

const undo = { title: 'Undo (Ctrl+Z)', dataset: {}, disabled: false };
context.refuse(undo, 'Nothing to undo: no layout or style edit on the canvas yet.');
assert.equal(undo.disabled, true);
assert.match(undo.title, /^Nothing to undo/, 'a disabled control names why');
context.refuse(undo, '');
assert.equal(undo.disabled, false);
assert.equal(undo.title, 'Undo (Ctrl+Z)', 'enabling restores the control\'s own tooltip');
assert.match(context.NOTHING_TO_SAVE, /^Nothing to save: /);

const code = admin.replace(/\/\*[\s\S]*?\*\//g, '');
for (const site of [/\bsave\.disabled\s*=/, /\brevert\.disabled\s*=/, /\bresetOne\.disabled\s*=/, /\$\('btnUndo'\)\.disabled\s*=/, /\$\('btnRedo'\)\.disabled\s*=/]) {
  assert(!site.test(code), `${site} is set directly again, without a stated reason -- use refuse()`);
}
for (const call of ["refuse(save, anyDirty() ? '' : NOTHING_TO_SAVE)", "refuse(revert,", "refuse($('btnUndo'),", "refuse($('btnRedo'),", 'refuse(resetOne,']) assert(admin.includes(call), 'still refused with a reason: ' + call);
console.log('PASS: Save, Revert, Undo, Redo and Default say why when they are disabled.');

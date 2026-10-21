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

const admin = require('./lib/admin-source.cjs').ADMIN;
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
/* Save is ONE header button (#save) since the one-header merge (2026-10-18); every editor
   that used to refuse its own Save now calls refreshSaveButton(), which refuses that one. */
for (const call of ["refuse($('save'), anyDirty() ? '' : NOTHING_TO_SAVE)", "refuse(revert,", "refuse($('btnUndo'),", "refuse($('btnRedo'),", 'refuse(resetOne,']) assert(admin.includes(call), 'still refused with a reason: ' + call);

/* The audit's second pass found four more greyed out with no reason: a component instance's
   "Reset overrides" (no override yet), the States section's "+ Add state" (at the 20-state cap)
   and "Use this element as trigger" (no selection, or already the trigger), and Publish (no
   miner reachable, opened from disk, or a publish in flight). Their neighbours went the same
   way: a state's "Showing" button, "Use state-zero selection as trigger", a detached
   instance's "Edit definition"/"Detach" and the Mesh panel's Refresh. Each reason names what
   would enable the control, and the 20 is ArkStates.MAX_STATES, not a second copy of the cap. */
for (const [name, site] of [['Reset overrides', /\bresetAll\.disabled\s*=/], ['+ Add state', /\baddState\.disabled\s*=/], ['Use this element as trigger', /\buseThis\.disabled\s*=/],
  ['Use state-zero selection as trigger', /\buseSelf\.disabled\s*=/], ['Showing', /\bpreview\.disabled\s*=/], ['Edit definition', /\beditDef\.disabled\s*=/], ['Detach', /\bdetach\.disabled\s*=/],
  ['Publish', /\$\('publish'\)\.disabled\s*=|\bbutton\.disabled\s*=\s*(true|false); publishing/]]) {
  assert(!site.test(code), `${name}'s disabled state is set directly again, without a stated reason -- use refuse()`);
}
/* each reason, evaluated where it can be: it says what is wrong AND what to do */
const reasons = {
  resetAll: /refuse\(resetAll, Object\.keys\(overrides\)\.length \? '' : '(Nothing to reset: [^']*?\\'[^']*)'\)/,
  addState: /refuse\(addState, group\.states\.length >= ArkStates\.MAX_STATES \? `([^`]+)` : ''\)/,
  useThis: /refuse\(useThis, !state\.cmsExactSelection\.key \? '([^']+)' : group\.trigger === state\.cmsExactSelection\.key \? '([^']+)' : ''\)/,
  publishHost: /var PUBLISH_NEEDS_HOST = '([^']+)';/,
  publishing: /var PUBLISHING_NOW = '([^']+)';/,
};
for (const [what, re] of Object.entries(reasons)) {
  const m = re.exec(admin);
  assert(m, `${what} is refused with a stated reason (${re})`);
  for (const text of m.slice(1).filter(Boolean)) {
    assert(/: /.test(text) && text.length > 30, `${what}'s reason states the failure and the remedy, not a bare status: "${text}"`);
  }
}
assert(/refuse\(\$\('publish'\), publishing \? PUBLISHING_NOW : info\.reachable \? '' : 'Cannot publish: the miner is not reachable \(' \+ \(info\.detail/.test(admin), 'Publish names the unreachable miner\'s own detail and what to do');
/* Publish stays CLICKABLE while refused (P0-4, docs/ux-audit/cms.md): every refusal of it passes
   explainPublish, so a click opens the reason and its remedy instead of doing nothing */
for (const call of admin.matchAll(/refuse\(\$\('publish'\),[^;]*;/g)) assert(/, explainPublish\);$/.test(call[0]), 'Publish is refused without its click-to-explain: ' + call[0]);
/* (the account menu's own Refresh went with its duplicate "Publishing service" block, 2026-10-21; the sheet's
   Check again is the one) */
assert(/refuse\(\$\('publish'\), PUBLISH_NEEDS_HOST, explainPublish\)/.test(admin), 'a copy opened from disk says how to reach a miner on Publish');
/* the cap is read, and the reason a person sees names the real number */
const states = vm.createContext({});
vm.runInContext(fs.readFileSync('js/content/states.js', 'utf8') + ';this.S = ArkStates;', states);
assert.equal(states.S.MAX_STATES, 20, 'ArkStates.MAX_STATES is the cap sanitize() enforces');
const addStateText = new Function('ArkStates', 'return `' + reasons.addState.exec(admin)[1] + '`;')(states.S);
assert.match(addStateText, /at most 20 states\. Remove one above to add another\./);
/* the real refuse() on a real-shaped button: the Publish tooltip comes back when it is enabled again */
const publish = { title: 'Publish every page and article to the mesh', dataset: {}, disabled: false };
context.refuse(publish, reasons.publishing.exec(admin)[1]);
assert.equal(publish.disabled, true); assert.match(publish.title, /^Publishing now: /);
context.refuse(publish, '');
assert.equal(publish.title, 'Publish every page and article to the mesh');
console.log('PASS: Save, Revert, Undo, Redo, Default, Reset overrides, + Add state, the trigger buttons, Publish and Refresh say why when they are disabled.');

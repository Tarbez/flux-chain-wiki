'use strict';
/* Regression: docs/ux-audit/cms.md P1-8 (ledger PARTIAL until 2026-10-20). The selection toolbar's
   More listed every canvas command, and with one layer selected that meant "Group" as a greyed-out
   row (and "Space evenly across / down" with two): a row that cannot be used, shouting a reason,
   on a list of things that can. The audit's fix: hide commands that cannot apply instead of
   listing them disabled -- but a refusal must still name what it needs (AGENTS.md; the earlier
   defect was Distribute greyed out with NO reason, tests/cms-make-states-single.cjs).
   Held here, with the real toolbar shell (js/admin/toolbar.js) in jsdom:
     - (2026-10-20: js/main.js now sends `waits` with each command; the toolbar no longer reads the
       refusal's words)
     - a command waiting for a bigger selection is not a button in More; its reason is ONE quiet line
       under the list, naming every command it holds back;
     - a command refused for what THIS selection is (Make into component on an inserted block) stays
       a row, marked unavailable, with its reason under it (tests/browser/toolbar-popovers.mjs
       "instance" holds the same in a real browser);
     - an enabled command is a plain row; with nothing waiting there is no extra line. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const admin = require('./lib/admin-source.cjs').ADMIN;
const start = admin.indexOf('  const TB_IDENTITY = {'), end = admin.indexOf('  A.provide({ placeToolbarPop', start);
assert(start >= 0 && end > start, 'js/admin/toolbar.js still declares the toolbar shell');
const code = admin.slice(start, end);

function setup(commands) {
  const dom = new JSDOM('<body><div id="studioRoot"><div id="stage"><div id="selToolbar" hidden></div></div><div id="selToolbarPop" hidden></div></div><iframe id="cmsPreview"></iframe></body>', { pretendToBeVisual: true });
  const w = dom.window, doc = w.document, calls = [];
  const noop = (pane) => {};
  const ctx = {
    window: w, document: doc, innerWidth: 1280, innerHeight: 900, setTimeout, Date,
    $: (id) => doc.getElementById(id), ic: (name) => `<svg class="ic"><use href="#i-${name}"/></svg>`,
    CMS_TAG_ICON: { p: 'text' }, DEVICES: [['Desktop'], ['Tablet']],
    state: { device: 0, cmsExactSelection: null, cmsExactSelections: [], cmsContextMenuOpen: false, cmsConnected: true, live: false, tbOpen: '', tbOpenKey: '', tbAutoOpen: null, cmsSelectionCommands: commands },
    cmsPreview: doc.getElementById('cmsPreview'),
    selToolbarVisible: () => !!(ctx.state.cmsExactSelection && ctx.state.cmsExactSelection.key),
    selToolbarKind: () => 'container', cmsTreeRowForKey: () => ({ tag: 'p' }), makeFrameCtx: () => ({ get: () => 0, set() {} }),
    placeSelToolbar: () => {}, postCmsLayoutOperation: () => {}, selectDesign: () => {}, openContentEditor: () => {},
    buildTypographySection: noop, buildFillSection: noop, buildSpacingSection: noop, buildFrameSection: noop, buildLayoutSection: noop, buildSizeSection: noop,
    buildEffectsSection: noop, buildAltTextSection: noop, buildComponentInstanceSection: noop, buildStateGroupSection: noop, buildElementMotionSection: noop, buildContentSection: noop,
  };
  w.ArkAdmin = { h: (tag) => doc.createElement(tag), ic: ctx.ic, provide(names) { Object.assign(this, names); } };
  vm.runInContext(fs.readFileSync('js/admin/overlay.js', 'utf8'), vm.createContext({ window: w, document: doc }));
  ctx.A = Object.assign(w.ArkAdmin, { toast: (m) => calls.push('toast:' + m), openPageFields: () => {} });
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  ctx.state.cmsExactSelection = { key: 'path:div:1', label: 'div', tag: 'div' }; ctx.state.cmsExactSelections = [ctx.state.cmsExactSelection];
  ctx.renderSelToolbar();
  doc.getElementById('selToolbar').querySelector('[data-name="More"]').click();
  return { doc, pop: doc.getElementById('selToolbarPop'), calls };
}

const GROUP = 'Select 2 or more layers to group them (Shift-click adds a layer).', SPACE = 'Select 3 or more layers to space them evenly.';
const rows = (pop) => [...pop.querySelectorAll('.menu button[data-action]')];

/* one layer: Group waits and is not a row; its reason is one line */
{
  const { pop } = setup([
    { id: 'make-states', label: 'Make into states', needs: '', group: 'edit' },
    { id: 'make-component', label: 'Make into component', needs: 'Select page content, not an inserted block or a state group.', group: 'edit' },
    { id: 'group', label: 'Group', needs: GROUP, group: 'edit', waits: true },
    { id: 'remove', label: 'Remove', needs: '', group: 'edit' }]);
  const ids = rows(pop).map((b) => b.dataset.action);
  assert(!ids.includes('group'), 'Group, which needs a second layer, is not listed as a greyed-out row');
  assert(ids.includes('make-states') && ids.includes('remove'), 'what works is listed');
  const refused = pop.querySelector('[data-action="make-component"]');
  assert(refused && refused.getAttribute('aria-disabled') === 'true', 'a command refused for THIS selection stays a row, marked unavailable');
  assert.match(refused.querySelector('.hint').textContent, /inserted block/, 'with its reason under it');
  const waits = pop.querySelectorAll('[data-waits]');
  assert.equal(waits.length, 1, 'one line holds the waiting commands\' reasons');
  assert.match(waits[0].textContent, /^Group: Select 2 or more layers to group them/, 'it names the command and what it needs');
  assert(!pop.querySelector('[data-action="make-states"]').getAttribute('aria-disabled'), 'an enabled row is plain');
}
/* two layers: both Distribute commands share one reason, said once */
{
  const { pop } = setup([
    { id: 'group', label: 'Group', needs: '', group: 'edit' },
    { id: 'align-left', label: 'Align left edges', needs: '', group: 'align' },
    { id: 'distribute-horizontal', label: 'Space evenly across', needs: SPACE, group: 'align', waits: true },
    { id: 'distribute-vertical', label: 'Space evenly down', needs: SPACE, group: 'align', waits: true }]);
  assert.deepEqual(rows(pop).map((b) => b.dataset.action).filter((id) => /distribute/.test(id)), [], 'neither Distribute is a row');
  assert.equal(pop.querySelector('[data-waits]').textContent, 'Space evenly across, Space evenly down: ' + SPACE, 'their shared reason is said once, naming both');
}
/* nothing waiting: no line */
{
  const { pop } = setup([{ id: 'group', label: 'Group', needs: '', group: 'edit' }, { id: 'remove', label: 'Remove', needs: '', group: 'edit' }]);
  assert(!pop.querySelector('[data-waits]'), 'with nothing waiting there is no extra line');
}
console.log('PASS: More lists what works, says once what is waiting for more layers, and keeps a row with its reason for a selection that is refused.');

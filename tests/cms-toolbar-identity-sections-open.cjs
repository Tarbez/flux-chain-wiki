'use strict';
/* Regression: after "Make into states" the only visible change in the editor was one more
   COLLAPSED accordion row ("States (1)") in a toolbar of six, while "In / out animation"
   sat open below it -- state 0 is the same elements as before, so the preview did not
   change either. In a real click-through (tests/browser/studio-flows.mjs) it read exactly
   like the owner's report: "I clicked it but nothing happened".
   Repointed 2026-10-18 when the toolbar became a bar of icons with one popover (owner: "a
   horizontal bar with icons and those become popovers"): the sections that say WHAT the
   selection is -- its states group, its component instance -- carry an identity mark on their
   icon, and the one just CREATED (Make into states / Make into component) opens its popover by
   itself, and the editor says what happened. This file pins the wiring from the preview's
   "created" flag to that request; tests/cms-toolbar-shell.cjs runs the shell and pins the
   behaviour (opens once the new selection arrives, in either message order; a stale request
   never opens on a later selection); tests/browser/toolbar-popovers.mjs clicks it for real. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const admin = require('./lib/admin-source.cjs').ADMIN;
const start = admin.indexOf('  const TB_IDENTITY = {');
assert(start >= 0, 'js/admin/admin.js still names the identity sections (TB_IDENTITY)');
const line = admin.slice(start, admin.indexOf('\n', start));
const context = {};
vm.createContext(context);
vm.runInContext(line.replace('const TB_IDENTITY', 'this.TB_IDENTITY'), context);
assert.deepEqual(JSON.parse(JSON.stringify(context.TB_IDENTITY)), { 'cms-states': 'stateGroup', 'cms-component': 'component' }, 'the identity sections are States and Component instance, each keyed to the selection field that says it applies');
assert(/function buildStateGroupSection\(pane\) \{[\s\S]*?toolbarSection\(pane, 'cms-states',/.test(admin) && /function buildComponentInstanceSection\(pane\) \{[\s\S]*?toolbarSection\(pane, 'cms-component',/.test(admin), 'the two identity sections are built under exactly those keys');
assert(/if \(event\.data\.created\) \{ state\.tbAutoOpen = \{ key: 'cms-states', at: Date\.now\(\) \}; toast\(/.test(admin), 'a newly made state group opens States and tells the owner what happened');
assert(/if \(event\.data\.created\) \{ state\.tbAutoOpen = \{ key: 'cms-component', at: Date\.now\(\) \}; toast\(/.test(admin), 'a newly made component opens Component instance and tells the owner what happened');
assert(/states-replace', states: cmsStatesDraft, (?:showing: [^,]+, )?route: route, groupId: groupId, created: true/.test(fs.readFileSync('js/main.js', 'utf8')), 'the preview flags a NEW group (Make into states) apart from every later edit to it');
console.log('PASS: a just-made states group or component instance opens its own section, and the editor says so.');

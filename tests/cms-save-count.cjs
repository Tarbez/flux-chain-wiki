'use strict';
/* Named regression (docs/ux-audit/cms.md P1-16, still open in the 2026-10-21 ledger recheck): the one Save button
   only went enabled or disabled, so nothing said how much a press would write -- two pages and a theme change looked
   the same as one comma. Now the button carries the count and its accessible name and title say what it is, from
   the same drafts anyDirty() reads (js/admin/state.js unsavedSummary). Runs the real refreshSaveButton against jsdom. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const state = fs.readFileSync('js/admin/state.js', 'utf8');
const summarySrc = state.slice(state.indexOf('  function unsavedSummary() {'), state.indexOf('  A.provide({ anyDirty: anyDirty, unsavedSummary'));
const editor = fs.readFileSync('js/admin/editor.js', 'utf8');
const refreshSrc = editor.slice(editor.indexOf('  function refreshSaveButton() {'), editor.indexOf("  if ($('save')) $('save').addEventListener"));
assert(summarySrc.length > 100 && refreshSrc.length > 100, 'the editor still has unsavedSummary and refreshSaveButton');

const { window } = new JSDOM('<!doctype html><button id="save" type="button" class="btn" title="Save every unsaved change (Ctrl/Cmd+S)">Save</button>');
const doc = window.document;
const dirtyPages = new Set(), dirtyArticles = new Set();
let singles = 0;
const ctx = {
  document: doc, $: (id) => doc.getElementById(id),
  h: (tag, props) => { const n = doc.createElement(tag); Object.entries(props || {}).forEach(([k, v]) => { if (k === 'text') n.textContent = v; else if (k === 'class') n.className = v; else n.setAttribute(k, v); }); return n; },
  state: { ids: ['home', 'about'], slugs: ['first'], assetIds: [], secretIds: [] },
  dirty: (id) => dirtyPages.has(id), dirtyA: (s) => dirtyArticles.has(s), dirtyI: () => false, dirtyS: () => false,
  ArkAdminStore: { drafts: () => [{ key: 'theme' }, { key: 'layout' }] }, singleDraftHandle: (key) => ({ dirty: () => key === 'theme' && singles > 0 }),
  restoreRemovalsPending: () => false, restoreReorderPending: () => false,
  NOTHING_TO_SAVE: 'Nothing to save',
  refuse: (b, reason) => { b.title = reason || b.dataset.baseTitle; b.disabled = !!reason; },
};
ctx.A = {}; ctx.anyDirty = () => dirtyPages.size + dirtyArticles.size + singles > 0;
vm.createContext(ctx);
vm.runInContext(summarySrc + '\nA.unsavedSummary = unsavedSummary;\n' + refreshSrc, ctx);
const save = doc.getElementById('save');

ctx.refreshSaveButton();
assert.equal(save.disabled, true, 'nothing unsaved: Save says there is nothing to save');
assert.equal(save.querySelector('.save-count'), null, 'and carries no count');
assert.equal(save.textContent.trim(), 'Save');

dirtyPages.add('home'); dirtyPages.add('about'); singles = 1;
ctx.refreshSaveButton();
assert.equal(save.disabled, false);
assert.equal(save.querySelector('.save-count').textContent, '3', 'two pages and a site-wide setting: 3');
assert.equal(save.getAttribute('aria-label'), 'Save 2 pages, 1 site-wide setting', 'its name says what Save will write');
assert.match(save.title, /^Save 2 pages, 1 site-wide setting \(Ctrl\/Cmd\+S\)$/);
assert.equal(save.querySelectorAll('.save-label').length, 1, 'one label, not one per refresh');

dirtyArticles.add('first'); dirtyPages.clear(); singles = 0;
ctx.refreshSaveButton();
assert.equal(save.querySelector('.save-count').textContent, '1');
assert.equal(save.getAttribute('aria-label'), 'Save 1 article');

dirtyArticles.clear();
ctx.refreshSaveButton();
assert(!save.querySelector('.save-count') && !save.hasAttribute('aria-label') && save.disabled, 'saved: the count goes and Save is disabled again');
console.log('PASS: Save carries how many unsaved items it will write, and its name says what they are.');

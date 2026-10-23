'use strict';
/* Regression: docs/ux-audit/cms.md P1-14 (ledger PARTIAL until 2026-10-20). Page fields showed
   every field of a page at once -- about sixty on Home -- as a column of fieldsets, with no way to
   fold the parts you are not editing and no way to find where on the page a group of words sits.
   The fix groups the fields by what is on screen (the manifest's own `section`: Hero, Status,
   Links ...) in Ark's accordion (js/admin/ark-host.js arkAccordion), the first group open, each
   group naming how many fields it holds and offering "Show on page".
   Held here (the real editor in jsdom, no ArkKit: the accordion's own click fallback):
     - a page with several groups draws one accordion item per group, in the manifest's order, the
       FIRST open and the rest closed -- and every field is still in the DOM (nothing dropped, so a
       form test or a screen reader's find-in-page reaches it);
     - opening another group is remembered across a repaint (typing repaints a form in place);
     - "Show on page" scrolls the canvas to the group's first words by their copy key and outlines
       them, and when none is on the canvas it SAYS so instead of doing nothing;
     - opts.field (the toolbar's "All fields" jump) opens the group that holds that field;
     - a page with a single group is drawn flat, with nothing to fold. */
const assert = require('node:assert/strict');
const { bootForms, type } = require('./lib/admin-forms-dom.cjs');

(async function main() {
  const { window, document, A, state } = bootForms();
  const mount = document.getElementById('mount');
  const statuses = [];
  const home = state.drafts.home;
  const sectionNames = []; Object.keys(home.fields).forEach((role) => { const n = home.fields[role].section || 'Fields'; if (sectionNames.indexOf(n) < 0) sectionNames.push(n); });
  assert(sectionNames.length > 1, 'Home has several groups of fields to fold: ' + sectionNames);

  A.renderPageFields(mount, 'home');
  const groups = [...mount.querySelectorAll('.lib-group')];
  const unused = Object.keys(home.fields).filter((role) => /\bunused\b/i.test(home.fields[role].label || ''));
  assert(groups.length >= 2, 'Home draws its fields as several accordion items');
  assert.deepEqual(groups.map((g) => g.dataset.group), groups.map((g) => g.dataset.group).filter((n, i, all) => all.indexOf(n) === i), 'one item per group');
  assert.deepEqual(groups.map((g) => g.dataset.group), sectionNames.filter((n) => Object.keys(home.fields).some((r) => (home.fields[r].section || 'Fields') === n && unused.indexOf(r) < 0)), 'in the manifest\'s order');
  const open = (g) => g.querySelector('.lib-group-trigger').getAttribute('aria-expanded') === 'true' && !g.querySelector('.lib-group-rows').hidden;
  assert(open(groups[0]), 'the first group is open');
  assert(groups.slice(1).every((g) => !open(g)), 'the others are closed');
  const total = Object.keys(home.fields).length - unused.length;
  assert.equal(mount.querySelectorAll('.lib-group-rows .row').length + mount.querySelectorAll('.lib-group-rows .field-link').length >= 1, true);
  for (const role of Object.keys(home.fields)) assert(mount.querySelector('#f-home-' + role.replace(/\./g, '-')) || home.fields[role].kind === 'link', 'field ' + role + ' is still in the form');
  assert.equal(groups.map((g) => Number(g.querySelector('.lib-group-count').textContent)).reduce((a, b) => a + b, 0), total, 'the counts add up to every field that is shown');
  assert(groups.every((g) => g.querySelector('[data-action="show-on-page"]')), 'every group offers Show on page');

  /* opening another group survives a repaint */
  groups[1].querySelector('.lib-group-trigger').click();
  assert(open(groups[1]), 'a click opens a group');
  type(window, mount.querySelector('#f-home-EYEBROW'), 'Typed in the first group');
  A.refreshPanels && A.refreshPanels();
  A.renderPageFields(mount, 'home');
  const again = [...mount.querySelectorAll('.lib-group')];
  assert(open(again[0]) && open(again[1]) && again.slice(2).every((g) => !open(g)), 'a repaint keeps the groups the person opened');

  /* Show on page: the canvas, a copy key, an outline -- or the reason */
  const frame = document.createElement('iframe'); frame.id = 'cmsPreview'; document.body.appendChild(frame);
  const fdoc = frame.contentDocument; fdoc.body.innerHTML = '<h1 data-ark-copy-keys="HOME.TITLE HOME.EYEBROW">Words</h1>';
  state.cmsPreviewRoute = home.route;
  const firstRoles = again[0].querySelector('[data-action="show-on-page"]');
  let scrolled = 0; fdoc.querySelector('h1').scrollIntoView = () => { scrolled += 1; };
  firstRoles.click();
  assert.equal(scrolled, 1, 'Show on page scrolls the canvas to the group\'s words');
  assert(/solid/.test(fdoc.querySelector('h1').style.outline), 'and outlines them');
  fdoc.body.innerHTML = '<p>nothing keyed</p>';
  const before = (document.getElementById('status') || {}).textContent;
  again[0].querySelector('[data-action="show-on-page"]').click();
  assert.notEqual(document.getElementById('status').textContent, before, 'with none of the words on the canvas it says so');
  assert.match(document.getElementById('status').textContent, /None of these words are on the canvas/);

  /* opts.field opens the group that holds it */
  const lastRole = Object.keys(home.fields).filter((r) => unused.indexOf(r) < 0).pop();
  const lastGroup = home.fields[lastRole].section || 'Fields';
  const box = document.createElement('div'); document.body.appendChild(box);
  A.renderPageFields(box, 'home', { field: lastRole });
  const target = box.querySelector('.lib-group[data-group="' + lastGroup.replace(/"/g, '\\"') + '"]');
  assert(target && open(target), 'the group holding the requested field is open: ' + lastGroup);

  /* a single group is flat */
  const flat = Object.keys(state.drafts).find((id) => { const m = state.drafts[id]; return new Set(Object.keys(m.fields).map((r) => m.fields[r].section || 'Fields')).size === 1; });
  if (flat) { const b = document.createElement('div'); A.renderPageFields(b, flat); assert(!b.querySelector('.lib-group'), 'a page with one group is not folded'); assert(b.querySelector('[data-action="show-on-page"]'), 'but still offers Show on page'); }
  console.log('PASS: Page fields groups a page\'s fields in Ark accordion items (first open), keeps open groups across repaints, and Show on page scrolls to the words or says why not.');
})().catch((error) => { console.error(error); process.exit(1); });

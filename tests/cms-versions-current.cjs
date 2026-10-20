'use strict';
/* Regression: docs/ux-audit/cms.md P1-15 (ledger PARTIAL until 2026-10-20). Versions listed every
   row alike: nothing said which version the site is at, and "Bring it back" was offered -- and ran
   -- on the version that is already the saved site. The first row wore a "Latest" pill that only
   meant "newest recorded", which is not the same thing once a folder has changed since.
   Held here (the real panel, a stub list, real content addresses):
     - the version whose content address equals what the project folder holds now (savedSnapshot)
       carries a "Current" pill; the newest by date does not unless it is that one;
     - Restore is worded "Restore this version" and says it loads unsaved changes; Preview is
       "Preview";
     - on the Current version with nothing unsaved there is no Restore button, only the words
       "Your site is at this version." (an action that changes nothing is not offered);
     - with unsaved changes it IS offered there, as "Discard unsaved changes" -- the one thing a
       restore of the current version does;
     - a snapshot that matches no version marks nothing (no marker rather than a wrong one). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { bootForms } = require('./lib/admin-forms-dom.cjs');

(async function main() {
  const { window, document, A } = bootForms();
  window.eval(fs.readFileSync('js/admin/versions.js', 'utf8') + '\n' + fs.readFileSync('js/admin/versions-panel.js', 'utf8') + '\n;window.ArkVersionsPanel = ArkVersionsPanel;');
  const V = window.ArkVersions;
  const snapA = { manifests: [{ id: 'home', title: 'A' }] }, snapB = { manifests: [{ id: 'home', title: 'B' }] }, snapC = { manifests: [{ id: 'home', title: 'C' }] };
  const contentOf = async (snap) => V.address((await V.addressSnapshot(snap)).items);
  const rec = async (seq, snap, at) => ({ hash: 'h' + seq + '0'.repeat(62), branch: 0, forked: false, record: { seq, kind: 'save', at, content: await contentOf(snap), summary: ['changed'], changed: ['manifests/home'], prev: seq > 1 ? 'x' : null, items: {} } });
  const entries = [await rec(3, snapC, '2026-10-20T03:00:00Z'), await rec(2, snapB, '2026-10-20T02:00:00Z'), await rec(1, snapA, '2026-10-20T01:00:00Z')];
  V.list = async () => ({ entries, next: null, heads: entries.map((e) => e.hash), missing: [] });

  async function panelFor(snapshot, dirty) {
    const root = document.createElement('aside'); document.body.appendChild(root);
    const panel = window.ArkVersionsPanel.create({ h: A.h, root, dir: () => Promise.resolve({}), connect: async () => false, savedSnapshot: () => snapshot,
      anyDirty: () => dirty, status: () => {}, download: () => {}, preview: () => {}, exitPreview: () => {}, restore: () => {}, restorePlan: () => ({ removals: [], dirty }), onToggle: () => {} });
    panel.open();
    for (let i = 0; i < 100 && !root.querySelectorAll('li.version').length; i++) await new Promise((r) => setTimeout(r, 5));
    return root;
  }
  const row = (root, seq) => root.querySelector('li.version[data-seq="' + seq + '"]');

  /* the site is at #2, not at the newest */
  let root = await panelFor(snapB, false);
  const pills = [...root.querySelectorAll('.version-kind[data-kind="current"]')];
  assert.equal(pills.length, 1, 'exactly one version is marked Current');
  assert.equal(pills[0].textContent, 'Current'); assert(row(root, 2).contains(pills[0]), 'it is the version the saved site matches (#2), not the newest (#3)');
  assert(!root.querySelector('.version-kind[data-kind="latest"]'), 'the vague "Latest" pill is gone');
  assert.equal(row(root, 3).querySelector('[data-action="restore"]').textContent, 'Restore this version', 'Restore is worded plainly');
  assert.match(row(root, 3).querySelector('[data-action="restore"]').title, /unsaved changes.*Nothing is written until you Save/, 'and says what it does');
  assert.equal(row(root, 3).querySelector('[data-action="preview"]').textContent, 'Preview');
  assert(!row(root, 2).querySelector('[data-action="restore"]'), 'no Restore on the Current version when nothing is unsaved');
  assert.match(row(root, 2).textContent, /Your site is at this version\./, 'it says so instead');

  /* unsaved changes: Restore on the Current version discards them */
  root = await panelFor(snapB, true);
  const discard = row(root, 2).querySelector('[data-action="restore"]');
  assert(discard && discard.textContent === 'Discard unsaved changes', 'with unsaved changes the Current version offers to discard them');

  /* a saved state no version holds: nothing is marked */
  root = await panelFor({ manifests: [{ id: 'home', title: 'unrecorded' }] }, false);
  assert.equal(root.querySelectorAll('.version-kind[data-kind="current"]').length, 0, 'an unrecorded state marks no version');
  assert.equal(root.querySelectorAll('[data-action="restore"]').length, 3, 'and every version can be restored');
  console.log('PASS: Versions marks the version the site is at "Current", words Restore plainly, and offers no Restore where it would change nothing.');
})().catch((error) => { console.error(error); process.exit(1); });

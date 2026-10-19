'use strict';
/* Save with no project folder connected writes nothing, downloads nothing, and says so -- with
   the button that fixes it. Downloading is an explicit second choice, and says the site did not
   change.

   Why this exists (docs/ux-audit/cms.md P0-3): with no folder connected, Save downloaded every
   changed draft as a .js file and reported "Saved 1 item (downloaded): Page "home"." A
   non-technical owner believed the site had changed; it had not, and there was a stray home.js in
   Downloads. "Connect project folder" was one line inside the account menu, and Versions said
   "Connect the project folder to keep version history" with no button.
   Runs the real save.js / notice.js / versions-panel.js in jsdom (tests/lib/admin-forms-dom.cjs);
   tests/browser/cms-journeys.mjs walks the same journey in Chromium. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { bootForms } = require('./lib/admin-forms-dom.cjs');

(async function main() {
  const { window, document, A, state } = bootForms();
  /* every download goes through core.js download(): an object URL and a click on <a download> */
  const downloads = [];
  window.URL.createObjectURL = () => 'blob:test';
  window.URL.revokeObjectURL = () => {};
  window.HTMLAnchorElement.prototype.click = function () { if (this.hasAttribute('download')) downloads.push(this.getAttribute('download')); };
  window.showDirectoryPicker = async () => { throw Object.assign(new Error('not in a test'), { name: 'AbortError' }); };
  let connects = 0;
  A.provide({ connectProject: async () => { connects += 1; return false; }, renderList: () => {} });

  assert(!state.dir && !state.cdirs, 'the fixture has no project folder connected');
  const savedHome = state.saved.home;
  A.setItemField('page', 'home', 'EYEBROW', 'Edited with no folder');
  assert(A.anyDirty(), 'the edit is unsaved');

  /* ---- Save: refused, nothing written, nothing downloaded ---- */
  const result = await A.saveEverything();
  assert(result.refused && /no project folder is connected/.test(result.refused), 'Save says why it saved nothing: ' + JSON.stringify(result));
  assert.deepEqual(downloads, [], 'Save with no folder downloaded files: ' + downloads.join(', '));
  assert.equal(state.saved.home, savedHome, 'the page counts as saved though nothing was written');
  assert(A.anyDirty(), 'the edit is still unsaved -- it is kept in the tab');
  const status = document.getElementById('status').textContent;
  assert(!/^Saved/.test(status) && /Not saved/.test(status), 'the status line says "' + status + '"');

  /* ---- the refusal: one banner, the remedy as its first button, download second ---- */
  const banner = document.querySelector('[data-notice="project-folder"]');
  assert(banner, 'no notice says the site was not saved');
  assert.match(banner.querySelector('.notice-title').textContent, /^Not saved to your site/);
  assert.equal(banner.getAttribute('role'), 'alert', 'a refusal is announced (warning tone: role alert)');
  const buttons = [...banner.querySelectorAll('[data-part="alert-action"]')].map((b) => b.textContent);
  assert.deepEqual(buttons, ['Connect project folder', 'Download changed files instead'], 'the remedy first, the download as the explicit second choice');
  assert(banner.querySelector('[data-part="alert-action"]').classList.contains('primary'), 'Connect is the primary action');
  banner.querySelectorAll('[data-part="alert-action"]')[0].click();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(connects, 1, 'the banner\'s Connect runs the one connect flow (connectProject)');
  assert(document.querySelector('[data-notice="project-folder"]'), 'a connect that did not happen leaves the banner up');

  /* ---- a second Save: still one banner, not a stack of them ---- */
  await A.saveEverything();
  assert.equal(document.querySelectorAll('[data-notice="project-folder"]').length, 1, 'Save twice shows one banner');

  /* ---- the explicit download: downloads, and says the site folder did not change ---- */
  document.querySelector('[data-notice="project-folder"]').querySelectorAll('[data-part="alert-action"]')[1].click();
  for (let i = 0; i < 50 && !document.querySelector('[data-notice="downloaded"]'); i++) await new Promise((r) => setTimeout(r, 10));
  assert(downloads.includes('home.js'), 'the explicit download did not download home.js: ' + downloads.join(', '));
  const done = document.querySelector('[data-notice="downloaded"]');
  assert(done && /your site folder did not change/.test(done.textContent), 'the download does not say the site folder did not change');

  /* ---- a browser that cannot write into a folder: no Connect button it could not honour ---- */
  delete window.showDirectoryPicker;
  A.setItemField('page', 'home', 'EYEBROW', 'Edited again');
  await A.saveEverything();
  const plain = document.querySelector('[data-notice="project-folder"]');
  assert.match(plain.querySelector('.notice-title').textContent, /cannot write into a folder/);
  assert.deepEqual([...plain.querySelectorAll('[data-part="alert-action"]')].map((b) => b.textContent), ['Download changed files instead']);

  /* ---- Versions: "connect the folder" carries the button (js/admin/versions-panel.js) ---- */
  window.eval(fs.readFileSync('js/admin/versions.js', 'utf8') + '\n' + fs.readFileSync('js/admin/versions-panel.js', 'utf8') + '\n;window.ArkVersionsPanel = ArkVersionsPanel;');
  const root = document.createElement('aside'); document.body.appendChild(root);
  let panelConnects = 0;
  const panel = window.ArkVersionsPanel.create({ h: A.h, root, dir: () => Promise.resolve(null), connect: async () => { panelConnects += 1; return false; },
    savedSnapshot: () => ({}), anyDirty: () => false, status: () => {}, download: () => {}, preview: () => {}, exitPreview: () => {}, restore: () => {}, restorePlan: () => null, onToggle: () => {} });
  panel.refresh();
  for (let i = 0; i < 50 && root.querySelector('#versionsConnect').hidden; i++) await new Promise((r) => setTimeout(r, 10));
  const connect = root.querySelector('#versionsConnect');
  assert(!connect.hidden, 'Versions with no folder has no Connect project folder button');
  assert.match(root.querySelector('#versionsNote').textContent, /Connect the project folder/);
  connect.click();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(panelConnects, 1, 'Versions\' button runs the connect flow');

  console.log('PASS: with no project folder, Save writes and downloads nothing and says "Not saved to your site" with Connect; download is an explicit second choice that says the site did not change; Versions offers Connect.');
})().catch((error) => { console.error(error); process.exit(1); });

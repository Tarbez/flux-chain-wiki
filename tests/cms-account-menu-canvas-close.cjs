'use strict';
/* The account menu closes when the canvas is clicked; with no project folder, a first-run banner
   says what connecting does, with the button.

   Why this exists (docs/ux-audit/cms.md P1-12 "real bug", P0-3):
     - the account menu closed on a pointerdown in the EDITOR document only (js/admin/project.js),
       and a press inside the canvas is a press in another document (the #cmsPreview iframe), so
       the menu stayed open over the canvas while the person edited under it. Focus leaving the
       editor's window for the iframe -- which that press does -- now closes it;
     - on first open nothing said a folder was needed: "Connect project folder" was one line in
       that same account menu. A banner over the canvas now says it, with the button; a browser
       that cannot write into a folder is told so instead of being offered a button it cannot use.
   Runs the real core.js / notice.js / project.js in jsdom (tests/lib/admin-forms-dom.cjs);
   tests/browser/cms-journeys.mjs clicks the real canvas iframe in Chromium. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { bootForms } = require('./lib/admin-forms-dom.cjs');

function boot(supported) {
  const t = bootForms();
  const { window, document, A } = t;
  document.body.insertAdjacentHTML('beforeend', '<div id="account"><button id="accountBtn" aria-expanded="false"></button><div id="accountMenu" hidden>' +
    '<button id="connect">Connect project folder</button><button id="signOut">Sign out</button></div></div>');
  if (supported) window.showDirectoryPicker = async () => { throw Object.assign(new Error('closed'), { name: 'AbortError' }); };
  A.provide({ versionsPanel: null, ensureVersionBaseline: () => {} });
  window.eval(fs.readFileSync('js/admin/project.js', 'utf8') + '\n//# sourceURL=js/admin/project.js');
  return t;
}

(async function main() {
  /* ---- the menu ---- */
  const { window, document } = boot(true);
  const menu = document.getElementById('accountMenu'), btn = document.getElementById('accountBtn');
  btn.click();
  assert.equal(menu.hidden, false, 'the account button opens the menu');
  /* a press inside the canvas: this document gets no pointerdown -- the canvas reports the press
     ('defxn-cms-preview-pointerdown', js/admin/bridge.js -> overlay.closeCanvas) */
  window.ArkAdmin.overlay.closeCanvas();
  assert.equal(menu.hidden, true, 'the menu stayed open when the canvas was pressed');
  assert.equal(btn.getAttribute('aria-expanded'), 'false');
  /* leaving the window closes it too (checked once focus has settled) */
  btn.click();
  window.dispatchEvent(new window.FocusEvent('blur'));
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(menu.hidden, true, 'the menu stayed open when focus left the window');
  assert.equal(btn.getAttribute('aria-expanded'), 'false');
  btn.click();
  document.body.dispatchEvent(new window.Event('pointerdown', { bubbles: true }));
  assert.equal(menu.hidden, true, 'a press elsewhere in the editor still closes it');

  /* ---- the first-run banner (no folder remembered: indexedDB is absent here, as on a first open) ---- */
  const banner = document.querySelector('[data-notice="project-folder"]');
  assert(banner, 'no first-run banner while no project folder is connected');
  assert.match(banner.querySelector('.notice-title').textContent, /Connect your project folder to save/);
  assert.match(banner.querySelector('.notice-body').textContent, /Save writes your changes straight into the site's files/, 'the banner says what connecting does');
  assert.match(banner.querySelector('.notice-body').textContent, /Until a folder is connected, Save cannot change your site/);
  assert.deepEqual([...banner.querySelectorAll('[data-part="alert-action"]')].map((b) => b.textContent), ['Connect project folder']);
  assert.equal(document.getElementById('connect').textContent, 'Connect project folder', 'the account menu keeps its own Connect');

  /* ---- a browser that cannot write into a folder ---- */
  const bare = boot(false);
  const plain = bare.document.querySelector('[data-notice="project-folder"]');
  assert(plain, 'a browser that cannot connect a folder is not told why Save cannot write');
  assert.match(plain.textContent, /needs Chrome or Edge/);
  assert.equal(plain.querySelectorAll('[data-part="alert-action"]').length, 0, 'no Connect button the browser cannot honour');

  console.log('PASS: the account menu closes when focus goes to the canvas; with no folder connected a first-run banner says what connecting does, with the button (or why this browser cannot).');
})().catch((error) => { console.error(error); process.exit(1); });

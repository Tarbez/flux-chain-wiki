/* =====================================================================
   ADMIN EDITOR · PROJECT FOLDER AND ACCOUNT MENU (js/admin/project.js)
   ---------------------------------------------------------------------
   Owns: connecting (and remembering) the project folder Save writes into -- connectProject(),
   the one connect flow behind every "Connect project folder" button (the account menu's
   #connect, the first-run banner, Save's refusal, Versions) -- the banner that says so while no
   folder is connected, and the header's More menu, whose last section is the account -- who is
   signed in, the folder, sign-out (it closes on a press anywhere, the canvas included).
   Must not: write any file (js/admin/save.js does, through the folder this connects).
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, versionsPanel = A.versionsPanel, ensureVersionBaseline = A.ensureVersionBaseline,
      $ = A.$, status = A.status, gate = A.gate, notice = A.notice;

  /* ---- project folder ----------------------------------------------- */
  var supported = typeof window.showDirectoryPicker === 'function';
  /* the ONE banner shown while no folder is connected (showFolderBanner; Save's refusal,
     js/admin/save.js, replaces it under the same key) */
  var FOLDER_NOTICE = 'project-folder';
  function keep(handle) {
    try {
      var open = indexedDB.open('flux-chain-admin', 1);
      open.onupgradeneeded = function () { open.result.createObjectStore('handles'); };
      open.onsuccess = function () { open.result.transaction('handles', 'readwrite').objectStore('handles').put(handle, 'project'); };
    } catch (e) { /* remembering the folder is a convenience; saving still works */ }
  }
  function recall(callback) {
    try {
      var open = indexedDB.open('flux-chain-admin', 1);
      open.onupgradeneeded = function () { open.result.createObjectStore('handles'); };
      open.onsuccess = function () {
        var get = open.result.transaction('handles').objectStore('handles').get('project');
        get.onsuccess = function () { callback(get.result || null); };
        get.onerror = function () { callback(null); };
      };
      open.onerror = function () { callback(null); };
    } catch (e) { callback(null); }
  }
  async function attach(handle) {
    state.dir = await ArkAdminStore.manifestsDir(handle);
    state.cdirs = await ArkAdminStore.contentDirs(handle);
    state.assetDir = await ArkAdminStore.assetsDir(handle);
    state.secretDir = await ArkAdminStore.secretsDir(handle);
    state.historyDir = window.ArkVersions ? await ArkVersions.historyDir(handle) : null;
    if (versionsPanel) versionsPanel.refresh();
    ensureVersionBaseline();
    $('connect').textContent = 'Project folder connected';
    $('connect').disabled = true;
    notice.close(FOLDER_NOTICE);
    status('Saving writes straight into ' + handle.name + '/js/content.', 'ok');
  }
  var NO_FOLDER_BROWSER = 'This browser cannot write into a folder, so Save cannot change your site from here. Open this editor in Chrome or Edge to save in place; here you can only download the changed files.';
  /* THE connect flow: every "Connect project folder" button runs this. Resolves true once Save
     writes into the folder. */
  async function connectProject() {
    if (!supported) { notice({ tone: 'warning', title: 'This browser cannot connect a folder', body: NO_FOLDER_BROWSER }); return false; }
    try {
      var handle = await window.showDirectoryPicker({ mode: 'readwrite', id: 'flux-chain-project' });
      await attach(handle); keep(handle);
      return true;
    } catch (error) {
      if (error.name !== 'AbortError') notice({ tone: 'danger', title: 'The project folder was not connected', body: error.message + ' Choose the folder that holds index.html and js/content/, and allow editing when the browser asks.', actions: [{ label: 'Try again', run: connectProject }] });
      return false;
    }
  }
  $('connect').addEventListener('click', connectProject);
  /* While no folder is connected, ONE banner above the canvas says what connecting does, with
     the button. It used to be one line in the account menu, and a Save without it downloaded .js
     files while the status said "Saved" -- the site did not change (docs/ux-audit/cms.md P0-3;
     regression: tests/cms-save-unconnected.cjs, tests/browser/cms-journeys.mjs). */
  function showFolderBanner(reconnect) {
    if (state.dir || state.cdirs) return;
    if (!supported) { notice({ tone: 'warning', persist: true, key: FOLDER_NOTICE, title: 'Saving into your site needs Chrome or Edge', body: NO_FOLDER_BROWSER }); return; }
    notice({ tone: 'info', persist: true, key: FOLDER_NOTICE,
      title: reconnect ? 'Reconnect your project folder to save' : 'Connect your project folder to save',
      body: reconnect ? 'The browser needs your permission again to write into the folder you connected last time. Until then, Save cannot change your site; your edits stay in this tab.'
        : 'Save writes your changes straight into the site\'s files (js/content/ in the folder that holds index.html) and keeps a version history beside them. Until a folder is connected, Save cannot change your site; your edits stay in this tab.',
      actions: [{ label: reconnect ? 'Reconnect project folder' : 'Connect project folder', run: connectProject }] });
  }
  if (!supported) { $('connect').textContent = 'Saves as downloads in this browser'; $('connect').disabled = true; showFolderBanner(false); }
  else recall(function (handle) {
    if (!handle || !handle.queryPermission) { showFolderBanner(false); return; }
    handle.queryPermission({ mode: 'readwrite' }).then(function (permission) {
      if (permission === 'granted') return attach(handle);
      $('connect').textContent = 'Reconnect project folder';
      showFolderBanner(true);
    }).catch(function () { showFolderBanner(false); });
  });
  if (gate.localDevelopment && gate.localDevelopment()) { $('signOut').textContent = 'Sign out identity'; $('signOut').title = 'Drop the identity and signing key; local editing remains open.'; }
  $('signOut').addEventListener('click', function () { gate.signOut(); });
  /* The header's More menu (#accountMenu): the views, this page's search & sharing, the page
     transition, version history, publishing status -- and, last, who is signed in, the project
     folder, shortcuts, sign-out. Occasional, so one menu keeps the header to the things used on
     every screen (docs/ux-audit/cms.md (b)). It is one overlay of the editor's one stack
     (js/admin/overlay.js): a press anywhere -- the canvas included -- Esc, or opening another
     popover closes it. Choosing an item closes it; the item's own result shows where it acts. */
  function menuClosed() { $('accountMenu').hidden = true; }
  function setAccountMenu(open) {
    if (open) { $('accountMenu').hidden = false; A.overlay.open($('accountMenu'), { anchor: $('accountBtn'), level: 'popover', onClose: menuClosed }); var first = $('accountMenu').querySelector('.menu-item[aria-pressed="true"], .menu-item'); if (first) first.focus({ preventScroll: true }); }
    else if (!A.overlay.close($('accountMenu'))) menuClosed();
  }
  $('accountBtn').addEventListener('click', function () { setAccountMenu($('accountMenu').hidden); });
  $('accountMenu').addEventListener('click', function (event) { if (event.target.closest('button') && !$('accountMenu').hidden && A.overlay.isOpen($('accountMenu'))) setAccountMenu(false); });
  A.provide({ connectProject: connectProject });
})();

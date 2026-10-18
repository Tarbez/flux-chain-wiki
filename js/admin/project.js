/* =====================================================================
   ADMIN EDITOR · PROJECT FOLDER AND ACCOUNT MENU (js/admin/project.js)
   ---------------------------------------------------------------------
   Owns: connecting (and remembering) the project folder Save writes into, and the
   header's account menu -- who is signed in, sign-out.
   Must not: write any file (js/admin/save.js does, through the folder this connects).
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, versionsPanel = A.versionsPanel, ensureVersionBaseline = A.ensureVersionBaseline,
      $ = A.$, status = A.status, gate = A.gate;

  /* ---- project folder ----------------------------------------------- */
  var supported = typeof window.showDirectoryPicker === 'function';
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
    status('Saving writes straight into ' + handle.name + '/js/content.', 'ok');
  }
  $('connect').addEventListener('click', async function () {
    if (!supported) { status('This browser cannot write to a folder. Saving downloads each file instead; use Chrome or Edge to save in place.', 'warn'); return; }
    try {
      var handle = await window.showDirectoryPicker({ mode: 'readwrite', id: 'flux-chain-project' });
      await attach(handle); keep(handle);
    } catch (error) { if (error.name !== 'AbortError') status(error.message, 'error'); }
  });
  if (!supported) { $('connect').textContent = 'Saves as downloads in this browser'; $('connect').disabled = true; }
  else recall(function (handle) {
    if (!handle || !handle.queryPermission) return;
    handle.queryPermission({ mode: 'readwrite' }).then(function (permission) {
      if (permission === 'granted') return attach(handle);
      $('connect').textContent = 'Reconnect project folder';
    }).catch(function () {});
  });
  if (gate.localDevelopment && gate.localDevelopment()) { $('signOut').textContent = 'Sign out identity'; $('signOut').title = 'Drop the identity and signing key; local editing remains open.'; }
  $('signOut').addEventListener('click', function () { gate.signOut(); });
  /* The header's account menu: who is signed in, the project folder, shortcuts, sign-out --
     occasional actions, folded into one icon so the header keeps to one row. */
  function setAccountMenu(open) { $('accountMenu').hidden = !open; $('accountBtn').setAttribute('aria-expanded', String(open)); }
  $('accountBtn').addEventListener('click', function () { setAccountMenu($('accountMenu').hidden); });
  /* a menu action (Connect, Sign out) closes the menu; its result shows in the status line */
  $('accountMenu').addEventListener('click', function (event) { if (event.target.closest('button')) setAccountMenu(false); });
  document.addEventListener('pointerdown', function (event) { if (!$('accountMenu').hidden && !$('account').contains(event.target)) setAccountMenu(false); });
  $('account').addEventListener('keydown', function (event) { if (event.key === 'Escape' && !$('accountMenu').hidden) { setAccountMenu(false); $('accountBtn').focus(); } });
})();

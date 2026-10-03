/* Local Auth Kit account view. Public account state survives reload; root signing authority stays in memory. */
(function () {
  'use strict';
  var LOCAL_MINER = 'http://127.0.0.1:8766';
  var EXPLORER_API = 'explorer-api-v1';

  function text(value, fallback) {
    return value == null || value === '' ? (fallback || '—') : String(value);
  }

  function explorerRecord(payload, identityId) {
    if (!payload || payload.apiVersion !== EXPLORER_API || !payload.data || !payload.data.record || payload.data.record.id !== identityId) {
      throw new Error('The local Miner returned an incompatible identity record.');
    }
    return payload.data.record;
  }

  ArkUI.pageModules.account = {
    mount: function (host) {
      var page = document.createElement('section');
      page.className = 'ark-page task-page account-page';
      page.setAttribute('aria-labelledby', 'account-title');
      page.innerHTML = '<div class="account-shell"><header class="account-hero"><p class="account-kicker">FLUX / YOUR ACCOUNT</p>' +
        '<div class="account-profile"><div class="account-avatar" data-account-avatar aria-hidden="true">↗</div><div><h1 id="account-title">Your account.</h1><span class="account-status" data-account-status>Signed out</span></div></div>' +
        '<p data-account-intro>Your identity is yours. Open your Auth Kit to connect it to this session.</p></header>' +
        '<div class="account-layout"><section class="account-auth" aria-label="Account session"><p class="account-kicker">01 / SESSION</p><h2 class="account-session-title" data-account-session-title>Connect your identity</h2><p class="account-session-description" data-account-session-description>Use your recovery file to sign in on this device.</p><div data-account-auth></div><p class="account-cms"><a href="/bundle-deployer" data-scene-link="bundledeployer">FXN Bundle Deployer →</a><br><span>Deploy locally. The lightweight CLI is in development.</span><br><a hidden href="/admin" target="_blank" rel="opener" data-account-cms-open>Open CMS ↗</a><br><span hidden data-account-cms-local>Local CMS editing is available on this machine. Deployment requires the local FXN Bundle Deployer.</span><span data-account-cms-status role="status"></span></p><button type="button" data-account-forget hidden>Sign out</button><p class="account-storage-notice" data-account-storage-notice role="status" hidden></p><div class="account-session-note"><span>LOCAL BY DESIGN</span><p>This browser saves only your name and public identity details. It does not save your Auth Kit, PIN, password or signing key. A valid host session survives reload. To sign or publish after reload, select your .auth.flx file again and enter its PIN and password if you set one.</p></div></section>' +
        '<aside class="account-welcome"><p class="account-kicker">ONE IDENTITY / YOUR CONTROL</p><h2>Bring your identity.<br>Keep your keys.</h2><ol><li><strong>Open your Auth Kit</strong><p>Choose the recovery file saved when you created your identity.</p></li><li><strong>Unlock on this device</strong><p>Your PIN verifies the key locally.</p></li><li><strong>Explore with context</strong><p>Inspect your credentials and check your identity against a local Miner.</p></li></ol></aside>' +
        '<section class="account-state" aria-live="polite" hidden><p class="account-kicker">01 / IDENTITY</p><h2 data-account-heading>Your credentials</h2>' +
        '<dl><div><dt>Identity ID</dt><dd data-account-id>—</dd></div><div><dt>Root key</dt><dd data-account-root>—</dd></div>' +
        '<div><dt>Wallet address in Auth Kit</dt><dd data-account-wallet>—</dd></div><div><dt>Security profile</dt><dd data-account-security>—</dd></div></dl>' +
        '<p data-account-verification>Unlock a kit to verify its root against its recovery phrase.</p></section></div>' +
        '<section class="account-live" aria-labelledby="account-live-title" hidden><p class="account-kicker">03 / MESH CONNECTION</p><h2 id="account-live-title">Connect the dots</h2>' +
        '<div class="account-mesh-check" aria-live="polite"><div><strong data-account-mesh-status>Not checked</strong><p data-account-mesh-message>After sign-in, check this identity against the local Miner by exact ID.</p></div><button type="button" data-account-mesh-check disabled>Check local Miner</button></div>' +
        '<details class="account-mesh-detail" data-account-mesh-detail hidden><summary>Identity record details</summary><dl><div><dt>Record</dt><dd data-account-mesh-record>—</dd></div><div><dt>Verification</dt><dd data-account-mesh-verification>—</dd></div><div><dt>Updated</dt><dd data-account-mesh-updated>—</dd></div><div><dt>Provenance</dt><dd data-account-mesh-provenance>—</dd></div></dl></details>' +
        '<details class="account-unsupported"><summary>Balances & standing</summary><div class="account-live-grid"><div><span>FXN holdings</span><strong>Not connected</strong><p>No verified balance source is wired to this identity.</p></div>' +
        '<div><span>Credits</span><strong>Not connected</strong><p>Credits are identity-bound and non-transferable; no live balance is claimed here.</p></div>' +
        '<div><span>Mesh standing</span><strong data-account-standing>Not linked</strong><p data-account-standing-message>The Miner exposes standing only through an exact, signed account binding.</p></div></div>' +
        '</details><p class="account-next">To inspect live Miner records now, use the <a href="/explore" data-scene-link="explorer">Mesh Explorer</a>. A displayed Auth Kit wallet address is not proof of current holdings.</p></section></div>';
      host.appendChild(page);
      var fields = {
        heading: page.querySelector('[data-account-heading]'),
        id: page.querySelector('[data-account-id]'),
        root: page.querySelector('[data-account-root]'),
        wallet: page.querySelector('[data-account-wallet]'),
        security: page.querySelector('[data-account-security]'),
        verification: page.querySelector('[data-account-verification]'),
        check: page.querySelector('[data-account-mesh-check]'),
        meshStatus: page.querySelector('[data-account-mesh-status]'),
        meshMessage: page.querySelector('[data-account-mesh-message]'),
        meshDetail: page.querySelector('[data-account-mesh-detail]'),
        meshRecord: page.querySelector('[data-account-mesh-record]'),
        meshVerification: page.querySelector('[data-account-mesh-verification]'),
        meshUpdated: page.querySelector('[data-account-mesh-updated]'),
        meshProvenance: page.querySelector('[data-account-mesh-provenance]'),
        standing: page.querySelector('[data-account-standing]'),
        standingMessage: page.querySelector('[data-account-standing-message]')
      };
      var identity = null;
      var generation = 0;
      var controller = null;

      function resetMesh(message) {
        generation += 1;
        if (controller) controller.abort();
        controller = null;
        fields.meshStatus.textContent = 'Not checked';
        fields.meshMessage.textContent = message || 'After sign-in, check this identity against the local Miner by exact ID.';
        fields.meshDetail.hidden = true;
        fields.meshDetail.open = false;
        fields.meshRecord.textContent = '—'; fields.meshVerification.textContent = '—';
        fields.meshUpdated.textContent = '—'; fields.meshProvenance.textContent = '—';
        fields.standing.textContent = 'Not linked';
        fields.standingMessage.textContent = 'The Miner exposes standing only through an exact, signed account binding.';
      }

      async function checkMesh() {
        if (!identity || !identity.identityId || !page.isConnected) return;
        var id = identity.identityId;
        var token = ++generation;
        if (controller) controller.abort();
        controller = new AbortController();
        var timeout = window.setTimeout(function () { controller.abort(); }, 10000);
        fields.check.disabled = true;
        fields.meshDetail.hidden = true;
        fields.meshStatus.textContent = 'Checking local Miner…';
        fields.meshMessage.textContent = 'Reading one exact identity record; no account list or balance query is performed.';
        try {
          var response = await fetch(LOCAL_MINER + '/explorer/v1/record', {
            method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json' },
            body: JSON.stringify({ sourceId: 'identities', recordId: id }),
            signal: controller.signal, cache: 'no-store'
          });
          var payload = await response.json().catch(function () { return null; });
          if (!response.ok) throw new Error(payload && payload.error && payload.error.message || 'Miner returned HTTP ' + response.status + '.');
          var record = explorerRecord(payload, id);
          if (record.verification?.state !== 'verified') throw new Error('The local Miner returned an identity record without verified provenance.');
          if (token !== generation || !page.isConnected || !identity || identity.identityId !== id) return;
          var identityBody = record.record && typeof record.record === 'object' ? record.record : {};
          var accountId = typeof identityBody.accountId === 'string' && identityBody.accountId.trim() ? identityBody.accountId.trim() : '';
          var account = null;
          if (accountId) {
            var accountResponse = await fetch(LOCAL_MINER + '/explorer/v1/record', {
              method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json' },
              body: JSON.stringify({ sourceId: 'accounts', recordId: accountId }),
              signal: controller.signal, cache: 'no-store'
            });
            var accountPayload = await accountResponse.json().catch(function () { return null; });
            if (!accountResponse.ok) throw new Error(accountPayload && accountPayload.error && accountPayload.error.message || 'The bound account could not be read.');
            account = explorerRecord(accountPayload, accountId);
            if (account.verification?.state !== 'verified') throw new Error('The bound account record is not verified.');
          }
          if (token !== generation || !page.isConnected || !identity || identity.identityId !== id) return;
          fields.meshStatus.textContent = 'Reported by local Miner';
          fields.meshMessage.textContent = account ? 'The identity matched an exact account binding, and the Miner returned its signed standing. This still does not establish FXN holdings or Credits.' : 'The returned record matched this identity ID. No signed account binding was present, so standing remains unavailable.';
          fields.meshRecord.textContent = text(record.id);
          fields.meshVerification.textContent = text(record.verification && record.verification.state);
          fields.meshUpdated.textContent = text(record.updatedAt, 'Not dated');
          fields.meshProvenance.textContent = text(record.provenance && (record.provenance.source || record.provenance.location), 'Not reported');
          var accountBody = account && account.record && typeof account.record === 'object' ? account.record : {};
          var standing = accountBody.standing || accountBody.status || '';
          fields.standing.textContent = account ? (standing ? text(standing) : 'Verified account · no status') : 'Not linked';
          fields.standingMessage.textContent = account ? ('Exact account ' + accountId + ' · ' + (standing ? 'signed standing returned by the Miner.' : 'record returned without a standing field.')) : 'The identity record has no signed account binding.';
          fields.meshDetail.hidden = false;
        } catch (error) {
          if (token !== generation || !page.isConnected || !identity || identity.identityId !== id) return;
          fields.meshStatus.textContent = error && error.name === 'AbortError' ? 'Check timed out' : 'Not connected';
          fields.meshMessage.textContent = error && error.name === 'AbortError' ? 'The local Miner did not respond within 10 seconds.' : error instanceof TypeError ? 'Cannot reach the local Miner. Check that it is running and allows this site origin.' : text(error && error.message, 'The local Miner could not verify this identity.');
        } finally {
          window.clearTimeout(timeout);
          if (token === generation && page.isConnected) { controller = null; fields.check.disabled = !identity; }
        }
      }

      function renderIdentity(next) {
        identity = next;
        var unlocked = identity && ArkUI.accountSession.isUnlocked();
        var authenticated = identity && ArkUI.cmsSession && ArkUI.cmsSession.isAuthenticated(identity.publicKeyB64);
        page.dataset.session = identity ? (unlocked ? 'verified-local' : 'remembered') : 'signed-out';
        page.querySelector('.account-auth .account-kicker').textContent = identity ? '02 / SESSION' : '01 / SESSION';
        page.querySelector('.account-state').hidden = !identity;
        page.querySelector('.account-live').hidden = !identity;
        var name = identity && identity.displayName || 'Your account.';
        page.querySelector('#account-title').textContent = name;
        page.querySelector('[data-account-avatar]').textContent = identity ? name.slice(0, 2).toUpperCase() : '↗';
        page.querySelector('[data-account-status]').textContent = identity ? (unlocked ? (authenticated ? 'Signed in · signing key unlocked' : 'Signing key verified locally') : (authenticated ? 'Signed in · signing key unavailable' : 'Identity details saved · not signed in')) : 'Signed out';
        page.querySelector('[data-account-intro]').textContent = identity ? (unlocked ? 'Your identity, ready for this session.' : 'Your name and public identity details are saved here. Your Auth Kit is not saved.') : 'Your identity is yours. Open your Auth Kit to connect it to this session.';
        page.querySelector('[data-account-session-title]').textContent = identity ? (authenticated ? 'You’re signed in.' : (unlocked ? 'Your key is unlocked.' : 'Select your Auth Kit again')) : 'Connect your identity';
        page.querySelector('[data-account-session-description]').textContent = identity ? (authenticated ? 'Your host session is active. Unlock your Auth Kit only when you need to sign or publish.' : unlocked ? 'Your key is available for this browser session.' : 'Select the .auth.flx file from your device, then enter its PIN and password if you set one. Saved identity details alone cannot sign or grant CMS access.') : 'Use your recovery file to sign in on this device.';
        var localEditor = ArkUI.cmsSession && ArkUI.cmsSession.isLocalDevelopment && ArkUI.cmsSession.isLocalDevelopment();
        page.querySelector('[data-account-cms-open]').hidden = !localEditor;
        page.querySelector('[data-account-cms-local]').hidden = !localEditor;
        page.querySelector('[data-account-cms-status]').textContent = ArkUI.cmsSession && (localEditor || authenticated) ? ArkUI.cmsSession.status() : '';
        var chooseKit = page.querySelector('[data-account-auth] button');
        if (chooseKit && /^(Choose Auth Kit|Unlock Auth Kit|Select Auth Kit)$/.test((chooseKit.textContent || '').trim())) {
          chooseKit.textContent = identity && !unlocked ? 'Select Auth Kit' : 'Choose Auth Kit';
          chooseKit.setAttribute('aria-label', chooseKit.textContent);
        }
        fields.id.textContent = identity && identity.identityId || '—';
        fields.root.textContent = identity && identity.publicKeyB64 || '—';
        fields.wallet.textContent = identity && identity.walletAddress || 'Not recorded in this kit';
        fields.security.textContent = identity && identity.securityProfile || '—';
        fields.verification.textContent = identity ? (unlocked ? 'Root key verified against your recovery phrase on this device.' : 'Saved public details only. Select and unlock your Auth Kit to verify this identity for the current session.') : 'Unlock a kit to verify its root against its recovery phrase.';
        page.querySelector('[data-account-forget]').hidden = !identity || unlocked;
        page.querySelector('[data-account-forget]').textContent = 'Forget saved identity details';
        var storageNotice = page.querySelector('[data-account-storage-notice]');
        storageNotice.textContent = ArkUI.localIdentity.storageError();
        storageNotice.hidden = !storageNotice.textContent;
        fields.check.disabled = !identity;
        resetMesh(identity ? undefined : 'Sign in to check the verified identity against the local Miner.');
      }
      // One panel owns the signer. A separate public pointer restores account
      // display state eagerly on every route, like chat.deadark.com's provider.
      if (!ArkUI.accountSession) {
        var container = document.createElement('div');
        var preservingIdentity = false;
        var auth = ArkAdminAuth.create({ container: container, product: 'DEFXN', onChange: function (next) {
          if (!preservingIdentity) {
            if (next) { ArkUI.localIdentity.set(next); if (ArkUI.cmsSession) ArkUI.cmsSession.connect(next).then(function () { ArkUI.localIdentity.refresh(); }); }
            else { ArkUI.localIdentity.clear(); if (ArkUI.cmsSession) ArkUI.cmsSession.revoke(); }
          }
          ArkUI.localIdentity.refresh();
        } });
        function isUnlocked() {
          var pointer = ArkUI.localIdentity.current();
          var signer = auth.current();
          return !!(pointer && signer && pointer.identityId === (signer.identityId || signer.publicKeyB64) && pointer.publicKeyB64 === signer.publicKeyB64);
        }
        function lock() {
          preservingIdentity = true;
          try { auth.signOut(); } finally { preservingIdentity = false; }
        }
        ArkUI.accountSession = { container: container, isUnlocked: isUnlocked,
          signOut: function () { auth.signOut(); }, current: function () { return auth.current(); } };
        ArkUI.localIdentity.subscribe(function () {
          if (auth.current() && !isUnlocked()) lock();
          if (ArkUI.refreshAccountNav) ArkUI.refreshAccountNav();
        });
        window.addEventListener('pagehide', function () {
          preservingIdentity = true;
          try { auth.dispose(); } finally { preservingIdentity = false; }
          // Disposing a root handle is not signing out of the remembered account.
          ArkUI.localIdentity.refresh();
        });
      }
      var session = ArkUI.accountSession;
      page.querySelector('[data-account-auth]').appendChild(session.container);
      var unsubscribe = ArkUI.localIdentity.subscribe(renderIdentity);
      page.querySelector('[data-account-cms-open]').addEventListener('click', function (event) {
        if ((ArkUI.cmsSession && ArkUI.cmsSession.isLocalDevelopment && ArkUI.cmsSession.isLocalDevelopment()) || session.isUnlocked() || (ArkUI.cmsSession && ArkUI.cmsSession.isAuthenticated(identity && identity.publicKeyB64))) return;
        event.preventDefault();
        page.querySelector('[data-account-cms-status]').textContent = identity
          ? 'Only your identity details are saved. Select your .auth.flx file again and enter its PIN and password if you set one before opening the CMS.'
          : 'Sign in with your Auth Kit here before opening the CMS.';
        var pin = session.container.querySelector('input:not([type="file"])');
        if (pin && pin.focus) { pin.focus(); return; }
        var unlock = session.container.querySelector('button');
        if (unlock && unlock.click) unlock.click();
        else if (unlock && unlock.focus) unlock.focus();
      });
      page.querySelector('[data-account-forget]').addEventListener('click', session.signOut);
      if (fields.check) fields.check.addEventListener('click', checkMesh);
      page.arkDispose = function () { generation += 1; if (controller) controller.abort(); unsubscribe(); session.container.remove(); };
      return page;
    }
  };
})();

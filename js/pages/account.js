/* Local Auth Kit account view. This page never uploads the kit or persists a signing key. */
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
      page.className = 'ark-page learning-page account-page';
      page.setAttribute('aria-labelledby', 'account-title');
      page.innerHTML = '<div class="account-shell"><header class="account-hero"><p class="account-kicker">FLUX / YOUR ACCOUNT</p>' +
        '<h1 id="account-title">Your identity, in context.</h1>' +
        '<p>Open your Auth Kit locally to inspect the identity it names. This browser does not send your recovery file, PIN or signing key to the mesh.</p></header>' +
        '<div class="account-layout"><section class="account-auth" aria-label="Sign in with Auth Kit"><div data-account-auth></div></section>' +
        '<section class="account-state" aria-live="polite"><p class="account-kicker">CURRENT SESSION</p><h2 data-account-heading>Not signed in</h2>' +
        '<dl><div><dt>Identity ID</dt><dd data-account-id>—</dd></div><div><dt>Root key</dt><dd data-account-root>—</dd></div>' +
        '<div><dt>Wallet address in Auth Kit</dt><dd data-account-wallet>—</dd></div><div><dt>Security profile</dt><dd data-account-security>—</dd></div></dl>' +
        '<p data-account-verification>Unlock a kit to verify its root against its recovery phrase.</p></section></div>' +
        '<section class="account-live" aria-labelledby="account-live-title"><p class="account-kicker">LIVE ACCOUNT DATA</p><h2 id="account-live-title">What the mesh can confirm</h2>' +
        '<div class="account-mesh-check" aria-live="polite"><div><strong data-account-mesh-status>Not checked</strong><p data-account-mesh-message>After sign-in, check this identity against the local Miner by exact ID.</p></div><button type="button" data-account-mesh-check disabled>Check local Miner</button></div>' +
        '<details class="account-mesh-detail" data-account-mesh-detail hidden><summary>Identity record details</summary><dl><div><dt>Record</dt><dd data-account-mesh-record>—</dd></div><div><dt>Verification</dt><dd data-account-mesh-verification>—</dd></div><div><dt>Updated</dt><dd data-account-mesh-updated>—</dd></div><div><dt>Provenance</dt><dd data-account-mesh-provenance>—</dd></div></dl></details>' +
        '<div class="account-live-grid"><div><span>FXN holdings</span><strong>Not connected</strong><p>No verified balance source is wired to this identity.</p></div>' +
        '<div><span>Credits</span><strong>Not connected</strong><p>Credits are identity-bound and non-transferable; no live balance is claimed here.</p></div>' +
        '<div><span>Mesh standing</span><strong data-account-standing>Not linked</strong><p data-account-standing-message>The Miner exposes standing only through an exact, signed account binding.</p></div></div>' +
        '<p class="account-next">To inspect live Miner records now, use the <a href="#/explorer">local Mesh Explorer</a>. A displayed Auth Kit wallet address is not proof of current holdings.</p></section></div>';
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

      var auth = ArkAdminAuth.create({ container: page.querySelector('[data-account-auth]'), product: 'Flux Protocol', onChange: function (next) {
        identity = next;
        fields.heading.textContent = identity ? identity.displayName || 'Identity verified' : 'Not signed in';
        fields.id.textContent = identity && identity.identityId || '—';
        fields.root.textContent = identity && identity.publicKeyB64 || '—';
        fields.wallet.textContent = identity && identity.walletAddress || 'Not recorded in this kit';
        fields.security.textContent = identity && identity.securityProfile || '—';
        fields.verification.textContent = identity ? 'Recovery phrase and root key matched locally. No mesh account or balance has been verified.' : 'Unlock a kit to verify its root against its recovery phrase.';
        fields.check.disabled = !identity;
        resetMesh(identity ? undefined : 'Sign in to check the verified identity against the local Miner.');
      } });
      if (fields.check) fields.check.addEventListener('click', checkMesh);
      page.arkDispose = function () { generation += 1; if (controller) controller.abort(); auth.dispose(); };
      return page;
    }
  };
})();

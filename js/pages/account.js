/* Local Auth Kit account view. Public account state survives reload; root signing authority stays in memory. */
(function () {
  'use strict';
  /* A real production endpoint by default -- the hardcoded 127.0.0.1:8766
     this used to be unconditionally only ever answers a miner running on the
     SAME machine as the browser, so this check was silently dead for every
     visitor except someone running a local miner on localhost themselves.
     Still prefers an actual local miner when the page itself is local/dev. */
  var HOSTNAME = typeof location !== 'undefined' && location.hostname || 'localhost';
  var LOCAL_MINER = /^(127\.0\.0\.1|localhost)$/.test(HOSTNAME) ? 'http://127.0.0.1:8766' : 'https://cd1.defxn.com';
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
      /* Home's shape: the identity on the left, one card on the right whose
         views (session, wallet, contacts, mesh) swap in place, and a rail of
         live numbers along the bottom that opens the matching view. */
      page.innerHTML = '<div class="account-shell"><header class="account-hero"><p class="account-promise">Your identity · your keys</p>' +
        '<div class="account-profile"><div class="account-avatar" data-account-avatar aria-hidden="true">↗</div><div class="account-heading"><h1 id="account-title">Own your identity.</h1><span class="account-status" data-account-status>Signed out</span></div></div>' +
        '<p class="account-intro" data-account-intro>No custodial account and no password reset. One file holds your keys, and only you hold the file.</p>' +
        '<ol class="account-flow" data-account-opens aria-label="How signing in works"><li><span class="account-flow-mark" data-account-icon="document"></span><strong>Your Auth Kit</strong><small>One .auth.flx file on your device</small></li><li><span class="account-flow-mark" data-account-icon="authority"></span><strong>Unlocked here</strong><small>Your PIN never leaves this browser</small></li><li><span class="account-flow-mark" data-account-icon="layers"></span><strong>Everything opens</strong><small>Wallet, contacts and publishing</small></li></ol>' +
        '<section class="account-state" aria-label="Identity details" hidden><dl><div><dt>Identity ID</dt><dd data-account-id>—</dd></div><div><dt>Root key</dt><dd data-account-root>—</dd></div>' +
        '<div><dt>Wallet address</dt><dd data-account-wallet>—</dd></div><div><dt>Security</dt><dd data-account-security>—</dd></div></dl>' +
        '<p data-account-verification>Unlock a kit to verify its root against its recovery phrase.</p></section></header>' +
        '<section class="account-card" aria-label="Account">' +
        '<nav class="account-tabs" role="tablist" aria-label="Account views" hidden>' +
        '<button type="button" role="tab" data-account-tab="session" aria-selected="true">Session</button>' +
        '<button type="button" role="tab" data-account-tab="defi" aria-selected="false">Wallet</button>' +
        '<button type="button" role="tab" data-account-tab="contacts" aria-selected="false">Contacts</button>' +
        '<button type="button" role="tab" data-account-tab="mesh" aria-selected="false">Mesh</button>' +
        '</nav>' +
        '<section class="account-auth" data-account-panel="session" aria-label="Account session"><nav class="account-tabs account-signin-tabs" data-account-create-toggle-row aria-label="Sign in or create"><button type="button" aria-pressed="true" data-account-create-back>Sign in</button><button type="button" aria-pressed="false" data-account-create-toggle>New identity</button></nav><div data-account-session-main><h2 class="account-session-title" data-account-session-title>Open your Auth Kit.</h2><p class="account-session-description" data-account-session-description>Choose the recovery file on this device to continue.</p><div data-account-auth></div>' +
        '<button type="button" data-account-forget hidden>Sign out</button><p class="account-storage-notice" data-account-storage-notice role="status" hidden></p>' +
        '<div class="account-cms"><a href="/bundle-deployer" data-scene-link="bundledeployer">Deploy a bundle →</a><a href="/account/domains" data-scene-link="account/domains">Your domains →</a><a hidden href="/admin" target="_blank" rel="opener" data-account-cms-open>Open CMS ↗</a><span hidden data-account-cms-local>Local editor available</span><span data-account-cms-status role="status"></span></div>' +
        '<p class="account-session-note">Nothing secret is stored here. This browser keeps only your name and public details; the kit, PIN and key stay on your device.</p></div>' +
        '<div class="account-create" data-account-create-view hidden><div data-account-create></div></div></section>' +
        '<section class="account-live" data-account-panel="defi" aria-labelledby="account-live-title" hidden><h2 class="account-visually-hidden" id="account-live-title">Wallet</h2>' +
        '<div class="account-wallet" data-account-wallet-view="home"><div class="account-balances"><article class="account-balance" data-account-fxn><small>FXN</small><strong data-account-fxn-balance>—</strong><span data-account-fxn-message>Sign in to check</span></article>' +
        '<article class="account-balance" data-account-credits><small>Credits</small><strong data-account-credits-balance>—</strong><span data-account-credits-message>Sign in to check</span></article></div>' +
        '<div class="account-transfers"><h3>Incoming FXN</h3><div data-account-fxn-pending><p class="account-contacts-empty">No pending transfers to you.</p></div>' +
        '<div data-account-fxn-sent-block hidden><h3>Sent from this tab</h3><div data-account-fxn-sent></div></div></div>' +
        '<div class="account-wallet-actions"><button type="button" class="palette-solid" data-account-wallet-open="send" disabled>Send FXN</button><button type="button" data-account-wallet-open="spend">Authorize Credits</button><button type="button" class="account-quiet" data-account-fxn-refresh>Refresh</button></div></div>' +
        '<form data-account-wallet-view="send" data-account-fxn-send-form class="account-wallet-form" hidden><button type="button" class="account-back" data-account-wallet-back>← Wallet</button><h3>Send FXN</h3><p>The recipient accepts it, then you complete it here.</p><label for="fxnSendRecipient">Recipient public key</label><input id="fxnSendRecipient" type="text" autocomplete="off" data-account-fxn-send-recipient placeholder="Recipient public key" /><label for="fxnSendAmount">Amount (nano-FXN)</label><input id="fxnSendAmount" type="text" autocomplete="off" data-account-fxn-send-amount placeholder="1000000000" /><button type="submit" class="palette-solid" data-account-fxn-send-submit disabled>Propose transfer</button></form>' +
        '<form data-account-wallet-view="spend" data-account-credits-request-form class="account-wallet-form" hidden><button type="button" class="account-back" data-account-wallet-back>← Wallet</button><h3>Authorize Credits</h3><p>Nothing moves until that resolver redeems it.</p><label for="creditsResolver">Resolver public key</label><input id="creditsResolver" type="text" autocomplete="off" data-account-credits-resolver placeholder="Resolver public key" /><label for="creditsAmount">Amount</label><input id="creditsAmount" type="text" autocomplete="off" data-account-credits-amount placeholder="200" /><label for="creditsService">What for (optional)</label><input id="creditsService" type="text" autocomplete="off" data-account-credits-service /><button type="submit" class="palette-solid" data-account-credits-submit>Authorize</button></form>' +
        '<p class="account-line" data-account-fxn-send-status role="status" aria-live="polite"></p><p class="account-line" data-account-credits-status role="status" aria-live="polite"></p>' +
        '<p class="account-next">Read live from the mesh registry, never estimated. Raw records in the <a href="/explore" data-scene-link="explorer">Mesh Explorer</a>.</p></section>' +
        '<section class="account-contacts" data-account-panel="contacts" aria-labelledby="account-contacts-title" hidden><div data-contacts-view="list"><h2 class="account-visually-hidden" id="account-contacts-title">Contacts</h2>' +
        '<form data-contacts-search-form class="account-contacts-form"><label for="contactsSearchQuery">Find an identity</label><input id="contactsSearchQuery" type="text" autocomplete="off" placeholder="Name or identity ID" /><button type="submit">Search</button></form>' +
        '<p class="account-line" data-contacts-status role="status" aria-live="polite"></p><ul data-contacts-results class="account-contacts-list account-contacts-results" hidden></ul>' +
        '<div class="account-contacts-lists"><div><h3>Invites to you <b data-contacts-incoming-count>0</b></h3><ul data-contacts-incoming class="account-contacts-list"><li class="account-contacts-empty">None pending.</li></ul></div><div class="account-contacts-connected"><h3>Contacts <b data-contacts-accepted-count>0</b></h3><ul data-contacts-accepted class="account-contacts-list"><li class="account-contacts-empty">No accepted contacts yet.</li></ul></div><div><h3>Sent <b data-contacts-outgoing-count>0</b></h3><ul data-contacts-outgoing class="account-contacts-list"><li class="account-contacts-empty">None pending.</li></ul></div></div>' +
        '<button type="button" class="account-quiet" data-contacts-refresh>Refresh</button></div>' +
        '<article class="account-contact-detail" data-contacts-view="detail" hidden><button type="button" class="account-back" data-contact-back>← All contacts</button><header><div class="account-contact-avatar" data-contact-avatar aria-hidden="true">ID</div><div><h2 data-contact-name>Identity</h2><span data-contact-state>Connection</span></div></header><dl><div><dt>Identity ID</dt><dd data-contact-id>—</dd></div><div><dt>Public ID</dt><dd data-contact-public-id>—</dd></div><div><dt>Visibility</dt><dd data-contact-visibility>—</dd></div><div><dt>Updated</dt><dd data-contact-updated>—</dd></div></dl><p data-contact-bio>No public profile details are available for this identity.</p><a href="/explore" data-scene-link="explorer">Inspect mesh records →</a></article></section>' +
        '<section class="account-mesh" data-account-panel="mesh" aria-label="Mesh standing" hidden><div class="account-mesh-check" aria-live="polite"><small>Identity binding</small><strong data-account-mesh-status>Not checked</strong><p data-account-mesh-message>Check this identity against the configured Miner by exact ID.</p><button type="button" data-account-mesh-check disabled>Check Miner</button></div>' +
        '<div class="account-standing"><small>Mesh standing</small><strong data-account-standing>Not linked</strong><span data-account-standing-message>Requires an exact signed binding</span></div>' +
        '<dl class="account-mesh-detail" data-account-mesh-detail hidden><div><dt>Record</dt><dd data-account-mesh-record>—</dd></div><div><dt>Verification</dt><dd data-account-mesh-verification>—</dd></div><div><dt>Updated</dt><dd data-account-mesh-updated>—</dd></div><div><dt>Provenance</dt><dd data-account-mesh-provenance>—</dd></div></dl></section></section>' +
        '<aside class="account-rail" aria-label="Your account at a glance" hidden>' +
        '<button type="button" class="account-rail-item" data-needs-key data-account-go="defi"><small>FXN</small><strong data-account-rail-fxn>—</strong></button>' +
        '<button type="button" class="account-rail-item" data-needs-key data-account-go="defi"><small>Credits</small><strong data-account-rail-credits>—</strong></button>' +
        '<button type="button" class="account-rail-item" data-needs-key data-account-go="contacts"><small>Contacts</small><strong data-account-overview-contacts>—</strong></button>' +
        '<button type="button" class="account-rail-item" data-needs-key data-account-go="contacts"><small>Invites</small><strong data-account-rail-invites>—</strong></button>' +
        '<a class="account-rail-item" href="/account/domains" data-scene-link="account/domains"><small>Domains</small><strong data-account-rail-domains>0</strong></a>' +
        '<button type="button" class="account-rail-item" data-account-go="mesh"><small>Standing</small><strong data-account-overview-mesh>Not checked</strong></button>' +
        '<a class="account-rail-link" href="/explore" data-scene-link="explorer"><small>Exact-ID reads only</small>Mesh Explorer →</a></aside></div>';
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
        standingMessage: page.querySelector('[data-account-standing-message]'),
        fxnBalance: page.querySelector('[data-account-fxn-balance]'),
        fxnMessage: page.querySelector('[data-account-fxn-message]'),
        fxnPending: page.querySelector('[data-account-fxn-pending]'),
        fxnSendForm: page.querySelector('[data-account-fxn-send-form]'),
        fxnSendRecipient: page.querySelector('[data-account-fxn-send-recipient]'),
        fxnSendAmount: page.querySelector('[data-account-fxn-send-amount]'),
        fxnSendSubmit: page.querySelector('[data-account-fxn-send-submit]'),
        fxnSendStatus: page.querySelector('[data-account-fxn-send-status]'),
        fxnRefresh: page.querySelector('[data-account-fxn-refresh]'),
        creditsBalance: page.querySelector('[data-account-credits-balance]'),
        creditsMessage: page.querySelector('[data-account-credits-message]'),
        creditsRequestForm: page.querySelector('[data-account-credits-request-form]'),
        creditsResolver: page.querySelector('[data-account-credits-resolver]'),
        creditsAmount: page.querySelector('[data-account-credits-amount]'),
        creditsService: page.querySelector('[data-account-credits-service]'),
        creditsStatus: page.querySelector('[data-account-credits-status]'),
        sendOpen: page.querySelector('[data-account-wallet-open="send"]'),
        fxnSent: page.querySelector('[data-account-fxn-sent]'),
        fxnSentBlock: page.querySelector('[data-account-fxn-sent-block]'),
        railFxn: page.querySelector('[data-account-rail-fxn]'),
        railCredits: page.querySelector('[data-account-rail-credits]'),
        railInvites: page.querySelector('[data-account-rail-invites]'),
        railDomains: page.querySelector('[data-account-rail-domains]'),
        overviewMesh: page.querySelector('[data-account-overview-mesh]'),
        overviewContacts: page.querySelector('[data-account-overview-contacts]')
      };
      /* Zero-scroll: the card shows one view at a time (session, wallet,
         contacts, mesh) and each view's forms and details replace it in
         place, so nothing past the identity adds height. */
      var tabNav = page.querySelector('.account-tabs');
      var tabButtons = page.querySelectorAll ? Array.prototype.slice.call(page.querySelectorAll('[data-account-tab]')) : [];
      var panels = page.querySelectorAll ? Array.prototype.slice.call(page.querySelectorAll('[data-account-panel]')) : [];
      var activeTab = 'session';
      var lastSessionState = '';
      function panelAvailable(name) {
        if (name === 'session') return true;
        if (name === 'defi' || name === 'mesh') return !!identity;
        if (name === 'contacts') return !!(identity && ArkUI.accountSession.isUnlocked());
        return false;
      }
      function applyTabs() {
        if (!tabButtons.length) {
          page.querySelector('.account-live').hidden = !identity;
          return;
        }
        var available = tabButtons.filter(function (button) { return panelAvailable(button.getAttribute('data-account-tab')); });
        tabNav.hidden = available.length < 2;
        if (!panelAvailable(activeTab)) activeTab = 'session';
        tabButtons.forEach(function (button) {
          var name = button.getAttribute('data-account-tab');
          var open = panelAvailable(name);
          button.hidden = !open;
          button.setAttribute('aria-selected', String(open && name === activeTab));
        });
        panels.forEach(function (panel) {
          var name = panel.getAttribute('data-account-panel');
          panel.hidden = !(panelAvailable(name) && name === activeTab);
        });
      }
      function openTab(name) {
        if (!panelAvailable(name)) name = 'session';
        activeTab = name;
        applyTabs();
      }
      tabButtons.forEach(function (button) {
        button.addEventListener('click', function () { openTab(button.getAttribute('data-account-tab')); });
      });
      Array.prototype.forEach.call(page.querySelectorAll ? page.querySelectorAll('[data-account-go]') : [], function (button) {
        button.addEventListener('click', function () { openTab(button.getAttribute('data-account-go')); });
      });
      /* Wallet sub-views: the send and authorize forms take the wallet's place. */
      var walletViews = page.querySelectorAll ? Array.prototype.slice.call(page.querySelectorAll('[data-account-wallet-view]')) : [];
      function showWallet(name) {
        walletViews.forEach(function (view) { view.hidden = view.getAttribute('data-account-wallet-view') !== name; });
        var first = name === 'home' ? null : page.querySelector('[data-account-wallet-view="' + name + '"] input');
        if (first && first.focus) first.focus();
      }
      Array.prototype.forEach.call(page.querySelectorAll ? page.querySelectorAll('[data-account-wallet-open]') : [], function (button) {
        button.addEventListener('click', function () { showWallet(button.getAttribute('data-account-wallet-open')); });
      });
      Array.prototype.forEach.call(page.querySelectorAll ? page.querySelectorAll('[data-account-wallet-back]') : [], function (button) {
        button.addEventListener('click', function () { showWallet('home'); });
      });
      function setSendable(enabled) {
        fields.fxnSendSubmit.disabled = !enabled;
        if (fields.sendOpen) fields.sendOpen.disabled = !enabled;
      }
      function syncRail() {
        if (fields.railFxn) fields.railFxn.textContent = fields.fxnBalance.textContent;
        if (fields.railCredits) fields.railCredits.textContent = fields.creditsBalance.textContent;
        var standing = fields.standing.textContent, mesh = fields.meshStatus.textContent;
        if (fields.overviewMesh) fields.overviewMesh.textContent = standing !== 'Not linked' ? standing : (mesh === 'Reported by local Miner' ? 'Not linked' : mesh.replace(/ local Miner…$/, '…'));
      }

      var contactsFields = {
        section: page.querySelector('.account-contacts'),
        searchForm: page.querySelector('[data-contacts-search-form]'),
        searchInput: page.querySelector('#contactsSearchQuery'),
        results: page.querySelector('[data-contacts-results]'),
        status: page.querySelector('[data-contacts-status]'),
        accepted: page.querySelector('[data-contacts-accepted]'),
        incoming: page.querySelector('[data-contacts-incoming]'),
        outgoing: page.querySelector('[data-contacts-outgoing]'),
        refresh: page.querySelector('[data-contacts-refresh]'),
        acceptedCount: page.querySelector('[data-contacts-accepted-count]'),
        incomingCount: page.querySelector('[data-contacts-incoming-count]'),
        outgoingCount: page.querySelector('[data-contacts-outgoing-count]'),
        listView: page.querySelector('[data-contacts-view="list"]'),
        detailView: page.querySelector('[data-contacts-view="detail"]'),
        back: page.querySelector('[data-contact-back]'),
        detailAvatar: page.querySelector('[data-contact-avatar]'),
        detailName: page.querySelector('[data-contact-name]'),
        detailState: page.querySelector('[data-contact-state]'),
        detailId: page.querySelector('[data-contact-id]'),
        detailPublicId: page.querySelector('[data-contact-public-id]'),
        detailVisibility: page.querySelector('[data-contact-visibility]'),
        detailUpdated: page.querySelector('[data-contact-updated]'),
        detailBio: page.querySelector('[data-contact-bio]')
      };
      var identity = null;
      var generation = 0;
      var controller = null;
      var contactsGeneration = 0;
      var contactsPollTimer = null;
      var CONTACTS_POLL_MS = 15000;
      var contactProfiles = Object.create(null);
      var contactStates = Object.create(null);

      function resetMesh(message) {
        generation += 1;
        if (controller) controller.abort();
        controller = null;
        fields.meshStatus.textContent = 'Not checked';
        fields.meshMessage.textContent = message || 'After sign-in, check this identity against the local Miner by exact ID.';
        fields.meshDetail.hidden = true;
        fields.meshRecord.textContent = '—'; fields.meshVerification.textContent = '—';
        fields.meshUpdated.textContent = '—'; fields.meshProvenance.textContent = '—';
        fields.standing.textContent = 'Not linked';
        fields.standingMessage.textContent = 'The Miner exposes standing only through an exact, signed account binding.';
        syncRail();
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
        syncRail();
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
          var identityBody = record.fields && record.fields.sourceRecord && typeof record.fields.sourceRecord === 'object' ? record.fields.sourceRecord : {};
          var accountId = typeof identityBody.accountId === 'string' && identityBody.accountId.trim() ? identityBody.accountId.trim() : '';
          var account = null;
          if (accountId) {
            var accountResponse = await fetch(LOCAL_MINER + '/explorer/v1/record', {
              method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json' },
              body: JSON.stringify({ sourceId: 'accounts', recordId: accountId, scope: { accountId: accountId } }),
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
          var accountBody = account && account.fields && account.fields.sourceRecord && typeof account.fields.sourceRecord === 'object' ? account.fields.sourceRecord : {};
          var standing = accountBody.standing || accountBody.status || '';
          fields.standing.textContent = account ? (standing ? text(standing) : 'Verified account · no status') : 'Not linked';
          fields.standingMessage.textContent = account ? ('Exact account ' + accountId + ' · ' + (standing ? 'signed standing returned by the Miner.' : 'record returned without a standing field.')) : 'The identity record has no signed account binding.';
          fields.meshDetail.hidden = false;
          syncRail();
        } catch (error) {
          if (token !== generation || !page.isConnected || !identity || identity.identityId !== id) return;
          fields.meshStatus.textContent = error && error.name === 'AbortError' ? 'Check timed out' : 'Not connected';
          fields.meshMessage.textContent = error && error.name === 'AbortError' ? 'The local Miner did not respond within 10 seconds.' : error instanceof TypeError ? 'Cannot reach the local Miner. Check that it is running and allows this site origin.' : text(error && error.message, 'The local Miner could not verify this identity.');
          syncRail();
        } finally {
          window.clearTimeout(timeout);
          if (token === generation && page.isConnected) { controller = null; fields.check.disabled = !identity; }
        }
      }

      function escapeHtml(value) { return String(value).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }

      /* ---- FXN balance + mesh Credits (flx/flux-spec/spec/
         mesh-value-registries-v1.md) -- real reads against the live
         registry, never estimated. Pre-genesis/pre-issuer this is
         honestly empty for every identity; the copy below says so
         rather than implying a balance exists. */
      var valueRegistriesGeneration = 0;
      var ownValueObjects = [];
      /* Transfers this tab proposed. The registry has no "my outgoing
         agreements" read, so these live only in memory: once the recipient
         publishes their output, Complete sends the fulfillment that moves
         the value (valueRegistries.fulfillFxnTransfer). */
      var sentTransfers = [];

      function resetValueRegistries(message) {
        valueRegistriesGeneration += 1;
        fields.fxnBalance.textContent = '—';
        fields.fxnMessage.textContent = message || 'Sign in to check';
        fields.creditsBalance.textContent = '—';
        fields.creditsMessage.textContent = message || 'Sign in to check';
        fields.fxnPending.innerHTML = '<p class="account-contacts-empty">No pending transfers to you.</p>';
        setSendable(false);
        ownValueObjects = [];
        sentTransfers = [];
        renderFxnSent();
        syncRail();
      }

      function renderFxnPending(pending) {
        if (!pending.length) { fields.fxnPending.innerHTML = '<p class="account-contacts-empty">No pending transfers to you.</p>'; return; }
        fields.fxnPending.innerHTML = pending.map(function (agreement) {
          return '<p class="account-transfer"><span><strong>' + escapeHtml(agreement.amount) + ' ' + escapeHtml(agreement.asset) + '</strong><small>' + escapeHtml(String(agreement.cid).slice(0, 12)) + '…</small></span><button type="button" data-account-fxn-accept="' + escapeHtml(agreement.cid) + '">Accept</button></p>';
        }).join('');
      }

      function renderFxnSent() {
        if (!fields.fxnSent) return;
        if (fields.fxnSentBlock) fields.fxnSentBlock.hidden = !sentTransfers.length;
        fields.fxnSent.innerHTML = sentTransfers.map(function (item) {
          var agreement = item.agreement;
          var action = item.output ? '<button type="button" data-account-fxn-complete="' + escapeHtml(agreement.cid) + '">Complete</button>' : '<em>Waiting for the recipient</em>';
          return '<p class="account-transfer"><span><strong>' + escapeHtml(agreement.amount) + ' ' + escapeHtml(agreement.asset) + '</strong><small>' + escapeHtml(String(agreement.cid).slice(0, 12)) + '…</small></span>' + action + '</p>';
        }).join('');
      }

      async function checkSentTransfers(who, token) {
        await Promise.all(sentTransfers.map(async function (item) {
          if (item.output) return;
          try { item.output = await window.ArkUI.valueRegistries.pollForFulfillableOutput(who, undefined, item.agreement); } catch (_error) {}
        }));
        if (token === valueRegistriesGeneration && page.isConnected) renderFxnSent();
      }

      async function loadValueRegistries() {
        var who = ArkUI.accountSession.current();
        if (!who || !window.ArkUI.valueRegistries || !page.isConnected) return;
        var token = ++valueRegistriesGeneration;
        fields.fxnMessage.textContent = 'Checking the live registry…';
        fields.creditsMessage.textContent = 'Checking the live registry…';
        try {
          var fxn = await window.ArkUI.valueRegistries.getFxnBalance(who);
          if (token !== valueRegistriesGeneration || !page.isConnected) return;
          ownValueObjects = fxn.records;
          var fxnKeys = Object.keys(fxn.balancesByAsset);
          fields.fxnBalance.textContent = fxnKeys.length ? fxnKeys.map(function (asset) { return fxn.balancesByAsset[asset] + ' ' + asset; }).join(', ') : '0';
          fields.fxnMessage.textContent = fxnKeys.length ? 'Unspent value objects you own: ' + fxn.records.length + '.' : 'No FXN has been issued to this identity yet.';
          setSendable(!!fxnKeys.length);
          syncRail();
          var pending = await window.ArkUI.valueRegistries.listIncomingFxnTransfers(who);
          if (token !== valueRegistriesGeneration || !page.isConnected) return;
          renderFxnPending(pending);
          await checkSentTransfers(who, token);
        } catch (error) {
          if (token !== valueRegistriesGeneration || !page.isConnected) return;
          fields.fxnMessage.textContent = text(error && error.message, 'Could not reach the mesh value-object registry.');
        }
        try {
          var credits = await window.ArkUI.valueRegistries.getCreditsBalance(who);
          if (token !== valueRegistriesGeneration || !page.isConnected) return;
          fields.creditsBalance.textContent = credits.balance;
          fields.creditsMessage.textContent = credits.balance === '0' && !credits.grants.length ? 'No credits have been granted to this identity yet.' : credits.grants.length + (credits.grants.length === 1 ? ' grant' : ' grants') + ', ' + credits.consumed.length + ' redeemed by resolvers.';
          syncRail();
        } catch (error) {
          if (token !== valueRegistriesGeneration || !page.isConnected) return;
          fields.creditsMessage.textContent = text(error && error.message, 'Could not reach the mesh Credits registry.');
        }
      }

      if (fields.fxnRefresh) fields.fxnRefresh.addEventListener('click', loadValueRegistries);

      if (fields.fxnPending) fields.fxnPending.addEventListener('click', function (event) {
        var target = event.target.closest && event.target.closest('[data-account-fxn-accept]');
        if (!target) return;
        var who = ArkUI.accountSession.current();
        if (!who) return;
        var cid = target.getAttribute('data-account-fxn-accept');
        target.disabled = true;
        window.ArkUI.valueRegistries.listIncomingFxnTransfers(who).then(function (pending) {
          var agreement = pending.filter(function (record) { return record.cid === cid; })[0];
          if (!agreement) throw new Error('That transfer is no longer pending.');
          return window.ArkUI.valueRegistries.acceptFxnTransfer(who, undefined, agreement);
        }).then(function () {
          fields.fxnSendStatus.textContent = 'Accepted. The sender completes the transfer from their side.';
          loadValueRegistries();
        }).catch(function (error) {
          target.disabled = false;
          fields.fxnSendStatus.textContent = text(error && error.message, 'Could not accept that transfer.');
        });
      });

      if (fields.fxnSent) fields.fxnSent.addEventListener('click', function (event) {
        var target = event.target.closest && event.target.closest('[data-account-fxn-complete]');
        if (!target) return;
        var who = ArkUI.accountSession.current();
        var cid = target.getAttribute('data-account-fxn-complete');
        var item = sentTransfers.filter(function (entry) { return entry.agreement.cid === cid; })[0];
        if (!who || !item || !item.output) return;
        target.disabled = true;
        fields.fxnSendStatus.textContent = 'Completing the transfer…';
        window.ArkUI.valueRegistries.fulfillFxnTransfer(who, undefined, item.agreement, item.output).then(function () {
          sentTransfers = sentTransfers.filter(function (entry) { return entry !== item; });
          fields.fxnSendStatus.textContent = 'Transfer completed.';
          loadValueRegistries();
        }).catch(function (error) {
          target.disabled = false;
          fields.fxnSendStatus.textContent = text(error && error.message, 'Could not complete that transfer.');
        });
      });

      if (fields.fxnSendForm) fields.fxnSendForm.addEventListener('submit', function (event) {
        event.preventDefault();
        var who = ArkUI.accountSession.current();
        var recipient = (fields.fxnSendRecipient.value || '').trim();
        var amount = (fields.fxnSendAmount.value || '').trim();
        if (!who || !recipient || !amount || !ownValueObjects.length) return;
        setSendable(false);
        fields.fxnSendStatus.textContent = 'Proposing the transfer…';
        window.ArkUI.valueRegistries.proposeFxnTransfer(who, undefined, ownValueObjects[0], recipient, amount).then(function (agreement) {
          sentTransfers.push({ agreement: agreement, output: null });
          renderFxnSent();
          fields.fxnSendStatus.textContent = 'Transfer proposed. Once the recipient accepts, complete it under Sent.';
          fields.fxnSendForm.reset();
          showWallet('home');
        }).catch(function (error) {
          fields.fxnSendStatus.textContent = text(error && error.message, 'Could not propose that transfer.');
        }).finally(function () { setSendable(!!ownValueObjects.length); });
      });

      if (fields.creditsRequestForm) fields.creditsRequestForm.addEventListener('submit', function (event) {
        event.preventDefault();
        var who = ArkUI.accountSession.current();
        var resolver = (fields.creditsResolver.value || '').trim();
        var amount = (fields.creditsAmount.value || '').trim();
        var service = (fields.creditsService.value || '').trim();
        if (!who || !resolver || !amount) return;
        fields.creditsStatus.textContent = 'Authorizing…';
        window.ArkUI.valueRegistries.requestCreditsConsumption(who, undefined, resolver, amount, service).then(function () {
          fields.creditsStatus.textContent = 'Consumption request signed and published. It becomes a real debit only once that resolver redeems it.';
          fields.creditsRequestForm.reset();
          showWallet('home');
        }).catch(function (error) {
          fields.creditsStatus.textContent = text(error && error.message, 'Could not publish that consumption request.');
        });
      });

      function resetContacts(message) {
        contactsGeneration += 1;
        if (contactsFields.status) contactsFields.status.textContent = message || '';
        if (contactsFields.accepted) contactsFields.accepted.innerHTML = '<li class="account-contacts-empty">No accepted contacts yet.</li>';
        if (contactsFields.incoming) contactsFields.incoming.innerHTML = '<li class="account-contacts-empty">None pending.</li>';
        if (contactsFields.outgoing) contactsFields.outgoing.innerHTML = '<li class="account-contacts-empty">None pending.</li>';
        setContactCounts(0, 0, 0);
      }

      function profileRecord(payload) { return payload && (payload.record || payload); }
      function contactName(id) {
        var profile = contactProfiles[id];
        return profile && (profile.displayUsername || profile.username || profile.publicId) || id;
      }
      function contactInitials(id) {
        return contactName(id).split(/\s+/).map(function (part) { return part.charAt(0); }).join('').slice(0, 2).toUpperCase() || 'ID';
      }
      function setContactCounts(accepted, incoming, outgoing) {
        if (contactsFields.acceptedCount) contactsFields.acceptedCount.textContent = String(accepted);
        if (contactsFields.incomingCount) contactsFields.incomingCount.textContent = String(incoming);
        if (contactsFields.outgoingCount) contactsFields.outgoingCount.textContent = String(outgoing);
        var unlocked = !!(identity && ArkUI.accountSession.isUnlocked());
        if (fields.overviewContacts) fields.overviewContacts.textContent = unlocked ? String(accepted) : '—';
        if (fields.railInvites) fields.railInvites.textContent = unlocked ? String(incoming) : '—';
        if (fields.railInvites && fields.railInvites.parentNode && fields.railInvites.parentNode.toggleAttribute) fields.railInvites.parentNode.toggleAttribute('data-attention', unlocked && incoming > 0);
      }

      function renderContactsList(listEl, records, kind) {
        if (!listEl) return;
        if (!records.length) { listEl.innerHTML = '<li class="account-contacts-empty">' + (kind === 'accepted' ? 'No accepted contacts yet.' : 'None pending.') + '</li>'; return; }
        listEl.innerHTML = records.map(function (record) {
          var otherId = record.id;
          var status = record.status || kind;
          var actions = kind === 'incoming'
            ? '<button type="button" data-contacts-accept="' + escapeHtml(otherId) + '">Accept</button><button type="button" data-contacts-decline="' + escapeHtml(otherId) + '">Decline</button>'
            : (kind === 'outgoing' ? '<button type="button" data-contacts-withdraw="' + escapeHtml(otherId) + '">Withdraw</button>' : '');
          return '<li><button type="button" class="account-contact-main" data-contact-open="' + escapeHtml(otherId) + '" data-contact-state="' + escapeHtml(status) + '"><span class="account-contact-mini-avatar">' + escapeHtml(contactInitials(otherId)) + '</span><span><strong>' + escapeHtml(contactName(otherId)) + '</strong><small>' + escapeHtml(otherId) + '</small></span></button><span class="account-contacts-tag">' + escapeHtml(status) + '</span>' + actions + '</li>';
        }).join('');
      }

      async function cacheContactProfiles(directory, who, ids, token) {
        await Promise.all(ids.map(async function (id) {
          if (contactProfiles[id]) return;
          try {
            var payload = await directory.getIdentityProfile(who, undefined, id);
            if (token === contactsGeneration) contactProfiles[id] = profileRecord(payload) || { identityId: id };
          } catch (_error) {
            if (token === contactsGeneration) contactProfiles[id] = { identityId: id };
          }
        }));
      }

      async function loadContacts(silent) {
        var who = ArkUI.accountSession.current();
        if (!who || !window.ArkUI || !window.ArkUI.meshDirectory) return;
        var token = ++contactsGeneration;
        if (!silent) contactsFields.status.textContent = 'Checking for invites…';
        try {
          var directory = window.ArkUI.meshDirectory;
          var incoming = await directory.listIncomingInvites(who);
          if (token !== contactsGeneration) return;
          var myEdges = (await directory.listMyEdges(who)).filter(function (record) { return record.relation === 'invite'; });
          if (token !== contactsGeneration) return;
          var myById = Object.create(null), acceptedById = Object.create(null), outgoingPending = [];
          myEdges.forEach(function (edge) {
            myById[edge.toIdentityId] = edge;
            if (edge.status === 'accepted') acceptedById[edge.toIdentityId] = { id: edge.toIdentityId, status: 'connected' };
          });
          var pendingEdges = myEdges.filter(function (edge) { return edge.status === 'pending'; });
          var pendingStates = await Promise.all(pendingEdges.map(async function (edge) {
            try { return { edge: edge, state: await directory.resolveInviteState(who, edge.toIdentityId) }; }
            catch (_error) { return { edge: edge, state: 'pending' }; }
          }));
          if (token !== contactsGeneration) return;
          pendingStates.forEach(function (item) {
            if (item.state === 'accepted') acceptedById[item.edge.toIdentityId] = { id: item.edge.toIdentityId, status: 'connected' };
            else if (item.state === 'pending') outgoingPending.push({ id: item.edge.toIdentityId, status: 'sent' });
          });
          var incomingPending = [];
          incoming.forEach(function (record) {
            var id = record.fromIdentityId;
            var own = myById[id];
            if (own && own.status === 'accepted') acceptedById[id] = { id: id, status: 'connected' };
            else if (!own || own.status === 'pending') incomingPending.push({ id: id, status: 'incoming' });
          });
          var accepted = Object.keys(acceptedById).map(function (id) { return acceptedById[id]; });
          var ids = accepted.concat(incomingPending, outgoingPending).map(function (record) { return record.id; }).filter(function (id, index, all) { return all.indexOf(id) === index; });
          await cacheContactProfiles(directory, who, ids, token);
          if (token !== contactsGeneration) return;
          contactStates = Object.create(null);
          accepted.concat(incomingPending, outgoingPending).forEach(function (record) { contactStates[record.id] = record.status; });
          renderContactsList(contactsFields.accepted, accepted, 'accepted');
          renderContactsList(contactsFields.incoming, incomingPending, 'incoming');
          renderContactsList(contactsFields.outgoing, outgoingPending, 'outgoing');
          setContactCounts(accepted.length, incomingPending.length, outgoingPending.length);
          if (!silent) contactsFields.status.textContent = '';
        } catch (error) {
          if (token !== contactsGeneration) return;
          contactsFields.status.textContent = text(error && error.message, 'Could not reach the mesh identity directory.');
        }
      }

      function showContactList() {
        if (contactsFields.listView) contactsFields.listView.hidden = false;
        if (contactsFields.detailView) contactsFields.detailView.hidden = true;
      }
      async function openContactDetail(id, state) {
        if (!id) return;
        if (contactsFields.listView) contactsFields.listView.hidden = true;
        if (contactsFields.detailView) contactsFields.detailView.hidden = false;
        var profile = contactProfiles[id] || { identityId: id };
        function render(profileRecordValue) {
          var record = profileRecordValue || { identityId: id };
          var name = record.displayUsername || record.username || record.publicId || id;
          if (contactsFields.detailAvatar) contactsFields.detailAvatar.textContent = contactInitials(id);
          if (contactsFields.detailName) contactsFields.detailName.textContent = name;
          if (contactsFields.detailState) contactsFields.detailState.textContent = state || contactStates[id] || 'mesh identity';
          if (contactsFields.detailId) contactsFields.detailId.textContent = record.identityId || id;
          if (contactsFields.detailPublicId) contactsFields.detailPublicId.textContent = record.publicId || record.username || 'Not published';
          if (contactsFields.detailVisibility) contactsFields.detailVisibility.textContent = record.visibility || 'Not reported';
          if (contactsFields.detailUpdated) contactsFields.detailUpdated.textContent = record.updatedAt ? new Date(record.updatedAt).toLocaleString() : 'Not reported';
          if (contactsFields.detailBio) contactsFields.detailBio.textContent = record.bio || 'No public profile details are available for this identity.';
        }
        render(profile);
        if (!contactProfiles[id]) {
          var who = ArkUI.accountSession.current();
          try {
            var payload = await window.ArkUI.meshDirectory.getIdentityProfile(who, undefined, id);
            contactProfiles[id] = profileRecord(payload) || profile;
            render(contactProfiles[id]);
          } catch (_error) {}
        }
      }

      function startContactsPolling() {
        stopContactsPolling();
        contactsPollTimer = window.setInterval(function () { loadContacts(true); }, CONTACTS_POLL_MS);
      }
      function stopContactsPolling() {
        if (contactsPollTimer) { window.clearInterval(contactsPollTimer); contactsPollTimer = null; }
      }

      async function sendInviteTo(toId) {
        var who = ArkUI.accountSession.current();
        if (!who || !toId) return;
        contactsFields.status.textContent = 'Sending invite…';
        try {
          await window.ArkUI.meshDirectory.sendInvite(who, toId);
          contactsFields.status.textContent = 'Invite sent to ' + toId + '.';
          loadContacts(true);
        } catch (error) { contactsFields.status.textContent = text(error && error.message, 'Could not send that invite.'); }
      }

      if (contactsFields.searchForm) contactsFields.searchForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        var who = ArkUI.accountSession.current();
        var query = contactsFields.searchInput.value.trim();
        if (!who || !query) return;
        contactsFields.status.textContent = 'Searching the mesh identity directory…';
        contactsFields.results.hidden = false;
        try {
          var results = await window.ArkUI.meshDirectory.searchIdentities(who, query);
          contactsFields.status.textContent = results.length ? '' : ('No published identity matches "' + query + '". If you know their exact identity ID, you can still invite it directly.');
          var items = results.map(function (result) {
            var id = result.identityId || result.username || result.publicId;
            if (id) contactProfiles[id] = profileRecord(result) || result;
            var label = result.displayUsername || result.username || result.publicId || id;
            return '<li><button type="button" class="account-contact-main" data-contact-open="' + escapeHtml(id) + '" data-contact-state="directory result"><span class="account-contact-mini-avatar">' + escapeHtml(contactInitials(id)) + '</span><span><strong>' + escapeHtml(label) + '</strong><small>' + escapeHtml(id) + '</small></span></button><button type="button" data-contacts-invite="' + escapeHtml(id) + '">Invite</button></li>';
          });
          if (!results.length) items.push('<li><button type="button" class="account-contact-main" data-contact-open="' + escapeHtml(query) + '" data-contact-state="unverified identity"><span class="account-contact-mini-avatar">ID</span><span><strong>' + escapeHtml(query) + '</strong><small>Exact identity ID</small></span></button><button type="button" data-contacts-invite="' + escapeHtml(query) + '">Invite directly</button></li>');
          contactsFields.results.innerHTML = items.join('');
        } catch (error) {
          contactsFields.results.hidden = true;
          contactsFields.status.textContent = text(error && error.message, 'Could not search the mesh identity directory.');
        }
      });
      if (contactsFields.results) contactsFields.results.addEventListener('click', function (event) {
        var target = event.target.closest && event.target.closest('[data-contacts-invite]');
        if (!target) return;
        target.disabled = true;
        sendInviteTo(target.getAttribute('data-contacts-invite')).finally(function () { target.disabled = false; });
      });
      if (contactsFields.section) contactsFields.section.addEventListener('click', function (event) {
        var target = event.target.closest && event.target.closest('[data-contact-open]');
        if (target) openContactDetail(target.getAttribute('data-contact-open'), target.getAttribute('data-contact-state'));
      });
      if (contactsFields.back) contactsFields.back.addEventListener('click', showContactList);
      if (contactsFields.refresh) contactsFields.refresh.addEventListener('click', function () { loadContacts(false); });
      function contactsActionHandler(attr, fn) {
        if (contactsFields.incoming) contactsFields.incoming.addEventListener('click', handle);
        if (contactsFields.outgoing) contactsFields.outgoing.addEventListener('click', handle);
        function handle(event) {
          var target = event.target.closest && event.target.closest('[' + attr + ']');
          if (!target) return;
          var who = ArkUI.accountSession.current();
          var otherId = target.getAttribute(attr);
          if (!who || !otherId) return;
          target.disabled = true;
          contactsFields.status.textContent = 'Working…';
          fn(who, otherId).then(function () { contactsFields.status.textContent = ''; loadContacts(); })
            .catch(function (error) { target.disabled = false; contactsFields.status.textContent = text(error && error.message, 'That action failed.'); });
        }
      }
      contactsActionHandler('data-contacts-accept', function (who, id) { return window.ArkUI.meshDirectory.acceptInvite(who, id); });
      contactsActionHandler('data-contacts-decline', function (who, id) { return window.ArkUI.meshDirectory.declineInvite(who, id); });
      contactsActionHandler('data-contacts-withdraw', function (who, id) { return window.ArkUI.meshDirectory.withdrawInvite(who, id); });

      function renderIdentity(next) {
        identity = next;
        var unlocked = identity && ArkUI.accountSession.isUnlocked();
        var authenticated = identity && ArkUI.cmsSession && ArkUI.cmsSession.isAuthenticated(identity.publicKeyB64);
        page.dataset.session = identity ? (unlocked ? 'verified-local' : 'remembered') : 'signed-out';
        // A new session state picks its natural view: the wallet once the key
        // is unlocked, the sign-in card otherwise. Later renders keep the
        // view the person chose.
        if (page.dataset.session !== lastSessionState) {
          lastSessionState = page.dataset.session;
          activeTab = unlocked ? 'defi' : 'session';
        }
        page.querySelector('.account-state').hidden = !identity;
        page.querySelector('.account-rail').hidden = !identity;
        page.querySelector('[data-account-opens]').hidden = !!identity;
        page.querySelector('[data-account-create-toggle-row]').hidden = !!identity;
        if (identity && createView && !createView.hidden) showCreate(false);
        applyTabs();
        if (unlocked && window.ArkUI && window.ArkUI.meshDirectory) { loadContacts(false); startContactsPolling(); }
        else { resetContacts(unlocked ? '' : 'Unlock your Auth Kit to invite or respond to identities.'); stopContactsPolling(); }
        if (unlocked && window.ArkUI && window.ArkUI.valueRegistries) { loadValueRegistries(); }
        else { resetValueRegistries(identity ? 'Unlock your Auth Kit to check FXN and Credits.' : undefined); }
        var name = identity && identity.displayName || 'Own your identity.';
        page.querySelector('#account-title').textContent = name;
        page.querySelector('[data-account-avatar]').textContent = identity ? name.slice(0, 2).toUpperCase() : '↗';
        page.querySelector('[data-account-status]').textContent = identity ? (unlocked ? (authenticated ? 'Session active · key unlocked' : 'Signing key verified locally') : (authenticated ? 'Session active · key locked' : 'Identity details saved · not signed in')) : 'Signed out';
        page.querySelector('[data-account-intro]').textContent = identity ? (unlocked ? 'Your identity is verified and ready for this session.' : 'Your name and public details are saved here. Your Auth Kit is not saved.') : 'No custodial account and no password reset. One file holds your keys, and only you hold the file.';
        page.querySelector('[data-account-session-title]').textContent = identity ? (authenticated ? 'Session active.' : (unlocked ? 'Your key is unlocked.' : 'Select your Auth Kit again')) : 'Open your Auth Kit.';
        page.querySelector('[data-account-session-description]').textContent = identity ? (authenticated ? 'Publishing access is active. Reopen your Auth Kit only when you need to sign locally.' : unlocked ? 'Your key is available for this browser session.' : 'Choose the .auth.flx file on this device to restore signing access.') : 'Choose the recovery file on this device to continue.';
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
        fields.verification.textContent = identity ? (unlocked ? 'Root key verified against your recovery phrase on this device.' : 'Saved public details only. Unlock your Auth Kit to verify them and open your wallet.') : 'Unlock a kit to verify its root against its recovery phrase.';
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
      // "Create a new identity" -- the same shared wizard defxn-dao's sign-in
      // modal uses (js/ark/auth-kit-create-panel.js), not a second copy of it.
      // It replaces the sign-in view in place rather than growing the card.
      var createPanelEl = page.querySelector('[data-account-create]');
      var createView = page.querySelector('[data-account-create-view]');
      var sessionMain = page.querySelector('[data-account-session-main]');
      var createPanelHandle = null;
      var createTab = page.querySelector('[data-account-create-toggle]');
      var signInTab = page.querySelector('[data-account-create-back]');
      function showCreate(open) {
        createView.hidden = !open;
        sessionMain.hidden = open;
        createTab.setAttribute('aria-pressed', String(open));
        signInTab.setAttribute('aria-pressed', String(!open));
      }
      createTab.addEventListener('click', function () {
        if (!createView.hidden) return;
        showCreate(true);
        if (!createPanelHandle && window.ArkAuthKitCreatePanel) {
          createPanelHandle = window.ArkAuthKitCreatePanel.mount(createPanelEl, {
            actionClass: 'palette-solid', formClass: 'account-contacts-form',
            onDownloaded: function () { showCreate(false); if (createPanelHandle) createPanelHandle.reset(); },
          });
        } else if (createPanelHandle) { createPanelHandle.reset(); }
      });
      signInTab.addEventListener('click', function () { showCreate(false); });
      // Line icons for the sign-in flow, from the shared set (js/ark/icons.js).
      if (ArkUI.icon && page.querySelectorAll) Array.prototype.forEach.call(page.querySelectorAll('[data-account-icon]'), function (mark) {
        mark.appendChild(ArkUI.icon(mark.getAttribute('data-account-icon')));
      });
      var unsubscribeDomains = ArkUI.localDomains ? ArkUI.localDomains.subscribe(function (names) {
        if (fields.railDomains) fields.railDomains.textContent = String(names.length);
      }) : function () {};
      var unsubscribe = ArkUI.localIdentity.subscribe(renderIdentity);
      page.querySelector('[data-account-cms-open]').addEventListener('click', function (event) {
        if ((ArkUI.cmsSession && ArkUI.cmsSession.isLocalDevelopment && ArkUI.cmsSession.isLocalDevelopment()) || session.isUnlocked() || (ArkUI.cmsSession && ArkUI.cmsSession.isAuthenticated(identity && identity.publicKeyB64))) return;
        event.preventDefault();
        openTab('session');
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
      page.arkDispose = function () { generation += 1; contactsGeneration += 1; stopContactsPolling(); if (controller) controller.abort(); unsubscribe(); unsubscribeDomains(); session.container.remove(); };
      return page;
    }
  };
})();

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
      page.innerHTML = '<div class="account-shell"><header class="account-hero"><p class="account-kicker">// YOUR IDENTITY / YOUR RULES</p>' +
        '<div class="account-profile"><div class="account-avatar" data-account-avatar aria-hidden="true">↗</div><div class="account-heading"><h1 id="account-title">Own your identity.</h1><span class="account-status" data-account-status>Signed out</span></div></div>' +
        '<p data-account-intro>One portable recovery file. No custodial account. Your root key stays yours.</p></header>' +
        '<div class="account-layout"><section class="account-auth" aria-label="Account session"><p class="account-kicker">01 / LOCAL SESSION</p><h2 class="account-session-title" data-account-session-title>Open your Auth Kit.</h2><p class="account-session-description" data-account-session-description>Choose the recovery file on this device to continue.</p><div data-account-auth></div><p class="account-create-toggle" data-account-create-toggle-row>No kit yet? <button type="button" class="link-button" data-account-create-toggle>Create a new identity</button></p><div data-account-create hidden></div><div class="account-cms"><a href="/bundle-deployer" data-scene-link="bundledeployer">Deploy a bundle →</a><span>Local-first publishing</span><a href="/account/domains" data-scene-link="account/domains">Your domains →</a><a hidden href="/admin" target="_blank" rel="opener" data-account-cms-open>Open CMS ↗</a><span hidden data-account-cms-local>Local editor available</span><span data-account-cms-status role="status"></span></div><button type="button" data-account-forget hidden>Sign out</button><p class="account-storage-notice" data-account-storage-notice role="status" hidden></p><details class="account-session-note"><summary>Nothing secret is stored here</summary><p>This browser remembers only your name and public identity details. Your Auth Kit, PIN, password, and signing key remain on your device. Select the kit again when a future session needs to sign.</p></details></section>' +
        '<aside class="account-welcome"><p class="account-kicker">02 / SELF-CUSTODY</p><h2>Bring one file.<br>Keep every key.</h2><ol><li><strong>Portable</strong><p>Your recovery file moves with you.</p></li><li><strong>Local</strong><p>Unlocking happens on this device.</p></li><li><strong>Verifiable</strong><p>Check the identity against the mesh.</p></li></ol></aside>' +
        '<nav class="account-tabs" role="tablist" aria-label="Account sections" hidden>' +
        '<button type="button" role="tab" data-account-tab="identity" aria-selected="true"><span>Overview</span><small>Identity</small></button>' +
        '<button type="button" role="tab" data-account-tab="defi" aria-selected="false"><span>DeFi</span><small>Mesh state</small></button>' +
        '<button type="button" role="tab" data-account-tab="contacts" aria-selected="false"><span>Contacts</span><small data-account-contact-count>0 connected</small></button>' +
        '</nav>' +
        '<section class="account-state" data-account-panel="identity" aria-live="polite" hidden><div class="account-panel-heading"><div><p class="account-kicker">01 / DASHBOARD</p><h2 data-account-heading>Your identity</h2></div><span>Public details / local authority</span></div>' +
        '<div class="account-overview-strip"><button type="button" data-account-go="identity"><small>Session</small><strong data-account-overview-session>Remembered</strong><span>Identity available</span></button><button type="button" data-account-go="defi"><small>Mesh</small><strong data-account-overview-mesh>Not checked</strong><span>Inspect standing</span></button><button type="button" data-account-go="contacts"><small>Contacts</small><strong data-account-overview-contacts>0</strong><span>Open directory</span></button></div>' +
        '<dl><div><dt>Identity ID</dt><dd data-account-id>—</dd></div><div><dt>Root key</dt><dd data-account-root>—</dd></div>' +
        '<div><dt>Wallet address in Auth Kit</dt><dd data-account-wallet>—</dd></div><div><dt>Security profile</dt><dd data-account-security>—</dd></div></dl>' +
        '<p data-account-verification>Unlock a kit to verify its root against its recovery phrase.</p></section></div>' +
        '<section class="account-live" data-account-panel="defi" aria-labelledby="account-live-title" hidden><div class="account-panel-heading"><div><p class="account-kicker">02 / DEFI &amp; MESH</p><h2 id="account-live-title">Financial state</h2></div><span>Verified sources only</span></div>' +
        '<div class="account-defi-grid"><article class="account-mesh-check" aria-live="polite"><div><small>Identity binding</small><strong data-account-mesh-status>Not checked</strong><p data-account-mesh-message>Check this identity against the configured Miner by exact ID.</p></div><button type="button" data-account-mesh-check disabled>Check Miner</button></article>' +
        '<article class="account-defi-metric" data-account-fxn><small>FXN holdings</small><strong data-account-fxn-balance>—</strong><span data-account-fxn-message>Sign in to check</span></article><article class="account-defi-metric" data-account-credits><small>Credits</small><strong data-account-credits-balance>—</strong><span data-account-credits-message>Sign in to check</span></article><article class="account-defi-metric"><small>Mesh standing</small><strong data-account-standing>Not linked</strong><span data-account-standing-message>Requires an exact signed binding</span></article></div>' +
        '<details class="account-mesh-detail" data-account-mesh-detail hidden><summary>Identity record details</summary><dl><div><dt>Record</dt><dd data-account-mesh-record>—</dd></div><div><dt>Verification</dt><dd data-account-mesh-verification>—</dd></div><div><dt>Updated</dt><dd data-account-mesh-updated>—</dd></div><div><dt>Provenance</dt><dd data-account-mesh-provenance>—</dd></div></dl></details>' +
        '<details class="account-mesh-detail" data-account-fxn-detail><summary>FXN transfers</summary>' +
        '<div data-account-fxn-pending><p class="account-contacts-empty">No pending transfers to you.</p></div>' +
        '<form data-account-fxn-send-form class="account-contacts-form"><label for="fxnSendRecipient">Send FXN · recipient public key</label><input id="fxnSendRecipient" type="text" autocomplete="off" data-account-fxn-send-recipient placeholder="Recipient public key" /><label for="fxnSendAmount">Amount (nano-FXN)</label><input id="fxnSendAmount" type="text" autocomplete="off" data-account-fxn-send-amount placeholder="1000000000" /><button type="submit" data-account-fxn-send-submit disabled>Send</button></form>' +
        '<p data-account-fxn-send-status role="status" aria-live="polite"></p>' +
        '<button type="button" data-account-fxn-refresh>Refresh</button></details>' +
        '<details class="account-mesh-detail" data-account-credits-detail><summary>Spend credits</summary>' +
        '<form data-account-credits-request-form class="account-contacts-form"><label for="creditsResolver">Resolver public key</label><input id="creditsResolver" type="text" autocomplete="off" data-account-credits-resolver placeholder="Resolver public key" /><label for="creditsAmount">Amount</label><input id="creditsAmount" type="text" autocomplete="off" data-account-credits-amount placeholder="200" /><label for="creditsService">What for (optional)</label><input id="creditsService" type="text" autocomplete="off" data-account-credits-service /><button type="submit" data-account-credits-submit>Authorize</button></form>' +
        '<p data-account-credits-status role="status" aria-live="polite"></p></details>' +
        '<p class="account-next">FXN/Credits balances are read from the live mesh registry, never estimated. Inspect raw records in the <a href="/explore" data-scene-link="explorer">Mesh Explorer</a>.</p></section>' +
        '<section class="account-contacts" data-account-panel="contacts" aria-labelledby="account-contacts-title" hidden><div data-contacts-view="list"><div class="account-panel-heading"><div><p class="account-kicker">03 / CONTACTS</p><h2 id="account-contacts-title">Your network</h2></div><button type="button" data-contacts-refresh>Refresh</button></div>' +
        '<div class="account-contact-stats"><div><strong data-contacts-accepted-count>0</strong><span>Contacts</span></div><div><strong data-contacts-incoming-count>0</strong><span>Incoming</span></div><div><strong data-contacts-outgoing-count>0</strong><span>Sent</span></div></div>' +
        '<form data-contacts-search-form class="account-contacts-form"><label for="contactsSearchQuery">Find an identity</label><input id="contactsSearchQuery" type="text" autocomplete="off" placeholder="Name or identity ID" /><button type="submit">Search</button></form>' +
        '<ul data-contacts-results class="account-contacts-list account-contacts-results" hidden></ul><p data-contacts-status role="status" aria-live="polite"></p>' +
        '<div class="account-contacts-lists"><div class="account-contacts-connected"><h3>Contacts</h3><ul data-contacts-accepted class="account-contacts-list"><li class="account-contacts-empty">No accepted contacts yet.</li></ul></div><div><h3>Invites to you</h3><ul data-contacts-incoming class="account-contacts-list"><li class="account-contacts-empty">None pending.</li></ul></div><div><h3>Sent invites</h3><ul data-contacts-outgoing class="account-contacts-list"><li class="account-contacts-empty">None pending.</li></ul></div></div></div>' +
        '<article class="account-contact-detail" data-contacts-view="detail" hidden><button type="button" data-contact-back>← All contacts</button><header><div class="account-contact-avatar" data-contact-avatar aria-hidden="true">ID</div><div><p class="account-kicker">CONTACT / MESH IDENTITY</p><h2 data-contact-name>Identity</h2><span data-contact-state>Connection</span></div></header><dl><div><dt>Identity ID</dt><dd data-contact-id>—</dd></div><div><dt>Public ID</dt><dd data-contact-public-id>—</dd></div><div><dt>Visibility</dt><dd data-contact-visibility>—</dd></div><div><dt>Updated</dt><dd data-contact-updated>—</dd></div></dl><p data-contact-bio>No public profile details are available for this identity.</p><a href="/explore" data-scene-link="explorer">Inspect mesh records →</a></article></section></div>';
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
        overviewSession: page.querySelector('[data-account-overview-session]'),
        overviewMesh: page.querySelector('[data-account-overview-mesh]'),
        overviewContacts: page.querySelector('[data-account-overview-contacts]'),
        contactCount: page.querySelector('[data-account-contact-count]')
      };
      /* Zero-scroll: the hero (identity + one status + one connect action)
         fits one viewport on its own; everything past sign-in is real but
         secondary, so it lives one tab at a time instead of stacked in a
         long scroll -- the "Complement/Context" depth, not the "Primary"
         one. See docs/ux-storytelling-redesign-audit.md. */
      var tabNav = page.querySelector('.account-tabs');
      var tabButtons = page.querySelectorAll ? Array.prototype.slice.call(page.querySelectorAll('[data-account-tab]')) : [];
      var panels = page.querySelectorAll ? Array.prototype.slice.call(page.querySelectorAll('[data-account-panel]')) : [];
      var activeTab = 'identity';
      function panelAvailable(name) {
        if (name === 'identity' || name === 'defi') return !!identity;
        if (name === 'contacts') return !!(identity && ArkUI.accountSession.isUnlocked());
        return false;
      }
      function applyTabs() {
        if (!tabButtons.length) {
          page.querySelector('.account-state').hidden = !identity;
          page.querySelector('.account-live').hidden = !identity;
          return;
        }
        var anyAvailable = tabButtons.some(function (button) { return panelAvailable(button.getAttribute('data-account-tab')); });
        tabNav.hidden = !anyAvailable;
        if (anyAvailable && !panelAvailable(activeTab)) {
          var firstAvailable = tabButtons.map(function (b) { return b.getAttribute('data-account-tab'); }).filter(panelAvailable)[0];
          if (firstAvailable) activeTab = firstAvailable;
        }
        tabButtons.forEach(function (button) {
          var name = button.getAttribute('data-account-tab');
          var available = panelAvailable(name);
          button.hidden = !available;
          button.setAttribute('aria-selected', String(available && name === activeTab));
        });
        panels.forEach(function (panel) {
          var name = panel.getAttribute('data-account-panel');
          panel.hidden = !(panelAvailable(name) && name === activeTab);
        });
      }
      function openTab(name) {
        if (!panelAvailable(name)) return;
        activeTab = name;
        applyTabs();
      }
      tabButtons.forEach(function (button) {
        button.addEventListener('click', function () { openTab(button.getAttribute('data-account-tab')); });
      });
      Array.prototype.forEach.call(page.querySelectorAll ? page.querySelectorAll('[data-account-go]') : [], function (button) {
        button.addEventListener('click', function () { openTab(button.getAttribute('data-account-go')); });
      });

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
        } catch (error) {
          if (token !== generation || !page.isConnected || !identity || identity.identityId !== id) return;
          fields.meshStatus.textContent = error && error.name === 'AbortError' ? 'Check timed out' : 'Not connected';
          fields.meshMessage.textContent = error && error.name === 'AbortError' ? 'The local Miner did not respond within 10 seconds.' : error instanceof TypeError ? 'Cannot reach the local Miner. Check that it is running and allows this site origin.' : text(error && error.message, 'The local Miner could not verify this identity.');
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

      function resetValueRegistries(message) {
        valueRegistriesGeneration += 1;
        fields.fxnBalance.textContent = '—';
        fields.fxnMessage.textContent = message || 'Sign in to check';
        fields.creditsBalance.textContent = '—';
        fields.creditsMessage.textContent = message || 'Sign in to check';
        fields.fxnPending.innerHTML = '<p class="account-contacts-empty">No pending transfers to you.</p>';
        fields.fxnSendSubmit.disabled = true;
        ownValueObjects = [];
      }

      function renderFxnPending(pending) {
        if (!pending.length) { fields.fxnPending.innerHTML = '<p class="account-contacts-empty">No pending transfers to you.</p>'; return; }
        fields.fxnPending.innerHTML = pending.map(function (agreement) {
          return '<p>' + escapeHtml(agreement.amount) + ' ' + escapeHtml(agreement.asset) + ' incoming — <button type="button" data-account-fxn-accept="' + escapeHtml(agreement.cid) + '">Accept</button></p>';
        }).join('');
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
          fields.fxnMessage.textContent = fxnKeys.length ? 'Sum of live, unspent value objects owned by this identity.' : 'No FXN has been issued to this identity yet.';
          fields.fxnSendSubmit.disabled = !fxnKeys.length;
          var pending = await window.ArkUI.valueRegistries.listIncomingFxnTransfers(who);
          if (token !== valueRegistriesGeneration || !page.isConnected) return;
          renderFxnPending(pending);
        } catch (error) {
          if (token !== valueRegistriesGeneration || !page.isConnected) return;
          fields.fxnMessage.textContent = text(error && error.message, 'Could not reach the mesh value-object registry.');
        }
        try {
          var credits = await window.ArkUI.valueRegistries.getCreditsBalance(who);
          if (token !== valueRegistriesGeneration || !page.isConnected) return;
          fields.creditsBalance.textContent = credits.balance;
          fields.creditsMessage.textContent = credits.balance === '0' ? 'No credits have been granted to this identity yet.' : 'Non-revoked grants minus everything a resolver has redeemed.';
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
          fields.fxnSendStatus.textContent = 'Output published. Waiting for the sender to complete the transfer.';
          loadValueRegistries();
        }).catch(function (error) {
          target.disabled = false;
          fields.fxnSendStatus.textContent = text(error && error.message, 'Could not accept that transfer.');
        });
      });

      if (fields.fxnSendForm) fields.fxnSendForm.addEventListener('submit', function (event) {
        event.preventDefault();
        var who = ArkUI.accountSession.current();
        var recipient = (fields.fxnSendRecipient.value || '').trim();
        var amount = (fields.fxnSendAmount.value || '').trim();
        if (!who || !recipient || !amount || !ownValueObjects.length) return;
        fields.fxnSendSubmit.disabled = true;
        fields.fxnSendStatus.textContent = 'Proposing the transfer…';
        window.ArkUI.valueRegistries.proposeFxnTransfer(who, undefined, ownValueObjects[0], recipient, amount).then(function (agreement) {
          fields.fxnSendStatus.textContent = 'Transfer proposed (' + agreement.cid.slice(0, 12) + '…). Waiting for the recipient to accept, then this page must complete it from the Refresh button.';
          fields.fxnSendForm.reset();
        }).catch(function (error) {
          fields.fxnSendStatus.textContent = text(error && error.message, 'Could not propose that transfer.');
        }).finally(function () { fields.fxnSendSubmit.disabled = !ownValueObjects.length; });
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
        if (fields.overviewContacts) fields.overviewContacts.textContent = String(accepted);
        if (fields.contactCount) fields.contactCount.textContent = accepted + (accepted === 1 ? ' connected' : ' connected');
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
        page.querySelector('.account-auth .account-kicker').textContent = identity ? '02 / SESSION' : '01 / SESSION';
        applyTabs();
        if (unlocked && window.ArkUI && window.ArkUI.meshDirectory) { loadContacts(false); startContactsPolling(); }
        else { resetContacts(unlocked ? '' : 'Unlock your Auth Kit to invite or respond to identities.'); stopContactsPolling(); }
        if (unlocked && window.ArkUI && window.ArkUI.valueRegistries) { loadValueRegistries(); }
        else { resetValueRegistries(identity ? 'Unlock your Auth Kit to check FXN and Credits.' : undefined); }
        var name = identity && identity.displayName || 'Own your identity.';
        page.querySelector('#account-title').textContent = name;
        page.querySelector('[data-account-avatar]').textContent = identity ? name.slice(0, 2).toUpperCase() : '↗';
        page.querySelector('[data-account-status]').textContent = identity ? (unlocked ? (authenticated ? 'Session active · key unlocked' : 'Signing key verified locally') : (authenticated ? 'Session active · key locked' : 'Identity details saved · not signed in')) : 'Signed out';
        page.querySelector('[data-account-intro]').textContent = identity ? (unlocked ? 'Your identity is verified and ready for this session.' : 'Your name and public identity details are saved here. Your Auth Kit is not saved.') : 'One portable recovery file. No custodial account. Your root key stays yours.';
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
      // "Create a new identity" -- the same shared wizard defxn-dao's sign-in
      // modal uses (js/ark/auth-kit-create-panel.js), not a second copy of it.
      var createPanelEl = page.querySelector('[data-account-create]');
      var createToggleRow = page.querySelector('[data-account-create-toggle-row]');
      var createPanelHandle = null;
      page.querySelector('[data-account-create-toggle]').addEventListener('click', function () {
        var showing = !createPanelEl.hidden;
        createPanelEl.hidden = showing;
        createToggleRow.hidden = !showing;
        if (!showing) {
          if (!createPanelHandle && window.ArkAuthKitCreatePanel) {
            createPanelHandle = window.ArkAuthKitCreatePanel.mount(createPanelEl, {
              actionClass: '', formClass: 'account-contacts-form',
              onDownloaded: function () { createPanelEl.hidden = true; createToggleRow.hidden = false; if (createPanelHandle) createPanelHandle.reset(); },
            });
          } else if (createPanelHandle) { createPanelHandle.reset(); }
        }
      });
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
      page.arkDispose = function () { generation += 1; contactsGeneration += 1; stopContactsPolling(); if (controller) controller.abort(); unsubscribe(); session.container.remove(); };
      return page;
    }
  };
})();

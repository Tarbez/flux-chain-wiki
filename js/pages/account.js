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

  /* This page carries no ArkManifest of its own, so there is no manifest
     field for a 'link' kind value to live in; the destination stays a
     tagged literal in code, resolved the one shared way every retrofitted
     call site is -- js/ark/dash-kit.js's resolveLinkField. */
  function href(key) { return ArkUI.dash.resolveLinkField('route:' + key).href; }

  /* The identity card's "Identity" field and the Wallet tab's own key
     display (js/ark/dense-wire-wallet.mjs's `signerFor(who).pubHex`) must
     show the exact same bytes in the exact same encoding -- showing base64
     in one place and hex in another is what caused a real person to paste
     the wrong value for a chain-server config key (2026-10-13 identity-flow
     audit). Hex is the one dense-wire itself ever uses (wire protocol,
     FXN_BALANCE, CHAIN_SERVER_GENESIS_KEY, ...), so this card shows hex,
     computed locally rather than lazy-loading the whole dense-wire wallet
     module just to format one string. */
  function base64ToHex(b64) {
    try {
      var binary = atob(b64);
      var out = '';
      for (var i = 0; i < binary.length; i++) out += binary.charCodeAt(i).toString(16).padStart(2, '0');
      return out;
    } catch (_) {
      return b64; // not valid base64 -- show it as-is rather than hide it
    }
  }

  function explorerRecord(payload, identityId) {
    if (!payload || payload.apiVersion !== EXPLORER_API || !payload.data || !payload.data.record || payload.data.record.id !== identityId) {
      throw new Error('We could not verify this identity record.');
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
      page.innerHTML = '<div class="account-shell"><header class="account-hero"><div class="account-map" aria-hidden="true"><svg viewBox="0 0 560 168" role="presentation"><path class="account-map-route account-map-route-main" d="M78 84H213C252 84 253 35 294 35H380"/><path class="account-map-route" d="M213 84C252 84 253 133 294 133H468"/><path class="account-map-route" d="M380 35C418 35 420 84 458 84H514"/><circle class="account-map-origin" cx="50" cy="84" r="27"/><circle class="account-map-node" cx="213" cy="84" r="6"/><circle class="account-map-node" cx="380" cy="35" r="6"/><circle class="account-map-node" cx="294" cy="133" r="6"/><circle class="account-map-node" cx="458" cy="84" r="6"/><text class="account-map-you" x="50" y="88" text-anchor="middle">YOU</text><text x="200" y="68" text-anchor="end">AUTH KIT</text><text x="393" y="20">IDENTITY</text><text x="307" y="151">WALLET</text><text x="514" y="68" text-anchor="end">PUBLISH</text></svg></div><p class="account-promise">DEFXN / Your identity</p>' +
        '<div class="account-profile"><div class="account-avatar" data-account-avatar aria-hidden="true">↗</div><div class="account-heading"><h1 id="account-title"><span class="account-title-muted">Your keys.</span><span>Your world.</span></h1><span class="account-status" data-account-status>Signed out</span></div></div>' +
        '<p class="account-intro" data-account-intro>One Auth Kit opens your identity, wallet, domains and publishing.</p>' +
        '<section class="account-state" aria-label="Identity details" hidden><dl>' +
        '<div class="account-state-secondary"><dt>Root key</dt><dd data-account-root>—</dd></div>' +
        '<div class="account-state-primary"><dt>Ghost ID</dt><button type="button" class="account-copy" data-account-copy-ghost>Copy</button><dd data-account-id>—</dd></div>' +
        '<div class="account-state-primary"><dt>Wallet</dt><button type="button" class="account-copy" data-account-copy-wallet>Copy</button><dd data-account-wallet>—</dd></div>' +
        '<div class="account-state-secondary"><dt>Security</dt><dd data-account-security>—</dd></div></dl>' +
        '<p data-account-verification>Sign in to verify your identity.</p></section></header>' +
        '<section class="account-card" aria-label="Account"><p class="account-card-caption">DEFXN / Account</p>' +
        '<nav class="account-tabs" role="tablist" aria-label="Account views" hidden>' +
        '<button type="button" role="tab" data-account-tab="session" aria-selected="true">Session</button>' +
        '<button type="button" role="tab" data-account-tab="defi" aria-selected="false">Wallet</button>' +
        '<button type="button" role="tab" data-account-tab="keys" aria-selected="false">Keys</button>' +
        '<button type="button" role="tab" data-account-tab="contacts" aria-selected="false">Contacts</button>' +
        '<button type="button" role="tab" data-account-tab="mesh" aria-selected="false">Network</button>' +
        '</nav>' +
        '<section class="account-auth" data-account-panel="session" aria-label="Account session"><nav class="account-tabs account-signin-tabs" data-account-create-toggle-row aria-label="Sign in or create"><button type="button" aria-pressed="true" data-account-create-back>Sign in</button><button type="button" aria-pressed="false" data-account-create-toggle>Create identity</button></nav><div data-account-session-main><h2 class="account-session-title" data-account-session-title>Choose your Auth Kit.</h2><p class="account-session-description" data-account-session-description>Open your account on this device.</p><div data-account-auth></div>' +
        '<button type="button" data-account-forget hidden>Sign out</button><p class="account-storage-notice" data-account-storage-notice role="status" hidden></p>' +
        '<p class="account-storage-notice" data-account-mesh-auth-notice role="status" hidden></p>' +
        '<div class="account-cms"><a href="' + href('bundledeployer') + '" data-scene-link="bundledeployer">Deploy a bundle →</a><a href="' + href('account/domains') + '" data-scene-link="account/domains">Your domains →</a><a hidden href="/admin" target="_blank" rel="opener" data-account-cms-open>Open publishing ↗</a><span hidden data-account-cms-local>Publishing tools available</span><span data-account-cms-status role="status"></span></div></div>' +
        '<p class="account-security-signal"><span>ON THIS DEVICE</span><strong>Your Auth Kit stays with you.</strong></p><div class="account-create" data-account-create-view hidden><h2>Create your identity.</h2><p>Make a new Auth Kit for your account.</p><div data-account-create></div></div></section>' +
        '<section class="account-live" data-account-panel="defi" aria-labelledby="account-live-title" hidden><h2 class="account-visually-hidden" id="account-live-title">Wallet</h2>' +
        /* Wallet: FXN on dense-wire only (js/ark/dense-wire-wallet.mjs).
           Rebuilt 2026-10-16: FXN is now a sovereign chain's own native-
           token balance ("treat FXN like any other chain's native
           token"), so a send is ONE sender-signed NativeTransfer -- no
           more two-holder transfer slip (that whole protocol belonged to
           a custody chain deleted from dense-wire the same week this
           broke). Credits have no dense-wire ledger: shown as not built,
           never as 0. */
        '<div class="account-wallet" data-account-wallet-view="home"><div class="account-balances"><article class="account-balance" data-account-fxn><span class="account-balance-head"><img data-account-fxn-logo alt="" hidden /><small data-account-fxn-label>FXN</small></span><strong data-account-fxn-balance>—</strong><span data-account-fxn-message>Sign in to check</span></article>' +
        '<article class="account-balance" data-account-credits><small>Credits</small><strong data-account-credits-balance>Coming soon</strong><span data-account-credits-message>Credit balances are not available yet.</span></article></div>' +
        '<div class="account-transfers"><h3>Your public key</h3><p class="account-transfer"><span><small data-account-fxn-key>—</small></span><button type="button" data-account-fxn-copy-key disabled>Copy</button></p>' +
        '<p class="account-contacts-empty">Share this public key to receive FXN. You never need to share your Auth Kit or PIN.</p></div>' +
        '<div class="account-wallet-actions"><button type="button" class="palette-solid" data-account-wallet-open="send" disabled>Send FXN</button><button type="button" class="account-quiet" data-account-fxn-refresh>Refresh</button></div></div>' +
        '<form data-account-wallet-view="send" data-account-fxn-send-form class="account-wallet-form" hidden><button type="button" class="account-back" data-account-wallet-back>← Wallet</button><h3>Send FXN</h3><p>Review the recipient and amount before signing on this device.</p>' +
        '<label for="fxnSendAmount">Amount (FXN)</label><input id="fxnSendAmount" type="number" min="1" step="1" autocomplete="off" data-account-fxn-send-amount placeholder="0" />' +
        '<label for="fxnSendRecipient">Recipient key</label><input id="fxnSendRecipient" type="text" autocomplete="off" spellcheck="false" data-account-fxn-send-recipient placeholder="Paste the recipient’s public key" /><button type="submit" class="palette-solid" data-account-fxn-send-submit disabled>Review &amp; sign</button></form>' +
        '<p class="account-line" data-account-fxn-send-status role="status" aria-live="polite"></p>' +
        '<div class="account-wallet-network"><span class="account-wallet-network-label">Network</span><div class="network-options" data-account-fxn-network></div></div>' +
        '<p class="account-next">Balances update directly from the selected network.</p></section>' +
        '<section class="account-contacts" data-account-panel="contacts" aria-labelledby="account-contacts-title" hidden><div data-contacts-view="list"><h2 class="account-visually-hidden" id="account-contacts-title">Contacts</h2>' +
        '<form data-contacts-search-form class="account-contacts-form"><label for="contactsSearchQuery">Find an identity</label><input id="contactsSearchQuery" type="text" autocomplete="off" placeholder="Name or identity ID" /><button type="submit">Search</button></form>' +
        '<p class="account-line" data-contacts-status role="status" aria-live="polite"></p><ul data-contacts-results class="account-contacts-list account-contacts-results" hidden></ul>' +
        '<div class="account-contacts-lists"><div><h3>Invites to you <b data-contacts-incoming-count>0</b></h3><ul data-contacts-incoming class="account-contacts-list"><li class="account-contacts-empty">None pending.</li></ul></div><div class="account-contacts-connected"><h3>Contacts <b data-contacts-accepted-count>0</b></h3><ul data-contacts-accepted class="account-contacts-list"><li class="account-contacts-empty">No accepted contacts yet.</li></ul></div><div><h3>Sent <b data-contacts-outgoing-count>0</b></h3><ul data-contacts-outgoing class="account-contacts-list"><li class="account-contacts-empty">None pending.</li></ul></div></div>' +
        '<button type="button" class="account-quiet" data-contacts-refresh>Refresh</button></div>' +
        '<article class="account-contact-detail" data-contacts-view="detail" hidden><button type="button" class="account-back" data-contact-back>← All contacts</button><header><div class="account-contact-avatar" data-contact-avatar aria-hidden="true">ID</div><div><h2 data-contact-name>Identity</h2><span data-contact-state>Connection</span></div></header><dl><div><dt>Identity ID</dt><dd data-contact-id>—</dd></div><div><dt>Public ID</dt><dd data-contact-public-id>—</dd></div><div><dt>Visibility</dt><dd data-contact-visibility>—</dd></div><div><dt>Updated</dt><dd data-contact-updated>—</dd></div></dl><p data-contact-bio>No public profile details are available for this identity.</p><a href="' + href('explorer') + '" data-scene-link="explorer">View network details →</a></article></section>' +
        '<section class="account-mesh" data-account-panel="mesh" aria-label="Network status" hidden><div class="account-mesh-check" aria-live="polite"><small>Identity status</small><strong data-account-mesh-status>Not verified</strong><p data-account-mesh-message>Verify this identity on the selected DEFXN network.</p><button type="button" data-account-mesh-check disabled>Verify identity</button></div>' +
        '<div class="account-standing"><small>Account status</small><strong data-account-standing>Not linked</strong><span data-account-standing-message>A verified account link is required.</span></div>' +
        '<dl class="account-mesh-detail" data-account-mesh-detail hidden><div><dt>Record</dt><dd data-account-mesh-record>—</dd></div><div><dt>Verification</dt><dd data-account-mesh-verification>—</dd></div><div><dt>Updated</dt><dd data-account-mesh-updated>—</dd></div><div><dt>Source</dt><dd data-account-mesh-provenance>—</dd></div></dl></section>' +
        '<section class="account-keys" data-account-panel="keys" aria-label="Signing wallets" hidden><p class="account-field-hint">Create dedicated signing keys and manage each one independently without changing your primary identity.</p>' +
        '<ul data-account-keys-list class="account-contacts-list"></ul>' +
        '<form data-account-keys-add-form class="account-wallet-form"><h3>Add a signing wallet</h3><label>Label<input data-account-keys-add-label type="text" value="Default"></label><label>PIN<input data-account-keys-pin type="password" autocomplete="off"></label><label>Password (if set)<input data-account-keys-password type="password" autocomplete="off"></label><button type="submit" data-account-keys-add-submit>Add wallet</button><p data-account-keys-add-result class="inline-status"></p></form>' +
        '<form data-account-keys-action-form class="account-wallet-form"><h3>Rotate, revoke or delegate</h3><label>Wallet address<input data-account-keys-address type="text" placeholder="Paste a wallet address from the list above"></label><label>New label (rotate only)<input data-account-keys-rotate-label type="text" value="Rotated"></label><div class="account-wallet-actions"><button type="button" data-account-keys-rotate>Rotate</button><button type="button" data-account-keys-revoke>Revoke</button><button type="button" data-account-keys-delegate>Delegate to identity</button><button type="button" data-account-keys-revoke-delegation>Revoke delegation</button></div><p data-account-keys-action-result class="inline-status"></p></form></section></section>' +
        '<aside class="account-rail" aria-label="Your account at a glance" hidden>' +
        '<button type="button" class="account-rail-item" data-needs-key data-account-go="defi"><small>FXN</small><strong data-account-rail-fxn>—</strong></button>' +
        '<button type="button" class="account-rail-item" data-needs-key data-account-go="defi"><small>Credits</small><strong data-account-rail-credits>—</strong></button>' +
        '<button type="button" class="account-rail-item" data-needs-key data-account-go="contacts"><small>Contacts</small><strong data-account-overview-contacts>—</strong></button>' +
        '<button type="button" class="account-rail-item" data-needs-key data-account-go="contacts"><small>Invites</small><strong data-account-rail-invites>—</strong></button>' +
        '<a class="account-rail-item" href="' + href('account/domains') + '" data-scene-link="account/domains"><small>Domains</small><strong data-account-rail-domains>0</strong></a>' +
        '<button type="button" class="account-rail-item" data-account-go="mesh"><small>Status</small><strong data-account-overview-mesh>Not verified</strong></button>' +
        '<a class="account-rail-link" href="' + href('explorer') + '" data-scene-link="explorer"><small>Explore the network</small>Mesh Explorer →</a></aside>' +
        /* Anchor for reusable content blocks (js/content/components.js); rendering into
           it is centralized in js/main.js's onMount hook, not called here. Baked into the
           HTML string itself, like the rest of this page, rather than a querySelector()
           afterward, since this page module builds entirely from one innerHTML write. */
        '<div data-ark-insert="main"></div>' +
        '</div>';
      host.appendChild(page);
      var fields = {
        heading: page.querySelector('[data-account-heading]'),
        id: page.querySelector('[data-account-id]'),
        root: page.querySelector('[data-account-root]'),
        wallet: page.querySelector('[data-account-wallet]'),
        copyGhost: page.querySelector('[data-account-copy-ghost]'),
        copyWallet: page.querySelector('[data-account-copy-wallet]'),
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
        fxnLogo: page.querySelector('[data-account-fxn-logo]'),
        fxnLabel: page.querySelector('[data-account-fxn-label]'),
        fxnBalance: page.querySelector('[data-account-fxn-balance]'),
        fxnMessage: page.querySelector('[data-account-fxn-message]'),
        fxnKey: page.querySelector('[data-account-fxn-key]'),
        fxnCopyKey: page.querySelector('[data-account-fxn-copy-key]'),
        fxnWire: page.querySelector('[data-account-fxn-wire]'),
        fxnSendForm: page.querySelector('[data-account-fxn-send-form]'),
        fxnSendAmount: page.querySelector('[data-account-fxn-send-amount]'),
        fxnSendRecipient: page.querySelector('[data-account-fxn-send-recipient]'),
        fxnSendSubmit: page.querySelector('[data-account-fxn-send-submit]'),
        fxnSendStatus: page.querySelector('[data-account-fxn-send-status]'),
        fxnRefresh: page.querySelector('[data-account-fxn-refresh]'),
        fxnNetwork: page.querySelector('[data-account-fxn-network]'),
        creditsBalance: page.querySelector('[data-account-credits-balance]'),
        creditsMessage: page.querySelector('[data-account-credits-message]'),
        sendOpen: page.querySelector('[data-account-wallet-open="send"]'),
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
        if (name === 'contacts' || name === 'keys') return !!(identity && ArkUI.accountSession.isUnlocked());
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
        var first = name === 'home' ? null : page.querySelector('[data-account-wallet-view="' + name + '"] :is(textarea,input)');
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
        if (fields.fxnCopyKey) fields.fxnCopyKey.disabled = !enabled;
      }
      function syncRail() {
        if (fields.railFxn) fields.railFxn.textContent = fields.fxnBalance.textContent;
        if (fields.railCredits) fields.railCredits.textContent = fields.creditsBalance.textContent;
        var standing = fields.standing.textContent, mesh = fields.meshStatus.textContent;
        if (fields.overviewMesh) fields.overviewMesh.textContent = standing !== 'Not linked' ? standing : (mesh === 'Identity verified' ? 'Not linked' : mesh);
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
      var keysFields = {
        list: page.querySelector('[data-account-keys-list]'),
        addForm: page.querySelector('[data-account-keys-add-form]'),
        addLabel: page.querySelector('[data-account-keys-add-label]'),
        pin: page.querySelector('[data-account-keys-pin]'),
        password: page.querySelector('[data-account-keys-password]'),
        addResult: page.querySelector('[data-account-keys-add-result]'),
        address: page.querySelector('[data-account-keys-address]'),
        rotateLabel: page.querySelector('[data-account-keys-rotate-label]'),
        rotate: page.querySelector('[data-account-keys-rotate]'),
        revoke: page.querySelector('[data-account-keys-revoke]'),
        delegate: page.querySelector('[data-account-keys-delegate]'),
        revokeDelegation: page.querySelector('[data-account-keys-revoke-delegation]'),
        actionResult: page.querySelector('[data-account-keys-action-result]')
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
        fields.meshStatus.textContent = 'Not verified';
        fields.meshMessage.textContent = message || 'Verify this identity on the selected DEFXN network.';
        fields.meshDetail.hidden = true;
        fields.meshRecord.textContent = '—'; fields.meshVerification.textContent = '—';
        fields.meshUpdated.textContent = '—'; fields.meshProvenance.textContent = '—';
        fields.standing.textContent = 'Not linked';
        fields.standingMessage.textContent = 'A verified account link is required to show network status.';
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
        fields.meshStatus.textContent = 'Verifying identity…';
        fields.meshMessage.textContent = 'Checking your public identity and linked account.';
        syncRail();
        try {
          var response = await fetch(LOCAL_MINER + '/explorer/v1/record', {
            method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json' },
            body: JSON.stringify({ sourceId: 'identities', recordId: id }),
            signal: controller.signal, cache: 'no-store'
          });
          var payload = await response.json().catch(function () { return null; });
          if (!response.ok) throw new Error('The network could not verify this identity.');
          var record = explorerRecord(payload, id);
          if (record.verification?.state !== 'verified') throw new Error('This identity record could not be verified.');
          if (token !== generation || !page.isConnected || !identity || identity.identityId !== id) return;
          var identityBody = record.fields && record.fields.sourceRecord && typeof record.fields.sourceRecord === 'object' ? record.fields.sourceRecord : {};
          var accountId = typeof identityBody.accountId === 'string' && identityBody.accountId.trim() ? identityBody.accountId.trim() : '';
          var account = null;
          /* Standing is shown only after a signed account binding is verified. */
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
          fields.meshStatus.textContent = 'Identity verified';
          fields.meshMessage.textContent = account ? 'Your identity and linked account are verified on DEFXN.' : 'Your identity is verified. Link an account to display its network status.';
          fields.meshRecord.textContent = text(record.id);
          fields.meshVerification.textContent = text(record.verification && record.verification.state);
          fields.meshUpdated.textContent = text(record.updatedAt, 'Not dated');
          fields.meshProvenance.textContent = text(record.provenance && (record.provenance.source || record.provenance.location), 'Not reported');
          var accountBody = account && account.fields && account.fields.sourceRecord && typeof account.fields.sourceRecord === 'object' ? account.fields.sourceRecord : {};
          var standing = accountBody.standing || accountBody.status || '';
          fields.standing.textContent = account ? (standing ? text(standing) : 'Verified account · no status') : 'Not linked';
          fields.standingMessage.textContent = account ? ('Account ' + accountId + (standing ? ' · verified status' : ' · verified')) : 'No linked account was found.';
          fields.meshDetail.hidden = false;
          syncRail();
        } catch (error) {
          if (token !== generation || !page.isConnected || !identity || identity.identityId !== id) return;
          fields.meshStatus.textContent = error && error.name === 'AbortError' ? 'Verification timed out' : 'Not connected';
          fields.meshMessage.textContent = error && error.name === 'AbortError' ? 'The network took too long to respond. Try again.' : error instanceof TypeError ? 'We could not reach the network. Try again.' : text(error && error.message, 'We could not verify this identity.');
          syncRail();
        } finally {
          window.clearTimeout(timeout);
          if (token === generation && page.isConnected) { controller = null; fields.check.disabled = !identity; }
        }
      }

      function escapeHtml(value) { return String(value).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }

      /* ---- FXN on dense-wire ------------------------------------------
         Everything that builds, checks, signs or sends lives in
         js/ark/dense-wire-wallet.mjs (an ES module over the vendored
         js/dense-wire/ client), loaded on first use with import() rather
         than through the catalog's script list: page-loader.js loads
         classic scripts only, and a wallet that cannot load (no module
         support, a file: URL) must not take the Session, Contacts and
         Mesh views down with it. Every signature goes through
         ArkUI.authorizationDialog's full review first, inside that module.
         The balance is read live (NATIVE_BALANCE), never estimated, and an
         unanswerable read shows as unavailable, never as 0.

         Rebuilt 2026-10-16: FXN is now a sovereign chain's own native
         token ("treat FXN like any other chain's native token"); a send
         is ONE sender-signed record, not a two-holder transfer slip --
         see dense-wire-wallet.mjs's own header for why that whole
         protocol is gone, not just patched. Also added a real network
         switcher (`fields.fxnNetwork`): the old hardcoded production-only
         endpoint had no way to point this tab at a local devnet node for
         testing, found the same day this balance bug was. */
      var WALLET_MODULE = 'js/ark/dense-wire-wallet.mjs?v=20261016-listbox1';
      var FXN_META_MODULE = 'js/ark/fxn-meta.mjs?v=20261016-fxnmeta1';
      var CREDITS_UNAVAILABLE = 'Credit balances are not available yet.';
      var walletModule = null;
      var fxnMetaModule = null;
      // undefined = not attempted yet this network; null = attempted, none
      // found/verified; an object = loaded. Reset alongside `wire` on a
      // network switch (initNetworkSelect below), since a different
      // chain-server may have different or no published metadata.
      var fxnMeta;
      var wire = null;
      var walletGeneration = 0;
      var walletBusy = false;

      function loadFxnMetaModule() {
        if (!fxnMetaModule) {
          fxnMetaModule = Promise.resolve().then(function () {
            var path = (location.protocol === 'file:' ? '' : '/') + FXN_META_MODULE;
            return import(new URL(path, document.baseURI).href);
          }).catch(function (error) {
            fxnMetaModule = null;
            throw error;
          });
        }
        return fxnMetaModule;
      }
      /** Loads FXN's published metadata (name/logo), once per network,
       *  and paints it next to the balance -- disclosure only, so any
       *  failure here is swallowed and the plain "FXN" label stays,
       *  never blocking or degrading the real balance read above it. */
      function applyFxnMeta(link) {
        if (fxnMeta !== undefined) {
          paintFxnMeta(fxnMeta);
          return;
        }
        loadFxnMetaModule().then(function (fm) { return fm.loadFxnMeta(link); }).then(function (meta) {
          fxnMeta = meta || null;
          paintFxnMeta(fxnMeta);
        }).catch(function () {
          fxnMeta = null;
          paintFxnMeta(null);
        });
      }
      function paintFxnMeta(meta) {
        if (!fields.fxnLabel) return;
        if (meta && meta.doc && meta.doc.body && meta.doc.body.symbol) {
          fields.fxnLabel.textContent = meta.doc.body.symbol;
        } else {
          fields.fxnLabel.textContent = 'FXN';
        }
        if (fields.fxnLogo) {
          if (meta && meta.image) {
            fields.fxnLogo.src = meta.image;
            fields.fxnLogo.hidden = false;
          } else {
            fields.fxnLogo.hidden = true;
            fields.fxnLogo.removeAttribute('src');
          }
        }
      }

      function loadWalletModule() {
        if (!walletModule) {
          walletModule = Promise.resolve().then(function () {
            var path = (location.protocol === 'file:' ? '' : '/') + WALLET_MODULE;
            return import(new URL(path, document.baseURI).href);
          }).catch(function (error) {
            walletModule = null;
            throw new Error('The dense-wire wallet could not load (' + text(error && error.message, 'module error') + ').');
          });
        }
        return walletModule;
      }

      function walletWire(dw) {
        if (!wire) wire = new dw.WalletWire(dw.resolveWireUrl());
        if (fields.fxnWire) fields.fxnWire.textContent = wire.url;
        return wire;
      }

      /** Mounts the network <select> via dense-wire-wallet.mjs's shared
       *  `mountNetworkSelect` (also used by the site-wide nav switcher in
       *  js/resolvers/header.js) so there is one place that knows how to
       *  populate/wire one of these, not a hand-copied version per
       *  surface. Switching -- from here, or from the nav switcher on the
       *  same page -- closes the current connection and re-reads. */
      function initNetworkSelect(dw) {
        if (!fields.fxnNetwork) return;
        dw.mountNetworkSelect(fields.fxnNetwork, function () {
          if (wire) { wire.close(); wire = null; }
          fxnMeta = undefined;
          paintFxnMeta(null);
          resetWallet('Switching networks…');
          loadWallet();
        });
      }

      function say(message) { fields.fxnSendStatus.textContent = message; }

      function walletError(error, fallback) {
        var message = text(error && error.message, '');
        return /amount|recipient|public key|insufficient|balance/i.test(message) ? message : fallback;
      }

      /* Signing wallets (docs/FLUX-WALLET-DELEGATION-SCOPE-VISION.md) --
         distinct from the dense-wire FXN "Wallet" tab above: these are real
         flux-auth/wallet-lifecycle wallet-link records stored on the Auth
         Kit itself (`identity.walletAddresses`/`addWallet`/`rotateWallet`/
         `revokeWallet`/`delegateWallet`, wired in scripts/auth-entry.js).
         `identity.walletAddresses`/`walletDelegations` are live getters
         (re-derived from the current vault on every read), not frozen
         snapshots, so this list always reflects the latest mutation
         without needing a fresh sign-in. */
      function renderKeys() {
        if (!keysFields.list) return;
        var addresses = (identity && identity.walletAddresses) || [];
        var delegations = (identity && identity.walletDelegations) || {};
        if (!addresses.length) {
          keysFields.list.innerHTML = '<li class="account-contacts-empty">No signing wallets yet.</li>';
          return;
        }
        keysFields.list.innerHTML = addresses.map(function (address) {
          var delegation = delegations[address];
          var status = delegation ? (delegation.revoked ? ' · delegation revoked' : ' · delegated to identity') : '';
          return '<li class="account-contact-item"><span>' + address + (address === identity.walletAddress ? ' (default)' : '') + status + '</span></li>';
        }).join('');
      }

      /* Every signature site on this page (FXN sends, Credits requests)
         shows ArkUI.authorizationDialog's full scoped-review dialog before
         signing -- see js/ark/fabric-transfer-browser.js's own header on
         why ("centralize, don't duplicate": one dialog, every signer).
         These five wallet actions are signing surfaces too (addWallet/
         rotateWallet mint and sign a new wallet-link record; delegateWallet
         signs a capability grant) but shipped calling `identity.*` directly
         with no review step at all -- found and reported directly, not
         caught by any test, since neither the jsdom click-tests nor the
         real-browser pass checked for the dialog's PRESENCE, only that the
         underlying action succeeded.
         `identity.addWallet` etc. are opaque (auth-entry.js builds AND
         signs AND reseals in one call), unlike fabric-transfer-browser.js's
         `signedRecord()` which controls message construction itself -- so
         this cannot show the exact final signed bytes before approving,
         only the real action and its real parameters. That is still the
         substantive review the law asks for (what is this, for which
         wallet, under what cap), short of the literal signed envelope. */
      function confirmWalletAction(opts) {
        if (!(window.ArkUI.authorizationDialog && window.ArkAuthorizationView && window.ArkUI.ed25519Pem && window.ArkUI.directoryTransport)) return Promise.resolve(true);
        var messageText = JSON.stringify(opts.manifest);
        return window.ArkUI.ed25519Pem.sha256HexOfText(messageText).then(function (digest) {
          var view = window.ArkAuthorizationView.scopedAuthorizationView({
            title: opts.title,
            description: 'Review exactly what this authorizes before approving. Nothing changes until you approve.',
            requester: (identity && (identity.displayName || identity.identityId || identity.publicKeyB64)) || 'This identity',
            network: window.ArkUI.directoryTransport.NETWORK_ID,
            authority: 'flux wallet lifecycle',
            configuration: 'flux-wallet-delegation/v1',
            scope: opts.scope,
            action: opts.action,
            manifestDigest: digest,
            claimStack: [
              'primary authorize ' + opts.action + ' for exact manifest ' + digest,
              'constraint owner ' + ((identity && (identity.publicKeyB64 || identity.identityId)) || ''),
              'failure reject altered or replayed bytes',
              'trust zero',
            ].join('\n'),
            manifest: opts.manifest,
            authorizationBytes: messageText,
            actionPayloadBytes: messageText,
            facts: opts.facts || [],
          });
          return window.ArkUI.authorizationDialog.confirm(view, { action: opts.action, capability: opts.scope });
        });
      }

      keysFields.addForm && keysFields.addForm.addEventListener('submit', function (event) {
        event.preventDefault();
        if (!identity || !identity.addWallet) return;
        var label = keysFields.addLabel.value.trim() || 'Default';
        confirmWalletAction({
          title: 'Add a signing wallet', scope: 'wallet.add', action: 'wallet.add.sign',
          manifest: { label: label }, facts: [{ label: 'Label', value: label }],
        }).then(function (approved) {
          if (!approved) throw new Error('Cancelled. No wallet was added.');
          keysFields.addResult.textContent = 'Adding…';
          return identity.addWallet({ pin: keysFields.pin.value, password: keysFields.password.value || undefined, label: label });
        }).then(function (result) {
          keysFields.addResult.textContent = 'Added ' + result.walletAddress;
          keysFields.pin.value = '';
          renderKeys();
        }).catch(function (error) { keysFields.addResult.textContent = text(error && error.message, 'Could not add a wallet.'); });
      });

      keysFields.rotate && keysFields.rotate.addEventListener('click', function () {
        if (!identity || !identity.rotateWallet) return;
        var address = keysFields.address.value.trim();
        var label = keysFields.rotateLabel.value.trim() || undefined;
        confirmWalletAction({
          title: 'Rotate wallet', scope: 'wallet.rotate', action: 'wallet.rotate.sign',
          manifest: { walletAddress: address, label: label || null },
          facts: [{ label: 'Wallet', value: address }],
        }).then(function (approved) {
          if (!approved) throw new Error('Cancelled. This wallet was not rotated.');
          keysFields.actionResult.textContent = 'Rotating…';
          return identity.rotateWallet({ walletAddress: address, pin: keysFields.pin.value, password: keysFields.password.value || undefined, label: label });
        }).then(function (result) {
          keysFields.actionResult.textContent = 'Rotated ' + address + ' → ' + result.walletAddress;
          keysFields.pin.value = '';
          renderKeys();
        }).catch(function (error) { keysFields.actionResult.textContent = text(error && error.message, 'Could not rotate this wallet.'); });
      });

      keysFields.revoke && keysFields.revoke.addEventListener('click', function () {
        if (!identity || !identity.revokeWallet) return;
        var address = keysFields.address.value.trim();
        confirmWalletAction({
          title: 'Revoke wallet', scope: 'wallet.revoke', action: 'wallet.revoke.sign',
          manifest: { walletAddress: address }, facts: [{ label: 'Wallet', value: address }],
        }).then(function (approved) {
          if (!approved) throw new Error('Cancelled. This wallet was not revoked.');
          keysFields.actionResult.textContent = 'Revoking…';
          return identity.revokeWallet({ walletAddress: address });
        }).then(function () {
          keysFields.actionResult.textContent = 'Revoked ' + address;
          renderKeys();
        }).catch(function (error) { keysFields.actionResult.textContent = text(error && error.message, 'Could not revoke this wallet.'); });
      });

      keysFields.delegate && keysFields.delegate.addEventListener('click', function () {
        if (!identity || !identity.delegateWallet) return;
        var address = keysFields.address.value.trim();
        // `spend` without a real `maxSpend` is refused at creation by
        // `createWalletDelegation` itself (`WALLET_DELEGATION_SPEND_REQUIRES_CAP`)
        // -- a real bug this exact button shipped with until a real click
        // through it (not just a syntax check) surfaced it. A fixed,
        // conservative default cap here, not an unbounded grant.
        var maxSpend = { amount: 100, period: 'daily' };
        confirmWalletAction({
          title: 'Delegate to this identity', scope: 'wallet.delegate', action: 'wallet.delegate.sign',
          manifest: { walletAddress: address, rights: ['receive', 'spend'], maxSpend: maxSpend },
          facts: [{ label: 'Wallet', value: address }, { label: 'Rights', value: 'receive+spend' }, { label: 'Max spend', value: maxSpend.amount + '/' + maxSpend.period }],
        }).then(function (approved) {
          if (!approved) throw new Error('Cancelled. This wallet was not delegated.');
          keysFields.actionResult.textContent = 'Delegating…';
          return identity.delegateWallet({ walletAddress: address, rights: ['receive', 'spend'], maxSpend: maxSpend });
        }).then(function (result) {
          keysFields.actionResult.textContent = 'Delegated ' + result.delegatedRights.join('+') + ' to this identity';
          renderKeys();
        }).catch(function (error) { keysFields.actionResult.textContent = text(error && error.message, 'Could not delegate this wallet.'); });
      });

      keysFields.revokeDelegation && keysFields.revokeDelegation.addEventListener('click', function () {
        if (!identity || !identity.revokeWalletDelegation) return;
        var address = keysFields.address.value.trim();
        confirmWalletAction({
          title: 'Revoke delegation', scope: 'wallet.revoke-delegation', action: 'wallet.revoke-delegation.sign',
          manifest: { walletAddress: address }, facts: [{ label: 'Wallet', value: address }],
        }).then(function (approved) {
          if (!approved) throw new Error('Cancelled. This delegation was not revoked.');
          identity.revokeWalletDelegation({ walletAddress: address });
          keysFields.actionResult.textContent = 'Revoked the delegation for ' + address;
          renderKeys();
        }).catch(function (error) { keysFields.actionResult.textContent = text(error && error.message, 'Could not revoke this delegation.'); });
      });

      function resetWallet(message) {
        walletGeneration += 1;
        fields.fxnBalance.textContent = '—';
        fields.fxnMessage.textContent = message || 'Sign in to check';
        fields.creditsBalance.textContent = 'Coming soon';
        fields.creditsMessage.textContent = CREDITS_UNAVAILABLE;
        if (fields.fxnKey) fields.fxnKey.textContent = '—';
        setSendable(false);
        syncRail();
      }

      async function loadWallet() {
        var who = ArkUI.accountSession.current();
        if (!who || !page.isConnected) return;
        var token = ++walletGeneration;
        fields.fxnMessage.textContent = 'Updating balance…';
        try {
          var dw = await loadWalletModule();
          if (token !== walletGeneration || !page.isConnected) return;
          var link = walletWire(dw);
          initNetworkSelect(dw);
          applyFxnMeta(link);
          var key = dw.signerFor(who).pubHex;
          if (fields.fxnKey) fields.fxnKey.textContent = key;
          setSendable(!walletBusy);
          // `link.balance` returns a BigInt, or `null` when this chain-
          // server has no FXN ledger to answer from (absent, never a
          // cosmetic zero -- `native_ledger.rs`'s own distinction).
          var amount = await link.balance(key);
          if (token !== walletGeneration || !page.isConnected) return;
          if (amount === null) {
            fields.fxnBalance.textContent = 'Unavailable';
            fields.fxnMessage.textContent = 'FXN is not available on this network.';
          } else {
            fields.fxnBalance.textContent = amount.toString();
            fields.fxnMessage.textContent = amount === 0n ? 'No FXN in this account.' : 'Available balance';
          }
        } catch (error) {
          if (token !== walletGeneration || !page.isConnected) return;
          fields.fxnBalance.textContent = 'Unavailable';
          fields.fxnMessage.textContent = walletError(error, 'Balance unavailable. Try again.');
        }
        syncRail();
      }

      /* One send at a time; the review modal is opened by the module.
         After any attempt the balance is re-read, since a send may have
         been admitted (and moved real value) even if this page then hit
         an unrelated error reading the result back. */
      async function runSend() {
        var who = ArkUI.accountSession.current();
        if (!who || walletBusy) return;
        var amount = (fields.fxnSendAmount.value || '').trim();
        var recipient = (fields.fxnSendRecipient.value || '').trim();
        walletBusy = true;
        setSendable(false);
        try {
          var dw = await loadWalletModule();
          var reply = await dw.sendFxn({ who: who, wire: walletWire(dw), amount: amount, recipient: recipient });
          say(dw.describeSendReply(reply));
          if (reply.kind === 'ok') { fields.fxnSendAmount.value = ''; fields.fxnSendRecipient.value = ''; showWallet('home'); }
        } catch (error) {
          say(walletError(error, 'That transfer could not be completed. Nothing was sent.'));
        } finally {
          walletBusy = false;
          loadWallet();
        }
      }

      if (fields.fxnRefresh) fields.fxnRefresh.addEventListener('click', loadWallet);

      if (fields.fxnSendForm) fields.fxnSendForm.addEventListener('submit', function (event) {
        event.preventDefault();
        runSend();
      });

      function copyText(value, done) {
        if (!value) return;
        var clip = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(value) : Promise.reject(new Error('no clipboard'));
        clip.then(function () { say(done); }, function () { say('Copy is blocked in this browser. Select the text and copy it by hand.'); });
      }
      if (fields.fxnCopyKey) fields.fxnCopyKey.addEventListener('click', function () { copyText(fields.fxnKey.textContent, 'Key copied.'); });
      function copyAccountField(button, field) {
        if (!button || !field) return;
        button.addEventListener('click', function () {
          var value = field.textContent;
          if (!value || value === '—') return;
          var clip = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(value) : Promise.reject(new Error('no clipboard'));
          clip.then(function () {
            button.textContent = 'Copied';
            setTimeout(function () { button.textContent = 'Copy'; }, 1400);
          }, function () { button.textContent = 'Select to copy'; });
        });
      }
      copyAccountField(fields.copyGhost, fields.id);
      copyAccountField(fields.copyWallet, fields.wallet);

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
          contactsFields.status.textContent = 'Contacts are temporarily unavailable. Try again.';
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
          if (contactsFields.detailState) contactsFields.detailState.textContent = state || contactStates[id] || 'DEFXN identity';
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
        contactsFields.status.textContent = 'Searching identities…';
        contactsFields.results.hidden = false;
        try {
          var results = await window.ArkUI.meshDirectory.searchIdentities(who, query);
          contactsFields.status.textContent = results.length ? '' : ('No identity matches "' + query + '". Try their identity ID instead.');
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
          contactsFields.status.textContent = 'Search is temporarily unavailable. Try again.';
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
        var accountOpens = page.querySelector('[data-account-opens]');
        if (accountOpens) accountOpens.hidden = !!identity;
        page.querySelector('[data-account-create-toggle-row]').hidden = !!identity;
        if (identity && createView && !createView.hidden) showCreate(false);
        applyTabs();
        if (unlocked && window.ArkUI && window.ArkUI.meshDirectory) { loadContacts(false); startContactsPolling(); }
        else { resetContacts(unlocked ? '' : 'Unlock your Auth Kit to invite or respond to identities.'); stopContactsPolling(); }
        if (unlocked) { loadWallet(); renderKeys(); }
        else { resetWallet(identity ? 'Unlock your Auth Kit to read your FXN balance.' : undefined); if (keysFields.list) keysFields.list.innerHTML = ''; }
        var name = identity && identity.displayName || 'Your account.';
        var accountTitle = page.querySelector('#account-title');
        if (identity) accountTitle.textContent = name;
        else accountTitle.innerHTML = '<span class="account-title-muted">Your keys.</span><span>Your world.</span>';
        page.querySelector('[data-account-avatar]').textContent = identity ? name.slice(0, 2).toUpperCase() : '↗';
        page.querySelector('[data-account-status]').textContent = identity ? (unlocked ? (authenticated ? 'Session active · identity unlocked' : 'Identity verified') : (authenticated ? 'Session active · identity locked' : 'Identity saved · not signed in')) : 'Signed out';
        page.querySelector('[data-account-intro]').textContent = identity ? (unlocked ? 'Your identity is ready across the DEFXN world.' : 'Your identity is saved here. Your Auth Kit is not saved on this device.') : 'One Auth Kit opens your identity, wallet, domains and publishing.';
        page.querySelector('[data-account-session-title]').textContent = identity ? (authenticated ? 'Signed in.' : (unlocked ? 'Ready.' : 'Select your Auth Kit again')) : 'Choose your Auth Kit.';
        page.querySelector('[data-account-session-description]').textContent = identity ? (authenticated ? 'Publishing is available. Unlock your Auth Kit when you need to approve a signature.' : unlocked ? 'Secure access is available for this session.' : 'Choose your Auth Kit to restore secure access.') : 'Open your account on this device.';
        var localEditor = ArkUI.cmsSession && ArkUI.cmsSession.isLocalDevelopment && ArkUI.cmsSession.isLocalDevelopment();
        page.querySelector('[data-account-cms-open]').hidden = !localEditor;
        page.querySelector('[data-account-cms-local]').hidden = !localEditor;
        page.querySelector('[data-account-cms-status]').textContent = ArkUI.cmsSession && (localEditor || authenticated) ? ArkUI.cmsSession.status() : '';
        var chooseKit = page.querySelector('[data-account-auth] button');
        if (chooseKit && /^(Choose Auth Kit|Unlock Auth Kit|Select Auth Kit)$/.test((chooseKit.textContent || '').trim())) {
          chooseKit.textContent = identity && !unlocked ? 'Select Auth Kit' : 'Choose Auth Kit';
          chooseKit.setAttribute('aria-label', chooseKit.textContent);
        }
        fields.id.textContent = identity && (identity.core && identity.core.ghostId || identity.ghostId || identity.identityId) || '—';
        fields.root.textContent = identity && identity.publicKeyB64 ? base64ToHex(identity.publicKeyB64) : '—';
        fields.wallet.textContent = identity && identity.walletAddress || 'Not recorded in this kit';
        fields.id.title = fields.id.textContent;
        fields.wallet.title = fields.wallet.textContent;
        fields.security.textContent = identity && identity.securityProfile || '—';
        fields.verification.textContent = identity ? (unlocked ? 'Identity verified.' : 'Unlock your Auth Kit to continue.') : 'Sign in to verify your identity.';
        page.querySelector('[data-account-forget]').hidden = !identity || unlocked;
        page.querySelector('[data-account-forget]').textContent = 'Forget saved identity details';
        var storageNotice = page.querySelector('[data-account-storage-notice]');
        storageNotice.textContent = ArkUI.localIdentity.storageError();
        storageNotice.hidden = !storageNotice.textContent;
        // Set by the mesh-authentication step below (onChange), not by this
        // render itself -- ArkUI.accountSession outlives any one mount(), so
        // the message is read fresh here on every render instead of being
        // written through a closure that may be querying a detached page.
        var meshAuthNotice = page.querySelector('[data-account-mesh-auth-notice]');
        meshAuthNotice.textContent = (ArkUI.accountSession && ArkUI.accountSession.meshAuthMessage) || '';
        meshAuthNotice.hidden = !meshAuthNotice.textContent;
        fields.check.disabled = !identity;
        resetMesh(identity ? undefined : 'Sign in to verify your identity on DEFXN.');
      }
      // One panel owns the signer. A separate public pointer restores account
      // display state eagerly on every route, like chat.deadark.com's provider.
      if (!ArkUI.accountSession) {
        var container = document.createElement('div');
        var preservingIdentity = false;
        var auth = ArkAdminAuth.create({ container: container, product: 'DEFXN', onChange: function (next) {
          if (!preservingIdentity) {
            if (next) {
              ArkUI.localIdentity.set(next);
              if (ArkUI.cmsSession) ArkUI.cmsSession.connect(next).then(function () { ArkUI.localIdentity.refresh(); });
              // Unlocking proves the key locally; this is the step that
              // authenticates the identity to the mesh fleet itself --
              // publishing it to the directory (skipped if already
              // published) shows the real scoped-claim authorization
              // modal before anything is signed. Fire-and-forget: a
              // cancelled or failed publish must not block sign-in.
              if (window.ArkUI.meshDirectory) {
                window.ArkUI.meshDirectory.ensurePublished(next).then(function () {
                  ArkUI.accountSession.meshAuthMessage = '';
                  ArkUI.localIdentity.refresh();
                }).catch(function (error) {
                  ArkUI.accountSession.meshAuthMessage = (error && error.message) || 'Could not authenticate this identity to the mesh.';
                  ArkUI.localIdentity.refresh();
                });
              }
            }
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
          ? 'Unlock your Auth Kit before opening the publishing tools.'
          : 'Sign in with your Auth Kit before opening the publishing tools.';
        var pin = session.container.querySelector('input:not([type="file"])');
        if (pin && pin.focus) { pin.focus(); return; }
        var unlock = session.container.querySelector('button');
        if (unlock && unlock.click) unlock.click();
        else if (unlock && unlock.focus) unlock.focus();
      });
      page.querySelector('[data-account-forget]').addEventListener('click', session.signOut);
      if (fields.check) fields.check.addEventListener('click', checkMesh);
      page.arkDispose = function () { generation += 1; contactsGeneration += 1; walletGeneration += 1; stopContactsPolling(); if (controller) controller.abort(); if (wire) { wire.close(); wire = null; } unsubscribe(); unsubscribeDomains(); session.container.remove(); };
      return page;
    }
  };
})();

/* =====================================================================
   /account -- the person's identity, wallet, signing keys, contacts and network standing.
   ---------------------------------------------------------------------
   Converted to Ark blocks (DEFXN polish Wave 4, W4-S2, 2026-10-20). It was one hand-built
   `innerHTML` string with two H1-scale headings, "Auth Kit" / "Ghost ID" / "Root key" jargon with
   no explanation, and two hand-made tab strips. The browser coverage written first
   (tests/browser/account-flows.mjs, green against the old page) is the safety net; this file keeps
   every behaviour it checks.

   What is an Ark block now (docs/cms-architecture.md "Pages as data"):
     hero                one h1 -- "Sign in to DEFXN", or the person's name once signed in; its meta
                         carries the status. The old second, equally large heading ("Choose your Auth Kit.") is gone
     figure              the Auth Kit -> identity -> wallet -> publishing map, with a caption that says it
     facts               the identity details, the public key, the record details
     disclosure          "What is an Auth Kit?" and "Developer details" (root key, security level,
                         the technical names) -- jargon explained at first use or folded away
     tabs                the account views (Session, Wallet, Signing keys, Contacts, Network) and, signed
                         out, Sign in / Create identity. Rebuilt only when the SESSION STATE changes
                         (signed out / saved / unlocked), because the set of views changes with it
     stats               the FXN balance and Credits (an absent balance names its cause -- "No reading",
                         "Not built yet" -- and is never painted as 0), and the network status
     actions             Send / Refresh / Copy, Verify, Forget saved details, the two ways on and "Open publishing"
                         (disabled and busy states are props)
     form, field         the send form, the signing-wallet forms and the contacts search (Ark's forms chunk,
                         js/ark/vendor/ark-kit-forms.js, listed in this route's scripts); a form never posts: it
                         raises ark:action with its values, and refuses an empty or out-of-range entry in the
                         field's own slot before anything is reviewed or signed
     list                the contact lists (invites, contacts, sent, search results) and the signing wallets, each
                         with an empty state that says why and what to do; a row's buttons raise ark:action with
                         the row's id
     status-line         every result under a form or a list (polite live regions)
     stats (interactive) the glance rail: each tile opens the view that owns its number, or the domains page
     callout             the session view's state (signed out / ready / select your Auth Kit again), the send
                         form's introduction, and the storage and mesh-authentication notices; no second heading
                         competes with the h1

   What stays hand-built, because Ark has no part for it: the PIN and password pair of the signing-wallet forms
   (Ark's field has no password kind), the network options (js/ark/dense-wire-wallet.mjs's shared
   mountNetworkSelect, which the site header also mounts and which listens for the same change event -- it stays
   until that shared module renders through Ark's `choice`), and the contact header (avatar, name, state, bio).
   "Open publishing" is Ark's link but opens through window.open: Ark puts rel="noopener" on every target=_blank
   link and offers no way to omit it, and the publishing tools need window.opener (js/ark/cms-session.js,
   js/admin/gate.js).

   Signing surfaces are unchanged: every signature goes through ArkUI.authorizationDialog's full
   Scoped Claim Authorization review (the Keys actions here; the FXN send and the identity publish in
   their own modules).

   Layout keys: `was` pins keep every key the old page had (tests/fixtures/layout-keys/account.tsv,
   tests/account-blocks.cjs). The page's heading keeps the id `account-title`.
   ===================================================================== */
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

  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html != null) node.innerHTML = html;
    return node;
  }
  /* A person's own words go into block props: a hero title is one line of at most 120 characters, and
     Ark reads `[[term]]` in it as glossary markup -- neither may refuse or reshape a name. */
  function plainLine(value, max) {
    var line = String(value == null ? '' : value).replace(/\s+/g, ' ').trim().replace(/\[\[/g, '[​[');
    return line.length > max ? line.slice(0, max - 1) + '…' : line;
  }

  /* The auth panel and the signer outlive any one mount: one shared session for /account and /auth
     (js/ark/account-session.js). */
  function accountSession() { return ArkUI.openAccountSession(); }

  /* The Auth Kit -> identity -> wallet -> publishing map, the figure block's live part. */
  var MAP_SVG = '<svg viewBox="0 0 560 168" role="presentation"><path class="account-map-route account-map-route-main" d="M78 84H213C252 84 253 35 294 35H380"/><path class="account-map-route" d="M213 84C252 84 253 133 294 133H468"/><path class="account-map-route" d="M380 35C418 35 420 84 458 84H514"/><circle class="account-map-origin" cx="50" cy="84" r="27"/><circle class="account-map-node" cx="213" cy="84" r="6"/><circle class="account-map-node" cx="380" cy="35" r="6"/><circle class="account-map-node" cx="294" cy="133" r="6"/><circle class="account-map-node" cx="458" cy="84" r="6"/><text class="account-map-you" data-ark-label x="50" y="88" text-anchor="middle">YOU</text><text data-ark-label x="200" y="68" text-anchor="end">FXN ID</text><text data-ark-label x="393" y="20">IDENTITY</text><text data-ark-label x="307" y="151">WALLET</text><text data-ark-label x="514" y="68" text-anchor="end">PUBLISH</text></svg>';

  /* The views of the account card, by value. `signin` and `create` exist only while signed out. */
  var TAB_LABEL = { signin: 'Sign in', create: 'Create identity', session: 'Session', defi: 'Wallet', keys: 'Signing keys', contacts: 'Contacts', mesh: 'Network' };
  function tabValues(sessionState) {
    if (sessionState === 'signed-out') return ['signin', 'create'];
    if (sessionState === 'remembered') return ['session', 'defi', 'mesh'];
    return ['session', 'defi', 'keys', 'contacts', 'mesh'];
  }

  /* `was`: the key each element had on the hand-built page (tests/lib/layout-continuity.cjs against
     tests/fixtures/layout-keys/account.tsv); the reasons are in tests/account-blocks.cjs. */
  var CARD = 'page:/div:1/section:1', SESSION = CARD + '/section:1', WALLET = CARD + '/section:2', CONTACTS = CARD + '/section:3', MESH = CARD + '/section:4', KEYS = CARD + '/section:5';
  var HERO = 'page:/div:1/header:1', STATE = HERO + '/section:1', RAIL = 'page:/div:1/aside:1';
  var WAS = {
    'account-shell': { ':root': 'page:/div:1' },
    'account-map': { ':root': { key: HERO + '/div:1', self: true }, '[data-ark-slot="account-map"]': HERO + '/div:1/svg:1' },
    'account-headline': { ':root': { key: HERO + '/div:2', self: true }, eyebrow: HERO + '/p:1', 'hero-lede': HERO + '/p:2' },
    'account-identity': { ':root': { key: STATE + '/dl:1', self: true }, fact: STATE + '/dl:1/div:2', 'fact#2': STATE + '/dl:1/div:3' },
    'account-copy': { button: STATE + '/dl:1/div:2/button:1', 'button#2': STATE + '/dl:1/div:3/button:1' },
    'account-developer-facts': { fact: STATE + '/dl:1/div:1', 'fact#2': STATE + '/dl:1/div:4' },
    'account-session-head': { 'alert-title': SESSION + '/div:1/h2:1', 'alert-description': SESSION + '/div:1/p:1' },
    'account-forget': { button: SESSION + '/div:1/button:1' },
    'account-ways': { button: SESSION + '/div:1/div:2/a:1', 'button#2': SESSION + '/div:1/div:2/a:2' },
    'account-create-head': { 'alert-title': SESSION + '/div:2/h2:1', 'alert-description': SESSION + '/div:2/p:1' },
    'account-balances': {
      ':root': { key: WALLET + '/div:1/div:1', self: true },
      stat: WALLET + '/div:1/div:1/article:1', 'stat-label': WALLET + '/div:1/div:1/article:1/span:1/small:1', 'stat-value': WALLET + '/div:1/div:1/article:1/strong:1', 'stat-detail': WALLET + '/div:1/div:1/article:1/span:2',
      'stat#2': WALLET + '/div:1/div:1/article:2', 'stat-label#2': WALLET + '/div:1/div:1/article:2/small:1', 'stat-value#2': WALLET + '/div:1/div:1/article:2/strong:1', 'stat-detail#2': WALLET + '/div:1/div:1/article:2/span:1' },
    'account-pubkey': { ':root': { key: WALLET + '/div:1/div:2', self: true }, fact: WALLET + '/div:1/div:2/p:1', 'fact-term': WALLET + '/div:1/div:2/h3:1', 'fact-value': WALLET + '/div:1/div:2/p:1/span:1/small:1' },
    'account-wallet-row': { ':root': { key: WALLET + '/div:1/div:3', self: true }, button: WALLET + '/div:1/div:3/button:1', 'button#2': WALLET + '/div:1/div:2/p:1/button:1', 'button#3': WALLET + '/div:1/div:3/button:2' },
    'account-mesh-stats': {
      stat: MESH + '/div:1', 'stat-label': MESH + '/div:1/small:1', 'stat-value': MESH + '/div:1/strong:1', 'stat-detail': MESH + '/div:1/p:1',
      'stat#2': MESH + '/div:2', 'stat-label#2': MESH + '/div:2/small:1', 'stat-value#2': MESH + '/div:2/strong:1', 'stat-detail#2': MESH + '/div:2/span:1' },
    'account-mesh-actions': { button: MESH + '/div:1/button:1' },
    'account-mesh-facts': { ':root': MESH + '/dl:1' },
    'account-cms-status': { ':root': { key: SESSION + '/div:1/div:2/span:2', self: true } },
    'account-send-intro': { 'alert-title': WALLET + '/form:1/h3:1', 'alert-description': WALLET + '/form:1/p:1' },
    'account-send-form': { 'field-label': WALLET + '/form:1/label:1', 'field-label#2': WALLET + '/form:1/label:2', 'button': WALLET + '/form:1/button:2', 'button#2': WALLET + '/form:1/button:1' },
    'account-send-status': { ':root': { key: WALLET + '/p:1', self: true } },
    'account-contacts-search': { ':root': { key: CONTACTS + '/div:1/form:1', self: true }, 'field-label': CONTACTS + '/div:1/form:1/label:1', button: CONTACTS + '/div:1/form:1/button:1' },
    'account-contacts-status': { ':root': { key: CONTACTS + '/div:1/p:1', self: true } },
    'account-contacts-found': { ':root': { key: CONTACTS + '/div:1/ul:1', self: true } },
    'account-contacts-incoming': { ':root': { key: CONTACTS + '/div:1/div:1/div:1/ul:1', self: true }, 'list-empty': CONTACTS + '/div:1/div:1/div:1/ul:1/li:1' },
    'account-contacts-accepted': { ':root': { key: CONTACTS + '/div:1/div:1/div:2/ul:1', self: true }, 'list-empty': CONTACTS + '/div:1/div:1/div:2/ul:1/li:1' },
    'account-contacts-outgoing': { ':root': { key: CONTACTS + '/div:1/div:1/div:3/ul:1', self: true }, 'list-empty': CONTACTS + '/div:1/div:1/div:3/ul:1/li:1' },
    'account-contacts-refresh': { button: CONTACTS + '/div:1/button:1' },
    'account-contact-back': { button: CONTACTS + '/article:1/button:1' },
    'account-contact-facts': { ':root': CONTACTS + '/article:1/dl:1' },
    'account-contact-explore': { button: CONTACTS + '/article:1/a:1' },
    'account-keys-list': { ':root': { key: KEYS + '/ul:1', self: true } },
    'account-keys-add': { ':root': { key: KEYS + '/form:1', self: true }, 'field-label': KEYS + '/form:1/label:1', button: KEYS + '/form:1/button:1' },
    'account-keys-add-result': { ':root': { key: KEYS + '/form:1/p:1', self: true } },
    'account-keys-action': { ':root': { key: KEYS + '/form:2', self: true }, 'field-label': KEYS + '/form:2/label:1', 'field-label#2': KEYS + '/form:2/label:2',
      button: KEYS + '/form:2/div:1/button:1', 'button#2': KEYS + '/form:2/div:1/button:2', 'button#3': KEYS + '/form:2/div:1/button:3', 'button#4': KEYS + '/form:2/div:1/button:4' },
    'account-keys-action-result': { ':root': { key: KEYS + '/form:2/p:1', self: true } },
    'account-rail-stats': {
      stat: RAIL + '/button:1', 'stat-label': RAIL + '/button:1/small:1', 'stat-value': RAIL + '/button:1/strong:1',
      'stat#2': RAIL + '/button:2', 'stat-label#2': RAIL + '/button:2/small:1', 'stat-value#2': RAIL + '/button:2/strong:1',
      'stat#3': RAIL + '/button:3', 'stat-label#3': RAIL + '/button:3/small:1', 'stat-value#3': RAIL + '/button:3/strong:1',
      'stat#4': RAIL + '/button:4', 'stat-label#4': RAIL + '/button:4/small:1', 'stat-value#4': RAIL + '/button:4/strong:1',
      'stat#5': RAIL + '/a:1', 'stat-label#5': RAIL + '/a:1/small:1', 'stat-value#5': RAIL + '/a:1/strong:1',
      'stat#6': RAIL + '/button:5', 'stat-label#6': RAIL + '/button:5/small:1', 'stat-value#6': RAIL + '/button:5/strong:1' },
    'account-rail-link': { button: RAIL + '/a:2' }
  };
  /* An element the page builds by hand carries its old key the same way a block's `was` does: the mark
     js/ark/blocks.js stamps (data-ark-layout-pin; `self` pins the element alone, a pin without it anchors the
     subtree: key + the path below). */
  function pin(node, key, self) {
    node.setAttribute('data-ark-layout-pin', key);
    if (self) node.setAttribute('data-ark-layout-pin-scope', 'self');
    return node;
  }
  /* The old nav's buttons were Session, Wallet, Keys, Contacts, Network in that order; the sign-in / create pair
     was its own nav inside the session section. */
  var OLD_TAB = { session: 1, defi: 2, keys: 3, contacts: 4, mesh: 5 };
  function tabsWas(state, values) {
    var was = {};
    if (state === 'signed-out') {
      was['tabs-list'] = SESSION + '/nav:1';
      values.forEach(function (value, index) { was['tabs-trigger' + (index ? '#' + (index + 1) : '')] = SESSION + '/nav:1/button:' + (index + 1); });
    } else {
      was['tabs-list'] = CARD + '/nav:1';
      values.forEach(function (value, index) { was['tabs-trigger' + (index ? '#' + (index + 1) : '')] = CARD + '/nav:1/button:' + OLD_TAB[value]; });
    }
    return was;
  }

  /* Not signed in (ArkUI.accountOpen, js/resolvers/header.js: the panel's action reads the same rule), /account is locked:
     one card says so and offers the one way in, Connect, to /auth, where the FXN ID file is opened. No view of the
     account is built and the sign-in panel stays with /auth. When the identity opens (in another tab too), the page
     mounts again as the account itself. (Owner, 2026-10-25.) */
  var LOCK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  function lockedPage(host) {
    var auth = ArkUI.pageCatalog && ArkUI.pageCatalog.auth, authHref = auth ? ArkUI.route.href(auth.path) : '/auth';
    var page = ArkUI.page([
      { block: 'custom', id: 'account-locked', mount: function () {
        var card = el('section', 'account-locked');
        card.setAttribute('aria-labelledby', 'account-title');
        card.appendChild(el('span', 'account-locked-mark', LOCK_SVG));
        var eyebrow = el('p', 'account-locked-eyebrow'); eyebrow.textContent = 'FXN ID · Account';
        var title = el('h1', 'account-locked-title'); title.id = 'account-title'; title.textContent = 'Your account is locked.';
        var lede = el('p', 'account-locked-lede'); lede.textContent = 'Connect your FXN ID file to open your identity, your wallet and your names on this device.';
        card.appendChild(eyebrow); card.appendChild(title); card.appendChild(lede);
        card.appendChild(ArkUI.blocks.render({ block: 'actions', id: 'account-connect', props: { items: [{ label: 'Connect', href: authHref, tone: 'primary' }] } }, { from: '/account', onInvalid: 'throw' }));
        return card;
      } },
      /* The CMS's insertion point for reusable blocks (js/content/components.js), as on the open account: the same key,
         so a block placed there shows locked and open alike (and the anchor never takes the old shell's page:/div:1). */
      { insert: 'main', was: 'page:/div:1/div:1' }
    ], host, { page: 'account', className: 'account-page account-page--locked', titleId: 'account-title' });
    var unsubscribe = ArkUI.localIdentity.subscribe(function () { if (ArkUI.accountOpen()) ArkUI.pageRouter.navigate('account', { history: 'none' }); });
    page.arkDispose = function () { unsubscribe(); };
    return page;
  }

  ArkUI.pageModules.account = {
    mount: function (host) {
      if (ArkUI.accountOpen && !ArkUI.accountOpen()) return lockedPage(host);
      var session = accountSession();
      /* ---- the page's state: one place each, painted by the paint* functions below ---------- */
      var identity = ArkUI.localIdentity.current();
      var sessionState = '';
      var refs = {};                       // rendered block roots, by name
      var views = {};                      // the persistent view nodes, moved into whichever tabs exist
      var cardHost = null, tabsEl = null, tabsValues = [], railEl = null, identityWrap = null, mapWrap = null, offstage = null;
      var nftSample = null, profileCard = null, cardSeal = null, realCard = null, mintAsk = null, tradeAsk = null, tradeNote = null, salePrice = null, activateNote = null;   // the NFT card (js/ark/profile-card.js): a review sample named in the address
      var lastProps = Object.create(null); // props each live block was last painted with
      var wallet = { symbol: 'FXN', logo: null, balance: null, display: '—', message: 'Sign in to check', key: '' };
      var mesh = null;
      var page = null;
      var walletSendable = false, walletBusy = false, meshBusy = false, contactsWorking = false;
      var rail = { contacts: null, invites: null, domains: ArkUI.localDomains ? ArkUI.localDomains.list().length : 0 };
      var contactRows = { accepted: [], incoming: [], outgoing: [], found: [] };
      /* your FXN: the keys' balances, the safes, the transfers (null = not read yet. Each read's own `why` says what failed),
         and the spend being approved (null until terms are set or a spend link opens one) */
      var holdings = { keys: null, keysWhy: '', safes: null, safesWhy: '', history: null, historyWhy: '' };
      var spend = null, spendBusy = false, sendFrom = '';
      var HISTORY_SHOWN = 12;
      /* the formatters the views need before js/ark/fxn-holdings.mjs loads; replaced by the module's own once it does */
      var holdingsApi = { fxn: function (n) { return String(n); }, fxnUnit: function () { return 'base units'; }, fxnText: function (n) { return String(n) + ' base units'; }, dateOf: function (sec) { return new Date(sec * 1000).toISOString().slice(0, 10); } };

      function stateOf(next) {
        var unlocked = !!(next && session.isUnlocked());
        return next ? (unlocked ? 'verified-local' : 'remembered') : 'signed-out';
      }
      function isAuthenticated(next) { return !!(next && ArkUI.cmsSession && ArkUI.cmsSession.isAuthenticated(next.publicKeyB64)); }
      function fromPath() { var entry = ArkUI.pageCatalog && ArkUI.pageCatalog.account; return entry ? entry.path : '/account'; }
      /* Glossary terms (docs/glossary.md: Auth Kit, Ghost ID, FXN ...) are marked on first use, once for the whole page: this
         page renders its views in many calls, so they share one first-use state (the page's own spec shares it below). */
      var termState = ArkUI.blocks.termMarker();
      function make(spec) { return ArkUI.blocks.render(spec, { from: fromPath(), onInvalid: 'throw', terms: 'first-use', termState: termState, slots: { 'account-map': function () { var d = el('div', null, MAP_SVG); return d.firstChild; } } }); }
      /* A live block repainted in place (ArkUI.blocks.update: a CMS edit or pin on it survives), only when
         its props changed; the first update of a page loads Ark's 1.4 KB live chunk. */
      function paint(name, props) {
        var json = JSON.stringify(props);
        if (lastProps[name] === json || !refs[name]) return;
        lastProps[name] = json;
        /* if the live chunk could not load, ArkUI.blocks.update REPLACES the element (and says so in the console):
           find the block again by its id rather than paint a detached one */
        if (!refs[name].isConnected && refs[name].id) refs[name] = page.querySelector('#' + refs[name].id) || refs[name];
        refs[name] = ArkUI.blocks.update(refs[name], props, { from: fromPath() }) || refs[name];
      }
      function remember(name, props) { lastProps[name] = JSON.stringify(props); }

      /* ---- props: what each block shows for a state ----------------------------------------- */
      function statusText(next) {
        var unlocked = !!(next && session.isUnlocked()), authenticated = isAuthenticated(next);
        return next ? (unlocked ? (authenticated ? 'Session active · identity unlocked' : 'Identity verified') : (authenticated ? 'Session active · identity locked' : 'Identity saved · not signed in')) : 'Signed out';
      }
      function heroProps(next) {
        /* the same parts in every state (a block patched with another SHAPE would replace its children, and a pin or
           an id on one is lost): the status detail is always there, the verification detail once there is an identity */
        if (!next) return { eyebrow: 'Your identity', title: 'Sign in to DEFXN', density: 'compact',
          lede: 'Choose your FXN ID file to sign in. It stays on your device, is never uploaded, and opens your identity, wallet, domains and publishing. No file yet? Open Create identity.',
          meta: [{ label: 'Status', value: 'Signed out' }] };
        var unlocked = !!session.isUnlocked();
        return { eyebrow: 'Your identity', title: plainLine(next.displayName || 'Your account', 48), density: 'compact',
          lede: unlocked ? 'Your identity is ready across the DEFXN world.' : 'Your identity is saved here. Your FXN ID file is not kept on this device.',
          meta: [{ label: 'Status', value: plainLine(statusText(next), 64) }, { label: 'Verification', value: unlocked ? 'Identity verified.' : 'Choose your FXN ID file to continue.' }] };
      }
      function identityProps(next) {
        return { label: 'Identity details', columns: 1, items: [
          { term: 'FXN ID number', value: next && (next.core && next.core.ghostId || next.ghostId || next.identityId) || null, mono: true },
          { term: 'Wallet address', value: next && next.walletAddress || null, mono: true }
        ] };
      }
      function developerProps(next) {
        return { label: 'Developer details', columns: 1, items: [
          { term: 'Public ID key', value: next && next.publicKeyB64 ? base64ToHex(next.publicKeyB64) : null, mono: true },
          { term: 'Security level', value: next && next.securityProfile || null }
        ] };
      }
      var copied = '';
      function copyProps() {
        return { label: 'Copy', items: [
          { label: copied === 'ghost' ? 'Copied' : copied === 'ghost-blocked' ? 'Select to copy' : 'Copy identity ID', action: 'copy-ghost', tone: 'ghost' },
          { label: copied === 'wallet' ? 'Copied' : copied === 'wallet-blocked' ? 'Select to copy' : 'Copy wallet address', action: 'copy-wallet', tone: 'ghost' }
        ] };
      }
      function sessionHeadProps(next) {
        var unlocked = !!(next && session.isUnlocked()), authenticated = isAuthenticated(next);
        /* a callout, not a heading: the tab already names the view, and a second title as big as the page's
           would be the two-H1 defect this conversion removed. drift = it waits on you; success = done. */
        return { tone: next ? (unlocked || authenticated ? 'success' : 'drift') : 'info',
          title: next ? (authenticated ? 'Signed in.' : (unlocked ? 'Ready.' : 'Choose your FXN ID file again')) : 'Open your account',
          body: next ? (authenticated ? 'Publishing is available. Each signature opens a review first.' : unlocked ? 'Secure access is available for this session.' : 'Choose your FXN ID file to restore secure access.') : 'Choose your FXN ID file to open your account on this device.' };
      }
      /* Your FXN (owner, 2026-10-29): what your keys hold, and what sits in the genesis safes you sign for. Each tile
         opens the view that lists its parts. A number the chain did not answer says why, never 0. */
      function walletStats() {
        var fxn = { label: 'In your keys', format: 'plain', action: 'wallet-keys' };
        if (wallet.balance == null) fxn.absent = { kind: 'unavailable', reason: wallet.message };
        else { fxn.value = wallet.balance; fxn.unit = plainLine(holdingsApi.fxnUnit() === 'FXN' ? (wallet.symbol || 'FXN') : holdingsApi.fxnUnit(), 16); fxn.detail = wallet.message; }
        if (wallet.logo) fxn.logo = { image: wallet.logo };
        return { label: 'Your FXN', columns: 3, items: [fxn, safesTile(), { label: 'Credits', absent: { kind: 'not-built', reason: 'Credit balances are not available yet.' } }] };
      }
      function safesTile() {
        var tile = { label: 'In safes you sign for', format: 'plain', action: 'wallet-safes' }, got = holdings.safes;
        if (!got) tile.absent = { kind: 'unavailable', reason: holdings.safesWhy || 'Reading the safes\u2026' };
        else if (got.kind !== 'ok') tile.absent = { kind: 'unavailable', reason: got.why || 'The node did not answer the safes read.' };
        else if (!got.onCouncil.length) { tile.value = 'None'; tile.detail = 'None of your keys is on the ' + got.daoId + ' council.'; }
        else if (got.total == null) tile.absent = { kind: 'unavailable', reason: 'The node left the safe balances out.' };
        else {
          tile.value = holdingsApi.fxn(got.total); tile.unit = holdingsApi.fxnUnit();
          tile.detail = got.signed.length + ' safes \u00b7 ' + (got.unlockedTotal == null ? 'unlocked amount not read' : holdingsApi.fxnText(got.unlockedTotal) + ' unlocked now');
        }
        return tile;
      }
      function keyProps() { return { label: 'Your public key', columns: 1, items: [{ term: 'Public ID in use', value: wallet.key || null, mono: true }] }; }
      function meshDefaults(message) {
        return { status: 'Not verified', message: message || 'Verify this identity on the selected DEFXN network.', detail: false,
          record: '—', verification: '—', updated: '—', provenance: '—', standing: 'Not linked', standingMessage: 'A verified account link is required to show network status.' };
      }
      mesh = meshDefaults('Sign in to verify your identity on DEFXN.');
      function meshStats() {
        return { label: 'Network status', items: [
          { label: 'Identity status', value: mesh.status, detail: mesh.message },
          { label: 'Account status', value: mesh.standing, detail: mesh.standingMessage }
        ] };
      }
      function meshFacts() {
        return { label: 'Record details', columns: 2, items: [
          { term: 'Record', value: mesh.record, mono: true }, { term: 'Verification', value: mesh.verification },
          { term: 'Updated', value: mesh.updated }, { term: 'Source', value: mesh.provenance }
        ] };
      }

      function statusProps(message, tone) {
        var props = { text: plainLine(message || '', 600) };
        if (props.text && tone) props.tone = tone;
        return props;
      }
      function walletRowProps() {
        return { label: 'Wallet', items: [
          { label: 'Send FXN', action: 'wallet-send', tone: 'primary', disabled: !walletSendable },
          { label: 'History', action: 'wallet-history', tone: 'ghost', disabled: !walletSendable },
          { label: 'Copy public key', action: 'wallet-copy-key', tone: 'ghost', disabled: !walletSendable },
          { label: 'Refresh', action: 'wallet-refresh', tone: 'ghost' }] };
      }
      /* the send form: the values go to the page (the form never posts); the amount is typed in FXN with up to the coin's
         decimals (js/ark/fxn-holdings.mjs parseFxn), and a zero or unreadable amount is refused in its own field, with what is needed and how to fix it, before anything is reviewed or signed */
      function sendFormProps() {
        return { label: 'Send FXN', fields: [
          sendFromField(),
          { name: 'amount', label: 'Amount (FXN)', type: 'text', inputmode: 'decimal', required: true, placeholder: '0.5', autocomplete: 'off' },
          { name: 'recipient', label: 'Recipient key', type: 'text', required: true, autocomplete: 'off', placeholder: 'Paste the recipient\u2019s public key' }],
          submit: { label: 'Review & sign', action: 'wallet-send-submit', tone: 'primary', disabled: !walletSendable || walletBusy, busy: walletBusy, busyLabel: 'Signing\u2026' },
          actions: [{ label: '\u2190 Wallet', action: 'wallet-back', tone: 'ghost' }] };
      }
      /* ---- your FXN: keys, safes, a spend from a safe, history (js/ark/fxn-holdings.mjs) ------------------------
         Owner, 2026-10-29: the page showed one key's balance, so it read 0 while the mint paid the genesis allocation
         into fxndao's safes. These views list every key the FXN ID holds and every safe one of them signs for, and
         let a council signer approve and send a spend of an unlocked part to one of their keys. */
      function keyLabel(k) { return plainLine(k.name + (k.balance != null ? ' \u00b7 ' + holdingsApi.fxnText(k.balance) : ''), 64); }
      /* the keys that can sign a send on this sign-in: every Public ID, the wallets of the one in use, the genesis key */
      function sendFromField() {
        var rows = (holdings.keys || []).filter(function (k) { return k.signer; });
        var options = rows.length ? rows.map(function (k) { return { value: k.key, label: keyLabel(k) }; })
          : [{ value: 'current', label: 'The Public ID in use' }];
        var field = { name: 'from', label: 'From', type: 'select', options: options };
        var chosen = sendFrom && options.some(function (o) { return o.value === sendFrom; }) ? sendFrom : (rows.filter(function (k) { return k.current; })[0] || {}).key;
        if (chosen) field.value = chosen;
        return field;
      }
      function short(key) { return key ? String(key).slice(0, 8) + '\u2026' + String(key).slice(-6) : ''; }
      function keysViewProps() {
        var got = holdings.keys, council = holdings.safes && holdings.safes.kind === 'ok' ? holdings.safes.onCouncil : [];
        return { label: 'Your keys', empty: { reason: holdings.keysWhy || 'Reading your keys\u2026', remedy: 'Choose your FXN ID file if this stays empty.' },
          items: (got || []).map(function (k) {
            var item = { id: k.key, title: plainLine(k.name, 96), meta: short(k.key) + ' \u00b7 ' + (k.balance != null ? holdingsApi.fxnText(k.balance) : 'No reading: ' + plainLine(k.why || 'no answer', 48)),
              actions: [{ label: 'Copy key', action: 'fxn-copy-key', tone: 'ghost' }] };
            if (k.current) item.status = { label: 'In use', tone: 'trust' };
            else if (council.indexOf(k.key) >= 0) item.status = { label: 'Council signer', tone: 'reference' };
            else if (k.kind === 'wallet' && !k.published) item.status = { label: 'Private', tone: 'hidden' };
            if (k.signer && k.balance != null && k.balance > 0n) item.actions.unshift({ label: 'Send from', action: 'fxn-send-from', tone: 'secondary' });
            return item;
          }) };
      }
      var PATH_STATUS = { council: { label: 'Council spends', tone: 'trust' }, sale: { label: 'Sale only', tone: 'reference' }, vote: { label: 'Holder vote', tone: 'drift' }, budget: { label: 'Budgets only', tone: 'drift' }, unknown: { label: 'Unknown kind', tone: 'warning' } };
      function safesViewProps() {
        var got = holdings.safes;
        if (!got || got.kind !== 'ok') return { label: 'Safes you sign for', items: [], empty: { reason: got ? (got.why || 'The node did not answer the safes read.') : 'Reading the safes\u2026', remedy: 'Press Refresh, or pick another network below.' } };
        if (!got.onCouncil.length) return { label: 'Safes you sign for', items: [], empty: { reason: 'None of your keys is on the ' + got.daoId + ' council, so you sign for no safe.', remedy: 'Sign in with the FXN ID whose genesis key is on the council.' } };
        return { label: 'Safes you sign for', empty: { reason: 'The plan names no safe.' }, items: got.signed.map(function (sf) {
          var f = holdingsApi.fxn;
          var item = { id: sf.label, title: plainLine(sf.label + ' safe \u00b7 ' + (sf.balance != null ? holdingsApi.fxnText(sf.balance) : 'balance not read'), 96),
            meta: plainLine((sf.unlocked != null ? f(sf.unlocked) + ' unlocked' : 'unlocked not read') + ' \u00b7 ' + (sf.stillLocked != null ? f(sf.stillLocked) + ' locked' : 'locked not read') + (sf.next ? ' \u00b7 next ' + holdingsApi.dateOf(sf.next) : ''), 96),
            detail: [sf.schedule ? sf.schedule + '.' : 'No schedule in the plan.', sf.how, sf.created ? '' : 'Its create record is not on the chain yet.'].filter(Boolean).join(' '),
            status: PATH_STATUS[sf.path] || PATH_STATUS.unknown };
          if (sf.path === 'council' && sf.created) item.actions = [{ label: 'Spend', action: 'safe-spend', tone: 'secondary', disabled: !(sf.unlocked > 0) }];
          return item;
        }) };
      }
      function heldFactsProps() {
        var got = holdings.safes, items = [];
        if (got && got.kind === 'ok') got.held.forEach(function (h) { items.push({ term: plainLine(h.label.charAt(0).toUpperCase() + h.label.slice(1), 48), value: (h.balance != null ? holdingsApi.fxnText(h.balance) + '. ' : 'Not read. ') + h.how }); });
        if (!items.length) items.push({ term: 'Held by rule', value: null });
        return { label: 'Held by rule, no signer', columns: 2, items: items };
      }
      /* a spend: terms first (amount and the key it goes to), then the approvals; one primary at a time, the step that
         waits on you */
      function spendSafe() { var got = holdings.safes; return got && got.kind === 'ok' && spend ? got.safes.filter(function (sf) { return sf.label === spend.label; })[0] : null; }
      function spendTermsFormProps() {
        var sf = spendSafe(), keys = (holdings.keys || []);
        var options = keys.map(function (k) { return { value: k.key, label: keyLabel(k) }; });
        if (!options.length) options = [{ value: 'none', label: 'Your keys are not read yet', disabled: true }];
        var fields = [{ name: 'amount', label: 'Amount (FXN)', type: 'text', inputmode: 'decimal', required: true, autocomplete: 'off', placeholder: '0.5',
          hint: sf && sf.unlocked != null ? holdingsApi.fxnText(sf.unlocked) + ' unlocked now.' : 'The unlocked amount was not read.' }];
        var to = { name: 'to', label: 'To your key', type: 'select', options: options };
        var current = keys.filter(function (k) { return k.current; })[0];
        if (current) to.value = current.key;
        fields.push(to);
        return { label: 'Spend terms', fields: fields, submit: { label: 'Approve as me', action: 'spend-terms', tone: 'primary', busy: spendBusy, busyLabel: 'Signing\u2026', disabled: spendBusy },
          actions: [{ label: '\u2190 Safes', action: 'wallet-safes', tone: 'ghost' }] };
      }
      function spendApprovedBy() { return spend && spend.checked ? spend.checked.good : new Map(); }
      function spendTermsFacts() {
        var sf = spendSafe(), to = spend && (holdings.keys || []).filter(function (k) { return k.key === spend.to; })[0];
        return { label: 'Spend terms', columns: 2, items: [
          { term: 'From safe', value: sf ? sf.label : (spend && spend.label) || null },
          { term: 'Amount', value: spend && spend.amount ? holdingsApi.fxnText(spend.amount) : null },
          { term: 'To', value: spend ? (to ? to.name + ', ' + short(spend.to) : spend.to) : null, mono: !to },
          { term: 'Approvals', value: spend && sf ? spendApprovedBy().size + ' of ' + sf.threshold : null }] };
      }
      function spendCouncilProps() {
        var got = holdings.safes, approved = spendApprovedBy();
        var signers = got && got.kind === 'ok' ? got.plan.head.signers : [];
        return { label: 'Council approvals', empty: { reason: 'The council was not read.', remedy: 'Press Refresh.' }, items: signers.map(function (key, i) {
          var mine = got.onCouncil.indexOf(key) >= 0;
          return { id: key, title: 'Signer ' + (i + 1) + (mine ? ' (you)' : ''), meta: short(key), status: approved.has(key) ? { label: 'Approved', tone: 'trust' } : { label: 'Waiting', tone: 'drift' } };
        }) };
      }
      function spendHeadProps() {
        var sf = spendSafe();
        if (!spend || !spend.atMs) return { tone: 'info', title: 'Spend from the ' + ((spend && spend.label) || '') + ' safe', body: 'Set the amount and the key it goes to, then approve. The spend needs ' + (sf ? sf.threshold + ' of ' + sf.signers.length : 'the council\u2019s') + ' council approvals before it can be sent.' };
        var st = spendStage();
        if (st.ready) return { tone: 'success', title: 'Ready to send', body: 'The spend has enough council approvals. Review it, then send it to the network.' };
        if (st.mineDone) return { tone: 'drift', title: 'Waiting for the council', body: 'Copy the spend link and send it to the other council signers. Paste the lines they send back.' };
        return { tone: 'drift', title: 'Your approval is missing', body: 'Check the terms, then approve them as a council signer.' };
      }
      function spendStage() {
        var sf = spendSafe(), have = spendApprovedBy();
        var mineDone = holdings.safes && holdings.safes.kind === 'ok' && holdings.safes.onCouncil.some(function (k) { return have.has(k); });
        return { ready: !!(sf && have.size >= sf.threshold), mineDone: mineDone };
      }
      function spendLinesProps() {
        var st = spendStage();
        return { label: 'Approval lines', fields: [{ name: 'lines', label: 'Approval lines from the council', type: 'textarea', rows: 3, autocomplete: 'off', placeholder: '<signer key> <signature>',
          hint: 'One line per signer. Paste the lines the other signers send you.' }],
          submit: { label: 'Check approvals', action: 'spend-check', tone: 'secondary' },
          actions: [{ label: 'Approve as me', action: 'spend-approve', tone: st.mineDone ? 'ghost' : 'primary', disabled: spendBusy || st.mineDone },
            { label: 'Copy spend link', action: 'spend-link', tone: st.mineDone && !st.ready ? 'primary' : 'ghost' }] };
      }
      function spendGoProps() {
        var st = spendStage();
        return { label: 'Send the spend', items: [{ label: 'Review and send', action: 'spend-submit', tone: st.ready ? 'primary' : 'secondary', disabled: !st.ready || spendBusy, busy: spendBusy, busyLabel: 'Sending\u2026' },
          { label: 'New terms', action: 'spend-reset', tone: 'ghost' }, { label: '\u2190 Safes', action: 'wallet-safes', tone: 'ghost' }] };
      }
      function historyProps() {
        var got = holdings.history, names = new Map((holdings.keys || []).map(function (k) { return [k.key, k.name]; }));
        /* the other side named where the page knows it: the genesis mint's holder and the safes */
        if (holdings.safes && holdings.safes.kind === 'ok') {
          names.set(holdings.safes.plan.head.treasury, 'the genesis mint');
          holdings.safes.safes.forEach(function (sf) { names.set(sf.address, 'the ' + sf.label + ' safe'); });
        }
        if (!got) return { label: 'Transfers', items: [], empty: { reason: holdings.historyWhy || 'Reading your transfers\u2026' } };
        return { label: 'Transfers', empty: { reason: 'None of your keys has sent or received FXN on this network.', remedy: 'Share a key from Your keys to receive FXN.' },
          items: got.rows.slice(0, HISTORY_SHOWN).map(function (row, i) {
            var words = holdingsApi.describeTransfer(row, names);
            return { id: 'h' + i, title: plainLine(words.title, 96), meta: plainLine(words.meta, 96), status: row.kind === 'sent' ? { label: 'Sent', tone: 'reference' } : { label: row.kind === 'received' ? 'Received' : plainLine(row.kind, 24), tone: 'trust' } };
          }) };
      }
      function meshActionProps() {
        return { label: 'Network check', items: [{ label: 'Verify identity', action: 'mesh-verify', tone: 'primary', disabled: !identity || meshBusy, busy: meshBusy, busyLabel: 'Verifying\u2026' }] };
      }
      /* The glance rail: each tile opens the view that owns its number (Ark's interactive stat). A number that needs the
         unlocked key reads "No reading" with why, never a dash and never 0. */
      function railProps() {
        var unlocked = !!(identity && session.isUnlocked());
        var locked = { kind: 'unavailable', reason: 'Choose your FXN ID file to read this.' };
        function count(label, value, action, extra) {
          var tile = { label: label, action: action };
          if (value == null) tile.absent = locked; else tile.value = String(value);
          return Object.assign(tile, extra || {});
        }
        var standing = mesh.standing, status = mesh.status;
        var fxn = { label: plainLine(holdingsApi.fxnUnit() === 'FXN' ? (wallet.symbol || 'FXN') : 'Base units', 48) + ' in your keys', action: 'rail-defi', format: 'plain' };
        if (wallet.balance == null) fxn.absent = { kind: 'unavailable', reason: wallet.message }; else fxn.value = wallet.balance;
        return { label: 'Your account at a glance', columns: 4, items: [
          fxn,
          { label: 'Credits', action: 'rail-defi', absent: { kind: 'not-built', reason: 'Credit balances are not available yet.' } },
          count('Contacts', unlocked ? rail.contacts : null, 'rail-contacts'),
          count('Invites', unlocked ? rail.invites : null, 'rail-contacts', unlocked && rail.invites > 0 ? { status: { label: 'Waiting', tone: 'drift' } } : null),
          { label: 'Domains', value: String(rail.domains), href: 'route:account/domains' },
          { label: 'Status', value: standing !== 'Not linked' ? standing : (status === 'Identity verified' ? 'Not linked' : status), action: 'rail-mesh' }] };
      }
      function localEditing() { return !!(ArkUI.cmsSession && ArkUI.cmsSession.isLocalDevelopment && ArkUI.cmsSession.isLocalDevelopment()); }
      /* "Open publishing" opens a window that ATTACHES to this tab (js/ark/cms-session.js and js/admin/gate.js read
         window.opener to receive the signed-in session). Ark's actions put rel="noopener" on every target=_blank link and
         offer no way to omit it, so this link has no target: publishClick() opens it with window.open(..., '_blank'), which
         keeps the opener. (Ark would need a link that may keep its opener.) */
      function waysProps() {
        var items = [{ label: 'Deploy a bundle', href: 'route:bundledeployer' }, { label: 'Your domains', href: 'route:account/domains' }];
        if (localEditing()) items.push({ label: 'Open publishing', href: '/admin' });
        return { label: 'Where next', items: items };
      }
      function cmsStatusProps() {
        var authenticated = isAuthenticated(identity), local = localEditing();
        var words = [local ? 'Publishing tools available' : '', ArkUI.cmsSession && (local || authenticated) ? ArkUI.cmsSession.status() : ''].filter(Boolean).join(' \u00b7 ');
        return statusProps(words);
      }
      /* a list refuses two rows with one key (and would be replaced by its refusal): the vault may name an address twice
         (a rotated-from wallet), a person's list shows it once */
      function once(items) { var seen = Object.create(null); return items.filter(function (item) { if (seen[item.id]) return false; seen[item.id] = true; return true; }); }
      /* Public IDs (owner, 2026-10-25): the IDs sites and the chain see, each with its own wallets. The current ID's
         wallets follow it, each Private (its link only in the file) or Published (its KWALLET1 on chain pva). A
         private wallet offers Publish link. Wallets an older file linked to the Master ID come last, named as such. */
      function keysListProps() {
        var who = signer();
        if (who && who.publicIds) {
          var current = who.publicId, items = [];
          who.publicIds.forEach(function (id) {
            var item = { id: id.key, title: id.name + (id.label ? ' \u00b7 ' + id.label : ''), meta: id.wallets.length + (id.wallets.length === 1 ? ' wallet' : ' wallets') };
            if (current && id.key === current.key) item.status = { label: 'In use', tone: 'trust' };
            else item.actions = [{ label: 'Use', action: 'keys-use-id', tone: 'secondary' }];
            items.push(item);
            if (current && id.key === current.key) id.wallets.forEach(function (w) {
              var row = { id: w.key, title: w.key, meta: 'Wallet of ' + id.name };
              if (w.published != null) row.status = { label: 'Published', tone: 'live' };
              else { row.status = { label: 'Private', tone: 'hidden' }; row.actions = [{ label: 'Publish link', action: 'keys-publish', tone: 'secondary' }]; }
              items.push(row);
            });
          });
          ((who.walletAddresses) || []).forEach(function (address) { items.push({ id: address, title: address, meta: 'Older wallet, made by your Master ID inside the file' }); });
          return { label: 'Public IDs', empty: { reason: 'This FXN ID has no Public ID yet.', remedy: 'Press Add Public ID below, then save the new file.' }, items: once(items) };
        }
        var addresses = (who && who.walletAddresses) || [];
        var delegations = (who && who.walletDelegations) || {};
        return { label: 'Signing wallets', empty: { reason: 'No signing wallets yet.', remedy: 'Add one below. Each one can then be rotated, revoked or delegated on its own.' },
          items: once(addresses.map(function (address) {
            var delegation = delegations[address], item = { id: address, title: address };
            if (delegation) item.meta = delegation.revoked ? 'delegation revoked' : 'delegated to identity';
            if (address === who.walletAddress) item.status = { label: 'Default', tone: 'trust' };
            return item;
          })) };
      }
      var LIST_LABEL = { incoming: 'Invites to you', accepted: 'Contacts', outgoing: 'Sent invites', found: 'Search results' };
      var LIST_EMPTY = { incoming: 'None pending.', accepted: 'No accepted contacts yet.', outgoing: 'None pending.', found: 'No identity matches.' };
      var TAG_TONE = { connected: 'trust', incoming: 'drift', sent: 'reference' };
      function contactItem(record, kind) {
        var id = record.id, tag = record.status || kind, actions = [];
        if (kind === 'incoming') actions.push({ label: 'Accept', action: 'contact-accept', tone: 'secondary' }, { label: 'Decline', action: 'contact-decline', tone: 'ghost' });
        if (kind === 'outgoing') actions.push({ label: 'Withdraw', action: 'contact-withdraw', tone: 'ghost' });
        if (kind === 'found') actions.push({ label: record.direct ? 'Invite directly' : 'Invite', action: 'contact-invite', tone: 'secondary' });
        actions.push({ label: 'Details', action: 'contact-open', tone: 'ghost' });
        var item = { id: id, title: plainLine(record.title || contactName(id), 96), meta: plainLine(record.meta || id, 96), actions: actions };
        if (kind !== 'found') item.status = { label: tag, tone: TAG_TONE[tag] || 'reference' };
        return item;
      }
      function contactListProps(kind) {
        return { label: LIST_LABEL[kind], items: once(contactRows[kind].map(function (record) { return contactItem(record, kind); })), empty: { reason: LIST_EMPTY[kind] } };
      }
      function searchFormProps() {
        return { label: 'Search identities', fields: [{ name: 'query', label: 'Find an identity', type: 'search', required: true, autocomplete: 'off', placeholder: 'Name or identity ID' }],
          submit: { label: 'Search', action: 'contacts-search', tone: 'secondary' } };
      }
      function contactFactsProps(record, id) {
        return { label: 'Contact details', columns: 2, items: [
          { term: 'Identity ID', value: record.identityId || id, mono: true },
          { term: 'Public ID', value: record.publicId || record.username || 'Not published', mono: true },
          { term: 'Visibility', value: record.visibility || 'Not reported' },
          { term: 'Updated', value: record.updatedAt ? new Date(record.updatedAt).toLocaleString() : 'Not reported' }] };
      }
      function keysAddProps() {
        return { label: 'Add a wallet to the Public ID in use', fields: [{ name: 'label', label: 'Label', type: 'text', value: '', autocomplete: 'off' }], submit: { label: 'Add wallet', action: 'keys-add', tone: 'primary' },
          actions: [{ label: 'Add Public ID', action: 'keys-add-id', tone: 'secondary' }, { label: 'Save the new file', action: 'keys-save', tone: 'ghost' }] };
      }
      function keysActionProps() {
        return { label: 'Rotate, revoke or delegate', fields: [
          { name: 'address', label: 'Wallet address', type: 'text', required: true, autocomplete: 'off', placeholder: 'Paste a wallet address from the list above' },
          { name: 'rotateLabel', label: 'New label (rotate only)', type: 'text', value: 'Rotated', autocomplete: 'off' }],
          submit: { label: 'Rotate', action: 'keys-rotate', tone: 'secondary' },
          actions: [{ label: 'Revoke', action: 'keys-revoke', tone: 'ghost' }, { label: 'Delegate to identity', action: 'keys-delegate', tone: 'ghost' }, { label: 'Revoke delegation', action: 'keys-revoke-delegation', tone: 'ghost' }] };
      }

      /* ---- the parts Ark has no block for: small hand-built views -------------------------- */
      function buildSession() {
        var node = pin(el('div', 'account-session'), SESSION, true);
        node.setAttribute('data-account-panel', 'session');
        refs.sessionHead = make({ block: 'callout', id: 'account-session-head', props: sessionHeadProps(identity), was: WAS['account-session-head'] });
        remember('sessionHead', sessionHeadProps(identity));
        node.appendChild(refs.sessionHead);
        var auth = pin(el('div'), SESSION + '/div:1/div:1'); auth.setAttribute('data-account-auth', '');
        auth.appendChild(session.container);
        node.appendChild(auth);
        var forget = el('div', 'account-forget');
        forget.appendChild(make({ block: 'actions', id: 'account-forget', props: { items: [{ label: 'Forget saved identity details', action: 'forget', tone: 'ghost' }] }, was: WAS['account-forget'] }));
        forget.querySelector('button').setAttribute('data-account-forget', '');
        node.appendChild(forget);
        views.forget = forget;
        var storage = pin(el('div'), SESSION + '/div:1/p:2', true); storage.setAttribute('data-account-notices', '');
        node.appendChild(storage);
        node.appendChild(make({ block: 'disclosure', id: 'account-explain', was: WAS['account-explain'], props: { more: 'What is an FXN ID file?', less: 'Hide this',
          content: 'An FXN ID file (.auth.fxn) holds the keys that sign for you. It stays on this device and is never uploaded.\n\nInside it, your Master ID stays private. Your Public IDs are what others see.' } }));
        var ways = pin(el('div', 'account-cms'), SESSION + '/div:1/div:2', true);
        refs.ways = make({ block: 'actions', id: 'account-ways', props: waysProps(), was: localEditing() ? Object.assign({ 'button#3': SESSION + '/div:1/div:2/a:3' }, WAS['account-ways']) : WAS['account-ways'] }); remember('ways', waysProps());
        ways.appendChild(refs.ways);
        refs.cmsStatus = make({ block: 'status-line', id: 'account-cms-status', props: cmsStatusProps(), was: WAS['account-cms-status'] }); remember('cmsStatus', cmsStatusProps());
        ways.appendChild(refs.cmsStatus);
        /* opening publishing while the Auth Kit is locked sends the person to unlock it first */
        ways.addEventListener('click', function (event) { var link = event.target.closest && event.target.closest('a[href="/admin"]'); if (link) publishClick(event, link); });
        node.appendChild(ways);
        return node;
      }
      function buildCreate() {
        var node = pin(el('div', 'account-create'), SESSION + '/div:2', true);
        node.setAttribute('data-account-create-view', '');
        node.appendChild(make({ block: 'callout', id: 'account-create-head', props: { tone: 'info', title: 'Create your FXN ID.', body: 'You get a key file and recovery words. The file stays on this device. The words bring your identity back if you lose the file.' }, was: WAS['account-create-head'] }));
        var holder = pin(el('div'), SESSION + '/div:2/div:1'); holder.setAttribute('data-account-create', '');
        node.appendChild(holder);
        return node;
      }
      function buildWallet() {
        var node = pin(el('section', 'account-live'), WALLET);
        node.setAttribute('data-account-panel', 'defi'); node.setAttribute('aria-labelledby', 'account-live-title');
        node.appendChild(el('h2', 'account-visually-hidden', 'Wallet')).id = 'account-live-title';
        /* Wallet: FXN on dense-wire only (js/ark/dense-wire-wallet.mjs).
           Rebuilt 2026-10-16: FXN is now a sovereign chain's own native-
           token balance ("treat FXN like any other chain's native
           token"), so a send is ONE sender-signed NativeTransfer -- no
           more two-holder transfer slip (that whole protocol belonged to
           a custody chain deleted from dense-wire the same week this
           broke). Credits have no dense-wire ledger: shown as not built,
           never as 0. */
        var home = el('div', 'account-wallet'); home.setAttribute('data-account-wallet-view', 'home');
        refs.balances = make({ block: 'stats', id: 'account-balances', props: walletStats(), was: WAS['account-balances'] }); remember('balances', walletStats());
        refs.pubkey = make({ block: 'facts', id: 'account-pubkey', props: keyProps(), was: WAS['account-pubkey'] }); remember('pubkey', keyProps());
        home.appendChild(refs.balances); home.appendChild(refs.pubkey);
        home.appendChild(pin(el('p', 'account-hint', 'Share this public key to receive FXN. You never need to share your FXN ID file or PIN.'), WALLET + '/div:1/div:2/p:2', true));
        refs.walletRow = make({ block: 'actions', id: 'account-wallet-row', props: walletRowProps(), was: WAS['account-wallet-row'] }); remember('walletRow', walletRowProps());
        home.appendChild(refs.walletRow);
        node.appendChild(home);
        var send = pin(el('div', 'account-wallet-form'), WALLET + '/form:1', true); send.setAttribute('data-account-wallet-view', 'send'); send.hidden = true;
        send.appendChild(make({ block: 'callout', id: 'account-send-intro', props: { tone: 'info', title: 'Send FXN', body: 'Review the recipient and amount before signing on this device.' }, was: WAS['account-send-intro'] }));
        refs.sendForm = make({ block: 'form', id: 'account-send-form', props: sendFormProps(), was: WAS['account-send-form'] }); remember('sendForm', sendFormProps());
        send.appendChild(refs.sendForm);
        node.appendChild(send);
        /* depth, not length: each part of your FXN is its own view in the card, opened from its tile or button, with
           the way back to the wallet at its foot */
        var back = { label: '\u2190 Wallet', action: 'wallet-back', tone: 'ghost' };
        var keysView = el('div', 'account-wallet-form'); keysView.setAttribute('data-account-wallet-view', 'keys'); keysView.hidden = true;
        keysView.appendChild(el('p', 'account-hint', 'Every key in your FXN ID file and what it holds on the selected network.'));
        refs.fxnKeys = make({ block: 'list', id: 'account-fxn-keys', props: keysViewProps() }); remember('fxnKeys', keysViewProps());
        keysView.appendChild(refs.fxnKeys);
        keysView.appendChild(make({ block: 'actions', id: 'account-fxn-keys-back', props: { items: [back] } }));
        node.appendChild(keysView);
        var safesView = el('div', 'account-wallet-form'); safesView.setAttribute('data-account-wallet-view', 'safes'); safesView.hidden = true;
        refs.safesHint = safesView.appendChild(el('p', 'account-hint', 'The genesis mint paid the allocation into these safes. FXN reaches your keys only when the council approves a spend of an unlocked part.'));
        refs.safes = make({ block: 'list', id: 'account-safes', props: safesViewProps() }); remember('safes', safesViewProps());
        safesView.appendChild(refs.safes);
        refs.held = make({ block: 'facts', id: 'account-safes-held', props: heldFactsProps() }); remember('held', heldFactsProps());
        safesView.appendChild(refs.held);
        safesView.appendChild(make({ block: 'actions', id: 'account-safes-back', props: { items: [back] } }));
        node.appendChild(safesView);
        var spendView = el('div', 'account-wallet-form'); spendView.setAttribute('data-account-wallet-view', 'spend'); spendView.hidden = true;
        refs.spendHead = make({ block: 'callout', id: 'account-spend-head', props: spendHeadProps() }); remember('spendHead', spendHeadProps());
        spendView.appendChild(refs.spendHead);
        views.spendTerms = el('div', 'account-wallet-form');
        refs.spendTermsForm = make({ block: 'form', id: 'account-spend-terms', props: spendTermsFormProps() }); remember('spendTermsForm', spendTermsFormProps());
        views.spendTerms.appendChild(refs.spendTermsForm);
        spendView.appendChild(views.spendTerms);
        views.spendBoard = el('div', 'account-wallet-form'); views.spendBoard.hidden = true;
        refs.spendFacts = make({ block: 'facts', id: 'account-spend-facts', props: spendTermsFacts() }); remember('spendFacts', spendTermsFacts());
        refs.spendCouncil = make({ block: 'list', id: 'account-spend-council', props: spendCouncilProps() }); remember('spendCouncil', spendCouncilProps());
        refs.spendLines = make({ block: 'form', id: 'account-spend-lines', props: spendLinesProps() }); remember('spendLines', spendLinesProps());
        refs.spendGo = make({ block: 'actions', id: 'account-spend-go', props: spendGoProps() }); remember('spendGo', spendGoProps());
        [refs.spendFacts, refs.spendCouncil, refs.spendLines, refs.spendGo].forEach(function (b) { views.spendBoard.appendChild(b); });
        spendView.appendChild(views.spendBoard);
        refs.spendStatus = make({ block: 'status-line', id: 'account-spend-status', props: statusProps('') }); remember('spendStatus', statusProps(''));
        spendView.appendChild(refs.spendStatus);
        node.appendChild(spendView);
        var historyView = el('div', 'account-wallet-form'); historyView.setAttribute('data-account-wallet-view', 'history'); historyView.hidden = true;
        historyView.appendChild(el('p', 'account-hint', 'FXN sent and received by every key in your FXN ID file, newest first.'));
        refs.history = make({ block: 'list', id: 'account-history', props: historyProps() }); remember('history', historyProps());
        historyView.appendChild(refs.history);
        historyView.appendChild(make({ block: 'actions', id: 'account-history-back', props: { items: [back] } }));
        node.appendChild(historyView);
        refs.sendStatus = make({ block: 'status-line', id: 'account-send-status', props: statusProps(''), was: WAS['account-send-status'] }); remember('sendStatus', statusProps(''));
        node.appendChild(refs.sendStatus);
        node.appendChild(pin(el('div', 'account-wallet-network', '<span class="account-wallet-network-label">Network</span><div class="network-options" data-account-fxn-network></div>'), WALLET + '/div:2'));
        node.appendChild(pin(el('p', 'account-hint', 'Balances update directly from the selected network.'), WALLET + '/p:2', true));
        return node;
      }
      function buildContacts() {
        var node = pin(el('section', 'account-contacts'), CONTACTS);
        var list = el('div'); list.setAttribute('data-contacts-view', 'list');
        list.appendChild(el('h2', 'account-visually-hidden', 'Contacts')).id = 'account-contacts-title';
        refs.contactSearch = make({ block: 'form', id: 'account-contacts-search', props: searchFormProps(), was: WAS['account-contacts-search'] }); remember('contactSearch', searchFormProps());
        list.appendChild(refs.contactSearch);
        refs.contactsStatus = make({ block: 'status-line', id: 'account-contacts-status', props: statusProps(''), was: WAS['account-contacts-status'] }); remember('contactsStatus', statusProps(''));
        list.appendChild(refs.contactsStatus);
        views.found = el('div', 'account-contacts-found'); views.found.hidden = true;
        refs.found = make({ block: 'list', id: 'account-contacts-found', props: contactListProps('found'), was: WAS['account-contacts-found'] }); remember('found', contactListProps('found'));
        views.found.appendChild(refs.found);
        list.appendChild(views.found);
        var groups = pin(el('div', 'account-contacts-lists'), CONTACTS + '/div:1/div:1');
        [['incoming', 'Invites to you'], ['accepted', 'Contacts'], ['outgoing', 'Sent']].forEach(function (pair, index) {
          var group = pin(el('div', pair[0] === 'accepted' ? 'account-contacts-connected' : null, '<h3>' + pair[1] + ' <b data-contacts-' + pair[0] + '-count>0</b></h3>'), CONTACTS + '/div:1/div:1/div:' + (index + 1));
          refs[pair[0]] = make({ block: 'list', id: 'account-contacts-' + pair[0], props: contactListProps(pair[0]), was: WAS['account-contacts-' + pair[0]] }); remember(pair[0], contactListProps(pair[0]));
          group.appendChild(refs[pair[0]]);
          groups.appendChild(group);
        });
        list.appendChild(groups);
        refs.contactsRefresh = make({ block: 'actions', id: 'account-contacts-refresh', props: { items: [{ label: 'Refresh', action: 'contacts-refresh', tone: 'ghost' }] }, was: WAS['account-contacts-refresh'] });
        list.appendChild(refs.contactsRefresh);
        node.appendChild(list);
        var detail = el('article', 'account-contact-detail', '<header><div class="account-contact-avatar" data-contact-avatar aria-hidden="true">ID</div><div><h2 data-contact-name>Identity</h2><span data-contact-state>Connection</span></div></header>');
        detail.setAttribute('data-contacts-view', 'detail'); detail.hidden = true;
        detail.insertBefore(make({ block: 'actions', id: 'account-contact-back', props: { items: [{ label: '\u2190 All contacts', action: 'contact-back', tone: 'ghost' }] }, was: WAS['account-contact-back'] }), detail.firstChild);
        refs.contactFacts = make({ block: 'facts', id: 'account-contact-facts', props: contactFactsProps({}, ''), was: WAS['account-contact-facts'] }); remember('contactFacts', contactFactsProps({}, ''));
        detail.appendChild(refs.contactFacts);
        detail.appendChild(el('p', null, 'No public profile details are available for this identity.')).setAttribute('data-contact-bio', '');
        detail.appendChild(make({ block: 'actions', id: 'account-contact-explore', props: { items: [{ label: 'View network details', href: 'route:explorer', tone: 'link' }] }, was: WAS['account-contact-explore'] }));
        node.appendChild(detail);
        node.setAttribute('data-account-panel', 'contacts'); node.setAttribute('aria-labelledby', 'account-contacts-title');
        return node;
      }
      function buildMesh() {
        var node = pin(el('section', 'account-mesh'), MESH, true); node.setAttribute('data-account-panel', 'mesh'); node.setAttribute('aria-label', 'Network status');
        refs.meshStats = make({ block: 'stats', id: 'account-mesh-stats', props: meshStats(), was: WAS['account-mesh-stats'] }); remember('meshStats', meshStats());
        node.appendChild(refs.meshStats);
        refs.meshActions = make({ block: 'actions', id: 'account-mesh-actions', props: meshActionProps(), was: WAS['account-mesh-actions'] }); remember('meshActions', meshActionProps());
        node.appendChild(refs.meshActions);
        views.meshDetail = el('div', 'account-mesh-detail'); views.meshDetail.hidden = true; views.meshDetail.setAttribute('data-account-mesh-detail', '');
        refs.meshFacts = make({ block: 'facts', id: 'account-mesh-facts', props: meshFacts(), was: WAS['account-mesh-facts'] }); remember('meshFacts', meshFacts());
        views.meshDetail.appendChild(refs.meshFacts);
        node.appendChild(views.meshDetail);
        return node;
      }
      function buildKeys() {
        var keys = pin(el('section', 'account-keys'), KEYS);
        keys.appendChild(el('p', 'account-hint', 'Sites and the chain see one Public ID at a time. A new wallet is private: only this file shows which Public ID it belongs to.'));
        refs.keysList = make({ block: 'list', id: 'account-keys-list', props: keysListProps(), was: WAS['account-keys-list'] }); remember('keysList', keysListProps());
        keys.appendChild(refs.keysList);
        /* Ark's field has no password kind, so the PIN and the password are the one hand-built pair on the page; both
           actions below read them, and nothing else is typed here that must stay secret */
        var secret = el('div', 'account-secret', '<label>PIN<input data-account-keys-pin type="password" autocomplete="off"></label><label>Password (if set)<input data-account-keys-password type="password" autocomplete="off"></label>');
        pin(secret.children[0], KEYS + '/form:1/label:2', true); pin(secret.children[1], KEYS + '/form:1/label:3', true);
        keys.appendChild(secret);
        keys.appendChild(pin(el('h3', null, 'Add a signing wallet'), KEYS + '/form:1/h3:1', true));
        refs.keysAdd = make({ block: 'form', id: 'account-keys-add', props: keysAddProps(), was: WAS['account-keys-add'] });
        keys.appendChild(refs.keysAdd);
        refs.keysAddResult = make({ block: 'status-line', id: 'account-keys-add-result', props: statusProps(''), was: WAS['account-keys-add-result'] }); remember('keysAddResult', statusProps(''));
        keys.appendChild(refs.keysAddResult);
        keys.appendChild(pin(el('h3', null, 'Rotate, revoke or delegate'), KEYS + '/form:2/h3:1', true));
        refs.keysAction = make({ block: 'form', id: 'account-keys-action', props: keysActionProps(), was: WAS['account-keys-action'] });
        keys.appendChild(refs.keysAction);
        refs.keysActionResult = make({ block: 'status-line', id: 'account-keys-action-result', props: statusProps(''), was: WAS['account-keys-action-result'] }); remember('keysActionResult', statusProps(''));
        keys.appendChild(refs.keysActionResult);
        keys.setAttribute('data-account-panel', 'keys'); keys.setAttribute('aria-label', 'Signing wallets');
        return keys;
      }
      /* The NFT card: the card drawn by the NFT session's renderer, a line that says it is a sample, and the card's seal
         (js/nft/wear.js through DefxnSkinSite.sealIn): Wear it keeps the card on this device after a confirm, Stop trying
         and Take off end it (js/ark/profile-card.js, js/ark/skin-site.js). It takes the map's place, at the map's height,
         so the page still fits 1280x720. */
      /* card: a sample's number, or the signed-in identity's real card record (DefxnSkinSite.chainCard: its PVA,
         verified in this browser) */
      function buildNft(card) {
        var node = el('section', 'account-nft'), art = el('div', 'account-nft-art'), side = el('div', 'account-nft-side'), real = typeof card === 'object';
        node.setAttribute('aria-label', 'Your card');
        profileCard = DefxnProfileCard.open(art, card);
        side.appendChild(el('p', 'account-nft-kicker')).textContent = real ? 'Your PVA ' + card.genesisId : 'Sample card ' + card;
        refs.nftNote = side.appendChild(el('p', 'account-nft-note'));
        refs.nftNote.textContent = real ? 'Your browser checked this card on the chain. It is bound to your FXN ID.' : 'No card is linked to an FXN ID yet.';
        if (real) {
          realCard = card;
          /* a skin the shop sent here to mint (?mint-skin=DFXNSKIN1-...): read by the skin grammar, minted only after the
             full signing review. Without one, the card's own action is Try it on. */
          mintAsk = null;
          try { var asked = new URLSearchParams(location.search).get('mint-skin'); if (asked) mintAsk = DefxnCardRecord.skin.decode(asked); }
          catch (error) { refs.nftNote.textContent = 'The skin in this address does not read (' + error.message + '). Build it in the shop again.'; }
          var items = [{ label: 'Try it on', action: 'nft-try', tone: mintAsk ? 'ghost' : 'primary' }];
          if (mintAsk) { items.unshift({ label: 'Mint this skin', action: 'nft-mint', tone: 'primary' }); refs.nftNote.textContent = 'The shop sent a skin: ' + DEFXN_TRAITS.skinText(mintAsk).split('|').join(', ') + '. Minting it puts it on your key. Your PVA stays as it is.'; }
          side.appendChild(make({ block: 'actions', id: 'account-nft-try', props: { items: items } }));
          /* the wearer's skins, each with the link that starts a trade: the taker opens it and accepts (buildTrade). Three
             show, so the card still fits the page; the menu tries every one on. */
          DefxnSkinSite.chainCards().then(function (cards) {
            if (!cards || !cards.skins.length || !side.isConnected) return;
            side.appendChild(make({ block: 'list', id: 'account-nft-skins', props: { label: 'Your skins' + (cards.skins.length > 3 ? ' (3 of ' + cards.skins.length + ')' : ''),
              items: cards.skins.slice(0, 3).map(function (sk) { return { id: sk.id, title: sk.label, meta: 'skin ' + sk.id.slice(0, 8), actions: [{ label: 'Copy gift link', action: 'skin-link', tone: 'ghost' }, { label: 'Copy sale link', action: 'skin-sale-link', tone: 'ghost' }] }; }) } }));
            /* the price a sale link asks, typed in FXN and carried in the link as base units (fxn-holdings.mjs parseFxn):
               the taker's FXN is then held for the skin, and paid to you when you give it */
            refs.saleForm = side.appendChild(make({ block: 'form', id: 'account-nft-sale', props: { label: 'Sale link', fields: [
              { name: 'price', label: 'Price in FXN', type: 'text', autocomplete: 'off', placeholder: '12.5' },
              { name: 'days', label: 'Days the buyer\u2019s FXN waits for you', type: 'number', value: '3', autocomplete: 'off' }],
              submit: { label: 'Use this price', action: 'skin-sale-price', tone: 'secondary' } } }));
          }, function () { /* the card itself already said what it could read */ });
        }
        var seal = side.appendChild(el('div', 'account-nft-seal'));
        DefxnSkinSite.sealIn(seal).then(function (made) { if (seal.isConnected) cardSeal = made; else made.remove(); }, function (error) { refs.nftNote.textContent = 'The card\u2019s seal did not load (' + error.message + '). Reload the page to try again.'; });
        profileCard.ready.catch(function (error) { refs.nftNote.textContent = 'The card did not load (' + error.message + '). Reload the page to try again.'; });
        node.appendChild(art); node.appendChild(side);
        return node;
      }
      /* No PVA yet: the one step that makes it. It cites the first FXN payment the wallet received (chain-cards.mjs
         activatePva), after the full signing review. A wallet that received nothing is told so by the step itself. */
      function buildActivate() {
        var node = el('section', 'account-trade');
        node.setAttribute('aria-label', 'Your card');
        node.appendChild(el('p', 'account-nft-kicker')).textContent = 'Your card';
        activateNote = node.appendChild(el('p', 'account-nft-note'));
        activateNote.textContent = 'Your identity card, the PVA, comes from your first FXN payment. It stays bound to your key.';
        node.appendChild(make({ block: 'actions', id: 'account-pva-activate', props: { items: [{ label: 'Activate your PVA', action: 'pva-activate', tone: 'primary' }] } }));
        return node;
      }
      /* A skin trade, one step per device, from a link (js/ark/chain-cards.mjs acceptSkin and giveSkin). The taker opens
         ?take-skin=<skin id> and accepts; the page then shows the link the owner opens, ?give-skin=<id>&consent=<id>, to
         move the skin. Each step shows the full signing review first. Null when the address carries neither. */
      function buildTrade() {
        var q = new URLSearchParams(location.search), take = q.get('take-skin'), give = q.get('give-skin'), end = q.get('end-sale'), price = q.get('price'), days = q.get('days') || '3';
        if (!take && !give && !end) return null;
        if (price && !/^[1-9][0-9]*$/.test(price)) price = null;
        var node = el('section', 'account-trade');
        node.setAttribute('aria-label', 'Skin trade');
        node.appendChild(el('p', 'account-nft-kicker')).textContent = end ? 'A sale that ended' : take ? (price ? 'A skin for sale' : 'A skin for you') : 'Give a skin';
        tradeNote = node.appendChild(el('p', 'account-nft-note'));
        /* the link's price is base units; it prints at the node's decimals once they are read (base units until then) */
        function saleNote() {
          tradeNote.textContent = end ? 'If the owner did not give you the skin in time, take your FXN back.'
            : take ? (price ? 'Skin ' + take.slice(0, 8) + ' is for sale for ' + holdingsApi.fxnText(price) + '. Your FXN wait up to ' + days + ' days, and go to the owner only when the skin moves to you.'
              : 'Someone wants to give you skin ' + take.slice(0, 8) + '. Accept it, then send the link you get back.')
            : 'Someone accepted skin ' + give.slice(0, 8) + '. Give it to move it to them. You cannot take it back.';
        }
        saleNote();
        if (take && price) Promise.all([loadWalletModule(), loadHoldingsModule()]).then(function (got) {
          return got[1].readDecimals(walletWire(got[0]));
        }).then(function () { if (tradeAsk && tradeAsk.step === 'take') saleNote(); }, function () { /* the note keeps base units */ });
        tradeAsk = end ? { step: 'end', edge: end } : take ? { step: 'take', id: take, price: price, days: days } : { step: 'give', id: give, edge: q.get('consent') };
        var label = end ? 'Take my FXN back' : take ? (price ? 'Accept and pay' : 'Accept this skin') : 'Give this skin';
        node.appendChild(make({ block: 'actions', id: 'account-trade-act', props: { items: [{ label: label, action: 'skin-trade', tone: 'primary' }] } }));
        return node;
      }
      function runTrade() {
        if (!tradeAsk) return;
        var who = session.isUnlocked() ? session.current() : null;
        if (!who) { tradeNote.textContent = 'Unlock your FXN ID first. Each step is signed by your own key.'; return; }
        tradeNote.textContent = 'Review the step, then approve it.';
        var run = tradeAsk.step === 'take' ? DefxnSkinSite.acceptSkin(who, tradeAsk.id, tradeAsk.price, tradeAsk.days)
          : tradeAsk.step === 'end' ? DefxnSkinSite.endSale(who, tradeAsk.edge) : DefxnSkinSite.giveSkin(who, tradeAsk.id, tradeAsk.edge);
        run.then(function (res) {
          if (res.kind === 'accepted') {
            var link = location.origin + '/account?give-skin=' + res.id + '&consent=' + res.edge;
            tradeNote.textContent = (res.sale ? 'Paid ' + holdingsApi.fxnText(res.price) + ' into the sale. ' : 'Accepted. ') + 'Send this link to the owner, ' + res.owner.slice(0, 8) + '\u2026: ' + link
              + (res.sale ? ' If the skin has not moved by ' + new Date(res.deadline * 1000).toLocaleString() + ', open ' + location.origin + '/account?end-sale=' + res.edge + ' to take your FXN back.' : '');
            copyText(link, 'Link copied. Send it to the owner.');
          } else if (res.kind === 'given') tradeNote.textContent = 'Given. The skin is now ' + res.to.slice(0, 8) + '\u2026\u2019s.' + (res.paid ? ' You received ' + holdingsApi.fxnText(res.paid) + '.' : '');
          else if (res.kind === 'returned') tradeNote.textContent = 'Your ' + holdingsApi.fxnText(res.amount) + ' are back in your wallet.';
          else tradeNote.textContent = res.failure + ' Missing: ' + res.missing + '. To fix: ' + res.remedy + '.';
        }, function (error) { tradeNote.textContent = error.message; });
      }
      /* The glance rail: Ark's interactive stats (each tile opens the view that owns its number), and the way to the explorer. */
      function buildRail() {
        var node = el('aside', 'account-rail');
        node.setAttribute('aria-label', 'Your account at a glance');
        refs.rail = make({ block: 'stats', id: 'account-rail-stats', props: railProps(), was: WAS['account-rail-stats'] }); remember('rail', railProps());
        node.appendChild(refs.rail);
        node.appendChild(make({ block: 'actions', id: 'account-rail-link', props: { label: 'Explore the network', align: 'end', items: [{ label: 'Mesh Explorer', href: 'route:explorer', tone: 'link' }] }, was: WAS['account-rail-link'] }));
        node.hidden = true;
        return node;
      }

      /* ---- the tabs: rebuilt only when the set of views changes (the session state) ---------- */
      function viewNode(value) {
        return { signin: views.session, create: views.create, session: views.session, defi: views.wallet, keys: views.keys, contacts: views.contacts, mesh: views.mesh }[value];
      }
      function buildTabs(state, open) {
        var values = tabValues(state);
        var tabs = make({ block: 'tabs', id: 'account-views', was: tabsWas(state, values), props: { label: state === 'signed-out' ? 'Sign in or create' : 'Account views', variant: 'tabs',
          defaultValue: values.indexOf(open) >= 0 ? open : values[0], items: values.map(function (value) { return { value: value, label: TAB_LABEL[value] }; }) } });
        var panels = Array.prototype.filter.call(tabs.children, function (node) { return node.getAttribute('data-ark-part') === 'tabs-content'; });
        values.forEach(function (value, index) { panels[index].appendChild(viewNode(value)); });
        /* A view with no tab in this state stays in the page, hidden, as the hand-built page kept every panel
           (hidden) in every state: the CMS keys its elements, and a saved edit on one lands once its tab exists. */
        ['session', 'create', 'wallet', 'keys', 'contacts', 'mesh'].forEach(function (name) { if (!tabs.contains(views[name])) offstage.appendChild(views[name]); });
        /* the primitive handles the click; this only follows its result (js/pages/story.js does the same) */
        tabs.querySelector('[data-ark-part="tabs-list"]').addEventListener('click', function () { if (selectedTab() === 'create') createOpened(); });
        tabsEl = tabs; tabsValues = values;
        return tabs;
      }
      function selectedTab() {
        if (!tabsEl) return '';
        var triggers = tabsEl.querySelectorAll('[data-ark-part="tabs-trigger"]');
        for (var i = 0; i < triggers.length; i++) if (triggers[i].getAttribute('aria-selected') === 'true') return tabsValues[i];
        return '';
      }
      function panelAvailable(name) {
        if (name === 'session') return true;
        if (name === 'defi' || name === 'mesh') return !!identity;
        if (name === 'contacts' || name === 'keys') return !!(identity && session.isUnlocked());
        return false;
      }
      /* A view is opened through the primitive (a click on its tab), never by hand. */
      function openTab(name) {
        if (!panelAvailable(name)) name = 'session';
        if (!identity && name === 'session') name = 'signin';
        var index = tabsValues.indexOf(name);
        if (index < 0 || !tabsEl) return;
        if (selectedTab() !== name) tabsEl.querySelectorAll('[data-ark-part="tabs-trigger"]')[index].click();
      }

      /* ---- the page ------------------------------------------------------------------------- */
      sessionState = stateOf(identity);
      var spec = [
        { block: 'custom', id: 'account-shell', was: WAS['account-shell'], mount: function () {
          var shell = el('div', 'account-shell');
          var left = pin(el('div', 'account-hero'), HERO, true);
          refs.hero = make({ block: 'hero', id: 'account-headline', props: heroProps(identity), was: WAS['account-headline'] }); remember('hero', heroProps(identity));
          left.appendChild(refs.hero);
          nftSample = typeof DefxnProfileCard !== 'undefined' ? DefxnProfileCard.fromAddress() || DefxnSkinSite.heldNumber() : null;   /* the sample in the address, or the card held on this device */
          if (nftSample) left.appendChild(buildNft(nftSample));
          mapWrap = el('div', 'account-map');
          mapWrap.appendChild(make({ block: 'figure', id: 'account-map', was: WAS['account-map'], props: { kind: 'illustration', slot: 'account-map', aspect: 'auto', labelMin: '12',
            caption: 'How it fits together: your FXN ID file opens your identity, your wallet and publishing.' } }));
          mapWrap.hidden = !!identity || !!nftSample;
          left.appendChild(mapWrap);
          /* a skin trade link: ?take-skin=<id> (the taker consents) or ?give-skin=<id>&consent=<id> (the owner moves it) */
          if (identity && typeof DefxnSkinSite !== 'undefined') { var trade = buildTrade(); if (trade) left.insertBefore(trade, mapWrap); }
          /* no sample: the signed-in identity's own PVA, when the chain holds one. A failed read leaves the map. */
          if (!nftSample && identity && typeof DefxnSkinSite !== 'undefined' && typeof DefxnProfileCard !== 'undefined') DefxnSkinSite.chainCard().then(function (rec) {
            if (!rec && mapWrap.isConnected && !profileCard) { left.insertBefore(buildActivate(), mapWrap); return; }
            if (!rec || !mapWrap.isConnected || profileCard) return;
            left.insertBefore(buildNft(rec), mapWrap); mapWrap.hidden = true;
          }, function (error) { console.info('[account] Your card was not read from the chain (' + error.message + '). The page shows the map.'); });
          identityWrap = pin(el('div', 'account-identity'), STATE, true);
          /* On a phone the identity details fold behind a press (Ark's disclosure, foldBelow 'phone'): the page
             was 1.7x the viewport signed in, past the 1.6x fold budget; wider they are always in sight. With the NFT card
             in the column they fold at every size: the card pushed the identity ID below the fold at 1280x720. */
          refs.fold = make({ block: 'disclosure', id: 'account-identity-fold', props: { foldBelow: nftSample ? 'always' : 'phone', more: 'Show identity details', less: 'Hide identity details', blocks: [
            { block: 'facts', id: 'account-identity', props: identityProps(identity), was: WAS['account-identity'] },
            { block: 'actions', id: 'account-copy', props: copyProps(), was: WAS['account-copy'] }] } });
          refs.identity = refs.fold.querySelector('#account-identity'); remember('identity', identityProps(identity));
          refs.copy = refs.fold.querySelector('#account-copy'); remember('copy', copyProps());
          refs.dev = make({ block: 'disclosure', id: 'account-developer', was: WAS['account-developer'], props: { more: 'Developer details', less: 'Hide developer details',
            content: 'Technical names for what you see here: the FXN ID number names this file, and the Public ID key is the key sites and the chain check your signatures against. Your Master ID signs nothing they see.',
            blocks: [{ block: 'facts', id: 'account-developer-facts', props: developerProps(identity), was: WAS['account-developer-facts'] }] } });
          refs.devFacts = refs.dev.querySelector('#account-developer-facts'); remember('devFacts', developerProps(identity));
          identityWrap.appendChild(refs.fold); identityWrap.appendChild(refs.dev);
          identityWrap.hidden = !identity;
          left.appendChild(identityWrap);
          /* the frame the 3D world is fitted to (js/world/world-host.js frame()): your identity over the network, below the words */
          var worldStage = el('div', 'account-stage'); worldStage.setAttribute('data-stage', ''); worldStage.setAttribute('aria-hidden', 'true');
          left.appendChild(worldStage);
          shell.appendChild(left);
          views.session = buildSession(); views.create = buildCreate(); views.wallet = buildWallet(); views.keys = buildKeys(); views.contacts = buildContacts(); views.mesh = buildMesh();
          offstage = el('div', 'account-offstage'); offstage.hidden = true;
          cardHost = el('section', 'account-card'); cardHost.setAttribute('aria-label', 'Account'); cardHost.setAttribute('data-panel', '');   /* the world draws its glass slab under this box */
          cardHost.appendChild(buildTabs(sessionState, sessionState === 'verified-local' ? 'defi' : (sessionState === 'signed-out' ? 'signin' : 'session')));
          shell.appendChild(cardHost);
          railEl = buildRail(); railEl.hidden = !identity;
          shell.appendChild(railEl);
          shell.appendChild(offstage);
          return shell;
        } },
        /* Anchor for reusable content blocks (js/content/components.js); rendering into it is centralized in js/main.js's onMount hook. */
        { insert: 'main', was: 'page:/div:1/div:1' }
      ];
      page = ArkUI.page(spec, host, { page: 'account', className: 'account-page', titleId: 'account-title', terms: 'first-use', termState: termState,
        slots: { 'account-map': function () { return el('div', null, MAP_SVG).firstChild; } },
        /* every press that means something to the page raises ark:action (Ark's actions, forms, lists, stats); `item` is a list row's id */
        actions: {
          'copy-ghost': function () { copyIdentityField('ghost'); },
          'copy-wallet': function () { copyIdentityField('wallet'); },
          'forget': function () { session.signOut(); },
          'wallet-send': function () { showWallet('send'); },
          'wallet-back': function () { showWallet('home'); },
          'wallet-send-submit': function (detail) { runSend(detail.values); },
          'wallet-copy-key': function () { copyText(wallet.key, 'Key copied.'); },
          'wallet-refresh': function () { loadWallet(); },
          'wallet-keys': function () { showWallet('keys'); },
          'wallet-safes': function () { showWallet('safes'); },
          'wallet-history': function () { showWallet('history'); loadHistory(); },
          'fxn-copy-key': function (detail) { if (/^[0-9a-f]{64}$/.test(detail.item || '')) copyText(detail.item, 'Key copied. Share it to receive FXN.'); },
          'fxn-send-from': function (detail) { sendFrom = detail.item || ''; paint('sendForm', sendFormProps()); showWallet('send'); },
          'safe-spend': function (detail) { openSpend({ label: detail.item }); },
          'spend-terms': function (detail) { spendTerms(detail.values); },
          'spend-approve': function () { spendApprove(); },
          'spend-check': function () { spendCheck(true); },
          'spend-link': function () { spendLink(); },
          'spend-submit': function () { spendSubmit(); },
          'spend-reset': function () { if (spend) openSpend({ label: spend.label }); },
          'mesh-verify': function () { checkMesh(); },
          'rail-defi': function () { openTab('defi'); },
          'rail-contacts': function () { openTab('contacts'); },
          'rail-mesh': function () { openTab('mesh'); },
          'contacts-search': function (detail) { searchContacts(detail.values.query); },
          'contacts-refresh': function () { loadContacts(false); },
          'skin-trade': function () { runTrade(); },
          'pva-activate': function () {
            var who = session.isUnlocked() ? session.current() : null;
            if (!who) { activateNote.textContent = 'Unlock your FXN ID first. Your card is signed by your own key.'; return; }
            activateNote.textContent = 'Review the activation, then approve it.';
            /* the first FXN may be in a private wallet: the chain counts it only after that one link is published, with
               the Publish link step's own review and warning (owner, 2026-10-25) */
            var publishFirst = function (walletKey) {
              activateNote.textContent = 'Your first FXN is in a private wallet. Publishing its link lets the chain count it. Anyone can then see that this wallet is yours.';
              return keysPublish(walletKey).then(function () {
                var w = who.publicId && (who.publicId.wallets || []).filter(function (x) { return x.key === walletKey; })[0];
                return !!(w && w.published != null);
              });
            };
            DefxnSkinSite.activatePva(who, publishFirst).then(function (res) {
              activateNote.textContent = res.kind === 'activated' ? 'Your PVA is active: ' + res.id.slice(0, 8) + '\u2026.' + (res.published ? ' Wallet ' + res.published.slice(0, 8) + '\u2026 is now public.' : '') + ' Reload the page to see your card.' : res.failure + ' Missing: ' + res.missing + '. To fix: ' + res.remedy + '.';
            }, function (error) { activateNote.textContent = error.message; });
          },
          'skin-sale-price': function (detail) {
            /* typed FXN -> base units at the node's decimals (fxn-holdings.mjs parseFxn); the link carries the base units */
            var typed = String(detail.values.price || '').trim(), days = String(detail.values.days || '3').trim();
            salePrice = null;
            Promise.all([loadWalletModule(), loadHoldingsModule()]).then(function (got) {
              return got[1].readDecimals(walletWire(got[0])).then(function () { return got[1]; });
            }).then(function (fh) {
              var units = fh.parseFxn(typed);
              if (units <= 0n) { refs.nftNote.textContent = 'Set a price above zero, in FXN.'; return; }
              salePrice = { units: units.toString(), text: fh.fxnText(units), days: days };
              refs.nftNote.textContent = 'Sale links now ask ' + salePrice.text + '. Press Copy sale link by a skin.';
            }, function (error) { refs.nftNote.textContent = error.message; });
          },
          'skin-sale-link': function (detail) {
            var price = salePrice ? salePrice.units : '', days = (salePrice && salePrice.days) || '3';
            if (!/^[1-9][0-9]*$/.test(price)) { refs.nftNote.textContent = 'Set a price first, in FXN, above zero.'; return; }
            if (!/^([1-9]|[12][0-9]|30)$/.test(days)) { refs.nftNote.textContent = 'Set the days the buyer\u2019s FXN waits: 1 to 30.'; return; }
            if (/^[0-9a-f]{64}$/.test(detail.item || '')) copyText(location.origin + '/account?take-skin=' + detail.item + '&price=' + price + '&days=' + days, 'Sale link copied: ' + salePrice.text + '. Send it to the buyer.');
          },
          'skin-link': function (detail) { if (/^[0-9a-f]{64}$/.test(detail.item || '')) copyText(location.origin + '/account?take-skin=' + detail.item, 'Trade link copied. Send it to the person who should get the skin.'); },
          'nft-mint': function () {
            if (!realCard || !mintAsk) return;
            var who = session.isUnlocked() ? session.current() : null;
            if (!who) { refs.nftNote.textContent = 'Unlock your FXN ID first. A skin is signed by your own key.'; return; }
            refs.nftNote.textContent = 'Review the skin, then approve it to mint.';
            DefxnSkinSite.mintSkin(who, mintAsk).then(function (res) {
              refs.nftNote.textContent = res.kind === 'minted' ? 'Minted. The skin is on your key: ' + res.id.slice(0, 8) + '. Try it on from your menu.' : res.failure + ' Missing: ' + res.missing + '. To fix: ' + res.remedy + '.';
            }, function (error) { refs.nftNote.textContent = error.message; });
          },
          'nft-try': function () { if (realCard) DefxnSkinSite.tryRecord(realCard).catch(function (error) { refs.nftNote.textContent = 'Your card did not go on (' + error.message + '). Reload the page to try again.'; }); },
          'contact-open': function (detail) { openContactDetail(detail.item, contactStates[detail.item]); },
          'contact-back': function () { showContactList(); },
          'contact-invite': function (detail) { inviteFromRow(detail.item); },
          'contact-accept': function (detail) { contactAction(detail.item, 'acceptInvite'); },
          'contact-decline': function (detail) { contactAction(detail.item, 'declineInvite'); },
          'contact-withdraw': function (detail) { contactAction(detail.item, 'withdrawInvite'); },
          'keys-add': function (detail) { keysAdd(detail.values); },
          'keys-add-id': function () { keysAddId(); },
          'keys-save': function () { keysSave(); },
          'keys-publish': function (detail) { keysPublish(detail.item); },
          'keys-use-id': function (detail) { var who = signer(); if (who && who.usePublicId) { try { who.usePublicId(detail.item); renderKeys(); } catch (error) { result('keysAddResult', error.message, 'danger'); } } },
          'keys-rotate': function (detail) { keysRotate(detail.values); },
          'keys-revoke': function () { keysRevoke(); },
          'keys-delegate': function () { keysDelegate(); },
          'keys-revoke-delegation': function () { keysRevokeDelegation(); }
        } });
      page.dataset.session = sessionState;
      var lastSessionState = sessionState;
      var fields = { fxnNetwork: views.wallet.querySelector('[data-account-fxn-network]') };
      var contactsFields = {
        acceptedCount: views.contacts.querySelector('[data-contacts-accepted-count]'),
        incomingCount: views.contacts.querySelector('[data-contacts-incoming-count]'),
        outgoingCount: views.contacts.querySelector('[data-contacts-outgoing-count]'),
        listView: views.contacts.querySelector('[data-contacts-view="list"]'),
        detailView: views.contacts.querySelector('[data-contacts-view="detail"]'),
        detailAvatar: views.contacts.querySelector('[data-contact-avatar]'),
        detailName: views.contacts.querySelector('[data-contact-name]'),
        detailState: views.contacts.querySelector('[data-contact-state]'),
        detailBio: views.contacts.querySelector('[data-contact-bio]')
      };
      var keysFields = { pin: views.keys.querySelector('[data-account-keys-pin]'), password: views.keys.querySelector('[data-account-keys-password]') };
      var generation = 0;
      var controller = null;
      var contactsGeneration = 0;
      var contactsPollTimer = null;
      var CONTACTS_POLL_MS = 15000;
      var contactProfiles = Object.create(null);
      var contactStates = Object.create(null);

      /* Wallet sub-views: the send form takes the wallet's place. */
      var walletViews = Array.prototype.slice.call(views.wallet.querySelectorAll('[data-account-wallet-view]'));
      function showWallet(name) {
        walletViews.forEach(function (view) { view.hidden = view.getAttribute('data-account-wallet-view') !== name; });
        var first = name === 'home' ? null : views.wallet.querySelector('[data-account-wallet-view="' + name + '"] input');
        if (first && first.focus) first.focus();
      }
      /* The glance rail's tiles are Ark's stats: each is repainted from the page's state. */
      function paintWalletControls() { paint('walletRow', walletRowProps()); paint('sendForm', sendFormProps()); }
      function setSendable(enabled) { walletSendable = !!enabled; paintWalletControls(); }
      function syncRail() { paint('rail', railProps()); }
      /* a result under a form or a list, said in Ark's polite status line; `tone` is the outcome (trust = done, danger = refused) */
      function result(name, message, tone) { paint(name, statusProps(message, tone)); }
      function setWallet(patch) {
        Object.keys(patch).forEach(function (key) { wallet[key] = patch[key]; });
        paint('balances', walletStats());
        paint('pubkey', keyProps());
        syncRail();
      }
      function setMesh(patch) {
        Object.keys(patch).forEach(function (key) { mesh[key] = patch[key]; });
        paint('meshStats', meshStats());
        paint('meshFacts', meshFacts());
        views.meshDetail.hidden = !mesh.detail;
        syncRail();
      }
      function setMeshBusy(value) { meshBusy = !!value; paint('meshActions', meshActionProps()); }
      function setNotices() {
        var holder = views.session.querySelector('[data-account-notices]');
        var storage = ArkUI.localIdentity.storageError();
        var meshAuth = (ArkUI.accountSession && ArkUI.accountSession.meshAuthMessage) || '';
        var json = JSON.stringify([storage, meshAuth]);
        if (holder.getAttribute('data-notices') === json) return;
        holder.setAttribute('data-notices', json);
        holder.replaceChildren();
        [storage, meshAuth].forEach(function (message) {
          if (message) holder.appendChild(ArkUI.blocks.render({ block: 'callout', props: { tone: 'warning', body: message, live: 'polite' } }, { from: fromPath(), onInvalid: 'throw' }));
        });
      }
      setSendable(false);

      function resetMesh(message) {
        generation += 1;
        if (controller) controller.abort();
        controller = null;
        setMesh(meshDefaults(message));
      }

      async function checkMesh() {
        if (!identity || !identity.identityId || !page.isConnected) return;
        var id = identity.identityId;
        var token = ++generation;
        if (controller) controller.abort();
        controller = new AbortController();
        var timeout = window.setTimeout(function () { controller.abort(); }, 10000);
        setMeshBusy(true);
        setMesh({ detail: false, status: 'Verifying identity…', message: 'Checking your public identity and linked account.' });
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
          var accountBody = account && account.fields && account.fields.sourceRecord && typeof account.fields.sourceRecord === 'object' ? account.fields.sourceRecord : {};
          var standing = accountBody.standing || accountBody.status || '';
          setMesh({
            status: 'Identity verified',
            message: account ? 'Your identity and linked account are verified on DEFXN.' : 'Your identity is verified. Link an account to display its network status.',
            record: text(record.id),
            verification: text(record.verification && record.verification.state),
            updated: text(record.updatedAt, 'Not dated'),
            provenance: text(record.provenance && (record.provenance.source || record.provenance.location), 'Not reported'),
            standing: account ? (standing ? text(standing) : 'Verified account · no status') : 'Not linked',
            standingMessage: account ? ('Account ' + accountId + (standing ? ' · verified status' : ' · verified')) : 'No linked account was found.',
            detail: true
          });
        } catch (error) {
          if (token !== generation || !page.isConnected || !identity || identity.identityId !== id) return;
          setMesh({
            status: error && error.name === 'AbortError' ? 'Verification timed out' : 'Not connected',
            message: error && error.name === 'AbortError' ? 'The network took too long to respond. Try again.' : error instanceof TypeError ? 'We could not reach the network. Try again.' : text(error && error.message, 'We could not verify this identity.')
          });
        } finally {
          window.clearTimeout(timeout);
          if (token === generation && page.isConnected) { controller = null; setMeshBusy(false); }
        }
      }


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
      var WALLET_MODULE = 'js/ark/dense-wire-wallet.mjs?v=20261029-decimals1';
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
        var symbol = meta && meta.doc && meta.doc.body && meta.doc.body.symbol;
        setWallet({ symbol: symbol ? String(symbol) : 'FXN', logo: meta && meta.image || null });
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

      function say(message, tone) { result('sendStatus', message, tone); }


      function walletError(error, fallback) {
        var message = text(error && error.message, '');
        return /amount|recipient|public key|insufficient|balance/i.test(message) ? message : fallback;
      }

      /* Signing wallets (docs/FLUX-WALLET-DELEGATION-SCOPE-VISION.md) --
         distinct from the dense-wire FXN "Wallet" tab above: these are real
         fxn-auth/wallet-lifecycle wallet-link records stored on the Auth
         Kit itself (`identity.walletAddresses`/`addWallet`/`rotateWallet`/
         `revokeWallet`/`delegateWallet`, wired in scripts/auth-entry.js).
         `identity.walletAddresses`/`walletDelegations` are live getters
         (re-derived from the current vault on every read), not frozen
         snapshots, so this list always reflects the latest mutation
         without needing a fresh sign-in. */
      /* The wallet lifecycle methods and live getters belong to the SIGNER -- the unlocked Auth Kit
         (ArkUI.accountSession.current()) -- never to `identity`, which is the public pointer
         ArkUI.localIdentity keeps (six frozen public fields, js/ark/local-identity.js). Reading them
         off `identity` made this whole view inert in a real browser: the list always said "No signing
         wallets yet." and every button returned without doing anything, while the jsdom test passed
         because it stubbed localIdentity with a pass-through of the full object.
         Regression: tests/browser/account-flows.mjs step 9. */
      function signer() { return ArkUI.accountSession && ArkUI.accountSession.current(); }
      /* The list reads the signer's live getters, so it always shows the latest mutation without a fresh sign-in. */
      function renderKeys() { paint('keysList', keysListProps()); }

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

      function cancelled(message) { var error = new Error(message); error.cancelled = true; return error; }
      function keysFail(name, fallback) { return function (error) { result(name, text(error && error.message, fallback), error && error.cancelled ? 'drift' : 'danger'); }; }
      /* the wallet address typed in the rotate / revoke / delegate form (its Revoke, Delegate and Revoke delegation buttons raise no values) */
      function keysAddress() { var input = views.keys.querySelector('#account-keys-action [name="address"]'); return input ? input.value.trim() : ''; }

      function keysAdd(values) {
        var who = signer();
        if (!who || !who.addWallet) return;
        var label = String(values.label || '').trim() || undefined;
        var id = who.publicId;
        if (!id) { result('keysAddResult', 'This FXN ID has no Public ID. Press Add Public ID first.', 'danger'); return; }
        /* One record joins the wallet to its Public ID: the wallet signs it, and the Public ID countersigns it. It stays
           in the file (owner ruling, option A): the wallet is private until Publish link sends it. The Master ID signs
           nothing here. */
        confirmWalletAction({
          title: 'Add a wallet to ' + id.name, scope: 'wallet.link', action: 'wallet.link.sign',
          manifest: { publicId: id.key, label: label || null, record: 'KWALLET1', sent: false },
          facts: [{ label: 'Public ID', value: id.name }, { label: 'Signed by', value: 'the new wallet and ' + id.name }, { label: 'Who can see the link', value: 'only you. It stays in your FXN ID file.' }],
        }).then(function (approved) {
          if (!approved) throw cancelled('Cancelled. No wallet was added.');
          result('keysAddResult', 'Adding\u2026');
          return who.addWallet({ label: label });
        }).then(function (added) {
          renderKeys();
          result('keysAddResult', 'Added private wallet ' + added.walletAddress.slice(0, 12) + '\u2026. Save the new file now: it is the only copy of this wallet\u2019s key.', 'trust');
        }).catch(keysFail('keysAddResult', 'Could not add a wallet.'));
      }

      /* Publish link (owner ruling, option A, 2026-10-25): sends one private wallet's KWALLET1 to chain pva. The record
         was signed when the wallet was made; nothing new is signed here. The chain takes it until the wallet first sends:
         FXN it received while private is fine, a record it signed is not (owner, 2026-10-25). */
      function keysPublish(walletKey) {
        var who = signer();
        if (!who || !who.publishWallet) return Promise.resolve();
        var id = who.publicId;
        if (!id) return Promise.resolve();
        return confirmWalletAction({
          title: 'Publish this wallet\u2019s link to ' + id.name, scope: 'wallet.link', action: 'wallet.link.publish',
          manifest: { publicId: id.key, wallet: walletKey, record: 'KWALLET1', chain: 'pva' },
          facts: [{ label: 'Wallet', value: walletKey }, { label: 'Public ID', value: id.name },
            { label: 'Sends', value: 'one KWALLET1 record to chain pva, signed when the wallet was made' },
            { label: 'Who can see the link', value: 'anyone who reads chain pva. This cannot be undone.' }],
        }).then(function (approved) {
          if (!approved) throw cancelled('Cancelled. The link stays private.');
          result('keysAddResult', 'Sending the link to the chain\u2026');
          return import(new URL('js/ark/dense-wire-wallet.mjs', document.baseURI).href).then(function (m) {
            var send = function (record) {
              var wire = new m.WalletWire(m.resolveWireUrl());
              return wire.sendLine('RESOLVER_RECORD\t' + record).then(function (reply) {
                wire.close();
                var line = String(reply).trim();
                if (!/^OK\b/.test(line)) throw new Error('The chain did not take the link: ' + line + '. Missing: a wallet that has never sent anything. To fix: publish a wallet before it sends. For one that already sent, make a new wallet.');
              }, function (error) { wire.close(); throw error; });
            };
            /* the file was not saved after an earlier publish: the chain may already hold this exact link */
            var ask = function (line) {
              var wire = new m.WalletWire(m.resolveWireUrl());
              return wire.sendLine(line).then(function (reply) { wire.close(); return reply; }, function (error) { wire.close(); throw error; });
            };
            return who.publishWallet({ walletKey: walletKey, send: send, ask: ask });
          });
        }).then(function (done) {
          renderKeys();
          result('keysAddResult', (done && done.alreadyOnChain ? 'The chain already held this link. ' : 'Published. ') + 'Save the new file now, so it records that this link is public.', 'trust');
        }).catch(keysFail('keysAddResult', 'Could not publish the link.'));
      }

      function keysAddId() {
        var who = signer();
        if (!who || !who.addPublicId) return;
        confirmWalletAction({
          title: 'Add a Public ID', scope: 'public-id.add', action: 'public-id.add',
          manifest: { wallets: 0 }, facts: [{ label: 'Makes', value: 'a new Public ID. Sites and the chain cannot link it to your other Public IDs.' }],
        }).then(function (approved) {
          if (!approved) throw cancelled('Cancelled. No Public ID was added.');
          result('keysAddResult', 'Adding\u2026');
          return who.addPublicId({ walletCount: 0 });
        }).then(function (added) {
          renderKeys();
          result('keysAddResult', 'Added ' + added.publicId.name + '. Save the new file now: your Master ID recovery phrase does not bring this Public ID back.', 'trust');
        }).catch(keysFail('keysAddResult', 'Could not add a Public ID.'));
      }

      function keysSave() {
        var who = signer();
        if (!who || !who.fileText) return;
        try {
          var url = URL.createObjectURL(new Blob([who.fileText()], { type: 'application/vnd.flux.auth-kit' }));
          var a = document.createElement('a');
          a.href = url; a.download = (String(who.fileDisplayName || 'fxn-id').replace(/[^A-Za-z0-9 _-]+/g, '').trim() || 'fxn-id') + '.auth.fxn';
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
          result('keysAddResult', 'Saved. Keep this file and delete older copies.', 'trust');
        } catch (error) { result('keysAddResult', error.message, 'danger'); }
      }

      function keysRotate(values) {
        var who = signer();
        if (!who || !who.rotateWallet) return;
        var address = String(values.address || '').trim();
        var label = String(values.rotateLabel || '').trim() || undefined;
        confirmWalletAction({
          title: 'Rotate wallet', scope: 'wallet.rotate', action: 'wallet.rotate.sign',
          manifest: { walletAddress: address, label: label || null },
          facts: [{ label: 'Wallet', value: address }],
        }).then(function (approved) {
          if (!approved) throw cancelled('Cancelled. This wallet was not rotated.');
          result('keysActionResult', 'Rotating\u2026');
          return who.rotateWallet({ walletAddress: address, pin: keysFields.pin.value, password: keysFields.password.value || undefined, label: label });
        }).then(function (rotated) {
          result('keysActionResult', 'Rotated ' + address + ' \u2192 ' + rotated.walletAddress, 'trust');
          keysFields.pin.value = '';
          renderKeys();
        }).catch(keysFail('keysActionResult', 'Could not rotate this wallet.'));
      }

      function keysRevoke() {
        var who = signer();
        if (!who || !who.revokeWallet) return;
        var address = keysAddress();
        confirmWalletAction({
          title: 'Revoke wallet', scope: 'wallet.revoke', action: 'wallet.revoke.sign',
          manifest: { walletAddress: address }, facts: [{ label: 'Wallet', value: address }],
        }).then(function (approved) {
          if (!approved) throw cancelled('Cancelled. This wallet was not revoked.');
          result('keysActionResult', 'Revoking\u2026');
          return who.revokeWallet({ walletAddress: address });
        }).then(function () {
          result('keysActionResult', 'Revoked ' + address, 'trust');
          renderKeys();
        }).catch(keysFail('keysActionResult', 'Could not revoke this wallet.'));
      }

      function keysDelegate() {
        var who = signer();
        if (!who || !who.delegateWallet) return;
        var address = keysAddress();
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
          if (!approved) throw cancelled('Cancelled. This wallet was not delegated.');
          result('keysActionResult', 'Delegating\u2026');
          return who.delegateWallet({ walletAddress: address, rights: ['receive', 'spend'], maxSpend: maxSpend });
        }).then(function (delegated) {
          result('keysActionResult', 'Delegated ' + delegated.delegatedRights.join('+') + ' to this identity', 'trust');
          renderKeys();
        }).catch(keysFail('keysActionResult', 'Could not delegate this wallet.'));
      }

      function keysRevokeDelegation() {
        var who = signer();
        if (!who || !who.revokeWalletDelegation) return;
        var address = keysAddress();
        confirmWalletAction({
          title: 'Revoke delegation', scope: 'wallet.revoke-delegation', action: 'wallet.revoke-delegation.sign',
          manifest: { walletAddress: address }, facts: [{ label: 'Wallet', value: address }],
        }).then(function (approved) {
          if (!approved) throw cancelled('Cancelled. This delegation was not revoked.');
          who.revokeWalletDelegation({ walletAddress: address });
          result('keysActionResult', 'Revoked the delegation for ' + address, 'trust');
          renderKeys();
        }).catch(keysFail('keysActionResult', 'Could not revoke this delegation.'));
      }

      function resetWallet(message) {
        walletGeneration += 1;
        setWallet({ balance: null, display: '—', message: message || 'Sign in to check', key: '' });
        holdings = { keys: null, keysWhy: '', safes: null, safesWhy: message || '', history: null, historyWhy: '' };
        spend = null;
        paintHoldings();
        setSendable(false);
      }

      /* js/ark/fxn-holdings.mjs: your keys, the safes you sign for, a spend from a safe and the transfers. Loaded on first
         use like the wallet module, and handed that module (`dw`) so the page and it share one copy. */
      var HOLDINGS_MODULE = 'js/ark/fxn-holdings.mjs?v=20261029-decimals1';
      var holdingsModule = null;
      function loadHoldingsModule() {
        if (!holdingsModule) {
          holdingsModule = Promise.resolve().then(function () {
            var path = (location.protocol === 'file:' ? '' : '/') + HOLDINGS_MODULE;
            return import(new URL(path, document.baseURI).href);
          }).then(function (m) { holdingsApi = m; return m; }).catch(function (error) {
            holdingsModule = null;
            throw new Error('The safes and keys reader could not load (' + text(error && error.message, 'module error') + ').');
          });
        }
        return holdingsModule;
      }
      function paintHoldings() {
        var got = holdings.safes;
        /* the plan's own start and council, said once above the rows */
        if (refs.safesHint) refs.safesHint.textContent = 'The genesis mint paid the allocation into these safes. FXN reaches your keys only when the council approves a spend of an unlocked part.'
          + (got && got.kind === 'ok' ? ' Schedules run from ' + holdingsApi.dateOf(got.plan.head.start) + '. ' + got.plan.head.threshold + ' of ' + got.plan.head.signers.length + ' council signers approve each spend.' : '');
        paint('balances', walletStats());
        paint('fxnKeys', keysViewProps());
        paint('safes', safesViewProps());
        paint('held', heldFactsProps());
        paint('sendForm', sendFormProps());
        paintSpend();
        syncRail();
      }

      async function loadWallet() {
        var who = ArkUI.accountSession.current();
        if (!who || !page.isConnected) return;
        var token = ++walletGeneration;
        setWallet({ message: 'Updating balance…' });
        try {
          var dw = await loadWalletModule();
          if (token !== walletGeneration || !page.isConnected) return;
          var link = walletWire(dw);
          initNetworkSelect(dw);
          applyFxnMeta(link);
          var key = dw.signerFor(who).pubHex;
          setWallet({ key: key });
          setSendable(!walletBusy);
          var fh = await loadHoldingsModule();
          if (token !== walletGeneration || !page.isConnected) return;
          // Every key the FXN ID holds, each read with NATIVE_BALANCE (a BigInt, or null when this network has no FXN
          // ledger: absent, never a cosmetic zero -- native_ledger.rs's own distinction).
          var keys = fh.yourKeys(who);
          if (!keys.length) keys = [{ key: key, kind: 'public-id', name: 'Public ID in use', current: true, signer: function () { return dw.signerFor(who); } }];
          await fh.readDecimals(link);   // FXN's decimals, once per node: every amount below prints through them
          var read = await fh.readKeyBalances(link, keys);
          if (token !== walletGeneration || !page.isConnected) return;
          holdings.keys = read.rows; holdings.keysWhy = '';
          if (read.total === null) {
            setWallet({ balance: null, display: 'Unavailable', message: 'No key was read: ' + text(read.rows[0] && read.rows[0].why, 'the node did not answer') + '.' });
          } else {
            setWallet({ balance: fh.fxn(read.total), display: fh.fxn(read.total),
              message: (read.total === 0n ? 'None of your ' + keys.length + ' keys holds FXN yet.' : 'Across your ' + keys.length + ' keys.') + (read.unread ? ' ' + read.unread + ' not read.' : '') });
          }
          paintHoldings();
          // The genesis safes, from the mint's own plan (FXN_GENESIS_PLAN, read by js/genesis-safes.js's parsePlan).
          var safes = await fh.readSafes(link, keys.map(function (k) { return k.key; }));
          if (token !== walletGeneration || !page.isConnected) return;
          holdings.safes = safes;
          paintHoldings();
          openSpendFromAddress();
        } catch (error) {
          if (token !== walletGeneration || !page.isConnected) return;
          setWallet({ balance: null, display: 'Unavailable', message: walletError(error, 'Balance unavailable. Try again.') });
          if (!holdings.safes) { holdings.safesWhy = text(error && error.message, 'The safes were not read.'); paintHoldings(); }
        }
      }

      /* The transfers of every key, read when the History view opens (NATIVE_HISTORY, newest first). */
      var historyGeneration = 0;
      async function loadHistory() {
        var who = ArkUI.accountSession.current();
        if (!who || !holdings.keys) { holdings.historyWhy = 'Your keys are not read yet. Press Refresh, then open History again.'; paint('history', historyProps()); return; }
        var token = ++historyGeneration;
        holdings.history = null; holdings.historyWhy = 'Reading your transfers\u2026'; paint('history', historyProps());
        try {
          var dw = await loadWalletModule(), fh = await loadHoldingsModule();
          var got = await fh.readHistory(walletWire(dw), holdings.keys, 50);
          if (token !== historyGeneration || !page.isConnected) return;
          holdings.history = got;
          paint('history', historyProps());
          var shown = Math.min(got.rows.length, HISTORY_SHOWN);
          say(got.rows.length > shown ? 'Showing the newest ' + shown + ' of ' + got.rows.length + ' transfers.' : (got.unread ? got.unread + ' of your keys were not read. Press History again to retry.' : ''), got.unread ? 'warning' : undefined);
        } catch (error) {
          if (token !== historyGeneration || !page.isConnected) return;
          holdings.historyWhy = 'Your transfers were not read: ' + text(error && error.message, 'the node did not answer') + '. Press History again to retry.';
          paint('history', historyProps());
        }
      }

      /* ---- a spend from a safe ------------------------------------------------------------------
         Terms (safe, amount, key, time) are fixed by the first approval and carried by the spend link, so every
         council signer signs the same bytes. Each step refuses before anything is signed, naming what failed, what is
         missing and how to fix it (fxn-holdings.mjs spendRefusal); every signature opens the full review first. */
      function refusalText(why) { return why.failure + ' Missing: ' + why.missing + '. To fix: ' + why.remedy + '.'; }
      function linesField() { return views.wallet.querySelector('#account-spend-lines textarea'); }
      function paintSpend() {
        if (!refs.spendHead) return;
        var fixed = !!(spend && spend.atMs);
        views.spendTerms.hidden = fixed; views.spendBoard.hidden = !fixed;
        paint('spendHead', spendHeadProps());
        paint('spendTermsForm', spendTermsFormProps());
        paint('spendFacts', spendTermsFacts());
        paint('spendCouncil', spendCouncilProps());
        var field = linesField(), lines = field ? field.value : '';
        paint('spendLines', spendLinesProps());
        field = linesField(); if (field && field.value !== lines) field.value = lines;   /* a repaint never drops pasted lines */
        paint('spendGo', spendGoProps());
      }
      function setSpendBusy(value) { spendBusy = !!value; paintSpend(); }
      function openSpend(terms) {
        spend = { label: terms.label, to: terms.to || '', amount: terms.amount || '', atMs: terms.atMs || 0, checked: null };
        result('spendStatus', '');
        var field = linesField(); if (field) field.value = '';
        paintSpend();
        openTab('defi');
        showWallet('spend');
        var sf = spendSafe();
        if (holdings.safes && holdings.safes.kind === 'ok' && !sf) result('spendStatus', 'The ' + terms.label + ' safe is not in the ' + holdings.safes.daoId + ' plan. Missing: a safe the plan names. To fix: open the spend from the Safes list.', 'danger');
        if (spend.atMs) spendCheck(false);
      }
      /* ?safe-spend=<label>.<to>.<amount>.<at ms>: a spend link another council signer sent. It opens once the safes are read. */
      var spendFromAddressDone = false;
      function openSpendFromAddress() {
        if (spendFromAddressDone || !holdings.safes || holdings.safes.kind !== 'ok') return;
        var asked = null;
        try { asked = new URLSearchParams(location.search).get('safe-spend'); } catch (_error) { asked = null; }
        if (!asked) return;
        spendFromAddressDone = true;
        var terms = holdingsApi.decodeSpend(asked);
        if (!terms) { openTab('defi'); showWallet('safes'); say('The spend link does not read. Missing: <safe>.<key>.<amount>.<time>. To fix: ask the signer to copy the link again.', 'danger'); return; }
        openSpend(terms);
      }
      async function spendTerms(values) {
        if (!spend || spendBusy) return;
        var who = ArkUI.accountSession.current(), fh = await loadHoldingsModule();
        var typed = String(values && values.amount != null ? values.amount : '').trim(), amount;
        try { amount = fh.parseFxn(typed).toString(); } catch (error) { result('spendStatus', text(error && error.message, 'The amount does not read.'), 'danger'); return; }
        var next = { label: spend.label, to: String(values && values.to || '').trim(), amount: amount, atMs: Date.now() };
        var why = holdings.safes && holdings.safes.kind === 'ok' ? fh.spendRefusal(holdings.safes, next) : { failure: 'The safes are not read.', missing: 'the network\u2019s plan', remedy: 'press Refresh on the wallet' };
        if (why) { result('spendStatus', refusalText(why), 'danger'); return; }
        spend = Object.assign(spend, next, { checked: null });
        await spendApprove(who);
      }
      async function spendApprove() {
        var who = ArkUI.accountSession.current();
        if (!who || !spend || !spend.atMs || spendBusy) return;
        setSpendBusy(true);
        try {
          var dw = await loadWalletModule(), fh = await loadHoldingsModule();
          var line = await fh.approveSpend(dw, { who: who, wire: walletWire(dw), safes: holdings.safes, terms: spend });
          var field = linesField();
          if (field && field.value.indexOf(line) < 0) field.value = [field.value.trim(), line].filter(Boolean).join('\n');
          spend.mine = line;
          await spendCheck(false);
          copyLine(line);
        } catch (error) {
          result('spendStatus', text(error && error.message, 'Not signed.'), /cancel/i.test(error && error.message || '') ? 'drift' : 'danger');
        } finally { setSpendBusy(false); }
      }
      function copyLine(line) {
        var clip = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(line) : Promise.reject(new Error('no clipboard'));
        clip.then(function () { result('spendStatus', 'Approved. Your approval line is copied. Send it, with the spend link, to the signer who sends the spend.', 'trust'); },
          function () { result('spendStatus', 'Approved. Copy your line from the box below and send it to the signer who sends the spend.', 'trust'); });
      }
      async function spendCheck(report) {
        if (!spend || !spend.atMs || !holdings.safes || holdings.safes.kind !== 'ok') return;
        var fh = await loadHoldingsModule(), field = linesField();
        var got = await fh.checkApprovals(holdings.safes, spend, field ? field.value : '');
        spend.checked = got;
        paintSpend();
        var sf = spendSafe();
        if (got.bad.length) result('spendStatus', 'Not counted: ' + got.bad.join('; ') + '. Missing: lines signed for these exact terms. To fix: remove them, and ask that signer to approve from the spend link.', 'danger');
        else if (report) result('spendStatus', got.good.size + ' of ' + (sf ? sf.threshold : '?') + ' approvals check against these terms.', sf && got.good.size >= sf.threshold ? 'trust' : 'drift');
      }
      function spendLink() {
        if (!spend || !spend.atMs) return;
        var link = location.origin + '/account?safe-spend=' + holdingsApi.encodeSpend(spend);
        var clip = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(link) : Promise.reject(new Error('no clipboard'));
        clip.then(function () { result('spendStatus', 'Spend link copied. Each council signer opens it, approves and sends you their line.', 'trust'); },
          function () { result('spendStatus', 'Copy is blocked in this browser. Send this link by hand: ' + link); });
      }
      async function spendSubmit() {
        var who = ArkUI.accountSession.current();
        if (!who || !spend || !spend.atMs || spendBusy) return;
        await spendCheck(false);
        setSpendBusy(true);
        try {
          var dw = await loadWalletModule(), fh = await loadHoldingsModule();
          var done = await fh.submitSpend(dw, { who: who, wire: walletWire(dw), safes: holdings.safes, terms: spend, approvals: spend.checked ? spend.checked.good : new Map() });
          result('spendStatus', 'Sent. The chain moved ' + fh.fxnText(spend.amount) + ' from the ' + spend.label + ' safe. Record ' + done.cid.slice(0, 12) + '\u2026.', 'trust');
          loadWallet();
        } catch (error) {
          result('spendStatus', text(error && error.message, 'Not sent.'), /cancel/i.test(error && error.message || '') ? 'drift' : 'danger');
        } finally { setSpendBusy(false); }
      }

      /* One send at a time; the review modal is opened by the module.
         After any attempt the balance is re-read, since a send may have
         been admitted (and moved real value) even if this page then hit
         an unrelated error reading the result back. */
      async function runSend(values) {
        var who = ArkUI.accountSession.current();
        if (!who || walletBusy) return;
        var amount = String(values && values.amount != null ? values.amount : '').trim();
        var recipient = String(values && values.recipient || '').trim();
        walletBusy = true;
        setSendable(false);
        try {
          var dw = await loadWalletModule(), fh = await loadHoldingsModule();
          await fh.readDecimals(walletWire(dw));
          var units = fh.parseFxn(amount);   // typed FXN -> base units at the node's decimals; refuses with what to type
          // From: one of your keys that can sign on this sign-in (the Public ID in use when none was picked)
          sendFrom = String(values && values.from || '').trim();
          var from = (holdings.keys || []).filter(function (k) { return k.key === sendFrom && k.signer; })[0];
          var reply = await dw.sendFxn({ who: who, wire: walletWire(dw), amount: units, recipient: recipient, signer: from ? from.signer() : dw.signerFor(who), show: fh.fxnText });
          say(dw.describeSendReply(reply, fh.fxnText), reply.kind === 'ok' ? 'drift' : 'danger');
          if (reply.kind === 'ok') {
            // Final only when the chain's lead nodes confirm it (owner rule 2026-10-27); waiting until then.
            dw.watchSendConfirmed(walletWire(dw), reply).then(function (state) {
              if (state === 'confirmed') say('Confirmed by the chain\'s lead nodes. The payment is final.', 'trust');
              else if (state === 'conflict') say('This payment will never be final: a different record from your key was confirmed in its place.', 'danger');
              else say('Still waiting for the chain\'s lead nodes to confirm this payment. Check again later.', 'drift');
            });
            Array.prototype.forEach.call(views.wallet.querySelectorAll('#account-send-form input'), function (input) { input.value = ''; });
            showWallet('home');
          }
        } catch (error) {
          say(walletError(error, 'That transfer could not be completed. Nothing was sent.'), 'danger');
        } finally {
          walletBusy = false;
          paintWalletControls();
          loadWallet();
        }
      }

      function copyText(value, done) {
        if (!value) return;
        var clip = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(value) : Promise.reject(new Error('no clipboard'));
        clip.then(function () { say(done); }, function () { say('Copy is blocked in this browser. Select the text and copy it by hand.'); });
      }
      /* The identity facts' own copy buttons: the label says "Copied" for a moment (or that the browser
         blocked the copy), as the old buttons did. */
      var copyTimer = null;
      function flashCopy(state) {
        copied = state;
        paint('copy', copyProps());
        window.clearTimeout(copyTimer);
        copyTimer = window.setTimeout(function () { copied = ''; paint('copy', copyProps()); }, 1400);
      }
      function copyIdentityField(which) {
        var value = which === 'ghost' ? identityProps(identity).items[0].value : (identity && identity.walletAddress);
        if (!value) return;
        var clip = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(value) : Promise.reject(new Error('no clipboard'));
        clip.then(function () { flashCopy(which); }, function () { flashCopy(which + '-blocked'); });
      }


      function paintContactLists() { ['incoming', 'accepted', 'outgoing', 'found'].forEach(function (kind) { paint(kind, contactListProps(kind)); }); }
      function resetContacts(message) {
        contactsGeneration += 1;
        result('contactsStatus', message || '');
        contactRows.accepted = []; contactRows.incoming = []; contactRows.outgoing = [];
        paintContactLists();
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
        rail.contacts = accepted; rail.invites = incoming;
        syncRail();
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
        if (!silent) result('contactsStatus', 'Checking for invites\u2026');
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
          contactRows.accepted = accepted; contactRows.incoming = incomingPending; contactRows.outgoing = outgoingPending;
          paintContactLists();
          setContactCounts(accepted.length, incomingPending.length, outgoingPending.length);
          if (!silent) result('contactsStatus', '');
        } catch (error) {
          if (token !== contactsGeneration) return;
          result('contactsStatus', 'Contacts are temporarily unavailable. Try again.', 'danger');
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
          paint('contactFacts', contactFactsProps(record, id));
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
        result('contactsStatus', 'Sending invite\u2026');
        try {
          await window.ArkUI.meshDirectory.sendInvite(who, toId);
          result('contactsStatus', 'Invite sent to ' + toId + '.', 'trust');
          loadContacts(true);
        } catch (error) { result('contactsStatus', text(error && error.message, 'Could not send that invite.'), 'danger'); }
      }

      async function searchContacts(query) {
        var who = ArkUI.accountSession.current();
        query = String(query || '').trim();
        if (!who || !query) return;
        result('contactsStatus', 'Searching identities\u2026');
        views.found.hidden = false;
        try {
          var results = await window.ArkUI.meshDirectory.searchIdentities(who, query);
          result('contactsStatus', results.length ? '' : ('No identity matches "' + query + '". Try their identity ID instead.'));
          contactRows.found = results.map(function (found) {
            var id = found.identityId || found.username || found.publicId;
            if (id) { contactProfiles[id] = profileRecord(found) || found; contactStates[id] = 'directory result'; }
            return { id: id, title: found.displayUsername || found.username || found.publicId || id };
          });
          if (!results.length) { contactRows.found = [{ id: query, title: query, meta: 'Exact identity ID', direct: true }]; contactStates[query] = 'unverified identity'; }
          paint('found', contactListProps('found'));
        } catch (error) {
          views.found.hidden = true;
          result('contactsStatus', 'Search is temporarily unavailable. Try again.', 'danger');
        }
      }
      /* one invite, accept, decline or withdraw at a time: a second press while one is running is ignored */
      function inviteFromRow(id) {
        if (contactsWorking || !id) return;
        contactsWorking = true;
        sendInviteTo(id).then(function () { contactsWorking = false; });
      }
      function contactAction(id, method) {
        var who = ArkUI.accountSession.current();
        if (!who || !id || contactsWorking) return;
        contactsWorking = true;
        result('contactsStatus', 'Working\u2026');
        window.ArkUI.meshDirectory[method](who, id).then(function () { contactsWorking = false; result('contactsStatus', ''); loadContacts(); })
          .catch(function (error) { contactsWorking = false; result('contactsStatus', text(error && error.message, 'That action failed.'), 'danger'); });
      }

      /* ---- sign in / create ---------------------------------------------------------------- */
      /* "Create a new identity" -- the same shared wizard defxn-dao's sign-in modal uses
         (js/ark/auth-kit-create-panel.js), not a second copy of it. It is the second tab while signed out. */
      var createPanelHandle = null;
      function createOpened() {
        var holder = views.create.querySelector('[data-account-create]');
        if (!createPanelHandle && window.ArkAuthKitCreatePanel) {
          createPanelHandle = window.ArkAuthKitCreatePanel.mount(holder, {
            actionClass: 'palette-solid', formClass: 'account-contacts-form',
            onDownloaded: function () { openTab('signin'); if (createPanelHandle) createPanelHandle.reset(); },
          });
        } else if (createPanelHandle) { createPanelHandle.reset(); }
      }

      var chooseKitWords = /^(Choose Auth Kit|Unlock Auth Kit|Select Auth Kit|Sign in with your Auth Kit|Select your Auth Kit|Choose FXN ID file)$/;
      function renderIdentity(next) {
        identity = next;
        var unlocked = !!(identity && session.isUnlocked());
        var state = stateOf(identity);
        page.dataset.session = state;
        // A new session state picks its natural view: the wallet once the key is unlocked, the sign-in
        // card otherwise. Later renders keep the view the person chose. The views that exist change with
        // the state, so the tabs are built again then, and only then.
        if (state !== lastSessionState) {
          lastSessionState = state;
          cardHost.replaceChildren(buildTabs(state, unlocked ? 'defi' : (identity ? 'session' : 'signin')));
        }
        identityWrap.hidden = !identity;
        mapWrap.hidden = !!identity || !!nftSample;
        railEl.hidden = !unlocked;
        if (unlocked && window.ArkUI && window.ArkUI.meshDirectory) { loadContacts(false); startContactsPolling(); }
        else { resetContacts(unlocked ? '' : 'Choose your FXN ID file to invite or respond to identities.'); stopContactsPolling(); }
        if (unlocked) loadWallet();
        else resetWallet(identity ? 'Choose your FXN ID file to read your FXN balance.' : undefined);
        renderKeys();
        paint('hero', heroProps(identity));
        paint('identity', identityProps(identity));
        paint('devFacts', developerProps(identity));
        paint('sessionHead', sessionHeadProps(identity));
        paint('ways', waysProps());
        paint('cmsStatus', cmsStatusProps());
        var chooseKit = views.session.querySelector('[data-account-auth] button');
        if (chooseKit && chooseKitWords.test((chooseKit.textContent || '').trim())) {
          chooseKit.textContent = identity && !unlocked ? 'Choose your FXN ID file' : 'Choose FXN ID file';
          chooseKit.setAttribute('aria-label', chooseKit.textContent);
        }
        views.forget.hidden = !identity || unlocked;
        // Set by the mesh-authentication step (onChange), not by this render itself -- ArkUI.accountSession
        // outlives any one mount(), so the message is read fresh here on every render instead of being
        // written through a closure that may be querying a detached page.
        setNotices();
        paint('meshActions', meshActionProps());
        resetMesh(identity ? undefined : 'Sign in to verify your identity on DEFXN.');
      }
      var unsubscribeDomains = ArkUI.localDomains ? ArkUI.localDomains.subscribe(function (names) {
        rail.domains = names.length;
        syncRail();
      }) : function () {};
      var unsubscribe = ArkUI.localIdentity.subscribe(renderIdentity);
      function publishClick(event, link) {
        if (localEditing() || session.isUnlocked() || (ArkUI.cmsSession && ArkUI.cmsSession.isAuthenticated(identity && identity.publicKeyB64))) {
          /* a plain press opens the publishing tools in a window that keeps its opener; a modified press (new tab, download) is the browser's */
          if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); window.open(link.href, '_blank'); }
          return;
        }
        event.preventDefault();
        openTab('session');
        result('cmsStatus', identity
          ? 'Choose your FXN ID file before opening the publishing tools.'
          : 'Choose your FXN ID file before opening the publishing tools.');
        var pin = session.container.querySelector('input:not([type="file"])');
        if (pin && pin.focus) { pin.focus(); return; }
        var unlock = session.container.querySelector('button');
        if (unlock && unlock.click) unlock.click();
        else if (unlock && unlock.focus) unlock.focus();
      }
      page.arkDispose = function () { generation += 1; contactsGeneration += 1; walletGeneration += 1; stopContactsPolling(); window.clearTimeout(copyTimer); if (controller) controller.abort(); if (wire) { wire.close(); wire = null; } unsubscribe(); unsubscribeDomains(); session.container.remove(); if (profileCard) profileCard.close(); if (cardSeal) cardSeal.remove(); };
      return page;
    }
  };
})();

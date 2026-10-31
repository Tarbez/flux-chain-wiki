/* /auth: signing in with your FXN ID file, on the 3D world (js/world/world-host.js). Split out of /account
   (owner, 2026-10-25: the old sign-in there was "totally awful"); built from the owner's five screens in
   docs/design/auth/. One layout for every state: the words on the left, your FXN ID card in 3D standing on the
   kernel in the centre (js/world/auth-stage.js draws it and its glass status panels), and a four-step rail on the
   right (Identity, Verify, Connect, Ready) that lights as you move.

   Every screen is the REAL state of the visitor's identity. Nothing here reads a file, keeps a key or decides a
   check: the one sign-in session does (js/ark/account-session.js: ark-ui's Auth Kit panel in js/admin/auth.js, and
   the saved details in ArkUI.localIdentity). This page reads two facts and draws them:
     the panel's stage and busy flag  (its root's data-stage: choose | unlock | ready, and data-busy)
     the saved identity               (ArkUI.localIdentity.current(), and the session's isUnlocked())
   and maps them to five states:
     none       nothing saved, no file chosen                          1-no-identity.webp
     file       a file is being read, or read and waiting for its PIN  2-file-selected.webp
     verify     the file is opening: the PIN and password are checked  3-verifying.webp
     connected  the saved identity is the one the open signer holds    4-connected.webp
     missing    saved details exist, but no file is open               5-file-missing.webp
   The panel's own form (PIN, password, the v10 icon and Secret Key) is shown in the file state, restyled: it is
   the real control, never a copy of it. The three verify checks are the session's own steps: the file was read
   (its format), it opened and its Master ID was proven (the panel refuses a file whose root it cannot prove), and it
   holds a Public ID that can sign (auth.js refuses to sign without one). The design's percentage is not drawn: the
   session reports no progress, so the running check shows a moving bar with no number.

   REDUCTION TEST (each state, docs/PRODUCT-DESIGN-LAWS.md)
   1 About: opening your FXN ID on this device. 2 Dominant action: none, Choose your FXN ID file; file, Open (the
   panel's own submit); verify, none (it runs by itself); connected, Enter your master account; missing, Choose your
   FXN ID file again. It is the one filled action, in the complement (--secondary), laws 71-77. 3 Know now: whether a
   file is open, and whose. 4 Hidden until asked: what an FXN ID file is (a fold), the identity's keys (on /account).
   5 Repeated elsewhere: the identity's ids are /account's too; this page shows only what signing in proves.
   6 Only because the data has it: network, security level, wallet address (left out when the file has none).
   7 Removable: the rail on a phone. 8 Leaving keeps state: the session outlives the page. 9 Returning: the state is
   read again on mount. 10 If WebGL is missing: the words, the card's facts and the rail still say everything.

   Layout: css/auth.css. */
(function () {
  'use strict';
  var SVG = function (paths, view) { return '<svg viewBox="' + (view || '0 0 24 24') + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>'; };
  var ICON = {
    file: SVG('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/>'),
    arrow: SVG('<path d="M4 12h15M13 6l6 6-6 6"/>'),
    back: SVG('<path d="M20 12H5M11 6l-6 6 6 6"/>'),
    plus: SVG('<path d="M12 5v14M5 12h14"/>'),
    book: SVG('<path d="M3 5.5c3-1.3 6-1.3 9 .6 3-1.9 6-1.9 9-.6v13c-3-1.3-6-1.3-9 .6-3-1.9-6-1.9-9-.6Z"/><path d="M12 6.1v13"/>'),
    box: SVG('<path d="m12 2.8 8.5 4.6v9.2L12 21.2l-8.5-4.6V7.4Z"/><path d="m3.5 7.4 8.5 4.6 8.5-4.6M12 12v9.2"/>'),
    globe: SVG('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"/>'),
    lock: SVG('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    shield: SVG('<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.3 7.5 9.5 4.3-1.2 7.5-4.9 7.5-9.5V6Z"/><path d="m8.8 12 2.2 2.2 4.2-4.4"/>'),
    trash: SVG('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
    user: SVG('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.2-4.2 4.3-6.3 8-6.3s6.8 2.1 8 6.3"/>'),
    copy: SVG('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'),
    warn: SVG('<path d="M12 3.5 2.5 20h19Z"/><path d="M12 10v4.5M12 17.4v.1"/>'),
    check: SVG('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
    info: SVG('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.1"/>'),
    stack: SVG('<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>')
  };
  /* the DEFXN mark (the site's own, js/ark/mark-data.js) for the identity's avatar; drawn as a mask in the theme colour */
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  /* an FXN ID icon: ark-ui's drawn path (24 grid, stroke in the text colour), never an emoji */
  function iconSvg(d) {
    var ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg'), p = document.createElementNS(ns, 'path');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'auth-wglyph'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    p.setAttribute('d', d); s.appendChild(p); return s;
  }
  function icon(name, cls) { var s = el('span', 'auth-ico' + (cls ? ' ' + cls : '')); s.innerHTML = ICON[name]; return s; }
  function routeHref(key) { var entry = ArkUI.pageCatalog[key]; return entry ? ArkUI.route.href(entry.path) : null; }
  function link(key, cls) { var a = el('a', cls); var href = routeHref(key); if (href) { a.href = href; a.dataset.sceneLink = key; } return a; }
  function short(v, head, tail) { v = String(v || ''); return v.length > head + tail + 1 ? v.slice(0, head) + '…' + v.slice(-tail) : v; }
  function hexOf(b64) { try { var bin = atob(b64), out = ''; for (var i = 0; i < bin.length; i++) out += bin.charCodeAt(i).toString(16).padStart(2, '0'); return out; } catch (e) { return ''; } }

  /* The rail: four steps, in the design's words. Each state lights them (done / here / waiting) and may say what the
     step is doing now (the line under a step's name). */
  var STEPS = [['Identity', 'Choose your FXN ID file'], ['Verify', 'Check the file opens and signs'], ['Connect', 'Sign in to the DEFXN network'], ['Ready', 'Your identity opens the grid']];
  var RAIL = {
    none: { at: 0, lines: {} },
    file: { at: 1, lines: { 1: 'Reading the file on this device' } },
    verify: { at: 1, lines: { 1: 'Checking the PIN, password and Master ID' } },
    connected: { at: 3, done: 4, lines: { 0: 'Your FXN ID file is open', 1: 'The file opened and signs', 2: 'Signed in on this tab' } },
    missing: { at: 1, done: 1, warn: 1, lines: { 0: 'Saved identity details found', 1: 'The file must be chosen again first' } },
    create: { at: 0, lines: { 0: 'Making your FXN ID file' } },
    words: { at: 0, lines: { 0: 'Writing down your words' } },
    saved: { at: 0, done: 0, lines: { 0: 'Your new file is saved. Choose it' } }
  };
  /* a failure lights its step as stopped (the steps before it done) */
  function failRail(step, line) { var lines = {}; lines[step] = line; return { at: step, done: step, warn: 1, lines: lines }; }
  var TITLES = {
    none: ['No identity', 'loaded.'], file: ['FXN ID file', 'selected.'], verify: ['Verifying', 'identity.'],
    connected: ['Identity', 'connected.'], missing: ['FXN ID file', 'missing.'],
    create: ['Create your', 'identity.'], words: ['Save your', 'Emergency Kit.'], saved: ['FXN ID file', 'saved.']
  };
  var LEDES = {
    none: 'No FXN ID file is open on this device. Choose your FXN ID file to sign in to the DEFXN network.',
    file: 'This device reads your FXN ID file. The file stays here and is never uploaded. Each step asks for one thing that opens it.',
    verify: 'This device checks your FXN ID file. Your identity shows when every check passes.',
    connected: 'Your FXN ID is open on this tab. You can now sign in to DEFXN sites and the network.',
    missing: 'This device saved your identity details, but no FXN ID file is open. Choose the file again to sign in.',
    create: 'This device makes your new FXN ID file. Pick a name and a PIN. You type the PIN each time you open the file.',
    words: 'Write both on paper. Together they bring your identity back. Then save the file.',
    saved: 'Your new FXN ID file is in your downloads. Choose it now to sign in.'
  };
  /* FAILURE STATES (owner, 2026-10-25: "also add failure states", with a sheet of 25). A failure screen shows only
     when that failure really happened: a refusal the sign-in session reports, with its stable code (AuthKitError,
     ark-ui flux-auth; read through session.error(), never matched on its words), or an event this page sees itself
     (offline, signed out, details forgotten, a kept sign-in that would not reopen). The session's own words are shown
     as the reason. Sheet screens with no source of truth today are not drawn: an unsupported file version (it shares
     its code with an incomplete file), wrong network, chain not found, chain incomplete, chain head conflict, resolver
     missing, resolver incompatible, session expired, session revoked, wallet unavailable, resources failed. */
  var FAIL = {
    type: { codes: ['auth-kit.html-page', 'auth-kit.not-json'], title: ['Unsupported', 'file type.'], step: 1, main: 'another',
      lede: 'The chosen file is not an FXN ID file. An FXN ID file ends in .auth.fxn.' },
    unreadable: { codes: ['auth-kit.undecodable'], title: ['Cannot read', 'file.'], step: 1, main: 'another',
      lede: 'This device could not read the chosen file. It is too large, or it is not an FXN ID file.' },
    corrupt: { codes: ['auth-kit.incomplete', 'auth-kit.malformed-material'], title: ['File is', 'corrupted.'], step: 1, main: 'another',
      lede: 'The chosen file is incomplete or damaged. Choose another copy of your FXN ID file.' },
    key: { codes: ['auth-kit.decrypt-failed', 'auth-kit.pin-policy', 'auth-kit.secret-key-required', 'auth-kit.secret-key-invalid', 'auth-kit.secret-key-mismatch', 'auth-kit.icon-required'],
      title: ['Wrong PIN', 'or password.'], step: 1, main: 'retry', lede: 'The file did not open with what you typed. Check the PIN and password, then try again.' },
    factors: { codes: ['auth-kit.gate-wrong-factors'], title: ['Something', 'did not match.'], step: 1, main: 'retry',
      lede: 'The gate checked your PIN, password, key word and icon, and one of them did not match. After 3 wrong tries it locks for a day.' },
    locked: { codes: ['auth-kit.gate-locked'], title: ['Identity', 'locked.'], step: 1, main: 'another',
      lede: 'Too many wrong tries. The gate that holds part of this identity’s key has locked it.' },
    signature: { codes: ['auth-kit.root-mismatch', 'auth-kit.identity-mismatch', 'auth-kit.secret-malformed'], title: ['Invalid', 'signature.'], step: 1, main: 'another',
      lede: 'The file opened, but its Master ID does not prove the identity it names. The file was changed or damaged.' },
    gate: { codes: ['auth-kit.gate-unreachable'], title: ['Network', 'unavailable.'], step: 2, main: 'retry',
      lede: 'The gate that holds part of this identity’s key did not answer. Check your connection, then try again.' },
    refused: { codes: ['auth-kit.gate-refused', 'auth-kit.gate-missing'], title: ['Verification', 'failed.'], step: 1, main: 'another',
      lede: 'The gate refused to open this identity.' },
    other: { codes: [], title: ['Sign-in', 'failed.'], step: 1, main: 'another', lede: 'The sign-in stopped with the reason below.' }
  };
  function failKindOf(code) { for (var k in FAIL) if (FAIL[k].codes.indexOf(code) >= 0) return k; return 'other'; }
  /* the page's own events */
  var EVENTS = {
    offline: { title: ['Identity verified.', 'Network offline.'], step: 2, lede: 'Your FXN ID is open on this tab, but this device is offline. The network cannot be reached now.' },
    restore: { title: ['Saved sign-in', 'not available.'], step: 0, lede: 'This browser kept your sign-in, but it could not be opened, so the browser deleted it. Choose your FXN ID file to sign in again.' },
    cleared: { title: ['Saved identity', 'cleared.'], step: 0, lede: 'Your saved identity details are gone from this device. Your FXN ID file is not changed.' },
    ended: { title: ['Connection', 'ended.'], step: 0, lede: 'You signed out. Your FXN ID file is closed on this tab.' }
  };
  var EXPLAIN = 'An FXN ID file (.auth.fxn) holds the keys that sign for you. It stays on this device and is never uploaded. Your PIN and password open it. Your recovery words bring it back if you lose the file.';

  ArkUI.pageModules.auth = {
    mount: function (host) {
      var session = ArkUI.openAccountSession();
      var page = el('section', 'world-page auth-world');
      page.setAttribute('aria-labelledby', 'auth-title');
      /* the frame the 3D is fitted to (world-host.js frame()): the open room between the words and the rail. It comes
         first in the page, because the sign-in panel's own root also carries a data-stage attribute. */
      var stage = el('div', 'auth-stage'); stage.setAttribute('data-stage', ''); stage.setAttribute('aria-hidden', 'true');
      page.appendChild(stage);
      /* the DEFXN mark for the identity's avatar (js/ark/mark-data.js, which the world loads) */
      function markVar() { if (window.DEFXN_MARK) page.style.setProperty('--auth-mark', 'url("' + window.DEFXN_MARK + '")'); }
      markVar(); if (!window.DEFXN_MARK && window.ArkWorldHost && window.ArkWorldHost.whenReady) window.ArkWorldHost.whenReady(markVar);

      /* ---- the words ---- */
      var words = el('div', 'auth-words rise'); words.setAttribute('data-ui', '');
      var eyebrow = el('p', 'auth-eyebrow mono'); eyebrow.appendChild(el('i')); eyebrow.appendChild(el('b', 'dash')); eyebrow.appendChild(document.createTextNode('FXN ID · Sign in'));
      var title = el('h1'); title.id = 'auth-title'; var t1 = el('b'), t2 = el('span'); title.appendChild(t1); title.appendChild(t2);
      var lede = el('p', 'auth-lede');
      var body = el('div', 'auth-body');
      words.appendChild(eyebrow); words.appendChild(title); words.appendChild(lede); words.appendChild(body);
      page.appendChild(words);

      /* ---- the rail ---- */
      var rail = el('ol', 'auth-rail rise'); rail.dataset.rise = 'side'; rail.setAttribute('aria-label', 'Sign-in steps');
      var railItems = STEPS.map(function (s, i) {
        var li = el('li', 'auth-step'); var dot = el('span', 'auth-step-dot'); dot.innerHTML = ICON.check;
        var txt = el('div', 'auth-step-words'); txt.appendChild(el('small', 'mono', '0' + (i + 1))); txt.appendChild(el('b', null, s[0])); var line = el('span', 'auth-step-line', s[1]); txt.appendChild(line);
        li.appendChild(dot); li.appendChild(txt); rail.appendChild(li);
        return { li: li, line: line, base: s[1] };
      });
      page.appendChild(rail);

      /* the panel lives in this page while it is mounted (/account takes it back when it mounts); hidden except in the
         file state, where its form is the page's form */
      var panelSlot = el('div', 'auth-panel-slot'), panelHold = el('div', 'auth-panel-hold');
      panelHold.hidden = true; panelHold.appendChild(panelSlot); page.appendChild(panelHold);
      panelSlot.appendChild(session.container);
      var fileName = '';
      /* the chosen file's name, read in the capture phase: the panel's own listener empties the input right after */
      function onPick(event) { var t = event.target; if (t && t.type === 'file' && t.files && t.files[0]) fileName = t.files[0].name; }
      session.container.addEventListener('change', onPick, true);
      function panel() { return session.container.querySelector('[data-ark-auth="panel"]'); }
      function act(id) { var p = panel(), b = p && p.querySelector('[data-action="' + id + '"]'); if (b) b.click(); else if (id === 'import') { var f = p && p.querySelector('input[type="file"]'); if (f) f.click(); } }
      /* ---- THE CREATE WIZARD: a new v10 FXN ID, made on this device (owner, 2026-10-25: "a multi step instead of one
         packed one", and the FXN ID upgrade: key word, icon, Secret Key, Master ID / Public ID). One question per step:
         name, PIN, password, key word, icon, recovery words. The file is made by the sign-in bundle's createFxnId
         (scripts/auth-entry.js over fxn-auth's createAuthKitV10, the one writer): it reads the site's gate committee,
         makes the file, adds the first Public ID, and gives each gate node its piece of the Master ID Secret Key. Then
         the page shows the Emergency Kit once (the Master ID recovery phrase and the Master ID Secret Key) and saves the
         file. The icon list is ark-ui's FXN_ID_ICONS, never a copy. The PIN rule said here is the writer's own rule,
         told a step earlier; the writer still checks it. Each step builds the 3D card further (auth-stage.js 'create'). */
      var ICONS = (window.ArkAdminAuth && ArkAdminAuth.FXN_ID_ICONS) || [];
      /* the gate committee a new FXN ID is enrolled with: the devnet committee (2 of 3 at gate.defxn.com), a byte copy of
         flux/devnet-deploy-2026-10-23/gate/gate.committee in fxn-auth's own grammar. In assets/, so every host serves it. */
      var COMMITTEE_URL = '/assets/gate.committee';
      var CSTEPS = [
        { key: 'name', title: ['Name your', 'identity.'], lede: 'This name is for you. Sites see your Public ID, which this file makes next.', label: 'Name', input: { type: 'text', name: 'displayName', max: 80, auto: 'nickname' } },
        { key: 'pin', title: ['Pick a', 'PIN.'], lede: 'You type this PIN each time you open the file. Use 8 to 12 digits, or 6 or 7 digits with a password.', label: 'PIN', input: { type: 'password', name: 'pin', mode: 'numeric', auto: 'new-password', hint: '8–12 digits' } },
        { key: 'password', title: ['Add a', 'password.'], lede: 'A password adds a second lock to the file. It is optional with a PIN of 8 digits or more.', label: 'Password', input: { type: 'password', name: 'password', auto: 'new-password' }, optional: true },
        { key: 'word', title: ['Choose a', 'key word.'], lede: 'A key word is one more thing only you know. The gate asks for it before it releases your Secret Key.', label: 'Key word', input: { type: 'password', name: 'word', max: 128, auto: 'off' }, optional: true },
        { key: 'icon', title: ['Pick your', 'icon.'], lede: 'Pick one of nine icons. You pick it again each time you sign in, so remember it.', label: 'Icon' },
        { key: 'words', title: ['Choose your', 'recovery words.'], lede: 'Your Master ID recovery phrase brings your identity back if you lose the file. More words are harder to guess.', label: 'Recovery words' }
      ];
      var creating = false, cphase = 'ask', made = null, cstep = 0, cdir = 1, cerr = '', cvals = null;
      function resetCreate() { cphase = 'ask'; made = null; cstep = 0; cdir = 1; cerr = ''; cvals = { displayName: '', pin: '', password: '', word: '', icon: '', wordCount: '24' }; }
      resetCreate();
      function sendCreate3d() { var h = window.ArkWorldHost; if (h && h.ready && h.select) h.select({ s: 'create', b: cstep, ic: cvals.icon }); }
      function startCreate() {
        resetCreate(); creating = !!(window.ArkAdminAuth && ArkAdminAuth.createFxnId); happened = ''; keptSeen = true; paint(true);
        /* the gate file is needed at the end: ask for it now, so no one answers six questions for a file this site
           cannot make (createFxnId reads the same file and says the same thing) */
        fetch(COMMITTEE_URL, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); }).catch(function (error) {
          if (!creating) return;
          cerr = 'This site has no FXN ID gate file yet, so it cannot make a new FXN ID. Missing: the gate file at ' + COMMITTEE_URL + ' (' + error.message + ').';
          paint(true);
        });
      }
      function cstepError(i) {
        var v = cvals;
        if (i === 0 && !v.displayName.trim()) return 'Type a name.';
        if (i === 1 && !/^\d{6,12}$/.test(v.pin)) return 'Use 6 to 12 digits.';
        if (i === 2 && v.pin.length < 8 && !v.password) return 'A PIN of ' + v.pin.length + ' digits needs a password.';
        if (i === 4 && !ICONS.some(function (c) { return c.id === v.icon; })) return 'Pick one of the nine icons.';
        return '';
      }
      function cgo(i) {
        if (i > cstep) { var e = cstepError(cstep); if (e) { cerr = e; paint(true); return; } }
        cerr = ''; cdir = i >= cstep ? 1 : -1; cstep = Math.max(0, Math.min(CSTEPS.length - 1, i)); paint(true);
      }
      function csubmit() {
        for (var i = 0; i < CSTEPS.length - 1; i++) { var e = cstepError(i); if (e) { cstep = i; cerr = e; paint(true); return; } }
        cphase = 'making'; cerr = ''; paint(true);
        ArkAdminAuth.createFxnId({ committeeUrl: COMMITTEE_URL, displayName: cvals.displayName.trim(), pin: cvals.pin, password: cvals.password, word: cvals.word, icon: cvals.icon, wordCount: Number(cvals.wordCount) === 12 ? 12 : 24 })
          .then(function (result) { made = result; cphase = 'kit'; cvals.pin = cvals.password = cvals.word = ''; paint(true); },
            function (error) { cphase = 'ask'; cerr = error.message; if (/PIN/i.test(error.message)) cstep = 1; paint(true); });
      }
      function saveFile() {
        if (!made) return;
        var blob = new Blob([made.text], { type: 'application/vnd.flux.auth-kit' }), a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = made.fileName; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        made = { fileName: made.fileName, publicId: made.publicId, gate: made.gate };   /* the kit's secrets leave memory once the file is saved */
        cphase = 'saved'; paint(true);
      }
      /* the 3D's build step: each answered question, then making */
      function cresult() { return cphase === 'making' ? { error: false, text: 'making' } : null; }
      function createStage() { return cphase === 'kit' ? 'words' : cphase === 'saved' ? 'saved' : 'create'; }
      function choose() { creating = false; happened = ''; if (state === 'restore') keptSeen = true; var p = panel(); if (p && p.getAttribute('data-stage') === 'unlock') act('clear'); act('import'); }

      /* the network this browser is set to (js/ark/dense-wire-wallet.mjs, the header's control) */
      var network = { label: '', host: '' };
      import('/js/ark/dense-wire-wallet.mjs').then(function (m) {
        var url = m.resolveWireUrl(), known = (m.KNOWN_NETWORKS || []).filter(function (n) { return n.url === url; })[0];
        try { network = { label: known ? known.label : 'Custom network', host: new URL(url).host }; } catch (e) { network = { label: known ? known.label : 'Custom network', host: '' }; }
        if (page.isConnected) paint(true);
      }, function () {});

      /* ---- the PVA card (owner, 2026-10-25: "that card could be the NFT PVA card itself"). The 3D card wears the
         visitor's real PVA: their PVA on the chain once an identity is saved (DefxnSkinSite.chainCard, verified), or a
         review sample named in the address (?skin-sample=). The NFT session draws it (js/ark/profile-card.js over
         js/nft/card.js) into a box off screen; DefxnCard.toCanvas makes its front one picture; the box is then closed.
         No PVA, or one that does not load: the plain FXN ID card, and the reason goes to the console. ---- */
      var pvaFor = null, pvaFace = null;
      function face(canvas) {
        pvaFace = canvas;
        var h = window.ArkWorldHost;
        if (h && h.whenReady) h.whenReady(function () { if (h.scene && h.scene.authFace) h.scene.authFace(page.isConnected ? pvaFace : null); });
      }
      function findPva() {
        if (!window.DefxnSkinSite || !window.DefxnProfileCard || !window.ArkWorldHost || !window.ArkWorldHost.owns()) return;
        var who = ArkUI.localIdentity.current(), sample = DefxnProfileCard.fromAddress(), want = sample ? 's' + sample : who ? 'id' + who.identityId : '';
        if (want === pvaFor) return;
        pvaFor = want;
        if (!want) { face(null); return; }
        (sample ? Promise.resolve(sample) : DefxnSkinSite.chainCard()).then(function (rec) {
          if (!rec || pvaFor !== want) return null;
          var box = el('div', 'auth-pva-box'); box.setAttribute('aria-hidden', 'true'); document.body.appendChild(box);
          var opened = DefxnProfileCard.open(box, rec);
          return opened.ready.then(function (cardEl) { return cardEl && window.DefxnCard ? DefxnCard.toCanvas(cardEl, 1) : null; })
            .then(function (c) { opened.close(); box.remove(); return c; }, function (error) { opened.close(); box.remove(); throw error; });
        }).then(function (c) { if (pvaFor === want) face(c); }, function (error) {
          if (pvaFor === want) face(null);
          console.info('[auth] Your PVA card did not load (' + error.message + '). The 3D shows the plain FXN ID card.');
        });
      }

      /* ---- the state ---- */
      var state = '', verifyHold = 0, checks = null, opening = false;
      /* failures: the refusal now shown (and the one the visitor put away with Try again), and the page's own event */
      var failErr = null, failKind = '', dismissed = '', happened = '', wasOpen = false, keptSeen = false;
      function read() {
        var p = panel(), stageName = p ? p.getAttribute('data-stage') : 'choose', busy = p ? p.getAttribute('data-busy') === 'true' : false;
        var saved = ArkUI.localIdentity.current(), open = !!(saved && session.isUnlocked());
        var notice = p && p.querySelector('[data-ark-auth="notice"][data-tone="error"]');
        var err = session.error ? session.error() : null, errKey = err ? err.code + '|' + err.message : '';
        if (busy) dismissed = '';
        if (open) { creating = false; happened = ''; wasOpen = true; return navigator.onLine === false ? 'offline' : 'connected'; }
        if (wasOpen) { wasOpen = false; if (!happened) happened = 'ended'; }
        if (err && !busy && stageName !== 'ready' && errKey !== dismissed) { failErr = err; failKind = failKindOf(err.code); creating = false; return 'fail'; }
        if (creating && !busy && stageName === 'choose') return createStage();
        if (stageName === 'unlock' && busy) { opening = true; return 'verify'; }
        /* opened, but not admitted as a saved identity: the third check failed (or is still settling) */
        if (stageName === 'ready') return 'verify';
        if (stageName === 'unlock') { if (opening && notice) checks = { file: 'pass', open: 'fail', id: 'wait', why: notice.textContent }; opening = false; return 'file'; }
        if (busy) return 'file';
        if (happened) return happened;
        if (!saved && !keptSeen && session.keptRefused && session.keptRefused()) return 'restore';
        return saved ? 'missing' : 'none';
      }
      function railPaint(s, step) {
        var r = RAIL[s] || failRail(step || 0, s === 'fail' ? 'Stopped: ' + FAIL[failKind].title.join(' ').replace(/\.$/, '').toLowerCase() : s === 'offline' ? 'This device is offline' : s === 'restore' ? 'The kept sign-in was deleted' : s === 'cleared' ? 'Saved details removed' : 'Signed out');
        railItems.forEach(function (it, i) {
          var done = i < (r.done != null ? r.done : r.at), here = i === r.at && !(r.done > i);
          it.li.classList.toggle('is-done', done); it.li.classList.toggle('is-here', here); it.li.classList.toggle('is-warn', !!r.warn && i === r.at);
          it.line.textContent = r.lines[i] || it.base;
        });
        if (s === 'connected') railItems[3].li.classList.add('is-here');
      }

      /* ---- the bodies of the five states ---- */
      function card(key, cls) {   /* a secondary action: an outlined card with an icon, a name, a line and an arrow */
        var spec = CARDS[key], a = spec.route ? link(spec.route, 'auth-card ' + (cls || '')) : el('button', 'auth-card ' + (cls || ''));
        if (!spec.route) { a.type = 'button'; }
        a.appendChild(icon(spec.icon));
        var w = el('span', 'auth-card-words'); w.appendChild(el('b', null, spec.name)); if (spec.line) w.appendChild(el('small', null, spec.line)); a.appendChild(w);
        if (spec.arrow !== false) a.appendChild(icon('arrow', 'auth-card-go'));
        if (spec.run) a.addEventListener('click', spec.run);
        a.dataset.card = key;
        return a;
      }
      var explainOpen = false;
      function toggleExplain() { explainOpen = !explainOpen; paint(true); }
      var CARDS = {
        create: { icon: 'plus', name: 'Create a new identity', line: 'Make a new FXN ID file', run: function () { startCreate(); } },
        back: { icon: 'back', name: 'Back to sign in', line: 'Choose a file you already have', run: function () { creating = false; paint(true); } },
        what: { icon: 'book', name: 'What is an FXN ID file?', line: 'What it holds and where it stays', run: function () { toggleExplain(); } },
        deploy: { icon: 'box', name: 'Deploy a bundle', line: 'Run a network bundle', route: 'bundledeployer' },
        domains: { icon: 'globe', name: 'Your domains', line: 'Your names on the network', route: 'account/domains' },
        another: { icon: 'back', name: 'Choose another file', line: 'Pick a different FXN ID file', run: function () { fileName = ''; choose(); } },
        forget: { icon: 'trash', name: 'Forget saved identity details', arrow: false, run: function () { session.signOut(); ArkUI.localIdentity.clear(); happened = 'cleared'; paint(true); } }
      };
      function explain() { var p = el('p', 'auth-explain tp-panel', EXPLAIN); p.id = 'auth-explain'; p.hidden = !explainOpen; return p; }
      function wireExplain(node) { node.querySelectorAll('.auth-card[data-card="what"]').forEach(function (c) { c.setAttribute('aria-expanded', String(explainOpen)); c.setAttribute('aria-controls', 'auth-explain'); }); }
      function main(label, run, cls) {
        var b = el('button', 'auth-main ' + (cls || '')); b.type = 'button';
        b.appendChild(icon(cls === 'is-big' ? 'file' : 'arrow')); b.appendChild(el('span', null, label)); if (cls === 'is-big') b.appendChild(icon('arrow', 'auth-main-go'));
        b.addEventListener('click', run); return b;
      }
      function note(iconName, text, cls) { var p = el('p', 'auth-note ' + (cls || '')); p.appendChild(icon(iconName)); p.appendChild(el('span', null, text)); return p; }
      function grid(keys, cls) { var g = el('div', 'auth-cards ' + (cls || '')); keys.forEach(function (k) { g.appendChild(card(k)); }); return g; }
      function facts(rows) {
        var dl = el('dl', 'auth-facts');
        rows.filter(function (r) { return r[1]; }).forEach(function (r) {
          var d = el('div'); d.appendChild(el('dt', null, r[0])); var dd = el('dd', 'mono-val', r[2] || r[1]); dd.title = r[1]; d.appendChild(dd);
          if (r[3] === 'plain') { dd.className = 'is-plain'; d.appendChild(el('span')); dl.appendChild(d); return; }   /* a statement, not a value to copy */
          var c = el('button', 'auth-copy'); c.type = 'button'; c.innerHTML = ICON.copy; c.setAttribute('aria-label', 'Copy ' + r[0].toLowerCase());
          c.addEventListener('click', function () { if (navigator.clipboard) navigator.clipboard.writeText(r[1]).then(function () { c.classList.add('is-done'); setTimeout(function () { c.classList.remove('is-done'); }, 1200); }, function () {}); });
          d.appendChild(c); dl.appendChild(d);
        });
        return dl;
      }
      function tile(iconName, name, line, cls) { var t = el('div', 'auth-tile ' + (cls || '')); t.appendChild(icon(iconName)); var w = el('span'); w.appendChild(el('b', null, name)); if (line) w.appendChild(el('small', null, line)); t.appendChild(w); return t; }
      function idHead(eyebrowText, name, badge, tone) {
        var h = el('div', 'auth-id-head');
        var av = el('span', 'auth-avatar'); h.appendChild(av);
        var w = el('div'); w.appendChild(el('p', 'mono auth-id-eyebrow', eyebrowText)); w.appendChild(el('p', 'auth-id-name', name)); h.appendChild(w);
        var b = el('span', 'auth-badge is-' + tone); b.appendChild(tone === 'warn' ? icon('warn') : el('i')); b.appendChild(document.createTextNode(badge)); h.appendChild(b);
        return h;
      }

      function bodyNone() {
        var f = document.createDocumentFragment();
        var wrap = el('div', 'auth-big-wrap'); wrap.appendChild(main('Choose your FXN ID file', choose, 'is-big')); f.appendChild(wrap);
        f.appendChild(note('lock', 'Your FXN ID file stays on this device. It is never uploaded.'));
        f.appendChild(grid(['create', 'what', 'deploy', 'domains'], 'is-four'));
        f.appendChild(explain());
        return f;
      }
      function bodyFile() {
        var f = document.createDocumentFragment(), p = panel(), busy = p && p.getAttribute('data-busy') === 'true';
        var row = el('div', 'auth-file tp-panel'); row.appendChild(icon('file')); row.appendChild(el('b', 'auth-file-name', fileName || 'Your FXN ID file'));
        var st = el('span', 'auth-file-state' + (busy ? ' is-busy' : ''), busy ? 'Reading on this device…' : 'Read · locked'); if (busy) st.insertBefore(el('i', 'auth-spin'), st.firstChild); else st.insertBefore(icon('lock'), st.firstChild);
        row.appendChild(st); f.appendChild(row);
        if (!busy) f.appendChild(panelSlot);   /* the lede above already says the file stays here (law 1: said once) */   /* the panel's PIN, password (and v10 factors) and its Open button */
        f.appendChild(grid(['another', 'what'], 'is-two'));
        f.appendChild(explain());
        return f;
      }
      function bodyVerify() {
        var f = document.createDocumentFragment(), c = checks || { file: 'pass', open: 'run', id: 'wait' };
        var list = el('ol', 'auth-checks tp-panel'), info = session.fileInfo ? session.fileInfo() : null, v10 = !!(info && info.needsSecretKey);
        /* a v10 file (the FXN ID upgrade) opens in more steps: the gate checks the four factors (PIN, password, key word,
           icon) and releases the Master ID Secret Key, or the Emergency Kit supplies it; then the file opens. The
           session reports them as one step, so they pass or run together, and the first that fails is named. */
        var ROWS = v10 ? [
          ['file', 'File format', 'An FXN ID file, version ' + info.version + '.', 'An FXN ID file, version ' + info.version + '.'],
          ['open', 'Four gate factors', 'The gate checks your PIN, password, key word and icon…', 'The PIN, password, key word and icon were right.'],
          ['open', 'Secret Key released', 'Waiting for the gate, or your Emergency Kit…', 'Your Master ID Secret Key was released.', 1],
          ['open', 'Master ID proven', 'Opening the file and proving its Master ID…', 'The file opened. Its Master ID is proven.', 1],
          ['id', 'Public ID can sign', 'Checking for a Public ID that can sign…', 'It holds a Public ID that can sign.']
        ] : [
          ['file', 'File format', 'An FXN ID file.', 'An FXN ID file' + (info ? ', version ' + info.version : '') + '.'],
          ['open', 'Master ID proven', 'Opening the file with your PIN and password, and proving its Master ID…', 'The file opened. Its Master ID is proven.'],
          ['id', 'Public ID can sign', 'Checking for a Public ID that can sign…', 'It holds a Public ID that can sign.']
        ];
        ROWS.forEach(function (row) {
          var s = c[row[0]]; if (row[4] && s === 'run') s = 'wait';
          var li = el('li', 'auth-check is-' + s);
          var mark = el('span', 'auth-check-mark'); if (s === 'pass') mark.innerHTML = ICON.check; else if (s === 'fail') mark.innerHTML = ICON.warn; li.appendChild(mark);
          var w = el('div'); w.appendChild(el('b', null, row[1]));
          w.appendChild(el('small', null, s === 'pass' ? row[3] : s === 'fail' ? (c.why || 'This check failed.') : s === 'run' ? row[2] : 'Waits for the check above.'));
          if (s === 'run') { var bar = el('span', 'auth-bar'); bar.appendChild(el('i')); w.appendChild(bar); }
          li.appendChild(w); list.appendChild(li);
        });
        f.appendChild(list);
        /* the remedy the third check names: add a Public ID to the open file (auth.js addPublicId), then save the new
           file, since the old one does not hold it. A file made by the create wizard has none yet. */
        var who = session.current();
        if (c.id === 'fail' && who && who.addPublicId) {
          var fix = el('div', 'auth-actions');
          fix.appendChild(main('Add a Public ID and save the file', function () {
            this.disabled = true;
            who.addPublicId({ label: 'Main', walletCount: 1 }).then(function () {
              var blob = new Blob([who.fileText()], { type: 'application/vnd.flux.auth-kit' }), a = document.createElement('a');
              a.href = URL.createObjectURL(blob); a.download = fileName || ((who.fileDisplayName || 'fxn-id').toLowerCase().replace(/[^a-z0-9._]+/g, '-') + '.auth.fxn');
              a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
              paint(true);
            }, function (error) { checks = { file: 'pass', open: 'pass', id: 'fail', why: error.message }; paint(true); });
          }));
          f.appendChild(fix);
        }
        f.appendChild(note('lock', 'Your identity shows only when every check passes.'));
        var g = grid(['another', 'what'], 'is-two'); f.appendChild(g);
        f.appendChild(note('shield', 'Checks run on this device. Nothing is uploaded.', 'is-quiet'));
        f.appendChild(explain());
        return f;
      }
      function bodyConnected() {
        var f = document.createDocumentFragment(), who = ArkUI.localIdentity.current() || {};
        var box = el('div', 'auth-id tp-panel');
        box.appendChild(idHead('Your Public ID', who.displayName || who.identityId, 'Connected', 'live'));
        var tiles = el('div', 'auth-tiles');
        tiles.appendChild(tile('check', 'Connected', 'FXN ID open', 'is-live'));
        tiles.appendChild(tile('stack', 'Identity on this device', 'Never uploaded'));
        box.appendChild(tiles);
        var key = hexOf(who.publicKeyB64);
        /* names (owner, 2026-10-25): sites see and check the Public ID; the Master ID stays in the file and signs nothing here */
        box.appendChild(facts([['Public ID key', key, short(key, 14, 8)], ['Wallet address', who.walletAddress, short(who.walletAddress, 8, 6)],
          ['Master ID', 'Kept in your FXN ID file. It never signs here.', null, 'plain'], ['Security level', who.securityProfile]]));
        /* the session, from the panel's own "keep me signed in" line when it says one, else this tab only */
        var keep = session.container.querySelector('.ark-session-keep p, [data-ark-auth="keep"] p');
        var kept = keep && keep.textContent && /until/.test(keep.textContent) ? keep.textContent.replace(/^Kept on this browser /, 'Kept ').replace(/\.$/, '') : 'On this tab only';
        var foot = el('div', 'auth-id-foot');
        [['Session', 'Active', kept, 'is-live'], ['Network', network.host ? network.label : '', network.host], ['Environment', 'Web browser', location.host]].forEach(function (c) {
          if (!c[1]) return; var d = el('div', c[3] || ''); d.appendChild(el('small', 'mono', c[0])); d.appendChild(el('b', null, c[1])); if (c[2]) d.appendChild(el('span', null, c[2])); foot.appendChild(d);
        });
        box.appendChild(foot);
        f.appendChild(box);
        var acts = el('div', 'auth-actions');
        var enter = link('account', 'auth-main'); enter.appendChild(icon('arrow')); enter.appendChild(el('span', null, 'Enter your master account'));
        acts.appendChild(enter); acts.appendChild(card('deploy', 'is-slim')); acts.appendChild(card('domains', 'is-slim'));
        f.appendChild(acts);
        return f;
      }
      function bodyMissing() {
        var f = document.createDocumentFragment(), who = ArkUI.localIdentity.current() || {};
        var box = el('div', 'auth-id tp-panel is-missing');
        box.appendChild(idHead('Saved Public ID found', who.displayName || who.identityId, 'File missing', 'warn'));
        var tiles = el('div', 'auth-tiles');
        tiles.appendChild(tile('user', 'Saved identity', who.displayName || ''));
        if (network.label) tiles.appendChild(tile('globe', 'Network', network.label));
        if (who.securityProfile) tiles.appendChild(tile('shield', 'Security level', who.securityProfile));
        box.appendChild(tiles);
        var key = hexOf(who.publicKeyB64);
        box.appendChild(facts([['Public ID key', key, short(key, 14, 8)], ['Master ID', 'Kept in your FXN ID file, which is not open.', null, 'plain']]));
        box.appendChild(note('info', 'Your identity details are saved on this device. You are not signed in.', 'is-in'));
        f.appendChild(box);
        var acts = el('div', 'auth-actions');
        acts.appendChild(main('Choose your FXN ID file again', choose));
        f.appendChild(acts);
        f.appendChild(grid(['forget', 'what', 'create'], 'is-three'));
        f.appendChild(explain());
        return f;
      }
      function bodyWizard() {
        var f = document.createDocumentFragment(), st = CSTEPS[cstep], making = cphase === 'making';
        var dots = el('ol', 'auth-wsteps'); dots.setAttribute('aria-label', 'Step ' + (cstep + 1) + ' of ' + CSTEPS.length);
        dots.style.gridTemplateColumns = 'repeat(' + CSTEPS.length + ', minmax(0, 1fr))';
        CSTEPS.forEach(function (c, i) {
          var li = el('li', i < cstep ? 'is-done' : i === cstep ? 'is-here' : '');
          var b = el('button'); b.type = 'button'; b.disabled = making || i > cstep; b.appendChild(el('i')); b.appendChild(el('span', null, c.label));
          b.addEventListener('click', function () { cgo(i); }); li.appendChild(b); dots.appendChild(li);
        });
        f.appendChild(dots);
        var pane = el('form', 'auth-wpane tp-panel'); pane.noValidate = true;
        if (making) {
          var m = el('div', 'auth-wmaking'); m.appendChild(el('i', 'auth-spin')); m.appendChild(el('span', null, 'Making your FXN ID on this device…'));
          pane.appendChild(m);
        } else if (st.input) {
          var lab = el('label', 'auth-wfield'); lab.appendChild(el('span', null, st.label + (st.optional ? ' (optional)' : '')));
          var inp = el('input'); inp.type = st.input.type; inp.name = st.input.name; inp.value = cvals[st.input.name]; inp.autocomplete = st.input.auto || 'off'; inp.spellcheck = false;
          if (st.input.max) inp.maxLength = st.input.max; if (st.input.mode) inp.inputMode = st.input.mode; if (st.input.hint) inp.placeholder = st.input.hint;
          inp.addEventListener('input', function () { cvals[st.input.name] = inp.value; });
          lab.appendChild(inp); pane.appendChild(lab);
        } else {
          var opts = st.key === 'icon' ? ICONS.map(function (c) { return [c.id, c.path, c.label]; }) : [['24', '24 words', 'The stronger choice'], ['12', '12 words', 'Quicker to write down']];
          var field = st.key === 'icon' ? 'icon' : 'wordCount';
          var pick = el('div', 'auth-wchoice' + (st.key === 'icon' ? ' is-icons' : '')); pick.setAttribute('role', 'radiogroup'); pick.setAttribute('aria-label', st.label);
          opts.forEach(function (o) {
            var b = el('button', 'auth-wopt'); b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(cvals[field] === o[0]));
            if (st.key === 'icon') { b.appendChild(iconSvg(o[1])); b.appendChild(el('small', null, o[2])); b.setAttribute('aria-label', o[2]); }
            else { b.appendChild(el('b', null, o[1])); b.appendChild(el('small', null, o[2])); }
            b.addEventListener('click', function () {
              cvals[field] = o[0]; pick.querySelectorAll('.auth-wopt').forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); });
              if (field === 'icon') sendCreate3d();   /* the 3D card shows the icon you pick */
            });
            pick.appendChild(b);
          });
          pane.appendChild(pick);
        }
        if (cerr && !making) { var er = el('p', 'auth-werr', cerr); er.setAttribute('role', 'alert'); pane.appendChild(er); }
        var nav = el('div', 'auth-wnav');
        if (!making) {
          var last = cstep === CSTEPS.length - 1, skip = st.optional && !cvals[st.input.name];
          var go = el('button', 'auth-main'); go.type = 'submit'; go.appendChild(el('span', null, last ? 'Create my FXN ID' : skip ? 'Skip' : 'Next')); go.appendChild(icon('arrow'));
          var back = el('button', 'auth-wback'); back.type = 'button'; back.appendChild(icon('back')); back.appendChild(el('span', null, cstep ? 'Back' : 'Back to sign in'));
          back.addEventListener('click', function () { if (cstep) cgo(cstep - 1); else { creating = false; paint(true); } });
          nav.appendChild(back); nav.appendChild(go);
          pane.addEventListener('submit', function (event) { event.preventDefault(); if (last) csubmit(); else cgo(cstep + 1); });
          if (st.optional) pane.addEventListener('input', function () { go.firstChild.textContent = cvals[st.input.name] ? 'Next' : 'Skip'; });
        }
        pane.appendChild(nav);
        f.appendChild(pane);
        f.appendChild(note('lock', 'The file is made on this device. Nothing is uploaded.'));
        return f;
      }
      /* the Emergency Kit, shown once: the Master ID recovery phrase and the Master ID Secret Key, and what the gate took */
      function bodyKit() {
        var f = document.createDocumentFragment(), kit = made && made.emergencyKit;
        if (!kit) return f;
        var box = el('div', 'auth-kit tp-panel');
        box.appendChild(el('p', 'mono auth-kit-label', 'Master ID recovery phrase'));
        var grid2 = el('ol', 'auth-kit-words');
        kit.mnemonic.split(' ').forEach(function (w, i) { var li = el('li'); li.appendChild(el('small', null, String(i + 1))); li.appendChild(el('strong', null, w)); grid2.appendChild(li); });
        box.appendChild(grid2);
        box.appendChild(el('p', 'mono auth-kit-label', 'Master ID Secret Key'));
        box.appendChild(el('p', 'auth-kit-key', kit.secretKey));
        var g = made.gate, held = g.enrolled.length >= g.threshold;
        var gl = el('p', 'auth-kit-gate' + (held ? '' : ' is-bad'));
        gl.appendChild(icon(held ? 'shield' : 'warn'));
        gl.appendChild(el('span', null, held
          ? 'The gate holds your Secret Key: ' + g.enrolled.length + ' of ' + g.nodes + ' nodes, any ' + g.threshold + ' release it. You sign in with your PIN, password, key word and icon.'
          : 'The gate did not take your Secret Key (' + g.failed.map(function (x) { return x.nodeId + ': ' + x.reason; }).join(', ') + '). Until it does, the file opens only with the Secret Key above.'));
        box.appendChild(gl);
        f.appendChild(box);
        var ok = el('label', 'auth-kit-confirm'); var cb = el('input'); cb.type = 'checkbox'; ok.appendChild(cb); ok.appendChild(el('span', null, 'I wrote down the phrase and the Secret Key, on paper'));
        var acts = el('div', 'auth-actions auth-kit-acts'); var save = main('Save FXN ID file', saveFile); save.disabled = true; acts.appendChild(ok); acts.appendChild(save); f.appendChild(acts);
        cb.addEventListener('change', function () { save.disabled = !cb.checked; });
        f.appendChild(note('lock', 'Anyone with these can open your Master ID. This page shows them once. Never photograph or paste them.'));
        return f;
      }
      function bodyCreate() {
        var s = createStage();
        if (s === 'create') return bodyWizard();
        if (s === 'words') return bodyKit();
        var f = document.createDocumentFragment();
        var box = el('div', 'auth-fail tp-panel'), head = el('div', 'auth-fail-head'); head.appendChild(icon('check'));
        var w = el('div'); w.appendChild(el('b', null, made ? made.fileName : 'Your FXN ID file'));
        w.appendChild(el('small', null, made && made.publicId ? 'Your first Public ID is ready: ' + (made.publicId.name || made.publicId.label || short(made.publicId.key, 10, 6)) + '.' : 'Saved to your downloads.'));
        head.appendChild(w); box.appendChild(head); f.appendChild(box);
        var acts = el('div', 'auth-actions'); acts.appendChild(main('Choose your FXN ID file', choose)); f.appendChild(acts);
        return f;
      }
      function bodyFail() {
        var f = document.createDocumentFragment(), s = state, ev = EVENTS[s], def = s === 'fail' ? FAIL[failKind] : null, who = ArkUI.localIdentity.current();
        var box = el('div', 'auth-fail tp-panel');
        var head = el('div', 'auth-fail-head'); head.appendChild(icon(s === 'cleared' || s === 'ended' ? 'info' : 'warn'));
        var name = s === 'fail' ? (fileName || 'Your FXN ID file') : who ? (who.displayName || who.identityId) : s === 'restore' ? 'Kept sign-in' : 'This device';
        var w = el('div'); w.appendChild(el('b', null, name));
        var why = s === 'fail' ? failErr && failErr.message : s === 'offline' ? 'This device reports no network connection.' : s === 'restore' ? 'The kept sign-in did not match its FXN ID file, or could not be decrypted.' : s === 'cleared' ? 'No identity details are saved on this device.' : 'No FXN ID file is open on this tab.';
        if (why) w.appendChild(el('small', null, why));
        var d = failErr && failErr.detail;
        if (s === 'fail' && d && d.triesLeft != null) w.appendChild(el('small', 'auth-fail-more', d.triesLeft + (d.triesLeft === 1 ? ' try left.' : ' tries left.')));
        if (s === 'fail' && d && d.lockedUntil) w.appendChild(el('small', 'auth-fail-more', 'Locked until ' + new Date(d.lockedUntil).toLocaleString() + '.'));
        head.appendChild(w); box.appendChild(head);
        if (s === 'offline' && who) box.appendChild(facts([['Identity', who.identityId, short(who.identityId, 14, 8)], ['Network', network.label]]));
        f.appendChild(box);
        var acts = el('div', 'auth-actions'), how = def ? def.main : s === 'offline' ? 'recheck' : 'choose';
        if (how === 'retry') acts.appendChild(main('Try again', function () { dismissed = failErr ? failErr.code + '|' + failErr.message : ''; paint(true); var i = panelSlot.querySelector('input'); if (i) i.focus(); }));
        else if (how === 'recheck') acts.appendChild(main('Check the connection again', function () { paint(true); }));
        else if (how === 'another') acts.appendChild(main('Choose another file', function () { fileName = ''; choose(); }));
        else acts.appendChild(main('Choose your FXN ID file', choose));
        if (how === 'retry') acts.appendChild(card('another', 'is-slim'));
        else if (s === 'offline') { var enter = link('account', 'auth-card is-slim'); enter.appendChild(icon('arrow')); var ew = el('span', 'auth-card-words'); ew.appendChild(el('b', null, 'Enter your master account')); enter.appendChild(ew); acts.appendChild(enter); }
        else acts.appendChild(card(s === 'ended' || s === 'cleared' ? 'create' : 'what', 'is-slim'));
        f.appendChild(acts);
        f.appendChild(note('shield', 'Checks run on this device. Nothing is uploaded.', 'is-quiet'));
        f.appendChild(explain());
        return f;
      }
      var BODY = { fail: bodyFail, offline: bodyFail, restore: bodyFail, cleared: bodyFail, ended: bodyFail, create: bodyCreate, words: bodyCreate, saved: bodyCreate, none: bodyNone, file: bodyFile, verify: bodyVerify, connected: bodyConnected, missing: bodyMissing };

      /* ---- paint: the words, the body, the rail and the 3D follow the state ---- */
      var holdTimer = 0, painted = '';
      function paint(force) {
        if (!page.isConnected && painted) return;
        var s = read();
        /* the checks: the first passes once a file is read; the second runs while it opens; on success the third is
           decided by whether the session admitted the identity (a file with no Public ID is refused there) */
        if (s === 'verify') {
          var p = panel();
          if (p && p.getAttribute('data-stage') === 'ready') {
            var who = session.current();
            checks = who && who.publicKeyB64 ? { file: 'pass', open: 'pass', id: 'pass' } : who ? { file: 'pass', open: 'pass', id: 'fail', why: 'This FXN ID has no Public ID, so it cannot sign. Add one below, then keep the new file it saves.' } : { file: 'pass', open: 'pass', id: 'run' };
          } else if (!checks || checks.open !== 'fail') checks = { file: 'pass', open: 'run', id: 'wait' };
        }
        /* a file that just opened shows its three passed checks for a moment before the identity: they are true */
        if (s === 'connected' && (state === 'verify' || verifyHold > performance.now())) {
          if (!verifyHold) { verifyHold = performance.now() + 1400; checks = { file: 'pass', open: 'pass', id: 'pass' }; clearTimeout(holdTimer); holdTimer = setTimeout(function () { paint(true); }, 1450); }
          if (verifyHold > performance.now()) s = 'verify'; else verifyHold = 0;
        }
        if (s !== 'verify' && s !== 'file') checks = s === 'connected' ? checks : null;
        findPva();
        var cres = s === 'create' ? cresult() : null;
        var key = s + '|' + (s === 'create' ? cstep + '|' + cerr + '|' + (cres ? cres.error + cres.text : '') : '') + '|' + failKind + '|' + (failErr ? failErr.message : '') + '|' + JSON.stringify(checks) + '|' + fileName + '|' + network.label;
        if (!force && key === painted) return;
        var changed = s !== state; painted = key; state = s;
        page.dataset.state = s;
        if (!page.style.getPropertyValue('--auth-mark')) markVar();
        var words = s === 'fail' ? FAIL[failKind] : EVENTS[s] ? EVENTS[s] : s === 'create' ? CSTEPS[cstep] : { title: TITLES[s], lede: LEDES[s] };
        /* a v10 file asks for two more factors: say so (the panel's form shows their fields) */
        var fi = s === 'file' && session.fileInfo ? session.fileInfo() : null;
        if (fi && fi.needsSecretKey) words = { title: words.title, lede: 'This device reads your FXN ID file. It is never uploaded. Type your PIN, password and key word, and pick your icon.' };
        page.dataset.fail = s === 'fail' ? failKind : '';
        t1.textContent = words.title[0]; t2.textContent = words.title[1]; lede.textContent = words.lede;
        if (changed) explainOpen = false;
        var keepFocus = document.activeElement && body.contains(document.activeElement) && document.activeElement.closest('.auth-panel-slot');
        panelHold.appendChild(panelSlot);   /* back to its hidden holder before the body is rebuilt: the file input stays in the page */
        body.textContent = '';
        body.appendChild(BODY[s]());
        wireExplain(body);
        var moveIn = changed || s === 'create';
        if (moveIn && !document.hidden && body.animate && !(ArkUI.prefersReducedMotion && ArkUI.prefersReducedMotion())) {
          /* motion only (never a fade): a new state rises in; a wizard step slides in from the side it comes from */
          var from = s === 'create' && !changed ? 'translateX(' + (cdir * 28) + 'px)' : 'translateY(12px)';
          var pane = s === 'create' && !changed ? body.querySelector('.auth-wpane') : body;
          if (pane) pane.animate([{ transform: from }, { transform: 'none' }], { duration: 460, easing: 'cubic-bezier(.22,.7,.18,1)' });
        }
        if (s === 'create') { var fi = body.querySelector('.auth-wpane input, .auth-wopt[aria-checked="true"]'); if (fi) fi.focus({ preventScroll: true }); }
        if (keepFocus) { var again = body.querySelector('.auth-panel-slot input'); if (again) again.focus(); }
        railPaint(s, words.step);
        if (s === 'create') railItems[0].line.textContent = CSTEPS[cstep].label + ' \u00b7 ' + (cstep + 1) + ' of ' + CSTEPS.length;
        var host2 = window.ArkWorldHost;
        /* the 3D has three looks for these screens: a refused file, an open identity with no network, a closed one */
        var s3 = s === 'fail' ? 'fail' : s === 'restore' || s === 'cleared' || s === 'ended' ? 'ended' : s;
        var sel = { s: s3, net: network.label, b: s === 'create' ? (cres && !cres.error ? CSTEPS.length : cstep) : 0, ic: creating ? cvals.icon : '' };
        if (host2 && host2.select) { if (host2.ready) host2.select(sel); else host2.state(sel); }
        if (changed) {
          if (false && body.animate && !(ArkUI.prefersReducedMotion && ArkUI.prefersReducedMotion())) body.animate([{ transform: 'translateY(12px)' }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.22,.7,.18,1)' });   /* motion only: a body that has not started moving is still readable */
        }
      }
      /* the panel repaints its root on every session change: watch its stage, busy flag and notice */
      var watch = new MutationObserver(function () { paint(false); });
      watch.observe(session.container, { attributes: true, attributeFilter: ['data-stage', 'data-busy'], subtree: true, childList: true });
      var stopId = ArkUI.localIdentity.subscribe(function () { if (page.isConnected || !painted) paint(false); });
      if (window.ArkWorldHost && window.ArkWorldHost.state) window.ArkWorldHost.state({ s: read(), net: network.label });
      function onNet() { paint(false); }
      window.addEventListener('online', onNet); window.addEventListener('offline', onNet);
      paint(true);
      page.arkDispose = function () { window.removeEventListener('online', onNet); window.removeEventListener('offline', onNet); var h = window.ArkWorldHost; if (h && h.scene && h.scene.authFace) h.scene.authFace(null); watch.disconnect(); if (typeof stopId === 'function') stopId(); clearTimeout(holdTimer); session.container.removeEventListener('change', onPick, true); };

      /* the CMS's insertion point for reusable blocks (js/content/components.js): empty, and out of the layout */
      var anchor = el('div', 'world-insert'); anchor.setAttribute('data-ark-insert', 'main'); page.appendChild(anchor);
      host.appendChild(page);
      return page;
    }
  };
})();

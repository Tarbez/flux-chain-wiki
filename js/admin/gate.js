/* =====================================================================
   THE GATE (admin.html)
   ---------------------------------------------------------------------
   The admin is locked until an identity passes three steps, shown as a
   ladder so a person can see where they are, not just that they are stuck:

     01 IDENTITY   choose the recovery file (.auth.flx) and unlock it here
                   (js/admin/auth.js). The root key lives in a handle in
                   this page's memory and nowhere else.
     02 ACCESS     this page asks the host for a challenge, signs it with
                   that key, and the host checks the signature and that
                   this identity owns the site. Neither the recovery
                   phrase nor the key itself ever leaves this page.
     03 CODE       a one-time code from an authenticator app (TOTP). The
                   first time an identity signs in it enrolls one, which
                   also needs a short code printed in the terminal window
                   the host is running in (`onNotice` in
                   scripts/lib/admin-session.mjs) — so opening someone's
                   recovery file and PIN is not enough on its own.

                   TEMPORARILY SKIPPED: the host currently signs in with
                   `otpEnabled: false` (scripts/publish-host.mjs), because
                   the Ark Pin browser extension this admin is meant to be
                   used through cannot prompt for or submit a TOTP code
                   yet. `/api/session/login` then returns `{done: true}`
                   and this page opens the editor straight after step 2 --
                   see `finishSignIn` below. Re-enable step 3 in the host
                   once the extension supports OTP; nothing about it was
                   removed here, only bypassed.

   Steps 1+2 return a short-lived ticket, not a session: nothing opens
   until step 3 turns it into one. Wrong codes count against the identity
   and lock it out for a wait that doubles each time; the page shows that
   countdown rather than letting someone hammer the box.

   Once all three pass, the editor (admin-app.html) is shown in a
   same-origin frame inside this page. It reaches the identity through
   `window.parent.ArkGate`, so the key never has to leave this page.
   Signing out ends the session. A reload does NOT: the host's session
   cookie (idles out at 30 minutes, dies at 12 hours regardless, per
   scripts/lib/admin-session.mjs) is what the host actually trusts, so a
   reload that finds it still valid reopens the editor immediately instead
   of asking for the recovery file again. What a reload DOES always drop is
   the identity's signing key, which only ever lives in this page's memory
   and is never sent anywhere -- so browsing and editing keep working
   across a reload, but Publish needs the recovery file unlocked again
   (`ArkGate.reauthenticate`, called from admin.js when it finds no
   identity in memory). This is not a weaker session: it is the same
   session, with the one thing that can never be cached dropped as before.
   ===================================================================== */
(function () {
  'use strict';

  var account = window.ArkUI && window.ArkUI.localIdentity;
  var bridge = window.ArkUI && window.ArkUI.cmsSession;
  var securityEpoch = 0, suppressForget = false, authorizedKey = null;
  var LOGIN_PREFIX = 'flux-chain-admin-login/v1|';
  var STEPS = [
    { key: 'kit', num: '01', label: 'Identity' },
    { key: 'access', num: '02', label: 'Access' },
    { key: 'code', num: '03', label: 'Code' }
  ];
  var $ = function (id) { return document.getElementById(id); };
  var hosted = (location.protocol === 'http:' || location.protocol === 'https:') && !!window.ArkAdminAuth;

  function h(tag, props) {
    var node = document.createElement(tag);
    Object.keys(props || {}).forEach(function (key) {
      if (key === 'text') node.textContent = props[key];
      else if (key === 'class') node.className = props[key];
      else if (key.slice(0, 2) === 'on') node.addEventListener(key.slice(2), props[key]);
      else if (props[key] !== false && props[key] !== null) node.setAttribute(key, props[key] === true ? '' : props[key]);
    });
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) node.appendChild(arguments[i]);
    return node;
  }
  function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }

  var kitContainer = h('div', { id: 'gateAuth' });
  var auth = null, frame = null, identity = null, busy = false;
  var pendingWho = null, ticket = null, otpInfo = null, lockTimer = null;

  function say(text, tone) { var el = $('gateStatus'); el.textContent = text || ''; el.dataset.tone = tone || ''; el.title = text || ''; }
  function note(text, tone) { var el = $('gateNote'); el.textContent = text || ''; el.dataset.tone = tone || ''; }

  async function api(path, body) {
    var init = body === undefined ? { method: 'GET' } : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
    var response;
    try { response = await fetch(path, init); }
    catch (e) { throw new Error('Cannot reach the publish host. Double-click "Flux Chain Admin.command" and open the page it opens.'); }
    var data = await response.json().catch(function () { return { ok: false, error: 'The publish host sent something that is not JSON.' }; });
    if (!response.ok || !data.ok) { var error = new Error(data.error || ('The publish host refused (' + response.status + ').')); error.detail = data; throw error; }
    return data;
  }
  function remedyLine(error) {
    return error.detail && error.detail.remedy && error.message.indexOf(error.detail.remedy) < 0 ? 'To fix: ' + error.detail.remedy : '';
  }
  function loopbackEquivalentHost(host) {
    var mine = location.host.split(':');
    var theirs = String(host || '').split(':');
    var localNames = { '127.0.0.1': true, localhost: true };
    return mine[1] && theirs[1] && mine[1] === theirs[1] && localNames[mine[0]] && localNames[theirs[0]];
  }

  /* ---- the step ladder --------------------------------------------- */
  function renderSteps(activeKey, doneKeys) {
    var list = $('gateSteps'); list.textContent = '';
    STEPS.forEach(function (step) {
      var state = doneKeys.indexOf(step.key) >= 0 ? 'done' : step.key === activeKey ? 'active' : '';
      list.appendChild(h('li', { 'data-state': state },
        h('b', { text: step.num }), h('span', { class: 'step-label', text: step.label })));
    });
  }

  /* ---- copy-to-clipboard, with a fallback for a browser that refuses the Clipboard API ---- */
  function copyButton(text, label) {
    var btn = h('button', { type: 'button', class: 'copy-btn', text: label });
    btn.addEventListener('click', async function () {
      var ok = false;
      try { await navigator.clipboard.writeText(text); ok = true; }
      catch (e) {
        try {
          var field = h('textarea', {}); field.value = text; field.style.position = 'fixed'; field.style.opacity = '0';
          document.body.appendChild(field); field.select(); ok = document.execCommand('copy'); field.remove();
        } catch (e2) { ok = false; }
      }
      btn.dataset.copied = String(ok);
      btn.textContent = ok ? 'Copied' : 'Select and copy';
      setTimeout(function () { btn.dataset.copied = 'false'; btn.textContent = label; }, 1800);
    });
    return btn;
  }

  /* ---- six-box code entry: numeric, auto-advancing, paste-aware --------------------------- */
  function digitBoxes(count, onFilled) {
    var wrap = h('div', { class: 'otp-digits' });
    var boxes = [];
    for (var i = 0; i < count; i++) {
      var box = h('input', { type: 'text', inputmode: 'numeric', pattern: '[0-9]*', maxlength: '1', autocomplete: 'one-time-code', 'aria-label': 'Digit ' + (i + 1) + ' of ' + count });
      (function (index) {
        box.addEventListener('input', function () {
          box.value = box.value.replace(/\D/g, '').slice(-1);
          if (box.value && boxes[index + 1]) boxes[index + 1].focus();
          if (boxes.every(function (b) { return b.value; })) onFilled();
        });
        box.addEventListener('keydown', function (event) {
          if (event.key === 'Backspace' && !box.value && boxes[index - 1]) boxes[index - 1].focus();
        });
        box.addEventListener('paste', function (event) {
          var digits = (event.clipboardData.getData('text') || '').replace(/\D/g, '').split('');
          if (!digits.length) return;
          event.preventDefault();
          for (var k = 0; k < boxes.length; k++) boxes[k].value = digits[k] || '';
          (boxes[Math.min(digits.length, boxes.length) - 1] || boxes[0]).focus();
          if (boxes.every(function (b) { return b.value; })) onFilled();
        });
      })(i);
      boxes.push(box); wrap.appendChild(box);
    }
    return {
      element: wrap,
      value: function () { return boxes.map(function (b) { return b.value; }).join(''); },
      clear: function () { boxes.forEach(function (b) { b.value = ''; }); boxes[0].focus(); },
      focus: function () { boxes[0].focus(); }
    };
  }

  /* ---- steps 1+2: sign the host's challenge, then its ownership check. Callable again with the
     SAME already-open identity when a ticket expires, with no need to reopen the recovery file. ---- */
  async function beginTicket(who) {
    var epoch = securityEpoch;
    var challenge = await api('/api/session/challenge', {});
    var tail = typeof challenge.message === 'string' && challenge.message.indexOf(LOGIN_PREFIX) === 0 ? challenge.message.slice(LOGIN_PREFIX.length) : '';
    var host = tail.slice(0, tail.indexOf('|'));
    if (!tail || (host !== location.host && !loopbackEquivalentHost(host))) throw new Error('The publish host sent a login challenge this page will not sign.');
    if (epoch !== securityEpoch) return;
    var signature = await who.sign(challenge.message);
    if (epoch !== securityEpoch) return;
    var made = await api('/api/session/login', { publicKeyB64: who.publicKeyB64, nonce: challenge.nonce, signature: signature, label: who.displayName });
    if (epoch !== securityEpoch) { await api('/api/session/logout', {}); return; }
    // otpEnabled: false on the host: the session is already open (its cookie is already set), no step 3.
    if (made.done) {
      busy = false;   // done, same as the OTP path: a sign-out fired from inside the editor a moment later must not be swallowed by the guard above
      await finishSignIn(made);
      return;
    }
    ticket = made.ticket; otpInfo = made.otp;
    renderOtpStep();
  }

  /* ---- the shared "signed in" tail, whether it took three steps or (OTP disabled) two ---- */
  async function finishSignIn(made) {
    var epoch = securityEpoch;
    identity = pendingWho;
    authorizedKey = made.publicKeyB64 || (pendingWho && pendingWho.publicKeyB64);
    var access = await api('/api/cms/access');
    if (epoch !== securityEpoch) return;
    if (!access.authorized) { showAccessDenied(access); return; }
    var when = made.lastSignIn ? new Date(made.lastSignIn).toLocaleString() : null;
    renderSteps('code', ['kit', 'access', 'code']);
    say('Signed in', 'ok');
    $('gateHeading').textContent = made.enrolled ? 'Authenticator added.' : 'Welcome back.';
    note(made.enrolled ? 'This authenticator now signs in as this identity. Keep it: there is no other way in.'
      : when ? 'Last signed in ' + when + '. If that was not you, sign out and consider it compromised.' : 'Opening the editor...', 'ok');
    $('gateBody').textContent = '';
    await sleep(1100);
    if (epoch === securityEpoch) openEditor();
  }

  /* Retries beginTicket with the identity already open. A lockout that has not actually lifted yet
     (client/server clock skew at the boundary) re-enters the countdown instead of forcing a full restart. */
  function retryTicket(contextNote) {
    beginTicket(pendingWho).catch(function (error) {
      if (error.detail && error.detail.retryAfterSeconds) { runLockout(error.detail.retryAfterSeconds, contextNote); return; }
      onFatalError(error);
    });
  }

  /* ---- a countdown for a lockout, then an automatic retry with the same identity ------------ */
  function runLockout(seconds, contextNote) {
    if (lockTimer) clearInterval(lockTimer);
    var remaining = seconds;
    renderSteps('code', []);
    say('Locked out', 'error');
    var body = $('gateBody'); body.textContent = '';
    var line = h('p', { class: 'gate-countdown' }, document.createTextNode(contextNote + ' Try again in '), h('strong', { text: String(remaining) }), document.createTextNode(remaining === 1 ? ' second.' : ' seconds.'));
    body.appendChild(line);
    note('', '');
    lockTimer = setInterval(function () {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(lockTimer); lockTimer = null;
        say('Trying again...', '');
        retryTicket(contextNote);
        return;
      }
      line.replaceChildren(document.createTextNode(contextNote + ' Try again in '), h('strong', { text: String(remaining) }), document.createTextNode(remaining === 1 ? ' second.' : ' seconds.'));
    }, 1000);
  }

  /* ---- step 3: the OTP form, built for whichever mode the ticket carries -------------------- */
  function renderOtpStep() {
    renderSteps('code', ['kit', 'access']);
    say(otpInfo.mode === 'enroll' ? 'Set up your authenticator' : 'Enter your code', '');
    $('gateHeading').textContent = otpInfo.mode === 'enroll' ? 'Add an authenticator.' : 'Verify it’s you.';
    $('gateLead').textContent = otpInfo.mode === 'enroll'
      ? 'This identity has no authenticator app enrolled yet. Add it below — after this, it is the only way to sign in as this identity.'
      : 'Enter the current code from the authenticator app you enrolled for this identity.';
    var body = $('gateBody'); body.textContent = '';
    note('', '');

    var digits = digitBoxes(6, submit);
    var hostInput = null;

    if (otpInfo.mode === 'enroll') {
      var groups = otpInfo.secret.match(/.{1,4}/g).join(' ');
      body.appendChild(h('div', { class: 'otp-setup' },
        h('h2', { text: 'Scan or enter manually' }),
        h('p', { text: 'Add this identity to an authenticator app (Google Authenticator, 1Password, Authy, Aegis, or similar), using the setup key or the setup link.' }),
        h('div', { class: 'otp-key' }, h('code', { text: groups }), copyButton(otpInfo.secret, 'Copy key')),
        h('div', { class: 'otp-key' }, h('code', { text: otpInfo.uri.length > 64 ? otpInfo.uri.slice(0, 61) + '...' : otpInfo.uri }), copyButton(otpInfo.uri, 'Copy link'))));
      hostInput = h('input', { type: 'text', inputmode: 'numeric', class: 'otp-hostcode', maxlength: '8', placeholder: '00000000', 'aria-label': 'Setup code from the host window' });
      body.appendChild(h('div', { class: 'otp-field' },
        h('span', { text: 'Setup code, from the terminal window running the admin' }), hostInput));
    }
    body.appendChild(h('div', { class: 'otp-field' }, h('span', { text: 'Authenticator code' }), digits.element));

    var submitBtn = h('button', { type: 'button', class: 'gate-btn', text: otpInfo.mode === 'enroll' ? 'Finish setup' : 'Continue', disabled: true });
    var restart = h('button', { type: 'button', class: 'gate-btn quiet', text: 'Use a different identity' });
    restart.addEventListener('click', function () { if (auth) auth.signOut(); });
    body.appendChild(h('div', { class: 'gate-actions' }, submitBtn, restart));
    body.appendChild(h('p', { id: 'gateAttempts', class: 'gate-attempts' }));

    function refreshEnabled() {
      var ready = digits.value().length === 6 && (otpInfo.mode !== 'enroll' || (hostInput.value.replace(/\D/g, '').length === 8));
      submitBtn.disabled = !ready || busy;
    }
    digits.element.addEventListener('input', refreshEnabled);
    if (hostInput) hostInput.addEventListener('input', function () { hostInput.value = hostInput.value.replace(/\D/g, '').slice(0, 8); refreshEnabled(); });
    submitBtn.addEventListener('click', submit);
    digits.focus();

    async function submit() {
      if (busy) return;
      var code = digits.value();
      if (code.length !== 6 || (otpInfo.mode === 'enroll' && hostInput.value.length !== 8)) return;
      busy = true; submitBtn.disabled = true; say('Checking...', '');
      try {
        var made = await api('/api/session/otp', { ticket: ticket, code: code, hostCode: hostInput ? hostInput.value : undefined });
        busy = false;   // done with this step; a sign-out fired from inside the editor a moment later must not be swallowed by the guard above
        ticket = null; otpInfo = null;
        await finishSignIn(made);
      } catch (error) {
        busy = false;
        var status = error.detail && (error.status || (error.message.indexOf('429') >= 0 ? 429 : null));
        if (error.detail && error.detail.retryAfterSeconds) { runLockout(error.detail.retryAfterSeconds, 'Too many wrong codes.'); return; }
        if (/expired or was already used/.test(error.message)) { say('Starting a fresh check...', ''); retryTicket('Too many wrong codes.'); return; }
        digits.clear(); if (hostInput) hostInput.value = '';
        say(error.message, 'error');
        $('gateAttempts').textContent = error.detail && typeof error.detail.attemptsLeft === 'number'
          ? error.detail.attemptsLeft + ' attempt' + (error.detail.attemptsLeft === 1 ? '' : 's') + ' left before a short lock.' : '';
        refreshEnabled();
      }
    }
  }

  function openEditor() {
    if (frame) return;
    frame = document.createElement('iframe');
    frame.id = 'app'; frame.title = 'Flux Protocol admin'; frame.src = 'admin-app.html';
    document.body.appendChild(frame);
    $('gate').hidden = true; document.body.classList.remove('locked');
  }

  function unsavedInEditor() {
    try { return !!(frame && frame.contentWindow.ArkAdminApp && frame.contentWindow.ArkAdminApp.unsaved()); } catch (e) { return false; }
  }

  function showAccessDenied(access) {
    authorizedKey = null;
    renderSteps('access', ['kit']);
    $('gateHeading').textContent = 'Signed in. CMS access not granted.';
    $('gateLead').textContent = access.error || 'This identity does not have CMS permission.';
    $('gateBody').textContent = '';
    $('gateBody').appendChild(h('button',{type:'button',text:'Check CMS access again',onclick:async function(){
      try { var result = await api('/api/cms/access'); if (result.authorized) { authorizedKey = (identity || pendingWho || {}).publicKeyB64; openEditor(); } else showAccessDenied(result); }
      catch(error){say(error.message,'error');}
    }}));
    say('Identity authenticated', 'ok'); note(access.remedy || '');
  }

  function showIdentityStep() {
    var shared = bridge && bridge.sharedSigner();
    var pointer = account && account.current();
    var body = $('gateBody'); body.textContent = '';
    if (shared) {
      $('gateHeading').textContent = 'Check CMS access.';
      $('gateLead').textContent = 'You’re signed in as ' + shared.displayName + '. Your unlocked identity is ready; the host must confirm publishing access.';
      body.appendChild(h('button', {type:'button', text:'Check CMS access', onclick:function () {
        var current = bridge.sharedSigner();
        if (current) onIdentity(current); else showIdentityStep();
      }}));
    } else {
      if (pointer) {
        $('gateHeading').textContent = 'Unlock your identity.';
        $('gateLead').textContent = 'Public details for ' + pointer.displayName + ' are saved. Select your .auth.flx file again and enter its PIN and password if you set one to check CMS access.';
      } else {
        $('gateHeading').textContent = 'Locked.';
        $('gateLead').textContent = 'Sign in with your DeadArk identity to edit or publish this site.';
      }
      body.appendChild(kitContainer);
    }
  }

  async function resetToLocked(message, tone) {
    ++securityEpoch;
    if (lockTimer) { clearInterval(lockTimer); lockTimer = null; }
    if (frame) { frame.remove(); frame = null; }
    document.body.classList.add('locked'); $('gate').hidden = false;
    authorizedKey = null; identity = null; pendingWho = null; ticket = null; otpInfo = null;
    try { await api('/api/session/logout', {}); } catch (e) { /* the session dies with the host anyway */ }
    renderSteps('kit', []);
    $('gateHeading').textContent = 'Locked.';
    $('gateLead').textContent = 'Sign in with your DeadArk identity to edit or publish this site.';
    showIdentityStep();
    say(message || '', tone || ''); note('');
  }

  function onFatalError(error) {
    busy = false;
    say(error.message, 'error'); note(remedyLine(error));
    resetToLocked('', '').then(function () { say(error.message, 'error'); note(remedyLine(error)); });
  }

  async function onIdentity(who) {
    if (busy) return;
    if (!who) { if (identity || pendingWho) await resetToLocked('Signed out.', 'ok'); return; }
    busy = true; pendingWho = who;
    try {
      renderSteps('access', ['kit']);
      say('Confirming with the host...', '');
      $('gateHeading').textContent = 'Confirming access.';
      $('gateLead').textContent = 'Checking that this identity owns this site.';
      $('gateBody').textContent = '';
      await beginTicket(who);
      busy = false;
    } catch (error) {
      busy = false;
      if (error.detail && error.detail.retryAfterSeconds) { pendingWho = who; runLockout(error.detail.retryAfterSeconds, 'Too many attempts.'); return; }
      // Refused at identity or access: nobody is signed in, and there is nothing to retry automatically.
      if (auth) { suppressForget = true; try { auth.signOut(); } finally { suppressForget = false; } }
      await resetToLocked('', '');
      say(error.message, 'error'); note(remedyLine(error));
    }
  }

  /* Bring back the locked screen to unlock the signing key, WITHOUT touching the host's session: used when
     Publish finds no identity in memory (a reload, or straight after opening on an already-valid session). */
  function reauthenticate() {
    if (unsavedInEditor() && !window.confirm('You have unsaved changes. Unlock your identity and lose them?')) return false;
    if (frame) { frame.remove(); frame = null; }
    identity = null;
    document.body.classList.add('locked'); $('gate').hidden = false;
    renderSteps('kit', []);
    $('gateHeading').textContent = 'Unlock to publish.';
    $('gateLead').textContent = 'Your session is still open; choose your recovery file to unlock the signing key publishing needs.';
    $('gateBody').textContent = ''; $('gateBody').appendChild(kitContainer);
    say('', ''); note('');
    return true;
  }

  var localEditor = false;
  window.ArkGate = {
    localDevelopment: function () { return localEditor; },
    identity: function () {
      var shared = bridge && bridge.sharedSigner();
      return shared && shared.publicKeyB64 === authorizedKey ? shared : identity;
    },
    unsaved: unsavedInEditor,
    reauthenticate: reauthenticate,
    signOut: function () {
      if (unsavedInEditor() && !window.confirm('You have unsaved changes. Sign out and lose them?')) return false;
      try {
        var source = window.opener;
        if (source && source.location.origin === location.origin && source.ArkUI && source.ArkUI.accountSession) source.ArkUI.accountSession.signOut();
      } catch (_) {}
      if (account) account.clear();
      if (auth) { suppressForget = true; try { auth.signOut(); } finally { suppressForget = false; } }
      resetToLocked('Signed out.', 'ok').then(function () { if (localEditor) openEditor(); });
      return true;
    }
  };

  renderSteps('kit', []);
  $('gateBody').appendChild(kitContainer);

  if (!hosted) {
    /* opened from disk: there is no host to sign in to, and no editor to show */
    say('', ''); $('gateLead').textContent = 'This copy of the page cannot sign in or edit.';
    $('gateSteps').hidden = true;
    var link = document.createElement('a'); link.href = 'http://127.0.0.1:3437/admin.html'; link.textContent = 'http://127.0.0.1:3437/admin.html';
    $('gateNote').textContent = 'Double-click "Flux Chain Admin.command" in the flux-chain folder, or use the copy served by the host: ';
    $('gateNote').appendChild(link);
    return;
  }

  /* The identity picker is always mounted (reauthenticate needs it live even after the editor has opened),
     but a reload no longer forces a fresh sign-in: if the host's own session cookie is still valid, the
     editor opens immediately and the recovery file is only asked for again when Publish actually needs it. */
  auth = ArkAdminAuth.create({ container: kitContainer, product: 'DEFXN CMS', onChange: function (who) {
    if (who && account) account.set(who);
    if (!who && !suppressForget && (identity || pendingWho)) {
      if (account) account.clear();
      if (bridge) bridge.revoke();
    }
    onIdentity(who);
  } });
  if (account) account.subscribe(function (pointer) {
    var active = identity || pendingWho;
    if ((active && (!pointer || pointer.publicKeyB64 !== active.publicKeyB64)) ||
        (frame && authorizedKey && (!pointer || pointer.publicKeyB64 !== authorizedKey))) {
      suppressForget = true;
      try { auth.signOut(); } finally { suppressForget = false; }
      resetToLocked('The account changed. Unlock the current identity to continue.', '');
    }
    if (!active && !frame) { showIdentityStep(); if (!pointer) { say('', ''); note(''); } }
  });
  var startupEpoch = securityEpoch;
  api('/api/session').then(async function (info) {
    if (startupEpoch !== securityEpoch) return;
    var shared = bridge && bridge.sharedSigner();
    if (info.localDevelopment) { localEditor = true; identity = shared; openEditor(); return; }
    var pointer = account && account.current();
    if (info.authenticated) {
      var access = await api('/api/cms/access');
      if (startupEpoch !== securityEpoch) return;
      if (!access.authorized) { identity = shared; showAccessDenied(access); return; }
      authorizedKey = info.publicKeyB64;
    }
    if (shared) {
      if (info.authenticated && info.publicKeyB64 === shared.publicKeyB64) {
        identity = shared; openEditor();
      } else onIdentity(shared);
    } else if (info.authenticated && (!pointer || pointer.publicKeyB64 === info.publicKeyB64)) openEditor();
    else if (info.authenticated) resetToLocked('Unlock this account to confirm CMS access.', '');
  }).catch(function (error) { say(error.message, 'error'); note(remedyLine(error)); });
})();

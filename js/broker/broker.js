/* =====================================================================
   THE IDENTITY BROKER (broker.html)
   ---------------------------------------------------------------------
   Holds one unlocked identity, in this tab's memory only, and answers
   postMessage requests from *.defxn.com pages that embed this page as a
   popup (js/ark/broker-client.js). Two things keep that safe:

     ALLOWLIST   only an origin that matches ALLOWED_ORIGIN is ever replied
                 to. Everything else is silently ignored -- never answered,
                 never even logged with detail, because a probe shouldn't
                 learn anything from the shape of a refusal either.
     CONSENT     every single sign request is shown through the same
                 <flux-authorization-dialog> js/admin/admin.js now wires for
                 publishing (js/admin/vendor/flux-elements.js), naming the
                 exact requesting origin and the exact bytes. Being on the
                 allowlist lets a site ASK; it never lets a site sign.
     SHARING     a site learns the public key and name only after the person
                 says yes to that exact origin (askToShare). Until 2026-10-23
                 any allowlisted origin got them with no prompt, and the
                 allowlist holds every <label>.defxn.com, where the gateway
                 serves other people's sites. A yes lasts for this tab and
                 this identity only: it is never stored, and unlocking a
                 different identity forgets every yes.
     PUBLIC IDS  (owner, 2026-10-25) a site sees one public id of the identity,
                 never the root. The person picks which one, per site. A site
                 signs only as the public id it was shown. Showing a second
                 public id to the same site warns first: that site could then
                 link the two forever.

   There is no "sign everything from this origin" switch and none should be
   added here -- that would turn the allowlist into the consent, which is
   exactly the shortcut the dialog exists to prevent.
   ===================================================================== */
(function () {
  'use strict';

  var ALLOWED_ORIGIN = /^(https:\/\/([a-z0-9-]+\.)?defxn\.com|https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?)$/;

  if (window.ArkFluxElements) window.ArkFluxElements.defineFluxAuthorizationDialog();

  var who = null;
  var queuedSignRequest = null; /* a {event, data} held while the person unlocks */
  var queuedIdentityRequests = []; /* [event, ...] held while the person unlocks -- see
    handleIdentityRequest's own comment for why this exists and isn't a single slot
    the way queuedSignRequest is. */
  var sharedWith = Object.create(null); /* origin -> public id key: the person said yes to showing
    that public id to that origin, in this tab. Cleared when a different file is opened. */
  var shareQueue = []; /* identity requests from origins with no yes yet, asked one at a time */
  var shareAsking = null; /* the request the share prompt shows now */
  var everReceivedRequest = false; /* has ANY *.defxn.com page ever actually asked
    this tab for anything? Drives the "nothing to do here" notice below -- without
    it, a tab opened by typing the URL directly (no site on the other end ever
    waiting) looks IDENTICAL to one a site's sign-in button opened and is correctly
    waiting to be asked: both just show "Signed in." and nothing else happens,
    which is what actually confused a real person testing this page 2026-10-13. */

  function $(id) { return document.getElementById(id); }
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
  function authorizationDigest(text) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (bytes) {
      return Array.from(new Uint8Array(bytes)).map(function (byte) { return byte.toString(16).padStart(2, '0'); }).join('');
    });
  }
  function hexToB64(hex) { var s = ''; for (var i = 0; i < hex.length; i += 2) s += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16)); return btoa(s); }
  function idByKey(key) { return (who && who.publicIds || []).filter(function (id) { return id.key === key; })[0] || null; }
  /* What a site learns: one public id's key and its name. Never the file's name, which is the same for every id. */
  function publicFields(id) {
    return { publicKeyB64: hexToB64(id.key), displayName: id.name };
  }
  /* The public id a site signs as: the one it was shown, else the current one. */
  function idFor(origin) { return idByKey(sharedWith[origin]) || (who && who.publicId) || null; }
  function reply(event, message) {
    try { event.source.postMessage(message, event.origin); } catch (_) { /* source window gone; nothing to tell it */ }
  }

  /* The bar names the current public id, and lets the person switch it when the file holds more than one. */
  function renderStatus() {
    var bar = $('brokerBarStatus');
    bar.textContent = !who ? 'Not signed in' : (who.publicId ? 'Signed in as ' + who.publicId.name : 'Signed in · no public id');
    var ids = (who && who.publicIds) || [];
    if (ids.length < 2) return;
    ids.forEach(function (id) {
      if (who.publicId && id.key === who.publicId.key) return;
      var b = h('button', { type: 'button', class: 'btn', text: 'Use ' + id.name, onclick: function () { who.usePublicId(id.key); } });
      bar.appendChild(document.createTextNode(' '));
      bar.appendChild(b);
    });
  }
  /* A site asks again: answer with the id it knows, unless the person now uses another id. Then ask, and warn. */
  function needsAsk(origin) {
    var shared = idByKey(sharedWith[origin]);
    return !shared || Boolean(who.publicId && who.publicId.key !== shared.key);
  }

  /* Reuses the exact dialog authorizePublish() in js/admin/admin.js builds,
     with one difference the broker's whole job is to surface: `requester`
     here is the real calling origin, not a label the signed-in page chose
     for itself. */
  function authorizeAndSign(event, data) {
    var title = data.title || 'Sign a request';
    var description = data.description || 'Review the exact bytes before this identity signs them.';
    var signingMessage = String(data.signingMessage || '');
    authorizationDigest(signingMessage).then(function (digest) {
      var id = idFor(event.origin);
      if (!id) { reply(event, { type: 'flux-broker:signed', requestId: data.requestId, ok: false, error: 'This FXN ID has no public id. Add one on your defxn account page, then try again.' }); return; }
      var idB64 = hexToB64(id.key);
      var view = window.ArkAuthorizationView.scopedAuthorizationView({
        title: title, description: description,
        requester: event.origin,
        network: data.action || 'flux.broker.sign',
        authority: idB64,
        configuration: data.capability || 'identity.sign',
        scope: data.capability || 'identity.sign',
        action: data.action || 'flux.broker.sign',
        manifestDigest: digest,
        claimStack: 'primary authorize ' + (data.action || 'flux.broker.sign') + ' for ' + event.origin + '\nconstraint owner ' + idB64 + '\nfailure reject altered or cross-site bytes\ntrust zero',
        manifest: data.manifest || {},
        authorizationBytes: signingMessage,
        actionPayloadBytes: signingMessage,
        facts: [{ label: 'Requesting site', value: event.origin }, { label: 'Signs as', value: id.name }],
      });
      var titleId = 'brokerAuthTitle-' + data.requestId, descId = 'brokerAuthDesc-' + data.requestId;
      var dialog = document.createElement('flux-authorization-dialog');
      dialog.action = data.action || 'flux.broker.sign';
      dialog.capability = data.capability || 'identity.sign';
      dialog.setAttribute('aria-labelledby', titleId);
      dialog.setAttribute('aria-describedby', descId);
      var backdrop = h('div', { class: 'admin-auth-backdrop' });
      var panel = h('section', { class: 'admin-auth-panel' });
      var titleRow = h('div', { class: 'admin-auth-title' }, h('span', { class: 'kicker', text: 'Requested by ' + event.origin }), h('h2', { id: titleId, text: view.heading }));
      var close = h('button', { type: 'button', class: 'admin-auth-close', 'aria-label': 'Deny this request', text: '×' });
      panel.appendChild(h('header', {}, titleRow, close));
      panel.appendChild(h('p', { id: descId, class: 'admin-auth-description', text: view.description }));
      var context = h('dl', { class: 'admin-auth-context' });
      view.rows.forEach(function (row) { context.appendChild(h('div', {}, h('dt', { text: row.label }), h('dd', { text: row.value }))); });
      panel.appendChild(context);
      panel.appendChild(h('div', { class: 'admin-auth-digest' }, h('small', { text: 'Exact manifest digest · SHA-256' }), h('code', { text: view.digest })));
      view.disclosures.forEach(function (item) {
        var details = document.createElement('details'); details.appendChild(h('summary', { text: item.label }));
        var pre = document.createElement('pre'); pre.textContent = item.text; details.appendChild(pre); panel.appendChild(details);
      });
      panel.appendChild(h('p', { class: 'admin-auth-safety', text: view.safety }));
      var footer = h('footer', {}, h('button', { type: 'button', class: 'btn', text: 'Deny' }), h('button', { type: 'button', class: 'btn primary', 'data-autofocus': true, text: 'Approve & sign' }));
      panel.appendChild(footer);
      backdrop.appendChild(panel); dialog.appendChild(backdrop); document.body.appendChild(dialog);
      var denyButton = footer.children[0], approveButton = footer.children[1], closed = false;
      function finish() { if (closed) return; closed = true; dialog.remove(); }
      function busy() { return dialog.state === 'signing'; }
      function deny() { if (busy()) return; finish(); reply(event, { type: 'flux-broker:signed', requestId: data.requestId, ok: false, error: 'denied' }); }
      close.addEventListener('click', deny);
      denyButton.addEventListener('click', deny);
      backdrop.addEventListener('mousedown', function (e) { if (e.target === backdrop) deny(); });
      dialog.addEventListener('keydown', function (e) { if (busy() && e.key === 'Escape') e.stopPropagation(); }, true);
      approveButton.addEventListener('click', function () {
        dialog.state = 'signing';
        close.disabled = true; denyButton.disabled = true; approveButton.disabled = true;
        approveButton.textContent = 'Signing locally…';
        var signer = who.publicIdSigner(id.key);
        signer.signText(signingMessage).then(function (signatureHex) {
          finish();
          sharedWith[event.origin] = id.key; /* a signature shows the key, so the site now knows this id */
          reply(event, { type: 'flux-broker:signed', requestId: data.requestId, ok: true, publicKeyB64: idB64, signature: hexToB64(signatureHex) });
        }).catch(function (error) {
          finish();
          reply(event, { type: 'flux-broker:signed', requestId: data.requestId, ok: false, error: (error && error.message) || 'sign-failed' });
        });
      });
      dialog.open = true;
    });
  }

  /* `getIdentity()` callers (js/ark/broker-client.js) send `request-identity`
     the instant this tab's message listener answers a ping -- which only
     means this page's JS has loaded, not that a person has picked their
     .auth.flx file yet. Answering immediately with `identity: null`
     whenever `who` isn't set yet was the real bug this queue fixes: the
     calling site's one-shot promise resolved to null and gave up, and
     nothing ever asked again even after the person finished unlocking
     right here a moment later -- the unlock genuinely worked, but the
     tab that asked for it never found out. Unlike `queuedSignRequest`
     (one slot, "busy" on a second concurrent request -- a real signature
     needs the person's undivided attention), multiple sites can
     legitimately be waiting on "is anyone signed in yet" at once (e.g.
     genesis.defxn.com and dao.defxn.com both open around the same time),
     so this is a list, and every waiter gets the same answer once one
     unlock happens -- no first-caller-wins, no silent drop. */
  function handleIdentityRequest(event) {
    everReceivedRequest = true;
    if (who) { askToShare(event); return; }
    queuedIdentityRequests.push(event);
    $('brokerStatus').textContent = event.origin + ' is waiting. Open your identity file above to continue.';
  }

  function flushQueuedIdentityRequests() {
    if (!queuedIdentityRequests.length) return;
    var waiters = queuedIdentityRequests; queuedIdentityRequests = [];
    waiters.forEach(askToShare);
  }

  function shareIdentity(event) {
    var id = idByKey(sharedWith[event.origin]);
    reply(event, { type: 'flux-broker:identity', identity: id ? publicFields(id) : null });
    $('brokerStatus').textContent = event.origin + ' knows you as ' + (id ? id.name : '') + ' now. Switch back to that tab to continue.';
  }

  /* Every origin asks once per identity per tab (see SHARING in the header).
     The prompt names the exact origin, because a <label>.defxn.com page
     may be someone else's site. */
  function askToShare(event) {
    if (!needsAsk(event.origin)) { shareIdentity(event); return; }
    shareQueue.push(event);
    showNextShare();
  }

  function showNextShare() {
    if (shareAsking) return;
    while (shareQueue.length && !needsAsk(shareQueue[0].origin)) shareIdentity(shareQueue.shift());
    var box = $('brokerShare');
    if (!shareQueue.length) { box.hidden = true; box.textContent = ''; return; }
    var event = shareAsking = shareQueue.shift();
    var ids = who.publicIds || [];
    box.textContent = '';
    box.appendChild(h('p', { class: 'gate-eyebrow', text: 'SHARE A PUBLIC ID' }));
    if (!ids.length) {
      box.appendChild(h('p', { id: 'brokerShareQuestion', text: event.origin + ' asks who you are. This FXN ID has no public id yet.' }));
      box.appendChild(h('p', { class: 'hint', text: 'Add one on your defxn account page, then open the new file here.' }));
      var stop = h('button', { type: 'button', class: 'btn', text: 'Don’t share' });
      box.appendChild(h('div', { class: 'gate-actions' }, stop));
      stop.addEventListener('click', function () { answerShare(null); });
      box.hidden = false;
      return;
    }
    box.appendChild(h('p', { id: 'brokerShareQuestion', text: event.origin + ' asks which public id you are. Pick one.' }));
    var picked = (who.publicId || ids[0]).key;
    var list = h('div', { class: 'gate-actions', role: 'radiogroup', 'aria-labelledby': 'brokerShareQuestion' });
    ids.forEach(function (id) {
      var input = h('input', { type: 'radio', name: 'brokerShareId', value: id.key, checked: id.key === picked });
      input.addEventListener('change', function () { picked = id.key; });
      list.appendChild(h('label', {}, input, document.createTextNode(' ' + id.name + (id.label ? ' · ' + id.label : ''))));
    });
    box.appendChild(list);
    box.appendChild(h('p', { class: 'hint', text: 'The site sees that id’s key and name. It cannot sign with them. Each signature asks you again.' }));
    var deny = h('button', { type: 'button', class: 'btn', text: 'Don’t share' });
    var allow = h('button', { type: 'button', class: 'btn primary', text: 'Share with ' + event.origin });
    box.appendChild(h('div', { class: 'gate-actions' }, deny, allow));
    deny.addEventListener('click', function () { answerShare(null); });
    allow.addEventListener('click', function () { answerShare(picked); });
    box.hidden = false;
    allow.focus();
  }

  /* A site that already knows one public id is about to see another. Says what that costs, then asks again. */
  function warnSecondId(event, before, after, then) {
    var box = $('brokerShare');
    box.textContent = '';
    box.appendChild(h('p', { class: 'gate-eyebrow', text: 'THIS LINKS TWO PUBLIC IDS' }));
    box.appendChild(h('p', { id: 'brokerShareQuestion', text: event.origin + ' already knows you as ' + before.name + '.' }));
    box.appendChild(h('p', { class: 'hint', text: 'If it also sees ' + after.name + ', it can tell both are you. That cannot be undone.' }));
    var back = h('button', { type: 'button', class: 'btn primary', text: 'Keep ' + before.name });
    var go = h('button', { type: 'button', class: 'btn', text: 'Show ' + after.name + ' too' });
    box.appendChild(h('div', { class: 'gate-actions' }, back, go));
    back.addEventListener('click', function () { then(before.key); });
    go.addEventListener('click', function () { then(after.key); });
    box.hidden = false;
    back.focus();
  }

  function answerShare(key) {
    var event = shareAsking;
    if (!event) return;
    if (!who) { shareAsking = null; queuedIdentityRequests.push(event); showNextShare(); return; }
    var before = idByKey(sharedWith[event.origin]);
    var after = key && idByKey(key);
    if (before && after && before.key !== after.key) {
      warnSecondId(event, before, after, function (chosen) { shareAsking = null; sharedWith[event.origin] = chosen; shareIdentity(event); showNextShare(); });
      return;
    }
    shareAsking = null;
    if (after) {
      sharedWith[event.origin] = after.key;
      shareIdentity(event);
    } else {
      /* One no answers every waiting request from that origin, so a page
         that asks twice does not ask the person twice. */
      var refused = [event].concat(shareQueue.filter(function (e) { return e.origin === event.origin; }));
      shareQueue = shareQueue.filter(function (e) { return e.origin !== event.origin; });
      refused.forEach(function (e) { reply(e, { type: 'flux-broker:identity', identity: null, error: 'denied' }); });
      $('brokerStatus').textContent = 'You did not share your identity with ' + event.origin + '.';
    }
    showNextShare();
  }

  function handleSignRequest(event, data) {
    everReceivedRequest = true;
    if (!who) {
      /* Only one request queues at a time -- a second concurrent request
         while the first is still waiting on the person is told plainly,
         not silently dropped or silently overwritten. */
      if (queuedSignRequest) { reply(event, { type: 'flux-broker:signed', requestId: data.requestId, ok: false, error: 'busy' }); return; }
      queuedSignRequest = { event: event, data: data };
      $('brokerStatus').textContent = (event.origin) + ' is waiting. Open your identity file above to continue.';
      return;
    }
    authorizeAndSign(event, data);
  }

  window.addEventListener('message', function (event) {
    if (!ALLOWED_ORIGIN.test(event.origin)) return;
    var data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'flux-broker:ping') { reply(event, { type: 'flux-broker:pong' }); return; }
    if (data.type === 'flux-broker:request-identity') { handleIdentityRequest(event); return; }
    if (data.type === 'flux-broker:sign' && typeof data.requestId === 'string') { handleSignRequest(event, data); return; }
  });

  if (!window.ArkAdminAuth) { $('brokerStatus').textContent = 'The sign-in part of this page did not load. Reload the page.'; return; }
  window.ArkAdminAuth.create({
    container: $('brokerAuthContainer'),
    product: 'defxn',
    onChange: function (identity) {
      /* A new file (a new identity object) forgets every share. Switching public id in the same file does not:
         a site keeps the id it was shown, and askToShare warns before it sees another. */
      if (!identity || identity !== who) sharedWith = Object.create(null);
      who = identity || null;
      renderStatus();
      if (who) {
        var hadQueuedIdentity = queuedIdentityRequests.length > 0;
        flushQueuedIdentityRequests();
        if (queuedSignRequest) {
          var queued = queuedSignRequest; queuedSignRequest = null;
          $('brokerStatus').textContent = '';
          authorizeAndSign(queued.event, queued.data);
        } else if (!hadQueuedIdentity) {
          /* Nothing was waiting at the moment of unlock. Say plainly
             whether anything ever asked at all (see everReceivedRequest's
             own comment) -- a tab opened by typing the URL directly, with
             no site on the other end, looks IDENTICAL to one correctly
             waiting to be asked unless this distinguishes them. */
          $('brokerStatus').textContent = everReceivedRequest
            ? ''
            : (window.opener
                ? 'No site has asked for your identity yet. If you came here through a defxn site’s sign-in button, switch back to that tab -- it should pick this up automatically now.'
                : 'No site is waiting on this tab. This page only does something when a defxn site’s own sign-in button opens it -- opening this URL directly, or bookmarking it, has nothing to hand your identity to.');
        }
      } else {
        /* Signed out (or never signed in): nothing left to flush a real
           identity to. A queued identity request stays queued rather than
           being answered with null here -- the person may still unlock a
           DIFFERENT kit in the same tab, and that waiter should get THAT
           answer, not a premature null for a state that was never final. */
        $('brokerStatus').textContent = '';
      }
    },
  });
  renderStatus();
})();

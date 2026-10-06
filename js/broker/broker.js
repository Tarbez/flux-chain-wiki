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
  function publicFields(identity) {
    return { publicKeyB64: identity.publicKeyB64, displayName: identity.displayName || '' };
  }
  function reply(event, message) {
    try { event.source.postMessage(message, event.origin); } catch (_) { /* source window gone; nothing to tell it */ }
  }

  function renderStatus() {
    $('brokerBarStatus').textContent = who ? ('Signed in · ' + (who.displayName || who.publicKeyB64.slice(0, 10) + '…')) : 'Not signed in';
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
      var view = window.ArkAuthorizationView.scopedAuthorizationView({
        title: title, description: description,
        requester: event.origin,
        network: data.action || 'flux.broker.sign',
        authority: who.publicKeyB64,
        configuration: data.capability || 'identity.sign',
        scope: data.capability || 'identity.sign',
        action: data.action || 'flux.broker.sign',
        manifestDigest: digest,
        claimStack: 'primary authorize ' + (data.action || 'flux.broker.sign') + ' for ' + event.origin + '\nconstraint owner ' + who.publicKeyB64 + '\nfailure reject altered or cross-site bytes\ntrust zero',
        manifest: data.manifest || {},
        authorizationBytes: signingMessage,
        actionPayloadBytes: signingMessage,
        facts: [{ label: 'Requesting site', value: event.origin }],
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
        var signer = who;
        signer.sign(signingMessage).then(function (signature) {
          finish();
          reply(event, { type: 'flux-broker:signed', requestId: data.requestId, ok: true, publicKeyB64: signer.publicKeyB64, signature: signature });
        }).catch(function (error) {
          finish();
          reply(event, { type: 'flux-broker:signed', requestId: data.requestId, ok: false, error: (error && error.message) || 'sign-failed' });
        });
      });
      dialog.open = true;
    });
  }

  function handleSignRequest(event, data) {
    if (!who) {
      /* Only one request queues at a time -- a second concurrent request
         while the first is still waiting on the person is told plainly,
         not silently dropped or silently overwritten. */
      if (queuedSignRequest) { reply(event, { type: 'flux-broker:signed', requestId: data.requestId, ok: false, error: 'busy' }); return; }
      queuedSignRequest = { event: event, data: data };
      $('brokerStatus').textContent = (event.origin) + ' is waiting for you to unlock an identity above to continue.';
      return;
    }
    authorizeAndSign(event, data);
  }

  window.addEventListener('message', function (event) {
    if (!ALLOWED_ORIGIN.test(event.origin)) return;
    var data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'flux-broker:ping') { reply(event, { type: 'flux-broker:pong' }); return; }
    if (data.type === 'flux-broker:request-identity') { reply(event, { type: 'flux-broker:identity', identity: who ? publicFields(who) : null }); return; }
    if (data.type === 'flux-broker:sign' && typeof data.requestId === 'string') { handleSignRequest(event, data); return; }
  });

  if (!window.ArkAdminAuth) { $('brokerStatus').textContent = 'Auth Kit did not load; identity unlock is unavailable here.'; return; }
  window.ArkAdminAuth.create({
    container: $('brokerAuthContainer'),
    product: 'defxn',
    onChange: function (identity) {
      who = identity || null;
      renderStatus();
      if (who && queuedSignRequest) {
        var queued = queuedSignRequest; queuedSignRequest = null;
        $('brokerStatus').textContent = '';
        authorizeAndSign(queued.event, queued.data);
      } else if (!who) {
        $('brokerStatus').textContent = '';
      }
    },
  });
  renderStatus();
})();

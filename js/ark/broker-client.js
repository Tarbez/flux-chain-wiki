/* =====================================================================
   THE IDENTITY BROKER, CLIENT SIDE (broker.html / js/broker/broker.js)
   ---------------------------------------------------------------------
   Lets a *.defxn.com page ask the one identity unlocked at defxn.com's
   broker tab to identify itself or sign something, instead of making the
   visitor unlock a recovery file again on every subdomain.

   window.open(url, name) reuses an already-open window by that name, even
   across different origins calling it and even across this calling page's
   own later reloads -- that reuse is what removes the friction: the broker
   tab is opened once, by whichever defxn site the visitor used first, and
   every later `requestSignature`/`getIdentity` call from any other defxn
   site just reaches into that same tab.

   KNOWN LIMIT, stated plainly rather than hidden: re-opening an
   already-open named window with the SAME url is not guaranteed cold by
   spec to skip a reload in every browser. If it does reload, the broker's
   unlocked identity is lost (by design -- see js/admin/gate.js's own
   header on why a reload always drops the key) and the visitor is asked
   to unlock again. That is a safe failure, not a silent one: the visitor
   sees the unlock screen, not a stuck spinner.

   A browser's popup blocker can refuse the FIRST open outright unless it
   happens inside a real click handler -- callers should invoke
   getIdentity()/requestSignature() from one, not from page-load code.
   ===================================================================== */
(function () {
  'use strict';

  var BROKER_ORIGIN = 'https://defxn.com';
  var BROKER_URL = BROKER_ORIGIN + '/broker.html';
  var WINDOW_NAME = 'flux-identity-broker';
  var PING_INTERVAL_MS = 150, PING_TIMEOUT_MS = 8000;

  var popup = null, ready = false, pingTimer = null;
  var pendingIdentity = [];           /* [{resolve, reject}] */
  var pendingSigns = {};               /* requestId -> {resolve, reject} */
  var seq = 0;

  function popupBlockedError() {
    var error = new Error('Your browser blocked the defxn identity window. Allow pop-ups for this site and try again.');
    error.code = 'popup-blocked';
    return error;
  }

  function openBroker() {
    if (popup && !popup.closed) return popup;
    ready = false;
    popup = window.open(BROKER_URL, WINDOW_NAME);
    if (!popup) return null;
    startPing();
    return popup;
  }

  function startPing() {
    if (pingTimer) return;
    var started = Date.now();
    pingTimer = setInterval(function () {
      if (!popup || popup.closed) { stopPing(); failAllPending(popupBlockedError()); return; }
      if (ready) { stopPing(); return; }
      if (Date.now() - started > PING_TIMEOUT_MS) {
        stopPing();
        failAllPending(Object.assign(new Error('The defxn identity window did not respond in time.'), { code: 'broker-timeout' }));
        return;
      }
      try { popup.postMessage({ type: 'flux-broker:ping' }, BROKER_ORIGIN); } catch (_) { /* not ready yet */ }
    }, PING_INTERVAL_MS);
  }
  function stopPing() { if (pingTimer) { clearInterval(pingTimer); pingTimer = null; } }
  function failAllPending(error) {
    pendingIdentity.forEach(function (waiter) { waiter.reject(error); }); pendingIdentity = [];
    Object.keys(pendingSigns).forEach(function (id) { pendingSigns[id].reject(error); delete pendingSigns[id]; });
  }

  function whenReady(send) {
    var opened = openBroker();
    if (!opened) return Promise.reject(popupBlockedError());
    if (ready) { send(); return; }
    var checkReady = setInterval(function () {
      if (ready) { clearInterval(checkReady); send(); }
      else if (!popup || popup.closed) { clearInterval(checkReady); }
    }, 50);
  }

  window.addEventListener('message', function (event) {
    if (event.origin !== BROKER_ORIGIN) return;
    if (!popup || event.source !== popup) return;
    var data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'flux-broker:pong') { ready = true; return; }
    if (data.type === 'flux-broker:identity') {
      var waiter = pendingIdentity.shift();
      if (waiter) { try { popup.focus(); } catch (_) {} waiter.resolve(data.identity || null); }
      return;
    }
    if (data.type === 'flux-broker:signed' && pendingSigns[data.requestId]) {
      var signWaiter = pendingSigns[data.requestId]; delete pendingSigns[data.requestId];
      if (data.ok) signWaiter.resolve({ publicKeyB64: data.publicKeyB64, signature: data.signature });
      else signWaiter.reject(Object.assign(new Error(brokerErrorMessage(data.error)), { code: data.error || 'denied' }));
      return;
    }
  });

  function brokerErrorMessage(code) {
    if (code === 'denied') return 'Signing was not approved in the defxn identity window.';
    if (code === 'busy') return 'The defxn identity window is already waiting on a different request. Try again once it is answered.';
    return 'The defxn identity window could not sign this: ' + (code || 'unknown error') + '.';
  }

  window.ArkBroker = {
    /* -> Promise<{publicKeyB64, displayName} | null> */
    getIdentity: function () {
      return new Promise(function (resolve, reject) {
        pendingIdentity.push({ resolve: resolve, reject: reject });
        whenReady(function () { try { popup.postMessage({ type: 'flux-broker:request-identity' }, BROKER_ORIGIN); } catch (e) { reject(e); } });
        try { popup && popup.focus(); } catch (_) {}
      });
    },
    /* request: {title, description, action, capability, manifest, signingMessage}
       -> Promise<{publicKeyB64, signature}> */
    requestSignature: function (request) {
      return new Promise(function (resolve, reject) {
        var requestId = 'r' + (++seq) + '-' + Date.now();
        pendingSigns[requestId] = { resolve: resolve, reject: reject };
        var message = Object.assign({}, request, { type: 'flux-broker:sign', requestId: requestId });
        whenReady(function () { try { popup.postMessage(message, BROKER_ORIGIN); } catch (e) { delete pendingSigns[requestId]; reject(e); } });
        try { popup && popup.focus(); } catch (_) {}
      });
    },
  };
})();

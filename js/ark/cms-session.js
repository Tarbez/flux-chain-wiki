/* Shared account/CMS boundary. Public metadata is never permission; only the
   host's signed challenge and ownership check can establish an admin session. */
(function () {
  'use strict';
  var ui = window.ArkUI = window.ArkUI || {};
  var generation = 0, authenticatedKey = null, localDevelopment = false;
  var status = 'Open the CMS to check access.';
  /* A HOST WITH NO SESSION SERVICE (2026-11-11: every page of the packed site asked /api/session and got 404, once per load).
     Only the publishing host answers it (scripts/publish-host.mjs). Two rules keep the ask off a host that cannot answer:
     1. A packed static site says so in its shell (scripts/pack-fxn-site.mjs writes <meta name="defxn-host" content="static">),
        and this file then asks nothing: no request, so no 404 line in the console.
     2. Any other host that answers 404 is asked once per tab: the answer is kept in sessionStorage and the next pages do not ask.
     The session itself is unchanged on a host that has the service. */
  var NONE = 'defxn.no-session-service', NO_SERVICE = 'This host has no CMS session service. Open the CMS on the host that publishes this site.';
  var staticHost = !!document.querySelector('meta[name="defxn-host"][content="static"]');
  function none() { try { return sessionStorage.getItem(NONE) === '1'; } catch (e) { return false; } }
  function hosted() { return !staticHost && !none() && (location.protocol === 'https:' || /^(127\.0\.0\.1|localhost)$/.test(location.hostname)); }
  async function request(path, body) {
    var response = await fetch(path, body === undefined ? {} : { method: 'POST', headers: {'content-type':'application/json'}, body:JSON.stringify(body) });
    if (response.status === 404) { try { sessionStorage.setItem(NONE, '1'); } catch (e) { /* a private window: the next page asks once more */ } throw new Error(NO_SERVICE); }
    var data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'CMS access could not be checked.');
    return data;
  }
  async function connect(who) {
    var attempt = ++generation;
    if (staticHost || none()) status = NO_SERVICE;
    if (!hosted() || !who || who.rootVerified !== true || typeof who.sign !== 'function') return;
    status = 'Checking CMS access…';
    try {
      var info = await request('/api/session');
      if (attempt !== generation) return;
      if (info.authenticated && info.publicKeyB64 === who.publicKeyB64) { authenticatedKey = who.publicKeyB64; await access(); return; }
      // Never retain an admin session belonging to an earlier identity.
      if (info.authenticated) await request('/api/session/logout', {});
      var challenge = await request('/api/session/challenge', {});
      var prefix = 'flux-chain-admin-login/v1|' + location.host + '|';
      if (typeof challenge.message !== 'string' || !challenge.message.startsWith(prefix)) throw new Error('The CMS challenge does not belong to this host.');
      if (attempt !== generation) return;
      var signature = await who.sign(challenge.message);
      if (attempt !== generation) return;
      var made = await request('/api/session/login', { publicKeyB64:who.publicKeyB64, nonce:challenge.nonce, signature:signature, label:who.displayName });
      if (attempt !== generation) { await request('/api/session/logout', {}); return; }
      if (made.done) { authenticatedKey = who.publicKeyB64; await access(); }
      else status = 'Complete the CMS security check to continue.';
    } catch (error) { if (attempt === generation) status = error.message; }
  }
  async function revoke() {
    ++generation; authenticatedKey = null; status = 'Signed out of the CMS.';
    if (!hosted()) return;
    try { await request('/api/session/logout', {}); }
    catch (_) { status = 'CMS sign-out could not reach the host. Close the CMS and retry when the host is available.'; }
  }
  async function access() {
    var key = authenticatedKey;
    var result = await request('/api/cms/access');
    if (key !== authenticatedKey) return;
    status = result.authorized ? 'Signed in · CMS access granted.' : 'Signed in · CMS access not granted. ' + (result.error || 'The host has not authorized this identity.');
  }
  function sharedSigner() {
    try {
      var source = window.opener;
      if (!source || source.closed || source.location.origin !== location.origin) return null;
      var account = source.ArkUI && source.ArkUI.accountSession;
      return account && account.isUnlocked() ? account.current() : null;
    } catch (_) { return null; }
  }
  ui.cmsSession = {connect:connect, revoke:revoke, status:function(){return status;}, isAuthenticated:function(key){return !!key && key === authenticatedKey;}, isLocalDevelopment:function(){return localDevelopment;}, sharedSigner:sharedSigner};
  if (hosted()) {
    var restoring = generation;
    request('/api/session').then(async function(info) {
      if (restoring !== generation) return;
      localDevelopment = info.localDevelopment === true;
      if (localDevelopment) status = 'Local editor · sign-in is only needed to publish.';
      var pointer = ui.localIdentity && ui.localIdentity.current();
      if (info.authenticated && pointer && pointer.publicKeyB64 === info.publicKeyB64) { authenticatedKey = info.publicKeyB64; await access(); }
      if (ui.localIdentity) ui.localIdentity.refresh();
    }).catch(function() {});
  }
})();

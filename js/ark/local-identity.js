/* Public identity pointer, following chat.deadark.com's localIdentitySession /
   IdentityProvider pattern. Cached metadata is display state, never signing authority.
   Recovery files, PINs, phrases and signers are not part of this allowlist. */
(function () {
  'use strict';
  window.ArkUI = window.ArkUI || (typeof ArkUI !== 'undefined' ? ArkUI : {});
  var ui = window.ArkUI;
  var KEY = 'defxn-local-identity-v1';
  var EVENT = 'defxn:identity-change';
  var listeners = new Set();
  var storageError = '';
  function value(input, limit) {
    return typeof input === 'string' && input.length <= limit && !/[\x00-\x1f\x7f]/.test(input) ? input.trim() : '';
  }
  function parse(raw) {
    try {
      var data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== 1) return null;
      var id = value(data.identityId, 512);
      if (!id || /\s/.test(id)) return null;
      return Object.freeze({ version: 1, identityId: id, displayName: value(data.displayName, 128) || id,
        publicKeyB64: value(data.publicKeyB64, 512), walletAddress: value(data.walletAddress, 512),
        securityProfile: value(data.securityProfile, 128) });
    } catch (_) { return null; }
  }
  function read() {
    try { return parse(window.localStorage.getItem(KEY)); }
    catch (_) { storageError = 'Browser storage is unavailable. Your identity will stay signed in only until reload.'; return null; }
  }
  var current = read();
  function notify() { listeners.forEach(function (listener) { listener(current); }); }
  function publish() { window.dispatchEvent(new Event(EVENT)); }
  function refresh() {
    // Keep a working in-memory session when the browser blocks storage.
    if (!storageError) current = read();
    notify();
  }
  window.addEventListener(EVENT, notify);
  window.addEventListener('storage', function (event) {
    if (event.key === KEY || event.key === null) { storageError = ''; refresh(); }
  });
  window.addEventListener('focus', refresh);
  ui.localIdentity = {
    current: function () { return current; },
    parse: parse,
    storageError: function () { return storageError; },
    subscribe: function (listener) { listeners.add(listener); listener(current); return function () { listeners.delete(listener); }; },
    set: function (identity) {
      var safe = parse({ version: 1, identityId: identity.identityId || identity.publicKeyB64,
        displayName: identity.displayName, publicKeyB64: identity.publicKeyB64,
        walletAddress: identity.walletAddress, securityProfile: identity.securityProfile });
      if (!safe) throw new Error('This identity has no valid public identifier to remember.');
      current = safe;
      try { window.localStorage.setItem(KEY, JSON.stringify(safe)); storageError = ''; }
      catch (_) { storageError = 'Browser storage is unavailable. Your identity will stay signed in only until reload.'; }
      publish();
    },
    clear: function () {
      current = null;
      try { window.localStorage.removeItem(KEY); storageError = ''; }
      catch (_) { storageError = 'Browser storage could not be cleared. Remove this site’s saved data to forget the remembered identity.'; }
      publish();
    },
    refresh: refresh
  };
})();

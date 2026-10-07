/* =====================================================================
   SHARED /identity/* + /directory/* TRANSPORT
   ---------------------------------------------------------------------
   Extracted out of js/ark/mesh-directory-client.js so a THIRD client
   (js/ark/value-registries-client.js, for the FXN/Credits registries)
   doesn't duplicate this signing transport a second time -- same
   "centralize, don't duplicate" reasoning as every other shared helper
   in this codebase. Byte-for-byte the same wire format as before: this
   file changed NOTHING about the protocol, only where the code lives.
   mesh-directory-client.js now calls into this instead of keeping its
   own private copy.
   ===================================================================== */
(function () {
  'use strict';
  window.ArkUI = window.ArkUI || {};

  var PROTOCOL = 'ark-identity-http-v1';
  var DEFAULT_BASE = 'https://cd1.defxn.com';
  // The real ARK_MINER_NETWORK this fleet's miners run as (confirmed live
  // against /opt/flux-miner/defxn/node.env on flx-bk2/flx-mk2) -- shown in
  // every scoped-authorization claim's "Network" row. "flux-mainnet" was a
  // placeholder label that never matched what's actually deployed here.
  var NETWORK_ID = 'defxn';

  function toBase64Url(bytes) {
    var binary = '';
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /* `who.sign(text)` (js/admin/auth.js) already returns a base64 raw
     Ed25519 signature over the UTF-8 bytes of `text` -- exactly the shape
     `verifyEd25519RawB64` expects, so the challenge message is built and
     signed as a plain string, no extra encoding layer. */
  async function challengeHeaders(who, method, path) {
    var timestamp = String(Date.now());
    var nonceBytes = new Uint8Array(24);
    crypto.getRandomValues(nonceBytes);
    var nonce = toBase64Url(nonceBytes);
    var message = PROTOCOL + ':request\n' + method.toUpperCase() + '\n' + path + '\n' + who.publicKeyB64 + '\n' + timestamp + '\n' + nonce;
    var signature = await who.sign(message);
    return {
      'x-ark-identity-key': who.publicKeyB64,
      'x-ark-identity-time': timestamp,
      'x-ark-identity-nonce': nonce,
      'x-ark-identity-signature': signature,
    };
  }

  async function call(who, base, method, path, body) {
    /* The server signs/verifies against the route's own pathname only --
       a query string is never part of the signed material (directory-auth.js's
       own doc comment: "so query strings can never be smuggled into or out of
       the signed material"). Signing the full `path` including `?...` here
       would produce a message the server never agrees with and every search
       call would fail with invalid-signature. */
    var pathname = path.split('?')[0];
    var headers = await challengeHeaders(who, method, pathname);
    if (body !== undefined) headers['content-type'] = 'application/json';
    var response = await fetch((base || DEFAULT_BASE) + path, {
      method: method,
      headers: headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
    var data = await response.json().catch(function () { return null; });
    if (!response.ok) {
      var error = new Error((data && data.error) || ('The mesh directory returned HTTP ' + response.status + '.'));
      error.status = response.status;
      throw error;
    }
    return data;
  }

  window.ArkUI.directoryTransport = {
    DEFAULT_BASE: DEFAULT_BASE,
    NETWORK_ID: NETWORK_ID,
    call: call,
  };
})();

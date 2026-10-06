/* =====================================================================
   RAW ED25519 PUBLIC KEY <-> SPKI PEM, BROWSER SIDE
   ---------------------------------------------------------------------
   The FXN value-object registry (ark-miner-cli's /directory/value-object,
   /directory/transfer-agreement, /directory/fulfillment, built on
   @deadark/defi's fabricTransfer.mjs) is keyed by PEM-wrapped Ed25519
   keys, verified via node:crypto -- a different wire convention from
   every other directory record here (raw base64 Ed25519, verified via
   verifyEd25519RawB64). This file bridges the two WITHOUT any new key
   material: this identity's existing raw Auth Kit key (who.publicKeyB64,
   the same one used for x-ark-identity-key) IS the key; this is just a
   different TEXT ENCODING of the same 32 bytes.

   SPKI is just a fixed 12-byte DER prefix (the Ed25519 OID, RFC 8410)
   in front of the raw 32-byte public key, base64-wrapped with PEM
   header/footer lines -- no ASN.1 library needed, and no PEM parser
   needed either (Node's createPublicKey() tolerates this exact shape;
   verified directly against the real fabricTransfer.mjs, not assumed --
   see ark-miner-cli's value-credits-registries.test.mjs).

   A signature produced over a message with this identity's existing raw
   secret key verifies identically under this PEM form, because PEM/SPKI
   is an ENCODING of the key, not a different key -- so no new signing
   capability is needed either; js/admin/auth.js's existing who.sign(text)
   (raw Ed25519 over UTF-8 bytes) is reused as-is by
   js/ark/fabric-transfer-browser.js.
   ===================================================================== */
(function () {
  'use strict';
  window.ArkUI = window.ArkUI || {};

  var SPKI_PREFIX_B64 = 'MCowBQYDK2VwAyEA'; // base64 of hex 302a300506032b6570032100

  function base64ToBytes(b64) {
    var binary = atob(b64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  function bytesToBase64(bytes) {
    var binary = '';
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
  function wrapPem(label, bodyB64) {
    var lines = bodyB64.match(/.{1,64}/g) || [bodyB64];
    return '-----BEGIN ' + label + '-----\n' + lines.join('\n') + '\n-----END ' + label + '-----\n';
  }

  /* `rawPublicKeyB64` is the same standard-base64 32-byte Ed25519 public
     key every other directory record signs with (who.publicKeyB64). */
  function spkiPemFromRawPublicKeyB64(rawPublicKeyB64) {
    var rawBytes = base64ToBytes(rawPublicKeyB64);
    if (rawBytes.length !== 32) throw new Error('Expected a 32-byte raw Ed25519 public key.');
    var prefixBytes = base64ToBytes(SPKI_PREFIX_B64);
    var der = new Uint8Array(prefixBytes.length + rawBytes.length);
    der.set(prefixBytes, 0);
    der.set(rawBytes, prefixBytes.length);
    return wrapPem('PUBLIC KEY', bytesToBase64(der));
  }

  /* sha256 hex of the PEM TEXT -- must match ark-miner-cli's
     fingerprintPublicKeyPem (createHash('sha256').update(pem.trim())...),
     so this trims the same way before hashing. Async: WebCrypto's digest
     has no sync form. */
  async function sha256HexOfText(text) {
    var bytes = new TextEncoder().encode(text);
    var hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    var hashBytes = new Uint8Array(hashBuffer);
    var hex = '';
    for (var i = 0; i < hashBytes.length; i++) hex += hashBytes[i].toString(16).padStart(2, '0');
    return hex;
  }

  async function ownerKeyFingerprint(rawPublicKeyB64) {
    var pem = spkiPemFromRawPublicKeyB64(rawPublicKeyB64);
    return sha256HexOfText(pem.trim());
  }

  window.ArkUI.ed25519Pem = {
    spkiPemFromRawPublicKeyB64: spkiPemFromRawPublicKeyB64,
    sha256HexOfText: sha256HexOfText,
    ownerKeyFingerprint: ownerKeyFingerprint,
  };
})();

/* =====================================================================
   CONTENT ENCRYPTION (admin page)
   ---------------------------------------------------------------------
   Encrypt a piece of content once (AES-GCM, a random file key) and wrap
   that file key separately for each recipient's own X25519 keypair
   (tweetnacl box, x25519-xsalsa20poly1305) -- the same two-layer scheme
   ark-app uses for encrypted media (src/lib/media/crypto.ts,
   src/lib/content/encryptedContent.ts), ported to vanilla JS and
   extended to wrap for more than one recipient in the same envelope list.

   The wrapped keys are public data: only someone holding the matching
   recipient secret key can unwrap one and decrypt the body. Nothing here
   ever sends a secret key anywhere -- ArkSecret's ciphertext and the
   wrapped-key envelopes are exactly what ends up published, so the
   publish host and the mesh only ever see opaque bytes. Requires
   js/admin/vendor/tweetnacl.js (global `nacl`) loaded first.
   ===================================================================== */
var ArkContentCrypto = (function () {
  'use strict';

  function toBase64(bytes) {
    var binary = '';
    for (var i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  function fromBase64(value) {
    var binary = atob(value);
    var out = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
    return out;
  }

  function webcrypto() {
    var c = (typeof globalThis !== 'undefined' && globalThis.crypto) || (typeof window !== 'undefined' && window.crypto);
    if (!c || !c.subtle) throw new Error('Content encryption needs a Web Crypto context (window.crypto.subtle)');
    return c;
  }

  function randomBytes(n) { return webcrypto().getRandomValues(new Uint8Array(n)); }

  function ownedBuffer(bytes) { return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength); }

  /* ---- key management: one X25519 keypair per local identity, kept only in this browser ---- */

  function createKeyPair() {
    var pair = nacl.box.keyPair();
    return { keyVersion: 1, publicKey: toBase64(pair.publicKey), secretKey: pair.secretKey };
  }

  function createOrLoadKeyPair(ownerId) {
    var storageKey = 'flux-admin-media-key:' + ownerId;
    var existing = window.localStorage.getItem(storageKey);
    if (existing) {
      try {
        var parsed = JSON.parse(existing);
        if (parsed.publicKey && parsed.secretKey) return { keyVersion: parsed.keyVersion || 1, publicKey: parsed.publicKey, secretKey: fromBase64(parsed.secretKey) };
      } catch (e) { window.localStorage.removeItem(storageKey); }
    }
    var next = createKeyPair();
    window.localStorage.setItem(storageKey, JSON.stringify({ keyVersion: next.keyVersion, publicKey: next.publicKey, secretKey: toBase64(next.secretKey) }));
    return next;
  }

  /* ---- body: AES-GCM with a random, one-time file key ---- */

  async function encryptJson(value) {
    var fileKey = randomBytes(32);
    var iv = randomBytes(12);
    var cryptoKey = await webcrypto().subtle.importKey('raw', ownedBuffer(fileKey), { name: 'AES-GCM' }, false, ['encrypt']);
    var plaintext = new TextEncoder().encode(JSON.stringify(value));
    var ciphertext = new Uint8Array(await webcrypto().subtle.encrypt({ name: 'AES-GCM', iv: iv }, cryptoKey, plaintext));
    return { fileKey: fileKey, ciphertext: ciphertext, metadata: { version: 1, cipherAlgorithm: 'AES-GCM', iv: toBase64(iv) } };
  }

  async function decryptJson(ciphertext, fileKey, metadata) {
    if (metadata.cipherAlgorithm !== 'AES-GCM') throw new Error('Unsupported content cipher: ' + metadata.cipherAlgorithm);
    var cryptoKey = await webcrypto().subtle.importKey('raw', ownedBuffer(fileKey), { name: 'AES-GCM' }, false, ['decrypt']);
    var plaintext = await webcrypto().subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(metadata.iv) }, cryptoKey, ownedBuffer(ciphertext));
    return JSON.parse(new TextDecoder().decode(plaintext));
  }

  /* ---- file key, wrapped once per recipient with nacl box (x25519-xsalsa20poly1305) ---- */

  function wrapKeyForRecipient(fileKey, recipientPublicKeyB64) {
    var ephemeral = nacl.box.keyPair();
    var nonce = nacl.randomBytes(nacl.box.nonceLength);
    var ciphertext = nacl.box(fileKey, nonce, fromBase64(recipientPublicKeyB64), ephemeral.secretKey);
    return { recipientPublicKey: recipientPublicKeyB64, version: 1, algorithm: 'x25519-xsalsa20poly1305', nonce: toBase64(nonce), ephemeralPublicKey: toBase64(ephemeral.publicKey), ciphertext: toBase64(ciphertext) };
  }

  function unwrapKeyFromEnvelope(envelope, secretKey) {
    var opened = nacl.box.open(fromBase64(envelope.ciphertext), fromBase64(envelope.nonce), fromBase64(envelope.ephemeralPublicKey), secretKey);
    if (!opened) throw new Error('Failed to unwrap the file key: wrong secret key for this envelope');
    return opened;
  }

  /* ---- the two layers combined: content in, {ciphertext, metadata, envelopes[]} out ---- */

  async function encryptForRecipients(value, recipientPublicKeys) {
    if (!Array.isArray(recipientPublicKeys) || !recipientPublicKeys.length) throw new Error('At least one recipient public key is required');
    var body = await encryptJson(value);
    var envelopes = recipientPublicKeys.map(function (pk) { return wrapKeyForRecipient(body.fileKey, pk); });
    return { ciphertextBase64: toBase64(body.ciphertext), metadata: body.metadata, envelopes: envelopes };
  }

  /* secret: {ciphertextBase64, metadata, recipients:[envelope,...]}. ownKeyPair: from createOrLoadKeyPair.
     Returns null (not a throw) when this identity is not one of the recipients: that is an ordinary outcome, not a failure. */
  async function decryptForSelf(secret, ownKeyPair) {
    var envelope = (secret.recipients || []).find(function (e) { return e.recipientPublicKey === ownKeyPair.publicKey; });
    if (!envelope) return null;
    var fileKey = unwrapKeyFromEnvelope(envelope, ownKeyPair.secretKey);
    return decryptJson(fromBase64(secret.ciphertextBase64), fileKey, secret.metadata);
  }

  return {
    createOrLoadKeyPair: createOrLoadKeyPair,
    encryptForRecipients: encryptForRecipients,
    decryptForSelf: decryptForSelf,
    wrapKeyForRecipient: wrapKeyForRecipient,
    unwrapKeyFromEnvelope: unwrapKeyFromEnvelope,
    encryptJson: encryptJson,
    decryptJson: decryptJson,
    toBase64: toBase64,
    fromBase64: fromBase64
  };
})();

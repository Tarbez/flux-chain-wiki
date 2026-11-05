/* =====================================================================
   FXN BOX: the NaCl box (X25519 + XSalsa20-Poly1305) for a browser page
   ---------------------------------------------------------------------
   Owner law (2026-10-15): tweetnacl is replaced by native crypto. This
   file is what a browser page uses where it needs the NaCl box, in place
   of the whole of tweetnacl (js/admin/vendor/tweetnacl.js until round 14).

   What is native, and what is not:
   - X25519 (the key agreement, and each public key) is WebCrypto's
     built-in X25519. A browser without it is refused (REFUSAL below);
     there is no pure-JS curve fallback.
   - XSalsa20-Poly1305 (the cipher and its tag) is pure JS, because
     WebCrypto has no XSalsa20 and no Poly1305. It is the smallest part of
     tweetnacl-js 1.0.3 (public domain) that the box needs: the Salsa20
     core, HSalsa20, the XSalsa20 stream and the 17-limb Poly1305 from
     nacl.js, renamed and kept here. Nothing else of tweetnacl is in it.
     In Node, use libsodium instead (flux/ark-browser/src/main/native-box.js,
     sodium-native). If browsers ship a native XSalsa20, replace this half.

   Byte for byte the same as tweetnacl's nacl.box: the same secret key
   gives the same public key, the same keys and nonce give the same
   ciphertext, and each opens the other's. tests/fxn-box.test.mjs proves
   it against tweetnacl, which stays only as that test's reference.

   One difference, on purpose: WebCrypto refuses an X25519 agreement whose
   result is all zero (a small-order public key). tweetnacl would seal to
   it with a known key. Here box() throws and open() returns null.

   Classic script: defines the global FxnBox. Every X25519 call returns a
   Promise; secretbox and secretboxOpen are synchronous.
   ===================================================================== */
var FxnBox = (function () {
  'use strict';

  var REFUSAL = 'This browser cannot seal or open content safely: it has no built-in X25519. Please update it.';
  var BAD_KEY = 'This key cannot seal or open content: it is not a usable X25519 key (a 32-byte key, not a small-order point).';
  var KEY_BYTES = 32, NONCE_BYTES = 24, TAG_BYTES = 16, ZERO_BYTES = 32;

  function subtle() {
    var c = typeof globalThis !== 'undefined' ? globalThis.crypto : null;
    if (!c || !c.subtle || !c.getRandomValues) throw new Error(REFUSAL);
    return c;
  }

  function bytes(value, length, what) {
    if (!(value instanceof Uint8Array) && !(value && value.constructor && value.constructor.name === 'Uint8Array')) throw new TypeError(what + ' must be a Uint8Array.');
    if (length !== undefined && value.length !== length) throw new RangeError(what + ' must be ' + length + ' bytes; it is ' + value.length + '.');
    return value;
  }

  /* ---- XSalsa20-Poly1305 (pure JS; WebCrypto has no XSalsa20) ---- */

  var SIGMA = new Uint8Array([101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107]); /* "expand 32-byte k" */

  function rotl(x, c) { return (x << c) | (x >>> (32 - c)); }
  function load32(x, i) { return (x[i] & 0xff) | ((x[i + 1] & 0xff) << 8) | ((x[i + 2] & 0xff) << 16) | ((x[i + 3] & 0xff) << 24); }
  function store32(x, j, u) { for (var i = 0; i < 4; i++) { x[j + i] = u & 255; u >>>= 8; } }

  /* The Salsa20 core (hsalsa = false: the 64-byte block) and HSalsa20 (hsalsa = true: the 32-byte key). */
  function salsaCore(out, inp, k, c, hsalsa) {
    var w = new Uint32Array(16), x = new Uint32Array(16), y = new Uint32Array(16), t = new Uint32Array(4);
    var i, j, m;
    for (i = 0; i < 4; i++) {
      x[5 * i] = load32(c, 4 * i);
      x[1 + i] = load32(k, 4 * i);
      x[6 + i] = load32(inp, 4 * i);
      x[11 + i] = load32(k, 16 + 4 * i);
    }
    for (i = 0; i < 16; i++) y[i] = x[i];
    for (i = 0; i < 20; i++) {
      for (j = 0; j < 4; j++) {
        for (m = 0; m < 4; m++) t[m] = x[(5 * j + 4 * m) % 16];
        t[1] ^= rotl((t[0] + t[3]) | 0, 7);
        t[2] ^= rotl((t[1] + t[0]) | 0, 9);
        t[3] ^= rotl((t[2] + t[1]) | 0, 13);
        t[0] ^= rotl((t[3] + t[2]) | 0, 18);
        for (m = 0; m < 4; m++) w[4 * j + (j + m) % 4] = t[m];
      }
      for (m = 0; m < 16; m++) x[m] = w[m];
    }
    if (hsalsa) {
      for (i = 0; i < 16; i++) x[i] = (x[i] + y[i]) | 0;
      for (i = 0; i < 4; i++) {
        x[5 * i] = (x[5 * i] - load32(c, 4 * i)) | 0;
        x[6 + i] = (x[6 + i] - load32(inp, 4 * i)) | 0;
      }
      for (i = 0; i < 4; i++) { store32(out, 4 * i, x[5 * i]); store32(out, 16 + 4 * i, x[6 + i]); }
    } else {
      for (i = 0; i < 16; i++) store32(out, 4 * i, (x[i] + y[i]) | 0);
    }
  }

  /* c[0..b) = m[0..b) XOR the Salsa20 stream for an 8-byte nonce n and a 32-byte key k (m null: the bare stream). */
  function salsaXor(c, m, b, n, k) {
    var z = new Uint8Array(16), x = new Uint8Array(64), pos = 0, u, i;
    for (i = 0; i < 8; i++) z[i] = n[i];
    while (b > 0) {
      salsaCore(x, z, k, SIGMA, false);
      var len = b < 64 ? b : 64;
      for (i = 0; i < len; i++) c[pos + i] = (m ? m[pos + i] : 0) ^ x[i];
      u = 1;
      for (i = 8; i < 16; i++) { u = (u + (z[i] & 0xff)) | 0; z[i] = u & 0xff; u >>>= 8; }
      b -= len; pos += len;
    }
  }

  /* XSalsa20: HSalsa20 turns the key and the nonce's first 16 bytes into a subkey; Salsa20 runs on the last 8. */
  function xsalsaXor(c, m, d, nonce, k) {
    var s = new Uint8Array(32);
    salsaCore(s, nonce, k, SIGMA, true);
    salsaXor(c, m, d, nonce.subarray(16, 24), s);
  }

  var MINUS_P = new Uint32Array([5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 252]);
  function add1305(h, c) { for (var j = 0, u = 0; j < 17; j++) { u = (u + ((h[j] + c[j]) | 0)) | 0; h[j] = u & 255; u >>>= 8; } }

  /* Poly1305 tag of m[mpos..mpos+n) under the 32-byte one-time key k, into out[outpos..outpos+16). */
  function poly1305(out, outpos, m, mpos, n, k) {
    var s, i, j, u;
    var x = new Uint32Array(17), r = new Uint32Array(17), h = new Uint32Array(17), c = new Uint32Array(17), g = new Uint32Array(17);
    for (j = 0; j < 16; j++) r[j] = k[j];
    r[3] &= 15; r[4] &= 252; r[7] &= 15; r[8] &= 252; r[11] &= 15; r[12] &= 252; r[15] &= 15;
    while (n > 0) {
      for (j = 0; j < 17; j++) c[j] = 0;
      for (j = 0; (j < 16) && (j < n); ++j) c[j] = m[mpos + j];
      c[j] = 1;
      mpos += j; n -= j;
      add1305(h, c);
      for (i = 0; i < 17; i++) {
        x[i] = 0;
        for (j = 0; j < 17; j++) x[i] = (x[i] + (h[j] * ((j <= i) ? r[i - j] : ((320 * r[i + 17 - j]) | 0))) | 0) | 0;
      }
      for (i = 0; i < 17; i++) h[i] = x[i];
      u = 0;
      for (j = 0; j < 16; j++) { u = (u + h[j]) | 0; h[j] = u & 255; u >>>= 8; }
      u = (u + h[16]) | 0; h[16] = u & 3;
      u = (5 * (u >>> 2)) | 0;
      for (j = 0; j < 16; j++) { u = (u + h[j]) | 0; h[j] = u & 255; u >>>= 8; }
      u = (u + h[16]) | 0; h[16] = u;
    }
    for (j = 0; j < 17; j++) g[j] = h[j];
    add1305(h, MINUS_P);
    s = (-(h[16] >>> 7) | 0);
    for (j = 0; j < 17; j++) h[j] ^= s & (g[j] ^ h[j]);
    for (j = 0; j < 16; j++) c[j] = k[j + 16];
    c[16] = 0;
    add1305(h, c);
    for (j = 0; j < 16; j++) out[outpos + j] = h[j];
  }

  /* Constant-time compare of 16 bytes: true when equal. */
  function same16(a, ai, b, bi) { var d = 0; for (var i = 0; i < 16; i++) d |= a[ai + i] ^ b[bi + i]; return d === 0; }

  /* secretbox: tag (16 bytes) then ciphertext, the layout nacl.secretbox returns. */
  function secretbox(message, nonce, key) {
    bytes(message, undefined, 'The message'); bytes(nonce, NONCE_BYTES, 'The nonce'); bytes(key, KEY_BYTES, 'The key');
    var d = ZERO_BYTES + message.length, m = new Uint8Array(d), c = new Uint8Array(d);
    m.set(message, ZERO_BYTES);
    xsalsaXor(c, m, d, nonce, key);
    poly1305(c, 16, c, 32, d - 32, c);
    return c.subarray(TAG_BYTES);
  }

  /* secretboxOpen: the message, or null when the tag does not match (wrong key, wrong nonce, or changed bytes). */
  function secretboxOpen(box, nonce, key) {
    bytes(box, undefined, 'The sealed bytes'); bytes(nonce, NONCE_BYTES, 'The nonce'); bytes(key, KEY_BYTES, 'The key');
    var d = TAG_BYTES + box.length;
    if (d < ZERO_BYTES) return null;
    var c = new Uint8Array(d), m = new Uint8Array(d), polyKey = new Uint8Array(32), tag = new Uint8Array(16);
    c.set(box, TAG_BYTES);
    xsalsaXor(polyKey, null, 32, nonce, key);
    poly1305(tag, 0, c, 32, d - 32, polyKey);
    if (!same16(c, 16, tag, 0)) return null;
    xsalsaXor(m, c, d, nonce, key);
    return m.subarray(ZERO_BYTES);
  }

  /* ---- X25519 (WebCrypto, built in) ---- */

  /* PKCS#8 wrapping of a raw 32-byte X25519 private key (RFC 8410): WebCrypto imports private keys only in this form or JWK. */
  var PKCS8_PREFIX = new Uint8Array([0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x6e, 0x04, 0x22, 0x04, 0x20]);
  var BASE_POINT = new Uint8Array(32); BASE_POINT[0] = 9;

  function importSecret(secretKey) {
    var pkcs8 = new Uint8Array(PKCS8_PREFIX.length + KEY_BYTES);
    pkcs8.set(PKCS8_PREFIX); pkcs8.set(secretKey, PKCS8_PREFIX.length);
    return subtle().subtle.importKey('pkcs8', pkcs8, { name: 'X25519' }, false, ['deriveBits']).catch(refuseOrBadKey);
  }
  function importPublic(publicKey) {
    return subtle().subtle.importKey('raw', publicKey.slice(), { name: 'X25519' }, false, []).catch(refuseOrBadKey);
  }
  /* A browser with no X25519 throws NotSupportedError; any other import failure is a bad key. */
  function refuseOrBadKey(error) { throw new Error(error && error.name === 'NotSupportedError' ? REFUSAL : BAD_KEY); }

  /* X25519(secretKey, publicKey), the raw 32-byte shared point. WebCrypto clamps the scalar as RFC 7748 says, as tweetnacl does. */
  function agree(secretKey, publicKey) {
    return Promise.resolve().then(function () {
      bytes(secretKey, KEY_BYTES, 'The secret key'); bytes(publicKey, KEY_BYTES, 'The public key');
      return Promise.all([importSecret(secretKey), importPublic(publicKey)]);
    }).then(function (keys) {
      return subtle().subtle.deriveBits({ name: 'X25519', public: keys[1] }, keys[0], 256).catch(function () { throw new Error(BAD_KEY); });
    }).then(function (bits) { return new Uint8Array(bits); });
  }

  /* The public key of a 32-byte secret key: X25519 with the base point 9, as nacl.box.keyPair.fromSecretKey gives. */
  function publicKeyOf(secretKey) { return agree(secretKey, BASE_POINT); }

  /* A new keypair: 32 random bytes and their public key, the shape nacl.box.keyPair() returns. */
  function keyPair() {
    var secretKey;
    return Promise.resolve().then(function () {
      secretKey = subtle().getRandomValues(new Uint8Array(KEY_BYTES));
      return publicKeyOf(secretKey);
    }).then(function (publicKey) { return { publicKey: publicKey, secretKey: secretKey }; });
  }

  /* The box's symmetric key: HSalsa20 of the shared point with a zero input, as nacl.box.before gives. */
  function before(publicKey, secretKey) {
    return agree(secretKey, publicKey).then(function (shared) {
      var k = new Uint8Array(32);
      salsaCore(k, new Uint8Array(16), shared, SIGMA, true);
      return k;
    });
  }

  function box(message, nonce, publicKey, secretKey) {
    return before(publicKey, secretKey).then(function (k) { return secretbox(message, nonce, k); });
  }

  /* The message, or null when it does not open: a wrong key, changed bytes, or a key WebCrypto refuses (BAD_KEY).
     A browser with no X25519 (REFUSAL) and a key of the wrong type or length still reject, as nacl.box.open throws. */
  function open(sealed, nonce, publicKey, secretKey) {
    return before(publicKey, secretKey).then(function (k) { return secretboxOpen(sealed, nonce, k); }, function (error) {
      if (error && error.message === BAD_KEY) return null;
      throw error;
    });
  }

  function randomNonce() { return subtle().getRandomValues(new Uint8Array(NONCE_BYTES)); }

  return Object.freeze({
    keyPair: keyPair,
    publicKeyOf: publicKeyOf,
    before: before,
    box: box,
    open: open,
    secretbox: secretbox,
    secretboxOpen: secretboxOpen,
    randomNonce: randomNonce,
    nonceLength: NONCE_BYTES,
    keyLength: KEY_BYTES,
    overheadLength: TAG_BYTES,
    REFUSAL: REFUSAL
  });
})();

// Identity bridge — adapts two different signer shapes to the one
// `{ pubHex, signText(asciiText): Promise<hexSig>, signBytes(bytes): Promise<hexSig> }`
// interface the NEW builders (`flx-transfer-builders.mjs`, `flx-dao-builders.mjs`)
// expect.
//
// This exists because the browser's v9 Auth Kit live identity signs via
// `who.sign(text): Promise<base64 sig>` / `who.signBytes(bytes): Promise<base64 sig>`
// — NOT a Web Crypto `CryptoKey` — while the pre-existing `flx-builders.mjs`
// path (driven by `flx-crypto.mjs`'s `generateKey()`/`loadOrCreateKey()`)
// is entirely `CryptoKey`-based and must keep working unchanged. Both
// signer shapes are adapted here to the SAME interface so the new builders
// never need to know which one is underneath.

import { signHex, signBytesHex, bytesToHex, hexToBytes } from "./flx-crypto.mjs";

/** Adapts an existing `flx-crypto.mjs` Web Crypto `CryptoKey` (from
 *  `generateKey()`/`loadOrCreateKey()`) to the `{pubHex, signText,
 *  signBytes}` interface, so code already holding one of those keys can
 *  drive the new builders without re-deriving or re-storing anything. */
export function cryptoKeySigner({ privateKey, pubHex }) {
  return {
    pubHex,
    signText: (text) => signHex(privateKey, text),
    signBytes: (bytes) => signBytesHex(privateKey, bytes),
  };
}

/** Adapts the browser's v9 Auth Kit live identity object (the one
 *  returned by `ArkUI.accountSession.current()` in
 *  `defxn/js/pages/account.js`, created by `ArkAdminAuth.create(...)` in
 *  `defxn/js/admin/auth.js`) to the `{pubHex, signText, signBytes}`
 *  interface.
 *
 *  CONFIRMED (not assumed) by reading `defxn/js/admin/auth.js` directly
 *  (grep `publicKeyB64`): the identity's keypair comes from tweetnacl's
 *  `nacl.sign.keyPair.fromSeed(...)`, whose `publicKey` is the raw 32-byte
 *  ed25519 public key, and `publicKeyB64` is built as
 *  `btoa(String.fromCharCode(...rawPublicKeyBytes))` — i.e. plain base64
 *  of those same 32 raw bytes, no DER/SPKI wrapping. So `base64ToHex(
 *  who.publicKeyB64)` below really is the hex the `G`/`pubHex` fields want.
 *  `who.signBytes` is likewise already present in that file, wrapping the
 *  identity's raw `sign(bytes)` and base64-encoding the 64-byte detached
 *  signature the same way.
 *
 *  `who.sign(text)` takes UTF-8-safe text only; dense-wire's grammar
 *  alphabet (`[A-Za-z0-9-]`) is always UTF-8-safe, so every manifest text
 *  this bridge signs is always fine for that path. `who.signBytes(bytes)`
 *  takes raw binary, used for the vote-covered-bytes signing in
 *  `flx-dao-builders.mjs`. */
export function authKitSigner(who) {
  return {
    pubHex: base64ToHex(who.publicKeyB64),
    signText: async (text) => base64ToHex(await who.sign(text)),
    signBytes: async (bytes) => base64ToHex(await who.signBytes(bytes)),
  };
}

/** Standard base64 -> lowercase hex, browser-native (`atob`) plus the
 *  `bytesToHex` already in `flx-crypto.mjs` — no external deps. */
export function base64ToHex(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytesToHex(bytes);
}

/** Lowercase hex -> standard base64, the inverse of [`base64ToHex`],
 *  reusing `flx-crypto.mjs`'s `hexToBytes`. */
export function hexToBase64(hex) {
  const bytes = hexToBytes(hex);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

// Web Crypto: Ed25519 keygen + sign + SHA-256 CID.
//
// LAW: no WASM. Native Web Crypto SubtleCrypto only.
//
// Browser support for native Ed25519 in Web Crypto:
//   * Chrome 113+, Edge 113+
//   * Firefox 130+
//   * Safari 17+ (desktop + iOS)
// If a device lacks native Ed25519, `supportsEd25519()` returns false and
// the page tells the user which browser version is required.

const KEYGEN_ALG = { name: "Ed25519" };

/** True if this browser can generate/sign with Ed25519 natively. */
export async function supportsEd25519() {
  try {
    // Feature-detect only; keypair is discarded. extractable=false here
    // matches the real `generateKey` so the detection path doesn't
    // succeed on a browser that would then fail the real path.
    await crypto.subtle.generateKey(KEYGEN_ALG, false, ["sign", "verify"]);
    return true;
  } catch {
    return false;
  }
}

/** Generate a fresh Ed25519 keypair. Returns { privateKey, publicKey, pubHex }
 *  where pubHex is the lowercase hex of the raw 32-byte public key (what
 *  our G block carries on the wire).
 *
 *  F1 fix (2026-10-09): extractable=false on the keypair means the
 *  *private* key cannot be exported by any script, including malicious
 *  JS injected via XSS. The *public* key is still exportable via its
 *  own `publicKey.extractable` which Web Crypto exposes separately on
 *  the derived handle. */
export async function generateKey() {
  const { privateKey, publicKey } = await crypto.subtle.generateKey(
    KEYGEN_ALG,
    false, // non-extractable: private key is sealed inside the handle
    ["sign", "verify"],
  );
  const pubHex = await exportRawPublicKeyHex(publicKey);
  return { privateKey, publicKey, pubHex };
}

/** Export the raw 32-byte public key as lowercase hex. */
export async function exportRawPublicKeyHex(publicKey) {
  const raw = await crypto.subtle.exportKey("raw", publicKey);
  return bytesToHex(new Uint8Array(raw));
}

/** Sign an ASCII message with a private Ed25519 key. Returns hex of the
 *  64-byte signature. */
export async function signHex(privateKey, messageAscii) {
  const sig = await crypto.subtle.sign(
    "Ed25519",
    privateKey,
    new TextEncoder().encode(messageAscii),
  );
  return bytesToHex(new Uint8Array(sig));
}

/** Sign arbitrary bytes with a private Ed25519 key. Used for the
 *  segment-covered-bytes signing path. */
export async function signBytesHex(privateKey, bytes) {
  const sig = await crypto.subtle.sign("Ed25519", privateKey, bytes);
  return bytesToHex(new Uint8Array(sig));
}

/** Verify an Ed25519 signature (hex) over a UTF-8 message with a raw
 *  32-byte public key given as hex. Native Web Crypto; false on any
 *  malformed key or signature rather than throwing. */
export async function verifyHex(pubHex, message, sigHex) {
  if (!/^[0-9a-f]{64}$/.test(pubHex ?? "") || !/^[0-9a-f]{128}$/.test(sigHex ?? "")) return false;
  try {
    const key = await crypto.subtle.importKey("raw", hexToBytes(pubHex), { name: "Ed25519" }, false, ["verify"]);
    return await crypto.subtle.verify({ name: "Ed25519" }, key, hexToBytes(sigHex), new TextEncoder().encode(message));
  } catch {
    return false;
  }
}

/** SHA-256 CID of an ASCII manifest. Lowercase hex. */
export async function sha256Hex(ascii) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(ascii),
  );
  return bytesToHex(new Uint8Array(digest));
}

/** Persist a keypair in IndexedDB so the same browser becomes the same
 *  signer across reloads. The private CryptoKey is stored as a
 *  non-extractable key handle — it never leaves the browser. */
const DB_NAME = "defxn-node";
const STORE = "keys";
const KEY_ID = "signer";

export async function loadOrCreateKey() {
  const db = await openDb();
  const existing = await getRecord(db, KEY_ID);
  if (existing?.privateKey?.extractable === false) {
    return {
      privateKey: existing.privateKey,
      publicKey: existing.publicKey,
      pubHex: existing.pubHex,
    };
  }

  // F1 migration: keys created before 2026-10-09 were persisted with
  // extractable=true. Keeping one would leave an upgraded browser just as
  // exposed as before, so rotate it once instead of reporting the future
  // key-generation fix as protection for an unsafe existing identity.
  const fresh = await generateKey();
  await putRecord(db, {
    id: KEY_ID,
    privateKey: fresh.privateKey,
    publicKey: fresh.publicKey,
    pubHex: fresh.pubHex,
  });
  return fresh;
}

export async function clearKey() {
  const db = await openDb();
  await new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(KEY_ID);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

function openDb() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
function getRecord(db, id) {
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => res(req.result || null);
    req.onerror = () => rej(req.error);
  });
}
function putRecord(db, record) {
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

export function bytesToHex(bytes) {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}
export function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

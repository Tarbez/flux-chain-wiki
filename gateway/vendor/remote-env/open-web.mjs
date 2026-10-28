// Opening a sealed file with WebCrypto only (2026-10-29): the same bytes epoch.mjs, sealed-grant.mjs and
// artifact.mjs write, read in a web page or in Node through globalThis.crypto.subtle. No node: import, so a
// browser loads this file as it is. The DEFXN gateway's tester page vendors it byte for byte
// (flux/defxn/gateway/vendor/remote-env/); fix it here and copy it over.
//
// What it opens: a grant of algorithm x25519-hkdf-sha256-aes-256-gcm, and a chunk frame of version 2 (AES-256-GCM).
// What it refuses: the XChaCha20-Poly1305 kinds (grant algorithm x25519-hkdf-sha256-xchacha20-poly1305, frame
// version 1). WebCrypto has no ChaCha20-Poly1305 in any browser, and this stack never runs pure-JS or WASM crypto
// on a live path, so those open only in Node or Electron (artifact.mjs, with libsodium where BoringSSL lacks it).
//
// The steps, all native: Ed25519 verify (the epoch's signature), SHA-256 (the epoch's own CID), X25519 deriveBits
// (the shared secret), HKDF-SHA-256 (the key that wraps the content key), AES-GCM decrypt (the grant, then every
// chunk). Every failure throws an OpenError whose message names the failure, what is missing and the remedy.

export const GRANT_ALGORITHM_AES = 'x25519-hkdf-sha256-aes-256-gcm';
export const GRANT_ALGORITHM_XCHACHA = 'x25519-hkdf-sha256-xchacha20-poly1305';
// Equal to sealed-grant.mjs GRANT_INFO_AES.
const GRANT_INFO_AES = 'flux.remote-env.sealed-grant.aes-256-gcm.v1';
export const FRAME_VERSION_XCHACHA = 1;
export const FRAME_VERSION_AES = 2;
const MAGIC = 'FLXAEADv';
const HEADER_SIZE = 8 + 4 + 4 + 24 + 8 + 4;
const TAG = 16;
// PKCS#8 for an X25519 private key: a fixed 16-byte prefix, then the 32 key bytes (sealed-release.js uses the same).
const X25519_PKCS8_PREFIX = [0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x6e, 0x04, 0x22, 0x04, 0x20];

export class OpenError extends Error {
  constructor(code, failure, missing, remedy) {
    super(`${failure} Missing: ${missing} To fix: ${remedy}`);
    this.name = 'OpenError';
    Object.assign(this, { code, failure, missing, remedy });
  }
}

const subtle = () => globalThis.crypto?.subtle;
const utf8 = (text) => new TextEncoder().encode(text);

function concat(...parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const part of parts) { out.set(part, at); at += part.length; }
  return out;
}

export function bytesOfBase64(text) {
  const binary = atob(String(text).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

export function base64OfBytes(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function hexOfBytes(bytes) {
  let out = '';
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0');
  return out;
}

function bytesOfHex(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

// The canonical JSON the epoch is signed and addressed over. The one rule lives in
// flux/defi-library/src/canonicalAddressing.mjs; that file imports node:crypto at its top, so a browser cannot
// load it, and this is the same three lines. The comparison against epoch.mjs's verifyEpoch checks they agree.
function stableStringify(v) {
  return Array.isArray(v)
    ? `[${v.map(stableStringify).join(',')}]`
    : v && typeof v === 'object'
      ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(v[k])}`).join(',')}}`
      : JSON.stringify(v);
}

/**
 * Which of the five native operations this runtime has. -> { ok: true } | { ok: false, missing: [names] }.
 * Each is tried, not assumed: X25519 and Ed25519 reached Safari and Firefox later than AES-GCM did.
 */
export async function webCryptoSupport() {
  const s = subtle();
  if (!s) return { ok: false, missing: ['WebCrypto (crypto.subtle), which a page has only over https'] };
  const missing = [];
  const tryOp = async (name, op) => { try { await op(); } catch { missing.push(name); } };
  await tryOp('X25519', () => s.generateKey({ name: 'X25519' }, true, ['deriveBits']));
  await tryOp('Ed25519', () => s.importKey('raw', new Uint8Array(32).fill(1), { name: 'Ed25519' }, false, ['verify']));
  await tryOp('HKDF', () => s.importKey('raw', new Uint8Array(32), 'HKDF', false, ['deriveBits']));
  await tryOp('AES-GCM', () => s.importKey('raw', new Uint8Array(32), { name: 'AES-GCM' }, false, ['decrypt']));
  return missing.length ? { ok: false, missing } : { ok: true };
}

/** The X25519 public key of a 32-byte private key, raw (32 bytes). JWK export carries it as `x`. */
async function x25519PublicOf(privateRaw) {
  const key = await subtle().importKey('pkcs8', concat(Uint8Array.from(X25519_PKCS8_PREFIX), privateRaw), { name: 'X25519' }, true, ['deriveBits']);
  const jwk = await subtle().exportKey('jwk', key);
  return bytesOfBase64(jwk.x);
}

/**
 * A tester from a key file's text (64 lowercase hex, as `bundle-deploy tester-key` writes it):
 * { identityId, privateKey (non-extractable CryptoKey), publicKeyRaw }.
 */
export async function testerFromKeyTextWeb(identityId, keyText) {
  const hex = String(keyText).trim();
  if (!/^[0-9a-f]{64}$/.test(hex)) {
    throw new OpenError('TESTER_KEY_FORMAT', 'The tester key file is not 64 lowercase hex characters.', 'the key file this page or bundle-deploy tester-key saved.', 'choose that file.');
  }
  const raw = bytesOfHex(hex);
  try {
    const publicKeyRaw = await x25519PublicOf(raw);
    const privateKey = await subtle().importKey('pkcs8', concat(Uint8Array.from(X25519_PKCS8_PREFIX), raw), { name: 'X25519' }, false, ['deriveBits']);
    return { identityId, privateKey, publicKeyRaw };
  } finally {
    raw.fill(0);
  }
}

/**
 * A new tester key, made here: { keyText (the key file's contents, 64 hex and a newline), line (identity id, a tab,
 * the X25519 public key in base64) }: the same two strings sealed-release.js newTesterKey returns.
 */
export async function newTesterKeyWeb(identityId) {
  const raw = globalThis.crypto.getRandomValues(new Uint8Array(32));
  const keyText = `${hexOfBytes(raw)}\n`;
  const publicKeyRaw = await x25519PublicOf(raw);
  raw.fill(0);
  return { keyText, line: `${identityId}\t${base64OfBytes(publicKeyRaw)}` };
}

/** Checks the epoch's CID and its Ed25519 signature, as epoch.mjs verifyEpoch does. Throws OpenError. */
export async function verifyEpochWeb(record) {
  if (record?.schema !== 'flux.content-key-epoch.v1') throw new OpenError('EPOCH_SCHEMA', 'The key epoch is not a flux.content-key-epoch.v1 record.', 'the epoch the release names.', 'read the release again.');
  const { cid, signatureB64, ...view } = record;
  const digest = new Uint8Array(await subtle().digest('SHA-256', utf8(stableStringify({ ...view, signatureB64 }))));
  if (`sha256:${hexOfBytes(digest)}` !== cid) throw new OpenError('EPOCH_CID_MISMATCH', 'The key epoch does not hash to its own CID.', 'an unaltered epoch.', 'read the release again. If it repeats, tell the owner.');
  let ok = false;
  try {
    const key = await subtle().importKey('raw', bytesOfBase64(record.signerPublicKey), { name: 'Ed25519' }, false, ['verify']);
    ok = await subtle().verify({ name: 'Ed25519' }, key, bytesOfBase64(signatureB64), utf8(stableStringify(view)));
  } catch { ok = false; }
  if (!ok) throw new OpenError('EPOCH_SIGNATURE', 'The key epoch\'s signature does not verify.', 'an epoch signed by its signerPublicKey.', 'read the release again. If it repeats, tell the owner.');
}

/**
 * The content key of a verified epoch for `recipient` (testerFromKeyTextWeb), as a non-extractable AES-GCM key.
 * Verifies the epoch first. Throws OpenError: EPOCH_NO_GRANT, EPOCH_IDENTITY_REVOKED, GRANT_NEEDS_CHACHA,
 * GRANT_AUTH_FAILED (the key file does not open the grant).
 */
export async function openContentKeyWeb({ epochRecord, recipient }) {
  await verifyEpochWeb(epochRecord);
  const id = recipient.identityId;
  if ((epochRecord.revokedIdentityIds || []).includes(id)) {
    throw new OpenError('EPOCH_IDENTITY_REVOKED', `${id} is removed from this release's tester group.`, 'a grant for this identity.', 'ask the owner to add you again and release again.');
  }
  const grant = (epochRecord.grants || []).find((g) => g.identityId === id);
  if (!grant) throw new OpenError('EPOCH_NO_GRANT', `${id} is not in this release's tester group.`, 'a grant for this identity in the release.', 'check the identity id you typed. If it is right, ask the owner to add your line and release again.');
  if (grant.algorithm !== GRANT_ALGORITHM_AES) {
    throw new OpenError('GRANT_NEEDS_CHACHA', `This release was sealed with ${grant.algorithm === undefined || grant.algorithm === GRANT_ALGORITHM_XCHACHA ? 'XChaCha20-Poly1305' : grant.algorithm}, which a browser cannot open with its own crypto.`, 'a release sealed with AES-256-GCM.', 'ask the owner to release again with Bundles, which seals with AES-256-GCM.');
  }
  const s = subtle();
  const ephemeralRaw = bytesOfBase64(grant.ephemeralPublicKey);
  let shared;
  let contentRaw;
  try {
    const ephemeral = await s.importKey('raw', ephemeralRaw, { name: 'X25519' }, false, []);
    shared = new Uint8Array(await s.deriveBits({ name: 'X25519', public: ephemeral }, recipient.privateKey, 256));
    const ikm = await s.importKey('raw', shared, 'HKDF', false, ['deriveBits']);
    const kekRaw = await s.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: concat(recipient.publicKeyRaw, ephemeralRaw), info: utf8(GRANT_INFO_AES) }, ikm, 256);
    const kek = await s.importKey('raw', kekRaw, { name: 'AES-GCM' }, false, ['decrypt']);
    new Uint8Array(kekRaw).fill(0);
    const aad = concat(utf8(grant.epochId), new Uint8Array([0]), utf8(grant.identityId));
    contentRaw = new Uint8Array(await s.decrypt({ name: 'AES-GCM', iv: bytesOfBase64(grant.nonceB64), additionalData: aad, tagLength: 128 }, kek, concat(bytesOfBase64(grant.ciphertextB64), bytesOfBase64(grant.tagB64))));
  } catch {
    throw new OpenError('GRANT_AUTH_FAILED', `The key file does not open the grant for ${id}.`, 'the key file that made the line the owner added for this identity.', 'choose that key file, or make a new key and send the owner its line.');
  } finally {
    shared?.fill(0);
  }
  try {
    return await s.importKey('raw', contentRaw, { name: 'AES-GCM' }, false, ['decrypt']);
  } finally {
    contentRaw.fill(0);
  }
}

function chunkNonce12(baseNonce, chunkIndex) {
  const nonce = baseNonce.slice(0, 12);
  let index = BigInt(chunkIndex);
  for (let i = 11; i >= 4; i -= 1) { nonce[i] ^= Number(index & 0xffn); index >>= 8n; }
  return nonce;
}

function chunkAad(chunkIndex, plaintextTotal) {
  const aad = new Uint8Array(16);
  const view = new DataView(aad.buffer);
  view.setBigUint64(0, BigInt(chunkIndex));
  view.setBigUint64(8, BigInt(plaintextTotal));
  return aad;
}

/**
 * A frame opener fed the frame's bytes in order, in pieces of any size (the release's blocks).
 * `push(bytes)` resolves to the plaintext chunks those bytes completed (Uint8Array[]); `finish()` throws unless
 * every chunk arrived and nothing followed. `header` is set once 52 bytes have arrived. Holds at most one piece
 * plus one chunk.
 */
export function createFrameOpener(contentKey) {
  let carry = new Uint8Array(0);
  let header = null;
  let index = 0;
  let done = false;
  const opener = {
    get header() { return header; },
    async push(bytes) {
      if (done && bytes.length) throw new OpenError('FRAME_TRAILING', 'The download carries bytes after the frame\'s last chunk.', 'a frame that ends where its header says.', 'download again.');
      carry = carry.length ? concat(carry, bytes) : bytes;
      let at = 0;
      if (!header) {
        if (carry.length < HEADER_SIZE) return [];
        const view = new DataView(carry.buffer, carry.byteOffset, HEADER_SIZE);
        if (String.fromCharCode(...carry.subarray(0, 8)) !== MAGIC) throw new OpenError('FRAME_MAGIC', 'The download is not a sealed frame.', 'the frame the release names.', 'download again.');
        const version = view.getUint32(8, true);
        if (version === FRAME_VERSION_XCHACHA) throw new OpenError('GRANT_NEEDS_CHACHA', 'This release was sealed with XChaCha20-Poly1305, which a browser cannot open with its own crypto.', 'a release sealed with AES-256-GCM.', 'ask the owner to release again with Bundles, which seals with AES-256-GCM.');
        if (version !== FRAME_VERSION_AES) throw new OpenError('FRAME_VERSION', `The frame is version ${version}, which this page does not know.`, 'frame version 2.', 'use bundle-deploy open-sealed, or a newer page.');
        header = {
          version,
          chunkSize: view.getUint32(12, true),
          baseNonce: carry.slice(16, 40),
          plaintextTotal: Number(view.getBigUint64(40, true)),
          chunkCount: view.getUint32(48, true),
        };
        at = HEADER_SIZE;
      }
      const out = [];
      while (index < header.chunkCount) {
        const pt = Math.min(header.chunkSize, header.plaintextTotal - index * header.chunkSize);
        if (carry.length - at < pt + TAG) break;
        try {
          out.push(new Uint8Array(await subtle().decrypt(
            { name: 'AES-GCM', iv: chunkNonce12(header.baseNonce, index), additionalData: chunkAad(index, header.plaintextTotal), tagLength: 128 },
            contentKey, carry.subarray(at, at + pt + TAG),
          )));
        } catch {
          throw new OpenError('CHUNK_AUTH_FAILED', `Chunk ${index + 1} of ${header.chunkCount} fails its check.`, 'the exact frame the owner sealed.', 'download again. Do not use any part of this file.');
        }
        at += pt + TAG;
        index += 1;
      }
      if (index === header.chunkCount) done = true;
      carry = carry.slice(at);
      if (done && carry.length) throw new OpenError('FRAME_TRAILING', 'The download carries bytes after the frame\'s last chunk.', 'a frame that ends where its header says.', 'download again.');
      return out;
    },
    finish() {
      if (!header || !done) throw new OpenError('FRAME_TRUNCATED', `The frame ended after ${index} of ${header?.chunkCount ?? '?'} chunks.`, 'every chunk of the frame.', 'download again.');
      return { plaintextTotal: header.plaintextTotal, chunkCount: header.chunkCount };
    },
  };
  return opener;
}

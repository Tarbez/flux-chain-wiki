/* =====================================================================
   APP RELEASE: one exact build of an app (the FXN Browser's .dmg, the
   miner desktop's .zip), published as a Bundles release.
   ---------------------------------------------------------------------
   Owner ruling 2026-10-25 (naming ledger D30, docs/FLX_FORMAT_EXTENSIONS_v0.md):
   an app release is a Bundle, not a Package. Packages (KPKGV1) are libraries.

   Shape. The app's bytes never enter a record. They go to the byte store as
   fixed-size blocks, each filed under its BLAKE3 content ID, and the release
   is one KBUNDLE1 record whose payload lists those IDs in order (dense
   encoding v4.1 case 3: long content is a reference). The record costs a few
   hundred bytes; the bytes stay raw.

   Trust. Three checks, all needed:
     1. `signature` is `ownerPublicKey`'s Ed25519 signature over
        appReleaseSigningText(fields): the release does not depend on the node.
     2. the record's outer dense-wire signer is that same key.
     3. that key owns `name` in the one name system (DOM_WHO), checked by the
        reader (release-readers.mjs). A client may also pin publisher keys.

   Order. `sequence` is a whole number that only goes up, per (name, product,
   channel). A reader keeps the highest; a client refuses one that does not
   advance past the highest it has accepted (the rollback guard).

   Pure and browser-safe: no node: imports, WebCrypto only. The site at
   browser.fxn, the updater and this package all use this one file.
   ===================================================================== */

export const APP_RELEASE_SCHEMA = 'flux.app-release.v1';
const SIGNING_DOMAIN = 'flux-app-release/1\n';

/** 8 MiB: two blocks fit one put-batch request (base64 inside JSON, 24 MiB body limit). */
export const APP_BLOCK_BYTES = 8 * 1024 * 1024;

// The signed fields, in the one order the signing text uses.
export const APP_RELEASE_FIELDS = Object.freeze([
  'schema', 'name', 'product', 'channel', 'version', 'sequence', 'platform', 'arch',
  'filename', 'size', 'sha256', 'blockBytes', 'blocks', 'publishedAt', 'ownerPublicKey', 'sealed',
]);

/* Sealed releases (2026-10-26): a closed tester group's release. The blocks hold an encrypted frame (Remote's
   `xchacha20-poly1305` chunk frame, flux/remote-env src/crypto/artifact.mjs); `size` and `sha256` describe that
   frame. `sealed` names Remote's signed key epoch (stored as a blob, one sealed copy of the content key per tester)
   and the plaintext the frame opens to. A public release has no `sealed`, and its signing text is unchanged:
   JSON drops an undefined field.
   Since 2026-10-29 a sealed release may also be Remote's frame version 2 (AES-256-GCM), and new sealed releases
   are: a tester opens it in a web page with the browser's own crypto (remote-env src/crypto/open-web.mjs), and
   browsers have no ChaCha20-Poly1305. Releases sealed before then stay valid and open in Node and Electron. */
export const SEALED_ALGORITHM_XCHACHA = 'xchacha20-poly1305-chunked/1';
export const SEALED_ALGORITHM_AES = 'aes-256-gcm-chunked/1';
/** What a new sealed release is sealed with. */
export const SEALED_ALGORITHM = SEALED_ALGORITHM_AES;
/** Every algorithm a sealed release may name. */
export const SEALED_ALGORITHMS = Object.freeze([SEALED_ALGORITHM_XCHACHA, SEALED_ALGORITHM_AES]);

const CID = /^[0-9a-f]{64}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const NAME = /^[a-z0-9][a-z0-9-]{0,62}\.(fxn|ark)$/;
const WORD = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const VERSION = /^\d+\.\d+\.\d+(-[0-9a-z.-]+)?$/i;
const FILENAME = /^[A-Za-z0-9][A-Za-z0-9 ._+-]{0,199}$/;

function base64Bytes(text) {
  try {
    const binary = atob(text);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

/** The fields alone, in signing order (drops `signature` and anything unknown). */
export function appReleaseFields(value) {
  const out = {};
  for (const key of APP_RELEASE_FIELDS) out[key] = value?.[key];
  return out;
}

/** The exact text the owner signs: a domain line, then the fields as JSON (the hashing form). */
export function appReleaseSigningText(value) {
  return SIGNING_DOMAIN + JSON.stringify(appReleaseFields(value));
}

/**
 * Every problem with the fields, as sentences; an empty list means the shape is right.
 * It checks shape only. Signature and ownership are separate checks.
 */
export function appReleaseProblems(value) {
  const f = value || {};
  const problems = [];
  if (f.schema !== APP_RELEASE_SCHEMA) problems.push(`schema is ${JSON.stringify(f.schema)}, not ${APP_RELEASE_SCHEMA}`);
  if (!NAME.test(f.name || '')) problems.push('name is not one label plus .fxn or .ark');
  for (const key of ['product', 'channel', 'platform', 'arch']) if (!WORD.test(f[key] || '')) problems.push(`${key} is not a lowercase word`);
  if (!VERSION.test(f.version || '')) problems.push('version is not major.minor.patch');
  if (!Number.isSafeInteger(f.sequence) || f.sequence < 1) problems.push('sequence is not a whole number of 1 or more');
  if (!FILENAME.test(f.filename || '')) problems.push('filename is empty or carries a path or an unsafe character');
  if (!Number.isSafeInteger(f.size) || f.size < 1) problems.push('size is not a whole number of bytes');
  if (!SHA256.test(f.sha256 || '')) problems.push('sha256 is not 64 lowercase hex');
  if (f.blockBytes !== APP_BLOCK_BYTES) problems.push(`blockBytes is ${f.blockBytes}, not ${APP_BLOCK_BYTES}`);
  if (!Array.isArray(f.blocks) || !f.blocks.length || !f.blocks.every((c) => CID.test(c))) {
    problems.push('blocks is not a list of BLAKE3 content IDs');
  } else if (Number.isSafeInteger(f.size) && f.blocks.length !== Math.ceil(f.size / APP_BLOCK_BYTES)) {
    problems.push(`blocks lists ${f.blocks.length} IDs, and ${f.size} bytes need ${Math.ceil(f.size / APP_BLOCK_BYTES)}`);
  }
  if (typeof f.publishedAt !== 'string' || Number.isNaN(Date.parse(f.publishedAt))) problems.push('publishedAt is not a date');
  if (base64Bytes(f.ownerPublicKey || '')?.length !== 32) problems.push('ownerPublicKey is not a 32-byte base64 Ed25519 key');
  if (f.sealed !== undefined) {
    const s = f.sealed;
    if (!s || typeof s !== 'object' || !SEALED_ALGORITHMS.includes(s.algorithm)) problems.push(`sealed.algorithm is not one of ${SEALED_ALGORITHMS.join(', ')}`);
    else {
      if (!CID.test(s.epochCid || '')) problems.push('sealed.epochCid is not a BLAKE3 content ID');
      if (!Number.isSafeInteger(s.plaintextSize) || s.plaintextSize < 0) problems.push('sealed.plaintextSize is not a whole number of bytes');
      if (!SHA256.test(s.plaintextSha256 || '')) problems.push('sealed.plaintextSha256 is not 64 lowercase hex');
    }
  }
  return problems;
}

/** Resolves true only for `ownerPublicKey`'s valid Ed25519 signature over the signing text. Await it. */
export async function appReleaseSignatureVerifies(value) {
  const key = base64Bytes(value?.ownerPublicKey || '');
  const signature = base64Bytes(value?.signature || '');
  if (key?.length !== 32 || signature?.length !== 64) return false;
  try {
    const publicKey = await crypto.subtle.importKey('raw', key, { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify({ name: 'Ed25519' }, publicKey, signature, new TextEncoder().encode(appReleaseSigningText(value)));
  } catch {
    return false;
  }
}

/** The 64-hex form of a 32-byte base64 key, to compare with a dense-wire `G` signer. */
export function keyHexOfBase64(b64) {
  const bytes = base64Bytes(b64 || '');
  if (!bytes) return '';
  let hex = '';
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0');
  return hex;
}

/**
 * Sorts every app release of `want` among decoded chain rows into counted and rejected.
 * `want` = { name, product, channel, platform, arch, sealed }; `ownerHex` is the name's owner key as
 * 64 hex, from DOM_WHO (release-readers.mjs) or a verified DOM_PROOF (the gateway).
 * A row is { cid, signer (the record's G block), value, atSec, pos }. Returns { releases, rejected }.
 * A sealed release counts only for a reader that asks for sealed ones (`want.sealed`), and a public
 * one only for a reader that does not: a public updater must never install a frame it cannot open.
 */
export async function settleAppReleases(rows, want, ownerHex) {
  const releases = [];
  const rejected = [];
  for (const row of rows) {
    const value = row?.value;
    if (!value || typeof value !== 'object' || value.schema !== APP_RELEASE_SCHEMA) continue;
    if (value.name !== want.name || value.product !== want.product || value.channel !== want.channel) continue;
    if (value.platform !== want.platform || value.arch !== want.arch) continue;
    if ((value.sealed !== undefined) !== Boolean(want.sealed)) continue;
    const reject = (why) => rejected.push({ recordCid: row.cid, version: value.version ?? null, sequence: value.sequence ?? null, why });
    const problems = appReleaseProblems(value);
    if (problems.length) { reject(`its fields are wrong: ${problems.join('; ')}`); continue; }
    if (!(await appReleaseSignatureVerifies(value))) { reject('its signature does not verify against its ownerPublicKey'); continue; }
    const keyHex = keyHexOfBase64(value.ownerPublicKey);
    if (row.signer !== keyHex) { reject(`the record was carried by ${row.signer}, not by its signer ${keyHex}`); continue; }
    if (keyHex !== ownerHex) { reject(`it is signed by ${keyHex}, which does not own ${want.name} (owner ${ownerHex})`); continue; }
    releases.push({ ...value, recordCid: row.cid, atSec: row.atSec, pos: row.pos });
  }
  return { releases, rejected };
}

/**
 * The release with the highest sequence: { ok: true, release }, or { ok: false, code, ... }
 * when there is none (NO_RELEASE) or two share the top sequence (RELEASE_CONFLICT). A conflict
 * is refused, never decided by picking one.
 */
export function latestAppRelease(releases) {
  if (!releases.length) return { ok: false, code: 'NO_RELEASE' };
  const top = Math.max(...releases.map((r) => r.sequence));
  const atTop = releases.filter((r) => r.sequence === top);
  if (atTop.length > 1) return { ok: false, code: 'RELEASE_CONFLICT', sequence: top, conflicting: atTop };
  return { ok: true, release: atTop[0] };
}

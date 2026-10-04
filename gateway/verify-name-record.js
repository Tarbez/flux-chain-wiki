/* Browser-safe port of bundle-deploy/src/name-record.js + ed25519.js (read
   2026-10-04). Those files are Node-only in two spots that don't exist in a
   browser: ed25519.js's verify uses node:crypto's createPublicKey/verify, and
   both files use Buffer for base64. Everything else -- canonicalization, the
   signing-message byte shape, the field set -- is copied verbatim and must
   stay byte-for-byte identical to the source (that wire format is shared
   with ark-browser's own implementation; diverging here breaks interop with
   every miner, not just this page).

   Copy, cite, don't diverge. If bundle-deploy/src/name-record.js changes its
   canonical field order or signing message shape, this copy needs the same
   change, by hand, with this citation re-dated.

   Ed25519 verification via Web Crypto's SubtleCrypto -- the same surface
   CMS-ARK's overlay.ts already relies on for this exact purpose (see that
   file's own header comment). Supported in current Chrome, Firefox and
   Safari; this is the one piece of this page that has a real browser-support
   floor, unlike the rest of the gateway shell. */

const SUPPORTED_TLDS = new Set(["ark", "deadark", "fxn"]);
const TARGET_TYPES = new Set(["ipns", "ipfs_cid", "hyper", "https_redirect"]);
const LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

function base64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function verifyEd25519RawB64({ messageBytes, signatureB64, publicKeyB64 }) {
  try {
    const publicKeyBytes = base64ToBytes(publicKeyB64);
    if (publicKeyBytes.length !== 32) return false;
    const signatureBytes = base64ToBytes(signatureB64);
    if (signatureBytes.length !== 64) return false;
    const key = await crypto.subtle.importKey("raw", publicKeyBytes, { name: "Ed25519" }, false, ["verify"]);
    return await crypto.subtle.verify({ name: "Ed25519" }, key, signatureBytes, messageBytes);
  } catch {
    return false;
  }
}

export function normalizeName(input) {
  if (typeof input !== "string") throw new Error("Name must be a string.");
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Name must not be empty.");
  if (trimmed.includes("://") || trimmed.includes("/") || trimmed.includes("?") || trimmed.includes("#")) {
    throw new Error("Name must be a bare .ark, .deadark or .fxn hostname.");
  }
  if (trimmed.startsWith(".") || trimmed.endsWith(".")) throw new Error("Name must not start or end with a dot.");
  const lower = trimmed.toLowerCase();
  const parts = lower.split(".");
  if (parts.length !== 2) throw new Error("Name must contain exactly one label and one supported TLD.");
  const [label, tld] = parts;
  if (!SUPPORTED_TLDS.has(tld)) throw new Error(`Unsupported TLD: .${tld}`);
  if (!LABEL_PATTERN.test(label)) throw new Error("Name label must use lowercase ASCII letters, digits, and internal hyphens only.");
  return { name: `${label}.${tld}`, label, tld };
}

function validateTarget(target) {
  if (!target || typeof target !== "object" || Array.isArray(target)) throw new Error("Each target must be an object.");
  if (!TARGET_TYPES.has(target.type)) throw new Error(`Unsupported target type: ${target.type}`);
  const value = typeof target.value === "string" ? target.value.trim() : "";
  if (!value) throw new Error(`Target ${target.type} must have a non-empty string value.`);
  return { type: target.type, value };
}

function validateProof(proof) {
  if (!proof || typeof proof !== "object" || Array.isArray(proof)) throw new Error("proof must be an object.");
  if (proof.alg !== "Ed25519") throw new Error("proof.alg must be Ed25519.");
  const sig = typeof proof.sig === "string" ? proof.sig.trim() : "";
  if (!sig) throw new Error("proof.sig must be a non-empty string.");
  return { alg: "Ed25519", sig };
}

function validateCoSigners(coSigners, ownerPublicKey) {
  if (coSigners === undefined) return [];
  if (!Array.isArray(coSigners)) throw new Error("coSigners must be an array.");
  const seen = new Set();
  const cleaned = coSigners.map((entry) => {
    const key = typeof entry === "string" ? entry.trim() : "";
    if (!key) throw new Error("Each coSigners entry must be a non-empty string.");
    if (key === ownerPublicKey) throw new Error("coSigners must not duplicate ownerPublicKey.");
    if (seen.has(key)) throw new Error("coSigners must not contain duplicate keys.");
    seen.add(key);
    return key;
  });
  return cleaned.sort();
}

export function canonicalizeNameRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("Record must be an object.");
  const normalized = normalizeName(record.name);
  const ownerPublicKey = typeof record.ownerPublicKey === "string" ? record.ownerPublicKey.trim() : "";
  if (!ownerPublicKey) throw new Error("ownerPublicKey must be a non-empty string.");
  if (!Number.isInteger(record.version) || record.version < 1) throw new Error("version must be a positive integer.");
  const updatedAt = typeof record.updatedAt === "string" ? record.updatedAt.trim() : "";
  if (!updatedAt || Number.isNaN(Date.parse(updatedAt))) throw new Error("updatedAt must be a valid ISO-8601 timestamp string.");
  if (!Array.isArray(record.targets) || record.targets.length === 0) throw new Error("targets must be a non-empty array.");
  return {
    name: normalized.name, ownerPublicKey, version: record.version, updatedAt,
    targets: record.targets.map(validateTarget), coSigners: validateCoSigners(record.coSigners, ownerPublicKey),
    proof: validateProof(record.proof),
  };
}

export function buildNameRecordSigningMessage(record) {
  const canonical = canonicalizeNameRecord(record);
  const payload = { name: canonical.name, ownerPublicKey: canonical.ownerPublicKey, version: canonical.version, updatedAt: canonical.updatedAt, targets: canonical.targets };
  if (canonical.coSigners.length > 0) payload.coSigners = canonical.coSigners;
  return JSON.stringify(payload);
}

/* Read-side gate: shape validation plus real Ed25519 signature verification
   against the record's own ownerPublicKey or any of its coSigners. Fails
   closed: resolves null for anything missing, malformed, or signed by a key
   other than one of those. Async because Web Crypto's verify is Promise-based
   (unlike Node's sync node:crypto verify this was ported from). */
export async function verifyNameRecord(record) {
  let canonical;
  try { canonical = canonicalizeNameRecord(record); } catch { return null; }
  const messageBytes = new TextEncoder().encode(buildNameRecordSigningMessage(canonical));
  const candidates = [canonical.ownerPublicKey, ...canonical.coSigners];
  for (const publicKeyB64 of candidates) {
    if (await verifyEd25519RawB64({ messageBytes, signatureB64: canonical.proof.sig, publicKeyB64 })) return canonical;
  }
  return null;
}

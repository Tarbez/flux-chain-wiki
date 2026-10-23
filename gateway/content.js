/* A site's bytes, fetched by content ID and checked before anything uses them. Pure: no DOM, so it is
   tested in Node (tests/gateway-content.test.mjs) and used by app.js.

   A name's record points at a site with a blake3_cid target: the BLAKE3 hash of the site archive, which is
   the ID the byte store (flxd-blockstore, `fxn --roles store`) files it under. The node's web server answers
   GET /fxn-store/v1/<cid> from the store's own get (the Caddy block is in
   docs/DEVNET-FLEET-RUNBOOK-2026-10-23.md); the store itself stays on loopback. The answer is the store's
   wire body, {"ok": true, "data_base64": ...}.

   The node is not trusted: the bytes must hash to the ID the verified record names, or the page refuses to
   render them. WebCrypto has no BLAKE3, so the hash is flx-codec's (vendor/flx-codec/blake3.js, the
   workspace's one JavaScript BLAKE3, checked there against the Rust implementation). Until 2026-10-23 this
   shell read an ipfs_cid target and fetched /explorer/v1/content/<cid> from the miner, unchecked. */
import { blake3 } from "./vendor/flx-codec/blake3.js";

export const CONTENT_ROUTE = "/fxn-store/v1/";

const CID_PATTERN = /^[0-9a-f]{64}$/;

export function hexOf(bytes) {
  let out = "";
  for (const byte of bytes) out += byte.toString(16).padStart(2, "0");
  return out;
}

function bytesOfBase64(text) {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** -> { ok: true, bytes } | { ok: false, reason, detail }   reason is one of app.js's FAILURE_MESSAGES keys */
export async function fetchVerifiedContent(cid, { fetchImpl = (url) => fetch(url) } = {}) {
  if (!CID_PATTERN.test(cid || "")) {
    return { ok: false, reason: "CONTENT_MALFORMED", detail: `The record's blake3_cid target ${JSON.stringify(cid)} is not 64 lowercase hex.` };
  }
  let response;
  try {
    response = await fetchImpl(`${CONTENT_ROUTE}${cid}`);
  } catch (error) {
    return { ok: false, reason: "CONTENT_UNREACHABLE", detail: error.message };
  }
  if (response.status === 404) return { ok: false, reason: "CONTENT_UNREACHABLE", detail: `No byte store this node reaches holds ${cid}. Publish the site again with Bundles.` };
  if (response.status === 413) return { ok: false, reason: "CONTENT_TOO_LARGE" };
  if (!response.ok) return { ok: false, reason: "CONTENT_UNREACHABLE", detail: `The node's content route answered ${response.status}.` };
  let bytes;
  try {
    const body = await response.json();
    if (body?.ok !== true || typeof body.data_base64 !== "string") throw new Error("the answer carries no data_base64");
    bytes = bytesOfBase64(body.data_base64);
  } catch (error) {
    return { ok: false, reason: "CONTENT_MALFORMED", detail: `The node's content route did not answer as the byte store does (${error.message}).` };
  }
  const got = hexOf(blake3(bytes));
  if (got !== cid) {
    return { ok: false, reason: "CONTENT_MISMATCH", detail: `The record names ${cid}. The node sent bytes whose BLAKE3 is ${got}.` };
  }
  return { ok: true, bytes };
}

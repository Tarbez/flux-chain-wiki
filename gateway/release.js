/* App release downloads at https://<label>.defxn.com/_release/<product>.

   Why the shell does this, not the site: a folder site runs in a sandboxed frame with no network
   (folder-site.js), so its download button can only open this address. The shell runs on the label
   origin, so it may read the chain through the gateway's chain read relay (chain-relay.js,
   name-config.js CHAIN_READ_PATH; owner decision 2026-11-05: the node's /ws admits no label page) and
   the node's byte store route (/fxn-store/v1/).

   Flow: the name's owner comes from the verified DOM_PROOF app.js already holds (never DOM_WHO) ->
   the bundle chain's KBUNDLE1 records, RESOLVER_RECORDS through the relay, each refused unless its bytes
   hash to its CID (vendor/dense-wire/flx-resolver-record-client.mjs) -> the app
   releases that count under that owner, highest sequence (vendor/bundle-deploy/app-release-core.js,
   the same rules the FXN Browser updater uses) -> each 8 MiB block from /fxn-store/v1/<cid>, refused
   unless its BLAKE3 is its ID -> the whole file refused unless its SHA-256 is the signed one -> saved.

   Neither the node nor the relay is trusted: every byte is checked against what the owner signed. A record
   whose bytes do not match its CID, or a release whose signature or signer does not check, is refused by
   name (RELEASE_PROOF_INVALID), never read as "nothing published".

   A sealed release (a closed tester group's, bundle-deploy `release --sealed-for`) is read the same way and
   counts only when no public release does: the tester view opens it (tester.js). A public reader never gets one. */
import { createResolverRecordClient } from "./vendor/dense-wire/flx-resolver-record-client.mjs";
import { relayWire } from "./chain-relay.js";
import { settleAppReleases, latestAppRelease } from "./vendor/bundle-deploy/app-release-core.js";
import { blake3 } from "./vendor/flx-codec/blake3.js";
import { CONTENT_ROUTE, hexOf } from "./content.js";
import { CHAIN_READ_PATH, NETWORK } from "./name-config.js";
import { nameEnding } from "./vendor/dense-wire/flx-builders.mjs";

export const RELEASE_PATH = "/_release/";
export const BUNDLE_CHAIN_ID = "bundle";
const KIND = "KBUNDLE1";
const WORD = /^[a-z0-9][a-z0-9._-]{0,63}$/;

/** `/_release/<product>?platform=&arch=&channel=` -> the release wanted, or null for any other address. */
export function releaseRequestOf(pathname, search = "") {
  if (!pathname.startsWith(RELEASE_PATH)) return null;
  const product = decodeURIComponent(pathname.slice(RELEASE_PATH.length)).replace(/\/+$/, "");
  const query = new URLSearchParams(search);
  const want = { product, platform: query.get("platform") || "darwin", arch: query.get("arch") || "arm64", channel: query.get("channel") || "beta" };
  return Object.values(want).every((v) => WORD.test(v)) ? want : { invalid: true, product };
}

/** The record client's refusals that mean the bytes are not what their CID or chain says: a proof failure. */
const RECORD_PROOF_CODES = new Set(["RRC_READBACK_MISMATCH", "RRC_FOREIGN_RECORD", "RRC_PAYLOAD_UNREADABLE"]);

/** -> { ok: true, release, rejected } | { ok: false, reason, detail }. `wire` reads the bundle chain: the gateway's relay
 *  (chain-relay.js) unless a test passes its own. `ending` is the one name ending this gateway's network serves (the
 *  shared nameEnding(network)); a release under another ending does not count. */
export async function readRelease({ name, ownerHex, want, wire = relayWire({ path: CHAIN_READ_PATH }), ending = NETWORK ? nameEnding(NETWORK) : null }) {
  want = { ...want, ending };
  let rows;
  try {
    rows = await createResolverRecordClient({ wire, resolverChainId: BUNDLE_CHAIN_ID, kindMarker: KIND }).listRecords();
  } catch (error) {
    if (RECORD_PROOF_CODES.has(error?.code)) {
      return { ok: false, reason: "RELEASE_PROOF_INVALID", detail: `A record of the bundle chain does not check, so no release is offered. ${error.message}` };
    }
    return { ok: false, reason: "NAME_UNRESOLVABLE", detail: `The bundle chain could not be read (${error?.message || error}).` };
  } finally {
    try { wire.close?.(); } catch { /* already closed */ }
  }
  const open = await settleAppReleases(rows, { name, ...want }, ownerHex);
  const latest = latestAppRelease(open.releases);
  if (latest.ok) return { ok: true, release: latest.release, rejected: open.rejected };
  const closed = await settleAppReleases(rows, { name, ...want, sealed: true }, ownerHex);
  const latestSealed = latestAppRelease(closed.releases);
  if (latestSealed.ok) return { ok: true, release: latestSealed.release, rejected: closed.rejected };
  const rejected = [...open.rejected, ...closed.rejected];
  const conflict = [latest, latestSealed].find((l) => l.code === "RELEASE_CONFLICT");
  if (conflict) {
    return { ok: false, reason: "RELEASE_CONFLICT", detail: `${conflict.conflicting.length} releases claim sequence ${conflict.sequence}. The owner publishes the intended one again at sequence ${conflict.sequence + 1}.` };
  }
  if (rejected.length) {
    return { ok: false, reason: "RELEASE_PROOF_INVALID", detail: `${name} has ${rejected.length} ${want.product} release${rejected.length === 1 ? "" : "s"} for ${want.platform}-${want.arch} on channel ${want.channel}, and none checks: ${rejected.map((r) => r.why).join("; ")}. Missing: a release signed by ${name}'s owner and carried by that key. To fix: the owner publishes the release again with bundle-deploy.` };
  }
  return { ok: false, reason: "RELEASE_NONE", detail: `${name} has no ${want.product} release for ${want.platform}-${want.arch} on channel ${want.channel}.` };
}

function bytesOfBase64(text) {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Block `index` of `release`, refused unless its length and BLAKE3 match the signed list.
 *  -> { ok: true, bytes } | { ok: false, reason, detail } */
export async function fetchReleaseBlock(release, index, { fetchImpl = (url) => fetch(url) } = {}) {
  const cid = release.blocks[index];
  const expected = index === release.blocks.length - 1 ? release.size - release.blockBytes * index : release.blockBytes;
  let response;
  try {
    response = await fetchImpl(`${CONTENT_ROUTE}${cid}`);
  } catch (error) {
    return { ok: false, reason: "CONTENT_UNREACHABLE", detail: `Block ${index + 1} of ${release.blocks.length}: ${error.message}` };
  }
  if (!response.ok) return { ok: false, reason: "CONTENT_UNREACHABLE", detail: `Block ${index + 1} of ${release.blocks.length}: the node answered ${response.status}.` };
  let bytes;
  try {
    const body = await response.json();
    if (body?.ok !== true || typeof body.data_base64 !== "string") throw new Error("the answer carries no data_base64");
    bytes = bytesOfBase64(body.data_base64);
  } catch (error) {
    return { ok: false, reason: "CONTENT_MALFORMED", detail: `Block ${index + 1}: ${error.message}` };
  }
  if (bytes.length !== expected || hexOf(blake3(bytes)) !== cid) {
    return { ok: false, reason: "CONTENT_MISMATCH", detail: `Block ${index + 1} does not match its ID ${cid}.` };
  }
  return { ok: true, bytes };
}

/** Every block, checked, then the whole file. -> { ok: true, blob } | { ok: false, reason, detail } */
export async function downloadRelease(release, { onProgress = () => {}, fetchImpl = (url) => fetch(url) } = {}) {
  const parts = [];
  let received = 0;
  for (let index = 0; index < release.blocks.length; index += 1) {
    const block = await fetchReleaseBlock(release, index, { fetchImpl });
    if (!block.ok) return block;
    const bytes = block.bytes;
    parts.push(bytes);
    received += bytes.length;
    onProgress(received, release.size);
  }
  const blob = new Blob(parts, { type: "application/octet-stream" });
  const digest = hexOf(new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer())));
  if (digest !== release.sha256) return { ok: false, reason: "CONTENT_MISMATCH", detail: `The file's SHA-256 is ${digest}. The owner signed ${release.sha256}.` };
  return { ok: true, blob };
}

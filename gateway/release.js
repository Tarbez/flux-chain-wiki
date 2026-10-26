/* App release downloads at https://<label>.defxn.com/_release/<product>.

   Why the shell does this, not the site: a folder site runs in a sandboxed frame with no network
   (folder-site.js), so its download button can only open this address. The shell runs on the label
   origin, so it may read the chain (NAME_NODES) and the node's byte store route (/fxn-store/v1/).

   Flow: the name's owner comes from the verified DOM_PROOF app.js already holds (never DOM_WHO) ->
   the bundle chain's KBUNDLE1 records (vendor/dense-wire/flx-resolver-record-client.mjs) -> the app
   releases that count under that owner, highest sequence (vendor/bundle-deploy/app-release-core.js,
   the same rules the FXN Browser updater uses) -> each 8 MiB block from /fxn-store/v1/<cid>, refused
   unless its BLAKE3 is its ID -> the whole file refused unless its SHA-256 is the signed one -> saved.

   The node is never trusted: every byte is checked against what the owner signed. */
import { WireClient } from "./vendor/dense-wire/flx-wire.mjs";
import { createResolverRecordClient } from "./vendor/dense-wire/flx-resolver-record-client.mjs";
import { settleAppReleases, latestAppRelease } from "./vendor/bundle-deploy/app-release-core.js";
import { blake3 } from "./vendor/flx-codec/blake3.js";
import { CONTENT_ROUTE, hexOf } from "./content.js";
import { NAME_NODES } from "./name-config.js";

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

/** -> { ok: true, release, rejected } | { ok: false, reason, detail } */
export async function readRelease({ name, ownerHex, want, nodes = NAME_NODES }) {
  const failures = [];
  for (const node of nodes) {
    const wire = new WireClient(node);
    try {
      const reader = createResolverRecordClient({ wire, resolverChainId: BUNDLE_CHAIN_ID, kindMarker: KIND });
      const rows = await reader.listRecords();
      const { releases, rejected } = await settleAppReleases(rows, { name, ...want }, ownerHex);
      const latest = latestAppRelease(releases);
      if (latest.ok) return { ok: true, release: latest.release, rejected };
      if (latest.code === "RELEASE_CONFLICT") {
        return { ok: false, reason: "RELEASE_CONFLICT", detail: `${latest.conflicting.length} releases claim sequence ${latest.sequence}. The owner publishes the intended one again at sequence ${latest.sequence + 1}.` };
      }
      const why = rejected.length ? ` ${rejected.length} were refused: ${rejected.map((r) => r.why).join("; ")}.` : "";
      return { ok: false, reason: "RELEASE_NONE", detail: `${name} has no ${want.product} release for ${want.platform}-${want.arch} on channel ${want.channel}.${why}` };
    } catch (error) {
      failures.push(`${node}: ${error?.message || error}`);
    } finally {
      try { wire.close?.(); } catch { /* already closed */ }
    }
  }
  return { ok: false, reason: "NAME_UNRESOLVABLE", detail: `No node answered for the bundle chain (${failures.join("; ")}).` };
}

function bytesOfBase64(text) {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Every block, checked, then the whole file. -> { ok: true, blob } | { ok: false, reason, detail } */
export async function downloadRelease(release, { onProgress = () => {}, fetchImpl = (url) => fetch(url) } = {}) {
  const parts = [];
  let received = 0;
  for (const [index, cid] of release.blocks.entries()) {
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
    parts.push(bytes);
    received += bytes.length;
    onProgress(received, release.size);
  }
  const blob = new Blob(parts, { type: "application/octet-stream" });
  const digest = hexOf(new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer())));
  if (digest !== release.sha256) return { ok: false, reason: "CONTENT_MISMATCH", detail: `The file's SHA-256 is ${digest}. The owner signed ${release.sha256}.` };
  return { ok: true, blob };
}

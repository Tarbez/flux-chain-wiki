// Token metadata: the rich, human-facing description of a token (name,
// image, description, links) that the chain itself does not carry -- a
// VALUEOBJECT/issuance record only ever has a bare ticker in its `T`
// block ("1000000000FXN"), nothing else. This document lives in a
// content-addressed blob (`BLOB_PUT`/`BLOB_GET`, 64 KiB cap), signed by
// whoever is publishing it, so any UI that knows a token's metadata CID
// can load and verify the exact same document.
//
// Schema `flx-token-meta/1`, adopted verbatim from flux-launchpad's own
// `js/token-meta.mjs` (the already-built, already-tested token-creation
// flow) rather than inventing a second shape -- this is the ONE canonical
// definition every UI (genesis, the account wallet, treasury, launchpad)
// reads and writes, per the workspace's "centralize, don't duplicate"
// rule. Only the schema/signing/verification core is vendored here; the
// multi-step creation FORM and the canvas-based image cropping in
// flux-launchpad's copy are UI-specific to that app's "create a new
// token" flow and do not belong in a shared wire-protocol bridge.
//
// The signer's signature covers ONE message, the same one the review
// dialog shows, so approving IS signing the metadata:
//
//   FLX-LAUNCH-TOKEN-V2 \0 symbol \0 distributedSupply \0 bodyDigest \0 signedAt
//
// `bodyDigest` is sha256 of `stableJson(body)`; `body` itself references
// each image by CID, so the signature commits to every image's exact
// bytes too, the same way flux-launchpad's own copy documents.

import { sha256Hex } from "./flx-crypto.mjs";

// Built from numeric code points, never written as a literal escape
// sequence in this source file -- either codepoint is itself a JS line
// terminator, so a literal copy inside a comment or a /regex/ breaks
// parsing across what the parser sees as two lines.
const LINE_SEPARATOR = String.fromCharCode(8232); // Unicode line separator
const PARAGRAPH_SEPARATOR = String.fromCharCode(8233); // Unicode paragraph separator
const LINE_SEP_RE = new RegExp(LINE_SEPARATOR, "g");
const PARA_SEP_RE = new RegExp(PARAGRAPH_SEPARATOR, "g");
const escapedLineSep = "\\" + "u2028";
const escapedParaSep = "\\" + "u2029";

/** JSON with no insignificant whitespace; the two Unicode separator
 *  codepoints above are escaped to their six-character text form -- the
 *  same function must produce and re-derive every hashed/signed byte
 *  string, so a verifier never depends on how a foreign serializer
 *  spelled it. */
export function stableJson(value) {
  return JSON.stringify(value).replace(LINE_SEP_RE, escapedLineSep).replace(PARA_SEP_RE, escapedParaSep);
}

export const sha256OfText = (text) => sha256Hex(text);

/** The exact bytes a token-metadata claim signs. Byte-for-byte the same
 *  domain tag flux-launchpad's own `create.html` flow uses, so a document
 *  published by either this module or that app verifies identically. */
export function claimMessage({ symbol, distributedSupply, bodyDigest, signedAt }) {
  return `FLX-LAUNCH-TOKEN-V2\u0000${symbol}\u0000${distributedSupply}\u0000${bodyDigest}\u0000${signedAt}`;
}

/** Builds the envelope text that gets `BLOB_PUT`. Key order is fixed here
 *  and `stableJson` preserves it, so the same `body` always produces the
 *  same CID. */
export function buildDocument({ body, bodyDigest, symbol, distributedSupply, signedAt, creator, sig }) {
  return stableJson({
    kind: "flx-token-meta/1",
    launch: { symbol, distributedSupply, signedAt },
    creator: { identityId: creator.identityId, displayName: creator.displayName, publicKeyB64: creator.publicKeyB64 },
    bodyDigest,
    body,
    sig,
  });
}

/** Sign and build a complete `flx-token-meta/1` document in one call.
 *  `signer` is the `{pubHex, signText, signBytes}` shape every new
 *  dense-wire builder in this bridge takes (`flx-identity-bridge.mjs`) --
 *  `claimMessage` is UTF-8-safe ASCII, so `signText` is what's used, same
 *  as every manifest signature in this bridge. `creatorB64` is the
 *  signer's public key as base64 (what the document itself carries and
 *  what `verifyDocument` imports via Web Crypto) -- pass
 *  `hexToBase64(signer.pubHex)` from `flx-identity-bridge.mjs` when the
 *  signer only has the hex form. */
export async function signAndBuildDocument({ signer, creatorB64, identityId, displayName, body, symbol, distributedSupply, signedAt }) {
  const bodyDigest = await sha256OfText(stableJson(body));
  const message = claimMessage({ symbol, distributedSupply, bodyDigest, signedAt });
  const sig = await signer.signText(message);
  return buildDocument({
    body, bodyDigest, symbol, distributedSupply, signedAt,
    creator: { identityId, displayName, publicKeyB64: creatorB64 },
    sig,
  });
}

const enc = new TextEncoder();
const hexToBytes = (hex) => Uint8Array.from(hex.match(/../g) ?? [], (h) => parseInt(h, 16));

/** Verifies a metadata blob. Never throws; returns what was and was not
 *  established so a UI can word each state truthfully rather than
 *  collapsing "couldn't check" into "invalid".
 *  @returns {{ok: boolean, doc: object|null, issues: string[], signature: 'verified'|'invalid'|'unchecked'}} */
export async function verifyDocument(text, expectedCid) {
  const issues = [];
  let doc = null;
  try {
    if (expectedCid && (await sha256OfText(text)) !== expectedCid) issues.push("blob bytes do not hash to the CID they were fetched by");
    doc = JSON.parse(text);
  } catch {
    return { ok: false, doc: null, issues: [...issues, "not valid metadata"], signature: "invalid" };
  }
  if (doc?.kind !== "flx-token-meta/1" || typeof doc.body !== "object" || !doc.body) {
    return { ok: false, doc: null, issues: [...issues, "not a token metadata document"], signature: "invalid" };
  }
  const digest = await sha256OfText(stableJson(doc.body));
  if (digest !== doc.bodyDigest) issues.push("body does not match its signed digest");
  if (doc.body.symbol !== doc.launch?.symbol) issues.push("ticker in body differs from the signed launch");

  let signature = "unchecked";
  if (!issues.length) {
    try {
      const pub = await crypto.subtle.importKey(
        "raw",
        Uint8Array.from(atob(doc.creator.publicKeyB64), (c) => c.charCodeAt(0)),
        { name: "Ed25519" },
        false,
        ["verify"],
      );
      const msg = enc.encode(claimMessage({
        symbol: doc.launch.symbol, distributedSupply: doc.launch.distributedSupply,
        bodyDigest: doc.bodyDigest, signedAt: doc.launch.signedAt,
      }));
      signature = (await crypto.subtle.verify({ name: "Ed25519" }, pub, hexToBytes(doc.sig), msg)) ? "verified" : "invalid";
    } catch {
      signature = "unchecked";
    }
    if (signature === "invalid") issues.push("creator signature does not verify");
  }
  return { ok: issues.length === 0, doc, issues, signature };
}

/** `WireClient.blobGet` + `verifyDocument`. `null` when the node does not
 *  hold this blob yet (defer, not refuse) or the bytes it holds don't
 *  verify as a real, correctly-signed `flx-token-meta/1` document. */
export async function loadTokenMeta(wire, cid) {
  const reply = await wire.blobGet(cid);
  if (reply.kind !== "found") return null;
  const result = await verifyDocument(reply.text, cid);
  return result.ok ? { ...result, cid } : null;
}

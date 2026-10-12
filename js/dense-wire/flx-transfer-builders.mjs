// FLX transfer-lifecycle builders — JS port of dense-wire's real FXN
// transfer lifecycle: Intent -> Offer -> Agreement -> ValueObject
// (issuance/successor) -> Fulfillment, plus a treasury claim leg.
//
// Mirrors `src/lib.rs`'s `docs()`, `issuer_evidence_cid`, `plan_cid`,
// `output_doc_cid`, `build`, `intent`, `offer`, `agreement_proposal`,
// `agreement_cosign`, `agreement`, `issuance`, `successor`, `fulfillment`,
// and `src/treasury.rs::claim_treasury_leg`.
//
// Every builder here takes a `signer` shaped
// `{ pubHex, signText(asciiText): Promise<hexSig>, signBytes(bytes): Promise<hexSig> }`
// (see `flx-identity-bridge.mjs`) — NOT a raw Web Crypto `CryptoKey`. This
// is a NEW builder surface for the v9 Auth Kit identity; the pre-existing
// `flx-builders.mjs` CryptoKey path (used by `loadOrCreateKey()`) is
// untouched by this file.

import { hexOfUtf8 } from "./flx-dumb-parser.mjs";
import { sha256Hex } from "./flx-crypto.mjs";

/** Fixed document CIDs. `src/lib.rs::docs()` computes these once from
 *  fixed ASCII strings and caches them in a `OnceLock`; since the inputs
 *  never change, we pin the already-computed SHA-256 hex here instead of
 *  re-hashing at module load (Web Crypto's `digest` is async, and there is
 *  nothing to gain from recomputing a constant on every page load).
 *
 *    constraints   = sha256("flux.notebook.transfer.constraints/1")
 *    offerContract = sha256("flux.notebook.transfer.offer/1")
 *    policy        = sha256("flux.notebook.authority.holder-and-counterparty-sign/1")
 *    resolver      = sha256("flux.identity.resolver/1")
 *    asset         = sha256("flux.notebook.asset.FXN/1")
 */
export const DOCS = Object.freeze({
  constraints: "20d0a706b33065446a53ebdb3b676538f22af87f5a242919fc347fc79a8039f5",
  offerContract: "888b4275127c8b31304813ead1abc44436231f3f7c867001b8b8eb425651527b",
  policy: "95a4cba9736fe0cc3aa999134cbe560616acae985985918a27a682d803315385",
  resolver: "5cc34391d9f605dc341c5cf85a510c135faa1fdd0030c9e42c8f30fff0daa968",
  asset: "e86896cc2e9953e99f95f863afe2ce7b76cd7b226673ffd09b78e4500eee3972",
});

/** `issuer_evidence_cid`, src/lib.rs ~119. */
export async function issuerEvidenceCid(issuerKeyHex) {
  return sha256Hex(`issuer:${issuerKeyHex}`);
}

/** `plan_cid`, src/lib.rs ~122. */
export async function planCid(inputCid) {
  return sha256Hex(`consume:${inputCid}`);
}

/** `output_doc_cid`, src/lib.rs ~125-129. */
export async function outputDocCid(holderKeyHex, amount, unit, seq) {
  return sha256Hex(`output:${holderKeyHex}:${amount}${unit}:${seq}`);
}

/** `holder_block`, src/lib.rs ~683-685: the `H` block is hex-of-utf8 of
 *  the holder's own key hex (double-encoded, same as the pre-existing
 *  `flx-builders.mjs` peer-announce `H` block). */
function holderBlock(keyHex) {
  return hexOfUtf8(keyHex);
}

/** `id`/`claim_id` MUST NOT contain `-`: `admit`'s outermost split is
 *  `text.split('-')` over the whole rendered manifest, so a raw dash
 *  inside an unpacked `R` payload silently slices the record into extra,
 *  unrecognized blocks. See `src/lib.rs::issuance`'s doc comment and
 *  `src/treasury.rs::claim_treasury_leg`'s (~661-679) for the long version
 *  of this landmine. */
function assertNoDash(value, paramName) {
  if (typeof value !== "string" || value.includes("-")) {
    throw new Error(
      `${paramName} must not contain '-': the manifest grammar splits on it, so a raw dash ` +
        `silently slices the record into extra, unrecognized blocks (got ${JSON.stringify(value)}). ` +
        `To fix: use an id without '-' (e.g. swap it for '_' or nothing).`,
    );
  }
}

/** `build(parts, signers)`, src/lib.rs ~669-682: push each `(role,
 *  payload)` as `role+payload` blocks joined by `-`, then for each signer
 *  (in order) append `-S<hex sig over the text so far, including every
 *  previously appended S block>`. `signers` is one or more `{pubHex,
 *  signText, signBytes}` objects — see module doc. */
async function build(parts, signers) {
  let text = parts.map(([role, payload]) => `${role}${payload}`).join("-");
  for (const signer of signers) {
    const sig = await signer.signText(text);
    text = `${text}-S${sig}`;
  }
  return text;
}

/** `intent`, src/lib.rs ~688-701. */
export async function intent(sender, inputCid, now) {
  return build(
    [
      ["G", sender.pubHex],
      ["Y", "0G"],
      ["V", "1"],
      ["M", String(now)],
      ["C", DOCS.constraints],
      ["C", inputCid],
      ["D", String(now + 3600)],
    ],
    [sender],
  );
}

/** `offer`, src/lib.rs ~703-717. */
export async function offer(recipient, intentCid, inputCid, now) {
  return build(
    [
      ["G", recipient.pubHex],
      ["Y", "0H"],
      ["V", "1"],
      ["M", String(now)],
      ["C", intentCid],
      ["C", DOCS.offerContract],
      ["C", inputCid],
      ["D", String(now + 3600)],
    ],
    [recipient],
  );
}

/** Stage 1 of [`agreement`]: the sender's half only. `agreement_proposal`,
 *  src/lib.rs ~740-761. A caller that does not also hold the recipient's
 *  key completes the agreement across two separate processes instead:
 *  this, handed to the recipient, who calls [`agreementCosign`]. */
export async function agreementProposal(sender, intentCid, offerCid, expectedOutputDoc, now) {
  return build(
    [
      ["G", sender.pubHex],
      ["Y", "0I"],
      ["V", "1"],
      ["M", String(now)],
      ["C", intentCid],
      ["C", offerCid],
      ["C", DOCS.policy],
      ["C", DOCS.resolver],
      ["C", expectedOutputDoc],
    ],
    [sender],
  );
}

/** Stage 2 of [`agreement`]: append the recipient's signature to a
 *  sender-signed [`agreementProposal`]. `agreement_cosign`, src/lib.rs
 *  ~767-770. Signs over `proposalText` EXACTLY as given, including its
 *  own trailing `-S` from the proposal. */
export async function agreementCosign(proposalText, recipient) {
  const sig = await recipient.signText(proposalText);
  return `${proposalText}-S${sig}`;
}

/** `agreement`, src/lib.rs ~722-731: `agreementCosign(agreementProposal(...), recipient)`
 *  run back to back with both keys already in hand — same bytes, same
 *  CID, zero behavior change from calling the two stages separately. */
export async function agreement(sender, recipient, intentCid, offerCid, expectedOutputDoc, now) {
  const proposal = await agreementProposal(sender, intentCid, offerCid, expectedOutputDoc, now);
  return agreementCosign(proposal, recipient);
}

/** `issuance`, src/lib.rs ~772-788. `id` MUST NOT contain `-` (see
 *  `assertNoDash` above). */
export async function issuance(issuer, id, amount, now) {
  assertNoDash(id, "id");
  return build(
    [
      ["G", issuer.pubHex],
      ["Y", "0L"],
      ["V", "1"],
      ["I", "0"],
      ["R", id],
      ["H", holderBlock(issuer.pubHex)],
      ["T", `${amount}FXN`],
      ["C", DOCS.asset],
      ["C", await issuerEvidenceCid(issuer.pubHex)],
      ["M", String(now)],
    ],
    [issuer],
  );
}

/** `successor`, src/lib.rs ~790-816. `id` MUST NOT contain `-` (same
 *  landmine as `issuance`). */
export async function successor(newHolder, id, seq, amount, predCid, agreementCid, now) {
  assertNoDash(id, "id");
  return build(
    [
      ["G", newHolder.pubHex],
      ["Y", "0L"],
      ["V", "1"],
      ["I", String(seq)],
      ["R", id],
      ["H", holderBlock(newHolder.pubHex)],
      ["T", `${amount}FXN`],
      ["C", DOCS.asset],
      ["C", predCid],
      ["C", agreementCid],
      ["C", await planCid(predCid)],
      ["M", String(now)],
    ],
    [newHolder],
  );
}

/** `fulfillment`, src/lib.rs ~818-837. */
export async function fulfillment(sender, agreementCid, predCid, successorCid, now) {
  return build(
    [
      ["G", sender.pubHex],
      ["Y", "0J"],
      ["V", "1"],
      ["M", String(now)],
      ["C", agreementCid],
      ["C", await planCid(predCid)],
      ["C", successorCid],
    ],
    [sender],
  );
}

/** `claim_treasury_leg`, src/treasury.rs ~680-696. `claimId` MUST NOT
 *  contain `-` (same landmine as `issuance`'s `id`). */
export async function claimTreasuryLeg(claimant, spendCid, amount, claimId, now) {
  assertNoDash(claimId, "claimId");
  return build(
    [
      ["G", claimant.pubHex],
      ["Y", "0L"],
      ["V", "1"],
      ["I", "0"],
      ["R", claimId],
      ["H", holderBlock(claimant.pubHex)],
      ["T", `${amount}FXN`],
      ["C", DOCS.asset],
      ["C", spendCid],
      ["M", String(now)],
    ],
    [claimant],
  );
}

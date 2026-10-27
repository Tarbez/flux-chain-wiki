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
import { GENESIS_PREV, NETWORK_DEVNET } from "./flx-builders.mjs";

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

/** `issuer_evidence_cid_on` (flx-cap-custody): the issuer evidence a receipt cites in C[3] on `network` (owner,
 *  2026-10-25). The devnet keeps `issuer:<key>`; every other network hashes `issuer:<network>:<key>`, so a receipt
 *  signed for one network never mints on another. `network` defaults to the devnet. */
export async function issuerEvidenceCid(issuerKeyHex, network = NETWORK_DEVNET) {
  return sha256Hex(network === NETWORK_DEVNET ? `issuer:${issuerKeyHex}` : `issuer:${network}:${issuerKeyHex}`);
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

/** RETIRED for new value (one FXN, step 6): `TREASURY_CLAIM` is refused by
 *  name; a KNTSPEND1 pays its recipient in native FXN directly.
 *
 *  `claim_treasury_leg`, src/treasury.rs (cut over to `manifest_custody`
 *  live — see that commit). A thin wrapper over [`buildReceipt`] below: the
 *  claimant's own self-issued `R-` root credit (issuer == holder ==
 *  claimant), the manifest_custody-shaped counterpart to the old
 *  `Kind::ValueObject` claim shape. `spendCid` is deliberately NOT part of
 *  this record (an `R-`'s fixed grammar has no field for "which spend is
 *  this a leg of" — it is shared by every issuer in the system, not a
 *  treasury-specific shape); pass it to `WireClient.treasuryClaim` as its
 *  own explicit argument instead, the same way `buildSlash`'s destination
 *  travels as `manifestSubmit`'s own `extra` argument rather than inside
 *  the manifest. */
export async function claimTreasuryLeg(claimant, amount, now) {
  return buildReceipt(claimant, 0, GENESIS_PREV, claimant.pubHex, amount, now);
}

// ----------------------------------------------------------------------------
// manifest_custody builders — JS port of `src/manifest_custody.rs`'s own
// `build_receipt`/`build_transfer`/`build_lock`/`build_slash`, submitted
// over the wire via `WireClient.manifestSubmit` (mirrors `valueSubmit`'s
// shape; see `flx-wire.mjs`). This is the SEPARATE custody index
// `DomainPurchase`'s C[6] now names (the first feature cut over to settle
// against it live — see `buildDomainPurchase`'s own doc comment below).
// Field order/names are matched exactly against the Rust builders; every
// kind marker and the derived-credit-CID formulas mirror
// `manifest_custody.rs`'s own module docs byte for byte.
// ----------------------------------------------------------------------------

export const MANIFEST_KIND_RECEIPT = "KRCPT1";
export const MANIFEST_KIND_TRANSFER = "KXFER1";
export const MANIFEST_KIND_LOCK = "KLOCK1";
export const MANIFEST_KIND_SLASH = "KSLASH1";

/** Derived recipient-credit CID for a `T-` manifest, src/manifest_custody.rs
 *  `recipient_credit_cid`. */
export async function recipientCreditCid(manifestCid) {
  return sha256Hex(`xfer-recipient:${manifestCid}`);
}

/** Derived change-credit CID for a `T-` manifest, src/manifest_custody.rs
 *  `change_credit_cid`. */
export async function changeCreditCid(manifestCid) {
  return sha256Hex(`xfer-change:${manifestCid}`);
}

/** Derived destination-credit CID for a `SLASH-` manifest,
 *  src/manifest_custody.rs `slash_destination_credit_cid`. */
export async function slashDestinationCreditCid(slashManifestCid) {
  return sha256Hex(`slash-destination:${slashManifestCid}`);
}

/** Build a signed `R-` root credit (`KRCPT1`), src/manifest_custody.rs
 *  `build_receipt`. `issuer` crediting `holderKeyHex` with `amount` FXN —
 *  the resulting credit's identity is simply this manifest's own CID
 *  (unlike `T-`/`SLASH-`, which derive a different output CID).
 *
 *  `pos`/`prevCid` are this issuer's own real position/prev CID on the
 *  server's `chain.rs::Ledger` — now meaningful, because `R-` admits as a
 *  real `Payload::ManifestReceipt` through the ordinary `MANIFEST_SUBMIT`
 *  path (query the issuer's own head first via `WireClient.head`, the same
 *  way every other chained builder here already does). Pass
 *  `(0, GENESIS_PREV)` only for a receipt that is never submitted through
 *  that live path (e.g. `claimTreasuryLeg`, consumed directly by
 *  `TREASURY_CLAIM`, which never touches `Ledger::admit` at all). */
export async function buildReceipt(issuer, pos, prevCid, holderKeyHex, amount, now, network = NETWORK_DEVNET) {
  return build(
    [
      ["G", issuer.pubHex],
      ["Y", "LEDGERENTRY"],
      ["V", "1"],
      ["M", String(now)],
      ["H", holderBlock(issuer.pubHex)],
      ["K", MANIFEST_KIND_RECEIPT],
      ["W", holderKeyHex],
      ["J", String(pos)],
      ["C", prevCid],
      ["C", DOCS.asset],
      ["C", await issuerEvidenceCid(issuer.pubHex, network)],
      ["T", `${amount}FXN`],
    ],
    [issuer],
  );
}

/** Build a signed `T-` spend (`KXFER1`), src/manifest_custody.rs
 *  `build_transfer`. The recipient's credit CID is
 *  `recipientCreditCid(sha256Hex(thisManifestText))`; if `amount` is less
 *  than the input credit's real amount, a change credit also lands back on
 *  `sender` at `changeCreditCid(...)` of the same manifest CID.
 *
 *  `pos`/`prevCid` — see [`buildReceipt`]'s own doc comment. */
export async function buildTransfer(sender, pos, prevCid, recipientKeyHex, inputCreditCid, amount, nonce, now) {
  return build(
    [
      ["G", sender.pubHex],
      ["Y", "LEDGERENTRY"],
      ["V", "1"],
      ["M", String(now)],
      ["D", String(nonce)],
      ["H", holderBlock(sender.pubHex)],
      ["K", MANIFEST_KIND_TRANSFER],
      ["W", recipientKeyHex],
      ["J", String(pos)],
      ["C", prevCid],
      ["C", inputCreditCid],
      ["C", DOCS.asset],
      ["T", `${amount}FXN`],
    ],
    [sender],
  );
}

/** Build a signed `LOCK-` escrow (`KLOCK1`), src/manifest_custody.rs
 *  `build_lock`. No amount restated; the credit itself still carries its
 *  real value, now escrowed rather than freely transferable.
 *
 *  `pos`/`prevCid` — see [`buildReceipt`]'s own doc comment. */
export async function buildLock(locker, pos, prevCid, beneficiaryKeyHex, creditCid, unlockDeadline, now) {
  return build(
    [
      ["G", locker.pubHex],
      ["Y", "LEDGERENTRY"],
      ["V", "1"],
      ["M", String(now)],
      ["D", String(unlockDeadline)],
      ["H", holderBlock(locker.pubHex)],
      ["K", MANIFEST_KIND_LOCK],
      ["W", beneficiaryKeyHex],
      ["J", String(pos)],
      ["C", prevCid],
      ["C", creditCid],
      ["C", DOCS.asset],
    ],
    [locker],
  );
}

/** Build a signed `SLASH-` forfeiture (`KSLASH1`), src/manifest_custody.rs
 *  `build_slash`. `authority` signs (`G`) — the server independently
 *  checks this against its OWN configured authority key
 *  (`CHAIN_SERVER_CUSTODY_AUTHORITY_KEY`) when submitted via
 *  `MANIFEST_SUBMIT`, not a value this builder or the manifest itself can
 *  assert.
 *
 *  `destinationKeyHex` — the forfeited credit's destination — now rides in
 *  `W`, part of this signed record, same as the Rust builder: it used to
 *  travel as `MANIFEST_SUBMIT`'s own second tab field, a side channel that
 *  only worked because that command was a one-off wire command with room
 *  for an extra field. Once admission runs through the generic
 *  `Payload::ManifestSlash` path there is no such field left, so the
 *  destination moved into the record itself — see `manifest_custody.rs`'s
 *  own module docs for the full design-decision writeup. `WireClient.
 *  manifestSubmit` no longer takes a second argument either.
 *
 *  `pos`/`prevCid` — see [`buildReceipt`]'s own doc comment. */
export async function buildSlash(authority, pos, prevCid, lockCid, violationProofCid, destinationKeyHex, now) {
  return build(
    [
      ["G", authority.pubHex],
      ["Y", "LEDGERENTRY"],
      ["V", "1"],
      ["M", String(now)],
      ["H", holderBlock(authority.pubHex)],
      ["K", MANIFEST_KIND_SLASH],
      ["W", destinationKeyHex],
      ["J", String(pos)],
      ["C", prevCid],
      ["C", lockCid],
      ["C", violationProofCid],
    ],
    [authority],
  );
}

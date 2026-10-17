// Pure constructors for the FLX records the browser micro-node needs.
// Mirrors the Rust `chain::peer_announce` / `chain::earn_signer` / segment
// covered-bytes layout. Signatures are produced by `flx-crypto` and
// appended as `-S<hex>` by the caller.

import { hexOfUtf8, utf8OfHex, signaturePrefix } from "./flx-dumb-parser.mjs";
import { sha256Hex, signHex, signBytesHex } from "./flx-crypto.mjs";

export const ROSTER_KIND_ANNOUNCE = "KRSTR1";
export const ROSTER_KIND_LEAVE = "KRSTR1LEAVE";
export const EARN_KIND_SIGNER = "KEARN1S";
export const DOMAIN_KIND_XFER = "KDOMXFER1";
export const DOMAIN_KIND_CLAIM = "KDOMCLAIM1";
export const DOMAIN_KIND_RECORD_UPDATE = "KDOMREC1";
export const DOMAIN_KIND_XFER2 = "KDOMXFER2";
export const DOMAIN_KIND_BUY = "KDOMBUY1";
export const RECORD_GENESIS_PREV = "0".repeat(64);
export const RESOLVER_KIND_LAUNCH = "KRESOLV1";
export const RESOLVER_KIND_UPGRADE = "KRESOLVUP1";
export const PROVIDER_KIND_ANNOUNCE = "KPRV1";
export const ACL_KIND_EVIDENCE = "KACLEV1";
export const GENESIS_PREV = "0".repeat(64);
export const Y_LEDGERENTRY = "LEDGERENTRY";

/** Same rule as the Rust `is_valid_fqdn`. The W block carries hex, so a
 *  bad name survives the grammar check and is only caught by the payload
 *  check — validating here turns a server-side refusal into a local one. */
export function isValidFqdn(name) {
  if (typeof name !== "string" || name.length === 0 || name.length > 253) return false;
  return name.split(".").every(
    (label) =>
      label.length > 0 &&
      label.length <= 63 &&
      !label.startsWith("-") &&
      !label.endsWith("-") &&
      /^[a-z0-9-]+$/.test(label),
  );
}

/** Build an unsigned genesis LEDGERENTRY and sign it with `privateKey`.
 *  Shape mirrors `chain::genesis` + `chain::entry`. */
export async function buildGenesis({ privateKey, pubHex, nowSec }) {
  const idRef = await sha256Hex(pubHex); // sha256 of the key's hex-utf8 bytes
  const h = hexOfUtf8(pubHex);
  const body = `G${pubHex}-Y${Y_LEDGERENTRY}-V1-M${nowSec}-H${h}-J0-C${GENESIS_PREV}-C${idRef}`;
  const sig = await signHex(privateKey, body);
  return `${body}-S${sig}`;
}

/** Build and sign a KRSTR1 peer-announce.
 *  `reachAddress` is the dense W-block body, e.g. "flx1.<host>.<port>" or
 *  "wrtc1.<peer-id>" or "relay1.<relay>.<peer-id>". */
export async function buildPeerAnnounce({
  privateKey,
  pubHex,
  pos,
  prevCid,
  reachAddress,
  heartbeatDeadlineSec,
  nowSec,
}) {
  const h = hexOfUtf8(pubHex);
  // W is hex-of-utf8: dotted addresses can't live in the dense charset,
  // and the Wrapped resolver requires lowercase hex. Matches the Rust
  // builder exactly.
  const w = hexOfUtf8(reachAddress);
  // C[1] = sha256(reach_address) — self-identifying content ref, same
  // reason as the Rust builder: LedgerEntry needs min 2 C-refs.
  const addrCid = await sha256Hex(reachAddress);
  const body = `G${pubHex}-Y${Y_LEDGERENTRY}-V1-M${nowSec}-D${heartbeatDeadlineSec}-H${h}-K${ROSTER_KIND_ANNOUNCE}-W${w}-J${pos}-C${prevCid}-C${addrCid}`;
  const sig = await signHex(privateKey, body);
  return `${body}-S${sig}`;
}

/** Build and sign a KDOMXFER1 subdomain ownership transfer.
 *
 *  Mirrors the Rust `chain::domain_transfer` byte for byte. The initial
 *  claim is bundle-deploy's own signed name record — this is only the
 *  verb that moves an already-owned name to another key.
 *
 *  `priorRecordCid` must be the CURRENT head for `fqdn` (ask the server
 *  with `DOM_WHO <fqdn>` first); naming a superseded record is how a
 *  replayed transfer would otherwise roll ownership backwards, and the
 *  resolver refuses it.
 *
 *  `newOwnerPubHex` is the recipient's ed25519 pubkey — 64 lowercase hex
 *  chars. The key IS the address; there is no indirection, and moving a
 *  name to a DAO later is just this call with the DAO's treasury key. */
export async function buildDomainTransfer({
  privateKey,
  pubHex,
  pos,
  prevCid,
  fqdn,
  priorRecordCid,
  newOwnerPubHex,
  nowSec,
}) {
  if (!isValidFqdn(fqdn)) {
    throw new Error(
      `That name is not one this chain will carry ownership for. ` +
        `Missing: a lowercase dotted name of [a-z0-9-] labels (got ${JSON.stringify(fqdn)}). ` +
        `To fix: lowercase it and drop any character outside [a-z0-9-.].`,
    );
  }
  if (!/^[0-9a-f]{64}$/.test(priorRecordCid)) {
    throw new Error(
      `That prior record CID is not addressable. ` +
        `Missing: 64 lowercase hex chars (got ${priorRecordCid.length}). ` +
        `To fix: read the current head with DOM_WHO ${fqdn} and use its CID.`,
    );
  }
  if (!/^[0-9a-f]{64}$/.test(newOwnerPubHex)) {
    throw new Error(
      `That new-owner key is not addressable. ` +
        `Missing: a 64-char lowercase hex ed25519 pubkey (got ${newOwnerPubHex.length}). ` +
        `To fix: pass the recipient's public key as hex, not base64 or PEM.`,
    );
  }
  const h = hexOfUtf8(pubHex);
  const w = hexOfUtf8(fqdn);
  const body =
    `G${pubHex}-Y${Y_LEDGERENTRY}-V1-M${nowSec}-H${h}-K${DOMAIN_KIND_XFER}` +
    `-W${w}-J${pos}-C${prevCid}-C${priorRecordCid}-C${newOwnerPubHex}`;
  const sig = await signHex(privateKey, body);
  return `${body}-S${sig}`;
}

/** Same rule as the Rust `is_claimable_domain_name`. Narrower than
 *  `isValidFqdn`: exactly one label plus one of the three mesh TLDs,
 *  mirroring `name-integrity/src/name-syntax.mjs`'s `normalizeName`. */
export function isClaimableDomainName(name) {
  if (!isValidFqdn(name)) return false;
  const parts = name.split(".");
  if (parts.length !== 2) return false;
  const [, tld] = parts;
  return tld === "ark" || tld === "deadark" || tld === "fxn";
}

/** Build and sign a KDOMCLAIM1 self-signed first domain claim.
 *
 *  Mirrors the Rust `chain::domain_claim` byte for byte. The claimant
 *  signs their own claim (their own key becomes the owner); first
 *  distinct claim for a name wins. No second signer, no BFT/
 *  multi-signer allocation layer — dense-wire's existing K-of-N
 *  segment sign-off already provides the finality property a second
 *  layer would duplicate.
 *
 *  `recordCid` is the explicit, caller-chosen CID this claim
 *  establishes as its record (C[1]) — the same value the server-side
 *  `observe_initial_claim`/env-seed path already takes as a parameter. */
export async function buildDomainClaim({
  privateKey,
  pubHex,
  pos,
  prevCid,
  fqdn,
  recordCid,
  nowSec,
}) {
  if (!isClaimableDomainName(fqdn)) {
    throw new Error(
      `That name is not one this chain will issue a claim for. ` +
        `Missing: one label plus .ark, .deadark or .fxn (got ${JSON.stringify(fqdn)}). ` +
        `To fix: use a name like "alice.ark" with no sub-labels.`,
    );
  }
  if (!/^[0-9a-f]{64}$/.test(recordCid)) {
    throw new Error(
      `That record CID is not addressable. ` +
        `Missing: 64 lowercase hex chars (got ${recordCid.length}). ` +
        `To fix: pass the sha256-hex CID this claim establishes as its record.`,
    );
  }
  const h = hexOfUtf8(pubHex);
  const w = hexOfUtf8(fqdn);
  const body =
    `G${pubHex}-Y${Y_LEDGERENTRY}-V1-M${nowSec}-H${h}-K${DOMAIN_KIND_CLAIM}` +
    `-W${w}-J${pos}-C${prevCid}-C${recordCid}`;
  const sig = await signHex(privateKey, body);
  return `${body}-S${sig}`;
}

/** Build and sign a KDOMREC1 DNS/mesh record content update.
 *
 *  Mirrors the Rust `chain::domain_record_update` byte for byte.
 *  Separate verb from `buildDomainTransfer`/`buildDomainClaim`: those
 *  move WHO owns a name, this moves WHERE it resolves. `recordJson` is
 *  the record's canonical JSON (matching the Rust `NameRecord` field
 *  names: name, owner_pub_hex, version, updated_at, targets,
 *  co_signers), hex-of-utf8-encoded and carried inline in C[2] — never
 *  behind a second content-store CID, since DNS resolution is
 *  latency-sensitive.
 *
 *  `priorRecordCid` must be the CURRENT record head for `fqdn` (ask the
 *  server with `DOM_RECORD <fqdn>` first), or `RECORD_GENESIS_PREV` for
 *  this name's first record. */
export async function buildDomainRecordUpdate({
  privateKey,
  pubHex,
  pos,
  prevCid,
  fqdn,
  priorRecordCid,
  recordJson,
  nowSec,
}) {
  if (!isValidFqdn(fqdn)) {
    throw new Error(
      `That name is not one this chain will carry a record for. ` +
        `Missing: a lowercase dotted name of [a-z0-9-] labels (got ${JSON.stringify(fqdn)}). ` +
        `To fix: lowercase it and drop any character outside [a-z0-9-.].`,
    );
  }
  if (priorRecordCid !== RECORD_GENESIS_PREV && !/^[0-9a-f]{64}$/.test(priorRecordCid)) {
    throw new Error(
      `That prior record CID is not addressable. ` +
        `Missing: RECORD_GENESIS_PREV or 64 lowercase hex chars (got ${priorRecordCid.length}). ` +
        `To fix: read the current record head with DOM_RECORD ${fqdn} and use its CID.`,
    );
  }
  if (typeof recordJson !== "string" || recordJson.length === 0) {
    throw new Error(
      `That record update carries no content. ` +
        `Missing: the canonical NameRecord JSON string (got ${JSON.stringify(recordJson)}). ` +
        `To fix: pass canonicalNameRecordJson(record).`,
    );
  }
  const h = hexOfUtf8(pubHex);
  const w = hexOfUtf8(fqdn);
  const contentHex = hexOfUtf8(recordJson);
  const body =
    `G${pubHex}-Y${Y_LEDGERENTRY}-V1-M${nowSec}-H${h}-K${DOMAIN_KIND_RECORD_UPDATE}` +
    `-W${w}-J${pos}-C${prevCid}-C${priorRecordCid}-C${contentHex}`;
  const sig = await signHex(privateKey, body);
  return `${body}-S${sig}`;
}

/** Encode a short price field (`price_asset`'s ticker, or
 *  `price_amount`'s decimal digits) as a dense-grammar `C`-block.
 *  Mirrors the Rust `chain::encode_price_field` exactly: hex-of-utf8,
 *  then zero-padded on the right in whole hex-byte ("00") pairs until
 *  at least 16 chars (dense's `C` role floor). */
export function encodePriceField(value) {
  let hex = hexOfUtf8(value);
  while (hex.length < 16) hex += "00";
  return hex;
}

/** Inverse of `encodePriceField` — mirrors the Rust
 *  `chain::decode_price_field`: decode hex-of-utf8, then trim the
 *  trailing NUL bytes the zero-padding decodes to. */
export function decodePriceField(hex) {
  return utf8OfHex(hex).replace(/\0+$/, "");
}

/** Deterministic sub-message for the new-owner dual signature shared
 *  by `buildDomainTransferV2` (`KDOMXFER2`) and `buildDomainPurchase`
 *  (`KDOMBUY1`). Mirrors the Rust `domain_claims::dual_sig_submessage`
 *  byte for byte — ONE encoding, so neither side can drift onto a
 *  message the other doesn't verify.
 *
 *  `price` is `null` for a free v2 transfer, or `[asset, amount]` for
 *  a priced transfer/purchase — always the RAW values here, never the
 *  padded `encodePriceField` wire form (the signature covers what was
 *  actually agreed, not how it happens to be packed on the wire). */
export function dualSigSubmessage(fqdn, priorRecordCid, newOwnerPubHex, price) {
  let msg =
    `DOMDUALSIG1\nfqdn=${fqdn}\nprior_record_cid=${priorRecordCid}\n` +
    `new_owner_pub_hex=${newOwnerPubHex}\n`;
  if (price) {
    const [asset, amount] = price;
    msg += `price_asset=${asset}\nprice_amount=${amount}\n`;
  } else {
    msg += "price=none\n";
  }
  return msg;
}

/** Sign the dual-sig sub-message as the NEW owner (buyer or transfer
 *  recipient). `newOwnerPrivateKey`/`newOwnerPubHex` are the NEW
 *  owner's own keypair — a SEPARATE signature from the entry's own
 *  G/S, which the SELLER signs. */
export async function signDualSig({
  newOwnerPrivateKey,
  newOwnerPubHex,
  fqdn,
  priorRecordCid,
  price,
}) {
  const msg = dualSigSubmessage(fqdn, priorRecordCid, newOwnerPubHex, price ?? null);
  return signHex(newOwnerPrivateKey, msg);
}

/** Build and sign a KDOMXFER2 dual-signature domain transfer.
 *
 *  Mirrors the Rust `chain::domain_transfer_v2` byte for byte. Still
 *  seller-submitted (signs the whole entry in G/S), but the recipient's
 *  OWN detached signature over `dualSigSubmessage(...)` is carried
 *  inline in C[3], verified against C[2] — the seller alone cannot
 *  forge a transfer the new owner never agreed to.
 *
 *  `price` is `null` for a free transfer, or `[asset, amount]` to carry
 *  an optional sale price inline (C[4]/C[5]). */
export async function buildDomainTransferV2({
  privateKey,
  pubHex,
  pos,
  prevCid,
  fqdn,
  priorRecordCid,
  newOwnerPubHex,
  newOwnerSigHex,
  price,
  nowSec,
}) {
  if (!isValidFqdn(fqdn)) {
    throw new Error(
      `That name is not one this chain will carry ownership for. ` +
        `Missing: a lowercase dotted name of [a-z0-9-] labels (got ${JSON.stringify(fqdn)}). ` +
        `To fix: lowercase it and drop any character outside [a-z0-9-.].`,
    );
  }
  if (!/^[0-9a-f]{64}$/.test(priorRecordCid)) {
    throw new Error(
      `That prior record CID is not addressable. ` +
        `Missing: 64 lowercase hex chars (got ${priorRecordCid.length}). ` +
        `To fix: read the current head with DOM_WHO ${fqdn} and use its CID.`,
    );
  }
  if (!/^[0-9a-f]{64}$/.test(newOwnerPubHex)) {
    throw new Error(
      `That new-owner key is not addressable. ` +
        `Missing: a 64-char lowercase hex ed25519 pubkey (got ${newOwnerPubHex.length}). ` +
        `To fix: pass the recipient's public key as hex, not base64 or PEM.`,
    );
  }
  if (!/^[0-9a-f]{128}$/.test(newOwnerSigHex)) {
    throw new Error(
      `That new-owner signature is not addressable. ` +
        `Missing: 128 lowercase hex chars (got ${newOwnerSigHex.length}). ` +
        `To fix: pass signDualSig(...)'s result for this exact (fqdn, priorRecordCid, newOwnerPubHex, price).`,
    );
  }
  const h = hexOfUtf8(pubHex);
  const w = hexOfUtf8(fqdn);
  let body =
    `G${pubHex}-Y${Y_LEDGERENTRY}-V1-M${nowSec}-H${h}-K${DOMAIN_KIND_XFER2}` +
    `-W${w}-J${pos}-C${prevCid}-C${priorRecordCid}-C${newOwnerPubHex}-C${newOwnerSigHex}`;
  if (price) {
    const [asset, amount] = price;
    body += `-C${encodePriceField(asset)}-C${encodePriceField(amount)}`;
  }
  const sig = await signHex(privateKey, body);
  return `${body}-S${sig}`;
}

/** Build and sign a KDOMBUY1 native marketplace purchase.
 *
 *  Mirrors the Rust `chain::domain_purchase` byte for byte. Still
 *  seller-submitted; price is REQUIRED (never a free purchase).
 *
 *  `settlementValueObjectCid` (C[6]) is the CID of a real, live credit on
 *  `manifest_custody`'s own event-sourced custody index (a SEPARATE
 *  system from dense-wire's `lib.rs`/`store.rs` custody chain, which backs
 *  every OTHER feature here untouched), now held by the SELLER, proving
 *  `price` was actually paid. THIRD meaning for this field: originally a
 *  `TransferAtomic` entry on this chain's own ledger (dropped — that
 *  shape structurally carries no amount field), then a
 *  `lib.rs`-custody-chain `VALUEOBJECT` CID, now a `manifest_custody`
 *  credit CID — the first feature actually cut over to settle against it
 *  live. See `flx-transfer-builders.mjs`'s `buildReceipt`/`buildTransfer`
 *  for how a caller produces such a CID (typically a signed `R-` receipt
 *  crediting the seller directly), and `manifestSubmit`
 *  (`flx-wire.mjs`) for submitting it over the wire before referencing it
 *  here. The Rust side verifies this via
 *  `manifest_custody::verify_settlement` / `ManifestCustodyIndex::
 *  commit_consumption` in `domain_claims.rs`'s `DomainResolver::observe`,
 *  not here — this builder only checks the field is present and
 *  CID-shaped. */
export async function buildDomainPurchase({
  privateKey,
  pubHex,
  pos,
  prevCid,
  fqdn,
  priorRecordCid,
  buyerPubHex,
  buyerSigHex,
  price,
  settlementValueObjectCid,
  nowSec,
}) {
  if (!isValidFqdn(fqdn)) {
    throw new Error(
      `That name is not one this chain will carry ownership for. ` +
        `Missing: a lowercase dotted name of [a-z0-9-] labels (got ${JSON.stringify(fqdn)}). ` +
        `To fix: lowercase it and drop any character outside [a-z0-9-.].`,
    );
  }
  if (!/^[0-9a-f]{64}$/.test(priorRecordCid)) {
    throw new Error(
      `That prior record CID is not addressable. ` +
        `Missing: 64 lowercase hex chars (got ${priorRecordCid.length}). ` +
        `To fix: read the current head with DOM_WHO ${fqdn} and use its CID.`,
    );
  }
  if (!/^[0-9a-f]{64}$/.test(buyerPubHex)) {
    throw new Error(
      `That buyer key is not addressable. ` +
        `Missing: a 64-char lowercase hex ed25519 pubkey (got ${buyerPubHex.length}). ` +
        `To fix: pass the buyer's public key as hex, not base64 or PEM.`,
    );
  }
  if (!/^[0-9a-f]{128}$/.test(buyerSigHex)) {
    throw new Error(
      `That buyer signature is not addressable. ` +
        `Missing: 128 lowercase hex chars (got ${buyerSigHex.length}). ` +
        `To fix: pass signDualSig(...)'s result for this exact (fqdn, priorRecordCid, buyerPubHex, price).`,
    );
  }
  if (!Array.isArray(price) || price.length !== 2 || !price[0] || !price[1]) {
    throw new Error(
      `A purchase is never free. ` +
        `Missing: price = [asset, amount] (got ${JSON.stringify(price)}). ` +
        `To fix: pass both price_asset and price_amount.`,
    );
  }
  if (typeof settlementValueObjectCid !== "string" || settlementValueObjectCid.length === 0) {
    throw new Error(
      `That purchase carries no payment reference. ` +
        `Missing: C[6] = the CID of a real manifest_custody credit the seller now holds, ` +
        `proving payment (got ${JSON.stringify(settlementValueObjectCid)}). ` +
        `To fix: submit a buildReceipt/buildTransfer manifest crediting the seller first ` +
        `(see flx-transfer-builders.mjs + WireClient.manifestSubmit), then pass the ` +
        `resulting credit's CID here.`,
    );
  }
  const h = hexOfUtf8(pubHex);
  const w = hexOfUtf8(fqdn);
  const [asset, amount] = price;
  const body =
    `G${pubHex}-Y${Y_LEDGERENTRY}-V1-M${nowSec}-H${h}-K${DOMAIN_KIND_BUY}` +
    `-W${w}-J${pos}-C${prevCid}-C${priorRecordCid}-C${buyerPubHex}-C${buyerSigHex}` +
    `-C${encodePriceField(asset)}-C${encodePriceField(amount)}-C${settlementValueObjectCid}`;
  const sig = await signHex(privateKey, body);
  return `${body}-S${sig}`;
}

/** Build and sign a KRESOLV1 resolver-auto-chain launch.
 *
 *  Mirrors the Rust `chain::resolver_launch` byte for byte. Trimmed
 *  `ChainLaunch` sibling: no stake/token/escrow/treasury fields — a
 *  resolver's own deploy-time identity launches its own K-of-N chain,
 *  starting single-signer, and gains real peers through the same
 *  roster/K-of-N mechanism every other identity already uses.
 *
 *  `providerSetCid`/`speedParamsCid` must already be published blobs
 *  (`BLOB_PUT`) — `["<pubkey hex>", ...]` and
 *  `{"requiredK":N,"segmentIntervalSecs":N,"maxLinesPerSegment":N}`
 *  respectively, mirroring `chain_registry::parse_provider_set` /
 *  `parse_resolver_speed_params`.
 *
 *  Phase 0 (global resolvers) — `offerManifestCid`/`grammarManifestCid`
 *  must also already be published blobs (`flux.resolver-offer-
 *  manifest.v1` / `flux.resolver-grammar-manifest.v1`). `controlKeyHex`
 *  is a real 64-lowercase-hex ed25519 pubkey if this resolver should
 *  ever be upgradable, or `GENESIS_PREV` if it should be immutable
 *  forever — see `docs/design/global-resolvers.md`. */
export async function buildResolverLaunch({
  privateKey,
  pubHex,
  pos,
  prevCid,
  carrierChainId,
  newChainId,
  providerSetCid,
  speedParamsCid,
  offerManifestCid,
  grammarManifestCid,
  controlKeyHex,
  nowSec,
}) {
  if (!isChainIdShape(carrierChainId)) {
    throw new Error(
      `That carrier chain-id is not addressable. ` +
        `Missing: 3-32 lowercase alphanumeric characters (got ${JSON.stringify(carrierChainId)}). ` +
        `To fix: pass the chain-id that actually carries this launch record.`,
    );
  }
  if (!isChainIdShape(newChainId)) {
    throw new Error(
      `That new resolver chain-id is not addressable. ` +
        `Missing: 3-32 lowercase alphanumeric characters (got ${JSON.stringify(newChainId)}). ` +
        `To fix: choose a chain-id matching [a-z0-9]{3,32}.`,
    );
  }
  if (newChainId === carrierChainId) {
    throw new Error(
      `A ResolverLaunch cannot be carried by the chain it creates. ` +
        `Missing: a carrier chain-id different from ${newChainId}. ` +
        `To fix: carry this launch on the base chain or another existing chain.`,
    );
  }
  const h = hexOfUtf8(pubHex);
  const w = hexOfUtf8(newChainId);
  const body =
    `G${pubHex}-Y${Y_LEDGERENTRY}-V1-M${nowSec}-H${h}-N${carrierChainId}-K${RESOLVER_KIND_LAUNCH}` +
    `-W${w}-J${pos}-C${prevCid}-C${providerSetCid}-C${speedParamsCid}` +
    `-C${offerManifestCid}-C${grammarManifestCid}-C${controlKeyHex}`;
  const sig = await signHex(privateKey, body);
  return `${body}-S${sig}`;
}

/** Build and sign a KRESOLVUP1 resolver upgrade (Phase 0, global
 *  resolvers). Mirrors the Rust `chain::resolver_upgrade` byte for byte.
 *  `privateKey`/`pubHex` must be the EXACT control key the resolver's own
 *  `ResolverLaunch` declared — checked server-side, never here.
 *  `supersedesCid` must name the resolver's current declaration head
 *  exactly (the launch record's own CID the first time, the previous
 *  upgrade's own CID thereafter) — see `docs/design/global-resolvers.md`. */
/** Phase B1 (devnet-genesis-and-resolver-economy.md) — `newControlAuthority`
 *  restates the resolver's control authority going forward: a real
 *  64-lowercase-hex pubkey, the `GENESIS_PREV` sentinel (immutable
 *  forever), or a dao_id (hand control to a DAO multisig) — there is no
 *  separate "transfer ownership" record kind, an upgrade already is
 *  that record. **Real constraint**: a dao_id used here must be >= 16
 *  characters (`C` blocks have their own 16-byte grammar floor,
 *  tighter than a dao_id's own 3-32-character range) — shorter ones
 *  are valid dao_ids everywhere else but can never control a resolver.
 *  `quorumVotesBlobCid` is required when the resolver's CURRENT
 *  (pre-upgrade) authority is a DAO quorum, and omitted otherwise — a
 *  `SingleKey`-controlled resolver's own signature on this record is
 *  already its proof. */
export async function buildResolverUpgrade({
  privateKey,
  pubHex,
  pos,
  prevCid,
  resolverChainId,
  newOfferManifestCid,
  newGrammarManifestCid,
  supersedesCid,
  newControlAuthority,
  quorumVotesBlobCid,
  nowSec,
}) {
  if (!isChainIdShape(resolverChainId)) {
    throw new Error(
      `That resolver chain-id is not addressable. ` +
        `Missing: 3-32 lowercase alphanumeric characters (got ${JSON.stringify(resolverChainId)}). ` +
        `To fix: pass the chain-id of the resolver being upgraded.`,
    );
  }
  const h = hexOfUtf8(pubHex);
  let body =
    `G${pubHex}-Y${Y_LEDGERENTRY}-V1-M${nowSec}-H${h}-N${resolverChainId}-K${RESOLVER_KIND_UPGRADE}` +
    `-J${pos}-C${prevCid}-C${newOfferManifestCid}-C${newGrammarManifestCid}-C${supersedesCid}` +
    `-C${newControlAuthority}`;
  if (quorumVotesBlobCid) {
    body += `-C${quorumVotesBlobCid}`;
  }
  const sig = await signHex(privateKey, body);
  return `${body}-S${sig}`;
}

/** Build and sign a resolver's own generic `ResolverRecord` (Phase 0,
 *  global resolvers). Mirrors the Rust `chain::resolver_record` byte for
 *  byte. `kindMarker` is whatever `K` value the resolver itself invented
 *  for this record kind — dense-wire never inspects it beyond admitting
 *  the grammar; it must contain no `-` (the grammar's only delimiter).
 *  `inlinePayload` is free text, carried as hex-of-UTF-8 in `C[1]`. */
export async function buildResolverRecord({
  privateKey,
  pubHex,
  pos,
  prevCid,
  resolverChainId,
  kindMarker,
  inlinePayload,
  nowSec,
}) {
  if (!isChainIdShape(resolverChainId)) {
    throw new Error(
      `That resolver chain-id is not addressable. ` +
        `Missing: 3-32 lowercase alphanumeric characters (got ${JSON.stringify(resolverChainId)}). ` +
        `To fix: pass the chain-id this record belongs to.`,
    );
  }
  const h = hexOfUtf8(pubHex);
  const payloadHex = hexOfUtf8(inlinePayload);
  const body =
    `G${pubHex}-Y${Y_LEDGERENTRY}-V1-M${nowSec}-H${h}-N${resolverChainId}-K${kindMarker}` +
    `-J${pos}-C${prevCid}-C${payloadHex}`;
  const sig = await signHex(privateKey, body);
  return `${body}-S${sig}`;
}

/** Build and sign a KPRV1 provider announce (Phase B.1 / Phase 2 global
 *  resolvers' service discovery). Mirrors the Rust `chain::provider_
 *  announce` byte for byte. `chainId` is whichever chain this peer is
 *  announcing presence for — the base chain, a sovereign chain, or (new
 *  in Phase 2) a resolver's own chain-id; the grammar is identical
 *  either way. `reachAddress` is this peer's real network address,
 *  carried as hex-of-UTF-8 in `W` — see `docs/design/global-
 *  resolvers.md`'s "Phase 2, Step 1" for why this is the real service-
 *  discovery primitive. `stakeCid`/`attestationCid` only need to be
 *  present (any CID-shaped string) for a resolver's own genesis
 *  provider — their content is never inspected by `admit()`. */
export async function buildProviderAnnounce({
  privateKey,
  pubHex,
  pos,
  prevCid,
  chainId,
  reachAddress,
  stakeCid,
  attestationCid,
  heartbeatDeadline,
  nowSec,
}) {
  if (!isChainIdShape(chainId)) {
    throw new Error(
      `That chain-id is not addressable. ` +
        `Missing: 3-32 lowercase alphanumeric characters (got ${JSON.stringify(chainId)}). ` +
        `To fix: pass the chain-id being announced for.`,
    );
  }
  const h = hexOfUtf8(pubHex);
  const w = hexOfUtf8(reachAddress);
  const body =
    `G${pubHex}-Y${Y_LEDGERENTRY}-V1-M${nowSec}-D${heartbeatDeadline}-H${h}-N${chainId}` +
    `-K${PROVIDER_KIND_ANNOUNCE}-W${w}-J${pos}-C${prevCid}-C${stakeCid}-C${attestationCid}`;
  const sig = await signHex(privateKey, body);
  return `${body}-S${sig}`;
}

/** Build and sign a KACLEV1 ACL grant evidence entry.
 *
 *  Mirrors the Rust `chain::acl_evidence` byte for byte. ACR's own record
 *  kind: `aclGrantJson` is the grant's canonical JSON (`{acl, sig}` from
 *  `flux-auth`'s `createAcl`/`signAcl`), hex-of-utf8-encoded and carried
 *  inline in `C[1]` — never behind a second content-store CID. This
 *  record's own signature only proves ACR's own chain wrote the entry;
 *  the grant's inner `sig` is verified separately by
 *  `verifyAclSignature` at the application layer. */
export async function buildAclEvidence({
  privateKey,
  pubHex,
  pos,
  prevCid,
  chainId,
  subject,
  aclGrantJson,
  nowSec,
}) {
  if (!isChainIdShape(chainId)) {
    throw new Error(
      `That resolver chain-id is not addressable. ` +
        `Missing: 3-32 lowercase alphanumeric characters (got ${JSON.stringify(chainId)}). ` +
        `To fix: pass the ACR chain's own chain-id.`,
    );
  }
  if (typeof subject !== "string" || subject.length === 0) {
    throw new Error(
      `That ACL evidence names no subject. ` +
        `Missing: a non-empty subject string (got ${JSON.stringify(subject)}). ` +
        `To fix: pass the resource/subject this grant governs.`,
    );
  }
  if (typeof aclGrantJson !== "string" || aclGrantJson.length === 0) {
    throw new Error(
      `That ACL evidence carries no grant. ` +
        `Missing: the grant's canonical JSON string (got ${JSON.stringify(aclGrantJson)}). ` +
        `To fix: pass createAcl/signAcl's canonical {acl, sig} JSON.`,
    );
  }
  const h = hexOfUtf8(pubHex);
  const w = hexOfUtf8(subject);
  const grantHex = hexOfUtf8(aclGrantJson);
  const body =
    `G${pubHex}-Y${Y_LEDGERENTRY}-V1-M${nowSec}-H${h}-N${chainId}-K${ACL_KIND_EVIDENCE}` +
    `-W${w}-J${pos}-C${prevCid}-C${grantHex}`;
  const sig = await signHex(privateKey, body);
  return `${body}-S${sig}`;
}

/** Reproduce the bytes a segment vote covers. Mirrors
 *  `LedgerSegment::covered()` in src/chain_segment.rs exactly.
 *
 *  Two forms, and they are deliberately incompatible:
 *
 *    base chain (no chainId):
 *      DOMAIN_V1 || seq || prev_root_len || prev_root || lines_count || root
 *    chain-scoped (Phase B.3, a launched sub-chain):
 *      DOMAIN_V2 || chain_id_len || chain_id || seq || ... || root
 *
 *  The chain-id is inside the SIGNED bytes under its own domain, not merely
 *  on the wire. If it were only on the wire, a signature over a base-chain
 *  segment would transfer to a sub-chain segment with the same sequence,
 *  root and lines, and an attacker could retarget a finalized base-chain
 *  segment at a sub-chain whose committee never saw it.
 *
 *  Locked against the Rust side by
 *  `chain_registry::tests::a_base_chain_signature_cannot_be_replayed_onto_a_sub_chain`. */
const DOMAIN_V1 = new TextEncoder().encode("FLX-LEDGER-SEGMENT-V1\0");
const DOMAIN_V2 = new TextEncoder().encode("FLX-LEDGER-SEGMENT-V2\0");

/** The one chain-id rule, mirroring `chain::is_chain_id_shape`: 3-32
 *  lowercase alphanumeric. A browser must not sign for a chain-id the
 *  server would refuse — it would look like a bad signature. */
export function isChainIdShape(value) {
  return typeof value === "string" && /^[a-z0-9]{3,32}$/.test(value);
}

/** Recompute a segment's root from its own lines. Mirrors
 *  `chain_segment.rs::segment_root` exactly:
 *    DOMAIN_V1 || seq || prev_len || prev || lines_len || (line_len || line)*
 *
 *  F4: a signer that only ever sees a root is attesting to a number the
 *  server handed it. Recomputing the root from the lines the server also
 *  handed it is what turns `SEG_SIG` from "I trust you" into "I checked".
 *  A dishonest producer can still show a signer anything — but it can no
 *  longer show one thing and get a signature over another.
 *
 *  Note this is the v1 (base-chain) domain. Chain-scoped roots are not
 *  reconstructed here because the browser does not sign sub-chain segments
 *  yet; `segmentCoveredBytes` takes a chainId, this does not. */
export async function segmentRootFromLines({ sequence, previousRoot, lines }) {
  const enc = new TextEncoder();
  const prev = enc.encode(previousRoot);
  const encoded = lines.map((l) => enc.encode(l));
  const total =
    DOMAIN_V1.length + 8 + 8 + prev.length + 8 +
    encoded.reduce((n, b) => n + 8 + b.length, 0);
  const buf = new Uint8Array(total);
  let o = 0;
  buf.set(DOMAIN_V1, o); o += DOMAIN_V1.length;
  writeBE64(buf, o, BigInt(sequence)); o += 8;
  writeBE64(buf, o, BigInt(prev.length)); o += 8;
  buf.set(prev, o); o += prev.length;
  writeBE64(buf, o, BigInt(lines.length)); o += 8;
  for (const line of encoded) {
    writeBE64(buf, o, BigInt(line.length)); o += 8;
    buf.set(line, o); o += line.length;
  }
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function segmentCoveredBytes({ sequence, previousRoot, root, linesCount, chainId }) {
  const enc = new TextEncoder();
  const prev = enc.encode(previousRoot);
  const rootB = enc.encode(root);
  // `undefined`/`null` means the base chain and reproduces v1 byte for byte,
  // so every signer already deployed keeps producing identical signatures.
  const scoped = chainId !== undefined && chainId !== null;
  if (scoped && !isChainIdShape(chainId)) {
    throw new Error(`refusing to sign for an illegal chain-id: ${chainId}`);
  }
  const domain = scoped ? DOMAIN_V2 : DOMAIN_V1;
  const chain = scoped ? enc.encode(chainId) : null;
  const total =
    domain.length +
    (scoped ? 8 + chain.length : 0) +
    8 + 8 + prev.length + 8 + rootB.length;
  const buf = new Uint8Array(total);
  let o = 0;
  buf.set(domain, o); o += domain.length;
  if (scoped) {
    writeBE64(buf, o, BigInt(chain.length)); o += 8;
    buf.set(chain, o); o += chain.length;
  }
  writeBE64(buf, o, BigInt(sequence)); o += 8;
  writeBE64(buf, o, BigInt(prev.length)); o += 8;
  buf.set(prev, o); o += prev.length;
  writeBE64(buf, o, BigInt(linesCount)); o += 8;
  buf.set(rootB, o);
  return buf;
}

/** Sign the covered bytes of a segment snapshot. Returns hex. */
export async function signSegmentCovered(privateKey, snapshot) {
  const bytes = segmentCoveredBytes(snapshot);
  return signBytesHex(privateKey, bytes);
}

function writeBE64(buf, offset, value) {
  for (let i = 7; i >= 0; i--) {
    buf[offset + i] = Number(value & 0xffn);
    value >>= 8n;
  }
}

/** Convenience: compute CID of a built manifest. */
export async function cidOf(text) {
  return sha256Hex(text);
}

/** For completeness: strip-and-return the signature prefix bytes (what the
 *  single-signer S block of a built record actually covers). Useful if a
 *  caller wants to verify locally before shipping. */
export { signaturePrefix };

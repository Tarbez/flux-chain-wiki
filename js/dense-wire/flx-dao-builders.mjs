// FLX DAO/treasury ceremony builders — JS port of dense-wire's real N-of-M
// multisig DAO founding, treasury binding, and treasury spend.
//
// Mirrors `src/chain.rs`'s `dao_found`/`dao_treasury_init`/`treasury_spend`
// (the exact `format!` block layouts, ~4171-4298), `src/dao.rs`'s
// `dao_found_vote_covered_bytes`/`render_dao_signer_blob` (~71-120), and
// `src/treasury.rs`'s `treasury_spend_vote_covered_bytes`/
// `render_payout_manifest` (~47-83). `dao_treasury_init_vote_covered_bytes`
// is also ported from `src/dao.rs` (~94-104).
//
// Unlike the Intent/Offer/Agreement/ValueObject/Fulfillment kinds in
// `flx-transfer-builders.mjs`, every record built here is a plain
// `Y=LEDGERENTRY` record (Kind::LedgerEntry.code()) carrying a `K` kind
// marker — these go through the SAME admit() path the pre-existing
// peer-announce/domain-transfer builders in `flx-builders.mjs` already use,
// just with a new `N` (chain-id scope) block the dumb-parser's SHAPE table
// now also recognizes.
//
// Builders here take a `signer` shaped
// `{ pubHex, signText(asciiText): Promise<hexSig>, signBytes(bytes): Promise<hexSig> }`
// (see `flx-identity-bridge.mjs`) — NOT a raw Web Crypto `CryptoKey`.

import { hexOfUtf8 } from "./flx-dumb-parser.mjs";
import { DOCS } from "./flx-transfer-builders.mjs";
import { hexOfUtf8C } from "./flx-native-transfer.mjs";

/** `chain.rs` ~3381-3394. */
export const DAO_KIND_FOUND = "KDAO1";
export const DAO_KIND_TREASURY_INIT = "KDAOTREAS1";
export const TREASURY_KIND_SPEND = "KTSPEND1";
export const NATIVE_KIND_MINT = "KNMINT1";
/** `native_spend.rs` NATIVE_SPEND_KIND. */
export const NATIVE_KIND_TREASURY_SPEND = "KNTSPEND1";
export const BASE_CHAIN_ID = "defxn";

const Y_LEDGERENTRY = "LEDGERENTRY";

/** `dao_found`, src/chain.rs ~4188-4212. Always runs on `BASE_CHAIN_ID` —
 *  a DAO is base-chain-native, never tied to a sovereign-chain launch. */
export async function daoFound(submitter, pos, prevCid, daoId, quorumThreshold, signersBlobCid, quorumBlobCid, registeredAt) {
  const h = hexOfUtf8(submitter.pubHex);
  const w = hexOfUtf8(daoId);
  const text =
    `G${submitter.pubHex}-Y${Y_LEDGERENTRY}-V1-M${registeredAt}-D${quorumThreshold}-H${h}-N${BASE_CHAIN_ID}` +
    `-K${DAO_KIND_FOUND}-W${w}-J${pos}-C${prevCid}-C${signersBlobCid}-C${quorumBlobCid}`;
  const sig = await submitter.signText(text);
  return `${text}-S${sig}`;
}

/** `dao_treasury_init`, src/chain.rs ~4225-4248. A separate,
 *  independently quorum-authorized action from [`daoFound`]: no `D` block
 *  here (unlike `daoFound`'s quorum-threshold `D`) — the quorum this cites
 *  is the founding DAO's own, re-derived server-side from `daoFoundCid`. */
export async function daoTreasuryInit(submitter, pos, prevCid, daoId, daoFoundCid, treasuryPubkey, quorumBlobCid, boundAt) {
  const h = hexOfUtf8(submitter.pubHex);
  const w = hexOfUtf8(daoId);
  const text =
    `G${submitter.pubHex}-Y${Y_LEDGERENTRY}-V1-M${boundAt}-H${h}-N${BASE_CHAIN_ID}` +
    `-K${DAO_KIND_TREASURY_INIT}-W${w}-J${pos}-C${prevCid}-C${daoFoundCid}-C${treasuryPubkey}-C${quorumBlobCid}`;
  const sig = await submitter.signText(text);
  return `${text}-S${sig}`;
}

/** `treasury_spend`, src/chain.rs ~4260-4287. Authorization is entirely
 *  the cited DAO's own quorum; no amount or destination is re-checked by
 *  `admit()` — `manifestBlobCid` is the content address of the
 *  destination/amount legs (see [`renderPayoutManifest`]). */
export async function treasurySpend(submitter, pos, prevCid, daoId, daoFoundCid, inputCid, manifestBlobCid, quorumBlobCid, now) {
  const h = hexOfUtf8(submitter.pubHex);
  const w = hexOfUtf8(daoId);
  const text =
    `G${submitter.pubHex}-Y${Y_LEDGERENTRY}-V1-M${now}-H${h}-N${BASE_CHAIN_ID}` +
    `-K${TREASURY_KIND_SPEND}-W${w}-J${pos}-C${prevCid}-C${daoFoundCid}-C${inputCid}-C${manifestBlobCid}-C${quorumBlobCid}`;
  const sig = await submitter.signText(text);
  return `${text}-S${sig}`;
}

/** `{"treasuryKey":"<64-hex>","distributedSupply":N,"computeReserveSupply":N}`
 *  — mirrors the Rust `native_ledger::render_base_chain_mint_params` byte
 *  for byte (same key order, same JSON shape). Published via `BLOB_PUT`,
 *  then referenced by CID in `baseChainNativeMint`'s own `C[3]` — never
 *  carried as bare digits, because a short number fails the grammar's
 *  own 16-byte floor on a `C` block. */
export function renderBaseChainMintParams(treasuryKeyHex, distributedSupply, computeReserveSupply) {
  return (
    `{"treasuryKey":"${treasuryKeyHex}","distributedSupply":${distributedSupply},` +
    `"computeReserveSupply":${computeReserveSupply}}`
  );
}

/** Build and sign the base chain's own `NativeMint` — "treat FXN like any
 *  other chain's native token" (user directive, 2026-10-15), minted
 *  through a real identity-signed UI action (this file's own `signText`
 *  convention — the genesis page's real Auth Kit identity, via `flx-
 *  identity-bridge.mjs`'s `authKitSigner`), never an env-configured
 *  auto-mint. Mirrors the Rust `native_ledger::build_base_chain_native_
 *  mint` byte for byte — note there is no `N` block, unlike [`daoFound`]/
 *  [`treasurySpend`] above: the base chain's own records were never
 *  given one (see `chain::native_ledger::build_native_mint`, the
 *  ordinary sub-chain mint this mirrors). `submitter.pubHex` must be the
 *  one identity the server is configured with as `CHAIN_SERVER_GENESIS_
 *  KEY` — checked server-side, never here; a mismatched key still builds
 *  and signs a well-formed record, it simply never mints (see that env
 *  var's own doc comment in `chain_server.rs::genesis_mint_authorized`).
 *  `paramsCid` must already be published (`BLOB_PUT` the output of
 *  [`renderBaseChainMintParams`]) before calling this. */
export async function baseChainNativeMint(submitter, pos, prevCid, paramsCid, now) {
  const h = hexOfUtf8(submitter.pubHex);
  const w = hexOfUtf8(BASE_CHAIN_ID);
  const text =
    `G${submitter.pubHex}-Y${Y_LEDGERENTRY}-V1-M${now}-H${h}-K${NATIVE_KIND_MINT}` +
    `-W${w}-J${pos}-C${prevCid}-C${DOCS.asset}-C${paramsCid}`;
  const sig = await submitter.signText(text);
  return `${text}-S${sig}`;
}

/** Big-endian u64 length-prefix, matching `flx-builders.mjs`'s
 *  `writeBE64`/`segmentCoveredBytes` pattern byte for byte (duplicated
 *  rather than imported since that helper isn't exported from the
 *  pre-existing, already-deployed file and this task must not add new
 *  exports there). */
function writeBE64(buf, offset, value) {
  for (let i = 7; i >= 0; i--) {
    buf[offset + i] = Number(value & 0xffn);
    value >>= 8n;
  }
}

/** Append `(domain-tag, then each field length-prefixed)` the same way
 *  `dao.rs`'s/`treasury.rs`'s vote-covered-bytes functions do: the domain
 *  tag is NOT length-prefixed, every field after it is. */
function coveredBytes(domain, fields) {
  const enc = new TextEncoder();
  const domainBytes = enc.encode(domain);
  const fieldBytes = fields.map((f) => enc.encode(f));
  const total = domainBytes.length + fieldBytes.reduce((n, b) => n + 8 + b.length, 0);
  const buf = new Uint8Array(total);
  let o = 0;
  buf.set(domainBytes, o); o += domainBytes.length;
  for (const b of fieldBytes) {
    writeBE64(buf, o, BigInt(b.length)); o += 8;
    buf.set(b, o); o += b.length;
  }
  return buf;
}

/** `dao_found_vote_covered_bytes`, src/dao.rs ~71-86. Binds to
 *  `signersBlobText` directly, as fetched — never a reconstruction from a
 *  parsed-and-sorted list. */
export function daoFoundVoteCoveredBytes(daoId, quorumThreshold, registeredAt, signersBlobText) {
  return coveredBytes("FLX-DAO-FOUND-VOTE-V1\0", [
    daoId,
    String(quorumThreshold),
    String(registeredAt),
    signersBlobText,
  ]);
}

/** `dao_treasury_init_vote_covered_bytes`, src/dao.rs ~94-104. No blob is
 *  involved — `treasuryPubkey` and `boundAt` are the record's own fields. */
export function daoTreasuryInitVoteCoveredBytes(daoId, treasuryPubkey, boundAt) {
  return coveredBytes("FLX-DAO-TREASURY-INIT-VOTE-V1\0", [daoId, treasuryPubkey, String(boundAt)]);
}

/** `treasury_spend_vote_covered_bytes`, src/treasury.rs ~53-61. Binds to
 *  `manifestText` directly, as fetched. */
export function treasurySpendVoteCoveredBytes(daoId, inputCid, manifestText) {
  return coveredBytes("FLX-TREASURY-SPEND-VOTE-V1\0", [daoId, inputCid, manifestText]);
}

/** `render_dao_signer_blob`, src/dao.rs ~112-120: `["<signer hex>", ...]`
 *  — SORTED. Plain JSON, no shared vocabulary: far below Flux Compact's
 *  break-even (~430 entries plain-text, ~215 against the old JSON+base64
 *  wrapper), never hex-wrapped. Exact Rust: `format!("[{}]", rows.join(","))`
 *  where each row is `format!("\"{s}\"")` — no spaces anywhere. */
export function renderDaoSignerBlob(signers) {
  const sorted = [...signers].sort();
  const rows = sorted.map((s) => `"${s}"`);
  return `[${rows.join(",")}]`;
}

/** `render_payout_manifest`, src/treasury.rs ~74-83: `[{"destination":"<hex>","amount":<amount>},...]`
 *  — the AUTHOR's own order, NOT sorted (unlike the signer blob, which is
 *  gathered independently by many voters and so has something to
 *  canonicalize order against; a payout manifest is authored whole by one
 *  proposer). Exact Rust row: `format!("{{\"destination\":\"{destination}\",\"amount\":{amount}}}")`. */
export function renderPayoutManifest(legs) {
  const rows = legs.map(([destination, amount]) => `{"destination":"${destination}","amount":${amount}}`);
  return `[${rows.join(",")}]`;
}

/** `native_spend_vote_covered_bytes`, src/native_spend.rs. The exact bytes a
 *  DAO signer votes over to move native tokens out of the DAO's treasury:
 *  its own domain tag, then dao_id, chain_id, recipient, amount, spentAt
 *  (unix MILLISECONDS), each length-prefixed. */
export function nativeTreasurySpendVoteCoveredBytes(daoId, chainId, toKeyHex, amount, spentAt) {
  return coveredBytes("FLX-NATIVE-TREASURY-SPEND-VOTE-V1\0", [
    daoId,
    chainId,
    toKeyHex,
    BigInt(amount).toString(),
    String(spentAt),
  ]);
}

/** `native_spend_key`: the identity of one authorized spend, the SHA-256 of
 *  its covered bytes. The ceremony is keyed by it, and so is the ledger
 *  event, which is why the same votes can move value only once. */
export async function nativeSpendKey(daoId, chainId, toKeyHex, amount, spentAt) {
  const covered = nativeTreasurySpendVoteCoveredBytes(daoId, chainId, toKeyHex, amount, spentAt);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", covered));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** `build_native_spend`, src/native_spend.rs: a `KNTSPEND1` record moving
 *  `amount` of `chainId`'s native token from the DAO's bound treasury to
 *  `toKeyHex`. `submitter` is anyone (its own chain position `pos`/
 *  `prevCid`); the authority is the quorum votes blob, never the submitter. */
export async function nativeTreasurySpend(submitter, pos, prevCid, daoId, chainId, toKeyHex, amount, spentAt, daoFoundCid, quorumBlobCid) {
  const units = BigInt(amount);
  if (units <= 0n) throw new Error("nativeTreasurySpend: amount must be positive");
  if (!/^[0-9a-f]{64}$/.test(toKeyHex)) throw new Error("nativeTreasurySpend: toKeyHex must be a 64-hex public key");
  if (!Number.isInteger(spentAt) || spentAt < 100_000_000_000) throw new Error("nativeTreasurySpend: spentAt must be unix MILLISECONDS");
  const text =
    `G${submitter.pubHex}-Y${Y_LEDGERENTRY}-V1-M${spentAt}-H${hexOfUtf8(submitter.pubHex)}-K${NATIVE_KIND_TREASURY_SPEND}` +
    `-W${hexOfUtf8(toKeyHex)}-J${pos}-C${prevCid}-C${hexOfUtf8C(chainId)}-C${hexOfUtf8C(daoId)}` +
    `-C${daoFoundCid}-C${quorumBlobCid}-T${units}NATIVE`;
  const sig = await submitter.signText(text);
  return `${text}-S${sig}`;
}

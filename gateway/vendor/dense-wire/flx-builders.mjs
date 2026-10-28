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
export const DOMAIN_KIND_CLAIM = "KDOMCLAIM2";
export const DOMAIN_KIND_RECORD_UPDATE = "KDOMREC2";
export const DOMAIN_KIND_XFER2 = "KDOMXFER2";
export const DOMAIN_KIND_BUY = "KDOMBUY1";
export const RECORD_GENESIS_PREV = "0".repeat(64);
export const RESOLVER_KIND_LAUNCH = "KRESOLV1";
/** Round four (r4a): a backed launch's `KCHAIN1` (`chain::chain_launch`). */
export const CHAIN_KIND_LAUNCH = "KCHAIN1";
export const RESOLVER_KIND_UPGRADE = "KRESOLVUP1";
export const CAPABILITY_KIND_LAUNCH = "KCAP1";
export const CAPABILITY_KIND_UPGRADE = "KCAPUP1";
export const PROVIDER_KIND_ANNOUNCE = "KPRV1";
export const ACL_KIND_EVIDENCE = "KACLEV1";
export const CURVE_SWAP_KIND_INTENT = "KCVSI1";
/** The graduated pool's swap intent (`pool::CSWAP_KIND_INTENT`). */
export const POOL_SWAP_KIND_INTENT = "KCSWI1";
/** A V2 SELL's fund_credit: 64 zeros, "no credit spent" (`pool::NO_FUND_CREDIT`). */
export const NO_FUND_CREDIT = "0".repeat(64);
export const GENESIS_PREV = "0".repeat(64);
export const Y_LEDGERENTRY = "LEDGERENTRY";

/** Same rule as the Rust `is_valid_fqdn` (generic dotted name). Every
 *  domain verb uses the narrower `isClaimableDomainName` on top of it. */
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
 *  Shape mirrors `chain::genesis_on` + `chain::entry`. `network` names the root the record cites
 *  (`networkRoot`); it defaults to the devnet, whose root is `GENESIS_PREV`. */
export async function buildGenesis({ privateKey, pubHex, nowSec, network = NETWORK_DEVNET }) {
  const idRef = await sha256Hex(pubHex); // sha256 of the key's hex-utf8 bytes
  const h = hexOfUtf8(pubHex);
  const root = await networkRoot(network);
  const body = `G${pubHex}-Y${Y_LEDGERENTRY}-V1-M${nowSec}-H${h}-J0-C${root}-C${idRef}`;
  const sig = await signHex(privateKey, body);
  return `${body}-S${sig}`;
}

/** Byte-exact port of `pool::SwapTerms::canonical` (wave 2C), both grammars.
 *  V1 (no `fundCredit` given): `FLX-CSWAP-TERMS-V1` NUL-delimited — the
 *  unbacked lane's grammar. V2 (`fundCredit` given): `FLX-CSWAP-TERMS-V2`
 *  TAB-delimited, what funds a BUY or 64 zeros on a SELL. Since one FXN
 *  step 4 a buy's `fundCredit` is the CID of the buyer's native FXN lock
 *  (KNLOCK1 on `nlocks`, base chain, purpose `buy`, beneficiary the pool
 *  escrow, holding at least `amountIn`, deadline after the intent's;
 *  flx-native-locks.mjs); a custody credit is refused. `side` is
 *  "B" or "S"; on a curve sell `amountIn` is bps of the seller's balance.
 *  A backed launch admits V2 only.
 *
 *  Wave 3E — V3 (`fundCredit` AND `maxFee` given): `FLX-CSWAP-TERMS-V3`, the
 *  V2 fields then `maxFee`, the most FXN in fees the trader signs for on this
 *  intent's row (mm + venue, plus lp on a buy). A launch whose economy
 *  charges any fee admits V3 only; V2 stays admitted where every fee is 0. */
export function curveSwapTermsCanonical({ side, amountIn, minOut, deadline, nonce, fundCredit, maxFee, native }) {
  if (side !== "B" && side !== "S") throw new Error(`side must be B or S, got ${side}`);
  // Signed resolution (2026-10-28) — V4 (`native: true`): no credit. A buy is funded by its own intent
  // (`buildNativeBuyIntentWithSigner`), which names the most native FXN it may debit; `maxFee` as V3.
  if (native) {
    if (fundCredit !== undefined && fundCredit !== null) throw new Error("a V4 intent names no credit. Missing: nothing. To fix: drop fundCredit, or drop native for a V3 intent");
    if (!Number.isSafeInteger(maxFee) || maxFee < 0) throw new Error(`maxFee ${maxFee} is not a whole number of FXN units. Missing: maxFee as a non-negative integer. To fix: sign the most FXN you will pay in fees`);
    return `FLX-CSWAP-TERMS-V4\t${side}\t${amountIn}\t${minOut}\t${deadline}\t${nonce}\t${maxFee}`;
  }
  if (fundCredit === undefined || fundCredit === null) {
    if (maxFee !== undefined && maxFee !== null) {
      throw new Error("a V3 intent signs maxFee beside the credit it spends. Missing: fundCredit (64 zeros on a sell). To fix: pass fundCredit with maxFee");
    }
    return `FLX-CSWAP-TERMS-V1\u0000${side}\u0000${amountIn}\u0000${minOut}\u0000${deadline}\u0000${nonce}`;
  }
  const credit = side === "S" ? NO_FUND_CREDIT : String(fundCredit);
  if (side === "B" && (!/^[0-9a-f]{64}$/.test(credit) || credit === NO_FUND_CREDIT)) {
    throw new Error("a V2 buy names the native FXN lock that funds it. Missing: fundCredit, the 64-hex CID of a KNLOCK1 (purpose buy, beneficiary the pool escrow). To fix: lock FXN first (flx-native-locks.mjs buildNativeLock with buyLockTerms) and pass that lock's CID");
  }
  const v2 = `${side}\t${amountIn}\t${minOut}\t${deadline}\t${nonce}\t${credit}`;
  if (maxFee === undefined || maxFee === null) return `FLX-CSWAP-TERMS-V2\t${v2}`;
  if (!Number.isSafeInteger(maxFee) || maxFee < 0) {
    throw new Error(`maxFee ${maxFee} is not a whole number of FXN units. Missing: maxFee as a non-negative integer. To fix: sign the most FXN you will pay in fees`);
  }
  return `FLX-CSWAP-TERMS-V3\t${v2}\t${maxFee}`;
}

/** `pool::SwapTerms::cid`: sha256 of the canonical text. */
export async function curveSwapTermsCid(terms) {
  return sha256Hex(curveSwapTermsCanonical(terms));
}

/** Build and sign a KCVSI1 curve-swap intent (`curve::curve_swap_intent`):
 *  the signed text commits to the terms by CID only, so the wire line
 *  (`curveSwapLine`) always carries the plaintext fields beside it. */
export async function buildCurveSwapIntent({ privateKey, ...rest }) {
  return buildCurveSwapIntentWithSigner({ signer: { pubHex: rest.pubHex, signText: (body) => signHex(privateKey, body) }, ...rest });
}

/** Same record, signed by a `{pubHex, signText}` signer (a seed signer, a
 *  vault, ArkAdminAuth) — the `...WithSigner` convention the other builders use. */
export async function buildCurveSwapIntentWithSigner({ signer, pos, prevCid, chainId, terms, nowSec }) {
  return buildSwapIntentWithSigner(CURVE_SWAP_KIND_INTENT, { signer, pos, prevCid, chainId, terms, nowSec });
}

/** Signed resolution (2026-10-28) — a native buy intent (`curve::curve_swap_intent_native`): Terms V4 (`native: true`),
 *  ONE record that is also the buy's funding. It rides the buyer's own BASE list (`N` = the base chain), at the
 *  buyer's next base position — the list its native transfers and locks take positions on, so a buy and a transfer of
 *  one key are ordered by the key's own chain — and its `T` box names the most native FXN it may debit
 *  (`amountIn + maxFee`). Every node moves that much into the intent's keyless hold when it admits the record; the
 *  signed result pays the fill out of it, and the rest returns to the buyer. Send it with `curveSwapLine` (field 9
 *  `native`). The terms' deadline must fall within 7,200 s of `nowSec`. */
export async function buildNativeBuyIntentWithSigner({ signer, pos, prevCid, chainId, terms, nowSec }) {
  if (terms.side !== "B" || !terms.native) throw new Error("a native buy intent is a buy with native: true terms. Missing: side B and native: true. To fix: build the terms as V4");
  const debit = BigInt(terms.amountIn) + BigInt(terms.maxFee);
  const pubHex = signer.pubHex;
  const termsCid = await curveSwapTermsCid(terms);
  const body = `G${pubHex}-Y${Y_LEDGERENTRY}-V1-M${nowSec}-H${hexOfUtf8(pubHex)}-K${CURVE_SWAP_KIND_INTENT}-W${hexOfUtf8(chainId)}-Ndefxn-J${pos}-C${prevCid}-T${debit}NATIVE-C${termsCid}`;
  const sig = await signer.signText(body);
  return { text: `${body}-S${sig}`, termsCid };
}

/** Wave 3H/WP11 — the graduated pool's swap intent (`pool::cswap_intent`):
 *  the curve intent's layout under `KCSWI1`, `W` = hex of the chain id, the
 *  same `SwapTerms` grammar (V1, V2 or V3) committed by CID. A backed
 *  launch's pool admits V2 or later only. */
export async function buildPoolSwapIntent({ privateKey, ...rest }) {
  return buildPoolSwapIntentWithSigner({ signer: { pubHex: rest.pubHex, signText: (body) => signHex(privateKey, body) }, ...rest });
}

/** Same record, signed by a `{pubHex, signText}` signer. */
export async function buildPoolSwapIntentWithSigner({ signer, pos, prevCid, chainId, terms, nowSec }) {
  return buildSwapIntentWithSigner(POOL_SWAP_KIND_INTENT, { signer, pos, prevCid, chainId, terms, nowSec });
}

/** The one swap-intent layout both venues sign (`curve::curve_swap_intent`,
 *  `pool::cswap_intent`); only the kind marker differs. */
async function buildSwapIntentWithSigner(kind, { signer, pos, prevCid, chainId, terms, nowSec }) {
  const pubHex = signer.pubHex;
  const termsCid = await curveSwapTermsCid(terms);
  const h = hexOfUtf8(pubHex);
  const w = hexOfUtf8(chainId);
  const body = `G${pubHex}-Y${Y_LEDGERENTRY}-V1-M${nowSec}-H${h}-K${kind}-W${w}-J${pos}-C${prevCid}-C${termsCid}`;
  const sig = await signer.signText(body);
  return { text: `${body}-S${sig}`, termsCid };
}

/** The `CURVE_SWAP` line: chain, signed text, side, amountIn, minOut,
 *  deadline, nonce, then (V2 only) the optional delegation cert (field 8,
 *  may be empty) and the fund credit (field 9: the buy's credit, or 64
 *  zeros on a sell), then (V3 only, wave 3E) `maxFee` as field 10. A V1
 *  line stops at the nonce (plus the cert if any). */
export function curveSwapLine(chainId, text, terms, delegationCert = "") {
  return swapLine("CURVE_SWAP", chainId, text, terms, delegationCert);
}

/** Wave 3H/WP11 — the `SWAP` line for a graduated pool, the same fields as
 *  `CURVE_SWAP` (`chain_server::swap_reply`): field 9 the Terms V2 fund
 *  credit, field 10 (V3 only) `maxFee`. Since round two's merge (e167065)
 *  the node's `SWAP` reads field 10 (`terms_max_fee_field`, the one parser
 *  `CURVE_SWAP` uses): a fee-charging launch's pool admits V3 only, and a
 *  V2 pool intent there is refused `TermsV2FeeLaunch`. */
export function poolSwapLine(chainId, text, terms, delegationCert = "") {
  return swapLine("SWAP", chainId, text, terms, delegationCert);
}

function swapLine(head, chainId, text, terms, delegationCert) {
  const base = `${head}\t${chainId}\t${text}\t${terms.side}\t${terms.amountIn}\t${terms.minOut}\t${terms.deadline}\t${terms.nonce}`;
  // Signed resolution — V4: field 9 is the word `native`, field 10 the maxFee.
  if (terms.native) return `${base}\t${delegationCert}\tnative\t${terms.maxFee}`;
  if (terms.fundCredit === undefined || terms.fundCredit === null) {
    return delegationCert ? `${base}\t${delegationCert}` : base;
  }
  const credit = terms.side === "S" ? NO_FUND_CREDIT : terms.fundCredit;
  // Wave 3E — field 10 is Terms V3's maxFee (present only when the terms signed one).
  const maxFee = terms.maxFee === undefined || terms.maxFee === null ? "" : `\t${terms.maxFee}`;
  return `${base}\t${delegationCert}\t${credit}${maxFee}`;
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

// --- Name ownership and records (`.ark` / `.deadark` / `.fxn`) ---------------
//
// dense-wire is the only authority for these names. Every builder below
// mirrors `src/chain.rs` byte for byte; `resolvers/domain/builder-vectors.tsv`
// holds real signed entries the Rust builders produced from fixed seeds and
// `test/builders.test.mjs` rebuilds each one here and compares. Each builder
// takes either `{ privateKey, pubHex }` (a Web Crypto key) or, in its
// `...WithSigner` form, a `{ pubHex, signText }` signer (flx-identity-bridge).
//
// `KDOMCLAIM1` and `KDOMREC1` (a client-computed record CID; hex canonical
// JSON) were never admitted by a live node and are removed, not kept as
// legacy; no past record was rewritten.

/** Same rule as the Rust `is_claimable_domain_name`, used by EVERY domain
 *  verb: exactly one label plus one of the three mesh TLDs (`nodes.fxn`,
 *  never `nodes.defxn.fxn`). `resolvers/domain/name-vectors.tsv` is read by
 *  the Rust tests and by `test/domain-names.test.mjs`, so the two cannot drift. */
export function isClaimableDomainName(name) {
  if (!isValidFqdn(name)) return false;
  const parts = name.split(".");
  if (parts.length !== 2) return false;
  const [label, tld] = parts;
  // a .fxn label of the key-name shape belongs to the key it is made from (keyName), never to a claim
  if (tld === "fxn" && isKeyNameLabel(label)) return false;
  return tld === "ark" || tld === "deadark" || tld === "fxn";
}

function refuseName(fqdn, what) {
  return new Error(
    `That name is not one this chain will ${what}. ` +
      `Missing: a flat name, exactly one label plus .ark, .deadark or .fxn (got ${JSON.stringify(fqdn)}). ` +
      `To fix: use a name like "nodes.fxn" (lowercase [a-z0-9-], no sub-labels).`,
  );
}

function requireCid(value, what, remedy) {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    throw new Error(
      `That ${what} is not addressable. ` +
        `Missing: 64 lowercase hex chars (got ${JSON.stringify(value)}). ` +
        `To fix: ${remedy}`,
    );
  }
}

function keySigner(privateKey, pubHex) {
  return { pubHex, signText: (body) => signHex(privateKey, body) };
}

/** `G Y V M H KK W J C[0]`: the head every domain entry shares. */
function domainEntryHead(pubHex, kind, fqdn, pos, prevCid, nowSec) {
  return `G${pubHex}-Y${Y_LEDGERENTRY}-V1-M${nowSec}-H${hexOfUtf8(pubHex)}-K${kind}-W${hexOfUtf8(fqdn)}-J${pos}-C${prevCid}`;
}

async function signDomainEntry(signer, body) {
  return `${body}-S${await signer.signText(body)}`;
}

/** A `KDOMCLAIM2`'s C[1]: sha256 hex of the name's UTF-8 bytes (Rust
 *  `chain::domain_claim_name_ref`). Derived from W; it carries no identity
 *  of its own. */
export async function domainClaimNameRef(fqdn) {
  return sha256Hex(fqdn);
}

/** Build and sign a KDOMXFER1 name transfer (current owner only).
 *  Mirrors the Rust `chain::domain_transfer`. `priorEntryCid` (alias
 *  `priorRecordCid`) is the entry CID of the name's current ownership head
 *  — read it with `DOM_WHO <name>`; naming a superseded entry is how a
 *  replayed transfer would roll ownership back, and the node refuses it.
 *  `newOwnerPubHex` is the recipient's ed25519 pubkey (64 lowercase hex).
 *  Prefer `buildDomainTransferV2`, which carries the recipient's consent. */
export async function buildDomainTransfer({ privateKey, pubHex, ...rest }) {
  return buildDomainTransferWithSigner({ signer: keySigner(privateKey, pubHex), ...rest });
}

export async function buildDomainTransferWithSigner({ signer, pos, prevCid, fqdn, priorEntryCid, priorRecordCid, newOwnerPubHex, nowSec }) {
  const prior = priorEntryCid ?? priorRecordCid;
  if (!isClaimableDomainName(fqdn)) throw refuseName(fqdn, "carry ownership for");
  requireCid(prior, "prior ownership entry CID", `read the current head with DOM_WHO ${fqdn} and use its CID.`);
  requireCid(newOwnerPubHex, "new-owner key", "pass the recipient's ed25519 public key as 64 lowercase hex chars, not base64 or PEM.");
  const body = `${domainEntryHead(signer.pubHex, DOMAIN_KIND_XFER, fqdn, pos, prevCid, nowSec)}-C${prior}-C${newOwnerPubHex}`;
  return signDomainEntry(signer, body);
}

/** Build and sign a KDOMCLAIM2 name claim. Mirrors the Rust
 *  `chain::domain_claim`. Until a public claim-access decision exists (the
 *  Flux Access Resolver is not built), a node honors a claim only when its
 *  signer is the chain's genesis key (`CHAIN_SERVER_GENESIS_KEY`); any other
 *  key's claim is admitted onto its own chain but allocates nothing and the
 *  submit reply is `DOMAIN_REFUSED`. The claim's identity is its own entry
 *  CID (sha256 of the signed text). */
export async function buildDomainClaim({ privateKey, pubHex, ...rest }) {
  return buildDomainClaimWithSigner({ signer: keySigner(privateKey, pubHex), ...rest });
}

export async function buildDomainClaimWithSigner({ signer, pos, prevCid, fqdn, nowSec }) {
  if (!isClaimableDomainName(fqdn)) throw refuseName(fqdn, "issue a claim for");
  const body = `${domainEntryHead(signer.pubHex, DOMAIN_KIND_CLAIM, fqdn, pos, prevCid, nowSec)}-C${await domainClaimNameRef(fqdn)}`;
  return signDomainEntry(signer, body);
}

/** The ten record target types and their one-letter codes (Rust
 *  `name_records::TargetType`). A code is uppercase so it can never read as
 *  the lowercase hex that follows it in its box. `blake3_cid` points a name
 *  at content in the byte store: the BLAKE3 hash of the bytes, its content
 *  ID, carried as its own 64 lowercase hex (`B<64 hex>`), not as text. */
export const TARGET_TYPES = Object.freeze([
  { type: "ipns", code: "I" },
  { type: "ipfs_cid", code: "P" },
  { type: "hyper", code: "H" },
  { type: "https_redirect", code: "R" },
  { type: "dns_a", code: "A" },
  { type: "dns_aaaa", code: "Q" },
  { type: "dns_cname", code: "C" },
  { type: "dns_mx", code: "M" },
  { type: "dns_txt", code: "T" },
  { type: "blake3_cid", code: "B" },
]);
const TARGET_BY_TYPE = new Map(TARGET_TYPES.map((t) => [t.type, t]));
const TARGET_BY_CODE = new Map(TARGET_TYPES.map((t) => [t.code, t]));

function isValidIpv4(v) {
  const parts = v.split(".");
  return parts.length === 4 && parts.every((p) => p.length > 0 && p.length <= 3 && /^[0-9]+$/.test(p) && Number(p) <= 255);
}
function isValidIpv6Loose(v) {
  return v.length > 0 && /^[0-9A-Fa-f:]+$/.test(v) && v.split(":").length >= 3;
}
function isValidHostname(v) {
  return v.length > 0 && v.split(".").every((l) => l.length > 0 && l.length <= 63 && !l.startsWith("-") && !l.endsWith("-") && /^[A-Za-z0-9-]+$/.test(l));
}

/** Same rule as the Rust `name_records::validate_target_value`: non-empty,
 *  no control character (U+0000..U+001F, U+007F), no leading or trailing
 *  space, then the DNS rules. Returns `null` when valid, else the reason.
 *  `resolvers/records/target-vectors.tsv` holds both sides to it. */
export function validateTargetValue(type, value) {
  if (!TARGET_BY_TYPE.has(type)) return `unsupported target type: ${type}`;
  if (typeof value !== "string" || value.length === 0) return `target ${type} must have a non-empty value`;
  for (const ch of value) {
    const c = ch.codePointAt(0);
    if (c < 0x20 || c === 0x7f) return `target ${type} value must carry no control character`;
  }
  if (value.startsWith(" ") || value.endsWith(" ")) return `target ${type} value must not start or end with a space`;
  if (type === "dns_a" && !isValidIpv4(value)) return "dns_a value must be a valid IPv4 address";
  if (type === "dns_aaaa" && !isValidIpv6Loose(value)) return "dns_aaaa value must be a valid IPv6 address";
  if (type === "dns_cname" && !isValidHostname(value)) return "dns_cname value must be a valid hostname";
  if (type === "dns_mx") {
    const parts = value.split(" ");
    const [priority = "", host = ""] = parts;
    if (parts.length > 2 || !/^[0-9]+$/.test(priority) || !isValidHostname(host)) {
      return 'dns_mx value must be "<priority> <hostname>", e.g. "10 mail.example.com"';
    }
  }
  if (type === "blake3_cid" && !/^[0-9a-f]{64}$/.test(value)) {
    return "blake3_cid value must be the content ID: 64 lowercase hex characters (the BLAKE3 hash of the bytes)";
  }
  return null;
}

/** One target's C box payload: its code, then the value's padded
 *  hex-of-utf8, or for `blake3_cid` the content ID's own 64 hex (Rust
 *  `name_records::encode_target`). */
export function encodeTarget({ type, value }) {
  const why = validateTargetValue(type, value);
  if (why) {
    throw new Error(`That record target is not valid. Missing: ${why}. To fix: correct the ${type} value and build the record again.`);
  }
  if (type === "blake3_cid") return TARGET_BY_TYPE.get(type).code + value;
  return TARGET_BY_TYPE.get(type).code + encodePriceField(value);
}

/** Read one target box back (Rust `name_records::decode_target`): the code
 *  must be in the closed set, the value must be hex-of-utf8, pass its rule,
 *  and carry only the canonical padding. Throws with the reason otherwise. */
export function decodeTarget(boxPayload) {
  const entry = TARGET_BY_CODE.get(boxPayload?.[0]);
  if (!entry) throw new Error(`target code ${JSON.stringify(boxPayload?.[0])} is not one of A Q C M T I P H R B`);
  const hex = boxPayload.slice(1);
  if (entry.type === "blake3_cid") {
    const why = validateTargetValue(entry.type, hex);
    if (why) throw new Error(why);
    return { type: entry.type, value: hex };
  }
  let value;
  try {
    value = decodePriceField(hex);
  } catch {
    throw new Error(`target ${entry.type} value is not hex-of-utf8`);
  }
  const why = validateTargetValue(entry.type, value);
  if (why) throw new Error(why);
  if (encodePriceField(value) !== hex) throw new Error(`target ${entry.type} value is not in its canonical padding`);
  return { type: entry.type, value };
}

/** Read a KDOMREC2 entry's own boxes (Rust `name_records::parse_record_entry`):
 *  `{ fqdn, ownerPubHex, linkCid, priorRecordCid, updatedAt, targets }`.
 *  Reads only; it does not check the signature or the ownership chain
 *  (`flx-domain-proof.mjs` does). Throws with the reason on a malformed entry. */
export function readRecordEntry(raw) {
  if (raw.payload("K") !== DOMAIN_KIND_RECORD_UPDATE) throw new Error(`K is ${raw.payload("K")}, not ${DOMAIN_KIND_RECORD_UPDATE}`);
  const fqdn = utf8OfHex(raw.payload("W") ?? "");
  if (!isClaimableDomainName(fqdn)) throw new Error("W must be hex-of-utf8 of one label plus .ark, .deadark or .fxn");
  const linkCid = raw.c(1);
  const priorRecordCid = raw.c(2);
  if (!/^[0-9a-f]{64}$/.test(linkCid ?? "") || linkCid === RECORD_GENESIS_PREV) throw new Error("C[1] must be the ownership entry CID");
  if (!/^[0-9a-f]{64}$/.test(priorRecordCid ?? "")) throw new Error("C[2] must be the previous record CID or 64 zeros");
  const count = raw.cCount();
  if (count < 4) throw new Error("a record carries at least one target box at C[3]");
  const targets = [];
  for (let i = 3; i < count; i++) targets.push(decodeTarget(raw.c(i)));
  return { fqdn, ownerPubHex: raw.g(), linkCid, priorRecordCid, updatedAt: Number(raw.payload("M")), targets };
}

/** Build and sign a KDOMREC2 name record. Mirrors the Rust
 *  `chain::domain_record_update`. `linkCid` is the entry CID of the claim,
 *  transfer or purchase that made the signer the owner (normally `DOM_WHO`'s
 *  head); `priorRecordCid` is the current record under that link
 *  (`DOM_RECORD`'s CID) or `RECORD_GENESIS_PREV` for its first record;
 *  `targets` is a non-empty list of `{ type, value }` (see `TARGET_TYPES`).
 *  Name, owner, time and version are W, G, M and the record's index; nothing
 *  else is carried, and nothing is JSON. */
export async function buildDomainRecordUpdate({ privateKey, pubHex, ...rest }) {
  return buildDomainRecordUpdateWithSigner({ signer: keySigner(privateKey, pubHex), ...rest });
}

export async function buildDomainRecordUpdateWithSigner({ signer, pos, prevCid, fqdn, linkCid, priorRecordCid, targets, nowSec }) {
  if (!isClaimableDomainName(fqdn)) throw refuseName(fqdn, "carry a record for");
  requireCid(linkCid, "ownership entry CID", `read the current head with DOM_WHO ${fqdn} and use its CID.`);
  if (linkCid === RECORD_GENESIS_PREV) throw new Error("That ownership entry CID is the zero sentinel. Missing: the CID of a real claim, transfer or purchase. To fix: use DOM_WHO's head CID.");
  requireCid(priorRecordCid, "prior record CID", `read the current record with DOM_RECORD ${fqdn} and use its CID, or RECORD_GENESIS_PREV for the first record under this owner.`);
  if (!Array.isArray(targets) || targets.length === 0) {
    throw new Error(`That record update carries no target. Missing: at least one { type, value } (got ${JSON.stringify(targets)}). To fix: pass the places the name should resolve to.`);
  }
  let body = `${domainEntryHead(signer.pubHex, DOMAIN_KIND_RECORD_UPDATE, fqdn, pos, prevCid, nowSec)}-C${linkCid}-C${priorRecordCid}`;
  for (const t of targets) body += `-C${encodeTarget(t)}`;
  return signDomainEntry(signer, body);
}

/** Encode a short text field (a price's ticker or amount, a record target's
 *  value) as a dense-grammar `C`-block. Mirrors the Rust
 *  `chain::encode_price_field` exactly: hex-of-utf8, then zero-padded on the
 *  right in whole hex-byte ("00") pairs until at least 16 chars (dense's `C`
 *  role floor). */
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
 *  byte for byte. `priorRecordCid` here is the prior ownership entry CID
 *  (the wire label keeps its old name). `price` is `null` for a free v2
 *  transfer, or `[asset, amount]` — always the RAW values, never the padded
 *  `encodePriceField` wire form. */
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
 *  recipient) — a SEPARATE signature from the entry's own G/S, which the
 *  SELLER signs. `priorEntryCid` (alias `priorRecordCid`) is the current
 *  ownership head. */
export async function signDualSig({ newOwnerPrivateKey, newOwnerPubHex, ...rest }) {
  return signDualSigWithSigner({ newOwnerSigner: keySigner(newOwnerPrivateKey, newOwnerPubHex), ...rest });
}

export async function signDualSigWithSigner({ newOwnerSigner, fqdn, priorEntryCid, priorRecordCid, price }) {
  const msg = dualSigSubmessage(fqdn, priorEntryCid ?? priorRecordCid, newOwnerSigner.pubHex, price ?? null);
  return newOwnerSigner.signText(msg);
}

/** Build and sign a KDOMXFER2 dual-signature name transfer. Mirrors the
 *  Rust `chain::domain_transfer_v2`. Seller-submitted (G/S), with the
 *  recipient's own signature over `dualSigSubmessage(...)` in C[3].
 *  `price` is `null` for a free transfer, or `[asset, amount]` (C[4]/C[5]). */
export async function buildDomainTransferV2({ privateKey, pubHex, ...rest }) {
  return buildDomainTransferV2WithSigner({ signer: keySigner(privateKey, pubHex), ...rest });
}

export async function buildDomainTransferV2WithSigner({ signer, pos, prevCid, fqdn, priorEntryCid, priorRecordCid, newOwnerPubHex, newOwnerSigHex, price, nowSec }) {
  const prior = priorEntryCid ?? priorRecordCid;
  if (!isClaimableDomainName(fqdn)) throw refuseName(fqdn, "carry ownership for");
  requireCid(prior, "prior ownership entry CID", `read the current head with DOM_WHO ${fqdn} and use its CID.`);
  requireCid(newOwnerPubHex, "new-owner key", "pass the recipient's ed25519 public key as 64 lowercase hex chars, not base64 or PEM.");
  if (!/^[0-9a-f]{128}$/.test(newOwnerSigHex ?? "")) {
    throw new Error(
      `That new-owner signature is not addressable. ` +
        `Missing: 128 lowercase hex chars (got ${String(newOwnerSigHex).length}). ` +
        `To fix: pass signDualSig(...)'s result for this exact (fqdn, prior entry CID, newOwnerPubHex, price).`,
    );
  }
  let body = `${domainEntryHead(signer.pubHex, DOMAIN_KIND_XFER2, fqdn, pos, prevCid, nowSec)}-C${prior}-C${newOwnerPubHex}-C${newOwnerSigHex}`;
  if (price) {
    const [asset, amount] = price;
    body += `-C${encodePriceField(asset)}-C${encodePriceField(amount)}`;
  }
  return signDomainEntry(signer, body);
}

/** Build and sign a KDOMBUY1 marketplace purchase. Mirrors the Rust
 *  `chain::domain_purchase`. Seller-submitted; price is REQUIRED.
 *  `settlementValueObjectCid` (C[6]) is the CID of the buyer's native FXN
 *  lock (KNLOCK1 on the `nlocks` chain, purpose `name`, base chain, locked
 *  by the buyer for the seller, for exactly the price, with a deadline after
 *  the purchase). The purchase that moves the name pays that lock to the
 *  seller (one FXN, step 6). A C[6] naming a `manifest_custody` credit is the
 *  retired path: a node refuses a new one by name. Price asset must be FXN. */
export async function buildDomainPurchase({ privateKey, pubHex, ...rest }) {
  return buildDomainPurchaseWithSigner({ signer: keySigner(privateKey, pubHex), ...rest });
}

export async function buildDomainPurchaseWithSigner({ signer, pos, prevCid, fqdn, priorEntryCid, priorRecordCid, buyerPubHex, buyerSigHex, price, settlementValueObjectCid, nowSec }) {
  const prior = priorEntryCid ?? priorRecordCid;
  if (!isClaimableDomainName(fqdn)) throw refuseName(fqdn, "carry ownership for");
  requireCid(prior, "prior ownership entry CID", `read the current head with DOM_WHO ${fqdn} and use its CID.`);
  requireCid(buyerPubHex, "buyer key", "pass the buyer's ed25519 public key as 64 lowercase hex chars, not base64 or PEM.");
  if (!/^[0-9a-f]{128}$/.test(buyerSigHex ?? "")) {
    throw new Error(
      `That buyer signature is not addressable. ` +
        `Missing: 128 lowercase hex chars (got ${String(buyerSigHex).length}). ` +
        `To fix: pass signDualSig(...)'s result for this exact (fqdn, prior entry CID, buyerPubHex, price).`,
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
        `Missing: C[6] = the CID of the buyer's native FXN lock for the seller ` +
        `(KNLOCK1, purpose name, exactly the price; got ${JSON.stringify(settlementValueObjectCid)}). ` +
        `To fix: have the buyer lock the price first (flx-native-locks.mjs buildNativeLock ` +
        `with nameLockTerms), then pass that lock's CID here.`,
    );
  }
  const [asset, amount] = price;
  const body =
    `${domainEntryHead(signer.pubHex, DOMAIN_KIND_BUY, fqdn, pos, prevCid, nowSec)}-C${prior}-C${buyerPubHex}-C${buyerSigHex}` +
    `-C${encodePriceField(asset)}-C${encodePriceField(amount)}-C${settlementValueObjectCid}`;
  return signDomainEntry(signer, body);
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
 *  (`BLOB_PUT`) — `FLX-PROVIDER-SET-V1` and `FLX-SPEED-PARAMS-V1`
 *  lines (`renderProviderSet` / `renderSpeedParams` in `flx-launch-blobs.mjs`;
 *  JSON launches on chain still read), mirroring
 *  `chain_registry::parse_provider_set` / `parse_resolver_speed_params`.
 *
 *  Phase 0 (global resolvers) — `offerManifestCid`/`grammarManifestCid`
 *  must also already be published blobs (`flux.resolver-offer-
 *  manifest.v1` / `flux.resolver-grammar-manifest.v1`). `controlKeyHex`
 *  is a real 64-lowercase-hex ed25519 pubkey if this resolver should
 *  ever be upgradable, or `GENESIS_PREV` if it should be immutable
 *  forever — see `docs/design/global-resolvers.md`. */
/** The unsigned `KRESOLV1` body only — for showing a holder exactly what
 *  they are about to sign BEFORE they approve (the same "preview, then
 *  sign separately" split `genesis-authorization.js`'s own
 *  `previewMintBody` already uses), without duplicating this template a
 *  third time. Never sign a different body than what was previewed —
 *  both `buildResolverLaunch`/`buildResolverLaunchWithSigner` call this
 *  exact function. */
export function resolverLaunchBody({
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
  return (
    `G${pubHex}-Y${Y_LEDGERENTRY}-V1-M${nowSec}-H${h}-N${carrierChainId}-K${RESOLVER_KIND_LAUNCH}` +
    `-W${w}-J${pos}-C${prevCid}-C${providerSetCid}-C${speedParamsCid}` +
    `-C${offerManifestCid}-C${grammarManifestCid}-C${controlKeyHex}`
  );
}

/** Round four (r4a) — the unsigned `KCHAIN1` body, byte for byte the Rust
 *  `chain::chain_launch` (pinned on both sides:
 *  `chain::tests::chain_launch_body_is_pinned_for_js_parity` and
 *  builders.test.mjs). A backed launch: the carrier chain carries it, the
 *  new chain's genesis is the eight content addresses and keys in this
 *  order -- the stake it is backed by, the provider set, the speed
 *  params, the token spec, the split resolver (the program a forfeit is
 *  routed by), then the bond escrow, the insurance pool and the treasury
 *  keys. `admit()` checks the structure; whether the stake is large
 *  enough is the node's launch policy, never decided here. */
const HEX64 = /^[0-9a-f]{64}$/;
export function chainLaunchBody({
  pubHex,
  pos,
  prevCid,
  carrierChainId,
  label,
  network,
  newChainId: givenChainId,
  stakeCid,
  providerSetCid,
  speedParamsCid,
  tokenSpecCid,
  splitResolverCid,
  bondEscrowKey,
  insurancePoolKey,
  treasuryKey,
  nowSec,
}) {
  if (!isChainIdShape(carrierChainId)) {
    throw new Error(
      `That carrier chain-id is not addressable. ` +
        `Missing: 3-32 lowercase alphanumeric characters (got ${JSON.stringify(carrierChainId)}). ` +
        `To fix: pass the chain-id that actually carries this launch record.`,
    );
  }
  // Owner decision 2026-10-25: a person names the label; the word comes from the chosen network
  // (`launchedChainId`), so a wrong word is never typed. A full id is accepted only when it already ends with a word.
  const newChainId = label !== undefined ? launchedChainId(label, network) : givenChainId;
  if (label === undefined && !launchedChainWord(newChainId)) {
    throw new Error(
      `The launch's new chain id ${JSON.stringify(newChainId)} has no label followed by a network word. ` +
        `Missing: a label then mainnet or devnet with no dash, 3-32 lowercase letters and digits, such as arkdevnet. ` +
        `To fix: pass { label, network } and let the builder add the word; never type the word or a dash.`,
    );
  }
  if (newChainId === carrierChainId) {
    throw new Error(
      `A ChainLaunch cannot be carried by the chain it creates. ` +
        `Missing: a carrier chain-id different from ${newChainId}. ` +
        `To fix: carry the launch on the base chain (defxn) or another existing chain.`,
    );
  }
  const fields = { stakeCid, providerSetCid, speedParamsCid, tokenSpecCid, splitResolverCid, bondEscrowKey, insurancePoolKey, treasuryKey };
  for (const [name, value] of Object.entries(fields)) {
    if (!HEX64.test(String(value ?? ""))) {
      throw new Error(
        `The launch's ${name} is not a content address or key. ` +
          `Missing: 64 lowercase hex characters (got ${JSON.stringify(value)}). ` +
          `To fix: BLOB_PUT the descriptor and pass the CID the node returned, or pass the holder's 64-hex public key.`,
      );
    }
  }
  const h = hexOfUtf8(pubHex);
  const w = hexOfUtf8(newChainId);
  return (
    `G${pubHex}-YLEDGERENTRY-V1-M${nowSec}-H${h}-N${carrierChainId}-K${CHAIN_KIND_LAUNCH}-W${w}-J${pos}` +
    `-C${prevCid}-C${stakeCid}-C${providerSetCid}-C${speedParamsCid}-C${tokenSpecCid}-C${splitResolverCid}` +
    `-C${bondEscrowKey}-C${insurancePoolKey}-C${treasuryKey}`
  );
}

export async function buildChainLaunch({ privateKey, ...rest }) {
  const body = chainLaunchBody(rest);
  const sig = await signHex(privateKey, body);
  return `${body}-S${sig}`;
}

/** The same record for an Auth-Kit-shaped signer (`{pubHex, signText}`). */
export async function buildChainLaunchWithSigner({ signer, ...rest }) {
  const body = chainLaunchBody({ pubHex: signer.pubHex, ...rest });
  const sig = await signer.signText(body);
  return `${body}-S${sig}`;
}

export async function buildResolverLaunch({ privateKey, ...rest }) {
  const body = resolverLaunchBody(rest);
  const sig = await signHex(privateKey, body);
  return `${body}-S${sig}`;
}

/** Same record, same byte-for-byte body (`resolverLaunchBody` is shared,
 *  never duplicated) — for a caller holding an Auth-Kit-shaped signer
 *  (`{pubHex, signText}`, see `flx-identity-bridge.mjs`) instead of a
 *  WebCrypto `CryptoKey`. `buildResolverLaunch` above stays untouched
 *  and CryptoKey-only on purpose: a real production caller
 *  (`flux-access-resolver/src/dense-wire-client.mjs`) already depends on
 *  that exact signature. `pubHex` comes from `signer.pubHex`, matching
 *  `flx-dao-builders.mjs`'s own convention for signer-shaped builders. */
export async function buildResolverLaunchWithSigner({ signer, ...rest }) {
  const body = resolverLaunchBody({ pubHex: signer.pubHex, ...rest });
  const sig = await signer.signText(body);
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
/** The unsigned `KRESOLVUP1` body only — see `resolverLaunchBody`'s own
 *  doc comment for why this is exported (preview before sign). */
export function resolverUpgradeBody({
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
  return body;
}

export async function buildResolverUpgrade({ privateKey, ...rest }) {
  const body = resolverUpgradeBody(rest);
  const sig = await signHex(privateKey, body);
  return `${body}-S${sig}`;
}

/** Same record, same byte-for-byte body — the Auth-Kit-signer sibling of
 *  `buildResolverUpgrade`, see `buildResolverLaunchWithSigner`'s own doc
 *  comment for the full reasoning (shared body builder, untouched
 *  CryptoKey-only original, `signer.pubHex`/`signer.signText`). */
export async function buildResolverUpgradeWithSigner({ signer, ...rest }) {
  const body = resolverUpgradeBody({ pubHex: signer.pubHex, ...rest });
  const sig = await signer.signText(body);
  return `${body}-S${sig}`;
}

/** The one capability-id rule — `[a-z0-9]{3,32}`, the same shape as a
 *  chain-id (architecture.md §3: a capability is addressed by a short
 *  lowercase name carried hex-of-UTF-8 in `W`, exactly like a resolver's
 *  chain-id is). Validated here so a bad id is a local refusal with a
 *  remedy, not a server-side grammar error that looks like a bad signature. */
export function isCapabilityIdShape(value) {
  return typeof value === "string" && /^[a-z0-9]{3,32}$/.test(value);
}

/** A capability's control field: a real 64-lowercase-hex ed25519 pubkey
 *  (that key alone may upgrade) or the `GENESIS_PREV` sentinel (immutable
 *  forever). Same rule the Rust `capability_registry` applies on admission. */
function isCapabilityControlField(value) {
  return value === GENESIS_PREV || (typeof value === "string" && /^[0-9a-f]{64}$/.test(value));
}

/** The unsigned `KCAP1` body only (architecture batch 1, B3 — capability
 *  registry on chain). Mirrors the Rust `chain::capability_launch` byte
 *  for byte; pinned on both sides by
 *  `chain::tests::capability_launch_and_upgrade_bodies_are_pinned_for_js_parity`
 *  and `web/test/builders.test.mjs`. Exported unsigned for the same
 *  reason `resolverLaunchBody` is: the body a holder reviews and the body
 *  they sign are ONE function call, never two templates.
 *
 *  `manifestCid` names an already-published blob (`BLOB_PUT`) holding a
 *  `flx-capability-manifest/1` document (`schemas/flux.capability-
 *  manifest.v1.schema.json`), derived — never hand-written — by
 *  `scripts/derive-capability-manifest.mjs`. `controlField` is a
 *  64-lowercase-hex key or `GENESIS_PREV` (immutable). */
export function capabilityLaunchBody({
  pubHex,
  pos,
  prevCid,
  carrierChainId,
  capabilityId,
  manifestCid,
  controlField,
  nowSec,
}) {
  if (!isChainIdShape(carrierChainId)) {
    throw new Error(
      `That carrier chain-id is not addressable. ` +
        `Missing: 3-32 lowercase alphanumeric characters (got ${JSON.stringify(carrierChainId)}). ` +
        `To fix: pass the chain-id that actually carries this capability launch.`,
    );
  }
  if (!isCapabilityIdShape(capabilityId)) {
    throw new Error(
      `That capability id is not addressable. ` +
        `Missing: 3-32 lowercase alphanumeric characters (got ${JSON.stringify(capabilityId)}). ` +
        `To fix: choose a capability id matching [a-z0-9]{3,32}, e.g. "multisig".`,
    );
  }
  if (!/^[0-9a-f]{64}$/.test(manifestCid ?? "")) {
    throw new Error(
      `That capability manifest CID is not addressable. ` +
        `Missing: 64 lowercase hex chars (got ${JSON.stringify(manifestCid)}). ` +
        `To fix: BLOB_PUT_HEX the FLX-CAPABILITY-MANIFEST-V1 text first and pass the CID the node returned.`,
    );
  }
  if (!isCapabilityControlField(controlField)) {
    throw new Error(
      `That capability control field is not addressable. ` +
        `Missing: a 64-char lowercase hex ed25519 pubkey, or GENESIS_PREV for immutable (got ${JSON.stringify(controlField)}). ` +
        `To fix: pass the controller's public key as hex, or GENESIS_PREV to lock the capability forever.`,
    );
  }
  const h = hexOfUtf8(pubHex);
  const w = hexOfUtf8(capabilityId);
  return (
    `G${pubHex}-Y${Y_LEDGERENTRY}-V1-M${nowSec}-H${h}-N${carrierChainId}-K${CAPABILITY_KIND_LAUNCH}` +
    `-W${w}-J${pos}-C${prevCid}-C${manifestCid}-C${controlField}`
  );
}

/** Same record, same byte-for-byte body (`capabilityLaunchBody` is
 *  shared, never duplicated) — for an Auth-Kit-shaped signer
 *  (`{pubHex, signText}`, see `flx-identity-bridge.mjs`), the only signer
 *  shape the browser panel holds. `pubHex` comes from `signer.pubHex`,
 *  matching `buildResolverLaunchWithSigner`'s own convention. */
export async function buildCapabilityLaunchWithSigner({ signer, ...rest }) {
  const body = capabilityLaunchBody({ pubHex: signer.pubHex, ...rest });
  const sig = await signer.signText(body);
  return `${body}-S${sig}`;
}

/** The unsigned `KCAPUP1` body only — mirrors the Rust
 *  `chain::capability_upgrade` byte for byte (same parity pin as
 *  `capabilityLaunchBody`). `pubHex` must be the capability's CURRENT
 *  control key (checked server-side by `CapabilityRegistry::
 *  consider_upgrade`, never here); `supersedesCid` must name its current
 *  declaration head exactly (the launch's own CID the first time, the
 *  previous upgrade's CID thereafter — read it from `CAPABILITY_LIST`);
 *  `newControlField` restates control going forward: a key, or
 *  `GENESIS_PREV` to lock the capability immutable forever. */
export function capabilityUpgradeBody({
  pubHex,
  pos,
  prevCid,
  carrierChainId,
  capabilityId,
  newManifestCid,
  supersedesCid,
  newControlField,
  nowSec,
}) {
  if (!isChainIdShape(carrierChainId)) {
    throw new Error(
      `That carrier chain-id is not addressable. ` +
        `Missing: 3-32 lowercase alphanumeric characters (got ${JSON.stringify(carrierChainId)}). ` +
        `To fix: pass the chain-id that actually carries this capability upgrade.`,
    );
  }
  if (!isCapabilityIdShape(capabilityId)) {
    throw new Error(
      `That capability id is not addressable. ` +
        `Missing: 3-32 lowercase alphanumeric characters (got ${JSON.stringify(capabilityId)}). ` +
        `To fix: pass the id of the capability being upgraded, exactly as CAPABILITY_LIST reports it.`,
    );
  }
  if (!/^[0-9a-f]{64}$/.test(newManifestCid ?? "")) {
    throw new Error(
      `That new capability manifest CID is not addressable. ` +
        `Missing: 64 lowercase hex chars (got ${JSON.stringify(newManifestCid)}). ` +
        `To fix: BLOB_PUT_HEX the new FLX-CAPABILITY-MANIFEST-V1 text first and pass the CID the node returned.`,
    );
  }
  if (!/^[0-9a-f]{64}$/.test(supersedesCid ?? "")) {
    throw new Error(
      `That supersedes CID is not addressable. ` +
        `Missing: 64 lowercase hex chars (got ${JSON.stringify(supersedesCid)}). ` +
        `To fix: read the capability's current declaration head from CAPABILITY_LIST and pass that CID.`,
    );
  }
  if (!isCapabilityControlField(newControlField)) {
    throw new Error(
      `That new capability control field is not addressable. ` +
        `Missing: a 64-char lowercase hex ed25519 pubkey, or GENESIS_PREV for immutable (got ${JSON.stringify(newControlField)}). ` +
        `To fix: pass the next controller's public key as hex, or GENESIS_PREV to lock the capability forever.`,
    );
  }
  const h = hexOfUtf8(pubHex);
  const w = hexOfUtf8(capabilityId);
  return (
    `G${pubHex}-Y${Y_LEDGERENTRY}-V1-M${nowSec}-H${h}-N${carrierChainId}-K${CAPABILITY_KIND_UPGRADE}` +
    `-W${w}-J${pos}-C${prevCid}-C${newManifestCid}-C${supersedesCid}-C${newControlField}`
  );
}

/** Auth-Kit-signer sibling of `capabilityUpgradeBody` — see
 *  `buildCapabilityLaunchWithSigner`. */
export async function buildCapabilityUpgradeWithSigner({ signer, ...rest }) {
  const body = capabilityUpgradeBody({ pubHex: signer.pubHex, ...rest });
  const sig = await signer.signText(body);
  return `${body}-S${sig}`;
}

/** The unsigned body of a resolver's own generic `ResolverRecord` (Phase
 *  0, global resolvers). Mirrors the Rust `chain::resolver_record` byte for
 *  byte. `kindMarker` is whatever `K` value the resolver itself invented
 *  for this record kind — dense-wire never inspects it beyond admitting
 *  the grammar; it must contain no `-` (the grammar's only delimiter).
 *  `inlinePayload` is free text, carried as hex-of-UTF-8 in `C[1]`.
 *
 *  Wave 4M: one body function for both signers, so the body a browser
 *  shows in its review dialog is the body that is signed — the same
 *  preview-then-sign split `resolverLaunchBody` gives the launch panel.
 *  `buildResolverRecord` (a WebCrypto `CryptoKey`, Node processes) and
 *  `buildResolverRecordWithSigner` (the Auth Kit bridge, the deployer)
 *  both call it. */
export function resolverRecordBody({
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
  return (
    `G${pubHex}-Y${Y_LEDGERENTRY}-V1-M${nowSec}-H${h}-N${resolverChainId}-K${kindMarker}` +
    `-J${pos}-C${prevCid}-C${payloadHex}`
  );
}

/** Build and sign a resolver's own generic `ResolverRecord` with a
 *  WebCrypto `CryptoKey` — see [`resolverRecordBody`]. */
export async function buildResolverRecord({ privateKey, ...rest }) {
  const body = resolverRecordBody(rest);
  const sig = await signHex(privateKey, body);
  return `${body}-S${sig}`;
}

/** Auth-Kit-signer sibling of `buildResolverRecord` (`{pubHex, signText}`,
 *  `flx-identity-bridge.mjs`) — the deployer's path: the browser signs,
 *  the page never holds a key. Byte-identical to `buildResolverRecord`
 *  for the same key (Ed25519 is deterministic). */
export async function buildResolverRecordWithSigner({ signer, ...rest }) {
  const body = resolverRecordBody({ pubHex: signer.pubHex, ...rest });
  const sig = await signer.signText(body);
  return `${body}-S${sig}`;
}

/** Round three (r3u) — a launch's fee claim (`fee_account.rs`, wave 3E/4; D8). The kind marker of the record and the
 *  magic of its body (`KIND_FEE_CLAIM`, `FEE_CLAIM_BODY_MAGIC`). */
export const FEE_CLAIM_KIND = "KFEECLM1";
export const FEE_CLAIM_BODY_MAGIC = "FLX-FEE-CLAIM-V1";
/** The five fee accounts a claim may name (`flx_cap_custody::FeeAccount::tag`). */
const FEE_CLAIM_ACCOUNTS = Object.freeze(["mm", "lp", "venue-providers", "venue-insurance", "venue-treasury"]);

/** `FeeClaimBody::render`: `FLX-FEE-CLAIM-V1 TAB chain TAB account TAB credit,credit,...` — the claim names exactly the
 *  credits it takes (matured FXN fee credits of that account, or for `lp` the token fee entries
 *  `sha256("fill-fee-tokens:" + result CID)`); nothing is chosen for it. Refuses, by name, what `FeeClaimBody::parse`
 *  refuses, so a body the node would not read is never signed. */
export function feeClaimBody({ chainId, account, credits }) {
  const need = `${FEE_CLAIM_BODY_MAGIC} TAB chain TAB account (mm, lp, venue-providers, venue-insurance, venue-treasury) TAB comma-joined fee credit CIDs`;
  if (!isChainIdShape(chainId)) throw new Error(`'${chainId}' is not a chain id. Missing: 3-32 lowercase alphanumeric characters (${need}). To fix: claim on the chain whose fees it takes`);
  if (!FEE_CLAIM_ACCOUNTS.includes(account)) throw new Error(`'${account}' is not a fee account. Missing: one of mm, lp, venue-providers, venue-insurance, venue-treasury. To fix: name the account FEE_ACCOUNT lists the credits in`);
  if (!Array.isArray(credits) || credits.length === 0) throw new Error("the fee claim names no credit. Missing: the matured fee credit CIDs it takes. To fix: list the account's credits (MANIFEST_CREDITS of its holder) and name those whose hold has ended");
  for (const c of credits) {
    if (!/^[0-9a-f]{64}$/.test(String(c))) throw new Error(`'${c}' is not a 64-hex credit CID. Missing: ${need}. To fix: name credits exactly as MANIFEST_CREDITS lists them`);
  }
  return `${FEE_CLAIM_BODY_MAGIC}\t${chainId}\t${account}\t${credits.join(",")}`;
}

/** `fee_account::fee_claim_record`: the claim as a `ResolverRecord` on the launched chain (`N` = the chain,
 *  `K` = KFEECLM1, `C[1]` = hex of the body), signed by the CLAIMANT at its own holder position (`pos`, `prevCid` its
 *  head). The body is checked before the signer is asked. Its CID (`cidOf(text)`) is what `FEE_CLAIM_OK` names. */
export async function buildFeeClaimWithSigner({ signer, pos, prevCid, chainId, account, credits, nowSec }) {
  const inlinePayload = feeClaimBody({ chainId, account, credits });
  return buildResolverRecordWithSigner({ signer, pos, prevCid, resolverChainId: chainId, kindMarker: FEE_CLAIM_KIND, inlinePayload, nowSec });
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
 *  provider — their content is never inspected by `admit()`.
 *
 *  Wave 2D: `proofCid` (optional) is the CID of the provider's
 *  `FLX-CAP-PROOF-V1` vector proof (`cap-prove`'s output), carried as
 *  `C[3]`; mirrors the Rust `capability_proof::provider_announce_with_
 *  proof`. Omitted, the body is the pre-2D one byte for byte. A resolver
 *  that composes capabilities refuses a seat without it, by name. */
export async function buildProviderAnnounce({
  privateKey,
  pubHex,
  pos,
  prevCid,
  chainId,
  reachAddress,
  stakeCid,
  attestationCid,
  proofCid,
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
    `-K${PROVIDER_KIND_ANNOUNCE}-W${w}-J${pos}-C${prevCid}-C${stakeCid}-C${attestationCid}` +
    (proofCid ? `-C${proofCid}` : "");
  const sig = await signHex(privateKey, body);
  return `${body}-S${sig}`;
}

/** Build and sign a KACLEV1 ACL grant evidence entry.
 *
 *  Mirrors the Rust `chain::acl_evidence` byte for byte. ACR's own record
 *  kind: `aclGrantJson` is the grant's canonical JSON (`{acl, sig}` from
 *  `fxn-auth`'s `createAcl`/`signAcl`), hex-of-utf8-encoded and carried
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

/** The mainnet's network id, the same literal as `netparams::NETWORK_MAIN`. Every other id is a test network. */
export const NETWORK_MAIN = "fxn-mainnet";

/** The devnet's id, the same literal as `netparams::NETWORK_DEVNET`. A node with no network set runs as it. */
export const NETWORK_DEVNET = "fxn-devnet";

/** What a key's first record cites in `C[0]` on `network` (owner, 2026-10-25), mirroring `chain::network_root`.
 *  A key has one record chain, and every later record links back to its first one, so the first record's root binds
 *  the whole chain to one network: a record signed on one network is never admitted on another. The devnet keeps the
 *  64-zero sentinel, so the running devnet's history still replays. Every other network's root is the SHA-256 of
 *  `fxn-network-root-` and its id. A node names its root in `HEAD_NONE`; prefer that answer to computing it. */
export async function networkRoot(network) {
  if (typeof network !== "string" || !/^fxn-[a-z0-9-]{1,28}$/.test(network)) {
    throw new Error(
      `The network ${JSON.stringify(network)} is not a network id, so the builder cannot name its root. ` +
        `Missing: a network id, fxn- then lowercase letters, digits and -, such as ${NETWORK_DEVNET} or ${NETWORK_MAIN}. ` +
        `To fix: pass the network the page is connected to (BUILD_INFO's fifth field), or the root HEAD_NONE names.`,
    );
  }
  return network === NETWORK_DEVNET ? GENESIS_PREV : sha256Hex(`fxn-network-root-${network}`);
}

/** The tag `networkCovered` puts first on a non-devnet network, the same bytes as `chain::NETWORK_COVERED_TAG`. */
export const NETWORK_COVERED_TAG = "FXNNET1";

/** The bytes a signature outside a record chain covers on `network` (a DAO vote, a segment signature, a custody
 *  release vote), mirroring `chain::network_covered`. Such a signature names no chain position, so the first
 *  record's root cannot bind it. The devnet's bytes are unchanged. On every other network they are `FXNNET1`, NUL,
 *  the network id, NUL, then the bytes, so a vote signed on one network never verifies on another. */
export function networkCovered(network, bytes) {
  if (network === undefined || network === NETWORK_DEVNET) return bytes;
  if (typeof network !== "string" || !/^fxn-[a-z0-9-]{1,28}$/.test(network)) {
    throw new Error(
      `The network ${JSON.stringify(network)} is not a network id, so the vote cannot be bound to it. ` +
        `Missing: a network id, fxn- then lowercase letters, digits and -, such as ${NETWORK_DEVNET} or ${NETWORK_MAIN}. ` +
        `To fix: pass the network the page is connected to (BUILD_INFO's fifth field).`,
    );
  }
  const head = new TextEncoder().encode(`${NETWORK_COVERED_TAG}\0${network}\0`);
  const out = new Uint8Array(head.length + bytes.length);
  out.set(head, 0);
  out.set(bytes, head.length);
  return out;
}

/** The closed end words of a launched chain's id, mirroring `chain::LAUNCHED_CHAIN_WORDS` (owner decision,
 *  2026-10-25). A record splits on `-`, so the word joins the label with no dash on the wire: `arkdevnet`. */
export const LAUNCHED_CHAIN_WORDS = Object.freeze(["mainnet", "devnet"]);

/** The word a launched chain's id ends with on `network`: `mainnet` on fxn-mainnet, `devnet` on every other
 *  network. Mirrors `netparams::network_word`. */
export function networkWord(network) {
  return network === NETWORK_MAIN ? "mainnet" : "devnet";
}

/** The end word of a launched chain id (`arkdevnet` -> `devnet`), or null when it has no label before a word.
 *  Mirrors `chain::launched_chain_word`. */
export function launchedChainWord(id) {
  if (!isChainIdShape(id)) return null;
  return LAUNCHED_CHAIN_WORDS.find((word) => id.length > word.length && id.endsWith(word)) ?? null;
}

/** The id a launch of `label` gets on `network`: the label, then the network's word, no dash. Mirrors
 *  `chain::launched_chain_id`; refuses by name a label that cannot make an id. */
export function launchedChainId(label, network) {
  if (typeof network !== "string" || !network) {
    throw new Error(
      `The launch names no network, so the builder cannot add its word. ` +
        `Missing: the chosen network id, such as fxn-devnet or ${NETWORK_MAIN}. ` +
        `To fix: pass the network the page is connected to.`,
    );
  }
  const word = networkWord(network);
  const id = `${label}${word}`;
  if (typeof label !== "string" || !/^[a-z0-9]+$/.test(label) || !isChainIdShape(id)) {
    throw new Error(
      `The chain label ${JSON.stringify(label)} does not make a chain id on ${network}. ` +
        `Missing: a label of lowercase letters and digits, 1 to ${32 - word.length} characters. ` +
        `To fix: choose a shorter label of letters and digits; the builder adds ${word} itself.`,
    );
  }
  return id;
}

/** How a page shows a chain id: a launched id with a dash before its word (`arkdevnet` -> `ark-devnet`); any other
 *  id as it is. Display only: the wire never carries the dash. */
export function chainIdDisplay(id) {
  const word = launchedChainWord(id);
  return word ? `${id.slice(0, -word.length)}-${word}` : id;
}

/** The wire id for what a page shows, parsed from the end word (`ark-devnet` -> `arkdevnet`). Text that is not a
 *  label, a dash and a word is returned as it is, so a built-in id (`defxn`) passes through. */
export function chainIdFromDisplay(text) {
  const value = String(text ?? "").trim();
  for (const word of LAUNCHED_CHAIN_WORDS) {
    const suffix = `-${word}`;
    if (value.endsWith(suffix)) {
      const id = `${value.slice(0, -suffix.length)}${word}`;
      if (launchedChainWord(id) === word) return id;
    }
  }
  return value;
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

// --- PVA and skins: the builders live in flx-object-builders.mjs (one file a site can vendor alone) ---
export * from "./flx-object-builders.mjs";
import { isKeyNameLabel } from "./flx-object-builders.mjs";

/** Convenience: compute CID of a built manifest. */
export async function cidOf(text) {
  return sha256Hex(text);
}

/** For completeness: strip-and-return the signature prefix bytes (what the
 *  single-signer S block of a built record actually covers). Useful if a
 *  caller wants to verify locally before shipping. */
export { signaturePrefix };

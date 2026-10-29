// Browser builders for the kernel chain `daogov` (dense-wire `src/dao_treasury.rs`): extra DAO treasuries
// (KDAOTREASX1), safes (KDAOSAFE1), vested safes (KDAOSAFEVEST1), ruled safes (KDAOSAFESALE1, KDAOSAFEVOTE1,
// KDAOSAFEFUND1, KDAOSAFEOPS1) and safe transfers (KDAOSAFESEND1), with the addresses they derive. Also the quorum vote blob a KNTSPEND1 cites (`flx_cap_multisig::render_vote_blob`), and the
// holder vote on fee values (KDAOFEEPROP1, KDAOVOTE1, KDAOVETO1, KDAOEXEC1; `src/billing_fees.rs`), and on network
// parameters once the network handed them to a DAO (KDAONETPROP1, build 3).
//
// Why this is its own file: it is new, and flx-dao-builders.mjs is edited by other work. It mirrors the Rust
// byte for byte: `length_prefixed`, `treasury_address`, `SafeConfig::{new,address,covered,vested_address,
// vested_covered}`, `SafeVesting::shape_refusal`, `safe_send_covered`, `Grammar::render`, `chain::resolver_record` and
// `render_vote_blob`. Fixed vectors from the Rust tests pin it
// (`tests/dao_treasury_web_vectors.rs`, `web/test/dao-gov-builders.test.mjs`).
//
// Nothing here signs on its own. A builder takes a signer shaped `{ pubHex, signText, signBytes }`
// (flx-identity-bridge.mjs); the page calls these only from inside its full review modal.
// Hashing is WebCrypto SHA-256, so every address function is async.
import { hexOfUtf8, utf8OfHex, admit, signaturePrefix } from "./flx-dumb-parser.mjs";
import { networkCovered } from "./flx-builders.mjs";
import { FXN_DECIMALS, MAX_DECIMALS } from "./flx-amount.mjs";

export const DAO_GOV_CHAIN = "daogov";
export const KIND_TREASURY_ADD = "KDAOTREASX1";
export const KIND_SAFE_CREATE = "KDAOSAFE1";
export const KIND_SAFE_SEND = "KDAOSAFESEND1";
export const KIND_VESTED_SAFE_CREATE = "KDAOSAFEVEST1";
export const DEFAULT_TREASURY_LABEL = "public";
export const MAX_EXTRA_TREASURIES = 64;
export const MAX_SAFE_SIGNERS = 32;
export const MAX_SAFE_DELEGATES = 32;
/** `dao.rs` MULTISIG_FLOOR_SIGNERS / MULTISIG_FLOOR_QUORUM. */
export const SAFE_FLOOR_SIGNERS = 2;
export const SAFE_FLOOR_QUORUM = 2;
/** `launch_economy::MAX_VESTING_TRANCHES`. */
export const MAX_VESTING_TRANCHES = 40;

const TREASURY_ADD_VOTE_DOMAIN = "FLX-DAO-TREASURY-ADD-VOTE-V1\0";
const SAFE_CREATE_VOTE_DOMAIN = "FLX-DAO-SAFE-CREATE-VOTE-V1\0";
const SAFE_SEND_VOTE_DOMAIN = "FLX-DAO-SAFE-SEND-VOTE-V1\0";
const VESTED_SAFE_CREATE_VOTE_DOMAIN = "FLX-DAO-VESTED-SAFE-CREATE-VOTE-V1\0";
const TREASURY_ADDRESS_DOMAIN = "FLX-DAO-TREASURY-ADDRESS-V1\0";
const SAFE_ADDRESS_DOMAIN = "FLX-DAO-SAFE-ADDRESS-V1\0";
const VESTED_SAFE_ADDRESS_DOMAIN = "FLX-DAO-VESTED-SAFE-ADDRESS-V1\0";

const U64_MAX = 18446744073709551615n;

// ---- payload rules (Rust `Rule`) -------------------------------------------------------------------------------
export const isId = (v) => typeof v === "string" && /^[a-z0-9]{3,32}$/.test(v);
export const isHex64 = (v) => typeof v === "string" && /^[0-9a-f]{64}$/.test(v);
export const isSig = (v) => typeof v === "string" && /^[0-9a-f]{128}$/.test(v);
/** `0`, or a decimal with no leading zero that fits u64. */
export const isCount = (v) => typeof v === "string" && /^(0|[1-9][0-9]*)$/.test(v) && BigInt(v) <= U64_MAX;

function need(ok, what) {
  if (!ok) throw new Error(what);
}

// ---- bytes ------------------------------------------------------------------------------------------------------
const enc = new TextEncoder();

/** Rust `length_prefixed`: the domain tag as is, then each field as a big-endian u64 length and its UTF-8 bytes. */
export function lengthPrefixed(domain, fields) {
  const parts = [enc.encode(domain), ...fields.flatMap((f) => {
    const bytes = enc.encode(String(f));
    const len = new Uint8Array(8);
    new DataView(len.buffer).setBigUint64(0, BigInt(bytes.length), false);
    return [len, bytes];
  })];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

export function bytesHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Bytes(bytes) {
  return bytesHex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
}

// ---- addresses and covered bytes ---------------------------------------------------------------------------------
/** The bytes the DAO's signers approve to add treasury `label`. */
export function treasuryAddCovered(daoId, foundingCid, label) {
  return lengthPrefixed(TREASURY_ADD_VOTE_DOMAIN, [daoId, foundingCid, label]);
}

/** An extra treasury's address. Nobody holds a key for it. */
export async function treasuryAddress(daoId, label) {
  return sha256Bytes(lengthPrefixed(TREASURY_ADDRESS_DOMAIN, [daoId, label]));
}

/** `SafeConfig::new`: key lists sorted (byte order) and deduplicated. Hex keys sort the same in UTF-16 and bytes. */
export function safeConfig({ daoId, treasury, label, threshold, signers, delegates = [] }) {
  const tidy = (keys) => [...new Set(keys)].sort();
  return { daoId, treasury, label, threshold: Number(threshold), signers: tidy(signers), delegates: tidy(delegates) };
}

function safeFields(c) {
  return [c.daoId, c.treasury, c.label, String(c.threshold), c.signers.join(","), c.delegates.join(",")];
}

/** A safe's address: a hash of its whole configuration. */
export async function safeAddress(config) {
  return sha256Bytes(lengthPrefixed(SAFE_ADDRESS_DOMAIN, safeFields(config)));
}

/** The bytes the DAO's signers approve to create this safe (names the founding CID too). */
export function safeCreateCovered(config, foundingCid) {
  const [a, b, c, d, e, f] = safeFields(config);
  return lengthPrefixed(SAFE_CREATE_VOTE_DOMAIN, [a, foundingCid, b, c, d, e, f]);
}

/** A vested safe's schedule (`SafeVesting`): `total` units released from `start` (unix seconds). `upfront` of them vest
 *  at `start` itself (owner ruling 2026-10-29; 0 for every safe before it). The rest: nothing before `cliff` seconds,
 *  then 1/`tranches` of it every `interval` seconds. */
export function safeVesting({ total, start, cliff, tranches, interval, upfront = 0 }) {
  return { total: BigInt(total).toString(), start: String(start), cliff: String(cliff), tranches: String(tranches), interval: String(interval), upfront: BigInt(upfront).toString() };
}

/** `SafeVesting::fields` plus `upfront_field`: the upfront part joins the hashed fields only when it is above 0, so every
 *  safe made before 2026-10-29 keeps its address and its approval bytes. */
function vestingFields(v) {
  const up = BigInt(v.upfront ?? 0);
  return [v.total, v.start, v.cliff, v.tranches, v.interval, ...(up > 0n ? [`upfront:${up}`] : [])];
}

/** The `upfront` group row a safe-create record carries: none when the part is 0. */
function upfrontRow(t, v) {
  const up = BigInt(v.upfront ?? 0);
  if (up > 0n) t.push("upfront", up.toString());
}

/** A vested safe's address: its whole configuration AND its schedule, under its own domain. */
export async function vestedSafeAddress(config, vesting) {
  return sha256Bytes(lengthPrefixed(VESTED_SAFE_ADDRESS_DOMAIN, [...safeFields(config), ...vestingFields(vesting)]));
}

/** The bytes the DAO's signers approve to create this vested safe. The schedule is inside the approval. */
export function vestedSafeCreateCovered(config, foundingCid, vesting) {
  const [a, b, c, d, e, f] = safeFields(config);
  return lengthPrefixed(VESTED_SAFE_CREATE_VOTE_DOMAIN, [a, foundingCid, b, c, d, e, f, ...vestingFields(vesting)]);
}

// ---- ruled safes (KDAOSAFESALE1, KDAOSAFEVOTE1, KDAOSAFEFUND1, KDAOSAFEOPS1) --------------------------------------
// Added 2026-10-23 for the Genesis page's Safes step: the mint pays the public sale, the service fund, the investing
// fund and ops into ruled safes, and the council creates their records here. Mirrors `SafeRule::{word, kind, fields,
// window, recipient_cap, shape_refusal}`, `SafeConfig::{ruled_address, ruled_covered}`, `SafeVesting::shape_refusal_up_to`
// at `MAX_RULED_TRANCHES` and `GovAction::payload` for `RuledSafeCreate`. Pinned by
// `web/test/fixtures/ruled-safe-vectors.tsv`, printed by `genesis_mint.rs` (`RULED_SAFE_VECTORS_WRITE=1`).
export const KIND_SALE_SAFE_CREATE = "KDAOSAFESALE1";
export const KIND_VOTE_SAFE_CREATE = "KDAOSAFEVOTE1";
export const KIND_FUND_SAFE_CREATE = "KDAOSAFEFUND1";
export const KIND_OPS_SAFE_CREATE = "KDAOSAFEOPS1";
/** `dao_treasury::MAX_RULED_TRANCHES`: ten years of monthly tranches. */
export const MAX_RULED_TRANCHES = 120;
const RULED_SAFE_CREATE_VOTE_DOMAIN = "FLX-DAO-RULED-SAFE-CREATE-VOTE-V1\0";
const RULED_SAFE_ADDRESS_DOMAIN = "FLX-DAO-RULED-SAFE-ADDRESS-V1\0";
/** Each rule's word and the record kind that creates a safe with it (`SafeRule::word`, `SafeRule::kind`). */
const RULE_KINDS = { sale: KIND_SALE_SAFE_CREATE, vote: KIND_VOTE_SAFE_CREATE, fund: KIND_FUND_SAFE_CREATE, budget: KIND_OPS_SAFE_CREATE };

/** A safe's rule (`SafeRule`): `word` is sale, vote, fund or budget. A vote rule takes `capBps` and `windowSecs`; a fund
 *  rule takes both and `recipientCap`. Values are kept as decimal strings, the form they are hashed in. */
export function safeRule({ word, capBps, windowSecs, recipientCap }) {
  need(Object.hasOwn(RULE_KINDS, word), `"${word}" is not a safe rule. Missing: sale, vote, fund or budget.`);
  const n = (v) => (v === undefined || v === null || v === "-" ? null : String(v));
  const windowed = word === "vote" || word === "fund";
  return { word, capBps: windowed ? n(capBps) : null, windowSecs: windowed ? n(windowSecs) : null, recipientCap: word === "fund" ? n(recipientCap) : null };
}

/** The rule a record kind carries, from its values: `null` for a kind that has no rule (KDAOSAFE1, KDAOSAFEVEST1). */
export function safeRuleOfKind(kind, values = {}) {
  const word = Object.keys(RULE_KINDS).find((w) => RULE_KINDS[w] === kind);
  return word ? safeRule({ word, ...values }) : null;
}

/** The record kind that creates a safe with `rule`. */
export function ruledSafeKind(rule) {
  return RULE_KINDS[rule.word];
}

/** `SafeRule::fields`: `[-, -]` for a sale, `[cap, window]` for a vote, `[cap, window, recipient cap]` for a fund, and
 *  nothing for a budget. The order of the hashes. */
function ruleFields(rule) {
  if (rule.word === "sale") return ["-", "-"];
  if (rule.word === "vote") return [rule.capBps, rule.windowSecs];
  if (rule.word === "fund") return [rule.capBps, rule.windowSecs, rule.recipientCap];
  return [];
}

/** `SafeRule::shape_refusal`: why the chain refuses this rule, in its own words, or `null`. */
export function safeRuleRefusal(rule) {
  if (rule.word !== "vote" && rule.word !== "fund") return null;
  for (const [name, value] of [["window cap", rule.capBps], ["window", rule.windowSecs], ...(rule.word === "fund" ? [["cap per recipient key", rule.recipientCap]] : [])]) {
    if (!isCount(value ?? "")) return `the ${name} "${value ?? ""}" is not a whole number`;
  }
  const cap = BigInt(rule.capBps);
  if (cap < 1n || cap > 10000n) return `a window cap of ${rule.capBps} basis points, and a cap needs 1 to 10000`;
  if (BigInt(rule.windowSecs) > 9223372036854775807n) return "the window does not fit a signed 64-bit number";
  if (BigInt(rule.windowSecs) < 1n) return "the spending window is 0 seconds";
  if (rule.word === "fund" && BigInt(rule.recipientCap) === 0n) return "a cap per recipient key of 0, and a cap needs at least 1";
  return null;
}

/** `SafeVesting::shape_refusal_up_to(maxTranches)`: why the chain refuses this schedule, in its own words, or `null`.
 *  A ruled safe allows `MAX_RULED_TRANCHES`; a vested safe `MAX_VESTING_TRANCHES`. */
export function safeVestingRefusal(v, maxTranches = MAX_RULED_TRANCHES) {
  const I64_MAX = 9223372036854775807n;
  for (const name of ["total", "start", "cliff", "tranches", "interval"]) {
    if (!isCount(v[name] ?? "")) return `the vesting ${name} "${v[name] ?? ""}" is not a whole number`;
  }
  if (BigInt(v.start) > I64_MAX || BigInt(v.cliff) > I64_MAX || BigInt(v.interval) > I64_MAX) return "a vesting time does not fit a signed 64-bit number";
  if (BigInt(v.total) === 0n || BigInt(v.total) > I64_MAX) return `the vesting total is ${v.total}, and it must be from 1 to ${I64_MAX}`;
  if (BigInt(v.tranches) < 1n || BigInt(v.tranches) > BigInt(maxTranches)) return `${v.tranches} tranches, and a schedule needs 1 to ${maxTranches}`;
  if (BigInt(v.interval) < 1n) return "the interval between tranches is 0 seconds";
  if (BigInt(v.upfront ?? 0) > BigInt(v.total)) return `the upfront part ${v.upfront} is more than the total ${v.total}`;
  return null;
}

/** Refuses, by name and in the chain's words, a ruled safe the chain would refuse, so its record is never signed. A
 *  sale's record has no cliff field (its phases open from the start), so a sale with a cliff is refused here too: the
 *  chain would read it back as another safe. */
export function checkRuledSafe(vesting, rule) {
  const ruleWhy = safeRuleRefusal(rule);
  need(!ruleWhy, `The safe's rule is refused: ${ruleWhy}. Missing: a rule the chain takes. To fix: correct the rule.`);
  const vestingWhy = safeVestingRefusal(vesting);
  need(!vestingWhy, `The safe's schedule is refused: ${vestingWhy}. Missing: a schedule the chain takes. To fix: correct the schedule.`);
  need(rule.word !== "sale" || vesting.cliff === "0", `A sale's phases open at its start, and this one has a cliff of ${vesting.cliff} seconds. Missing: a cliff of 0. To fix: start the sale later instead.`);
}

/** A ruled safe's address: its configuration, its schedule and its rule, under its own domain. */
export async function ruledSafeAddress(config, vesting, rule) {
  const [base, up] = splitUpfront(vestingFields(vesting));
  return sha256Bytes(lengthPrefixed(RULED_SAFE_ADDRESS_DOMAIN, [...safeFields(config), ...base, rule.word, ...ruleFields(rule), ...up]));
}

/** The bytes the DAO's signers approve to create this ruled safe. The schedule and the rule are inside the approval. */
export function ruledSafeCreateCovered(config, foundingCid, vesting, rule) {
  const [a, b, c, d, e, f] = safeFields(config);
  const [base, up] = splitUpfront(vestingFields(vesting));
  return lengthPrefixed(RULED_SAFE_CREATE_VOTE_DOMAIN, [a, foundingCid, b, c, d, e, f, ...base, rule.word, ...ruleFields(rule), ...up]);
}

/** A ruled safe hashes its rule between the schedule and the upfront part (`ruled_address`), so split them. */
function splitUpfront(fields) {
  return [fields.slice(0, 5), fields.slice(5)];
}

/** The bytes a safe's signers approve to move `amount` of `chainId` to `to` at `atMs` (unix milliseconds). */
export function safeSendCovered(daoId, safe, chainId, to, amount, atMs) {
  return lengthPrefixed(SAFE_SEND_VOTE_DOMAIN, [daoId, safe, chainId, to, BigInt(amount).toString(), String(atMs)]);
}

/** A DAO's founding CID: the SHA-256 of its KDAO1 record text (`dao.rs` apply_found). */
export async function foundingCidOf(daoFoundText) {
  return sha256Bytes(enc.encode(daoFoundText));
}

// ---- validation that mirrors the chain's refusals ------------------------------------------------------------------
/** Refuses, by name, what the chain refuses for an extra treasury, so a record the node would refuse is never signed. */
export function checkTreasuryLabel(label) {
  need(isId(label), `The treasury name "${label}" is not allowed. Missing: 3 to 32 lowercase letters or digits. To fix: use a name like grants.`);
  need(label !== DEFAULT_TREASURY_LABEL, `The name "${DEFAULT_TREASURY_LABEL}" is the DAO's default treasury. Missing: another name. To fix: pick a different name.`);
}

/** The safe floors of `dao_treasury.rs` (2 signers, threshold 2 to the signer count, no key both signer and delegate). */
export function checkSafeConfig(c) {
  need(isId(c.daoId), "The DAO name is not a DAO name. Missing: 3 to 32 lowercase letters or digits.");
  need(isId(c.treasury), "The treasury name is not valid. Missing: 3 to 32 lowercase letters or digits.");
  need(isId(c.label), `The safe name "${c.label}" is not allowed. Missing: 3 to 32 lowercase letters or digits. To fix: use a name like ops.`);
  for (const k of [...c.signers, ...c.delegates]) need(isHex64(k), `"${String(k).slice(0, 12)}" is not a public key. Missing: 64 lowercase hex characters.`);
  need(c.signers.length >= SAFE_FLOOR_SIGNERS, `A safe needs at least ${SAFE_FLOOR_SIGNERS} different signers. To fix: add a signer.`);
  need(c.signers.length <= MAX_SAFE_SIGNERS, `A safe has at most ${MAX_SAFE_SIGNERS} signers.`);
  need(c.delegates.length <= MAX_SAFE_DELEGATES, `A safe has at most ${MAX_SAFE_DELEGATES} delegates.`);
  need(Number.isInteger(c.threshold) && c.threshold >= SAFE_FLOOR_QUORUM && c.threshold <= c.signers.length,
    `The threshold must be a whole number from ${SAFE_FLOOR_QUORUM} to the number of signers (${c.signers.length}).`);
  need(!c.delegates.some((k) => c.signers.includes(k)), "A key cannot be both a signer and a delegate. To fix: remove it from one list.");
}

/** `SafeVesting::shape_refusal`: a total from 1 to i64::MAX, 1 to 40 tranches, an interval of at least 1 second.
 *  The start and the cliff are counts; the grammar refuses anything else. */
export function checkSafeVesting(v) {
  const I64_MAX = 9223372036854775807n;
  for (const [name, value] of Object.entries(v)) need(isCount(value), `The vesting ${name} "${value}" is not a whole number. Missing: digits with no leading zero.`);
  need(BigInt(v.total) >= 1n && BigInt(v.total) <= I64_MAX, `The vesting total is ${v.total}. Missing: a total from 1 to ${I64_MAX}.`);
  need(BigInt(v.start) <= I64_MAX && BigInt(v.cliff) <= I64_MAX && BigInt(v.interval) <= I64_MAX, "A vesting time does not fit a signed 64-bit number.");
  need(Number(v.tranches) >= 1 && Number(v.tranches) <= MAX_VESTING_TRANCHES, `The schedule has ${v.tranches} tranches. Missing: 1 to ${MAX_VESTING_TRANCHES} tranches.`);
  need(BigInt(v.interval) >= 1n, "The interval between tranches is 0 seconds. Missing: an interval of at least 1 second.");
}

// ---- payloads (Rust `Grammar::render`: label TAB value ..., then repeated groups) ----------------------------------
function checkApprovals(approvals) {
  for (const [k, s] of approvals) {
    need(isHex64(k), "An approval names a key that is not 64 lowercase hex characters.");
    need(isSig(s), "An approval carries a signature that is not 128 lowercase hex characters.");
  }
}

export function treasuryAddPayload({ daoId, foundingCid, label, approvals = [] }) {
  need(isId(daoId) && isHex64(foundingCid) && isId(label), "The treasury record has a field outside its rule.");
  checkApprovals(approvals);
  const t = ["dao", daoId, "founding", foundingCid, "label", label];
  for (const [k, s] of approvals) t.push("approve", k, s);
  return t.join("\t");
}

export function safeCreatePayload({ foundingCid, config, approvals = [] }) {
  need(isHex64(foundingCid), "The founding CID is not 64 lowercase hex characters.");
  need(isCount(String(config.threshold)), "The threshold is not a whole number.");
  checkApprovals(approvals);
  const t = ["dao", config.daoId, "founding", foundingCid, "treasury", config.treasury, "label", config.label, "threshold", String(config.threshold)];
  for (const k of config.signers) t.push("signer", k);
  for (const k of config.delegates) t.push("delegate", k);
  for (const [k, s] of approvals) t.push("approve", k, s);
  return t.join("\t");
}

export function vestedSafeCreatePayload({ foundingCid, config, vesting, approvals = [] }) {
  need(isHex64(foundingCid), "The founding CID is not 64 lowercase hex characters.");
  need(isCount(String(config.threshold)), "The threshold is not a whole number.");
  checkSafeVesting(vesting);
  checkApprovals(approvals);
  const t = ["dao", config.daoId, "founding", foundingCid, "treasury", config.treasury, "label", config.label, "threshold", String(config.threshold),
    "total", vesting.total, "start", vesting.start, "cliff", vesting.cliff, "tranches", vesting.tranches, "interval", vesting.interval];
  for (const k of config.signers) t.push("signer", k);
  for (const k of config.delegates) t.push("delegate", k);
  for (const [k, s] of approvals) t.push("approve", k, s);
  upfrontRow(t, vesting);
  return t.join("\t");
}

/** `GovAction::payload` for `RuledSafeCreate`. A sale names `phases` (its tranches) and no cliff; a vote adds `capbps` and
 *  `window`; a fund adds `idcap`; ops (budget) has the vested safe's fields. */
export function ruledSafeCreatePayload({ foundingCid, config, vesting, rule, approvals = [] }) {
  need(isHex64(foundingCid), "The founding CID is not 64 lowercase hex characters.");
  need(isCount(String(config.threshold)), "The threshold is not a whole number.");
  checkRuledSafe(vesting, rule);
  checkApprovals(approvals);
  const t = ["dao", config.daoId, "founding", foundingCid, "treasury", config.treasury, "label", config.label, "threshold", String(config.threshold),
    "total", vesting.total, "start", vesting.start];
  if (rule.word === "sale") t.push("phases", vesting.tranches, "interval", vesting.interval);
  else t.push("cliff", vesting.cliff, "tranches", vesting.tranches, "interval", vesting.interval);
  if (rule.word === "vote" || rule.word === "fund") t.push("capbps", rule.capBps, "window", rule.windowSecs);
  if (rule.word === "fund") t.push("idcap", rule.recipientCap);
  for (const k of config.signers) t.push("signer", k);
  for (const k of config.delegates) t.push("delegate", k);
  for (const [k, s] of approvals) t.push("approve", k, s);
  upfrontRow(t, vesting);
  return t.join("\t");
}

export function safeSendPayload({ daoId, safe, chainId, to, amount, atMs, approvals = [] }) {
  need(isId(daoId) && isHex64(safe) && isId(chainId) && isHex64(to), "The safe transfer has a field outside its rule.");
  need(isCount(BigInt(amount).toString()) && isCount(String(atMs)), "The amount or time is not a whole number.");
  checkApprovals(approvals);
  const t = ["dao", daoId, "safe", safe, "chain", chainId, "to", to, "amount", BigInt(amount).toString(), "at", String(atMs)];
  for (const [k, s] of approvals) t.push("approve", k, s);
  return t.join("\t");
}

// ---- holder votes and fee values (KDAOFEEPROP1, KDAOVOTE1, KDAOVETO1, KDAOEXEC1) ------------------------------------
// Added 2026-10-22 for the Genesis page's Network fees drawer. The fee set and each value's rule mirror
// `src/billing_fees.rs` (`Fee`, `Fee::rule`, `Fee::parse`, `is_value_shape`); the payloads mirror `GovAction::payload`
// for `FeeProposal`, `Vote`, `Veto` and `Execute`; the clock rules mirror `dao_treasury.rs` (`DELAY_SECS`,
// `MAX_VOTING_SECS`, the `BadDeadline` refusal). Pinned to the Rust by `tests/dao_treasury_web_vectors.rs`.
export const KIND_FEE_PROPOSAL = "KDAOFEEPROP1";
export const KIND_VOTE = "KDAOVOTE1";
export const KIND_VETO = "KDAOVETO1";
export const KIND_EXECUTE = "KDAOEXEC1";
/** The delay after the voting deadline, in seconds. A passed fee is in force from `deadline + DELAY_SECS`. */
export const DELAY_SECS = 48 * 3600;
/** Longest voting period a proposal may set, in seconds. */
export const MAX_VOTING_SECS = 30 * 24 * 3600;
/** `billing_fees::PRICE_CUT_CAP_BPS`: the most `pricecut` may ever be. A vote may lower it, never raise it. */
export const PRICE_CUT_CAP_BPS = 1500;
export const BPS_WHOLE = 10000;
export const MAX_PRICE_SIGNERS = 32;
export const MAX_CURRENCIES = 32;
export const MAX_FEE_VALUE_BYTES = 4096;
/** What every read says for a fee no vote has set. Never 0. */
export const FEE_NOT_SET = "not set by the network's DAO";
/** The closed fee set, in the Rust's order (`Fee::ALL`). */
/** `mining::WORK_CAP_BPS`: each earner gets at most this share of what others paid for its work. */
export const WORK_CAP_BPS = 3000;
/** `billing_fees::ring_floor_bps`: the highest fund share at which a ring does not lose. A valid split's is above it. */
export const RING_FLOOR_BPS = 2307;
export const FEES = ["entryrate", "keeprate", "computesplit", "pricecut", "pricemaxage", "currencies", "pricesigners"];
export const CHOICES = ["approve", "reject", "abstain"];
const I64_MAX = 9223372036854775807n;
const U32_MAX = 4294967295n;

/** `Fee::rule`: what a valid value of `fee` is, in words. Every refusal of a value names it. */
export function feeRule(fee) {
  switch (fee) {
    case "entryrate": return "entryrate is <currency>,<minor units>,<entries>, for example USD,1,2500 (1 cent per 2,500 entries)";
    case "keeprate": return "keeprate is <currency>,<minor units>,<byte-years>, for example USD,600,1000000000";
    case "computesplit": return `computesplit is <computers bps>,<fund bps>, totalling 10000, with the fund's share above ${RING_FLOOR_BPS} bps so a ring of keys paying each other always loses (it earns back at most ${WORK_CAP_BPS / 100}% of the computers' share from mining), for example 6500,3500`;
    case "pricecut": return `pricecut is basis points from 0 to ${PRICE_CUT_CAP_BPS}, the cap in code`;
    case "pricemaxage": return "pricemaxage is a whole number of seconds above zero";
    case "currencies": return `currencies is 1 to ${MAX_CURRENCIES} distinct ISO 4217 codes, comma-joined, for example USD,EUR,JPY`;
    case "pricesigners": return `pricesigners is <K>,<key>,<key>,..., with 1 to ${MAX_PRICE_SIGNERS} distinct 64-hex keys and K from 1 to their count`;
    default: return null;
  }
}

/** `billing_fees::whole`: `0`, or digits with no leading zero that fit u64. As a BigInt, or null. */
function whole(s) {
  return isCount(s) ? BigInt(s) : null;
}
export const isCurrency = (s) => typeof s === "string" && /^[A-Z]{3}$/.test(s);
/** `billing_fees::is_value_shape`: 1 to 4096 letters, digits and commas. */
export const isFeeValueShape = (s) => typeof s === "string" && s.length >= 1 && s.length <= MAX_FEE_VALUE_BYTES && /^[A-Za-z0-9,]+$/.test(s);

/** `Fee::parse`: read `value` by `fee`'s rule. Returns the parsed value, or null when the rule is broken. The parsed
 *  forms match `FeeValue`: `{rate: {currency, minor, count}}`, `{split: {computers, fund}}`, `{bps}`, `{secs}`,
 *  `{currencies}`, `{signers: {k, keys}}` (keys sorted, one set one form). Amounts are BigInt. */
export function parseFeeValue(fee, value) {
  if (!feeRule(fee) || !isFeeValueShape(value)) return null;
  const parts = value.split(",");
  switch (fee) {
    case "entryrate":
    case "keeprate": {
      if (parts.length !== 3 || !isCurrency(parts[0])) return null;
      const [minor, count] = [whole(parts[1]), whole(parts[2])];
      if (minor === null || count === null || count === 0n) return null;
      return { rate: { currency: parts[0], minor, count } };
    }
    case "computesplit": {
      if (parts.length !== 2) return null;
      const [computers, fund] = parts.map(whole);
      if (computers === null || fund === null || computers > U32_MAX || fund > U32_MAX || computers + fund !== BigInt(BPS_WHOLE)) return null;
      // Build 1 (2026-10-26, `billing_fees::ring_loses`): the fund's share must make a ring of keys paying each other lose.
      if (!(fund * BigInt(BPS_WHOLE) > BigInt(WORK_CAP_BPS) * computers)) return null;
      return { split: { computers: Number(computers), fund: Number(fund) } };
    }
    case "pricecut": {
      const bps = parts.length === 1 ? whole(parts[0]) : null;
      if (bps === null || bps > BigInt(PRICE_CUT_CAP_BPS)) return null;
      return { bps: Number(bps) };
    }
    case "pricemaxage": {
      const secs = parts.length === 1 ? whole(parts[0]) : null;
      if (secs === null || secs === 0n || secs > I64_MAX) return null;
      return { secs };
    }
    case "currencies": {
      if (parts.length > MAX_CURRENCIES || !parts.every(isCurrency) || new Set(parts).size !== parts.length) return null;
      return { currencies: parts };
    }
    case "pricesigners": {
      const [kText, ...keys] = parts;
      const k = whole(kText);
      if (k === null || keys.length === 0 || keys.length > MAX_PRICE_SIGNERS || k === 0n || k > BigInt(keys.length) || !keys.every(isHex64)) return null;
      const sorted = [...new Set(keys)].sort();
      if (sorted.length !== keys.length) return null;
      return { signers: { k: Number(k), keys: sorted } };
    }
    default: return null;
  }
}

/** Refuses, by name, a fee or value the chain would refuse, so such a proposal is never signed. */
export function checkFeeValue(fee, value) {
  need(FEES.includes(fee), `"${fee}" is not a fee the network's DAO votes on. Missing: one of ${FEES.join(", ")}. To fix: pick a fee from the list.`);
  need(parseFeeValue(fee, value) !== null, `The value "${String(value).slice(0, 80)}" does not fit ${fee}. Missing: ${feeRule(fee)}. To fix: change the value.`);
}

/** The `BadDeadline` rule: a deadline after the record's `M`, at most 30 days after it, and a signed 64-bit time. */
export function checkFeeDeadline(nowSec, deadline) {
  need(Number.isInteger(nowSec) && Number.isInteger(deadline), "The deadline and the record time must be whole unix seconds.");
  need(deadline > nowSec && deadline - nowSec <= MAX_VOTING_SECS,
    `The voting deadline must be after now and at most 30 days away. Missing: a deadline from ${nowSec + 1} to ${nowSec + MAX_VOTING_SECS}. To fix: pick an earlier or later date.`);
}

/** When a proposal's result may be run (`ProposalEntry::delay_end`): the deadline plus the 48-hour delay. A passed fee
 *  is in force from this second. */
export const delayEndOf = (deadline) => Number(deadline) + DELAY_SECS;

export function feeProposalPayload({ daoId, fee, value, deadline }) {
  need(isId(daoId), "The DAO name is not a DAO name. Missing: 3 to 32 lowercase letters or digits.");
  checkFeeValue(fee, value);
  need(isCount(String(deadline)) && BigInt(deadline) <= I64_MAX, "The deadline is not a whole number of unix seconds.");
  return ["dao", daoId, "fee", fee, "value", value, "deadline", String(deadline)].join("\t");
}

export function votePayload({ proposal, choice }) {
  need(isHex64(proposal), "The proposal is not a record ID. Missing: 64 lowercase hex characters.");
  need(CHOICES.includes(choice), `"${choice}" is not a vote. Missing: approve, reject or abstain.`);
  return ["proposal", proposal, "choice", choice].join("\t");
}

/** KDAOVETO1 and KDAOEXEC1 carry the same one field. */
export function proposalRefPayload({ proposal }) {
  need(isHex64(proposal), "The proposal is not a record ID. Missing: 64 lowercase hex characters.");
  return ["proposal", proposal].join("\t");
}
export const vetoPayload = proposalRefPayload;
export const executePayload = proposalRefPayload;

// ---- network parameters by holder vote (KDAONETPROP1; growth loop build 3, 2026-10-26) ---------------------------
// Mirrors `dao_treasury.rs` (`KIND_NETPARAM_PROPOSAL`, `NETPARAM_PROPOSAL_GRAMMAR`, `is_strict_param`,
// `STRICT_TURNOUT_BPS`, `STRICT_DELAY_SECS`) and `netparams::Param::ALL` names. Only the DAO named by the network's
// `paramdao` may run one; the node checks that, and the value's own rule, and refuses by name.
export const KIND_NETPARAM_PROPOSAL = "KDAONETPROP1";
/** `netparams::Param::ALL`, by name, in the Rust's order. */
export const NETPARAMS = ["stakefloor", "platformdao", "segmentsigners", "segmentrequired", "splitprograms", "issuers", "network", "devnetkeys", "gateoperators", "segmentheartbeat", "paramdao", "bootnodes"];
/** A vote on who signs segments, on which DAO holds the parameters, or on the entry nodes needs 10% turnout and a 7-day delay. */
export const STRICT_TURNOUT_BPS = 1000;
export const STRICT_DELAY_SECS = 7 * 24 * 3600;
/** A chain DAO's vote on its chain's lead nodes rides the same proposal as `chainleads:<chain>` (zero points of failure,
 *  owner ruling 2026-10-27; mirrors `chain_leads::LEAD_PARAM_PREFIX`). Its value is the leads in their own grammar,
 *  `FLX-CHAIN-LEADS-V1 TAB <K> TAB <lead>,<lead>,...`. Strict tier. */
export const LEAD_PARAM_PREFIX = "chainleads:";
const isLeadParam = (name) => typeof name === "string" && name.startsWith(LEAD_PARAM_PREFIX) && /^[a-z0-9]{3,32}$/.test(name.slice(LEAD_PARAM_PREFIX.length));
export const isStrictParam = (name) => ["segmentsigners", "segmentrequired", "paramdao", "bootnodes"].includes(name) || isLeadParam(name);
/** When a parameter proposal's result may be run: the deadline plus its tier's delay. It is in force from the execute. */
export const netParamDelayEndOf = (param, deadline) => Number(deadline) + (isStrictParam(param) ? STRICT_DELAY_SECS : DELAY_SECS);

/** `GovAction::payload` for `NetParamProposal`: the value travels as hex of UTF-8, `-` for an empty one. */
export function netParamProposalPayload({ daoId, param, value, deadline }) {
  need(isId(daoId), "The DAO name is not a DAO name. Missing: 3 to 32 lowercase letters or digits.");
  need(NETPARAMS.includes(param) || isLeadParam(param), `"${param}" is not a network parameter. Missing: one of ${NETPARAMS.join(", ")}, or ${LEAD_PARAM_PREFIX}<chain>. To fix: pick one from the list.`);
  need(typeof value === "string" && !/[\n\r]/.test(value) && (isLeadParam(param) || !/\t/.test(value)), "The value is not one line of text. Missing: the parameter's value with no tab or line break.");
  const hex = value === "" ? "-" : hexOfUtf8(value);
  need(hex.length <= 16384, "The value is too long. Missing: at most 8192 bytes. To fix: shorten it.");
  need(isCount(String(deadline)) && BigInt(deadline) <= I64_MAX, "The deadline is not a whole number of unix seconds.");
  return ["dao", daoId, "param", param, "value", hex, "deadline", String(deadline)].join("\t");
}

/** A record's CID: the SHA-256 of its whole signed text. A proposal's CID is its id. */
export async function recordCidOf(text) {
  return sha256Bytes(enc.encode(text));
}

/** Read one `daogov` record of the four vote kinds from its text, as `RESOLVER_RECORDS` returns it. Returns
 *  `{ signer, m, kind, payload, fields }` or null when it is not one of them or does not read. It checks the record's
 *  shape and payload grammar only; the node checked the signature when it admitted the record, and
 *  `verifyGovRecord` checks it again. */
export function readVoteRecord(text) {
  let raw;
  try { raw = admit(String(text)); } catch { return null; }
  if (raw.payload("N") !== DAO_GOV_CHAIN) return null;
  const kind = raw.payload("K");
  const m = Number(raw.payload("M"));
  let payload;
  try { payload = utf8OfHex(raw.c(1) || ""); } catch { return null; }
  const t = payload.split("\t");
  const labels = { [KIND_FEE_PROPOSAL]: ["dao", "fee", "value", "deadline"], [KIND_VOTE]: ["proposal", "choice"], [KIND_VETO]: ["proposal"], [KIND_EXECUTE]: ["proposal"] }[kind];
  if (!labels || t.length !== labels.length * 2 || !Number.isInteger(m)) return null;
  const fields = {};
  for (let i = 0; i < labels.length; i++) {
    if (t[i * 2] !== labels[i]) return null;
    fields[labels[i]] = t[i * 2 + 1];
  }
  if (kind === KIND_FEE_PROPOSAL && (!isId(fields.dao) || parseFeeValue(fields.fee, fields.value) === null || !isCount(fields.deadline))) return null;
  if (kind !== KIND_FEE_PROPOSAL && !isHex64(fields.proposal)) return null;
  if (kind === KIND_VOTE && !CHOICES.includes(fields.choice)) return null;
  if (kind === KIND_FEE_PROPOSAL) fields.deadline = Number(fields.deadline);
  return { signer: raw.g(), m, kind, payload, fields };
}

/** Check a record's one signature by its `G` with WebCrypto Ed25519. true or false; null when this runtime has no
 *  Ed25519 (the page then says the signature was not checked here). */
export async function verifyGovRecord(text) {
  const hexBytes = (h) => Uint8Array.from(h.match(/../g) || [], (b) => parseInt(b, 16));
  let raw, body, sig;
  try {
    raw = admit(String(text));
    body = signaturePrefix(raw.text);
    sig = raw.text.slice(body.length + 2);
  } catch { return false; }
  if (!isHex64(raw.g()) || !isSig(sig)) return false;
  let key;
  try {
    key = await crypto.subtle.importKey("raw", hexBytes(raw.g()), { name: "Ed25519" }, false, ["verify"]);
  } catch (error) {
    return error?.name === "NotSupportedError" ? null : false;
  }
  try { return await crypto.subtle.verify("Ed25519", key, hexBytes(sig), enc.encode(body)); } catch { return false; }
}

// ---- records ---------------------------------------------------------------------------------------------------
/** The unsigned record body: what the review shows and what is signed. Mirrors Rust `chain::resolver_record`:
 *  `G-Y-V-M-H-N-K-J-C<prev>-C<hex-of-utf8 payload>`. `kind` is one of the kinds above. */
export function govRecordBody({ pubHex, pos, prevCid, kind, payload, nowSec }) {
  need(isHex64(pubHex) && isHex64(prevCid), "The record's signer key and previous CID must be 64 lowercase hex characters.");
  need(Number.isInteger(pos) && pos >= 0, "The chain position must be a whole number.");
  return `G${pubHex}-YLEDGERENTRY-V1-M${nowSec}-H${hexOfUtf8(pubHex)}-N${DAO_GOV_CHAIN}-K${kind}-J${pos}-C${prevCid}-C${hexOfUtf8(payload)}`;
}

/** Sign a body with `signer.signText` and return the record text. */
export async function signGovRecord(signer, body) {
  return `${body}-S${await signer.signText(body)}`;
}

/** One approval `[pubHex, sig]` over `covered` bound to `network` (the devnet when omitted; `networkCovered`), signed
 *  by `signer.signBytes`. */
export async function approve(signer, covered, network) {
  return [signer.pubHex, await signer.signBytes(networkCovered(network, covered))];
}

/** `flx_cap_multisig::render_vote_blob`: the quorum votes a KNTSPEND1 cites, sorted by signer. This is the chain's
 *  own content-addressed blob format; it is rendered here to publish, never stored by the page. */
export function renderVoteBlob(votes) {
  for (const [k, s] of votes) need(isHex64(k) && isSig(s), "A vote needs a 64-hex signer key and a 128-hex signature.");
  const rows = [...votes].sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0)).map(([k, s]) => `{"signer":"${k}","signature":"${s}"}`);
  return `[${rows.join(",")}]`;
}

/** Read lines of `<64-hex key> <128-hex sig>` (any whitespace) into approvals. Returns `{ approvals, bad }`. */
export function parseApprovalLines(text) {
  const approvals = [];
  const bad = [];
  for (const line of String(text || "").split(/\r?\n/)) {
    const row = line.trim();
    if (!row) continue;
    const [k, s, ...rest] = row.split(/\s+/);
    if (isHex64(k) && isSig(s) && rest.length === 0) approvals.push([k, s]);
    else bad.push(row.slice(0, 24));
  }
  return { approvals, bad };
}

// ---- the base chain's genesis mint params (`src/genesis_mint.rs`) ------------------------------------------------
// The base chain mints only when its NativeMint cites an FLX-GENESIS-MINT-V1 blob: one line naming the network DAO
// and the council that signs every safe the mint pays (owner decision 3, 2026-10-22: a 3-of-5 council of both
// founders and three independent signers).
//   FLX-GENESIS-MINT-V1 TAB dao TAB <id> TAB threshold TAB <count> {TAB council TAB <hex64>} {TAB founder TAB <hex64>}
//                       [TAB decimals TAB <count>]   (2026-10-29: FXN declares its decimals here, once; absent = 0)
// `buildGenesisMint` mirrors `GenesisMint::new` and `render`, and `checkGenesisMintParams` mirrors `read_params`, the
// check the chain applies on every path, with the same refusal words. `web/test/fixtures/genesis-mint-vectors.tsv`
// (printed by genesis_mint.rs) pins both, byte for byte.
export const GENESIS_MINT_HEADER = "FLX-GENESIS-MINT-V1";
/** `genesis_mint::MIN_COUNCIL_SIGNERS`, `MIN_COUNCIL_THRESHOLD`, `MIN_INDEPENDENT_SIGNERS`, `MAX_COUNCIL_SIGNERS`. */
export const MIN_COUNCIL_SIGNERS = 5;
export const MIN_COUNCIL_THRESHOLD = 3;
export const MIN_INDEPENDENT_SIGNERS = 3;
export const MAX_COUNCIL_SIGNERS = MAX_SAFE_SIGNERS;
const GENESIS_MINT_MAX_BYTES = 8 * 1024;
const USIZE_MAX = U64_MAX;

/** Keys sorted by their bytes and listed once each (Rust `sort` then `dedup` on `String`). */
function sortedOnce(keys) {
  const byBytes = (a, b) => {
    const [x, y] = [enc.encode(a), enc.encode(b)];
    for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] - y[i];
    return x.length - y.length;
  };
  return [...new Set(Array.from(keys || [], String))].sort(byBytes);
}

/** Rust's `{:?}` of a `&str`, for the one parse error that quotes a label. */
function rustDebug(s) {
  let out = '"';
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (ch === '"' || ch === "\\") out += `\\${ch}`;
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else if (c === 0) out += "\\0";
    else if (c < 0x20 || c === 0x7f) out += `\\u{${c.toString(16)}}`;
    else out += ch;
  }
  return `${out}"`;
}

/** `GenesisMint::new`: the params for `daoId` at `threshold`, the council and the founders sorted and listed once. */
export function genesisMint({ daoId, threshold, council = [], founders = [], decimals = FXN_DECIMALS }) {
  return { daoId: String(daoId), threshold: String(threshold), council: sortedOnce(council), founders: sortedOnce(founders), decimals };
}

/** `GenesisMint::render`: the blob's one line, no trailing newline. */
export function renderGenesisMint(mint) {
  const f = [GENESIS_MINT_HEADER, "dao", mint.daoId, "threshold", String(mint.threshold)];
  for (const k of mint.council) f.push("council", k);
  for (const k of mint.founders) f.push("founder", k);
  if (Number(mint.decimals ?? 0) > 0) f.push("decimals", String(mint.decimals));
  return f.join("\t");
}

/** `GenesisMint::parse`: `{ ok: true, mint }` (threshold a Number), or `{ ok: false, why }` naming the field. */
export function parseGenesisMint(blob) {
  const text = String(blob);
  const line = text.endsWith("\n") ? text.slice(0, -1) : text;
  if (/[\n\r]/.test(line) || enc.encode(line).length > GENESIS_MINT_MAX_BYTES) {
    return { ok: false, why: "the genesis mint params are more than one line or longer than 8192 bytes" };
  }
  const f = line.split("\t");
  if (f[0] !== GENESIS_MINT_HEADER) return { ok: false, why: `the params do not start with ${GENESIS_MINT_HEADER}` };
  if (f[1] !== "dao" || f[3] !== "threshold") return { ok: false, why: "the params need dao <id> then threshold <count>" };
  if (!isId(f[2])) return { ok: false, why: "the dao is not 3 to 32 lowercase letters or digits" };
  const t = f[4];
  if (t === undefined || !/^[1-9][0-9]*$/.test(t) || BigInt(t) > USIZE_MAX) {
    return { ok: false, why: "the threshold is not a whole number above 0" };
  }
  let rest = f.slice(5);
  let decimals = 0;
  if (rest.length >= 2 && rest[rest.length - 2] === "decimals") {
    const d = rest[rest.length - 1];
    if (!/^(0|[1-9][0-9]*)$/.test(d) || Number(d) > MAX_DECIMALS) return { ok: false, why: `decimals is not a whole number from 0 to ${MAX_DECIMALS}` };
    decimals = Number(d);
    rest = rest.slice(0, -2);
  }
  if (rest.length % 2 !== 0) return { ok: false, why: "each council or founder key follows its own label" };
  const council = [];
  const founders = [];
  let inFounders = false;
  for (let i = 0; i < rest.length; i += 2) {
    const [label, key] = [rest[i], rest[i + 1]];
    if (!isHex64(key)) return { ok: false, why: `a ${label} key is not 64 lowercase hex characters` };
    if (label === "council" && !inFounders) council.push(key);
    else if (label === "founder") { inFounders = true; founders.push(key); }
    else if (label === "council") return { ok: false, why: "a council key comes after a founder key" };
    else return { ok: false, why: `${rustDebug(label)} is not council or founder` };
  }
  for (const list of [council, founders]) {
    if (list.some((k, i) => i > 0 && list[i - 1] >= k)) return { ok: false, why: "keys are listed once each, in sorted order" };
  }
  return { ok: true, mint: { daoId: f[2], threshold: Number(t), council, founders, decimals } };
}

/** `GenesisMint::decimals_refusal`: `null` when the params declare FXN's decimals, else `[failure, missing, remedy]`. */
export function genesisDecimalsRefusal(mint) {
  const d = Number(mint.decimals ?? 0);
  if (d === FXN_DECIMALS) return null;
  return [
    `the mint params declare ${d} decimals, and FXN's genesis table counts base units at ${FXN_DECIMALS}`,
    `decimals ${FXN_DECIMALS} in the ${GENESIS_MINT_HEADER} params (a blob that names none reads as 0)`,
    "render the params with genesis_mint::GenesisMint::new, which declares them; a chain minted before 2026-10-29 starts again from a fresh genesis",
  ];
}

/** `GenesisMint::council_refusal`: `null` when the council has the owner's shape, else `[failure, missing, remedy]`.
 *  The chain cannot see whether a signer is truly independent of the founders: that stays a promise. */
export function genesisCouncilRefusal(mint) {
  const n = mint.council.length;
  const t = Number(mint.threshold);
  const independent = mint.council.filter((k) => !mint.founders.includes(k)).length;
  if (n < MIN_COUNCIL_SIGNERS || n > MAX_COUNCIL_SIGNERS) {
    return [`the council has ${n} signers`, `${MIN_COUNCIL_SIGNERS} to ${MAX_COUNCIL_SIGNERS} council signers`, "name both founders and at least three independent signers"];
  }
  const outsider = mint.founders.find((k) => !mint.council.includes(k));
  if (outsider !== undefined) {
    return [`the founder ${outsider.slice(0, 16)} is not a council signer`, "every founder on the council", "add the founder to the council, or remove them from the founders"];
  }
  if (independent < MIN_INDEPENDENT_SIGNERS) {
    return [`the council has ${independent} signers who are not founders`, `at least ${MIN_INDEPENDENT_SIGNERS} independent signers`, "add independent signers to the council"];
  }
  if (t < MIN_COUNCIL_THRESHOLD || t > n) {
    return [`the council's threshold is ${t} of ${n}`, `a threshold from ${MIN_COUNCIL_THRESHOLD} to ${n}`, "set the threshold to 3 or more, at most the signer count"];
  }
  if (t <= mint.founders.length) {
    return [
      `the founders are ${mint.founders.length} and the threshold is ${t}, so the founders alone could sign`,
      "a threshold above the founders' count",
      "raise the threshold, so every council act needs an independent signer",
    ];
  }
  return null;
}

/** `genesis_mint::read_params`, the chain's own check of a mint's params blob on every path: `{ ok: true, mint }` or
 *  `{ ok: false, refusal: [failure, missing, remedy] }`, worded as the chain words it. */
export function checkGenesisMintParams(blob) {
  const text = String(blob);
  if (!text.startsWith(GENESIS_MINT_HEADER)) {
    return {
      ok: false,
      refusal: [
        "the base chain's mint names a params blob that pays one treasury key, and the base mint pays every row of the genesis table into its own safe or pool",
        `an ${GENESIS_MINT_HEADER} params blob naming the network DAO and its council`,
        "render the params with genesis_mint::GenesisMint::render, publish them with BLOB_PUT, and sign the mint over their CID",
      ],
    };
  }
  const parsed = parseGenesisMint(text);
  if (!parsed.ok) {
    return { ok: false, refusal: [`the genesis mint params do not read: ${parsed.why}`, `an ${GENESIS_MINT_HEADER} blob`, "render it with genesis_mint::GenesisMint::render"] };
  }
  const refusal = genesisCouncilRefusal(parsed.mint) ?? genesisDecimalsRefusal(parsed.mint);
  return refusal ? { ok: false, refusal } : { ok: true, mint: parsed.mint };
}

/** Build the mint's params blob from a page's inputs (any order, repeats dropped) and check it exactly as the chain
 *  will: `{ ok: true, text, mint }`, where `text` is the blob to publish with BLOB_PUT and cite in the mint, or
 *  `{ ok: false, refusal: [failure, missing, remedy] }`. Nothing is signed or sent here. */
export function buildGenesisMint({ daoId, threshold, council = [], founders = [] }) {
  const text = renderGenesisMint(genesisMint({ daoId, threshold, council, founders }));
  const checked = checkGenesisMintParams(text);
  return checked.ok ? { ok: true, text, mint: checked.mint } : checked;
}

// ---- holder spends, budgets and ops (KDAOPROP1, KDAOSAFEPROP1, KDAOBUDGETPROP1, KOPS*) ------------------------------
// Added 2026-10-29 so a page or a devnet script can run the whole DAO story, not only create safes and set fees. Each
// payload mirrors `GovAction::payload` in `src/dao_treasury.rs` (the grammars `PROPOSAL_GRAMMAR`,
// `SAFE_PROPOSAL_GRAMMAR`, `BUDGET_PROPOSAL_GRAMMAR`, `OPS_SPEND_GRAMMAR`, `OPS_STREAM_GRAMMAR`, `OPS_CLAIM_GRAMMAR`,
// `OPS_STOP_GRAMMAR`); the covered bytes mirror `dao_ops::{spend_covered, stream_covered, stop_covered}`; the ids
// mirror `execute_key`, the stream id (sha256 of its covered bytes) and the claim key. `GOV_GRAMMARS` is
// `grammar_of` for all twenty kinds, and `parseGovPayload` is `Grammar::parse`, so any payload can be read back
// against the Rust field list. The table was checked against the Rust source text, kind by kind, on 2026-10-29 (no Rust
// vectors exist for these kinds yet).
// Who signs what (the chain checks it; these builders only shape it):
//   KDAOPROP1, KDAOSAFEPROP1, KDAOBUDGETPROP1, KDAOVOTE1, KDAOVETO1: a holder with KSTAKE1 stake locked under the DAO.
//   KDAOEXEC1: anyone, from the end of the delay.
//   KOPSSPEND1, KOPSSTREAM1, KOPSSTOP1: any key submits; the ops safe's threshold of signers approves inline, and the
//   payee's own approval never counts.
//   KOPSCLAIM1: the stream's payee, no approvals.
export const KIND_PROPOSAL = "KDAOPROP1";
export const KIND_SAFE_PROPOSAL = "KDAOSAFEPROP1";
export const KIND_BUDGET_PROPOSAL = "KDAOBUDGETPROP1";
export const KIND_OPS_SPEND = "KOPSSPEND1";
export const KIND_OPS_STREAM = "KOPSSTREAM1";
export const KIND_OPS_CLAIM = "KOPSCLAIM1";
export const KIND_OPS_STOP = "KOPSSTOP1";
/** `dao_treasury::TURNOUT_BPS` and `VETO_BPS`: 4% turnout over approve and reject, 1% of the snapshot vetoes. */
export const TURNOUT_BPS = 400;
export const VETO_BPS = 100;
/** `dao_ops::WEEK`: a stream's rate is per week. `dao_ops::MAX_PERIOD_SECS`: a budget period of at most 366 days. */
export const WEEK_SECS = 7 * 86400;
export const MAX_PERIOD_SECS = 366 * 86400;
/** `dao_ops::CATEGORIES`, in the Rust's order. A budget naming anything else is refused by name. */
export const BUDGET_CATEGORIES = ["servers", "maintainers", "salaries", "bonuses", "campaigns", "scaling", "hiring", "legal", "offices", "audits", "emergency"];
/** `billing_fees::Fee::NETWORK`: the network's dues, voted by KDAOFEEPROP1 like the billing fees but kept out of `FEES`. */
export const NETWORK_FEES = ["launchdues", "launchfee"];
/** `billing_fees::MAX_LAUNCH_DUES_FXN` and `MAX_LAUNCH_FEE_FXN`. */
/** FXN base units since 2026-10-29: 10,000,000 FXN at 9 decimals. */
export const MAX_LAUNCH_DUES_FXN = 10000000n * 10n ** 9n;
export const MAX_LAUNCH_FEE_FXN = 10000000n * 10n ** 9n;

const OPS_SPEND_DOMAIN = "FLX-DAO-OPS-SPEND-V2\0";
const OPS_STREAM_DOMAIN = "FLX-DAO-OPS-STREAM-V2\0";
const OPS_STOP_DOMAIN = "FLX-DAO-OPS-STOP-V1\0";
const OPS_CLAIM_KEY_DOMAIN = "FLX-DAO-OPS-CLAIM-V1\0";
const EXECUTE_KEY_DOMAIN = "FLX-DAO-PROPOSAL-EXEC-V1\0";

// The grammar table (`grammar_of`). A rule is the Rust `Rule` variant's name; a group is [label, [rules]].
const APPROVE_GROUP = ["approve", ["Hex64", "Sig"]];
const KEYS_GROUPS = [["signer", ["Hex64"]], ["delegate", ["Hex64"]], APPROVE_GROUP];
/** `UPFRONT` (owner ruling 2026-10-29): a vested or ruled safe's upfront part, at most one row, after the approvals. The
 *  safe builders above write it, and it is inside the safe's address and its approval bytes (`SafeVesting::upfront`). */
const VEST_GROUPS = [...KEYS_GROUPS, ["upfront", ["Count"]]];
const SAFE_HEAD = [["dao", "Id"], ["founding", "Hex64"], ["treasury", "Id"], ["label", "Id"], ["threshold", "Count"]];
const VEST_TAIL = [["total", "Count"], ["start", "Count"], ["cliff", "Count"], ["tranches", "Count"], ["interval", "Count"]];
export const GOV_GRAMMARS = Object.freeze({
  [KIND_TREASURY_ADD]: { fixed: [["dao", "Id"], ["founding", "Hex64"], ["label", "Id"]], groups: [APPROVE_GROUP] },
  [KIND_SAFE_CREATE]: { fixed: SAFE_HEAD, groups: KEYS_GROUPS },
  [KIND_SAFE_SEND]: { fixed: [["dao", "Id"], ["safe", "Hex64"], ["chain", "Id"], ["to", "Hex64"], ["amount", "Count"], ["at", "Count"]], groups: [APPROVE_GROUP] },
  [KIND_PROPOSAL]: { fixed: [["dao", "Id"], ["treasury", "Id"], ["chain", "Id"], ["to", "Hex64"], ["amount", "Count"], ["deadline", "Count"]], groups: [] },
  [KIND_VOTE]: { fixed: [["proposal", "Hex64"], ["choice", "Choice"]], groups: [] },
  [KIND_VETO]: { fixed: [["proposal", "Hex64"]], groups: [] },
  [KIND_EXECUTE]: { fixed: [["proposal", "Hex64"]], groups: [] },
  [KIND_FEE_PROPOSAL]: { fixed: [["dao", "Id"], ["fee", "FeeName"], ["value", "FeeValue"], ["deadline", "Count"]], groups: [] },
  [KIND_NETPARAM_PROPOSAL]: { fixed: [["dao", "Id"], ["param", "ParamName"], ["value", "ParamValue"], ["deadline", "Count"]], groups: [] },
  [KIND_VESTED_SAFE_CREATE]: { fixed: [...SAFE_HEAD, ...VEST_TAIL], groups: VEST_GROUPS },
  [KIND_SALE_SAFE_CREATE]: { fixed: [...SAFE_HEAD, ["total", "Count"], ["start", "Count"], ["phases", "Count"], ["interval", "Count"]], groups: VEST_GROUPS },
  [KIND_VOTE_SAFE_CREATE]: { fixed: [...SAFE_HEAD, ...VEST_TAIL, ["capbps", "Count"], ["window", "Count"]], groups: VEST_GROUPS },
  [KIND_FUND_SAFE_CREATE]: { fixed: [...SAFE_HEAD, ...VEST_TAIL, ["capbps", "Count"], ["window", "Count"], ["idcap", "Count"]], groups: VEST_GROUPS },
  [KIND_OPS_SAFE_CREATE]: { fixed: [...SAFE_HEAD, ...VEST_TAIL], groups: VEST_GROUPS },
  [KIND_BUDGET_PROPOSAL]: {
    fixed: [["dao", "Id"], ["safe", "Hex64"], ["category", "Id"], ["amount", "Count"], ["period", "Count"], ["band", "Count"], ["deadline", "Count"]],
    groups: [["payee", ["Hex64"]]],
  },
  [KIND_OPS_SPEND]: { fixed: [["dao", "Id"], ["budget", "Hex64"], ["chain", "Id"], ["to", "Hex64"], ["amount", "Count"], ["at", "Count"]], groups: [APPROVE_GROUP] },
  [KIND_OPS_STREAM]: {
    fixed: [["dao", "Id"], ["budget", "Hex64"], ["chain", "Id"], ["payee", "Hex64"], ["rate", "Count"], ["start", "Count"], ["end", "Count"]],
    groups: [APPROVE_GROUP],
  },
  [KIND_OPS_CLAIM]: { fixed: [["dao", "Id"], ["stream", "Hex64"], ["amount", "Count"], ["at", "Count"]], groups: [] },
  [KIND_OPS_STOP]: { fixed: [["dao", "Id"], ["stream", "Hex64"], ["at", "Count"]], groups: [APPROVE_GROUP] },
  [KIND_SAFE_PROPOSAL]: { fixed: [["dao", "Id"], ["safe", "Hex64"], ["chain", "Id"], ["to", "Hex64"], ["amount", "Count"], ["deadline", "Count"]], groups: [] },
});

/** `Rule::holds`. FeeName and ParamName check the names this file knows; the node checks each value's own rule. */
function ruleHolds(rule, v) {
  switch (rule) {
    case "Id": return isId(v);
    case "Hex64": return isHex64(v);
    case "Sig": return isSig(v);
    case "Count": return isCount(v);
    case "Choice": return CHOICES.includes(v);
    case "FeeName": return FEES.includes(v) || NETWORK_FEES.includes(v);
    case "FeeValue": return isFeeValueShape(v);
    case "ParamName": return NETPARAMS.includes(v) || (typeof v === "string" && v.startsWith(LEAD_PARAM_PREFIX) && isId(v.slice(LEAD_PARAM_PREFIX.length)));
    case "ParamValue": return v === "-" || (typeof v === "string" && v.length <= 16384 && v.length % 2 === 0 && /^[0-9a-f]*$/.test(v));
    default: return false;
  }
}

/** `Grammar::parse` for `kind`: `{ ok: true, fixed: {label: value}, groups: {label: [[values]]} }`, or
 *  `{ ok: false, why }` worded as the Rust words it. */
export function parseGovPayload(kind, payload) {
  const g = GOV_GRAMMARS[kind];
  if (!g) return { ok: false, why: `${kind} is not a daogov kind` };
  if (/[\n\r]/.test(payload)) return { ok: false, why: "the payload is more than one line" };
  const t = String(payload).split("\t");
  let at = 0;
  const fixed = {};
  for (const [label, rule] of g.fixed) {
    if (t[at] === undefined) return { ok: false, why: `the payload ends before the label ${label}` };
    if (t[at] !== label) return { ok: false, why: `box ${at + 1} is "${t[at]}" where the label ${label} belongs` };
    if (t[at + 1] === undefined) return { ok: false, why: `the label ${label} has no value` };
    if (!ruleHolds(rule, t[at + 1])) return { ok: false, why: `the value of ${label} is not ${rule}` };
    fixed[label] = t[at + 1];
    at += 2;
  }
  const groups = Object.fromEntries(g.groups.map(([label]) => [label, []]));
  let gi = 0;
  while (at < t.length) {
    const label = t[at];
    const offset = g.groups.slice(gi).findIndex(([name]) => name === label);
    if (offset < 0) {
      return { ok: false, why: g.groups.some(([name]) => name === label) ? `the group ${label} comes after a group it must precede` : `"${label}" is not a label of this record kind` };
    }
    gi += offset;
    const rules = g.groups[gi][1];
    const row = [];
    for (let i = 0; i < rules.length; i++) {
      const v = t[at + 1 + i];
      if (v === undefined) return { ok: false, why: `the group ${label} is cut short` };
      if (!ruleHolds(rules[i], v)) return { ok: false, why: `a value in the group ${label} is not ${rules[i]}` };
      row.push(v);
    }
    groups[label].push(row);
    at += 1 + rules.length;
  }
  return { ok: true, fixed, groups };
}

/** `Grammar::render`: `fixed` in the grammar's order, then each group's rows. */
function renderGov(kind, fixed, groups = {}) {
  const g = GOV_GRAMMARS[kind];
  const t = [];
  g.fixed.forEach(([label], i) => t.push(label, String(fixed[i])));
  for (const [label] of g.groups) for (const row of groups[label] || []) t.push(label, ...row.map(String));
  const payload = t.join("\t");
  const read = parseGovPayload(kind, payload);
  need(read.ok, `The ${kind} record does not fit its grammar: ${read.why}. Missing: every field in its rule. To fix: correct the field it names.`);
  return payload;
}

const amountText = (amount, what) => {
  let n;
  try { n = BigInt(amount); } catch { n = -1n; }
  need(n >= 1n && n <= I64_MAX, `The ${what} ${amount} is out of range. Missing: a whole number from 1 to ${I64_MAX}. To fix: enter a positive amount.`);
  return n.toString();
};
const timeText = (v, what) => {
  need(isCount(String(v)) && BigInt(v) <= I64_MAX, `The ${what} "${v}" is not a whole unix time. Missing: digits with no leading zero. To fix: pass Math.floor(Date.now() / 1000), or milliseconds where the field says at.`);
  return String(v);
};

/** KDAOPROP1: holders vote to pay `amount` of `chainId` from treasury `treasury` (its label; `public` is the DAO's
 *  bound key) to `to`. The proposer must hold stake locked under the DAO at the record's `M`. */
export function treasuryProposalPayload({ daoId, treasury, chainId, to, amount, deadline }) {
  need(isId(daoId) && isId(treasury) && isId(chainId) && isHex64(to), "The proposal has a field outside its rule. Missing: a DAO id, a treasury label, a chain id and a 64-hex recipient.");
  return renderGov(KIND_PROPOSAL, [daoId, treasury, chainId, to, amountText(amount, "amount"), timeText(deadline, "deadline")]);
}

/** KDAOSAFEPROP1: holders vote to pay from a vote-gated safe (KDAOSAFEVOTE1, KDAOSAFEFUND1, or a sale safe after its
 *  sale ends). The spend must still fit the safe's vesting, window and recipient cap at the end of the delay. */
export function safeProposalPayload({ daoId, safe, chainId, to, amount, deadline }) {
  need(isId(daoId) && isHex64(safe) && isId(chainId) && isHex64(to), "The safe proposal has a field outside its rule. Missing: a DAO id, the safe's 64-hex address, a chain id and a 64-hex recipient.");
  need(to !== safe, "The safe would pay itself. Missing: another recipient. To fix: name the key that should receive the FXN.");
  return renderGov(KIND_SAFE_PROPOSAL, [daoId, safe, chainId, to, amountText(amount, "amount"), timeText(deadline, "deadline")]);
}

/** KDAOBUDGETPROP1: holders vote one ops budget: `category` (BUDGET_CATEGORIES), at most `amount` per `periodSecs`,
 *  streams of at most `band` a week (0: no streams), and at most one `payee` (needed to pay a founder). */
export function budgetProposalPayload({ daoId, safe, category, amount, periodSecs, band, payee = null, deadline }) {
  need(isId(daoId) && isHex64(safe), "The budget has a field outside its rule. Missing: a DAO id and the ops safe's 64-hex address.");
  need(BUDGET_CATEGORIES.includes(category), `"${category}" is not a budget category. Missing: one of ${BUDGET_CATEGORIES.join(", ")}. To fix: pick one.`);
  need(Number.isSafeInteger(periodSecs) && periodSecs >= 1 && periodSecs <= MAX_PERIOD_SECS, `A budget period of ${periodSecs} s. Missing: a period from 1 s to ${MAX_PERIOD_SECS} s. To fix: propose a period of at most a year.`);
  need(isCount(String(band)), "The pay band is not a whole number. Missing: the most a weekly stream may pay, or 0 for no streams.");
  need(payee === null || isHex64(payee), "The payee is not a key. Missing: 64 lowercase hex characters, or no payee.");
  return renderGov(KIND_BUDGET_PROPOSAL, [daoId, safe, category, amountText(amount, "amount"), String(periodSecs), String(band), timeText(deadline, "deadline")], { payee: payee ? [[payee]] : [] });
}

/** `dao_ops::spend_covered`: what the ops safe's signers approve for one payment. D3 (2026-10-29): the chain id is in
 *  it (V2), so an approval cannot be replayed with another chain's token. */
export function opsSpendCovered(daoId, budget, chainId, to, amount, atMs) {
  return lengthPrefixed(OPS_SPEND_DOMAIN, [daoId, budget, chainId, to, BigInt(amount).toString(), String(atMs)]);
}
/** `dao_ops::stream_covered`: what the ops safe's signers approve for one weekly stream, the chain id in it (V2). */
export function opsStreamCovered(daoId, budget, chainId, payee, rate, start, end) {
  return lengthPrefixed(OPS_STREAM_DOMAIN, [daoId, budget, chainId, payee, BigInt(rate).toString(), String(start), String(end)]);
}
/** `dao_ops::stop_covered`: what the ops safe's signers approve to stop a stream from `at` (unix seconds). */
export function opsStopCovered(daoId, stream, at) {
  return lengthPrefixed(OPS_STOP_DOMAIN, [daoId, stream, String(at)]);
}
/** A stream's id: the SHA-256 of its covered bytes (one stream per approval set). KOPSCLAIM1 and KOPSSTOP1 name it. */
export async function opsStreamId(daoId, budget, chainId, payee, rate, start, end) {
  return sha256Bytes(opsStreamCovered(daoId, budget, chainId, payee, rate, start, end));
}
/** A spend's ledger key: the SHA-256 of its covered bytes. */
export async function opsSpendKey(daoId, budget, chainId, to, amount, atMs) {
  return sha256Bytes(opsSpendCovered(daoId, budget, chainId, to, amount, atMs));
}
/** A claim's ledger key, from the claim record's own CID. */
export async function opsClaimKey(claimCid) {
  return sha256Bytes(enc.encode(`${OPS_CLAIM_KEY_DOMAIN}${claimCid}`));
}
/** `execute_key`: the ledger key of a passed proposal's one transfer. A budget is the proposal's CID itself. */
export async function executeKeyOf(proposalCid) {
  return sha256Bytes(lengthPrefixed(EXECUTE_KEY_DOMAIN, [proposalCid]));
}

/** KOPSSPEND1: one payment from the ops safe inside budget `budget` (the budget proposal's CID), approved inline. */
export function opsSpendPayload({ daoId, budget, chainId, to, amount, atMs, approvals = [] }) {
  need(isId(daoId) && isHex64(budget) && isId(chainId) && isHex64(to), "The ops payment has a field outside its rule. Missing: a DAO id, the budget's 64-hex id, a chain id and a 64-hex payee.");
  checkApprovals(approvals);
  return renderGov(KIND_OPS_SPEND, [daoId, budget, chainId, to, amountText(amount, "amount"), timeText(atMs, "at")], { approve: approvals });
}

/** KOPSSTREAM1: a weekly stream of `rate` from `start` to `end` (unix seconds) inside budget `budget`, approved inline. */
export function opsStreamPayload({ daoId, budget, chainId, payee, rate, start, end, approvals = [] }) {
  need(isId(daoId) && isHex64(budget) && isId(chainId) && isHex64(payee), "The stream has a field outside its rule. Missing: a DAO id, the budget's 64-hex id, a chain id and a 64-hex payee.");
  need(Number(end) > Number(start), "The stream ends at or before its start. Missing: an end after the start. To fix: fix the stream's start and end.");
  checkApprovals(approvals);
  return renderGov(KIND_OPS_STREAM, [daoId, budget, chainId, payee, amountText(rate, "rate"), timeText(start, "start"), timeText(end, "end")], { approve: approvals });
}

/** KOPSCLAIM1: the payee takes `amount` of what stream `stream` has accrued by `atMs`. Signed by the payee. */
export function opsClaimPayload({ daoId, stream, amount, atMs }) {
  need(isId(daoId) && isHex64(stream), "The claim has a field outside its rule. Missing: a DAO id and the stream's 64-hex id.");
  return renderGov(KIND_OPS_CLAIM, [daoId, stream, amountText(amount, "amount"), timeText(atMs, "at")]);
}

/** KOPSSTOP1: the council ends stream `stream`'s accrual from `at` (unix seconds), approved inline. */
export function opsStopPayload({ daoId, stream, at, approvals = [] }) {
  need(isId(daoId) && isHex64(stream), "The stop has a field outside its rule. Missing: a DAO id and the stream's 64-hex id.");
  checkApprovals(approvals);
  return renderGov(KIND_OPS_STOP, [daoId, stream, timeText(at, "at")], { approve: approvals });
}

/** KDAOFEEPROP1 for the network's dues (`launchdues`, `launchfee`): whole FXN from 1 to the bound in code. */
export function networkFeeProposalPayload({ daoId, fee, value, deadline }) {
  need(isId(daoId), "The DAO name is not a DAO name. Missing: 3 to 32 lowercase letters or digits.");
  need(NETWORK_FEES.includes(fee), `"${fee}" is not a network dues value. Missing: ${NETWORK_FEES.join(" or ")}. To fix: pick one, or use feeProposalPayload for a billing fee.`);
  const bound = fee === "launchdues" ? MAX_LAUNCH_DUES_FXN : MAX_LAUNCH_FEE_FXN;
  need(isCount(String(value)) && BigInt(value) >= 1n && BigInt(value) <= bound, `${fee} is whole FXN from 1 to ${bound}, the bound in code. Missing: a value in that range. To fix: change the value.`);
  return renderGov(KIND_FEE_PROPOSAL, [daoId, fee, String(value), timeText(deadline, "deadline")]);
}

/** Read any `daogov` record: `{ signer, m, kind, payload, fields, groups }`, or null when it does not read. */
export function readGovRecord(text) {
  let raw;
  try { raw = admit(String(text)); } catch { return null; }
  if (raw.payload("N") !== DAO_GOV_CHAIN) return null;
  const kind = raw.payload("K");
  let payload;
  try { payload = utf8OfHex(raw.c(1) || ""); } catch { return null; }
  const read = parseGovPayload(kind, payload);
  if (!read.ok) return null;
  return { signer: raw.g(), m: Number(raw.payload("M")), kind, payload, fields: read.fixed, groups: read.groups };
}

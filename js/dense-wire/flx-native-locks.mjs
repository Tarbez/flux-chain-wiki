// One FXN (owner ruling 2026-10-27, docs/design/one-fxn.md): native FXN locks, built and read in a browser.
//
// For whoever builds a page that spends native FXN through a lock: a launch's buy (purpose `buy`, step 4), a name
// purchase (purpose `name`, step 6), or a refund of either after its deadline. JS port of `src/native_locks.rs`:
// `build_lock` and `build_refund` byte for byte, and `read` for the record kinds a page needs back.
//
// A lock record is a `chain::resolver_record` on the kernel chain `nlocks` (so it rides the signer's BASE list, the
// one `HEAD <key>` answers without a chain), `K` its kind, `C[1]` hex of UTF-8 of its payload:
//
//   KNLOCK1    locker      <chain> TAB <amount> TAB <beneficiary key> TAB <deadline> TAB <purpose>
//   KNREFUND1  locker      <lock cid> TAB <amount>          (M at or after the lock's deadline)
//
// The record's CID is sha256 of its signed text. The node submits it as `RESOLVER_RECORD<TAB><text>` and answers
// `OK<TAB><cid>` or `ERR<TAB><code><TAB><failure. Missing: ... To fix: ...>`. A new record must be stamped within the
// node's clock skew (seconds, not milliseconds).
//
// Two things a page must check itself, because the node admits the record either way:
//   * A lock whose locker lacks the FXN is admitted and holds NOTHING (the ledger moved nothing). Read what it holds
//     (`lockHeld`) before naming it anywhere.
//   * A lock's holder has no key. Its FXN leaves only by the rule of its purpose (a buy's fill, a name's purchase) or
//     by the locker's refund from its deadline on.
//
// `signer` is `{ pubHex, signText(text) -> hex signature }` (flx-identity-bridge.mjs). `send(line)` resolves with the
// node's reply frame (WireClient._send, or any line transport). Amounts are BigInt or whole numbers; replies are BigInt.
//
// Exports only; no top-level work. Native Web Crypto only.

import { resolverRecordBody, isChainIdShape } from "./flx-builders.mjs";
import { sha256Hex } from "./flx-crypto.mjs";
import { utf8OfHex } from "./flx-dumb-parser.mjs";

/** `chain::BASE_CHAIN_ID`: the chain whose native FXN the wallet shows (`NATIVE_BALANCE defxn <key>`). */
export const BASE_CHAIN_ID = "defxn";
/** `native_locks::NATIVE_LOCKS_CHAIN`. */
export const NATIVE_LOCKS_CHAIN = "nlocks";
export const KIND_LOCK = "KNLOCK1";
export const KIND_RELEASE = "KNRELEASE1";
export const KIND_REFUND = "KNREFUND1";
export const KIND_PAYOUT = "KNPAYOUT1";
/** `native_locks::PURPOSE_MAX`. */
export const PURPOSE_MAX = 32;
/** The purposes `native_locks.rs` and `native_swap.rs` name. */
export const PURPOSE = Object.freeze({
  STAKE: "stake",
  BOND: "bond",
  NAME: "name",
  BUY: "buy",
  METER: "meter",
  KEEP: "keep",
  POOL: "pool",
  BOUNTY: "bounty",
  CREATOR_BOND: "creator-bond",
});
/** How long a buy's lock outlives its intent. The node needs the lock's deadline strictly after the intent's
 *  (`native_swap::CODE_LOCK_ENDS_TOO_SOON`); past that, a longer margin only delays the refund of a lock no fill spent. */
export const BUY_LOCK_MARGIN_SECS = 60;

const KEY64 = /^[0-9a-f]{64}$/;
const I64_MAX = 9223372036854775807n;

function refuse(failure, missing, remedy) {
  return Object.assign(new Error(`${failure}. Missing: ${missing}. To fix: ${remedy}`), { failure, missing, remedy });
}

function wholeAmount(value, what) {
  let n;
  try {
    n = BigInt(value);
  } catch {
    throw refuse(`${what} ${JSON.stringify(String(value))} is not a whole number`, `${what} as a whole number of FXN above zero`, "pass a positive integer or BigInt");
  }
  if (n <= 0n || n > I64_MAX) throw refuse(`${what} ${n} is out of range`, `${what} from 1 to ${I64_MAX}`, "lock a positive amount");
  return n;
}

/** `pool_escrow_holder(chain)` (flx-cap-custody `fill.rs`): the keyless beneficiary of every buy lock for a launch. */
export function poolEscrowHolder(chainId) {
  return sha256Hex(`pool-escrow:${chainId}`);
}

/** `flx_cap_ledger::lock_holder(cid)`: the ledger holder a lock's FXN sits under (`NATIVE_BALANCE defxn <this>`). */
export function lockHolder(lockCid) {
  return `native-lock:${lockCid}`;
}

/** The payload of a `KNLOCK1`, checked as `native_locks::read` checks it. `nowSec` is the record's `M`. */
export function lockPayload({ chain = BASE_CHAIN_ID, amount, beneficiary, deadline, purpose, nowSec }) {
  const units = wholeAmount(amount, "the amount");
  if (!isChainIdShape(chain)) throw refuse(`the chain ${JSON.stringify(chain)} is not a chain id`, "3-32 lowercase letters or digits", `lock on ${BASE_CHAIN_ID}, the base chain`);
  if (!KEY64.test(String(beneficiary))) throw refuse("the beneficiary is not a key", "a 64-hex beneficiary key", "pass the pool escrow (poolEscrowHolder) or the seller's key");
  if (!Number.isSafeInteger(deadline) || !Number.isSafeInteger(nowSec) || deadline <= nowSec) {
    throw refuse(`the deadline ${deadline} is not after the lock's own time ${nowSec}`, "a deadline in whole seconds after M", "set the deadline after now");
  }
  if (typeof purpose !== "string" || purpose.length === 0 || purpose.length > PURPOSE_MAX || !/^[a-z0-9-]+$/.test(purpose)) {
    throw refuse(`the purpose ${JSON.stringify(purpose)} does not read`, `1 to ${PURPOSE_MAX} lowercase letters, digits or -`, "pass one of PURPOSE");
  }
  return `${chain}\t${units}\t${beneficiary}\t${deadline}\t${purpose}`;
}

async function signed(signer, { pos, prev, kind, payload, nowSec }) {
  if (!Number.isInteger(pos) || pos < 0) throw refuse(`the position ${pos} is not a list length`, "the signer's base-list length from HEAD", "read HEAD <key> just before signing");
  if (!KEY64.test(String(prev))) throw refuse("the previous CID is not 64 hex", "the base list's head CID (or the network root on a first record)", "read HEAD <key> just before signing");
  if (!Number.isSafeInteger(nowSec) || nowSec > 1e11) throw refuse(`M ${nowSec} is not unix seconds`, "the current time in whole seconds", "pass Math.floor(Date.now() / 1000)");
  const body = resolverRecordBody({ pubHex: signer.pubHex, pos, prevCid: prev, resolverChainId: NATIVE_LOCKS_CHAIN, kindMarker: kind, inlinePayload: payload, nowSec });
  const text = `${body}-S${await signer.signText(body)}`;
  return { text, cid: await sha256Hex(text), line: `RESOLVER_RECORD\t${text}` };
}

/** `native_locks::build_lock`: the signer locks `amount` of `chain` for `beneficiary` until `deadline`.
 *  -> `{ text, cid, line }`; `cid` is the lock's id everywhere (a buy's fund_credit, a purchase's C[6]). */
export async function buildNativeLock(signer, { pos, prev, chain = BASE_CHAIN_ID, amount, beneficiary, deadline, purpose, nowSec }) {
  const payload = lockPayload({ chain, amount, beneficiary, deadline, purpose, nowSec });
  return signed(signer, { pos, prev, kind: KIND_LOCK, payload, nowSec });
}

/** `native_locks::build_refund`: the locker takes `amount` back from `lock`. The node admits it only from the lock's
 *  deadline on, and only stamped after the lock's latest payout. */
export async function buildNativeRefund(signer, { pos, prev, lock, amount, nowSec }) {
  if (!KEY64.test(String(lock))) throw refuse("the lock is not a CID", "the lock record's 64-hex CID", "pass the cid buildNativeLock returned");
  const units = wholeAmount(amount, "the amount");
  return signed(signer, { pos, prev, kind: KIND_REFUND, payload: `${lock}\t${units}`, nowSec });
}

/** What a buy's lock must say (`native_swap::screen_buy`): base chain, purpose `buy`, the launch's pool escrow, at
 *  least `amountIn`, and a deadline strictly after the intent's. Feed the result to `buildNativeLock`. */
export async function buyLockTerms({ chainId, amountIn, intentDeadline, marginSecs = BUY_LOCK_MARGIN_SECS }) {
  if (!isChainIdShape(chainId)) throw refuse(`the launch ${JSON.stringify(chainId)} is not a chain id`, "the launched chain's id", "pick a launched token");
  if (!Number.isSafeInteger(intentDeadline)) throw refuse("the intent has no deadline", "the deadline the intent signs, in seconds", "set the intent's deadline first");
  if (!Number.isSafeInteger(marginSecs) || marginSecs < 1) throw refuse(`a margin of ${marginSecs} s does not end the lock after the intent`, "a margin of at least 1 s", "use BUY_LOCK_MARGIN_SECS");
  return { chain: BASE_CHAIN_ID, amount: wholeAmount(amountIn, "amount_in"), beneficiary: await poolEscrowHolder(chainId), deadline: intentDeadline + marginSecs, purpose: PURPOSE.BUY };
}

/** A name purchase's lock (step 6): the buyer locks exactly the price for the seller, purpose `name`, a deadline after
 *  the purchase will be stamped. The seller then signs the KDOMBUY1 with this lock's CID in C[6]. */
export function nameLockTerms({ sellerKey, price, deadline }) {
  if (!KEY64.test(String(sellerKey))) throw refuse("the seller is not a key", "the seller's 64-hex key (the name's owner, DOM_WHO)", "read the owner with DOM_WHO");
  return { chain: BASE_CHAIN_ID, amount: wholeAmount(price, "the price"), beneficiary: sellerKey, deadline, purpose: PURPOSE.NAME };
}

/** `native_locks::read` for a lock or a refund: what the signed text says, or null when it is not one. Checks no
 *  signature. `at` is the record's own M. */
export function readNativeLock(text) {
  const blocks = String(text ?? "").trim().split("-");
  const one = (role) => blocks.find((b) => b[0] === role)?.slice(1) ?? null;
  const cs = blocks.filter((b) => b[0] === "C").map((b) => b.slice(1));
  if (one("N") !== NATIVE_LOCKS_CHAIN || cs.length < 2) return null;
  const at = Number(one("M"));
  const signer = one("G");
  if (!Number.isSafeInteger(at) || !KEY64.test(signer ?? "")) return null;
  let payload;
  try {
    payload = utf8OfHex(cs[1]);
  } catch {
    return null;
  }
  const f = payload.split("\t");
  const whole = (s) => (/^\d+$/.test(s ?? "") ? BigInt(s) : null);
  if (one("K") === KIND_LOCK && f.length === 5) {
    const [chain, amount, beneficiary, deadline, purpose] = f;
    if (!isChainIdShape(chain) || whole(amount) === null || !KEY64.test(beneficiary) || !/^\d+$/.test(deadline)) return null;
    return { kind: "lock", locker: signer, chain, amount: whole(amount), beneficiary, deadline: Number(deadline), purpose, at };
  }
  if (one("K") === KIND_REFUND && f.length === 2 && KEY64.test(f[0]) && whole(f[1]) !== null) {
    return { kind: "refund", locker: signer, lock: f[0], amount: whole(f[1]), at };
  }
  return null;
}

/** The node's answer to `RESOLVER_RECORD<TAB><text>`: `{ kind: "ok", cid }`, or `{ kind: "refused", code, failure,
 *  missing, remedy }`, or `{ kind: "error", raw }` for a line this file cannot read. */
export function parseRecordReply(reply) {
  const line = String(reply ?? "").trim().split("\n")[0];
  const f = line.split("\t");
  if (f[0] === "OK" && KEY64.test(f[1] ?? "")) return { kind: "ok", cid: f[1] };
  if (f[0] === "ERR" && f.length >= 3) {
    const reason = f.slice(2).join("\t");
    const m = /^(.*?)\. Missing: (.*?)\. To fix: (.*)$/s.exec(reason);
    return { kind: "refused", code: f[1], failure: m ? m[1] : reason, missing: m ? m[2] : "", remedy: m ? m[3] : "" };
  }
  return { kind: "error", raw: line };
}

/** `NATIVE_BALANCE defxn native-lock:<cid>`: the FXN a lock holds now, or null when the node does not answer. A lock
 *  whose locker lacked the FXN holds 0n. */
export async function lockHeld(send, lockCid) {
  const parts = String(await send(`NATIVE_BALANCE\t${BASE_CHAIN_ID}\t${lockHolder(lockCid)}`)).trim().split("\t");
  return parts[0] === "BALANCE" && /^\d+$/.test(parts[3] ?? "") ? BigInt(parts[3]) : null;
}

/** The locks `holderHex` made that still hold FXN, read from the node: its base-chain history (`NATIVE_HISTORY`, a
 *  lock is a `sent` row to `native-lock:<cid>`), each lock's record (`RESOLVER_RECORD_GET`, checked against its CID)
 *  and what it holds now (`lockHeld`). `filter(lock)` narrows them (by purpose, beneficiary). Each row carries
 *  `refundDue(nowSec)`. A lock whose record this node does not serve is left out: its deadline is unknown. */
export async function openLocks(send, holderHex, { filter = () => true, limit = 200 } = {}) {
  const lines = String(await send(`NATIVE_HISTORY\t${BASE_CHAIN_ID}\t${holderHex}\t${limit}`)).trim().split("\n");
  if (!lines[0]?.startsWith("NATIVE_HISTORY\t")) return null;
  const cids = new Set();
  for (const line of lines) {
    const [tag, , kind, counterparty] = line.split("\t");
    if (tag === "ROW" && kind === "sent" && /^native-lock:[0-9a-f]{64}$/.test(counterparty ?? "")) cids.add(counterparty.slice("native-lock:".length));
  }
  const out = [];
  for (const cid of cids) {
    const reply = String(await send(`RESOLVER_RECORD_GET\t${cid}`)).trim();
    if (!reply.startsWith("RESOLVER_RECORD_FOUND\t")) continue;
    const text = reply.split("\t").slice(2).join("\t");
    if ((await sha256Hex(text)) !== cid) continue;
    const lock = readNativeLock(text);
    if (!lock || lock.kind !== "lock" || lock.locker !== holderHex || !filter(lock)) continue;
    const held = await lockHeld(send, cid);
    if (held === null || held === 0n) continue;
    out.push({ cid, ...lock, held, refundDue: (nowSec) => nowSec >= lock.deadline });
  }
  return out;
}

/* =====================================================================
   YOUR FXN (defxn.com/account, Wallet tab): every key you hold, the genesis safes you sign for, and the spend
   from a safe to one of your keys.
   ---------------------------------------------------------------------
   Why (owner, 2026-10-29: "why can't i see my fxn balance inside defxn site?"): the Wallet tab read ONE key, the
   Public ID in use, so it said 0 while the mint had paid the genesis allocation into fxndao's safes. FXN reaches
   one of your keys only when the council approves a spend from an unlocked part of a safe.

   Nothing here re-implements dense-wire or the genesis page:
     - the plan read is js/genesis-safes.js's `parsePlan` (a verbatim copy of flux/genesis/js/genesis-safes.js);
     - the safe-spend bytes, payload and record are js/dense-wire/flx-dao-gov-builders.mjs's `safeSendCovered`,
       `safeSendPayload`, `govRecordBody` and `signGovRecord`, bound to the node's network by flx-builders.mjs's
       `networkCovered` (an approval signed on another network never counts);
     - the position, lock and send are flx-signing-guard.mjs's (devnet audit H4: one key, one position, one
       signature);
     - every signature goes through the wallet module's `reviewThen` (the site's one signing review).
   This module is handed that wallet module (`dw`), so the page and this file share one copy of it.

   Reads only what the chain answers: NATIVE_BALANCE per key, FXN_GENESIS_PLAN for the safes, NATIVE_HISTORY for
   the transfers, BUILD_INFO for the network, DECIMALS for how base units print. An unanswered read is `null` with its reason, never 0.

   A spend's approvals are carried by the record itself (KDAOSAFESEND1 `approve` boxes): the chain keeps no list of
   pending safe spends, so the approvals travel as lines, `<signer key> <signature>`, from signer to signer. The
   spend link carries the terms, so every signer approves the same bytes. Nothing is stored between visits. */
import { parsePlan } from "../genesis-safes.js";
import {
  KIND_SAFE_SEND, KIND_SAFE_CREATE, KIND_VESTED_SAFE_CREATE, KIND_SALE_SAFE_CREATE, KIND_VOTE_SAFE_CREATE,
  KIND_FUND_SAFE_CREATE, KIND_OPS_SAFE_CREATE,
  isHex64, isSig, bytesHex, safeSendCovered, safeSendPayload, govRecordBody, signGovRecord, parseApprovalLines,
} from "../dense-wire/flx-dao-gov-builders.mjs";
import { networkCovered } from "../dense-wire/flx-builders.mjs";
import { chainPosition, withKeyLock, submitAtPosition } from "../dense-wire/flx-signing-guard.mjs";
import { BASE_CHAIN_ID } from "../dense-wire/flx-dao-builders.mjs";
import { hexToBytes } from "../dense-wire/flx-crypto.mjs";
import { formatAmount, parseAmount, parseDecimalsReply } from "../dense-wire/flx-amount.mjs";

/** The DAO the mint named on the FXN devnet. A node whose mint named another DAO says which in its refusal, and the
 *  read follows it once (`readSafes`), so this is a first guess, never a second copy of the chain's answer. */
export const GENESIS_DAO = "fxndao";
/** The mining pool's keyless holder (dense-wire genesis_mint.rs: the pool the mint leaves on the base chain). */
const MINING_POOL = `compute-reserve:${BASE_CHAIN_ID}`;
const DAY = 86400;

/* ---- amounts ----------------------------------------------------------------------------------------------------
   Every amount the node sends is a count of base units. This module is the one place the account page turns base
   units into text and typed text into base units: dense-wire's flx-amount.mjs does the math (BigInt, never a float),
   with the decimals the node gives for the base chain (`DECIMALS defxn`, read once per node by `readDecimals`).
   Until that read answers, an amount shows as base units, named as such: decimals are never guessed. */
const decimalsByNode = new Map();
let current = { decimals: null, why: "the decimals are not read yet" };

/** Ask the node `DECIMALS defxn` once per node URL and use the answer for every amount on the page. -> `{ decimals }`
 *  or `{ decimals: null, why }`. Never throws. */
export async function readDecimals(wire) {
  const url = wire && wire.url ? wire.url : "";
  if (!decimalsByNode.has(url)) {
    decimalsByNode.set(url, (async () => {
      try {
        const got = parseDecimalsReply(await wire.sendLine(`DECIMALS\t${BASE_CHAIN_ID}`));
        if (got.refused) return { decimals: null, why: `${got.refused.failure}. Missing: ${got.refused.missing}. To fix: ${got.refused.remedy}` };
        return { decimals: got.decimals };
      } catch (error) {
        decimalsByNode.delete(url);
        return { decimals: null, why: `the node did not give FXN's decimals (${error && error.message ? error.message : "no answer"})` };
      }
    })());
  }
  current = await decimalsByNode.get(url);
  return current;
}

const big = (n) => (n === null || n === undefined ? null : typeof n === "bigint" ? n : BigInt(n));
/** Base units as text at the node's decimals ("1.5"), or the base-unit count while the decimals are not read. */
const fxn = (n) => (current.decimals === null ? big(n).toString() : formatAmount(big(n), current.decimals));
/** The unit `fxn` printed in: "FXN", or "base units" while the decimals are not read. */
export const fxnUnit = () => (current.decimals === null ? "base units" : "FXN");
/** An amount with its unit: "1.5 FXN". */
export const fxnText = (n) => `${fxn(n)} ${fxnUnit()}`;
/** A typed amount of FXN ("12.5") as base units (BigInt). Throws `{ failure, missing, remedy }` in its message. */
export function parseFxn(text) {
  if (current.decimals === null) throw new Error(`The amount cannot be read: ${current.why}. Missing: FXN's decimals from the node. To fix: press Refresh, or pick a network whose node answers DECIMALS.`);
  try {
    return parseAmount(String(text ?? "").trim(), current.decimals);
  } catch (error) {
    throw new Error(error.failure ? `The amount does not read: ${error.failure}. Missing: ${error.missing}. To fix: ${error.remedy}.` : error.message);
  }
}

const short = (k) => (k ? `${String(k).slice(0, 8)}…${String(k).slice(-6)}` : "");
const dateOf = (sec) => new Date(sec * 1000).toISOString().slice(0, 10);
const days = (secs) => Math.round(secs / DAY);

/* ---- your keys ------------------------------------------------------------------------------------------------ */

/** Every key the opened FXN ID holds, each with the signer that can sign for it now (null when this sign-in cannot):
 *  each Public ID, the wallets of the Public ID in use (only its wallets can sign: `walletSigner`), the other IDs'
 *  wallets (read-only here), and the genesis key the FXN ID makes from its Master ID. */
export function yourKeys(who) {
  const out = [];
  if (!who) return out;
  const current = who.publicId ? who.publicId.key : null;
  for (const id of who.publicIds || []) {
    out.push({ key: id.key, kind: "public-id", name: id.name + (id.label ? ` · ${id.label}` : ""), current: id.key === current,
      signer: () => (who.publicIdSigner ? who.publicIdSigner(id.key) : null) });
    for (const w of id.wallets || []) {
      out.push({ key: w.key, kind: "wallet", name: `${w.label || "Wallet"} of ${id.name}`, published: w.published != null,
        signer: id.key === current && who.walletSigner ? () => who.walletSigner(w.key) : null });
    }
  }
  if (who.genesisKeyHex) out.push({ key: who.genesisKeyHex, kind: "genesis", name: "Genesis key", signer: () => who.genesisSigner() });
  const seen = new Set();
  return out.filter((k) => isHex64(k.key) && !seen.has(k.key) && seen.add(k.key));
}

/** NATIVE_BALANCE for each key -> `{ rows: [{...key, balance: BigInt|null, why}], total: BigInt|null, unread }`.
 *  `total` is null when no key answered; `unread` counts the keys that did not. */
export async function readKeyBalances(wire, keys) {
  const rows = [];
  for (const k of keys) {
    try {
      const amount = await wire.balance(k.key);
      rows.push({ ...k, balance: amount, why: amount === null ? "this network has no FXN ledger" : "" });
    } catch (error) {
      rows.push({ ...k, balance: null, why: error && error.message ? error.message : "no answer" });
    }
  }
  const read = rows.filter((r) => r.balance !== null);
  return { rows, total: read.length ? read.reduce((sum, r) => sum + r.balance, 0n) : null, unread: rows.length - read.length };
}

/* ---- the safes -------------------------------------------------------------------------------------------------- */

/** How a safe's FXN can leave it, by its kind (dense-wire src/dao_treasury.rs, GovAction::SafeSend and the ruled-safe
 *  refusals). Only `council` is a spend its signers make alone. */
const PATH = {
  [KIND_VESTED_SAFE_CREATE]: { path: "council", how: "The council approves each spend of what has unlocked." },
  [KIND_SAFE_CREATE]: { path: "council", how: "The council approves each spend." },
  [KIND_SALE_SAFE_CREATE]: { path: "sale", how: "Sells FXN in the public sale. No signer moves it." },
  [KIND_VOTE_SAFE_CREATE]: { path: "vote", how: "Each spend needs a holder vote." },
  [KIND_FUND_SAFE_CREATE]: { path: "vote", how: "Each spend needs a holder vote, with a cap per receiving key." },
  [KIND_OPS_SAFE_CREATE]: { path: "budget", how: "Spends only inside budgets that holders approved." },
};

/** The unix second tranche `k` (1-based) unlocks: start + cliff + interval x (k - 1) (dense-wire
 *  creator_economy.rs `tranche_unlocks_at`). */
function unlocksAt(start, s, k) { return start + s.cliff + s.interval * (k - 1); }

/** One planned safe as the account shows it. Every number is the plan's (FXN_GENESIS_PLAN), or null with no guess. */
export function safeView(plan, s, nowSec, mine) {
  const path = PATH[s.kind] || { path: "unknown", how: `A ${s.kind} safe. This page does not know how it spends.` };
  const start = plan.head.start;
  const scheduled = s.tranches !== null && s.interval !== null && s.cliff !== null && start !== null;
  let next = null;
  if (scheduled) for (let k = 1; k <= s.tranches; k++) { const at = unlocksAt(start, s, k); if (at > nowSec) { next = at; break; } }
  const schedule = !scheduled ? null
    : s.tranches === 1 ? (s.cliff ? `All at once after ${days(s.cliff)} days` : "All of it from the start")
      : `${s.cliff ? `Waits ${days(s.cliff)} days, then ` : ""}1/${s.tranches} every ${days(s.interval)} days`;
  // the part vested at the mint itself (PLAN_SAFE's `upfront` column, owner ruling 2026-10-29); the schedule runs on the rest
  const upfront = big(s.upfront) || 0n;
  const scheduleText = schedule && upfront > 0n ? `${fxnText(upfront)} at the mint. ${schedule} for the rest` : schedule;
  // base units are BigInt: at 9 decimals a safe's amount is far past a Number's exact range
  const atLeast0 = (v) => (v < 0n ? 0n : v);
  const unlocked = s.vestedNow !== null && s.moved !== null ? atLeast0(big(s.vestedNow) - big(s.moved)) : null;
  return {
    label: s.label, address: s.address, kind: s.kind, path: path.path, how: path.how,
    amount: big(s.amount), balance: big(s.balance), created: s.createdAt !== null,
    unlocked, stillLocked: s.vestedNow !== null ? atLeast0(big(s.amount) - big(s.vestedNow)) : null,
    next, schedule: scheduleText, upfront, threshold: plan.head.threshold, signers: plan.head.signers, mine,
  };
}

/** The network the node names (BUILD_INFO's fifth field), or null. The same read as flux/genesis/js/genesis-readback.js
 *  `networkOfBuildInfo`: approvals are bound to it. */
export async function readNetwork(wire) {
  const fields = String(await wire.sendLine("BUILD_INFO\t")).trim().split("\t");
  return fields[0] === "BUILD_INFO" && /^fxn-[a-z0-9-]+$/.test(fields[4] || "") ? fields[4] : null;
}

/** The genesis safes and the keyless holders, for the keys `mine` (hex). -> `{ kind: "ok", daoId, plan, safes, held,
 *  signed, total, network }` or `{ kind: "refused" | "unavailable", why }`. `signed` are the safes one of your keys
 *  signs for; `total` their balance (null when the node left a balance out). */
export async function readSafes(wire, mine, nowSec = Math.floor(Date.now() / 1000)) {
  let daoId = GENESIS_DAO;
  let plan = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      plan = parsePlan(await wire.sendLine(`FXN_GENESIS_PLAN\t${daoId}\t-\t-`));
    } catch (error) {
      return { kind: "unavailable", why: `The node did not answer the safes read (${error && error.message ? error.message : "no answer"})` };
    }
    // The node names the DAO its mint used in its own refusal ("the DAO the mint named: <id>"): follow it once.
    const named = plan.kind === "refused" && /the DAO the mint named: ([a-z0-9]{3,32})$/.exec(plan.missing || "");
    if (!named || named[1] === daoId) break;
    daoId = named[1];
  }
  if (plan.kind !== "ok") return plan;
  const network = await readNetwork(wire).catch(() => null);
  const mineSet = new Set(mine);
  const onCouncil = plan.head.signers.filter((k) => mineSet.has(k));
  const safes = plan.safes.map((s) => safeView(plan, s, nowSec, onCouncil));
  const signed = onCouncil.length ? safes : [];
  const known = signed.filter((s) => s.balance !== null);
  let pool = null;
  try { pool = await wire.balance(MINING_POOL); } catch { pool = null; }
  const held = [{ label: "mining pool", balance: pool, how: "Only mining payouts move it. No key signs for it." }]
    .concat((plan.rules || []).map((r) => ({ label: r.label, balance: r.balance, how: "Held by its rule. No key or vote moves it." })));
  return {
    kind: "ok", daoId: plan.head.daoId, plan, safes, held, signed, onCouncil, network,
    total: known.length ? known.reduce((sum, s) => sum + BigInt(s.balance), 0n) : null,
    unlockedTotal: signed.some((s) => s.path === "council" && s.unlocked !== null)
      ? signed.filter((s) => s.path === "council" && s.unlocked !== null).reduce((sum, s) => sum + BigInt(s.unlocked), 0n) : null,
  };
}

/* ---- history ---------------------------------------------------------------------------------------------------- */

/** NATIVE_HISTORY for each key, merged newest first: `{ rows: [{ at, kind, counterparty, amount, reference, key,
 *  keyName }], unread }`. `at` is unix milliseconds. A key the node did not answer for is counted, not shown as empty. */
export async function readHistory(wire, keys, limit = 50) {
  const rows = [];
  let unread = 0;
  for (const k of keys) {
    try {
      const got = await wire.history(k.key, limit);
      if (got === null) { unread += 1; continue; }
      for (const r of got) rows.push({ ...r, key: k.key, keyName: k.name });
    } catch { unread += 1; }
  }
  rows.sort((a, b) => b.at - a.at);
  return { rows, unread };
}

/** One history row in words: what moved, to or from whom, on which of your keys. */
export function describeTransfer(row, keyNames) {
  const other = keyNames.get(row.counterparty);
  const who = other ? other : /^native-lock:/.test(row.counterparty) ? "a sale hold" : short(row.counterparty);
  const verb = { received: "Received", sent: "Sent", mint: "Minted", credit: "Credited" }[row.kind] || row.kind;
  const dir = row.kind === "sent" ? `to ${who}` : row.kind === "received" ? `from ${who}` : "";
  return { title: `${verb} ${fxnText(row.amount)} ${dir}`.trim(), meta: `${row.keyName} · ${new Date(row.at).toISOString().slice(0, 16).replace("T", " ")} UTC` };
}

/* ---- a spend from a safe ---------------------------------------------------------------------------------------- */

/** The terms every approval covers, as the spend link carries them: `<label>.<to>.<amount>.<at ms>`. */
export function encodeSpend(t) { return [t.label, t.to, String(t.amount), String(t.atMs)].join("."); }
export function decodeSpend(text) {
  const p = String(text || "").split(".");
  if (p.length !== 4 || !/^[a-z0-9]{3,32}$/.test(p[0]) || !isHex64(p[1]) || !/^[1-9][0-9]*$/.test(p[2]) || !/^[1-9][0-9]*$/.test(p[3])) return null;
  return { label: p[0], to: p[1], amount: p[2], atMs: Number(p[3]) };
}

/** Refuses, in the chain's terms, a spend the chain would refuse (dense-wire GovAction::SafeSend), before anything is
 *  signed. Returns null, or `{ failure, missing, remedy }`. */
export function spendRefusal(safes, terms) {
  const safe = safes.safes.find((s) => s.label === terms.label);
  if (!safe) return { failure: `The safe ${terms.label} is not in the ${safes.daoId} plan.`, missing: "one of the plan's safes", remedy: "open the spend from the Safes list" };
  if (safe.path !== "council") return { failure: `The ${safe.label} safe does not spend by council approval. ${safe.how}`, missing: "a safe the council spends (creator or cofounder)", remedy: "spend from a vested safe" };
  if (!safe.created) return { failure: `The ${safe.label} safe has no create record yet, so the chain does not know it.`, missing: "the safe's create record", remedy: "create the safes on the Genesis page's Safes step first" };
  if (!safes.onCouncil.length) return { failure: `None of your keys is on the ${safes.daoId} council.`, missing: "a council key, your genesis key", remedy: "sign in with the FXN ID whose genesis key is on the council" };
  if (!isHex64(terms.to)) return { failure: "The receiving key is not a public key.", missing: "64 lowercase hex characters", remedy: "pick one of your keys" };
  if (terms.to === safe.address) return { failure: "The receiving key is the safe itself.", missing: "another key", remedy: "pick one of your keys" };
  let amount;
  try { amount = BigInt(terms.amount); } catch { amount = 0n; }
  if (amount <= 0n) return { failure: "The amount is not above 0.", missing: "an amount of FXN above 0", remedy: "enter the amount again" };
  if (safe.unlocked === null) return { failure: `The node did not say how much of ${safe.label} has unlocked.`, missing: "the safe's unlocked amount", remedy: "refresh, or switch to a node that answers the plan in full" };
  if (amount > BigInt(safe.unlocked)) {
    const wait = safe.next ? `wait for the next part on ${dateOf(safe.next)}` : "wait for the council to approve less";
    return { failure: safe.unlocked ? `Only ${fxnText(safe.unlocked)} of ${safe.label} is unlocked now.` : `Nothing in ${safe.label} is unlocked yet.`,
      missing: `${fxnText(amount - BigInt(safe.unlocked))} more unlocked`, remedy: safe.unlocked ? `spend ${fxnText(safe.unlocked)} or less, or ${wait}` : wait };
  }
  return null;
}

/** The exact bytes each council signer signs for `terms`: safeSendCovered, bound to the node's network. */
function spendBytes(safes, terms) {
  const safe = safes.safes.find((s) => s.label === terms.label);
  return networkCovered(safes.network || undefined, safeSendCovered(safes.daoId, safe.address, BASE_CHAIN_ID, terms.to, terms.amount, terms.atMs));
}

/** The pasted approval lines checked against the bytes the chain checks: `{ good: Map(key -> sig), bad: [why] }`.
 *  A line from a key off the council, or a signature that does not verify, is named. Ed25519 is WebCrypto's. */
export async function checkApprovals(safes, terms, text) {
  const { approvals, bad: unreadable } = parseApprovalLines(text);
  const bad = unreadable.map((line) => `"${line}…" is not "<signer key> <signature>"`);
  const good = new Map();
  const bytes = spendBytes(safes, terms);
  for (const [key, sig] of approvals) {
    if (!safes.plan.head.signers.includes(key)) { bad.push(`${short(key)} is not on the ${safes.daoId} council`); continue; }
    if (good.has(key)) continue;
    let ok = false;
    try {
      const k = await crypto.subtle.importKey("raw", hexToBytes(key), { name: "Ed25519" }, false, ["verify"]);
      ok = await crypto.subtle.verify({ name: "Ed25519" }, k, hexToBytes(sig), bytes);
    } catch { ok = false; }
    if (ok) good.set(key, sig); else bad.push(`${short(key)}'s signature does not cover these terms`);
  }
  return { good, bad };
}

function spendFacts(safes, terms, signer) {
  const safe = safes.safes.find((s) => s.label === terms.label);
  return [
    { label: "Signing key", value: `${signer.keyName || "This key"}, ${signer.pubHex}. Your FXN ID makes it from its Master ID. The Master ID itself signs nothing.` },
    { label: "DAO", value: safes.daoId }, { label: "Safe", value: `${safe.label}, ${safe.address}` },
    { label: "Amount", value: `${fxnText(terms.amount)} (${terms.amount} base units)` }, { label: "To", value: terms.to },
    { label: "Terms time", value: new Date(terms.atMs).toISOString() }, { label: "Network", value: safes.network || "devnet (the node names none)" },
  ];
}

/** Your approval as a council signer, after the full review of the exact bytes. -> the line `<key> <signature>`. */
export async function approveSpend(dw, { who, wire, safes, terms }) {
  const why = spendRefusal(safes, terms);
  if (why) throw new Error(`${why.failure} Missing: ${why.missing}. To fix: ${why.remedy}.`);
  const signer = who.genesisSigner();
  if (!safes.plan.head.signers.includes(signer.pubHex)) throw new Error(`Your genesis key ${short(signer.pubHex)} is not on the ${safes.daoId} council. Missing: a council key. To fix: sign in with the FXN ID whose genesis key is on the council.`);
  const bytes = spendBytes(safes, terms);
  const safe = safes.safes.find((s) => s.label === terms.label);
  return dw.reviewThen({
    who, pubHex: signer.pubHex, wireUrl: wire.url,
    title: `Approve: ${fxnText(terms.amount)} from the ${safe.label} safe`,
    description: `This is your approval as a council signer. It authorizes only this spend. The spend needs ${safe.threshold} of ${safe.signers.length} council approvals before anyone can send it.`,
    claims: [`evidence safe ${safe.address}`, `evidence recipient ${terms.to}`, `evidence amount ${terms.amount} base units`, `evidence at ${terms.atMs}`],
    manifest: { schema: "dense-wire.dao-safe-send-vote/1", daoId: safes.daoId, safe: safe.address, chainId: BASE_CHAIN_ID, to: terms.to, amount: String(terms.amount), atMs: terms.atMs, network: safes.network || null },
    facts: spendFacts(safes, terms, signer), unsigned: bytesHex(bytes),
    action: "dao.safe.send.approve", scope: "dao.safe.send", authority: `dao:${safes.daoId} council, ${safe.threshold} of ${safe.signers.length}`,
    configuration: "dense-wire daogov grammar · FLX-DAO-SAFE-SEND-VOTE-V1", denies: "scope does not authorize any other safe, amount, recipient, time or network",
    run: async () => `${signer.pubHex} ${await signer.signBytes(bytes)}`,
  });
}

/** Sends the KDAOSAFESEND1 record carrying the approvals, signed by your genesis key at its chain head, after the full
 *  review of the record. -> `{ cid }`; throws the node's refusal in its words, with nothing else sent. */
export async function submitSpend(dw, { who, wire, safes, terms, approvals }) {
  const why = spendRefusal(safes, terms);
  if (why) throw new Error(`${why.failure} Missing: ${why.missing}. To fix: ${why.remedy}.`);
  const safe = safes.safes.find((s) => s.label === terms.label);
  if (approvals.size < safe.threshold) throw new Error(`The spend has ${approvals.size} of ${safe.threshold} council approvals. Missing: ${safe.threshold - approvals.size} more. To fix: send the spend link to the other council signers and paste their lines.`);
  const signer = who.genesisSigner();
  const payload = safeSendPayload({ daoId: safes.daoId, safe: safe.address, chainId: BASE_CHAIN_ID, to: terms.to, amount: terms.amount, atMs: terms.atMs, approvals: [...approvals.entries()] });
  const reply = await withKeyLock(signer.pubHex, async () => {
    const at = await chainPosition(wire, signer.pubHex);
    const body = govRecordBody({ pubHex: signer.pubHex, pos: at.pos, prevCid: at.prevCid, kind: KIND_SAFE_SEND, payload, nowSec: Math.floor(Date.now() / 1000) });
    const text = await dw.reviewThen({
      who, pubHex: signer.pubHex, wireUrl: wire.url,
      title: `Send ${fxnText(terms.amount)} from the ${safe.label} safe`,
      description: `This sends the spend to the network with ${approvals.size} council approvals inline. The chain checks each approval and the unlocked amount.`,
      claims: [`evidence safe ${safe.address}`, `evidence recipient ${terms.to}`, `evidence amount ${terms.amount} base units`, `evidence approvals ${approvals.size}`],
      manifest: { schema: "dense-wire.dao-safe-send/1", daoId: safes.daoId, safe: safe.address, to: terms.to, amount: String(terms.amount), atMs: terms.atMs, approvals: approvals.size, position: at.pos },
      facts: spendFacts(safes, terms, signer).concat([{ label: "Approvals", value: `${approvals.size} of ${safe.threshold} needed` }]), unsigned: body,
      action: "dao.safe.send.submit", scope: "dao.safe.send", authority: `dao:${safes.daoId} council, ${safe.threshold} of ${safe.signers.length}`,
      configuration: "dense-wire daogov grammar · KDAOSAFESEND1", denies: "scope does not authorize any other safe, amount, recipient or record",
      run: () => signGovRecord(signer, body),
    });
    return submitAtPosition(wire, { pubHex: signer.pubHex, at, kind: "RESOLVER_RECORD", text });
  });
  if (!reply || reply.kind !== "ok") throw new Error(`The node refused the spend: ${(reply && (reply.reason || reply.code || reply.raw)) || "no reason given"}. Nothing moved.`);
  return { cid: reply.cid };
}

export { isSig, fxn, short, dateOf };

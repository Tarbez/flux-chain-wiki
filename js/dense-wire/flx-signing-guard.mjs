// One key, one position, one signature: the guard every page uses around read-HEAD, review, sign and submit.
//
// Why (devnet audit H4, 2026-10-24): the chain treats a second, different record at a (key, position) it already
// holds as equivocation and freezes that key from that position on every node, for good. Pages met that rule
// three ways, each of which could freeze the genesis key:
//   (a) a timeout re-signed a NEW record (new M) at the same position instead of resending the signed bytes;
//   (b) the position was read, then a review stayed open without limit, and a second tab, device or tool
//       signed the same position meanwhile (nothing serialised signing under one key);
//   (c) a HEAD that could not be read was taken as position 0, which the genesis key already holds.
// This module is the one fix for all of them:
//   chainPosition    HEAD as { pos, prevCid }, or a refusal: an unreadable head is never position 0.
//   withKeyLock      one signer per key at a time across tabs (Web Locks), within a page otherwise.
//   submitAtPosition re-reads HEAD just before sending and refuses if the position moved (nothing is sent),
//                    resends the SAME signed bytes once on a timeout (a node admits an identical resend), and
//                    names equivocation and chain breaks with the node's own words.
//   nodeNetwork      the network the node names (BUILD_INFO's fifth field), or null (round 7, nodeuse).
//   submitAtPosition with `network`, the network the record was built for, refuses by name before sending when the
//                    node names another network, or none (`signingNetworkRefusal` in flx-builders.mjs, the one rule;
//                    the wallet's review asks it too, before the holder approves). Round 10: `network` is required;
//                    NOT_NETWORK_BOUND says a record is bound to none, and a missing one is refused (NETWORK_UNNAMED).
//   sendGuarded      a record signed elsewhere (a prepared batch) sent through the same network check (round 10).
//   admittedCid      round 12 (flooder ZD3-1): the CID a page chains on is sha256(signed text), computed here. A node's
//                    answered CID that differs is refused by name (CID_MISMATCH) and nothing further is signed.
//                    Before this, three doors set prev = reply.cid: a lying node (a DNS hijack, a ?ws= link, one bad
//                    fleet node) answered a fake CID, the page signed the next position citing it, and the node kept
//                    that signed record to publish after the honest one landed. Two signed records at one position
//                    is equivocation, and the key froze for good.
//   holdSigned       round 12 (ZD3-1, second half): bytes that left this page for (network, key, chain, position) are
//                    held, and only those exact bytes are ever sent again at that position. A different record there,
//                    or a record below the held position, is refused (HELD_OTHER_RECORD, HEAD_BEHIND_SIGNED). Until
//                    round 12 only a timeout resent identical bytes; any "refused" reply let the page sign the same
//                    position with a new M, and a node that withheld the first could freeze the key with it.
//   releaseHeld      drops a hold only when a SECOND node's HEAD shows the held position filled.
// Callers that chain on a reply (round 12 list): submitAtPosition here (every door that uses it: genesis
// genesis-distribute.js, genesis-dao.js, genesis-release.js, genesis-network.js, genesis-dao-records.js, genesis-app.js
// mint; defxn-dao fxn-dao-app.mjs; deploy post-launch-flow.mjs; defxn fxn-holdings.mjs), genesis-authorization.js's
// treasury batch and genesis-app.js's single transfer (sendGuarded with a hold, then admittedCid), and
// flx-resolver-record-client.mjs nextWrite. test/signing-guard-cid.test.mjs finds any other `prev = reply.cid` in web/.
// Pure and browser-first (Node-compatible): no node: imports.
import { GENESIS_PREV, NOT_NETWORK_BOUND, networkRoot, signingNetworkRefusal } from "./flx-builders.mjs";
import { sha256Hex } from "./flx-crypto.mjs";
export { NOT_NETWORK_BOUND };

export class SigningGuardRefusal extends Error {
  constructor(code, failure, missing, remedy) {
    super(`${failure} Missing: ${missing} To fix: ${remedy}`);
    this.name = "SigningGuardRefusal";
    Object.assign(this, { code, failure, missing, remedy });
  }
}

/** The key's next position and previous record, read from the node. Throws when the node does not say. `chain`: a
 *  launched chain the record will name (growth loop build 4: a key keeps one list per launched chain); omit it for
 *  the key's base list. */
export async function chainPosition(wire, pubHex, chain) {
  const head = await wire.chainHead(pubHex, chain);
  if (head?.kind === "head" && Number.isSafeInteger(head.length) && /^[0-9a-f]{64}$/.test(head.headCid || "")) {
    return { pos: head.length, prevCid: head.headCid };
  }
  if (head?.kind === "none") return { pos: 0, prevCid: await firstRoot(wire) };
  throw new SigningGuardRefusal(
    "POSITION_UNREADABLE",
    `The node did not say where this key's chain ends (${head?.raw ?? head?.reason ?? "no answer"}).`,
    "a HEAD or HEAD_NONE answer for the signing key.",
    "try again, or ask another node. Nothing was signed: a position that cannot be read is never taken as 0.",
  );
}

/** What a key's first record cites in C[0] (owner, 2026-10-25, `chain::network_root`): the root of the network the
 *  node runs, from BUILD_INFO's fifth field. Until 2026-10-31 this was the devnet's sentinel for every network, so a
 *  founding on another network (release 1, the genesis key's record 0) read here as a moved chain and on the node as
 *  WrongNetwork. A node that names no network (built before the network id) keeps the sentinel: it judges by it. */
async function firstRoot(wire) {
  const network = await nodeNetwork(wire);
  return network ? networkRoot(network) : GENESIS_PREV;
}

/** The network the node names (BUILD_INFO's fifth field), or `null` when it names none or does not answer. One read
 *  for the first record's root, the review's network line and the network check before sending. Takes a WireClient
 *  (`send`) or a wallet wire that only has `sendLine` (defxn.com/account's WalletWire). */
export async function nodeNetwork(wire) {
  const ask = typeof wire?.send === "function" ? wire.send("BUILD_INFO\t") : wire.sendLine("BUILD_INFO\t");
  const fields = String(await ask).trim().split("\t");
  return fields[0] === "BUILD_INFO" && /^fxn-[a-z0-9-]+$/.test(fields[4] ?? "") ? fields[4] : null;
}

/** Round 7, nodeuse: throws `NETWORK_MISMATCH` when a record built for `network` must not go to this node (another
 *  network, or none named). Round 10 (fresh audit CNN-5): `network` is required. `NOT_NETWORK_BOUND` (flx-builders.mjs)
 *  says the record is bound to none; `undefined` is a caller that forgot, refused as `NETWORK_UNNAMED` before anything is
 *  sent. Until round 10 `undefined` skipped the check, so every caller that left it out was silently unchecked. */
export async function refuseOtherNetwork(wire, network) {
  if (network === NOT_NETWORK_BOUND) return null;
  if (network === undefined) {
    const why = signingNetworkRefusal(undefined, null);
    throw new SigningGuardRefusal("NETWORK_UNNAMED", why.failure, why.missing, why.remedy);
  }
  const node = await nodeNetwork(wire);
  const why = signingNetworkRefusal(network, node);
  if (why) throw new SigningGuardRefusal("NETWORK_MISMATCH", why.failure, why.missing, why.remedy);
  return node;
}

const pageLocks = new Map();

/** Runs `fn` while holding the one signing lock for `pubHex`: across tabs with Web Locks, within this page otherwise. */
export async function withKeyLock(pubHex, fn) {
  const name = `flx-signing:${pubHex}`;
  const locks = globalThis.navigator?.locks;
  if (locks?.request) return locks.request(name, { mode: "exclusive" }, () => fn());
  const before = pageLocks.get(name) ?? Promise.resolve();
  let release;
  const mine = new Promise((resolve) => { release = resolve; });
  const chained = before.then(() => mine);
  pageLocks.set(name, chained);
  await before;
  try {
    return await fn();
  } finally {
    release();
    if (pageLocks.get(name) === chained) pageLocks.delete(name);
  }
}

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error(`no answer in ${ms} ms`), { timeout: true })), ms); }),
  ]).finally(() => clearTimeout(timer));
}

/**
 * Sends `text`, signed at `at` ({ pos, prevCid }) by `pubHex`, as `kind`. Before sending, HEAD is read again:
 * a position that moved since `at` is refused and nothing is sent (sign again at the new position). On a timeout
 * the same bytes are sent once more. A node's equivocation or chain-break answer is refused with its words.
 * Returns the node's reply ({ kind: "ok", ... } or its refusal). `network` (round 7, nodeuse): the network the record
 * was built for; the node is asked its network again just before sending, and another network, or none, is refused
 * by name with nothing sent (a wallet's network switch between review and send).
 */
export async function submitAtPosition(wire, { pubHex, at, kind, text, chain, network, timeoutMs = 15000 }) {
  await refuseOtherNetwork(wire, network);
  const now = await chainPosition(wire, pubHex, chain);
  if (now.pos !== at.pos || now.prevCid !== at.prevCid) {
    throw new SigningGuardRefusal(
      "POSITION_MOVED",
      `This key's chain moved while the record was being reviewed (signed for position ${at.pos}, the chain is at ${now.pos}).`,
      `a record signed at position ${now.pos}.`,
      "review and sign again. Nothing was sent, so the key is safe.",
    );
  }
  holdSigned({ network, pubHex, chain, pos: at.pos, text });
  let reply;
  try {
    reply = await withTimeout(wire.submit(kind, text), timeoutMs);
  } catch (error) {
    if (!error?.timeout) throw error;
    // The same signed bytes, never a new record: an identical resend is admitted idempotently.
    reply = await withTimeout(wire.submit(kind, text), timeoutMs);
  }
  const words = `${reply?.code ?? ""} ${reply?.reason ?? reply?.raw ?? ""}`;
  if (reply?.kind !== "ok" && /equivocat|chain[- ]break|frozen/i.test(words)) {
    throw new SigningGuardRefusal(
      "KEY_FROZEN",
      `The node refused the record as ${words.trim()}.`,
      "a key that has not signed two different records at one position.",
      "stop signing with this key. Read the node's answer above; the chain keeps the evidence.",
    );
  }
  if (reply?.kind === "ok") return { ...reply, cid: await admittedCid(reply, text) };
  return reply;
}

/** Round 10 (fresh audit CNN-5): sends one already-signed line through the network check, for a page that sends a
 *  record it did not sign here (a prepared batch: the genesis treasury lines). Asks the node its network just before
 *  sending, and refuses another network, none, or a missing `network` by name with nothing sent. `send(line)` is the
 *  page's raw sender. */
export async function sendGuarded(wire, network, line, send = (l) => wire.send(l), held = null) {
  await refuseOtherNetwork(wire, network);
  // Round 12 (ZD3-1): a caller that knows the record's place passes `held` ({ pubHex, chain, pos, text }), and the
  // bytes are held before they leave the page, as submitAtPosition does.
  if (held) holdSigned({ network, ...held });
  return send(line);
}

/** Round 12 (flooder ZD3-1): the CID to chain on after an ok reply: sha256 of the signed text, computed here, the CID
 *  the chain itself gives the record (`incoming_cid = sha256_hex(text)`). A node that answers another CID is lying or
 *  broken, and the next record must not cite its answer: refused by name, and the caller signs nothing further. */
export async function admittedCid(reply, text) {
  const mine = await sha256Hex(text);
  if (reply?.cid !== mine) {
    throw new SigningGuardRefusal(
      "CID_MISMATCH",
      `The node answered CID ${String(reply?.cid ?? "(none)").slice(0, 16)}… for a record whose bytes hash to ${mine.slice(0, 16)}….`,
      "a node that answers the CID of the record it was sent.",
      "stop and ask another node for this key's HEAD before signing again. Nothing further was signed; the node may be lying, so do not use it.",
    );
  }
  return mine;
}

// The signed-bytes hold (round 12, ZD3-1). One entry per (network, key, chain): the highest position this page sent
// bytes for, and those bytes. Kept in the origin's localStorage as plain text ("<pos>\n<text>"; a signed record is one
// line), or in memory where there is none (Node). The bytes are public once sent, so holding them reveals nothing.
const memoryHolds = new Map();
let holdStore = null;
function defaultHoldStore() {
  const ls = globalThis.localStorage;
  if (ls && typeof ls.getItem === "function") return { get: (k) => ls.getItem(k), set: (k, v) => ls.setItem(k, v), delete: (k) => ls.removeItem(k) };
  return { get: (k) => memoryHolds.get(k) ?? null, set: (k, v) => { memoryHolds.set(k, v); }, delete: (k) => { memoryHolds.delete(k); } };
}
/** Replaces where holds are kept (a test passes a fresh Map-backed store). Returns the previous store. */
export function useHoldStore(store) {
  const before = holdStore;
  holdStore = store;
  return before;
}
function holds() { return holdStore ?? (holdStore = defaultHoldStore()); }
function holdKey({ network, pubHex, chain }) {
  const net = typeof network === "string" ? network : "unbound";
  return `flx-held:${net}:${pubHex}:${chain || "base"}`;
}

/** The bytes this page holds for the key's chain: `{ pos, text }`, or null. */
export function heldAt({ network, pubHex, chain }) {
  const raw = holds().get(holdKey({ network, pubHex, chain }));
  if (typeof raw !== "string") return null;
  const cut = raw.indexOf("\n");
  const pos = Number(raw.slice(0, cut));
  return cut > 0 && Number.isSafeInteger(pos) ? { pos, text: raw.slice(cut + 1) } : null;
}

/** Holds `text` as the bytes sent at `pos`, or refuses before anything is sent: a different record at a held position
 *  (HELD_OTHER_RECORD), or any record below it (HEAD_BEHIND_SIGNED: a node whose HEAD is behind what this key already
 *  signed is lagging or lying, and a record there would be the second one). The same bytes again are always allowed. */
export function holdSigned({ network, pubHex, chain, pos, text }) {
  const held = heldAt({ network, pubHex, chain });
  if (held && pos < held.pos) {
    throw new SigningGuardRefusal(
      "HEAD_BEHIND_SIGNED",
      `The node says this key's next position is ${pos}, and this page already sent a signed record at position ${held.pos}.`,
      `a node whose HEAD shows position ${held.pos} filled.`,
      "ask another node for this key's HEAD. Nothing was sent. If this network was started again from genesis, clear this site's stored data first.",
    );
  }
  if (held && pos === held.pos && text !== held.text) {
    throw new SigningGuardRefusal(
      "HELD_OTHER_RECORD",
      `This page already sent a different signed record at position ${pos} for this key, and no second node shows it filled.`,
      `the record sent before (resend it with the same bytes), or a second node's HEAD past position ${pos}.`,
      "resend the held record, or run releaseHeld against another node once it shows the position filled. Nothing was sent: a second record at one position would freeze the key.",
    );
  }
  holds().set(holdKey({ network, pubHex, chain }), `${pos}\n${text}`);
}

/** Drops the hold once a SECOND node (`witness`, not the node that took the bytes) shows the held position filled.
 *  Refuses by name otherwise, and the hold stays. Returns true when dropped, false when nothing was held. */
export async function releaseHeld(witness, { network, pubHex, chain }) {
  const held = heldAt({ network, pubHex, chain });
  if (!held) return false;
  const now = await chainPosition(witness, pubHex, chain);
  if (now.pos <= held.pos) {
    throw new SigningGuardRefusal(
      "HELD_NOT_FILLED",
      `The second node says this key's next position is ${now.pos}; the held record is at ${held.pos}.`,
      `a second node whose HEAD is past position ${held.pos}.`,
      "resend the held record, or ask another node. The hold stays, so no second record is signed there.",
    );
  }
  holds().delete(holdKey({ network, pubHex, chain }));
  return true;
}

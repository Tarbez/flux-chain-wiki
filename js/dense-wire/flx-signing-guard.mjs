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
// Pure and browser-first (Node-compatible): no node: imports.
import { GENESIS_PREV } from "./flx-builders.mjs";

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
  if (head?.kind === "none") return { pos: 0, prevCid: GENESIS_PREV };
  throw new SigningGuardRefusal(
    "POSITION_UNREADABLE",
    `The node did not say where this key's chain ends (${head?.raw ?? head?.reason ?? "no answer"}).`,
    "a HEAD or HEAD_NONE answer for the signing key.",
    "try again, or ask another node. Nothing was signed: a position that cannot be read is never taken as 0.",
  );
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
 * Returns the node's reply ({ kind: "ok", ... } or its refusal).
 */
export async function submitAtPosition(wire, { pubHex, at, kind, text, chain, timeoutMs = 15000 }) {
  const now = await chainPosition(wire, pubHex, chain);
  if (now.pos !== at.pos || now.prevCid !== at.prevCid) {
    throw new SigningGuardRefusal(
      "POSITION_MOVED",
      `This key's chain moved while the record was being reviewed (signed for position ${at.pos}, the chain is at ${now.pos}).`,
      `a record signed at position ${now.pos}.`,
      "review and sign again. Nothing was sent, so the key is safe.",
    );
  }
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
  return reply;
}

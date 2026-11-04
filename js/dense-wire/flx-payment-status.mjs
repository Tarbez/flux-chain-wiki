// Payment status for wallets (zero points of failure, Z3; owner rule 2026-10-27: a receiver waits until the chain's
// lead nodes confirm a payment). One node alone takes a payment at once and replies "1 copy", so a payment is not
// final when the node says OK. It is final when K of its chain's lead nodes have certified it: `CONFIRMED` on the
// wire (`chain_server.rs`, `confirmed_reply`), and the chain has at least `FINAL_MIN_LEADS` leads (owner ruling
// 2026-10-31). A wallet shows a payment as waiting until then, and always shows the count.
//
// Which list a record is on mirrors `chain::lane_chain`: a record with an `N` box is on its signer's base list; else
// its `W` box, then its `C[1]`, when either names a launched chain (hex of UTF-8, `\0`-padded).

import { launchedChainWord } from "./flx-builders.mjs";

function utf8OfHex(hex) {
  if (!/^(?:[0-9a-f]{2})*$/.test(hex)) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(2 * i, 2 * i + 2), 16);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** The list a signed record is on: `{ holder, chain, position }`, `chain` null for the base list. */
export function listOfRecord(text) {
  const boxes = String(text).split("-");
  const one = (label) => boxes.find((b) => b[0] === label)?.slice(1);
  const cs = boxes.filter((b) => b[0] === "C").map((b) => b.slice(1));
  const launched = (hex) => {
    const id = hex == null ? null : utf8OfHex(hex)?.replace(/\0+$/, "");
    return id && launchedChainWord(id) ? id : null;
  };
  const chain = one("N") !== undefined ? null : launched(one("W")) ?? launched(cs[1]);
  return { holder: one("G"), chain, position: Number(one("J")) };
}

async function sha256Hex(text) {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  return Array.from(d, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Ask the node whether a signed payment is final: `{ kind: "confirmed" | "conflict" | "waiting" | "error", ... }`.
 *  Asked for this exact record (its sha256), never for its position alone. */
export async function paymentStatus(wire, recordText) {
  const { holder, chain, position } = listOfRecord(recordText);
  return paymentStatusAt(wire, { holder, chain, position, cid: await sha256Hex(String(recordText)) });
}

/** The same ask for a page that holds the record's place and CID, not its text: `holder` is the signer's key,
 *  `chain` null for the base list, `position` the record's `J`, `cid` the sha256 the signing guard checked. */
export async function paymentStatusAt(wire, { holder, chain = null, position, cid }) {
  return wire.confirmed(holder, chain, position, cid);
}

/** What a page shows right after a node takes a payment, before it asks `CONFIRMED`: one node accepted it, and no
 *  certified segment covers it (`flx-reply-ok.mjs`, every taken reply ends `accepted-not-final`). */
export function acceptedStatus() {
  return { kind: "accepted", final: false };
}

/** Ask `CONFIRMED` every `everyMs` until the node answers `CONFIRMED` (final or not) or `CONFLICT`. `place` is the
 *  record text, or `{ holder, chain, position, cid }`. A failed ask reads as `{ kind: "error" }` and is asked again.
 *  Calls `onWaiting(status)` on each other answer. Resolves to the settled answer, or to the last answer when
 *  `timeoutMs` passes (the payment may still confirm later). Never throws. */
export async function watchPayment(wire, place, { everyMs = 2000, timeoutMs = 10 * 60 * 1000, onWaiting } = {}) {
  const ask = () => (typeof place === "string" ? paymentStatus(wire, place) : paymentStatusAt(wire, place)).catch(() => ({ kind: "error" }));
  const until = Date.now() + timeoutMs;
  let status = await ask();
  while (status.kind !== "confirmed" && status.kind !== "conflict" && Date.now() < until) {
    onWaiting?.(status);
    await new Promise((resolve) => setTimeout(resolve, everyMs));
    status = await ask();
  }
  return status;
}

/** The node's rule for final (owner ruling 2026-10-31, "final only with 3+ leads"; `chain_server.rs`
 *  `FINAL_MIN_LEADS`), shown in the words. The node answers `CONFIRMED` only for a certificate with K > 2N/3
 *  precommits (`chain_segment::quorum_for`), and a lone lead (N = 1, K = 1) meets that rule, so the node adds its own
 *  word, `final` or `not-final`. This constant is never used to decide: only the node's word does. */
export const FINAL_MIN_LEADS = 3;

/** True only when the node answered `CONFIRMED ... final`. Round 14 (wallet-final, 2026-11-04): an answer with no word
 *  (a node from before 2026-11-01) is not final here. The page never computes finality itself, so a node and a page
 *  can never disagree about it. */
export function isFinal(status) {
  return status?.kind === "confirmed" && status.final === true;
}

/** The tone a page gives a status: `trust` only for final, `danger` for a conflict or a failed ask, `drift` for every
 *  answer that is not final yet. */
export function paymentTone(status) {
  if (isFinal(status)) return "trust";
  return status?.kind === "conflict" || status?.kind === "error" ? "danger" : "drift";
}

/** The words a wallet shows for a status, read from the node's answer alone. The count is shown whenever the node
 *  sent one. `accepted` is a taken reply before any `CONFIRMED` answer; `waiting` is `CONFIRMED` answering `WAITING`. */
export function describePaymentStatus(status) {
  const k = Number.isInteger(status?.k) ? status.k : null;
  const signers = Number.isInteger(status?.signers) ? status.signers : null;
  if (isFinal(status)) return k !== null && signers !== null ? `Final. ${k} of ${signers} leads certified it.` : "Final.";
  if (status?.kind === "confirmed" && status.final === false) {
    const leads = signers !== null ? ` (${signers} of ${FINAL_MIN_LEADS} leads)` : "";
    return `Confirmed, not final yet${leads}. A payment is final once ${FINAL_MIN_LEADS} or more leads certify it.`;
  }
  if (status?.kind === "confirmed") return "Confirmed, not final yet. This node does not say whether it is final.";
  if (status?.kind === "conflict") return "Never final: the payer signed a different record in this place, and the leads certified that one. Do not hand over goods.";
  if (status?.kind === "accepted") return "Accepted, not final. The chain's leads have not certified it yet.";
  if (status?.kind === "waiting") return k && signers ? `Accepted, not final. Waiting for ${k} of ${signers} leads to certify it.` : "Accepted, not final. Waiting for the chain's leads to certify it.";
  return "The node could not say whether this payment is final.";
}

/** Ask `CONFIRMED` about each payment a holder RECEIVED, from its `nativeHistory` rows (owner ruling 2026-10-31: a
 *  receiver's balance shows amounts that are not final apart from final ones). Resolves to
 *  `{ final, notFinal, conflict, unchecked }` (bigint sums) and `rows` (`{ row, status }` per received row). `notFinal`
 *  is waiting or accepted-not-final; `conflict` will never be final; `unchecked` rows came from a node that does not name
 *  the payer's place, so nothing could be asked. Only the rows passed are counted. */
export async function receivedStatus(wire, chainId, rows) {
  const out = { final: 0n, notFinal: 0n, conflict: 0n, unchecked: 0n, rows: [] };
  for (const row of rows || []) {
    // Owner answer 2026-10-31: a credit is money received too, held to the same 3+ rule.
    if (row.kind !== "received" && row.kind !== "credit") continue;
    if (row.payer == null || row.position == null) {
      out.unchecked += row.amount;
      out.rows.push({ row, status: null });
      continue;
    }
    const status = await wire.confirmed(row.payer, chainId, row.position, row.record ?? row.reference).catch(() => ({ kind: "error" }));
    if (isFinal(status)) out.final += row.amount;
    else if (status.kind === "conflict") out.conflict += row.amount;
    else out.notFinal += row.amount;
    out.rows.push({ row, status });
  }
  return out;
}

/** The words for `receivedStatus`, with `show` formatting an amount: an empty string when every received payment
 *  checked is final. */
export function describeReceived(r, show = (n) => `${n} base units`) {
  const parts = [];
  if (r.notFinal > 0n) parts.push(`${show(r.notFinal)} received is not final yet.`);
  if (r.conflict > 0n) parts.push(`${show(r.conflict)} received will never be final: its payer signed a different record in its place.`);
  if (r.unchecked > 0n) parts.push(`${show(r.unchecked)} received could not be checked: this node does not name where each payment sits.`);
  return parts.join(" ");
}

// The ONE verifier for a name's ownership proof (`DOM_PROOF`). Browser-safe:
// native Web Crypto Ed25519 (flx-crypto.mjs), no dependency, no JSON on the
// wire. The gateway, the domains page and Ark Browser all import this file;
// do not write a second verifier — fix this one.
//
// What a node sends (`DOM_PROOF<TAB><name>`, see chain_server.rs
// `handle_domain_command`):
//
//   DOM_PROOF_LINE<TAB><signed entry>     the current term's claim, then every
//   ...                                   transfer and purchase to the current
//   DOM_PROOF_LINE<TAB><signed entry>     owner, oldest first, each followed by
//   DOM_PROOF_END<TAB><name><TAB><count>  the rents (KDOMRENT1) paid under it,
//                                         then the current record (KDOMREC2)
//   (or DOM_NONE<TAB><name>[<TAB>why<TAB>detail])
//
//   Before DOM_PROOF_END, one line per DAO safe a KDOMSAFE1 in the proof names (owner ruling 2026-11-05: the DAO
//   holds the genesis names), not counted in <count>:
//   DOM_PROOF_SAFE<TAB><address><TAB><hex address domain><TAB><hex-of-utf8 field>...   the preimage of its address
//
// What this checks, entry by entry, without trusting the node that answered:
//   - every entry parses as a LEDGERENTRY, its H is its own G, it carries
//     exactly one S block and that block is LAST (nothing unsigned rides
//     after it), and its S verifies under its own G over the bytes before it;
//   - every entry's W is the asked name, a flat name (one label plus
//     .ark / .deadark / .fxn);
//   - the first entry is a KDOMCLAIM2 signed by the genesis key the caller
//     pins (the chain's CHAIN_SERVER_GENESIS_KEY; claims by any other key
//     are not honored by any node), with C[1] = sha256(name);
//   - each KDOMXFER1 / KDOMXFER2 / KDOMBUY1 is signed by the owner the
//     previous entry established and names that entry's CID in C[1]; for
//     v2 and purchase, the new owner's own signature over the dual-sig
//     sub-message verifies (and a purchase carries a price);
//   - each KDOMRENT1 is signed by the owner then and names the ownership
//     entry then in C[1];
//   - a trailing KDOMREC2 is signed by the current owner and names the
//     current ownership entry as its link;
//   - each KDOMSAFE1 (a DAO safe's decision) names the current head; a take is
//     signed by the holder then; every other action is by the safe holding the
//     name. The safe's preimage hashes to its address, its K obeys the one
//     quorum rule (K > 2N/3, flx-quorum.mjs), and K of its signers' votes
//     verify over domainSafeCovered (Rust name_safe.rs, judge_safe_votes);
//   - with `network` pinned (owner rulings 2026-10-29): the name is under the
//     one ending that network serves (.fxn on fxn-mainnet, .fxndev on every
//     test network), and on the mainnet the term is recomputed from the
//     entries: paid until the claim's M plus every rent's years, each rent
//     inside the grace and at most ten years ahead, no move after the grace.
//     A name in its grace or lapsed at `nowSec` is refused (`InGrace`,
//     `Lapsed`) with its `term`, so a consumer that only checks `verified`
//     never renders it. A test network's names are free: a rent there is
//     refused.
//
// What it cannot check, and says so in `notChecked` (never reported as
// checked):
//   - freshness: a node can withhold a newer transfer or record; a proof
//     shows the entries are genuine and chained, not that they are the
//     latest;
//   - a purchase's payment: the custody credit its C[6] names is custody
//     state, not in the proof; the node that admitted it verified and
//     consumed it;
//   - a rent's payment: the lock its C[4] names and the price at its M are
//     node state; the node that admitted it checked both;
//   - without `network`, the ending and the term are not checked, and
//     `notChecked` says so. Pin it.

import { admit, signaturePrefix, utf8OfHex, hexOfUtf8 } from "./flx-dumb-parser.mjs";
import { sha256Hex, verifyHex } from "./flx-crypto.mjs";
import { quorumFor } from "./flx-quorum.mjs";
import {
  DOMAIN_KIND_BUY,
  DOMAIN_KIND_CLAIM,
  DOMAIN_KIND_RECORD_UPDATE,
  DOMAIN_KIND_RENT,
  DOMAIN_KIND_SAFE,
  decodeTarget,
  domainSafeCovered,
  readSafeDecision,
  safeAddressOf,
  DOMAIN_KIND_XFER,
  DOMAIN_KIND_XFER2,
  GRACE_SECS,
  NETWORK_MAIN,
  decodePriceField,
  dualSigSubmessage,
  extendTerm,
  isClaimableDomainName,
  nameEnding,
  readRecordEntry,
  readRentEntry,
  termState,
} from "./flx-builders.mjs";

const HEX64 = /^[0-9a-f]{64}$/;

function refuse(code, failure, missing, remedy, at) {
  return { kind: "refused", code, failure, missing, remedy, ...(at === undefined ? {} : { at }) };
}

/** Read a `DOM_PROOF` reply (the whole text, lines joined by `\n`).
 *  -> { kind: "proof", fqdn, entries: [signed entry text, ...] }
 *  -> { kind: "none", fqdn }   (the node holds no owner for the name)
 *  -> { kind: "error", reason } */
export function parseDomainProofReply(reply) {
  const frames = String(reply).split("\n").filter((l) => l.length > 0);
  if (frames[0]?.startsWith("DOM_NONE\t")) return { kind: "none", fqdn: frames[0].slice("DOM_NONE\t".length) };
  const endIdx = frames.findIndex((f) => f.startsWith("DOM_PROOF_END\t"));
  if (endIdx < 0) return { kind: "error", reason: `reply had no DOM_PROOF_END line: ${JSON.stringify(frames[0] ?? "")}` };
  const [, fqdn, declared] = frames[endIdx].split("\t");
  const safes = {};
  const lines = frames.slice(0, endIdx).filter((l) => {
    if (!l.startsWith("DOM_PROOF_SAFE\t")) return true;
    const [, address, domainHex, ...hexParts] = l.split("\t");
    try {
      // A field may be empty (a safe with no delegates): an empty box is the empty text.
      safes[address] = { domainHex, parts: hexParts.map((h) => (h === "" ? "" : utf8OfHex(h))) };
    } catch {
      safes[address] = { domainHex, parts: null };
    }
    return false;
  });
  if (lines.some((l) => !l.startsWith("DOM_PROOF_LINE\t"))) return { kind: "error", reason: "reply carried a line that is not DOM_PROOF_LINE or DOM_PROOF_SAFE" };
  const entries = lines.map((l) => l.slice("DOM_PROOF_LINE\t".length));
  if (Number(declared) !== entries.length) return { kind: "error", reason: `declared ${declared} entries, received ${entries.length}` };
  return { kind: "proof", fqdn, entries, safes };
}

/** Verify a name's ownership proof against a pinned genesis key.
 *
 *  Input: `{ fqdn, entries, genesisPubHex, network?, nowSec? }` — `entries` as
 *  `parseDomainProofReply` returns them (or `WireClient.domProof`); `network`
 *  is the network id the consumer trusts (`fxn-mainnet`, `fxn-devnet`, ...),
 *  `nowSec` the clock the term is judged at (default: now).
 *
 *  Resolves to (never throws):
 *    { kind: "verified", fqdn, owner, ownerEntryCid, claimCid,
 *      chain: [{ kind, cid, signer, owner, price }],   // claim first; price [asset, amount] or null
 *      rents: [{ cid, years, amount, paidUntil }],
 *      term: null | { state: "free" } | { state: "paid", paidUntil, graceUntil },   // null without `network`
 *      record: null | { cid, linkCid, priorRecordCid, updatedAt, targets: [{ type, value }] },
 *      notChecked: [string, ...] }
 *    { kind: "refused", code: "InGrace" | "Lapsed", ..., term }   // a name past its paid term
 *    { kind: "refused", code, failure, missing, remedy, at? }   // `at` = entry index */
export async function verifyDomainProof({ fqdn, entries, genesisPubHex, network, nowSec, safes = {} } = {}) {
  if (!isClaimableDomainName(fqdn)) {
    return refuse("WrongName", `${JSON.stringify(fqdn)} is not a name this chain carries`, "a flat name, one label plus .fxn or .fxndev", "ask about a name such as \"nodes.fxn\"");
  }
  const ending = fqdn.slice(fqdn.lastIndexOf(".") + 1);
  if (network !== undefined && nameEnding(network) !== ending) {
    return refuse("WrongEnding", `${fqdn} ends in .${ending}, and network ${network} serves .${nameEnding(network)} names only`, `a name ending in .${nameEnding(network)}`, `a .${ending} name answers only on the network that serves .${ending}; never accept it from ${network}`);
  }
  const paidNetwork = network === NETWORK_MAIN;
  if (!HEX64.test(genesisPubHex ?? "")) {
    return refuse("NoGenesisKey", "no genesis key was pinned to check the claim against", "the chain's genesis public key (CHAIN_SERVER_GENESIS_KEY), 64 lowercase hex", "pin the genesis key your client trusts and verify again");
  }
  if (!Array.isArray(entries) || entries.length === 0) {
    return refuse("EmptyProof", `the proof for ${fqdn} holds no entry`, "at least the genesis claim", "ask a node DOM_PROOF again; a DOM_NONE answer means it holds no owner");
  }

  const read = [];
  for (let i = 0; i < entries.length; i++) {
    const text = entries[i];
    let raw;
    try {
      raw = admit(text);
    } catch (e) {
      return refuse("Grammar", `entry ${i} is not a well-formed record (${e.message})`, "a LEDGERENTRY the node admits", "ask another node for the proof", i);
    }
    if (raw.kind !== "LEDGERENTRY") return refuse("Grammar", `entry ${i} is a ${raw.kind}, not a LEDGERENTRY`, "a LEDGERENTRY", "ask another node for the proof", i);
    const signer = raw.g();
    if (raw.payload("H") !== hexOfUtf8(signer)) return refuse("HolderMismatch", `entry ${i}'s H is not its own signer`, "H = hex of G", "ask another node for the proof", i);
    const sig = raw.payload("S");
    let signed;
    try {
      signed = signaturePrefix(text);
    } catch (e) {
      return refuse("SignatureNotFinal", `entry ${i}'s signature does not cover the whole entry (${e.reason ?? e.message})`, "exactly one S block, as the entry's final block", "the node (or the path to it) added unsigned blocks; ask another node for the proof", i);
    }
    if (!(await verifyHex(signer, signed, sig))) {
      return refuse("BadSignature", `entry ${i}'s signature does not verify under its own signer ${signer}`, "a signature by G over the entry", "the node sent a forged or altered entry; ask another node", i);
    }
    let name;
    try {
      name = utf8OfHex(raw.payload("W") ?? "");
    } catch {
      name = null;
    }
    if (name !== fqdn) return refuse("WrongName", `entry ${i} is about ${JSON.stringify(name)}, not ${fqdn}`, `every entry's W = ${fqdn}`, "ask another node for the proof", i);
    read.push({ raw, text, signer, kind: raw.payload("K"), cid: await sha256Hex(text) });
  }

  const claim = read[0];
  if (claim.kind !== DOMAIN_KIND_CLAIM) {
    return refuse("NotAClaim", `the proof starts with ${claim.kind}, not a claim`, `a ${DOMAIN_KIND_CLAIM} first`, "ask another node for the proof", 0);
  }
  if (claim.signer !== genesisPubHex) {
    return refuse("NotGenesisClaim", `${fqdn} was claimed by ${claim.signer}, not by the pinned genesis key`, `a ${DOMAIN_KIND_CLAIM} signed by ${genesisPubHex}`, "no node honors a claim by any other key; check the genesis key you pinned, or treat the name as unowned", 0);
  }
  if (claim.raw.c(1) !== (await sha256Hex(fqdn)) || claim.raw.cCount() !== 2) {
    return refuse("ClaimNameRef", "the claim's C[1] is not derived from its name", "C[1] = sha256 of the name's UTF-8 bytes, and nothing else", "ask another node for the proof", 0);
  }

  let owner = claim.signer;
  let head = claim.cid;
  const chain = [{ kind: claim.kind, cid: claim.cid, signer: claim.signer, owner, price: null }];
  const notChecked = ["freshness: a node can withhold a newer transfer or record; this proves the entries are genuine and chained, not that they are the latest"];
  if (network === undefined) notChecked.push("term: no network was pinned, so the ending and paid-until were not checked; pass network to verifyDomainProof");
  let record = null;
  const rents = [];
  let paidUntil = Number(claim.raw.payload("M"));

  for (let i = 1; i < read.length; i++) {
    const e = read[i];
    if (e.kind === DOMAIN_KIND_SAFE) {
      const judged = await judgeSafeDecision({ e, i, fqdn, owner, head, safes, last: i === read.length - 1, notChecked });
      if (judged.kind === "refused") return judged;
      if (judged.record) {
        record = judged.record;
        continue;
      }
      if (judged.rent) {
        if (network !== undefined && !paidNetwork) return refuse("UnexpectedEntry", `entry ${i} renews a name, and network ${network} charges no rent`, "no rent on a test network", "ask another node for the proof", i);
        const next = extendTerm(paidUntil, judged.rent.m, judged.rent.years);
        if (next.refused) return refuse("RentOutsideTerm", next.refused[0], next.refused[1], "ask another node for the proof; a node admits no such rent", i);
        paidUntil = next.until;
        rents.push({ cid: e.cid, years: judged.rent.years, amount: judged.rent.amount, paidUntil });
        notChecked.push(`payment: the safe's renewal ${e.cid} names lock ${judged.rent.lockCid}; the lock and the price at its M are node state (the admitting node checked both)`);
        continue;
      }
      if (paidNetwork && termState(paidUntil, Number(e.raw.payload("M"))) === "lapsed") {
        return refuse("MoveAfterLapse", `entry ${i} moves ${fqdn} after its grace ended at ${paidUntil + GRACE_SECS}`, "a move while the name is paid or in its grace", "ask another node for the proof; a node admits no such move", i);
      }
      owner = judged.owner;
      head = e.cid;
      chain.push({ kind: e.kind, cid: e.cid, signer: e.signer, owner, price: null });
      continue;
    }
    if (e.kind === DOMAIN_KIND_RENT) {
      if (network !== undefined && !paidNetwork) {
        return refuse("UnexpectedEntry", `entry ${i} is a rent, and network ${network} charges none`, "no rent on a test network", "ask another node for the proof", i);
      }
      if (e.signer !== owner) return refuse("NotCurrentOwner", `rent ${i} was signed by ${e.signer}, who did not hold ${fqdn} then`, `a rent signed by ${owner}`, "ask another node for the proof", i);
      let rent;
      try {
        rent = readRentEntry(e.raw);
      } catch (err) {
        return refuse("Grammar", `rent ${i} does not read (${err.message})`, "a KDOMRENT1 whose boxes all read", "ask another node for the proof", i);
      }
      if (rent.linkCid !== head) return refuse("StalePriorEntry", `rent ${i} names ${rent.linkCid}, not the ownership entry then ${head}`, `C[1] = ${head}`, "ask another node for the proof", i);
      const next = extendTerm(paidUntil, rent.m, rent.years);
      if (next.refused) return refuse("RentOutsideTerm", next.refused[0], next.refused[1], "ask another node for the proof; a node admits no such rent", i);
      paidUntil = next.until;
      rents.push({ cid: e.cid, years: rent.years, amount: rent.amount, paidUntil });
      notChecked.push(`payment: rent ${e.cid} names lock ${rent.lockCid}; the lock and the price at its M are node state (the admitting node checked both)`);
      continue;
    }
    if (e.kind === DOMAIN_KIND_RECORD_UPDATE) {
      if (i !== read.length - 1) return refuse("UnexpectedEntry", `a record sits at entry ${i}, before the end of the ownership chain`, "the record last", "ask another node for the proof", i);
      if (e.signer !== owner) {
        return refuse("RecordNotByOwner", `the record was signed by ${e.signer}, not by the current owner ${owner}`, "a record signed by the current owner", "treat the name as having no record from its current owner", i);
      }
      let rec;
      try {
        rec = readRecordEntry(e.raw);
      } catch (err) {
        return refuse("RecordMalformed", `the record does not read (${err.message})`, "a KDOMREC2 whose boxes all read", "ask another node for the proof", i);
      }
      if (rec.linkCid !== head) {
        return refuse("RecordWrongLink", `the record was written under ownership entry ${rec.linkCid}, not the current one ${head}`, "a record whose C[1] is the current ownership entry", "treat the name as having no record from its current owner", i);
      }
      record = { cid: e.cid, linkCid: rec.linkCid, priorRecordCid: rec.priorRecordCid, updatedAt: rec.updatedAt, targets: rec.targets };
      continue;
    }
    if (e.kind !== DOMAIN_KIND_XFER && e.kind !== DOMAIN_KIND_XFER2 && e.kind !== DOMAIN_KIND_BUY) {
      return refuse("UnexpectedEntry", `entry ${i} is a ${e.kind}, which does not move ownership`, `${DOMAIN_KIND_XFER}, ${DOMAIN_KIND_XFER2}, ${DOMAIN_KIND_BUY}, ${DOMAIN_KIND_SAFE} or a final ${DOMAIN_KIND_RECORD_UPDATE}`, "ask another node for the proof", i);
    }
    if (e.signer !== owner) {
      return refuse("NotCurrentOwner", `entry ${i} was signed by ${e.signer}, who did not own ${fqdn} then`, `a signature from ${owner}`, "ask another node for the proof", i);
    }
    if (paidNetwork && termState(paidUntil, Number(e.raw.payload("M"))) === "lapsed") {
      return refuse("MoveAfterLapse", `entry ${i} moves ${fqdn} after its grace ended at ${paidUntil + GRACE_SECS}`, "a move while the name is paid or in its grace", "ask another node for the proof; a node admits no such move", i);
    }
    const prior = e.raw.c(1);
    if (prior !== head) {
      return refuse("StalePriorEntry", `entry ${i} names ${prior} as the ownership it supersedes, not ${head}`, `C[1] = ${head}`, "ask another node for the proof", i);
    }
    const newOwner = e.raw.c(2);
    if (!HEX64.test(newOwner ?? "")) return refuse("Grammar", `entry ${i}'s new owner is not a key`, "C[2] = 64 lowercase hex", "ask another node for the proof", i);
    let price = null;
    if (e.kind !== DOMAIN_KIND_XFER) {
      const a = e.raw.c(4);
      const m = e.raw.c(5);
      if ((a == null) !== (m == null)) return refuse("Grammar", `entry ${i} carries half a price`, "C[4] and C[5] both, or neither", "ask another node for the proof", i);
      if (a != null) {
        try {
          price = [decodePriceField(a), decodePriceField(m)];
        } catch {
          return refuse("Grammar", `entry ${i}'s price does not decode`, "hex-of-utf8 price fields", "ask another node for the proof", i);
        }
      }
      if (e.kind === DOMAIN_KIND_BUY && !price) return refuse("MissingPrice", `purchase ${i} carries no price`, "C[4]/C[5] price", "ask another node for the proof", i);
      const ok = await verifyHex(newOwner, dualSigSubmessage(fqdn, prior, newOwner, price), e.raw.c(3));
      if (!ok) {
        return refuse("NewOwnerSignatureInvalid", `entry ${i}'s new owner ${newOwner} did not sign the move`, "the new owner's signature over the dual-sig sub-message in C[3]", "ask another node for the proof", i);
      }
      if (e.kind === DOMAIN_KIND_BUY) {
        notChecked.push(`payment: purchase ${e.cid} names custody credit ${e.raw.c(6)}; whether it was paid is custody state, not in the proof (the admitting node verified and consumed it)`);
      }
    }
    owner = newOwner;
    head = e.cid;
    chain.push({ kind: e.kind, cid: e.cid, signer: e.signer, owner, price });
  }

  let term = null;
  if (network !== undefined && !paidNetwork) term = { state: "free" };
  if (paidNetwork) {
    const now = nowSec ?? Math.floor(Date.now() / 1000);
    term = { state: termState(paidUntil, now), paidUntil, graceUntil: paidUntil + GRACE_SECS };
    if (term.state === "grace") {
      return { ...refuse("InGrace", `${fqdn} was paid until ${paidUntil} and is in its grace until ${term.graceUntil}`, "a paid term", "only the holder can renew it now (KDOMRENT1); do not resolve it until then"), term };
    }
    if (term.state === "lapsed") {
      return { ...refuse("Lapsed", `${fqdn} was paid until ${paidUntil}, and its grace ended at ${term.graceUntil}`, "a paid term", "the name is free to claim again; treat it as unowned"), term };
    }
  }
  return { kind: "verified", fqdn, owner, ownerEntryCid: head, claimCid: claim.cid, chain, rents, term, record, notChecked };
}

/** A DAO safe's decision in a proof (Rust `domain_claims::observe_safe_on` and `judge_safe_votes`). Returns
 *  `{ owner }` for a take or a give, `{ record }` for a final point, `{ rent }` for a renewal, or a refusal. */
async function judgeSafeDecision({ e, i, fqdn, owner, head, safes, last, notChecked }) {
  let d;
  try {
    d = readSafeDecision(e.raw);
  } catch (err) {
    return refuse("Grammar", `safe decision ${i} does not read (${err.message})`, "a KDOMSAFE1 whose boxes all read", "ask another node for the proof", i);
  }
  if (d.head !== head) return refuse("StalePriorEntry", `safe decision ${i} names ${d.head}, not the ownership entry then ${head}`, `C[1] = ${head}`, "ask another node for the proof", i);
  if (d.action === "take") {
    if (e.signer !== owner) return refuse("NotCurrentOwner", `entry ${i} moves ${fqdn} into a safe, signed by ${e.signer}, who did not hold it then`, `a take signed by ${owner}`, "ask another node for the proof", i);
  } else if (owner !== d.safe) {
    return refuse("NotSafeHeld", `entry ${i} is a ${d.action} by the safe ${d.safe}, and ${owner} held ${fqdn} then`, "a decision by the safe that holds the name", "ask another node for the proof", i);
  }
  const pre = safes?.[d.safe];
  if (!pre || !Array.isArray(pre.parts)) {
    return refuse("SafeUnproven", `the proof names safe ${d.safe} but carries no readable preimage of its address`, `a DOM_PROOF_SAFE line for ${d.safe}`, "ask a node of this build for the proof", i);
  }
  if ((await safeAddressOf(pre.domainHex ?? "", pre.parts)) !== d.safe) {
    return refuse("SafePreimage", `the preimage the node sent does not hash to the safe's address ${d.safe}`, "the preimage of the safe's own address", "the node sent another safe's signers; ask another node", i);
  }
  const need = Number(pre.parts[3]);
  const signers = (pre.parts[4] ?? "").split(",").filter((k) => k.length > 0);
  if (!Number.isInteger(need) || signers.length === 0 || need > signers.length || need < quorumFor(signers.length)) {
    return refuse("SafeOutsideQuorum", `the safe asks ${pre.parts[3]} of ${signers.length} signers`, `K at least ${quorumFor(signers.length)} and at most ${signers.length} (K > 2N/3)`, "a node admits no such decision; ask another node", i);
  }
  const covered = domainSafeCovered({ fqdn, headCid: d.head, safe: d.safe, action: d.action, boxes: d.boxes });
  const counted = new Set();
  for (const v of d.votes) {
    if (!signers.includes(v.signer) || counted.has(v.signer)) continue;
    if (await verifyHex(v.signer, covered, v.signature)) counted.add(v.signer);
  }
  if (counted.size < need) {
    return refuse("SafeVotesShort", `${counted.size} of the safe's ${signers.length} signers voted for decision ${i}, and the safe needs ${need}`, `${need - counted.size} more vote(s) over the decision's covered message`, "the node admits no such decision; ask another node for the proof", i);
  }
  notChecked.push(`safe configuration: ${d.safe}'s signers are read from the preimage of its address as created; a later configuration the DAO filed is node state`);
  if (d.action === "take") return { owner: d.safe };
  if (d.action === "give") {
    const [to, sig] = d.boxes;
    if (!(await verifyHex(to, dualSigSubmessage(fqdn, d.head, to, null), sig))) {
      return refuse("NewOwnerSignatureInvalid", `entry ${i}'s new owner ${to} did not sign the move`, "the new owner's signature over the dual-sig sub-message in C[5]", "ask another node for the proof", i);
    }
    return { owner: to };
  }
  if (d.action === "point") {
    if (!last) return refuse("UnexpectedEntry", `a record sits at entry ${i}, before the end of the ownership chain`, "the record last", "ask another node for the proof", i);
    let targets;
    try {
      targets = d.boxes.slice(1).map((b) => decodeTarget(b));
    } catch (err) {
      return refuse("RecordMalformed", `the safe's record does not read (${err.message})`, "record target boxes as KDOMREC2's", "ask another node for the proof", i);
    }
    return { record: { cid: e.cid, linkCid: d.head, priorRecordCid: d.boxes[0], updatedAt: d.m, targets } };
  }
  const [years, amount, lockCid] = d.boxes;
  try {
    return { rent: { years: Number(decodePriceField(years)), amount: decodePriceField(amount), lockCid, m: d.m } };
  } catch {
    return refuse("Grammar", `renewal ${i}'s boxes do not decode`, "years and FXN as padded hex-of-utf8", "ask another node for the proof", i);
  }
}


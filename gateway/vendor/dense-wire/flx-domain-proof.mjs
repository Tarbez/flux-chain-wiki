// The ONE verifier for a name's ownership proof (`DOM_PROOF`). Browser-safe:
// native Web Crypto Ed25519 (flx-crypto.mjs), no dependency, no JSON on the
// wire. The gateway, the domains page and Ark Browser all import this file;
// do not write a second verifier — fix this one.
//
// What a node sends (`DOM_PROOF<TAB><name>`, see chain_server.rs
// `handle_domain_command`):
//
//   DOM_PROOF_LINE<TAB><signed entry>     the claim, then every transfer and
//   ...                                   purchase to the current owner,
//   DOM_PROOF_LINE<TAB><signed entry>     oldest first, then the current
//   DOM_PROOF_END<TAB><name><TAB><count>  record (KDOMREC2) if there is one
//   (or DOM_NONE<TAB><name>)
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
//   - a trailing KDOMREC2 is signed by the current owner and names the
//     current ownership entry as its link.
//
// What it cannot check, and says so in `notChecked` (never reported as
// checked):
//   - freshness: a node can withhold a newer transfer or record; a proof
//     shows the entries are genuine and chained, not that they are the
//     latest;
//   - a purchase's payment: the custody credit its C[6] names is custody
//     state, not in the proof; the node that admitted it verified and
//     consumed it.

import { admit, signaturePrefix, utf8OfHex, hexOfUtf8 } from "./flx-dumb-parser.mjs";
import { sha256Hex, verifyHex } from "./flx-crypto.mjs";
import {
  DOMAIN_KIND_BUY,
  DOMAIN_KIND_CLAIM,
  DOMAIN_KIND_RECORD_UPDATE,
  DOMAIN_KIND_XFER,
  DOMAIN_KIND_XFER2,
  decodePriceField,
  dualSigSubmessage,
  isClaimableDomainName,
  readRecordEntry,
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
  const lines = frames.slice(0, endIdx);
  if (lines.some((l) => !l.startsWith("DOM_PROOF_LINE\t"))) return { kind: "error", reason: "reply carried a line that is not DOM_PROOF_LINE" };
  const entries = lines.map((l) => l.slice("DOM_PROOF_LINE\t".length));
  if (Number(declared) !== entries.length) return { kind: "error", reason: `declared ${declared} entries, received ${entries.length}` };
  return { kind: "proof", fqdn, entries };
}

/** Verify a name's ownership proof against a pinned genesis key.
 *
 *  Input: `{ fqdn, entries, genesisPubHex }` — `entries` as
 *  `parseDomainProofReply` returns them (or `WireClient.domProof`).
 *
 *  Resolves to (never throws):
 *    { kind: "verified", fqdn, owner, ownerEntryCid, claimCid,
 *      chain: [{ kind, cid, signer, owner, price }],   // claim first; price [asset, amount] or null
 *      record: null | { cid, linkCid, priorRecordCid, updatedAt, targets: [{ type, value }] },
 *      notChecked: [string, ...] }
 *    { kind: "refused", code, failure, missing, remedy, at? }   // `at` = entry index */
export async function verifyDomainProof({ fqdn, entries, genesisPubHex } = {}) {
  if (!isClaimableDomainName(fqdn)) {
    return refuse("WrongName", `${JSON.stringify(fqdn)} is not a name this chain carries`, "a flat name, one label plus .ark, .deadark or .fxn", "ask about a name such as \"nodes.fxn\"");
  }
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
  let record = null;

  for (let i = 1; i < read.length; i++) {
    const e = read[i];
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
      return refuse("UnexpectedEntry", `entry ${i} is a ${e.kind}, which does not move ownership`, `${DOMAIN_KIND_XFER}, ${DOMAIN_KIND_XFER2}, ${DOMAIN_KIND_BUY} or a final ${DOMAIN_KIND_RECORD_UPDATE}`, "ask another node for the proof", i);
    }
    if (e.signer !== owner) {
      return refuse("NotCurrentOwner", `entry ${i} was signed by ${e.signer}, who did not own ${fqdn} then`, `a signature from ${owner}`, "ask another node for the proof", i);
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

  return { kind: "verified", fqdn, owner, ownerEntryCid: head, claimCid: claim.cid, chain, record, notChecked };
}

// The ONE verifier for a PVA's or a skin's ownership proof (`OBJ_PROOF`). Browser-safe: native Web Crypto Ed25519
// (flx-crypto.mjs), no dependency, no JSON on the wire. The defxn site and the FXN Browser copy this file byte for
// byte (a drift test fails on any change); do not write a second verifier — fix this one.
//
// What a node sends (`OBJ_PROOF<TAB><id>`, see chain_server_objects.rs and objects.rs `render_proof`):
//
//   OBJ_PROOF_LINE<TAB><signed record>    the mint, then each adopted head edge and the move to it, oldest first,
//   ...                                   a burn last
//   OBJ_PROOF_PVA<TAB><signed record>     for a skin: its minter's PVA mint
//   OBJ_PROOF_END<TAB><id><TAB><count>
//   (or OBJ_NONE<TAB><id>, or OBJ_REFUSED<TAB><id><TAB><failure><TAB><missing><TAB><remedy>)
//
// What this checks, record by record, without trusting the node that answered:
//   - every record is a LEDGERENTRY of its kind's labels only (each once, C aside), its H is the hex of its own G, it
//     carries exactly one S block and that block is LAST, and its S verifies under its own G over the bytes before it;
//   - the first record is a KASSET1 on `pva` or `skin` whose CID is the asked id: the owner is its signer, the pointer
//     its C[1]; a PVA may carry its card's mix as C[2] (`mix`, fixed at activation), a skin never carries a C[2];
//   - a PVA has nothing after its mint: any move of a PVA is refused PvaIsBound, as every node refuses it;
//   - each KEDGE1 follows the current head (C[1]) under the pointer relation, and the KSUPER1 after it is signed by
//     the current owner, from the current head (C[1]) to that edge (C[2]): the edge's signer becomes the owner and its
//     C[2] the pointer;
//   - a KSUPER1 `retract` from the current head (C[2] = 64 zeros) is the burn, and nothing follows it;
//   - a skin's OBJ_PROOF_PVA is a KASSET1 on `pva` signed by the skin's minter, stamped at or before the skin.
//
// What it cannot check, and says so in `notChecked` (never reported as checked):
//   - freshness: a node can withhold a newer move; the proof shows the records are genuine and chained, not latest;
//   - the earn: a PVA's C[1] is an FXN payment the node found on its ledger; confirm it with NATIVE_HISTORY;
//   - one PVA per identity: the node reads the key's earliest earned PVA; another node may hold one this one does not;
//   - one mix per chain: the node lets a mix count for its earliest PVA; another node may hold an earlier one.

import { sha256Hex, verifyHex } from "./flx-crypto.mjs";
import { keyName, isKeyNameLabel } from "./flx-object-builders.mjs";

export const PVA_CHAIN = "pva";
export const SKIN_CHAIN = "skin";
export const POINTER_RELATION = "references";
const HEX64 = /^[0-9a-f]{64}$/;
const BURN = "0".repeat(64);
const KINDS = {
  KASSET1: { labels: "GYVMHNKJCS", refs: 2, maxRefs: 3 },
  KEDGE1: { labels: "GYVMHNKRQJCS", refs: 3 },
  KSUPER1: { labels: "GYVMHNKOJCS", refs: 3 },
};

const hexOfUtf8 = (text) => Array.from(new TextEncoder().encode(text), (b) => b.toString(16).padStart(2, "0")).join("");

function refuse(code, failure, missing, remedy, at) {
  return { kind: "refused", code, failure, missing, remedy, ...(at === undefined ? {} : { at }) };
}

/** Read an `OBJ_PROOF` reply (the whole text, lines joined by `\n`).
 *  -> { kind: "proof", id, entries: [text, ...], pva: text | null }
 *  -> { kind: "none", id }
 *  -> { kind: "refused", id, failure, missing, remedy }   (the node's own rule refused the object)
 *  -> { kind: "error", reason } */
export function parseObjectProofReply(reply) {
  const frames = String(reply).split("\n").filter((l) => l.length > 0);
  if (frames[0]?.startsWith("OBJ_NONE\t")) return { kind: "none", id: frames[0].slice("OBJ_NONE\t".length) };
  if (frames[0]?.startsWith("OBJ_REFUSED\t")) {
    const [, id, failure, missing, remedy] = frames[0].split("\t");
    return { kind: "refused", id, failure, missing, remedy };
  }
  const endIdx = frames.findIndex((f) => f.startsWith("OBJ_PROOF_END\t"));
  if (endIdx < 0) return { kind: "error", reason: `reply had no OBJ_PROOF_END line: ${JSON.stringify(frames[0] ?? "")}` };
  const [, id, declared] = frames[endIdx].split("\t");
  const entries = [];
  let pva = null;
  for (const line of frames.slice(0, endIdx)) {
    if (line.startsWith("OBJ_PROOF_LINE\t")) entries.push(line.slice("OBJ_PROOF_LINE\t".length));
    else if (line.startsWith("OBJ_PROOF_PVA\t") && pva === null) pva = line.slice("OBJ_PROOF_PVA\t".length);
    else return { kind: "error", reason: "reply carried a line that is not OBJ_PROOF_LINE or one OBJ_PROOF_PVA" };
  }
  if (Number(declared) !== entries.length) return { kind: "error", reason: `declared ${declared} records, received ${entries.length}` };
  return { kind: "proof", id, entries, pva };
}

/** Read an `OBJS_OF` reply -> { kind: "objects", key, objects: [{ chain, id }] } or { kind: "error", reason }. */
export function parseObjsOfReply(reply) {
  const frames = String(reply).split("\n").filter((l) => l.length > 0);
  const end = frames.at(-1)?.split("\t") ?? [];
  if (end[0] !== "OBJS_END") return { kind: "error", reason: `reply had no OBJS_END line: ${JSON.stringify(frames[0] ?? "")}` };
  const objects = [];
  for (const line of frames.slice(0, -1)) {
    const [tag, chain, id] = line.split("\t");
    if (tag !== "OBJ" || (chain !== PVA_CHAIN && chain !== SKIN_CHAIN) || !HEX64.test(id ?? "")) return { kind: "error", reason: `reply carried a line that is not OBJ<TAB>chain<TAB>id: ${JSON.stringify(line)}` };
    objects.push({ chain, id });
  }
  if (Number(end[2]) !== objects.length) return { kind: "error", reason: `declared ${end[2]} objects, received ${objects.length}` };
  return { kind: "objects", key: end[1], objects };
}

/** One record, read strictly and its signature checked. Returns the read record or a refusal. */
async function readRecord(text, i) {
  const bad = (code, failure, missing) => refuse(code, `record ${i} ${failure}`, missing, "ask another node for the proof", i);
  if (typeof text !== "string" || !/^[A-Za-z0-9-]+$/.test(text)) return bad("Grammar", "has characters outside [A-Za-z0-9-]", "a signed record");
  const blocks = text.split("-");
  if (blocks.some((b) => b.length < 2)) return bad("Grammar", "has an empty block", "no block without a payload");
  const get = (label) => blocks.filter((b) => b[0] === label).map((b) => b.slice(1));
  const kind = get("K")[0];
  const shape = KINDS[kind];
  if (!shape) return bad("WrongKind", `is a K${kind}, not ${Object.keys(KINDS).join(", ")}`, "an object record");
  for (const b of blocks) {
    if (!shape.labels.includes(b[0])) return bad("UnreadLabel", `carries a ${b[0]} block ${kind} does not read`, `only ${shape.labels.split("").join(" ")}`);
    if (b[0] !== "C" && get(b[0]).length !== 1) return bad("RepeatedLabel", `carries the ${b[0]} block twice`, "each label once, C aside");
  }
  const g = get("G")[0] ?? "";
  if (!HEX64.test(g)) return bad("Grammar", "has a G that is not a 64-hex key", "G = the signer's public key");
  if (get("H")[0] !== hexOfUtf8(g)) return bad("HolderMismatch", "has an H that is not the hex of its own G", "H = hex of G");
  if (get("Y")[0] !== "LEDGERENTRY" || get("V")[0] !== "1") return bad("Grammar", "is not a LEDGERENTRY of version 1", "Y = LEDGERENTRY, V = 1");
  if (!/^(0|[1-9][0-9]*)$/.test(get("M")[0] ?? "") || !/^(0|[1-9][0-9]*)$/.test(get("J")[0] ?? "")) return bad("Grammar", "has an M or J that is not plain digits", "M and J as digits");
  const refs = get("C");
  const maxRefs = shape.maxRefs ?? shape.refs;
  if (refs.length < shape.refs || refs.length > maxRefs || refs.some((c) => !HEX64.test(c))) {
    const count = maxRefs === shape.refs ? `${shape.refs}` : `${shape.refs} or ${maxRefs}`;
    return bad("Grammar", `carries ${refs.length} C refs, ${kind} carries ${count} of 64 hex`, `${count} content addresses`);
  }
  const last = blocks.at(-1);
  if (last[0] !== "S" || get("S").length !== 1 || !/^[0-9a-f]{128}$/.test(last.slice(1))) {
    return bad("SignatureNotFinal", "does not end in its one S block", "exactly one S block, as the record's final block");
  }
  const signed = text.slice(0, text.length - last.length - 1);
  if (!(await verifyHex(g, signed, last.slice(1)))) return bad("BadSignature", `does not verify under its own signer ${g}`, "a signature by G over the record");
  return { kind: "record", text, recordKind: kind, signer: g, chain: get("N")[0], at: Number(get("M")[0]), refs, o: get("O")[0], r: get("R")[0], cid: await sha256Hex(text) };
}

/** Verify an object's ownership proof.
 *
 *  Input: `{ id, entries, pva }` as `parseObjectProofReply` returns them.
 *
 *  Resolves to (never throws):
 *    { kind: "verified", id, chain, owner, pointer, minter, mintedAt, head, moves, pva: id | null, mix, notChecked }
 *    (`mix`: a PVA's C[2], the card's mix fixed at activation; null for a PVA activated before mixes, and for a skin)
 *    { kind: "burned", id, chain, burnedAt, burnedBy, notChecked }
 *    { kind: "refused", code, failure, missing, remedy, at? }   // `at` = record index */
export async function verifyObjectProof({ id, entries, pva = null } = {}) {
  if (!HEX64.test(id ?? "")) {
    return refuse("WrongId", `${JSON.stringify(id)} is not an object id`, "the mint record's CID, 64 lowercase hex", "ask OBJS_OF for the ids a key owns");
  }
  if (!Array.isArray(entries) || entries.length === 0) {
    return refuse("EmptyProof", `the proof for ${id} holds no record`, "at least the mint", "ask a node OBJ_PROOF again; OBJ_NONE means it holds no mint");
  }
  const read = [];
  for (let i = 0; i < entries.length; i++) {
    const r = await readRecord(entries[i], i);
    if (r.kind === "refused") return r;
    read.push(r);
  }
  const mint = read[0];
  if (mint.recordKind !== "KASSET1" || (mint.chain !== PVA_CHAIN && mint.chain !== SKIN_CHAIN)) {
    return refuse("NotAMint", `the proof starts with a ${mint.recordKind} on ${mint.chain}`, `a KASSET1 on ${PVA_CHAIN} or ${SKIN_CHAIN} first`, "ask another node for the proof", 0);
  }
  if (mint.cid !== id) return refuse("WrongId", `the mint's CID is ${mint.cid}, not the asked ${id}`, "the mint whose CID is the id", "ask another node for the proof", 0);
  const chain = mint.chain;
  if (chain === SKIN_CHAIN && mint.refs.length > 2) {
    return refuse("Grammar", "the skin's mint carries a C[2]; only a PVA carries a mix", "a skin mint of 2 C refs", "ask another node for the proof", 0);
  }
  const notChecked = ["freshness: a node can withhold a newer move; this proves the records are genuine and chained, not that they are the latest"];
  if (chain === PVA_CHAIN) {
    if (read.length > 1) {
      return refuse("PvaIsBound", `the proof moves a PVA at record 1 (${read[1].recordKind})`, "nothing: a PVA has no move", "treat the PVA as its minter's, as every node does", 1);
    }
    notChecked.push(`earn: the PVA cites ${mint.refs[1]}, an FXN payment the node found on its ledger; confirm it with NATIVE_HISTORY defxn ${mint.signer}`);
    notChecked.push("one PVA per identity: the node reads the key's earliest earned PVA; another node may hold one this node does not");
    const mix = mint.refs[2] ?? null;
    if (mix) notChecked.push(`one mix per chain: the node found no earlier PVA with the mix ${mix}; another node may hold one this node does not`);
    return { kind: "verified", id, chain, owner: mint.signer, pointer: mint.refs[1], minter: mint.signer, mintedAt: mint.at, head: id, moves: 0, pva: id, mix, notChecked };
  }

  if (pva === null) {
    return refuse("NoPva", `the skin's proof carries no PVA for its minter ${mint.signer}`, "OBJ_PROOF_PVA: the minter's PVA mint", "ask another node for the proof", 0);
  }
  const p = await readRecord(pva, "PVA");
  if (p.kind === "refused") return p;
  if (p.recordKind !== "KASSET1" || p.chain !== PVA_CHAIN || p.signer !== mint.signer || p.at > mint.at) {
    return refuse("NoPva", "the proof's PVA is not a PVA its minter held when it minted the skin", `a KASSET1 on ${PVA_CHAIN} signed by ${mint.signer}, stamped at or before ${mint.at}`, "ask another node for the proof", 0);
  }
  notChecked.push(`earn: the minter's PVA ${p.cid} cites an FXN payment the node found on its ledger; confirm it with NATIVE_HISTORY`);

  let owner = mint.signer;
  let pointer = mint.refs[1];
  let head = id;
  let moves = 0;
  for (let i = 1; i < read.length; i++) {
    const e = read[i];
    if (e.chain !== chain) return refuse("WrongChain", `record ${i} is on ${e.chain}, the skin on ${chain}`, `every record on ${chain}`, "ask another node for the proof", i);
    if (e.recordKind === "KSUPER1" && e.o === hexOfUtf8("retract")) {
      if (e.signer !== owner || e.refs[1] !== head || e.refs[2] !== BURN) {
        return refuse("BadBurn", `record ${i} is not the owner's burn of the current head`, `a retract by ${owner} of ${head}`, "ask another node for the proof", i);
      }
      if (i !== read.length - 1) return refuse("AfterBurn", `record ${i + 1} follows the burn`, "nothing after a burn", "ask another node for the proof", i + 1);
      return { kind: "burned", id, chain, burnedAt: e.at, burnedBy: e.signer, notChecked };
    }
    const edge = e;
    const move = read[i + 1];
    if (edge.recordKind !== "KEDGE1" || !move || move.recordKind !== "KSUPER1") {
      return refuse("UnexpectedRecord", `record ${i} is a ${edge.recordKind}; a move is a head edge then its KSUPER1`, "a KEDGE1, then the owner's KSUPER1 to it", "ask another node for the proof", i);
    }
    if (edge.r !== hexOfUtf8(POINTER_RELATION) || edge.refs[1] !== head) {
      return refuse("HeadNotFollowing", `head edge ${i} follows ${edge.refs[1]} under ${edge.r}, the current head is ${head}`, `a head edge from ${head} under ${POINTER_RELATION}`, "ask another node for the proof", i);
    }
    if (move.o !== hexOfUtf8("supersede") || move.signer !== owner || move.refs[1] !== head || move.refs[2] !== edge.cid) {
      return refuse("NotTheOwnersMove", `record ${i + 1} is not ${owner}'s move from ${head} to edge ${edge.cid}`, `a supersede by ${owner} from ${head} to ${edge.cid}`, "ask another node for the proof", i + 1);
    }
    if (move.chain !== chain) return refuse("WrongChain", `record ${i + 1} is on ${move.chain}, the skin on ${chain}`, `every record on ${chain}`, "ask another node for the proof", i + 1);
    owner = edge.signer;
    pointer = edge.refs[2];
    head = edge.cid;
    moves += 1;
    i += 1;
  }
  return { kind: "verified", id, chain, owner, pointer, minter: mint.signer, mintedAt: mint.at, head, moves, pva: p.cid, notChecked };
}

/** Ask one node what `key` owns, and verify every object here. `wire` is anything with `send(line) -> Promise of the
 *  reply text` (a WireClient). A listed object that does not verify, or that the key does not own, is never shown: it
 *  is returned in `refused` with its reason.
 *  -> { kind: "objects", key, objects: [verified or burned results], refused: [{ id, code, failure, missing, remedy }] }
 *  -> { kind: "error", reason } */
export async function readObjectsOf({ wire, key } = {}) {
  if (!HEX64.test(key ?? "")) return { kind: "error", reason: "the key is not 64 lowercase hex characters" };
  const listed = parseObjsOfReply(await wire.send(`OBJS_OF\t${key}`));
  if (listed.kind !== "objects") return listed;
  if (listed.key !== key) return { kind: "error", reason: `the node answered for ${listed.key}, not ${key}` };
  const objects = [];
  const refused = [];
  for (const { chain, id } of listed.objects) {
    const reply = parseObjectProofReply(await wire.send(`OBJ_PROOF\t${id}`));
    if (reply.kind !== "proof") {
      refused.push({ id, code: reply.kind === "refused" ? "NodeRefused" : "NoProof", failure: reply.failure ?? reply.reason ?? `the node holds no proof for ${id}`, missing: reply.missing ?? "the object's proof", remedy: reply.remedy ?? "ask another node" });
      continue;
    }
    const verdict = await verifyObjectProof({ id, entries: reply.entries, pva: reply.pva });
    if (verdict.kind === "refused") refused.push({ id, ...verdict });
    else if (verdict.chain !== chain) refused.push({ id, ...refuse("WrongChain", `the node listed ${id} on ${chain}, its mint is on ${verdict.chain}`, "a listing that matches the proof", "ask another node") });
    else if (verdict.kind === "verified" && verdict.owner !== key) refused.push({ id, ...refuse("NotTheKeys", `the node listed ${id} for ${key}, its proof names ${verdict.owner}`, "an object the key owns", "ask another node") });
    else objects.push(verdict);
  }
  return { kind: "objects", key, objects, refused };
}

/** Verify a public id's name: the node's `NAME_PVA <name>` answer is a PVA proof whose owner's key makes that name.
 *  -> the PVA's verified result plus { name } | { kind: "none", name } | a refusal. */
export async function verifyNamedPva({ name, reply } = {}) {
  const label = typeof name === "string" && name.endsWith(".fxn") ? name.slice(0, -4) : "";
  if (!isKeyNameLabel(label)) {
    return refuse("NotAKeyName", `${JSON.stringify(name)} is not a name made from a key`, "a .fxn name of 14 characters, a digit 2-7 then base32", "compute it with keyName; a claimed name is checked with flx-domain-proof.mjs");
  }
  const parsed = parseObjectProofReply(reply);
  if (parsed.kind === "none") return { kind: "none", name };
  if (parsed.kind !== "proof") return refuse("NoProof", `the node's answer for ${name} is not a proof (${parsed.reason || parsed.failure || parsed.kind})`, "a PVA proof", "ask another node");
  const verdict = await verifyObjectProof({ id: parsed.id, entries: parsed.entries, pva: parsed.pva });
  if (verdict.kind !== "verified") return verdict.kind === "refused" ? verdict : refuse("NotAPva", `the proof for ${name} is not a live PVA`, "a PVA proof", "ask another node");
  if (verdict.chain !== PVA_CHAIN) return refuse("NotAPva", `the node answered ${name} with a ${verdict.chain} object`, "the key's PVA", "ask another node");
  if ((await keyName(verdict.owner)) !== name) return refuse("WrongKeyName", `the PVA's owner ${verdict.owner} makes another name than ${name}`, "the PVA of the key the name is made from", "ask another node");
  return { ...verdict, name };
}

/** Verify a node's `WALLETS_OF <public id>` answer: every record is a fresh wallet's first record, signed by the
 *  wallet and countersigned by the public id. -> { kind: "wallets", publicId, wallets: [hex] } | a refusal. A wallet
 *  whose record does not verify is never listed: the whole answer is refused, naming the record. */
export async function verifyWalletsOf({ publicId, reply } = {}) {
  if (!HEX64.test(publicId ?? "")) return refuse("WrongKey", "the public id is not a 64-hex key", "the public id's key", "pass the public id's key");
  const frames = String(reply).split("\n").filter((l) => l.length > 0);
  const end = frames.at(-1)?.split("\t") ?? [];
  if (end[0] !== "WALLETS_END" || end[1] !== publicId) return refuse("Grammar", "the answer has no WALLETS_END for this public id", "a WALLETS_OF answer", "ask another node");
  const wallets = [];
  for (let i = 0; i < frames.length - 1; i++) {
    if (!frames[i].startsWith("WALLET\t")) return refuse("Grammar", `line ${i} is not a WALLET line`, "WALLET<TAB><record>", "ask another node", i);
    const text = frames[i].slice("WALLET\t".length);
    const blocks = text.split("-"), get = (l) => blocks.filter((b) => b[0] === l).map((b) => b.slice(1)), refs = get("C");
    const wallet = get("G")[0] || "", last = blocks.at(-1) || "";
    const shapeOk = get("K")[0] === "KWALLET1" && get("N")[0] === PVA_CHAIN && get("J")[0] === "0" && refs.length === 3 && refs[0] === "0".repeat(64) && refs[1] === publicId && HEX64.test(wallet) && get("H")[0] === hexOfUtf8(wallet);
    if (!shapeOk) return refuse("NotAFreshWallet", `record ${i} is not a fresh wallet of ${publicId}`, "a KWALLET1 at the wallet's position 0 naming this public id", "ask another node", i);
    if (!(await verifyHex(publicId, `FXN-WALLET-V1\n${publicId}\n${wallet}`, refs[2]))) return refuse("BadSignature", `the public id did not sign wallet ${wallet}`, "the public id's countersignature", "ask another node", i);
    if (last[0] !== "S" || !(await verifyHex(wallet, text.slice(0, text.length - last.length - 1), last.slice(1)))) return refuse("BadSignature", `wallet ${wallet} did not sign its record`, "the wallet's signature", "ask another node", i);
    wallets.push(wallet);
  }
  if (Number(end[2]) !== wallets.length) return refuse("Grammar", `declared ${end[2]} wallets, received ${wallets.length}`, "a count that matches", "ask another node");
  return { kind: "wallets", publicId, wallets, notChecked: ["freshness: the node judged the wallet had no history when it joined"] };
}

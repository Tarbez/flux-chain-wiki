// Native-token transfers (Phase 2, custody): JS port of dense-wire's `native_ledger::build_native_transfer` plus the
// three wire commands around it. A NEW file on purpose: the other web builders are edited by other work.
//
//   NATIVE_BALANCE<TAB>chain<TAB>holder          -> BALANCE<TAB>chain<TAB>holder<TAB>amount | BALANCE_UNKNOWN<TAB>chain<TAB>holder
//   NATIVE_SEND<TAB><signed KNXFER1 record>      -> NATIVE_SEND_OK<TAB>cid<TAB>senderBalance
//                                                 | NATIVE_SEND_ERR<TAB>failure<TAB>missing<TAB>remedy
//   NATIVE_HISTORY<TAB>chain<TAB>holder<TAB>n    -> NATIVE_HISTORY<TAB>chain<TAB>holder<TAB>rows, then ROW lines, then NATIVE_HISTORY_END
//
// A transfer is signed by the SENDER (`G`): the chain's ordinary admission check (signature + position on the sender's own
// chain) is the authorization. Position/prev come from the chain-position tracker (flux-launchpad/js/chain-heads.mjs):
// a record at an occupied position freezes the sender's chain, so never build one from a cached head across tabs/devices.
//
// `now` is unix MILLISECONDS (not seconds): it orders the ledger. Rejected below 1e11 so a seconds value cannot slip through.
//
// Signer shape (same as flx-transfer-builders.mjs): `{ pubHex, signText(asciiText): Promise<hexSig> }`.
// Exports only; no top-level work.

export const KIND_NATIVE_TRANSFER = "KNXFER1";
export const MAX_TRANSFER_MEMO_BYTES = 64;

const hexOfUtf8 = (value) => {
  let out = "";
  for (const b of new TextEncoder().encode(value)) out += b.toString(16).padStart(2, "0");
  return out;
};

// `C` blocks have a 16-hex-char floor: pad the raw value with NUL to at least 8 bytes before hex-encoding (Rust `hex_of_utf8_c`).
export const hexOfUtf8C = (value) => {
  let padded = value;
  while (new TextEncoder().encode(padded).length < 8) padded += "\0";
  return hexOfUtf8(padded);
};

/**
 * Builds and signs one `KNXFER1` record. `amount` is a positive integer (number or bigint) of `chainId`'s own native token.
 * Throws a named error for anything the node would refuse on shape alone.
 */
export async function buildNativeTransfer(signer, { pos, prev, toKeyHex, chainId, memo = "", amount, now }) {
  if (!/^[0-9a-f]{64}$/.test(toKeyHex)) throw new Error("buildNativeTransfer: toKeyHex must be a 64-hex public key");
  if (toKeyHex === signer.pubHex) throw new Error("buildNativeTransfer: the recipient must differ from the sender");
  if (!/^[a-z0-9]{3,32}$/.test(chainId)) throw new Error("buildNativeTransfer: chainId must be 3-32 lowercase alphanumerics");
  if (new TextEncoder().encode(memo).length > MAX_TRANSFER_MEMO_BYTES) throw new Error(`buildNativeTransfer: memo is over ${MAX_TRANSFER_MEMO_BYTES} bytes`);
  const units = BigInt(amount);
  if (units <= 0n) throw new Error("buildNativeTransfer: amount must be positive");
  if (!Number.isInteger(pos) || pos < 0) throw new Error("buildNativeTransfer: pos must be the sender's chain length");
  if (!Number.isInteger(now) || now < 100_000_000_000) throw new Error("buildNativeTransfer: now must be unix MILLISECONDS (a seconds value would sort before the credits that fund it)");
  if (!/^[0-9a-f]{64}$/.test(prev)) throw new Error("buildNativeTransfer: prev must be the previous record's CID (64 hex)");
  const body =
    `G${signer.pubHex}-YLEDGERENTRY-V1-M${now}-H${hexOfUtf8(signer.pubHex)}-K${KIND_NATIVE_TRANSFER}` +
    `-W${hexOfUtf8(toKeyHex)}-J${pos}-C${prev}-C${hexOfUtf8C(chainId)}-C${hexOfUtf8C(memo)}-T${units}NATIVE`;
  const sig = await signer.signText(body);
  return { text: `${body}-S${sig}`, line: `NATIVE_SEND\t${body}-S${sig}` };
}

/** Parses a `NATIVE_SEND` reply into `{kind:'ok', cid, senderBalance}` or `{kind:'refused', failure, missing, remedy}`. */
export function parseNativeSendReply(reply) {
  const parts = String(reply).trim().split("\t");
  if (parts[0] === "NATIVE_SEND_OK" && parts.length === 3) return { kind: "ok", cid: parts[1], senderBalance: BigInt(parts[2]) };
  if (parts[0] === "NATIVE_SEND_ERR" && parts.length === 4) return { kind: "refused", failure: parts[1], missing: parts[2], remedy: parts[3] };
  return { kind: "error", raw: String(reply).trim() };
}

/** `NATIVE_BALANCE` -> bigint, or `null` when the chain was never minted on that node (not a zero). */
export async function nativeBalance(wire, chainId, holderHex) {
  const parts = String(await wire.send(`NATIVE_BALANCE\t${chainId}\t${holderHex}`)).trim().split("\t");
  return parts[0] === "BALANCE" ? BigInt(parts[3]) : null;
}

/** `NATIVE_HISTORY` -> `[{at, kind, counterparty, amount, reference}]` oldest first, or `null` when unknown. */
export async function nativeHistory(wire, chainId, holderHex, limit = 50) {
  const lines = String(await wire.send(`NATIVE_HISTORY\t${chainId}\t${holderHex}\t${limit}`)).trim().split("\n");
  if (!lines[0].startsWith("NATIVE_HISTORY\t")) return null;
  return lines.filter((l) => l.startsWith("ROW\t")).map((l) => {
    const [, at, kind, counterparty, amount, reference] = l.split("\t");
    return { at: Number(at), kind, counterparty, amount: BigInt(amount), reference };
  });
}

/**
 * `PORTFOLIO <holder>`: everything one holder owns on this node, derived from the ledgers on read (nothing stored). Amounts are BigInt.
 * Returns `{ fxn: {live, locked, credits, indexSize}, native: [{chainId, balance, events}], curve: [{chainId, tokens}] }`, or
 * `{ refused: {failure, missing, remedy} }` for a refusal, or `null` for an unreadable reply. `indexSize` and `events` are the fold sizes the
 * figures were read at: two nodes agreeing on a balance AND its count have folded the same records.
 */
export async function portfolio(wire, holderHex) {
  const lines = String(await wire.send(`PORTFOLIO\t${holderHex}`)).trim().split("\n");
  if (lines[0].startsWith("PORTFOLIO_ERR\t")) {
    const [, failure, missing, remedy] = lines[0].split("\t");
    return { refused: { failure, missing, remedy } };
  }
  if (!lines[0].startsWith("PORTFOLIO\t") || lines[lines.length - 1] !== "PORTFOLIO_END") return null;
  const out = { fxn: { live: 0n, locked: 0n, credits: 0, indexSize: 0, digest: "" }, native: [], curve: [], anchors: [] };
  for (const line of lines.slice(1, -1)) {
    const c = line.split("\t");
    if (c[0] === "FXN") out.fxn = { live: BigInt(c[1]), locked: BigInt(c[2]), credits: Number(c[3]), indexSize: Number(c[4]), digest: c[5] ?? "" };
    else if (c[0] === "NATIVE") out.native.push({ chainId: c[1], balance: BigInt(c[2]), events: Number(c[3]), digest: c[4] ?? "" });
    else if (c[0] === "CURVE") out.curve.push({ chainId: c[1], tokens: BigInt(c[2]) });
    else if (c[0] === "ANCHOR") out.anchors.push({ chainId: c[1], sequence: Number(c[2]), root: c[3], records: Number(c[4]), digest: c[5] });
  }
  return out;
}

/**
 * Ask several nodes for the same holder's portfolio and say how far they agree. Two answers AGREE on a figure only if its balance, fold size AND
 * set digest are all equal: equal balances with different digests mean the nodes folded different records and happen to net to the same number.
 * `wires` is `[{name, send}]`. Returns `{ answered, unreachable, fxn, native }` where each of `fxn` / `native[chainId]` is
 * `{ agreed: boolean, groups: [{nodes: [name], value}] }` (groups = distinct answers; one group = all answering nodes agree). `anchors` is the same
 * shape per chain for the certified-segment anchor; `conflicts` lists any two nodes that report the SAME certified sequence with a different
 * root or digest, which is never innocent lag: one of them folded different records (verify with the segments: `recompute_anchor` in chain_segment.rs). A node that is
 * unreachable or answers a refusal is listed in `unreachable`, never counted as agreeing or as holding zero.
 */
export async function comparePortfolios(wires, holderHex) {
  const results = await Promise.all(wires.map(async (w) => {
    try { return { name: w.name, p: await portfolio(w, holderHex) }; } catch { return { name: w.name, p: null }; }
  }));
  const ok = results.filter((r) => r.p && !r.p.refused);
  const unreachable = results.filter((r) => !r.p || r.p.refused).map((r) => r.name);
  const group = (pick) => {
    const by = new Map();
    for (const r of ok) {
      const v = pick(r.p);
      const key = JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x));
      if (!by.has(key)) by.set(key, { nodes: [], value: v });
      by.get(key).nodes.push(r.name);
    }
    const groups = [...by.values()];
    return { agreed: groups.length === 1 && ok.length > 0, groups };
  };
  const chainIds = [...new Set(ok.flatMap((r) => r.p.native.map((n) => n.chainId)))].sort();
  const native = {};
  for (const id of chainIds) native[id] = group((p) => p.native.find((n) => n.chainId === id) ?? null);
  // The anchor is the part a client can CHECK: the last certified segment and a digest of every certified record. Nodes at different
  // sequences are behind one another, not wrong, so they are reported as groups; what must never differ is the digest AT THE SAME sequence.
  const anchors = {};
  for (const id of [...new Set(ok.flatMap((r) => r.p.anchors.map((a) => a.chainId)))].sort()) anchors[id] = group((p) => p.anchors.find((a) => a.chainId === id) ?? null);
  const conflicts = [];
  for (const [id, g] of Object.entries(anchors)) {
    const bySeq = new Map();
    for (const grp of g.groups) {
      if (!grp.value) continue;
      const k = grp.value.sequence;
      if (bySeq.has(k) && (bySeq.get(k).digest !== grp.value.digest || bySeq.get(k).root !== grp.value.root)) conflicts.push({ chainId: id, sequence: k, nodes: [...bySeq.get(k).nodes, ...grp.nodes] });
      else if (!bySeq.has(k)) bySeq.set(k, { ...grp.value, nodes: [...grp.nodes] });
    }
  }
  return { answered: ok.map((r) => r.name), unreachable, fxn: group((p) => p.fxn), native, anchors, conflicts };
}

// ---- Signed balance statements (mirror of src/balance_result.rs) ------------------------------------------------------------------------
// The resolver's signature IS the truth: a claim is the latest signed result naming the holder. A client needs only the resolver's ROOT public key;
// if the resolver changed keys, the handovers (BAL_INFO) prove the successor, and a retired key cannot sign "earlier" because sequence decides.
const BAL_KIND = "KKBALR1";
const HAND_KIND = "KKBALH1";
const BAL_MAGIC = "FLX-BALROWS-V1";
const HAND_MAGIC = "FLX-BALHAND-V1";
const ZERO = "0".repeat(64);
const sha256Hex = async (text) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))), (b) => b.toString(16).padStart(2, "0")).join("");
const hexToBytes = (h) => Uint8Array.from(h.match(/../g) ?? [], (b) => parseInt(b, 16));
const hexUtf8 = (h) => new TextDecoder().decode(hexToBytes(h));

async function verifySigned(record, expectedKind) {
  const cut = record.lastIndexOf("-S");
  if (cut < 0) throw new Error("not a signed record");
  const body = record.slice(0, cut), sig = record.slice(cut + 2);
  const parts = body.split("-");
  if (!parts.includes(expectedKind)) throw new Error(expectedKind === BAL_KIND ? "not a balance result (K must be KBALR1)" : expectedKind === HAND_KIND ? "not a handover (K must be KBALH1)" : "not a recovery rotation (K must be KBALK1)");
  const signer = parts[0].slice(1);
  const key = await crypto.subtle.importKey("raw", hexToBytes(signer), { name: "Ed25519" }, false, ["verify"]);
  if (!(await crypto.subtle.verify({ name: "Ed25519" }, key, hexToBytes(sig), new TextEncoder().encode(body)))) throw new Error(expectedKind === BAL_KIND ? "the resolver's signature does not verify" : expectedKind === HAND_KIND ? "the handover's signature does not verify" : "the rotation's signature does not verify");
  return { signer, parts, field: (p) => parts.find((x) => x.startsWith(p)), cs: parts.filter((x) => /^C[0-9a-f]{64}$/.test(x)).map((x) => x.slice(1)) };
}

/** Verifies one signed handover (integrity and signature only; whether it extends a trust is `Trust.addHandover`'s job). */
export async function verifyHandover(record, blob) {
  const { signer, field, cs } = await verifySigned(record, HAND_KIND);
  const number = Number(field("J").slice(1));
  if (cs.length < 2) throw new Error("missing previous-handover or blob CID");
  if ((await sha256Hex(blob)) !== cs[1]) throw new Error("the handover blob does not match the CID that was signed");
  const lines = blob.split("\n").filter((l) => l.length), head = lines[0].split("\t");
  if (head.length !== 3 || head[0] !== HAND_MAGIC || Number(head[1]) !== number || head[2].length !== 64) throw new Error("the handover header disagrees with the signed record");
  const effective = new Map(lines.slice(1).map((l) => { const [scope, seq] = l.split("\t"); return [scope, Number(seq)]; }));
  return { number, from: signer, to: head[2], effective, prevCid: cs[0], cid: await sha256Hex(record) };
}

const RECROT_KIND = "KKBALK1";
const RECROT_MAGIC = "FLX-BALRECROT-V1";

/** Verifies one signed recovery-key rotation (integrity and signature only; whether it is the next one from the key in force is `Trust.addRecoveryRotation`'s job). */
export async function verifyRecoveryRotation(record, blob) {
  const { signer, field, cs } = await verifySigned(record, RECROT_KIND);
  const number = Number(field("J").slice(1));
  if (cs.length < 2) throw new Error("missing previous-rotation or blob CID");
  if ((await sha256Hex(blob)) !== cs[1]) throw new Error("the rotation blob does not match the CID that was signed");
  const head = blob.split("\n")[0].split("\t");
  if (head.length !== 3 || head[0] !== RECROT_MAGIC || Number(head[1]) !== number || head[2].length !== 64) throw new Error("the rotation header disagrees with the signed record");
  return { number, from: signer, to: head[2], prevCid: cs[0], cid: await sha256Hex(record) };
}

/** Who may sign: root keys plus verified handovers, plus an optional offline recovery key. Mirrors the Rust `Trust` rule for rule. */
export class Trust {
  constructor(roots, recovery = null) { this.roots = new Set(roots); this.recovery = recovery; this.rotations = []; this.handovers = []; }
  /** The recovery key that may sign next: the last rotation's successor, else the pinned one. */
  currentRecovery() { return this.rotations.length ? this.rotations[this.rotations.length - 1].to : this.recovery; }
  /** Is `key` a recovery key there has ever been (the pinned one or any rotation's successor)? */
  isRecoveryKey(key) { return key !== null && (this.recovery === key || this.rotations.some((r) => r.to === key)); }
  /** Adds a recovery-key rotation: signed by the key in force, the next number, onto a key never used before. */
  async addRecoveryRotation(record, blob) {
    const r = await verifyRecoveryRotation(record, blob);
    const cur = this.currentRecovery();
    if (cur === null) throw new Error("this client pinned no recovery key, so it has nothing to rotate");
    if (this.rotations.some((x) => x.cid === r.cid)) return r.number;
    if (r.from !== cur) throw new Error(`${r.from} is not the recovery key in force (${cur})`);
    const last = this.rotations[this.rotations.length - 1];
    const wantN = last ? last.number + 1 : 1, wantPrev = last ? last.cid : ZERO;
    if (r.number !== wantN || r.prevCid !== wantPrev) throw new Error(`expected recovery rotation ${wantN} on ${wantPrev}, got ${r.number} on ${r.prevCid}`);
    const used = (k) => this.recovery === k || this.rotations.some((x) => x.to === k) || this.roots.has(k) || this.handovers.some((h) => h.to === k || h.from === k);
    if (used(r.to)) throw new Error(`${r.to} has been used as a key before, so it cannot be the new recovery key`);
    this.rotations.push(r);
    return r.number;
  }
  #eff(h, scope) { return h.effective.get(scope) ?? 1; }
  #isRecovery(h) { return this.isRecoveryKey(h.from); }
  #before(key, i) { return this.roots.has(key) || this.handovers.slice(0, i).some((h) => h.to === key); }
  #voided(key, scope, seq, upto) {
    return this.handovers.slice(0, upto).some((h, i) => this.#isRecovery(h) && h.to !== key && this.#eff(h, scope) <= seq && this.#before(key, i));
  }
  #validAt(key, scope, seq, upto) {
    const hs = this.handovers.slice(0, upto);
    if (hs.some((h) => h.from === key && this.#eff(h, scope) <= seq)) return false;
    if (this.#voided(key, scope, seq, upto)) return false;
    if (this.roots.has(key)) return true;
    return hs.some((h, i) => h.to === key && seq >= this.#eff(h, scope) && (this.#isRecovery(h) || this.#validAt(h.from, scope, Math.max(this.#eff(h, scope) - 1, 0), i)));
  }
  maySign(key, scope, seq) { return this.#validAt(key, scope, seq, this.handovers.length); }
  #active(key) {
    return (this.roots.has(key) || this.handovers.some((x) => x.to === key)) && !this.handovers.some((x) => x.from === key)
      && !this.handovers.some((h, i) => this.#isRecovery(h) && h.to !== key && this.#before(key, i));
  }
  /** A handover signed by the recovery key takes the place of the one at its number (the one a leaked key signed). Anything else must extend the chain. */
  async addHandover(record, blob) {
    const h = await verifyHandover(record, blob);
    if (this.#isRecovery(h)) {
      if (this.currentRecovery() !== h.from && !this.handovers.some((x) => x.cid === h.cid)) throw new Error(`${h.from} is a retired recovery key; the one in force is ${this.currentRecovery()}`);
      const n = h.number;
      if (n < 1 || n > this.handovers.length + 1) throw new Error(`a recovery handover must be number 1..${this.handovers.length + 1}, got ${n}`);
      if (this.handovers[n - 1]?.cid === h.cid) return n;
      const wantPrev = n === 1 ? ZERO : this.handovers[n - 2].cid;
      if (h.prevCid !== wantPrev) throw new Error(`the recovery handover must extend ${wantPrev}, it names ${h.prevCid}`);
      const seen = (k) => this.roots.has(k) || this.handovers.slice(0, n - 1).some((x) => x.to === k || x.from === k);
      if (seen(h.to) || this.isRecoveryKey(h.to)) throw new Error(`${h.to} has been trusted before, so it cannot be the recovery successor`);
      this.handovers.length = n - 1;
      this.handovers.push(h);
      return n;
    }
    const last = this.handovers[this.handovers.length - 1];
    const wantN = last ? last.number + 1 : 1, wantPrev = last ? last.cid : ZERO;
    if (h.number !== wantN || h.prevCid !== wantPrev) throw new Error(`expected handover ${wantN} on ${wantPrev}, got ${h.number} on ${h.prevCid}`);
    if (!this.#active(h.from)) throw new Error(`${h.from} is not a currently active resolver key`);
    this.handovers.push(h);
    return h.number;
  }
}

const asTrust = (t) => (t instanceof Trust ? t : new Trust(t));

/** Verifies one signed balance result with native Ed25519. `trust` is a `Trust` or an array of root keys. Returns
 * `{resolver, scope, sequence, prevCid, stateDigest, rows: [{holder, amount: BigInt}], cid, issuedAt}` or throws. */
export async function verifyBalanceResult(record, rowsBlob, trust) {
  const t = asTrust(trust);
  const { signer: resolver, field, cs } = await verifySigned(record, BAL_KIND);
  const scope = hexUtf8(field("W").slice(1)), sequence = Number(field("J").slice(1));
  if (!t.maySign(resolver, scope, sequence)) throw new Error(`${resolver} is not an authorized balance resolver for ${scope} at sequence ${sequence}`);
  const issuedAt = Number(field("M").slice(1));
  if (cs.length < 2) throw new Error("missing previous-result or rows CID");
  if ((await sha256Hex(rowsBlob)) !== cs[1]) throw new Error("the rows do not match the CID the resolver signed");
  const lines = rowsBlob.split("\n").filter((l) => l.length), head = lines[0].split("\t");
  if (head.length !== 4 || head[0] !== BAL_MAGIC || head[1] !== scope || Number(head[2]) !== sequence) throw new Error("the rows header disagrees with the signed record");
  const rows = lines.slice(1).map((l) => { const [holder, amount] = l.split("\t"); return { holder, amount: BigInt(amount) }; });
  return { resolver, scope, sequence, prevCid: cs[0], stateDigest: head[3], rows, cid: await sha256Hex(record), issuedAt };
}

function parseClaimReply(reply) {
  const lines = String(reply).trim().split("\n");
  if (lines[0].startsWith("BAL_ERR\t")) { const [, failure, missing, remedy] = lines[0].split("\t"); return { refused: { failure, missing, remedy } }; }
  if (lines[0].startsWith("BAL_NONE\t")) return { none: true };
  if (!lines[0].startsWith("BAL_CLAIM\t") || lines[lines.length - 1] !== "BAL_CLAIM_END") return null;
  const record = lines.find((l) => l.startsWith("RESULT\t"))?.slice(7), rowsHex = lines.find((l) => l.startsWith("ROWS\t"))?.slice(5);
  if (!record || rowsHex === undefined) return null;
  return { sequence: Number(lines[0].split("\t")[3]), record, rows: hexUtf8(rowsHex) };
}

const infoLines = async (wire) => {
  const lines = String(await wire.send("BAL_INFO\t")).trim().split("\n");
  if (!lines[0].startsWith("BAL_INFO\t") || lines[lines.length - 1] !== "BAL_INFO_END") throw new Error("unreadable BAL_INFO reply");
  const pick = (tag) => lines.filter((x) => x.startsWith(tag + "\t")).map((l) => { const [, rec, hex] = l.split("\t"); return [rec, hexUtf8(hex)]; });
  return { recoveries: pick("RECOVERY"), handovers: pick("HANDOVER") };
};

/**
 * `BAL_INFO`: the recovery rotations and handovers a node holds, verified into a `Trust` that starts from YOUR pinned keys. With ONE wire, a record that does not extend
 * your pinned keys is an error. With SEVERAL wires (an array), each is asked independently, a wire that fails or serves nonsense is skipped, and the union is applied
 * recovery rotations first, then recovery handovers, then the rest: a recovery handover is signed by a key you pinned, so one honest source among the wires is enough
 * to reveal it, and a hostile node can withhold it but cannot be the only one you ask. Throws when no wire answered at all. The returned trust carries `sources`.
 */
export async function fetchTrust(wires, rootKeys, recoveryKey = null) {
  const t = new Trust(rootKeys, recoveryKey);
  if (!Array.isArray(wires)) {
    const { recoveries, handovers } = await infoLines(wires);
    for (const [rec, blob] of recoveries) await t.addRecoveryRotation(rec, blob);
    for (const [rec, blob] of handovers) await t.addHandover(rec, blob);
    t.sources = { asked: 1, answered: 1 };
    return t;
  }
  const got = [];
  for (const w of wires) { try { got.push(await infoLines(w)); } catch { /* this source is skipped */ } }
  if (!got.length) throw new Error(`none of the ${wires.length} nodes asked answered BAL_INFO`);
  const uniq = (xs) => [...new Map(xs.map(([r, b]) => [r, [r, b]])).values()];
  const rots = uniq(got.flatMap((g) => g.recoveries)), hos = uniq(got.flatMap((g) => g.handovers));
  const parsedR = [];
  for (const [r, b] of rots) { try { parsedR.push({ r, b, n: (await verifyRecoveryRotation(r, b)).number }); } catch { /* ignored */ } }
  for (const x of parsedR.sort((a, b) => a.n - b.n)) { try { await t.addRecoveryRotation(x.r, x.b); } catch { /* not on the chain we trust */ } }
  const parsedH = [];
  for (const [r, b] of hos) { try { const h = await verifyHandover(r, b); parsedH.push({ r, b, n: h.number, rec: t.isRecoveryKey(h.from) }); } catch { /* ignored */ } }
  parsedH.sort((a, b) => (b.rec - a.rec) || (a.n - b.n));
  for (let progress = true; progress;) {
    progress = false;
    for (const x of parsedH) { if (x.done) continue; try { await t.addHandover(x.r, x.b); x.done = progress = true; } catch { /* does not extend what we trust (yet, or ever) */ } }
  }
  t.sources = { asked: wires.length, answered: got.length };
  return t;
}

/**
 * `BAL_CLAIM <scope> <holder>` and verify it. Scopes: `native:<chain>`, `curve:<chain>`, `fxn` (live), `fxn-locked`. `trust` is a `Trust` or root keys; if the signer is not
 * trusted yet and only root keys were given, the node's handovers are fetched and checked once. Options: `recovery` (the offline recovery public key you pinned beside the root; without it a recovery handover is refused), `trustWires` (several nodes to ask for the handovers and recovery records, so one hostile node cannot hide a recovery), `maxAgeSecs` refuses a statement issued longer ago than that
 * (by `nowSecs`, default the client's clock). Returns `{ amount: BigInt, sequence, stateDigest, resolver, issuedAt, ageSecs, result }`, `{ refused }` or `{ unverified }`.
 * A node can refuse to answer; it cannot make up a figure without the resolver's key.
 */
export async function verifiedBalance(wire, scope, holderHex, trust, { maxAgeSecs, nowSecs, recovery = null, trustWires = null } = {}) {
  // With a recovery key pinned, or several nodes to ask, the recovery records are consulted FIRST: a statement signed by a root that has since been
  // retired verifies against a bare root key, so waiting for a failure would never look.
  if (!(trust instanceof Trust) && (recovery || trustWires)) { try { trust = await fetchTrust(trustWires ?? wire, trust, recovery); } catch { /* fall back to the bare roots */ } }
  const got = parseClaimReply(await wire.send(`BAL_CLAIM\t${scope}\t${holderHex}`));
  if (!got) return { unverified: "unreadable reply" };
  if (got.refused) return { refused: got.refused };
  if (got.none) return { unverified: "no statement" };
  const check = async (t) => {
    const result = await verifyBalanceResult(got.record, got.rows, t);
    if (result.scope !== scope) throw new Error("the statement is for another scope");
    const row = result.rows.find((r) => r.holder === holderHex);
    if (!row) throw new Error("the statement does not name this holder");
    const ageSecs = (nowSecs ?? Math.floor(Date.now() / 1000)) - result.issuedAt;
    if (maxAgeSecs !== undefined && ageSecs > maxAgeSecs) throw new Error(`the statement is ${ageSecs} s old; the limit is ${maxAgeSecs} s`);
    return { amount: row.amount, sequence: result.sequence, stateDigest: result.stateDigest, resolver: result.resolver, issuedAt: result.issuedAt, ageSecs, result };
  };
  try { return await check(trust); } catch (e) {
    if (!/not an authorized/.test(e.message) || trust instanceof Trust) return { unverified: e.message };
    try { return await check(await fetchTrust(trustWires ?? wire, trust, recovery)); } catch (e2) { return { unverified: e2.message }; }
  }
}

/** Walks `BAL_RESULT` from `fromSeq` to `toSeq` and checks every link: signature, rows, sequence and previous CID. Returns the head result or throws. */
export async function auditBalanceChain(wire, scope, fromSeq, toSeq, trust) {
  const t = trust instanceof Trust ? trust : await fetchTrust(wire, trust);
  let prev = null;
  for (let seq = fromSeq; seq <= toSeq; seq++) {
    const got = parseClaimReply(await wire.send(`BAL_RESULT\t${scope}\t${seq}`));
    if (!got || got.none || got.refused) throw new Error(`result ${seq} is not available from this node`);
    const r = await verifyBalanceResult(got.record, got.rows, t);
    if (prev && (r.scope !== prev.scope || r.sequence !== prev.sequence + 1 || r.prevCid !== prev.cid)) throw new Error(`result ${seq} does not extend the one before it`);
    prev = r;
  }
  return prev;
}

/**
 * Everything a holder owns, each figure SIGNED: native balances and curve holdings (from `PORTFOLIO`'s lists of chains), FXN live and FXN locked, each verified by
 * `verifiedBalance`. Rows the resolver refuses or that fail verification are reported as such, never replaced by the live number.
 * Returns `{ rows: [{scope, amount, sequence, ageSecs, stateDigest} | {scope, live, problem}], trusted }`.
 */
export async function signedPortfolio(wire, holderHex, trust, opts = {}) {
  const live = await portfolio(wire, holderHex);
  if (!live || live.refused) return { rows: [], problem: live?.refused?.failure ?? "unreadable portfolio" };
  const t = trust instanceof Trust ? trust : await fetchTrust(opts.trustWires ?? wire, trust, opts.recovery ?? null).catch(() => new Trust(trust, opts.recovery ?? null));
  const want = [...live.native.map((n) => ({ scope: `native:${n.chainId}`, live: n.balance })), ...live.curve.map((c) => ({ scope: `curve:${c.chainId}`, live: c.tokens })), { scope: "fxn", live: live.fxn.live }, { scope: "fxn-locked", live: live.fxn.locked }]
    .filter((w) => w.live > 0n || w.scope === "fxn");
  const rows = [];
  for (const w of want) {
    const v = await verifiedBalance(wire, w.scope, holderHex, t, opts);
    if (v.amount !== undefined) rows.push({ scope: w.scope, amount: v.amount, sequence: v.sequence, ageSecs: v.ageSecs, stateDigest: v.stateDigest, live: w.live });
    else rows.push({ scope: w.scope, live: w.live, problem: v.unverified ?? v.refused?.failure ?? "no statement" });
  }
  return { rows, trusted: [...t.roots] };
}

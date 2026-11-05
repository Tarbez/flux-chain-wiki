// FLX Dumb Parser — JavaScript port of dense-wire's kernel door, `src/lib.rs::admit_named`.
//
// This module parses a dense FLX record (ASCII alphanumeric + `-` delimiter) into its boxes, enforces the door's
// grammar invariants, and runs each box's payload rule. Semantics (what a CID points to, what a signature covers) are
// the node's; this is the Dumb Parser and nothing more.
//
// LAW: no WASM, no VM, no bytecode. This is plain ES2022.
//
// Round 11 (2026-11-03, docs/fxn-vs-osf-2026-10-31/19-grammar-atlas-resolvers.md): this door used to read every box
// by its first letter, knew 12 letters, counted a `CHAIN` box as a `C` reference, and still admitted the five retired
// lifecycle kinds (INTENT, OFFER, AGREEMENT, FULFILLMENT, VALUEOBJECT) the node refuses. It now reads the node's way:
// the labels `KIND`, `KK` and `CHAIN` first (longest label, flux-spec 0.4.3 rule 2), then the first letter; every
// letter flux-core's `resolve_dense_block` resolves, with that resolver's payload rule; and the one kind the node
// admits, `LEDGERENTRY`. The parity vectors in `tests/vectors/box-reading-parity.tsv` (derived from the kernel) pin
// it: `web/test/box-reading-parity.test.mjs`.
//
// `native/android/defxn-node/src/dumb-parser.js` is a byte-identical copy, so the Android package installs alone.
// Edit this file, copy it there; the parity test fails while the two differ.

import * as shadow from "./flx-v1-shadow.mjs";

const MAX_MANIFEST_LEN = 65_536;
const ALLOWED = /^[A-Za-z0-9-]+$/;

/** Errors mirror ERR_* bytes in Rust. */
export const ErrGrammar = 1;
export const ErrType = 2;
export const ErrSig = 3;

/** The one kind the node admits (`Kind::from_code`: the registered code `1A` or the long form on the wire). */
const KIND_LEDGERENTRY = "LEDGERENTRY";
const CODE_TO_KIND = { "1A": KIND_LEDGERENTRY, [KIND_LEDGERENTRY]: KIND_LEDGERENTRY };

/** `Kind::required()` and `Kind::min_c()` for `LEDGERENTRY`. */
const REQUIRED_ROLES = ["G", "Y", "V", "M", "H", "J", "C", "S"];
const MIN_C = 2;

/** `lib.rs::LEDGER_MULTI_LETTER_LABELS`: the labels read by more than their first letter. */
export const LEDGER_MULTI_LETTER_LABELS = ["KIND", "CHAIN", "KK"];

/** `lib.rs::ledger_box_label`: a multi-letter label when the box starts with one, else its first character. */
export function ledgerBoxLabel(block) {
  for (const token of LEDGER_MULTI_LETTER_LABELS) {
    if (block.startsWith(token)) return token;
  }
  return block.length ? block[0] : "";
}

/** `chain::is_chain_id_shape`: 3-32 lowercase letters and digits. */
const isChainIdShape = (v) => /^[a-z0-9]{3,32}$/.test(v);

// ---- flux-core `roles.rs` payload rules (pinned rev e22d0a1), one per letter `resolve_dense_block` dispatches ----

const I64_MAX = 9223372036854775807n;
const U64_MAX = 18446744073709551615n;
const fitsI64 = (digits) => BigInt(digits) <= I64_MAX;
const isLowerHex = (s) => /^[0-9a-f]+$/.test(s);
const isAlnum = (s) => /^[A-Za-z0-9]+$/.test(s);
/** `generated.rs::PAYLOAD_FLOORS`. */
const FLOORS = { G: 32, S: 64, C: 16 };
const STATUS_VALUES = ["PENDING", "APPROVED", "EXECUTED", "REJECTED"];
const ACTION_VERBS = ["LIQUIDITYREMOVE", "LIQUIDITYADD", "COLLABORATE", "DELEGATE", "REGISTER", "ENDORSE", "SUPPORT", "DELETE", "FOLLOW", "NOTIFY", "SETTLE", "UPDATE", "QUERY", "CITE", "MINT", "SELL", "SEND", "BUY"];
const ACTION_FLAGS = ["X"];
const LATTICE_SCALE_CODES = ["0", "2", "4", "6"];
const MANIFEST_TYPE_CODES = new Set(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "0A", "0B", "0C", "0D", "0E", "0F", "0G", "0H", "0I", "0J", "0K", "0L", "0M", "0N", "0O", "0P", "0Q", "0R", "0S", "0T", "0U", "0V", "0W", "0X", "0Y", "0Z", "10", "11", "12", "13"]);

/** `unpack_coded_fields`: a leading digit run that fits an i64, then `<UPPERCASE><digits?>` groups that fit too. */
function codedFields(p) {
  const lead = /^\d+/.exec(p);
  if (!lead || !fitsI64(lead[0])) return false;
  let rest = p.slice(lead[0].length);
  while (rest.length) {
    const m = /^([A-Z])(\d*)/.exec(rest);
    if (!m) return false;
    if (m[2] && !fitsI64(m[2])) return false;
    rest = rest.slice(m[0].length);
  }
  return true;
}
const numeric = (p) => /^\d+$/.test(p) && fitsI64(p);
const opaque = (letter) => (p) => p.length > 0 && isAlnum(p) && p.length >= (FLOORS[letter] ?? 0);
const hexPayload = (decode) => (p) => {
  if (!p.length || !isLowerHex(p) || p.length % 2 !== 0) return false;
  if (!decode) return true;
  try { utf8OfHex(p); return true; } catch { return false; }
};

/** Each letter's rule over the payload (the box after its letter). `true` when the box meets it. */
const RULE = {
  I: codedFields,
  B: codedFields,
  A: (p) => ACTION_VERBS.some((verb) => p.startsWith(verb) && [...p.slice(verb.length)].every((c) => ACTION_FLAGS.includes(c))),
  T: (p) => {
    const m = /^(\d+)([A-Z]+)$/.exec(p);
    if (m) return m[1].length <= 19 && fitsI64(m[1]);
    return p.length > 0 && isAlnum(p);
  },
  R: () => true,
  G: opaque("G"),
  Y: (p) => MANIFEST_TYPE_CODES.has(p) || /^[A-Z][A-Z0-9]*$/.test(p),
  S: opaque("S"),
  C: opaque("C"),
  M: numeric,
  V: numeric,
  H: hexPayload(false),
  P: (p) => (p[0] === "1" || p[0] === "0") && hexPayload(true)(p.slice(1)),
  D: numeric,
  Q: hexPayload(true),
  O: hexPayload(true),
  L: (p) => /^\d+$/.test(p) && LATTICE_SCALE_CODES.includes(p[0]) && p.length > 1 && BigInt(p.slice(1)) <= U64_MAX,
  W: hexPayload(false),
  U: (p) => STATUS_VALUES.includes(p),
  E: hexPayload(true),
};

// Migration step 3: this door and its lookups, in shadow beside the generated V1 reader (flx-v1-shadow.mjs).
const DOOR_ADMIT = new shadow.Door("browser door admit");
const DOOR_PAYLOAD = new shadow.Door("browser door Raw.payload");
const DOOR_C = new shadow.Door("browser door Raw.c");
const DOOR_SIGNATURE = new shadow.Door("browser door signaturePrefix");

/** Parse-and-validate a record exactly as the node's door does. Returns a `Raw` or throws a `ParseError`. The
 *  generated V1 reader reads it too, in shadow; this door's verdict stands. */
export function admit(text) {
  let raw;
  try {
    raw = admitV1(text);
  } catch (e) {
    if (e instanceof ParseError) shadow.verdict(DOOR_ADMIT, text, { ok: false, code: e.code });
    throw e;
  }
  shadow.verdict(DOOR_ADMIT, text, { ok: true, labels: raw.blocks.map(ledgerBoxLabel) });
  return raw;
}

function admitV1(text) {
  // grammar door: browser door admit
  if (!text) throw new ParseError(ErrGrammar, "the record is empty");
  if (text.length > MAX_MANIFEST_LEN) throw new ParseError(ErrGrammar, `the record is over the ${MAX_MANIFEST_LEN}-byte limit`);
  if (!ALLOWED.test(text)) throw new ParseError(ErrGrammar, "charset: only ASCII letters, digits and '-'");
  const blocks = text.split("-");
  const yBlock = blocks.find((b) => b.startsWith("Y"));
  if (!yBlock) throw new ParseError(ErrGrammar, "no Y box");
  const kind = CODE_TO_KIND[yBlock.slice(1)] ?? null;
  if (!kind) throw new ParseError(ErrType, `unknown Y=${yBlock.slice(1)}: the node admits only YLEDGERENTRY`);

  const seen = new Set();
  let seenKindMarker = false;
  let seenChainScope = false;
  blocks.forEach((block, index) => {
    if (!block) throw new ParseError(ErrGrammar, `box ${index} is empty`);
    const label = ledgerBoxLabel(block);
    if (label === "KIND" || label === "KK") {
      if (seenKindMarker) throw new ParseError(ErrGrammar, `box ${index}: a second kind marker (KIND or KK)`);
      seenKindMarker = true;
      if (!/^[A-Za-z0-9]+$/.test(block.slice(label.length))) throw new ParseError(ErrGrammar, `label ${label}, box ${index}: its marker is empty or not alphanumeric`);
      return;
    }
    if (label === "CHAIN" || label === "N") {
      if (seenChainScope) throw new ParseError(ErrGrammar, `box ${index}: a second chain scope (CHAIN or N)`);
      seenChainScope = true;
      if (!isChainIdShape(block.slice(label.length))) throw new ParseError(ErrGrammar, `label ${label}, box ${index}: the chain id has the wrong shape`);
      return;
    }
    const repeatable = label === "C" || label === "S";
    if (!repeatable) {
      if (seen.has(label)) throw new ParseError(ErrGrammar, `label ${label}, box ${index}: a second box with a label that may appear once`);
      seen.add(label);
    }
    if (label === "J") {
      if (!/^\d+$/.test(block.slice(1))) throw new ParseError(ErrGrammar, `label J, box ${index}: the position is not decimal digits`);
      return;
    }
    const rule = RULE[label];
    if (!rule) throw new ParseError(ErrGrammar, `box ${index}: no resolver for label ${label}`);
    if (!rule(block.slice(1))) throw new ParseError(ErrGrammar, `label ${label}, box ${index}: failed its payload rule`);
  });

  const raw = new Raw(text, kind, blocks);
  for (const r of REQUIRED_ROLES) {
    if (raw.payload(r) === null) throw new ParseError(ErrGrammar, `missing required role ${r}`);
  }
  if (raw.cCount() < MIN_C) throw new ParseError(ErrGrammar, "too few C refs");
  return raw;
}

/** The kernel slicer, `lib.rs::Raw`: by first letter, except that a `CHAIN` box is never a `C` reference. */
export class Raw {
  constructor(text, kind, blocks) {
    this.text = text;
    this.kind = kind;
    this.blocks = blocks;
  }
  payload(role) {
    const b = this.blocks.find((b) => b.startsWith(role) && !(role === "C" && b.startsWith("CHAIN")));
    const found = b ? b.slice(1) : null;
    shadow.lookup(DOOR_PAYLOAD, this.text, role, 0, found);
    return found;
  }
  #cs() {
    return this.blocks.filter((b) => b.startsWith("C") && !b.startsWith("CHAIN"));
  }
  c(n) {
    const cs = this.#cs();
    const found = cs[n] ? cs[n].slice(1) : null;
    shadow.lookup(DOOR_C, this.text, "C", n, found);
    return found;
  }
  cCount() {
    return this.#cs().length;
  }
  /** `Raw::chain_scope`: the `N` box, else the `CHAIN` box. */
  chainScope() {
    const chain = this.blocks.find((b) => b.startsWith("CHAIN"));
    return this.payload("N") ?? (chain ? chain.slice(5) : null);
  }
  /** `Raw::boxes`: every box as `[label, payload]`, labelled by `ledgerBoxLabel`. */
  boxes() {
    return this.blocks.map((b) => {
      const label = ledgerBoxLabel(b);
      return [label, b.slice(label.length)];
    });
  }
  /** Always false: the only kind with an issuance (`VALUEOBJECT`) is retired (`Raw::is_issuance`). */
  isIssuance() {
    return false;
  }
  g() {
    return this.payload("G") ?? "";
  }
}

/** The raw bytes a single-signature record's `S` block covers: everything
 *  before it. The record must carry exactly ONE `S` block and it must be the
 *  LAST block, so that `text === prefix + "-S" + sig`. Why (2026-10-21): this
 *  used to cut at the last "-S" anywhere, so blocks appended AFTER the
 *  signature (`-C<target>`, `-D1`) were admitted though nobody signed them;
 *  a node or anyone on the wire could add a record target or fork a CID.
 *  Throws ParseError(ErrSig) naming which rule failed. */
export function signaturePrefix(text) {
  shadow.firstLetters(DOOR_SIGNATURE, String(text));
  const blocks = String(text).split("-");
  const sBlocks = blocks.filter((b) => b.startsWith("S"));
  if (sBlocks.length === 0) throw new ParseError(ErrSig, "no S");
  if (sBlocks.length !== 1) throw new ParseError(ErrSig, `${sBlocks.length} S blocks; a single-signature record carries exactly one`);
  const last = blocks[blocks.length - 1];
  if (!last.startsWith("S")) throw new ParseError(ErrSig, "the signature is not the record's final block (unsigned blocks follow it)");
  const prefix = text.slice(0, text.length - last.length - 1);
  if (`${prefix}-${last}` !== text) throw new ParseError(ErrSig, "the record is not its signed prefix plus its signature");
  return prefix;
}

export class ParseError extends Error {
  constructor(code, reason) {
    super(`FLX parse: ${reason} (code=${code})`);
    this.code = code;
    this.reason = reason;
  }
}

/** Hex-of-UTF-8 helper for building H blocks client-side. */
export function hexOfUtf8(s) {
  const enc = new TextEncoder().encode(s);
  let out = "";
  for (const b of enc) out += b.toString(16).padStart(2, "0");
  return out;
}

/** Inverse of `hexOfUtf8` — decode a lowercase hex string back to UTF-8
 *  text. Mirrors the Rust `flux_core::roles::utf8_of_hex`. Used to read
 *  back `W` blocks and inline C-block payloads (e.g. `KACLEV1`'s C[1]). */
export function utf8OfHex(hex) {
  if (!isLowerHex(hex) || hex.length % 2 !== 0) {
    throw new Error(`utf8OfHex: not a well-formed lowercase hex string: ${JSON.stringify(hex)}`);
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

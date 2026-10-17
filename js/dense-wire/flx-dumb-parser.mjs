// FLX Dumb Parser — JavaScript port of dense-wire's `admit()` path.
//
// This module parses a dense FLX manifest string (ASCII alphanumeric + `-`
// delimiter) into its blocks, enforces the grammar invariants, and runs a
// shape-level check on each block. Semantics (what a CID points to, what a
// signature covers) are the Smart Resolver's job on the server; this is the
// Dumb Parser and nothing more.
//
// LAW: no WASM, no VM, no bytecode. This is plain ES2022.
//
// Mirrors the Rust implementation in `src/lib.rs::admit` and the subset of
// `flux-core` role resolvers we need (G, Y, V, M, H, J, C, S, K, W, D, N),
// plus (added for the transfer-lifecycle and DAO/treasury kinds) I, R, T.
//
// Kind::code()/Kind::from_code() (src/lib.rs ~61-99) and Kind::required()/
// Kind::min_c() (~180-205) are ported below for the five lifecycle kinds
// (Intent, Offer, Agreement, Fulfillment, ValueObject) alongside the
// pre-existing LedgerEntry kind. The I/R/T shape checks are ported from
// `/Volumes/PortableSSD/flx/flux-core/src/roles.rs`'s `primary`/`referential`/
// `target` resolvers.

const MAX_MANIFEST_LEN = 65_536;
const ALLOWED = /^[A-Za-z0-9-]+$/;

/** Errors mirror ERR_* bytes in Rust. */
export const ErrGrammar = 1;
export const ErrType = 2;
export const ErrSig = 3;

/** Known Y kinds and their constraints. */
const KIND_LEDGERENTRY = "LEDGERENTRY";
const KIND_LEDGERENTRY_SHORT = "1A";
export const KIND_INTENT = "INTENT";
export const KIND_OFFER = "OFFER";
export const KIND_AGREEMENT = "AGREEMENT";
export const KIND_FULFILLMENT = "FULFILLMENT";
export const KIND_VALUEOBJECT = "VALUEOBJECT";

/** Y-block payload -> kind name. Mirrors `Kind::from_code` (src/lib.rs
 *  ~61-74): LedgerEntry alone accepts two spellings (the registered short
 *  code `1A` and the long form `LEDGERENTRY` actually emitted on the wire
 *  today); every other kind has exactly one code, always the short form. */
const CODE_TO_KIND = {
  "0G": KIND_INTENT,
  "0H": KIND_OFFER,
  "0I": KIND_AGREEMENT,
  "0J": KIND_FULFILLMENT,
  "0L": KIND_VALUEOBJECT,
  [KIND_LEDGERENTRY_SHORT]: KIND_LEDGERENTRY,
  [KIND_LEDGERENTRY]: KIND_LEDGERENTRY,
};

/** `Kind::required()`, src/lib.rs ~180-187. */
const REQUIRED_ROLES = {
  [KIND_LEDGERENTRY]: ["G", "Y", "V", "M", "H", "J", "C", "S"],
  [KIND_INTENT]: ["G", "Y", "V", "C", "M", "D", "S"],
  [KIND_OFFER]: ["G", "Y", "V", "C", "M", "D", "S"],
  [KIND_AGREEMENT]: ["G", "Y", "V", "C", "M", "S"],
  [KIND_FULFILLMENT]: ["G", "Y", "V", "C", "M", "S"],
  [KIND_VALUEOBJECT]: ["G", "Y", "V", "I", "R", "H", "T", "C", "M", "S"],
};

/** `Kind::min_c(issuance)`, src/lib.rs ~188-205. ValueObject's minimum
 *  depends on whether it's an issuance (its `I` payload is literally "0"),
 *  so this is a function, not a flat table. */
function minC(kind, isIssuance) {
  switch (kind) {
    case KIND_INTENT: return 1;
    case KIND_OFFER: return 2;
    case KIND_AGREEMENT: return 5;
    case KIND_FULFILLMENT: return 3;
    case KIND_VALUEOBJECT: return isIssuance ? 2 : 4;
    case KIND_LEDGERENTRY: return 2;
    default: return 0;
  }
}

/** Mirrors flux-core's `generated.rs::GLOBALLY_REPEATABLE_ROLES` (every
 *  manifest type, not just these five) and `REPEATABLE_ROLES_BY_TYPE`'s
 *  entries for INTENT/OFFER/AGREEMENT/FULFILLMENT/VALUEOBJECT. LedgerEntry
 *  predates that pinned table and is special-cased separately (its own
 *  `C`/`S` rule, as before this change) — see `src/lib.rs::admit`'s own
 *  LedgerEntry branch. */
const GLOBALLY_REPEATABLE_ROLES = new Set(["S", "P", "O", "L", "E"]);
const REPEATABLE_ROLES_BY_TYPE = {
  [KIND_INTENT]: new Set(["C", "H", "S"]),
  [KIND_OFFER]: new Set(["C", "S"]),
  [KIND_AGREEMENT]: new Set(["C", "S"]),
  [KIND_FULFILLMENT]: new Set(["C", "S"]),
  [KIND_VALUEOBJECT]: new Set(["C", "P", "S"]),
};
function isRepeatableRole(kind, role) {
  if (kind === KIND_LEDGERENTRY) return role === "C" || role === "S";
  if (GLOBALLY_REPEATABLE_ROLES.has(role)) return true;
  return REPEATABLE_ROLES_BY_TYPE[kind]?.has(role) ?? false;
}

/** Shape rules. Each returns true if the block's packed value is valid.
 *  The packed value is `block.slice(1)` (everything after the role letter). */
const SHAPE = {
  // G: 64-char lowercase hex (ed25519 pubkey hex).
  G: (p) => p.length === 64 && isLowerHex(p),
  // Y: alphanumeric word.
  Y: (p) => /^[A-Z0-9]+$/.test(p),
  // V: digits.
  V: (p) => /^\d+$/.test(p),
  // M: digits (unix seconds).
  M: (p) => /^\d+$/.test(p),
  // H: hex (hex-of-UTF-8 of a key). Even length, lowercase hex.
  H: (p) => p.length > 0 && p.length % 2 === 0 && isLowerHex(p),
  // J: digits (position).
  J: (p) => /^\d+$/.test(p),
  // C: SHA-256-shaped content address. The genesis predecessor is the
  // all-zero 64-char sentinel, so it follows the same shape.
  C: (p) => p.length === 64 && isLowerHex(p),
  // S: 128-char lowercase hex (ed25519 sig hex).
  S: (p) => p.length === 128 && isLowerHex(p),
  // K: alphanumeric kind marker (KRSTR1, KEARN1S, ...).
  K: (p) => p.length > 0 && /^[A-Za-z0-9]+$/.test(p),
  // W: hex-of-utf8 (matches flux-core's Wrapped resolver). The dense
  // charset forbids dots, so dotted addresses are hex-encoded by the
  // builders; signer-pubkey W blocks (used by EarnSigner) are already
  // lowercase hex. Even-length lowercase hex, non-empty.
  W: (p) => p.length > 0 && p.length % 2 === 0 && isLowerHex(p),
  // D: digits (deadline, unix seconds).
  D: (p) => /^\d+$/.test(p),
  // N: chain-id scope (Phase B.1). Mirrors `chain::is_chain_id_shape`:
  // 3-32 lowercase alphanumeric. Not in the original table because no
  // pre-existing builder emitted an N block; the new DAO/treasury builders
  // (Y=LEDGERENTRY, K=KDAO1/KDAOTREAS1/KTSPEND1) always do.
  N: (p) => /^[a-z0-9]{3,32}$/.test(p),
  // I: role `primary`, ported from flux-core's `unpack_coded_fields`
  // (roles.rs ~130-192): a mandatory leading digit run (the sequence
  // number), then zero or more `<UPPERCASE letter><optional digits>`
  // groups. Dense-wire's own ValueObject sequence is always plain digits
  // ("0" for an issuance, "1", "2", ... for each successor) with no
  // trailing groups, but this stays a true port rather than narrowing to
  // just `^\d+$`.
  I: (p) => /^\d+([A-Z]\d*)*$/.test(p),
  // R: role `referential` (roles.rs ~298-301) — the grammar gives this
  // role no internal structure at all. The top-level charset/block-split
  // already rules out a dash, so this is just "non-empty".
  R: (p) => p.length > 0,
  // T: role `target`, ported from flux-core's `target`/`numeric_unit_shape`
  // (roles.rs ~222-296): either `<digit-run><UPPERCASE unit>` (rejected
  // outright, not falling back to opaque, if the digit run is over 19
  // chars — mirrors the Rust `numeric_unit_shape` returning `Some(Err)`
  // rather than `None` in that case) or a non-empty dash-free alphanumeric
  // opaque string.
  T: (p) => {
    let i = 0;
    while (i < p.length && p.charCodeAt(i) >= 48 && p.charCodeAt(i) <= 57) i++;
    if (i > 0) {
      const unit = p.slice(i);
      if (unit.length > 0 && /^[A-Z]+$/.test(unit)) {
        return p.slice(0, i).length <= 19;
      }
    }
    return p.length > 0 && /^[A-Za-z0-9]+$/.test(p);
  },
};

/** Parse-and-validate a manifest. Returns a `Raw` object or throws. */
export function admit(text) {
  if (!text || text.length > MAX_MANIFEST_LEN) throw new ParseError(ErrGrammar, "size");
  if (!ALLOWED.test(text)) throw new ParseError(ErrGrammar, "charset");
  const blocks = text.split("-");
  const yBlock = blocks.find((b) => b.startsWith("Y"));
  if (!yBlock) throw new ParseError(ErrGrammar, "no Y");
  const yCode = yBlock.slice(1);
  const kind = CODE_TO_KIND[yCode] ?? null;
  if (!kind) throw new ParseError(ErrType, `unknown Y=${yCode}`);

  const seen = new Set();
  for (const block of blocks) {
    if (!block) throw new ParseError(ErrGrammar, "empty block");
    const role = block[0];
    const packed = block.slice(1);
    if (!isRepeatableRole(kind, role)) {
      if (seen.has(role)) throw new ParseError(ErrGrammar, `duplicate role ${role}`);
      seen.add(role);
    }
    const check = SHAPE[role];
    if (!check) throw new ParseError(ErrGrammar, `unknown role ${role}`);
    if (!check(packed)) throw new ParseError(ErrGrammar, `bad ${role} shape`);
  }

  for (const r of REQUIRED_ROLES[kind]) {
    if (!blocks.some((b) => b.startsWith(r))) {
      throw new ParseError(ErrGrammar, `missing required role ${r}`);
    }
  }
  // `Kind::is_issuance` (src/lib.rs ~236-238): a ValueObject whose `I`
  // payload is literally "0". Computed directly from the blocks (not via
  // `Raw`, which doesn't exist yet) the same way `Kind::min_c` needs it
  // before `Raw` can be constructed on the Rust side too.
  const iBlock = blocks.find((b) => b.startsWith("I"));
  const isIssuance = kind === KIND_VALUEOBJECT && iBlock?.slice(1) === "0";
  const cCount = blocks.filter((b) => b.startsWith("C")).length;
  if (cCount < minC(kind, isIssuance)) {
    throw new ParseError(ErrGrammar, "too few C refs");
  }
  return new Raw(text, kind, blocks);
}

export class Raw {
  constructor(text, kind, blocks) {
    this.text = text;
    this.kind = kind;
    this.blocks = blocks;
  }
  payload(role) {
    const b = this.blocks.find((b) => b.startsWith(role));
    return b ? b.slice(1) : null;
  }
  c(n) {
    const cs = this.blocks.filter((b) => b.startsWith("C"));
    return cs[n] ? cs[n].slice(1) : null;
  }
  /** `Raw::c_count` (src/lib.rs ~230-232). */
  cCount() {
    return this.blocks.filter((b) => b.startsWith("C")).length;
  }
  /** `Raw::is_issuance` (src/lib.rs ~236-238). */
  isIssuance() {
    return this.kind === KIND_VALUEOBJECT && this.payload("I") === "0";
  }
  g() {
    return this.payload("G") ?? "";
  }
}

/** The raw bytes a given `S` block covers. For a single-signature record
 *  that is everything before the final `-S<hex>`. Matches
 *  `signature_prefixes_of` for one-signer manifests. */
export function signaturePrefix(text) {
  const i = text.lastIndexOf("-S");
  if (i < 0) throw new ParseError(ErrSig, "no S");
  return text.slice(0, i);
}

export class ParseError extends Error {
  constructor(code, reason) {
    super(`FLX parse: ${reason} (code=${code})`);
    this.code = code;
    this.reason = reason;
  }
}

function isLowerHex(s) {
  return /^[0-9a-f]+$/.test(s);
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

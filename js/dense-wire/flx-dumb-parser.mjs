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
/** Pointer-graph MVP types (registry/manifest-types.json, provenance
 *  `taxonomy-document`/`grammar-migration`, specVersion 0.4.3). Added
 *  alongside the NAME/TITLE/KIND/CHAIN tokens -- no blockers, confirmed
 *  free of collision with any live manifest type. */
export const KIND_GHOST = "GHOST";
export const KIND_CONTENT = "CONTENT";

/** Y-block payload -> kind name. Mirrors `Kind::from_code` (src/lib.rs
 *  ~61-74): LedgerEntry alone accepts two spellings (the registered short
 *  code `1A` and the long form `LEDGERENTRY` actually emitted on the wire
 *  today); every other kind has exactly one code, always the short form.
 *  GHOST/CONTENT use their registry `code` verbatim (manifest-types.json),
 *  the same convention every other entry here already follows -- an exact
 *  dictionary key, never a prefix, so "0" (GHOST) and "0G" (INTENT) cannot
 *  collide with each other regardless of how role tokens inside the
 *  manifest are resolved. */
const CODE_TO_KIND = {
  "0": KIND_GHOST,
  "0G": KIND_INTENT,
  "0H": KIND_OFFER,
  "0I": KIND_AGREEMENT,
  "0J": KIND_FULFILLMENT,
  "0L": KIND_VALUEOBJECT,
  "1C": KIND_CONTENT,
  [KIND_LEDGERENTRY_SHORT]: KIND_LEDGERENTRY,
  [KIND_LEDGERENTRY]: KIND_LEDGERENTRY,
};

/** `Kind::required()`, src/lib.rs ~180-187. GHOST/CONTENT mirror
 *  manifest-types.json's own `requiredRoles` arrays exactly. */
const REQUIRED_ROLES = {
  [KIND_LEDGERENTRY]: ["G", "Y", "V", "M", "H", "J", "C", "S"],
  [KIND_INTENT]: ["G", "Y", "V", "C", "M", "D", "S"],
  [KIND_OFFER]: ["G", "Y", "V", "C", "M", "D", "S"],
  [KIND_AGREEMENT]: ["G", "Y", "V", "C", "M", "S"],
  [KIND_FULFILLMENT]: ["G", "Y", "V", "C", "M", "S"],
  [KIND_VALUEOBJECT]: ["G", "Y", "V", "I", "R", "H", "T", "C", "M", "S"],
  [KIND_GHOST]: ["G", "Y", "NAME", "M", "S"],
  [KIND_CONTENT]: ["G", "Y", "TITLE", "M", "S"],
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
  // KK: the REAL, PERMANENT on-wire form of a LedgerEntry sub-kind marker.
  // Every one of dense-wire's 23 sub-kind constants (`chain.rs`'s
  // DAO_KIND_FOUND="KDAO1", TREASURY_KIND_SPEND="KTSPEND1", ...) itself
  // conventionally starts with `K`, so role `K` + marker renders on the wire
  // as `K`+`KDAO1` = `KKDAO1`, never `KDAO1` alone. `KK` is registered
  // (registry/role-letters.json, specVersion 0.4.3) to match that real shape
  // exactly -- bare `K` alone stays `reservedInvalid` (the canonical example
  // of the superseded wordy grammar) and still must never resolve; `KK` is a
  // disjoint two-character token, not a reuse of it. Expand the registry to
  // match a live wire format; never rewrite a live wire format (and the
  // native Android dumb-parser, and the cross-language contract tests
  // pinned to these exact bytes) to match a cleaner-looking registry.
  KK: (p) => p.length > 0 && /^[A-Za-z0-9]+$/.test(p),
  // KIND: an ADDITIONAL, OPTIONAL token for any NEW LedgerEntry sub-kind
  // marker with no reason to match the legacy `KK` shape above. Not a
  // migration target -- no existing `KK<marker>` producer needs to change.
  KIND: (p) => p.length > 0 && /^[A-Za-z0-9]+$/.test(p),
  // W: hex-of-utf8 (matches flux-core's Wrapped resolver). The dense
  // charset forbids dots, so dotted addresses are hex-encoded by the
  // builders; signer-pubkey W blocks (used by EarnSigner) are already
  // lowercase hex. Even-length lowercase hex, non-empty.
  W: (p) => p.length > 0 && p.length % 2 === 0 && isLowerHex(p),
  // D: digits (deadline, unix seconds).
  D: (p) => /^\d+$/.test(p),
  // N: the REAL, PERMANENT on-wire form of a LedgerEntry's chain-of-chains
  // scope (Phase B.1), e.g. `Ndefxn`. Mirrors `chain::is_chain_id_shape`:
  // 3-32 lowercase alphanumeric. A deliberate, narrowly-scoped exception to
  // `N`'s global `reservedTooling` status (manifest-types.json's
  // LEDGERENTRY `letterExtensions.N`) -- the NOTIFY collision hazard
  // `reservedTooling` guards against cannot occur here: a chain id is
  // lowercase and 3-32 chars, NOTIFY's hazard shape is uppercase. `N` stays
  // `reservedTooling` everywhere else in the grammar.
  N: (p) => /^[a-z0-9]{3,32}$/.test(p),
  // CHAIN: an ADDITIONAL, OPTIONAL token for a future chain-scope use with
  // no reason to match the legacy bare-`N` shape above. Not a migration
  // target -- no existing `N<chain-id>` producer needs to change.
  CHAIN: (p) => /^[a-z0-9]{3,32}$/.test(p),
  // NAME: a GHOST manifest's human-readable lookup handle (registry/
  // role-letters.json, specVersion 0.4.3) -- dash-free alphanumeric
  // directly, same posture as G/S/C (a lookup handle is already a safe
  // identifier by convention, not free-form prose needing hex-of-UTF-8).
  NAME: (p) => p.length > 0 && /^[A-Za-z0-9]+$/.test(p),
  // TITLE: a CONTENT manifest's title (registry/role-letters.json,
  // specVersion 0.4.3) -- hex-of-UTF-8, same convention as H: real titles
  // contain spaces and punctuation the dash-only alphabet cannot carry
  // literally.
  TITLE: (p) => p.length > 0 && p.length % 2 === 0 && isLowerHex(p),
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

/** Longest-registered-token-first, generated from `SHAPE`'s own keys so a
 *  new role never needs a second place updated. Role recognition is
 *  registry-lookup + longest-match (flux-spec/spec/dense-encoding-v4.md,
 *  specVersion 0.4.3 Rule 2) -- a block's role is whichever key here is the
 *  LONGEST prefix match, never just its first character. This is what makes
 *  `CHAIN...` and `C...` (or `TITLE...` and `T...`, `KIND...` and nothing,
 *  `NAME...` and nothing) resolve to the right role instead of the shorter
 *  one silently absorbing the longer token's blocks. */
const ROLE_TOKENS_LONGEST_FIRST = Object.keys(SHAPE).sort((a, b) => b.length - a.length);

/** Resolve one block to its exact role identity + payload. Every other
 *  function in this file that needs to know "is this block a C block" (the
 *  required-roles check, `cCount`, `isIssuance`, `Raw.payload`/`c`) MUST go
 *  through this -- never `block[0]` or `block.startsWith(letter)` -- because
 *  `CHAIN` is a real registered token that shares a prefix with `C`, and a
 *  `startsWith("C")` scan would wrongly count a `CHAIN...` block as a `C`
 *  block. Returns `null` for a block matching no registered token. */
function resolveRole(block) {
  for (const token of ROLE_TOKENS_LONGEST_FIRST) {
    if (block.startsWith(token)) return { role: token, packed: block.slice(token.length) };
  }
  return null;
}

/** Parse-and-validate a manifest. Returns a `Raw` object or throws. */
export function admit(text) {
  if (!text || text.length > MAX_MANIFEST_LEN) throw new ParseError(ErrGrammar, "size");
  if (!ALLOWED.test(text)) throw new ParseError(ErrGrammar, "charset");
  const blocks = text.split("-");
  const resolved = blocks.map((block) => {
    if (!block) throw new ParseError(ErrGrammar, "empty block");
    const hit = resolveRole(block);
    if (!hit) throw new ParseError(ErrGrammar, `unknown role in ${block}`);
    return hit;
  });
  const yHit = resolved.find((r) => r.role === "Y");
  if (!yHit) throw new ParseError(ErrGrammar, "no Y");
  const yCode = yHit.packed;
  const kind = CODE_TO_KIND[yCode] ?? null;
  if (!kind) throw new ParseError(ErrType, `unknown Y=${yCode}`);

  const seen = new Set();
  for (const { role, packed } of resolved) {
    if (!isRepeatableRole(kind, role)) {
      if (seen.has(role)) throw new ParseError(ErrGrammar, `duplicate role ${role}`);
      seen.add(role);
    }
    const check = SHAPE[role];
    if (!check(packed)) throw new ParseError(ErrGrammar, `bad ${role} shape`);
  }

  for (const r of REQUIRED_ROLES[kind]) {
    if (!resolved.some((hit) => hit.role === r)) {
      throw new ParseError(ErrGrammar, `missing required role ${r}`);
    }
  }
  // `Kind::is_issuance` (src/lib.rs ~236-238): a ValueObject whose `I`
  // payload is literally "0". Computed directly from the resolved blocks
  // (not via `Raw`, which doesn't exist yet) the same way `Kind::min_c`
  // needs it before `Raw` can be constructed on the Rust side too.
  const iHit = resolved.find((r) => r.role === "I");
  const isIssuance = kind === KIND_VALUEOBJECT && iHit?.packed === "0";
  const cCount = resolved.filter((r) => r.role === "C").length;
  if (cCount < minC(kind, isIssuance)) {
    throw new ParseError(ErrGrammar, "too few C refs");
  }
  return new Raw(text, kind, resolved);
}

export class Raw {
  /** `resolved` is an array of `{ role, packed }`, already longest-matched
   *  by `admit()` -- never re-derive role identity from a raw block string
   *  here (that is exactly the `C`/`CHAIN` collision `resolveRole` exists
   *  to prevent). */
  constructor(text, kind, resolved) {
    this.text = text;
    this.kind = kind;
    this.resolved = resolved;
  }
  payload(role) {
    const hit = this.resolved.find((r) => r.role === role);
    return hit ? hit.packed : null;
  }
  c(n) {
    const cs = this.resolved.filter((r) => r.role === "C");
    return cs[n] ? cs[n].packed : null;
  }
  /** `Raw::c_count` (src/lib.rs ~230-232). */
  cCount() {
    return this.resolved.filter((r) => r.role === "C").length;
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

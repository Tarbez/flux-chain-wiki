// A resolver's published grammar, compiled and checked IN THE BROWSER --
// the JS mirror of `src/record_grammar.rs` (architecture batch B2,
// grammar-enforced ResolverRecord admission). Same inputs, same verdicts,
// same refusal texts, kept in step by hand and by
// `web/test/record-grammar.test.mjs`, which runs the Rust module's own
// test mutations against this file.
//
// Why a mirror exists at all: the node (`chain_server.rs`'s `admit_burst`)
// compiles each resolver's `flx-resolver-grammar/1` manifest once and
// refuses any `ResolverRecord` whose blocks fall outside it. The explorer
// (explore.defxn.com) follows the workspace's one reading rule -- nothing
// is taken on the node's word -- so it recomputes the same verdict over
// the same bytes before it labels a row `grammar ✓`. A row the node
// admitted that this file refuses, or the reverse, is a divergence worth
// seeing, which is exactly why this file may not approximate: where the
// Rust module refuses to compile something (a pattern outside its
// anchored class/literal subset, an unknown payload class), this file
// refuses too, naming the same thing, rather than falling back to
// `new RegExp` and quietly accepting more.
//
// What is enforced, label by label, is the resolver's OWN grammar as
// `scripts/derive-resolver-grammar.mjs` derives it from the resolver's
// real builders: a block takes the LONGEST label it starts with (`KKDAO1`
// is `KK`, not `K`), its payload is checked against that label's class
// (`digits`, `lowercase-hex`, `lowercase-alphanumeric`, `uppercase`,
// `opaque-alphanumeric`, `lattice-scalar`, `closed-set`) with the optional `minLength`,
// `evenLength`, `pattern`, `values` tighteners, and a block whose label the
// resolver never declared is refused -- a resolver's grammar is closed by
// its own declaration. The `KK` closed set is the resolver's kinds (its
// leading K already consumed by the two-character label); `kinds` (top
// level, optional) adds per-kind C-count and required-label rules.
//
// Payload semantics are byte-for-byte those of flux-grammar-atlas's own
// generated reader (`grammar-check.js` READER_RULES): a `pattern` on a
// `lowercase-alphanumeric` label REPLACES the class check (custody's T is
// `^[0-9]+FXN$`, uppercase letters and all); `uppercase` is
// `^[A-Z][A-Z0-9]*$`; `opaque-alphanumeric` is `[A-Za-z0-9]+` with a floor
// of 1 (`minLength || 1`); `lowercase-hex` adds `evenLength`.
//
// Two honest non-enforcing states, as in Rust: a blob that is not (and
// does not claim to be) an `flx-resolver-grammar/1` document compiles to
// `{kind: "unspecified", reason}` -- every record passes, and every
// surface says WHY nothing was checked; a blob that CLAIMS the schema and
// cannot be read throws, because a resolver that says it has a grammar
// and cannot be read would admit anything while looking verified.
//
// No dependencies beyond the language. ES module; runs in a browser and
// in Node unchanged.

import { grammarToJson, isGrammarV2, isOfferV2 } from "./flx-resolver-artifacts.mjs";
// The vendored state grammar is a classic script: importing it sets `globalThis.ARK_FLX_STATE` (see flx-kit-codec.mjs).
import "./flx-state-grammar.js";

export const GRAMMAR_SCHEMA = "flx-resolver-grammar/1";

const KNOWN_PAYLOAD_CLASSES = "digits, lowercase-hex, lowercase-alphanumeric, uppercase, opaque-alphanumeric, lattice-scalar, closed-set";

// ---------------------------------------------------------------------
// lattice-scalar: the kernel's own `L` rule. The Rust reader calls
// `flux_core::lattice::LatticeScalar::from_payload` itself; a browser
// cannot, so this is its twin, line for line (same order of checks, same
// messages), and `tests/vectors/lattice-scalar.tsv` -- read by BOTH test
// suites -- is what keeps the two from drifting. The registered scale
// codes are flux-core's `LATTICE_SCALES` (0, 2, 4, 6).
// ---------------------------------------------------------------------

const LATTICE_SCALE_CODES = new Set([0, 2, 4, 6]);
const U64_MAX = 18446744073709551615n;

/** `null` when `payload` is a lattice scalar, else the kernel's own message. */
export function latticeScalarError(payload) {
  const malformed = (reason) => `LatticeResolver: ${reason} in "${payload}"`;
  if (payload === "") return malformed("empty payload");
  if (!/^[0-9]+$/.test(payload)) return malformed("lattice payloads are digits only");
  if (!LATTICE_SCALE_CODES.has(Number(payload[0]))) return malformed("first digit is not a registered lattice scale code");
  if (payload.length === 1) return malformed("scale code with no lattice point");
  if (BigInt(payload.slice(1)) > U64_MAX) return malformed("lattice point does not fit");
  return null;
}

// ---------------------------------------------------------------------
// Pattern: the anchored subset of regex the atlas emits -- a sequence of
// elements, each a character class `[...]` or a literal character, with
// an optional quantifier `+`, `*`, `{n}` or `{m,n}`. Anything else is a
// compile error that names the pattern. Evaluated by the same greedy
// backtracking matcher as Rust's `Pattern::matches`, NOT by `new RegExp`:
// inside `[...]` the Rust parser takes every character literally (no
// negation, no escapes), and `RegExp` would read `[^a]` as a negation --
// a silent divergence between what the node admits and what this page
// reports.
// ---------------------------------------------------------------------

function rustCharDebug(c) {
  // Rust's `{:?}` for a char: single-quoted, with the few escapes that
  // matter for the characters a pattern can realistically contain.
  const escaped = { "'": "\\'", "\\": "\\\\", "\n": "\\n", "\t": "\\t", "\r": "\\r" }[c];
  return `'${escaped ?? c}'`;
}

function parseQuantifierNumber(s) {
  // Rust's `usize::from_str`: optional leading `+`, then digits only.
  if (!/^\+?[0-9]+$/.test(s)) throw new Error("bad quantifier");
  return Number(s.replace(/^\+/, ""));
}

export function compilePattern(source) {
  if (typeof source !== "string" || !source.startsWith("^")) throw new Error("pattern must be anchored with ^ and $");
  const rest = source.slice(1);
  if (!rest.endsWith("$")) throw new Error("pattern must be anchored with ^ and $");
  const chars = [...rest.slice(0, -1)];
  const elements = [];
  let i = 0;
  while (i < chars.length) {
    let cls;
    if (chars[i] === "[") {
      const closeOffset = chars.slice(i).indexOf("]");
      if (closeOffset < 0) throw new Error("unclosed [");
      const close = i + closeOffset;
      const ranges = [];
      let j = i + 1;
      while (j < close) {
        if (j + 2 < close && chars[j + 1] === "-") {
          ranges.push([chars[j], chars[j + 2]]);
          j += 3;
        } else {
          ranges.push([chars[j], chars[j]]);
          j += 1;
        }
      }
      if (ranges.length === 0) throw new Error("empty character class");
      i = close + 1;
      cls = { set: ranges };
    } else if (/^[A-Za-z0-9_]$/.test(chars[i])) {
      cls = { literal: chars[i] };
      i += 1;
    } else {
      throw new Error(`unsupported pattern syntax at ${rustCharDebug(chars[i])}`);
    }
    let min, max;
    if (i < chars.length && chars[i] === "+") {
      i += 1;
      min = 1; max = null;
    } else if (i < chars.length && chars[i] === "*") {
      i += 1;
      min = 0; max = null;
    } else if (i < chars.length && chars[i] === "{") {
      const closeOffset = chars.slice(i).indexOf("}");
      if (closeOffset < 0) throw new Error("unclosed {");
      const close = i + closeOffset;
      const inner = chars.slice(i + 1, close).join("");
      const comma = inner.indexOf(",");
      if (comma >= 0) {
        min = parseQuantifierNumber(inner.slice(0, comma));
        max = parseQuantifierNumber(inner.slice(comma + 1));
      } else {
        min = parseQuantifierNumber(inner);
        max = min;
      }
      i = close + 1;
    } else {
      min = 1; max = 1;
    }
    elements.push({ cls, min, max });
  }
  return { source, elements };
}

function classAccepts(cls, c) {
  if (cls.literal !== undefined) return cls.literal === c;
  return cls.set.some(([lo, hi]) => lo <= c && c <= hi);
}

export function patternMatches(pattern, s) {
  const chars = [...s];
  const { elements } = pattern;
  function go(e, pos) {
    if (e === elements.length) return pos === chars.length;
    const el = elements[e];
    let count = 0;
    let end = pos;
    // Greedy with backtracking: consume as many as allowed, then try shorter.
    while (end < chars.length && (el.max === null || count < el.max) && classAccepts(el.cls, chars[end])) {
      end += 1;
      count += 1;
    }
    for (;;) {
      if (count >= el.min && go(e + 1, end)) return true;
      if (count === 0) return false;
      count -= 1;
      end -= 1;
    }
  }
  return go(0, 0);
}

// ---------------------------------------------------------------------
// compile
// ---------------------------------------------------------------------

/** serde_json's `Value` Display with default features: compact, keys in
 *  sorted order -- what Rust's `got {token}` prints. */
function compactSortedJson(v) {
  if (Array.isArray(v)) return `[${v.map(compactSortedJson).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${compactSortedJson(v[k])}`).join(",")}}`;
  return JSON.stringify(v);
}

/** Rust's `BTreeSet<String>` Debug: `{"KDAO1", "KDAOTREAS1"}`. */
function rustSetDebug(sortedValues) {
  return `{${sortedValues.map((v) => JSON.stringify(v)).join(", ")}}`;
}

// A V2 grammar can carry a whole number above 2^53-1 as a BigInt (what Rust's `as_u64` accepts); mixed comparisons are exact.
const isU64 = (v) => (typeof v === "number" && Number.isInteger(v) && v >= 0) || (typeof v === "bigint" && v >= 0n && v <= 18446744073709551615n);
const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/**
 * Compile a grammar manifest blob.
 *   - `{kind: "unspecified", reason}` for anything that is not (and does
 *     not claim to be) an `flx-resolver-grammar/1` JSON document;
 *   - `{kind: "compiled", labels, kinds, kindRules}` for one that reads;
 *   - throws `Error` for a document that claims the schema and cannot be
 *     read -- the node turns that into a launch/upgrade refusal.
 * Mirrors `record_grammar::compile`.
 */
const STATE_LABELS = new Set(["K", "I", "S", "N", "B", "Z", "O", "A"]);

function excerpt(text) {
  return JSON.stringify(text.length > 40 ? `${text.slice(0, 40)}...` : text);
}

/** FLX state records are a NEW form, judged strictly (mirrors `record_grammar::compile`): a value that is not a
 * grammar document is refused by name -- a missing or wrong `schema` would launch a grammar enforcing nothing, and an
 * offer in the grammar slot is a slot swap. JSON keeps its older verdicts. */
function requireGrammarSchema(value) {
  const schema = isObject(value) && typeof value.schema === "string" ? value.schema : undefined;
  if (schema === GRAMMAR_SCHEMA) return;
  if (schema === "flx-resolver-offer/1") {
    throw new Error("grammar manifest: the FLX state records are an flx-resolver-offer/1 offer manifest, not a grammar. Missing: an flx-resolver-grammar/1 document (FLX-RESOLVER-GRAMMAR-V2 or FLX state records with that schema). To fix: publish the resolver's grammar manifest, not its offer, in the grammar slot");
  }
  throw new Error(`grammar manifest: the FLX state records carry schema ${schema === undefined ? "None" : `Some(${JSON.stringify(schema)})`}, not ${GRAMMAR_SCHEMA}. Missing: a \`schema\` field naming ${GRAMMAR_SCHEMA} (a grammar with no or another schema would launch enforcing nothing). To fix: publish the grammar in its own grammar (FLX-RESOLVER-GRAMMAR-V2, scripts/derive-resolver-grammar.mjs), then submit the record again`);
}

/** A grammar body that does not start with `{`: `{kind:"unspecified", reason}`, `{kind:"value", value}` for FLX state
 * records (the value they decode to), or a thrown refusal naming the failure, the missing thing and the remedy. */
function nonObjectGrammarBody(trimmed) {
  if (trimmed.startsWith("FLX-RESOLVER-GRAMMAR-V1")) {
    return { kind: "unspecified", reason: "legacy FLX-RESOLVER-GRAMMAR-V1 text (declares commands, not label rules)" };
  }
  if (trimmed.startsWith("FLX-RESOLVER-OFFER-V1")) {
    throw new Error("grammar manifest: the body is a legacy FLX-RESOLVER-OFFER-V1 text, not a grammar. Missing: an flx-resolver-grammar/1 document (FLX-RESOLVER-GRAMMAR-V2 or FLX state records; JSON is read only for what is already on chain) or the legacy FLX-RESOLVER-GRAMMAR-V1 text. To fix: publish the resolver's grammar manifest, not its offer, in the grammar slot");
  }
  if (trimmed.startsWith("FLX-CAPABILITY-MANIFEST-V1")) {
    throw new Error("grammar manifest: the body is a capability manifest (FLX-CAPABILITY-MANIFEST-V1), not a grammar. Missing: an flx-resolver-grammar/1 document. To fix: publish the resolver's grammar manifest in the grammar slot; a capability manifest goes in a CapabilityLaunch");
  }
  if (STATE_LABELS.has(trimmed[0])) {
    try {
      const value = globalThis.ARK_FLX_STATE.decodeState(trimmed);
      if (value === undefined) throw new Error("no records");
      return { kind: "value", value, strict: true };
    } catch (e) {
      throw new Error(`grammar manifest: the body ${excerpt(trimmed)} starts like FLX state records but is not readable as them (${e.message}). Missing: a well-formed document. To fix: publish the grammar in its own grammar (FLX-RESOLVER-GRAMMAR-V2), then submit the record again`);
    }
  }
  if (trimmed.startsWith("[")) return { kind: "unspecified", reason: "grammar blob is not a JSON document" };
  try {
    JSON.parse(trimmed); // a complete JSON scalar never claimed the schema
    return { kind: "unspecified", reason: "grammar blob is not a JSON document" };
  } catch {
    throw new Error(`grammar manifest: the blob body ${excerpt(trimmed)} has a header no reader here recognises. Missing: a grammar in its own grammar (FLX-RESOLVER-GRAMMAR-V2) or the legacy FLX-RESOLVER-GRAMMAR-V1 text. To fix: publish the resolver's grammar manifest (scripts/derive-resolver-grammar.mjs), then submit the record again`);
  }
}

export function compileGrammar(manifest) {
  const trimmed = String(manifest ?? "").trimStart();
  // WARCH19 steps 2-4: a grammar manifest in its own grammar (`FLX-RESOLVER-GRAMMAR-V2`) reads as the very document
  // its JSON is and compiles below exactly as JSON does. One that fails its own grammar is REFUSED, never read as
  // unspecified; an offer manifest in the grammar slot is refused by name (as `record_grammar::compile` does).
  if (isOfferV2(trimmed)) {
    throw new Error(
      "grammar manifest: the body is an FLX-RESOLVER-OFFER-V2 offer manifest, not a grammar. Missing: an flx-resolver-grammar/1 document (FLX-RESOLVER-GRAMMAR-V2 or FLX state records; JSON is read only for what is already on chain) or the legacy FLX-RESOLVER-GRAMMAR-V1 text. To fix: publish the resolver's grammar manifest, not its offer, in the grammar slot",
    );
  }
  let doc;
  if (isGrammarV2(trimmed)) {
    try {
      doc = grammarToJson(String(manifest));
    } catch (e) {
      throw new Error(`grammar manifest: ${e.message}`);
    }
  } else if (!trimmed.startsWith("{")) {
    // WARCH19 step 1, the JS half (mirrors `record_grammar::compile` over `blob_doc::json_text_of`): only the legacy
    // V1 grammar text, and JSON that is not a `{` document, are unspecified; FLX state records compile as the JSON
    // they encode; every other body is refused by name, never read as "checks nothing".
    const doc = nonObjectGrammarBody(trimmed);
    if (doc.kind === "unspecified") return doc;
    requireGrammarSchema(doc.value);
    return compileGrammar(JSON.stringify(doc.value));
  } else {
    try {
      doc = JSON.parse(trimmed);
    } catch (e) {
      throw new Error(`grammar manifest is not valid JSON: ${e.message}`);
    }
  }
  const schema = isObject(doc) ? doc.schema : undefined;
  if (typeof schema !== "string") {
    return { kind: "unspecified", reason: "grammar blob is JSON with no `schema` field" };
  }
  if (schema !== GRAMMAR_SCHEMA) {
    return { kind: "unspecified", reason: `grammar blob has schema ${JSON.stringify(schema)}, not ${GRAMMAR_SCHEMA}` };
  }
  const tokens = isObject(doc.grammar) && Array.isArray(doc.grammar.roleTokens) ? doc.grammar.roleTokens : null;
  if (!tokens) throw new Error(`${GRAMMAR_SCHEMA}: \`grammar.roleTokens\` must be an array`);
  if (tokens.length === 0) throw new Error(`${GRAMMAR_SCHEMA}: \`grammar.roleTokens\` is empty; a grammar with no labels admits nothing`);

  const labels = [];
  let kinds = null;
  for (const token of tokens) {
    const letter = isObject(token) ? token.letter : undefined;
    if (typeof letter !== "string" || !/^[A-Z]+$/.test(letter)) {
      throw new Error(`${GRAMMAR_SCHEMA}: every roleToken needs an uppercase \`letter\`, got ${compactSortedJson(token)}`);
    }
    const label = letter;
    const payload = token.payload;
    if (typeof payload !== "string") throw new Error(`${GRAMMAR_SCHEMA}: roleToken ${label} has no \`payload\` class`);
    let rule;
    switch (payload) {
      case "digits": rule = { type: "digits" }; break;
      case "lowercase-hex": rule = { type: "lowercase-hex", even: token.evenLength === true }; break;
      case "lowercase-alphanumeric": rule = { type: "lowercase-alphanumeric" }; break;
      case "uppercase": rule = { type: "uppercase" }; break;
      case "opaque-alphanumeric": rule = { type: "opaque-alphanumeric" }; break;
      case "lattice-scalar": rule = { type: "lattice-scalar" }; break;
      case "closed-set": {
        if (!Array.isArray(token.values)) throw new Error(`${GRAMMAR_SCHEMA}: closed-set roleToken ${label} needs \`values\``);
        const values = token.values.filter((v) => typeof v === "string");
        if (values.length === 0) throw new Error(`${GRAMMAR_SCHEMA}: closed-set roleToken ${label} has no values`);
        if (label === "KK") kinds = new Set([...new Set(values.map((v) => `K${v}`))].sort());
        rule = { type: "closed-set", values };
        break;
      }
      default:
        throw new Error(
          `${GRAMMAR_SCHEMA}: roleToken ${label} has payload class ${JSON.stringify(payload)}, which this node cannot enforce (known: ${KNOWN_PAYLOAD_CLASSES})`,
        );
    }
    const minLength = isU64(token.minLength) ? token.minLength : 0;
    let pattern = null;
    if (typeof token.pattern === "string") {
      try {
        pattern = compilePattern(token.pattern);
      } catch (e) {
        throw new Error(`${GRAMMAR_SCHEMA}: roleToken ${label} pattern ${JSON.stringify(token.pattern)}: ${e.message}`);
      }
    }
    if (labels.some((l) => l.label === label)) throw new Error(`${GRAMMAR_SCHEMA}: roleToken ${label} declared twice`);
    labels.push({ label, rule, minLength, pattern });
  }
  // Longest label first, so `KK` is tried before `K` when both exist.
  labels.sort((a, b) => b.label.length - a.label.length || (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));

  const kindRules = new Map();
  if (isObject(doc.kinds)) {
    for (const kind of Object.keys(doc.kinds).sort()) {
      const rule = doc.kinds[kind];
      const cMin = isObject(rule) && isU64(rule.cMin) ? rule.cMin : null;
      if (cMin === null) throw new Error(`${GRAMMAR_SCHEMA}: kinds.${kind} needs cMin`);
      const cMax = isU64(rule.cMax) ? rule.cMax : null;
      if (cMax === null) throw new Error(`${GRAMMAR_SCHEMA}: kinds.${kind} needs cMax`);
      if (cMin > cMax) throw new Error(`${GRAMMAR_SCHEMA}: kinds.${kind} has cMin ${cMin} > cMax ${cMax}`);
      const requiredLabels = Array.isArray(rule.requiredLabels) ? rule.requiredLabels.filter((x) => typeof x === "string") : [];
      for (const l of requiredLabels) {
        if (!labels.some((lr) => lr.label === l)) {
          throw new Error(`${GRAMMAR_SCHEMA}: kinds.${kind} requires label ${l}, which roleTokens never declares`);
        }
      }
      if (kinds && !kinds.has(kind)) {
        throw new Error(`${GRAMMAR_SCHEMA}: kinds.${kind} is not in the KK closed set ${rustSetDebug([...kinds])}`);
      }
      kindRules.set(kind, { cMin, cMax, requiredLabels });
    }
  }
  return { kind: "compiled", labels, kinds, kindRules };
}

/** One line for list surfaces, as Rust's `RecordGrammar::summary`:
 *  `enforced:<n> labels,<k> kinds` or `unspecified:<reason>`. */
export function grammarSummary(grammar) {
  if (grammar.kind === "unspecified") return `unspecified:${grammar.reason}`;
  return `enforced:${grammar.labels.length} labels,${grammar.kinds ? grammar.kinds.size : 0} kinds`;
}

/** Rust's `Display for GrammarRefusal`. */
export function formatRefusal({ failure, missing, remedy }) {
  return `${failure}. Missing: ${missing}. To fix: ${remedy}`;
}

// ---------------------------------------------------------------------
// check
// ---------------------------------------------------------------------

const utf8Length = (s) => new TextEncoder().encode(s).length;

function refuse(failure, missing, remedy) {
  return { ok: false, failure, missing, remedy };
}

function checkPayload(rule, payload) {
  const label = rule.label;
  const refusePayload = (what, want) =>
    refuse(
      `${label} block payload ${what}`,
      `${want} for label ${label}`,
      "build the record with the resolver's own builder; its grammar manifest names the exact payload shape",
    );
  if (payload === "") return refusePayload("is empty", "a non-empty payload");
  // Byte-for-byte the semantics of flux-grammar-atlas's own generated
  // reader (`grammar-check.js` READER_RULES); see the header.
  let ok;
  let latticeError = null;
  const r = rule.rule;
  switch (r.type) {
    case "digits": ok = /^[0-9]+$/.test(payload); break;
    case "lowercase-hex": ok = /^[0-9a-f]+$/.test(payload) && (!r.even || utf8Length(payload) % 2 === 0); break;
    case "lowercase-alphanumeric": ok = rule.pattern ? patternMatches(rule.pattern, payload) : /^[a-z0-9]+$/.test(payload); break;
    case "uppercase": ok = /^[A-Z][A-Z0-9]*$/.test(payload); break;
    case "opaque-alphanumeric": ok = /^[A-Za-z0-9]+$/.test(payload); break;
    case "lattice-scalar": latticeError = latticeScalarError(payload); ok = latticeError === null; break;
    case "closed-set": ok = r.values.includes(payload); break;
    default: ok = false;
  }
  if (!ok) {
    const want = {
      "digits": "decimal digits",
      "lowercase-hex": r.even ? "even-length lowercase hex" : "lowercase hex",
      "lowercase-alphanumeric": "lowercase alphanumeric",
      "uppercase": "uppercase alphanumeric",
      "opaque-alphanumeric": "dash-free alphanumeric",
      "lattice-scalar": "a lattice scalar (scale code, then zigzag digits)",
      "closed-set": `one of ${(r.values ?? []).join(",")}`,
    }[r.type];
    return refusePayload(latticeError ? `has the wrong shape (${latticeError})` : "has the wrong shape", want);
  }
  const len = utf8Length(payload);
  if (len < rule.minLength) return refusePayload(`is ${len} chars`, `at least ${rule.minLength} chars`);
  if (rule.pattern && !patternMatches(rule.pattern, payload)) {
    return refusePayload("does not match the declared pattern", `a payload matching ${rule.pattern.source}`);
  }
  return null;
}

/**
 * Check one record's text against a compiled (or unspecified) grammar.
 * `{ok: true}` or `{ok: false, failure, missing, remedy}` -- every refusal
 * names the failure, what is missing, and the remedy. An `unspecified`
 * grammar passes everything (the legacy lane); the caller decides how to
 * report that. Mirrors `RecordGrammar::check` / `CompiledGrammar::check`.
 */
export function checkRecord(grammar, text) {
  if (grammar.kind === "unspecified") return { ok: true };
  const { labels, kinds, kindRules } = grammar;
  let kind = null;
  let cCount = 0;
  const seen = [];
  for (const block of String(text).split("-")) {
    // `labels` is sorted longest-first, so the first match is the
    // longest label the block starts with.
    const rule = labels.find((l) => block.startsWith(l.label));
    if (!rule) {
      const shown = [...block].slice(0, 12).join("");
      return refuse(
        `block \`${shown}…\` uses a label this resolver's grammar never declares`,
        "a roleToken for that label in the resolver's grammar manifest",
        "use only the labels the resolver published, or upgrade the resolver with a grammar that declares this one",
      );
    }
    const payload = block.slice(rule.label.length);
    if (rule.label === "KK") {
      // The kind marker's closed set is checked below as a KIND refusal
      // (naming the declared set), not as a payload shape -- that is the
      // refusal a resolver author needs.
      if (payload === "" || !/^[A-Za-z0-9]+$/.test(payload)) {
        return refuse(
          "KK block payload is not a dash-free alphanumeric kind marker",
          "a kind marker such as KKDAO1",
          "build the record with the resolver's own builder",
        );
      }
    } else {
      const refusal = checkPayload(rule, payload);
      if (refusal) return refusal;
    }
    seen.push(rule.label);
    if (rule.label === "C") cCount += 1;
    if (rule.label === "KK") kind = `K${payload}`;
    else if (rule.label === "K" && kind === null) kind = `K${payload}`;
  }
  if (kinds) {
    if (kind === null) {
      return refuse(
        "record carries no K marker",
        "a KK block naming one of the resolver's declared kinds",
        "add the K block the resolver's grammar requires",
      );
    }
    if (!kinds.has(kind)) {
      return refuse(
        `kind ${kind} is not one this resolver's grammar declares`,
        `a K marker from the resolver's closed set ${[...kinds].join(",")}`,
        "write a record of a declared kind, or upgrade the resolver with a grammar that adds this kind",
      );
    }
  }
  if (kind !== null) {
    const kr = kindRules.get(kind);
    if (kr) {
      if (cCount < kr.cMin || cCount > kr.cMax) {
        return refuse(
          `kind ${kind} carries ${cCount} C blocks`,
          kr.cMin === kr.cMax ? `exactly ${kr.cMin} C blocks` : `between ${kr.cMin} and ${kr.cMax} C blocks`,
          "build the record with the resolver's own builder, which emits the declared C positions",
        );
      }
      for (const required of kr.requiredLabels) {
        if (!seen.includes(required)) {
          return refuse(
            `kind ${kind} is missing its ${required} block`,
            `a ${required} block, which every ${kind} record of this resolver carries`,
            "build the record with the resolver's own builder",
          );
        }
      }
    }
  }
  return { ok: true };
}

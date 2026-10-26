// A resolver's grammar manifest, offer manifest, manifest signature and sample records, each in ITS OWN grammar --
// WARCH19 steps 2-4, the JS twin of `src/resolver_artifacts.rs` (read that module's header for the grammar rules;
// this file keeps them in step by hand and by `test/resolver-artifacts.test.mjs`, which runs both over the same
// committed files byte for byte).
//
// Four artifacts, four grammars: `FLX-RESOLVER-GRAMMAR-V2`, `FLX-RESOLVER-OFFER-V2`, `FLX-MANIFEST-SIG-V1`,
// `FLX-RESOLVER-SAMPLES-V1`. A header line names the artifact and its resolver; then closed labels, one per line,
// TAB-separated, every line (the last included) ending in `\n`. A field takes the payload rule its label declares:
// token (visible ASCII, no space), text (lowercase hex of UTF-8), uint, bool, tokens. Nothing is escaped: a value its
// rule cannot hold is REFUSED on conversion (failure, missing, remedy), never altered, and a text is canonical (it
// must render back to the same bytes), so one document has one text and one CID.
//
// `grammarToJson` / `offerToJson` return the very document the JSON form parses to, so `compileGrammar` and every
// offer reader read a V2 document with the code they read JSON with. `grammarFromJson` / `offerFromJson` are the
// conversion from the committed JSON (the derive script writes the V2 text through them); each reads its own text
// back and refuses unless it is exactly the document given.
//
// No dependencies beyond the language. ES module; runs in a browser and in Node unchanged.

export const GRAMMAR_V2_MAGIC = "FLX-RESOLVER-GRAMMAR-V2";
export const OFFER_V2_MAGIC = "FLX-RESOLVER-OFFER-V2";
export const SIG_V1_MAGIC = "FLX-MANIFEST-SIG-V1";
export const SAMPLES_V1_MAGIC = "FLX-RESOLVER-SAMPLES-V1";

const GRAMMAR_SCHEMA = "flx-resolver-grammar/1";
const OFFER_SCHEMA = "flx-resolver-offer/1";
const SIG_SCHEMA = "flx-manifest-signature/1";

// ---------------------------------------------------------------------
// payload rules
// ---------------------------------------------------------------------

const TY_WORD = {
  token: "a token (visible ASCII, no space or tab)",
  text: "text (lowercase hex of UTF-8, even length)",
  uint: "a whole number (decimal digits, no sign, no leading zero)",
  bool: "true or false",
  tokens: "tokens (visible ASCII, no space or tab)",
};

const isToken = (s) => typeof s === "string" && /^[\x21-\x7e]+$/.test(s);
const isWord = (s) => typeof s === "string" && /^[A-Za-z0-9_-]+$/.test(s);
const isLowerHex = (s, len) => typeof s === "string" && s.length === len && /^[0-9a-f]*$/.test(s);
// A whole number takes exactly what the Rust twin takes: canonical decimal up to u64::MAX (`resolver_artifacts::uint_of`).
// It reads as a JS number when that is exact (<= 2^53-1) and as a BigInt above that, so no value is rounded or refused
// that Rust accepts; a value above u64::MAX is refused on both sides.
const U64_MAX = 18446744073709551615n;
const uintOf = (s) => {
  if (!/^(0|[1-9][0-9]*)$/.test(s)) return null;
  const big = BigInt(s);
  if (big > U64_MAX) return null;
  return big <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(big) : big;
};
const isUint = (v) => (typeof v === "number" && Number.isSafeInteger(v) && v >= 0) || (typeof v === "bigint" && v >= 0n && v <= U64_MAX);

const ENCODER = new TextEncoder();
const hexOfText = (s) => Array.from(ENCODER.encode(s), (b) => b.toString(16).padStart(2, "0")).join("");
function textOfHex(s) {
  if (s.length % 2 !== 0 || !/^[0-9a-f]*$/.test(s)) return null;
  const bytes = Uint8Array.from(s.match(/../g) ?? [], (b) => parseInt(b, 16));
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** A refusal: the failure, the missing thing, the remedy (`Error`). */
function refusal(magic, line, failure, missing, fix) {
  const where = line === null ? `${magic}:` : `${magic} line ${line}:`;
  return new Error(`${where} ${failure}. Missing: ${missing}. To fix: ${fix}`);
}

const show = (v) => (v === undefined ? "absent" : typeof v === "bigint" ? String(v) : JSON.stringify(v));

/** A field's value from its TAB-separated fields, by the label's payload rule. */
function readField(magic, n, label, ty, fields) {
  const bad = (what) => refusal(magic, n, what, `${label} followed by ${TY_WORD[ty]}`, `write the ${label} line in the artifact's own grammar`);
  if (ty === "tokens") {
    const f = fields.find((x) => !isToken(x));
    if (f !== undefined) throw bad(`${JSON.stringify(f)} is not a token`);
    return [...fields];
  }
  if (fields.length !== 1) throw bad(`${label} has ${fields.length} fields, not one`);
  const field = fields[0];
  switch (ty) {
    case "token":
      if (!isToken(field)) throw bad(`${JSON.stringify(field)} is not a token`);
      return field;
    case "text": {
      const t = textOfHex(field);
      if (t === null) throw bad(`${JSON.stringify(field)} is not lowercase hex of UTF-8`);
      return t;
    }
    case "uint": {
      const u = uintOf(field);
      if (u === null) throw bad(`${JSON.stringify(field)} is not a canonical whole number`);
      return u;
    }
    case "bool":
      if (field === "true") return true;
      if (field === "false") return false;
      throw bad(`${JSON.stringify(field)} is not true or false`);
    default:
      throw new Error(`unknown payload rule ${ty}`);
  }
}

/** A JSON value as the fields of a `label` line, or the refusal naming what the rule cannot hold. */
function writeField(magic, ctx, label, ty, v) {
  const cannot = (why) =>
    refusal(magic, null, `${ctx} \`${label}\` ${why}, which ${label} lines cannot hold`, `a value that is ${TY_WORD[ty]}`, "carry it in the field's own rule (a value outside it needs a new grammar version), or fix the manifest's source");
  switch (ty) {
    case "token":
      if (typeof v === "string" && isToken(v)) return [v];
      throw cannot(`is ${show(v)}`);
    case "text":
      if (typeof v === "string") return [hexOfText(v)];
      throw cannot(`is ${show(v)}`);
    case "uint":
      if (isUint(v)) return [String(v)];
      throw cannot(`is ${show(v)}`);
    case "bool":
      if (typeof v === "boolean") return [String(v)];
      throw cannot(`is ${show(v)}`);
    case "tokens":
      if (!Array.isArray(v)) throw cannot(`is ${show(v)}`);
      return v.map((item) => {
        if (typeof item === "string" && isToken(item)) return item;
        throw cannot(`holds ${show(item)}`);
      });
    default:
      throw new Error(`unknown payload rule ${ty}`);
  }
}

/** The lines of a V2 text: `[{n, fields}]`. A text ends in `\n`, holds no `\r` and no empty line. */
function linesOf(magic, text) {
  if (typeof text !== "string" || text === "") throw refusal(magic, null, "the text is empty", `a ${magic} header line`, "write the artifact with its header line, or publish another form");
  if (!text.endsWith("\n")) throw refusal(magic, null, "the text does not end in a newline", "a newline after the last line", "end every line, the last included, with a newline (the canonical form)");
  if (text.includes("\r")) throw refusal(magic, null, "the text holds a carriage return", "lines ended by a bare newline", "write the artifact with newline line ends");
  return text.slice(0, -1).split("\n").map((line, i) => {
    if (line === "") throw refusal(magic, i + 1, "the line is empty", "a label and its fields", "remove the blank line");
    return { n: i + 1, fields: line.split("\t") };
  });
}

function headerOf(magic, lines) {
  const f = lines[0]?.fields;
  if (f && f.length === 2 && f[0] === magic && isWord(f[1])) return f[1];
  throw refusal(magic, 1, `${JSON.stringify(f ? f.join("\t") : "")} is not a ${magic} header`, `${magic} TAB <resolver name>`, "start the artifact with its header line");
}

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** Structural equality, key order ignored (what Rust's `Value` equality is). */
export function sameDocument(a, b) {
  if (a === b) return true;
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((x, i) => sameDocument(x, b[i]));
  if (isObject(a)) {
    if (!isObject(b)) return false;
    const ka = Object.keys(a);
    return ka.length === Object.keys(b).length && ka.every((k) => Object.hasOwn(b, k) && sameDocument(a[k], b[k]));
  }
  return false;
}

function firstDifference(a, b, path) {
  if (isObject(a) && isObject(b)) {
    for (const k of [...Object.keys(a), ...Object.keys(b)]) {
      if (Object.hasOwn(a, k) && Object.hasOwn(b, k) && !sameDocument(a[k], b[k])) return firstDifference(a[k], b[k], `${path}.${k}`);
      if (Object.hasOwn(a, k) && !Object.hasOwn(b, k)) return `${path}.${k} (the document has it, the grammar cannot hold it)`;
      if (!Object.hasOwn(a, k) && Object.hasOwn(b, k)) return `${path}.${k} (the grammar always writes it, the document lacks it)`;
    }
    return path;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let i = 0; i < Math.min(a.length, b.length); i += 1) if (!sameDocument(a[i], b[i])) return firstDifference(a[i], b[i], `${path}[${i}]`);
    return `${path} (length ${a.length} against ${b.length})`;
  }
  return path;
}

/** A JSON object's keys, each taken once; whatever is left over is something the grammar has no label for. */
class Obj {
  constructor(magic, ctx, v) {
    if (!isObject(v)) throw refusal(magic, null, `${ctx} is ${show(v)}, not an object`, "an object", "convert the document the resolver derives");
    this.magic = magic;
    this.ctx = ctx;
    this.map = v;
    this.taken = new Set();
  }

  get(key) {
    this.taken.add(key);
    return Object.hasOwn(this.map, key) ? this.map[key] : undefined;
  }

  finish() {
    const extra = Object.keys(this.map).find((k) => !this.taken.has(k));
    if (extra !== undefined) {
      throw refusal(this.magic, null, `${this.ctx} carries \`${extra}\`, which ${this.magic} has no label for`, "a label for that field in the artifact's grammar", "add the label (a new grammar version), or leave the field out of the source");
    }
  }
}

/** Collects lines of `label TAB field...`. */
function emitter() {
  const out = [];
  const line = (label, fields) => out.push([label, ...fields].join("\t"));
  return { line, text: () => `${out.join("\n")}\n`, out };
}

// ---------------------------------------------------------------------
// grammar manifest: FLX-RESOLVER-GRAMMAR-V2
// ---------------------------------------------------------------------

const G_TOP = [["derived", "token", "derivedAt"], ["by", "token", "derivedBy"], ["from", "text", "derivedFrom"], ["tool", "text", "toolReference"]];
const G_GRAMMAR = [["spec", "token", "roleSpecVersion"], ["typepattern", "token", "manifestTypePattern"]];
const G_LATTICE_HEAD = [["lattice-comment", "text", "$comment"], ["lattice-format", "token", "format"], ["lattice-rationale", "text", "rationale"]];
const G_LATTICE_TAIL = [["lattice-zigzag", "text", "zigzag"], ["lattice-tierisk", "text", "tieRisk"]];
const G_SCALE = [["code", "uint"], ["name", "token"], ["divisor", "uint"], ["use", "text"]];
const G_TOKEN = [
  ["name", "text", "name"],
  ["summary", "text", "summary"],
  ["group", "token", "group"],
  ["payload", "token", "payload"],
  ["pattern", "token", "pattern"],
  ["minlength", "uint", "minLength"],
  ["evenlength", "bool", "evenLength"],
  ["field", "text", "field"],
  ["valuesref", "token", "valuesRef"],
  ["values", "tokens", "values"],
  ["example", "token", "example"],
  ["note", "text", "note"],
  ["profile", "token", "profile"],
  ["zone", "token", "zone"],
  ["status", "token", "status"],
  ["source", "token", "source"],
  ["simplifies", "text", "simplifies"],
  ["narrows", "text", "narrows"],
  ["sameshapeas", "text", "sameShapeAs"],
  ["definedin", "text", "definedIn"],
  ["decode", "bool", "decode"],
  ["repeatable", "bool", "repeatable"],
];

function headerLabel(label) {
  for (const [at, table] of [["top", G_TOP], ["grammar", G_GRAMMAR], ["lattice", G_LATTICE_HEAD], ["lattice", G_LATTICE_TAIL]]) {
    const row = table.find((r) => r[0] === label);
    if (row) return { at, ty: row[1], key: row[2] };
  }
  return null;
}

/** A V2 grammar text as the `flx-resolver-grammar/1` document the JSON form parses to. Throws, naming the line, a
 *  text that is not in the grammar, and a text that is not canonical. */
export function grammarToJson(text) {
  const m = GRAMMAR_V2_MAGIC;
  const lines = linesOf(m, text);
  const resolver = headerOf(m, lines);
  const top = { schema: GRAMMAR_SCHEMA, resolver };
  const grammar = {};
  const lattice = {};
  const scales = [];
  const tokens = [];
  let current = null;
  const kinds = {};
  let phase = 0; // 0: top and lattice; 1: tokens; 2: kinds
  const flush = () => {
    if (current) tokens.push(current);
    current = null;
  };
  for (const { n, fields } of lines.slice(1)) {
    const label = fields[0];
    const args = fields.slice(1);
    const attr = G_TOKEN.find((r) => r[0] === label);
    const head = headerLabel(label);
    if (label === "token") {
      if (phase === 2) throw refusal(m, n, "a token line after the kind lines", "tokens before kinds", "put every token line before the first kind line");
      flush();
      phase = 1;
      current = { letter: readField(m, n, label, "token", args) };
    } else if (label === "kind") {
      flush();
      phase = 2;
      if (args.length < 3) throw refusal(m, n, "a kind line needs a kind, cMin and cMax", "kind TAB <KIND> TAB <cMin> TAB <cMax> TAB <required label>...", "write the kind line in the grammar's shape");
      const [kind, cMin, cMax, ...required] = args;
      readField(m, n, "kind", "token", [kind]);
      if (Object.hasOwn(kinds, kind)) throw refusal(m, n, `kind ${kind} is declared twice`, "each kind once", "remove the duplicate kind line");
      kinds[kind] = {
        cMin: readField(m, n, "kind", "uint", [cMin]),
        cMax: readField(m, n, "kind", "uint", [cMax]),
        requiredLabels: readField(m, n, "kind", "tokens", required),
      };
    } else if (label === "lattice-scale") {
      if (phase !== 0) throw refusal(m, n, "a lattice line after the first token", "the lattice before the tokens", "put the lattice lines before the first token line");
      if (args.length !== G_SCALE.length) throw refusal(m, n, `a lattice-scale line has ${args.length} fields, not ${G_SCALE.length}`, "lattice-scale TAB <code> TAB <name> TAB <divisor> TAB <use>", "write the scale in the grammar's shape");
      const scale = {};
      G_SCALE.forEach(([key, ty], i) => {
        scale[key] = readField(m, n, label, ty, [args[i]]);
      });
      scales.push(scale);
    } else if (head) {
      if (phase !== 0) throw refusal(m, n, `\`${label}\` after the first token`, "the header lines before the tokens", `put the ${label} line before the first token line`);
      const target = head.at === "top" ? top : head.at === "grammar" ? grammar : lattice;
      if (Object.hasOwn(target, head.key)) throw refusal(m, n, `\`${label}\` appears twice`, "each header line once", `remove the second ${label} line`);
      target[head.key] = readField(m, n, label, head.ty, args);
    } else if (attr) {
      if (!current) throw refusal(m, n, `\`${label}\` outside a token`, "a token line before the attribute lines", `put the ${label} line after the \`token <letter>\` line it belongs to`);
      if (Object.hasOwn(current, attr[2])) throw refusal(m, n, `\`${label}\` appears twice in one token`, "each attribute once per token", `remove the second ${label} line`);
      current[attr[2]] = readField(m, n, label, attr[1], args);
    } else {
      throw refusal(
        m,
        n,
        `${JSON.stringify(label)} is not a label of this grammar`,
        "one of derived, by, from, tool, spec, typepattern, lattice-comment, lattice-format, lattice-rationale, lattice-scale, lattice-zigzag, lattice-tierisk, token, name, summary, group, payload, pattern, minlength, evenlength, field, valuesref, values, example, note, profile, zone, status, source, simplifies, narrows, sameshapeas, definedin, decode, repeatable, kind",
        "use only the labels the grammar names",
      );
    }
  }
  flush();
  grammar.own = true;
  if (Object.keys(lattice).length || scales.length) {
    if (scales.length) lattice.scales = scales;
    grammar.latticeScalar = lattice;
  }
  grammar.profiles = {};
  grammar.actionVerbs = [];
  grammar.actionFlags = {};
  grammar.manifestTypes = [];
  grammar.roleTokens = tokens;
  top.grammar = grammar;
  if (Object.keys(kinds).length) top.kinds = kinds;
  if (grammarTextOf(top) !== text) {
    throw refusal(m, null, "the text does not render back to the same bytes", "the canonical rendering (header lines, lattice, tokens with their attributes in order, kinds sorted)", "write the lines in the canonical order, or re-derive the artifact (scripts/derive-resolver-grammar.mjs)");
  }
  return top;
}

/** The canonical V2 text of a grammar document, or the refusal naming what the grammar has no label for. */
function grammarTextOf(doc) {
  const m = GRAMMAR_V2_MAGIC;
  const top = new Obj(m, "the document", doc);
  const schema = top.get("schema");
  if (schema !== GRAMMAR_SCHEMA) throw refusal(m, null, `the document's schema is ${show(schema)}`, `schema ${JSON.stringify(GRAMMAR_SCHEMA)}`, "convert an flx-resolver-grammar/1 document");
  const resolver = top.get("resolver");
  if (!isWord(resolver)) throw refusal(m, null, `the document's resolver is ${show(resolver)}`, "a resolver name (letters, digits, `_`, `-`)", "name the resolver");
  const e = emitter();
  e.out.push(`${m}\t${resolver}`);
  for (const [label, ty, key] of G_TOP) {
    const v = top.get(key);
    if (v !== undefined) e.line(label, writeField(m, "the document", label, ty, v));
  }
  const gv = top.get("grammar");
  if (gv === undefined) throw refusal(m, null, "the document has no `grammar`", "a grammar object", "convert a derived flx-resolver-grammar/1 document");
  const g = new Obj(m, "`grammar`", gv);
  if (g.get("own") !== true) throw refusal(m, null, "`grammar.own` is not true", "an own grammar (nothing reserved)", "derive the grammar with ownGrammar");
  for (const key of ["profiles", "actionFlags"]) {
    const v = g.get(key);
    if (!isObject(v) || Object.keys(v).length) throw refusal(m, null, `\`grammar.${key}\` is absent or not empty`, `an empty \`${key}\` object, the only value ${m} holds`, "derive the grammar with ownGrammar, which writes none");
  }
  for (const key of ["actionVerbs", "manifestTypes"]) {
    const v = g.get(key);
    if (!Array.isArray(v) || v.length) throw refusal(m, null, `\`grammar.${key}\` is absent or not empty`, `an empty \`${key}\` array, the only value ${m} holds`, "derive the grammar with ownGrammar, which writes none");
  }
  for (const [label, ty, key] of G_GRAMMAR) {
    const v = g.get(key);
    if (v !== undefined) e.line(label, writeField(m, "`grammar`", label, ty, v));
  }
  const lv = g.get("latticeScalar");
  if (lv !== undefined) {
    const l = new Obj(m, "`grammar.latticeScalar`", lv);
    for (const [label, ty, key] of G_LATTICE_HEAD) {
      const v = l.get(key);
      if (v !== undefined) e.line(label, writeField(m, "`latticeScalar`", label, ty, v));
    }
    const sv = l.get("scales");
    if (sv !== undefined) {
      if (!Array.isArray(sv)) throw refusal(m, null, `\`latticeScalar.scales\` is ${show(sv)}`, "an array of scales", "derive the grammar with ownGrammar");
      for (const scale of sv) {
        const s = new Obj(m, "a lattice scale", scale);
        const fields = [];
        for (const [key, ty] of G_SCALE) {
          const v = s.get(key);
          if (v === undefined) throw refusal(m, null, `a lattice scale has no \`${key}\``, `\`${key}\` on every scale`, "derive the grammar with ownGrammar");
          fields.push(...writeField(m, "a lattice scale", key, ty, v));
        }
        s.finish();
        e.line("lattice-scale", fields);
      }
    }
    for (const [label, ty, key] of G_LATTICE_TAIL) {
      const v = l.get(key);
      if (v !== undefined) e.line(label, writeField(m, "`latticeScalar`", label, ty, v));
    }
    l.finish();
  }
  const tokens = g.get("roleTokens");
  if (!Array.isArray(tokens)) throw refusal(m, null, `\`grammar.roleTokens\` is ${show(tokens)}`, "an array of role tokens", "derive the grammar with ownGrammar");
  for (const token of tokens) {
    const t = new Obj(m, "a role token", token);
    const letter = t.get("letter");
    if (letter === undefined) throw refusal(m, null, "a role token has no `letter`", "`letter` on every role token", "derive the grammar with ownGrammar");
    e.line("token", writeField(m, "a role token", "token", "token", letter));
    for (const [label, ty, key] of G_TOKEN) {
      const v = t.get(key);
      if (v !== undefined) e.line(label, writeField(m, `role token ${show(letter)}`, label, ty, v));
    }
    t.finish();
  }
  g.finish();
  const kv = top.get("kinds");
  if (kv !== undefined) {
    if (!isObject(kv)) throw refusal(m, null, `\`kinds\` is ${show(kv)}`, "an object of kinds", "derive the grammar with scripts/derive-resolver-grammar.mjs");
    // Rust sorts the keys bytewise; code-unit order is the same for the ASCII tokens a kind is.
    for (const kind of Object.keys(kv).sort()) {
      const k = new Obj(m, `kind ${kind}`, kv[kind]);
      const fields = writeField(m, "a kind", "kind", "token", kind);
      for (const key of ["cMin", "cMax"]) {
        const v = k.get(key);
        if (v === undefined) throw refusal(m, null, `kind ${kind} has no \`${key}\``, `\`${key}\` on every kind`, "derive the grammar with scripts/derive-resolver-grammar.mjs");
        fields.push(...writeField(m, `kind ${kind}`, "kind", "uint", v));
      }
      const required = k.get("requiredLabels");
      if (required === undefined) throw refusal(m, null, `kind ${kind} has no \`requiredLabels\``, "`requiredLabels` on every kind", "derive the grammar with scripts/derive-resolver-grammar.mjs");
      fields.push(...writeField(m, `kind ${kind}`, "kind", "tokens", required));
      k.finish();
      e.line("kind", fields);
    }
  }
  top.finish();
  return e.text();
}

/** The ONE conversion from a committed `flx-resolver-grammar/1` JSON document to its V2 text. It reads its own text
 *  back and refuses unless that is exactly the document given. */
export function grammarFromJson(doc) {
  const text = grammarTextOf(doc);
  const back = grammarToJson(text);
  if (!sameDocument(back, doc)) {
    throw refusal(GRAMMAR_V2_MAGIC, null, `the document does not read back from its text as the same document (first difference: ${firstDifference(doc, back, "$")})`, "a document made only of what the grammar holds", "derive the grammar with scripts/derive-resolver-grammar.mjs");
  }
  return text;
}

// ---------------------------------------------------------------------
// offer manifest: FLX-RESOLVER-OFFER-V2
// ---------------------------------------------------------------------

const O_OFFER = [["summary", "text", "summary"], ["commands", "tokens", "commands"], ["produces", "token", "produces"], ["requires", "token", "requires"]];

/* The header lines, in their canonical order: [label, rule, JSON key]. `by`, `unchecked` and `upgrade` were added on
   2026-10-21 (billing phase 2, step 9), when Resolver Studio's offer writer moved from JSON to this grammar: they carry
   the fields Studio's offers always had. `upgrade` is the words of its text, one field each. The Rust twin is
   `resolver_artifacts::O_HEAD`. */
const O_HEAD = [["derived", "token", "derivedAt"], ["by", "token", "derivedBy"], ["payee", "token", "payee"], ["unchecked", "bool", "grammarUnchecked"], ["upgrade", "tokens", "upgrade"]];
/* The sections of an offer text, in order. */
const PH = { head: 0, offers: 1, waivers: 2, price: 3, charge: 4 };
const OFFER_LABELS = "one of derived, by, payee, unchecked, upgrade, signer, command, composes, audited, uses, offer, summary, commands, produces, requires, waiver, price, charge";
/* A `command` line's class: who may call the command, in the composition's own `Auth` words
   (flx-resolver-host/src/composition.rs). The Rust twin is `resolver_artifacts::COMMAND_ACCESS`. */
const COMMAND_ACCESS = ["public", "signed-record", "operator", "local"];
const isCommandName = (s) => typeof s === "string" && /^[A-Z0-9_]+$/.test(s);
const CHARGE_ON = ["entry", "answer"];
const isCurrencyCode = (s) => typeof s === "string" && /^[A-Z]{3}$/.test(s);
const isChainId = (s) => typeof s === "string" && /^[a-z0-9]{3,32}$/.test(s);

/** A V2 offer text as the `flx-resolver-offer/1` document the JSON form parses to, with the `payee` and `composes`
 *  (ids, or `{capability, manifestCid, audited}` entries) the offer readers read. Billing (2026-10-21) added
 *  `uses <chain> <offer CID or ->`, `charge free` and `charge <entry|answer> <KIND or COMMAND> <currency> <minor>
 *  <count>`; an offer with no `charge` line has no price decided, never free and never 0. `signer` and `waiver` carry
 *  the rest of what Studio's offers hold. The Rust twin is `resolver_artifacts::offer_to_json`.
 *  Who may call each command (2026-10-22, Resolver Studio fix 20): `command <NAME> <public|signed-record|operator|
 *  local>`, one per command in the host's order, the composition's own line shape (`commandAccess`: `[{name, access}]`).
 *  They sit in the head because the host commands belong to no offer. An offer with `command` lines states every
 *  command its offers list; one with none (every offer written before) reads as before. */
export function offerToJson(text) {
  const m = OFFER_V2_MAGIC;
  const lines = linesOf(m, text);
  const resolver = headerOf(m, lines);
  const top = { schema: OFFER_SCHEMA, resolver };
  const composes = [];
  const offers = [];
  const signers = {};
  const commandAccess = [];
  const uses = [];
  const waivers = [];
  const charges = [];
  let free = false;
  let current = null;
  let phase = PH.head;
  const outOfPlace = (n, label) => refusal(m, n, `\`${label}\` out of place`, "the header lines, signer, command, composes and uses lines first, then the offers, then waivers, then price, then charge", `move the ${label} line`);
  const enter = (to) => {
    if (to > PH.offers && current) {
      offers.push(current);
      current = null;
    }
    phase = to;
  };
  for (const { n, fields } of lines.slice(1)) {
    const label = fields[0];
    const args = fields.slice(1);
    const head = O_HEAD.find((r) => r[0] === label);
    if (head) {
      if (phase !== PH.head) throw outOfPlace(n, label);
      const [, ty, key] = head;
      let v = readField(m, n, label, ty, args);
      if (label === "upgrade") {
        if (args.length === 0) throw refusal(m, n, "an upgrade line with no words", "upgrade TAB <key|immutable|dao> [TAB <key>]", "write the upgrade line in the grammar's shape");
        v = args.join(" ");
      }
      if (Object.hasOwn(top, key)) throw refusal(m, n, `\`${label}\` appears twice`, "each header line once", `remove the second ${label} line`);
      top[key] = v;
    } else if (label === "signer") {
      if (phase !== PH.head) throw outOfPlace(n, label);
      if (args.length !== 2) throw refusal(m, n, `a signer line has ${args.length} fields`, "signer TAB <kind> TAB <who may sign it>", "write the signer line in the grammar's shape");
      const cls = readField(m, n, label, "token", [args[1]]);
      const kind = readField(m, n, label, "token", [args[0]]);
      if (Object.hasOwn(signers, kind)) throw refusal(m, n, `kind ${kind} has two signer lines`, "one signer line per kind", "remove the second one");
      signers[kind] = cls;
    } else if (label === "command") {
      if (phase !== PH.head) throw outOfPlace(n, label);
      if (args.length !== 2) throw refusal(m, n, `a command line has ${args.length} fields`, "command TAB <COMMAND> TAB <public|signed-record|operator|local>", "write the command line in the grammar's shape");
      const [name, cls] = args;
      if (!isCommandName(name)) throw refusal(m, n, `${JSON.stringify(name)} is not a command name`, "an upper-case wire command name (A to Z, 0 to 9, _)", "name the command as the resolver's host registers it");
      if (!COMMAND_ACCESS.includes(cls)) throw refusal(m, n, `${JSON.stringify(cls)} is not who may call a command`, "public, signed-record, operator or local", "write one of the four classes");
      if (commandAccess.some((c) => c.name === name)) throw refusal(m, n, `${name} has two command lines`, "one command line per command", "remove the second one");
      commandAccess.push({ name, access: cls });
    } else if (label === "price") {
      if (phase >= PH.price) throw outOfPlace(n, label);
      enter(PH.price);
      if (Object.hasOwn(top, "price")) throw refusal(m, n, "`price` appears twice", "each header line once", "remove the second price line");
      top.price = readField(m, n, label, "text", args);
    } else if (label === "composes") {
      if (phase !== PH.head || uses.length) throw refusal(m, n, "a composes line after the first offer", "composes lines before the offers", "move the composes line up");
      if (args.length === 1) {
        composes.push(readField(m, n, label, "token", [args[0]]));
      } else if (args.length === 2) {
        const entry = { capability: readField(m, n, label, "token", [args[0]]) };
        if (args[1] !== "-") {
          if (!isLowerHex(args[1], 64)) throw refusal(m, n, `${JSON.stringify(args[1])} is neither a manifest CID nor -`, "64 lowercase hex characters (the pinned manifest's CID), or - for no pin", "pin the capability's current manifest CID, or write -");
          entry.manifestCid = args[1];
        }
        composes.push(entry);
      } else {
        throw refusal(m, n, `a composes line has ${args.length} fields`, "composes TAB <capability id> [TAB <manifest CID or ->]", "write the composes line in the grammar's shape");
      }
    } else if (label === "audited") {
      if (phase !== PH.head || composes.length === 0 || uses.length) throw refusal(m, n, "an audited line with no composes line before it", "audited right after the composes line it belongs to", "put the audited line after its composes line");
      if (args.length < 1) throw refusal(m, n, "an audited line needs k and the methods", "audited TAB <k> TAB <method>...", "write the audited line in the grammar's shape");
      const [k, ...methods] = args;
      const last = composes.pop();
      const entry = typeof last === "string" ? { capability: last } : last;
      if (Object.hasOwn(entry, "audited")) throw refusal(m, n, "two audited lines for one composes entry", "one audited line per composes line", "remove the second audited line");
      entry.audited = { methods: readField(m, n, label, "tokens", methods), k: readField(m, n, label, "uint", [k]) };
      composes.push(entry);
    } else if (label === "uses") {
      if (phase !== PH.head) throw outOfPlace(n, label);
      if (args.length !== 2) throw refusal(m, n, `a uses line has ${args.length} fields`, "uses TAB <workflow chain id> TAB <64-hex offer CID or ->", "write the uses line in the grammar's shape");
      const [chain, pin] = args;
      if (!isChainId(chain)) throw refusal(m, n, `${JSON.stringify(chain)} is not a workflow's chain id`, "3 to 32 lowercase letters or digits", "name the workflow this one calls by its chain id");
      const entry = { chain };
      if (pin !== "-") {
        if (!isLowerHex(pin, 64)) throw refusal(m, n, `${JSON.stringify(pin)} is neither an offer CID nor -`, "64 lowercase hex characters (the used workflow's offer CID), or - for no pin", "pin the used workflow's current offer CID, or write -");
        entry.offerCid = pin;
      }
      uses.push(entry);
    } else if (label === "offer") {
      if (phase > PH.offers) throw refusal(m, n, phase === PH.waivers ? "an offer line after a waiver" : "an offer line after price", "the offers before waivers, price and charge", "move the offer up");
      if (current) offers.push(current);
      phase = PH.offers;
      current = { name: readField(m, n, label, "token", args) };
    } else if (O_OFFER.some((r) => r[0] === label)) {
      const row = O_OFFER.find((r) => r[0] === label);
      if (!current || phase !== PH.offers) throw refusal(m, n, `\`${label}\` outside an offer`, "an `offer <name>` line before the attribute lines", `put the ${label} line after its offer line`);
      if (Object.hasOwn(current, row[2])) throw refusal(m, n, `\`${label}\` appears twice in one offer`, "each attribute once per offer", `remove the second ${label} line`);
      current[row[2]] = readField(m, n, label, row[1], args);
    } else if (label === "waiver") {
      if (phase > PH.waivers) throw outOfPlace(n, label);
      enter(PH.waivers);
      if (args.length !== 7) throw refusal(m, n, `a waiver line has ${args.length} fields`, "waiver TAB <test> TAB <time> TAB <64-hex key> TAB <128-hex signature> TAB <resolver or -> TAB <reason, hex> TAB <signed text, hex>", "write the waiver line in the grammar's shape");
      const [vector, at, by, sig, subject, reason, covers] = args;
      if (!isLowerHex(by, 64) || !isLowerHex(sig, 128)) throw refusal(m, n, "a waiver's key or signature is not lowercase hex of its length", "a 64-hex key and a 128-hex signature", "carry the waiver exactly as it was signed");
      const w = { vector: readField(m, n, label, "token", [vector]), reason: readField(m, n, label, "text", [reason]), at: readField(m, n, label, "token", [at]), by, sig };
      if (subject !== "-") w.subject = readField(m, n, label, "token", [subject]);
      w.covers = readField(m, n, label, "text", [covers]);
      waivers.push(w);
    } else if (label === "charge") {
      enter(PH.charge);
      if (args.length === 1 && args[0] === "free" && charges.length === 0 && !free) {
        free = true;
      } else if (args.length === 5 && !free) {
        const [on, subject, currency, minor, count] = args;
        if (!CHARGE_ON.includes(on)) throw refusal(m, n, `${JSON.stringify(on)} is not what a sender pays for`, "entry or answer", "write charge TAB entry or charge TAB answer");
        if (!isCurrencyCode(currency)) throw refusal(m, n, `${JSON.stringify(currency)} is not a currency`, "three capital letters: an ISO 4217 code the network's DAO lists, or FXN", "name the currency of the price");
        const mi = readField(m, n, label, "uint", [minor]);
        const co = readField(m, n, label, "uint", [count]);
        if (co === 0) throw refusal(m, n, "a charge per 0 entries", "a count of at least 1", "write the price per 1 or more entries");
        const c = { on, subject: readField(m, n, label, "token", [subject]), currency, minor: mi, count: co };
        if (charges.some((x) => x.on === c.on && x.subject === c.subject)) throw refusal(m, n, `two charge lines for ${on} ${subject}`, "one price per kind of entry or command", "remove the second charge line");
        charges.push(c);
      } else {
        throw refusal(m, n, "the charge lines are neither one `charge free` nor priced lines", "charge TAB free alone, or charge TAB <entry|answer> TAB <kind or command> TAB <currency> TAB <minor units> TAB <count>, one per kind", "write charge free alone, or one priced line per kind");
      }
    } else {
      throw refusal(m, n, `${JSON.stringify(label)} is not a label of this grammar`, OFFER_LABELS, "use only the labels the grammar names");
    }
  }
  if (current) offers.push(current);
  if (Object.keys(signers).length) top.signerPolicy = signers;
  if (commandAccess.length) top.commandAccess = commandAccess;
  if (composes.length) top.composes = composes;
  if (uses.length) top.uses = uses;
  top.offers = offers;
  if (waivers.length) top.waivers = waivers;
  if (free) top.charge = "free";
  else if (charges.length) top.charge = charges;
  if (offerTextOf(top) !== text) {
    throw refusal(m, null, "the text does not render back to the same bytes", "the canonical rendering (derived, by, payee, unchecked, upgrade, signer, command, composes with their audited lines, uses, offers, waivers, price, charge)", "write the lines in the canonical order, or re-derive the artifact (scripts/derive-resolver-grammar.mjs)");
  }
  return top;
}

function offerTextOf(doc) {
  const m = OFFER_V2_MAGIC;
  const top = new Obj(m, "the document", doc);
  const schema = top.get("schema");
  if (schema !== OFFER_SCHEMA) throw refusal(m, null, `the document's schema is ${show(schema)}`, `schema ${JSON.stringify(OFFER_SCHEMA)}`, "convert an flx-resolver-offer/1 document");
  const resolver = top.get("resolver");
  if (!isWord(resolver)) throw refusal(m, null, `the document's resolver is ${show(resolver)}`, "a resolver name (letters, digits, `_`, `-`)", "name the resolver");
  const e = emitter();
  e.out.push(`${m}\t${resolver}`);
  for (const [label, ty, key] of O_HEAD) {
    const v = top.get(key);
    if (v === undefined) continue;
    if (label === "upgrade") {
      if (typeof v !== "string" || v === "" || !v.split(" ").every(isToken)) throw refusal(m, null, `the document's \`upgrade\` is ${show(v)}, which upgrade lines cannot hold`, "words separated by one space (key, immutable, or dao <key>)", "write upgrade as key, immutable or dao <key>");
      e.line(label, v.split(" "));
      continue;
    }
    e.line(label, writeField(m, "the document", label, ty, v));
  }
  const policy = top.get("signerPolicy");
  if (policy !== undefined) {
    if (!isObject(policy)) throw refusal(m, null, `\`signerPolicy\` is ${show(policy)}`, "an object from kind to who may sign it", "fix the offer");
    for (const kind of Object.keys(policy).sort()) {
      e.line("signer", [...writeField(m, "`signerPolicy`", "signer", "token", kind), ...writeField(m, "`signerPolicy`", "signer", "token", policy[kind])]);
    }
  }
  const av = top.get("commandAccess");
  if (av !== undefined) {
    if (!Array.isArray(av) || av.length === 0) throw refusal(m, null, `\`commandAccess\` is ${show(av)}`, "a non-empty array of {name, access}, one per command", "write who may call each command, or leave `commandAccess` out");
    const named = new Set();
    for (const entry of av) {
      const c = new Obj(m, "a command's access", entry);
      const name = c.get("name");
      if (!isCommandName(name)) throw refusal(m, null, `a command's name is ${show(name)}`, "an upper-case wire command name (A to Z, 0 to 9, _)", "name the command as the resolver's host registers it");
      const cls = c.get("access");
      if (!COMMAND_ACCESS.includes(cls)) throw refusal(m, null, `${name}'s access is ${show(cls)}`, "public, signed-record, operator or local", "write who may call the command");
      c.finish();
      if (named.has(name)) throw refusal(m, null, `${name} is named twice in \`commandAccess\``, "each command once", "remove the second one");
      named.add(name);
      e.line("command", [name, cls]);
    }
    /* every command an offer lists states its access, so a reader never meets a listed command it cannot place */
    const ov = top.map.offers;
    for (const offer of Array.isArray(ov) ? ov : []) {
      for (const cmd of Array.isArray(offer?.commands) ? offer.commands : []) {
        if (typeof cmd === "string" && !named.has(cmd)) {
          const of = typeof offer?.name === "string" ? offer.name : "?";
          throw refusal(m, null, `offer ${of} lists ${cmd}, which has no command line`, "a command line for every command an offer lists", `add command TAB ${cmd} TAB <public|signed-record|operator|local>, or leave every command line out`);
        }
      }
    }
  }
  const cv = top.get("composes");
  if (cv !== undefined) {
    if (!Array.isArray(cv)) throw refusal(m, null, `\`composes\` is ${show(cv)}`, "an array of capability ids or {capability, manifestCid, audited} entries", "fix the offer");
    for (const entry of cv) {
      if (typeof entry === "string") {
        e.line("composes", writeField(m, "`composes`", "composes", "token", entry));
        continue;
      }
      const o = new Obj(m, "a composes entry", entry);
      const id = o.get("capability");
      if (id === undefined) throw refusal(m, null, "a composes entry has no `capability`", "a capability id", "name the capability");
      const fields = writeField(m, "a composes entry", "composes", "token", id);
      const pin = o.get("manifestCid");
      if (pin === undefined) fields.push("-");
      else if (typeof pin === "string" && isLowerHex(pin, 64)) fields.push(pin);
      else throw refusal(m, null, `a composes entry's manifestCid is ${show(pin)}`, "64 lowercase hex characters", "pin the capability's manifest CID");
      const audited = o.get("audited");
      e.line("composes", fields);
      if (audited !== undefined) {
        const a = new Obj(m, "an audited requirement", audited);
        const k = a.get("k");
        if (k === undefined) throw refusal(m, null, "an audited requirement has no `k`", "a whole number k", "name k");
        const methods = a.get("methods");
        if (methods === undefined) throw refusal(m, null, "an audited requirement has no `methods`", "an array of method words", "name the methods");
        const af = writeField(m, "an audited requirement", "audited", "uint", k);
        af.push(...writeField(m, "an audited requirement", "audited", "tokens", methods));
        a.finish();
        e.line("audited", af);
      }
      o.finish();
    }
  }
  const uv = top.get("uses");
  if (uv !== undefined) {
    if (!Array.isArray(uv)) throw refusal(m, null, `\`uses\` is ${show(uv)}`, "an array of {chain, offerCid} entries", "fix the offer");
    for (const entry of uv) {
      const o = new Obj(m, "a uses entry", entry);
      const chain = o.get("chain");
      if (!isChainId(chain)) throw refusal(m, null, `a uses entry's chain is ${show(chain)}`, "a workflow's chain id: 3 to 32 lowercase letters or digits", "name the workflow by its chain id");
      const pin = o.get("offerCid");
      if (pin !== undefined && !isLowerHex(pin, 64)) throw refusal(m, null, `a uses entry's offerCid is ${show(pin)}`, "64 lowercase hex characters", "pin the used workflow's offer CID");
      o.finish();
      e.line("uses", [chain, pin ?? "-"]);
    }
  }
  const offers = top.get("offers");
  if (!Array.isArray(offers)) throw refusal(m, null, `\`offers\` is ${show(offers)}`, "an array of offers (objects with a name)", "derive the offer with scripts/derive-resolver-grammar.mjs");
  for (const offer of offers) {
    const o = new Obj(m, "an offer", offer);
    const name = o.get("name");
    if (name === undefined) throw refusal(m, null, "an offer has no `name`", "`name` on every offer", "name the offer");
    e.line("offer", writeField(m, "an offer", "offer", "token", name));
    for (const [label, ty, key] of O_OFFER) {
      const v = o.get(key);
      if (v !== undefined) e.line(label, writeField(m, `offer ${show(name)}`, label, ty, v));
    }
    o.finish();
  }
  const wv = top.get("waivers");
  if (wv !== undefined) {
    if (!Array.isArray(wv)) throw refusal(m, null, `\`waivers\` is ${show(wv)}`, "an array of signed waivers", "fix the offer");
    for (const entry of wv) {
      const w = new Obj(m, "a waiver", entry);
      const need = (key) => {
        const v = w.get(key);
        if (v === undefined) throw refusal(m, null, `a waiver has no \`${key}\``, `\`${key}\` on every waiver`, "carry the waiver exactly as it was signed");
        return v;
      };
      const [vector, reason, at, by, sig] = ["vector", "reason", "at", "by", "sig"].map(need);
      const subject = w.get("subject");
      const covers = need("covers");
      w.finish();
      const hexOf = (v, len, what) => {
        if (typeof v === "string" && isLowerHex(v, len)) return v;
        throw refusal(m, null, `a waiver's ${what} is ${show(v)}`, `${len} lowercase hex characters`, "carry the waiver exactly as it was signed");
      };
      e.line("waiver", [
        ...writeField(m, "a waiver", "waiver", "token", vector),
        ...writeField(m, "a waiver", "waiver", "token", at),
        hexOf(by, 64, "key"),
        hexOf(sig, 128, "signature"),
        ...(subject === undefined ? ["-"] : writeField(m, "a waiver", "waiver", "token", subject)),
        ...writeField(m, "a waiver", "waiver", "text", reason),
        ...writeField(m, "a waiver", "waiver", "text", covers),
      ]);
    }
  }
  const price = top.get("price");
  if (price !== undefined) e.line("price", writeField(m, "the document", "price", "text", price));
  const charge = top.get("charge");
  if (charge === "free") e.line("charge", ["free"]);
  else if (Array.isArray(charge) && charge.length) {
    for (const entry of charge) {
      const c = new Obj(m, "a charge", entry);
      const on = c.get("on");
      if (!CHARGE_ON.includes(on)) throw refusal(m, null, `a charge's \`on\` is ${show(on)}`, "entry or answer", "name what the sender pays for");
      const subject = c.get("subject");
      if (subject === undefined) throw refusal(m, null, "a charge has no `subject`", "the kind or command it prices", "name it");
      const currency = c.get("currency");
      if (!isCurrencyCode(currency)) throw refusal(m, null, `a charge's currency is ${show(currency)}`, "three capital letters", "name the currency");
      const minor = c.get("minor");
      if (minor === undefined) throw refusal(m, null, "a charge has no `minor`", "the minor units of the price", "write the price");
      const count = c.get("count");
      if (count === undefined) throw refusal(m, null, "a charge has no `count`", "how many entries the price is for", "write the count");
      if (count === 0) throw refusal(m, null, "a charge per 0 entries", "a count of at least 1", "write the price per 1 or more entries");
      c.finish();
      e.line("charge", [on, ...writeField(m, "a charge", "charge", "token", subject), currency, ...writeField(m, "a charge", "charge", "uint", minor), ...writeField(m, "a charge", "charge", "uint", count)]);
    }
  } else if (charge !== undefined) {
    throw refusal(m, null, `\`charge\` is ${show(charge)}`, "\"free\", or a non-empty array of {on, subject, currency, minor, count}", "write charge as free or as the priced lines");
  }
  top.finish();
  return e.text();
}

/** The ONE conversion from a committed `flx-resolver-offer/1` JSON document to its V2 text. */
export function offerFromJson(doc) {
  const text = offerTextOf(doc);
  const back = offerToJson(text);
  if (!sameDocument(back, doc)) {
    throw refusal(OFFER_V2_MAGIC, null, `the document does not read back from its text as the same document (first difference: ${firstDifference(doc, back, "$")})`, "a document made only of what the grammar holds", "derive the offer with scripts/derive-resolver-grammar.mjs");
  }
  return text;
}

// ---------------------------------------------------------------------
// manifest signature: FLX-MANIFEST-SIG-V1
// ---------------------------------------------------------------------

/** `{signer, note, cid, signature}` as its canonical text. */
export function renderSig(sig) {
  const m = SIG_V1_MAGIC;
  for (const [what, len] of [["signer", 64], ["cid", 64], ["signature", 128]]) {
    if (!isLowerHex(sig[what], len)) throw refusal(m, null, `the ${what} ${show(sig[what])} is not ${len} lowercase hex characters`, `${len} lowercase hex characters`, "sign with the derive script");
  }
  if (typeof sig.note !== "string") throw refusal(m, null, "the note is not text", "a note", "sign with the derive script");
  return `${m}\nsigner\t${sig.signer}\nnote\t${hexOfText(sig.note)}\ncid\t${sig.cid}\nsignature\t${sig.signature}\n`;
}

/** The canonical text parsed to `{signer, note, cid, signature}`. */
export function parseSig(text) {
  const m = SIG_V1_MAGIC;
  const lines = linesOf(m, text);
  if (lines[0].fields.length !== 1 || lines[0].fields[0] !== m) throw refusal(m, 1, "the first line is not the header", `${m} alone on the first line`, "start the signature with its header line");
  const want = ["signer", "note", "cid", "signature"];
  if (lines.length !== want.length + 1) throw refusal(m, null, `the signature has ${lines.length - 1} lines after the header`, "exactly the lines signer, note, cid, signature, in that order", "write the four lines");
  const sig = {};
  want.forEach((label, i) => {
    const { n, fields } = lines[i + 1];
    if (fields.length !== 2) throw refusal(m, n, `${label} needs one field`, `${label} TAB <value>`, "write the line in the grammar's shape");
    if (fields[0] !== label) throw refusal(m, n, `expected ${label}, found ${JSON.stringify(fields[0])}`, "signer, note, cid, signature in that order", "write the lines in the canonical order");
    if (label === "note") {
      const t = textOfHex(fields[1]);
      if (t === null) throw refusal(m, n, `${JSON.stringify(fields[1])} is not lowercase hex of UTF-8`, "the note as hex of its UTF-8 bytes", "hex-encode the note");
      sig.note = t;
    } else {
      const len = label === "signature" ? 128 : 64;
      if (!isLowerHex(fields[1], len)) throw refusal(m, n, `${JSON.stringify(fields[1])} is not ${len} lowercase hex characters`, `${len} lowercase hex characters`, "write the value as lowercase hex");
      sig[label] = fields[1];
    }
  });
  return sig;
}

/** The `flx-manifest-signature/1` JSON document as `{signer, note, cid, signature}`. */
export function sigFromJson(doc) {
  const m = SIG_V1_MAGIC;
  const o = new Obj(m, "the signature", doc);
  if (o.get("schema") !== SIG_SCHEMA) throw refusal(m, null, "the document's schema is not flx-manifest-signature/1", `schema ${JSON.stringify(SIG_SCHEMA)}`, "convert an flx-manifest-signature/1 document");
  const take = (key) => {
    const v = o.get(key);
    if (typeof v !== "string") throw refusal(m, null, `the signature has no string \`${key}\``, `\`${key}\``, "convert a derived signature");
    return v;
  };
  const sig = { signer: take("signer"), note: take("signerNote"), cid: take("cid"), signature: take("signature") };
  o.finish();
  renderSig(sig);
  return sig;
}

// ---------------------------------------------------------------------
// sample records: FLX-RESOLVER-SAMPLES-V1
// ---------------------------------------------------------------------

/** The kind marker a record's `KK` block names (`...-KKDAO1-...` is `KDAO1`), or `null`. */
export function kindOfRecord(text) {
  for (const block of String(text).split("-")) {
    if (block.startsWith("KK") && block.length > 2) return `K${block.slice(2)}`;
  }
  return null;
}

/** `{resolver, records: [{kind, text}]}` as its canonical text. */
export function renderSamples(samples) {
  const m = SAMPLES_V1_MAGIC;
  if (!isWord(samples.resolver)) throw refusal(m, null, `the resolver ${show(samples.resolver)} is not a name`, "a resolver name", "name the resolver");
  let out = `${m}\t${samples.resolver}\n`;
  for (const r of samples.records) {
    if (!isToken(r.text)) throw refusal(m, null, `the ${r.kind} record holds a space, tab, control or non-ASCII byte`, "an FLX record (visible ASCII, dash-delimited blocks)", "build the record with the resolver's own builder");
    if (kindOfRecord(r.text) !== r.kind) throw refusal(m, null, `the record's KK block names ${show(kindOfRecord(r.text))}, not ${r.kind}`, "a record whose KK block is its kind", "build the record with the resolver's own builder");
    out += `record\t${r.text}\n`;
  }
  return out;
}

/** The canonical text parsed to `{resolver, records: [{kind, text}]}`; each record is verbatim. */
export function parseSamples(text) {
  const m = SAMPLES_V1_MAGIC;
  const lines = linesOf(m, text);
  const resolver = headerOf(m, lines);
  const records = lines.slice(1).map(({ n, fields }) => {
    if (fields.length !== 2 || fields[0] !== "record") throw refusal(m, n, `${JSON.stringify(fields.join("\t"))} is not a record line`, "record TAB <FLX record>", "write one record per line");
    if (!isToken(fields[1])) throw refusal(m, n, "the record is not a token", "an FLX record (visible ASCII, no space)", "carry the record verbatim");
    const kind = kindOfRecord(fields[1]);
    if (kind === null) throw refusal(m, n, "the record has no KK block", "a record naming its kind in a KK block", "build the record with the resolver's own builder");
    return { kind, text: fields[1] };
  });
  return { resolver, records };
}

/** The `{records: [{kind, text}]}` document `sample-records.json` was committed as, for `resolver`. */
export function samplesFromJson(resolver, doc) {
  const m = SAMPLES_V1_MAGIC;
  const o = new Obj(m, "the document", doc);
  const records = o.get("records");
  if (!Array.isArray(records)) throw refusal(m, null, "the document has no `records` array", "a records array", "convert a derived sample-records document");
  const out = records.map((r) => {
    const ro = new Obj(m, "a sample", r);
    const kind = ro.get("kind");
    const text = ro.get("text");
    if (typeof kind !== "string" || typeof text !== "string") throw refusal(m, null, "a sample has no string kind and text", "kind and text on every sample", "convert a derived sample-records document");
    ro.finish();
    return { kind, text };
  });
  o.finish();
  const samples = { resolver, records: out };
  renderSamples(samples);
  return samples;
}

// ---------------------------------------------------------------------
// which form is this text?
// ---------------------------------------------------------------------

const hasHeaderWord = (text, magic) => {
  const t = String(text ?? "").trimStart();
  return t.startsWith(magic) && (t.length === magic.length || t[magic.length] === "\t" || t[magic.length] === "\n");
};

/** Is `text` an `FLX-RESOLVER-GRAMMAR-V2` body (by its header word)? */
export const isGrammarV2 = (text) => hasHeaderWord(text, GRAMMAR_V2_MAGIC);
/** Is `text` an `FLX-RESOLVER-OFFER-V2` body (by its header word)? */
export const isOfferV2 = (text) => hasHeaderWord(text, OFFER_V2_MAGIC);

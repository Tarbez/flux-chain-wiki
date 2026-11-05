// GENERATED FILE. Do not edit. Regenerate with `node scripts/reader-generate.mjs --defxn <defxn-defi-rs checkout>`
// in flux/flux-grammar-atlas, from its registry/*.flx (FLX records in grammar 0, the grammar of grammars).
//
// Layer: kernel. The reader for today's V1 ledger-entry bytes: grammar 1 version 1, the ledger entry as today's
// door reads it (dense-wire src/lib.rs admit_named and ledger_box_label). Migration step 2 of
// flux/flux-grammar-atlas/docs/FXN-GRAMMAR-PHILOSOPHY.md section 9. No door calls it yet, so it changes no verdict.
// dense-wire src/v1_reader_parity_tests.rs and web/test/v1-reader-parity.test.mjs hold it to the door on every
// parity vector and on every record they derive from them.
//
// Definition: 94288745c2a9e00bb6624d164c738495400fa63c6edb0ef691fbfbe666110f45 ("ledger entry, as the V1 door reads it", version 1).

export const DEFINITION = "94288745c2a9e00bb6624d164c738495400fa63c6edb0ef691fbfbe666110f45";
const I64_MAX = 9223372036854775807n;
const U64_MAX = 18446744073709551615n;
export const LIMIT = 65536;
export const REFUSE_BOX = 1;
export const REFUSE_KIND = 2;
export const ADMITS = Object.freeze(["LEDGERENTRY","1A"]);
/** The V1 labels, in the definition's order. */
export const LABELS = Object.freeze(["I","B","A","T","R","G","Y","S","C","M","V","H","P","D","Q","O","L","W","U","E","KK","KIND","CHAIN","J","N"]);
const REPEAT = new Set(["S","C"]);
const REQUIRED = ["G","Y","S","C","M","V","H","J"];
const GROUP = Object.freeze({"KK":1,"KIND":1,"CHAIN":2,"N":2});
const COUNT = Object.freeze({"C":2});

/** The longest V1 label `block` starts with, or null. Dispatch is by the first byte, then longest label first. */
export function labelOf(block) {
  switch (block[0]) {
    case "A": return "A";
    case "B": return "B";
    case "C": if (block.startsWith("CHAIN")) return "CHAIN"; return "C";
    case "D": return "D";
    case "E": return "E";
    case "G": return "G";
    case "H": return "H";
    case "I": return "I";
    case "J": return "J";
    case "K": if (block.startsWith("KIND")) return "KIND"; if (block.startsWith("KK")) return "KK"; return null;
    case "L": return "L";
    case "M": return "M";
    case "N": return "N";
    case "O": return "O";
    case "P": return "P";
    case "Q": return "Q";
    case "R": return "R";
    case "S": return "S";
    case "T": return "T";
    case "U": return "U";
    case "V": return "V";
    case "W": return "W";
    case "Y": return "Y";
    default: return null;
  }
}

function valueOk(label, p) {
  switch (label) {
    case "I": return codedFields(p);
    case "B": return codedFields(p);
    case "A": return verbAndFlags(p, ["SEND","NOTIFY","FOLLOW","ENDORSE","SUPPORT","CITE","COLLABORATE","DELEGATE","REGISTER","UPDATE","QUERY","DELETE","MINT","BUY","SELL","LIQUIDITYADD","LIQUIDITYREMOVE","SETTLE"], "X");
    case "T": return numericUnitOrOpaque(p);
    case "R": return true;
    case "G": return opaqueAlphanumeric(p, 32);
    case "Y": return uppercase(p);
    case "S": return opaqueAlphanumeric(p, 64);
    case "C": return opaqueAlphanumeric(p, 16);
    case "M": return digits(p, 1, Infinity, true);
    case "V": return digits(p, 1, Infinity, true);
    case "H": return lowercaseHex(p, false);
    case "P": return effectDigitThenHex(p);
    case "D": return digits(p, 1, Infinity, true);
    case "Q": return lowercaseHex(p, true);
    case "O": return lowercaseHex(p, true);
    case "L": return latticeScalar(p, "0246");
    case "W": return lowercaseHex(p, false);
    case "U": return ["PENDING","APPROVED","EXECUTED","REJECTED"].includes(p);
    case "E": return lowercaseHex(p, true);
    case "KK": return opaqueAlphanumeric(p, 1);
    case "KIND": return opaqueAlphanumeric(p, 1);
    case "CHAIN": return lowercaseAlphanumeric(p, 3, 32);
    case "J": return digits(p, 1, Infinity, false);
    case "N": return lowercaseAlphanumeric(p, 3, 32);
    default: return false;
  }
}

const refuse = (code, index, label, why) => ({ ok: false, code, index, label, why });

/**
 * Read one V1 record, in the door's order. Returns { ok: true, boxes: [{ label, start, end }] }, each span the box's
 * bytes with its label, or { ok: false, code, index, label, why } with the door's code.
 */
export function read(text) {
  if (typeof text !== "string" || text === "") return refuse(REFUSE_BOX, null, null, "the record is empty");
  if (text.length > LIMIT) return refuse(REFUSE_BOX, null, null, "the record is over the size limit");
  if (!/^[A-Za-z0-9-]*$/.test(text)) return refuse(REFUSE_BOX, null, null, "a byte is outside the record charset");
  const blocks = text.split("-");
  const kind = blocks.find((b) => labelOf(b) === "Y");
  if (kind === undefined) return refuse(REFUSE_BOX, null, "Y", "no box names the record's kind");
  if (!ADMITS.includes(kind.slice(1))) return refuse(REFUSE_KIND, null, "Y", "the kind is not one this reader admits");
  const boxes = [];
  const once = new Set();
  const groups = new Set();
  const counts = new Map();
  let start = 0;
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    const end = start + block.length;
    if (block === "") return refuse(REFUSE_BOX, index, null, "the box is empty");
    const label = labelOf(block);
    if (label === null) return refuse(REFUSE_BOX, index, null, "the box starts with no V1 label");
    const group = GROUP[label];
    if (group !== undefined) {
      if (groups.has(group)) return refuse(REFUSE_BOX, index, label, "a second box of a group that may appear once");
      groups.add(group);
    } else if (!REPEAT.has(label)) {
      if (once.has(label)) return refuse(REFUSE_BOX, index, label, "a second box of a label that may appear once");
      once.add(label);
    }
    if (!valueOk(label, block.slice(label.length))) return refuse(REFUSE_BOX, index, label, "the value breaks its label's payload rule");
    counts.set(label, (counts.get(label) ?? 0) + 1);
    boxes.push({ label, start, end });
    start = end + 1;
  }
  const missing = REQUIRED.find((l) => !counts.has(l));
  if (missing !== undefined) return refuse(REFUSE_BOX, null, missing, "a required label is missing");
  for (const [label, n] of Object.entries(COUNT)) {
    if ((counts.get(label) ?? 0) < n) return refuse(REFUSE_BOX, null, label, "fewer boxes of this label than the kind needs");
  }
  return { ok: true, boxes };
}

function digits(p, min, max, integer) {
  return p.length >= Math.max(min, 1) && p.length <= max && /^[0-9]+$/.test(p) && (!integer || BigInt(p) <= I64_MAX);
}

function codedFields(p) {
  const m = /^([0-9]+)((?:[A-Z][0-9]*)*)$/.exec(p);
  if (!m || BigInt(m[1]) > I64_MAX) return false;
  for (const f of m[2].matchAll(/[A-Z]([0-9]*)/g)) if (f[1] !== "" && BigInt(f[1]) > I64_MAX) return false;
  return true;
}

function verbAndFlags(p, verbs, flags) {
  return verbs.some((v) => p.startsWith(v) && [...p.slice(v.length)].every((c) => flags.includes(c)));
}

function numericUnitOrOpaque(p) {
  const m = /^([0-9]+)([A-Z]+)$/.exec(p);
  if (m) return m[1].length <= 19 && BigInt(m[1]) <= I64_MAX;
  return /^[A-Za-z0-9]+$/.test(p);
}

function opaqueAlphanumeric(p, min) {
  return p.length >= Math.max(min, 1) && /^[A-Za-z0-9]+$/.test(p);
}

function uppercase(p) {
  return /^[A-Z][A-Z0-9]*$/.test(p);
}

const UTF8 = new TextDecoder("utf-8", { fatal: true });
function lowercaseHex(p, decode) {
  if (!/^(?:[0-9a-f]{2})+$/.test(p)) return false;
  if (!decode) return true;
  const bytes = new Uint8Array(p.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(p.slice(2 * i, 2 * i + 2), 16);
  try {
    UTF8.decode(bytes);
    return true;
  } catch {
    return false;
  }
}

function effectDigitThenHex(p) {
  return (p[0] === "0" || p[0] === "1") && lowercaseHex(p.slice(1), true);
}

function latticeScalar(p, scales) {
  return p.length >= 2 && /^[0-9]+$/.test(p) && scales.includes(p[0]) && BigInt(p.slice(1)) <= U64_MAX;
}

function lowercaseAlphanumeric(p, min, max) {
  return p.length >= min && p.length <= max && /^[a-z0-9]*$/.test(p);
}


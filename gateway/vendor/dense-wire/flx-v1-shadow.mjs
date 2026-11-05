// Layer: kernel. Migration step 3 of flux/flux-grammar-atlas/docs/FXN-GRAMMAR-PHILOSOPHY.md section 9, the JS half:
// the generated V1 reader (flx-v1-reader.mjs) runs in shadow beside every JS reader of a record's boxes (the browser
// door flx-dumb-parser.mjs, the registry grammar reader flx-record-grammar.mjs, each builder file's own parser). The
// old reader's verdict stands; this module only compares the two readings and keeps each difference.
//
// The same comparison as the Rust half (flx-wire/src/shadow.rs), so a box reads one way in both: a door that judges
// is compared on its verdict and its labels; a slicer is compared box by box on its labels; a lookup on the value it
// found. A label that is no V1 label of its own and starts the generated label (`K` for `KK`) reads the same box;
// `C` for a `CHAIN` box does not.
//
// A difference is one record of the shadow log's grammar (flx-wire/grammars/grammar-shadow-log.fxn): free text as
// hex of UTF-8, no JSON. The records go to the sink set by setSink (a node test or the fleet run appends them to a
// file), and the newest 256 stay in memory (recent()). `globalThis.FXN_GRAMMAR_SHADOW === false` turns shadow off.
//
// `native/android/defxn-node/src/flx-v1-shadow.mjs` is a byte-identical copy, beside the Android parser copy.

import { read, labelOf, LABELS } from "./flx-v1-reader.mjs";

const doors = new Map();
const RECENT = 256;
const kept = [];
let sink = null;
let next = 0;

/** One reader of a record's boxes, by the name its log records give it. */
export class Door {
  constructor(name) {
    this.name = name;
    this.compared = 0;
    this.differed = 0;
  }
  count(differs) {
    if (!doors.has(this.name)) doors.set(this.name, this);
    this.compared += 1;
    if (differs) this.differed += 1;
  }
}

/** Every door that compared a record, as [name, compared, differed], by name. */
export function doorCounts() {
  return [...doors.values()].map((d) => [d.name, d.compared, d.differed]).sort((a, b) => (a[0] < b[0] ? -1 : 1));
}

/** Whether shadow mode runs. */
export function on() {
  return globalThis.FXN_GRAMMAR_SHADOW !== false;
}

/** Send each log record (one line, no newline) to `fn`, or stop with null. */
export function setSink(fn) {
  sink = fn;
}

/** The newest differences, as their log records. */
export function recent() {
  return kept.slice();
}

/** The tally records of every door now: `I<n>-T<ms>-D<door>-C<compared>-X<differed>`. */
export function tally() {
  const at = Date.now();
  return doorCounts().map(([name, c, x]) => emit(`T${at}-D${hex(name)}-C${c}-X${x}`, false));
}

const V1 = new Set(LABELS);

/** Whether an old reader's label `old` reads the same box as the generated reader's `label`. */
export function sameLabel(old, label) {
  return old === label || (!V1.has(old) && old !== "" && label !== null && label.startsWith(old));
}

function hex(text) {
  let out = "";
  for (const byte of new TextEncoder().encode(String(text))) out += byte.toString(16).padStart(2, "0");
  return out;
}

function emit(body, keep) {
  const line = `I${next++}-${body}`;
  if (keep) {
    if (kept.length === RECENT) kept.shift();
    kept.push(line);
  }
  if (sink) sink(line);
  return line;
}

function difference(door, text, old, now) {
  emit(`T${Date.now()}-D${hex(door.name)}-R${hex(text)}-O${hex(old)}-N${hex(now)}`, true);
}

function renderReading(reading) {
  if (reading.ok) return `read ${reading.boxes.map((b) => b.label).join(" ")}`;
  return `refused ${reading.code}${reading.index === null ? "" : ` at box ${reading.index}`}${reading.label === null ? "" : ` (label ${reading.label})`}: ${reading.why}`;
}

/** A door that judges: `old` is { ok: true, labels } when it admitted, or { ok: false, code } with its refusal code. */
export function verdict(door, text, old) {
  if (!on()) return;
  const now = read(text);
  let same;
  if (old.ok && now.ok) same = old.labels.length === now.boxes.length && old.labels.every((l, i) => sameLabel(l, now.boxes[i].label));
  else if (!old.ok && !now.ok) same = old.code === now.code;
  else same = false;
  door.count(!same);
  if (!same) difference(door, text, old.ok ? `read ${old.labels.join(" ")}` : `refused ${old.code}`, renderReading(now));
}

/** The generated label of each box of `text` (null for a box no V1 label starts). */
export function labelsOf(text) {
  return String(text).split("-").map((b) => labelOf(b));
}

/** A door that slices: `old` is its label per box, or null when it could not slice the record. */
export function slices(door, text, old) {
  if (!on()) return;
  const now = labelsOf(text);
  const same = old === null ? now.some((l) => l === null) : old.length === now.length && old.every((l, i) => now[i] !== null && sameLabel(l, now[i]));
  door.count(!same);
  if (!same) difference(door, text, old === null ? "could not slice the record" : `read ${old.join(" ")}`, `read ${now.map((l) => l ?? "?").join(" ")}`);
}

/** A door that reads each box by its first letter. */
export function firstLetters(door, text) {
  if (!on()) return;
  const blocks = String(text).split("-");
  slices(door, text, blocks.some((b) => b === "") ? null : blocks.map((b) => b[0]));
}

/** A door that reads a `CHAIN` box by its whole label and every other box by its first letter. */
export function chainAwareLetters(door, text) {
  if (!on()) return;
  const blocks = String(text).split("-");
  slices(door, text, blocks.some((b) => b === "") ? null : blocks.map((b) => (b.startsWith("CHAIN") ? "CHAIN" : b[0])));
}

/** A door that looked up the `nth` box labelled `label` and found `old` (its value after `label`, or null). */
export function lookup(door, text, label, nth, old) {
  if (!on()) return;
  const blocks = String(text).split("-");
  const found = blocks.filter((b) => sameLabel(label, labelOf(b)))[nth];
  const now = found === undefined ? null : found.slice(label.length);
  door.count(now !== old);
  if (now !== old) difference(door, text, old === null ? `${label}[${nth}] absent` : `${label}[${nth}] = ${old}`, now === null ? `${label}[${nth}] absent` : `${label}[${nth}] = ${now}`);
}

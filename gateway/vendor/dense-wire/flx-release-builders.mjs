// The node release grammar in the browser (node releases, dense-wire/docs/design/pending/node-release.md section 3),
// mirroring the `flx-release` crate byte for byte: `ReleaseBody::read` and `render`, `ReleaseRecord::read`
// (KNODEREL1) and `CancelRecord::read` (KNODERELOFF1). The genesis page's "Release" step and the admin pages read
// what `fxn release build` printed and what a node holds through here, so the founder sees exactly what the kernel
// sees. Every refusal is the crate's own text, locked by `web/test/release-builders.test.mjs` against vectors the crate
// renders (`dense-wire/tests/vectors/release-body.tsv`); nothing here is typed from memory of the Rust.
//
// The body is one tab-joined text: `<protocol> TAB <start time> TAB <source commit> TAB <target>=<bundle cid>=<sha256>,...
// TAB <capability source hashes or ->`, and since the owner rulings of 2026-10-31 (section 12) a money capability's hash
// is written `<hash>:money`, since round 5 (2026-11-02) a sixth field carries the kernel money digest `fxn release
// build` derives, and a money or emergency release adds `TAB money|emergency` (a normal one adds nothing, so
// every earlier body keeps its bytes). A record carries the hex of its UTF-8 bytes in C[1]. Self-contained (no
// import), so a page vendors this one file. Exports only; no top-level work.

import * as shadow from "./flx-v1-shadow.mjs";
// Migration step 3: this file's box readers, in shadow beside the generated V1 reader.
const SHADOW_DOOR_0 = new shadow.Door("flx-release-builders recordBlock");
const SHADOW_DOOR_1 = new shadow.Door("flx-release-builders recordCBlocks");
export const KIND_RELEASE = "KNODEREL1";
export const KIND_RELEASE_CANCEL = "KNODERELOFF1";
export const NETPARAMS_CHAIN = "netparams";
export const GENESIS_PROTOCOL = 1;
/** A target word is `[a-z0-9_-]`, 1 to TARGET_MAX bytes; a release ships at most TARGETS_MAX targets and lists at most
 *  CAPABILITY_HASHES_MAX node-run capability source hashes (the crate's constants of the same names). */
export const TARGET_MAX = 48;
export const TARGETS_MAX = 16;
export const CAPABILITY_HASHES_MAX = 256;
/** The release classes (`flx_release::ReleaseClass`); a normal release writes no class field. */
export const RELEASE_CLASSES = Object.freeze(["normal", "money", "emergency"]);
/** The mark after a money capability's source hash. */
export const MONEY_MARK = "money";
/** How long an emergency release stays in force after its start time, in seconds (14 days). */
export const EMERGENCY_LIFETIME_SECS = 14 * 86400;

const U32_MAX = 4294967295n;
const I64_MAX = 9223372036854775807n;

/** Rust's `{:?}` of a str for the texts a body can hold: quoted, with `\`, `"`, newline, tab and return escaped. */
function dbg(text) {
  return `"${String(text).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\t/g, "\\t").replace(/\r/g, "\\r")}"`;
}

/** The crate's `is_hex`: exactly `len` lowercase hex digits. */
export function isHex(text, len) {
  return typeof text === "string" && text.length === len && /^[0-9a-f]*$/.test(text);
}

/** The crate's `is_cid_shape`: 64 lowercase hex digits. */
export function isCidShape(text) {
  return isHex(text, 64);
}

/** The crate's `is_target_word`. */
export function isTargetWord(text) {
  return typeof text === "string" && text.length > 0 && text.length <= TARGET_MAX && /^[a-z0-9_-]*$/.test(text);
}

/** Canonical digits only (no leading zeros, no sign), at least `min`, at most `max`: a body that re-renders
 *  differently is another record. Returns the BigInt, or null. A BigInt, not a Number: an i64 (the start time, a
 *  record's M) does not fit a Number past 2^53, and the crate's vectors carry i64::MAX. */
function canonical(text, min, max) {
  if (!/^[0-9]+$/.test(text)) return null;
  const n = BigInt(text);
  if (n.toString() !== text || n < min || n > max) return null;
  return n;
}

/** Free text as the grammar carries it: lowercase hex of its UTF-8 bytes (`hex_of_utf8`). */
export function hexOfUtf8(text) {
  return Array.from(new TextEncoder().encode(text), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** The text behind `hexOfUtf8`, or a throw naming why `hexText` is not one (`utf8_of_hex`). */
export function utf8OfHex(hexText) {
  if (!/^[0-9a-fA-F]*$/.test(hexText) || hexText.length % 2 !== 0) {
    throw new Error(`${dbg(hexText)} is not hex. Missing: lowercase hex of the text's UTF-8 bytes. To fix: encode the text with hex_of_utf8`);
  }
  const bytes = new Uint8Array(hexText.length / 2);
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = parseInt(hexText.slice(2 * i, 2 * i + 2), 16);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${dbg(hexText)} is hex of bytes that are not UTF-8. Missing: UTF-8 text. To fix: encode the text with hex_of_utf8`);
  }
}

/** Read a body by shape only, as `ReleaseBody::read` does; the rules that need the network's state (the previous
 *  protocol, the notice) are the kernel's. Throws the crate's refusal: what failed, what is missing, what to do.
 *  Returns `{ protocol, start, commit, targets: [{ target, bundleCid, sha256 }], capabilityHashes, moneyHashes,
 *  kernelMoney, releaseClass }`; `start` is a BigInt (unix seconds, an i64), `protocol` a Number. */
export function readReleaseBody(text) {
  const fields = String(text).split("\t");
  let releaseClass = "normal";
  if (fields.length === 7) {
    const word = fields[6];
    if (word !== "money" && word !== "emergency") {
      throw new Error(`the release class ${dbg(word)} is not money or emergency. Missing: \`money\` or \`emergency\` as the seventh field, or no seventh field for a normal release. To fix: render the body with ReleaseBody::render`);
    }
    releaseClass = word;
  } else if (fields.length !== 6) {
    throw new Error(`a release body has 6 tab-separated fields (7 for a money or emergency release), this one has ${fields.length}. Missing: \`<protocol> TAB <start time> TAB <source commit> TAB <target>=<bundle cid>=<sha256>,... TAB <capability source hashes or -> TAB <kernel money digest> [TAB money|emergency]\`. To fix: render the body with ReleaseBody::render (a 5-field body is the grammar before round 5; the devnet's genesis is fresh, so build it again with fxn release build)`);
  }
  // Round 5 (2026-11-02, release-time-7): the sixth field is the kernel money digest `fxn release build` derived.
  const kernelMoney = fields[5];
  if (!isHex(kernelMoney, 64)) {
    throw new Error(`the kernel money digest ${dbg(kernelMoney)} is not 64 hex. Missing: the sha256 over the kernel's value-moving functions at the source commit (derive-capability-manifest.mjs --kernel-money-digest). To fix: build the body with fxn release build, which derives it`);
  }
  const [protocolText, startText, commit, targetsText, hashesText] = fields;
  const protocolBig = canonical(protocolText, 1n, U32_MAX);
  if (protocolBig === null) throw new Error(`the protocol ${dbg(protocolText)} is not a whole number of at least 1. Missing: the previous release's protocol plus 1. To fix: file the next protocol number`);
  const start = canonical(startText, 1n, I64_MAX);
  if (start === null) throw new Error(`the start time ${dbg(startText)} is not unix seconds. Missing: the start time, at least \`releasenotice\` seconds after the record's M. To fix: stamp the start time in unix seconds`);
  if (!isHex(commit, 40)) throw new Error(`the source commit ${dbg(commit)} is not 40 hex. Missing: the clean commit the binaries were built from. To fix: name the full commit hash (the release builder refuses a dirty tree)`);
  const targets = [];
  for (const entry of targetsText.split(",")) {
    const parts = entry.split("=");
    if (parts.length !== 3) throw new Error(`the target ${dbg(entry)} is not \`<target>=<bundle cid>=<sha256>\`. Missing: one target such as x86_64-linux-musl=<KBUNDLE1 cid>=<binary sha256>. To fix: name each target with its Bundle and its binary's sha256`);
    const [target, bundleCid, sha256] = parts;
    if (!isTargetWord(target) || !isCidShape(bundleCid) || !isHex(sha256, 64)) {
      throw new Error(`the target ${dbg(entry)} is off its rule. Missing: a target word of [a-z0-9_-] up to ${TARGET_MAX} characters, a 64-hex Bundle CID and a 64-hex sha256. To fix: name the target as the release builder prints it`);
    }
    if (targets.some((t) => t.target === target)) throw new Error(`the target ${dbg(target)} is named twice. Missing: each target once. To fix: drop the repeat`);
    targets.push({ target, bundleCid, sha256 });
  }
  if (targets.length > TARGETS_MAX) throw new Error(`${targets.length} targets, more than ${TARGETS_MAX}. Missing: at most ${TARGETS_MAX} targets. To fix: ship fewer targets per release`);
  let capabilityHashes = [];
  const moneyHashes = [];
  if (hashesText !== "-") {
    const list = [];
    for (const entry of hashesText.split(",")) {
      const colon = entry.indexOf(":");
      if (colon < 0) {
        list.push(entry);
        continue;
      }
      const [hash, mark] = [entry.slice(0, colon), entry.slice(colon + 1)];
      if (mark !== MONEY_MARK) throw new Error(`the capability hash mark ${dbg(mark)} is not \`${MONEY_MARK}\`. Missing: \`<hash>\` or \`<hash>:${MONEY_MARK}\` (a money capability, as its manifest's \`money yes\` line says). To fix: list the hashes as the release builder prints them`);
      if (!moneyHashes.includes(hash)) moneyHashes.push(hash);
      list.push(hash);
    }
    const bad = list.find((h) => !isHex(h, 64));
    if (bad !== undefined) throw new Error(`the capability source hash ${dbg(bad)} is not 64 hex. Missing: each node-run capability manifest's implementation source hash, or \`-\` for none. To fix: list the hashes the derived manifests carry`);
    if (list.length > CAPABILITY_HASHES_MAX) throw new Error(`${list.length} capability hashes, more than ${CAPABILITY_HASHES_MAX}. Missing: at most ${CAPABILITY_HASHES_MAX}. To fix: list fewer`);
    const seen = new Set();
    for (const h of list) {
      if (seen.has(h)) throw new Error(`the capability source hash ${h} is listed twice. Missing: each hash once. To fix: drop the repeat`);
      seen.add(h);
    }
    capabilityHashes = list;
  }
  // `protocol` is a Number (a u32 fits); `start` is a BigInt (an i64 does not). `renderReleaseBody` takes either.
  return { protocol: Number(protocolBig), start, commit, targets, capabilityHashes, moneyHashes, kernelMoney, releaseClass };
}

/** The body's one text, as `ReleaseBody::render` writes it. What a record carries is `hexOfUtf8` of this. */
export function renderReleaseBody(body) {
  const targets = body.targets.map((t) => `${t.target}=${t.bundleCid}=${t.sha256}`).join(",");
  const money = new Set(body.moneyHashes ?? []);
  const hashes = body.capabilityHashes.length ? body.capabilityHashes.map((h) => (money.has(h) ? `${h}:${MONEY_MARK}` : h)).join(",") : "-";
  const releaseClass = body.releaseClass ?? "normal";
  if (!RELEASE_CLASSES.includes(releaseClass)) throw new Error(`renderReleaseBody: the class ${dbg(releaseClass)} is not normal, money or emergency`);
  const classField = releaseClass === "normal" ? "" : `\t${releaseClass}`;
  return `${body.protocol}\t${body.start}\t${body.commit}\t${targets}\t${hashes}\t${body.kernelMoney}${classField}`;
}

/** `hexOfUtf8(renderReleaseBody(body))`: the body as a record's C[1] carries it (`ReleaseBody::render_hex`). */
export function renderReleaseBodyHex(body) {
  return hexOfUtf8(renderReleaseBody(body));
}

/** The payload of the first block labelled `label` in a record text (`CHAIN...` is another label that starts with
 *  `C`; the crate's `record_block` and dense-wire's `Raw::c` skip it the same way). */
export function recordBlock(text, label) {
  shadow.chainAwareLetters(SHADOW_DOOR_0, String(text));
  const block = String(text).split("-").find((b) => b.startsWith(label) && !(label === "C" && b.startsWith("CHAIN")));
  return block === undefined ? null : block.slice(1);
}

/** Every `C` block of a record text, in order: C[0] is the previous record, the rest the kind's own. */
export function recordCBlocks(text) {
  shadow.chainAwareLetters(SHADOW_DOOR_1, String(text));
  return String(text).split("-").filter((b) => b.startsWith("C") && !b.startsWith("CHAIN")).map((b) => b.slice(1));
}

function readSignerAndClock(text) {
  const signer = recordBlock(text, "G");
  if (signer === null || !isHex(signer, 64)) throw new Error("the record has no 64-hex G signer. Missing: the signer's key. To fix: build the record with signed_record");
  const mText = recordBlock(text, "M");
  const m = mText === null ? null : canonical(mText, 1n, I64_MAX);
  if (m === null) throw new Error("the record has no M clock. Missing: M, the record's own clock: the notice runs from it. To fix: stamp the record with the time it is filed");
  return { signer, m, chain: recordBlock(text, "N") ?? "" };
}

/** A `KNODEREL1` record text read by shape (`ReleaseRecord::read`): who signed it (G), its clock M, its chain N, its
 *  body and the council's votes blob (C[2], absent for release 1). Signatures, quorum, order and notice are the
 *  kernel's to judge. Returns `{ signer, m, chain, body, votesCid }` (`m` a BigInt; `votesCid` null for release 1). */
export function readReleaseRecord(text) {
  const kind = recordBlock(text, "K") ?? "?";
  if (kind !== KIND_RELEASE) throw new Error(`the record is a ${kind} record, not ${KIND_RELEASE}. Missing: a KNODEREL1. To fix: read the record the PROTOCOL reply named`);
  const { signer, m, chain } = readSignerAndClock(text);
  const c = recordCBlocks(text);
  if (c[1] === undefined) throw new Error("the record has no C[1] body. Missing: C[1] = the body as hex of UTF-8. To fix: render the body with ReleaseBody::render");
  let bodyText;
  try {
    bodyText = utf8OfHex(c[1]);
  } catch (error) {
    throw new Error(`the record's C[1] body: ${error.message}`);
  }
  const body = readReleaseBody(bodyText);
  let votesCid = null;
  if (c[2] !== undefined) {
    if (!isCidShape(c[2])) throw new Error(`the record's C[2] ${dbg(c[2])} is not a CID. Missing: the council's votes blob CID, or no C[2] for release 1. To fix: publish the votes blob and name its CID`);
    votesCid = c[2];
  }
  return { signer, m, chain, body, votesCid };
}

/** A `KNODERELOFF1` record text read by shape (`CancelRecord::read`): who signed it, its clock, the release it
 *  cancels (C[1]) and the council's votes blob (C[2]). Whether two council keys signed the votes, and whether the
 *  first half of the notice has passed, are the kernel's to judge. Returns `{ signer, m, chain, releaseCid, votesCid }`. */
export function readCancelRecord(text) {
  const kind = recordBlock(text, "K") ?? "?";
  if (kind !== KIND_RELEASE_CANCEL) throw new Error(`the record is a ${kind} record, not ${KIND_RELEASE_CANCEL}. Missing: a KNODERELOFF1. To fix: read the cancel record the PROTOCOL reply's cancelled state points to`);
  const { signer, m, chain } = readSignerAndClock(text);
  const c = recordCBlocks(text);
  if (c[1] === undefined || !isCidShape(c[1])) throw new Error(`the record's C[1] ${dbg(c[1] ?? "-")} is not the release's CID. Missing: C[1] = the KNODEREL1's CID. To fix: name the release to cancel`);
  if (c[2] === undefined || !isCidShape(c[2])) throw new Error(`the record's C[2] ${dbg(c[2] ?? "-")} is not a CID. Missing: the council's votes blob CID (2 of the 5 council keys over the cancel's covered bytes). To fix: publish the votes blob and name its CID`);
  return { signer, m, chain, releaseCid: c[1], votesCid: c[2] };
}

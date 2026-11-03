// The site report builders (src/site_reports.rs, 2026-10-29). Self-contained apart from flx-crypto.mjs, so a site
// vendors this file beside flx-attest-proof.mjs; flx-builders.mjs re-exports it. Every builder mirrors the Rust builder
// byte for byte (`site_reports::build_report`, `build_report_retraction`, `build_roster`, which call
// `flx_cap_attest::build_attest`, `flx_cap_lineage::build_super` and `flx_cap_delegation::build_set`).
// Signer shape: `{ pubHex, signText(asciiText) -> Promise of hex signature }`.
//
//   report      KATTEST1 on `attest`: C[1] the report method, C[2] the report vocabulary, C[3] 64 zeros (the input is
//               the subject), C[4] the subject; O is the hex of one report word. A node takes it as
//               `RESOLVER_RECORD<TAB><text>` once the attest resolver is launched there.
//   retraction  KSUPER1 retract on `attest` by the reporter, naming the report's CID. The key then holds no report.
//   roster      KDLGSET1 of role `witness`, threshold 1, signed by its publisher. The first roster is the genesis key
//               alone. It is trusted through its publisher's signature, so a node may hold it as a blob (BLOB_PUT).
// Exports only; no top-level work.

import { sha256Hex } from "./flx-crypto.mjs";

export const REPORT_CHAIN = "attest";
export const REPORT_ROSTER_CHAIN = "delegate";
export const REPORT_ROSTER_ROLE = "witness";
export const REPORT_WORDS = Object.freeze(["phishing", "scam", "impersonation", "propaganda", "fine"]);
export const REPORT_METHOD_ID = "defxn.site-report.v1";
export const ATTEST_KIND = "KATTEST1";
export const ATTEST_RETRACT_KIND = "KSUPER1";
export const REPORT_ROSTER_KIND = "KDLGSET1";
const NO_CONTENT = "0".repeat(64);
const HEX64 = /^[0-9a-f]{64}$/;

/** The vocabulary blob, as `flx_cap_attest::Vocabulary::render` writes it. Its CID is its sha256. */
export const REPORT_VOCABULARY_TEXT = `FLX-ATTEST-VOCAB-V1\tclosed\t${REPORT_WORDS.join("\t")}\n`;
/** The method blob, as `flx_cap_attest::Method::render` writes `site_reports::report_method()`. */
export const REPORT_METHOD_TEXT = `FLX-ATTEST-METHOD-V1\t${REPORT_METHOD_ID}\nkind\topinion\nmodel\thuman\ninput\tsubject\nsubjects\t1\t1\noutput\tsite-report-word\n`;

const hexOfUtf8 = (text) => Array.from(new TextEncoder().encode(text), (b) => b.toString(16).padStart(2, "0")).join("");

export const reportVocabularyCid = () => sha256Hex(REPORT_VOCABULARY_TEXT);
export const reportMethodCid = () => sha256Hex(REPORT_METHOD_TEXT);

/** A site name's report subject: the sha256 of the name's UTF-8 bytes (Rust `site_reports::name_subject`). */
export const reportSubjectOfName = (name) => sha256Hex(name);

/** The read line: `ATTEST_ABOUT<TAB><subject><TAB><vocabulary CID><TAB><roster CID>`. */
export function attestAboutLine(subject, vocabulary, roster) {
  for (const [what, v] of [["subject", subject], ["vocabulary CID", vocabulary], ["roster CID", roster]]) requireCid(v, what, "pass 64 lowercase hex; a site name's subject is reportSubjectOfName(name).");
  return `ATTEST_ABOUT\t${subject}\t${vocabulary}\t${roster}`;
}

function requireCid(value, what, remedy) {
  if (typeof value !== "string" || !HEX64.test(value)) {
    throw new Error(`That ${what} is not addressable. Missing: 64 lowercase hex chars (got ${JSON.stringify(value)}). To fix: ${remedy}`);
  }
}

function head(pubHex, chain, nowSec, pos, prevCid) {
  if (!Number.isInteger(nowSec) || nowSec < 0 || nowSec > 99_999_999_999) {
    throw new Error("That clock is not unix seconds. Missing: nowSec as a whole number of seconds. To fix: pass Math.floor(Date.now() / 1000).");
  }
  if (!Number.isInteger(pos) || pos < 0) throw new Error("That position is not the signer's chain length. Missing: pos as a whole number. To fix: read it with HEAD <your key>.");
  requireCid(prevCid, "previous record CID", "read it with HEAD <your key>; a key's first record uses 64 zeros.");
  return `G${pubHex}-YLEDGERENTRY-V1-M${nowSec}-H${hexOfUtf8(pubHex)}-N${chain}`;
}

/** One report: a `KATTEST1` naming `subject` with one of REPORT_WORDS. */
export async function buildReportWithSigner({ signer, pos, prevCid, subject, word, nowSec }) {
  if (!REPORT_WORDS.includes(word)) {
    throw new Error(`That word ${JSON.stringify(word)} is not a report word. Missing: one of ${REPORT_WORDS.join(", ")}. To fix: pick a word from REPORT_WORDS; a new word needs a new vocabulary.`);
  }
  requireCid(subject, "subject", "use reportSubjectOfName(name) for a site, or the CID of the record you reviewed.");
  const body = `${head(signer.pubHex, REPORT_CHAIN, nowSec, pos, prevCid)}-K${ATTEST_KIND}-O${hexOfUtf8(word)}-J${pos}-C${prevCid}-C${await reportMethodCid()}-C${await reportVocabularyCid()}-C${NO_CONTENT}-C${subject}`;
  return `${body}-S${await signer.signText(body)}`;
}

/** Withdraw a report: the reporter's `KSUPER1` retract naming the report's CID. */
export async function buildReportRetractionWithSigner({ signer, pos, prevCid, report, nowSec }) {
  requireCid(report, "report CID", "pass the sha256 of the report record's text.");
  const body = `${head(signer.pubHex, REPORT_CHAIN, nowSec, pos, prevCid)}-K${ATTEST_RETRACT_KIND}-O${hexOfUtf8("retract")}-J${pos}-C${prevCid}-C${report}-C${NO_CONTENT}`;
  return `${body}-S${await signer.signText(body)}`;
}

/** A report roster: a `KDLGSET1` of role `witness`, threshold 1, naming `members` (the first roster: [genesis key]). */
export async function buildReportRosterWithSigner({ signer, pos, prevCid, members, nowSec }) {
  if (!Array.isArray(members) || members.length === 0 || members.length > 256) {
    throw new Error("That roster names no members or more than 256. Missing: 1 to 256 public keys. To fix: start with [genesis key].");
  }
  members.forEach((m, i) => {
    requireCid(m, "member key", "pass each reviewer's Ed25519 public key as 64 lowercase hex.");
    if (members.indexOf(m) !== i) throw new Error(`That roster names ${m} twice. Missing: distinct members. To fix: name each key once.`);
  });
  // L is the exact scalar: "0" followed by 2n (flx_cap_delegation::encode_exact); threshold 1 is "02".
  const body = `${head(signer.pubHex, REPORT_ROSTER_CHAIN, nowSec, pos, prevCid)}-K${REPORT_ROSTER_KIND}-O${hexOfUtf8(REPORT_ROSTER_ROLE)}-L02-J${pos}-C${prevCid}${members.map((m) => `-C${m}`).join("")}`;
  return `${body}-S${await signer.signText(body)}`;
}

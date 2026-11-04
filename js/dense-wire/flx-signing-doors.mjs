// Layer: app tooling (a check each page repo runs over its own served code). One rule for "a signed record leaves this
// page only through the guard", vendored byte for byte with flx-signing-guard.mjs.
//
// Round 13 (frontend lane, ZD3-1 class). Why: round 12 closed the doors its hunter named and four more stayed open,
// because each repo's scan was its own: genesis flagged a non-literal `.send(`, the DAO flagged `.submit("`, and
// defxn.com, deploy and treasury had none. defxn.com's FXN send signed at position 0 on HEAD_ERR and sent with
// `sendLine`, the skin doors sent `RESOLVER_RECORD` with `sendLine`, deploy's record deployer sent with `wire.submit`,
// and treasury sent spends with `wire().submit`. This module is the one scan; each repo walks its own folders (it
// finds its files, it is never handed a list) and fails on any finding.
//
// A finding is a line, outside the guard and outside comments, that:
//   (a) calls `.submit(`: a record sent with no position re-check, hold or CID check (use submitAtPosition);
//   (b) calls `.send(` or `.sendLine(` with a literal line that starts with a RECORD_TAGS command (use
//       submitAtPosition, or sendGuarded for a line signed elsewhere);
//   (c) calls `.send(` or `.sendLine(` with a line that is not a literal (a variable or a computed command), unless the
//       line itself goes through `sendGuarded(`. A read that passes a built query line is listed by the repo, with
//       why, and the repo's test fails when a listed line no longer sends;
//   (d) calls a WireClient method that sends a signed record itself (`domainClaim(`, ...). Those names are derived from
//       the repo's vendored flx-wire.mjs by `recordMethodsOf`: every method whose body is `return this.submit(`.
//
// RECORD_TAGS is derived, not authored: every payload tag the node reads (`chain_log.rs` PayloadTag::from_str) and
// every wire command whose authorization class is SignedRecord (`wire_table.rs` REGISTERED_COMMANDS).
// dense-wire's test/signing-doors.test.mjs reads both Rust files and fails when this list differs from them.

export const RECORD_TAGS = Object.freeze([
  // chain_log.rs PayloadTag::from_str
  "GENESIS", "SPEND", "RECEIVE", "ISSUE", "FREEZE", "REFUND", "SNAPSHOT", "TX_PREPARE", "TX_ACCEPT", "TX_COMMIT",
  "TX_FINALIZE", "TX_SEND", "TX_RECEIVE", "TX_ATOMIC", "PEER_ANNOUNCE", "PEER_LEAVE", "EARN_SIGNER",
  "RELAY_OPEN", "EARN_RELAY", "DOMAIN_TRANSFER", "PROVIDER_ANNOUNCE", "SUPPORTER_ANNOUNCE",
  "STAKE_LOCK", "CHAIN_LAUNCH", "PROVIDER_SLASH", "UNSTAKE", "DAO_FOUND", "DAO_TREASURY_INIT", "TREASURY_SPEND",
  "RESOLVER_LAUNCH", "RESOLVER_UPGRADE", "RESOLVER_RECORD", "CAPABILITY_LAUNCH", "CAPABILITY_UPGRADE", "ACL_EVIDENCE",
  "DOMAIN_CLAIM", "DOMAIN_RECORD_UPDATE", "DOMAIN_TRANSFER_V2", "DOMAIN_PURCHASE", "DOMAIN_RENT", "CURVE_SWAP_INTENT",
  "POOL_SWAP_INTENT", "POOL_POSITION_INTENT", "MANIFEST_RECEIPT", "MANIFEST_TRANSFER", "MANIFEST_LOCK", "MANIFEST_SLASH",
  "NATIVE_MINT", "NATIVE_CREDIT", "PAYOUT_CLAIM", "NATIVE_TRANSFER", "NATIVE_TREASURY_SPEND", "BRIDGE_ASSET",
  "BRIDGE_MINT", "BRIDGE_BURN", "BRIDGE_RELEASE",
  // wire_table.rs REGISTERED_COMMANDS, Auth::SignedRecord
  "SEGMENT_BINARY", "SEGMENT_OFFER", "GOSSIP", "REPL", "SRES", "SEG_SIG", "SEG_VOTE", "SEG_POL", "STRM_SUB", "STRM_PULL", "STRM_SEND",
  "STRM_LEAVE", "STRM_STAT", "DAO_SIGN", "TREASURY_INIT_SIGN", "TREASURY_SPEND_SIGN", "NATIVE_SPEND_SIGN",
  "BRIDGE_MINT_SIGN", "BRIDGE_SUBMIT", "BAL_CLAIM", "BAL_RESULT", "BAL_STORE", "NATIVE_SEND", "SEGMENT_ADOPT",
  "SWAP_SIGNER_RECORD", "FEE_CLAIM", "TREASURY_CLAIM", "MANIFEST_SUBMIT", "SWAP", "POSITION", "CURVE_SWAP",
  "SUPPORTER_WITNESS", "STORAGE_WITNESS",
]);

const TAGS = new Set(RECORD_TAGS);
const COMMENT = /^\s*(\/\/|\*|\/\*)/;

/** The leading command of a literal line argument (`"TAG\t..."`, `'TAG\t...'`, `` `TAG\t${x}` ``), or null. */
function literalCommand(arg) {
  const m = /^(["'`])([A-Z][A-Z0-9_]*)(\\t|\t|\1)/.exec(arg);
  return m ? m[2] : null;
}

/**
 * The findings in one file: `[{ at: "<path>:<line>", line: "<path>: <the line's text>", why }]`. `path` is the
 * repo-relative path the repo reports.
 * Files named flx-signing-guard.mjs are the guard itself and have none.
 */
export function signingDoorFindings(path, text, { methods = [] } = {}) {
  if (/(^|\/)flx-signing-(guard|doors)\.mjs$/.test(path)) return [];
  const out = [];
  const wrapped = methods.length ? new RegExp(`\\.(${methods.join("|")})\\(`) : null;
  String(text).split("\n").forEach((line, i) => {
    if (COMMENT.test(line)) return;
    const at = `${path}:${i + 1}`;
    const listedAs = `${path}: ${line.trim()}`;
    if (/\.submit\(/.test(line)) out.push({ at, line: listedAs, why: "sends a record with .submit(: use submitAtPosition (flx-signing-guard.mjs)" });
    const w = wrapped && wrapped.exec(line);
    if (w) out.push({ at, line: listedAs, why: `sends a signed record with WireClient.${w[1]}, which calls submit with no guard: use submitAtPosition` });
    for (const m of line.matchAll(/\.send(Line)?\(\s*([^\s)][^)]*)/g)) {
      const arg = m[2];
      if (/^["'`]/.test(arg)) {
        const command = literalCommand(arg);
        if (command && TAGS.has(command)) out.push({ at, line: listedAs, why: `sends a signed ${command} line outside the guard: use submitAtPosition, or sendGuarded for a line signed elsewhere` });
        else if (command === null && /^`\$\{/.test(arg)) out.push({ at, line: listedAs, why: "sends a line whose command is computed: use submitAtPosition, or list it as a read with why" });
        continue;
      }
      if (/sendGuarded\(/.test(line)) continue;
      out.push({ at, line: listedAs, why: "sends a line built elsewhere: use sendGuarded or submitAtPosition, or list it as a read with why" });
    }
  });
  return out;
}

/**
 * The repo's verdict over its files: findings not listed as reads, and listed reads that no longer send there (a stale
 * list hides the next door). `reads` maps a line to why it sends no signed record. A key is "<path>: <the line's text>",
 * so an edit above a listed line leaves the list right; the older "<path>:<line>" still reads. A text key covers one
 * line: a second line with the same text is a new door, and it is reported.
 */
export function signingDoorVerdict(files, reads = new Map(), options = {}) {
  const all = files.flatMap(({ path, text }) => signingDoorFindings(path, text, options));
  const covered = new Map();
  const unguarded = all.filter((f) => {
    if (reads.has(f.at)) {
      covered.set(f.at, f.at);
      return false;
    }
    if (!reads.has(f.line)) return true;
    if (!covered.has(f.line)) covered.set(f.line, f.at);
    return covered.get(f.line) !== f.at;
  });
  const stale = [...reads.keys()].filter((key) => !covered.has(key));
  return { unguarded, stale };
}

/** The WireClient methods in `flxWireText` (flx-wire.mjs) that send a signed record themselves: each method whose body
 *  is `return this.submit(`. Derived from the file, so a new wrapper is scanned the day it is added. */
export function recordMethodsOf(flxWireText) {
  return [...String(flxWireText).matchAll(/^\s+(?:async\s+)?([a-zA-Z]\w*)\([^)]*\)\s*\{\s*\n\s*return this\.submit\(/gm)].map((m) => m[1]);
}

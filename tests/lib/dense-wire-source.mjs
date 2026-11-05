/* Where this repo's vendored dense-wire copies come from: ONE answer for every drift check here
   (tests/vendored-dense-wire.test.mjs, tests/gateway-dense-wire-vendor.test.mjs,
   tests/dense-wire-object-proof-vendor.test.mjs).

   The source is a commit, never a working tree: `git show <rev>:dense-wire/web/<name>` in DENSE_WIRE_REPO (default:
   the sibling defxn-defi-rs checkout), DENSE_WIRE_REV (default below). This is the rule the genesis, defxn-dao and
   deploy repos use (genesis test/vendored.test.mjs). Before round 11 the checks here read the sibling's working tree,
   which another session keeps on its own branch with uncommitted files, so what they compared against was not what
   ships. DENSE_WIRE_WEB (a dense-wire/web folder) still overrides, and its files are then read as they are on disk.

   2026-11-03 (audit round 11, council lane): the default rev is audit-fix-all-r10 (23dc083), the branch that merges
   the round-10 fixes. Set it to main once that branch is merged.

   2026-11-03 (audit round 11 merge): the default rev is audit-fix-all-r11. flx-dumb-parser.mjs (both folders) and
   js/dense-wire/flx-transfer-builders.mjs were re-copied from it with git show; every other copy was already
   byte-identical.

   2026-11-03 (audit round 12, frontend lane): the default rev is audit-fix-r12-frontend. flx-signing-guard.mjs (the
   CID a page chains on is sha256 of the signed text, and sent bytes are held per position: flooder ZD3-1),
   flx-dao-builders.mjs (vote bytes bound to the node's network: ZD3-8) and flx-resolver-record-client.mjs were
   re-copied from it with git show.

   2026-11-03 (audit round 12 merge): the default rev is audit-fix-all-r12, the branch that merges the seven
   round-12 dense-wire lanes. flx-dao-gov-builders.mjs, flx-native-transfer.mjs, flx-object-builders.mjs (both folders) and
   flx-object-proof.mjs were re-copied from it with git show. flx-quorum.mjs is a new copy:
   the one browser quorum rule, which flx-dao-gov-builders.mjs now imports.

   2026-11-03 (audit round 13, frontend lane): the default rev is a COMMIT, 19c48d3 on audit-fix-r13-frontend, never a
   branch name: a branch moves, so a pin that names one checks against whatever the branch holds that day (repo map
   2026-11-03, "the pins name a branch, not a commit"). flx-signing-guard.mjs (both folders: HEAD checked against a
   witness node, the line sender, agreedRead), flx-resolver-record-client.mjs (gateway: writes through the guard) and
   the new flx-signing-doors.mjs (the one door scan) were re-copied from it with git show.

   2026-11-04 (round 14, wallet-final lane): the default rev is eda25f1 on audit-fix-r14-wallet-final (audit-fix-all-r14
   plus the payment words). js/dense-wire/flx-payment-status.mjs is a new copy: the one rule for what a payment is
   called, final only when the node's CONFIRMED says final, which js/ark/dense-wire-wallet.mjs now imports.
   js/dense-wire/flx-transfer-builders.mjs was re-copied (claimTreasuryLeg takes a network).

   2026-11-04 (same lane, history follow-up): the default rev is 73de3e9, which adds paymentLabel (the history badge).
   flx-payment-status.mjs was re-copied from it with git show. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OVERRIDE = process.env.DENSE_WIRE_WEB || null;
export const REPO = process.env.DENSE_WIRE_REPO || path.resolve(ROOT, '..', 'defxn-defi-rs');
// 2026-11-05 (names rulings N1 to N3): the default rev is 4a74645 on names-rulings. flx-builders.mjs (isTaggedLabel:
// no xn-- label; the KDOMSAFE1 builders) flx-signing-doors.mjs (DOMAIN_SAFE) and flx-domain-proof.mjs (KDOMSAFE1) were re-copied from it with git show.
export const REV = process.env.DENSE_WIRE_REV || '4a7464504bcadf78511c8ae4845a572a9e6c23e2';

/** Where `name` (a path under dense-wire/web) is read from, for messages. */
export function sourceName(name) {
  return OVERRIDE ? path.join(OVERRIDE, name) : `${REPO} ${REV}:dense-wire/web/${name}`;
}

/** The source bytes of `name`, or null when this machine does not have them (a skip by name, never a pass). */
export function sourceOf(name) {
  if (OVERRIDE) return fs.existsSync(path.join(OVERRIDE, name)) ? fs.readFileSync(path.join(OVERRIDE, name)) : null;
  try {
    return execFileSync('git', ['-C', REPO, 'show', `${REV}:dense-wire/web/${name}`], { maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
}

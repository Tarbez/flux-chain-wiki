/* Where this repo's vendored dense-wire copies come from: ONE answer for every drift check here
   (tests/vendored-dense-wire.test.mjs, tests/gateway-dense-wire-vendor.test.mjs,
   tests/dense-wire-object-proof-vendor.test.mjs).

   The source is a commit, never a working tree: `git show <rev>:dense-wire/web/<name>` in DENSE_WIRE_REPO (default:
   the sibling defxn-defi-rs checkout), DENSE_WIRE_REV (default below). This is the rule the genesis, defxn-dao and
   deploy repos use (genesis test/vendored.test.mjs). Before round 11 the checks here read the sibling's working tree,
   which another session keeps on its own branch with uncommitted files, so what they compared against was not what
   ships. DENSE_WIRE_WEB (a dense-wire/web folder) still overrides, and its files are then read as they are on disk.

   2026-11-03 (audit round 11, council lane): the default rev is audit-fix-all-r10 (23dc083), the branch that merges
   the round-10 fixes. Set it to main once that branch is merged. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OVERRIDE = process.env.DENSE_WIRE_WEB || null;
export const REPO = process.env.DENSE_WIRE_REPO || path.resolve(ROOT, '..', 'defxn-defi-rs');
export const REV = process.env.DENSE_WIRE_REV || 'audit-fix-all-r10';

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

// Round 13 (pre-genesis repo map 2026-11-03): js/ark/ml-dsa.js, the ML-DSA-87 code council seats sign with, was a noble
// bundle with no version and no hash. It is now built by scripts/build-ml-dsa.cjs from scripts/ml-dsa-entry.mjs and
// pinned inputs (scripts/ml-dsa-inputs.lock). On audit-fix-defxn-all-r12 (781101c) both cases fail: the header names
// no version and no build script exists. The rebuild needs fxn-auth's node_modules; skipped by name otherwise.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const site = new URL('..', import.meta.url).pathname;
const flux = process.env.ARK_FLUX_ROOT || join(site, '..');
const skip = existsSync(join(site, 'node_modules', '.bin', 'esbuild')) && existsSync(join(flux, 'fxn-auth', 'node_modules', '@noble', 'post-quantum')) ? false : 'needs node_modules and fxn-auth/node_modules/@noble/post-quantum';

test('the served ML-DSA bundle names its version and the digest of its pinned inputs', () => {
  const head = readFileSync(join(site, 'js', 'ark', 'ml-dsa.js'), 'utf8').slice(0, 600);
  assert.match(head, /@noble\/post-quantum 0\.7\.0 ml_dsa87/);
  assert.match(head, /scripts\/ml-dsa-inputs\.lock,\s+digest [0-9a-f]{64}/);
});

test('the served ML-DSA bundle is exactly the build of its pinned inputs', { skip }, () => {
  const out = execFileSync(process.execPath, ['scripts/build-ml-dsa.cjs', '--check'], { cwd: site, env: { ...process.env, ARK_FLUX_ROOT: flux } }).toString();
  assert.match(out, /ml-dsa ok/);
});

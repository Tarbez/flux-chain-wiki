// Round 12, flooder ZD3-6: the sign-in bundle that holds the FXN ID root on every signing page was built from whatever
// sat on disk in the sibling checkouts and node_modules, with no commit pin and no input hash. On audit-fix-defxn-all-r11
// (70d845f) scripts/build-auth.cjs read no pin table, so each case below fails there: a changed input built a new
// bundle with no refusal. Needs the bundle's inputs on this machine (ARK_FLUX_ROOT as in scripts/auth-inputs.tsv's
// header, and node_modules); skipped by name otherwise, never counted as a pass.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const site = new URL('..', import.meta.url).pathname;
const bundle = join(site, 'js', 'admin', 'auth.js');
const skip = existsSync(join(site, 'node_modules', '.bin', 'esbuild')) && process.env.ARK_FLUX_ROOT ? false : 'needs node_modules and ARK_FLUX_ROOT (the pinned inputs)';

function build(env) {
  try {
    execFileSync(process.execPath, ['scripts/build-auth.cjs'], { cwd: site, env: { ...process.env, ...env }, stdio: 'pipe' });
    return null;
  } catch (error) { return String(error.stderr || error.message); }
}

test('the served bundle names the digest of the pins it was built from', () => {
  assert.match(readFileSync(bundle, 'utf8').slice(0, 300), /^\/\* FXN sign-in bundle, built from pinned inputs: scripts\/auth-inputs\.tsv and \.lock, digest [0-9a-f]{64} \*\/\n/);
});

test('an input whose bytes differ from the lock is refused by name, and the bundle is not rewritten', { skip }, () => {
  const before = readFileSync(bundle);
  const dir = mkdtempSync(join(tmpdir(), 'auth-pins-'));
  const lock = readFileSync(join(site, 'scripts', 'auth-inputs.lock'), 'utf8').split('\n');
  const at = lock.findIndex((l) => /^[0-9a-f]{64}\t/.test(l));
  lock[at] = '0'.repeat(64) + lock[at].slice(64);
  writeFileSync(join(dir, 'lock'), lock.join('\n'));
  const why = build({ AUTH_INPUTS_LOCK: join(dir, 'lock') });
  assert.match(why ?? '', /hashes to [0-9a-f]{64}, and scripts\/auth-inputs\.lock pins 0{64}.*Missing: .*To fix: .*Nothing was written/s);
  assert.ok(readFileSync(bundle).equals(before), 'the refused build wrote nothing');
});

test('a repo at a commit other than its pin is refused by name', { skip }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'auth-pins-'));
  const tsv = readFileSync(join(site, 'scripts', 'auth-inputs.tsv'), 'utf8').replace(/^(fxn-auth\t)[0-9a-f]{40}$/m, `$1${'1'.repeat(40)}`);
  writeFileSync(join(dir, 'tsv'), tsv);
  assert.match(build({ AUTH_INPUTS_TSV: join(dir, 'tsv') }) ?? '', /fxn-auth is at [0-9a-f]{40}, and the bundle is pinned to 1{40}/);
});

test('an input no pin names is refused by name', { skip }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'auth-pins-'));
  writeFileSync(join(dir, 'lock'), '# empty\n');
  assert.match(build({ AUTH_INPUTS_LOCK: join(dir, 'lock') }) ?? '', /scripts\/auth-inputs\.lock has no hash for it/);
});

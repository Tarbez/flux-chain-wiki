// Round 14 ("signpins", owner ruling 2026-11-04): no signing page carries tweetnacl. flux-claims' ed25519 and
// deadark-identity-core's root-signing-handle are WebCrypto only and refuse a runtime with no built-in Ed25519, and
// scripts/build-auth.cjs greps the bundle it wrote (scripts/tweetnacl-free.cjs) and removes it on any tweetnacl code.
// On defxn 493aee1 (round 13) js/admin/auth.js carried tweetnacl's whole nacl-fast.js as the fallback: cases 2 and 3
// below fail there. Each case names what it guards.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
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

// 5. Round 14 follow-up: every file a signing page serves, not only the sign-in bundle. js/admin/vendor/auth-kit-create.js
//    (no pipeline; it signed with tweetnacl on every runtime) was served beside the bundle on /account; it is gone, and the
//    create panel uses the bundle's createFxnId. The signing pages are FOUND: every catalog route whose scripts include
//    js/admin/auth.js, and every HTML file that loads it. Each one's scripts (the route's scripts, the shell's when a route
//    signs, and their built copies under js/min/) must carry no tweetnacl code. Fails on 493aee1: /account served
//    js/admin/vendor/auth-kit-create.js. admin-app.html keeps js/admin/vendor/tweetnacl.js (nacl.box content encryption;
//    no native XSalsa20) and loads no sign-in, so it is no signing page; the case requires that it stays so.
const require_ = createRequire(import.meta.url);
const { loadCatalog, servedPath, keyOf } = require_('../scripts/lib/page-scripts.cjs');
const scriptTags = (html) => [...html.matchAll(/<script[^>]*\ssrc="([^"?#]+)/g)].map((m) => m[1].replace(/^\.?\//, ''));
test('no file a signing page serves carries tweetnacl code', () => {
  const served = new Set();
  const catalog = loadCatalog(site);
  const signingRoutes = Object.entries(catalog).filter(([, entry]) => entry.scripts.includes('js/admin/auth.js'));
  assert.ok(signingRoutes.length > 0, 'a catalog route signs');
  for (const [, entry] of signingRoutes) for (const s of entry.scripts) { served.add(s); served.add(servedPath(s)); }
  const htmls = readdirSync(site).filter((f) => f.endsWith('.html'));
  const signingHtml = htmls.filter((f) => scriptTags(readFileSync(join(site, f), 'utf8')).includes('js/admin/auth.js'));
  for (const f of [...signingHtml, 'index.html']) for (const s of scriptTags(readFileSync(join(site, f), 'utf8'))) served.add(s);
  const files = [...served].filter((f) => existsSync(join(site, f))).sort();
  assert.ok(files.includes('js/admin/auth.js') && files.includes('js/ark/auth-kit-create-panel.js'));
  assert.equal(files.includes('js/admin/vendor/auth-kit-create.js'), false, 'js/admin/vendor/auth-kit-create.js is served again');
  assert.equal(files.includes('js/admin/vendor/tweetnacl.js'), false, 'a signing page loads js/admin/vendor/tweetnacl.js');
  const carrying = files.map((f) => [f, tweetnaclMarks(readFileSync(join(site, f)))]).filter(([, m]) => m.length).map(([f, m]) => `${f} (${m.join(', ')})`);
  assert.deepEqual(carrying, [], 'these files a signing page serves carry tweetnacl code');
  assert.equal(scriptTags(readFileSync(join(site, 'admin-app.html'), 'utf8')).includes('js/admin/auth.js'), false, 'admin-app.html (which loads tweetnacl.js for nacl.box) loads no sign-in');
  assert.equal(keyOf('js/ark/auth-kit-create-panel.js'), 'ark/auth-kit-create-panel');
});

// 6. The create panel makes every FXN ID through the bundle's createFxnId and names no other writer.
test('the create panel has one writer: ArkAdminAuth.createFxnId', () => {
  const panel = readFileSync(join(site, 'js', 'ark', 'auth-kit-create-panel.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(panel, /window\.ArkAdminAuth\.createFxnId\(/);
  assert.doesNotMatch(panel, /ArkAuthKitCreate\.create|auth-kit-create\.js/);
  assert.equal(existsSync(join(site, 'js', 'admin', 'vendor', 'auth-kit-create.js')), false);
});

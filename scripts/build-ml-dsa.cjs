// Build js/ark/ml-dsa.js, the ML-DSA-87 bundle every signing page loads (window.ArkMlDsa), from pinned inputs.
//
// Why (pre-genesis repo map 2026-11-03, round 13 frontend lane): js/ark/ml-dsa.js was a noble bundle with no version
// and no hash, copied into genesis, the DAO, deploy and treasury, and council seats sign with ML-DSA-87. Nobody could
// say which code it was. It is rebuilt here byte for byte (proved 2026-11-03: the served body is exactly this build)
// from scripts/ml-dsa-entry.mjs and @noble/post-quantum 0.7.0 (@noble/curves 2.3.0, @noble/hashes 2.3.0) as installed
// in fxn-auth's node_modules. Every file esbuild reads is found from its metafile and must match its sha256 in
// scripts/ml-dsa-inputs.lock (`<sha256>\t<path under the flux folder>`), or the build refuses by name and writes
// nothing. The bundle's header names the lock's digest.
//   node scripts/build-ml-dsa.cjs           build and write js/ark/ml-dsa.js
//   node scripts/build-ml-dsa.cjs --check   build in memory; exit 1 when js/ark/ml-dsa.js differs
//   node scripts/build-ml-dsa.cjs --print-pins   print the lock rows for the current inputs (review before pinning)
// ARK_FLUX_ROOT names the folder holding fxn-auth (default: this site's parent).
const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const site = process.cwd();
if (!fs.existsSync(path.join(site, 'scripts', 'ml-dsa-entry.mjs'))) throw new Error('run build-ml-dsa.cjs from the site directory');
const fluxRoot = process.env.ARK_FLUX_ROOT || path.resolve(site, '..');
const esbuild = path.join(site, 'node_modules', '.bin', 'esbuild');
const OUT = path.join(site, 'js', 'ark', 'ml-dsa.js');
const LOCK = process.env.ML_DSA_INPUTS_LOCK || path.join(site, 'scripts', 'ml-dsa-inputs.lock');
const refuse = (failure, missing, remedy) => { console.error(failure + ' Missing: ' + missing + ' To fix: ' + remedy + ' Nothing was written.'); process.exit(1); };
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'build-ml-dsa-'));
try {
  execFileSync(esbuild, ['scripts/ml-dsa-entry.mjs', '--bundle', '--minify', '--format=iife', '--platform=browser',
    '--alias:@noble/post-quantum=' + path.join(fluxRoot, 'fxn-auth', 'node_modules', '@noble', 'post-quantum'),
    '--metafile=' + path.join(temp, 'meta.json'), '--outfile=' + path.join(temp, 'out.js'), '--log-level=error'], { cwd: site, stdio: 'inherit' });
  const rows = Object.keys(JSON.parse(fs.readFileSync(path.join(temp, 'meta.json'), 'utf8')).inputs)
    .filter((p) => p !== 'scripts/ml-dsa-entry.mjs')
    .map((p) => { const abs = path.resolve(site, p); return `${sha256(fs.readFileSync(abs))}\t${path.relative(fluxRoot, abs)}`; })
    .sort();
  if (process.argv.includes('--print-pins')) { console.log(rows.join('\n')); process.exit(0); }
  const locked = new Map((fs.existsSync(LOCK) ? fs.readFileSync(LOCK, 'utf8') : '').split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split('\t')).map(([h, k]) => [k, h]));
  for (const row of rows) {
    const [h, key] = row.split('\t');
    if (!locked.has(key)) refuse(`The ML-DSA bundle reads ${key}, and scripts/ml-dsa-inputs.lock has no hash for it.`, `a "<sha256><TAB>${key}" row.`, 'review the file and add its hash (node scripts/build-ml-dsa.cjs --print-pins).');
    if (locked.get(key) !== h) refuse(`${key} hashes to ${h}, and scripts/ml-dsa-inputs.lock pins ${locked.get(key)}.`, 'the pinned bytes.', 'restore @noble/post-quantum 0.7.0 in fxn-auth, or review the new bytes and update the lock.');
  }
  const digest = sha256(rows.join('\n'));
  const header = `/* @noble/post-quantum 0.7.0 ml_dsa87 (with @noble/curves 2.3.0 and @noble/hashes 2.3.0), bundled for a no-build-step
   static site by scripts/build-ml-dsa.cjs from scripts/ml-dsa-entry.mjs. Inputs pinned in scripts/ml-dsa-inputs.lock,
   digest ${digest}. Exposes window.ArkMlDsa = {keygen(seed), sign(message, secretKey), verify(signature, message,
   publicKey)}, the argument order of fxn-auth/src/cryptoAgility.mjs. Consumers pin this file by its sha256. */\n\n`;
  const built = Buffer.concat([Buffer.from(header), fs.readFileSync(path.join(temp, 'out.js'))]);
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(OUT) || Buffer.compare(fs.readFileSync(OUT), built) !== 0) refuse('js/ark/ml-dsa.js is not the bundle its pinned inputs build.', 'the built bundle.', 'run node scripts/build-ml-dsa.cjs and review the change.');
    console.log('ml-dsa ok: js/ark/ml-dsa.js is the build of its pinned inputs, sha256 ' + sha256(built));
  } else {
    fs.writeFileSync(OUT, built);
    console.log('js/ark/ml-dsa.js sha256 ' + sha256(built));
  }
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

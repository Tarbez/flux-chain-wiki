// The one check that a built signing-page bundle carries no tweetnacl code (owner ruling 2026-11-04, round 14
// "signpins": no tweetnacl fallback in any signing page; WebCrypto Ed25519 or a refusal).
//
// It greps the BUILT bytes, not the import graph: what ships is the file, and a bundler can inline a module whose
// import nobody wrote down. The marks are names tweetnacl's nacl-fast.js defines that survive minification
// (object keys of `nacl.lowlevel`, and its own error strings), so a minified copy of tweetnacl always carries some.
// tests/tweetnacl-free.test.mjs proves that: it minifies tweetnacl's real nacl-fast.js and requires every
// mark below to be found in it, and requires the round-13 bundle (defxn 493aee1, which carried the fallback) to fail.
//
// scripts/build-auth.cjs runs it on the bundle it wrote and removes the bundle on any mark. Run by hand on any copy:
//   node scripts/tweetnacl-free.cjs <file>...      exit 1 naming each file and the marks found in it.
//   node scripts/tweetnacl-free.cjs --site <dir>...
//                                                  walks every file a site can serve (servedFiles below) and exits 1
//                                                  naming each one that carries tweetnacl code, loads tweetnacl by
//                                                  name, or is named after it.
// It reads only; it writes nothing.
//
// Round 14 ("signin-native"): the --site walk FINDS its subjects. It reads every folder under the site and keeps every
// script and page in it, so a file nobody listed is still checked. Only folders that no FXN site serves are skipped
// (NOT_SERVED: tests, build scripts, docs, installed packages); the test reference for tweetnacl lives in one of those,
// tests/reference/. A skipped folder is named in the result, never dropped silently.
const fs = require('node:fs');

/** Names only tweetnacl defines, each kept by a minifier (property keys and string literals). */
const MARKS = Object.freeze([
  'crypto_sign_keypair',
  'crypto_sign_open',
  'crypto_box_keypair',
  'crypto_scalarmult_base',
  'crypto_secretbox_open',
  'crypto_onetimeauth_verify',
  'bad secret key size',
  'unexpected type, use Uint8Array',
]);

/** The marks found in `text` (a string or Buffer); empty means no tweetnacl code was found. */
function tweetnaclMarks(text) {
  const s = Buffer.isBuffer(text) ? text.toString('latin1') : String(text);
  return MARKS.filter((mark) => s.includes(mark));
}

/** Folders no FXN site serves. Everything else under a site root is walked. */
const NOT_SERVED = Object.freeze(['node_modules', '.git', '.vendor', 'test', 'tests', 'scripts', 'docs', 'ops', 'planning', 'proposals', 'target']);
const SERVED_EXT = /\.(?:m?js|cjs|html?)$/i;

/** Every script and page under `root` outside NOT_SERVED: { files, skipped } (paths relative to root, sorted). */
function servedFiles(root) {
  const path = require('node:path');
  const files = [], skipped = [];
  const walk = (rel) => {
    for (const entry of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
      const child = rel ? rel + '/' + entry.name : entry.name;
      if (entry.isDirectory()) { if (NOT_SERVED.includes(entry.name)) skipped.push(child); else walk(child); }
      else if (entry.isFile() && SERVED_EXT.test(entry.name)) files.push(child);
    }
  };
  walk('');
  return { files: files.sort(), skipped: skipped.sort() };
}

/* An import, a require, a dynamic import or a script src whose quoted target names tweetnacl. Built from a string with the
   quote characters escaped (\x22 \x27 \x60), so no quote character appears in this line. */
const LOADS = new RegExp('(?:\\bfrom\\s*|\\bimport\\s*\\(\\s*|\\brequire\\s*\\(\\s*|\\bsrc\\s*=\\s*)([\\x22\\x27\\x60])([^\\x22\\x27\\x60]*(?:tweetnacl|nacl-fast)[^\\x22\\x27\\x60]*)\\1', 'g');

/** Each way `text` loads tweetnacl by name: an import, a require, a dynamic import or a script src. */
function tweetnaclLoads(text) {
  const s = Buffer.isBuffer(text) ? text.toString('latin1') : String(text);
  return [...s.matchAll(LOADS)].map((m) => m[2]);
}

/** Every served file under `root` that carries tweetnacl: [{ file, marks, loads, named }], empty when the site is free of it. */
function siteFindings(root) {
  const path = require('node:path');
  const { files, skipped } = servedFiles(root);
  const findings = [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(root, file));
    const marks = tweetnaclMarks(text), loads = tweetnaclLoads(text), named = /tweetnacl|nacl-fast/i.test(path.basename(file));
    if (marks.length || loads.length || named) findings.push({ file, marks, loads, named });
  }
  return { files, skipped, findings };
}

module.exports = { MARKS, NOT_SERVED, tweetnaclMarks, tweetnaclLoads, servedFiles, siteFindings };

if (require.main === module && process.argv[2] === '--site') {
  const sites = process.argv.slice(3);
  if (sites.length === 0) { console.error('usage: node scripts/tweetnacl-free.cjs --site <dir>... (names each served file that carries tweetnacl)'); process.exit(2); }
  let bad = 0;
  for (const site of sites) {
    const { files, skipped, findings } = siteFindings(site);
    console.log(`${site}: ${files.length} served files walked. Folders not served, so skipped: ${skipped.length ? skipped.join(', ') : '(none)'}`);
    for (const f of findings) {
      bad += 1;
      const why = [f.marks.length ? `carries tweetnacl code (${f.marks.join(', ')})` : '', f.loads.length ? `loads ${f.loads.join(', ')}` : '', f.named ? 'is named after tweetnacl' : ''].filter(Boolean).join(', and ');
      console.error(`${site}/${f.file} ${why}. Missing: a served file with no tweetnacl in it. To fix: use WebCrypto Ed25519 (flux-claims ed25519.mjs) or js/admin/fxn-box.js for the NaCl box, and re-copy from the fixed source.`);
    }
    if (!findings.length) console.log(`tweetnacl-free: ${site}`);
  }
  process.exit(bad ? 1 : 0);
}

if (require.main === module && process.argv[2] !== '--site') {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('usage: node scripts/tweetnacl-free.cjs <bundle>... (names each file that carries tweetnacl code)');
    process.exit(2);
  }
  let bad = 0;
  for (const file of files) {
    const marks = tweetnaclMarks(fs.readFileSync(file));
    if (marks.length === 0) { console.log(`tweetnacl-free: ${file}`); continue; }
    bad += 1;
    console.error(`${file} carries tweetnacl code (found: ${marks.join(', ')}). Missing: a bundle built with no tweetnacl input. To fix: rebuild it with node scripts/build-auth.cjs from the native-only sources, and re-copy it.`);
  }
  process.exit(bad ? 1 : 0);
}

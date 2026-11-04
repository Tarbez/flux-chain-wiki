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
// It reads only; it writes nothing.
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

module.exports = { MARKS, tweetnaclMarks };

if (require.main === module) {
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

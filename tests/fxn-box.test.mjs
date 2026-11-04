// js/admin/fxn-box.js (round 14 "signin-native") is byte for byte tweetnacl's NaCl box. Owner law 2026-10-15: tweetnacl
// is replaced by native crypto, and every swap is proven bit-identical against tweetnacl before it ships. X25519 is
// WebCrypto's; XSalsa20-Poly1305 is the one pure-JS part, since WebCrypto has none. The reference is the exact tweetnacl
// file admin-app.html loaded until round 14 (tests/reference/, npm tweetnacl@1.0.3 nacl-fast.min.js), checked by hash.
// If any case here fails, keys or envelopes already stored in a browser would stop opening: do not loosen it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const site = new URL('..', import.meta.url).pathname;
const REFERENCE = site + 'tests/reference/tweetnacl-1.0.3-nacl-fast.min.js';
const nacl = createRequire(import.meta.url)(REFERENCE);
const boxSource = readFileSync(site + 'js/admin/fxn-box.js', 'utf8');
const FxnBox = vm.runInThisContext(boxSource + '\n;FxnBox', { filename: 'js/admin/fxn-box.js' });
const hex = (b) => Buffer.from(b).toString('hex');
const unhex = (h) => new Uint8Array(Buffer.from(h, 'hex'));
const rand = (n) => new Uint8Array(randomBytes(n));
// Lengths around every Salsa20 block (64) and Poly1305 block (16) edge, and the 32-byte file key the editor wraps.
const LENGTHS = [0, 1, 15, 16, 17, 31, 32, 33, 63, 64, 65, 127, 128, 129, 255, 256, 1000, 4096];

test('the reference is npm tweetnacl@1.0.3 nacl-fast.min.js, unchanged', () => {
  const body = readFileSync(REFERENCE, 'utf8').split('*/\n').slice(1).join('*/\n');
  assert.equal(createHash('sha256').update(body).digest('hex'), '3ec535c004aeeb225785d8e93fb33bf99f52e399bd7dfc01969b5629baea5131');
});

test('fxn-box.js carries no tweetnacl code and no pure-JS curve', () => {
  const { tweetnaclMarks } = createRequire(import.meta.url)('../scripts/tweetnacl-free.cjs');
  assert.deepEqual(tweetnaclMarks(boxSource), []);
  // X25519 goes through WebCrypto only: no field arithmetic (tweetnacl's gf/scalarmult/inv25519) in the file.
  assert.doesNotMatch(boxSource.replace(/\/\*[\s\S]*?\*\//g, ''), /scalarmult|inv25519|car25519|Float64Array/);
  assert.match(boxSource, /name: 'X25519'/);
});

test('RFC 7748 section 6.1: public keys and the shared secret', async () => {
  const a = unhex('77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a');
  const b = unhex('5dab087e624a8a4b79e17f8b83800ee66f3bb1292618b6fd1c2f8b27ff88e0eb');
  assert.equal(hex(await FxnBox.publicKeyOf(a)), '8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a');
  assert.equal(hex(await FxnBox.publicKeyOf(b)), 'de9edb7d7b7dc1b4d35b61c2ece435373f8343c85b78674dadfc7e146f882b4f');
  assert.equal(hex(nacl.scalarMult(a, await FxnBox.publicKeyOf(b))), '4a5d9d5ba4ce2de1728e3bf480350f25e07e21c947d19e3376f09b3c1e161742');
});

test('the same secret key gives tweetnacl\'s public key (200 random keys, all-zero, all-0xff)', async () => {
  const keys = [new Uint8Array(32), new Uint8Array(32).fill(255), ...Array.from({ length: 200 }, () => rand(32))];
  for (const sk of keys) assert.equal(hex(await FxnBox.publicKeyOf(sk)), hex(nacl.box.keyPair.fromSecretKey(sk).publicKey), hex(sk));
  const made = await FxnBox.keyPair();
  assert.equal(made.secretKey.length, 32);
  assert.equal(hex(made.publicKey), hex(nacl.box.keyPair.fromSecretKey(made.secretKey).publicKey), 'a new keypair has tweetnacl\'s shape');
});

test('the box key (before) is tweetnacl\'s, both ways round (100 random pairs)', async () => {
  for (let i = 0; i < 100; i++) {
    const a = nacl.box.keyPair(), b = nacl.box.keyPair();
    const k = hex(nacl.box.before(b.publicKey, a.secretKey));
    assert.equal(hex(await FxnBox.before(b.publicKey, a.secretKey)), k);
    assert.equal(hex(await FxnBox.before(a.publicKey, b.secretKey)), k);
  }
});

test('box: the same keys, nonce and message give tweetnacl\'s bytes, and each opens the other\'s', async () => {
  for (const n of LENGTHS) for (let round = 0; round < 4; round++) {
    const a = nacl.box.keyPair(), b = nacl.box.keyPair(), nonce = rand(24), msg = rand(n);
    const ours = await FxnBox.box(msg, nonce, b.publicKey, a.secretKey);
    const theirs = nacl.box(msg, nonce, b.publicKey, a.secretKey);
    assert.equal(hex(ours), hex(theirs), `length ${n}`);
    assert.equal(ours.length, n + FxnBox.overheadLength);
    assert.equal(hex(await FxnBox.open(theirs, nonce, a.publicKey, b.secretKey)), hex(msg), `fxn-box opens tweetnacl's box, length ${n}`);
    assert.equal(hex(nacl.box.open(ours, nonce, a.publicKey, b.secretKey)), hex(msg), `tweetnacl opens fxn-box's box, length ${n}`);
  }
});

test('secretbox: tweetnacl\'s bytes; every changed byte, a wrong nonce, a wrong key and a short box fail to open in both', async () => {
  for (const n of LENGTHS) {
    const key = rand(32), nonce = rand(24), msg = rand(n);
    const sealed = FxnBox.secretbox(msg, nonce, key);
    assert.equal(hex(sealed), hex(nacl.secretbox(msg, nonce, key)), `length ${n}`);
    assert.equal(hex(FxnBox.secretboxOpen(sealed, nonce, key)), hex(msg));
    for (let i = 0; i < sealed.length; i++) {
      const bad = sealed.slice(); bad[i] ^= 1 << (i % 8);
      assert.equal(FxnBox.secretboxOpen(bad, nonce, key), null, `byte ${i} of ${sealed.length} changed`);
      assert.equal(nacl.secretbox.open(bad, nonce, key), null);
    }
    const wrongNonce = nonce.slice(); wrongNonce[23] ^= 1;
    assert.equal(FxnBox.secretboxOpen(sealed, wrongNonce, key), null);
    assert.equal(FxnBox.secretboxOpen(sealed, nonce, rand(32)), null);
  }
  assert.equal(FxnBox.secretboxOpen(new Uint8Array(15), rand(24), rand(32)), null, 'shorter than a tag');
  assert.equal(nacl.secretbox.open(new Uint8Array(15), rand(24), rand(32)), null);
});

test('open returns null for a wrong key, as nacl.box.open does', async () => {
  const a = nacl.box.keyPair(), b = nacl.box.keyPair(), c = nacl.box.keyPair(), nonce = rand(24);
  const sealed = nacl.box(rand(32), nonce, b.publicKey, a.secretKey);
  assert.equal(await FxnBox.open(sealed, nonce, a.publicKey, c.secretKey), null);
  assert.equal(nacl.box.open(sealed, nonce, a.publicKey, c.secretKey), null);
});

test('a small-order public key is refused (tweetnacl would seal to a known key); wrong lengths reject', async () => {
  const a = nacl.box.keyPair(), zero = new Uint8Array(32), nonce = rand(24);
  await assert.rejects(FxnBox.box(rand(32), nonce, zero, a.secretKey), /not a usable X25519 key/);
  assert.equal(await FxnBox.open(rand(48), nonce, zero, a.secretKey), null);
  assert.equal(hex(nacl.box.before(zero, a.secretKey)), hex(nacl.box.before(zero, nacl.box.keyPair().secretKey)), 'why: tweetnacl gives every sender the same key for it');
  await assert.rejects(FxnBox.box(rand(32), nonce, rand(31), a.secretKey), RangeError);
  await assert.rejects(FxnBox.open(rand(48), nonce, a.publicKey, rand(33)), RangeError);
  assert.throws(() => FxnBox.secretbox(rand(4), rand(23), rand(32)), RangeError);
});

test('a runtime with no built-in X25519 is refused, naming what to do', async () => {
  const notSupported = () => Promise.reject(Object.assign(new Error('Unrecognized algorithm name'), { name: 'NotSupportedError' }));
  const fake = { getRandomValues: (b) => b, subtle: { importKey: notSupported, deriveBits: notSupported } };
  const ctx = vm.createContext({ crypto: fake, Uint8Array, Uint32Array, Promise, Object, Error, TypeError, RangeError });
  ctx.globalThis = ctx;
  const Box = vm.runInContext(boxSource + '\n;FxnBox', ctx);
  const refusal = 'This browser cannot seal or open content safely: it has no built-in X25519. Please update it.';
  assert.equal(Box.REFUSAL, refusal);
  await assert.rejects(Box.keyPair(), { message: refusal });
  await assert.rejects(Box.open(new Uint8Array(48), new Uint8Array(24), new Uint8Array(32).fill(9), new Uint8Array(32)), { message: refusal });
  const bare = vm.createContext({ Uint8Array, Uint32Array, Promise, Object, Error, TypeError, RangeError }); bare.globalThis = bare;
  await assert.rejects(vm.runInContext(boxSource + '\n;FxnBox', bare).keyPair(), { message: refusal }, 'no crypto object at all');
});

// The editor's envelopes (js/admin/crypto.js): a file key wrapped the round-13 way (nacl.box with an ephemeral key) still
// unwraps, and one wrapped now unwraps with tweetnacl. This is the claim that stored secrets keep opening.
test('ArkContentCrypto: envelopes made with tweetnacl open, and its new envelopes open with tweetnacl', async () => {
  const store = {};
  const ctx = vm.createContext({
    window: { localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } } },
    crypto: globalThis.crypto, btoa, atob, TextEncoder, TextDecoder, Uint8Array, Uint32Array, Promise, Object, Error, TypeError, RangeError, JSON, Array, String,
  });
  ctx.globalThis = ctx;
  vm.runInContext(boxSource, ctx);
  vm.runInContext(readFileSync(site + 'js/admin/crypto.js', 'utf8'), ctx);
  const C = vm.runInContext('ArkContentCrypto', ctx);
  // A key stored by the round-13 editor (tweetnacl's nacl.box.keyPair, base64 in localStorage) loads unchanged.
  const old = nacl.box.keyPair();
  store['flux-admin-media-key:alice'] = JSON.stringify({ keyVersion: 1, publicKey: Buffer.from(old.publicKey).toString('base64'), secretKey: Buffer.from(old.secretKey).toString('base64') });
  const alice = await C.createOrLoadKeyPair('alice');
  assert.equal(alice.publicKey, Buffer.from(old.publicKey).toString('base64'));
  const fileKey = rand(32);
  const eph = nacl.box.keyPair(), nonce = rand(24);
  const oldEnvelope = { recipientPublicKey: alice.publicKey, version: 1, algorithm: 'x25519-xsalsa20poly1305', nonce: Buffer.from(nonce).toString('base64'), ephemeralPublicKey: Buffer.from(eph.publicKey).toString('base64'), ciphertext: Buffer.from(nacl.box(fileKey, nonce, old.publicKey, eph.secretKey)).toString('base64') };
  assert.equal(hex(await C.unwrapKeyFromEnvelope(oldEnvelope, alice.secretKey)), hex(fileKey), 'a round-13 envelope unwraps');
  const fresh = await C.wrapKeyForRecipient(fileKey, alice.publicKey);
  assert.equal(fresh.algorithm, 'x25519-xsalsa20poly1305');
  const opened = nacl.box.open(Buffer.from(fresh.ciphertext, 'base64'), Buffer.from(fresh.nonce, 'base64'), Buffer.from(fresh.ephemeralPublicKey, 'base64'), old.secretKey);
  assert.equal(hex(opened), hex(fileKey), 'tweetnacl unwraps a new envelope');
  // A new browser key is made by fxn-box and stored in the round-13 shape, so a round-13 editor could still read it.
  const bob = await C.createOrLoadKeyPair('bob');
  const kept = JSON.parse(store['flux-admin-media-key:bob']);
  assert.equal(kept.publicKey, Buffer.from(nacl.box.keyPair.fromSecretKey(Buffer.from(kept.secretKey, 'base64')).publicKey).toString('base64'));
  assert.equal(bob.publicKey, kept.publicKey);
});

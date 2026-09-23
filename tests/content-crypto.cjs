const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
// ArkContentCrypto (js/admin/crypto.js) is the multi-recipient encryption scheme for ArkSecret
// content: AES-GCM body + one nacl-box-wrapped file key per recipient. This proves the round
// trip on the real vendored code, not a reimplementation, so a change to either file is caught here.
const context = vm.createContext({
  console,
  window: { localStorage: (function () { var store = {}; return { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } }; })() },
  globalThis: undefined,
  crypto: require('node:crypto').webcrypto,
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  TextEncoder, TextDecoder,
});
context.globalThis = context; context.self = context;
vm.runInContext(fs.readFileSync('js/admin/vendor/tweetnacl.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/admin/crypto.js', 'utf8'), context);
const ArkContentCrypto = vm.runInContext('ArkContentCrypto', context);

(async () => {
  // Two identities, each with their own keypair (persisted under their own owner id, like two admins).
  const alice = ArkContentCrypto.createOrLoadKeyPair('alice');
  const bob = ArkContentCrypto.createOrLoadKeyPair('bob');
  const mallory = ArkContentCrypto.createOrLoadKeyPair('mallory');
  assert.notEqual(alice.publicKey, bob.publicKey, 'each owner gets a distinct keypair');

  // Loading the same owner id again returns the identical keypair (persisted, not regenerated).
  const aliceAgain = ArkContentCrypto.createOrLoadKeyPair('alice');
  assert.equal(aliceAgain.publicKey, alice.publicKey, 'the same owner id loads the same keypair');

  const payload = { kind: 'flux_secret_payload', version: 1, title: 'Draft', content: 'not yet public' };
  const secretFields = await ArkContentCrypto.encryptForRecipients(payload, [alice.publicKey, bob.publicKey]);
  assert.equal(secretFields.envelopes.length, 2, 'one wrapped-key envelope per recipient');
  assert(!secretFields.ciphertextBase64.includes('not yet public'), 'the plaintext never appears in the stored ciphertext');
  assert(!JSON.stringify(secretFields.envelopes).includes('not yet public'), 'the plaintext never appears in an envelope');

  const secret = { ciphertextBase64: secretFields.ciphertextBase64, metadata: secretFields.metadata, recipients: secretFields.envelopes };

  // Objects round-tripped through the vm sandbox are a different realm's Object, so compare by
  // JSON text (the same fix scripts/lib/site-bundle.mjs and tests/asset-content.cjs use) rather
  // than assert.deepEqual, which can see different Object constructors and fail on equal content.
  const aliceRead = await ArkContentCrypto.decryptForSelf(secret, alice);
  assert.equal(JSON.stringify(aliceRead), JSON.stringify(payload), 'a recipient decrypts the exact original payload');
  const bobRead = await ArkContentCrypto.decryptForSelf(secret, bob);
  assert.equal(JSON.stringify(bobRead), JSON.stringify(payload), 'a second recipient decrypts the same payload independently');

  const malloryRead = await ArkContentCrypto.decryptForSelf(secret, mallory);
  assert.equal(malloryRead, null, 'a non-recipient gets null, not a throw and not the content');

  // A tampered ciphertext must fail AES-GCM's tag check, not silently decrypt to garbage.
  const tampered = Object.assign({}, secret, { ciphertextBase64: secret.ciphertextBase64.slice(0, -4) + (secret.ciphertextBase64.slice(-4) === 'AAAA' ? 'BBBB' : 'AAAA') });
  await assert.rejects(() => ArkContentCrypto.decryptForSelf(tampered, alice), 'a tampered body is refused, not decrypted');

  // Wrapping the same file key for a wrong recipient key and trying to unwrap it with a different secret key must fail loudly.
  assert.throws(() => ArkContentCrypto.unwrapKeyFromEnvelope(secretFields.envelopes[0], bob.secretKey), /Failed to unwrap/, 'unwrapping with the wrong secret key is refused, not silently wrong');

  console.log('PASS: ArkContentCrypto multi-recipient round trip, persisted keypairs, non-recipient returns null, tamper and wrong-key are refused.');
})().catch((e) => { console.error(e); process.exit(1); });

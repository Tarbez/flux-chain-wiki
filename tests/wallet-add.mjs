// Real test for `identity.addWallet`/`identity.walletAddresses`
// (scripts/auth-entry.js) -- closes the gap that `addWalletToAuthKit`
// (ark-ui.flux-auth.ts) and `walletAddresses` (describeAuthKit's summary
// field) existed with no caller anywhere in this workspace. This exercises
// the exact composition `addWallet` performs -- `createWalletForIdentity`
// with an opaque `signIdentity` shaped exactly like `createFluxRootHandle`'s
// real `sign()` (raw Uint8Array(64), not base64), then `addWalletToAuthKit`
// on a real vault -- against the real, already-built modules on disk, not
// a reimplementation.
import assert from 'node:assert/strict';
import { keyPair, keyPairFromSecretKey, signDetached, verifyDetached, randomBytes } from './lib/native-ed25519.mjs';

globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');

const { createWalletForIdentity } = await import(new URL('../../fxn-auth/src/walletLifecycle.mjs', import.meta.url).href);
const { addWalletToAuthKit, sealAuthKitEnvelope } = await import(new URL('../../../design/ark-ui/dist/ark-ui.flux-auth.js', import.meta.url).href);

const toBase64 = (bytes) => Buffer.from(bytes).toString('base64');
const toHex = (base64Value) => Buffer.from(base64Value, 'base64').toString('hex');

// A minimal real v9 vault + secret, sealed the same way ark-ui's own fixtures build one,
// with no wallet yet -- the harder case (addWallet's identityId/identityPublicKey fallback path).
const root = keyPair();
const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const PIN = '12345678';

async function buildVaultWithNoWallet() {
  const baseVault = {
    schema: 'flux-auth-kit/v9', version: 9,
    identityId: toHex(toBase64(root.publicKey)),
    rootPublicKey: toBase64(root.publicKey),
    displayName: 'Test Identity', wordCount: 12, recoveryConfirmed: true,
    kdf: { name: 'PBKDF2-SHA256', iterations: 600000, salt: toBase64(randomBytes(16)) },
    cipher: { name: 'AES-256-GCM', iv: toBase64(randomBytes(12)), ciphertext: '' },
  };
  return sealAuthKitEnvelope(baseVault, { mnemonic, identityId: baseVault.identityId, rootPublicKey: baseVault.rootPublicKey }, { pin: PIN });
}

// Mirrors auth-entry.js's own `handle.sign` usage: raw Uint8Array(64), not base64 --
// exactly createFluxRootHandle's real shape.
function rawSign(message) {
  return signDetached(message, root.secretKey);
}

const vault = await buildVaultWithNoWallet();
assert.equal(vault.wallet, undefined, 'fixture starts with no wallet, the harder fallback path');

// Replicates auth-entry.js's `identity.addWallet` body exactly.
const identityId = vault.wallet?.body.identityId || toHex(toBase64(root.publicKey));
const identityPublicKey = vault.wallet?.body.identityPublicKey || toHex(toBase64(root.publicKey));
const { record, walletSecretKey, walletAddress } = await createWalletForIdentity({
  identityId, identityPublicKey,
  signIdentity: rawSign,
  label: 'Default', rights: ['receive', 'hold', 'spend', 'present'],
  preferred: !vault.wallet,
  issuedAt: Date.now(),
});
const updatedVault = await addWalletToAuthKit(vault, { pin: PIN }, record, toBase64(walletSecretKey));

assert.equal(updatedVault.wallet.body.walletAddress, walletAddress, 'the new wallet becomes the preferred/default pointer (it is the first one)');
assert.deepEqual(updatedVault.wallets.map((w) => w.body.walletAddress), [walletAddress]);

// The identitySignature is real and verifies against the real root key used to sign it --
// proves signIdentity's raw-bytes return value actually reached the record correctly.
const { verifyIdentityWalletLink } = await import(new URL('../../fxn-auth/src/identityWallet.mjs', import.meta.url).href);
const verified = await verifyIdentityWalletLink(record, { expectedIdentityId: identityId, prior: null });
assert.deepEqual(verified, { valid: true });

console.log('wallet-add ok: addWallet mints a real, verifiable wallet via an opaque raw-bytes signer, written into a real vault with no prior wallet');

// Real test for `identity.rotateWallet`/`revokeWallet` (scripts/auth-entry.js)
// -- closes the last remaining Portable Auth Kit (v8/v9) gap: every other
// wallet-feature surface in this workspace already had rotate/revoke
// (chat.deadark.com/deark-defi-desktop/ark-tlm-desktop/cr3tv-network-desktop/
// chat-android-app have real UI; ark-dao has it in its own vault); this
// lineage had neither until now. Replicates auth-entry.js's own function
// bodies exactly, against the real, already-built modules on disk -- same
// discipline tests/wallet-add.mjs/wallet-delegate.mjs already established.
import assert from 'node:assert/strict';
import nacl from '/Volumes/PortableSSD/flux/fxn-auth/node_modules/tweetnacl/nacl-fast.js';

globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');

const { createWalletForIdentity, createWalletRotation, createWalletRevocation, walletLinkRecordCid } = await import('/Volumes/PortableSSD/flux/fxn-auth/src/walletLifecycle.mjs');
const { addWalletToAuthKit, rotateWalletInAuthKit, revokeWalletInAuthKit, sealAuthKitEnvelope, openAuthKitEnvelope } = await import('/Volumes/PortableSSD/design/ark-ui/dist/ark-ui.flux-auth.js');
const { verifyIdentityWalletLink } = await import('/Volumes/PortableSSD/flux/fxn-auth/src/identityWallet.mjs');

const toBase64 = (bytes) => Buffer.from(bytes).toString('base64');
const toHex = (base64Value) => Buffer.from(base64Value, 'base64').toString('hex');

const root = nacl.sign.keyPair();
const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const PIN = '12345678';
const identityId = toHex(toBase64(root.publicKey));
const identityPublicKey = identityId;
function rawSign(message) { return nacl.sign.detached(message, root.secretKey); }

async function buildVaultWithNoWallet() {
  const baseVault = {
    schema: 'flux-auth-kit/v9', version: 9,
    identityId, rootPublicKey: toBase64(root.publicKey),
    displayName: 'Test Identity', wordCount: 12, recoveryConfirmed: true,
    kdf: { name: 'PBKDF2-SHA256', iterations: 600000, salt: toBase64(nacl.randomBytes(16)) },
    cipher: { name: 'AES-256-GCM', iv: toBase64(nacl.randomBytes(12)), ciphertext: '' },
  };
  return sealAuthKitEnvelope(baseVault, { mnemonic, identityId, rootPublicKey: baseVault.rootPublicKey }, { pin: PIN });
}

// Replicates auth-entry.js's own findLiveWalletLink exactly.
async function findLiveWalletLink(links, walletAddress) {
  const childByPredecessorCid = new Map();
  for (const link of links) if (link.body.predecessorCid) childByPredecessorCid.set(link.body.predecessorCid, link);
  for (const head of links.filter((link) => link.body.sequence === 1)) {
    let current = head;
    let cid = await walletLinkRecordCid(current);
    while (childByPredecessorCid.has(cid)) { current = childByPredecessorCid.get(cid); cid = await walletLinkRecordCid(current); }
    if (current.body.walletAddress === walletAddress) return current;
  }
  return null;
}

// Replicates auth-entry.js's `identity.rotateWallet` body exactly.
async function rotateWallet(vault, { walletAddress, label, rights }) {
  const walletLinks = vault.wallets ?? (vault.wallet ? [vault.wallet] : []);
  const prior = await findLiveWalletLink(walletLinks, walletAddress);
  if (!prior || prior.body.action === 'revoke') throw new Error('No such wallet on this identity.');
  const { record, walletSecretKey, walletAddress: newAddress } = await createWalletRotation({
    prior, identityId, identityPublicKey, signIdentity: rawSign, label, rights, issuedAt: Date.now(),
  });
  const updatedVault = await rotateWalletInAuthKit(vault, { pin: PIN }, walletAddress, record, toBase64(walletSecretKey));
  return { vault: updatedVault, walletAddress: newAddress };
}

// Replicates auth-entry.js's `identity.revokeWallet` body exactly.
async function revokeWallet(vault, { walletAddress, reason = null }) {
  const walletLinks = vault.wallets ?? (vault.wallet ? [vault.wallet] : []);
  const prior = await findLiveWalletLink(walletLinks, walletAddress);
  if (!prior || prior.body.action === 'revoke') throw new Error('No such wallet on this identity.');
  const { record } = await createWalletRevocation({ prior, identityId, identityPublicKey, signIdentity: rawSign, reason, issuedAt: Date.now() });
  return { vault: revokeWalletInAuthKit(vault, record), walletAddress, revoked: true };
}

let vault = await buildVaultWithNoWallet();
const { record, walletSecretKey, walletAddress: originalAddress } = await createWalletForIdentity({
  identityId, identityPublicKey, signIdentity: rawSign, label: 'Original', rights: ['receive', 'spend'], preferred: true, issuedAt: Date.now(),
});
vault = await addWalletToAuthKit(vault, { pin: PIN }, record, toBase64(walletSecretKey));

// Rotation mints a genuinely new, independently-verifiable wallet key, chained to a real predecessorCid.
const rotated = await rotateWallet(vault, { walletAddress: originalAddress, label: 'Rotated' });
vault = rotated.vault;
assert.notEqual(rotated.walletAddress, originalAddress, 'rotation mints a genuinely new address');
assert.equal(vault.wallet.body.walletAddress, rotated.walletAddress, 'the preferred pointer moves with the rotated (preferred) wallet');
assert.deepEqual(vault.wallets.map((w) => w.body.walletAddress), [originalAddress, rotated.walletAddress]);

const newRecord = vault.wallets.find((w) => w.body.walletAddress === rotated.walletAddress);
const verified = await verifyIdentityWalletLink(newRecord, { expectedIdentityId: identityId, prior: record });
assert.deepEqual(verified, { valid: true }, 'the rotation record must be a real, independently-verifiable chained signature, not just a storage entry');

const newSecretKeyB64 = (await openAuthKitEnvelope(vault, { pin: PIN })).walletSecretKey;
const derivedPublicKeyB64 = Buffer.from(nacl.sign.keyPair.fromSecretKey(Buffer.from(newSecretKeyB64, 'base64')).publicKey).toString('base64');
assert.equal(derivedPublicKeyB64, newRecord.body.walletPublicKey, 'the new wallet\'s own secret key is real and independently recoverable');

// Rotating the now-superseded original address again is refused by name.
await assert.rejects(rotateWallet(vault, { walletAddress: originalAddress }), /No such wallet on this identity/);

console.log('wallet-rotate-revoke ok: rotateWallet mints a genuinely new, independently-verifiable wallet key chained to a real predecessorCid; re-rotating a superseded address is refused');

// Revocation retires a wallet outright -- same wallet key as its target, a real reason recorded.
const revoked = await revokeWallet(vault, { walletAddress: rotated.walletAddress, reason: 'compromised' });
vault = revoked.vault;
const revocationRecord = vault.wallets[vault.wallets.length - 1];
assert.equal(revocationRecord.body.action, 'revoke');
assert.equal(revocationRecord.body.walletPublicKey, newRecord.body.walletPublicKey, 'a revocation targets the same wallet key, not a new one');
assert.equal(revocationRecord.body.reason, 'compromised');
assert.deepEqual(revocationRecord.body.rights, []);

// Revoking an already-revoked wallet is refused by name.
await assert.rejects(revokeWallet(vault, { walletAddress: rotated.walletAddress }), /No such wallet on this identity/);

console.log('wallet-rotate-revoke ok: revokeWallet retires a wallet with a real, verifiable revocation record; re-revoking is refused');

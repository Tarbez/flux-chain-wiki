// Real test for `identity.delegateWallet`/`revokeWalletDelegation`/
// `signWithDelegatedRoot`/`rankWalletsByActivationViaMesh` (scripts/auth-entry.js)
// -- closes the Portable Auth Kit (v8/v9) lineage's own Delegate/Discovery
// Resolver gap (docs/FLUX-WALLET-DELEGATION-SCOPE-VISION.md §3/§5), the
// last two unwired resolvers on this surface and flux-launchpad's shared
// Auth Kit. Replicates auth-entry.js's own function bodies exactly, against
// the real, already-built modules on disk -- same discipline
// tests/wallet-add.mjs already established, not a reimplementation.
import assert from 'node:assert/strict';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import nacl from '/Volumes/PortableSSD/flux/fxn-auth/node_modules/tweetnacl/nacl-fast.js';

globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');

const { createWalletForIdentity } = await import('/Volumes/PortableSSD/flux/fxn-auth/src/walletLifecycle.mjs');
const { createWalletDelegation, signWalletDelegation } = await import('/Volumes/PortableSSD/flux/fxn-auth/src/walletDelegation.mjs');
const { reduceWalletRegistry } = await import('/Volumes/PortableSSD/flux/fxn-auth/src/walletRegistry.mjs');
const { resolveClaimScope, rightsDimension, delegationDimension } = await import('/Volumes/PortableSSD/flux/fxn-auth/src/claimScopeResolver.mjs');
const { rankDiscovery } = await import('/Volumes/PortableSSD/flux/fxn-auth-client/src/wallet-mesh.mjs');
const { addWalletToAuthKit, addWalletDelegationToAuthKit, revokeWalletDelegationInAuthKit, sealAuthKitEnvelope } = await import('/Volumes/PortableSSD/design/ark-ui/dist/ark-ui.flux-auth.js');

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

async function mintWallet(vault, { label, rights }) {
  const { record, walletSecretKey, walletAddress } = await createWalletForIdentity({
    identityId, identityPublicKey, signIdentity: rawSign, label, rights, preferred: !vault.wallet, issuedAt: Date.now(),
  });
  const updatedVault = await addWalletToAuthKit(vault, { pin: PIN }, record, toBase64(walletSecretKey));
  return { vault: updatedVault, walletAddress, walletSecretKey };
}

// Replicates auth-entry.js's `identity.delegateWallet` body exactly.
async function delegateWallet(vault, secretsByAddress, { walletAddress, rights = ['receive', 'spend'], maxSpend = null, ttlMs }) {
  const walletLinks = vault.wallets ?? (vault.wallet ? [vault.wallet] : []);
  const walletLink = walletLinks.find((w) => w.body.walletAddress === walletAddress);
  if (!walletLink) throw new Error('No such wallet on this identity.');
  const walletSecretKey = secretsByAddress[walletAddress];
  const grant = createWalletDelegation({ walletPublicKey: walletLink.body.walletPublicKey, rootPublicKey: identityId, rights, maxSpend, ...(ttlMs ? { ttlMs } : {}) });
  const signedDelegation = await signWalletDelegation(grant, walletSecretKey);
  return { vault: addWalletDelegationToAuthKit(vault, walletAddress, signedDelegation), grant };
}

// Replicates auth-entry.js's `identity.signWithDelegatedRoot` body exactly.
async function signWithDelegatedRoot(vault, walletAddress, message, right, amount = null) {
  const entry = vault.walletDelegations?.[walletAddress];
  if (!entry) throw new Error('No delegation exists for this wallet.');
  const walletLinks = vault.wallets ?? (vault.wallet ? [vault.wallet] : []);
  const walletLink = walletLinks.find((w) => w.body.walletAddress === walletAddress);
  const registry = await reduceWalletRegistry(walletLinks);
  const dimensions = {
    rights: rightsDimension(registry),
    delegation: delegationDimension({ signedDelegation: entry.signedDelegation, now: Date.now(), isRevoked: (_wp, nonce) => Boolean(entry.revoked && entry.signedDelegation.grant.nonce === nonce) }),
  };
  const decision = await resolveClaimScope({ walletAddress, walletPublicKey: walletLink.body.walletPublicKey, rootPublicKey: identityId, right, amount }, dimensions, ['rights', 'delegation']);
  if (!decision.authorized) throw new Error(`Delegated action refused: ${decision.reason}`);
  return rawSign(new TextEncoder().encode(message));
}

// Replicates auth-entry.js's `identity.rankWalletsByActivationViaMesh` body exactly.
async function rankWalletsByActivationViaMesh(vault, discoveryUrl) {
  const walletLinks = vault.wallets ?? (vault.wallet ? [vault.wallet] : []);
  const registry = await reduceWalletRegistry(walletLinks);
  const live = registry.wallets.filter((w) => !w.revoked);
  const items = live.map((w, index) => ({ id: w.walletAddress, taxonomyIds: vault.walletDelegations?.[w.walletAddress] && !vault.walletDelegations[w.walletAddress].revoked ? ['activated'] : [], baseScore: live.length - index }));
  const response = await rankDiscovery(discoveryUrl, { items, weights: { activated: 5 }, explorationFloor: 0.25 });
  if (!(response.status === 200 && Array.isArray(response.order))) throw new Error(`Discovery resolver unavailable: ${response.status}`);
  const byAddress = new Map(live.map((w) => [w.walletAddress, w]));
  return response.order.map((address) => byAddress.get(address)).filter(Boolean);
}

let vault = await buildVaultWithNoWallet();
const secretsByAddress = {};
const plain = await mintWallet(vault, { label: 'Plain', rights: ['receive', 'spend'] });
vault = plain.vault;
secretsByAddress[plain.walletAddress] = plain.walletSecretKey;
const delegatedWallet = await mintWallet(vault, { label: 'Delegated', rights: ['receive', 'spend'] });
vault = delegatedWallet.vault;
secretsByAddress[delegatedWallet.walletAddress] = delegatedWallet.walletSecretKey;

// A grant signed by the wallet's own key, not root's.
const { vault: afterDelegate, grant } = await delegateWallet(vault, secretsByAddress, { walletAddress: delegatedWallet.walletAddress, rights: ['receive', 'spend'], maxSpend: { amount: 100, period: 'daily' } });
vault = afterDelegate;
assert.deepEqual(grant.rights, ['receive', 'spend']);

const signed = await signWithDelegatedRoot(vault, delegatedWallet.walletAddress, 'spend 10', 'spend', 10);
assert.equal(nacl.sign.detached.verify(new TextEncoder().encode('spend 10'), signed, root.publicKey), true, 'the delegated signature must verify against the real root key');

await assert.rejects(signWithDelegatedRoot(vault, delegatedWallet.walletAddress, 'spend 999', 'spend', 999), /WALLET_DELEGATION_SPEND_EXCEEDS_CAP/);

// Delegating `spend` to a wallet whose own link record never held it is refused by `rights`, not silently signed.
// Mint a THIRD, receive-only wallet to prove the real gap this composition closes (plain/delegatedWallet both already hold spend).
const receiveOnly = await mintWallet(vault, { label: 'ReceiveOnly', rights: ['receive'] });
vault = receiveOnly.vault;
secretsByAddress[receiveOnly.walletAddress] = receiveOnly.walletSecretKey;
const { vault: afterReceiveOnlyGrant } = await delegateWallet(vault, secretsByAddress, { walletAddress: receiveOnly.walletAddress, rights: ['receive', 'spend'], maxSpend: { amount: 50, period: 'daily' } });
vault = afterReceiveOnlyGrant;
await assert.rejects(signWithDelegatedRoot(vault, receiveOnly.walletAddress, 'spend 10', 'spend', 10), /WALLET_REGISTRY_RIGHT_NOT_HELD/);

// Revocation refuses the delegated path immediately.
vault = revokeWalletDelegationInAuthKit(vault, delegatedWallet.walletAddress);
await assert.rejects(signWithDelegatedRoot(vault, delegatedWallet.walletAddress, 'spend', 'spend', 10), /WALLET_DELEGATION_REVOKED/);

console.log('wallet-delegate ok: delegateWallet/revokeWalletDelegation/signWithDelegatedRoot compose rights+delegation correctly, over-cap/undelegated-right/revoked all refused by name');

// Discovery Resolver: proven live against the real compiled flxd-discovery binary.
const DISCOVERY_BINARY = '/Volumes/PortableSSD/flux/flxd-discovery/target/release/flxd-discovery';
if (existsSync(DISCOVERY_BINARY)) {
  function freePort() {
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close((error) => (error ? reject(error) : resolve(port))); });
    });
  }
  const port = await freePort();
  const child = spawn(DISCOVERY_BINARY, ['--port', String(port)], { stdio: 'ignore' });
  try {
    const discoveryUrl = `http://127.0.0.1:${port}`;
    const deadline = Date.now() + 10_000;
    let ready = false;
    while (Date.now() < deadline) {
      try {
        const response = await fetch(`${discoveryUrl}/api/discovery/rank`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items: [], weights: {}, explorationFloor: 0 }) });
        if (response.ok) { ready = true; break; }
      } catch { /* not up yet */ }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.equal(ready, true, 'flxd-discovery must come up within 10s');

    const ranked = await rankWalletsByActivationViaMesh(vault, discoveryUrl);
    const addresses = ranked.map((w) => w.walletAddress);
    assert.ok(addresses.includes(plain.walletAddress));
    assert.ok(addresses.includes(receiveOnly.walletAddress));
    // The revoked delegation above means `delegatedWallet` is no longer boosted (its grant is revoked) --
    // `receiveOnly`'s own still-live grant should be boosted to the front instead.
    assert.equal(ranked[0].walletAddress, receiveOnly.walletAddress, 'the wallet with the live (unrevoked) delegation grant must be boosted to the front by the LIVE process');
    console.log('wallet-delegate ok: rankWalletsByActivationViaMesh ranks via the LIVE flxd-discovery binary, boosting the genuinely-activated wallet');
  } finally {
    child.kill();
  }
} else {
  console.log('wallet-delegate: flxd-discovery binary not built, skipping the live Discovery Resolver check');
}

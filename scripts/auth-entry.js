/* =====================================================================
   ADMIN SIGN-IN (bundle entry)
   ---------------------------------------------------------------------
   Publishing to flux-chain.ark is authorised by a DeadArk identity, the same
   Auth Kit (.auth.flx) chat.deadark.com signs in with. This file composes
   shared parts and adds no cryptography of its own:

     the panel and the kit envelope   @deadark/ark-ui/flux-auth(-ui)
     root derivation `flux-bip39-v1`  flux-auth/root-from-mnemonic
     root derivation `deadark-profile-v1`
                                      deadark-identity-core/root-signing-handle

   A kit records which derivation named its root, and the two give different
   keys for one phrase, so the kit chooses. The signer and the verifier are the
   same computation: the key the panel verifies against the kit is the key that
   signs, so verification cannot be skipped. A kit whose root could not be
   proven is refused, never used to sign.

   The signing key is held by a handle that never exposes its bytes, lives only
   in this page's memory, and is disposed on sign-out. Nothing is written to
   storage: reloading the page signs you out.

   `identity.signWithWallet` closes a real gap: `openAuthKit`'s decrypted
   secret already carries the wallet's own key (`AuthKitSecret.walletSecretKey`)
   alongside the mnemonic, but until now nothing ever turned it into a signer --
   only root signing (`identity.sign`) was ever wired into a live session. A kit
   with no wallet link yet (or one that failed first-time wallet setup) simply
   has no `walletSecretKey`, and `signWithWallet` throws naming that, rather
   than silently falling back to the root key.

   `identity.walletAddresses`/`identity.addWallet` close the companion gap on
   the storage side: `addWalletToAuthKit` (ark-ui.flux-auth.ts) and
   `walletAddresses` (describeAuthKit's summary field) existed with no caller
   anywhere in this workspace until now. `addWallet` mints a real second
   wallet via `flux-auth/wallet-lifecycle`'s `createWalletForIdentity`, signed
   by this session's own root handle (never a raw key -- `signIdentity`, the
   same opaque path `createIdentityWalletLinkWithSigner` exists for), and
   writes it into the vault via `addWalletToAuthKit`. It returns the UPDATED
   vault rather than silently reconciling the session's own loaded copy --
   there is no public `AuthKitSession` API to replace a loaded vault in
   place, so the caller decides what to do with it (e.g. prompt a fresh kit
   download). This is a real, named limitation, not an oversight.

   `identity.delegateWallet`/`revokeWalletDelegation`/`signWithDelegatedRoot`
   close this surface's Delegate Resolver gap (docs/FLUX-WALLET-DELEGATION-
   SCOPE-VISION.md §3): the Portable Auth Kit (v8/v9) lineage this app and
   flux-launchpad share had no activation/delegation concept at all before
   this -- unlike the identityWallet.mjs-based apps (ark-dao,
   chat.deadark.com, the desktop apps), which each keep delegation state in
   their own local JSON store. `ark-ui.flux-auth.ts` gained a parallel,
   additive `AuthKitVault.walletDelegations` field for exactly this (a
   kit-portable store, since this vault IS the identity's portable state --
   no separate per-device JSON file makes sense here). This file still
   mints no grant storage logic of its own: `createWalletDelegation`/
   `signWalletDelegation` build+sign it (signed with the WALLET's own key,
   via `createWalletSigningHandle`, never root), `addWalletDelegationToAuthKit`/
   `revokeWalletDelegationInAuthKit` just store the result. `signWithDelegatedRoot`
   is the real Delegate Resolver consumer -- `resolveClaimScope`'s `rights`+
   `delegation` dimensions (same composition every other surface in this
   workspace settled on, after finding a `delegation`-only check lets a
   wallet delegate a right its own link record never granted).

   `identity.rankWalletsByActivationViaMesh` closes the Discovery Resolver
   gap the same way: `flux-auth-client/wallet-mesh`'s `rankDiscovery` is
   dependency-free (no `node:crypto`), so it bundles here directly with no
   workaround needed -- ranks this identity's live wallets by whether each
   has an active, unrevoked delegation grant.

   Build: node scripts/build-auth.cjs  ->  js/admin/auth.js (a classic script).
   ===================================================================== */
import { createAuthKitSession, addWalletToAuthKit, addWalletDelegationToAuthKit, revokeWalletDelegationInAuthKit, rotateWalletInAuthKit, revokeWalletInAuthKit, describeAuthKit } from '@deadark/ark-ui/flux-auth';
import { createArkAuthKitPanel } from '@deadark/ark-ui/flux-auth-ui';
import { createFluxRootHandle, FLUX_ROOT_DERIVATION } from 'flux-auth/root-from-mnemonic';
import { createRootIdentitySigningHandle } from 'deadark-identity-core/root-signing-handle';
import { createWalletSigningHandle } from 'flux-auth/wallet-signing-handle';
import { createWalletForIdentity, createWalletRotation, createWalletRevocation, walletLinkRecordCid } from 'flux-auth/wallet-lifecycle';
import { createWalletDelegation, signWalletDelegation } from 'flux-auth/wallet-delegation';
import { reduceWalletRegistry } from 'flux-auth/wallet-registry';
import { resolveClaimScope, rightsDimension, delegationDimension } from 'flux-auth/claim-scope-resolver';
import { rankDiscovery } from 'flux-auth-client/wallet-mesh';

const toBase64 = (bytes) => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

/** base64 -> lowercase hex -- the V2 wallet-link schema requires identityId/identityPublicKey as hex. */
const toHex = (base64Value) => Uint8Array.from(atob(base64Value), (character) => character.charCodeAt(0))
  .reduce((hex, byte) => hex + byte.toString(16).padStart(2, '0'), '');

/**
 * Walks `links`' own rotation-lineage chains (`predecessorCid`, same
 * algorithm every other `findLiveEntryForWallet`/`findLiveWalletRecord`/
 * `findLiveRecordForWallet` in this workspace already uses) to find the
 * record that is CURRENTLY the live tip for `walletAddress` -- what
 * `createWalletRotation`/`createWalletRevocation` need as their own
 * `prior`, and the liveness check `rotateWalletInAuthKit`/
 * `revokeWalletInAuthKit` deliberately leave to the calling app (they are
 * storage-only, no crypto, see their own doc comments).
 */
async function findLiveWalletLink(links, walletAddress) {
  const childByPredecessorCid = new Map();
  for (const link of links) {
    if (link.body.predecessorCid) childByPredecessorCid.set(link.body.predecessorCid, link);
  }
  for (const head of links.filter((link) => link.body.sequence === 1)) {
    let current = head;
    let cid = await walletLinkRecordCid(current);
    while (childByPredecessorCid.has(cid)) {
      current = childByPredecessorCid.get(cid);
      cid = await walletLinkRecordCid(current);
    }
    if (current.body.walletAddress === walletAddress) return current;
  }
  return null;
}

/* One root handle for a phrase, by the derivation the kit names. */
async function rootHandle({ mnemonic, derivation, callsign }) {
  if (derivation === FLUX_ROOT_DERIVATION) return createFluxRootHandle(mnemonic);
  if (derivation === 'deadark-profile-v1') {
    if (!callsign) throw new Error('This Auth Kit names a DeArk profile root but records no callsign, so its key cannot be rebuilt.');
    return createRootIdentitySigningHandle({ phrase: mnemonic, callsign });
  }
  throw new Error('This Auth Kit uses a root derivation this page does not know: ' + derivation + '.');
}

/* container: where the sign-in panel is drawn.
   onChange(identity | null): called on sign-in and sign-out.
   identity: { publicKeyB64, displayName, sign(text) -> Promise<signatureB64> } */
export function create({ container, onChange = () => {}, product = 'Flux Protocol' }) {
  // No default stylesheet: the panel's own `data-ark-auth` hooks are styled entirely by css/admin.css,
  // so its look is one thing with the rest of the gate, not two stylesheets negotiating a cascade.
  let active = null;   // { handle, walletHandle, identity }
  let pending = null;  // the handle the verifier just derived, not yet admitted

  function drop() {
    if (active) { active.handle.dispose(); if (active.walletHandle) active.walletHandle.dispose(); }
    active = null;
    onChange(null);
  }

  const session = createAuthKitSession({
    verifyRoot: async (input) => {
      if (pending) pending.dispose();
      pending = await rootHandle(input);
      return { rootPublicKey: pending.publicKeyB64 };
    },
  });

  createArkAuthKitPanel({
    container, session, product,
    hint: 'Choose your recovery file (.auth.flx). It stays on this device and is never uploaded.',
    readyHint: 'Signed in. Publishing signs with your identity.',
    onUnlock: async (opened) => {
      // Throwing here is how a panel refuses an identity: the message lands in its notice and no one is signed in.
      if (!opened.rootVerified || !pending) {
        if (pending) pending.dispose();
        pending = null;
        throw new Error('This Auth Kit opened, but its root could not be proven, so it cannot sign.');
      }
      if (active) { active.handle.dispose(); if (active.walletHandle) active.walletHandle.dispose(); }
      const handle = pending;
      pending = null;
      // Present only once a wallet exists and first-time setup produced a usable secret. A kit with no wallet
      // yet, or one still pending standalone/delegate setup, has no walletSecretKey here -- signWithWallet below
      // names that explicitly rather than quietly signing with the root key instead.
      const walletHandle = opened.secret?.walletSecretKey ? createWalletSigningHandle(opened.secret.walletSecretKey) : null;
      const identity = Object.freeze({
        publicKeyB64: handle.publicKeyB64,
        displayName: opened.summary?.displayName || '',
        identityId: opened.summary?.identityId || '',
        // Also a GETTER, same reasoning as `walletAddresses` below --
        // `rotateWallet` moves the preferred pointer to the new address
        // when the rotated wallet was preferred, so a frozen snapshot
        // would keep naming a superseded address as "the" wallet forever.
        get walletAddress() {
          return active?.vault ? describeAuthKit(active.vault).walletAddress || '' : (opened.summary?.walletAddress || '');
        },
        // A GETTER, not a frozen snapshot: `addWallet`/`rotateWallet`/
        // `revokeWallet` all mutate `active.vault` in place, so a one-time
        // value captured at unlock would silently go stale the moment any
        // of those ran -- this re-derives from whatever `active.vault`
        // currently is, every time a caller reads it (`Object.freeze` only
        // locks property DESCRIPTORS; a getter function itself still runs
        // fresh on each access).
        get walletAddresses() {
          return active?.vault ? describeAuthKit(active.vault).walletAddresses : (opened.summary?.walletAddresses || []);
        },
        /** Same live-getter reasoning as `walletAddresses` above -- `{walletAddress: {revoked: boolean}}`, read-only, for a caller that wants to show delegation status without re-deriving it itself. */
        get walletDelegations() {
          const delegations = active?.vault?.walletDelegations || {};
          return Object.fromEntries(Object.entries(delegations).map(([address, entry]) => [address, { revoked: entry.revoked }]));
        },
        // The one fact `signWithWallet` alone doesn't give a caller: the
        // wallet's own raw public key, not its one-way-hashed `walletAddress`
        // (`flux-auth/identityWallet.mjs`'s `flux-wallet-address-v2`
        // derivation cannot be reversed back into it). A consumer building a
        // chain-wire record keyed to this wallet (dense-wire's
        // `G{pubkeyHex}-...` grammar, which verifies a signature against the
        // real public key, never the address) needs this to build a valid
        // wallet-signed record at all -- `createWalletSigningHandle` already
        // derives it in memory for `signWithWallet` itself; this only
        // surfaces what already exists, no new derivation. `null` exactly
        // when `signWithWallet` would also refuse, for the same reason.
        walletPublicKeyB64: walletHandle ? walletHandle.publicKeyB64 : null,
        securityProfile: opened.summary?.securityProfile || '',
        rootVerified: true,
        sign: async (text) => toBase64(await handle.sign(new TextEncoder().encode(text))),
        signWithWallet: async (text) => {
          if (!walletHandle) throw new Error('This identity has no wallet set up yet, so there is nothing to sign with -- create a wallet and complete its first-time setup first.');
          return toBase64(await walletHandle.sign(new TextEncoder().encode(text)));
        },
        /**
         * Mints and persists a real additional wallet, signed by this
         * session's own root handle (never a raw key). Returns the
         * UPDATED vault -- see this file's own header for why the caller,
         * not this function, decides what happens to it next (there is no
         * session API to replace a loaded vault in place).
         * @param {{pin:string,password?:string,label?:string,rights?:string[]}} input
         */
        addWallet: async ({ pin, password = '', label = 'Default', rights = ['receive', 'hold', 'spend', 'present'] }) => {
          if (!active?.vault) throw new Error('Sign in before adding a wallet.');
          const existing = active.vault.wallet?.body;
          const identityId = existing?.identityId || toHex(handle.publicKeyB64);
          const identityPublicKey = existing?.identityPublicKey || toHex(handle.publicKeyB64);
          const { record, walletSecretKey, walletAddress } = await createWalletForIdentity({
            identityId,
            identityPublicKey,
            signIdentity: (message) => handle.sign(message),
            label,
            rights,
            preferred: !active.vault.wallet,
            issuedAt: Date.now(),
          });
          const updatedVault = await addWalletToAuthKit(active.vault, { pin, password }, record, toBase64(walletSecretKey));
          active.vault = updatedVault;
          return { vault: updatedVault, walletAddress };
        },
        /**
         * The wallet grants its ROOT real, live signing power over itself
         * (vision doc §3 "capability, never secret-sharing"), signed with
         * the wallet's OWN secret key (never root's) -- the preferred
         * wallet's key is already an in-memory handle (`walletHandle`); any
         * other wallet's key is read from `opened.secret.walletSecretKeys`.
         * Returns the UPDATED vault, same "caller decides what happens to
         * it next" posture `addWallet` already has.
         * @param {{walletAddress:string, rights?:string[], maxSpend?:object|null, ttlMs?:number}} input
         */
        delegateWallet: async ({ walletAddress, rights = ['receive', 'spend'], maxSpend = null, ttlMs }) => {
          if (!active?.vault) throw new Error('Sign in before delegating a wallet.');
          const walletLinks = active.vault.wallets ?? (active.vault.wallet ? [active.vault.wallet] : []);
          const walletLink = walletLinks.find((w) => w.body.walletAddress === walletAddress);
          if (!walletLink) throw new Error('No such wallet on this identity.');
          const walletSecretKeyB64 = active.secret?.walletSecretKeys?.[walletAddress]
            ?? (active.vault.wallet?.body.walletAddress === walletAddress ? active.secret?.walletSecretKey : undefined);
          if (!walletSecretKeyB64) throw new Error('This wallet has no usable secret key in this session.');
          const walletSecretKey = Uint8Array.from(atob(walletSecretKeyB64), (character) => character.charCodeAt(0));
          const grant = createWalletDelegation({
            walletPublicKey: walletLink.body.walletPublicKey,
            rootPublicKey: toHex(handle.publicKeyB64),
            rights,
            maxSpend,
            ...(ttlMs ? { ttlMs } : {}),
          });
          const signedDelegation = await signWalletDelegation(grant, walletSecretKey);
          const updatedVault = addWalletDelegationToAuthKit(active.vault, walletAddress, signedDelegation);
          active.vault = updatedVault;
          return { vault: updatedVault, walletAddress, delegatedRights: grant.rights, maxSpend: grant.maxSpend, expiresAt: grant.expiresAt };
        },
        /** Independently revocable without rotating or killing the wallet -- flips only this wallet's own grant. */
        revokeWalletDelegation: ({ walletAddress }) => {
          if (!active?.vault) throw new Error('Sign in before revoking a delegation.');
          const updatedVault = revokeWalletDelegationInAuthKit(active.vault, walletAddress);
          active.vault = updatedVault;
          return { vault: updatedVault, walletAddress, revoked: true };
        },
        /**
         * Root signs with its OWN key (never the wallet's secret); the
         * Claim Scope Resolver (`rights` + `delegation` dimensions) decides
         * whether that signature is actually covered.
         * @param {string} walletAddress
         * @param {string} message
         * @param {'receive'|'hold'|'spend'|'present'} right
         * @param {number|null} [amount]
         */
        signWithDelegatedRoot: async (walletAddress, message, right, amount = null) => {
          if (!active?.vault) throw new Error('Sign in before signing as delegated root.');
          const entry = active.vault.walletDelegations?.[walletAddress];
          if (!entry) throw new Error('No delegation exists for this wallet.');
          const walletLinks = active.vault.wallets ?? (active.vault.wallet ? [active.vault.wallet] : []);
          const walletLink = walletLinks.find((w) => w.body.walletAddress === walletAddress);
          if (!walletLink) throw new Error('No such wallet on this identity.');
          const registry = await reduceWalletRegistry(walletLinks);
          const rootPublicKey = toHex(handle.publicKeyB64);
          const dimensions = {
            rights: rightsDimension(registry),
            delegation: delegationDimension({
              signedDelegation: entry.signedDelegation,
              now: Date.now(),
              isRevoked: (_walletPublicKey, nonce) => Boolean(entry.revoked && entry.signedDelegation.grant.nonce === nonce),
            }),
          };
          const decision = await resolveClaimScope({ walletAddress, walletPublicKey: walletLink.body.walletPublicKey, rootPublicKey, right, amount }, dimensions, ['rights', 'delegation']);
          if (!decision.authorized) throw new Error(`Delegated action refused: ${decision.reason}`);
          return toBase64(await handle.sign(new TextEncoder().encode(message)));
        },
        /**
         * Supersedes `walletAddress` with a brand-new wallet key in the
         * same slot's rotation lineage (vision doc §2) -- the last
         * remaining Portable Auth Kit gap: every other wallet-feature
         * surface in this workspace already had rotate/revoke; this
         * lineage had neither until the delegation work above landed the
         * `walletDelegations` storage pattern it reuses. Returns the
         * UPDATED vault, same "caller decides what happens to it next"
         * posture every other wallet mutation here already has.
         * @param {{walletAddress:string, pin:string, password?:string, label?:string, rights?:string[]}} input
         */
        rotateWallet: async ({ walletAddress, pin, password = '', label, rights }) => {
          if (!active?.vault) throw new Error('Sign in before rotating a wallet.');
          const walletLinks = active.vault.wallets ?? (active.vault.wallet ? [active.vault.wallet] : []);
          const prior = await findLiveWalletLink(walletLinks, walletAddress);
          if (!prior || prior.body.action === 'revoke') throw new Error('No such wallet on this identity.');
          const { record, walletSecretKey, walletAddress: newAddress } = await createWalletRotation({
            prior,
            identityId: active.vault.wallet?.body.identityId || toHex(handle.publicKeyB64),
            identityPublicKey: active.vault.wallet?.body.identityPublicKey || toHex(handle.publicKeyB64),
            signIdentity: (message) => handle.sign(message),
            label,
            rights,
            issuedAt: Date.now(),
          });
          const updatedVault = await rotateWalletInAuthKit(active.vault, { pin, password }, walletAddress, record, toBase64(walletSecretKey));
          active.vault = updatedVault;
          return { vault: updatedVault, walletAddress: newAddress, replacesWalletAddress: walletAddress };
        },
        /**
         * Retires a wallet outright, no successor (vision doc §2).
         * @param {{walletAddress:string, reason?:string}} input
         */
        revokeWallet: async ({ walletAddress, reason = null }) => {
          if (!active?.vault) throw new Error('Sign in before revoking a wallet.');
          const walletLinks = active.vault.wallets ?? (active.vault.wallet ? [active.vault.wallet] : []);
          const prior = await findLiveWalletLink(walletLinks, walletAddress);
          if (!prior || prior.body.action === 'revoke') throw new Error('No such wallet on this identity.');
          const { record } = await createWalletRevocation({
            prior,
            identityId: active.vault.wallet?.body.identityId || toHex(handle.publicKeyB64),
            identityPublicKey: active.vault.wallet?.body.identityPublicKey || toHex(handle.publicKeyB64),
            signIdentity: (message) => handle.sign(message),
            reason,
            issuedAt: Date.now(),
          });
          const updatedVault = revokeWalletInAuthKit(active.vault, record);
          active.vault = updatedVault;
          return { vault: updatedVault, walletAddress, revoked: true };
        },
        /**
         * Ranks this identity's own live wallets via the LIVE
         * `flxd-discovery` group's `/api/discovery/rank` -- a genuinely
         * delegated wallet is boosted to the front. Ranking is an
         * enhancement, never a requirement: this throws on a mesh failure,
         * the caller decides whether an unranked list is an acceptable
         * fallback.
         * @param {{discoveryUrl?:string}} [options]
         */
        rankWalletsByActivationViaMesh: async ({ discoveryUrl = 'http://127.0.0.1:8779' } = {}) => {
          if (!active?.vault) throw new Error('Sign in before ranking wallets.');
          const walletLinks = active.vault.wallets ?? (active.vault.wallet ? [active.vault.wallet] : []);
          const registry = await reduceWalletRegistry(walletLinks);
          const live = registry.wallets.filter((w) => !w.revoked);
          const items = live.map((w, index) => ({
            id: w.walletAddress,
            taxonomyIds: active.vault.walletDelegations?.[w.walletAddress] && !active.vault.walletDelegations[w.walletAddress].revoked ? ['activated'] : [],
            baseScore: live.length - index,
          }));
          const response = await rankDiscovery(discoveryUrl, { items, weights: { activated: 5 }, explorationFloor: 0.25 });
          if (!(response.status === 200 && Array.isArray(response.order))) {
            throw new Error(`Discovery resolver unavailable: ${response.status} ${response.error || JSON.stringify(response)}`);
          }
          const byAddress = new Map(live.map((w) => [w.walletAddress, w]));
          return response.order.map((address) => byAddress.get(address)).filter(Boolean);
        },
      });
      active = { handle, walletHandle, identity, vault: opened.vault, secret: opened.secret };
      onChange(identity);
    },
    onSignOut: () => { if (pending) { pending.dispose(); pending = null; } drop(); },
  });

  return {
    current: () => (active ? active.identity : null),
    signOut: () => { session.clear(); if (pending) { pending.dispose(); pending = null; } drop(); },
    dispose: () => { session.clear(); if (pending) { pending.dispose(); pending = null; } drop(); },
  };
}

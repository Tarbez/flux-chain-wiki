/* =====================================================================
   ADMIN SIGN-IN (bundle entry)
   ---------------------------------------------------------------------
   Publishing to flux-chain.ark is authorised by a DeadArk identity, the same
   Auth Kit (.auth.flx) chat.deadark.com signs in with. This file composes
   shared parts and adds no cryptography of its own:

     the panel and the kit envelope   @deadark/ark-ui/flux-auth(-ui)
     root derivation `flux-bip39-v1`  fxn-auth/root-from-mnemonic
     root derivation `deadark-profile-v1`
                                      deadark-identity-core/root-signing-handle

   A kit records which derivation named its root, and the two give different
   keys for one phrase, so the kit chooses. The signer and the verifier are the
   same computation: the key the panel verifies against the kit is the key that
   signs, so verification cannot be skipped. A kit whose root could not be
   proven is refused, never used to sign.

   The signing key is held by a handle that never exposes its bytes, lives only
   in this page's memory, and is disposed on sign-out. By default nothing is
   written to storage, so reloading the page signs you out.

   "Keep me signed in" (owner, 2026-10-24: "every auth create the session of
   that 1 day, 3 day, 7 day and 14 days ... on reload your auth still works but
   that's your own risk"). After an open, the panel offers ark-ui's remember
   picker, set to "Only this tab". Choosing a window saves what reopens the
   identity into ark-ui's persisted-secret vault (a non-extractable AES-GCM key
   in IndexedDB, expiry checked on every read), one vault per `product` on this
   origin. What is saved is the opened identity's material, the same things
   flux-db-studio's auth-kit mode keeps: the FXN ID file as it was opened, the
   recovery phrase it opened to, and the wallet secret keys inside it. The PIN,
   password, key word, icon and v10 Secret Key are never saved; this file never
   receives them. On load, an unexpired record reopens the identity without the
   file: the root is rebuilt from the phrase and must equal the file's root key,
   or the record is deleted. Sign-out and "Forget now" delete it. An expired
   record is deleted by the vault on read. The risk note says the honest limit
   from the vault's own header: it stops a copy of the disk, not a harmful
   script running on this site during the window. The record is written in its
   own grammar (see REMEMBER_LABELS below), never as JSON.

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
   wallet via `fxn-auth/wallet-lifecycle`'s `createWalletForIdentity`, signed
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
   gap the same way: `fxn-auth-client/wallet-mesh`'s `rankDiscovery` is
   dependency-free (no `node:crypto`), so it bundles here directly with no
   workaround needed -- ranks this identity's live wallets by whether each
   has an active, unrevoked delegation grant.

   NAMES (owner, 2026-10-25). FXN ID = the whole identity (the file). Master ID = its root (code still says root).
   Public ID = what the person shows others. Role keys = keys made from the Master ID for one job (gate, genesis).
   Every string a person reads uses these words; field names, record kinds and HKDF labels do not change.

   PUBLIC IDS (owner, 2026-10-25). The root never signs for a page. A page sees the person as ONE public id: an
   independent key sealed in the file (fxn-auth/public-ids). `publicKeyB64`, `identityId`, `displayName`, `sign` and
   `signBytes` are that public id's, so every page and copied site that signs through `who` (authKitSigner(who), the
   CMS login, publishing) signs as the public id after a rebuild, with no page edit. `usePublicId` switches. A file
   with no public id signs nothing and says how to add one. The root still signs the file's own records (wallet
   links to the root in older files, reveals); nothing it signs leaves the file from here. `signWithDelegatedRoot`
   refuses for the same reason. `linkRisk` tells a page when an act would link two public ids in public.
   A wallet a public id makes is private: its KWALLET1 stays in the file until `publishWallet` sends it.

   GENESIS KEY (owner, 2026-10-25). A network's genesis records (network, mint, custody, safes, sends) are signed by
   the genesis key, which fxn-auth/root-keys makes from the root seed with its own label. `genesisSigner()` signs with
   it, and its `keyName` lets a review say which key signs. The root itself still signs nothing for a page.

   Build: node scripts/build-auth.cjs  ->  js/admin/auth.js (a classic script).
   ===================================================================== */
import { createAuthKitSession, addWalletDelegationToAuthKit, revokeWalletDelegationInAuthKit, rotateWalletInAuthKit, revokeWalletInAuthKit, describeAuthKit, parseAuthKit, encodeAuthKitEnvelope, canonicalAuthKitRootKey } from '@deadark/ark-ui/flux-auth';
import { createArkAuthKitPanel } from '@deadark/ark-ui/flux-auth-ui';
import { createPersistedSecretVault, rememberMeDurationMs } from '@deadark/ark-ui/flux-auth-persisted-secret';
import { createArkRememberMePicker, ARK_AUTH_SESSION_STYLES } from '@deadark/ark-ui/flux-auth-session-dom';
import { createFluxRootHandle, fluxRootFromMnemonic, FLUX_ROOT_DERIVATION } from 'fxn-auth/root-from-mnemonic';
import { createRootIdentitySigningHandle } from 'deadark-identity-core/root-signing-handle';
import { createWalletSigningHandle } from 'fxn-auth/wallet-signing-handle';
import { createWalletRotation, createWalletRevocation, walletLinkRecordCid } from 'fxn-auth/wallet-lifecycle';
import { createWalletDelegation, signWalletDelegation } from 'fxn-auth/wallet-delegation';
import { reduceWalletRegistry } from 'fxn-auth/wallet-registry';
import { rankDiscovery } from 'fxn-auth-client/wallet-mesh';
import { addPublicId, addWalletToPublicId, describePublicIds, linkRisk, openPublicIds, publishWallet, seedSigner } from 'fxn-auth/public-ids';
import { GENESIS_KEY_LABEL, rootDerivedKey } from 'fxn-auth/root-keys';
import { createAuthKitV10 } from 'fxn-auth/auth-kit-create';
import { releaseSecretKeyForKit, parseCommittee, enrollWithGate } from 'fxn-auth/fxn-id-gate';

const NO_GENESIS_KEY = 'This FXN ID cannot make a genesis key here, because its Master ID does not come from its Master ID recovery phrase. Missing: a Master ID made from that phrase. To fix: sign in with an FXN ID made by fxn-id new or this site.';
const NO_PUBLIC_ID = 'This FXN ID has no Public ID, so it cannot sign for a site or the chain. Missing: a Public ID. To fix: add one under Public IDs on your account page, then save the new file.';
const hexToBase64 = (hex) => { let binary = ''; for (let i = 0; i < hex.length; i += 2) binary += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16)); return btoa(binary); };

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

/* ---- The remembered sign-in: one record in this store's own grammar ----
   Boxes are joined by '-'. A box takes the longest label it starts with, and its payload must
   match that label's rule. Free text enters as hex of its UTF-8 bytes, so no payload holds a '-'.
     FXR  the record's version, the digit 1                 first box, once
     K    the FXN ID file as it was opened                   once
     M    the recovery phrase the file opened to             once
     W    the preferred wallet's secret key                  at most once
     S    one wallet's secret key: hex address '.' hex key   any number
   The record exists only inside the persisted-secret vault, encrypted under its non-extractable
   key. Nothing else reads it, so nothing here is reserved for any other resolver. */
const HEX = '(?:[0-9a-f]{2})+';
const REMEMBER_LABELS = {
  FXR: /^1$/,
  K: new RegExp('^' + HEX + '$'),
  M: new RegExp('^' + HEX + '$'),
  W: new RegExp('^' + HEX + '$'),
  S: new RegExp('^' + HEX + '\\.' + HEX + '$'),
};
const REMEMBER_LABEL_ORDER = Object.keys(REMEMBER_LABELS).sort((a, b) => b.length - a.length);
const utf8Hex = (text) => Array.from(new TextEncoder().encode(text), (byte) => byte.toString(16).padStart(2, '0')).join('');
const hexUtf8 = (hex) => new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(hex.match(/../g), (pair) => parseInt(pair, 16)));

function encodeRemembered({ kitText, mnemonic, walletSecretKey, walletSecretKeys }) {
  const boxes = ['FXR1', 'K' + utf8Hex(kitText), 'M' + utf8Hex(mnemonic)];
  if (walletSecretKey) boxes.push('W' + utf8Hex(walletSecretKey));
  for (const [address, key] of Object.entries(walletSecretKeys || {})) boxes.push('S' + utf8Hex(address) + '.' + utf8Hex(key));
  return boxes.join('-');
}

function decodeRemembered(record) {
  const boxes = String(record).split('-');
  if (boxes[0] !== 'FXR1') throw new Error('The kept sign-in is not a version this page reads.');
  const out = { kitText: '', mnemonic: '', walletSecretKey: '', walletSecretKeys: {} };
  for (const box of boxes.slice(1)) {
    const label = REMEMBER_LABEL_ORDER.find((name) => box.startsWith(name));
    const payload = label ? box.slice(label.length) : '';
    if (!label || label === 'FXR' || !REMEMBER_LABELS[label].test(payload)) throw new Error('The kept sign-in has a part this page does not read.');
    if (label === 'K') out.kitText = hexUtf8(payload);
    else if (label === 'M') out.mnemonic = hexUtf8(payload);
    else if (label === 'W') out.walletSecretKey = hexUtf8(payload);
    else { const [address, key] = payload.split('.'); out.walletSecretKeys[hexUtf8(address)] = hexUtf8(key); }
  }
  if (!out.kitText || !out.mnemonic) throw new Error('The kept sign-in is missing its FXN ID file or its phrase.');
  return out;
}

/* Words for the remember block. One idea per sentence (docs/COPY-LAWS.md). */
const KEEP_WORDS = {
  keptUntil: (when) => 'Kept on this browser until ' + when + '.',
  forget: 'Forget now',
  forgotten: 'Forgotten on this browser. A reload signs you out.',
  saveRefused: 'This browser could not keep your sign-in. Its site storage is off or full. You stay signed in on this tab. Allow storage for this site, then choose a time again.',
  restoreRefused: 'Your kept sign-in could not be opened, so this browser deleted it. Choose your FXN ID file to sign in again.',
};

const KEEP_STYLES = '.ark-session-keep { display: grid; gap: 8px; margin-top: 12px; } .ark-session-keep[hidden] { display: none; }';

function installKeepStyles() {
  if (typeof document === 'undefined' || document.getElementById('ark-session-keep-styles')) return;
  const style = document.createElement('style');
  style.id = 'ark-session-keep-styles';
  style.textContent = ARK_AUTH_SESSION_STYLES + KEEP_STYLES;
  (document.head || document.documentElement).appendChild(style);
}

function formatUntil(at) {
  return new Date(at).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/* The genesis key of an opened FXN ID as `{ key, seed }` (hex), the shape seedSigner takes; null when the root is not
   rebuilt from the recovery phrase (a deadark-profile-v1 root). The root secret is zeroed before this returns. */
async function genesisKeyOf(opened) {
  if ((opened.summary?.rootDerivation || FLUX_ROOT_DERIVATION) !== FLUX_ROOT_DERIVATION || !opened.secret?.mnemonic) return null;
  const root = await fluxRootFromMnemonic(opened.secret.mnemonic);
  try {
    const derived = await rootDerivedKey(root.secretKey, GENESIS_KEY_LABEL);
    const seed = Array.from(derived.secretKey.slice(0, 32), (b) => b.toString(16).padStart(2, '0')).join('');
    derived.secretKey.fill(0);
    return { key: derived.pubHex, seed };
  } finally {
    root.secretKey.fill(0);
  }
}

/* One root handle for a phrase, by the derivation the kit names. */
async function rootHandle({ mnemonic, derivation, callsign }) {
  if (derivation === FLUX_ROOT_DERIVATION) return createFluxRootHandle(mnemonic);
  if (derivation === 'deadark-profile-v1') {
    if (!callsign) throw new Error('This FXN ID names a DeArk profile Master ID but records no callsign, so its key cannot be rebuilt.');
    return createRootIdentitySigningHandle({ phrase: mnemonic, callsign });
  }
  throw new Error('This FXN ID uses a Master ID derivation this page does not know: ' + derivation + '.');
}

/* container: where the sign-in panel is drawn.
   onChange(identity | null): called on sign-in and sign-out.
   identity: { publicKeyB64, displayName, sign(text) -> Promise<signatureB64> } */
export function create({ container, onChange = () => {}, product = 'Flux Protocol' }) {
  // No default stylesheet: the panel's own `data-ark-auth` hooks are styled entirely by css/admin.css,
  // so its look is one thing with the rest of the gate, not two stylesheets negotiating a cascade.
  let active = null;   // { handle, walletHandle, identity, vault, secret }
  let pending = null;  // the handle the verifier just derived, not yet admitted

  function drop() {
    if (active) { active.handle.dispose(); if (active.walletHandle) active.walletHandle.dispose(); }
    active = null;
    onChange(null);
  }

  /* Builds the signed-in identity from an opened FXN ID and the root handle proven to match it.
     A fresh open and a kept sign-in both come through here, so they sign the same way. */
  async function admit(opened, handle) {
    // Present only once a wallet exists and first-time setup produced a usable secret. A kit with no wallet
    // yet, or one still pending standalone/delegate setup, has no walletSecretKey here -- signWithWallet below
    // names that explicitly rather than quietly signing with the root key instead.
    // Awaited: fxn-auth's createWalletSigningHandle became async on 2026-10-23 (native Ed25519 derives the
    // public key asynchronously). Unawaited, walletHandle was a Promise: walletPublicKeyB64 read undefined,
    // signWithWallet threw, and Sign out threw on `dispose` before it could sign anyone out.
    const walletHandle = opened.secret?.walletSecretKey ? await createWalletSigningHandle(opened.secret.walletSecretKey) : null;
    // A block that does not open is refused here, so a changed file never signs as a public id it does not hold.
    const ids = await openPublicIds(opened.vault, opened.secret?.mnemonic);
    const shownIds = await describePublicIds(ids);
    const genesis = await genesisKeyOf(opened);
    if (active) { active.handle.dispose(); if (active.walletHandle) active.walletHandle.dispose(); }
    const currentId = () => (active?.ids || ids).find((id) => id.key === active?.current) || null;
    const needId = () => { const id = currentId(); if (!id) throw new Error(NO_PUBLIC_ID); return id; };
    const shownCurrent = () => (active?.shown || shownIds).find((id) => id.key === active?.current) || null;
    // Keys this file links to the root: the root and the wallets of older files. Used only for linkRisk, never sent.
    const rootKeys = () => [toHex(handle.publicKeyB64), ...(active?.vault?.wallets ?? (active?.vault?.wallet ? [active.vault.wallet] : [])).map((w) => { try { return toHex(w.body.walletPublicKey); } catch { return ''; } })];
    async function reloadIds(vault) {
      active.vault = vault;
      active.ids = await openPublicIds(vault, active.secret.mnemonic);
      active.shown = await describePublicIds(active.ids);
      refreshKept();
    }
    const identity = Object.freeze({
      // The public id this page signs as. Getters: usePublicId switches it.
      get publicKeyB64() { const id = currentId(); return id ? hexToBase64(id.key) : ''; },
      get displayName() { return shownCurrent()?.name || ''; },
      get identityId() { return currentId()?.key || ''; },
      /** The current Public ID, no seed: { key, name, label, at, wallets: [{ key, label, at, record, published }] }, or
       *  null. `published` is null for a private wallet (its link is only in the file). */
      get publicId() { return shownCurrent(); },
      /** Every public id in the file, no seed. Shown only to the person on this page; never send the list to a site. */
      get publicIds() { return (active?.shown || shownIds).slice(); },
      /** The file's own name. Local only: it is the same for every public id, so it links them if a site sees it. */
      fileDisplayName: opened.summary?.displayName || '',
      usePublicId: (key) => {
        if (!active) throw new Error('Sign in before choosing a Public ID.');
        if (!active.ids.some((id) => id.key === key)) throw new Error('This FXN ID has no such Public ID. Missing: a key from publicIds. To fix: pick one of them.');
        active.current = key;
        onChange(identity);
        return shownCurrent();
      },
      /** `{ pubHex, publicKeyB64, signText, signBytes }` (hex signatures) for any public id in the file, by key. The broker
       *  signs for each site as the public id that site was shown. */
      publicIdSigner: (key) => {
        const id = (active?.ids || ids).find((i) => i.key === key);
        if (!id) throw new Error('This FXN ID has no such Public ID. Missing: a key from publicIds. To fix: pick one of them.');
        return seedSigner(id);
      },
      /** The genesis key's public half (64 hex), or '' when this FXN ID cannot make one here. */
      genesisKeyHex: genesis?.key || '',
      /** `{ pubHex, publicKeyB64, signText, signBytes, keyName }` (hex signatures) for the genesis key: the only key a
       *  network's genesis records are signed with. Throws, naming what is missing, when this FXN ID cannot make one. */
      genesisSigner: () => {
        if (!genesis) throw new Error(NO_GENESIS_KEY);
        return Object.freeze({ ...seedSigner(genesis), keyName: 'Your genesis key' });
      },
      /** `{ pubHex, publicKeyB64, signText, signBytes }` (hex signatures) for one wallet of the CURRENT public id. */
      walletSigner: (walletKeyHex) => {
        const wallet = needId().wallets.find((w) => w.key === walletKeyHex);
        if (!wallet) throw new Error('That wallet is not one of this Public ID\'s. Missing: a wallet key from publicId.wallets. To fix: switch to its Public ID first, or pick one of this ID\'s wallets.');
        return seedSigner(wallet);
      },
      /** The warning when sending from `fromHex` to `toHex` links two of your public ids (or one and your root), else null. */
      linkRisk: (fromHex, toHex) => linkRisk(active?.ids || ids, fromHex, toHex, rootKeys()),
      /** The file as it is now, ready to save (`.auth.fxn`). After a public id or wallet is added, the old file lacks it. */
      fileText: () => { if (!active?.vault) throw new Error('Sign in before saving the file.'); return encodeAuthKitEnvelope(active.vault); },
      /** Adds a public id with fresh wallets. Returns { vault, publicId }: save the vault as the new file. */
      addPublicId: async ({ label, walletCount = 1 } = {}) => {
        if (!active?.vault) throw new Error('Sign in before adding a Public ID.');
        const added = await addPublicId(active.vault, active.secret.mnemonic, { label, walletCount });
        await reloadIds(added.vault);
        if (!active.current) { active.current = added.publicId.key; onChange(identity); }
        return added;
      },
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
      // (`fxn-auth/identityWallet.mjs`'s `flux-wallet-address-v2`
      // derivation cannot be reversed back into it). A consumer building a
      // chain-wire record keyed to this wallet (dense-wire's
      // `G{pubkeyHex}-...` grammar, which verifies a signature against the
      // real public key, never the address) needs this to build a valid
      // wallet-signed record at all -- `createWalletSigningHandle` already
      // derives it in memory for `signWithWallet` itself; this only
      // surfaces what already exists, no new derivation. `null` exactly
      // when `signWithWallet` would also refuse, for the same reason.
      // The current public id's first wallet (was the file's root-linked wallet until 2026-10-25).
      // Only a wallet whose link is already public: a page that shows or signs with a private wallet next to the
      // Public ID would tell a site the link the file keeps private. Null until one is published.
      get walletPublicKeyB64() { const w = currentId()?.wallets.find((x) => x.published != null); return w ? hexToBase64(w.key) : null; },
      securityProfile: opened.summary?.securityProfile || '',
      rootVerified: true,
      sign: async (text) => hexToBase64(await seedSigner(needId()).signText(text)),
      // Raw bytes, not text: dense-wire records are signed over their exact bytes. genesis's
      // and defxn-dao's signers (js/dense-wire/flx-identity-bridge.mjs) and defxn-dao's DAO
      // voting call this; it was in the earlier bundle and was lost when this entry was
      // rewritten, so those sites could not sign once they picked up a current build.
      signBytes: async (bytes) => hexToBase64(await seedSigner(needId()).signBytes(bytes)),
      signWithWallet: async (text) => {
        const wallet = needId().wallets.find((x) => x.published != null);
        if (!wallet) throw new Error('This Public ID has no published wallet, so a page cannot sign with one next to it. Missing: a wallet whose link is public. To fix: publish a wallet\'s link on your account page first.');
        return hexToBase64(await seedSigner(wallet).signText(text));
      },
      /**
       * Mints and persists a real additional wallet, signed by this
       * session's own root handle (never a raw key). Returns the
       * UPDATED vault -- see this file's own header for why the caller,
       * not this function, decides what happens to it next (there is no
       * session API to replace a loaded vault in place).
       * @param {{pin:string,password?:string,label?:string,rights?:string[]}} input
       */
      // Since 2026-10-25 a new wallet belongs to the CURRENT Public ID, never to the Master ID, and needs no PIN: the
      // block opens with the phrase this session holds. `record` is its KWALLET1, signed by the wallet and the Public ID.
      // The wallet is PRIVATE (owner ruling, option A): do not send `record`. Only `publishWallet` sends it, by the
      // owner's choice. `walletAddress` is the wallet's key, kept for older callers.
      addWallet: async ({ label } = {}) => {
        if (!active?.vault) throw new Error('Sign in before adding a wallet.');
        const added = await addWalletToPublicId(active.vault, active.secret.mnemonic, needId().key, { label });
        await reloadIds(added.vault);
        return { vault: added.vault, wallet: added.wallet, record: added.wallet.record, walletAddress: added.wallet.key };
      },
      /** Publishes one wallet's link to its Public ID, by the owner's choice (owner ruling, option A, 2026-10-25).
       *  `send(record)` is the page's transport: it sends the wallet's KWALLET1 to chain pva (RESOLVER_RECORD) and
       *  resolves on the node's OK, or throws its refusal. Only then is the wallet marked published in the file.
       *  Anyone who reads chain pva then sees whose wallet it is. Returns { vault, wallet }: save the new file. */
      publishWallet: async ({ walletKey, send, ask } = {}) => {
        if (!active?.vault) throw new Error('Sign in before publishing a wallet\'s link.');
        const done = await publishWallet(active.vault, active.secret.mnemonic, walletKey, { send, ask });
        await reloadIds(done.vault); // also re-saves a kept sign-in, so a reload keeps the published mark
        return { vault: done.vault, wallet: done.wallet, alreadyOnChain: done.alreadyOnChain };
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
      // Owner, 2026-10-25: the root signs nothing a page can send, so the delegated-root signer is gone. It refuses
      // by name; the Claim Scope check it ran is in git history for the day a delegated signer is a public id.
      signWithDelegatedRoot: async () => {
        throw new Error('The Master ID does not sign for pages. Missing: a Public ID signer. To fix: sign with the identity (its current Public ID) or one of its wallets.');
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
    active = { handle, walletHandle, identity, vault: opened.vault, secret: opened.secret, ids, shown: shownIds, current: ids[0]?.key || null };
    onChange(identity);
  }

  let keptRefused = false;   // a kept sign-in was found but could not be reopened (and was deleted)
  const realSession = createAuthKitSession({
    verifyRoot: async (input) => {
      if (pending) pending.dispose();
      pending = await rootHandle(input);
      return { rootPublicKey: pending.publicKeyB64 };
    },
    /* v10 (2026-10-25): the gate client, so a v10 file opens with its four factors and no typed Secret Key. fxn-auth's
       releaseSecretKeyForKit has exactly the session's shape. It asks the file's own (birth) committee; the Emergency
       Kit's Secret Key still opens the file when the gate cannot answer. */
    releaseSecretKey: (input) => releaseSecretKeyForKit(input),
  });

  /* The panel reads its screen from the session. A kept sign-in reopens with no file loaded, so the
     panel is handed this session: it reports the kept identity as open until sign-out, and is the
     real session in every other state. The panel then shows its usual signed-in screen and its own
     Sign out. */
  let keptState = null;
  const keptListeners = new Set();
  const session = {
    ...realSession,
    getState: () => keptState || realSession.getState(),
    subscribe(listener) {
      keptListeners.add(listener);
      const stop = realSession.subscribe(listener);
      return () => { keptListeners.delete(listener); stop(); };
    },
    clear() { keptState = null; realSession.clear(); },
  };

  /* ---- Keep me signed in ---- */
  const kept = createPersistedSecretVault({ scope: 'fxn-id-web-sign-in/' + product });
  let keeping = Promise.resolve(); // saves and clears run one at a time, in the order chosen
  let picker = null;
  installKeepStyles();
  const keepBox = document.createElement('div');
  keepBox.className = 'ark-session-keep';
  keepBox.setAttribute('data-ark-session', 'keep');
  const pickerSlot = document.createElement('div');
  const keepStatus = document.createElement('p');
  keepStatus.className = 'ark-session-remember-note';
  keepStatus.setAttribute('data-ark-session', 'keep-status');
  keepStatus.setAttribute('role', 'status');
  const keepActions = document.createElement('div');
  keepActions.className = 'ark-auth-actions';
  keepActions.setAttribute('data-ark-auth', 'actions');
  const forgetButton = document.createElement('button');
  forgetButton.type = 'button';
  forgetButton.textContent = KEEP_WORDS.forget;
  forgetButton.setAttribute('data-kind', 'quiet');
  forgetButton.setAttribute('data-action', 'forget');
  keepActions.appendChild(forgetButton);
  keepBox.append(pickerSlot, keepStatus, keepActions);

  // `hidden` alone can lose to a site's own display rule for buttons, so the inline style says it too.
  function shown(node, yes) {
    node.hidden = !yes;
    node.style.display = yes ? '' : 'none';
  }

  function showKeep({ status = '', canForget = false } = {}) {
    shown(keepBox, true);
    keepStatus.textContent = status;
    shown(keepStatus, Boolean(status));
    shown(keepActions, canForget);
  }

  function hideKeep() {
    if (picker) { picker.destroy(); picker = null; }
    shown(keepBox, false);
    keepStatus.textContent = '';
    shown(keepActions, false);
  }

  function queue(work) {
    keeping = keeping.then(work, work);
    return keeping;
  }

  function keepFor(value) {
    return queue(async () => {
      const ms = rememberMeDurationMs(value);
      if (!ms) {
        try { await kept.clear(); } catch { /* no storage means nothing is kept */ }
        if (active) showKeep();
        return;
      }
      if (!active) return;
      try {
        await kept.save(encodeRemembered({
          kitText: encodeAuthKitEnvelope(active.vault),
          mnemonic: active.secret.mnemonic,
          walletSecretKey: active.secret.walletSecretKey,
          walletSecretKeys: active.secret.walletSecretKeys,
        }), ms);
        if (active) showKeep({ status: KEEP_WORDS.keptUntil(formatUntil(Date.now() + ms)), canForget: true });
      } catch {
        if (picker) picker.setValue('none');
        if (active) showKeep({ status: KEEP_WORDS.saveRefused });
      }
    });
  }

  /* The file changed (a public id or wallet was added): a kept sign-in must hold the new file, or a reload loses it. */
  function refreshKept() {
    return queue(async () => {
      if (!active) return;
      let ms = 0;
      try { ms = await kept.remainingMs(); } catch { return; }
      if (!ms) return;
      try {
        await kept.save(encodeRemembered({ kitText: encodeAuthKitEnvelope(active.vault), mnemonic: active.secret.mnemonic, walletSecretKey: active.secret.walletSecretKey, walletSecretKeys: active.secret.walletSecretKeys }), ms);
      } catch { /* the kept copy stays older; the saved file is what counts */ }
    });
  }

  function forgetKept() {
    return queue(async () => {
      try { await kept.clear(); } catch { /* no storage means nothing is kept */ }
    });
  }

  forgetButton.addEventListener('click', () => {
    void forgetKept().then(() => {
      if (picker) picker.setValue('none');
      if (active) showKeep({ status: KEEP_WORDS.forgotten });
    });
  });

  /* After a fresh open: offer the windows, starting at "Only this tab". */
  function offerKeep() {
    if (picker) picker.destroy();
    picker = createArkRememberMePicker({ container: pickerSlot, value: 'none', onChange: (value) => { void keepFor(value); } });
    showKeep();
  }

  /* On load: reopen a kept identity without the file, or delete a record that cannot be used. */
  async function reopenKept() {
    let record = null;
    try { record = await kept.load(); } catch { return; } // no storage here: nothing was kept
    if (!record || active) return;
    let handle = null;
    try {
      const material = decodeRemembered(record);
      const vault = parseAuthKit(material.kitText);
      const summary = describeAuthKit(vault);
      handle = await rootHandle({ mnemonic: material.mnemonic, derivation: summary.rootDerivation, callsign: summary.callsign });
      if (canonicalAuthKitRootKey(handle.publicKeyB64) !== canonicalAuthKitRootKey(vault.rootPublicKey)) throw new Error('The kept phrase does not make this FXN ID\'s Master ID.');
      if (active) { handle.dispose(); return; } // someone opened a file while this was reading
      const secret = { mnemonic: material.mnemonic };
      if (material.walletSecretKey) secret.walletSecretKey = material.walletSecretKey;
      if (Object.keys(material.walletSecretKeys).length) secret.walletSecretKeys = material.walletSecretKeys;
      const opened = { vault, summary, secret, rootVerified: true };
      await admit(opened, handle);
      keptState = { status: 'open', summary, opened, error: null, unverified: false, gateClient: false };
      for (const listener of keptListeners) listener(keptState);
      const remaining = await kept.remainingMs();
      if (active) showKeep({ status: remaining ? KEEP_WORDS.keptUntil(formatUntil(Date.now() + remaining)) : '', canForget: true });
    } catch {
      if (handle && !active) handle.dispose();
      await forgetKept();
      keptRefused = true;
      showKeep({ status: KEEP_WORDS.restoreRefused });
    }
  }

  createArkAuthKitPanel({
    container, session, product,
    hint: 'Choose your FXN ID file (.auth.fxn). It stays on this device and is never uploaded.',
    readyHint: 'Signed in. Publishing signs with your identity.',
    onUnlock: async (opened) => {
      // Throwing here is how a panel refuses an identity: the message lands in its notice and no one is signed in.
      if (!opened.rootVerified || !pending) {
        if (pending) pending.dispose();
        pending = null;
        throw new Error('This FXN ID opened, but its Master ID could not be proven, so it cannot sign.');
      }
      const handle = pending;
      pending = null;
      await admit(opened, handle);
      offerKeep();
    },
    onSignOut: () => { if (pending) { pending.dispose(); pending = null; } hideKeep(); void forgetKept(); drop(); },
  });
  hideKeep();
  container.appendChild(keepBox);
  void reopenKept();

  return {
    current: () => (active ? active.identity : null),
    /* The last refusal, for a page that draws its own failure screen (defxn.com /auth): { code, message, detail } or
       null. code is AuthKitError's stable code (ark-ui flux-auth): switch on it, never on the words. keptRefused is
       true once a kept sign-in was found on load but could not be reopened (this browser then deleted it). */
    error: () => { const e = realSession.getState().error; return e ? { code: e.code, message: e.message, detail: e.detail || null } : null; },
    keptRefused: () => keptRefused,
    /* What the loaded file is, for a page that draws its own checks: { version, needsSecretKey, hasGate } or null.
       No factor and no key: only what the file's public header says. */
    fileInfo: () => { const m = realSession.getState().summary; return m ? { version: m.version, needsSecretKey: !!m.needsSecretKey, hasGate: !!m.hasGate } : null; },
    // Signing out also deletes a kept sign-in. Disposing does not: a page that is going away has not signed out.
    signOut: () => { session.clear(); if (pending) { pending.dispose(); pending = null; } hideKeep(); void forgetKept(); drop(); },
    dispose: () => { session.clear(); if (pending) { pending.dispose(); pending = null; } hideKeep(); drop(); },
  };
}

/* ---- Making a new FXN ID in the browser (v10, 2026-10-25) --------------------------------------------------------
   The one writer is fxn-auth's createAuthKitV10 (no copy here). This adds only what a web page needs around it:
     1 the gate committee, read from the site's committee file in fxn-auth's own grammar (parseCommittee);
     2 the file, with its Master ID recovery phrase and Master ID Secret Key returned ONCE as the Emergency Kit;
     3 the first Public ID (fxn-auth/public-ids addPublicId), so the new file can sign at once;
     4 the gate enrollment (enrollWithGate): each committee node gets its piece of the Secret Key. A node that does not
       answer is reported, never hidden; the file still opens with the Emergency Kit.
   Input: { displayName, pin, password, word, icon, wordCount (12|24), committeeUrl }. Returns { text, fileName,
   publicId, emergencyKit: { mnemonic, secretKey }, gate: { threshold, nodes, enrolled: [ids], failed: [{ nodeId,
   reason }] } }. Nothing is stored; the page saves the file and shows the kit. */
const NO_COMMITTEE = (url, why) => Object.assign(new Error('This site has no FXN ID gate committee, so it cannot make a new FXN ID yet. Missing: the committee file at ' + url + ' (' + why + '). To fix: publish the gate committee there.'), { code: 'gate-committee-missing' });
async function loadCommittee(url) {
  let text = '';
  try { const res = await fetch(url, { cache: 'no-store' }); if (!res.ok) throw new Error('HTTP ' + res.status); text = await res.text(); } catch (error) { throw NO_COMMITTEE(url, error.message); }
  try { return parseCommittee(text); } catch (error) { throw NO_COMMITTEE(url, 'it does not parse: ' + error.message); }
}
export async function createFxnId({ displayName, pin, password = '', word = '', icon, wordCount = 24, committeeUrl = '/gate.committee', onProgress } = {}) {
  const committee = await loadCommittee(committeeUrl);
  const made = await createAuthKitV10({ displayName, pin, password, word, icon, wordCount, gate: committee, onProgress,
    reveal: { reason: 'Shown once, on the page that made this FXN ID.' } });
  const withId = await addPublicId(made.vault, made.emergencyKit.mnemonic, { label: 'Main', walletCount: 1 });
  let failed = [];
  try { await enrollWithGate(made.gateEnrollments); } catch (error) { failed = error.failed || [{ nodeId: 'all', reason: error.message }]; }
  const enrolled = committee.nodes.map((n) => n.id).filter((id) => !failed.some((f) => f.nodeId === id));
  const name = String(displayName || '').trim().toLowerCase().replace(/[^a-z0-9._]+/g, '-').replace(/^-+|-+$/g, '') || 'fxn-id';
  return Object.freeze({ text: encodeAuthKitEnvelope(withId.vault), fileName: name + '.auth.fxn', publicId: withId.publicId, emergencyKit: made.emergencyKit,
    gate: Object.freeze({ threshold: committee.threshold, nodes: committee.nodes.length, enrolled, failed }) });
}

/* The nine FXN ID icons, from ark-ui itself (never a copy): a page draws its own icon picker from this list. */
export { FXN_ID_ICONS } from '@deadark/ark-ui/flux-auth';

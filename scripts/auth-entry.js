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

   Build: node scripts/build-auth.cjs  ->  js/admin/auth.js (a classic script).
   ===================================================================== */
import { createAuthKitSession } from '@deadark/ark-ui/flux-auth';
import { createArkAuthKitPanel } from '@deadark/ark-ui/flux-auth-ui';
import { createFluxRootHandle, FLUX_ROOT_DERIVATION } from 'flux-auth/root-from-mnemonic';
import { createRootIdentitySigningHandle } from 'deadark-identity-core/root-signing-handle';

const toBase64 = (bytes) => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

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
  let active = null;   // { handle, identity }
  let pending = null;  // the handle the verifier just derived, not yet admitted

  function drop() {
    if (active) active.handle.dispose();
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
      if (active) active.handle.dispose();
      const handle = pending;
      pending = null;
      const identity = Object.freeze({
        publicKeyB64: handle.publicKeyB64,
        displayName: opened.summary?.displayName || '',
        identityId: opened.summary?.identityId || '',
        walletAddress: opened.summary?.walletAddress || '',
        securityProfile: opened.summary?.securityProfile || '',
        rootVerified: true,
        sign: async (text) => toBase64(handle.sign(new TextEncoder().encode(text))),
      });
      active = { handle, identity };
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

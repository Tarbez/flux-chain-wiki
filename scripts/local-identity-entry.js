/* =====================================================================
   LOCAL IDENTITY SESSION POINTER (bundle entry)
   ---------------------------------------------------------------------
   The public "who was last signed in" pointer defxn's header, account page,
   CMS session and admin gate all read. Was a hand-written IIFE
   (js/ark/local-identity.js) duplicating the same pattern
   chat.deadark.com's localIdentitySession.ts and flux-db-studio's own copy
   each independently implemented — a real "Centralize, don't duplicate"
   violation. Now built from the one canonical module.

   Public API is UNCHANGED on purpose (window.ArkUI.localIdentity.{current,
   parse, storageError, subscribe, set, clear, refresh}) so every existing
   caller (header.js, account.js, account-domains.js, cms-session.js, gate.js)
   needed zero changes.

   Known, accepted one-time effect: the storage key changes (from the old
   hand-written `defxn-local-identity-v1` to the canonical module's
   `ark-local-identity.defxn.v1`), so a visitor who already has a remembered
   identity in their browser sees the blank gate once on their next visit,
   same as a storage clear — not a security change (the pointer was never a
   secret either way), just a one-time loss of the "remembered" convenience.

   Build: node scripts/build-ark-vendor.cjs  ->  js/ark/local-identity.js (a classic script).
   ===================================================================== */
import { createLocalIdentitySession } from '@deadark/ark-ui/flux-auth-session';

const session = createLocalIdentitySession({ scope: 'defxn' });

// Same defensive pattern the old hand-written file used: in a real browser
// `window` IS the global object, so `window.ArkUI` and a bare `ArkUI` are
// the same binding — but this file can also load before anything else has
// assigned `window.ArkUI` (or, in a test sandbox, into a context where
// `window` and the top-level scope are deliberately separate objects), so
// fall back to an existing top-level `ArkUI` if `window.ArkUI` isn't set yet.
/* eslint-disable no-undef */
window.ArkUI = window.ArkUI || (typeof ArkUI !== 'undefined' ? ArkUI : {});
/* eslint-enable no-undef */
window.ArkUI.localIdentity = {
  current: session.current,
  parse: session.parse,
  storageError: session.storageError,
  subscribe: session.subscribe,
  // Old behavior: an identity with no explicit identityId falls back to its
  // publicKeyB64 as the id, rather than throwing — preserved here so callers
  // that never supplied identityId (if any) keep working identically.
  set(identity) {
    const identityId = identity.identityId || identity.publicKeyB64;
    session.set({ ...identity, identityId });
  },
  clear: session.clear,
  refresh: session.refresh,
};

/* The visitor's sign-in session: the FXN ID panel (js/admin/auth.js, ark-ui's Auth Kit panel) and the signer it opens.
   ONE session for every page that signs in. /account and /auth both call ArkUI.openAccountSession(); the first call
   makes it, later calls return the same one. It outlives any one mount: the signer is a shared singleton, so a route
   change alone must not dispose it. Moved here from js/pages/account.js (2026-10-25) when /auth was split out of
   /account, so the two pages never hold two panels or two signers.
     container    the panel's element; a page moves it into its own layout
     isUnlocked() the saved identity is the one the open signer holds
     current()    the open signer's identity, or null
     signOut()    closes the signer and forgets the saved details
     error()      the panel's last refusal, { code, message, detail } or null (codes: ark-ui flux-auth AuthKitError)
     keptRefused() true when a kept sign-in was found on load but could not be reopened
     fileInfo()   the loaded file's public header: { version, needsSecretKey, hasGate }, or null */
ArkUI.openAccountSession = function () {
  if (ArkUI.accountSession) return ArkUI.accountSession;
  var container = document.createElement('div');
  var preservingIdentity = false;
  var auth = ArkAdminAuth.create({ container: container, product: 'DEFXN', onChange: function (next) {
    if (!preservingIdentity) {
      if (next) {
        ArkUI.localIdentity.set(next);
        if (ArkUI.cmsSession) ArkUI.cmsSession.connect(next).then(function () { ArkUI.localIdentity.refresh(); });
        // Unlocking proves the key locally; this is the step that
        // authenticates the identity to the mesh fleet itself --
        // publishing it to the directory (skipped if already
        // published) shows the real scoped-claim authorization
        // modal before anything is signed. Fire-and-forget: a
        // cancelled or failed publish must not block sign-in.
        if (window.ArkUI.meshDirectory) {
          window.ArkUI.meshDirectory.ensurePublished(next).then(function () {
            ArkUI.accountSession.meshAuthMessage = '';
            ArkUI.localIdentity.refresh();
          }).catch(function (error) {
            ArkUI.accountSession.meshAuthMessage = (error && error.message) || 'Could not authenticate this identity to the mesh.';
            ArkUI.localIdentity.refresh();
          });
        }
      }
      else { ArkUI.localIdentity.clear(); if (ArkUI.cmsSession) ArkUI.cmsSession.revoke(); }
    }
    ArkUI.localIdentity.refresh();
  } });
  function isUnlocked() {
    var pointer = ArkUI.localIdentity.current();
    var signer = auth.current();
    return !!(pointer && signer && pointer.identityId === (signer.identityId || signer.publicKeyB64) && pointer.publicKeyB64 === signer.publicKeyB64);
  }
  function lock() {
    preservingIdentity = true;
    try { auth.signOut(); } finally { preservingIdentity = false; }
  }
  ArkUI.accountSession = { container: container, isUnlocked: isUnlocked,
    signOut: function () { auth.signOut(); }, current: function () { return auth.current(); },
    /* the panel's last refusal ({ code, message, detail }, or null), and whether a kept sign-in could not be reopened */
    error: function () { return auth.error ? auth.error() : null; }, keptRefused: function () { return !!(auth.keptRefused && auth.keptRefused()); },
    fileInfo: function () { return auth.fileInfo ? auth.fileInfo() : null; } };
  ArkUI.localIdentity.subscribe(function () {
    if (auth.current() && !isUnlocked()) lock();
    if (ArkUI.refreshAccountNav) ArkUI.refreshAccountNav();
  });
  window.addEventListener('pagehide', function () {
    preservingIdentity = true;
    try { auth.dispose(); } finally { preservingIdentity = false; }
    // Disposing a root handle is not signing out of the remembered account.
    ArkUI.localIdentity.refresh();
  });
  return ArkUI.accountSession;
};

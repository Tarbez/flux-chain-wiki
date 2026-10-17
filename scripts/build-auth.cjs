// Bundle the shared Auth Kit sign-in into a classic script for admin.html.
// Every import is a shared, canonical module; this build only resolves where they live.
const { execFileSync } = require('node:child_process');
const designRoot = process.env.ARK_DESIGN_ROOT || '/Volumes/PortableSSD/design';
const fluxRoot = process.env.ARK_FLUX_ROOT || '/Volumes/PortableSSD/flux';
execFileSync(designRoot + '/deadark-sdk/node_modules/.bin/esbuild', [
  'scripts/auth-entry.js', '--bundle', '--format=iife', '--global-name=ArkAdminAuth', '--minify', '--legal-comments=none',
  '--alias:@deadark/ark-ui/flux-auth=' + designRoot + '/ark-ui/dist/ark-ui.flux-auth.js',
  '--alias:@deadark/ark-ui/flux-auth-ui=' + designRoot + '/ark-ui/dist/ark-ui.flux-auth-ui.js',
  '--alias:flux-auth/root-from-mnemonic=' + fluxRoot + '/flux-auth/src/rootFromMnemonic.mjs',
  '--alias:flux-auth/wallet-signing-handle=' + fluxRoot + '/flux-auth/src/walletSigningHandle.mjs',
  '--alias:flux-auth/wallet-lifecycle=' + fluxRoot + '/flux-auth/src/walletLifecycle.mjs',
  '--alias:flux-auth/wallet-delegation=' + fluxRoot + '/flux-auth/src/walletDelegation.mjs',
  '--alias:flux-auth/wallet-registry=' + fluxRoot + '/flux-auth/src/walletRegistry.mjs',
  '--alias:flux-auth/claim-scope-resolver=' + fluxRoot + '/flux-auth/src/claimScopeResolver.mjs',
  '--alias:flux-auth-client/wallet-mesh=' + fluxRoot + '/flux-auth-client/src/wallet-mesh.mjs',
  '--alias:deadark-identity-core/root-signing-handle=' + fluxRoot + '/deadark-identity-core/dist/identity/root-signing-handle.js',
  '--outfile=js/admin/auth.js',
], { stdio: 'inherit' });
execFileSync(designRoot + '/deadark-sdk/node_modules/.bin/esbuild', [
  'scripts/authorization-view-entry.js', '--bundle', '--format=iife', '--global-name=ArkAuthorizationView', '--minify', '--legal-comments=none',
  '--alias:@deadark/ark-ui/flux-authorization-view=' + designRoot + '/ark-ui/dist/ark-ui.flux-authorization-view.js',
  '--outfile=js/admin/authorization-view.js',
], { stdio: 'inherit' });
// The real <flux-authorization-dialog> custom element (same package the DAO
// app uses via @deadark/ark-ui/elements) -- a behavior/ARIA primitive, no
// visual template of its own; admin.js supplies the light-DOM content.
execFileSync(designRoot + '/deadark-sdk/node_modules/.bin/esbuild', [
  'scripts/elements-entry.js', '--bundle', '--format=iife', '--global-name=ArkFluxElements', '--minify', '--legal-comments=none',
  '--alias:@deadark/ark-ui/elements=' + designRoot + '/ark-ui/dist/ark-ui.elements.js',
  '--alias:@deadark/ark-elements/base=' + designRoot + '/ark-elements/src/base.js',
  '--alias:@deadark/ark-elements/elements=' + designRoot + '/ark-elements/src/elements.js',
  '--alias:@deadark/ark-a11y/element-style=' + designRoot + '/ark-a11y/src/element-style.js',
  '--outfile=js/admin/vendor/flux-elements.js',
], { stdio: 'inherit' });
// The public "who was last signed in" pointer (js/ark/local-identity.js) --
// now built from the one canonical session module instead of its own
// hand-written copy. Public window.ArkUI.localIdentity API is unchanged;
// see scripts/local-identity-entry.js's own header for what did change.
execFileSync(designRoot + '/deadark-sdk/node_modules/.bin/esbuild', [
  'scripts/local-identity-entry.js', '--bundle', '--format=iife', '--global-name=ArkLocalIdentityBuild', '--minify', '--legal-comments=none',
  '--alias:@deadark/ark-ui/flux-auth-session=' + designRoot + '/ark-ui/dist/ark-ui.flux-auth-session.js',
  '--outfile=js/ark/local-identity.js',
], { stdio: 'inherit' });
// Every other site that carries this Auth Kit bundle gets the one just built. They used to be
// hand copies (genesis/README: "no automated sync wired up yet"), and genesis, defxn-dao and
// treasury all froze on an Oct 12 build whose reader accepted only `version: 1` -- every v9
// kit failed there with "not a valid Auth Kit JSON or FLX envelope" (2026-10-16) while
// defxn.com, rebuilt, read the same file fine. The consumer list is derived, not written
// down: any sibling site with a js/admin/auth.js that is this bundle (`var ArkAdminAuth=`).
{
  const fs = require('node:fs');
  const path = require('node:path');
  const built = fs.readFileSync('js/admin/auth.js');
  const self = path.resolve('.');
  for (const site of fs.readdirSync(fluxRoot)) {
    // A static site carries it at js/admin/auth.js; ARK Browser in its renderer's vendor dir.
    for (const rel of ['js/admin/auth.js', 'src/renderer/vendor/ark-admin-auth.js']) {
      const target = path.join(fluxRoot, site, rel);
      if (path.join(fluxRoot, site) === self || !fs.existsSync(target)) continue;
      if (!fs.readFileSync(target, 'utf8').startsWith('var ArkAdminAuth=')) continue;
      if (Buffer.compare(fs.readFileSync(target), built) === 0) continue;
      fs.writeFileSync(target, built);
      console.log('[build-auth] refreshed ' + path.relative(fluxRoot, target));
    }
  }
}

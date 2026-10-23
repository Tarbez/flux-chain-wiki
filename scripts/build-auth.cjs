// Bundle the shared Auth Kit sign-in into a classic script for admin.html (js/admin/auth.js),
// then hand the fresh bundle to every sibling site that carries it.
//
// Ark UI parts (@deadark/ark-ui/flux-auth, -flux-auth-ui) resolve from node_modules/@deadark/*,
// the packages `npm run sync:ark` delivers; nothing here names a hub path. The fxn-auth,
// fxn-auth-client and deadark-identity-core parts are NOT Ark UI packages and are not delivered
// by sync-consumer yet, so they still come from the sibling repos' sources in this site's own
// parent directory (flux/), found relative to the site -- ARK_FLUX_ROOT overrides it.
// The other bundles this script used to build (flux-elements, authorization-view,
// local-identity) moved to scripts/build-ark-vendor.cjs on 2026-10-19.
//
// Paths are relative to the site directory (the working directory): tests/auth-bundle.cjs runs a
// copy of this file from a temp directory with --outfile redirected, so __dirname is not the site.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const site = process.cwd();
if (!fs.existsSync(path.join(site, 'scripts', 'auth-entry.js'))) throw new Error('run build-auth.cjs from the site directory (scripts/auth-entry.js not found in ' + site + ')');
const fluxRoot = process.env.ARK_FLUX_ROOT || path.resolve(site, '..');
const esbuild = path.join(site, 'node_modules', '.bin', 'esbuild');
execFileSync(esbuild, [
  'scripts/auth-entry.js', '--bundle', '--format=iife', '--global-name=ArkAdminAuth', '--minify', '--legal-comments=none',
  '--alias:fxn-auth/root-from-mnemonic=' + fluxRoot + '/fxn-auth/src/rootFromMnemonic.mjs',
  '--alias:fxn-auth/wallet-signing-handle=' + fluxRoot + '/fxn-auth/src/walletSigningHandle.mjs',
  '--alias:fxn-auth/wallet-lifecycle=' + fluxRoot + '/fxn-auth/src/walletLifecycle.mjs',
  '--alias:fxn-auth/wallet-delegation=' + fluxRoot + '/fxn-auth/src/walletDelegation.mjs',
  '--alias:fxn-auth/wallet-registry=' + fluxRoot + '/fxn-auth/src/walletRegistry.mjs',
  '--alias:fxn-auth/claim-scope-resolver=' + fluxRoot + '/fxn-auth/src/claimScopeResolver.mjs',
  '--alias:fxn-auth-client/wallet-mesh=' + fluxRoot + '/fxn-auth-client/src/wallet-mesh.mjs',
  '--alias:deadark-identity-core/root-signing-handle=' + fluxRoot + '/deadark-identity-core/dist/identity/root-signing-handle.js',
  '--outfile=js/admin/auth.js',
], { stdio: 'inherit' });
// Every other site that carries this Auth Kit bundle gets the one just built. They used to be
// hand copies (genesis/README: "no automated sync wired up yet"), and genesis, defxn-dao and
// treasury all froze on an Oct 12 build whose reader accepted only `version: 1` -- every v9
// kit failed there with "not a valid Auth Kit JSON or FLX envelope" (2026-10-16) while
// defxn.com, rebuilt, read the same file fine. The consumer list is derived, not written
// down: any sibling site with a js/admin/auth.js that is this bundle (`var ArkAdminAuth=`).
{
  const built = fs.readFileSync('js/admin/auth.js');
  for (const sibling of fs.readdirSync(fluxRoot)) {
    // A static site carries it at js/admin/auth.js; ARK Browser in its renderer's vendor dir.
    for (const rel of ['js/admin/auth.js', 'src/renderer/vendor/ark-admin-auth.js']) {
      const target = path.join(fluxRoot, sibling, rel);
      if (path.join(fluxRoot, sibling) === site || !fs.existsSync(target)) continue;
      if (!fs.readFileSync(target, 'utf8').startsWith('var ArkAdminAuth=')) continue;
      if (Buffer.compare(fs.readFileSync(target), built) === 0) continue;
      fs.writeFileSync(target, built);
      console.log('[build-auth] refreshed ' + path.relative(fluxRoot, target));
    }
  }
}

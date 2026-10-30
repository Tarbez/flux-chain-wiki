// Bundle the shared Auth Kit sign-in into a classic script for admin.html (js/admin/auth.js).
// It writes into THIS repo only. Other sites that carry the bundle are listed when stale, never written.
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
  '--alias:fxn-auth/public-ids=' + fluxRoot + '/fxn-auth/src/publicIds.mjs',
  '--alias:fxn-auth/sealed-key=' + fluxRoot + '/fxn-auth/src/sealedKey.mjs',
  '--alias:fxn-auth/root-keys=' + fluxRoot + '/fxn-auth/src/rootKeys.mjs',
  '--alias:fxn-auth/wallet-delegation=' + fluxRoot + '/fxn-auth/src/walletDelegation.mjs',
  '--alias:fxn-auth/wallet-registry=' + fluxRoot + '/fxn-auth/src/walletRegistry.mjs',
  '--alias:fxn-auth/claim-scope-resolver=' + fluxRoot + '/fxn-auth/src/claimScopeResolver.mjs',
  '--alias:fxn-auth/auth-kit-create=' + fluxRoot + '/fxn-auth/src/authKitCreate.mjs',
  '--alias:fxn-auth/fxn-id-gate=' + fluxRoot + '/fxn-auth/src/fxnIdGate.mjs',
  // one ark-ui in the bundle: fxn-auth's own modules import it too, and its node_modules links the source tree, not
  // this site's delivered package, so both resolve to the copy the entry uses
  '--alias:@deadark/ark-ui/flux-auth=' + path.join(site, 'node_modules/@deadark/ark-ui/dist/ark-ui.flux-auth.js'),
  '--alias:fxn-auth-client/wallet-mesh=' + fluxRoot + '/fxn-auth-client/src/wallet-mesh.mjs',
  '--alias:deadark-identity-core/root-signing-handle=' + fluxRoot + '/deadark-identity-core/dist/identity/root-signing-handle.js',
  '--outfile=js/admin/auth.js',
], { stdio: 'inherit' });
// Other sites that carry this Auth Kit bundle are LISTED when their copy differs, never written.
// Until 2026-10-23 this step wrote the fresh bundle into every sibling site under flux/. Run from
// a worktree, flux/ is the parent, so it wrote into other repos' MAIN folders, where other sessions
// keep unsaved work: the same kind of write that destroyed work in nine main trees on 2026-10-22.
// The owner ruled (2026-10-23) that this script writes only into its own repo. Each consumer takes
// a new bundle in a change of its own. Why the list still matters: genesis, defxn-dao and treasury
// once froze on an Oct 12 build whose reader accepted only `version: 1`, and every v9 kit failed
// there (2026-10-16). The consumer list is derived, not written down: any sibling site whose
// js/admin/auth.js (or ARK Browser's renderer vendor copy) is this bundle (`var ArkAdminAuth=`).
{
  const built = fs.readFileSync('js/admin/auth.js');
  for (const sibling of fs.readdirSync(fluxRoot)) {
    for (const rel of ['js/admin/auth.js', 'src/renderer/vendor/ark-admin-auth.js']) {
      const target = path.join(fluxRoot, sibling, rel);
      if (path.join(fluxRoot, sibling) === site || !fs.existsSync(target)) continue;
      if (!fs.readFileSync(target, 'utf8').startsWith('var ArkAdminAuth=')) continue;
      if (Buffer.compare(fs.readFileSync(target), built) === 0) continue;
      console.log('[build-auth] differs, not written: ' + path.relative(fluxRoot, target) + '. Remedy: take the new bundle in that repo, in a change of its own.');
    }
  }
}

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
  '--alias:deadark-identity-core/root-signing-handle=' + fluxRoot + '/deadark-identity-core/dist/identity/root-signing-handle.js',
  '--outfile=js/admin/auth.js',
], { stdio: 'inherit' });
execFileSync(designRoot + '/deadark-sdk/node_modules/.bin/esbuild', [
  'scripts/authorization-view-entry.js', '--bundle', '--format=iife', '--global-name=ArkAuthorizationView', '--minify', '--legal-comments=none',
  '--alias:@deadark/ark-ui/flux-authorization-view=' + designRoot + '/ark-ui/dist/ark-ui.flux-authorization-view.js',
  '--outfile=js/admin/authorization-view.js',
], { stdio: 'inherit' });

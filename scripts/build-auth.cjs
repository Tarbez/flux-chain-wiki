// Bundle the shared Auth Kit sign-in into a classic script for admin.html (no other repository is modified).
// Every import is a shared, canonical module; this build only resolves where they live.
const { execFileSync } = require('node:child_process');
const root = process.env.ARK_SHARED_ROOT || '/Volumes/PortableSSD/shared';
const identityCore = process.env.DEADARK_IDENTITY_CORE || '/Volumes/PortableSSD/deadark-identity-core';
execFileSync(root + '/deadark-sdk/node_modules/.bin/esbuild', [
  'scripts/auth-entry.js', '--bundle', '--format=iife', '--global-name=ArkAdminAuth', '--minify', '--legal-comments=none',
  '--alias:@deadark/ark-ui/flux-auth=' + root + '/ark-ui/dist/ark-ui.flux-auth.js',
  '--alias:@deadark/ark-ui/flux-auth-ui=' + root + '/ark-ui/dist/ark-ui.flux-auth-ui.js',
  '--alias:flux-auth/root-from-mnemonic=' + root + '/flux-auth/src/rootFromMnemonic.mjs',
  '--alias:deadark-identity-core/root-signing-handle=' + identityCore + '/dist/identity/root-signing-handle.js',
  '--outfile=js/admin/auth.js',
], { stdio: 'inherit' });

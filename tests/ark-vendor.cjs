// Ark UI reaches this site through one sanctioned path (README "Ark UI delivery"): deadark-theme
// sync-consumer -> pinned, sha256-recorded .vendor/ tarballs -> node_modules/@deadark/* ->
// scripts/build-ark-vendor.cjs. Each case names the failure it exists to catch.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// 1. Every generated Ark output is exactly what the synced packages build. A stale bundle keeps
//    running old Ark code while every source file looks current; --check rebuilds in memory,
//    proves node_modules holds the pinned tarballs, and compares bytes.
const check = spawnSync(process.execPath, ['scripts/build-ark-vendor.cjs', '--check'], { encoding: 'utf8' });
assert.equal(check.status, 0, 'build-ark-vendor --check failed (run npm run sync:ark, then npm run build:ark):\n' + check.stdout + check.stderr);
for (const out of ['css/themes.css', 'scripts/theme-options.js', 'js/ark/vendor/engines.js', 'js/ark/vendor/backgrounds.js', 'js/settings/panel.js',
  'js/admin/vendor/flux-elements.js', 'js/admin/authorization-view.js', 'js/ark/local-identity.js', 'js/ark/vendor/ark-kit.js', 'css/ark-blocks.css']) {
  assert(check.stdout.includes('ok ' + out), out + ' is not covered by build-ark-vendor --check');
}
// css/ark-blocks.css is Ark's static block stylesheet (@deadark/ark-ui >= 0.2.0), copied byte for
// byte: server-rendered blocks are styled by it alone, so a hand-edited or stale copy would style
// SSR pages differently from the package the client bundle came from.
assert.deepEqual(fs.readFileSync('css/ark-blocks.css'), fs.readFileSync('node_modules/@deadark/ark-ui/dist/ark-ui.blocks.css'), 'css/ark-blocks.css is exactly the synced package stylesheet');

// 2. Ark UI is pinned, not borrowed. Until 2026-10-19 defxn depended on no @deadark package and
//    its bundles imported /Volumes/PortableSSD/design/... directly, so two consumers could build
//    from different Ark sources with nothing recording which.
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const name of ['@deadark/ark-ui', '@deadark/sdk']) {
  const spec = pkg.dependencies[name];
  assert(/^file:\.vendor\/[\w.-]+\.tgz$/.test(spec || ''), name + ' is pinned to a .vendor tarball (got ' + spec + ')');
  const slug = name.replace(/^@/, '').replace(/\//g, '-');
  const manifest = JSON.parse(fs.readFileSync(path.join('.vendor', slug + '-manifest.json'), 'utf8'));
  assert.equal(manifest.tarball, spec.slice('file:'.length), name + ': the .vendor manifest records the pinned tarball');
  assert(/^[0-9a-f]{64}$/.test(manifest.sha256), name + ': the .vendor manifest records a sha256');
}

// 3. The ad-hoc bundlers stay gone. They read the hub's shared/ directory (empty since the
//    2026-09-23 domain move) or absolute design/ paths; reviving one reintroduces a second,
//    unpinned way for Ark code to arrive.
for (const gone of ['scripts/sync-ark.cjs', 'scripts/sync-ark-backgrounds.cjs', 'scripts/build-settings.cjs']) {
  assert(!fs.existsSync(gone), gone + ' was replaced by scripts/build-ark-vendor.cjs');
}

// 4. No absolute workspace path in the site's own source, scripts, styles or pages. A /Volumes
//    path builds on exactly one machine and silently reads whatever is at that path today; that
//    is how the settings bundle came to depend on an unpinned design/ checkout. tests/ and docs/
//    are not shipped and are out of this rule (some tests still import flux-auth sources that
//    sync-consumer does not deliver yet).
const SKIP = new Set(['node_modules', '.vendor', '.git', '.vercel', 'tests', 'docs']);
const TEXT = /\.(m?js|cjs|ts|css|html|json|md|txt|command|sh)$/;
const offenders = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(file); continue; }
    if (!TEXT.test(entry.name) || dir === '.' && entry.name === 'README.md') continue;
    const text = fs.readFileSync(file, 'utf8');
    if (text.includes('/Volumes/')) offenders.push(file + ': absolute /Volumes path');
    if (/(?:from\s*|require\(\s*|import\(\s*)['"](?:\.\.\/)+(?:design|shared)\//.test(text)) offenders.push(file + ': imports a hub package by relative path');
  }
})('.');
assert.deepEqual(offenders, [], 'site files must reach Ark UI through node_modules/@deadark/*:\n  ' + offenders.join('\n  '));

// 5. ArkKit reuses the page's one style registry (ArkEngines) like the settings panel does: a
//    second bundled registry hands out colliding dynamic ids, and popover visibility rules then
//    hide unrelated page text (the regression tests/style-isolation.cjs pins for the panel).
const kit = fs.readFileSync('js/ark/vendor/ark-kit.js', 'utf8');
assert(kit.includes('ArkEngines.setArkElementStyle') && !kit.includes('data-ark-dynamic-style'), 'ark-kit.js bundles no second style registry');
assert(/@deadark\/ark-ui@[\d.]+\s+\.vendor\/deadark-ark-ui-[\d.]+\.tgz\s+sha256 [0-9a-f]{64}/.test(kit), 'ark-kit.js names the exact tarballs it was built from');
// 6. ArkKit carries the block registry (Wave 1): the Wave 2 adapter derives every CMS block from
//    ArkKit.ARK_BLOCKS, so losing the export would silently empty the Library.
const vm = require('node:vm');
// ArkKit binds to the page's one style registry (ArkEngines) at load; a stub stands in for it.
const noop = () => {};
const sandbox = { window: {}, document: undefined, ArkEngines: { setArkElementStyle: noop, getArkElementStyle: noop, setArkElementStyles: noop, setArkElementHidden: noop } };
sandbox.globalThis = sandbox;
vm.runInNewContext(kit + '\n;globalThis.__kit = ArkKit;', sandbox);
for (const name of ['ARK_BLOCKS', 'ARK_BLOCK_NAMES', 'renderArkBlock', 'renderArkBlocks', 'validateArkBlock', 'describeArkBlocks', 'ArkBlockPropError']) {
  assert(name in sandbox.__kit, 'ArkKit exports ' + name);
}
assert(sandbox.__kit.ARK_BLOCK_NAMES.includes('hero') && sandbox.__kit.ARK_BLOCK_NAMES.includes('stat'), 'ArkKit.ARK_BLOCKS holds the Ark blocks');

console.log('ark vendor ok: outputs match the synced packages; Ark UI is pinned with sha256; no hub paths in site files');

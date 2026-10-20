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
  'js/admin/vendor/flux-elements.js', 'js/admin/authorization-view.js', 'js/ark/local-identity.js', 'js/ark/vendor/ark-kit.js', 'css/ark-blocks.css',
  'js/admin/vendor/cms-blocks.js', 'js/ark/vendor/ark-kit-public.js', 'js/ark/vendor/ark-kit-forms.js', 'js/ark/vendor/ark-kit-popover.js', 'js/ark/vendor/ark-kit-live.js', 'js/ark/blocks.js']) {
  assert(check.stdout.includes('ok ' + out), out + ' is not covered by build-ark-vendor --check');
}
// css/ark-blocks.css is Ark's static block stylesheet (@deadark/ark-ui >= 0.2.0): server-rendered
// blocks are styled by it alone, so a hand-edited or stale copy would style the public site and
// the crawler's HTML differently from Ark. It is the synced file, minified by the one transform
// build-ark-vendor applies (esbuild's CSS minifier, since W3-BUDGET: 7.5 -> 7.2 KB gz on every
// route): the test applies the same transform to the package file and compares bytes.
const { minifyBlocksCss } = require('../scripts/build-ark-vendor.cjs');
const arkUiVersion = JSON.parse(fs.readFileSync('node_modules/@deadark/ark-ui/package.json', 'utf8')).version;
assert.equal(fs.readFileSync('css/ark-blocks.css', 'utf8'), minifyBlocksCss(fs.readFileSync('node_modules/@deadark/ark-ui/dist/ark-ui.blocks.css', 'utf8'), arkUiVersion), 'css/ark-blocks.css is exactly the synced package stylesheet, minified');
assert(fs.readFileSync('css/ark-blocks.css', 'utf8').includes('.ark-hero__title'), 'the minified sheet still carries the block part classes');

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
assert.equal(sandbox.__kit.PUBLIC_KIT, false, 'the full kit says which build it is');
assert.equal(typeof sandbox.__kit.patchArkBlock, 'function', 'the full kit carries the morph');
// 7. The public kit (W3-BUDGET): the morph is its own chunk, loaded by js/ark/blocks.js on a page's
//    first live update, so a block route with no live block never pays for it; the kit's own
//    patchArkBlock is a refusal that names the chunk, and the editor help is stripped from the
//    prop schemas while the validation shape (kind, required, maxLength, labels) stays.
const publicKit = fs.readFileSync('js/ark/vendor/ark-kit-public.js', 'utf8');
const pub = { window: {}, document: undefined, ArkEngines: sandbox.ArkEngines };
pub.globalThis = pub;
vm.runInNewContext(publicKit + '\n;globalThis.__kit = ArkKit;', pub);
assert.equal(pub.__kit.PUBLIC_KIT, true, 'the public kit says which build it is');
assert.throws(() => pub.__kit.patchArkBlock(), /patchArkBlock refused.*Needs: the live chunk js\/ark\/vendor\/ark-kit-live\.js.*Remedy/, 'the public kit refuses patchArkBlock naming the live chunk');
assert(!/cannot become a/.test(publicKit), 'the morph is not in the public kit');
assert.equal(pub.__kit.ARK_BLOCKS.stat.props.unit.help, undefined, 'editor help is stripped from the public kit');
assert.equal(pub.__kit.ARK_BLOCKS.stat.description, undefined, 'block descriptions are stripped from the public kit');
assert.equal(pub.__kit.ARK_BLOCKS.stat.props.unit.maxLength, 16, 'the validation shape stays');
assert.equal(pub.__kit.ARK_BLOCKS.stat.props.label.label, 'Label', 'prop labels (a refusal\'s words) stay');
assert.equal(pub.__kit.ARK_BLOCKS.card.props.description.kind, 'text', 'a prop NAMED description is untouched');
assert.equal(sandbox.__kit.ARK_BLOCKS.stat.props.unit.help, 'e.g. ms, ops/s, %', 'the full kit keeps the help');
const live = fs.readFileSync('js/ark/vendor/ark-kit-live.js', 'utf8');
pub.ArkKit = pub.__kit;
vm.runInNewContext(live + '\n;globalThis.__live = ArkKitLive;', pub);
assert.equal(typeof pub.__live.patchArkBlock, 'function', 'the live chunk carries patchArkBlock');
assert(/cannot become a/.test(live) && !/ARK_BLOCK_NAMES/.test(live), 'the live chunk carries the morph and no copy of the registry');

// 8. The optional blocks are chunks (W4-ARK, 2026-10-20): field, form, list, status-line and choice (ark-kit-forms.js) and popover
//    (ark-kit-popover.js, its own file since 0.2.10: a page that floats one panel does not download the forms) cost +3.8 KB gz in
//    the public kit and every block route pays for the kit, so the public kit's registry is ark-ui's CORE (21 blocks) and each
//    chunk registers its blocks into it. The editor's full kit has all 27.
const FORM_BLOCKS = ['field', 'form', 'list', 'status-line', 'choice'];
const POPOVER_BLOCKS = ['popover'];
assert.equal(pub.__kit.ARK_BLOCK_NAMES.length, 21, 'the public kit holds the 21 core blocks');
for (const name of FORM_BLOCKS.concat(POPOVER_BLOCKS)) {
  assert(!pub.__kit.ARK_BLOCK_NAMES.includes(name), 'the public kit does not carry ' + name);
  assert(sandbox.__kit.ARK_BLOCK_NAMES.includes(name), 'the full kit carries ' + name);
}
assert.equal(sandbox.__kit.ARK_BLOCK_NAMES.length, 27, 'the editor\'s kit holds all 27 blocks');
assert.equal(typeof pub.__kit.registerArkBlocks, 'function', 'the public kit can take late blocks');
const forms = fs.readFileSync('js/ark/vendor/ark-kit-forms.js', 'utf8');
const popover = fs.readFileSync('js/ark/vendor/ark-kit-popover.js', 'utf8');
for (const [source, entry] of [[forms, 'blocks/forms'], [popover, 'blocks/popover']]) {
  assert(source.slice(0, 300).includes(entry) && !/ARK_BLOCK_NAMES/.test(source), entry + ' is its ark-ui entry alone: it carries no copy of the registry');
}
assert(!/ark-popover__panel|popover-trigger/.test(forms), 'the forms chunk carries no popover (it is its own file)');
assert(!/field-control|ark-form__fields/.test(popover), 'the popover chunk carries no form blocks');
for (const [source, global] of [[forms, 'ArkKitForms'], [popover, 'ArkKitPopover']]) {
  assert.throws(() => vm.runInNewContext(source, { window: {}, document: undefined }), new RegExp(global + ' refused: no Ark kit is loaded.*Needs: js\\/ark\\/vendor\\/ark-kit-public\\.js before'), 'the chunk without a kit is refused, naming the kit');
}
const pubWithChunks = { window: {}, document: undefined, ArkEngines: sandbox.ArkEngines };
pubWithChunks.globalThis = pubWithChunks;
vm.runInNewContext(publicKit + '\n;globalThis.ArkKit = ArkKit;', pubWithChunks);
vm.runInNewContext(popover + '\n;globalThis.__popover = ArkKitPopover;', pubWithChunks);
assert.deepEqual(Array.from(pubWithChunks.__popover.POPOVER_BLOCK_NAMES), POPOVER_BLOCKS, 'the popover chunk registers the popover alone');
assert.equal(pubWithChunks.ArkKit.ARK_BLOCK_NAMES.length, 22, 'and nothing else');
vm.runInNewContext(forms + '\n;globalThis.__forms = ArkKitForms;', pubWithChunks);
assert.deepEqual(Array.from(pubWithChunks.__forms.FORM_BLOCK_NAMES), FORM_BLOCKS, 'the forms chunk registers the five');
assert.equal(pubWithChunks.ArkKit.ARK_BLOCK_NAMES.length, 27, 'the public kit now holds 27');
assert.equal(pubWithChunks.ArkKit.ARK_BLOCKS.field.props.hint.help, undefined, 'the chunks\' editor help is stripped like the kit\'s');
assert.equal(pubWithChunks.ArkKit.ARK_BLOCKS.form.props.fields.kind, 'list', 'and the validation shape stays');
// A second load (a route that lists a chunk and a loader that adds it again) is harmless.
vm.runInNewContext(forms, pubWithChunks);
vm.runInNewContext(popover, pubWithChunks);
assert.equal(pubWithChunks.ArkKit.ARK_BLOCK_NAMES.length, 27, 'loading a chunk twice registers nothing twice');
// 9. arkConfirm (the CMS's window.confirm replacement) is the editor's: the full kit has it, the public kit refuses it.
for (const name of ['arkConfirm', 'createArkAlertDialog', 'createArkModalHost']) {
  assert.equal(typeof sandbox.__kit[name], 'function', 'the full kit exports ' + name);
  assert.throws(() => pub.__kit[name](), new RegExp('ArkKit\\.' + name + ' refused.*Needs: the full kit'), 'the public kit refuses ' + name + ', naming the full kit');
}
assert.throws(() => pub.__kit.createArkDomHost().createFocusScope('s', { containerRef: 'R-x' }), /not in the core light-DOM host.*Needs: the overlay host/, 'the public kit\'s host is the core host (no overlays)');

console.log('ark vendor ok: outputs match the synced packages; Ark UI is pinned with sha256; no hub paths in site files');

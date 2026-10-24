#!/usr/bin/env node
/* =====================================================================
   ARK VENDOR BUILD -- the one way Ark UI code gets into this site.
   ---------------------------------------------------------------------
     npm run sync:ark                      deadark-theme sync-consumer: packs the
                                           Ark UI closure + SDK into .vendor/*.tgz
                                           (sha256-recorded), pins them in
                                           package.json, installs node_modules/@deadark/*
     node scripts/build-ark-vendor.cjs     builds every output below from
                                           node_modules/@deadark/* only
     node scripts/build-ark-vendor.cjs --check
                                           builds in memory, writes nothing, exits 1
                                           on any drift (tests/ark-vendor.cjs runs it)

   Outputs (the TARGETS table below is the whole list):
     css/themes.css, scripts/theme-options.js   the SDK CLI (`deadark-theme css` / `themes`)
     js/ark/vendor/engines.js                   FluxMemoryStore, FluxAnimate, element-style
     js/ark/vendor/backgrounds.js               the 7 ark-ui background generators
     js/settings/panel.js                       the settings popover (scripts/settings-entry.js)
     js/admin/vendor/flux-elements.js           <flux-authorization-dialog> (elements-entry.js)
     js/admin/authorization-view.js             scoped authorization view
     js/ark/local-identity.js                   the local identity session pointer
     js/ark/vendor/ark-kit.js                   ArkKit: the primitives/blocks the site uses
                                                (scripts/ark-kit-entry.js), provenance header,
                                                with the createArkUI runtime (the editor)
     js/ark/vendor/ark-kit-forms.js             the form blocks, registered into the public kit's registry
                                                (scripts/ark-kit-forms-entry.js)
     js/ark/vendor/ark-kit-popover.js           the popover block alone (scripts/ark-kit-popover-entry.js)
     js/ark/vendor/ark-kit-skin.js              the skin layer alone (scripts/ark-kit-skin-entry.js), loaded when a skin is applied
     js/ark/vendor/ark-kit-figures.js           the lane and band blocks alone (scripts/ark-kit-figures-entry.js)
     js/ark/vendor/ark-kit-public.js            the same entry with what no block uses refused
                                                (createArkUI, createArkPopover, createArkToggleGroup,
                                                patchArkBlock), the blocks' demo examples dropped and
                                                the prop schemas' editor help/description text
                                                stripped: public pages that render blocks
     js/ark/vendor/ark-kit-live.js              patchArkBlock alone (scripts/ark-kit-live-entry.js):
                                                js/ark/blocks.js loads it on a page's first live
                                                update, so only / and /stats pay for the morph
     js/ark/blocks.js                           the blocks adapter, minified from its commented
                                                source scripts/ark-blocks-adapter.js (a classic
                                                script; no bundling): 6.4 -> 3.9 KB gz per block route
     js/admin/vendor/cms-blocks.js              ArkCmsBlocks: @deadark/sdk/cms's validateCmsArkBlock and
                                                editor fields (scripts/cms-blocks-entry.js) -- the
                                                editor only: it bundles zod (~39 KB gz)
     css/ark-blocks.css                         Ark's static block CSS (dist/ark-ui.blocks.css),
                                                minified by esbuild -- the same rules, selectors and
                                                order, measured 7.5 -> 7.2 KB gz (W3-BUDGET); only
                                                once the synced @deadark/ark-ui ships it; until then
                                                reported as NOT BUILT, never as empty

     js/min/**, js/min/manifest.js, index.html's manifest stamp
                                                the site's page scripts (the ones js/pages/catalog.js lists)
                                                served minified, with source maps: the commented source
                                                stays canonical. Derived from the catalog, not listed
                                                here -- scripts/lib/page-scripts.cjs says which files and
                                                why; `--pages` builds or checks only these (npm run
                                                build:pages / check:pages), `npm run build:ark` does all.
                                                A copy no catalog script builds is deleted (or DRIFT).

   It replaced, on 2026-10-19 (DEFXN polish Wave 0, docs/ux-audit/components.md §5.3):
   scripts/sync-ark.cjs and scripts/sync-ark-backgrounds.cjs (which read
   the hub's shared/ directory -- empty since the 2026-09-23 domain move), and the
   esbuild halves of build-settings.cjs and build-auth.cjs (which read absolute
   design/ paths and borrowed esbuild from design/deadark-sdk/node_modules). Code
   bytes of every pre-existing output were proven identical across the switch; the
   only differences are the two concatenated files' header/source-label comments.

   js/admin/auth.js is NOT built here: it bundles fxn-auth / fxn-auth-client /
   deadark-identity-core from sibling flux/ repos, which are not Ark UI packages and
   are not yet delivered through sync-consumer. scripts/build-auth.cjs still owns it
   (and its distribution to sibling sites); its Ark imports resolve here too.
   ===================================================================== */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/');
const packageDir = (name) => path.join(ROOT, 'node_modules', ...name.split('/'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const sha512 = (bytes) => 'sha512-' + crypto.createHash('sha512').update(bytes).digest('base64');

/* ---------- provenance: node_modules must be exactly the pinned tarballs ---------- */

/* The files a .tgz holds: { 'src/x.js': Buffer } (npm pack's package/ prefix dropped). ustar headers
   with the prefix field, and pax 'path=' records, which npm pack writes for long names. */
function tarballFiles(tgz) {
  const tar = zlib.gunzipSync(tgz);
  const files = {};
  let pax = null;
  for (let at = 0; at + 512 <= tar.length;) {
    const header = tar.subarray(at, at + 512);
    if (header.every((byte) => byte === 0)) break;
    const field = (start, length) => header.subarray(start, start + length).toString('utf8').replace(/\0.*$/s, '');
    const size = parseInt(field(124, 12).trim() || '0', 8);
    const type = field(156, 1);
    const prefix = field(345, 155);
    const body = tar.subarray(at + 512, at + 512 + size);
    if (type === 'x') {
      const match = /\d+ path=([^\n]*)\n/.exec(body.toString('utf8'));
      pax = match ? match[1] : null;
    } else {
      const name = pax || (prefix ? prefix + '/' : '') + field(0, 100);
      pax = null;
      if (type === '0' || type === '') files[name.replace(/^package\//, '')] = Buffer.from(body);
    }
    at += 512 + Math.ceil(size / 512) * 512;
  }
  return files;
}

/* Files whose installed bytes differ from the pinned tarball's. Found 2026-10-19: npm leaves a
   file: dependency in place when its version and lock integrity are unchanged, so after a sync
   that repacked the same version (ark-ui 0.2.0, ark-primitives 0.2.0) node_modules kept the OLD
   files while .package-lock.json recorded the NEW tarball's integrity -- the integrity check above
   passed, and ark-kit.js and js/settings/panel.js were built from code the pin did not name. */
function staleInstalledFiles(name, tgz) {
  const files = tarballFiles(tgz);
  return Object.keys(files).filter((file) => {
    const installedFile = path.join(packageDir(name), file);
    return !fs.existsSync(installedFile) || Buffer.compare(fs.readFileSync(installedFile), files[file]) !== 0;
  });
}

/* Every @deadark/* dependency pinned as file:.vendor/<tgz>, with the installed copy proven to be
   that tarball: npm records the integrity of what it installed in node_modules/.package-lock.json,
   and the sync recorded the tarball's sha256 in .vendor/<slug>-manifest.json. Building from a
   node_modules that `npm install` has not refreshed would otherwise pass --check against stale
   code while the pinned tarball says something else. The lock alone is not proof (see
   staleInstalledFiles): every installed file is compared with the tarball's bytes too. */
function vendoredPackages() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const installedLock = path.join(ROOT, 'node_modules', '.package-lock.json');
  const installed = fs.existsSync(installedLock) ? JSON.parse(fs.readFileSync(installedLock, 'utf8')).packages || {} : {};
  const problems = [];
  const packages = Object.entries(pkg.dependencies || {})
    .filter(([name, spec]) => name.startsWith('@deadark/') && typeof spec === 'string' && spec.startsWith('file:.vendor/'))
    .map(([name, spec]) => {
      const tarball = path.join(ROOT, spec.slice('file:'.length));
      const slug = name.replace(/^@/, '').replace(/\//g, '-');
      const manifestPath = path.join(ROOT, '.vendor', slug + '-manifest.json');
      const entry = { name, tarball: rel(tarball), version: null, sha256: null };
      if (!fs.existsSync(tarball)) { problems.push(name + ': pinned ' + entry.tarball + ' is missing; run npm run sync:ark'); return entry; }
      const bytes = fs.readFileSync(tarball);
      entry.sha256 = sha256(bytes);
      const recorded = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : null;
      if (!recorded) problems.push(name + ': ' + entry.tarball + ' has no .vendor manifest, so nobody can prove where it came from; run npm run sync:ark');
      else if (recorded.sha256 !== entry.sha256) problems.push(name + ': ' + entry.tarball + ' sha256 ' + entry.sha256.slice(0, 12) + ' does not match the recorded ' + String(recorded.sha256).slice(0, 12) + '; run npm run sync:ark');
      const lockEntry = installed['node_modules/' + name];
      if (!lockEntry) problems.push(name + ': not installed in node_modules; run npm install');
      else if (lockEntry.integrity !== sha512(bytes)) problems.push(name + ': node_modules holds a different build than ' + entry.tarball + '; run npm install');
      else {
        entry.version = lockEntry.version;
        const stale = staleInstalledFiles(name, bytes);
        if (stale.length) problems.push(name + ': node_modules/' + name + ' is not the bytes of ' + entry.tarball + ' (' + stale.slice(0, 3).join(', ') + (stale.length > 3 ? ', +' + (stale.length - 3) + ' more' : '') + ') although the install lock says it is; reinstall it: rm -rf node_modules/' + name + ' && npm install');
      }
      return entry;
    });
  if (!packages.some((entry) => entry.name === '@deadark/ark-ui')) problems.push('@deadark/ark-ui is not pinned in package.json dependencies; add "@deadark/ark-ui": "file:.vendor/deadark-ark-ui-<version>.tgz" and run npm run sync:ark');
  return { packages, problems };
}

/* ---------- concatenated classic scripts (no bundler: the sources are dependency-free) ---------- */

function stripModuleSyntax(source) {
  return source.replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
}

function buildEngines() {
  const sources = [
    ['@deadark/flux-state', 'src/store.js'],
    ['@deadark/ark-a11y', 'src/element-style.js'],
    ['@deadark/ark-ui', 'dist/ark-ui.animate.js'],
  ];
  const chunks = sources.map(([name, file]) => {
    const source = fs.readFileSync(path.join(packageDir(name), file), 'utf8');
    return '// Source: ' + name + '/' + file + '\n// SHA256: ' + sha256(source) + '\n' + stripModuleSyntax(source);
  });
  return '/* Generated by scripts/build-ark-vendor.cjs. Do not edit. */\nvar ArkEngines = (function () {\n\'use strict\';\n' +
    chunks.join('\n') +
    '\nreturn { FluxMemoryStore, FluxAnimate, setArkElementStyle, getArkElementStyle, setArkElementStyles, setArkElementHidden };\n})();\n';
}

/* Each generator file declares its own top-level helpers (clamp, svgElement, SVG_NS...) and several
   reuse the same names, so concatenating them into one scope collides (duplicate const is a
   SyntaxError under 'use strict'). Each body gets its own IIFE; only its four named exports cross
   into ArkBackgrounds. */
const BACKGROUND_STYLES = [
  { key: 'deepTide', file: 'ark-ui.backgrounds.js', defaults: 'ARK_BACKGROUND_DEFAULTS', presets: 'ARK_BACKGROUND_PRESETS', createConfig: 'createArkBackgroundConfig', mount: 'mountArkBackground' },
  { key: 'contours', file: 'ark-ui.background-contours.js', defaults: 'ARK_CONTOUR_BACKGROUND_DEFAULTS', presets: 'ARK_CONTOUR_BACKGROUND_PRESETS', createConfig: 'createArkContourBackgroundConfig', mount: 'mountArkContourBackground' },
  { key: 'fabric', file: 'ark-ui.background-fabric.js', defaults: 'ARK_FABRIC_BACKGROUND_DEFAULTS', presets: 'ARK_FABRIC_BACKGROUND_PRESETS', createConfig: 'createArkFabricBackgroundConfig', mount: 'mountArkFabricBackground' },
  { key: 'lattice', file: 'ark-ui.background-lattice.js', defaults: 'ARK_LATTICE_BACKGROUND_DEFAULTS', presets: 'ARK_LATTICE_BACKGROUND_PRESETS', createConfig: 'createArkLatticeBackgroundConfig', mount: 'mountArkLatticeBackground' },
  { key: 'rift', file: 'ark-ui.background-rift.js', defaults: 'ARK_RIFT_BACKGROUND_DEFAULTS', presets: 'ARK_RIFT_BACKGROUND_PRESETS', createConfig: 'createArkRiftBackgroundConfig', mount: 'mountArkRiftBackground' },
  { key: 'tiles', file: 'ark-ui.background-tiles.js', defaults: 'ARK_TILES_BACKGROUND_DEFAULTS', presets: 'ARK_TILES_BACKGROUND_PRESETS', createConfig: 'createArkTilesBackgroundConfig', mount: 'mountArkTilesBackground' },
  { key: 'typefield', file: 'ark-ui.background-typefield.js', defaults: 'ARK_TYPEFIELD_BACKGROUND_DEFAULTS', presets: 'ARK_TYPEFIELD_BACKGROUND_PRESETS', createConfig: 'createArkTypefieldBackgroundConfig', mount: 'mountArkTypefieldBackground' },
];

function buildBackgrounds() {
  const dist = path.join(packageDir('@deadark/ark-ui'), 'dist');
  const blocks = BACKGROUND_STYLES.map((style) => {
    const source = fs.readFileSync(path.join(dist, style.file), 'utf8');
    return (
      '  // Source: @deadark/ark-ui/dist/' + style.file + '\n' +
      '  // SHA256: ' + sha256(source) + '\n' +
      '  var ' + style.key + ' = (function () {\n' +
      stripModuleSyntax(source).replace(/^/gm, '    ') +
      '    return { defaults: ' + style.defaults + ', presets: ' + style.presets + ', createConfig: ' + style.createConfig + ', mount: ' + style.mount + ' };\n' +
      '  })();\n'
    );
  });
  return '/* Generated by scripts/build-ark-vendor.cjs. Do not edit. */\n' +
    'var ArkBackgrounds = (function () {\n' +
    '\'use strict\';\n' +
    blocks.join('\n') +
    'return { ' + BACKGROUND_STYLES.map((s) => s.key + ': ' + s.key).join(', ') + ' };\n' +
    '})();\n';
}

/* ---------- SDK theme, through the SDK CLI (AGENTS.md: theme behaviour comes from the SDK) ---------- */

const THEME_CLI = () => path.join(packageDir('@deadark/sdk'), 'bin', 'deadark-theme.mjs');
function buildThemeCss() {
  return execFileSync(process.execPath, [THEME_CLI(), 'css']);
}

/* The site's palette ids, from the SDK's role-ladder module (@deadark/sdk/theme): the published
   names, in family order, and the map from the old stored keys (ghost, glacier, ...) that the
   settings panel reads once and writes forward. Nothing here is curated by hand. */
function buildThemeOptions() {
  const script = "import('@deadark/sdk/theme').then((sdk)=>{const f=sdk.DEADARK_ROLE_LADDER_FAMILIES;" +
    "console.log(JSON.stringify({options:f.flatMap((x)=>[sdk.getDeadArkRoleLadderPublishedName(x,'dark'),sdk.getDeadArkRoleLadderPublishedName(x,'light')])," +
    "legacy:sdk.DEADARK_ROLE_LADDER_LEGACY_TO_PUBLISHED}));})";
  const { options, legacy } = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', cwd: ROOT }));
  return '// Generated from the SDK role-ladder palettes (@deadark/sdk/theme getDeadArkRoleLadderPublishedName).\n' +
    'export default ' + JSON.stringify(options) + ';\n' +
    '// Old stored key -> published id, for READING a visitor\'s earlier choice only.\n' +
    'export const legacyThemeIds = ' + JSON.stringify(legacy) + ';\n';
}

/* ---------- esbuild bundles (classic IIFE scripts) ---------- */

// The page's one element-style registry is ArkEngines (engines.js); bundles that sit beside it
// must reuse it instead of carrying a second copy that hands out colliding dynamic ids.
const SHARED_STYLE_REGISTRY = { '@deadark/ark-a11y/element-style': './scripts/ark-style-bridge.js' };

/* Module replacements: swap one module of a synced @deadark package for a local stand-in, for an
   import written as a relative path inside that package's dist -- which `alias` (package paths
   only) cannot reach. Strips: drop named string members (`help: "..."`, `description: "..."`)
   from the modules a pattern names. Both need an esbuild plugin, and esbuild runs plugins only in
   its async API, so such a bundle is built in a child process and returned synchronously like
   every other. */
// The public kit drops the blocks' demo examples (scripts/ark-blocks-no-examples.js says why).
const PUBLIC_KIT_REPLACEMENTS = [{ pattern: '[\\\\/]blocks[\\\\/]examples\\.js$', within: '@deadark/ark-ui', file: 'scripts/ark-blocks-no-examples.js' }];
/* The public kit strips the prop schemas' editor text from the block modules: `help` (shown next
   to a field in the editor, and quoted in a refusal's remedy) and a block's `description` (the
   Library row). Public pages only render; the validation shape (kind, required, maxLength, enum
   values, labels -- a refusal's failure and needs) stays whole. Measured 2026-10-19 (W3-BUDGET,
   gzip -9): 78 help + 21 description strings, 6.3 KB raw, 2.1 KB gz of a 26.9 KB public kit. The
   member must be a double-quoted string (tsc's output form) that opens an object or follows a
   comma, so `description: { kind: "text" }` (a prop named description) and `props.description`
   in render code are untouched. The full kit keeps every word. */
// `member` is the regex source (data, not code: the child build gets it through JSON, so its
// backslashes survive); its two groups keep the opener and its whitespace.
const stripMember = (keys) => '(^|[{,])(\\s*)(?:' + keys.join('|') + '):\\s*"(?:[^"\\\\\\n]|\\\\.)*"\\s*,?';
const PUBLIC_KIT_STRIPS = [{ pattern: '[\\\\/]ark-ui[\\\\/]dist[\\\\/]blocks[\\\\/][a-z-]+\\.js$', member: stripMember(['help', 'description']) }];

const REPLACING_BUILD = `
const esbuild = require(process.argv[1]);
const fs = require('node:fs');
const path = require('node:path');
const { options, replacements, strips, root } = JSON.parse(process.argv[2]);
options.plugins = [{ name: 'replace-modules', setup(build) {
  for (const r of replacements || []) {
    const within = path.join('node_modules', ...r.within.split('/'));
    build.onResolve({ filter: new RegExp(r.pattern) }, (args) => (args.importer.includes(within) ? { path: path.join(root, r.file) } : undefined));
  }
  for (const s of strips || []) {
    const member = new RegExp(s.member, 'g');
    build.onLoad({ filter: new RegExp(s.pattern) }, (args) => ({ contents: fs.readFileSync(args.path, 'utf8').replace(member, '$1$2'), loader: 'js' }));
  }
} }];
esbuild.build(options).then((result) => process.stdout.write(Buffer.from(result.outputFiles[0].contents)), (error) => { console.error(error); process.exit(1); });
`;

function bundle({ entry, globalName, legalComments, alias, banner, replacements, strips, define }) {
  const esbuild = require('esbuild');
  const options = {
    absWorkingDir: ROOT,
    entryPoints: [entry],
    bundle: true,
    format: 'iife',
    minify: true,
    write: false,
    logLevel: 'warning',
    ...(globalName ? { globalName } : {}),
    ...(legalComments ? { legalComments } : {}),
    ...(alias ? { alias } : {}),
    ...(banner ? { banner: { js: banner } } : {}),
    ...(define ? { define } : {}),
    outfile: path.join(ROOT, 'ark-vendor.out.js'), // never written (write: false); names the output
  };
  if ((replacements && replacements.length) || (strips && strips.length)) {
    return execFileSync(process.execPath, ['-e', REPLACING_BUILD, require.resolve('esbuild'), JSON.stringify({ options, replacements, strips, root: ROOT })], { maxBuffer: 1 << 26 });
  }
  return Buffer.from(esbuild.buildSync(options).outputFiles[0].contents);
}

/* A site classic script served minified (the blocks adapter): esbuild renames local names only --
   every property, string, global (ArkUI, ArkKit, ArkKitLive) and data-ark-* name stays as written.
   target es2018: the floor the page loader itself already needs (async functions, for...of), so
   the minifier never introduces newer syntax than the site already ships. */
function minifyClassicScript(source, from) {
  const esbuild = require('esbuild');
  const code = esbuild.transformSync(fs.readFileSync(path.join(ROOT, source), 'utf8'), { loader: 'js', minify: true, legalComments: 'none', target: 'es2018' }).code;
  return '/* Generated by scripts/build-ark-vendor.cjs from ' + source + ' (minified). Do not edit: edit ' + source + ', then npm run build:ark. */\n' + code;
}

/* Ark's block stylesheet, minified (esbuild's CSS minifier: whitespace and shorthand only; every
   selector, rule and order kept), behind a one-line provenance header. tests/ark-vendor.cjs proves
   css/ark-blocks.css is exactly this transform of the synced package's file. */
function minifyBlocksCss(source, version) {
  const esbuild = require('esbuild');
  const css = esbuild.transformSync(source, { loader: 'css', minify: true, legalComments: 'none' }).code;
  return '/* @deadark/ark-ui@' + version + ' ' + ARK_BLOCKS_CSS_SOURCE + ', minified by scripts/build-ark-vendor.cjs. Do not edit; styles live in ark-ui blocks/styles.ts. */\n' + css;
}

// The public kit leaves out what no block uses (the createArkUI runtime, the popover and toggle
// group the editor drives) and the live morph only / and /stats use (its own chunk,
// js/ark/vendor/ark-kit-live.js); a page that calls one is told what to load (R2 budget).
const PUBLIC_KIT_REFUSES = {
  '@deadark/ark-ui/runtime': './scripts/ark-kit-public-refused.js',
  '@deadark/ark-primitives/dialog': './scripts/ark-kit-public-refused.js',
  '@deadark/ark-primitives/toggle': './scripts/ark-kit-public-refused.js',
  '@deadark/ark-ui/blocks/patch': './scripts/ark-kit-public-refused.js',
  '@deadark/ark-ui/blocks/confirm': './scripts/ark-kit-public-refused.js',
  // The public kit's registry is ark-ui's CORE (21 blocks); the form blocks are js/ark/vendor/ark-kit-forms.js.
  // esbuild matches the longest alias, so the two entries above keep their own targets.
  '@deadark/ark-ui/blocks': '@deadark/ark-ui/blocks/core',
};
// scripts/ark-kit-entry.js exports PUBLIC_KIT from this constant: js/ark/blocks.js reads it.
const KIT_DEFINE = (isPublic) => ({ __ARK_KIT_PUBLIC__: String(isPublic) });

function arkKitBanner(packages, variant) {
  // The public kit is paid for by every visitor of a block route: its header names ark-ui's version
  // and where the rest is recorded (package.json pins every package; sha256 in
  // .vendor/<slug>-manifest.json; tests/ark-vendor.cjs proves the bytes). Measured 2026-10-19:
  // the full list cost 0.26 KB gz of it, this line 0.08 (W3-BUDGET).
  if (variant) {
    const arkUi = packages.find((p) => p.name === '@deadark/ark-ui') || {};
    return '/* Generated by scripts/build-ark-vendor.cjs from scripts/ark-kit-entry.js (' + variant + '). Do not edit.\n' +
      ' * @deadark/ark-ui@' + arkUi.version + ' and its closure as pinned in package.json (npm run sync:ark; sha256 in .vendor/*-manifest.json). */';
  }
  const lines = packages.map((p) => ' *   ' + p.name + '@' + p.version + '  ' + p.tarball + '  sha256 ' + p.sha256);
  return '/* Generated by scripts/build-ark-vendor.cjs from scripts/ark-kit-entry.js. Do not edit.\n' +
    ' * Built only from these synced packages (npm run sync:ark):\n' + lines.join('\n') + '\n */';
}

/* ---------- the target table ---------- */

const ARK_BLOCKS_CSS_SOURCE = 'dist/ark-ui.blocks.css';

function targets(packages) {
  const blocksCss = path.join(packageDir('@deadark/ark-ui'), ARK_BLOCKS_CSS_SOURCE);
  // Order matters: scripts/theme-options.js is an input of the settings bundle, so it is written
  // before js/settings/panel.js is built from it.
  return [
    { out: 'css/themes.css', build: buildThemeCss },
    { out: 'scripts/theme-options.js', build: buildThemeOptions },
    { out: 'js/ark/vendor/engines.js', build: buildEngines },
    { out: 'js/ark/vendor/backgrounds.js', build: buildBackgrounds },
    { out: 'js/settings/panel.js', build: () => bundle({ entry: 'scripts/settings-entry.js', alias: SHARED_STYLE_REGISTRY }) },
    { out: 'js/admin/vendor/flux-elements.js', build: () => bundle({ entry: 'scripts/elements-entry.js', globalName: 'ArkFluxElements', legalComments: 'none' }) },
    { out: 'js/admin/authorization-view.js', build: () => bundle({ entry: 'scripts/authorization-view-entry.js', globalName: 'ArkAuthorizationView', legalComments: 'none' }) },
    { out: 'js/ark/local-identity.js', build: () => bundle({ entry: 'scripts/local-identity-entry.js', globalName: 'ArkLocalIdentityBuild', legalComments: 'none' }) },
    { out: 'js/ark/vendor/ark-kit.js', build: () => bundle({ entry: 'scripts/ark-kit-entry.js', globalName: 'ArkKit', legalComments: 'none', alias: SHARED_STYLE_REGISTRY, define: KIT_DEFINE(false), banner: arkKitBanner(packages) }) },
    // The same entry for public pages: createArkUI, createArkPopover, createArkToggleGroup, patchArkBlock refused, not bundled;
    // examples and editor help stripped (R2 budget).
    { out: 'js/ark/vendor/ark-kit-public.js', build: () => bundle({ entry: 'scripts/ark-kit-entry.js', globalName: 'ArkKit', legalComments: 'none', alias: Object.assign({}, SHARED_STYLE_REGISTRY, PUBLIC_KIT_REFUSES), replacements: PUBLIC_KIT_REPLACEMENTS, strips: PUBLIC_KIT_STRIPS, define: KIT_DEFINE(true), banner: arkKitBanner(packages, 'public: createArkUI, createArkPopover, createArkToggleGroup, patchArkBlock refused; block examples and editor help dropped') }) },
    // The form blocks alone (ark-ui blocks/forms), registered into the public kit's registry by a page that takes input.
    { out: 'js/ark/vendor/ark-kit-forms.js', build: () => bundle({ entry: 'scripts/ark-kit-forms-entry.js', globalName: 'ArkKitForms', legalComments: 'none', strips: PUBLIC_KIT_STRIPS, banner: '/* Generated by scripts/build-ark-vendor.cjs from scripts/ark-kit-forms-entry.js (@deadark/ark-ui@' + (packages.find((p) => p.name === '@deadark/ark-ui') || {}).version + ' blocks/forms; editor help dropped). Do not edit. */' }) },
    // The popover block alone (ark-ui blocks/popover), for a page that floats one panel and takes no input.
    { out: 'js/ark/vendor/ark-kit-popover.js', build: () => bundle({ entry: 'scripts/ark-kit-popover-entry.js', globalName: 'ArkKitPopover', legalComments: 'none', strips: PUBLIC_KIT_STRIPS, banner: '/* Generated by scripts/build-ark-vendor.cjs from scripts/ark-kit-popover-entry.js (@deadark/ark-ui@' + (packages.find((p) => p.name === '@deadark/ark-ui') || {}).version + ' blocks/popover; editor help dropped). Do not edit. */' }) },
    // The lane and band blocks alone (ark-ui blocks/figures), for the pages that draw a manifest figure.
    { out: 'js/ark/vendor/ark-kit-figures.js', build: () => bundle({ entry: 'scripts/ark-kit-figures-entry.js', globalName: 'ArkKitFigures', legalComments: 'none', strips: PUBLIC_KIT_STRIPS, banner: '/* Generated by scripts/build-ark-vendor.cjs from scripts/ark-kit-figures-entry.js (@deadark/ark-ui@' + (packages.find((p) => p.name === '@deadark/ark-ui') || {}).version + ' blocks/figures; editor help dropped). Do not edit. */' }) },
    // Every block's own example props, loaded only by /palette's Parts tab (js/pages/palette.js).
    { out: 'js/ark/vendor/ark-kit-examples.js', build: () => bundle({ entry: 'scripts/ark-kit-examples-entry.js', globalName: 'ArkKitExamples', legalComments: 'none', banner: '/* Generated by scripts/build-ark-vendor.cjs from scripts/ark-kit-examples-entry.js (@deadark/ark-ui@' + (packages.find((p) => p.name === '@deadark/ark-ui') || {}).version + ' blocks/examples). Do not edit. */' }) },
    // The skin layer alone (NFT skins), loaded only when a skin is applied (js/ark/skin-site.js).
    { out: 'js/ark/vendor/ark-kit-skin.js', build: () => bundle({ entry: 'scripts/ark-kit-skin-entry.js', globalName: 'ArkKitSkin', legalComments: 'none', banner: '/* Generated by scripts/build-ark-vendor.cjs from scripts/ark-kit-skin-entry.js (@deadark/ark-ui/skin). Do not edit. */' }) },
    // The live morph alone, for js/ark/blocks.js to load on a page's first live update.
    { out: 'js/ark/vendor/ark-kit-live.js', build: () => bundle({ entry: 'scripts/ark-kit-live-entry.js', globalName: 'ArkKitLive', legalComments: 'none', banner: '/* Generated by scripts/build-ark-vendor.cjs from scripts/ark-kit-live-entry.js (@deadark/ark-ui@' + (packages.find((p) => p.name === '@deadark/ark-ui') || {}).version + ' blocks/patch). Do not edit. */' }) },
    // The blocks adapter every block route loads (ArkUI.blockScripts), served minified from its commented source.
    { out: 'js/ark/blocks.js', build: () => minifyClassicScript('scripts/ark-blocks-adapter.js') },
    // The editor's block check and prop-editor fields (@deadark/sdk/cms). Admin-only: it
    // bundles zod (~39 KB gz), which the public site, rendering only, never needs.
    { out: 'js/admin/vendor/cms-blocks.js', build: () => bundle({ entry: 'scripts/cms-blocks-entry.js', globalName: 'ArkCmsBlocks', legalComments: 'none' }) },
    fs.existsSync(blocksCss)
      ? { out: 'css/ark-blocks.css', build: () => minifyBlocksCss(fs.readFileSync(blocksCss, 'utf8'), (packages.find((p) => p.name === '@deadark/ark-ui') || {}).version) }
      : { out: 'css/ark-blocks.css', notBuilt: '@deadark/ark-ui ' + (packages.find((p) => p.name === '@deadark/ark-ui') || {}).version + ' ships no ' + ARK_BLOCKS_CSS_SOURCE + ' yet (components.md Wave 1, U1)' },
  ];
}

/* The page scripts served minified (js/min/*, its manifest, and the manifest's stamp in index.html):
   scripts/lib/page-scripts.cjs derives the files from the catalog and builds them. They need esbuild
   and the site's own source only -- not the pinned Ark packages -- so `--pages` builds or checks
   just these (npm run build:pages / check:pages) without the provenance proof. */
function pageTargets() {
  const pages = require('./lib/page-scripts.cjs');
  const plan = pages.plan(ROOT);
  for (const item of plan.exempt) console.log('[build-ark-vendor] served as written ' + item.script + ': ' + item.exempt);
  return { targets: plan.outputs.map((output) => ({ out: output.out, build: () => output.bytes })), orphans: pages.orphans(ROOT, plan.outputs) };
}

function main() {
  const check = process.argv.includes('--check');
  const pagesOnly = process.argv.includes('--pages');
  let packages = [];
  if (!pagesOnly) {
    const proof = vendoredPackages();
    if (proof.problems.length) {
      for (const problem of proof.problems) console.error('[build-ark-vendor] ' + problem);
      process.exit(1);
    }
    packages = proof.packages;
  }
  let drift = 0;
  const pages = pageTargets();
  for (const target of (pagesOnly ? [] : targets(packages)).concat(pages.targets)) {
    const file = path.join(ROOT, target.out);
    if (target.notBuilt) {
      // Absent is not empty: say what is missing instead of writing a zero-byte stylesheet.
      if (fs.existsSync(file)) { console.error('[build-ark-vendor] DRIFT ' + target.out + ': exists, but its source is gone -- ' + target.notBuilt); drift += 1; }
      else console.log('[build-ark-vendor] not built ' + target.out + ': ' + target.notBuilt);
      continue;
    }
    const bytes = Buffer.from(target.build());
    const current = fs.existsSync(file) ? fs.readFileSync(file) : null;
    const same = current !== null && Buffer.compare(current, bytes) === 0;
    if (check) {
      if (same) console.log('[build-ark-vendor] ok ' + target.out);
      else { console.error('[build-ark-vendor] DRIFT ' + target.out + (current === null ? ' (missing)' : ' (differs from a fresh build)') + '; run node scripts/build-ark-vendor.cjs'); drift += 1; }
      continue;
    }
    if (!same) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes); }
    console.log('[build-ark-vendor] ' + (same ? 'unchanged ' : 'wrote ') + target.out + ' (' + bytes.length + ' bytes, sha256 ' + sha256(bytes).slice(0, 12) + ')');
  }
  // A copy no output names (its script left the catalog, or became exempt) would be served stale forever.
  for (const orphan of pages.orphans) {
    if (check) { console.error('[build-ark-vendor] DRIFT ' + orphan + ': no catalog script builds it; run node scripts/build-ark-vendor.cjs'); drift += 1; }
    else { fs.unlinkSync(path.join(ROOT, orphan)); console.log('[build-ark-vendor] removed ' + orphan + ' (no catalog script builds it)'); }
  }
  if (check && drift) {
    console.error('[build-ark-vendor] ' + drift + ' output(s) drifted from their sources');
    process.exit(1);
  }
}

module.exports = { vendoredPackages, targets, tarballFiles, staleInstalledFiles, minifyBlocksCss };

if (require.main === module) main();

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
                                                (scripts/ark-kit-entry.js), provenance header
     css/ark-blocks.css                         Ark's static block CSS -- only once the synced
                                                @deadark/ark-ui ships dist/ark-ui.blocks.css;
                                                until then reported as NOT BUILT, never as empty

   It replaced, on 2026-10-19 (DEFXN polish Wave 0, docs/ux-audit/components.md §5.3):
   scripts/sync-ark.cjs and scripts/sync-ark-backgrounds.cjs (which read
   the hub's shared/ directory -- empty since the 2026-09-23 domain move), and the
   esbuild halves of build-settings.cjs and build-auth.cjs (which read absolute
   design/ paths and borrowed esbuild from design/deadark-sdk/node_modules). Code
   bytes of every pre-existing output were proven identical across the switch; the
   only differences are the two concatenated files' header/source-label comments.

   js/admin/auth.js is NOT built here: it bundles flux-auth / flux-auth-client /
   deadark-identity-core from sibling flux/ repos, which are not Ark UI packages and
   are not yet delivered through sync-consumer. scripts/build-auth.cjs still owns it
   (and its distribution to sibling sites); its Ark imports resolve here too.
   ===================================================================== */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/');
const packageDir = (name) => path.join(ROOT, 'node_modules', ...name.split('/'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const sha512 = (bytes) => 'sha512-' + crypto.createHash('sha512').update(bytes).digest('base64');

/* ---------- provenance: node_modules must be exactly the pinned tarballs ---------- */

/* Every @deadark/* dependency pinned as file:.vendor/<tgz>, with the installed copy proven to be
   that tarball: npm records the integrity of what it installed in node_modules/.package-lock.json,
   and the sync recorded the tarball's sha256 in .vendor/<slug>-manifest.json. Building from a
   node_modules that `npm install` has not refreshed would otherwise pass --check against stale
   code while the pinned tarball says something else. */
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
      else entry.version = lockEntry.version;
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
// Curated for the lattice direction; only names the SDK catalog really has are kept.
const ALLOWED_THEMES = ['clay', 'ochre', 'ghost', 'marine', 'grove', 'moss', 'glacier', 'bone'];

function buildThemeCss() {
  return execFileSync(process.execPath, [THEME_CLI(), 'css']);
}

function buildThemeOptions() {
  const themes = JSON.parse(execFileSync(process.execPath, [THEME_CLI(), 'themes'], { encoding: 'utf8' }));
  return '// Generated from the SDK theme catalog; curated for the lattice direction.\nexport default ' +
    JSON.stringify(ALLOWED_THEMES.filter((name) => themes.some((theme) => theme.name === name))) + ';\n';
}

/* ---------- esbuild bundles (classic IIFE scripts) ---------- */

// The page's one element-style registry is ArkEngines (engines.js); bundles that sit beside it
// must reuse it instead of carrying a second copy that hands out colliding dynamic ids.
const SHARED_STYLE_REGISTRY = { '@deadark/ark-a11y/element-style': './scripts/ark-style-bridge.js' };

function bundle({ entry, globalName, legalComments, alias, banner }) {
  const esbuild = require('esbuild');
  const result = esbuild.buildSync({
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
    outfile: path.join(ROOT, 'ark-vendor.out.js'), // never written (write: false); names the output
  });
  return Buffer.from(result.outputFiles[0].contents);
}

function arkKitBanner(packages) {
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
    { out: 'js/ark/vendor/ark-kit.js', build: () => bundle({ entry: 'scripts/ark-kit-entry.js', globalName: 'ArkKit', legalComments: 'none', alias: SHARED_STYLE_REGISTRY, banner: arkKitBanner(packages) }) },
    fs.existsSync(blocksCss)
      ? { out: 'css/ark-blocks.css', build: () => fs.readFileSync(blocksCss) }
      : { out: 'css/ark-blocks.css', notBuilt: '@deadark/ark-ui ' + (packages.find((p) => p.name === '@deadark/ark-ui') || {}).version + ' ships no ' + ARK_BLOCKS_CSS_SOURCE + ' yet (components.md Wave 1, U1)' },
  ];
}

function main() {
  const check = process.argv.includes('--check');
  const { packages, problems } = vendoredPackages();
  if (problems.length) {
    for (const problem of problems) console.error('[build-ark-vendor] ' + problem);
    process.exit(1);
  }
  let drift = 0;
  for (const target of targets(packages)) {
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
  if (check && drift) {
    console.error('[build-ark-vendor] ' + drift + ' output(s) drifted from the synced packages');
    process.exit(1);
  }
}

module.exports = { vendoredPackages, targets };

if (require.main === module) main();

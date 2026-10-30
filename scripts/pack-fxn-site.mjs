#!/usr/bin/env node
/* =====================================================================
   PACK defxn.com FOR de.fxn: this site as a plain static folder, packed
   with bundle-deploy, for the .fxn site server.
   ---------------------------------------------------------------------
   Run:  node scripts/pack-fxn-site.mjs [--stage <empty folder>] [--out <file>] [--format auto|1|2]

   Prints the content ID to point de.fxn at (a blake3_cid target, set at
   domains.defxn.com). Uploads nothing: publish the staged folder with
     bundle-deploy prepare <stage> --store http://127.0.0.1:8772 --identity-file <seed> --publish
   which sends a /2 site's blocks first and its index last.

   Design: docs/FXN-REAL-SITES-DESIGN.md, decision 3 (prerender at pack
   time). On Vercel, api/render.mjs answers every extension-less path with
   index.html, and vercel.json strips route folders from asset URLs. A
   static host does neither, so this script does both at pack time:

   1. Routes. Every page address comes from the page catalog
      (scripts/lib/site-routes.mjs, the list the page router reads). Each
      gets `<route>.html`, a copy of the shell. The site server finds
      "/account" as account.html with no redirect, so the address stays
      the one the router writes. 404.html is the shell too: the router
      draws its not-found page. Per-route titles are still set by the
      router at run time, as on defxn.com for a person.
   2. Asset URLs. The shell names js/, css/ and assets/ relative to the
      page, so /learnings/x would ask for /learnings/js/... Every copy has
      those URLs made root-absolute. The three document.write loaders
      (js/content/{manifests,assets,secrets}/index.js) write relative URLs
      too; their staged copies write "/js/..." instead. A <base> tag
      cannot do this: the shell's CSP says base-uri 'none'.
   3. What ships. index.html, js/, css/, assets/, gateway/ (skins import
      gateway/resolve-name.js), robots.txt, sitemap.xml, llms.txt and a
      _headers file. Of js/admin/ only the files a public page loads (the
      catalog's `scripts`, so /auth and /account work); the rest of it is
      the editor and its signing flow, loopback only (.vercelignore).
      Everything else at the top of the repo is left out and listed with
      its reason when the script runs.
   ===================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readPageCatalog, readSiteRoutes } from './lib/site-routes.mjs';
import { engineDir, engineBrowserFiles } from './lib/fxn-3d-closure.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE_DEPLOY = path.resolve(ROOT, '..', 'bundle-deploy');

/* What the public site is made of. Folders ship whole, less what EXCLUDED_INSIDE takes out. */
const SHIP_FOLDERS = ['js', 'css', 'assets', 'gateway'];
const SHIP_FILES = ['robots.txt', 'sitemap.xml', 'llms.txt'];
const ADMIN_FOLDER = 'js/admin';

/* Why each other top-level entry stays out. An entry not named here is left out and reported as unknown. */
const LEFT_OUT = {
  'world': 'shipped by stageSite from its records: world.flx, card.flx and the content-addressed files they name; the test pages and unnamed blobs stay out',
  'admin.html':'the editor door, loopback only (.vercelignore)',
  'admin-app.html': 'the editor, loopback only (.vercelignore)',
  'broker.html': 'the identity broker is pinned to https://defxn.com/broker.html (js/ark/broker-client.js); a copy here would be a second broker origin nothing calls',
  api: 'server code; nothing runs it on a static host. render.mjs only serves index.html to people, which the route files replace',
  docs: 'source documents; pages read js/content/reference snapshots, not docs/ (js/pages/reference.js)',
  legacy: 'an old single-file page nothing links to',
  ops: 'deploy notes and service files',
  scripts: 'build and local tools',
  tests: 'tests',
  node_modules: 'packages for the build and tests',
  '.vendor': 'packages for the build',
  '.claude': 'agent workspace',
  '.DS_Store': 'Finder litter',
  '.git': 'version history',
  '.gitignore': 'version control settings',
  '.vercelignore': 'Vercel settings',
  'vercel.json': 'Vercel rewrites; the route files and absolute URLs replace them',
  'package.json': 'build settings',
  'package-lock.json': 'build settings',
  'README.md': 'repo notes',
  'Flux Chain Admin.command': 'a local launcher for the editor',
  undefined: 'a stray folder of screenshots',
};
const STRAY_IMAGE = /\.(png|jpg|jpeg)$/i; // review screenshots kept at the top of the repo

/* The site's own response headers (allowed list: bundle-deploy src/folder-site-core.js). The shell's meta CSP
   still governs scripts and connections; frame-ancestors only works as a header. */
const HEADERS_FILE = `/*
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: no-referrer
  X-Robots-Tag: noindex
`;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const next = argv[i + 1];
    out[argv[i].slice(2)] = next === undefined || next.startsWith('--') ? true : (i += 1, next);
  }
  return out;
}

function refuse(failure, missing, remedy) {
  const error = new Error(`${failure} Missing: ${missing} To fix: ${remedy}`);
  error.refusal = true;
  return error;
}

/** relative src/href to js/, css/ or assets/ -> root-absolute. */
function absoluteAssetUrls(html) {
  return html.replace(/\b(src|href)="(js|css|assets)\//g, '$1="/$2/');
}

/** A document.write loader's '<script src="js/...' -> '<script src="/js/...'. Returns null when nothing changed. */
function absoluteWriteLoader(source) {
  const next = source.replace(/document\.write\((['"])<script src="js\//g, 'document.write($1<script src="/js/');
  return next === source ? null : next;
}

function copyTree(from, to, skip) {
  fs.cpSync(from, to, {
    recursive: true,
    verbatimSymlinks: true,
    filter: (source) => !skip(path.relative(ROOT, source).split(path.sep).join('/')) && path.basename(source) !== '.DS_Store',
  });
}

function walkFiles(dir, visit) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, visit);
    else if (entry.isFile()) visit(full);
  }
}

function stageSite(stage) {
  const catalog = Object.values(readPageCatalog(ROOT));
  const routes = [...readSiteRoutes(ROOT)].filter((route) => route !== '/').sort();
  const adminFiles = [...new Set(catalog.flatMap((entry) => entry.scripts || []).filter((file) => file.startsWith(`${ADMIN_FOLDER}/`)))].sort();

  for (const folder of SHIP_FOLDERS) copyTree(path.join(ROOT, folder), path.join(stage, folder), (relative) => relative === ADMIN_FOLDER);
  /* the 3D engine's browser modules live in the sibling repo flux/fxn-3d (moved 2026-10-29); the world host imports
     them as /fxn-3d/<path>. The pack ships exactly the files serve-site.mjs mounts: the derived closure of the renderer
     and the sampler (scripts/lib/fxn-3d-closure.mjs), read from the one copy in fxn-3d, at the same paths. */
  const engine = engineDir(ROOT);
  for (const rel of engineBrowserFiles(engine)) { const to = path.join(stage, 'fxn-3d', rel); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(path.join(engine, rel), to); }
  /* world/: the ?world=2 world's records and the content-addressed files they name, derived from the records (never a
     folder copy: world/ also holds test pages and blobs no record names any more) */
  const worldDir = path.join(ROOT, 'world'), shipWorld = ['world.flx', 'card.flx', 'kit.flx'].filter((f) => fs.existsSync(path.join(worldDir, f)));
  const named = new Set();
  for (const f of shipWorld) for (const m of fs.readFileSync(path.join(worldDir, f), 'latin1').matchAll(/-C([0-9a-f]{64})/g)) named.add(m[1]);
  for (const f of fs.readdirSync(worldDir)) { const cid = f.slice(0, 64); if (named.has(cid) && /^[0-9a-f]{64}\.[a-z]+$/.test(f)) shipWorld.push(f); }
  fs.mkdirSync(path.join(stage, 'world'), { recursive: true });
  for (const f of shipWorld) fs.copyFileSync(path.join(worldDir, f), path.join(stage, 'world', f));
  for (const file of adminFiles) {
    fs.mkdirSync(path.dirname(path.join(stage, file)), { recursive: true });
    fs.copyFileSync(path.join(ROOT, file), path.join(stage, file));
  }
  for (const file of SHIP_FILES) fs.copyFileSync(path.join(ROOT, file), path.join(stage, file));

  const loaders = [];
  walkFiles(path.join(stage, 'js'), (full) => {
    if (!full.endsWith('.js')) return;
    const next = absoluteWriteLoader(fs.readFileSync(full, 'utf8'));
    if (next !== null) { fs.writeFileSync(full, next); loaders.push(path.relative(stage, full)); }
  });

  const shell = absoluteAssetUrls(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'));
  fs.writeFileSync(path.join(stage, 'index.html'), shell);
  fs.writeFileSync(path.join(stage, '404.html'), shell);
  const clashes = [];
  for (const route of routes) {
    const file = path.join(stage, `${route.slice(1)}.html`);
    // The server tries "<route>", then "<route>/index.html", then "<route>.html": a shipped file or folder at
    // the route's own address would win over the page.
    if (fs.existsSync(file) || fs.existsSync(path.join(stage, route.slice(1)))) { clashes.push(route); continue; }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, shell);
  }
  if (clashes.length) throw refuse(`The routes ${clashes.join(', ')} have the same address as a shipped file or folder.`, 'one address per page.', 'rename the page in js/content/site-pages.js, or move the file.');
  fs.writeFileSync(path.join(stage, '_headers'), HEADERS_FILE);

  const shipped = new Set([...SHIP_FOLDERS, ...SHIP_FILES, 'index.html']);
  const leftOut = fs.readdirSync(ROOT).filter((name) => !shipped.has(name)).map((name) => {
    const reason = LEFT_OUT[name] || (STRAY_IMAGE.test(name) ? 'a review screenshot' : null);
    return { name, reason: reason || 'UNKNOWN: not in this script\'s list. Add it to SHIP_FOLDERS/SHIP_FILES if a page needs it, or to LEFT_OUT with its reason' };
  });
  return { routes: routes.length + 1, adminFiles, loaders, leftOut };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const stage = path.resolve(typeof args.stage === 'string' ? args.stage : fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-fxn-site-')));
  if (fs.existsSync(stage) && fs.readdirSync(stage).length) {
    throw refuse(`${stage} is not empty.`, 'an empty or new folder to stage the site in.', 'pass --stage <new folder>, or leave --stage out for a fresh temporary folder.');
  }
  fs.mkdirSync(stage, { recursive: true });
  const staged = stageSite(stage);

  const { packSite } = await import(pathToFileURL(path.join(BUNDLE_DEPLOY, 'src', 'folder-archive.js')).href);
  const packed = await packSite(stage, { format: typeof args.format === 'string' ? args.format : 'auto' });
  const out = path.resolve(typeof args.out === 'string' ? args.out : path.join(path.dirname(stage), `${path.basename(stage)}.bundle`));
  fs.writeFileSync(out, packed.bytes);

  console.log(packed.cid);
  const bytes = packed.format === 2 ? packed.totalBytes : packed.files.reduce((sum, file) => sum + file.size, 0);
  console.error([
    `Staged defxn.com in ${stage}: ${packed.files.length} files, ${bytes} bytes, ${staged.routes} page addresses (one shell copy each, plus 404.html).`,
    packed.format === 2
      ? `Packed as flux-folder-site/2: index ${packed.bytes.length} bytes in ${out}, ${packed.blockCount} blocks. The blocks are read from the stage folder when you publish it, so keep it until then.`
      : `Packed as flux-folder-site/1: ${packed.bytes.length} bytes in ${out}.`,
    `js/admin files shipped because a public page loads them: ${staged.adminFiles.join(', ') || 'none'}.`,
    `document.write loaders made root-absolute: ${staged.loaders.join(', ') || 'none'}.`,
    'Left out:',
    ...staged.leftOut.map(({ name, reason }) => `  ${name}: ${reason}`),
    `Next: point de.fxn's blake3_cid at ${packed.cid} after publishing with`,
    `  node ${path.relative(process.cwd(), path.join(BUNDLE_DEPLOY, 'bin', 'bundle-deploy.mjs'))} prepare ${stage} --store http://127.0.0.1:8772 --identity-file <seed> --publish`,
  ].join('\n'));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.refusal ? error.message : error.stack || error);
    process.exitCode = 1;
  });
}

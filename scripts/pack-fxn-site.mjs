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
import { pruneNotReached } from './lib/stage-graph.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/* beside this repo by default; BUNDLE_DEPLOY_DIR names it elsewhere (a node's checkout: scripts/cut-site.mjs sets it, as FXN_3D_DIR names fxn-3d) */
const BUNDLE_DEPLOY = path.resolve(process.env.BUNDLE_DEPLOY_DIR || path.join(ROOT, '..', 'bundle-deploy'));

/* What the public site is made of. Folders ship whole, less what EXCLUDED_INSIDE takes out. */
const SHIP_FOLDERS = ['js', 'css', 'assets', 'gateway'];
const SHIP_FILES = ['robots.txt', 'sitemap.xml', 'llms.txt'];
const ADMIN_FOLDER = 'js/admin';
/* The old 3D world's code, parked 2026-11-11 (js/ark/world-parked.js): in the repo, loaded by no page, so not shipped */
const PARKED_FOLDERS = ['js/world2', 'js/space', 'css/space'];

/* Why each other top-level entry stays out. An entry not named here is left out and reported as unknown. */
const LEFT_OUT = {
  'world': 'the old 3D world\'s records and blobs; parked 2026-11-11 (js/ark/world-parked.js), read by no page',
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

function stageSite(stage, opts = {}) {
  const catalog = Object.values(readPageCatalog(ROOT));
  const routes = [...readSiteRoutes(ROOT)].filter((route) => route !== '/').sort();
  const adminFiles = [...new Set(catalog.flatMap((entry) => entry.scripts || []).filter((file) => file.startsWith(`${ADMIN_FOLDER}/`)))].sort();

  for (const folder of SHIP_FOLDERS) copyTree(path.join(ROOT, folder), path.join(stage, folder), (relative) => relative === ADMIN_FOLDER || PARKED_FOLDERS.includes(relative));
  /* the 3D engine's browser modules live in the sibling repo flux/fxn-3d (moved 2026-10-29); the world host imports
     them as /fxn-3d/<path>. The pack ships exactly the files serve-site.mjs mounts: the derived closure of the renderer
     and the sampler (scripts/lib/fxn-3d-closure.mjs), read from the one copy in fxn-3d, at the same paths. */
  const engine = engineDir(ROOT);
  for (const rel of engineBrowserFiles(engine)) { const to = path.join(stage, 'fxn-3d', rel); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(path.join(engine, rel), to); }
  /* world/ IS NOT SHIPPED (owner, 2026-11-11: the old 3D world is parked, js/ark/world-parked.js). Until then the pack shipped world.flx,
     card.flx, kit.flx and every content-addressed file those records name. No page reads them now, so none of it goes into the pack. The
     folder stays in the repo. To ship it again, restore this block from git history together with the world host's script tag. */
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

  /* THE 3D VIEW (owner ruling 2026-11-11: "We have to have 3D ... deployed as a bundle"; audit F01). The home's portal and the twelve topic objects
     are drawn in one frame, the site view, which js/ark/stage.js asks for at /fxn-3d/view/index.html on the site's own origin. The view is built in
     the 3D repo, not here: a folder with index.html (the view page, speaking site-view's messages), the player it loads, and the packs of the hero
     document and the topic objects. This step ships that folder as it is and never lists its files. The folder is FXN_3D_VIEW_DIR, or
     <fxn-3d>/dist/site-view. With no built view the pack is refused, because a site packed without it shows no portal and no topic object;
     --without-3d packs it anyway and says so. */
  const viewDir = path.resolve(process.env.FXN_3D_VIEW_DIR || path.join(engine, 'dist', 'site-view'));
  const hasView = fs.existsSync(path.join(viewDir, 'index.html'));
  if (hasView) copyTree(viewDir, path.join(stage, 'fxn-3d', 'view'), () => false);
  else if (!opts.without3d) throw refuse(`The site's 3D view is not built: ${path.join(viewDir, 'index.html')} does not exist.`, 'the built site view (the view page, its player and the packs of the hero document and the twelve topic objects).', 'build it in flux/fxn-3d and pass its folder as FXN_3D_VIEW_DIR, or pass --without-3d to pack a site that shows no 3D.');

  /* the deployed shell frames only its own origin: the studio on 127.0.0.1:3440 is a local development source and leaves the CSP here, so
     js/ark/stage.js can never choose it on a deployed site (it reads this same CSP) */
  const source = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), deployed = source.replace(/(frame-src 'self') http:\/\/127\.0\.0\.1:3440;/, '$1;');
  if (deployed === source) throw refuse("index.html's CSP does not read \"frame-src 'self' http://127.0.0.1:3440;\".", 'that exact frame-src, which this step rewrites to the site\'s own origin.', 'restore it in index.html, or change the pattern here and in js/ark/stage.js (studioAllowed) together.');
  /* the packed shell names its host as static, so js/ark/cms-session.js asks no /api/session: nothing on a static host answers it, and the .fxn
     site server would send the whole 404.html with status 404 on every page load */
  /* and, when this pack ships the 3D view, it says so (defxn-view): js/ark/stage.js then takes the bundle as its source at once and asks no HEAD for
     /fxn-3d/view/index.html (a round trip before the home's 3D frame could start: 355 to 425 ms on the build node, 2026-11-11). A pack made with
     --without-3d writes no such mark, so the stage still asks */
  const CSP_META = '<meta http-equiv="Content-Security-Policy"', named = deployed.replace(CSP_META, '<meta name="defxn-host" content="static" />\n' + (hasView ? '<meta name="defxn-view" content="bundle" />\n' : '') + CSP_META);
  if (named === deployed) throw refuse('index.html has no ' + CSP_META + ' tag.', 'the tag this step writes the static host mark before.', 'restore the tag in index.html, or change the anchor here.');
  const shell = absoluteAssetUrls(named);
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

  /* WHAT NO PAGE REACHES LEAVES THE STAGE (--prune; speed lane 1, 2026-11-11). js/, css/ and assets/ are staged whole, so files only the
     editor or a retired page loads were shipped too. The list is derived (scripts/lib/stage-graph.mjs reads the staged folder; its header
     says what the reading cannot see), never typed here. broker.html is served beside the stage on defxn.com, so it is a root as well.
     Off unless --prune is passed, until one pruned cut has been walked; every removed file is printed with its bytes. */
  const pruned = opts.prune ? pruneNotReached(stage, ['js', 'css', 'assets'], { documents: fs.existsSync(path.join(ROOT, 'broker.html')) ? [{ name: 'broker.html', text: fs.readFileSync(path.join(ROOT, 'broker.html'), 'utf8') }] : [] }) : null;

  const shipped = new Set([...SHIP_FOLDERS, ...SHIP_FILES, 'index.html']);
  const leftOut = fs.readdirSync(ROOT).filter((name) => !shipped.has(name)).map((name) => {
    const reason = LEFT_OUT[name] || (STRAY_IMAGE.test(name) ? 'a review screenshot' : null);
    return { name, reason: reason || 'UNKNOWN: not in this script\'s list. Add it to SHIP_FOLDERS/SHIP_FILES if a page needs it, or to LEFT_OUT with its reason' };
  });
  return { routes: routes.length + 1, adminFiles, loaders, leftOut, pruned, view: hasView ? viewDir : null };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const stage = path.resolve(typeof args.stage === 'string' ? args.stage : fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-fxn-site-')));
  if (fs.existsSync(stage) && fs.readdirSync(stage).length) {
    throw refuse(`${stage} is not empty.`, 'an empty or new folder to stage the site in.', 'pass --stage <new folder>, or leave --stage out for a fresh temporary folder.');
  }
  fs.mkdirSync(stage, { recursive: true });
  const staged = stageSite(stage, { without3d: args['without-3d'] === true, prune: args.prune === true });

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
    staged.view ? `3D view shipped at /fxn-3d/view/ from ${staged.view}.` : 'NO 3D VIEW SHIPPED (--without-3d): the home shows no portal and the topic pages show no object.',
    staged.pruned
      ? `Removed from the stage, reached by no page (--prune): ${staged.pruned.length} files, ${staged.pruned.reduce((sum, row) => sum + row.bytes, 0)} bytes.\n${staged.pruned.map((row) => `  ${row.bytes} ${row.file}`).join('\n')}`
      : 'Files no page reaches were NOT removed (pass --prune; scripts/lib/stage-graph.mjs derives the list).',
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

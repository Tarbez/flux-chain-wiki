#!/usr/bin/env node
/* =====================================================================
   CUT THE SITE: one named, checked folder that both launch paths ship.
   ---------------------------------------------------------------------
   Layer: app (a build step of the DEFXN site Bundle). The kernel, the grammars and the engine learn nothing here.

   Owner ruling 2026-11-11: the site is reached two ways at launch. The pack goes to the stores and the FXN browser
   opens it by its name. The same folder also goes as static files behind Caddy for defxn.com. Both ship ONE cut,
   so both show the same bytes.

   Run:  node scripts/cut-site.mjs [--out <folder that holds cuts>] [--skip-builds] [--accept-loopback]
                                   [--fxn-3d <folder>] [--bundle-deploy <folder>]
   It deploys nothing and contacts no machine.
   Where: on the plan's build node (flx-nyc1), with the three repos side by side or named by the two flags. The owner's
   rule keeps node work for plan steps off his Mac. The cut folder comes back by tar; its served-files.sha256 proves it.

   What it does, in order:
     1. node scripts/loader-ground.mjs            the loader's first paint, written into index.html
     2. node scripts/build-shell.cjs              the shell bundles and their ?v= stamps
     3. node scripts/build-ark-vendor.cjs         npm run build:ark: the Ark bundles and the minified page scripts
     4. node ../fxn-3d/scripts/site-view-export.mjs   the static 3D view (about 1 to 2 minutes; the long step)
     5. node scripts/pack-fxn-site.mjs            stages the site and packs it (flux-folder-site/2)
     6. the checks below, then MANIFEST.txt, served-files.sha256 and FINDINGS.txt
   --skip-builds leaves out steps 1 to 4 and cuts the tree as it stands. The manifest says so.

   The cut folder: <out>/site-cut-<yyyymmdd>-<first 8 of the pack's content ID>/
     stage/                 the site folder. bundle-deploy publishes it; ops/deploy-defxn-site.sh sends it to a node.
     site.bundle            the pack's index (the blocks are read from stage/ at publish time).
     web-only/broker.html   what defxn.com serves and the pack leaves out (the identity broker has one origin).
     served-files.sha256    one line per file of stage/ and web-only/, as the static host will serve them.
     store-ids.txt          every content ID a byte store must hold for the pack: each block, then the index last.
     MANIFEST.txt           the cut's numbers, the document names, the three git heads, the verdict.
     FINDINGS.txt           every check with every hit (file and line).
     logs/                  the output of each build step.

   The checks. A FAIL refuses the cut: the verdict is REFUSED, the exit code is 1, and the deploy script will not
   send it. The folder stays so the findings can be read.
     3d-view        the stage holds /fxn-3d/view/, and its manifest holds the document each object's page picks
                    today (derived with the export's own rule: fxn-3d scripts/site-view-export.mjs documentOf).
     view-csp       the policy ops/caddy/defxn-site.caddy serves, read from the block: no view page and no page address
                    holds an inline script, an inline handler or a javascript: URL that policy refuses, and every
                    frame (the site's of the view, the view's of an object page, an object page's of the canvas
                    page) is allowed by the framing page's frame-src and by the framed page's own headers.
                    The exact case that stopped the 3D behind Caddy: a view policy with no frame-src.
     parked         no parked old-world file: js/world2, js/space, css/space, world/, or a .flx under a world folder.
     loopback       every 127.0.0.1 / localhost URL in shipped HTML, JS and CSS, with file, line and class.
                    Unclassified hits fail. The classes are a reading aid, found by position: a CSP line, a comment,
                    a test of the page's own address within 300 characters, or a quoted host with no scheme.
                    Read FINDINGS.txt before a launch. --accept-loopback is the owner's word that each unclassified
                    URL was read and may ship: the hits stay listed, and the manifest says the flag passed them.
     routes         every address of the page catalog is a file (<route>.html, a copy of the shell).
     shell-files    every script and style index.html loads, and every script the catalog names, is in the stage.
     cache-stamps   each built bundle's ?v= is the hash of its bytes; each 3D document's name carries its hash.
     pack-types     the pack is re-read: same content ID, and every file loaded as a script, style or module has a
                    type a browser accepts under nosniff (.cjs and .mjs are text/javascript).
                    The exact case that stops the 3D view: a .cjs sent as application/octet-stream.
     shell-region   which shape index.html's live script tags have, whether build-shell agrees with them, and
                    that the region did not change while the cut ran (two sessions write it).
     git            the heads of defxn, fxn-3d and bundle-deploy, and whether each tree is dirty. A dirty tree is
                    a WARN, printed loudly: the cut is real, and no commit names it. The deploy refuses it.
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readPageCatalog, readSiteRoutes } from './lib/site-routes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/* THE THREE ROOTS. defxn is this script's own repo. The other two stand beside it by default (the Mac's layout) and are named otherwise by
   --fxn-3d / FXN_3D_DIR and --bundle-deploy / BUNDLE_DEPLOY_DIR, the names scripts/lib/fxn-3d-closure.mjs and scripts/pack-fxn-site.mjs read.
   setRoots puts them in the environment, so every step this script starts reads the same three folders. EDIT_DIR (the 3D documents' folder,
   default <fxn-3d>/world/edit) passes through to the export untouched. */
let FXN_3D = path.resolve(process.env.FXN_3D_DIR || path.join(ROOT, '..', 'fxn-3d'));
let BUNDLE_DEPLOY = path.resolve(process.env.BUNDLE_DEPLOY_DIR || path.join(ROOT, '..', 'bundle-deploy'));
let REPOS = [];
let BUILD_STEPS = [];
function setRoots(opts) {
  if (opts.fxn3d) FXN_3D = path.resolve(opts.fxn3d);
  if (opts.bundleDeploy) BUNDLE_DEPLOY = path.resolve(opts.bundleDeploy);
  for (const [name, dir, probe] of [['fxn-3d', FXN_3D, 'scripts/site-view-export.mjs'], ['bundle-deploy', BUNDLE_DEPLOY, 'src/folder-archive.js']]) {
    if (!fs.existsSync(path.join(dir, probe))) throw refuse(`${name} is not at ${dir} (${probe} is not there).`, `the ${name} repo.`, `put it beside ${ROOT}, or pass --${name} <folder>.`);
  }
  Object.assign(process.env, { FXN_3D_DIR: FXN_3D, BUNDLE_DEPLOY_DIR: BUNDLE_DEPLOY, DEFXN_DIR: ROOT });
  REPOS = [['defxn', ROOT], ['fxn-3d', FXN_3D], ['bundle-deploy', BUNDLE_DEPLOY]];
  BUILD_STEPS = [
    ['loader-ground', ROOT, ['scripts/loader-ground.mjs']],
    ['build-shell', ROOT, ['scripts/build-shell.cjs']],
    ['build-ark', ROOT, ['scripts/build-ark-vendor.cjs']],
    ['site-view-export', FXN_3D, ['scripts/site-view-export.mjs']],
  ];
}
const VIEW = 'fxn-3d/view';
/* what defxn.com serves and the pack leaves out, with the reason (scripts/pack-fxn-site.mjs LEFT_OUT has the other side) */
const WEB_ONLY = { 'broker.html': 'js/ark/broker-client.js pins the identity broker to https://defxn.com/broker.html' };
const TEXT_KINDS = /\.(html|js|mjs|cjs|css)$/;
const SCRIPT_TYPE = /^text\/javascript\b/, STYLE_TYPE = /^text\/css\b/;
const LOOPBACK = /(?:https?|wss?):\/\/(?:127\.\d+\.\d+\.\d+|localhost|\[::1\]|0\.0\.0\.0)(?::[\d*]+)?|(['"`])(?:127\.0\.0\.1|localhost)\1/g;
/* a test of the page's own address: the code asks where it is served from before it uses the loopback URL */
const OWN_ADDRESS_TEST = /location\.(?:hostname|host|origin|protocol|href)|studioAllowed|isLoopback|isLocal\w*|localDevelopment|servedLocally|file:/;

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

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

function walkFiles(dir, visit, base = dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, visit, base);
    else if (entry.isFile()) visit(path.relative(base, full).split(path.sep).join('/'), full);
  }
}

function run(name, cwd, args, logDir) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  fs.writeFileSync(path.join(logDir, `${name}.log`), `$ node ${args.join(' ')}   (in ${cwd})\n--- stdout\n${r.stdout || ''}\n--- stderr\n${r.stderr || ''}\n--- exit ${r.status}\n`);
  if (r.status !== 0) {
    throw refuse(`The step ${name} failed (exit ${r.status}): ${(r.stderr || r.stdout || String(r.error || '')).trim().split('\n').slice(-3).join(' | ')}`, `a clean run of node ${args.join(' ')} in ${cwd}.`, `read ${path.join(logDir, `${name}.log`)}, fix what it names, and run the cut again.`);
  }
  return { name, ms: Date.now() - t0, stdout: r.stdout || '', stderr: r.stderr || '' };
}

/** One repo's head and whether its tree differs from it. `git status` is one bounded call; a failure is "not read", never "clean". */
function gitState(dir) {
  const git = (...args) => spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8', timeout: 60000, maxBuffer: 32 * 1024 * 1024 });
  const head = git('rev-parse', 'HEAD'), branch = git('rev-parse', '--abbrev-ref', 'HEAD'), status = git('status', '--porcelain');
  if (head.status !== 0 || status.status !== 0) return { read: false, reason: (head.stderr || status.stderr || String(status.error || 'git did not answer')).trim() };
  const lines = status.stdout.split('\n').filter(Boolean);
  return { read: true, head: head.stdout.trim(), branch: branch.stdout.trim(), changed: lines.filter((l) => !l.startsWith('??')).length, untracked: lines.filter((l) => l.startsWith('??')).length, lines };
}

/* ---------- the checks: each returns { check, status: 'PASS' | 'WARN' | 'FAIL', summary, lines[] } ---------- */

async function check3dView(stage) {
  const lines = [], fail = [];
  const viewDir = path.join(stage, VIEW), page = path.join(viewDir, 'index.html');
  if (!fs.existsSync(page)) return { check: '3d-view', status: 'FAIL', summary: `${VIEW}/index.html is not in the stage`, lines: [], docs: [] };
  /* WHERE THE VIEW'S MODULES ARE (2026-11-11, fxn-3d scripts/site-view-export.mjs "CONTENT NAMES"): the view page's own script names their folder
     on its ROOT line (built/<hash16>/, named by the hash of the folder; './' in a view built before that). Read from the page, never typed here */
  const pageScripts = [...fs.readFileSync(page, 'utf8').matchAll(/<script\b[^>]*?\bsrc="([^"?#]+)"/g)].map((s) => path.join(viewDir, s[1])).filter((f) => fs.existsSync(f));
  const rootLine = pageScripts.map((f) => /\bconst ROOT = '\.\/([^']*)';/.exec(fs.readFileSync(f, 'utf8'))).find(Boolean);
  if (!rootLine) return { check: '3d-view', status: 'FAIL', summary: `${VIEW}/index.html loads no script with a ROOT line: where the view's modules are could not be read. Run the export again.`, lines: [], docs: [] };
  const modulesRel = `${VIEW}/${rootLine[1]}js/editor/view-source.mjs`, source = path.join(stage, modulesRel);
  const m = /export const STATIC_VIEW = (\{.*\});/.exec(fs.existsSync(source) ? fs.readFileSync(source, 'utf8') : '');
  if (!m) return { check: '3d-view', status: 'FAIL', summary: `${modulesRel} holds no STATIC_VIEW manifest: the view would ask a studio for its documents`, lines: [], docs: [] };
  lines.push(`the view's modules: ${VIEW}/${rootLine[1] || '(the view folder itself)'}`);
  const manifest = JSON.parse(m[1]);
  for (const [doc, rel] of Object.entries(manifest.docs)) {
    if (fs.existsSync(path.join(viewDir, rel))) lines.push(`document ${doc}: ${VIEW}/${rel}`);
    else fail.push(`document ${doc}: ${VIEW}/${rel} is named by the manifest and is not in the stage`);
  }
  for (const [cid, ext] of Object.entries(manifest.pictures || {})) {
    if (!fs.existsSync(path.join(viewDir, 'edit', 'blob', `${cid}.${ext}`))) fail.push(`picture ${cid}.${ext} is named by the manifest and is not in ${VIEW}/edit/blob/`);
  }
  /* the newest documents: the export's own rule, applied now to the index as it stands */
  let expected = [];
  try {
    const exp = await import(pathToFileURL(path.join(FXN_3D, 'scripts', 'site-view-export.mjs')).href);
    const objects = exp.siteObjects(ROOT), names = [...objects.hero, ...objects.topic.filter((o) => !objects.hero.includes(o))], rows = exp.readIndex();
    expected = names.map((object) => ({ object, doc: exp.documentOf(object, rows).doc }));
    for (const { object, doc } of expected) {
      if (manifest.docs[doc]) lines.push(`object ${object}: its page picks ${doc}, and the view ships it`);
      else fail.push(`object ${object}: its page picks ${doc} today, and the view ships ${Object.keys(manifest.docs).filter((d) => d.startsWith(object)).join(', ') || 'no document of that name'}. Run the export again.`);
    }
  } catch (error) {
    fail.push(`the newest documents could not be derived from ${path.join(FXN_3D, 'scripts', 'site-view-export.mjs')}: ${error.message}`);
  }
  const extra = Object.keys(manifest.docs).filter((d) => !expected.some((e) => e.doc === d));
  if (extra.length) lines.push(`also shipped, asked for by name by a module of the view: ${extra.join(', ')}`);
  return { check: '3d-view', status: fail.length ? 'FAIL' : 'PASS', summary: `${expected.length} objects, ${Object.keys(manifest.docs).length} documents and ${Object.keys(manifest.pictures || {}).length} pictures in the view's manifest${fail.length ? `, ${fail.length} misses` : ''}`, lines: [...fail.map((l) => `FAIL ${l}`), ...lines], docs: expected, extraDocs: extra, manifest };
}

function checkParked(stage, files) {
  const fail = [], info = [];
  for (const dir of ['js/world2', 'js/space', 'css/space', 'world']) if (fs.existsSync(path.join(stage, dir))) fail.push(`${dir}/ is in the stage: the old 3D world is parked (js/ark/world-parked.js) and ships with no cut`);
  for (const file of files) {
    if (!file.endsWith('.flx')) continue;
    if (/(^|\/)world\//.test(file)) fail.push(`${file}: a .flx record under a world folder`);
    else info.push(`${file}: a .flx file outside any world folder (not a world record; listed so it is seen)`);
  }
  return { check: 'parked', status: fail.length ? 'FAIL' : 'PASS', summary: fail.length ? `${fail.length} parked old-world entries in the stage` : `no parked old-world file${info.length ? `; ${info.length} other .flx listed` : ''}`, lines: [...fail.map((l) => `FAIL ${l}`), ...info] };
}

/** Every loopback URL in shipped text, classed by where it stands. Shell copies repeat one line, so equal hits are folded. */
function checkLoopback(stage, files, acceptUnclassified = false) {
  const folded = new Map();
  for (const file of files) {
    if (!TEXT_KINDS.test(file)) continue;
    const text = fs.readFileSync(path.join(stage, file), 'utf8');
    LOOPBACK.lastIndex = 0;
    let lineStart = 0, lineNo = 1, cursor = 0;
    for (let m = LOOPBACK.exec(text); m; m = LOOPBACK.exec(text)) {
      for (let nl = text.indexOf('\n', cursor); nl !== -1 && nl < m.index; nl = text.indexOf('\n', cursor)) { lineNo += 1; lineStart = nl + 1; cursor = nl + 1; }
      const lineEndRaw = text.indexOf('\n', m.index), lineEnd = lineEndRaw === -1 ? text.length : lineEndRaw;
      const line = text.slice(lineStart, lineEnd), near = text.slice(Math.max(0, m.index - 300), Math.min(text.length, m.index + 300));
      const before = text.slice(lineStart, m.index), blockOpen = text.lastIndexOf('/*', m.index), blockClose = text.lastIndexOf('*/', m.index);
      /* an open block comment counts only when its opener stands where code can start: '/api/*' inside a string opens nothing.
         A // counts only on a line short enough to be written by hand: a minified line holds // inside strings and patterns */
      const inBlock = blockOpen !== -1 && blockOpen > blockClose && (blockOpen === 0 || /[\s;{}(),]/.test(text[blockOpen - 1]));
      const afterSlashes = line.length < 600 && /(^|[\s;{}(),])\/\//.test(before);
      let cls;
      if (line.includes('Content-Security-Policy')) cls = 'csp-allowance';
      else if (/^\s*(\/\/|\*|<!--)/.test(line) || afterSlashes || inBlock) cls = 'comment';
      else if (OWN_ADDRESS_TEST.test(near)) cls = 'own-address-test-nearby';
      /* a quoted host with no scheme is a name the code compares with, or prose; nothing can be fetched from it as it stands */
      else if (m[1]) cls = 'bare-host-name';
      else cls = acceptUnclassified ? 'ACCEPTED-BY-FLAG' : 'UNCLASSIFIED';
      const snippet = text.slice(Math.max(lineStart, m.index - 70), Math.min(lineEnd, m.index + 90)).replace(/\s+/g, ' ').trim();
      const key = `${cls}\u0000${m[0]}\u0000${snippet}`;
      const hit = folded.get(key) || { cls, url: m[0], snippet, at: [] };
      hit.at.push(`${file}:${lineNo}`);
      folded.set(key, hit);
    }
  }
  const hits = [...folded.values()].sort((a, b) => a.cls.localeCompare(b.cls) || a.at[0].localeCompare(b.at[0]));
  const byClass = {};
  for (const h of hits) byClass[h.cls] = (byClass[h.cls] || 0) + h.at.length;
  const lines = hits.map((h) => `${h.cls === 'UNCLASSIFIED' ? 'FAIL ' : ''}${h.cls}  ${h.url}  ${h.at[0]}${h.at.length > 1 ? ` (+${h.at.length - 1} more: ${h.at.slice(1, 4).join(', ')}${h.at.length > 4 ? ', ...' : ''})` : ''}  | ${h.snippet}`);
  const counts = Object.entries(byClass).map(([c, n]) => `${c} ${n}`).join(', ') || 'none';
  const status = byClass.UNCLASSIFIED ? 'FAIL' : hits.length ? 'WARN' : 'PASS';
  const accepted = byClass['ACCEPTED-BY-FLAG'] ? `; ${byClass['ACCEPTED-BY-FLAG']} UNCLASSIFIED URLS WERE ACCEPTED BY --accept-loopback, not by a check` : '';
  return { check: 'loopback', status, summary: `${hits.reduce((n, h) => n + h.at.length, 0)} loopback URLs in shipped HTML, JS and CSS (${counts}); ${hits.length} distinct${accepted}`, lines, byClass };
}

function checkRoutes(stage) {
  const routes = [...readSiteRoutes(ROOT)].sort(), fail = [];
  const shell = fs.existsSync(path.join(stage, 'index.html')) ? fs.readFileSync(path.join(stage, 'index.html')) : null;
  for (const route of routes) {
    const rel = route === '/' ? 'index.html' : `${route.slice(1)}.html`, file = path.join(stage, rel);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) fail.push(`${route}: ${rel} is not in the stage`);
    else if (shell && !fs.readFileSync(file).equals(shell)) fail.push(`${route}: ${rel} is not a copy of the shell`);
  }
  if (!fs.existsSync(path.join(stage, '404.html'))) fail.push('404.html is not in the stage');
  return { check: 'routes', status: fail.length ? 'FAIL' : 'PASS', summary: `${routes.length} page addresses in the catalog, ${routes.length - fail.length} are files in the stage`, lines: fail.map((l) => `FAIL ${l}`), routes };
}

/** The tags the browser runs: index.html less its inert <template id="shell-sources"> list. */
function liveTags(html) {
  const live = html.replace(/<template id="shell-sources">[\s\S]*?<\/template>/, '');
  return [...live.matchAll(/<(script|link)\b[^>]*?\b(?:src|href)="([^"]+)"[^>]*>/g)].map((m) => ({ tag: m[1], url: m[2], whole: m[0] })).filter((t) => !/^(?:[a-z]+:)?\/\//.test(t.url) && !t.url.startsWith('data:'));
}
const fileOfUrl = (url) => url.replace(/[?#].*$/, '').replace(/^\//, '');

function checkShellFiles(stage) {
  const fail = [], tags = liveTags(fs.readFileSync(path.join(stage, 'index.html'), 'utf8'));
  for (const t of tags) if (!fs.existsSync(path.join(stage, fileOfUrl(t.url)))) fail.push(`index.html loads ${t.url}, and ${fileOfUrl(t.url)} is not in the stage`);
  const scripts = [...new Set(Object.values(readPageCatalog(ROOT)).flatMap((entry) => entry.scripts || []))];
  for (const s of scripts) if (!fs.existsSync(path.join(stage, fileOfUrl(s)))) fail.push(`the page catalog names the script ${s}, and it is not in the stage`);
  return { check: 'shell-files', status: fail.length ? 'FAIL' : 'PASS', summary: `${tags.length} scripts and styles in index.html and ${scripts.length} catalog scripts, ${fail.length} missing`, lines: fail.map((l) => `FAIL ${l}`) };
}

function checkCacheStamps(stage, view) {
  const fail = [], lines = [], tags = liveTags(fs.readFileSync(path.join(stage, 'index.html'), 'utf8'));
  let built = 0;
  for (const t of tags) {
    const file = fileOfUrl(t.url), stamp = /[?&]v=([^&#]+)/.exec(t.url);
    /* css/bundle joined on 2026-11-11: defxn-site.caddy keeps css/bundle/*?v= for a year, so its stamp must be its bytes' hash too */
    const isBuilt = /^js\/bundle\/shell-\d+\.js$/.test(file) || /^css\/bundle\/shell-\d+\.css$/.test(file) || file === 'js/min/manifest.js';
    if (isBuilt) {
      built += 1;
      const want = fs.existsSync(path.join(stage, file)) ? sha256(fs.readFileSync(path.join(stage, file))).slice(0, 8) : null;
      if (!stamp) fail.push(`${file}: a built bundle with no ?v= stamp`);
      else if (stamp[1] !== want) fail.push(`${file}: stamped ?v=${stamp[1]}, and its bytes hash to ${want}. A browser would keep the old copy. Run the build steps again.`);
      else lines.push(`${file}?v=${stamp[1]}: the stamp is the hash of its bytes`);
    } else if (t.tag === 'script' || /rel="stylesheet"/.test(t.whole)) {
      lines.push(stamp ? `${file}?v=${stamp[1]}: stamped by hand` : `${file}: NO STAMP (served no-cache by defxn-site.caddy, so a browser asks again each visit)`);
    }
  }
  if (!built) fail.push('index.html loads no js/bundle/shell-<n>.js: the shell was not built');
  let docs = 0;
  for (const [doc, rel] of Object.entries((view && view.manifest && view.manifest.docs) || {})) {
    const file = path.join(stage, VIEW, rel), named = /\.([0-9a-f]{16})\.fxn\.gz$/.exec(rel);
    if (!named) { fail.push(`3D document ${doc}: ${rel} carries no hash in its name`); continue; }
    if (!fs.existsSync(file)) continue;   /* the 3d-view check names it */
    const got = sha256(zlib.gunzipSync(fs.readFileSync(file))).slice(0, 16);
    if (got !== named[1]) fail.push(`3D document ${doc}: named ${named[1]}, and its text hashes to ${got}`); else docs += 1;
  }
  lines.push(`${docs} 3D documents carry the hash of their text in their names`);
  const unstamped = lines.filter((l) => l.includes('NO STAMP')).length;
  return { check: 'cache-stamps', status: fail.length ? 'FAIL' : 'PASS', summary: `${built} built bundles and ${docs} 3D documents are stamped by content; ${unstamped} scripts or styles in index.html carry no stamp${fail.length ? `; ${fail.length} misses` : ''}`, lines: [...fail.map((l) => `FAIL ${l}`), ...lines] };
}

/** Which staged files a browser loads as a script, a module or a style: tags in every HTML file, and import lines in every script. */
function loadedAsCode(stage, files) {
  const set = new Set(files), asScript = new Map(), asStyle = new Map();
  const note = (map, target, from) => { if (set.has(target) && !map.has(target)) map.set(target, from); };
  const resolve = (from, spec) => (spec.startsWith('/') ? spec.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(from), spec))).replace(/[?#].*$/, '');
  for (const file of files) {
    const ext = path.extname(file);
    if (!['.html', '.js', '.mjs', '.cjs'].includes(ext)) continue;
    const text = fs.readFileSync(path.join(stage, file), 'utf8');
    if (ext === '.html') {
      for (const m of text.matchAll(/<script\b[^>]*?\bsrc="([^"]+)"/g)) if (!/^(?:[a-z]+:)?\/\//.test(m[1])) note(asScript, resolve(file, m[1]), file);
      for (const m of text.matchAll(/<link\b[^>]*?>/g)) { const href = /\bhref="([^"]+)"/.exec(m[0]); if (href && /rel="(?:stylesheet|modulepreload)"/.test(m[0]) && !/^(?:[a-z]+:)?\/\//.test(href[1])) note(/modulepreload/.test(m[0]) ? asScript : asStyle, resolve(file, href[1]), file); }
    }
    for (const m of text.matchAll(/\bimport\s*(?:[\w*${}\s,]+?\s*from\s*)?(['"])(\.{0,2}\/[^'"\n]+)\1|\bimport\(\s*(['"])(\.{0,2}\/[^'"\n]+)\3\s*\)|\bfrom\s+(['"])(\.{0,2}\/[^'"\n]+)\5/g)) note(asScript, resolve(file, m[2] || m[4] || m[6]), file);
  }
  return { asScript, asStyle };
}

async function checkPackTypes(stage, files, cidPrinted) {
  const fail = [], lines = [];
  const { packSite } = await import(pathToFileURL(path.join(BUNDLE_DEPLOY, 'src', 'folder-archive.js')).href);
  const packed = await packSite(stage, { format: 'auto' });
  if (packed.cid !== cidPrinted) fail.push(`the stage packs to ${packed.cid} now, and the pack step printed ${cidPrinted}: the stage changed after it was packed`);
  const typeOf = new Map(packed.files.map((f) => [f.path, f.contentType]));
  const { asScript, asStyle } = loadedAsCode(stage, files);
  for (const f of packed.files) {
    const ext = path.extname(f.path);
    if (['.js', '.mjs', '.cjs'].includes(ext) && !SCRIPT_TYPE.test(f.contentType)) fail.push(`${f.path}: packed as ${f.contentType}; a browser refuses a script of that type under nosniff`);
    if (ext === '.css' && !STYLE_TYPE.test(f.contentType)) fail.push(`${f.path}: packed as ${f.contentType}; a browser refuses a style of that type under nosniff`);
  }
  for (const [file, from] of asScript) if (!SCRIPT_TYPE.test(typeOf.get(file) || '') && !/^application\/json\b/.test(typeOf.get(file) || '')) fail.push(`${file}: loaded as a script or module by ${from}, packed as ${typeOf.get(file)}`);
  for (const [file, from] of asStyle) if (!STYLE_TYPE.test(typeOf.get(file) || '')) fail.push(`${file}: loaded as a style by ${from}, packed as ${typeOf.get(file)}`);
  const byType = {};
  for (const f of packed.files) { const key = `${path.extname(f.path) || '(none)'} ${f.contentType}`; byType[key] = (byType[key] || 0) + 1; }
  for (const [key, n] of Object.entries(byType).sort()) lines.push(`${n} files: ${key}`);
  const count = (ext) => packed.files.filter((f) => f.path.endsWith(ext)).length;
  const coreSays = fs.readFileSync(path.join(BUNDLE_DEPLOY, 'src', 'folder-site-core.js'), 'utf8').includes("'.cjs': 'text/javascript");
  const coreDirty = spawnSync('git', ['-C', BUNDLE_DEPLOY, 'diff', '--quiet', 'HEAD', '--', 'src/folder-site-core.js']).status !== 0;
  lines.unshift(`bundle-deploy src/folder-site-core.js ${coreSays ? 'types .cjs as text/javascript' : 'DOES NOT type .cjs'}${coreDirty ? ', and that file differs from its commit: commit it before a real cut' : ', and that file is committed'}`);
  if (!coreSays && count('.cjs')) fail.push('bundle-deploy src/folder-site-core.js has no .cjs line, and the stage holds .cjs files');
  const uniq = [...new Set(fail)];
  return { check: 'pack-types', status: uniq.length ? 'FAIL' : 'PASS', summary: `pack re-read: ${packed.files.length} files, ${count('.mjs')} .mjs and ${count('.cjs')} .cjs typed for a browser, ${asScript.size} files loaded as script or module and ${asStyle.size} as style${uniq.length ? `; ${uniq.length} misses` : ''}`, lines: [...uniq.map((l) => `FAIL ${l}`), ...lines], packed, coreDirty };
}

/* THE SHELL REGION (audit F04: two writers of index.html's live script tags, two shapes). scripts/build-shell.cjs writes the region between
   <!-- shell:begin --> and <!-- shell:end -->; another session has rewritten the three loader tags with data-shell="loader" between builds.
   The cut says which shape it found, asks build-shell itself whether the region is the one it writes, and fails when the region differs
   between the moment the builds ended, the staged shell, and the end of the cut: a region that moved under the cut is a cut of two trees. */
const LOADER_TAG = /<script\b[^>]*\bsrc="\/?js\/content\/(?:manifests|assets|secrets)\/index\.js[^"]*"[^>]*>/g;
function shellRegion(html) {
  const m = /<!-- shell:begin -->([\s\S]*?)<!-- shell:end -->/.exec(html);
  return m ? m[1].trim() : null;
}
function readShell() {
  const region = shellRegion(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'));
  return { region, hash: region === null ? null : sha256(region).slice(0, 16) };
}
function checkShellRegion(stage, before) {
  const fail = [], lines = [], after = readShell();
  if (before.region === null || after.region === null) return { check: 'shell-region', status: 'FAIL', summary: 'index.html has no <!-- shell:begin --> ... <!-- shell:end --> region', lines: [] };
  const loaders = before.region.match(LOADER_TAG) || [], marked = loaders.filter((t) => /data-shell="loader"/.test(t)).length;
  const shape = marked === 0 ? 'plain loader tags (no data-shell attribute)' : marked === loaders.length ? 'loader tags marked data-shell="loader"' : `MIXED: ${marked} of ${loaders.length} loader tags marked data-shell="loader"`;
  lines.push(`shape: ${loaders.length} loader tags, ${shape}`);
  lines.push(`region when the builds ended: ${before.hash}; at the end of the cut: ${after.hash}`);
  if (after.hash !== before.hash) fail.push(`index.html's shell region changed while the cut ran (${before.hash} -> ${after.hash}): another writer touched it. Cut again when it is still.`);
  const staged = shellRegion(fs.readFileSync(path.join(stage, 'index.html'), 'utf8'));
  const expected = before.region.replace(/\b(src|href)="(js|css|assets)\//g, '$1="/$2/');
  if (staged !== expected) fail.push('the staged shell\'s region is not the region index.html held when the builds ended: the pack read another index.html');
  if (marked !== 0 && marked !== loaders.length) fail.push('the loader tags are in two shapes at once');
  const built = spawnSync(process.execPath, ['scripts/build-shell.cjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
  if (built.status === 0) lines.push('scripts/build-shell.cjs --check: clean, so the region is the one build-shell writes');
  else fail.push(`scripts/build-shell.cjs --check reports drift: the region is not the one build-shell writes (${(built.stderr || built.stdout || '').trim().split('\n').slice(-2).join(' | ')})`);
  for (const l of `${built.stdout || ''}${built.stderr || ''}`.split('\n').filter((line) => /note:/.test(line))) lines.push(l.trim());
  return { check: 'shell-region', status: fail.length ? 'FAIL' : 'PASS', summary: `${shape}; region ${before.hash}${fail.length ? `; ${fail.length} misses` : ', unchanged through the cut'}`, lines: [...fail.map((l) => `FAIL ${l}`), ...lines] };
}

/* THE SERVED POLICY (2026-11-11, launch blocker: behind ops/caddy/defxn-site.caddy the 3D could not draw, and every earlier check passed, because the
   plain static servers used in the proofs sent no Content-Security-Policy). This check reads the Caddy block as written and judges the staged pages
   by the policy each one is served with:
     inline code   no page may hold an inline script, an inline event handler or a javascript: URL its policy refuses. The reader is the export's own
                   (fxn-3d scripts/site-view-export.mjs inlineCodeOf). A view page or a page address of the catalog fails the cut; another HTML file of
                   the stage (the gateway shell's pages, served for *.defxn.com by another block) is listed as a WARN.
     frames        every frame is followed: the site's frame of the view (js/ark/stage.js BUNDLE_VIEW), and each frame a view page sets (an <iframe>'s
                   src, or the address its script assigns). The address is read from the code as a pattern (typed text kept, anything computed is *),
                   matched against the stage, and judged twice: the framing page's frame-src must allow it, and the framed page's own headers
                   (frame-ancestors, X-Frame-Options) must allow this site. A frame whose address cannot be read fails by name. */
const CADDY_BLOCK = path.join('ops', 'caddy', 'defxn-site.caddy');
const parseCsp = (text) => new Map(String(text || '').split(';').map((d) => d.trim().split(/\s+/)).filter((p) => p[0]).map((p) => [p[0].toLowerCase(), p.slice(1)]));
/** The sources a policy gives one kind of load: the directive's own, else the first fallback the policy states. null: the policy does not limit it. */
function sourcesOf(csp, ...directives) {
  for (const d of directives) if (csp.has(d)) return csp.get(d);
  return null;
}
function readCaddyPolicy() {
  const live = fs.readFileSync(path.join(ROOT, CADDY_BLOCK), 'utf8').split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
  const block = (opener) => {
    const at = live.indexOf(`\n\t${opener} {\n`);
    if (at === -1) return null;
    const body = live.slice(at, live.indexOf('\n\t}', at));
    const csp = /Content-Security-Policy\s+"([^"]*)"/.exec(body), xfo = /X-Frame-Options\s+"([^"]*)"/.exec(body);
    return { raw: csp ? csp[1] : null, csp: parseCsp(csp ? csp[1] : ''), xfo: xfo ? xfo[1] : null };
  };
  const matcher = /^\s*@view\s+path\s+(.+)$/m.exec(live);
  return { site: block('header'), view: block('header @view'), viewPaths: matcher ? matcher[1].trim().split(/\s+/) : [] };
}
/** A frame address as written in code -> a pattern: typed text is kept, a name set once to typed text is replaced by it, the rest is '*'. */
function addressPattern(expr, script) {
  let rest = expr.trim(), out = '';
  for (;;) {
    const m = /^(?:'([^']*)'|"([^"]*)"|`([^`$]*)`|([A-Za-z_$][\w$]*))\s*(\+\s*|$)/.exec(rest);
    if (!m) { if (rest) out += '*'; break; }
    if (m[4]) { const set = new RegExp(`\\b(?:const|var|let)\\s+${m[4].replace(/\$/g, '\\$')}\\s*=\\s*(?:'([^']*)'|"([^"]*)")\\s*[;,]`).exec(script); out += set ? set[1] ?? set[2] : '*'; }
    else out += m[1] ?? m[2] ?? m[3];
    rest = rest.slice(m[0].length);
  }
  return out.replace(/[?#].*$/, '').replace(/\*+/g, '*');
}
async function checkViewCsp(stage, files) {
  const fail = [], warn = [], lines = [];
  let policy;
  try { policy = readCaddyPolicy(); } catch (error) { return { check: 'view-csp', status: 'FAIL', summary: `${CADDY_BLOCK} could not be read: ${error.message}`, lines: [] }; }
  if (!policy.site || !policy.site.raw) return { check: 'view-csp', status: 'FAIL', summary: `${CADDY_BLOCK} has no first \`header {\` block with a Content-Security-Policy`, lines: [] };
  if (!policy.view || !policy.view.raw) return { check: 'view-csp', status: 'FAIL', summary: `${CADDY_BLOCK} has no \`header @view {\` block with a Content-Security-Policy`, lines: [] };
  let inlineCodeOf;
  try { ({ inlineCodeOf } = await import(pathToFileURL(path.join(FXN_3D, 'scripts', 'site-view-export.mjs')).href)); } catch (error) { inlineCodeOf = null; }
  if (typeof inlineCodeOf !== 'function') return { check: 'view-csp', status: 'FAIL', summary: `${path.join(FXN_3D, 'scripts', 'site-view-export.mjs')} exports no inlineCodeOf: this fxn-3d tree is older than the export that moves inline code out of the view's pages`, lines: [] };
  lines.push(`site policy (${CADDY_BLOCK}, first header block): ${policy.site.raw}`);
  lines.push(`view policy (header @view, paths ${policy.viewPaths.join(' ')}): ${policy.view.raw}`);
  if (/\{\$/.test(policy.view.raw)) fail.push(`the view policy reads a value from the node's environment (${/\{\$[^}]*\}/.exec(policy.view.raw)[0]}): a node without it serves another policy than the one checked here`);

  const underView = (rel) => policy.viewPaths.some((p) => (p.endsWith('*') ? `/${rel}`.startsWith(p.slice(0, -1)) : `/${rel}` === p));
  const headersFor = (rel) => (underView(rel) ? policy.view : policy.site);
  const routeFiles = new Set([...readSiteRoutes(ROOT)].map((route) => (route === '/' ? 'index.html' : `${route.slice(1)}.html`)).concat('404.html', Object.keys(WEB_ONLY)));
  const pages = [...files.filter((f) => f.endsWith('.html')).map((f) => [f, path.join(stage, f)]), ...Object.keys(WEB_ONLY).map((f) => [f, path.join(ROOT, f)])];

  /* inline code, judged by the page's own policy; equal hits (the 106 copies of the shell) are folded */
  const folded = new Map();
  let viewPages = 0;
  for (const [rel, full] of pages) {
    if (rel.startsWith(`${VIEW}/`)) viewPages += 1;
    const script = sourcesOf(headersFor(rel).csp, 'script-src', 'default-src');
    if (script === null) continue;
    const anyInline = script.includes("'unsafe-inline'") && !script.some((s) => /^'(sha(256|384|512)|nonce)-/.test(s));
    for (const hit of inlineCodeOf(fs.readFileSync(full, 'utf8'))) {
      if (anyInline || (hit.kind === 'script' && script.includes(`'${hit.hash}'`))) continue;
      const must = rel.startsWith(`${VIEW}/`) || routeFiles.has(rel), key = `${must}\u0000${hit.kind}\u0000${hit.what}`;
      const entry = folded.get(key) || { must, hit, at: [] };
      entry.at.push(`${rel}:${hit.line}`); folded.set(key, entry);
    }
  }
  for (const { must, hit, at } of folded.values()) {
    const text = `${at[0]}${at.length > 1 ? ` (+${at.length - 1} more)` : ''}: an inline ${hit.kind} (${hit.what}) that the served script-src refuses`;
    if (must) fail.push(`${text}. Move it into a file (the view: run the export again; a site page: load it with src).`);
    else warn.push(`${text}. This file is not a page address of the catalog; it is served by this block too, and would not run there.`);
  }

  /* frames */
  const fileSet = new Set(files), frames = [];
  const judge = (fromRel, pattern, how) => {
    const from = headersFor(fromRel), src = sourcesOf(from.csp, 'frame-src', 'child-src', 'default-src');
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(pattern)) {
      const origin = /^(?:[a-z][a-z0-9+.-]*:)?\/\/[^/*]+/i.exec(pattern);
      if (src !== null && !src.includes('*') && !(origin && src.includes(origin[0]))) fail.push(`${fromRel} frames ${pattern} (${how}), and its policy's frame-src (${src.join(' ') || "'none'"}) does not name it`);
      else lines.push(`frame: ${fromRel} -> ${pattern} (${how}), named by frame-src`);
      return;
    }
    if (!pattern || pattern.startsWith('*')) { fail.push(`${fromRel} sets a frame address this check cannot read (${how}): it starts with a computed value`); return; }
    const abs = pattern.startsWith('/') ? pattern.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), pattern));
    const re = new RegExp(`^${abs.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')}$`), hits = files.filter((f) => re.test(f));
    if (!hits.length) { fail.push(`${fromRel} frames ${abs} (${how}), and the stage holds no such file`); return; }
    if (src !== null && !src.includes("'self'") && !src.includes('*')) fail.push(`${fromRel} frames ${abs} (${how}; ${hits.length} pages of this site), and its policy has ${from.csp.has('frame-src') ? `frame-src ${src.join(' ') || "'none'"}` : `no frame-src, so ${from.csp.has('child-src') ? 'child-src' : 'default-src'} ${src.join(' ') || "'none'"} decides`}: the browser refuses the frame`);
    const refused = hits.filter((f) => { const to = headersFor(f), anc = sourcesOf(to.csp, 'frame-ancestors'); return (anc !== null && !anc.includes("'self'") && !anc.includes('*')) || /^deny$/i.test(to.xfo || ''); });
    if (refused.length) fail.push(`${fromRel} frames ${abs} (${how}), and ${refused.length} of the ${hits.length} framed pages answer with headers that refuse a frame (first: ${refused[0]}, frame-ancestors ${(sourcesOf(headersFor(refused[0]).csp, 'frame-ancestors') || []).join(' ')}, X-Frame-Options ${headersFor(refused[0]).xfo})`);
    frames.push({ from: fromRel, to: abs, pages: hits.length });
    lines.push(`frame: ${fromRel} -> ${abs} (${how}): ${hits.length} page${hits.length === 1 ? '' : 's'} in the stage, frame-src ${src === null ? 'not limited' : src.join(' ')}; the framed pages answer frame-ancestors ${(sourcesOf(headersFor(hits[0]).csp, 'frame-ancestors') || ['(none stated)']).join(' ')}, X-Frame-Options ${headersFor(hits[0]).xfo}`);
  };
  /* the site's own frame of the view */
  const stageJs = fs.readFileSync(path.join(ROOT, 'js', 'ark', 'stage.js'), 'utf8'), bundleView = /\bBUNDLE_VIEW\s*=\s*'([^']+)'/.exec(stageJs);
  if (!bundleView) fail.push("js/ark/stage.js names no BUNDLE_VIEW = '<path>': the address the site frames the 3D view at could not be read");
  else judge('index.html', bundleView[1], 'js/ark/stage.js BUNDLE_VIEW');
  /* each view page's frames: a typed src, or the address its own scripts assign to the frame */
  for (const rel of files.filter((f) => f.startsWith(`${VIEW}/`) && f.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(stage, rel), 'utf8');
    const tags = [...html.matchAll(/<iframe\b[^>]*>/gi)].map((m) => m[0]);
    if (!tags.length) continue;
    const scripts = [...html.matchAll(/<script\b[^>]*?\bsrc="([^"]+)"/g)].map((m) => path.posix.normalize(path.posix.join(path.posix.dirname(rel), m[1].replace(/[?#].*$/, '')))).filter((f) => fileSet.has(f) && path.posix.dirname(f) === path.posix.dirname(rel));
    const code = [html, ...scripts.map((f) => fs.readFileSync(path.join(stage, f), 'utf8'))].join('\n');
    for (const tag of tags) {
      const typed = /\bsrc="([^"]*)"/.exec(tag), id = /\bid="([^"]+)"/.exec(tag);
      let found = 0;
      if (typed && typed[1]) { judge(rel, typed[1].replace(/[?#].*$/, ''), `${tag.slice(0, 40)} src`); found += 1; }
      if (id) {
        const names = [...code.matchAll(new RegExp(`\\b([A-Za-z_$][\\w$]*)\\s*=\\s*(?:document\\.getElementById|\\$)\\(\\s*['"]${id[1]}['"]\\s*\\)`, 'g'))].map((m) => m[1]);
        for (const name of new Set(names)) for (const m of code.matchAll(new RegExp(`(?:^|[^\\w$.])${name.replace(/\$/g, '\\$')}\\.src\\s*=(?!=)\\s*([^;\\n]+)`, 'g'))) { judge(rel, addressPattern(m[1], code), `${name}.src = ${m[1].trim().slice(0, 70)}`); found += 1; }
      }
      if (!found) fail.push(`${rel} holds ${tag.slice(0, 60)}, and no src and no script of the page that sets its address was found: what it frames could not be read`);
    }
  }
  if (!viewPages) fail.push(`the stage holds no page under ${VIEW}/`);
  const uniq = [...new Set(fail)];
  return { check: 'view-csp', status: uniq.length ? 'FAIL' : warn.length ? 'WARN' : 'PASS', summary: `${pages.length} pages read against the Caddy block's two policies (${viewPages} under ${VIEW}/): ${uniq.length ? `${uniq.length} refusals` : 'no inline code a policy refuses in the view or in a page address'}; ${frames.length} frame paths followed over ${frames.reduce((n, f) => n + f.pages, 0)} framed pages${warn.length ? `; ${warn.length} other files hold inline code (WARN)` : ''}`, lines: [...uniq.map((l) => `FAIL ${l}`), ...warn.map((l) => `WARN ${l}`), ...lines] };
}

function checkGit() {
  const lines = [], states = {};
  let dirty = 0, unread = 0;
  for (const [name, dir] of REPOS) {
    const s = states[name] = gitState(dir);
    if (!s.read) { unread += 1; lines.push(`${name}: NOT READ (${s.reason}). This is not "clean".`); continue; }
    const isDirty = s.changed + s.untracked > 0;
    if (isDirty) dirty += 1;
    lines.push(`${name}: ${s.head} on ${s.branch}, ${isDirty ? `DIRTY: ${s.changed} changed and ${s.untracked} untracked entries. No commit names this cut.` : 'clean'}`);
    for (const l of s.lines.slice(0, 400)) lines.push(`    ${l}`);
    if (s.lines.length > 400) lines.push(`    ... ${s.lines.length - 400} more`);
  }
  return { check: 'git', status: dirty || unread ? 'WARN' : 'PASS', summary: dirty || unread ? `${dirty} of ${REPOS.length} trees are DIRTY${unread ? `, ${unread} not read` : ''}: the cut holds work no commit names` : 'three clean trees', lines, states };
}

/* ---------- the cut ---------- */

export async function cutSite(opts = {}) {
  setRoots(opts);
  const outRoot = path.resolve(opts.out || path.join(ROOT, '.release'));
  const work = path.join(outRoot, `.site-cut-work-${process.pid}`);
  const stage = path.join(work, 'stage'), logDir = path.join(work, 'logs'), bundle = path.join(work, 'site.bundle');
  fs.mkdirSync(logDir, { recursive: true });
  const say = opts.log || ((line) => console.error(line));
  const steps = [];

  if (opts.skipBuilds) say('Steps 1 to 4 skipped (--skip-builds): the tree is cut as it stands.');
  else for (const [name, cwd, args] of BUILD_STEPS) { say(`==> ${name} ...`); const r = run(name, cwd, args, logDir); steps.push(r); say(`    done in ${r.ms} ms`); }

  const shellBefore = readShell();
  say('==> pack ...');
  const pack = run('pack-fxn-site', ROOT, ['scripts/pack-fxn-site.mjs', '--stage', stage, '--out', bundle], logDir);
  steps.push(pack);
  const cid = pack.stdout.trim().split('\n').pop();
  if (!/^[0-9a-f]{64}$/.test(cid)) throw refuse(`The pack step printed no content ID (it printed "${cid.slice(0, 80)}").`, 'the 64 hex characters scripts/pack-fxn-site.mjs prints on its last line.', `read ${path.join(logDir, 'pack-fxn-site.log')}.`);
  say(`    done in ${pack.ms} ms: ${cid}`);

  const files = [];
  walkFiles(stage, (rel) => files.push(rel));
  files.sort();

  say('==> checks ...');
  const view = await check3dView(stage);
  const types = await checkPackTypes(stage, files, cid);
  const findings = [view, await checkViewCsp(stage, files), checkParked(stage, files), checkLoopback(stage, files, opts.acceptLoopback === true), checkRoutes(stage), checkShellFiles(stage), checkCacheStamps(stage, view), types, checkShellRegion(stage, shellBefore), checkGit()];
  const failed = findings.filter((f) => f.status === 'FAIL'), git = findings.find((f) => f.check === 'git');
  const verdict = failed.length ? 'REFUSED' : 'PASS';

  /* what defxn.com serves beside the stage */
  for (const name of Object.keys(WEB_ONLY)) {
    if (fs.existsSync(path.join(stage, name))) throw refuse(`${name} is in the stage and in this script's web-only list.`, 'one place for the file.', 'take it out of WEB_ONLY in scripts/cut-site.mjs, or out of the pack.');
    fs.mkdirSync(path.join(work, 'web-only'), { recursive: true });
    fs.copyFileSync(path.join(ROOT, name), path.join(work, 'web-only', name));
  }
  const served = [...files.map((f) => [f, path.join(stage, f)]), ...Object.keys(WEB_ONLY).map((f) => [f, path.join(work, 'web-only', f)])].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const sums = served.map(([rel, full]) => `${sha256(fs.readFileSync(full))}  ${rel}\n`).join('');
  fs.writeFileSync(path.join(work, 'served-files.sha256'), sums);
  /* every content ID a store must hold for this pack: each distinct block, then the index last. The publish check reads each one back from each store */
  const blockIds = types.packed.format === 2 ? [...new Set(types.packed.files.flatMap((f) => f.blocks))] : [];
  fs.writeFileSync(path.join(work, 'store-ids.txt'), [...blockIds, cid].join('\n') + '\n');

  const packed = types.packed, date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const name = `site-cut-${date}-${cid.slice(0, 8)}`, cutDir = path.join(outRoot, name);
  const stagedBytes = files.reduce((n, f) => n + fs.statSync(path.join(stage, f)).size, 0);
  const manifest = [
    `cut: ${name}`,
    `verdict: ${verdict}`,
    `made: ${new Date().toISOString()}`,
    `builds: ${opts.skipBuilds ? 'SKIPPED (--skip-builds): the tree was cut as it stood' : steps.filter((s) => s.name !== 'pack-fxn-site').map((s) => `${s.name} ${s.ms} ms`).join(', ')}`,
    `content-id: ${cid}`,
    `format: flux-folder-site/${packed.format}`,
    `files: ${packed.files.length}`,
    `staged-bytes: ${stagedBytes}`,
    `index-bytes: ${packed.bytes.length}`,
    `blocks: ${packed.format === 2 ? packed.blockCount : 'none (a /1 pack holds every file)'}`,
    `page-addresses: ${findings.find((f) => f.check === 'routes').routes.length}`,
    `web-only: ${Object.keys(WEB_ONLY).join(', ')}`,
    `served-files-sha256: ${sha256(sums)}`,
    `documents: ${view.docs.length}`,
    ...view.docs.map((d) => `document: ${d.object} ${d.doc}`),
    ...(view.extraDocs || []).map((d) => `document-by-name: ${d}`),
    ...REPOS.map(([repo]) => { const s = git.states[repo]; return s.read ? `git: ${repo} ${s.head} ${s.branch} ${s.changed + s.untracked ? `DIRTY changed=${s.changed} untracked=${s.untracked}` : 'clean'}` : `git: ${repo} NOT-READ`; }),
    `dirty-trees: ${REPOS.filter(([repo]) => { const s = git.states[repo]; return !s.read || s.changed + s.untracked > 0; }).map(([repo]) => repo).join(', ') || 'none'}`,
    ...findings.map((f) => `check: ${f.check} ${f.status} ${f.summary}`),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(work, 'MANIFEST.txt'), manifest);
  fs.writeFileSync(path.join(work, 'FINDINGS.txt'), findings.map((f) => [`## ${f.check}: ${f.status}`, f.summary, ...f.lines, ''].join('\n')).join('\n'));

  if (fs.existsSync(cutDir)) throw refuse(`${cutDir} is already there.`, 'a new cut folder: a cut is never written over.', `this run's cut is in ${work}; remove one of the two folders yourself, or cut after the site changes.`);
  fs.renameSync(work, cutDir);
  return { name, cutDir, verdict, cid, findings, manifest, packed, stagedBytes };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const r = await cutSite({ out: typeof args.out === 'string' ? args.out : null, skipBuilds: args['skip-builds'] === true, fxn3d: typeof args['fxn-3d'] === 'string' ? args['fxn-3d'] : null, bundleDeploy: typeof args['bundle-deploy'] === 'string' ? args['bundle-deploy'] : null, acceptLoopback: args['accept-loopback'] === true });
  console.error('');
  for (const f of r.findings) {
    console.error(`${f.status.padEnd(4)} ${f.check}: ${f.summary}`);
    const shown = f.lines.filter((l) => l.startsWith('FAIL ')).slice(0, 25);
    for (const l of shown) console.error(`       ${l}`);
  }
  const git = r.findings.find((f) => f.check === 'git');
  if (git.status !== 'PASS') {
    console.error('');
    console.error('!!!! DIRTY TREES: THIS CUT HOLDS WORK NO COMMIT NAMES !!!!');
    for (const l of git.lines.filter((line) => !line.startsWith('    '))) console.error(`!!!! ${l}`);
    console.error('!!!! Commit the three repos, then cut again. ops/deploy-defxn-site.sh refuses this cut without --allow-dirty.');
  }
  console.error('');
  console.error(`Cut ${r.name}: ${r.packed.files.length} files, ${r.stagedBytes} bytes staged, flux-folder-site/${r.packed.format}, index ${r.packed.bytes.length} bytes, ${r.packed.format === 2 ? r.packed.blockCount : 0} blocks.`);
  console.error(`Folder: ${r.cutDir}`);
  console.error(`Read:   ${path.join(r.cutDir, 'MANIFEST.txt')} and ${path.join(r.cutDir, 'FINDINGS.txt')}`);
  console.error(r.verdict === 'PASS'
    ? `Verdict: PASS. Next: ops/deploy-defxn-site.sh --cut ${r.cutDir} <ssh-alias> (a dry run until you add --go).`
    : `Verdict: REFUSED by ${r.findings.filter((f) => f.status === 'FAIL').map((f) => f.check).join(', ')}. Nothing may ship from this folder. Fix what FINDINGS.txt names and cut again.`);
  console.log(r.cid);
  if (r.verdict !== 'PASS') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.refusal ? error.message : error.stack || error);
    process.exitCode = 1;
  });
}

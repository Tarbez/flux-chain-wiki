#!/usr/bin/env node
/* =====================================================================
   THREE.JS GATE: finds every place the site, the design boards and the kit still load or call Three.js.
   ---------------------------------------------------------------------
   Why: on 2026-10-30 a migration was called complete after 29 site routes were photographed once. The design boards
   (docs/home-redesign/*), /kit and the admin kit were never opened, so they kept Three.js. Owner law (AGENTS.md, "Three.js is
   deprecated"): no served file loads three-r180-defxn.js or js/world/*.js. This gate checks the files and the pages, and
   it exits 1 while anything still uses Three.js, so "complete" cannot be said while it fails.

   Usage:   PLAYWRIGHT_DIR=<dir with node_modules/playwright> node scripts/threejs-gate.mjs [--static-only] [--page <path> ...]
   Env:     PLAYWRIGHT_DIR   folder that holds node_modules/playwright (the site itself takes no library)
            SITE             site origin, default http://127.0.0.1:3438 (node scripts/serve-site.mjs)
            CHROME           Chrome binary, default /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
            IDLE_MS          wait after load on each page, default 3000
   Output:  one text line per file (static) and per page (dynamic), key=value, no JSON anywhere, printed and saved to
            docs/design/world-grammar/parity/<date>-gate-<n>.txt (n = next free number for the day). The saved lines use the
            key `file=` or `page=`, never `route=`, so scripts/world-parity-log.mjs does not read them as parity rows.
   Derived, never listed by hand:
     files   every .html .js .mjs .css under the repo that scripts/serve-site.mjs would serve (its PRIVATE pattern is read from its
             source; node_modules, dot folders and the sibling-repo engine are skipped), each marked packed=1 when
             scripts/pack-fxn-site.mjs would ship it (its SHIP_FOLDERS read from its source, plus world/).
     pages   every .html file on disk that is served, the page catalog's routes (scripts/lib/site-routes.mjs, what the router reads),
             and every route named in a docs/design/world-grammar/parity/*.txt sweep.
   What counts as Three.js (a line that is not a comment): a reference to three-r180-defxn, a reference to js/world/<file>.js or
   js/min/world/<file>.js (js/world/rail-capabilities.js is exempt while it holds no THREE), a call on THREE (THREE. / THREE[),
   or a file that lives in js/world/ and calls THREE. A comment that only names Three.js is listed as kind=mention and does not fail the gate.
   Dynamic: each page is opened in real Chrome with empty storage; a request for three-r180-defxn.js or js/world/ or js/min/world/,
   window.THREE being defined, a page error and every 4xx/5xx response are recorded.
   ===================================================================== */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = process.env.SITE || 'http://127.0.0.1:3438';
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const IDLE_MS = Number(process.env.IDLE_MS || 3000);
const PARITY = path.join(ROOT, 'docs/design/world-grammar/parity');
const SCANNED = /\.(html|js|mjs|css)$/;
const SKIP_DIRS = new Set(['node_modules', '.git', '.claude', '.vendor', '.vercel']);

/* the server's own private pattern and the pack's own folder list, read from their source so a change there changes the gate */
export function servedRules() {
  const serve = fs.readFileSync(path.join(ROOT, 'scripts/serve-site.mjs'), 'utf8');
  const pack = fs.readFileSync(path.join(ROOT, 'scripts/pack-fxn-site.mjs'), 'utf8');
  const priv = serve.match(/const PRIVATE = \/(.+)\/;/);
  const ship = pack.match(/const SHIP_FOLDERS = \[([^\]]*)\]/);
  const adminFolder = pack.match(/const ADMIN_FOLDER = '([^']+)'/);
  if (!priv || !ship) throw new Error('threejs-gate: could not read PRIVATE from scripts/serve-site.mjs or SHIP_FOLDERS from scripts/pack-fxn-site.mjs. Their declarations moved; update the two patterns in servedRules().');
  return {
    isPrivate: new RegExp(priv[1]),
    shipFolders: [...ship[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).concat('world'),
    adminFolder: adminFolder ? adminFolder[1] : null,
  };
}

export function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name), out); }
    else if (SCANNED.test(e.name)) out.push(path.join(dir, e.name));
  }
  return out;
}

export function servedFiles() {
  const rules = servedRules();
  const files = [];
  for (const abs of walk(ROOT)) {
    const rel = path.relative(ROOT, abs).split(path.sep).join('/');
    if (rules.isPrivate.test('/' + rel)) continue;
    const top = rel.split('/')[0];
    const packed = (rules.shipFolders.includes(top) || rel === 'index.html') && !(rules.adminFolder && rel.startsWith(rules.adminFolder + '/'));
    files.push({ rel, abs, packed });
  }
  return files.sort((a, b) => a.rel.localeCompare(b.rel));
}

const PATTERNS = [
  ['lib', /three-r180-defxn/],
  ['scene', /js\/(?:min\/)?world\/(?!rail-capabilities)[\w.-]+\.js/],
  ['call', /\bTHREE\s*[.[]/],
];
/* Splits a file into code and comment text. Block comments and html comments, and line comments (// at the start of a line or after
   whitespace, so a URL's // stays code), move to the comment text. A comment that only names Three.js must not fail the gate, and a
   multi-line comment is the usual place a path is named, so a line-by-line test was wrong. */
export function splitComments(text, rel) {
  const html = rel.endsWith('.html'), css = rel.endsWith('.css');
  let code = '', comment = '', i = 0;
  while (i < text.length) {
    if (html && text.startsWith('<!--', i)) { const e = text.indexOf('-->', i + 4); const end = e < 0 ? text.length : e + 3; comment += text.slice(i, end) + '\n'; code += '\n'; i = end; continue; }
    if (text.startsWith('/*', i)) { const e = text.indexOf('*/', i + 2); const end = e < 0 ? text.length : e + 2; comment += text.slice(i, end) + '\n'; code += '\n'; i = end; continue; }
    if (!css && text.startsWith('//', i) && (i === 0 || /\s/.test(text[i - 1]))) { let e = text.indexOf('\n', i); if (e < 0) e = text.length; comment += text.slice(i, e) + '\n'; i = e; continue; }
    code += text[i++];
  }
  return { code, comment };
}
/* what a file does with Three.js: kinds found in code (uses) and only in comments (mentions) */
export function scanText(rel, text) {
  const { code, comment } = splitComments(text, rel);
  const uses = new Set(), mentions = new Set();
  const inWorldFolder = /^js\/(?:min\/)?world\//.test(rel) && !/rail-capabilities/.test(rel);
  for (const [kind, re] of PATTERNS) { if (re.test(code)) uses.add(kind); else if (re.test(comment)) mentions.add(kind); }
  if (inWorldFolder && uses.has('call')) uses.add('scene-file');
  if (rel === 'js/vendor/three-r180-defxn.js') { uses.clear(); uses.add('library'); }
  return { uses: [...uses], mentions: [...mentions] };
}

export function staticReport() {
  const lines = [];
  let users = 0, mentioners = 0, scanned = 0;
  for (const f of servedFiles()) {
    scanned++;
    const { uses, mentions } = scanText(f.rel, fs.readFileSync(f.abs, 'utf8'));
    if (uses.length) { users++; lines.push(`file=${f.rel} kind=use via=${uses.join(',')} packed=${f.packed ? 1 : 0}`); }
    else if (mentions.length) { mentioners++; lines.push(`file=${f.rel} kind=mention via=${mentions.join(',')} packed=${f.packed ? 1 : 0}`); }
  }
  return { lines, users, mentioners, scanned };
}

/* pages: html on disk (served), the catalog's routes, and the routes the sweeps named */
export async function pageList() {
  const pages = new Map();
  for (const f of servedFiles()) if (f.rel.endsWith('.html')) pages.set('/' + f.rel, 'html');
  const { readSiteRoutes } = await import('./lib/site-routes.mjs');
  for (const r of readSiteRoutes(ROOT)) if (!pages.has(r)) pages.set(r, 'route');
  for (const n of fs.existsSync(PARITY) ? fs.readdirSync(PARITY).filter((x) => x.endsWith('.txt') && !/-gate-|-motion-/.test(x)) : []) {
    for (const l of fs.readFileSync(path.join(PARITY, n), 'utf8').split('\n')) {
      const m = l.match(/^route=(\S+)/);
      if (m && !pages.has(m[1])) pages.set(m[1], 'sweep');
    }
  }
  return pages;
}

const HIT = /three-r180-defxn|\/js\/(?:min\/)?world\/(?!rail-capabilities)/;

async function dynamicReport(only) {
  const dir = process.env.PLAYWRIGHT_DIR;
  if (!dir) throw new Error('threejs-gate: PLAYWRIGHT_DIR is not set. It must name a folder whose package.json resolves playwright. Set it, or pass --static-only for the file check alone.');
  const { chromium } = createRequire(path.join(path.resolve(dir), 'package.json'))('playwright');
  const pages = only.length ? new Map(only.map((p) => [p, 'arg'])) : await pageList();
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=metal'] });
  const lines = []; let bad = 0;
  try {
    for (const [p, src] of pages) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      const threeReq = new Set(), errs = [], http = [];
      page.on('request', (r) => { const u = new URL(r.url()); if (HIT.test(u.pathname)) threeReq.add(u.pathname.replace(/^\//, '')); });
      page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(SITE)) http.push(r.status() + ' ' + new URL(r.url()).pathname); });
      page.on('pageerror', (e) => errs.push(String(e.message || e).replace(/\s+/g, ' ').slice(0, 120)));
      let nav = 'ok';
      try { await page.goto(SITE + p, { waitUntil: 'load', timeout: 30000 }); await page.waitForTimeout(IDLE_MS); }
      catch (e) { nav = 'failed:' + String(e.message).split('\n')[0].slice(0, 80); }
      const hasThree = nav === 'ok' ? await page.evaluate(() => typeof window.THREE !== 'undefined').catch(() => false) : false;
      const uses = threeReq.size > 0 || hasThree;
      if (uses) bad++;
      lines.push(`page=${p} source=${src} nav=${nav} three_requests=${threeReq.size} three_global=${hasThree ? 1 : 0} errors=${errs.length} http_4xx5xx=${http.length} verdict=${uses ? 'USES-THREE' : 'clean'}`
        + (threeReq.size ? ` loaded=${[...threeReq].slice(0, 6).join(',')}${threeReq.size > 6 ? ',+' + (threeReq.size - 6) : ''}` : '')
        + (errs.length ? ` err="${errs.slice(0, 2).join(' | ')}"` : '') + (http.length ? ` http="${http.slice(0, 4).join(' | ')}"` : ''));
      await ctx.close();
    }
  } finally { await browser.close(); }
  return { lines, bad, total: pages.size };
}

function nextOut() {
  const day = new Date().toISOString().slice(0, 10);
  let n = 1; while (fs.existsSync(path.join(PARITY, `${day}-gate-${n}.txt`))) n++;
  return path.join(PARITY, `${day}-gate-${n}.txt`);
}

async function main() {
  const argv = process.argv.slice(2);
  const staticOnly = argv.includes('--static-only');
  const only = []; for (let i = 0; i < argv.length; i++) if (argv[i] === '--page') only.push(argv[++i]);
  const s = staticReport();
  const out = [`gate=static files_scanned=${s.scanned} files_using_threejs=${s.users} files_mentioning_only=${s.mentioners}`, ...s.lines];
  let dynBad = 0;
  if (!staticOnly) {
    const d = await dynamicReport(only);
    dynBad = d.bad;
    out.push(`gate=dynamic pages=${d.total} pages_loading_threejs=${d.bad}`, ...d.lines);
  }
  out.push(`gate=result static_files=${s.users} dynamic_pages=${dynBad} exit=${s.users || dynBad ? 1 : 0}`);
  const file = nextOut();
  fs.mkdirSync(PARITY, { recursive: true });
  fs.writeFileSync(file, out.join('\n') + '\n');
  console.log(out.join('\n'));
  console.log(`saved ${path.relative(ROOT, file)}`);
  process.exit(s.users || dynBad ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e.message); process.exit(2); });

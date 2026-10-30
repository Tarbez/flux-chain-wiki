#!/usr/bin/env node
/* =====================================================================
   WORLD MOTION: records a page doing things in real Chrome on the Three.js build and on the fxn-3d build, and compares WHEN it moves.
   ---------------------------------------------------------------------
   Why: scripts/world-parity.mjs compares one still picture taken 6 s after load. That cannot see a build-up, a flight, a hover or a
   pulse, so a view could lose all its motion and pass. Owner law (AGENTS.md, "Three.js is deprecated"): each view's MOTION is compared
   against the Three.js recording. This tool measures it. It is a measurement tool, not a test: it passes nothing and fails nothing.

   Usage:   PLAYWRIGHT_DIR=<dir> node scripts/world-motion.mjs [name=]<path> [[name=]<path> ...]
              <path> is a site path (/chain, /identity/start) or a board page (/docs/home-redesign/home-mockup.html).
   Env:     PLAYWRIGHT_DIR   folder that holds package.json resolving playwright
            THREE_SITE       the untouched Three.js build (git HEAD), default http://127.0.0.1:3499
            FXN3D_SITE       the working copy, default http://127.0.0.1:3438
            CHROME           Chrome binary, default /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
            SCRATCH          folder for the raw videos (not kept in the repo), default $TMPDIR/world-motion
            OUT_ROOT         default docs/design/world-grammar/motion
            LINKS            most links clicked per page, default 12 for a board, 4 for a site page
            FPS              analysis frame rate, default 12
            DIFF_LEVEL       a pixel counts as changed when its grey level differs by more than this (0-255), default 12
            MOVE_SHARE       a frame is moving when more than this share of pixels changed, default 0.002 (0.2%)
   Output:  <OUT_ROOT>/<date>-<name>/motion.txt (one line per segment, key=value, no JSON) and seg-<n>.png contact sheets (Three.js row
            above, fxn-3d row below, 6 frames spread over the segment). The same lines are printed.
   Actions (derived from the page, never typed per page):
            first-visit  fresh context (empty storage), load, wait 8 s
            go:<href>    each link found in the board's mockup bar (.mock-body, the Scene links) or, on a site page, in the header, nav and rail
                         that stays on the origin; click it, wait 4.5 s
            back:<href>  history back after the click, wait 3.5 s
            hover:x,y    the first three visible links and buttons inside the page body, mouse moved onto each, wait 1.5 s
            The list is read once from the working copy and replayed on both builds, so both do the same thing at the same time.
   Fields:  start = ms from segment start to the first moving frame; stop = ms to the last moving frame; frames = moving frames;
            ms = frames * 1000/FPS; end = 1 when still moving in the last two frames (a loop, not a settle); regions = 4x3 map, one digit
            per region 0-9 = share of the segment's frames in which that region changed.
   Flags:   ONLY-THREE / ONLY-FXN3D   one side moves (3+ frames) and the other does not
            TIME-DIFFERS              both move and the moving time differs by more than 30%
            REGIONS-DIFFER            both move and a region moves in more than half the frames on one side and none on the other
   Limits:  the video clock starts when the page opens, so a segment edge can be 0.3 s off. Video compression noise is why DIFF_LEVEL and
            MOVE_SHARE exist; a still page reads 0 moving frames at their defaults.
   ===================================================================== */
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THREE_SITE = process.env.THREE_SITE || 'http://127.0.0.1:3499';
const FXN3D_SITE = process.env.FXN3D_SITE || 'http://127.0.0.1:3438';
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FFMPEG = process.env.FFMPEG || '/opt/homebrew/bin/ffmpeg';
const FPS = Number(process.env.FPS || 12);
const DIFF_LEVEL = Number(process.env.DIFF_LEVEL || 12);
const MOVE_SHARE = Number(process.env.MOVE_SHARE || 0.002);
const OUT_ROOT = path.resolve(process.env.OUT_ROOT || path.join(ROOT, 'docs/design/world-grammar/motion'));
const SCRATCH = path.resolve(process.env.SCRATCH || path.join(os.tmpdir(), 'world-motion'));
const VW = 1440, VH = 900, AW = 320, AH = 200, GX = 4, GY = 3;
const WAIT = { first: 8000, go: 4500, back: 3500, hover: 1500 };

function loadPlaywright() {
  const dir = process.env.PLAYWRIGHT_DIR;
  if (!dir) throw new Error('world-motion: PLAYWRIGHT_DIR is not set. It must name a folder whose package.json resolves playwright. Set it and run again.');
  return createRequire(path.join(path.resolve(dir), 'package.json'))('playwright');
}

/* the action list, read from the page itself on the working copy */
export async function deriveActions(page, pathname) {
  const board = pathname.startsWith('/docs/');
  const cap = Number(process.env.LINKS || (board ? 12 : 4));
  const found = await page.evaluate(({ board, cap }) => {
    const visible = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 4 && r.height > 4 && s.visibility !== 'hidden' && s.display !== 'none' && r.bottom > 0 && r.top < innerHeight; };
    const here = location.pathname;
    const links = [], seen = new Set();
    const sel = board && document.querySelector('.mock-body') ? '.mock-body a[href]' : 'header a[href], nav a[href], .rail a[href], [data-kit] a[href]';
    for (const a of document.querySelectorAll(sel)) {
      const raw = a.getAttribute('href'); let key;
      if (board) { if (!raw.startsWith('#/')) continue; key = raw; }
      else { let u; try { u = new URL(a.href); } catch { continue; } if (u.origin !== location.origin || u.pathname === here) continue; key = u.pathname + u.search; }
      if (seen.has(key) || !visible(a)) continue;
      seen.add(key); links.push(key); if (links.length >= cap) break;
    }
    const body = document.querySelector('main, .view, #main') || document.body;
    const hovers = [];
    for (const e of body.querySelectorAll('a[href], button')) {
      if (!visible(e) || e.closest('header, nav, .mock-body, footer, [data-kit="mock"]')) continue;
      const r = e.getBoundingClientRect();
      hovers.push([Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)]);
      if (hovers.length >= 3) break;
    }
    return { links, hovers };
  }, { board, cap });
  const actions = [{ kind: 'first-visit', label: 'first-visit' }];
  for (const h of found.hovers) actions.push({ kind: 'hover', label: `hover:${h[0]},${h[1]}`, x: h[0], y: h[1] });
  for (const l of found.links) { actions.push({ kind: 'go', label: `go:${l}`, href: l }); actions.push({ kind: 'back', label: `back:${l}` }); }
  return actions;
}

async function clickLink(page, href) {
  const loc = page.locator(`a[href="${href.replace(/"/g, '\\"')}"]:visible`).first();
  try { await loc.click({ timeout: 2500 }); return true; }
  catch { return page.evaluate((h) => { const a = [...document.querySelectorAll('a[href]')].find((x) => x.getAttribute('href') === h || (new URL(x.href).pathname + new URL(x.href).search) === h); if (a) { a.click(); return true; } return false; }, href).catch(() => false); }
}

/* one build, one fresh context, one video; returns the video file and the segment times (ms from page open) */
async function record(pw, base, pathname, actions, tag) {
  fs.mkdirSync(SCRATCH, { recursive: true });
  const dir = fs.mkdtempSync(path.join(SCRATCH, tag + '-'));
  const browser = await pw.chromium.launch({ executablePath: CHROME, args: ['--use-angle=metal'] });
  const marks = [];
  let video;
  try {
    const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, recordVideo: { dir, size: { width: 720, height: 450 } } });
    const page = await ctx.newPage();
    const t0 = Date.now();
    const now = () => Date.now() - t0;
    for (const a of actions) {
      const start = now(); let ok = true;
      if (a.kind === 'first-visit') { await page.goto(base + pathname, { waitUntil: 'commit' }).catch(() => { ok = false; }); await page.waitForTimeout(WAIT.first); }
      else if (a.kind === 'go') { ok = await clickLink(page, a.href); await page.waitForTimeout(WAIT.go); }
      else if (a.kind === 'back') { await page.goBack({ waitUntil: 'commit', timeout: 5000 }).catch(() => { ok = false; }); await page.waitForTimeout(WAIT.back); }
      else if (a.kind === 'hover') { await page.mouse.move(a.x, a.y, { steps: 6 }); await page.waitForTimeout(WAIT.hover); }
      marks.push({ label: a.label, start, end: now(), ok });
    }
    video = page.video();
    await ctx.close();
    const file = await video.path();
    return { file, marks };
  } finally { await browser.close(); }
}

/* gray frames at FPS, AWxAH, as one buffer */
function grayFrames(file) {
  const r = spawnSync(FFMPEG, ['-v', 'error', '-i', file, '-vf', `fps=${FPS},scale=${AW}:${AH},format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error('world-motion: ffmpeg could not read ' + file + ': ' + String(r.stderr).slice(0, 200) + ' Check that ' + FFMPEG + ' exists and the video was written.');
  const n = Math.floor(r.stdout.length / (AW * AH));
  return { buf: r.stdout, n };
}

/* motion of the frames [a, b) of one video: when it starts and stops, how many frames move, and where */
export function segmentMotion({ buf }, a, b) {
  const px = AW * AH, cells = GX * GY, per = new Array(cells).fill(0);
  let first = -1, last = -1, frames = 0, tail = 0;
  const cw = AW / GX, ch = AH / GY, cellPx = cw * ch;
  for (let i = Math.max(1, a); i < b; i++) {
    const p = (i - 1) * px, q = i * px;
    let changed = 0; const cc = new Array(cells).fill(0);
    for (let y = 0; y < AH; y++) {
      const gy = Math.min(GY - 1, (y / ch) | 0);
      for (let x = 0; x < AW; x++) {
        const d = buf[q + y * AW + x] - buf[p + y * AW + x];
        if (d > DIFF_LEVEL || d < -DIFF_LEVEL) { changed++; cc[gy * GX + Math.min(GX - 1, (x / cw) | 0)]++; }
      }
    }
    if (changed / px > MOVE_SHARE) {
      frames++; if (first < 0) first = i; last = i;
      for (let c = 0; c < cells; c++) if (cc[c] / cellPx > 0.005) per[c]++;
    }
  }
  const total = Math.max(1, b - Math.max(1, a));
  if (last >= 0 && last >= b - 2) tail = 1;
  return {
    frames, start: first < 0 ? null : Math.round((first - a) * 1000 / FPS), stop: last < 0 ? null : Math.round((last - a) * 1000 / FPS),
    ms: Math.round(frames * 1000 / FPS), end: tail, regions: per.map((c) => Math.round(9 * c / total)).join(''), per, total,
  };
}

export function flags(m3, m2) {
  const out = [];
  const mv = (m) => m.frames >= 3;
  if (mv(m3) && !mv(m2)) out.push('ONLY-THREE');
  if (!mv(m3) && mv(m2)) out.push('ONLY-FXN3D');
  if (mv(m3) && mv(m2)) {
    const big = Math.max(m3.ms, m2.ms);
    if (big >= 500 && Math.abs(m3.ms - m2.ms) / big > 0.3) out.push('TIME-DIFFERS');
    const half = (m) => m.per.map((c) => c / m.total > 0.5);
    const zero = (m) => m.per.map((c) => c === 0);
    const h3 = half(m3), h2 = half(m2), z3 = zero(m3), z2 = zero(m2);
    if (h3.some((x, i) => x && z2[i]) || h2.some((x, i) => x && z3[i])) out.push('REGIONS-DIFFER');
  }
  return out;
}

/* six frames per side across each segment, three on top, fxn-3d below */
function contactSheets(outDir, fileA, fileB, segs) {
  const tmp = fs.mkdtempSync(path.join(SCRATCH, 'sheet-'));
  for (const [tag, f] of [['a', fileA], ['b', fileB]]) {
    fs.mkdirSync(path.join(tmp, tag), { recursive: true });
    spawnSync(FFMPEG, ['-v', 'error', '-i', f, '-vf', 'fps=4,scale=240:150', path.join(tmp, tag, 'f%05d.png')]);
  }
  const py = `
import sys, os
from PIL import Image, ImageDraw
tmp, out, rows = sys.argv[1], sys.argv[2], sys.argv[3:]
for r in rows:
    n, a, b, label = r.split('|', 3)
    a, b = float(a), float(b)
    sheet = Image.new('RGB', (6 * 240, 2 * 150 + 16), (20, 20, 20))
    d = ImageDraw.Draw(sheet)
    d.text((4, 2), 'seg ' + n + ' ' + label + '   top: Three.js   bottom: fxn-3d', fill=(220, 220, 220))
    for row, tag in enumerate(['a', 'b']):
        for k in range(6):
            t = a + (b - a) * (k + 0.5) / 6
            idx = max(1, int(t * 4) + 1)
            p = os.path.join(tmp, tag, 'f%05d.png' % idx)
            if not os.path.exists(p):
                continue
            sheet.paste(Image.open(p).convert('RGB'), (k * 240, 16 + row * 150))
    sheet.save(os.path.join(out, 'seg-' + n + '.png'))
`;
  const rows = segs.map((s, i) => `${i + 1}|${s.start / 1000}|${s.end / 1000}|${s.label}`);
  const r = spawnSync('python3', ['-I', '-c', py, tmp, outDir, ...rows]);
  if (r.status !== 0) console.error('world-motion: contact sheets failed: ' + String(r.stderr).slice(0, 300) + ' Check that python3 has PIL.');
  fs.rmSync(tmp, { recursive: true, force: true });
}

export function formatLine(page, i, seg, m3, m2, fl) {
  const f = (m) => `start=${m.start == null ? 'none' : m.start} stop=${m.stop == null ? 'none' : m.stop} frames=${m.frames} ms=${m.ms} end=${m.end}`;
  const t = (x) => (x / 1000).toFixed(1);
  return `page=${page} seg=${i} action=${seg.label} at=${t(seg.start)}-${t(seg.end)}s three:[${f(m3)} regions=${m3.regions}] fxn3d:[${f(m2)} regions=${m2.regions}] flag=${fl.length ? fl.join(',') : 'none'}`;
}

export async function measurePage(pw, name, pathname) {
  const probeBrowser = await pw.chromium.launch({ executablePath: CHROME, args: ['--use-angle=metal'] });
  let actions;
  try {
    const ctx = await probeBrowser.newContext({ viewport: { width: VW, height: VH } });
    const pg = await ctx.newPage();
    await pg.goto(FXN3D_SITE + pathname, { waitUntil: 'load' }).catch(() => {});
    await pg.waitForTimeout(4000);
    actions = await deriveActions(pg, pathname.split('?')[0]);
    await ctx.close();
  } finally { await probeBrowser.close(); }
  const a = await record(pw, THREE_SITE, pathname, actions, 'three');
  const b = await record(pw, FXN3D_SITE, pathname, actions, 'fxn3d');
  const fa = grayFrames(a.file), fb = grayFrames(b.file);
  const day = new Date().toISOString().slice(0, 10);
  const outDir = path.join(OUT_ROOT, `${day}-${name}`);
  fs.mkdirSync(outDir, { recursive: true });
  const lines = [], segs = [];
  /* the two runs repeat the same waits, so segment i is cut at the same clock on both; each side uses its own recorded times */
  a.marks.forEach((sa, i) => {
    const sb = b.marks[i];
    const m3 = segmentMotion(fa, Math.round(sa.start * FPS / 1000), Math.min(fa.n, Math.round(sa.end * FPS / 1000)));
    const m2 = segmentMotion(fb, Math.round(sb.start * FPS / 1000), Math.min(fb.n, Math.round(sb.end * FPS / 1000)));
    const fl = flags(m3, m2);
    if (!sa.ok || !sb.ok) fl.push(`ACTION-FAILED-ON-${!sa.ok && !sb.ok ? 'BOTH' : !sa.ok ? 'THREE' : 'FXN3D'}`);
    lines.push(formatLine(pathname, i + 1, sa, m3, m2, fl));
    segs.push({ label: sa.label, start: sa.start, end: sa.end });
  });
  contactSheets(outDir, a.file, b.file, segs);
  fs.writeFileSync(path.join(outDir, 'motion.txt'), lines.join('\n') + '\n');
  return { lines, outDir };
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length) throw new Error('world-motion: no page given. Pass site paths, for example: node scripts/world-motion.mjs /chain /docs/home-redesign/home-mockup.html');
  const pw = loadPlaywright();
  for (const arg of args) {
    const eq = arg.indexOf('=');
    const pathname = eq > 0 && !arg.startsWith('/') ? arg.slice(eq + 1) : arg;
    const name = eq > 0 && !arg.startsWith('/') ? arg.slice(0, eq) : (pathname.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home');
    const { lines, outDir } = await measurePage(pw, name, pathname);
    console.log(lines.join('\n'));
    console.log(`saved ${path.relative(ROOT, outDir)}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e.message); process.exit(1); });

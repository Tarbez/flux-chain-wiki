/* =====================================================================
   WORLD PARITY, frozen-picture mode: one route drawn by the grammar world (the only world) and compared with pictures frozen while Three.js still ran.
   ---------------------------------------------------------------------
   Why: docs/design/world-grammar/PORT.md says a view is ported only when its camera, picture and page errors are MEASURED. Three.js has left the site,
   so the reference side is a folder of PNGs taken before it left (docs/design/world-grammar/parity/png-2026-10-30-sweep7/, never regenerated: evidence freezes).
   Two comparisons per route, both against frozen files:
     gram   this grammar picture against <REF>/<name>-grammar.png   (grammar against grammar: a regression check; 0 means the picture did not change)
     three  this grammar picture against <REF>/<name>-three.png     (the record of how near the port was to Three.js; reported, never a pass mark)
   The camera of the frozen Three.js view is read from the sweep's text record (REF_TXT, the cam3= field of the route's line). The old Three.js draw cost
   and first-frame time are not measured any more; only the grammar world's own med2 and first2 are, and they say so.

   Usage:   PLAYWRIGHT_DIR=<dir with node_modules/playwright> node scripts/world-parity.mjs <route> [<route> ...]
            routes are site paths, e.g. /intro /chain /identity/sign. A query may follow: /works?s=3.
   Env:     PLAYWRIGHT_DIR   folder that holds node_modules/playwright (Playwright 1.56; no library enters the site)
            SITE             site origin, default http://127.0.0.1:3438 (node scripts/serve-site.mjs)
            REF              folder of frozen PNGs, default docs/design/world-grammar/parity/png-2026-10-30-sweep7
            REF_TXT          the sweep's text record, default docs/design/world-grammar/parity/2026-10-30-sweep7-fxn3d-engine.txt
            ROUTES_FILE      a file with one route per line, instead of arguments
            OUT              folder for this run's PNGs, default ./world-parity-out under the current directory
            DIFF_THRESHOLD   per-pixel difference (0-255, max over R,G,B) counted as "over", default 24
            FRAMES           redraws timed for the frame median, default 40
   Output:  per route one text line (no JSON anywhere) and, in OUT, <name>-grammar.png and <name>-side.png (frozen grammar left, now right, difference third).
            Line fields (key=value): route, size, cam3 (frozen Three.js camera) / cam2 (now), camdiff, gram_mad / gram_over (against the frozen grammar picture),
            three_mad / three_over (against the frozen Three.js picture), first2 / med2 (ms), err2 (page errors and console errors).
   Not measured here: the hooks (scripts/world-hooks.mjs) and the words over the world. The canvas alone is compared: every other element is hidden.
   The page is screenshotted after the camera has been still for SETTLE_MS (6 s) and two canvas screenshots agree, so the build-up and the welcome arrival have ended.
   ===================================================================== */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const W = 1440, H = 900;
const SITE = process.env.SITE || 'http://127.0.0.1:3438';
const OUT = resolve(process.env.OUT || 'world-parity-out');
const HERE = resolve(new URL('..', import.meta.url).pathname);
const REF = resolve(process.env.REF || join(HERE, 'docs/design/world-grammar/parity/png-2026-10-30-sweep7'));
const REF_TXT = resolve(process.env.REF_TXT || join(HERE, 'docs/design/world-grammar/parity/2026-10-30-sweep7-fxn3d-engine.txt'));
const THRESHOLD = Number(process.env.DIFF_THRESHOLD || 24);
const FRAMES = Number(process.env.FRAMES || 40);
const SETTLE_MS = Number(process.env.SETTLE_MS || 6000), LIMIT_MS = 45000;   /* the first-visit build-up of home (home-descent.js STORY, 3.9 s to its last step) holds still between steps: a shorter settle photographs it mid-story (the same Three.js home scored 11.9% and 8.7% against one grammar picture at 800 ms) */

function loadPlaywright() {
  const dir = process.env.PLAYWRIGHT_DIR;
  if (!dir) throw new Error('world-parity: PLAYWRIGHT_DIR is not set. It must name a folder whose node_modules holds Playwright 1.56 (the site itself takes no library). Set it and run again.');
  return createRequire(join(resolve(dir), 'package.json'))('playwright');
}

/* the page, once per world. Everything but the canvas layer is hidden so the pair compares the world alone. */
async function visit(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  /* the moment the canvas first shows: the host sets data-flown on .world-layer after a frame of the first flight */
  await page.addInitScript(() => {
    window.__firstFrame = null;
    const look = () => {
      const layer = document.querySelector('.world-layer');
      if (layer && layer.dataset.flown && window.__firstFrame === null) { window.__firstFrame = performance.now(); return true; }
      return false;
    };
    const start = () => { if (look()) return; new MutationObserver((_, o) => { if (look()) o.disconnect(); }).observe(document.documentElement, { subtree: true, attributes: true, childList: true }); };
    if (document.documentElement) start(); else document.addEventListener('DOMContentLoaded', start);
  });
  const t0 = Date.now();
  await page.goto(SITE + url, { waitUntil: 'load' });
  const seen = await page.waitForFunction(() => window.ArkWorldHost && window.ArkWorldHost.ready && window.__firstFrame !== null && typeof window.ArkWorldHost.camera === 'function', null, { timeout: LIMIT_MS }).then(() => true, () => false);
  if (!seen) { errors.push('world did not become ready within ' + LIMIT_MS + ' ms'); return { ctx, page, errors, ready: false }; }
  await page.addStyleTag({ content: 'body *{visibility:hidden !important} .world-layer,.world-layer *{visibility:visible !important}' });
  /* settle: the camera still for SETTLE_MS, then two canvas screenshots that agree */
  const canvas = page.locator('#chains');
  let still = Date.now(), last = JSON.stringify(await page.evaluate(() => ArkWorldHost.camera())), prev = null;
  while (Date.now() - t0 < LIMIT_MS) {
    await page.waitForTimeout(150);
    const now = JSON.stringify(await page.evaluate(() => ArkWorldHost.camera()));
    if (now !== last) { last = now; still = Date.now(); prev = null; continue; }
    if (Date.now() - still < SETTLE_MS) continue;
    const shot = await canvas.screenshot({ type: 'png' });
    if (prev && Buffer.compare(prev, shot) === 0) return { ctx, page, errors, ready: true, shot };
    prev = shot;
  }
  errors.push('world did not settle within ' + LIMIT_MS + ' ms');
  return { ctx, page, errors, ready: true, shot: prev || await canvas.screenshot({ type: 'png' }) };
}

/* the draw cost: FRAMES forced redraws, each followed by gl.finish and a one-pixel readPixels that waits for the GPU, median in ms. the grammar world redraws through window.__world2.redraw(). */
async function frameMedian(page, grammar) {
  return page.evaluate(({ grammar, frames }) => {
    const gl = document.getElementById('chains').getContext('webgl2');
    const redraw = () => window.__world2.redraw();
    const times = [], px = new Uint8Array(4);
    for (let i = 0; i < frames + 3; i++) {
      const t = performance.now(); redraw(); if (gl) { gl.finish(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } const d = performance.now() - t;
      if (i >= 3) times.push(d);   /* the first three warm the program caches */
    }
    times.sort((a, b) => a - b);
    return times[times.length >> 1];
  }, { grammar, frames: FRAMES });
}

/* the pair, compared in a blank page so no image library is needed: PNG bytes decode through the browser */
async function compare(browser, a, b) {
  const page = await (await browser.newContext({ viewport: { width: 400, height: 300 } })).newPage();
  const res = await page.evaluate(async ({ a, b, threshold }) => {
    const load = (b64) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => no(new Error('png did not decode')); im.src = 'data:image/png;base64,' + b64; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const w = Math.max(ia.width, ib.width), h = Math.max(ia.height, ib.height);
    const grab = (im) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0); return g.getImageData(0, 0, w, h); };
    const da = grab(ia), db = grab(ib);
    const out = new ImageData(w, h);
    let sum = 0, over = 0;
    for (let i = 0; i < da.data.length; i += 4) {
      const dr = Math.abs(da.data[i] - db.data[i]), dg = Math.abs(da.data[i + 1] - db.data[i + 1]), dbl = Math.abs(da.data[i + 2] - db.data[i + 2]);
      sum += (dr + dg + dbl) / 3;
      if (Math.max(dr, dg, dbl) > threshold) over++;
      out.data[i] = dr; out.data[i + 1] = dg; out.data[i + 2] = dbl; out.data[i + 3] = 255;
    }
    const side = document.createElement('canvas'); side.width = w * 3; side.height = h;
    const g = side.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, side.width, side.height);
    g.drawImage(ia, 0, 0); g.drawImage(ib, w, 0);
    const dc = document.createElement('canvas'); dc.width = w; dc.height = h; dc.getContext('2d').putImageData(out, 0, 0);
    g.drawImage(dc, w * 2, 0);
    const px = w * h;
    return { mad: sum / px, over: over / px, side: side.toDataURL('image/png').split(',')[1] };
  }, { a: a.toString('base64'), b: b.toString('base64'), threshold: THRESHOLD });
  await page.context().close();
  return res;
}

const f = (n) => (Math.round(n * 1000) / 1000).toString();
const camText = (c) => c ? c.aim.map(f).join(',') + '|' + [c.dist, c.elev, c.yaw, c.tilt].map(f).join(',') : 'none';
function camDiff(x, y) {
  if (!x || !y) return NaN;
  const v = [...x.aim, x.dist, x.elev, x.yaw, x.tilt], w = [...y.aim, y.dist, y.elev, y.yaw, y.tilt];
  return Math.max(...v.map((n, i) => Math.abs(n - w[i])));
}

/* the frozen Three.js camera of a route: the cam3= field of that route's line in the sweep's text record, as camText wrote it ("ax,ay,az|dist,elev,yaw,tilt") */
function frozenCam(route) {
  if (!existsSync(REF_TXT)) return null;
  const line = readFileSync(REF_TXT, 'utf8').split('\n').find((l) => l.startsWith('route=' + route + ' '));
  const m = line && /cam3=([-0-9.,]+)\|([-0-9.,]+)/.exec(line);
  if (!m) return null;
  const a = m[1].split(',').map(Number), d = m[2].split(',').map(Number);
  return { aim: a, dist: d[0], elev: d[1], yaw: d[2], tilt: d[3] };
}

async function one(browser, route) {
  const name = route.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/-+$/, '') || 'home';
  const grammar = await visit(browser, route);
  const cam3 = frozenCam(route);
  const cam2 = grammar.ready ? await grammar.page.evaluate(() => ArkWorldHost.camera()) : null;
  const first2 = grammar.ready ? await grammar.page.evaluate(() => window.__firstFrame) : NaN;
  const med2 = grammar.ready && await grammar.page.evaluate(() => !!(window.__world2 && window.__world2.redraw)) ? await frameMedian(grammar.page, true).catch(() => NaN) : NaN;
  const refGram = join(REF, name + '-grammar.png'), refThree = join(REF, name + '-three.png');
  const out = { gram: [NaN, NaN], three: [NaN, NaN] };
  mkdirSync(OUT, { recursive: true });
  if (grammar.shot) {
    writeFileSync(join(OUT, name + '-grammar.png'), grammar.shot);
    if (existsSync(refGram)) { const r = await compare(browser, readFileSync(refGram), grammar.shot); out.gram = [r.mad, r.over]; writeFileSync(join(OUT, name + '-side.png'), Buffer.from(r.side, 'base64')); }
    if (existsSync(refThree)) { const r = await compare(browser, readFileSync(refThree), grammar.shot); out.three = [r.mad, r.over]; }
  }
  const errs = (e) => e.length ? e.length + ':' + e.join(' // ').replace(/\s+/g, ' ').slice(0, 300) : '0';
  const pct = (o) => (Math.round(o * 10000) / 100) + '%';
  const text = [
    'route=' + route, 'size=' + W + 'x' + H, 'cam3=' + camText(cam3), 'cam2=' + camText(cam2), 'camdiff=' + f(camDiff(cam3, cam2)),
    'gram_mad=' + f(out.gram[0]), 'gram_over' + THRESHOLD + '=' + pct(out.gram[1]), 'three_mad=' + f(out.three[0]), 'three_over' + THRESHOLD + '=' + pct(out.three[1]),
    'first2=' + Math.round(first2) + 'ms', 'med2=' + f(med2) + 'ms (grammar world alone)', 'err2=' + errs(grammar.errors), 'png=' + join(OUT, name + '-side.png')
  ].join(' ');
  await grammar.ctx.close();
  return text;
}

async function main() {
  const routes = process.env.ROUTES_FILE ? readFileSync(process.env.ROUTES_FILE, 'utf8').split('\n').filter(Boolean) : process.argv.slice(2);   /* ROUTES_FILE: one route per line, so a shell never has to quote '?' */
  if (!routes.length) throw new Error('world-parity: no route given. Pass one or more site paths, for example: node scripts/world-parity.mjs /intro /chain');
  const { webkit } = loadPlaywright();
  const browser = await webkit.launch();
  try { for (const r of routes) console.log(await one(browser, r)); } finally { await browser.close(); }
}

/* the program runs only when this file is started, never on import */
if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e.message); process.exit(1); });

#!/usr/bin/env node
/* =====================================================================
   CARD PARITY: one card's art drawn by the old Three.js path and by the grammar renderer, in one page, compared.
   ---------------------------------------------------------------------
   Why: docs/design/world-grammar/PORT.md asks every ported view for a side-by-side pair, a pixel score and a speed
   number measured against Three.js on the same machine and run. scripts/world-parity.mjs does that for routes;
   this does it for the NFT card (docs/design/world-grammar/NFT-SKINS.md section 6). It reports; it never judges a pair.

   How: the page is a real site page (so the card's own traits, layers and builders load as they do for a visitor). The
   model is built ONCE by the new js/nft/art3d.js (a model is plain data: lists of primitives), then painted by the new
   Art3D.paint and by the old one. The old one is `git show <OLD_REF>:js/nft/art3d.js` (default HEAD, the Three.js file)
   run as a second script beside the Three.js build named by THREE_SRC; its Art3D is parked as OldArt while the new one stays
   window.Art3D. Both paint into their own canvases with the same arguments.

   Usage:   PLAYWRIGHT_DIR=<dir with node_modules/playwright> node scripts/card-parity.mjs 27 263 512
   Env:     PLAYWRIGHT_DIR  folder that holds node_modules/playwright (Playwright 1.56; no library enters the site)
            SITE            default http://127.0.0.1:3438 (node scripts/serve-site.mjs)
            OUT             folder for the PNGs, default ./card-parity-out under the current directory
            OLD_REF         git ref of the Three.js art3d.js, required in practice: the Three.js art3d.js (js/nft/art3d.js before the card moved to card-gl.mjs) lives only in git history now
            THREE_SRC       REQUIRED. Path of the Three.js r180 minified build (js/vendor/three-r180-defxn.js in git history, or npm three@0.180). The site no longer carries it.
            ROUTE           a site page that loads js/ark/skin-site.js, default /kit?world=off
            DIFF_THRESHOLD  per-pixel difference (0-255, max over R,G,B) counted as "over", default 24
            BROWSER         webkit (default) or chromium: the installed engine of the Playwright in PLAYWRIGHT_DIR
            RUNS            timed paints per path, default 15
   Output:  per card and view one text line (no JSON) and, for the rest and object views, <OUT>/card-<n>-<view>-side.png
            (Three.js left, grammar middle, absolute difference right). Fields: mad (mean absolute difference over
            RGB, 0-255, art composed on black), over (share of pixels over the threshold), old / new (median ms of RUNS
            repeat paints of one model, each ended by a pixel readback), first old / new (ms for the first paint of a
            model with no scene built), err (page errors and console errors).
   ===================================================================== */
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const SITE = process.env.SITE || 'http://127.0.0.1:3438';
const OUT = resolve(process.env.OUT || 'card-parity-out');
const ROUTE = process.env.ROUTE || '/kit?world=off';
const THRESHOLD = Number(process.env.DIFF_THRESHOLD || 24);
const RUNS = Number(process.env.RUNS || 15);
const THREE_SRC = process.env.THREE_SRC;
if (!THREE_SRC) throw new Error('card-parity: THREE_SRC is not set. The old path needs the Three.js r180 build, which left the site (docs/design/world-grammar/PORT.md, "Three.js removed"). Set THREE_SRC to js/vendor/three-r180-defxn.js taken from git history (or three@0.180 build/three.module.min.js), and OLD_REF to the commit whose js/nft/art3d.js still used Three.js, then run again.');
const REPO = resolve(fileURLToPath(new URL('..', import.meta.url)));

function loadPlaywright() {
  const dir = process.env.PLAYWRIGHT_DIR;
  if (!dir) throw new Error('card-parity: PLAYWRIGHT_DIR is not set. It must name a folder whose node_modules holds Playwright 1.56 (the site itself takes no library). Set it and run again.');
  return createRequire(join(resolve(dir), 'package.json'))('playwright');
}

/* the views a card is drawn in: rest (the card at rest, full size, with shadows), small (a thumbnail, no shadow pass),
   hover (the largest tilt card.js applies, a moving frame), object (the solid object view, turned) */
const VIEWS = [
  { name: 'rest', w: 1000, h: 700, tilt: { x: 0.1, y: 0.24 }, opts: {} },
  { name: 'small', w: 400, h: 280, tilt: { x: 0.1, y: 0.24 }, opts: {} },
  { name: 'hover', w: 1000, h: 700, tilt: { x: 0.3, y: 0.6 }, opts: { moving: true } },
  { name: 'object', w: 1000, h: 700, tilt: { x: 0.12, y: 0.5 }, opts: { object: true, zoom: 1 } }
];

async function one(browser, num, oldSrc, threeSrc) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  /* the site's CSP allows scripts from its own origin only: the old file is served from an address beside it */
  await page.route('**/__three-old.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: threeSrc }));
  await page.route('**/__art3d-old.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: oldSrc }));
  page.on('response', (r) => { if (r.status() >= 400) errors.push('http ' + r.status() + ' ' + r.url()); });
  await page.goto(SITE + ROUTE, { waitUntil: 'load' });
  const res = await page.evaluate(async ({ num, views, runs, threshold }) => {
    await DefxnSkinSite.art();
    const NewArt = window.Art3D, T = window.DEFXN_TRAITS;
    const record = await DefxnSkinSite.sample(num), traits = T.pick(record);
    const mark = await NewArt.loadMark(), model = await NewArt.build(mark, T.keyOf(record), traits.picks);
    /* the old path: three.js, then the old art3d.js beside the new one */
    await new Promise((ok, no) => { const s = document.createElement('script'); s.src = '/__three-old.js'; s.onload = ok; s.onerror = () => no(new Error('the Three.js build named by THREE_SRC did not load')); document.head.appendChild(s); });
    await new Promise((ok, no) => { const s = document.createElement('script'); s.src = '/__art3d-old.js'; s.onload = ok; s.onerror = () => no(new Error('old art3d.js did not load')); document.head.appendChild(s); });
    if (window.Art3D === NewArt) throw new Error('the old art3d.js did not replace window.Art3D, so the pair would compare the new path with itself');
    const OldArt = window.Art3D; window.Art3D = NewArt;
    const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const paint = (A, v) => { const t = { art: canvas(v.w, v.h), glow: canvas(v.w, v.h) }; A.paint(t, model, v.w, v.h, v.tilt, Object.assign({}, v.opts)); return t; };
    const settle = (t) => t.art.getContext('2d').getImageData(0, 0, 1, 1);   /* a readback waits for the GPU */
    const onBlack = (t, v) => { const c = canvas(v.w, v.h), g = c.getContext('2d', { willReadFrequently: true }); g.fillStyle = '#000'; g.fillRect(0, 0, v.w, v.h); g.drawImage(t.art, 0, 0); return c; };
    const median = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
    const out = [];
    for (const v of views) {
      /* first paint: no scene built yet for this model on either path */
      NewArt.dispose(model); OldArt.dispose(model);
      let t0 = performance.now(); const to = paint(OldArt, v); settle(to); const firstOld = performance.now() - t0;
      t0 = performance.now(); const tn = paint(NewArt, v); settle(tn); const firstNew = performance.now() - t0;
      const so = [], sn = [];
      for (let i = 0; i < runs + 2; i++) {
        t0 = performance.now(); const a = paint(OldArt, v); settle(a); if (i >= 2) so.push(performance.now() - t0);
        t0 = performance.now(); const b = paint(NewArt, v); settle(b); if (i >= 2) sn.push(performance.now() - t0);
      }
      const co = onBlack(to, v), cn = onBlack(tn, v), w = v.w, h = v.h;
      const da = co.getContext('2d').getImageData(0, 0, w, h).data, db = cn.getContext('2d').getImageData(0, 0, w, h).data;
      const diff = canvas(w, h), dg = diff.getContext('2d'), di = dg.createImageData(w, h);
      let sum = 0, over = 0;
      for (let i = 0; i < da.length; i += 4) {
        const dr = Math.abs(da[i] - db[i]), dgn = Math.abs(da[i + 1] - db[i + 1]), dbl = Math.abs(da[i + 2] - db[i + 2]);
        sum += (dr + dgn + dbl) / 3; if (Math.max(dr, dgn, dbl) > threshold) over++;
        di.data[i] = dr; di.data[i + 1] = dgn; di.data[i + 2] = dbl; di.data[i + 3] = 255;
      }
      dg.putImageData(di, 0, 0);
      let side = null;
      if (v.name === 'rest' || v.name === 'object') { const sc = canvas(w * 3, h), g = sc.getContext('2d'); g.drawImage(co, 0, 0); g.drawImage(cn, w, 0); g.drawImage(diff, w * 2, 0); side = sc.toDataURL('image/png').split(',')[1]; }
      out.push({ view: v.name, size: w + 'x' + h, mad: sum / (w * h), over: over / (w * h), old: median(so), neu: median(sn), firstOld, firstNew, side,
        counts: ['cubes', 'glasses', 'points', 'lines', 'quads', 'bars', 'spheres'].map((k) => k + ':' + model[k].length).join(' ') });
    }
    return out;
  }, { num, views: VIEWS, runs: RUNS, threshold: THRESHOLD });
  await ctx.close();
  return { res, errors };
}

const f = (n) => (Math.round(n * 100) / 100).toString();
async function main() {
  const nums = process.argv.slice(2);
  if (!nums.length) throw new Error('card-parity: no card number given. Pass one or more review samples, for example: node scripts/card-parity.mjs 27 263 512');
  const threeText = readFileSync(THREE_SRC, 'utf8');
  const oldSrc = execFileSync('git', ['show', (process.env.OLD_REF || 'HEAD') + ':js/nft/art3d.js'], { cwd: REPO, maxBuffer: 64 * 1024 * 1024 }).toString();
  const pw = loadPlaywright(), browser = await pw[process.env.BROWSER || 'webkit'].launch();
  mkdirSync(OUT, { recursive: true });
  try {
    for (const num of nums) {
      const { res, errors } = await one(browser, num, oldSrc, threeText);
      for (const r of res) {
        let png = '';
        if (r.side) { png = join(OUT, 'card-' + num + '-' + r.view + '-side.png'); writeFileSync(png, Buffer.from(r.side, 'base64')); }
        console.log(['card=' + num, 'view=' + r.view, 'size=' + r.size, 'mad=' + f(r.mad), 'over' + THRESHOLD + '=' + f(r.over * 100) + '%',
          'old=' + f(r.old) + 'ms', 'new=' + f(r.neu) + 'ms', 'firstOld=' + f(r.firstOld) + 'ms', 'firstNew=' + f(r.firstNew) + 'ms',
          'err=' + (errors.length ? errors.length + ':' + errors.join(' // ').replace(/\s+/g, ' ').slice(0, 300) : '0'), r.view === 'rest' ? 'model[' + r.counts + ']' : '', png].filter(Boolean).join(' '));
      }
    }
  } finally { await browser.close(); }
}
/* the program runs only when this file is started, never on import */
if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e.message); process.exit(1); });

#!/usr/bin/env node
/* =====================================================================
   SKIN RULE CHECK: a worn card never recolours the core grid.
   ---------------------------------------------------------------------
   Why: docs/design/world-grammar/NFT-SKINS.md section 7 and SKIN-CONTRACT 4e: the card draws in its own context and
   never into the world's canvas, so the grammar world's pixels outside the card's box must equal the same frame with no
   skin. This loads one route under ?world=2 twice, bare and with ?skin-sample=<n> worn, waits until the card has drawn
   (when it is on the page), hides every element but the world layer, screenshots the canvas once the camera is still, and
   counts the pixels that differ, outside the card's box when the card is on the page.

   Usage:   PLAYWRIGHT_DIR=<dir> node scripts/card-skin-rule.mjs [/kit] [263]
   Env:     SITE (default http://127.0.0.1:3438), BROWSER (webkit | chromium, default webkit), STEP (largest per-channel
            difference still counted as equal, default 1: one step of rounding)
   Output:  one text line: route, sample, pixels compared, pixels over STEP, largest difference, the card's box, errors.
   ===================================================================== */
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SITE = process.env.SITE || 'http://127.0.0.1:3438';
const STEP = Number(process.env.STEP || 1);
function loadPlaywright() {
  const dir = process.env.PLAYWRIGHT_DIR;
  if (!dir) throw new Error('card-skin-rule: PLAYWRIGHT_DIR is not set. It must name a folder whose node_modules holds Playwright (the site itself takes no library). Set it and run again.');
  return createRequire(join(resolve(dir), 'package.json'))('playwright');
}
async function shot(browser, url, wantCard, n) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(SITE + url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.ArkWorldHost && window.ArkWorldHost.ready, null, { timeout: 30000 }).catch(() => errors.push('world did not become ready'));
  let box = null;
  if (wantCard) {
    /* a visible card on the page: sample n worn through the card's own mount, drawn into a box at the bottom left, as /account does */
    const ok = await page.evaluate(async (n) => {
      await DefxnSkinSite.art(); await new Promise((res, rej) => { if (window.DefxnCard) return res(); const t = document.createElement('script'); t.src = '/js/nft/card.js'; t.onload = res; t.onerror = () => rej(new Error('card.js did not load')); document.head.appendChild(t); });
      const rec = await DefxnSkinSite.sample(n), host = document.createElement('div');
      host.style.cssText = 'position:fixed;left:20px;bottom:20px;width:420px;z-index:50'; document.body.appendChild(host);
      const made = DefxnCard.mount(host, rec, {}); const card = await made.ready; await new Promise((res) => { const t = setTimeout(res, 20000), id = setInterval(() => { if (card.classList.contains('is-new')) { clearInterval(id); clearTimeout(t); res(); } }, 100); });
      return card.classList.contains('is-new');
    }, n).catch((e) => { errors.push(String(e.message || e)); return false; });
    if (!ok) errors.push('the card did not draw');
    box = await page.evaluate(() => { const c = document.querySelector('.nft-box'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: Math.floor(r.x), y: Math.floor(r.y), w: Math.ceil(r.width), h: Math.ceil(r.height) }; });
  }
  await page.addStyleTag({ content: 'body *{visibility:hidden !important} .world-layer,.world-layer *{visibility:visible !important}' });
  const canvas = page.locator('#chains');
  let prev = null, last = null;
  for (let i = 0; i < 80; i++) {
    await page.waitForTimeout(250);
    const cur = await canvas.screenshot({ type: 'png' });
    if (prev && Buffer.compare(prev, cur) === 0) { last = cur; break; }
    prev = cur; last = cur;
  }
  await ctx.close();
  return { png: last, errors, box };
}
async function main() {
  const route = process.argv[2] || '/kit', n = process.argv[3] || '263', sep = route.includes('?') ? '&' : '?';
  const pw = loadPlaywright(), browser = await pw[process.env.BROWSER || 'webkit'].launch();
  try {
    const bare = await shot(browser, route + sep + 'world=2', false);
    const worn = await shot(browser, route + sep + 'world=2', true, n);
    const page = await (await browser.newContext({ viewport: { width: 400, height: 300 } })).newPage();
    const r = await page.evaluate(async ({ a, b, box, step }) => {
      const load = (s) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => no(new Error('png did not decode')); im.src = 'data:image/png;base64,' + s; });
      const [ia, ib] = await Promise.all([load(a), load(b)]), w = ia.width, h = ia.height;
      const grab = (im) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0); return g.getImageData(0, 0, w, h).data; };
      const da = grab(ia), db = grab(ib); let n = 0, over = 0, max = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (box && x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h) continue;
        const i = (y * w + x) * 4, d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
        n++; if (d > step) over++; if (d > max) max = d;
      }
      return { n, over, max, size: w + 'x' + h };
    }, { a: bare.png.toString('base64'), b: worn.png.toString('base64'), box: worn.box, step: STEP });
    const errs = bare.errors.concat(worn.errors).filter((e) => !/anim-sample|status of 404/.test(e));
    console.log(['route=' + route, 'sample=' + n, 'canvas=' + r.size, 'compared=' + r.n, 'over' + STEP + '=' + r.over, 'maxdiff=' + r.max,
      'cardbox=' + (worn.box ? [worn.box.x, worn.box.y, worn.box.w, worn.box.h].join(',') : 'none (no card on the page)'), 'err=' + (errs.length ? errs.length + ':' + errs.join(' // ').slice(0, 300) : '0')].join(' '));
  } finally { await browser.close(); }
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e.message); process.exit(1); });

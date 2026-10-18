/* =====================================================================
   PUBLIC HEADER -- the site header (js/resolvers/header.js, styled by
   css/navigation.css) must fit one row at phone widths with nothing cut.

   Why this exists: at 360-430px the row held the DEFXN wordmark, a text
   Account button, the network pill and the MENU button, and the
   compact rules let the wordmark and Account shrink with text-overflow:
   ellipsis -- so the brand read "DE..." and Account read "Ac...". Every
   control was present, clickable and in the viewport; only measuring each
   label's own box against its text shows the cut. So this measures text,
   not presence.

   Per width (360, 390, 430) and route (home + inner pages) it asserts:
   - every visible header control (the identity link, each shown core link,
     the network pill, the MENU button) and every text-bearing element
     inside it is not truncated: scrollWidth <= clientWidth + 1, and each
     text run's box lies inside the control and inside every clipping
     ancestor (so an ellipsis that is actually clipping is caught);
   - the wordmark renders its full text;
   - every control lies inside the viewport, and no two overlap;
   - the controls share one row (a common vertical band) and the pill
     controls share one height;
   - every core link hidden at this width is still reachable from the
     MENU panel (#primary-navigation holds a link to the same href);
   - the document has no horizontal page scroll.

   Run by hand (needs Chromium; not part of scripts/run-tests.mjs):
     node tests/browser/public-header.mjs [screenshot-dir]
   PUBLIC_HEADER_WIDTHS=320,600,760 probes other widths.
   With a screenshot dir it also saves the header (and the open MENU) per
   width on the home route.
   ===================================================================== */
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { copySite, startHost } from './harness.mjs';
import { settled } from './route-sweep.mjs';

/* PUBLIC_HEADER_WIDTHS=320,600 probes other widths. */
const WIDTHS = process.env.PUBLIC_HEADER_WIDTHS
  ? process.env.PUBLIC_HEADER_WIDTHS.split(',').map((w) => [Number(w), 844])
  : [[360, 780], [390, 844], [430, 932]];
const ROUTES = ['zero', 'about', 'explorer', 'account'];

async function freePort() {
  const probe = http.createServer();
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const { port } = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

export function measureHeader(page) {
  return page.evaluate(() => {
    const problems = [];
    const vw = document.documentElement.clientWidth;
    const header = document.querySelector('#scene .ark-header');
    if (!header) return { problems: ['no .ark-header'], controls: [] };
    const shown = (el) => {
      if (!el || el.closest('[hidden]')) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const name = (el) => el.getAttribute('aria-label') || el.textContent.trim().replace(/\s+/g, ' ') || el.className;
    /* the row's controls: popovers and the MENU panel are closed while measuring */
    const candidates = [header.querySelector('.ark-studio-identity'),
      ...header.querySelectorAll('.header-core-links > a, .header-products-toggle, .header-chain-trigger, .nav-toggle')];
    const controls = candidates.filter(shown);
    const rects = controls.map((el) => el.getBoundingClientRect());

    controls.forEach((el, i) => {
      const r = rects[i], label = name(el);
      /* not truncated: the control and every text-bearing descendant */
      [el, ...el.querySelectorAll('*')].filter((n) => shown(n) && [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())).forEach((n) => {
        const cs = getComputedStyle(n);
        if (cs.display !== 'inline' && n.scrollWidth > n.clientWidth + 1) problems.push(`"${label}": <${n.className || n.tagName}> text overflows its box (scrollWidth ${n.scrollWidth} > clientWidth ${n.clientWidth}${cs.textOverflow === 'ellipsis' ? ', ellipsis showing' : ''})`);
      });
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (t) => t.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
      let t;
      while ((t = walker.nextNode())) {
        if (!shown(t.parentElement)) continue;
        const range = document.createRange(); range.selectNodeContents(t);
        const b = range.getBoundingClientRect();
        for (let a = t.parentElement; a && a !== header; a = a.parentElement) {
          const ov = getComputedStyle(a).overflowX;
          if (a !== el && ov === 'visible') continue;
          const ar = a.getBoundingClientRect();
          if (b.left < ar.left - 1 || b.right > ar.right + 1) { problems.push(`"${label}": text "${t.textContent.trim()}" is clipped by <${a.className || a.tagName}> (${Math.round(b.left)}-${Math.round(b.right)} vs ${Math.round(ar.left)}-${Math.round(ar.right)})`); break; }
          if (a === el) break;
        }
      }
      if (r.left < -0.5 || r.right > vw + 0.5 || r.top < -0.5) problems.push(`"${label}" lies outside the viewport (${Math.round(r.left)}-${Math.round(r.right)} of ${vw})`);
    });
    for (let i = 0; i < controls.length; i++) for (let j = i + 1; j < controls.length; j++) {
      const a = rects[i], b = rects[j];
      if (a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5) problems.push(`"${name(controls[i])}" overlaps "${name(controls[j])}"`);
    }
    const bandTop = Math.max(...rects.map((r) => r.top)), bandBottom = Math.min(...rects.map((r) => r.bottom));
    if (rects.length && bandTop >= bandBottom) problems.push('the header controls do not share one row');
    const pills = controls.filter((el) => !el.matches('.ark-studio-identity')).map((el) => Math.round(el.getBoundingClientRect().height));
    if (pills.length && Math.max(...pills) - Math.min(...pills) > 1) problems.push(`control heights differ: ${pills.join(', ')}`);

    const wordmark = header.querySelector('.ark-brand-wordmark');
    if (!shown(wordmark)) problems.push('the wordmark is not shown');
    else if (wordmark.scrollWidth > wordmark.clientWidth + 1) problems.push(`the wordmark "${wordmark.textContent}" is cut (${wordmark.scrollWidth} > ${wordmark.clientWidth})`);
    if (!controls.some((el) => el.matches('.header-chain-trigger')) && !header.querySelector('.header-chain[hidden]')) problems.push('the network pill is not shown');
    if (!controls.some((el) => el.matches('.nav-toggle'))) problems.push('the MENU button is not shown');

    /* reachability: a core link the row hides must be in the MENU panel */
    const menu = header.querySelector('#primary-navigation');
    const menuHrefs = new Set([...(menu ? menu.querySelectorAll('a[href]') : [])].map((a) => a.getAttribute('href')));
    header.querySelectorAll('.header-core-links > a').forEach((a) => {
      if (!shown(a) && !menuHrefs.has(a.getAttribute('href'))) problems.push(`"${name(a)}" is hidden from the row and missing from the MENU (${a.getAttribute('href')})`);
    });
    const hScroll = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    if (hScroll > 1) problems.push(`horizontal page scroll of ${hScroll}px`);
    return { problems, controls: controls.map((el, i) => `${name(el).slice(0, 24)} ${Math.round(rects[i].left)}-${Math.round(rects[i].right)}x${Math.round(rects[i].height)}`) };
  });
}

async function main() {
  const shotDir = process.argv[2] || null;
  if (shotDir) fs.mkdirSync(shotDir, { recursive: true });
  const root = copySite(fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-public-header-')));
  const port = await freePort();
  const server = await startHost(root, port);
  const base = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch();
  const failures = [];
  try {
    for (const [width, height] of WIDTHS) {
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
      for (const id of ROUTES) {
        const page = await context.newPage();
        try {
          const routePath = id === 'zero' ? '/' : await (async () => {
            await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
            await page.waitForFunction(() => window.ArkUI && ArkUI.pageCatalog, null, { timeout: 20000 });
            return page.evaluate((key) => ArkUI.pageCatalog[key].path, id);
          })();
          await page.goto(base + routePath, { waitUntil: 'domcontentloaded' });
          await settled(page, id);
          await page.evaluate(() => document.fonts.ready);
          /* the network pill's label arrives from a lazily imported module */
          await page.waitForFunction(() => { const l = document.querySelector('.header-chain-trigger-label'); return !l || l.textContent !== 'Network' || l.closest('[hidden]'); }, null, { timeout: 10000 }).catch(() => {});
          const result = await measureHeader(page);
          const tag = `${width} ${routePath} (${id})`;
          if (result.problems.length) { failures.push(tag); console.log(`FAIL ${tag}\n  - ${result.problems.join('\n  - ')}`); }
          else console.log(`ok   ${tag}: ${result.controls.join(' | ')}`);
          if (shotDir && id === 'zero') {
            await page.screenshot({ path: path.join(shotDir, `after-public-${width}.png`), clip: { x: 0, y: 0, width, height: 160 } });
            await page.click('.nav-toggle');
            await page.waitForSelector('#primary-navigation', { state: 'visible' });
            await page.waitForTimeout(250);
            await page.screenshot({ path: path.join(shotDir, `after-public-${width}-menu.png`) });
          }
        } catch (error) {
          failures.push(`${width} ${id}`);
          console.log(`FAIL ${width} ${id}: ${String(error.message || error).split('\n')[0]}`);
        } finally { await page.close(); }
      }
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
  if (failures.length) { console.log(`\n${failures.length} failing header checks`); process.exit(1); }
  console.log('\nPASS: the public header fits one row at 360-430px with nothing truncated, overlapping or unreachable.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => { console.error(error); process.exit(1); });

/* =====================================================================
   PUBLIC HEADER -- the site header (js/resolvers/header.js, styled by
   css/navigation.css) must fit one row, phone to desktop, with nothing cut.

   Why this exists: at 360-430px the row held the DEFXN wordmark, a text
   Account button, the network pill and the MENU button, and the
   compact rules let the wordmark and Account shrink with text-overflow:
   ellipsis -- so the brand read "DE..." and Account read "Ac...". Every
   control was present, clickable and in the viewport; only measuring each
   label's own box against its text shows the cut. So this measures text,
   not presence.

   The desktop row had the same defect another way: from 1041px up every
   core link stayed in the row and shrank, so at 1280px "How it works",
   "Mesh Explorer" and "Run DEFXN" wrapped onto two lines and Account read
   "Acc..." -- and no check here looked at wrapping. The row now measures
   itself and moves the lowest-priority links into the MENU instead
   (fitHeaderRow in js/resolvers/header.js).

   Since 2026-10-19 the header is the DEFXN family bar (the product kit's
   .dx-bar, mounted in home mode by js/resolvers/header.js): brand, product
   switcher, this site's nav (Resolutions + core links), then Account, Run
   DEFXN, the network pill and MENU in the bar's actions. The same checks
   hold for it; on a phone the brand is the kit's (the mark alone, named
   "DEFXN -- home"), and the bar must stay ONE row (the kit's phone bar would
   wrap its nav onto a second, pushing the page down).

   Per width (360, 390, 430, 1024, 1280, 1440, 1920) and route (home +
   inner pages) it asserts:
   - every visible header control (the identity link, each shown core link,
     the network pill, the MENU button) and every text-bearing element
     inside it is not truncated: scrollWidth <= clientWidth + 1, and each
     text run's box lies inside the control and inside every clipping
     ancestor (so an ellipsis that is actually clipping is caught);
   - no text run wraps: each one's line boxes share one line;
   - the wordmark renders its full text;
   - every control lies inside the viewport, and no two overlap;
   - the controls share one row (a common vertical band); in the compact
     layout (<=1040px), where each control is its own pill, they share one
     height -- above it the inner pages group the links in one segmented
     bar and Resolutions is a text trigger, by design, so heights differ;
   - every core link hidden at this width, and the Resolutions menu when
     it is hidden, is still reachable from the MENU panel
     (#primary-navigation holds a link to the same page);
   - the document has no horizontal page scroll.

   Run by hand (needs Chromium; not part of scripts/run-tests.mjs):
     node tests/browser/public-header.mjs [screenshot-dir]
   PUBLIC_HEADER_WIDTHS=320,600,760 probes other widths.
   With a screenshot dir it also saves the header (and the open MENU) per
   width on the home route.
   ===================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { copySite, startHost, routeSettled, animationsSettled, scaled } from './harness.mjs';

const settled = (page, id) => routeSettled(page, id, 20000);

/* PUBLIC_HEADER_WIDTHS=320,600 probes other widths. */
const WIDTHS = process.env.PUBLIC_HEADER_WIDTHS
  ? process.env.PUBLIC_HEADER_WIDTHS.split(',').map((w) => [Number(w), 844])
  : [[360, 780], [390, 844], [430, 932], [1024, 768], [1280, 800], [1440, 900], [1920, 1080]];
const ROUTES = ['zero', 'about', 'explorer', 'account'];

export function measureHeader(page) {
  /* after a few frames: the row re-fits in the frame after a ResizeObserver sees a width change */
  return page.evaluate(async () => {
    for (let i = 0; i < 4; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
    const problems = [];
    const vw = document.documentElement.clientWidth;
    const header = document.querySelector('#scene .ark-header');
    if (!header) return { problems: ['no .ark-header'], controls: [] };
    if (!header.classList.contains('dx-bar')) problems.push('the header is not the family bar (.dx-bar)');
    const shown = (el) => {
      if (!el || el.closest('[hidden]')) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const name = (el) => el.getAttribute('aria-label') || el.textContent.trim().replace(/\s+/g, ' ') || el.className;
    /* the row's controls: popovers and the MENU panel are closed while measuring */
    const candidates = [header.querySelector('.dx-bar__brand'),
      ...header.querySelectorAll('.dx-switch__trigger, .header-core-links > a, .header-products-toggle, .header-account-link, .header-run-link, .header-chain-trigger, .nav-toggle')];
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
        /* wrapped: the run's line boxes do not share one line */
        const lines = [...range.getClientRects()].filter((r) => r.width > 0);
        if (lines.length > 1 && Math.max(...lines.map((r) => r.top)) - Math.min(...lines.map((r) => r.top)) > 2) problems.push(`"${label}": text "${t.textContent.trim()}" wraps onto ${new Set(lines.map((r) => Math.round(r.top))).size} lines`);
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
    /* the compact layout's breakpoint, the same 1040px css/navigation.css switches at */
    const compact = matchMedia('(max-width:1040px)').matches;
    const pills = controls.filter((el) => !el.matches('.dx-bar__brand')).map((el) => Math.round(el.getBoundingClientRect().height));
    if (compact && pills.length && Math.max(...pills) - Math.min(...pills) > 1) problems.push(`control heights differ: ${pills.join(', ')}`);

    /* the brand: the word in full above the kit's phone width, the named mark on a phone */
    const phone = matchMedia('(max-width:640px)').matches;
    const brand = header.querySelector('.dx-bar__brand');
    const wordmark = header.querySelector('.dx-bar__brand-word');
    const mark = header.querySelector('.dx-bar__brand .dx-mark');
    if (!shown(mark)) problems.push('the DEFXN mark is not shown');
    if (!brand || !/DEFXN/.test(brand.getAttribute('aria-label') || '')) problems.push('the brand link is not named DEFXN');
    if (!phone && !shown(wordmark)) problems.push('the wordmark is not shown');
    else if (shown(wordmark) && wordmark.scrollWidth > wordmark.clientWidth + 1) problems.push(`the wordmark "${wordmark.textContent}" is cut (${wordmark.scrollWidth} > ${wordmark.clientWidth})`);
    if (!controls.some((el) => el.matches('.dx-switch__trigger'))) problems.push('the product switcher is not shown');
    if (!controls.some((el) => el.matches('.header-account-link'))) problems.push('Account is not shown (it is never collapsed)');
    if (!controls.some((el) => el.matches('.header-chain-trigger')) && !header.querySelector('.header-chain[hidden]')) problems.push('the network pill is not shown');
    if (!controls.some((el) => el.matches('.nav-toggle'))) problems.push('the MENU button is not shown');
    /* one row: the bar keeps the kit's height (the page below is placed for it) */
    const barHeight = header.getBoundingClientRect().height - (parseFloat(getComputedStyle(header).paddingTop) || 0);
    const expected = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dx-bar-h')) || 64;
    if (Math.abs(barHeight - expected) > 1) problems.push(`the bar is ${Math.round(barHeight)}px tall, not one ${expected}px row`);

    /* reachability: a core link the row hides must be in the MENU panel */
    const menu = header.querySelector('#primary-navigation');
    const menuHrefs = new Set([...(menu ? menu.querySelectorAll('a[href]') : [])].map((a) => a.getAttribute('href')));
    header.querySelectorAll('.header-core-links > a, .header-run-link').forEach((a) => {
      if (!shown(a) && !menuHrefs.has(a.getAttribute('href'))) problems.push(`"${name(a)}" is hidden from the row and missing from the MENU (${a.getAttribute('href')})`);
    });
    const products = header.querySelector('.header-products-toggle');
    if (products && !shown(products) && !(menu && menu.querySelector('[data-nav-route="resolutions"]'))) problems.push('the Resolutions menu is hidden from the row and Resolutions is missing from the MENU');
    const hScroll = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    if (hScroll > 1) problems.push(`horizontal page scroll of ${hScroll}px`);
    return { problems, controls: controls.map((el, i) => `${name(el).slice(0, 24)} ${Math.round(rects[i].left)}-${Math.round(rects[i].right)}x${Math.round(rects[i].height)}`) };
  });
}

async function main() {
  const shotDir = process.argv[2] || null;
  if (shotDir) fs.mkdirSync(shotDir, { recursive: true });
  const root = copySite(fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-public-header-')));
  const server = await startHost(root);
  const base = server.origin;
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
            await page.waitForFunction(() => window.ArkUI && ArkUI.pageCatalog, null, { timeout: scaled(20000) });
            return page.evaluate((key) => ArkUI.pageCatalog[key].path, id);
          })();
          await page.goto(base + routePath, { waitUntil: 'domcontentloaded' });
          await settled(page, id);
          await page.evaluate(() => document.fonts.ready);
          /* the network pill's label arrives from a lazily imported module */
          await page.waitForFunction(() => { const l = document.querySelector('.header-chain-trigger-label'); return !l || l.textContent !== 'Network' || l.closest('[hidden]'); }, null, { timeout: scaled(10000) }).catch(() => {});
          const result = await measureHeader(page);
          const tag = `${width} ${routePath} (${id})`;
          if (result.problems.length) { failures.push(tag); console.log(`FAIL ${tag}\n  - ${result.problems.join('\n  - ')}`); }
          else console.log(`ok   ${tag}: ${result.controls.join(' | ')}`);
          if (shotDir && id === 'zero') {
            await page.screenshot({ path: path.join(shotDir, `after-public-${width}.png`), clip: { x: 0, y: 0, width, height: 160 } });
            await page.click('.nav-toggle');
            await page.waitForSelector('#primary-navigation', { state: 'visible' });
            await animationsSettled(page);   /* the menu's open animation is over */
            await page.screenshot({ path: path.join(shotDir, `after-public-${width}-menu.png`) });
          }
          if (id === 'zero') {
            /* The pill's width follows the chosen network's label, so pick each known network
               by real clicks and re-measure; the list comes from the page, not from here. The
               last pick stays remembered, so the inner routes after this run with it too. */
            await page.goto(base + routePath, { waitUntil: 'domcontentloaded' });
            await settled(page, id);
            /* open the popover, read its options once they are there (not after a fixed 100 ms), close it */
            await page.evaluate(() => document.querySelector('.header-chain-trigger').click());
            await page.waitForSelector('#header-chain-popover .network-option', { state: 'attached', timeout: scaled(5000) }).catch(() => {});
            const options = await page.evaluate(() => { const labels = [...document.querySelectorAll('#header-chain-popover .network-option')].map((o) => o.textContent.trim()); document.querySelector('.header-chain-trigger').click(); return labels; });
            for (let i = 0; i < options.length; i++) {
              await page.click('.header-chain-trigger');
              await page.click(`#header-chain-popover .network-option >> nth=${i}`);
              /* picking the network already chosen leaves the popover open (a no-op choice) */
              if (await page.isVisible('#header-chain-popover')) await page.keyboard.press('Escape');
              await page.waitForFunction((label) => document.querySelector('.header-chain-trigger-label').textContent === label, options[i], { timeout: scaled(5000) }).catch(() => {});
              const picked = await measureHeader(page);
              const pickTag = `${width} ${routePath} (${id}, network "${options[i]}")`;
              if (picked.problems.length) { failures.push(pickTag); console.log(`FAIL ${pickTag}\n  - ${picked.problems.join('\n  - ')}`); }
              else console.log(`ok   ${pickTag}: ${picked.controls.join(' | ')}`);
            }
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
  console.log(`\nPASS: the public header fits one row at ${WIDTHS.map(([w]) => w).join(', ')}px with nothing truncated, wrapped, overlapping or unreachable.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => { console.error(error); process.exit(1); });

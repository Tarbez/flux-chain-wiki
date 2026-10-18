/* =====================================================================
   ROUTE SWEEP -- every route in the site catalog (ArkUI.pageCatalog) must
   actually show its content, at desktop and phone width.

   Why this exists: /about rendered 0px wide at every viewport. Its page sits
   position:absolute; inset:0 inside the router's continuity host, which
   js/ark/panel-continuity.js sizes with inline width/height -- and one rAF
   after each mount ArkLayout.apply() blanked every annotated element's inline
   width/height, the host's included (fixed in js/content/layout.js; unit
   regression: tests/layout-reset-owns-only-its-writes.cjs). The page loaded,
   the router reported ready, no error was thrown, every counter balanced:
   only measuring the box shows a page with nothing in it. So this measures
   the box, for every route, rather than trusting that a route that loads
   is a route that shows.

   Per route and width it asserts, after the router reports idle and
   ArkLayout's deferred pass has run:
   - the mounted page element ([data-ark-page]) has non-zero width/height --
     at least half the viewport width and 40% of its height -- overlaps the
     viewport, and is not display:none/hidden;
   - if the route is held in the continuity host, that host has non-zero
     width/height;
   - some visible text inside the page has non-zero size and lies at least
     partly inside the viewport horizontally;
   - the document has no horizontal page overflow.

   Modes: a direct load of every route at 1280 and 390; plus in-app
   navigation (Home -> route through ArkUI.pageRouter.navigate, the path a
   click takes, where the continuity host may expand from a card) at 1280.

   Run by hand (needs Chromium; not part of scripts/run-tests.mjs):
     node tests/browser/route-sweep.mjs [screenshot-dir]
   ROUTE_SWEEP_ONLY=about,chain limits it to some catalog ids.
   ===================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { copySite, startHost, routeSettled, scaled } from './harness.mjs';

const WIDTHS = [[1280, 800], [390, 844]];
const CONCURRENCY = 4;

/* The router is idle on `id` (harness routeSettled: mounted, shown, transition over, finite
   animations ended, two frames painted). Kept under this name for the drivers that import it. */
export const settled = (page, id) => routeSettled(page, id, 20000);

export function measure(page, id) {
  return page.evaluate((pageId) => {
    const vw = document.documentElement.clientWidth, vh = innerHeight;
    const el = document.querySelector(`[data-ark-page="${CSS.escape(pageId)}"]`);
    const out = { problems: [] };
    if (!el) { out.problems.push('no mounted page element'); return out; }
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    out.page = { w: Math.round(r.width), h: Math.round(r.height) };
    if (r.width < 1 || r.height < 1) out.problems.push(`page element is ${Math.round(r.width)}x${Math.round(r.height)}`);
    /* Not just non-zero: with the /about defect the page box was 128x80 (its own padding
       inside a 0x0 host) and its text still had boxes, overflowing a sliver. Every route
       measured fills at least 91% of the width and 81% of the height (2026-10-18 sweep), so
       half the width and 40% of the height is a floor no working route comes near. */
    else if (r.width < vw * 0.5 || r.height < vh * 0.4) out.problems.push(`page element is only ${Math.round(r.width)}x${Math.round(r.height)} in a ${vw}x${vh} viewport`);
    if (cs.display === 'none' || cs.visibility === 'hidden') out.problems.push(`page element is ${cs.display === 'none' ? 'display:none' : 'visibility:hidden'}`);
    if (r.right <= 0 || r.left >= vw || r.bottom <= 0 || r.top >= vh) out.problems.push('page element lies wholly outside the viewport');
    const host = el.closest('.continuity-host');
    if (host) {
      const h = host.getBoundingClientRect();
      out.host = { w: Math.round(h.width), h: Math.round(h.height) };
      if (h.width < 1 || h.height < 1) out.problems.push(`continuity host is ${Math.round(h.width)}x${Math.round(h.height)}`);
    }
    /* the first few visible text runs: any one with a real box partly on screen counts */
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => n.textContent.trim().length > 2 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
    let seen = 0, shown = 0, node;
    while ((node = walker.nextNode()) && seen < 40) {
      const parent = node.parentElement; if (!parent || parent.closest('[hidden],[aria-hidden="true"]')) continue;
      const pcs = getComputedStyle(parent); if (pcs.visibility === 'hidden' || pcs.display === 'none') continue;
      seen++;
      const range = document.createRange(); range.selectNodeContents(node);
      const b = range.getBoundingClientRect();
      if (b.width >= 1 && b.height >= 1 && b.right > 0 && b.left < vw) shown++;
    }
    out.text = { seen, shown };
    if (seen && !shown) out.problems.push(`none of the first ${seen} text runs has a visible box`);
    if (!seen) out.problems.push('no visible text in the page');
    out.hScroll = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    if (out.hScroll > 1) out.problems.push(`horizontal page overflow of ${out.hScroll}px`);
    return out;
  }, id);
}

async function pool(items, size, fn) {
  const results = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) { const i = next++; results[i] = await fn(items[i], i); }
  }));
  return results;
}

async function main() {
  const shotDir = process.argv[2] || null;
  if (shotDir) fs.mkdirSync(shotDir, { recursive: true });
  const root = copySite(fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-route-sweep-')));
  const server = await startHost(root);
  const base = server.origin;
  const browser = await chromium.launch();
  const failures = [];
  try {
    /* the catalog as the live page builds it (articles, resolutions, theory sheets included) */
    const probe = await browser.newPage();
    await probe.goto(base + '/', { waitUntil: 'domcontentloaded' });
    await probe.waitForFunction(() => window.ArkUI && ArkUI.pageCatalog && ArkUI.pageRouter, null, { timeout: scaled(20000) });
    let routes = await probe.evaluate(() => Object.keys(ArkUI.pageCatalog).map((id) => ({ id, path: ArkUI.pageCatalog[id].path })));
    await probe.close();
    if (process.env.ROUTE_SWEEP_ONLY) { const only = process.env.ROUTE_SWEEP_ONLY.split(','); routes = routes.filter((r) => only.includes(r.id)); }
    console.log(`${routes.length} catalog routes`);

    const report = (mode, width, route, result) => {
      const tag = `${mode} ${width} ${route.path} (${route.id})`;
      if (result.problems.length) { failures.push({ tag, problems: result.problems }); console.log(`FAIL ${tag}: ${result.problems.join('; ')}`); }
      else console.log(`ok   ${tag} page ${result.page.w}x${result.page.h}${result.host ? ` host ${result.host.w}x${result.host.h}` : ''} text ${result.text.shown}/${result.text.seen}`);
    };
    const shoot = async (page, name) => { if (shotDir) await page.screenshot({ path: path.join(shotDir, name.replace(/[^a-z0-9-]+/gi, '_') + '.png') }); };

    for (const [width, height] of WIDTHS) {
      const context = await browser.newContext({ viewport: { width, height } });
      await pool(routes, CONCURRENCY, async (route) => {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        try {
          await page.goto(base + route.path, { waitUntil: 'domcontentloaded' });
          await settled(page, route.id);
          const result = await measure(page, route.id);
          if (errors.length) result.problems.push('page error: ' + errors[0]);
          report('direct', width, route, result);
          if (result.problems.length) await shoot(page, `direct-${width}-${route.id}`);
        } catch (error) {
          failures.push({ tag: `direct ${width} ${route.path}`, problems: [String(error.message || error).split('\n')[0]] });
          console.log(`FAIL direct ${width} ${route.path}: ${String(error.message || error).split('\n')[0]}`);
        } finally { await page.close(); }
      });
      await context.close();
    }

    /* in-app: Home first, then the route through the router, as a click would */
    const [width, height] = WIDTHS[0];
    const context = await browser.newContext({ viewport: { width, height } });
    await pool(routes.filter((r) => r.id !== 'zero'), CONCURRENCY, async (route) => {
      const page = await context.newPage();
      try {
        await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
        await settled(page, 'zero');
        await page.evaluate((id) => ArkUI.pageRouter.navigate(id), route.id);
        await settled(page, route.id);
        const result = await measure(page, route.id);
        report('in-app', width, route, result);
        if (result.problems.length) await shoot(page, `in-app-${width}-${route.id}`);
      } catch (error) {
        failures.push({ tag: `in-app ${width} ${route.path}`, problems: [String(error.message || error).split('\n')[0]] });
        console.log(`FAIL in-app ${width} ${route.path}: ${String(error.message || error).split('\n')[0]}`);
      } finally { await page.close(); }
    });
    await context.close();
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
  if (failures.length) { console.log(`\n${failures.length} failing route checks`); process.exit(1); }
  console.log('\nPASS: every catalog route shows content at every width, with no horizontal page overflow.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => { console.error(error); process.exit(1); });

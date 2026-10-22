/* =====================================================================
   SITE FIXES (W1-SITE-FIXES, 2026-10-19) -- the defects docs/ux-audit/pages.md,
   pages-ux-a.md and pages-ux-b.md found by clicking, checked by clicking.

   Each check below exists because the wrong version passed every code read and every counter:
   - P1: every in-page document link opened "Agreements" and "Return" went Home. Clicks real doc
     links on several routes and asserts the reader shows THAT document and returns to the page.
   - P8: an unknown address silently showed Home. Asserts a not-found page that names it.
   - /about P0: its ending sat under an overlay, invisible while contrast checks passed. Hit-tests
     the closing heading: the element at its centre must be the heading itself.
   - P3: /experiments + /experiments/lab were two pages, one model. Asserts the old address opens
     the merged page with one h1.
   - Footer strip / orphans: the only link to /experiments was invisible on every route; /stats/gpu
     and /palette had no inbound link. Asserts the visible strip and the new inbound links.
   - a11y: skip link reaches the page; the clipped fallback is inert; controls are not Arial;
     the resolutions tabpanel shows a focus ring; bar rows are not Tab stops.
   - "↗" means "leaves the site": every link on every route ending in ↗ (text or ::after) must.

   Run: node tests/browser/site-fixes.mjs   (harness copySite + startHost, OS-picked port --
   never 3437; every wait scaled by the harness load factor)
   ===================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { copySite, startHost, routeSettled, scaled, until } from './harness.mjs';

const failures = [];
const check = (ok, message) => { if (ok) console.log('ok   ' + message); else { failures.push(message); console.log('FAIL ' + message); } };
const settled = (page, id) => routeSettled(page, id, 20000);
const active = (page) => page.evaluate(() => ArkUI.pageRouter.active);

async function open(context, base, route) {
  const page = await context.newPage();
  page.on('pageerror', (e) => failures.push(`page error on ${route}: ${e.message}`));
  await page.goto(base + route, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.ArkUI && ArkUI.pageRouter && ArkUI.pageRouter.active, null, { timeout: scaled(20000) });
  await settled(page, await active(page));
  return page;
}

/* P1: click the first visible doc link on a route; the reader must show that doc, and Return must go back. */
async function docLinks(context, base) {
  for (const [route, key] of [['/stats', 'stats'], ['/download', 'download'], ['/resolutions/website', 'resolutions/website'], ['/stats/ledger', 'stats/ledger'], ['/stats/gpu', 'stats/gpu']]) {
    const page = await open(context, base, route);
    const target = await page.evaluate((id) => {
      const links = [...document.querySelectorAll(`[data-ark-page="${CSS.escape(id)}"] a[data-scene-link="reference"]`)].filter((a) => a.getClientRects().length);
      const a = links[0]; if (!a) return null;
      a.dataset.crawlPick = '1';
      return new URLSearchParams(a.getAttribute('href').split('?')[1] || '').get('doc');
    }, key);
    if (!target) { check(false, `${route}: has a visible document link to click`); await page.close(); continue; }
    await page.click('[data-crawl-pick="1"]');
    await settled(page, 'reference');
    /* The way back is the breadcrumb's link to the page the reader came from (its last link): "← Return to ..." stood
       above that breadcrumb and was removed as a second way back (first-visit audit 2026-10-22, /reference P2). */
    const BACK = '[data-ark-page="reference"] .ark-breadcrumb a[data-scene-link]:not([data-scene-link="zero"])';
    const shown = await page.evaluate((BACK) => { const el = document.querySelector('[data-ark-page="reference"]'); return { doc: el.dataset.referenceDoc, back: document.querySelector(BACK).dataset.sceneLink, url: location.pathname + location.search }; }, BACK);
    check(shown.doc === target, `${route}: the doc link opens ${target} (reader shows ${shown.doc})`);
    check(shown.back === key, `${route}: "Return" points back to ${key} (it points to ${shown.back})`);
    await page.click(BACK);
    await settled(page, shown.back);
    check(await page.evaluate(() => location.pathname) === route, `${route}: Return lands on ${route}`);
    await page.close();
  }
}

async function main() {
  const root = copySite(fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-site-fixes-')));
  const server = await startHost(root);
  const base = server.origin;
  const browser = await chromium.launch();
  try {
    const desk = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await docLinks(desk, base);

    /* P8: an unknown address names itself (in-app, as a stale link or Back would reach it) */
    {
      const page = await open(desk, base, '/');
      await page.evaluate(() => { history.pushState(null, '', '/no-such-page'); dispatchEvent(new PopStateEvent('popstate')); });
      await settled(page, 'notfound');
      const text = await page.evaluate(() => document.querySelector('[data-ark-page="notfound"]').textContent);
      check(text.includes('/no-such-page'), 'an unknown address shows a not-found page naming it');
      check(await page.evaluate(() => document.title).then((t) => !/^DEFXN$/.test(t)), 'and is not Home');
      await page.evaluate(() => { history.pushState(null, '', '/stast'); dispatchEvent(new PopStateEvent('popstate')); });
      await settled(page, 'notfound');
      check(await page.evaluate(() => !!document.querySelector('[data-ark-page="notfound"] a[href="/stats"]')), 'a typo offers the page that was meant');
      await page.close();
    }

    /* /about P0: the ending is visible -- the element at the closing heading's centre is the heading.
       Since 2026-10-19 (Ark blocks, js/pages/about.js) the ending's source boundary is a callout in
       sight in every view, and its closing line heads the pager in the Evidence & verification view:
       both are hit-tested. */
    {
      const page = await open(desk, base, '/about');
      const boundary = await page.evaluate(() => {
        const h = document.querySelector('#about-boundary [data-ark-part="alert-title"]');
        if (!h) return 'no boundary callout';
        h.scrollIntoView({ block: 'center' });
        const r = h.getBoundingClientRect(), at = document.elementFromPoint(r.left + Math.min(40, r.width / 2), r.top + r.height / 2);
        return at && (at === h || h.contains(at)) ? 'visible' : 'covered by ' + (at ? at.className || at.tagName : 'nothing');
      });
      check(boundary === 'visible', `/about: its source boundary is visible (${boundary})`);
      await page.evaluate(() => [...document.querySelectorAll('#about-views > [data-ark-part="tabs-list"] [role="tab"]')].pop().click());
      const hit = await page.evaluate(() => {
        const h = document.querySelector('#about-views [data-ark-part="pager-related"] > p');
        if (!h) return 'no closing heading';
        h.scrollIntoView({ block: 'center' });
        const r = h.getBoundingClientRect(), at = document.elementFromPoint(r.left + Math.min(40, r.width / 2), r.top + r.height / 2);
        return at && (at === h || h.contains(at)) ? 'visible' : 'covered by ' + (at ? at.className || at.tagName : 'nothing');
      });
      check(hit === 'visible', `/about: its closing heading is visible (${hit})`);
      await page.close();
    }

    /* P3: the merged interactive model */
    {
      const page = await open(desk, base, '/experiments/lab');
      check(await active(page) === 'proximity', '/experiments/lab opens the merged /experiments page');
      check(await page.evaluate(() => document.querySelectorAll('[data-ark-page="proximity"] h1').length) === 1, 'which has one h1');
      /* read without a glossed term's tip: /experiments marks terms on first use since 2026-10-21, and "nodes" is one */
      check(await page.evaluate(() => { const c = document.querySelector('[data-ark-page="proximity"]').cloneNode(true); c.querySelectorAll('[data-ark-part="term-tip"]').forEach((t) => t.remove()); return c.textContent.includes('do not represent real nodes, votes, or a ledger'); }), 'and keeps the old entry page\'s boundary');
      await page.close();
    }

    /* footer strip + former orphans */
    for (const width of [1440, 390]) {
      const ctx = width === 1440 ? desk : await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await open(ctx, base, '/deploy');
      const strip = await page.evaluate(() => [...document.querySelectorAll('.site-footer-strip a')].map((a) => ({ href: a.getAttribute('href'), shown: a.getClientRects().length > 0 && getComputedStyle(a).visibility !== 'hidden' })));
      /* one link per journey whose lead page the header bar does not already link (ArkUI.headerPages; 2026-10-22, the
         kit's 16px footer: fewer links, by the owner's choice) */
      const expected = await page.evaluate(() => ArkSitePages.journeys().filter((j) => { const lead = ArkSitePages.pages().find((r) => r.journey === j.id && r.lead && ArkUI.pageCatalog[r.key]); return lead && !(ArkUI.headerPages || []).includes(lead.key); }).length);
      check(expected >= 1 && expected < ArkSitePagesCount() && strip.length === expected, `${width}: the footer strip has one link per journey the header does not link (${strip.length} of ${expected})`);
      check(strip.some((s) => s.href === '/experiments'), `${width}: the footer strip links /experiments`);
      check(await page.evaluate(() => { const s = document.querySelector('.site-footer-strip'); const r = s.getBoundingClientRect(); return r.width > 0 && r.bottom <= innerHeight && getComputedStyle(s).display !== 'none'; }), `${width}: the footer strip is on screen`);
      await page.close();
      if (ctx !== desk) await ctx.close();
    }
    {
      const sources = [['/stats', 'stats', '/stats/gpu'], ['/what-is-a-resolver', 'resolver', '/start-from-something-real'], ['/resolvers', 'resolvers', '/resolver-math'], ['/resolutions/rules', 'resolutions/rules', '/resolver-math'], ['/concept?view=more', 'concept', '/resolver-math']];
      for (const [route, key, target] of sources) {
        const page = await open(desk, base, route);
        check(await page.evaluate(([id, t]) => [...document.querySelectorAll(`[data-ark-page="${CSS.escape(id)}"] a`)].some((a) => a.getAttribute('href') === t), [key, target]), `${route} links ${target} in its page body`);
        await page.close();
      }
      const page = await open(desk, base, '/stats');
      await page.click('.settings-trigger');
      await until(() => page.evaluate(() => [...document.querySelectorAll('.settings-panel button')].some((b) => /full palette/i.test(b.textContent) && b.getClientRects().length)), 'the settings panel opens');
      await page.evaluate(() => [...document.querySelectorAll('.settings-panel button')].find((b) => /full palette/i.test(b.textContent)).click());
      await settled(page, 'palette');
      check(await active(page) === 'palette', 'the theme settings panel opens /palette');
      check(await page.evaluate(() => [...document.querySelectorAll('[data-ark-page="palette"] a')].some((a) => a.getAttribute('href') === '/')), '/palette leads back home');
      await page.close();
    }

    /* a11y */
    {
      /* From the top of the document (Home is the one route whose page the router does not focus
         on arrival; elsewhere focus already starts in the page): the first Tab is the skip link. */
      const page = await open(desk, base, '/');
      await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
      await page.keyboard.press('Tab');
      check(await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('skip')), 'the first Tab reaches the skip link');
      await page.keyboard.press('Enter');
      check(await page.evaluate(() => document.activeElement === ArkUI.pageRouter.pages[ArkUI.pageRouter.active]), 'the skip link moves focus to the page itself');
      check(await page.evaluate(() => document.getElementById('fallback').inert && ![...document.querySelectorAll('#fallback a')].some((a) => a.getAttribute('href').startsWith('docs/'))), 'the clipped fallback is inert and links site pages');
      await page.close();
      const sheet = await open(desk, base, '/concept/depth');
      const fonts = await sheet.evaluate(() => [...document.querySelectorAll('[data-ark-page] button')].map((b) => getComputedStyle(b).fontFamily));
      check(fonts.length > 0 && fonts.every((f) => !/^Arial\b/i.test(f)), `story-sheet buttons use the page font (${[...new Set(fonts)].join(' | ')})`);
      await sheet.close();
      const res = await open(desk, base, '/resolutions');
      await res.keyboard.press('Shift');
      const ring = await res.evaluate(() => { const p = document.querySelector('[data-ark-page="resolutions"] [role="tabpanel"][tabindex="0"]'); if (!p) return 'no panel'; p.focus(); const cs = getComputedStyle(p); return p.matches(':focus-visible') ? cs.outlineStyle + ' ' + cs.outlineWidth : 'not focus-visible'; });
      check(/^solid [1-9]/.test(ring), `the resolutions tabpanel shows a focus ring (${ring})`);
      await res.close();
      const gpu = await open(desk, base, '/stats/gpu');
      check(await gpu.evaluate(() => [...document.querySelectorAll('.stats-bar-row')].every((li) => li.tabIndex < 0)), '/stats/gpu bar rows are not Tab stops');
      await gpu.close();
    }

    /* "↗" only on links that leave the site, and the computed typeface, on every route */
    {
      const probe = await open(desk, base, '/');
      const routes = await probe.evaluate(() => Object.keys(ArkUI.pageCatalog).filter((k) => k !== 'notfound' && k !== 'reference').map((id) => ({ id, path: ArkUI.pageCatalog[id].path })));
      await probe.close();
      const bad = [], fonts = [];
      let next = 0;
      await Promise.all(Array.from({ length: 4 }, async () => {
        while (next < routes.length) {
          const route = routes[next++];
          const page = await desk.newPage();
          try {
            await page.goto(base + route.path, { waitUntil: 'domcontentloaded' });
            await settled(page, route.id);
            for (const b of await page.evaluate(() => [...document.querySelectorAll('#scene a[href]')].filter((a) => {
              const text = (a.textContent || '').trim(), after = getComputedStyle(a, '::after').content;
              if (!/↗$/.test(text) && !/↗/.test(after)) return false;
              const href = a.getAttribute('href');
              const external = a.target === '_blank' || a.dataset.referenceOriginal === 'true' || (/^[a-z]+:\/\//i.test(href) && new URL(href).origin !== location.origin);
              return !external;
            }).map((a) => a.textContent.trim().slice(0, 60) + ' -> ' + a.getAttribute('href')))) bad.push(route.path + ': ' + b);
            /* the computed typeface: the body is the sans slot, and no control falls back to the
               browser default (Times on the body, Arial on ~58 controls before 2026-10-19) */
            for (const f of await page.evaluate(() => {
              const first = (el) => getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '').trim();
              const out = [];
              if (!/^Albert Sans$/i.test(first(document.body))) out.push('body: ' + getComputedStyle(document.body).fontFamily);
              for (const c of document.querySelectorAll('#scene :is(button, input, select, textarea)')) {
                if (!c.getClientRects().length) continue;
                const fam = first(c);
                if (/^(Arial|Times|Times New Roman|serif|sans-serif|Helvetica)$/i.test(fam)) out.push((c.className || c.tagName) + ': ' + fam);
              }
              return out;
            })) fonts.push(route.path + ': ' + f);
          } catch (error) { bad.push(route.path + ': ' + String(error.message).split('\n')[0]); }
          finally { await page.close(); }
        }
      }));
      check(bad.length === 0, `↗ marks only links that leave the site on all ${routes.length} routes` + (bad.length ? ':\n     ' + bad.slice(0, 12).join('\n     ') : ''));
      check(fonts.length === 0, `on all ${routes.length} routes the body is Albert Sans and no visible control is a browser-default face` + (fonts.length ? ':\n     ' + fonts.slice(0, 12).join('\n     ') : ''));
    }
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
  if (failures.length) { console.log(`\n${failures.length} failing checks`); process.exit(1); }
  console.log('\nPASS: doc links, not-found, /about ending, merged model, footer strip and inbound links, a11y chrome, and ↗ hold in a real browser.');
}

/* the journey count the footer strip must match, read from the same table the page reads */
function ArkSitePagesCount() {
  const ctx = {}; new Function('ctx', fs.readFileSync(new URL('../../js/content/site-pages.js', import.meta.url), 'utf8') + ';ctx.t = ArkSitePages;')(ctx);
  return ctx.t.journeys().filter((j) => ctx.t.pages().some((r) => r.journey === j.id && r.lead)).length;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => { console.error(error); process.exit(1); });

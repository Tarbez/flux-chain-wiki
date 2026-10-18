/* =====================================================================
   HEADER REACH -- the editor's ONE header must stay usable over the
   workspace at every viewport width, and fit one row from 1280px up.

   Why this exists, twice over:
   - Step 3 of the Studio merge docked #studioRoot at a hardcoded top: 58px
     so the header's mode switch stayed reachable -- but below 760px the
     header wraps taller than 58px, and on a phone the mode switch was
     painted over: there was no way back out of Design mode. Every logic
     test about the switch's markup and handlers passed while it was
     unclickable.
   - 2026-10-18 (owner: "No more one cms for content and one cms for
     design. Only one merged."): Design mode had TWO headers -- the app bar
     and Studio's own bar with a second page/mode/Save system -- wrapping to
     two rows at 1500px when "Editing tablet overrides" showed. They are one
     header now, every concept once. This guards that it stays one row and
     that every control in it can actually be clicked.
   - 2026-10-18 again (owner: "I only want to see ONE CMS, unified."): the
     Content | Design app switch became a LENS on the one canvas, the page
     picker gained Page fields, and on a phone the rail became a drawer.

   Per width (390, 760, 1280, 1500) it checks, in the Canvas view with
   the tablet-override note AND a long status message showing (the widest
   the header gets):
   - every header control's centre hit-tests to that control
     (elementFromPoint), inside the viewport -- the account menu's controls
     after opening it;
   - at >= 1280px the header is ONE row: every visible control's vertical
     centre lies within the first row's band;
   - #studioRoot starts at the header's bottom edge (no overlap, no gap)
     and reaches the viewport bottom;
   - no horizontal scroll in the app document or #studioRoot;
   - the canvas tools hide in the Sitemap (no canvas there) and stay in the
     Theme view (the canvas stays live beside the settings);
   - Design lens -> Content lens -> Design lens works by real clicks and
     changes nothing but the lens: the same workspace, exactly one site
     iframe (Playwright's own actionability check refuses a click on a
     covered element);
   - the Page fields sheet opens from the header and closes on Esc;
   - with every panel mounted (five rail tabs, Theme view, Page fields) no id
     is used twice; Home / End in the sheet's first field move its caret
     (to the start / end) and leave the sheet where it was;
   - below 860px the rail is a drawer: the rail button opens it with its five
     tabs reachable, and Esc closes it.

   Not part of scripts/run-tests.mjs (that runner only reads tests/*.cjs|mjs
   at the top level) because it needs Chromium. Run it by hand:
     node tests/browser/header-reach.mjs [screenshot-dir]
   HEADER_REACH_WIDTHS=800,1024 probes other widths.
   ===================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { appFrame, copySite, designView, openAccountMenu, setLens, startHost, until, untilStable, scaled, gotoEditor } from './harness.mjs';

const WIDTHS = process.env.HEADER_REACH_WIDTHS
  ? process.env.HEADER_REACH_WIDTHS.split(',').map((w) => [Number(w), 900])
  : [[390, 844], [760, 900], [1280, 800], [1500, 900]];
/* every control the header holds in the Canvas view (the account menu's are checked once it is open) */
const CANVAS_CONTROLS = ['#lensContentBtn', '#lensDesignBtn', '#viewCanvasBtn', '#viewMapBtn', '#backgroundBtn', '#viewThemeBtn',
  '#btnLeftRail', '#btnPage', '#btnPageFields', '#btnPageSeo', '#bpNote', '#devices [data-d="0"]', '#devices [data-d="1"]', '#devices [data-d="2"]', '#btnUndo', '#btnRedo', '#btnCheck',
  '#mode [data-m="edit"]', '#mode [data-m="live"]', '#versionsNav', '#meshNav', '#save', '#publish', '#accountBtn'];
const ACCOUNT_CONTROLS = ['#connect', '#signOut'];
const CANVAS_ONLY = ['#canvasTools'];
const RAIL_TABS = ['#tabPages', '#tabLayers', '#tabLib', '#tabMedia', '#tabVault'];
const ONE_ROW_FROM = 1280;

/* Measured inside the app frame (admin-app.html), in its own coordinates. */
function measure(frame, selectors) {
  return frame.evaluate((sels) => {
    const bar = document.getElementById('appBar');
    const studio = document.getElementById('studioRoot');
    const barRect = bar.getBoundingClientRect();
    const controls = sels.map((sel) => {
      const el = document.querySelector(sel);
      if (!el || el.closest('[hidden]') || !el.getClientRects().length) return { sel, shown: false };
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const hit = document.elementFromPoint(x, y);
      return { sel, shown: true, cy: y, top: r.top, bottom: r.bottom, inView: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth, hitsSelf: !!hit && (hit === el || el.contains(hit)), hit: hit ? (hit.id ? '#' + hit.id : hit.tagName.toLowerCase() + (hit.className && typeof hit.className === 'string' ? '.' + hit.className.split(' ')[0] : '')) : null };
    });
    const studioRect = studio && !studio.hidden ? studio.getBoundingClientRect() : null;
    return {
      viewport: { w: innerWidth, h: innerHeight },
      barHeight: barRect.height, barTop: barRect.top, barBottom: barRect.bottom,
      studio: studioRect ? { top: studioRect.top, bottom: studioRect.bottom } : null,
      barVar: getComputedStyle(document.documentElement).getPropertyValue('--app-bar-h').trim(),
      hScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      studioHScroll: studio && !studio.hidden ? studio.scrollWidth - studio.clientWidth : 0,
      controls,
    };
  }, selectors);
}
const hiddenNow = (frame, sels) => frame.evaluate((s) => s.filter((sel) => { const el = document.querySelector(sel); return el && !el.hidden; }), sels);

async function main() {
  const shotDir = process.argv[2] || null;
  if (shotDir) fs.mkdirSync(shotDir, { recursive: true });
  const root = copySite(fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-header-reach-')));
  const server = await startHost(root);
  const browser = await chromium.launch();
  const failures = [];
  const fail = (width, message) => failures.push(`${width}px: ${message}`);
  try {
    for (const [width, height] of WIDTHS) {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      await gotoEditor(page, server.origin);
      const frame = await appFrame(page);   /* returns once window.ArkAdminApp is set */

      /* Real clicks: Playwright refuses to click an element another one is painted over
         ("... intercepts pointer events"), so a covered control fails here, not silently. */
      const click = async (sel) => { try { await frame.click(sel, { timeout: scaled(5000) }); return true; } catch (error) { fail(width, `real click on ${sel} failed: ${String(error.message).split('\n').find((l) => /intercepts/.test(l)) || error.message.split('\n')[0]}`); return false; } };
      await setLens(frame, 'design');
      await designView(frame, 'canvas');
      await frame.waitForSelector('#studioRoot:not([hidden])', { timeout: scaled(15000) });
      /* the widest the header gets: the tablet-override note on, and a long status message */
      await click('#devices [data-d="1"]');
      await frame.waitForSelector('#bpNote:not([hidden])', { timeout: scaled(5000) }).catch(() => fail(width, 'Tablet did not show the overrides note'));
      await frame.evaluate(() => { const s = document.getElementById('status'); s.textContent = 'Saved 4 items to the connected project: Page "home", Layout, Components, sitemap.xml / robots.txt / llms.txt.'; s.dataset.tone = 'ok'; });
      /* the header's own layout has settled: its box and scroll width read the same twice in a row
         (was a fixed 600 ms) */
      await untilStable(() => frame.evaluate(() => { const r = document.getElementById('appBar').getBoundingClientRect(); return [r.width, r.height, document.documentElement.scrollWidth, getComputedStyle(document.documentElement).getPropertyValue('--app-bar-h')]; }), 'the header kept re-laying itself out', 5000);
      const design = await measure(frame, CANVAS_CONTROLS);
      if (shotDir) await page.screenshot({ path: path.join(shotDir, `header-reach-${width}-design.png`) });

      for (const c of design.controls) {
        if (!c.shown) { fail(width, `${c.sel} is not shown in the Canvas view`); continue; }
        if (!c.inView) fail(width, `${c.sel} is outside the viewport`);
        if (!c.hitsSelf) fail(width, `${c.sel}'s centre hit-tests to ${c.hit}, not the control -- something is painted over the header`);
      }
      const shown = design.controls.filter((c) => c.shown);
      const rows = new Set(shown.map((c) => Math.round(c.cy / 8))).size;
      if (width >= ONE_ROW_FROM) {
        const first = Math.min(...shown.map((c) => c.top)), band = Math.max(...shown.filter((c) => c.top - first < 20).map((c) => c.bottom));
        const below = shown.filter((c) => c.cy > band);
        if (below.length) fail(width, `the header is not one row: ${below.map((c) => c.sel).join(', ')} wrapped below the first row (header ${design.barHeight}px)`);
      }
      if (!design.studio) fail(width, '#studioRoot (the workspace) is not showing');
      else {
        if (design.studio.top < design.barBottom - 0.5) fail(width, `#studioRoot starts at ${design.studio.top}px, above the header's bottom edge (${design.barBottom}px)`);
        if (design.studio.top > design.barBottom + 1) fail(width, `#studioRoot starts at ${design.studio.top}px, leaving a gap below the header (${design.barBottom}px)`);
        if (Math.abs(design.studio.bottom - design.viewport.h) > 1) fail(width, `#studioRoot ends at ${design.studio.bottom}px, not the viewport bottom (${design.viewport.h}px)`);
      }
      if (design.hScroll > 0) fail(width, `the app document scrolls horizontally by ${design.hScroll}px`);
      if (design.studioHScroll > 0) fail(width, `#studioRoot scrolls horizontally by ${design.studioHScroll}px`);

      /* the account menu: open it by a real click, then its controls must be reachable too */
      try { await openAccountMenu(frame); } catch (error) { fail(width, 'the account menu did not open: ' + error.message.split('\n')[0]); }
      const account = await measure(frame, ACCOUNT_CONTROLS);
      for (const c of account.controls) {
        if (!c.shown) { fail(width, `${c.sel} is not shown in the open account menu`); continue; }
        if (!c.inView) fail(width, `${c.sel} (account menu) is outside the viewport`);
        if (!c.hitsSelf) fail(width, `${c.sel} (account menu) hit-tests to ${c.hit} -- the menu is painted under something`);
      }
      if (shotDir) await page.screenshot({ path: path.join(shotDir, `header-reach-${width}-account.png`) });
      await frame.press('#accountBtn', 'Escape');
      if (!(await frame.evaluate(() => document.getElementById('accountMenu').hidden))) fail(width, 'Escape did not close the account menu');

      /* the canvas tools need a canvas: hidden in the Sitemap, kept in the Theme view */
      await designView(frame, 'map');
      const stillMap = await hiddenNow(frame, CANVAS_ONLY);
      if (stillMap.length) fail(width, `Sitemap still shows the canvas tools ${stillMap.join(', ')}`);
      await designView(frame, 'theme');
      if ((await hiddenNow(frame, CANVAS_ONLY)).length !== CANVAS_ONLY.length) fail(width, 'the Theme view hid the canvas tools, but its canvas stays live beside the settings');
      await designView(frame, 'canvas');

      /* the lens changes what a canvas click edits -- and nothing else: same workspace, one site iframe */
      if (await click('#lensContentBtn')) {
        const content = await frame.evaluate(() => ({ workspace: !document.getElementById('studioRoot').hidden, iframes: document.querySelectorAll('iframe').length, pressed: document.getElementById('lensContentBtn').getAttribute('aria-pressed') }));
        if (!content.workspace || content.iframes !== 1 || content.pressed !== 'true') fail(width, `Design -> Content lens by click did not keep the one workspace (${JSON.stringify(content)})`);
        const cm = await measure(frame, ['#lensContentBtn', '#lensDesignBtn', '#btnPage', '#btnPageFields', '#versionsNav', '#meshNav', '#save', '#publish', '#accountBtn']);
        for (const c of cm.controls) if (!c.shown || !c.hitsSelf || !c.inView) fail(width, `Content lens: ${c.sel} is not reachable (${c.shown ? c.hit : 'hidden'})`);
        if (width >= ONE_ROW_FROM && cm.barHeight > 60) fail(width, `the Content lens's header is ${cm.barHeight}px tall, more than one row`);
        if (cm.hScroll > 0) fail(width, `the Content lens scrolls horizontally by ${cm.hScroll}px`);
        if (shotDir) await page.screenshot({ path: path.join(shotDir, `header-reach-${width}-content.png`) });
        /* Page fields: on demand from the header, closed by Esc */
        if (await click('#btnPageFields')) {
          await frame.waitForSelector('#sheet:not([hidden]) #sheetBody', { timeout: scaled(10000) }).catch(() => fail(width, 'Page fields did not open its sheet'));
          const sheet = await measure(frame, ['#sheetClose']);
          if (!sheet.controls[0].shown || !sheet.controls[0].hitsSelf || !sheet.controls[0].inView) fail(width, `the Page fields sheet's close button is not reachable (${sheet.controls[0].hit})`);
          if (sheet.hScroll > 0) fail(width, `the open sheet makes the page scroll horizontally by ${sheet.hScroll}px`);
          if (shotDir) await page.screenshot({ path: path.join(shotDir, `header-reach-${width}-fields.png`) });
          await frame.press('#sheetClose', 'Escape');
          if (!(await frame.evaluate(() => document.getElementById('sheet').hidden))) fail(width, 'Escape did not close the Page fields sheet');
        }
        if (await click('#lensDesignBtn')) {
          const back = await frame.evaluate(() => document.getElementById('lensDesignBtn').getAttribute('aria-pressed'));
          if (back !== 'true') fail(width, 'Content -> Design lens by click did not land back in the Design lens');
        }
      }

      /* every id in the editor is unique once every panel has mounted: the rail's five tabs, the
         Theme view, the Page fields sheet (a form panel drawing a second #newAssetForm next to
         the page's static one once made every lookup by id hit the wrong copy) */
      if (width >= ONE_ROW_FROM) {
        for (const tab of RAIL_TABS) await click(tab);
        await designView(frame, 'theme');
        await click('#btnPageFields');
        await frame.waitForSelector('#sheet:not([hidden]) #sheetBody *', { timeout: scaled(10000) }).catch(() => {});
        const dupes = await frame.evaluate(() => { const seen = new Map(); for (const el of document.querySelectorAll('[id]')) seen.set(el.id, (seen.get(el.id) || 0) + 1); return [...seen].filter(([, n]) => n > 1).map(([id, n]) => `#${id} x${n}`); });
        if (dupes.length) fail(width, 'ids used more than once with every panel mounted: ' + dupes.join(', '));
        /* Home / End in a sheet field move its caret and never the sheet: on macOS they are scroll
           keys, and End left the caret where it was and threw the sheet to its bottom under the
           field being typed in. Checked twice: before and after a draft edit's events (dirty
           dots, the coalesced canvas send and its ready) have run. */
        const top = frame.locator('#sheetBody input[type="text"]').first();
        if (await top.count()) {
          for (const round of [1, 2]) {
            await top.click({ position: { x: 6, y: 8 } }); await top.press('End');
            const caret = await top.evaluate((el) => ({ at: el.selectionStart, len: el.value.length }));
            if (caret.at !== caret.len) fail(width, `round ${round}: End left the sheet field's caret at ${caret.at} of ${caret.len}`);
            await top.press('x'); await top.press('Home');
            if (await top.evaluate((el) => el.selectionStart) !== 0) fail(width, `round ${round}: Home did not move the sheet field's caret to its start`);
            await top.press('End'); await top.press('Backspace');
            await untilStable(() => frame.evaluate(() => document.getElementById('sheetBody').scrollTop), 'the sheet kept scrolling', 3000).catch(() => {});
            const after = await frame.evaluate(() => ({ top: document.getElementById('sheetBody').scrollTop, focus: !!document.activeElement && !!document.activeElement.closest('#sheetBody') }));
            if (after.top !== 0 || !after.focus) fail(width, `round ${round}: typing in the sheet's first field moved the sheet to scrollTop ${after.top} (focus kept: ${after.focus})`);
          }
        }
        await frame.press('#sheetClose', 'Escape');
        await designView(frame, 'canvas');
      }

      /* a phone: the rail is a drawer over the canvas */
      if (width <= 860 && await click('#btnLeftRail')) {
        /* it slides in: measured once its box stopped moving */
        await until(() => frame.evaluate(() => document.getElementById('studioLeft').getBoundingClientRect().left === 0), 'the rail drawer never slid fully in', 5000).catch((error) => fail(width, error.message));
        const drawer = await measure(frame, RAIL_TABS);
        for (const c of drawer.controls) if (!c.shown || !c.hitsSelf || !c.inView) fail(width, `the rail drawer's ${c.sel} is not reachable (${c.shown ? c.hit : 'hidden'})`);
        if (drawer.hScroll > 0) fail(width, `the open drawer makes the page scroll horizontally by ${drawer.hScroll}px`);
        if (shotDir) await page.screenshot({ path: path.join(shotDir, `header-reach-${width}-drawer.png`) });
        await frame.press('#tabPages', 'Escape');
        if (await frame.evaluate(() => document.getElementById('shell').classList.contains('drawer-open'))) fail(width, 'Escape did not close the rail drawer');
      }

      console.log(`${width}px: header ${design.barHeight}px in ${rows > 1 && width >= ONE_ROW_FROM ? 'MORE THAN ONE row' : width >= ONE_ROW_FROM ? 'one row' : 'wrapped rows'} (--app-bar-h ${design.barVar || 'unset'}), studio top ${design.studio && design.studio.top}px, hScroll ${design.hScroll}/${design.studioHScroll}, ${design.controls.filter((c) => c.shown && c.hitsSelf).length}/${CANVAS_CONTROLS.length} canvas controls + ${account.controls.filter((c) => c.shown && c.hitsSelf).length}/${ACCOUNT_CONTROLS.length} account controls clickable`);
      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(root, { recursive: true, force: true });
  }
  if (failures.length) {
    console.log('FAIL header-reach:\n  ' + failures.join('\n  '));
    process.exitCode = 1;
  } else console.log(`PASS header-reach: every header control reachable and clickable over the workspace at ${WIDTHS.map(([w]) => w + 'px').join(', ')}; one row from ${ONE_ROW_FROM}px with every canvas control, the tablet note and a long status showing; the canvas tools hide in the Sitemap; Design/Content lens round trip by real clicks with one site iframe; Page fields opens and closes on Esc; the phone rail drawer opens and closes.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) await main();

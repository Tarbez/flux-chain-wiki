/* =====================================================================
   HEADER REACH -- the persistent app header must stay usable while
   Studio's canvas (Design mode) is showing, at every viewport width.

   Why this exists: Step 3 of the Studio merge docked #studioRoot at a
   hardcoded top: 58px (css/admin.css's .bar height) so the header's
   Content/Design #modeSwitch, Design #designSubSwitch and Mesh button stay
   reachable -- but below 760px the header wraps taller than 58px, so that
   width kept the old full-viewport overlay and on a phone the mode switch
   was painted over: there was no way back out of Design mode. Nothing in
   the logic tests could see it; every assertion about the switch's markup
   and handlers passed while it was unclickable. This drives the real page
   at phone, breakpoint and desktop widths and checks, per width:

   - every header control's centre hit-tests to that control
     (elementFromPoint), not to #studioRoot painted over it;
   - #studioRoot starts at or below the header's bottom edge (no overlap)
     and reaches the viewport bottom (no dead gap);
   - the app document has no horizontal scroll;
   - Design -> Content -> Design works by real clicks (Playwright's own
     actionability check refuses a click on a covered element).

   Not part of scripts/run-tests.mjs (that runner only reads tests/*.cjs|mjs
   at the top level) because it needs Chromium. Run it by hand:
     node tests/browser/header-reach.mjs [screenshot-dir]
   ===================================================================== */
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { appFrame, copySite, startHost } from './harness.mjs';

/* phone, css/admin.css's own 760px breakpoint, desktop. HEADER_REACH_WIDTHS=800,1024 probes others. */
const WIDTHS = process.env.HEADER_REACH_WIDTHS
  ? process.env.HEADER_REACH_WIDTHS.split(',').map((w) => [Number(w), 900])
  : [[390, 844], [760, 900], [1280, 800]];
const HEADER_CONTROLS = ['#modeContentBtn', '#modeDesignBtn', '#designCanvasBtn', '#designThemeBtn', '#meshNav'];

async function freePort() {
  const probe = http.createServer();
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const { port } = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

/* Measured inside the app frame (admin-app.html), in its own coordinates. */
function measure(frame, selectors) {
  return frame.evaluate((sels) => {
    const bar = document.querySelector('body > header.bar');
    const studio = document.getElementById('studioRoot');
    const barRect = bar.getBoundingClientRect();
    const controls = sels.map((sel) => {
      const el = document.querySelector(sel);
      if (!el || el.closest('[hidden]')) return { sel, shown: false };
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const hit = document.elementFromPoint(x, y);
      return { sel, shown: true, inView: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth, hitsSelf: !!hit && (hit === el || el.contains(hit)), hit: hit ? (hit.id ? '#' + hit.id : hit.tagName.toLowerCase() + (hit.className ? '.' + String(hit.className).split(' ')[0] : '')) : null };
    });
    const studioRect = studio && !studio.hidden ? studio.getBoundingClientRect() : null;
    return {
      viewport: { w: innerWidth, h: innerHeight },
      barHeight: barRect.height, barBottom: barRect.bottom,
      studio: studioRect ? { top: studioRect.top, bottom: studioRect.bottom, height: studioRect.height } : null,
      barVar: getComputedStyle(document.documentElement).getPropertyValue('--app-bar-h').trim(),
      hScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      studioHScroll: studio && !studio.hidden ? studio.scrollWidth - studio.clientWidth : 0,
      controls,
    };
  }, selectors);
}

async function main() {
  const shotDir = process.argv[2] || null;
  if (shotDir) fs.mkdirSync(shotDir, { recursive: true });
  const root = copySite(fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-header-reach-')));
  const port = await freePort();
  const server = await startHost(root, port);
  const browser = await chromium.launch();
  const failures = [];
  const fail = (width, message) => failures.push(`${width}px: ${message}`);
  try {
    for (const [width, height] of WIDTHS) {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${port}/admin`);
      const frame = await appFrame(page);

      /* Real clicks: Playwright refuses to click an element another one is painted over
         ("... intercepts pointer events"), so a covered switch fails here, not silently. */
      const click = async (sel) => { try { await frame.click(sel, { timeout: 5000 }); return true; } catch (error) { fail(width, `real click on ${sel} failed: ${String(error.message).split('\n').find((l) => /intercepts/.test(l)) || error.message.split('\n')[0]}`); return false; } };
      /* The editor may already open in Design mode (Studio is the default); only click when it does not. */
      await frame.waitForFunction(() => ['modeContentBtn', 'modeDesignBtn'].some((id) => document.getElementById(id).getAttribute('aria-selected') === 'true'), null, { timeout: 15000 });
      const startsInDesign = await frame.evaluate(() => document.getElementById('modeDesignBtn').getAttribute('aria-selected') === 'true');
      if (!startsInDesign) await click('#modeDesignBtn');
      await frame.waitForSelector('#studioRoot:not([hidden])', { timeout: 15000 });
      await page.waitForTimeout(600); // let the header's own layout settle after the mode change
      const design = await measure(frame, HEADER_CONTROLS);
      if (shotDir) await page.screenshot({ path: path.join(shotDir, `header-reach-${width}-design.png`) });

      for (const c of design.controls) {
        if (!c.shown) { fail(width, `${c.sel} is not shown in Design mode`); continue; }
        if (!c.inView) fail(width, `${c.sel} is outside the viewport`);
        if (!c.hitsSelf) fail(width, `${c.sel}'s centre hit-tests to ${c.hit}, not the control -- something is painted over the header`);
      }
      if (!design.studio) fail(width, '#studioRoot is not showing in Design mode');
      else {
        if (design.studio.top < design.barBottom - 0.5) fail(width, `#studioRoot starts at ${design.studio.top}px, above the header's bottom edge (${design.barBottom}px)`);
        if (design.studio.top > design.barBottom + 1) fail(width, `#studioRoot starts at ${design.studio.top}px, leaving a gap below the header (${design.barBottom}px)`);
        if (Math.abs(design.studio.bottom - design.viewport.h) > 1) fail(width, `#studioRoot ends at ${design.studio.bottom}px, not the viewport bottom (${design.viewport.h}px)`);
      }
      if (design.hScroll > 0) fail(width, `the app document scrolls horizontally by ${design.hScroll}px`);
      if (design.studioHScroll > 0) fail(width, `#studioRoot scrolls horizontally by ${design.studioHScroll}px`);

      if (await click('#modeContentBtn')) {
        await frame.waitForSelector('#studioRoot', { state: 'hidden', timeout: 15000 });
        const content = await frame.evaluate(() => ({ shell: !document.getElementById('cmsShell').hidden, selected: document.getElementById('modeContentBtn').getAttribute('aria-selected') }));
        if (!content.shell || content.selected !== 'true') fail(width, `Design -> Content by click did not land in Content mode (${JSON.stringify(content)})`);
        if (shotDir) await page.screenshot({ path: path.join(shotDir, `header-reach-${width}-content.png`) });
        if (await click('#modeDesignBtn')) {
          await frame.waitForSelector('#studioRoot:not([hidden])', { timeout: 15000 });
          const back = await frame.evaluate(() => document.getElementById('modeDesignBtn').getAttribute('aria-selected'));
          if (back !== 'true') fail(width, 'Content -> Design by click did not land back in Design mode');
        }
      }

      console.log(`${width}px: header ${design.barHeight}px (--app-bar-h ${design.barVar || 'unset'}), studio top ${design.studio && design.studio.top}px, hScroll ${design.hScroll}/${design.studioHScroll}, controls ${design.controls.map((c) => c.sel + (c.hitsSelf ? ' ok' : ' COVERED by ' + c.hit)).join(', ')}`);
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
  } else console.log(`PASS header-reach: header controls reachable and clickable over Studio at ${WIDTHS.map(([w]) => w + 'px').join(', ')}; Design/Content round trip by real clicks.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) await main();

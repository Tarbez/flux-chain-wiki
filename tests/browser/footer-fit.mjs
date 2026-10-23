/* =====================================================================
   FOOTER FIT -- the bottom strip's parts never draw over each other.

   Why this exists: from 1280px the credit line ("Powered, deployed and made by FLX") joined the
   strip and was drawn over the last section links up to 1599px (measured 2026-10-22 on /about:
   two boxes overlapped at 1280, one at 1366 and 1440), so "Run DEFXN from source" read "RUN DE".
   css/navigation.css now shows the credit from 1600px.

   What this drives, in a real Chromium against a scratch copy of the site: /about at 1100, 1280,
   1366, 1440, 1600 and 1920 wide; every visible part of .site-footer-strip (each section link,
   the credit, the rights line, Back) must not overlap any other, and the links must not need to
   scroll sideways.

   Run by hand (needs Chromium; not part of scripts/run-tests.mjs), ONE test at a time:
     node tests/browser/footer-fit.mjs
   ===================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { copySite, startHost, routeSettled } from './harness.mjs';

const WIDTHS = [1100, 1280, 1366, 1440, 1600, 1920];
const root = copySite(fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-footer-fit-')));
const server = await startHost(root);
const browser = await chromium.launch();
const failures = [];
try {
  for (const width of WIDTHS) {
    const page = await (await browser.newContext({ viewport: { width, height: 800 } })).newPage();
    await page.goto(server.origin + '/about');
    await routeSettled(page, 'about', 30000);
    const seen = await page.evaluate(() => {
      const strip = document.querySelector('.site-footer-strip');
      if (!strip) return { missing: true };
      const nav = strip.querySelector('nav');
      const parts = [...strip.querySelectorAll('nav a, .site-credit, .site-copyright, .hero-motion-toggle')].filter((el) => el.offsetParent)
        .map((el) => { const r = el.getBoundingClientRect(); return { name: el.textContent.trim().slice(0, 24) || el.className, left: r.left, right: r.right, top: r.top, bottom: r.bottom }; });
      const overlaps = [];
      for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
        const a = parts[i], b = parts[j];
        if (a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5) overlaps.push(a.name + ' / ' + b.name);
      }
      return { overlaps, scroll: nav ? nav.scrollWidth - nav.clientWidth : 0 };
    });
    if (seen.missing) failures.push(width + ': no footer strip');
    else {
      if (seen.overlaps.length) failures.push(width + ': ' + seen.overlaps.join('; ') + ' overlap');
      if (seen.scroll > 0) failures.push(width + ': the section links need ' + seen.scroll + 'px of sideways scroll');
      console.log((seen.overlaps.length || seen.scroll > 0 ? 'FAIL ' : 'ok   ') + width + 'px');
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
if (failures.length) { console.log('\n' + failures.join('\n')); process.exit(1); }
console.log('\nPASS: the footer strip\'s links, credit, rights line and Back never overlap, from 1100 to 1920px.');

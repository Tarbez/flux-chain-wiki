/* =====================================================================
   DESIGN CHECK: the same page gives the same reading
   ---------------------------------------------------------------------
   Why this exists: on an unchanged home page the Design check scored
   9/13, 6/13, 7/13 and 8/13 on successive runs, and said "2 H1s compete
   for attention" (the second was #fallback, the no-JS copy main.js keeps
   aria-hidden and clipped to 1px) and "H1 72 px, H2 90 px". A score that
   moves on its own is not a measurement. The check now measures only the
   active route's visible content (checkMeasurable; unit test:
   tests/design-check-measurable.cjs), and only once the preview has
   reported the route ready, its fonts have loaded, the router's
   transition is over and every finite animation has ended.

   This runs the real check (ArkAdminApp.designCheck(), the same
   measureChecks() the Design check button runs) N times on one page in
   a real Chromium -- straight after the preview loads (mid-entrance),
   after scrolling the preview, and after the preview re-renders from a
   new state message -- and requires every reading to be identical,
   settled, and to count the home page's one H1.

   Run:   node tests/browser/design-check-stable.mjs [--runs 6] [--headed]
   Needs: Chromium from `npx playwright install chromium`. Uses its own port
   (PORT, default 3489) and a scratch copy of the site; it never touches the
   server on 3437. Not part of scripts/run-tests.mjs (that runner only reads
   tests/*.cjs|mjs at the top level) because it needs Chromium.
   ===================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { copySite, startHost, fakeFolder, appFrame, previewFrame } from './harness.mjs';

const args = process.argv.slice(2);
const RUNS = args.includes('--runs') ? Number(args[args.indexOf('--runs') + 1]) : 6;
const PORT = Number(process.env.PORT) || 3489;
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-design-check-'));
copySite(WORK);
const server = await startHost(WORK, PORT);
const browser = await chromium.launch({ headless: !args.includes('--headed') });
let failed = false;
try {
  const context = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  await fakeFolder(context, WORK);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${PORT}/admin`);
  const app = await appFrame(page);
  await app.waitForFunction(() => !!window.ArkAdminApp && typeof window.ArkAdminApp.designCheck === 'function');
  await app.click('#modeDesignBtn');
  const pv = await previewFrame(app);

  const reading = () => app.evaluate(() => window.ArkAdminApp.designCheck());
  const readings = [];
  /* the first one starts while the home page is still making its entrance */
  readings.push({ when: 'straight after the preview loaded', ...(await reading()) });
  for (let i = 1; i < RUNS; i++) {
    if (i === 2) await pv.evaluate(() => window.scrollTo(0, 900));
    if (i === 3) await pv.evaluate(() => { window.scrollTo(0, 0); });
    /* away to another route and straight back through the Pages tab: the preview reloads home and
       makes its entrance again, and the reading is asked for at once, before it is ready */
    if (i === 4) {
      await app.click('#tabPages');
      const row = (route) => app.locator('#pages li').filter({ has: app.locator('.sub', { hasText: new RegExp('^' + route.replace(/[/]/g, '\\/') + '$') }) }).first();
      await row('/download').click();
      await pv.waitForFunction(() => window.ArkUI && ArkUI.route.path() === '/download', null, { timeout: 15000 }).catch(() => {});
      await row('/').click();
    }
    readings.push({ when: ['', 'again, nothing changed', 'with the preview scrolled 900px', 'scrolled back', 'asked at once after reopening home from another route', 'once more'][i] || 'again', ...(await reading()) });
  }
  const key = (r) => JSON.stringify(r.checks.map((c) => [c.title, c.status, c.detail]));
  const first = key(readings[0]);
  for (const r of readings) {
    const score = `${r.checks.filter((c) => c.status === 'pass').length}/${r.checks.filter((c) => ['pass', 'warn', 'fail'].includes(c.status)).length}`;
    console.log(`     ${score.padEnd(6)} settled=${r.settled}  ${r.when}`);
    if (!r.settled) { failed = true; console.log('FAIL the page never settled: ' + r.when); }
    if (key(r) !== first) {
      failed = true;
      const a = readings[0].checks, b = r.checks;
      console.log('FAIL the reading changed ' + r.when + ':\n  ' + a.map((c, i) => (c.status !== b[i].status || c.detail !== b[i].detail) ? `${c.title}: "${c.detail}" -> "${b[i].detail}"` : '').filter(Boolean).join('\n  '));
    }
  }
  const h1 = readings[0].checks.find((c) => c.title === 'One H1 says what the page is about');
  if (!h1 || h1.status !== 'pass') { failed = true; console.log('FAIL the home page has one visible H1, but the check says: ' + (h1 && h1.detail)); }
  if (errors.length) { failed = true; console.log('FAIL page errors: ' + errors.join(' | ')); }
  console.log(failed ? 'FAIL design-check-stable' : `PASS: ${RUNS} Design check runs on one unchanged page gave one identical, settled reading.`);
} finally {
  await browser.close();
  server.close();
  fs.rmSync(WORK, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);

/* =====================================================================
   CANVAS TABS -- in the editor, a press on a page's closed tab opens it.

   Why this exists: the canvas's selection listener (js/main.js, capture
   phase) stopped every click, so a press on a tab selected the tab and the
   view never changed. A page's other views were reachable only through
   Layers or Preview: the home scene's second view since "Where do I start?"
   became its first tab, and the /about tabs that seo-alt-checks and
   full-audit had to work around (docs/ux-audit/plan.md, Resume point 7).

   What this drives, in a real Chromium against a scratch copy of the site,
   in BOTH lenses (design and content), on the home and /about:
   1. a real mouse press on a closed tab in the canvas opens it: the tab is
      aria-selected, the tab it replaced is not, and its panel is shown;
   2. the editor selected it: the contextual toolbar is up;
   3. a second press on the now-open tab changes nothing about which view
      shows (it is an ordinary selection).

   Run by hand (needs Chromium; not part of scripts/run-tests.mjs), ONE test at a time:
     node tests/browser/canvas-tabs.mjs
   ===================================================================== */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { copySite, startHost, fakeFolder, gotoEditor, appFrame, previewFrame, setLens, openRoute, toolbarKey, until, scaled } from './harness.mjs';

const root = copySite(fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-canvas-tabs-')));
const server = await startHost(root);
const browser = await chromium.launch();
let failed = 0;
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await fakeFolder(context, root);   /* the editor's folder (and the ready signals the drivers wait on) */
  const page = await context.newPage();
  page.on('dialog', (d) => d.dismiss());
  await gotoEditor(page, server.origin);
  const app = await appFrame(page);
  for (const lens of ['design', 'content']) {
    await setLens(app, lens);
    for (const route of ['/', '/about']) {
      const step = `${lens} ${route}`;
      try {
        const pv = await previewFrame(app);
        await openRoute(app, pv, route);
        const frame = await previewFrame(app);
        /* the first closed tab of the page's first tab strip, and the open one beside it */
        const pick = await frame.evaluate(() => {
          const list = document.querySelector('[data-ark-page]:not([hidden]) [role="tablist"]');
          if (!list) return null;
          const tabs = [...list.querySelectorAll('[role="tab"]')];
          const open = tabs.find((t) => t.getAttribute('aria-selected') === 'true');
          const closed = tabs.find((t) => t.getAttribute('aria-selected') === 'false' && t.getBoundingClientRect().width > 0);
          if (!open || !closed) return null;
          tabs.forEach((t, i) => t.setAttribute('data-canvas-tabs-probe', String(i)));
          return { open: tabs.indexOf(open), closed: tabs.indexOf(closed), text: closed.textContent.trim() };
        });
        assert(pick, `${step}: the page has a tab strip with a closed tab`);
        const tab = (i) => frame.locator(`[data-canvas-tabs-probe="${i}"]`);
        await tab(pick.closed).click();
        await until(async () => (await tab(pick.closed).getAttribute('aria-selected')) === 'true', `${step}: pressing "${pick.text}" opened it`, scaled(8000));
        assert.equal(await tab(pick.open).getAttribute('aria-selected'), 'false', `${step}: the tab it replaced is closed`);
        const panelShown = await tab(pick.closed).evaluate((t) => { const p = document.getElementById(t.getAttribute('aria-controls')); return !!p && !p.hidden && p.getBoundingClientRect().height > 0; });
        assert(panelShown, `${step}: "${pick.text}"'s panel is shown`);
        await until(async () => !!(await toolbarKey(app)), `${step}: the editor selected the tab (the toolbar is up)`, scaled(8000));
        await tab(pick.closed).click();
        await frame.waitForTimeout(300);
        assert.equal(await tab(pick.closed).getAttribute('aria-selected'), 'true', `${step}: a press on the open tab keeps it open`);
        assert.equal(await tab(pick.open).getAttribute('aria-selected'), 'false', `${step}: a press on the open tab does not switch back`);
        if (lens === 'content') await page.keyboard.press('Escape');
        console.log(`ok   ${step}: "${pick.text}" opens on a press and is selected`);
      } catch (error) { failed++; console.log(`FAIL ${step}: ${String(error.message).split('\n')[0]}`); }
    }
  }
} finally {
  await browser.close();
  server.close();
}
if (failed) { console.log(`\n${failed} failing step(s)`); process.exit(1); }
console.log('\nPASS: a press on a closed tab in the canvas opens it and selects it, in both lenses.');

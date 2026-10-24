/* =====================================================================
   MORE > SKIN LAB -- a sample card's skin on the real canvas, and a switch that takes one rule back off a part.

   Why this exists: the Skin lab (js/admin/skin-lab.js) edits a DRAFT skin policy (js/content/skin-policy.js) and the
   canvas must apply the sample again with it, at once and without a remount, from a message of its own
   (defxn-cms-preview-skin). A panel that draws rows but never reaches the canvas, or one that re-sends the whole
   site under a switch, cannot be seen by a unit test. This drives the real editor in Chromium:
   1. More > Skin lab docks the panel; picking sample card 263 makes the canvas wear the skin (DefxnSkinSite.active())
      and the panel list the parts that took rules, each with one switch per rule;
   2. the panel's part rows are the preview's own report (DefxnSkinSite.report()), not a list of its own;
   3. turning the frame off for a part that has one makes the canvas apply again WITHOUT that frame
      (the report no longer holds frame for that part), and the preview was not remounted;
   4. pressing a part row outlines its first element on the canvas with one class, and no inline style;
   5. Save writes js/content/skin-policy-data.js as FLX records (ArkSkinPolicy.define("...")), never JSON;
   6. the panel fits 1280x720 and 1440x900 with no page scroll.
   SKIN_SHOTS=<folder> saves screenshots of step 6 there.

   Run by hand (needs Chromium; not part of scripts/run-tests.mjs):
     node tests/browser/skin-lab.mjs
   ===================================================================== */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { copySite, startHost, fakeFolder, clickHeader, gotoEditor, appFrame, previewFrame, designView, routeReadyCount, saveAndWait, until, scaled } from './harness.mjs';

const root = copySite(fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-skin-lab-')));
const server = await startHost(root);
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
let failed = 0;
async function step(name, run) {
  try { await run(); console.log(`ok   ${name}`); } catch (error) { failed++; console.log(`FAIL ${name}: ${String(error.message).split('\n')[0]}`); }
}
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await fakeFolder(context, root);
  const page = await context.newPage();
  page.on('dialog', (d) => d.dismiss());
  await gotoEditor(page, server.origin);
  const app = await appFrame(page);
  await designView(app, 'skin');
  const pv = await previewFrame(app);
  const report = () => pv.evaluate(() => (window.DefxnSkinSite && DefxnSkinSite.report()) || null);
  const partRule = async (key, rule) => { const r = await report(); const p = r && r.parts.find((x) => x.key === key); return p ? p.rules.applied[rule] : undefined; };

  await step('picking sample card 263 puts the skin on the canvas and rows in the panel', async () => {
    await app.selectOption('#skin-pick', '263');
    await until(() => pv.evaluate(() => !!(window.DefxnSkinSite && DefxnSkinSite.active())), 'the canvas never wore the sample', scaled(30000));
    await app.locator('#skinPanel .skin-part').first().waitFor({ state: 'attached', timeout: scaled(15000) });
    assert((await app.locator('#skinPanel .skin-part').count()) > 0, 'rows');
    assert((await app.locator('#skinPanel .skin-rule input[role="switch"]').count()) > 0, 'a switch per rule');
  });
  await step('the rows are the preview\'s own report', async () => {
    const rep = await report();
    const withRules = rep.parts.filter((p) => Object.keys(p.rules.applied).length || p.rules.skipped.length || p.rules.reverted.length).map((p) => p.key);
    const drawn = await app.evaluate(() => [...document.querySelectorAll('#skinPanel .skin-part')].map((el) => el.dataset.part));
    for (const key of drawn) assert(rep.parts.some((p) => p.key === key), `${key} is a part in the report`);
    for (const key of withRules.filter((k) => /^[A-Z]/.test(k))) assert(drawn.includes(key), `${key} has rules in the report and a row`);
  });

  /* a part that has a frame applied: any policy key row whose frame is applied */
  let target = '';
  await step('a part that wears a frame has a switch for it', async () => {
    const rep = await report();
    target = (rep.parts.find((p) => /^[A-Z]/.test(p.key) && p.rules.applied.frame && p.rules.applied.frame !== 'none') || {}).key || '';
    assert(target, 'some upper-case part wears a frame on this page');
    assert.equal(await app.locator(`#skinPanel input[data-part="${target}"][data-rule="frame"]`).isChecked(), true);
  });
  const readyBefore = await routeReadyCount(pv);
  await step(`turning ${'the frame'} off re-applies the sample without it`, async () => {
    await app.locator(`#skinPanel input[data-part="${target}"][data-rule="frame"]`).click();
    await until(async () => (await partRule(target, 'frame')) === undefined, `${target} still wears a frame`, scaled(15000));
    assert.equal(await app.locator(`#skinPanel input[data-part="${target}"][data-rule="frame"]`).isChecked(), false, 'the switch shows it off');
    assert.equal(await app.evaluate(() => ArkAdminApp.unsaved()), true, 'the draft is unsaved');
    assert.equal(await app.locator('#viewSkinBtn .dot').count(), 1, 'the Skin lab item carries the unsaved dot');
  });
  await step('and the preview did not remount for it', async () => {
    await pv.waitForTimeout(400);
    assert.equal(await routeReadyCount(pv), readyBefore);
  });
  await step('pressing a part row outlines its first element with one class and no inline style', async () => {
    await app.locator(`#skinPanel .skin-part[data-part="${target}"] .skin-part-head`).click();
    const hit = await until(() => pv.evaluate(() => { const el = document.querySelector('.defxn-skin-focus'); return el ? { count: document.querySelectorAll('.defxn-skin-focus').length, style: el.getAttribute('style') } : null; }), 'nothing was outlined', scaled(8000));
    assert.equal(hit.count, 1);
    assert(!hit.style || !/outline/.test(hit.style), 'no inline outline');
  });
  await step('Save writes the policy as FLX records, not JSON', async () => {
    await clickHeader(app, 'connect');
    await until(() => app.evaluate(() => document.getElementById('connect').disabled), 'the project folder did not connect', scaled(10000));
    await saveAndWait(app);
    const text = fs.readFileSync(path.join(root, 'js/content/skin-policy-data.js'), 'utf8');
    assert(/^ArkSkinPolicy\.define\("/m.test(text), 'one define() call');
    const records = JSON.parse(/ArkSkinPolicy\.define\(("[^"]*")\)/.exec(text)[1]);
    assert(!/^\s*[{[]/.test(records), 'the stored text is not a JSON object');
    assert(records.split('\n').length > 4, 'it holds records for the part');
    assert.equal(await app.evaluate(() => ArkAdminApp.unsaved()), false, 'nothing is left unsaved');
  });
  for (const [w, hgt] of [[1280, 720], [1440, 900]]) {
    await step(`the panel fits ${w}x${hgt} with no page scroll`, async () => {
      await page.setViewportSize({ width: w, height: hgt });
      await app.locator('#skinPanel .skin-part').first().waitFor({ state: 'attached', timeout: scaled(10000) });
      await pv.waitForTimeout(500);
      const fit = await app.evaluate(() => { const d = document.getElementById('skinView'); return { dock: d.scrollHeight - d.clientHeight, page: document.documentElement.scrollHeight - document.documentElement.clientHeight }; });
      if (process.env.SKIN_SHOTS) await page.screenshot({ path: path.join(process.env.SKIN_SHOTS, `skin-lab-${w}x${hgt}.png`) });
      assert(fit.dock <= 1 && fit.page <= 1, `the dock overflows by ${fit.dock}px, the page by ${fit.page}px`);
    });
  }
} finally {
  await browser.close();
  server.close();
}
if (failed) { console.log(`\n${failed} failing step(s)`); process.exit(1); }
console.log('\nPASS: the Skin lab reaches the canvas in place, switches take a rule off a part, and Save writes FLX.');

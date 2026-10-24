/* =====================================================================
   DESIGN > WORLD -- a slider in the panel reaches the canvas as the 3D world's value.

   Why this exists: the World draft (js/content/world.js) is edited in a docked panel and shown on
   the canvas by its own message, defxn-cms-preview-world, with no remount. A panel that changes
   the draft but never reaches the canvas, or one that re-sends the whole site (a remount) under
   the slider, cannot be seen by a unit test. This drives the real editor in Chromium:
   1. More > 3D world docks the panel beside the canvas; it has one control per ArkWorld.knobs()
      row, read from the preview frame's own module;
   2. moving the Exposure slider changes ArkWorld.get().look.exposure INSIDE the preview iframe;
   3. the preview was not remounted by it (its route-ready count did not change);
   4. the header says there is an unsaved change, and Save writes js/content/world-data.js as FLX
      records (ArkWorld.define("...")), never a JSON object;
   5. the route picker opens that page on the canvas.

   Run by hand (needs Chromium; not part of scripts/run-tests.mjs):
     node tests/browser/world-panel.mjs
   ===================================================================== */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { copySite, startHost, fakeFolder, clickHeader, gotoEditor, appFrame, previewFrame, designView, routeReadyCount, saveAndWait, until, scaled } from './harness.mjs';

const root = copySite(fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-world-panel-')));
/* The canvas needs the world's module to apply a value (index.html loads it with the world itself).
   Until the page does, this scratch copy -- never the working tree -- is given the three scripts, so
   this check exercises the editor's half either way. */
{
  const file = path.join(root, 'index.html'), html = fs.readFileSync(file, 'utf8');
  if (!html.includes('js/content/world.js')) {
    fs.writeFileSync(file, html.replace('</head>', '<script src="js/vendor/flx-state-grammar.js"></script><script src="js/content/world.js"></script><script src="js/content/world-data.js"></script></head>'));
    console.log('[world-panel] index.html does not load js/content/world.js yet: the scratch copy loads it');
  }
}
const server = await startHost(root);
const browser = await chromium.launch();
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
  await designView(app, 'world');
  const pv = await previewFrame(app);
  const world = () => pv.evaluate(() => (window.ArkWorld ? window.ArkWorld.get() : null));

  await step('the panel has one control per knob of the preview\'s own ArkWorld', async () => {
    const knobs = await pv.evaluate(() => ArkWorld.knobs().map((k) => k.group + '.' + k.key));
    await app.locator('#worldPanel [data-knob]').first().waitFor({ state: 'attached', timeout: scaled(10000) });
    const drawn = await app.evaluate(() => [...document.querySelectorAll('#worldPanel [data-knob]')].map((el) => el.dataset.knob));
    assert.deepEqual(drawn, knobs);
  });

  const exposure = app.locator('#worldPanel [data-knob="look.exposure"] input[type="range"]');
  const readyBefore = await routeReadyCount(pv);
  let start;
  await step('moving the Exposure slider changes ArkWorld.get() in the preview iframe', async () => {
    start = (await world()).look.exposure;
    const target = start > 1.5 ? 1.2 : 1.9;
    await exposure.evaluate((el, v) => { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); }, target);
    await until(async () => (await world()).look.exposure === target, `the preview's exposure became ${target} (was ${start})`, scaled(8000));
  });
  await step('and the preview did not remount for it', async () => {
    await pv.waitForTimeout(400);
    assert.equal(await routeReadyCount(pv), readyBefore);
  });
  await step('the draft is unsaved; Save writes FLX records, not JSON', async () => {
    assert.equal(await app.locator('#save').isDisabled(), false, 'Save is on');
    assert.equal(await app.locator('#viewWorldBtn .dot').count(), 1, 'the World item carries the unsaved dot');
    await clickHeader(app, 'connect');
    await until(() => app.evaluate(() => document.getElementById('connect').disabled), 'the project folder did not connect', scaled(10000));
    await saveAndWait(app);
    const text = fs.readFileSync(path.join(root, 'js/content/world-data.js'), 'utf8');
    assert(/^ArkWorld\.define\("/m.test(text), 'one define() call');
    const records = JSON.parse(/ArkWorld\.define\(("[^"]*")\)/.exec(text)[1]);
    assert(!/^\s*[{[]/.test(records), 'the stored text is not a JSON object');
  });
  await step('the route picker opens that page on the canvas', async () => {
    await app.evaluate(() => { document.querySelector('#worldPanel [role="tab"]:last-of-type').click(); });
    const options = await app.evaluate(() => [...document.querySelectorAll('#world-route option')].map((o) => o.value));
    const other = options.find((v) => v !== '/' && v.length > 1);
    assert(other, 'the picker lists pages');
    await app.selectOption('#world-route', other);
    await until(async () => { const f = await previewFrame(app); return (await f.evaluate(() => location.hash || location.pathname)).includes(other.replace(/^\//, '')); }, `the canvas shows ${other}`, scaled(15000));
  });
} finally {
  await browser.close();
  server.close();
}
if (failed) { console.log(`\n${failed} failing step(s)`); process.exit(1); }
console.log('\nPASS: Design > World reaches the canvas in place and Save writes FLX.');

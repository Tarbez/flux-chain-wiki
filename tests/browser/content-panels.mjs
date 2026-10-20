/* =====================================================================
   REAL-BROWSER CHECK: every content form as a panel, mounted in a test container
   ---------------------------------------------------------------------
   Why this exists: the content forms (page fields, article fields, Media, Vault, page shapes,
   Theme & defaults) used to draw into the old Content layout's fixed centre column (#editor);
   the one-workspace merge (2026-10-18) made each a panel the shell mounts wherever it wants
   (the Page fields sheet, the rail's Media/Vault tabs, the Theme view). This driver mounts each
   one in a container of its own inside the real editor -- not where the shell puts it, so it
   holds the forms' contract whatever the shell looks like -- edits it through its own
   controls, presses the one Save, and reads what was written to disk. Also: typing in a page
   field, keystroke by keystroke, while the canvas updates live, never loses a character or the
   caret (the canvas remounts on each draft; the form must not be rebuilt under the cursor).
   The shell's own mounting is covered by full-audit.mjs and header-reach.mjs.

   Run:   node tests/browser/content-panels.mjs [--headed] [--keep]
   Needs: Chromium from `npx playwright install chromium`.
   ===================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { copySite, startHost, fakeFolder, gotoEditor, appFrame, clickHeader, previewFrame, until as untilFor, scaled, answerArkDialog } from './harness.mjs';

const args = process.argv.slice(2);
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-panels-'));
let failures = 0;
class StepFailure extends Error {}
function check(condition, message) { if (!condition) throw new StepFailure(message); }
async function step(name, run) {
  try { await run(); console.log(`ok   ${name}`); }
  catch (error) { failures += 1; console.log(`FAIL ${name}\n     ${error instanceof StepFailure ? error.message : error.stack}`); }
}
const until = (probe, message, timeout = 20000) => untilFor(probe, message, timeout, { fail: (m) => new StepFailure(m) });
const saved = (rel) => { const f = path.join(WORK, 'js/content', rel); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : ''; };
const exists = (rel) => fs.existsSync(path.join(WORK, 'js/content', rel));
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

copySite(WORK);
const server = await startHost(WORK);
const browser = await chromium.launch({ headless: !args.includes('--headed') });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await fakeFolder(context, WORK);
const page = await context.newPage();
/* the editor asks with Ark's dialog now (cms.md P2-11): a NATIVE dialog is a regression, and is counted */
const nativeDialogs = [];
page.on('dialog', (d) => { nativeDialogs.push(d.message()); d.accept(); });
page.on('pageerror', (e) => console.log('     [pageerror] ' + e.message));
await gotoEditor(page, server.origin);
const app = await appFrame(page);

/* one test container, on top of everything, ~480px wide (the sheet's width); mount(name, ...args)
   draws ArkAdmin[name] into it */
async function mount(name, ...rest) {
  await app.evaluate(([n, r]) => {
    let box = document.getElementById('panelTest');
    if (!box) {
      box = document.createElement('div'); box.id = 'panelTest';
      box.style.cssText = 'position:fixed;left:0;top:0;width:480px;height:100vh;overflow:auto;z-index:99999;background:hsl(var(--canvas));padding:12px;box-sizing:border-box';
      document.body.appendChild(box);
    }
    window.ArkAdmin[n].apply(null, [box].concat(r));
  }, [name, rest]);
  return app.locator('#panelTest');
}
const panel = () => app.locator('#panelTest');
async function save(probe, message) {
  await app.click('#save');
  try { await until(probe, message, 30000); }
  catch (error) { throw new StepFailure(message + ' -- status: "' + await app.evaluate(() => document.getElementById('status').textContent) + '"'); }
}

await step('connect the project folder', async () => {
  if (!(await app.evaluate(() => document.getElementById('connect').disabled))) {
    await clickHeader(app, 'connect');
    await until(() => app.evaluate(() => document.getElementById('connect').disabled), 'the project folder did not connect');
  }
});

await step('page fields: typing keeps every character and the caret while the canvas updates live', async () => {
  await mount('renderPageFields', 'home');
  const field = panel().locator('#f-home-EYEBROW');
  await field.click(); await field.press('ControlOrMeta+a'); await field.press('Backspace');
  const typed = 'Panel marker typed live';
  await field.pressSequentially(typed, { delay: 40 });
  check((await field.inputValue()) === typed, 'the field lost characters while typing: "' + await field.inputValue() + '"');
  check(await app.evaluate(() => document.activeElement && document.activeElement.id === 'f-home-EYEBROW'), 'the field lost focus while typing');
  check(await app.evaluate(() => window.ArkAdmin.state.drafts.home.fields.EYEBROW.value) === typed, 'the draft does not hold what was typed');
  const frame = await previewFrame(app, scaled(20000)).catch(() => null);
  if (frame && await app.evaluate(() => window.ArkAdmin.state.cmsCurrentRoute === '/')) {
    // textContent, not innerText: the eyebrow is an Ark eyebrow (text-transform: uppercase), and Chromium's
    // innerText returns the transformed text, so a case-sensitive match never saw the typed words.
    await until(async () => (await frame.evaluate(() => document.body.textContent)).includes(typed), 'the canvas never showed the typed text', 20000);
  } else console.log('     (canvas not on / -- live canvas text not checked here)');
});

await step('page fields: Save writes the manifest', async () => {
  await save(() => saved('manifests/home.js').includes('Panel marker typed live'), 'Save did not write the edited field to js/content/manifests/home.js');
});

await step('article fields: edit, Save', async () => {
  const slug = await app.evaluate(() => window.ArkAdmin.state.slugs[0]);
  await mount('renderArticleFields', slug);
  await panel().locator(`#a-${slug}-title`).fill('Panel article marker');
  await save(() => saved('article-index.js').includes('Panel article marker'), 'Save did not write the article title');
});

await step('media: label, replace, Save; create and delete', async () => {
  await mount('renderMediaPanel');
  const id = await app.evaluate(() => window.ArkAdmin.state.assetIds[0]);
  await panel().locator(`[data-cms-item="asset:${id}"]`).click();
  await panel().locator(`#as-${id}-label`).fill('Panel image label');
  await panel().locator(`#as-${id}-file`).setInputFiles({ name: 'dot.png', mimeType: 'image/png', buffer: PNG_1PX });
  await until(() => app.evaluate(() => (document.querySelector('#panelTest .media-detail img.asset-preview') || {}).src.startsWith('data:image/png;base64,iVBOR')), 'the replacement image did not show');
  await save(() => saved(`assets/${id}.js`).includes('Panel image label') && saved(`assets/${id}.js`).includes('image/png'), `Save did not write assets/${id}.js`);
  await panel().locator('summary', { hasText: 'New image' }).click();
  await panel().locator('#newAssetFile').setInputFiles({ name: 'Panel Dot.png', mimeType: 'image/png', buffer: PNG_1PX });
  await until(() => app.evaluate(() => document.querySelector('#panelTest #newAssetId').value === 'panel-dot'), 'choosing a file did not fill the name');
  await panel().locator('#newAssetId').press('Enter');
  await until(() => app.evaluate(() => !!document.querySelector('#panelTest #as-panel-dot-label')), 'the new image did not open');
  await save(() => exists('assets/panel-dot.js') && saved('assets/index.js').includes('panel-dot'), 'Save did not create assets/panel-dot.js');
  /* Keep it: the dialog names what goes and that Versions can bring it back, and cancelling leaves the image alone */
  await panel().locator('button', { hasText: 'Delete this image' }).click();
  const asked = await answerArkDialog(app, 'dismiss');
  check(/Delete the image/.test(asked) && /Versions/.test(asked) || /cannot be undone/.test(asked), 'the Delete dialog does not say what goes and whether it can be undone: ' + asked.replace(/\s+/g, ' '));
  check(exists('assets/panel-dot.js'), 'Keep it still deleted the image');
  await panel().locator('button', { hasText: 'Delete this image' }).click();
  await answerArkDialog(app, 'accept');
  await until(() => !exists('assets/panel-dot.js') && !saved('assets/index.js').includes('panel-dot'), 'Delete did not remove the image');
});

await step('vault: create, encrypt, Save, decrypt, delete', async () => {
  await mount('renderVaultPanel');
  await panel().locator('summary', { hasText: 'New encrypted content' }).click();
  await panel().locator('#newSecretId').fill('panel-secret');
  await panel().locator('#newSecretId').press('Enter');
  await until(() => app.evaluate(() => !!document.querySelector('#panelTest #sec-panel-secret-label')), 'the new item did not open');
  await panel().locator('button', { hasText: 'Add my own key' }).click();
  await panel().locator('textarea[placeholder="The content to encrypt"]').fill('the panel plaintext');
  await panel().locator('button', { hasText: 'Encrypt & lock' }).click();
  await until(() => app.evaluate(() => /Encrypted for 1 recipient/.test(document.getElementById('status').textContent)), 'Encrypt & lock did not report');
  await save(() => exists('secrets/panel-secret.js') && /ciphertextBase64":\s*"[A-Za-z0-9+/]{16}/.test(saved('secrets/panel-secret.js')) && !saved('secrets/panel-secret.js').includes('the panel plaintext'), 'Save did not write ciphertext only');
  await panel().locator('button', { hasText: 'Decrypt to check' }).click();
  await until(() => app.evaluate(() => [...document.querySelectorAll('#panelTest textarea[readonly]')].some((t) => t.value === 'the panel plaintext')), 'Decrypt to check did not recover the plaintext');
  await panel().locator('button', { hasText: 'Delete this item' }).click();
  await answerArkDialog(app, 'accept');
  await until(() => !exists('secrets/panel-secret.js'), 'Delete did not remove the item');
});

await step('shapes: shared tuning, Save', async () => {
  await mount('renderShapesPanel');
  const before = saved('mesh-settings-data.js');
  const range = panel().locator('input[type="range"][id^="relief-"]').first();
  await range.evaluate((el) => { el.value = String(Number(el.min) + (Number(el.max) - Number(el.min)) / 3); el.dispatchEvent(new Event('input', { bubbles: true })); });
  await save(() => saved('mesh-settings-data.js') !== before, 'Save did not write the tuning to mesh-settings-data.js');
});

await step('theme & defaults: draws in a container', async () => {
  await mount('renderThemePanel');
  check(await panel().locator('#siteSeo').count() === 1 && await panel().locator('#theme-active').count() === 1, 'Theme & defaults did not draw its theme and site SEO');
  check(!(await app.evaluate(() => window.ArkAdminApp.unsaved())), 'after the saves above, a draft still shows unsaved');
});

await step('the editor asked with Ark\'s dialog, never a native one', async () => { check(!nativeDialogs.length, 'a native dialog was shown: ' + nativeDialogs.join(' | ')); });

await browser.close();
await new Promise((resolve) => server.close(resolve));
if (!args.includes('--keep')) fs.rmSync(WORK, { recursive: true, force: true });
else console.log('kept ' + WORK);
console.log(failures ? `${failures} step(s) failed` : 'PASS: every content form, mounted in its own container, edits and saves.');
process.exit(failures ? 1 : 0);

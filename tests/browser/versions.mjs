/* =====================================================================
   REAL-BROWSER FLOW for version history (js/admin/versions.js + versions-panel.js)
   ---------------------------------------------------------------------
   Why this exists: a history that records and lists but cannot be put back
   is a log, not a history -- and a restore that "works" in the editor but
   leaves the files saying something else has not restored anything. So every
   step asserts on the real outcome: the files Save wrote into the scratch site
   copy, the version records on disk (read back through the FLX grammar), the
   DOM inside the real preview iframe, and the PUBLIC page served afterwards.

     edit A > Save > edit B > Save > Versions lists both with derived summaries
     > Preview A (iframe shows A, nothing written) > Restore A > Save
     > the site's file is byte-identical to A's, a new version supersedes,
       and every older version is still on disk, unchanged.
     > a new page + image > Save > Restore an older version: the panel lists
       exactly those two files first; confirm > Save removes them from the
       site (through the same removal path Delete uses) and the restore is
       exact to the content address, while the history still holds them.
     > Import a tampered export (refused in the panel, nothing written), then
       the real export (a NEW version naming it), and Preview it.
     > an unsaved settings-defaults edit reaches the preview live, by message,
       without a reload and without writing the visitor's own localStorage;
       Preview of an older version shows ITS settings-defaults.

   Run:   node tests/browser/versions.mjs [--headed] [--keep]
   Needs: Chromium from `npx playwright install chromium`.
   Screenshots go to $SHOTS (default: a temp folder, printed at the end).
   ===================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { SITE, copySite, startHost, fakeFolder, appFrame, clickHeader } from './harness.mjs';

const require = createRequire(import.meta.url);
const FLX = require('../../js/admin/vendor/flx-state-grammar.js');
const ArkVersions = require('../../js/admin/versions.js');

const args = process.argv.slice(2);
const SHOTS = process.env.SHOTS || fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-shots-'));
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-site-'));
const PORT = Number(process.env.PORT) || 3497;
const ORIGIN = `http://127.0.0.1:${PORT}`;
fs.mkdirSync(SHOTS, { recursive: true });

let failures = 0;
class StepFailure extends Error {}
function check(condition, message) { if (!condition) throw new StepFailure(message); }
async function step(name, run) {
  try { await run(); console.log(`ok   ${name}`); }
  catch (error) { failures += 1; console.log(`FAIL ${name}\n     ${error instanceof StepFailure ? error.message : error.stack}`); throw error; }
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(probe, message, timeout = 20000) { /* generous: the shared machine runs other suites (load average 40+ seen) */
  const end = Date.now() + timeout; let last;
  while (Date.now() < end) {
    try { last = await probe(); } catch (error) { if (error instanceof StepFailure) throw error; last = null; }
    if (last) return last; await wait(100);
  }
  throw new StepFailure(message);
}

const HISTORY = path.join(WORK, 'cms-history');
const HOME = path.join(WORK, 'js/content/manifests/home.js');
const head = () => { try { return FLX.decodeState(fs.readFileSync(path.join(HISTORY, 'head.flx'), 'utf8')); } catch { return null; } };
const versionFile = (hash) => path.join(HISTORY, 'versions', hash + '.flx');
const record = (hash) => FLX.decodeState(fs.readFileSync(versionFile(hash), 'utf8'));
const homeText = () => fs.readFileSync(HOME, 'utf8');

copySite(WORK);
const server = await startHost(WORK, PORT);
const browser = await chromium.launch({ headless: !args.includes('--headed') });
const context = await browser.newContext({ viewport: { width: 1500, height: 950 }, acceptDownloads: true });
await fakeFolder(context, WORK);
const errors = [];
const harnessNoise = /could not be cloned/;
context.on('page', (p) => p.on('pageerror', (e) => { if (!harnessNoise.test(e.message)) errors.push(e.message); }));

const page = await context.newPage();
page.on('dialog', (d) => d.accept());
const shot = (name) => page.screenshot({ path: path.join(SHOTS, name + '.png') });
await page.goto(`${ORIGIN}/admin`);
const app = await appFrame(page);
const hashes = {};
let homeAfterA = null, exportedFile = null;

async function editEyebrow(text) {
  await app.click('#modeContentBtn');
  await app.click('#pageList button[data-id="home"]');
  const input = app.locator('#f-home-EYEBROW');
  await input.waitFor({ state: 'visible' });
  await input.fill(text);
}
const row = (seq) => app.locator(`#versionsList li[data-seq="${seq}"]`);
const previewText = async () => {
  const frame = await (await app.$('#cmsPreview')).contentFrame();
  return frame.evaluate(() => document.body.textContent);
};

try {
  await step('connecting the project folder starts the history from the project as found', async () => {
    /* #modeDesignBtn (what appFrame waits for) is static HTML: wait until admin.js has wired the page */
    await until(() => app.evaluate(() => !!window.ArkAdminApp), 'admin.js never finished starting', 30000);
    await clickHeader(app, 'connect');
    await until(() => app.evaluate(() => document.getElementById('connect').disabled), 'project folder did not connect', 30000)
      .catch(async (error) => { throw new StepFailure(error.message + ' (status: ' + await app.evaluate(() => document.getElementById('status').textContent) + ')'); });
    const h = await until(() => head(), 'cms-history/head.flx was never written');
    check(h.seq === 1, 'the baseline should be version 1, got ' + h.seq);
    const rec = record(h.head);
    check(rec.kind === 'checkpoint' && rec.label === 'The project as first connected', 'the baseline is a labelled checkpoint: ' + JSON.stringify({ kind: rec.kind, label: rec.label }));
    check(rec.items.articles.length > 0, 'the baseline was taken before the article bodies loaded (no articles in it)');
    hashes[1] = h.head;
  });

  await step('edit A > Save writes the file and records version 2', async () => {
    await editEyebrow('Version A eyebrow');
    await app.click('#save');
    await until(() => homeText().includes('Version A eyebrow'), 'home.js was not saved with edit A');
    const h = await until(() => { const x = head(); return x && x.seq === 2 && x; }, 'no version 2 after the first Save');
    hashes[2] = h.head; homeAfterA = homeText();
  });

  await step('edit B > Save records version 3', async () => {
    await editEyebrow('Version B eyebrow');
    await app.click('#save');
    await until(() => homeText().includes('Version B eyebrow'), 'home.js was not saved with edit B');
    const h = await until(() => { const x = head(); return x && x.seq === 3 && x; }, 'no version 3 after the second Save');
    hashes[3] = h.head;
  });

  await step('Versions lists every version, newest first, with summaries derived from the edits', async () => {
    await app.click('#versionsNav');
    await until(async () => (await app.locator('#versionsList > li').count()) === 3, 'the panel does not list 3 versions')
      .catch(async (error) => { await shot('versions-01-list-FAILED'); throw new StepFailure(error.message + ': ' + await app.evaluate(() => { const p = document.getElementById('versionsPanel'); return 'hidden=' + p.hidden + ' items=' + p.querySelectorAll('li.version').length + ' note=' + document.getElementById('versionsNote').textContent; })); });
    const seqs = await app.locator('#versionsList > li').evaluateAll((lis) => lis.map((li) => li.dataset.seq));
    check(seqs.join() === '3,2,1', 'not newest first: ' + seqs.join());
    const s3 = await row(3).locator('.version-summary').textContent();
    const s2 = await row(2).locator('.version-summary').textContent();
    check(s3.includes('manifests home: fields.EYEBROW.value "Version A eyebrow" → "Version B eyebrow"'), 'version 3 summary: ' + s3);
    check(s2.includes('manifests home: fields.EYEBROW.value "DEFXN / A chain of chains" → "Version A eyebrow"'), 'version 2 summary: ' + s2);
    await shot('versions-01-list');
  });

  await step('Preview version 2 shows edit A in the real preview iframe and writes nothing', async () => {
    const before = homeText();
    await row(2).locator('button[data-action="preview"]').click();
    await until(async () => { const t = await previewText(); return t.includes('Version A eyebrow') && !t.includes('Version B eyebrow'); }, 'the preview iframe does not show version 2', 15000);
    check(await app.locator('#versionsPreview').isVisible(), 'no "Previewing" banner');
    check(await app.evaluate(() => document.querySelector('#mode button[data-m="live"]').getAttribute('aria-pressed') === 'true'), 'the canvas is not read-only (Live) while previewing');
    check(homeText() === before && head().seq === 3, 'previewing wrote something');
    await shot('versions-02-preview');
  });

  await step('Restore version 2 loads it as unsaved drafts; nothing is written until Save', async () => {
    await row(2).locator('button[data-action="restore"]').click();
    await until(() => app.evaluate(() => /Loaded version #2 as unsaved drafts/.test(document.getElementById('status').textContent)), 'no "loaded as unsaved drafts" status after Restore');
    check(homeText().includes('Version B eyebrow') && head().seq === 3, 'Restore wrote files by itself');
    check(await app.locator('#versionsPreview').isHidden(), 'the preview banner stayed after Restore');
    await until(async () => { const t = await previewText(); return !t.includes('Version B eyebrow') && t.includes('Version A eyebrow'); }, 'after Restore the canvas does not show the restored drafts', 15000);
    await shot('versions-03-restored-unsaved');
  });

  const oldBytes = {};
  await step('Save after Restore: the site matches A again, as a NEW version that supersedes', async () => {
    for (const n of [1, 2, 3]) oldBytes[n] = fs.readFileSync(versionFile(hashes[n]));
    await app.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true, cancelable: true })));
    const h = await until(() => { const x = head(); return x && x.seq === 4 && x; }, 'no version 4 after saving the restore');
    check(homeText() === homeAfterA, 'home.js is not byte-identical to what edit A saved');
    const rec4 = record(h.head), rec2 = record(hashes[2]);
    check(rec4.restoredFrom === hashes[2], 'version 4 does not name version 2 as what it restores');
    check(rec4.prev === hashes[3], 'version 4 does not follow version 3');
    check(rec4.content === rec2.content, 'version 4 content address differs from version 2: the restore is not exact');
    hashes[4] = h.head;
  });

  await step('every older version is still on disk, byte for byte', async () => {
    for (const n of [1, 2, 3]) check(fs.readFileSync(versionFile(hashes[n])).equals(oldBytes[n]), `version ${n} was rewritten`);
    check(fs.readdirSync(path.join(HISTORY, 'versions')).length === 4, 'expected exactly 4 version records');
    for (const n of [1, 2, 3, 4]) await ArkVersions.readVersion(await ArkVersions.historyDir(nodeDir(WORK)), hashes[n]);
    await until(async () => (await app.locator('#versionsList > li').count()) === 4, 'the panel does not list 4 versions');
    check(/restores #2/.test(await row(4).locator('.version-head').textContent()), 'version 4 is not shown as restoring #2');
    await shot('versions-04-after-restore-save');
  });

  await step('the PUBLIC page reads the restored content', async () => {
    const pub = await context.newPage(); await pub.goto(`${ORIGIN}/`);
    await until(() => pub.evaluate(() => document.body.textContent.includes('Version A eyebrow')), 'the public home page does not show edit A after the restore');
    check(!(await pub.evaluate(() => document.body.textContent.includes('Version B eyebrow'))), 'the public home page still shows edit B');
    await pub.close();
  });

  await step('Export version 2 downloads one FLX document that proves itself', async () => {
    const [download] = await Promise.all([page.waitForEvent('download'), row(2).locator('button[data-action="export"]').click()]);
    check(/^defxn-version-2-[0-9a-f]{12}\.flx$/.test(download.suggestedFilename()), 'export name: ' + download.suggestedFilename());
    const file = path.join(SHOTS, download.suggestedFilename());
    await download.saveAs(file);
    const doc = await ArkVersions.readExport(fs.readFileSync(file, 'utf8'));
    check(doc.address === hashes[2], 'the export is not version 2');
    check(doc.site.manifests.find((m) => m.id === 'home').fields.EYEBROW.value === 'Version A eyebrow', 'the export does not carry edit A');
    exportedFile = file;
  });

  /* ---- Restore is complete: what the version never had leaves the site on Save ---- */
  const NEW_PAGE = path.join(WORK, 'js/content/manifests/versiontest.js');
  const NEW_IMAGE = path.join(WORK, 'js/content/assets/version-test.js');
  const PNG = path.join(WORK, 'version-test.png'); /* 1x1 transparent PNG */
  fs.writeFileSync(PNG, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64'));
  await step('a new page and a new image, saved, are version 5', async () => {
    await app.click('#modeContentBtn');
    /* the app's own "New theory page" / "New image" forms (selecting the new page re-renders the nav, so each is submitted directly).
       Not an article: a new article's blueprint is refused by Save until its evidence/action fields are filled in. */
    await app.evaluate(() => { document.getElementById('newId').value = 'versiontest'; document.getElementById('newForm').requestSubmit(); });
    await app.setInputFiles('#newAssetFile', PNG);
    await until(() => app.evaluate(() => !document.getElementById('newAssetPreview').hidden), 'the chosen image was not read');
    await app.evaluate(() => { document.getElementById('newAssetId').value = 'version-test'; document.getElementById('newAssetForm').requestSubmit(); });
    check(await app.evaluate(() => /New image/.test(document.getElementById('status').textContent)), 'the new image was not created: ' + await app.evaluate(() => document.getElementById('status').textContent));
    await app.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true, cancelable: true })));
    const h = await until(() => { const x = head(); return x && x.seq === 5 && x; }, 'no version 5 after saving the new page and image');
    check(fs.existsSync(NEW_PAGE) && fs.existsSync(NEW_IMAGE), 'the new page/image files were not written: ' + JSON.stringify({ page: fs.existsSync(NEW_PAGE), image: fs.existsSync(NEW_IMAGE), status: await app.evaluate(() => document.getElementById('status').textContent), summary: record(h.head).summary }));
    check(fs.readFileSync(path.join(WORK, 'js/content/manifests/index.js'), 'utf8').includes('"versiontest"'), 'the page index does not list the new page');
    hashes[5] = h.head;
  });

  await step('Restore #4 lists exactly the two items #4 never had, and changes nothing yet', async () => {
    await until(async () => (await app.locator('#versionsList > li').count()) === 5, 'the panel does not list 5 versions');
    await row(4).locator('button[data-action="restore"]').click();
    await until(() => app.locator('#versionsConfirm').isVisible(), 'Restore of #4 did not ask before removing anything');
    const items = await app.locator('#versionsRemovals li').evaluateAll((lis) => lis.map((li) => li.querySelector('code').textContent));
    check(items.join() === 'js/content/manifests/versiontest.js,js/content/assets/version-test.js', 'the removal list is not exactly the two files: ' + items.join());
    check(head().seq === 5 && fs.existsSync(NEW_PAGE) && fs.existsSync(NEW_IMAGE), 'asking wrote or removed something');
    await shot('versions-05-restore-removals-confirm');
  });

  await step('confirm, then Save: both files leave the site, the restore is exact, and history keeps them', async () => {
    await app.locator('#versionsConfirm button[data-action="confirm-restore"]').click();
    await until(() => app.evaluate(() => /Save also removes 2 files/.test(document.getElementById('status').textContent)), 'the status does not say Save will remove the two files');
    check(fs.existsSync(NEW_PAGE) && fs.existsSync(NEW_IMAGE), 'confirming removed files before Save');
    check(await app.evaluate(() => !document.getElementById('save').disabled), 'Save is not enabled while removals are pending');
    await app.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true, cancelable: true })));
    const h = await until(() => { const x = head(); return x && x.seq === 6 && x; }, 'no version 6 after saving the restore');
    check(!fs.existsSync(NEW_PAGE) && !fs.existsSync(NEW_IMAGE), 'the files #4 never had are still in the site');
    check(!fs.readFileSync(path.join(WORK, 'js/content/manifests/index.js'), 'utf8').includes('"versiontest"'), 'the page index still lists the removed page');
    check(!fs.readFileSync(path.join(WORK, 'js/content/assets/index.js'), 'utf8').includes('version-test'), 'the image index still lists the removed image');
    const rec6 = record(h.head);
    const rec4 = record(hashes[4]);
    const differs = Object.keys(rec6.items).filter((k) => JSON.stringify(rec6.items[k]) !== JSON.stringify(rec4.items[k]));
    check(rec6.restoredFrom === hashes[4] && rec6.content === rec4.content, 'version 6 is not an exact restore of #4; differing drafts: ' + differs.join(', ') + ' | ' + rec6.summary.join(' | '));
    check(rec6.summary.some((l) => /^manifests: -versiontest$/.test(l)) && rec6.summary.some((l) => /^assets: -version-test$/.test(l)), 'version 6 does not describe the removals: ' + rec6.summary.join(' | '));
    const kept = await ArkVersions.loadSnapshot(await ArkVersions.historyDir(nodeDir(WORK)), hashes[5]);
    check(kept.snapshot.manifests.some((m) => m.id === 'versiontest') && kept.snapshot.assets.some((a) => a.id === 'version-test'), 'version 5 no longer holds the removed page and image');
    hashes[6] = h.head;
    await until(async () => (await app.locator('#versionsList > li').count()) === 6, 'the panel does not list 6 versions');
    await shot('versions-06-after-removal-save');
  });

  /* ---- Import: a file must prove itself, then it is a NEW version ---- */
  await step('a tampered export is refused in the panel, naming what is wrong and the remedy; nothing is written', async () => {
    const tampered = FLX.decodeState(fs.readFileSync(exportedFile, 'utf8'));
    tampered.site.manifests.find((m) => m.id === 'home').fields.EYEBROW.value = 'Forged eyebrow';
    const bad = path.join(SHOTS, 'tampered-export.flx');
    fs.writeFileSync(bad, FLX.encodeState(tampered));
    const before = fs.readdirSync(path.join(HISTORY, 'versions')).length;
    await app.setInputFiles('#versionsImportFile', bad);
    const text = await until(async () => { const t = await app.locator('#versionsImportNote').textContent(); return t && t; }, 'no refusal shown for the tampered file');
    check(/Not imported: tampered-export\.flx[\s\S]*do not match[\s\S]*Missing:[\s\S]*To fix:/.test(text), 'the refusal does not name what is wrong, what is missing and the remedy: ' + text);
    check(head().seq === 6 && fs.readdirSync(path.join(HISTORY, 'versions')).length === before, 'a refused import wrote something');
    await shot('versions-07-import-refused');
  });

  await step('the real export imports as version 7, naming the export, and previews like any version', async () => {
    await app.setInputFiles('#versionsImportFile', exportedFile);
    const h = await until(() => { const x = head(); return x && x.seq === 7 && x; }, 'no version 7 after importing the export');
    const rec7 = record(h.head);
    check(rec7.kind === 'import' && rec7.importedFrom === hashes[2] && rec7.prev === hashes[6], 'version 7 is not a forward import record naming #2: ' + JSON.stringify({ kind: rec7.kind, importedFrom: rec7.importedFrom }));
    check(rec7.content === record(hashes[2]).content, 'the import does not hold exactly #2\'s drafts');
    check(await app.locator('#versionsImportNote').textContent() === '', 'the earlier refusal is still shown after a good import');
    await until(async () => (await row(7).count()) === 1, 'the panel does not list the imported version');
    check(/from [0-9a-f]{12}/.test(await row(7).locator('.version-head').textContent()), 'the imported row does not show where it came from');
    await row(7).locator('button[data-action="preview"]').click();
    await until(async () => (await previewText()).includes('Version A eyebrow'), 'previewing the imported version does not show edit A', 15000);
    await shot('versions-08-imported-preview');
    await app.click('#versionsBack');
  });

  /* ---- Preview shows site-wide settings-defaults, live and per version ---- */
  const docState = (frame) => frame.evaluate(() => ({ theme: document.documentElement.dataset.theme, motif: document.documentElement.dataset.motif, stored: localStorage.getItem('flux-chain-theme'), marker: window.__versionsMarker === 1 }));
  await step('an unsaved settings-defaults edit previews live, without a reload and without touching the visitor\'s own choice', async () => {
    await app.click('#modeDesignBtn');
    await app.click('#designThemeBtn');
    await app.locator('#defaults-theme').waitFor({ state: 'visible' });
    const frame = await until(async () => { const f = await (await app.$('#frame')).contentFrame(); return f && await f.evaluate(() => !!document.querySelector('.site-settings')).catch(() => false) && f; }, 'the design preview never loaded');
    await until(async () => (await docState(frame)).theme === 'ghost', 'the design preview does not start on the saved default theme');
    await frame.evaluate(() => { window.__versionsMarker = 1; });
    const storedBefore = (await docState(frame)).stored;
    await app.selectOption('#defaults-theme', 'marine');
    await app.selectOption('#defaults-motif', 'traces');
    const live = await until(async () => { const s = await docState(frame); return s.theme === 'marine' && s.motif === 'traces' && s; }, 'the design preview does not show the unsaved default theme/pattern', 6000);
    check(live.marker, 'the preview was reloaded to show the edit (it should arrive by message)');
    check(live.stored === storedBefore, 'previewing wrote the visitor\'s own theme choice into localStorage: ' + storedBefore + ' -> ' + live.stored);
    await shot('versions-09-defaults-live');
  });

  await step('Save, then Preview #6: the canvas shows #6\'s settings-defaults, and Back shows the current ones', async () => {
    await app.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true, cancelable: true })));
    await until(() => { const x = head(); return x && x.seq === 8; }, 'no version 8 after saving the settings defaults');
    check(/"theme": "marine"/.test(fs.readFileSync(path.join(WORK, 'js/content/settings-defaults-data.js'), 'utf8')), 'the settings defaults file was not saved');
    await until(async () => (await row(6).count()) === 1, 'the panel does not list #6');
    await row(6).locator('button[data-action="preview"]').click();
    const studio = async () => (await app.$('#cmsPreview')).contentFrame();
    await until(async () => { const s = await docState(await studio()); return s.theme === 'ghost' && s.motif === 'blocks'; }, 'previewing #6 does not show #6\'s default theme/pattern (ghost/blocks)', 15000);
    await shot('versions-10-preview-old-defaults');
    await app.click('#versionsBack');
    await until(async () => { const s = await docState(await studio()); return s.theme === 'marine' && s.motif === 'traces'; }, 'Back to current drafts does not show the current default theme/pattern (marine/traces)', 15000);
    await shot('versions-11-back-current-defaults');
  });

  /* ---- Delete is recorded at once; Restore puts a deleted page back in ITS place ----
     Regressions (2026-10-18): a Delete recorded nothing until the next Save, whose record then
     mixed the removal into unrelated edits; and Restore appended a page the current site no
     longer had to the END of the list, so the restored site differed from the version in order
     alone and its content address never equalled the version's. */
  const MANIFEST_INDEX = path.join(WORK, 'js/content/manifests/index.js');
  const indexIds = () => JSON.parse(/var ArkManifestIds = (\[[^;]*\]);/.exec(fs.readFileSync(MANIFEST_INDEX, 'utf8'))[1]);
  const rootFile = (name) => fs.readFileSync(path.join(WORK, name), 'utf8');
  /* a theory page: only those have a Delete button (the fixed pages are part of the site's frame) */
  const DEPTH = path.join(WORK, 'js/content/manifests/depth.js');
  await step('Delete a page in the middle of the list: a version is recorded at once, and sitemap.xml/llms.txt follow', async () => {
    check(head().seq === 8, 'expected version 8 to be the head before the Delete, got ' + head().seq);
    hashes[8] = head().head;
    check(indexIds().indexOf('depth') > 0 && indexIds().indexOf('depth') < indexIds().length - 1, 'the fixture assumes "depth" sits mid-list: ' + indexIds().join());
    check(/concept\/depth/.test(rootFile('sitemap.xml')) && /concept\/depth/.test(rootFile('llms.txt')), 'the fixture assumes sitemap.xml and llms.txt list /concept/depth');
    await app.click('#modeContentBtn');
    await app.click('#pageList button[data-id="depth"]');
    await app.locator('button', { hasText: /^Delete this page$/ }).click();
    const h = await until(() => { const x = head(); return x && x.seq === 9 && x; }, 'Delete did not record version 9 by itself (no Save was pressed)');
    check(!fs.existsSync(DEPTH) && !indexIds().includes('depth'), 'the page file or its index entry is still there');
    const rec9 = record(h.head);
    check(rec9.prev === hashes[8] && rec9.kind === 'save' && !rec9.restoredFrom, 'version 9 is not a plain forward record on top of #8: ' + JSON.stringify({ prev: rec9.prev, kind: rec9.kind, restoredFrom: rec9.restoredFrom }));
    check(rec9.summary.some((l) => l === 'manifests: -depth'), 'version 9 does not describe the removal: ' + rec9.summary.join(' | '));
    check(!/concept\/depth/.test(rootFile('sitemap.xml')) && !/concept\/depth/.test(rootFile('llms.txt')), 'sitemap.xml / llms.txt still list the deleted page');
    hashes[9] = h.head;
  });

  await step('Restore #8, Save: the page returns to ITS place, and the restore is exact to the content address', async () => {
    if (await app.locator('#versionsPanel').isHidden()) await app.click('#versionsNav');
    await until(async () => (await row(9).count()) === 1, 'the panel does not list #9');
    await row(8).locator('button[data-action="restore"]').click();
    /* the Delete left the SEO draft unsaved (it still names the deleted page until a Save drops
       it), so the panel first asks to replace unsaved changes: nothing to remove, plain Restore */
    const asked = await until(async () => (await app.locator('#versionsConfirm').isVisible() ? 'ask' : '') || (await app.evaluate(() => /Loaded version #8/.test(document.getElementById('status').textContent)) ? 'loaded' : ''), 'Restore of #8 neither loaded nor asked');
    if (asked === 'ask') await app.locator('#versionsConfirm button[data-action="confirm-restore"]').click();
    await until(() => app.evaluate(() => /Loaded version #8 as unsaved drafts/.test(document.getElementById('status').textContent)), 'Restore of #8 did not load it')
      .catch(async (error) => { throw new StepFailure(error.message + ' (status: ' + await app.evaluate(() => document.getElementById('status').textContent) + ' | confirm visible: ' + await app.locator('#versionsConfirm').isVisible() + ')'); });
    await app.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true, cancelable: true })));
    const h = await until(() => { const x = head(); return x && x.seq === 10 && x; }, 'no version 10 after saving the restore of #8');
    const rec10 = record(h.head), rec8 = record(hashes[8]);
    const order8 = rec8.items.manifests.map((pair) => pair[0]);
    check(indexIds().join() === order8.join(), 'the page index is not in #8\'s order:\n  index ' + indexIds().join() + '\n  #8    ' + order8.join());
    check(rec10.content === rec8.content, 'version 10 is not an exact restore of #8 (content address differs): ' + rec10.summary.join(' | '));
    check(fs.existsSync(DEPTH) && /concept\/depth/.test(rootFile('sitemap.xml')), 'the restored page or its sitemap entry is missing');
    hashes[10] = h.head;
  });

  await step('a list that differs from a version in ORDER alone is restored too (the index is rewritten on Save)', async () => {
    /* a hand-edited index: the same pages, two of them swapped -- no page file differs */
    const ids = indexIds(); const i = ids.indexOf('chain'), j = ids.indexOf('resolver');
    [ids[i], ids[j]] = [ids[j], ids[i]];
    fs.writeFileSync(MANIFEST_INDEX, fs.readFileSync(MANIFEST_INDEX, 'utf8').replace(/var ArkManifestIds = \[[^;]*\];/, 'var ArkManifestIds = ' + JSON.stringify(ids) + ';'));
    await page.goto(`${ORIGIN}/admin`);
    const app2 = await appFrame(page);
    await until(() => app2.evaluate(() => !!window.ArkAdminApp), 'admin.js never finished starting after the reload', 30000);
    await clickHeader(app2, 'connect');
    await until(() => app2.evaluate(() => document.getElementById('connect').disabled), 'project folder did not reconnect', 30000);
    await app2.click('#versionsNav');
    const row2 = (seq) => app2.locator(`#versionsList li[data-seq="${seq}"]`);
    await until(async () => (await row2(10).count()) === 1, 'the reloaded panel does not list #10');
    await row2(10).locator('button[data-action="restore"]').click();
    await until(() => app2.evaluate(() => /Loaded version #10 as unsaved drafts/.test(document.getElementById('status').textContent)), 'Restore of #10 did not load it');
    check(await app2.evaluate(() => window.ArkAdminApp.unsaved()), 'a restore that changes only the order leaves nothing to Save');
    await app2.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true, cancelable: true })));
    const h = await until(() => { const x = head(); return x && x.seq === 11 && x; }, 'no version 11 after saving an order-only restore');
    const rec11 = record(h.head), rec10 = record(hashes[10]);
    check(indexIds().join() === rec10.items.manifests.map((pair) => pair[0]).join(), 'the page index was not put back in #10\'s order: ' + indexIds().join());
    check(rec11.content === rec10.content && rec11.restoredFrom === hashes[10], 'version 11 is not an exact restore of #10: ' + rec11.summary.join(' | '));
  });
} catch { /* reported by step() */ }

/* the Node side reads the same folder through a File System Access-shaped handle, so the
   browser's records are verified by the same store code, not by a second parser */
function nodeDir(dir) {
  const notFound = (name) => Object.assign(new Error(name), { name: 'NotFoundError' });
  return {
    async getDirectoryHandle(child, opts) { const p = path.join(dir, child); if (!fs.existsSync(p)) { if (!opts || !opts.create) throw notFound(child); fs.mkdirSync(p); } return nodeDir(p); },
    async getFileHandle(child) { const p = path.join(dir, child); if (!fs.existsSync(p)) throw notFound(child); return { async getFile() { return { text: async () => fs.readFileSync(p, 'utf8') }; } }; },
  };
}

await browser.close();
server.close();
if (args.includes('--keep')) console.log(`\nsaved site copy kept: ${WORK}`); else fs.rmSync(WORK, { recursive: true, force: true });
console.log(`\nscreenshots: ${SHOTS}`);
if (errors.length) console.log('page errors:\n  ' + [...new Set(errors)].join('\n  '));
console.log(failures ? `${failures} step(s) failed` : 'all steps passed');
process.exit(failures || errors.length ? 1 : 0);

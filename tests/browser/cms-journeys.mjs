/* =====================================================================
   REAL-BROWSER JOURNEYS: the four P0 blockers of the CMS UX audit, walked as a person walks them
   ---------------------------------------------------------------------
   Why this exists: docs/ux-audit/cms.md (2026-10-19) found four journeys a first-time site
   owner could not finish, and one real bug. Each was invisible to the existing drivers, which
   connect the project folder first, never press Escape, never add a page and look at it, and
   never click a greyed-out Publish. So this walks each one end to end and asserts what the person
   gets -- the words on the canvas, the file on disk, a download that must NOT happen -- never the
   machinery in between (law: validate the payload, not the pipeline):

     first-run   no folder connected: a banner over the canvas says what connecting does, with
                 the button; Versions' "connect the folder" carries the button too
     menu        the account menu closes on a click inside the canvas iframe (project.js)
     save        Save with no folder writes nothing AND downloads nothing: it says "Not saved to
                 your site" with Connect and "Download changed files instead"; Connect from that
                 notice connects and saves -- the file on disk has the edit
     page        add a theory page -> the canvas shows THE NEW PAGE (from its draft, before any
                 Save), the Page fields sheet is the new page's, the canvas label, the picker and
                 the sheet name it the same; edit its heading in the sheet -> the canvas follows;
                 Save -> the file
     article     add "hello-world" -> named "Hello world" everywhere, shown on the canvas
     inline      the home heading: Enter finishes (no line break inside), Escape finishes and
                 KEEPS the typing
     publish     no miner: Publish reads unavailable but a click opens the Publish sheet, which
                 says why (no "undefined"), how to start Ark Miner, and has Check again
     download    in a browser with no folder: "Download changed files instead" downloads, and
                 says the site folder did not change

   Run:   node tests/browser/cms-journeys.mjs [--headed] [--only first-run,save,...]
   Needs: Chromium from `npx playwright install chromium`.
   Screenshots go to $SHOTS (default: a temp folder, printed at the end).
   ===================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { appFrame, copySite, startHost, fakeFolder, watchSignals, previewFrame, until as untilFor, waitForPreviewReady, openRoute,
  gotoEditor, openRailTab, pageRow, openAccountMenu, setLens, sheetBody, closeSheet, closeToolbarSection, clickHeader, createItem } from './harness.mjs';

const args = process.argv.slice(2);
const only = (args.find((a) => a.startsWith('--only=')) || '').slice(7) || (args.includes('--only') ? args[args.indexOf('--only') + 1] : '');
const wanted = (name) => !only || only.split(',').includes(name);
const SHOTS = process.env.SHOTS || fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-journeys-'));
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-site-'));
fs.mkdirSync(SHOTS, { recursive: true });

let failures = 0;
class StepFailure extends Error {}
function check(condition, message) { if (!condition) throw new StepFailure(message); }
async function step(name, run) {
  if (!wanted(name.split(':')[0])) return;
  try { await run(); console.log(`ok   ${name}`); }
  catch (error) { failures += 1; console.log(`FAIL ${name}\n     ${error instanceof StepFailure ? error.message : error.stack}`); }
}
const until = (probe, message, timeout = 10000) => untilFor(probe, message, timeout, { interval: 120, fail: (m) => new StepFailure(m), passThrough: (e) => e instanceof StepFailure });
const readSite = (rel) => fs.readFileSync(path.join(WORK, rel), 'utf8');

copySite(WORK);
const server = await startHost(WORK);
const ORIGIN = server.origin;
const browser = await chromium.launch({ headless: !args.includes('--headed') });
const errors = [];
const harnessNoise = /could not be cloned/;

async function newEditor(context) {
  const page = await context.newPage();
  page.on('pageerror', (e) => { if (!harnessNoise.test(e.message)) errors.push(e.message); });
  page.on('dialog', (d) => d.dismiss());
  const downloads = [];
  page.on('download', (d) => downloads.push(d.suggestedFilename()));
  await gotoEditor(page, ORIGIN);
  const app = await appFrame(page);
  const pv = await previewFrame(app);
  await waitForPreviewReady(app);
  return { page, app, pv, downloads, shot: (name) => page.screenshot({ path: path.join(SHOTS, name + '.png') }) };
}
const draft = (app, id, key) => app.evaluate(([id, key]) => window.ArkAdmin.state.drafts[id].fields[key].value, [id, key]);
const notice = (app, key) => app.locator(`[data-notice="${key}"]`);
const editing = (pv) => pv.evaluate(() => { const el = document.querySelector('[data-ark-inline-editing]'); return el ? el.textContent : null; });
const canvasRoute = (pv) => pv.evaluate(() => window.ArkUI && ArkUI.route ? ArkUI.route.path() : null);
/* click a text on the canvas until it is being edited: the canvas may re-render it in place
   right after an edit (a re-sent site), and a click on the node being replaced is lost */
async function clickToEdit(app, selector) {
  return until(async () => {
    const pv = await previewFrame(app);
    if ((await editing(pv)) !== null) return pv;
    await pv.locator(selector).first().click({ timeout: 2000 }).catch(() => {});
    for (let i = 0; i < 10; i++) { if ((await editing(pv)) !== null) return pv; await new Promise((r) => setTimeout(r, 100)); }
    return null;
  }, selector + ' did not become editable', 15000);
}
const caretToEnd = (pv) => pv.evaluate(() => { const el = document.querySelector('[data-ark-inline-editing]'); const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
/* the one preview frame, re-found: a route change re-points the iframe and replaces its document */
const canvas = (app) => previewFrame(app);

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await fakeFolder(context, WORK);
let E = await newEditor(context);

/* ---------------------------------------------------------------- first run, unconnected */
await step('first-run: with no folder connected, a banner over the canvas says what connecting does, with the button', async () => {
  const banner = notice(E.app, 'project-folder');
  await until(() => banner.isVisible(), 'no first-run banner over the canvas');
  const text = await banner.textContent();
  check(/Connect your project folder/.test(text) && /Save writes your changes straight into the site/.test(text), 'the banner does not say what connecting does: ' + text);
  check(await banner.locator('button', { hasText: 'Connect project folder' }).count() === 1, 'the banner has no Connect project folder button');
  check(await E.app.evaluate(() => { const b = document.getElementById('noticeBanners'); const c = document.getElementById('designView'); return b.getBoundingClientRect().bottom <= c.getBoundingClientRect().top + 1; }), 'the banner overlaps the canvas instead of sitting above it');
  await E.shot('first-run-banner');
});

await step('first-run: Versions says the folder is needed AND has the button', async () => {
  await clickHeader(E.app, 'versionsNav');
  const connect = E.app.locator('#versionsConnect');
  await until(() => connect.isVisible(), 'Versions has no Connect project folder button while no folder is connected');
  await E.shot('versions-connect');
  await clickHeader(E.app, 'versionsNav');
});

await step('menu: the account menu closes when the canvas is clicked', async () => {
  await openAccountMenu(E.app);
  await E.pv.locator('body').click({ position: { x: 600, y: 400 } });
  await until(() => E.app.evaluate(() => document.getElementById('accountMenu').hidden), 'the account menu stayed open over the canvas after a click inside it');
});

/* ---------------------------------------------------------------- save without a folder */
const MARK = 'Journey save marker';
await step('save: Save with no folder writes nothing, downloads nothing, and says so with the remedy', async () => {
  const before = readSite('js/content/manifests/home.js');
  await E.app.evaluate((v) => { window.ArkAdmin.setItemField('page', 'home', 'EYEBROW', v); }, MARK);
  await E.app.click('#save');
  const refusal = notice(E.app, 'project-folder');
  await until(() => refusal.isVisible(), 'Save with no folder said nothing in a notice');
  const text = await refusal.textContent();
  check(/Not saved to your site/.test(text), 'the refusal does not say the site was not saved: ' + text);
  check(await refusal.locator('button', { hasText: 'Connect project folder' }).count() === 1, 'the refusal has no Connect button');
  check(await refusal.locator('button', { hasText: 'Download changed files instead' }).count() === 1, 'the refusal does not offer the download as an explicit second choice');
  check(E.downloads.length === 0, 'Save with no folder downloaded files: ' + E.downloads.join(', '));
  check(readSite('js/content/manifests/home.js') === before, 'Save with no folder changed the file anyway');
  check(await E.app.evaluate(() => window.ArkAdminApp.unsaved()), 'the edit no longer counts as unsaved');
  check(!/^Saved/.test(await E.app.evaluate(() => document.getElementById('status').textContent)), 'the status line claims it saved');
  await E.shot('save-unconnected');
});

await step('save: Connect from the refusal connects the folder and saves -- the file has the edit', async () => {
  await notice(E.app, 'project-folder').locator('button', { hasText: 'Connect project folder' }).click();
  await until(() => readSite('js/content/manifests/home.js').includes(MARK), 'Connect from the refusal did not save the edit into manifests/home.js', 20000);
  await until(async () => (await notice(E.app, 'project-folder').count()) === 0, 'the not-connected banner stayed after connecting');
  check(E.downloads.length === 0, 'connecting downloaded files: ' + E.downloads.join(', '));
  await E.shot('save-connected');
});

/* ---------------------------------------------------------------- add a page */
await step('page: a new theory page is ON the canvas, from its draft, and its Page fields are open', async () => {
  await setLens(E.app, 'content');
  /* asked for by its title; the address is derived from it (docs/ux-audit/cms.md P1-4) */
  await createItem(E.app, 'page', 'Journey page');
  const pv = await until(async () => { const f = await canvas(E.app); return (await canvasRoute(f)) === '/concept/journeypage' && f; }, 'the canvas never showed /concept/journeypage before Save', 20000);
  /* the title typed is the new page's heading */
  await until(() => pv.evaluate(() => document.body.textContent.includes('Journey page')), 'the canvas is on the route but does not show the new page\'s title as its heading');
  check(!fs.existsSync(path.join(WORK, 'js/content/manifests/journeypage.js')), 'the new page was written before Save');
  const sheet = await E.app.evaluate(() => ({ open: !document.getElementById('sheet').hidden, key: document.getElementById('sheet').dataset.sheet, title: document.getElementById('sheetTitle').textContent,
    fieldsBtn: document.getElementById('btnPageFields').getAttribute('aria-expanded'), label: document.getElementById('devName').textContent, picker: document.getElementById('btnPage').textContent,
    item: !!document.querySelector('#sheetBody [data-cms-field^="page:journeypage:"]') }));
  check(sheet.open && sheet.key === 'fields' && sheet.item, 'the new page\'s Page fields did not open: ' + JSON.stringify(sheet));
  const name = await E.app.evaluate(() => window.ArkAdmin.state.drafts.journeypage.title);
  check(sheet.title === name, `the sheet is titled "${sheet.title}", not the new page "${name}"`);
  check(sheet.label.startsWith(name + ' · '), `the canvas label says "${sheet.label}", not "${name}"`);
  check(sheet.picker.includes(name), `the page picker says "${sheet.picker}", not "${name}"`);
  const created = notice(E.app, 'created');
  check(await created.count() === 1 && (await created.textContent()).includes(name), 'no full "New page" notice naming the page');
  await E.shot('page-created');
});

await step('page: the header\'s Page fields opens the NEW page; an edit there reaches the canvas; Save writes the file', async () => {
  await closeSheet(E.app);
  await E.app.click('#btnPageFields');
  await until(() => E.app.evaluate(() => !!document.querySelector('#sheet:not([hidden]) [data-cms-field="page:journeypage:TITLE"]')), 'the header\'s Page fields opened another page\'s fields');
  const field = sheetBody(E.app).locator('[data-cms-field="page:journeypage:TITLE"]');
  await field.fill('Journey page heading.');
  const pv = await canvas(E.app);
  await until(() => pv.evaluate(() => document.body.textContent.includes('Journey page heading.')), 'the canvas never showed the heading typed in the new page\'s fields');
  await E.shot('page-edited');
  await E.app.click('#save');
  await until(() => fs.existsSync(path.join(WORK, 'js/content/manifests/journeypage.js')) && readSite('js/content/manifests/journeypage.js').includes('Journey page heading.'), 'Save did not write the new page', 20000);
  await until(async () => (await canvasRoute(await canvas(E.app))) === '/concept/journeypage', 'after Save the canvas left the new page');
  await closeSheet(E.app);
});

/* ---------------------------------------------------------------- add an article */
await step('article: "hello-world" is named "Hello world" everywhere and shown on the canvas before Save', async () => {
  await createItem(E.app, 'article', 'Hello world');
  const pv = await until(async () => { const f = await canvas(E.app); return (await canvasRoute(f)) === '/learnings/hello-world' && f; }, 'the canvas never showed /learnings/hello-world', 20000);
  await until(() => pv.evaluate(() => document.body.textContent.includes('Hello world')), 'the canvas does not show the new article\'s title');
  const row = pageRow(E.app, { article: 'hello-world' });
  check((await row.textContent()).includes('Hello world'), 'the rail names the new article "' + (await row.textContent()) + '"');
  check(!(await row.textContent()).includes('New note'), 'the rail still calls it "New note"');
  check((await E.app.evaluate(() => document.getElementById('sheetTitle').textContent)) === 'Hello world', 'the sheet is not the new article\'s');
  await E.shot('article-created');
  await closeSheet(E.app);
});

/* ---------------------------------------------------------------- inline Enter / Escape */
await step('inline: Enter finishes the home heading with no line break; Escape finishes and keeps the typing', async () => {
  await openRoute(E.app, await canvas(E.app), '/');
  let pv = await until(async () => { const f = await canvas(E.app); return (await canvasRoute(f)) === '/' && f; }, 'the canvas did not go back Home', 20000);
  const title = await draft(E.app, 'home', 'TITLE');
  pv = await clickToEdit(E.app, '[data-ark-page] h1');
  await caretToEnd(pv);
  await E.page.keyboard.type(' Today', { delay: 20 });
  await until(async () => (await draft(E.app, 'home', 'TITLE')) === title + ' Today', 'typing in the heading did not reach its draft (it is ' + JSON.stringify(await draft(E.app, 'home', 'TITLE')) + ')');
  await E.page.keyboard.press('Enter');
  await until(() => editing(pv).then((t) => t === null), 'Enter did not finish the heading');
  /* the final edit crosses the frame boundary as a message: read the draft once it has landed */
  await until(async () => (await draft(E.app, 'home', 'TITLE')) === title + ' Today', 'Enter in the heading stored ' + JSON.stringify(await draft(E.app, 'home', 'TITLE')) + ' (a line break went in, or the words were lost)', 3000);
  const intro = await draft(E.app, 'home', 'INTRO');
  /* the heading's Content popover opens below it, over the intro (docs/ux-audit/cms.md P1-6, a
     later wave): close it first, as a person would */
  await closeToolbarSection(E.app);
  pv = await clickToEdit(E.app, '[data-ark-page] p.hl-intro');
  await caretToEnd(pv);
  await E.page.keyboard.type(' Kept.', { delay: 20 });
  await until(async () => (await draft(E.app, 'home', 'INTRO')) === intro + ' Kept.', 'typing in the intro did not reach its draft (it is ' + JSON.stringify(await draft(E.app, 'home', 'INTRO')) + ', canvas: ' + JSON.stringify(await editing(pv)) + ')');
  await E.page.keyboard.press('Escape');
  await until(() => editing(pv).then((t) => t === null), 'Escape did not finish the edit');
  await until(async () => (await draft(E.app, 'home', 'INTRO')) === intro + ' Kept.', 'Escape threw the typing away', 3000);
  check((await pv.evaluate(() => document.querySelector('[data-ark-page] p.hl-intro').textContent)).endsWith(' Kept.'), 'Escape put the old words back on the canvas');
  await E.shot('inline-kept');
});

/* ---------------------------------------------------------------- publish unavailable */
await step('publish: refused Publish stays clickable, and a click opens the reason with the remedy', async () => {
  const pub = E.app.locator('#publish');
  await until(async () => (await pub.getAttribute('aria-disabled')) === 'true', 'Publish is not marked unavailable with no miner');
  /* the DOM's disabled, not Playwright's isDisabled(), which counts aria-disabled as disabled */
  check(!(await pub.evaluate((b) => b.disabled)), 'Publish is disabled: a click on it can never explain itself');
  check(/miner/i.test(await pub.getAttribute('title')), 'Publish\'s tooltip does not name the reason');
  /* force: Playwright will not click an aria-disabled button by itself; a person can, and must
     be told why */
  await pub.click({ force: true });
  await until(() => E.app.evaluate(() => !document.getElementById('sheet').hidden && document.getElementById('sheet').dataset.sheet === 'mesh'), 'a click on the refused Publish opened nothing');
  const sheet = E.app.locator('#sheet');
  await until(async () => /Ark Miner/.test(await E.app.locator('#meshReadiness').textContent()), 'the Publish sheet does not say what blocks publishing');
  const text = await sheet.textContent();
  check(!/undefined/.test(text), 'the Publish sheet prints "undefined": ' + text.slice(0, 200));
  check(/npm start/.test(text) && /Ark Miner Desktop/.test(text), 'the Publish sheet does not say how to start the miner');
  const again = E.app.locator('#meshReadiness button', { hasText: 'Check again' });
  check(await again.count() === 1, 'the reason has no Check again button');
  await again.click();
  await until(async () => /Ark Miner/.test(await E.app.locator('#meshReadiness').textContent()), 'Check again lost the reason');
  check(/How publishing keeps things private/.test(text), 'the security notes are not folded under their own disclosure');
  await E.shot('publish-explained');
  await closeSheet(E.app);
});
await E.page.close();
await context.close();

/* ---------------------------------------------------------------- download, as an explicit choice */
await step('download: with no folder, "Download changed files instead" downloads and says the site did not change', async () => {
  const bare = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  await watchSignals(bare);
  /* this browser cannot write into a folder: the only way out is the explicit download */
  await bare.addInitScript(() => { delete window.showDirectoryPicker; });
  const D = await newEditor(bare);
  try {
    await until(() => notice(D.app, 'project-folder').isVisible(), 'no banner in a browser that cannot connect a folder');
    await D.app.evaluate(() => { window.ArkAdmin.setItemField('page', 'home', 'EYEBROW', 'Downloaded marker'); });
    await D.app.click('#save');
    const refusal = notice(D.app, 'project-folder');
    await until(() => refusal.isVisible(), 'Save said nothing');
    check(D.downloads.length === 0, 'Save downloaded before being asked to');
    await refusal.locator('button', { hasText: 'Download changed files instead' }).click();
    await until(() => D.downloads.includes('home.js'), 'the explicit download did not download home.js (got: ' + D.downloads.join(', ') + ')');
    const done = D.app.locator('.notice', { hasText: 'your site folder did not change' });
    await until(() => done.count(), 'the download did not say the site folder did not change');
    await D.shot('download-explicit');
  } finally { await bare.close(); }
});

await browser.close();
server.close();
console.log('\nscreenshots: ' + SHOTS);
if (errors.length) { failures += 1; console.log('page errors:\n  ' + errors.join('\n  ')); }
console.log(failures ? `\n${failures} journey step(s) FAILED` : '\ncms journeys: all steps ok');
process.exit(failures ? 1 : 0);

/* =====================================================================
   FULL AUDIT of the merged CMS (admin-app.html + js/admin/admin.js)
   ---------------------------------------------------------------------
   Why this exists: the Studio merge (flickering-juggling-donut.md) folded
   two documents, two save paths and a fixed inspector into one app with a
   Content/Design switch, one contextual toolbar (#selToolbar) and one save
   (saveEverything()). The flows before this one (studio-flows, header-reach,
   versions) each proved one path. Nobody had walked EVERYTHING, and the
   defects this kind of change leaves are exactly the ones a per-flow test
   never visits: a builder that is defined but never called (the toolbar's
   Size section was), a button that does nothing, a disabled control that
   does not say what it needs, a console error on a surface nobody opened.

   So this walks every surface and asserts the REAL outcome of each -- the
   preview DOM, the file Save wrote, the value after a reload -- never the
   machinery in between (law: validate the payload, not the pipeline):

     content   every sidebar kind (pages, articles, images, encrypted,
               shapes, mesh): open, edit, the preview reflects it, Save by
               button AND by Ctrl/Cmd+S, reload, persisted; create + delete
     design    Canvas, Theme & defaults, Sitemap, Background, Design check
     toolbar   the contextual toolbar's taxonomy: heading, paragraph, link,
               button, container, image (svg/figure), canvas element,
               layout group, component instance, state group -- exactly the
               expected sections, and one control per section changes the
               preview and survives Save + reload
     canvas    undo/redo, multi-select, Layers select/hide/show/rename,
               sitemap zoom, breakpoints, Edit vs Live
     sweep     every visible button on every surface: clicking it must do
               something observable, or it must be disabled WITH a stated
               reason (law: a refusal names what it needs)

   Console errors, uncaught page errors and failed network requests during
   the whole walk are failures, attributed to the surface that was running.

   Run:   node tests/browser/full-audit.mjs [--only content,design,toolbar,canvas,sweep] [--headed]
   Needs: Chromium from `npx playwright install chromium`. Screenshots go to
   $SHOTS (default: a temp folder, printed at the end). Exits non-zero if any
   surface failed, any console/network error was seen, or any control is dead.
   Not part of scripts/run-tests.mjs (that runner reads only tests/*.cjs|mjs
   at the top level) because it needs Chromium and takes a few minutes.
   ===================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { SITE, copySite, startHost, fakeFolder, appFrame, previewFrame, toolbarKey, toolbarSections, openToolbarSection, toolbarAction, clickHeader, designView, openBackground } from './harness.mjs';

const args = process.argv.slice(2);
const ALL = ['content', 'design', 'toolbar', 'canvas', 'sweep'];
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : ALL;
/* --surface <words>[|<words>...]: only the surfaces whose name contains one of them */
const pick = args.includes('--surface') ? args[args.indexOf('--surface') + 1] : '';
const SHOTS = process.env.SHOTS || fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-audit-shots-'));
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-audit-site-'));
const PORT = Number(process.env.PORT) || 3497;
const ORIGIN = `http://127.0.0.1:${PORT}`;
fs.mkdirSync(SHOTS, { recursive: true });

/* ---------------------------------------------------------------- harness */
class StepFailure extends Error {}
function check(condition, message) { if (!condition) throw new StepFailure(message); }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(probe, message, timeout = 10000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    try { const value = await probe(); if (value) return value; } catch (error) { if (error instanceof StepFailure) throw error; /* a frame mid-navigation */ }
    await wait(100);
  }
  throw new StepFailure(message);
}

const matrix = [];          /* { group, surface, ok, why } */
const noise = [];           /* { surface, kind, text } -- console errors, page errors, failed requests */
const environment = [];     /* the same, for the live-data endpoints only: see wire() */
const dead = [];            /* { surface, control } -- clicked, nothing observable happened */
const unclickable = [];     /* { surface, control, why } -- visible and enabled, but a real click cannot reach it */
const mute = [];            /* { surface, control } -- disabled with no stated reason */
let currentSurface = 'setup';

/* The fake folder handle holds functions, so the app's "remember this folder" IndexedDB put
   cannot clone it -- an artefact of the harness, not of the app (same filter as studio-flows). */
const HARNESS_NOISE = /could not be cloned/;
/* A request the browser itself cancels because its frame navigated again (a preview that is
   re-pointed while it loads) is not a failure of the app; everything else is. */
const ABORTED = /ERR_ABORTED/;
/* The publish host proxies the site's live-data endpoints (/api/fleet-pulse, /api/chain-pulse,
   ...) to the real fleet, or does not serve them at all; on a machine that cannot reach the
   fleet they answer 404/502 and the page shows its own "unavailable" state. That is the
   environment, not the editor, so it is listed separately and does not fail the audit --
   every other failed request still does. */
const LIVE_DATA = /^\/api\/(fleet|chain)-[a-z-]+/;
function wire(page) {
  page.on('console', (m) => { if (process.env.AUDIT_DEBUG && m.type() === 'error') console.log('     console.error', m.text().slice(0, 160)); const at = m.location() && m.location().url ? m.location().url.replace(ORIGIN, '') : ''; if (m.type() === 'error' && /^Failed to load resource/.test(m.text()) && LIVE_DATA.test(at)) { environment.push({ surface: currentSurface, kind: 'console', text: m.text() + ' @ ' + at }); return; } if (m.type() === 'error' && !HARNESS_NOISE.test(m.text())) noise.push({ surface: currentSurface, kind: 'console', text: m.text() + (m.location() && m.location().url ? ' @ ' + m.location().url.replace(ORIGIN, '') + ':' + m.location().lineNumber : '') }); });
  page.on('pageerror', (e) => { if (!HARNESS_NOISE.test(e.message)) noise.push({ surface: currentSurface, kind: 'pageerror', text: e.message }); });
  page.on('requestfailed', (r) => { const why = (r.failure() && r.failure().errorText) || ''; if (!ABORTED.test(why)) noise.push({ surface: currentSurface, kind: 'request', text: why + ' ' + r.url().replace(ORIGIN, '') }); });
  page.on('response', (r) => { if (r.status() >= 400 && LIVE_DATA.test(r.url().replace(ORIGIN, ''))) { environment.push({ surface: currentSurface, kind: 'http ' + r.status(), text: r.url().replace(ORIGIN, '') }); return; } if (r.status() >= 400) noise.push({ surface: currentSurface, kind: 'http ' + r.status(), text: r.url().replace(ORIGIN, '') }); });
  page.on('framenavigated', (f) => { navigations += 1; if (process.env.AUDIT_DEBUG) console.log('     nav', f.name() || '(top)', f.url().replace(ORIGIN, '')); });
}
let navigations = 0;

async function surface(group, name, run) {
  if (!only.includes(group) || (pick && !pick.split('|').some((p) => name.includes(p)))) return;
  currentSurface = group + ' / ' + name;
  /* every surface starts from the project's own saved content, not from what an earlier one saved */
  fs.rmSync(path.join(WORK, 'js/content'), { recursive: true, force: true });
  fs.cpSync(path.join(SITE, 'js/content'), path.join(WORK, 'js/content'), { recursive: true });
  fs.rmSync(path.join(WORK, 'cms-history'), { recursive: true, force: true });
  const opened = [];
  try {
    await run(opened);
    matrix.push({ group, surface: name, ok: true });
    console.log(`ok   ${currentSurface}`);
  } catch (error) {
    matrix.push({ group, surface: name, ok: false, why: error instanceof StepFailure ? error.message : error.stack });
    console.log(`FAIL ${currentSurface}\n     ${error instanceof StepFailure ? error.message : error.stack}`);
    const last = opened[opened.length - 1];
    if (last) await last.screenshot({ path: path.join(SHOTS, 'FAIL-' + (group + '-' + name).replace(/\W+/g, '-') + '.png') }).catch(() => {});
  }
  for (const p of opened) await p.close().catch(() => {});
}

copySite(WORK);
const server = await startHost(WORK, PORT);
const browser = await chromium.launch({ headless: !args.includes('--headed') });
const context = await browser.newContext({ viewport: { width: 1500, height: 950 } });
await fakeFolder(context, WORK);
/* For the sweep: in EVERY document (editor, preview frames), count what a click could change --
   DOM mutations and messages arriving from the parent (the preview's only input from the
   editor). Read per click; see sweep() below. */
await context.addInitScript(() => {
  window.__audit = { mut: 0, msg: 0 };
  const start = () => new MutationObserver((list) => { window.__audit.mut += list.length; }).observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
  if (document.documentElement) start(); else document.addEventListener('DOMContentLoaded', start);
  window.addEventListener('message', (e) => { if (e.source === window.parent && window.parent !== window) window.__audit.msg += 1; });
});
let requestsSeen = 0, pagesOpened = 0, downloads = 0, fsEvents = 0, choosers = 0;
context.on('request', () => { requestsSeen += 1; });
fs.watch(WORK, { recursive: true }, () => { fsEvents += 1; });
let dialogPolicy = 'accept';
let dialogsSeen = 0;
context.on('page', (p) => { pagesOpened += 1; wire(p); p.on('download', () => { downloads += 1; }); p.on('filechooser', () => { choosers += 1; }); p.on('dialog', (d) => { dialogsSeen += 1; if (dialogPolicy === 'accept') d.accept().catch(() => {}); else d.dismiss().catch(() => {}); }); });

const readSaved = (rel) => fs.readFileSync(path.join(WORK, 'js/content', rel), 'utf8');
const savedExists = (rel) => fs.existsSync(path.join(WORK, 'js/content', rel));
/* the `ArkX.define({...});` JSON a Save wrote, parsed */
function savedJson(rel) { const text = readSaved(rel); return JSON.parse(text.slice(text.indexOf('.define(') + 8, text.lastIndexOf(')'))); }

async function openEditor(opened, mode = 'design') {
  const page = await context.newPage();
  opened.push(page);
  await page.goto(`${ORIGIN}/admin`);
  const app = await ready(await appFrame(page));
  const shot = (name) => page.screenshot({ path: path.join(SHOTS, name + '.png') });
  if (mode === 'content') {
    await app.click('#modeContentBtn');
    await until(() => app.evaluate(() => !document.getElementById('cmsShell').hidden), 'Content mode never showed its shell');
    return { page, app, shot };
  }
  await app.click('#modeDesignBtn');
  const pv = await previewFrame(app);
  await wait(400);
  return { page, app, pv, shot };
}
/* appFrame() waits for the header markup, which exists before the deferred admin.js has wired
   a single listener -- a click in that window is silently lost. ArkAdminApp is set once every
   listener is attached. */
async function ready(app) { await until(() => app.evaluate(() => !!window.ArkAdminApp), 'admin.js never finished loading'); return app; }
async function connect(app) {
  if (await app.evaluate(() => document.getElementById('connect').disabled)) return;
  await clickHeader(app, 'connect');
  await until(() => app.evaluate(() => document.getElementById('connect').disabled), 'the project folder did not connect');
}
/* Chromium's own Save Page dialog eats a real Ctrl/Cmd+S, so the shortcut is a synthetic keydown on
   whichever document has focus -- the same event the app's listener sees (as in studio-flows). */
const saveShortcut = (target) => target.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true, cancelable: true })));
/* Content mode's own preview (#frame), once it shows `route` */
async function contentPreview(app, route) {
  return until(async () => {
    const handle = await app.$('#frame'); const frame = handle && await handle.contentFrame();
    if (!frame) return null;
    const ok = await frame.evaluate((r) => !!(window.ArkUI && ArkUI.route && (!r || ArkUI.route.path() === r) && document.body && document.body.textContent.length > 200), route);
    return ok && frame;
  }, 'the Content preview never showed ' + route, 15000);
}
const frameText = (frame) => frame.evaluate(() => document.body.textContent.replace(/\s+/g, ' '));
const debug = (...m) => { if (process.env.AUDIT_DEBUG) console.log('     .', ...m); };
/* type a value the way a person does: fill (input events), then leave the field (the browser's
   own change event) -- a synthetic 'change' on top of that committed edits twice */
async function setValue(locator, value) { await locator.fill(value); await locator.evaluate((el) => el.blur()); }
const statusText = (app) => app.evaluate(() => document.getElementById('status').textContent);
/* a save outcome, with what the app itself said when it did not happen */
async function untilSaved(app, probe, message, timeout) {
  try { return await until(probe, message, timeout); }
  catch (error) { throw new StepFailure(message + ' -- status: "' + await statusText(app).catch(() => '?') + '"'); }
}
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

/* ================================================================ CONTENT */
/* The editor input (in #editor) whose current value is visible in the preview -- so an edit to
   it has something real to show, whatever the page's words are today. */
async function visibleField(app, frame) {
  /* an element whose whole text IS the field's value -- a substring match picked a field the
     page no longer renders whose words happened to appear elsewhere */
  const texts = new Set(await frame.evaluate(() => [...document.body.querySelectorAll('h1,h2,h3,h4,p,a,button,span,small,strong,li')].filter((el) => el.getClientRects().length).map((el) => el.textContent.replace(/\s+/g, ' ').trim())));
  const fields = await app.evaluate(() => [...document.querySelectorAll('#editor input[type="text"][id], #editor textarea[id]')].filter((el) => !el.readOnly).map((el) => ({ id: el.id, value: el.value.replace(/\s+/g, ' ').trim() })));
  return fields.find((f) => f.value.length >= 4 && texts.has(f.value));
}

await surface('content', 'pages: edit, preview, Save button, reload, public page', async (opened) => {
  const { page, app, shot } = await openEditor(opened, 'content');
  await connect(app);
  await app.click('#pageList button[data-id="home"]');
  let frame = await contentPreview(app, '/');
  const field = await visibleField(app, frame);
  check(field, 'no Home field is visible in the preview to edit');
  const marker = 'Audit page marker';
  await setValue(app.locator('#' + field.id), marker);
  await until(async () => (await frameText(await contentPreview(app, '/'))).includes(marker), `the preview never showed the edited ${field.id}`, 10000);
  check(await app.locator('#pageList button[data-id="home"] .dot').count() === 1, 'the edited page has no unsaved dot in the sidebar');
  await shot('content-page-edited');
  await app.click('#save');
  await until(() => readSaved('manifests/home.js').includes(marker), 'Save did not write js/content/manifests/home.js');
  await until(async () => (await app.locator('#pageList button[data-id="home"] .dot').count()) === 0, 'the sidebar dot stayed after Save');
  await page.reload();
  const again = await ready(await appFrame(page));
  await again.click('#modeContentBtn'); await again.click('#pageList button[data-id="home"]');
  await until(async () => (await again.locator('#' + field.id).inputValue()) === marker, 'after reload the field lost the saved value');
  const pub = await context.newPage(); opened.push(pub);
  await pub.goto(`${ORIGIN}/`);
  await until(async () => (await frameText(pub.mainFrame())).includes(marker), 'the PUBLIC page does not show the saved text');
});

await surface('content', 'pages: Ctrl/Cmd+S saves', async (opened) => {
  const { app } = await openEditor(opened, 'content');
  await connect(app);
  await app.click('#pageList button[data-id="home"]');
  const frame = await contentPreview(app, '/');
  const field = await visibleField(app, frame);
  check(field, 'no Home field is visible in the preview to edit');
  await setValue(app.locator('#' + field.id), 'Shortcut page marker');
  await saveShortcut(app);
  await until(() => readSaved('manifests/home.js').includes('Shortcut page marker'), 'Ctrl/Cmd+S did not write manifests/home.js');
});

await surface('content', 'pages: create and delete a theory page', async (opened) => {
  const { app } = await openEditor(opened, 'content');
  await connect(app);
  await app.locator('summary', { hasText: 'New theory page' }).click();
  await app.fill('#newId', 'auditpage');
  await app.press('#newId', 'Enter');
  await until(() => app.evaluate(() => /auditpage/i.test(document.querySelector('#editor h1').textContent)), 'the new page did not open in the editor');
  await app.click('#save');
  await until(() => savedExists('manifests/auditpage.js') && readSaved('manifests/index.js').includes('auditpage'), 'Save did not create manifests/auditpage.js and list it in the index');
  dialogPolicy = 'accept';
  await app.locator('#editor button', { hasText: 'Delete this page' }).click();
  await until(() => !savedExists('manifests/auditpage.js') && !readSaved('manifests/index.js').includes('auditpage'), 'Delete did not remove the file and its index entry');
  check(await app.locator('#pageList button[data-id="auditpage"]').count() === 0, 'the deleted page is still in the sidebar');
  /* the Delete takes the page's SEO entry with it, saved copy included: nothing is left unsaved,
     and seo-data.js names no deleted page (regression: tests/delete-prunes-drafts.cjs) */
  check(!(await app.evaluate(() => window.ArkAdminApp.unsaved())), 'after the Delete a draft shows unsaved: ' + await statusText(app));
  check(!readSaved('seo-data.js').includes('"auditpage"'), 'seo-data.js still holds the deleted page\'s entry');
});

await surface('content', 'articles: edit, preview, Save, Ctrl+S, reload', async (opened) => {
  const { page, app } = await openEditor(opened, 'content');
  await connect(app);
  const slug = await until(() => app.evaluate(() => { const b = document.querySelector('#pageList button[data-slug]'); return b && b.dataset.slug; }), 'no article in the sidebar');
  await app.click(`#pageList button[data-slug="${slug}"]`);
  const frame = await contentPreview(app, '/learnings/' + slug);
  const before = await app.locator(`#a-${slug}-title`).inputValue();
  await until(async () => (await frameText(await contentPreview(app, '/learnings/' + slug))).includes(before), `the article preview does not show its own title "${before}"`, 10000);
  await setValue(app.locator(`#a-${slug}-title`), 'Audit article marker');
  await until(async () => (await frameText(await contentPreview(app, '/learnings/' + slug))).includes('Audit article marker'), 'the article preview never showed the edited title', 10000);
  await app.click('#save');
  /* a card field (title/summary) lives in the index; the sections live in the body file */
  await untilSaved(app, () => readSaved('article-index.js').includes('Audit article marker'), 'Save did not write the edited title to article-index.js');
  await setValue(app.locator(`#a-${slug}-summary`), 'Audit summary via shortcut');
  await saveShortcut(app);
  await untilSaved(app, () => readSaved('article-index.js').includes('Audit summary via shortcut'), 'Ctrl/Cmd+S did not write the article summary');
  await page.reload();
  const again = await ready(await appFrame(page));
  await again.click('#modeContentBtn'); await again.click(`#pageList button[data-slug="${slug}"]`);
  await until(async () => (await again.locator(`#a-${slug}-title`).inputValue()) === 'Audit article marker', 'after reload the article lost its saved title');
});

await surface('content', 'articles: create and delete', async (opened) => {
  const { app } = await openEditor(opened, 'content');
  await connect(app);
  await app.locator('summary', { hasText: 'New article' }).click(); debug('new article form');
  await app.fill('#newSlug', 'audit-note');
  await app.press('#newSlug', 'Enter'); debug('submitted');
  await until(() => app.evaluate(() => !!document.querySelector('#a-audit-note-title')), 'the new article did not open in the editor');
  /* the first Save is refused, and the refusal names every editorial field it needs
     (LearningContent.problems) -- that is the contract, so this fills exactly those */
  debug('first save'); await app.click('#save');
  await until(async () => /relevance is required/.test(await statusText(app)) && /reviewed needs a valid YYYY-MM-DD date/.test(await statusText(app)), 'saving a blank new article was not refused with the fields it needs: ' + await statusText(app));
  check(!savedExists('articles/audit-note.js'), 'a refused article was written anyway');
  await setValue(app.locator('#a-audit-note-relevance'), 'Why the audit needs this note.');
  await setValue(app.locator('#a-audit-note-reviewed'), '2026-10-18');
  await setValue(app.locator('#a-audit-note-evidenceLabel'), 'Audit evidence');
  await app.locator('#lp-type-a-audit-note-evidenceHref').selectOption('doc');
  await app.locator('#lp-value-a-audit-note-evidenceHref').selectOption({ index: 1 });
  await app.locator('#lp-value-a-audit-note-relatedPage').selectOption({ index: 1 });
  await setValue(app.locator('#a-audit-note-actionLabel'), 'Read on');
  await app.locator('#lp-value-a-audit-note-actionPage').selectOption({ index: 1 });
  await app.click('#save');
  await untilSaved(app, () => savedExists('articles/audit-note.js') && readSaved('article-index.js').includes('audit-note'), 'Save did not create articles/audit-note.js and index it');
  await until(async () => (await frameText(await contentPreview(app, '/learnings/audit-note'))).includes('New note'), 'the saved new article does not render in the preview', 15000);
  dialogPolicy = 'accept';
  await app.locator('#editor button', { hasText: 'Delete this article' }).click();
  await until(() => !savedExists('articles/audit-note.js') && !readSaved('article-index.js').includes('audit-note'), 'Delete did not remove the article file and its index entry');
  check(!(await app.evaluate(() => window.ArkAdminApp.unsaved())), 'after the article Delete a draft shows unsaved: ' + await statusText(app));
  check(!readSaved('seo-data.js').includes('"audit-note"'), 'seo-data.js still holds the deleted article\'s entry');
});

await surface('content', 'images: label, replace file, preview, Save, reload', async (opened) => {
  const { page, app } = await openEditor(opened, 'content');
  await connect(app);
  const id = await until(() => app.evaluate(() => { const b = document.querySelector('#pageList button[data-asset]'); return b && b.dataset.asset; }), 'no image in the sidebar');
  await app.click(`#pageList button[data-asset="${id}"]`);
  await setValue(app.locator(`#as-${id}-label`), 'Audit image label');
  await app.locator('#editor input[type="file"]').setInputFiles({ name: 'dot.png', mimeType: 'image/png', buffer: PNG_1PX });
  await until(() => app.evaluate(() => (document.querySelector('#editor img.asset-preview') || {}).src.startsWith('data:image/png;base64,iVBOR')), 'the editor preview did not show the replacement image');
  await app.click('#save');
  await until(() => { const t = readSaved(`assets/${id}.js`); return t.includes('Audit image label') && t.includes('image/png'); }, `Save did not write the new label and image to assets/${id}.js`);
  await page.reload();
  const again = await ready(await appFrame(page));
  await again.click('#modeContentBtn'); await again.click(`#pageList button[data-asset="${id}"]`);
  await until(async () => (await again.locator(`#as-${id}-label`).inputValue()) === 'Audit image label', 'after reload the image lost its saved label');
});

await surface('content', 'images: create and delete', async (opened) => {
  const { app } = await openEditor(opened, 'content');
  await connect(app);
  await app.locator('summary', { hasText: 'New image' }).click();
  await app.locator('#newAssetFile').setInputFiles({ name: 'Audit Dot.png', mimeType: 'image/png', buffer: PNG_1PX });
  await until(() => app.evaluate(() => !document.getElementById('newAssetPreview').hidden && document.getElementById('newAssetId').value === 'audit-dot'), 'choosing a file did not preview it and fill the name');
  await app.press('#newAssetId', 'Enter');
  await until(() => app.evaluate(() => !!document.querySelector('#as-audit-dot-label')), 'the new image did not open in the editor');
  await app.click('#save');
  await until(() => savedExists('assets/audit-dot.js') && readSaved('assets/index.js').includes('audit-dot'), 'Save did not create assets/audit-dot.js and index it');
  dialogPolicy = 'accept';
  await app.locator('#editor button', { hasText: 'Delete this image' }).click();
  await until(() => !savedExists('assets/audit-dot.js') && !readSaved('assets/index.js').includes('audit-dot'), 'Delete did not remove the image file and its index entry');
});

await surface('content', 'encrypted: create, encrypt, Save, reload, decrypt, delete', async (opened) => {
  const { page, app } = await openEditor(opened, 'content');
  await connect(app);
  await app.locator('summary', { hasText: 'New encrypted content' }).click();
  await app.fill('#newSecretId', 'audit-secret');
  await app.press('#newSecretId', 'Enter');
  await until(() => app.evaluate(() => !!document.querySelector('#sec-audit-secret-label')), 'the new encrypted item did not open in the editor');
  await setValue(app.locator('#sec-audit-secret-label'), 'Audit secret label');
  await app.locator('#editor button', { hasText: 'Add my own key' }).click();
  await setValue(app.locator('#editor textarea[placeholder="The content to encrypt"]'), 'the audit plaintext');
  await app.locator('#editor button', { hasText: 'Encrypt & lock' }).click();
  await until(async () => /Encrypted for 1 recipient/.test(await statusText(app)), 'Encrypt & lock did not report encrypting for 1 recipient: ' + await statusText(app));
  await app.click('#save');
  await until(() => savedExists('secrets/audit-secret.js') && readSaved('secrets/index.js').includes('audit-secret') && /ciphertextBase64":\s*"[A-Za-z0-9+/]{16}/.test(readSaved('secrets/audit-secret.js')) && !readSaved('secrets/audit-secret.js').includes('the audit plaintext'), 'Save did not write ciphertext (and only ciphertext) to secrets/audit-secret.js');
  await page.reload();
  const again = await ready(await appFrame(page));
  await again.click('#modeContentBtn'); await again.click('#pageList button[data-secret="audit-secret"]');
  await again.locator('#editor button', { hasText: 'Decrypt to check' }).click();
  await until(() => again.evaluate(() => [...document.querySelectorAll('#editor textarea[readonly]')].some((t) => t.value === 'the audit plaintext')), 'after reload, Decrypt to check did not recover the plaintext');
  await connect(again);
  dialogPolicy = 'accept';
  await again.locator('#editor button', { hasText: 'Delete this item' }).click();
  await until(() => !savedExists('secrets/audit-secret.js'), 'Delete did not remove secrets/audit-secret.js');
});

await surface('content', 'shapes: tuning reaches the preview, inline Save writes it', async (opened) => {
  const { app } = await openEditor(opened, 'content');
  await connect(app);
  const id = await until(() => app.evaluate(() => { const b = document.querySelector('#pageList button[data-shape]'); return b && b.dataset.shape; }), 'no shape page in the sidebar');
  await app.click(`#pageList button[data-shape="${id}"]`);
  const frame = await until(async () => { const h = await app.$('#frame'); const f = h && await h.contentFrame(); return f && !(await app.evaluate(() => document.getElementById('frame').hidden)) && f; }, 'the shape page has no preview');
  await wait(1500);
  await frame.evaluate(() => { window.__meshMsgs = []; window.addEventListener('message', (e) => { if (e.data && e.data.type === 'flux-chain-preview-mesh') window.__meshMsgs.push(e.data.settings); }); });
  const range = app.locator('#editor input[type="range"][id^="relief-"]').first();
  const key = (await range.getAttribute('id')).slice('relief-'.length);
  const next = await range.evaluate((el) => { const v = Number(el.min) + (Number(el.max) - Number(el.min)) / 3; el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); return Number(el.value); });
  await until(() => frame.evaluate(([k, v]) => window.__meshMsgs.some((s) => s.tuning && s.tuning[k] === v), [key, next]), `the preview never received tuning ${key} = ${next}`);
  /* the panel has no Save of its own any more: the header's one Save writes the tuning too */
  await app.click('#save');
  await until(() => savedJson('mesh-settings-data.js').tuning[key] === next, `Save did not write tuning ${key} = ${next}`);
});

await surface('content', 'mesh: status view opens and refreshes', async (opened) => {
  const { app } = await openEditor(opened, 'content');
  await app.click('#meshNav');
  await until(() => app.evaluate(() => document.querySelector('#editor h1') && document.querySelector('#editor h1').textContent === 'Mesh'), 'Mesh did not open its status view');
  await until(() => app.evaluate(() => !/Checking/.test(document.querySelector('#editor .mesh-rows').textContent)), 'the mesh status never finished checking');
  check(await app.evaluate(() => document.getElementById('modeContentBtn').getAttribute('aria-selected') === 'true'), 'opening Mesh changed the mode');
});

/* ================================================================ DESIGN */
const toolbar = (app) => app.locator('#selToolbar');
/* select any annotated element by its stable key -- the same message the Layers rows and the
   Design check's "Show" send (postCmsSelectKey), so it reaches elements a click cannot pick
   cleanly (an <h1> made of <span>s, a background <canvas>) */
const selectKey = (app, key) => app.evaluate((k) => document.getElementById('cmsPreview').contentWindow.postMessage({ type: 'defxn-cms-preview-select-group', key: k }, location.origin), key);
/* EVERY assumption about the toolbar's shell (an icon bar whose sections open one at a time in
   the popover #selToolbarPop) lives in ./harness.mjs (toolbarKey, toolbarSections,
   openToolbarSection, toolbarAction) -- the surfaces below only name a section or an action and
   act on the controls inside it, so a new shell changes only that block. */
const byKey = (frame, key, read) => frame.evaluate(([k, r]) => { const el = [...document.querySelectorAll('[data-ark-layout-key]')].find((e) => e.getAttribute('data-ark-layout-key') === k); return el ? new Function('el', 'return ' + r)(el) : undefined; }, [key, read]);
async function saveCanvas(app) { await connect(app); await app.click('#save'); }
async function gotoRoute(app, pv, route) {
  await app.click('#tabPages');
  await app.locator('#pages li').filter({ has: app.locator('.sub', { hasText: new RegExp('^' + route.replace(/[/]/g, '\\/') + '$') }) }).first().click();
  await until(() => pv.evaluate((r) => ArkUI.route.path() === r && !!document.querySelector('[data-ark-layout-key]'), route), 'the preview did not open ' + route);
  await wait(500);
}
const navLink = (frame, text) => frame.locator('header nav.header-core-links > a', { hasText: text }).first();
/* Playwright cannot see that the editor's toolbar covers a point in the preview, so a right-click
   menu item is clicked only once the editor confirms nothing of its own is on top (studio-flows) */
async function clickMenuItem(page, app, pv, label) {
  await pv.locator('.ark-studio-menu').waitFor({ state: 'visible' });
  const item = pv.locator('.ark-studio-menu button', { hasText: label }).first();
  check(await item.isEnabled(), `"${label}" is disabled: ${await item.textContent()}`);
  const box = await item.boundingBox(), appBox = await (await page.$('#app')).boundingBox();
  const at = { x: box.x + box.width / 2 - appBox.x, y: box.y + box.height / 2 - appBox.y };
  await until(() => app.evaluate(({ x, y }) => { const el = document.elementFromPoint(x, y); return el && el.id === 'cmsPreview'; }, at), `"${label}" is covered by the editor`, 2000);
  await item.click();
}

await surface('design', 'canvas: real routes, Pages tab and page switcher change the route', async (opened) => {
  const { app, pv, shot } = await openEditor(opened);
  check(/Desktop · 1280 px/.test(await app.locator('#devName').textContent()), 'the canvas does not say it shows the desktop width');
  await app.click('#tabPages');
  /* the list paints on the next animation frame after the tab opens */
  const rows = await until(async () => { const n = await app.locator('#pages li').count(); return n >= 20 && n; }, `the Pages tab lists ${await app.locator('#pages li').count()} routes`);
  await gotoRoute(app, pv, '/download');
  check(/\/download/.test(await app.locator('#btnPage').textContent()), 'the page switcher does not name the open route');
  await app.click('#btnPage');
  const pop = app.locator('.pop .menu');
  await until(async () => (await pop.locator('button').count()) >= rows, 'the page switcher does not list every route');
  await pop.locator('button', { hasText: '/chain' }).first().click();
  await until(() => pv.evaluate(() => ArkUI.route.path() === '/chain'), 'choosing /chain in the page switcher did not open it');
  await shot('design-canvas');
});

await surface('design', 'theme & defaults: a colour reaches the preview, Save, reload', async (opened) => {
  const { page, app } = await openEditor(opened);
  await connect(app);
  await app.click('#designThemeBtn');
  const swatch = app.locator('.theme-fields input[type="color"]').first();
  await until(async () => (await swatch.count()) > 0, 'Theme & defaults shows no colour fields');
  const id = await swatch.getAttribute('id'), key = id.split('-').slice(2).join('-');
  await swatch.fill('#12ab34');
  const hsl = (await app.locator(`#${id} + output`).textContent()).trim();
  check(/^\d+ \d+% \d+%$/.test(hsl), 'the colour field does not show the HSL it stores: ' + hsl);
  const frame = await contentPreview(app, '/');
  await until(() => frame.evaluate((k) => getComputedStyle(document.documentElement).getPropertyValue('--' + k).trim(), key).then((v) => v === hsl), `the preview's --${key} never became ${hsl}`);
  await app.click('#save');
  await untilSaved(app, () => readSaved('theme-data.js').includes(hsl), 'Save did not write the colour to theme-data.js');
  await page.reload();
  const again = await ready(await appFrame(page));
  await again.click('#modeDesignBtn'); await again.click('#designThemeBtn');
  await until(async () => ((await again.locator(`#${id} + output`).textContent()) || '').trim() === hsl, 'after reload the colour is not the saved one');
});

await surface('design', 'theme & defaults: settings-gear default reaches the preview, Save', async (opened) => {
  const { app } = await openEditor(opened);
  await connect(app);
  await app.click('#designThemeBtn');
  const motif = app.locator('#defaults-motif');
  await until(async () => (await motif.count()) > 0, 'Theme & defaults has no default-pattern control');
  const options = await motif.locator('option').evaluateAll((os) => os.map((o) => o.value));
  const next = options.find((o) => o !== '') && options[(options.indexOf(await motif.inputValue()) + 1) % options.length];
  await motif.selectOption(next);
  await untilSaved(app, async () => { const f = await contentPreview(app, '/'); return f.evaluate((m) => document.documentElement.dataset.motif === m || localStorage.getItem('defxn-motif-v1') === m || JSON.stringify(window.ArkSiteDefaults ? ArkSiteDefaults.get() : {}).includes('"motif":"' + m + '"'), next); }, `the preview never took the default pattern "${next}"`, 15000);
  await app.click('#save');
  await untilSaved(app, () => savedJson('settings-defaults-data.js').motif === next, 'Save did not write the default pattern to settings-defaults-data.js');
});

await surface('design', 'sitemap: every route, zoom, focus, Open', async (opened) => {
  const { app, pv, shot } = await openEditor(opened);
  await designView(app, 'map');
  await until(() => app.evaluate(() => !document.getElementById('mapView').hidden && document.querySelectorAll('#mapView .smcard').length > 20), 'the sitemap did not draw its page cards');
  const pct = () => app.locator('#mapView .smzoom-pct').textContent();
  await app.click('#mapView .smzoomctl button[aria-label="Zoom in"]');
  await until(async () => (await pct()) === '120%', 'Zoom in did not zoom to 120%');
  check(await app.evaluate(() => /scale\(1\.2/.test(document.querySelector('#mapView .smcanvas').style.transform)), 'the zoom label changed but the map did not scale');
  await app.click('#mapView .smzoomctl button[aria-label="Zoom out"]');
  await app.click('#mapView .smzoomctl button[aria-label="Zoom out"]');
  await until(async () => (await pct()) === '80%', 'Zoom out did not zoom to 80%');
  await app.click('#mapView .smzoom-pct');
  await until(async () => (await pct()) === '100%', 'the zoom label did not reset to 100%');
  const card = app.locator('#mapView .smcard', { has: app.locator('code', { hasText: /^\/download$/ }) }).first();
  await card.click();
  check((await card.getAttribute('aria-pressed')) === 'true', 'clicking a card does not focus it');
  await shot('design-sitemap');
  await card.locator('button.open').click();
  await until(() => app.evaluate(() => document.getElementById('mapView').hidden && !document.getElementById('designView').hidden), 'Open did not return to the canvas');
  await until(() => pv.evaluate(() => ArkUI.route.path() === '/download'), 'Open did not open the page it names');
});

await surface('design', 'background: transition edits reach the preview, Save, reload', async (opened) => {
  const { page, app, pv } = await openEditor(opened);
  const pop = await openBackground(app);
  await setValue(pop.locator('input[aria-label="Fade in (ms)"]'), '510');
  await until(() => pv.evaluate(() => ArkCanvasTransitions.get().inDuration === 510), 'the preview did not take Fade in = 510');
  await saveCanvas(app);
  await untilSaved(app, () => savedJson('canvas-transitions-data.js').inDuration === 510, 'Save did not write canvas-transitions-data.js');
  await page.reload();
  const again = await ready(await appFrame(page)); await again.click('#modeDesignBtn');
  const pv2 = await previewFrame(again);
  check(await pv2.evaluate(() => ArkCanvasTransitions.get().inDuration === 510), 'after reload the transition is not the saved one');
});

await surface('design', 'design check: lists every rule, Show selects, Open SEO opens the page SEO', async (opened) => {
  const { app, shot } = await openEditor(opened);
  await wait(800);
  await app.click('#btnCheck');
  const items = app.locator('.pop ul.checks > li');
  await until(async () => (await items.count()) >= 13, 'the design check lists fewer than 13 rules');
  const badge = (await app.locator('#scoreBadge').textContent()).trim();
  check(/^\d+\/\d+$/.test(badge), 'the score badge is not passes/measured: ' + badge);
  await shot('design-check');
  const show = app.locator('.pop ul.checks .acts button', { hasText: 'Show' }).first();
  if (await show.count()) {
    await show.click();
    await until(async () => !!(await toolbarKey(app)), 'Show did not select the offending element');
  }
  await app.click('#btnCheck');
  const seo = app.locator('.pop ul.checks .acts button', { hasText: 'Open SEO' }).first();
  if (await seo.count()) {
    await seo.click();
    await until(() => app.evaluate(() => document.getElementById('btnPageSeo').getAttribute('aria-expanded') === 'true' && !!document.querySelector('#studioRoot > .pop.seo-pop [data-seo-field="title"]')), 'Open SEO did not open this page\'s SEO popover');
  }
});

/* ================================================================ TOOLBAR TAXONOMY */
const TEXT = ['Typography', 'Fill and border', 'Spacing', 'Frame', 'In / out animation'];
const CONTAINER = ['Layout', 'Fill and border', 'Spacing', 'Frame', 'Size', 'Effects', 'In / out animation'];
const IMAGE = ['Frame', 'Fill and border', 'Alt text', 'In / out animation'];
async function expectSections(app, expected, what) {
  const got = await until(async () => { const s = await toolbarSections(app); return s.length && s; }, `the toolbar did not open for ${what}`);
  check(JSON.stringify(got) === JSON.stringify(expected), `${what}: toolbar shows [${got.join(', ')}], expected [${expected.join(', ')}]`);
}
/* one control, its effect on the preview, Save, and the value after a reload */
async function controlPersists(opened, { route, key, select, sectionTitle, act, read, expect, saved }) {
  const { page, app, pv } = await openEditor(opened);
  if (route !== '/') await gotoRoute(app, pv, route);
  await (select ? select(app, pv) : selectKey(app, key));
  await until(async () => (await toolbarKey(app)) === key, `the toolbar is not editing ${key} (it shows ${await toolbarKey(app)})`);
  await act(await openToolbarSection(app, sectionTitle), app, pv);
  await until(async () => (await byKey(pv, key, read)) === expect, `${sectionTitle}: the preview's ${read} for ${key} never became ${JSON.stringify(expect)} (is ${JSON.stringify(await byKey(pv, key, read))})`);
  await saveCanvas(app);
  await untilSaved(app, () => saved(savedJson('layout-data.js')), `${sectionTitle}: Save did not write ${key} to layout-data.js`);
  await page.reload();
  const again = await ready(await appFrame(page)); await again.click('#modeDesignBtn');
  const pv2 = await previewFrame(again);
  if (route !== '/') await gotoRoute(again, pv2, route);
  await until(async () => (await byKey(pv2, key, read)) === expect, `${sectionTitle}: after reload the preview lost ${read} = ${JSON.stringify(expect)}`);
  return { app, pv, again, pv2 };
}
const entry = (layout, route, key) => (layout.routes[route] || {})[key] || {};

await surface('toolbar', 'heading <h1>: text sections; Typography Align persists', async (opened) => {
  const KEY = 'id:hl-title';
  await controlPersists(opened, { route: '/', key: KEY, sectionTitle: 'Typography',
    select: async (app) => { await selectKey(app, KEY); await expectSections(app, TEXT, 'an <h1>'); },
    act: (s) => s.locator('.row', { hasText: 'Align' }).locator('button', { hasText: 'Center' }).click(),
    read: 'el.style.textAlign', expect: 'center', saved: (l) => entry(l, '/', KEY).desktop && entry(l, '/', KEY).desktop.ta === 'center' });
});

await surface('toolbar', 'paragraph <p> (real click): text sections; Fill radius persists', async (opened) => {
  let key;
  const { page, app, pv } = await openEditor(opened);
  await pv.locator('p', { hasText: 'Your own history' }).first().click();
  key = await until(() => toolbarKey(app), 'clicking the paragraph opened no toolbar');
  check(/\/p:\d+$/.test(key), 'a click on the paragraph selected ' + key);
  await expectSections(app, TEXT, 'a <p>');
  await page.close(); opened.pop();
  await controlPersists(opened, { route: '/', key, sectionTitle: 'Fill and border',
    act: (s) => s.locator('.row', { hasText: 'Radius' }).locator('button', { hasText: 'Card' }).click(),
    read: 'el.style.borderRadius', expect: 'var(--size-card-radius)', saved: (l) => entry(l, '/', key).desktop && entry(l, '/', key).desktop.radius === 'card' });
});

await surface('toolbar', 'link <a> (real click): text sections; Spacing padding persists', async (opened) => {
  const KEY = 'path:div:1/header:1/nav:1/a:1';   /* the header's Overview link */
  await controlPersists(opened, { route: '/', key: KEY, sectionTitle: 'Spacing',
    select: async (app, pv) => { await navLink(pv, 'Overview').click(); await until(async () => (await toolbarKey(app)) === KEY, 'clicking the Overview link selected ' + await toolbarKey(app)); await expectSections(app, TEXT, 'an <a>'); },
    act: async (s) => { const t = s.locator('.boxm input.t'); await t.fill('12'); await t.evaluate((i) => i.dispatchEvent(new Event('change'))); },
    read: 'el.style.paddingTop', expect: '12px', saved: (l) => entry(l, '/', KEY).desktop && entry(l, '/', KEY).desktop.pt === 12 });
});

await surface('toolbar', 'button <button> (real click): text sections; Frame rotation persists', async (opened) => {
  const KEY = 'id:products-trigger';
  await controlPersists(opened, { route: '/', key: KEY, sectionTitle: 'Frame',
    /* a click on the button lands on its label <span> (the innermost layer); the button itself is
       reached the way Layers reaches it */
    select: async (app) => { await selectKey(app, KEY); await expectSections(app, TEXT, 'a <button>'); },
    act: (s) => setValue(s.locator('input[aria-label="Rotation"]'), '5'),
    read: 'el.style.rotate', expect: '5deg', saved: (l) => entry(l, '/', KEY).desktop && entry(l, '/', KEY).desktop.rotation === 5 });
});

await surface('toolbar', 'container <section>: container sections; Layout, Size and Effects persist', async (opened) => {
  const { page, app, pv } = await openEditor(opened);
  const KEY = await pv.evaluate(() => [...document.querySelectorAll('section[data-ark-layout-key]')].find((s) => s.getBoundingClientRect().height > 80).getAttribute('data-ark-layout-key'));
  await page.close(); opened.pop();
  const { again } = await controlPersists(opened, { route: '/', key: KEY, sectionTitle: 'Effects',
    select: async (app) => { await selectKey(app, KEY); await expectSections(app, CONTAINER, 'a <section>'); },
    act: (s) => s.locator('.row', { hasText: 'Opacity' }).locator('button', { hasText: '60%' }).click(),
    read: 'el.style.opacity', expect: '0.6', saved: (l) => entry(l, '/', KEY).desktop && entry(l, '/', KEY).desktop.op === 60 });
  const pv2 = await previewFrame(again);
  await selectKey(again, KEY);
  await (await openToolbarSection(again, 'Layout')).locator('.row', { hasText: 'Display' }).locator('button', { hasText: 'Row' }).click();
  await until(async () => (await byKey(pv2, KEY, 'el.style.flexDirection')) === 'row', 'Layout Display = Row did not reach the preview');
  await setValue((await openToolbarSection(again, 'Size')).locator('input[aria-label="Max width"]'), '900');
  await until(async () => (await byKey(pv2, KEY, 'el.style.maxWidth')) === '900px', 'Size Max width did not reach the preview');
  await saveCanvas(again);
  await untilSaved(again, () => { const d = entry(savedJson('layout-data.js'), '/', KEY).desktop || {}; return d.display === 'row' && d.maxw === 900 && d.op === 60; }, 'Save did not write Display/Max width with the earlier opacity');
});

await surface('toolbar', 'image <svg>: image sections; Alt text persists', async (opened) => {
  const { page, app, pv } = await openEditor(opened);
  const KEY = await pv.evaluate(() => [...document.querySelectorAll('svg[data-ark-layout-key]')].find((s) => s.getBoundingClientRect().width > 8 && !s.closest('button,a')).getAttribute('data-ark-layout-key'));
  await page.close(); opened.pop();
  await controlPersists(opened, { route: '/', key: KEY, sectionTitle: 'Alt text',
    select: async (app) => { await selectKey(app, KEY); await expectSections(app, IMAGE, 'an <svg>'); },
    act: (s) => setValue(s.locator('textarea[name="alt-text"]'), 'Audit diagram'),
    read: 'el.getAttribute("aria-label")', expect: 'Audit diagram', saved: (l) => JSON.stringify(l).includes('Audit diagram') });
});

await surface('toolbar', 'canvas element <canvas>: image sections; Frame scale persists', async (opened) => {
  const KEY = 'path:div:1/div:1/canvas:1';
  await controlPersists(opened, { route: '/', key: KEY, sectionTitle: 'Frame',
    select: async (app) => { await selectKey(app, KEY); await expectSections(app, IMAGE, 'a <canvas>'); },
    act: (s) => setValue(s.locator('input[aria-label="Scale X"]'), '1.1'),
    read: 'el.style.scale', expect: '1.1 1', saved: (l) => entry(l, '/', KEY).desktop && entry(l, '/', KEY).desktop.scaleX === 1.1 });
});

await surface('toolbar', 'layout group: Frame + Ungroup only; group X persists; Ungroup removes it', async (opened) => {
  const { page, app, pv, shot } = await openEditor(opened);
  await navLink(pv, 'Overview').click();
  await navLink(pv, 'How it works').click({ modifiers: ['Shift'] });
  await (await openToolbarSection(app, 'Frame')).locator('button', { hasText: 'Group selection' }).click();
  const key = await until(async () => { const k = await toolbarKey(app); return k && k.startsWith('group:') && k; }, 'Group selection did not select a new group');
  await expectSections(app, ['Frame'], 'a layout group');
  /* grouping must not rearrange what it groups: two links of a header row stay side by side */
  const boxes = await pv.evaluate(() => ['Overview', 'How it works'].map((t) => { const a = [...document.querySelectorAll('header nav.header-core-links a')].find((x) => x.textContent.includes(t)); const r = a.getBoundingClientRect(); return { top: Math.round(r.top), left: Math.round(r.left), w: r.width }; }));
  check(boxes.every((b) => b.w > 0) && Math.abs(boxes[0].top - boxes[1].top) < 2 && boxes[0].left < boxes[1].left, 'grouping rearranged the two header links: ' + JSON.stringify(boxes));
  check(await toolbarAction(app, 'Ungroup').count() === 1, 'a group\'s toolbar has no Ungroup');
  check(await app.evaluate(() => /Groups on this page \(1\)/.test(document.getElementById('groupsBrowse').textContent)), 'the Layers tab does not list the new group');
  const wrapper = () => pv.evaluate((id) => { const g = document.querySelector('[data-ark-layout-group="' + id + '"]'); return g ? g.style.translate : null; }, key.slice(6));
  await setValue((await openToolbarSection(app, 'Frame')).locator('input[aria-label="X"]'), '30');
  await until(async () => /^30px/.test(await wrapper() || ''), 'the group\'s X did not move its wrapper');
  await shot('toolbar-group');
  await saveCanvas(app);
  await untilSaved(app, () => JSON.stringify(savedJson('layout-data.js').groups || {}).includes(key.slice(6)), 'Save did not write the group');
  await page.reload();
  const again = await ready(await appFrame(page)); await again.click('#modeDesignBtn');
  const pv2 = await previewFrame(again);
  await until(() => pv2.evaluate((id) => !!document.querySelector('[data-ark-layout-group="' + id + '"]'), key.slice(6)), 'after reload the group is gone');
  await selectKey(again, key);
  await toolbarAction(again, 'Ungroup').click();
  await until(() => pv2.evaluate((id) => !document.querySelector('[data-ark-layout-group="' + id + '"]'), key.slice(6)), 'Ungroup left the wrapper on the page');
});

await surface('toolbar', 'component instance: base sections + Component instance; override persists', async (opened) => {
  const { page, app, pv } = await openEditor(opened);
  await gotoRoute(app, pv, '/download');
  await app.click('#tabLib');
  await app.locator('#libPane select.ctl').first().selectOption('RBLOCK_TEXT_V1');
  await app.locator('#libPane input[data-prop="heading"]').fill('Audit block');
  await app.locator('#libPane button', { hasText: 'Create block' }).click();
  const row = app.locator('#libPane .myrow', { hasText: 'Text block' }).first();
  await until(async () => (await row.count()) > 0, 'Create block did not list the new block');
  const insert = row.locator('button', { hasText: 'Insert' });
  await until(() => insert.isEnabled(), 'the new block cannot be inserted on /download: ' + await insert.getAttribute('title').catch(() => ''));
  await insert.click();
  const point = app.locator('#libPane .lib-point').first();
  if (await point.count()) await point.click();
  await until(() => pv.evaluate(() => !!document.querySelector('[data-ark-component-key]')), 'Insert put no instance on the page');
  await pv.locator('[data-ark-component-key]').first().click();
  const sections = await until(async () => { const s = await toolbarSections(app); return s.includes('Component instance') && s; }, 'the instance\'s toolbar has no Component instance section');
  const base = sections.filter((s) => s !== 'Component instance');
  check([TEXT, CONTAINER, IMAGE].some((t) => JSON.stringify(t) === JSON.stringify(base)), 'the instance\'s other sections are not one taxonomy: ' + sections.join(', '));
  const heading = (await openToolbarSection(app, 'Component instance')).locator('input[aria-label="heading"]');
  await setValue(heading, 'Audit override');
  await until(() => pv.evaluate(() => document.querySelector('[data-ark-component-key]').textContent.includes('Audit override')), 'the override did not reach the preview');
  await saveCanvas(app);
  await untilSaved(app, () => readSaved('components-data.js').includes('Audit override'), 'Save did not write the override');
  await page.reload();
  const again = await ready(await appFrame(page)); await again.click('#modeDesignBtn');
  const pv2 = await previewFrame(again);
  await gotoRoute(again, pv2, '/download');
  await until(() => pv2.evaluate(() => (document.querySelector('[data-ark-component-key]') || {}).textContent.includes('Audit override')), 'after reload the override is gone');
});

await surface('toolbar', 'state group: base sections + States; + Add state persists', async (opened) => {
  const { page, app, pv } = await openEditor(opened);
  await navLink(pv, 'Overview').click();
  await navLink(pv, 'How it works').click({ modifiers: ['Shift'] });
  await navLink(pv, 'Overview').click({ button: 'right' });
  await clickMenuItem(page, app, pv, 'Make into states');
  await until(() => pv.evaluate(() => Object.keys((ArkStates.get().routes || {})['/'] || {}).length === 1), 'Make into states made no group');
  await navLink(pv, 'Overview').click();
  const sections = await until(async () => { const s = await toolbarSections(app); return s.includes('States') && s; }, 'a state-group member has no States section');
  check(JSON.stringify(sections.filter((s) => s !== 'States')) === JSON.stringify(TEXT), 'a state-group link\'s other sections are not the text taxonomy: ' + sections.join(', '));
  await (await openToolbarSection(app, 'States')).locator('button', { hasText: '+ Add state' }).click();
  await until(() => pv.evaluate(() => { const g = Object.values(ArkStates.get().routes['/'])[0]; return g.states.length === 2; }), '+ Add state did not add state 1');
  await saveCanvas(app);
  await untilSaved(app, () => { const g = Object.values((savedJson('states-data.js').routes || {})['/'] || {})[0]; return g && g.states.length === 2; }, 'Save did not write the 2-state group');
});

/* ================================================================ CANVAS */
await surface('canvas', 'undo / redo: buttons and Ctrl+Z / Ctrl+Shift+Z', async (opened) => {
  const { app, pv } = await openEditor(opened);
  const KEY = 'id:hl-title';
  check(await app.locator('#btnUndo').isDisabled(), 'Undo is enabled with nothing to undo');
  await selectKey(app, KEY);
  await setValue((await openToolbarSection(app, 'Frame')).locator('input[aria-label="X"]'), '40');
  await until(async () => /^40px/.test(await byKey(pv, KEY, 'el.style.translate') || ''), 'Frame X did not move the heading');
  await until(() => app.locator('#btnUndo').isEnabled(), 'Undo stayed disabled after an edit');
  await app.click('#btnUndo');
  await until(async () => !/^40px/.test(await byKey(pv, KEY, 'el.style.translate') || ''), 'Undo did not move the heading back');
  await until(() => app.locator('#btnRedo').isEnabled(), 'Redo stayed disabled after an undo');
  await app.click('#btnRedo');
  await until(async () => /^40px/.test(await byKey(pv, KEY, 'el.style.translate') || ''), 'Redo did not re-apply the move');
  await app.locator('#tabLayers').focus();
  await app.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true })));
  await until(async () => !/^40px/.test(await byKey(pv, KEY, 'el.style.translate') || ''), 'Ctrl+Z in the editor did not undo');
  await app.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true, bubbles: true })));
  await until(async () => /^40px/.test(await byKey(pv, KEY, 'el.style.translate') || ''), 'Ctrl+Shift+Z in the editor did not redo');
});

await surface('canvas', 'multi-select: shift-click 3, align and distribute act', async (opened) => {
  const { app, pv } = await openEditor(opened);
  await navLink(pv, 'Overview').click();
  await navLink(pv, 'How it works').click({ modifiers: ['Shift'] });
  await navLink(pv, 'Stats').click({ modifiers: ['Shift'] });
  const frame = await openToolbarSection(app, 'Frame');
  for (const label of ['Left', 'Center X', 'Right', 'Top', 'Center Y', 'Bottom', 'Group selection', 'Distribute X', 'Distribute Y']) check(await frame.locator('button', { hasText: new RegExp('^' + label + '$') }).count() === 1, `3 selected layers offer no "${label}"`);
  await frame.locator('button', { hasText: /^Top$/ }).click();
  await until(() => app.locator('#btnUndo').isEnabled(), 'Align Top changed nothing (no undo step)');
  const tops = await pv.evaluate(() => ['Overview', 'How it works', 'Stats'].map((t) => [...document.querySelectorAll('header nav.header-core-links > a')].find((a) => a.textContent.includes(t)).getBoundingClientRect().top));
  check(Math.max(...tops) - Math.min(...tops) < 1.5, 'Align Top did not align the three tops: ' + tops.join(', '));
});

await surface('canvas', 'layers: select, rename, hide/show', async (opened) => {
  const { app, pv } = await openEditor(opened);
  await app.click('#tabLayers');
  await selectKey(app, 'id:hl-title');
  const row = app.locator('#layers li[aria-selected="true"]').first();
  await until(async () => (await row.count()) > 0, 'selecting the heading highlights no Layers row');
  await app.click('#tabPages'); await app.click('#tabLayers');
  const h1row = app.locator('#layers li', { has: app.locator('input.nm-edit') }).filter({ has: app.locator('input[value="h1"]') }).first();
  /* rows are named by their own <input>; find the h1's by its value */
  const index = await app.evaluate(() => [...document.querySelectorAll('#layers li')].findIndex((li) => (li.querySelector('.nm-edit') || {}).value === 'h1'));
  check(index >= 0, 'the Layers tree has no h1 row');
  const target = app.locator('#layers li').nth(index);
  await target.click({ position: { x: 4, y: 8 } });
  await until(async () => (await toolbarKey(app)) === 'id:hl-title', 'clicking the h1 Layers row did not select the heading');
  const name = target.locator('.nm-edit');
  await setValue(name, 'Hero heading');
  await until(() => app.evaluate(() => [...document.querySelectorAll('#layers .nm-edit')].some((i) => i.value === 'Hero heading')), 'the rename did not stick in the Layers tree');
  await target.locator('.eye-toggle').click();
  await until(async () => (await byKey(pv, 'id:hl-title', 'getComputedStyle(el).display')) === 'none', 'the eye did not hide the heading');
  await app.locator('#layers li .eye-toggle[aria-pressed="true"]').first().click();
  await until(async () => (await byKey(pv, 'id:hl-title', 'getComputedStyle(el).display')) !== 'none', 'the eye did not show the heading again');
  await saveCanvas(app);
  await untilSaved(app, () => readSaved('layout-data.js').includes('Hero heading'), 'Save did not write the layer name');
});

await surface('canvas', 'breakpoints: tablet and phone resize the canvas and edit their own frame', async (opened) => {
  const { app, pv } = await openEditor(opened);
  await app.click('#devices button[data-d="1"]');
  await until(async () => /Tablet · 820 px/.test(await app.locator('#devName').textContent()), 'Tablet did not switch the canvas');
  check(await app.evaluate(() => document.getElementById('cmsPreview').style.width === '820px'), 'the preview is not 820px wide on Tablet');
  await until(() => app.evaluate(() => !document.getElementById('bpNote').hidden), 'Tablet does not say it edits tablet overrides');
  const KEY = 'id:hl-title';
  /* the preview re-lays itself out at the new width; a selection sent mid-relayout is re-sent */
  await until(async () => { if ((await toolbarKey(app)) === KEY) return true; await selectKey(app, KEY); await wait(500); return (await toolbarKey(app)) === KEY; }, 'the heading could not be selected on tablet');
  await until(async () => /tablet/i.test(await app.evaluate(() => { const b = document.getElementById('selToolbar'); return b && !b.hidden ? b.textContent : ''; })), 'the toolbar does not say it is editing the tablet frame');
  await setValue((await openToolbarSection(app, 'Frame')).locator('input[aria-label="Y"]'), '24');
  await saveCanvas(app);
  await untilSaved(app, () => { const e = entry(savedJson('layout-data.js'), '/', KEY); return e.tablet && e.tablet.y === 24 && !(e.desktop && e.desktop.y === 24); }, 'a tablet edit was not saved under tablet only');
  await app.click('#devices button[data-d="2"]');
  await until(async () => /Phone · 390 px/.test(await app.locator('#devName').textContent()), 'Phone did not switch the canvas');
  await app.click('#devices button[data-d="0"]');
  await until(async () => /Desktop · 1280 px/.test(await app.locator('#devName').textContent()), 'Desktop did not switch back');
  check(await pv.evaluate(() => innerWidth) >= 1200, 'the preview did not return to desktop width');
});

await surface('canvas', 'edit vs live: Live hides the toolbar and clicks navigate; Edit selects again', async (opened) => {
  const { app, pv } = await openEditor(opened);
  await navLink(pv, 'Overview').click();
  await until(async () => !!(await toolbarKey(app)), 'Edit mode: a click did not select');
  await app.click('#mode button[data-m="live"]');
  await until(() => app.evaluate(() => document.getElementById('selToolbar').hidden), 'Live mode still shows the toolbar');
  await navLink(pv, 'How it works').click();
  await until(() => pv.evaluate(() => ArkUI.route.path() !== '/'), 'Live mode: clicking a link did not navigate like a visitor');
  await app.click('#mode button[data-m="edit"]');
  await until(() => app.evaluate(() => document.querySelector('#mode button[data-m="edit"]').getAttribute('aria-pressed') === 'true'), 'Edit did not switch back');
});

/* ================================================================ SWEEP */
/* Every visible button in a scope is clicked once. It must do SOMETHING observable -- change the
   editor's DOM, send the preview a message, navigate a frame, make a request, open a dialog,
   a page or a download, or write a file -- or be disabled WITH a stated reason (a title, or a
   "(needs ...)" in its label; law: a refusal names what it needs). Runs of look-alike buttons
   (swatches, segmented options, per-row icons) are sampled, three per run. The preview's own
   DOM is not counted: its animations mutate it continuously, and every editor command reaches
   it as a message, which is counted. */
const SKIP = ['#signOut'];   /* drops the session: the rest of the sweep could not run */
async function counters(page, app) {
  let msg = 0;
  for (const f of page.frames()) { if (f === app || f === page.mainFrame()) continue; try { msg += await f.evaluate(() => (window.__audit ? window.__audit.msg : 0)); } catch { /* navigating */ } }
  const mut = await app.evaluate(() => window.__audit ? window.__audit.mut : 0).catch(() => -1);
  /* a field's value is a property, not an attribute: "Show manifest fields" changes only that */
  const values = await app.evaluate(() => [...document.querySelectorAll('input, textarea, select')].map((el) => el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value).join('\u0001').length + ':' + [...document.querySelectorAll('textarea')].map((t) => t.value.slice(0, 200)).join('|')).catch(() => '');
  return { mut, msg, values, nav: navigations, req: requestsSeen, dialogs: dialogsSeen, pages: pagesOpened, downloads, fs: fsEvents, choosers };
}
async function quiet(app) {
  /* wait until the editor's DOM stops changing (a toast fading, a debounced check) */
  let last = -1;
  for (let i = 0; i < 25; i++) { const now = await app.evaluate(() => window.__audit.mut).catch(() => -1); if (now === last) return; last = now; await wait(150); }
}
async function enumerate(app, scope) {
  return app.evaluate((sel) => {
    const roots = [...document.querySelectorAll(sel)];
    const shown = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden' && !el.closest('[hidden]');
    const pathOf = (el) => { if (el.id) return '#' + CSS.escape(el.id); const parts = []; for (let n = el; n && n.nodeType === 1 && n !== document.body; n = n.parentElement) { if (n.id) { parts.unshift('#' + CSS.escape(n.id)); break; } parts.unshift(n.tagName.toLowerCase() + ':nth-child(' + ([...n.parentElement.children].indexOf(n) + 1) + ')'); } return parts.join(' > '); };
    const runs = {}, out = [];
    for (const root of roots) for (const el of root.querySelectorAll('button, [role="button"]')) {
      if (!shown(el)) continue;
      const parent = el.parentElement;
      /* a list of look-alike rows (routes, pages) is one run whatever each row says */
      const run = el.id ? el.id : (parent.className || parent.tagName) + '|' + el.className + '|' + (parent.matches('.swatches,.ctl-seg,.seg,.menu,ul.list') ? '' : el.textContent.trim().slice(0, 40));
      runs[run] = (runs[run] || 0) + 1; if (runs[run] > 3) continue;
      const label = (el.getAttribute('aria-label') || el.textContent || el.title || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 60);
      /* the option already chosen in a segmented control: pressing it again is a no-op by design */
      const chosen = ['aria-pressed', 'aria-selected', 'aria-current'].some((a) => el.getAttribute(a) === 'true') && !!el.closest('.ctl-seg,.seg,[role="tablist"],.menu,.mode-switch,ul.list');
      out.push({ path: pathOf(el), label, chosen, disabled: el.disabled || el.getAttribute('aria-disabled') === 'true', reason: el.title || el.getAttribute('aria-describedby') || (/\((needs|nothing|no )/i.test(el.textContent) ? el.textContent : '') });
    }
    return out;
  }, scope);
}
async function sweep(name, scope, setup) {
  await surface('sweep', name, async (opened) => {
    dialogPolicy = 'dismiss';
    const env = await openEditor(opened);
    await setup(env);
    const controls = await enumerate(env.app, scope);
    if (!controls.length) console.log(`     (no buttons in ${scope})`);
    let deadHere = 0, muteHere = 0;
    for (const c of controls) {
      if (SKIP.includes(c.path)) continue;
      const where = `${name}: "${c.label}"`;
      if (c.disabled) { if (!c.reason) { mute.push({ surface: name, control: c.label }); muteHere += 1; } continue; }
      if (c.chosen) continue;
      await setup(env, true);
      const target = env.app.locator(c.path).first();
      if (!(await target.count()) || !(await target.isVisible().catch(() => false))) continue; /* gone after the setup re-ran */
      if (await target.isDisabled().catch(() => false)) continue;
      await quiet(env.app);
      const before = await counters(env.page, env.app);
      const clicked = await target.click({ timeout: 10000 }).then(() => true, (error) => { unclickable.push({ surface: name, control: c.label, why: error.message.split('\n').filter((l) => /intercepts|outside|not visible|not stable/.test(l)).slice(-1)[0] || error.message.split('\n')[0] }); return false; });
      if (!clicked) continue;
      await wait(700);
      const after = await counters(env.page, env.app);
      const changed = Object.keys(before).filter((k) => after[k] !== before[k]);
      if (!changed.length) { dead.push({ surface: name, control: c.label, path: c.path }); deadHere += 1; }
      await env.app.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))).catch(() => {});
    }
    dialogPolicy = 'accept';
    check(!deadHere && !muteHere, `${deadHere} dead and ${muteHere} unexplained disabled control(s) -- listed below`);
  });
}
const toContent = async ({ app }) => { if (await app.evaluate(() => document.getElementById('cmsShell').hidden)) { await app.click('#modeContentBtn'); await wait(300); } };
const openItem = (sel, tab) => async (env, again) => { await toContent(env); if (!again || !(await env.app.locator(sel + '[aria-current="true"]').count())) { await env.app.click(sel); await wait(600); } if (tab) { const t = env.app.locator('#editor [role="tab"]', { hasText: tab }).first(); if ((await t.getAttribute('aria-selected')) !== 'true') { await t.click(); await wait(200); } } };
/* the structure rail folds away (#btnLeftRail, remembered per browser) -- and the header sweep
   clicks that toggle like every other button, so the canvas is entered with the rail open */
const toCanvas = async ({ app }) => {
  if (await app.evaluate(() => document.getElementById('studioRoot').hidden || document.getElementById('designView').hidden)) { await designView(app, 'canvas'); await wait(600); }
  if (await app.evaluate(() => document.getElementById('shell').classList.contains('rail-closed'))) { await app.click('#btnLeftRail'); await wait(300); }
};
/* sections are opened for the enumeration only: a sweep click may legitimately change what the
   selection is (Make into component replaces it), and the re-run must not fail on that */
const withSelection = (key, sections) => async (env, again) => { await toCanvas(env); if ((await toolbarKey(env.app)) !== key) { await selectKey(env.app, key); await until(async () => (await toolbarKey(env.app)) === key, 'could not select ' + key).catch((e) => { if (!again) throw e; }); } for (const s of sections || []) await openToolbarSection(env.app, s).catch((e) => { if (!again) throw e; }); };

await sweep('app header (Content mode)', '#appBar', toContent);
await sweep('account menu', '#accountMenu', async (env) => { if (await env.app.evaluate(() => document.getElementById('accountMenu').hidden)) { await env.app.click('#accountBtn'); await wait(200); } });
await sweep('page editor: Content tab', '#editor', openItem('#pageList button[data-id="home"]', 'Content'));
await sweep('page editor: Shape tab', '#editor', openItem('#pageList button[data-id="home"]', 'Shape'));
await sweep('page editor: SEO tab', '#editor', openItem('#pageList button[data-id="home"]', 'SEO'));
await sweep('page editor: Code tab', '#editor', openItem('#pageList button[data-id="home"]', 'Code'));
await sweep('content sidebar', '#cmsShell nav.pages', toContent);
await sweep('article editor', '#editor', openItem('#pageList button[data-slug]'));
await sweep('image editor', '#editor', openItem('#pageList button[data-asset]'));
await sweep('shape editor', '#editor', openItem('#pageList button[data-shape]'));
await sweep('encrypted editor', '#editor', async (env, again) => {
  await toContent(env);
  if (again) return;
  await env.app.locator('summary', { hasText: 'New encrypted content' }).click();
  await env.app.fill('#newSecretId', 'sweep-secret'); await env.app.press('#newSecretId', 'Enter'); await wait(500);
});
await sweep('mesh view', '#editor', async (env) => { await toContent(env); if (!(await env.app.evaluate(() => /Mesh/.test((document.querySelector('#editor h1') || {}).textContent || '')))) { await env.app.click('#meshNav'); await wait(600); } });
await sweep('theme & defaults', '#editor', async (env) => { if (!(await env.app.evaluate(() => (document.querySelector('#editor h1') || {}).textContent === 'Theme & defaults' && !document.getElementById('cmsShell').hidden))) { await designView(env.app, 'theme'); await wait(600); } });
/* the one header in Design -> Canvas: the Design views and every canvas-only control */
await sweep('app header (Design -> Canvas)', '#appBar', withSelection('id:hl-title'));
await sweep('canvas left: Layers + groups', '#studioRoot aside.left', withSelection('id:hl-title'));
await sweep('canvas left: Pages', '#pagesPane', async (env) => { await toCanvas(env); await env.app.click('#tabPages'); });
await sweep('canvas left: Library', '#libPane', async (env) => { await toCanvas(env); await env.app.click('#tabLib'); await wait(300); });
/* one sweep per section: the redesigned toolbar shows one section's controls at a time */
for (const sec of TEXT) await sweep('toolbar: heading / ' + sec, '#selToolbar, #selToolbarPop', withSelection('id:hl-title', [sec]));
/* found once per sweep, after the preview has rendered: a sweep click may navigate it away */
const firstSection = async (env) => env.sectionKey || (env.sectionKey = await until(() => env.pv.evaluate(() => { const s = [...document.querySelectorAll('section[data-ark-layout-key]')].find((x) => x.getBoundingClientRect().height > 80); return s && s.getAttribute('data-ark-layout-key'); }), 'the preview has no section to select'));
for (const sec of CONTAINER.filter((x) => !TEXT.includes(x))) await sweep('toolbar: container / ' + sec, '#selToolbar, #selToolbarPop', async (env, again) => withSelection(await firstSection(env), [sec])(env, again));
await sweep('sitemap', '#mapView', async (env) => { if (await env.app.evaluate(() => document.getElementById('studioRoot').hidden || document.getElementById('mapView').hidden)) { await designView(env.app, 'map'); await wait(400); } });
for (const [name, button] of [['popover: Design check', '#btnCheck'], ['popover: page switcher', '#btnPage'], ['popover: page SEO', '#btnPageSeo'], ['popover: Background', '#designBackgroundBtn']]) {
  await sweep(name, '.pop', async (env) => { await toCanvas(env); if (!(await env.app.locator('.pop').count())) { await env.app.click(button, { timeout: 15000 }); await wait(400); } });
}
await sweep('versions panel', '#versionsPanel', async (env) => { await connect(env.app); if (await env.app.evaluate(() => document.getElementById('versionsPanel').hidden)) { await env.app.click('#versionsNav'); await wait(600); } });

/* ================================================================ REPORT (placeholder until the other groups land) */
await browser.close(); server.close();
console.log('\n== matrix');
for (const row of matrix) console.log(`${row.ok ? 'pass' : 'FAIL'}  ${row.group} / ${row.surface}${row.ok ? '' : '\n      ' + row.why}`);
console.log('\n== console / network during the walk');
for (const n of noise) console.log(`${n.surface}: [${n.kind}] ${n.text}`);
console.log('\n== live-data endpoints the local host could not serve (environment, not counted)');
const envSeen = [...new Set(environment.map((e) => `[${e.kind}] ${e.text}`))];
for (const e of envSeen) console.log(e);
console.log('\n== dead controls (clicked; nothing observable happened)');
for (const d of dead) console.log(`${d.surface}: "${d.control}"  (${d.path})`);
console.log('\n== visible and enabled, but a real click cannot reach it');
for (const d of unclickable) console.log(`${d.surface}: "${d.control}" -- ${d.why}`);
console.log('\n== disabled with no stated reason');
for (const d of mute) console.log(`${d.surface}: "${d.control}"`);
console.log(`\nscreenshots: ${SHOTS}\nsite copy: ${WORK}`);
process.exit(matrix.some((r) => !r.ok) || noise.length || dead.length || mute.length || unclickable.length ? 1 : 0);

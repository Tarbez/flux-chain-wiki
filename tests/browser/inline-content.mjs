/* =====================================================================
   REAL-BROWSER FLOW: the Content lens -- edit the site's words on the canvas
   ---------------------------------------------------------------------
   One workspace (2026-10-18): the Content lens edits text where it stands on the one canvas,
   instead of in a second app with its own form and preview. This drives it as a person would and
   asserts on what a visitor gets:
     home      content lens -> click the home H1 -> type -> the draft field changes as you type,
               the toolbar's Content section names the field and shows the value, the Page fields
               sheet shows the same value; Enter commits; Ctrl/Cmd+Z undoes it and redoes it
     escape    typing then Escape FINISHES the edit and keeps the words (it used to put them back
               silently: docs/ux-audit/cms.md P0-2); plain Enter finishes the home heading and the
               intro without a line break; "Revert to saved" in the Content section puts the saved
               words back, with an Undo
     nav       a header link label (Site chrome, NAV.*) edits the same way
     refusal   text no field holds says why, and names the code that writes it
     article   an article's title, on its own route
     save      Save -> the files on disk -> reload the editor (the drafts came from the files) ->
               the public page shows the new words, and so does the server render
   Every step asserts on the payload (the draft value, the saved file, the public DOM, the SSR
   HTML), not on the editor's machinery.

   Run:   node tests/browser/inline-content.mjs [--headed] [--keep]
   Needs: Chromium from `npx playwright install chromium`.
   Screenshots go to $SHOTS (default: a temp folder, printed at the end).
   ===================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { appFrame, SITE, copySite, startHost, fakeFolder, previewFrame, until as untilFor, waitForPreviewReady, previewReadyCount,
  statusCount, waitForSave, gotoEditor, reloadEditor, clickHeader, waitForRouteReady, setLens as setLensButton, sheetBody, closeSheet, openPageFields, closeToolbarSection, openToolbarSection } from './harness.mjs';
import { readIndexHtml, renderDocument, createLocalResources } from '../../api/lib/render-core.mjs';

const args = process.argv.slice(2);
const SHOTS = process.env.SHOTS || fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-inline-'));
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-site-'));
fs.mkdirSync(SHOTS, { recursive: true });

let failures = 0;
class StepFailure extends Error {}
function check(condition, message) { if (!condition) throw new StepFailure(message); }
async function step(name, run) {
  try { await run(); console.log(`ok   ${name}`); }
  catch (error) { failures += 1; console.log(`FAIL ${name}\n     ${error instanceof StepFailure ? error.message : error.stack}`); }
}
const until = (probe, message, timeout = 8000) => untilFor(probe, message, timeout, { interval: 120, fail: (m) => new StepFailure(m), passThrough: (e) => e instanceof StepFailure });

copySite(WORK);
const server = await startHost(WORK);
const ORIGIN = server.origin;
const browser = await chromium.launch({ headless: !args.includes('--headed') });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await fakeFolder(context, WORK);
const errors = [];
const harnessNoise = /could not be cloned/;
context.on('page', (p) => p.on('pageerror', (e) => { if (!harnessNoise.test(e.message)) errors.push(e.message); }));
const MOD = process.platform === 'darwin' ? 'Meta' : 'Control';

async function openEditor(page) {
  const app = await appFrame(page);
  const pv = await previewFrame(app);
  await waitForPreviewReady(app);
  return { app, pv };
}
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, name + '.png') });
/* the lens, once the canvas has received it (the preview's recorder counts what its parent sent) */
async function setLens(app, pv, lens) {
  const sent = () => pv.evaluate(() => (window.__arkSignals.down['defxn-cms-preview-lens'] || { n: 0 }).n);
  const before = await sent();
  const was = await app.getAttribute(lens === 'content' ? '#lensContentBtn' : '#lensDesignBtn', 'aria-pressed');
  await setLensButton(app, lens);
  if (was !== 'true') await until(async () => (await sent()) > before, 'the canvas never received the ' + lens + ' lens');
  await until(() => pv.evaluate((l) => (document.documentElement.getAttribute('data-ark-lens') || 'design') === l, lens), 'the canvas is not in the ' + lens + ' lens');
}
const draft = (app, kind, id, key) => app.evaluate(([kind, id, key]) => {
  const s = window.ArkAdmin.state;
  if (kind === 'page') return s.drafts[id].fields[key].value;
  return s.aDrafts[id][key];
}, [kind, id, key]);
const toolbarContent = (app) => app.evaluate(() => {
  const pop = document.getElementById('selToolbarPop');
  if (!pop || pop.hidden) return null;
  const field = pop.querySelector('.cms-content-field code'), value = pop.querySelector('#cmsContentValue'), refusal = pop.querySelector('.cms-content-refusal');
  return { title: (pop.querySelector('.tb-pop-head span') || {}).textContent || '', field: field ? field.textContent : null, value: value ? value.value : null, refusal: refusal ? refusal.textContent : null, text: pop.textContent };
});
/* click an element in the canvas by a selector evaluated there, at the end of its text */
async function clickText(pv, selector, index = 0) {
  /* the canvas remounts after a committed edit (the editor re-sends the site): an element found
     just before that can be replaced under the click, so a detached target is found again */
  return until(async () => {
    const loc = pv.locator(selector).nth(index);
    try {
      await loc.scrollIntoViewIfNeeded({ timeout: 2000 });
      const box = await loc.boundingBox();
      if (!box) return false;
      await loc.click({ position: { x: Math.max(2, box.width - 4), y: Math.min(box.height - 2, 12) }, timeout: 2000 });
      return loc;
    } catch (error) { if (/not attached|not stable|Timeout/.test(error.message)) return false; throw error; }
  }, 'could not click ' + selector, 10000);
}
const editing = (pv) => pv.evaluate(() => { const el = document.querySelector('[data-ark-inline-editing]'); return el ? el.textContent : null; });
async function typeAtEnd(page, pv, text) {
  await until(() => editing(pv).then((t) => t !== null), 'the clicked text did not become editable');
  await pv.evaluate(() => { const el = document.querySelector('[data-ark-inline-editing]'); const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
  await page.keyboard.type(text, { delay: 20 });
}

const page = await context.newPage();
page.on('dialog', (d) => d.dismiss());
await gotoEditor(page, ORIGIN);
let { app, pv } = await openEditor(page);
const NEW = { title: ' Edited inline.', nav: ' now', article: ' (edited)' };
let original = {};
/* A frame sampler in the canvas: every animation frame, is a page shown at all (a visible
   [data-ark-page] at full opacity), and is the route-change transition running? An edit that
   re-renders the page must never leave a frame without one (the defect: every commit replayed
   the page transition and the canvas went blank). Measured per frame, not by eye. */
const startFrames = (pv) => pv.evaluate(() => {
  /* every painted frame (rAF) and, since a loaded machine throttles frames, every 8 ms as well */
  const s = window.__arkFrames = { frames: 0, blank: 0, running: 0, stop: false };
  const sample = () => {
    s.frames += 1;
    const shown = [...document.querySelectorAll('[data-ark-page]')].some((p) => !p.hidden && p.getClientRects().length && Number(getComputedStyle(p).opacity) > 0.5);
    if (!shown) s.blank += 1;
    if (document.querySelector('[data-transition="running"]')) s.running += 1;
  };
  (function tick() { if (s.stop) return; sample(); requestAnimationFrame(tick); })();
  s.timer = setInterval(sample, 8);
});
const stopFrames = (pv) => pv.evaluate(() => { const s = window.__arkFrames; s.stop = true; clearInterval(s.timer); return { frames: s.frames, blank: s.blank, running: s.running }; });
/* an observation window, not a readiness wait: long enough for a re-send (180 ms coalescing) and
   a remount to have happened if one were going to */
const observe = (ms) => new Promise((r) => setTimeout(r, ms));

await step('connect the project folder', async () => {
  if (!(await app.evaluate(() => document.getElementById('connect').disabled))) {
    await clickHeader(app, 'connect');
    await until(() => app.evaluate(() => document.getElementById('connect').disabled), 'project folder did not connect');
  }
});

await step('home: click the H1, type, and the draft field follows each keystroke', async () => {
  await setLens(app, pv, 'content');
  original.title = await draft(app, 'page', 'home', 'TITLE');
  await clickText(pv, '[data-ark-page] h1');
  await typeAtEnd(page, pv, NEW.title);
  await until(async () => (await draft(app, 'page', 'home', 'TITLE')) === original.title + NEW.title, 'the home TITLE draft never became the typed words');
  check(await app.evaluate(() => window.ArkAdminApp.unsaved()), 'the editor does not report unsaved work after an inline edit');
  await shot(page, 'home-typing');
});

/* The bar beside the words names their field and says how to finish; NO second editor covers
   them (docs/ux-audit/cms.md P1-6: a Content popover with the same words in a textarea opened over
   the heading). The field's key and the textarea are its Details, on demand (next step). */
await step('home: the bar names the field and how to finish; nothing covers the words', async () => {
  const bar = await until(() => app.evaluate(() => { const b = document.getElementById('selToolbar'); const keys = b && !b.hidden && b.querySelector('.cms-content-keys'); return keys && { chip: b.querySelector('.tb-chip-name').textContent, keys: keys.textContent, field: (window.ArkAdmin.state.cmsContent || {}).field, label: (window.ArkAdmin.state.cmsContent || {}).label, pop: !document.getElementById('selToolbarPop').hidden }; }), 'the Content lens bar never named the H1\'s field');
  check(bar.field === 'HOME.TITLE', 'the H1 is bound to ' + bar.field + ', not HOME.TITLE');
  check(bar.chip === bar.label, 'the bar calls the field "' + bar.chip + '", not its name "' + bar.label + '"');
  check(/Enter or Esc to finish/.test(bar.keys), 'the bar says "' + bar.keys + '"');
  check(!bar.pop, 'a popover opened over the words being edited');
  const sections = await app.evaluate(() => [...document.querySelectorAll('#selToolbar:not([hidden]) [data-section]')].map((b) => b.dataset.name));
  check(!sections.includes('Typography') && !sections.includes('More'), 'the Content lens still offers style sections or design commands: ' + sections.join(', '));
  check(await app.evaluate(() => !document.querySelector('#selToolbar [data-action="make-component"]')), 'the Content lens offers Make into component');
});

await step('home: Enter commits in place -- no re-render, no transition, no blank frame', async () => {
  await pv.evaluate(() => { document.querySelector('[data-ark-page] h1').__beforeCommit = true; });
  const readyBefore = await previewReadyCount(app);
  await startFrames(pv);
  await page.keyboard.press(MOD + '+Enter');
  await until(() => editing(pv).then((t) => t === null), 'the edit did not end on Enter');
  await shot(page, 'home-commit-mid');
  await observe(1500);
  const frames = await stopFrames(pv);
  check(frames.frames > 20, 'the sampler took only ' + frames.frames + ' samples');
  check(frames.blank === 0, frames.blank + ' of ' + frames.frames + ' frames showed no page after the commit');
  check(frames.running === 0, 'the route-change transition ran in ' + frames.running + ' frames after the commit');
  check((await previewReadyCount(app)) === readyBefore, 'the commit re-sent the site and the canvas re-rendered');
  check(await pv.evaluate(() => document.querySelector('[data-ark-page] h1').__beforeCommit === true), 'the heading is a new node: the page was rebuilt under the edit');
  check((await draft(app, 'page', 'home', 'TITLE')) === original.title + NEW.title, 'the commit did not keep the typed heading in the draft');
});

await step('home: Details holds the key, the same words in a box, and All fields', async () => {
  const body = await openToolbarSection(app, 'Content');
  const content = await until(async () => { const c = await toolbarContent(app); return c && c.field && c; }, 'the Details popover never drew for the H1');
  check(/HOME\.TITLE/.test(content.field), 'Details names ' + content.field + ', not HOME.TITLE');
  check(await app.evaluate(() => { const r = document.querySelector('#selToolbarPop .cms-content-field code').closest('[role="region"]'); return !!r && r.hidden; }), 'the copy key shows outright instead of under the closed Developer details');
  check(content.value === original.title + NEW.title, 'Details shows "' + content.value + '"');
  check(await body.locator('[data-action="open-page-fields"]').count() === 1, 'Details has no All fields');
});

await step('home: Page fields shows the same value; a sheet edit reaches the canvas in place', async () => {
  await app.click('#selToolbarPop [data-action="open-page-fields"]');
  await sheetBody(app).waitFor({ state: 'visible' });
  const value = await until(() => app.evaluate(() => { const el = document.querySelector('#sheet:not([hidden]) [data-cms-field="page:home:TITLE"]'); return el && el.value; }), 'Page fields never showed the HOME.TITLE control');
  check(value === original.title + NEW.title, 'Page fields shows "' + value + '"');
  await shot(page, 'home-page-fields');
  /* a form edit in the sheet re-sends the site: the canvas re-renders the route IN PLACE */
  original.eyebrow = await draft(app, 'page', 'home', 'EYEBROW');
  const eyebrow = app.locator('#sheet:not([hidden]) [data-cms-field="page:home:EYEBROW"]');
  const readyBefore = await previewReadyCount(app);
  await startFrames(pv);
  await eyebrow.click(); await eyebrow.press('End'); await page.keyboard.type(' (sheet)', { delay: 20 });
  await until(async () => (await draft(app, 'page', 'home', 'EYEBROW')) === original.eyebrow + ' (sheet)', 'typing in the sheet did not change HOME.EYEBROW (it is "' + await draft(app, 'page', 'home', 'EYEBROW') + '")');
  const shownEyebrow = () => pv.evaluate((t) => [...document.querySelectorAll('[data-ark-page] *')].some((e) => e.textContent.replace(/\s+/g, '') === t.replace(/\s+/g, '')), original.eyebrow + ' (sheet)');
  await until(shownEyebrow, 'the canvas never showed the eyebrow typed in the sheet', 10000);
  await waitForPreviewReady(app, { since: readyBefore });
  await observe(600);
  const frames = await stopFrames(pv);
  check(frames.blank === 0, frames.blank + ' of ' + frames.frames + ' frames showed no page while the sheet edit re-rendered the canvas');
  check(frames.running === 0, 'the route-change transition ran in ' + frames.running + ' frames for a sheet edit');
  check(await app.evaluate(() => document.activeElement && document.activeElement.dataset.cmsField === 'page:home:EYEBROW'), 'the sheet field lost focus while the canvas re-rendered');
  await shot(page, 'sheet-edit');
  await closeSheet(app);
});

/* ONE history (js/admin/history.js, docs/ux-audit/cms.md P1-5): the sheet's eyebrow edit came
   after the inline heading edit, so Ctrl/Cmd+Z on the canvas takes it back first, then the heading */
await step('home: Ctrl/Cmd+Z on the canvas walks back the sheet edit, then the inline edit; Shift redoes', async () => {
  await pv.locator('body').press(MOD + '+z').catch(() => {});
  await until(async () => (await draft(app, 'page', 'home', 'EYEBROW')) === original.eyebrow, 'the first undo did not take back the newest edit (the eyebrow typed in Page settings)');
  check((await draft(app, 'page', 'home', 'TITLE')) === original.title + NEW.title, 'the first undo took back the heading before the newer eyebrow edit');
  await pv.locator('body').press(MOD + '+z').catch(() => {});
  await until(async () => (await draft(app, 'page', 'home', 'TITLE')) === original.title, 'undo did not put HOME.TITLE back');
  await until(() => pv.evaluate((t) => document.querySelector('[data-ark-page] h1').textContent.replace(/\s+/g, '') === t.replace(/\s+/g, ''), original.title), 'the canvas does not show the undone heading');
  await pv.locator('body').press(MOD + '+Shift+z');
  await until(async () => (await draft(app, 'page', 'home', 'TITLE')) === original.title + NEW.title, 'redo did not reapply the inline edit');
  /* the canvas is re-sent the site after the redo: wait until it shows it before the next click */
  await until(() => pv.evaluate((t) => { const h = document.querySelector('[data-ark-page] h1'); return h && h.textContent.replace(/\s+/g, '') === t.replace(/\s+/g, ''); }, original.title + NEW.title), 'the canvas does not show the redone heading');
});

await step('escape: typing then Escape finishes the edit and KEEPS the words', async () => {
  original.intro = await draft(app, 'page', 'home', 'INTRO');
  await clickText(pv, '[data-ark-page] p.hl-intro');
  const before = await editing(pv);
  await typeAtEnd(page, pv, ' zzz');
  await until(async () => (await draft(app, 'page', 'home', 'INTRO')) === original.intro + ' zzz', 'the intro draft did not follow the typing');
  await page.keyboard.press('Escape');
  await until(() => editing(pv).then((t) => t === null), 'Escape did not end the edit');
  check((await draft(app, 'page', 'home', 'INTRO')) === original.intro + ' zzz', 'Escape threw the typed words away: the draft is "' + await draft(app, 'page', 'home', 'INTRO') + '"');
  check((await pv.evaluate(() => document.querySelector('[data-ark-page] p.hl-intro').textContent)) === before + ' zzz', 'Escape changed the words on the canvas');
  await shot(page, 'escape-kept');
});

await step('revert: "Revert to saved" puts the saved words back, and Undo brings the typing back', async () => {
  await clickText(pv, '[data-ark-page] p.hl-intro');
  await openToolbarSection(app, 'Content');
  const revert = app.locator('#selToolbarPop:not([hidden]) [data-action="revert-field"]');
  await until(async () => (await revert.count()) && (await revert.isEnabled()), 'the Content section offers no enabled "Revert to saved"');
  await revert.click();
  await until(async () => (await draft(app, 'page', 'home', 'INTRO')) === original.intro, 'Revert did not put the saved intro back');
  const reverted = app.locator('[data-notice="field-reverted"]');
  await until(() => reverted.count(), 'Revert said nothing');
  await shot(page, 'revert-notice');
  await reverted.locator('button', { hasText: 'Undo' }).click();
  await until(async () => (await draft(app, 'page', 'home', 'INTRO')) === original.intro + ' zzz', 'the notice\'s Undo did not bring the typed words back');
  await until(() => pv.evaluate((t) => document.querySelector('[data-ark-page] p.hl-intro').textContent === t, original.intro + ' zzz'), 'the canvas does not show the words Undo brought back', 10000);
  original.intro += ' zzz';
});

await step('enter: plain Enter finishes the home heading and the intro -- no line break inside', async () => {
  for (const [selector, field] of [['[data-ark-page] h1', 'TITLE'], ['[data-ark-page] p.hl-intro', 'INTRO']]) {
    const was = await draft(app, 'page', 'home', field);
    /* the previous field's Content popover opens over the text below it (docs/ux-audit/cms.md
       P1-6, a later wave): close it, as a person would, so the click reaches the text */
    await closeToolbarSection(app);
    await clickText(pv, selector);
    await until(() => editing(pv).then((t) => t !== null), field + ': the click did not start an edit');
    const hint = await until(() => app.evaluate((f) => { const el = document.querySelector('#selToolbar:not([hidden]) .cms-content-keys'), c = window.ArkAdmin.state.cmsContent; return el && c && c.field === 'HOME.' + f && el.textContent; }, field), field + ': the bar does not say how to finish an edit');
    check(/Enter or Esc to finish/.test(hint), field + ': the bar says "' + hint + '"');
    await page.keyboard.press('Enter');
    await until(() => editing(pv).then((t) => t === null), field + ': Enter did not finish the edit');
    check((await draft(app, 'page', 'home', field)) === was, field + ': Enter changed the words (a line break went in): "' + await draft(app, 'page', 'home', field) + '"');
  }
  await closeToolbarSection(app);
});

await step('copies: every element showing the edited field takes the words on commit, without a re-render', async () => {
  /* a second copy of the intro on the page (a fixture: the same field drawn twice) */
  await pv.evaluate(() => { const p = document.querySelector('[data-ark-page] p.hl-intro'); const copy = p.cloneNode(true); copy.classList.add('test-intro-copy'); p.after(copy); });
  const readyBefore = await previewReadyCount(app);
  await clickText(pv, '[data-ark-page] p.hl-intro:not(.test-intro-copy)');
  await typeAtEnd(page, pv, ' (twice)');
  await page.keyboard.press(MOD + '+Enter');
  await until(() => editing(pv).then((t) => t === null), 'the edit did not end');
  const copy = await pv.evaluate(() => document.querySelector('.test-intro-copy').textContent);
  check(copy === original.intro + ' (twice)', 'the other copy of HOME.INTRO shows "' + copy + '"');
  check((await previewReadyCount(app)) === readyBefore, 'the copies were updated by a re-render, not in place');
  original.introFinal = original.intro + ' (twice)';
  await shot(page, 'copies');
});

await step('race: a Page fields edit just before an inline commit -- both reach the canvas', async () => {
  const body = await openPageFields(app);
  const eyebrowBefore = await draft(app, 'page', 'home', 'EYEBROW');
  const field = body.locator('[data-cms-field="page:home:EYEBROW"]');
  await field.click();
  await field.evaluate((el) => { el.focus(); el.setSelectionRange(el.value.length, el.value.length); });
  await page.keyboard.type(' (race)', { delay: 5 });
  /* straight to the canvas: the sheet's send is still waiting in its 180 ms window, or arrives
     while the words are typed -- either way it must not be lost */
  await clickText(pv, '[data-ark-page] p.hl-intro:not(.test-intro-copy)');
  await typeAtEnd(page, pv, '!');
  await page.keyboard.press(MOD + '+Enter');
  original.introFinal += '!';
  await until(async () => (await draft(app, 'page', 'home', 'INTRO')) === original.introFinal && (await draft(app, 'page', 'home', 'EYEBROW')) === eyebrowBefore + ' (race)', 'the drafts do not hold both edits').catch(async (e) => { throw new StepFailure(e.message + ' -- INTRO "' + await draft(app, 'page', 'home', 'INTRO') + '", EYEBROW "' + await draft(app, 'page', 'home', 'EYEBROW') + '", expected INTRO "' + original.introFinal + '"'); });
  await until(() => pv.evaluate(([e, i]) => { const n = (v) => v.replace(/\s+/g, ''); const all = [...document.querySelectorAll('[data-ark-page] *')]; return all.some((x) => n(x.textContent) === n(e)) && all.some((x) => n(x.textContent) === n(i)); }, [eyebrowBefore + ' (race)', original.introFinal]),
    'the canvas does not show both the sheet edit and the inline edit', 10000);
  await shot(page, 'race');
  await closeSheet(app);
});

await step('nav: a header link label edits Site chrome (NAV.*)', async () => {
  const text = await pv.evaluate(() => {
    const values = new Set(Object.values(ArkManifest.get('nav').fields).filter((f) => f.kind !== 'link').map((f) => f.value));
    const link = [...document.querySelectorAll('header a, nav a')].find((a) => !a.closest('[data-ark-page]') && values.has(a.textContent.trim()) && a.getClientRects().length && a.getBoundingClientRect().width > 20);
    if (!link) return null;
    link.setAttribute('data-test-nav', '');
    return link.textContent.trim();
  });
  check(text, 'no header link shows a Site chrome field');
  await clickText(pv, '[data-test-nav]');
  /* which field it is, as the canvas derived it (two Site chrome fields can hold the same words) */
  /* the field the canvas bound the click to (the bar names it; its key is in Details) */
  const content = await until(() => app.evaluate(() => { const c = window.ArkAdmin.state.cmsContent; return c && c.field && /^NAV\./.test(c.field) && { field: c.field }; }), 'the canvas never bound "' + text + '" to a NAV field');
  const role = content.field.split(/\s/)[0].slice(4);
  const others = await app.evaluate(([t, r]) => { const f = window.ArkAdmin.state.drafts.nav.fields; return Object.keys(f).filter((k) => k !== r && f[k].value === t); }, [text, role]);
  original.nav = { role, text };
  await typeAtEnd(page, pv, NEW.nav);
  await page.keyboard.press('Enter');
  await until(async () => (await draft(app, 'page', 'nav', role)) === text + NEW.nav, 'NAV.' + role + ' did not become the typed label');
  for (const other of others) check((await draft(app, 'page', 'nav', other)) === text, 'NAV.' + other + ', which holds the same words, changed too');
  await shot(page, 'nav-label');
});

await step('refusal: text no field holds says why and names its source', async () => {
  const found = await pv.evaluate(() => {
    const norm = (v) => String(v || '').replace(/\s+/g, '');
    const values = new Set();
    ArkManifest.all().forEach((m) => Object.values(m.fields).forEach((f) => values.add(norm(f.value))));
    (window.LearningContent ? LearningContent.articles : []).forEach((a) => Object.values(a).forEach((v) => { if (typeof v === 'string') values.add(norm(v)); }));
    /* unbound all the way up: a line of a bound heading is part of that heading's field */
    const boundAbove = (e) => { for (let n = e; n && !n.hasAttribute('data-ark-page'); n = n.parentElement) if (values.has(norm(n.textContent))) return true; return false; };
    const el = [...document.querySelectorAll('[data-ark-page] [data-ark-layout-key]')].find((e) => /^(P|SPAN|H2|H3|LI|STRONG)$/.test(e.tagName) && !e.children.length && norm(e.textContent).length > 3
      && !boundAbove(e) && !e.closest('[data-ark-component-key]') && e.getClientRects().length && e.getBoundingClientRect().width > 20);
    if (!el) return null;
    el.setAttribute('data-test-unbound', '');
    return el.textContent.trim().slice(0, 40);
  });
  check(found, 'every leaf text on the home page is bound -- nothing to refuse');
  await clickText(pv, '[data-test-unbound]');
  const key = await pv.evaluate(() => document.querySelector('[data-test-unbound]').getAttribute('data-ark-layout-key'));
  /* the bar is drawn for THIS selection (not still showing the last one's section) */
  const content = await until(async () => { const c = await toolbarContent(app); const barKey = await app.evaluate(() => document.getElementById('selToolbar').dataset.key); return barKey === key && c && c.refusal && /site template|separate pieces|no words/.test(c.refusal) && c; }, 'the Details never explained why the unbound text "' + found + '" cannot be edited');
  /* the source is named for a developer, under Developer details (pop.textContent includes the closed region) */
  check(/js\/pages\/|F_SCENE_RZERO_V0|component/.test(content.text), 'the refusal names no source: ' + content.text);
  check(!/js\/pages\/|F_SCENE_RZERO_V0/.test(content.refusal), 'the plain reason carries a file or resolver id: ' + content.refusal);
  check((await editing(pv)) === null, 'unbound text became editable');
  await shot(page, 'unbound-refusal');
});

await step('design lens: the same click selects and styles, and never edits the words', async () => {
  await setLens(app, pv, 'design');
  await clickText(pv, '[data-ark-page] p.hl-intro');
  await until(async () => { const names = await app.evaluate(() => [...document.querySelectorAll('#selToolbar:not([hidden]) [data-section]')].map((b) => b.dataset.name)); return names.includes('Typography') && !names.includes('Content'); }, 'the Design lens toolbar does not offer Typography (or still offers Content)');
  check((await editing(pv)) === null, 'a Design-lens click made text editable');
  check(await pv.evaluate(() => [...document.querySelectorAll('.ark-studio-handle')].some((h) => !h.hidden)), 'the Design lens shows no resize handles');
  await shot(page, 'design-lens');
  await setLens(app, pv, 'content');
});

let slug = null;
await step('article: its title edits on its own route', async () => {
  slug = await app.evaluate(() => window.ArkAdmin.state.slugs[0]);
  original.article = await draft(app, 'article', slug, 'title');
  const since = await previewReadyCount(app);
  await app.evaluate((route) => window.ArkAdmin.openRoute(route), '/learnings/' + slug);
  await waitForPreviewReady(app, { since, path: '/learnings/' + slug });
  await until(() => pv.evaluate(() => !!document.querySelector('[data-ark-page] h1.article-title')), 'the article page never rendered its title');
  await clickText(pv, '[data-ark-page] h1.article-title');
  await typeAtEnd(page, pv, NEW.article);
  await page.keyboard.press('Enter');
  await until(async () => (await draft(app, 'article', slug, 'title')) === original.article + NEW.article, 'the article title draft did not change');
  await shot(page, 'article-title');
});

await step('save: the files hold the new words; a reload of the editor reads them back', async () => {
  const since = await statusCount(app);
  await app.click('#save');
  const summary = await waitForSave(app, since);
  check(!/failed/.test(summary.text), 'Save reported: ' + summary.text);
  const home = fs.readFileSync(path.join(WORK, 'js/content/manifests/home.js'), 'utf8');
  check(home.includes(JSON.stringify(original.title + NEW.title)), 'manifests/home.js does not hold the new heading');
  check(home.includes(JSON.stringify(original.introFinal)), 'manifests/home.js does not hold the intro as committed (kept on Escape, reverted and undone, then edited twice)');
  const nav = fs.readFileSync(path.join(WORK, 'js/content/manifests/nav.js'), 'utf8');
  check(nav.includes(JSON.stringify(original.nav.text + NEW.nav)), 'manifests/nav.js does not hold the new label');
  const articleFiles = ['js/content/article-index.js', 'js/content/articles/' + slug + '.js'].map((f) => path.join(WORK, f)).filter((f) => fs.existsSync(f)).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  check(articleFiles.includes(JSON.stringify(original.article + NEW.article)), 'the article files do not hold the new title');
  await reloadEditor(page);
  ({ app, pv } = await openEditor(page));
  check((await draft(app, 'page', 'home', 'TITLE')) === original.title + NEW.title, 'after a reload the editor reads an old heading');
});

await step('public: the visitor\'s page and the server render show the new words', async () => {
  const pub = await context.newPage();
  await pub.goto(ORIGIN + '/');
  await waitForRouteReady(pub.mainFrame(), { path: '/', timeout: 15000 });
  const h1 = await until(() => pub.evaluate(() => { const h = document.querySelector('[data-ark-page] h1'); return h && h.textContent; }), 'the public home page has no heading');
  check(h1.replace(/\s+/g, '') === (original.title + NEW.title).replace(/\s+/g, ''), 'the public heading is "' + h1 + '"');
  const navText = await pub.evaluate((t) => [...document.querySelectorAll('header a, nav a')].some((a) => a.textContent.trim() === t), original.nav.text + NEW.nav);
  check(navText, 'the public header does not show the new label');
  await pub.screenshot({ path: path.join(SHOTS, 'public-home.png') });
  await pub.goto(ORIGIN + '/learnings/' + slug);
  await waitForRouteReady(pub.mainFrame(), { path: '/learnings/' + slug, timeout: 15000 });
  const title = await until(() => pub.evaluate(() => { const h = document.querySelector('h1.article-title'); return h && h.textContent; }), 'the public article has no title');
  check(title === original.article + NEW.article, 'the public article title is "' + title + '"');
  await pub.close();
  const html = await renderDocument({ html: await readIndexHtml(WORK), url: 'https://defxn.com/', resources: createLocalResources(WORK), timeoutMs: 60000 });
  check(html.includes(NEW.title.trim()), 'the server render of / does not contain the new heading');
});

check(true, '');
if (errors.length) { console.log('page errors:\n  ' + errors.slice(0, 8).join('\n  ')); }
console.log(`\nscreenshots: ${SHOTS}`);
await browser.close();
server.close();
if (!args.includes('--keep')) fs.rmSync(WORK, { recursive: true, force: true });
process.exit(failures ? 1 : 0);

/* =====================================================================
   REAL-BROWSER CHECKS for the contextual toolbar's SHELL
   ---------------------------------------------------------------------
   Why this exists: the owner asked for the selection toolbar to become
   "a horizontal bar with icons and those become popovers" -- the old one
   stacked every section as an accordion row (up to 580px tall) and covered
   the element it was editing. A shell is behaviour you can only see by
   driving it: which icons a selection gets, that one popover opens at a
   time and closes on Esc / outside click / a click into the preview, that
   focus goes in and comes back, that the arrow keys walk the bar, that a
   re-render while typing keeps the popover and the typed value, and that
   the bar sits beside the selection rather than on it at desktop AND phone
   widths. Every step clicks the real page and asserts on the real outcome --
   for each kind, one control is changed and the PREVIEW DOM must change.

   Run:   node tests/browser/toolbar-popovers.mjs [--only paragraph,container,image,instance,states,narrow] [--headed]
   Needs: Chromium from `npx playwright install chromium`.
   Screenshots go to $SHOTS (default: a temp folder, printed at the end).
   ===================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { setLens, SITE, copySite, startHost, fakeFolder, appFrame, previewFrame, toolbarButton, toolbarAction, clickToolbarAction, toolbarPopover, toolbarSections, toolbarKey, toolbarSectionIsOpen, openToolbarSection, until as untilFor, untilStable, waitForPreviewReady, nextFrames, animationsSettled, gotoEditor } from './harness.mjs';

const args = process.argv.slice(2);
const only = (args.includes('--only') ? args[args.indexOf('--only') + 1] : 'paragraph,container,image,instance,states,narrow').split(',');
const SHOTS = process.env.SHOTS || fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-toolbar-shots-'));
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-toolbar-site-'));
fs.mkdirSync(SHOTS, { recursive: true });

let failures = 0;
class StepFailure extends Error {}
function check(condition, message) { if (!condition) throw new StepFailure(message); }
async function step(name, run) {
  try { await run(); console.log(`ok   ${name}`); }
  catch (error) { failures += 1; console.log(`FAIL ${name}\n     ${error instanceof StepFailure ? error.message : error.stack}`); throw error; }
}
async function flow(name, run) {
  if (!only.includes(name)) return;
  console.log(`\n== ${name}`);
  fs.cpSync(path.join(SITE, 'js/content'), path.join(WORK, 'js/content'), { recursive: true });
  try { await run(); } catch { /* reported by step() */ }
}
/* the harness's until (budget x load factor); a StepFailure thrown by a probe is a verdict */
const until = (probe, message, timeout = 6000) => untilFor(probe, message, timeout, { fail: (m) => new StepFailure(m), passThrough: (e) => e instanceof StepFailure });

copySite(WORK);
const server = await startHost(WORK);
const ORIGIN = server.origin;
const browser = await chromium.launch({ headless: !args.includes('--headed') });
const errors = [];
/* the fake folder handle holds functions, so the app's "remember this folder" IndexedDB put
   cannot clone it -- an artefact of the harness, not of the app */
const harnessNoise = /could not be cloned/;

async function openEditor(width = 1280, height = 900) {
  const context = await browser.newContext({ viewport: { width, height } });
  await fakeFolder(context, WORK);
  const page = await context.newPage();
  page.on('pageerror', (e) => { if (!harnessNoise.test(e.message)) errors.push(`${width}px pageerror: ${e.message}`); });
  page.on('console', (m) => { if (m.type() === 'error' && !harnessNoise.test(m.text())) errors.push(`${width}px console: ${m.text()}`); });
  page.on('dialog', (d) => d.dismiss());
  await gotoEditor(page, ORIGIN);
  const app = await appFrame(page);
  await setLens(app, 'design');   /* the Design lens: a canvas click selects and styles */
  const pv = await previewFrame(app);
  await waitForPreviewReady(app);
  ({ P, DIV } = await heroKeys(pv));
  return { context, page, app, pv, shot: (name) => page.screenshot({ path: path.join(SHOTS, name + '.png') }) };
}
/* The paragraph and container every flow edits, found by role -- Home's level-1 heading, the box
   it sits in, and the paragraph that follows it -- and their layout keys read off the DOM, never
   written here: a hard-coded key broke every flow when keys became page-scoped (js/content/
   layout.js; path:div:1/div:2/section:1/section:1/div:1/p:2 is page:/section:1/div:1/p:2 now). */
async function heroKeys(pv) {
  const keys = await pv.evaluate(() => {
    if (window.ArkLayout) ArkLayout.annotate(document.getElementById('scene'), ArkUI.route.path());
    const h1 = document.querySelector('[data-ark-page] h1'), box = h1 && h1.parentElement;
    let p = h1 && h1.nextElementSibling; while (p && p.tagName !== 'P') p = p.nextElementSibling;
    return { P: p && p.getAttribute('data-ark-layout-key'), DIV: box && box.getAttribute('data-ark-layout-key') };
  });
  check(keys.P && keys.DIV, `Home has no heading box with a paragraph after its h1 to edit (found ${JSON.stringify(keys)})`);
  return keys;
}
const byKey = (pv, key) => pv.locator(`[data-ark-layout-key="${key}"]`).first();
const selectKey = (app, key) => app.evaluate((k) => document.getElementById('cmsPreview').contentWindow.postMessage({ type: 'defxn-cms-preview-select-group', key: k }, location.origin), key);
/* the bar is on `key` and has been painted there (it is placed in a rAF after it renders) */
async function selected(app, key) { await until(async () => (await toolbarKey(app)) === key, `the toolbar is not editing ${key} (it shows ${await toolbarKey(app)})`); await nextFrames(app); }
const computed = (pv, key, prop) => pv.evaluate(([k, p]) => { const el = document.querySelector(`[data-ark-layout-key="${CSS.escape(k)}"]`); return el ? getComputedStyle(el)[p] : null; }, [key, prop]);
/* no bare action icons in the Edit style bar since 2026-10-19: the selection's commands (Make into
   component, Make into states, Group, Remove, Align ...) are behind More, the same list as the
   right-click menu (docs/ux-audit/cms.md P1-7, P1-8) */
const ACTIONS = [];

/* the bar holds exactly these section icons in this order, then the actions; every icon has a
   name a screen reader reads and a tooltip a sighted user sees */
async function checkBar(app, expected, extraActions = []) {
  const names = await toolbarSections(app);
  check(JSON.stringify(names) === JSON.stringify(expected), `sections ${JSON.stringify(names)}, expected ${JSON.stringify(expected)}`);
  const actions = await app.evaluate(() => [...document.querySelectorAll('#selToolbar [data-action]')].map((b) => b.getAttribute('aria-label')));
  check(JSON.stringify(actions) === JSON.stringify([...extraActions, ...ACTIONS]), 'actions: ' + JSON.stringify(actions));
  const unnamed = await app.evaluate(() => [...document.querySelectorAll('#selToolbar button')].filter((b) => !b.getAttribute('aria-label') || !b.dataset.tip).length);
  check(unnamed === 0, unnamed + ' bar buttons have no aria-label or tooltip');
  const icons = await app.evaluate(() => [...document.querySelectorAll('#selToolbar button svg use')].map((u) => u.getAttribute('href')));
  check(icons.every((h) => /^#i-/.test(h)), 'a bar icon is not from the shared sprite: ' + icons.join(','));
  const sectionIcons = await app.evaluate(() => [...document.querySelectorAll('#selToolbar [data-section] svg use')].map((u) => u.getAttribute('href')));
  check(new Set(sectionIcons).size === sectionIcons.length, 'two sections share an icon: ' + sectionIcons.join(','));
}
/* open every section in turn: one popover, one pressed button, inside the viewport, holding controls */
async function openEach(app, page, names) {
  for (const name of names) {
    const body = await openToolbarSection(app, name);
    const state = await app.evaluate(() => {
      const pop = document.getElementById('selToolbarPop'), r = pop.getBoundingClientRect();
      return { pressed: [...document.querySelectorAll('#selToolbar [aria-expanded="true"]')].map((b) => b.dataset.name), label: pop.getAttribute('aria-label'), r: r.toJSON(), vw: innerWidth, vh: innerHeight, controls: pop.querySelectorAll('.tb-pop-body input, .tb-pop-body select, .tb-pop-body textarea, .tb-pop-body button, .tb-pop-body .hint').length };
    });
    check(state.pressed.length === 1 && state.pressed[0] === name, `"${name}" open: pressed buttons ${JSON.stringify(state.pressed)}`);
    check(state.label.startsWith(name), `the popover is labelled "${state.label}" for "${name}"`);
    check(state.controls > 0, `the "${name}" popover is empty`);
    check(state.r.left >= 0 && state.r.top >= 0 && state.r.right <= state.vw + 0.5 && state.r.bottom <= state.vh + 0.5, `the "${name}" popover leaves the viewport: ${JSON.stringify(state.r)}`);
    check(await body.isVisible(), `the "${name}" popover body is not visible`);
  }
  /* the same icon again closes it */
  const last = names[names.length - 1];
  await toolbarButton(app, last).click();
  await until(async () => !(await toolbarPopover(app).count()), `clicking "${last}" again did not close its popover`);
  check(!(await toolbarSectionIsOpen(app, last)), `"${last}" still looks pressed after closing`);
}
/* the bar sits beside the selection, not on it (the old toolbar covered what it edited) */
async function checkClear(app, pv, key, what) {
  const a = await app.locator('#selToolbar').boundingBox(), b = await byKey(pv, key).boundingBox();
  check(a && b, 'toolbar or ' + what + ' has no box');
  const overlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  check(overlap < 0.02 * b.width * b.height, `the toolbar covers ${Math.round(100 * overlap / (b.width * b.height))}% of ${what}`);
}
const TEXT = ['Typography', 'Fill and border', 'Spacing', 'Frame', 'In / out animation'];
const CONTAINER = ['Layout', 'Fill and border', 'Spacing', 'Frame', 'Size', 'Effects', 'In / out animation'];
const IMAGE = ['Frame', 'Fill and border', 'Alt text', 'In / out animation'];
/* set by openEditor() from the DOM (heroKeys) */
let P = null, DIV = null;

/* ---------------------------------------------------------------- paragraph */
await flow('paragraph', async () => {
  const { app, pv, page, shot } = await openEditor();
  await step('click a paragraph: a compact bar of text icons beside it', async () => {
    await byKey(pv, P).click();
    await selected(app, P);
    await checkBar(app, TEXT);
    const bar = await app.locator('#selToolbar').boundingBox();
    check(bar.height <= 44, 'the bar is ' + bar.height + 'px tall: not one compact row');
    await checkClear(app, pv, P, 'the paragraph');
    await shot('after-1280-paragraph-bar');
  });
  await step('every text section opens as one popover, then the same icon closes it', async () => { await openEach(app, page, TEXT); });
  await step('Typography > Align Center centres the paragraph in the preview; the popover stays open', async () => {
    const body = await openToolbarSection(app, 'Typography');
    await body.locator('.row', { hasText: 'Align' }).locator('button', { hasText: 'Center' }).click();
    await until(async () => (await computed(pv, P, 'textAlign')) === 'center', 'the paragraph did not centre: ' + await computed(pv, P, 'textAlign'));
    check(await toolbarSectionIsOpen(app, 'Typography'), 'editing a control closed the popover');
    check(await body.locator('.row', { hasText: 'Align' }).locator('button[aria-pressed="true"]', { hasText: 'Center' }).count(), 'the re-rendered popover does not show Center pressed');
    await animationsSettled(app); await shot('after-1280-paragraph-typography');
  });
  await step('opening another section closes the first: one popover at a time', async () => {
    await openToolbarSection(app, 'Spacing');
    const pressed = await app.evaluate(() => [...document.querySelectorAll('#selToolbar [aria-expanded="true"]')].map((b) => b.dataset.name));
    check(JSON.stringify(pressed) === '["Spacing"]', 'pressed: ' + JSON.stringify(pressed));
    check(await app.locator('#selToolbarPop:not([hidden])').count() === 1 && await app.locator('.tb-pop').count() === 1, 'more than one popover');
  });
  await step('Esc closes it and puts focus back on its icon', async () => {
    await (await openToolbarSection(app, 'Spacing')).locator('input').first().focus();
    await page.keyboard.press('Escape');
    await until(async () => !(await toolbarPopover(app).count()), 'Esc did not close the popover');
    check(await app.evaluate(() => document.activeElement && document.activeElement.dataset.name) === 'Spacing', 'focus did not return to the Spacing icon');
  });
  await step('a click outside (in the editor) closes it', async () => {
    await openToolbarSection(app, 'Frame');
    await app.click('#devName');
    await until(async () => !(await toolbarPopover(app).count()), 'an outside click did not close the popover');
  });
  await step('a click into the preview closes it', async () => {
    await openToolbarSection(app, 'Frame');
    await byKey(pv, DIV).click({ position: { x: 4, y: 4 } });
    await until(async () => !(await toolbarPopover(app).count()), 'a click into the preview did not close the popover');
    await byKey(pv, P).click(); await selected(app, P);
  });
  await step('a re-render while typing keeps the popover, the focus and the typed value', async () => {
    const x = (await openToolbarSection(app, 'Frame')).locator('input[aria-label="X"]');
    await x.focus(); await x.fill('77');   /* typed, not committed: no change event yet */
    /* any preview message repaints the toolbar; this one changes nothing else */
    const seen = await app.evaluate(() => (window.__arkSignals.up['cmsPreview:defxn-cms-preview-states-showing'] || { n: 0 }).n);
    await pv.evaluate(() => window.parent.postMessage({ type: 'defxn-cms-preview-states-showing' }, location.origin));
    /* the editor has handled it (its recorder counts it in the same dispatch), and repainted */
    await until(() => app.evaluate((n) => (window.__arkSignals.up['cmsPreview:defxn-cms-preview-states-showing'] || { n: 0 }).n > n, seen), 'the editor never received the preview message');
    await nextFrames(app);
    check(await toolbarSectionIsOpen(app, 'Frame'), 'the re-render closed the popover');
    const now = await app.evaluate(() => ({ label: document.activeElement && document.activeElement.getAttribute('aria-label'), value: document.activeElement && document.activeElement.value }));
    check(now.label === 'X' && now.value === '77', 'focus/value after re-render: ' + JSON.stringify(now));
    await page.keyboard.press('Escape');
  });
  await step('keyboard: one tab stop, arrows walk the bar, Enter opens with focus inside, Esc returns', async () => {
    await toolbarButton(app, 'Typography').focus();
    const stops = await app.evaluate(() => [...document.querySelectorAll('#selToolbar button')].filter((b) => b.tabIndex === 0).length);
    check(stops === 1, stops + ' tab stops in the bar');
    await page.keyboard.press('ArrowRight');
    check(await app.evaluate(() => document.activeElement.dataset.name) === 'Fill and border', 'ArrowRight did not move to Fill and border');
    await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
    check(await app.evaluate(() => document.activeElement.dataset.name) === 'More', 'ArrowLeft from the first icon did not wrap to the last (More)');
    await page.keyboard.press('Home');
    check(await app.evaluate(() => document.activeElement.dataset.name) === 'Typography', 'Home did not go to the first icon');
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await until(() => toolbarSectionIsOpen(app, 'Spacing'), 'Enter did not open Spacing');
    check(await app.evaluate(() => !!document.activeElement.closest('#selToolbarPop')), 'focus did not move into the popover');
    await page.keyboard.press('Escape');
    await until(async () => (await app.evaluate(() => document.activeElement && document.activeElement.dataset.name)) === 'Spacing', 'focus did not come back to Spacing');
    check(await app.evaluate(() => document.querySelector('#selToolbar [data-name="Spacing"]').tabIndex) === 0, 'the roving tab stop did not follow');
  });
  await step('the bar hides while the preview\'s right-click menu is open', async () => {
    await byKey(pv, P).click({ button: 'right' });
    await pv.locator('.ark-studio-menu').waitFor({ state: 'visible' });
    await until(() => app.evaluate(() => document.getElementById('selToolbar').hidden), 'the bar stayed over the open menu');
    await page.keyboard.press('Escape');
    await app.click('#devName');
    await until(() => app.evaluate(() => !document.getElementById('selToolbar').hidden), 'the bar did not come back after the menu closed');
  });
  await step('the popover follows its bar when the canvas moves on screen with nothing resized or scrolled', async () => {
    /* The bar moves with the stage by CSS; the popover is position:fixed and placed from the bar's
       on-screen box, so any move of the stage must re-place it. It used to be re-placed only on a
       window resize, a canvas resize or a canvas scroll: after a 1280 -> 1100 px resize the stage
       moved 40.7 px one frame later (the header's new height reaching the canvas) and the popover
       followed only because the canvas also happened to shrink (measured 2026-10-18; this driver
       passed only behind a fixed 500 ms sleep). Here the line above the stage grows, which moves
       the stage and changes neither the canvas's size nor its scroll. */
    await openToolbarSection(app, 'Typography');
    const at = () => app.evaluate(() => {
      const btn = document.querySelector('#selToolbar [data-section][aria-expanded="true"]').getBoundingClientRect(), pop = document.getElementById('selToolbarPop').getBoundingClientRect(), bar = document.getElementById('selToolbar').getBoundingClientRect(), wrap = document.getElementById('canvasWrap');
      /* where the popover hangs off its button: the same offset across and the same gap to the bar */
      return { dx: Math.round(pop.left - btn.left), gap: Math.round(pop.bottom <= bar.top + 1 ? bar.top - pop.bottom : pop.top - bar.bottom), barTop: Math.round(bar.top), canvas: [wrap.clientWidth, wrap.clientHeight, wrap.scrollTop, wrap.scrollLeft].join(',') };
    });
    const before = await at();
    await app.evaluate(() => { document.querySelector('#designView .devlabel').style.paddingTop = '40px'; });
    try {
      /* re-placed in the frame the bar moved: read after frames have been drawn, never between a
         style change and the next frame (under load a frame took ~180 ms, and two readings 120 ms
         apart both came before it -- "stable", and stale) */
      await nextFrames(app, 2);
      const after = await untilStable(at, 'the bar or its popover kept moving after the stage moved');
      check(after.canvas === before.canvas, `the canvas was resized or scrolled (${before.canvas} -> ${after.canvas}): this step must move the stage with neither`);
      check(Math.abs(after.barTop - before.barTop - 40) <= 1, `the bar did not move with the stage: ${JSON.stringify({ before, after })}`);
      check(after.dx === before.dx && after.gap === before.gap, `the popover stayed where the bar was: ${JSON.stringify({ before, after })}`);
    } finally {
      await app.evaluate(() => { document.querySelector('#designView .devlabel').style.paddingTop = ''; });
      await page.keyboard.press('Escape');
    }
  });
  await step('a resize (new zoom) re-places the bar and its open popover beside the selection', async () => {
    await openToolbarSection(app, 'Typography');
    const gapBefore = (await byKey(pv, P).boundingBox()).y - (await app.locator('#selToolbar').boundingBox()).y;
    await page.setViewportSize({ width: 1100, height: 860 });
    await nextFrames(app, 3);   /* the resize frame, the header's re-layout one frame later, and one drawn after it */
    /* the bar, the element and the popover have stopped moving: the resize re-lays out the stage at
       the new zoom, and one frame later the header's new height moves the stage down (40.7 px,
       measured 2026-10-18); the popover follows the bar's own box (js/admin/canvas.js followBox,
       the step above), so the last reading is after the final layout -- no sleep */
    const { el, bar } = await untilStable(async () => ({ el: await byKey(pv, P).boundingBox(), bar: await app.locator('#selToolbar').boundingBox(), pop: await app.locator('#selToolbarPop').boundingBox() }), 'the bar or its popover kept moving after the resize');
    check(bar.y < el.y && el.y - bar.y < gapBefore + 20, `the bar did not follow the selection: ${JSON.stringify({ el, bar, gapBefore })}`);
    await checkClear(app, pv, P, 'the paragraph after a resize');
    const pop = await app.locator('#selToolbarPop').boundingBox(), btn = await toolbarButton(app, 'Typography').boundingBox();
    check(Math.abs(pop.x - btn.x) < 12 && (pop.y + pop.height <= bar.y + 1 || pop.y >= bar.y + bar.height - 1), 'the popover did not follow its button: ' + JSON.stringify({ pop, btn, bar }));
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 1280, height: 900 });
  });
  await page.context().close();
});

/* ---------------------------------------------------------------- container */
await flow('container', async () => {
  const { app, pv, page, shot } = await openEditor();
  await step('select a container: Layout, Fill, Spacing, Frame, Size, Effects', async () => {
    await selectKey(app, DIV); await selected(app, DIV);
    await checkBar(app, CONTAINER);
    await checkClear(app, pv, DIV, 'the container');
  });
  await step('every container section opens', async () => { await openEach(app, page, CONTAINER); });
  await step('Effects > Opacity 60% fades the container in the preview', async () => {
    await (await openToolbarSection(app, 'Effects')).locator('.row', { hasText: 'Opacity' }).locator('button', { hasText: '60%' }).click();
    await until(async () => (await computed(pv, DIV, 'opacity')) === '0.6', 'opacity is ' + await computed(pv, DIV, 'opacity'));
    await animationsSettled(app); await shot('after-1280-container-effects');
  });
  await page.context().close();
});

/* ---------------------------------------------------------------- image */
await flow('image', async () => {
  const { app, pv, page, shot } = await openEditor();
  let key;
  await step('select an inline image (svg): Frame, Fill, Alt text', async () => {
    key = await pv.evaluate(() => { const el = [...document.querySelectorAll('main svg[data-ark-layout-key], [data-ark-layer="outlet"] svg[data-ark-layout-key]')].find((s) => { const r = s.getBoundingClientRect(); return r.width >= 8 && r.height >= 8 && r.top > 0 && r.top < innerHeight; }); return el && el.getAttribute('data-ark-layout-key'); });
    check(key, 'no visible inline svg on the home page');
    await selectKey(app, key); await selected(app, key);
    await checkBar(app, IMAGE);
  });
  await step('every image section opens', async () => { await openEach(app, page, IMAGE); });
  await step('Alt text labels the image in the preview', async () => {
    const field = (await openToolbarSection(app, 'Alt text')).locator('textarea[name="alt-text"]');
    await field.fill('Toolbar shell check');
    await field.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));
    await until(() => pv.evaluate((k) => document.querySelector(`[data-ark-layout-key="${CSS.escape(k)}"]`).getAttribute('aria-label') === 'Toolbar shell check', key), 'the svg did not take the label');
    await animationsSettled(app); await shot('after-1280-image-alt');
  });
  await page.context().close();
});

/* ---------------------------------------------------------------- instance */
await flow('instance', async () => {
  const { app, pv, page, shot } = await openEditor();
  let instKey;
  await step('Make into component (bar action): the new instance\'s section opens by itself', async () => {
    await byKey(pv, P).click(); await selected(app, P);
    await clickToolbarAction(app, 'Make into component');
    instKey = await until(() => pv.evaluate(() => { const el = document.querySelector('[data-ark-component-key]'); return el && el.getAttribute('data-ark-component-key'); }), 'no instance after Make into component');
    await until(() => toolbarSectionIsOpen(app, 'Component instance'), 'the Component instance popover did not open by itself');
    check(await app.evaluate(() => document.querySelector('#selToolbar [data-name="Component instance"]').classList.contains('identity')), 'the Component instance icon has no identity mark');
    /* the command stays listed in More, saying why it cannot apply (checked after the auto-open) */
    const more = await openToolbarSection(app, 'More');
    await until(async () => (await more.locator('[data-action="make-component"]').getAttribute('aria-disabled')) === 'true', 'Make into component is still offered on an instance');
    check(/inserted block|component/i.test(await more.locator('[data-action="make-component"] .hint').textContent()), 'the refused Make into component does not say why');
    await toolbarButton(app, 'More').click();
    const names = await toolbarSections(app);
    check(names.includes('Component instance') && names.includes('In / out animation'), 'instance sections: ' + names.join(', '));
    await animationsSettled(app); await shot('after-1280-instance-autoopen');
  });
  await step('editing a prop changes the instance in the preview', async () => {
    const input = (await openToolbarSection(app, 'Component instance')).locator('.row input.ctl').first();
    await input.fill('Toolbar shell instance text');
    await input.evaluate((el) => el.dispatchEvent(new Event('change')));
    await until(() => pv.evaluate((k) => /Toolbar shell instance text/.test(document.querySelector(`[data-ark-component-key="${k}"]`).textContent), instKey), 'the instance text did not change');
  });
  await step('every instance section opens', async () => { await openEach(app, page, await toolbarSections(app)); });
  await page.context().close();
});

/* ---------------------------------------------------------------- states */
await flow('states', async () => {
  const { app, pv, page, shot } = await openEditor();
  const link = (text) => pv.locator('header nav.header-core-links > a', { hasText: text }).first();
  let groupId;
  await step('Make into states (right-click menu): the States popover opens by itself', async () => {
    await link('Overview').click();
    await link('How it works').click({ modifiers: ['Shift'] });
    await link('Overview').click({ button: 'right' });
    await pv.locator('.ark-studio-menu').waitFor({ state: 'visible' });
    await pv.locator('.ark-studio-menu button', { hasText: 'Make into states' }).first().click();
    /* header links: the group is stored under the persistent shell's scope ('*', ArkLayout.SHELL) */
    groupId = await until(() => pv.evaluate(() => { const g = (ArkStates.get().routes[ArkLayout.SHELL] || {}); return Object.keys(g)[0]; }), 'no state group');
    await until(() => toolbarSectionIsOpen(app, 'States'), 'the States popover did not open by itself after Make into states');
    check(await app.evaluate(() => document.querySelector('#selToolbar [data-name="States"]').classList.contains('identity')), 'the States icon has no identity mark');
    await animationsSettled(app); await shot('after-1280-states-autoopen');
  });
  await step('+ Add state adds a state in the preview, popover still open', async () => {
    await (await openToolbarSection(app, 'States')).locator('button', { hasText: '+ Add state' }).click();
    await until(() => pv.evaluate((id) => ArkStates.get().routes[ArkLayout.SHELL][id].states.length === 2, groupId), 'state 1 was not added');
    await until(() => pv.evaluate(() => [...document.querySelectorAll('[data-ark-state-anchor]')].some((a) => a.getClientRects().length)), 'state 1 shows nothing');
    check(await toolbarButton(app, 'States').count(), 'the States icon is gone');
    await until(async () => /\(2\)/.test(await toolbarButton(app, 'States').getAttribute('aria-label')), 'the States icon does not count 2 states');
  });
  await page.context().close();
});

/* ---------------------------------------------------------------- narrow */
await flow('narrow', async () => {
  const { app, pv, page, shot } = await openEditor(390, 844);
  const noSideScroll = async () => {
    const s = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vw: innerWidth }));
    const a = await app.evaluate(() => ({ doc: document.documentElement.scrollWidth, vw: innerWidth, root: document.getElementById('studioRoot').scrollWidth, rootW: document.getElementById('studioRoot').clientWidth }));
    check(s.doc <= s.vw && a.doc <= a.vw && a.root <= a.rootW, 'page-level horizontal scroll at 390px: ' + JSON.stringify({ s, a }));
  };
  await step('390px: the paragraph\'s bar fits the stage and does not cover it', async () => {
    await selectKey(app, P); await selected(app, P);
    await checkBar(app, TEXT);
    const bar = await app.locator('#selToolbar').boundingBox();
    check(bar.x >= 0 && bar.x + bar.width <= 390, 'the bar leaves the screen: ' + JSON.stringify(bar));
    await checkClear(app, pv, P, 'the paragraph');
    await noSideScroll();
    await shot('after-390-paragraph-bar');
  });
  await step('390px: a popover stays on screen', async () => {
    await openEach(app, page, TEXT);
    await openToolbarSection(app, 'Typography');
    await noSideScroll();
    await animationsSettled(app); await shot('after-390-paragraph-typography');
  });
  await step('390px: a container\'s longer bar wraps inside itself, never past the screen', async () => {
    await page.keyboard.press('Escape');
    await selectKey(app, DIV); await selected(app, DIV);
    await checkBar(app, CONTAINER);
    const bar = await app.locator('#selToolbar').boundingBox();
    check(bar.x >= 0 && bar.x + bar.width <= 390, 'the bar leaves the screen: ' + JSON.stringify(bar));
    await checkClear(app, pv, DIV, 'the container');
    await noSideScroll();
    await shot('after-390-container-bar');
  });
  await page.context().close();
});

await browser.close();
server.close();
fs.rmSync(WORK, { recursive: true, force: true });
if (errors.length) { failures += 1; console.log('\nFAIL console errors:\n  ' + [...new Set(errors)].join('\n  ')); }
else console.log('\nok   no console errors');
console.log(`\nscreenshots: ${SHOTS}`);
console.log(failures ? `\n${failures} failure(s)` : '\nall toolbar shell checks passed');
process.exit(failures ? 1 : 0);

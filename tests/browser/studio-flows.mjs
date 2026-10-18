/* =====================================================================
   REAL-BROWSER FLOWS for the merged CMS's contextual toolbar
   ---------------------------------------------------------------------
   Why this exists: after the Studio merge (admin-studio.html folded into
   admin-app.html + js/admin/admin.js), the toolbar's State group and
   Component instance sections were only verified by reading code. The
   owner's report -- "make into states does not work at all, I clicked it
   but nothing happened" -- is a defect you can only see by clicking. Every
   step here clicks the real page and asserts on the real outcome: the DOM
   inside the preview iframe, the files Save wrote, and the PUBLIC page
   (index.html with no preview flag) served from those files afterwards,
   because a feature that only works inside the editor is not working.

   Run:   node tests/browser/studio-flows.mjs [--only states,single,component,hide,motion,makecomp,points,statesui] [--headed] [--keep]
          (--keep leaves the scratch site copy, with whatever the flows saved, for inspection)
   Needs: Chromium from `npx playwright install chromium`.
   Screenshots go to $SHOTS (default: a temp folder, printed at the end).

   Each step prints `ok` or `FAIL <why>`; the process exits non-zero if any
   step failed. Steps inside one flow depend on the earlier ones, so a flow
   stops at its first failure; the other flows still run.
   ===================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { SITE, copySite, startHost, fakeFolder, appFrame, previewFrame, hasToolbarSection, toolbarSectionIsOpen, openToolbarSection, toolbarKey } from './harness.mjs';

const args = process.argv.slice(2);
const only = (args.includes('--only') ? args[args.indexOf('--only') + 1] : 'states,single,component,hide,motion,makecomp,points,statesui').split(',');
const SHOTS = process.env.SHOTS || fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-shots-'));
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-site-'));
const PORT = Number(process.env.PORT) || 3498;
const ORIGIN = `http://127.0.0.1:${PORT}`;
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
  /* every flow starts from the project's own saved content, not from what an earlier flow saved */
  fs.cpSync(path.join(SITE, 'js/content'), path.join(WORK, 'js/content'), { recursive: true });
  try { await run(); } catch { /* reported by step() */ }
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(probe, message, timeout = 5000) {
  const end = Date.now() + timeout; let last;
  while (Date.now() < end) {
    try { last = await probe(); } catch (error) { if (error instanceof StepFailure) throw error; last = null; /* a frame mid-navigation */ }
    if (last) return last; await wait(100);
  }
  throw new StepFailure(message);
}
const readSaved = (name) => fs.readFileSync(path.join(WORK, 'js/content', name), 'utf8');
/* the `ArkX.define({...});` JSON a Save wrote, parsed */
function savedJson(name) { const text = readSaved(name); return JSON.parse(text.slice(text.indexOf('.define(') + 8, text.lastIndexOf(')'))); }

copySite(WORK);
const server = await startHost(WORK, PORT);
const browser = await chromium.launch({ headless: !args.includes('--headed') });
const context = await browser.newContext({ viewport: { width: 1500, height: 950 } });
await fakeFolder(context, WORK);
/* The fake folder handle holds functions, so the app's "remember this folder" IndexedDB put
   cannot clone it -- an artefact of the harness, not of the app. */
const errors = [];
const harnessNoise = /could not be cloned/;
context.on('page', (p) => p.on('pageerror', (e) => { if (!harnessNoise.test(e.message)) errors.push(e.message); }));

async function openEditor() {
  const page = await context.newPage();
  page.on('dialog', (d) => d.dismiss());
  await page.goto(`${ORIGIN}/admin`);
  const app = await appFrame(page);
  await app.click('#modeDesignBtn');
  const pv = await previewFrame(app);
  await wait(400);
  return { page, app, pv, shot: (name) => page.screenshot({ path: path.join(SHOTS, name + '.png') }) };
}
const routeRow = (app, route) => app.locator('#pages li').filter({ has: app.locator('.sub', { hasText: new RegExp('^' + route + '$') }) }).first();
const toolbar = (app) => app.locator('#selToolbar');
/* how a toolbar section is drawn (an icon in #selToolbar, its controls in the one popover
   #selToolbarPop) is known only to the shell helpers in ./harness.mjs; flows name a section */
const section = openToolbarSection;
const statesIn = (pv) => pv.evaluate(() => ArkStates.get());
const onlyGroup = (states, route = '/') => { const groups = (states.routes[route]) || {}; const ids = Object.keys(groups); return ids.length === 1 ? Object.assign({ id: ids[0] }, groups[ids[0]]) : null; };
const navLink = (frame, text) => frame.locator('header nav.header-core-links > a', { hasText: text }).first();
/* what a visitor sees for one group: which state-0 members are displayed, which state anchors are */
const visible = (frame, groupId) => frame.evaluate((id) => {
  const shown = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).display !== 'none';
  const members = [...document.querySelectorAll('[data-ark-state-group="' + id + '"]:not([data-ark-state-anchor])')];
  const anchors = [...document.querySelectorAll('[data-ark-state-anchor][data-ark-state-group="' + id + '"]')];
  return { members: members.map(shown), anchors: anchors.filter(shown).map((a) => ({ index: Number(a.getAttribute('data-ark-state-index')), text: a.textContent.trim(), w: a.getBoundingClientRect().width })) };
}, groupId);
/* Playwright's own actionability check cannot see that an element in the PARENT document
   (the toolbar) covers a point inside the preview iframe -- its click "succeeds" and lands on
   the toolbar. That is exactly how "Make into states" did nothing, so every menu click first
   asks the editor document what is really on top at that point. */
async function clickMenuItem(page, app, pv, label) {
  await pv.locator('.ark-studio-menu').waitFor({ state: 'visible' });
  const item = pv.locator('.ark-studio-menu button', { hasText: label }).first();
  check(await item.isEnabled(), `"${label}" is disabled: ${await item.textContent()}`);
  const box = await item.boundingBox(), appBox = await (await page.$('#app')).boundingBox();
  const at = { x: box.x + box.width / 2 - appBox.x, y: box.y + box.height / 2 - appBox.y };
  const whatIsOnTop = () => app.evaluate(({ x, y }) => { const el = document.elementFromPoint(x, y); return el ? (el.id || el.tagName) + (el.closest('#selToolbar') ? ' inside #selToolbar' : '') : 'nothing'; }, at);
  /* a person takes longer than one message round trip to move to the item; allow the same */
  let onTop = await whatIsOnTop();
  for (let i = 0; i < 5 && onTop !== 'cmsPreview'; i++) { await wait(60); onTop = await whatIsOnTop(); }
  check(onTop === 'cmsPreview', `"${label}" is covered in the editor by ${onTop}, so a real click never reaches it`);
  await item.click();
}
/* the toolbar must sit beside what it edits, not on it: a covered element hides the very
   change the toolbar just made */
async function checkToolbarClear(app, element, what) {
  const a = await toolbar(app).boundingBox(), b = await element.boundingBox();
  check(a && b, 'toolbar or ' + what + ' has no box');
  const overlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  check(overlap < 0.05 * b.width * b.height, `the toolbar covers ${Math.round(100 * overlap / (b.width * b.height))}% of ${what}`);
}
async function saveViaShortcut(target) {
  /* Chromium's own Save Page dialog eats a real Ctrl/Cmd+S, so the shortcut is a synthetic
     keydown on whichever document has focus -- the same event the app's listener sees. */
  await target.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true, cancelable: true })));
}

/* ---------------------------------------------------------------- 1 */
await flow('states', async () => {
  const { page, app, pv, shot } = await openEditor();
  let group;
  await step('shift-select 3 nav links, right-click > Make into states creates a group', async () => {
    await navLink(pv, 'Overview').click();
    await navLink(pv, 'How it works').click({ modifiers: ['Shift'] });
    await navLink(pv, 'Mesh Explorer').click({ modifiers: ['Shift'] });
    await navLink(pv, 'Overview').click({ button: 'right' });
    await clickMenuItem(page, app, pv, 'Make into states');
    group = await until(async () => onlyGroup(await statesIn(pv)), 'no state group in the preview after Make into states');
    check(group.states.length === 1 && group.states[0].members.length === 3, 'state 0 should hold the 3 links: ' + JSON.stringify(group));
    await shot('states-01-made');
  });
  await step('toolbar shows the States section, open, without hunting for it', async () => {
    await until(async () => (await hasToolbarSection(app, 'States')) && toolbarSectionIsOpen(app, 'States'), 'the States section is missing or collapsed after Make into states');
  });
  await step('+ Add state adds state 1 WITH visible content and shows it', async () => {
    await (await section(app, 'States')).locator('button', { hasText: '+ Add state' }).click();
    group = await until(async () => { const g = onlyGroup(await statesIn(pv)); return g && g.states.length === 2 && g; }, 'state 1 was not added');
    check(group.current === 0, 'adding (and showing) state 1 changed the saved default to ' + group.current + ' -- showing is a preview, not a default');
    const v = await until(async () => { const v = await visible(pv, group.id); return v.anchors.length === 1 && v.anchors[0].w > 0 && v; }, 'state 1 shows nothing (empty or zero-size anchor)');
    check(v.members.every((m) => !m), 'state-0 links still visible while state 1 shows');
    check(/State 1/.test(v.anchors[0].text), 'state 1 content should read "State 1": ' + v.anchors[0].text);
    await shot('states-02-state1');
  });
  await step('state 1 gets its own words: select its block, edit the heading in Component instance', async () => {
    await pv.locator('[data-ark-state-anchor] [data-ark-component-key]:visible').first().click();
    /* the starter is derived from state 0 -- a nav link, so its text slot is `link` */
    const heading = (await section(app, 'Component instance')).locator('input[aria-label="link"]');
    await heading.fill('Pick a network'); await heading.evaluate((i) => i.dispatchEvent(new Event('change')));
    await until(async () => { const v = await visible(pv, group.id); return v.anchors.length === 1 && /Pick a network/.test(v.anchors[0].text); }, 'state 1 did not take the new heading');
    /* the block's root is display:contents (it lays out as its content), so measure what it shows */
    await checkToolbarClear(app, pv.locator('[data-ark-state-anchor] [data-ark-component-key]:visible > *').first(), 'the state 1 block');
    check(await hasToolbarSection(app, 'States'), 'selecting state 1\'s content no longer shows its States section');
  });
  await step('Preview state 0 from the toolbar brings the links back', async () => {
    await (await section(app, 'States')).locator('button', { hasText: 'Preview' }).first().click();
    await until(async () => { const v = await visible(pv, group.id); return v.members.every(Boolean) && v.anchors.length === 0; }, 'state 0 not shown after Preview');
  });
  await step('select ONE link inside state 0 > Use this element as trigger', async () => {
    await navLink(pv, 'How it works').click();
    const btn = (await section(app, 'States')).locator('button', { hasText: 'Use this element as trigger' });
    check(await btn.isEnabled(), '"Use this element as trigger" is disabled for a single nested link');
    await btn.click();
    group = await until(async () => { const g = onlyGroup(await statesIn(pv)); return g && /nav:1\/a:2$/.test(g.trigger) && g; }, 'trigger was not set to the "How it works" link');
  });
  await step('+ Add state again adds a third state with its own content', async () => {
    await (await section(app, 'States')).locator('button', { hasText: '+ Add state' }).click();
    group = await until(async () => { const g = onlyGroup(await statesIn(pv)); return g && g.states.length === 3 && g; }, 'state 2 was not added');
    await until(async () => { const v = await visible(pv, group.id); return v.anchors.length === 1 && v.anchors[0].index === 2 && /State 2/.test(v.anchors[0].text); }, 'state 2 content not visible');
    await shot('states-03-state2');
  });
  await step('switch states from the toolbar: 1, then 0', async () => {
    const previews = (await section(app, 'States')).locator('button', { hasText: 'Preview' });
    await previews.nth(1).click();
    await until(async () => { const v = await visible(pv, group.id); return v.anchors.length === 1 && v.anchors[0].index === 1; }, 'state 1 not shown from the toolbar');
    await (await section(app, 'States')).locator('button', { hasText: 'Preview' }).first().click();
    await until(async () => { const v = await visible(pv, group.id); return v.members.every(Boolean) && !v.anchors.length; }, 'state 0 not shown from the toolbar');
  });
  await step('Live mode: clicking the trigger cycles 0 > 1 > 2 > 0 and never navigates', async () => {
    await app.locator('#mode button[data-m="live"]').click(); await wait(400);
    const route = () => pv.evaluate(() => ArkUI.route.path());
    await navLink(pv, 'How it works').click();
    await until(async () => { const v = await visible(pv, group.id); return v.anchors.length === 1 && v.anchors[0].index === 1; }, 'clicking the trigger did not show state 1');
    check((await route()) === '/', 'clicking the trigger navigated to ' + (await route()));
    await pv.locator('[data-ark-state-anchor] [data-ark-component-key]:visible').first().click();
    await until(async () => { const v = await visible(pv, group.id); return v.anchors.length === 1 && v.anchors[0].index === 2; }, 'clicking state 1 (trigger hidden with state 0) did not move on to state 2 -- the group is stranded');
    await pv.locator('[data-ark-state-anchor] [data-ark-component-key]:visible').first().click();
    await until(async () => { const v = await visible(pv, group.id); return v.members.every(Boolean) && !v.anchors.length; }, 'clicking state 2 did not wrap back to state 0');
    await shot('states-04-live');
    await app.locator('#mode button[data-m="edit"]').click(); await wait(300);
  });
  await step('Save (Ctrl+S) writes states-data.js and components-data.js', async () => {
    await app.click('#connect');
    await until(() => app.evaluate(() => document.getElementById('connect').disabled), 'project folder did not connect');
    await navLink(pv, 'Stats').click();       /* focus is now inside the preview, as it is after any canvas click */
    await saveViaShortcut(pv);
    const saved = await until(() => { try { return onlyGroup(savedJson('states-data.js')); } catch { return null; } }, 'Ctrl+S with focus in the canvas did not write states-data.js');
    check(saved.states.length === 3 && /nav:1\/a:2$/.test(saved.trigger), 'saved group is wrong: ' + JSON.stringify(saved));
    const comps = savedJson('components-data.js');
    check(Object.keys(comps.routes['/'] || {}).filter((a) => a.startsWith('state-' + saved.id)).length === 2, 'saved components lack the 2 state anchors');
  });
  await step('reload: the editor preview still has the group', async () => {
    await page.close();
    const again = await openEditor();
    const g = await until(async () => onlyGroup(await statesIn(again.pv)), 'no group after reload');
    check(g.states.length === 3, 'reloaded group lost states');
    const v = await visible(again.pv, g.id);
    check(v.members.length === 3 && v.members.every(Boolean), 'state-0 links not tagged/visible after reload');
    await again.page.close();
  });
  await step('PUBLIC page (no preview flag): the trigger cycles states and never navigates', async () => {
    const pub = await context.newPage();
    await pub.goto(`${ORIGIN}/`);
    const main = pub.mainFrame();
    const g = await until(async () => onlyGroup(await main.evaluate(() => ArkStates.get())), 'public page has no state group');
    await until(async () => (await visible(main, g.id)).members.length === 3, 'public page never tagged the state-0 links');
    await navLink(main, 'How it works').click();
    await until(async () => { const v = await visible(main, g.id); return v.anchors.length === 1 && /Pick a network/.test(v.anchors[0].text); }, 'public: clicking the trigger did not show state 1 with its edited heading');
    check(new URL(pub.url()).pathname === '/', 'public: the trigger navigated to ' + pub.url());
    await pub.screenshot({ path: path.join(SHOTS, 'states-05-public-state1.png') });
    await main.locator('[data-ark-state-anchor] [data-ark-component-key]:visible').first().click();
    await until(async () => { const v = await visible(main, g.id); return v.anchors.length === 1 && /State 2/.test(v.anchors[0].text); }, 'public: state 1 did not advance to state 2');
    await main.locator('[data-ark-state-anchor] [data-ark-component-key]:visible').first().click();
    await until(async () => (await visible(main, g.id)).members.every(Boolean), 'public: did not wrap back to state 0');
    await pub.close();
  });
});

/* ---------------------------------------------------------------- 2 */
await flow('single', async () => {
  const { page, app, pv, shot } = await openEditor();
  const NAV = 'path:div:1/header:1/nav:1';
  let group;
  await step('click the empty gap inside the nav selects the whole container', async () => {
    const a = await navLink(pv, 'Overview').boundingBox(), b = await navLink(pv, 'How it works').boundingBox();
    await pv.locator('header nav.header-core-links').click({ position: { x: (a.x + a.width + b.x) / 2 - (await pv.locator('header nav.header-core-links').boundingBox()).x, y: a.height / 2 } });
    /* asked of the preview, not of the toolbar's text: the outline is drawn around exactly the selection */
    await until(() => pv.evaluate(() => { const box = document.querySelector('.ark-studio-box'), nav = document.querySelector('header nav.header-core-links'); if (!box || box.hidden) return false; const a = box.getBoundingClientRect(), b = nav.getBoundingClientRect(); return Math.abs(a.left - b.left) < 2 && Math.abs(a.width - b.width) < 2 && Math.abs(a.height - b.height) < 2; }), 'the nav container is not the selection');
  });
  await step('right-click > Make into states works with exactly one (container) layer', async () => {
    await navLink(pv, 'Overview').click({ button: 'right' });
    await clickMenuItem(page, app, pv, 'Make into states');
    group = await until(async () => onlyGroup(await statesIn(pv)), 'no group made from one container');
    check(group.states[0].members.length === 1 && group.states[0].members[0] === NAV, 'state 0 should be the nav: ' + JSON.stringify(group.states[0]));
  });
  await step('a nested link inside the container still shows the States section, and becomes the trigger', async () => {
    await navLink(pv, 'Stats').click();
    const btn = (await section(app, 'States')).locator('button', { hasText: 'Use this element as trigger' });
    await btn.click();
    group = await until(async () => { const g = onlyGroup(await statesIn(pv)); return g && /nav:1\/a:4$/.test(g.trigger) && g; }, 'trigger not set to the nested Stats link');
  });
  await step('+ Add state, then Live: trigger > state 1 > (trigger hidden) click state 1 > back to 0', async () => {
    await (await section(app, 'States')).locator('button', { hasText: '+ Add state' }).click();
    await until(async () => { const g = onlyGroup(await statesIn(pv)); return g && g.states.length === 2; }, 'state 1 not added');
    await (await section(app, 'States')).locator('button', { hasText: 'Preview' }).first().click();
    await app.locator('#mode button[data-m="live"]').click(); await wait(400);
    await navLink(pv, 'Stats').click();
    await until(async () => { const v = await visible(pv, group.id); return v.anchors.length === 1 && v.members.every((m) => !m); }, 'Stats (trigger) did not show state 1');
    await shot('single-01-state1');
    await pv.locator('[data-ark-state-anchor] [data-ark-component-key]:visible').first().click();
    await until(async () => { const v = await visible(pv, group.id); return !v.anchors.length && v.members.every(Boolean); }, 'state 1 could not be clicked back to state 0 -- stranded');
    await app.locator('#mode button[data-m="edit"]').click(); await wait(300);
  });
  await step('the menu explains a disabled item instead of only greying it out', async () => {
    await navLink(pv, 'Overview').click();
    await navLink(pv, 'Overview').click({ button: 'right' });
    const text = await pv.locator('.ark-studio-menu button', { hasText: 'Distribute horizontally' }).textContent();
    check(/needs 3\+ layers/.test(text), 'disabled Distribute does not say what it needs: ' + text);
    await page.close();
  });
});

/* ---------------------------------------------------------------- 3 */
await flow('component', async () => {
  const { page, app, pv, shot } = await openEditor();
  let master, instance;
  await step('open a route with an insertion point', async () => {
    await app.click('#tabPages');
    const row = routeRow(app, '/download');
    await row.click();
    await until(() => pv.evaluate(() => ArkUI.route.path() === '/download' && !!document.querySelector('[data-ark-insert]')), 'the preview did not open /download with an anchor');
    await wait(500);
  });
  await step('Library > New block > Create block makes a master', async () => {
    await app.click('#tabLib');
    const lib = app.locator('#libPane');
    await lib.locator('select.ctl').first().selectOption('RBLOCK_TEXT_V1');
    await lib.locator('input[data-prop="heading"]').fill('Hello from a block');
    await lib.locator('button', { hasText: 'Create block' }).click();
    master = await until(async () => { const c = await pv.evaluate(() => ArkComponents.get()); const id = Object.keys(c.masters)[0]; return id && Object.assign({ id }, c.masters[id]); }, 'no master created');
  });
  await step('Library > Insert puts an instance on the page', async () => {
    const lib = app.locator('#libPane');
    await lib.locator('.myrow', { hasText: master.label }).locator('button', { hasText: 'Insert' }).click();
    instance = await until(() => pv.evaluate(() => { const el = document.querySelector('[data-ark-component-key]'); return el && { key: el.getAttribute('data-ark-component-key'), text: el.textContent.trim() }; }), 'no instance rendered');
    check(instance.text.includes('Hello from a block'), 'instance text is ' + instance.text);
    await shot('component-01-inserted');
  });
  await step('selecting the instance shows its prop fields; editing one updates the preview', async () => {
    await pv.locator('[data-ark-component-key]').first().click();
    const sec = await section(app, 'Component instance');
    await checkToolbarClear(app, pv.locator('[data-ark-component-key]').first(), 'the selected instance');
    const heading = sec.locator('input[aria-label="heading"]');
    await heading.fill('Overridden heading'); await heading.press('Enter'); await heading.evaluate((i) => i.dispatchEvent(new Event('change')));
    await until(() => pv.evaluate(() => document.querySelector('[data-ark-component-key]').textContent.includes('Overridden heading')), 'the preview did not show the override');
    await wait(600); await shot('component-02-override');
  });
  await step('Reset overrides restores the master text', async () => {
    await (await section(app, 'Component instance')).locator('button', { hasText: 'Reset overrides' }).click();
    await until(() => pv.evaluate(() => document.querySelector('[data-ark-component-key]').textContent.includes('Hello from a block')), 'reset did not restore the master heading');
  });
  await step('override again, Save, reload: the override persisted', async () => {
    await pv.locator('[data-ark-component-key]').first().click();
    const heading = (await section(app, 'Component instance')).locator('input[aria-label="heading"]');
    await heading.fill('Saved override'); await heading.evaluate((i) => i.dispatchEvent(new Event('change')));
    await until(() => pv.evaluate(() => document.querySelector('[data-ark-component-key]').textContent.includes('Saved override')), 'override not shown');
    await app.click('#connect');
    await until(() => app.evaluate(() => document.getElementById('connect').disabled), 'project folder did not connect');
    await app.click('#btnCmsSave');
    await until(() => { try { return JSON.stringify(savedJson('components-data.js')).includes('Saved override'); } catch { return false; } }, 'Save did not write the override to components-data.js');
    await page.close();
    const again = await openEditor();
    await again.app.click('#tabPages');
    await routeRow(again.app, '/download').click();
    await until(() => again.pv.evaluate(() => { const el = document.querySelector('[data-ark-component-key]'); return el && el.textContent.includes('Saved override'); }), 'after reload the instance/override is gone');
    const pub = await context.newPage(); await pub.goto(`${ORIGIN}/download`);
    await until(() => pub.evaluate(() => { const el = document.querySelector('[data-ark-component-key]'); return el && el.textContent.includes('Saved override'); }), 'the PUBLIC /download page does not show the saved instance');
    await pub.close();
    await again.page.close();
  });
  await step('Remove instance takes it off the page', async () => {
    const again = await openEditor();
    await again.app.click('#tabPages');
    await routeRow(again.app, '/download').click();
    await until(() => again.pv.evaluate(() => !!document.querySelector('[data-ark-component-key]')), 'instance missing before remove');
    await again.pv.locator('[data-ark-component-key]').first().click();
    await (await section(again.app, 'Component instance')).locator('button', { hasText: 'Remove instance' }).click();
    await until(() => again.pv.evaluate(() => !document.querySelector('[data-ark-component-key]')), 'instance still on the page after Remove instance');
    await again.app.click('#connect'); await until(() => again.app.evaluate(() => document.getElementById('connect').disabled), 'folder not connected');
    await again.app.click('#btnCmsSave');
    await until(() => { try { return !JSON.stringify(savedJson('components-data.js').routes).includes('"main"'); } catch { return false; } }, 'Save after Remove instance still writes the instance');
    await again.page.close();
  });
});

/* ---------------------------------------------------------------- 4 */
await flow('hide', async () => {
  const { page, app, pv, shot } = await openEditor();
  const KEY = 'path:div:1/header:1/nav:1/a:4';            /* the Stats link */
  const shown = () => pv.evaluate((key) => { const el = [...document.querySelectorAll('[data-ark-layout-key]')].find((e) => e.getAttribute('data-ark-layout-key') === key); return !!el && getComputedStyle(el).display !== 'none'; }, KEY);
  const eye = () => app.locator('#layers li[aria-selected="true"] .eye-toggle').first();
  await step('Layers eye hides the selected layer in the preview', async () => {
    await app.click('#tabLayers');
    await navLink(pv, 'Stats').click();
    await until(async () => (await eye().count()) > 0, 'the selected layer has no row in Layers');
    await eye().click();
    await until(async () => !(await shown()), 'Stats is still visible after Hide');
    await until(async () => (await eye().getAttribute('aria-pressed')) === 'true', 'the eye does not show the layer as hidden');
    await shot('hide-01-hidden');
  });
  await step('the same eye shows it again (not stuck hidden)', async () => {
    await eye().click();
    await until(() => shown(), 'Stats stays hidden after Show -- stuck hidden');
  });
  await step('hide, Save, reload: still hidden; show, Save, reload: visible', async () => {
    await eye().click();
    await until(async () => !(await shown()), 'not hidden');
    await app.click('#connect'); await until(() => app.evaluate(() => document.getElementById('connect').disabled), 'folder not connected');
    await app.click('#btnCmsSave');
    await until(() => readSaved('layout-data.js').includes(KEY), 'Save did not write the hidden layer to layout-data.js');
    await page.close();
    let again = await openEditor();
    await until(async () => !(await again.pv.evaluate((key) => { const el = [...document.querySelectorAll('[data-ark-layout-key]')].find((e) => e.getAttribute('data-ark-layout-key') === key); return !!el && getComputedStyle(el).display !== 'none'; }, KEY)), 'hidden layer is visible again after reload');
    await again.app.click('#tabLayers');
    /* a hidden element cannot be clicked on the canvas; its Layers row is the way back */
    const row = again.app.locator('#layers li').filter({ has: again.app.locator('.eye-toggle[aria-pressed="true"]') }).first();
    await until(async () => (await row.count()) > 0, 'no hidden row in Layers after reload');
    await row.locator('.eye-toggle').click();
    await until(() => again.pv.evaluate((key) => { const el = [...document.querySelectorAll('[data-ark-layout-key]')].find((e) => e.getAttribute('data-ark-layout-key') === key); return !!el && getComputedStyle(el).display !== 'none'; }, KEY), 'Show from Layers after reload did not bring it back');
    await again.app.click('#connect'); await until(() => again.app.evaluate(() => document.getElementById('connect').disabled), 'folder not connected');
    await again.app.click('#btnCmsSave');
    await until(() => !/"display":\s*"hide"/.test(readSaved('layout-data.js')), 'Save after Show still records the layer as hidden');
    await again.page.close();
  });
});

/* ---------------------------------------------------------------- 5 */
await flow('motion', async () => {
  const { page, app, pv, shot } = await openEditor();
  await step('Background transition popover: a changed value reaches the preview', async () => {
    await app.click('#btnCanvasTransitions');
    const pop = app.locator('h4', { hasText: 'Background transition' }).locator('xpath=..');
    await until(async () => (await pop.count()) > 0, 'the Background popover did not open');
    const out = pop.locator('input[aria-label="Fade out (ms)"]');
    await out.fill('640'); await out.evaluate((i) => i.dispatchEvent(new Event('change')));
    await until(() => pv.evaluate(() => ArkCanvasTransitions.get().outDuration === 640), 'the preview did not take Fade out = 640');
    await pop.locator('button', { hasText: 'Fade + scale' }).click();
    await until(() => pv.evaluate(() => ArkCanvasTransitions.get().effect !== 'fade'), 'the preview did not take the effect');
    await pop.locator('button', { hasText: 'Preview this transition' }).click();
    await until(() => pv.evaluate(() => { const el = document.querySelector('[data-ark-layer="persistent"]'); return !!el && el.style.opacity === '0' && el.style.transition.includes('640ms'); }), 'Preview this transition did not fade the background layer out over the edited 640 ms', 1500);
    await shot('motion-01-background');
    await page.keyboard.press('Escape');
  });
  await step('element In / out animation: a changed value reaches the preview and Preview animates it', async () => {
    await navLink(pv, 'Overview').click();
    const sec = await section(app, 'In / out animation');
    await sec.locator('button', { hasText: 'Left' }).click();
    await until(() => pv.evaluate(() => JSON.stringify(ArkElementMotion.get()).includes('"left"')), 'the preview did not take Direction = Left');
    const dur = (await section(app, 'In / out animation')).locator('input[aria-label="Duration (ms)"]');
    await dur.fill('480'); await dur.evaluate((i) => i.dispatchEvent(new Event('change')));
    await until(() => pv.evaluate(() => JSON.stringify(ArkElementMotion.get()).includes('480')), 'the preview did not take Duration = 480');
    await (await section(app, 'In / out animation')).locator('button', { hasText: /^Preview$/ }).click();
    await until(() => pv.evaluate(() => [...document.querySelectorAll('header nav.header-core-links > a, header nav.header-core-links > a *')].some((el) => el.getAnimations().some((a) => a.effect && a.effect.getKeyframes().some((k) => String(k.opacity) === '0' && /translate3d\(-/.test(k.transform || ''))))), 'Preview did not play a Left fade on the selected element', 1500);
    await shot('motion-02-element');
  });
  await step('Save writes both, and a reload keeps them', async () => {
    await app.click('#connect'); await until(() => app.evaluate(() => document.getElementById('connect').disabled), 'folder not connected');
    await app.click('#btnCmsSave');
    await until(() => { try { return savedJson('canvas-transitions-data.js').outDuration === 640; } catch { return false; } }, 'canvas-transitions-data.js was not saved');
    await until(() => { try { return JSON.stringify(savedJson('element-motion-data.js')).includes('480'); } catch { return false; } }, 'element-motion-data.js was not saved');
    await page.close();
    const again = await openEditor();
    check(await again.pv.evaluate(() => ArkCanvasTransitions.get().outDuration === 640 && JSON.stringify(ArkElementMotion.get()).includes('480')), 'reloaded preview lost the saved values');
    await again.page.close();
  });
});

/* ---------------------------------------------------------------- shared by 6-8 */
async function gotoRoute(app, pv, route) {
  await app.click('#tabPages');
  await routeRow(app, route).click();
  await until(() => pv.evaluate((r) => ArkUI.route.path() === r && !!document.querySelector('[data-ark-layout-key]'), route), 'the preview did not open ' + route, 40000)
    .catch(async (e) => { await app.page().screenshot({ path: path.join(SHOTS, 'FAILED-goto' + route.replace(/\W/g, '-') + '.png') }); throw new StepFailure(e.message + ' (preview is at ' + await pv.evaluate(() => location.href + ' route=' + (window.ArkUI && ArkUI.route.path())).catch(() => '?') + ')'); });
  await wait(500);
}
async function connectAndSave(app) {
  if (!(await app.evaluate(() => document.getElementById('connect').disabled))) {
    await app.click('#connect');
    await until(() => app.evaluate(() => document.getElementById('connect').disabled), 'project folder did not connect');
  }
  await app.click('#btnCmsSave');
}
const componentsIn = (frame) => frame.evaluate(() => ArkComponents.get());
/* the text each instance on the page shows, keyed by instance key */
const instanceTexts = (frame) => frame.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-ark-component-key]')].map((el) => [el.getAttribute('data-ark-component-key'), el.textContent.replace(/\s+/g, ' ').trim()])));
/* the box an instance occupies on screen (its root is display:contents: the union of what it lays out) */
const instanceBox = (frame, key) => frame.evaluate((k) => {
  const el = [...document.querySelectorAll('[data-ark-component-key]')].find((e) => e.getAttribute('data-ark-component-key') === k);
  const rects = el ? [...el.children].map((c) => c.getBoundingClientRect()).filter((r) => r.width && r.height) : [];
  if (!rects.length) return null;
  const left = Math.min(...rects.map((r) => r.left)), top = Math.min(...rects.map((r) => r.top)), right = Math.max(...rects.map((r) => r.right)), bottom = Math.max(...rects.map((r) => r.bottom));
  return { x: left, y: top, w: right - left, h: bottom - top };
}, key);
async function libRow(app, label) {
  await app.click('#tabLib');
  const row = app.locator('#libPane .myrow', { hasText: label }).first();
  await until(async () => (await row.count()) > 0, `the Library has no "${label}" row`);
  return row;
}
async function setDefinition(app, label, prop, value) {
  const row = await libRow(app, label);
  if ((await row.locator('button', { hasText: 'Edit' }).getAttribute('aria-expanded')) !== 'true') await row.locator('button', { hasText: 'Edit' }).click();
  const input = app.locator(`#libPane .lib-definition input[aria-label="Definition ${prop}"]`);
  await until(async () => (await input.count()) > 0, `the definition editor has no "${prop}" field`);
  await input.fill(value); await input.evaluate((i) => i.dispatchEvent(new Event('change')));
}

/* ---------------------------------------------------------------- 6 */
await flow('makecomp', async () => {
  const { page, app, pv, shot } = await openEditor();
  let master, origin, other;
  const H1 = '#download-title', P = '#download-title + p';
  await step('select a heading + paragraph on /download, right-click > Make into component', async () => {
    await gotoRoute(app, pv, '/download');
    /* in the preview's own coordinates, like instanceBox() -- a locator's boundingBox() is in the editor page's */
    const before = await pv.evaluate((s) => document.querySelector(s).getBoundingClientRect().toJSON(), H1);
    await pv.locator(H1).click();
    await pv.locator(P).click({ modifiers: ['Shift'] });
    await pv.locator(H1).click({ button: 'right' });
    await clickMenuItem(page, app, pv, 'Make into component');
    const c = await until(async () => { const c = await componentsIn(pv); const id = Object.keys(c.masters)[0]; return id && c.masters[id].resolver === 'RBLOCK_CAPTURED_V1' && Object.assign(c, { id }); }, 'no captured master after Make into component');
    master = Object.assign({ id: c.id }, c.masters[c.id]);
    const spot = Object.keys((c.spots || {})['/download'] || {})[0];
    check(spot && c.spots['/download'][spot].replaces.length === 2, 'the instance does not stand in for both selected elements: ' + JSON.stringify(c.spots));
    origin = c.routes['/download'][spot][0].key;
    check(JSON.stringify(Object.keys(master.props)) === JSON.stringify(['heading', 'paragraph']), 'props are not derived from the selection\'s text: ' + JSON.stringify(master.props));
    const hidden = await pv.evaluate(([a, b]) => [a, b].map((s) => getComputedStyle(document.querySelector(s)).display), [H1, P]);
    check(hidden.every((d) => d === 'none'), 'the original elements are still showing: ' + hidden);
    const texts = await instanceTexts(pv);
    check(/Start a local miner/.test(texts[origin]) && /source packages/.test(texts[origin]), 'the instance does not show the captured text: ' + texts[origin]);
    await wait(400); await shot('makecomp-01-made');
    const box = await instanceBox(pv, origin);
    check(box && Math.abs(box.y - before.y) < 4 && Math.abs(box.x - before.x) < 4, `the instance is not where the selection was: ${JSON.stringify(box)} vs ${JSON.stringify(before)} ` + JSON.stringify(c.spots) + JSON.stringify(master.tree).slice(0, 400));
    await section(app, 'Component instance');
    await wait(400); await shot('makecomp-01-made');
  });
  await step('the Library lists it; on /chain, Insert puts a second instance on another page', async () => {
    await libRow(app, master.label);
    await gotoRoute(app, pv, '/chain');
    const row = await libRow(app, master.label);
    /* the page's places arrive with the preview's ready message */
    await until(async () => /1 place to insert on this page: Page slot "main"/.test(await app.locator('#libPane').textContent()), '/chain\'s page slot is not offered: ' + await app.locator('#libPane').textContent());
    await row.locator('button', { hasText: 'Insert' }).click();
    other = await until(async () => { const t = await instanceTexts(pv); const k = Object.keys(t)[0]; return k && /Start a local miner/.test(t[k]) && k; }, 'no instance on /chain after Insert');
    const box = await instanceBox(pv, other);
    check(box && box.w > 100 && box.h > 20, 'the /chain instance is not visibly sized: ' + JSON.stringify(box));
    await wait(400); await shot('makecomp-02-other-page');
  });
  await step('editing the definition updates both instances', async () => {
    await setDefinition(app, master.label, 'heading', 'Run DEFXN from source');
    await until(async () => /Run DEFXN from source/.test((await instanceTexts(pv))[other]), 'the /chain instance did not follow the definition');
    await gotoRoute(app, pv, '/download');
    await until(async () => /Run DEFXN from source/.test((await instanceTexts(pv))[origin]), 'the /download instance did not follow the definition');
  });
  await step('override one instance (on /chain) from the toolbar', async () => {
    await gotoRoute(app, pv, '/chain');
    await pv.locator('[data-ark-component-key] p').first().click();
    const field = (await section(app, 'Component instance')).locator('input[aria-label="paragraph"]');
    await field.fill('Only on the chain page.'); await field.evaluate((i) => i.dispatchEvent(new Event('change')));
    await until(async () => /Only on the chain page/.test((await instanceTexts(pv))[other]), 'the override did not show');
    check(/source packages/.test((await componentsIn(pv)).masters[master.id].props.paragraph), 'the override leaked into the definition');
  });
  await step('detach the other one (on /download); a later definition edit no longer reaches it', async () => {
    await gotoRoute(app, pv, '/download');
    await pv.locator('[data-ark-component-key] h1').first().click();
    await (await section(app, 'Component instance')).locator('button', { hasText: 'Detach' }).click();
    await until(async () => { const c = await componentsIn(pv); const spot = Object.keys(c.spots['/download'])[0]; const m = c.masters[c.routes['/download'][spot][0].masterId]; return m && m.detached; }, 'the instance was not detached');
    await until(async () => (await openToolbarSection(app, 'Component instance')).locator('p.hint', { hasText: 'Detached' }).count(), 'the toolbar does not say the instance is detached', 8000)
      .catch(async (e) => { throw new StepFailure(e.message + ': pop=' + JSON.stringify((await app.locator('#selToolbarPop').textContent()).slice(0, 400)) + ' bar=' + JSON.stringify(await toolbar(app).evaluate((b) => [...b.querySelectorAll('.tb-btn')].map((x) => x.dataset.name + ':' + x.getAttribute('aria-expanded'))))); });
    await setDefinition(app, master.label, 'heading', 'Third heading');
    await wait(400);
    check(/Run DEFXN from source/.test((await instanceTexts(pv))[origin]), 'the detached instance followed a definition edit');
    await gotoRoute(app, pv, '/chain');
    await until(async () => { const t = (await instanceTexts(pv))[other]; return /Third heading/.test(t) && /Only on the chain page/.test(t); }, 'the attached instance lost the definition edit or its override', 15000)
      .catch(async (e) => { throw new StepFailure(e.message + ': ' + JSON.stringify(await instanceTexts(pv)) + ' ' + JSON.stringify((await componentsIn(pv)).masters[master.id].props)); });
    await wait(400); await shot('makecomp-03-chain-after-detach');
  });
  await step('Save writes the component, its spot and the detached copy', async () => {
    await connectAndSave(app);
    const saved = await until(() => { try { const c = savedJson('components-data.js'); return Object.keys(c.masters).length === 2 && c; } catch { return null; } }, 'components-data.js was not saved with 2 masters');
    check(saved.masters[master.id].props.heading === 'Third heading', 'saved definition is wrong');
    check(Object.keys(saved.spots['/download']).length === 1, 'saved spot is missing');
    await page.close();
  });
  await step('reload the editor: both pages still show their instance', async () => {
    const again = await openEditor();
    await gotoRoute(again.app, again.pv, '/download');
    await until(async () => /Run DEFXN from source/.test(Object.values(await instanceTexts(again.pv)).join()), 'after reload /download lost its (detached) instance');
    await gotoRoute(again.app, again.pv, '/chain');
    await until(async () => /Third heading.*Only on the chain page/.test(Object.values(await instanceTexts(again.pv)).join()), 'after reload /chain lost its instance or override');
    await again.page.close();
  });
  await step('PUBLIC pages: /download shows the detached copy in place of the originals, /chain the instance with its override', async () => {
    const pub = await context.newPage();
    await pub.goto(`${ORIGIN}/download`);
    const main = pub.mainFrame();
    await until(async () => /Run DEFXN from source/.test(Object.values(await instanceTexts(main)).join()), 'public /download does not show the component');
    check(await main.evaluate((s) => getComputedStyle(document.querySelector(s)).display === 'none', H1), 'public /download still shows the original heading');
    await wait(1500); /* past the route's entrance animation */
    await pub.screenshot({ path: path.join(SHOTS, 'makecomp-04-public-download.png') });
    await pub.goto(`${ORIGIN}/chain`);
    await until(async () => /Third heading.*Only on the chain page/.test(Object.values(await instanceTexts(main)).join()), 'public /chain does not show the instance with its override');
    await wait(1500); /* past the route's entrance animation */
    await pub.screenshot({ path: path.join(SHOTS, 'makecomp-05-public-chain.png') });
    await pub.close();
  });
  await step('SSR (the bot render, api/lib/render-core.mjs) has the components and not the replaced originals', async () => {
    const { readIndexHtml, renderDocument, createLocalResources } = await import('../../api/lib/render-core.mjs');
    const html = await readIndexHtml(WORK);
    const download = await renderDocument({ html, url: 'https://defxn.com/download', resources: createLocalResources(WORK), root: WORK, timeoutMs: 30000 });
    check(/data-ark-component-key[^>]*>[\s\S]*Run DEFXN from source/.test(download), 'SSR /download lacks the component');
    check(!/id="download-title"/.test(download), 'SSR /download still carries the replaced original heading');
    const chain = await renderDocument({ html, url: 'https://defxn.com/chain', resources: createLocalResources(WORK), root: WORK, timeoutMs: 30000 });
    check(/Third heading/.test(chain) && /Only on the chain page/.test(chain), 'SSR /chain lacks the instance or its override');
  });
});

/* ---------------------------------------------------------------- 7 */
await flow('points', async () => {
  const { page, app, pv, shot } = await openEditor();
  let dialogs = 0; page.on('dialog', () => { dialogs += 1; });
  const pointsNote = () => app.locator('#libPane .libsec').first().textContent();
  await step('/about: its 0px-wide page slot is not offered, and says why', async () => {
    await gotoRoute(app, pv, '/about');
    await app.click('#tabLib');
    const lib = app.locator('#libPane');
    await lib.locator('select.ctl').first().selectOption('RBLOCK_TEXT_V1');
    await lib.locator('input[data-prop="heading"]').fill('Point test block');
    await lib.locator('button', { hasText: 'Create block' }).click();
    const row = await libRow(app, 'Text block');
    await until(async () => /Not offered: Page slot "main" \(0px wide/.test(await pointsNote()), 'the Library does not name the 0px slot and why: ' + await pointsNote());
    check(await row.locator('button', { hasText: 'Insert' }).isDisabled(), 'Insert is enabled with only an invisible place to put the block');
    check(/select an element/i.test(await row.locator('button', { hasText: 'Insert' }).getAttribute('title')), 'the disabled Insert does not say what it needs');
  });
  await step('/about: a place after a selection inside the same 0px-wide layout is not offered either -- the rule is geometry, not a page list', async () => {
    /* /about's whole page section is 0px wide at this size (its continuity host has no width), so
       every element in it sits in a 0px column; the one readable word overflows it */
    await pv.locator('section.ark-page :is(h1,h2,h3,p,span,a):visible').first().click();
    await until(async () => /Not offered:.*After the selection.*0px wide/.test(await pointsNote()), '"after the selection" inside a 0px column is offered: ' + await pointsNote());
    const row = await libRow(app, 'Text block');
    check(await row.locator('button', { hasText: 'Insert' }).isDisabled(), 'Insert is enabled although every place on /about is invisible');
    await shot('points-01-about-not-offered');
  });
  await step('/download: two places -> an in-panel picker, never prompt(); hovering a place outlines it in the preview', async () => {
    await gotoRoute(app, pv, '/download');
    await pv.locator('#download-title').click();
    const row = await libRow(app, 'Text block');
    await until(async () => /2 places to insert/.test(await pointsNote()), 'expected 2 places (page slot + after the selection): ' + await pointsNote());
    await row.locator('button', { hasText: 'Insert' }).click();
    const options = app.locator('#libPane .lib-picker .lib-point');
    await until(async () => (await options.count()) === 2, 'the picker does not list the 2 places');
    check(dialogs === 0, 'a browser dialog opened');
    await options.filter({ hasText: 'Page slot' }).hover();
    const slotMarker = await until(() => pv.evaluate(() => { const m = document.querySelector('.ark-studio-point'); const a = document.querySelector('[data-ark-insert="main"]').getBoundingClientRect(); return m && { m: m.getBoundingClientRect().toJSON(), a: a.toJSON() }; }), 'hovering a place draws nothing in the preview');
    check(Math.abs(slotMarker.m.left - slotMarker.a.left) < 2 && Math.abs(slotMarker.m.top - slotMarker.a.top) < 2, 'the outline is not on the page slot: ' + JSON.stringify(slotMarker));
    await options.filter({ hasText: 'After the selection' }).hover();
    await until(() => pv.evaluate(() => { const m = document.querySelector('.ark-studio-point'), h = document.getElementById('download-title').getBoundingClientRect(); return m && Math.abs(m.getBoundingClientRect().top - h.bottom) < 4; }), 'hovering "After the selection" does not mark the end of the heading');
    await shot('points-02-picker');
    await options.filter({ hasText: 'After the selection' }).click();
    await until(() => pv.evaluate(() => { const spot = document.getElementById('download-title').nextElementSibling; return !!spot && spot.hasAttribute('data-ark-spot') && /Point test block/.test(spot.textContent); }), 'the block did not go right after the heading', 12000).catch(async (e) => { throw new StepFailure(e.message + ': ' + JSON.stringify((await componentsIn(pv)).spots) + ' next=' + await pv.evaluate(() => { const n = document.getElementById('download-title').nextElementSibling; return n && JSON.stringify(n.textContent); }) + ' lib=' + (await app.locator('#libPane').textContent()).slice(0, 300)); });
    const w = await pv.evaluate(() => document.getElementById('download-title').nextElementSibling.querySelector('[data-ark-component-key]').getBoundingClientRect().width);
    check(w > 40, 'the block inserted after the heading is not visibly wide: ' + w);
    check(await pv.evaluate(() => !document.querySelector('.ark-studio-point')), 'the outline stayed after inserting');
    check(dialogs === 0, 'a browser dialog opened');
  });
  await step('a showing state\'s own slot is never offered as a place', async () => {
    await gotoRoute(app, pv, '/');
    await navLink(pv, 'Overview').click();
    await navLink(pv, 'Overview').click({ button: 'right' });
    await clickMenuItem(page, app, pv, 'Make into states');
    await (await section(app, 'States')).locator('button', { hasText: '+ Add state' }).click();
    await until(() => pv.evaluate(() => !!document.querySelector('[data-ark-state-anchor]:not([style*="none"])')), 'state 1 not showing');
    await pv.locator('[data-ark-state-anchor] a').first().click();
    await app.click('#tabLib');
    await until(async () => !/state-/.test(await pointsNote()) && /No visible place|place/.test(await pointsNote()), 'a state slot is offered: ' + await pointsNote());
    await page.close();
  });
});

/* ---------------------------------------------------------------- 8 */
await flow('statesui', async () => {
  const { page, app, pv, shot } = await openEditor();
  let group;
  await step('+ Add state in a nav seeds a nav LINK sized like its neighbours, not a big heading', async () => {
    await navLink(pv, 'Overview').click();
    await navLink(pv, 'How it works').click({ modifiers: ['Shift'] });
    await navLink(pv, 'Mesh Explorer').click({ modifiers: ['Shift'] });
    await navLink(pv, 'Overview').click({ button: 'right' });
    await clickMenuItem(page, app, pv, 'Make into states');
    group = await until(async () => onlyGroup(await statesIn(pv)), 'no group');
    const linkSize = await pv.evaluate(() => getComputedStyle(document.querySelector('header nav.header-core-links > a')).fontSize);
    await (await section(app, 'States')).locator('button', { hasText: '+ Add state' }).click();
    const seeded = await until(() => pv.evaluate(() => { const a = document.querySelector('[data-ark-state-anchor]:not([style*="none"])'); return a && { tags: [...a.querySelectorAll('h1,h2,h3,a')].map((e) => e.tagName), size: a.querySelector('a') && getComputedStyle(a.querySelector('a')).fontSize, text: a.textContent.trim() }; }), 'state 1 shows nothing');
    check(seeded.tags.join() === 'A', 'state 1 starter is not a single link: ' + seeded.tags);
    check(seeded.size === linkSize, `state 1 starter is ${seeded.size}, its neighbours ${linkSize}`);
    check(seeded.text === 'State 1', 'state 1 starter text: ' + seeded.text);
    await wait(300); await shot('statesui-01-starter');
  });
  await step('a selected state-0 link hidden by switching states: the outline follows to what is showing', async () => {
    await (await section(app, 'States')).locator('button', { hasText: 'Preview' }).first().click();     /* back to state 0 */
    await until(async () => (await visible(pv, group.id)).members.every(Boolean), 'state 0 not shown');
    await navLink(pv, 'How it works').click();
    await (await section(app, 'States')).locator('button', { hasText: 'Preview' }).nth(0).click();     /* state 1 (0 is "Showing") */
    const r = await until(() => pv.evaluate(() => {
      const box = document.querySelector('.ark-studio-box'), anchor = document.querySelector('[data-ark-state-anchor]:not([style*="none"])');
      if (!box || box.hidden || !anchor) return null;
      const b = box.getBoundingClientRect(), a = anchor.getBoundingClientRect();
      return { b: b.toJSON(), a: a.toJSON() };
    }), 'no outline at all after switching to state 1');
    check(Math.abs(r.b.left - r.a.left) < 3 && Math.abs(r.b.width - r.a.width) < 3, 'the outline is not on the showing state: ' + JSON.stringify(r));
    await until(() => hasToolbarSection(app, 'States'), 'the toolbar lost the States section when its selection was hidden');
    await shot('statesui-02-outline-follows');
  });
  await step('Preview a state then Save: the saved default stays state 0', async () => {
    await (await section(app, 'States')).locator('button', { hasText: '+ Add state' }).click();          /* state 2, showing */
    await until(async () => { const v = await visible(pv, group.id); return v.anchors.length === 1 && v.anchors[0].index === 2; }, 'state 2 not showing');
    await connectAndSave(app);
    const saved = await until(() => { try { const g = onlyGroup(savedJson('states-data.js')); return g && g.states.length === 3 && g; } catch { return null; } }, 'states-data.js not saved');
    check(saved.current === 0, 'previewing state 2 made it the saved default: current=' + saved.current);
  });
  await step('the explicit Default state control is what Save writes; the public page starts there', async () => {
    const select = (await section(app, 'States')).locator('select[aria-label="Default state"]');
    await select.selectOption('1');
    await until(async () => (onlyGroup(await statesIn(pv)) || {}).current === 1, 'Default state = 1 did not reach the draft');
    await connectAndSave(app);
    await until(() => { try { return onlyGroup(savedJson('states-data.js')).current === 1; } catch { return false; } }, 'Save did not write default = 1');
    const pub = await context.newPage(); await pub.goto(`${ORIGIN}/`);
    const g = await until(async () => onlyGroup(await pub.mainFrame().evaluate(() => ArkStates.get())), 'public page has no group');
    await until(async () => { const v = await visible(pub.mainFrame(), g.id); return v.anchors.length === 1 && v.anchors[0].index === 1 && v.members.every((m) => !m); }, 'the public page does not start on the default state (1)');
    await pub.close();
  });
  await step('Live-mode clicks move the toolbar\'s "Showing" label with them', async () => {
    await app.locator('#mode button[data-m="live"]').click(); await wait(400);
    await pv.locator('[data-ark-state-anchor]:not([style*="none"]) a').first().click();               /* 1 -> 2 */
    await until(async () => { const v = await visible(pv, group.id); return v.anchors.length === 1 && v.anchors[0].index === 2; }, 'Live click did not advance to state 2');
    await app.locator('#mode button[data-m="edit"]').click(); await wait(300);
    await pv.locator('[data-ark-state-anchor]:not([style*="none"]) a').first().click();
    const rows = (await section(app, 'States')).locator('.row');
    const showingRow = await until(async () => { const n = await rows.count(); for (let i = 0; i < n; i++) if (await rows.nth(i).locator('button', { hasText: 'Showing' }).count()) return (await rows.nth(i).locator('label').textContent()); return null; }, 'no row says Showing');
    check(/^2 ·/.test(showingRow), 'the toolbar says it is showing "' + showingRow + '" while the preview shows state 2');
    check((onlyGroup(await statesIn(pv)) || {}).current === 1, 'Live clicks changed the saved default');
    await shot('statesui-03-showing-label');
    await page.close();
  });
});

await browser.close();
server.close();
if (args.includes('--keep')) console.log(`\nsaved site copy kept: ${WORK}`); else fs.rmSync(WORK, { recursive: true, force: true });
console.log(`\nscreenshots: ${SHOTS}`);
if (errors.length) console.log('page errors:\n  ' + [...new Set(errors)].join('\n  '));
console.log(failures ? `${failures} step(s) failed` : 'all steps passed');
process.exit(failures ? 1 : 0);

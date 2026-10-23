/* =====================================================================
   REAL-BROWSER CHECK: who owns <html data-theme> on the PUBLIC page
   ---------------------------------------------------------------------
   Why this exists (diagnosed 2026-10-18): three things wrote data-theme on
   the public page --
     - js/bootstrap.js, before first paint, from the visitor's saved choice;
     - js/main.js, from the colour theme's `activeTheme` (theme-data.js:
       the Theme panel's "Editing theme" select) whenever the visitor had
       no saved choice;
     - js/settings/panel.js (scripts/settings-entry.js), from the visitor's
       choice, else the site-wide default (settings-defaults-data.js, the
       "Theme & defaults" panel) -- and it SAVED that default into the
       visitor's own localStorage on every page load, as if they had chosen it.
   Visible results, both measured here before the fix:
     - a returning visitor who never touched the theme kept whatever default
       was current on their first visit: the owner changed the default and
       they never saw it;
     - a new visitor's data-theme went activeTheme -> default during boot (a
       second, unrelated control briefly deciding the palette).
   Now ONE owner: the settings panel decides (visitor's choice, else the
   site default) and saves only a real choice; bootstrap.js paints the
   choice, else the last site default this browser saw, before first paint.
   `activeTheme` stays what its control says: the theme the editor is
   editing (and previewing), never the visitor's palette.

   Palette ids (docs/ux-audit/brand.md D3): the page speaks the SDK's published names (ember,
   defxn-tide, ...). The two data files above are SAVED RECORDS and keep their old keys (ghost,
   marine, ...): they are mapped on read, never rewritten. A visitor's old choice lives in
   `flux-chain-theme` (old ids); it is read, written forward ONCE to `defxn-theme-v1`, and the old
   record is left exactly as it was.

   Run:   node tests/browser/theme-owner.mjs [--headed] [--keep]
   Needs: Chromium from `npx playwright install chromium`.
   ===================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { copySite, startHost, until as untilFor, watchSignals, waitForRouteReady, nextFrames } from './harness.mjs';

const args = process.argv.slice(2);
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-theme-'));

let failures = 0;
class StepFailure extends Error {}
function check(condition, message) { if (!condition) throw new StepFailure(message); }
async function step(name, run) {
  try { await run(); console.log(`ok   ${name}`); }
  catch (error) { failures += 1; console.log(`FAIL ${name}\n     ${error instanceof StepFailure ? error.message : error.stack}`); }
}
/* the harness's until (budget x load factor) */
const until = (probe, message, timeout = 30000) => untilFor(probe, message, timeout, { fail: (m) => new StepFailure(m) });

/* the two data files, edited the way a Save writes them (only the one key changes) */
const DEFAULTS_FILE = path.join(WORK, 'js/content/settings-defaults-data.js');
const THEME_FILE = path.join(WORK, 'js/content/theme-data.js');
function setDefaultTheme(name) { fs.writeFileSync(DEFAULTS_FILE, fs.readFileSync(DEFAULTS_FILE, 'utf8').replace(/"theme": "[a-z-]+"/, `"theme": "${name}"`)); }
function setActiveTheme(name) { fs.writeFileSync(THEME_FILE, fs.readFileSync(THEME_FILE, 'utf8').replace(/"activeTheme": "[a-z-]+"/, `"activeTheme": "${name}"`)); }

copySite(WORK);
setActiveTheme('clay');     /* the editor was last editing Tide (dark) */
setDefaultTheme('marine');  /* the owner's site-wide default is Dune (dark) */
const server = await startHost(WORK);
const ORIGIN = server.origin;
const browser = await chromium.launch({ headless: !args.includes('--headed') });
const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
await watchSignals(context);
/* every value <html data-theme> takes, from before the first script runs */
/* (observes `document`, not documentElement: an init script can run before <html> exists; each
   record's NEW value is read from the next record's oldValue, so two writes inside one task --
   which a "read the attribute now" observer would merge into one -- are both kept) */
await context.addInitScript(() => {
  const seen = [];
  const push = (v) => { if (seen[seen.length - 1] !== v) seen.push(v); };
  new MutationObserver((records) => {
    for (const r of records) if (r.target === document.documentElement && r.attributeName === 'data-theme') push(r.oldValue);
  }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-theme'], attributeOldValue: true });
  /* the values data-theme held, in order, ending with the current one (null = no attribute) */
  window.__themeLog = () => { const out = seen.slice(); const now = document.documentElement.getAttribute('data-theme'); if (out[out.length - 1] !== now) out.push(now); return out.filter((v) => v !== null); };
});
const page = await context.newPage();
async function load() {
  await page.goto(ORIGIN + '/');
  await until(() => page.evaluate(() => !!document.querySelector('.site-settings [data-theme-choice]')), 'the settings panel never mounted');
  /* boot has reached the mounted route (the router's ark:route-ready), then two painted frames:
     the log is read after boot, not at a fixed 300 ms */
  await waitForRouteReady(page.mainFrame()).catch((e) => { throw new StepFailure(e.message); });
  await nextFrames(page.mainFrame());
  return page.evaluate(() => ({ now: document.documentElement.dataset.theme, log: window.__themeLog(), choice: localStorage.getItem('defxn-theme-v1'), old: localStorage.getItem('flux-chain-theme') }));
}

try {
  await step('a new visitor sees the site default, and only the site default decides it', async () => {
    const first = await load();
    check(first.now === 'defxn-dune', 'data-theme is ' + first.now + ', not the site default marine (read as defxn-dune)');
    check(!first.log.includes('defxn-tide') && !first.log.includes('clay'), 'the colour editor\'s activeTheme (clay) took over data-theme during boot: ' + JSON.stringify(first.log));
  });

  await step('loading a page is not a choice: nothing is saved as the visitor\'s own theme', async () => {
    const again = await page.evaluate(() => [localStorage.getItem('defxn-theme-v1'), localStorage.getItem('flux-chain-theme')]);
    check(again[0] === null && again[1] === null, 'the visitor\'s localStorage now says ' + JSON.stringify(again) + ' although they never chose one');
  });

  await step('the owner changes the default: the returning visitor sees the NEW default', async () => {
    setDefaultTheme('grove');
    const second = await load();
    check(second.now === 'defxn-tide-light', 'a returning visitor who never chose still sees ' + second.now + ' after the default became grove (defxn-tide-light)');
  });

  await step('from then on the new default is painted before first paint (no flip on every load)', async () => {
    const third = await load();
    check(third.log[0] === 'defxn-tide-light' && third.log.every((v) => v === 'defxn-tide-light'), 'data-theme went ' + JSON.stringify(third.log) + ' on a load after the default was already seen');
  });

  await step('a real choice wins over the site default, and is what bootstrap paints first', async () => {
    /* the panel's own button, clicked the way its click handler receives it */
    await page.evaluate(() => document.querySelector('.site-settings [data-theme-choice="defxn-moss"]').click());
    check(await page.evaluate(() => localStorage.getItem('defxn-theme-v1')) === 'defxn-moss', 'choosing defxn-moss was not saved under the published key');
    check(await page.evaluate(() => localStorage.getItem('flux-chain-theme')) === null, 'a new choice wrote the OLD key (only the published form is written)');
    setDefaultTheme('bone');
    const chosen = await load();
    check(chosen.now === 'defxn-moss' && chosen.log[0] === 'defxn-moss', 'the visitor\'s choice did not win, or was not painted first: ' + JSON.stringify(chosen));
  });

  await step('a visitor who chose under the OLD ids keeps that choice: painted first, written forward once, old record untouched', async () => {
    /* what a browser that visited before the rename holds: the old key only (old `moss` = Moss LIGHT) */
    await page.evaluate(() => { localStorage.removeItem('defxn-theme-v1'); localStorage.setItem('flux-chain-theme', 'moss'); });
    const old = await load();
    check(old.now === 'defxn-moss-light' && old.log[0] === 'defxn-moss-light' && old.log.every((v) => v === 'defxn-moss-light'), 'an old moss choice painted ' + JSON.stringify(old.log) + ', not defxn-moss-light first and only');
    check(old.choice === 'defxn-moss-light', 'the old choice was not written forward to defxn-theme-v1: ' + old.choice);
    check(old.old === 'moss', 'the old record was rewritten or removed: flux-chain-theme=' + old.old);
    const again = await load();
    check(again.now === 'defxn-moss-light' && again.choice === 'defxn-moss-light' && again.old === 'moss', 'the second load changed something: ' + JSON.stringify(again));
  });

  await step('the published key beats a stale old key', async () => {
    await page.evaluate(() => { localStorage.setItem('defxn-theme-v1', 'defxn-dusk'); localStorage.setItem('flux-chain-theme', 'moss'); });
    const both = await load();
    check(both.now === 'defxn-dusk' && both.log.every((v) => v === 'defxn-dusk'), 'published choice lost to the old key: ' + JSON.stringify(both.log));
  });
} catch { /* reported by step() */ }

await browser.close();
server.close();
if (args.includes('--keep')) console.log(`\nsite copy kept: ${WORK}`); else fs.rmSync(WORK, { recursive: true, force: true });
console.log(failures ? `${failures} step(s) failed` : 'all steps passed');
process.exit(failures ? 1 : 0);

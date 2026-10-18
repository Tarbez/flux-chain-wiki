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

   Run:   node tests/browser/theme-owner.mjs [--headed] [--keep]
   Needs: Chromium from `npx playwright install chromium`.
   ===================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { copySite, startHost } from './harness.mjs';

const args = process.argv.slice(2);
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-theme-'));
const PORT = Number(process.env.PORT) || 3493;
const ORIGIN = `http://127.0.0.1:${PORT}`;

let failures = 0;
class StepFailure extends Error {}
function check(condition, message) { if (!condition) throw new StepFailure(message); }
async function step(name, run) {
  try { await run(); console.log(`ok   ${name}`); }
  catch (error) { failures += 1; console.log(`FAIL ${name}\n     ${error instanceof StepFailure ? error.message : error.stack}`); }
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(probe, message, timeout = 30000) {
  const end = Date.now() + timeout; let last;
  while (Date.now() < end) { try { last = await probe(); } catch { last = null; } if (last) return last; await wait(100); }
  throw new StepFailure(message);
}

/* the two data files, edited the way a Save writes them (only the one key changes) */
const DEFAULTS_FILE = path.join(WORK, 'js/content/settings-defaults-data.js');
const THEME_FILE = path.join(WORK, 'js/content/theme-data.js');
function setDefaultTheme(name) { fs.writeFileSync(DEFAULTS_FILE, fs.readFileSync(DEFAULTS_FILE, 'utf8').replace(/"theme": "[a-z]+"/, `"theme": "${name}"`)); }
function setActiveTheme(name) { fs.writeFileSync(THEME_FILE, fs.readFileSync(THEME_FILE, 'utf8').replace(/"activeTheme": "[a-z]+"/, `"activeTheme": "${name}"`)); }

copySite(WORK);
setActiveTheme('clay');     /* the editor was last editing Tide (dark) */
setDefaultTheme('marine');  /* the owner's site-wide default is Dune (dark) */
const server = await startHost(WORK, PORT);
const browser = await chromium.launch({ headless: !args.includes('--headed') });
const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
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
  await wait(300);
  return page.evaluate(() => ({ now: document.documentElement.dataset.theme, log: window.__themeLog(), choice: localStorage.getItem('flux-chain-theme') }));
}

try {
  await step('a new visitor sees the site default, and only the site default decides it', async () => {
    const first = await load();
    check(first.now === 'marine', 'data-theme is ' + first.now + ', not the site default marine');
    check(!first.log.includes('clay'), 'the colour editor\'s activeTheme (clay) took over data-theme during boot: ' + JSON.stringify(first.log));
  });

  await step('loading a page is not a choice: nothing is saved as the visitor\'s own theme', async () => {
    const again = await page.evaluate(() => localStorage.getItem('flux-chain-theme'));
    check(again === null, 'the visitor\'s localStorage now says flux-chain-theme=' + again + ' although they never chose one');
  });

  await step('the owner changes the default: the returning visitor sees the NEW default', async () => {
    setDefaultTheme('grove');
    const second = await load();
    check(second.now === 'grove', 'a returning visitor who never chose still sees ' + second.now + ' after the default became grove');
  });

  await step('from then on the new default is painted before first paint (no flip on every load)', async () => {
    const third = await load();
    check(third.log[0] === 'grove' && third.log.every((v) => v === 'grove'), 'data-theme went ' + JSON.stringify(third.log) + ' on a load after the default was already seen');
  });

  await step('a real choice wins over the site default, and is what bootstrap paints first', async () => {
    /* the panel's own button, clicked the way its click handler receives it */
    await page.evaluate(() => document.querySelector('.site-settings [data-theme-choice="ochre"]').click());
    check(await page.evaluate(() => localStorage.getItem('flux-chain-theme')) === 'ochre', 'choosing ochre was not saved');
    setDefaultTheme('bone');
    const chosen = await load();
    check(chosen.now === 'ochre' && chosen.log[0] === 'ochre', 'the visitor\'s choice did not win, or was not painted first: ' + JSON.stringify(chosen));
  });
} catch { /* reported by step() */ }

await browser.close();
server.close();
if (args.includes('--keep')) console.log(`\nsite copy kept: ${WORK}`); else fs.rmSync(WORK, { recursive: true, force: true });
console.log(failures ? `${failures} step(s) failed` : 'all steps passed');
process.exit(failures ? 1 : 0);

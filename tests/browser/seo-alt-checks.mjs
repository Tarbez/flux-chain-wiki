/* =====================================================================
   REAL-BROWSER FLOWS for three capabilities the Studio merge lost
   ---------------------------------------------------------------------
   - seo     every extended SEO field (structured-data type, AI summary,
             canonical, social image, noindex, AI-crawler block per page;
             site language, publisher type, handle, llms.txt, per-bot
             policy) is edited where Design keeps it -- this page's fields in
             the page picker's SEO popover, the site's in Theme & defaults --
             previewed live, saved,
             reloaded, and found in the REAL output: the public page's
             <head>, the server render, robots.txt and llms.txt.
   - alt     a plain image's alt text (here a real inline <svg>, the only
             kind of plain image the site's pages draw) is edited in the
             toolbar, applied in the preview at once, saved to
             layout-data.js, and present on the public page and in the
             server-rendered HTML.
   - checks  the Design check popover reports all 14 original rules: the
             5 colour/typography rules restored against the real page
             each report a real measurement, and the audience rule says
             "not built" -- it never passes and never scores 0.

   Why this exists: each of these "worked" when read as code and failed
   when used -- fields with no control, an alt field nothing received,
   checks that silently vanished from the count. Every step asserts on
   the thing a visitor or crawler gets, not on the editor's own state.

   Run:   node tests/browser/seo-alt-checks.mjs [--only seo,alt,checks] [--headed] [--keep]
   Needs: Chromium from `npx playwright install chromium`.
   Screenshots go to $SHOTS (default: a temp folder, printed at the end).
   ===================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { openPageFields, setLens, SITE, copySite, startHost, fakeFolder, appFrame, previewFrame, openToolbarSection, toolbarKey, clickHeader, designView, openPageSeo, openSiteSeo, until as untilFor, waitForPreviewReady, waitForRouteReady, openRoute as openRouteInPreview, statusCount, waitForSave, gotoEditor } from './harness.mjs';
import { readProject, planWrite } from '../../scripts/lib/site-bundle.mjs';
import { readIndexHtml, renderDocument, createLocalResources } from '../../api/lib/render-core.mjs';

const args = process.argv.slice(2);
const only = (args.includes('--only') ? args[args.indexOf('--only') + 1] : 'seo,alt,checks').split(',');
const SHOTS = process.env.SHOTS || fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-shots-'));
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-site-'));
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
  for (const file of ['robots.txt', 'llms.txt', 'sitemap.xml']) if (fs.existsSync(path.join(SITE, file))) fs.copyFileSync(path.join(SITE, file), path.join(WORK, file));
  try { await run(); } catch { /* reported by step() */ }
}
/* the harness's until (budget x load factor); a StepFailure thrown by a probe is a verdict */
const until = (probe, message, timeout = 8000) => untilFor(probe, message, timeout, { interval: 120, fail: (m) => new StepFailure(m), passThrough: (e) => e instanceof StepFailure });
const readSaved = (name) => fs.readFileSync(path.join(WORK, 'js/content', name), 'utf8');
function savedJson(name) { const text = readSaved(name); return JSON.parse(text.slice(text.indexOf('.define(') + 8, text.lastIndexOf(')'))); }

copySite(WORK);
const server = await startHost(WORK);
const ORIGIN = server.origin;
const browser = await chromium.launch({ headless: !args.includes('--headed') });
const context = await browser.newContext({ viewport: { width: 1500, height: 950 } });
await fakeFolder(context, WORK);
const errors = [];
const harnessNoise = /could not be cloned/;
context.on('page', (p) => p.on('pageerror', (e) => { if (!harnessNoise.test(e.message)) errors.push(e.message); }));

async function openEditor() {
  const page = await context.newPage();
  page.on('dialog', (d) => d.dismiss());
  await gotoEditor(page, ORIGIN);
  const app = await appFrame(page);
  await setLens(app, 'design');   /* the Design lens: a canvas click selects and styles */
  const pv = await previewFrame(app);
  await waitForPreviewReady(app);
  return { page, app, pv, shot: (name) => page.screenshot({ path: path.join(SHOTS, name + '.png') }) };
}
/* the preview's ready message for the route, not a sleep after it (harness openRoute) */
async function openRoute(app, pv, route) {
  await openRouteInPreview(app, pv, route, 15000).catch((e) => { throw new StepFailure(e.message); });
}
/* returns the #status count before the click, for waitForSave() */
async function save(app) {
  if (!(await app.evaluate(() => document.getElementById('connect').disabled))) {
    await clickHeader(app, 'connect');
    await until(() => app.evaluate(() => document.getElementById('connect').disabled), 'project folder did not connect');
  }
  const since = await statusCount(app);
  await app.click('#save');
  return since;
}
/* SEO's two homes since the one-header merge (2026-10-18; it was one right-panel SEO tab): this
   page's fields in the page picker's SEO popover (openPageSeo), the site-wide fields and the
   crawler policy in Theme & defaults (openSiteSeo). `scope` is whichever of the two is open;
   a row is found by data-seo-field, set by admin.js's seoFieldRows. */
/* A row inside a closed disclosure (canonical URL and structured data sit under "Advanced" since
   2026-10-19, docs/ux-audit/cms.md P1-2) is shown first, the way a person opens it */
async function reveal(scope, key) {
  const row = scope.locator(`[data-seo-field="${key}"]:not([data-seo-bot])`).first();
  if (!(await row.isVisible())) {
    const trigger = row.locator('xpath=ancestor::*[@data-ark-primitive="disclosure"][1]/button[contains(@class,"ark-disclosure__trigger")]');
    if (await trigger.count() && (await trigger.getAttribute('aria-expanded')) !== 'true') await trigger.click();
  }
  return row;
}
const seoRow = (scope, key) => scope.locator(`[data-seo-field="${key}"]:not([data-seo-bot])`).first();
async function seoType(scope, key, value) {
  const input = (await reveal(scope, key)).locator('input, textarea');
  await input.fill(value);
  await input.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));
  await input.evaluate((el) => el.blur());
}
async function seoPress(scope, key, label) { await seoRow(scope, key).locator('button', { hasText: new RegExp('^' + label + '$') }).click(); }
async function seoChoose(scope, key, value) { await (await reveal(scope, key)).locator('select').selectOption(value); }
async function botPress(scope, bot, label) { await scope.locator(`[data-seo-bot="${bot}"] button`, { hasText: label }).click(); }
const pressed = (scope, selector) => scope.locator(selector + ' [aria-pressed="true"]').first().textContent();
/* what a crawler reads from a rendered <head> */
const headOf = (frame) => frame.evaluate(() => {
  const meta = (attr, key) => { const el = document.querySelector(`meta[${attr}="${key}"]`); return el ? el.getAttribute('content') : null; };
  const ld = document.querySelector('script[data-ark-ld="1"]');
  return { title: document.title, lang: document.documentElement.lang, description: meta('name', 'description'), ogImage: meta('property', 'og:image'), ogUrl: meta('property', 'og:url'),
    twitterSite: meta('name', 'twitter:site'), robots: meta('name', 'robots'), canonical: (document.querySelector('link[rel="canonical"]') || {}).href || null, ld: ld ? JSON.parse(ld.textContent) : null };
});
const headOfHtml = (html) => {
  const attr = (re) => { const m = re.exec(html); return m ? m[1] : null; };
  const ld = attr(/<script[^>]*data-ark-ld="1"[^>]*>([\s\S]*?)<\/script>/);
  return { title: attr(/<title>([^<]*)<\/title>/), lang: attr(/<html[^>]*\slang="([^"]*)"/), canonical: attr(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/), ogImage: attr(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/),
    twitterSite: attr(/<meta[^>]*name="twitter:site"[^>]*content="([^"]*)"/), robots: attr(/<meta[^>]*name="robots"[^>]*content="([^"]*)"/), ld: ld ? JSON.parse(ld) : null };
};
async function publicPage(route) {
  const pub = await context.newPage();
  await pub.goto(ORIGIN + route);
  await waitForRouteReady(pub.mainFrame(), { path: route, timeout: 15000 }).catch((e) => { throw new StepFailure(e.message); });
  await until(() => pub.evaluate((r) => window.ArkUI && ArkUI.route && ArkUI.route.path() === r && !!document.querySelector('script[data-ark-ld="1"]'), route), 'the public page never finished routing to ' + route, 15000);
  return pub;
}
async function serverRender(route) {
  /* a stall deadline, not a speed budget: one boot is ~1.5-3 s of CPU, but wall time on the shared
     machine reached 20 s+ (measured in tests/ssr-render.cjs); render-core fails fast on a real error */
  return renderDocument({ html: await readIndexHtml(WORK), url: 'https://defxn.com' + route, resources: createLocalResources(WORK), timeoutMs: 60000 });
}

/* ---------------------------------------------------------------- seo */
const HOME = { title: 'DEFXN search title for the home page', ogImage: '/assets/share-wave.png', canonical: '/', schemaType: 'FAQPage', aiSummary: 'DEFXN lets each identity keep its own signed chain.' };
await flow('seo', async () => {
  const { page, app, pv, shot } = await openEditor();
  await step('the page SEO popover and Theme & defaults have a control for every stored field', async () => {
    const fields = await pv.evaluate(() => ({ page: ArkSEO.OVERRIDE_FIELDS.map((f) => f.key), site: ArkSEO.SITE_FIELDS.filter((f) => f.kind !== 'policy').map((f) => f.key), bots: ArkSEO.AI_BOTS.map((b) => b[0]) }));
    const pageSeo = await openPageSeo(app);
    for (const key of fields.page) check(await seoRow(pageSeo, key).count(), `the page SEO popover has no control for "${key}"`);
    await shot('seo-01-page-popover');
    const site = await openSiteSeo(app);
    for (const key of fields.site) check(await seoRow(site, key).count(), `Theme & defaults has no control for the site SEO field "${key}"`);
    for (const bot of fields.bots) check(await site.locator(`[data-seo-bot="${bot}"]`).count(), `no allow/block control for ${bot}`);
    await shot('seo-01-site-section');
  });
  await step('edit the home page\'s fields and the site fields; the preview <head> follows before Save', async () => {
    const pageSeo = await openPageSeo(app);
    await seoType(pageSeo, 'title', HOME.title);
    await seoType(pageSeo, 'ogImage', HOME.ogImage);
    await seoType(pageSeo, 'canonical', HOME.canonical);
    await seoChoose(pageSeo, 'schemaType', HOME.schemaType);
    await seoType(pageSeo, 'aiSummary', HOME.aiSummary);
    const site = await openSiteSeo(app);
    await seoType(site, 'lang', 'en-GB');
    await seoChoose(site, 'org', 'Person');
    await seoType(site, 'handle', '@defxnwave');
    await botPress(site, 'GPTBot', 'Block');
    await botPress(site, 'CCBot', 'Block');
    check((await pressed(site, '[data-seo-bot="GPTBot"]')) === 'Block', 'GPTBot does not show Block after the click');
    await designView(app, 'canvas');
    const head = await until(async () => { const h = await headOf(pv); return h.title === HOME.title && h.ld && h.ld['@type'] === 'FAQPage' && h.lang === 'en-GB' && h; }, 'the preview <head> did not take the unsaved SEO edits');
    check(head.ogImage === 'https://defxn.com' + HOME.ogImage, 'og:image ' + head.ogImage);
    check(head.canonical === 'https://defxn.com/', 'canonical ' + head.canonical);
    check(head.twitterSite === '@defxnwave', 'twitter:site ' + head.twitterSite);
    check(head.ld.abstract === HOME.aiSummary, 'JSON-LD abstract ' + head.ld.abstract);
    /* each edit re-sends the drafts and the preview remounts the route; it must come back */
    await until(() => pv.evaluate(() => { const h1 = [...document.querySelectorAll('h1')].find((el) => el.getClientRects().length); if (!h1) return false; let o = 1; for (let e = h1; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity); return o > 0.9; }), 'the preview page stayed blank (faded out) after the SEO edits', 10000);
    await shot('seo-02-home-edited');
  });
  await step('an unusable value says what it needs instead of storing a fallback', async () => {
    const site = await openSiteSeo(app);
    await seoType(site, 'lang', 'English');
    const refusal = await until(async () => { const t = await site.locator('.seo-refusal').allTextContents(); return t.find((x) => /language needs/.test(x)); }, 'no refusal for an invalid language tag');
    check(/en or en-US/.test(refusal), 'the refusal does not name the remedy: ' + refusal);
    await shot('seo-03-refusal');
    await seoType(site, 'lang', 'en-GB');
    await designView(app, 'canvas');
  });
  await step('hide /about from search and from AI crawlers', async () => {
    await openRoute(app, pv, '/about');
    const pageSeo = await openPageSeo(app);
    await seoPress(pageSeo, 'noindex', 'Yes');
    await seoPress(pageSeo, 'aiBlocked', 'Yes');
    await until(async () => (await headOf(pv)).robots === 'noindex, noai, noimageai', 'the preview /about has no noindex/noai robots meta');
    await shot('seo-04-about-hidden');
  });
  await step('Save writes every field to seo-data.js', async () => {
    const since = await save(app);
    const seo = await until(() => { try { const s = savedJson('seo-data.js'); return s.pages.home.title === HOME.title && s.pages.about.noindex && s; } catch { return null; } }, 'Save did not write the SEO edits');
    const home = seo.pages.home;
    check(home.ogImage === HOME.ogImage && home.canonical === HOME.canonical && home.schemaType === HOME.schemaType && home.aiSummary === HOME.aiSummary, 'home override saved wrong: ' + JSON.stringify(home));
    check(seo.pages.about.aiBlocked === true, 'about.aiBlocked not saved');
    check(seo.site.lang === 'en-GB' && seo.site.org === 'Person' && seo.site.handle === '@defxnwave' && seo.site.llms === 1, 'site saved wrong: ' + JSON.stringify(seo.site));
    check(JSON.stringify(seo.site.bots) === JSON.stringify({ GPTBot: 'block', CCBot: 'block' }), 'bots saved wrong: ' + JSON.stringify(seo.site.bots));
    /* seo-data.js is not the last file a Save writes (the derived root files follow it): wait for
       the Save itself to finish before the next step closes this page under it */
    /* read from the editor's status log, not the live #status text, which clears itself after 6 s */
    const summary = await waitForSave(app, since).catch((e) => { throw new StepFailure(e.message); });
    check(summary.tone === 'ok', 'the Save reported: ' + summary.text);
  });
  await step('reload: the page SEO popover and Theme & defaults show the saved values', async () => {
    await page.close();
    const again = await openEditor();
    const pageSeo = await openPageSeo(again.app);
    check((await seoRow(pageSeo, 'title').locator('input').inputValue()) === HOME.title, 'title not shown after reload');
    check((await seoRow(pageSeo, 'schemaType').locator('select').inputValue()) === 'FAQPage', 'schemaType not shown after reload');
    check((await seoRow(pageSeo, 'aiSummary').locator('textarea').inputValue()) === HOME.aiSummary, 'aiSummary not shown after reload');
    const site = await openSiteSeo(again.app);
    check((await seoRow(site, 'lang').locator('input').inputValue()) === 'en-GB', 'lang not shown after reload');
    check((await seoRow(site, 'org').locator('select').inputValue()) === 'Person', 'org not shown after reload');
    check((await pressed(site, '[data-seo-bot="CCBot"]')) === 'Block', 'CCBot policy not shown after reload');
    await designView(again.app, 'canvas');
    await openRoute(again.app, again.pv, '/about');
    check((await pressed(await openPageSeo(again.app), '[data-seo-field="noindex"]')) === 'Yes', 'about noindex not shown after reload');
    await again.shot('seo-05-reloaded-about');
    await again.page.close();
  });
  await step('the PUBLIC pages carry it: /, then /about', async () => {
    const pub = await publicPage('/');
    const head = await headOf(pub.mainFrame());
    check(head.title === HOME.title && head.lang === 'en-GB' && head.canonical === 'https://defxn.com/' && head.ogImage === 'https://defxn.com' + HOME.ogImage && head.twitterSite === '@defxnwave', 'public / head: ' + JSON.stringify(head));
    check(head.ld && head.ld['@type'] === 'FAQPage' && head.ld.abstract === HOME.aiSummary, 'public / JSON-LD: ' + JSON.stringify(head.ld));
    check(!head.robots, 'public / should be indexable, robots=' + head.robots);
    await pub.goto(ORIGIN + '/about');
    await until(() => pub.evaluate(() => ArkUI.route.path() === '/about'), 'public /about never routed', 15000);
    const about = await until(async () => { const h = await headOf(pub.mainFrame()); return h.robots && h; }, 'public /about has no robots meta');
    check(about.robots === 'noindex, noai, noimageai', 'public /about robots=' + about.robots);
    await pub.screenshot({ path: path.join(SHOTS, 'seo-06-public-about.png') });
    await pub.close();
  });
  await step('the server render (what a crawler without JS gets) carries it', async () => {
    const home = headOfHtml(await serverRender('/'));
    check(home.title === HOME.title && home.lang === 'en-GB' && home.canonical === 'https://defxn.com/' && home.twitterSite === '@defxnwave', 'SSR / head: ' + JSON.stringify(home));
    check(home.ld && home.ld['@type'] === 'FAQPage' && home.ld.abstract === HOME.aiSummary, 'SSR / JSON-LD: ' + JSON.stringify(home.ld));
    const about = headOfHtml(await serverRender('/about'));
    check(about.robots === 'noindex, noai, noimageai', 'SSR /about robots=' + about.robots);
  });
  await step('Save itself wrote robots.txt / llms.txt / sitemap.xml, byte-identical to what a pull writes', async () => {
    /* Regression (2026-10-18): Save wrote only js/content/seo-data.js; the root files were
       generated only by publish/pull (scripts/lib/site-bundle.mjs writeProject), so the
       connected folder's robots.txt/llms.txt stayed stale after every SEO edit. Both now take
       them from ArkSEO.searchFiles(). planWrite() is writeProject() without writing: after a
       Save it must have nothing left to change in these files. */
    const pending = planWrite(readProject(WORK), WORK).filter((c) => ['robots.txt', 'llms.txt', 'sitemap.xml', 'js/content/seo-data.js'].includes(c.relative));
    check(!pending.length, 'Save left these for a pull to write: ' + pending.map((c) => c.action + ' ' + c.relative).join(', '));
  });
  await step('robots.txt and llms.txt, as Save wrote them, served by the host', async () => {
    const robots = await (await fetch(ORIGIN + '/robots.txt')).text();
    check(robots.includes('User-agent: GPTBot\nDisallow: /\n') && robots.includes('User-agent: CCBot\nDisallow: /\n'), 'robots.txt does not block GPTBot/CCBot:\n' + robots);
    check(/User-agent: ClaudeBot\nDisallow: \/about\n/.test(robots), 'robots.txt does not disallow /about for the still-open crawlers:\n' + robots);
    const llms = await (await fetch(ORIGIN + '/llms.txt')).text();
    check(llms.includes(HOME.aiSummary), 'llms.txt does not carry the home AI summary');
    check(!llms.includes('https://defxn.com/about)'), 'llms.txt still lists the hidden /about page');
    fs.writeFileSync(path.join(SHOTS, 'seo-robots.txt'), robots); fs.writeFileSync(path.join(SHOTS, 'seo-llms.txt'), llms);
  });
  await step('Page fields: a page\'s own SEO tab has every per-page field, showing the saved values', async () => {
    const { app: a3, page: p3 } = await openEditor();
    const fieldsSheet = await openPageFields(a3, { page: 'about' });
    // W1-CMS-IA renamed the Page settings tabs to plain language: SEO is now "Search & sharing".
    await fieldsSheet.locator('[role="tab"]', { hasText: /^Search & sharing$/ }).first().click();
    const fields = await a3.evaluate(() => ArkSEO.OVERRIDE_FIELDS.map((f) => f.key));
    for (const key of fields) check(await a3.locator(`.seo-controls [data-seo-field="${key}"]`).count(), `the Page fields SEO tab has no control for ${key}`);
    check((await pressed(a3, '.seo-controls [data-seo-field="noindex"]')) === 'Yes', 'the Page fields SEO tab does not show the saved noindex for /about');
    await p3.screenshot({ path: path.join(SHOTS, 'seo-07-content-mode-about.png') });
    await p3.close();
  });
  await step('llms.txt can be turned off', async () => {
    const { app: a2, page: p2 } = await openEditor();
    await seoPress(await openSiteSeo(a2), 'llms', 'Off');
    await save(a2);
    await until(() => { try { return savedJson('seo-data.js').site.llms === 0; } catch { return false; } }, 'llms Off was not saved');
    /* no pull in between: the Save that turned it off rewrote llms.txt itself */
    const llms = await until(async () => { const t = await (await fetch(ORIGIN + '/llms.txt')).text(); return t.startsWith('# llms.txt is turned off') && t; }, 'Save did not rewrite llms.txt after turning it off');
    check(llms === '# llms.txt is turned off for this site.\n', 'llms.txt after Off: ' + llms.slice(0, 80));
    await p2.close();
  });
});

/* ---------------------------------------------------------------- alt */
await flow('alt', async () => {
  const { page, app, pv, shot } = await openEditor();
  let key;
  await step('select a plain image on /about: the toolbar shows an Alt text field', async () => {
    /* the site's pages draw no visible <img>; their plain images are inline <svg>s */
    /* on /about, whose layer drawing is on screen by default: the home's scene svg sits on the "See it work" tab since
       2026-10-20, and the editor's canvas selects rather than switches tabs. Page content only: a header icon is the
       shared shell, whose edits are stored under '*' (found by this step saving to '*'). */
    await openRoute(app, pv, '/about');
    key = await pv.evaluate(() => { const el = [...document.querySelectorAll('[data-ark-page] svg[data-ark-layout-key]')].filter((s) => !s.closest('button,a')).find((s) => { const r = s.getBoundingClientRect(); return r.width >= 8 && r.height >= 8 && r.top > 0 && r.top < innerHeight; }); return el && el.getAttribute('data-ark-layout-key'); });
    check(key, 'no visible inline svg on /about to describe');
    await app.click('#tabLayers');
    await app.evaluate((k) => { const pv = document.getElementById('cmsPreview'); pv.contentWindow.postMessage({ type: 'defxn-cms-preview-select-group', key: k }, location.origin); }, key);
    await until(async () => (await toolbarKey(app)) === key, 'the toolbar is not on the selected svg');
    const alt = await openToolbarSection(app, 'Alt text');
    check(await alt.locator('textarea').count(), 'the Alt text section has no field, only a note');
  });
  await step('type a description: the preview svg is labelled at once (and no longer hidden)', async () => {
    const field = (await openToolbarSection(app, 'Alt text')).locator('textarea[name="alt-text"]');
    await field.fill('Signed chain diagram');
    await field.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));
    await until(() => pv.evaluate((k) => { const el = document.querySelector(`[data-ark-layout-key="${CSS.escape(k)}"]`); return el && el.getAttribute('aria-label') === 'Signed chain diagram' && el.getAttribute('role') === 'img' && !el.hasAttribute('aria-hidden'); }, key), 'the preview svg did not take the label');
    await shot('alt-01-labelled');
  });
  await step('Save writes it to layout-data.js', async () => {
    await save(app);
    await until(() => { try { const l = savedJson('layout-data.js'); return l.alts && l.alts['/about'] && l.alts['/about'][key] === 'Signed chain diagram'; } catch { return false; } }, 'Save did not write the alt to layout-data.js');
  });
  await step('reload: the field shows the saved alt', async () => {
    await page.close();
    const again = await openEditor();
    await openRoute(again.app, again.pv, '/about');
    await again.app.evaluate((k) => { const pv = document.getElementById('cmsPreview'); pv.contentWindow.postMessage({ type: 'defxn-cms-preview-select-group', key: k }, location.origin); }, key);
    await until(async () => (await toolbarKey(again.app)) === key, 'the reloaded toolbar is not on the svg');
    const field = (await openToolbarSection(again.app, 'Alt text')).locator('textarea[name="alt-text"]');
    await until(async () => (await field.count()) && (await field.inputValue()) === 'Signed chain diagram', 'the reloaded toolbar does not show the saved alt');
    await again.shot('alt-02-reloaded');
    await again.page.close();
  });
  await step('the PUBLIC page and the server render carry it', async () => {
    const pub = await publicPage('/about');
    const label = await until(() => pub.evaluate((k) => { const el = document.querySelector(`[data-ark-layout-key="${CSS.escape(k)}"]`); return el && el.getAttribute('aria-label'); }, key), 'the public page svg has no aria-label');
    check(label === 'Signed chain diagram', 'public aria-label ' + label);
    await pub.close();
    const html = await serverRender('/about');
    const tag = new RegExp('<svg[^>]*data-ark-layout-key="' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[^>]*>').exec(html);
    check(tag && tag[0].includes('aria-label="Signed chain diagram"'), 'SSR svg: ' + (tag && tag[0]));
  });
});

/* ---------------------------------------------------------------- checks */
await flow('checks', async () => {
  const { page, app, shot } = await openEditor();
  await step('Design check lists all 14 rules; the 5 restored ones report real measurements; audience is "not built"', async () => {
    /* Design tips are the Edit style lens's (docs/ux-audit/cms.md P1-10) */
    await setLens(app, 'design');
    await app.click('#btnCheck');
    const items = await until(async () => { const li = await app.locator('ul.checks li').evaluateAll((els) => els.map((el) => ({ cls: el.className, title: el.dataset.check, text: el.querySelector('p').textContent }))); return li.length >= 14 && li; }, 'the Design check list has fewer than 14 rules');
    for (const item of items) console.log(`     ${item.cls.padEnd(10)} ${item.title} -- ${item.text}`);
    const by = (title) => items.find((i) => i.title === title);
    for (const title of ['No ghost buttons', 'Calls to action stand out', 'Text is easy to read', '60-30-10 color balance', 'Plain fonts for body text']) {
      const c = by(title);
      check(c, `the restored rule "${title}" is missing`);
      check(['pass', 'warn', 'fail', 'unmeasured'].includes(c.cls), `"${title}" has status ${c.cls}`);
      check(/\d/.test(c.text), `"${title}" reports no measurement: ${c.text}`);
    }
    const audience = by('Designed for the visitor');
    check(audience && audience.cls === 'notBuilt' && /Not built/.test(audience.text), 'the audience rule is not reported as not built: ' + JSON.stringify(audience));
    /* the badge shows a quiet count of tips; the score is its data-score (docs/ux-audit/cms.md P1-10) */
    const badge = await app.locator('#scoreBadge').getAttribute('data-score');
    const scored = items.filter((i) => ['pass', 'warn', 'fail'].includes(i.cls)).length, passed = items.filter((i) => i.cls === 'pass').length;
    check(badge === `${passed}/${scored}`, `badge ${badge} should be passes/measured = ${passed}/${scored} (not built/unmeasured excluded)`);
    await shot('checks-01-popover');
    /* "Show" selects the first offender in the preview, so the toolbar opens on it */
    const show = app.locator('ul.checks li.fail button, ul.checks li.warn button', { hasText: 'Show' }).first();
    if (await show.count()) {
      await show.click();
      await until(async () => !!(await toolbarKey(app)), '"Show" did not select anything in the preview');
      await shot('checks-02-show');
    }
  });
  await page.close();
});

await browser.close();
server.close();
if (args.includes('--keep')) console.log(`\nsaved site copy kept: ${WORK}`); else fs.rmSync(WORK, { recursive: true, force: true });
console.log(`\nscreenshots: ${SHOTS}`);
if (errors.length) console.log('page errors:\n  ' + [...new Set(errors)].join('\n  '));
console.log(failures ? `${failures} step(s) failed` : 'all steps passed');
process.exit(failures ? 1 : 0);

/* =====================================================================
   FOLD DISCLOSURES -- on a phone, content the fold rule keeps off the first
   screen must still be REACHABLE: visible, or visible after one click on
   the disclosure that folds it.

   Why this exists (UX audit 2026-10-19, docs/ux-audit/pages-ux-b.md cross-page
   finding 2): /lifecycle/<stage>, /what-is-a-resolver, /resolutions and the 20
   /resolutions/<slug> pages "fit one screen" on phones by display:none and
   line-clamp. The lifecycle illustration, the resolver definition and policy
   address, the resolutions deck and status note, and each resolution's lede,
   Problem row, primary action, legend and product lines were simply not there,
   and every screenshot still looked fine. tests/fold-no-hidden-content.cjs holds
   the stylesheet rules; this driver proves the payload: each named element is
   scrolled to and hit-tested (elementFromPoint at its centre lands inside it),
   so an element that is present but clipped by an overflow:hidden frame, or
   covered, fails too.

   Per check: the element exists, is not display:none / visibility:hidden, has a
   box, and after scrollIntoView its centre hit-tests to itself. A clamped
   element must also not be cut (scrollHeight <= clientHeight + 1) once open.
   Desktop (1280x800) is checked to still show the lifecycle figure with no
   toggle, i.e. the desktop layout did not change.

   Run by hand (needs Chromium; not part of scripts/run-tests.mjs):
     node tests/browser/fold-disclosures.mjs [screenshot-dir]
   ===================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { copySite, startHost, routeSettled, LOAD } from './harness.mjs';

/* In the page: is `selector` (the nth match, or the one containing `text`) reachable? */
function probe(page, selector, { text = null, index = 0, unclamped = false, within = null } = {}) {
  return page.evaluate(({ selector, text, index, unclamped, within }) => {
    let list = [...document.querySelectorAll(selector)];
    if (text) list = list.filter((n) => n.textContent.includes(text));
    const el = list[index];
    if (!el) return `no element ${selector}${text ? ` with "${text}"` : ''}`;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none') return `${selector}: ${n === el ? 'it' : 'an ancestor (' + n.className + ')'} is display:none`;
      if (cs.visibility === 'hidden') return `${selector}: visibility:hidden`;
    }
    el.scrollIntoView({ block: 'center', inline: 'center' });
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return `${selector}: empty box ${Math.round(r.width)}x${Math.round(r.height)}`;
    const x = Math.min(Math.max(r.left + Math.min(r.width / 2, 12), 1), innerWidth - 2), y = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 2);
    const hit = document.elementFromPoint(x, y);
    /* `within`: a card whose own full-cover toggle sits over its text (a resolver law) still counts */
    const own = within && hit && el.closest(within) && hit.closest(within) === el.closest(within);
    if (!hit || !(own || el === hit || el.contains(hit) || hit.contains(el))) return `${selector}: clipped or covered (hit ${hit ? hit.tagName + '.' + hit.className : 'nothing'})`;
    if (unclamped && el.scrollHeight > el.clientHeight + 1) return `${selector}: still cut (${el.scrollHeight} > ${el.clientHeight})`;
    return null;
  }, { selector, text, index, unclamped, within });
}
async function click(page, selector, text) {
  const loc = text ? page.locator(selector, { hasText: text }).first() : page.locator(selector).first();
  await loc.scrollIntoViewIfNeeded(); await loc.click();
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}
const foldFactor = (page, id) => page.evaluate((pageId) => {
  const el = document.querySelector(`[data-ark-page="${CSS.escape(pageId)}"]`);
  return el ? Math.round(el.scrollHeight / innerHeight * 100) / 100 : null;
}, id);

async function main() {
  const shotDir = process.argv[2] || null;
  if (shotDir) fs.mkdirSync(shotDir, { recursive: true });
  const root = copySite(fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-fold-')));
  const server = await startHost(root);
  const browser = await chromium.launch();
  const failures = [];
  const check = async (tag, page, selector, options) => {
    const problem = await probe(page, selector, options);
    if (problem) { failures.push(`${tag}: ${problem}`); console.log(`FAIL ${tag}: ${problem}`); }
    else console.log(`ok   ${tag}: ${selector}${options && options.text ? ` "${options.text}"` : ''}`);
  };
  async function visit(id, route, [width, height], body) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    try {
      await page.goto(server.origin + route, { waitUntil: 'domcontentloaded' });
      await routeSettled(page, id, 30000);
      const before = await foldFactor(page, id);
      await body(page, `${width}x${height} ${route}`);
      console.log(`     ${width}x${height} ${route}: page height ${before}x viewport before opening, ${await foldFactor(page, id)}x after`);
      if (shotDir) await page.screenshot({ path: path.join(shotDir, `${id.replace(/\//g, '_')}-${width}x${height}.png`), fullPage: false });
    } catch (error) {
      failures.push(`${width} ${route}: ${String(error.message || error).split('\n')[0]}`);
      console.log(`FAIL ${width} ${route}: ${String(error.message || error).split('\n')[0]}`);
    } finally { await context.close(); }
  }
  const PHONE = [390, 844], SHORT = [375, 667], DESKTOP = [1280, 800];
  try {
    /* /lifecycle/intent: the illustration is one click away, with its inspect chips. */
    await visit('lifecycle/intent', '/lifecycle/intent', PHONE, async (page, tag) => {
      await check(tag, page, '.lifecycle-dashboard-body > button', { text: 'Show the illustration' });
      await click(page, '.lifecycle-dashboard-body > button', 'Show the illustration');
      const expanded = await page.getAttribute('.lifecycle-dashboard-body > button', 'aria-expanded');
      if (expanded !== 'true') failures.push(`${tag}: toggle aria-expanded is ${expanded} after opening`);
      await check(tag, page, '.stage-scene-title', { text: 'The request brief' });
      await check(tag, page, '.stage-brief-job', { text: 'THE JOB' });
      await check(tag, page, '.stage-scene-choices button', { text: 'Who asks' });
      await check(tag, page, '.stage-scene-choices button', { text: 'What travels' });
    });
    /* /lifecycle overview: the reference-fabric figure, the same way. */
    await visit('lifecycle', '/lifecycle', PHONE, async (page, tag) => {
      await click(page, '.lifecycle-dashboard-body > button', 'Show the illustration');
      await check(tag, page, '.lifecycle-object figcaption');
    });
    /* desktop: unchanged -- the figure beside the answer, no toggle. */
    await visit('lifecycle/intent', '/lifecycle/intent', DESKTOP, async (page, tag) => {
      await check(tag, page, '.stage-scene-title', { text: 'The request brief' });
      const shown = await page.evaluate(() => { const b = document.querySelector('.lifecycle-dashboard-body > button'); return b && getComputedStyle(b).display !== 'none'; });
      if (shown) failures.push(`${tag}: the phone-only illustration toggle shows on desktop`);
    });

    /* /what-is-a-resolver: definition, kicker, address, breadcrumb, spec; laws open one by one. */
    for (const size of [PHONE, SHORT]) {
      await visit('resolver', '/what-is-a-resolver', size, async (page, tag) => {
        await check(tag, page, '.resolver-lab .content-layer-path');
        await check(tag, page, '.resolver-lab-kicker');
        await check(tag, page, '.resolver-lab-lede');
        await check(tag, page, '.resolver-lab-address code', { text: 'policy.doc-size/v1' });
        await check(tag, page, '.resolver-lab-spec');
        await check(tag, page, '.resolver-track-label small');
      });
      await visit('resolver', '/what-is-a-resolver?step=laws', size, async (page, tag) => {
        await check(tag, page, '.resolver-lab-law p', { index: 0, within: '.resolver-lab-law' });
        await click(page, '.resolver-lab-law-toggle >> nth=2');
        await check(tag, page, '.resolver-lab-law p', { index: 2, within: '.resolver-lab-law' });
        await check(tag, page, '.resolver-lab-laws-source');
      });
    }

    /* a short desktop: the lede used to be display:none at <=760px tall; it stays, and the frame
       scrolls rather than clipping the way on. */
    await visit('resolver', '/what-is-a-resolver', [1280, 720], async (page, tag) => {
      await check(tag, page, '.resolver-lab-lede');
      await check(tag, page, '.resolver-lab-next');
    });
    /* desktop /resolutions: the two-line deck clamp and one-line note clamp open with "More". */
    await visit('resolutions', '/resolutions', DESKTOP, async (page, tag) => {
      if (await page.locator('.resolutions-hero-copy > button:not([hidden])').count()) await click(page, '.resolutions-hero-copy > button');
      await check(tag, page, '.resolutions-deck', { unclamped: true });
      if (await page.locator('.resolutions-note > button:not([hidden])').count()) await click(page, '.resolutions-note > button');
      await check(tag, page, '.resolutions-note p', { unclamped: true });
      // opening both once clipped the last domain tab inside the fixed frame
      await check(tag, page, '.resolutions-domain-tab-name', { index: 4 });
    });
    /* /resolutions: deck and note open; every domain keeps its name; descriptions show. */
    await visit('resolutions', '/resolutions', PHONE, async (page, tag) => {
      if (await page.locator('.resolutions-hero-copy > button:not([hidden])').count()) await click(page, '.resolutions-hero-copy > button');
      await check(tag, page, '.resolutions-deck', { unclamped: true });
      if (await page.locator('.resolutions-note > button:not([hidden])').count()) await click(page, '.resolutions-note > button');
      await check(tag, page, '.resolutions-note p', { unclamped: true });
      for (let i = 0; i < 5; i++) await check(tag, page, '.resolutions-domain-tab-name', { index: i });
      await check(tag, page, '.resolutions-domain-head > p', { unclamped: true });
      for (let i = 0; i < 4; i++) await check(tag, page, '.resolution-entry-copy > span', { index: i });
    });
    /* /resolutions/finance: lede, For + Problem, primary action, products, legend, All 20. */
    for (const size of [PHONE, SHORT]) {
      await visit('resolutions/finance', '/resolutions/finance', size, async (page, tag) => {
        await check(tag, page, '.resolution-detail-index');
        await check(tag, page, '.resolution-detail-deck');
        await check(tag, page, '.resolution-brief dd', { index: 0, unclamped: true });
        await check(tag, page, '.resolution-brief dd', { index: 1, unclamped: true });
        await check(tag, page, '.resolution-primary-action');
        await check(tag, page, '.resolution-level-tab span', { index: 0 });
        const lines = await page.locator('.resolution-product-line').count();
        for (let i = 0; i < lines; i++) await check(tag, page, '.resolution-product-line', { index: i, unclamped: true });
        await check(tag, page, '.resolution-legend span', { index: 0 });
        await check(tag, page, '.resolution-legend span', { index: 2 });
        await check(tag, page, '.resolution-next-all');
        await click(page, '.resolution-level-tab', 'Product ideas');
        await check(tag, page, '.resolution-idea-audience');
        await check(tag, page, '.resolution-idea-builds > .resolution-section-label');
        await click(page, '.resolution-level-tab', 'How it resolves');
        await check(tag, page, '.resolution-how-shift p');
      });
    }
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
  console.log(`load factor ${LOAD.factor}`);
  if (failures.length) { console.log(`\n${failures.length} failing fold checks`); process.exit(1); }
  console.log('\nPASS: everything the fold keeps off a phone\'s first screen is visible or one click away.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => { console.error(error); process.exit(1); });

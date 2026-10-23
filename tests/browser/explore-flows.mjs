/* =====================================================================
   EXPLORE FLOWS (W4-S3, 2026-10-20) -- /explore's own parts (and the lab model beside it), in a real browser, on a fixed public-mesh
   fixture (page.route answers https://public.defxn.com, so no test depends on the live mesh).

   Why each check exists:
   - The how-it-works stepper was a hand-built tablist (role=tab buttons, its own arrow keys); it is Ark's
     tabs now. The page's mesh drawing and "01 / 03" count follow the selected tab, the tour that plays
     the steps on its own stops the moment a person picks one, and the arrow keys move the selection
     through Ark's primitive -- none of that can be read from the code, so it is clicked here.
   - The ways back inside the page ("All kinds", "All <source>", "Mesh Explorer" in the raw view) were
     hand-built buttons; they are Ark's action buttons. Each must still go back (an Ark `action` the page
     answers, not a link), and keep focus where the old button put it.
   - Nothing on the page is set below 12px, and the kind tiles' edge is >= 3:1 against the card
     (--border-control), measured from computed styles, not read from the sheet.

   - The lab model (/experiments) drew unstyled after its Wave 3 conversion (the .expansion scope was dropped: no dots, a 0px
     stage), its three tabs ran 43px past the card on a phone, and its captions were 6-9px: measured here.

   Run: node tests/browser/explore-flows.mjs   (harness copySite + startHost, OS-picked port, never 3437)
   ===================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { copySite, startHost, routeSettled, scaled, until } from './harness.mjs';

const failures = [];
const check = (ok, message) => { if (ok) console.log('ok   ' + message); else { failures.push(message); console.log('FAIL ' + message); } };

/* the public mesh, as the page reads it: a catalog of two kinds, counts, one page of records, one record */
const src = (id, category, label) => ({ id, label, category, state: 'available', visibility: 'public', enumeration: 'enumerable', capabilities: ['query'] });
const envelope = (data) => JSON.stringify({ apiVersion: 'explorer-api-v1', generatedAt: '2026-10-20T00:00:00Z', data });
async function fixture(context) {
  await context.route('https://public.defxn.com/**', async (route) => {
    const url = route.request().url(), headers = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { ...headers, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    let data = {};
    if (url.endsWith('/catalog')) data = { sources: [src('identities', 'identity', 'Identities'), src('networks', 'network', 'Networks'), src('miners', 'network', 'Miners')] };
    else if (url.endsWith('/health')) data = { status: 'running' };
    else if (url.includes('/summary')) data = { health: { status: 'running' }, counts: { identities: { state: 'counted', count: 1, capped: false }, networks: { state: 'counted', count: 2, capped: false }, miners: { state: 'counted', count: 1, capped: false } }, walk: { pageSize: 100, maxPages: 5 } };
    else if (url.endsWith('/query')) data = { records: [{ id: 'fixture-record-1', kind: 'identity', verification: { state: 'unverified' }, updatedAt: '2026-10-19T00:00:00Z' }], page: { nextCursor: null } };
    else if (url.endsWith('/record')) data = { record: { id: 'fixture-record-1', sourceId: 'identities', kind: 'identity', verification: { state: 'unverified' } } };
    await route.fulfill({ status: 200, headers, body: envelope(data) });
  });
}

async function main() {
  const root = copySite(fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-explore-flows-')));
  const server = await startHost(root);
  const browser = await chromium.launch();
  try {
    for (const [width, height] of [[1280, 800], [390, 844]]) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
      await fixture(context);
      const page = await context.newPage();
      const errors = []; page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(server.origin + '/explore', { waitUntil: 'domcontentloaded' });
      await routeSettled(page, 'explorer', scaled(20000));
      const tag = width + 'px: ';
      if (width < 901) await page.click('[data-explore-pane="how"]');

      /* ---- the stepper is Ark tabs ---- */
      const tabs = page.locator('#explore-steps [role="tab"]');
      check(await tabs.count() === 3 && await page.locator('#explore-steps [role="tablist"]').count() === 1, tag + 'the three steps are one Ark tab list');
      check(await page.locator('.explore-stepper, [data-explore-step]').count() === 0, tag + 'the hand-built stepper is gone');
      check((await tabs.allTextContents()).join('|') === '01 Shape|02 Publish|03 Use', tag + 'the tabs say "01 Shape", "02 Publish", "03 Use"');
      const count = () => page.locator('[data-explore-step-n]').textContent();
      const shown = () => page.evaluate(() => [...document.querySelectorAll('#explore-steps [role="tabpanel"]')].filter((p) => !p.hidden && p.getClientRects().length).map((p) => p.querySelector('h2').textContent));
      check(await count() === '01 / 03' && (await shown()).join() === 'Shape the idea', tag + 'it opens on step 1 (count and panel)');
      await tabs.nth(1).click();
      check(await count() === '02 / 03' && (await shown()).join() === 'Publish to the mesh', tag + 'a click on a tab moves the count and the panel together');
      await tabs.nth(1).focus(); await page.keyboard.press('ArrowRight');
      await until(async () => await count() === '03 / 03', tag + 'ArrowRight moves to step 3 and the count follows', scaled(5000));
      check((await shown()).join() === 'People use it', tag + 'step 3 shows its own heading');
      await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
      await until(async () => await count() === '01 / 03', tag + 'ArrowLeft twice returns to step 1', scaled(5000));
      check(await page.locator('#explore-steps [role="tab"][aria-selected="true"]').count() === 1, tag + 'exactly one tab is selected');

      /* ---- kinds: edge contrast, caption size, the singular count ---- */
      await page.click('[data-explore-pane="live"]').catch(() => {});
      await page.waitForSelector('.explore-kind');
      const read = await page.evaluate(() => {
        const rgb = (c) => (c.match(/[\d.]+/g) || []).slice(0, 4).map(Number);
        const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
        const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
        const tile = document.querySelector('.explore-kind'), cs = getComputedStyle(tile);
        let bg = tile.parentElement; let back = [0, 0, 0, 0];
        for (let el = tile; el; el = el.parentElement) { const c = rgb(getComputedStyle(el).backgroundColor); if (c.length === 4 && c[3] > 0.9 || c.length === 3) { back = c; break; } }
        const small = [...document.querySelectorAll('.explore-page *')].filter((el) => el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && el.getClientRects().length && parseFloat(getComputedStyle(el).fontSize) < 12 && !el.closest('svg,canvas,[aria-hidden="true"]')).map((el) => el.className + ':' + getComputedStyle(el).fontSize);
        return { edge: ratio(rgb(cs.borderTopColor), back), small: small.slice(0, 5), figures: [...document.querySelectorAll('.explore-kind small')].map((s) => s.textContent) };
      });
      check(read.edge >= 3, tag + `the kind tile's edge is at least 3:1 against what is behind it (${read.edge.toFixed(2)}:1)`);
      check(read.small.length === 0, tag + 'no text on /explore is under 12px' + (read.small.length ? ' (' + read.small.join(', ') + ')' : ''));
      check(read.figures.some((f) => /\b1 miner\b/i.test(f)) && !read.figures.some((f) => /\b1 miners\b/i.test(f)), tag + 'one miner reads "1 miner", never "1 miners" (' + read.figures.join(' / ') + ')');

      /* ---- the ways back are Ark's action buttons and still go back ---- */
      await page.locator('.explore-kind').first().click();
      const close = page.locator('.explore-browse-close [data-action="explore-back"]');
      await until(async () => await close.count() === 1, tag + 'a kind opens with Ark\'s back action', scaled(5000));
      await close.click();
      await until(async () => await page.locator('.explore-live-body[data-state="kinds"]').count() === 1, tag + '"All kinds" goes back to the kinds', scaled(5000));
      check(await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('explore-kind')), tag + 'focus returns to the kind that was open');
      await page.locator('.explore-kind').first().click();
      await page.waitForSelector('.explore-record');
      await page.locator('.explore-record').first().click();
      const back = page.locator('.explore-record-back [data-action="explore-back"]');
      await until(async () => await back.count() === 1, tag + 'a record opens with Ark\'s back action', scaled(5000));
      await back.click();
      await until(async () => await page.locator('.explore-record').count() > 0 && await page.locator('.explore-record-open').count() === 0, tag + '"All <source>" goes back to the list', scaled(5000));

      /* the raw view and the way back out of it */
      await page.locator('[data-explore-raw-open]').click();
      const rawBack = page.locator('[data-explore-raw-back]');
      await until(async () => await page.locator('[data-explore-raw]:not([hidden])').count() === 1, tag + '"Browse the raw records" opens the raw view', scaled(5000));
      /* ---- the raw view's floating panels are Ark popovers: the connection control and the dock's four layers, one group ---- */
      const pops = page.locator('[data-explore-raw] [data-ark-block="popover"]');
      const connect = page.locator('#explore-pop-connect');
      const trigger = (i) => pops.nth(i).locator('[data-ark-part="popover-trigger"]'), panelOf = (i) => pops.nth(i).locator('[data-ark-part="popover-panel"]');
      const openCount = () => page.locator('[data-explore-raw] [data-ark-block="popover"][data-state="open"]').count();
      const bounds = (i) => panelOf(i).evaluate((el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, h: r.height, vw: innerWidth, vh: innerHeight }; });
      check(await pops.count() === 5 && (await pops.evaluateAll((els) => new Set(els.map((e) => e.getAttribute('data-group'))).size)) === 1, tag + 'the connection control and the four dock layers are Ark popovers in one group');
      check(await page.locator('.mesh-connect-popover, .mesh-observatory-popover, details.mesh-operator-access').count() === 0, tag + 'no hand-built <details> popover is left in the raw view');
      check((await pops.evaluateAll((els) => els.map((e) => e.querySelector('[data-ark-part="popover-trigger"]').textContent.replace(/[▾\s]+$/, '').trim()))).join('|') === 'Public mesh|03 Node pulse|04 Record ledger|05 Observation details|06 Operator topology', tag + 'the buttons read the origin and "03".."06" with their names');
      check(await panelOf(0).evaluate((el) => el.hidden) && await openCount() === 0, tag + 'all start closed');
      /* the connection popover: open, hold its five controls, Escape, focus back, press outside */
      await trigger(0).click();
      await until(async () => await openCount() === 1, tag + 'a press on the connection button opens it', scaled(5000));
      check(await panelOf(0).locator('#mesh-origin, [data-explorer-connect], [data-explorer-refresh], [data-explorer-disconnect], #mesh-operator-key').count() === 5 && await trigger(0).getAttribute('aria-expanded') === 'true', tag + 'its panel holds the origin select and the three buttons; the button says expanded');
      /* Operator access is Ark's disclosure around the key field */
      const access = page.locator('#explore-operator-access');
      check(await access.getAttribute('data-ark-block') === 'disclosure', tag + '"Operator access" is an Ark disclosure (the key field is its slot)');
      await access.locator('[data-ark-part="disclosure-trigger"]').click();
      await until(async () => await page.locator('#mesh-operator-key').isVisible(), tag + 'it opens to the key field', scaled(5000));
      await page.locator('#mesh-operator-key').fill('k'); check(await page.locator('#mesh-operator-key').inputValue() === 'k', tag + 'the key field takes input');
      await page.keyboard.press('Escape');
      await until(async () => await openCount() === 0, tag + 'Escape closes the popover', scaled(5000));
      check(await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-ark-part') === 'popover-trigger'), tag + 'focus returns to its button');
      check(await page.evaluate(() => location.pathname) === '/explore', tag + 'Escape did not leave the page');
      await trigger(0).click();
      await until(async () => await openCount() === 1, tag + 'it opens again', scaled(5000));
      await page.locator('.mesh-explorer-live-panel').click({ position: { x: 4, y: 4 } });
      await until(async () => await openCount() === 0, tag + 'a press outside closes it', scaled(5000));
      /* the dock: every layer opens inside the viewport, upward, one at a time; switching is one press, in every order that failed before */
      const order = [1, 2, 3, 4, 3, 1, 4, 2, 0, 4];
      let prev = -1, worst = 0, bad = [];
      for (const i of order) {
        await trigger(i).click();
        const okOpen = await until(async () => await openCount() === 1 && await pops.nth(i).getAttribute('data-state') === 'open', tag + 'a press on button ' + i + (prev >= 0 ? ' while ' + prev + ' is open' : '') + ' opens it and only it', scaled(5000)).then(() => true, () => false);
        check(okOpen, tag + 'switching to ' + i + (prev >= 0 ? ' from ' + prev : '') + ' takes one press');
        const b = await bounds(i); worst = Math.max(worst, b.h);
        if (!(b.top >= -0.5 && b.left >= -0.5 && b.bottom <= b.vh + 0.5 && b.right <= b.vw + 0.5)) bad.push(i + ':' + [b.top, b.bottom, b.left, b.right].map(Math.round).join('/'));
        if (width > 900 && i > 0) { const t = await trigger(i).evaluate((el) => el.getBoundingClientRect().top); check(b.bottom <= t + 1, tag + 'dock layer ' + i + ' opens upward from its button'); }
        prev = i;
      }
      check(bad.length === 0, tag + 'every panel lies inside the viewport' + (bad.length ? ' (' + bad.join(', ') + ')' : '') + '; tallest ' + Math.round(worst) + 'px');
      check(worst < (await page.evaluate(() => innerHeight)), tag + 'no panel is taller than the viewport (the 1,027px case)');
      await page.keyboard.press('Escape');
      await until(async () => await openCount() === 0, tag + 'Escape closes a dock layer', scaled(5000));
      /* a tap on the far-away dock while the connection popover is open (lost on a phone before) */
      await trigger(0).click();
      await until(async () => await openCount() === 1, tag + 'the connection popover opens', scaled(5000));
      await trigger(2).click();
      await until(async () => await pops.nth(2).getAttribute('data-state') === 'open' && await openCount() === 1, tag + 'a press on a dock layer while the connection popover is open opens it and closes that one', scaled(5000));
      await page.keyboard.press('Escape');
      check(await rawBack.evaluate((el) => el.matches('[data-action="explore-raw-back"]') && !!el.closest('[data-ark-block="actions"]')), tag + 'its way back is an Ark action button');
      await rawBack.click();
      await until(async () => await page.locator('[data-explore-home]:not([hidden])').count() === 1, tag + '"Mesh Explorer" returns to the home', scaled(5000));
      check(errors.length === 0, tag + 'no page error' + (errors.length ? ': ' + errors[0] : ''));
      await context.close();
    }
    /* ---- the tour: steps play on their own, and stop for good the moment a person picks one ---- */
    {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      await fixture(context);
      const page = await context.newPage();
      await page.goto(server.origin + '/explore', { waitUntil: 'domcontentloaded' });
      await routeSettled(page, 'explorer', scaled(20000));
      const count = () => page.locator('[data-explore-step-n]').textContent();
      await until(async () => await count() === '02 / 03', 'the steps play on their own', scaled(12000), { interval: 300 });
      check(true, 'the tour moves from step 1 to step 2 by itself');
      await page.locator('#explore-steps [role="tab"]').nth(0).click();
      await page.waitForTimeout(scaled(7500));
      check(await count() === '01 / 03', 'after a person picks a step the tour does not move it again');
      await context.close();
    }
    /* ---- the lab model (/experiments): drawn, readable, and its tab strip fits a phone ---- */
    for (const [width, height] of [[1280, 800], [390, 844]]) {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      const errors = []; page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(server.origin + '/experiments', { waitUntil: 'domcontentloaded' });
      await routeSettled(page, 'proximity', scaled(20000));
      await page.waitForSelector('.lab .specimen');
      const lab = await page.evaluate(() => {
        const box = (sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { w: r.width, h: r.height }; };
        const tabs = document.querySelector('.study-tabs'), toolbar = document.querySelector('.lab-toolbar');
        const small = [...document.querySelectorAll('.lab *')].filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && el.getClientRects().length && parseFloat(getComputedStyle(el).fontSize) < 12).map((el) => el.className + ':' + getComputedStyle(el).fontSize);
        return { specimen: box('.lab .specimen'), dots: document.querySelectorAll('.lab .dot-group i').length, tabsOver: tabs.scrollWidth - tabs.clientWidth, toolbarOver: toolbar.scrollWidth - toolbar.clientWidth,
          corner: document.querySelector('.stage-corner').textContent, hint: document.querySelector('#variable-hint').textContent, small: small.slice(0, 4),
          stageOverlap: (() => { const f = document.querySelector('.stage-footnote').getBoundingClientRect(), d = document.querySelector('.specimen').getBoundingClientRect(); const dots = [...document.querySelectorAll('.dot-group')].map((g) => g.getBoundingClientRect()); return dots.some((r) => r.bottom > f.top && r.top < f.bottom && r.right > f.left && r.left < f.right); })() };
      });
      const tag = width + 'px lab: ';
      check(lab.specimen.h > 100 && lab.dots === 12, tag + 'the model is drawn (the .expansion scope reaches it): 12 dots in a ' + Math.round(lab.specimen.h) + 'px specimen');
      check(lab.tabsOver <= 0 && lab.toolbarOver <= 0, tag + 'the three study tabs fit their strip (overflow ' + lab.tabsOver + '/' + lab.toolbarOver + 'px)');
      check(/^Figure 1 of 3 · FX—001$/.test(lab.corner), tag + 'the stage code says what it is (' + lab.corner + ')');
      check(/^Drag the slider/.test(lab.hint), tag + 'the slider has its instruction');
      check(lab.small.length === 0, tag + 'no text in the model is under 12px' + (lab.small.length ? ' (' + lab.small.join(', ') + ')' : ''));
      check(!lab.stageOverlap, tag + 'the stage footnote does not sit on the dots');
      /* W4-S14 / S8: the three studies are Ark's choice (not a hand-built aria-pressed group), a pick keeps the canonical address, and the
         canonical link restores the state (js/studio.js wrote and read only the merged-away alias) */
      check(await page.locator('.study-tabs fieldset.ark-choice input[type="radio"]').count() === 3 && await page.locator('.lab [aria-pressed]').count() === 0, tag + 'the studies are one Ark choice, no aria-pressed buttons');
      await page.locator('.study-tabs input[value="rhythm"]').click(); // the radio is the label's whole box (Ark's choice)
      check(await page.locator('.study-tabs input[value="rhythm"]').isChecked() && /Figure 2 of 3/.test(await page.locator('.stage-corner').textContent()), tag + 'picking a study moves the model');
      check(new URL(page.url()).pathname === '/experiments' && /model=rhythm&value=50/.test(page.url()), tag + 'the address stays /experiments with the state in it (' + page.url().replace(server.origin, '') + ')');
      await page.goto(server.origin + '/experiments?model=depth&value=15', { waitUntil: 'domcontentloaded' });
      await routeSettled(page, 'proximity', scaled(20000));
      await page.waitForSelector('.lab .specimen');
      check(await page.locator('.study-tabs input[value="depth"]').isChecked() && await page.locator('#variable').inputValue() === '15', tag + '/experiments?model=depth&value=15 restores the study and its value');
      check(errors.length === 0, tag + 'no page error');
      await context.close();
    }
  } finally { await browser.close(); await server.close(); }
  if (failures.length) { console.log('\n' + failures.length + ' check(s) failed'); process.exit(1); }
  console.log('PASS: /explore stepper, kinds and ways back, and the lab model, behave on both widths.');
  process.exit(0);
}
main().catch((error) => { console.error(error); process.exit(1); });

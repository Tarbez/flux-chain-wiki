/* =====================================================================
   IDLE FRAMES -- after a page settles, nothing may keep asking for frames.
   ---------------------------------------------------------------------
   Why this exists (2026-10-19, DEFXN polish Wave 3): the pages' own motion
   settled, but shared background layers kept requesting animation frames
   forever -- measured in headless Chromium 18 s after the router reported
   idle: / 21 rAF/s, /about 20-26, /chain 19-26. Two sources: the WebGL zero
   (js/zero-webgl.js) looping while its shape was visible and also in its
   hidden-shape branch on home, drawing nothing; and the settings panel's
   "animated pattern" re-running js/ark/mesh-fabric.js's 3.2 s scan on an
   endless timer. A rAF loop is invisible to every other check: the page
   looks still, the router is idle, document.getAnimations() is empty.
   Only counting the frame requests shows it (law: validate the payload,
   not the pipeline; memory defxn_animation_must_settle: no idle rAF loop,
   paused/reduced/hidden paint one static frame).

   What it measures, per route and viewport width, after routeSettled():
   - rAF requests per second in the last second of an 18 s idle window
     (the owner's number: must be 0), with every requester named by the
     script that called requestAnimationFrame (from the call stack), so a
     regression says WHICH layer looped;
   - the mean rate over the whole window (how long the layer took to settle);
   - that one static frame was painted: the zero canvas reports
     data-phase="settled" with a non-zero draw count when its shape shows
     (or "hidden" when the admin hid it), and every background fabric canvas
     has a data-stage.
   Reduced motion runs the same window at desktop width; it must be 0 too.

   Nothing is slept for a fixed time except the idle window itself, which IS
   the measurement (page time, not wall time: the window is read from
   performance.now() in the page so a loaded machine lengthens the wait, not
   the reading). The harness picks a free port; 3437 is never used.

   Run by hand (needs Chromium; not part of scripts/run-tests.mjs):
     node tests/browser/idle-frames.mjs
   IDLE_FRAMES_ROUTES=zero,about limits the routes; IDLE_FRAMES_WINDOW_MS
   shortens the window for a quick look (the owner's bar is 18000).
   ===================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { copySite, startHost, routeSettled, scaled, LOAD } from './harness.mjs';

const ROUTES = [['zero', '/'], ['about', '/about'], ['chain', '/chain'], ['stats', '/stats'], ['lifecycle', '/lifecycle']];
const WIDTHS = [[1440, 900], [390, 844]];
const WINDOW_MS = Number(process.env.IDLE_FRAMES_WINDOW_MS) || 18000;
const CONCURRENCY = 3;

/* Installed before any site script: every requestAnimationFrame call is stamped with the page
   clock and the first site script on the stack (the wrapper's own frame is skipped). */
const COUNTER = `(() => {
  const native = window.requestAnimationFrame.bind(window);
  const log = window.__rafLog = [];
  window.requestAnimationFrame = function (fn) {
    let by = 'unknown';
    const stack = (new Error().stack || '').split('\\n').slice(2);
    for (const line of stack) { const m = /(\\/[^\\s():?]+\\.m?js)/.exec(line); if (m) { by = m[1]; break; } }
    log.push([performance.now(), by]);
    return native(fn);
  };
})();`;

function tally(entries) {
  const by = {};
  for (const [, who] of entries) by[who] = (by[who] || 0) + 1;
  return Object.entries(by).sort((a, b) => b[1] - a[1]).map(([who, n]) => `${who.replace(/^.*\/js\//, 'js/')}=${n}`).join(' ');
}

async function measureRoute(context, base, [id, route], tag) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto(base + route, { waitUntil: 'domcontentloaded' });
    await routeSettled(page, id);
    const t0 = await page.evaluate(() => performance.now());
    /* the idle window in PAGE time; the timeout is only a hang guard */
    await page.waitForFunction((end) => performance.now() >= end, t0 + WINDOW_MS, { timeout: scaled(WINDOW_MS + 15000), polling: 250 });
    const reading = await page.evaluate(({ start, windowMs }) => {
      const log = window.__rafLog || [];
      const last = log.filter(([at]) => at >= start + windowMs - 1000 && at < start + windowMs);
      const whole = log.filter(([at]) => at >= start && at < start + windowMs);
      const zero = document.querySelector('canvas.zero-webgl');
      const fabrics = [...document.querySelectorAll('canvas')].filter((c) => c.dataset.stage !== undefined);
      return {
        lastSecond: last, whole: whole.length,
        zero: zero ? { phase: zero.dataset.phase, drawCalls: zero.dataset.drawCalls, ready: zero.classList.contains('is-ready'), still: zero.classList.contains('is-still') } : null,
        fabrics: fabrics.map((c) => c.dataset.stage)
      };
    }, { start: t0, windowMs: WINDOW_MS });
    const problems = [];
    const idle = reading.lastSecond.length;
    if (idle > 0) problems.push(`${idle} rAF/s still requested at ${WINDOW_MS / 1000} s (${tally(reading.lastSecond)})`);
    if (reading.zero) {
      if (reading.zero.phase !== 'settled' && reading.zero.phase !== 'hidden') problems.push(`zero canvas phase is "${reading.zero.phase}", not settled`);
      if (reading.zero.phase === 'settled' && !(Number(reading.zero.drawCalls) > 0)) problems.push('zero canvas settled without a painted frame');
      if (!reading.zero.ready) problems.push('zero canvas never became ready (no static frame)');
    }
    if (reading.fabrics.some((stage) => !stage)) problems.push('a background fabric canvas has no painted stage');
    if (errors.length) problems.push('page error: ' + errors[0]);
    return { tag, idle, mean: Math.round(reading.whole / (WINDOW_MS / 1000) * 10) / 10, zero: reading.zero, fabrics: reading.fabrics.length, problems, by: tally(reading.lastSecond) };
  } finally { await page.close(); }
}

async function pool(items, size, fn) {
  const results = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) { const i = next++; results[i] = await fn(items[i], i); }
  }));
  return results;
}

async function main() {
  const only = process.env.IDLE_FRAMES_ROUTES ? process.env.IDLE_FRAMES_ROUTES.split(',') : null;
  const routes = only ? ROUTES.filter(([id]) => only.includes(id)) : ROUTES;
  const root = copySite(fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-idle-frames-')));
  const server = await startHost(root);
  const browser = await chromium.launch();
  const rows = [];
  try {
    const runs = [];
    for (const [width, height] of WIDTHS) runs.push({ width, height, reduced: false });
    runs.push({ width: WIDTHS[0][0], height: WIDTHS[0][1], reduced: true });
    for (const run of runs) {
      const context = await browser.newContext({ viewport: { width: run.width, height: run.height }, reducedMotion: run.reduced ? 'reduce' : 'no-preference' });
      await context.addInitScript(COUNTER);
      const results = await pool(routes, CONCURRENCY, (route) => measureRoute(context, server.origin, route, `${run.reduced ? 'reduced ' : ''}${run.width} ${route[1]}`));
      rows.push(...results);
      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(root, { recursive: true, force: true });
  }
  console.log(`idle window ${WINDOW_MS / 1000} s after routeSettled; load factor ${LOAD.factor} (1-min load ${LOAD.load1.toFixed(1)} on ${LOAD.cpus} CPUs)`);
  console.log('verdict  run                      rAF/s@end  mean rAF/s  zero                     fabrics  requesters in the last second');
  let failed = 0;
  for (const r of rows) {
    const zero = r.zero ? `${r.zero.phase}/${r.zero.drawCalls} draws${r.zero.still ? ' still' : ''}` : 'no canvas';
    console.log(`${r.problems.length ? 'FAIL' : 'ok  '}     ${r.tag.padEnd(24)} ${String(r.idle).padStart(9)}  ${String(r.mean).padStart(10)}  ${zero.padEnd(24)} ${String(r.fabrics).padStart(7)}  ${r.by || '-'}`);
    for (const p of r.problems) { failed++; console.log(`         ${p}`); }
  }
  console.log(failed ? `\n${failed} problem(s)` : `\nPASS: every layer settled to a still frame within ${WINDOW_MS / 1000} s on ${rows.length} runs`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => { console.error(error); process.exit(1); });

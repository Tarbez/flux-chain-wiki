/* =====================================================================
   BROWSER HARNESS for the merged CMS (admin-app.html + js/admin/admin.js)
   ---------------------------------------------------------------------
   Why this exists: the State group / Component instance / transitions /
   motion sections of the contextual toolbar were, after the Studio merge,
   only ever "verified" by reading code. The owner's bug ("make into states
   does not work at all, I clicked it but nothing happened") was a click
   that did nothing -- exactly the kind of defect a code read cannot see.
   So this harness drives the REAL page in a real Chromium:

   - copySite()   copies the servable site into a scratch folder, so a real
                  Save writes files there and never into the working tree.
   - startHost()  serves that copy with the real publish host (createHost)
                  in local-development mode: loopback, no sign-in.
   - fakeFolder() replaces window.showDirectoryPicker with a directory
                  handle whose writes land in the scratch copy through a
                  Playwright binding -- so "Save" goes through the app's own
                  ArkAdminStore.save* path (the same bytes Chrome's File
                  System Access API would write), and the PUBLIC page served
                  from the same copy afterwards reads what was saved.

   Nothing here is imported by scripts/run-tests.mjs (it only runs files
   directly in tests/), because these need Chromium and take minutes.
   Run the whole suite:  npm run test:browser   (scripts/run-browser-tests.mjs)
   or one driver:        node tests/browser/studio-flows.mjs

   TIMING RULES (2026-10-18). The drivers flaked on a shared 8-CPU / 8 GB
   machine at load average 19-40, almost always on a fixed sleep or a short
   fixed timeout that was really standing in for "the app has finished X".
   So:
   - a driver never sleeps for a fixed time. It waits on the app's own
     signal: the preview's 'defxn-cms-preview-ready' message, the router's
     'ark:route-ready' event, the Save summary in #status, every finite
     animation having ended, or a measurement that stopped changing. The
     helpers below are the whole set; see watchSignals().
   - where a timeout must exist (a wait has to end in a verdict), it is the
     unloaded budget and is multiplied by ONE load factor, measured once per
     process from os.loadavg() / CPU count and printed (LOAD, scaled()).
   - ports are never hard-coded: startHost() takes a free one unless PORT
     is set, so two drivers (or a driver and the owner's live server on
     3437) can never collide.
   ===================================================================== */
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHost } from '../../scripts/publish-host.mjs';

export const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const COPY = ['index.html', 'admin.html', 'admin-app.html', 'robots.txt', 'sitemap.xml', 'llms.txt', 'css', 'js', 'assets'];

/* ---- ONE load factor --------------------------------------------------------------------
   factor = 1-minute load average / CPU count, clamped to [1, 6]; BROWSER_LOAD_FACTOR overrides it
   (the runner does not set it: each driver measures the machine as it finds it). Every timeout
   in this file and every driver timeout passed through scaled()/until() is multiplied by it, so a
   10 s budget measured on an idle machine becomes 24 s at load 19 on 8 CPUs. The cap is a hang
   guard: past 6x the machine is too loaded for any reading of a UI to mean much. */
function measureLoad() {
  const cpus = (os.availableParallelism ? os.availableParallelism() : os.cpus().length) || 1;
  const load1 = os.loadavg()[0];
  const forced = Number(process.env.BROWSER_LOAD_FACTOR);
  const factor = forced > 0 ? forced : Math.min(6, Math.max(1, load1 / cpus));
  return Object.freeze({ cpus, load1, factor: Math.round(factor * 100) / 100, source: forced > 0 ? 'BROWSER_LOAD_FACTOR' : 'os.loadavg' });
}
export const LOAD = measureLoad();
export const scaled = (ms) => Math.round(ms * LOAD.factor);
let loadAnnounced = false;
export function announceLoad() {
  if (loadAnnounced) return;
  loadAnnounced = true;
  console.log(`[harness] load factor ${LOAD.factor} (1-min load ${LOAD.load1.toFixed(1)} on ${LOAD.cpus} CPUs, ${LOAD.source}): every wait budget is multiplied by it`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/* A capability the driver found missing: measured, and absent -- neither a pass nor a failure
   (law: never report a capability that does not exist as 0, or as done). One line in a fixed
   shape, which scripts/run-browser-tests.mjs reads to put NOT BUILT in its table instead of
   pass; the driver still exits 0 when nothing failed. */
export function reportNotBuilt(count, what) {
  console.log(`[harness] NOT BUILT ${count}: ${what}`);
}

/* Poll `probe` until it returns something truthy, and return that. `timeout` is the UNLOADED
   budget in ms (scaled here, once). A probe that throws counts as "not yet" (a frame mid-
   navigation), unless passThrough(error) says the error is a verdict. On timeout it throws
   fail(message) -- drivers pass their own StepFailure -- with the budget actually used appended,
   so a failure under load says how long it really waited. */
export class WaitTimeout extends Error {}
export async function until(probe, message, timeout = 10000, { interval = 100, fail, passThrough } = {}) {
  const budget = scaled(timeout), end = Date.now() + budget;
  for (;;) {
    let value;
    try { value = await probe(); } catch (error) { if (passThrough && passThrough(error)) throw error; value = null; }
    if (value) return value;
    if (Date.now() >= end) break;
    await sleep(interval);
  }
  const text = `${message} [waited ${budget} ms = ${timeout} ms x load ${LOAD.factor}]`;
  throw fail ? fail(text) : new WaitTimeout(text);
}
/* Poll `read` until two consecutive readings `interval` ms apart are identical (JSON), and return
   it: "the layout has stopped moving", for a resize or a header re-fit, instead of a fixed sleep. */
export async function untilStable(read, message, timeout = 5000, { interval = 120, fail } = {}) {
  let last;
  const hit = await until(async () => {
    const value = await read(), now = JSON.stringify(value);
    const same = now !== undefined && now === last; last = now;
    return same ? { value } : null;
  }, message, timeout, { interval, fail });
  return hit.value;
}

/* ---- the app's own readiness signals -------------------------------------------------------
   watchSignals(context) installs, in EVERY document of the context (editor, preview iframe,
   public page) before any site script runs, a small recorder at window.__arkSignals:
     route        { n, path }  -- the page router's 'ark:route-ready' event (js/ark/page-router.js),
                                  fired once a route's page is mounted
     up[from:type]   { n, path } -- messages this document RECEIVED from a child iframe, keyed by
                                  the iframe's id: 'cmsPreview:defxn-cms-preview-ready' is the real
                                  preview reporting it has re-rendered from the drafts (js/main.js)
     down[type]      { n, mode } -- messages this document received from its PARENT (the preview's
                                  only input from the editor: 'defxn-cms-preview-mode', ...)
     status       [{ text, tone }] -- every message the editor wrote to #status (admin.js status())
   The recorder's listener runs in the same event dispatch as the app's own, so once a count has
   moved the app has already handled that message. fakeFolder() installs it too. */
const watched = new WeakSet();
export async function watchSignals(context) {
  if (watched.has(context)) return;
  watched.add(context);
  await context.addInitScript(() => {
    if (window.__arkSignals) return;
    const s = window.__arkSignals = { route: { n: 0, path: null }, up: {}, down: {}, status: [] };
    window.addEventListener('ark:route-ready', () => { s.route.n += 1; try { s.route.path = window.ArkUI && ArkUI.route ? ArkUI.route.path() : null; } catch { s.route.path = null; } });
    window.addEventListener('message', (event) => {
      const d = event.data;
      if (!d || typeof d.type !== 'string') return;
      const fromParent = window.parent !== window && event.source === window.parent;
      let key = null;
      if (fromParent) key = d.type;
      else for (const f of document.querySelectorAll('iframe')) if (f.contentWindow === event.source) { key = (f.id || 'iframe') + ':' + d.type; break; }
      if (!key) return;
      const box = fromParent ? s.down : s.up;
      const rec = box[key] || (box[key] = { n: 0 });
      rec.n += 1; rec.path = typeof d.path === 'string' ? d.path : null; rec.mode = typeof d.mode === 'string' ? d.mode : null;
    }, true);
    const watchStatus = () => {
      const el = document.getElementById('status');
      if (!el) return;
      new MutationObserver(() => { if (el.textContent) s.status.push({ text: el.textContent, tone: el.dataset.tone || '' }); })
        .observe(el, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['data-tone'] });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchStatus); else watchStatus();
  });
}
/* read the recorder; a document without it is a driver that never called watchSignals() --
   say so, rather than wait out a timeout on a count that can never move */
async function signals(frame) {
  const s = await frame.evaluate(() => window.__arkSignals || null);
  if (!s) throw new Error('window.__arkSignals is missing: call watchSignals(context) (or fakeFolder) before opening the page');
  return s;
}
const READY = 'cmsPreview:defxn-cms-preview-ready';
/* how many times the real preview has reported ready so far (pass it as `since`) */
export async function previewReadyCount(app) { const r = (await signals(app)).up[READY]; return r ? r.n : 0; }
/* the preview has reported 'defxn-cms-preview-ready' more than `since` times (for `path`, when
   given): it has rendered the drafts it was last sent, on that route */
export async function waitForPreviewReady(app, { since = 0, path: route = null, timeout = 20000 } = {}) {
  let last = null;
  const hit = await until(async () => { const r = (await signals(app)).up[READY]; last = r; return r && r.n > since && (!route || r.path === route) && r; },
    `the preview never reported ready${route ? ' on ' + route : ''} (since=${since})`, timeout).catch((error) => { throw new WaitTimeout(error.message + ' last=' + JSON.stringify(last)); });
  return hit.n;
}
/* the page router in `frame` has fired ark:route-ready more than `since` times (on `path`) */
export async function waitForRouteReady(frame, { since = 0, path: route = null, timeout = 20000 } = {}) {
  const hit = await until(async () => { const r = (await signals(frame)).route; return r.n > since && (!route || r.path === route) && r; },
    `the page never fired ark:route-ready${route ? ' on ' + route : ''} (since=${since})`, timeout);
  return hit.n;
}
export async function routeReadyCount(frame) { return (await signals(frame)).route.n; }
/* Edit / Live in Design -> Canvas, returning once the PREVIEW has received the mode (it sends no
   reply; the recorder in the preview sees the message in the same dispatch js/main.js handles it) */
export async function setPreviewMode(app, pv, mode) {
  const button = app.locator(`#mode button[data-m="${mode}"]`);
  if ((await button.getAttribute('aria-pressed')) === 'true') return;
  const before = ((await signals(pv)).down['defxn-cms-preview-mode'] || { n: 0 }).n;
  await button.click();
  await until(async () => { const r = (await signals(pv)).down['defxn-cms-preview-mode']; return r && r.n > before && r.mode === mode; }, `the preview never received mode ${mode}`, 10000);
}
/* the number of #status messages so far (pass it to waitForSave as `since`) */
export async function statusCount(app) { return (await signals(app)).status.length; }
/* The Save that started after `since` status messages has finished: admin.js saveEverything()
   ends with ONE summary ("Saved N items ...", "Nothing to save ...", "N failed: ...") written
   only after every file write -- the editor's own completion signal. Returns { text, tone }. */
const SAVE_SUMMARY = /^(Saved \d+ items? |Nothing to save|\d+ failed: )/;
export async function waitForSave(app, since, timeout = 30000) {
  return until(async () => (await signals(app)).status.slice(since).find((m) => SAVE_SUMMARY.test(m.text)), 'the Save never reported finishing in #status', timeout);
}
/* click the ONE #save and wait for its summary */
export async function saveAndWait(app, timeout) {
  const since = await statusCount(app);
  await app.click('#save');
  return waitForSave(app, since, timeout);
}
/* The rail's Pages tab (the one site tree): open `route` and return once the preview has
   re-rendered the drafts on it (its ready message for that path) and annotated it. A route the
   preview already shows is not reloaded (js/admin/bridge.js syncCmsPreview), so the ready it
   already sent counts. A row's open button carries its path (data-path); '/' is both the site
   chrome's row and Home's, and either shows Home. */
export const routeRow = (app, route) => app.locator(`#pages .tree-open[data-path="${route}"]`).first();
export async function openRoute(app, pv, route, timeout = 20000) {
  await openRailTab(app, 'pages');
  const already = await pv.evaluate((r) => !!window.ArkUI && ArkUI.route.path() === r, route).catch(() => false);
  const since = already ? 0 : await previewReadyCount(app);
  await routeRow(app, route).click();
  await waitForPreviewReady(app, { since, path: route, timeout });
  await until(() => pv.evaluate((r) => ArkUI.route.path() === r && !!document.querySelector('[data-ark-layout-key]'), route), 'the preview did not open ' + route, timeout);
}
/* `n` animation frames have been painted in `frame` (layout written in a rAF has happened) */
export async function nextFrames(frame, n = 2) {
  await frame.evaluate((count) => new Promise((resolve) => { let i = 0; const tick = () => (++i >= count ? resolve() : requestAnimationFrame(tick)); requestAnimationFrame(tick); }), n);
}
/* Every FINITE animation in `frame` has finished, then two frames painted: an entrance or a
   popover fade is over (infinite ambient loops are ignored). For screenshots and for readings that
   must not catch a transition midway. Returns false instead of throwing when it never settles:
   a screenshot is evidence, not an assertion. */
export async function animationsSettled(frame, timeout = 5000) {
  const ok = await until(() => frame.evaluate(() => document.getAnimations().every((a) => a.playState !== 'running' || a.effect == null || a.effect.getComputedTiming().endTime === Infinity)), 'animations still running', timeout).then(() => true, () => false);
  await nextFrames(frame).catch(() => {});
  return ok;
}
/* The page router is idle on page `id`: its page element is mounted and shown, the scene's
   transition is over, every finite animation has ended and two frames have passed (ArkLayout.apply
   runs in a rAF after mount). Was route-sweep's settled(); it ended in a fixed 250 ms. */
export async function routeSettled(page, id, timeout = 20000) {
  await page.waitForFunction((pageId) => {
    const scene = document.querySelector('[data-transition]');
    const el = document.querySelector(`[data-ark-page="${CSS.escape(pageId)}"]`);
    return !!scene && scene.dataset.transition === 'idle' && scene.dataset.page === pageId && !!el && !el.hidden;
  }, id, { timeout: scaled(timeout) });
  await animationsSettled(page);
}

/* ---- ports -------------------------------------------------------------------------------- */
/* a port nothing is listening on right now (the OS picks it; it is free when this returns) */
export async function freePort() {
  const probe = http.createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
  const { port } = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  return port;
}
/* listen on `port` (0 = any free one); resolves the server with .port and .origin set */
export function listen(server, port = 0) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      server.port = server.address().port; server.origin = `http://127.0.0.1:${server.port}`;
      resolve(server);
    });
  });
}

export function copySite(dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  for (const name of COPY) {
    const from = path.join(SITE, name);
    if (fs.existsSync(from)) fs.cpSync(from, path.join(dest, name), { recursive: true });
  }
  return dest;
}

/* The real publish host serving `root`, local-development mode unless `options` says otherwise
   (options are passed to createHost: publisher, permissions, resolveCheck, ...). The port is
   PORT when set, else a free one. createHost must know its port before it listens (it accepts
   only Host: 127.0.0.1:<port>), so a free port is found first; if something takes it in between,
   another is tried. Resolves the server with .port and .origin. */
export async function startHost(root, port = Number(process.env.PORT) || 0, options = {}) {
  announceLoad();
  for (let attempt = 1; ; attempt++) {
    const p = port || await freePort();
    const publisher = { name: 'flux-chain.ark', authorize: async () => ({}), status: async () => ({}), fetchSite: async () => ({}) };
    const server = createHost({ root, publisher, port: p, dataDir: path.join(root, '.admin-data'), localDevelopment: true, onNotice: () => {}, ...options });
    try { return await listen(server, p); }
    catch (error) {
      if (error.code === 'EADDRINUSE' && !port && attempt < 5) continue;
      if (error.code === 'EADDRINUSE') throw new Error(`port ${p} is in use${p === 3437 ? ' (3437 is publish-host\'s default: the owner\'s live server)' : ''}; unset PORT so the harness picks a free port`);
      throw error;
    }
  }
}

/* A directory handle rooted at `root` on disk. The browser side only ever sees
   names and text; every read and write crosses the `__fakeFs` binding.
   `hooks.before(op, rel)` (optional) runs before each operation and may return a promise that
   holds it -- tests/browser/versions.mjs uses it to make two browsers interleave in one chosen
   order. Directories list their entries (keys/entries/values), as Chrome's handles do. */
export async function fakeFolder(context, root, hooks = {}) {
  await watchSignals(context);
  await context.exposeBinding('__fakeFs', async (_source, op, rel, text) => {
    if (hooks.before) await hooks.before(op, rel);
    const file = path.resolve(root, rel);
    if (path.relative(root, file).startsWith('..')) throw new Error('outside the fake folder: ' + rel);
    if (op === 'isFile') return fs.existsSync(file) && fs.statSync(file).isFile();
    if (op === 'isDir') return fs.existsSync(file) && fs.statSync(file).isDirectory();
    if (op === 'mkdir') { fs.mkdirSync(file, { recursive: true }); return true; }
    if (op === 'read') return fs.readFileSync(file, 'utf8');
    if (op === 'write') { fs.writeFileSync(file, text); return true; }
    if (op === 'remove') { fs.rmSync(file, { force: true }); return true; }
    if (op === 'list') return fs.existsSync(file) ? fs.readdirSync(file) : [];
    throw new Error('unknown op ' + op);
  });
  await context.addInitScript(() => {
    function notFound(name) { const e = new Error(name + ' not found'); e.name = 'NotFoundError'; return e; }
    function fileHandle(rel, name) {
      return {
        kind: 'file', name,
        async getFile() { const text = await window.__fakeFs('read', rel); return new File([text], name); },
        async createWritable() {
          let buffer = '';
          return { async write(data) { buffer += typeof data === 'string' ? data : await new Blob([data]).text(); }, async close() { await window.__fakeFs('write', rel, buffer); } };
        },
      };
    }
    function dirHandle(rel, name) {
      const join = (child) => (rel ? rel + '/' : '') + child;
      return {
        kind: 'directory', name,
        async queryPermission() { return 'granted'; }, async requestPermission() { return 'granted'; },
        async getFileHandle(child, opts) {
          if (!(await window.__fakeFs('isFile', join(child)))) { if (!opts || !opts.create) throw notFound(child); await window.__fakeFs('write', join(child), ''); }
          return fileHandle(join(child), child);
        },
        async getDirectoryHandle(child, opts) {
          if (!(await window.__fakeFs('isDir', join(child)))) { if (!opts || !opts.create) throw notFound(child); await window.__fakeFs('mkdir', join(child)); }
          return dirHandle(join(child), child);
        },
        async removeEntry(child) { await window.__fakeFs('remove', join(child)); },
        async *keys() { for (const child of await window.__fakeFs('list', rel)) yield child; },
        async *entries() {
          for (const child of await window.__fakeFs('list', rel)) {
            yield [child, (await window.__fakeFs('isDir', join(child))) ? dirHandle(join(child), child) : fileHandle(join(child), child)];
          }
        },
        async *values() { for await (const entry of this.entries()) yield entry[1]; },
      };
    }
    window.showDirectoryPicker = async () => dirHandle('', 'defxn-copy');
  });
}

/* the real-site preview frame (#cmsPreview inside admin-app.html; js/main.js strips the
   ?cms-preview flag from its own URL, so it is found by element, not by URL), once the page
   inside it has been annotated with layout keys. That is the frame, not the drafts: a driver that
   needs the preview to have rendered the editor's drafts waits for waitForPreviewReady(). */
export async function previewFrame(app, timeout = 20000) {
  return until(async () => {
    const handle = await app.$('#cmsPreview');
    const frame = handle && await handle.contentFrame();
    return frame && await frame.evaluate(() => !!document.querySelector('[data-ark-layout-key]')) && frame;
  }, 'the preview frame never loaded an annotated page', timeout, { interval: 150 });
}

/* Opening and reloading the editor page itself (admin.html, admin-app.html, every js/admin/ module,
   then the canvas preview inside it). Playwright's navigation limit is a fixed 30 s, the one wait
   here the load factor never scaled: at load 33-52 the editor-open of studio-flows' makecomp
   reload and full-audit's reloads timed out while every scaled wait around them held. Every
   driver opens and reloads the editor through these two, so the limit is scaled in one place. */
export const EDITOR_LOAD_MS = 30000;
export async function gotoEditor(page, origin) { await page.goto(`${origin}/admin`, { timeout: scaled(EDITOR_LOAD_MS) }); return page; }
export async function reloadEditor(page) { await page.reload({ timeout: scaled(EDITOR_LOAD_MS) }); return page; }

/* the editor frame (admin-app.html inside admin.html's #app), once admin.js has wired it:
   #lensDesignBtn is static markup that exists before the deferred admin.js has attached a single
   listener, so a click in that window was silently lost; window.ArkAdminApp is set once every
   listener is attached (full-audit's ready(), now here for every driver) */
export async function appFrame(page) {
  const handle = await page.waitForSelector('#app', { timeout: scaled(20000) });
  const frame = await handle.contentFrame();
  await frame.waitForSelector('#lensDesignBtn', { timeout: scaled(20000) });
  await frame.waitForFunction(() => !!window.ArkAdminApp, null, { timeout: scaled(30000) });
  return frame;
}

/* ---- the contextual toolbar's SHELL ---------------------------------------------------
   #selToolbar is a bar of icon buttons, one per section ([data-section], named by
   [data-name]) plus actions ([data-action], named by aria-label); the open section's
   controls are in the one popover #selToolbarPop. Drivers name a section and act on the
   controls inside it -- every assumption about how the shell is drawn lives here, so a
   shell change edits this block and no driver. Names match by prefix ("States" matches
   "States (2)"). */
export const toolbarButton = (app, name) => app.locator(`#selToolbar:not([hidden]) [data-section][data-name^="${name}"]`).first();
/* An action is a bar button, or -- since 2026-10-19 -- one of the commands behind the bar's More
   (the selection's commands: Make into component, Make into states, Group ...). toolbarAction
   finds it in either place; clickToolbarAction opens More first when it lives there. */
export const toolbarAction = (app, label) => app.locator(`#selToolbar:not([hidden]) [data-action][aria-label="${label}"], #selToolbarPop:not([hidden]) [data-action][aria-label="${label}"]`).first();
export async function clickToolbarAction(app, label, timeout = 5000) {
  const inBar = app.locator(`#selToolbar:not([hidden]) [data-action][aria-label="${label}"]`).first();
  if (await inBar.count()) return inBar.click();
  const body = await openToolbarSection(app, 'More', timeout);
  const item = body.locator(`[data-action][aria-label="${label}"]`).first();
  await item.waitFor({ state: 'visible', timeout: scaled(timeout) });
  return item.click();
}
export const toolbarPopover = (app) => app.locator('#selToolbarPop:not([hidden])');
export async function hasToolbarSection(app, name) { return (await toolbarButton(app, name).count()) > 0; }
export async function toolbarSectionIsOpen(app, name) {
  const button = toolbarButton(app, name);
  return (await button.count()) > 0 && (await button.getAttribute('aria-expanded')) === 'true';
}
/* the section names the bar offers for the current selection, in order */
export const toolbarSections = (app) => app.evaluate(() => [...document.querySelectorAll('#selToolbar:not([hidden]) [data-section]:not([data-section="tb-more"])')].map((b) => b.dataset.name));
/* the layout key of what the toolbar is editing (null when it is not showing) */
export const toolbarKey = (app) => app.evaluate(() => { const bar = document.getElementById('selToolbar'); return bar && !bar.hidden ? bar.dataset.key || null : null; });
/* open one section (a no-op when it is already open) and return the element holding its controls */
export async function openToolbarSection(app, name, timeout = 5000) {
  const button = toolbarButton(app, name);
  await until(async () => (await button.count()) > 0, `the toolbar has no "${name}" section`, timeout)
    .catch(async (error) => { throw new WaitTimeout(error.message + ` (it offers: ${(await toolbarSections(app)).join(', ') || 'nothing'})`); });
  /* Already open is not proof it STAYS open: an identity section (States, Component instance)
     auto-opens on the selection that created it, and a driver that has just clicked another
     element may find it open a moment before that click's selection message lands -- which
     closes it, by design (a new selection closes the popover). The driver then waited 30 s on
     a popover that was gone (studio-flows "becomes the trigger", full-audit "state group").
     So an already-open section is re-read once the bar has stopped changing: what it edits and
     whether the section is open, read twice in a row the same (was a fixed 400 ms sleep). */
  if (await toolbarSectionIsOpen(app, name)) {
    await nextFrames(app);
    await untilStable(async () => [await toolbarKey(app), await toolbarSectionIsOpen(app, name)], `the toolbar kept changing while "${name}" was open`, timeout);
  }
  if (!(await toolbarSectionIsOpen(app, name))) await button.click();
  const body = app.locator(`#selToolbarPop:not([hidden])[aria-label^="${name}"] .tb-pop-body`);
  await body.waitFor({ state: 'visible', timeout: scaled(timeout) });
  return body;
}
export async function closeToolbarSection(app) {
  const close = app.locator('#selToolbarPop:not([hidden]) .tb-pop-x');
  if (await close.count()) await close.click();
}

/* ---- the ONE workspace (admin-app.html, 2026-10-18) ------------------------------------
   One header, one rail, one canvas. Content and Design are a LENS on the canvas (what a click
   there edits), not two apps. Where each control lives, so drivers name the control and not
   its position:
   - the lens: #lensContentBtn / #lensDesignBtn ("Edit words" / "Edit style"; setLens below);
   - the header: #btnLeftRail, #btnPage (the page switcher), #btnPageFields (Page settings: the
     sheet), the lens, #btnUndo / #btnRedo (the one history), #save, #publish, #accountBtn (More);
   - the More menu (#accountMenu): the views #viewCanvasBtn / #viewMapBtn / #viewThemeBtn
     (designView below), #btnPageSeo (openPageSeo), #backgroundBtn (the Page transition popover,
     openBackground), #versionsNav (openVersions), #meshNav (Publishing status), #connect, #who,
     #signOut -- clickHeader() opens More first for any of them (MORE_MENU_IDS);
   - the canvas strip (#canvasTools, above the canvas): #devices, #bpNote, #btnCheck (Design tips,
     Edit style only: openDesignTips), #mode (Edit / Preview);
   - the rail's tabs: #tabPages (the one page list, with #pageSearch and + New: createItem),
     #tabLayers, #tabLib, #tabMedia (images), #tabVault (encrypted items). */
export const ACCOUNT_MENU_IDS = ['connect', 'who', 'signOut'];
/* Three tiers since 2026-10-19 (docs/ux-audit/cms.md (b)): the header keeps what is used on every
   screen; the More menu (#accountMenu behind #accountBtn) holds the views, this page's search &
   sharing, the page transition, version history, publishing status and the account; the canvas
   strip (#canvasTools) holds #devices, #mode, #bpNote and #btnCheck (Design tips, Edit style only). */
export const MORE_MENU_IDS = ['viewCanvasBtn', 'viewMapBtn', 'viewThemeBtn', 'btnPageSeo', 'backgroundBtn', 'versionsNav', 'meshNav', ...ACCOUNT_MENU_IDS];
export async function openAccountMenu(app) {
  if (await app.evaluate(() => document.getElementById('accountMenu').hidden)) await app.click('#accountBtn');
  await app.locator('#accountMenu').waitFor({ state: 'visible', timeout: scaled(5000) });
}
export const openMoreMenu = openAccountMenu;
/* a real click on a header control, opening the More menu first when it lives there */
export async function clickHeader(app, id, options) {
  if (MORE_MENU_IDS.includes(id)) await openAccountMenu(app);
  await app.click('#' + id, options);
}
/* version history (More -> Version history); returns the panel */
export async function openVersions(app) {
  if (await app.locator('#versionsPanel').isHidden()) await clickHeader(app, 'versionsNav');
  const panel = app.locator('#versionsPanel');
  await panel.waitFor({ state: 'visible', timeout: scaled(10000) });
  return panel;
}
/* Design tips (the canvas strip, in Edit style): opens its popover */
export async function openDesignTips(app) {
  await setLens(app, 'design');
  if ((await app.locator('#btnCheck').getAttribute('aria-expanded')) !== 'true') await app.click('#btnCheck');
  const pop = app.locator('#studioRoot > .pop', { has: app.locator('ul.checks') });
  await pop.waitFor({ state: 'visible', timeout: scaled(10000) });
  return pop;
}
/* New page or article, asked for by title (the Pages tab's + New); kind 'page' | 'article'.
   `address` (optional) is typed under Developer details instead of the derived one. */
export async function createItem(app, kind, title, address) {
  await openRailTab(app, 'pages');
  if ((await app.locator('#btnNewItem').getAttribute('aria-expanded')) !== 'true') await app.click('#btnNewItem');
  await app.click(`#newItemPanel [data-new-kind="${kind}"]`);
  await app.fill('#newTitle', title);
  if (address) {
    const dev = app.locator('#newItemPanel .ark-disclosure__trigger');
    if ((await dev.getAttribute('aria-expanded')) !== 'true') await dev.click();
    await app.fill(kind === 'page' ? '#newId' : '#newSlug', address);
  }
  await app.click('#newItemCreate');
}
/* the lens: 'content' | 'design' (what a click on the canvas edits) */
export async function setLens(app, lens) {
  const id = { content: 'lensContentBtn', design: 'lensDesignBtn' }[lens];
  if (!id) throw new Error('no lens named ' + lens);
  if ((await app.locator('#' + id).getAttribute('aria-pressed')) !== 'true') await app.click('#' + id);
  await app.waitForFunction((b) => document.getElementById(b).getAttribute('aria-pressed') === 'true', id, { timeout: scaled(15000) });
}
/* the view: 'canvas' | 'map' | 'theme', from wherever the editor is (in either lens) */
export async function designView(app, view) {
  const id = { canvas: 'viewCanvasBtn', map: 'viewMapBtn', theme: 'viewThemeBtn' }[view];
  if (!id) throw new Error('no view named ' + view);
  if ((await app.locator('#' + id).getAttribute('aria-pressed')) !== 'true') await clickHeader(app, id);
  await app.waitForFunction((b) => document.getElementById(b).getAttribute('aria-pressed') === 'true', id, { timeout: scaled(15000) });
}
/* a rail tab: 'pages' | 'layers' | 'lib' | 'media' | 'vault'; returns its pane */
export async function openRailTab(app, tab) {
  const ids = { pages: ['tabPages', 'pagesPane'], layers: ['tabLayers', 'layersPane'], lib: ['tabLib', 'libPane'], media: ['tabMedia', 'mediaPane'], vault: ['tabVault', 'vaultPane'] }[tab];
  if (!ids) throw new Error('no rail tab named ' + tab);
  if (await app.evaluate(() => document.getElementById('btnLeftRail').getAttribute('aria-pressed') !== 'true')) await app.click('#btnLeftRail');
  if ((await app.locator('#' + ids[0]).getAttribute('aria-selected')) !== 'true') await app.click('#' + ids[0]);
  const pane = app.locator('#' + ids[1]);
  await pane.waitFor({ state: 'visible', timeout: scaled(5000) });
  return pane;
}
/* The Page fields sheet for a page ({ page: id }) or an article ({ article: slug }) -- from its
   row's Fields button in the Pages tab, which also shows it on the canvas -- or, with no item,
   for the page on the canvas (the header's #btnPageFields). Returns the sheet's body, where the
   form is drawn (it was Content mode's #editor column). */
export const sheetBody = (app) => app.locator('#sheet:not([hidden]) #sheetBody');
/* a page's or an article's row in the Pages tab ({ page: id } | { article: slug }) */
export const pageRow = (app, item) => app.locator('#pages li.tree-row', { has: app.locator(`.tree-open[data-item="${item.page ? 'page:' + item.page : 'article:' + item.article}"]`) }).first();
export async function openPageFields(app, item) {
  if (item && (item.page || item.article)) {
    await openRailTab(app, 'pages');
    await pageRow(app, item).locator('[aria-label^="Fields of "]').click();
  } else if ((await app.locator('#btnPageFields').getAttribute('aria-expanded')) !== 'true') await app.click('#btnPageFields');
  /* the Developer details of a sheet are closed: drivers reading a key open them themselves */
  const body = sheetBody(app);
  await body.waitFor({ state: 'visible', timeout: scaled(10000) });
  return body;
}
export async function closeSheet(app) { if (await app.locator('#sheet:not([hidden])').count()) await app.click('#sheetClose'); }
/* the popover a header button opened (Studio's openPop: one .pop at a time) */
export const headerPopover = (app) => app.locator('#studioRoot > .pop');
/* this page's SEO popover (opened from beside the page picker); returns it */
export async function openPageSeo(app) {
  if ((await app.locator('#btnPageSeo').getAttribute('aria-expanded')) !== 'true') await clickHeader(app, 'btnPageSeo');
  const pop = app.locator('#studioRoot > .pop.seo-pop');
  await pop.waitFor({ state: 'visible', timeout: scaled(5000) });
  return pop;
}
/* a tab of Site style (the Theme view): 'Colours & background' | 'Visitor defaults' | 'Search defaults' */
export async function siteStyleTab(app, name) {
  await designView(app, 'theme');
  const tab = app.locator('#themePanel [role="tab"]', { hasText: name }).first();
  await tab.waitFor({ state: 'visible', timeout: scaled(15000) });
  if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click();
}
/* the site-wide SEO section of Theme & defaults; returns it */
export async function openSiteSeo(app) {
  await designView(app, 'theme');
  /* Site style is tabbed (Colours & background / Visitor defaults / Search defaults) */
  const tab = app.locator('#themePanel [role="tab"]', { hasText: 'Search defaults' }).first();
  await tab.waitFor({ state: 'visible', timeout: scaled(15000) });
  if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click();
  const box = app.locator('#siteSeo');
  await box.waitFor({ state: 'visible', timeout: scaled(15000) });
  return box;
}
/* the Page transition popover (More -> Page transition; it was called "Background"); returns it */
export async function openBackground(app) {
  if ((await app.locator('#backgroundBtn').getAttribute('aria-expanded')) !== 'true') await clickHeader(app, 'backgroundBtn');
  const pop = app.locator('#studioRoot > .pop', { has: app.locator('h4', { hasText: 'Page transition' }) });
  await pop.waitFor({ state: 'visible', timeout: scaled(5000) });
  return pop;
}

/* The layout key of the element `selector` (and, given, `text`) finds in a site frame, read off
   the DOM after ArkLayout has annotated it for the frame's route. Drivers name the element they
   mean and never write a key: keys are a function of position (js/content/layout.js), and every
   hard-coded one broke when page keys became page-scoped (path:div:1/div:2/section:1/... ->
   page:/...). Throws when nothing matches, naming what was looked for. */
export async function layoutKeyOf(frame, selector, text) {
  const key = await frame.evaluate(([sel, txt]) => {
    if (window.ArkLayout) ArkLayout.annotate(document.getElementById('scene'), window.ArkUI && ArkUI.route ? ArkUI.route.path() : undefined);
    const el = [...document.querySelectorAll(sel)].find((e) => txt == null || e.textContent.trim().includes(txt));
    return el ? el.getAttribute('data-ark-layout-key') : null;
  }, [selector, text == null ? null : text]);
  if (!key) throw new Error(`no layout key on ${selector}${text == null ? '' : ` with text "${text}"`} in the preview`);
  return key;
}

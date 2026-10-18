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
   directly in tests/), because these need Chromium and take ~a minute.
   Run them by hand:  node tests/browser/studio-flows.mjs
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHost } from '../../scripts/publish-host.mjs';

export const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const COPY = ['index.html', 'admin.html', 'admin-app.html', 'robots.txt', 'sitemap.xml', 'llms.txt', 'css', 'js', 'assets'];

export function copySite(dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  for (const name of COPY) {
    const from = path.join(SITE, name);
    if (fs.existsSync(from)) fs.cpSync(from, path.join(dest, name), { recursive: true });
  }
  return dest;
}

export function startHost(root, port) {
  const publisher = { name: 'flux-chain.ark', authorize: async () => ({}), status: async () => ({}), fetchSite: async () => ({}) };
  const dataDir = path.join(root, '.admin-data');
  const server = createHost({ root, publisher, port, dataDir, localDevelopment: true, onNotice: () => {} });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

/* A directory handle rooted at `root` on disk. The browser side only ever sees
   names and text; every read and write crosses the `__fakeFs` binding. */
export async function fakeFolder(context, root) {
  await context.exposeBinding('__fakeFs', (_source, op, rel, text) => {
    const file = path.resolve(root, rel);
    if (path.relative(root, file).startsWith('..')) throw new Error('outside the fake folder: ' + rel);
    if (op === 'isFile') return fs.existsSync(file) && fs.statSync(file).isFile();
    if (op === 'isDir') return fs.existsSync(file) && fs.statSync(file).isDirectory();
    if (op === 'mkdir') { fs.mkdirSync(file, { recursive: true }); return true; }
    if (op === 'read') return fs.readFileSync(file, 'utf8');
    if (op === 'write') { fs.writeFileSync(file, text); return true; }
    if (op === 'remove') { fs.rmSync(file, { force: true }); return true; }
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
      };
    }
    window.showDirectoryPicker = async () => dirHandle('', 'defxn-copy');
  });
}

/* the real-site preview frame (#cmsPreview inside admin-app.html; js/main.js strips the
   ?cms-preview flag from its own URL, so it is found by element, not by URL), once the page
   inside it has been annotated with layout keys */
export async function previewFrame(app, timeout = 20000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    const handle = await app.$('#cmsPreview');
    const frame = handle && await handle.contentFrame();
    if (frame) {
      try { if (await frame.evaluate(() => !!document.querySelector('[data-ark-layout-key]'))) return frame; } catch { /* navigating */ }
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('the preview frame never loaded an annotated page');
}

/* the editor frame (admin-app.html inside admin.html's #app) */
export async function appFrame(page) {
  const handle = await page.waitForSelector('#app', { timeout: 20000 });
  const frame = await handle.contentFrame();
  await frame.waitForSelector('#modeDesignBtn', { timeout: 20000 });
  return frame;
}

/* ---- the contextual toolbar's SHELL ---------------------------------------------------
   #selToolbar is a bar of icon buttons, one per section ([data-section], named by
   [data-name]) plus actions ([data-action], named by aria-label); the open section's
   controls are in the one popover #selToolbarPop. Drivers name a section and act on the
   controls inside it -- every assumption about how the shell is drawn lives here, so a
   shell change edits this block and no driver. Names match by prefix ("States" matches
   "States (2)"). */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const toolbarButton = (app, name) => app.locator(`#selToolbar:not([hidden]) [data-section][data-name^="${name}"]`).first();
export const toolbarAction = (app, label) => app.locator(`#selToolbar:not([hidden]) [data-action][aria-label="${label}"]`).first();
export const toolbarPopover = (app) => app.locator('#selToolbarPop:not([hidden])');
export async function hasToolbarSection(app, name) { return (await toolbarButton(app, name).count()) > 0; }
export async function toolbarSectionIsOpen(app, name) {
  const button = toolbarButton(app, name);
  return (await button.count()) > 0 && (await button.getAttribute('aria-expanded')) === 'true';
}
/* the section names the bar offers for the current selection, in order */
export const toolbarSections = (app) => app.evaluate(() => [...document.querySelectorAll('#selToolbar:not([hidden]) [data-section]')].map((b) => b.dataset.name));
/* the layout key of what the toolbar is editing (null when it is not showing) */
export const toolbarKey = (app) => app.evaluate(() => { const bar = document.getElementById('selToolbar'); return bar && !bar.hidden ? bar.dataset.key || null : null; });
/* open one section (a no-op when it is already open) and return the element holding its controls */
export async function openToolbarSection(app, name, timeout = 5000) {
  const button = toolbarButton(app, name), end = Date.now() + timeout;
  while (!(await button.count())) {
    if (Date.now() > end) throw new Error(`the toolbar has no "${name}" section (it offers: ${(await toolbarSections(app)).join(', ') || 'nothing'})`);
    await sleep(100);
  }
  /* Already open is not proof it STAYS open: an identity section (States, Component instance)
     auto-opens on the selection that created it, and a driver that has just clicked another
     element may find it open a moment before that click's selection message lands -- which
     closes it, by design (a new selection closes the popover). The driver then waited 30 s on
     a popover that was gone (studio-flows "becomes the trigger", full-audit "state group").
     So an already-open section is re-read after the preview has had time to report. */
  if (await toolbarSectionIsOpen(app, name)) await sleep(400);
  if (!(await toolbarSectionIsOpen(app, name))) await button.click();
  const body = app.locator(`#selToolbarPop:not([hidden])[aria-label^="${name}"] .tb-pop-body`);
  await body.waitFor({ state: 'visible', timeout: Math.max(500, end - Date.now()) });
  return body;
}
export async function closeToolbarSection(app) {
  const close = app.locator('#selToolbarPop:not([hidden]) .tb-pop-x');
  if (await close.count()) await close.click();
}

/* ---- the ONE header (admin-app.html #appBar, 2026-10-18) -----------------------------
   Content and Design share one header; Studio's own second bar and the fixed right panel are
   gone. Where each control now lives, so drivers name the control and not its position:
   - Design's views are one segmented control: #designCanvasBtn, #designMapBtn (the sitemap,
     was #view [data-v=map]), #designBackgroundBtn (the transition popover, was
     #btnCanvasTransitions) and #designThemeBtn (Theme & defaults, which now also holds the
     site-wide SEO as #siteSeo);
   - the canvas-only controls -- #btnLeftRail, #btnPage, #btnPageSeo (this page's SEO
     popover, was the right panel's SEO tab), #devices, #btnUndo/#btnRedo, #btnCheck, #mode --
     show only in Design -> Canvas;
   - ONE #save for every mode (was a Save per editor plus Studio's #btnCmsSave);
   - #connect, #who and #signOut sit in #accountMenu behind #accountBtn (the More menu's
     shortcuts hint too). */
export const ACCOUNT_MENU_IDS = ['connect', 'who', 'signOut'];
export async function openAccountMenu(app) {
  if (await app.evaluate(() => document.getElementById('accountMenu').hidden)) await app.click('#accountBtn');
  await app.locator('#accountMenu').waitFor({ state: 'visible', timeout: 5000 });
}
/* a real click on a header control, opening the account menu first when it lives there */
export async function clickHeader(app, id, options) {
  if (ACCOUNT_MENU_IDS.includes(id)) await openAccountMenu(app);
  await app.click('#' + id, options);
}
/* Design -> 'canvas' | 'map' | 'theme', from wherever the editor is */
export async function designView(app, view) {
  if (await app.evaluate(() => document.getElementById('modeDesignBtn').getAttribute('aria-selected') !== 'true')) await app.click('#modeDesignBtn');
  const id = { canvas: 'designCanvasBtn', map: 'designMapBtn', theme: 'designThemeBtn' }[view];
  if (!id) throw new Error('no Design view named ' + view);
  if ((await app.locator('#' + id).getAttribute('aria-pressed')) !== 'true') await app.click('#' + id);
  await app.waitForFunction((b) => document.getElementById(b).getAttribute('aria-pressed') === 'true', id, { timeout: 15000 });
}
/* the popover a header button opened (Studio's openPop: one .pop at a time) */
export const headerPopover = (app) => app.locator('#studioRoot > .pop');
/* this page's SEO popover (opened from beside the page picker); returns it */
export async function openPageSeo(app) {
  await designView(app, 'canvas');
  if ((await app.locator('#btnPageSeo').getAttribute('aria-expanded')) !== 'true') await app.click('#btnPageSeo');
  const pop = app.locator('#studioRoot > .pop.seo-pop');
  await pop.waitFor({ state: 'visible', timeout: 5000 });
  return pop;
}
/* the site-wide SEO section of Theme & defaults; returns it */
export async function openSiteSeo(app) {
  await designView(app, 'theme');
  const box = app.locator('#siteSeo');
  await box.waitFor({ state: 'visible', timeout: 15000 });
  return box;
}
/* the Background (page transition) popover; returns it */
export async function openBackground(app) {
  if ((await app.locator('#designBackgroundBtn').getAttribute('aria-expanded')) !== 'true') {
    if (await app.evaluate(() => document.getElementById('modeDesignBtn').getAttribute('aria-selected') !== 'true')) await app.click('#modeDesignBtn');
    await app.click('#designBackgroundBtn');
  }
  const pop = app.locator('#studioRoot > .pop', { has: app.locator('h4', { hasText: 'Background transition' }) });
  await pop.waitFor({ state: 'visible', timeout: 5000 });
  return pop;
}

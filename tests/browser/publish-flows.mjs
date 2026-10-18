/* =====================================================================
   PUBLISH ROUND TRIP, END TO END: editor -> signed publish -> miner -> pull -> public page
   ---------------------------------------------------------------------
   Why this exists: Publish once carried 8 of the 13 drafts. Settings defaults,
   components, states, canvas transitions and element motion worked in the editor and
   after a local Save, and were silently missing from the site on the mesh. Every
   counter balanced and every archive decoded, so only the PAYLOAD could show it: this
   follows the five drafts from the real editor all the way to what a visitor sees.

     1. a scratch copy of the site whose saved files hold all five drafts, populated
        non-default (tests/browser/site-drafts-fixture.mjs) on a real element of '/';
     2. the REAL editor (admin-app.html in Chromium, local-development host) is asked
        what Publish would send right now: window.ArkAdminApp.site(), i.e. siteFromState();
     3. that payload is published through the REAL client (js/admin/publish.js run as the
        page runs it), signed by a real Ed25519 identity, through the REAL publish host
        (createHost) and publisher (createPublisher), into a miner;
     4. the published name is resolved and its archive pulled with the publisher's own
        fetchSite() and written with writeProject() -- exactly `pull-site.mjs --write`;
     5. the pulled copy is served and its PUBLIC page (no preview flag, fresh visitor) must
        render the state group with its component instance, and carry the canvas
        transition, the element motion and the settings default -- and a control copy
        that was never published must not, so the checks cannot pass vacuously.

   The miner is an in-process stub of the five miner routes the publisher calls
   (/status, /debug/name-record[/publish], /api/v0/add|cat|public-marker), storing
   archives by their real BLAKE3 CID. It is NOT ark-miner-cli: replication, pinning and
   the public gateway (gateway/app.js, *.defxn.com) are not exercised here. For a real
   miner run tests/publish.e2e.test.mjs against one.

   Run:   node tests/browser/publish-flows.mjs [--headed] [--keep]
   Needs: Chromium from `npx playwright install chromium`. Not run by scripts/run-tests.mjs.
   ===================================================================== */
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { chromium } from 'playwright';
import { SITE, copySite, startHost, appFrame, listen, until as untilFor, watchSignals, waitForRouteReady, nextFrames } from './harness.mjs';
import { populatedDrafts, GROUP, BLOCK_TEXT } from './site-drafts-fixture.mjs';
import { createPublisher } from '../../scripts/lib/publisher.mjs';
import { readProject, writeProject, siteDrafts } from '../../scripts/lib/site-bundle.mjs';
import { cidForBytes } from '../../../../flx/flx-codec/src/blake3.js';
import { createFluxRootHandle } from '../../../flux-auth/src/rootFromMnemonic.mjs';

const args = process.argv.slice(2);
const FIVE = ['settingsDefaults', 'components', 'states', 'canvasTransitions', 'elementMotion'];
const EDITOR = fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-publish-editor-'));
const PULLED = fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-publish-pulled-'));

let failures = 0;
class StepFailure extends Error {}
function check(condition, message) { if (!condition) throw new StepFailure(message); }
async function step(name, run) {
  try { const out = await run(); console.log(`ok   ${name}`); return out; }
  catch (error) { failures += 1; console.log(`FAIL ${name}\n     ${error instanceof StepFailure ? error.message : error.stack}`); throw error; }
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/* the harness's until (budget x load factor) */
const until = (probe, message, timeout = 15000) => untilFor(probe, message, timeout, { interval: 150, fail: (m) => new StepFailure(m) });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ---- the miner stub: the routes scripts/lib/publisher.mjs calls, nothing else ---- */
function startMiner() {
  const blobs = new Map(); let record = null;
  const body = (req) => new Promise((resolve) => { const chunks = []; req.on('data', (c) => chunks.push(c)); req.on('end', () => resolve(Buffer.concat(chunks))); });
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const json = (status, value) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(value)); };
    if (url.pathname === '/status') return json(200, { network_id: 'stub' });
    if (url.pathname === '/debug/name-record' && req.method === 'GET') return json(200, { record });
    if (url.pathname === '/debug/name-record/publish' && req.method === 'POST') {
      const next = JSON.parse(await body(req)).record;
      if (record && next.version !== record.version + 1) return json(409, { ok: false, error: 'version must advance exactly by one' });
      record = next; return json(200, { ok: true });
    }
    if (url.pathname === '/api/v0/add' && req.method === 'POST') { const bytes = new Uint8Array(await body(req)); const cid = cidForBytes(bytes); blobs.set(cid, bytes); return json(200, { cid }); }
    if (url.pathname === '/api/v0/cat') { const bytes = blobs.get(url.searchParams.get('arg')); if (!bytes) return json(404, { error: 'not found' }); res.writeHead(200, { 'content-type': 'application/octet-stream' }); return res.end(Buffer.from(bytes)); }
    if (url.pathname === '/api/v0/public-marker' && req.method === 'POST') { await body(req); return json(200, { ok: true }); }
    return json(404, { error: 'stub miner has no ' + url.pathname });
  });
  return listen(server);   /* any free port: .port / .origin */
}

/* ---- the real admin client (js/admin/publish.js), signed in the way admin.html's gate does ---- */
async function signedClient(origin) {
  const handle = await createFluxRootHandle('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
  const who = { publicKeyB64: handle.publicKeyB64, displayName: 'publish-flows', sign: async (text) => Buffer.from(await handle.sign(new TextEncoder().encode(text))).toString('base64') };
  let cookie = '';
  const jar = async (url, init = {}) => {
    const response = await fetch(url, { ...init, headers: { ...(init.headers || {}), ...(cookie ? { cookie } : {}) } });
    const set = response.headers.get('set-cookie'); if (set) cookie = set.split(';')[0];
    return response;
  };
  const headers = { 'content-type': 'application/json' };
  const challenge = await (await jar(origin + '/api/session/challenge', { method: 'POST', headers, body: '{}' })).json();
  const login = await (await jar(origin + '/api/session/login', { method: 'POST', headers, body: JSON.stringify({ publicKeyB64: who.publicKeyB64, nonce: challenge.nonce, signature: await who.sign(challenge.message), label: who.displayName }) })).json();
  if (!login.done) throw new Error('sign-in did not finish in one step (is OTP enabled in scripts/publish-host.mjs?): ' + JSON.stringify(login));
  const context = vm.createContext({ btoa, atob, TextEncoder, Uint8Array, globalThis: {} });
  vm.runInContext(fs.readFileSync(path.join(SITE, 'js/admin/publish.js'), 'utf8'), context);
  return context.ArkPublish.create({ fetch: jar, base: origin, identity: () => who });
}

/* what a visitor of `origin` sees of the five drafts */
async function visitorView(browser, origin, memberKey) {
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } }); /* fresh: no visitor choice in localStorage */
  await watchSignals(context);
  const page = await context.newPage();
  await page.goto(origin + '/');
  await until(() => page.evaluate(() => !!document.querySelector('[data-ark-layout-key]') && !!window.ArkStates), 'the public page never annotated its elements');
  /* the route is mounted, and the layout/states passes it queues in a rAF have run */
  await waitForRouteReady(page.mainFrame(), { path: '/' });
  await nextFrames(page.mainFrame());
  const view = await page.evaluate(({ group, key }) => {
    const shown = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).display !== 'none';
    const member = [...document.querySelectorAll('[data-ark-layout-key]')].find((e) => e.getAttribute('data-ark-layout-key') === key);
    const anchor = document.querySelector('[data-ark-state-anchor][data-ark-state-group="' + group + '"]');
    const instance = anchor && anchor.querySelector('[data-ark-component-key]');
    return {
      memberShown: shown(member),
      anchorShown: shown(anchor), anchorIndex: anchor && anchor.getAttribute('data-ark-state-index'),
      instanceKey: instance && instance.getAttribute('data-ark-component-key'), instanceText: instance ? instance.textContent.trim() : null,
      canvasTransitions: window.ArkCanvasTransitions && ArkCanvasTransitions.get(),
      elementMotion: window.ArkElementMotion && ArkElementMotion.get(),
      settingsDefaults: window.ArkSiteDefaults && ArkSiteDefaults.get(),
      theme: document.documentElement.dataset.theme || null,
    };
  }, { group: GROUP, key: memberKey });
  if (args.includes('--headed')) await wait(1500);   /* a pause for a person watching --headed, not a readiness wait */
  await page.screenshot({ path: path.join(PULLED, `public-${origin.split(':').pop()}.png`) }).catch(() => {});
  await context.close();
  return view;
}

const servers = [];
const browser = await chromium.launch({ headless: !args.includes('--headed') });
const errors = [];
browser.on('disconnected', () => {});
try {
  copySite(EDITOR); copySite(PULLED);
  const editorHost = await startHost(EDITOR); servers.push(editorHost);
  const editorOrigin = editorHost.origin;

  const memberKey = await step('find a real, visible element on / to build the state group on', async () => {
    const context = await browser.newContext(); const page = await context.newPage();
    await page.goto(editorOrigin + '/');
    const key = await until(() => page.evaluate(() => {
      /* a heading: page content a person would group into states, not the persistent
         background scene (id:scene), which the page router owns and keeps displayed */
      const el = [...document.querySelectorAll('h1[data-ark-layout-key], h2[data-ark-layout-key]')].find((e) => e.getClientRects().length && getComputedStyle(e).display !== 'none' && !e.closest('header, [data-ark-layer="persistent"]') && (e.textContent || '').trim().length > 3);
      return el && el.getAttribute('data-ark-layout-key');
    }), 'no visible annotated element on /');
    await context.close();
    return key;
  });
  console.log(`     member key: ${memberKey}`);

  const saved = await step('the editor copy\'s saved files hold all five drafts, populated (what a Save would have written)', async () => {
    const site = readProject(EDITOR);
    Object.assign(site, populatedDrafts(EDITOR, { route: '/', memberKey }));
    writeProject(site, EDITOR);
    const back = readProject(EDITOR);
    for (const key of FIVE) check(same(back[key], site[key]), `${key} did not land in the editor copy's files`);
    return back;
  });

  const payload = await step('the REAL editor\'s publish payload (ArkAdminApp.site()) carries all 13 drafts, the five exactly as saved', async () => {
    const context = await browser.newContext({ viewport: { width: 1500, height: 950 } });
    const page = await context.newPage(); page.on('dialog', (d) => d.dismiss());
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(editorOrigin + '/admin');
    const app = await appFrame(page);
    const site = await until(() => app.evaluate((n) => { const s = window.ArkAdminApp && window.ArkAdminApp.site(); return s && s.articles.length === n && s.articles.every((a) => Array.isArray(a.sections)) ? s : null; }, saved.articles.length), 'the editor never had every article body loaded');
    check(!(await app.evaluate(() => window.ArkAdminApp.unsaved())), 'the editor reports unsaved drafts on a freshly opened copy, so Publish would refuse');
    await context.close();
    const keys = siteDrafts(EDITOR).map((d) => d.key);
    check(same(Object.keys(site), keys), `the payload's drafts are ${Object.keys(site).join(', ')}; the one list is ${keys.join(', ')}`);
    for (const key of FIVE) check(same(site[key], saved[key]), `the editor would publish ${key} different from what is saved: ${JSON.stringify(site[key]).slice(0, 200)}`);
    return site;
  });

  const miner = await startMiner(); servers.push(miner);
  const minerBase = miner.origin;
  const publisher = createPublisher({ name: 'publish-flows.ark', statusBase: minerBase, pinBase: minerBase, key: 'stub-key', root: EDITOR });
  /* the real host in its signed (not local-development) mode, on its own free port */
  const host = await startHost(EDITOR, 0, { publisher, localDevelopment: false,
    permissions: async () => ({ authorized: true, source: 'publish-flows test' }), resolveCheck: async () => ({ skipped: 'publish-flows: no public gateway in this test' }) });
  servers.push(host);

  const published = await step('publish it: real client signs, real host + publisher put one archive on the miner and name it', async () => {
    const client = await signedClient(host.origin);
    const result = await client.publishSite(payload);
    check(result.published === 1 && result.confirmed, 'publish did not confirm version 1: ' + JSON.stringify(result));
    return result;
  });

  const pulled = await step('pull it back (fetchSite + writeProject = pull-site --write): every draft byte-identical to the payload', async () => {
    const { cid, site } = await publisher.fetchSite();
    check(cid === published.cid, 'the name resolves to ' + cid + ', not the published ' + published.cid);
    for (const key of Object.keys(payload)) check(same(site[key], payload[key]), `${key} came back from the mesh different from what the editor published`);
    return site;
  });

  const pulledHost = await startHost(PULLED); servers.push(pulledHost);
  const pulledOrigin = pulledHost.origin;

  await step('control: the same copy BEFORE the pull shows none of the five (so the checks below can fail)', async () => {
    const v = await visitorView(browser, pulledOrigin, memberKey);
    check(!v.anchorShown && !v.instanceText, 'the unpublished copy already shows the state/component');
    check(v.memberShown, 'the member element is not visible on the unpublished copy');
    check(!same(v.canvasTransitions, pulled.canvasTransitions), 'the unpublished copy already has the canvas transition');
    check(!same(v.elementMotion, pulled.elementMotion), 'the unpublished copy already has the element motion');
    check(!same(v.settingsDefaults, pulled.settingsDefaults) && v.theme !== pulled.settingsDefaults.theme, 'the unpublished copy already has the settings default');
  });

  await step('write the pulled site into the copy', async () => {
    const changes = writeProject(pulled, PULLED).map((c) => c.relative);
    for (const d of siteDrafts(PULLED).filter((x) => FIVE.includes(x.key))) check(changes.includes(`js/content/${d.file}-data.js`), `the pull did not write js/content/${d.file}-data.js`);
  });

  await step('PUBLIC page of the published site: state group + component instance render, transition/motion/defaults are live', async () => {
    const v = await visitorView(browser, pulledOrigin, memberKey);
    check(v.anchorShown && v.anchorIndex === '1', `the state group's state 1 is not shown (anchor shown ${v.anchorShown}, index ${v.anchorIndex})`);
    check(!v.memberShown, 'state 0\'s member is still shown although the group is on state 1');
    check(v.instanceKey === 'pubkey' && v.instanceText && v.instanceText.includes(BLOCK_TEXT), `the component instance did not render its text: ${JSON.stringify([v.instanceKey, v.instanceText])}`);
    check(same(v.canvasTransitions, pulled.canvasTransitions), 'the canvas transition the visitor runtime holds is ' + JSON.stringify(v.canvasTransitions));
    check(same(v.elementMotion, pulled.elementMotion), 'the element motion the visitor runtime holds is ' + JSON.stringify(v.elementMotion));
    check(same(v.settingsDefaults, pulled.settingsDefaults), 'the settings default the visitor runtime holds is ' + JSON.stringify(v.settingsDefaults));
    check(v.theme === pulled.settingsDefaults.theme, `a fresh visitor lands on theme ${v.theme}, not the published default ${pulled.settingsDefaults.theme}`);
  });
} catch { /* reported by step() */ }
finally {
  await browser.close();
  for (const server of servers) await new Promise((resolve) => server.close(resolve));
  if (errors.length) console.log('page errors (not counted as failures):\n  ' + errors.slice(0, 5).join('\n  '));
  if (!args.includes('--keep')) { fs.rmSync(EDITOR, { recursive: true, force: true }); fs.rmSync(PULLED, { recursive: true, force: true }); }
  else console.log(`kept: ${EDITOR} (editor copy), ${PULLED} (pulled copy, screenshots)`);
  console.log(failures ? `\n${failures} step(s) FAILED` : '\npublish flows: all steps ok');
  process.exit(failures ? 1 : 0);
}

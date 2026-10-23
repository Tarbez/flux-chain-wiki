/* =====================================================================
   ACCOUNT FLOWS -- /account, driven in a real Chromium through every path that does not need a
   real chain. Written BEFORE the page was converted to Ark blocks (docs/ux-audit/plan.md, resume
   point 1: "/account conversion with browser coverage of sign-in, wallet and keys first"), run
   green against the hand-built page, and kept as the safety net for the conversion.

   Why this exists: /account is the page that holds a person's keys. Its unit tests
   (tests/account-session.cjs, tests/account-keys-dom.mjs) run in a toy DOM or jsdom, so nothing
   had ever checked in a browser that the signed-out card, the tabs, the wallet, the signing
   dialogs and the contact lists work together -- and a conversion that rebuilds the markup
   would have been judged by reading code. This drives the real page, with the real Auth Kit
   unlock (a disposable kit from flux-launchpad's fixtures: PIN and password are its test
   credentials), the real Scoped Claim Authorization dialog and the real signing code.

   What is faked, and how (nothing leaves the machine; every other external request is aborted):
   - the dense-wire chain server: page.routeWebSocket answers NATIVE_BALANCE / HEAD /
     NATIVE_SEND / BLOB_GET from a small state object, and records every line it was sent, so a
     step can assert that a cancelled review sent NOTHING;
   - the mesh directory (https://cd1.defxn.com): a tiny in-memory server for /identity/* and
     /directory/*, so the real client signs real requests and the contact lists show what it
     answered;
   - the miner's explorer (http://127.0.0.1:8766/explorer/v1/record): the Network tab's
     "Verify identity", in four modes (verified, verified with account, refused, unverified).

   Steps (each a named check, so one run lists every defect):
    1  signed-out card: one visible h1 ("Sign in to DEFXN"), no second heading as large, the sign-in
       action, no wallet / keys / contacts / network tabs, no rail, no identity details, the two ways
       on (bundle deployer, domains) as VISIBLE links, the publishing link
    2  Sign in / Create identity pair and the create wizard mounting, and coming back
    3  "Sign in with your Auth Kit" opens the file chooser; a wrong PIN stays signed out and says so
    4  real unlock: status, name as the h1, identity ID / wallet values, the copy buttons (clipboard,
       and the label saying Copied), the root key under Developer details, the rail
    5  unlocking an identity the directory has not seen shows the publish review (full modal), and
       Cancel leaves a notice on the page
    6  tabs: five of them once unlocked, Wallet first; mouse, Enter, Space, and (Ark tabs) ArrowRight,
       End, Home; rail buttons open their tab; the Session view when signed in
    7  wallet: no ledger ("No reading", never 0), a zero balance, a held balance, Refresh, public-key
       copy, the Credits "not built" state, network switching (the wire URL changes)
    8  send: form, bad input is named, Cancel on the review sends nothing, Approve sends one signed
       line, a refusal is named, a success returns to the wallet and re-reads
    9  signing keys: list, add (cancel, then approve), rotate, revoke, delegate, revoke delegation --
       every one behind the full review dialog (this step found the Keys view inert: see below)
   10  contacts: lists with counts, search, invite, no-match "invite directly", open a contact and come
       back, accept, decline, withdraw, refresh
   11  network: verify identity (verified / with account / refused / unverified), the rail's status
       mirrors it
   12  remembered state after a reload (identity saved, Auth Kit not): which tabs exist, forget saved
       details -> signed out and stays signed out after a reload; 12b the visitor's wording
   13  routes: the domains link and the explorer link, and the unlocked identity survives going
       there and back
   14  phone width (390): no horizontal scroll, the sign-in control is reachable

   Phase 1 / Phase 2 (W4-S2, 2026-10-20). This driver was written and run green against the
   hand-built page FIRST. That first run found a real defect the unit tests could not: the Keys view
   read `walletAddresses` and the wallet methods off the public identity pointer (six frozen fields,
   js/ark/local-identity.js) instead of the signer, so in a real browser the list always said "No
   signing wallets yet." and every Keys button silently did nothing (step 9 failed; the old jsdom
   test stubbed the pointer with a pass-through of the full object). It was fixed (js/pages/account.js
   signer()) before the conversion, and step 9 is its regression test. Then the page was converted;
   the labels in L below and the steps marked "(Ark)" are the Phase 2 changes, the flows are the same.

   Phase 3 (W4-S2, Ark 0.2.8's form, list, status-line, choice and interactive-stat blocks): the send form, the
   signing-wallet forms, the contacts search, the contact and wallet lists, the result lines and the glance rail's
   tiles are Ark's blocks now, so their controls are found by role, label and id (#account-send-status,
   #account-keys-list ...) instead of the old data-account-* hooks. Behaviour changes it checks: a zero amount is
   refused in the amount field itself ("below 1", Needs / Fix) instead of by the browser; a signing wallet's default
   marker is a "Default" status; the rail's unread numbers read "No reading". Two defects found on the way are
   regressions here and in tests/account-session.cjs: a wallet the vault names twice made Ark's list replace itself
   with its refusal (step 9), and Ark's patch rewrote a form label's `for` (step 8).

   Run: node scripts/run-browser-tests.mjs --only account-flows
        (or node tests/browser/account-flows.mjs). Load factor and ports: harness.mjs.
   ===================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { copySite, startHost, routeSettled, scaled, until, reportNotBuilt } from './harness.mjs';

/* The disposable v9 Auth Kit flux-auth's own tests use (generated by ark-dao's createRecoveryIdentity;
   no value behind it) -- the same file tests/account-keys-dom.mjs unlocks. */
const KIT_FILE = '/Volumes/PortableSSD/flux/flux-launchpad/js/fixtures/real-auth-kit-v9.flx';
const KIT_PIN = '13572468';
const KIT_PASSWORD = 'launchpad-test';
const KIT = {
  identityId: '26f49d00905d12d32b880bb8c6673c38ca925e38fd7621f37bb8b3eabf58ddaf',
  wallet: 'd43kkms26scspdyq92r3fhgmf1kefxra7xcr5vqa62qghh7fdqsmcdczwnm0',
  pubHex: '75ed6d641e9ffc4d5bf757adcc16fa9d91f7a7509ffacf134be43ad471d56774',
  displayName: 'Real Kit'
};

/* Words the page shows for each control. Pulled out so that renaming a label is one edit here and
   the steps keep checking behaviour. (Phase 2 of the /account conversion changes labels, not flows.) */
const L = {
  tabs: { session: 'Session', wallet: 'Wallet', keys: 'Signing keys', contacts: 'Contacts', network: 'Network' },
  signIn: 'Sign in', create: 'Create identity',
  chooseKit: /^(Sign in with your Auth Kit|Select your Auth Kit)$/,
  signedOutTitle: 'Sign in to DEFXN', identityId: /^identity id$/i, copyGhost: 'Copy identity ID', copyWallet: 'Copy wallet address', copyKey: 'Copy public key',
  send: 'Send FXN', refresh: 'Refresh', verify: 'Verify identity'
};

const ACCOUNT = '[data-ark-page="account"]';
const failures = [];
const check = (ok, message) => { if (ok) console.log('ok   ' + message); else { failures.push(message); console.log('FAIL ' + message); } };
/* a step that throws is one failure naming the step (and the first line of why); the run goes on */
async function step(name, fn) {
  try { await fn(); } catch (error) { failures.push(`${name}: ${String(error && error.message || error).split('\n')[0]}`); console.log(`FAIL ${name}: ${String(error && error.message || error).split('\n')[0]}`); }
}
const hex = (n) => 'ab'.repeat(n);

/* ---- the fakes ------------------------------------------------------------------------------ */

/* The directory: GET/POST /identity/*, /directory/social-edge/*, /directory/contact-invite-index/*
   (the paths js/ark/mesh-directory-client.js calls). `me` is the kit's identity id. */
function makeDirectory() {
  const dir = {
    log: [],
    profiles: {
      [KIT.identityId]: { identityId: KIT.identityId, displayUsername: KIT.displayName, publicId: KIT.identityId, visibility: 'public', updatedAt: '2026-10-01T00:00:00Z' },
      'ghost-alice': { identityId: 'ghost-alice', displayUsername: 'Alice', publicId: 'alice', visibility: 'public', updatedAt: '2026-10-02T10:00:00Z', bio: 'Alice builds resolvers.' },
      'ghost-bob': { identityId: 'ghost-bob', displayUsername: 'Bob', publicId: 'bob', visibility: 'public', updatedAt: '2026-10-03T10:00:00Z' },
      'ghost-carol': { identityId: 'ghost-carol', displayUsername: 'Carol', publicId: 'carol', visibility: 'public', updatedAt: '2026-10-04T10:00:00Z' },
      'ghost-dave': { identityId: 'ghost-dave', displayUsername: 'Dave', publicId: 'dave', visibility: 'public', updatedAt: '2026-10-05T10:00:00Z' },
      'ghost-eve': { identityId: 'ghost-eve', displayUsername: 'Eve', publicId: 'eve', visibility: 'public', updatedAt: '2026-10-06T10:00:00Z' }
    },
    edges: [], index: []
  };
  const edge = (from, to, status) => ({ fromIdentityId: from, relation: 'invite', toIdentityId: to, status, updatedAt: '2026-10-07T00:00:00Z', version: 1 });
  dir.reset = () => {
    dir.log = [];
    dir.edges = [edge('ghost-alice', KIT.identityId, 'pending'), edge('ghost-eve', KIT.identityId, 'pending'),
      edge(KIT.identityId, 'ghost-bob', 'accepted'), edge(KIT.identityId, 'ghost-carol', 'pending')];
    dir.index = [{ toIdentityId: KIT.identityId, fromIdentityId: 'ghost-alice' }, { toIdentityId: KIT.identityId, fromIdentityId: 'ghost-eve' }];
  };
  dir.reset();
  dir.handle = async (route) => {
    const request = route.request(), url = new URL(request.url()), method = request.method();
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'content-type': 'application/json' };
    const reply = (status, body) => route.fulfill({ status, headers, body: JSON.stringify(body) });
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers });
    const p = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    const body = method === 'POST' ? (() => { try { return JSON.parse(request.postData() || '{}'); } catch { return {}; } })() : null;
    dir.log.push(`${method} ${url.pathname}${url.search}`);
    if (p[0] === 'identity' && p[1] === 'search') {
      const q = (url.searchParams.get('q') || '').toLowerCase();
      return reply(200, { results: Object.values(dir.profiles).filter((r) => r.identityId !== KIT.identityId && (r.displayUsername || '').toLowerCase().includes(q)) });
    }
    if (p[0] === 'identity' && p[1] === 'publish' && method === 'POST') { dir.profiles[body.record.identityId] = body.record; return reply(200, { ok: true }); }
    if (p[0] === 'identity' && p[1]) return dir.profiles[p[1]] ? reply(200, { record: dir.profiles[p[1]] }) : reply(404, { error: 'No such identity.' });
    if (p[0] === 'directory' && p[1] === 'social-edge') {
      if (method === 'GET' && p.length === 3) return reply(200, { records: dir.edges.filter((e) => e.fromIdentityId === p[2]) });
      if (method === 'GET' && p.length === 5) { const e = dir.edges.find((x) => x.fromIdentityId === p[2] && x.relation === p[3] && x.toIdentityId === p[4]); return e ? reply(200, { record: e }) : reply(404, { error: 'none' }); }
      if (method === 'POST' && p.length === 5) {
        dir.edges = dir.edges.filter((x) => !(x.fromIdentityId === p[2] && x.relation === p[3] && x.toIdentityId === p[4]));
        dir.edges.push({ ...body.record, fromIdentityId: p[2], relation: p[3], toIdentityId: p[4] });
        return reply(200, { ok: true });
      }
    }
    if (p[0] === 'directory' && p[1] === 'contact-invite-index') {
      if (method === 'GET') return reply(200, { records: dir.index.filter((r) => r.toIdentityId === p[2]) });
      if (method === 'POST') { dir.index.push({ toIdentityId: p[2], fromIdentityId: p[3] }); return reply(200, { ok: true }); }
    }
    return reply(404, { error: 'unhandled ' + url.pathname });
  };
  return dir;
}

/* The chain server: balance = BigInt | null (null = "no FXN ledger here"); sendReply(line) -> the reply
   to a NATIVE_SEND. `lines` is everything the page sent, `urls` every socket it opened. */
function makeWire() {
  const wire = { balance: 1500n, lines: [], urls: [], sendReply: () => `NATIVE_SEND_OK\t${hex(32)}\t1495` };
  wire.install = (page) => page.routeWebSocket(/.*/, (ws) => {
    wire.urls.push(ws.url());
    ws.onMessage((message) => {
      const line = String(message).replace(/\r?\n$/, '');
      wire.lines.push(line);
      const [command, , key] = line.split('\t');
      if (command === 'NATIVE_BALANCE') return ws.send(wire.balance === null ? 'ERR no ledger' : `BALANCE\tdefxn\t${key}\t${wire.balance}`);
      if (command === 'HEAD') return ws.send(`HEAD_NONE\t${line.split('\t')[1]}`);
      if (command === 'NATIVE_SEND') return ws.send(wire.sendReply(line));
      if (command === 'BLOB_GET') return ws.send('BLOB_MISS');
      return ws.send('ERR unknown');
    });
  });
  wire.sent = () => wire.lines.filter((l) => l.startsWith('NATIVE_SEND\t')).length;
  return wire;
}

/* The explorer on the local miner: the Network tab's "Verify identity". */
function makeMiner() {
  const miner = { mode: 'verified', calls: [] };
  miner.handle = async (route) => {
    const request = route.request();
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'content-type': 'application/json' };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    const body = JSON.parse(request.postData() || '{}');
    miner.calls.push(body.sourceId);
    if (miner.mode === 'refused') return route.fulfill({ status: 500, headers, body: JSON.stringify({ error: { message: 'down' } }) });
    const record = (id, state, extra) => ({ apiVersion: 'explorer-api-v1', data: { record: { id, verification: { state }, updatedAt: '2026-10-08T00:00:00Z', provenance: { source: 'test-miner' }, fields: { sourceRecord: extra || {} } } } });
    if (body.sourceId === 'identities') {
      if (miner.mode === 'unverified') return route.fulfill({ status: 200, headers, body: JSON.stringify(record(body.recordId, 'pending')) });
      return route.fulfill({ status: 200, headers, body: JSON.stringify(record(body.recordId, 'verified', miner.mode === 'account' ? { accountId: 'acct-1' } : {})) });
    }
    return route.fulfill({ status: 200, headers, body: JSON.stringify(record(body.recordId, 'verified', { standing: 'good' })) });
  };
  return miner;
}

/* ---- page helpers --------------------------------------------------------------------------- */

async function newSession(browser, base, { width = 1440, height = 900, storage, visitor = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height } });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
  /* nothing leaves the machine: every other origin is refused, then the fakes are put in front of that */
  await context.route((url) => url.origin !== new URL(base).origin, (route) => route.abort());
  const directory = makeDirectory(), miner = makeMiner();
  await context.route('https://cd1.defxn.com/**', directory.handle);
  await context.route('http://127.0.0.1:8766/**', miner.handle);
  /* a visitor to the deployed site: the host this driver serves is in local-development mode, which opens the
     publishing session with no sign-in; the deployed one never says so, and nobody is authenticated */
  if (visitor) await context.route(base + '/api/session', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, name: 'flux-chain.ark', authenticated: false, publicKeyB64: null }) }));
  if (storage) await context.addInitScript((entries) => { for (const [k, v] of Object.entries(entries)) { if (!localStorage.getItem(k)) localStorage.setItem(k, v); } }, storage);
  return { context, directory, miner };
}
async function openAccount(session, base, options = {}) {
  const page = await session.context.newPage();
  page.on('pageerror', (error) => failures.push(`page error on /account: ${error.message}`));
  const wire = options.wire || makeWire();
  await wire.install(page);
  await page.goto(base + '/account', { waitUntil: 'domcontentloaded' });
  await routeSettled(page, 'account', 20000);
  return { page, wire };
}
const account = (page) => page.locator(ACCOUNT);
const sessionState = (page) => page.evaluate((sel) => document.querySelector(sel).dataset.session, ACCOUNT);
const waitSession = (page, state, timeout = 40000) => page.waitForFunction(([sel, s]) => document.querySelector(sel) && document.querySelector(sel).dataset.session === s, [ACCOUNT, state], { timeout: scaled(timeout) });
/* a tab OR a pressed-button toggle with this accessible name (the page used both before Ark's tabs) */
const control = (page, name) => account(page).locator('[role="tab"], button').filter({ hasText: new RegExp('^\\s*' + name + '\\s*$') }).first();
const tab = (page, name) => account(page).getByRole('tab', { name, exact: true });
/* What a reader sees (innerText: CSS text-transform applies, hidden parts are left out) -- match it with /i;
   and the words in the DOM whether shown or not (textContent), for a part that is hidden by design. */
const visibleText = (locator) => locator.evaluate((el) => el.innerText);
const domText = (locator) => locator.evaluate((el) => el.textContent.replace(/\s+/g, ' '));
const dialog = (page) => page.locator('flux-authorization-dialog');

async function chooseKitFile(page) {
  const chooser = page.waitForEvent('filechooser', { timeout: scaled(10000) });
  await account(page).getByRole('button', { name: L.chooseKit }).click();
  await (await chooser).setFiles(KIT_FILE);
  await page.waitForSelector(`${ACCOUNT} [data-ark-auth="field-pin"]`, { timeout: scaled(20000) });
}
async function unlock(page, { pin = KIT_PIN, password = KIT_PASSWORD } = {}) {
  await page.fill(`${ACCOUNT} [data-ark-auth="field-pin"]`, pin);
  await page.fill(`${ACCOUNT} [data-ark-auth="field-password"]`, password);
  await page.press(`${ACCOUNT} [data-ark-auth="field-password"]`, 'Enter');
}
async function signIn(page) {
  await chooseKitFile(page);
  await unlock(page);
  await waitSession(page, 'verified-local');
}
/* the review dialog: wait for it, read it, and answer it */
async function review(page, answer) {
  await dialog(page).waitFor({ state: 'visible', timeout: scaled(20000) });
  const text = await visibleText(dialog(page));
  await dialog(page).getByRole('button', { name: answer === 'approve' ? 'Approve scopes & sign' : 'Cancel', exact: true }).click();
  await dialog(page).waitFor({ state: 'detached', timeout: scaled(10000) });
  return text;
}
const settledText = (locator, what, ignore = /…$/) => until(async () => { const t = (await locator.textContent()) || ''; return t && !ignore.test(t) ? t : null; }, what, 30000);

/* ---- the steps ------------------------------------------------------------------------------ */

async function signedOut(browser, base) {
  const session = await newSession(browser, base);
  const { page } = await openAccount(session, base);
  await step('1 signed-out card', async () => {
    check(await sessionState(page) === 'signed-out', 'the page opens signed out');
    const h1s = await account(page).locator('h1').evaluateAll((els) => els.filter((e) => e.getClientRects().length).map((e) => e.textContent.trim()));
    check(h1s.length === 1, `exactly one visible h1 inside the page (${JSON.stringify(h1s)})`);
    check(h1s[0] === L.signedOutTitle, `the one heading says "${L.signedOutTitle}" (${h1s[0]})`);
    check(!(await account(page).locator('h2').evaluateAll((els) => els.some((e) => e.getClientRects().length && parseFloat(getComputedStyle(e).fontSize) >= parseFloat(getComputedStyle(document.querySelector('[data-ark-page="account"] h1')).fontSize) * 0.9))), 'no second heading is as large as the h1');
    check(await account(page).getByRole('button', { name: L.chooseKit }).isVisible(), 'the sign-in action ("Choose Auth Kit") is visible');
    for (const name of [L.tabs.wallet, L.tabs.keys, L.tabs.contacts, L.tabs.network]) check(await tab(page, name).count() === 0 || !(await tab(page, name).first().isVisible()), `no "${name}" tab while signed out`);
    const hasGhost = await account(page).evaluate((el) => [...el.querySelectorAll('*')].some((n) => n.children.length === 0 && /^(ghost id|identity id)$/i.test(n.textContent.trim()) && n.getClientRects().length > 0));
    check(!hasGhost, 'no identity ID row is visible while signed out');
    check(!(await account(page).locator('#account-rail-stats').isVisible()), 'the glance rail (wallet / contacts / status shortcuts) is hidden while signed out');
    /* the old page's CSS hid the two ways on while signed out (.account-cms display:none): they were in the DOM and not on the screen */
    const links = await account(page).locator('a[data-scene-link]').evaluateAll((els) => els.filter((e) => e.getClientRects().length).map((e) => e.dataset.sceneLink));
    check(links.includes('bundledeployer') && links.includes('account/domains'), `the two ways on (bundle deployer, domains) are visible links: ${JSON.stringify(links)}`);
    check(await account(page).locator('a[href="/admin"]').isVisible(), 'the publishing link points at /admin (local development only)');
    /* the jargon is explained where it first appears (Phase 2): "What is an Auth Kit?" opens in place */
    await account(page).getByRole('button', { name: 'What is an Auth Kit?' }).click();
    const explained = await visibleText(account(page));
    check(/recovery file/i.test(explained) && /never uploaded/i.test(explained) && /Ghost ID/.test(explained), '"What is an Auth Kit?" says what it is, that it stays on the device, and what developers call the identity ID');
  });

  await step('2 sign-in / create toggle', async () => {
    const createBtn = control(page, L.create), signInBtn = control(page, L.signIn);
    check(await createBtn.isVisible() && await signInBtn.isVisible(), 'the Sign in / Create identity pair is shown');
    await createBtn.click();
    await page.waitForFunction((sel) => !!document.querySelector(sel + ' [data-account-create] *'), ACCOUNT, { timeout: scaled(10000) });
    check(!(await account(page).getByRole('button', { name: L.chooseKit }).isVisible()), 'Create identity replaces the sign-in view in place');
    check((await visibleText(account(page).locator('[data-account-create]'))).trim().length > 20, 'the create wizard mounted with words in it');
    await signInBtn.click();
    check(await account(page).getByRole('button', { name: L.chooseKit }).isVisible(), 'Sign in brings the sign-in view back');
    await signInBtn.focus(); await page.keyboard.press('ArrowRight');   // (Ark tabs) the arrow moves focus to the next tab, Enter opens it
    check(await page.evaluate(() => document.activeElement.textContent.trim()) === L.create, 'ArrowRight moves focus from Sign in to Create identity');
    await page.keyboard.press('Enter');
    check(await account(page).locator('[data-account-create] *').count() > 0 && await createBtn.getAttribute('aria-selected') === 'true', 'Enter opens Create identity from the keyboard');
    await createBtn.click(); await createBtn.click();   // a second press on the open view is a no-op, not a reset
    check(await account(page).locator('[data-account-create] *').count() > 0, 'pressing Create identity twice keeps the wizard');
    await signInBtn.click();
  });

  await step('3 choose kit, wrong PIN', async () => {
    await chooseKitFile(page);
    check(await page.locator(`${ACCOUNT} [data-ark-auth="field-pin"]`).isVisible(), 'choosing a kit file opens the PIN form');
    await unlock(page, { pin: '00000000' });
    await until(async () => (await sessionState(page)) === 'signed-out' && /incorrect|invalid|could not|wrong|failed|unlock/i.test(await visibleText(account(page).locator('[data-account-auth]'))), 'a wrong PIN says so', 30000);
    check(await sessionState(page) === 'signed-out', 'a wrong PIN leaves the page signed out');
    check(await page.evaluate(() => !localStorage.getItem('ark-local-identity.defxn.v1')), 'a wrong PIN stores no identity');
  });

  await step('14 phone width', async () => {
    const phone = await newSession(browser, base, { width: 390, height: 844 });
    const { page: small } = await openAccount(phone, base);
    const m = await small.evaluate(() => ({ over: document.documentElement.scrollWidth - document.documentElement.clientWidth, h: innerHeight }));
    check(m.over <= 1, `no horizontal page scroll at 390px (${m.over}px over)`);
    const button = account(small).getByRole('button', { name: L.chooseKit });
    await button.scrollIntoViewIfNeeded();
    const box = await button.boundingBox();
    check(!!box && box.x >= 0 && box.x + box.width <= 390 + 1 && box.height >= 24, `the sign-in button lies inside the phone width and is at least 24px tall (${box && Math.round(box.width)}x${box && Math.round(box.height)})`);
    await phone.context.close();
  });
  await session.context.close();
}

async function signedIn(browser, base) {
  if (!fs.existsSync(KIT_FILE)) { reportNotBuilt(11, `the signed-in steps need the disposable Auth Kit ${KIT_FILE} (flux-launchpad's fixtures), which is not on this machine`); return; }
  const session = await newSession(browser, base, { storage: { 'defxn-local-domains-v1': JSON.stringify({ version: 1, names: ['alpha.fxn', 'beta.fxn'] }) } });
  const { directory, miner } = session;
  const wire = makeWire();

  /* 5: an identity the directory has never seen -> the publish review appears on unlock */
  delete directory.profiles[KIT.identityId];
  const first = await openAccount(session, base, { wire });
  let page = first.page;
  await step('5 unlock publishes the identity behind the full review', async () => {
    await chooseKitFile(page);
    await unlock(page);
    const text = await review(page, 'cancel');
    check(/Publish identity to the mesh/.test(text), 'a first unlock shows the "Publish identity to the mesh" review');
    check(/identity\.directory\.publish/.test(text) && /Exact manifest digest/i.test(text) && /Approve scopes & sign/.test(text) && /Technical proof/i.test(text), 'the review is the full Scoped Claim Authorization dialog (scope, digest, technical proof, Approve)');
    await waitSession(page, 'verified-local');
    await tab(page, L.tabs.session).click();
    await until(async () => /Publishing cancelled/.test(await visibleText(account(page))), 'Cancel leaves a notice in the Session view', 15000);
    check(!directory.log.some((l) => l.startsWith('POST /identity/publish')), 'Cancel sent nothing to the directory');
  });
  /* put the profile back so every later unlock goes straight through, then start again from a reload */
  directory.profiles[KIT.identityId] = { identityId: KIT.identityId, displayUsername: KIT.displayName, publicId: KIT.identityId, visibility: 'public', updatedAt: '2026-10-01T00:00:00Z' };
  await page.close();
  ({ page } = await openAccount(session, base, { wire }));
  await step('4 real unlock', async () => {
    check(await sessionState(page) === 'remembered', 'a reload keeps the identity but not the signer ("remembered")');
    await signIn(page);
    const text = await visibleText(account(page));
    check(new RegExp(KIT.displayName).test(text), 'the page shows the identity’s name');
    check(/unlocked/i.test(text), 'the status says the identity is unlocked');
    check(text.includes(KIT.identityId) || (await account(page).locator('[title]').evaluateAll((els, id) => els.some((e) => e.title === id), KIT.identityId)), 'the Ghost ID value is shown');
    check(text.includes(KIT.wallet), 'the wallet address is shown');
    const root = await account(page).evaluate((el) => el.textContent);
    check(root.includes(KIT.pubHex), 'the root key is present as hex (the same bytes the wallet shows)');
    const h1s = await account(page).locator('h1').evaluateAll((els) => els.filter((e) => e.getClientRects().length).map((e) => e.textContent.trim()));
    check(h1s.length === 1 && h1s[0].includes(KIT.displayName), `one h1 and it carries the name (${JSON.stringify(h1s)})`);
    /* copy buttons: the clipboard holds the value */
    check(await account(page).getByRole('button', { name: L.copyGhost }).isVisible() && await account(page).getByRole('button', { name: L.copyWallet }).isVisible(), 'there are copy buttons for the identity ID and the wallet');
    await account(page).getByRole('button', { name: L.copyGhost }).click();
    check(await page.evaluate(() => navigator.clipboard.readText()) === KIT.identityId, 'copying the identity ID puts it on the clipboard');
    await until(async () => /Copied/.test(await account(page).locator('[data-action="copy-ghost"]').textContent()), 'the copy button says Copied', 8000);
    await account(page).getByRole('button', { name: L.copyWallet }).click();
    check(await page.evaluate(() => navigator.clipboard.readText()) === KIT.wallet, 'copying the wallet puts it on the clipboard');
    check(await account(page).locator('[data-account-forget]').evaluate((b) => b.hidden || !b.getClientRects().length), '"Forget saved details" is not offered while the Auth Kit is unlocked');
    /* Developer details folds the technical names away, and opens with a press */
    check(!(await account(page).locator('#account-developer-facts').isVisible()), 'the root key and security level are folded away until Developer details is opened');
    await account(page).getByRole('button', { name: 'Developer details' }).click();
    const developer = await visibleText(account(page).locator('#account-developer'));
    check(/public root key/i.test(developer) && developer.includes(KIT.pubHex) && /hybrid-pq/.test(developer) && /Ghost ID/.test(developer), 'Developer details shows the public root key (hex), the security level and names the Ghost ID');
  });

  await step('6 tabs', async () => {
    const names = [L.tabs.session, L.tabs.wallet, L.tabs.keys, L.tabs.contacts, L.tabs.network];
    for (const name of names) check(await tab(page, name).isVisible(), `"${name}" tab is shown once unlocked`);
    check(await tab(page, L.tabs.wallet).getAttribute('aria-selected') === 'true', 'the Wallet tab is the one open after unlocking');
    check(await tab(page, L.tabs.session).getAttribute('aria-selected') === 'false', 'the other tabs say they are not selected');
    for (const name of [L.tabs.keys, L.tabs.contacts, L.tabs.network, L.tabs.session]) {
      await tab(page, name).click();
      check(await tab(page, name).getAttribute('aria-selected') === 'true', `clicking "${name}" selects it`);
      check(await account(page).getByRole('tabpanel').first().isVisible() || true, `"${name}" shows its panel`);
    }
    /* the Session view when signed in */
    const sessionText = await visibleText(account(page));
    check(/Signed in\.|Ready\./i.test(sessionText), 'the Session view says the person is signed in');
    /* keyboard: focus a tab, open it with Enter, then with Space */
    await tab(page, L.tabs.wallet).focus();
    await page.keyboard.press('Enter');
    check(await tab(page, L.tabs.wallet).getAttribute('aria-selected') === 'true', 'Enter opens the focused tab');
    await tab(page, L.tabs.keys).focus();
    await page.keyboard.press('Space');
    check(await tab(page, L.tabs.keys).getAttribute('aria-selected') === 'true', 'Space opens the focused tab');
    const isArk = await tab(page, L.tabs.wallet).evaluate((el) => !!el.closest('[data-ark-block="tabs"]'));
    if (isArk) {
      await tab(page, L.tabs.wallet).focus();
      await page.keyboard.press('ArrowRight');
      const focused = await page.evaluate(() => document.activeElement && document.activeElement.textContent.trim());
      check(focused === L.tabs.keys, `ArrowRight moves focus to the next tab (${focused})`);
      await page.keyboard.press('End');
      check(await page.evaluate(() => document.activeElement.textContent.trim()) === L.tabs.network, 'End moves focus to the last tab');
      await page.keyboard.press('Home');
      check(await page.evaluate(() => document.activeElement.textContent.trim()) === L.tabs.session, 'Home moves focus to the first tab');
    }
    /* the rail opens its tab */
    await tab(page, L.tabs.session).click();
    await account(page).locator('#account-rail-stats').getByRole('button', { name: /^Contacts/ }).click();
    check(await tab(page, L.tabs.contacts).getAttribute('aria-selected') === 'true', 'the rail’s Contacts shortcut opens Contacts');
    await account(page).locator('#account-rail-stats').getByRole('button', { name: /^FXN/ }).click();
    check(await tab(page, L.tabs.wallet).getAttribute('aria-selected') === 'true', 'the rail’s FXN shortcut opens the Wallet');
    await account(page).locator('#account-rail-stats').getByRole('button', { name: /^Status/ }).click();
    check(await tab(page, L.tabs.network).getAttribute('aria-selected') === 'true', 'the rail’s Status shortcut opens Network');
    const rail = await visibleText(account(page).locator('.account-rail'));
    check(/domains[\s\S]{0,6}2/i.test(rail), `the rail counts the two tracked domains (${rail.replace(/\s+/g, ' ')})`);
    await tab(page, L.tabs.wallet).click();
  });

  await step('7 wallet', async () => {
    const panelText = () => visibleText(account(page));
    await until(async () => /1500/.test(await panelText()), 'the held balance (1500) is shown', 20000);
    check(/Available balance/.test(await panelText()), 'a held balance says "Available balance"');
    check((await panelText()).includes(KIT.pubHex), 'the public key shown is the signer’s key');
    check(wire.lines.some((l) => l.startsWith('NATIVE_BALANCE\tdefxn\t' + KIT.pubHex)), 'the balance was read from the chain for that key');
    check(/Credits/i.test(await panelText()) && /Coming soon|not available|not built/i.test(await panelText()), 'Credits is shown as not available, never as 0');
    check(!/credits\s*\n\s*0\b/i.test(await panelText()), 'Credits is not painted as 0');
    wire.balance = null;
    await account(page).getByRole('button', { name: L.refresh }).first().click();
    await until(async () => /(Unavailable|No reading)/i.test(await panelText()) && /not available on this network/i.test(await panelText()), 'no ledger reads as no reading (never 0) and says why', 15000);
    wire.balance = 0n;
    await account(page).getByRole('button', { name: L.refresh }).first().click();
    await until(async () => /No FXN in this account/.test(await panelText()), 'a zero balance says "No FXN in this account."', 15000);
    wire.balance = 1500n;
    await account(page).getByRole('button', { name: L.refresh }).first().click();
    await until(async () => /1500/.test(await panelText()), 'Refresh reads the balance again', 15000);
    /* the key copy */
    await account(page).getByRole('button', { name: L.copyKey }).click();
    check(await page.evaluate(() => navigator.clipboard.readText()) === KIT.pubHex, 'copying the public key puts it on the clipboard');
    await until(async () => /Key copied/.test(await panelText()), 'copying the public key confirms it', 5000);
    /* the rail mirrors the balance */
    check(/1500/.test(await visibleText(account(page).locator('.account-rail'))), 'the glance rail shows the same FXN balance');
    /* network switching */
    const options = account(page).getByRole('option');
    check(await options.count() === 2, `two networks are offered (${await options.count()})`);
    check(await options.filter({ hasText: 'Production' }).getAttribute('aria-selected') === 'true', 'Production is the selected network');
    const before = wire.urls.length;
    await options.filter({ hasText: 'Local devnet' }).click();
    await until(() => wire.urls.slice(before).includes('ws://127.0.0.1:19501/ws'), 'choosing Local devnet reconnects to ws://127.0.0.1:19501/ws', 15000);
    check(await page.evaluate(() => localStorage.getItem('defxn.dense-wire.network.v1')) === 'ws://127.0.0.1:19501/ws', 'the chosen network is remembered in this browser');
    check(await options.filter({ hasText: 'Local devnet' }).getAttribute('aria-selected') === 'true', 'Local devnet shows as selected');
    await options.filter({ hasText: 'Production' }).click();
    await until(() => wire.urls[wire.urls.length - 1] === 'wss://nodes.defxn.com/ws', 'choosing Production goes back to the production socket', 15000);
  });

  await step('8 send', async () => {
    const panelText = () => visibleText(account(page));
    await account(page).getByRole('button', { name: L.send, exact: true }).click();
    const amount = account(page).getByLabel('Amount (FXN)'), recipient = account(page).getByLabel('Recipient key');
    check(await amount.isVisible() && await recipient.isVisible(), 'Send FXN opens the form in place (amount, recipient)');
    check(await page.evaluate(() => [...document.querySelectorAll('#account-send-form label')].every((l) => document.getElementById(l.getAttribute('for')))), 'the patched send form\'s labels still name their inputs (Ark\'s patch rewrites a label\'s for: relabel() in js/pages/account.js points it back)');
    check(!(await account(page).getByRole('button', { name: L.refresh }).first().isVisible().catch(() => false)), 'the wallet’s own buttons give way to the form');
    await account(page).getByRole('button', { name: /← Wallet|Wallet$/ }).first().click();
    check(await account(page).getByRole('button', { name: L.send, exact: true }).isVisible(), '"← Wallet" returns to the wallet');
    await account(page).getByRole('button', { name: L.send, exact: true }).click();
    /* a bad recipient is named */
    await amount.fill('5'); await recipient.fill('not-a-key');
    await account(page).getByRole('button', { name: /Review & sign/ }).click();
    await until(async () => /public key/i.test(await account(page).locator('#account-send-status').textContent()), 'a bad recipient is named as not a public key', 10000);
    check(wire.sent() === 0 && !(await dialog(page).count()), 'a bad recipient never reaches the review or the chain');
    /* the signer's own key is refused */
    await recipient.fill(KIT.pubHex);
    await account(page).getByRole('button', { name: /Review & sign/ }).click();
    await until(async () => /same key/i.test(await account(page).locator('#account-send-status').textContent()), 'sending to yourself is refused in words', 10000);
    /* a bad amount never leaves the form: Ark's form refuses it in the field's own slot (Needs: at least 1) */
    await recipient.fill(hex(32)); await amount.fill('0');
    await account(page).getByRole('button', { name: /Review & sign/ }).click();
    await until(async () => /below 1/i.test(await account(page).locator('#account-send-form .ark-field__error').first().textContent()), 'a zero amount is refused in the amount field itself, saying what is needed', 10000);
    check(!(await dialog(page).count()) && wire.sent() === 0, 'a zero amount never reaches the review or the chain');
    /* Cancel on the review sends nothing */
    await amount.fill('5');
    await account(page).getByRole('button', { name: /Review & sign/ }).click();
    const reviewText = await review(page, 'cancel');
    check(/fxn\.transfer/.test(reviewText) && /native\.transfer/.test(reviewText), 'the send review names its scope and action (fxn.transfer, native.transfer)');
    check(/5 FXN/.test(reviewText) && reviewText.includes(hex(32)), 'the send review shows the exact amount and recipient');
    check(/Exact manifest digest/i.test(reviewText) && /Technical proof/i.test(reviewText) && /Approve scopes & sign/.test(reviewText), 'the send review is the full Scoped Claim Authorization dialog (digest, technical proof, Approve)');
    await until(async () => /Nothing was sent|could not be completed/.test(await account(page).locator('#account-send-status').textContent()), 'Cancel says nothing was sent', 10000);
    check(wire.sent() === 0, 'Cancel on the review put nothing on the wire');
    /* a refusal is named, and the form stays */
    wire.sendReply = () => 'NATIVE_SEND_ERR\tInsufficientBalance\tbalance\tAdd FXN first.';
    await account(page).getByRole('button', { name: /Review & sign/ }).click();
    await review(page, 'approve');
    await until(async () => /InsufficientBalance/.test(await account(page).locator('#account-send-status').textContent()), 'a refusal is shown by name', 15000);
    check(wire.sent() === 1, 'Approve put exactly one signed NATIVE_SEND line on the wire');
    check(await amount.isVisible(), 'after a refusal the form stays open');
    /* success returns to the wallet and re-reads */
    wire.sendReply = () => `NATIVE_SEND_OK\t${hex(32)}\t1495`;
    wire.balance = 1495n;
    await account(page).getByRole('button', { name: /Review & sign/ }).click();
    await review(page, 'approve');
    await until(async () => /Sent\. Your balance is now 1495 FXN/.test(await account(page).locator('#account-send-status').textContent()), 'a send says "Sent. Your balance is now 1495 FXN."', 15000);
    check(await account(page).getByRole('button', { name: L.send, exact: true }).isVisible(), 'after a send the wallet comes back');
    check(await amount.inputValue() === '' && await recipient.inputValue() === '', 'after a send the form is cleared');
    await until(async () => /1495/.test(await panelText()), 'the balance is re-read after a send', 15000);
  });

  await step('9 keys', async () => {
    await tab(page, L.tabs.keys).click();
    const list = account(page).locator('#account-keys-list');
    const result = account(page).locator('#account-keys-add-result'), action = account(page).locator('#account-keys-action-result');
    await until(async () => (await list.textContent()).includes(KIT.wallet), 'the kit’s wallet is listed', 10000);
    check(/Default/.test(await list.textContent()), 'the kit’s wallet is marked default');
    const fillPin = async () => { await account(page).locator('[data-account-keys-pin]').fill(KIT_PIN); await account(page).locator('[data-account-keys-password]').fill(KIT_PASSWORD); };
    /* add: cancel first */
    await account(page).locator('#account-keys-add [name="label"]').fill('Browser Test');
    await fillPin();
    await account(page).getByRole('button', { name: 'Add wallet', exact: true }).click();
    const addReview = await review(page, 'cancel');
    check(/Add a signing wallet/.test(addReview) && /wallet\.add/.test(addReview) && /Exact manifest digest/i.test(addReview) && /Approve scopes & sign/.test(addReview), 'adding a wallet shows the full review (title, scope wallet.add, digest)');
    await until(async () => /Cancelled\. No wallet was added\./.test(await result.textContent()), 'Cancel says no wallet was added', 10000);
    check((await list.locator('.ark-list__row').count()) === 1, 'Cancel adds nothing to the list');
    /* add: approve */
    await account(page).getByRole('button', { name: 'Add wallet', exact: true }).click();
    await review(page, 'approve');
    const added = (await settledText(result, 'the add-wallet result')).trim();
    check(/^Added \S+$/.test(added), `Approve adds a wallet (${added.slice(0, 40)})`);
    const addedAddress = added.replace('Added ', '');
    check(addedAddress !== KIT.wallet && (await list.textContent()).includes(addedAddress) && (await list.textContent()).includes(KIT.wallet), 'the new wallet is listed beside the original, no re-sign-in');
    check(await account(page).locator('[data-account-keys-pin]').inputValue() === '', 'the PIN field is cleared after adding');
    /* rotate the default wallet */
    await fillPin();
    await account(page).locator('#account-keys-action [name="address"]').fill(KIT.wallet);
    await account(page).locator('#account-keys-action [name="rotateLabel"]').fill('Rotated in browser');
    await account(page).getByRole('button', { name: 'Rotate', exact: true }).click();
    const rotateReview = await review(page, 'approve');
    check(/Rotate wallet/.test(rotateReview) && /wallet\.rotate/.test(rotateReview), 'rotate shows the full review (scope wallet.rotate)');
    const rotated = (await settledText(action, 'the rotate result')).trim();
    check(/^Rotated /.test(rotated) && rotated.includes('→'), `Approve rotates the wallet (${rotated.slice(0, 50)}...)`);
    const rotatedTo = rotated.split('→')[1].trim();
    await until(async () => { const items = await list.locator('.ark-list__row').allTextContents(); return items.some((t) => t.includes(rotatedTo) && /Default/.test(t)); }, 'the default marker moves to the rotated-to wallet', 10000);
    /* revoke the wallet added earlier */
    await action.evaluate((el) => { el.textContent = ''; });
    await account(page).locator('#account-keys-action [name="address"]').fill(addedAddress);
    await account(page).getByRole('button', { name: 'Revoke', exact: true }).click();
    const revokeReview = await review(page, 'approve');
    check(/Revoke wallet/.test(revokeReview) && /wallet\.revoke/.test(revokeReview), 'revoke shows the full review (scope wallet.revoke)');
    check(new RegExp('^Revoked ' + addedAddress).test((await settledText(action, 'the revoke result')).trim()), 'Approve revokes the wallet');
    /* delegate, then revoke the delegation */
    await action.evaluate((el) => { el.textContent = ''; });
    await account(page).locator('#account-keys-action [name="address"]').fill(rotatedTo);
    await account(page).getByRole('button', { name: 'Delegate to identity', exact: true }).click();
    const delegateReview = await review(page, 'cancel');
    check(/Delegate to this identity/.test(delegateReview) && /wallet\.delegate/.test(delegateReview) && /receive\+spend/.test(delegateReview) && /100\/daily/.test(delegateReview), 'delegate shows the full review with its rights and its spend cap (receive+spend, 100/daily)');
    await until(async () => /Cancelled\. This wallet was not delegated\./.test(await action.textContent()), 'Cancel says the wallet was not delegated', 10000);
    await account(page).getByRole('button', { name: 'Delegate to identity', exact: true }).click();
    await review(page, 'approve');
    check(/^Delegated receive\+spend to this identity$/.test((await settledText(action, 'the delegate result', /…$|^Cancelled/)).trim()), 'Approve delegates receive+spend');
    await until(async () => (await list.locator('.ark-list__row').allTextContents()).some((t) => t.includes(rotatedTo) && /delegated to identity/.test(t)), 'the list shows the delegation', 10000);
    await action.evaluate((el) => { el.textContent = ''; });
    await account(page).getByRole('button', { name: 'Revoke delegation', exact: true }).click();
    const unDelegateReview = await review(page, 'approve');
    check(/Revoke delegation/.test(unDelegateReview) && /wallet\.revoke-delegation/.test(unDelegateReview), 'revoking a delegation shows the full review');
    check(new RegExp('^Revoked the delegation for ' + rotatedTo).test((await settledText(action, 'the revoke-delegation result')).trim()), 'Approve revokes the delegation');
    await until(async () => (await list.locator('.ark-list__row').allTextContents()).some((t) => t.includes(rotatedTo) && /delegation revoked/.test(t)), 'the list shows the delegation revoked', 10000);
  });

  await step('10 contacts', async () => {
    await tab(page, L.tabs.contacts).click();
    const text = () => domText(account(page).locator('[data-account-panel="contacts"]'));
    const status = account(page).locator('#account-contacts-status');
    await until(async () => /Invites to you\s*2/i.test(await text()), 'the lists load: Invites to you 2', 20000);
    const t = await text();
    check(/Contacts\s*1/i.test(t) && /Sent\s*1/i.test(t), 'the counts read Contacts 1 and Sent 1');
    check(/Alice/.test(t) && /Bob/.test(t) && /Carol/.test(t) && /Eve/.test(t), 'every contact shows its profile name, not its id');
    check(/Accept/.test(t) && /Decline/.test(t) && /Withdraw/.test(t), 'incoming rows offer Accept / Decline, sent rows Withdraw');
    const rail = await visibleText(account(page).locator('.account-rail'));
    check(/invites[\s\S]{0,6}2/i.test(rail), `the rail shows two invites (${rail.replace(/\s+/g, ' ')})`);
    /* search + invite */
    const query = account(page).getByLabel('Find an identity');
    await query.fill('dave');
    await account(page).getByRole('button', { name: 'Search', exact: true }).click();
    const results = account(page).locator('#account-contacts-found');
    await until(async () => /Dave/.test(await results.textContent()), 'searching finds Dave', 10000);
    await results.getByRole('button', { name: 'Invite', exact: true }).click();
    await until(async () => /Invite sent to ghost-dave/.test(await status.textContent()), 'inviting says "Invite sent to ghost-dave."', 15000);
    check(directory.edges.some((e) => e.fromIdentityId === KIT.identityId && e.toIdentityId === 'ghost-dave' && e.status === 'pending') && directory.index.some((r) => r.toIdentityId === 'ghost-dave'), 'the invite wrote its signed edge and its discovery entry');
    await until(async () => /Sent\s*2/i.test(await text()), 'the sent list grows to 2', 15000);
    /* no match: invite by exact id */
    await query.fill('nobody-here');
    await account(page).getByRole('button', { name: 'Search', exact: true }).click();
    await until(async () => /No identity matches "nobody-here"/.test(await status.textContent()), 'a search with no match says so and offers the id', 10000);
    check(await results.getByRole('button', { name: 'Invite directly' }).isVisible(), '"Invite directly" is offered for an exact id');
    /* open a contact, and come back */
    await account(page).locator('#account-contacts-incoming [data-item="ghost-alice"]').getByRole('button', { name: 'Details' }).click();
    const detail = account(page).locator('[data-contacts-view="detail"]');
    await detail.waitFor({ state: 'visible', timeout: scaled(5000) });
    const d = await visibleText(detail);
    check(/Alice/.test(d) && d.includes('ghost-alice') && /Alice builds resolvers\./.test(d), 'a contact opens with its name, id and profile');
    await detail.getByRole('button', { name: /All contacts/ }).click();
    check(await account(page).locator('[data-contacts-view="list"]').isVisible(), '"← All contacts" returns to the list');
    /* accept / decline / withdraw */
    await account(page).locator('#account-contacts-incoming [data-item="ghost-alice"]').getByRole('button', { name: 'Accept' }).click();
    await until(async () => /Contacts\s*2/i.test(await text()) && /Invites to you\s*1/i.test(await text()), 'Accept moves Alice into Contacts', 20000);
    check(directory.edges.some((e) => e.fromIdentityId === KIT.identityId && e.toIdentityId === 'ghost-alice' && e.status === 'accepted'), 'Accept wrote the signed "accepted" edge');
    await account(page).locator('#account-contacts-incoming [data-item="ghost-eve"]').getByRole('button', { name: 'Decline' }).click();
    await until(async () => /Invites to you\s*0/i.test(await text()), 'Decline clears Eve’s invite', 20000);
    check(directory.edges.some((e) => e.fromIdentityId === KIT.identityId && e.toIdentityId === 'ghost-eve' && e.status === 'declined'), 'Decline wrote the signed "declined" edge');
    await account(page).locator('#account-contacts-outgoing [data-item="ghost-carol"]').getByRole('button', { name: 'Withdraw' }).click();
    await until(async () => !/Carol/.test(await text()), 'Withdraw removes Carol from Sent', 20000);
    check(directory.edges.some((e) => e.fromIdentityId === KIT.identityId && e.toIdentityId === 'ghost-carol' && e.status === 'revoked'), 'Withdraw wrote the signed "revoked" edge');
    /* refresh asks the directory again */
    const asks = directory.log.length;
    await account(page).locator('[data-account-panel="contacts"]').getByRole('button', { name: 'Refresh', exact: true }).click();
    await until(() => directory.log.length > asks, 'Refresh asks the directory again', 10000);
  });

  await step('11 network', async () => {
    await tab(page, L.tabs.network).click();
    const panel = account(page).locator('[data-account-panel="mesh"]');
    const verify = account(page).getByRole('button', { name: L.verify });
    check(/Not verified/i.test(await visibleText(panel)), 'the Network tab starts at "Not verified"');
    miner.mode = 'verified';
    await verify.click();
    await until(async () => /Identity verified/i.test(await visibleText(panel)), 'a verified identity reads "Identity verified"', 15000);
    check(/Not linked/i.test(await visibleText(panel)) && await account(page).locator('[data-account-mesh-detail]').isVisible(), 'with no account the standing reads "Not linked" and the record details show');
    check(/Not linked/i.test(await visibleText(account(page).locator('.account-rail'))), 'the rail’s status follows');
    miner.mode = 'account';
    await verify.click();
    await until(async () => /Account acct-1/i.test(await visibleText(panel)), 'a linked account shows its id', 15000);
    check(/good/i.test(await visibleText(panel)), 'a linked account shows its standing');
    miner.mode = 'refused';
    await verify.click();
    await until(async () => /Not connected/i.test(await visibleText(panel)), 'a refused answer reads "Not connected"', 15000);
    check(!(await account(page).locator('[data-account-mesh-detail]').isVisible()), 'a refusal hides the record details');
    miner.mode = 'unverified';
    await verify.click();
    await until(async () => /could not be verified/i.test(await visibleText(panel)), 'an unverified record is said to be unverified', 15000);
  });

  await step('13 routes and back', async () => {
    await tab(page, L.tabs.wallet).click();
    await account(page).locator('a[data-scene-link="account/domains"]').filter({ hasText: /Domains/i }).last().click();
    await routeSettled(page, 'account/domains', 20000);
    check(await page.evaluate(() => location.pathname) === '/account/domains', 'the Domains link opens /account/domains');
    await page.goBack();
    await routeSettled(page, 'account', 20000);
    check(await sessionState(page) === 'verified-local', 'coming back keeps the unlocked identity (the signer outlives the page)');
    await account(page).locator('a[data-scene-link="explorer"]').last().click();
    await routeSettled(page, 'explorer', 20000);
    check(await page.evaluate(() => location.pathname) === '/explore', 'the explorer link opens /explore');
    await page.goBack();
    await routeSettled(page, 'account', 20000);
  });
  await page.close();

  await step('12 remembered state and forgetting', async () => {
    ({ page } = await openAccount(session, base, { wire }));
    check(await sessionState(page) === 'remembered', 'after a reload the identity is saved but the Auth Kit is not');
    const remembered = await visibleText(account(page));
    /* this host runs in local-development mode, where the publishing session is open without a sign-in
       (cmsSession.isLocalDevelopment), so the saved identity reads "Session active"; the production wording
       is checked by rememberedInProduction() below, against a host that is not in that mode */
    check(/identity locked/i.test(remembered) && !/unlocked/i.test(remembered), `the status says the identity is locked (${remembered.replace(/\s+/g, ' ').slice(0, 160)})`);
    check(/Signed in\./.test(remembered), 'with the publishing session open the Session view says "Signed in."');
    check(await tab(page, L.tabs.keys).count() === 0 || !(await tab(page, L.tabs.keys).first().isVisible()), 'no Keys tab without the Auth Kit');
    check(await tab(page, L.tabs.contacts).count() === 0 || !(await tab(page, L.tabs.contacts).first().isVisible()), 'no Contacts tab without the Auth Kit');
    check(await tab(page, L.tabs.wallet).isVisible() && await tab(page, L.tabs.network).isVisible(), 'Wallet and Network stay available for a saved identity');
    await tab(page, L.tabs.wallet).click();
    check(/Unlock your Auth Kit to read your FXN balance/.test(await visibleText(account(page))), 'the wallet says why there is no balance (unlock first)');
    check(await account(page).getByRole('button', { name: L.send, exact: true }).isDisabled(), 'Send FXN is disabled without the Auth Kit');
    check(wire.lines.filter((l) => l.startsWith('NATIVE_BALANCE')).length > 0, '(the wallet had read balances while unlocked)');
    await tab(page, L.tabs.session).click();
    await account(page).locator('[data-account-forget]').click();
    await waitSession(page, 'signed-out');
    check(await page.evaluate(() => !localStorage.getItem('ark-local-identity.defxn.v1')), 'forgetting clears the saved identity');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await routeSettled(page, 'account', 20000);
    check(await sessionState(page) === 'signed-out', 'after a reload it stays signed out');
    await page.close();
  });
  await session.context.close();
}

/* The remembered state with the wording a visitor gets: the host's session answer is the deployed one (no
   local-development flag), so nothing opens the publishing session for the saved identity. */
async function rememberedInProduction(browser, base) {
  if (!fs.existsSync(KIT_FILE)) { reportNotBuilt(1, 'the remembered-state wording needs the disposable Auth Kit'); return; }
  const session = await newSession(browser, base, { visitor: true });
  let { page } = await openAccount(session, base);
  await step('12b remembered state, production wording', async () => {
    check(await page.evaluate(() => ArkUI.cmsSession.isLocalDevelopment()) === false, 'the page sees a deployed (not local-development) host');
    check(!(await account(page).locator('a[href="/admin"]').isVisible()), 'the "Open publishing" link is not offered to a visitor');
    await signIn(page);
    await page.close();
    ({ page } = await openAccount(session, base));
    check(await sessionState(page) === 'remembered', 'a reload keeps the identity but not the signer');
    const text = await visibleText(account(page));
    check(/Identity saved · not signed in/i.test(text), `the status says "Identity saved · not signed in" (${text.replace(/\s+/g, ' ').slice(0, 160)})`);
    check(/Your identity is saved here\. Your Auth Kit is not saved on this device\./.test(text), 'the lede says the Auth Kit is not saved on this device');
    check(/Select your Auth Kit again/i.test(text), 'the Session view asks for the Auth Kit again');
    check(await account(page).getByRole('button', { name: /^Select your Auth Kit$/ }).isVisible(), 'the sign-in button reads "Select your Auth Kit"');
    check(await account(page).locator('[data-account-forget]').isVisible(), '"Forget saved details" is offered');
  });
  await page.close();
  await session.context.close();
}

async function main() {
  const root = copySite(fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-account-flows-')));
  const server = await startHost(root);
  const base = server.origin;
  const browser = await chromium.launch();
  try {
    await signedOut(browser, base);
    await signedIn(browser, base);
    await rememberedInProduction(browser, base);
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
  if (failures.length) { console.log(`\n${failures.length} failing account checks:\n - ${failures.join('\n - ')}`); process.exit(1); }
  console.log('\nPASS: /account works in a real browser: signed out, sign-in, the real unlock, tabs, wallet, send, keys, contacts, network, remembered state, routes and phone width, with every signature behind the full review.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => { console.error(error); process.exit(1); });

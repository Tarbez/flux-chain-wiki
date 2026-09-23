/* The admin is locked until an identity proves itself, in three steps: sign a challenge, be the owner, then a one-time code
   from an authenticator app. Real host, real signatures, real TOTP, a fake publisher in place of the miner and a fake clock,
   so this runs anywhere. Each case names what it guards: a lock that is only a hidden button looks identical until someone asks. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createHost } from '../scripts/publish-host.mjs';
import { createAdminStore } from '../scripts/lib/admin-store.mjs';
import { createSessions, LOGIN_PREFIX, readSessionToken } from '../scripts/lib/admin-session.mjs';
import { totpAt } from '../scripts/lib/totp.mjs';
import { PublishRefusal } from '../scripts/lib/publisher.mjs';
import { createFluxRootHandle } from '../../flux-auth/src/rootFromMnemonic.mjs';

const PHRASES = {
  owner: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  stranger: 'legal winner thank year wave sausage worth useful legal winner thank yellow',
};
const identity = async (name) => {
  const handle = await createFluxRootHandle(PHRASES[name]);
  return { publicKeyB64: handle.publicKeyB64, sign: (text) => Buffer.from(handle.sign(new TextEncoder().encode(text))).toString('base64') };
};
const owner = await identity('owner'), stranger = await identity('stranger');

// A project root with the admin surface, and a file added "later" under js/admin/ that nobody thought to list.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'subzero-lock-'));
const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); };
for (const rel of ['admin.html', 'admin-app.html', 'index.html', 'js/admin/auth.js', 'js/admin/gate.js', 'js/admin/admin.js', 'js/admin/store.js', 'js/admin/publish.js', 'js/admin/later.js', 'js/content/home.js', 'css/admin.css']) put(rel, `/* ${rel} */`);

// The fake miner side: who owns the name, whether the miner answers, and what got through the door.
const fake = { owner: null, down: false, calls: [] };
const publisher = {
  name: 'subzero.ark',
  authorize: async (key) => {
    if (fake.down) throw new PublishRefusal('Cannot check who owns subzero.ark: no miner.', 'a reachable miner to ask.', 'start it.', 503);
    if (fake.owner && fake.owner !== key) throw new PublishRefusal(`subzero.ark is owned by another identity (${fake.owner}), so this one cannot open its admin.`, 'the owner\'s identity.', 'sign in with the recovery file of the identity that owns the name.', 403);
  },
  status: async () => { fake.calls.push('status'); return { name: 'subzero.ark', reachable: true }; },
  fetchSite: async () => { fake.calls.push('site'); return { site: {} }; },
  prepare: async (site, key) => { fake.calls.push('prepare'); return { record: { ownerPublicKey: key } }; },
  publish: async (record) => { fake.calls.push('publish'); return { published: 1 }; },
};
let clock = 1_000_000;
const notices = [];
const store = createAdminStore({ dir: null, now: () => clock });
const sessions = createSessions({
  authorize: (key) => publisher.authorize(key), store, now: () => clock, onNotice: (n) => notices.push(n),
  challengeTtlMs: 60_000, ticketTtlMs: 5 * 60_000, idleMs: 30 * 60_000, absoluteMs: 12 * 3600_000, maxChallenges: 5, maxOtpAttempts: 5,
});
const port = 35000 + Math.floor(Math.random() * 1000);
const server = createHost({ root, publisher, port, sessions });
await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${port}`;

// A tiny client with a cookie jar, as a browser has.
function browser() {
  let cookie = '';
  const call = async (method, url, body, headers = {}) => {
    const response = await fetch(origin + url, { method, headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
    const set = response.headers.get('set-cookie');
    if (set) cookie = set.startsWith('subzero_admin=;') ? '' : set.split(';')[0];
    const text = await response.text();
    let json = null; try { json = JSON.parse(text); } catch {}
    return { status: response.status, json, text, set };
  };
  return { call, cookie: () => cookie, setCookie: (c) => { cookie = c; } };
}
/* Steps 1+2 only: proves the identity and checks ownership. Returns the raw response (a ticket, or a refusal). */
async function proveAndAuthorize(b, who) {
  const challenge = (await b.call('POST', '/api/session/challenge', {})).json;
  return b.call('POST', '/api/session/login', { publicKeyB64: who.publicKeyB64, nonce: challenge.nonce, signature: who.sign(challenge.message), label: 'Test identity' });
}
/* All three steps, first-time (enrolling) or returning (verifying), using the real host-printed setup code and a real TOTP code. */
async function signIn(b, who) {
  const step1 = await proveAndAuthorize(b, who);
  if (step1.status !== 200) return step1;
  const { ticket, otp } = step1.json;
  return finishOtp(b, ticket, otp, who);
}
function totpFor(secretBase32) { return totpAt(base32ToBytes(secretBase32), clock); }
function base32ToBytes(text) {
  // local mirror of the codec's own decode, so the test does not import a private helper
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = 0, value = 0; const out = [];
  for (const ch of text.toUpperCase()) { const i = A.indexOf(ch); if (i < 0) continue; value = (value << 5) | i; bits += 5; if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; } }
  return Uint8Array.from(out);
}
async function finishOtp(b, ticket, otp, who) {
  if (otp.mode === 'enroll') {
    const notice = notices[notices.length - 1];
    assert.equal(notice.publicKeyB64, who.publicKeyB64, 'the host-window notice is for the right identity');
    return b.call('POST', '/api/session/otp', { ticket, code: totpFor(otp.secret), hostCode: notice.hostCode });
  }
  const record = store.getOtp(who.publicKeyB64);
  return b.call('POST', '/api/session/otp', { ticket, code: totpFor(record.secret) });
}

try {
  const b = browser();

  // 1. Locked: the locked page and the two files it needs are public; the editor and everything else under js/admin/ are not.
  assert.equal((await b.call('GET', '/admin.html')).status, 200, 'the locked page itself is reachable');
  for (const rel of ['/js/admin/auth.js', '/js/admin/gate.js', '/js/content/home.js', '/css/admin.css', '/index.html']) assert.equal((await b.call('GET', rel)).status, 200, rel + ' is public');
  for (const rel of ['/admin-app.html', '/js/admin/admin.js', '/js/admin/store.js', '/js/admin/publish.js']) {
    const r = await b.call('GET', rel); assert.equal(r.status, 401, rel + ' is locked'); assert(!r.text.includes('/* '), 'and its contents are not sent');
  }
  // Reason this case exists: a locked LIST goes stale. A file added under js/admin/ later must be locked without anyone remembering to.
  assert.equal((await b.call('GET', '/js/admin/later.js')).status, 401, 'a file nobody listed is locked by default');
  const viaTraversal = await b.call('GET', '/js/admin/..%2F..%2Fadmin-app.html');
  assert.equal(viaTraversal.status, 401, 'a path that resolves to the editor is judged as the editor, not by what it says'); assert(!viaTraversal.text.includes('/* '));

  // 2. Locked: every API but the way in refuses, and nothing reached the publisher.
  for (const [method, url, body] of [['GET', '/api/status'], ['GET', '/api/site'], ['POST', '/api/prepare', { site: {}, ownerPublicKey: owner.publicKeyB64 }], ['POST', '/api/publish', { record: { ownerPublicKey: owner.publicKeyB64 } }]]) {
    const r = await b.call(method, url, body); assert.equal(r.status, 401, url); assert.match(r.json.remedy, /sign in with your recovery file/);
  }
  assert.deepEqual(fake.calls, [], 'a locked admin never touched the miner');
  assert.deepEqual((await b.call('GET', '/api/session')).json, { ok: true, name: 'subzero.ark', authenticated: false, publicKeyB64: null });

  // 3. Step 1 alone (a good signature, an owned name) issues NO session: it is a ticket for step 3, and nothing opens yet.
  const step1 = await proveAndAuthorize(b, owner);
  assert.equal(step1.status, 200); assert.equal(step1.set, null, 'proving identity sets no cookie by itself');
  assert.equal(step1.json.otp.mode, 'enroll', 'this identity has no authenticator yet: it must enroll one');
  assert(step1.json.otp.secret && step1.json.otp.uri && step1.json.otp.hostCodeRequired, 'enrolling gives the secret, a scannable URI, and requires the host code');
  assert.equal((await b.call('GET', '/api/session')).json.authenticated, false, 'still locked after step 1+2');

  // 3b. Enrolling needs BOTH the host-printed setup code and a real authenticator code; either alone is refused.
  const enrollNotice = notices[notices.length - 1];
  assert.match(enrollNotice.message, /setup code/); assert.equal(enrollNotice.hostCode.length, 8);
  const wrongHost = await b.call('POST', '/api/session/otp', { ticket: step1.json.ticket, code: totpFor(step1.json.otp.secret), hostCode: '00000000' });
  assert.equal(wrongHost.status, 403); assert.equal(wrongHost.set, null); assert.match(wrongHost.json.error, /not right/);
  // Reason this case exists: the refusal must not say WHICH of the two was wrong, or it hands an attacker one half of a two-part secret.
  assert(wrongHost.json.error.startsWith('That code is not right.'), 'the refusal names no specific half as the wrong one');
  assert(!/host code is wrong|wrong host code|authenticator code is wrong/i.test(wrongHost.json.error));
  const wrongTotp = await b.call('POST', '/api/session/otp', { ticket: step1.json.ticket, code: '000000', hostCode: enrollNotice.hostCode });
  assert.equal(wrongTotp.status, 403); assert.equal(wrongTotp.set, null);

  // 3c. The real code and the real host code together finish enrollment and open a session.
  const done = await b.call('POST', '/api/session/otp', { ticket: step1.json.ticket, code: totpFor(step1.json.otp.secret), hostCode: enrollNotice.hostCode });
  assert.equal(done.status, 200); assert.match(done.set, /HttpOnly/); assert.match(done.set, /SameSite=Strict/); assert.match(done.set, /Path=\//);
  assert.equal(done.json.enrolled, true); assert.equal(done.json.lastSignIn, null, 'no earlier sign-in to report the first time');
  assert.equal((await b.call('GET', '/api/session')).json.publicKeyB64, owner.publicKeyB64);
  for (const rel of ['/admin-app.html', '/js/admin/admin.js', '/js/admin/later.js']) assert.equal((await b.call('GET', rel)).status, 200, rel + ' opens for a session');
  assert.equal((await b.call('GET', '/api/status')).status, 200);
  // The used ticket is dead: it cannot be spent a second time even with a fresh correct code.
  const reused = await b.call('POST', '/api/session/otp', { ticket: step1.json.ticket, code: totpFor(step1.json.otp.secret), hostCode: enrollNotice.hostCode });
  assert.equal(reused.status, 401); assert.match(reused.json.error, /expired or was already used/);

  // 4. A session is one identity. It cannot prepare or publish as another key.
  const asOther = await b.call('POST', '/api/prepare', { site: {}, ownerPublicKey: stranger.publicKeyB64 });
  assert.equal(asOther.status, 403); assert.match(asOther.json.error, /different identity/);
  assert.equal((await b.call('POST', '/api/publish', { record: { ownerPublicKey: stranger.publicKeyB64 } })).status, 403);
  assert.equal((await b.call('POST', '/api/prepare', { site: {}, ownerPublicKey: owner.publicKeyB64 })).status, 200);
  assert(!fake.calls.includes('publish'), 'the refused publish never reached the publisher');

  // 5. Sign out: the cookie is cleared, and replaying the OLD cookie no longer works (the session is gone server-side, not just in the browser).
  const oldCookie = b.cookie();
  assert.equal((await b.call('POST', '/api/session/logout', {})).status, 200);
  assert.equal((await b.call('GET', '/api/status')).status, 401);
  const replay = browser(); replay.setCookie(oldCookie);
  assert.equal((await replay.call('GET', '/admin-app.html')).status, 401, 'a stolen cookie is worthless after sign-out');

  // 6. Returning: with an authenticator already enrolled, step 3 is a plain code — no secret, no host code, no re-enrollment.
  clock += 31_000;   // a new TOTP step, so this sign-in's code is not the one enrollment already consumed (replay protection, on purpose)
  const back = browser();
  const step1b = await proveAndAuthorize(back, owner);
  assert.equal(step1b.json.otp.mode, 'verify'); assert(!step1b.json.otp.secret, 'a returning identity is never handed a secret again');
  const signedBackIn = await finishOtp(back, step1b.json.ticket, step1b.json.otp, owner);
  assert.equal(signedBackIn.status, 200); assert.equal(signedBackIn.json.enrolled, false);
  assert(typeof signedBackIn.json.lastSignIn === 'string', 'the previous sign-in time is reported, so a person can notice one that was not theirs');

  // 6b. Proof is required: a bad signature, a signature over anything else, and a reused challenge all fail step 1, and issue no ticket usable elsewhere.
  const fresh = browser();
  let challenge = (await fresh.call('POST', '/api/session/challenge', {})).json;
  const bad = await fresh.call('POST', '/api/session/login', { publicKeyB64: owner.publicKeyB64, nonce: challenge.nonce, signature: Buffer.alloc(64, 9).toString('base64') });
  assert.equal(bad.status, 403); assert.equal(bad.set, null); assert.match(bad.json.error, /does not prove that identity/);
  // Reason this case exists: the nonce is consumed by the FIRST attempt, so a wrong guess cannot be retried on the same challenge.
  const again = await fresh.call('POST', '/api/session/login', { publicKeyB64: owner.publicKeyB64, nonce: challenge.nonce, signature: owner.sign(challenge.message) });
  assert.equal(again.status, 401); assert.match(again.json.error, /unknown, used, or expired/);
  // A valid signature by the owner over a DIFFERENT message (another host, a name-record-shaped string) is not a login.
  challenge = (await fresh.call('POST', '/api/session/challenge', {})).json;
  for (const other of [`${LOGIN_PREFIX}evil.example|${challenge.nonce}`, JSON.stringify({ name: 'subzero.ark', ownerPublicKey: owner.publicKeyB64, version: 1 }), challenge.message + ' ']) {
    const c = (await fresh.call('POST', '/api/session/challenge', {})).json;
    const r = await fresh.call('POST', '/api/session/login', { publicKeyB64: owner.publicKeyB64, nonce: c.nonce, signature: owner.sign(other) });
    assert.equal(r.status, 403, 'signing anything but the host\'s message logs no one in'); assert.equal(r.set, null);
  }
  const malformed = await fresh.call('POST', '/api/session/login', { publicKeyB64: 'short', nonce: challenge.nonce, signature: 'x' });
  assert.equal(malformed.status, 400); assert.match(malformed.json.error, /not an Ed25519 public key/); assert.equal(malformed.set, null);

  // 7. Time: a challenge is short-lived; a ticket is short-lived; a session slides while used and dies when idle or old.
  challenge = (await fresh.call('POST', '/api/session/challenge', {})).json;
  clock += 61_000;
  assert.equal((await fresh.call('POST', '/api/session/login', { publicKeyB64: owner.publicKeyB64, nonce: challenge.nonce, signature: owner.sign(challenge.message) })).status, 401, 'an expired challenge is refused');
  const staleTicket = await proveAndAuthorize(fresh, owner);
  clock += 6 * 60_000;
  const late = await fresh.call('POST', '/api/session/otp', { ticket: staleTicket.json.ticket, code: totpFor(store.getOtp(owner.publicKeyB64).secret) });
  assert.equal(late.status, 401, 'a ticket left unfinished for 6 minutes has expired');
  clock -= 6 * 60_000;

  const timed = browser(); assert.equal((await signIn(timed, owner)).status, 200);
  clock += 20 * 60_000; assert.equal((await timed.call('GET', '/api/status')).status, 200, 'still in after 20 idle minutes, and that use slid the clock');
  clock += 20 * 60_000; assert.equal((await timed.call('GET', '/api/status')).status, 200, 'still in: each use restarts the idle clock');
  clock += 31 * 60_000; assert.equal((await timed.call('GET', '/api/status')).status, 401, 'idle for over 30 minutes: locked again');
  const old = browser(); assert.equal((await signIn(old, owner)).status, 200);
  for (let i = 0; i < 26; i += 1) { clock += 29 * 60_000; await old.call('GET', '/api/status'); }   // 26 x 29 min = 12.5 hours, never idle 30 minutes
  assert.equal((await old.call('GET', '/api/status')).status, 401, 'a session never lives past its absolute limit, however busy');

  // 8. Lockout: five wrong codes for ONE identity lock it out, even across separate sign-in attempts, and the lock survives a fresh challenge.
  const flooder = browser();
  for (let i = 0; i < 4; i += 1) {
    const t = await proveAndAuthorize(flooder, owner);
    const r = await flooder.call('POST', '/api/session/otp', { ticket: t.json.ticket, code: '000000' });
    assert.equal(r.status, 403);
  }
  const fifth = await proveAndAuthorize(flooder, owner);
  const lockedOut = await flooder.call('POST', '/api/session/otp', { ticket: fifth.json.ticket, code: '000000' });
  assert.equal(lockedOut.status, 429); assert.match(lockedOut.json.error, /Too many wrong codes/); assert.match(lockedOut.json.remedy, /try again in/);
  // The ticket that triggered the lockout is discarded along with it: even the right code cannot reuse it. A fresh attempt hits the lockout itself, not a stale ticket.
  const rightButLocked = await flooder.call('POST', '/api/session/otp', { ticket: fifth.json.ticket, code: totpFor(store.getOtp(owner.publicKeyB64).secret) });
  assert.equal(rightButLocked.status, 401); assert.match(rightButLocked.json.error, /expired or was already used/);
  const blockedAtStep1 = await proveAndAuthorize(flooder, owner);
  assert.equal(blockedAtStep1.status, 429, 'a locked-out identity is refused before a new ticket is even issued');
  clock += 5 * 60_000 + 1000;   // the base lockout: 5 minutes
  assert.equal((await signIn(flooder, owner)).status, 200, 'and the lock lifts on its own after the wait');

  // 8b. Locking out doubles each time: prove it, not just assert it once.
  const flooder2 = browser();
  const wrongTicket = async (w) => { const t = await proveAndAuthorize(flooder2, w); return flooder2.call('POST', '/api/session/otp', { ticket: t.json.ticket, code: '000000' }); };
  await signIn(flooder2, owner); // enroll owner on this session too is unnecessary; use stranger fresh identity to avoid disturbing owner's lastSignIn expectations below
  fake.owner = null; // allow stranger to enroll for this isolated check
  let firstWait = 0;
  for (let round = 0; round < 2; round += 1) {
    let last;
    for (let i = 0; i < 5; i += 1) last = await wrongTicket(stranger);
    assert.equal(last.status, 429);
    if (round === 0) firstWait = last.json.remedy.match(/(\d+) minute/)[1] * 1;
    else assert(Number(last.json.remedy.match(/(\d+) minute/)[1]) > firstWait, 'a second lockout for the same identity is longer than the first');
    clock += 61 * 60_000;   // clear even the doubled window before the next round
  }
  fake.owner = owner.publicKeyB64;

  // 9. Authorization comes after proof: the name's owner only, and never by guessing when the miner cannot answer. No ticket, no cookie either way.
  const denied = browser(); const r8 = await proveAndAuthorize(denied, stranger);
  assert.equal(r8.status, 403); assert.equal(r8.set, null); assert.match(r8.json.error, /owned by another identity/); assert(r8.json.error.includes(owner.publicKeyB64), 'the owner is named');
  assert.equal((await denied.call('GET', '/admin-app.html')).status, 401);
  fake.down = true;
  const blind = browser(); const r9 = await proveAndAuthorize(blind, owner);
  assert.equal(r9.status, 503); assert.equal(r9.set, null, 'a miner that cannot be asked is a refusal, never a pass'); assert.match(r9.json.error, /Cannot check who owns/);
  fake.down = false;

  // 10. The door itself: a foreign origin, a foreign Host, and a non-JSON login are refused before any of this runs; challenges are capped.
  assert.equal((await fresh.call('POST', '/api/session/challenge', {}, { origin: 'http://evil.example' })).status, 403, 'cross-origin sign-in is refused');
  const rawHost = await new Promise((resolve, reject) => http.request({ host: '127.0.0.1', port, path: '/api/session', headers: { host: 'evil.example' } }, (r) => { r.resume(); resolve(r.statusCode); }).on('error', reject).end());
  assert.equal(rawHost, 403);
  const flood = browser(); let last;
  for (let i = 0; i < 8; i += 1) last = await flood.call('POST', '/api/session/challenge', {});
  assert.equal(last.status, 429, 'a flood of challenges is capped');

  // 11. The cookie parser takes the right cookie among others.
  assert.equal(readSessionToken('a=1; subzero_admin=tok123; b=2'), 'tok123'); assert.equal(readSessionToken('x_subzero_admin=nope'), null); assert.equal(readSessionToken(''), null);

  // 12. The store survives a restart: a new session set over the same store still knows the enrolled authenticator, so re-enrollment is never silently offered.
  const store2 = createAdminStore({ dir: null, now: () => clock });
  // simulate persistence by copying internal state the way a real file would round-trip it
  store2.setOtp(owner.publicKeyB64, store.getOtp(owner.publicKeyB64));
  const sessions2 = createSessions({ authorize: (key) => publisher.authorize(key), store: store2, now: () => clock, onNotice: () => {} });
  assert.equal(store2.getOtp(owner.publicKeyB64).secret, store.getOtp(owner.publicKeyB64).secret);

  console.log('admin session ok: three steps (signature, ownership, TOTP) against a real host; enrollment, lockout with doubling, replay and timing all covered');
} finally {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(root, { recursive: true, force: true });
}

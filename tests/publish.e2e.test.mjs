/* End to end against a REAL ark-miner-cli: admin's publish.js -> publish host -> pin API + names/* registry.
   Needs a miner (start one with an isolated STORAGE_PATH; see the README). Without one it says SKIPPED and exits 0,
   which is "not measured", never "passed".

     FLUX_CHAIN_TEST_KEY=<AUTH_KEYS value>  FLUX_CHAIN_TEST_STATUS=http://127.0.0.1:18766  FLUX_CHAIN_TEST_PIN=http://127.0.0.1:15002 \
       node tests/publish.e2e.test.mjs

   Each refusal case names what it guards. A published name is permanent on that miner, so the test uses its own name. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { createHost } from '../scripts/publish-host.mjs';
import { totpAt, base32Decode } from '../scripts/lib/totp.mjs';
import { createFluxRootHandle } from '../../flux-auth/src/rootFromMnemonic.mjs';
import { buildNameRecordSigningMessage } from '../../bundle-deploy/src/name-record.js';
import { buildMarkerFields, publicMarkerSigningMessage } from '../../bundle-deploy/src/public-marker.js';
import { createPublisher } from '../scripts/lib/publisher.mjs';
import { readProject, decodeSite, encodeSite, defaultProjectRoot } from '../scripts/lib/site-bundle.mjs';

const statusBase = process.env.FLUX_CHAIN_TEST_STATUS || 'http://127.0.0.1:18766';
const pinBase = process.env.FLUX_CHAIN_TEST_PIN || 'http://127.0.0.1:15002';
const key = process.env.FLUX_CHAIN_TEST_KEY || 'flux-chain-test-key-0123456789';
try { await fetch(`${statusBase}/status`, { signal: AbortSignal.timeout(3000) }); }
catch { console.log(`SKIPPED (not run, not passed): no miner answers at ${statusBase}. Start one, or set FLUX_CHAIN_TEST_STATUS / FLUX_CHAIN_TEST_PIN / FLUX_CHAIN_TEST_KEY.`); process.exit(0); }

const name = `flux-chain-e2e-${Date.now().toString(36)}.ark`;
const publisher = createPublisher({ name, statusBase, pinBase, key, root: defaultProjectRoot });
const port = 34000 + Math.floor(Math.random() * 1000);
const notices = [];
const host = createHost({ root: defaultProjectRoot, publisher, port, onNotice: (n) => notices.push(n) });
await new Promise((resolve) => host.listen(port, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${port}`;

// Two real identities from the shared canonical derivation (standard bip39 test phrases), not a random seed.
const PHRASES = {
  owner: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  stranger: 'legal winner thank year wave sausage worth useful legal winner thank yellow',
};
async function identityFor(name) {
  const handle = await createFluxRootHandle(PHRASES[name]);
  return { publicKeyB64: handle.publicKeyB64, displayName: name, sign: async (text) => Buffer.from(handle.sign(new TextEncoder().encode(text))).toString('base64') };
}
const identityA = await identityFor('owner');
// The real admin client file, run the way the page runs it. `who` is what the sign-in reports: an identity or null.
// Each client is one browser: it has a cookie jar, and login() does what admin.html's gate does (sign the host's challenge).
// Each identity's authenticator secret, as a real one would keep it, so a second client() for the SAME
// identity later (a second browser, or a sign-in after sign-out) can still produce a valid code.
const enrolledSecrets = new Map();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function client(who) {
  const state = { who }; let cookie = '';
  const jar = async (url, init = {}) => {
    const response = await fetch(url, { ...init, headers: { ...(init.headers || {}), ...(cookie ? { cookie } : {}) } });
    const set = response.headers.get('set-cookie');
    if (set) cookie = set.startsWith('flux_chain_admin=;') ? '' : set.split(';')[0];
    return response;
  };
  const context = vm.createContext({ btoa, atob, TextEncoder, Uint8Array, globalThis: {} });
  vm.runInContext(fs.readFileSync(new URL('../js/admin/publish.js', import.meta.url), 'utf8'), context);
  const api = context.ArkPublish.create({ fetch: jar, base: origin, identity: () => state.who });
  api.signOut = () => { state.who = null; };
  api.raw = (path, init) => jar(origin + path, init);
  // The real three steps: sign the host's challenge, then (only once past ownership) a one-time code —
  // enrolling with the real host-printed setup code the first time, verifying with the stored secret after.
  api.login = async () => {
    const json = { 'content-type': 'application/json' };
    const challenge = await (await jar(origin + '/api/session/challenge', { method: 'POST', headers: json, body: '{}' })).json();
    const loginResponse = await jar(origin + '/api/session/login', { method: 'POST', headers: json, body: JSON.stringify({ publicKeyB64: state.who.publicKeyB64, nonce: challenge.nonce, signature: await state.who.sign(challenge.message), label: state.who.displayName }) });
    const loginBody = await loginResponse.json();
    if (!loginResponse.ok) { const error = new Error(loginBody.error); error.detail = loginBody; throw error; }
    const { ticket, otp } = loginBody;
    let hostCode;
    if (otp.mode === 'enroll') {
      enrolledSecrets.set(state.who.publicKeyB64, otp.secret);
      hostCode = notices[notices.length - 1].hostCode;
    }
    const secret = enrolledSecrets.get(state.who.publicKeyB64);
    const code = totpAt(base32Decode(secret), Date.now());
    const otpResponse = await jar(origin + '/api/session/otp', { method: 'POST', headers: json, body: JSON.stringify({ ticket, code, hostCode }) });
    const otpBody = await otpResponse.json();
    if (!otpResponse.ok) { const error = new Error(otpBody.error); error.detail = otpBody; throw error; }
    return otpBody;
  };
  return api;
}
const admin = client(identityA);
const clone = (v) => JSON.parse(JSON.stringify(v));
const post = (path, body, headers = {}) => admin.raw(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

try {
  // Locked first: nothing works until an identity has signed in, and the owner of a fresh name is the first to sign in.
  assert.equal((await fetch(origin + '/api/status')).status, 401, 'the API is locked before sign-in');
  assert.equal((await fetch(origin + '/admin-app.html')).status, 401, 'and so is the editor');
  await admin.login();
  const site = readProject();

  // Before anything is published the name has no record, and the status says so instead of inventing one.
  let status = await admin.status();
  assert.equal(status.reachable, true); assert.equal(status.current, null);

  // 1. First publish: the name points at the archive, the miner confirms by reading it back.
  const first = await admin.publishSite(site);
  assert.equal(first.published, 1); assert.equal(first.confirmed, true, 'read-back agrees');
  assert.equal(first.manifests, site.manifests.length); assert.equal(first.articles, site.articles.length);
  status = await admin.status();
  assert.equal(status.current.version, 1); assert.equal(status.current.cid, first.cid);

  // 2. Publishing what is already there mints nothing: same content, same address, no new version.
  const again = await admin.publishSite(site);
  assert.equal(again.unchanged, true); assert.equal(again.version, 1);
  assert.equal((await admin.status()).current.version, 1, 'a no-op publish must not advance the version');

  // 3. An edit becomes version 2 at a different address; the old address still resolves (history is appended, never rewritten).
  const edited = clone(site);
  const firstField = Object.keys(edited.manifests[1].fields)[0];
  edited.manifests[1].fields[firstField].value = 'Edited from the admin page — “curly” quotes stay.';
  edited.articles[0].sections[0][1] += ' A new sentence.';
  const second = await admin.publishSite(edited);
  assert.equal(second.published, 2); assert.equal(second.confirmed, true); assert.notEqual(second.cid, first.cid);
  const oldBytes = await fetch(`${pinBase}/api/v0/cat?arg=${first.cid}`, { headers: { authorization: `Bearer ${key}` } });
  assert.equal(oldBytes.status, 200, 'version 1 bytes are still retrievable');
  assert.deepEqual(decodeSite(new Uint8Array(await oldBytes.arrayBuffer())), site, 'and still decode to version 1');

  // 4. Pull: the name resolves to the latest, and what comes back is exactly what was published.
  const pulled = await admin.pullSite();
  assert.equal(pulled.record.version, 2); assert.deepEqual(pulled.site, edited, 'pulled site equals published site');

  // 5. Another key cannot publish to this name, and the refusal names the owner and the remedy.
  // The name has an owner now, so another identity cannot even sign in to the admin: refused at the door, naming the owner.
  const stranger = client(await identityFor('stranger'));
  await assert.rejects(stranger.login(), (e) => /owned by another identity/.test(e.message) && e.message.includes(identityA.publicKeyB64) && /recovery file of the identity that owns the name/.test(e.detail.remedy));
  assert.equal((await stranger.raw('/api/status')).status, 401, 'and it holds no session');

  // A correctly built + signed public marker for a name record, so a manually-assembled /api/publish body can get
  // past the marker checks and exercise whatever the NAME record is meant to test, not "marker missing/invalid".
  const owner = identityA;
  async function signedMarkerFor(record, signer = owner) {
    const cid = record.targets[0].value;
    const fields = buildMarkerFields({ cid, contentType: 'application/octet-stream', ownerPublicKey: signer.publicKeyB64, now: Date.parse(record.updatedAt) });
    const signature = await signer.sign(Buffer.from(publicMarkerSigningMessage(fields)).toString('utf8'));
    return { ...fields, signature };
  }

  // 6. A forged signature is refused before it reaches the registry.
  const prepared = await (await post('/api/prepare', { site: edited, ownerPublicKey: identityA.publicKeyB64 })).json();
  assert.equal(prepared.ok, true);
  const forged = { ...prepared.record, proof: { alg: 'Ed25519', sig: Buffer.alloc(64, 7).toString('base64') } };
  const forgedResult = await post('/api/publish', { record: forged, marker: await signedMarkerFor(prepared.record) });
  assert.equal(forgedResult.status, 403); assert.match((await forgedResult.json()).error, /does not verify/);
  assert.equal((await admin.status()).current.version, 2, 'the forged record changed nothing');

  // 7. A stale record (prepared, then someone else published first) is refused with the way out.
  const sign = async (record, message) => ({ ...record, proof: { alg: 'Ed25519', sig: await owner.sign(message) } });
  const one = clone(edited); one.articles[1].sections[0][1] += ' One.';
  const two = clone(edited); two.articles[1].sections[0][1] += ' Two.';
  const prepOne = await (await post('/api/prepare', { site: one, ownerPublicKey: owner.publicKeyB64 })).json();
  const prepTwo = await (await post('/api/prepare', { site: two, ownerPublicKey: owner.publicKeyB64 })).json();
  assert.equal(prepOne.record.version, 3); assert.equal(prepTwo.record.version, 3);
  assert.equal((await post('/api/publish', { record: await sign(prepOne.record, prepOne.signingMessage), marker: await signedMarkerFor(prepOne.record) })).status, 200);
  const stale = await post('/api/publish', { record: await sign(prepTwo.record, prepTwo.signingMessage), marker: await signedMarkerFor(prepTwo.record) });
  const staleBody = await stale.json();
  assert.equal(stale.status, 409); assert.match(staleBody.remedy, /prepare again/);

  // 8. The name can never be aimed at bytes that are not a site, even with a valid owner signature and a valid marker.
  const junk = await (await fetch(`${pinBase}/api/v0/add`, { method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/octet-stream' }, body: encodeSite(edited).slice(0, 40) })).json();
  const junkRecord = { name, ownerPublicKey: owner.publicKeyB64, version: 4, updatedAt: new Date(Date.now() + 5000).toISOString(), targets: [{ type: 'ipfs_cid', value: junk.cid }] };
  const junkMessage = buildNameRecordSigningMessage({ ...junkRecord, proof: { alg: 'Ed25519', sig: 'x' } });
  const junkResult = await post('/api/publish', { record: await sign(junkRecord, junkMessage), marker: await signedMarkerFor(junkRecord) });
  // Validly signed, with a validly signed marker too, so the ONLY thing left to refuse it is the check that the bytes are a site.
  assert.equal(junkResult.status, 400); assert.match((await junkResult.json()).error, /not a flux-chain site/);
  assert.equal((await admin.status()).current.version, 3, 'the junk record changed nothing');

  // 9. The host is a mouth with a small door: loopback Host only, same-origin POSTs only, a whitelist of files.
  assert.equal((await fetch(`${origin}/admin.html`)).status, 200);
  assert.equal((await fetch(`${origin}/scripts/publish-host.mjs`)).status, 404, 'scripts are not served');
  assert.equal((await fetch(`${origin}/tests/publish.e2e.test.mjs`)).status, 404, 'tests are not served');
  assert.equal((await fetch(`${origin}/js/..%2Fscripts%2Fpublish-host.mjs`)).status, 404, 'traversal is refused');
  // fetch() silently drops a custom Host header, so this uses raw http to make the foreign Host real (DNS-rebinding shape).
  const rawStatus = await new Promise((resolve, reject) => http.request({ host: '127.0.0.1', port, path: '/api/status', headers: { host: 'evil.example' } }, (r) => { r.resume(); resolve(r.statusCode); }).on('error', reject).end());
  assert.equal(rawStatus, 403, 'a non-loopback Host is refused');
  assert.equal((await post('/api/prepare', { site: edited, ownerPublicKey: owner.publicKeyB64 }, { origin: 'http://evil.example' })).status, 403, 'a cross-origin POST is refused');
  assert.equal((await fetch(origin + '/api/prepare', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' })).status, 415, 'a simple cross-site form POST is refused');

  // 9b. Publishing a site that lacks something already published is reported, and the client can stop before signing.
  const smaller = clone(edited); const dropped = smaller.articles.pop(); const droppedPage = smaller.manifests.pop();
  const smallPrep = await (await post('/api/prepare', { site: smaller, ownerPublicKey: owner.publicKeyB64 })).json();
  assert.deepEqual(smallPrep.removes, { manifests: [droppedPage.id], articles: [dropped.slug] }, 'prepare names exactly what would disappear');
  const versionBefore = (await admin.status()).current.version;
  const declined = await admin.publishSite(smaller, undefined, async (removes) => { assert.deepEqual(removes.articles, [dropped.slug]); return false; });
  assert.equal(declined.cancelled, true); assert.equal((await admin.status()).current.version, versionBefore, 'declining publishes nothing');
  const accepted = await admin.publishSite(smaller, undefined, async () => true);
  assert.equal(accepted.published, versionBefore + 1, 'accepting publishes the smaller site');
  assert.equal((await admin.pullSite()).site.articles.length, edited.articles.length - 1);
  // Adding or editing removes nothing, so it never asks.
  let asked = false;
  const growing = clone(edited); growing.articles[0].sections[0][1] += ' Again.';
  await admin.publishSite(growing, undefined, async () => { asked = true; return true; });
  assert.equal(asked, false, 'an edit that removes nothing is not questioned');

  // 9c. Signed out, nothing is prepared or published, and the message says how to sign in. Signing out mid-publish stops it too.
  const signedOut = client(null); const before = (await admin.status()).current.version;
  await assert.rejects(signedOut.publishSite(edited), (e) => /Sign in first/.test(e.message) && /recovery file/.test(e.detail.remedy));
  // Signing out while the removal prompt is open: the prompt only appears when something would be removed, so remove something.
  // A real wait: the code must land on a later TOTP step than the enrollment above, or the server's own replay
  // protection correctly refuses it.
  await sleep(31000);
  const leaving = client(identityA); await leaving.login(); const shrink = clone(growing); shrink.articles.pop();
  let prompted = false;
  await assert.rejects(leaving.publishSite(shrink, undefined, async () => { prompted = true; leaving.signOut(); return true; }), /Sign in first/);
  assert.equal(prompted, true, 'the removal prompt really ran, so this exercised the mid-publish sign-out');
  assert.equal((await admin.status()).current.version, before, 'neither a signed-out nor a signed-out-mid-way publish changed anything');

  // 10. An invalid site is refused with what to fix, before anything reaches the miner.
  const invalid = clone(edited); invalid.articles[0].sections[0] = ['only a heading'];
  await assert.rejects(admin.publishSite(invalid), (e) => /needs a heading and a paragraph/.test(e.message) && /fix what is listed/.test(e.detail.remedy));

  console.log(`publish e2e ok against ${statusBase} as ${name}: v1 -> v2 -> v3 -> removal guard, pull, ${first.byteLength} bytes as .flx, 13 groups of assertions`);
} finally {
  await new Promise((resolve) => host.close(resolve));
}

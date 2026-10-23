/* End to end against a REAL ark-miner-cli: admin's publish.js -> publish host -> pin API + public-marker store.
   Needs a miner (start one with an isolated STORAGE_PATH; see the README). Without one it says SKIPPED and exits 0,
   which is "not measured", never "passed".

   Since 2026-10-19 a publish is a RELEASE: the archive is marked public at its own CID and NO name record is written
   (the dense-wire name chain is the only name authority; the CID is bound to the name from domains.defxn.com). So this
   no longer walks name versions v1 -> v2 -> v3 or pulls by name: it asserts the name record stays absent, releases
   are content-addressed, and a publish carrying a name record is refused.

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
import { createFluxRootHandle } from '../../fxn-auth/src/rootFromMnemonic.mjs';
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
  return { publicKeyB64: handle.publicKeyB64, displayName: name, sign: async (text) => Buffer.from(await handle.sign(new TextEncoder().encode(text))).toString('base64') };
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
  // Locked first: nothing works until an identity has signed in.
  assert.equal((await fetch(origin + '/api/status')).status, 401, 'the API is locked before sign-in');
  assert.equal((await fetch(origin + '/admin-app.html')).status, 401, 'and so is the editor');
  await admin.login();
  const site = readProject();

  // Before anything is published the name has no record, and the status says so instead of inventing one.
  let status = await admin.status();
  assert.equal(status.reachable, true); assert.equal(status.current, null);

  // 1. First publish: a release -- the archive is marked public at its CID, and the name is NOT pointed at it.
  const first = await admin.publishSite(site);
  assert.equal(first.released, true); assert.ok(first.cid);
  assert.equal(first.manifests, site.manifests.length); assert.equal(first.articles, site.articles.length);
  assert.equal(first.nameBinding.bound, false); assert.match(first.nameBinding.remedy, /domains\.defxn\.com/);
  assert.equal((await admin.status()).current, null, 'publishing wrote no name record to the miner');

  // 2. Publishing the same content again is the same address: content addressing, not a new version.
  const again = await admin.publishSite(site);
  assert.equal(again.cid, first.cid, 'identical content releases at the identical address');

  // 3. An edit is a different address; the old address still resolves (history is appended, never rewritten).
  const edited = clone(site);
  const firstField = Object.keys(edited.manifests[1].fields)[0];
  edited.manifests[1].fields[firstField].value = 'Edited from the admin page — “curly” quotes stay.';
  edited.articles[0].sections[0][1] += ' A new sentence.';
  const second = await admin.publishSite(edited);
  assert.equal(second.released, true); assert.notEqual(second.cid, first.cid);
  const oldBytes = await fetch(`${pinBase}/api/v0/cat?arg=${first.cid}`, { headers: { authorization: `Bearer ${key}` } });
  assert.equal(oldBytes.status, 200, 'the first release is still retrievable');
  assert.deepEqual(decodeSite(new Uint8Array(await oldBytes.arrayBuffer())), site, 'and still decodes to the first site');

  // 4. The released archive is exactly what was published (read by CID: the name was not moved, so it is not resolved).
  const newBytes = await fetch(`${pinBase}/api/v0/cat?arg=${second.cid}`, { headers: { authorization: `Bearer ${key}` } });
  assert.deepEqual(decodeSite(new Uint8Array(await newBytes.arrayBuffer())), edited, 'the released archive equals the published site');

  // A correctly built + signed public marker for a CID, so a manually-assembled /api/publish body exercises whatever
  // the case is meant to test, not "marker missing/invalid".
  const owner = identityA;
  async function signedMarkerFor(cid, signer = owner) {
    const fields = buildMarkerFields({ cid, contentType: 'application/octet-stream', ownerPublicKey: signer.publicKeyB64, now: Date.now() });
    const signature = await signer.sign(Buffer.from(publicMarkerSigningMessage(fields)).toString('utf8'));
    return { ...fields, signature };
  }

  // 5. A forged marker signature is refused before anything is marked public.
  const prepared = await (await post('/api/prepare', { site: edited, ownerPublicKey: identityA.publicKeyB64 })).json();
  assert.equal(prepared.ok, true); assert.equal('record' in prepared, false, 'prepare drafts no name record');
  const forged = { ...prepared.marker, signature: Buffer.alloc(64, 7).toString('base64') };
  const forgedResult = await post('/api/publish', { marker: forged });
  assert.equal(forgedResult.status, 403); assert.match((await forgedResult.json()).error, /does not verify/);

  // 6. A publish carrying a name record is refused with failure / missing / remedy, and writes nothing -- no name, no release.
  const record = { name, ownerPublicKey: owner.publicKeyB64, version: 1, updatedAt: new Date().toISOString(), targets: [{ type: 'ipfs_cid', value: prepared.cid }], proof: { alg: 'Ed25519', sig: 'x' } };
  const withRecord = await post('/api/publish', { record, marker: await signedMarkerFor(prepared.cid) });
  const withRecordBody = await withRecord.json();
  assert.equal(withRecord.status, 409); assert.ok(withRecordBody.failure && withRecordBody.missing);
  assert.match(withRecordBody.remedy, /https:\/\/domains\.defxn\.com/);
  assert.equal((await admin.status()).current, null, 'the refused record changed nothing');

  // 7. Bytes that are not a site are never marked public through this admin, even with a valid owner-signed marker.
  const junk = await (await fetch(`${pinBase}/api/v0/add`, { method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/octet-stream' }, body: encodeSite(edited).slice(0, 40) })).json();
  const junkResult = await post('/api/publish', { marker: await signedMarkerFor(junk.cid) });
  assert.equal(junkResult.status, 400); assert.match((await junkResult.json()).error, /not a flux-chain site/);

  // 8. The host is a mouth with a small door: loopback Host only, same-origin POSTs only, a whitelist of files.
  assert.equal((await fetch(`${origin}/admin.html`)).status, 200);
  assert.equal((await fetch(`${origin}/scripts/publish-host.mjs`)).status, 404, 'scripts are not served');
  assert.equal((await fetch(`${origin}/tests/publish.e2e.test.mjs`)).status, 404, 'tests are not served');
  assert.equal((await fetch(`${origin}/js/..%2Fscripts%2Fpublish-host.mjs`)).status, 404, 'traversal is refused');
  // fetch() silently drops a custom Host header, so this uses raw http to make the foreign Host real (DNS-rebinding shape).
  const rawStatus = await new Promise((resolve, reject) => http.request({ host: '127.0.0.1', port, path: '/api/status', headers: { host: 'evil.example' } }, (r) => { r.resume(); resolve(r.statusCode); }).on('error', reject).end());
  assert.equal(rawStatus, 403, 'a non-loopback Host is refused');
  assert.equal((await post('/api/prepare', { site: edited, ownerPublicKey: owner.publicKeyB64 }, { origin: 'http://evil.example' })).status, 403, 'a cross-origin POST is refused');
  assert.equal((await fetch(origin + '/api/prepare', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' })).status, 415, 'a simple cross-site form POST is refused');

  // 9. Signed out, nothing is prepared or published, and the message says how to sign in.
  const signedOut = client(null);
  await assert.rejects(signedOut.publishSite(edited), (e) => /Sign in first/.test(e.message) && /recovery file/.test(e.detail.remedy));

  // 10. An invalid site is refused with what to fix, before anything reaches the miner.
  const invalid = clone(edited); invalid.articles[0].sections[0] = ['only a heading'];
  await assert.rejects(admin.publishSite(invalid), (e) => /needs a heading and a paragraph/.test(e.message) && /fix what is listed/.test(e.detail.remedy));

  console.log(`publish e2e ok against ${statusBase} as ${name}: release, same-content same-address, edit, by-CID read, name record refused, ${first.byteLength} bytes as .flx, 10 groups of assertions`);
} finally {
  await new Promise((resolve) => host.close(resolve));
}

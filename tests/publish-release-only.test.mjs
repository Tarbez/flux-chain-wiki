/* Publishing is a RELEASE, never a name write: hermetic (a stub miner on a random port that records every route it is
   asked for), driving the REAL publisher (scripts/lib/publisher.mjs) and the REAL publish host (scripts/publish-host.mjs).

   Why this exists (owner decision, 2026-10-19): the dense-wire name chain (KDOMCLAIM/KDOMREC) is the only system that
   owns names. This admin used to hand an owner-signed record to the miner's names/* registry
   (POST /debug/name-record/publish) on every publish -- a second name authority, and a direct miner name write that
   bundle-deploy itself forbids. Each case below turns red if that write, or a silent "publish the release and drop the
   record" fallback, comes back:
     - a publish touches only the pin and public-marker routes, never /debug/name-record/publish;
     - prepare drafts no name record and still works when the name registry cannot be read (a release needs no name);
     - a publish carrying a name record is refused with failure / missing / remedy naming domains.defxn.com, and
       nothing reaches the miner -- not even the release. */
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign as edSign } from 'node:crypto';
import http from 'node:http';
import { createHost } from '../scripts/publish-host.mjs';
import { NameBindingRefusal, PublishRefusal, createPublisher, nameBindingParts } from '../scripts/lib/publisher.mjs';
import { decodeSite, readProject } from '../scripts/lib/site-bundle.mjs';

const NAME = 'release-only.fxn';

/* A raw Ed25519 identity with node:crypto: base64 public key, base64 detached signature over UTF-8 text. */
function identity() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const raw = Buffer.from(publicKey.export({ format: 'jwk' }).x, 'base64url');
  return { publicKeyB64: raw.toString('base64'), sign: (text) => edSign(null, Buffer.from(text, 'utf8'), privateKey).toString('base64') };
}

async function stubMiner({ nameRegistry = 'empty' } = {}) {
  const blobs = new Map(); const markers = new Map(); const routes = [];
  const body = (req) => new Promise((resolve) => { const chunks = []; req.on('data', (c) => chunks.push(c)); req.on('end', () => resolve(Buffer.concat(chunks))); });
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    routes.push(`${req.method} ${url.pathname}`);
    // Every answer closes its connection. Encoding the site takes seconds, longer than node's 5 s server keep-alive, and
    // fetch then reuses a socket the stub already closed: 2 of 4 runs failed with "the miner did not answer" before this.
    res.setHeader('connection', 'close');
    const json = (status, value) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(value)); };
    if (url.pathname === '/debug/name-record' && req.method === 'GET') return nameRegistry === 'down' ? json(503, { error: 'retired' }) : json(200, { record: null });
    if (url.pathname === '/api/v0/add' && req.method === 'POST') { const bytes = await body(req); const cid = 'bafy' + createHash('sha256').update(bytes).digest('hex').slice(0, 40); blobs.set(cid, bytes); return json(200, { cid }); }
    if (url.pathname === '/api/v0/cat') { const bytes = blobs.get(url.searchParams.get('arg')); if (!bytes) return json(404, { error: 'not found' }); res.writeHead(200, { 'content-type': 'application/octet-stream' }); return res.end(bytes); }
    if (url.pathname === '/api/v0/public-marker' && req.method === 'POST') { const record = JSON.parse(await body(req)); markers.set(record.cid, record); return json(200, { ok: true }); }
    return json(404, { error: 'stub miner has no ' + url.pathname });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { server, base, blobs, markers, routes };
}

const site = readProject();
const owner = identity();
const closers = [];

try {
  // 1. prepare drafts a release (marker only) and says, before anything is signed, that the name will not move.
  const miner = await stubMiner(); closers.push(miner.server);
  const publisher = createPublisher({ name: NAME, statusBase: miner.base, pinBase: miner.base, key: 'stub-key', root: process.cwd() });
  const prepared = await publisher.prepare(site, owner.publicKeyB64);
  assert.equal('record' in prepared || 'signingMessage' in prepared, false, 'prepare drafts no name record');
  assert.equal(prepared.marker.cid, prepared.cid);
  assert.deepEqual(prepared.nameBinding, { name: NAME, ...nameBindingParts(NAME) });

  // 2. publish marks the release public and writes no name: only pin + marker routes after prepare.
  const before = miner.routes.length;
  const released = await publisher.publish({ marker: { ...prepared.marker, signature: owner.sign(prepared.markerSigningMessage) } });
  assert.equal(released.released, true); assert.equal(released.cid, prepared.cid);
  assert.equal(released.manifests, site.manifests.length); assert.equal(released.articles, site.articles.length);
  assert.equal(miner.markers.get(prepared.cid).public, true, 'the release is marked public');
  assert.deepEqual(miner.routes.slice(before), ['GET /api/v0/cat', 'POST /api/v0/public-marker'], 'publish touched only the pin and marker routes');
  assert(!miner.routes.some((route) => route.startsWith('POST /debug/name-record')), 'no name record was written to the miner');
  assert.equal(released.nameBinding.bound, false);
  assert.match(released.nameBinding.remedy, /https:\/\/domains\.defxn\.com/);
  assert.deepEqual(decodeSite(miner.blobs.get(released.cid)), site, 'the released archive decodes to exactly the published site');

  // 3. The exact refusal: failure, what is missing, and the remedy -- one sentence, written once in publisher.mjs.
  const parts = nameBindingParts(NAME);
  assert.equal(parts.failure, `This publisher cannot point ${NAME} at a release: names are owned only by the dense-wire name chain, and this publisher is not a name authority.`);
  assert.equal(parts.missing, `an owner-signed dense-wire record update that binds the release CID to ${NAME}.`);
  assert.equal(parts.remedy, `publish the release without a name, then bind its CID to ${NAME} at https://domains.defxn.com, which signs the dense-wire record update.`);

  // 4. A publish that carries a name record is refused, and NOTHING reaches the miner -- not even the valid release.
  const record = { name: NAME, ownerPublicKey: owner.publicKeyB64, version: 1, updatedAt: new Date().toISOString(), targets: [{ type: 'ipfs_cid', value: prepared.cid }], proof: { alg: 'Ed25519', sig: 'x' } };
  const sent = miner.routes.length; miner.markers.clear();
  await assert.rejects(publisher.publish({ record, marker: { ...prepared.marker, signature: owner.sign(prepared.markerSigningMessage) } }), (error) =>
    error instanceof NameBindingRefusal && error instanceof PublishRefusal && error.status === 409 && error.code === 'NAME_BINDING_IS_DENSE_WIRE'
    && error.failure === parts.failure && error.missing === parts.missing && error.remedy === parts.remedy
    && error.message === `${parts.failure} Missing: ${parts.missing} To fix: ${parts.remedy}`);
  assert.equal(miner.routes.length, sent, 'the refused publish sent nothing');
  assert.equal(miner.markers.size, 0, 'and the release was not published either');

  // 5. A release needs no name: prepare + publish still work when the name registry cannot be read at all.
  const retired = await stubMiner({ nameRegistry: 'down' }); closers.push(retired.server);
  const nameless = createPublisher({ name: NAME, statusBase: retired.base, pinBase: retired.base, key: 'stub-key', root: process.cwd() });
  const prep2 = await nameless.prepare(site, owner.publicKeyB64);
  assert.equal(prep2.removes, null, 'with the registry unreadable the comparison is unavailable (null), so the page asks before publishing');
  const rel2 = await nameless.publish({ marker: { ...prep2.marker, signature: owner.sign(prep2.markerSigningMessage) } });
  assert.equal(rel2.released, true);

  // 6. Through the real host: /api/publish with a name record answers 409 with the refusal's three parts; without one, 200.
  const reserve = http.createServer(); await new Promise((r) => reserve.listen(0, '127.0.0.1', r));
  const port = reserve.address().port; await new Promise((r) => reserve.close(r));
  const sessions = { get: () => ({ publicKeyB64: owner.publicKeyB64 }) };
  const host = createHost({ root: process.cwd(), publisher, port, sessions, permissions: async () => ({ authorized: true }), resolveCheck: async () => ({ skipped: 'hermetic test' }) });
  await new Promise((r) => host.listen(port, '127.0.0.1', r)); closers.push(host);
  const origin = `http://127.0.0.1:${port}`;
  const post = (body) => fetch(origin + '/api/publish', { method: 'POST', headers: { origin, 'content-type': 'application/json', cookie: 'flux_chain_admin=t' }, body: JSON.stringify(body) });
  const prep3 = await publisher.prepare(site, owner.publicKeyB64);
  const marker3 = { ...prep3.marker, signature: owner.sign(prep3.markerSigningMessage) };
  const refused = await post({ record, marker: marker3 });
  const refusedBody = await refused.json();
  assert.equal(refused.status, 409);
  assert.deepEqual([refusedBody.failure, refusedBody.missing, refusedBody.remedy], [parts.failure, parts.missing, parts.remedy]);
  const ok = await post({ marker: marker3 });
  const okBody = await ok.json();
  assert.equal(ok.status, 200, JSON.stringify(okBody)); assert.equal(okBody.released, true); assert.equal(okBody.nameBinding.bound, false);

  console.log('publish release-only ok: release touches only pin + marker, a name record is refused with failure/missing/remedy, a release needs no name registry');
} finally {
  for (const server of closers) await new Promise((resolve) => server.close(resolve));
}

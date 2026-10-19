/* The admin client's publish: exactly the reviewed bytes are signed, a cancel signs nothing, and an approval signs the
   public marker once -- and NO name record. Since 2026-10-19 the dense-wire name chain is the only name authority:
   publishing is a release, and the client must neither sign nor send a name record (a signed record sent to
   /api/publish would be the retired names/* write). The reviewer is told, before signing, that the name does not
   move and where to bind the release (prepared.nameBinding, from scripts/lib/publisher.mjs). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = vm.createContext({ TextEncoder, Uint8Array, console });
vm.runInContext(fs.readFileSync('js/admin/publish.js', 'utf8'), context);
const signed = [];
const identity = { publicKeyB64: 'owner-key', displayName: 'owner', sign: async (text) => { signed.push(text); return 'sig'; } };
const calls = [];
const nameBinding = { name: 'defxn.fxn', failure: 'This publisher cannot point defxn.fxn at a release: ...', missing: 'an owner-signed dense-wire record update ...', remedy: 'publish the release without a name, then bind its CID to defxn.fxn at https://domains.defxn.com, which signs the dense-wire record update.' };
const prepared = {
  ok: true, unchanged: false, byteLength: 12, removes: { manifests: [], articles: [], assets: [] },
  marker: { cid: 'cid-2', public: true, contentType: 'application/octet-stream', ownerPublicKey: 'owner-key', updatedAt: 1700000000000 }, markerSigningMessage: 'flux-public-marker/1\n|exact-marker-bytes',
  nameBinding,
};
const fetchImpl = async (_url, init = {}) => {
  const body = init.body ? JSON.parse(init.body) : null;
  calls.push(body);
  if (calls.length === 1) return new Response(JSON.stringify(prepared), { status: 200, headers: { 'content-type': 'application/json' } });
  return new Response(JSON.stringify({ ok: true, released: true, cid: 'cid-2', nameBinding: { ...nameBinding, bound: false } }), { status: 200, headers: { 'content-type': 'application/json' } });
};

(async () => {
  let review;
  const api = context.ArkPublish.create({ fetch: fetchImpl, identity: () => identity, authorize: async input => { review = input; return false; } });
  const cancelled = await api.publishSite({ manifests: [], articles: [], assets: [] });
  assert.equal(cancelled.cancelled, true);
  assert.equal(signed.length, 0, 'cancel produces no signature');
  assert.equal(calls.length, 1, 'cancel stops before publish');
  assert.equal(review.markerSigningMessage, prepared.markerSigningMessage, 'reviewed bytes are exactly the marker bytes that would be signed');
  assert.equal('signingMessage' in review || 'record' in review, false, 'no name record is offered for review: there is none to sign');
  assert.deepEqual(review.nameBinding, nameBinding, 'the reviewer is told the name does not move, and where to bind the release');

  const approvedCalls = [];
  const approvedApi = context.ArkPublish.create({ fetch: async (_url, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : null;
    approvedCalls.push(body);
    return new Response(JSON.stringify(body && body.marker ? { ok: true, released: true, cid: 'cid-2', nameBinding: { ...nameBinding, bound: false } } : prepared), { status: 200, headers: { 'content-type': 'application/json' } });
  }, identity: () => identity, authorize: async input => input.markerSigningMessage === prepared.markerSigningMessage });
  const result = await approvedApi.publishSite({ manifests: [], articles: [], assets: [] });
  assert.equal(result.released, true);
  assert.equal(result.nameBinding.bound, false);
  assert.deepEqual(signed, [prepared.markerSigningMessage], 'approval signs the reviewed marker bytes once, and nothing else');
  const sent = approvedCalls[approvedCalls.length - 1];
  assert.deepEqual(sent, { marker: { ...prepared.marker, signature: 'sig' } }, 'only the signed marker is sent to /api/publish: no name record');
  console.log('publish authorization ok: exact marker bytes reviewed, cancel unsigned, approval signs the marker once, no name record signed or sent');
})().catch(error => { console.error(error); process.exitCode = 1; });

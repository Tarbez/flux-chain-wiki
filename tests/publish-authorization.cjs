const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = vm.createContext({ TextEncoder, Uint8Array, console });
vm.runInContext(fs.readFileSync('js/admin/publish.js', 'utf8'), context);
const signed = [];
const identity = { publicKeyB64: 'owner-key', displayName: 'owner', sign: async (text) => { signed.push(text); return 'sig'; } };
const calls = [];
const prepared = { ok: true, unchanged: false, byteLength: 12, removes: { manifests: [], articles: [], assets: [] }, record: { name: 'flux-chain.ark', version: 2, ownerPublicKey: 'owner-key', cid: 'cid-2' }, signingMessage: 'flux-name-record/v1|exact-bytes' };
const fetchImpl = async (_url, init = {}) => {
  const body = init.body ? JSON.parse(init.body) : null;
  calls.push(body);
  if (calls.length === 1) return new Response(JSON.stringify(prepared), { status: 200, headers: { 'content-type': 'application/json' } });
  return new Response(JSON.stringify({ ok: true, published: 2, confirmed: true, cid: 'cid-2' }), { status: 200, headers: { 'content-type': 'application/json' } });
};

(async () => {
  let review;
  const api = context.ArkPublish.create({ fetch: fetchImpl, identity: () => identity, authorize: async input => { review = input; return false; } });
  const cancelled = await api.publishSite({ manifests: [], articles: [], assets: [] });
  assert.equal(cancelled.cancelled, true);
  assert.equal(signed.length, 0, 'cancel produces no signature');
  assert.equal(calls.length, 1, 'cancel stops before publish');
  assert.equal(review.signingMessage, prepared.signingMessage, 'reviewed bytes are exactly the bytes that would be signed');

  const approvedApi = context.ArkPublish.create({ fetch: async (_url, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : null;
    return new Response(JSON.stringify(body && body.record ? { ok: true, published: 2, confirmed: true, cid: 'cid-2' } : prepared), { status: 200, headers: { 'content-type': 'application/json' } });
  }, identity: () => identity, authorize: async input => input.signingMessage === prepared.signingMessage });
  const result = await approvedApi.publishSite({ manifests: [], articles: [], assets: [] });
  assert.equal(result.published, 2);
  assert.deepEqual(signed, [prepared.signingMessage], 'approval signs the reviewed bytes');
  console.log('publish authorization ok: exact bytes reviewed, cancel unsigned, approval signs once');
})().catch(error => { console.error(error); process.exitCode = 1; });

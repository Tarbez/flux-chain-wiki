/* Unit tests for scripts/lib/resolve-check.mjs -- no miner, no gateway, no network. Every case
   is a stubbed fetch, since the whole point of this module is to behave correctly against
   ark-gateway's documented response shapes without needing a live one.
   FORK DEBT: mirrors SUBZERO's tests/resolve-check.test.mjs -- see that file's module header. */
import assert from 'node:assert/strict';
import { verifyPublishedResolution, ResolveCheckFailure } from '../scripts/lib/resolve-check.mjs';

const CID = 'bafybeigdyrfake0000000000000000000000000000000000000000000';
const name = 'flux-chain.ark';
const resolverBase = 'https://gateway.example';

function fakeFetch(handler) {
  return async (url, init) => handler(url, init);
}

// 1. Happy path: 302 to the matching CID.
{
  const fetchImpl = fakeFetch((url) => {
    assert.equal(url, `${resolverBase}/resolve/${encodeURIComponent(name)}`);
    return { status: 302, headers: { get: (k) => (k === 'location' ? `/ipfs/${CID}` : null) } };
  });
  const result = await verifyPublishedResolution({ name, cid: CID, resolverBase, fetchImpl });
  assert.equal(result.cid, CID);
  assert.equal(result.url, `${resolverBase}/resolve/${encodeURIComponent(name)}`);
}

// 2. NOT_FOUND: today's real, expected gateway behavior (F-7a/b finding) -- fails closed, not silently.
{
  const fetchImpl = fakeFetch(() => ({ status: 404, headers: { get: () => null } }));
  await assert.rejects(
    verifyPublishedResolution({ name, cid: CID, resolverBase, fetchImpl }),
    (error) => error instanceof ResolveCheckFailure && error.reason === 'GATEWAY_NOT_FOUND',
  );
}

// 3. Mismatched CID: the gateway resolves the name, but to different bytes than were just published.
{
  const otherCid = 'bafybeiOTHERCID000000000000000000000000000000000000000000';
  const fetchImpl = fakeFetch(() => ({ status: 302, headers: { get: (k) => (k === 'location' ? `/ipfs/${otherCid}` : null) } }));
  await assert.rejects(
    verifyPublishedResolution({ name, cid: CID, resolverBase, fetchImpl }),
    (error) => error instanceof ResolveCheckFailure && error.reason === 'GATEWAY_CID_MISMATCH' && error.expected === CID && error.got === otherCid,
  );
}

// 4. Resolver unreachable: the fetch itself throws (network error, timeout, DNS failure).
{
  const fetchImpl = fakeFetch(() => { throw new Error('ECONNREFUSED'); });
  await assert.rejects(
    verifyPublishedResolution({ name, cid: CID, resolverBase, fetchImpl }),
    (error) => error instanceof ResolveCheckFailure && error.reason === 'GATEWAY_UNREACHABLE' && /ECONNREFUSED/.test(error.detail),
  );
}

// 5. Configurable URL: a different resolverBase is what gets called, trailing slash tolerated.
{
  let calledUrl = null;
  const fetchImpl = fakeFetch((url) => { calledUrl = url; return { status: 302, headers: { get: (k) => (k === 'location' ? `/ipfs/${CID}` : null) } }; });
  await verifyPublishedResolution({ name, cid: CID, resolverBase: 'https://other.example/', fetchImpl });
  assert.equal(calledUrl, `https://other.example/resolve/${encodeURIComponent(name)}`);
}

// 6. An unexpected status (neither 404 nor 302) is a distinct, non-swallowed failure too.
{
  const fetchImpl = fakeFetch(() => ({ status: 502, headers: { get: () => null } }));
  await assert.rejects(
    verifyPublishedResolution({ name, cid: CID, resolverBase, fetchImpl }),
    (error) => error instanceof ResolveCheckFailure && error.reason === 'GATEWAY_ERROR' && error.status === 502,
  );
}

console.log('resolve-check ok: happy path, NOT_FOUND, CID mismatch, unreachable, configurable URL, unexpected status -- 6 cases');

/* The gateway shell fetches a site by its content ID and refuses bytes that do not hash to it.
   Why this exists: the node that answers /fxn-store/v1/<cid> is not trusted. Before 2026-10-23 the shell
   rendered whatever the miner's /explorer/v1/content route sent, so a node could serve any site under any
   verified name. Each case is a way a node can answer, and what the shell must do. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchVerifiedContent, CONTENT_ROUTE } from '../gateway/content.js';

/* Printed by the Rust byte store: flxd-blockstore answered this content ID for a put of the three bytes
   "abc" on 2026-10-23 (flx_traffic::ContentId::of, the `blake3` crate). It is also the BLAKE3 spec's own
   value for "abc". */
const ABC = new TextEncoder().encode('abc');
const ABC_CID = '6437b3ac38465133ffb63b75273a8db548c558465d79db03fd359c6cd5bd9d85';

const storeAnswer = (bytes, status = 200) => async (url) => {
  storeAnswer.urls.push(url);
  return new Response(JSON.stringify({ ok: true, data_base64: Buffer.from(bytes).toString('base64') }), { status });
};
storeAnswer.urls = [];

test('bytes that hash to the record\'s content ID are handed back, fetched from the store route', async () => {
  const result = await fetchVerifiedContent(ABC_CID, { fetchImpl: storeAnswer(ABC) });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.deepEqual([...result.bytes], [...ABC]);
  assert.equal(storeAnswer.urls.at(-1), `${CONTENT_ROUTE}${ABC_CID}`);
  assert.equal(CONTENT_ROUTE, '/fxn-store/v1/');
});

test('bytes that hash to anything else are refused, naming both IDs', async () => {
  const result = await fetchVerifiedContent(ABC_CID, { fetchImpl: storeAnswer(new TextEncoder().encode('abd')) });
  assert.deepEqual([result.ok, result.reason], [false, 'CONTENT_MISMATCH']);
  assert.match(result.detail, new RegExp(`names ${ABC_CID}\\. The node sent bytes whose BLAKE3 is [0-9a-f]{64}\\.`));
  assert.equal('bytes' in result, false, 'nothing to render');
});

test('a missing block, an unreachable node and a body that is not the store\'s answer are each named', async () => {
  const missing = await fetchVerifiedContent(ABC_CID, { fetchImpl: async () => new Response('{"ok":false,"code":"BLOCK_NOT_FOUND"}', { status: 404 }) });
  assert.deepEqual([missing.reason, /Publish the site again with Bundles/.test(missing.detail)], ['CONTENT_UNREACHABLE', true]);
  const down = await fetchVerifiedContent(ABC_CID, { fetchImpl: async () => { throw new Error('connection refused'); } });
  assert.deepEqual([down.reason, down.detail], ['CONTENT_UNREACHABLE', 'connection refused']);
  const html = await fetchVerifiedContent(ABC_CID, { fetchImpl: async () => new Response('<html>shell</html>', { status: 200 }) });
  assert.equal(html.reason, 'CONTENT_MALFORMED');
  const big = await fetchVerifiedContent(ABC_CID, { fetchImpl: async () => new Response('', { status: 413 }) });
  assert.equal(big.reason, 'CONTENT_TOO_LARGE');
});

test('a target that is not a content ID is refused before anything is fetched', async () => {
  let fetched = false;
  const result = await fetchVerifiedContent('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi', { fetchImpl: async () => { fetched = true; } });
  assert.deepEqual([result.reason, fetched], ['CONTENT_MALFORMED', false]);
});

test('the shell reads only the blake3_cid target and only the store route', async () => {
  const { readFileSync } = await import('node:fs');
  const app = readFileSync(new URL('../gateway/app.js', import.meta.url), 'utf8').split('\n').filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line)).join('\n');
  assert.doesNotMatch(app, /ipfs_cid|explorer\/v1\/content/);
  assert.match(app, /t\.type === "blake3_cid"/);
  assert.match(app, /fetchVerifiedContent\(target\.value\)/);
});

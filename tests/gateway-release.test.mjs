/* The gateway shell's app release download (gateway/release.js, /_release/<product>). The node is
   never trusted: these cases are the ways a node could hand a visitor the wrong file, and the shell
   must refuse each one by name instead of saving it. The full path (claim, release, read, download)
   ran end to end against a local chain-server and byte store on 2026-10-26. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseRequestOf, downloadRelease } from '../gateway/release.js';
import { blake3 } from '../gateway/vendor/flx-codec/blake3.js';
import { hexOf } from '../gateway/content.js';

const BLOCK = 8 * 1024 * 1024;
const bytes = (n, fill) => new Uint8Array(n).fill(fill);
const sha256 = async (parts) => hexOf(new Uint8Array(await crypto.subtle.digest('SHA-256', await new Blob(parts).arrayBuffer())));
const answer = (data) => ({ ok: true, status: 200, json: async () => ({ ok: true, data_base64: Buffer.from(data).toString('base64') }) });

async function release() {
  const a = bytes(BLOCK, 1);
  const b = bytes(100, 2);
  return { blocks: [hexOf(blake3(a)), hexOf(blake3(b))], blockBytes: BLOCK, size: BLOCK + 100, sha256: await sha256([a, b]), data: { a, b } };
}

test('the release address names a product; anything else is not a release address', () => {
  assert.deepEqual(releaseRequestOf('/_release/ark-browser', '?arch=x64'), { product: 'ark-browser', platform: 'darwin', arch: 'x64', channel: 'beta' });
  assert.equal(releaseRequestOf('/about'), null);
  assert.equal(releaseRequestOf('/_release/Bad Product').invalid, true);
});

test('every block checked against its ID and the whole file against the signed SHA-256 is saved', async () => {
  const r = await release();
  const served = { [`/fxn-store/v1/${r.blocks[0]}`]: r.data.a, [`/fxn-store/v1/${r.blocks[1]}`]: r.data.b };
  const seen = [];
  const out = await downloadRelease(r, { fetchImpl: async (url) => answer(served[url]), onProgress: (got) => seen.push(got) });
  assert.equal(out.ok, true);
  assert.equal(out.blob.size, r.size);
  assert.deepEqual(seen, [BLOCK, BLOCK + 100], 'progress is real: one step per block');
});

test('a block that does not hash to its ID is refused, even at the right length', async () => {
  const r = await release();
  const out = await downloadRelease(r, { fetchImpl: async () => answer(bytes(BLOCK, 9)) });
  assert.equal(out.ok, false);
  assert.equal(out.reason, 'CONTENT_MISMATCH');
  assert.match(out.detail, /Block 1/);
});

test('blocks that each match but a file that is not the signed one is refused', async () => {
  const r = await release();
  const served = { [`/fxn-store/v1/${r.blocks[0]}`]: r.data.a, [`/fxn-store/v1/${r.blocks[1]}`]: r.data.b };
  const out = await downloadRelease({ ...r, sha256: 'f'.repeat(64) }, { fetchImpl: async (url) => answer(served[url]) });
  assert.equal(out.reason, 'CONTENT_MISMATCH');
  assert.match(out.detail, /owner signed/);
});

test('a node that does not answer is named, never read as an empty file', async () => {
  const r = await release();
  const out = await downloadRelease(r, { fetchImpl: async () => ({ ok: false, status: 502 }) });
  assert.equal(out.reason, 'CONTENT_UNREACHABLE');
  assert.match(out.detail, /502/);
});

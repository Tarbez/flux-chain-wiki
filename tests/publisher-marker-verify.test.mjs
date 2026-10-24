// Regression (node production build, 2026-10-21): bundle-deploy's marker
// verification became async (the shared native Ed25519 module), and its old
// synchronous verifyMarkerSignature now throws a refusal. publisher.mjs called
// the sync name, so a merged bundle-deploy would break every site publish.
// publisher.mjs must await markerSignatureVerifies: a forged marker is refused
// with 403, and a genuine one passes the check (and fails later, on the
// unreachable miner this test points at, not on the signature).
//
// Regression (2026-10-22 second review, row 13): the publisher still posted
// /debug/name-record/publish (a GUN names/* write, in the names:check baseline)
// and read /debug/name-record. The miner's node-clean retires that POST, and the
// one name system is dense-wire (docs/DEFXN-NAMES-ONE-SYSTEM.md): publishing is
// a RELEASE only; the name is bound by an owner-signed KDOMREC2 record update.
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import http from 'node:http';
import test from 'node:test';
import { buildMarkerFields, publicMarkerSigningMessage } from '../../bundle-deploy/src/public-marker.js';
import { createPublisher } from '../scripts/lib/publisher.mjs';
import { readProject, encodeSite } from '../scripts/lib/site-bundle.mjs';

function identity() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const raw = publicKey.export({ format: 'jwk' }).x;
  return { publicKeyB64: Buffer.from(raw, 'base64url').toString('base64'), sign: (bytes) => sign(null, Buffer.from(bytes), privateKey).toString('base64') };
}

test('publisher.mjs awaits markerSignatureVerifies and never calls the retired sync verifier', () => {
  const source = readFileSync(new URL('../scripts/lib/publisher.mjs', import.meta.url), 'utf8');
  assert.match(source, /await markerSignatureVerifies\(/);
  assert.doesNotMatch(source, /verifyMarkerSignature\s*[,(}]/, "the retired sync verifier is neither imported nor called");
});

test('a forged public marker is refused with 403; a genuine one passes the signature check', async () => {
  const owner = identity();
  const stranger = identity();
  const cid = 'bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy';
  const marker = buildMarkerFields({ cid, contentType: 'application/octet-stream', ownerPublicKey: owner.publicKeyB64, now: Date.parse('2026-10-21T12:00:00.000Z') });
  const publisher = createPublisher({ name: 'marker-check.fxn', miner: { statusBase: 'http://127.0.0.1:9', pinBase: 'http://127.0.0.1:9', key: 'k' } });
  /* the host's call shape (scripts/publish-host.mjs: publisher.publish({ marker, record })): the signed marker rides in `marker` */
  await assert.rejects(publisher.publish({ marker: { ...marker, signature: stranger.sign(publicMarkerSigningMessage(marker)) } }),
    (error) => error.status === 403 && /public marker signature does not verify/.test(error.message));
  await assert.rejects(publisher.publish({ marker: { ...marker, signature: owner.sign(publicMarkerSigningMessage(marker)) } }),
    (error) => !/signature does not verify|verifyMarkerSignature is retired/.test(error.message), 'a genuine marker gets past the signature check');
});

test('publisher_never_posts_a_name_record', async () => {
  // In code (comments aside), no name-record route and no status-port call remain.
  const code = readFileSync(new URL('../scripts/lib/publisher.mjs', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(code, /name-record/, 'no /debug/name-record read or publish');
  assert.doesNotMatch(code, /bundle-deploy\/src\/name-record/, 'no names/* record builder');

  // A full prepare + publish against a miner that records every request it gets.
  const site = readProject();
  const archive = encodeSite(site);
  const seen = [];
  const miner = http.createServer((req, res) => {
    seen.push(`${req.method} ${req.url}`);
    if (req.url.startsWith('/api/v0/add')) { req.resume(); req.on('end', () => { res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"cid":"bafy-release"}'); }); return; }
    if (req.url.startsWith('/api/v0/cat')) { res.writeHead(200); res.end(Buffer.from(archive)); return; }
    if (req.url.startsWith('/api/v0/public-marker')) { req.resume(); req.on('end', () => { res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"ok":true}'); }); return; }
    res.writeHead(404); res.end('{}');
  });
  await new Promise((resolve) => miner.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${miner.address().port}`;
  // dense-wire stand-in: the name node holds no owner for the name (DOM_NONE)
  const asked = [];
  class WireClient { constructor(url) { this.url = url; this.ready = Promise.resolve(); } async domProof(fqdn) { asked.push(fqdn); return { kind: 'none', fqdn }; } close() {} }
  const owner = identity();
  try {
    const publisher = createPublisher({ name: 'defxn.fxn', miner: { statusBase: base, pinBase: base, key: 'k' }, genesisPubHex: 'a'.repeat(64), dense: { WireClient, verifyDomainProof: async () => ({ kind: 'refused' }), builders: {} } });
    const prepared = await publisher.prepare(site, owner.publicKeyB64);
    assert.equal(prepared.cid, 'bafy-release');
    assert.equal(prepared.record, undefined, 'no names/* record is drafted');
    assert.equal(prepared.binding.kind, 'KDOMREC2');
    const result = await publisher.publish({ marker: { ...prepared.marker, signature: owner.sign(new TextEncoder().encode(prepared.markerSigningMessage)) } });
    assert.deepEqual([result.released, result.named, result.cid], [true, false, 'bafy-release']);
    assert.deepEqual(asked, ['defxn.fxn'], 'the name is read from dense-wire only');
    assert.ok(seen.every((line) => line.includes('/api/v0/')), `only the pin API was called: ${seen.join(', ')}`);
    assert.ok(!seen.some((line) => /name-record/.test(line)));
    await assert.rejects(publisher.authorize(owner.publicKeyB64), (e) => e.status === 403 && /no owner on the dense-wire chain/.test(e.message), 'no first-come claim through the publisher');
  } finally {
    miner.close();
  }
});

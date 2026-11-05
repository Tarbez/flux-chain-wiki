/* A <label>.defxn.com page reads the chain through the gateway's chain read relay, never the node (owner decision
   2026-11-05): a name's DOM_PROOF for every page, the bundle chain's RESOLVER_RECORDS for /_release/. The relay
   carries the node's reply unchanged and is trusted for nothing, so every case is a way the relay could mislead a
   visitor, and what the page must do instead:
     - a genuine proof carried by the relay resolves, verified here with the one shared verifier;
     - a tampered proof is refused by name (PROOF_INVALID), and the refusal says what is missing and the fix;
     - a relay that is down or refuses is "cannot be read", naming the gateway and its answer;
     - a release read through the relay counts only when its record hashes to its CID and the owner signed it; a
       tampered record or a forged release is RELEASE_PROOF_INVALID, never "nothing published";
     - the shell never opens the node: its CSP connects to 'self' only and its code names no node URL.
   The relay's server half, and the bytes the node receives from it, are tested in ark-miner-cli
   (ops/defxn-gateway-ask/chain-read-relay.test.mjs). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveName, askGatewayProof } from '../gateway/resolve-name.js';
import { relayWire } from '../gateway/chain-relay.js';
import { readRelease, releaseRequestOf } from '../gateway/release.js';
import { appReleaseSigningText, APP_RELEASE_SCHEMA, APP_BLOCK_BYTES } from '../gateway/vendor/bundle-deploy/app-release-core.js';
import { buildResolverRecordWithSigner, nameEnding } from '../gateway/vendor/dense-wire/flx-builders.mjs';
import { encodeRecordPayload } from '../gateway/vendor/dense-wire/flx-resolver-record-client.mjs';
import { sha256Hex } from '../gateway/vendor/dense-wire/flx-crypto.mjs';
import { signer, buildProof, tamper } from './lib/dense-wire-proof.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NETWORK = 'fxn-devnet';
const FQDN = 'site.fxndev';
const PATH = '/_chain/read';
const TARGETS = [{ type: 'blake3_cid', value: '6437b3ac38465133ffb63b75273a8db548c558465d79db03fd359c6cd5bd9d85' }];
const genesis = signer();
let proof;
test.before(async () => { proof = await buildProof({ fqdn: FQDN, genesis, targets: TARGETS }); });

const replyText = (entries) => entries.map((e) => `DOM_PROOF_LINE\t${e}\n`).join('') + `DOM_PROOF_END\t${FQDN}\t${entries.length}\n`;

/** A fake same-origin relay: answers `body` with `status`, and keeps every URL the page asked for. */
function relay(body, status = 200) {
  const asked = [];
  const fetchImpl = async (url, init) => { asked.push({ url, init }); return new Response(body, { status }); };
  return { asked, askProof: (fqdn) => askGatewayProof(fqdn, { path: PATH, fetchImpl }), wire: relayWire({ path: PATH, fetchImpl }) };
}
const resolve = (askProof) => resolveName({ name: FQDN, nodes: [], genesisPubHex: genesis.pubHex, network: NETWORK, nowSec: 1760000100, askProof });

test('a label page resolves a name through the gateway relay, and verifies the proof itself', async () => {
  const fake = relay(replyText(proof));
  const result = await resolve(fake.askProof);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.owner, genesis.pubHex);
  assert.deepEqual(result.record.targets, TARGETS);
  assert.equal(result.source, `gateway ${PATH}`);
  assert.deepEqual(fake.asked.map((a) => a.url), [`${PATH}?command=DOM_PROOF&arg=site.fxndev`], 'the page asks its own origin, by path');
  assert.equal(fake.asked[0].init.credentials, 'omit');
});

test('a tampered proof carried by the relay is refused by name, with what is missing and the fix', async () => {
  const bad = await resolve(relay(replyText([tamper(proof[0]), proof[1]])).askProof);
  assert.equal(bad.ok, false);
  assert.equal(bad.reason, 'PROOF_INVALID');
  assert.match(bad.detail, /does not verify.*Missing:.*To fix:/s);
  assert.equal('record' in bad, false, 'nothing a bad proof points at reaches the page');
  const forged = await resolve(relay(replyText(await buildProof({ fqdn: FQDN, genesis: signer(), targets: TARGETS }))).askProof);
  assert.equal(forged.reason, 'PROOF_INVALID');
  assert.match(forged.detail, /not by the pinned genesis key/);
});

test('a relay that refuses, is down, or sends a reply that is not a proof is named, and nothing renders', async () => {
  const refused = await resolve(relay('No name node answered for site.fxndev. To fix: ...', 502).askProof);
  assert.equal(refused.reason, 'NAME_UNRESOLVABLE');
  assert.match(refused.detail, /gateway \/_chain\/read: the gateway answered DOM_PROOF with 502: No name node answered/);
  const down = await resolve((fqdn) => askGatewayProof(fqdn, { path: PATH, fetchImpl: async () => { throw new Error('Failed to fetch'); } }));
  assert.match(down.detail, /gateway \/_chain\/read: Failed to fetch/);
  const garbled = await resolve(relay('hello\n').askProof);
  assert.equal(garbled.reason, 'NAME_UNRESOLVABLE');
  assert.match(garbled.detail, /not a proof/);
  const none = await resolve(relay(`DOM_NONE\t${FQDN}\n`).askProof);
  assert.equal(none.reason, 'NAME_NOT_FOUND');
});

test('the shell never opens the node: its CSP connects to its own origin only, and its code names no node', () => {
  const html = fs.readFileSync(path.join(ROOT, 'gateway', 'index.html'), 'utf8');
  const connect = /connect-src ([^;]*);/.exec(html)?.[1];
  assert.equal(connect, "'self'");
  const app = fs.readFileSync(path.join(ROOT, 'gateway', 'app.js'), 'utf8');
  assert.doesNotMatch(app, /\bNAME_NODES\b|wss?:\/\//, 'app.js reads names through the relay only');
  assert.match(app, /askGatewayProof\(fqdn, \{ path: CHAIN_READ_PATH \}\)/);
  const release = fs.readFileSync(path.join(ROOT, 'gateway', 'release.js'), 'utf8');
  assert.doesNotMatch(release, /\bNAME_NODES\b|new WireClient|wss?:\/\//, 'release.js reads the bundle chain through the relay only');
  assert.match(release, /wire = relayWire\(\{ path: CHAIN_READ_PATH \}\)/);
});

/* --- /_release/ through the relay ----------------------------------------------------------------------------- */

const RELEASE_NAME = FQDN; // site.fxndev: a release counts under the ending its network serves (fxn-devnet: .fxndev)
const want = releaseRequestOf('/_release/ark-browser');
const b64 = (hex) => Buffer.from(hex, 'hex').toString('base64');

/** A real KBUNDLE1 row: a release signed by `owner` (or by `signedBy`, to forge one), carried by `carrier`. */
async function releaseRow({ owner, signedBy = owner, carrier = owner, sequence = 1 }) {
  const value = {
    schema: APP_RELEASE_SCHEMA, name: RELEASE_NAME, product: want.product, channel: want.channel, version: '1.0.0', sequence,
    platform: want.platform, arch: want.arch, filename: 'FXN Browser.dmg', size: 100, sha256: 'c'.repeat(64),
    blockBytes: APP_BLOCK_BYTES, blocks: ['d'.repeat(64)], publishedAt: '2026-11-05T00:00:00.000Z', ownerPublicKey: b64(owner.pubHex),
  };
  value.signature = b64(await signedBy.signText(appReleaseSigningText(value)));
  const text = await buildResolverRecordWithSigner({ signer: carrier, pos: sequence, prevCid: '0'.repeat(64), resolverChainId: 'bundle', kindMarker: 'KBUNDLE1', inlinePayload: encodeRecordPayload(value), nowSec: 1760000000 + sequence });
  return { cid: await sha256Hex(text), text };
}
const recordsReply = (rows) => `RESOLVER_RECORDS\tbundle\t${rows.length}\n` + rows.map((r) => `RECORD\t${r.cid}\t${r.text}\n`).join('') + 'RESOLVER_RECORDS_END\n';

test('a release resolves through the relay: the bundle chain is read by its one line and the owner-signed release counts', async () => {
  const owner = signer();
  const fake = relay(recordsReply([await releaseRow({ owner })]));
  const read = await readRelease({ name: RELEASE_NAME, ownerHex: owner.pubHex, want, wire: fake.wire, ending: nameEnding(NETWORK) });
  assert.equal(read.ok, true, JSON.stringify(read));
  assert.equal(read.release.sha256, 'c'.repeat(64));
  assert.deepEqual(read.release.blocks, ['d'.repeat(64)]);
  assert.deepEqual(fake.asked.map((a) => a.url), [`${PATH}?command=RESOLVER_RECORDS&arg=bundle`]);
  assert.equal(fake.asked[0].init.credentials, 'omit');
});

test('a tampered release record, or a release the owner did not sign, is refused by name', async () => {
  const owner = signer();
  const row = await releaseRow({ owner });
  const bent = { cid: row.cid, text: row.text.replace(/-M(\d+)-/, (_, m) => `-M${Number(m) + 1}-`) };
  const tampered = await readRelease({ name: RELEASE_NAME, ownerHex: owner.pubHex, want, wire: relay(recordsReply([bent])).wire });
  assert.equal(tampered.reason, 'RELEASE_PROOF_INVALID');
  assert.match(tampered.detail, /RRC_READBACK_MISMATCH.*does not hash to that cid/s);
  assert.equal('release' in tampered, false);
  const forged = await readRelease({ name: RELEASE_NAME, ownerHex: owner.pubHex, want, wire: relay(recordsReply([await releaseRow({ owner, signedBy: signer() })])).wire });
  assert.equal(forged.reason, 'RELEASE_PROOF_INVALID');
  assert.match(forged.detail, /signature does not verify.*Missing:.*To fix:/s);
  const stranger = signer();
  const notOwner = await readRelease({ name: RELEASE_NAME, ownerHex: owner.pubHex, want, wire: relay(recordsReply([await releaseRow({ owner: stranger })])).wire });
  assert.equal(notOwner.reason, 'RELEASE_PROOF_INVALID');
  assert.match(notOwner.detail, /does not own site\.fxndev/);
});

test('the gateway reads releases under its own network\'s ending: a .fxndev release does not count for a mainnet gateway', async () => {
  const owner = signer();
  const rows = recordsReply([await releaseRow({ owner })]);
  const devnet = await readRelease({ name: RELEASE_NAME, ownerHex: owner.pubHex, want, wire: relay(rows).wire });
  assert.equal(devnet.ok, true, `the default is name-config.js NETWORK (fxn-devnet): ${JSON.stringify(devnet)}`);
  const mainnet = await readRelease({ name: RELEASE_NAME, ownerHex: owner.pubHex, want, wire: relay(rows).wire, ending: nameEnding('fxn-mainnet') });
  assert.equal(mainnet.reason, 'RELEASE_PROOF_INVALID');
  assert.match(mainnet.detail, /not under \.fxn, the one ending this network serves/);
});

test('a relay that refuses the release read is named, and an empty chain is "nothing published"', async () => {
  const owner = signer();
  const down = await readRelease({ name: RELEASE_NAME, ownerHex: owner.pubHex, want, wire: relay('No name node answered RESOLVER_RECORDS for bundle. To fix: ...', 502).wire });
  assert.equal(down.reason, 'NAME_UNRESOLVABLE');
  assert.match(down.detail, /the gateway answered RESOLVER_RECORDS with 502/);
  const none = await readRelease({ name: RELEASE_NAME, ownerHex: owner.pubHex, want, wire: relay(recordsReply([])).wire });
  assert.equal(none.reason, 'RELEASE_NONE');
});

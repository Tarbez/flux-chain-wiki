/* A <label>.defxn.com page reads a name through the gateway's name proof relay, never the node (owner decision
   2026-11-05). The relay carries the node's DOM_PROOF reply unchanged and is trusted for nothing, so every case is a
   way the relay could mislead a visitor, and what the page must do instead:
     - a genuine proof carried by the relay resolves, verified here with the one shared verifier;
     - a tampered proof is refused by name (PROOF_INVALID), and the refusal says what is missing and the fix;
     - a relay that is down or refuses is "cannot be read", naming the gateway and its answer;
     - the shell never opens the node: its CSP connects to 'self' only and its code names no node URL.
   The relay's server half, and the bytes the node receives from it, are tested in ark-miner-cli
   (ops/defxn-gateway-ask/name-proof-relay.test.mjs). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveName, askGatewayProof } from '../gateway/resolve-name.js';
import { signer, buildProof, tamper } from './lib/dense-wire-proof.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NETWORK = 'fxn-devnet';
const FQDN = 'site.fxndev';
const PATH = '/_names/proof';
const TARGETS = [{ type: 'blake3_cid', value: '6437b3ac38465133ffb63b75273a8db548c558465d79db03fd359c6cd5bd9d85' }];
const genesis = signer();
let proof;
test.before(async () => { proof = await buildProof({ fqdn: FQDN, genesis, targets: TARGETS }); });

const replyText = (entries) => entries.map((e) => `DOM_PROOF_LINE\t${e}\n`).join('') + `DOM_PROOF_END\t${FQDN}\t${entries.length}\n`;

/** A fake same-origin relay: answers `body` with `status`, and keeps every URL the page asked for. */
function relay(body, status = 200) {
  const asked = [];
  const fetchImpl = async (url, init) => { asked.push({ url, init }); return new Response(body, { status }); };
  return { asked, askProof: (fqdn) => askGatewayProof(fqdn, { path: PATH, fetchImpl }) };
}
const resolve = (askProof) => resolveName({ name: FQDN, nodes: [], genesisPubHex: genesis.pubHex, network: NETWORK, nowSec: 1760000100, askProof });

test('a label page resolves a name through the gateway relay, and verifies the proof itself', async () => {
  const fake = relay(replyText(proof));
  const result = await resolve(fake.askProof);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.owner, genesis.pubHex);
  assert.deepEqual(result.record.targets, TARGETS);
  assert.equal(result.source, `gateway ${PATH}`);
  assert.deepEqual(fake.asked.map((a) => a.url), [`${PATH}?name=site.fxndev`], 'the page asks its own origin, by path');
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
  assert.match(refused.detail, /gateway \/_names\/proof: 502 No name node answered/);
  const down = await resolve((fqdn) => askGatewayProof(fqdn, { path: PATH, fetchImpl: async () => { throw new Error('Failed to fetch'); } }));
  assert.match(down.detail, /gateway \/_names\/proof: Failed to fetch/);
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
  assert.match(app, /askGatewayProof\(fqdn, \{ path: NAME_PROOF_PATH \}\)/);
});

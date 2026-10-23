/* The *.defxn.com gateway shell reads a name from dense-wire and nothing else. Each case is a
   way a node or the deployment could mislead a visitor, and what the page must show instead:
   a verified proof renders its ipfs_cid target; "no such name" names the remedy (claim it);
   a bad proof is refused by name and never rendered; no genesis key pinned renders nothing. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveName, askDomainProof } from '../gateway/resolve-name.js';
import { signer, buildProof, answers, tamper } from './lib/dense-wire-proof.mjs';

const FQDN = 'site.fxn';
const TARGETS = [{ type: 'ipfs_cid', value: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi' }];
const genesis = signer();
let proof;
test.before(async () => { proof = await buildProof({ fqdn: FQDN, genesis, targets: TARGETS }); });
const resolve = (askProof, extra = {}) => resolveName({ name: FQDN, nodes: ['ws://node-a'], genesisPubHex: genesis.pubHex, askProof, ...extra });

test('a verified proof resolves to its record, with the owner and node named', async () => {
  const result = await resolve(answers.proof(proof));
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.owner, genesis.pubHex);
  assert.deepEqual(result.record.targets, TARGETS);
  assert.equal(result.source, 'ws://node-a');
  assert.ok(result.notChecked.some((item) => item.startsWith('freshness')));
});

test('a name the chain does not hold is "no such name", and the detail is the remedy', async () => {
  const result = await resolve(answers.none());
  assert.deepEqual([result.ok, result.reason], [false, 'NAME_NOT_FOUND']);
  assert.match(result.detail, /holds no owner for site\.fxn\. Claim it at https:\/\/domains\.defxn\.com/);
});

test('a tampered proof, or a claim by a key that is not the pinned genesis key, is refused by name', async () => {
  const bad = await resolve(answers.proof([tamper(proof[0]), proof[1]]));
  assert.equal(bad.reason, 'PROOF_INVALID');
  assert.match(bad.detail, /does not verify.*Missing:.*To fix:/s);
  assert.equal('record' in bad, false);
  const forged = await resolve(answers.proof(await buildProof({ fqdn: FQDN, genesis: signer(), targets: TARGETS })));
  assert.equal(forged.reason, 'PROOF_INVALID');
  assert.match(forged.detail, /not by the pinned genesis key/);
});

test('with no genesis key pinned the gateway says so and resolves nothing', async () => {
  const result = await resolve(answers.proof(proof), { genesisPubHex: '' });
  assert.equal(result.reason, 'GATEWAY_NOT_CONFIGURED');
  assert.match(result.detail, /GENESIS_PUB_HEX/);
});

test('no node answering, a non-flat name, and an owned name without a record are each named', async () => {
  assert.equal((await resolve(answers.silent())).reason, 'NAME_UNRESOLVABLE');
  assert.equal((await resolveName({ name: 'a.b.fxn', nodes: [], genesisPubHex: genesis.pubHex, askProof: answers.none() })).reason, 'NAME_NOT_FOUND');
  const bare = await resolve(answers.proof(await buildProof({ fqdn: FQDN, genesis })));
  assert.equal(bare.ok, true);
  assert.equal(bare.record, null);
});

test('askDomainProof asks nodes in order; the first answer wins and silent nodes are named', async () => {
  const wireClient = (url) => ({
    ready: url.includes('down') ? Promise.reject(new Error('refused')) : Promise.resolve(),
    async domProof(fqdn) { return { kind: 'none', fqdn }; },
    close() {},
  });
  const asked = await askDomainProof({ nodes: ['ws://down', 'ws://up'], fqdn: FQDN, wireClient });
  assert.equal(asked.node, 'ws://up');
  assert.deepEqual(asked.failures, ['ws://down: refused']);
});

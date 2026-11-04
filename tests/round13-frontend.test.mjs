// Round 13 (frontend lane). Why this test exists: the round-12 verifier found the signing guard's class open at doors
// the round-12 fix never touched, all on defxn.com. Its probe (r12probe/sendfxn-probe.mjs) against /account's FXN
// send: (a) on HEAD_ERR the page signed a transfer at -J0, a position the key already holds, which freezes the key;
// (b) after a refused send, a retry signed a second, different record at the same position; (c) BUILD_INFO was never
// asked. The skin doors (chain-cards.mjs) had the same shape with a raw RESOLVER_RECORD sendLine. Every door now goes
// through flx-signing-guard.mjs, and the one door scan (flx-signing-doors.mjs) walks js/ and gateway/ for any other.
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
globalThis.window = { ArkUI: { authorizationDialog: { confirm: async () => true } }, ArkAuthorizationView: { scopedAuthorizationView: (v) => v } };
const { sendFxn } = await import('../js/ark/dense-wire-wallet.mjs');
const { mintSkin } = await import('../js/ark/chain-cards.mjs');
const guard = await import('../js/dense-wire/flx-signing-guard.mjs');
const { signingDoorVerdict, recordMethodsOf } = await import('../js/dense-wire/flx-signing-doors.mjs');

beforeEach(() => { const m = new Map(); guard.useHoldStore({ get: (k) => m.get(k) ?? null, set: (k, v) => { m.set(k, v); }, delete: (k) => { m.delete(k); } }); });

const PUB = 'a'.repeat(64), TO = 'b'.repeat(64);
const signer = { pubHex: PUB, signText: async () => 'c'.repeat(128), signBytes: async () => 'c'.repeat(128) };
const BUILD = 'BUILD_INFO\tv\tclean\tnow\tfxn-devnet';
/** A WalletWire-shaped node: `head` is its HEAD answer, `reply(line)` its answer to a sent record. */
function node(url, head, reply, sent = []) {
  return { url, sent, chainHead: async () => head, sendLine: async (l) => { if (l.startsWith('BUILD_INFO')) return BUILD; sent.push(l); return reply(l); } };
}

test('round 13: sendFxn on HEAD_ERR signs nothing (was: a transfer at -J0)', async () => {
  const wire = node('wss://a/ws', { kind: 'error', raw: 'HEAD_ERR\tBusy\tx' }, () => 'NATIVE_SEND_OK\t' + 'd'.repeat(64) + '\t0');
  wire.witnesses = [node('wss://b/ws', { kind: 'error', raw: 'HEAD_ERR\tBusy\tx' }, () => '')];
  await assert.rejects(sendFxn({ who: {}, wire, amount: 5n, recipient: TO, signer }), (e) => e.code === 'POSITION_UNREADABLE');
  assert.deepEqual(wire.sent, []);
});

test('round 13: after a refused send, a retry never signs a second record at the same position', async () => {
  const head = { kind: 'head', length: 5, headCid: 'e'.repeat(64) };
  const wire = node('wss://a/ws', head, () => 'NATIVE_SEND_ERR\tInsufficientBalance\tFXN\tadd FXN');
  wire.witnesses = [node('wss://b/ws', head, () => '')];
  const first = await sendFxn({ who: {}, wire, amount: 5n, recipient: TO, signer });
  assert.equal(first.kind, 'refused');
  await new Promise((r) => setTimeout(r, 1100)); // a new M, as the probe's retry had
  await assert.rejects(sendFxn({ who: {}, wire, amount: 5n, recipient: TO, signer }), (e) => e.code === 'HELD_OTHER_RECORD');
  assert.equal(wire.sent.length, 1, 'one record left the page at position 5');
});

test('round 13: sendFxn checks the network and a second node before signing', async () => {
  const head = { kind: 'head', length: 5, headCid: 'e'.repeat(64) };
  const lone = node('wss://a/ws', head, () => '');
  lone.witnesses = []; // round 14: fxn-devnet now has witnesses (its seats); this node's page names none
  await assert.rejects(sendFxn({ who: {}, wire: lone, amount: 5n, recipient: TO, signer }), (e) => e.code === 'WITNESS_MISSING');
  const liar = node('wss://a/ws', head, () => '');
  liar.witnesses = [node('wss://b/ws', { kind: 'head', length: 6, headCid: 'f'.repeat(64) }, () => '')];
  await assert.rejects(sendFxn({ who: {}, wire: liar, amount: 5n, recipient: TO, signer }), (e) => e.code === 'HEAD_DISAGREES');
  const ok = node('wss://a/ws', head, async (l) => `NATIVE_SEND_OK\t${await (await import('../js/dense-wire/flx-crypto.mjs')).sha256Hex(l.slice('NATIVE_SEND\t'.length))}\t0`);
  ok.witnesses = [node('wss://b/ws', head, () => '')];
  const reply = await sendFxn({ who: {}, wire: ok, amount: 5n, recipient: TO, signer });
  assert.equal(reply.kind, 'ok');
  assert.match(ok.sent[0], /-J5-/);
});

test('round 13: a skin mint on HEAD_ERR is refused by the guard and sends nothing', async () => {
  const wire = node('wss://a/ws', { kind: 'error', raw: 'HEAD_ERR\tBusy\tx' }, () => 'OK\t' + 'd'.repeat(64));
  wire.witnesses = [node('wss://b/ws', { kind: 'none' }, () => '')];
  const who = { publicKeyB64: Buffer.from(PUB, 'hex').toString('base64'), sign: async () => Buffer.alloc(64).toString('base64') };
  const out = await mintSkin({ who, wire, pointer: 'df51' + '0'.repeat(60) }).catch((e) => e);
  assert.equal(out.kind, 'refused');
  assert.equal(out.code, 'POSITION_UNREADABLE');
  assert.deepEqual(wire.sent, []);
});

/** Lines that send outside the guard and carry no record signed here, each with why. */
const READS = new Map([
  ['js/ark/chain-cards.mjs:112', 'read: readObjectsOf asks OBJS_OF and OBJ_PROOF through the wallet wire'],
  ['js/ark/dense-wire-wallet.mjs:208', 'transport: WalletWire.sendLine, the line sender the guard itself uses'],
  ['js/ark/dense-wire-wallet.mjs:211', 'transport: WalletWire.submit, what submitAtPosition calls'],
  ['js/pages/account.js:1464', 'sends a KWALLET1 signed when the wallet was made, byte for byte: nothing is signed here, so no second record at its position comes from this door'],
  ['js/pages/account.js:1473', 'read: the publish step asks whether the chain already holds the link'],
]);

function walk(dir) {
  // js/min holds built copies of js/pages and js/ark (scanned as sources); js/dense-wire and gateway/vendor are the
  // vendored modules, scanned in dense-wire itself (its test/signing-doors.test.mjs).
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return ['min', 'dense-wire', 'vendor', 'node_modules'].includes(e.name) ? [] : walk(p);
    return /\.m?js$/.test(e.name) ? [p] : [];
  });
}

test('round 13: no page on defxn.com or its gateway sends a signed record outside the guard', () => {
  const methods = recordMethodsOf(fs.readFileSync(path.join(root, 'js/dense-wire/flx-wire.mjs'), 'utf8'));
  const files = [...walk(path.join(root, 'js')), ...walk(path.join(root, 'gateway'))].map((f) => ({ path: path.relative(root, f), text: fs.readFileSync(f, 'utf8') }));
  const { unguarded, stale } = signingDoorVerdict(files, READS, { methods });
  assert.deepEqual(unguarded.map((f) => `${f.at} ${f.why}`), []);
  assert.deepEqual(stale, [], 'a listed line no longer sends: update READS');
});

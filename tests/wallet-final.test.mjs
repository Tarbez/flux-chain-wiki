/* Round 14 (wallet-final, 2026-11-04). Why this test exists: /account printed "The payment is final." on ANY CONFIRMED
   answer (js/pages/account.js, the send handler), and the safe spend printed "Sent. The chain moved ..." on the node's
   first OK. On round 14 a one-lead devnet answers `CONFIRMED ... 1 1 not-final`, so every payment there read as final
   when the node said it was not. The page now shows the words of dense-wire flx-payment-status.mjs (the one rule
   every wallet reads) for the node's own answer.

   This locks shipped node behaviour (chain_server.rs confirmed_reply, reply_ok.rs): each raw reply line goes through
   WalletWire, the vendored WireClient reader and watchSendConfirmed, and the words the page shows are checked. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dw = await import('../js/ark/dense-wire-wallet.mjs');
const { WireClient } = await import('../js/dense-wire/flx-wire.mjs');
const { sha256Hex } = await import('../js/dense-wire/flx-crypto.mjs');

const HOLDER = 'a'.repeat(64), CID = 'c'.repeat(64), OTHER = 'e'.repeat(64);

/** A WalletWire whose node answers each CONFIRMED ask with the next of `lines` (the last repeats). */
function walletAnswering(...lines) {
  const wire = new dw.WalletWire('wss://node.test/ws');
  const client = Object.create(WireClient.prototype);
  client.asked = [];
  client._send = async (line) => { client.asked.push(line); return lines[Math.min(client.asked.length - 1, lines.length - 1)]; };
  client.close = () => {};
  wire.client = client;
  return { wire, client };
}

const sent = { kind: 'ok', cid: CID, holder: HOLDER, position: 3, senderBalance: 5n };
async function shown(...lines) {
  const { wire, client } = walletAnswering(...lines);
  const status = await dw.watchSendConfirmed(wire, sent, { everyMs: 1, timeoutMs: 30 });
  return { words: dw.describePaymentStatus(status), tone: dw.paymentTone(status), asked: client.asked };
}

test('the node answers final: the page says final, with the count', async () => {
  const got = await shown(`CONFIRMED\t${HOLDER}\tdefxn\t3\t12\t3\t4\tfinal\n`);
  assert.equal(got.words, 'Final. 3 of 4 leads certified it.');
  assert.equal(got.tone, 'trust');
  assert.deepEqual(got.asked, [`CONFIRMED\t${HOLDER}\t-\t3\t${CID}`], 'asked for this exact record on the base list');
});

test('the node answers not-final on a one-lead chain: confirmed, not final yet (1 of 3 leads)', async () => {
  const got = await shown(`CONFIRMED\t${HOLDER}\tdefxn\t3\t12\t1\t1\tnot-final\n`);
  assert.equal(got.words, 'Confirmed, not final yet (1 of 3 leads). A payment is final once 3 or more leads certify it.');
  assert.equal(got.tone, 'drift');
});

test('a CONFIRMED with no final word is never shown as final, whatever its count', async () => {
  const got = await shown(`CONFIRMED\t${HOLDER}\tdefxn\t3\t12\t3\t4\n`);
  assert.equal(got.words, 'Confirmed, not final yet. This node does not say whether it is final.');
  assert.equal(got.tone, 'drift');
});

test('WAITING until the watch ends: accepted, not final, with the count', async () => {
  const got = await shown(`WAITING\t${HOLDER}\tdefxn\t3\t1\t1\n`);
  assert.equal(got.words, 'Accepted, not final. Waiting for 1 of 1 leads to certify it.');
  assert.ok(got.asked.length >= 2, 'the page asked again');
});

test('WAITING, then CONFIRMED not-final: the watch ends on the node\'s answer', async () => {
  const got = await shown(`WAITING\t${HOLDER}\tdefxn\t3\t1\t1\n`, `CONFIRMED\t${HOLDER}\tdefxn\t3\t12\t1\t1\tnot-final\n`);
  assert.match(got.words, /^Confirmed, not final yet \(1 of 3 leads\)\./);
  assert.equal(got.asked.length, 2);
});

test('CONFLICT: never final', async () => {
  const got = await shown(`CONFLICT\t${HOLDER}\tdefxn\t3\t${OTHER}\n`);
  assert.match(got.words, /^Never final:/);
  assert.equal(got.tone, 'danger');
});

test('the node\'s first OK reads accepted, not final, with the balance', () => {
  assert.equal(dw.describeSendReply(sent, (n) => `${n} FXN`), 'Accepted, not final. The chain\'s leads have not certified it yet. Your balance is now 5 FXN.');
});

test('a reply that carries its signed record is asked about by that record\'s sha256 and place', async () => {
  const record = `G${HOLDER}-J7-KKDAOSAFESEND1-M1`;
  const { wire, client } = walletAnswering(`CONFIRMED\t${HOLDER}\tdefxn\t7\t12\t1\t1\tnot-final\n`);
  await dw.watchSendConfirmed(wire, { cid: 'ignored', record }, { everyMs: 1, timeoutMs: 30 });
  assert.deepEqual(client.asked, [`CONFIRMED\t${HOLDER}\t-\t7\t${await sha256Hex(record)}`]);
});

test('the account page decides no payment words itself: send and safe spend show the rule\'s words', () => {
  for (const file of ['js/pages/account.js', 'js/min/pages/account.js']) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    assert.doesNotMatch(text, /The payment is final|The chain moved/, `${file} still says final or moved on its own`);
    assert.ok((text.match(/describePaymentStatus\(/g) || []).length >= 3, `${file} shows the rule's words for the send and the spend`);
  }
  const holdings = fs.readFileSync(path.join(root, 'js/ark/fxn-holdings.mjs'), 'utf8');
  assert.match(holdings, /return \{ cid: reply\.cid, record: reply\.record \};/, 'submitSpend hands back the signed record to ask about');
});

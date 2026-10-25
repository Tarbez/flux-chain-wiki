/* Why this exists: the PVA and skin verifier has ONE home, dense-wire/web/flx-object-proof.mjs (the object chains,
   dense-wire/src/objects.rs). The site copies it to js/dense-wire/. This test keeps the copy a copy, and checks
   js/ark/chain-cards.mjs against the vectors the Rust side printed (web/test/fixtures/object-vectors.tsv): an honest
   node shows each key its own objects, and a node that lists another key's skin is refused by name. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { identityKeyHex, readChainCards } from '../js/ark/chain-cards.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VENDOR = path.join(ROOT, 'js', 'dense-wire');

// The source until branch pva-chain merges: DENSE_WIRE_WEB, then the main checkout, then the pva-chain worktree.
function sourceDir() {
  return [process.env.DENSE_WIRE_WEB, path.resolve(ROOT, '..', 'defxn-defi-rs', 'dense-wire', 'web'), path.resolve(ROOT, '..', 'defxn-defi-rs-wt-pva', 'dense-wire', 'web')]
    .filter(Boolean).find((dir) => fs.existsSync(path.join(dir, 'flx-object-proof.mjs'))) || null;
}

test('js/dense-wire/flx-object-proof.mjs, flx-object-builders.mjs and flx-crypto.mjs are byte-identical to their source', () => {
  const source = sourceDir();
  assert.ok(source, 'no dense-wire/web with flx-object-proof.mjs was found. Missing: flux/defxn-defi-rs (branch pva-chain) beside this repo, or DENSE_WIRE_WEB. To fix: check it out, or set DENSE_WIRE_WEB.');
  for (const file of ['flx-object-proof.mjs', 'flx-object-builders.mjs', 'flx-crypto.mjs']) {
    assert.ok(fs.readFileSync(path.join(VENDOR, file)).equals(fs.readFileSync(path.join(source, file))), `${file} has drifted from ${path.join(source, file)}. To fix: copy the source file over the vendored one (never edit the copy).`);
  }
});

test('readChainCards shows each key its own verified objects and refuses a listing that lies', async () => {
  const source = sourceDir();
  assert.ok(source, 'no dense-wire/web source; see the test above');
  const rows = fs.readFileSync(path.join(source, 'test', 'fixtures', 'object-vectors.tsv'), 'utf8').trim().split('\n').map((l) => l.split('\t'));
  const text = (hex) => Buffer.from(hex, 'hex').toString('utf8');
  const proofs = new Map(rows.filter((r) => r[0] === 'proof' && ['pva', 'skin_traded'].includes(r[1])).map((r) => [r[2], text(r[3])]));
  const lists = new Map(rows.filter((r) => r[0] === 'objs').map(([, key, hex]) => [key, text(hex)]));
  const [aKey, bKey] = [...lists.keys()];
  const node = (listing) => () => ({ ready: Promise.resolve(), close() {}, send: async (line) => {
    const [head, arg] = line.split('\t');
    return head === 'OBJS_OF' ? listing(arg) : proofs.get(arg) ?? `OBJ_NONE\t${arg}\n`;
  } });
  const honest = node((key) => lists.get(key));

  const a = await readChainCards({ url: 'ws://test', key: aKey, wireClient: honest });
  assert.deepEqual([a.kind, a.pva && a.pva.owner, a.skins.length, a.refused], ['cards', aKey, 0, []]);
  assert.ok(a.notChecked.includes('earn'), 'the earn is named as not checked here');
  const b = await readChainCards({ url: 'ws://test', key: bKey, wireClient: honest });
  assert.deepEqual([b.pva, b.skins.map((s) => s.owner)], [null, [bKey]]);

  const skinId = [...proofs.keys()].find((id) => !lists.get(aKey).includes(id));
  const liar = node((key) => key === aKey ? lists.get(aKey).replace(/OBJS_END\t(\w+)\t1/, `OBJ\tskin\t${skinId}\nOBJS_END\t$1\t2`) : lists.get(key));
  const lied = await readChainCards({ url: 'ws://test', key: aKey, wireClient: liar });
  assert.deepEqual([lied.skins.length, lied.refused.map((r) => r.code)], [0, ['NotTheKeys']]);

  const down = await readChainCards({ url: 'ws://down', key: aKey, wireClient: () => ({ ready: Promise.reject(new Error('refused')), close() {} }) });
  assert.equal(down.kind, 'unreachable');
  assert.equal((await readChainCards({ url: 'ws://test', key: 'nope' })).kind, 'error');
  assert.equal(identityKeyHex({ publicKeyB64: Buffer.from(aKey, 'hex').toString('base64') }), aKey);
  assert.equal(identityKeyHex(null), null);
});

test('mintSkin shows the full signing review, signs only the bytes approved, and sends one skin mint', async () => {
  const { generateKeyPairSync, sign } = await import('node:crypto');
  const { mintSkin } = await import('../js/ark/chain-cards.mjs');
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const raw = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);
  const who = { publicKeyB64: raw.toString('base64'), sign: async (text) => sign(null, Buffer.from(text), privateKey).toString('base64'), signBytes: async () => '' };
  const pointer = 'df51' + 'e196847c' + '0'.repeat(51) + '1';
  const sent = [];
  const wire = { url: 'ws://test', chainHead: async () => ({ kind: 'none' }), sendLine: async (line) => { sent.push(line); return `OK\t${'0'.repeat(64)}`; } };

  // no review loaded: nothing is signed
  globalThis.window = {};
  await assert.rejects(mintSkin({ who, wire, pointer }), /signing review did not load/);
  assert.equal(sent.length, 0);

  // the review is shown, says what it may and may not do, and the holder says no
  const shown = [];
  globalThis.window = { ArkUI: { authorizationDialog: { confirm: async (view) => { shown.push(view); return false; } } }, ArkAuthorizationView: { scopedAuthorizationView: (v) => v } };
  await assert.rejects(mintSkin({ who, wire, pointer }), /cancelled/);
  assert.equal(sent.length, 0);
  assert.equal(shown[0].action, 'object.mint');
  assert.match(shown[0].claimStack, /does not authorize a move of your PVA/);
  assert.match(shown[0].authorizationBytes, new RegExp(`-Nskin-KKASSET1-J0-C${'0'.repeat(64)}-C${pointer}$`));

  // yes: the approved bytes are signed and sent, and the skin is read back
  window.ArkUI.authorizationDialog.confirm = async () => true;
  const res = await mintSkin({ who, wire, pointer, readBack: async () => ({ kind: 'objects', objects: [] }) });
  assert.equal(sent.length, 1);
  assert.match(sent[0], new RegExp(`^RESOLVER_RECORD\\tG${raw.toString('hex')}-YLEDGERENTRY-V1-M\\d+-H[0-9a-f]+-Nskin-KKASSET1-J0-C0{64}-C${pointer}-S[0-9a-f]{128}$`));
  assert.equal(res.kind, 'refused', 'a skin that does not verify yet is not reported as minted');
  assert.match(res.remedy, /reload/);
  assert.equal((await mintSkin({ who, wire, pointer: 'ab'.repeat(32) })).kind, 'refused', 'a hash is not a skin pointer');
  delete globalThis.window;
});

test('a skin trade: the taker accepts, the owner gives, and each wrong step is refused by name', async () => {
  const { generateKeyPairSync, sign, createHash } = await import('node:crypto');
  const { acceptSkin, giveSkin } = await import('../js/ark/chain-cards.mjs');
  const B = await import('../js/dense-wire/flx-object-builders.mjs');
  const sha = (t) => createHash('sha256').update(t).digest('hex');
  const party = () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const raw = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);
    const sig = (text) => sign(null, Buffer.from(text), privateKey);
    return { pubHex: raw.toString('hex'), signText: async (t) => sig(t).toString('hex'),
      who: { publicKeyB64: raw.toString('base64'), sign: async (t) => sig(t).toString('base64'), signBytes: async () => '' } };
  };
  const a = party(), b = party(), now = Math.floor(Date.now() / 1000);
  const pva = await B.buildPvaActivationWithSigner({ signer: a, pos: 0, prevCid: '0'.repeat(64), earnRef: sha('pay'), nowSec: now - 10 });
  const skin = await B.buildSkinMintWithSigner({ signer: a, pos: 1, prevCid: sha(pva), skinPointer: 'df51e196847c' + '0'.repeat(51) + '1', nowSec: now - 5 });
  const id = sha(skin);
  // a small node: it keeps the records, answers the four reads the trade uses, and admits what it is sent
  const held = new Map([[sha(pva), pva], [id, skin]]), chain = [skin], heads = new Map();
  const node = { url: 'ws://test', chainHead: async (k) => heads.has(k) ? { kind: 'head', length: heads.get(k)[0], headCid: heads.get(k)[1] } : { kind: 'none' },
    sendLine: async (line) => {
      const [head, arg] = line.split('\t');
      if (head === 'OBJ_PROOF') return chain.map((t) => `OBJ_PROOF_LINE\t${t}\n`).join('') + `OBJ_PROOF_PVA\t${pva}\nOBJ_PROOF_END\t${id}\t${chain.length}\n`;
      if (head === 'RESOLVER_RECORD_GET') return held.has(arg) ? `RESOLVER_RECORD_FOUND\tskin\t${held.get(arg)}\n` : 'RESOLVER_RECORD_MISS\n';
      if (head === 'SALE_OF') return `SALE_NONE\t${arg}\n`;
      if (head === 'RESOLVER_RECORD') {
        held.set(sha(arg), arg);
        if (/-KKSUPER1-/.test(arg)) chain.push(held.get(arg.split('-C')[3].slice(0, 64)), arg);
        const g = arg.slice(1, 65); heads.set(g, [(heads.get(g) || [0])[0] + 1, sha(arg)]);
        return `OK\t${sha(arg)}`;
      }
      return 'ERR\tunknown';
    } };
  globalThis.window = { ArkUI: { authorizationDialog: { confirm: async () => true } }, ArkAuthorizationView: { scopedAuthorizationView: (v) => v } };

  assert.match((await acceptSkin({ who: a.who, wire: node, id })).failure, /already own/, 'the owner cannot accept its own skin');
  const accepted = await acceptSkin({ who: b.who, wire: node, id });
  assert.deepEqual([accepted.kind, accepted.owner], ['accepted', a.pubHex]);
  assert.match((await giveSkin({ who: b.who, wire: node, id, edge: accepted.edge })).failure, /do not own/, 'only the owner gives');
  assert.match((await giveSkin({ who: a.who, wire: node, id, edge: 'ab'.repeat(32) })).failure, /no such consent/);
  const given = await giveSkin({ who: a.who, wire: node, id, edge: accepted.edge });
  assert.deepEqual([given.kind, given.to], ['given', b.pubHex]);
  assert.match((await giveSkin({ who: b.who, wire: node, id, edge: accepted.edge })).failure, /earlier state/, 'a consent is good for one head only');
  delete globalThis.window;
});

test('a priced skin sale: the taker pays into the sale, the owner is paid with the move, and an ended sale comes back', async () => {
  const { generateKeyPairSync, sign, createHash } = await import('node:crypto');
  const { acceptSkin, giveSkin, endSale } = await import('../js/ark/chain-cards.mjs');
  const B = await import('../js/dense-wire/flx-object-builders.mjs');
  const sha = (t) => createHash('sha256').update(t).digest('hex');
  const party = () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const raw = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);
    const sig = (text) => sign(null, Buffer.from(text), privateKey);
    return { pubHex: raw.toString('hex'), signText: async (t) => sig(t).toString('hex'),
      who: { publicKeyB64: raw.toString('base64'), sign: async (t) => sig(t).toString('base64'), signBytes: async () => '' } };
  };
  const a = party(), b = party(), now = Math.floor(Date.now() / 1000);
  const pva = await B.buildPvaActivationWithSigner({ signer: a, pos: 0, prevCid: '0'.repeat(64), earnRef: sha('pay'), nowSec: now - 10 });
  const skin = await B.buildSkinMintWithSigner({ signer: a, pos: 1, prevCid: sha(pva), skinPointer: 'df51e196847c' + '0'.repeat(51) + '1', nowSec: now - 5 });
  const id = sha(skin);
  // a small node with the sale rule's states: a sale is funded when taken, paid when the move adopts its consent
  const held = new Map([[sha(pva), pva], [id, skin]]), chain = [skin], heads = new Map(), sales = new Map();
  const node = { url: 'ws://test', chainHead: async (k) => heads.has(k) ? { kind: 'head', length: heads.get(k)[0], headCid: heads.get(k)[1] } : { kind: 'none' },
    sendLine: async (line) => {
      const [head, arg] = line.split('\t');
      if (head === 'OBJ_PROOF') return chain.map((t) => `OBJ_PROOF_LINE\t${t}\n`).join('') + `OBJ_PROOF_PVA\t${pva}\nOBJ_PROOF_END\t${id}\t${chain.length}\n`;
      if (head === 'RESOLVER_RECORD_GET') return held.has(arg) ? `RESOLVER_RECORD_FOUND\tskin\t${held.get(arg)}\n` : 'RESOLVER_RECORD_MISS\n';
      if (head === 'SALE_OF') { const s = sales.get(arg); return s ? `SALE\t${s.cid}\t${s.amount}\t${s.deadline}\t${s.state}\t${s.text}\n` : `SALE_NONE\t${arg}\n`; }
      if (head === 'RESOLVER_RECORD') {
        held.set(sha(arg), arg);
        const refs = arg.split('-').filter((x) => x[0] === 'C').map((x) => x.slice(1));
        if (/-KKSALE1-/.test(arg)) sales.set(refs[1], { cid: sha(arg), amount: /-T(\d+)NATIVE/.exec(arg)[1], deadline: +/-D(\d+)-/.exec(arg)[1], state: 'funded', text: arg });
        if (/-KKSUPER1-/.test(arg)) { chain.push(held.get(refs[2]), arg); if (sales.has(refs[2])) sales.get(refs[2]).state = 'paid'; }
        const g = arg.slice(1, 65); heads.set(g, [(heads.get(g) || [0])[0] + 1, sha(arg)]);
        return `OK\t${sha(arg)}`;
      }
      return 'ERR\tunknown';
    } };
  const shown = [];
  globalThis.window = { ArkUI: { authorizationDialog: { confirm: async (v) => { shown.push(v); return true; } } }, ArkAuthorizationView: { scopedAuthorizationView: (v) => v } };

  assert.match((await acceptSkin({ who: b.who, wire: node, id, price: 0 })).failure, /not above zero/);
  const accepted = await acceptSkin({ who: b.who, wire: node, id, price: 100, days: 3 });
  assert.deepEqual([accepted.kind, String(accepted.price), shown.map((v) => v.action)], ['accepted', '100', ['object.accept', 'object.sale']], 'two reviews: the consent, then the payment');
  assert.match(shown[1].authorizationBytes, /-KKSALE1-T100NATIVE-D\d+-J1-C/);
  assert.match((await endSale({ who: b.who, wire: node, edge: accepted.edge })).failure, /runs until/, 'nothing comes back before the deadline');
  const given = await giveSkin({ who: a.who, wire: node, id, edge: accepted.edge });
  assert.deepEqual([given.kind, given.to, String(given.paid)], ['given', b.pubHex, '100']);
  assert.match(shown.at(-1).title, /Sell this skin for 100 FXN/, "the owner's review names the price");
  assert.match((await endSale({ who: b.who, wire: node, edge: accepted.edge })).failure, /is paid/, 'a paid sale cannot be taken back');

  // an ended, unpaid sale: the owner's move is refused, and the taker takes the FXN back
  const edge2 = 'ee'.repeat(32);
  sales.set(edge2, { cid: 'ff'.repeat(32), amount: '200', deadline: now - 60, state: 'funded', text: 'x' });
  const back = await endSale({ who: b.who, wire: node, edge: edge2 });
  assert.deepEqual([back.kind, String(back.amount)], ['returned', '200']);
  assert.match(shown.at(-1).authorizationBytes, new RegExp(`-KKSALEEND1-J\\d+-C[0-9a-f]{64}-C${'ff'.repeat(32)}$`));
  sales.get(accepted.edge).state = 'unfunded';
  delete globalThis.window;
});

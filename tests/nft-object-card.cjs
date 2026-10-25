/* Why this exists (owner, 2026-10-25): a real card has no number. Its card record and its wear name the PVA's chain
   object id in an O box, in the card's own grammar, so every text the site keeps points at the one object the chain
   controls. This pins: the O box round-trips and never sits beside an N box; a real card's mix is drawn from its id,
   the same on every page; a wear names its card by O, refuses a package of another card, and titles itself "PVA". */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' });
const w = dom.window;
for (const f of ['js/nft/skin-bundle.js', 'js/nft/cards-data.js', 'js/nft/traits.js', 'js/nft/card-record.js', 'js/nft/wear.js']) w.eval(fs.readFileSync(path.join(root, f), 'utf8'));
const T = w.DEFXN_TRAITS, R = w.DefxnCardRecord, W = w.DefxnWear;
const id = 'ab'.repeat(32), other = 'cd'.repeat(32), owner = '12'.repeat(32);

// 1. a real card's record: O box, no number, and the mix is its id's
const rec = T.objectRecord({ id, owner, mintedAt: 1790000000 }, 'DEFXN');
assert.equal(rec.objectId, id);
const picked = T.pick(rec);
assert.deepEqual([picked.how, picked.number], ['object', null], 'the mix comes from the object id');
assert.equal(T.pick(T.objectRecord({ id, owner, mintedAt: 1 })).dna, picked.dna, 'the same id draws the same mix');
assert.notEqual(T.pick(T.objectRecord({ id: other, owner, mintedAt: 1 })).dna, picked.dna, 'another id draws another mix');
const text = R.of(rec, picked);
assert.match(text, new RegExp(`^DFXNCARD1-O${id}-I`), text);
assert.ok(!/-N\d/.test(text), 'a real card carries no number');
assert.equal(R.decode(text).object, id, 'the O box reads back');
assert.throws(() => R.encode({ number: 5, object: id, genesis: picked.genesis }), /never both/);

// 2. a real card's wear names it by O and titles itself PVA
w.DefxnSkinPackage = { decode: (t) => ({ record: t }) };
const wear = { number: null, object: id, name: 'n', palette: 'p', package: text };
const encoded = W.encode(wear);
assert.equal(encoded.split('\n')[0], `DFXNWEAR1-O${id}-M6e-P70`);
const back = W.decode(encoded);
assert.deepEqual([back.object, back.number], [id, null]);
assert.equal(W.title(back), 'PVA ababab…abab');
assert.throws(() => W.decode(W.encode({ ...wear, object: other })), /another card/, 'a package of another card is refused');
assert.equal(W.title({ number: '263' }), 'Card 263', 'a sample keeps its number');

// 3. a skin's own record, and the 32-byte pointer its mint carries
const S = R.skin, look = { palette: 'Copper', aura: 'Orbit', corner: 'Bevel' };
const skinText = S.encode(look), pointer = S.toPointer(look);
assert.match(skinText, new RegExp(`^DFXNSKIN1-T${R.TABLE}-W[0-9a-z]+$`));
assert.match(pointer, new RegExp(`^df51${R.TABLE}[0-9a-f]{52}$`));
assert.deepEqual({ ...S.decode(skinText) }, { ...S.fromPointer(pointer) }, 'the record and the pointer read the same skin');
assert.equal(S.fromPointer(pointer).palette, 'Copper');
assert.throws(() => S.encode({}), /at least one layer/, 'a skin changes something');
assert.throws(() => S.encode({ palette: 'No Such Ink' }), /no such element/);
assert.throws(() => S.fromPointer('ab'.repeat(32)), /df51/, 'a hash is not a skin');
assert.throws(() => S.fromPointer('df51' + '00000000' + pointer.slice(12)), /layer table 00000000/, 'another table is named');
assert.throws(() => S.decode(`DFXNSKIN1-T${R.TABLE}-W${'z'.repeat(17)}`), /bigger than this layer table/, 'a number past the table is refused');
assert.throws(() => S.decode(skinText.replace('-W', '-W0')), /does not write back/, 'a leading zero is not this grammar');
assert.throws(() => S.fromPointer('df51' + R.TABLE + '0'.repeat(52)), /at least one layer/, 'an empty skin is refused');

console.log('nft-object-card: ok (O box, mix from the id, wear by O, PVA title, skin record and pointer)');

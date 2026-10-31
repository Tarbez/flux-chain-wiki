/* DEFXN identity card: the card as one dense record, written in the dense-wire wire shape.

   This is the card's OWN local grammar (layers/README.md has the art; this file has the record). It
   follows dense-wire's wire rules (dense-wire/src/lib.rs): the alphabet is A-Z a-z 0-9 and "-", "-"
   is the only delimiter, each box is a label then its payload, a box takes the longest label it
   starts with, and free text is written as hex of its UTF-8 bytes. Labels are upper case and every
   payload is lower case, so a payload can never be read as a label.

     DFXNCARD1        the record kind (no payload)
     N<digits>        the genesis number of a sample card
     O<64 hex>        the object id of a real card: its PVA's KASSET1 mint CID on the chain (dense-wire objects.rs).
                      A record carries N or O, never both: a real card has no number, only its chain id
     I<hex>           the identity, when it is hex (the 0x is dropped)
     IT<hex>          the identity as text, when it is not hex (hex of its UTF-8)
     T<8 hex>         the layer table version (either bundle): the DNA indexes this table
     D<base 36>       the genesis DNA, packed: one mixed-radix number over the layers' element counts. For a real card
                      it is the mix its PVA's activation carries (DFXNMIX1, js/nft/traits.js), or for a PVA activated
                      before 2026-10-29 the mix drawn from its object id
     W<base 36>       the DNA worn now, when a skin changes it (absent when it does not)

   Example: DFXNCARD1-N263-Id984cd0f1e...-T3fa9c01b-D2k9x7q1mzp-W2k9x7q1mzq

   This record is unsigned and lives in the page. The card it names is on the chain.
   DECIDED by the owner, 2026-10-24 (SKIN-AUDIT.md, decision 1) and built 2026-10-25 (CHAIN-BUILD.md): a real card
   is its identity's PVA, a KASSET1 object on the kernel chain pva (flux/defxn-defi-rs, branch pva-chain,
   dense-wire/src/objects.rs). Its id is the mint record's CID and its owner (G) the identity's key. Its pointer
   (C[1]) is the FXN payment that earned it. It never moves. The owner decided 2026-10-25 that a real card has no
   number: the O box carries its object id, and js/ark/chain-cards.mjs reads and verifies it. decode()
   re-encodes what it read and refuses anything it could not have written. */
(function () {
  'use strict';
  var T = window.DEFXN_TRAITS, LAYERS = T.LAYERS, TABLE = window.DEFXN_LAYERS_TABLE || '';
  var LABELS = [                              // longest first: a box takes the longest label it starts with
    ['DFXNCARD1', /^$/], ['IT', /^(?:[0-9a-f]{2})+$/], ['N', /^[1-9][0-9]{0,8}$/], ['O', /^[0-9a-f]{64}$/], ['I', /^[0-9a-f]+$/],
    ['T', /^[0-9a-f]{8}$/], ['D', /^[0-9a-z]+$/], ['W', /^[0-9a-z]+$/]
  ];
  function readBox(box) {
    for (var i = 0; i < LABELS.length; i++) {
      var l = LABELS[i][0];
      if (box.indexOf(l) === 0) {
        var v = box.slice(l.length);
        if (!LABELS[i][1].test(v)) throw new Error('The card record box "' + box + '" has a payload its label ' + l + ' does not allow.');
        return [l, v];
      }
    }
    throw new Error('The card record box "' + box + '" starts with no known label.');
  }
  function box(label, value) { var b = label + value; readBox(b); return b; }   // written through the reader
  function hex(text) { return Array.prototype.map.call(new TextEncoder().encode(text), function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join(''); }
  function unhex(h) { var a = new Uint8Array(h.length / 2); for (var i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return new TextDecoder().decode(a); }

  // a DNA ("3-0-7-...") as one number: each layer's element index is a digit in base (its element count)
  function pack(dna) {
    var idx = dna.split('-').map(Number), n = 0n;
    LAYERS.forEach(function (l, i) { n = n * BigInt(l.elements.length) + BigInt(idx[i]); });
    return n.toString(36);
  }
  function unpack(code) {
    var n = 0n;
    for (var i = 0; i < code.length; i++) n = n * 36n + BigInt(parseInt(code[i], 36));
    var idx = [];
    for (var j = LAYERS.length - 1; j >= 0; j--) { var c = BigInt(LAYERS[j].elements.length); idx[j] = Number(n % c); n = n / c; }
    if (n !== 0n) throw new Error('The packed DNA "' + code + '" is bigger than this layer table allows: it was written for another table.');
    return idx.join('-');
  }

  function encode(card) {
    var boxes = [box('DFXNCARD1', '')];
    if (card.object && card.number) throw new Error('A card record carries a number (a sample) or an object id (a real card), never both.');
    if (card.object) boxes.push(box('O', String(card.object)));
    else if (card.number) boxes.push(box('N', String(card.number)));
    var id = String(card.identity || '').replace(/^0x/i, '').toLowerCase();
    if (id) boxes.push(/^[0-9a-f]+$/.test(id) ? box('I', id) : box('IT', hex(String(card.identity))));
    boxes.push(box('T', TABLE));
    boxes.push(box('D', pack(card.genesis)));
    if (card.worn && card.worn !== card.genesis) boxes.push(box('W', pack(card.worn)));
    return boxes.join('-');
  }
  function decode(text) {
    var boxes = String(text).split('-').map(readBox), out = {};
    if (!boxes.length || boxes[0][0] !== 'DFXNCARD1') throw new Error('This text is not a card record: it must start with DFXNCARD1.');
    boxes.slice(1).forEach(function (b) {
      if (b[0] === 'N') out.number = +b[1];
      else if (b[0] === 'O') out.object = b[1];
      else if (b[0] === 'I') out.identity = '0x' + b[1];
      else if (b[0] === 'IT') out.identity = unhex(b[1]);
      else if (b[0] === 'T') out.table = b[1];
      else if (b[0] === 'D') out.genesis = b[1];
      else if (b[0] === 'W') out.worn = b[1];
    });
    if (out.table !== TABLE) throw new Error('This card record was written for layer table ' + out.table + ', and this page has table ' + TABLE + '. Load the table it names to read its DNA.');
    out.genesis = unpack(out.genesis); out.worn = out.worn ? unpack(out.worn) : out.genesis;
    var again = encode(out);
    if (again !== text) throw new Error('This card record reads, but does not write back the same (' + again + '). It was not written by this grammar.');
    return out;
  }
  // the record of a card on the page
  function of(record, traits) {
    return encode({ number: record.objectId ? null : traits.number, object: record.objectId || null, identity: record.identity, genesis: traits.genesis || traits.dna, worn: traits.dna });
  }

  /* ---------- a skin's own record (owner, 2026-10-25) ----------
       DFXNSKIN1-T<8 hex table>-W<base 36>
     W packs, per layer in table order, 0 for "the card's own element" or 1 + the index of the element the skin puts
     on: one mixed-radix number, as D packs a card's DNA. A skin changes at least one layer.
     On the chain a skin is a KASSET1 on `skin` whose pointer IS this record packed into 32 bytes:
       df51 + T + W as 52 hex digits
     so a skin's look is in its own mint and no store holds it (dense-wire objects.rs reads the pointer as opaque).
     skin.decode and skin.fromPointer refuse anything skin.encode and skin.toPointer could not have written. */
  var SKIN_MAGIC = 'df51', SKIN_DIGITS = 52;
  function skinNumber(skin) {
    var n = 0n, changed = 0;
    LAYERS.forEach(function (l) {
      var want = String((skin && skin[l.key]) || '').toLowerCase(), d = 0;
      if (want) {
        l.elements.forEach(function (e, j) { if (e.name.toLowerCase() === want) d = j + 1; });
        if (!d) throw new Error('The skin puts "' + skin[l.key] + '" on ' + l.key + ', and this layer table has no such element.');
        changed++;
      }
      n = n * BigInt(l.elements.length + 1) + BigInt(d);
    });
    if (!changed) throw new Error('A skin changes at least one layer. This one changes none.');
    return n;
  }
  function skinOfNumber(n) {
    var skin = {}, changed = 0;
    for (var j = LAYERS.length - 1; j >= 0; j--) {
      var base = BigInt(LAYERS[j].elements.length + 1), d = Number(n % base);
      n = n / base;
      if (d) { skin[LAYERS[j].key] = LAYERS[j].elements[d - 1].name; changed++; }
    }
    if (n !== 0n) throw new Error('This skin is bigger than this layer table allows: it was written for another table.');
    if (!changed) throw new Error('A skin changes at least one layer. This one changes none.');
    return skin;
  }
  function tableOf(t) {
    if (t !== TABLE) throw new Error('This skin was written for layer table ' + t + ', and this page has table ' + TABLE + '. Load the table it names to read it.');
  }
  var skin = {
    encode: function (sk) { return 'DFXNSKIN1-T' + TABLE + '-W' + skinNumber(sk).toString(36); },
    decode: function (text) {
      var m = /^DFXNSKIN1-T([0-9a-f]{8})-W([0-9a-z]+)$/.exec(String(text));
      if (!m) throw new Error('A skin record is DFXNSKIN1-T<table>-W<base 36>. This text is not, so this grammar did not write it.');
      tableOf(m[1]);
      var n = 0n;
      for (var i = 0; i < m[2].length; i++) n = n * 36n + BigInt(parseInt(m[2][i], 36));
      var sk = skinOfNumber(n);
      if (skin.encode(sk) !== text) throw new Error('This skin record reads, but does not write back the same. It was not written by this grammar.');
      return sk;
    },
    toPointer: function (sk) {
      var hex = skinNumber(sk).toString(16);
      if (hex.length > SKIN_DIGITS) throw new Error('This skin does not fit a 32-byte pointer: the layer table is too large for it.');
      return SKIN_MAGIC + TABLE + '0'.repeat(SKIN_DIGITS - hex.length) + hex;
    },
    fromPointer: function (pointer) {
      var m = /^df51([0-9a-f]{8})([0-9a-f]{52})$/.exec(String(pointer));
      if (!m) throw new Error('This skin\'s pointer does not start with df51 and a layer table, so the DEFXN shop did not mint it.');
      tableOf(m[1]);
      var sk = skinOfNumber(BigInt('0x' + m[2]));
      if (skin.toPointer(sk) !== pointer) throw new Error('This skin\'s pointer reads, but does not write back the same. It was not written by this grammar.');
      return sk;
    }
  };

  window.DefxnCardRecord = { encode: encode, decode: decode, of: of, pack: pack, unpack: unpack, skin: skin, TABLE: TABLE };
})();

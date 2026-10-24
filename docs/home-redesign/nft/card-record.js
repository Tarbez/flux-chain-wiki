/* DEFXN identity card: the card as one dense record, written in the dense-wire wire shape.

   This is the card's OWN local grammar (layers/README.md has the art; this file has the record). It
   follows dense-wire's wire rules (dense-wire/src/lib.rs): the alphabet is A-Z a-z 0-9 and "-", "-"
   is the only delimiter, each box is a label then its payload, a box takes the longest label it
   starts with, and free text is written as hex of its UTF-8 bytes. Labels are upper case and every
   payload is lower case, so a payload can never be read as a label.

     DFXNCARD1        the record kind (no payload)
     N<digits>        the genesis number
     I<hex>           the identity, when it is hex (the 0x is dropped)
     IT<hex>          the identity as text, when it is not hex (hex of its UTF-8)
     T<8 hex>         the layer table version (layers-bundle.js): the DNA indexes this table
     D<base 36>       the genesis DNA, packed: one mixed-radix number over the layers' element counts
     W<base 36>       the DNA worn now, when a skin changes it (absent when it does not)

   Example: DFXNCARD1-N263-Id984cd0f1e...-T3fa9c01b-D2k9x7q1mzp-W2k9x7q1mzq

   NOT a dense-wire record yet: dense-wire has no card kind, and a new kind is a resolver record with
   its own published grammar (dense-wire/src/chain.rs, record_grammar.rs). This record is unsigned and
   lives in the page. A real one would compose the object capability (KASSET1: one owner, moved and
   burned through lineage) and carry the owner's signature (an S box), checked by the one shared
   verifier. decode() re-encodes what it read and refuses anything it could not have written. */
(function () {
  'use strict';
  var T = window.DEFXN_TRAITS, LAYERS = T.LAYERS, TABLE = window.DEFXN_LAYERS_TABLE || '';
  var LABELS = [                              // longest first: a box takes the longest label it starts with
    ['DFXNCARD1', /^$/], ['IT', /^(?:[0-9a-f]{2})+$/], ['N', /^[1-9][0-9]{0,8}$/], ['I', /^[0-9a-f]+$/],
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
    if (card.number) boxes.push(box('N', String(card.number)));
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
    return encode({ number: traits.number, identity: record.identity, genesis: traits.genesis || traits.dna, worn: traits.dna });
  }

  window.DefxnCardRecord = { encode: encode, decode: decode, of: of, pack: pack, unpack: unpack, TABLE: TABLE };
})();

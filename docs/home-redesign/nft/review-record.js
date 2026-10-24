/* DEFXN identity card: the owner's REVIEW of the elements, as dense records (the review file's own
   grammar: layers/review.flx). One record per line, boxes joined by "-", a box takes the longest label
   it starts with, free text is hex of its UTF-8 bytes, labels are upper case and payloads lower case.

     DFXNHOLD1-L<hex layer key>-E<hex element name>
         the element is held back: no new card is born with it, and no card can wear it
     DFXNCLASH1-L<hex layer>-E<hex name>-L<hex layer>-E<hex name>
         the two elements clash: no card is born with both, and no card can wear both

   The review page (review.html) writes this file; make-layers.mjs reads it into the bundle
   (window.DEFXN_REVIEW), and traits.js keeps held elements and clashing pairs out of every draw.
   decode() writes back what it read and refuses anything it could not have written. Works in the
   browser (window.DefxnReviewRecord) and in Node (globalThis.DefxnReviewRecord). */
(function (root) {
  'use strict';

  var LABELS = [['DFXNCLASH1', /^$/], ['DFXNHOLD1', /^$/], ['L', /^(?:[0-9a-f]{2})+$/], ['E', /^(?:[0-9a-f]{2})+$/]];
  function readBox(box) {
    for (var i = 0; i < LABELS.length; i++) {
      var l = LABELS[i][0];
      if (box.indexOf(l) === 0) {
        var v = box.slice(l.length);
        if (!LABELS[i][1].test(v)) throw new Error('The review box "' + box + '" has a payload its label ' + l + ' does not allow.');
        return [l, v];
      }
    }
    throw new Error('The review box "' + box + '" starts with no known label. A review line is DFXNHOLD1-L..-E.. or DFXNCLASH1-L..-E..-L..-E...');
  }
  function hex(text) {
    var bytes = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(text) : Buffer.from(text, 'utf8');
    return Array.prototype.map.call(bytes, function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join('');
  }
  function unhex(h) {
    var a = new Uint8Array(h.length / 2);
    for (var i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16);
    return typeof TextDecoder !== 'undefined' ? new TextDecoder().decode(a) : Buffer.from(a).toString('utf8');
  }
  function box(label, value) { var b = label + value; readBox(b); return b; }
  function idOf(layer, name) { return layer + '/' + name; }
  function split(id) { var i = id.indexOf('/'); return [id.slice(0, i), id.slice(i + 1)]; }

  // review: { hold: [id], clash: [[id, id]] } with id = "layerKey/Element name"
  function encode(review) {
    var lines = [];
    (review.hold || []).slice().sort().forEach(function (id) {
      var p = split(id); lines.push([box('DFXNHOLD1', ''), box('L', hex(p[0])), box('E', hex(p[1]))].join('-'));
    });
    (review.clash || []).map(function (pair) { return pair.slice().sort(); }).sort(function (a, b) { return (a[0] + '|' + a[1]).localeCompare(b[0] + '|' + b[1]); }).forEach(function (pair) {
      var a = split(pair[0]), b = split(pair[1]);
      lines.push([box('DFXNCLASH1', ''), box('L', hex(a[0])), box('E', hex(a[1])), box('L', hex(b[0])), box('E', hex(b[1]))].join('-'));
    });
    return lines.join('\n') + (lines.length ? '\n' : '');
  }
  function decode(text) {
    var out = { hold: [], clash: [] };
    String(text).split('\n').forEach(function (line, n) {
      if (!line.trim()) return;
      var boxes = line.trim().split('-').map(readBox), kind = boxes[0][0], parts = boxes.slice(1);
      function pairs() {
        var ids = [];
        for (var i = 0; i < parts.length; i += 2) {
          if (!parts[i + 1] || parts[i][0] !== 'L' || parts[i + 1][0] !== 'E') throw new Error('Review line ' + (n + 1) + ' needs L then E boxes.');
          ids.push(idOf(unhex(parts[i][1]), unhex(parts[i + 1][1])));
        }
        return ids;
      }
      if (kind === 'DFXNHOLD1') { var h = pairs(); if (h.length !== 1) throw new Error('Review line ' + (n + 1) + ': a hold names one element.'); out.hold.push(h[0]); }
      else if (kind === 'DFXNCLASH1') { var c = pairs(); if (c.length !== 2) throw new Error('Review line ' + (n + 1) + ': a clash names two elements.'); out.clash.push(c); }
      else throw new Error('Review line ' + (n + 1) + ' must start with DFXNHOLD1 or DFXNCLASH1.');
    });
    // the same records in any order are fine; anything this grammar could not have written is refused
    function lines(t) { return String(t).split('\n').map(function (l) { return l.trim(); }).filter(Boolean).sort().join('\n'); }
    if (lines(encode(out)) !== lines(text)) throw new Error('The review file reads, but does not write back the same. It was not written by this grammar.');
    return out;
  }

  root.DefxnReviewRecord = { encode: encode, decode: decode, idOf: idOf };
})(typeof window !== 'undefined' ? window : globalThis);

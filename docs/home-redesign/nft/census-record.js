/* DEFXN identity card: the CENSUS of what each 3D element builds, as dense records (its own grammar:
   layers/census.flx). One record per element. Boxes are joined by "-", a box takes the longest label it
   starts with, free text is hex of its UTF-8 bytes, labels are upper case and payloads lower case.

     DFXNCENSUS1-L<hex layer key>-E<hex element name>-C<cubes>-G<glass>-P<points>-H<thin>-N<seeds>-S<hash>
         C  solid blocks built (Art3D model cubes)
         G  glass blocks and spheres
         P  points of light
         H  thin parts: lines, streaks and bars
         N  how many seeded builds the counts average (each a different card key)
         S  the first 8 hex of the SHA-256 of what built it: its builder file and its own settings. A
            record whose hash no longer matches is stale, and make-layers.mjs drops it and says so.

   make-census.mjs writes this file by building every 3D element in a browser; make-layers.mjs reads it
   into both bundles as each element's `census`, so a site derives a card's grid look with no 3D at all
   (docs/home-redesign/GRID-LOOK.md). decode() writes back what it read and refuses anything it could not
   have written. Works in the browser (window.DefxnCensusRecord) and in Node (globalThis). */
(function (root) {
  'use strict';

  var LABELS = [['DFXNCENSUS1', /^$/], ['L', /^(?:[0-9a-f]{2})+$/], ['E', /^(?:[0-9a-f]{2})+$/], ['C', /^\d+$/], ['G', /^\d+$/],
    ['P', /^\d+$/], ['H', /^\d+$/], ['N', /^[1-9]\d*$/], ['S', /^[0-9a-f]{8}$/]];
  var ORDER = ['L', 'E', 'C', 'G', 'P', 'H', 'N', 'S'];
  function readBox(box) {
    for (var i = 0; i < LABELS.length; i++) {
      var l = LABELS[i][0];
      if (box.indexOf(l) === 0) {
        var v = box.slice(l.length);
        if (!LABELS[i][1].test(v)) throw new Error('The census box "' + box + '" has a payload its label ' + l + ' does not allow.');
        return [l, v];
      }
    }
    throw new Error('The census box "' + box + '" starts with no known label. A census line is DFXNCENSUS1-L-E-C-G-P-H-N-S.');
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

  // rows: [{ layer, name, cubes, glass, pts, thin, seeds, hash }]
  function encode(rows) {
    return rows.slice().sort(function (a, b) { return (a.layer + '/' + a.name).localeCompare(b.layer + '/' + b.name); }).map(function (r) {
      return [box('DFXNCENSUS1', ''), box('L', hex(r.layer)), box('E', hex(r.name)), box('C', String(r.cubes)), box('G', String(r.glass)),
        box('P', String(r.pts)), box('H', String(r.thin)), box('N', String(r.seeds)), box('S', r.hash)].join('-');
    }).join('\n') + (rows.length ? '\n' : '');
  }
  function decode(text) {
    var rows = [];
    String(text).split('\n').forEach(function (line, n) {
      if (!line.trim()) return;
      var boxes = line.trim().split('-').map(readBox);
      if (boxes[0][0] !== 'DFXNCENSUS1' || boxes.length !== 9) throw new Error('Census line ' + (n + 1) + ' must be DFXNCENSUS1 followed by L, E, C, G, P, H, N and S boxes.');
      var v = {};
      boxes.slice(1).forEach(function (b, i) {
        if (b[0] !== ORDER[i]) throw new Error('Census line ' + (n + 1) + ': box ' + (i + 2) + ' must be ' + ORDER[i] + ', not ' + b[0] + '.');
        v[b[0]] = b[1];
      });
      rows.push({ layer: unhex(v.L), name: unhex(v.E), cubes: +v.C, glass: +v.G, pts: +v.P, thin: +v.H, seeds: +v.N, hash: v.S });
    });
    function lines(t) { return String(t).split('\n').map(function (l) { return l.trim(); }).filter(Boolean).sort().join('\n'); }
    if (lines(encode(rows)) !== lines(text)) throw new Error('The census file reads, but does not write back the same. It was not written by this grammar.');
    return rows;
  }

  root.DefxnCensusRecord = { encode: encode, decode: decode };
})(typeof window !== 'undefined' ? window : globalThis);

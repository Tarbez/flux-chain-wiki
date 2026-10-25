/* DEFXN identity card: the SKIN PACKAGE. A worn card's whole skin as one small text of FLX records, so any
   site (DEFXN, Dead Ark, CR3TV) can wear it with Ark UI's skin layer and this file alone: no NFT engine, no
   layer table, no 3D (WEAR-AUDIT.md, loop 5; SKIN-AUDIT.md 4.1).

   The records, one per line, each boxes joined by "-", labels upper case, text as hex of its UTF-8 bytes:
     DFXNSKIN1-T<table>-D<hex dna>-R<hex card record line>-N<hex skin name>-F<hex family>
                                                                                the header, first line (F: the matched
                                                                                set the card wears whole, or empty)
     DFXNSKINTOK1-K<hex token>-V<hex value>                                     one colour token
     DFXNSKINPC1-K<hex piece>-N<hex element name>-B<hex viewBox>-X<hex keep x>-Y<hex keep y>-M<0|1>-F<hex fields>-S<hex svg>
                                                                                one drawn piece, filled for its wearer
                                                                                (F: the nameplate's filled fields, comma joined)
     DFXNSKINRL1-P<hex part, or * for every part>-K<hex rule>-V<hex value>      one rule (* is the card's flat set,
                                                                                a part key carries its own layout)
     DFXNSKINLK1-K<hex token>                                                   one token the site locked
     DFXNSKINGL1-K<hex knob>-V<hex value>                                       one grid-look knob (js/nft/grid-look.js)
     DFXNTL1-...                                                                the arrival timeline (js/nft/timeline.js)
   decode() writes back what it read and refuses anything it could not have written: it encodes its own result
   again and compares, so a package that decodes is exact to the byte. A package is derived
   from the card's record and the public layer table (its header names both), so any node can derive it again
   to audit it. It carries no signature yet: the identity's signature line (DFXNSKINSIG1) waits for real card
   objects (KASSET1), and until then a reader treats a package as an unsigned sample.

   DefxnSkinPackage.encode(recipe) -> text      DefxnSkinPackage.decode(text) -> skin data (with `family`, for a
                                                site policy that allows more to a whole set)
   DefxnSkinPackage.toArkSkin(data, opts)       the skin in the shape Ark UI's applyArkSkin takes (also used by
                                                skin-recipe.js's arkSkin: one copy of how rules reach parts)
   DefxnSkinPackage.apply(root, text, opts)     -> Promise of { result, gridLook, arrival }: wears a package
   Works in the browser (window.DefxnSkinPackage); encode, decode and toArkSkin's data step also in Node. */
(function (root) {
  'use strict';

  // tokens a skin never sets: their colour says something true about the site (Ark UI's meaning tokens)
  var MEANING = ['--live', '--trust', '--drift', '--warning', '--danger', '--hidden', '--success'];
  // which of a card's flat rules each Ark UI part wears, when no part keys are given
  var PART_RULES = {
    CARD: ['frame', 'edge', 'ornament', 'header'],
    POPOVER: ['frame', 'edge', 'marker'],
    MEGAMENUPANEL: ['frame', 'edge', 'ornament', 'marker'],
    MODAL: ['frame', 'edge', 'header'],
    PANEL: ['frame', 'edge', 'ornament', 'header'],
    LIST: ['marker'],
    SEPARATOR: ['ornament'],
    BUTTON: ['edge', 'button']
  };
  var FLAT = ['frame', 'edge', 'ornament', 'marker', 'header', 'density', 'button'];
  var VOID = /^(INPUT|IMG|HR|BR|TEXTAREA|SELECT|PROGRESS|METER|VIDEO|AUDIO|IFRAME|CANVAS)$/;
  function squash(v) { return String(v).replace(/[^A-Za-z0-9]/g, '').toUpperCase(); }

  /* the skin data in Ark UI's shape. data: { dna | name, tokens, chrome, rules (flat), layouts, locks }.
     opts.keys: send the whole flat rule set to every part key given, each with its own layout; Ark UI's kind
     table decides what a part takes. opts.root: only keys present under it, and a part whose elements cannot
     hold children (an input, an image, a rule line) gets an edge only. opts.parts: the PART_RULES table's
     parts. opts.derive: the SDK's deriveSkinTokens; its tokens never fill a lock or a meaning token. */
  function toArkSkin(data, opts) {
    opts = opts || {};
    var rules = {}, tokens = Object.assign({}, data.tokens), locks = data.locks || [], layouts = data.layouts || {}, flat = data.rules || {};
    if (opts.keys) {
      var keys = opts.keys, voidOnly = {};
      if (opts.root) {
        var present = {};
        Array.prototype.forEach.call(opts.root.querySelectorAll('[data-ark-part],[data-ark-foundation]'), function (e) {
          [e.getAttribute('data-ark-part'), e.getAttribute('data-ark-foundation')].forEach(function (v) {
            if (!v) return;
            var k = squash(v);
            present[k] = true;
            voidOnly[k] = (voidOnly[k] == null ? true : voidOnly[k]) && VOID.test(e.tagName);
          });
        });
        keys = keys.filter(function (k) { return String(k).split('|').some(function (side) { return present[squash(side)]; }); });
      }
      keys.forEach(function (key) {
        var r = {}, bare = opts.root && String(key).split('|').every(function (side) { return voidOnly[squash(side)] !== false; });
        // a nameplate's fit is Ark UI's to decide (0.2.22: drawn 48 px tall, taken back where there is no room)
        FLAT.forEach(function (k) { var v = flat[k]; if (bare && k !== 'edge') return; if (v && v !== 'keep' && v !== 'none') r[k] = v; });
        var l = layouts[squash(key)];
        if (l && l !== 'keep') r.layout = l;
        if (Object.keys(r).length) rules[key] = r;
      });
    } else (opts.parts || Object.keys(PART_RULES)).forEach(function (part) {
      var ks = PART_RULES[part];
      if (!ks) return;
      rules[part] = {};
      ks.forEach(function (k) { rules[part][k] = flat[k]; });
    });
    if (typeof opts.derive === 'function') {
      var derived = opts.derive(Object.assign({}, tokens)) || {};
      Object.keys(derived).forEach(function (k) { if (!(k in tokens) && MEANING.indexOf(k) < 0 && locks.indexOf(k) < 0) tokens[k] = derived[k]; });
    }
    var chrome = {};
    Object.keys(data.chrome || {}).forEach(function (k) { if (data.chrome[k]) chrome[k] = data.chrome[k]; });
    return { name: data.name || 'defxn-card-' + String(data.dna).replace(/-/g, '.'), tokens: tokens, chrome: chrome, rules: rules, locks: locks.slice() };
  }

  /* ---------- the grammar ---------- */
  function hex(s) { var b = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(String(s)) : Buffer.from(String(s), 'utf8'); return Array.prototype.map.call(b, function (x) { return (x < 16 ? '0' : '') + x.toString(16); }).join(''); }
  function unhex(h) { var a = new Uint8Array(h.length / 2); for (var i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return typeof TextDecoder !== 'undefined' ? new TextDecoder().decode(a) : Buffer.from(a).toString('utf8'); }
  var HEX = /^(?:[0-9a-f]{2})*$/;
  var KINDS = {
    DFXNSKIN1: [['T', /^[0-9a-f]{0,8}$/], ['D', HEX], ['R', HEX], ['N', HEX], ['F', HEX]],
    DFXNSKINTOK1: [['K', HEX], ['V', HEX]],
    DFXNSKINPC1: [['K', HEX], ['N', HEX], ['B', HEX], ['X', HEX], ['Y', HEX], ['M', /^[01]$/], ['F', HEX], ['S', HEX]],
    DFXNSKINRL1: [['P', HEX], ['K', HEX], ['V', HEX]],
    DFXNSKINLK1: [['K', HEX]],
    DFXNSKINGL1: [['K', HEX], ['V', HEX]]
  };
  function line(kind, values) { return [kind].concat(KINDS[kind].map(function (b, i) { return b[0] + values[i]; })).join('-'); }
  function encode(recipe, ark) {
    var data = ark || toArkSkin(recipe), out = [];
    out.push(line('DFXNSKIN1', [recipe.table || '', hex(recipe.dna || ''), hex(recipe.record || ''), hex(data.name), hex(recipe.family || '')]));
    Object.keys(recipe.tokens).sort().forEach(function (k) { out.push(line('DFXNSKINTOK1', [hex(k), hex(recipe.tokens[k])])); });
    Object.keys(recipe.chrome).sort().forEach(function (k) {
      var c = recipe.chrome[k]; if (!c) return;
      out.push(line('DFXNSKINPC1', [hex(k), hex(c.name || ''), hex((c.viewBox || []).join(' ')), hex(c.keep && c.keep.x ? c.keep.x.join(',') : ''), hex(c.keep && c.keep.y ? c.keep.y.join(',') : ''), c.mirror ? '1' : '0', hex((c.fields || []).join(',')), hex(c.svg)]));
    });
    Object.keys(recipe.rules).sort().forEach(function (k) { out.push(line('DFXNSKINRL1', [hex('*'), hex(k), hex(recipe.rules[k])])); });
    Object.keys(recipe.layouts || {}).sort().forEach(function (p) { out.push(line('DFXNSKINRL1', [hex(p), hex('layout'), hex(recipe.layouts[p])])); });
    (recipe.locks || []).forEach(function (k) { out.push(line('DFXNSKINLK1', [hex(k)])); });
    var g = recipe.gridLook && recipe.gridLook.params;
    if (g) Object.keys(g).sort().forEach(function (k) { out.push(line('DFXNSKINGL1', [hex(k), hex(String(g[k]))])); });
    var text = out.join('\n') + '\n';
    if (recipe.arrival && root.DefxnTimeline) text += root.DefxnTimeline.encode(recipe.arrival);
    return text;
  }
  function decode(text) {
    var lines = String(text).split('\n').filter(function (l) { return l.trim(); }), data = { tokens: {}, chrome: {}, rules: {}, layouts: {}, locks: [], gridLook: null, arrival: null, signed: false }, tl = [];
    lines.forEach(function (l, n) {
      var boxes = l.trim().split('-'), kind = boxes[0];
      if (kind === 'DFXNTL1') { tl.push(l.trim()); return; }
      var spec = KINDS[kind];
      if (!spec) throw new Error('Skin package line ' + (n + 1) + ' starts with "' + kind + '", which this grammar does not know. A package line is one of ' + Object.keys(KINDS).join(', ') + ' or DFXNTL1.');
      if (n === 0 && kind !== 'DFXNSKIN1') throw new Error('A skin package starts with its DFXNSKIN1 header.');
      if (boxes.length !== spec.length + 1) throw new Error('Skin package line ' + (n + 1) + ' (' + kind + ') must have ' + (spec.length + 1) + ' boxes.');
      var v = spec.map(function (b, i) {
        var box = boxes[i + 1];
        if (box.indexOf(b[0]) !== 0 || !b[1].test(box.slice(b[0].length))) throw new Error('Skin package line ' + (n + 1) + ': box ' + (i + 2) + ' must be ' + b[0] + ' with a payload it allows.');
        return box.slice(b[0].length);
      });
      if (kind === 'DFXNSKIN1') { data.table = v[0]; data.dna = unhex(v[1]); data.record = unhex(v[2]); data.name = unhex(v[3]); data.family = unhex(v[4]) || null; }
      else if (kind === 'DFXNSKINTOK1') data.tokens[unhex(v[0])] = unhex(v[1]);
      else if (kind === 'DFXNSKINPC1') {
        var c = { svg: unhex(v[7]), viewBox: unhex(v[2]).split(' ').filter(Boolean).map(Number) }, x = unhex(v[3]), y = unhex(v[4]), f = unhex(v[6]);
        if (v[1]) c.name = unhex(v[1]);
        if (x || y) c.keep = { x: x ? x.split(',').map(Number) : undefined, y: y ? y.split(',').map(Number) : undefined };
        if (v[5] === '1') c.mirror = true;
        if (f) c.fields = f.split(',');
        data.chrome[unhex(v[0])] = c;
      } else if (kind === 'DFXNSKINRL1') { var p = unhex(v[0]), k = unhex(v[1]), val = unhex(v[2]); if (p === '*') data.rules[k] = val; else data.layouts[p] = val; }
      else if (kind === 'DFXNSKINLK1') data.locks.push(unhex(v[0]));
      else if (kind === 'DFXNSKINGL1') { data.gridLook = data.gridLook || { params: {} }; var gv = unhex(v[1]); data.gridLook.params[unhex(v[0])] = /^-?\d+(\.\d+)?$/.test(gv) ? +gv : gv; }
    });
    if (tl.length) {
      if (!root.DefxnTimeline) throw new Error('This skin package carries an arrival timeline (DFXNTL1 lines), and js/nft/timeline.js is not loaded. Load it first, then decode again.');
      data.arrival = root.DefxnTimeline.decode(tl.join('\n') + '\n');
    }
    if (encode(data, { name: data.name }) !== lines.join('\n') + '\n') throw new Error('This skin package does not encode back to the same text, so this grammar did not write it. Derive the package again from its card record and layer table (both are named in its header).');
    return data;
  }

  // wear a package on a root: Ark UI's skin layer must be loaded (window.ArkKitSkin)
  function apply(rootEl, text, opts) {
    opts = opts || {};
    var K = root.ArkKitSkin;
    if (!K) return Promise.reject(new Error('The skin package cannot be worn: Ark UI\'s skin layer (js/ark/vendor/ark-kit-skin.js) is not loaded. Load it first.'));
    var data = decode(text);
    var keys = Array.from(K.arkSkinPartKeys()).concat(Object.keys(K.ARK_SKIN_BLOCK_PARTS || {}));
    var skin = toArkSkin(data, { keys: keys, root: rootEl, derive: K.deriveSkinTokens });
    var result = K.applyArkSkin(rootEl, skin, { locks: (opts.locks || []).concat(data.locks) });
    return Promise.resolve({ result: result, gridLook: data.gridLook, arrival: data.arrival, signed: data.signed });
  }

  root.DefxnSkinPackage = { MEANING: MEANING.slice(), PART_RULES: PART_RULES, toArkSkin: toArkSkin, encode: encode, decode: decode, apply: apply };
})(typeof window !== 'undefined' ? window : globalThis);

/* DEFXN identity card: the DNA. Which element of each art layer a card gets, and the proof that no
   two cards get the same mix.

   The layers come from a bundle made from the folders in docs/home-redesign/nft/layers/ by
   make-layers.mjs: the full layers-bundle.js for the card, or js/nft/skin-bundle.js for a site (the
   same table, with only names and weights for the 3D layers: the DNA needs no more). A
   card's DNA is one element per layer, written as the elements' places in their folders: "9-7-0-5-...".

   ONE MIX PER GENESIS NUMBER, NEVER TWICE. A genesis number is given out once. The DNA of number n
   is fixed by replaying numbers 1..n in order: each draws one element per layer by weight (a seeded
   draw, the same on every machine), and a draw that is already taken is drawn again. So:
     - number n always gets the same DNA, on any machine, after any reload;
     - no two numbers ever share a DNA, while the mixes last;
     - the weights still decide how often each element appears (the rarity).
   The mixes run out only after every one is used (the product of the folders' counts, 3.4 million
   today). Adding one element file to any folder raises that number.

   A record may pin its DNA by name: `traits: { backdrop: 'Void', palette: 'Mono', ... }`, one name
   for every layer. A pinned number keeps that DNA, and no other number can draw it. The reference
   card pins its DNA, and a real mint will store the DNA it was made with: adding element files later
   changes the replay for numbers not yet minted, never for a minted one.

   Needs window.DEFXN_LAYERS (either bundle). Reads window.DEFXN_CARDS (js/nft/cards-data.js) for pins. */
(function () {
  'use strict';

  var LAYERS = window.DEFXN_LAYERS;
  if (!LAYERS || !LAYERS.length) {
    throw new Error('The art layers are missing: load js/nft/skin-bundle.js (a site) or docs/home-redesign/nft/layers-bundle.js (the card) before traits.js. ' +
      'To make both, run: node docs/home-redesign/nft/make-layers.mjs');
  }
  /* WEAR-ONLY categories (layers/worn/, the owner, 2026-10-25): never in the DNA, so they never change a card's mix,
     its odds or CAP. A card has one only when its skin names one ("button:Pill"); a born card shows none. */
  var WORN = window.DEFXN_WORN || [];
  var CAP = 1;
  LAYERS.concat(WORN).forEach(function (layer) {
    var total = layer.elements.reduce(function (s, e) { return s + e.weight; }, 0);
    layer.total = total;
    layer.worn = WORN.indexOf(layer) >= 0;
    layer.elements.forEach(function (e, i) { e.index = i; e.share = e.weight * 100 / total; e.layer = layer.key; });
    if (!layer.worn) CAP *= layer.elements.length;
  });
  // every category a page lists: the DNA's layers, then the wear-only ones
  var CATEGORIES = LAYERS.concat(WORN);

  /* THE OWNER'S REVIEW (layers/review.flx, bundled as DEFXN_REVIEW): a HELD element is never drawn
     for a new card and cannot be worn; two elements that CLASH are never drawn together and cannot
     be worn together. A pinned card (the reference) keeps its mix. */
  var REVIEW = window.DEFXN_REVIEW || { hold: [], clash: [] }, HELD = {}, CLASH = {};
  REVIEW.hold.forEach(function (id) { HELD[id] = true; });
  REVIEW.clash.forEach(function (p) { (CLASH[p[0]] = CLASH[p[0]] || {})[p[1]] = true; (CLASH[p[1]] = CLASH[p[1]] || {})[p[0]] = true; });
  CATEGORIES.forEach(function (layer) { layer.elements.forEach(function (e) { e.id = layer.key + '/' + e.name; e.held = !!HELD[e.id]; }); });
  // what keeps a mix from being drawn or worn: its held elements and its clashing pairs
  function problems(els) {
    var held = els.filter(function (e) { return e.held; }), pairs = [];
    for (var i = 0; i < els.length; i++) for (var j = i + 1; j < els.length; j++) if (CLASH[els[i].id] && CLASH[els[i].id][els[j].id]) pairs.push([els[i], els[j]]);
    return { held: held, clashes: pairs, ok: !held.length && !pairs.length };
  }

  /* RARITY TIERS, derived from each layer's own weights (no element is given a tier by hand). Line a
     layer's elements up from most to least common: the ones that make up the first half of the
     layer's weight are Common, the next 30% Rare, the next 15% Epic and the last 5% Legendary. Equal
     weights share a tier. A new file in a folder moves the lines. */
  var TIERS = ['Common', 'Rare', 'Epic', 'Legendary'], CUTS = [50, 80, 95];
  // Elements with the same weight have the same odds, so they share one tier: the tier of the middle
  // of their group's span (a group is never split across a line by the order of its files).
  CATEGORIES.forEach(function (layer) {
    var acc = 0, groups = {};
    layer.elements.forEach(function (e) { (groups[e.weight] = groups[e.weight] || []).push(e); });
    Object.keys(groups).map(Number).sort(function (a, b) { return b - a; }).forEach(function (w) {
      var span = groups[w].reduce(function (s, e) { return s + e.share; }, 0), mid = acc + span / 2;
      var tier = mid < CUTS[0] ? 0 : mid < CUTS[1] ? 1 : mid < CUTS[2] ? 2 : 3;
      groups[w].forEach(function (e) { e.tier = tier; });
      acc += span;
    });
  });
  // a mix's rarity score: how surprising it is, in bits (the sum of log2 of each element's odds).
  // One more bit is half as likely. It is the odds line in another unit, so the two always agree.
  function score(els) { return els.reduce(function (s, e) { return s + Math.log(100 / e.share) / Math.LN2; }, 0); }

  /* ---------- the key: identity + genesis ID, 128 bits ---------- */
  function hash32(str) {                     // FNV-1a, then a murmur finaliser so near strings part
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    return h >>> 0;
  }
  function keyOfString(k) { return [hash32(k), hash32('1|' + k), hash32('2|' + k), hash32('3|' + k)]; }
  function keyOf(record) { return keyOfString(String(record.identity || '') + '|' + String(record.genesisId || '')); }
  function keyHex(record) { return keyOf(record).map(function (w) { return ('00000000' + w.toString(16)).slice(-8); }).join(''); }
  function prng(words, salt) {               // xoshiro128**, one stream per salt
    var s0 = (words[0] ^ salt) | 0, s1 = words[1] | 0, s2 = words[2] | 0, s3 = words[3] | 0;
    if (!(s0 | s1 | s2 | s3)) s0 = 1;
    function rotl(x, k) { return (x << k) | (x >>> (32 - k)); }
    var rnd = function () {
      var out = Math.imul(rotl(Math.imul(s1, 5), 7), 9) >>> 0, t = s1 << 9;
      s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t; s3 = rotl(s3, 11);
      return out / 4294967296;
    };
    for (var i = 0; i < 8; i++) rnd();       // warm up, so near keys part at once
    return rnd;
  }

  /* ---------- DNA ---------- */
  // one element by weight; a held element weighs nothing (unless the whole layer is held)
  function weighted(layer, rnd) {
    var els = layer.elements, total = 0, i;
    for (i = 0; i < els.length; i++) if (!els[i].held) total += els[i].weight;
    var useAll = total === 0, roll = rnd() * (useAll ? layer.total : total), acc = 0;
    for (i = 0; i < els.length; i++) { if (els[i].held && !useAll) continue; acc += els[i].weight; if (roll < acc) return i; }
    return els.length - 1;
  }
  function dnaOf(indexes) { return indexes.join('-'); }
  function elementsOf(dna) {
    var parts = String(dna).split('-');
    return LAYERS.map(function (layer, i) { return layer.elements[+parts[i]]; });
  }
  /* THE INTERFACE NAMES (the owner, 2026-10-24: one vocabulary for websites, games and apps). A layer
     keeps its key in every record already written (folders, review files, skin text, pins), and is named
     by what it does in an interface everywhere else. Both spellings resolve, and nothing written is
     rewritten. Element files are never renamed: their order sets every card's DNA. */
  var UI_NAMES = { backdrop: 'background', aura: 'glow', mark: 'logo', signal: 'beam', tag: 'nameplate', ornament: 'accent-strip', emblem: 'icon' };
  var KEY_OF = {};
  CATEGORIES.forEach(function (l) { KEY_OF[l.key] = l.key; KEY_OF[uiName(l.key)] = l.key; });
  function uiName(key) { return UI_NAMES[key] || key; }
  // the name a page shows for a category: its interface name ("accent-strip" -> "Accent strip"); keys stay as written
  CATEGORIES.forEach(function (l) { var n = uiName(l.key).replace(/-/g, ' '); l.title = n.charAt(0).toUpperCase() + n.slice(1); });
  // (not keyOf: that name is the card's own key, keyOf(record), further down)
  function layerKeyOf(name) { return KEY_OF[String(name || '').trim().toLowerCase()] || null; }
  function pinOf(pins, key) { return pins[key] != null ? pins[key] : pins[uiName(key)]; }

  function byName(pins) {                    // a full pin -> DNA, or null when any layer is missing
    if (!pins) return null;
    var out = [];
    for (var i = 0; i < LAYERS.length; i++) {
      var want = String(pinOf(pins, LAYERS[i].key) || '').toLowerCase(), hit = -1;
      LAYERS[i].elements.forEach(function (e, j) { if (e.name.toLowerCase() === want) hit = j; });
      if (hit < 0) return null;
      out.push(hit);
    }
    return dnaOf(out);
  }
  function numberOf(genesisId) {
    var s = String(genesisId == null ? '' : genesisId).trim();
    return /^\d{1,9}$/.test(s) && +s > 0 ? +s : null;
  }

  // the numbers the sample records pin (the reference card), held back from every other number
  var reserved = {}, reservedSet = {}, top = 0;
  (window.DEFXN_CARDS || []).forEach(function (r) {
    var n = numberOf(r.genesisId), d = byName(r.traits);
    if (n) top = Math.max(top, n);
    if (n && d) { reserved[n] = d; reservedSet[d] = n; }
  });

  var ledger = { list: [null], used: {}, next: 1 };
  function draw(n) {
    for (var t = 0; t < 64; t++) {
      var rnd = prng(keyOfString('dna|' + n + '|' + t), 0x0d7a);
      var d = dnaOf(LAYERS.map(function (l) { return weighted(l, rnd); }));
      if (!ledger.used[d] && !(d in reservedSet) && problems(elementsOf(d)).ok) return d;
    }
    // the mixes are crowded: walk the space from a seeded start to the first free mix
    var start = Math.floor(prng(keyOfString('walk|' + n), 0x0d7a)() * CAP);
    for (var k = 0; k < CAP; k++) {
      var i = (start + k) % CAP, idx = [];
      for (var j = LAYERS.length - 1; j >= 0; j--) { idx[j] = i % LAYERS[j].elements.length; i = Math.floor(i / LAYERS[j].elements.length); }
      var dd = dnaOf(idx);
      if (!ledger.used[dd] && !(dd in reservedSet) && problems(elementsOf(dd)).ok) return dd;
    }
    throw new Error('Genesis number ' + n + ' has no mix left: all ' + CAP.toLocaleString('en-US') +
      ' mixes are used. Add an element file to any folder in docs/home-redesign/nft/layers/ and run make-layers.mjs.');
  }
  /* A real card's mix is fixed when its PVA is activated (owner, 2026-10-29). The activation carries it as C[2], 32
     bytes the chain does not read, packed in this grammar:
       DFXNMIX1   df5d + <2 hex: the number of layers L> + <3 hex per layer: the element's place in it> + zeros to 64
     The places are layers/order.flx's, which only grow, so a mix names the same elements on every later table. The
     chain refuses a second PVA with the same 32 bytes (MixTaken), and the page then draws the key's next mix.
     mix.fromPointer refuses anything mix.toPointer could not have written. */
  var MIX_MAGIC = 'df5d';
  var mix = {
    toPointer: function (dna) {
      var idx = String(dna).split('-').map(Number);
      if (idx.length !== LAYERS.length || LAYERS.length > 19) throw new Error('A mix names one element per layer, and this one names ' + idx.length + ' for ' + LAYERS.length + ' layers.');
      var body = MIX_MAGIC + ('0' + LAYERS.length.toString(16)).slice(-2) + idx.map(function (i, j) {
        if (!(i >= 0 && i < LAYERS[j].elements.length && i < 4096)) throw new Error('The mix names element ' + i + ' of ' + LAYERS[j].key + ', which has ' + LAYERS[j].elements.length + '.');
        return ('00' + i.toString(16)).slice(-3);
      }).join('');
      return body + '0'.repeat(64 - body.length);
    },
    fromPointer: function (pointer) {
      var m = /^df5d([0-9a-f]{2})([0-9a-f]{58})$/.exec(String(pointer));
      if (!m) throw new Error('This card\'s mix does not start with df5d, so the DEFXN site did not pack it.');
      var n = parseInt(m[1], 16);
      if (n !== LAYERS.length) throw new Error('This card\'s mix names ' + n + ' layers, and this page\'s table has ' + LAYERS.length + '. Load the layer table it was drawn from.');
      var idx = [];
      for (var j = 0; j < n; j++) {
        var i = parseInt(m[2].substr(j * 3, 3), 16);
        if (i >= LAYERS[j].elements.length) throw new Error('This card\'s mix names element ' + i + ' of ' + LAYERS[j].key + ', and this page\'s table has ' + LAYERS[j].elements.length + '. Load a newer layer table.');
        idx.push(i);
      }
      var dna = dnaOf(idx);
      if (mix.toPointer(dna) !== pointer) throw new Error('This card\'s mix reads, but does not write back the same. The DEFXN site did not pack it.');
      return dna;
    }
  };
  // the mix a key's activation carries on try n: the n-th mix drawn from (key, n) that is off the sample mixes and
  // the review's held elements and clashes. The same key and n draw the same mix on every page.
  function mixDraw(key, n) {
    var seen = {}, found = -1;
    for (var t = 0; t < 64 * (n + 1); t++) {
      var rnd = prng(keyOfString('pva|' + key + '|' + t), 0x0d7a);
      var d = dnaOf(LAYERS.map(function (l) { return weighted(l, rnd); }));
      if (seen[d] || d in reservedSet || !problems(elementsOf(d)).ok) continue;
      seen[d] = true;
      if (++found === n) return d;
    }
    throw new Error('Key ' + String(key).slice(0, 8) + ' found no free mix on try ' + n + ' in ' + 64 * (n + 1) + ' draws. Review the held list in layers/review.flx.');
  }
  // a real card's mix: the one its activation carries (mixPointer, from the chain read), or for a PVA activated before
  // mixes, the one drawn from its object id. That older draw uses this page's table, so a new element file can change it.
  function dnaOfObject(id, mixPointer) {
    if (mixPointer) return mix.fromPointer(mixPointer);
    for (var t = 0; t < 64; t++) {
      var rnd = prng(keyOfString('object|' + id + '|' + t), 0x0d7a);
      var d = dnaOf(LAYERS.map(function (l) { return weighted(l, rnd); }));
      if (!(d in reservedSet) && problems(elementsOf(d)).ok) return d;
    }
    throw new Error('The card ' + id.slice(0, 8) + ' found no mix free of the review\'s held elements in 64 draws. Review the held list in layers/review.flx.');
  }
  function dnaAt(n) {
    while (ledger.next <= n) {
      var i = ledger.next++, d = reserved[i] || draw(i);
      ledger.list[i] = d; ledger.used[d] = i;
    }
    return ledger.list[n];
  }

  function odds(els) { return els.reduce(function (p, e) { return p * 100 / e.share; }, 1); }
  // a big count in words: 1,234 / 4.3 million / 52.5 quadrillion
  var WORDS = ['million', 'billion', 'trillion', 'quadrillion', 'quintillion', 'sextillion', 'septillion', 'octillion'];
  function words(n) {
    if (n < 1e6) return Math.round(n).toLocaleString('en-US');
    var k = Math.min(WORDS.length - 1, Math.floor(Math.log10(n) / 3) - 2);
    return (n / Math.pow(10, 6 + k * 3)).toFixed(1).replace(/\.0$/, '') + ' ' + WORDS[k];
  }

  /* ---------- skins ----------
     A skin swaps the element an owner WEARS in some layers. The card's genesis DNA never changes: it
     is the birth record (future law: the past is not rewritten; a skin is a later record on top).
     A skin is `{ layerKey: elementName }`, or the same as text: "corner:Twin Arc|palette:Glass".
     The worn mix must stay unique too: wear() refuses a mix that another genesis number was born
     with, and names that number. (Mixes worn by other owners' skins need the registry; this design
     page can only check the genesis mixes it can replay.) */
  function skinOf(record) {
    var sk = record && record.skin;
    if (!sk) return {};
    if (typeof sk === 'string') {
      var out = {};
      sk.split('|').forEach(function (part) { var i = part.indexOf(':'); if (i > 0) out[layerKeyOf(part.slice(0, i)) || part.slice(0, i).trim()] = part.slice(i + 1).trim(); });
      return out;
    }
    var norm = {};
    Object.keys(sk).forEach(function (k) { norm[layerKeyOf(k) || k] = sk[k]; });
    return norm;
  }
  function skinText(skin) { return Object.keys(skin).filter(function (k) { return skin[k]; }).map(function (k) { return k + ':' + skin[k]; }).join('|'); }
  function wear(genesisDna, skin) {
    var idx = genesisDna.split('-').map(Number), changed = [];
    LAYERS.forEach(function (layer, i) {
      var want = String(skin[layer.key] || '').toLowerCase();
      if (!want) return;
      var hit = -1;
      layer.elements.forEach(function (e, j) { if (e.name.toLowerCase() === want) hit = j; });
      if (hit >= 0 && hit !== idx[i]) { idx[i] = hit; changed.push(layer.key); }
    });
    return { dna: dnaOf(idx), changed: changed };
  }
  // the genesis number born with this DNA, among the numbers this page has replayed, or null
  function wornOf(skin) {
    var out = [];
    WORN.forEach(function (layer) {
      var want = String(skin[layer.key] || '').toLowerCase();
      layer.elements.forEach(function (e) { if (want && e.name.toLowerCase() === want) out.push(e); });
    });
    return out;
  }
  function bornWith(dna) {
    if (dna in reservedSet) return reservedSet[dna];
    return ledger.used[dna] || null;
  }

  /* PROPOSED skin price, in whole FXN. FXN has no skin price yet (fees are set by vote and read
     "not set" until then; dense-wire billing_fees.rs). This is the proposal the owner confirms or
     changes: an element costs its odds, 1 in N, times ONE base amount, rounded up to whole FXN. A
     rare element costs more, a common one less, and going back to a genesis element is free. Only
     SKIN_BASE_FXN is a choice; every other number falls out of the layer weights. */
  var SKIN_BASE_FXN = 1;
  function price(element) { return Math.max(1, Math.ceil(SKIN_BASE_FXN * 100 / element.share)); }
  function skinCost(genesisDna, wornDna) {
    var g = elementsOf(genesisDna), w = elementsOf(wornDna), lines = [], total = 0;
    LAYERS.forEach(function (layer, i) {
      if (g[i] === w[i]) return;
      var fxn = price(w[i]); total += fxn;
      lines.push({ layer: layer, from: g[i], to: w[i], fxn: fxn });
    });
    return { total: total, lines: lines };
  }

  /* the card's picks. `how` says where the DNA came from:
       'number'  the genesis number's own DNA (unique)
       'pinned'  the record pins it (unique when its number is reserved)
       'preview' a full pin on a record with no number: a look at one mix, not a card
       'key'     the genesis ID is not a number, so the DNA is drawn from the key and is NOT checked
       'object'  a real card: the DNA its activation carries (record.objectMix), or for an older PVA the one drawn from
                 its chain object id (record.objectId) */
  function pick(record) {
    var object = /^[0-9a-f]{64}$/.test(record.objectId || '') ? record.objectId : null;
    var n = object ? null : numberOf(record.genesisId), pinned = byName(record.traits), dna, how;
    if (object && !pinned) { dna = dnaOfObject(object, record.objectMix); how = 'object'; }
    else if (pinned) { dna = pinned; how = n && reserved[n] === pinned ? 'pinned' : 'preview'; }
    else if (n) { dna = dnaAt(n); how = 'number'; }
    else {
      var rnd = prng(keyOf(record), 0x0d7a);
      dna = dnaOf(LAYERS.map(function (l) { return weighted(l, rnd); })); how = 'key';
    }
    var skin = skinOf(record), born = dna, worn = wear(born, skin);
    if (n) dnaAt(Math.max(n, top));           // replay far enough to check a worn mix against the born ones
    var els = elementsOf(worn.dna), picks = {};
    els.forEach(function (e) { picks[e.layer] = e; });
    // the wear-only elements the skin names; an unknown name is no element, as in a birth layer
    var extra = wornOf(skin);
    extra.forEach(function (e) { picks[e.layer] = e; });
    return {
      dna: worn.dna, list: els, picks: picks, odds: odds(els), number: n, how: how,
      genesis: born, skinned: worn.changed.length > 0 || extra.length > 0, changed: worn.changed.concat(extra.map(function (e) { return e.layer; })),
      // the worn mix is taken when another number was born with it
      takenBy: worn.changed.length ? bornWith(worn.dna) : null,
      // a worn mix with a held element or a clashing pair (the owner's review) cannot be worn
      review: worn.changed.length || extra.length ? problems(els.concat(extra)) : { held: [], clashes: [], ok: true },
      worn: extra
    };
  }

  /* ---------- new SAMPLE records, for the "New card" button ---------- */
  var ROLES = ['Member', 'Builder', 'Resolver', 'Protocol'];
  var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  var STORE = 'defxn-nft-next-number', counter = 0;
  // the next genesis number for a sample: after the sample records' numbers, and remembered by this
  // browser so a click never hands out a number twice here. The real numbers come with the mint.
  function takeNumber() {
    var base = top + 1, n;
    try {
      var saved = parseInt(window.localStorage.getItem(STORE), 10);
      n = saved >= base ? saved : base;
      window.localStorage.setItem(STORE, String(n + 1));
    } catch (e) { n = base + counter++; }
    return n;
  }
  // the SAMPLE record of a number, the same on every page and every visit: a sample card's own record
  // when one has that number and a .fxn name, otherwise one drawn from the number itself (its
  // identity is hashed from the number, so it is made up and says so: status Sample)
  var FIELDS = ['genesisId', 'identity', 'name', 'status', 'role', 'network', 'joined', 'serial'];
  function sampleRecord(n, tagline) {
    var known = (window.DEFXN_CARDS || []).filter(function (r) { return +r.genesisId === n && /\.fxn$/i.test(r.name || ''); })[0];
    if (known) { var r = {}; FIELDS.forEach(function (f) { r[f] = known[f]; }); r.tagline = known.tagline; return r; }
    var w = keyOfString('sample|' + n).concat(keyOfString('sample+|' + n)).slice(0, 5);
    var hex = w.map(function (x) { return ('00000000' + x.toString(16)).slice(-8); }).join('');
    var num = String(n), d = new Date();
    while (num.length < 3) num = '0' + num;
    return {
      genesisId: num, identity: '0x' + hex.toUpperCase(), name: hex.slice(0, 6) + '.fxn',
      status: 'Sample', role: ROLES[w[0] % ROLES.length], network: 'DEFXN',
      joined: (d.getDate() < 10 ? '0' : '') + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(),
      serial: num, tagline: tagline || ((window.DEFXN_CARDS || [])[0] || {}).tagline || []
    };
  }
  /* a real card's record, from its PVA as js/ark/chain-cards.mjs verified it ({ id, owner, mintedAt }). It has no
     number (owner, 2026-10-25): the Genesis ID line shows the short object id. The name line shows the public id's
     name, made from its key (pva.name, chain::key_name), or the short key when a caller has not computed it. */
  function objectRecord(pva, network) {
    var d = new Date((pva.mintedAt || 0) * 1000), short = function (h) { return h.slice(0, 6) + '…' + h.slice(-4); };
    return {
      objectId: pva.id, objectMix: pva.mix || null, genesisId: short(pva.id), identity: '0x' + String(pva.owner).toUpperCase(), name: pva.name || short(pva.owner),
      status: 'Active', role: 'Member', network: network || 'DEFXN',
      joined: (d.getUTCDate() < 10 ? '0' : '') + d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear(),
      serial: pva.id.slice(0, 4), tagline: ((window.DEFXN_CARDS || [])[0] || {}).tagline || []
    };
  }
  // kept for card.html's New card: the next sample number's record
  function newRecord(n, tagline) { return sampleRecord(n, tagline); }

  /* ---------- the parts a table leaves out, loaded when a card needs them ----------
     The full layers-bundle.js (the design pages) holds every drawing and every 3D setting. The site's
     table (js/nft/skin-bundle.js) holds names, weights, palettes and chrome settings only, so a page
     that dresses itself loads no 3D. need(element) completes ONE element, once per page:
       chrome   its drawing, from the file element.chunk names (js/nft/chrome/...)
       build    its 3D settings, from js/nft/art-bundle.js (the whole add-on, once), then the builder
                file that registers its builder, element.sheet (js/nft/builders/...), if not art3d.js's own
     Files load through the site's loader when there is one (ArkUI.loadScript takes only js/... paths),
     and otherwise as a script from the site root, found from this file's own address. */
  var ROOT = (function () {
    var me = document.currentScript && document.currentScript.src, m = me && me.match(/^(.*\/)js\/nft\/[a-z0-9-]+\.js(?:[?#].*)?$/);
    return m ? m[1] : '/';
  })();
  var ART_FILE = 'js/nft/art-bundle.js', loads = {};
  function load(path) {
    if (loads[path]) return loads[path];
    var p = window.ArkUI && window.ArkUI.loadScript ? window.ArkUI.loadScript(path) : new Promise(function (resolve, reject) {
      var tag = document.createElement('script');
      tag.src = ROOT + path; tag.async = true;
      tag.onload = function () { resolve(); };
      tag.onerror = function () { tag.remove(); reject(new Error('Could not load ' + ROOT + path + '.')); };
      document.head.appendChild(tag);
    });
    return (loads[path] = p.catch(function (err) { delete loads[path]; throw err; }));
  }
  function withArt() {
    return load(ART_FILE).then(function () {
      var art = window.DEFXN_ART;
      if (!art || art.table !== window.DEFXN_LAYERS_TABLE) {
        throw new Error(ART_FILE + ' is from layer table ' + (art && art.table) + ', and this page has table ' + window.DEFXN_LAYERS_TABLE +
          '. Run docs/home-redesign/nft/make-layers.mjs to write both again.');
      }
      if (!art.merged) {
        LAYERS.forEach(function (layer) { layer.elements.forEach(function (e) { var a = art.elements[e.id]; if (a && e.kind === 'build') Object.keys(a).forEach(function (k) { e[k] = a[k]; }); }); });
        art.merged = true;
      }
    });
  }
  function need(e) {
    if (!e) return Promise.resolve(e);
    if (e.kind === 'chrome') {
      if (e.svg != null) return Promise.resolve(e);
      if (!e.chunk) return Promise.reject(new Error('The chrome element ' + e.id + ' has no drawing and names no file for it. Run docs/home-redesign/nft/make-layers.mjs.'));
      return load(e.chunk).then(function () {
        var svg = window.DEFXN_CHROME && window.DEFXN_CHROME[e.id];
        if (svg == null) throw new Error(e.chunk + ' loaded but holds no drawing for ' + e.id + '. The file and the table are from different builds: run docs/home-redesign/nft/make-layers.mjs.');
        e.svg = svg;
        return e;
      });
    }
    if (e.kind === 'build') {
      return (e.attrs ? Promise.resolve() : withArt()).then(function () {
        if (!e.attrs) throw new Error(ART_FILE + ' has no 3D settings for ' + e.id + '. Run docs/home-redesign/nft/make-layers.mjs.');
        return e.sheet ? load(e.sheet) : null;
      }).then(function () { return e; });
    }
    return Promise.resolve(e);
  }
  // every element a card wears, complete (for the chrome only: needAll(picks, 'chrome'))
  function needAll(picks, kind) {
    return Promise.all(CATEGORIES.map(function (l) { var e = picks[l.key]; return !kind || (e && e.kind === kind) ? need(e) : e; }));
  }
  // true when an element can be drawn now, with nothing left to load
  function ready(e) { return !e || (e.kind === 'chrome' ? e.svg != null : e.kind === 'build' ? !!e.attrs : true); }

  window.DEFXN_TRAITS = {
    UI_NAMES: UI_NAMES, uiName: uiName, layerKeyOf: layerKeyOf,
    need: need, needAll: needAll, ready: ready, load: load,
    LAYERS: LAYERS, WORN: WORN, CATEGORIES: CATEGORIES, wornOf: wornOf, CAP: CAP, pick: pick, dnaAt: dnaAt, elementsOf: elementsOf, numberOf: numberOf,
    takeNumber: takeNumber, newRecord: newRecord, sampleRecord: sampleRecord, objectRecord: objectRecord, dnaOfObject: dnaOfObject, mixDraw: mixDraw, mix: mix, ROLES: ROLES, words: words,
    TIERS: TIERS, score: score, problems: problems, REVIEW: REVIEW,
    skinOf: skinOf, skinText: skinText, wear: wear, bornWith: bornWith, price: price, skinCost: skinCost, SKIN_BASE_FXN: SKIN_BASE_FXN, keyOf: keyOf, keyHex: keyHex, keyOfString: keyOfString, prng: prng
  };
})();

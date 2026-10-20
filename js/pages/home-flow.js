/* Home: one record joins the FXN chain, played step by step (docs/whitepaper.md §1-2).

   The "now" tile illustrates the step: the holder signs a record that extends
   their own chain; the chain checks only grammar, signature, head and
   position, then copies it to K-of-N peers; a resolver reads what it means.
   The records stacked behind are the holder's earlier positions, each
   pointing to the one before. Under it, the five steps are listed once, as
   the step links that drive the scene. The scene plays through once and
   settles on the finished record (no idle loop: the play button replays it),
   pauses on hover/focus or with its own button, and stops when the page is
   hidden or the scene is out of view. Reduced motion, or a paused scene,
   shows one still frame with the steps still selectable. The example is
   illustrative. Regression: tests/home-hero-scene.cjs. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var STEP_MS = 3200;

  var ACTORS = [
    { id: 'holder', label: 'Holder' },
    { id: 'chain', label: 'Chain' },
    { id: 'resolver', label: 'Resolver' }
  ];
  /* Same mechanism, different meaning: the sign/check/extend/replicate steps
     never change -- only what the resolver reads at the end does. Switching
     cases is the fastest way to show that the chain itself has no idea
     which of these it is admitting. */
  var CASES = [
    { id: 'swaps', label: 'Swaps', party: 'studio.fxn', recordType: 'YLEDGERENTRY', amount: '36 FXN → studio.fxn', resolverName: 'DeFi resolver', says: 'An intent to swap. The launch’s signer resolves the batch and signs the result. That signed result is what peers store.' },
    { id: 'transfers', label: 'Transfers', party: 'alice.fxn', recordType: 'YTRANSFER', amount: '120 FXN → alice.fxn', resolverName: 'Transfers resolver', says: 'The transfers resolver reads the payload: 120 FXN to alice.fxn.' },
    { id: 'staking', label: 'Staking', party: 'provider.fxn', recordType: 'YSTAKE', amount: '500 FXN → provider.fxn', resolverName: 'Stake resolver', says: 'The stake resolver locks 500 FXN for provider.fxn’s seat.' },
    { id: 'governance', label: 'Governance', party: 'dao.fxn', recordType: 'YVOTE', amount: 'YES → proposal-14', resolverName: 'Governance resolver', says: 'The governance resolver reads the payload: a yes vote on proposal 14.' }
  ];
  var CASES_BY_ID = {};
  CASES.forEach(function (c) { CASES_BY_ID[c.id] = c; });
  ArkUI.chainCases = CASES;

  // The record being admitted, and the holder's chain behind it.
  var RECORD = { type: 'LEDGERENTRY · Y1A', hash: 'e058', pos: 42, prev: '2b9d' };
  var TRAIL = [{ pos: 41, hash: '2b9d' }, { pos: 40, hash: 'c41e' }, { pos: 39, hash: '7f3a' }, { pos: 38, hash: '91c6' }];
  // Checks on the record's band, lit once passed: Grammar, Signature, Chain head, K-of-N peers.
  var CHECKS = ['G', 'S', 'C', 'K'];
  var BASE_STEPS = [
    { id: 'sign', title: 'Sign', page: 'account', actors: ['holder'], checks: 0, says: 'The holder signs one record that extends their own chain, at position 42.' },
    { id: 'check', title: 'Check', page: 'stats', actors: ['chain'], checks: 2, says: 'The signature verifies and the record fits its grammar: the base grammar and, for a resolver’s record, the grammar that resolver published at launch. What it means is the resolver’s job.' },
    { id: 'extend', title: 'Extend', page: 'explorer', actors: ['chain'], checks: 3, says: 'It points to the current head, #2b9d, and position 42 is still free.' },
    { id: 'replicate', title: 'Replicate', page: 'stats', actors: ['chain'], checks: 4, says: 'Copied to 9 of 12 peers in this example. The other histories remain independent.' },
    { id: 'resolve', title: 'Resolve', page: 'resolver', actors: ['resolver'], checks: 4, says: 'An intent to swap. The launch’s signer resolves the batch and signs the result. That signed result is what peers store.' }
  ];

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }
  function icon(d) {
    var root = document.createElementNS(NS, 'svg');
    root.setAttribute('viewBox', '0 0 12 12'); root.setAttribute('aria-hidden', 'true');
    var path = document.createElementNS(NS, 'path'); path.setAttribute('d', d);
    root.appendChild(path);
    return root;
  }

  function svg(tag, attrs, text) {
    var node = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    if (text != null) node.textContent = text;
    return node;
  }

  /* The scene: one changing panel, not five stacked rows. The record is the
     same record throughout -- sign, check, extend, replicate, resolve are
     five things that happen TO it, not five places on a page -- so only one
     of them is ever drawn at a time, in the full width of the frame, and a
     tracker above it (built from the same accessible step links) shows
     where in the sequence it is. Switching panels is a cross-fade; nothing
     is stacked, nothing competes for space, and a tall list that used to
     force a scrollbar is just gone.

     Illustrative values: the hashes and the amount are examples, and the
     long fields are truncated to fit. The SHAPE is real. */

  /* The record's boxes, in wire order. `under` is the plain name on the page; `means` is the box's
     tooltip (an Ark glossary term on /chain), taken from the role-letter registry's own words
     (flx/flux-spec/registry/role-letters.json: name + summary for G, Y, V, M, C, S). J is the one
     letter the registry leaves to each record type (manifest-types.json), so its line says that. */
  var BLOCKS = [
    { text: 'G',            under: 'who',       means: 'G is the role letter for the Ghost identity key: who signed this record.' },
    { text: 'YLEDGERENTRY', under: 'what kind', means: 'Y is the role letter for the record type: what kind of record this is. What it means is the resolver’s job, not the chain’s.' },
    { text: 'V3',           under: 'version',   means: 'V is the role letter for the version: which version of the grammar the record follows.' },
    { text: 'M1760…',       under: 'when',      means: 'M is the role letter for the moment: when the record was made, in Unix seconds.' },
    { text: 'J42',          under: 'position',  means: 'J is the position: this record’s place in its holder’s own chain. Each record type declares what its J means.' },
    { text: 'C2b9d…',       under: 'extends',   means: 'C is the role letter for a content address: a link to another record by its exact content. Here it names the head this record extends.' },
    { text: 'S9f1…',        under: 'signature', means: 'S is the role letter for the signature, which proves the record is real and unchanged. It covers every box before it.' }
  ];
  var LAMPS = [
    { mark: 'G', name: 'grammar' },
    { mark: 'S', name: 'signature' },
    { mark: 'C', name: 'head' },
    { mark: 'K', name: 'peers' }
  ];
  var CHAIN = ['J38', 'J39', 'J40', 'J41', 'J42'];
  var PEERS = 12, PEERS_STORED = 9;

  /* The hero landscape: your chain, and the world it is connected to.

     Colour is data here, never decoration. Every history is monochrome; the
     ONE record whose state changes as the steps play, J42, carries the
     identity accent, and so do the marks that point at it: the head and, at
     the resolve step, the reference its resolution creates. A legend in the
     drawing says so. The accent's area follows --primary-scale (derived from
     its luminance in css/flux-themes.css), so a bright accent stays compact.

     Your chain runs through the middle. Four other chains sit around it, each
     with its own length and starting point because none waits on another, and
     each is tied to one of your records by a reference. What J42 is FOR
     differs per example, so the counterpart is drawn per example: a chain for
     a transfer, a pool for a swap, a provider's stake for staking, a ballot
     for a vote. The mechanism steps are the same in every one; only what the
     resolver reads changes, which is the point. */
  var LAND_MINE = { row: 2, start: 1, len: 7 };
  var LAND_OTHERS = [
    { row: 0, start: 3, len: 4, ref: 5, name: 'nova.fxn' },
    { row: 1, start: 0, len: 4, ref: 2, name: 'orbit.fxn' },
    { row: 3, start: 1, len: 4, ref: 3, name: 'mira.fxn' },
    { row: 4, start: 3, len: 4, ref: 5, name: 'kai.fxn' }
  ];
  var COUNTERPARTS = {
    transfers: { kind: 'chain', icon: 'transfer', tag: 'chain', give: '−120 FXN', take: '+120 FXN', coin: true },
    swaps: { kind: 'pool', icon: 'swap', tag: 'pool', give: '36 FXN in', take: 'quote out', coin: true },
    staking: { kind: 'stake', icon: 'stake', tag: 'stake', give: '500 FXN', take: 'bonded', coin: true },
    governance: { kind: 'ballot', icon: 'vote', tag: 'proposal-14', give: 'YES', take: 'YES 4 · NO 1' }
  };
  function drawLandscape(payload) {
    var root = svg('svg', { viewBox: '0 0 640 480', class: 'flow-scene flow-landscape', fill: 'none', 'data-case': payload.id });
    var STEP_X = 54, ROW_Y = 76, SIZE = 38, H = 16, LIFT = 18;
    var spec = COUNTERPARTS[payload.id] || COUNTERPARTS.swaps;
    function point(x, y, z) { return [308 + (x - y) * .76, 112 + (x + y) * .36 - z]; }
    function d(points, close) { return points.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ') + (close ? 'Z' : ''); }
    function add(parent, tag, attrs, value) { return parent.appendChild(svg(tag, attrs, value)); }
    function line(a, b, cls, parent) { return add(parent || root, 'path', { d: d([a, b]), class: cls }); }
    /* Every word in the drawing is data-ark-label: inside Ark's figure frame it is drawn at the frame's
       smallest label size (12px on screen) whatever the drawing's scale -- css/ark-blocks.css
       `.ark-figure__frame text[data-ark-label]`. The frame also measures that scale; so does `fit` below,
       because the pills round the words must grow with them. */
    function text(x, y, cls, value, parent) { return add(parent || root, 'text', { x: x, y: y, class: cls, 'data-ark-label': '' }, value); }
    // An icon from js/ark/icons.js, either upright (a tag) or laid flat on the floor plane.
    function icon(parent, name, at, size, flat, cls) {
      var paths = ArkUI.iconPaths && ArkUI.iconPaths[name];
      if (!paths) return null;
      var s = size / 24, m = flat ? [.76 * s, .36 * s, -.76 * s, .36 * s] : [s, 0, 0, s];
      var e = at[0] - 12 * (m[0] + m[2]), f = at[1] - 12 * (m[1] + m[3]);
      var g = add(parent, 'g', { class: 'land-icon ' + (cls || ''), transform: 'matrix(' + m.concat([e, f]).map(function (v) { return +v.toFixed(3); }).join(' ') + ')' });
      paths.forEach(function (p) { add(g, 'path', { d: p, 'vector-effect': 'non-scaling-stroke' }); });
      return g;
    }
    // The FXN coin mark (css/brand-marks.css), for any amount of FXN. Painted by CSS so it takes the ink around it.
    function coin(parent, cx, cy, size, cls) {
      return add(parent, 'rect', { x: cx - size / 2, y: cy - size / 2, width: size, height: size, class: 'land-coin ' + (cls || '') });
    }
    /* A name tag: a pill round an icon (or the coin) and its words. Its size follows the label size
       (`labelUnits`, in the drawing's own units), so the pill always holds the words at 12px on screen. */
    var LABEL_MIN = 12, labelUnits = 14, tags = [];
    function drawTag(t) {
      var L = labelUnits, h = L * 1.6 + 2, pad = L * .6, gap = L * .45, w = pad + L + gap + t.value.length * L * .66 + pad;
      var left = t.anchorEnd ? t.x - w : t.x, cy = t.y - 2;
      left = Math.max(4, Math.min(left, 636 - w));   // a pill stays inside the drawing, whatever size its words are drawn at
      while (t.g.firstChild) t.g.removeChild(t.g.firstChild);
      add(t.g, 'rect', { x: left, y: cy - h / 2, width: w, height: h, rx: h / 2 });
      if (t.name === 'fxn') coin(t.g, left + pad + L / 2, cy, L * 1.1); else icon(t.g, t.name, [left + pad + L / 2, cy], L, false);
      text(left + pad + L + gap, cy + L * .35, 'land-tag-text', t.value, t.g);
    }
    function tag(parent, x, y, name, value, anchorEnd, cls) {
      var t = { g: add(parent, 'g', { class: 'land-tag ' + (cls || '') }), x: x, y: y, name: name, value: value, anchorEnd: anchorEnd };
      tags.push(t); drawTag(t);
      return t.g;
    }
    function fit() {
      var width = root.getBoundingClientRect ? root.getBoundingClientRect().width : 0;
      if (!width) return;
      var next = Math.max(9, LABEL_MIN / (width / 640));
      if (Math.abs(next - labelUnits) < .5) return;
      labelUnits = next; tags.forEach(drawTag);
    }
    function block(parent, x, y, z, w, depth, h, cls) {
      var g = add(parent, 'g', { class: cls });
      var A = point(x, y, z), B = point(x + w, y, z), C = point(x + w, y + depth, z), D = point(x, y + depth, z);
      add(g, 'path', { d: d([D, C, point(x + w, y + depth, z - h), point(x, y + depth, z - h)], true), class: 'land-front' });
      add(g, 'path', { d: d([B, C, point(x + w, y + depth, z - h), point(x + w, y, z - h)], true), class: 'land-side' });
      add(g, 'path', { d: d([A, B, C, D], true), class: 'land-top' });
      return g;
    }
    function record(parent, x, y, z, cls) {
      var g = block(parent, x, y, z, SIZE, SIZE, H, 'land-record ' + (cls || ''));
      for (var band = 0; band < 3; band++) line(point(x + 9, y + 12 + band * 8, z), point(x + 30 - (band % 2) * 9, y + 12 + band * 8, z), 'land-inscription', g);
      return g;
    }

    // Floor: a quiet survey grid under the occupied area only.
    for (var gx = 0; gx <= 9; gx++) line(point(gx * STEP_X - 8, -20, -H), point(gx * STEP_X - 8, 5 * ROW_Y - 20, -H), 'land-grid');
    for (var gy = 0; gy <= 5; gy++) line(point(-8, gy * ROW_Y - 20, -H), point(9 * STEP_X - 8, gy * ROW_Y - 20, -H), 'land-grid');

    // Everything that runs under the records: references, and votes already cast.
    var under = add(root, 'g', { class: 'land-under' });
    var MY = LAND_MINE.row * ROW_Y, J42X = (LAND_MINE.start + LAND_MINE.len - 1) * STEP_X;
    // References first, so they run under the records they join.
    LAND_OTHERS.forEach(function (other) {
      var x = other.ref * STEP_X + SIZE / 2, y0 = other.row * ROW_Y + SIZE / 2, y1 = MY + SIZE / 2;
      add(under, 'path', { d: d([point(x, y0, -H / 2), point(x, y1, -H / 2 + (other.row < LAND_MINE.row ? 0 : LIFT / 2))]), class: 'land-reference' });
    });

    // Draw back to front: rows behind yours, yours, rows in front.
    // Names sit on their own layer, above every record, so no row can bury one.
    var labels = svg('g', { class: 'land-labels' });
    var tiles = [], fresh = null;
    function drawOther(other) {
      var history = add(root, 'g', { class: 'land-history' });
      var y = other.row * ROW_Y;
      line(point(other.start * STEP_X, y + SIZE / 2, -H), point((other.start + other.len) * STEP_X - 16, y + SIZE / 2, -H), 'land-history-line', history);
      for (var c = 0; c < other.len; c++) tiles.push(record(history, (other.start + c) * STEP_X, y, 0));
      var at = point(other.start * STEP_X - 8, y + SIZE / 2, 0);
      tag(labels, at[0], at[1] + 4, 'account', other.name, true, 'land-party');
    }
    LAND_OTHERS.filter(function (o) { return o.row < LAND_MINE.row; }).forEach(drawOther);
    var mine = add(root, 'g', { class: 'land-history land-history-mine' });
    line(point(LAND_MINE.start * STEP_X, MY + SIZE / 2, LIFT - H), point(J42X + SIZE, MY + SIZE / 2, LIFT - H), 'land-history-line', mine);
    for (var c = 0; c < LAND_MINE.len; c++) {
      var isNew = c === LAND_MINE.len - 1, x = (LAND_MINE.start + c) * STEP_X;
      var g = record(mine, x, MY, LIFT, 'land-record-main' + (isNew ? ' land-record-new' : ''));
      if (isNew) {
        add(g, 'path', { d: d([point(x + 5, MY + 5, LIFT), point(x + SIZE - 5, MY + 5, LIFT), point(x + SIZE - 5, MY + SIZE - 5, LIFT), point(x + 5, MY + SIZE - 5, LIFT)], true), class: 'land-accent' });
        icon(g, spec.icon, point(x + SIZE / 2, MY + SIZE / 2, LIFT), 22, true, 'land-accent-icon');
        fresh = g;
      }
      if (c === 0 || isNew) {
        var label = point(x + 4, MY + SIZE + 1, LIFT - 3);
        add(g, 'text', { x: label[0], y: label[1], transform: 'rotate(25.3 ' + label[0] + ' ' + label[1] + ')', class: 'land-index', 'data-ark-label': '' }, 'J' + (36 + c));
      }
      tiles.push(g);
    }
    var mineAt = point(LAND_MINE.start * STEP_X - 8, MY + SIZE / 2, LIFT);
    tag(labels, mineAt[0], mineAt[1] + 4, 'account', 'you.fxn', true, 'land-party land-party-mine');
    line(point(J42X - STEP_X + SIZE, MY + SIZE / 2, LIFT - 4), point(J42X, MY + SIZE / 2, LIFT - 4), 'land-current', mine);
    LAND_OTHERS.filter(function (o) { return o.row > LAND_MINE.row; }).forEach(drawOther);

    // The counterpart: what J42 is about, drawn per example, east of your head.
    var CX = J42X + STEP_X * 2.4, CY = MY + ROW_Y * .9;
    var counterpart = add(root, 'g', { class: 'land-counterpart land-counterpart-' + spec.kind, 'data-kind': spec.kind });
    var topZ = 0, landing;
    if (spec.kind === 'chain') {
      for (var k = 0; k < 3; k++) record(counterpart, CX - STEP_X + k * STEP_X * .8, CY, 0, 'land-record-party');
      landing = point(CX + STEP_X * .6 + SIZE / 2, CY + SIZE / 2, 0);
      icon(counterpart, 'transfer', point(CX + STEP_X * .6 + SIZE / 2, CY + SIZE / 2, 0), 18, true, 'land-object-icon');
    } else if (spec.kind === 'pool') {
      var c0 = point(CX + 22, CY + 22, 0), c1 = point(CX + 22, CY + 22, 26), rx = 46, ry = 22;
      add(counterpart, 'path', { d: 'M' + (c0[0] - rx) + ' ' + c0[1] + 'A' + rx + ' ' + ry + ' 0 0 0 ' + (c0[0] + rx) + ' ' + c0[1] + 'V' + c1[1] + 'H' + (c1[0] - rx) + 'Z', class: 'land-front' });
      add(counterpart, 'ellipse', { cx: c1[0], cy: c1[1], rx: rx, ry: ry, class: 'land-top' });
      add(counterpart, 'path', { d: 'M' + c1[0] + ' ' + (c1[1] - ry) + 'V' + (c1[1] + ry), class: 'land-pool-split' });
      icon(counterpart, 'swap', c1, 24, true, 'land-object-icon');
      topZ = 26; landing = c1;
    } else if (spec.kind === 'stake') {
      for (var s = 0; s < 3; s++) block(counterpart, CX, CY, s * 12, 44, 44, 10, 'land-slab');
      var bonded = block(counterpart, CX, CY, 36, 44, 44, 10, 'land-slab land-slab-new');
      add(bonded, 'path', { d: d([point(CX + 6, CY + 6, 36), point(CX + 38, CY + 6, 36), point(CX + 38, CY + 38, 36), point(CX + 6, CY + 38, 36)], true), class: 'land-accent' });
      icon(counterpart, 'stake', point(CX + 22, CY + 22, 24), 20, true, 'land-object-icon land-object-under');
      topZ = 36; landing = point(CX + 22, CY + 22, 36);
    } else {
      block(counterpart, CX, CY, 30, 48, 48, 30, 'land-ballot');
      line(point(CX + 12, CY + 24, 30), point(CX + 36, CY + 24, 30), 'land-ballot-slot', counterpart);
      icon(counterpart, 'vote', point(CX + 24, CY + 36, 30), 16, true, 'land-object-icon');
      topZ = 30; landing = point(CX + 24, CY + 24, 30);
      // Other chains have already voted: their references converge on the ballot.
      LAND_OTHERS.forEach(function (other) {
        var from = point((other.start + other.len - 1) * STEP_X + SIZE / 2, other.row * ROW_Y + SIZE / 2, 0);
        add(under, 'path', { d: 'M' + from.join(' ') + 'Q' + ((from[0] + landing[0]) / 2) + ' ' + (Math.min(from[1], landing[1]) - 40) + ' ' + landing.join(' '), class: 'land-vote' });
      });
    }
    var tagAt = point(CX + 44, CY + 44, 0);
    root.appendChild(labels);
    tag(labels, tagAt[0] - 64, tagAt[1] + 18, 'account', payload.party + (spec.kind === 'chain' ? '' : ' · ' + spec.tag), false, 'land-party land-party-counterpart');

    // The head: one tiny accent point, the counterweight to the headline.
    var head = add(root, 'g', { class: 'land-head' });
    add(head, 'path', { d: 'M0 0V-30', class: 'land-head-stem' });
    add(head, 'circle', { cx: 0, cy: -34, r: 4, class: 'land-head-dot' });
    text(8, -31, 'land-meta land-head-label', 'HEAD', head);
    function headAt(col) { var p = point((LAND_MINE.start + col) * STEP_X + SIZE / 2, MY + SIZE / 2, LIFT); head.style.transform = 'translate(' + p[0].toFixed(1) + 'px,' + p[1].toFixed(1) + 'px)'; }

    // Resolve: the reference J42's resolution creates, and what it changed.
    var newTop = point(J42X + SIZE / 2, MY + SIZE / 2, LIFT);
    var resolution = add(root, 'g', { class: 'land-resolution' });
    add(resolution, 'path', { d: 'M' + newTop.join(' ') + 'Q' + ((newTop[0] + landing[0]) / 2 + 20) + ' ' + (Math.min(newTop[1], landing[1]) - 56) + ' ' + landing.join(' '), class: 'land-resolution-ref' });
    tag(resolution, newTop[0] - 14, newTop[1] - 46, spec.coin ? 'fxn' : spec.icon, spec.give, true, 'land-result');
    tag(resolution, landing[0] + 10, landing[1] - 30, 'check', spec.take, false, 'land-result');
    add(resolution, 'path', { d: 'M' + newTop[0].toFixed(1) + ' ' + (newTop[1] - 58).toFixed(1) + 'V76', class: 'land-leader' });
    var card = add(resolution, 'g', { class: 'land-resolver' });
    add(card, 'rect', { x: 372, y: 14, width: 252, height: 66, class: 'land-panel' });
    icon(card, 'resolver', [396, 47], 22, false, 'land-card-icon');
    text(418, 38, 'land-meta', payload.resolverName, card);
    if (spec.coin) coin(card, 424, 62, 16, 'land-coin-card');
    text(spec.coin ? 438 : 418, 66, 'land-value', payload.amount, card);

    // Title and the colour legend: what each mark means, said in the picture.
    text(16, 28, 'land-label', 'A CHAIN OF CHAINS');
    var legend = add(root, 'g', { class: 'land-legend' });
    [['land-key-accent', 'Record in flight'], ['land-key-history', 'Signed history'], ['land-key-ref', 'Reference']].forEach(function (item, i) {
      var y = 52 + i * 20;
      if (i === 2) add(legend, 'path', { d: 'M16 ' + (y - 4) + 'h12', class: item[0] });
      else add(legend, 'rect', { x: 17, y: y - 9, width: 9, height: 9, class: item[0] });
      text(36, y, 'land-meta', item[1], legend);
    });

    // Readout: the instrument for the current step, on the heavy anchor.
    var readout = add(root, 'g', { class: 'land-readout' });
    add(readout, 'rect', { x: 16, y: 376, width: 292, height: 92, class: 'land-panel land-panel-heavy' });
    var stepIcon = add(readout, 'g', {});
    var stepLabel = text(42, 398, 'land-meta', '', readout), stepValue = text(28, 454, 'land-value', '', readout);
    var marks = add(readout, 'g', { class: 'land-marks' });
    var checks = LAMPS.map(function (lamp, k) {
      var m = add(marks, 'g', { class: 'land-check', 'data-mark': lamp.mark });
      add(m, 'rect', { x: 28 + k * 26, y: 410, width: 20, height: 20 });
      add(m, 'text', { x: 38 + k * 26, y: 425, 'text-anchor': 'middle', 'data-ark-label': '' }, lamp.mark);
      return m;
    });
    var peers = [];
    for (var p = 0; p < PEERS; p++) peers.push(add(marks, 'rect', { x: 28 + p * 20, y: 414, width: 12, height: 12, class: 'land-peer' }));

    var STEP_ICONS = { sign: 'sign', check: 'check', extend: 'chain', replicate: 'peers', resolve: 'resolver' };
    var READOUT = {
      sign: ['01 / SIGN', 'J42 · ' + payload.recordType + ' · signed'],
      check: ['02 / CHECK', 'All four checks pass together'],
      extend: ['03 / EXTEND', 'J42 → previous head #2b9d'],
      replicate: ['04 / REPLICATE', PEERS_STORED + ' of ' + PEERS + ' peers hold J42'],
      resolve: ['05 / RESOLVE', 'A reference to ' + payload.party]
    };
    /* The pills follow the drawing's scale (the same quantity Ark's figure frame measures). */
    var observer = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null;
    if (observer) observer.observe(root);
    return { svg: root, dispose: function () { if (observer) observer.disconnect(); }, paint: function (i) {
      var id = BASE_STEPS[i].id, placed = i >= 2;
      root.setAttribute('data-phase', id);
      root.setAttribute('data-placed', String(placed));
      headAt(LAND_MINE.len - (placed ? 1 : 2));
      checks.forEach(function (m) { m.setAttribute('data-on', String(i >= 1)); m.setAttribute('data-shown', String(i === 1)); });
      peers.forEach(function (peer, k) { peer.setAttribute('data-on', String(k < PEERS_STORED)); peer.setAttribute('data-shown', String(i === 3)); });
      stepIcon.textContent = ''; icon(stepIcon, STEP_ICONS[id], [32, 394], 12, false, 'land-step-icon');
      stepLabel.textContent = READOUT[id][0];
      stepValue.textContent = READOUT[id][1];
      stepValue.setAttribute('y', i === 1 || i === 3 ? 454 : 436);
      resolution.setAttribute('data-shown', String(i === 4));
      counterpart.setAttribute('data-resolved', String(i === 4));
    } };
  }

  /* The swap as signed resolution, from the manifest's spec { caption, flow: [step, ...], refusal: { from, tag } }:
     Ark's steps (the order the batch goes through) and callout (the refusal a second node meets; its tag names the
     signer, who is the example's party), folded behind Ark's disclosure so the Resolve step stays one box and a line.
     Without the block kit (a toy DOM) there is no diagram: the payload above it is the step. */
  function swapDiagram(spec, payload) {
    if (!(ArkUI.blocks && typeof ArkUI.blocks.render === 'function')) return null;
    function sentence(text) { return String(text).charAt(0).toUpperCase() + String(text).slice(1); }
    var blocks = [{ block: 'steps', props: { label: spec.caption, items: (spec.flow || []).map(function (text) { return { title: sentence(text) }; }) } }];
    if (spec.refusal) blocks.push({ block: 'callout', props: { tone: 'warning', title: sentence(spec.refusal.from) + ' is refused', body: String(spec.refusal.tag).replace('<signer>', payload.party) } });
    try { return ArkUI.blocks.render({ block: 'disclosure', id: 'flow-swap', props: { more: 'How a swap is resolved', less: 'Hide how a swap is resolved', blocks: blocks } }, { onInvalid: 'throw' }); } catch (error) { return null; }
  }

  /* One box of the record: its letters, with what the box is one hover, focus or tap away -- Ark's
     glossary term (ArkUI.blocks), whose tip is the trigger's accessible description too. The tip's
     words are not the box's words (tests/lib/layout-continuity.cjs sets term tips aside). Without
     the block kit (a toy DOM) the box is its letters alone. */
  function boxText(text, means) {
    var box = el('span', 'flow-block-text');
    var tip = null;
    if (means && ArkUI.blocks && typeof ArkUI.blocks.render === 'function') {
      try { tip = ArkUI.blocks.render({ block: 'term', props: { term: text, definition: means } }, { onInvalid: 'throw' }); } catch (error) { tip = null; }
    }
    if (tip) box.appendChild(tip); else box.textContent = text;
    return box;
  }

  /* The plain scene (/chain): HTML, not SVG, so the record's wire grammar and every caption stay
     at least 12px on a phone and wrap instead of shrinking (docs/ux-audit/pages-ux-a.md /chain: the
     SVG drew the record at about 6px at 390px wide). One panel per step, stacked in one cell and
     cross-faded; only the current one is shown, the others are aria-hidden. The rich scene (home)
     is the landscape above. */
  function drawScene(payload, rich, diagram) {
    if (rich) return drawLandscape(payload);
    var root = el('div', 'flow-scene flow-plain');
    function panel(id, label) {
      var p = el('div', 'flow-panel');
      p.setAttribute('data-panel', id);
      if (label) p.setAttribute('aria-label', label);
      root.appendChild(p);
      return p;
    }
    function staggered(node, i) { node.setAttribute('style', '--i:' + i); return node; }

    /* SIGN -- the record, field by field: the actual wire grammar, not a stylised card. That is
       the part nothing else on the site shows, so it is a real list a screen reader reads too. */
    var pSign = panel('sign');
    var format = el('ol', 'flow-record-format');
    format.setAttribute('aria-label', 'The record, field by field');
    BLOCKS.forEach(function (b, i) {
      var item = staggered(el('li', 'flow-block'), i);
      item.setAttribute('data-i', String(i));
      item.appendChild(boxText(i === 1 ? payload.recordType : b.text, b.means));
      item.appendChild(el('span', 'flow-block-under', b.under));
      format.appendChild(item);
    });
    pSign.appendChild(format);

    /* CHECK -- four lamps, lit together: grammar, signature, head, peers. Meaning is never one of them. */
    var pCheck = panel('check');
    var lampRow = el('div', 'flow-lamps');
    var lamps = LAMPS.map(function (l, i) {
      var lamp = staggered(el('span', 'flow-lamp'), i);
      lamp.setAttribute('data-mark', l.mark);
      lamp.appendChild(el('span', 'flow-lamp-mark', l.mark));
      lamp.appendChild(el('span', 'flow-lamp-name', l.name));
      lampRow.appendChild(lamp);
      return lamp;
    });
    pCheck.appendChild(lampRow);
    pCheck.appendChild(el('p', 'flow-band-sub', 'meaning is never checked here'));

    /* EXTEND -- the holder's own chain, which this record joins. */
    var pExtend = panel('extend');
    var chainRow = el('div', 'flow-chain');
    var links = [];
    var nodes = CHAIN.map(function (name, i) {
      if (i > 0) { var link = staggered(el('span', 'flow-link'), i); link.setAttribute('aria-hidden', 'true'); chainRow.appendChild(link); links.push(link); }
      var node = staggered(el('span', 'flow-node'), i);
      node.setAttribute('data-i', String(i));
      node.appendChild(el('span', 'flow-node-text', name));
      chainRow.appendChild(node);
      return node;
    });
    pExtend.appendChild(chainRow);
    pExtend.appendChild(el('p', 'flow-band-sub', 'one chain per identity · nobody else had to wait'));

    /* REPLICATE -- peers filling in as they store it; a partial quorum reads as partial. */
    var pReplicate = panel('replicate');
    var peerRow = el('div', 'flow-peers');
    var peers = [];
    for (var p = 0; p < PEERS; p++) peers.push(peerRow.appendChild(staggered(el('span', 'flow-peer'), p)));
    pReplicate.appendChild(peerRow);
    var peerCount = pReplicate.appendChild(el('p', 'flow-band-sub'));

    /* RESOLVE -- what it means, which only a resolver decides. */
    var pResolve = panel('resolve');
    var meaning = el('div', 'flow-meaning-box');
    meaning.appendChild(el('strong', 'flow-meaning-text', payload.amount));
    meaning.appendChild(el('span', 'flow-meaning-who', payload.resolverName));
    pResolve.appendChild(meaning);
    /* A swap is the one example whose resolution is a batch: two intents, one signer, one signed result for
       the peers, and a second node's result refused. The diagram is the manifest's own (chain.meta.diagrams,
       docs/ux-audit/ledger.md 4.5); it stands under the payload, which stays. */
    var swap = diagram && payload.id === 'swaps' ? swapDiagram(diagram, payload) : null;
    if (swap) pResolve.appendChild(swap);

    var panels = { sign: pSign, check: pCheck, extend: pExtend, replicate: pReplicate, resolve: pResolve };

    return {
      svg: root,
      paint: function (i) {
        var step = BASE_STEPS[i];
        Object.keys(panels).forEach(function (id) {
          panels[id].setAttribute('class', 'flow-panel' + (id === step.id ? ' flow-panel-active' : ''));
          if (id === step.id) panels[id].removeAttribute('aria-hidden'); else panels[id].setAttribute('aria-hidden', 'true');
        });
        lamps.forEach(function (l) { l.setAttribute('data-on', String(i >= 1)); });
        nodes.forEach(function (n, k) { n.setAttribute('data-on', String(i >= 2 || k < CHAIN.length - 1)); n.setAttribute('data-new', String(i >= 2 && k === CHAIN.length - 1)); });
        links.forEach(function (l, k) { l.setAttribute('data-on', String(i >= 2 || k < links.length - 1)); });
        peers.forEach(function (d, k) { d.setAttribute('data-on', String(i >= 3 && k < PEERS_STORED)); });
        peerCount.textContent = PEERS_STORED + ' of ' + PEERS + ' peers hold it · the acknowledgement waited on them';
      }
    };
  }


  /* The left of the hero: an interconnected world, drawn as a transit map.
     Your chain is the heavy line through the middle; the chains around it are
     lighter lines that cross yours at interchanges, where one of your records
     is referenced. Each example's counterparty is one of those lines, and the
     selected one is drawn in full ink. Monochrome on purpose: the single
     accent on the page belongs to the record in flight on the right.
     The lines draw in once and then hold still. */
  var WORLD_LINES = [
    { name: 'nova.fxn', d: 'M40 24H92L164 96L236 168H330', stations: [[40, 24], [92, 24], [236, 168], [300, 168]], label: [40, 12, 'start'] },
    { name: 'alice.fxn', d: 'M112 176H164L244 96V20', stations: [[112, 176], [244, 52], [244, 20]], label: [112, 194, 'start'] },
    { name: 'studio.fxn', d: 'M262 20H284L324 60V132L364 172H420', stations: [[262, 20], [324, 132], [420, 172]], label: [262, 12, 'start'] },
    { name: 'provider.fxn', d: 'M404 172V96L460 40H540', stations: [[404, 172], [460, 40], [540, 40]], label: [540, 28, 'end'] },
    { name: 'dao.fxn', d: 'M484 60V172', stations: [[484, 60], [484, 172]], label: [484, 190, 'middle'] }
  ];
  var WORLD_CROSSINGS = [164, 244, 324, 404, 484];
  ArkUI.buildChainWorld = function (options) {
    var root = svg('svg', { viewBox: '0 0 560 200', class: 'hl-world', fill: 'none', 'aria-hidden': 'true' });
    var lines = {};
    var others = svg('g', { class: 'world-others' });
    root.appendChild(others);
    WORLD_LINES.forEach(function (line, i) {
      var g = svg('g', { class: 'world-line', 'data-name': line.name, style: '--i:' + (i + 1) });
      g.appendChild(svg('path', { d: line.d, class: 'world-track', pathLength: 1 }));
      line.stations.forEach(function (p) { g.appendChild(svg('circle', { cx: p[0], cy: p[1], r: 3, class: 'world-station' })); });
      var label = svg('text', { x: line.label[0], y: line.label[1], 'text-anchor': line.label[2], class: 'world-name' }, line.name);
      g.appendChild(label);
      others.appendChild(g); lines[line.name] = g;
    });
    // Your chain, drawn last so it reads as the line everything else meets.
    var mine = svg('g', { class: 'world-line world-mine', style: '--i:0' });
    mine.appendChild(svg('path', { d: 'M104 96H536', class: 'world-track', pathLength: 1 }));
    for (var x = 124; x <= 524; x += 40) {
      if (WORLD_CROSSINGS.indexOf(x) >= 0) mine.appendChild(svg('rect', { x: x - 7, y: 89, width: 14, height: 14, rx: 4, class: 'world-interchange' }));
      else mine.appendChild(svg('rect', { x: x - 4, y: 92, width: 8, height: 8, class: 'world-record' }));
    }
    var tagG = svg('g', { class: 'world-you' });
    tagG.appendChild(svg('rect', { x: 8, y: 84, width: 88, height: 24, rx: 12 }));
    var paths = ArkUI.iconPaths && ArkUI.iconPaths.account;
    if (paths) {
      var ic = svg('g', { class: 'world-icon', transform: 'translate(16 88) scale(.6667)' });
      paths.forEach(function (p) { ic.appendChild(svg('path', { d: p })); });
      tagG.appendChild(ic);
    }
    tagG.appendChild(svg('text', { x: 36, y: 100, class: 'world-you-name' }, 'you.fxn'));
    mine.appendChild(tagG);
    root.appendChild(mine);
    function select(caseId) {
      var party = (CASES_BY_ID[caseId] || CASES_BY_ID.swaps).party;
      Object.keys(lines).forEach(function (name) { lines[name].setAttribute('data-selected', String(name === party)); });
    }
    select(options && options.caseId);
    return { element: root, select: select };
  };

  /* The five steps of one example, in order: [{ id, title, page, says }]. Only the last step's words
     are the example's own (what the resolver reads); the mechanism before it never changes. */
  function stepsFor(caseId) {
    var payload = CASES_BY_ID[caseId] || CASES_BY_ID.swaps;
    return BASE_STEPS.map(function (step, i) {
      if (i < BASE_STEPS.length - 1) return step;
      var last = {};
      for (var key in step) last[key] = step[key];
      last.says = payload.says;
      return last;
    });
  }
  ArkUI.chainSteps = stepsFor;

  /* The step picker, as an Ark block: the five steps are tabs, and the open tab's panel is the
     step's own words (a quote, as the scene's caption was). With `links` (/chain) the panel also
     opens the page that shows that part for real, through the site's one link resolver. It replaces
     the hand-built `home-cycle-step` / `flow-record` list of buttons and links. Its spec is
     ArkUI.chainStepsBlock; ArkUI.buildChainSteps (below) renders it into a scene. */
  ArkUI.chainStepsBlock = function (caseId, options) {
    options = options || {};
    var catalog = ArkUI.pageCatalog || {};
    var items = stepsFor(caseId).map(function (step) {
      var item = { value: step.id, label: step.title, content: '“' + step.says + '”' };
      if (options.links) {
        var entry = catalog[step.page] || {};
        var name = String(entry.short || entry.title || step.page).split(' — ')[0];
        item.blocks = [{ block: 'actions', props: { items: [{ label: 'See it for real: ' + name, href: 'route:' + step.page, tone: 'link' }] } }];
      }
      return item;
    });
    /* The picker's descendants are keyed under it, not by their place in the flow (where the picker took the
       step list's place, and the scene's tile would count after it): one new key for the root. */
    var was = {};
    for (var ref in options.was) was[ref] = options.was[ref];
    if (!was[':root']) was[':root'] = 'page:/steps/' + (options.id || caseId);
    return { block: 'tabs', id: options.id, was: was, props: { label: 'The five steps', variant: 'tabs', activation: 'automatic', defaultValue: items[0].value, items: items } };
  };

  /* Join a rendered step picker to the flow it drives. Choosing a step (a press, or an arrow key,
     which Ark's tabs activate on focus) holds the scene on it; moving the pointer or focus away lets
     the scene go on from there. The scene moving by itself chooses the tab (the tab's own press, so
     Ark's tabs keep their one source of truth). Each tab is stamped data-stage, which
     js/lattice.js reads to light the background mesh for the step under the pointer. */
  ArkUI.bindChainSteps = function (picker, flow, caseId) {
    if (!picker || !flow) return;
    var list = picker.querySelector('[data-ark-part="tabs-list"]');
    var tabs = list ? Array.prototype.slice.call(list.querySelectorAll('[role="tab"]')) : [];
    var steps = stepsFor(caseId), syncing = false;
    function chosen() {
      for (var k = 0; k < tabs.length; k++) if (tabs[k].getAttribute('aria-selected') === 'true') return k;
      return -1;
    }
    function follow(i) {
      if (!tabs[i] || chosen() === i) return;
      syncing = true;
      try { tabs[i].click(); } finally { syncing = false; }
    }
    tabs.forEach(function (tab, i) {
      tab.setAttribute('data-stage', steps[i].id);
      tab.addEventListener('pointerenter', function () { flow.hold(i); });
      tab.addEventListener('focus', function () { if (!syncing) flow.hold(i); });
      tab.addEventListener('pointerleave', function () { flow.release(); });
      tab.addEventListener('blur', function () { flow.release(); });
      tab.addEventListener('click', function () { if (!syncing) flow.hold(i); });
    });
    flow.subscribe(follow);
    follow(flow.step());
  };

  /* The scene's step picker, in place: the Ark tabs block rendered at the top of the flow (inside the
     figure frame the page puts the flow in, where the hand-built list stood) and joined to it.
     options: { id, was, links } as ArkUI.chainStepsBlock. Returns the picker. */
  ArkUI.buildChainSteps = function (flow, caseId, options) {
    var picker = ArkUI.blocks.render(ArkUI.chainStepsBlock(caseId, options), { onInvalid: 'throw' });
    flow.element.insertBefore(picker, flow.element.firstChild);
    ArkUI.bindChainSteps(picker, flow, caseId);
    return picker;
  };

  ArkUI.buildChainFlow = function (options) {
    var payload = CASES_BY_ID[options.caseId] || CASES_BY_ID.swaps;
    var STEPS = stepsFor(payload.id);
    var root = el('div', options.rich ? 'flow flow-rich' : 'flow');
    root.dataset.step = '0';
    root.dataset.case = payload.id;
    var listeners = [], shown = 0;

    // Now: the one panel that answers the selected step. The step picker (an Ark tabs block the page
    // places above it, ArkUI.chainStepsBlock) says the step in words.
    var now = el('div', 'flow-now');
    var scene = drawScene(payload, options.rich, options.diagram);
    // The landscape is a picture of the step the words say; the plain scene's record is real content.
    if (options.rich) scene.svg.setAttribute('aria-hidden', 'true');
    now.appendChild(scene.svg);
    root.appendChild(now);

    var toggle = el('button', 'flow-toggle');
    toggle.type = 'button';
    toggle.appendChild(icon('M3 2h2v8H3zM7 2h2v8H7z'));
    toggle.appendChild(icon('M3 1.5v9l7.5-4.5z'));
    // Sits in the scene tile's bottom-right corner, beside the quote.
    now.appendChild(toggle);

    var reduce = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    /* It plays ONCE and settles on the finished record (defxn motion law: no idle loop; the
       audit measured /chain cycling forever). `ended` holds it there; the play button replays. */
    var current = 0, held = -1, userPaused = false, timer = 0, disposed = false, inView = true, ended = false;

    function show(i, complete) {
      var step = STEPS[i];
      shown = i;
      root.dataset.step = String(i);
      root.dataset.complete = complete ? 'true' : 'false';
      root.dataset.actors = step.actors.join(' ');
      scene.paint(i);
      listeners.forEach(function (listener) { listener(i, complete); });
      root.classList.remove('flow-run'); void root.offsetWidth; root.classList.add('flow-run');
    }
    function still() {
      return reduce.matches || userPaused || ended || held >= 0 || disposed || !inView ||
        (typeof document !== 'undefined' && document.hidden) ||
        !!(root.closest && root.closest('[hidden]')) ||
        !!(ArkUI.sceneState && ArkUI.sceneState.get().paused);
    }
    function paintToggle() {
      var playing = !reduce.matches && !userPaused && !ended && inView && !document.hidden && !(ArkUI.sceneState && ArkUI.sceneState.get().paused);
      toggle.setAttribute('aria-label', playing ? 'Pause the chain animation' : ended ? 'Play the chain animation again' : 'Play the chain animation');
      toggle.title = playing ? 'Pause' : 'Play';
      root.dataset.playing = playing ? 'true' : 'false';
    }
    function schedule() {
      clearTimeout(timer); timer = 0;
      if (still() || current >= STEPS.length - 1) return;
      timer = setTimeout(function () {
        if (still()) { schedule(); return; }
        current += 1;
        if (current === STEPS.length - 1) { ended = true; paintToggle(); }
        show(current, current === STEPS.length - 1);
        schedule();
      }, STEP_MS);
    }
    function hold(i) { held = i; root.dataset.held = 'true'; show(i, i === STEPS.length - 1); clearTimeout(timer); timer = 0; }
    function release() { if (held < 0) return; current = held; held = -1; delete root.dataset.held; schedule(); }

    toggle.addEventListener('click', function () {
      if (ended) { ended = false; userPaused = false; current = 0; show(0, false); }
      else userPaused = !userPaused;
      paintToggle(); schedule();
    });
    function wake() { paintToggle(); schedule(); }
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', wake);
    function reducedChanged() { paintToggle(); show(reduce.matches ? STEPS.length - 1 : current, reduce.matches); schedule(); }
    if (reduce.addEventListener) reduce.addEventListener('change', reducedChanged);
    var unsubscribe = ArkUI.sceneState && ArkUI.sceneState.subscribe ? ArkUI.sceneState.subscribe(wake) : null;
    var visibility = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(function(entries){inView=entries[0].isIntersecting;wake();},{threshold:.1}) : null;
    if(visibility)visibility.observe(root);

    paintToggle();
    if (reduce.matches) { current = STEPS.length - 1; ended = true; show(current, true); }
    else show(0, false);
    schedule();

    return {
      element: root,
      restore: schedule,
      /* the step picker's side: hold the scene on step i, let go, say which step shows, and hear
         every change (ArkUI.bindChainSteps) */
      hold: hold,
      release: release,
      step: function () { return shown; },
      subscribe: function (listener) { listeners.push(listener); },
      dispose: function () {
        disposed = true; clearTimeout(timer);
        if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', wake);
        if (reduce.removeEventListener) reduce.removeEventListener('change', reducedChanged);
        if (visibility) visibility.disconnect();
        if (scene.dispose) scene.dispose();
        if (typeof unsubscribe === 'function') unsubscribe();
      }
    };
  };
})();

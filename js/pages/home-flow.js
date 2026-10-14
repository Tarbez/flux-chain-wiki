/* Home: one record joins the FXN chain, played step by step (docs/whitepaper.md §1-2).

   The "now" tile illustrates the step: the holder signs a record that extends
   their own chain; the chain checks only grammar, signature, head and
   position, then copies it to K-of-N peers; a resolver reads what it means.
   The records stacked behind are the holder's earlier positions, each
   pointing to the one before. Under it, the five steps are listed once, as
   the step links that drive the scene. The scene auto-advances, pauses on
   hover/focus or with its own button, and stops when the page is hidden.
   Reduced motion, or a paused scene, shows the finished record with the
   steps still selectable. The example is illustrative. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var STEP_MS = 3200, RESTART_MS = 4200;

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
    { id: 'swaps', label: 'Swaps', party: 'studio.fxn', recordType: 'YLEDGERENTRY', amount: '36 FXN → studio.fxn', resolverName: 'DeFi resolver', says: 'The DeFi resolver reads the payload: 36 FXN to studio.fxn.' },
    { id: 'transfers', label: 'Transfers', party: 'alice.fxn', recordType: 'YTRANSFER', amount: '120 FXN → alice.fxn', resolverName: 'Transfers resolver', says: 'The transfers resolver reads the payload: 120 FXN to alice.fxn.' },
    { id: 'staking', label: 'Staking', party: 'validator.fxn', recordType: 'YSTAKE', amount: '500 FXN → validator.fxn', resolverName: 'Staking resolver', says: 'The staking resolver reads the payload: 500 FXN staked with validator.fxn.' },
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
    { id: 'check', title: 'Check', page: 'stats', actors: ['chain'], checks: 2, says: 'Grammar parses and the signature verifies. Meaning is not checked.' },
    { id: 'extend', title: 'Extend', page: 'explorer', actors: ['chain'], checks: 3, says: 'It points to the current head, #2b9d, and position 42 is still free.' },
    { id: 'replicate', title: 'Replicate', page: 'stats', actors: ['chain'], checks: 4, says: 'Copied to 9 of 12 peers in this example. The other histories remain independent.' },
    { id: 'resolve', title: 'Resolve', page: 'resolver', actors: ['resolver'], checks: 4, says: 'The DeFi resolver reads the payload: 36 FXN to studio.fxn.' }
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

  var BLOCKS = [
    { x: 16,  w: 26, text: 'G',            under: 'who' },
    { x: 55,  w: 96, text: 'YLEDGERENTRY', under: 'what kind' },
    { x: 164, w: 24, text: 'V3',           under: 'version' },
    { x: 201, w: 78, text: 'M1760…',       under: 'when' },
    { x: 292, w: 34, text: 'J42',          under: 'position' },
    { x: 339, w: 60, text: 'C2b9d…',       under: 'extends' },
    { x: 412, w: 52, text: 'S9f1…',        under: 'signature' }
  ];
  var LAMPS = [
    { mark: 'G', name: 'grammar' },
    { mark: 'S', name: 'signature' },
    { mark: 'C', name: 'head' },
    { mark: 'K', name: 'peers' }
  ];
  var CHAIN = ['J38', 'J39', 'J40', 'J41', 'J42'];
  var PEERS = 12, PEERS_STORED = 9;
  var W = 480, CY = 96;

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
     a transfer, a pool for a swap, a validator's stake for staking, a ballot
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
    function text(x, y, cls, value, parent) { return add(parent || root, 'text', { x: x, y: y, class: cls }, value); }
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
    function tag(parent, x, y, name, value, anchorEnd, cls) {
      var w = 22 + value.length * 6.2, left = anchorEnd ? x - w : x;
      var g = add(parent, 'g', { class: 'land-tag ' + (cls || '') });
      add(g, 'rect', { x: left, y: y - 11, width: w, height: 18, rx: 9 });
      if (name === 'fxn') coin(g, left + 11, y - 2, 12); else icon(g, name, [left + 11, y - 2], 11, false);
      text(left + 19, y + 2, 'land-tag-text', value, g);
      return g;
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
        add(g, 'text', { x: label[0], y: label[1], transform: 'rotate(25.3 ' + label[0] + ' ' + label[1] + ')', class: 'land-index' }, 'J' + (36 + c));
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
    add(card, 'rect', { x: 424, y: 20, width: 200, height: 56, class: 'land-panel' });
    icon(card, 'resolver', [446, 48], 22, false, 'land-card-icon');
    text(466, 40, 'land-meta', payload.resolverName, card);
    if (spec.coin) coin(card, 472, 58, 16, 'land-coin-card');
    text(spec.coin ? 486 : 466, 62, 'land-value', payload.amount, card);

    // Title and the colour legend: what each mark means, said in the picture.
    text(16, 28, 'land-label', 'A CHAIN OF CHAINS');
    var legend = add(root, 'g', { class: 'land-legend' });
    [['land-key-accent', 'Record in flight'], ['land-key-history', 'Signed history'], ['land-key-ref', 'Reference']].forEach(function (item, i) {
      var y = 48 + i * 18;
      if (i === 2) add(legend, 'path', { d: 'M16 ' + (y - 4) + 'h12', class: item[0] });
      else add(legend, 'rect', { x: 17, y: y - 9, width: 9, height: 9, class: item[0] });
      text(36, y, 'land-meta', item[1], legend);
    });

    // Readout: the instrument for the current step, on the heavy anchor.
    var readout = add(root, 'g', { class: 'land-readout' });
    add(readout, 'rect', { x: 16, y: 380, width: 208, height: 84, class: 'land-panel land-panel-heavy' });
    var stepIcon = add(readout, 'g', {});
    var stepLabel = text(40, 400, 'land-meta', '', readout), stepValue = text(28, 452, 'land-value', '', readout);
    var marks = add(readout, 'g', { class: 'land-marks' });
    var checks = LAMPS.map(function (lamp, k) {
      var m = add(marks, 'g', { class: 'land-check', 'data-mark': lamp.mark });
      add(m, 'rect', { x: 28 + k * 26, y: 412, width: 20, height: 20 });
      add(m, 'text', { x: 38 + k * 26, y: 426, 'text-anchor': 'middle' }, lamp.mark);
      return m;
    });
    var peers = [];
    for (var p = 0; p < PEERS; p++) peers.push(add(marks, 'rect', { x: 28 + p * 15, y: 416, width: 10, height: 10, class: 'land-peer' }));

    var STEP_ICONS = { sign: 'sign', check: 'check', extend: 'chain', replicate: 'peers', resolve: 'resolver' };
    var READOUT = {
      sign: ['01 / SIGN', 'J42 · ' + payload.recordType + ' · signed'],
      check: ['02 / CHECK', 'All four checks pass together'],
      extend: ['03 / EXTEND', 'J42 → previous head #2b9d'],
      replicate: ['04 / REPLICATE', PEERS_STORED + ' of ' + PEERS + ' peers hold J42'],
      resolve: ['05 / RESOLVE', 'A reference to ' + payload.party]
    };
    return { svg: root, paint: function (i) {
      var id = BASE_STEPS[i].id, placed = i >= 2;
      root.setAttribute('data-phase', id);
      root.setAttribute('data-placed', String(placed));
      headAt(LAND_MINE.len - (placed ? 1 : 2));
      checks.forEach(function (m) { m.setAttribute('data-on', String(i >= 1)); m.setAttribute('data-shown', String(i === 1)); });
      peers.forEach(function (peer, k) { peer.setAttribute('data-on', String(k < PEERS_STORED)); peer.setAttribute('data-shown', String(i === 3)); });
      stepIcon.textContent = ''; icon(stepIcon, STEP_ICONS[id], [32, 396], 12, false, 'land-step-icon');
      stepLabel.textContent = READOUT[id][0];
      stepValue.textContent = READOUT[id][1];
      stepValue.setAttribute('y', i === 1 || i === 3 ? 452 : 432);
      resolution.setAttribute('data-shown', String(i === 4));
      counterpart.setAttribute('data-resolved', String(i === 4));
    } };
  }

  function drawScene(payload, rich) {
    if(rich)return drawLandscape(payload);
    var root = svg('svg', { viewBox: '0 0 ' + W + (rich ? ' 320' : ' 192'), class: 'flow-scene', fill: 'none' });
    if (rich) {
      var histories=svg('g',{class:'flow-histories'});
      [32,276].forEach(function(y,row){
        for(var i=0;i<7;i++){
          var x=40+i*60;
          if(i<6)histories.appendChild(svg('path',{d:'M'+(x+28)+' '+(y+8)+'h32',class:'flow-history-link'}));
          var block=svg('g',{class:'flow-history-block',style:'--i:'+(i+row*3)});
          block.appendChild(svg('path',{d:'M'+x+' '+y+'l6 -6h28l-6 6z',class:'flow-history-top'}));
          block.appendChild(svg('path',{d:'M'+(x+28)+' '+y+'l6 -6v20l-6 6z',class:'flow-history-side'}));
          block.appendChild(svg('rect',{x:x,y:y,width:28,height:20,rx:3,class:'flow-history-face'}));
          histories.appendChild(block);
        }
      });
      histories.appendChild(svg('path',{d:'M240 52V72M100 254v22M380 254v22',class:'flow-history-reference'}));
      histories.appendChild(svg('text',{x:40,y:14,class:'flow-history-label'},'Independent histories'));
      histories.appendChild(svg('text',{x:40,y:316,class:'flow-history-label'},'Connected through references'));
      root.appendChild(histories);
    }
    var card = svg('rect', { x: 1, y: rich ? 65 : 1, width: W - 2, height: 190, rx: 16, class: 'flow-card' });
    root.appendChild(card);

    function panel(id) {
      var g = svg('g', { class: 'flow-panel', 'data-panel': id });
      if(rich)g.setAttribute('transform','translate(0 64)');
      root.appendChild(g);
      return g;
    }

    /* SIGN — the record, block by block: the actual wire grammar, not a
       stylised card. That is the part nothing else on the site shows. */
    var pSign = panel('sign');
    var blocks = BLOCKS.map(function (b, i) {
      var g = svg('g', { class: 'flow-block', 'data-i': String(i) });
      g.setAttribute('style', '--i:' + i);
      g.appendChild(svg('rect', { x: b.x, y: CY - 18, width: b.w, height: 36, rx: 6, class: 'flow-block-box' }));
      g.appendChild(svg('text', { x: b.x + b.w / 2, y: CY + 4, 'text-anchor': 'middle', class: 'flow-block-text' }, i === 1 ? payload.recordType : b.text));
      g.appendChild(svg('text', { x: b.x + b.w / 2, y: CY + 34, 'text-anchor': 'middle', class: 'flow-block-under' }, b.under));
      if (i < BLOCKS.length - 1) g.appendChild(svg('path', { d: 'M' + (b.x + b.w + 4) + ' ' + (CY - 1) + 'h5', class: 'flow-block-dash' }));
      pSign.appendChild(g);
      return g;
    });

    /* CHECK — four lamps, lit together: grammar, signature, head, peers.
       Meaning is never one of them. */
    var pCheck = panel('check');
    var lampGap = 108, lampStart = W / 2 - (LAMPS.length - 1) * lampGap / 2;
    var lamps = LAMPS.map(function (l, i) {
      var cx = lampStart + i * lampGap;
      var g = svg('g', { class: 'flow-lamp', 'data-mark': l.mark });
      g.setAttribute('style', '--i:' + i);
      g.appendChild(svg('circle', { cx: cx, cy: CY - 10, r: 22, class: 'flow-lamp-disc' }));
      g.appendChild(svg('text', { x: cx, y: CY - 2, 'text-anchor': 'middle', class: 'flow-lamp-mark' }, l.mark));
      g.appendChild(svg('text', { x: cx, y: CY + 36, 'text-anchor': 'middle', class: 'flow-lamp-name' }, l.name));
      pCheck.appendChild(g);
      return g;
    });
    pCheck.appendChild(svg('text', { x: W / 2, y: CY + 62, 'text-anchor': 'middle', class: 'flow-band-sub' }, 'meaning is never checked here'));

    /* EXTEND — the holder's own chain, which this record joins. */
    var pExtend = panel('extend');
    var nodeW = 68, nodeGap = 98, chainStart = W / 2 - ((CHAIN.length - 1) * nodeGap + nodeW) / 2;
    var links = [];
    var nodes = CHAIN.map(function (name, i) {
      var x = chainStart + i * nodeGap;
      if (i > 0) {
        var link = svg('path', { d: 'M' + (x - (nodeGap - nodeW)) + ' ' + CY + 'H' + x, class: 'flow-link' });
        link.setAttribute('style', '--i:' + i);
        pExtend.appendChild(link);
        links.push(link);
      }
      var g = svg('g', { class: 'flow-node', 'data-i': String(i) });
      g.setAttribute('style', '--i:' + i);
      g.appendChild(svg('rect', { x: x, y: CY - 18, width: nodeW, height: 36, rx: 8, class: 'flow-node-box' }));
      g.appendChild(svg('text', { x: x + nodeW / 2, y: CY + 5, 'text-anchor': 'middle', class: 'flow-node-text' }, name));
      pExtend.appendChild(g);
      return g;
    });
    pExtend.appendChild(svg('text', { x: W / 2, y: CY + 48, 'text-anchor': 'middle', class: 'flow-band-sub' }, 'one chain per identity · nobody else had to wait'));

    /* REPLICATE — peers filling in as they store it. */
    var pReplicate = panel('replicate');
    var peerGap = 26, peerStart = W / 2 - (PEERS - 1) * peerGap / 2;
    var peers = [];
    for (var p = 0; p < PEERS; p++) {
      var px=rich?W/2+Math.cos(p*Math.PI*2/PEERS)*176:peerStart+p*peerGap;
      var py=rich?CY-16+Math.sin(p*Math.PI*2/PEERS)*56:CY-8;
      if(rich)pReplicate.appendChild(svg('path',{d:'M240 80L'+px+' '+py,class:'flow-replica-wire',style:'--i:'+p}));
      var dot = svg('circle', { cx: px, cy: py, r: 9, class: 'flow-peer' });
      dot.setAttribute('style', '--i:' + p);
      pReplicate.appendChild(dot);
      peers.push(dot);
    }
    if(rich){
      pReplicate.appendChild(svg('rect',{x:208,y:64,width:64,height:32,rx:8,class:'flow-block-box'}));
      pReplicate.appendChild(svg('text',{x:240,y:84,'text-anchor':'middle',class:'flow-block-text'},'Record 42'));
    }
    var peerCount = svg('text', { x: W / 2, y: CY + (rich?62:32), 'text-anchor': 'middle', class: 'flow-band-sub' });
    pReplicate.appendChild(peerCount);

    /* RESOLVE — what it means, which only a resolver decides. */
    var pResolve = panel('resolve');
    pResolve.appendChild(svg('rect', { x: W / 2 - 190, y: CY - 28, width: 380, height: 58, rx: 12, class: 'flow-meaning-box' }));
    pResolve.appendChild(svg('text', { x: W / 2, y: CY - 1, 'text-anchor': 'middle', class: 'flow-meaning-text' }, payload.amount));
    pResolve.appendChild(svg('text', { x: W / 2, y: CY + 21, 'text-anchor': 'middle', class: 'flow-meaning-who' }, payload.resolverName));

    /* Said once, in the picture rather than only in a tooltip: the values
       are examples and the long fields are cut to fit. The shape is real. */
    root.appendChild(svg('text', { x: W / 2, y: rich ? 242 : 178, 'text-anchor': 'middle', class: 'flow-scene-caption' },
      'illustrative values · the record shape is the real wire grammar'));

    var panels = { sign: pSign, check: pCheck, extend: pExtend, replicate: pReplicate, resolve: pResolve };

    return {
      svg: root,
      paint: function (i) {
        var step = BASE_STEPS[i];
        Object.keys(panels).forEach(function (id) { panels[id].setAttribute('class', 'flow-panel' + (id === step.id ? ' flow-panel-active' : '')); });

        if (step.id === 'check') lamps.forEach(function (l) { l.setAttribute('data-on', 'true'); });
        if (step.id === 'extend') {
          nodes.forEach(function (n, k) { n.setAttribute('data-on', 'true'); n.setAttribute('data-new', String(k === CHAIN.length - 1)); });
          links.forEach(function (l) { l.setAttribute('data-on', 'true'); });
        }
        if (step.id === 'replicate') {
          peers.forEach(function (d, k) { d.setAttribute('data-on', String(k < PEERS_STORED)); });
          peerCount.textContent = PEERS_STORED + ' of ' + PEERS + ' peers hold it · the acknowledgement waited on them';
        }
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
    { name: 'validator.fxn', d: 'M404 172V96L460 40H540', stations: [[404, 172], [460, 40], [540, 40]], label: [540, 28, 'end'] },
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

  ArkUI.buildChainFlow = function (options) {
    var hrefFor = options.hrefFor;
    var payload = CASES_BY_ID[options.caseId] || CASES_BY_ID.swaps;
    // Only what the resolver reads changes per case; the mechanism (checks,
    // replication) is identical, so only the resolve step's narration and
    // its accessible label need the case-specific text.
    var STEPS = BASE_STEPS.slice();
    var resolveStep = {};
    for (var key in BASE_STEPS[4]) resolveStep[key] = BASE_STEPS[4][key];
    resolveStep.says = payload.says;
    STEPS[4] = resolveStep;
    var root = el('div', 'flow');
    root.dataset.step = '0';
    root.dataset.case = payload.id;

    // Tracker first: the step links (the real, accessible content), each to
    // the page that shows that part for real. It sits above the scene now
    // and doubles as the visual "chain" -- five connected circles -- that
    // the single panel below answers to.
    var rail = el('ol', 'home-cycle-records flow-ledger');
    var links = STEPS.map(function (s, i) {
      var item = el('li'), link = el(options.inline ? 'button' : 'a', 'home-cycle-step flow-record');
      link.dataset.stage = s.id; link.dataset.i = String(i);
      if(options.inline)link.type='button';
      else {link.href = hrefFor(s.page); link.dataset.sceneLink = s.page;}
      link.appendChild(el('span', 'flow-record-num', String(i + 1).padStart(2, '0')));
      var stepIcon = options.inline && ArkUI.icon && ArkUI.icon({ sign: 'sign', check: 'check', extend: 'chain', replicate: 'peers', resolve: 'resolver' }[s.id]);
      if (stepIcon) link.appendChild(stepIcon);
      link.appendChild(el('span', 'flow-record-name', s.title));
      link.setAttribute('aria-label', options.inline ? s.title : s.title + ': ' + s.says + ' Illustrative example. Open the related page.');
      item.appendChild(link); rail.appendChild(item);
      return link;
    });
    root.appendChild(rail);

    // Now: the one panel that answers the selected step.
    var now = el('div', 'flow-now');
    var scene = drawScene(payload,options.rich);
    scene.svg.setAttribute('aria-hidden', 'true');
    now.appendChild(scene.svg);
    var says = el('strong', 'flow-says');
    if(!options.inline)says.setAttribute('aria-hidden', 'true');
    now.appendChild(says);
    root.appendChild(now);

    var toggle = el('button', 'flow-toggle');
    toggle.type = 'button';
    toggle.appendChild(icon('M3 2h2v8H3zM7 2h2v8H7z'));
    toggle.appendChild(icon('M3 1.5v9l7.5-4.5z'));
    // Sits in the scene tile's bottom-right corner, beside the quote.
    now.appendChild(toggle);

    var reduce = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    var current = 0, held = -1, userPaused = false, timer = 0, disposed = false, inView = true;

    function show(i, complete) {
      var step = STEPS[i];
      root.dataset.step = String(i);
      root.dataset.complete = complete ? 'true' : 'false';
      root.dataset.actors = step.actors.join(' ');
      says.textContent = '“' + step.says + '”';
      scene.paint(i);
      links.forEach(function (link, k) { link.toggleAttribute('data-current', k === i); link.toggleAttribute('data-done', k < i); if(options.inline)link.setAttribute('aria-pressed',String(k===i)); });
      root.classList.remove('flow-run'); void root.offsetWidth; root.classList.add('flow-run');
    }
    function still() {
      return reduce.matches || userPaused || held >= 0 || disposed || !inView ||
        (typeof document !== 'undefined' && document.hidden) ||
        !!(root.closest && root.closest('[hidden]')) ||
        !!(ArkUI.sceneState && ArkUI.sceneState.get().paused);
    }
    function paintToggle() {
      var playing = !reduce.matches && !userPaused && inView && !document.hidden && !(ArkUI.sceneState && ArkUI.sceneState.get().paused);
      toggle.setAttribute('aria-label', playing ? 'Pause the chain animation' : 'Play the chain animation');
      toggle.title = playing ? 'Pause' : 'Play';
      root.dataset.playing = playing ? 'true' : 'false';
    }
    function schedule() {
      clearTimeout(timer); timer = 0;
      if (still()) return;
      var last = current === STEPS.length - 1;
      timer = setTimeout(function () {
        if (still()) { schedule(); return; }
        current = last ? 0 : current + 1;
        show(current, current === STEPS.length - 1);
        schedule();
      }, last ? RESTART_MS : STEP_MS);
    }
    function hold(i) { held = i; root.dataset.held = 'true'; show(i, i === STEPS.length - 1); clearTimeout(timer); timer = 0; }
    function release() { if (held < 0) return; current = held; held = -1; delete root.dataset.held; schedule(); }

    links.forEach(function (link, i) {
      if(options.inline)link.addEventListener('click',function(){hold(i);});
      link.addEventListener('pointerenter', function () { hold(i); });
      link.addEventListener('focus', function () { hold(i); });
      link.addEventListener('pointerleave', release);
      link.addEventListener('blur', release);
    });
    toggle.addEventListener('click', function () { userPaused = !userPaused; paintToggle(); schedule(); });
    function wake() { paintToggle(); schedule(); }
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', wake);
    function reducedChanged() { paintToggle(); show(reduce.matches ? STEPS.length - 1 : current, reduce.matches); schedule(); }
    if (reduce.addEventListener) reduce.addEventListener('change', reducedChanged);
    var unsubscribe = ArkUI.sceneState && ArkUI.sceneState.subscribe ? ArkUI.sceneState.subscribe(wake) : null;
    var visibility = options.inline && typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(function(entries){inView=entries[0].isIntersecting;wake();},{threshold:.1}) : null;
    if(visibility)visibility.observe(root);

    paintToggle();
    if (reduce.matches) { current = STEPS.length - 1; show(current, true); }
    else show(0, false);
    schedule();

    return {
      element: root,
      restore: schedule,
      dispose: function () {
        disposed = true; clearTimeout(timer);
        if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', wake);
        if (reduce.removeEventListener) reduce.removeEventListener('change', reducedChanged);
        if (visibility) visibility.disconnect();
        if (typeof unsubscribe === 'function') unsubscribe();
      }
    };
  };
})();

/* DEFXN identity card: builders from reference sheet 16 (rings, orbits and portals: a ring standing
   on edge with a chain through it, an hourglass of stacked rings on a light core, a chain of three
   links, a gimbal, a knotted ring, an epicycle path, two braided wave hoops, small hoops threaded on
   a ring, a spiral stair, a truss ring, a gravity well, an upright portal, a wormhole, star trails, curling
   particle tracks, an S curl of points, a floor gate with a curtain of light, a pair of gates joined
   by an arc of light, and small floating hoops). Each builder is named by an element file under layers/<NN-key>/sheet-16/. The space and
   the m / ctx calls are described at the top of art3d.js. Every random value comes from ctx.rnd(),
   so the same card always draws the same art.

   Colour: white parts use ctx.tone('a', v) or ctx.light('a'); the sheet's amber and cyan accents use
   ctx.light('b') and ctx.light('c'), so they follow the card's palette.

   Placement: the mark spans x -200..200 and y -273..273. Rings round it pass in front of it only as
   thin lines, points and small glass; big shapes sit behind it (z < 0). Every line and point is as
   bright as its SEEN place allows (vis below): full inside the art's box, fading out over its last
   40 to 50 units, and fading out over the genesis ID and the serial. So nothing ends in a hard cut on
   the card, alone on black, or in the wide strip behind a site. Far shapes are placed by where they
   are seen (seenAt): the card's rest tilt carries a point 200 units behind about 80 units left.

     s16-chain-gate    03-aura       a ring standing on edge, a chain of links and glowing nodes
                                     running down the vertical axis through it
     s16-spool         03-aura       flat rings stacked into an hourglass, a beam of light up its core
     s16-ring-chain    03-aura       three big links of glass ring hanging in a chain through the mark
     s16-gimbal        03-aura       three nested rings on crossed pivots, the mark as its rotor
     s16-knot          03-aura       a ring tied in a trefoil or five-lobed knot, glass at the lobes
     s16-epicycle      03-aura       the looping path of a body on an epicycle, its wheel and arms
     s16-braid         03-aura       two wave hoops of opposite phase, crossing at glass nodes
     s16-threaded      03-aura       small upright hoops threaded on a tilted ring, some lit inside
     s16-spiral-stair  03-aura       glass steps rising round the mark on a helix, posts and a rail
     s16-truss         03-aura       a ring-shaped truss: three chords, posts and braces, glass modules
     s16-gravity-well  01-backdrop   a polar grid sunk into a well far behind, light in its throat
     s16-portal        01-backdrop   an upright ring with glass chevrons, a swirl of light inside it
     s16-wormhole      01-backdrop   rings of dots running back into a bending tunnel, twisted rails
     s16-star-trails   01-backdrop   arcs of long-exposure star trails round a pole at the top left
     s16-tracks        05-signal     particle tracks curling out of one bright point, in pairs
     s16-curl          05-signal     an S of points that tightens into a curl at each end
     s16-beam-gate     05-signal     a glowing ring on the floor, a curtain of light rising from it
     s16-gate-pair     05-signal     two small upright gates joined by an arc of light across the mark
     s16-hoops         06-particles  small rings floating in front: single, linked, lit and gyroscopes */
(function () {
  'use strict';
  var A = window.Art3D, TAU = Math.PI * 2, WHITE = [1, 1, 1];
  if (!A || !A.register) { console.error('js/nft/builders/s16.js: Art3D is not loaded. Load js/nft/art3d.js first. traits.js loads this file when a card needs it.'); return; }

  /* ---------- helpers ---------- */

  // 3 x 3 rotation matrices. A glass block takes its turn as three.js XYZ Euler angles (euler), so a
  // block can lie along a tilted ring: build the turn as a matrix, then convert it.
  function rx(a) { var c = Math.cos(a), s = Math.sin(a); return [[1, 0, 0], [0, c, -s], [0, s, c]]; }
  function ry(a) { var c = Math.cos(a), s = Math.sin(a); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; }
  function rz(a) { var c = Math.cos(a), s = Math.sin(a); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; }
  function mul(P, Q) {
    var o = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) o[i][j] = P[i][0] * Q[0][j] + P[i][1] * Q[1][j] + P[i][2] * Q[2][j];
    return o;
  }
  function app(M, p) {
    return [M[0][0] * p[0] + M[0][1] * p[1] + M[0][2] * p[2], M[1][0] * p[0] + M[1][1] * p[1] + M[1][2] * p[2], M[2][0] * p[0] + M[2][1] * p[1] + M[2][2] * p[2]];
  }
  // the XYZ Euler angles of a rotation matrix (three.js order: the matrix is Rx * Ry * Rz)
  function euler(M) {
    var m13 = Math.max(-1, Math.min(1, M[0][2])), y = Math.asin(m13);
    if (Math.abs(m13) < 0.9999999) return [Math.atan2(-M[1][2], M[2][2]), y, Math.atan2(-M[0][1], M[0][0])];
    return [Math.atan2(M[2][1], M[1][1]), y, 0];
  }
  // a point of a flat circle's plane (x-z) tilted up by ax and rolled by az, as art3d.js's ring()
  function tilt(x, y, z, ax, az) {
    var ca = Math.cos(ax), sa = Math.sin(ax), y1 = y * ca - z * sa, z1 = y * sa + z * ca, cz = Math.cos(az), sz = Math.sin(az);
    return [x * cz - y1 * sz, x * sz + y1 * cz, z1];
  }
  function add(p, q) { return [p[0] + q[0], p[1] + q[1], p[2] + q[2]]; }
  function mix(p, q, t) { return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t]; }
  function gauss(rnd) { return rnd() + rnd() + rnd() - 1.5; }
  function smooth(t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
  function side(rnd) { return rnd() < 0.5 ? -1 : 1; }
  // the art-space x and y at depth z that the card shows at (xs, ys): the inverse of Art3D.seen
  function seenAt(xs, ys, z) {
    var x = xs, y = ys;
    for (var i = 0; i < 5; i++) { var p = A.seen(x, y, z); x += xs - p[0]; y += ys - p[1]; }
    return [x, y];
  }
  // how brightly a point may show, 0..1, by where it is SEEN: 1 inside the art's box (x -240..320,
  // y -340..340), easing to 0 over its last 40 to 50 units, and easing to 0 over the genesis ID and
  // the serial, so a ring fades where it meets them instead of breaking off
  function vis(ctx, p) {
    var s = A.seen(p[0], p[1], p[2]);
    var f = smooth((s[0] + 240) / 50) * smooth((320 - s[0]) / 40) * smooth((340 - Math.abs(s[1])) / 42);
    if (f <= 0 || !ctx.clear(s[0], s[1], 2)) return 0;
    if (!ctx.clear(s[0], s[1], 16)) return f * 0.3;
    if (!ctx.clear(s[0], s[1], 30)) return f * 0.7;
    return f;
  }
  // a line through the points [[x,y,z], ...], drawn in runs that are each as bright as their place
  // allows (vis). `shade(a, b)`, when given, scales each segment too (a dimmer front half, say).
  function fline(m, ctx, p, rgb, alpha, closed, shade) {
    var n = p.length, last = closed ? n : n - 1, run = [], level = -1;
    function flush() { if (run.length >= 6 && level > 0) m.line(run, rgb, alpha * level); run = []; level = -1; }
    for (var i = 0; i < last; i++) {
      var a = p[i], b = p[(i + 1) % n], f = vis(ctx, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);
      if (shade) f *= shade(a, b);
      var q = Math.round(f * 10) / 10;
      if (q <= 0) { flush(); continue; }
      if (q !== level) { flush(); run = [a[0], a[1], a[2]]; level = q; }
      run.push(b[0], b[1], b[2]);
    }
    flush();
  }
  // a straight line from a to b, cut into short steps so it fades like any other line
  function fseg(m, ctx, a, b, rgb, alpha, steps) {
    var p = [], n = steps || Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 12));
    for (var i = 0; i <= n; i++) p.push(mix(a, b, i / n));
    fline(m, ctx, p, rgb, alpha, false);
  }
  function fpoint(m, ctx, p, size, rgb, alpha, soft) {
    var f = vis(ctx, p);
    if (f > 0.03) m.point(p[0], p[1], p[2], size, rgb, alpha * f, soft);
  }
  // a small glass cube with a light in it, only where it shows almost fully
  function lamp(m, ctx, p, s, glass, rgb, rot, glow) {
    var f = vis(ctx, p);
    if (f < 0.6) return false;
    m.glass(p[0], p[1], p[2], s, s, s, glass, 0.85 * f, rot || [0.62, 0.79, 0]);
    m.point(p[0], p[1], p[2], s * 0.36, WHITE, f);
    m.point(p[0], p[1], p[2], s * (glow || 3.6), rgb, 0.36 * f, true);
    return true;
  }
  // points of a circle of radius r in the x-y plane of the turn M, centred at c
  function circle(M, r, n, c, rr) {
    var o = [];
    for (var i = 0; i < n; i++) { var a = i / n * TAU, q = app(M, [r * Math.cos(a), (rr || r) * Math.sin(a), 0]); o.push([q[0] + c[0], q[1] + c[1], q[2] + c[2]]); }
    return o;
  }
  function frontDim(k) { return function (a, b) { return a[2] + b[2] > 0 ? k : 1; }; }

  /* ---------- 03-aura ---------- */

  // a ring standing on edge round the mark, turned so it is seen as a tall ellipse, and a chain of
  // small links running down the vertical axis through it, in front of the mark. Every fifth link is
  // a glowing node: a glass cube on its corner with a light inside. Glass clamps hold the ring where
  // it meets the axis and at its two sides.
  A.register('s16-chain-gate', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), glass = ctx.tone('a', 0.95);
    var turn = (0.95 + ctx.rnd() * 0.3) * side(ctx.rnd), M = ry(turn), R = 284, O = [12, 0, 0], i;
    fline(m, ctx, circle(M, R, 200, O), ca, 0.62, true);
    fline(m, ctx, circle(M, R - 9, 200, O), cb, 0.3, true);
    for (i = 0; i < 48; i++) {
      if (i % 12 === 0) continue;
      var t = i / 48 * TAU, p = add(app(M, [(R - 4.5) * Math.cos(t), (R - 4.5) * Math.sin(t), 0]), O);
      fpoint(m, ctx, p, i % 4 ? 1.8 : 3, i % 4 ? ca : cc, 0.85);
    }
    [0, 12, 24, 36].forEach(function (k) {
      var t = k / 48 * TAU, p = add(app(M, [(R - 4.5) * Math.cos(t), (R - 4.5) * Math.sin(t), 0]), O);
      lamp(m, ctx, p, 13, glass, cc, euler(mul(M, rz(t))), 3);
    });
    // the chain, in front of the mark: links of alternating turn, overlapping like real links
    var z = 46, pitch = 23, every = 5, phase = Math.floor(ctx.rnd() * every), k = 0;
    for (var y = -331; y <= 331; y += pitch, k++) {
      if ((k + phase) % every === 0) { lamp(m, ctx, [O[0], y, z], 11, glass, cc, [0.62, 0.79, 0], 4); continue; }
      var L = ry(k % 2 ? 0.85 : -0.85), link = [];
      for (var j = 0; j < 22; j++) { var a = j / 22 * TAU, q = app(L, [7.5 * Math.cos(a), 14.5 * Math.sin(a), 0]); link.push([q[0] + O[0], q[1] + y, q[2] + z]); }
      fline(m, ctx, link, k % 2 ? ca : cb, 0.78, true);
    }
  });

  // flat rings stacked into an hourglass round the mark, narrow at the waist, wide at the ends. Every
  // sixth ring is in the accent and brighter. A beam of light rises up the core behind the mark and
  // shows where it leaves the rings at the top and the bottom. The halves in front are dimmer.
  A.register('s16-spool', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), glass = ctx.tone('a', 0.95);
    var N = 19, ax = 0.2 + ctx.rnd() * 0.06, y0 = -290, y1 = 258, rw = 200 + ctx.rnd() * 25, re = 288, cx = 28, waist = 0.42 + ctx.rnd() * 0.16;
    var hot = Math.floor(ctx.rnd() * 6);
    for (var i = 0; i < N; i++) {
      var t = i / (N - 1), y = y0 + (y1 - y0) * t, u = (t - waist) / (t < waist ? waist : 1 - waist), r = rw + (re - rw) * u * u;
      var pts = [];
      for (var j = 0; j < 150; j++) { var a = j / 150 * TAU, q = tilt(r * Math.cos(a), 0, r * Math.sin(a), ax, 0); pts.push([q[0] + cx, q[1] + y, q[2]]); }
      var lit = i % 6 === hot;
      fline(m, ctx, pts, lit ? cb : ca, lit ? 0.62 : 0.26, true, frontDim(0.55));
      for (var d = 0; d < (lit ? 16 : 7); d++) { var p = pts[Math.floor(ctx.rnd() * pts.length)]; fpoint(m, ctx, p, lit ? 2.6 : 1.8, lit ? cc : ca, 0.85); }
    }
    // the light core
    m.quad(cx, -338, -34, 0, 4, 676, cc, 0.5, 'peak');
    m.quad(cx, -338, -34, 0, 44, 676, cb, 0.07, 'peak');
    lamp(m, ctx, [cx, y0, 0], 12, glass, cc, null, 5);
    lamp(m, ctx, [cx, y1 + 30, 0], 10, glass, cc, null, 5);
  });

  // three big links of a chain hanging through the mark, each a glass band of three lines, each
  // link turned a quarter turn from the next so they pass through each other. Beads run round each
  // link; a lit node sits on the side of each link that is nearest the viewer.
  A.register('s16-ring-chain', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), glass = ctx.tone('a', 0.95);
    var base = (0.45 + ctx.rnd() * 0.3) * side(ctx.rnd), cx = 24, links = [[188, base], [0, base + Math.PI / 2], [-188, base]];
    links.forEach(function (L, k) {
      var M = ry(L[1]), C = [cx, L[0], 0], col = k === 1 ? cb : ca;
      [0, 7, 14].forEach(function (off, j) {
        fline(m, ctx, circle(M, 120 - off, 170, C, 146 - off), j === 1 ? cc : col, j === 1 ? 0.22 : 0.58, true);
      });
      var pts = circle(M, 113, 60, C, 139);
      for (var i = 0; i < 60; i += 3) fpoint(m, ctx, pts[i], i % 15 ? 1.8 : 3, i % 15 ? ca : cc, 0.85);
      var near = pts[0][2] > pts[30][2] ? pts[0] : pts[30];
      lamp(m, ctx, near, 12, glass, cc, euler(M), 4);
    });
  });

  // a gimbal: three nested rings, white, light and glow, each on pivots at right angles to the
  // last. The outer ring turns on a vertical axle, the middle one on the outer's sideways pins, the
  // inner one on the middle's upright pins. The mark is the rotor in the middle.
  A.register('s16-gimbal', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), glass = ctx.tone('a', 0.95);
    var sg = side(ctx.rnd), a1 = sg * (0.68 + ctx.rnd() * 0.22), a2 = 0.75 + ctx.rnd() * 0.5, a3 = -(0.7 + ctx.rnd() * 0.5);
    var M1 = ry(a1), M2 = mul(M1, rx(a2)), M3 = mul(M2, ry(a3)), R = [298, 250, 204], C = [30, 0, 0], i;
    function at(M, p) { return add(app(M, p), C); }
    [[M1, R[0], ca], [M2, R[1], cb], [M3, R[2], ca]].forEach(function (g) {
      fline(m, ctx, circle(g[0], g[1], 190, C), g[2], 0.62, true);
      fline(m, ctx, circle(g[0], g[1] - 9, 190, C), g[2], 0.22, true);
    });
    for (i = 0; i < 72; i++) {
      if (i % 18 === 0) continue;
      var a = i / 72 * TAU;
      fpoint(m, ctx, at(M1, [(R[0] - 4.5) * Math.cos(a), (R[0] - 4.5) * Math.sin(a), 0]), i % 6 ? 1.5 : 2.8, ca, 0.8);
      if (i % 4 === 2) fpoint(m, ctx, at(M3, [(R[2] - 4.5) * Math.cos(a), (R[2] - 4.5) * Math.sin(a), 0]), 2.6, cc, 0.9);
    }
    function pin(p, q, col) {
      fseg(m, ctx, p, q, col, 0.9);
      lamp(m, ctx, p, 9, glass, col, null, 3); lamp(m, ctx, q, 9, glass, col, null, 3);
    }
    pin(at(M1, [0, R[0], 0]), [C[0], 334, 0], ca);
    pin(at(M1, [0, -R[0], 0]), [C[0], -334, 0], ca);
    pin(at(M1, [R[0] - 9, 0, 0]), at(M2, [R[1], 0, 0]), cb);
    pin(at(M1, [-(R[0] - 9), 0, 0]), at(M2, [-R[1], 0, 0]), cb);
    pin(at(M2, [0, R[1] - 9, 0]), at(M3, [0, R[2], 0]), cc);
    pin(at(M2, [0, -(R[1] - 9), 0]), at(M3, [0, -R[2], 0]), cc);
  });

  // a ring tied in a knot round the mark: a torus knot that winds twice round and loops three times
  // (a trefoil) or five times. The knot is a tube drawn as a bright core line between two faint
  // edges, beads along it, and a lit glass cube at the tip of each lobe.
  A.register('s16-knot', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), glass = ctx.tone('a', 0.95);
    var q = ctx.rnd() < 0.6 ? 3 : 5, R = q === 3 ? 188 : 204, r0 = q === 3 ? 90 : 68, C = [30, 0, 0];
    var M = mul(mul(rx(-0.3 - ctx.rnd() * 0.2), ry((0.2 + ctx.rnd() * 0.2) * side(ctx.rnd))), rz(ctx.rnd() * TAU));
    var N = 720, mid = [], lo = [], hi = [], i;
    for (i = 0; i < N; i++) {
      var t = i / N * TAU, rr = R + r0 * Math.cos(q * t), p = [rr * Math.cos(2 * t), rr * Math.sin(2 * t), r0 * Math.sin(q * t)];
      var n = [Math.cos(q * t) * Math.cos(2 * t), Math.cos(q * t) * Math.sin(2 * t), Math.sin(q * t)];
      mid.push(add(app(M, p), C));
      lo.push(add(app(M, [p[0] - n[0] * 6, p[1] - n[1] * 6, p[2] - n[2] * 6]), C));
      hi.push(add(app(M, [p[0] + n[0] * 6, p[1] + n[1] * 6, p[2] + n[2] * 6]), C));
    }
    fline(m, ctx, mid, cb, 0.7, true);
    fline(m, ctx, lo, ca, 0.24, true); fline(m, ctx, hi, ca, 0.24, true);
    for (i = 0; i < N; i += 9) fpoint(m, ctx, mid[i], i % 45 ? 1.8 : 2.8, ca, 0.8);
    for (i = 0; i < q; i++) { var k = Math.round(i / q * N) % N; lamp(m, ctx, mid[k], 12, glass, cc, [ctx.rnd() * 3, ctx.rnd() * 3, 0], 4); }
  });

  // the path of a body on an epicycle: it rides a small wheel whose centre rides a large one, so its
  // path loops back on itself five to seven times round the mark. The path is dotted, the large
  // wheel faint, and at one place the body is shown with its wheel and the two arms that carry it.
  A.register('s16-epicycle', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c');
    var k = 5 + Math.floor(ctx.rnd() * 3), R1 = 212, R2 = 64, ax = 0.4 + ctx.rnd() * 0.14, az = (ctx.rnd() - 0.5) * 0.4, C = [30, -12, 0], i;
    function P(x, z) { return add(tilt(x, 0, z, ax, az), C); }
    function body(t) { return P(R1 * Math.cos(t) + R2 * Math.cos(k * t), R1 * Math.sin(t) + R2 * Math.sin(k * t)); }
    for (i = 0; i < 1300; i++) {
      var t = i / 1300 * TAU, p = body(t), loop = (Math.cos((k - 1) * t) + 1) / 2;
      fpoint(m, ctx, p, 1.8 + loop * 0.9, mix(ca, cb, loop), p[2] > 0 ? 0.75 : 1);
    }
    var deferent = [];
    for (i = 0; i < 160; i++) { var a = i / 160 * TAU; deferent.push(P(R1 * Math.cos(a), R1 * Math.sin(a))); }
    fline(m, ctx, deferent, ca, 0.16, true);
    // the body: a place in front of the mark, where it shows fully
    var ts = 0;
    for (i = 0; i < 30; i++) { var tt = ctx.rnd() * TAU, bp = body(tt); if (bp[2] > 30 && vis(ctx, bp) > 0.9) { ts = tt; break; } ts = tt; }
    var cen = P(R1 * Math.cos(ts), R1 * Math.sin(ts)), b = body(ts), wheel = [];
    for (i = 0; i < 64; i++) { var w = i / 64 * TAU; wheel.push(P(R1 * Math.cos(ts) + R2 * Math.cos(w), R1 * Math.sin(ts) + R2 * Math.sin(w))); }
    fline(m, ctx, wheel, cc, 0.5, true);
    fseg(m, ctx, C, cen, ca, 0.3);
    fseg(m, ctx, cen, b, cc, 0.8);
    fpoint(m, ctx, cen, 3, ca, 0.9);
    if (vis(ctx, b) > 0.6) { m.sphere(b[0], b[1], b[2], 9, cc, 0.9); m.point(b[0], b[1], b[2], 58, cc, 0.4, true); m.point(b[0], b[1], b[2], 4, WHITE, 1); }
  });

  // two wave hoops round the mark: rings that rise and fall three or four times as they go round,
  // in opposite phase, so they cross each other like a braid. Each hoop is a band of two lines;
  // glass nodes sit where they cross.
  A.register('s16-braid', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), glass = ctx.tone('a', 0.95);
    var n = 3 + Math.floor(ctx.rnd() * 2), H = 30 + ctx.rnd() * 12, R = 282, ax = 0.46 + ctx.rnd() * 0.1, az = (ctx.rnd() - 0.5) * 0.3;
    var ph = ctx.rnd() * TAU, C = [30, (ctx.rnd() - 0.5) * 50, 0], i;
    function hoop(a, s, r) { return add(tilt(r * Math.cos(a), s * H * Math.sin(n * a + ph), r * Math.sin(a), ax, az), C); }
    [1, -1].forEach(function (s, k) {
      [0, 7].forEach(function (off, j) {
        var pts = [];
        for (var i2 = 0; i2 < 240; i2++) pts.push(hoop(i2 / 240 * TAU, s, R - off));
        fline(m, ctx, pts, k ? cc : ca, j ? 0.24 : 0.66, true);
      });
      for (var d = 0; d < 36; d++) fpoint(m, ctx, hoop(ctx.rnd() * TAU, s, R - 3.5), 2, k ? cb : ca, 0.85);
    });
    for (i = 0; i < 2 * n; i++) {
      var a = (i * Math.PI - ph) / n;
      lamp(m, ctx, hoop(a, 1, R - 3.5), 11, glass, cb, [ctx.rnd() * 3, ctx.rnd() * 3, 0], 3.4);
    }
  });

  // small upright hoops threaded on a tilted ring round the mark, each standing across the ring so
  // the ring runs through its middle. Some hoops are doubled; each has a soft light inside.
  A.register('s16-threaded', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c');
    var R = 282, ax = 0.32 + ctx.rnd() * 0.06, az = (ctx.rnd() - 0.5) * 0.5, C = [30, (ctx.rnd() - 0.5) * 50, 0], n = 9 + Math.floor(ctx.rnd() * 3), i;
    function T(x, y, z) { return add(tilt(x, y, z, ax, az), C); }
    var ring = [];
    for (i = 0; i < 220; i++) { var a = i / 220 * TAU; ring.push(T(R * Math.cos(a), 0, R * Math.sin(a))); }
    fline(m, ctx, ring, cb, 0.5, true);
    for (i = 0; i < 40; i++) fpoint(m, ctx, ring[Math.floor(ctx.rnd() * ring.length)], 1.8, ca, 0.8);
    for (i = 0; i < n; i++) {
      var th = (i + 0.3 * ctx.rnd()) / n * TAU, rh = 20 + ctx.rnd() * 14, c = T(R * Math.cos(th), 0, R * Math.sin(th));
      if (vis(ctx, c) < 0.7) continue;
      var offs = i % 3 === 1 ? [-6, 6] : [-1.5, 1.5];
      offs.forEach(function (off) {
        var hp = [];
        for (var j = 0; j < 36; j++) {
          var b = j / 36 * TAU, rr = R + rh * Math.cos(b);
          hp.push(T(rr * Math.cos(th) - off * Math.sin(th), rh * Math.sin(b), rr * Math.sin(th) + off * Math.cos(th)));
        }
        fline(m, ctx, hp, i % 2 ? ca : cc, i % 3 === 1 ? 0.85 : 0.6, true);
      });
      m.point(c[0], c[1], c[2], rh * 2.6, cc, 0.28, true);
      m.point(c[0], c[1], c[2], 3, WHITE, 0.9);
    }
  });

  // a spiral stair: thin glass steps rising round the mark on a helix, each step pointing out from
  // the axis. A post stands on the outer end of every step and a rail runs along their tops; every
  // fourth post carries a light. The steps in front of the mark are fainter.
  A.register('s16-spiral-stair', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), glass = ctx.tone('a', 0.95);
    var N = 32, turns = 1.35 + ctx.rnd() * 0.25, a0 = ctx.rnd() * TAU, sg = side(ctx.rnd), R = 222, cx = 56, i;
    function stepAt(t) { return [a0 + sg * t * turns * TAU, -292 + 556 * t]; }
    for (i = 0; i < N; i++) {
      var s = stepAt(i / (N - 1)), a = s[0], c = [cx + R * Math.cos(a), s[1], R * Math.sin(a)], f = vis(ctx, c);
      if (f > 0.55) m.glass(c[0], c[1], c[2], 58, 3.5, 24, glass, (c[2] > 40 ? 0.45 : 0.8) * f, [0, -a, 0]);
      var o = [cx + (R + 26) * Math.cos(a), s[1], (R + 26) * Math.sin(a)], top = [o[0], o[1] + 40, o[2]];
      fseg(m, ctx, o, top, ca, 0.5, 3);
      if (i % 4 === 2) lamp(m, ctx, top, 8, glass, cc, null, 5);
    }
    var rail = [], stringer = [];
    for (i = 0; i <= 300; i++) {
      var q = stepAt(i / 300);
      rail.push([cx + (R + 26) * Math.cos(q[0]), q[1] + 40, (R + 26) * Math.sin(q[0])]);
      stringer.push([cx + (R - 29) * Math.cos(q[0]), q[1] - 3, (R - 29) * Math.sin(q[0])]);
    }
    fline(m, ctx, rail, cb, 0.6, false, frontDim(0.6));
    fline(m, ctx, stringer, ca, 0.2, false, frontDim(0.6));
  });


  // a truss ring round the mark: three chords (two at the ring, one outside it) tied by posts and
  // zigzag braces, like the frame of a ring-shaped station. Glass modules ride it at three places.
  // The braces in front of the mark are fainter, so the mark stays clear.
  A.register('s16-truss', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), glass = ctx.tone('a', 0.95);
    var R = 268, ax = 0.3 + ctx.rnd() * 0.08, az = (ctx.rnd() - 0.5) * 0.5, C = [30, (ctx.rnd() - 0.5) * 60, 0], N = 64, i, j;
    function T(r, y, a) { return add(tilt(r * Math.cos(a), y, r * Math.sin(a), ax, az), C); }
    function chord(r, y) { var o = []; for (var k = 0; k < N; k++) o.push(T(r, y, k / N * TAU)); return o; }
    var A1 = chord(R, 12), B1 = chord(R, -12), C1 = chord(R + 22, 0), dim = frontDim(0.5);
    fline(m, ctx, A1, ca, 0.6, true, dim); fline(m, ctx, B1, ca, 0.6, true, dim); fline(m, ctx, C1, cb, 0.55, true, dim);
    for (i = 0; i < N; i++) {
      j = (i + 1) % N;
      [[A1[i], B1[i]], [A1[i], C1[i]], [B1[i], C1[i]], [A1[i], B1[j]], [B1[i], C1[j]], [C1[i], A1[j]]].forEach(function (e, k) {
        fline(m, ctx, [e[0], e[1]], k < 3 ? ca : cb, k < 3 ? 0.32 : 0.22, false, dim);
      });
      fpoint(m, ctx, C1[i], 1.8, ca, 0.85);
    }
    var a0 = ctx.rnd() * TAU;
    for (i = 0; i < 3; i++) {
      var a = a0 + i * TAU / 3, p = T(R + 8, 0, a);
      if (!lamp(m, ctx, p, 20, glass, cc, euler(mul(rz(az), mul(rx(ax), ry(-a)))), 2.6)) continue;
      fpoint(m, ctx, T(R + 8, 22, a), 2.4, cc, 0.9);
    }
  });

  /* ---------- 01-backdrop ---------- */

  // a gravity well far behind the mark: a polar grid of dotted rings and spokes, sinking steeply
  // toward its throat. Every third ring is a line in the accent; light gathers in the throat.
  A.register('s16-gravity-well', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c');
    var z0 = -230, s = seenAt(40, -40 + ctx.rnd() * 40, z0), ax = 0.5 + ctx.rnd() * 0.12, H = 320, r0 = 44, spin = ctx.rnd() * TAU, i, k;
    function W(r, a) { var q = tilt(r * Math.cos(a + spin), -H * r0 / (r + r0) + 40, r * Math.sin(a + spin), ax, 0); return [q[0] + s[0], q[1] + s[1], q[2] + z0]; }
    for (k = 0; k < 12; k++) {
      var r = 22 * Math.pow(1.3, k), n = Math.max(24, Math.round(TAU * r / 8)), lit = k % 3 === 1;
      for (i = 0; i < n; i++) fpoint(m, ctx, W(r, i / n * TAU + k * 0.13), lit ? 2 : 1.5, lit ? cb : ca, 0.25 + 0.45 * (1 - k / 12));
      if (lit) { var pts = []; for (i = 0; i < 160; i++) pts.push(W(r, i / 160 * TAU)); fline(m, ctx, pts, cb, 0.4, true); }
    }
    for (k = 0; k < 24; k++) {
      var sp = [], a = k / 24 * TAU;
      for (i = 0; i <= 40; i++) sp.push(W(20 + Math.pow(i / 40, 1.6) * 400, a));
      fline(m, ctx, sp, ca, 0.17, false);
    }
    var t = W(14, 0);
    m.point(t[0], t[1], t[2], 150, cc, 0.32, true); m.point(t[0], t[1], t[2], 34, cc, 0.7, true); m.point(t[0], t[1], t[2], 5, WHITE, 1);
  });

  // a portal: a large ring standing upright far behind the mark, a band of three lines with nine
  // glass chevrons round it and fine ticks outside, and a swirl of light inside, three arms winding
  // in to a bright core. The mark stands in front of the core as a silhouette.
  A.register('s16-portal', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), glass = ctx.tone('a', 0.95);
    var z0 = -190, s = seenAt(42, 6, z0), C = [s[0], s[1], z0], R = 300, M = ry((0.16 + ctx.rnd() * 0.12) * side(ctx.rnd)), sg = side(ctx.rnd), i;
    var arms = ctx.rnd() < 0.5 ? 2 : 3, chev = [6, 8, 9][Math.floor(ctx.rnd() * 3)];
    function at(p) { return add(app(M, p), C); }
    fline(m, ctx, circle(M, R + 6, 220, C), ca, 0.3, true);
    fline(m, ctx, circle(M, R, 220, C), cb, 0.7, true);
    fline(m, ctx, circle(M, R - 10, 220, C), ca, 0.24, true);
    for (i = 0; i < 90; i++) { var a = i / 90 * TAU; fpoint(m, ctx, at([(R + 15) * Math.cos(a), (R + 15) * Math.sin(a), 0]), i % 10 ? 1.4 : 2.6, ca, 0.7); }
    for (i = 0; i < chev; i++) {
      var th = Math.PI / 2 + i / chev * TAU, p = at([(R - 3) * Math.cos(th), (R - 3) * Math.sin(th), 0]), f = vis(ctx, p);
      if (f < 0.5) continue;
      m.glass(p[0], p[1], p[2], 12, 24, 12, glass, 0.85 * f, euler(mul(M, rz(th))));
      m.point(p[0], p[1], p[2], 34, cc, 0.3 * f, true);
    }
    for (i = 0; i < 1700; i++) {
      var rr = R * 0.92 * Math.pow(ctx.rnd(), 0.6), arm = Math.floor(ctx.rnd() * arms);
      var an = arm * TAU / arms + sg * Math.log(rr / R + 0.03) * 2.3 + gauss(ctx.rnd) * 0.32;
      var q = at([rr * Math.cos(an), rr * Math.sin(an), gauss(ctx.rnd) * 8]);
      fpoint(m, ctx, q, 1.2 + ctx.rnd() * 1.5, mix(ca, cb, rr / R), 0.18 + 0.5 * (1 - rr / R));
    }
    m.point(C[0], C[1], C[2], 260, cb, 0.1, true);
    m.point(C[0], C[1], C[2], 110, cc, 0.35, true);
  });

  // a wormhole: rings of dots facing the viewer, running back from just behind the mark into the
  // distance, smaller and fainter as they go, along a path that bends a different way on each card
  // (never down and to the left, where the art fades into the text side). Every other ring is also a
  // line, every fourth in the accent. Eight rails twist along the tunnel; light waits at its far end.
  A.register('s16-wormhole', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c');
    var K = 22, bend = -1.5 + ctx.rnd() * 4.4, reach = 70 + ctx.rnd() * 70, bx = Math.cos(bend) * reach, by = Math.sin(bend) * reach, twist = (0.35 + ctx.rnd() * 0.45) * side(ctx.rnd), rings = [], i, k;
    for (k = 0; k < K; k++) {
      var t = k / (K - 1), z = -50 - 640 * Math.pow(t, 1.25), r = 300 * (1 - 0.62 * t), sp = seenAt(40 + bx * t * t, 6 + by * t * t, z);
      var g = { x: sp[0], y: sp[1], z: z, r: r, t: t }, n = Math.round(84 - 34 * t), lit = k % 2 === 0;
      rings.push(g);
      for (i = 0; i < n; i++) {
        var a = i / n * TAU + t * twist;
        fpoint(m, ctx, [g.x + r * Math.cos(a), g.y + r * Math.sin(a), z], 2 - t * 0.7, k % 4 ? ca : cb, 0.8 * (1 - 0.7 * t));
      }
      if (lit) { var pts = []; for (i = 0; i < 150; i++) { var b = i / 150 * TAU; pts.push([g.x + r * Math.cos(b), g.y + r * Math.sin(b), z]); } fline(m, ctx, pts, k % 4 ? ca : cb, (k % 4 ? 0.2 : 0.42) * (1 - 0.55 * t), true); }
    }
    for (var j = 0; j < 8; j++) {
      var a0 = j / 8 * TAU;
      fline(m, ctx, rings.map(function (g2) { var a2 = a0 + g2.t * twist; return [g2.x + g2.r * Math.cos(a2), g2.y + g2.r * Math.sin(a2), g2.z]; }), ca, 0.14, false);
    }
    var e = rings[K - 1];
    m.point(e.x, e.y, e.z, 170, cc, 0.36, true); m.point(e.x, e.y, e.z, 34, ca, 0.7, true);
  });

  // star trails: a long exposure of the sky far behind the mark, short arcs of every length turning
  // round a pole near the top left. Most are faint white; a few are in the light or the glow, and
  // some end in a bright star.
  A.register('s16-star-trails', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c');
    var z0 = -320, P = seenAt(-200 + ctx.rnd() * 50, 310 + ctx.rnd() * 30, z0), sweep = (ctx.rnd() < 0.5 ? -1 : 1), i;
    for (i = 0; i < 160; i++) {
      var rho = 24 + Math.pow(ctx.rnd(), 0.8) * 820, mid = -Math.PI / 4 + (ctx.rnd() - 0.5) * 1.9;
      var len = (0.12 + ctx.rnd() * 0.42) * Math.min(1.6, 0.4 + 200 / rho), n = Math.max(4, Math.ceil(rho * len / 7)), pts = [];
      for (var j = 0; j <= n; j++) { var a = mid + sweep * (j / n - 0.5) * len; pts.push([P[0] + rho * Math.cos(a), P[1] + rho * Math.sin(a), z0]); }
      var pick = ctx.rnd(), col = pick < 0.1 ? cc : pick < 0.32 ? cb : ca, alpha = 0.1 + Math.pow(ctx.rnd(), 2) * 0.5;
      fline(m, ctx, pts, col, alpha, false);
      if (ctx.rnd() < 0.25) fpoint(m, ctx, pts[sweep > 0 ? n : 0], 2.4, col, Math.min(1, alpha + 0.35));
    }
  });

  /* ---------- 05-signal ---------- */

  // particle tracks: curls of fine points flying out of one bright point in front of the mark. Each
  // track's radius shrinks steadily as it runs, so it leaves in a long arc and ends in a tight spiral.
  // Two pairs leave side by side and curl opposite ways; two tracks stay almost straight.
  A.register('s16-tracks', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), glass = ctx.tone('a', 0.95);
    var V = [50 + (ctx.rnd() - 0.5) * 70, -40 + (ctx.rnd() - 0.5) * 90, 36], M = mul(ry(0.3 * side(ctx.rnd)), rx(0.28)), n = 10 + Math.floor(ctx.rnd() * 4), a0 = 0, sgn = 1;
    for (var i = 0; i < n; i++) {
      var straight = i >= n - 2, paired = i < 4;
      if (!paired || i % 2 === 0) { a0 = ctx.rnd() * TAU; sgn = side(ctx.rnd); } else sgn = -sgn;
      // the radius runs down from r0 to nothing over the length S
      var al = a0 + (paired && i % 2 ? 0.08 : 0), r0 = straight ? 2400 : 150 + ctx.rnd() * 260, S = straight ? 440 + ctx.rnd() * 140 : r0 * (1.1 + ctx.rnd() * 0.7);
      var u = 0, v = 0, col = i % 3 === 1 ? cb : ca;
      for (var s = 0; s < S; s += 3.4) {
        var rad = r0 * (1 - s / S);
        if (rad < 3.5) break;
        al += sgn * 3.4 / rad; u += 3.4 * Math.cos(al); v += 3.4 * Math.sin(al);
        var p = add(app(M, [u, v, 0]), V);
        fpoint(m, ctx, p, 1.8, col, 0.95 * (1 - 0.45 * s / S));
      }
    }
    m.point(V[0], V[1], V[2], 90, cc, 0.5, true);
    lamp(m, ctx, V, 9, glass, cc, null, 3);
  });

  // an S curl: points along a clothoid, a curve that bends more the further it runs, so it crosses
  // the mark as a gentle S and winds into a tight curl at each end. The curls are brighter and in
  // the glow; a small lit cube sits in each curl's eye.
  A.register('s16-curl', function (m, ctx) {
    var ca = ctx.light('a'), cc = ctx.light('c'), glass = ctx.tone('a', 0.95);
    var T = 3.3, S = 300 + ctx.rnd() * 40, flip = ctx.rnd() < 0.5, psi = ((flip ? -10 : 80) + (ctx.rnd() - 0.5) * 16) * Math.PI / 180;
    var C = [22, 0, 0], cs = Math.cos(psi), sn = Math.sin(psi), ds = 0.0045, x = 0, y = 0, half = [];
    for (var s = 0; s < T; s += ds) { x += Math.cos(Math.PI * s * s / 2) * ds; y += Math.sin(Math.PI * s * s / 2) * ds; half.push([s, x, y]); }
    function place(sx, px, py) {
      var lx = px * S, ly = (flip ? -py : py) * S;
      return [C[0] + lx * cs - ly * sn, C[1] + lx * sn + ly * cs, 46 + 34 * sx / T];
    }
    for (var i = 0; i < half.length; i += half[i][0] > 1 ? 1 : 2) {
      var h = half[i], w = h[0] / T;
      [1, -1].forEach(function (d) {
        var p = place(d * h[0], d * h[1], d * h[2]);
        fpoint(m, ctx, p, 1.6 + 1.2 * w, mix(ca, cc, w), 0.55 + 0.45 * w);
      });
    }
    var line = [];
    for (i = half.length - 1; i >= 0; i -= 4) line.push(place(-half[i][0], -half[i][1], -half[i][2]));
    for (i = 0; i < half.length; i += 4) line.push(place(half[i][0], half[i][1], half[i][2]));
    fline(m, ctx, line, cc, 0.22, false);
    [1, -1].forEach(function (d) { lamp(m, ctx, place(d * T, d * 0.5, d * 0.5), 9, glass, cc, null, 5); });
  });

  // a gate on the floor: a glowing ring under the mark, a band of fine lines with soft light along
  // it, and a curtain of light rising from its rim, bright at the floor and fading upward. Motes
  // drift up inside, and a faint ring answers it above the mark. The front of the curtain is fainter.
  A.register('s16-beam-gate', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c');
    var R = 186 + ctx.rnd() * 36, yf = -240, ax = 0.27 + ctx.rnd() * 0.08, cx = 28, top = 262, rise = 0.8 + ctx.rnd() * 0.4, i;
    function F(r, a, y) { var q = tilt(r * Math.cos(a), 0, r * Math.sin(a), ax, 0); return [q[0] + cx, q[1] + y, q[2]]; }
    function ring(r, y, n) { var o = []; for (var j = 0; j < n; j++) o.push(F(r, j / n * TAU, y)); return o; }
    for (i = 0; i < 6; i++) fline(m, ctx, ring(R - 6 + i * 3, yf, 180), i === 2 ? cc : cb, i === 2 ? 0.75 : 0.26, true);
    [0.33, 0.62, 0.84].forEach(function (f, k) { fline(m, ctx, ring(R * f, yf, 120), cb, 0.12 + k * 0.04, true); });
    for (i = 0; i < 28; i++) fpoint(m, ctx, F(R, i / 28 * TAU, yf), 34, cc, 0.16, true);
    for (i = 0; i < 72; i++) {
      var a = (i + ctx.rnd() * 0.5) / 72 * TAU, p = F(R, a, yf), f = vis(ctx, p);
      if (f < 0.5) continue;
      m.quad(p[0], p[1], p[2], 0, 6 + ctx.rnd() * 5, (300 + ctx.rnd() * 140) * rise, i % 3 ? cb : cc, ((p[2] > 0 ? 0.035 : 0.075) + ctx.rnd() * 0.03) * f, 'fade');
    }
    if (ctx.rnd() < 0.65) fline(m, ctx, ring(R, top, 160), ca, 0.2, true);
    for (i = 0; i < 180; i++) {
      var rr = R * 0.95 * Math.sqrt(ctx.rnd()), h = Math.pow(ctx.rnd(), 1.6);
      fpoint(m, ctx, F(rr, ctx.rnd() * TAU, yf + h * 480), 1.3 + ctx.rnd() * 1.4, ctx.rnd() < 0.3 ? cc : ca, 0.75 * (1 - h));
    }
  });


  // a pair of gates: two small upright rings, one above the mark on the left and one beside it on
  // the right, each with a soft light and a swirl of motes inside, joined by an arc of light that
  // leaves one and enters the other, passing in front of the mark.
  A.register('s16-gate-pair', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), glass = ctx.tone('a', 0.95), i;
    var flip = ctx.rnd() < 0.5;
    var P = [[-118, 268 + ctx.rnd() * 16, 70], [246, -150 + ctx.rnd() * 60, 50]];
    if (flip) P = [[-150, -236 - ctx.rnd() * 20, 70], [248, 120 + ctx.rnd() * 50, 50]];
    var Ms = [ry(0.55 + ctx.rnd() * 0.2), ry(-(0.55 + ctx.rnd() * 0.2))], r = 40;
    P.forEach(function (c, k) {
      var M = Ms[k];
      fline(m, ctx, circle(M, r, 64, c), k ? cb : ca, 0.85, true);
      fline(m, ctx, circle(M, r - 5, 64, c), cc, 0.35, true);
      for (i = 0; i < 12; i++) { var a = i / 12 * TAU; fpoint(m, ctx, add(app(M, [(r + 7) * Math.cos(a), (r + 7) * Math.sin(a), 0]), c), i % 3 ? 1.4 : 2.6, ca, 0.8); }
      for (i = 0; i < 70; i++) {
        var rr = (r - 8) * Math.sqrt(ctx.rnd()), an = ctx.rnd() * TAU + rr * 0.08;
        fpoint(m, ctx, add(app(M, [rr * Math.cos(an), rr * Math.sin(an), 0]), c), 1.2 + ctx.rnd(), mix(cc, ca, rr / r), 0.5 + 0.4 * (1 - rr / r));
      }
      m.point(c[0], c[1], c[2], r * 2.6, cc, 0.4 * vis(ctx, c), true);
      lamp(m, ctx, add(app(M, [0, r + 2, 0]), c), 8, glass, cc, euler(M), 3);
    });
    // the arc between them, bowed toward the viewer: a quadratic curve through a point in front
    var a0 = P[0], b0 = P[1], bow = flip ? -1 : 1, mid = [(a0[0] + b0[0]) / 2 + 95, (a0[1] + b0[1]) / 2 + 95 * bow, 170], arc = [];
    for (i = 0; i <= 160; i++) {
      var t = i / 160, u = 1 - t, q = [u * u * a0[0] + 2 * u * t * mid[0] + t * t * b0[0], u * u * a0[1] + 2 * u * t * mid[1] + t * t * b0[1], u * u * a0[2] + 2 * u * t * mid[2] + t * t * b0[2]];
      arc.push(q);
      var e = Math.min(t, 1 - t) * 2;
      if (i % 2 === 0) fpoint(m, ctx, q, 1.7, mix(cc, ca, e), 0.9 - 0.4 * e);
    }
    fline(m, ctx, arc, cb, 0.3, false);
    for (i = 0; i < 5; i++) { var q2 = arc[20 + Math.floor(ctx.rnd() * 120)]; fpoint(m, ctx, q2, 22, cc, 0.35, true); fpoint(m, ctx, q2, 3, WHITE, 1); }
  });

  /* ---------- 06-particles ---------- */

  // small hoops floating in front of the mark, each at its own turn: plain rings, doubled glass
  // rings, pairs linked through each other, lit rings with a soft light inside (small portals) and
  // tiny gyroscopes of three rings. They keep apart and clear of the card's words.
  A.register('s16-hoops', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), n = 9 + Math.floor(ctx.rnd() * 6), placed = [], tries = 0;
    function hoop(M, r, c, col, alpha) { var n = Math.max(28, Math.round(r * 2)); fline(m, ctx, circle(M, r, n, c), col, alpha, true); fline(m, ctx, circle(M, r - 1.6, n, c), col, alpha * 0.6, true); }
    while (placed.length < n && tries++ < 300) {
      var c = [-215 + ctx.rnd() * 520, -300 + ctx.rnd() * 600, 40 + ctx.rnd() * 110];
      if (vis(ctx, c) < 0.95 || !ctx.clearAt(c[0], c[1], c[2], 36)) continue;
      if (placed.some(function (q) { return Math.hypot(q[0] - c[0], q[1] - c[1]) < 70; })) continue;
      placed.push(c);
      var r = 12 + ctx.rnd() * 18, M = mul(rz(ctx.rnd() * TAU), mul(rx((0.25 + ctx.rnd() * 0.85) * side(ctx.rnd)), ry((ctx.rnd() - 0.5) * 0.6))), kind = ctx.rnd();
      if (kind < 0.22) {                                           // a lit ring: a small portal
        hoop(M, r, c, cc, 0.9);
        m.point(c[0], c[1], c[2], r * 3, cc, 0.45, true); m.point(c[0], c[1], c[2], 3.5, WHITE, 1);
      } else if (kind < 0.42) {                                    // two rings linked through each other
        var d = app(M, [r * 0.9, 0, 0]);
        hoop(M, r, c, ca, 0.85);
        hoop(mul(M, rx(Math.PI / 2)), r, add(c, d), cb, 0.85);
      } else if (kind < 0.56) {                                    // a tiny gyroscope
        hoop(M, r, c, ca, 0.8); hoop(mul(M, ry(Math.PI / 2)), r * 0.86, c, cb, 0.8); hoop(mul(M, rx(Math.PI / 2)), r * 0.72, c, cc, 0.8);
        m.point(c[0], c[1], c[2], 2.6, WHITE, 0.95);
      } else {                                                     // a plain ring, sometimes doubled like glass
        var col = ctx.rnd() < 0.6 ? ca : cb;
        hoop(M, r, c, col, 0.85);
        if (ctx.rnd() < 0.5) hoop(M, r - 2.6, c, col, 0.35);
        var pts = circle(M, r, 3, c);
        pts.forEach(function (p) { m.point(p[0], p[1], p[2], 2, col, 0.9); });
      }
    }
  });
})();

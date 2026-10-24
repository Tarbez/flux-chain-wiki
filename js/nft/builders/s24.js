/* DEFXN identity card: builders from sheet 24 (world backdrops). Each one is a PLACE far behind the
   mark: a sea at sunrise, a transit tube, a harbour city, a wire mountain range, a ringed giant
   rising, sky islands, an ice cave, a data ocean, the inside of an orbital ring, a dune sea, a forest
   of light, a nave of arches, an aurora over a plain, a deep trench, a far gate, a night pier, a
   bridge over fog, a neon street, a plain of glowing fissures and an array of dishes. Each builder is
   named by an element file under layers/01-backdrop/sheet-24/. The space and the m / ctx calls are
   described at the top of art3d.js. Every random value comes from ctx.rnd(), so the same card always
   draws the same place.

   WHY WIDE. A site that loads nft-engine.js draws the card's art as the world behind the whole site,
   in a strip much wider than the card, and the shop shows a backdrop alone. So each place runs well
   past the card on both sides, stays dim enough for a site's words over it, and reads as a place
   when it is all there is.

   THE VIEW. A place is built in a frame that looks where the card looks (view below): X runs right,
   Y up, and D away from the eye, along the line of sight through the card point (sx, sy). A thing at
   (X, Y, D) is seen at the slopes (X / D, Y / D) from that point, so a place is laid out by slopes:
   the card shows about -0.25..0.19 across and -0.31..0.25 up; the wide site shows about -0.72..0.31
   across. The frame is found from ctx.seen alone, so it follows the card's tilt if that changes.
   Nothing is drawn nearer than z -150 (behind), and nothing farther than D 4800 (the camera's reach).

   Colour: solids are ctx.tone('a', v); light is ctx.light('b'); glow and accents ctx.light('c'). The
   palette sets the mood: the same sunrise is gold in one palette and cold cyan in another. */
(function () {
  'use strict';
  var A = window.Art3D, TAU = Math.PI * 2, ZMAX = -150;
  if (!A || !A.register) { console.error('js/nft/builders/s24.js: Art3D is not loaded. Load js/nft/art3d.js first. traits.js loads this file when a card needs it.'); return; }

  /* ---------- vectors and small numbers ---------- */
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function mul(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function unit(a) { var k = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / k, a[1] / k, a[2] / k]; }
  function mix(p, q, t) { return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t]; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function smooth(e0, e1, v) { var t = clamp((v - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
  function fract(v) { return v - Math.floor(v); }
  function gauss(ctx) { return ctx.rnd() + ctx.rnd() + ctx.rnd() - 1.5; }
  // a size that is seen as about s card units at distance D
  function sz(D, s) { return s * D / 1250; }

  // smooth 2D value noise, its lattice drawn from the card's own random stream
  function noise2(ctx) {
    var P = [], V = [], i, j, t;
    for (i = 0; i < 256; i++) { P.push(i); V.push(ctx.rnd()); }
    for (i = 255; i > 0; i--) { j = Math.floor(ctx.rnd() * (i + 1)); t = P[i]; P[i] = P[j]; P[j] = t; }
    function h(x, y) { return V[P[(P[x & 255] + y) & 255]]; }
    return function (x, y) {
      var xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
      fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      var a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
      return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    };
  }
  function fbm(n, x, y, oct) {
    var v = 0, amp = 0.5, tot = 0;
    for (var o = 0; o < oct; o++) { v += amp * n(x, y); tot += amp; x = x * 2.03 + 17.1; y = y * 2.03 + 5.3; amp *= 0.5; }
    return v / tot;
  }

  // the XYZ Euler turn (three.js order, the order a block's rot uses) that carries a block's own x, y
  // and z axes onto e1, e2 and e3
  function rotOf(e1, e2, e3) {
    var m13 = clamp(e3[0], -1, 1), y = Math.asin(m13);
    if (Math.abs(m13) < 0.9999999) return [Math.atan2(-e3[1], e3[2]), y, Math.atan2(-e2[0], e1[0])];
    return [Math.atan2(e2[2], e2[1]), y, 0];
  }

  /* ---------- the view ---------- */
  // the art point at depth z that the card shows at (xs, ys): Art3D.seen run backwards
  function seenAt(ctx, xs, ys, z) {
    var x = xs, y = ys;
    for (var i = 0; i < 24; i++) { var s = ctx.seen(x, y, z); x += xs - s[0]; y += ys - s[1]; }
    return [x, y, z];
  }
  function sight(ctx, xs, ys) { var p = seenAt(ctx, xs, ys, -200), q = seenAt(ctx, xs, ys, -1700); return { p: p, d: unit(sub(q, p)) }; }
  // the frame that looks through the card point (sx, sy). The eye is where two lines of sight meet
  function view(ctx, sx, sy) {
    var a = sight(ctx, sx, sy), b = sight(ctx, sx + 300, sy - 200);
    var w0 = sub(a.p, b.p), aa = dot(a.d, a.d), ab = dot(a.d, b.d), bb = dot(b.d, b.d), ad = dot(a.d, w0), bd = dot(b.d, w0);
    var s = (ab * bd - bb * ad) / (aa * bb - ab * ab), eye = add(a.p, mul(a.d, s));
    var f = a.d, r = unit(cross(f, [0, 1, 0])), u = cross(r, f);
    function p(X, Y, D) {
      return [eye[0] + X * r[0] + Y * u[0] + D * f[0], eye[1] + X * r[1] + Y * u[1] + D * f[1], eye[2] + X * r[2] + Y * u[2] + D * f[2]];
    }
    return {
      eye: eye, f: f, r: r, u: u, p: p,
      at: function (tx, ty, D) { return p(tx * D, ty * D, D); },
      rot: rotOf(r, u, mul(f, -1)),                      // a block squared to the frame
      yaw: Math.atan2(-r[2], r[0])                       // a block standing upright, squared to it
    };
  }

  /* ---------- drawing, kept behind the mark ---------- */
  function behind(P) { return P[2] <= ZMAX; }
  // a line through art points, broken where it comes nearer than ZMAX. Each run of up to k segments
  // takes the alpha a * fade(its middle point), so a long line can fade along its length
  function trace(m, P, c, a, fade, k) {
    k = k || 8;
    var n = P.length, i = 0;
    while (i < n - 1) {
      if (!behind(P[i]) || !behind(P[i + 1])) { i++; continue; }
      var j = i + 1;
      while (j + 1 < n && j - i < k && behind(P[j + 1])) j++;
      var flat = [];
      for (var q = i; q <= j; q++) flat.push(P[q][0], P[q][1], P[q][2]);
      var al = a * (fade ? fade(P[(i + j) >> 1]) : 1);
      if (al > 0.004) m.line(flat, c, al);
      i = j;
    }
  }
  function loop(P) { return P.concat([P[0]]); }
  function seg(m, P, Q, c, a) { if (a > 0.004 && behind(P) && behind(Q)) m.line([P[0], P[1], P[2], Q[0], Q[1], Q[2]], c, a); }
  function pt(m, P, s, c, a, soft) { if (a > 0.004 && behind(P)) m.point(P[0], P[1], P[2], s, c, a, soft); }
  // a bright point, kept off the card's words
  function lamp(m, ctx, P, s, c, a, soft) { if (a > 0.004 && behind(P) && ctx.clearAt(P[0], P[1], P[2], 10)) m.point(P[0], P[1], P[2], s, c, a, soft); }
  function streak(m, P, ang, w, len, c, a, mode, segs) { if (a > 0.004 && behind(P)) m.quad(P[0], P[1], P[2], ang, w, len, c, a, mode, segs); }
  // a soft horizontal band of light centred on P: a wide streak, brightest in its middle
  function band(m, P, len, w, c, a) { streak(m, [P[0] + len / 2, P[1], P[2]], Math.PI / 2, w, len, c, a, 'peak'); }
  // a big soft glow at P; its size is held to what one point sprite can draw
  function glow(m, ctx, P, D, s, c, a) { lamp(m, ctx, P, Math.min(s, D * 0.14), c, a, true); }

  // a starry sky over the slopes ty0..ty1, across the whole wide view. skip(tx, ty) leaves a star out
  function stars(m, ctx, V, n, ty0, ty1, skip, dim) {
    var cw = ctx.tone('a', 0.95), cb = ctx.light('b'), cc = ctx.light('c'), k = dim == null ? 1 : dim;
    for (var i = 0, nn = Math.round(n * 1.3); i < nn; i++) {
      var tx = -1.08 + ctx.rnd() * 2.2, ty = ty0 + (ty1 - ty0) * Math.pow(ctx.rnd(), 0.85), D = 4300 + ctx.rnd() * 450, roll = ctx.rnd();
      if (skip && skip(tx, ty)) continue;
      var P = V.at(tx, ty, D), h = 0.35 + 0.65 * smooth(ty0, ty0 + 0.1, ty), big = roll < 0.05, c = roll < 0.13 ? cb : roll < 0.17 ? cc : cw;
      pt(m, P, sz(D, big ? 2.4 : 1 + ctx.rnd() * 0.9), c, (big ? 0.75 : 0.14 + ctx.rnd() * 0.42) * h * k);
      if (big && ctx.rnd() < 0.5) lamp(m, ctx, P, sz(D, 13), c, 0.1 * k, true);
    }
  }
  // rows of a sea from near to far: each row a slightly rippled line. The sea plane rises a little
  // with distance, so its far edge sits just under the frame's middle (the horizon)
  function seaY(D, yn, yf) { return yn + (yf - yn) * clamp((D - 1750) / (4700 - 1750), 0, 1); }

  /* ================= the places ================= */

  // SUNRISE SEA: a sun half up out of a calm sea, cut by bands that widen toward the water, its
  // glitter path running to the viewer over rows of small waves, thin clouds across it, last stars
  A.register('s24-sunrise', function (m, ctx) {
    var V = view(ctx, 60, -10 + ctx.rnd() * 30), cw = ctx.tone('a', 0.85), cb = ctx.light('b'), cc = ctx.light('c');
    var yn = -560, yf = -40, DS = 4750, yh = yf / 4700;
    var sx = 0.13 + ctx.rnd() * 0.04, sr = 0.1 + ctx.rnd() * 0.02, sy = yh + sr * (0.35 + ctx.rnd() * 0.25), top = sy + sr;
    var cut = sy + sr * 0.3, period = 0.016 + ctx.rnd() * 0.004;
    for (var ty = top - 0.0012; ty > yh + 0.001; ty -= 0.0019) {
      var h = Math.sqrt(Math.max(0, sr * sr - (ty - sy) * (ty - sy)));
      if (h < 0.004) continue;
      if (ty < cut && fract((cut - ty) / period) < 0.14 + 0.6 * (cut - ty) / (cut - yh)) continue;
      var v = (top - ty) / (top - yh), row = [];
      for (var s = 0; s <= 10; s++) row.push(V.at(sx - h + 2 * h * s / 10, ty, DS));
      trace(m, row, mix(cc, cb, v * 0.75), 0.42 - 0.16 * v, null, 10);
    }
    glow(m, ctx, V.at(sx, sy, 4700), 4700, 700, cc, 0.2);
    band(m, V.at(sx, yh + 0.004, 4700), 4700 * 1.7, 4700 * 0.05, cc, 0.13);
    band(m, V.at(sx, yh + 0.002, 4700), 4700 * 0.7, 4700 * 0.012, mix(cc, cb, 0.4), 0.22);
    // thin clouds drifting across the sun
    for (var k = 0, nk = 6 + Math.floor(ctx.rnd() * 5); k < nk; k++) {
      var cy = sy + sr * (0.15 + ctx.rnd() * 1.6), cx = sx + gauss(ctx) * 0.35, D1 = 4400;
      band(m, V.at(cx, cy, D1), D1 * (0.12 + ctx.rnd() * 0.4), sz(D1, 1.4 + ctx.rnd() * 2.6), mix(cc, cb, ctx.rnd()), 0.07 + ctx.rnd() * 0.12);
    }
    // the sea: rows of small waves, closer together toward the horizon
    var ph = ctx.rnd() * TAU;
    for (var j = 0, D = 1760; D <= 4700; j++, D *= 1.045) {
      var Y = seaY(D, yn, yf), line = [], amp = sz(D, 1.6), near = 1 - (D - 1760) / 2940;
      for (var i = 0; i <= 110; i++) {
        var tx = -1.1 + 2.5 * i / 110, X = tx * D;
        line.push(V.p(X, Y + amp * Math.sin(X * 0.012 + ph + j * 1.7) + amp * 0.6 * Math.sin(X * 0.031 + j), D));
      }
      trace(m, line, cw, 0.07 + 0.13 * near, null, 8);
    }
    trace(m, (function () { var q = []; for (var i = 0; i <= 60; i++) q.push(V.p((-1.1 + 2.5 * i / 60) * 4720, yf, 4720)); return q; })(), cb, 0.26, null, 10);
    // the glitter path under the sun, wider near the viewer
    for (var g = 0; g < 170; g++) {
      var t = Math.pow(ctx.rnd(), 0.8), Dg = 1800 + (4650 - 1800) * t, spread = 0.008 + 0.06 * (1 - t);
      var Pg = V.p((sx + gauss(ctx) * spread) * Dg, seaY(Dg, yn, yf) + 2, Dg), len = Dg * (0.004 + 0.018 * ctx.rnd() * (1 - 0.6 * t));
      band(m, Pg, len, sz(Dg, 1 + ctx.rnd() * 1.4), mix(cc, cb, ctx.rnd() * 0.5), (0.2 + 0.35 * ctx.rnd()) * (1 - 0.4 * t));
    }
    for (var q = 0; q < 220; q++) {
      var Dq = 1800 + 2900 * Math.pow(ctx.rnd(), 0.7), Pq = V.p((-1.1 + ctx.rnd() * 1.62) * Dq, seaY(Dq, yn, yf) + 3, Dq);
      pt(m, Pq, sz(Dq, 1.2), ctx.rnd() < 0.3 ? cb : cw, 0.08 + ctx.rnd() * 0.22);
    }
    stars(m, ctx, V, 170, yh + 0.08, 0.32, function (tx, ty) { return Math.hypot(tx - sx, ty - sy) < sr * 1.8; }, 0.6);
  });

  // TRANSIT TUBE: inside a long hexagonal tube: frame after frame with lamps at their corners, light
  // strips running along the walls, a track on the floor, a train of light far down the line and the
  // tube's bright mouth at the end
  A.register('s24-tube', function (m, ctx) {
    var V = view(ctx, 50 + ctx.rnd() * 30, 0 + ctx.rnd() * 30), cw = ctx.tone('a', 0.85), cb = ctx.light('b'), cc = ctx.light('c');
    var R = 900, Yc = 240 + ctx.rnd() * 40, Ds = [], corners = [];
    for (var D = 1880; D <= 4650; D += 240) Ds.push(D);
    for (var c = 0; c < 6; c++) corners.push([Math.cos(c * Math.PI / 3), Math.sin(c * Math.PI / 3)]);
    var floor = Yc - R * Math.sin(Math.PI / 3);
    function at(D, k, rr) { return V.p(corners[k % 6][0] * rr, Yc + corners[k % 6][1] * rr, D); }
    function fade(D) { return 1 - 0.65 * (D - 1880) / (4650 - 1880); }
    Ds.forEach(function (D, j) {
      var f = fade(D), outer = [], inner = [];
      for (var k = 0; k < 6; k++) { outer.push(at(D, k, R)); inner.push(at(D + 20, k, R - 46)); }
      trace(m, loop(outer), cw, 0.34 * f, null, 6);
      trace(m, loop(inner), cb, 0.2 * f, null, 6);
      for (var q = 0; q < 6; q++) {
        seg(m, outer[q], inner[q], cw, 0.22 * f);
        if (q === 4 || q === 5) continue;                    // the floor corners stay dark
        lamp(m, ctx, inner[q], sz(D, 2.6), cc, 0.85 * f);
        lamp(m, ctx, inner[q], sz(D, 14), cc, (j % 2 ? 0.06 : 0.11) * f, true);
      }
      // wall panels between this frame and the next, outlined, now and then lit
      if (j + 1 < Ds.length) [[1, 2], [2, 3], [0, 1], [3, 4], [5, 0]].forEach(function (w) {
        if (ctx.rnd() < 0.45) return;
        var D2 = Ds[j + 1] - 40, a1 = at(D + 40, w[0], R - 60), a2 = at(D + 40, w[1], R - 60), b1 = at(D2, w[0], R - 60), b2 = at(D2, w[1], R - 60);
        var mid = function (P, Q, t) { return [P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t, P[2] + (Q[2] - P[2]) * t]; };
        var p1 = mid(a1, a2, 0.18), p2 = mid(a1, a2, 0.82), q1 = mid(b1, b2, 0.18), q2 = mid(b1, b2, 0.82);
        trace(m, loop([p1, p2, q2, q1]), ctx.rnd() < 0.3 ? cc : cb, (0.1 + 0.14 * ctx.rnd()) * f, null, 4);
      });
    });
    // light strips along the walls, the length of the tube
    [[1, 0.5], [2, 0.5], [0, 0.35], [3, 0.35]].forEach(function (s, i) {
      var k = s[0], o = 0.5, line = [];
      for (var D = 1880; D <= 4720; D += 120) {
        var P = at(D, k, R - 70), Q = at(D, k + 1, R - 70);
        line.push([P[0] + (Q[0] - P[0]) * o, P[1] + (Q[1] - P[1]) * o, P[2] + (Q[2] - P[2]) * o]);
      }
      trace(m, line, i < 2 ? cc : cb, s[1], function (P) { return 0.35 + 0.65 * clamp((P[2] + 3600) / 3200, 0, 1); }, 3);
    });
    // the track: two rails, sleepers, a broken light down the middle
    [-95, 95].forEach(function (x) { var rl = []; for (var D = 1880; D <= 4720; D += 120) rl.push(V.p(x, floor + 14, D)); trace(m, rl, cw, 0.45, function (P) { return 0.4 + 0.6 * clamp((P[2] + 3600) / 3200, 0, 1); }, 3); });
    for (var Dsl = 1900; Dsl < 4700; Dsl += 55) seg(m, V.p(-140, floor + 6, Dsl), V.p(140, floor + 6, Dsl), cw, 0.1 * fade(Dsl));
    for (var Dm = 1900; Dm < 4600; Dm += 160) seg(m, V.p(0, floor + 8, Dm), V.p(0, floor + 8, Dm + 70), cc, 0.3 * fade(Dm));
    // a train of light far down the line
    var Dt = 3500 + ctx.rnd() * 500;
    for (var t = 0; t < 7; t++) {
      var d0 = Dt + t * 70;
      trace(m, [V.p(-70, floor + 40, d0), V.p(-70, floor + 140, d0), V.p(70, floor + 140, d0), V.p(70, floor + 40, d0)], cb, 0.4, null, 3);
      seg(m, V.p(-70, floor + 120, d0), V.p(-70, floor + 120, d0 + 55), cc, 0.6);
      seg(m, V.p(70, floor + 120, d0), V.p(70, floor + 120, d0 + 55), cc, 0.6);
    }
    var Hd = V.p(0, floor + 90, Dt - 10);
    lamp(m, ctx, Hd, sz(Dt, 3), cc, 0.9);
    glow(m, ctx, Hd, Dt, sz(Dt, 40), cc, 0.2);
    // the tube's bright mouth at the far end
    var mouth = [];
    for (var k2 = 0; k2 < 6; k2++) mouth.push(at(4760, k2, R - 60));
    trace(m, loop(mouth), cc, 0.5, null, 6);
    var E = V.p(0, Yc, 4760);
    glow(m, ctx, E, 4760, 660, cc, 0.22);
    for (var d = 0; d < 220; d++) {
      var Dd = 1900 + ctx.rnd() * 2800, th = ctx.rnd() * TAU, rr = R * 0.8 * Math.sqrt(ctx.rnd());
      pt(m, V.p(Math.cos(th) * rr, Yc + Math.sin(th) * rr, Dd), sz(Dd, 1.1), ctx.rnd() < 0.2 ? cc : cw, 0.07 + ctx.rnd() * 0.18);
    }
  });

  // HARBOR CITY: a city of lit glass towers across dark water: a tall centre and a second cluster,
  // windows lit floor by floor, beacons on the tallest, long broken reflections on the water
  A.register('s24-harbor', function (m, ctx) {
    var V = view(ctx, 60, -40 + ctx.rnd() * 20), cw = ctx.tone('a', 0.9), cb = ctx.light('b'), cc = ctx.light('c');
    var yn = -560, YW = -300, DC = 3900, txA = 0.14 + ctx.rnd() * 0.05, txB = -0.4 - ctx.rnd() * 0.15, towers = [];
    for (var i = 0; i < 66; i++) {
      var roll = ctx.rnd(), tx = roll < 0.42 ? txA + gauss(ctx) * 0.2 : roll < 0.66 ? txB + gauss(ctx) * 0.2 : -1.1 + ctx.rnd() * 2.3;
      var D = DC + (ctx.rnd() - 0.5) * 800, h = 120 + 260 * ctx.rnd();
      h += 980 * Math.exp(-Math.pow((tx - txA) / 0.1, 2)) * Math.pow(ctx.rnd(), 0.6) + 520 * Math.exp(-Math.pow((tx - txB) / 0.13, 2)) * Math.pow(ctx.rnd(), 0.7);
      towers.push({ tx: tx, D: D, h: h, w: 55 + ctx.rnd() * 85, d: 50 + ctx.rnd() * 70 });
    }
    var tall = towers.slice().sort(function (a, b) { return b.h - a.h; }).slice(0, 7);
    towers.forEach(function (T) {
      var X = T.tx * T.D, base = V.p(X, YW, T.D), C = V.p(X, YW + T.h / 2, T.D);
      if (!behind(V.p(X + T.w, YW, T.D - T.d))) return;
      m.glass(C[0], C[1], C[2], T.w, T.h, T.d, mix(cw, cb, ctx.rnd() * 0.5), 0.06 + 0.09 * ctx.rnd(), V.rot);
      // the windows on the face toward the viewer
      var p = 0.04 + 0.14 * ctx.rnd(), nc = Math.max(2, Math.floor(T.w / 16)), nr = Math.floor(T.h / 19), warm = ctx.rnd() < 0.5 ? cc : cb;
      for (var r = 1; r < nr; r++) {
        var pr = ctx.rnd() < 0.05 ? 0.7 : p;
        for (var c = 0; c < nc; c++) {
          if (ctx.rnd() >= pr) continue;
          var W = V.p(X - T.w / 2 + (c + 0.5) * T.w / nc, YW + r * 19, T.D - T.d / 2 - 1);
          pt(m, W, sz(T.D, 1.25), ctx.rnd() < 0.75 ? mix(cw, warm, 0.35) : warm, 0.25 + 0.45 * ctx.rnd());
        }
      }
      // its reflection, broken by the water
      streak(m, base, Math.PI, T.w * 0.55, T.h * (0.35 + 0.25 * ctx.rnd()), mix(cw, cb, 0.5), 0.05, 'bars', Math.round(T.h / 26));
    });
    tall.forEach(function (T) {
      var top = V.p(T.tx * T.D, YW + T.h, T.D);
      m.rod(top[0], top[1], top[2], [0, 1, 0], 60 + ctx.rnd() * 110, 2.2, cb, 0.35);
      var B = add(top, [0, 70, 0]);
      lamp(m, ctx, B, sz(T.D, 2.6), cc, 0.9);
      glow(m, ctx, B, T.D, sz(T.D, 18), cc, 0.14);
    });
    // the water, its far shore lit, the glow of the city over it
    for (var j = 0, Dw = 1760; Dw <= DC - 450; j++, Dw *= 1.05) {
      var Y = yn + (YW - yn) * clamp((Dw - 1760) / (DC - 450 - 1760), 0, 1), row = [];
      for (var q = 0; q <= 80; q++) { var Xq = (-1.1 + 2.3 * q / 80) * Dw; row.push(V.p(Xq, Y + sz(Dw, 1.2) * Math.sin(Xq * 0.017 + j * 2.1), Dw)); }
      trace(m, row, cw, 0.05 + 0.06 * (1 - j / 26), null, 8);
    }
    for (var g = 0; g < 260; g++) {
      var T2 = towers[Math.floor(ctx.rnd() * towers.length)], t = ctx.rnd(), Dg = 1800 + (DC - 500 - 1800) * Math.pow(t, 0.6);
      var Yg = yn + (YW - yn) * clamp((Dg - 1760) / (DC - 450 - 1760), 0, 1);
      band(m, V.p((T2.tx + gauss(ctx) * 0.02) * Dg, Yg + 2, Dg), Dg * (0.004 + 0.01 * ctx.rnd()), sz(Dg, 1.1), ctx.rnd() < 0.4 ? cc : cb, 0.12 + 0.22 * ctx.rnd());
    }
    for (var s = 0; s < 120; s++) { var Ds = DC + 420 + ctx.rnd() * 150; lamp(m, ctx, V.p((-1.1 + ctx.rnd() * 2.3) * Ds, YW + 4, Ds), sz(Ds, 1.4), ctx.rnd() < 0.5 ? cc : cb, 0.25 + 0.4 * ctx.rnd()); }
    band(m, V.at(txA, YW / 4600 + 0.02, 4600), 4600 * 2, 4600 * 0.07, cb, 0.06);
    glow(m, ctx, V.at(txA, 0.02, 4600), 4600, 640, cc, 0.07);
    stars(m, ctx, V, 70, 0.12, 0.32, null, 0.5);
  });

  // WIRE RANGE: a mountain range drawn as a wire mesh, peaks rising higher toward the back, snow on
  // the highest ridges, a few summit beacons, a thin crescent moon
  A.register('s24-range', function (m, ctx) {
    var V = view(ctx, 60, -20 + ctx.rnd() * 20), cw = ctx.tone('a', 0.85), cb = ctx.light('b'), cc = ctx.light('c'), n = noise2(ctx);
    var D0 = 2050, D1 = 4650, K = 15, NX = 160, TX0 = -1.1, TX1 = 1.1, Y0 = -640, G = [], peaks = [];
    function H(X, D) {
      var d = (D - D0) / (D1 - D0), x = X / 640, z = D / 640, ridge = 1 - Math.abs(fbm(n, x, z, 4) * 2 - 1);
      var lift = 0.75 + 0.45 * Math.exp(-Math.pow((X / D - 0.2) / 0.16, 2));
      return (220 + 980 * d) * ridge * ridge * (0.45 + 0.55 * n(x * 0.35 + 40, z * 0.35 + 9)) * lift;
    }
    for (var k = 0; k < K; k++) {
      var D = D0 * Math.pow(D1 / D0, k / (K - 1)), row = [], hmax = (220 + 980 * (D - D0) / (D1 - D0)) * 1.2;
      for (var i = 0; i <= NX; i++) {
        var X = (TX0 + (TX1 - TX0) * i / NX) * D, h = H(X, D);
        row.push({ P: V.p(X, Y0 + h, D), h: h / hmax, D: D });
      }
      G.push(row);
    }
    function f(P) { return 0.55 + 0.45 * clamp((-P[2] - 1800) / 2800, 0, 1); }
    G.forEach(function (row, k) {
      trace(m, row.map(function (v) { return v.P; }), cw, 0.24, f, 6);
      row.forEach(function (v, i) {
        if (v.h > 0.55 && i % 2 === 0) pt(m, v.P, sz(v.D, 1.5), cb, 0.3 + 0.45 * (v.h - 0.55) / 0.45);
        if (k > 4 && i > 0 && i < NX && v.h > 0.62 && v.h >= row[i - 1].h && v.h >= row[i + 1].h) peaks.push(v);
      });
    });
    for (var c = 0; c <= NX; c += 2) {
      var col = [], diag = [];
      for (var k2 = 0; k2 < K; k2++) { col.push(G[k2][c].P); if (c + k2 <= NX) diag.push(G[k2][c + k2].P); }
      trace(m, col, cw, 0.1, f, 4);
      trace(m, diag, cw, 0.065, f, 4);
    }
    peaks.sort(function (a, b) { return b.h - a.h; }).slice(0, 4).forEach(function (v) {
      lamp(m, ctx, v.P, sz(v.D, 2.4), cc, 0.85);
      glow(m, ctx, v.P, v.D, sz(v.D, 20), cc, 0.12);
      streak(m, v.P, 0, sz(v.D, 1), v.D * 0.05, cc, 0.25, 'fade');
    });
    // the moon: a thin crescent lit from the right (the disc less a disc moved left), in fine lines
    var mx = 0.13 + ctx.rnd() * 0.04, my = 0.17 + ctx.rnd() * 0.04, mr = 0.026, DM = 4700, ci = mx - 0.42 * mr;
    for (var ty = my - mr; ty <= my + mr; ty += 0.0016) {
      var dy = ty - my, w = Math.sqrt(Math.max(0, mr * mr - dy * dy)), wi = Math.sqrt(Math.max(0, mr * mr * 0.94 - dy * dy));
      var x0 = wi > 0 ? Math.max(mx - w, ci + wi) : mx - w, x1 = mx + w;
      if (x1 - x0 > 0.0008) seg(m, V.at(x0, ty, DM), V.at(x1, ty, DM), cb, 0.42);
    }
    glow(m, ctx, V.at(mx, my, DM), DM, 420, cb, 0.1);
    stars(m, ctx, V, 150, 0.04, 0.32, function (tx, ty) { return Math.hypot(tx - mx, ty - my) < mr * 1.6; }, 0.7);
  });

  // RINGED GIANT: a banded giant planet rising at the lower right, lit from above and behind so a
  // bright crescent runs round its top, its rings crossing in front, two small moons, many stars
  A.register('s24-giant', function (m, ctx) {
    var V = view(ctx, 60, 40), cw = ctx.tone('a', 0.92), cb = ctx.light('b'), cc = ctx.light('c'), n = noise2(ctx);
    var DP = 3600, txC = 0.24 + ctx.rnd() * 0.04, tyC = -0.2 - ctx.rnd() * 0.03, rad = 0.2 + ctx.rnd() * 0.02;
    var C = V.at(txC, tyC, DP), R = rad * DP, eyeD = sub(V.eye, C);
    var Ld = unit(add(add(mul(V.r, -0.35), mul(V.u, 0.75)), mul(V.f, -0.55)));
    var pole = unit(add(add(mul(V.u, 0.97), mul(V.r, 0.14)), mul(V.f, -0.2)));
    var e1 = unit(cross(pole, V.f)), e2 = cross(pole, e1);
    function sphere(lat, lon) { var cl = Math.cos(lat); return add(C, add(mul(pole, Math.sin(lat) * R), add(mul(e1, cl * Math.cos(lon) * R), mul(e2, cl * Math.sin(lon) * R)))); }
    function lit(P) { var N = unit(sub(P, C)); return dot(N, unit(sub(V.eye, P))) > 0.02 ? 0.12 + 0.88 * clamp(dot(N, Ld) * 1.3 + 0.1, 0, 1) : 0; }
    function hidden(P) {                                     // behind the planet, seen from the eye
      var d = sub(P, V.eye), L = Math.hypot(d[0], d[1], d[2]), dir = mul(d, 1 / L), tc = dot(sub(C, V.eye), dir);
      var cc2 = dot(sub(C, V.eye), sub(C, V.eye)) - tc * tc;
      return cc2 < R * R && tc < L;
    }
    // the bands of cloud
    for (var b = -24; b <= 24; b++) {
      var lat = b * 0.062, line = [], a = 0.12 + 0.34 * n(b * 0.45 + 3, 1.5), col = n(b * 0.6, 7) > 0.5 ? cb : cw;
      for (var i = 0; i <= 120; i++) line.push(sphere(lat, i / 120 * TAU));
      trace(m, line, col, a, lit, 3);
    }
    // a storm: a small oval in one band
    var sl = 0.25 + ctx.rnd() * 0.3, so = Math.PI + 0.4 + ctx.rnd() * 0.6, oval = [];
    for (var o = 0; o <= 24; o++) { var t = o / 24 * TAU; oval.push(sphere(sl + Math.sin(t) * 0.05, so + Math.cos(t) * 0.14)); }
    trace(m, oval, cc, 0.35, lit, 4);
    // the limb, brightest where the light grazes it
    var ax = unit(eyeD), a1 = unit(cross(ax, V.u)), a2 = cross(a1, ax), limb = [], halo = [];
    for (var l = 0; l <= 220; l++) {
      var th = l / 220 * TAU, dir = add(mul(a1, Math.cos(th)), mul(a2, Math.sin(th)));
      limb.push(add(C, mul(dir, R))); halo.push(add(C, mul(dir, R * 1.018)));
    }
    function rim(P) { return 0.12 + 0.88 * Math.pow(clamp(dot(unit(sub(P, C)), Ld) * 1.1 + 0.1, 0, 1), 1.5); }
    trace(m, limb, cb, 0.6, rim, 4);
    trace(m, halo, cc, 0.25, rim, 4);
    for (var g = 0; g < 220; g += 9) { var Pg = halo[g]; if (rim(Pg) > 0.6) glow(m, ctx, Pg, DP, sz(DP, 26), cc, 0.07 * rim(Pg)); }
    // the rings: circles in the planet's equator, left out where the planet hides them
    [1.42, 1.5, 1.57, 1.63, 1.74, 1.81, 1.9, 1.98, 2.06].forEach(function (k, j) {
      var ring = [], a = j === 4 ? 0.1 : 0.14 + 0.16 * n(j * 2.1, 3.3), rr = R * k;
      for (var i = 0; i <= 300; i++) { var t = i / 300 * TAU; ring.push(add(C, add(mul(e1, Math.cos(t) * rr), mul(e2, Math.sin(t) * rr)))); }
      var vis = [];
      ring.forEach(function (P) {
        if (hidden(P) || !behind(P)) { trace(m, vis, j % 3 ? cw : cb, a, null, 6); vis = []; } else vis.push(P);
      });
      trace(m, vis, j % 3 ? cw : cb, a, null, 6);
    });
    for (var d = 0; d < 700; d++) {
      var t2 = ctx.rnd() * TAU, rr2 = R * (1.42 + ctx.rnd() * 0.64), Pd = add(C, add(mul(e1, Math.cos(t2) * rr2), mul(e2, Math.sin(t2) * rr2)));
      if (!hidden(Pd)) pt(m, Pd, sz(DP, 1), ctx.rnd() < 0.3 ? cb : cw, 0.06 + ctx.rnd() * 0.2);
    }
    // two moons
    [[-0.3 - ctx.rnd() * 0.2, 0.1 + ctx.rnd() * 0.12, 3000, 0.012], [0.05 + ctx.rnd() * 0.1, 0.16 + ctx.rnd() * 0.06, 3900, 0.006]].forEach(function (q) {
      var P = V.at(q[0], q[1], q[2]);
      if (!ctx.clearAt(P[0], P[1], P[2], 20)) return;
      m.sphere(P[0], P[1], P[2], q[3] * q[2], cb, 0.7);
      glow(m, ctx, P, q[2], q[3] * q[2] * 5, cc, 0.08);
    });
    stars(m, ctx, V, 420, -0.31, 0.33, function (tx, ty) { return Math.hypot(tx - txC, ty - tyC) < rad * 1.06; });
  });

  // SKY ISLANDS: islands of blocks floating at many depths, flat on top and tapering below, lamps and
  // thin trees on top, light hanging under them, bands of cloud beneath
  A.register('s24-islands', function (m, ctx) {
    var V = view(ctx, 60, 20), cw = ctx.tone('a', 0.85), cb = ctx.light('b'), cc = ctx.light('c'), n = noise2(ctx);
    var ex = unit([V.r[0], 0, V.r[2]]), ez = unit([V.f[0], 0, V.f[2]]), rot = [0, Math.atan2(-ex[2], ex[0]), 0], spots = [{ tx: 0.15, ty: 0.06 + ctx.rnd() * 0.08, D: 3000 + ctx.rnd() * 600 }];
    for (var tries = 0; spots.length < 9 && tries < 500; tries++) {
      var s = { tx: -1.0 + ctx.rnd() * 1.42, ty: -0.2 + ctx.rnd() * 0.42, D: 2200 + ctx.rnd() * 2300 };
      if (spots.every(function (o) { return Math.hypot(o.tx - s.tx, (o.ty - s.ty) * 1.4) > 0.2; })) spots.push(s);
    }
    spots.forEach(function (S, k) {
      var cs = 0.0085 * S.D, rc = 3.5 + ctx.rnd() * 4, layers = 3 + Math.floor(ctx.rnd() * 4), O = V.at(S.tx, S.ty, S.D), ph = ctx.rnd() * 10;
      if (!behind(add(O, mul(ex, rc * cs)))) return;
      function edge(i, j) { var ang = Math.atan2(j, i); return rc * (0.82 + 0.36 * n(Math.cos(ang) * 1.6 + ph, Math.sin(ang) * 1.6 + ph)); }
      function cell(i, j, l) { return add(add(O, mul(ex, i * cs)), add(mul(ez, j * cs), [0, -l * cs, 0])); }
      var R0 = Math.ceil(rc * 1.2), tops = [];
      for (var l = 0; l <= layers; l++) {
        var shrink = Math.pow(1 - l / (layers + 1), 0.85), shrink2 = Math.pow(1 - (l + 1) / (layers + 1), 0.85);
        for (var i = -R0; i <= R0; i++) for (var j = -R0; j <= R0; j++) {
          var dd = Math.hypot(i, j), e = edge(i, j);
          if (dd > e * shrink) continue;
          if (l > 0 && l < layers && dd < e * shrink2 - 1.2) continue;     // hidden inside: not built
          var P = cell(i, j, l), v = l === 0 ? 0.42 + 0.2 * ctx.rnd() : 0.16 + 0.16 * ctx.rnd() * (1 - l / (layers + 1));
          if (!behind(P)) continue;
          m.cube(P[0], P[1], P[2], cs * 0.94, cs * 0.94, cs * 0.94, ctx.tone('a', v), rot);
          if (l === 0) tops.push(P);
          if (l === layers && ctx.rnd() < 0.5) streak(m, add(P, [0, -cs / 2, 0]), Math.PI, sz(S.D, 1.1), S.D * (0.02 + 0.08 * Math.pow(ctx.rnd(), 2)), cb, 0.12 + 0.2 * ctx.rnd(), 'fade');
        }
      }
      // lamps, thin trees and now and then a glass hut on top
      for (var t = 0, nt = 2 + Math.floor(ctx.rnd() * 5); t < nt && tops.length; t++) {
        var T = add(tops[Math.floor(ctx.rnd() * tops.length)], [0, cs / 2, 0]);
        if (ctx.rnd() < 0.5) { lamp(m, ctx, add(T, [0, cs * 0.4, 0]), sz(S.D, 2.2), cc, 0.85); glow(m, ctx, add(T, [0, cs * 0.4, 0]), S.D, sz(S.D, 12), cc, 0.12); }
        else { var hgt = cs * (2 + ctx.rnd() * 3); m.rod(T[0], T[1], T[2], [0, 1, 0], hgt, cs * 0.18, cb, 0.3); pt(m, add(T, [0, hgt, 0]), sz(S.D, 1.6), cb, 0.6); }
      }
      if (tops.length && ctx.rnd() < 0.45) { var Hh = add(tops[Math.floor(ctx.rnd() * tops.length)], [0, cs * 1.4, 0]); m.glass(Hh[0], Hh[1], Hh[2], cs * 2, cs * 2, cs * 2, cb, 0.45, rot); }
    });
    for (var c = 0; c < 9; c++) {
      var Dc = 2600 + ctx.rnd() * 2000;
      band(m, V.at(-1.0 + ctx.rnd() * 1.4, -0.16 - ctx.rnd() * 0.12, Dc), Dc * (0.4 + ctx.rnd() * 0.7), Dc * (0.008 + ctx.rnd() * 0.016), mix(cw, cb, ctx.rnd()), 0.04 + ctx.rnd() * 0.04);
    }
    for (var d = 0; d < 240; d++) { var Dd = 2000 + ctx.rnd() * 2700; pt(m, V.at(-1.05 + ctx.rnd() * 1.55, -0.3 + ctx.rnd() * 0.6, Dd), sz(Dd, 1), ctx.rnd() < 0.2 ? cc : cw, 0.06 + ctx.rnd() * 0.18); }
  });

  // a crystal shard: a six-sided prism from B along d that ends in a point
  function shard(m, ctx, B, d, len, rad, c, a, cc) {
    var a1 = unit(cross(d, Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), a2 = cross(d, a1), sides = 5 + (ctx.rnd() < 0.5 ? 1 : 0), ph = ctx.rnd() * TAU;
    var S = add(B, mul(d, len * (0.62 + ctx.rnd() * 0.16))), T = add(B, mul(d, len)), base = [], sh = [];
    for (var i = 0; i < sides; i++) {
      var th = ph + i / sides * TAU, o = add(mul(a1, Math.cos(th)), mul(a2, Math.sin(th)));
      base.push(add(B, mul(o, rad))); sh.push(add(S, mul(o, rad * 0.92)));
    }
    trace(m, loop(base), c, a * 0.45, null, 8);
    trace(m, loop(sh), c, a * 0.8, null, 8);
    for (var j = 0; j < sides; j++) { seg(m, base[j], sh[j], c, a * 0.7); seg(m, sh[j], T, c, a); }
    if (behind(T)) {
      m.rod(B[0], B[1], B[2], d, len * 0.86, rad * 0.4, cc, a * 0.22);
      lamp(m, ctx, T, sz(-T[2] + 1200, 2.2), cc, Math.min(1, a * 1.8));
    }
  }

  // ICE CAVE: a cave mouth of crystal shards hanging from above and rising from the floor, densest at
  // the sides, a cold light far off through the opening, frost in the air
  A.register('s24-ice-cave', function (m, ctx) {
    var V = view(ctx, 60, 10 + ctx.rnd() * 30), cw = ctx.tone('a', 0.9), cb = ctx.light('b'), cc = ctx.light('c');
    function side() { var t = ctx.rnd(); return t < 0.5 ? -1.1 + Math.pow(ctx.rnd(), 0.7) * 1.05 : 0.08 + ctx.rnd() * 0.45; }
    for (var i = 0; i < 74; i++) {
      var up = i % 2 === 0, tx = ctx.rnd() < 0.82 ? side() : -0.06 + ctx.rnd() * 0.14, D = 1950 + Math.pow(ctx.rnd(), 0.9) * 2600;
      var far = (D - 1950) / 2600, len = D * (0.06 + 0.2 * Math.pow(ctx.rnd(), 1.3)) * (Math.abs(tx - 0.02) < 0.08 ? 0.5 : 1);
      var B = V.at(tx, up ? -0.36 : 0.36, D), dir = unit(add(add(mul(V.u, up ? 1 : -1), mul(V.r, (ctx.rnd() - 0.5) * 0.45)), mul(V.f, (ctx.rnd() - 0.5) * 0.3)));
      var n2 = ctx.rnd() < 0.35 ? 2 + Math.floor(ctx.rnd() * 2) : 1;
      for (var k = 0; k < n2; k++) {
        var dk = k ? unit(add(dir, [(ctx.rnd() - 0.5) * 0.6, 0, (ctx.rnd() - 0.5) * 0.4])) : dir, lk = k ? len * (0.4 + ctx.rnd() * 0.4) : len;
        shard(m, ctx, add(B, mul(V.r, k * len * 0.12)), dk, lk, lk * (0.07 + ctx.rnd() * 0.05), mix(cb, cw, ctx.rnd() * 0.5), (0.42 - 0.2 * far) * (0.7 + 0.5 * ctx.rnd()), cc);
      }
    }
    // the opening's cold light, far off
    var E = V.at(0.03, -0.02, 4750);
    glow(m, ctx, E, 4750, 660, cc, 0.18);
    band(m, E, 4750 * 0.9, 4750 * 0.05, cb, 0.08);
    streak(m, add(E, [0, -4750 * 0.12, 0]), 0, 4750 * 0.04, 4750 * 0.24, cc, 0.05, 'peak');
    // the icy floor and frost in the air
    for (var r = 0, Dr = 1900; Dr < 4700; r++, Dr *= 1.09) {
      var row = [];
      for (var q = 0; q <= 50; q++) { var Xq = (-1.1 + 1.62 * q / 50) * Dr; row.push(V.p(Xq, -0.36 * Dr * 0.95 + sz(Dr, 2) * Math.sin(Xq * 0.01 + r), Dr)); }
      trace(m, row, cb, 0.05, null, 10);
    }
    for (var f = 0; f < 320; f++) { var Df = 1900 + ctx.rnd() * 2800; pt(m, V.at(-1.08 + ctx.rnd() * 1.58, -0.32 + ctx.rnd() * 0.64, Df), sz(Df, 0.9 + ctx.rnd() * 0.6), ctx.rnd() < 0.3 ? cb : cw, 0.07 + ctx.rnd() * 0.22); }
  });

  // DATA OCEAN: a sea of points rolling in long swells to the horizon, the crests bright, spray rising
  // in columns of light from the highest of them
  A.register('s24-data-ocean', function (m, ctx) {
    var V = view(ctx, 60, 0 + ctx.rnd() * 30), cw = ctx.tone('a', 0.85), cb = ctx.light('b'), cc = ctx.light('c'), n = noise2(ctx);
    var yn = -540, yf = -60, K = 25, TX = 0.0145, ph = ctx.rnd() * TAU, ang = 0.25 + ctx.rnd() * 0.4, crests = [];
    var kx = Math.sin(ang) / 230, kz = Math.cos(ang) / 230;
    for (var k = 0; k < K; k++) {
      var D = 1780 * Math.pow(4700 / 1780, k / (K - 1)), far = k / (K - 1), base = seaY(D, yn, yf), amp = 96 * (1 - 0.35 * far), prev = null;
      for (var tx = -1.1 + (k % 2) * TX / 2; tx <= 0.45 + 0.8 * far; tx += TX) {
        var X = (tx + (ctx.rnd() - 0.5) * TX * 0.6) * D, s1 = Math.sin(X * kx + D * kz + ph), s2 = Math.sin(X * kx * 0.47 - D * kz * 1.7 + ph * 1.3);
        var c = Math.pow(clamp(((s1 + 0.55 * s2) / 1.55 + 1) / 2, 0, 1), 3), h = amp * (c - 0.25) + 14 * (n(X / 180, D / 180) - 0.5);
        // the troughs thin out, so the swells stand as bright ridges of points
        if (c < 0.1 && ctx.rnd() < 0.55) { prev = null; continue; }
        var P = V.p(X, base + h, D), a = Math.min(1, (0.16 + 0.95 * Math.pow(c, 1.1)) * (1 - 0.4 * far));
        pt(m, P, sz(D, 1.4 + 2 * c), c > 0.62 ? cb : cw, a);
        if (prev && c > 0.5 && prev.c > 0.5) seg(m, prev.P, P, cb, 0.42 * Math.min(c, prev.c) * (1 - 0.4 * far));
        prev = { P: P, c: c };
        if (c > 0.9 && ctx.rnd() < 0.08) crests.push({ P: P, D: D });
      }
    }
    crests.slice(0, 60).forEach(function (q) {
      var steps = 3 + Math.floor(ctx.rnd() * 8), gap = sz(q.D, 5);
      for (var s = 1; s <= steps; s++) pt(m, add(q.P, mul(V.u, s * gap)), sz(q.D, 1.6), cc, 0.75 * (1 - s / (steps + 1)));
      if (ctx.rnd() < 0.4) streak(m, q.P, 0, sz(q.D, 1.4), q.D * (0.03 + ctx.rnd() * 0.05), cc, 0.3, 'bars', 7);
    });
    var hz = [];
    for (var i = 0; i <= 60; i++) hz.push(V.p((-1.1 + 2.3 * i / 60) * 4720, yf + 10, 4720));
    trace(m, hz, cb, 0.28, null, 10);
    band(m, V.at(0.02, yf / 4720 + 0.01, 4720), 4720 * 1.8, 4720 * 0.04, cb, 0.07);
    stars(m, ctx, V, 110, yf / 4720 + 0.05, 0.32, null, 0.5);
  });

  // ORBITAL RING: standing on the inside of a ring world: the ring's band rises from the ground ahead
  // and climbs into the sky, its edge walls lit, struts across it, land and lit towns on it, and the
  // far part of the arc passing into night
  A.register('s24-orbital', function (m, ctx) {
    var V = view(ctx, 60, -40), cw = ctx.tone('a', 0.9), cb = ctx.light('b'), cc = ctx.light('c'), n = noise2(ctx);
    var R = 2400, Wd = 820, ax = unit([0.9, 0, -0.44]), e1 = [0, -1, 0], e2 = unit(cross(ax, e1));
    if (e2[2] < 0) e2 = mul(e2, -1);
    var Cl = [-150 + ctx.rnd() * 80, -620 + R, 1900];
    function L(th, w, lift) {                                  // a point on the band, in the frame
      var q = add(Cl, add(mul(e1, Math.cos(th) * (R - (lift || 0))), mul(e2, Math.sin(th) * (R - (lift || 0)))));
      q = add(q, mul(ax, w));
      return V.p(q[0], q[1], q[2]);
    }
    var t0 = 0.15, t1 = 1.45, night = 0.45 + ctx.rnd() * 0.08;
    function day(th) { return 0.18 + 0.82 * smooth(night - 0.06, night + 0.08, th); }
    function arc(w, lift, steps) { var q = []; for (var i = 0; i <= steps; i++) q.push(L(t0 + (t1 - t0) * i / steps, w, lift)); return q; }
    [-1, 1].forEach(function (s) {
      var edge = arc(s * Wd / 2, 0, 240), wall = arc(s * Wd / 2, 70, 240);
      for (var i = 0; i < edge.length - 1; i += 8) {
        var th = t0 + (t1 - t0) * i / 240;
        trace(m, edge.slice(i, i + 9), cb, 0.7 * day(th), null, 8);
        trace(m, wall.slice(i, i + 9), cw, 0.4 * day(th), null, 8);
      }
    });
    [-0.25, 0, 0.25].forEach(function (k) {
      var lane = arc(k * Wd, 0, 160);
      for (var i = 0; i < lane.length - 1; i += 10) trace(m, lane.slice(i, i + 11), cw, 0.12 * day(t0 + (t1 - t0) * i / 160), null, 10);
    });
    for (var th = t0; th <= t1; th += 0.022) {
      var a = 0.13 * day(th);
      trace(m, [L(th, -Wd / 2, 0), L(th, -Wd / 2, 70)], cw, a * 1.5, null, 2);
      trace(m, [L(th, Wd / 2, 0), L(th, Wd / 2, 70)], cw, a * 1.5, null, 2);
      trace(m, [L(th, -Wd / 2, 0), L(th, 0, 0), L(th, Wd / 2, 0)], cw, a, null, 2);
    }
    // land and water on the band, and lit towns on the night side
    for (var p = 0; p < 2300; p++) {
      var tp = t0 + (t1 - t0) * Math.pow(ctx.rnd(), 0.9), wp = (ctx.rnd() - 0.5) * Wd * 0.96, land = fbm(n, tp * 9, wp / 260, 3);
      if (land < 0.5 && ctx.rnd() < 0.8) continue;
      var dp = day(tp), P = L(tp, wp, 0);
      pt(m, P, sz(-P[2] + 1200, 1.2), land > 0.5 ? cw : cb, (land > 0.5 ? 0.16 + 0.3 * ctx.rnd() : 0.08) * dp);
    }
    for (var t = 0; t < 22; t++) {
      var tt = t0 + 0.05 + ctx.rnd() * (t1 - t0 - 0.1), wt = (ctx.rnd() - 0.5) * Wd * 0.8, lit = tt < night ? 1 : 0.35;
      for (var q = 0; q < 10; q++) { var Pq = L(tt + gauss(ctx) * 0.008, wt + gauss(ctx) * 60, 0); lamp(m, ctx, Pq, sz(-Pq[2] + 1200, 1.5), cc, (0.3 + 0.5 * ctx.rnd()) * lit); }
    }
    // the sun glare at the ring's edge, and the sky
    var Sg = L(night + 0.02, Wd / 2, 0);
    glow(m, ctx, Sg, -Sg[2] + 1200, 300, cc, 0.18);
    stars(m, ctx, V, 320, -0.2, 0.33, null, 0.8);
  });

  // DUNE SEA: dunes under a low moon, drawn as contour lines at even heights, so each dune shows as
  // nested rings that crowd together on its steep side; their crests catch the light
  A.register('s24-dunes', function (m, ctx) {
    var V = view(ctx, 60, -10 + ctx.rnd() * 20), cw = ctx.tone('a', 0.85), cb = ctx.light('b'), cc = ctx.light('c'), n = noise2(ctx);
    var NX = 136, K = 30, TX0 = -1.1, TX1 = 0.9, yn = -560, yf = -130, A0 = 150, lam = 520, wd = 1.1 + ctx.rnd() * 0.35, NL = 6;
    var cwd = Math.cos(wd), swd = Math.sin(wd), F = [], Dk = [];
    for (var k = 0; k <= K; k++) Dk.push(1780 * Math.pow(4650 / 1780, k / K));
    function Hgt(X, D) {
      var u = (X * cwd + D * swd) / lam + 1.6 * fbm(n, X / 1300, D / 1300, 3), s = fract(u);
      var prof = s < 0.76 ? Math.pow(s / 0.76, 1.5) : Math.pow(1 - (s - 0.76) / 0.24, 1.3);
      return A0 * prof * (0.45 + 0.55 * n(X / 900 + 7, D / 900 + 3));
    }
    for (var k1 = 0; k1 <= K; k1++) { var row = []; for (var i = 0; i <= NX; i++) row.push(Hgt((TX0 + (TX1 - TX0) * i / NX) * Dk[k1], Dk[k1])); F.push(row); }
    function P(fi, fk, lv) {
      var k0 = Math.floor(fk), t = fk - k0, D = k0 >= K ? Dk[K] : Dk[k0] * Math.pow(Dk[Math.min(K, k0 + 1)] / Dk[k0], t);
      return V.p((TX0 + (TX1 - TX0) * fi / NX) * D, seaY(D, yn, yf) + lv, D);
    }
    function fade(Q) { return 1 - 0.55 * clamp((-Q[2] - 1900) / 2700, 0, 1); }
    for (var l = 0; l < NL; l++) {
      var lv = A0 * (l + 0.5) / NL, c = l === NL - 1 ? cb : cw, al = 0.13 + 0.13 * l / NL;
      for (var k2 = 0; k2 < K; k2++) for (var i2 = 0; i2 < NX; i2++) {
        var a = F[k2][i2], b = F[k2][i2 + 1], cc2 = F[k2 + 1][i2 + 1], d = F[k2 + 1][i2], cut = [];
        // where the level crosses each edge of the cell
        if ((a > lv) !== (b > lv)) cut.push([i2 + (lv - a) / (b - a), k2]);
        if ((b > lv) !== (cc2 > lv)) cut.push([i2 + 1, k2 + (lv - b) / (cc2 - b)]);
        if ((d > lv) !== (cc2 > lv)) cut.push([i2 + (lv - d) / (cc2 - d), k2 + 1]);
        if ((a > lv) !== (d > lv)) cut.push([i2, k2 + (lv - a) / (d - a)]);
        for (var s = 0; s + 1 < cut.length; s += 2) {
          var p1 = P(cut[s][0], cut[s][1], lv), p2 = P(cut[s + 1][0], cut[s + 1][1], lv);
          seg(m, p1, p2, c, al * fade(p1));
        }
      }
    }
    // the moon, low and large, and a haze along the horizon
    var mx = 0.1 + ctx.rnd() * 0.07, my = 0.09 + ctx.rnd() * 0.04, mr = 0.042, DM = 4700, disc = [];
    for (var q = 0; q <= 90; q++) disc.push(V.at(mx + Math.cos(q / 90 * TAU) * mr, my + Math.sin(q / 90 * TAU) * mr, DM));
    trace(m, disc, cb, 0.45, null, 10);
    for (var ty = my - mr + 0.003; ty < my + mr; ty += 0.0032) { var w = Math.sqrt(Math.max(0, mr * mr - (ty - my) * (ty - my))); seg(m, V.at(mx - w, ty, DM), V.at(mx + w, ty, DM), cb, 0.07); }
    glow(m, ctx, V.at(mx, my, DM), DM, 660, cb, 0.12);
    for (var hz = 0; hz < 4; hz++) band(m, V.at(mx + gauss(ctx) * 0.3, yf / 4650 + 0.004 + hz * 0.006, 4650), 4650 * (0.5 + ctx.rnd() * 0.8), sz(4650, 2 + ctx.rnd() * 3), mix(cc, cb, ctx.rnd()), 0.06);
    stars(m, ctx, V, 130, yf / 4650 + 0.06, 0.32, function (tx, ty) { return Math.hypot(tx - mx, ty - my) < mr * 1.8; }, 0.6);
  });

  // LIGHT FOREST: a forest of thin pillars of light, bright at the root and fading upward, thinning
  // into a clearing that leads to a glow; motes drift between them and mist lies on the ground
  A.register('s24-forest', function (m, ctx) {
    var V = view(ctx, 60, 20 + ctx.rnd() * 20), cw = ctx.tone('a', 0.85), cb = ctx.light('b'), cc = ctx.light('c');
    var Y0 = -540, cx = 0.02 + ctx.rnd() * 0.05;
    for (var i = 0; i < 330; i++) {
      var D = 1850 + Math.pow(ctx.rnd(), 0.75) * 2850, tx = ctx.rnd() < 0.25 ? 0.12 + ctx.rnd() * 0.25 : -1.1 + ctx.rnd() * 1.9, d = (D - 1850) / 2850;
      if (Math.abs(tx - cx) < 0.04 + 0.05 * (1 - d) && ctx.rnd() < 0.85) continue;
      var P = V.p(tx * D, Y0, D), f = 1 - 0.6 * d, c = ctx.rnd() < 0.1 ? cc : mix(cb, cw, ctx.rnd() * 0.6);
      if (!behind(P)) continue;
      streak(m, P, 0, sz(D, 1 + ctx.rnd() * 2), D * (0.28 + 0.3 * ctx.rnd()), c, (0.16 + 0.3 * ctx.rnd()) * f, 'fade');
      if (ctx.rnd() < 0.35) seg(m, P, add(P, mul(V.u, D * (0.1 + 0.18 * ctx.rnd()))), cw, 0.22 * f);
      if (ctx.rnd() < 0.45) { lamp(m, ctx, P, sz(D, 1.8), cc, 0.5 * f); glow(m, ctx, P, D, sz(D, 10), cc, 0.07 * f); }
    }
    for (var k = 0; k < 230; k++) {
      var Dk = 1900 + ctx.rnd() * 2600, Pk = V.at(-1.05 + ctx.rnd() * 1.55, -0.24 + ctx.rnd() * 0.3, Dk);
      lamp(m, ctx, Pk, sz(Dk, 1.3), ctx.rnd() < 0.6 ? cc : cb, 0.25 + 0.5 * ctx.rnd());
      if (ctx.rnd() < 0.15) glow(m, ctx, Pk, Dk, sz(Dk, 9), cc, 0.1);
    }
    for (var s = 0; s < 7; s++) { var Ds = 2000 + ctx.rnd() * 2600; band(m, V.p(gauss(ctx) * 0.4 * Ds, Y0 + 30, Ds), Ds * (0.5 + ctx.rnd() * 0.8), Ds * 0.02, cw, 0.04 + ctx.rnd() * 0.03); }
    for (var r = 0, Dr = 1900; Dr < 4700; r++, Dr *= 1.12) { var row = []; for (var q = 0; q <= 40; q++) row.push(V.p((-1.1 + 1.62 * q / 40) * Dr, Y0, Dr)); trace(m, row, cw, 0.04, null, 10); }
    var E = V.p(cx * 4720, Y0 + 260, 4720);
    glow(m, ctx, E, 4720, 640, cc, 0.16);
    band(m, V.p(cx * 4720, Y0 + 40, 4720), 4720 * 0.5, 4720 * 0.03, cc, 0.1);
  });

  // ARCH NAVE: the nave of a cathedral: pointed arches on columns, one bay after another, the arcades
  // and their side aisles, ribs across the vault, lamps hung in each bay, light falling slant from the
  // high windows, and a rose window glowing at the far end
  A.register('s24-nave', function (m, ctx) {
    var V = view(ctx, 60, 20), cw = ctx.tone('a', 0.88), cb = ctx.light('b'), cc = ctx.light('c');
    var Y0 = -560, hw = 430, Ys = 140, rA = 1.35 * hw, c0 = rA - hw, apexA = Math.acos(-c0 / rA), apexY = Ys + rA * Math.sin(apexA);
    var Ya = -250, aw = 125, Ds = [];
    for (var D = 1880; D <= 4600; D += 255) Ds.push(D);
    function fd(D) { return 1 - 0.6 * (D - 1880) / 2720; }
    // a pointed arch across the nave at depth D: two arcs, each centred on the far side of the middle,
    // meeting at the apex. inset draws the inner moulding a little inside the outer one
    function arch(D, half, spring, inset, c, a) {
      var cx = 0.35 * half, r = 1.35 * half - inset, top = Math.acos(clamp(-cx / r, -1, 1)), L = [], Rr = [];
      for (var i = 0; i <= 16; i++) {
        var ang = Math.PI - (Math.PI - top) * i / 16, x = cx + r * Math.cos(ang), y = spring + r * Math.sin(ang);
        L.push(V.p(x, y, D)); Rr.push(V.p(-x, y, D));
      }
      trace(m, L, c, a, null, 8); trace(m, Rr, c, a, null, 8);
    }
    Ds.forEach(function (D, k) {
      var f = fd(D);
      arch(D, hw, Ys, 0, cw, 0.4 * f);
      arch(D, hw, Ys, 26, cb, 0.22 * f);
      [-1, 1].forEach(function (s) {
        seg(m, V.p(s * hw, Y0, D), V.p(s * hw, Ys, D), cw, 0.34 * f);
        seg(m, V.p(s * (hw + 34), Y0, D), V.p(s * (hw + 34), Ys - 10, D), cw, 0.22 * f);
        seg(m, V.p(s * (hw - 12), Ys, D), V.p(s * (hw + 46), Ys, D), cb, 0.3 * f);
        seg(m, V.p(s * (hw - 8), Y0 + 26, D), V.p(s * (hw + 42), Y0 + 26, D), cw, 0.2 * f);
        // the side aisle: an outer column, and the arcade between this bay and the next
        seg(m, V.p(s * (hw + 420), Y0, D), V.p(s * (hw + 420), Ya + 140, D), cw, 0.22 * f);
        // the aisle's own arch, from the arcade column out to the outer wall
        var aa = [];
        for (var ai = 0; ai <= 12; ai++) { var at2 = ai / 12; aa.push(V.p(s * (hw + 420 * at2), Ya + 140 + 150 * Math.pow(Math.sin(Math.PI * at2), 0.7), D)); }
        trace(m, aa, cw, 0.16 * f, null, 6);
        if (k + 1 < Ds.length) {
          var D2 = Ds[k + 1], half = (D2 - D) / 2, mid = (D + D2) / 2, ar = [];
          for (var i = 0; i <= 14; i++) {
            var t = i / 14, dz = -half + 2 * half * t, yy = Ya + Math.sqrt(Math.max(0, 1 - Math.pow(2 * t - 1, 2))) * 170 * (1 - 0.25 * Math.abs(2 * t - 1));
            ar.push(V.p(s * hw, yy, mid + dz));
          }
          trace(m, ar, cw, 0.26 * f, null, 7);
          // a high window over the arcade, and the slant light it lets in
          var win = [V.p(s * hw, Ya + 260, mid - 48), V.p(s * hw, Ys - 40, mid - 48), V.p(s * hw, Ys + 30, mid), V.p(s * hw, Ys - 40, mid + 48), V.p(s * hw, Ya + 260, mid + 48)];
          trace(m, loop(win), cb, 0.24 * f, null, 6);
          for (var g = 0; g < 5; g++) pt(m, V.p(s * hw, Ya + 290 + ctx.rnd() * (Ys - Ya - 330), mid + (ctx.rnd() - 0.5) * 80), sz(mid, 1.6), ctx.rnd() < 0.5 ? cc : cb, 0.4 * f);
          if (s > 0 && ctx.rnd() < 0.7) streak(m, V.p(hw - 20, Ys - 60, mid), Math.PI - 0.55, sz(mid, 22), 700, cb, 0.035 * f, 'fade');
          // ribs across the vault, corner to corner, and the ridge
          var rib = [], rib2 = [];
          for (var q = 0; q <= 12; q++) {
            var tq = q / 12, yq = Ys + (apexY - Ys) * 0.94 * Math.pow(Math.sin(Math.PI * tq), 0.75);
            rib.push(V.p(s * hw * (1 - 2 * tq), yq, D + (D2 - D) * tq));
          }
          trace(m, rib, cw, 0.16 * f, null, 6);
        }
      });
      if (k + 1 < Ds.length) seg(m, V.p(0, apexY, D), V.p(0, apexY, Ds[k + 1]), cw, 0.14 * f);
      // a lamp hung in the bay
      var mid2 = D + 128, Lp = V.p(0, 230 + ctx.rnd() * 40, mid2);
      seg(m, Lp, V.p(0, apexY - 20, mid2), cw, 0.1 * f);
      lamp(m, ctx, Lp, sz(mid2, 2.6), cc, 0.8 * f);
      glow(m, ctx, Lp, mid2, sz(mid2, 22), cc, 0.12 * f);
    });
    // the floor: lines along the nave and across each bay
    [-1, -0.5, 0, 0.5, 1, -1.98, 1.98].forEach(function (k) { var fl = []; for (var D = 1880; D <= 4700; D += 140) fl.push(V.p(k * hw, Y0, D)); trace(m, fl, cw, 0.07, null, 4); });
    Ds.forEach(function (D) { seg(m, V.p(-hw * 1.98, Y0, D), V.p(hw * 1.98, Y0, D), cw, 0.05); });
    // the rose window at the far end, and its gleam on the floor
    var RC = [0, apexY * 0.55, 4720], rr = 250, rings = [[1, 0.5], [0.42, 0.4]];
    rings.forEach(function (q) { var o = []; for (var i = 0; i <= 64; i++) o.push(V.p(RC[0] + Math.cos(i / 64 * TAU) * rr * q[0], RC[1] + Math.sin(i / 64 * TAU) * rr * q[0], RC[2])); trace(m, o, cc, q[1], null, 8); });
    for (var p = 0; p < 12; p++) {
      var th = p / 12 * TAU, pet = [];
      seg(m, V.p(Math.cos(th) * rr * 0.42, RC[1] + Math.sin(th) * rr * 0.42, RC[2]), V.p(Math.cos(th) * rr, RC[1] + Math.sin(th) * rr, RC[2]), cc, 0.35);
      for (var e = 0; e <= 16; e++) pet.push(V.p(Math.cos(th + 0.26) * rr * 0.7 + Math.cos(e / 16 * TAU) * rr * 0.14, RC[1] + Math.sin(th + 0.26) * rr * 0.7 + Math.sin(e / 16 * TAU) * rr * 0.14, RC[2]));
      trace(m, pet, cb, 0.3, null, 8);
    }
    var RP = V.p(RC[0], RC[1], RC[2]);
    glow(m, ctx, RP, 4720, 600, cc, 0.2);
    streak(m, V.p(0, Y0, 4700), Math.PI, sz(4700, 30), 900, cc, 0.07, 'fade');
  });

  // AURORA PLAIN: curtains of aurora folding across the night sky over a flat, frosted plain with low
  // hills on its horizon, under many stars
  A.register('s24-aurora', function (m, ctx) {
    var V = view(ctx, 60, -80 + ctx.rnd() * 20), cw = ctx.tone('a', 0.85), cb = ctx.light('b'), cc = ctx.light('c'), n = noise2(ctx);
    var Y0 = -300, DF = 4720;
    stars(m, ctx, V, 430, -0.04, 0.34);
    for (var j = 0; j < 3; j++) {
      var D0 = 3400 + j * 420, ph = ctx.rnd() * TAU, ph2 = ctx.rnd() * TAU, edge = [], NR = 260;
      for (var i = 0; i <= NR; i++) {
        var t = i / NR, tx = -1.1 + 2.1 * t, D = D0 + 450 * Math.sin(t * 5.2 + ph), X = tx * D + 240 * Math.sin(t * 13 + ph2);
        // the curtain climbs from low over the left horizon to high on the right
        var tyb = 0.03 + 0.1 * smooth(-0.7, 0.3, tx) + 0.022 * Math.sin(t * 9 + ph * 2) + j * 0.022, Y = tyb * D;
        var env = (0.25 + 0.75 * Math.pow(clamp(fbm(n, t * 6 + j * 10, 0.5, 3) * 1.6 - 0.3, 0, 1), 1.1)) * (0.55 + 0.6 * smooth(-0.3, 0.15, tx));
        var B = V.p(X, Y, D), c = mix(cc, cb, 0.5 + 0.5 * Math.sin(t * 4 + j * 2));
        edge.push(B);
        if (env < 0.04) continue;
        streak(m, B, 0, sz(D, 4 + ctx.rnd() * 6), D * (0.07 + 0.17 * env) * (0.6 + 0.6 * ctx.rnd()), c, (0.06 + 0.15 * env) * (j === 0 ? 1 : 0.8), 'fade');
        if (ctx.rnd() < 0.4) streak(m, B, 0, sz(D, 1), D * (0.1 + 0.22 * env), mix(c, [1, 1, 1], 0.3), 0.13 * env, 'fade');
      }
      trace(m, edge, mix(cc, cb, 0.4), 0.22, function (P) { return 0.3 + 0.7 * ctx.rnd(); }, 5);
    }
    // the plain: frost points in rows, low hills on the horizon
    for (var r = 0, D = 1760; D <= DF; r++, D *= 1.07) {
      for (var tx = -1.1 + (r % 2) * 0.012; tx <= 0.6; tx += 0.024) {
        if (ctx.rnd() < 0.35) continue;
        pt(m, V.p(tx * D + (ctx.rnd() - 0.5) * sz(D, 8), Y0, D), sz(D, 1), ctx.rnd() < 0.15 ? cb : cw, (0.05 + 0.12 * ctx.rnd()) * (1 - 0.5 * (D - 1760) / 2960));
      }
    }
    var hill = [], ph3 = ctx.rnd() * 10;
    for (var h = 0; h <= 150; h++) { var tx2 = -1.1 + 2.3 * h / 150; hill.push(V.p(tx2 * DF, Y0 + 120 * Math.pow(fbm(n, tx2 * 3 + ph3, 3.3, 3), 2) * 2, DF)); }
    trace(m, hill, cw, 0.22, null, 8);
    band(m, V.p(0, Y0 + 30, DF), DF * 1.8, DF * 0.03, mix(cc, cb, 0.5), 0.06);
  });

  // DEEP TRENCH: a trench in the deep sea: walls of layered rock falling away into the dark, faint
  // light from far above, snow drifting down, and living lights: drifting bells with trailing threads,
  // chains of beads, lone sparks
  A.register('s24-trench', function (m, ctx) {
    var V = view(ctx, 60, 20), cw = ctx.tone('a', 0.7), cb = ctx.light('b'), cc = ctx.light('c'), n = noise2(ctx);
    function hw(D) { return 560 + 0.12 * (D - 1800); }
    function ledge(s, Y, D) { return 180 * fbm(n, Y / 160 + s * 30, D / 420, 3) + 60 * n(Y / 40 + s * 7, D / 90); }
    [-1, 1].forEach(function (s) {
      for (var Y = -1500; Y <= 1450; Y += 85) {
        var line = [], dark = 0.35 + 0.65 * smooth(-1400, 900, Y);
        for (var D = 1800; D <= 4700; D += 70) line.push(V.p(s * (hw(D) + ledge(s, Y, D)), Y, D));
        trace(m, line, cw, 0.17 * dark, function (P) { return 1 - 0.6 * clamp((-P[2] - 1900) / 2700, 0, 1); }, 6);
      }
      for (var p = 0; p < 650; p++) {
        var Dp = 1800 + ctx.rnd() * 2900, Yp = -1500 + ctx.rnd() * 2950;
        pt(m, V.p(s * (hw(Dp) + ledge(s, Yp, Dp) + ctx.rnd() * 30), Yp, Dp), sz(Dp, 1 + ctx.rnd()), cw, (0.06 + 0.2 * ctx.rnd()) * (0.3 + 0.7 * smooth(-1400, 900, Yp)));
      }
    });
    for (var g = 0; g < 11; g++) { var Dg = 2200 + ctx.rnd() * 2400; streak(m, V.p((ctx.rnd() - 0.5) * hw(Dg) * 1.6, 0.34 * Dg, Dg), Math.PI + (ctx.rnd() - 0.5) * 0.16, sz(Dg, 30 + ctx.rnd() * 40), Dg * (0.35 + ctx.rnd() * 0.3), cb, 0.022 + ctx.rnd() * 0.02, 'fade'); }
    for (var s2 = 0; s2 < 460; s2++) { var Ds = 1850 + ctx.rnd() * 2850; pt(m, V.at(-1.0 + ctx.rnd() * 1.5, -0.31 + ctx.rnd() * 0.62, Ds), sz(Ds, 0.8 + ctx.rnd() * 0.6), cw, 0.06 + ctx.rnd() * 0.2); }
    glow(m, ctx, V.p(0, -900, 4700), 4700, 640, cc, 0.06);
    // living lights
    for (var c = 0; c < 30; c++) {
      var Dc = 2000 + ctx.rnd() * 2400, txc = ctx.rnd() < 0.45 ? 0.12 + ctx.rnd() * 0.12 : (ctx.rnd() - 0.5) * 1.8 * hw(Dc) / Dc, P = V.at(txc, -0.25 + ctx.rnd() * 0.48, Dc), kind = ctx.rnd();
      if (!ctx.clearAt(P[0], P[1], P[2], 20)) continue;
      if (kind < 0.5) {
        var rj = sz(Dc, 5 + ctx.rnd() * 7), bell = [];
        for (var b = 0; b <= 10; b++) { var a = Math.PI * b / 10; bell.push(add(P, add(mul(V.r, Math.cos(a) * rj), mul(V.u, Math.sin(a) * rj * 0.8)))); }
        trace(m, bell, cc, 0.5, null, 10);
        glow(m, ctx, add(P, mul(V.u, rj * 0.3)), Dc, rj * 3.2, cc, 0.16);
        for (var t = 0, nt = 3 + Math.floor(ctx.rnd() * 3); t < nt; t++) {
          var x0 = (t / (nt - 1) - 0.5) * rj * 1.6, th = [], ph = ctx.rnd() * TAU, Lt = rj * (4 + ctx.rnd() * 5);
          for (var q = 0; q <= 10; q++) th.push(add(P, add(mul(V.r, x0 + Math.sin(q * 0.7 + ph) * rj * 0.3), mul(V.u, -q / 10 * Lt))));
          trace(m, th, cb, 0.22, null, 10);
        }
      } else if (kind < 0.8) {
        var nb = 8 + Math.floor(ctx.rnd() * 10), dir = unit(add(mul(V.r, ctx.rnd() - 0.5), mul(V.u, ctx.rnd() - 0.5))), bend = (ctx.rnd() - 0.5) * 0.3, gap = sz(Dc, 5);
        for (var e = 0; e < nb; e++) { var Pe = add(P, add(mul(dir, e * gap), mul(V.u, Math.sin(e * bend) * gap * 2))); lamp(m, ctx, Pe, sz(Dc, 1.8), e % 3 ? cc : cb, 0.7 - 0.4 * e / nb); }
      } else {
        lamp(m, ctx, P, sz(Dc, 2.2), cc, 0.9);
        glow(m, ctx, P, Dc, sz(Dc, 16), cc, 0.14);
      }
    }
  });

  // FAR GATE: an empty dark with one gate standing far off on a still, mirror floor, light hanging
  // in its doorway, and a path of small lamps leading to it
  A.register('s24-gate', function (m, ctx) {
    var V = view(ctx, 60, -30), cw = ctx.tone('a', 0.9), cb = ctx.light('b'), cc = ctx.light('c');
    var Y0 = -420, DG = 4100, XG = (0.13 + ctx.rnd() * 0.04) * DG, half = 200, Hg = 880, rot = V.rot;
    function P(x, y, d) { return V.p(XG + x, Y0 + y, (d == null ? DG : d)); }
    [1, -1].forEach(function (mir) {                         // the gate, and its reflection below the floor
      var k = mir > 0 ? 1 : 0.18;
      [-1, 1].forEach(function (s) { var c = P(s * half, mir * Hg / 2); m.bar(c[0], c[1], c[2], 26, Hg, 26, cb, 0.32 * k, rot); });
      var l1 = P(0, mir * (Hg + 18)), l2 = P(0, mir * (Hg - 70));
      m.bar(l1[0], l1[1], l1[2], 2 * half + 130, 30, 30, cb, 0.32 * k, rot);
      m.bar(l2[0], l2[1], l2[2], 2 * half + 26, 18, 22, cb, 0.22 * k, rot);
      trace(m, [P(-half + 14, 0), P(-half + 14, mir * (Hg - 80)), P(half - 14, mir * (Hg - 80)), P(half - 14, 0)], cc, 0.6 * k, null, 4);
      for (var i = 0; i < 34; i++) {
        var x = -half + 24 + (2 * half - 48) * (i + ctx.rnd()) / 34, top = mir * (Hg - 90) * (0.6 + 0.4 * ctx.rnd());
        trace(m, [P(x, 0), P(x, top)], cc, (0.03 + 0.06 * ctx.rnd()) * k, null, 2);
      }
    });
    seg(m, P(-half, 1), P(half, 1), cc, 0.7);
    glow(m, ctx, P(0, Hg * 0.45), DG, 560, cc, 0.13);
    glow(m, ctx, P(0, 10), DG, 260, cc, 0.22);
    streak(m, P(0, Hg * 0.45), 0, sz(DG, 50), Hg * 0.7, cc, 0.04, 'peak');
    streak(m, P(0, Hg * 0.45), Math.PI, sz(DG, 50), Hg * 0.7, cc, 0.04, 'peak');
    // the path of lamps to it, each with a short gleam below on the floor
    for (var D = 1900, j = 0; D < DG - 120; D += 120 + (D - 1900) * 0.04, j++) {
      var t = (D - 1900) / (DG - 1900), xc = XG * (0.55 + 0.45 * t);
      [-1, 1].forEach(function (s) {
        var L = V.p(xc + s * 90, Y0 + 6, D);
        lamp(m, ctx, L, sz(D, 1.8), cc, 0.65);
        streak(m, L, Math.PI, sz(D, 1.2), sz(D, 12), cc, 0.15, 'fade');
      });
    }
    for (var r = 0, Dr = 1900; Dr < 4700; r++, Dr *= 1.1) { for (var tx = -1.1; tx <= 0.52; tx += 0.06) pt(m, V.p(tx * Dr, Y0, Dr), sz(Dr, 1), cw, 0.06); }
    for (var d = 0; d < 150; d++) { var Dd = 1900 + ctx.rnd() * 2800; pt(m, V.at(-1.05 + ctx.rnd() * 1.55, -0.1 + ctx.rnd() * 0.42, Dd), sz(Dd, 1), cw, 0.05 + ctx.rnd() * 0.15); }
  });

  // NIGHT PIER: a long pier running out over a dark sea, its lamps doubled in the water, a small
  // beacon at its end, a moon with its path on the water, the lights of a far shore
  A.register('s24-pier', function (m, ctx) {
    var V = view(ctx, 60, -40 + ctx.rnd() * 20), cw = ctx.tone('a', 0.88), cb = ctx.light('b'), cc = ctx.light('c');
    var yn = -560, yf = -60, D1 = 4250, xa = 320 + ctx.rnd() * 40, xb = (0.13 + ctx.rnd() * 0.03) * D1, DW = 62, H = 80;
    function sea(D) { return seaY(D, yn, yf); }
    function XP(D) { return xa + (xb - xa) * (D - 1800) / (D1 - 1800); }
    for (var j = 0, D = 1760; D <= 4700; j++, D *= 1.05) {
      var row = [];
      for (var i = 0; i <= 80; i++) { var X = (-1.1 + 2.3 * i / 80) * D; row.push(V.p(X, sea(D) + sz(D, 1.2) * Math.sin(X * 0.015 + j * 1.9), D)); }
      trace(m, row, cw, 0.05 + 0.07 * (1 - j / 22), null, 8);
    }
    var deck = [[], []];
    for (var Dd = 1800; Dd <= D1; Dd += 30) [-1, 1].forEach(function (s, k) { deck[k].push(V.p(XP(Dd) + s * DW, sea(Dd) + H, Dd)); });
    deck.forEach(function (rl) { trace(m, rl, cw, 0.42, function (P) { return 1 - 0.5 * clamp((-P[2] - 1900) / 2600, 0, 1); }, 6); });
    for (var Dp = 1800; Dp <= D1; Dp += 34) seg(m, V.p(XP(Dp) - DW, sea(Dp) + H, Dp), V.p(XP(Dp) + DW, sea(Dp) + H, Dp), cw, 0.09);
    for (var Dq = 1830; Dq <= D1; Dq += 150) [-1, 1].forEach(function (s) { seg(m, V.p(XP(Dq) + s * DW, sea(Dq), Dq), V.p(XP(Dq) + s * DW, sea(Dq) + H, Dq), cw, 0.2); });
    for (var Dl = 1900, k = 0; Dl <= D1; Dl += 290, k++) {
      var s = k % 2 ? 1 : -1, foot = V.p(XP(Dl) + s * DW, sea(Dl) + H, Dl), top = V.p(XP(Dl) + s * DW, sea(Dl) + H + 170, Dl);
      seg(m, foot, top, cw, 0.32);
      lamp(m, ctx, top, sz(Dl, 2.6), cc, 0.85);
      glow(m, ctx, top, Dl, sz(Dl, 22), cc, 0.15);
      streak(m, V.p(XP(Dl) + s * DW, sea(Dl) + 2, Dl), Math.PI, sz(Dl, 2.4), Dl * (0.045 + 0.03 * ctx.rnd()), cc, 0.2, 'bars', 9);
    }
    // the beacon at the end of the pier
    var Bt = V.p(XP(D1), sea(D1) + H + 70, D1 + 30);
    m.bar(Bt[0], Bt[1], Bt[2], 22, 140, 22, cb, 0.3, V.rot);
    var Bl = V.p(XP(D1), sea(D1) + H + 160, D1 + 30);
    lamp(m, ctx, Bl, sz(D1, 3.2), cc, 1);
    glow(m, ctx, Bl, D1, sz(D1, 40), cc, 0.2);
    band(m, Bl, D1 * 0.35, sz(D1, 3), cc, 0.12);
    // the moon and its path on the water
    var mx = 0.24 + ctx.rnd() * 0.04, my = 0.13 + ctx.rnd() * 0.04, mr = 0.022, DM = 4700;
    for (var ty = my - mr; ty <= my + mr; ty += 0.0019) { var w = Math.sqrt(Math.max(0, mr * mr - (ty - my) * (ty - my))); if (w > 0.002) seg(m, V.at(mx - w, ty, DM), V.at(mx + w, ty, DM), cb, 0.22); }
    glow(m, ctx, V.at(mx, my, DM), DM, 600, cb, 0.1);
    for (var g = 0; g < 120; g++) {
      var t = Math.pow(ctx.rnd(), 0.8), Dg = 1800 + 2850 * t, Pg = V.p((mx + gauss(ctx) * (0.006 + 0.03 * (1 - t))) * Dg, sea(Dg) + 2, Dg);
      band(m, Pg, Dg * (0.003 + 0.012 * ctx.rnd()), sz(Dg, 1), cb, (0.15 + 0.3 * ctx.rnd()) * (1 - 0.4 * t));
    }
    for (var f = 0; f < 140; f++) { var Df = 4700; lamp(m, ctx, V.p((-1.1 + ctx.rnd() * 2.3) * Df, yf + 6, Df), sz(Df, 1.3), ctx.rnd() < 0.5 ? cc : cb, 0.2 + 0.4 * ctx.rnd()); }
    stars(m, ctx, V, 200, yf / 4700 + 0.04, 0.33, function (tx, ty) { return Math.hypot(tx - mx, ty - my) < mr * 2; }, 0.7);
  });

  // FOG BRIDGE: a suspension bridge running across and away, its towers rising out of a bank of fog,
  // main cables swinging between them, hangers down to a deck lined with lamps
  A.register('s24-bridge', function (m, ctx) {
    var V = view(ctx, 60, -10 + ctx.rnd() * 20), cw = ctx.tone('a', 0.88), cb = ctx.light('b'), cc = ctx.light('c');
    var A0 = [-1750 - ctx.rnd() * 200, 1950], B0 = [1300 + ctx.rnd() * 200, 4650], YD = -250, dir = unit([B0[0] - A0[0], 0, B0[1] - A0[1]]), side = [dir[2], 0, -dir[0]];
    var towers = [0.3, 0.72], top = 430, sag = 90;
    function at(t, s, y) { return V.p(A0[0] + (B0[0] - A0[0]) * t + side[0] * s, y, A0[1] + (B0[1] - A0[1]) * t + side[2] * s); }
    function cableY(t) {
      if (t < towers[0]) return YD + 40 + (top - YD - 40) * Math.pow(t / towers[0], 1.3);
      if (t > towers[1]) return YD + 40 + (top - YD - 40) * Math.pow((1 - t) / (1 - towers[1]), 1.3);
      var u = (t - towers[0]) / (towers[1] - towers[0]); return top - (top - YD - sag) * 4 * u * (1 - u);
    }
    function fade(P) { return 1 - 0.55 * clamp((-P[2] - 1900) / 2700, 0, 1); }
    [-50, 50].forEach(function (s) {
      var cab = [], dk = [];
      for (var i = 0; i <= 200; i++) { var t = i / 200; cab.push(at(t, s, cableY(t))); dk.push(at(t, s, YD)); }
      trace(m, cab, cb, 0.45, fade, 6);
      trace(m, dk, cw, 0.3, fade, 6);
      for (var h = 0.01; h < 1; h += 0.011) seg(m, at(h, s, cableY(h)), at(h, s, YD), cw, 0.08 * fade(at(h, s, YD)));
      for (var l = 0; l <= 1; l += 0.0055) { var Pl = at(l, s, YD + 6); lamp(m, ctx, Pl, sz(-Pl[2] + 1200, 1.4), cc, 0.55 * fade(Pl)); }
    });
    towers.forEach(function (t) {
      [-50, 50].forEach(function (s) { trace(m, [at(t, s, -820), at(t, s, top + 30)], cw, 0.4, null, 2); trace(m, [at(t, s * 1.4, -820), at(t, s * 1.2, top + 30)], cw, 0.2, null, 2); });
      [120, 300, top + 30].forEach(function (y) { seg(m, at(t, -60, y), at(t, 60, y), cw, 0.32); });
      var T = at(t, 0, top + 60);
      lamp(m, ctx, T, sz(-T[2] + 1200, 2.6), cc, 0.9);
      glow(m, ctx, T, -T[2] + 1200, sz(-T[2] + 1200, 18), cc, 0.15);
    });
    // light moving on the deck
    for (var c = 0; c < 26; c++) { var t0 = ctx.rnd(), t1 = t0 + 0.01 + ctx.rnd() * 0.03, s2 = ctx.rnd() < 0.5 ? -22 : 22; seg(m, at(t0, s2, YD + 8), at(Math.min(1, t1), s2, YD + 8), s2 < 0 ? cc : cb, 0.35); }
    // the fog bank under the deck, water glimpsed below, the far shore's lights
    for (var f = 0; f < 240; f++) {
      var Df = 2000 + ctx.rnd() * 2700, Pf = V.p((-1.1 + ctx.rnd() * 1.62) * Df, -620 + ctx.rnd() * 300, Df);
      pt(m, Pf, Math.min(sz(Df, 50 + ctx.rnd() * 60), Df * 0.14), cw, 0.025 + ctx.rnd() * 0.025, true);
    }
    for (var b = 0; b < 6; b++) { var Db = 2200 + b * 420; band(m, V.p(gauss(ctx) * 0.3 * Db, -520 + ctx.rnd() * 120, Db), Db * (0.8 + ctx.rnd() * 0.6), Db * 0.03, cw, 0.035); }
    for (var s3 = 0; s3 < 110; s3++) { var Ds = 4700; lamp(m, ctx, V.p((-1.1 + ctx.rnd() * 1.62) * Ds, YD - 30 + ctx.rnd() * 30, Ds), sz(Ds, 1.2), ctx.rnd() < 0.5 ? cc : cb, 0.2 + 0.35 * ctx.rnd()); }
    stars(m, ctx, V, 160, 0.02, 0.33, null, 0.6);
  });

  // NEON STREET: a narrow street between tall buildings at night, blade signs of light hung out over
  // it, cables strung across, wet ground doubling every sign, a glow where the street ends
  A.register('s24-street', function (m, ctx) {
    var V = view(ctx, 60, 10 + ctx.rnd() * 20), cw = ctx.tone('a', 0.85), cb = ctx.light('b'), cc = ctx.light('c');
    var Y0 = -480, Wd = 520, rot = V.rot;
    function fade(D) { return 1 - 0.6 * clamp((D - 1850) / 2800, 0, 1); }
    [-1, 1].forEach(function (s) {
      for (var D = 1850; D < 4650;) {
        var len = 220 + ctx.rnd() * 380, D2 = Math.min(4700, D + len), Hb = 520 + ctx.rnd() * 1100, f = fade(D), X = s * Wd;
        trace(m, [V.p(X, Y0, D), V.p(X, Hb, D), V.p(X, Hb, D2)], cw, 0.22 * f, null, 2);
        trace(m, [V.p(X + s * 140, Hb + 40, D + 30), V.p(X + s * 140, Hb + 40, D2 - 30)], cw, 0.08 * f, null, 2);
        for (var y = Y0 + 110; y < Hb - 40; y += 95) seg(m, V.p(X, y, D + 10), V.p(X, y, D2 - 10), cw, 0.045 * f);
        for (var wy = Y0 + 150; wy < Hb - 50; wy += 95) for (var wd = D + 25; wd < D2 - 20; wd += 34) if (ctx.rnd() < 0.12) pt(m, V.p(X - s * 2, wy, wd), sz(wd, 1.3), ctx.rnd() < 0.3 ? cc : mix(cw, cb, 0.4), 0.3 + 0.4 * ctx.rnd());
        // blade signs hung out over the street, and flat signs on the wall
        if (ctx.rnd() < 0.8) {
          var Ds = D + ctx.rnd() * (D2 - D), ys = Y0 + 180 + ctx.rnd() * 560, hs = 140 + ctx.rnd() * 220, ws = 70 + ctx.rnd() * 70, col = ctx.rnd() < 0.55 ? cc : cb;
          var C = V.p(X - s * (ws / 2 + 14), ys + hs / 2, Ds);
          m.glass(C[0], C[1], C[2], ws, hs, 8, col, 0.75 * f, rot);
          for (var g = 0, ng = 3 + Math.floor(ctx.rnd() * 4); g < ng; g++) {
            var gy = ys + hs * (g + 0.7) / (ng + 0.4), gl = ws * (0.3 + 0.5 * ctx.rnd());
            seg(m, V.p(X - s * (ws / 2 + 14) - gl / 2, gy, Ds), V.p(X - s * (ws / 2 + 14) + gl / 2, gy, Ds), col, 0.5 * f);
          }
          glow(m, ctx, C, Ds, sz(Ds, 40), col, 0.1 * f);
          streak(m, V.p(X - s * (ws / 2 + 14), Y0, Ds), Math.PI, ws * 0.6, hs * 1.2, col, 0.1 * f, 'bars', 12);
        }
        if (ctx.rnd() < 0.5) {
          var Dw = D + 40 + ctx.rnd() * Math.max(10, D2 - D - 200), yw = Y0 + 160 + ctx.rnd() * 400, lw = 80 + ctx.rnd() * 110, hw2 = 40 + ctx.rnd() * 60, c2 = ctx.rnd() < 0.5 ? cb : cc;
          trace(m, loop([V.p(X - s * 3, yw, Dw), V.p(X - s * 3, yw + hw2, Dw), V.p(X - s * 3, yw + hw2, Dw + lw), V.p(X - s * 3, yw, Dw + lw)]), c2, 0.45 * f, null, 4);
        }
        D = D2 + 30 + ctx.rnd() * 60;
      }
    });
    // cables across the street, sagging
    for (var c = 0; c < 9; c++) {
      var Dc = 1950 + ctx.rnd() * 2600, yc = 260 + ctx.rnd() * 500, cab = [];
      for (var i = 0; i <= 16; i++) { var t = i / 16; cab.push(V.p(-Wd + 2 * Wd * t, yc - 70 * 4 * t * (1 - t), Dc + (ctx.rnd() - 0.5) * 6)); }
      trace(m, cab, cw, 0.14 * fade(Dc), null, 8);
    }
    // the ground: kerbs, a broken centre line, the glow where the street ends
    [-1, 1].forEach(function (s) { var k = []; for (var D = 1850; D <= 4700; D += 100) k.push(V.p(s * (Wd - 70), Y0, D)); trace(m, k, cw, 0.12, null, 4); });
    for (var Dl = 1900; Dl < 4600; Dl += 180) seg(m, V.p(0, Y0, Dl), V.p(0, Y0, Dl + 80), cw, 0.12 * fade(Dl));
    var E = V.p(0, Y0 + 220, 4720);
    glow(m, ctx, E, 4720, 640, cc, 0.15);
    band(m, V.p(0, Y0 + 60, 4720), 4720 * 0.4, 4720 * 0.06, cb, 0.08);
    for (var r = 0; r < 120; r++) { var Dr = 1900 + ctx.rnd() * 2600, Pr = V.p((ctx.rnd() - 0.5) * 2 * Wd, Y0 + ctx.rnd() * 1300, Dr); streak(m, Pr, Math.PI - 0.08, 0.8, sz(Dr, 14 + ctx.rnd() * 20), cw, 0.05 + ctx.rnd() * 0.05, 'fade'); }
  });

  // a crack in the ground: a random walk on the floor that sometimes forks
  function crack(ctx, x, d, ang, steps, out, depth) {
    var pts = [[x, d]];
    for (var i = 0; i < steps; i++) {
      ang += (ctx.rnd() - 0.5) * 0.9;
      var st = 40 + ctx.rnd() * 70; x += Math.sin(ang) * st; d += Math.cos(ang) * st * 0.8;
      pts.push([x, d]);
      if (depth < 2 && ctx.rnd() < 0.12) crack(ctx, x, d, ang + (ctx.rnd() < 0.5 ? -1 : 1) * (0.6 + ctx.rnd() * 0.6), Math.floor(steps * 0.5), out, depth + 1);
    }
    out.push(pts);
  }

  // FISSURE PLAIN: a dark plain split by glowing cracks, sparks rising off them and steam from a few
  // vents, a volcano on the horizon with fire at its rim and smoke over it
  A.register('s24-fissure', function (m, ctx) {
    var V = view(ctx, 60, -30 + ctx.rnd() * 20), cw = ctx.tone('a', 0.7), cb = ctx.light('b'), cc = ctx.light('c'), n = noise2(ctx);
    var Y0 = -470, cracks = [];
    for (var k = 0; k < 9; k++) { var D0 = 1900 + ctx.rnd() * 2400; crack(ctx, (-1.0 + ctx.rnd() * 1.4) * D0, D0, (ctx.rnd() - 0.5) * 3, 14 + Math.floor(ctx.rnd() * 22), cracks, 0); }
    function fade(P) { return 1 - 0.55 * clamp((-P[2] - 1900) / 2700, 0, 1); }
    cracks.forEach(function (c) {
      var pts = c.filter(function (q) { return q[1] > 1800 && q[1] < 4700; }).map(function (q) { return V.p(q[0], Y0 + 1, q[1]); });
      trace(m, pts, cc, 0.55, fade, 4);
      trace(m, pts.map(function (P) { return add(P, mul(V.u, 3)); }), mix(cc, [1, 1, 1], 0.4), 0.25, fade, 4);
      pts.forEach(function (P, i) {
        var D = -P[2] + 1200;
        if (i % 3 === 0) glow(m, ctx, P, D, sz(D, 22), cc, 0.06 * fade(P));
        if (ctx.rnd() < 0.5) for (var s = 0; s < 3; s++) { var h = Math.pow(ctx.rnd(), 2) * 240; pt(m, add(P, add(mul(V.u, h), mul(V.r, (ctx.rnd() - 0.5) * 30))), sz(D, 1.2), cc, 0.6 * (1 - h / 260) * fade(P)); }
        if (ctx.rnd() < 0.05) streak(m, P, (ctx.rnd() - 0.5) * 0.2, sz(D, 30 + ctx.rnd() * 30), D * (0.08 + 0.12 * ctx.rnd()), mix(cw, cb, 0.5), 0.035, 'fade');
      });
    });
    for (var r = 0, D = 1800; D < 4700; r++, D *= 1.06) {
      for (var tx = -1.1 + (r % 2) * 0.014; tx <= 0.52; tx += 0.028) if (n(tx * 20, r) > 0.45) pt(m, V.p(tx * D, Y0, D), sz(D, 1), cw, 0.05 + 0.08 * ctx.rnd());
    }
    // the volcano on the horizon
    var vx = 0.2 + ctx.rnd() * 0.06, DV = 4720, Hv = 0.075 * DV, rimW = 0.03, cone = [];
    for (var i = 0; i <= 60; i++) {
      var tx2 = vx - 0.55 + 1.1 * i / 60, d0 = Math.abs(tx2 - vx), hgt = d0 < rimW ? Hv * (0.92 + 0.06 * Math.cos(d0 / rimW * Math.PI)) : Hv * Math.max(0, 1 - Math.pow((d0 - rimW) / 0.5, 0.8));
      cone.push(V.p(tx2 * DV, Y0 + hgt + 8 * (n(i * 0.5, 2) - 0.5), DV));
    }
    trace(m, cone, cw, 0.3, null, 6);
    for (var lv = 0; lv < 3; lv++) {
      var flow = [], x0 = vx + (lv - 1) * 0.015;
      for (var q = 0; q <= 12; q++) { var xq = x0 + (lv - 1) * 0.02 * q / 12 + (n(q * 0.6, lv * 3) - 0.5) * 0.01; flow.push(V.p(xq * DV, Y0 + Hv * 0.95 * (1 - Math.pow(q / 12, 1.2) * 0.85) - (q > 0 ? 0 : 0), DV - 5)); }
      trace(m, flow, cc, 0.4, null, 4);
    }
    var Cr = V.p(vx * DV, Y0 + Hv + 10, DV - 10);
    glow(m, ctx, Cr, DV, 380, cc, 0.25);
    for (var sm = 0; sm < 70; sm++) { var hy = ctx.rnd(); pt(m, V.p((vx + gauss(ctx) * 0.03 * (1 + 2 * hy) + hy * 0.06) * DV, Y0 + Hv + hy * 0.2 * DV, DV - 20), Math.min(sz(DV, 30 + 50 * hy), DV * 0.14), mix(cw, cc, 0.3 * (1 - hy)), 0.04 * (1 - hy * 0.6), true); }
    for (var e = 0; e < 120; e++) { var De = 2000 + ctx.rnd() * 2600; pt(m, V.at(-1.05 + ctx.rnd() * 1.55, -0.12 + ctx.rnd() * 0.4, De), sz(De, 1.1), cc, 0.1 + 0.3 * ctx.rnd()); }
    band(m, V.p(vx * DV, Y0 + 20, DV), DV * 1.6, DV * 0.04, cc, 0.06);
  });

  // DISH ARRAY: a plain set with rows of dish antennas, all turned to the same patch of sky, each on
  // its pedestal with a lit feed at its focus, service roads between them
  A.register('s24-dishes', function (m, ctx) {
    var V = view(ctx, 60, -20 + ctx.rnd() * 20), cw = ctx.tone('a', 0.88), cb = ctx.light('b'), cc = ctx.light('c');
    var Y0 = -500, S = unit(add(add(mul(V.u, 0.78), mul(V.r, -0.32 + ctx.rnd() * 0.2)), mul(V.f, 0.5))), a1 = unit(cross(S, V.u)), a2 = cross(S, a1);
    var xo = ctx.rnd() * 560, rd = 150;
    for (var j = 0; j < 6; j++) {
      var D = 2150 + j * 500;
      for (var X = -1.12 * D + xo + (j % 2) * 280; X < 0.55 * D; X += 560) {
        var B = V.p(X, Y0, D), M = V.p(X, Y0 + 230, D), f = 1 - 0.5 * j / 5;
        if (!behind(V.p(X + rd * 1.4, Y0, D - rd))) continue;
        seg(m, B, M, cw, 0.3 * f);
        seg(m, V.p(X - 40, Y0, D), V.p(X, Y0 + 90, D), cw, 0.16 * f);
        seg(m, V.p(X + 40, Y0, D), V.p(X, Y0 + 90, D), cw, 0.16 * f);
        function dish(rho, th) { return add(M, add(mul(S, 50 * rho * rho), mul(add(mul(a1, Math.cos(th)), mul(a2, Math.sin(th))), rho * rd))); }
        [1, 0.55].forEach(function (rho, q) { var o = []; for (var i = 0; i <= 28; i++) o.push(dish(rho, i / 28 * TAU)); trace(m, o, q ? cw : cb, (q ? 0.14 : 0.38) * f, null, 9); });
        for (var r = 0; r < 6; r++) { var rib = []; for (var i2 = 0; i2 <= 4; i2++) rib.push(dish(i2 / 4, r / 6 * TAU)); trace(m, rib, cw, 0.12 * f, null, 5); }
        var F = add(M, mul(S, 150));
        for (var k = 0; k < 3; k++) seg(m, dish(1, k / 3 * TAU + 0.5), F, cw, 0.14 * f);
        lamp(m, ctx, F, sz(D, 2), cc, 0.8 * f);
        if (j < 3) glow(m, ctx, F, D, sz(D, 12), cc, 0.1 * f);
      }
      var road = []; for (var q = 0; q <= 30; q++) road.push(V.p((-1.1 + 1.62 * q / 30) * (D + 250), Y0, D + 250)); trace(m, road, cw, 0.06, null, 10);
    }
    for (var c = -6; c <= 6; c++) { var lane = []; for (var Dl = 1900; Dl <= 4700; Dl += 200) lane.push(V.p(xo - 280 + c * 560 + 0 * Dl, Y0, Dl)); trace(m, lane, cw, 0.04, null, 4); }
    stars(m, ctx, V, 300, -0.02, 0.34, null, 0.8);
    band(m, V.at(0, Y0 / 4700 + 0.02, 4700), 4700 * 1.8, 4700 * 0.04, cb, 0.06);
  });
})();

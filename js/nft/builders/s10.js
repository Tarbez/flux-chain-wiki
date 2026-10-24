/* Sheet 10 builders: chain paths, orbit traces, node clusters, streams, block structures, planes,
   cubes, particle clouds, topology, bridges, lattices and background motifs from reference sheet 10.
   White is ctx.light('a') or ctx.tone('a', v); the sheet's cyan or amber is the palette's accent,
   ctx.light('c'), so it follows the card's palette. Each builder is named by an element file in
   layers/<NN-key>/sheet-10/. The space and the m / ctx calls are described in the header of art3d.js.

   Every builder works around the mark's centre (the origin) and keeps what it draws SEEN inside
   x -240..320 and y -340..340: far things are moved right by shiftAt() so the rest tilt does not
   carry them into the words, and small things are placed only where ctx.clearAt() is true. Big
   shapes sit behind the mark (z < 0); what passes in front is thin lines, points and small glass,
   so the mark stays the brightest thing on the card. Every random value comes from ctx.rnd(). */
(function () {
  'use strict';
  var A = window.Art3D, TAU = Math.PI * 2;

  function rotX(p, a) { var c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; }
  function rotY(p, a) { var c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; }
  function rotZ(p, a) { var c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]; }
  // the same turn as a block's rot [ax, ay, az] (three.js XYZ order: z first, then y, then x)
  function turn(p, r) { return rotX(rotY(rotZ(p, r[2] || 0), r[1] || 0), r[0] || 0); }
  function plus(p, o) { return [p[0] + o[0], p[1] + o[1], p[2] + o[2]]; }
  function flat(list) { var out = []; list.forEach(function (p) { out.push(p[0], p[1], p[2]); }); return out; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function gauss(ctx) { return ctx.rnd() + ctx.rnd() + ctx.rnd() - 1.5; }   // about -1.5..1.5, most near 0
  // how far right to move a thing at depth z so its centre is SEEN at x = 0
  function shiftAt(ctx, z) { var a = ctx.seen(0, 0, z), b = ctx.seen(100, 0, z); return -a[0] * 100 / (b[0] - a[0]); }
  // true when a point is seen inside the art's bounds and clear of the card's words
  function inView(ctx, p, pad) {
    var s = ctx.seen(p[0], p[1], p[2]);
    return s[0] > -238 + pad && s[0] < 318 - pad && s[1] > -338 + pad && s[1] < 338 - pad && ctx.clear(s[0], s[1], pad);
  }
  // the point at depth z that is SEEN at (xs, ys): a far thing placed by where it lands on the card
  function atSeen(ctx, xs, ys, z) {
    var p = [xs, ys], a = ctx.seen(0, 0, z), b = ctx.seen(100, 100, z), kx = (b[0] - a[0]) / 100, ky = (b[1] - a[1]) / 100;
    for (var i = 0; i < 4; i++) { var s = ctx.seen(p[0], p[1], z); p[0] += (xs - s[0]) / kx; p[1] += (ys - s[1]) / ky; }
    return [p[0], p[1], z];
  }
  // a smooth curve through hand-placed points (Catmull-Rom), u from 0 to 1
  function spline(K, u) {
    var n = K.length - 1, f = Math.min(n - 1e-9, Math.max(0, u * n)), i = Math.floor(f), t = f - i, t2 = t * t, t3 = t2 * t;
    var p0 = K[Math.max(0, i - 1)], p1 = K[i], p2 = K[i + 1], p3 = K[Math.min(n, i + 2)], out = [];
    for (var d = 0; d < p1.length; d++) out.push(0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3));
    return out;
  }
  function node(m, p, rgb, size, glow) {          // a small hard dot with a soft glow round it
    m.point(p[0], p[1], p[2], size, rgb, 1);
    m.point(p[0], p[1], p[2], size * (glow || 4.5), rgb, 0.35, true);
  }
  // a ring facing the viewer, as a closed line
  function hoop(m, p, r, rgb, a) {
    var pts = [];
    for (var i = 0; i < 20; i++) { var t = i / 20 * TAU; pts.push(p[0] + r * Math.cos(t), p[1] + r * Math.sin(t), p[2]); }
    m.line(pts, rgb, a, true);
  }
  // a path sampled by length: returns { at(s) -> {p, t}, len }
  function byLength(fn, n) {
    var pts = [], acc = [0];
    for (var i = 0; i <= n; i++) pts.push(fn(i / n));
    for (var j = 1; j <= n; j++) acc.push(acc[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1], pts[j][2] - pts[j - 1][2]));
    var len = acc[n];
    return {
      len: len,
      at: function (s) {
        s = Math.max(0, Math.min(len, s));
        var lo = 0, hi = n;
        while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (acc[mid] <= s) lo = mid; else hi = mid; }
        var f = (s - acc[lo]) / ((acc[hi] - acc[lo]) || 1), p = mix(pts[lo], pts[hi], f);
        var d = [pts[hi][0] - pts[lo][0], pts[hi][1] - pts[lo][1], pts[hi][2] - pts[lo][2]], k = Math.hypot(d[0], d[1], d[2]) || 1;
        return { p: p, t: [d[0] / k, d[1] / k, d[2] / k] };
      }
    };
  }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function unit(a) { var k = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / k, a[1] / k, a[2] / k]; }

  /* ---------- chain paths (sheet 10, piece 10) ---------- */
  // One builder, three shapes (data-shape): a tilted loop round the mark (aura), a short arc in front
  // at one side (particles), and a long S far behind (backdrop). A chain is a dotted path with links on
  // it: pairs of interlocked rings, one in the card's plane and one across it, or flat hexagons.
  A.register('s10-chain', function (m, ctx) {
    var shape = ctx.P.shape || 'loop', wa = ctx.light('a'), cc = ctx.light('c'), path, step, hexes, nodes, z0 = 0, dot = 2.2, la = 0.85;
    if (shape === 'arc') {
      var spots = [[255, -95, 70], [-175, -205, 60], [-178, 185, 60], [235, -215, 50]], o = spots[Math.floor(ctx.rnd() * spots.length)];
      var R0 = 78 + ctx.rnd() * 14, a0 = ctx.rnd() * TAU, span = 3.6 + ctx.rnd() * 0.8;
      path = byLength(function (u) { return plus(rotX([R0 * Math.cos(a0 + u * span), R0 * Math.sin(a0 + u * span), 0], 0.35), o); }, 120);
      step = 26; hexes = 0.5; nodes = [0, 1]; la = 0.95;
    } else if (shape === 'snake') {
      z0 = -230;
      var flip = ctx.rnd() < 0.5 ? 1 : -1, jit = function () { return (ctx.rnd() - 0.5) * 40; };
      var K = [[-215, -320], [270, -190 + jit()], [-200, -10 + jit()], [275, 140 + jit()], [60, 330]].map(function (q) {
        var xs = flip > 0 ? q[0] : 55 - (q[0] - 55);
        if (xs > 132 && q[1] > 200) xs = 120;                    // keep clear of the genesis ID
        return atSeen(ctx, xs, q[1], z0);
      });
      path = byLength(function (u) { return spline(K, u); }, 400);
      step = 30; hexes = 1; nodes = [0.25, 0.5, 0.75]; dot = 2.6; la = 0.7;
    } else {
      var ax = 0.44 + ctx.rnd() * 0.08, az = 0.68 + (ctx.rnd() - 0.5) * 0.14, R = 292;
      path = byLength(function (u) { var t = u * TAU, p = rotZ(rotX([R * Math.cos(t), 0, R * Math.sin(t)], ax), az); return [p[0] + 30, p[1], p[2] - 20]; }, 360);
      step = 74; hexes = 0; nodes = [0.07, 0.4, 0.74];
    }
    var L = path.len;
    // the dotted path
    for (var s = 0; s < L; s += 7) {
      var q = path.at(s).p;
      if (inView(ctx, q, 4)) m.point(q[0], q[1], q[2], dot, wa, shape === 'snake' ? 0.4 : 0.55);
    }
    // the links
    var phase = ctx.rnd() * step, k = 0;
    for (var s2 = phase; s2 < L - 6; s2 += step, k++) {
      var at = path.at(s2), p = at.p, t = at.t;
      if (!inView(ctx, p, 12)) continue;
      var nA = unit(cross(t, [0, 0, 1])), nB = unit(cross(t, nA));
      var hex = hexes >= 1 || (hexes > 0 && k % 2 === 1);
      if (hex) {
        var hp = [], r = shape === 'snake' ? 13 : 7.5;
        for (var h = 0; h < 6; h++) { var ang = h / 6 * TAU + Math.PI / 6; hp.push(p[0] + r * Math.cos(ang), p[1] + r * Math.sin(ang), p[2]); }
        m.line(hp, wa, la, true);
        m.point(p[0], p[1], p[2], 2.2, wa, 0.9);
      } else {
        [[nA, 0], [nB, 9]].forEach(function (pl) {
          var c = plus(p, [t[0] * pl[1], t[1] * pl[1], t[2] * pl[1]]), ring = [];
          for (var i = 0; i < 18; i++) {
            var a = i / 18 * TAU;
            ring.push(c[0] + t[0] * 8 * Math.cos(a) + pl[0][0] * 4.4 * Math.sin(a), c[1] + t[1] * 8 * Math.cos(a) + pl[0][1] * 4.4 * Math.sin(a), c[2] + t[2] * 8 * Math.cos(a) + pl[0][2] * 4.4 * Math.sin(a));
          }
          m.line(ring, wa, la, true);
        });
      }
    }
    // the nodes: glass cubes, the first one glowing in the accent
    nodes.forEach(function (u, i) {
      var p = path.at(u * L).p, sz = shape === 'snake' ? 18 : shape === 'arc' ? 13 : 17;
      if (!inView(ctx, p, 16)) return;
      if (shape === 'snake') { node(m, p, cc, 7, 6); m.point(p[0], p[1], p[2], 120, cc, 0.2, true); return; }
      m.glass(p[0], p[1], p[2], sz, sz, sz, ctx.tone('a', 0.95), 0.85, [0.5 + ctx.rnd() * 0.3, 0.6 + ctx.rnd() * 0.3, 0]);
      if (i === 0) { m.point(p[0], p[1], p[2], sz * 3.2, cc, 0.4, true); m.point(p[0], p[1], p[2], 4, cc, 1); }
    });
  });

  /* ---------- orbits (sheet 10, piece 11) ---------- */
  // 01: a bundle of thin orbits laid close together, like the trace of one orbit drawn many times
  A.register('s10-bundle', function (m, ctx) {
    var wa = ctx.light('a'), cc = ctx.light('c'), ax = 0.4 + ctx.rnd() * 0.06, az = -0.42 + (ctx.rnd() - 0.5) * 0.16, n = 7, ox = 26;
    var cube = Math.floor(ctx.rnd() * 3), spark = 3 + Math.floor(ctx.rnd() * 3);
    for (var k = 0; k < n; k++) {
      var r = 236 + k * 8.5, axk = ax + k * 0.014, azk = az + k * 0.02 + (ctx.rnd() - 0.5) * 0.02, N = 260;
      var pts = [];
      for (var i = 0; i < N; i++) { var t = i / N * TAU, p = rotZ(rotX([r * Math.cos(t), 0, r * Math.sin(t)], axk), azk); pts.push([p[0] + ox, p[1], p[2]]); }
      // two or three gaps break the orbit into arcs; each arc ends in a dot
      var gaps = 2 + Math.floor(ctx.rnd() * 2), cut = [];
      for (var g = 0; g < gaps; g++) { var g0 = Math.floor(ctx.rnd() * N), gw = 6 + Math.floor(ctx.rnd() * 22); for (var j = 0; j < gw; j++) cut[(g0 + j) % N] = 1; }
      var run = [], alpha = 0.18 + 0.4 * (1 - Math.abs(k - 3) / 4) * (0.7 + ctx.rnd() * 0.3);
      for (var q = 0; q <= N; q++) {
        var idx = q % N;
        if (q < N && !cut[idx]) { run.push(pts[idx]); continue; }
        if (run.length > 3) { m.line(flat(run), wa, alpha); [run[0], run[run.length - 1]].forEach(function (e) { m.point(e[0], e[1], e[2], 2.6, wa, 0.85); }); }
        run = [];
      }
      if (k === 2) for (var d = 0; d < N; d += 3) if (!cut[d]) m.point(pts[d][0], pts[d][1], pts[d][2], 1.8, wa, 0.6);
      if (k === n - 1 - cube) { var c = pts[Math.floor(ctx.rnd() * N)]; m.glass(c[0], c[1], c[2], 16, 16, 16, ctx.tone('a', 0.95), 0.85, [0.6, 0.7, 0]); }
      if (k === spark) { var e = pts[Math.floor(ctx.rnd() * N)]; node(m, e, cc, 6, 6); }
    }
  });

  // 03: an accretion disc: many fine rings, brightest in the middle of the disc, in a haze of particles
  A.register('s10-accretion', function (m, ctx) {
    var cc = ctx.light('c'), wa = ctx.light('a'), ax = 0.3 + ctx.rnd() * 0.06, az = 0.48 + (ctx.rnd() - 0.5) * 0.14, o = [26, (ctx.rnd() - 0.5) * 30, -30];
    function at(r, t, h) { var p = rotZ(rotX([r * Math.cos(t), h || 0, r * Math.sin(t)], ax), az); return plus(p, o); }
    for (var k = 0; k < 22; k++) {
      var r = 150 + k * 6.8, w = Math.exp(-Math.pow((r - 238) / 52, 2)), pts = [];
      for (var i = 0; i < 220; i++) pts.push(at(r, i / 220 * TAU));
      m.line(flat(pts), mix(wa, cc, 0.4 + 0.6 * (k / 21)), 0.05 + 0.45 * w * (0.7 + ctx.rnd() * 0.3), true);
    }
    for (var j = 0; j < 1100; j++) {
      var rr = 238 + gauss(ctx) * 62, tt = ctx.rnd() * TAU, p = at(rr, tt, gauss(ctx) * 10);
      var near = Math.exp(-Math.pow((rr - 238) / 70, 2));
      m.point(p[0], p[1], p[2], 1.1 + ctx.rnd() * 1.6, ctx.rnd() < 0.7 ? cc : wa, (0.15 + 0.6 * near) * (0.5 + ctx.rnd() * 0.5));
    }
    for (var s = 0; s < 3; s++) { var q = at(225 + ctx.rnd() * 30, ctx.rnd() * TAU); node(m, q, cc, 5, 5); }
    m.point(o[0], o[1], o[2] - 60, 220, cc, 0.1, true);
  });

  /* ---------- node clusters (sheet 10, piece 12) ---------- */
  // 01: a web of nodes on a shell round the mark, each joined to its nearest neighbours
  A.register('s10-node-web', function (m, ctx) {
    var wa = ctx.light('a'), cc = ctx.light('c'), nodes = [];
    for (var tries = 0; tries < 400 && nodes.length < 17; tries++) {
      var th = ctx.rnd() * TAU, R = 228 + ctx.rnd() * 95, p = [28 + R * Math.cos(th), R * 1.1 * Math.sin(th), -150 + ctx.rnd() * 180];
      if (!inView(ctx, p, 18)) continue;
      if (nodes.some(function (q) { return Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) < 74; })) continue;
      nodes.push(p);
    }
    var hub = Math.floor(ctx.rnd() * nodes.length), seen = {}, deg = nodes.map(function () { return 0; });
    nodes.forEach(function (p, i) {
      var near = nodes.map(function (q, j) { return { j: j, d: Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) }; })
        .filter(function (e) { return e.j !== i; }).sort(function (a, b) { return a.d - b.d; }).slice(0, i === hub ? 4 : 2);
      near.forEach(function (e) {
        var key = Math.min(i, e.j) + '-' + Math.max(i, e.j);
        if (seen[key] || e.d > 260) return;
        seen[key] = 1; deg[i]++; deg[e.j]++;
        var q = nodes[e.j], acc = i === hub || e.j === hub;
        m.line([p[0], p[1], p[2], q[0], q[1], q[2]], acc ? cc : wa, acc ? 0.5 : 0.28);
        if (ctx.rnd() < 0.35) { var f = 0.3 + ctx.rnd() * 0.4, d = mix(p, q, f); m.point(d[0], d[1], d[2], 2.4, acc ? cc : wa, 0.8); }
      });
    });
    nodes.forEach(function (p, i) {
      if (i === hub) {
        m.glass(p[0], p[1], p[2], 20, 20, 20, ctx.tone('a', 0.95), 0.9, [0.6, 0.7, 0]);
        m.point(p[0], p[1], p[2], 80, cc, 0.4, true); m.point(p[0], p[1], p[2], 5, cc, 1);
      } else if (ctx.rnd() < 0.65) {
        var s = 9 + ctx.rnd() * 6;
        m.glass(p[0], p[1], p[2], s, s, s, ctx.tone('a', 0.95), 0.8, [ctx.rnd() * 3, ctx.rnd() * 3, 0]);
      } else node(m, p, wa, 3.4, 4);
    });
  });

  // 02 and 03: a small hub in front at one side of the mark, a glowing accent hub with spokes to nodes
  A.register('s10-hub', function (m, ctx) {
    var wa = ctx.light('a'), cc = ctx.light('c');
    var spots = [[262, -28, 70], [-180, -212, 70], [-182, 196, 70], [236, -186, 60]], start = Math.floor(ctx.rnd() * spots.length), o = null;
    for (var i = 0; i < spots.length && !o; i++) { var c = spots[(start + i) % spots.length]; if (inView(ctx, c, 46)) o = c; }
    if (!o) return;
    var n = 6 + Math.floor(ctx.rnd() * 3), sats = [], a0 = ctx.rnd() * TAU;
    for (var k = 0; k < n * 3 && sats.length < n; k++) {
      var a = a0 + k / n * TAU + (ctx.rnd() - 0.5) * 0.5, d = 42 + ctx.rnd() * 42, p = [o[0] + d * Math.cos(a), o[1] + d * Math.sin(a) * 1.1, o[2] + (ctx.rnd() - 0.5) * 60];
      if (inView(ctx, p, 8)) sats.push(p);
    }
    sats.forEach(function (p, j) {
      m.line([o[0], o[1], o[2], p[0], p[1], p[2]], wa, 0.5);
      if (j % 3 === 1) { var q = sats[(j + 1) % sats.length]; m.line([p[0], p[1], p[2], q[0], q[1], q[2]], wa, 0.22); }
      if (j % 3 === 2) { m.cube(p[0], p[1], p[2], 5, 5, 5, ctx.tone('c', 0.95), [0.6, 0.7, 0]); m.point(p[0], p[1], p[2], 22, cc, 0.35, true); }
      else { var s = 7 + ctx.rnd() * 4; m.glass(p[0], p[1], p[2], s, s, s, ctx.tone('a', 0.95), 0.85, [0.6, 0.7 + ctx.rnd(), 0]); }
    });
    m.glass(o[0], o[1], o[2], 19, 19, 19, ctx.tone('a', 0.95), 0.9, [0.62, 0.78, 0]);
    m.cube(o[0], o[1], o[2], 8, 8, 8, ctx.tone('c', 0.95), [0.62, 0.78, 0]);
    m.point(o[0], o[1], o[2], 90, cc, 0.4, true); m.point(o[0], o[1], o[2], 30, cc, 0.7, true);
  });

  /* ---------- streams (sheet 10, pieces 14 and 15) ---------- */
  // 14: columns of short glowing dashes falling like packets, tallest in the middle, a bright head below
  A.register('s10-packets', function (m, ctx) {
    var wa = ctx.light('a'), cc = ctx.light('c'), cols = 30 + Math.floor(ctx.rnd() * 8), mid = 30 + (ctx.rnd() - 0.5) * 60;
    for (var i = 0; i < cols; i++) {
      var x = -222 + ctx.rnd() * 530, z = -50 + ctx.rnd() * 120, env = Math.exp(-Math.pow((x - mid) / 200, 2));
      var h = 90 + 470 * env * (0.55 + 0.45 * ctx.rnd()), top = Math.min(330, h / 2 + (ctx.rnd() - 0.5) * 70), bot = Math.max(-330, top - h);
      var col = ctx.rnd() < 0.3 ? cc : wa, y = top, w = 1.3 + ctx.rnd() * 1.4;
      while (y > bot) {
        var len = 5 + ctx.rnd() * 22, f = (top - y) / (top - bot);
        if (inView(ctx, [x, y, z], 4)) m.quad(x, y, z, Math.PI, w, Math.min(len, y - bot), col, (0.22 + 0.7 * f) * (0.6 + 0.4 * ctx.rnd()), 'peak');
        y -= len + 3 + ctx.rnd() * 9;
      }
      if (inView(ctx, [x, bot, z], 8) && ctx.rnd() < 0.7) { m.point(x, bot, z, 4, col, 1); m.point(x, bot, z, 20, col, 0.4, true); }
    }
  });

  // 15: horizontal tracer streaks in bands, each a fading tail behind a bright head
  A.register('s10-tracers', function (m, ctx) {
    var wa = ctx.light('a'), cc = ctx.light('c'), bands = 2 + (ctx.rnd() < 0.5 ? 1 : 0), used = [];
    for (var b = 0; b < bands; b++) {
      var yc = 0;
      for (var t = 0; t < 20; t++) { yc = -270 + ctx.rnd() * 520; if (used.every(function (u) { return Math.abs(u - yc) > 150; })) break; }
      used.push(yc);
      var n = 5 + Math.floor(ctx.rnd() * 4);
      for (var i = 0; i < n; i++) {
        var y = yc + (ctx.rnd() - 0.5) * 80, z = -40 + ctx.rnd() * 90, hx = 40 + ctx.rnd() * 250;
        while (hx > -100 && !inView(ctx, [hx + 24, y, z], 10)) hx -= 20;
        if (hx <= -100) continue;
        var acc = ctx.rnd() < 0.28, col = acc ? cc : wa, len = 90 + ctx.rnd() * 340, a = 0.35 + ctx.rnd() * 0.45;
        m.quad(hx, y, z, Math.PI / 2, 1 + ctx.rnd() * 1.3, len, col, a, 'fade');
        m.point(hx, y, z, 3.4 + ctx.rnd() * 2, acc ? cc : [1, 1, 1], 1); m.point(hx, y, z, 18, col, 0.35, true);
        if (ctx.rnd() < 0.5) m.point(hx + 12 + ctx.rnd() * 16, y, z, 1.8, col, 0.7);
      }
    }
  });

  // 19-02: a vertical spike of light through a core behind the mark, in a spindle of particles
  A.register('s10-spindle', function (m, ctx) {
    var cc = ctx.light('c'), wa = ctx.light('a'), y0 = (ctx.rnd() - 0.5) * 60, z0 = -60, x0 = 18;
    [0, Math.PI].forEach(function (ang) {
      m.quad(x0, y0, z0, ang, 2.2, 330, cc, 0.8, 'fade'); m.quad(x0, y0, z0 - 1, ang, 16, 260, cc, 0.1, 'fade');
    });
    [Math.PI / 2, -Math.PI / 2].forEach(function (ang) { m.quad(x0, y0, z0, ang, 1.6, 120, cc, 0.5, 'fade'); });
    for (var i = 0; i < 1400; i++) {
      var v = gauss(ctx) / 1.5, y = y0 + v * 330;
      if (y > 334 || y < -334) continue;
      var spread = 6 + 82 * Math.pow(1 - Math.abs(v), 1.6), x = x0 + gauss(ctx) * spread * 0.9, z = z0 + gauss(ctx) * spread * 0.7;
      var axis = Math.exp(-Math.abs(x - x0) / (spread * 0.5 + 1));
      m.point(x, y, z, 1.1 + ctx.rnd() * 1.6, ctx.rnd() < 0.6 ? cc : wa, (0.2 + 0.7 * axis) * (0.4 + 0.6 * ctx.rnd()));
    }
    m.point(x0, y0, z0, 170, cc, 0.4, true); m.point(x0, y0, z0, 46, cc, 0.9, true); m.point(x0, y0, z0, 10, [1, 1, 1], 1, true);
  });

  /* ---------- block structures and cubes (sheet 10, pieces 16 and 18) ---------- */
  // 16-01: glass cubes stacked into a stair behind the mark, and a short stack at the right
  A.register('s10-stair', function (m, ctx) {
    var edge = ctx.tone('a', 0.95), cc = ctx.light('c'), s = 38, rot = [0.42, 0.62 + (ctx.rnd() - 0.5) * 0.16, 0];
    var cells = [];
    for (var i = 0; i < 4; i++) for (var j = 0; j <= i; j++) for (var k = 0; k < 2; k++) if (!(j === i && k === 1 && ctx.rnd() < 0.5)) cells.push([i, j, k]);
    var o = [-150, -232, -130], lit = Math.floor(ctx.rnd() * cells.length);
    cells.forEach(function (c, n) {
      var p = plus(turn([(c[0] - 1.5) * s, (c[1] - 1.5) * s, (c[2] - 0.5) * s], rot), o);
      if (!inView(ctx, p, 18)) return;
      m.glass(p[0], p[1], p[2], s * 0.94, s * 0.94, s * 0.94, edge, 0.62, rot);
      if (n === lit) { m.cube(p[0], p[1], p[2], 11, 11, 11, ctx.tone('c', 0.95), rot); m.point(p[0], p[1], p[2], 70, cc, 0.4, true); }
    });
    var o2 = [262, -40 + (ctx.rnd() - 0.5) * 40, -110];
    for (var h = 0; h < 3; h++) {
      var q = plus(turn([0, (h - 1) * s, 0], rot), o2);
      if (inView(ctx, q, 18)) m.glass(q[0], q[1], q[2], s * 0.94, s * 0.94, s * 0.94, edge, 0.55, rot);
    }
  });

  // 18-03: a cube inside a cube with their corners joined, behind the mark; the inner one is glass in
  // the accent with a solid core
  A.register('s10-tesseract', function (m, ctx) {
    var wa = ctx.light('a'), cc = ctx.light('c'), rot = [0.46 + ctx.rnd() * 0.08, 0.6 + ctx.rnd() * 0.12, 0], o = [36, (ctx.rnd() - 0.5) * 30, -170];
    var O = 162, I = 62, out = [], inn = [];
    for (var i = 0; i < 8; i++) {
      var v = [i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1];
      out.push(plus(turn([v[0] * O, v[1] * O, v[2] * O], rot), o)); inn.push(plus(turn([v[0] * I, v[1] * I, v[2] * I], rot), o));
    }
    var E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
    E.forEach(function (e) { m.line(flat([out[e[0]], out[e[1]]]), wa, 0.62); });
    for (var c = 0; c < 8; c++) {
      m.line(flat([out[c], inn[c]]), mix(wa, cc, 0.5), 0.42);
      m.glass(out[c][0], out[c][1], out[c][2], 9, 9, 9, ctx.tone('a', 0.95), 0.9, rot);
      node(m, inn[c], cc, 3.6, 5);
    }
    m.glass(o[0], o[1], o[2], 2 * I, 2 * I, 2 * I, cc, 0.85, rot);
    m.cube(o[0], o[1], o[2], 22, 22, 22, ctx.tone('c', 0.95), rot);
    m.point(o[0], o[1], o[2], 200, cc, 0.3, true); m.point(o[0], o[1], o[2], 60, cc, 0.6, true);
  });

  // 18-01 and 18-02: a small block of tiny cubes in front, beside the mark, a few drifting loose
  A.register('s10-voxel', function (m, ctx) {
    var spots = [[262, -62, 60], [-182, -214, 60], [-184, 196, 60], [238, -196, 50]], start = Math.floor(ctx.rnd() * spots.length), o = null;
    for (var t = 0; t < spots.length && !o; t++) { var c = spots[(start + t) % spots.length]; if (inView(ctx, c, 52)) o = c; }
    if (!o) return;
    var N = 6, cell = 8.4, rot = [0.55, 0.72 + (ctx.rnd() - 0.5) * 0.2, 0], cc = ctx.light('c');
    for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) for (var k = 0; k < N; k++) {
      var e = [i, j, k].filter(function (v) { return v === 0 || v === N - 1; }).length;   // 0 inside, 1 face, 2 edge, 3 corner
      if (ctx.rnd() > 0.28 + e * 0.2) continue;
      var p = plus(turn([(i - 2.5) * cell, (j - 2.5) * cell, (k - 2.5) * cell], rot), o), acc = ctx.rnd() < 0.07;
      m.cube(p[0], p[1], p[2], cell * 0.84, cell * 0.84, cell * 0.84, acc ? ctx.tone('c', 0.95) : ctx.tone('a', 0.35 + ctx.rnd() * 0.6), rot);
    }
    m.glass(o[0], o[1], o[2], N * cell + 6, N * cell + 6, N * cell + 6, ctx.tone('a', 0.95), 0.7, rot);
    for (var d = 0; d < 12; d++) {
      var q = plus(turn([(ctx.rnd() - 0.5) * 60, -30 - ctx.rnd() * 60, (ctx.rnd() - 0.5) * 60], rot), o), s = 2.5 + ctx.rnd() * 3;
      if (inView(ctx, q, 4)) m.cube(q[0], q[1], q[2], s, s, s, ctx.tone('a', 0.5 + ctx.rnd() * 0.4), [ctx.rnd() * 3, ctx.rnd() * 3, 0]);
    }
    m.point(o[0], o[1], o[2], 110, cc, 0.18, true);
  });

  /* ---------- planes (sheet 10, piece 17) ---------- */
  // 17-01: five square grid planes stacked through the mark, turned to diamonds and seen from above
  A.register('s10-strata', function (m, ctx) {
    var wa = ctx.light('a'), cc = ctx.light('c'), h = 150, tilt = 0.52, z = -190, ox = 60, rot = [tilt, Math.PI / 4, 0], lit = 1 + Math.floor(ctx.rnd() * 3);
    function at(u, v, y) { return plus(turn([u, 0, v], rot), [ox, y, z]); }
    var corners = [[-h, -h], [h, -h], [h, h], [-h, h]];
    for (var i = 0; i < 5; i++) {
      var y = -252 + i * 126, isLit = i === lit, col = isLit ? cc : wa;
      for (var g = -2; g <= 2; g++) {
        var a = g * h / 2, edgeLine = Math.abs(g) === 2, al = edgeLine ? 0.5 : 0.16;
        m.line(flat([at(a, -h, y), at(a, h, y)]), col, isLit ? al + 0.15 : al);
        m.line(flat([at(-h, a, y), at(h, a, y)]), col, isLit ? al + 0.15 : al);
      }
      corners.forEach(function (c) { var p = at(c[0], c[1], y); node(m, p, col, 3.2, 3.5); });
      if (isLit) {
        var mid = at(0, 0, y);
        m.bar(mid[0], mid[1], mid[2], 2 * h, 1.5, 2 * h, cc, 0.1, rot);
        m.point(mid[0], mid[1], mid[2], 160, cc, 0.18, true);
      }
      if (i < 4) corners.forEach(function (c) {
        for (var s = 8; s < 126; s += 9) { var p = at(c[0], c[1], y + s); m.point(p[0], p[1], p[2], 1.6, wa, 0.35); }
      });
    }
  });

  /* ---------- topology (sheet 10, piece 20) ---------- */
  // 20-02: a geodesic sphere: an icosahedron split twice, its edges as thin lines, nodes at its vertices
  A.register('s10-geodesic', function (m, ctx) {
    var wa = ctx.light('a'), cc = ctx.light('c'), R = 268, o = [30, 0, -70], t0 = (1 + Math.sqrt(5)) / 2;
    var V = [[-1, t0, 0], [1, t0, 0], [-1, -t0, 0], [1, -t0, 0], [0, -1, t0], [0, 1, t0], [0, -1, -t0], [0, 1, -t0], [t0, 0, -1], [t0, 0, 1], [-t0, 0, -1], [-t0, 0, 1]].map(unit);
    var F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    for (var sub = 0; sub < 2; sub++) {
      var cache = {}, nf = [];
      var midOf = function (a, b) {
        var key = a < b ? a + '_' + b : b + '_' + a;
        if (cache[key] == null) { V.push(unit(mix(V[a], V[b], 0.5))); cache[key] = V.length - 1; }
        return cache[key];
      };
      F.forEach(function (f) { var a = midOf(f[0], f[1]), b = midOf(f[1], f[2]), c = midOf(f[2], f[0]); nf.push([f[0], a, c], [f[1], b, a], [f[2], c, b], [a, b, c]); });
      F = nf;
    }
    var rot = [0.3 + ctx.rnd() * 0.3, ctx.rnd() * 1.2, 0.2 * ctx.rnd()];
    var P = V.map(function (v) { return plus(turn([v[0] * R, v[1] * R, v[2] * R], rot), o); });
    var done = {};
    F.forEach(function (f) {
      [[f[0], f[1]], [f[1], f[2]], [f[2], f[0]]].forEach(function (e) {
        var key = Math.min(e[0], e[1]) + '_' + Math.max(e[0], e[1]);
        if (done[key]) return;
        done[key] = 1;
        var a = P[e[0]], b = P[e[1]], front = ((a[2] + b[2]) / 2 - o[2]) / R;
        m.line([a[0], a[1], a[2], b[0], b[1], b[2]], wa, 0.08 + 0.2 * (front + 1) / 2);
      });
    });
    P.forEach(function (p) { var front = (p[2] - o[2]) / R; m.point(p[0], p[1], p[2], 2.2, wa, 0.3 + 0.55 * (front + 1) / 2); });
    for (var k = 0; k < 7; k++) { var q = P[Math.floor(ctx.rnd() * P.length)]; if (inView(ctx, q, 10)) node(m, q, cc, 4.4, 5); }
  });

  // 20-03: a honeycomb bent round the inside of a cylinder far behind, nodes at the corners
  A.register('s10-hex-shell', function (m, ctx) {
    var wa = ctx.light('a'), cc = ctx.light('c'), Rc = 560, zc = Rc - 330, r = 30, dx = shiftAt(ctx, -300) * 0.9;
    function at(s, y) { var f = s / Rc; return [dx + Rc * Math.sin(f), y, zc - Rc * Math.cos(f)]; }
    var lit = {};
    for (var l = 0; l < 6; l++) lit[Math.floor(ctx.rnd() * 15) + '_' + Math.floor(ctx.rnd() * 14)] = 1;
    for (var ci = 0; ci < 16; ci++) for (var ri = 0; ri < 14; ri++) {
      var s0 = -345 + ci * 1.5 * r, y0 = -350 + ri * Math.sqrt(3) * r + (ci % 2 ? Math.sqrt(3) * r / 2 : 0);
      var c = at(s0, y0);
      if (!inView(ctx, c, 24)) continue;
      var pts = [], acc = lit[ci + '_' + ri];
      for (var k = 0; k < 6; k++) { var a = k / 6 * TAU, p = at(s0 + r * Math.cos(a), y0 + r * Math.sin(a)); pts.push(p); if (k < 3) m.point(p[0], p[1], p[2], 1.8, acc ? cc : wa, acc ? 0.8 : 0.4); }
      m.line(flat(pts), acc ? cc : wa, acc ? 0.6 : 0.14, true);
      if (acc) m.point(c[0], c[1], c[2], 50, cc, 0.22, true);
    }
  });

  /* ---------- bridges (sheet 10, piece 21) ---------- */
  // 21-01 and 21-02: two arches over the mark, hangers down to a deck, a mast with rings above the crown
  A.register('s10-arch', function (m, ctx) {
    var wa = ctx.light('a'), cc = ctx.light('c'), x0 = -226, x1 = 300, deck = -248, top = 262 + ctx.rnd() * 14;
    var arches = [{ z: -30, dx: 0, c: wa, a: 0.85 }, { z: -120, dx: 44, c: cc, a: 0.9 }];
    arches.forEach(function (ar, n) {
      var pts = [], cx = (x0 + x1) / 2;
      for (var i = 0; i <= 120; i++) { var u = i / 120, x = x0 + (x1 - x0) * u; pts.push([x + ar.dx, deck + (top - deck) * (1 - Math.pow(2 * u - 1, 2)), ar.z]); }
      m.line(flat(pts), ar.c, ar.a);
      m.line(flat(pts.map(function (p) { return [p[0], p[1] - 7, p[2]]; })), ar.c, ar.a * 0.35);
      m.line([x0 + ar.dx, deck, ar.z, x1 + ar.dx, deck, ar.z], wa, 0.35);
      for (var h = 6; h < 120; h += 6) { var p = pts[h]; m.line([p[0], p[1] - 7, p[2], p[0], deck, p[2]], ar.c, n ? 0.16 : 0.22); }
      [pts[0], pts[120]].forEach(function (f) { node(m, f, n ? cc : wa, 5, 4); hoop(m, f, 9, n ? cc : wa, 0.7); });
      var crown = pts[60];
      node(m, crown, n ? cc : wa, n ? 6 : 4.5, 5);
      if (n === 0) {
        m.line([crown[0], crown[1], crown[2], crown[0], 334, crown[2]], wa, 0.5);
        hoop(m, [crown[0], crown[1] + 30, crown[2]], 7, wa, 0.8); hoop(m, [crown[0], crown[1] + 58, crown[2]], 4.5, wa, 0.7);
        m.point(crown[0], 330, crown[2], 3, wa, 1);
      }
    });
    for (var t = 0; t <= 8; t++) { var x = x0 + (x1 - x0) * t / 8; m.line([x, deck, -30, x + 42, deck, -120], wa, 0.18); }
  });

  // 21-03: a cable-stayed mast far behind: cables fan from its top down to a deck, a diamond at each anchor
  A.register('s10-fan', function (m, ctx) {
    var wa = ctx.light('a'), cc = ctx.light('c'), z = -200, dx = shiftAt(ctx, z), mx = 40 + dx, deck = -250, n = 7;
    m.line([mx, -300, z, mx, 330, z], wa, 0.7); m.quad(mx, -300, z - 1, 0, 7, 630, wa, 0.1, 'peak');
    m.line([-210 + dx, deck, z, 290 + dx, deck, z], wa, 0.35);
    for (var i = 0; i < n; i++) {
      var y = 300 - i * 22;
      [[-210 + dx + i * 30, -1], [290 + dx - i * 34, 1]].forEach(function (an) {
        var acc = i === 0 || i === 3;
        m.line([mx, y, z, an[0], deck, z], acc ? cc : wa, acc ? 0.65 : 0.34);
        m.cube(an[0], deck, z, 7, 7, 4, acc ? ctx.tone('c', 0.95) : ctx.tone('a', 0.9), [0, 0, Math.PI / 4]);
        if (acc) m.point(an[0], deck, z, 26, cc, 0.35, true);
      });
    }
    hoop(m, [mx, 318, z], 8, wa, 0.8); hoop(m, [mx, 292, z], 6, cc, 0.8);
    m.point(mx, 330, z, 60, cc, 0.3, true);
  });

  /* ---------- network grids (sheet 10, piece 22) ---------- */
  // 22-01: a three-dimensional lattice of nodes and edges far behind, turned to show its depth
  A.register('s10-lattice', function (m, ctx) {
    var wa = ctx.light('a'), cc = ctx.light('c'), z = -250, o = [shiftAt(ctx, z) + 36, 10, z], sp = 92, nx = 5, ny = 4, nz = 5;
    var rot = [0.42 + ctx.rnd() * 0.08, Math.PI / 4 + (ctx.rnd() - 0.5) * 0.2, 0];
    function P(i, j, k) { return plus(turn([(i - (nx - 1) / 2) * sp, (j - (ny - 1) / 2) * sp, (k - (nz - 1) / 2) * sp], rot), o); }
    var i, j, k;
    for (j = 0; j < ny; j++) for (k = 0; k < nz; k++) { var a = []; for (i = 0; i < nx; i++) a.push(P(i, j, k)); m.line(flat(a), wa, 0.22); }
    for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) { var b = []; for (k = 0; k < nz; k++) b.push(P(i, j, k)); m.line(flat(b), wa, 0.22); }
    for (i = 0; i < nx; i++) for (k = 0; k < nz; k++) { var c = []; for (j = 0; j < ny; j++) c.push(P(i, j, k)); m.line(flat(c), wa, 0.15); }
    for (i = 0; i < nx; i++) for (j = 0; j < ny; j++) for (k = 0; k < nz; k++) {
      var p = P(i, j, k);
      if (!inView(ctx, p, 2)) continue;
      if (ctx.rnd() < 0.08) node(m, p, cc, 4.2, 5); else m.point(p[0], p[1], p[2], 3.2, wa, 0.9);
    }
    var top = P(2, ny - 1, 2);
    m.point(top[0], top[1], top[2], 120, cc, 0.14, true);
  });

  // 22-03: three thin masts with square nodes at different heights and a dotted ring linking them
  A.register('s10-masts', function (m, ctx) {
    var wa = ctx.light('a'), cc = ctx.light('c'), z = -90;
    var masts = [[-204, -300, 290], [12 + (ctx.rnd() - 0.5) * 40, -330, 330], [292, -250, 200]];
    var nodes = [];
    masts.forEach(function (ms, i) {
      var x = ms[0];
      m.line([x, ms[1], z, x, ms[2], z], wa, 0.8); m.quad(x, ms[1], z - 1, 0, 8, ms[2] - ms[1], wa, 0.14, 'peak');
      var n = 2 + Math.floor(ctx.rnd() * 2);
      for (var k = 0; k < n; k++) {
        var y = ms[1] + (k + 0.5 + (ctx.rnd() - 0.5) * 0.6) * (ms[2] - ms[1]) / n, acc = i === 1 && k === 0;
        if (acc) { m.cube(x, y, z, 10, 10, 10, ctx.tone('c', 0.95)); m.point(x, y, z, 50, cc, 0.4, true); }
        else if (k % 2) hoop(m, [x, y, z], 7, wa, 0.8);
        else m.cube(x, y, z, 8, 8, 8, ctx.tone('a', 0.92));
        nodes.push([x, y, z]);
      }
    });
    var ring = ctx.ring(250, 160, 0.22, 0, 38, -20 + (ctx.rnd() - 0.5) * 40, z);
    for (var r = 0; r < ring.length; r += 6) m.point(ring[r], ring[r + 1], ring[r + 2], 2.4, wa, 0.7);
    for (var l = 0; l < 3; l++) {
      var a = nodes[Math.floor(ctx.rnd() * nodes.length)], b = nodes[Math.floor(ctx.rnd() * nodes.length)];
      if (a[0] !== b[0]) m.line([a[0], a[1], a[2], b[0], b[1], b[2]], wa, 0.16);
    }
  });

  /* ---------- identity (sheet 10, piece 25) ---------- */
  // 25-02: a large fingerprint of dotted loops far behind the mark, each loop broken once or twice
  A.register('s10-print', function (m, ctx) {
    var cc = ctx.light('c'), wa = ctx.light('a'), z = -210, o = [shiftAt(ctx, z) + 40, 6, z], ph = ctx.rnd() * TAU;
    for (var k = 0; k < 21; k++) {
      var rx = 14 + k * 13.6, ry = rx * 1.2, open = k < 14, a0 = open ? -0.32 * Math.PI : 0, a1 = open ? 1.32 * Math.PI : TAU;
      var gaps = [], ng = 1 + (ctx.rnd() < 0.4 ? 1 : 0);
      for (var g = 0; g < ng; g++) { var gs = a0 + ctx.rnd() * (a1 - a0); gaps.push([gs, gs + 0.08 + ctx.rnd() * 0.22]); }
      var steps = Math.max(10, Math.round((a1 - a0) * (rx + ry) / 2 / 5.2)), al = 0.8 - k * 0.024;
      for (var i = 0; i <= steps; i++) {
        var t = a1 - (a1 - a0) * i / steps;
        if (gaps.some(function (gg) { return t > gg[0] && t < gg[1]; })) continue;
        var wob = 1 + 0.045 * Math.sin(3 * t + k * 0.5 + ph) + 0.02 * Math.sin(7 * t - k + ph);
        var x = o[0] + rx * wob * Math.cos(t), y = o[1] - ry * wob * Math.sin(t) * (open && Math.sin(t) < 0 ? 0.55 : 1);
        if (!inView(ctx, [x, y, z], 2)) continue;
        m.point(x, y, z + (ctx.rnd() - 0.5) * 6, 2.2, k < 3 ? wa : cc, al * (0.7 + ctx.rnd() * 0.3));
      }
    }
    m.point(o[0], o[1], z, 130, cc, 0.16, true);
  });

  /* ---------- background motifs (sheet 10, piece 30) ---------- */
  // 30-01: two or three large soft pools of accent light far behind, with a faint dust round them
  A.register('s10-glow', function (m, ctx) {
    var cc = ctx.light('c'), wa = ctx.light('a'), z = -260, dx = shiftAt(ctx, z);
    var spots = [[-130 + ctx.rnd() * 50, 150 + ctx.rnd() * 90, 1], [190 + ctx.rnd() * 60, -150 - ctx.rnd() * 70, 1.1]];
    if (ctx.rnd() < 0.5) spots.push([40 + ctx.rnd() * 60, 10 + ctx.rnd() * 40, 0.6]);
    spots.forEach(function (s) {
      var x = s[0] + dx, y = s[1], k = s[2];
      m.point(x, y, z, 520 * k, cc, 0.16, true); m.point(x, y, z, 250 * k, cc, 0.22, true); m.point(x, y, z, 90 * k, cc, 0.18, true);
      for (var i = 0; i < 140 * k; i++) {
        var p = [x + gauss(ctx) * 110 * k, y + gauss(ctx) * 110 * k, z + gauss(ctx) * 40];
        if (inView(ctx, p, 2)) m.point(p[0], p[1], p[2], 1 + ctx.rnd() * 1.4, ctx.rnd() < 0.5 ? cc : wa, 0.12 + ctx.rnd() * 0.3);
      }
    });
  });

  // 30-03: a grid of thin accent lines bent over the inside of a sphere far behind
  A.register('s10-warp', function (m, ctx) {
    var cc = ctx.light('c'), R = 600, zc = R - 380, A0 = 0.6, n = 14, dx = shiftAt(ctx, -340) * 0.85 + 36;
    function at(u, v) { return [dx + R * Math.cos(v) * Math.sin(u), R * 1.05 * Math.sin(v), zc - R * Math.cos(v) * Math.cos(u)]; }
    for (var i = 0; i <= n; i++) {
      var a = -A0 + 2 * A0 * i / n, centre = i === n / 2, U = [], Vl = [];
      for (var j = 0; j <= 48; j++) { var b = -A0 + 2 * A0 * j / 48; U.push(at(a, b)); Vl.push(at(b, a)); }
      var al = centre ? 0.42 : 0.15 + 0.14 * (1 - Math.abs(i - n / 2) / (n / 2));
      m.line(flat(U), cc, al); m.line(flat(Vl), cc, al);
      for (var k = 0; k <= n; k += 2) if (i % 2 === 0) { var p = at(a, -A0 + 2 * A0 * k / n); m.point(p[0], p[1], p[2], 2, cc, 0.4); }
    }
    var mid = at(0, 0);
    m.point(mid[0], mid[1], mid[2], 260, cc, 0.08, true);
  });

  /* ---------- the mark (sheet 10, piece 20: topology) ---------- */
  // the mark as contour lines: blocks only where the distance from its edge crosses a step, and each
  // step a terrace nearer the viewer, so the mark reads as a contour map of itself
  A.register('s10-mark-contour', function (m, ctx) {
    var g = ctx.markGrid(ctx.num('rows', 84)), dist = {}, queue = [], every = ctx.num('every', 3), bb = ctx.light('b');
    for (var r = 0; r < g.R; r++) for (var c = 0; c < g.C; c++) if (g.cov(r, c) >= 0.5 && g.edge(r, c)) { dist[r + ',' + c] = 1; queue.push([r, c]); }
    for (var h = 0; h < queue.length; h++) {
      var p = queue[h], d = dist[p[0] + ',' + p[1]];
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (s) {
        var rr = p[0] + s[0], cc = p[1] + s[1], k = rr + ',' + cc;
        if (g.cov(rr, cc) >= 0.5 && !(k in dist)) { dist[k] = d + 1; queue.push([rr, cc]); }
      });
    }
    var s = g.cell * 0.86;
    Object.keys(dist).forEach(function (key) {
      var rc = key.split(','), r = +rc[0], c = +rc[1];
      if (!g.ok(r, c)) return;
      var d = dist[key], level = Math.floor((d - 1) / every), x = g.x(c), y = g.y(r);
      if ((d - 1) % every === 0) {
        var depth = g.cell * (1.4 + level * 0.25), z = level * g.cell * 1.5;
        m.cube(x, y, z + depth / 2, s, s, depth, ctx.tone('a', d === 1 ? 0.84 + ctx.rnd() * 0.12 : Math.min(0.78, 0.42 + level * 0.09 + ctx.rnd() * 0.06)));
        ctx.cells.push({ x: x, y: y, z: z + depth, s: g.cell });
      } else if (ctx.rnd() < 0.1) {
        m.cube(x, y, level * g.cell * 1.5 + g.cell * 0.2, s * 0.5, s * 0.5, g.cell * 0.4, ctx.tone('a', 0.24 + ctx.rnd() * 0.08));
      }
    });
    // a few thin streaks off the top and bottom edges, as the other marks have
    for (var col = 0; col < g.C; col += 2) {
      var top = -1, bot = -1;
      for (var rr = 0; rr < g.R; rr++) if (g.cov(rr, col) >= 0.5) { if (top < 0) top = rr; bot = rr; }
      if (top < 0 || ctx.rnd() > 0.16) continue;
      if (ctx.rnd() < 0.5) m.quad(g.x(col), g.y(top) + g.cell / 2, 0, 0, 1 + ctx.rnd(), 40 + ctx.rnd() * 160, bb, 0.2 + ctx.rnd() * 0.3, 'fade');
      else m.quad(g.x(col), g.y(bot) - g.cell / 2, 0, Math.PI, 1 + ctx.rnd(), 40 + ctx.rnd() * 160, bb, 0.2 + ctx.rnd() * 0.3, 'fade');
    }
  });
})();

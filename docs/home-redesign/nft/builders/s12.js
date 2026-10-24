/* DEFXN identity card: builders from reference sheet 12 (3D glass, line and particle objects: rings
   with nodes, plate stacks, a dotted globe, network webs, glass towers and cube clusters, segmented
   rings, crystal bars, a funnel of rings, crossing loops, a halftone ring). Each builder is named by
   an element file under layers/<NN-key>/sheet-12/. The space and the m / ctx calls are described at
   the top of art3d.js. Every random value comes from ctx.rnd(), so the same card always draws the
   same art.

   Colour: white parts use ctx.tone('a', v) or ctx.light('a'); the sheet's cyan and amber accents use
   ctx.light('c'), and its pale light ctx.light('b').

   Placement: the mark spans x -200..200 and y -273..273. Big shapes sit behind it (z < 0); in front
   go only thin lines, points and small glass, so the mark is never buried. Far shapes are placed by
   where they are SEEN (seenAt below): the card's rest tilt carries a point 200 units behind about 80
   units to the left, so a far shape placed at x 0 would sit off the mark's centre. */
(function () {
  'use strict';
  var A = window.Art3D, TAU = Math.PI * 2;

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
  // the art-space x and y at depth z that the card shows at (xs, ys): the inverse of Art3D.seen
  function seenAt(xs, ys, z) {
    var x = xs, y = ys;
    for (var i = 0; i < 5; i++) { var p = A.seen(x, y, z); x += xs - p[0]; y += ys - p[1]; }
    return [x, y];
  }
  // true when a point is seen inside the art's box (x -240..320, y -340..340), `pad` units in
  function inView(p, pad) {
    var s = A.seen(p[0], p[1], p[2]); pad = pad || 0;
    return s[0] > -240 + pad && s[0] < 320 - pad && s[1] > -340 + pad && s[1] < 340 - pad;
  }
  function gauss(rnd) { return rnd() + rnd() + rnd() - 1.5; }
  function lerp(p, q, t) { return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t]; }
  function seg(m, a, b, rgb, alpha) { m.line([a[0], a[1], a[2], b[0], b[1], b[2]], rgb, alpha); }
  function node(m, p, rgb, size, glow) {           // a hard dot with a soft glow round it
    m.point(p[0], p[1], p[2], size, rgb, 1);
    m.point(p[0], p[1], p[2], size * (glow || 4.5), rgb, 0.35, true);
  }
  function flat(pts) { var o = []; pts.forEach(function (p) { o.push(p[0], p[1], p[2]); }); return o; }
  // a line through [x,y,z, ...] drawn only where it is seen clear of the genesis ID and the serial and
  // inside the art's box: it breaks into runs there instead of crossing the words
  function clipLine(m, ctx, p, rgb, alpha, closed, pad) {
    var n = p.length / 3, run = [], total = n + (closed ? 1 : 0);
    for (var i = 0; i < total; i++) {
      var k = (i % n) * 3, q = [p[k], p[k + 1], p[k + 2]];
      if (ctx.clearAt(q[0], q[1], q[2], pad == null ? 8 : pad) && inView(q, 0)) run.push(q[0], q[1], q[2]);
      else { if (run.length >= 6) m.line(run, rgb, alpha); run = []; }
    }
    if (run.length >= 6) m.line(run, rgb, alpha);
  }
  // a straight line from a to b, cut the same way
  function clipSeg(m, ctx, a, b, rgb, alpha) {
    var n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 10)), p = [];
    for (var i = 0; i <= n; i++) { var q = lerp(a, b, i / n); p.push(q[0], q[1], q[2]); }
    clipLine(m, ctx, p, rgb, alpha, false);
  }
  // the 12 edges of a box through a placing function P(u, v, w): a wire box with no glass faces
  function wireBox(m, P, c, s, rgb, alpha) {
    var v = [];
    for (var i = 0; i < 8; i++) v.push(P(c[0] + (i & 1 ? 0.5 : -0.5) * s[0], c[1] + (i & 2 ? 0.5 : -0.5) * s[1], c[2] + (i & 4 ? 0.5 : -0.5) * s[2]));
    [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(function (e) { seg(m, v[e[0]], v[e[1]], rgb, alpha); });
    return v;
  }
  // a vertical streak of light that stays on the card: up (dir 1) or down (dir -1) from y
  function thread(m, x, y, z, dir, len, w, rgb, alpha, mode, segs) {
    len = Math.min(len, dir > 0 ? 338 - y : y + 338);
    if (len > 8) m.quad(x, y, z, dir > 0 ? 0 : Math.PI, w, len, rgb, alpha, mode || 'fade', segs);
  }

  /* ================= 01-backdrop: far behind the mark ================= */

  // provenance 03: a record rail far behind, at the right of the mark: a vertical line with hollow
  // ring nodes (one in the accent), each node the end of a row of dots and dashes that runs left
  // behind the mark, with fainter rows between them.
  A.register('s12-record-rail', function (m, ctx) {
    var ca = ctx.tone('a', 0.9), cb = ctx.light('b'), cc = ctx.light('c'), z = -190, xs = 236 + ctx.rnd() * 22;
    function at(sx, sy) { var p = seenAt(sx, sy, z); return [p[0], p[1], z]; }
    function row(sy, from, to, faint) {
      var sx = from;
      while (sx > to) {
        if (ctx.rnd() < 0.16) { sx -= 10 + ctx.rnd() * 26; continue; }
        var p = at(sx, sy);
        if (!faint && ctx.rnd() < 0.12) {
          var l = 10 + ctx.rnd() * 20, q = at(sx - l, sy);
          seg(m, p, q, cb, 0.5); sx -= l + 6; continue;
        }
        m.point(p[0], p[1], z, faint ? 1.6 : 1.8 + ctx.rnd() * 1.8, ca, faint ? 0.16 + ctx.rnd() * 0.2 : 0.35 + ctx.rnd() * 0.55);
        sx -= 6 + ctx.rnd() * 4;
      }
    }
    seg(m, at(xs, 222), at(xs, -250), ca, 0.45);
    var n = 7, accent = Math.floor(ctx.rnd() * n), step = 446 / (n - 1);
    for (var k = 0; k < n; k++) {
      var sy = -232 + k * step, c = at(xs, sy);
      m.line(ctx.ring(7, 24, Math.PI / 2, 0, c[0], c[1], c[2]), k === accent ? cc : ca, 0.95, true);
      if (k === accent) m.point(c[0], c[1], z, 46, cc, 0.4, true);
      row(sy, xs - 16, -232 + ctx.rnd() * 60, false);
      for (var j = 0; j < 3; j++) { var t = at(xs + 18 + j * 12, sy); m.point(t[0], t[1], z, 2, ca, 0.6); }
      if (k < n - 1) row(sy + step / 2, xs - 30, -60 + ctx.rnd() * 140, true);
    }
  });

  // identity 03: an isometric wire cube cut 3 x 3 x 3, its nodes at the crossings, and a 3D cross of
  // glass cubes in it (the centre cell and its six neighbours) with accent cores; a dotted axis
  // runs on above and below.
  A.register('s12-voxel-cross', function (m, ctx) {
    var ca = ctx.tone('a', 0.95), cb = ctx.light('b'), cc = ctx.light('c'), z0 = -250;
    var tx = 0.6 + (ctx.rnd() - 0.5) * 0.1, ty = Math.PI / 4 + (ctx.rnd() - 0.5) * 0.16, M = mul(rx(tx), ry(ty)), rot = [tx, ty, 0];
    var o = seenAt(36, 10, z0), L = 372, h = L / 2, s3 = L / 3, i, j, k;
    function P(u, v, w) { var q = app(M, [u, v, w]); return [o[0] + q[0], o[1] + q[1], z0 + q[2]]; }
    for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) {
      var a = -h + i * s3, b = -h + j * s3, outer = (i === 0 || i === 3) && (j === 0 || j === 3), al = outer ? 0.42 : 0.15;
      seg(m, P(-h, a, b), P(h, a, b), cb, al); seg(m, P(a, -h, b), P(a, h, b), cb, al); seg(m, P(a, b, -h), P(a, b, h), cb, al);
    }
    var yTop = -1e9, yBot = 1e9;
    for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) for (k = 0; k < 4; k++) {
      var edge = [i, j, k].filter(function (v) { return v === 0 || v === 3; }).length, q = P(-h + i * s3, -h + j * s3, -h + k * s3);
      m.point(q[0], q[1], q[2], edge >= 2 ? 2.8 : 2, ca, edge >= 2 ? 0.85 : 0.3);
      yTop = Math.max(yTop, q[1]); yBot = Math.min(yBot, q[1]);
    }
    [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].forEach(function (d, n) {
      var q = P(d[0] * s3, d[1] * s3, d[2] * s3), s = s3 * 0.8;
      m.glass(q[0], q[1], q[2], s, s, s, ca, 0.85, rot);
      m.cube(q[0], q[1], q[2], s * 0.24, s * 0.24, s * 0.24, ctx.tone('c', 0.92), rot);
      m.point(q[0], q[1], q[2], s * (n ? 1.4 : 2.4), cc, n ? 0.22 : 0.5, true);
    });
    for (var y = yTop + 14; y < 336; y += 10) m.point(o[0], y, z0, 2, ca, 0.6);
    for (var y2 = yBot - 14; y2 > -336; y2 -= 10) m.point(o[0], y2, z0, 2, ca, 0.6);
  });

  // network state 01: a dotted globe drawn in rows of latitude. Land is where a few random waves
  // over the sphere add up high: bright dots there, sparse faint dots over the sea. Only the near
  // half is drawn, inside a thin rim, a little larger than the mark so its edge shows round it.
  A.register('s12-globe', function (m, ctx) {
    var ca = ctx.tone('a', 0.95), cb = ctx.light('b'), cc = ctx.light('c'), z0 = -230, R = 330;
    var o = seenAt(24, 0, z0), M = mul(rx(0.36 + ctx.rnd() * 0.12), ry(ctx.rnd() * TAU)), waves = [];
    for (var w = 0; w < 6; w++) {
      var u = ctx.rnd() * 2 - 1, t = ctx.rnd() * TAU, s = Math.sqrt(1 - u * u);
      waves.push({ d: [s * Math.cos(t), u, s * Math.sin(t)], f: 1.6 + ctx.rnd() * 2.4, ph: ctx.rnd() * TAU });
    }
    function land(p) {
      var sum = 0;
      waves.forEach(function (v) { sum += Math.sin((p[0] * v.d[0] + p[1] * v.d[1] + p[2] * v.d[2]) * v.f * 2.2 + v.ph); });
      return sum / Math.sqrt(waves.length);
    }
    for (var lat = -84; lat <= 84; lat += 3.2) {
      var phi = lat * Math.PI / 180, cr = Math.cos(phi), n = Math.max(6, Math.round(118 * cr));
      for (var i = 0; i < n; i++) {
        var th = i / n * TAU + lat * 0.37, p = [cr * Math.cos(th), Math.sin(phi), cr * Math.sin(th)], q = app(M, p);
        if (q[2] < -0.06) continue;
        var x = o[0] + q[0] * R, y = o[1] + q[1] * R, z = z0 + q[2] * R;
        if (!ctx.clearAt(x, y, z, 6)) continue;
        var isLand = land(p) > 0.3, rim = 1 - q[2];
        if (!isLand && ctx.rnd() > 0.4) continue;
        var a = isLand ? 0.62 + 0.36 * Math.min(1, 0.3 + q[2]) : 0.14 + 0.16 * rim;
        m.point(x, y, z, isLand ? 2.6 + ctx.rnd() * 1.1 : 1.7, isLand && ctx.rnd() < 0.05 ? cc : ca, a);
      }
    }
    clipLine(m, ctx, ctx.ring(R, 200, Math.PI / 2, 0, o[0], o[1], z0), cb, 0.34, true);
    for (var g = 0; g < 8; g++) {
      var v = app(M, [ctx.rnd() - 0.5, ctx.rnd() - 0.5, 0.6]), nv = Math.hypot(v[0], v[1], v[2]);
      if (v[2] / nv < 0.3) continue;
      m.point(o[0] + v[0] / nv * R, o[1] + v[1] / nv * R, z0 + v[2] / nv * R, 26, cc, 0.34, true);
    }
  });

  // ownership 03: a row of tall glass slabs, like blades in a rack, running from near-left to
  // far-right behind the mark, tall enough to stand out above and below it. One or two glow inside.
  A.register('s12-blades', function (m, ctx) {
    var ca = ctx.tone('a', 0.95), cb = ctx.light('b'), cc = ctx.light('c'), n = 8 + Math.floor(ctx.rnd() * 2);
    var yaw = -0.6 + (ctx.rnd() - 0.5) * 0.15, rot = [0, yaw, 0], d = [0.92, 0.1, -0.38], dn = Math.hypot(d[0], d[1], d[2]);
    d = [d[0] / dn, d[1] / dn, d[2] / dn];
    var zc = -220, c0 = seenAt(60, -14, zc), step = 54, hero = Math.floor(ctx.rnd() * n), Y = ry(yaw);
    for (var k = 0; k < n; k++) {
      var t = (k - (n - 1) / 2) * step, c = [c0[0] + d[0] * t, c0[1] + d[1] * t, zc + d[2] * t];
      var h = 520 + ctx.rnd() * 140 + (k === hero ? 60 : 0), dp = 90 + ctx.rnd() * 40, bright = k === hero || ctx.rnd() < 0.3;
      // keep each slab's ends clear of the genesis ID and the serial, and on the card
      while (h > 160 && (!ctx.clearAt(c[0], c[1] + h / 2, c[2], 14) || !ctx.clearAt(c[0], c[1] - h / 2, c[2], 14) || !inView([c[0], c[1] + h / 2, c[2]], 4) || !inView([c[0], c[1] - h / 2, c[2]], 4))) h *= 0.94;
      m.glass(c[0], c[1], c[2], 10, h, dp, bright ? ca : cb, bright ? 0.95 : 0.6, rot);
      if (bright) { m.glass(c[0], c[1], c[2], 5, h * 0.84, dp * 0.8, ca, 0.5, rot); m.bar(c[0], c[1], c[2], 6, h * 0.96, dp * 0.94, cb, 0.05, rot); }
      [1, -1].forEach(function (sgn) { var e = app(Y, [0, sgn * h / 2, dp / 2]); m.point(c[0] + e[0], c[1] + e[1], c[2] + e[2], 3, ca, 0.9); });
      if (k === hero) m.point(c[0], c[1], c[2], 150, cc, 0.16, true);
      thread(m, c[0], c[1] + h / 2, c[2], 1, 30 + ctx.rnd() * 70, 1.2, cb, 0.3);
    }
  });

  // compute 01: overlapping wire boxes of many proportions on one isometric grid, spread round the
  // mark, nodes at some of their corners, a lit edge on a few, and one small bright glass cube.
  A.register('s12-cuboids', function (m, ctx) {
    var ca = ctx.tone('a', 0.95), cb = ctx.light('b'), cc = ctx.light('c'), z0 = -230;
    var tx = 0.5 + ctx.rnd() * 0.12, ty = 0.7 + ctx.rnd() * 0.2, M = mul(rx(tx), ry(ty)), rot = [tx, ty, 0];
    var o = seenAt(50, 0, z0), U = 62, up = app(M, [0, 1, 0]), placed = 0, tries = 0, want = 8 + Math.floor(ctx.rnd() * 3);
    function P(u, v, w) { var q = app(M, [u, v, w]); return [o[0] + q[0], o[1] + q[1], z0 + q[2]]; }
    while (placed < want && tries++ < 60) {
      var sx = U * (1 + Math.floor(ctx.rnd() * 3)), sy = U * (2 + Math.floor(ctx.rnd() * 4)), sz = U * (1 + Math.floor(ctx.rnd() * 3));
      var cx = U * (Math.floor(ctx.rnd() * 6) - 2.5), cy = U * (Math.floor(ctx.rnd() * 5) - 2) * 0.9, cz = U * (Math.floor(ctx.rnd() * 6) - 2.5);
      var corners = [];
      for (var j = 0; j < 8; j++) corners.push(P(cx + (j & 1 ? 1 : -1) * sx / 2, cy + (j & 2 ? 1 : -1) * sy / 2, cz + (j & 4 ? 1 : -1) * sz / 2));
      if (!corners.every(function (q) { return inView(q, 6) && ctx.clearAt(q[0], q[1], q[2], 10); })) continue;
      placed++;
      wireBox(m, P, [cx, cy, cz], [sx, sy, sz], placed % 3 ? cb : ca, 0.42 + ctx.rnd() * 0.25);
      corners.forEach(function (q) { if (ctx.rnd() < 0.4) m.point(q[0], q[1], q[2], 2.8, ca, 0.9); });
      if (ctx.rnd() < 0.45) { var e = P(cx + sx / 2, cy - sy / 2, cz + sz / 2); m.rod(e[0], e[1], e[2], up, sy, 2.2, ca, 0.4); }
      if (ctx.rnd() < 0.3) m.glass(corners[0][0] / 2 + corners[7][0] / 2, corners[0][1] / 2 + corners[7][1] / 2, corners[0][2] / 2 + corners[7][2] / 2, sx * 0.96, sy * 0.96, sz * 0.96, cb, 0.15, rot);
    }
    var g = P(-U, -U * 0.5, U);
    m.glass(g[0], g[1], g[2], 38, 38, 38, ca, 1, rot); m.point(g[0], g[1], g[2], 90, cc, 0.32, true);
    for (var i = 0; i < 6; i++) { var s = P(U * (Math.floor(ctx.rnd() * 5) - 2), U * 2.4, U * (Math.floor(ctx.rnd() * 5) - 2)); if (ctx.clearAt(s[0], s[1], s[2], 20)) thread(m, s[0], s[1], s[2], 1, 50 + ctx.rnd() * 110, 1.2, cb, 0.32); }
  });

  // bridge 01 and 02: two clusters of glass cubes and dust, top left and bottom right, joined by a
  // bridge of five dotted strands that swing through an S-curve.
  A.register('s12-twin-cluster', function (m, ctx) {
    var ca = ctx.tone('a', 0.95), cb = ctx.light('b'), cc = ctx.light('c'), z = -200;
    var a = seenAt(-150, 178, z), b = seenAt(238, -150, z);
    [a, b].forEach(function (c) {
      for (var i = 0; i < 30; i++) {
        var p = [c[0] + gauss(ctx.rnd) * 50, c[1] + gauss(ctx.rnd) * 58, z + gauss(ctx.rnd) * 50], s = 7 + ctx.rnd() * 15, rot = [ctx.rnd() * 3, ctx.rnd() * 3, ctx.rnd() * 3];
        if (!ctx.clearAt(p[0], p[1], p[2], 10)) continue;
        if (ctx.rnd() < 0.82) m.glass(p[0], p[1], p[2], s, s, s, ctx.rnd() < 0.3 ? cb : ca, 0.6 + ctx.rnd() * 0.4, rot);
        else m.cube(p[0], p[1], p[2], s * 0.7, s * 0.7, s * 0.7, ctx.tone('a', 0.7 + ctx.rnd() * 0.3), rot);
      }
      for (var j = 0; j < 240; j++) {
        var d = [c[0] + gauss(ctx.rnd) * 80, c[1] + gauss(ctx.rnd) * 86, z + gauss(ctx.rnd) * 60];
        if (ctx.clearAt(d[0], d[1], d[2], 6)) m.point(d[0], d[1], d[2], 1.2 + ctx.rnd() * 1.4, ctx.rnd() < 0.2 ? cb : ca, 0.25 + ctx.rnd() * 0.55);
      }
      m.point(c[0], c[1], z, 170, cb, 0.12, true);
    });
    var P0 = [a[0] + 46, a[1] - 34], P3 = [b[0] - 46, b[1] + 34], C1 = [P0[0] + 230, P0[1] + 40], C2 = [P3[0] - 230, P3[1] - 40];
    function bez(t) {
      var u = 1 - t;
      return [u * u * u * P0[0] + 3 * u * u * t * C1[0] + 3 * u * t * t * C2[0] + t * t * t * P3[0], u * u * u * P0[1] + 3 * u * u * t * C1[1] + 3 * u * t * t * C2[1] + t * t * t * P3[1]];
    }
    for (var s = 0; s < 5; s++) {
      var off = (s - 2) * 7, ph = ctx.rnd() * TAU, line = [];
      for (var k = 0; k <= 220; k++) {
        var t = k / 220, p = bez(t), q = bez(Math.min(1, t + 0.01)), dx = q[0] - p[0], dy = q[1] - p[1], dl = Math.hypot(dx, dy) || 1;
        var o = off * (0.35 + Math.sin(Math.PI * t)) + 5 * Math.sin(t * 9 + ph), x = p[0] - dy / dl * o, y = p[1] + dx / dl * o, zz = z + 18 * Math.sin(t * 6 + s);
        m.point(x, y, zz, 1.4 + ctx.rnd() * 1.3, ctx.rnd() < 0.12 ? cc : ca, 0.35 + 0.6 * Math.sin(Math.PI * t) * (0.5 + 0.5 * ctx.rnd()));
        if (s === 2) line.push(x, y, zz);
      }
      if (s === 2) m.line(line, cb, 0.3);
    }
    for (var c2 = 0; c2 < 5; c2++) { var u2 = 0.2 + ctx.rnd() * 0.6, bp = bez(u2), sz = 6 + ctx.rnd() * 6; m.glass(bp[0], bp[1], z, sz, sz, sz, ca, 0.9, [ctx.rnd() * 3, ctx.rnd() * 3, 0]); }
  });

  // status 02: a ring of dots facing the viewer, in rows like a halftone: the dots swell toward the
  // middle row and shrink toward the inner and outer edge.
  A.register('s12-halftone-halo', function (m, ctx) {
    var ca = ctx.tone('a', 0.95), cc = ctx.light('c'), z = -170, o = seenAt(0, 0, z), r0 = 222, r1 = 348, rows = 13, peak = 0.5 + (ctx.rnd() - 0.5) * 0.2;
    for (var k = 0; k < rows; k++) {
      var u = k / (rows - 1), r = r0 + (r1 - r0) * u, bell = Math.exp(-Math.pow((u - peak) / 0.3, 2)), n = Math.round(r * TAU / 13), off = (k % 2) * 0.5;
      for (var i = 0; i < n; i++) {
        var t = (i + off) / n * TAU, x = o[0] + r * Math.cos(t), y = o[1] + r * Math.sin(t);
        if (!ctx.clearAt(x, y, z, 6) || !inView([x, y, z], 0)) continue;
        m.point(x, y, z, 1.2 + 3.4 * bell, ctx.rnd() < 0.04 ? cc : ca, 0.16 + 0.7 * bell);
      }
    }
  });

  /* ================= 03-aura: structures around the mark ================= */

  // chain structure 01: a coil, a flat spiral of three loops winding out round the mark, drawn as
  // broken dashes with small nodes on it, and a vertical axis of light through its middle.
  A.register('s12-coil', function (m, ctx) {
    var ca = ctx.tone('a', 0.95), cb = ctx.light('b'), cc = ctx.light('c');
    var ax = 0.42 + ctx.rnd() * 0.1, az = -0.42 + (ctx.rnd() - 0.5) * 0.16, ph = ctx.rnd() * TAU, N = 720, z0 = -20, pts = [], i;
    for (i = 0; i <= N; i++) {
      var u = i / N, t = u * 3 * TAU + ph, r = 140 + 172 * u, p = tilt(r * Math.cos(t), (u - 0.5) * 60, r * Math.sin(t), ax, az);
      pts.push([p[0], p[1], p[2] + z0]);
    }
    i = 0;
    while (i < N) {
      var len = 6 + Math.floor(ctx.rnd() * 30), gap = 2 + Math.floor(ctx.rnd() * 5), run = pts.slice(i, Math.min(N, i + len) + 1);
      clipLine(m, ctx, flat(run), ca, run[0][2] > 0 ? 0.8 : 0.5, false);
      i += len + gap;
    }
    for (var j = 0; j < 40; j++) { var q = pts[Math.floor(ctx.rnd() * N)]; if (ctx.clearAt(q[0], q[1], q[2], 8) && inView(q, 4)) m.point(q[0], q[1], q[2], 2.6 + ctx.rnd() * 1.8, ca, 0.95); }
    for (j = 0; j < 5; j++) { var c = pts[Math.floor(ctx.rnd() * N)]; if (ctx.clearAt(c[0], c[1], c[2], 12) && inView(c, 8)) m.cube(c[0], c[1], c[2], 6, 6, 6, ctx.tone('a', 0.95), [ctx.rnd() * 3, ctx.rnd() * 3, 0]); }
    var hot = pts[Math.floor(N * (0.55 + ctx.rnd() * 0.3))];
    if (ctx.clearAt(hot[0], hot[1], hot[2], 16) && inView(hot, 10)) node(m, hot, cc, 7);
    m.line([0, -335, -60, 0, 335, -60], ca, 0.42);
    m.quad(0, -340, -62, 0, 2.4, 680, cb, 0.4, 'peak');
    for (var y = -320; y <= 320; y += 32) m.point(0, y, -60, 2.8, ca, 0.8);
    node(m, [0, 312, -60], ca, 4); node(m, [0, -312, -60], ca, 4);
  });

  // network state 02: a radial web behind the mark, turned a little: spokes from a glowing hub to an
  // inner ring of nodes, an outer ring of nodes round the mark each tied to its two nearest inner
  // ones, a few long rays from the hub, glowing nodes, two in the accent.
  A.register('s12-web', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), z0 = -70, o = seenAt(14, 0, z0);
    var M = mul(ry(0.3 + (ctx.rnd() - 0.5) * 0.2), rx(0.2 + ctx.rnd() * 0.1)), turn = ctx.rnd() * TAU, k;
    function P(r, t) { var q = app(M, [r * Math.cos(t), r * Math.sin(t) * 1.08, 0]); return [o[0] + q[0], o[1] + q[1], z0 + q[2]]; }
    function keep(p) { return inView(p, 10) && ctx.clearAt(p[0], p[1], p[2], 20) ? p : null; }
    function link(p, q, alpha) {
      if (!p || !q) return;
      clipSeg(m, ctx, p, q, cb, alpha);
      if (ctx.rnd() < 0.35) { var d = lerp(p, q, 0.3 + ctx.rnd() * 0.4); if (ctx.clearAt(d[0], d[1], d[2], 8)) m.point(d[0], d[1], d[2], 2.6, ca, 0.9); }
    }
    var hub = P(0, 0), inner = [], outer = [], ni = 6, no = 11;
    for (k = 0; k < ni; k++) inner.push(keep(P(122 + ctx.rnd() * 34, turn + k / ni * TAU + (ctx.rnd() - 0.5) * 0.3)));
    for (k = 0; k < no; k++) outer.push(keep(P(286 + ctx.rnd() * 40, turn + (k + 0.5) / no * TAU + (ctx.rnd() - 0.5) * 0.25)));
    inner.forEach(function (p, i) { link(hub, p, 0.6); link(p, inner[(i + 1) % ni], 0.45); });
    outer.forEach(function (p, i) {
      if (!p) return;
      inner.filter(Boolean).map(function (q) { return [q, Math.hypot(q[0] - p[0], q[1] - p[1])]; })
        .sort(function (x, y) { return x[1] - y[1]; }).slice(0, 2).forEach(function (e) { link(p, e[0], 0.4); });
      if (ctx.rnd() < 0.7) link(p, outer[(i + 1) % no], 0.3);
      if (ctx.rnd() < 0.25) link(hub, p, 0.22);
    });
    var hot = [Math.floor(ctx.rnd() * no), Math.floor(ctx.rnd() * ni)];
    outer.forEach(function (p, i) { if (p) node(m, p, i === hot[0] ? cc : ca, i === hot[0] ? 7 : 5, i === hot[0] ? 7 : 5); });
    inner.forEach(function (p, i) { if (p) node(m, p, i === hot[1] ? cc : ca, 6, i === hot[1] ? 7 : 5); });
    m.point(hub[0], hub[1], hub[2], 11, [1, 1, 1], 1); m.point(hub[0], hub[1], hub[2], 150, cc, 0.4, true);
  });

  // ownership 01: a dais under the mark: a thick disc (a top and a bottom rim joined by short
  // verticals) with rings inside it, a faint glass column rising behind the mark, and light rising
  // from the rim. Its lines break where they would cross the serial.
  A.register('s12-dais', function (m, ctx) {
    var ca = ctx.tone('a', 0.95), cb = ctx.light('b'), cc = ctx.light('c'), ax = 0.3, y0 = -238, R = 282, N = 200, i;
    var top = ctx.ring(R, N, ax, 0, 0, y0, 0), bot = ctx.ring(R, N, ax, 0, 0, y0 - 24, 0);
    clipLine(m, ctx, top, ca, 0.7, true); clipLine(m, ctx, bot, cb, 0.36, true);
    for (i = 0; i < N; i += 5) {
      if (top[i * 3 + 2] < -60) continue;
      clipSeg(m, ctx, [top[i * 3], top[i * 3 + 1], top[i * 3 + 2]], [bot[i * 3], bot[i * 3 + 1], bot[i * 3 + 2]], cb, 0.3);
    }
    for (i = 0; i < N; i += 2) if (ctx.clearAt(top[i * 3], top[i * 3 + 1], top[i * 3 + 2], 8)) m.point(top[i * 3], top[i * 3 + 1], top[i * 3 + 2], 2, ca, 0.7);
    [248, 210, 166, 118].forEach(function (r, k) { clipLine(m, ctx, ctx.ring(r, 160, ax, 0, 0, y0 + 4 + k * 3, 0), k % 2 ? cb : ca, 0.5 - k * 0.06, true); });
    var cr = 60, cz = -80;
    [-1, 1].forEach(function (s) { m.quad(s * cr, y0 + 6, cz, 0, 1.2, 280, cb, 0.3, 'fade'); });
    [y0 + 6, -20].forEach(function (y) { m.line(ctx.ring(cr, 60, ax, 0, 0, y, cz), cb, 0.34, true); });
    for (var k = 0; k < 18; k++) {
      var j = Math.floor(ctx.rnd() * N) * 3;
      if (top[j + 2] < 0 || !ctx.clearAt(top[j], top[j + 1] + 60, top[j + 2], 10)) continue;
      thread(m, top[j], top[j + 1], top[j + 2], 1, 40 + ctx.rnd() * 140, 1.3, cb, 0.4);
    }
    m.point(0, y0, 0, 170, cc, 0.28, true); node(m, [0, y0 + 4, 0], cc, 5);
  });

  // ownership 02: a keystone: two accent glass cubes stacked corner to corner behind the mark, lit
  // from inside, so the mark stands against their glow; a ring round its waist and threads of
  // accent light through it.
  A.register('s12-keystone', function (m, ctx) {
    var ca = ctx.tone('a', 0.95), cc = ctx.light('c'), z0 = -150;
    var o = seenAt((ctx.rnd() - 0.5) * 30, (ctx.rnd() - 0.5) * 40, z0), s = 96 + ctx.rnd() * 16, rot = [0.62, Math.PI / 4, 0];
    [[-0.26, 0.52], [0.26, -0.52]].forEach(function (d) {
      var c = [o[0] + d[0] * s, o[1] + d[1] * s, z0];
      m.glass(c[0], c[1], c[2], s, s, s, cc, 0.95, rot);
      m.glass(c[0], c[1], c[2], s * 0.5, s * 0.5, s * 0.5, cc, 0.6, rot);
      m.point(c[0], c[1], c[2], s * 2.2, cc, 0.18, true); m.point(c[0], c[1], c[2], s * 0.5, cc, 0.45, true);
    });
    m.point(o[0], o[1], z0, 14, [1, 1, 1], 1, true); m.point(o[0], o[1], z0, 260, cc, 0.1, true);
    var pts = ctx.ring(278, 200, 0.2, (ctx.rnd() - 0.5) * 0.1, 0, o[1], -40);
    clipLine(m, ctx, pts, ca, 0.55, true);
    for (var i = 0; i < 8; i++) { var k = Math.floor(ctx.rnd() * 200) * 3; m.point(pts[k], pts[k + 1], pts[k + 2], i < 2 ? 6 : 3, i < 2 ? cc : ca, 0.95); }
    for (var j = 0; j < 9; j++) m.quad(o[0] + (ctx.rnd() - 0.5) * 230, -340, z0 + (ctx.rnd() - 0.5) * 40, 0, 1 + ctx.rnd(), 680, j % 3 ? cc : ca, 0.1 + ctx.rnd() * 0.2, 'peak');
    for (var p = 0; p < 34; p++) m.point(o[0] + gauss(ctx.rnd) * 130, o[1] + gauss(ctx.rnd) * 280, z0 + gauss(ctx.rnd) * 60, 2, cc, 0.7);
  });

  // asset 01: a track: a thick flat band round the mark (an inner and an outer edge, a lower rim and
  // ticks) with a few arcs of light lying on it.
  A.register('s12-track', function (m, ctx) {
    var ca = ctx.tone('a', 0.95), cb = ctx.light('b'), cc = ctx.light('c'), ax = 0.36 + ctx.rnd() * 0.08, az = -0.12 + (ctx.rnd() - 0.5) * 0.12, y0 = -20 + ctx.rnd() * 20, N = 220;
    function P(r, t, h) { var p = tilt(r * Math.cos(t), h, r * Math.sin(t), ax, az); return [p[0], p[1] + y0, p[2]]; }
    function loop(r, h) { var o = []; for (var i = 0; i < N; i++) { var p = P(r, i / N * TAU, h); o.push(p[0], p[1], p[2]); } return o; }
    clipLine(m, ctx, loop(262, 0), cb, 0.42, true); clipLine(m, ctx, loop(296, 0), ca, 0.62, true); clipLine(m, ctx, loop(296, -16), cb, 0.32, true); clipLine(m, ctx, loop(279, 0), cb, 0.2, true);
    for (var t = 0; t < TAU; t += TAU / 60) clipSeg(m, ctx, P(296, t, 0), P(296, t, -16), cb, 0.26);
    for (var d = 0; d < N; d += 3) { var q = P(262, d / N * TAU, 0); if (ctx.clearAt(q[0], q[1], q[2], 6) && inView(q, 0)) m.point(q[0], q[1], q[2], 1.8, ca, 0.65); }
    var segs = 5 + Math.floor(ctx.rnd() * 3);
    for (var k = 0; k < segs; k++) {
      var t0 = ctx.rnd() * TAU, span = 0.12 + ctx.rnd() * 0.32, r = ctx.rnd() < 0.5 ? 296 : 279, steps = Math.ceil(span / 0.02), col = k === 0 ? cc : ca;
      for (var j = 0; j < steps; j++) {
        var a = P(r, t0 + j * span / steps, -3), b = P(r, t0 + (j + 1) * span / steps, -3), dv = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
        if (!ctx.clearAt(a[0], a[1], a[2], 8) || !inView(a, 4)) continue;
        m.rod(a[0], a[1], a[2], dv, Math.hypot(dv[0], dv[1], dv[2]), 4.5, col, 0.55);
      }
      var mid = P(r, t0 + span / 2, 0);
      m.point(mid[0], mid[1], mid[2], 46, k === 0 ? cc : cb, 0.3, true);
    }
  });

  // asset 02: a ring cut into curved glass blocks with gaps between them, two blocks missing and one
  // in the accent, over a faint dotted inner ring.
  A.register('s12-segments', function (m, ctx) {
    var ca = ctx.tone('a', 0.95), cb = ctx.light('b'), cc = ctx.light('c'), ax = 0.4 + ctx.rnd() * 0.06, az = 0.12 + (ctx.rnd() - 0.5) * 0.1;
    var R = 266, N = 14, gap = 0.08, ph = ctx.rnd() * TAU, x0 = -14, y0 = -10, z0 = -20, B = mul(rz(az), rx(ax));
    var miss = [Math.floor(ctx.rnd() * N)], accent = Math.floor(ctx.rnd() * N);
    miss.push((miss[0] + 3 + Math.floor(ctx.rnd() * (N - 6))) % N);
    for (var k = 0; k < N; k++) {
      if (miss.indexOf(k) >= 0) continue;
      var t = (k + 0.5) / N * TAU + ph, span = TAU / N - gap, len = 2 * R * Math.sin(span / 2), p = app(B, [R * Math.cos(t), 0, R * Math.sin(t)]);
      // the block's x runs along the ring and its z along the radius
      var rot = euler(mul(B, ry(-(t + Math.PI / 2)))), lit = k === accent, col = lit ? cc : ca;
      if (!inView([p[0] + x0, p[1] + y0, p[2] + z0], 30) || !ctx.clearAt(p[0] + x0, p[1] + y0, p[2] + z0, 30)) continue;
      m.glass(p[0] + x0, p[1] + y0, p[2] + z0, len * 0.96, 26, 38, col, lit ? 1 : 0.78, rot);
      m.bar(p[0] + x0, p[1] + y0, p[2] + z0, len * 0.9, 22, 34, lit ? cc : cb, lit ? 0.14 : 0.06, rot);
      if (lit) m.point(p[0] + x0, p[1] + y0, p[2] + z0, 90, cc, 0.3, true);
    }
    var inner = ctx.ring(R - 50, 180, ax, az, x0, y0 - 8, z0);
    clipLine(m, ctx, inner, cb, 0.24, true);
    for (var i = 0; i < 180; i += 4) if (ctx.clearAt(inner[i * 3], inner[i * 3 + 1], inner[i * 3 + 2], 6)) m.point(inner[i * 3], inner[i * 3 + 1], inner[i * 3 + 2], 1.8, ca, 0.6);
  });

  // pool 01: a thick torus of particles round the mark, one half white and the other in the accent,
  // with streaks of light standing through it.
  A.register('s12-torus', function (m, ctx) {
    var ca = ctx.light('a'), cc = ctx.light('c'), R = 262, r = 36, ax = 0.3 + ctx.rnd() * 0.08, az = -0.12 + (ctx.rnd() - 0.5) * 0.12, split = ctx.rnd() * TAU, z0 = -20;
    function half(th) { return Math.max(0, Math.min(1, Math.cos(th - split) * 2.5 + 0.5)); }
    for (var i = 0; i < 3400; i++) {
      var th = ctx.rnd() * TAU, ph = ctx.rnd() * TAU, rr = r * Math.sqrt(ctx.rnd()), p = tilt((R + rr * Math.cos(ph)) * Math.cos(th), rr * Math.sin(ph), (R + rr * Math.cos(ph)) * Math.sin(th), ax, az);
      var h = half(th), col = [ca[0] + (cc[0] - ca[0]) * h, ca[1] + (cc[1] - ca[1]) * h, ca[2] + (cc[2] - ca[2]) * h];
      if (!ctx.clearAt(p[0], p[1], p[2] + z0, 4) || !inView([p[0], p[1], p[2] + z0], 0)) continue;
      m.point(p[0], p[1], p[2] + z0, 1.4 + ctx.rnd() * 2, col, (0.35 + ctx.rnd() * 0.6) * (p[2] > 0 ? 1 : 0.65));
    }
    for (var k = 0; k < 24; k++) {
      var t = ctx.rnd() * TAU, q = tilt(R * Math.cos(t), 0, R * Math.sin(t), ax, az), len = 120 + ctx.rnd() * 240, y = Math.max(-338, q[1] - len / 2);
      if (!ctx.clearAt(q[0], q[1], q[2] + z0, 20)) continue;
      m.quad(q[0], y, q[2] + z0, 0, 1.2 + ctx.rnd() * 1.6, Math.min(len, 338 - y), half(t) > 0.5 ? cc : ca, 0.22 + ctx.rnd() * 0.35, 'peak');
    }
  });

  // pool 02: stations evenly round a ring: glass cubes of a few sizes, every other one in the accent
  // with a solid core, each ticked to a dotted inner ring, with small marks between them.
  A.register('s12-stations', function (m, ctx) {
    var ca = ctx.tone('a', 0.95), cb = ctx.light('b'), cc = ctx.light('c'), R = 268, ax = 0.34 + ctx.rnd() * 0.06, az = (ctx.rnd() - 0.5) * 0.12;
    var N = 8 + 2 * Math.floor(ctx.rnd() * 2), ph = ctx.rnd() * TAU, z0 = -10, ri = R * 0.74, i;
    function P(r, t) { var p = tilt(r * Math.cos(t), 0, r * Math.sin(t), ax, az); return [p[0], p[1], p[2] + z0]; }
    clipLine(m, ctx, ctx.ring(R, 200, ax, az, 0, 0, z0), cb, 0.45, true);
    for (i = 0; i < 160; i += 2) { var d = P(ri, i / 160 * TAU); m.point(d[0], d[1], d[2], 1.8, ca, 0.5); }
    for (var k = 0; k < N; k++) {
      var t = ph + k / N * TAU, p = P(R, t), lit = k % 2 === 1, s = [12, 16, 22, 28][Math.floor(ctx.rnd() * 4)];
      if (!inView(p, s) || !ctx.clearAt(p[0], p[1], p[2], s)) continue;
      m.glass(p[0], p[1], p[2], s, s, s, lit ? cc : ca, lit ? 1 : 0.85, [ctx.rnd() * 0.4, t, 0]);
      if (lit) { m.cube(p[0], p[1], p[2], s * 0.36, s * 0.36, s * 0.36, ctx.tone('c', 0.9), [0.4, t, 0]); m.point(p[0], p[1], p[2], s * 2.6, cc, 0.4, true); }
      seg(m, P(R - 12, t), P(ri + 6, t), cb, 0.28);
      var e = P(ri, t); m.point(e[0], e[1], e[2], 3.2, ca, 0.9);
      var tm = t + Math.PI / N;
      if (ctx.rnd() < 0.5) for (var j = -1; j <= 1; j++) { var q = P(R, tm + j * 0.035); m.point(q[0], q[1], q[2], 2.2, ca, 0.85); }
      else { seg(m, P(R + 9, tm - 0.03), P(R + 9, tm + 0.03), ca, 0.7); seg(m, P(R - 9, tm - 0.03), P(R - 9, tm + 0.03), ca, 0.7); }
    }
  });

  // pool 03: a funnel of rings round the mark, wide at the top and narrowing down to a glowing neck,
  // with dotted rings spreading out again beneath it.
  A.register('s12-funnel', function (m, ctx) {
    var ca = ctx.tone('a', 0.95), cb = ctx.light('b'), cc = ctx.light('c'), ax = 0.32, n = 15, z0 = -30;
    var yTop = 214 + ctx.rnd() * 22, yBot = -118 - ctx.rnd() * 30, rings = [];
    for (var k = 0; k < n; k++) {
      var t = k / (n - 1), y = yTop + (yBot - yTop) * Math.pow(t, 0.9), r = 276 - 198 * Math.pow(t, 0.75);
      rings.push([y, r]);
      clipLine(m, ctx, ctx.ring(r, 150, ax, 0, 0, y, z0), k < 2 ? ca : cb, k < 2 ? 0.6 : 0.38 - t * 0.14, true);
    }
    for (var j = 0; j < 16; j++) {
      var a = j / 16 * TAU, path = [];
      rings.forEach(function (g) { var p = tilt(g[1] * Math.cos(a), 0, g[1] * Math.sin(a), ax, 0); path.push(p[0], p[1] + g[0], p[2] + z0); });
      clipLine(m, ctx, path, cb, 0.12, false);
    }
    for (var d = 0; d < 5; d++) {
      var dy = yBot - 30 - d * 28, dr = 80 + d * 30, nd = Math.round(dr * 0.42);
      for (var i = 0; i < nd; i++) {
        var u = i / nd * TAU, q = tilt(dr * Math.cos(u), 0, dr * Math.sin(u), ax, 0);
        if (q[1] + dy < -338) continue;
        m.point(q[0], q[1] + dy, q[2] + z0, 2, ca, 0.7 - d * 0.1);
      }
    }
    m.point(0, yBot, z0, 130, cc, 0.3, true); node(m, [0, yBot, z0], cc, 4);
  });

  // chain topology 01: big glass cubes on a tilted dotted orbit, each spoked to a glass hub behind
  // the mark's centre, with small cubes partway along some spokes.
  A.register('s12-spokes', function (m, ctx) {
    var ca = ctx.tone('a', 0.95), cb = ctx.light('b'), cc = ctx.light('c'), N = 220, hub = [10, 0, -50];
    var pts = ctx.ring(295, N, 0.42, -0.38 + (ctx.rnd() - 0.5) * 0.14, 0, 0, -10), ts = [], tries = 0, i;
    for (i = 0; i < N; i += 6) clipLine(m, ctx, pts.slice(i * 3, Math.min(N, i + 4) * 3 + 3), cb, 0.45, false);
    while (ts.length < 5 && tries++ < 200) {
      var t = Math.floor(ctx.rnd() * N);
      if (ts.every(function (u) { var d = Math.abs(u - t) % N; return Math.min(d, N - d) > N * 0.13; })) ts.push(t);
    }
    ts.forEach(function (ti, k) {
      var p = [pts[ti * 3], pts[ti * 3 + 1], pts[ti * 3 + 2]], s = 24 + ctx.rnd() * 16, rot = [ctx.rnd() * 3, ctx.rnd() * 3, 0], over = p[2] > 0 && Math.abs(p[0]) < 210 && Math.abs(p[1]) < 280;
      if (!inView(p, s) || !ctx.clearAt(p[0], p[1], p[2], s)) return;
      m.glass(p[0], p[1], p[2], s, s, s, ca, 0.95, rot);
      m.glass(p[0], p[1], p[2], s * 0.45, s * 0.45, s * 0.45, ca, 0.6, rot);
      m.point(p[0], p[1], p[2], s * 2.2, k === 0 ? cc : cb, over ? 0.1 : 0.25, true);
      seg(m, hub, p, cb, 0.3);
      if (ctx.rnd() < 0.5) { var q = lerp(hub, p, 0.42 + ctx.rnd() * 0.16); m.glass(q[0], q[1], q[2], 10, 10, 10, ca, 0.8, [ctx.rnd() * 3, ctx.rnd() * 3, 0]); }
    });
    for (i = 0; i < 9; i++) { var j = Math.floor(ctx.rnd() * N) * 3; m.point(pts[j], pts[j + 1], pts[j + 2], 3, ca, 0.9); }
    m.glass(hub[0], hub[1], hub[2], 16, 16, 16, ca, 1, [0.6, Math.PI / 4, 0]);
    node(m, hub, cc, 5, 8);
  });

  /* ================= 04-mark: the DEFXN mark ================= */

  // identity 01: the mark as a hollow in a globe of points. The points fill a round cloud and stop at
  // the mark's edge, where they crowd and shine; the cloud thins and dims away from the mark, so the
  // mark reads as a dark shape cut out of light.
  A.register('s12-mark-hollow', function (m, ctx) {
    var g = ctx.markGrid(ctx.num('rows', 104)), cb = ctx.light('b'), RX = 305, RY = 330, ph = ctx.rnd() * TAU;
    var eC = Math.ceil((RX - 200) / g.cell) + 2, eR = Math.ceil((RY - 273) / g.cell) + 2, W = g.C + 2 * eC, H = g.R + 2 * eR, FAR = 99;
    // distance in cells from the mark, for every cell of the cloud's box
    var dist = new Uint8Array(W * H), queue = [], head = 0, r, c;
    for (r = 0; r < H; r++) for (c = 0; c < W; c++) {
      var i0 = r * W + c;
      if (g.cov(r - eR, c - eC) >= 0.5) { dist[i0] = 0; queue.push(i0); } else dist[i0] = FAR;
    }
    while (head < queue.length) {
      var p = queue[head++], d = dist[p], pc = p % W, pr = (p - pc) / W;
      if (d >= 20) continue;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (s) {
        var nr = pr + s[0], nc = pc + s[1], q = nr * W + nc;
        if (nr >= 0 && nr < H && nc >= 0 && nc < W && dist[q] === FAR) { dist[q] = d + 1; queue.push(q); }
      });
    }
    for (r = 0; r < H; r++) for (c = 0; c < W; c++) {
      var gr = r - eR, gc = c - eC;
      if (!g.ok(gr, gc)) continue;
      var x = g.x(gc), y = g.y(gr), e = Math.hypot(x / RX, y / RY), dm = dist[r * W + c];
      if (e > 1) continue;
      if (dm === 0) {
        if (ctx.rnd() < 0.03) m.point(x, y, (ctx.rnd() - 0.5) * 20, g.cell * 0.6, ctx.tone('a', 0.6), 0.16);
        continue;
      }
      var rim = dm <= 2, near = Math.max(0, 1 - (dm - 2) / 18), clump = 0.7 + 0.3 * Math.sin(x * 0.021 + ph) * Math.cos(y * 0.017 - ph);
      var dens = rim ? 0.95 : (0.32 + 0.58 * near) * clump * (1 - Math.pow(e, 6));
      if (ctx.rnd() > dens) continue;
      var depth = Math.sqrt(Math.max(0, 1 - e * e)), z = rim ? (ctx.rnd() - 0.5) * 8 : (ctx.rnd() * 2 - 1) * depth * 60 * (1 - near * 0.6);
      var px = x + (ctx.rnd() - 0.5) * g.cell * 0.8, py = y + (ctx.rnd() - 0.5) * g.cell * 0.8;
      var v = rim ? 0.9 + ctx.rnd() * 0.1 : 0.42 + 0.48 * near * (0.6 + 0.4 * ctx.rnd());
      m.point(px, py, z, g.cell * (rim ? 1.05 : 0.65 + 0.4 * near + ctx.rnd() * 0.3), !rim && ctx.rnd() < 0.12 ? cb : ctx.tone('a', v), rim ? 0.95 : 0.35 + 0.6 * near * (0.5 + 0.5 * ctx.rnd()));
      if (rim) ctx.cells.push({ x: px, y: py, z: z, s: g.cell });
    }
    for (var i = 0; i < 14; i++) {
      var t = ctx.rnd() * TAU, k = 0.55 + ctx.rnd() * 0.4, gx = Math.cos(t) * RX * k, gy = Math.sin(t) * RY * k;
      if (ctx.clear(gx, gy, 20) && gx > -230) m.point(gx, gy, 10, 18, cb, 0.28, true);
    }
  });

  // identity 02: the mark as glass rods: every vertical run of the mark is one clear rod with a
  // glowing core and bright caps, each column at its own depth, a few streaks running on.
  A.register('s12-mark-rods', function (m, ctx) {
    var g = ctx.markGrid(ctx.num('rows', 60)), ca = ctx.tone('a', 0.95), cl = ctx.light('a'), cb = ctx.light('b'), w = g.cell * 0.66;
    for (var c = 0; c < g.C; c++) {
      var dz = (ctx.rnd() - 0.5) * g.cell * 3, r = 0;
      while (r < g.R) {
        if (g.cov(r, c) < 0.5 || !g.ok(r, c)) { r++; continue; }
        var r0 = r;
        while (r < g.R && g.cov(r, c) >= 0.5 && g.ok(r, c)) r++;
        var x = g.x(c), yTop = g.y(r0) + g.cell / 2, yBot = g.y(r - 1) - g.cell / 2, y = (yTop + yBot) / 2, h = yTop - yBot, z = dz + w / 2;
        m.glass(x, y, z, w, h - g.cell * 0.15, w, ca, 0.5 + ctx.rnd() * 0.3);
        m.bar(x, y, z, w * 0.34, h * 0.96, w * 0.34, cl, 0.22 + ctx.rnd() * 0.25);
        m.point(x, yTop - g.cell * 0.2, z, 3.2, cl, 0.9); m.point(x, yBot + g.cell * 0.2, z, 3.2, cl, 0.9);
        if (ctx.rnd() < 0.2) thread(m, x, yTop, z, 1, 30 + ctx.rnd() * 140, 1.2, cb, 0.35);
        if (ctx.rnd() < 0.2) thread(m, x, yBot, z, -1, 30 + ctx.rnd() * 140, 1.2, cb, 0.35);
        for (var k = r0; k < r; k++) ctx.cells.push({ x: x, y: g.y(k), z: z + w / 2, s: g.cell });
      }
    }
  });

  /* ================= 05-signal: light ================= */

  // chain structure 02: a steep ring tilted across the mark, threads of light hanging from it and
  // rising off it, and a few glass cubes riding on it.
  A.register('s12-drop-ring', function (m, ctx) {
    var ca = ctx.tone('a', 0.95), cb = ctx.light('b'), cc = ctx.light('c'), N = 240, i;
    var pts = ctx.ring(285, N, 0.5 + ctx.rnd() * 0.1, 0.55 + ctx.rnd() * 0.15, 10, 0, -30);
    clipLine(m, ctx, pts, cb, 0.4, true);
    for (i = 0; i < N; i += 3) if (ctx.clearAt(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2], 6)) m.point(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2], 2, ca, 0.7);
    for (var k = 0; k < 26; k++) {
      var j = Math.floor(ctx.rnd() * N) * 3, len = 70 + ctx.rnd() * 230, bars = ctx.rnd() < 0.3, dir = ctx.rnd() < 0.65 ? -1 : 1;
      if (!ctx.clearAt(pts[j], pts[j + 1] + dir * len * 0.5, pts[j + 2], 12) || !ctx.clearAt(pts[j], pts[j + 1], pts[j + 2], 12)) continue;
      thread(m, pts[j], pts[j + 1], pts[j + 2], dir, len, 1.3 + ctx.rnd() * 1, cb, 0.4 + ctx.rnd() * 0.4, bars ? 'bars' : 'fade', Math.round(len / 7));
      m.point(pts[j], pts[j + 1], pts[j + 2], 3, ca, 0.95);
    }
    for (k = 0; k < 4; k++) {
      var q = Math.floor(ctx.rnd() * N) * 3, s = 18 + ctx.rnd() * 10;
      if (!ctx.clearAt(pts[q], pts[q + 1], pts[q + 2], 24) || !inView([pts[q], pts[q + 1], pts[q + 2]], 14)) continue;
      m.glass(pts[q], pts[q + 1], pts[q + 2], s, s, s, ca, 0.85, [ctx.rnd() * 3, ctx.rnd() * 3, 0]);
      m.point(pts[q], pts[q + 1], pts[q + 2], s * 2.4, k === 0 ? cc : cb, 0.3, true);
    }
  });

  // provenance 02: a seam: two vertical rods of light behind the mark's middle, a lens on them, and
  // rows of streaks spreading left and right from the seam, some broken into dashes.
  A.register('s12-seam', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), z = -40, x0 = 14 + (ctx.rnd() - 0.5) * 10;
    [-7, 7].forEach(function (dx) { m.quad(x0 + dx, -340, z, 0, 2, 680, ca, 0.55, 'peak'); });
    m.quad(x0, -340, z - 1, 0, 26, 680, cb, 0.07, 'peak');
    var ly = 90 + (ctx.rnd() - 0.5) * 100, lens = [];
    for (var i = 0; i < 48; i++) {
      var t = i / 48 * TAU, s = Math.sin(t);
      lens.push(x0 + 24 * Math.cos(t), ly + 15 * s * Math.pow(Math.abs(s), 0.4), z);
    }
    m.line(lens, ca, 0.9, true); node(m, [x0, ly, z], cc, 5); m.point(x0, ly, z, 130, cc, 0.25, true);
    var rows = 10 + Math.floor(ctx.rnd() * 4);
    for (var k = 0; k < rows; k++) {
      var y = -270 + (k + 0.5) / rows * 540 + (ctx.rnd() - 0.5) * 14;
      [1, -1].forEach(function (side) {
        var start = 10 + ctx.rnd() * 60, room = side > 0 ? 318 - (x0 + start) : (x0 - start) + 238, len = Math.min(room, 80 + ctx.rnd() * 230), bars = ctx.rnd() < 0.4;
        if (len < 20 || !ctx.clearAt(x0 + side * (start + len), y, z, 4)) len *= 0.5;
        m.quad(x0 + side * start, y, z, side > 0 ? -Math.PI / 2 : Math.PI / 2, 1.2 + ctx.rnd() * 1.2, len, k % 4 === 1 ? cc : cb, 0.35 + ctx.rnd() * 0.35, bars ? 'bars' : 'fade', Math.round(len / 6));
        if (ctx.rnd() < 0.6) m.point(x0 + side * start, y, z, 2.6, ca, 0.85);
      });
    }
  });

  // asset 03: a cluster of crystal prisms behind the mark, tallest in the middle, each a clear
  // column with an accent core, a cut tip and threads of light off its ends.
  A.register('s12-prisms', function (m, ctx) {
    var ca = ctx.tone('a', 0.95), cc = ctx.light('c'), n = 15 + Math.floor(ctx.rnd() * 5), o = seenAt(10, -10, -120), rot = [0, Math.PI / 4, 0];
    for (var k = 0; k < n; k++) {
      var u = ctx.rnd() * 2 - 1, x = o[0] + u * 175, mid = 1 - Math.abs(u), h = 70 + ctx.rnd() * 110 + mid * 190, w = 9 + ctx.rnd() * 7;
      var y = o[1] + (ctx.rnd() - 0.5) * 170, z = -80 - ctx.rnd() * 120;
      y = Math.max(-318 + h / 2, Math.min(300 - h / 2, y));
      if (!ctx.clearAt(x, y + h / 2, z, 16)) continue;
      m.glass(x, y, z, w, h, w, ca, 0.7, rot);
      m.bar(x, y, z, w * 0.45, h * 0.92, w * 0.45, cc, 0.3 + ctx.rnd() * 0.25, rot);
      m.glass(x, y + h / 2 + w * 0.3, z, w * 0.62, w * 0.62, w * 0.62, ca, 0.6, [Math.PI / 4, Math.PI / 4, 0]);
      m.point(x, y + h / 2, z, 4, cc, 1); m.point(x, y + h / 2, z, 30, cc, 0.35, true);
      if (ctx.rnd() < 0.6) thread(m, x, y + h / 2 + w, z, 1, 40 + ctx.rnd() * 120, 1, cc, 0.4);
      if (ctx.rnd() < 0.5) thread(m, x, y - h / 2, z, -1, 30 + ctx.rnd() * 90, 1, cc, 0.3);
    }
    for (var i = 0; i < 30; i++) m.point(o[0] + gauss(ctx.rnd) * 150, o[1] + gauss(ctx.rnd) * 260, -100 + gauss(ctx.rnd) * 60, 2, cc, 0.6);
  });

  // compute 02: a grid floor under the mark with a bright square at its heart and a glow there,
  // shafts of light rising from the crossings near the middle, two plain plates under it.
  A.register('s12-grid-lift', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), M = mul(rx(0.42), ry(Math.PI / 4 + (ctx.rnd() - 0.5) * 0.1)), y0 = -214, z0 = -10, S = 380, n = 10, i;
    function P(u, w, dy) { var q = app(M, [u, dy || 0, w]); return [20 + q[0], y0 + q[1], z0 + q[2]]; }
    function square(h, dy) { var a = P(-h, -h, dy), b = P(h, -h, dy), c = P(h, h, dy), d = P(-h, h, dy); return flat([a, b, c, d]); }
    for (i = 0; i <= n; i++) {
      var a = -S / 2 + i * S / n, edge = i === 0 || i === n;
      clipSeg(m, ctx, P(a, -S / 2), P(a, S / 2), cb, edge ? 0.62 : 0.3); clipSeg(m, ctx, P(-S / 2, a), P(S / 2, a), cb, edge ? 0.62 : 0.3);
    }
    m.line(square(S * 0.15), ca, 0.9, true); m.line(square(S * 0.1), ca, 0.5, true);
    [-24, -48].forEach(function (dy, k) { clipLine(m, ctx, square(S / 2, dy), cb, 0.32 - k * 0.12, true); });
    var c = P(0, 0); m.point(c[0], c[1], c[2], 160, cc, 0.4, true); m.point(c[0], c[1], c[2], 30, [1, 1, 1], 0.9, true);
    var st = S / n;
    for (var u = -3; u <= 3; u++) for (var w = -3; w <= 3; w++) {
      var dd = Math.hypot(u, w);
      if (dd > 3.2 || ctx.rnd() > 0.75 - dd * 0.1) continue;
      var p = P(u * st, w * st);
      thread(m, p[0], p[1], p[2], 1, (140 + ctx.rnd() * 380) * (1 - dd / 4.5), 1.4 + ctx.rnd() * 1.6, ctx.rnd() < 0.25 ? cc : ca, 0.35 + ctx.rnd() * 0.4);
      m.point(p[0], p[1], p[2], 2.6, ca, 0.9);
    }
    for (i = 0; i < 26; i++) m.point(c[0] + gauss(ctx.rnd) * 90, c[1] + 40 + ctx.rnd() * 300, c[2] + gauss(ctx.rnd) * 60, 1.8, ca, 0.5);
  });

  // bridge 03: two long loops of light crossing in an X like the mark, one white and one in the
  // accent, each with a halo of fine loops and specks, bright at its ends.
  A.register('s12-crossloop', function (m, ctx) {
    var ca = ctx.light('a'), cc = ctx.light('c'), LA = 318, LB = 62, z0 = 10;
    [[0.78 + (ctx.rnd() - 0.5) * 0.1, ca, 0.35], [-0.78 + (ctx.rnd() - 0.5) * 0.1, cc, -0.35]].forEach(function (L) {
      var M = mul(rz(L[0]), rx(L[2])), col = L[1];
      function P(t, k) { var p = app(M, [LA * k * Math.cos(t), LB * k * Math.sin(t), 0]); return [p[0], p[1], p[2] + z0]; }
      for (var s = 0; s < 3; s++) {
        var pts = [];
        for (var i = 0; i < 200; i++) pts.push(P(i / 200 * TAU, 1 + (s - 1) * 0.035));
        m.line(flat(pts), col, s === 1 ? 0.75 : 0.22, true);
      }
      for (var j = 0; j < 160; j++) { var q = P(ctx.rnd() * TAU, 1 + gauss(ctx.rnd) * 0.05); m.point(q[0], q[1], q[2], 1.2 + ctx.rnd() * 1.8, col, 0.3 + ctx.rnd() * 0.6); }
      [0, Math.PI].forEach(function (t) { var e = P(t, 1); m.point(e[0], e[1], e[2], 32, col, 0.4, true); m.point(e[0], e[1], e[2], 4, [1, 1, 1], 1); });
    });
    m.point(0, 0, z0, 60, cc, 0.16, true);
  });

  // status 03: a beacon in one of the mark's open spaces: a bright square in a soft glow, a long
  // crosshair of light with ticks, and a faint grid of dots behind it.
  A.register('s12-beacon', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), g = ctx.markGrid(40), z = 40, spots = [];
    for (var r = 0; r < g.R; r++) for (var c = 0; c < g.C; c++) {
      var x = g.x(c), y = g.y(r), empty = true;
      if (Math.abs(x) > 160 || Math.abs(y) > 230) continue;
      for (var dr = -2; dr <= 2 && empty; dr++) for (var dc = -2; dc <= 2; dc++) if (g.cov(r + dr, c + dc) > 0.15) { empty = false; break; }
      if (empty && ctx.clearAt(x, y, z, 40)) spots.push([x, y]);
    }
    var p = spots.length ? spots[Math.floor(ctx.rnd() * spots.length)] : [0, 296];
    m.cube(p[0], p[1], z, 15, 15, 4, ctx.tone('a', 1));
    m.point(p[0], p[1], z, 90, cc, 0.45, true); m.point(p[0], p[1], z, 28, [1, 1, 1], 0.8, true);
    var x0 = Math.max(-236, p[0] - 200), x1 = Math.min(316, p[0] + 200), y0 = Math.max(-336, p[1] - 170), y1 = Math.min(336, p[1] + 170);
    m.quad(x0, p[1], z, -Math.PI / 2, 1.2, x1 - x0, ca, 0.6, 'peak');
    m.quad(p[0], y0, z, 0, 1.2, y1 - y0, ca, 0.6, 'peak');
    for (var j = -3; j <= 3; j++) {
      if (!j) continue;
      m.line([p[0] + j * 40, p[1] - 4, z, p[0] + j * 40, p[1] + 4, z], ca, 0.35);
      m.line([p[0] - 4, p[1] + j * 40, z, p[0] + 4, p[1] + j * 40, z], ca, 0.35);
    }
    for (var i = -4; i <= 4; i++) for (var k = -4; k <= 4; k++) m.point(p[0] + i * 26, p[1] + k * 26, z - 30, 1.6, cb, Math.abs(i) + Math.abs(k) < 3 ? 0.24 : 0.12);
  });

  // status 04: a plumb line at the mark's right: a thin vertical thread with dots, two glowing beads
  // (the upper one in the accent, beside a short accent bar) and a faint level line through the
  // lower bead.
  A.register('s12-plumb', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), z = 10, x = 246 + ctx.rnd() * 28, top = 215, bot = -252;
    m.quad(x, bot, z, 0, 1.3, top - bot, ca, 0.55, 'peak');
    m.quad(x, bot, z - 1, 0, 8, top - bot, cb, 0.06, 'peak');
    for (var y = bot; y < top; y += 24) m.point(x, y, z, 2, ca, 0.5);
    var y1 = 40 + ctx.rnd() * 80, y2 = y1 - 110 - ctx.rnd() * 60;
    m.point(x, y1, z, 9, cc, 1); m.point(x, y1, z, 52, cc, 0.4, true);
    m.point(x, y2, z, 9, [1, 1, 1], 1); m.point(x, y2, z, 46, ca, 0.35, true);
    m.quad(x, y2, z - 60, Math.PI / 2, 1, 420, cb, 0.2, 'fade');
    m.bar(x + 16, y1 - 10, z, 2.2, 80, 2.2, cc, 0.3);
  });

  /* ================= 06-particles: in front ================= */

  // chain structure 03: a flat double ring of dots low round the mark, with glass cubes lifting off
  // it on faint threads, fewer and smaller the higher they rise; one cube in the accent.
  A.register('s12-lift', function (m, ctx) {
    var ca = ctx.tone('a', 0.95), cb = ctx.light('b'), cc = ctx.light('c'), ax = 0.3, y0 = -250, z0 = 20;
    [250, 272].forEach(function (r, k) {
      var n = Math.round(r * (k ? 0.36 : 0.5));
      for (var i = 0; i < n; i++) {
        var t = i / n * TAU, p = tilt(r * Math.cos(t), 0, r * Math.sin(t), ax, 0);
        if (ctx.clearAt(p[0], p[1] + y0, p[2] + z0, 6)) m.point(p[0], p[1] + y0, p[2] + z0, k ? 2 : 2.6, ca, 0.4 + 0.55 * (p[2] > 0 ? 1 : 0.3));
      }
    });
    clipLine(m, ctx, ctx.ring(250, 160, ax, 0, 0, y0, z0), cb, 0.3, true);
    var n = 11 + Math.floor(ctx.rnd() * 5), accent = Math.floor(ctx.rnd() * n);
    for (var i = 0; i < n; i++) {
      var t = ctx.rnd() * TAU, r = 140 + ctx.rnd() * 120, h = Math.pow(ctx.rnd(), 1.5) * 470, s = 26 - 12 * (h / 470) + ctx.rnd() * 5;
      var b = tilt(r * Math.cos(t), 0, r * Math.sin(t), ax, 0), x = b[0], z = b[2] + z0, yb = b[1] + y0, y = yb + 30 + h;
      if (y > 300 || !ctx.clearAt(x, y, z, 20) || !inView([x, y, z], 12)) continue;
      m.line([x, yb, z, x, y - s / 2, z], cb, 0.26);
      m.point(x, yb, z, 3, ca, 0.8);
      if (i === accent) { m.glass(x, y, z, s, s, s, cc, 1, [ctx.rnd() * 3, ctx.rnd() * 3, 0]); m.point(x, y, z, s * 3, cc, 0.4, true); }
      else { m.glass(x, y, z, s, s, s, ca, 0.85 + ctx.rnd() * 0.15, [ctx.rnd() * 3, ctx.rnd() * 3, ctx.rnd() * 3]); if (ctx.rnd() < 0.4) m.point(x, y, z, s * 1.8, cb, 0.18, true); }
    }
  });

  // provenance 01: a small stack of square glass plates beside the mark at the right, turned 45
  // degrees, each with a smaller record plate on it, a glow at its heart and nodes at its corners,
  // threaded on a short dotted axis.
  A.register('s12-plate-stack', function (m, ctx) {
    var ca = ctx.tone('a', 0.95), cc = ctx.light('c'), z = 40, tx = 0.5 + ctx.rnd() * 0.1, ty = Math.PI / 4, M = mul(rx(tx), ry(ty)), rot = [tx, ty, 0];
    var o = seenAt(258, -170 + ctx.rnd() * 290, z), side = 64, gap = 22, n = 4, lit = Math.floor(ctx.rnd() * n);
    for (var k = 0; k < n; k++) {
      var y = o[1] + (k - (n - 1) / 2) * gap;
      m.glass(o[0], y, z, side, 2.5, side, ca, 0.85, rot);
      m.glass(o[0], y + 4, z, side * 0.42, 2, side * 0.42, ca, 0.9, rot);
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (s) { var q = app(M, [s[0] * side / 2, 0, s[1] * side / 2]); m.point(o[0] + q[0], y + q[1], z + q[2], 2.4, ca, 0.9); });
      m.point(o[0], y + 4, z, k === lit ? 70 : 30, cc, k === lit ? 0.5 : 0.25, true);
    }
    m.point(o[0], o[1] + (lit - (n - 1) / 2) * gap + 4, z, 5, [1, 1, 1], 1);
    for (var yy = o[1] - 70; yy <= o[1] + 70; yy += 7) m.point(o[0], yy, z, 1.6, ca, 0.5);
  });

  // chain topology 03: a small network sphere beside the mark at the right: nodes over a sphere,
  // each linked to its nearest three (fainter on the far side), a few glowing, dust inside, and a
  // thin orbit round it.
  A.register('s12-net-bead', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), z = 50, R = 56, n = 34, ga = Math.PI * (3 - Math.sqrt(5)), turn = ctx.rnd() * TAU;
    var c = seenAt(246, ctx.rnd() < 0.5 ? -150 + ctx.rnd() * 60 : 70 + ctx.rnd() * 80, z), o = [c[0], c[1], z], pts = [], done = {};
    for (var i = 0; i < n; i++) {
      var y = 1 - (i + 0.5) / n * 2, rr = Math.sqrt(1 - y * y), t = ga * i + turn;
      pts.push([o[0] + Math.cos(t) * rr * R, o[1] + y * R, o[2] + Math.sin(t) * rr * R]);
    }
    pts.forEach(function (p, a) {
      pts.map(function (q, b) { return [b, Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2])]; })
        .sort(function (x, w) { return x[1] - w[1]; }).slice(1, 4).forEach(function (e) {
          var key = Math.min(a, e[0]) + '-' + Math.max(a, e[0]), q = pts[e[0]];
          if (done[key]) return;
          done[key] = 1; seg(m, p, q, cb, (p[2] + q[2]) / 2 > z ? 0.45 : 0.16);
        });
    });
    pts.forEach(function (p) {
      var f = (p[2] - z) / R;
      m.point(p[0], p[1], p[2], 2.4 + f, ca, 0.5 + 0.4 * f);
      if (ctx.rnd() < 0.15) { m.point(p[0], p[1], p[2], 5, ca, 1); m.point(p[0], p[1], p[2], 26, ctx.rnd() < 0.5 ? cc : cb, 0.4, true); }
    });
    for (var d = 0; d < 70; d++) m.point(o[0] + gauss(ctx.rnd) * R * 0.5, o[1] + gauss(ctx.rnd) * R * 0.5, z + gauss(ctx.rnd) * R * 0.5, 1.2, ca, 0.2 + ctx.rnd() * 0.3);
    m.point(o[0], o[1], z, 120, cc, 0.18, true);
    clipLine(m, ctx, ctx.ring(R * 1.3, 90, 0.35, -0.3, o[0], o[1], z), cb, 0.45, true, 0);
  });
})();

/* DEFXN identity card: builders from reference sheet 11 (glass cubes and graphs of glowing nodes,
   rings, planes, stepped forms and globes, drawn in white light with the palette's accent, --c, where
   the sheet had cyan, and its light, --b, where it had amber). Each builder is named by an element
   file in layers/<NN-key>/sheet-11/. The space and the m / ctx calls are described in the header of
   art3d.js. Every random value comes from ctx.rnd(), so the same card always draws the same art.

   Far elements sit about 80 units right of the origin: the card's rest tilt and its perspective
   carry a point 200 to 250 units behind about 80 units to the left, so that is where they line up
   with the mark's centre (see ctx.seen).

     s11-mark-slab       04-mark       the mark as horizontal slabs, each with a lighter bevelled face
     s11-mark-ice        04-mark       the mark as horizontal glass plates with a glowing seam under each
     s11-mark-facet      04-mark       the mark as tilted facets: edges lean out, the inside folds in diamonds
     s11-cube-pins       06-particles  small glass cubes hanging from hairlines that end in a ring
     s11-cube-links      06-particles  pairs of glass cubes joined by a glowing rod
     s11-cube-clusters   06-particles  a large glass cube resting on four small ones, two or three times
     s11-bead-path       06-particles  an S-shaped path of beads with a node at each end
     s11-hex-graph       01-backdrop   a hexagon of nodes with six spokes to a centre node
     s11-astroid         01-backdrop   a four-pointed star of dots
     s11-grid-decks      01-backdrop   two stacked planes seen from above: a wire grid and a dot grid
     s11-glass-city      01-backdrop   a cluster of glass towers of mixed height
     s11-curtain         01-backdrop   a curtain of dots hung from a tall arch of light
     s11-ziggurat        01-backdrop   a stepped pyramid, solid with a pointed top or glass with a cube
     s11-diamond-graph   03-aura       two diamond graphs stacked on one axis, glowing nodes
     s11-tri-mesh        03-aura       a flat net of triangles cut to a six-pointed star, glowing nodes
     s11-mobius          03-aura       a twisted band (a Mobius strip) round the mark
     s11-bead-ring       03-aura       a ring threaded with beads and small loops
     s11-winding         03-aura       a spring wound round a ring
     s11-wire-box        03-aura       a wire box round the mark with glowing corners
     s11-spring          03-aura       a barrel-shaped spiral round an axis with hexagon nodes
     s11-towers          03-aura       segmented towers with lit tips on a ring or a spiral base
     s11-segment-wheel   03-aura       two segmented bands facing the viewer, four segments lit evenly
     s11-meridians       03-aura       a wire globe of meridians and parallels
     s11-lanes           05-signal     one bundle of parallel curves sweeping up behind the mark
     s11-trail           05-signal     a rising trail of glass cubes, each on a vertical line of light */
(function () {
  'use strict';
  var A = window.Art3D, TAU = Math.PI * 2;
  if (!A || !A.register) { console.error('js/nft/builders/s11.js: Art3D is not loaded. Load js/nft/art3d.js first. traits.js loads this file when a card needs it.'); return; }
  var ISO = [0.6155, 0.7854, 0];           // a cube turned to stand on a corner edge, as on the sheet

  /* ---------- helpers ---------- */
  // rotate as three.js does for rotation [rx, ry, rz] (Euler XYZ): z first, then y, then x
  function rotE(x, y, z, r) {
    var c = Math.cos(r[2]), s = Math.sin(r[2]), x1 = x * c - y * s, y1 = x * s + y * c;
    c = Math.cos(r[1]); s = Math.sin(r[1]);
    var x2 = x1 * c + z * s, z2 = -x1 * s + z * c;
    c = Math.cos(r[0]); s = Math.sin(r[0]);
    return [x2, y1 * c - z2 * s, y1 * s + z2 * c];
  }
  // a flat x-z shape tilted up by ax and rolled by az, as in art3d.js's ring()
  function tilt(p, ax, az) {
    var ca = Math.cos(ax), sa = Math.sin(ax), y1 = p[1] * ca - p[2] * sa, z1 = p[1] * sa + p[2] * ca;
    var cz = Math.cos(az || 0), sz = Math.sin(az || 0);
    return [p[0] * cz - y1 * sz, p[0] * sz + y1 * cz, z1];
  }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function gauss(ctx) { return ctx.rnd() + ctx.rnd() + ctx.rnd() - 1.5; }
  function flat(pts) { var out = []; pts.forEach(function (p) { out.push(p[0], p[1], p[2]); }); return out; }
  function seg(m, a, b, rgb, alpha) { m.line([a[0], a[1], a[2], b[0], b[1], b[2]], rgb, alpha); }
  // dots along a straight run, one every `step` units
  function dots(m, a, b, step, size, rgb, alpha) {
    var n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / step));
    for (var i = 0; i <= n; i++) { var p = mix(a, b, i / n); m.point(p[0], p[1], p[2], size, rgb, alpha); }
  }
  // a small hard dot with a soft glow round it
  function node(m, p, rgb, size, glow, ga) {
    m.point(p[0], p[1], p[2], size, rgb, 1);
    m.point(p[0], p[1], p[2], size * (glow || 4.5), rgb, ga == null ? 0.4 : ga, true);
  }
  // a hexagon outline facing the viewer
  function hexagon(m, p, r, rgb, alpha) {
    var pts = [];
    for (var i = 0; i < 6; i++) { var a = i * Math.PI / 3; pts.push(p[0] + r * Math.sin(a), p[1] + r * Math.cos(a), p[2]); }
    m.line(pts, rgb, alpha, true);
  }
  // a line through 3D points, split where it passes behind `zMid`: the near runs bright, the far runs faint
  function depthLine(m, pts, zMid, rgb, near, far, closed) {
    if (closed) pts = pts.concat([pts[0]]);
    var run = [], front = null;
    function flush() { if (run.length > 1) m.line(flat(run), rgb, front ? near : far); }
    pts.forEach(function (p) {
      var f = p[2] >= zMid;
      if (front !== null && f !== front) { var last = run[run.length - 1]; flush(); run = [last]; }
      front = f; run.push(p);
    });
    flush();
  }
  // the highest corner of a cube of size s turned by rot (its y, from the cube's centre)
  function topOf(s, rot) {
    var best = -1e9;
    for (var i = 0; i < 8; i++) { var p = rotE(i & 1 ? s / 2 : -s / 2, i & 2 ? s / 2 : -s / 2, i & 4 ? s / 2 : -s / 2, rot); if (p[1] > best) best = p[1]; }
    return best;
  }
  // inside an oval round the mark's middle, where small things in front would cover it
  function overMark(x, y) { return (x / 175) * (x / 175) + (y / 245) * (y / 245) < 1; }
  // places for n small things: clear of the card's words, apart from each other, mostly off the mark
  function places(ctx, n, box, gap, pad, keepOff) {
    var out = [], tries = 0;
    while (out.length < n && tries++ < 600) {
      var p = [box[0] + ctx.rnd() * (box[1] - box[0]), box[2] + ctx.rnd() * (box[3] - box[2]), box[4] + ctx.rnd() * (box[5] - box[4])];
      if (overMark(p[0], p[1]) && ctx.rnd() < keepOff) continue;
      if (!ctx.clearAt(p[0], p[1], p[2], pad)) continue;
      if (out.some(function (q) { return Math.hypot(q[0] - p[0], q[1] - p[1]) < gap; })) continue;
      out.push(p);
    }
    return out;
  }

  /* ================= 04-mark ================= */

  // sheet 11, 05-01: the mark as horizontal slabs, one per run of cells in a row, each with a
  // lighter face plate standing a little proud of it, so every slab reads as bevelled
  A.register('s11-mark-slab', function (m, ctx) {
    var g = ctx.markGrid(ctx.num('rows', 40)), h = g.cell * 0.86, d = g.cell * 2.6, bev = g.cell * 0.24;
    for (var r = 0; r < g.R; r++) {
      var c = 0;
      while (c < g.C) {
        if (g.cov(r, c) < 0.5 || !g.ok(r, c)) { c++; continue; }
        var c0 = c;
        while (c < g.C && g.cov(r, c) >= 0.5 && g.ok(r, c)) c++;
        var x = (g.x(c0) + g.x(c - 1)) / 2, w = (c - c0) * g.cell - g.cell * 0.12, y = g.y(r);
        var v = 0.4 + 0.14 * (1 - r / g.R) + ctx.rnd() * 0.06, dz = (ctx.rnd() < 0.12 ? g.cell * 0.8 : 0);
        m.cube(x, y, d / 2 + dz, w, h, d, ctx.tone('a', v));
        if (w > bev * 3) m.cube(x, y, d + dz + bev / 2, w - bev * 2, h - bev * 2, bev, ctx.tone('a', Math.min(1, v + 0.24)));
        for (var k = c0; k < c; k++) ctx.cells.push({ x: g.x(k), y: y, z: d + dz + bev, s: g.cell });
      }
    }
    m.point(0, 0, -90, 640, ctx.light('a'), 0.1, true);
  });

  // sheet 11, 05-02: the mark as horizontal glass plates, one per run of cells in a row, rows
  // stepping a little toward and away from the viewer by turns, a glowing accent seam under each
  // plate and a soft accent glow behind the whole mark
  A.register('s11-mark-ice', function (m, ctx) {
    var g = ctx.markGrid(ctx.num('rows', 34)), cc = ctx.light('c'), edge = ctx.tone('c', 0.95), h = g.cell * 0.8, d = g.cell * 1.6;
    for (var r = 0; r < g.R; r++) {
      var c = 0, z = d / 2 + (r % 2) * g.cell * 0.45;
      while (c < g.C) {
        if (g.cov(r, c) < 0.5 || !g.ok(r, c)) { c++; continue; }
        var c0 = c;
        while (c < g.C && g.cov(r, c) >= 0.5 && g.ok(r, c)) c++;
        var x = (g.x(c0) + g.x(c - 1)) / 2, w = (c - c0) * g.cell - g.cell * 0.14, y = g.y(r);
        m.glass(x, y, z, w, h, d, edge, 0.5 + ctx.rnd() * 0.3);
        m.bar(x, y - h / 2 - g.cell * 0.06, z, w * 0.94, 1.4, d * 0.5, cc, 0.3 + ctx.rnd() * 0.3);
        m.bar(x, y, z, w * 0.86, h * 0.16, d * 0.2, cc, 0.08 + ctx.rnd() * 0.08);
        for (var k = c0; k < c; k++) ctx.cells.push({ x: g.x(k), y: y, z: z + d / 2, s: g.cell });
      }
    }
    m.point(0, 0, -90, 600, cc, 0.14, true); m.point(0, 0, -90, 240, cc, 0.14, true);
  });

  // sheet 11, 05-03: the mark as facets. Edge cells lean outward like a bevel; the inside folds in a
  // diamond lattice, so the light catches it in bands. Coloured with the palette's light (--b)
  A.register('s11-mark-facet', function (m, ctx) {
    var g = ctx.markGrid(ctx.num('rows', 40)), s = g.cell * 0.97, d = g.cell * 2.2, size = 5 + Math.floor(ctx.rnd() * 3);
    var L = [-0.45, 0.6, 0.66], ln = Math.hypot(L[0], L[1], L[2]), cb = ctx.light('b');
    for (var r = 0; r < g.R; r++) for (var c = 0; c < g.C; c++) {
      if (g.cov(r, c) < 0.5 || !g.ok(r, c)) continue;
      var gx = g.cov(r, c + 1) - g.cov(r, c - 1), gy = g.cov(r - 1, c) - g.cov(r + 1, c), rx, ry;
      if (Math.abs(gx) > 0.3 || Math.abs(gy) > 0.3) { ry = -gx * 0.55; rx = gy * 0.55; }
      else {
        var u = Math.floor((c + r) / size) % 2 ? 1 : -1, w = Math.floor((c - r + 1000) / size) % 2 ? 1 : -1;
        ry = 0.26 * u; rx = 0.26 * w;
      }
      var n = rotE(0, 0, 1, [rx, ry, 0]), lit = Math.max(0, (n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / ln);
      var v = 0.3 + 0.62 * Math.pow(lit, 2.2) + ctx.rnd() * 0.04;
      m.cube(g.x(c), g.y(r), d / 2, s, s, d, ctx.tone('b', Math.min(1, v)), [rx, ry, 0]);
      ctx.cells.push({ x: g.x(c), y: g.y(r), z: d, s: g.cell });
      if (lit > 0.97 && ctx.rnd() < 0.08) m.point(g.x(c), g.y(r), d + 2, g.cell * 2.4, cb, 0.35, true);
    }
  });

  /* ================= 06-particles: small things in front ================= */

  // sheet 11, 08-01: small glass cubes, each hanging from a hairline that ends in a small ring
  A.register('s11-cube-pins', function (m, ctx) {
    var n = 4 + Math.floor(ctx.rnd() * 3), edge = ctx.tone('a', 0.95), ca = ctx.light('a'), cc = ctx.light('c');
    places(ctx, n, [-225, 300, -290, 170, 40, 120], 110, 30, 0.75).forEach(function (p, i) {
      var s = 13 + ctx.rnd() * 9, rise = topOf(s, ISO), h = 40 + ctx.rnd() * 40, top = p[1] + rise + h;
      if (!ctx.clearAt(p[0], top + 8, p[2], 16)) { h = 26; top = p[1] + rise + h; }
      m.glass(p[0], p[1], p[2], s, s, s, edge, 0.85, ISO);
      m.point(p[0], p[1], p[2], s * (i === 0 ? 3.4 : 2.2), i === 0 ? cc : ca, i === 0 ? 0.45 : 0.22, true);
      m.point(p[0], p[1] + rise, p[2], 3, ca, 1);
      m.line([p[0], p[1] + rise, p[2], p[0], top, p[2]], ca, 0.6);
      m.line(ctx.ring(5, 24, Math.PI / 2, 0, p[0], top + 5, p[2]), ca, 0.9, true);
    });
  });

  // sheet 11, 08-02: pairs of glass cubes joined by a glowing rod, a dot of light in each cube
  A.register('s11-cube-links', function (m, ctx) {
    var n = 3 + Math.floor(ctx.rnd() * 2), edge = ctx.tone('a', 0.95), cc = ctx.light('c'), ca = ctx.light('a');
    places(ctx, n, [-215, 250, -275, 220, 50, 120], 140, 34, 0.8).forEach(function (a, i) {
      var ang = (ctx.rnd() - 0.5) * 1.1 + (ctx.rnd() < 0.5 ? 0 : Math.PI), L = 46 + ctx.rnd() * 22;
      var b = [a[0] + Math.cos(ang) * L, a[1] + Math.sin(ang) * L * 0.7, a[2] + (ctx.rnd() - 0.5) * 30];
      if (!ctx.clearAt(b[0], b[1], b[2], 26)) b = [a[0] - (b[0] - a[0]), a[1] - (b[1] - a[1]), b[2]];
      var s = 16 + ctx.rnd() * 8, col = i % 2 ? ca : cc;
      [a, b].forEach(function (p) {
        m.glass(p[0], p[1], p[2], s, s, s, edge, 0.85, ISO);
        m.point(p[0], p[1], p[2], 4, col, 1); m.point(p[0], p[1], p[2], s * 2.6, col, 0.28, true);
      });
      var d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], len = Math.hypot(d[0], d[1], d[2]), mid = mix(a, b, 0.5);
      m.rod(a[0], a[1], a[2], d, len, 1.6, col, 0.55);
      m.point(mid[0], mid[1], mid[2], 3, col, 1);
    });
  });

  // sheet 11, 15-02: a large glass cube resting on four small ones (a plus), two or three times
  A.register('s11-cube-clusters', function (m, ctx) {
    var n = 2 + Math.floor(ctx.rnd() * 2), edge = ctx.tone('a', 0.95), cc = ctx.light('c'), ca = ctx.light('a');
    places(ctx, n, [-215, 285, -265, 195, 60, 120], 180, 56, 0.85).forEach(function (p, i) {
      var s = 30 + ctx.rnd() * 10, q = s * 0.55, parts = [[0, q / 2, 0, s]];
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (o) { parts.push([o[0] * s * 0.55, -s / 2, o[1] * s * 0.55, q]); });
      parts.forEach(function (c) {
        var o = rotE(c[0], c[1], c[2], ISO);
        m.glass(p[0] + o[0], p[1] + o[1], p[2] + o[2], c[3], c[3], c[3], edge, 0.8, ISO);
      });
      m.point(p[0], p[1] + q / 2, p[2], s * 2.8, i === 0 ? cc : ca, i === 0 ? 0.42 : 0.22, true);
      m.point(p[0], p[1] + q / 2, p[2], 3.4, [1, 1, 1], 1);
    });
  });

  // sheet 11, 16-01: an S-shaped path of beads of mixed size, a node at each end
  A.register('s11-bead-path', function (m, ctx) {
    var ca = ctx.light('a'), cc = ctx.light('c'), f = ctx.rnd() < 0.5 ? 1 : -1, wob = 0.8 + ctx.rnd() * 0.4;
    var P = [[-212, -295 * f, 60], [270 * wob, -150 * f, 120], [-170 * wob, 150 * f, 40], [252, 185 * f, 90]];
    function B(t) {
      var u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
      return [0, 1, 2].map(function (k) { return a * P[0][k] + b * P[1][k] + c * P[2][k] + d * P[3][k]; });
    }
    var thread = [];
    for (var i = 0; i <= 90; i++) {
      var t = i / 90, p = B(t), s = 2.4 + 4.4 * Math.pow(ctx.rnd(), 2) * (0.6 + 0.4 * Math.sin(t * Math.PI));
      thread.push(p);
      if (i === 0 || i === 90) continue;
      m.point(p[0] + gauss(ctx) * 3, p[1] + gauss(ctx) * 3, p[2], s, ca, 0.55 + 0.45 * ctx.rnd());
      if (i % 6 === 3) m.point(p[0], p[1], p[2], s * 4, i % 18 === 3 ? cc : ca, 0.2, true);
    }
    m.line(flat(thread), ca, 0.22);
    node(m, P[0], ca, 8, 4, 0.35); node(m, P[3], cc, 8, 5, 0.45);
  });


  /* ================= 01-backdrop: far behind ================= */


  // sheet 11, 09-02: a hexagon of accent nodes, six spokes to a centre node, a faint inner hexagon
  A.register('s11-hex-graph', function (m, ctx) {
    var cc = ctx.light('c'), ca = ctx.light('a'), o = [82, 0, -220], R = 300, turn = ctx.rnd() < 0.5 ? 0 : Math.PI / 6, V = [], I = [];
    for (var i = 0; i < 6; i++) {
      var a = turn + i * Math.PI / 3 + Math.PI / 2;
      V.push([o[0] + R * Math.cos(a), o[1] + R * Math.sin(a), o[2]]);
      I.push([o[0] + R * 0.5 * Math.cos(a + Math.PI / 6), o[1] + R * 0.5 * Math.sin(a + Math.PI / 6), o[2]]);
    }
    for (i = 0; i < 6; i++) {
      var b = V[(i + 1) % 6];
      seg(m, V[i], b, cc, 0.3); dots(m, V[i], b, 11, 2, cc, 0.55);
      seg(m, o, V[i], ca, 0.22); dots(m, o, V[i], 16, 1.6, ca, 0.4);
      seg(m, I[i], I[(i + 1) % 6], ca, 0.14);
    }
    V.forEach(function (p) { if (ctx.clearAt(p[0], p[1], p[2], 18)) node(m, p, cc, 8, 5, 0.38); });
    node(m, o, ca, 10, 10, 0.3);
  });


  // sheet 11, 13-01: a four-pointed star of dots far behind, its arms reaching past the mark,
  // densest along the arms' spines and at the centre
  A.register('s11-astroid', function (m, ctx) {
    var o = [82, 0, -210], ca = ctx.light('a'), cc = ctx.light('c'), turn = (ctx.rnd() - 0.5) * 0.2;
    var arms = [[0, 1, 400], [0, -1, 400], [1, 0, 330], [-1, 0, 330]];
    for (var i = 0; i < 2200; i++) {
      var arm = arms[i % 4], t = Math.pow(ctx.rnd(), 0.75), len = arm[2] * t, wide = (1 - t) * (1 - t) * 120 + 4;
      var side = gauss(ctx) * wide, x = arm[0] * len - arm[1] * side, y = arm[1] * len + arm[0] * side;
      var c = Math.cos(turn), s = Math.sin(turn), core = 1 - t;
      m.point(o[0] + x * c - y * s, o[1] + x * s + y * c, o[2] + gauss(ctx) * 40, 1.4 + ctx.rnd() * 1.4 + core * 1.2, ctx.rnd() < 0.12 ? cc : ca, 0.2 + 0.55 * core + 0.25 * ctx.rnd());
    }
    for (var k = 0; k < 4; k++) m.quad(o[0], o[1], o[2], turn + k * Math.PI / 2, 2, (k % 2 ? 330 : 400) * 0.9, ca, 0.35, 'fade');   // up, left, down, right
    m.point(o[0], o[1], o[2], 140, cc, 0.3, true); m.point(o[0], o[1], o[2], 12, [1, 1, 1], 0.95, true);
  });

  // a square plane seen from above: a wire grid, a dot grid, or both. Turned by yaw about the
  // vertical, then tipped back by pitch so the near edge sits lower. A gentle swell runs over it.
  function deck(m, ctx, o, half, n, kind, yaw, pitch, warp, col, alpha) {
    var ph = ctx.rnd() * TAU;
    function P(u, v) {
      var x = u * half, z = v * half, y = warp * Math.sin(u * 3 + ph) * Math.cos(v * 2.6 + ph);
      var c = Math.cos(yaw), s = Math.sin(yaw), x1 = x * c + z * s, z1 = -x * s + z * c;
      var cp = Math.cos(pitch), sp = Math.sin(pitch);
      return [x1 + o[0], y * cp - z1 * sp + o[1], y * sp + z1 * cp + o[2]];
    }
    for (var i = 0; i <= n; i++) {
      var a = [], b = [], t = i / n * 2 - 1;
      for (var k = 0; k <= 24; k++) { var w = k / 24 * 2 - 1; a.push(P(t, w)); b.push(P(w, t)); }
      if (kind !== 'dots') { m.line(flat(a), col, alpha); m.line(flat(b), col, alpha); }
      else if (i === 0 || i === n) { m.line(flat(a), col, alpha * 0.4); m.line(flat(b), col, alpha * 0.4); }
      for (var j = 0; j <= n; j++) { var p = P(t, j / n * 2 - 1); m.point(p[0], p[1], p[2], kind === 'dots' ? 2.4 : 1.8, col, kind === 'dots' ? 0.75 : 0.5); }
    }
    return P(0, 0);
  }

  // sheet 11, 14-01: two stacked planes seen from above, far behind: a wire grid over a dot grid
  A.register('s11-grid-decks', function (m, ctx) {
    var yaw = Math.PI / 4 + (ctx.rnd() - 0.5) * 0.3, cb = ctx.light('b'), ca = ctx.light('a');
    deck(m, ctx, [86, 150, -290], 215, 9, 'wire', yaw, 0.5, 9, cb, 0.48);
    deck(m, ctx, [86, -175, -290], 215, 9, 'dots', yaw, 0.5, 9, ca, 0.8);
  });

  // sheet 11, 15-03: a cluster of glass towers of mixed height on a faint ground grid, far behind
  A.register('s11-glass-city', function (m, ctx) {
    var edge = ctx.tone('b', 0.95), cc = ctx.light('c'), ca = ctx.light('a'), yaw = Math.PI / 4 + (ctx.rnd() - 0.5) * 0.2, base = -330, o = [92, 0, -270], p = 104;
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    function at(x, z) { return [o[0] + x * cy + z * sy, -x * sy + z * cy + o[2]]; }
    for (var i = 0; i < 5; i++) for (var j = 0; j < 4; j++) {
      if (ctx.rnd() < 0.18) continue;
      var lx = (i - 2) * p + (ctx.rnd() - 0.5) * 20, lz = (j - 1.5) * p + (ctx.rnd() - 0.5) * 20, q = at(lx, lz);
      var centre = 1 - Math.min(1, Math.hypot(lx, lz) / 300), w = 38 + ctx.rnd() * 26, h = 70 + (180 + 380 * centre) * (0.35 + 0.65 * ctx.rnd());
      m.glass(q[0], base + h / 2, q[1], w, h, w, edge, 0.45 + ctx.rnd() * 0.35, [0, yaw, 0]);
      if (ctx.rnd() < 0.5) m.bar(q[0], base + h * 0.45, q[1], 3, h * 0.8, 3, cc, 0.1 + ctx.rnd() * 0.14, [0, yaw, 0]);
      m.point(q[0], base + h, q[1], 3.2, ca, 0.9);
      if (ctx.rnd() < 0.25) m.point(q[0], base + h, q[1], 40, cc, 0.25, true);
    }
    for (var k = -3; k <= 3; k++) {
      var a = at(k * p * 0.9, -3 * p), b = at(k * p * 0.9, 3 * p), c = at(-3 * p, k * p * 0.9), d = at(3 * p, k * p * 0.9);
      m.line([a[0], base, a[1], b[0], base, b[1]], ca, 0.1); m.line([c[0], base, c[1], d[0], base, d[1]], ca, 0.1);
    }
  });

  // sheet 11, 17-01: a tall arch of light, two faint echoes inside it, a curtain of dots beneath
  A.register('s11-curtain', function (m, ctx) {
    var o = [82, -345, -235], RX = 300 + ctx.rnd() * 30, RY = 640 + ctx.rnd() * 40, lean = (ctx.rnd() - 0.5) * 0.25;
    var cb = ctx.light('b'), ca = ctx.light('a'), cc = ctx.light('c');
    function A2(a, k) { var x = (RX - k * 16) * Math.cos(a), y = (RY - k * 22) * Math.sin(a); return [o[0] + x + y * lean * 0.3, o[1] + y, o[2]]; }
    for (var k = 0; k < 3; k++) {
      var pts = [];
      for (var i = 0; i <= 140; i++) pts.push(A2(Math.PI * i / 140, k));
      m.line(flat(pts), k ? ca : cb, [0.8, 0.36, 0.2][k]);
      if (!k) pts.forEach(function (p, j) { if (j % 2 === 0) m.point(p[0], p[1], p[2], 3, cb, 0.75 + 0.25 * Math.sin(Math.PI * j / 140)); if (j % 10 === 5) m.point(p[0], p[1], p[2], 22, cb, 0.18, true); });
    }
    for (var gx = -RX + 14; gx < RX; gx += 22) for (var gy = 12; gy < RY; gy += 22) {
      var e = (gx / RX) * (gx / RX) + (gy / RY) * (gy / RY);
      if (e > 0.9 || ctx.rnd() < 0.12) continue;
      m.point(o[0] + gx + gy * lean * 0.3, o[1] + gy, o[2], 1.8 + ctx.rnd() * 1, ca, (0.2 + 0.55 * e) * (0.6 + 0.4 * ctx.rnd()));
    }
    var apex = A2(Math.PI / 2, 0);
    m.point(apex[0], apex[1], apex[2], 110, cc, 0.22, true);
  });

  // sheet 11, 24-01 and 24-02: a stepped pyramid far behind the mark. data-as="solid" stacks dark
  // slabs with lit rims and a pointed top; data-as="glass" stacks glass steps with a glass cube on top
  A.register('s11-ziggurat', function (m, ctx) {
    var glass = ctx.P.as === 'glass', yaw = Math.PI / 4 + (ctx.rnd() - 0.5) * 0.25, o = [92, -318, -275], steps = 4, w0 = 400, hs = 78;
    var ca = ctx.light('a'), cc = ctx.light('c'), edge = ctx.tone(glass ? 'c' : 'a', 0.95), y = o[1], w = w0;
    function rim(w, y, a) {
      var pts = [];
      [[1, 1], [1, -1], [-1, -1], [-1, 1]].forEach(function (q) { var r = rotE(q[0] * w / 2, 0, q[1] * w / 2, [0, yaw, 0]); pts.push(o[0] + r[0], y, o[2] + r[2]); });
      m.line(pts, ca, a, true);
    }
    for (var k = 0; k < steps; k++) {
      w = w0 * (1 - k * 0.22);
      if (glass) m.glass(o[0], y + hs / 2, o[2], w, hs * 0.92, w, edge, 0.7, [0, yaw, 0]);
      else { m.cube(o[0], y + hs / 2, o[2], w, hs * 0.94, w, ctx.tone('a', 0.12 + k * 0.04), [0, yaw, 0]); rim(w, y + hs * 0.97, 0.5); }
      y += hs;
    }
    if (glass) {
      var s = w * 0.5;
      m.glass(o[0], y + s * 0.7, o[2], s, s, s, edge, 0.9, [0.6, yaw, 0]);
      m.point(o[0], y + s * 0.7, o[2], 6, [1, 1, 1], 1); m.point(o[0], y + s * 0.7, o[2], 120, cc, 0.3, true);
    } else {
      for (var j = 0; j < 7; j++) { var ww = w * 0.62 * (1 - j / 7); m.cube(o[0], y + j * 9 + 4.5, o[2], ww, 9, ww, ctx.tone('a', 0.2 + j * 0.06), [0, yaw, 0]); }
      m.point(o[0], y + 66, o[2], 5, ca, 1); m.point(o[0], y + 66, o[2], 90, cc, 0.22, true);
    }
  });



  /* ================= 03-aura: around the mark ================= */

  // sheet 11, 09-01: two diamond graphs stacked on one vertical axis, sharing their middle node
  A.register('s11-diamond-graph', function (m, ctx) {
    var ca = ctx.light('a'), cc = ctx.light('c'), phi = ctx.rnd() * Math.PI / 2, ax = 0.22 + ctx.rnd() * 0.1, R = 215, H = 148, z0 = -30;
    function P(x, y, z) { var c = Math.cos(phi), s = Math.sin(phi), t = tilt([x * c + z * s, y, -x * s + z * c], ax, 0); return [t[0] + 20, t[1], t[2] + z0]; }
    var top = P(0, 2 * H, 0), mid = P(0, 0, 0), bot = P(0, -2 * H, 0), up = [], dn = [];
    for (var i = 0; i < 4; i++) { var a = i * Math.PI / 2; up.push(P(R * Math.cos(a), H, R * Math.sin(a))); dn.push(P(R * Math.cos(a), -H, R * Math.sin(a))); }
    function edge(a, b) { var far = (a[2] + b[2]) / 2 < z0; seg(m, a, b, ca, far ? 0.16 : 0.38); dots(m, a, b, 10, 1.7, ca, far ? 0.25 : 0.6); }
    for (i = 0; i < 4; i++) {
      edge(top, up[i]); edge(mid, up[i]); edge(up[i], up[(i + 1) % 4]);
      edge(bot, dn[i]); edge(mid, dn[i]); edge(dn[i], dn[(i + 1) % 4]);
    }
    seg(m, top, bot, ca, 0.3);
    [top, bot].concat(up, dn).forEach(function (p) { node(m, p, ca, p[2] < z0 ? 4.5 : 6.5, 4.5, p[2] < z0 ? 0.2 : 0.4); });
    node(m, mid, cc, 9, 8, 0.45);
  });


  // sheet 11, 09-03: a flat net of triangles facing the viewer behind the mark, cut to a
  // six-pointed star; glowing nodes at its corners, a few larger, two in the accent
  A.register('s11-tri-mesh', function (m, ctx) {
    var o = [44, 0, -110], S = 62, Rs = 345, turn = (ctx.rnd() - 0.5) * 0.2, cb = ctx.light('b'), ca = ctx.light('a'), cc = ctx.light('c'), pts = {};
    function inTri(x, y, flip) {
      var v = [];
      for (var i = 0; i < 3; i++) { var a = turn + Math.PI / 2 + i * TAU / 3 + (flip ? Math.PI : 0); v.push([Rs * Math.cos(a), Rs * Math.sin(a)]); }
      var s0 = Math.sign((v[1][0] - v[0][0]) * (y - v[0][1]) - (v[1][1] - v[0][1]) * (x - v[0][0]));
      for (i = 1; i < 3; i++) { var a2 = v[i], b2 = v[(i + 1) % 3]; if (Math.sign((b2[0] - a2[0]) * (y - a2[1]) - (b2[1] - a2[1]) * (x - a2[0])) !== s0) return false; }
      return true;
    }
    for (var r = -7; r <= 7; r++) for (var q = -8; q <= 8; q++) {
      var x = (q + (r & 1) * 0.5) * S, y = r * S * 0.866;
      if (!inTri(x, y, false) && !inTri(x, y, true)) continue;
      pts[r + ',' + q] = [o[0] + x + (ctx.rnd() - 0.5) * 18, o[1] + y + (ctx.rnd() - 0.5) * 18, o[2] + (ctx.rnd() - 0.5) * 40];
    }
    Object.keys(pts).forEach(function (k) {
      var rq = k.split(','), r = +rq[0], q = +rq[1], p = pts[k], odd = r & 1;
      [[r, q + 1], [r + 1, q + (odd ? 1 : 0)], [r + 1, q + (odd ? 0 : -1)]].forEach(function (n) {
        var b = pts[n[0] + ',' + n[1]];
        if (b && ctx.rnd() > 0.1) seg(m, p, b, cb, 0.26);
      });
      var big = ctx.rnd() < 0.12;
      m.point(p[0], p[1], p[2], big ? 5 : 3, big ? cb : ca, big ? 1 : 0.8);
      if (big) m.point(p[0], p[1], p[2], 26, cb, 0.32, true);
    });
    var keys = Object.keys(pts);
    for (var h = 0; h < 2; h++) node(m, pts[keys[Math.floor(ctx.rnd() * keys.length)]], cc, 6, 6, 0.45);
  });

  // sheet 11, 10-01: a twisted band round the mark: a ribbon whose width turns half a turn on the
  // way round (a Mobius strip). Its two edges are one line; short rungs show the band's face
  A.register('s11-mobius', function (m, ctx) {
    var R = 268, w = 26, ax = 0.3 + ctx.rnd() * 0.12, az = (ctx.rnd() - 0.5) * 0.5, ph = ctx.rnd() * TAU, N = 360;
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), e1 = [], e2 = [];
    for (var i = 0; i < N; i++) {
      var t = i / N * TAU, k = (t + ph) / 2, ct = Math.cos(t), st = Math.sin(t);
      var dir = [ct * Math.cos(k), Math.sin(k), st * Math.cos(k)], c = [R * ct, 0, R * st];
      var p1 = tilt([c[0] + dir[0] * w, c[1] + dir[1] * w, c[2] + dir[2] * w], ax, az), p2 = tilt([c[0] - dir[0] * w, c[1] - dir[1] * w, c[2] - dir[2] * w], ax, az);
      e1.push(p1); e2.push(p2);
      if (i % 4 === 0) seg(m, p1, p2, cb, (p1[2] + p2[2]) > 0 ? 0.3 : 0.1);
    }
    depthLine(m, e1.concat(e2), 0, ca, 0.6, 0.2, true);
    for (i = 0; i < 3; i++) { var q = e1[Math.floor(ctx.rnd() * N)]; node(m, q, cc, 5, 6, 0.4); }
  });

  // sheet 11, 10-02: a ring threaded with beads: glass beads and small loops wrapped round the band
  A.register('s11-bead-ring', function (m, ctx) {
    var R = 285, ax = 0.28 + ctx.rnd() * 0.12, az = (ctx.rnd() - 0.5) * 0.6, cb = ctx.light('b'), ca = ctx.light('a'), cc = ctx.light('c');
    m.line(ctx.ring(R, 220, ax, az), cb, 0.5, true);
    m.line(ctx.ring(R + 7, 220, ax, az), cb, 0.16, true);
    var n = 9 + Math.floor(ctx.rnd() * 4), off = ctx.rnd() * TAU;
    for (var i = 0; i < n; i++) {
      var t = off + (i + (ctx.rnd() - 0.5) * 0.3) / n * TAU, ct = Math.cos(t), st = Math.sin(t), p = tilt([R * ct, 0, R * st], ax, az), loop = [];
      for (var k = 0; k < 20; k++) {
        var s = k / 20 * TAU, q = tilt([(R + 9 * Math.cos(s)) * ct, 9 * Math.sin(s), (R + 9 * Math.cos(s)) * st], ax, az);
        loop.push(q[0], q[1], q[2]);
      }
      if (i % 3 === 0) m.sphere(p[0], p[1], p[2], 8, i === 0 ? cc : ca, 0.9);
      else { m.line(loop, ca, p[2] > 0 ? 0.8 : 0.35, true); m.point(p[0], p[1], p[2], 3.5, ca, 1); }
    }
  });

  // sheet 11, 10-03: a spring wound round a ring (a coil bent into a loop), a few accent beads on it
  A.register('s11-winding', function (m, ctx) {
    var R = 250, r = 20, turns = 44 + Math.floor(ctx.rnd() * 10), ax = 0.3 + ctx.rnd() * 0.1, az = (ctx.rnd() - 0.5) * 0.5, N = 1400;
    var cb = ctx.light('b'), cc = ctx.light('c'), pts = [];
    for (var i = 0; i < N; i++) {
      var t = i / N * TAU, s = t * turns, ct = Math.cos(t), st = Math.sin(t), p = tilt([(R + r * Math.cos(s)) * ct, r * Math.sin(s), (R + r * Math.cos(s)) * st], ax, az);
      pts.push(p);
      if (i % 7 === 0) m.point(p[0], p[1], p[2], p[2] > 0 ? 2.2 : 1.6, cb, p[2] > 0 ? 0.8 : 0.3);
    }
    depthLine(m, pts, 0, cb, 0.42, 0.14, true);
    m.line(ctx.ring(R, 200, ax, az), cb, 0.12, true);
    for (var k = 0; k < 6; k++) { var q = pts[Math.floor(ctx.rnd() * N)]; node(m, q, cc, 5, 6, 0.42); }
  });


  // sheet 11, 15-01: a wire box round the mark: dotted edges, a glowing node at every corner, a
  // short line from each corner toward the middle, and a spark on two corners
  A.register('s11-wire-box', function (m, ctx) {
    var hx = 165, hy = 262, hz = 105, rot = [0.1 + ctx.rnd() * 0.06, 0.3 + ctx.rnd() * 0.25, 0], o = [0, 0, -70], ca = ctx.light('a'), cc = ctx.light('c'), V = [];
    for (var i = 0; i < 8; i++) V.push(add(o, rotE(i & 1 ? hx : -hx, i & 2 ? hy : -hy, i & 4 ? hz : -hz, rot)));
    [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(function (e) {
      var a = V[e[0]], b = V[e[1]], near = (a[2] + b[2]) / 2 > o[2];
      seg(m, a, b, ca, near ? 0.42 : 0.18); dots(m, a, b, 12, 1.6, ca, near ? 0.6 : 0.25);
    });
    var sparks = [Math.floor(ctx.rnd() * 8)];
    sparks.push((sparks[0] + 3) % 8);
    V.forEach(function (p, k) {
      var near = p[2] > o[2];
      node(m, p, ca, near ? 5 : 3.5, 5, near ? 0.38 : 0.18);
      seg(m, p, mix(p, o, 0.14), ca, 0.22);
      if (sparks.indexOf(k) >= 0) {
        m.point(p[0], p[1], p[2], 30, cc, 0.5, true);
        for (var a = 0; a < 4; a++) m.quad(p[0], p[1], p[2], a * Math.PI / 2, 1.2, 26, cc, 0.8, 'fade');
      }
    });
  });

  // sheet 11, 16-03: a spiral that swells round the middle of a vertical axis (a barrel), with
  // hexagon nodes on the axis
  A.register('s11-spring', function (m, ctx) {
    var cb = ctx.light('b'), cc = ctx.light('c'), ca = ctx.light('a'), turns = 5 + Math.floor(ctx.rnd() * 2), ph = ctx.rnd() * TAU, N = 900, z0 = -30, tx = 0.18, x0 = 16, pts = [];
    for (var i = 0; i < N; i++) {
      var t = i / (N - 1), rad = 70 + 200 * Math.sin(Math.PI * t), a = ph + t * turns * TAU;
      var p = tilt([rad * Math.cos(a), -300 + t * 600, rad * Math.sin(a)], tx, 0);
      p = [p[0] + x0, p[1], p[2] + z0]; pts.push(p);
      if (i % 6 === 0) m.point(p[0], p[1], p[2], p[2] > z0 ? 2.4 : 1.6, cb, p[2] > z0 ? 0.85 : 0.3);
    }
    depthLine(m, pts, z0, cb, 0.4, 0.14);
    var a0 = tilt([0, -330, 0], tx, 0), a1 = tilt([0, 330, 0], tx, 0);
    m.line([a0[0] + x0, a0[1], a0[2] + z0, a1[0] + x0, a1[1], a1[2] + z0], ca, 0.32);
    [-300, 0, 300].forEach(function (y, k) {
      var q = tilt([0, y, 0], tx, 0), p = [q[0] + x0, q[1], q[2] + z0];
      hexagon(m, p, 15, k === 1 ? cc : ca, 0.85);
      if (k === 1) node(m, p, cc, 6, 7, 0.45); else m.point(p[0], p[1], p[2], 3, ca, 1);
    });
  });

  // sheet 11, 18-01 and 18-03: segmented towers with lit tips, standing on a dotted base below the
  // mark, tallest at the back. data-base="ring" stands them on a ring, "spiral" on a narrowing spiral
  A.register('s11-towers', function (m, ctx) {
    var spiral = ctx.P.base === 'spiral', cb = ctx.light('b'), ca = ctx.light('a'), cc = ctx.light('c'), ax = 0.3, y0 = spiral ? -228 : -240, R = spiral ? 215 : 240, off = ctx.rnd() * TAU;
    function at(t, r) { var p = tilt([r * Math.cos(t), 0, r * Math.sin(t)], ax, 0); return [p[0] + 15, p[1] + y0, p[2] - 20]; }
    var base = [], i;
    if (spiral) for (i = 0; i <= 540; i++) { var u = i / 540; base.push(at(off + u * 3 * TAU, R * (1 - 0.72 * u))); }
    else {
      for (i = 0; i < 240; i++) base.push(at(i / 240 * TAU, R));
      for (i = 0; i < 150; i++) if (i % 2 === 0) { var q = at(i / 150 * TAU, R * 0.62); m.point(q[0], q[1], q[2], 1.6, cb, 0.4); }
    }
    depthLine(m, base, -20, cb, 0.45, 0.16, !spiral);
    base.forEach(function (p, k) { if (k % 3 === 0) m.point(p[0], p[1], p[2], 1.8, cb, p[2] > -20 ? 0.8 : 0.3); });
    var n = spiral ? 8 : 7;
    for (var k = 0; k < n; k++) {
      var t, r;
      if (spiral) { var v = (k + 0.5) / n; t = off + v * 3 * TAU; r = R * (1 - 0.72 * v); } else { t = off + k / n * TAU; r = R; }
      var p = at(t, r), back = 0.5 - 0.5 * Math.sin(t), h = Math.min(300 - p[1], 120 + 420 * (0.35 + 0.65 * back) * (0.7 + 0.3 * ctx.rnd())), segs = 3 + Math.floor(h / 110), sl = h / segs;
      for (var j = 0; j < segs; j++) m.bar(p[0], p[1] + j * sl + sl / 2, p[2], 4, sl - 7, 4, cb, 0.6 - 0.05 * j);
      var tip = p[1] + h, hot = k === 0;
      m.quad(p[0], tip, p[2], 0, 1.6, 44, hot ? cc : ca, 0.8, 'fade');
      node(m, [p[0], tip, p[2]], hot ? cc : ca, hot ? 7 : 5.5, 6, hot ? 0.55 : 0.4);
      m.line(ctx.ring(11, 28, ax, 0, p[0], p[1], p[2]), ca, 0.6, true);
      m.point(p[0], p[1], p[2], 3, ca, 1);
    }
  });

  // sheet 11, 19-01: two segmented bands facing the viewer behind the mark. Four segments of each
  // band are lit, evenly spaced round it, so it reads as a pattern and never as a level
  A.register('s11-segment-wheel', function (m, ctx) {
    var o = [46, 0, -120], ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), turn = ctx.rnd() * TAU;
    function P(r, a) { return [o[0] + r * Math.sin(a), o[1] + r * Math.cos(a), o[2]]; }
    [[268, 300, 12, 1], [224, 254, 8, -1]].forEach(function (b) {
      var n = b[2], every = n / 4, gap = 0.035;
      for (var k = 0; k < n; k++) {
        var a0 = turn * b[3] + k / n * TAU + gap, a1 = turn * b[3] + (k + 1) / n * TAU - gap, outer = [], inner = [];
        for (var i = 0; i <= 24; i++) { var a = a0 + (a1 - a0) * i / 24; outer.push(P(b[1], a)); inner.unshift(P(b[0], a)); }
        m.line(flat(outer.concat(inner)), ca, 0.4, true);
        if (k % every === 0) {
          for (var h = a0 + 0.012; h < a1; h += 0.022) seg(m, P(b[0] + 3, h), P(b[1] - 3, h), cb, 0.4);
          var mid = P((b[0] + b[1]) / 2, (a0 + a1) / 2);
          m.point(mid[0], mid[1], mid[2], 40, cb, 0.2, true);
        }
      }
    });
    for (var t = 0; t < 72; t++) { var a = t / 72 * TAU; seg(m, P(312, a), P(t % 6 ? 318 : 324, a), ca, t % 6 ? 0.22 : 0.45); }
    m.point(o[0], o[1], o[2], 150, cc, 0.16, true);
  });


  // sheet 11, 26-02: a wire globe round the mark: eight meridians and five parallels, near halves
  // brighter, a dotted equator and lit poles
  A.register('s11-meridians', function (m, ctx) {
    var R = 282, o = [12, 0, -60], ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), ax = 0.28 + ctx.rnd() * 0.1, az = 0.18 + (ctx.rnd() - 0.5) * 0.2, spin = ctx.rnd() * Math.PI;
    function P(lat, lon) { return add(o, tilt([R * Math.cos(lat) * Math.cos(lon), R * Math.sin(lat), R * Math.cos(lat) * Math.sin(lon)], ax, az)); }
    var i, k, pts;
    for (k = 0; k < 8; k++) { pts = []; for (i = 0; i < 160; i++) pts.push(P(i / 160 * TAU, spin + k * Math.PI / 8)); depthLine(m, pts, o[2], ca, 0.42, 0.12, true); }
    [-60, -30, 30, 60].forEach(function (d) { pts = []; for (i = 0; i < 160; i++) pts.push(P(d * Math.PI / 180, i / 160 * TAU)); depthLine(m, pts, o[2], ca, 0.36, 0.1, true); });
    for (i = 0; i < 120; i++) { var q = P(0, i / 120 * TAU), near = q[2] > o[2]; m.point(q[0], q[1], q[2], near ? 2.6 : 1.6, cb, near ? 0.9 : 0.3); }
    node(m, P(Math.PI / 2, 0), cc, 5, 6, 0.4); node(m, P(-Math.PI / 2, 0), cc, 5, 6, 0.4);
  });

  /* ================= 05-signal: light ================= */

  // sheet 11, 17-02 and 17-03: one bundle of parallel curves sweeping up across the art behind the
  // mark, close together in the middle and fanning at the ends, short dashes of light riding them
  A.register('s11-lanes', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), dir = ctx.rnd() < 0.5 ? 1 : -1, cx = 40 + (ctx.rnd() - 0.5) * 80, cy = (ctx.rnd() - 0.5) * 80;
    var n = 9, amp = 240 + ctx.rnd() * 40;
    for (var k = 0; k < n; k++) {
      var off = k - (n - 1) / 2, z = -120 + k * 7, pts = [], core = off === 0;
      for (var i = 0; i <= 90; i++) {
        var x = -200 + i / 90 * 530, u = (x - cx) / 170;
        pts.push([x, cy + dir * amp * Math.tanh((x - cx) / 160) + off * (6 + 16 * Math.min(1, u * u)), z]);
      }
      m.line(flat(pts), core ? cb : ca, core ? 0.62 : 0.14 + 0.16 * (1 - Math.abs(off) / n));
      for (var j = 0; j < 3; j++) {
        var s0 = Math.floor(ctx.rnd() * 84), dash = pts.slice(s0, s0 + 3 + Math.floor(ctx.rnd() * 4));
        if (dash.length > 1 && ctx.clearAt(dash[0][0], dash[0][1], z, 8)) m.line(flat(dash), core ? cc : cb, 0.85);
      }
    }
    m.point(cx, cy, -100, 130, cc, 0.22, true);
  });

  // sheet 11, 20-01: a rising trail of glass cubes on a hairline, larger and brighter as it climbs,
  // each on a vertical line of light, with a few stray lines between
  A.register('s11-trail', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), edge = ctx.tone('a', 0.95), n = 6, pts = [];
    var x0 = -205, y0 = -235 + ctx.rnd() * 60, x1 = 262, y1 = 150 + ctx.rnd() * 40;
    for (var k = 0; k < n; k++) {
      var u = k / (n - 1);
      pts.push([x0 + u * (x1 - x0) + (ctx.rnd() - 0.5) * 30, y0 + u * (y1 - y0) + (k % 2 ? 1 : -0.5) * 30 * ctx.rnd(), 40 + (ctx.rnd() - 0.5) * 40]);
    }
    m.line(flat(pts), ca, 0.5);
    for (k = 0; k < n - 1; k++) dots(m, pts[k], pts[k + 1], 9, 1.4, ca, 0.5);
    function upLight(x, y, z, len, rgb, a) {
      while (len > 20 && !ctx.clearAt(x, y + len, z, 10)) len -= 10;
      m.quad(x, y, z, 0, 1.2, len, rgb, a, 'fade');
      for (var i = 1; i <= 3; i++) if (ctx.rnd() < 0.6) m.point(x, y + len * i / 4, z, 1.8, rgb, 0.7);
    }
    pts.forEach(function (p, i) {
      var u = i / (n - 1), s = 10 + u * 14, last = i === n - 1, rise = topOf(s, ISO);
      m.glass(p[0], p[1], p[2], s, s, s, edge, 0.9, ISO);
      m.point(p[0], p[1], p[2], s * (last ? 3.6 : 2.2), last ? cc : ca, last ? 0.55 : 0.25, true);
      m.point(p[0], p[1], p[2], 3, [1, 1, 1], 1);
      upLight(p[0], p[1] + rise, p[2], 60 + ctx.rnd() * 200, cb, 0.45);
      m.quad(p[0], p[1] - rise, p[2], Math.PI, 1.2, 40 + ctx.rnd() * 160, cb, 0.3, 'fade');
    });
    for (var j = 0; j < 4; j++) {
      var a = Math.floor(ctx.rnd() * (n - 1)), q = mix(pts[a], pts[a + 1], 0.3 + ctx.rnd() * 0.4);
      upLight(q[0], q[1] + 20, q[2], 40 + ctx.rnd() * 120, ca, 0.3);
    }
  });
})();

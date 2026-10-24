/* Sheet 9: the amber HUD. White and grey light with amber accents. Under the Ember, Copper or Amber
   palette, ctx.light('c') and ctx.light('b') turn amber; ctx.tone('a', v) stays near white.

   Every builder here works around the mark's centre (the origin), stays inside x -240..320 and
   y -340..340, and keeps its dots and lines behind the mark (z < 0) or thin, so the mark stays the
   brightest thing on the card. Every random value comes from ctx.rnd(). */
(function () {
  'use strict';
  var A = window.Art3D;
  var TAU = Math.PI * 2;

  function gauss(x, c, w) { var d = (x - c) / w; return Math.exp(-d * d); }

  /* backdrop: a dot-matrix mountain behind the mark (piece 06). Columns of dots fill the space under
     a ridge line: a high peak in the middle and two lower peaks at the flanks, which stand clear of
     the mark. The top dot of each column is amber and glows; the dots below it fade toward the base.
     A second, fainter range sits further back. */
  A.register('s9-summit', function (m, ctx) {
    var cc = ctx.light('c'), base = -338, ph = ctx.rnd() * 6;
    var peaks = [[(ctx.rnd() - 0.5) * 40, 560, 110], [-215 - ctx.rnd() * 20, 300 + ctx.rnd() * 60, 44], [298 + ctx.rnd() * 18, 380 + ctx.rnd() * 70, 40]];
    [{ z: -110, step: 8, k: 1, a: 1 }, { z: -230, step: 11, k: 0.72, a: 0.42 }].forEach(function (rg, j) {
      for (var x = -240 + j * 4; x <= 318; x += rg.step) {
        var h = 34 + 14 * Math.sin(x * 0.08 + ph + j) + ctx.rnd() * 18;
        peaks.forEach(function (p) { h += rg.k * p[1] * gauss(x, p[0] - j * 24, p[2]); });
        var n = Math.max(1, Math.round(h / rg.step)), lift = Math.min(1, n / 18);
        for (var i = 0; i < n; i++) {
          var y = base + i * rg.step, t = (i + 1) / n;
          if (i === n - 1) {
            m.point(x, y, rg.z, 4.4, cc, rg.a * (0.45 + 0.55 * lift));
            if (j === 0 && lift > 0.5) m.point(x, y, rg.z, 20, cc, 0.14, true);
          } else {
            m.point(x, y, rg.z, 2.3, t > 0.85 ? cc : ctx.tone('a', 0.55 + 0.35 * t), rg.a * (0.1 + 0.7 * t * t));
          }
        }
      }
    });
  });

  /* aura: a target around the mark (piece 10), turned a little about the vertical so it reads as a
     plane in space. An amber circle with ticks inside it, a dotted outer ring, the four arms of a
     crosshair outside the ring, glass squares at its sides, and a square frame at the centre, behind
     the mark, that shows through the mark's gaps. */
  A.register('s9-bullseye', function (m, ctx) {
    var cc = ctx.light('c'), ca = ctx.tone('a', 0.92);
    var ox = 30 + ctx.rnd() * 10, oy = (ctx.rnd() - 0.5) * 24, z0 = -90, yaw = 0.42 + ctx.rnd() * 0.12;
    var cyw = Math.cos(yaw), syw = Math.sin(yaw);
    function at(u, v, dz) { return [ox + u * cyw, oy + v, z0 - u * syw + (dz || 0)]; }
    function circle(r, n) {
      var p = [];
      for (var i = 0; i < n; i++) { var t = i / n * TAU, q = at(r * Math.cos(t), r * Math.sin(t)); p.push(q[0], q[1], q[2]); }
      return p;
    }
    var R = 262, N = 240, pts = circle(R, N);
    m.line(pts, cc, 0.85, true);
    for (var i = 0; i < N; i += 2) {
      var a = i * 3, b = ((i + 2) % N) * 3, d = [pts[b] - pts[a], pts[b + 1] - pts[a + 1], pts[b + 2] - pts[a + 2]];
      m.rod(pts[a], pts[a + 1], pts[a + 2], d, Math.hypot(d[0], d[1], d[2]), 3, cc, 0.3);
    }
    // ticks inside the amber circle: one every 6 degrees, a longer one every 30
    for (var j = 0; j < 60; j++) {
      var u = j / 60 * TAU, long = j % 5 === 0, p0 = at((R - 8) * Math.cos(u), (R - 8) * Math.sin(u)), p1 = at((R - (long ? 26 : 16)) * Math.cos(u), (R - (long ? 26 : 16)) * Math.sin(u));
      m.line([p0[0], p0[1], p0[2], p1[0], p1[1], p1[2]], long ? cc : ca, long ? 0.8 : 0.4);
    }
    // the dotted outer ring
    var R2 = 290, off = ctx.rnd() * 0.04;
    for (var k = 0; k < 170; k++) {
      var t = off + k / 170 * TAU, q = at(R2 * Math.cos(t), R2 * Math.sin(t));
      m.point(q[0], q[1], q[2], 2.4, ca, 0.55 + ctx.rnd() * 0.25);
    }
    // the crosshair: four arms from just outside the dotted ring, cut at the art's edges
    [[1, 0, (320 - ox) / cyw], [-1, 0, (ox + 240) / cyw], [0, 1, 336 - oy], [0, -1, 336 + oy]].forEach(function (d) {
      var a0 = R2 + 14, a1 = d[2];
      if (a1 <= a0 + 4) return;
      var s0 = at(d[0] * a0, d[1] * a0), s1 = at(d[0] * a1, d[1] * a1);
      m.line([s0[0], s0[1], s0[2], s1[0], s1[1], s1[2]], ca, 0.5);
    });
    // glass squares at the sides of the ring, smaller ones top and bottom
    [[-1, 0], [1, 0], [0, 1], [0, -1]].forEach(function (d, n) {
      var s = n < 2 ? 13 : 9, q = at(d[0] * R2, d[1] * R2);
      m.glass(q[0], q[1], q[2], s, s, s, ca, 0.85, [0, -yaw, 0]);
      if (n < 2) m.point(q[0], q[1], q[2], 34, cc, 0.22, true);
    });
    // the centre square, behind the mark
    var h = 30 + ctx.rnd() * 8, c0 = at(-h, -h, -30), c1 = at(h, -h, -30), c2 = at(h, h, -30), c3 = at(-h, h, -30);
    m.line([c0[0], c0[1], c0[2], c1[0], c1[1], c1[2], c2[0], c2[1], c2[2], c3[0], c3[1], c3[2]], cc, 0.7, true);
    var mid = at(0, 0, -30);
    m.point(mid[0], mid[1], mid[2], 120, cc, 0.22, true);
  });

  /* aura: sacred-geometry rings (piece 28). The seed of life, seven dotted circles, on a disc tilted
     toward the viewer around the mark's waist, inside a dotted amber circle. Small amber diamonds
     stand at the six petal tips, a larger one at the centre glows through the mark, and glass squares
     sit at the disc's two sides. */
  A.register('s9-seed', function (m, ctx) {
    var R = 120, ca = ctx.tone('a', 0.92), cc = ctx.light('c');
    var ax = 0.28 + ctx.rnd() * 0.1, az = (ctx.rnd() - 0.5) * 0.16, y0 = (ctx.rnd() - 0.5) * 40, a0 = ctx.rnd() * Math.PI / 3;
    function at(px, pz) {                       // a point on the disc: plane (px, pz), tilted by ax, rolled by az
      var y1 = -pz * Math.sin(ax), z1 = pz * Math.cos(ax), cz = Math.cos(az), sz = Math.sin(az);
      return [px * cz - y1 * sz, px * sz + y1 * cz + y0, z1];
    }
    var centres = [[0, 0]];
    for (var k = 0; k < 6; k++) centres.push([R * Math.cos(a0 + k * Math.PI / 3), R * Math.sin(a0 + k * Math.PI / 3)]);
    centres.forEach(function (c) {
      var n = 110, off = ctx.rnd() * TAU;
      for (var i = 0; i < n; i++) {
        var t = off + i / n * TAU, q = at(c[0] + R * Math.cos(t), c[1] + R * Math.sin(t));
        m.point(q[0], q[1], q[2], 2, ca, 0.3 + ctx.rnd() * 0.35);
      }
    });
    // the enclosing circle: dotted amber over a faint line
    var outer = [];
    for (var j = 0; j < 200; j++) {
      var u = j / 200 * TAU, q = at(2 * R * Math.cos(u), 2 * R * Math.sin(u));
      outer.push(q[0], q[1], q[2]);
      if (j % 2 === 0) m.point(q[0], q[1], q[2], 2.6, cc, 0.85);
    }
    m.line(outer, cc, 0.22, true);
    // diamonds: a large one at the centre, a small one standing at each petal tip
    var mid = at(0, 0);
    m.cube(mid[0], mid[1], mid[2], 22, 22, 8, ctx.tone('c', 0.95), [0, 0, Math.PI / 4]);
    m.point(mid[0], mid[1], mid[2], 120, cc, 0.25, true);
    for (var p = 0; p < 6; p++) {
      var ang = a0 + p * Math.PI / 3, tip = at(2 * R * Math.cos(ang), 2 * R * Math.sin(ang));
      m.cube(tip[0], tip[1] + 8, tip[2], 9, 9, 4, ctx.tone('c', 0.9), [0, 0, Math.PI / 4]);
      m.point(tip[0], tip[1] + 8, tip[2], 28, cc, 0.22, true);
    }
    // glass squares at the disc's two sides
    [-1, 1].forEach(function (sd) {
      var q = at(sd * 2 * R, 0);
      m.glass(q[0], q[1], q[2], 12, 12, 12, ca, 0.85, [0, 0, 0]);
    });
  });

  /* signal: a field of thin vertical streaks, amber and grey, of varied length (piece 07). Each is
     brightest in its middle. Most sit behind the mark. */
  A.register('s9-threads', function (m, ctx) {
    var n = 110 + Math.floor(ctx.rnd() * 40), cc = ctx.light('c'), cb = ctx.light('b');
    for (var i = 0; i < n; i++) {
      var x = -240 + ctx.rnd() * 560, len = 30 + Math.pow(ctx.rnd(), 1.6) * 330, y0 = -340 + ctx.rnd() * (680 - len);
      var z = -150 + ctx.rnd() * 190, amber = ctx.rnd() < 0.36;
      var col = amber ? (ctx.rnd() < 0.5 ? cc : cb) : ctx.tone('a', 0.55 + ctx.rnd() * 0.35);
      m.quad(x, y0, z, 0, 0.9 + ctx.rnd() * 1.1, len, col, amber ? 0.4 + ctx.rnd() * 0.45 : 0.16 + ctx.rnd() * 0.28, 'peak');
    }
  });

  /* signal: vertical streaks, amber and white, each with a bright tip (piece 20). A streak hangs
     down from its tip and fades; the tip is a hard dot inside a small glow. */
  A.register('s9-wicks', function (m, ctx) {
    var n = 44 + Math.floor(ctx.rnd() * 20), cc = ctx.light('c'), ca = ctx.tone('a', 0.97);
    for (var i = 0; i < n; i++) {
      var x = -236 + ctx.rnd() * 552, tip = -140 + ctx.rnd() * 420, z = -110 + ctx.rnd() * 150, amber = ctx.rnd() < 0.55;
      var col = amber ? cc : ca, len = Math.min(tip + 340, 60 + ctx.rnd() * 250);
      m.quad(x, tip, z, Math.PI, 1 + ctx.rnd() * 1.4, len, col, 0.25 + ctx.rnd() * 0.35, 'fade');
      m.point(x, tip, z, 3 + ctx.rnd() * 2, col, 0.95);
      m.point(x, tip, z, 18 + ctx.rnd() * 14, col, 0.2, true);
    }
  });
})();

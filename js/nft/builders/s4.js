/* Sheet 4 builders: HUD pieces drawn as dotted light around the DEFXN mark (white hairlines and dots,
   with the palette's accent, --c, where the sheet had cyan). Each one is named by an element file in
   layers/<NN-key>/sheet-4/. The space and the m / ctx calls are described in the header of art3d.js.
   Every random value comes from ctx.rnd(), so the same card always draws the same art. */
(function () {
  'use strict';
  var A = window.Art3D, TAU = Math.PI * 2;

  // a point of a flat circle (x-z plane) tilted up by ax and rolled by az, as in art3d.js's ring()
  function rot(x, y, z, ax, az) {
    var ca = Math.cos(ax), sa = Math.sin(ax), y1 = y * ca - z * sa, z1 = y * sa + z * ca;
    var cz = Math.cos(az), sz = Math.sin(az);
    return [x * cz - y1 * sz, x * sz + y1 * cz, z1];
  }
  // a dotted circle: n points, the half nearer the viewer brighter. Returns the angle -> point helper.
  function dottedRing(m, r, n, ax, az, o, size, rgb, alpha) {
    function at(t) { var p = rot(r * Math.cos(t), 0, r * Math.sin(t), ax, az); return [p[0] + o[0], p[1] + o[1], p[2] + o[2]]; }
    for (var i = 0; i < n; i++) {
      var t = i / n * TAU, p = at(t);
      m.point(p[0], p[1], p[2], size, rgb, alpha * (0.45 + 0.55 * (Math.sin(t) + 1) / 2));
    }
    return at;
  }
  function node(m, p, rgb, size) {             // a small hard dot with a soft glow round it
    m.point(p[0], p[1], p[2], size, rgb, 1);
    m.point(p[0], p[1], p[2], size * 4.5, rgb, 0.4, true);
  }

  /* 03-aura */

  // 11: two dotted orbits round a white glow, small planets on them, one in the accent
  A.register('s4-orrery', function (m, ctx) {
    var ca = ctx.light('a'), cc = ctx.light('c'), ax = 0.3 + ctx.rnd() * 0.08, accent = Math.floor(ctx.rnd() * 2);
    m.point(0, 0, -90, 170, ca, 0.16, true); m.point(0, 0, -90, 46, ca, 0.5, true); m.point(0, 0, -90, 8, [1, 1, 1], 1);
    [[248, -0.2], [310, 0.16]].forEach(function (o, k) {
      var az = o[1] + (ctx.rnd() - 0.5) * 0.12, at = dottedRing(m, o[0], Math.round(o[0] * 0.42), ax, az, [0, 0, 0], 3, ca, 0.95);
      for (var j = 0; j < 2 + k; j++) {
        var p = at(ctx.rnd() * TAU), cyan = k === accent && j === 0;
        node(m, p, cyan ? cc : ca, cyan ? 9 : 6 + ctx.rnd() * 2);
      }
    });
  });

  // 12: a ring of short dotted ticks round a crosshair, accent dots at the four compass points
  A.register('s4-dial', function (m, ctx) {
    var ca = ctx.light('a'), cc = ctx.light('c'), z = 30, R = 262, n = 120, turn = (ctx.rnd() - 0.5) * 0.06;
    for (var i = 0; i < n; i++) {
      var t = i / n * TAU + turn, long = i % 10 === 0, c = Math.cos(t), s = Math.sin(t);
      for (var k = 0, steps = long ? 5 : 3; k < steps; k++) { var r = R - (long ? 9 : 3) + k * 4.2; m.point(r * c, r * s, z, long ? 3.2 : 2.5, ca, long ? 1 : 0.8); }
    }
    for (var j = 0; j < 200; j++) { var u = j / 200 * TAU, r2 = R - 26; m.point(r2 * Math.cos(u), r2 * Math.sin(u), z, 1.6, ca, 0.38); }
    m.line([-300, 0, -40, 320, 0, -40], ca, 0.3); m.line([0, -320, -40, 0, 320, -40], ca, 0.3);
    [[0, 1], [1, 0], [0, -1], [-1, 0]].forEach(function (d) { node(m, [d[0] * (R + 22), d[1] * (R + 22), z], cc, 8); });
  });

  // 13: two or three crossing dotted ellipses with nodes, some in the accent, and a glowing centre
  A.register('s4-nucleus', function (m, ctx) {
    var ca = ctx.light('a'), cc = ctx.light('c'), rolls = ctx.rnd() < 0.5 ? [0, 1.05, -1.05] : [0.62, -0.62];
    rolls.forEach(function (az, k) {
      var at = dottedRing(m, 285, 130, 0.4, az + (ctx.rnd() - 0.5) * 0.1, [0, 0, 0], 2.8, ca, 0.95);
      for (var j = 0; j < 2; j++) { var cyan = (k + j) % 2 === 0; node(m, at(ctx.rnd() * TAU), cyan ? cc : ca, cyan ? 9 : 6); }
    });
    m.point(0, 0, -70, 150, cc, 0.3, true); m.point(0, 0, -70, 36, [1, 1, 1], 0.85, true);
  });

  // 14: a vertical axis with three outlined spheres, the middle one larger and glowing, and two
  // dotted horizontal ellipses
  A.register('s4-axis', function (m, ctx) {
    var ca = ctx.light('a'), cc = ctx.light('c'), z = -60, ax = 0.2 + ctx.rnd() * 0.06;
    m.line([0, -336, z, 0, 336, z], ca, 0.4);
    m.sphere(0, 302, z, 22, ca, 0.9); m.sphere(0, -302, z, 22, ca, 0.9);
    m.sphere(0, 0, -150, 130, cc, 0.26); m.point(0, 0, -150, 320, cc, 0.14, true); m.point(0, 0, -150, 90, cc, 0.3, true);
    [168, -168].forEach(function (y) { dottedRing(m, 250, 110, ax, 0, [0, y, z], 2.8, ca, 0.95); node(m, [0, y, z], cc, 6); });
  });

  // 27: three stacked dotted ellipses on a vertical axis, with accent nodes
  A.register('s4-stack', function (m, ctx) {
    var ca = ctx.light('a'), cc = ctx.light('c'), ax = 0.3 + ctx.rnd() * 0.06, z = -30;
    m.line([0, -322, z, 0, 322, z], ca, 0.35);
    [[222, 232], [0, 292], [-222, 232]].forEach(function (s) {
      var at = dottedRing(m, s[1], Math.round(s[1] * 0.45), ax, 0, [0, s[0], z], 2.8, ca, 0.95);
      for (var j = 0; j < 3; j++) node(m, at(ctx.rnd() * TAU), cc, 8);
      node(m, [0, s[0], z], ca, 5);
    });
  });

  /* 01-backdrop */

  // 15: a spiral galaxy of accent and white dots curling out from the centre, far behind. Its centre
  // sits a little right of the origin, so after the perspective it still lines up with the mark's.
  A.register('s4-spiral', function (m, ctx) {
    var ox = 34, ca = ctx.light('a'), cc = ctx.light('c'), ax = 1.38 + ctx.rnd() * 0.1, az = -0.5 + ctx.rnd() * 0.3, z0 = -180, ph = ctx.rnd() * TAU;
    function gauss() { return ctx.rnd() + ctx.rnd() + ctx.rnd() - 1.5; }
    for (var i = 0; i < 3400; i++) {
      var arm = i % 2, t = Math.pow(ctx.rnd(), 0.6), r = 16 + 354 * t, a = ph + arm * Math.PI + t * 4.6, sp = 5 + 30 * t;
      var p = rot(r * Math.cos(a) + gauss() * sp, gauss() * 6, r * Math.sin(a) + gauss() * sp, ax, az);
      m.point(p[0] + ox, p[1], p[2] + z0, 1.6 + ctx.rnd() * 2, ctx.rnd() < 0.5 ? cc : ca, 0.5 + 0.45 * (1 - t));
    }
    for (var j = 0; j < 500; j++) {
      var rr = 30 + 340 * Math.sqrt(ctx.rnd()), aa = ctx.rnd() * TAU, q = rot(rr * Math.cos(aa), 0, rr * Math.sin(aa), ax, az);
      m.point(q[0] + ox, q[1], q[2] + z0, 1.2 + ctx.rnd(), ca, 0.15 + ctx.rnd() * 0.25);
    }
    m.point(ox, 0, z0, 150, cc, 0.4, true); m.point(ox, 0, z0, 34, [1, 1, 1], 0.9, true);
  });

  // 18: dotted lines that together form a smooth 3D wave surface, rising away from the viewer
  A.register('s4-mesh', function (m, ctx) {
    var ca = ctx.light('a'), cc = ctx.light('c'), ph = ctx.rnd() * TAU, rows = 20, cols = 110;
    for (var k = 0; k < rows; k++) {
      var v = k / (rows - 1);
      for (var i = 0; i <= cols; i++) {
        var u = i / cols, x = -270 + u * 590, z = -120 - v * 140;
        var y = -320 + v * 500 + 50 * Math.sin(u * 5.4 + ph) * Math.cos(v * 3.2 + ph * 0.6) + 20 * Math.sin(u * 2.2 + v * 2.8 + ph);
        m.point(x, y, z, 1.6 + 1.4 * (1 - v), k % 5 === 2 ? cc : ca, (0.35 + 0.6 * (1 - v)) * (0.55 + 0.45 * Math.sin(Math.PI * u)));
      }
    }
  });

  /* 05-signal */

  // 30: a four-pointed star of light at the centre, with dotted lines out to both sides
  A.register('s4-sparkle', function (m, ctx) {
    var cc = ctx.light('c'), ca = ctx.light('a'), y0 = (ctx.rnd() - 0.5) * 60, z = 50;
    m.point(0, y0, z, 90, cc, 0.5, true); m.point(0, y0, z, 24, cc, 0.9, true); m.point(0, y0, z, 7, [1, 1, 1], 1, true);
    [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach(function (a, k) {
      var len = k % 2 ? 150 : 120;
      m.quad(0, y0, z, a, 2.4, len, cc, 0.9, 'fade'); m.quad(0, y0, z - 1, a, 12, len * 0.55, cc, 0.16, 'fade');
    });
    for (var s = -1; s <= 1; s += 2) for (var d = 160; d <= 330; d += 8) m.point(s * d, y0, z, 2, ca, 0.85 * (1 - (d - 150) / 200));
  });
})();

/* Sheet 8 builders: the cyan HUD set. Thin white light with cyan accents, built around the mark's
   centre (the origin). Every random value comes from ctx.rnd(), so the same card gives the same art.
   The space and the builder API are described at the top of art3d.js.

     s8-mark-twotone  04-mark       the mark as white and cyan pixels, with vertical light streaks
     s8-compass       03-aura       a dotted ring with four cyan ticks at the compass points and a
                                    faint crosshair behind the mark
     s8-twin-ring     03-aura       two overlapping thin rings with short cyan dashes at both sides
     s8-reticles      06-particles  small diamonds of dots, each with a crosshair and a cyan centre,
                                    placed in the mark's empty space so they never cover it */
(function () {
  'use strict';
  var A = window.Art3D;
  if (!A || !A.register) { console.error('builders/s8.js: Art3D is not loaded. Load art3d.js before builders-bundle.js.'); return; }

  // the mark: each pixel is white or cyan. Cyan comes in runs of columns, so it reads as light
  // falling through the mark in vertical bands, and the bands carry light streaks past its edges.
  A.register('s8-mark-twotone', function (m, ctx) {
    var g = ctx.markGrid(ctx.num('rows', 72)), s = g.cell * 0.8, cc = ctx.light('c'), cb = ctx.light('b');
    var band = [], left = 0, on = false;
    for (var c = 0; c < g.C; c++) {
      if (left <= 0) { on = ctx.rnd() < 0.28; left = 1 + Math.floor(ctx.rnd() * 2); }
      band[c] = on; left--;
    }
    for (var r = 0; r < g.R; r++) for (c = 0; c < g.C; c++) {
      if (g.cov(r, c) < 0.5 || !g.ok(r, c) || ctx.rnd() < 0.03) continue;
      var edge = g.edge(r, c), cyan = ctx.rnd() < (band[c] ? 0.7 : 0.05);
      var d = g.cell * (edge ? 2.4 : 1.2 + ctx.rnd() * 1.6), x = g.x(c), y = g.y(r);
      var col = cyan ? ctx.tone('c', 0.88 + ctx.rnd() * 0.12) : ctx.tone('a', edge ? 0.78 + ctx.rnd() * 0.22 : 0.3 + ctx.rnd() * 0.45);
      m.cube(x, y, d / 2, s, s, d, col);
      ctx.cells.push({ x: x, y: y, z: d, s: g.cell });
      if (cyan && ctx.rnd() < 0.07) m.point(x, y, d + 1, g.cell * 2.6, cc, 0.3, true);
    }
    // streaks: from the top and the bottom of a column, kept inside y -340..340. A cyan band's
    // streaks are brighter, and some of them break into pixels.
    for (c = 0; c < g.C; c++) {
      var top = -1, bot = -1;
      for (r = 0; r < g.R; r++) if (g.cov(r, c) >= 0.5 && g.ok(r, c)) { if (top < 0) top = r; bot = r; }
      if (top < 0) continue;
      var hot = band[c], rate = hot ? 0.7 : 0.12, colr = hot ? cc : cb;
      var yt = g.y(top) + g.cell / 2, yb = g.y(bot) - g.cell / 2;
      [[yt, 0, 340 - yt], [yb, Math.PI, 340 + yb]].forEach(function (k) {
        if (ctx.rnd() >= rate || k[2] < g.cell * 2) return;
        var len = Math.min(k[2], 40 + ctx.rnd() * 240);
        if (hot && ctx.rnd() < 0.4) m.quad(g.x(c), k[0], 0, k[1], s, len, colr, 0.4 + ctx.rnd() * 0.25, 'bars', Math.max(1, Math.round(len / g.cell)));
        else m.quad(g.x(c) + (ctx.rnd() - 0.5) * g.cell * 0.6, k[0], 0, k[1], hot ? 2 + ctx.rnd() * 1.4 : 1 + ctx.rnd() * 0.6, len, colr, hot ? 0.5 + ctx.rnd() * 0.4 : 0.2 + ctx.rnd() * 0.3, 'fade');
      });
    }
    // a few long, faint scan lines through the whole height, behind the mark
    var n = 10 + Math.floor(ctx.rnd() * 8);
    for (var i = 0; i < n; i++) {
      var col2 = Math.floor(ctx.rnd() * g.C);
      m.quad(g.x(col2) + (ctx.rnd() - 0.5) * g.cell, -340, -g.cell * 2, 0, 0.9, 680, band[col2] ? cc : cb, 0.05 + ctx.rnd() * 0.08, 'peak');
    }
  });

  // a dotted ring around the mark with cyan ticks at the compass points
  A.register('s8-compass', function (m, ctx) {
    var rx = 226, ry = 316, z = -24, n = 120, ca = ctx.tone('a', 0.95), cc = ctx.light('c'), tilt = (ctx.rnd() - 0.5) * 0.08;
    function at(t, k) { var x = rx * k * Math.sin(t), y = ry * k * Math.cos(t); return [x * Math.cos(tilt) - y * Math.sin(tilt), x * Math.sin(tilt) + y * Math.cos(tilt)]; }
    for (var i = 0; i < n; i++) {
      if (i % 30 === 0) continue;                       // the compass ticks stand here
      var p = at(i / n * Math.PI * 2, 1), big = i % 5 === 0;
      m.point(p[0], p[1], z, big ? 4.6 : 3, ca, big ? 1 : 0.7);
    }
    for (var k = 0; k < 4; k++) {
      var t = k * Math.PI / 2, o = at(t, 1.04), q = at(t, 0.9);
      m.rod(o[0], o[1], z, [q[0] - o[0], q[1] - o[1], 0], Math.hypot(q[0] - o[0], q[1] - o[1]), 3, cc, 0.85);
      m.point(o[0], o[1], z, 24, cc, 0.3, true);
      // the crosshair: a faint white line from the tick toward the centre, stopping short of it
      var a = at(t, 0.86), b = at(t, 0.14);
      m.line([a[0], a[1], z - 30, b[0], b[1], z - 30], ca, 0.18);
    }
    // minor ticks: short white dashes every 30 degrees between the compass points
    for (var j = 0; j < 12; j++) {
      if (j % 3 === 0) continue;
      var tj = j / 12 * Math.PI * 2, u = at(tj, 0.96), w = at(tj, 0.92);
      m.line([u[0], u[1], z, w[0], w[1], z], ca, 0.55);
    }
  });

  // two thin rings that overlap, with short cyan dashes at both sides
  A.register('s8-twin-ring', function (m, ctx) {
    var R = 212, ax = 0.36, ca = ctx.tone('a', 0.95), cc = ctx.light('c'), dy = 28 + ctx.rnd() * 22, az = (ctx.rnd() - 0.5) * 0.1;
    [dy, -dy].forEach(function (oy, k) {
      var roll = az + (k ? 0.05 : -0.05), pts = ctx.ring(R, 200, ax, roll, 0, oy, 0);
      m.line(ctx.ring(R + 3, 200, ax, roll, 0, oy, 0), cc, 0.16, true);
      m.line(pts, ca, 0.6, true);
      // the ring's two side ends: two short dashes stepping out from each
      [0, 100].forEach(function (idx) {
        var px = pts[idx * 3], py = pts[idx * 3 + 1], pz = pts[idx * 3 + 2], sx = px > 0 ? 1 : -1;
        for (var d = 0; d < 2; d++) m.rod(px + sx * (6 + d * 12), py, pz, [sx, 0, 0], 8, 2.2, cc, 0.85);
        m.point(px, py, pz, 4, cc, 1);
      });
      for (var j = 0; j < 8; j++) { var q = Math.floor(ctx.rnd() * 200) * 3; m.point(pts[q], pts[q + 1], pts[q + 2], 2.4, ca, 0.85); }
    });
  });

  // small HUD reticles: a diamond of dots, a crosshair through it and a cyan centre. Each is placed
  // where the mark is empty, so the reticles sit in its gaps and around it and never cover it.
  A.register('s8-reticles', function (m, ctx) {
    var g = ctx.markGrid(40), ca = ctx.tone('a', 0.95), cc = ctx.light('c');
    function onMark(x, y) {
      var c = Math.round((x - g.x(0)) / g.cell), r = Math.round((g.y(0) - y) / g.cell);
      return g.cov(r, c) > 0.05;
    }
    // the words on the art's side (genesis ID, serial) stay clear: art3d.js owns those zones
    function quiet(x, y, pad) { return !ctx.clear(x, y, pad); }
    var n = 5 + Math.floor(ctx.rnd() * 4), placed = [];
    for (var tries = 0; placed.length < n && tries < 400; tries++) {
      var h = 13 + ctx.rnd() * 9, x = -225 + ctx.rnd() * 530, y = -320 + ctx.rnd() * 640, ok = true;
      if (x + h * 1.7 > 318 || x - h * 1.7 < -238 || Math.abs(y) + h * 1.7 > 338) continue;
      for (var a = 0; a < 8 && ok; a++) { var t = a * Math.PI / 4; if (onMark(x + Math.cos(t) * h * 1.3, y + Math.sin(t) * h * 1.3)) ok = false; }
      if (!ok || onMark(x, y) || quiet(x, y, h * 1.7 + 12)) continue;
      for (var p = 0; p < placed.length && ok; p++) if (Math.hypot(placed[p][0] - x, placed[p][1] - y) < 90) ok = false;
      if (ok) placed.push([x, y, h]);
    }
    placed.forEach(function (rt) {
      var x = rt[0], y = rt[1], h = rt[2], z = 40 + ctx.rnd() * 90, corners = [[0, h], [h, 0], [0, -h], [-h, 0]];
      for (var s = 0; s < 4; s++) for (var k = 0; k < 4; k++) {
        var p0 = corners[s], p1 = corners[(s + 1) % 4], f = k / 4;
        m.point(x + p0[0] + (p1[0] - p0[0]) * f, y + p0[1] + (p1[1] - p0[1]) * f, z, k ? 1.8 : 2.6, ca, k ? 0.7 : 0.95);
      }
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        m.line([x + d[0] * h * 0.35, y + d[1] * h * 0.35, z, x + d[0] * h * 1.7, y + d[1] * h * 1.7, z], ca, 0.45);
      });
      m.point(x, y, z, 4.2, cc, 1); m.point(x, y, z, 20, cc, 0.35, true);
    });
  });
})();

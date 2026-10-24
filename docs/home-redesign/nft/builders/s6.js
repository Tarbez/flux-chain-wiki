/* Sheet 6 builders: thin monochrome rings around the mark, drawn as 1-pixel lines of light with
   small square nodes. No glow. Every random choice comes from ctx.rnd(), so a card always draws the
   same rings. The space is art3d.js's: the origin is the mark's centre, y runs up, z toward the
   viewer. Everything stays inside x -240..320 and y -340..340. */
(function () {
  'use strict';

  var TAU = Math.PI * 2, FACE = Math.PI / 2;

  // a point on a circle of radius r, at angle t, in a plane tilted up by ax and rolled by az, centred
  // at o. ax = FACE turns the circle to face the viewer.
  function at(r, t, ax, az, o) {
    var x = r * Math.cos(t), z = r * Math.sin(t), y1 = -z * Math.sin(ax), z1 = z * Math.cos(ax);
    var cz = Math.cos(az), sz = Math.sin(az);
    return [x * cz - y1 * sz + o[0], x * sz + y1 * cz + o[1], z1 + o[2]];
  }
  // the points of an arc from t0 to t1, one every `step` radians
  function arc(r, t0, t1, ax, az, o, step) {
    var pts = [], n = Math.max(2, Math.ceil(Math.abs(t1 - t0) / (step || 0.03)));
    for (var i = 0; i <= n; i++) { var p = at(r, t0 + (t1 - t0) * i / n, ax, az, o); pts.push(p[0], p[1], p[2]); }
    return pts;
  }
  // a line from radius r0 to radius r1 at angle t
  function spoke(r0, r1, t, ax, az, o) { return at(r0, t, ax, az, o).concat(at(r1, t, ax, az, o)); }
  // a ring broken into arcs of random length: calls fn(t0, t1) for each arc
  function broken(ctx, minArc, spanArc, minGap, spanGap, fn) {
    var t = ctx.rnd() * TAU, end = t + TAU;
    while (t < end - minArc) {
      var t1 = Math.min(end - minGap, t + minArc + ctx.rnd() * spanArc);
      fn(t, t1);
      t = t1 + minGap + ctx.rnd() * spanGap;
    }
  }
  function node(m, ctx, p, s) { m.cube(p[0], p[1], p[2], s, s, s, ctx.tone('a', 0.92)); }

  /* Reticle: a circle facing the viewer, a dotted ring around it (both behind the mark), a broken
     ring and a ring of tick marks in front, and a small plus behind the mark's centre. */
  Art3D.register('s6-reticle', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), back = [28, 0, -40], front = [28, 0, 20];
    m.line(arc(230, 0, TAU, FACE, 0, back, 0.02), ca, 0.4, true);
    var dots = 128;
    for (var i = 0; i < dots; i++) { var d = at(244, i / dots * TAU, FACE, 0, back); m.point(d[0], d[1], d[2], 1.8, cb, 0.7); }
    broken(ctx, 0.22, 0.5, 0.05, 0.12, function (t0, t1) {
      m.line(arc(254, t0, t1, FACE, 0, front, 0.02), ca, 0.5);
      if (ctx.rnd() < 0.25) node(m, ctx, at(254, t1, FACE, 0, front), 4);
    });
    for (var k = 0; k < 72; k++) {
      var t = k / 72 * TAU, major = k % 6 === 0;
      m.line(spoke(major ? 257 : 259, major ? 268 : 263, t, FACE, 0, front), ca, major ? 0.6 : 0.34);
    }
    m.line([16, 0, -40, 40, 0, -40], ca, 0.5);
    m.line([28, -12, -40, 28, 12, -40], ca, 0.5);
  });

  /* Arcs: two rings made of broken arcs, tilted around the mark, with a few small square nodes where
     an arc ends. */
  Art3D.register('s6-arcs', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b');
    [[248, 0.3, ca, 0.55], [226, 0.38, cb, 0.4]].forEach(function (ring, j) {
      var ax = ring[1] + (ctx.rnd() - 0.5) * 0.08, az = (ctx.rnd() - 0.5) * 0.36, o = [14, (ctx.rnd() - 0.5) * 60 - j * 10, 0];
      broken(ctx, 0.18, 0.55, 0.06, 0.16, function (t0, t1) {
        m.line(arc(ring[0], t0, t1, ax, az, o, 0.025), ring[2], ring[3]);
        if (ctx.rnd() < 0.22) node(m, ctx, at(ring[0], ctx.rnd() < 0.5 ? t0 : t1, ax, az, o), 4 + ctx.rnd() * 2);
      });
    });
  });

  /* Dial: a ring of radial tick marks lying flat around the mark, a longer tick every fifth, and a
     small plus behind the mark's centre. No hands: it marks no time. */
  Art3D.register('s6-dial', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b');
    var ax = 0.3 + ctx.rnd() * 0.12, az = (ctx.rnd() - 0.5) * 0.3, o = [18, (ctx.rnd() - 0.5) * 120, 0];
    for (var k = 0; k < 90; k++) {
      var t = k / 90 * TAU, major = k % 5 === 0;
      m.line(spoke(major ? 226 : 234, 248, t, ax, az, o), major ? ca : cb, major ? 0.62 : 0.38);
    }
    m.line(arc(224, 0, TAU, ax, az, o, 0.02), cb, 0.18, true);
    var q = Math.floor(ctx.rnd() * 18) * 5 / 90 * TAU;
    node(m, ctx, at(253, q, ax, az, o), 5);
    m.line([-12, 0, -40, 12, 0, -40], ca, 0.45);
    m.line([0, -12, -40, 0, 12, -40], ca, 0.45);
  });

  /* Moon: a dotted orbit around the mark, a small solid square planet on it and a small circle for
     its moon on a faint path of its own. The planet sits on the near side of the orbit, at the mark's
     right edge, where the art has room, never over the mark's middle. */
  Art3D.register('s6-moon', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b');
    var ax = 0.34 + ctx.rnd() * 0.1, az = (ctx.rnd() - 0.5) * 0.4, o = [0, (ctx.rnd() - 0.5) * 80, 0], R = 236;
    var n = 96;
    for (var i = 0; i < n; i++) { var d = at(R, i / n * TAU, ax, az, o); m.point(d[0], d[1], d[2], 2.2, cb, 0.8); }
    var t = 0.4 + ctx.rnd() * 0.3;
    var p = at(R, t, ax, az, o), s = 12 + ctx.rnd() * 4;
    m.cube(p[0], p[1], p[2], s, s, s, ctx.tone('a', 0.95));
    var mx = 0.5, mz = (ctx.rnd() - 0.5) * 0.6, tm = Math.PI * (0.55 + ctx.rnd() * 0.35);
    m.line(arc(34, 0, TAU, mx, mz, p, 0.08), cb, 0.24, true);
    m.line(arc(6, 0, TAU, FACE, 0, at(34, tm, mx, mz, p), 0.3), ca, 0.85, true);
  });
})();

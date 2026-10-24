/* Sheet 7 builders: mono, minimal. Thin lines of light, fine points and a few small solid squares.
   Every shape sits around the mark's centre (the origin) and stays inside x -215..290, y -330..330, so it
   clears the text side and the card's edge. Lines and rays sit behind the mark (z < 0), so they show in
   its gaps and around it and never cover it. Every random value comes from ctx.rnd(). */
(function () {
  'use strict';
  var A = window.Art3D;
  var X0 = -215, X1 = 290, Y0 = -330, Y1 = 330;

  // a point (x, y) turned about the vertical axis through cx by ry: a flat shape seen at an angle
  function turn(x, y, cx, ry, z) { var dx = x - cx; return [cx + dx * Math.cos(ry), y, z - dx * Math.sin(ry)]; }

  /* aura (sheet 7, item 23): two overlapping rings on one dashed horizontal axis, a dot at each end of
     the axis and a small solid square at each ring's centre */
  A.register('s7-venn', function (m, ctx) {
    var c = ctx.light('a'), s = ctx.tone('a', 0.9), r = 160 + ctx.rnd() * 14, cx = 40, d = 232 - r, cy = (ctx.rnd() - 0.5) * 50, z = -80;
    [-1, 1].forEach(function (side) {
      var ox = cx + side * d, ry = side * (0.2 + ctx.rnd() * 0.12), pts = [];
      for (var i = 0; i < 180; i++) { var t = i / 180 * Math.PI * 2, p = turn(ox + r * Math.cos(t), cy + r * Math.sin(t), ox, ry, z); pts.push(p[0], p[1], p[2]); }
      m.line(pts, c, 0.62, true);
      for (var k = 0; k < 180; k += 15) m.point(pts[k * 3], pts[k * 3 + 1], pts[k * 3 + 2], 2.4, c, 0.85);
      m.cube(ox, cy, z, 7, 7, 7, s);
    });
    // the axis, as short dashes from end to end
    var a0 = X0 + 25, a1 = X1 - 10;
    for (var x = a0; x < a1; x += 18) m.line([x, cy, z, Math.min(x + 10, a1), cy, z], c, 0.55);
    m.point(a0, cy, z, 6, c, 1); m.point(a1, cy, z, 6, c, 1);
  });

  /* aura (sheet 7, item 24): a starburst of dotted rays from a small square at the centre. Every second ray is
     shorter; each ray ends at the safe box, and only its last quarter fades. */
  A.register('s7-dot-rays', function (m, ctx) {
    var c = ctx.light('a'), n = 24, z = -90, step = 13, ph = ctx.rnd() * Math.PI * 2 / n;
    for (var i = 0; i < n; i++) {
      var ang = ph + i / n * Math.PI * 2, dx = Math.cos(ang), dy = Math.sin(ang);
      var tx = dx > 1e-6 ? X1 / dx : dx < -1e-6 ? X0 / dx : 1e9, ty = dy > 1e-6 ? Y1 / dy : dy < -1e-6 ? Y0 / dy : 1e9;
      var len = Math.min(tx, ty) * (i % 2 ? 0.55 + ctx.rnd() * 0.12 : 0.88 + ctx.rnd() * 0.1);
      for (var t = 44; t < len; t += step) { var f = Math.max(0, ((t - 44) / (len - 44) - 0.75) / 0.25); m.point(dx * t, dy * t, z, 3.2 - 1.4 * f, c, 0.95 - 0.7 * f); }
    }
    m.cube(0, 0, z, 10, 10, 10, ctx.tone('a', 0.9));
  });

  /* aura (sheet 7, item 18): a target of nested square outlines, each one further back, with small solid
     squares at their corners and four corner brackets around the outermost */
  A.register('s7-squares', function (m, ctx) {
    var c = ctx.light('a'), s = ctx.tone('a', 0.9), cx = 37, cy = (ctx.rnd() - 0.5) * 30, sizes = [226, 164, 102];
    sizes.forEach(function (h, k) {
      var z = -40 - k * 60;
      m.line([cx - h, cy - h, z, cx + h, cy - h, z, cx + h, cy + h, z, cx - h, cy + h, z], c, 0.5 - k * 0.1, true);
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (q) { m.cube(cx + q[0] * h, cy + q[1] * h, z, 6 - k, 6 - k, 6 - k, s); });
    });
    var B = 248, arm = 44, zb = -20;
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (q) {
      var x = cx + q[0] * B, y = cy + q[1] * B;
      m.line([x - q[0] * arm, y, zb, x, y, zb, x, y - q[1] * arm, zb], c, 0.6);
    });
  });

  /* particles (sheet 7, item 22): a sparse grid of fine points in front, a few of them small solid squares */
  A.register('s7-grid-points', function (m, ctx) {
    var c = ctx.light('a'), pitch = 42, z = 70, ox = (ctx.rnd() - 0.5) * pitch, oy = (ctx.rnd() - 0.5) * pitch;
    for (var x = X0 + 20 + ox; x <= X1 - 10; x += pitch) for (var y = Y0 + 20 + oy; y <= Y1 - 20; y += pitch) {
      if (ctx.rnd() < 0.06) m.cube(x, y, z, 6, 6, 6, ctx.tone('a', 0.95));
      else m.point(x, y, z, 2.4, c, 0.6);
    }
  });
})();

/* DEFXN identity card: builders from reference sheet 18 (cubes, towers, volumes and primitives, drawn
   in white glass with the palette's accent, --c, where the sheet had amber or cyan, and its light,
   --b, for beams and thin connecting lines). Each builder is named by an element file in
   layers/<NN-key>/sheet-18/. The space and the m / ctx calls are described in the header of art3d.js.
   Every random value comes from ctx.rnd(), so the same card always draws the same art.

   Small objects (06-particles) stand in the free column right of the mark, seen at x 215..315, and
   keep clear of the genesis ID above it and the serial below it. Large ones (03-aura, 01-backdrop)
   are built round the mark's centre and sit behind it, so the mark is never buried. A pyramid, a
   cylinder or an icosahedron is drawn from edges (m.line), vertices (m.point) and a soft inner glow.

     s18-cube-system     06-particles  four glass cubes in a column, every corner joined to the next cube's
     s18-hex-cluster     06-particles  cubes stood on a corner, packed in a hexagon round one lit cube
     s18-beam-cube       06-particles  a glass cube over a thin round plate, a beam of light through both
     s18-coin-stack      06-particles  two short stacks of glass discs with bright rims, one coin loose
     s18-fragments       06-particles  a small cube cluster bursting apart, pieces trailing light
     s18-cube-chain      06-particles  hollow glass cubes linked into a diagonal chain
     s18-cylinder        06-particles  a glass cylinder with banded rims and a glowing rod on its axis
     s18-icosahedron     06-particles  a wire icosahedron with a smaller one turning inside it
     s18-ember-cluster   06-particles  a round cluster of small cubes, hot accent inside, glass outside
     s18-hex-prism       06-particles  three nested hexagonal prisms round a lit core cube
     s18-cube-spiral     06-particles  small glass cubes rising round a glowing axis beside the mark
     s18-grid-lattice    03-aura       a 3 x 3 x 3 lattice of spaced glass cubes on axis lines, one lit
     s18-pyramid         03-aura       a tall glass pyramid with the mark standing inside it, a core cube
     s18-arch            03-aura       an arch of glass blocks over the mark, a lit keystone at its crown
     s18-pillar-field    01-backdrop   a round field of glass pillars far behind, seen from above, lit tops
     s18-cube-wall       01-backdrop   a wall of glass cubes far behind, pushed in and out like a relief */
(function () {
  'use strict';
  var A = window.Art3D, TAU = Math.PI * 2, ISO = [0.6155, 0.7854, 0];
  if (!A || !A.register) { console.error('builders/s18.js: Art3D is not loaded. Load art3d.js before builders-bundle.js.'); return; }

  /* ---------- helpers ---------- */
  // rotate as three.js does for rotation [rx, ry, rz] (Euler XYZ): z first, then y, then x
  function rotE(p, r) {
    var c = Math.cos(r[2]), s = Math.sin(r[2]), x1 = p[0] * c - p[1] * s, y1 = p[0] * s + p[1] * c;
    c = Math.cos(r[1]); s = Math.sin(r[1]);
    var x2 = x1 * c + p[2] * s, z2 = -x1 * s + p[2] * c;
    c = Math.cos(r[0]); s = Math.sin(r[0]);
    return [x2, y1 * c - z2 * s, y1 * s + z2 * c];
  }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function flat(pts) { var o = []; pts.forEach(function (p) { o.push(p[0], p[1], p[2]); }); return o; }
  function seg(m, a, b, rgb, alpha) { m.line([a[0], a[1], a[2], b[0], b[1], b[2]], rgb, alpha); }
  function dim(rgb, k) { return [rgb[0] * k, rgb[1] * k, rgb[2] * k]; }
  // the 8 corners of a box centred at c, in the order three.js's glass edges use (bit 0 x, bit 1 y, bit 2 z)
  function corners(c, sx, sy, sz, rot) {
    var out = [];
    for (var i = 0; i < 8; i++) out.push(add(c, rotE([(i & 1 ? 0.5 : -0.5) * sx, (i & 2 ? 0.5 : -0.5) * sy, (i & 4 ? 0.5 : -0.5) * sz], rot)));
    return out;
  }
  // the point at depth z that is SEEN at (xs, ys) on the card at rest
  function seenAt(ctx, xs, ys, z) {
    var x = xs, y = ys;
    for (var i = 0; i < 6; i++) { var p = ctx.seen(x, y, z); x += xs - p[0]; y += ys - p[1]; }
    return [x, y, z];
  }
  // true when a point is seen inside the art's box and clear of the card's words by pad units
  function inView(ctx, p, pad) {
    var s = ctx.seen(p[0], p[1], p[2]); pad = pad || 0;
    return s[0] > -240 + pad && s[0] < 320 - pad && s[1] > -340 + pad && s[1] < 340 - pad && ctx.clear(s[0], s[1], pad);
  }
  function glow(m, p, rgb, size, a) { m.point(p[0], p[1], p[2], size, rgb, a, true); }
  // a lit core: a solid accent cube in a glass cube, with a close and a wide glow
  function core(m, ctx, p, s, rot) {
    var cc = ctx.light('c');
    m.cube(p[0], p[1], p[2], s * 0.48, s * 0.48, s * 0.48, ctx.tone('c', 0.95), rot);
    m.glass(p[0], p[1], p[2], s, s, s, cc, 0.95, rot);
    glow(m, p, cc, s * 5, 0.32); glow(m, p, cc, s * 1.8, 0.75);
  }
  // a free spot in the column right of the mark: the seen y of an object `tall` units high
  function columnY(ctx, tall) {
    var lo = -228 + tall / 2, hi = 222 - tall / 2;
    return hi <= lo ? (lo + hi) / 2 : lo + ctx.rnd() * (hi - lo);
  }
  // a circle of radius r in a plane whose normal is `up` tilted by ax about x then rolled by az about
  // z (as art3d.js's ring), centred at c. Returns points and the frame, for coins and cylinders.
  function tiltP(p, ax, az) {
    var ca = Math.cos(ax), sa = Math.sin(ax), y1 = p[1] * ca - p[2] * sa, z1 = p[1] * sa + p[2] * ca;
    var cz = Math.cos(az), sz = Math.sin(az);
    return [p[0] * cz - y1 * sz, p[0] * sz + y1 * cz, z1];
  }
  function circle(c, r, n, ax, az, h, a0) {
    var pts = [];
    for (var i = 0; i < n; i++) { var t = (a0 || 0) + i / n * TAU; pts.push(add(c, tiltP([r * Math.cos(t), h || 0, r * Math.sin(t)], ax, az))); }
    return pts;
  }

  /* ---------- 06-particles: small objects beside the mark ---------- */

  // cube systems: 3 to 5 glass cubes turned alike, each corner joined by a hairline to the same corner
  // of the next cube, so the column reads as one cube moving through space. One cube is lit.
  A.register('s18-cube-system', function (m, ctx) {
    var n = 3 + Math.floor(ctx.rnd() * 3), white = ctx.tone('a', 0.95), cc = ctx.light('c');
    var rot = [0.3 + ctx.rnd() * 0.35, 0.45 + ctx.rnd() * 0.6, (ctx.rnd() - 0.5) * 0.4], hot = Math.floor(ctx.rnd() * n);
    var tall = 300 + n * 20, y0 = columnY(ctx, tall) - tall / 2, cubes = [], side = ctx.rnd() < 0.5 ? 1 : -1;
    for (var k = 0; k < n; k++) {
      var t = k / (n - 1), s = 34 + ctx.rnd() * 12, z = 30 + ctx.rnd() * 60;
      var c = seenAt(ctx, 262 + side * 26 * Math.sin(t * Math.PI * 1.4 - 0.7) + (ctx.rnd() - 0.5) * 8, y0 + t * tall, z);
      cubes.push({ c: c, s: s, pts: corners(c, s, s, s, rot) });
    }
    for (var j = 0; j < n - 1; j++) for (var i = 0; i < 8; i++) seg(m, cubes[j].pts[i], cubes[j + 1].pts[i], white, 0.2);
    cubes.forEach(function (q, k) {
      var on = k === hot;
      m.glass(q.c[0], q.c[1], q.c[2], q.s, q.s, q.s, on ? cc : white, on ? 1 : 0.85, rot);
      q.pts.forEach(function (p) { m.point(p[0], p[1], p[2], 2.6, on ? cc : white, 0.95); });
      if (on) core(m, ctx, q.c, q.s * 0.5, rot);
      else m.cube(q.c[0], q.c[1], q.c[2], q.s * 0.16, q.s * 0.16, q.s * 0.16, ctx.tone('a', 0.9), rot);
    });
  });

  // token subdivision: cubes stood on a corner (each seen as a hexagon) packed in a honeycomb round
  // one lit cube, a broken outer ring of smaller cubes, hairlines from the centre.
  A.register('s18-hex-cluster', function (m, ctx) {
    var white = ctx.tone('a', 0.95), cb = ctx.light('b'), s = 17, sp = s * 1.52, z = 50;
    var o = seenAt(ctx, 258, columnY(ctx, 130), z), spin = (ctx.rnd() - 0.5) * 0.3, rot = [ISO[0], ISO[1], spin];
    core(m, ctx, o, s, rot);
    for (var k = 0; k < 6; k++) {
      var a = k * Math.PI / 3 + spin, p = [o[0] + sp * Math.cos(a), o[1] + sp * Math.sin(a), z + (ctx.rnd() - 0.5) * 6];
      m.glass(p[0], p[1], p[2], s, s, s, white, 0.9, rot);
      m.cube(p[0], p[1], p[2], s * 0.22, s * 0.22, s * 0.22, ctx.tone('a', 0.85), rot);
      seg(m, o, p, cb, 0.35);
    }
    for (var j = 0; j < 6; j++) {
      if (ctx.rnd() < 0.25) continue;
      var b = j * Math.PI / 3 + Math.PI / 6 + spin, d = sp * Math.sqrt(3), q = [o[0] + d * Math.cos(b), o[1] + d * Math.sin(b), z - 8];
      var t = s * (0.62 + ctx.rnd() * 0.2);
      m.glass(q[0], q[1], q[2], t, t, t, white, 0.55, rot);
      m.point(q[0], q[1], q[2], 2.4, white, 0.8);
    }
    m.line(flat(circle(o, sp * 2.15, 96, Math.PI / 2, 0)), cb, 0.16, true);
  });

  // a single glass cube floating over a thin round plate, a vertical beam of light through both
  A.register('s18-beam-cube', function (m, ctx) {
    var white = ctx.tone('a', 0.95), cb = ctx.light('b'), cc = ctx.light('c'), z = 50, s = 42;
    var ys = -175 + ctx.rnd() * 160, o = seenAt(ctx, 262, ys, z), ax = 0.34, spin = ctx.rnd() * TAU;
    var top = [o[0], o[1] + 70 + ctx.rnd() * 14, z], rot = [ISO[0], ISO[1] + spin, 0];
    m.line(flat(circle(o, 50, 96, ax, 0)), white, 0.75, true);
    m.line(flat(circle(o, 50, 96, ax, 0, -3)), white, 0.3, true);
    m.line(flat(circle(o, 34, 72, ax, 0)), cb, 0.3, true);
    circle(o, 62, 48, ax, 0).forEach(function (p, i) { m.point(p[0], p[1], p[2], i % 6 ? 1.6 : 3, white, i % 6 ? 0.45 : 0.9); });
    m.line(flat(circle(o, 14, 40, ax, 0, 0.5)), cc, 0.6, true);
    glow(m, o, cc, 60, 0.45);
    m.quad(o[0], o[1] - 30, z, 0, 5, 300, cb, 0.75, 'peak');
    m.quad(o[0], o[1] - 30, z - 1, 0, 26, 300, cb, 0.14, 'peak');
    m.glass(top[0], top[1], top[2], s, s, s, white, 0.95, rot);
    corners(top, s, s, s, rot).forEach(function (p) { m.point(p[0], p[1], p[2], 2.6, white, 0.95); });
    m.cube(top[0], top[1], top[2], 9, 9, 9, ctx.tone('a', 1), rot);
    glow(m, top, cc, 110, 0.3); glow(m, top, cb, 34, 0.6);
  });

  // an arc of a coin's rim from angle t0 to t1 (radians, 0 at local +x, PI/2 at the front)
  function rim(c, r, ax, az, t0, t1, n) {
    var pts = [];
    for (var i = 0; i <= n; i++) { var t = t0 + (t1 - t0) * i / n; pts.push(add(c, tiltP([r * Math.cos(t), 0, r * Math.sin(t)], ax, az))); }
    return flat(pts);
  }
  // a stack of n coins standing on base along the axis tilted by ax: the seam between coins is the
  // front half of each rim, the top coin shows its whole face, the sides are reeded
  function coins(m, base, n, r, th, ax, az, rgb, a, lit, litRgb) {
    var up = tiltP([0, 1, 0], ax, az);
    function at(h) { return add(base, [up[0] * h, up[1] * h, up[2] * h]); }
    for (var k = 0; k <= n; k++) {
      var c = at(k * th), on = k === lit || k === lit + 1, col = on && lit >= 0 ? litRgb : rgb;
      if (k === n) {
        m.line(rim(c, r, ax, az, 0, TAU, 64), col, a, true);
        m.line(rim(c, r * 0.7, ax, az, 0, TAU, 48), col, a * 0.3, true);
        for (var g = 0; g < 5; g++) { var u = 0.4 + g * 0.5, q = add(c, tiltP([r * Math.cos(u), 0, r * Math.sin(u)], ax, az)); m.point(q[0], q[1], q[2], 2.2, col, a); }
      } else {
        m.line(rim(c, r, ax, az, 0, Math.PI, 32), col, k === 0 ? a * 0.55 : a * 0.75, false);
        m.line(rim(c, r, ax, az, Math.PI, TAU, 32), col, a * 0.22, false);
      }
      if (k < n) for (var i = 0; i < 24; i++) {
        var t = i / 24 * TAU, p = tiltP([r * Math.cos(t), 0, r * Math.sin(t)], ax, az), b = at(k * th);
        seg(m, add(b, p), add(at((k + 1) * th), p), k === lit ? litRgb : rgb, a * (t < Math.PI ? 0.16 : 0.07));
      }
    }
    [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach(function (t, i) { var p = tiltP([r * Math.cos(t), 0, r * Math.sin(t)], ax, az); seg(m, add(base, p), add(at(n * th), p), rgb, a * (i % 2 ? 0.25 : 0.75)); });
    return at(n * th);
  }
  // a coin stack: glass coins in two short columns with bright rims, one coin in the accent, one
  // coin loose above them, tipped up
  A.register('s18-coin-stack', function (m, ctx) {
    var white = ctx.tone('a', 0.95), cc = ctx.light('c'), ax = 0.4, r = 30, th = 7.5;
    var ys = columnY(ctx, 200) - 60, n1 = 6 + Math.floor(ctx.rnd() * 5), n2 = 2 + Math.floor(ctx.rnd() * 3), first = ctx.rnd() < 0.5;
    var A1 = seenAt(ctx, 232, ys - 30, 60), B1 = seenAt(ctx, 276, ys - 6, 10);
    var litA = first ? Math.floor(ctx.rnd() * n1) : -1, litB = first ? -1 : Math.floor(ctx.rnd() * n2);
    var tb = coins(m, B1, n2, r, th, ax, 0.04, white, 0.75, litB, cc), ta = coins(m, A1, n1, r, th, ax, -0.03, white, 0.95, litA, cc);
    var hotA = add(A1, tiltP([0, (litA + 0.5) * th, 0], ax, 0)), hotB = add(B1, tiltP([0, (litB + 0.5) * th, 0], ax, 0));
    glow(m, first ? hotA : hotB, cc, 90, 0.35);
    glow(m, ta, white, 60, 0.14); glow(m, tb, white, 50, 0.1);
    var loose = seenAt(ctx, 258 + (ctx.rnd() - 0.5) * 16, ys + n1 * th + 40, 80), lax = 1.1 + ctx.rnd() * 0.25, laz = -0.55 + ctx.rnd() * 0.3;
    coins(m, loose, 1, r * 0.92, th, lax, laz, white, 1, 0, cc);
    glow(m, loose, cc, 60, 0.4);
  });

  // fragments: a small cluster of cubes bursting apart, pieces flying out from the centre, each
  // trailing a streak back toward it, the farther ones smaller
  A.register('s18-fragments', function (m, ctx) {
    var white = ctx.tone('a', 0.95), cb = ctx.light('b'), cc = ctx.light('c'), z = 50;
    var o = seenAt(ctx, 248, columnY(ctx, 220), z), n = 26 + Math.floor(ctx.rnd() * 10), so = ctx.seen(o[0], o[1], o[2]);
    for (var i = 0; i < 8; i++) {
      var r0 = [ctx.rnd() * 3, ctx.rnd() * 3, ctx.rnd() * 3], d0 = [(i & 1 ? 1 : -1) * 7, (i & 2 ? 1 : -1) * 7, (i & 4 ? 1 : -1) * 7];
      var p0 = add(o, [d0[0] * (1 + ctx.rnd() * 0.5), d0[1] * (1 + ctx.rnd() * 0.5), d0[2]]);
      if (i === 0) m.cube(p0[0], p0[1], p0[2], 9, 9, 9, ctx.tone('c', 0.95), r0); else m.glass(p0[0], p0[1], p0[2], 11, 11, 11, white, 0.9, r0);
    }
    glow(m, o, cc, 150, 0.32); glow(m, o, cc, 44, 0.8); m.point(o[0], o[1], o[2], 5, [1, 1, 1], 1);
    for (var k = 0; k < n; k++) {
      var u = ctx.rnd() * 2 - 1, a = ctx.rnd() * TAU, w = Math.sqrt(1 - u * u), dir = [w * Math.cos(a), w * Math.sin(a) * 1.3, u * 0.7];
      if (dir[0] < -0.55) dir[0] = -dir[0] * 0.5;                        // keep most pieces off the mark
      var dist = 26 + Math.pow(ctx.rnd(), 0.75) * 125, p = add(o, [dir[0] * dist, dir[1] * dist, dir[2] * dist]);
      if (!inView(ctx, p, 12)) continue;
      var s = Math.max(3.5, (14 - dist * 0.07) * (0.7 + ctx.rnd() * 0.6)), rot = [ctx.rnd() * 3, ctx.rnd() * 3, ctx.rnd() * 3], kind = ctx.rnd();
      if (kind < 0.58) m.glass(p[0], p[1], p[2], s, s, s, white, 0.9, rot);
      else if (kind < 0.84) m.cube(p[0], p[1], p[2], s * 0.8, s * 0.8, s * 0.8, ctx.tone('a', 0.6 + ctx.rnd() * 0.35), rot);
      else { m.cube(p[0], p[1], p[2], s * 0.8, s * 0.8, s * 0.8, ctx.tone('c', 0.95), rot); glow(m, p, cc, s * 4, 0.45); }
      var sp = ctx.seen(p[0], p[1], p[2]), ux = so[0] - sp[0], uy = so[1] - sp[1], ul = Math.hypot(ux, uy) || 1;
      m.quad(p[0], p[1], p[2], Math.atan2(-ux / ul, uy / ul), 1 + s * 0.08, dist * (0.35 + ctx.rnd() * 0.3), kind > 0.84 ? cc : cb, 0.45, 'fade');
    }
    for (var d = 0; d < 50; d++) {
      var v = [ctx.rnd() * 2 - 1, ctx.rnd() * 2 - 1, ctx.rnd() * 2 - 1], dd = 20 + ctx.rnd() * 150, q = add(o, [v[0] * dd, v[1] * dd, v[2] * dd * 0.5]);
      if (v[0] > -0.4 && inView(ctx, q, 6)) m.point(q[0], q[1], q[2], 1.2 + ctx.rnd() * 1.4, white, 0.3 + ctx.rnd() * 0.5);
    }
  });

  // a hollow glass cube: an outer and an inner cube with their corners joined
  function hollow(m, c, s, rot, rgb, a) {
    var o = corners(c, s, s, s, rot), i = corners(c, s * 0.56, s * 0.56, s * 0.56, rot);
    m.glass(c[0], c[1], c[2], s, s, s, rgb, a, rot);
    m.glass(c[0], c[1], c[2], s * 0.56, s * 0.56, s * 0.56, rgb, a * 0.7, rot);
    for (var k = 0; k < 8; k++) { seg(m, o[k], i[k], rgb, a * 0.35); m.point(o[k][0], o[k][1], o[k][2], 2.2, rgb, a); }
  }
  // chain links: hollow cubes linked in a diagonal chain, each turned 45 degrees from the last so
  // they read as links, one link in the accent
  A.register('s18-cube-chain', function (m, ctx) {
    var white = ctx.tone('a', 0.95), cc = ctx.light('c'), n = 6 + Math.floor(ctx.rnd() * 3), s = 32, step = s * 0.8;
    var dir = [0.38, 0.9, -0.2], tall = (n - 1) * step * dir[1], start = seenAt(ctx, 214, columnY(ctx, tall + 40) - tall / 2, 70);
    var base = [0.35 + ctx.rnd() * 0.2, 0.5 + ctx.rnd() * 0.3, 0.3], hot = 1 + Math.floor(ctx.rnd() * (n - 2)), prev = null;
    for (var k = 0; k < n; k++) {
      var c = add(start, [dir[0] * step * k, dir[1] * step * k, dir[2] * step * k]), rot = [base[0], base[1] + (k % 2 ? Math.PI / 4 : 0), base[2]];
      hollow(m, c, s, rot, k === hot ? cc : white, k === hot ? 1 : 0.85);
      if (k === hot) { m.cube(c[0], c[1], c[2], 7, 7, 7, ctx.tone('c', 0.95), rot); glow(m, c, cc, 90, 0.35); }
      if (prev) m.point((prev[0] + c[0]) / 2, (prev[1] + c[1]) / 2, (prev[2] + c[2]) / 2, 3.4, white, 1);
      prev = c;
    }
  });

  // a glass cylinder: bright top rim, faint bottom rim, two inner bands, silhouette edges, a glowing
  // rod on its axis and a lit cap at each end
  A.register('s18-cylinder', function (m, ctx) {
    var white = ctx.tone('a', 0.95), cb = ctx.light('b'), cc = ctx.light('c'), r = 28, h = 118, ax = 0.3, az = (ctx.rnd() - 0.5) * 0.3, z = 50;
    var mid = seenAt(ctx, 262, columnY(ctx, h + 50), z), up = tiltP([0, 1, 0], ax, az);
    function at(t) { return add(mid, [up[0] * h * t, up[1] * h * t, up[2] * h * t]); }
    var bot = at(-0.5), top = at(0.5);
    m.line(flat(circle(top, r, 80, ax, az)), white, 0.9, true);
    m.line(flat(circle(top, r * 0.55, 56, ax, az)), cb, 0.35, true);
    m.line(flat(circle(bot, r, 80, ax, az)), white, 0.4, true);
    [-0.2, 0.15].forEach(function (t) { m.line(flat(circle(at(t), r, 80, ax, az)), white, 0.14, true); });
    for (var i = 0; i < 16; i++) {
      var a = i / 16 * TAU, p = tiltP([r * Math.cos(a), 0, r * Math.sin(a)], ax, az), edge = i === 0 || i === 8;
      seg(m, add(bot, p), add(top, p), white, edge ? 0.7 : (p[2] > 0 ? 0.14 : 0.07));
      if (i % 2 === 0) m.point(top[0] + p[0], top[1] + p[1], top[2] + p[2], 2, white, 0.9);
    }
    m.rod(bot[0], bot[1], bot[2], up, h, 3.2, cc, 0.7);
    glow(m, top, cc, 50, 0.5); glow(m, bot, cc, 34, 0.4); glow(m, mid, cc, 120, 0.2);
    m.cube(mid[0], mid[1], mid[2], 9, 9, 9, ctx.tone('c', 0.95), [ISO[0], ISO[1] + ax, az]);
    m.quad(top[0], top[1], top[2], 0, 1.4, 70 + ctx.rnd() * 50, cb, 0.5, 'fade');
  });

  // an icosahedron: 12 vertices, 30 edges (bright on the near side, faint on the far side), a
  // smaller one turned inside it in the light, and a lit core
  var PHI = (1 + Math.sqrt(5)) / 2, ICO = [], ICO_E = [];
  [[0, 1, PHI], [1, PHI, 0], [PHI, 0, 1]].forEach(function (v) {
    for (var s1 = -1; s1 <= 1; s1 += 2) for (var s2 = -1; s2 <= 1; s2 += 2) {
      var p = v[0] === 0 ? [0, s1, s2 * PHI] : v[0] === 1 ? [s1, s2 * PHI, 0] : [s2 * PHI, 0, s1];
      ICO.push(p.map(function (x) { return x / Math.sqrt(1 + PHI * PHI); }));
    }
  });
  for (var ia = 0; ia < 12; ia++) for (var ib = ia + 1; ib < 12; ib++) {
    var dx = ICO[ia][0] - ICO[ib][0], dy = ICO[ia][1] - ICO[ib][1], dz = ICO[ia][2] - ICO[ib][2];
    if (Math.abs(Math.hypot(dx, dy, dz) - 1.0515) < 0.05) ICO_E.push([ia, ib]);
  }
  function ico(m, o, R, rot, rgb, aNear, aFar, dots) {
    var v = ICO.map(function (p) { return add(o, rotE([p[0] * R, p[1] * R, p[2] * R], rot)); });
    ICO_E.forEach(function (e) {
      var a = v[e[0]], b = v[e[1]], near = (a[2] + b[2]) / 2 > o[2];
      seg(m, a, b, rgb, near ? aNear : aFar);
    });
    if (dots) v.forEach(function (p) { var near = p[2] > o[2]; m.point(p[0], p[1], p[2], near ? 3.4 : 2.2, rgb, near ? 1 : 0.5); if (near) m.point(p[0], p[1], p[2], 12, rgb, 0.3, true); });
  }
  A.register('s18-icosahedron', function (m, ctx) {
    var white = ctx.tone('a', 0.95), cb = ctx.light('b'), cc = ctx.light('c'), R = 54, z = 50;
    var o = seenAt(ctx, 250, columnY(ctx, 2 * R + 20), z), rot = [ctx.rnd() * TAU, ctx.rnd() * TAU, ctx.rnd() * TAU];
    ico(m, o, R, rot, white, 0.85, 0.22, true);
    ico(m, o, R * 0.42, [rot[0] + 0.6, rot[1] + 1.1, rot[2]], cb, 0.6, 0.25, false);
    m.cube(o[0], o[1], o[2], 8, 8, 8, ctx.tone('c', 0.95), ISO);
    glow(m, o, cc, 130, 0.3); glow(m, o, cc, 40, 0.75);
  });

  // a volumetric cube cluster: small cubes filling a ball, hot solid accent cubes inside and clear
  // glass ones on the outside, so the heat shows through; a few cubes drifting loose
  A.register('s18-ember-cluster', function (m, ctx) {
    var cc = ctx.light('c'), white = ctx.tone('a', 0.95), R = 46, cell = 11.5, z = 40;
    var o = seenAt(ctx, 256, columnY(ctx, 2 * R + 40), z), rot = [0.5 + ctx.rnd() * 0.3, 0.6 + ctx.rnd() * 0.4, 0], N = Math.ceil(R / cell);
    for (var i = -N; i <= N; i++) for (var j = -N; j <= N; j++) for (var k = -N; k <= N; k++) {
      var l = [i * cell, j * cell, k * cell], d = Math.hypot(l[0], l[1], l[2]) / R;
      if (d > 1 || (d > 0.72 && ctx.rnd() < 0.42)) continue;
      var p = add(o, rotE(l, rot)), s = cell * 0.78;
      if (d > 0.72) m.glass(p[0], p[1], p[2], s, s, s, d > 0.9 ? white : cc, 0.55 + ctx.rnd() * 0.3, rot);
      else m.cube(p[0], p[1], p[2], s, s, s, ctx.tone('c', 0.98 - d * 0.5), rot);
    }
    glow(m, o, cc, 210, 0.3); glow(m, o, cc, 80, 0.55);
    for (var f = 0; f < 9; f++) {
      var a = ctx.rnd() * TAU, dd = R * (1.3 + ctx.rnd() * 0.9), q = [o[0] + Math.cos(a) * dd * 0.8, o[1] + Math.sin(a) * dd * 1.2, z + (ctx.rnd() - 0.5) * 40], t = 4 + ctx.rnd() * 5;
      if (!inView(ctx, q, 8)) continue;
      m.cube(q[0], q[1], q[2], t, t, t, ctx.tone('c', 0.9), [ctx.rnd() * 3, ctx.rnd() * 3, 0]); glow(m, q, cc, t * 4, 0.4);
    }
  });

  // nested hexagons: three hexagonal prisms one inside the other round a lit core cube, corner nodes,
  // the middle prism in the light
  A.register('s18-hex-prism', function (m, ctx) {
    var white = ctx.tone('a', 0.95), cb = ctx.light('b'), ax = 0.36, az = (ctx.rnd() - 0.5) * 0.2, spin = ctx.rnd() * TAU, z = 50;
    var o = seenAt(ctx, 244, columnY(ctx, 150), z);
    [[48, 116, white, 0.85], [34, 88, cb, 0.75], [21, 62, white, 0.6]].forEach(function (pr, n) {
      var top = [], bot = [];
      for (var k = 0; k < 6; k++) {
        var a = spin + k * Math.PI / 3 + n * Math.PI / 6;
        top.push(add(o, tiltP([pr[0] * Math.cos(a), pr[1] / 2, pr[0] * Math.sin(a)], ax, az)));
        bot.push(add(o, tiltP([pr[0] * Math.cos(a), -pr[1] / 2, pr[0] * Math.sin(a)], ax, az)));
      }
      m.line(flat(top), pr[2], pr[3], true); m.line(flat(bot), pr[2], pr[3] * 0.5, true);
      for (var e = 0; e < 6; e++) {
        var near = top[e][2] > o[2];
        seg(m, top[e], bot[e], pr[2], pr[3] * (near ? 0.5 : 0.22));
        m.point(top[e][0], top[e][1], top[e][2], n ? 2.2 : 3, pr[2], 0.95);
        m.point(bot[e][0], bot[e][1], bot[e][2], 1.8, pr[2], 0.6);
      }
    });
    core(m, ctx, o, 16, [ISO[0], ISO[1] + spin, 0]);
    m.quad(o[0], o[1] + 62, z, 0, 1.4, 60 + ctx.rnd() * 40, cb, 0.45, 'fade');
    m.quad(o[0], o[1] - 62, z, Math.PI, 1.4, 50 + ctx.rnd() * 30, cb, 0.35, 'fade');
  });

  // a ring helix: small glass cubes rising round a glowing axis beside the mark, each turned along
  // its path, bigger on the near side, a few lit in the accent, a faint thread joining them
  A.register('s18-cube-spiral', function (m, ctx) {
    var white = ctx.tone('a', 0.95), cb = ctx.light('b'), cc = ctx.light('c'), R = 38, z = 40;
    var tall = 330 + ctx.rnd() * 60, mid = seenAt(ctx, 250, columnY(ctx, tall + 20), z), turns = 3 + ctx.rnd() * 1.2, a0 = ctx.rnd() * TAU;
    var n = 26 + Math.floor(ctx.rnd() * 6), every = 5 + Math.floor(ctx.rnd() * 3), off = Math.floor(ctx.rnd() * every), thread = [];
    function at(t) { var a = a0 + t * turns * TAU, r = R * (0.8 + 0.2 * Math.sin(t * Math.PI)); return [mid[0] + r * Math.cos(a), mid[1] - tall / 2 + tall * t, z + r * Math.sin(a), a]; }
    for (var i = 0; i <= 220; i++) { var q = at(i / 220); thread.push(q[0], q[1], q[2]); }
    m.line(thread, cb, 0.22);
    m.rod(mid[0], mid[1] - tall / 2 - 16, z, [0, 1, 0], tall + 32, 2.4, cb, 0.55);
    [mid[1] - tall / 2 - 16, mid[1] + tall / 2 + 16].forEach(function (y) { m.point(mid[0], y, z, 5, cc, 1); glow(m, [mid[0], y, z], cc, 36, 0.5); });
    for (var k = 0; k < n; k++) {
      var p = at((k + 0.5) / n), near = (Math.sin(p[3]) + 1) / 2, s = 10 + near * 7, rot = [0.25, -p[3], 0.15];
      if ((k + off) % every === 0) { m.glass(p[0], p[1], p[2], s, s, s, cc, 1, rot); m.cube(p[0], p[1], p[2], s * 0.5, s * 0.5, s * 0.5, ctx.tone('c', 0.95), rot); glow(m, p, cc, s * 4, 0.4); }
      else m.glass(p[0], p[1], p[2], s, s, s, white, 0.5 + near * 0.45, rot);
      seg(m, p, [mid[0], p[1], z], cb, 0.08 + near * 0.1);
    }
    glow(m, mid, cb, 150, 0.12);
  });

  /* ---------- 03-aura: structures round the mark ---------- */

  // an allocation grid: a 3 x 3 x 3 lattice of spaced glass cubes threaded on axis lines, nodes
  // between them, one cube lit in the accent
  A.register('s18-grid-lattice', function (m, ctx) {
    var white = ctx.tone('a', 0.95), cb = ctx.light('b'), cc = ctx.light('c'), sp = 168, s = 60;
    var o = seenAt(ctx, 50, 0, -360), rot = [0.38 + ctx.rnd() * 0.12, 0.55 + ctx.rnd() * 0.3, (ctx.rnd() - 0.5) * 0.12];
    function P(i, j, k) { return add(o, rotE([i * sp, j * sp, k * sp], rot)); }
    var out = [], all = [];
    for (var hi = -1; hi <= 1; hi++) for (var hj = -1; hj <= 1; hj++) for (var hk = 0; hk <= 1; hk++) {
      var hs = ctx.seen.apply(null, P(hi, hj, hk));
      all.push([hi, hj, hk]); if ((Math.abs(hs[0]) > 200 || Math.abs(hs[1]) > 260) && inView(ctx, P(hi, hj, hk), 30)) out.push([hi, hj, hk]);
    }
    var pool = out.length ? out : all, hot = pool[Math.floor(ctx.rnd() * pool.length)];
    for (var a = -1; a <= 1; a++) for (var b = -1; b <= 1; b++) {
      seg(m, P(-1.45, a, b), P(1.45, a, b), cb, 0.2); seg(m, P(a, -1.45, b), P(a, 1.45, b), cb, 0.2); seg(m, P(a, b, -1.45), P(a, b, 1.45), cb, 0.2);
      for (var c = -1; c <= 0; c++) {
        [P(c + 0.5, a, b), P(a, c + 0.5, b), P(a, b, c + 0.5)].forEach(function (q) { m.point(q[0], q[1], q[2], 3, white, 0.8); });
      }
    }
    for (var i = -1; i <= 1; i++) for (var j = -1; j <= 1; j++) for (var k = -1; k <= 1; k++) {
      var p = P(i, j, k), far = (p[2] - o[2]) / (sp * 1.7);
      if (i === hot[0] && j === hot[1] && k === hot[2]) {
        m.glass(p[0], p[1], p[2], s, s, s, cc, 1, rot); m.cube(p[0], p[1], p[2], s * 0.5, s * 0.5, s * 0.5, ctx.tone('c', 0.95), rot);
        glow(m, p, cc, 260, 0.35); glow(m, p, cc, 90, 0.7);
      } else {
        m.glass(p[0], p[1], p[2], s, s, s, white, 0.62 + far * 0.3, rot);
        corners(p, s, s, s, rot).forEach(function (q) { m.point(q[0], q[1], q[2], 2.2, white, 0.7); });
      }
    }
  });

  // a glass pyramid round the mark: the mark stands inside it, a lit core cube behind the mark's
  // centre, faint level lines on its faces and a streak rising from the apex
  A.register('s18-pyramid', function (m, ctx) {
    var white = ctx.tone('a', 0.95), cb = ctx.light('b'), cc = ctx.light('c'), ry = 0.3 + ctx.rnd() * 0.3, R = 330, cz = -90;
    var apex = [20, 338, cz], baseY = -322, base = [];
    for (var k = 0; k < 4; k++) { var t = Math.PI / 4 + k * Math.PI / 2 + ry; base.push([20 + R * Math.cos(t), baseY, cz + R * Math.sin(t)]); }
    for (var e = 0; e < 4; e++) {
      var a = base[e], b = base[(e + 1) % 4], near = (a[2] + b[2]) / 2 > cz;
      seg(m, a, b, white, near ? 0.55 : 0.3);
      seg(m, apex, a, white, a[2] > cz + 100 ? 0.35 : 0.75);
      for (var d = 1; d < 12; d++) { var q = lerp(apex, a, d / 12); if (inView(ctx, q, 4)) m.point(q[0], q[1], q[2], 2.2, white, 0.6); }
      [0.3, 0.55, 0.8].forEach(function (h) { seg(m, lerp(apex, a, h), lerp(apex, b, h), cb, near ? 0.1 : 0.16); });
    }
    base.concat([apex]).forEach(function (p) { if (inView(ctx, p, 4)) { m.point(p[0], p[1], p[2], 5, white, 1); glow(m, p, cb, 30, 0.45); } });
    m.quad(apex[0], apex[1], apex[2], 0, 1.6, 120, cb, 0.55, 'fade');
    var c = [20, -40, cz - 30], rot = [ISO[0], ISO[1] + ry, 0];
    m.glass(c[0], c[1], c[2], 58, 58, 58, cc, 0.8, rot);
    m.cube(c[0], c[1], c[2], 24, 24, 24, ctx.tone('c', 0.95), rot);
    glow(m, c, cc, 420, 0.25); glow(m, c, cc, 140, 0.55);
  });

  // a bridge: an arch of glass blocks over the mark, each turned along the curve like a stone in an
  // arch, a node between blocks, a lit keystone at the crown and a dotted inner arch
  A.register('s18-arch', function (m, ctx) {
    var white = ctx.tone('a', 0.95), cb = ctx.light('b'), cc = ctx.light('c'), cx = 42, a = 262, yb = -238, b = 492, z = -150, n = 27;
    function at(t, k, zz) { return seenAt(ctx, cx + a * k * Math.cos(t), yb + b * k * Math.sin(t), zz == null ? z : zz); }
    for (var i = 0; i < n; i++) {
      var t = Math.PI * (i + 0.5) / n, p = at(t, 1), ang = Math.atan2(b * Math.cos(t), -a * Math.sin(t)), rot = [0, 0, ang];
      if (!inView(ctx, p, 6)) continue;
      if (i === (n - 1) / 2) {
        m.glass(p[0], p[1], p[2], 42, 32, 38, cc, 1, rot); m.cube(p[0], p[1], p[2], 18, 14, 16, ctx.tone('c', 0.95), rot);
        glow(m, p, cc, 200, 0.35); glow(m, p, cc, 60, 0.7);
      } else m.glass(p[0], p[1], p[2], 38, 26, 34, white, 0.9, rot);
      var q = at(Math.PI * (i + 1) / n, 1);
      if (i < n - 1 && inView(ctx, q, 6)) m.point(q[0], q[1], q[2], 3.6, white, 1);
    }
    for (var d = 0; d < 90; d++) { var r = at(Math.PI * d / 89, 0.88, z - 40); if (inView(ctx, r, 6)) m.point(r[0], r[1], r[2], 1.8, cb, 0.55); }
    [at(0, 1), at(Math.PI, 1)].forEach(function (f) {
      var g = [f[0], f[1] - 22, f[2]];
      if (inView(ctx, g, 6)) { m.cube(g[0], g[1], g[2], 50, 14, 44, ctx.tone('a', 0.45)); m.point(g[0], g[1] + 8, g[2], 4, cc, 1); glow(m, [g[0], g[1] + 8, g[2]], cc, 30, 0.5); }
    });
  });

  /* ---------- 01-backdrop: far behind ---------- */

  // a pillar field: a round field of glass pillars far behind, seen from above, tallest in the middle,
  // each with a lit cap; most caps white, a few in the light and the accent
  A.register('s18-pillar-field', function (m, ctx) {
    var white = ctx.tone('a', 0.9), edge = ctx.tone('b', 0.85), ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c');
    var rot = [0.4, 0.5 + ctx.rnd() * 0.4, 0], o = seenAt(ctx, 40, -170, -620), cell = 50, N = 7, ph = ctx.rnd() * TAU, ph2 = ctx.rnd() * TAU, w = 21;
    for (var i = -N; i <= N; i++) for (var j = -N; j <= N; j++) {
      var r = Math.hypot(i, j) / N;
      if (r > 1.02) continue;
      var x = (i + (j % 2 ? 0.5 : 0)) * cell, zz = j * cell * 0.88;
      var f = Math.pow(1 - r * 0.85, 1.4) * (0.55 + 0.45 * (0.5 + 0.5 * Math.sin(i * 0.7 + ph) * Math.cos(j * 0.6 + ph2))) * (1 - Math.max(0, j / N) * 0.45);
      var h = 14 + 200 * f * (ctx.rnd() < 0.08 ? 1.45 : 0.8 + ctx.rnd() * 0.3), base = add(o, rotE([x, 0, zz], rot));
      var mid = add(o, rotE([x, h / 2, zz], rot)), top = add(o, rotE([x, h, zz], rot)), roll = ctx.rnd();
      var cap = roll < 0.09 ? cc : roll < 0.3 ? ca : cb;
      m.glass(mid[0], mid[1], mid[2], w, h, w, roll < 0.3 ? white : edge, 0.12 + f * 0.22, rot);
      m.bar(top[0], top[1], top[2], w, 1.5, w, cap, roll < 0.09 ? 0.55 : 0.24, rot);
      m.point(top[0], top[1], top[2], 3, cap, 1);
      if (roll < 0.09) glow(m, top, cc, 56, 0.45);
      m.point(base[0], base[1], base[2], 2, cb, 0.35);
    }
    var ring1 = [];
    for (var k = 0; k < 140; k++) { var t = k / 140 * TAU; ring1.push(add(o, rotE([Math.cos(t) * (N + 0.9) * cell, 0, Math.sin(t) * (N + 0.9) * cell * 0.88], rot))); }
    m.line(flat(ring1), cb, 0.24, true);
  });

  // a cube wall: a wall of glass cubes far behind, turned a little, cubes pushed out or in like a
  // relief; a few cubes missing, a few lit in the accent
  A.register('s18-cube-wall', function (m, ctx) {
    var white = ctx.tone('a', 0.95), cc = ctx.light('c'), cb = ctx.light('b'), cell = 62, s = 42;
    var rot = [0.1, -0.36 - ctx.rnd() * 0.12, 0], o = seenAt(ctx, 60, 10, -420), ph = ctx.rnd() * TAU, ph2 = ctx.rnd() * TAU;
    for (var i = -5; i <= 5; i++) for (var j = -5; j <= 5; j++) {
      var r = Math.hypot(i / 5.6, j / 5.6);
      if (r > 1 || ctx.rnd() < 0.1 + r * 0.25) continue;
      var wave = Math.sin(i * 0.6 + ph) * Math.cos(j * 0.5 + ph2), push = wave * 50 + (ctx.rnd() < 0.07 ? 70 : 0);
      var p = add(o, rotE([i * cell, j * cell, push], rot)), roll = ctx.rnd(), fade = 1 - r * 0.6;
      if (roll < 0.05) { m.glass(p[0], p[1], p[2], s, s, s, cc, 1, rot); m.cube(p[0], p[1], p[2], s * 0.42, s * 0.42, s * 0.42, ctx.tone('c', 0.95), rot); glow(m, p, cc, 130, 0.4); }
      else m.glass(p[0], p[1], p[2], s, s, s, white, (0.18 + (wave + 1) * 0.16) * fade + 0.08, rot);
      if (roll > 0.88) m.point(p[0], p[1], p[2], 3, cb, 0.8 * fade);
    }
  });
})();

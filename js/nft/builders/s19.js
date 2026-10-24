/* DEFXN identity card: builders from reference sheet 19 (networks, globes, trees and connections).
   A dotted world seen as a horizon below the mark, a dot map laid flat under it, a geodesic dome, a
   wire globe that carries a key fingerprint, a globe with arcs jumping over it, a globe in a disc of
   rings with pins, three dotted worlds linked by arcs, a network star of small stars, a burst of
   spokes with glass tips, nested polygons of nodes, a ring of chords, a lineage tree, a name tree,
   an ancestry graph that splits and rejoins, circuit traces, braided fibres and route arcs. Each builder is named by an element file under layers/<NN-key>/sheet-19/.
   The space and the m / ctx calls are described at the top of art3d.js.

   Continents are made, not mapped: a few seeded blobs on the sphere with coasts roughened by seeded
   waves (makeLand). Every random value comes from ctx.rnd(), so the same card draws the same world.

   Placement: big shapes sit behind the mark (z < 0) and are placed by where they are SEEN (atSeen),
   because the rest tilt carries far things to the left. Lines and points are drawn only where they
   are seen inside x -240..320, y -340..340 and clear of the genesis ID and the serial (ok, clipLine).
   White is ctx.light('a') or ctx.tone('a', v); the accents are ctx.light('b') (the light) and
   ctx.light('c') (the glow: cyan in Glass, amber in Copper). */
(function () {
  'use strict';
  var A = window.Art3D, TAU = Math.PI * 2;

  /* ---------- vectors ---------- */
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function mul(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function len(a) { return Math.hypot(a[0], a[1], a[2]); }
  function unit(a) { var k = len(a) || 1; return [a[0] / k, a[1] / k, a[2] / k]; }
  function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rotX(p, a) { var c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; }
  function rotY(p, a) { var c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; }
  function rotZ(p, a) { var c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function gauss(ctx) { return ctx.rnd() + ctx.rnd() + ctx.rnd() - 1.5; }
  // the XYZ Euler angles (three.js order, the order a block's rot uses) of the turn whose columns are
  // e1, e2, e3: a flat tile turned this way lies in the plane of e1 and e2 and faces e3
  function rotOf(e1, e2, e3) {
    var m13 = clamp(e3[0], -1, 1), y = Math.asin(m13);
    if (Math.abs(m13) < 0.9999999) return [Math.atan2(-e3[1], e3[2]), y, Math.atan2(-e2[0], e1[0])];
    return [Math.atan2(e2[2], e2[1]), y, 0];
  }

  /* ---------- where things are seen ---------- */
  // The card's camera in art space, as art3d.js's seen() places it: the art is turned by the rest
  // tilt (y, then x), moved by the mark's offset from the card's middle (180, -7), and seen from
  // 350 / tan(16 degrees) units away. A globe needs it to know which half faces the viewer.
  var CAM = (function () {
    var rx = A.REST.x, ry = A.REST.y, D = 350 / Math.tan(16 * Math.PI / 180), x1 = -180, y2 = 7, z2 = D;
    var y = y2 * Math.cos(rx) + z2 * Math.sin(rx), z1 = -y2 * Math.sin(rx) + z2 * Math.cos(rx);
    return [x1 * Math.cos(ry) - z1 * Math.sin(ry), y, x1 * Math.sin(ry) + z1 * Math.cos(ry)];
  })();
  // the art-space point at depth z that is SEEN at (xs, ys)
  function atSeen(xs, ys, z) {
    var a = A.seen(0, 0, z), b = A.seen(100, 100, z), kx = (b[0] - a[0]) / 100, ky = (b[1] - a[1]) / 100, x = xs, y = ys;
    for (var i = 0; i < 6; i++) { var s = A.seen(x, y, z); x += (xs - s[0]) / kx; y += (ys - s[1]) / ky; }
    return [x, y, z];
  }
  // seen inside the art's box, `pad` units in
  function inBox(p, pad) {
    var s = A.seen(p[0], p[1], p[2]); pad = pad || 0;
    return s[0] > -240 + pad && s[0] < 320 - pad && s[1] > -340 + pad && s[1] < 340 - pad;
  }
  // seen inside the box and clear of the card's words
  function ok(ctx, p, pad) { pad = pad == null ? 6 : pad; return inBox(p, pad) && ctx.clearAt(p[0], p[1], p[2], pad); }
  // 0 at the box's edge, 1 from `w` units inside it: a wide thing thins out instead of stopping
  function fade(p, w) {
    var s = A.seen(p[0], p[1], p[2]), d = Math.min(s[0] + 240, 320 - s[0], s[1] + 340, 340 - s[1]);
    return clamp(d / w, 0, 1);
  }
  // is this point of a sphere on the half that faces the viewer?
  function facing(p, n) { return dot(n, sub(CAM, p)) > 0; }
  // is P hidden behind the sphere (O, R) from the viewer?
  function behind(P, O, R) {
    var d = sub(P, CAM), L = len(d), u = mul(d, 1 / L), oc = sub(CAM, O), b = dot(oc, u), c = dot(oc, oc) - R * R, h = b * b - c;
    if (h <= 0) return false;
    var t = -b - Math.sqrt(h);
    return t > 0 && t < L - 2;
  }
  // the outline of a sphere as the viewer sees it: the circle where the view grazes its surface
  function outline(O, R, n) {
    var v = sub(CAM, O), D = len(v), u = mul(v, 1 / D), c = add(O, mul(u, R * R / D)), r = R * Math.sqrt(Math.max(0, 1 - R * R / (D * D)));
    var e1 = unit(cross([0, 1, 0], u)), e2 = cross(u, e1), pts = [];
    for (var i = 0; i < n; i++) { var t = i / n * TAU; pts.push(add(c, add(mul(e1, r * Math.cos(t)), mul(e2, r * Math.sin(t))))); }
    return pts;
  }

  /* ---------- drawing ---------- */
  // a line through [[x,y,z], ...], drawn only in runs that are seen in the box and clear of the words
  function clipLine(m, ctx, pts, rgb, alpha, closed, pad) {
    var run = [], n = pts.length, total = closed ? n + 1 : n;
    for (var i = 0; i < total; i++) {
      var q = pts[i % n];
      if (q && ok(ctx, q, pad)) run.push(q[0], q[1], q[2]);
      else { if (run.length >= 6) m.line(run, rgb, alpha); run = []; }
    }
    if (run.length >= 6) m.line(run, rgb, alpha);
  }
  function along(a, b, step) {
    var n = Math.max(1, Math.ceil(len(sub(b, a)) / step)), out = [];
    for (var i = 0; i <= n; i++) out.push(lerp(a, b, i / n));
    return out;
  }
  function clipSeg(m, ctx, a, b, rgb, alpha, pad) { clipLine(m, ctx, along(a, b, 10), rgb, alpha, false, pad); }
  function node(m, p, rgb, size, glow, ga) {        // a hard dot, with a soft glow round it when asked
    m.point(p[0], p[1], p[2], size, rgb, 1);
    if (glow) m.point(p[0], p[1], p[2], size * glow, rgb, ga == null ? 0.35 : ga, true);
  }
  // a small closed shape of `sides` corners in the plane of e1, e2 (a ring when sides is large)
  function loop(c, e1, e2, r, sides, turn) {
    var pts = [];
    for (var i = 0; i < sides; i++) { var t = (turn || 0) + i / sides * TAU; pts.push(add(c, add(mul(e1, r * Math.cos(t)), mul(e2, r * Math.sin(t))))); }
    return pts;
  }
  function flat(pts) { var o = []; pts.forEach(function (p) { o.push(p[0], p[1], p[2]); }); return o; }
  var EX = [1, 0, 0], EY = [0, 1, 0], EZ = [0, 0, 1];
  // a Catmull-Rom curve through K, u from 0 to 1
  function spline(K, u) {
    var n = K.length - 1, f = clamp(u * n, 0, n - 1e-9), i = Math.floor(f), t = f - i, t2 = t * t, t3 = t2 * t, out = [];
    var p0 = K[Math.max(0, i - 1)], p1 = K[i], p2 = K[i + 1], p3 = K[Math.min(n, i + 2)];
    for (var d = 0; d < 3; d++) out.push(0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3));
    return out;
  }

  /* ---------- seeded continents ---------- */
  // land(p) for a unit vector p: above 0 is land. Seven to nine large blobs and a few islands, their
  // edges bent by a slow warp and roughened by quick waves, so coasts are ragged and no two cards
  // share a world.
  function makeLand(ctx) {
    var blobs = [], waves = [], warp = [], k, nb = 7 + Math.floor(ctx.rnd() * 3);
    function dir() { var u = ctx.rnd() * 2 - 1, t = ctx.rnd() * TAU, s = Math.sqrt(1 - u * u); return [s * Math.cos(t), u * 0.85, s * Math.sin(t)]; }
    for (k = 0; k < nb + 6; k++) blobs.push({ c: unit(dir()), r: k < nb ? 0.3 + ctx.rnd() * 0.36 : 0.06 + ctx.rnd() * 0.08 });
    for (k = 0; k < 6; k++) waves.push({ d: unit(dir()), f: 7 + ctx.rnd() * 9, ph: ctx.rnd() * TAU, a: 0.09 + ctx.rnd() * 0.07 });
    for (k = 0; k < 3; k++) warp.push({ f: 2.4 + ctx.rnd() * 1.6, ph: ctx.rnd() * TAU });
    return function (p) {
      var q = unit([p[0] + 0.22 * Math.sin(p[1] * warp[0].f + warp[0].ph), p[1] + 0.22 * Math.sin(p[2] * warp[1].f + warp[1].ph), p[2] + 0.22 * Math.sin(p[0] * warp[2].f + warp[2].ph)]);
      var best = -2, w = 0;
      for (var i = 0; i < blobs.length; i++) { var b = blobs[i]; best = Math.max(best, 1 - Math.acos(clamp(dot(q, b.c), -1, 1)) / b.r); }
      for (var j = 0; j < waves.length; j++) { var v = waves[j]; w += Math.sin(dot(p, v.d) * v.f + v.ph) * v.a; }
      return best + w;
    };
  }
  function latLon(lat, lon) { var c = Math.cos(lat); return [c * Math.cos(lon), Math.sin(lat), c * Math.sin(lon)]; }

  /* ================= 01-backdrop: far behind the mark ================= */

  // a dotted world seen from orbit: the top of a huge globe rises behind the lower half of the mark,
  // its land in bright dots and its sea in a few faint ones, rows of latitude crowding toward the
  // edge, and a thin rim of light where the view grazes it
  A.register('s19-horizon', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), land = makeLand(ctx);
    var R = ctx.num('radius', 640) * (0.94 + ctx.rnd() * 0.12), z0 = -R - 40, top = -10 - ctx.rnd() * 60;
    var T = atSeen(40 + (ctx.rnd() - 0.5) * 40, top, z0), O = [T[0], T[1] - R, z0];
    var tilt = -0.35 - ctx.rnd() * 0.35, spin = ctx.rnd() * TAU, step = ctx.num('step', 0.95) * Math.PI / 180;
    for (var lat = -Math.PI / 2 + step; lat < Math.PI / 2; lat += step) {
      var n = Math.max(1, Math.round(TAU * Math.cos(lat) / step)), sea = 0;
      for (var i = 0; i < n; i++) {
        var p = latLon(lat, i / n * TAU + lat * 3), q = rotX(rotY(p, spin), tilt), P = add(O, mul(q, R));
        if (P[1] < O[1] + R * 0.35 || P[2] > -30) continue;
        if (!facing(P, q) || !ok(ctx, P, 4)) continue;
        var graze = clamp(dot(q, unit(sub(CAM, P))) * 3.2, 0, 1), f = fade(P, 50), isLand = land(p) > 0;
        if (!isLand && (sea++ % 5)) continue;
        var col = graze < 1 ? lerp(cb, ca, graze) : ca;
        if (isLand) m.point(P[0], P[1], P[2], 2.1 + ctx.rnd() * 0.6, ctx.rnd() < 0.03 ? cc : col, (0.42 + 0.55 * graze) * f);
        else m.point(P[0], P[1], P[2], 1.3, cb, (0.06 + 0.07 * graze) * f);
      }
    }
    var rim = outline(O, R, 900), lit = [];
    clipLine(m, ctx, rim, cb, 0.6, true, 4);
    clipLine(m, ctx, outline(O, R * 1.012, 900), cb, 0.2, true, 4);
    rim.forEach(function (P, k) { if (k % 14 === 0 && ok(ctx, P, 10)) lit.push(P); });
    lit.forEach(function (P) { m.point(P[0], P[1], P[2], 34, cc, 0.1 * fade(P, 60), true); });
    for (var c = 0; c < 9; c++) {                    // a few lit places on the land
      var u = latLon(ctx.rnd() * 1.6 - 0.3, ctx.rnd() * TAU), w = rotX(rotY(u, spin), tilt), Q = add(O, mul(w, R));
      if (land(u) > 0.1 && facing(Q, w) && Q[2] < -30 && ok(ctx, Q, 12)) node(m, Q, cc, 3.6, 7, 0.4);
    }
  });

  // a dot map of the world laid flat on a plane under the mark, tipped a little toward the viewer:
  // bright dots where there is land, a sparse faint grid over the sea, a dotted equator and tropics,
  // and a few pins of light standing on the land
  A.register('s19-dot-map', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), land = makeLand(ctx);
    var th = 0.7 + ctx.rnd() * 0.1, yaw = (ctx.rnd() - 0.5) * 0.16, Wm = 580, Hm = 290, step = ctx.num('step', 7);
    var C = atSeen(46, ctx.num('y', -205), -250), ex = rotY(EX, yaw), ev = rotY([0, -Math.sin(th), Math.cos(th)], yaw);
    var spin = ctx.rnd() * TAU;
    function at(u, v) { return add(C, add(mul(ex, u), mul(ev, v))); }
    function sphereOf(u, v) { return latLon(-v / (Hm / 2) * Math.PI / 2 * 0.98, u / (Wm / 2) * Math.PI + spin); }
    var rows = Math.round(Hm / step), cols = Math.round(Wm / step);
    for (var r = 0; r <= rows; r++) for (var c = 0; c <= cols; c++) {
      var u = -Wm / 2 + c * step, v = -Hm / 2 + r * step, P = at(u, v);
      if (P[2] > -20 || !ok(ctx, P, 4)) continue;
      var f = fade(P, 70), isLand = land(sphereOf(u, v)) > 0;
      if (isLand) m.point(P[0], P[1], P[2], 3.1, ca, (0.62 + 0.36 * (r / rows)) * f);
      else if (r % 2 === 0 && c % 2 === 0) m.point(P[0], P[1], P[2], 1.2, cb, 0.12 * f);
    }
    [0, 23.4, -23.4].forEach(function (d, k) {      // the equator and the two tropics, dotted
      var v = -d / 90 * Hm / 2;
      for (var x = -Wm / 2; x <= Wm / 2; x += k ? 8 : 4.5) { var P = at(x, v); if (P[2] < -20 && ok(ctx, P, 4)) m.point(P[0], P[1], P[2], k ? 1.3 : 1.7, cb, (k ? 0.25 : 0.45) * fade(P, 70)); }
    });
    var frame = [], cs = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]];
    for (var e = 0; e < 4; e++) frame = frame.concat(along(at(cs[e][0] * Wm / 2, cs[e][1] * Hm / 2), at(cs[e + 1][0] * Wm / 2, cs[e + 1][1] * Hm / 2), 10));
    clipLine(m, ctx, frame.filter(function (p) { return p[2] < -20; }), cb, 0.3, false, 4);
    cs.slice(0, 4).forEach(function (q) {           // corner ticks just outside the map
      var o = at(q[0] * (Wm / 2 + 10), q[1] * (Hm / 2 + 10)), a = at(q[0] * (Wm / 2 + 10) - q[0] * 22, q[1] * (Hm / 2 + 10)), b = at(q[0] * (Wm / 2 + 10), q[1] * (Hm / 2 + 10) - q[1] * 22);
      if (o[2] < -20 && ok(ctx, o, 4)) m.line([a[0], a[1], a[2], o[0], o[1], o[2], b[0], b[1], b[2]], cb, 0.7);
    });
    var pins = 0;
    for (var t = 0; t < 120 && pins < 6; t++) {
      var pu = (ctx.rnd() - 0.5) * Wm * 0.8, pv = (ctx.rnd() - 0.5) * Hm * 0.8, Q = at(pu, pv);
      if (land(sphereOf(pu, pv)) < 0.15 || Q[2] > -30 || !ok(ctx, Q, 18)) continue;
      pins++;
      var h = 30 + ctx.rnd() * 70;
      m.line(ctx.ring(9, 24, 0, 0, Q[0], Q[1], Q[2]), cc, 0.6, true);
      m.quad(Q[0], Q[1], Q[2], 0, 1.6, h, cc, 0.7, 'fade');
      node(m, Q, cc, 4, 6, 0.4);
      m.point(Q[0], Q[1] + h, Q[2], 2.6, ca, 0.9);
    }
  });

  // a ring of nodes far behind, every node tied to one or two others across the ring by curves that
  // bow toward the middle, a few of them lit; a dotted ring just outside
  A.register('s19-chord-ring', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), z0 = -230, N = 30 + Math.floor(ctx.rnd() * 6);
    var rx = 268, ry = 312, ph = ctx.rnd() * TAU, mid = atSeen(40, 0, z0), nodes = [], i;
    function onRing(t, grow) { return atSeen(40 + (rx + grow) * Math.cos(t), (ry + grow) * Math.sin(t), z0 + 46 * Math.sin(t + ph)); }
    for (i = 0; i < N; i++) { var t = (i + (ctx.rnd() - 0.5) * 0.5) / N * TAU; nodes.push({ t: t, p: onRing(t, 0) }); }
    var pairs = {}, hot = 0;
    nodes.forEach(function (a, i0) {
      var links = ctx.rnd() < 0.45 ? 2 : 1;
      for (var l = 0; l < links; l++) {
        var j = (i0 + 5 + Math.floor(ctx.rnd() * (N - 10))) % N, key = Math.min(i0, j) + '-' + Math.max(i0, j);
        if (pairs[key]) continue;
        pairs[key] = 1;
        var b = nodes[j].p, ctl = lerp(mid, lerp(a.p, b, 0.5), 0.18), pts = [];
        for (var s = 0; s <= 30; s++) { var u = s / 30, w = 1 - u; pts.push([w * w * a.p[0] + 2 * w * u * ctl[0] + u * u * b[0], w * w * a.p[1] + 2 * w * u * ctl[1] + u * u * b[1], w * w * a.p[2] + 2 * w * u * ctl[2] + u * u * b[2]]); }
        var lit = hot < 4 && ctx.rnd() < 0.14;
        if (lit) hot++;
        clipLine(m, ctx, pts, lit ? cc : cb, lit ? 0.6 : 0.13 + ctx.rnd() * 0.12, false, 4);
      }
    });
    var ringPts = [];
    for (i = 0; i < 240; i++) ringPts.push(onRing(i / 240 * TAU, 0));
    clipLine(m, ctx, ringPts, ca, 0.12, true, 4);
    for (i = 0; i < 160; i++) { var q = onRing(i / 160 * TAU, 18); if (ok(ctx, q, 4)) m.point(q[0], q[1], q[2], 1.3, ca, 0.35); }
    nodes.forEach(function (n, k) {
      if (!ok(ctx, n.p, 10)) return;
      var tip = onRing(n.t, 11);
      m.line([n.p[0], n.p[1], n.p[2], tip[0], tip[1], tip[2]], ca, 0.5);
      if (k % 7 === 3) node(m, n.p, cc, 4.6, 6, 0.42); else node(m, n.p, ca, 3, 3.5, 0.25);
    });
  });

  // a lineage tree rising from the bottom: a trunk that splits again and again into branches that
  // spread behind the mark, glowing nodes at the joints, small glass cubes at some tips
  A.register('s19-lineage', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), maxD = ctx.num('depth', 6);
    var root = atSeen(40 + (ctx.rnd() - 0.5) * 50, -352, -190);
    function grow(p, dir, L, d) {
      var end = add(p, mul(dir, L));
      for (var k = 0; k < 6 && !inBox(end, 14); k++) { L *= 0.8; end = add(p, mul(dir, L)); }
      if (!inBox(end, 14) || L < 14) return;
      var side = unit(cross(dir, EZ)), bend = add(lerp(p, end, 0.5), mul(side, L * 0.07 * (ctx.rnd() - 0.5))), pts = [];
      for (var s = 0; s <= 10; s++) { var u = s / 10, w = 1 - u; pts.push(add(add(mul(p, w * w), mul(bend, 2 * w * u)), mul(end, u * u))); }
      clipLine(m, ctx, pts, d < 2 ? cb : ca, d < 2 ? 0.55 : 0.5 - d * 0.04, false, 2);
      if (d < 2) m.rod(p[0], p[1], p[2], dir, L, 3.4 - d * 1.2, cb, 0.22);
      if (d >= maxD || end[1] > 300) {
        if (!ok(ctx, end, 6)) return;
        if (ctx.rnd() < 0.5) { var s0 = 4.5 + ctx.rnd() * 3; m.glass(end[0], end[1], end[2], s0, s0, s0, ctx.tone('a', 0.95), 0.85, [0.6, 0.78, 0]); }
        else m.point(end[0], end[1], end[2], 2.4, ca, 0.9);
        return;
      }
      if (ok(ctx, end, 8)) {
        if (d < 4) { node(m, end, cc, 4.6 - d * 0.5, 6, 0.42); m.line(flat(loop(end, EX, EY, 7.5 - d, 18)), cc, 0.55, true); }
        else node(m, end, ca, 2.6, 3, 0.25);
      }
      var kids = d < 3 && ctx.rnd() < 0.28 ? 3 : 2, spread = 0.36 + ctx.rnd() * 0.26;
      for (var c = 0; c < kids; c++) {
        var a = kids === 3 ? (c - 1) * spread * 1.1 : (c ? 1 : -1) * spread * (0.7 + ctx.rnd() * 0.5);
        var nd = rotZ(dir, a + (ctx.rnd() - 0.5) * 0.12);
        nd = unit([nd[0], nd[1] * 1.05, nd[2] + (ctx.rnd() - 0.5) * 0.5 - (end[2] + 190) / 500]);
        grow(end, nd, L * (0.76 + ctx.rnd() * 0.1), d + 1);
      }
    }
    grow(root, unit([(ctx.rnd() - 0.5) * 0.1, 1, 0]), 165 + ctx.rnd() * 30, 0);
  });

  // a name tree read from the top down: a root square, its children, theirs and theirs, joined by
  // square-cornered lines (down, across, down); one path from the root to a leaf is lit
  A.register('s19-name-tree', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), Y = [314, 132, -88, -306], S = [30, 21, 15, 10.5];
    var yaw = 0.22 + ctx.rnd() * 0.12;
    function Z(xs) { return -175 - (xs - 40) * Math.sin(yaw) * 0.6; }
    function P(xs, ys) { return atSeen(xs, ys, Z(xs)); }
    // the shape of the tree: 3 or 4 branches, each with 2 or 3, each of those with 1 to 3 leaves
    var tree = { kids: [] }, n1 = 3 + (ctx.rnd() < 0.35 ? 1 : 0), leaves = [];
    for (var a = 0; a < n1; a++) {
      var b = { kids: [] }, n2 = 2 + (ctx.rnd() < 0.4 ? 1 : 0);
      for (var c = 0; c < n2; c++) { var d = { kids: [] }, n3 = 1 + Math.floor(ctx.rnd() * 3); for (var e = 0; e < n3; e++) d.kids.push({ kids: [] }); b.kids.push(d); }
      tree.kids.push(b);
    }
    (function walk(t, lv) { if (lv === 3) leaves.push(t); else t.kids.forEach(function (k) { walk(k, lv + 1); }); })(tree, 0);
    var x0 = -214, x1 = 304, gap = (x1 - x0) / Math.max(1, leaves.length - 1);
    leaves.forEach(function (l, i) { l.x = x0 + i * gap; });
    (function place(t) { if (t.kids.length) { t.kids.forEach(place); t.x = t.kids.reduce(function (s, k) { return s + k.x; }, 0) / t.kids.length; } })(tree);
    // the lit path
    var path = [tree], cur = tree;
    while (cur.kids.length) { cur = cur.kids[Math.floor(ctx.rnd() * cur.kids.length)]; path.push(cur); }
    function wire(pts, lit) {
      var out = [];
      for (var i = 0; i + 1 < pts.length; i++) {
        var a2 = pts[i], b2 = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b2[0] - a2[0], b2[1] - a2[1]) / 10));
        for (var s = 0; s < n; s++) out.push(P(a2[0] + (b2[0] - a2[0]) * s / n, a2[1] + (b2[1] - a2[1]) * s / n));
      }
      var last = pts[pts.length - 1]; out.push(P(last[0], last[1]));
      clipLine(m, ctx, out, lit ? cc : ca, lit ? 0.75 : 0.32, false, 4);
    }
    (function links(t, lv) {
      if (!t.kids.length) return;
      var yb = (Y[lv] - S[lv] / 2 + Y[lv + 1] + S[lv + 1] / 2) / 2, lo = t.kids[0].x, hi = t.kids[t.kids.length - 1].x;
      wire([[t.x, Y[lv] - S[lv] / 2], [t.x, yb]], path.indexOf(t) >= 0);
      if (hi - lo > 1) wire([[lo, yb], [hi, yb]], false);
      var j = P(t.x, yb); if (ok(ctx, j, 4)) m.point(j[0], j[1], j[2], 3, ca, 0.85);
      t.kids.forEach(function (k) {
        var on = path.indexOf(k) >= 0;
        if (on) wire([[t.x, yb], [k.x, yb]], true);
        wire([[k.x, yb], [k.x, Y[lv + 1] + S[lv + 1] / 2]], on);
        links(k, lv + 1);
      });
    })(tree, 0);
    (function boxes(t, lv) {
      var p = P(t.x, Y[lv]), s = S[lv], on = path.indexOf(t) >= 0;
      if (ok(ctx, p, s * 0.6)) {
        m.glass(p[0], p[1], p[2], s, s, 3, on ? ctx.tone('c', 0.95) : ctx.tone('a', 0.95), on ? 1 : 0.8, [0, yaw * 0.6, 0]);
        if (on) node(m, p, cc, s * 0.18 + 2, 8, 0.4);
        else if (lv < 3) m.point(p[0], p[1], p[2], s * 0.14 + 1.5, ca, 0.8);
      }
      t.kids.forEach(function (k) { boxes(k, lv + 1); });
    })(tree, 0);
  });

  // an ancestry graph across the art: lanes that split and rejoin from left to right on a sheet that
  // curves away at both ends, hexagon nodes (doubled where lines rejoin), one line of descent lit
  A.register('s19-ancestry', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), COLS = 8, LANES = 6, grid = [], c, l;
    function Z(xs) { return -130 - (xs - 40) * (xs - 40) / 1100; }
    function P(xs, ys) { return atSeen(xs, ys, Z(xs)); }
    function X(c2) { return -224 + c2 * 77; }
    function Yl(l2) { return -262 + l2 * 104.8; }
    for (c = 0; c < COLS; c++) {
      grid.push([]);
      for (l = 0; l < LANES; l++) grid[c].push(ctx.rnd() < 0.55 ? { c: c, l: l, ins: [], outs: [] } : null);
      while (grid[c].filter(Boolean).length < 2) { var k = Math.floor(ctx.rnd() * LANES); grid[c][k] = grid[c][k] || { c: c, l: k, ins: [], outs: [] }; }
    }
    function link(a, b) { if (a.outs.indexOf(b) < 0) { a.outs.push(b); b.ins.push(a); } }
    for (c = 0; c + 1 < COLS; c++) {
      var here = grid[c].filter(Boolean), next = grid[c + 1].filter(Boolean);
      here.forEach(function (a) {
        var near = next.slice().sort(function (p, q) { return Math.abs(p.l - a.l) - Math.abs(q.l - a.l) + (ctx.rnd() - 0.5) * 0.5; });
        link(a, near[0]);
        if (near[1] && Math.abs(near[1].l - a.l) <= 1 && ctx.rnd() < 0.45) link(a, near[1]);
      });
      next.forEach(function (b) {
        if (b.ins.length) return;
        var from = here.slice().sort(function (p, q) { return Math.abs(p.l - b.l) - Math.abs(q.l - b.l); })[0];
        link(from, b);
      });
    }
    var start = grid[0].filter(Boolean), cur = start[Math.floor(ctx.rnd() * start.length)], lit = [cur], litEdge = {};
    while (cur.outs.length) { var nx = cur.outs[Math.floor(ctx.rnd() * cur.outs.length)]; litEdge[cur.c + ':' + cur.l + '>' + nx.l] = 1; cur = nx; lit.push(cur); }
    grid.forEach(function (col) {
      col.forEach(function (a) {
        if (!a) return;
        a.outs.forEach(function (b) {
          var pts = [], x0 = X(a.c), y0 = Yl(a.l), x1 = X(b.c), y1 = Yl(b.l), on = litEdge[a.c + ':' + a.l + '>' + b.l];
          for (var s = 0; s <= 18; s++) { var t = s / 18, e = t * t * (3 - 2 * t); pts.push(P(x0 + 11 + (x1 - x0 - 22) * t, y0 + (y1 - y0) * e)); }
          clipLine(m, ctx, pts, on ? cc : ca, on ? 0.75 : 0.3, false, 3);
        });
      });
    });
    grid.forEach(function (col) {
      col.forEach(function (a) {
        if (!a) return;
        var p = P(X(a.c), Yl(a.l)), on = lit.indexOf(a) >= 0, merge = a.ins.length > 1;
        if (!ok(ctx, p, 12)) return;
        var hex = loop(p, EX, EY, merge ? 10 : 7.5, 6, Math.PI / 6);
        m.line(flat(hex), on ? cc : ca, on ? 0.9 : 0.6, true);
        if (merge) m.line(flat(loop(p, EX, EY, 14.5, 6, Math.PI / 6)), on ? cc : cb, 0.35, true);
        if (on) node(m, p, cc, 3.8, 7, 0.42); else m.point(p[0], p[1], p[2], 2.6, ca, 0.85);
      });
    });
  });

  /* ================= 03-aura: a structure around the mark ================= */

  // a wire globe behind the mark: a close net of latitude and longitude lines, bright on the half that
  // faces the viewer and faint behind, and on its face a key fingerprint: a five by five patch of lit
  // glass squares, mirrored like a seal, in a bracketed frame
  A.register('s19-key-globe', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), R = ctx.num('radius', 380), z0 = -R - 15;
    var O = atSeen(30, 0, z0), tilt = 0.32 + ctx.rnd() * 0.16, spin = ctx.rnd() * TAU, i, k;
    function W(p) { return rotX(rotY(p, spin), tilt); }
    function draw(pts) {                             // one graticule line, cut into its near and far runs
      var run = [], near = null;
      pts.forEach(function (p, j) {
        var n = W(p), P = add(O, mul(n, R)), f = facing(P, n);
        if (near !== null && f !== near) { clipLine(m, ctx, run, ca, near ? 0.3 : 0.06, false, 4); run = run.slice(-1); }
        near = f; run.push(P);
      });
      clipLine(m, ctx, run, ca, near ? 0.3 : 0.06, false, 4);
    }
    var st = 15 * Math.PI / 180, d3 = 3 * Math.PI / 180;
    for (k = 0; k < 12; k++) { var pm = []; for (i = 0; i <= 120; i++) pm.push(latLon(i * d3 - Math.PI, k * st)); draw(pm); }
    for (k = -5; k <= 5; k++) { var pl = []; for (i = 0; i <= 120; i++) pl.push(latLon(k * st, i * d3)); draw(pl); }
    for (k = -5; k <= 5; k++) for (i = 0; i < 24; i++) {
      var n0 = W(latLon(k * st, i * st)), Q = add(O, mul(n0, R));
      if (facing(Q, n0) && ok(ctx, Q, 4)) m.point(Q[0], Q[1], Q[2], 2.2, ca, 0.55);
    }
    clipLine(m, ctx, outline(O, R, 400), cb, 0.5, true, 4);
    // the fingerprint, on the face where it is seen beside the mark
    var spots = [[246, 104], [242, -120]], want = spots[Math.floor(ctx.rnd() * spots.length)], best = null;
    for (var la = -80; la <= 80; la += 2) for (var lo = 0; lo < 360; lo += 2) {
      var nn = W(latLon(la * Math.PI / 180, lo * Math.PI / 180)), PP = add(O, mul(nn, R));
      if (!facing(PP, nn)) continue;
      var s = A.seen(PP[0], PP[1], PP[2]), dd = Math.hypot(s[0] - want[0], s[1] - want[1]);
      if (!best || dd < best.d) best = { d: dd, n: nn, P: PP };
    }
    if (!best) return;
    var n = best.n, e1 = unit(cross(EY, n)), e2 = cross(n, e1), rot = rotOf(e1, e2, n), cell = 13, on = [];
    for (var r = 0; r < 5; r++) for (var c = 0; c < 3; c++) { var lit = ctx.rnd() < 0.56; on[r * 5 + c] = on[r * 5 + 4 - c] = lit; }
    on[12] = true;
    function cellAt(r2, c2, lift) { return add(best.P, add(add(mul(e1, (c2 - 2) * cell), mul(e2, (2 - r2) * cell)), mul(n, lift))); }
    for (r = 0; r < 5; r++) for (c = 0; c < 5; c++) {
      var q = cellAt(r, c, 3);
      if (on[r * 5 + c]) { m.glass(q[0], q[1], q[2], cell - 3, cell - 3, 3, ctx.tone('c', 0.95), 1, rot); m.point(q[0], q[1], q[2], 3, cc, 1); }
      else m.point(q[0], q[1], q[2], 1.6, ca, 0.45);
    }
    var h = cell * 3.1;
    m.line(flat([[-h, -h], [h, -h], [h, h], [-h, h]].map(function (v) { return add(best.P, add(mul(e1, v[0]), mul(e2, v[1]))); })), cc, 0.5, true);
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (s2) {
      var H = h + 9, a = add(best.P, add(mul(e1, s2[0] * H), mul(e2, s2[1] * (H - 12)))), b = add(best.P, add(mul(e1, s2[0] * H), mul(e2, s2[1] * H))), c3 = add(best.P, add(mul(e1, s2[0] * (H - 12)), mul(e2, s2[1] * H)));
      m.line([a[0], a[1], a[2], b[0], b[1], b[2], c3[0], c3[1], c3[2]], cc, 0.9);
    });
    m.point(best.P[0], best.P[1], best.P[2], 190, cc, 0.22, true);
  });

  // a globe of faint rings behind the mark with arcs of light jumping between points all over its
  // face, each arc lifted off the surface and lit near its head, each landing marked by a small ring.
  // The globe sits far enough back that even a lifted arc stays behind the mark.
  A.register('s19-arc-globe', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), R = ctx.num('radius', 420), z0 = -R * 1.2 - 20;
    var O = atSeen(40, 0, z0), tilt = 0.4 + ctx.rnd() * 0.2, spin = ctx.rnd() * TAU, i, k;
    function W(p) { return rotX(rotY(p, spin), tilt); }
    function onFace(n) { var P = add(O, mul(n, R)); return facing(P, n) ? P : null; }
    clipLine(m, ctx, outline(O, R, 400), cb, 0.55, true, 4);
    clipLine(m, ctx, outline(O, R * 1.015, 400), cb, 0.16, true, 4);
    [-60, -30, 0, 30, 60].forEach(function (d) {
      var pts = [];
      for (i = 0; i <= 200; i++) pts.push(onFace(W(latLon(d * Math.PI / 180, i / 200 * TAU))));
      clipLine(m, ctx, pts, ca, d ? 0.1 : 0.2, false, 4);
    });
    for (k = 0; k < 6; k++) {
      var pm = [];
      for (i = 0; i <= 200; i++) pm.push(onFace(W(latLon(i / 200 * TAU, k * Math.PI / 6))));
      clipLine(m, ctx, pm, ca, 0.07, false, 4);
    }
    for (i = 0; i < 700; i++) {                      // a faint dust over the face, thickest at the edge
      var nn = unit([gauss(ctx), gauss(ctx), gauss(ctx)]), Q = onFace(nn);
      if (!Q || !ok(ctx, Q, 4)) continue;
      var g = 1 - clamp(dot(nn, unit(sub(CAM, Q))), 0, 1);
      m.point(Q[0], Q[1], Q[2], 1.4, ca, 0.07 + 0.32 * g * g);
    }
    // landings anywhere on the face, kept apart
    var ends = [];
    for (k = 0; k < 900 && ends.length < 22; k++) {
      var v = unit([gauss(ctx), gauss(ctx), gauss(ctx)]), E = add(O, mul(v, R));
      if (dot(v, unit(sub(CAM, E))) < 0.18 || !ok(ctx, E, 14)) continue;
      if (ends.some(function (q) { return len(sub(q.E, E)) < 80; })) continue;
      ends.push({ v: v, E: E, used: 0 });
    }
    var arcs = 0;
    for (k = 0; k < ends.length && arcs < 13; k++) {
      var a = ends[k];
      if (a.used > 1) continue;
      var cand = ends.filter(function (b) { var ang = Math.acos(clamp(dot(a.v, b.v), -1, 1)); return b !== a && b.used < 2 && ang > 0.4 && ang < 1.3; });
      if (!cand.length) continue;
      var b = cand[Math.floor(ctx.rnd() * cand.length)], ang = Math.acos(clamp(dot(a.v, b.v), -1, 1)), lift = 0.05 + ang * 0.1, pts = [];
      a.used++; b.used++;
      for (i = 0; i <= 56; i++) {
        var f = i / 56, w1 = Math.sin((1 - f) * ang) / Math.sin(ang), w2 = Math.sin(f * ang) / Math.sin(ang);
        var P = add(O, mul(add(mul(a.v, w1), mul(b.v, w2)), R * (1 + lift * Math.sin(Math.PI * f))));
        pts.push(P[2] < -8 && !behind(P, O, R * 0.995) ? P : null);
      }
      var col = arcs % 3 === 2 ? cb : cc, head = 34 + Math.floor(ctx.rnd() * 16);
      clipLine(m, ctx, pts, col, 0.45, false, 4);
      clipLine(m, ctx, pts.slice(head - 10, head + 1), col, 0.95, false, 4);
      var H = pts[head];
      if (H && ok(ctx, H, 6)) node(m, H, col, 3.6, 6, 0.45);
      arcs++;
    }
    ends.forEach(function (e) {
      if (!e.used) return;
      var n = unit(sub(e.E, O)), e1 = unit(cross(EY, n)), e2 = cross(n, e1);
      m.line(flat(loop(e.E, e1, e2, 7, 20)), cc, 0.7, true);
      m.line(flat(loop(e.E, e1, e2, 13, 24)), cc, 0.25, true);
      m.point(e.E[0], e.E[1], e.E[2], 3, ca, 0.95);
    });
  });

  // a dotted globe sitting in a flat disc of rings, like a planet in its rings, with pins standing
  // up from the disc: a thin stem, a glass cube or a point of light on top, a small ring at the foot
  A.register('s19-pin-disc', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), land = makeLand(ctx), R = 168, z0 = -290;
    var O = atSeen(40, -20, z0), tilt = 0.3 + ctx.rnd() * 0.08, roll = (ctx.rnd() - 0.5) * 0.18, spin = ctx.rnd() * TAU, i;
    var step = 3.2 * Math.PI / 180;
    for (var lat = -Math.PI / 2 + step / 2; lat < Math.PI / 2; lat += step) {
      var n = Math.max(1, Math.round(TAU * Math.cos(lat) / step));
      for (i = 0; i < n; i++) {
        var p = latLon(lat, i / n * TAU), q = rotX(rotY(p, spin), 0.35), P = add(O, mul(q, R));
        if (!facing(P, q) || !ok(ctx, P, 4)) continue;
        var g = clamp(dot(q, unit(sub(CAM, P))) * 3, 0, 1);
        if (land(p) > 0) m.point(P[0], P[1], P[2], 2.2, lerp(cb, ca, g), 0.3 + 0.55 * g);
        else if (i % 3 === 0) m.point(P[0], P[1], P[2], 1.4, cb, 0.12);
      }
    }
    clipLine(m, ctx, outline(O, R, 240), cb, 0.55, true, 4);
    function disc(r, t) { var v = rotZ(rotX([r * Math.cos(t), 0, r * Math.sin(t)], tilt), roll); return add(O, v); }
    [212, 228, 252, 290, 304, 342].forEach(function (r, k) {
      var pts = [];
      for (i = 0; i < 260; i++) { var Q = disc(r, i / 260 * TAU); pts.push(behind(Q, O, R) ? null : Q); }
      clipLine(m, ctx, pts, k % 3 === 2 ? cc : cb, k === 2 || k === 5 ? 0.5 : 0.24, true, 4);
    });
    for (i = 0; i < 36; i++) {                       // radial ticks across the inner band
      var t0 = i / 36 * TAU, a = disc(228, t0), b = disc(252, t0);
      if (!behind(a, O, R) && ok(ctx, a, 4) && ok(ctx, b, 4)) m.line([a[0], a[1], a[2], b[0], b[1], b[2]], cb, 0.3);
    }
    var pins = 0;
    for (var tries = 0; tries < 300 && pins < 16; tries++) {
      var r0 = 262 + ctx.rnd() * 76, t1 = ctx.rnd() * TAU, B = disc(r0, t1), h = 34 + ctx.rnd() * 110, top = [B[0], B[1] + h, B[2]];
      var sb = A.seen(B[0], B[1], B[2]);
      if (behind(B, O, R) || !ok(ctx, B, 10) || !ok(ctx, top, 12)) continue;
      if (B[2] > -10 && Math.abs(sb[0]) < 210 && Math.abs(sb[1]) < 280) continue;   // never stand in front of the mark
      pins++;
      m.rod(B[0], B[1], B[2], [0, 1, 0], h, 1.3, cb, 0.5);
      m.line(ctx.ring(6, 18, tilt, roll, B[0], B[1], B[2]), cb, 0.6, true);
      if (pins % 3 === 0) node(m, top, cc, 4, 7, 0.45);
      else { var s = 7 + ctx.rnd() * 4; m.glass(top[0], top[1] + s / 2, top[2], s, s, s, ctx.tone('a', 0.95), 0.9, [0.62, 0.78, 0]); }
    }
  });

  // a network star: one bright node behind the mark's centre with long dotted spokes out to outer
  // hubs, and each outer hub a small star of its own: a glass cube with short spokes to leaf nodes.
  // A glass cube sits halfway along some spokes. The spokes are the glow colour, so the star is
  // amber on an amber or copper card.
  A.register('s19-star-net', function (m, ctx) {
    var ca = ctx.light('a'), cc = ctx.light('c'), hub = atSeen(40, (ctx.rnd() - 0.5) * 40, -140), n = 7 + Math.floor(ctx.rnd() * 3), a0 = ctx.rnd() * TAU;
    for (var i = 0; i < n; i++) {
      var a = a0 + i / n * TAU + (ctx.rnd() - 0.5) * 0.35, dir = unit([Math.cos(a), Math.sin(a) * 1.1, -0.12 - ctx.rnd() * 0.4]);
      var L = 215 + ctx.rnd() * 110, tip = add(hub, mul(dir, L));
      while (L > 110 && !ok(ctx, tip, 34)) { L *= 0.94; tip = add(hub, mul(dir, L)); }
      if (L <= 110) continue;
      clipSeg(m, ctx, hub, tip, cc, 0.55, 2);
      for (var d = 24; d < L - 16; d += 12) { var q = add(hub, mul(dir, d)); if (ok(ctx, q, 2)) m.point(q[0], q[1], q[2], 1.7, cc, 0.55); }
      if (ctx.rnd() < 0.5) {
        var c = add(hub, mul(dir, L * (0.46 + ctx.rnd() * 0.12))), s = 11 + ctx.rnd() * 4;
        if (ok(ctx, c, s)) { m.glass(c[0], c[1], c[2], s, s, s, ctx.tone('a', 0.95), 0.9, [0.62, 0.78 + a, 0]); m.point(c[0], c[1], c[2], s * 2.6, cc, 0.25, true); }
      }
      // the outer hub and its own small star
      m.glass(tip[0], tip[1], tip[2], 15, 15, 15, ctx.tone('a', 0.95), 0.95, [0.62, 0.78 + a, 0]);
      m.cube(tip[0], tip[1], tip[2], 6, 6, 6, ctx.tone('c', 0.95), [0.62, 0.78 + a, 0]);
      m.point(tip[0], tip[1], tip[2], 60, cc, 0.32, true);
      var leaves = 4 + Math.floor(ctx.rnd() * 3), fan = 1.5 + ctx.rnd() * 0.8;
      for (var k = 0; k < leaves; k++) {
        var td = rotZ(dir, (k / (leaves - 1) - 0.5) * fan * 2 + (ctx.rnd() - 0.5) * 0.25);
        var leaf = add(tip, mul(unit([td[0], td[1], td[2] * 0.3 + (ctx.rnd() - 0.5) * 0.4]), 34 + ctx.rnd() * 36));
        if (!ok(ctx, leaf, 8)) continue;
        m.line([tip[0], tip[1], tip[2], leaf[0], leaf[1], leaf[2]], ca, 0.42);
        m.line(flat(loop(leaf, EX, EY, 4.2, 12)), cc, 0.75, true);
        m.point(leaf[0], leaf[1], leaf[2], 2.2, ca, 0.95);
      }
    }
    m.glass(hub[0], hub[1], hub[2], 28, 28, 28, ctx.tone('a', 0.95), 0.95, [0.62, 0.78, 0]);
    m.cube(hub[0], hub[1], hub[2], 11, 11, 11, ctx.tone('c', 0.95), [0.62, 0.78, 0]);
    m.point(hub[0], hub[1], hub[2], 13, [1, 1, 1], 1);
    m.point(hub[0], hub[1], hub[2], 200, cc, 0.42, true);
  });

  // a burst of thin spokes in every direction from one core far behind the mark, a small glass cube
  // on the tip of each, a few tips lit: a dandelion of nodes
  A.register('s19-node-burst', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), C = atSeen(40, 0, -290), N = 70, ga = Math.PI * (3 - Math.sqrt(5)), turn = ctx.rnd() * TAU;
    for (var i = 0; i < N; i++) {
      var y = 1 - (i + 0.5) / N * 2, rr = Math.sqrt(1 - y * y), t = ga * i + turn, dir = rotX([Math.cos(t) * rr, y, Math.sin(t) * rr], 0.3);
      if (dir[2] > 0.5) continue;
      var L = 130 + 210 * Math.pow(ctx.rnd(), 0.6), tip = add(C, mul(dir, L));
      while (L > 60 && (tip[2] > -12 || !ok(ctx, tip, 12))) { L *= 0.92; tip = add(C, mul(dir, L)); }
      if (L <= 60) continue;
      var far = clamp((tip[2] + 520) / 500, 0, 1);
      clipSeg(m, ctx, C, tip, ca, 0.12 + 0.24 * far, 2);
      if (ctx.rnd() < 0.3) { var bd = add(C, mul(dir, L * (0.5 + ctx.rnd() * 0.2))); if (ok(ctx, bd, 4)) m.point(bd[0], bd[1], bd[2], 2.2, cb, 0.8); }
      var s = 6 + ctx.rnd() * 8;
      m.glass(tip[0], tip[1], tip[2], s, s, s, ctx.tone('a', 0.95), 0.6 + 0.3 * far, [ctx.rnd() * 3, ctx.rnd() * 3, 0]);
      if (ctx.rnd() < 0.14) node(m, tip, cc, 3.6, 8, 0.45);
    }
    m.glass(C[0], C[1], C[2], 34, 34, 34, ctx.tone('a', 0.95), 0.9, [0.62, 0.78, 0]);
    m.glass(C[0], C[1], C[2], 16, 16, 16, ctx.tone('c', 0.95), 1, [0.2, 0.5, 0.3]);
    m.point(C[0], C[1], C[2], 150, cc, 0.4, true);
  });

  // nested polygons of nodes behind the mark: a triangle inside a square inside a pentagon, out to an
  // octagon, each turned its own way and each a step further back, so the nest is a shallow bowl.
  // Every corner is tied to the nearest corner of the next polygon out.
  A.register('s19-polygon-nest', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), C = atSeen(40, 0, -110), ax = -0.22 - ctx.rnd() * 0.1, ay = 0.2 + ctx.rnd() * 0.1;
    var rings = [], k, i;
    for (k = 0; k < 6; k++) {
      var sides = 3 + k, r = 88 + 50 * k, turn = ctx.rnd() * TAU, pts = [];
      for (i = 0; i < sides; i++) { var t = turn + i / sides * TAU; pts.push(add(C, rotY(rotX([r * Math.cos(t), r * Math.sin(t) * 1.08, -30 * k], ax), ay))); }
      rings.push(pts);
    }
    rings.forEach(function (pts, k2) {
      for (i = 0; i < pts.length; i++) clipSeg(m, ctx, pts[i], pts[(i + 1) % pts.length], ca, 0.42, 3);
      if (k2 + 1 < rings.length) pts.forEach(function (a) {
        var near = rings[k2 + 1].map(function (b) { return [b, len(sub(a, b))]; }).sort(function (x, y) { return x[1] - y[1]; });
        clipSeg(m, ctx, a, near[0][0], cb, 0.34, 3);
        if (ctx.rnd() < 0.4) clipSeg(m, ctx, a, near[1][0], cb, 0.18, 3);
      });
    });
    rings.forEach(function (pts, k2) {
      var hot = Math.floor(ctx.rnd() * pts.length);
      pts.forEach(function (p, j) {
        if (!ok(ctx, p, 10)) return;
        if (j === hot && k2 >= 1) { node(m, p, cc, 4.6, 8, 0.45); if (k2 >= 3) m.glass(p[0], p[1], p[2], 14, 14, 14, ctx.tone('c', 0.95), 1, [0.62, 0.78, 0]); }
        else if (k2 >= 3) { var s = 8 + k2; m.glass(p[0], p[1], p[2], s, s, s, ctx.tone('a', 0.95), 0.85, [0.62, 0.78 + j, 0]); m.point(p[0], p[1], p[2], 2.4, ca, 0.9); }
        else node(m, p, ca, 3.6, 4.5, 0.3);
      });
    });
    node(m, C, cc, 6, 16, 0.4);
  });

  // a dotted world of land and sea: rows of latitude over the half that faces the viewer, land in
  // bright dots and a few faint sea dots, a thin rim; returns nothing, draws into m
  function dotWorld(m, ctx, O, R, stepDeg, tilt, spin, land, ca, cb, cc) {
    var step = stepDeg * Math.PI / 180, sea = 0;
    for (var lat = -Math.PI / 2 + step / 2; lat < Math.PI / 2; lat += step) {
      var n = Math.max(1, Math.round(TAU * Math.cos(lat) / step));
      for (var i = 0; i < n; i++) {
        var p = latLon(lat, i / n * TAU), q = rotX(rotY(p, spin), tilt), P = add(O, mul(q, R));
        if (!facing(P, q) || !ok(ctx, P, 3)) continue;
        var g = clamp(dot(q, unit(sub(CAM, P))) * 3, 0, 1);
        if (land(p) > 0) m.point(P[0], P[1], P[2], 2.3, lerp(cb, ca, g), 0.45 + 0.5 * g);
        else if (sea++ % 4 === 0) m.point(P[0], P[1], P[2], 1.3, cb, 0.1);
      }
    }
    clipLine(m, ctx, outline(O, R, Math.max(60, Math.round(R * 1.4))), cb, 0.6, true, 3);
    m.point(O[0], O[1], O[2], R * 2.9, cc, 0.1, true);
  }

  // linked worlds: a large dotted world far behind the mark and two small ones beside it at the
  // right, each with its own land, joined by arcs of light that bow outward, a bright head on each
  A.register('s19-linked-worlds', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c');
    var big = { O: atSeen(10, 10, -330), R: 175 }, up = ctx.rnd() < 0.5;
    var a = { O: atSeen(258, up ? 150 : 120, -70), R: 44 + ctx.rnd() * 8 }, b = { O: atSeen(250, up ? -160 : -190, -110), R: 34 + ctx.rnd() * 8 };
    dotWorld(m, ctx, big.O, big.R, 2.3, 0.35, ctx.rnd() * TAU, makeLand(ctx), ca, cb, cc);
    dotWorld(m, ctx, a.O, a.R, 7, 0.4, ctx.rnd() * TAU, makeLand(ctx), ca, cb, cc);
    dotWorld(m, ctx, b.O, b.R, 8, 0.3, ctx.rnd() * TAU, makeLand(ctx), ca, cb, cc);
    // a thin ring round each small world
    [a, b].forEach(function (w, k) { clipLine(m, ctx, flat3(ctx.ring(w.R * 1.45, 80, 0.32, k ? 0.3 : -0.25, w.O[0], w.O[1], w.O[2])), cb, 0.4, true, 2); });
    function arc(p, q, bow, col) {
      var mid = lerp(p.O, q.O, 0.5), d = unit(sub(q.O, p.O)), out = unit(cross(d, EZ)), pts = [];
      if (out[0] < 0) out = mul(out, -1);
      var A0 = add(p.O, mul(d, p.R)), B0 = sub(q.O, mul(d, q.R)), ctl = add(mid, add(mul(out, bow), [0, 0, 40]));
      for (var s = 0; s <= 40; s++) { var u = s / 40, w = 1 - u; pts.push(add(add(mul(A0, w * w), mul(ctl, 2 * w * u)), mul(B0, u * u))); }
      pts = pts.map(function (P) { return P[2] < -8 && !behind(P, big.O, big.R) ? P : null; });
      clipLine(m, ctx, pts, col, 0.5, false, 3);
      var h = 24 + Math.floor(ctx.rnd() * 10);
      clipLine(m, ctx, pts.slice(h - 7, h + 1), col, 0.95, false, 3);
      if (pts[h] && ok(ctx, pts[h], 6)) node(m, pts[h], col, 3.6, 7, 0.45);
      [A0, B0].forEach(function (E) { if (ok(ctx, E, 4)) node(m, E, ca, 2.8, 5, 0.35); });
    }
    arc(big, a, 70 + ctx.rnd() * 40, cc);
    arc(big, b, 60 + ctx.rnd() * 40, cb);
    arc(a, b, 60 + ctx.rnd() * 30, cc);
  });
  function flat3(p) { var o = []; for (var i = 0; i + 2 < p.length; i += 3) o.push([p[i], p[i + 1], p[i + 2]]); return o; }

  // a geodesic dome far behind the lower half of the mark: half of a twice-split icosahedron standing
  // on a ring, its edges thin lines, small glass cubes round its foot and a few nodes lit
  A.register('s19-geo-dome', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), R = ctx.num('radius', 330), z0 = -R - 40;
    var O = atSeen(40, ctx.num('base', -215), z0), t0 = (1 + Math.sqrt(5)) / 2, spin = ctx.rnd() * TAU;
    var V = [[-1, t0, 0], [1, t0, 0], [-1, -t0, 0], [1, -t0, 0], [0, -1, t0], [0, 1, t0], [0, -1, -t0], [0, 1, -t0], [t0, 0, -1], [t0, 0, 1], [-t0, 0, -1], [-t0, 0, 1]].map(unit);
    var F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    // stand the icosahedron on an edge's middle so the cut at the equator falls along vertices
    var tip = Math.atan2(1, t0);
    V = V.map(function (v) { return rotY(rotZ(v, tip), spin); });
    for (var sub2i = 0; sub2i < 2; sub2i++) {
      var cache = {}, nf = [];
      var midOf = function (i0, j0) {
        var key = i0 < j0 ? i0 + '_' + j0 : j0 + '_' + i0;
        if (cache[key] == null) { V.push(unit(lerp(V[i0], V[j0], 0.5))); cache[key] = V.length - 1; }
        return cache[key];
      };
      F.forEach(function (f) { var x = midOf(f[0], f[1]), y = midOf(f[1], f[2]), w = midOf(f[2], f[0]); nf.push([f[0], x, w], [f[1], y, x], [f[2], w, y], [x, y, w]); });
      F = nf;
    }
    var P = V.map(function (v) { return add(O, mul(v, R)); }), done = {}, keep = V.map(function (v) { return v[1] > -0.02; });
    F.forEach(function (f) {
      [[f[0], f[1]], [f[1], f[2]], [f[2], f[0]]].forEach(function (e) {
        var key = Math.min(e[0], e[1]) + '_' + Math.max(e[0], e[1]);
        if (done[key] || !keep[e[0]] || !keep[e[1]]) return;
        done[key] = 1;
        var a = P[e[0]], b = P[e[1]], mid = lerp(a, b, 0.5), front = facing(mid, unit(sub(mid, O)));
        clipSeg(m, ctx, a, b, ca, front ? 0.32 : 0.09, 3);
      });
    });
    var foot = [];
    P.forEach(function (p, i) {
      if (!keep[i] || !ok(ctx, p, 4)) return;
      var front = facing(p, V[i]);
      if (V[i][1] < 0.08) foot.push(p);
      m.point(p[0], p[1], p[2], front ? 2.6 : 1.6, ca, front ? 0.85 : 0.3);
    });
    clipLine(m, ctx, flat3(ctx.ring(R * 1.08, 220, 0, 0, O[0], O[1], O[2])), cb, 0.45, true, 3);
    clipLine(m, ctx, flat3(ctx.ring(R * 1.16, 220, 0, 0, O[0], O[1], O[2])), cb, 0.18, true, 3);
    foot.forEach(function (p) { if (facing(p, unit(sub(p, O)))) m.glass(p[0], p[1] + 6, p[2], 10, 10, 10, ctx.tone('a', 0.95), 0.85, [0.62, 0.78, 0]); });
    for (var h = 0, tries = 0; h < 6 && tries < 80; tries++) {
      var j = Math.floor(ctx.rnd() * V.length);
      if (!keep[j] || V[j][1] < 0.2 || !facing(P[j], V[j]) || !ok(ctx, P[j], 10)) continue;
      node(m, P[j], cc, 4.4, 7, 0.45); h++;
    }
  });

  /* ================= 05-signal: light ================= */

  // circuit traces behind the mark: buses of two to five parallel traces leave the middle in straight
  // runs with 45-degree bends and end in small rings, staggered; a few traces carry a streak of light
  A.register('s19-circuit', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), z = -80, nb = 9 + Math.floor(ctx.rnd() * 3), a0 = ctx.rnd() * TAU, gap = 8;
    function P(s) { return atSeen(s[0], s[1], z); }
    function inside(s, pad) { return s[0] > -232 + pad && s[0] < 312 - pad && s[1] > -332 + pad && s[1] < 332 - pad && A.clear(s[0], s[1], pad + 6); }
    function dirOf(k) { var a = k * Math.PI / 4; return [Math.round(Math.cos(a) * 1e6) / 1e6, Math.round(Math.sin(a) * 1e6) / 1e6]; }
    for (var b = 0; b < nb; b++) {
      var ang = a0 + b / nb * TAU + (ctx.rnd() - 0.5) * 0.3, k0 = Math.round(ang / (Math.PI / 4)), r0 = 60 + ctx.rnd() * 70;
      var path = [[40 + r0 * Math.cos(ang), r0 * Math.sin(ang)]], kd = k0, traces = 2 + Math.floor(ctx.rnd() * 4), pad = gap * traces / 2 + 4;
      var turns = [0, ctx.rnd() < 0.5 ? 1 : -1, 0], legs = 3;
      turns[2] = ctx.rnd() < 0.6 ? -turns[1] : turns[1];
      for (var g = 0; g < legs; g++) {
        kd += turns[g];
        var d = dirOf(kd), L = g === 0 ? 70 + ctx.rnd() * 90 : 50 + ctx.rnd() * 140, last = path[path.length - 1], step = 0;
        while (step < L && inside([last[0] + d[0] * (step + 4), last[1] + d[1] * (step + 4)], pad)) step += 4;
        if (step < 16) break;
        path.push([last[0] + d[0] * step, last[1] + d[1] * step]);
        if (step < L) break;
      }
      if (path.length < 2) continue;
      for (var t = 0; t < traces; t++) {
        var o = (t - (traces - 1) / 2) * gap, pts = [];
        for (var j = 0; j < path.length; j++) {
          var u = j > 0 ? norm2(sub2(path[j], path[j - 1])) : null, v = j + 1 < path.length ? norm2(sub2(path[j + 1], path[j])) : null;
          var nu = u ? [-u[1], u[0]] : null, nv = v ? [-v[1], v[0]] : null, mm;
          if (nu && nv) { var dd = 1 + nu[0] * nv[0] + nu[1] * nv[1]; mm = [(nu[0] + nv[0]) / dd, (nu[1] + nv[1]) / dd]; } else mm = nu || nv;
          pts.push([path[j][0] + mm[0] * o, path[j][1] + mm[1] * o]);
        }
        var e = pts.length - 1, ld = norm2(sub2(pts[e], pts[e - 1])), cut = Math.max(0, Math.min(len2(sub2(pts[e], pts[e - 1])) - 6, t * 9));
        pts[e] = [pts[e][0] - ld[0] * cut, pts[e][1] - ld[1] * cut];
        var art = [];
        for (j = 0; j + 1 < pts.length; j++) {
          var n = Math.max(1, Math.ceil(len2(sub2(pts[j + 1], pts[j])) / 8));
          for (var s = 0; s < n; s++) art.push(P([pts[j][0] + (pts[j + 1][0] - pts[j][0]) * s / n, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * s / n]));
        }
        art.push(P(pts[e]));
        clipLine(m, ctx, art, t % 3 === 1 ? ca : cb, 0.42, false, 2);
        var end = P(pts[e]);
        if (ok(ctx, end, 6)) {
          m.line(flat(loop(end, EX, EY, 3.6, 12)), ca, 0.85, true);
          m.point(end[0], end[1], end[2], 1.8, ca, 1);
        }
        if (ctx.rnd() < 0.3) {                          // a streak of light along the longest leg
          var bi = 0, bl = 0;
          for (j = 0; j + 1 < pts.length; j++) { var lj = len2(sub2(pts[j + 1], pts[j])); if (lj > bl) { bl = lj; bi = j; } }
          if (bl > 40) {
            var f0 = ctx.rnd() * 0.4, a1 = P(lerp2(pts[bi], pts[bi + 1], f0)), a2 = P(lerp2(pts[bi], pts[bi + 1], f0 + 0.5));
            if (ok(ctx, a1, 4) && ok(ctx, a2, 4)) {
              m.quad(a1[0], a1[1], a1[2], Math.atan2(-(a2[0] - a1[0]), a2[1] - a1[1]), 2.2, Math.hypot(a2[0] - a1[0], a2[1] - a1[1]), cc, 0.8, 'peak');
              node(m, a2, cc, 2.6, 6, 0.4);
            }
          }
        }
      }
    }
  });
  function sub2(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
  function len2(a) { return Math.hypot(a[0], a[1]); }
  function norm2(a) { var k = len2(a) || 1; return [a[0] / k, a[1] / k]; }
  function lerp2(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }

  // braided fibres: three bundles of thin lines that flow across behind the mark, each bundle twisting
  // round its own path and pinching tight at a few knots, where a node of light sits
  A.register('s19-fibre-braid', function (m, ctx) {
    var cols = [ctx.light('b'), ctx.light('a'), ctx.light('c')], cc = ctx.light('c'), nBundle = 3;
    for (var b = 0; b < nBundle; b++) {
      var y0 = (b - 1) * 150 + (ctx.rnd() - 0.5) * 60, amp = 70 + ctx.rnd() * 90, ph = ctx.rnd() * TAU, K = [];
      for (var k = 0; k < 6; k++) { var xs = -300 + k * 150; K.push(atSeen(xs, y0 + amp * Math.sin(k * 1.3 + ph), -70 - b * 55 - 40 * Math.sin(k + ph))); }
      var fib = 7, r0 = 15 + ctx.rnd() * 8, twist = 3 + ctx.rnd() * 2.5, knots = 3 + Math.floor(ctx.rnd() * 2), N = 260, axis = [];
      for (var i = 0; i <= N; i++) axis.push(spline(K, i / N));
      for (var f = 0; f < fib; f++) {
        var pts = [], phi = f / fib * TAU;
        for (i = 0; i <= N; i++) {
          var u = i / N, T = unit(sub(axis[Math.min(N, i + 1)], axis[Math.max(0, i - 1)])), Nn = unit(cross(T, EZ)), B = cross(T, Nn);
          var r = r0 * (0.12 + 0.88 * Math.abs(Math.sin(Math.PI * u * knots))), a = phi + u * twist * TAU;
          pts.push(add(axis[i], add(mul(Nn, r * Math.cos(a)), mul(B, r * Math.sin(a)))));
        }
        clipLine(m, ctx, pts, cols[b], 0.22 + 0.2 * Math.abs(Math.cos(phi)), false, 2);
        for (var d = 0; d < 7; d++) { var q = pts[Math.floor(ctx.rnd() * N)]; if (ok(ctx, q, 4)) m.point(q[0], q[1], q[2], 2.2, cols[b], 0.85); }
      }
      for (k = 1; k < knots; k++) {
        var c = axis[Math.round(k / knots * N)];
        if (!ok(ctx, c, 12)) continue;
        node(m, c, cc, 4, 8, 0.45);
        m.glass(c[0], c[1], c[2], 9, 9, 9, ctx.tone('a', 0.95), 0.9, [0.62, 0.78, 0]);
      }
    }
  });

  // route arcs: tall arcs of light rising from points on a floor below the mark and landing on others,
  // a bright head on each arc, flat rings where they leave and land
  A.register('s19-route-arcs', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), yf = -335, ends = [];
    for (var t = 0; t < 400 && ends.length < 12; t++) {
      var zf = -440 + ctx.rnd() * 390, p = [atSeen(-205 + ctx.rnd() * 510, -300, zf)[0], yf, zf];
      if (!ok(ctx, p, 18)) continue;
      if (ends.some(function (q) { return len(sub(q, p)) < 90; })) continue;
      ends.push(p);
    }
    var arcs = 0, used = {};
    for (var i = 0; i < ends.length && arcs < 8; i++) {
      var a = ends[i], opts = ends.filter(function (q) { var d = len(sub(q, a)); return q !== a && d > 160 && d < 520; });
      if (!opts.length) continue;
      var b = opts[Math.floor(ctx.rnd() * opts.length)], d = len(sub(b, a)), h = Math.min(540, 110 + d * 0.8), pts = [];
      for (var s = 0; s <= 50; s++) { var f = s / 50, q = lerp(a, b, f); pts.push([q[0], q[1] + 4 * h * f * (1 - f), q[2]]); }
      var col = arcs % 3 === 1 ? cb : cc, head = 34 + Math.floor(ctx.rnd() * 12);
      clipLine(m, ctx, pts, col, 0.38, false, 3);
      clipLine(m, ctx, pts.slice(head - 8, head + 1), col, 0.95, false, 3);
      if (ok(ctx, pts[head], 6)) node(m, pts[head], col, 3.8, 7, 0.45);
      [a, b].forEach(function (e) {
        var key = e.join(',');
        if (used[key]) return;
        used[key] = 1;
        m.line(ctx.ring(9, 24, 0, 0, e[0], e[1], e[2]), col, 0.8, true);
        m.line(ctx.ring(18, 32, 0, 0, e[0], e[1], e[2]), col, 0.3, true);
        node(m, e, ca, 3, 5, 0.35);
      });
      arcs++;
    }
  });
})();

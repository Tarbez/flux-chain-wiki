/* DEFXN identity card: builders from reference sheet 1 (fine points, hairlines, small square nodes,
   a few accent squares). Each builder is named in an element file under layers/<NN-key>/sheet-1/.
   Space and the builder API are described at the top of art3d.js. Every random value comes from
   ctx.rnd(), so the same card always draws the same art. White parts use the palette's 'a' slot;
   the sheet's cyan accents use 'c' (and 'b' for the light). */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var Art3D = window.Art3D;

  // rotate a point about x, then y, then z
  function rot(x, y, z, rx, ry, rz) {
    var c = Math.cos(rx || 0), s = Math.sin(rx || 0), y1 = y * c - z * s, z1 = y * s + z * c;
    c = Math.cos(ry || 0); s = Math.sin(ry || 0);
    var x2 = x * c + z1 * s, z2 = -x * s + z1 * c;
    c = Math.cos(rz || 0); s = Math.sin(rz || 0);
    return [x2 * c - y1 * s, x2 * s + y1 * c, z2];
  }
  function gauss(rnd) { return rnd() + rnd() + rnd() - 1.5; }
  // dots along a straight segment from a to b, one every `step` units
  function dots(m, a, b, step, size, rgb, alpha) {
    var d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), n = Math.max(1, Math.round(d / step));
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      m.point(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, size, rgb, alpha);
    }
  }
  function seg(m, a, b, rgb, alpha) { m.line([a[0], a[1], a[2], b[0], b[1], b[2]], rgb, alpha); }
  function plus(m, x, y, z, half, rgb, alpha) {
    m.line([x - half, y, z, x + half, y, z], rgb, alpha);
    m.line([x, y - half, z, x, y + half, z], rgb, alpha);
  }
  // the longest reach from the origin along (dx, dy) that stays inside the art's box
  function reach(dx, dy) {
    var lx = dx < 0 ? 240 / -dx : dx > 0 ? 320 / dx : Infinity, ly = dy ? 340 / Math.abs(dy) : Infinity;
    return Math.min(lx, ly);
  }
  // where a point lands on the card at rest, and whether it lands clear of the card's words:
  // both from art3d.js, which owns the tilt, the camera and the keep-clear zones
  function seen(x, y, z) { return Art3D.seen(x, y, z); }
  function nearWords(x, y, z, pad) { var p = seen(x, y, z); return !Art3D.clear(p[0], p[1], pad); }

  /* ---------------- 01-backdrop: far behind the mark ---------------- */

  // sheet-1 #02: a grainy dotted planet, two tilted dotted orbits, a dotted axis, one accent dot
  // (far elements sit at x = +80: the card's rest tilt and its perspective carry a point 200 units
  // behind about 80 units to the left, so +80 lands on the mark's centre)
  Art3D.register('s1-grain-planet', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), ox = 80, cz = -210, R = 250 + ctx.rnd() * 20;
    var L = [-0.6, 0.55, 0.58], tilt = (ctx.rnd() - 0.5) * 0.3, i;
    for (i = 0; i < 5200; i++) {
      var u = ctx.rnd() * 2 - 1, t = ctx.rnd() * TAU, s = Math.sqrt(1 - u * u), n = [s * Math.cos(t), u, s * Math.sin(t)];
      if (n[2] < -0.05) continue;
      var lit = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
      if (ctx.rnd() > 0.1 + 0.9 * lit) continue;
      m.point(ox + n[0] * R, n[1] * R, cz + n[2] * R, 1.4 + ctx.rnd() * 1.4, ca, 0.22 + 0.7 * lit);
    }
    var accent = null;
    [[300, 0.2, -0.3], [330, 0.27, 0.26]].forEach(function (o, k) {
      var pts = ctx.ring(o[0], 210, o[1], o[2] + tilt, ox, 0, cz);
      for (var j = 0; j < 210; j++) {
        var x = pts[j * 3], y = pts[j * 3 + 1], z = pts[j * 3 + 2];
        if (z < cz && Math.hypot(x - ox, y) < R) continue;      // behind the planet
        m.point(x, y, z, 2.2, cb, z > cz ? 0.85 : 0.4);
        if (k === 0 && !accent && z > cz + 60 && x > ox + 120 && ctx.rnd() < 0.2) accent = [x, y, z];
      }
    });
    var a = rot(0, -(R + 110), 0, 0, 0, tilt), b = rot(0, R + 110, 0, 0, 0, tilt);
    m.line([ox + a[0], a[1], cz, ox + b[0], b[1], cz], ca, 0.4);
    for (i = 0; i <= 12; i++) {
      var f = R + 14 + i * 8, p = rot(0, f, 0, 0, 0, tilt), q = rot(0, -f, 0, 0, 0, tilt);
      m.point(ox + p[0], p[1], cz, 2.4, ca, 0.85 - i * 0.05); m.point(ox + q[0], q[1], cz, 2.4, ca, 0.85 - i * 0.05);
    }
    if (accent) { m.point(accent[0], accent[1], accent[2], 7, cc, 1); m.point(accent[0], accent[1], accent[2], 40, cc, 0.55, true); }
  });

  // sheet-1 #03: a constellation of square nodes joined by hairlines, two nodes in the accent
  Art3D.register('s1-star-chart', function (m, ctx) {
    var ca = ctx.light('a'), cc = ctx.light('c'), pts = [], n = 12 + Math.floor(ctx.rnd() * 4), tries = 0;
    while (pts.length < n && tries++ < 800) {
      var p = [-190 + ctx.rnd() * 640, -360 + ctx.rnd() * 700, -150 - ctx.rnd() * 100];
      if (nearWords(p[0], p[1], p[2], 30)) continue;
      if (pts.some(function (q) { return Math.hypot(q[0] - p[0], q[1] - p[1]) < 105; })) continue;
      pts.push(p);
    }
    function d2(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
    // a minimum spanning tree, so every node is joined and no line is long for no reason
    var inTree = [0], linked = {};
    while (inTree.length < pts.length) {
      var best = null;
      inTree.forEach(function (i) {
        pts.forEach(function (q, j) {
          if (inTree.indexOf(j) >= 0) return;
          var d = d2(pts[i], q);
          if (!best || d < best[2]) best = [i, j, d];
        });
      });
      inTree.push(best[1]); linked[best[0] + '-' + best[1]] = linked[best[1] + '-' + best[0]] = 1;
      seg(m, pts[best[0]], pts[best[1]], ca, 0.45);
    }
    // two or three short extra links close a loop or two
    for (var e = 0; e < 2 + Math.floor(ctx.rnd() * 2); e++) {
      var i0 = Math.floor(ctx.rnd() * pts.length), near = pts.map(function (q, j) { return [j, d2(pts[i0], q)]; }).sort(function (x, y) { return x[1] - y[1]; });
      for (var k = 1; k < near.length; k++) {
        var j0 = near[k][0];
        if (linked[i0 + '-' + j0] || near[k][1] > 230) continue;
        linked[i0 + '-' + j0] = linked[j0 + '-' + i0] = 1; seg(m, pts[i0], pts[j0], ca, 0.28); break;
      }
    }
    var hot = [Math.floor(ctx.rnd() * pts.length)];
    hot.push((hot[0] + 1 + Math.floor(ctx.rnd() * (pts.length - 1))) % pts.length);
    pts.forEach(function (q, j) {
      var s = 8 + ctx.rnd() * 5;
      if (hot.indexOf(j) >= 0) {
        m.glass(q[0], q[1], q[2], s + 3, s + 3, s + 3, cc, 1);
        m.point(q[0], q[1], q[2], 30, cc, 0.4, true);
      } else m.glass(q[0], q[1], q[2], s, s, s, ctx.tone('a', 0.95), 0.75);
      m.point(q[0], q[1], q[2], 2.6, ca, 0.9);
    });
  });

  // sheet-1 #14: a crosshair far behind: long hairlines with ruler ticks, small squares along them
  Art3D.register('s1-reticle', function (m, ctx) {
    var cb = ctx.light('b'), cc = ctx.light('c'), z = -170, cx = 72 + (ctx.rnd() - 0.5) * 30, cy = (ctx.rnd() - 0.5) * 60, v;
    m.line([-230, cy, z, 460, cy, z], cb, 0.45); m.line([cx, -400, z, cx, 390, z], cb, 0.45);
    for (v = -230; v <= 460; v += 16) {
      var big = Math.round((v - cx) / 16) % 4 === 0, h = big ? 7 : 3;
      m.line([v, cy - h, z, v, cy + h, z], cb, big ? 0.4 : 0.25);
    }
    for (v = -384; v <= 384; v += 16) {
      var big2 = Math.round((v - cy) / 16) % 4 === 0, w = big2 ? 7 : 3;
      m.line([cx - w, v, z, cx + w, v, z], cb, big2 ? 0.4 : 0.25);
    }
    for (var i = 0; i < 16; i++) {
      var s = 4 + ctx.rnd() * 6, along = ctx.rnd() < 0.5, t = ctx.rnd();
      var x = along ? -220 + t * 670 : cx, y = along ? cy : -390 + t * 770;
      if (Math.abs(x - cx) < 20 && Math.abs(y - cy) < 20) continue;
      if (ctx.rnd() < 0.6) m.glass(x, y, z, s, s, s, ctx.tone('a', 0.95), 0.75);
      else m.cube(x, y, z, s * 0.7, s * 0.7, s * 0.7, ctx.tone('a', 0.9));
    }
    [[-230, cy], [460, cy], [cx, -400], [cx, 390]].forEach(function (p) { m.cube(p[0], p[1], z, 6, 6, 6, ctx.tone('a', 0.9)); });
    m.cube(cx, cy, z, 10, 10, 10, cc); m.point(cx, cy, z, 80, cc, 0.5, true);
  });

  // sheet-1 #19: a cluster of tall pointed crystal shards, built of grey pixels, with vertical streaks
  Art3D.register('s1-crystal-spires', function (m, ctx) {
    // far back and darker than the mark, in finer pixels, so the shards read as a backdrop
    var cb = ctx.light('b'), n = 6 + Math.floor(ctx.rnd() * 3), cell = 6, s = 3.6;
    for (var k = 0; k < n; k++) {
      var mid = 1 - Math.abs(k / (n - 1) - 0.5) * 2;
      var bx = -150 + (k + 0.5) / n * 600 + (ctx.rnd() - 0.5) * 40, h = 220 + ctx.rnd() * 160 + mid * 220, w = 26 + ctx.rnd() * 24;
      var by = -380 + ctx.rnd() * 50, z = -200 - ctx.rnd() * 60, lean = (ctx.rnd() - 0.5) * 0.3, peak = 0.28 + ctx.rnd() * 0.24;
      for (var yy = 0; yy <= h; yy += cell) {
        var t = yy / h, half = w * Math.pow(t < peak ? t / peak : (1 - t) / (1 - peak), 0.85);
        for (var xx = -half; xx <= half + 0.01; xx += cell) {
          if (ctx.rnd() < 0.14) continue;
          var edge = Math.abs(xx) > half - cell, ridge = Math.abs(xx) < cell * 0.6;
          var v = edge ? 0.6 + ctx.rnd() * 0.12 : ridge ? 0.52 : (xx < 0 ? 0.34 : 0.2) + ctx.rnd() * 0.1 + 0.08 * (1 - t);
          m.cube(bx + xx + Math.sin(lean) * yy, by + yy, z, s, s, s, ctx.tone('a', v));
        }
      }
      for (var j = 0; j < 4; j++) {
        var sx = bx + (ctx.rnd() - 0.5) * w + Math.sin(lean) * h * 0.5, up = ctx.rnd() < 0.4;
        m.quad(sx, by + h * (up ? 0.6 + ctx.rnd() * 0.4 : ctx.rnd() * 0.5), z, up ? 0 : Math.PI, 1 + ctx.rnd() * 0.6, 50 + ctx.rnd() * 200, cb, 0.2 + ctx.rnd() * 0.25, 'fade');
      }
    }
  });

  // sheet-1 #25: a honeycomb of seven hexagon outlines, nodes at the corners, an accent square at the centre
  Art3D.register('s1-hex-comb', function (m, ctx) {
    var cb = ctx.light('b'), cc = ctx.light('c'), R = 96 + ctx.rnd() * 12, cz = -190;
    var rx = 0.16 + ctx.rnd() * 0.2, ry = (ctx.rnd() - 0.5) * 0.5, rz = (ctx.rnd() - 0.5) * 0.24, ox = 80;
    var centres = [[0, 0]], seenV = {}, seenE = {};
    for (var k = 0; k < 6; k++) centres.push([Math.sqrt(3) * R * Math.cos(k * Math.PI / 3), Math.sqrt(3) * R * Math.sin(k * Math.PI / 3)]);
    function P(x, y) { var q = rot(x, y, 0, rx, ry, rz); return [q[0] + ox, q[1], q[2] + cz]; }
    centres.forEach(function (c) {
      var vs = [];
      for (var v = 0; v < 6; v++) { var a = Math.PI / 2 + v * Math.PI / 3; vs.push([c[0] + R * Math.cos(a), c[1] + R * Math.sin(a)]); }
      vs.forEach(function (p, v) {
        var q = vs[(v + 1) % 6], kp = Math.round(p[0]) + ',' + Math.round(p[1]), kq = Math.round(q[0]) + ',' + Math.round(q[1]);
        var ke = kp < kq ? kp + '|' + kq : kq + '|' + kp;
        if (!seenE[ke]) { seenE[ke] = 1; seg(m, P(p[0], p[1]), P(q[0], q[1]), cb, 0.52); }
        if (!seenV[kp]) { seenV[kp] = 1; var w = P(p[0], p[1]); m.cube(w[0], w[1], w[2], 5, 5, 5, ctx.tone('a', 0.92)); }
      });
    });
    var o = P(0, 0);
    m.cube(o[0], o[1], o[2], 11, 11, 11, cc); m.point(o[0], o[1], o[2], 70, cc, 0.5, true);
  });

  // sheet-1 #27: horizontal scan bars stacked into a diamond, a vertical axis with accent nodes
  Art3D.register('s1-scan-diamond', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), z = -160, ox = 80, W = 300, H = 350, step = 12 + Math.floor(ctx.rnd() * 4);
    for (var y = -H + step / 2; y < H; y += step) {
      var hw = W * (1 - Math.abs(y) / H);
      if (hw < 5) continue;
      var x0 = -hw;
      while (x0 < hw) {
        var x1 = Math.min(hw, x0 + 24 + ctx.rnd() * hw);
        m.line([ox + x0, y, z, ox + x1, y, z], cb, 0.22 + ctx.rnd() * 0.26);
        x0 = x1 + (ctx.rnd() < 0.55 ? 0.01 : 5 + ctx.rnd() * 18);
      }
      m.point(ox - hw, y, z, 2.2, ca, 0.7); m.point(ox + hw, y, z, 2.2, ca, 0.7);
    }
    m.line([ox, -H - 14, z, ox, H + 14, z], ca, 0.45);
    [-1, -0.5, 0, 0.5, 1].forEach(function (f) {
      var y = f * H;
      m.cube(ox, y, z, 7, 7, 7, cc); m.point(ox, y, z, 26, cc, 0.45, true);
    });
  });

  /* ---------------- 03-aura: a structure around the mark ---------------- */

  // sheet-1 #04: a dial: three concentric rings turned toward the side, two thick accent arcs on the
  // outer ring, square ticks at the four compass points, a small "+" at the centre
  Art3D.register('s1-arc-dial', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), ry = 0.24 + ctx.rnd() * 0.14, rx = (ctx.rnd() - 0.5) * 0.16, ox = 20, i;
    function at(r, t) { var q = rot(r * Math.cos(t), r * Math.sin(t), 0, rx, ry, 0); q[0] += ox; return q; }
    function circle(r, n) { var p = []; for (var k = 0; k < n; k++) { var q = at(r, k / n * TAU); p.push(q[0], q[1], q[2]); } return p; }
    var R = [206, 240, 272];
    m.line(circle(R[0], 180), cb, 0.34, true);
    for (i = 0; i < 132; i++) { var q = at(R[1], i / 132 * TAU); m.point(q[0], q[1], q[2], 2, cb, q[2] > 0 ? 0.8 : 0.45); }
    m.line(circle(R[2], 220), cb, 0.42, true);
    var t0 = ctx.rnd() * TAU;
    [t0, t0 + Math.PI * (0.75 + ctx.rnd() * 0.4)].forEach(function (s) {
      var len = 0.32 + ctx.rnd() * 0.28, k = 16;
      for (var j = 0; j < k; j++) {
        var a = at(R[2], s + len * j / k), b = at(R[2], s + len * (j + 1) / k), d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
        m.rod(a[0], a[1], a[2], d, Math.hypot(d[0], d[1], d[2]), 5, cc, 0.6);
      }
    });
    for (i = 0; i < 4; i++) {
      var t = i * Math.PI / 2, p0 = at(R[2], t), p1 = at(R[2] + 6, t), p2 = at(R[2] + 20, t), p3 = at(R[0] - 14, t), p4 = at(R[0], t);
      m.cube(p0[0], p0[1], p0[2], 7, 7, 7, ctx.tone('a', 0.95));
      seg(m, p1, p2, ca, 0.6); seg(m, p3, p4, ca, 0.5);
      m.cube(p2[0], p2[1], p2[2], 3.5, 3.5, 3.5, ctx.tone('a', 0.95));
    }
    plus(m, ox, 0, 40, 9, ca, 0.75);
  });

  // sheet-1 #08: three stacked dotted rings on a vertical axis, accent square nodes on the axis
  Art3D.register('s1-ring-stack', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), ax = 0.26 + ctx.rnd() * 0.12, lean = (ctx.rnd() - 0.5) * 0.1;
    function A(y) { return rot(0, y, 0, 0, 0, lean); }
    seg(m, A(-334), A(334), ca, 0.42);
    for (var y = -330; y <= 330; y += 12) { var d = A(y); m.point(d[0], d[1], d[2], 1.4, ca, 0.5); }
    var gap = 205 + ctx.rnd() * 20, ys = [-gap, 0, gap], rs = [190, 236, 190];
    ys.forEach(function (y, k) {
      var c = A(y), r = rs[k], n = Math.round(r * TAU / 8.5);
      for (var i = 0; i < n; i++) {
        var t = i / n * TAU, p = rot(r * Math.cos(t), 0, r * Math.sin(t), ax, 0, lean);
        m.point(c[0] + p[0], c[1] + p[1], c[2] + p[2], 2, cb, p[2] > 0 ? 0.8 : 0.38);
      }
      for (var j = 0; j < 2; j++) {
        var u = ctx.rnd() * TAU, q = rot(r * Math.cos(u), 0, r * Math.sin(u), ax, 0, lean);
        m.point(c[0] + q[0], c[1] + q[1], c[2] + q[2], 5, cc, 1);
      }
      m.cube(c[0], c[1], c[2], 8, 8, 8, cc); m.point(c[0], c[1], c[2], 30, cc, 0.45, true);
    });
    [A(-334), A(334)].forEach(function (p) { m.cube(p[0], p[1], p[2], 6, 6, 6, cc); });
  });

  // sheet-1 #13: a sphere of rain: vertical dotted lines on two cylinders, cut to a sphere, inside a
  // dotted ring with square nodes at the compass points
  Art3D.register('s1-rain-globe', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), R = 246, ox = 40, spin = ctx.rnd() * TAU;
    [[0.96, 30], [0.6, 34]].forEach(function (cyl) {
      var r = R * cyl[0], n = Math.round(r * TAU / cyl[1]);
      for (var i = 0; i < n; i++) {
        var t = spin + i / n * TAU, x = r * Math.cos(t), z = r * Math.sin(t), h = Math.sqrt(Math.max(0, R * R - x * x)) * 0.94;
        var front = z > 0 ? 1 : 0.45, off = ctx.rnd() * 9;
        for (var y = -h + off; y <= h; y += 9) {
          var fade = 1 - Math.pow(Math.abs(y) / h, 3);
          m.point(ox + x, y, z, 1.8, cb, (0.2 + 0.55 * fade) * front);
        }
      }
    });
    var Ro = R + 12;
    for (var k = 0; k < 180; k++) { var a = k / 180 * TAU; m.point(ox + Ro * Math.cos(a), Ro * Math.sin(a), 0, 2.3, ca, 0.85); }
    for (var c = 0; c < 4; c++) {
      var b = c * Math.PI / 2, px = ox + Ro * Math.cos(b), py = Ro * Math.sin(b);
      m.cube(px, py, 0, 7, 7, 7, c === 1 ? cc : ctx.tone('a', 0.95));
      if (c === 1) m.point(px, py, 0, 30, cc, 0.5, true);
    }
  });

  // sheet-1 #21: a horizontal double helix of dots, one strand white, one in the accent, with rungs
  Art3D.register('s1-dna-strand', function (m, ctx) {
    var ca = ctx.light('a'), cc = ctx.light('c'), cy = (ctx.rnd() - 0.5) * 120, cz = -95, r = 52 + ctx.rnd() * 10;
    var k = TAU / (150 + ctx.rnd() * 50), ph = ctx.rnd() * TAU, slope = (ctx.rnd() - 0.5) * 0.24, x;
    function P(x, off) { var a = x * k + ph + off; return [x, cy + x * slope + r * Math.cos(a), cz + r * Math.sin(a)]; }
    for (x = -250; x <= 360; x += 4.5) {
      [0, Math.PI].forEach(function (off, s) {
        var p = P(x, off), depth = (p[2] - cz + r) / (2 * r);
        m.point(p[0], p[1], p[2], 2 + depth * 1.6, s ? cc : ca, 0.4 + 0.6 * depth);
      });
    }
    for (x = -246; x <= 356; x += 18) {
      var a = P(x, 0), b = P(x, Math.PI);
      seg(m, a, b, ca, 0.24);
      for (var j = 1; j < 4; j++) { var t = j / 4; m.point(a[0], a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, 1.6, j === 2 ? cc : ca, 0.7); }
    }
  });

  // sheet-1 #24: two tilted dotted ellipses crossing like the mark's X, accent dots where they cross,
  // a "+" at the centre
  Art3D.register('s1-gyro', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), n = 240, r = 300, spread = 0.82 + ctx.rnd() * 0.14, base = (ctx.rnd() - 0.5) * 0.16;
    var rings = [base + spread, base - spread].map(function (az) { return ctx.ring(r, n, 0.38, az, 0, 0, 0); });
    rings.forEach(function (pts) {
      for (var i = 0; i < n; i++) m.point(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2], 2.3, cb, pts[i * 3 + 2] > 0 ? 0.95 : 0.45);
    });
    // where the two cross in the picture: local minima of the 2D gap between them
    var A = rings[0], B = rings[1], gap = [], near = [];
    for (var i = 0; i < n; i++) {
      var best = 1e9, bj = 0;
      for (var j = 0; j < n; j++) { var d = Math.hypot(A[i * 3] - B[j * 3], A[i * 3 + 1] - B[j * 3 + 1]); if (d < best) { best = d; bj = j; } }
      gap.push(best); near.push(bj);
    }
    for (i = 0; i < n; i++) {
      if (gap[i] > 9 || gap[i] > gap[(i + n - 1) % n] || gap[i] > gap[(i + 1) % n]) continue;
      var bj2 = near[i], x = (A[i * 3] + B[bj2 * 3]) / 2, y = (A[i * 3 + 1] + B[bj2 * 3 + 1]) / 2, z = Math.max(A[i * 3 + 2], B[bj2 * 3 + 2]);
      m.cube(x, y, z, 6, 6, 6, cc); m.point(x, y, z, 30, cc, 0.5, true);
    }
    plus(m, 0, 0, 50, 12, ca, 0.75);
    m.point(0, 0, 50, 3, ca, 1);
  });

  /* ---------------- 04-mark: the DEFXN mark ---------------- */

  // sheet-1 #15: the mark as a dot matrix of grey pixels with clear gaps between them
  Art3D.register('s1-mark-dot-matrix', function (m, ctx) {
    var g = ctx.markGrid(ctx.num('rows', 66)), seed = ctx.rnd() * 100, s = g.cell * 0.6, d = g.cell * 0.8;
    for (var r = 0; r < g.R; r++) for (var c = 0; c < g.C; c++) {
      if (g.cov(r, c) < 0.5 || !g.ok(r, c) || ctx.rnd() < 0.035) continue;
      var n = 0.5 + 0.5 * Math.sin(c * 0.23 + seed) * Math.cos(r * 0.17 - seed * 0.7);
      var v = g.edge(r, c) ? 0.8 + ctx.rnd() * 0.14 : 0.3 + 0.32 * n + ctx.rnd() * 0.1;
      m.cube(g.x(c), g.y(r), d / 2, s, s, d, ctx.tone('a', v));
      ctx.cells.push({ x: g.x(c), y: g.y(r), z: d, s: g.cell });
    }
    // a few loose pixels just off the edges
    for (var k = 0; k < 90; k++) {
      var rr = Math.floor(ctx.rnd() * g.R), cc = Math.floor(ctx.rnd() * g.C);
      if (g.cov(rr, cc) >= 0.5 || !g.ok(rr, cc)) continue;
      if (g.cov(rr - 1, cc) < 0.5 && g.cov(rr + 1, cc) < 0.5 && g.cov(rr, cc - 1) < 0.5 && g.cov(rr, cc + 1) < 0.5) continue;
      m.cube(g.x(cc), g.y(rr), d / 2, s, s, d, ctx.tone('a', 0.25 + ctx.rnd() * 0.3));
    }
  });

  // sheet-1 #07: the mark in small pixels, glitched in a few row bands, dripping down in thin lines
  Art3D.register('s1-mark-pixel-drip', function (m, ctx) {
    var g = ctx.markGrid(ctx.num('rows', 96)), cb = ctx.light('b'), s = g.cell * 0.64, shift = [], r, c;
    for (r = 0; r < g.R;) {
      var band = 2 + Math.floor(ctx.rnd() * 7), sh = ctx.rnd() < 0.16 ? (ctx.rnd() < 0.5 ? -1 : 1) * (1 + Math.floor(ctx.rnd() * 3)) : 0;
      for (var b = 0; b < band && r < g.R; b++, r++) shift[r] = sh;
    }
    for (r = 0; r < g.R; r++) for (c = 0; c < g.C; c++) {
      if (g.cov(r, c) < 0.5 || !g.ok(r, c) || ctx.rnd() < 0.03) continue;
      var x = g.x(c) + shift[r] * g.cell, v = g.edge(r, c) ? 0.9 + ctx.rnd() * 0.08 : 0.5 + ctx.rnd() * 0.3;
      m.cube(x, g.y(r), s / 2, s, s, s, ctx.tone('a', v));
      ctx.cells.push({ x: x, y: g.y(r), z: s, s: g.cell });
    }
    // drips from every lower edge: a run of pixels that thins and fades, and a thin streak
    for (c = 0; c < g.C; c++) for (r = 0; r < g.R; r++) {
      if (g.cov(r, c) < 0.5 || g.cov(r + 1, c) >= 0.5 || !g.ok(r, c) || ctx.rnd() > 0.3) continue;
      var x0 = g.x(c) + shift[r] * g.cell, n = 2 + Math.floor(Math.pow(ctx.rnd(), 1.8) * 26);
      for (var i = 1; i <= n; i++) {
        if (g.cov(r + i, c) >= 0.5) break;
        var y = g.y(r + i);
        if (y < -340) break;
        if (ctx.rnd() < 0.18) continue;
        var f = 1 - i / (n + 1), ss = s * (0.45 + 0.55 * f);
        m.cube(x0, y, ss / 2, ss, ss, ss, ctx.tone('a', 0.2 + 0.65 * f));
      }
      if (ctx.rnd() < 0.45) m.quad(x0, g.y(r) - g.cell / 2, s, Math.PI, 0.8 + ctx.rnd() * 0.6, 40 + ctx.rnd() * 240, cb, 0.18 + ctx.rnd() * 0.3, 'fade');
    }
  });

  /* ---------------- 05-signal: light ---------------- */

  // sheet-1 #01: a spike cross: a dotted horizontal axis packed with thin bars, short at the ends and
  // tall in the middle, an accent square at the centre
  Art3D.register('s1-spike-cross', function (m, ctx) {
    var ca = ctx.light('a'), cc = ctx.light('c'), z = 30, cy = (ctx.rnd() - 0.5) * 50, x;
    for (x = -238; x <= 318; x += 6) m.point(x, cy, z, 1.9 + ctx.rnd() * 0.9, ca, 0.45 + 0.5 * Math.exp(-Math.pow(x / 170, 2)));
    m.line([-240, cy, z, 320, cy, z], ca, 0.24);
    for (x = -234; x <= 314; x += 4) {
      var e = Math.exp(-Math.pow(x / 44, 2)), wide = Math.exp(-Math.pow(x / 150, 2));
      if (Math.abs(x) < 3 || ctx.rnd() > 0.15 + 0.8 * wide) continue;
      var h = 5 + ctx.rnd() * (12 + 30 * wide) + e * Math.pow(ctx.rnd(), 0.5) * 300;
      var up = Math.min(h * (0.4 + ctx.rnd() * 0.6), 330 - cy), dn = Math.min(h * (0.4 + ctx.rnd() * 0.6), 330 + cy);
      m.quad(x, cy - dn, z, 0, 1.3 + ctx.rnd() * 1.1, up + dn, ca, 0.4 + 0.45 * ctx.rnd(), 'peak');
      if (ctx.rnd() < 0.55) m.point(x, cy + up + 3, z, 2.2, ca, 0.85);
      if (ctx.rnd() < 0.55) m.point(x, cy - dn - 3, z, 2.2, ca, 0.85);
      if (ctx.rnd() < 0.3) m.point(x, cy + (ctx.rnd() < 0.5 ? 1 : -1) * (h + 8 + ctx.rnd() * 30), z, 1.8, ca, 0.6);
    }
    m.quad(0, cy - 332, z, 0, 2.4, 664, ca, 0.8, 'peak'); m.quad(0, cy - 332, z - 1, 0, 16, 664, cc, 0.12, 'peak');
    m.cube(0, cy, z + 4, 9, 9, 9, cc);
    m.point(0, cy, z + 4, 70, cc, 0.45, true);
  });

  // sheet-1 #12: a starburst of hairlines of many lengths from a square node, a dot at each end
  Art3D.register('s1-needle-burst', function (m, ctx) {
    var ca = ctx.light('a'), cc = ctx.light('c'), cz = -24, n = 48 + Math.floor(ctx.rnd() * 20);
    for (var i = 0; i < n; i++) {
      var a = (i + ctx.rnd() * 0.7) / n * TAU, el = (ctx.rnd() - 0.5) * 0.8, d = [Math.cos(a) * Math.cos(el), Math.sin(a) * Math.cos(el), Math.sin(el)];
      var len = Math.min(70 + Math.pow(ctx.rnd(), 1.3) * 290, reach(d[0], d[1]) - 6), r0 = 14;
      if (len < r0 + 20) continue;
      var end = [d[0] * len, d[1] * len, cz + d[2] * len], hot = ctx.rnd() < 0.22;
      m.line([d[0] * r0, d[1] * r0, cz + d[2] * r0, end[0], end[1], end[2]], ca, 0.2 + ctx.rnd() * 0.3);
      m.point(end[0], end[1], end[2], hot ? 4.5 : 2.6, hot ? cc : ca, 0.95);
      if (hot) m.point(end[0], end[1], end[2], 24, cc, 0.4, true);
    }
    m.glass(0, 0, cz, 16, 16, 16, ctx.tone('a', 0.95), 0.9, [0.25, 0.5, 0]);
    m.cube(0, 0, cz, 6, 6, 6, cc); m.point(0, 0, cz, 100, cc, 0.5, true);
  });

  // sheet-1 #22: a vertical burst: thin lines mirrored about a glowing centre line, tallest in the
  // middle, a node at each tip
  Art3D.register('s1-light-spire', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), z = 12, K = 22 + Math.floor(ctx.rnd() * 6), gap = 8.5;
    for (var k = 1; k <= K; k++) {
      var env = Math.exp(-Math.pow(k / (K * 0.42), 2)), h = 14 + env * 300 * (0.5 + 0.5 * ctx.rnd()), a = 0.3 + 0.4 * ctx.rnd(), w = 1.2 + ctx.rnd() * 1, hot = ctx.rnd() < 0.18;
      [-1, 1].forEach(function (s) {
        var x = s * k * gap;
        m.quad(x, -h, z, 0, w, 2 * h, cb, a, 'peak');
        m.point(x, h + 4, z, hot ? 3.4 : 2.2, hot ? cc : ca, 0.85); m.point(x, -h - 4, z, hot ? 3.4 : 2.2, hot ? cc : ca, 0.85);
      });
    }
    m.quad(0, -334, z, 0, 3, 668, ca, 1, 'peak'); m.quad(0, -334, z - 1, 0, 26, 668, cc, 0.18, 'peak');
    [-260, -170, -85, 85, 170, 260].forEach(function (y) { m.cube(0, y, z, 5, 5, 5, ctx.tone('a', 0.98)); });
    m.cube(0, 0, z + 3, 8, 8, 8, cc); m.point(0, 0, z + 3, 60, cc, 0.5, true);
  });

  // sheet-1 #26: a dashed sun: a dashed circle and rays of dots running out from it
  Art3D.register('s1-dashed-sun', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), z = -30, ox = 12, R0 = 222 + ctx.rnd() * 16, n = 40 + 4 * Math.floor(ctx.rnd() * 4), ph = ctx.rnd() * TAU, i;
    var dashes = 56;
    for (i = 0; i < dashes; i++) {
      var t0 = i / dashes * TAU, p = [];
      for (var j = 0; j <= 4; j++) { var t = t0 + j / 4 * 0.55 * TAU / dashes; p.push(ox + R0 * Math.cos(t), R0 * Math.sin(t), z); }
      m.line(p, ca, 0.6);
    }
    for (i = 0; i < n; i++) {
      var a = ph + i / n * TAU, len = (i % 2 ? 50 : 110) + ctx.rnd() * 40, max = reach(Math.cos(a), Math.sin(a)) - 4;
      for (var r = R0 + 14; r < R0 + 14 + len && r + ox * Math.cos(a) < max; r += 8) {
        var f = (r - R0 - 14) / len;
        m.point(ox + r * Math.cos(a), r * Math.sin(a), z, 2.6 - f, i % 6 === 0 && r === R0 + 14 ? cc : cb, 0.9 * (1 - f) + 0.15);
      }
    }
  });

  /* ---------------- 06-particles: in front ---------------- */

  // sheet-1 #09: a small point sphere with a horizontal axis ending in squares and a vertical axis
  Art3D.register('s1-axis-globe', function (m, ctx) {
    var ca = ctx.light('a'), cc = ctx.light('c'), r = 36 + ctx.rnd() * 14, cx = 172 + ctx.rnd() * 34, cy = -150 + ctx.rnd() * 270, cz = 60 + ctx.rnd() * 30;
    var tilt = (ctx.rnd() - 0.5) * 0.4, n = 340, ga = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < n; i++) {
      var y = 1 - i / (n - 1) * 2, rr = Math.sqrt(1 - y * y), t = ga * i, p = rot(Math.cos(t) * rr * r, y * r, Math.sin(t) * rr * r, 0.3, 0, tilt);
      var limb = 1 - Math.abs(p[2] / r);
      m.point(cx + p[0], cy + p[1], cz + p[2], 1.3 + ctx.rnd() * 0.7, ca, 0.2 + 0.7 * Math.pow(limb, 1.4));
    }
    var h0 = rot(-(r + 26), 0, 0, 0.3, 0, tilt), h1 = rot(r + 26, 0, 0, 0.3, 0, tilt), v0 = rot(0, -(r + 22), 0, 0.3, 0, tilt), v1 = rot(0, r + 22, 0, 0.3, 0, tilt);
    [h0, h1, v0, v1].forEach(function (p) { p[0] += cx; p[1] += cy; p[2] += cz; });
    seg(m, h0, h1, ca, 0.6); seg(m, v0, v1, ca, 0.45);
    m.cube(h0[0], h0[1], h0[2], 4.5, 4.5, 4.5, ctx.tone('a', 0.95)); m.cube(h1[0], h1[1], h1[2], 4.5, 4.5, 4.5, ctx.tone('a', 0.95));
    m.point(v0[0], v0[1], v0[2], 2.6, ca, 0.9); m.point(v1[0], v1[1], v1[2], 3.4, cc, 1);
    m.point(cx, cy, cz, r * 2.4, cc, 0.16, true);
  });

  // sheet-1 #16: five small spheres stacked on a vertical axis, the middle one largest, with flat
  // rings around the middle one
  Art3D.register('s1-bead-column', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), x = 175 + ctx.rnd() * 40, cy = -80 + ctx.rnd() * 100, z = 70, gap = 50 + ctx.rnd() * 14;
    m.line([x, cy - 2.7 * gap, z, x, cy + 2.7 * gap, z], ca, 0.42);
    for (var y = -2.6 * gap; y <= 2.6 * gap; y += 7) m.point(x, cy + y, z, 1.3, ca, 0.45);
    [6, 10, 19, 10, 6].forEach(function (r, k) {
      m.sphere(x, cy + (k - 2) * gap, z, r, k === 2 ? cb : ca, 0.95);
      if (k !== 2) m.point(x, cy + (k - 2) * gap, z, 2.4, ca, 0.9);
    });
    [32, 44, 58].forEach(function (rr, i) { m.line(ctx.ring(rr, 96, 0.3, 0, x, cy, z), cb, 0.5 - i * 0.12, true); });
    var u = ctx.rnd() * TAU, q = rot(58 * Math.cos(u), 0, 58 * Math.sin(u), 0.3, 0, 0);
    m.point(x + q[0], cy + q[1], z + q[2], 4.5, cc, 1); m.point(x + q[0], cy + q[1], z + q[2], 22, cc, 0.45, true);
    m.point(x, cy, z, 3.4, cc, 1);
  });

  // sheet-1 #17: three isometric wire cubes joined by hairlines to a centre node, a triangle network;
  // the top cube glows in the accent
  Art3D.register('s1-cube-net', function (m, ctx) {
    var cb = ctx.light('b'), cc = ctx.light('c'), a0 = Math.PI / 2 + (ctx.rnd() - 0.5) * 0.5;
    var c0 = [(ctx.rnd() - 0.5) * 30, (ctx.rnd() - 0.5) * 40, 80], iso = [0.615, 0.785, 0];
    var V = [0, 1, 2].map(function (k) { var a = a0 + k * TAU / 3; return [c0[0] + 200 * Math.cos(a), c0[1] + 225 * Math.sin(a), 60 + ctx.rnd() * 50]; });
    var top = V.reduce(function (b, p, k) { return p[1] > V[b][1] ? k : b; }, 0);
    m.line([V[0][0], V[0][1], V[0][2], V[1][0], V[1][1], V[1][2], V[2][0], V[2][1], V[2][2]], cb, 0.2, true);
    V.forEach(function (p, k) {
      var s = 30 + ctx.rnd() * 10, hot = k === top;
      m.glass(p[0], p[1], p[2], s, s, s, hot ? cc : ctx.tone('a', 0.95), hot ? 1 : 0.8, iso);
      if (hot) { m.point(p[0], p[1], p[2], s * 3.4, cc, 0.4, true); m.cube(p[0], p[1], p[2], s * 0.28, s * 0.28, s * 0.28, cc, iso); }
      seg(m, p, c0, cb, 0.32);
      dots(m, p, c0, 16, 1.6, cb, 0.6);
      var mid = [(p[0] + c0[0]) / 2, (p[1] + c0[1]) / 2, (p[2] + c0[2]) / 2];
      m.cube(mid[0], mid[1], mid[2], 4, 4, 4, ctx.tone('a', 0.95));
    });
    m.cube(c0[0], c0[1], c0[2], 8, 8, 8, ctx.tone('a', 1)); m.point(c0[0], c0[1], c0[2], 36, cc, 0.4, true);
  });

  // sheet-1 #18: a wave ribbon of several dotted strands that twists along its length, accent dots,
  // a few thin vertical lines
  Art3D.register('s1-dot-ribbon', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c');
    var y0 = ctx.rnd() < 0.5 ? -200 + ctx.rnd() * 60 : 110 + ctx.rnd() * 50, A = 36 + ctx.rnd() * 36, k = TAU / (320 + ctx.rnd() * 160), ph = ctx.rnd() * TAU;
    var tw = TAU / (280 + ctx.rnd() * 200), z0 = 70, S = 7, marks = [];
    for (var j = 0; j < S; j++) {
      var off = (j - (S - 1) / 2) * 7;
      for (var x = -240; x <= 290; x += 5) {
        var th = x * tw + ph * 1.7, y = y0 + A * Math.sin(x * k + ph) + off * Math.cos(th), z = z0 + off * Math.sin(th) * 2.2;
        var env = Math.sin(Math.PI * (x + 240) / 530);
        m.point(x, y, z, 2, cb, 0.35 + 0.6 * env);
        if (ctx.rnd() < 0.025) marks.push([x, y, z]);
      }
    }
    marks.forEach(function (p, i) {
      if (i % 2) { m.point(p[0], p[1], p[2], 3.6, cc, 1); m.point(p[0], p[1], p[2], 16, cc, 0.35, true); }
      else if (i % 4 === 0) { var h = 30 + ctx.rnd() * 70, dir = ctx.rnd() < 0.5 ? 1 : -1; m.line([p[0], p[1], p[2], p[0], p[1] + dir * h, p[2]], ca, 0.3); m.point(p[0], p[1] + dir * h, p[2], 2.2, ca, 0.8); }
    });
  });

  // sheet-1 #29: a stream of particles on a wave, rising to the right, growing and brightening as it
  // rises, with accent particles
  Art3D.register('s1-updraft', function (m, ctx) {
    var ca = ctx.light('a'), cc = ctx.light('c'), ph = ctx.rnd() * TAU, waves = 1.4 + ctx.rnd() * 0.8, amp = 36 + ctx.rnd() * 30;
    var P0 = [-235, -300], P1 = [205, 215], dx = P1[0] - P0[0], dy = P1[1] - P0[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
    for (var i = 0; i < 1300; i++) {
      var t = ctx.rnd(), w = amp * Math.sin(t * waves * TAU + ph), g = gauss(ctx.rnd) * (8 + 22 * t);
      var x = P0[0] + dx * t + nx * (w + g), y = P0[1] + dy * t + ny * (w + g), z = 30 + 70 * t + gauss(ctx.rnd) * 24, hot = ctx.rnd() < 0.08;
      m.point(x, y, z, (hot ? 1.8 : 1) + t * 1.6 + ctx.rnd() * 0.5, hot ? cc : ca, (0.28 + 0.62 * t) * (0.5 + 0.5 * ctx.rnd()));
    }
    for (var j = 0; j < 10; j++) {
      var u = 0.3 + ctx.rnd() * 0.7, ww = amp * Math.sin(u * waves * TAU + ph), s = 3 + ctx.rnd() * 4;
      m.cube(P0[0] + dx * u + nx * ww, P0[1] + dy * u + ny * ww, 30 + 70 * u, s, s, s, ctx.tone('a', 0.7 + ctx.rnd() * 0.3), [ctx.rnd() * 3, ctx.rnd() * 3, 0]);
    }
  });
})();

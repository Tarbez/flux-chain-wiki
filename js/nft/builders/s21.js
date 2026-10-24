/* DEFXN identity card: builders from reference sheet 21 (the mark's core forms, its identity drawings
   and its cross / split drawings, plus four scanners that read the mark). Each builder is named by an
   element file in layers/04-mark/sheet-21/ or layers/05-signal/sheet-21/. The space and the m / ctx
   calls are described at the top of art3d.js. Every random value comes from ctx.rnd(), so the same
   card always draws the same art.

   Colour: blocks are ctx.tone('a', v), mid greys with bright edges; the sheet's white, cyan and
   amber accents are the palette's light, ctx.light('b'), and glow, ctx.light('c').

   THE OBJECT VIEW. Art3D.solid() makes the mark four times deeper for the object view and the 3D
   file. It stretches the z of the mark's blocks, glass and points about their middle, and leaves
   lines and glowing bars where they are. So a mark here that mixes the two keeps its points and
   glass at one depth (z 0), or builds its joints and caps from small glowing bars, never points:
   then the parts still meet when the object turns.

     s21-mark-cloud        04-mark    the mark as a dense cloud of fine points, bright at its edge,
                                      thick in the middle, with sparkles
     s21-mark-fingerprint  04-mark    the mark as ridges at equal steps in from its edge, broken in places
     s21-mark-strata       04-mark    the mark cut into horizontal bands, each band a plate at its own depth
     s21-mark-neon         04-mark    the mark's outline as glowing tubes on small holders, hollow inside
     s21-mark-shatter      04-mark    the mark broken into shards that drift out from its centre
     s21-mark-lattice      04-mark    the mark as clear glass cells on a coarse grid, deeper inside
     s21-mark-lightbars    04-mark    the mark as thin vertical bars of light, each column at its own depth
     s21-mark-diamond      04-mark    the mark as diamonds on a 45-degree grid, larger where it is solid
     s21-mark-mesh         04-mark    the mark as a wire mesh, domed toward the front and the back
     s21-mark-split        04-mark    the mark's two halves pulled apart, a seam of light between them
     s21-radar             05-signal  a radar sweep with rings and a crosshair behind the mark
     s21-scan-bands        05-signal  horizontal scan bars across the mark, its blocks lit where they pass
     s21-brackets          05-signal  corner brackets closing in on the mark's centre
     s21-target            05-signal  a target reticle on the mark, its tick ring fading behind a bright head */
(function () {
  'use strict';
  var A = window.Art3D, TAU = Math.PI * 2;
  if (!A || !A.register) { console.error('js/nft/builders/s21.js: Art3D is not loaded. Load js/nft/art3d.js first. traits.js loads this file when a card needs it.'); return; }

  /* ---------- helpers ---------- */
  function on(g, r, c) { return g.cov(r, c) >= 0.5 && g.ok(r, c); }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  var WHITE = [1, 1, 1];
  // the grid cell under an art-space point
  function cellOf(g, x, y) { return [Math.round((g.y(0) - y) / g.cell), Math.round((x - g.x(0)) / g.cell)]; }
  function okAt(g, x, y) { var rc = cellOf(g, x, y); return g.ok(rc[0], rc[1]); }
  // rotate as three.js does for a block's rot [rx, ry, rz] (Euler XYZ): z first, then y, then x
  function rotE(p, r) {
    var c = Math.cos(r[2]), s = Math.sin(r[2]), x1 = p[0] * c - p[1] * s, y1 = p[0] * s + p[1] * c;
    c = Math.cos(r[1]); s = Math.sin(r[1]);
    var x2 = x1 * c + p[2] * s, z2 = -x1 * s + p[2] * c;
    c = Math.cos(r[0]); s = Math.sin(r[0]);
    return [x2, y1 * c - z2 * s, y1 * s + z2 * c];
  }

  // squared distance along one line (Felzenszwalb and Huttenlocher), in place into d
  function dt1(f, n, d, v, z) {
    var k = 0; v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
    for (var q = 1; q < n; q++) {
      var s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
    }
    k = 0;
    for (var p = 0; p < n; p++) { while (z[k + 1] < p) k++; d[p] = (p - v[k]) * (p - v[k]) + f[v[k]]; }
  }
  // the straight-line distance, in cells, from every cell of a W x H grid to the nearest target cell
  function edt(target, W, H) {
    var N = Math.max(W, H), f = new Float64Array(N), d = new Float64Array(N), v = new Int32Array(N), z = new Float64Array(N + 1), out = new Float64Array(W * H), x, y;
    for (var i = 0; i < W * H; i++) out[i] = target[i] ? 0 : 1e10;
    for (x = 0; x < W; x++) { for (y = 0; y < H; y++) f[y] = out[y * W + x]; dt1(f, H, d, v, z); for (y = 0; y < H; y++) out[y * W + x] = d[y]; }
    for (y = 0; y < H; y++) { for (x = 0; x < W; x++) f[x] = out[y * W + x]; dt1(f, W, d, v, z); for (x = 0; x < W; x++) out[y * W + x] = Math.sqrt(d[x]); }
    return out;
  }
  // how far each cell is from the mark's edge, in cells: inD inside the mark, outD outside it, and sd
  // the signed distance (inside positive, zero on the edge), a smooth field for contour lines
  function field(g, P) {
    var W = g.C + 2 * P, H = g.R + 2 * P, ins = new Uint8Array(W * H), outs = new Uint8Array(W * H), r, c;
    for (r = 0; r < H; r++) for (c = 0; c < W; c++) { var o = g.cov(r - P, c - P) >= 0.5; ins[r * W + c] = o ? 1 : 0; outs[r * W + c] = o ? 0 : 1; }
    var toOut = edt(outs, W, H), toIn = edt(ins, W, H), max = 0;
    for (var i = 0; i < W * H; i++) if (toOut[i] > max) max = toOut[i];
    function idx(r, c) { r += P; c += P; return r < 0 || r >= H || c < 0 || c >= W ? -1 : r * W + c; }
    return {
      max: max,
      inD: function (r, c) { var i = idx(r, c); return i < 0 ? 0 : toOut[i]; },
      outD: function (r, c) { var i = idx(r, c); return i < 0 ? 99 : toIn[i]; },
      sd: function (r, c) { var i = idx(r, c); return i < 0 ? -99 : toOut[i] > 0 ? toOut[i] - 0.5 : 0.5 - toIn[i]; }
    };
  }

  // contour lines of the field f(r, c) at the level iso (marching squares over the cell centres),
  // joined into lines of [x, y] points in art units. A closed loop ends on its first point.
  var CASES = [null, ['L', 'B'], ['B', 'R'], ['L', 'R'], ['T', 'R'], 's5', ['T', 'B'], ['L', 'T'], ['L', 'T'], ['T', 'B'], 's10', ['T', 'R'], ['L', 'R'], ['B', 'R'], ['L', 'B'], null];
  function contours(g, f, iso, pad) {
    var WW = g.C + 2 * pad + 2, P = new Map(), segs = [];
    function hp(r, c, a, b) { var id = ((r + pad) * WW + (c + pad)) * 2; if (!P.has(id)) P.set(id, [g.x(c + (iso - a) / (b - a)), g.y(r)]); return id; }
    function vp(r, c, a, b) { var id = ((r + pad) * WW + (c + pad)) * 2 + 1; if (!P.has(id)) P.set(id, [g.x(c), g.y(r + (iso - a) / (b - a))]); return id; }
    for (var r = -pad; r < g.R + pad - 1; r++) for (var c = -pad; c < g.C + pad - 1; c++) {
      var tl = f(r, c), tr = f(r, c + 1), br = f(r + 1, c + 1), bl = f(r + 1, c);
      var k = (tl > iso ? 8 : 0) | (tr > iso ? 4 : 0) | (br > iso ? 2 : 0) | (bl > iso ? 1 : 0), cs = CASES[k];
      if (!cs) continue;
      var E = {
        T: function () { return hp(r, c, tl, tr); }, B: function () { return hp(r + 1, c, bl, br); },
        L: function () { return vp(r, c, tl, bl); }, R: function () { return vp(r, c + 1, tr, br); }
      };
      if (cs === 's5' || cs === 's10') {
        var mid = (tl + tr + br + bl) / 4 > iso;
        var pairs = (cs === 's5') === mid ? [['L', 'T'], ['B', 'R']] : [['T', 'R'], ['L', 'B']];
        pairs.forEach(function (p) { segs.push([E[p[0]](), E[p[1]]()]); });
      } else segs.push([E[cs[0]](), E[cs[1]]()]);
    }
    var adj = new Map();
    segs.forEach(function (s, i) { s.forEach(function (id) { var l = adj.get(id); if (!l) adj.set(id, (l = [])); l.push(i); }); });
    var used = new Uint8Array(segs.length), out = [];
    for (var i = 0; i < segs.length; i++) {
      if (used[i]) continue;
      used[i] = 1;
      var line = [segs[i][0], segs[i][1]];
      for (var fwd = 1; fwd >= 0; fwd--) {
        for (;;) {
          var end = fwd ? line[line.length - 1] : line[0], next = -1, list = adj.get(end) || [];
          for (var j = 0; j < list.length; j++) if (!used[list[j]]) { next = list[j]; break; }
          if (next < 0) break;
          used[next] = 1;
          var o = segs[next][0] === end ? segs[next][1] : segs[next][0];
          if (fwd) line.push(o); else line.unshift(o);
        }
      }
      out.push({ pts: line.map(function (id) { return P.get(id); }), closed: line.length > 3 && line[0] === line[line.length - 1] });
    }
    return out;
  }
  // fewer points on a line, none moved more than tol units (Douglas-Peucker)
  function simplify(pts, tol) {
    if (pts.length < 3) return pts.slice();
    var keep = new Uint8Array(pts.length), stack = [[0, pts.length - 1]];
    keep[0] = keep[pts.length - 1] = 1;
    while (stack.length) {
      var s = stack.pop(), a = pts[s[0]], b = pts[s[1]], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), best = -1, bi = -1;
      for (var i = s[0] + 1; i < s[1]; i++) {
        var p = pts[i], d = L > 1e-6 ? Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / L : Math.hypot(p[0] - a[0], p[1] - a[1]);
        if (d > best) { best = d; bi = i; }
      }
      if (best > tol) { keep[bi] = 1; stack.push([s[0], bi], [bi, s[1]]); }
    }
    return pts.filter(function (p, i) { return keep[i]; });
  }
  function rodTo(m, a, b, w, rgb, alpha) {
    var d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], len = Math.hypot(d[0], d[1], d[2]);
    if (len > 0.3) m.rod(a[0], a[1], a[2], d, len, w, rgb, alpha);
  }

  // where a far thing must sit at depth z to be SEEN at (xs, ys) on the card at rest
  function atSeen(ctx, xs, ys, z) {
    var x = xs, y = ys;
    for (var i = 0; i < 5; i++) { var p = ctx.seen(x, y, z); x += xs - p[0]; y += ys - p[1]; }
    return [x, y, z];
  }
  // true when a point is seen inside the art's box and clear of the card's words
  function visible(ctx, p, pad) {
    var s = ctx.seen(p[0], p[1], p[2]);
    return s[0] > -238 + pad && s[0] < 318 - pad && s[1] > -338 + pad && s[1] < 338 - pad && ctx.clear(s[0], s[1], pad);
  }
  // a line through [[x,y,z], ...], broken where it would be seen over the words or off the art
  function clipLine(m, ctx, pts, rgb, alpha, closed, pad) {
    var run = [], n = pts.length + (closed ? 1 : 0);
    for (var i = 0; i < n; i++) {
      var q = pts[i % pts.length];
      if (visible(ctx, q, pad == null ? 8 : pad)) run.push(q[0], q[1], q[2]);
      else { if (run.length >= 6) m.line(run, rgb, alpha); run = []; }
    }
    if (run.length >= 6) m.line(run, rgb, alpha);
  }
  // a straight line, cut into short steps so clipLine can break it cleanly
  function clipSeg(m, ctx, a, b, rgb, alpha, pad) {
    var n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 8)), p = [];
    for (var i = 0; i <= n; i++) p.push(mix(a, b, i / n));
    clipLine(m, ctx, p, rgb, alpha, false, pad);
  }
  function arcPts(o, r, t0, t1, step) {            // t from the top, clockwise, in the card's plane
    var n = Math.max(2, Math.ceil(Math.abs(t1 - t0) / (step || 0.03))), p = [];
    for (var i = 0; i <= n; i++) { var t = t0 + (t1 - t0) * i / n; p.push([o[0] + r * Math.sin(t), o[1] + r * Math.cos(t), o[2]]); }
    return p;
  }

  /* ================= 04-mark ================= */

  // core forms: the mark as a dense cloud of fine points. Each cell sends points through a depth that
  // grows toward the middle of the stroke, so the cloud is a soft volume from the side; the edge is a
  // crisp, bright band; a thin haze lies just outside it; sparkles in white and the palette's light.
  A.register('s21-mark-cloud', function (m, ctx) {
    var g = ctx.markGrid(ctx.num('rows', 150)), F = field(g, 4), cb = ctx.light('b'), cc = ctx.light('c'), max = Math.max(2, F.max), r, c;
    var rimTone = ctx.tone('a', 0.97);
    for (r = -3; r < g.R + 3; r++) for (c = -3; c < g.C + 3; c++) {
      if (!g.ok(r, c)) continue;
      var sd = F.sd(r, c), x = g.x(c), y = g.y(r);
      if (sd < -3 || Math.abs(x) > 200 || Math.abs(y) > 273) continue;
      if (sd < 0) {                                   // the haze just outside the edge
        if (ctx.rnd() < 0.2 * (1 + sd / 3)) m.point(x + (ctx.rnd() - 0.5) * g.cell, y + (ctx.rnd() - 0.5) * g.cell, (ctx.rnd() - 0.5) * 8, g.cell * 0.32, rimTone, 0.22 + ctx.rnd() * 0.2);
        continue;
      }
      var t = Math.min(1, sd / max), thick = 2 + 12 * Math.sqrt(t), rim = sd < 1.1, n = rim ? 3 : 2 + (ctx.rnd() < 0.5 ? 1 : 0);
      for (var k = 0; k < n; k++) {
        var px = x + (ctx.rnd() - 0.5) * g.cell, py = y + (ctx.rnd() - 0.5) * g.cell, z = (ctx.rnd() * 2 - 1) * thick;
        if (rim) m.point(px, py, z * 0.5, g.cell * (0.42 + ctx.rnd() * 0.2), rimTone, 0.8 + ctx.rnd() * 0.2);
        else m.point(px, py, z, g.cell * (0.3 + ctx.rnd() * 0.3), ctx.tone('a', 0.55 + 0.4 * ctx.rnd() * (1 - 0.5 * t)), 0.36 + ctx.rnd() * 0.44);
      }
      ctx.cells.push({ x: x, y: y, z: thick, s: g.cell });
    }
    // sparkles: a white core, a soft glow in the palette's light, and a four-point flare
    var ns = 24 + Math.floor(ctx.rnd() * 14), tries = 0;
    for (var i = 0; i < ns && tries < 4000; tries++) {
      var rr = Math.floor(ctx.rnd() * g.R), ccol = Math.floor(ctx.rnd() * g.C), sdv = F.sd(rr, ccol);
      if (!on(g, rr, ccol) || (sdv > 1.6 && ctx.rnd() < 0.55)) continue;
      i++;
      var sx = g.x(ccol), sy = g.y(rr), sz = 2 + 12 * Math.sqrt(Math.min(1, sdv / max)) * 0.6, big = ctx.rnd() < 0.3, col = ctx.rnd() < 0.5 ? cc : cb;
      m.point(sx, sy, sz, big ? 3.4 : 2.2, WHITE, 1);
      m.point(sx, sy, sz, big ? 26 : 13, col, big ? 0.55 : 0.4, true);
      if (big) for (var a = 0; a < 4; a++) m.quad(sx, sy, sz, a * Math.PI / 2, 0.9, 10 + ctx.rnd() * 14, col, 0.75, 'fade');
    }
  });

  // identity: the mark as a fingerprint. Ridges run at equal steps in from the edge, so they follow
  // its shape inward; each ridge breaks in places, as a print does. The inner ridges stand nearer the
  // viewer, so from the side the print is a low dome of rings.
  A.register('s21-mark-fingerprint', function (m, ctx) {
    var g = ctx.markGrid(ctx.num('rows', 140)), F = field(g, 3), step = ctx.num('step', 1.75), ca = ctx.tone('a', 0.96), cb = ctx.light('b'), cc = ctx.light('c');
    var seed = ctx.rnd() * 100, w = g.cell * 0.42, lift = g.cell * 1.3, base = ctx.tone('a', 0.16);
    function hole(x, y) { return Math.sin(x * 0.043 + seed) * Math.cos(y * 0.037 - seed) + 0.6 * Math.sin((x - y) * 0.071 + seed * 2); }
    for (var L = 0, iso = 0.25; iso < F.max - 0.6; L++, iso += step) {
      contours(g, F.sd, iso, 2).forEach(function (line) {
        var pts = simplify(line.pts, 0.45), z = 2 + L * lift, live = true, left = 30 + ctx.rnd() * 140, run = [];
        var col = L === 0 ? ca : ctx.rnd() < 0.12 ? cc : ctx.tone('a', 0.82 + ctx.rnd() * 0.14), alpha = L === 0 ? 0.95 : 0.78;
        function flush() {
          for (var i = 0; i + 1 < run.length; i++) rodTo(m, run[i], run[i + 1], w, col, alpha);
          run = [];
        }
        for (var i = 0; i < pts.length; i++) {
          var p = [pts[i][0], pts[i][1], z];
          if (i) left -= Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
          if (left <= 0) {                             // a ridge ending: a short gap, then the ridge goes on
            if (live) { run.push(p); flush(); live = false; left = 3 + ctx.rnd() * 7; }
            else { live = true; left = 40 + ctx.rnd() * 180; }
          }
          var open = L > 0 && hole(p[0], p[1]) > 1.25;  // a few open patches, where the ridges thin out
          if (live && okAt(g, p[0], p[1]) && !open) { run.push(p); if (i % 3 === 0) ctx.cells.push({ x: p[0], y: p[1], z: z, s: g.cell * 2 }); }
          else flush();
        }
        flush();
      });
    }
    // a dark pad under the ridges, one block per run of a row, so the print has a body when it turns
    for (var r = 0; r < g.R; r += 2) {
      var c = 0;
      while (c < g.C) {
        if (!(F.sd(r, c) > 0.6 && F.sd(r + 1, c) > 0.6 && g.ok(r, c))) { c++; continue; }
        var c0 = c;
        while (c < g.C && F.sd(r, c) > 0.6 && F.sd(r + 1, c) > 0.6 && g.ok(r, c)) c++;
        m.cube((g.x(c0) + g.x(c - 1)) / 2, (g.y(r) + g.y(r + 1)) / 2, -2.5, (c - c0) * g.cell, g.cell * 2.02, 4, base);
      }
    }
  });

  // core forms: the mark as strata. It is cut into horizontal bands of a few rows, a dark line between
  // them, and each band is a plate pushed to its own depth: from the side the bands are stacked
  // plates. A band's top row and its outer ends catch the light; a hairline of light runs along it.
  A.register('s21-mark-strata', function (m, ctx) {
    var g = ctx.markGrid(ctx.num('rows', 96)), cb = ctx.light('b'), d = g.cell * ctx.num('depth', 2.6), reach = g.cell * 7, bands = [], r = 0;
    while (r < g.R) { var h = 5 + Math.floor(ctx.rnd() * 6); bands.push([r, Math.min(g.R, r + h)]); r += h + 1; }
    var z = 0;
    bands.forEach(function (b, i) {
      if (i) { var stepZ = (1.8 + ctx.rnd() * 2.6) * g.cell * (ctx.rnd() < 0.5 ? -1 : 1); if (Math.abs(z + stepZ) > reach) stepZ = -stepZ; z += stepZ; }
      var z0 = z, v0 = 0.32 + ctx.rnd() * 0.16, tall = b[1] - b[0];
      for (var rr = b[0]; rr < b[1]; rr++) {
        var top = rr === b[0], y = g.y(rr), c = 0, v = top ? 0.84 + ctx.rnd() * 0.1 : v0 + 0.1 * (1 - (rr - b[0]) / tall);
        while (c < g.C) {
          if (!on(g, rr, c)) { c++; continue; }
          var c0 = c;
          while (c < g.C && on(g, rr, c)) c++;
          var c1 = c - 1, n = c1 - c0 + 1;
          // the run's two end cells are their own blocks, lit where they are the mark's edge
          [c0, c1].forEach(function (ce, j) {
            if (j && n < 2) return;
            m.cube(g.x(ce), y, z0 + d / 2, g.cell * 0.98, g.cell * 1.02, d, ctx.tone('a', top ? v : g.edge(rr, ce) ? 0.66 + ctx.rnd() * 0.16 : v));
          });
          if (n > 2) m.cube((g.x(c0 + 1) + g.x(c1 - 1)) / 2, y, z0 + d / 2, (n - 2) * g.cell + 0.02, g.cell * 1.02, d, ctx.tone('a', v));
          if (top) m.bar((g.x(c0) + g.x(c1)) / 2, y + g.cell * 0.5, z0 + d + 0.4, n * g.cell, 0.9, 0.9, cb, 0.55);
          for (var k = c0; k <= c1; k++) ctx.cells.push({ x: g.x(k), y: y, z: z0 + d, s: g.cell });
        }
      }
    });
  });

  // core forms: the mark as neon. Only its outline, built from glowing tubes that break where one
  // tube ends and the next begins; a thinner tube in the palette's light runs behind it, and small
  // dark holders tie the two. Hollow inside.
  A.register('s21-mark-neon', function (m, ctx) {
    var g = ctx.markGrid(ctx.num('rows', 110)), tube = ctx.light(ctx.P.tint || 'c'), back = ctx.light('b'), core = mix(tube, WHITE, 0.6);
    var zf = 9, zb = -9, holder = ctx.tone('a', 0.32);
    contours(g, g.cov, 0.5, 1).forEach(function (line) {
      var pts = simplify(line.pts, 0.9);
      if (pts.length < 2) return;
      var left = 3 + Math.floor(ctx.rnd() * 6), since = 0;
      for (var i = 0; i + 1 < pts.length; i++) {
        var a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
        if (len < 0.5) continue;
        var ux = dx / len, uy = dy / len, cut = --left <= 0 && len > 6;
        if (!okAt(g, a[0], a[1]) || !okAt(g, b[0], b[1])) continue;
        var b2 = cut ? [b[0] - ux * 3, b[1] - uy * 3] : b;          // a tube ends a little short of the corner
        if (cut) left = 3 + Math.floor(ctx.rnd() * 6);
        rodTo(m, [a[0], a[1], zf], [b2[0], b2[1], zf], 2.4, core, 0.95);
        rodTo(m, [a[0], a[1], zf], [b2[0], b2[1], zf], 7, tube, 0.16);
        rodTo(m, [a[0], a[1], zb], [b[0], b[1], zb], 1.3, back, 0.5);
        since += len;
        if (since > 34) {                            // a holder: a short post from the tube to the back line
          since = 0;
          rodTo(m, [a[0], a[1], zb], [a[0], a[1], zf], 0.9, back, 0.35);
          m.cube(a[0], a[1], (zf + zb) / 2, 3.2, 3.2, 5, holder);
        }
        if (i % 2 === 0) ctx.cells.push({ x: a[0], y: a[1], z: zf, s: g.cell });
      }
    });
  });

  // cross / split: the mark breaking apart. Its blocks fall into shards (each cell joins the nearest
  // of a few dozen seeds), and every shard drifts out from the centre, more the farther out it lies,
  // turning a little as it goes. The broken faces are lit; small chips hang in the cracks.
  A.register('s21-mark-shatter', function (m, ctx) {
    var g = ctx.markGrid(ctx.num('rows', 72)), k = 0.86, s = g.cell * k, depth = g.cell * 2.2, list = [], seeds = [], r, c, i;
    for (r = 0; r < g.R; r++) for (c = 0; c < g.C; c++) if (on(g, r, c)) list.push({ r: r, c: c, x: g.x(c) * k, y: g.y(r) * k });
    var want = ctx.num('pieces', 44), apart = Math.sqrt(list.length * s * s / want) * 0.72;
    for (var tries = 0; seeds.length < want && tries < 4000; tries++) {
      var q = list[Math.floor(ctx.rnd() * list.length)];
      if (seeds.every(function (p) { return Math.hypot(p.x - q.x, p.y - q.y) > apart; })) seeds.push({ x: q.x, y: q.y, cells: [] });
    }
    var owner = {};
    list.forEach(function (e) {
      var best = 1e9, bi = 0;
      seeds.forEach(function (p, j) { var dd = Math.hypot(p.x - e.x, (p.y - e.y) * 0.9); if (dd < best) { best = dd; bi = j; } });
      seeds[bi].cells.push(e); owner[e.r + ',' + e.c] = bi;
    });
    var rmax = 1;
    seeds.forEach(function (p) {
      if (!p.cells.length) return;
      p.cx = p.cells.reduce(function (a, e) { return a + e.x; }, 0) / p.cells.length;
      p.cy = p.cells.reduce(function (a, e) { return a + e.y; }, 0) / p.cells.length;
      rmax = Math.max(rmax, Math.hypot(p.cx, p.cy));
    });
    function place(p, e, f) {
      var l = rotE([e.x - p.cx, e.y - p.cy, 0], p.rot);
      return [p.cx + p.ux * p.push * f + l[0], p.cy + p.uy * p.push * f + l[1], p.dz * f + l[2]];
    }
    seeds.forEach(function (p) {
      if (!p.cells.length) return;
      var rr = Math.hypot(p.cx, p.cy), t = rr / rmax;
      p.ux = rr > 1 ? p.cx / rr : 0; p.uy = rr > 1 ? p.cy / rr : 1;
      p.push = (3 + 30 * t * t) * (0.75 + ctx.rnd() * 0.5);
      p.dz = (ctx.rnd() - 0.4) * 14 * t + 2;
      p.rot = [(ctx.rnd() - 0.5) * 0.16 * t, (ctx.rnd() - 0.5) * 0.16 * t, (ctx.rnd() - 0.5) * 0.3 * t];
      p.v = 0.3 + ctx.rnd() * 0.18;
      // drift less when the shard would leave the mark's box or cover the card's words
      for (p.f = 1; p.f > 0; p.f -= 0.25) {
        if (p.cells.every(function (e) { var w = place(p, e, p.f); return Math.abs(w[0]) < 200 - s / 2 && Math.abs(w[1]) < 273 - s / 2 && ctx.clear(w[0], w[1], 6); })) break;
      }
      p.f = Math.max(0, p.f);
    });
    seeds.forEach(function (p, j) {
      p.cells.forEach(function (e) {
        var w = place(p, e, p.f);
        if (!ctx.clear(w[0], w[1], 4)) return;
        var crack = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (n) { var o = owner[(e.r + n[0]) + ',' + (e.c + n[1])]; return o !== undefined && o !== j; });
        var edge = g.edge(e.r, e.c), v = crack ? 0.8 + ctx.rnd() * 0.15 : edge ? 0.62 + ctx.rnd() * 0.14 : p.v + ctx.rnd() * 0.05;
        m.cube(w[0], w[1], w[2] + depth / 2, s * 0.96, s * 0.96, depth, ctx.tone('a', v), p.rot);
        ctx.cells.push({ x: w[0], y: w[1], z: w[2] + depth, s: g.cell * k });
        // a chip in the crack, part way along the drift
        if (crack && ctx.rnd() < 0.07) {
          var cs = s * (0.25 + ctx.rnd() * 0.3), f = 0.3 + ctx.rnd() * 0.5;
          m.cube(e.x + p.ux * p.push * p.f * f, e.y + p.uy * p.push * p.f * f, p.dz * p.f * f + depth * 0.6, cs, cs, cs, ctx.tone('a', 0.55 + ctx.rnd() * 0.4), [ctx.rnd() * 3, ctx.rnd() * 3, ctx.rnd() * 3]);
        }
      });
    });
    m.point(0, 0, -20, 220, ctx.light('c'), 0.16, true);
  });

  // core forms: the mark as a glass lattice. Clear glass cells on a coarse grid, each a box as deep as
  // it lies inside the stroke, so the middle is thick and the edge thin; glowing joints at the
  // corners of the front face, and a few cells lit from within. Everything is centred on z 0, so the
  // lattice keeps its shape in the object view.
  A.register('s21-mark-lattice', function (m, ctx) {
    var g = ctx.markGrid(ctx.num('rows', 26)), F = field(g, 1), edgeC = ctx.tone('a', 0.95), cl = ctx.light('a'), cc = ctx.light('c'), s = g.cell, joints = {}, r, c;
    for (r = 0; r < g.R; r++) for (c = 0; c < g.C; c++) {
      if (!on(g, r, c)) continue;
      var dIn = F.inD(r, c), layers = Math.min(3, Math.max(1, Math.round(dIn))), sz = s * (0.6 + 0.55 * layers), edge = g.edge(r, c);
      m.glass(g.x(c), g.y(r), 0, s, s, sz, edgeC, edge ? 0.9 : 0.42 + ctx.rnd() * 0.16);
      ctx.cells.push({ x: g.x(c), y: g.y(r), z: sz / 2, s: s });
      [[0, 0], [0, 1], [1, 0], [1, 1]].forEach(function (o) {
        var key = (r + o[0]) + ',' + (c + o[1]);
        if (!joints[key] || joints[key] < sz / 2) joints[key] = sz / 2;
      });
      if (layers >= 2 && ctx.rnd() < 0.16) {
        m.bar(g.x(c), g.y(r), 0, s * 0.34, s * 0.34, sz * 0.7, cc, 0.55);
        m.point(g.x(c), g.y(r), 0, s * 2.4, cc, 0.3, true);
      }
    }
    Object.keys(joints).forEach(function (key) {
      var rc = key.split(','), x = g.x(+rc[1] - 0.5), y = g.y(+rc[0] - 0.5), z = joints[key], big = ctx.rnd() < 0.12;
      m.bar(x, y, z, big ? 3.6 : 2.2, big ? 3.6 : 2.2, big ? 3.6 : 2.2, big ? cc : cl, big ? 0.95 : 0.6);
      m.bar(x, y, -z, 1.6, 1.6, 1.6, cl, 0.35);
    });
  });

  // core forms: the mark as light bars. Thin vertical bars of light, one column at a time; the bars
  // together draw the mark. A long run breaks into a few bars of varied height. Each column stands at
  // its own depth in a slow wave, so from the side the bars are a curtain. Some columns carry the
  // palette's glow, and a few bars run on past the edge as fading streaks.
  A.register('s21-mark-lightbars', function (m, ctx) {
    var g = ctx.markGrid(ctx.num('rows', 112)), cc = ctx.light('c'), cb = ctx.light('b'), ca = ctx.tone('a', 0.9), w = g.cell * 0.5, ph = ctx.rnd() * TAU;
    for (var c = 0; c < g.C; c++) {
      var zc = 9 * Math.sin(c * 0.19 + ph) + (ctx.rnd() - 0.5) * 10, deep = w * (1 + ctx.rnd() * 0.8), hot = ctx.rnd() < 0.16, col = hot ? cc : ca, x = g.x(c), r = 0;
      while (r < g.R) {
        if (!on(g, r, c)) { r++; continue; }
        var r0 = r;
        while (r < g.R && on(g, r, c)) r++;
        // break the run into bars of varied height
        var a = r0;
        while (a < r) {
          var b = Math.min(r, a + 3 + Math.floor(ctx.rnd() * 16));
          if (r - b < 3) b = r;
          var yT = g.y(a) + g.cell / 2, yB = g.y(b - 1) - g.cell / 2 + (b < r ? g.cell * 0.9 : 0), hgt = yT - yB, ym = (yT + yB) / 2, al = 0.55 + ctx.rnd() * 0.35;
          m.bar(x, ym, zc, w, hgt, deep, col, al);
          m.bar(x, ym, zc, w * 0.34, hgt, deep * 0.6, WHITE, 0.3);
          m.bar(x, yT - 0.8, zc, w * 1.5, 1.6, deep, mix(col, WHITE, 0.5), 0.8);
          m.bar(x, yB + 0.8, zc, w * 1.5, 1.6, deep, mix(col, WHITE, 0.5), 0.8);
          for (var k = a; k < b; k++) ctx.cells.push({ x: x, y: g.y(k), z: zc + deep / 2, s: g.cell });
          a = b;
        }
        if (ctx.rnd() < 0.22) m.quad(x, g.y(r0) + g.cell / 2, zc, 0, w * 0.7, Math.min(338 - g.y(r0), 30 + ctx.rnd() * 140), hot ? cc : cb, 0.4, 'fade');
        if (ctx.rnd() < 0.22) m.quad(x, g.y(r - 1) - g.cell / 2, zc, Math.PI, w * 0.7, Math.min(338 + g.y(r - 1), 30 + ctx.rnd() * 140), hot ? cc : cb, 0.4, 'fade');
      }
    }
  });

  // core forms: the mark as a dot diamond. Diamonds sit on a 45-degree grid; each is as large as the
  // mark is solid around it, so they touch tip to tip inside and shrink to points at the edge. The
  // larger a diamond, the farther it stands out.
  A.register('s21-mark-diamond', function (m, ctx) {
    var g = ctx.markGrid(ctx.num('rows', 160)), step = ctx.num('step', 15), h = step / 2, reach = Math.max(1, Math.round(h * 0.8 / g.cell)), cc = ctx.light('c');
    function covAt(x, y) {
      var rc = cellOf(g, x, y), sum = 0, n = 0;
      for (var i = -reach; i <= reach; i++) for (var j = -reach; j <= reach; j++) { if (Math.abs(i) + Math.abs(j) > reach * 1.5) continue; sum += g.cov(rc[0] + i, rc[1] + j); n++; }
      return sum / n;
    }
    var U = Math.ceil(205 / h), V = Math.ceil(278 / h);
    for (var v = -V; v <= V; v++) for (var u = -U; u <= U; u++) {
      if ((u + v) % 2) continue;
      var x = u * h, y = v * h;
      if (Math.abs(x) > 200 || Math.abs(y) > 273) continue;
      var a = covAt(x, y);
      if (a < 0.08) continue;
      var rc = cellOf(g, x, y);
      if (!g.ok(rc[0], rc[1])) continue;
      var D = step * 0.74 * Math.sqrt(a), side = D / Math.SQRT2, dep = side * (0.7 + a * 1.3);
      var tone = a > 0.92 ? 0.34 + ctx.rnd() * 0.14 : 0.62 + 0.32 * (1 - a) + ctx.rnd() * 0.04;
      m.cube(x, y, dep / 2, side, side, dep, ctx.tone('a', Math.min(1, tone)), [0, 0, Math.PI / 4]);
      ctx.cells.push({ x: x, y: y, z: dep, s: D });
      if (a > 0.92 && ctx.rnd() < 0.025) m.point(x, y, dep + 1, step * 1.6, cc, 0.4, true);
    }
  });

  // core forms: the mark as a wire mesh. A coarse grid of lines over the mark's cells only, lifted
  // into a dome toward the viewer and mirrored behind, so it closes into a pillow of wire; the edge
  // where the two halves meet is bright, and small joints mark the crossings in front.
  A.register('s21-mark-mesh', function (m, ctx) {
    var g = ctx.markGrid(ctx.num('rows', 46)), F = field(g, 1), ca = ctx.tone('a', 0.92), cb = ctx.light('b'), dome = ctx.num('dome', 34), i, j;
    var R = g.R, C = g.C;
    function cellOn(r, c) { return on(g, r, c); }
    // a crossing (i, j) sits at the corner between cells; its height is the mean depth of its cells
    var H = [], maxH = 0;
    for (i = 0; i <= R; i++) for (j = 0; j <= C; j++) {
      var s = 0;
      [[i - 1, j - 1], [i - 1, j], [i, j - 1], [i, j]].forEach(function (q) { if (cellOn(q[0], q[1])) s += F.inD(q[0], q[1]); });
      H[i * (C + 1) + j] = s / 4; if (s / 4 > maxH) maxH = s / 4;
    }
    function P(i, j, side) { var t = H[i * (C + 1) + j] / maxH; return [g.x(j - 0.5), g.y(i - 0.5), side * dome * Math.sqrt(t)]; }
    // an edge is drawn when a cell on either side of it is the mark's; it is the outline when only one is
    function hEdge(i, j) { var a = cellOn(i - 1, j), b = cellOn(i, j); return a || b ? (a && b ? 1 : 2) : 0; }
    function vEdge(i, j) { var a = cellOn(i, j - 1), b = cellOn(i, j); return a || b ? (a && b ? 1 : 2) : 0; }
    [1, -1].forEach(function (side) {
      var al = side > 0 ? 0.5 : 0.2;
      for (i = 0; i <= R; i++) {                     // the rows of the mesh
        var run = [];
        for (j = 0; j < C; j++) {
          var e = hEdge(i, j);
          if (e === 1) { if (!run.length) run.push(P(i, j, side)); run.push(P(i, j + 1, side)); }
          else { if (run.length > 1) m.line([].concat.apply([], run), ca, al); run = []; }
        }
        if (run.length > 1) m.line([].concat.apply([], run), ca, al);
      }
      for (j = 0; j <= C; j++) {                     // the columns
        var run2 = [];
        for (i = 0; i < R; i++) {
          var e2 = vEdge(i, j);
          if (e2 === 1) { if (!run2.length) run2.push(P(i, j, side)); run2.push(P(i + 1, j, side)); }
          else { if (run2.length > 1) m.line([].concat.apply([], run2), ca, al); run2 = []; }
        }
        if (run2.length > 1) m.line([].concat.apply([], run2), ca, al);
      }
    });
    // the outline, where front and back meet: bright
    for (i = 0; i <= R; i++) for (j = 0; j < C; j++) if (hEdge(i, j) === 2) { var a1 = P(i, j, 1), b1 = P(i, j + 1, 1); m.line([a1[0], a1[1], 0, b1[0], b1[1], 0], ca, 0.95); }
    for (j = 0; j <= C; j++) for (i = 0; i < R; i++) if (vEdge(i, j) === 2) { var a2 = P(i, j, 1), b2 = P(i + 1, j, 1); m.line([a2[0], a2[1], 0, b2[0], b2[1], 0], ca, 0.95); }
    // joints on the front, and the cells for what grows from the mark
    for (i = 0; i <= R; i++) for (j = 0; j <= C; j++) {
      if (H[i * (C + 1) + j] <= 0) continue;
      var p = P(i, j, 1);
      if ((i + j) % 2 === 0) m.bar(p[0], p[1], p[2], 1.8, 1.8, 1.8, ctx.rnd() < 0.08 ? cb : ca, 0.7);
    }
    for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) if (cellOn(r, c)) { var q = P(r, c, 1); ctx.cells.push({ x: g.x(c), y: g.y(r), z: q[2], s: g.cell }); }
  });

  // cross / split: the mark's two mirrored halves pulled apart. The left half steps back and left,
  // the right half forward and right; their facing edges are lit by a seam of light down the middle,
  // which leaks out through the gap in short streaks.
  A.register('s21-mark-split', function (m, ctx) {
    var g = ctx.markGrid(ctx.num('rows', 84)), k = 0.9, s = g.cell * k, open = ctx.num('open', 14), cc = ctx.light('c'), cb = ctx.light('b');
    var zL = -18 - ctx.rnd() * 10, zR = 14 + ctx.rnd() * 10, d = g.cell * 3, mid = (g.C - 1) / 2, rows = {};
    for (var r = 0; r < g.R; r++) for (var c = 0; c < g.C; c++) {
      if (!on(g, r, c)) continue;
      var left = c <= mid, sx = left ? -open : open, z = left ? zL : zR, x = g.x(c) * k + sx, y = g.y(r) * k;
      if (!ctx.clear(x, y, 4)) continue;
      // the edge that faces the seam: the next cell toward the middle is empty
      var facing = !(g.cov(r, left ? c + 1 : c - 1) >= 0.5) && Math.abs(g.x(c)) < 70;
      var v = facing ? 0.92 : g.edge(r, c) ? 0.62 + ctx.rnd() * 0.16 : 0.32 + 0.14 * (1 - r / g.R) + ctx.rnd() * 0.05;
      m.cube(x, y, z + d / 2, s * 0.94, s * 0.94, d, ctx.tone('a', v));
      ctx.cells.push({ x: x, y: y, z: z + d, s: g.cell * k });
      if (facing) {
        m.cube(x + (left ? 1 : -1) * s * 0.36, y, z + d + 0.9, s * 0.3, s * 1.02, 1.8, ctx.tone('c', 0.95));
        m.bar(x + (left ? 1 : -1) * s * 0.36, y, z + d + 1.2, s * 1.2, s * 1.02, 1, cc, 0.4);
        (rows[r] = rows[r] || []).push([x, y, z + d / 2, left]);
      }
    }
    // the seam
    m.bar(0, 0, 0, 1.6, 560, 1.6, mix(cc, WHITE, 0.5), 0.9);
    m.quad(0, -285, -1, 0, 9, 570, cc, 0.32, 'peak');
    m.quad(0, -285, -2, 0, 30, 570, cc, 0.1, 'peak');
    // light leaking out of the gap past the lit edges
    Object.keys(rows).forEach(function (key) {
      if (ctx.rnd() > 0.18) return;
      rows[key].forEach(function (p) {
        m.quad(p[0], p[1], p[2], p[3] ? Math.PI / 2 : -Math.PI / 2, 1 + ctx.rnd() * 0.8, 20 + ctx.rnd() * 70, cb, 0.35, 'fade');
      });
    });
    for (var i = 0; i < 70; i++) m.point((ctx.rnd() - 0.5) * open * 1.6, (ctx.rnd() - 0.5) * 520, (ctx.rnd() - 0.5) * 20, 1.2 + ctx.rnd() * 1.4, ctx.rnd() < 0.5 ? cc : WHITE, 0.4 + ctx.rnd() * 0.5);
  });

  /* ================= 05-signal: scanners that read the mark ================= */

  // a radar behind the mark: rings, a crosshair and ticks round the rim, a sweep that fades behind its
  // bright leading edge, and a few echoes inside the sweep.
  A.register('s21-radar', function (m, ctx) {
    var z = -110, R = ctx.num('radius', 248), o = atSeen(ctx, 6, 0, z), ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c');
    clipLine(m, ctx, arcPts(o, R, 0, TAU, 0.02), ca, 0.7, true);
    clipLine(m, ctx, arcPts(o, R + 1.5, 0, TAU, 0.02), cc, 0.3, true);
    clipLine(m, ctx, arcPts(o, R * 0.36, 0, TAU, 0.03), ca, 0.4, true);
    for (var q = 0; q < 48; q++) if (q % 2 === 0) clipLine(m, ctx, arcPts(o, R * 0.68, q / 48 * TAU, (q + 1) / 48 * TAU, 0.03), ca, 0.45);
    clipSeg(m, ctx, [o[0] - R, o[1], z], [o[0] + R, o[1], z], ca, 0.42);
    clipSeg(m, ctx, [o[0], o[1] - R, z], [o[0], o[1] + R, z], ca, 0.42);
    for (var t = 0; t < 72; t++) {
      var a = t / 72 * TAU, big = t % 6 === 0, p0 = [o[0] + (R + 3) * Math.sin(a), o[1] + (R + 3) * Math.cos(a), z], p1 = [o[0] + (R + (big ? 14 : 7)) * Math.sin(a), o[1] + (R + (big ? 14 : 7)) * Math.cos(a), z];
      clipSeg(m, ctx, p0, p1, ca, big ? 0.8 : 0.45);
    }
    // the sweep: radial lines from the centre, fading over the wedge behind the leading edge
    var head = ctx.rnd() * TAU, span = 1.05 + ctx.rnd() * 0.3, n = 110;
    for (var i = 1; i <= n; i++) {
      var ang = head - span * i / n, f = Math.pow(1 - i / n, 2.2);
      clipSeg(m, ctx, [o[0], o[1], z], [o[0] + R * Math.sin(ang), o[1] + R * Math.cos(ang), z], cc, 0.05 + 0.5 * f);
    }
    clipSeg(m, ctx, [o[0], o[1], z], [o[0] + R * Math.sin(head), o[1] + R * Math.cos(head), z], mix(cc, WHITE, 0.5), 0.95);
    m.quad(o[0], o[1], z + 0.5, -head, 3, R, cc, 0.5, 'peak');
    // echoes: a bright dot with a soft ring, inside the sweep
    var nb = 3 + Math.floor(ctx.rnd() * 3);
    for (var b = 0; b < nb; b++) {
      var ba = head - span * (0.08 + ctx.rnd() * 0.7), br = R * (0.25 + ctx.rnd() * 0.65), bp = [o[0] + br * Math.sin(ba), o[1] + br * Math.cos(ba), z + 1];
      if (!visible(ctx, bp, 12)) continue;
      m.point(bp[0], bp[1], bp[2], 4.5, mix(cc, WHITE, 0.4), 1); m.point(bp[0], bp[1], bp[2], 30, cc, 0.4, true);
      clipLine(m, ctx, arcPts(bp, 9, 0, TAU, 0.3), cc, 0.5, true);
    }
    m.point(o[0], o[1], z, 5, ca, 0.9); m.point(o[0], o[1], z, 60, cc, 0.25, true);
  });

  // scan bands: a few horizontal bars of light pass across the mark. Each is a hot hairline in a soft
  // band, with fading echo lines on the side it came from, short ticks at its ends, and the mark's
  // blocks lit along its path.
  A.register('s21-scan-bands', function (m, ctx) {
    var n = 3 + Math.floor(ctx.rnd() * 2), cc = ctx.light('c'), cb = ctx.light('b'), z = 26, ys = [];
    for (var tries = 0; ys.length < n && tries < 400; tries++) {
      var y = -238 + ctx.rnd() * 450;
      if (ys.every(function (q) { return Math.abs(q - y) > 70; })) ys.push(y);
    }
    ys.forEach(function (y) {
      var x0 = atSeen(ctx, -232, y, z)[0], x1 = atSeen(ctx, 312, y, z)[0], len = x1 - x0, up = ctx.rnd() < 0.5 ? 1 : -1, hot = mix(cc, WHITE, 0.45);
      m.quad(x1, y, z, Math.PI / 2, 1.5, len, hot, 0.9, 'peak');
      m.quad(x1, y, z - 0.5, Math.PI / 2, 18, len, cc, 0.08, 'peak');
      for (var e = 1; e <= 5; e++) m.quad(x1, y + up * e * 3.4, z, Math.PI / 2, 0.8, len * (1 - e * 0.08), cc, 0.26 * (1 - e / 6), 'peak');
      [x0 + 26, x1 - 26].forEach(function (xe) { m.line([xe, y - 7, z, xe, y + 7, z], cb, 0.6); });
      // the blocks it reads
      ctx.cells.forEach(function (c) {
        if (Math.abs(c.y - y) > c.s * 0.55) return;
        m.point(c.x, y, c.z + 1.5, Math.max(1.6, c.s * 0.7), hot, 0.85);
        if (ctx.rnd() < 0.06) m.point(c.x, y, c.z + 2, c.s * 3.4, cc, 0.3, true);
      });
    });
  });

  // brackets: corner brackets in a few nested boxes, closing in on the mark's centre. The outer
  // boxes are faint, the inner ones brighter, and the last is in the palette's glow; dotted lines
  // along the diagonals trace the way in.
  A.register('s21-brackets', function (m, ctx) {
    var z = 40, ca = ctx.light('a'), cc = ctx.light('c'), cy = -ctx.rnd() * 14, HW = 196, HH = 206, steps = [1, 0.72, 0.48, 0.27];
    steps.forEach(function (k, i) {
      var hw = HW * k, hh = HH * k, arm = Math.min(hw, hh) * 0.24, last = i === steps.length - 1, col = last ? cc : ca, al = 0.24 + i * 0.2;
      var th = 2 + i * 0.5, blk = last ? ctx.tone('c', 0.95) : ctx.tone('a', 0.6 + i * 0.12);
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (sg) {
        var cx = sg[0] * hw, cyy = cy + sg[1] * hh;
        if (!visible(ctx, [cx, cyy, z], 8) || !visible(ctx, [cx - sg[0] * arm, cyy, z], 8) || !visible(ctx, [cx, cyy - sg[1] * arm, z], 8)) return;
        m.cube(cx - sg[0] * (arm - th) / 2, cyy, z, arm + th, th, th, blk);
        m.cube(cx, cyy - sg[1] * (arm - th) / 2, z, th, arm + th, th, blk);
        m.bar(cx - sg[0] * (arm - th) / 2, cyy, z, arm + th * 3, th * 3, th, col, al * 0.35);
        m.bar(cx, cyy - sg[1] * (arm - th) / 2, z, th * 3, arm + th * 3, th, col, al * 0.35);
        if (last) m.point(cx, cyy, z + th, 16, cc, 0.5, true);
      });
    });
    // the way in: dots along the diagonals between the outer corner and the inner one
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (sg) {
      for (var t = 0.08; t < 0.95; t += 0.07) {
        var k = 1 - (1 - steps[steps.length - 1]) * t, p = [sg[0] * HW * k, cy + sg[1] * HH * k, z];
        if (visible(ctx, p, 8)) m.point(p[0], p[1], p[2], 1.8, ca, 0.2 + 0.5 * t);
      }
    });
    // fine ticks along the outer box's sides, and a small cross at the centre
    for (var x = -HW + 20; x <= HW - 20; x += 20) { clipSeg(m, ctx, [x, cy + HH, z], [x, cy + HH - 4, z], ca, 0.2, 6); clipSeg(m, ctx, [x, cy - HH, z], [x, cy - HH + 4, z], ca, 0.2, 6); }
    m.line([-9, cy, z, 9, cy, z], cc, 0.9); m.line([0, cy - 9, z, 0, cy + 9, z], cc, 0.9);
    m.point(0, cy, z, 3, WHITE, 1); m.point(0, cy, z, 34, cc, 0.3, true);
  });

  // target: a reticle locked on the mark. A ring of ticks whose brightness and length fall away behind
  // one bright head, as if the ring were turning, with trailing arcs outside it; an inner ring broken
  // at the diagonals, four pointers aiming in, and a small diamond at the centre.
  A.register('s21-target', function (m, ctx) {
    var z = 58, ca = ctx.light('a'), cc = ctx.light('c'), cb = ctx.light('b');
    var o = [(ctx.rnd() - 0.5) * 16, (ctx.rnd() - 0.5) * 24, z], R = 112 + ctx.rnd() * 20, head = ctx.rnd() * TAU, n = 72;
    // a tick as a small block along its radius, so it shows over the mark's light blocks as well as on the dark
    function tick(a, r0, len, wd, rgb) {
      var c = [o[0] + (r0 + len / 2) * Math.sin(a), o[1] + (r0 + len / 2) * Math.cos(a), z];
      if (visible(ctx, c, 6)) m.cube(c[0], c[1], c[2], wd, len, wd, rgb, [0, 0, -a]);
    }
    for (var i = 0; i < n; i++) {
      var f = 1 - i / n, a = head - i / n * TAU, major = i % 9 === 0, L = (major ? 10 : 5) + 10 * Math.pow(f, 3);
      tick(a, R, L, major ? 2.2 : 1.6, i < 2 ? ctx.tone('c', 1) : ctx.tone('a', 0.22 + 0.74 * Math.pow(f, 1.6)));
      if (f > 0.6) clipSeg(m, ctx, [o[0] + R * Math.sin(a), o[1] + R * Math.cos(a), z + 1], [o[0] + (R + L) * Math.sin(a), o[1] + (R + L) * Math.cos(a), z + 1], cc, 0.6 * f, 4);
    }
    [[R + 24, 0.7, 0.85], [R + 30, 1.2, 0.5], [R + 36, 1.7, 0.28]].forEach(function (t) { clipLine(m, ctx, arcPts(o, t[0], head - t[1], head, 0.03), cc, t[2], false, 4); });
    m.point(o[0] + (R + 6) * Math.sin(head), o[1] + (R + 6) * Math.cos(head), z, 5, WHITE, 1);
    m.point(o[0] + (R + 6) * Math.sin(head), o[1] + (R + 6) * Math.cos(head), z, 34, cc, 0.45, true);
    // the inner ring, broken at the diagonals
    for (var q = 0; q < 4; q++) for (var u = -0.55; u <= 0.55; u += 0.05) tick(q * Math.PI / 2 + u + Math.PI / 2, R * 0.66 - 1, 2, R * 0.66 * 0.05 + 0.4, ctx.tone('a', 0.82));
    // four pointers aiming in
    for (var p = 0; p < 4; p++) {
      var t0 = p * Math.PI / 2, tip = R * 0.42, back = R * 0.56, wd = 0.1;
      clipLine(m, ctx, [[o[0] + back * Math.sin(t0 - wd), o[1] + back * Math.cos(t0 - wd), z], [o[0] + tip * Math.sin(t0), o[1] + tip * Math.cos(t0), z], [o[0] + back * Math.sin(t0 + wd), o[1] + back * Math.cos(t0 + wd), z]], cc, 0.85, true, 4);
    }
    var dd = 7;
    clipLine(m, ctx, [[o[0], o[1] + dd, z], [o[0] + dd, o[1], z], [o[0], o[1] - dd, z], [o[0] - dd, o[1], z]], mix(cc, WHITE, 0.4), 0.95, true, 4);
    m.point(o[0], o[1], z, 2.6, WHITE, 1); m.point(o[0], o[1], z, 46, cc, 0.22, true);
    // a leader line from the ring to the side, ending in a short bar
    var side = o[0] > 0 ? -1 : 1, lp = [o[0] + side * (R + 10) * 0.7071, o[1] - (R + 10) * 0.7071, z], lq = [lp[0] + side * 40, lp[1] - 40, z], lr = [lq[0] + side * 46, lq[1], z];
    clipLine(m, ctx, [lp, lq, lr], cb, 0.5, false, 4);
    if (visible(ctx, lr, 6)) m.bar(lr[0] + side * 10, lr[1], z, 20, 2.2, 1, cb, 0.6);
  });
})();

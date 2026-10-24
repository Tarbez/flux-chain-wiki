/* Sheet 5: pixel-style HUD pieces built in 3D. White pixels with the palette's accent (--c).
   Every builder here starts with "s5-". Space and API: see the header of art3d.js. Every random
   value comes from ctx.rnd(), so the same card always builds the same art. */
(function () {
  'use strict';
  var A = window.Art3D;
  if (!A) { console.error('js/nft/builders/s5.js: Art3D is not loaded. Load js/nft/art3d.js first. traits.js loads this file when a card needs it.'); return; }

  var TAU = Math.PI * 2;
  // rotate a point about y by ry, then about x by rx: the same turn as a block's rot [rx, ry, 0]
  function turn(x, y, z, rx, ry) {
    var cy = Math.cos(ry), sy = Math.sin(ry), x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
    var cx = Math.cos(rx), sx = Math.sin(rx);
    return [x1, y * cx - z1 * sx, y * sx + z1 * cx];
  }
  function inArt(x, y) { return x >= -240 && x <= 320 && y >= -340 && y <= 340; }
  // m.quad points up at angle 0 and left at PI/2: this is the angle that points along (dx, dy)
  function angleOf(dx, dy) { return Math.atan2(-dx, dy); }

  /* 26. Pixel burst (particles): a blob of white and grey pixels of mixed size off one side of the
     mark, flying outward, with one mint streak out of its core. */
  A.register('s5-pixel-burst', function (m, ctx) {
    var spots = [[175, -110], [165, 140], [-140, -140], [0, 215], [10, -205]];
    var sp = spots[Math.floor(ctx.rnd() * spots.length)], G = 4;
    var cx = sp[0] + (ctx.rnd() - 0.5) * 24, cy = sp[1] + (ctx.rnd() - 0.5) * 24, cz = 90;
    function snap(v) { return Math.round(v / G) * G; }
    var core = 90 + Math.floor(ctx.rnd() * 30);
    for (var i = 0; i < core; i++) {
      var a = ctx.rnd() * TAU, r = 36 * Math.sqrt(ctx.rnd()), s = [4, 4, 4, 6, 8, 12][Math.floor(ctx.rnd() * 6)];
      m.cube(snap(cx + Math.cos(a) * r), snap(cy + Math.sin(a) * r * 0.85), cz + (ctx.rnd() - 0.5) * 18, s * 0.9, s * 0.9, s * 0.9,
        ctx.tone('a', 0.32 + ctx.rnd() * 0.66));
    }
    // glitch strips: short rows of pixels pushed sideways out of the blob
    var strips = 5 + Math.floor(ctx.rnd() * 5);
    for (var g = 0; g < strips; g++) {
      var gy = snap(cy + (ctx.rnd() - 0.5) * 70), gx = snap(cx + (ctx.rnd() - 0.5) * 50 + (ctx.rnd() < 0.5 ? -1 : 1) * (20 + ctx.rnd() * 40)), gl = 3 + Math.floor(ctx.rnd() * 10);
      for (var gi = 0; gi < gl; gi++) if (ctx.rnd() < 0.85 && inArt(gx + gi * G, gy)) m.cube(gx + gi * G, gy, cz + 6, G * 0.88, G * 0.88, G * 0.88, ctx.tone('a', 0.45 + ctx.rnd() * 0.5));
    }
    var n = 170 + Math.floor(ctx.rnd() * 60);
    for (var j = 0; j < n; j++) {
      var ang = ctx.rnd() * TAU, d = 40 + Math.pow(ctx.rnd(), 0.8) * 240, f = d / 280;
      var s2 = Math.max(2, Math.round((7 - f * 5) * (0.6 + ctx.rnd() * 0.6)));
      var x = snap(cx + Math.cos(ang) * d), y = snap(cy + Math.sin(ang) * d), z = cz + (ctx.rnd() - 0.3) * 110 * f;
      if (!inArt(x, y)) continue;
      if (ctx.rnd() < 0.25) m.point(x, y, z, s2 + 1, ctx.tone('a', 0.92), 0.45 + ctx.rnd() * 0.5);
      else m.cube(x, y, z, s2, s2, s2, ctx.tone('a', 0.3 + ctx.rnd() * 0.66 * (1 - f * 0.5)));
      // a short trail back toward the core: the pixel is flying out
      if (d > 70 && ctx.rnd() < 0.18) m.quad(x, y, z, angleOf(-Math.cos(ang), -Math.sin(ang)), 1.2, 12 + ctx.rnd() * 26, ctx.tone('a', 0.9), 0.35, 'fade');
    }
    // the mint streak: one smooth line and one broken into pixels, with a few mint pixels on it
    var mint = ctx.light('c'), sa = ctx.rnd() * TAU, len = 170 + ctx.rnd() * 120, qa = angleOf(Math.cos(sa), Math.sin(sa));
    m.quad(cx, cy, cz + 2, qa, 2.4, len, mint, 0.85, 'fade');
    m.quad(cx, cy, cz + 1, qa, 7, len * 0.85, mint, 0.4, 'bars', Math.round(len / 9));
    for (var k = 0; k < 7; k++) {
      var t = 0.15 + ctx.rnd() * 0.7, mx = snap(cx + Math.cos(sa) * len * t), my = snap(cy + Math.sin(sa) * len * t), ms = 3 + Math.floor(ctx.rnd() * 3);
      if (inArt(mx, my)) m.cube(mx, my, cz + 3, ms, ms, ms, mint);
    }
    m.point(cx, cy, cz, 70, mint, 0.28, true);
  });

  /* 27. Voxel cubes (aura): three isometric cube outlines made of pixel dots around the mark, one
     in mint, small pixels scattered between them, faint vertical streaks. */
  A.register('s5-voxel-cubes', function (m, ctx) {
    var spots = [[-160, 200, 30], [218, 10, 30], [110, -232, 40]], mintAt = Math.floor(ctx.rnd() * 3), lightB = ctx.light('b'), mint = ctx.light('c');
    spots.forEach(function (s, k) {
      var size = 62 + ctx.rnd() * 26, h = size / 2, n = Math.max(6, Math.round(size / 7));
      var rx = 0.615 + (ctx.rnd() - 0.5) * 0.2, ry = 0.785 + (ctx.rnd() - 0.5) * 0.5, rot = [rx, ry, 0];
      var cx = s[0] + (ctx.rnd() - 0.5) * 24, cy = s[1] + (ctx.rnd() - 0.5) * 24, cz = s[2], isMint = k === mintAt;
      function colour(z) { return isMint ? mint : ctx.tone('a', 0.6 + 0.35 * (z + h) / size + ctx.rnd() * 0.05); }
      for (var axis = 0; axis < 3; axis++) for (var e = 0; e < 4; e++) for (var i = 1; i < n; i++) {
        var p = [0, 0, 0];
        p[axis] = -h + size * i / n; p[(axis + 1) % 3] = e & 1 ? h : -h; p[(axis + 2) % 3] = e & 2 ? h : -h;
        var q = turn(p[0], p[1], p[2], rx, ry);
        m.cube(cx + q[0], cy + q[1], cz + q[2], 3.6, 3.6, 3.6, colour(q[2]), rot);
      }
      for (var c = 0; c < 8; c++) {
        var w = turn(c & 1 ? h : -h, c & 2 ? h : -h, c & 4 ? h : -h, rx, ry);
        m.cube(cx + w[0], cy + w[1], cz + w[2], 6, 6, 6, colour(w[2]), rot);
        if (isMint) m.point(cx + w[0], cy + w[1], cz + w[2], 22, mint, 0.3, true);
      }
      var streaks = 2 + Math.floor(ctx.rnd() * 3);
      for (var t = 0; t < streaks; t++) {
        m.quad(cx + (ctx.rnd() - 0.5) * size, cy - h * 0.9, cz, Math.PI, 1 + ctx.rnd(), 60 + ctx.rnd() * 170, isMint ? mint : lightB, 0.12 + ctx.rnd() * 0.16, 'fade');
      }
      for (var b = 0; b < 26; b++) {
        var a = ctx.rnd() * TAU, r = size * (0.8 + ctx.rnd() * 0.9), bx = Math.round((cx + Math.cos(a) * r) / 3) * 3, by = Math.round((cy + Math.sin(a) * r) / 3) * 3, bs = 2 + ctx.rnd() * 2;
        if (inArt(bx, by)) m.cube(bx, by, cz + (ctx.rnd() - 0.5) * 60, bs, bs, bs, isMint && ctx.rnd() < 0.4 ? mint : ctx.tone('a', 0.4 + ctx.rnd() * 0.55));
      }
    });
    for (var f = 0; f < 8; f++) m.quad(-220 + ctx.rnd() * 520, -330 + ctx.rnd() * 120, -40 + ctx.rnd() * 80, 0, 0.9, 260 + ctx.rnd() * 340, lightB, 0.05 + ctx.rnd() * 0.07, 'peak');
  });

  /* 28. Pixel ring (aura): a tilted donut of blocks around the mark. The ring is voxelised on a grid
     that does not turn with it, so its outline steps like pixels. Faint streaks fall from it. */
  A.register('s5-pixel-ring', function (m, ctx) {
    var R = 212 + ctx.rnd() * 10, tube = 13 + ctx.rnd() * 4, v = 8, ax = 0.3 + ctx.rnd() * 0.12, az = (ctx.rnd() - 0.5) * 0.45, oy = (ctx.rnd() - 0.5) * 70;
    var ca = Math.cos(ax), sa = Math.sin(ax), cz = Math.cos(az), sz = Math.sin(az), mint = ctx.light('c'), lightB = ctx.light('b');
    var lim = Math.ceil((R + tube) / v) + 1, shell = tube - v * 1.15, hang = [];
    for (var gx = -lim; gx <= lim; gx++) for (var gy = -lim; gy <= lim; gy++) for (var gz = -lim; gz <= lim; gz++) {
      var X = gx * v, Y = gy * v + oy, Z = gz * v, Yr = Y - oy;
      // undo the roll, then the tilt (the inverse of ctx.ring's turn)
      var x = X * cz + Yr * sz, y1 = -X * sz + Yr * cz, y = y1 * ca + Z * sa, z = -y1 * sa + Z * ca;
      var rho = Math.sqrt(x * x + z * z), dr = rho - R, dist = Math.sqrt(dr * dr + y * y);
      if (dist > tube || dist < shell || !inArt(X, Y)) continue;
      if (ctx.rnd() < 0.05) continue;
      // light from above and in front: the surface normal turned back into the card's space
      var nx = dr / dist * x / rho, ny = y / dist, nz = dr / dist * z / rho;
      var n1y = ny * ca - nz * sa, n1z = ny * sa + nz * ca, Ny = nx * sz + n1y * cz;
      var val = 0.36 + 0.3 * Ny + 0.16 * n1z + ctx.rnd() * 0.08;
      var c = ctx.rnd() < 0.015 ? mint : ctx.tone('a', Math.max(0.18, Math.min(1, val)));
      m.cube(X, Y, Z, v * 0.86, v * 0.86, v * 0.86, c);
      if (Ny < -0.6 && ctx.rnd() < 0.04) hang.push([X, Y - v, Z]);
    }
    hang.forEach(function (p) { m.quad(p[0], p[1], p[2], Math.PI, 1 + ctx.rnd() * 1.2, 40 + ctx.rnd() * 180, lightB, 0.1 + ctx.rnd() * 0.16, 'fade'); });
  });

  /* 29. Pixel crystal (backdrop): a tall faceted crystal of grey pixels far behind the mark, its
     middle facet standing forward, mint vertical streaks beside it. */
  A.register('s5-pixel-crystal', function (m, ctx) {
    // ox: the card rests turned a little (Art3D.REST), which slides anything this far back to the left;
    // the offset puts the crystal back behind the mark's centre at rest
    var v = 9, z0 = -200, ox = 46, Wd = 112 + ctx.rnd() * 26, top = 336, bot = -336, sh = 150 + ctx.rnd() * 40, wa = -90 - ctx.rnd() * 40, inner = 0.36;
    function half(y) { return y > sh ? Wd * (top - y) / (top - sh) : y > wa ? Wd : Wd * (y - bot) / (wa - bot); }
    for (var y = bot + v / 2; y < top; y += v) for (var x = -Wd; x <= Wd + 0.1; x += v) {
      var hw = half(y);
      if (Math.abs(x) > hw || hw < v * 0.5) continue;
      var u = x / hw, facet = u < -inner ? 0 : u > inner ? 2 : 1;
      var edge = Math.abs(x) > hw - v || Math.abs(Math.abs(x) - inner * hw) < v * 0.5 || Math.abs(y - sh) < v / 2 || Math.abs(y - wa) < v / 2;
      if (!edge && ctx.rnd() < 0.12) continue;
      var crown = y > sh ? 0.06 : y < wa ? -0.04 : 0;
      var val = edge ? 0.55 + ctx.rnd() * 0.25 : [0.16, 0.25, 0.1][facet] + crown + ctx.rnd() * 0.06;
      var depth = facet === 1 ? v * 2.6 : v * 1.2;
      m.cube(x + ox, y, z0 + depth / 2, v * 0.86, v * 0.86, depth, ctx.tone('a', val));
    }
    var mint = ctx.light('c'), n = 6 + Math.floor(ctx.rnd() * 4);
    for (var k = 0; k < n; k++) {
      var side = k % 2 ? 1 : -1, sx = Math.max(-236, Math.min(316, ox + side * (Wd + 16 + ctx.rnd() * 44))), len = 220 + ctx.rnd() * 320, y0 = -320 + ctx.rnd() * (620 - len);
      var bars = ctx.rnd() < 0.5;
      m.quad(sx, y0, z0 + 12, 0, bars ? 4 : 1.6 + ctx.rnd() * 1.4, len, mint, 0.3 + ctx.rnd() * 0.4, bars ? 'bars' : 'peak', Math.round(len / 10));
    }
    m.point(ox, sh, z0 + 30, 90, mint, 0.18, true);
  });

  /* 30. Plus grid (backdrop): a far dot grid with pixel plus signs on it, a mint plus at its centre
     and one more mint plus where it shows beside the mark. */
  A.register('s5-plus-grid', function (m, ctx) {
    var z = -230, step = 26, every = 4, mint = ctx.light('c'), spots = [];
    function plus(x, y, p, s, col, arm) {
      for (var a = -arm; a <= arm; a++) {
        m.cube(x + a * p, y, z, s, s, s, typeof col === 'function' ? col() : col);
        if (a) m.cube(x, y + a * p, z, s, s, s, typeof col === 'function' ? col() : col);
      }
    }
    var nodes = [];
    for (var i = -10; i <= 13; i++) for (var j = -13; j <= 13; j++) {
      var x = i * step, y = j * step;
      if (!inArt(x, y) || (i === 0 && j === 0)) continue;
      if (i % every === 0 && j % every === 0) {
        nodes.push([x, y]);
        if (Math.abs(x) > 215 || Math.abs(y) > 290) spots.push(nodes.length - 1);
      } else m.point(x, y, z, 2.2, ctx.tone('a', 0.85), 0.2 + ctx.rnd() * 0.3);
    }
    // the second mint plus sits on a node that shows beside the mark, picked before any is drawn
    var lit = spots.length ? spots[Math.floor(ctx.rnd() * spots.length)] : -1;
    nodes.forEach(function (p, k) {
      if (k === lit) { plus(p[0], p[1], 4.2, 3.6, mint, 2); m.point(p[0], p[1], z, 40, mint, 0.3, true); }
      else plus(p[0], p[1], 4.2, 3.4, function () { return ctx.tone('a', 0.5 + ctx.rnd() * 0.35); }, 2);
    });
    plus(0, 0, 6, 5, mint, 2);
    m.point(0, 0, z, 60, mint, 0.3, true);
  });
})();

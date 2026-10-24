/* DEFXN identity card: builders from reference sheet 20 (light, particles and flows: noise clouds of
   fine points, a flame of points rising from below, a nebula band, a barred spiral galaxy, bundles of
   falling light, neon bars, flow lines, a twisted bridge of light, a spiral ribbon, an X of light
   streaks, a star flare, a lens ring, a crystal flare, a drifting column of cubes and points, motion
   trails and coloured ribbon lanes). Each builder is named by an element file under
   layers/<NN-key>/sheet-20/. The space and the m / ctx calls are described at the top of art3d.js.
   Every random value comes from ctx.rnd(), so the same card always draws the same art.

   Colour: white parts use ctx.tone('a', v) or ctx.light('a'); the sheet's cyan and amber accents use
   ctx.light('b') and ctx.light('c'). An element with data-tint="a|b|c" takes its main colour from
   that slot, so one builder gives the white, the light and the glow version.

   Placement: the mark spans x -200..200 and y -273..273, and the art is seen in x -240..320,
   y -340..340. Dense clouds sit behind the mark (z < 0); in front go only fine points, thin streaks
   and small cubes, so the mark is never buried. Far shapes are placed by where they are SEEN
   (seenAt): the card's rest tilt carries a point 200 units behind about 80 units to the left. Every
   point that would land on the genesis ID or the serial is left out (ctx.clearAt). */
(function () {
  'use strict';
  var A = window.Art3D, TAU = Math.PI * 2, WHITE = [1, 1, 1];

  /* ---------- helpers ---------- */

  function gauss(rnd) { return rnd() + rnd() + rnd() - 1.5; }      // a bell curve, about -1.5..1.5
  function mix(p, q, t) { return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t]; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function smooth(e0, e1, v) { var t = clamp((v - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
  // the art-space x and y at depth z that the card shows at (xs, ys): the inverse of Art3D.seen
  function seenAt(xs, ys, z) {
    var x = xs, y = ys;
    for (var i = 0; i < 5; i++) { var p = A.seen(x, y, z); x += xs - p[0]; y += ys - p[1]; }
    return [x, y];
  }
  // true when a point is seen inside the art's box, `pad` units in
  function inView(x, y, z, pad) {
    var s = A.seen(x, y, z); pad = pad || 0;
    return s[0] > -240 + pad && s[0] < 320 - pad && s[1] > -340 + pad && s[1] < 340 - pad;
  }
  // seen inside the box and clear of the card's words
  function ok(ctx, x, y, z, pad) { return inView(x, y, z, 0) && ctx.clearAt(x, y, z, pad == null ? 6 : pad); }
  // a point given by where it is SEEN, kept only where it is ok: returns the art-space point or null
  function at(ctx, xs, ys, z, pad) {
    var p = seenAt(xs, ys, z);
    return ok(ctx, p[0], p[1], z, pad) ? [p[0], p[1], z] : null;
  }
  // the quad angle that points along (dx, dy): angle 0 points up, PI/2 points left
  function angleOf(dx, dy) { return Math.atan2(-dx, dy); }
  // how far a streak from (x, y, z) along (dx, dy) can run and stay seen and clear of the words
  function runOut(ctx, x, y, z, dx, dy, max, step) {
    var n = Math.hypot(dx, dy) || 1, s = 0; dx /= n; dy /= n; step = step || 8;
    while (s + step <= max && ok(ctx, x + dx * (s + step), y + dy * (s + step), z, 4)) s += step;
    return s;
  }
  // a soft glow with a hard core
  function glint(m, x, y, z, rgb, size, glow) {
    m.point(x, y, z, size, WHITE, 1);
    m.point(x, y, z, size * 1.8, rgb, 0.9);
    m.point(x, y, z, glow, rgb, 0.4, true);
  }
  // seeded value noise in 3D and its fractal sum (four octaves), about 0..1
  function noise(rnd) {
    var P = new Float32Array(1024);
    for (var i = 0; i < 1024; i++) P[i] = rnd();
    function h(i, j, k) { return P[((i * 73856093) ^ (j * 19349663) ^ (k * 83492791)) & 1023]; }
    function f(t) { return t * t * (3 - 2 * t); }
    function v(x, y, z) {
      var X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z), u = f(x - X), w = f(y - Y), s = f(z - Z);
      var a = h(X, Y, Z) + (h(X + 1, Y, Z) - h(X, Y, Z)) * u, b = h(X, Y + 1, Z) + (h(X + 1, Y + 1, Z) - h(X, Y + 1, Z)) * u;
      var c = h(X, Y, Z + 1) + (h(X + 1, Y, Z + 1) - h(X, Y, Z + 1)) * u, d = h(X, Y + 1, Z + 1) + (h(X + 1, Y + 1, Z + 1) - h(X, Y + 1, Z + 1)) * u;
      var e = a + (b - a) * w, g = c + (d - c) * w;
      return e + (g - e) * s;
    }
    return function (x, y, z) { return (v(x, y, z) * 0.5 + v(x * 2.03, y * 2.03, z * 2.03) * 0.25 + v(x * 4.1, y * 4.1, z * 4.1) * 0.15 + v(x * 8.3, y * 8.3, z * 8.3) * 0.1); };
  }
  // a flat circle (in the x-z plane) tilted up by ax and rolled by az, as art3d.js's ring()
  function tilt(x, y, z, ax, az) {
    var ca = Math.cos(ax), sa = Math.sin(ax), y1 = y * ca - z * sa, z1 = y * sa + z * ca, cz = Math.cos(az), sz = Math.sin(az);
    return [x * cz - y1 * sz, x * sz + y1 * cz, z1];
  }
  // the main and the second colour of an element with data-tint
  function tinted(ctx, def) {
    var slot = ctx.P.tint || def || 'a';
    if (slot === 'a') return { main: ctx.tone('a', 0.95), alt: ctx.light('b'), spark: ctx.light('c') };
    return { main: ctx.light(slot), alt: ctx.tone('a', 0.95), spark: slot === 'c' ? ctx.light('b') : ctx.light('c') };
  }

  /* ================= 01-backdrop: far behind the mark ================= */

  // particle clouds: two soft puffs of fine points far behind, a large one and a small one. Each is
  // densest and brightest at its heart and breaks up toward its edge, where a noise field bends its
  // outline and pulls it into wisps; a fine haze of soft points and a soft glow where it is dense,
  // and a few bright sparks in it
  A.register('s20-cloud', function (m, ctx) {
    var T = tinted(ctx, 'a'), fbm = noise(ctx.rnd), z0 = -180, side = ctx.rnd() < 0.5 ? 1 : -1, k;
    var puffs = [
      { x: 120 + ctx.rnd() * 90, y: side * (40 + ctx.rnd() * 110), r: 165 + ctx.rnd() * 40, n: 2500, h: 260, s: 7 },
      { x: -70 + ctx.rnd() * 120, y: -side * (150 + ctx.rnd() * 90), r: 100 + ctx.rnd() * 30, n: 900, h: 110, s: 4 }
    ];
    puffs.forEach(function (pf, pi) {
      var f = 2.4 / pf.r, dense = [], got = 0, tries = 0;
      function density(x, y) {
        var nx = (x - pf.x) / pf.r, ny = (y - pf.y) / pf.r, w = fbm(x * f + pi * 9, y * f + 3, 0.5);
        var d = Math.sqrt(nx * nx + ny * ny) * (0.6 + 0.8 * w), detail = smooth(0.32, 0.66, fbm(x * f * 2.2 + 7, y * f * 2.2 + 1, 2.5 + pi));
        return Math.exp(-d * d * 2.6) * (0.3 + 0.7 * detail);
      }
      while (got < pf.n && tries < 40000) {
        tries++;
        var xs = pf.x + (ctx.rnd() * 2 - 1) * pf.r * 1.4, ys = pf.y + (ctx.rnd() * 2 - 1) * pf.r * 1.4, d = density(xs, ys);
        if (ctx.rnd() > d) continue;
        var z = z0 + gauss(ctx.rnd) * pf.r * 0.4, p = at(ctx, xs, ys, z, 8);
        if (!p) continue;
        got++;
        m.point(p[0], p[1], p[2], 0.9 + ctx.rnd() * 1.3, ctx.rnd() < 0.12 ? T.alt : T.main, Math.min(1, (0.28 + 0.8 * d) * (0.5 + 0.5 * ctx.rnd())));
        if (d > 0.45 && dense.length < 300) dense.push(p);
      }
      for (k = 0; k < pf.h && dense.length; k++) {
        var q = dense[Math.floor(ctx.rnd() * dense.length)];
        m.point(q[0] + gauss(ctx.rnd) * 10, q[1] + gauss(ctx.rnd) * 10, q[2] - 4, 6 + ctx.rnd() * 9, ctx.rnd() < 0.75 ? T.main : T.alt, 0.045 + 0.03 * ctx.rnd(), true);
      }
      var c = at(ctx, pf.x, pf.y, z0, 20);
      if (c) m.point(c[0], c[1], c[2] - 6, pf.r * 1.8, T.main, 0.15, true);
      for (k = 0; k < pf.s && dense.length; k++) {
        var sp = dense[Math.floor(ctx.rnd() * dense.length)], big = k === 0;
        glint(m, sp[0], sp[1], sp[2] + 2, ctx.rnd() < 0.5 ? T.spark : T.main, big ? 3.2 : 1.8 + ctx.rnd(), big ? 34 : 12 + ctx.rnd() * 10);
        if (big) [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach(function (a) { m.quad(sp[0], sp[1], sp[2] + 2, a, 1, 16 + ctx.rnd() * 14, T.main, 0.7, 'fade'); });
      }
    });
  });

  // a nebula band: a long diagonal band of glowing points far behind, split along its length by a
  // dark lane, gathered into clumps, with a soft glow along its spine and bright stars round it
  A.register('s20-nebula-band', function (m, ctx) {
    var ca = ctx.tone('a', 0.95), cb = ctx.light('b'), cc = ctx.light('c'), fbm = noise(ctx.rnd), z0 = -250;
    var up = ctx.rnd() < 0.5, P0 = [up ? -300 : 380, -400], P1 = [up ? 380 : -300, 400], dx = P1[0] - P0[0], dy = P1[1] - P0[1], L = Math.hypot(dx, dy);
    var nx = -dy / L, ny = dx / L, bow = (ctx.rnd() - 0.5) * 140, sig = 50 + ctx.rnd() * 22, ph = ctx.rnd() * TAU, lane = 0.6 + ctx.rnd() * 0.3;
    function spine(s) { var b = bow * Math.sin(Math.PI * s); return [P0[0] + dx * s + nx * b, P0[1] + dy * s + ny * b]; }
    var got = 0, tries = 0;
    while (got < 3400 && tries < 40000) {
      tries++;
      var s = ctx.rnd(), v = gauss(ctx.rnd) * 1.3, w = sig * (0.75 + 0.6 * fbm(s * 3, 1.5, 0.5));
      var off = sig * 0.22 * Math.sin(s * 9 + ph), dust = 1 - lane * Math.exp(-Math.pow((v * w - off) / (sig * 0.16), 2));
      var clump = fbm(s * 7 + 2, v * 0.8, 3.7), keep = dust * (0.2 + 0.8 * smooth(0.36, 0.66, clump));
      if (ctx.rnd() > keep) continue;
      var c = spine(s), p = at(ctx, c[0] + nx * v * w, c[1] + ny * v * w, z0 + gauss(ctx.rnd) * 50, 8);
      if (!p) continue;
      got++;
      var core = Math.exp(-v * v * 1.2), r = ctx.rnd(), col = core > 0.5 ? (r < 0.5 ? ca : r < 0.78 ? cb : cc) : (r < 0.82 ? ca : cb);
      m.point(p[0], p[1], p[2], 0.9 + ctx.rnd() * 1.3 + (ctx.rnd() < 0.03 ? 1.4 : 0), col, (0.16 + 0.7 * core) * (0.45 + 0.55 * ctx.rnd()));
    }
    for (var g = 0; g < 70; g++) {
      var t = ctx.rnd(), sc = spine(t), h = at(ctx, sc[0] + nx * gauss(ctx.rnd) * sig * 0.6, sc[1] + ny * gauss(ctx.rnd) * sig * 0.6, z0, 20);
      if (h) m.point(h[0], h[1], h[2], 40 + ctx.rnd() * 60, ctx.rnd() < 0.5 ? cb : cc, 0.025 + ctx.rnd() * 0.03, true);
    }
    for (var k = 0; k < 26; k++) {
      var ts = ctx.rnd(), st = spine(ts), far = gauss(ctx.rnd) * sig * 3, q = at(ctx, st[0] + nx * far, st[1] + ny * far, z0 + 20, 10);
      if (!q) continue;
      var hot = k < 4;
      glint(m, q[0], q[1], q[2], k % 3 ? cb : ca, hot ? 2.8 : 1.5 + ctx.rnd(), hot ? 26 : 10 + ctx.rnd() * 8);
      if (hot) [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach(function (a) { m.quad(q[0], q[1], q[2], a, 0.9, 12 + ctx.rnd() * 10, ca, 0.6, 'fade'); });
    }
  });

  // a barred spiral galaxy seen at an angle, far behind the mark: a bright bar through a glowing
  // core, a faint ring round the bar, and two tight arms winding out from the bar's ends, with knots
  // of accent light along them and a thin haze of the disc between
  A.register('s20-barred-galaxy', function (m, ctx) {
    var ca = ctx.tone('a', 0.95), cb = ctx.light('b'), cc = ctx.light('c'), z0 = -230, o = seenAt(36 + (ctx.rnd() - 0.5) * 40, 6 + (ctx.rnd() - 0.5) * 40, z0);
    var inc = 0.78 + ctx.rnd() * 0.22, roll = (ctx.rnd() < 0.5 ? 1 : -1) * (0.3 + ctx.rnd() * 0.35), barA = ctx.rnd() * TAU, barL = 100 + ctx.rnd() * 22, pitch = 0.17 + ctx.rnd() * 0.04;
    var hand = ctx.rnd() < 0.5 ? 1 : -1, Rmax = 390, thMax = Math.log(Rmax / barL) / pitch;
    var cI = Math.cos(inc), sI = Math.sin(inc), cR = Math.cos(roll), sR = Math.sin(roll), cB = Math.cos(barA), sB = Math.sin(barA);
    function put(u, v, h, size, col, a, soft) {
      var x = u * cB - v * sB, y = u * sB + v * cB, y1 = y * cI - h * sI, z1 = y * sI + h * cI;
      var X = o[0] + x * cR - y1 * sR, Y = o[1] + x * sR + y1 * cR, Z = z0 + z1;
      if (ok(ctx, X, Y, Z, 8)) m.point(X, Y, Z, size, col, a, soft);
    }
    var i;
    for (i = 0; i < 620; i++) {                                  // the bar
      var bu = (ctx.rnd() * 2 - 1) * barL * Math.sqrt(ctx.rnd()), bv = gauss(ctx.rnd) * 14 * (1 - 0.6 * Math.abs(bu) / barL), e = Math.exp(-Math.pow(bu / barL, 2) * 1.2);
      put(bu, bv, gauss(ctx.rnd) * 6, 1.1 + ctx.rnd() * 1.4, ctx.rnd() < 0.5 ? cc : ca, 0.45 + 0.55 * e);
    }
    for (i = 0; i < 260; i++) {                                  // the bulge
      var br = Math.abs(gauss(ctx.rnd)) * 24, bt = ctx.rnd() * TAU;
      put(br * Math.cos(bt), br * Math.sin(bt), gauss(ctx.rnd) * 14, 1.1 + ctx.rnd() * 1.2, ctx.rnd() < 0.6 ? ca : cc, 0.55 + 0.4 * ctx.rnd());
    }
    for (i = 0; i < 230; i++) {                                  // the inner ring round the bar
      var rt = ctx.rnd() * TAU, rr = barL * 1.08 + gauss(ctx.rnd) * 5;
      put(rr * Math.cos(rt), rr * Math.sin(rt) * 0.82, gauss(ctx.rnd) * 3, 0.9 + ctx.rnd(), ca, 0.2 + 0.35 * ctx.rnd());
    }
    var knots = [];
    [0, Math.PI].forEach(function (arm) {                        // two arms from the bar's ends
      for (var j = 0; j < 1150; j++) {
        var th = ctx.rnd() * thMax, r = barL * Math.exp(pitch * th), phi = arm + hand * th, sp = 4 + 0.07 * r, w = gauss(ctx.rnd) * sp;
        var u = r * Math.cos(phi) - w * Math.sin(phi), v = r * Math.sin(phi) + w * Math.cos(phi), fade = 1 - th / thMax;
        put(u, v, gauss(ctx.rnd) * 5, 1 + ctx.rnd() * 1.4, ctx.rnd() < 0.22 ? cb : ca, (0.28 + 0.6 * fade) * (0.5 + 0.5 * ctx.rnd()));
      }
      for (var n = 0; n < 7; n++) { var kt = (0.12 + ctx.rnd() * 0.8) * thMax, kr = barL * Math.exp(pitch * kt), kp = arm + hand * kt; knots.push([kr * Math.cos(kp), kr * Math.sin(kp)]); }
    });
    knots.forEach(function (k, j) {
      var col = j % 3 ? cb : cc;
      for (var q = 0; q < 12; q++) put(k[0] + gauss(ctx.rnd) * 6, k[1] + gauss(ctx.rnd) * 6, gauss(ctx.rnd) * 3, 1.2 + ctx.rnd() * 1.2, col, 0.6 + 0.4 * ctx.rnd());
      put(k[0], k[1], 0, 16 + ctx.rnd() * 10, col, 0.22, true);
    });
    for (i = 0; i < 340; i++) {                                  // the disc's haze
      var hr = barL * 0.6 + Math.abs(gauss(ctx.rnd)) * 170, ht = ctx.rnd() * TAU;
      put(hr * Math.cos(ht), hr * Math.sin(ht), gauss(ctx.rnd) * 8, 0.8 + ctx.rnd() * 0.8, ca, 0.08 + 0.18 * ctx.rnd());
    }
    for (i = -3; i <= 3; i++) put(i * barL * 0.3, 0, 0, 50 - Math.abs(i) * 8, cc, 0.14, true);
    put(0, 0, 0, 150, cc, 0.3, true); put(0, 0, 0, 44, ca, 0.7, true); put(0, 0, 0, 7, WHITE, 1);
  });

  // a bridge of light: a broad band of parallel dotted strands that spans the art from one side to
  // the other on a shallow arch behind the mark, turning half a turn on the way, so it shows its face
  // at both ends and its edge in the middle. Its edges are brighter, and a pier of light stands at
  // each end
  A.register('s20-bridge', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), z0 = -170, K = 18 + Math.floor(ctx.rnd() * 6), Wd = 120 + ctx.rnd() * 50;
    var yL = -150 + ctx.rnd() * 260, yR = -150 + ctx.rnd() * 260, arch = (ctx.rnd() < 0.7 ? 1 : -1) * (70 + ctx.rnd() * 90), th0 = (ctx.rnd() - 0.5) * 0.6, turn = Math.PI * (0.85 + ctx.rnd() * 0.3);
    var xL = -228, xR = 306;
    for (var k = 0; k < K; k++) {
      var o = (k / (K - 1)) * 2 - 1, edge = Math.abs(o) > 0.9;
      for (var x = xL; x <= xR; x += 4.6) {
        var u = (x - xL) / (xR - xL), th = th0 + turn * u, yc = yL + (yR - yL) * u + arch * Math.sin(Math.PI * u);
        var y = yc + o * Wd * 0.5 * Math.cos(th), z = z0 + o * Wd * 0.75 * Math.sin(th), p = at(ctx, x, y, z, 8);
        if (!p) continue;
        var face = 0.35 + 0.65 * Math.abs(Math.cos(th)), endFade = smooth(0, 0.08, u) * smooth(1, 0.92, u);
        m.point(p[0], p[1], p[2], edge ? 2 : 1.3 + ctx.rnd() * 0.6, edge ? cb : (ctx.rnd() < 0.04 ? cc : ca), (edge ? 0.9 : 0.24 + 0.42 * face) * (0.55 + 0.45 * endFade));
      }
    }
    [[xL, yL], [xR, yR]].forEach(function (e) {                // the piers
      var c = at(ctx, e[0], e[1], z0, 6);
      if (!c) return;
      [1, -1].forEach(function (d) {
        var L = runOut(ctx, c[0], c[1], z0, 0, d, Wd * 1.1, 4);
        if (L > 10) { m.quad(c[0], c[1], z0, d > 0 ? 0 : Math.PI, 2, L, ca, 0.8, 'fade'); m.quad(c[0], c[1], z0 - 1, d > 0 ? 0 : Math.PI, 16, L * 0.7, cb, 0.12, 'fade'); }
      });
      m.point(c[0], c[1], c[2], 120, cb, 0.2, true); glint(m, c[0], c[1], c[2], cc, 3.6, 32);
    });
  });

  /* ================= 05-signal: light ================= */

  // a flame of points rising from below behind the mark: a teardrop body with a hot white core at
  // its root, splitting higher up into five to seven tongues that curl and thin to their tips, the
  // tips in the other accent, a glow at its root and embers rising off the tips
  A.register('s20-flame', function (m, ctx) {
    var T = tinted(ctx, 'c'), hot = ctx.tone('a', 1), fbm = noise(ctx.rnd), z0 = -90, base = seenAt(26 + (ctx.rnd() - 0.5) * 50, -330, z0);
    var H = 610 + ctx.rnd() * 60, Wd = 270 + ctx.rnd() * 70, ph1 = ctx.rnd() * TAU, ph2 = ctx.rnd() * TAU, sw = 16 + ctx.rnd() * 18, split = 0.3;
    function centre(t) { return base[0] + t * (sw * Math.sin(t * 4.2 + ph1) + 8 * Math.sin(t * 10 + ph2)); }
    function half(t) { return Wd * 0.5 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.2 + t * 0.92)), 0.8) * Math.pow(1 - t, 0.3); }
    var nt = 5 + Math.floor(ctx.rnd() * 3), tongues = [], k;
    for (k = 0; k < nt; k++) {
      var pos = (k / (nt - 1) * 2 - 1) * 0.78 + (ctx.rnd() - 0.5) * 0.12;
      tongues.push({ pos: pos, top: Math.min(1, 1.02 - 0.5 * Math.abs(pos) - ctx.rnd() * 0.16), w: 0.2 + ctx.rnd() * 0.1, curl: (ctx.rnd() < 0.5 ? -1 : 1) * (10 + ctx.rnd() * 22), ph: ctx.rnd() * TAU });
    }
    var got = 0, tries = 0, tips = [], hs = half(split);
    while (got < 3700 && tries < 40000) {
      tries++;
      var t = Math.pow(ctx.rnd(), 1.05), x, z, s = 0, inner = false;
      if (t < split + 0.04) {                                    // the body
        var u = gauss(ctx.rnd) * 1.15;
        if (Math.abs(u) > 1.2) continue;
        var n = fbm(u * 1.4 + 4, t * 3, 1.3);
        if (ctx.rnd() > 0.35 + 0.65 * smooth(0.3, 0.6, n)) continue;
        x = centre(t) + u * half(t); z = z0 + gauss(ctx.rnd) * half(t) * 0.5; inner = Math.abs(u) < 0.45;
      } else {                                                   // a tongue
        var tg = tongues[Math.floor(ctx.rnd() * nt)];
        if (t > tg.top) continue;
        s = (t - split) / (tg.top - split);
        var w = hs * tg.w * Math.pow(1 - s, 0.9) + 2, cx = centre(t) + tg.pos * hs * (1 - 0.3 * s) + tg.curl * s * Math.sin(s * 4 + tg.ph);
        x = cx + gauss(ctx.rnd) * w; z = z0 + gauss(ctx.rnd) * w * 0.8;
      }
      var y = -345 + t * H;
      if (!ok(ctx, x, y, z, 6)) continue;
      got++;
      var col = inner ? mix(hot, T.main, smooth(0, split, t)) : s > 0.45 ? mix(T.main, T.spark, smooth(0.45, 0.95, s)) : T.main;
      m.point(x, y, z, 1 + ctx.rnd() * 1.2 + (inner ? 0.5 : 0), col, (0.3 + 0.6 * (1 - Math.max(t, s) * 0.8)) * (0.5 + 0.5 * ctx.rnd()));
      if (s > 0.8 && tips.length < 80) tips.push([x, y, z]);
    }
    var root = [centre(0.06), -345 + 0.06 * H, z0], body = [centre(0.2), -345 + 0.2 * H, z0];
    if (ok(ctx, root[0], root[1], root[2], 10)) { m.point(root[0], root[1], root[2], 240, T.main, 0.24, true); m.point(root[0], root[1], root[2], 80, hot, 0.3, true); }
    if (ok(ctx, body[0], body[1], body[2], 10)) m.point(body[0], body[1], body[2], half(0.2) * 2.6, T.main, 0.12, true);
    for (var e = 0; e < 40 && tips.length; e++) {                // embers rising off the tips
      var tp = tips[Math.floor(ctx.rnd() * tips.length)], ex = tp[0] + gauss(ctx.rnd) * 36, ey = tp[1] + 16 + ctx.rnd() * 110, ez = tp[2];
      if (!ok(ctx, ex, ey, ez, 6)) continue;
      var ec = ctx.rnd() < 0.5 ? T.spark : T.main;
      m.point(ex, ey, ez, 1.6 + ctx.rnd() * 1.4, ec, 0.9);
      m.quad(ex, ey, ez, Math.PI, 0.9, 6 + ctx.rnd() * 14, ec, 0.5, 'fade');
    }
  });

  // light falls: bundles of thin light bars hanging from the top of the art. The bars of a bundle
  // differ in length by a shape of their own (a ramp, a V or a ragged edge); a bright drip at the end
  // of every bar and a loose drop falling below some of them
  A.register('s20-falls', function (m, ctx) {
    var cols = [ctx.tone('a', 0.97), ctx.tone('a', 0.97), ctx.light('b'), ctx.light('c')], nb = 5 + Math.floor(ctx.rnd() * 3), xs = [], k;
    for (k = 0; k < 60 && xs.length < nb; k++) {
      var c = -226 + ctx.rnd() * 530;
      if (xs.every(function (v) { return Math.abs(v - c) > 56; })) xs.push(c);
    }
    xs.forEach(function (sx, b) {
      var z = -70 + ctx.rnd() * 120, n = 7 + Math.floor(ctx.rnd() * 8), gap = 2.8 + ctx.rnd() * 1.4, col = cols[b % cols.length], Lb = 200 + ctx.rnd() * 330, ph = ctx.rnd() * TAU;
      var bx = seenAt(sx, 0, z)[0], top = 338, prof = Math.floor(ctx.rnd() * 3), flip = ctx.rnd() < 0.5;
      function shape(i) {
        var f = n > 1 ? i / (n - 1) : 0.5;
        if (flip) f = 1 - f;
        return prof === 0 ? 0.3 + 0.7 * f : prof === 1 ? 0.3 + 0.7 * (1 - Math.abs(2 * f - 1)) : 0.3 + 0.7 * Math.abs(Math.sin(i * 1.27 + ph));
      }
      while (top > 0 && !ok(ctx, bx, top, z, 8)) top -= 6;
      if (top <= 40) return;
      for (var i = 0; i < n; i++) {
        var x = bx + (i - (n - 1) / 2) * gap, L = Lb * shape(i) * (0.92 + 0.16 * ctx.rnd()), end = top - L;
        while (end < top - 20 && !ok(ctx, x, end - 30, z, 8)) end += 6;
        L = top - end;
        if (L < 24) continue;
        var w = 0.9 + ctx.rnd() * 0.8, a = 0.4 + ctx.rnd() * 0.4, lit = ctx.rnd() < 0.18 ? cols[3 - (b % 2)] : col;
        m.quad(x, end, z, 0, w, L, lit, a, 'fade');                        // bright at the drip, fading up
        m.quad(x, end, z - 0.5, 0, w * 0.8, L, lit, 0.1 + 0.08 * ctx.rnd(), 'peak');   // the faint run to the top
        m.point(x, end, z, 2.6 + ctx.rnd() * 1.2, lit, 1);
        m.point(x, end, z, 12 + ctx.rnd() * 8, lit, 0.32, true);
        if (ctx.rnd() < 0.55) {
          var d1 = end - 10 - ctx.rnd() * 26;
          if (ok(ctx, x, d1, z, 6)) m.point(x, d1, z, 1.8 + ctx.rnd() * 0.8, lit, 0.85);
          if (ctx.rnd() < 0.4 && ok(ctx, x, d1 - 14 - ctx.rnd() * 20, z, 6)) m.point(x, d1 - 14 - ctx.rnd() * 20, z, 1.2, lit, 0.6);
        }
      }
    });
  });

  // neon bars: three or four tall bars of light standing apart, each in its own colour (white, the
  // light, the glow and a pale tint of the light), each a bright core in a soft glow, with lit caps
  A.register('s20-neon-bars', function (m, ctx) {
    var cols = [ctx.tone('a', 1), ctx.light('b'), ctx.light('c'), mix(ctx.light('b'), WHITE, 0.5)];
    for (var s = cols.length - 1; s > 0; s--) { var j = Math.floor(ctx.rnd() * (s + 1)), t = cols[s]; cols[s] = cols[j]; cols[j] = t; }
    var spots = [[-120 + (ctx.rnd() - 0.5) * 40, -170, -330, 330], [76 + (ctx.rnd() - 0.5) * 40, -170, -330, 330], [236 + ctx.rnd() * 10, 40, -240, 220], [292, -50, -240, 220]];
    if (ctx.rnd() < 0.35) spots.splice(1 + Math.floor(ctx.rnd() * 3), 1);
    spots.forEach(function (sp, i) {
      var col = cols[i], z = sp[1], x = seenAt(sp[0], 0, z)[0], span = sp[3] - sp[2], h = span * (0.62 + ctx.rnd() * 0.36), yb = sp[2] + ctx.rnd() * (span - h), yt = yb + h;
      while (yt > yb + 60 && !ok(ctx, x, yt, z, 8)) yt -= 6;
      while (yb < yt - 60 && !ok(ctx, x, yb, z, 8)) yb += 6;
      h = yt - yb;
      if (h < 80) return;
      m.bar(x, (yb + yt) / 2, z, 3.4, h, 3.4, col, 0.9);
      m.quad(x, yb, z - 1, 0, 1.4, h, WHITE, 0.5, 'peak');
      for (var y = yb + 6; y < yt - 4; y += 10) m.point(x, y, z - 2, 26, col, 0.05, true);
      for (var y2 = yb + 20; y2 < yt - 10; y2 += 34) m.point(x, y2, z - 3, 90, col, 0.018, true);
      [yb, yt].forEach(function (yy) {
        m.point(x, yy, z, 5, col, 1); m.point(x, yy, z, 2.6, WHITE, 1); m.point(x, yy, z, 30, col, 0.35, true);
        m.quad(x, yy, z, Math.PI / 2, 0.9, 16, col, 0.6, 'fade'); m.quad(x, yy, z, -Math.PI / 2, 0.9, 16, col, 0.6, 'fade');
      });
    });
  });

  // flow lines: a bundle of smooth dotted curves flowing left to right behind the mark, gathered
  // through a narrow throat and fanning out on both sides, on one long wave; the dots grow brighter
  // in the flow's direction, and a few lines end in a bright head with a packet of light on them
  A.register('s20-flow', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), K = 14 + Math.floor(ctx.rnd() * 6), z0 = -110;
    var yc = (ctx.rnd() - 0.5) * 140, amp = 50 + ctx.rnd() * 60, fr = TAU / (560 + ctx.rnd() * 300), ph = ctx.rnd() * TAU, neck = -40 + ctx.rnd() * 150;
    var inW = 300 + ctx.rnd() * 140, outW = 380 + ctx.rnd() * 160, mid = (K - 1) / 2;
    for (var k = 0; k < K; k++) {
      var o = (k - mid) / mid, wob = ctx.rnd() * TAU, z = z0 + o * 26, line = [], heads = ctx.rnd() < 0.4, pk = 0.2 + ctx.rnd() * 0.7;
      var col = Math.abs(o) < 0.12 ? cb : ca;
      for (var x = -250; x <= 330; x += 4.4) {
        var d = x - neck, spread = d < 0 ? inW * Math.pow(Math.min(1, -d / 300), 1.5) : outW * Math.pow(Math.min(1, d / 330), 1.4);
        var y = yc + amp * Math.sin(fr * x + ph) + o * (8 + spread * 0.5) + 5 * Math.sin(x * 0.021 + wob), p = at(ctx, x, y, z, 6);
        if (!p) { line = []; continue; }
        var u = (x + 250) / 580, a = (0.3 + 0.55 * Math.pow(u, 1.1)) * (1 - 0.4 * Math.abs(o));
        var pulse = Math.exp(-Math.pow((u - pk) / 0.018, 2));
        m.point(p[0], p[1], p[2], 1.3 + 0.9 * u + 1.6 * pulse, pulse > 0.3 ? cc : col, Math.min(1, a + pulse * 0.8));
        line.push(p);
      }
      if (heads && line.length > 2) { var h = line[line.length - 1]; glint(m, h[0], h[1], h[2], cc, 2.6, 20); }
    }
    var n = at(ctx, neck, yc + amp * Math.sin(fr * neck + ph), z0, 10);
    if (n) m.point(n[0], n[1], n[2], 120, cb, 0.14, true);
  });

  // split: a large X of light streaks crossing behind the mark. Each arm is a sheaf of thin streaks
  // of many lengths round one bright core streak, in a faint wide glow; a glare where they cross.
  // data-tint picks the colour: a (white), b (the light) or c (the glow)
  A.register('s20-split', function (m, ctx) {
    var T = tinted(ctx, 'a'), z = -90, o = seenAt(40 + (ctx.rnd() - 0.5) * 40, (ctx.rnd() - 0.5) * 50, z), lean = 0.52 + ctx.rnd() * 0.22, skew = (ctx.rnd() - 0.5) * 0.16;
    [lean + skew, -lean + skew].forEach(function (a) {
      var d = [Math.sin(a), Math.cos(a)], nr = [d[1], -d[0]], n = 18 + Math.floor(ctx.rnd() * 8);
      var fwd = runOut(ctx, o[0], o[1], z, d[0], d[1], 520), back = runOut(ctx, o[0], o[1], z, -d[0], -d[1], 520), ang = angleOf(d[0], d[1]);
      m.quad(o[0] - d[0] * back, o[1] - d[1] * back, z, ang, 2.4, back + fwd, T.main, 0.95, 'peak');
      m.quad(o[0] - d[0] * back, o[1] - d[1] * back, z - 1, ang, 28, back + fwd, T.main, 0.07, 'peak');
      for (var i = 0; i < n; i++) {
        var off = gauss(ctx.rnd) * 24, s0 = -back * (0.25 + 0.75 * ctx.rnd()), s1 = fwd * (0.25 + 0.75 * ctx.rnd()), x0 = o[0] + nr[0] * off + d[0] * s0, y0 = o[1] + nr[1] * off + d[1] * s0;
        var b0 = runOut(ctx, x0, y0, z, d[0], d[1], s1 - s0);
        if (b0 < 40 || !ok(ctx, x0, y0, z, 4)) continue;
        m.quad(x0, y0, z + 0.5, ang, 0.7 + ctx.rnd() * 1.3, b0, ctx.rnd() < 0.22 ? T.spark : T.main, 0.2 + ctx.rnd() * 0.5, 'peak');
      }
      for (var j = 0; j < 22; j++) {
        var s = (ctx.rnd() * 2 - 1) * Math.min(back, fwd) * 0.95, x = o[0] + d[0] * s + nr[0] * gauss(ctx.rnd) * 6, y = o[1] + d[1] * s + nr[1] * gauss(ctx.rnd) * 6;
        if (ok(ctx, x, y, z, 4)) m.point(x, y, z + 1, 1.4 + ctx.rnd() * 1.4, ctx.rnd() < 0.3 ? T.spark : T.main, 0.5 + 0.5 * ctx.rnd());
      }
    });
    m.point(o[0], o[1], z, 180, T.main, 0.3, true); m.point(o[0], o[1], z, 46, T.main, 0.8, true); m.point(o[0], o[1], z, 9, WHITE, 1, true);
  });

  // a star flare beside the mark: a four-pointed star with long thin rays running to the edges of
  // the art, four short rays between them, a soft bloom, a long faint horizontal streak, and ghosts
  // of the lens (soft discs and rings) along the line through the mark's centre
  A.register('s20-star-flare', function (m, ctx) {
    var cb = ctx.light('b'), cc = ctx.light('c'), ca = ctx.tone('a', 0.97), z = 60;
    var spots = [[70, 150], [-90, 110], [110, -120], [-60, -170], [20, 40], [130, 40]], sp = spots[Math.floor(ctx.rnd() * spots.length)];
    var c = seenAt(sp[0] + (ctx.rnd() - 0.5) * 30, sp[1] + (ctx.rnd() - 0.5) * 30, z), x = c[0], y = c[1];
    [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(function (d, i) {
      var L = runOut(ctx, x, y, z, d[0], d[1], i < 2 ? 340 : 300, 6), ang = angleOf(d[0], d[1]);
      if (L < 20) return;
      m.quad(x, y, z, ang, 2.2, L, ca, 1, 'fade');
      m.quad(x, y, z - 0.5, ang, 0.7, L, cb, 0.6, 'fade');
      m.quad(x, y, z - 1, ang, 10, L * 0.45, cb, 0.16, 'fade');
    });
    for (var q = 0; q < 4; q++) {
      var a = Math.PI / 4 + q * Math.PI / 2, dd = [-Math.sin(a), Math.cos(a)], l = runOut(ctx, x, y, z, dd[0], dd[1], 46 + ctx.rnd() * 30, 4);
      if (l > 10) m.quad(x, y, z, a, 1.1, l, cb, 0.55, 'fade');
    }
    [1, -1].forEach(function (s) { var l2 = runOut(ctx, x, y, z, s, 0, 280, 8); if (l2 > 20) m.quad(x, y + 0.5, z - 2, -s * Math.PI / 2, 3.2, l2, cc, 0.16, 'fade'); });
    m.point(x, y, z, 170, cc, 0.32, true); m.point(x, y, z, 52, cb, 0.9, true); m.point(x, y, z, 16, WHITE, 1, true); m.point(x, y, z, 5, WHITE, 1);
    [0.5, 0.85, 1.3, 1.62].forEach(function (k, i) {
      var gx = x - x * k, gy = y - y * k, gz = z;
      if (!ok(ctx, gx, gy, gz, 20)) return;
      var col = i % 2 ? cc : cb, r = 10 + ctx.rnd() * 22;
      if (i % 2) { var ring = []; for (var t = 0; t < 48; t++) ring.push(gx + r * Math.cos(t / 48 * TAU), gy + r * Math.sin(t / 48 * TAU), gz); m.line(ring, col, 0.28, true); m.point(gx, gy, gz, r * 2.2, col, 0.06, true); }
      else { m.point(gx, gy, gz, r * 2.4, col, 0.12, true); m.point(gx, gy, gz, r * 0.7, col, 0.18, true); }
    });
  });

  // a lens ring: a soft ring of light facing the viewer behind the mark, brighter on one side as if
  // lit from there, with a thin bright rim, a fringe of the light inside it and of the glow outside
  // it, fine points scattered round it and two bright knots on it
  A.register('s20-lens-ring', function (m, ctx) {
    var ca = ctx.tone('a', 0.97), cb = ctx.light('b'), cc = ctx.light('c'), z = -100, R = 236 + ctx.rnd() * 30, o = seenAt(34, (ctx.rnd() - 0.5) * 40, z), th0 = ctx.rnd() * TAU;
    function lit(t) { return 0.3 + 0.7 * Math.pow(0.5 + 0.5 * Math.cos(t - th0), 1.6); }
    function P(r, t) { return [o[0] + r * Math.cos(t), o[1] + r * Math.sin(t), z]; }
    var segs = 72, i;
    [[R, ca, 0.75], [R - 5, cb, 0.45], [R + 6, cc, 0.32]].forEach(function (rim) {
      for (var s = 0; s < segs; s++) {
        var run = [];
        for (var j = 0; j <= 4; j++) { var p = P(rim[0], (s + j / 4) / segs * TAU); if (ok(ctx, p[0], p[1], z, 6)) run.push(p[0], p[1], p[2]); }
        if (run.length >= 6) m.line(run, rim[1], rim[2] * lit((s + 0.5) / segs * TAU));
      }
    });
    for (i = 0; i < 260; i++) {
      var t = i / 260 * TAU, p1 = P(R + gauss(ctx.rnd) * 4, t);
      if (ok(ctx, p1[0], p1[1], z, 10)) m.point(p1[0], p1[1], z - 1, 26 + ctx.rnd() * 12, i % 3 ? cb : ca, 0.085 * lit(t), true);
    }
    for (i = 0; i < 90; i++) {
      var t2 = i / 90 * TAU, p2 = P(R, t2);
      if (ok(ctx, p2[0], p2[1], z, 20)) m.point(p2[0], p2[1], z - 2, 80 + ctx.rnd() * 24, cc, 0.035 * lit(t2), true);
    }
    for (i = 0; i < 1100; i++) {
      var t3 = ctx.rnd() * TAU, rr = R + gauss(ctx.rnd) * (ctx.rnd() < 0.8 ? 10 : 34), p3 = P(rr, t3);
      if (ok(ctx, p3[0], p3[1], z, 6)) m.point(p3[0], p3[1], z, 0.9 + ctx.rnd() * 1.1, ctx.rnd() < 0.25 ? cb : ca, (0.15 + 0.6 * ctx.rnd()) * lit(t3));
    }
    [th0, th0 + Math.PI * (0.7 + ctx.rnd() * 0.5)].forEach(function (t, k) {
      var p = P(R, t);
      if (!ok(ctx, p[0], p[1], z, 10)) return;
      glint(m, p[0], p[1], z + 1, k ? cc : cb, k ? 2.6 : 3.6, k ? 22 : 40);
      if (!k) [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach(function (a) { m.quad(p[0], p[1], z + 1, a, 1, 26 + ctx.rnd() * 20, ca, 0.7, 'fade'); });
    });
  });

  // a crystal flare: a tall diamond of light behind the mark (an outline, two nested outlines and
  // facets to its corners) on a bright vertical axis, with long rays running on from its top and
  // bottom points, fans of short rays round them, rays from its side points and a glare at its heart
  A.register('s20-crystal-flare', function (m, ctx) {
    var ca = ctx.tone('a', 0.97), cb = ctx.light('b'), cc = ctx.light('c'), z = -50, c = seenAt(24, (ctx.rnd() - 0.5) * 30, z);
    var H = 292 + ctx.rnd() * 30, Wd = 92 + ctx.rnd() * 34, cx = c[0], cy = c[1];
    function V(s) { return [[cx, cy + H * s, z], [cx + Wd * s, cy, z], [cx, cy - H * s, z], [cx - Wd * s, cy, z]]; }
    function draw(pts, col, a) {                                 // a closed outline, broken where it is not ok
      for (var e = 0; e < 4; e++) {
        var p = pts[e], q = pts[(e + 1) % 4], run = [];
        for (var j = 0; j <= 24; j++) {
          var t = j / 24, x = p[0] + (q[0] - p[0]) * t, y = p[1] + (q[1] - p[1]) * t;
          if (ok(ctx, x, y, z, 6)) run.push(x, y, z); else { if (run.length >= 6) m.line(run, col, a); run = []; }
        }
        if (run.length >= 6) m.line(run, col, a);
      }
    }
    var outer = V(1);
    draw(outer, ca, 0.8); draw(V(0.72), cb, 0.45); draw(V(0.44), cb, 0.3);
    outer.forEach(function (p) { m.line([cx, cy, z, p[0], p[1], p[2]], cb, 0.2); });
    m.quad(cx, cy - H, z, 0, 2.2, 2 * H, ca, 0.9, 'peak'); m.quad(cx, cy - H, z - 1, 0, 30, 2 * H, cb, 0.1, 'peak');
    [[0, 1], [0, -1]].forEach(function (d) {
      var tip = [cx, cy + d[1] * H], L = runOut(ctx, tip[0], tip[1], z, 0, d[1], 140, 4);
      if (L > 8) { m.quad(tip[0], tip[1], z, angleOf(0, d[1]), 1.8, L, ca, 0.9, 'fade'); m.quad(tip[0], tip[1], z - 1, angleOf(0, d[1]), 12, L, cb, 0.14, 'fade'); }
      for (var f = 0; f < 6; f++) {
        var a = (f < 3 ? -1 : 1) * (0.14 + (f % 3) * 0.18 + ctx.rnd() * 0.06), dx = Math.sin(a), dy = d[1] * Math.cos(a), l = runOut(ctx, tip[0], tip[1], z, dx, dy, 60 + ctx.rnd() * 80, 4);
        if (l > 10) m.quad(tip[0], tip[1], z, angleOf(dx, dy), 0.9, l, cb, 0.4, 'fade');
      }
      if (ok(ctx, tip[0], tip[1], z, 6)) glint(m, tip[0], tip[1], z, cb, 3.2, 34);
    });
    [[1, 0], [-1, 0]].forEach(function (d) {
      var sx = cx + d[0] * Wd, l = runOut(ctx, sx, cy, z, d[0], 0, 120 + ctx.rnd() * 80, 6);
      if (l > 10) m.quad(sx, cy, z, angleOf(d[0], 0), 1.2, l, cb, 0.6, 'fade');
      if (ok(ctx, sx, cy, z, 6)) glint(m, sx, cy, z, cc, 2.4, 22);
    });
    for (var i = 0; i < 380; i++) {                              // dust inside, drawn to the axis
      var v = ctx.rnd() * 2 - 1, u = (ctx.rnd() * 2 - 1) * Math.pow(ctx.rnd(), 1.5) * (1 - Math.abs(v)), x = cx + u * Wd, y = cy + v * H;
      if (ok(ctx, x, y, z, 6)) m.point(x, y, z + gauss(ctx.rnd) * 10, 0.9 + ctx.rnd() * 1.1, ctx.rnd() < 0.3 ? cb : ca, 0.2 + 0.5 * ctx.rnd());
    }
    m.point(cx, cy, z, 170, cc, 0.3, true); m.point(cx, cy, z, 46, cb, 0.8, true); m.point(cx, cy, z, 10, WHITE, 1, true);
  });

  // ribbon lanes: three or four parallel ribbons of fine points flowing up across the art behind the
  // mark, each in its own colour (white, the light, the glow, a pale tint), each turning a little as
  // it goes, with bright edges, packets of light riding them and a lit head where each one leaves
  A.register('s20-lanes', function (m, ctx) {
    var cols = [ctx.tone('a', 0.97), ctx.light('b'), ctx.light('c'), mix(ctx.light('b'), WHITE, 0.45)], n = 3 + (ctx.rnd() < 0.4 ? 1 : 0);
    var z0 = -80, yA = -300 + ctx.rnd() * 60, yB = 110 + ctx.rnd() * 90, amp = 40 + ctx.rnd() * 40, ph = ctx.rnd() * TAU, gap = 42 + ctx.rnd() * 8, wR = 22 + ctx.rnd() * 8;
    if (ctx.rnd() < 0.5) { var sw = yA; yA = -yB + 20; yB = -sw - 20; }
    function path(u) {
      var x = -250 + 580 * u, y = yA + (yB - yA) * u + amp * Math.sin(u * TAU * 0.8 + ph);
      var dy = (yB - yA) + amp * TAU * 0.8 * Math.cos(u * TAU * 0.8 + ph), dx = 580, l = Math.hypot(dx, dy);
      return { x: x, y: y, nx: -dy / l, ny: dx / l };
    }
    for (var k = 0; k < n; k++) {
      var col = cols[k], off = (k - (n - 1) / 2) * gap, z = z0 + k * 8, tw = (ctx.rnd() - 0.5) * 0.8, i;
      for (i = 0; i < 3200 / n; i++) {                           // the ribbon's face (3200 points shared by the lanes)
        var u = ctx.rnd(), P = path(u), th = tw + Math.sin(u * Math.PI * 1.6) * 0.9, v = (ctx.rnd() * 2 - 1) * wR * 0.5, ww = v * Math.cos(th);
        var p = at(ctx, P.x + P.nx * (off + ww), P.y + P.ny * (off + ww), z + v * Math.sin(th) * 1.4, 6);
        if (p) m.point(p[0], p[1], p[2], 1 + ctx.rnd() * 0.9, col, (0.28 + 0.5 * u) * (0.5 + 0.5 * ctx.rnd()));
      }
      [-1, 1].forEach(function (e) {                             // its two edges: a hairline, dotted
        var run = [];
        for (var j = 0; j <= 160; j++) {
          var u2 = j / 160, P2 = path(u2), th2 = tw + Math.sin(u2 * Math.PI * 1.6) * 0.9, ew = e * wR * 0.5 * Math.cos(th2);
          var q = at(ctx, P2.x + P2.nx * (off + ew), P2.y + P2.ny * (off + ew), z + e * wR * 0.5 * Math.sin(th2) * 1.4, 6);
          if (!q) { if (run.length >= 6) m.line(run, col, 0.5); run = []; continue; }
          run.push(q[0], q[1], q[2]);
          if (j % 2 === 0) m.point(q[0], q[1], q[2], 1.6, col, 0.4 + 0.55 * u2);
        }
        if (run.length >= 6) m.line(run, col, 0.5);
      });
      for (var pk = 0; pk < 2; pk++) {                           // packets of light riding it
        var u0 = 0.15 + ctx.rnd() * 0.7;
        for (var s = 0; s < 8; s++) {
          var u3 = u0 + s * 0.005, P3 = path(u3), pp = at(ctx, P3.x + P3.nx * off, P3.y + P3.ny * off, z + 1, 6);
          if (pp) m.point(pp[0], pp[1], pp[2], 1.6 + s * 0.35, col, 0.4 + s * 0.08);
        }
      }
      for (var h = 0.985; h > 0.6; h -= 0.01) {
        var Ph = path(h), ph2 = at(ctx, Ph.x + Ph.nx * off, Ph.y + Ph.ny * off, z + 1, 10);
        if (ph2) { glint(m, ph2[0], ph2[1], ph2[2], col, 2.6, 24); break; }
      }
    }
  });

  /* ================= 06-particles: in front ================= */

  // a spiral ribbon: a band of particles winding up round the mark, wider and brighter as it rises,
  // its two edges drawn as fine dotted strands, particles shed off its outer edge, a lit head at its
  // top. The half in front is bright and fine; the half behind is dim
  A.register('s20-spiral-ribbon', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), turns = 1.5 + ctx.rnd() * 0.5, ph = ctx.rnd() * TAU, hand = ctx.rnd() < 0.5 ? 1 : -1;
    var R0 = 205, R1 = 290 + ctx.rnd() * 20, y0 = -300, y1 = 226, ox = -16, band = 36 + ctx.rnd() * 12, tiltZ = (ctx.rnd() - 0.5) * 0.16;
    function P(t, v, out) {
      var a = ph + hand * t * turns * TAU, R = R0 + (R1 - R0) * t + (out || 0), y = y0 + (y1 - y0) * t + v * (0.5 + 0.6 * t);
      var x = R * Math.cos(a), z = R * Math.sin(a) * 0.8;
      return [ox + x * Math.cos(tiltZ) - y * Math.sin(tiltZ), x * Math.sin(tiltZ) + y * Math.cos(tiltZ), z];
    }
    var i, p;
    for (i = 0; i < 2800; i++) {
      var t = Math.pow(ctx.rnd(), 0.85), v = gauss(ctx.rnd) * band * 0.55;
      p = P(t, v);
      if (!ok(ctx, p[0], p[1], p[2], 6)) continue;
      var front = p[2] > 0;
      m.point(p[0], p[1], p[2], (front ? 1.1 : 0.9) + ctx.rnd() * (front ? 1.2 : 0.8), ctx.rnd() < 0.15 ? cb : ca, (front ? 0.75 : 0.28) * (0.4 + 0.6 * t) * (0.45 + 0.55 * ctx.rnd()));
    }
    [-1, 1].forEach(function (e) {                             // its two edges: a hairline, dotted
      var run = [], seg = 0;
      function flush() { if (run.length >= 6) m.line(run, cb, (seg > 0 ? 0.55 : 0.2)); run = []; }
      for (var j = 0; j <= 420; j++) {
        var t2 = j / 420, q = P(t2, e * band * 0.75), front = q[2] > 0 ? 1 : -1;
        if (!ok(ctx, q[0], q[1], q[2], 6) || front !== seg) { flush(); seg = front; }
        if (!ok(ctx, q[0], q[1], q[2], 6)) continue;
        run.push(q[0], q[1], q[2]);
        if (j % 3 === 0) m.point(q[0], q[1], q[2], 1.5, cb, (front > 0 ? 0.85 : 0.32) * (0.35 + 0.65 * t2));
      }
      flush();
    });
    for (i = 0; i < 320; i++) {                                  // shed off the outer edge, trailing behind
      var ts = 0.15 + ctx.rnd() * 0.85, out = Math.pow(ctx.rnd(), 2) * 70;
      p = P(ts - out / 2600, band * (0.4 + ctx.rnd() * 0.6) * (ctx.rnd() < 0.5 ? 1 : -1), out);
      if (ok(ctx, p[0], p[1], p[2], 6)) m.point(p[0], p[1], p[2], 0.8 + ctx.rnd() * 1.1, ctx.rnd() < 0.3 ? cc : ca, (p[2] > 0 ? 0.5 : 0.2) * (1 - out / 80));
    }
    for (var h = 1; h > 0.7; h -= 0.01) {
      var hp = P(h, 0);
      if (ok(ctx, hp[0], hp[1], hp[2], 12)) { glint(m, hp[0], hp[1], hp[2], cc, 3, 30); break; }
    }
  });

  // a drifting column: tiny cubes, points and short rising streaks drifting up in a loose column in
  // the free space beside the mark, thickest in its middle, with a faint glow along it. Some cards
  // get a second, thinner column on the other side
  A.register('s20-drift-column', function (m, ctx) {
    var ca = ctx.tone('a', 0.95), cb = ctx.light('b'), cc = ctx.light('c'), cols = [[254 + ctx.rnd() * 14, -236, 214, 20]];
    if (ctx.rnd() < 0.5) cols.push([-221, -320, 320, 9]);
    cols.forEach(function (c, ci) {
      var xs = c[0], z0 = 50 + ctx.rnd() * 40, sig = c[3], lo = c[1], hi = c[2], scale = ci ? 0.5 : 1, i;
      function spot(spread) {
        var ys = lo + ctx.rnd() * (hi - lo), mid = Math.sin(Math.PI * (ys - lo) / (hi - lo)), xw = xs + gauss(ctx.rnd) * sig * 1.3 * (0.6 + 0.6 * mid) * spread;
        return at(ctx, xw, ys, z0 + gauss(ctx.rnd) * sig * 1.6, 6);
      }
      for (i = 0; i < 700 * scale; i++) {
        var p = spot(1);
        if (p) { var r = ctx.rnd(); m.point(p[0], p[1], p[2], 0.9 + ctx.rnd() * 1.3, r < 0.1 ? cc : r < 0.24 ? cb : ca, 0.25 + 0.6 * ctx.rnd()); }
      }
      for (i = 0; i < 46 * scale; i++) {
        var q = spot(0.9), s = 2.2 + Math.pow(ctx.rnd(), 2) * 5;
        if (!q) continue;
        var rot = [ctx.rnd() * 3, ctx.rnd() * 3, ctx.rnd() * 3];
        if (ctx.rnd() < 0.12) m.glass(q[0], q[1], q[2], s * 2, s * 2, s * 2, ca, 0.8, rot);
        else m.cube(q[0], q[1], q[2], s, s, s, ctx.rnd() < 0.15 ? cc : ctx.tone('a', 0.55 + ctx.rnd() * 0.45), rot);
      }
      for (i = 0; i < 28 * scale; i++) {
        var k = spot(1.1);
        if (!k) continue;
        var col = ctx.rnd() < 0.3 ? cb : ca, l = 10 + ctx.rnd() * 26;
        m.quad(k[0], k[1], k[2], Math.PI, 0.8 + ctx.rnd() * 0.6, l, col, 0.55, 'fade');
        m.point(k[0], k[1], k[2], 1.8, col, 0.95);
      }
      for (var y = lo + 30; y < hi - 20; y += 40) { var g = at(ctx, xs, y, z0, 20); if (g) m.point(g[0], g[1], g[2], 70 * (0.6 + 0.4 * scale), cb, 0.035, true); }
    });
  });

  // motion trails: arcs of dots round the mark, each a swoosh of three parallel strands whose dots
  // shrink and fade behind a bright head, like the frames of a fast turn
  A.register('s20-trails', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c'), n = 4 + Math.floor(ctx.rnd() * 3), placed = 0;
    for (var tr = 0; tr < 40 && placed < n; tr++) {
      var R = 228 + ctx.rnd() * 90, ax = 0.12 + ctx.rnd() * 0.5, az = (ctx.rnd() - 0.5) * 1.6, oy = (ctx.rnd() - 0.5) * 160, th = ctx.rnd() * TAU;
      var span = 1.1 + ctx.rnd() * 0.9, dir = ctx.rnd() < 0.5 ? 1 : -1, N = Math.round(span * R / 5), z0 = 30, col = ctx.rnd() < 0.5 ? cb : cc;
      var head = tilt(R * Math.cos(th), 0, R * Math.sin(th), ax, az);
      if (head[2] < 10 || !ok(ctx, head[0], head[1] + oy, head[2] + z0, 14)) continue;
      placed++;
      for (var s = 0; s < 3; s++) {
        var Rs = R + s * 9;
        for (var j = 0; j < N; j++) {
          var u = j / N, a = th - dir * u * span, p = tilt(Rs * Math.cos(a), 0, Rs * Math.sin(a), ax, az);
          p[1] += oy; p[2] += z0;
          if (!ok(ctx, p[0], p[1], p[2], 6)) continue;
          m.point(p[0], p[1], p[2], (4 - s * 0.9) * Math.pow(1 - u, 1.2) + 0.6, s ? ca : col, Math.min(1, (1.1 - s * 0.25) * Math.pow(1 - u, 0.9) + 0.06) * (p[2] > 0 ? 1 : 0.45));
        }
      }
      glint(m, head[0], head[1] + oy, head[2] + z0, col, 3.6, 30);
      if (ctx.rnd() < 0.45) m.glass(head[0], head[1] + oy, head[2] + z0, 9, 9, 9, ctx.tone('a', 0.95), 0.9, [ctx.rnd() * 3, ctx.rnd() * 3, 0]);
    }
  });
})();

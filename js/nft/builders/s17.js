/* DEFXN identity card: builders from reference sheet 17 (plates, stacks, surfaces and grids). Glass
   plates stacked on an axis, on a spine of cubes and up a ladder; chips; tilted grid sheets; panes
   standing in depth; a rippling cloth; floors that run into the distance; a field of light spikes; a
   lattice with bars of light rising from it. Each builder is named by an element file under
   layers/<NN-key>/sheet-17/. The space and the m / ctx calls are described at the top of art3d.js.
   Every random value comes from ctx.rnd(), so the same card always draws the same art.

   Colour: white parts use ctx.tone('a', v) or ctx.light('a'); the sheet's amber and cyan accents
   use ctx.light('c'), and its pale light ctx.light('b').

   Placement: the mark spans x -200..200 and y -273..273. Big plates and surfaces sit behind it
   (z < 0), or below it as floors. In front go only small glass, thin lines and points, so the mark
   is never buried. Far shapes are placed by where they are SEEN (seenAt below): the card's rest tilt
   carries a point 300 units behind about 110 units to the left. Floors run wider than the card on
   the left: the card fades that side out, and the wide strip behind a site shows it.

     s17-ancestry   03-aura       diamond glass plates on one axis, an amber core in the middle plate
     s17-spine      03-aura       glass slats threaded on a spine of small cubes, turning as they rise
     s17-tiers      03-aura       wide accent diamond plates in a stepped pyramid, corners joined
     s17-ladder     03-aura       glass plates and glass cubes in turn up an axis beside the mark
     s17-reveal     03-aura       square plates opening outward behind the mark, the largest at the back
     s17-sheets     03-aura       three glass sheets with a fine grid on each, tilted different ways
     s17-fan        03-aura       nine tall panes hinged under the mark and spread like a fan behind it
     s17-panes      01-backdrop   tall panes standing one behind another, lines and points on them
     s17-folio      01-backdrop   a sheet of dots folded open like a book, a line of light in the crease
     s17-cloth      01-backdrop   a wire sheet rippling like cloth, its crests in the accent
     s17-horizon    01-backdrop   a grid floor that fades into the distance
     s17-dot-hall   01-backdrop   a floor and a ceiling of dots, running into the distance
     s17-tri-floor  01-backdrop   a floor of triangles, brightest under the mark
     s17-spikes     01-backdrop   a field of light spikes of varied height, like a range made of points
     s17-data-grid  01-backdrop   a lattice of points with bars of light rising from it
     s17-chips      06-particles  small chips: thin plates, a bright square core, pins along the edges
     s17-tiles      06-particles  small glass tiles with a grid on each, a few cells lit
     s17-bridge     06-particles  two thin plates side by side, joined by arched lines of light */
(function () {
  'use strict';
  var A = window.Art3D, TAU = Math.PI * 2;
  if (!A || !A.register) { console.error('js/nft/builders/s17.js: Art3D is not loaded. Load js/nft/art3d.js first. traits.js loads this file when a card needs it.'); return; }

  /* ---------- helpers ---------- */

  // 3 x 3 rotation matrices. A glass block takes its turn as three.js XYZ Euler angles (euler), so a
  // plate can be yawed and then tipped: build the turn as a matrix, then convert it.
  function rx(a) { var c = Math.cos(a), s = Math.sin(a); return [[1, 0, 0], [0, c, -s], [0, s, c]]; }
  function ry(a) { var c = Math.cos(a), s = Math.sin(a); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; }
  function rz(a) { var c = Math.cos(a), s = Math.sin(a); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; }
  function mul(P, Q) {
    var o = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) o[i][j] = P[i][0] * Q[0][j] + P[i][1] * Q[1][j] + P[i][2] * Q[2][j];
    return o;
  }
  function app(M, p) {
    return [M[0][0] * p[0] + M[0][1] * p[1] + M[0][2] * p[2], M[1][0] * p[0] + M[1][1] * p[1] + M[1][2] * p[2], M[2][0] * p[0] + M[2][1] * p[1] + M[2][2] * p[2]];
  }
  // the XYZ Euler angles of a rotation matrix (three.js order: the matrix is Rx * Ry * Rz)
  function euler(M) {
    var m13 = Math.max(-1, Math.min(1, M[0][2])), y = Math.asin(m13);
    if (Math.abs(m13) < 0.9999999) return [Math.atan2(-M[1][2], M[2][2]), y, Math.atan2(-M[0][1], M[0][0])];
    return [Math.atan2(M[2][1], M[1][1]), y, 0];
  }
  // the matrix of XYZ Euler angles, so lines drawn on a glass block line up with it
  function turn(r) { return mul(mul(rx(r[0]), ry(r[1])), rz(r[2])); }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function lerp(p, q, t) { return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t]; }
  function flat(pts) { var o = []; pts.forEach(function (p) { o.push(p[0], p[1], p[2]); }); return o; }
  function seg(m, a, b, rgb, alpha) { m.line([a[0], a[1], a[2], b[0], b[1], b[2]], rgb, alpha); }
  function node(m, p, rgb, size, glow, ga) {        // a hard dot with a soft glow round it
    m.point(p[0], p[1], p[2], size, rgb, 1);
    m.point(p[0], p[1], p[2], size * (glow || 4.5), rgb, ga == null ? 0.35 : ga, true);
  }
  // dots along a straight run, one every `step` units
  function dots(m, a, b, step, size, rgb, alpha) {
    var n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / step));
    for (var i = 1; i < n; i++) { var p = lerp(a, b, i / n); m.point(p[0], p[1], p[2], size, rgb, alpha); }
  }
  // the four corners of a w x d plate (its local x and z) turned by M about its centre c, in order
  function corners(M, c, w, d) {
    return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(function (q) { return add(c, app(M, [q[0] * w / 2, 0, q[1] * d / 2])); });
  }
  // a large plate drawn without a glass face: big glass faces stacked behind the mark turn milky
  // and bury it. Its rim, a second rim just inside it, and a faint face of light (alpha `face`).
  function rimPlate(m, M, c, w, d, rgb, alpha, face) {
    m.line(flat(corners(M, c, w, d)), rgb, alpha, true);
    m.line(flat(corners(M, c, w - 7, d - 7)), rgb, alpha * 0.35, true);
    if (face) m.bar(c[0], c[1], c[2], w, 1, d, rgb, face, euler(M));
  }
  // the art-space x and y at depth z that the card shows at (xs, ys): the inverse of Art3D.seen
  function seenAt(xs, ys, z) {
    var x = xs, y = ys;
    for (var i = 0; i < 6; i++) { var p = A.seen(x, y, z); x += xs - p[0]; y += ys - p[1]; }
    return [x, y];
  }
  // how many seen units one art unit makes at a place (the perspective's scale there)
  function scaleAt(x, y, z) { return (A.seen(x + 50, y, z)[0] - A.seen(x - 50, y, z)[0]) / 100; }
  // true when a point is seen inside the art's box (x -240..320, y -340..340), `pad` units in
  function inView(p, pad) {
    var s = A.seen(p[0], p[1], p[2]); pad = pad || 0;
    return s[0] > -240 + pad && s[0] < 320 - pad && s[1] > -340 + pad && s[1] < 340 - pad;
  }
  // a floor's reach: seen no further right than the card's edge and no lower than its foot, and not
  // over the serial. Left of the card's text side it may run on: the card fades it, and the wide
  // strip behind a site shows it.
  function onFloor(ctx, p) {
    var s = A.seen(p[0], p[1], p[2]);
    return s[0] < 326 && s[0] > -1300 && s[1] > -346 && s[1] < 346 && ctx.clearAt(p[0], p[1], p[2], 4);
  }
  // a straight line drawn in short runs, each with its own colour and strength: f(mid point, t)
  // returns [rgb, alpha] or null to leave that run out
  function runs(m, a, b, n, f) {
    for (var i = 0; i < n; i++) {
      var p = lerp(a, b, i / n), q = lerp(a, b, (i + 1) / n), r = f(lerp(a, b, (i + 0.5) / n), (i + 0.5) / n);
      if (r && r[1] > 0.004) seg(m, p, q, r[0], r[1]);
    }
  }
  // inside an oval round the mark's middle, where small things in front would cover it
  function overMark(x, y) { return (x / 190) * (x / 190) + (y / 262) * (y / 262) < 1; }
  // places for n small things in front: clear of the card's words, apart, and mostly off the mark
  function places(ctx, n, box, gap, pad, keepOff) {
    var out = [], tries = 0;
    while (out.length < n && tries++ < 800) {
      var p = [box[0] + ctx.rnd() * (box[1] - box[0]), box[2] + ctx.rnd() * (box[3] - box[2]), box[4] + ctx.rnd() * (box[5] - box[4])];
      var s = A.seen(p[0], p[1], p[2]);
      if (overMark(s[0], s[1]) && ctx.rnd() < keepOff) continue;
      if (!ctx.clearAt(p[0], p[1], p[2], pad) || !inView(p, pad)) continue;
      if (out.some(function (q) { return Math.hypot(q[0] - p[0], q[1] - p[1]) < gap; })) continue;
      out.push(p);
    }
    return out;
  }

  /* ================= 03-aura: around the mark ================= */

  // ancestry stack: seven diamond glass plates on one vertical axis behind the mark, widest in the
  // middle. The middle plate is thicker, in the accent, and holds a glowing core, so the mark stands
  // against its light. Dotted lines run from each plate's corners to the next one's.
  A.register('s17-ancestry', function (m, ctx) {
    var cw = ctx.light('a'), cc = ctx.light('c'), ga = ctx.tone('a', 0.95), gc = ctx.tone('c', 0.95);
    var z = -330, M = mul(rx(0.36 + ctx.rnd() * 0.06), ry(Math.PI / 4 + (ctx.rnd() - 0.5) * 0.14)), rot = euler(M);
    var o = seenAt(30, 0, z), sides = [230, 300, 380, 460, 380, 300, 230], mid = 3, gap = 88, prev = null;
    sides.forEach(function (s, k) {
      var c = [o[0], (k - mid) * gap, z], hot = k === mid, cr = corners(M, c, s, s);
      m.glass(c[0], c[1], c[2], s, hot ? 10 : 4, s, hot ? gc : ga, hot ? 0.95 : 0.6, rot);
      m.line(flat(corners(M, c, s * 0.64, s * 0.64)), hot ? cc : cw, hot ? 0.5 : 0.2, true);
      cr.forEach(function (p) { m.point(p[0], p[1], p[2], hot ? 4 : 2.8, hot ? cc : cw, 0.95); });
      if (prev) cr.forEach(function (p, i) { dots(m, prev[i], p, 9, 1.5, cw, 0.32); });
      prev = cr;
    });
    m.line([o[0], -(mid + 0.7) * gap, z, o[0], (mid + 0.7) * gap, z], cw, 0.22);
    m.cube(o[0], 0, z, 34, 34, 34, ctx.tone('c', 0.98), rot);
    m.bar(o[0], 0, z, 300, 7, 300, cc, 0.22, rot);
    m.point(o[0], 0, z, 420, cc, 0.22, true); m.point(o[0], 0, z, 140, cc, 0.5, true); m.point(o[0], 0, z, 30, [1, 1, 1], 1, true);
  });

  // record spine: a spine of small cubes from the card's foot to its top behind the mark, and seven
  // long glass slats threaded on it. Each slat is turned a little further than the one below, so the
  // stack twists as it rises. A record line runs along each slat; one is lit at both ends.
  A.register('s17-spine', function (m, ctx) {
    var cw = ctx.light('a'), cc = ctx.light('c'), ga = ctx.tone('a', 0.95), z = -290, x0 = seenAt(34, 0, z)[0];
    var tw = (ctx.rnd() - 0.5) * 0.6, twist = (ctx.rnd() < 0.5 ? -1 : 1) * (0.15 + ctx.rnd() * 0.05), n = 7, lit = Math.floor(ctx.rnd() * n);
    function yaw(y) { return tw + y / 92 * twist; }
    for (var y = -330; y <= 330; y += 14) {
      var hot = ctx.rnd() < 0.05;
      m.cube(x0, y, z, 8, 8, 8, hot ? ctx.tone('c', 0.95) : ctx.tone('a', 0.55 + ctx.rnd() * 0.4), [0, yaw(y), 0]);
      if (hot) m.point(x0, y, z, 30, cc, 0.4, true);
    }
    for (var k = 0; k < n; k++) {
      var yk = (k - (n - 1) / 2) * 92, W = 540 - Math.abs(k - 3) * 36, D = 92, M = mul(rx(0.24), ry(yaw(yk))), c = [x0, yk, z];
      m.glass(x0, yk, z, W, 3.5, D, ga, 0.6, euler(M));
      corners(M, c, W, D).forEach(function (p) { m.point(p[0], p[1], p[2], 2.6, cw, 0.9); });
      var a = add(c, app(M, [-W * 0.42, 2.5, 0])), b = add(c, app(M, [W * 0.42, 2.5, 0]));
      seg(m, a, b, k === lit ? cc : cw, k === lit ? 0.7 : 0.3);
      if (k === lit) { node(m, b, cc, 4, 6, 0.45); node(m, a, cc, 3, 5, 0.3); }
    }
  });

  // authority tiers: four wide diamond plates in the accent, stepped like a pyramid behind the mark
  // with open gaps between them. Each corner is joined to the corner above, and a faint brace runs
  // across each side, so the tiers read as one open frame.
  A.register('s17-tiers', function (m, ctx) {
    var cw = ctx.light('a'), cc = ctx.light('c'), z = -300;
    var M = mul(rx(0.42 + ctx.rnd() * 0.06), ry(Math.PI / 4 + (ctx.rnd() - 0.5) * 0.12)), rot = euler(M), o = seenAt(24, 0, z), prev = null;
    [[-236, 540], [-78, 450], [80, 360], [238, 270]].forEach(function (t) {
      var c = [o[0], t[0], z], cr = corners(M, c, t[1], t[1]);
      rimPlate(m, M, c, t[1], t[1], cc, 0.85, 0.07);
      m.line(flat(corners(M, c, t[1] * 0.86, t[1] * 0.86)), cc, 0.14, true);
      cr.forEach(function (p) { node(m, p, cc, 3.6, 5, 0.35); });
      if (prev) cr.forEach(function (p, i) { seg(m, prev[i], p, cc, 0.5); seg(m, prev[i], cr[(i + 1) % 4], cw, 0.1); });
      m.point(c[0], c[1], c[2], 160, cc, 0.07, true);
      prev = cr;
    });
  });

  // cube ladder: thin diamond plates and small glass cubes in turn up one axis, standing beside the
  // mark at the right. Each step turns a little further. One cube holds a lit core.
  A.register('s17-ladder', function (m, ctx) {
    var cw = ctx.light('a'), cc = ctx.light('c'), ga = ctx.tone('a', 0.95), z = -30, x0 = seenAt(250 + ctx.rnd() * 14, 0, z)[0];
    var tw = ctx.rnd() * TAU, steps = [], y = -222, k = 0;
    while (y <= 210) { steps.push(y); y += 33; k++; }
    if (steps.length % 2 === 0) steps.pop();
    var lit = 1 + 2 * Math.floor(ctx.rnd() * ((steps.length - 1) / 2));
    steps.forEach(function (yy, i) {
      var M = mul(rx(0.5), ry(tw + i * 0.16)), rot = euler(M), c = [x0, yy, z];
      if (i % 2 === 0) {
        m.glass(c[0], c[1], c[2], 62, 3, 62, ga, 0.85, rot);
        corners(M, c, 62, 62).forEach(function (p) { m.point(p[0], p[1], p[2], 2.4, cw, 0.9); });
      } else {
        m.glass(c[0], c[1], c[2], 28, 28, 28, ga, 0.9, rot);
        m.cube(c[0], c[1], c[2], 10, 10, 10, i === lit ? ctx.tone('c', 0.98) : ctx.tone('a', 0.8), rot);
        if (i === lit) { m.point(c[0], c[1], c[2], 90, cc, 0.4, true); m.point(c[0], c[1], c[2], 8, [1, 1, 1], 1, true); }
      }
    });
    m.line([x0, steps[0] - 30, z, x0, steps[steps.length - 1] + 26, z], cw, 0.3);
  });

  // reveal: seven square plates on one line of sight, each larger and further back than the last
  // and turned a little more, so they open outward behind the mark like an aperture. Each is a rim
  // with small cubes at its corners; faint lines join each corner to the next plate's. The two at
  // the back are in the accent, with a faint face and a glow behind them.
  A.register('s17-reveal', function (m, ctx) {
    var cw = ctx.light('a'), cc = ctx.light('c'), n = 7, roll0 = (ctx.rnd() - 0.5) * 0.3, dr = (ctx.rnd() < 0.5 ? -1 : 1) * (0.07 + ctx.rnd() * 0.03), last = null, prev = null;
    for (var k = 0; k < n; k++) {
      var t = k / (n - 1), z = -30 - t * 520, hs = 96 + t * 176, c0 = seenAt(34, 0, z), c = [c0[0], c0[1], z], h = hs / scaleAt(c[0], c[1], z);
      var back = k >= n - 2, M = mul(rz(roll0 + k * dr), rx(Math.PI / 2)), col = back ? cc : cw, cr = corners(M, c, 2 * h, 2 * h);
      rimPlate(m, M, c, 2 * h, 2 * h, col, 0.35 + 0.45 * t, back ? 0.045 : 0);
      cr.forEach(function (p, i) {
        if (inView(p, 4)) m.cube(p[0], p[1], p[2], 6, 6, 6, back ? ctx.tone('c', 0.95) : ctx.tone('a', 0.9), euler(M));
        if (prev) seg(m, prev[i], p, col, 0.14);
        var e = lerp(p, cr[(i + 1) % 4], 0.5);
        m.point(e[0], e[1], e[2], 2.4, col, 0.7);
      });
      prev = cr; last = c;
    }
    m.point(last[0], last[1], last[2], 520, cc, 0.12, true);
  });

  // grid sheets: three thin sheets floating behind the mark, each tilted its own way, each with a fine
  // grid on its face, every fourth line brighter, and one cell lit. The two small ones are glass; the
  // large far one is a rim with a faint face, so it does not cloud the mark.
  A.register('s17-sheets', function (m, ctx) {
    var cw = ctx.light('a'), cb = ctx.light('b'), cc = ctx.light('c');
    [{ at: [30, 70], z: -420, w: 480, h: 330, rot: [0.2, -0.55, 0.06], col: cb, cell: 24, rim: true },
     { at: [-10, -200], z: -220, w: 380, h: 250, rot: [0.95, -0.4, -0.12], col: cc, edge: ctx.tone('c', 0.95), cell: 19 },
     { at: [252, -40], z: -110, w: 220, h: 170, rot: [-0.45, 0.8, 0.16], col: cw, edge: ctx.tone('a', 0.95), cell: 14 }
    ].forEach(function (d) {
      var r = [d.rot[0] + (ctx.rnd() - 0.5) * 0.16, d.rot[1] + (ctx.rnd() - 0.5) * 0.2, d.rot[2]], M = turn(r), o = seenAt(d.at[0], d.at[1], d.z), c = [o[0], o[1], d.z];
      var nu = Math.round(d.w / d.cell), nv = Math.round(d.h / d.cell), cu = d.w / nu, cv = d.h / nv, i;
      function P(u, v) { return add(c, app(M, [u, v, 2])); }
      if (d.rim) rimPlate(m, mul(M, rx(Math.PI / 2)), c, d.w, d.h, d.col, 0.7, 0.04);
      else m.glass(c[0], c[1], c[2], d.w, d.h, 3, d.edge, 0.75, r);
      for (i = 1; i < nu; i++) seg(m, P(-d.w / 2 + i * cu, -d.h / 2), P(-d.w / 2 + i * cu, d.h / 2), d.col, i % 4 ? 0.12 : 0.3);
      for (i = 1; i < nv; i++) seg(m, P(-d.w / 2, -d.h / 2 + i * cv), P(d.w / 2, -d.h / 2 + i * cv), d.col, i % 4 ? 0.12 : 0.3);
      [[1, 1], [1, -1], [-1, -1], [-1, 1]].forEach(function (q) { var p = P(q[0] * d.w / 2, q[1] * d.h / 2); m.point(p[0], p[1], p[2], 3.2, d.col, 0.95); });
      var lu = -d.w / 2 + (1 + Math.floor(ctx.rnd() * (nu - 2)) + 0.5) * cu, lv = -d.h / 2 + (1 + Math.floor(ctx.rnd() * (nv - 2)) + 0.5) * cv, lp = P(lu, lv);
      m.bar(lp[0], lp[1], lp[2], cu * 0.8, cv * 0.8, 1.5, cc, 0.45, r);
      m.point(lp[0], lp[1], lp[2], 46, cc, 0.4, true);
    });
  });

  // plate fan: nine tall panes hinged at one point under the mark and spread like a fan behind it,
  // each a rim with a faint face, a point at its tip. One pane is in the accent; the hinge glows.
  A.register('s17-fan', function (m, ctx) {
    var cw = ctx.light('a'), cc = ctx.light('c'), n = 9, z0 = -170, h0 = seenAt(30, -300, z0), H = [h0[0], h0[1], z0];
    var spread = 0.72 + ctx.rnd() * 0.06, lit = Math.floor(ctx.rnd() * n), L = 560, W = 84;
    for (var k = 0; k < n; k++) {
      var a = -spread + 2 * spread * k / (n - 1), z = z0 - k * 9, R = rz(-a), M = mul(R, rx(Math.PI / 2)), hot = k === lit;
      var base = [H[0], H[1], z], c = add(base, app(R, [0, L / 2 + 24, 0])), tip = add(base, app(R, [0, L + 24, 0]));
      rimPlate(m, M, c, W, L, hot ? cc : cw, hot ? 0.8 : 0.5, hot ? 0.06 : 0.025);
      if (hot) seg(m, add(base, app(R, [0, 24, 0])), tip, cc, 0.45);
      if (inView(tip, 6)) node(m, tip, hot ? cc : cw, hot ? 4.4 : 3, 5, hot ? 0.45 : 0.25);
    }
    node(m, H, cc, 6, 6, 0.5);
    m.point(H[0], H[1], H[2], 240, cc, 0.16, true);
  });

  /* ================= 01-backdrop: far behind the mark ================= */

  // depth panes: five tall panes standing one behind another, each further back seen a little
  // further right, so their edges step out beside the mark. Each pane carries rows of thin lines
  // with points at their ends and a ruled margin; one pane's first point is in the accent.
  A.register('s17-panes', function (m, ctx) {
    var cw = ctx.light('a'), cc = ctx.light('c'), n = 5, yaw = -(0.42 + ctx.rnd() * 0.1), M = ry(yaw), lit = Math.floor(ctx.rnd() * n);
    for (var k = n - 1; k >= 0; k--) {
      var z = -80 - k * 105, at = seenAt(40 + k * 36, 8 + k * 12, z), W = 300, H = 560 - k * 12, c = [at[0], at[1], z], hot = k === lit;
      var P = (function (c0) { return function (u, v) { return add(c0, app(M, [u, v, 2])); }; })(c);
      rimPlate(m, mul(M, rx(Math.PI / 2)), c, W, H, cw, hot ? 0.75 : 0.55, 0.03);
      var rows = 4 + Math.floor(ctx.rnd() * 4);
      for (var r = 0; r < rows; r++) {
        var v = -H / 2 + 40 + ctx.rnd() * (H - 80), u0 = -W / 2 + 20 + ctx.rnd() * 60, u1 = u0 + 60 + ctx.rnd() * (W - 140), a = P(u0, v), b = P(u1, v);
        seg(m, a, b, cw, 0.32);
        m.point(b[0], b[1], b[2], 3, hot && r === 0 ? cc : cw, 0.95); m.point(a[0], a[1], a[2], 1.8, cw, 0.6);
        if (hot && r === 0) m.point(b[0], b[1], b[2], 60, cc, 0.45, true);
      }
      seg(m, P(W / 2 - 18, -H / 2 + 20), P(W / 2 - 18, H / 2 - 20), cw, 0.18);
      for (var tv = -H / 2 + 30; tv < H / 2 - 20; tv += 36) { var tp = P(W / 2 - 18, tv); m.point(tp[0], tp[1], tp[2], 1.8, cw, 0.5); }
      [[1, 1], [1, -1], [-1, -1], [-1, 1]].forEach(function (q) { var p = P(q[0] * W / 2, q[1] * H / 2); m.point(p[0], p[1], p[2], 2.8, cw, 0.9); });
    }
  });

  // folio: a sheet of dots folded open like a book behind the mark. Two pages meet at a crease
  // furthest back and open toward the viewer, the right one steeper. Rows of dots run across each
  // page, a few of them lit like lines of writing, and the crease is a line of light.
  A.register('s17-folio', function (m, ctx) {
    var cw = ctx.light('a'), cc = ctx.light('c'), zc = -440, c0 = seenAt(36, 0, zc), C = [c0[0], 0, zc], HH = 600, sp = 22, rows = Math.round(HH / sp);
    [[(62 + ctx.rnd() * 6) * Math.PI / 180, 1, 340], [(28 + ctx.rnd() * 6) * Math.PI / 180, -1, 430]].forEach(function (pg) {
      var d = [pg[1] * Math.cos(pg[0]), 0, Math.sin(pg[0])], nrm = [-pg[1] * Math.sin(pg[0]), 0, Math.cos(pg[0])], L = pg[2], nu = Math.floor(L / sp), lit = {}, q;
      // a page bows out toward the viewer between the crease and its edge, as a book's pages do
      function at(t, y) { var b = 46 * Math.sin(Math.PI * Math.min(1, t / L)); return [C[0] + d[0] * t + nrm[0] * b, y, zc + d[2] * t + nrm[2] * b]; }
      for (q = 0; q < 4; q++) lit[2 + Math.floor(ctx.rnd() * (rows - 4))] = 1;
      for (var j = 0; j <= rows; j++) for (var i = 1; i <= nu; i++) {
        var t = i * sp, p = at(t, -HH / 2 + j * sp), f = t / L, hot = lit[j] && i < nu * 0.8;
        if (!inView(p, 2) || !ctx.clearAt(p[0], p[1], p[2], 6)) continue;
        m.point(p[0], p[1], p[2], hot ? 3.2 : 2.5, hot ? cc : cw, hot ? 1 : 0.32 + 0.55 * f);
      }
      var n = 24, k, o = at(L, 0);
      for (k = 0; k < n; k++) [-HH / 2, HH / 2].forEach(function (y) {
        var u = at(L * k / n, y), v = at(L * (k + 1) / n, y);
        if (inView(u, 0) && inView(v, 0) && ctx.clearAt(u[0], u[1], u[2], 6)) seg(m, u, v, cw, 0.32);
      });
      for (k = 0; k < n; k++) {
        var u = [o[0], -HH / 2 + HH * k / n, o[2]], v = [o[0], -HH / 2 + HH * (k + 1) / n, o[2]];
        if (inView(u, 0) && inView(v, 0) && ctx.clearAt(u[0], u[1], u[2], 6)) seg(m, u, v, cw, 0.32);
      }
    });
    m.line([C[0], -HH / 2, zc, C[0], HH / 2, zc], cc, 0.75);
    for (var y = -HH / 2; y <= HH / 2; y += 60) m.point(C[0], y, zc, 3, cc, 0.9);
    m.point(C[0], 0, zc, 320, cc, 0.1, true);
  });

  // cloth: a square wire sheet behind and under the mark, rippling like cloth in two crossing waves.
  // Its threads run both ways and fade toward its edges; where a wave crests they turn to the accent
  // and carry a point.
  A.register('s17-cloth', function (m, ctx) {
    var cw = ctx.light('a'), cc = ctx.light('c'), W = 1100, D = 760, N = 30, S = 30, ph1 = ctx.rnd() * TAU, ph2 = ctx.rnd() * TAU;
    var M = mul(rx(0.78), ry(0.5 + (ctx.rnd() - 0.5) * 0.24)), z0 = -430, o = seenAt(30, -40, z0), C = [o[0], o[1], z0], HM = 84;
    function h(u, v) { return 44 * Math.sin(5 * u + 1.7 * v + ph1) + 30 * Math.sin(3.4 * v - 2.1 * u + ph2) + 10 * Math.sin(9 * (u - v) + ph1 * 2); }
    function P(u, v) { return add(C, app(M, [u * W / 2, h(u, v), v * D / 2])); }
    function look(u, v) {
      var e = Math.max(Math.abs(u), Math.abs(v)), f = 1 - Math.pow(e, 4), hh = h(u, v) / HM;
      return hh > 0.55 ? [cc, (0.32 + 0.4 * hh) * f] : [cw, (0.12 + 0.22 * (hh + 1) / 2) * f];
    }
    for (var i = 0; i <= N; i++) {
      var t = i / N * 2 - 1;
      for (var j = 0; j < S; j++) {
        var a = j / S * 2 - 1, b = (j + 1) / S * 2 - 1, mid = (a + b) / 2, r1 = look(mid, t), r2 = look(t, mid);
        seg(m, P(a, t), P(b, t), r1[0], r1[1]); seg(m, P(t, a), P(t, b), r2[0], r2[1]);
      }
      for (var k = 0; k <= N; k++) {
        var u = k / N * 2 - 1, hh = h(u, t) / HM;
        if (hh > 0.62 && Math.max(Math.abs(u), Math.abs(t)) < 0.92) { var p = P(u, t); m.point(p[0], p[1], p[2], 2.6, cc, 0.85); }
      }
    }
  });

  // horizon floor: a grid floor under the mark that runs back into the distance and fades there,
  // one row of the grid lit in the accent just behind the mark, and a glow under the mark.
  A.register('s17-horizon', function (m, ctx) {
    var cw = ctx.light('a'), cc = ctx.light('c'), y0 = -332, zN = 80, zF = -1500, X0 = -1300, X1 = 1100, sp = 64;
    var hotRow = zN - sp * (2 + Math.floor(ctx.rnd() * 3));
    function fade(p) { var d = (zN - p[2]) / (zN - zF); return Math.pow(Math.max(0, 1 - d), 1.6) * (1 - Math.pow(Math.min(1, Math.abs(p[0] - 40) / 1300), 2)); }
    function look(p) { return onFloor(ctx, p) ? [cw, 0.42 * fade(p)] : null; }
    for (var x = X0; x <= X1; x += sp) runs(m, [x, y0, zN], [x, y0, zF], 26, look);
    for (var z = zN; z >= zF; z -= sp) {
      var hot = z === hotRow;
      runs(m, [X0, y0, z], [X1, y0, z], 30, hot ? function (p) { return onFloor(ctx, p) ? [cc, 0.8 * fade(p)] : null; } : look);
      if (hot) for (var xh = X0; xh <= X1; xh += sp) { var q = [xh, y0, z]; if (onFloor(ctx, q) && fade(q) > 0.2) m.point(xh, y0, z, 3.4, cc, fade(q)); }
    }
    m.point(0, y0, -120, 260, cc, 0.16, true);
  });

  // dot hall: a floor of dots under the mark and a ceiling of dots over it, both running back into
  // the distance, every sixth row in the accent. The dots shrink and fade as they go.
  A.register('s17-dot-hall', function (m, ctx) {
    var cw = ctx.light('a'), cc = ctx.light('c'), sp = 46, zN = 60, zF = -1150, X0 = -1000, X1 = 900, hot = Math.floor(ctx.rnd() * 6);
    [[-326, 1], [334, 0.85]].forEach(function (pl) {
      var y = pl[0];
      for (var j = 0, z = zN; z >= zF; z -= sp, j++) {
        var d = (zN - z) / (zN - zF), acc = j % 6 === hot;
        for (var x = X0 + (j % 2) * sp / 2; x <= X1; x += sp) {
          var a = Math.pow(1 - d, 0.9) * (1 - Math.pow(Math.min(1, Math.abs(x - 40) / 1000), 3)) * pl[1];
          if (a < 0.03 || !onFloor(ctx, [x, y, z])) continue;
          m.point(x, y, z, (acc ? 4.4 : 3.4) * (1 - d * 0.4), acc ? cc : cw, a);
        }
      }
    });
  });

  // tri floor: a floor of equal triangles under the mark, its lines and corner points brightest just
  // behind the mark and fading into the distance. A few corners glow in the accent.
  A.register('s17-tri-floor', function (m, ctx) {
    var cw = ctx.light('a'), cc = ctx.light('c'), y0 = -330, S = 74, H = S * 0.866, zN = 60, zF = -1050, cx = 30, cz = -150;
    function P(i, j) { return [i * S + j * S / 2 + 18, y0, zN - j * H]; }
    function fade(p) {
      var d = (zN - p[2]) / (zN - zF), r = Math.hypot(p[0] - cx, (p[2] - cz) * 1.3) / 1100;
      return Math.max(0, 1 - d) * Math.max(0, 1 - r * r);
    }
    var J = Math.floor((zN - zF) / H);
    for (var j = 0; j <= J; j++) {
      var i0 = Math.floor((-1100 - j * S / 2) / S), i1 = Math.ceil((1000 - j * S / 2) / S);
      for (var i = i0; i <= i1; i++) {
        var p = P(i, j), fp = fade(p);
        if (fp < 0.02 || !onFloor(ctx, p)) continue;
        [[i + 1, j], [i, j + 1], [i - 1, j + 1]].forEach(function (e) {
          if (e[1] > J) return;
          var q = P(e[0], e[1]), a = Math.min(fp, fade(q));
          if (a > 0.02 && onFloor(ctx, q)) seg(m, p, q, cw, 0.42 * a);
        });
        if (ctx.rnd() < 0.05 && fp > 0.3) node(m, p, cc, 3.6, 6, 0.4 * fp);
        else m.point(p[0], p[1], p[2], 2.6, cw, 0.85 * fp);
      }
    }
  });

  // spike field: a field of thin vertical lines of light standing on an unseen floor under the mark,
  // their heights rising into peaks like a range of mountains made of points. Each spike carries a
  // point at its tip; the highest tips are in the accent.
  A.register('s17-spikes', function (m, ctx) {
    var cw = ctx.light('a'), cc = ctx.light('c'), y0 = -334, ph = ctx.rnd() * TAU, peaks = [], k;
    var right = seenAt(262, -60, -260);
    peaks.push([right[0] + 60 + (ctx.rnd() - 0.5) * 60, -260, 200 + ctx.rnd() * 70, 90]);
    for (k = 0; k < 6; k++) peaks.push([-700 + ctx.rnd() * 1300, -150 - ctx.rnd() * 560, 90 + ctx.rnd() * 170, 70 + ctx.rnd() * 90]);
    function height(x, z) {
      var h = 30 + 16 * Math.sin(x * 0.013 + ph) * Math.cos(z * 0.011 + ph);
      peaks.forEach(function (p) { h += p[2] * Math.exp(-((x - p[0]) * (x - p[0]) + (z - p[1]) * (z - p[1])) / (2 * p[3] * p[3])); });
      return h;
    }
    for (var z = -40; z >= -780; z -= 50) for (var x = -1000; x <= 1100; x += 44) {
      var px = x + (ctx.rnd() - 0.5) * 18, pz = z + (ctx.rnd() - 0.5) * 18, base = [px, y0, pz];
      if (!onFloor(ctx, base)) continue;
      var hh = 340 * Math.tanh(height(px, pz) * (0.85 + ctx.rnd() * 0.3) / 340), d = -pz / 800, a = 1 - 0.65 * d, top = [px, y0 + hh, pz];
      if (!ctx.clearAt(top[0], top[1], top[2], 6) || !inView(top, 0) && A.seen(top[0], top[1], top[2])[0] > -240) continue;
      seg(m, base, top, cw, (0.08 + 0.28 * Math.min(1, hh / 260)) * a);
      var hot = hh > 205;
      m.point(top[0], top[1], top[2], hot ? 3.4 : 2.3, hot ? cc : cw, (hot ? 1 : 0.85) * a);
      if (hot && ctx.rnd() < 0.3) m.point(top[0], top[1], top[2], 26, cc, 0.3 * a, true);
    }
  });

  // data grid: a slab of points three layers deep under and behind the mark, turned to show its
  // depth, with bars of light rising from a few of its top points to different heights, each capped
  // by a bright point. The tallest bar is in the accent.
  A.register('s17-data-grid', function (m, ctx) {
    var cw = ctx.light('a'), cc = ctx.light('c'), sp = 50, nx = 15, ny = 3, nz = 9, yaw = 0.5 + (ctx.rnd() - 0.5) * 0.2, M = ry(yaw), z0 = -380, o = seenAt(70, -300, z0);
    function P(i, j, k) { var q = app(M, [(i - (nx - 1) / 2) * sp, j * sp * 0.8, (k - (nz - 1) / 2) * sp]); return [o[0] + q[0], -334 + q[1], z0 + q[2]]; }
    for (var i = 0; i < nx; i++) for (var j = 0; j < ny; j++) for (var k = 0; k < nz; k++) {
      var p = P(i, j, k);
      if (!onFloor(ctx, p) || ctx.rnd() < 0.04) continue;
      m.point(p[0], p[1], p[2], 2.4 + j * 0.5, cw, 0.45 + j * 0.25);
    }
    var bars = [], tries = 0;
    while (bars.length < 8 && tries++ < 200) {
      var bi = Math.floor(Math.pow(ctx.rnd(), 0.7) * nx), bk = Math.floor(ctx.rnd() * nz);
      bi = nx - 1 - bi;
      if (bars.some(function (b) { return Math.abs(b[0] - bi) + Math.abs(b[1] - bk) < 3; })) continue;
      bars.push([bi, bk]);
    }
    bars.forEach(function (b, n) {
      var p = P(b[0], ny - 1, b[1]), hh = n === 0 ? 470 + ctx.rnd() * 80 : 120 + Math.pow(ctx.rnd(), 1.4) * 360, hot = n === 0, top = [p[0], p[1] + hh, p[2]];
      if (!ctx.clearAt(top[0], top[1], top[2], 10)) hh *= 0.6;
      m.bar(p[0], p[1] + hh / 2, p[2], 6, hh, 6, hot ? cc : cw, hot ? 0.6 : 0.32, [0, yaw, 0]);
      m.point(p[0], p[1] + hh, p[2], hot ? 5 : 3.6, hot ? cc : cw, 1);
      m.point(p[0], p[1] + hh, p[2], hot ? 60 : 26, hot ? cc : cw, hot ? 0.45 : 0.25, true);
      m.point(p[0], p[1], p[2], 30, hot ? cc : cw, 0.3, true);
    });
    var c0 = P(0, ny - 1, 0), c1 = P(nx - 1, ny - 1, 0), c2 = P(nx - 1, ny - 1, nz - 1), c3 = P(0, ny - 1, nz - 1);
    m.line(flat([c0, c1, c2, c3]), cw, 0.12, true);
  });

  /* ================= 06-particles: small things in front ================= */

  // chips: two or three small chips floating beside the mark, each three thin plates stacked with a
  // bright square core on top and tiny pins along the edges of the middle plate.
  A.register('s17-chips', function (m, ctx) {
    var cw = ctx.light('a'), cc = ctx.light('c'), ga = ctx.tone('a', 0.95);
    var spots = [[262, 126], [262, -150], [-110, 304], [70, -306], [256, -10]], n = 2 + (ctx.rnd() < 0.5 ? 1 : 0), used = [];
    for (var s0 = spots.length - 1; s0 > 0; s0--) { var r0 = Math.floor(ctx.rnd() * (s0 + 1)), tmp = spots[s0]; spots[s0] = spots[r0]; spots[r0] = tmp; }
    spots.forEach(function (sp) {
      if (used.length >= n) return;
      if (used.some(function (u) { return Math.hypot(u[0] - sp[0], u[1] - sp[1]) < 150; })) return;
      var z = 50 + ctx.rnd() * 30, o = seenAt(sp[0], sp[1], z), C = [o[0], o[1], z], s = 54 + ctx.rnd() * 14;
      if (!ctx.clearAt(C[0], C[1], z, 40)) return;
      used.push(sp);
      var M = mul(mul(rx(0.55 + ctx.rnd() * 0.35), ry(ctx.rnd() * TAU)), rz((ctx.rnd() - 0.5) * 0.3)), rot = euler(M);
      function P(x, y, zz) { return add(C, app(M, [x, y, zz])); }
      for (var l = 0; l < 3; l++) { var c = P(0, (l - 1) * 7, 0), w = s * (1.12 - l * 0.12); m.glass(c[0], c[1], c[2], w, 2, w, ga, 0.85, rot); }
      var top = P(0, 9.5, 0);
      m.cube(top[0], top[1], top[2], s * 0.34, 3, s * 0.34, ctx.tone('c', 0.98), rot);
      m.point(top[0], top[1], top[2], 50, cc, 0.5, true); m.point(top[0], top[1], top[2], 7, [1, 1, 1], 1, true);
      var hw = s / 2;
      for (var e = 0; e < 4; e++) for (var t = 0; t < 5; t++) {
        var v = -hw * 0.7 + t * hw * 0.35, d = e < 2 ? [e ? 1 : -1, 0] : [0, e === 2 ? 1 : -1];
        var a = d[0] ? [d[0] * hw, 0, v] : [v, 0, d[1] * hw], b = [a[0] + d[0] * 8, 0, a[2] + d[1] * 8], q = [b[0], -6, b[2]];
        m.line(flat([P(a[0], a[1], a[2]), P(b[0], b[1], b[2]), P(q[0], q[1], q[2])]), cw, 0.7);
        var pq = P(q[0], q[1], q[2]); m.point(pq[0], pq[1], pq[2], 1.6, cw, 0.9);
      }
    });
  });

  // tiles: small square glass tiles floating in front, beside and round the mark, each turned its own
  // way with a fine grid on its face. One or two have a lit cell.
  A.register('s17-tiles', function (m, ctx) {
    var cw = ctx.light('a'), cc = ctx.light('c'), ga = ctx.tone('a', 0.95), list = places(ctx, 8, [-170, 320, -335, 335, 20, 110], 70, 22, 0.88);
    list.forEach(function (p, k) {
      var s = 22 + ctx.rnd() * 22, r = [ctx.rnd() * TAU, ctx.rnd() * TAU, ctx.rnd() * TAU], M = turn(r), n = 3 + (ctx.rnd() < 0.5 ? 1 : 0), cs = s / n, i;
      function P(u, v) { return add(p, app(M, [u, 1, v])); }
      m.glass(p[0], p[1], p[2], s, 1.6, s, ga, 0.85, r);
      for (i = 1; i < n; i++) { seg(m, P(-s / 2 + i * cs, -s / 2), P(-s / 2 + i * cs, s / 2), cw, 0.4); seg(m, P(-s / 2, -s / 2 + i * cs), P(s / 2, -s / 2 + i * cs), cw, 0.4); }
      corners(M, p, s, s).forEach(function (q) { m.point(q[0], q[1], q[2], 2, cw, 0.9); });
      if (k < 2) {
        var lc = P(-s / 2 + (Math.floor(ctx.rnd() * n) + 0.5) * cs, -s / 2 + (Math.floor(ctx.rnd() * n) + 0.5) * cs);
        m.bar(lc[0], lc[1], lc[2], cs * 0.8, 1.5, cs * 0.8, cc, 0.6, r);
        m.point(lc[0], lc[1], lc[2], 30, cc, 0.45, true);
      }
    });
  });

  // plate bridge: two thin plates side by side, joined across the gap by six arched lines of light
  // that carry points. One floats above or below the mark, where there is room for its span; a
  // smaller one often floats beside the mark at the right.
  A.register('s17-bridge', function (m, ctx) {
    var cw = ctx.light('a'), cc = ctx.light('c'), ga = ctx.tone('a', 0.95);
    var spots = [ctx.rnd() < 0.5 ? [-40 + ctx.rnd() * 70, 296, 0.88] : [10 + ctx.rnd() * 110, -295, 0.88]];
    if (ctx.rnd() < 0.65) spots.push([262, -150 + ctx.rnd() * 300, 0.66]);
    spots.forEach(function (sp) {
      var z = 60, o = seenAt(sp[0], sp[1], z), C = [o[0], o[1], z], s = 50 * sp[2], gap = 64 * sp[2], L = 6;
      var M = mul(mul(rx(0.62 + ctx.rnd() * 0.2), ry((ctx.rnd() - 0.5) * 0.5)), rz((ctx.rnd() - 0.5) * 0.16)), rot = euler(M), hot = Math.floor(ctx.rnd() * L);
      function P(x, y, zz) { return add(C, app(M, [x, y, zz])); }
      [-1, 1].forEach(function (side) {
        var c = P(side * (gap + s) / 2, 0, 0);
        m.glass(c[0], c[1], c[2], s, 2.4, s, ga, 0.9, rot);
        corners(M, c, s, s).forEach(function (q) { m.point(q[0], q[1], q[2], 2.4, cw, 0.95); });
        var e0 = P(side * gap / 2, 1.5, -s / 2), e1 = P(side * gap / 2, 1.5, s / 2);
        seg(m, e0, e1, cw, 0.8);
      });
      for (var l = 0; l < L; l++) {
        var v = -s / 2 + (l + 0.5) * s / L, pts = [];
        for (var i = 0; i <= 12; i++) { var f = i / 12; pts.push(P(-gap / 2 + f * gap, 2 + 13 * sp[2] * Math.sin(Math.PI * f), v)); }
        m.line(flat(pts), l === hot ? cc : cw, l === hot ? 0.9 : 0.5);
        var pk = pts[2 + Math.floor(ctx.rnd() * 9)];
        m.point(pk[0], pk[1], pk[2], l === hot ? 3.4 : 2.6, l === hot ? cc : cw, 1);
        if (l === hot) m.point(pk[0], pk[1], pk[2], 34, cc, 0.4, true);
      }
      m.point(C[0], C[1] + 6, C[2], 70, cc, 0.22, true);
    });
  });
})();

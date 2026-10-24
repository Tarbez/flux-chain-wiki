/* DEFXN identity card: the art, built in 3D from the card's DNA.

   Art3D.build(mark, key, picks) turns one card's picked elements into a MODEL: lists of blocks,
   glass cubes, points of light, lines, light streaks, glowing bars and glass spheres. Art3D.paint()
   draws the model once with three.js (js/vendor/three-r180-defxn.js at the site root) into the card's art canvas, and
   again only while a hover tilts it. Nothing here runs an idle frame loop.

   SEPARATE ON PURPOSE. This is the NFT's own 3D, with its own renderer, light and look. It does not
   run on the home's ring kit (js/world/ring-kit.js): the cards are the owner's brand, not a part of the
   site's world (owner decision, 2026-10-24). It borrows only the kit's speed rules: no shadow pass on
   a moving frame, and a cap near 2.6 million drawn pixels (card.js).

   SPACE. One unit is one card unit (the card is 1000 x 700). The origin is the mark's centre
   (card x 680, y 357). x runs right, y runs UP, z runs toward the viewer. The mark's box is
   x -200..200, y -273..273. The text column ends at x -240: anything left of it fades out.

   BUILDERS. Each element file names a builder (data-build) and its parameters (data-*). A builder is
   a function (m, ctx) registered with Art3D.register(name, fn). It adds to the model through:
     m.cube(x, y, z, sx, sy, sz, rgb, rot)          a lit solid block (x,y,z is its centre)
     m.glass(x, y, z, sx, sy, sz, rgb, alpha, rot)  a clear block with bright edges
     m.point(x, y, z, size, rgb, alpha, soft)       a dot of light. soft makes a round glow
     m.line(points, rgb, alpha, closed)             a thin line of light through [x,y,z, x,y,z, ...]
     m.quad(x, y, z, angle, w, len, rgb, alpha, mode, segs)
                                                    a flat streak of light from (x,y,z). Angle 0 points
                                                    up, PI/2 points left. Mode 'fade' (bright at the
                                                    start), 'peak' (bright in the middle) or 'bars'
                                                    (broken into segs pixels)
     m.bar(x, y, z, sx, sy, sz, rgb, alpha, rot)    a glowing see-through block
     m.rod(x, y, z, dir, len, w, rgb, alpha)        a glowing bar from (x,y,z) along dir [dx,dy,dz]
     m.sphere(x, y, z, r, rgb, alpha)               a glass sphere with a bright rim
   rot is [rx, ry, rz] in radians. rgb is [r, g, b] from 0 to 1. ctx gives:
     ctx.rnd()            the card's own random stream for this element (seeded: same card, same art)
     ctx.num(name, def)   a data-<name> number from the element file
     ctx.P                every data-* value, as text
     ctx.tone(slot, v)    a block colour from the palette: slot 'a' | 'b' | 'c', brightness v (0..1)
     ctx.light(slot)      a light colour from the palette, full strength
     ctx.ring(r, n, ax, az, ox, oy, oz)  points of a circle of radius r lying flat, tilted up by ax
                          and rolled by az, centred at (ox, oy, oz)
     ctx.markGrid(rows)   the DEFXN mark on a grid: { R, C, cell, cov(r,c), x(c), y(r), ok(r,c), edge(r,c) }
     ctx.cells            the mark's blocks so far ({x, y, z, s}), for elements that grow from them
     ctx.clear(x, y, pad) true when (x, y) is clear of the words on the art's side (the genesis ID
                          and the serial) by pad units. Place small things only where it is true
     ctx.seen(x, y, z)    where a point lands on the card at rest, as [x, y] in the same art units.
                          The rest tilt and the perspective move far and near things sideways: a
                          point at z -200 lands about 80 units left of its x, one at z +100 about 40
                          right. Place far elements by where they are seen, not where they sit.
     ctx.clearAt(x, y, z, pad)  ctx.clear for where a 3D point is seen
   Art3D.seen and Art3D.clear are the same two helpers, for code outside a builder call.
   Art3D.solid(model) is the model with a thick mark, for the object view and the 3D file.
   A builder that needs time (an image to read) may return a Promise.

   LOADING. The builders other than this file's own live in js/nft/builders/*.js. build() asks
   traits.js for each picked element first (DEFXN_TRAITS.need), which loads that element's 3D
   settings and its builder file when the page does not have them yet, so a page loads only the
   builder files its cards use. Art3D.use() returns a done() function: a mounted card, or a scene
   while it paints, holds the shared renderer with it. When the last holder is done, the renderer and
   its GPU memory are freed (Art3D.release); the next draw makes a new one.

   Needs, in order: js/vendor/three-r180-defxn.js, js/ark/mark-data.js, a layer table (the full
   layers-bundle.js or js/nft/skin-bundle.js), js/nft/traits.js. */
(function () {
  'use strict';

  var W = 1000, H = 700, MX = 680, MY = 357;
  var ART = {
    x: 0.48, y: 0.12, w: 0.40, h: 0.78, gap: 0.12,
    calmFrom: 440, calmTo: 520, calmEdge: 476, top: 24, bottom: H - 24,
    quiet: [[812, 36, 1000, 122], [904, 622, 1000, 700]]
  };
  var REST = { x: 0.1, y: 0.24 };          // the tilt at rest: the art turns a little to show its depth
  var FOV = 32, DIST = 350 / Math.tan(FOV / 2 * Math.PI / 180);
  var T = window.DEFXN_TRAITS;
  function lx(x) { return x - MX; }
  function ly(y) { return MY - y; }
  function inQuiet(x, y, pad) {
    for (var i = 0; i < ART.quiet.length; i++) {
      var q = ART.quiet[i];
      if (x > q[0] - pad && x < q[2] + pad && y > q[1] - pad && y < q[3] + pad) return true;
    }
    return false;
  }

  // where an art-space point lands on the card at rest (see ctx.seen in the header)
  function seen(x, y, z) {
    var cy = Math.cos(REST.y), sy = Math.sin(REST.y), cx = Math.cos(REST.x), sx = Math.sin(REST.x);
    var x1 = x * cy + z * sy, z1 = -x * sy + z * cy, y2 = y * cx - z1 * sx, z2 = y * sx + z1 * cx, k = DIST / (DIST - z2);
    var ox = MX - W / 2, oy = H / 2 - MY;
    return [(x1 + ox) * k - ox, (y2 + oy) * k - oy];
  }
  function clear(x, y, pad) { return !inQuiet(x + MX, MY - y, pad || 0); }

  /* ---------- the mark, read once ---------- */
  var markReady = null;
  function loadMark() {
    if (markReady) return markReady;
    markReady = new Promise(function (resolve, reject) {
      if (!window.DEFXN_MARK) {
        reject(new Error('The DEFXN mark is missing: load js/ark/mark-data.js from the site root (it defines window.DEFXN_MARK) before art3d.js.'));
        return;
      }
      var img = new Image();
      img.onload = function () { resolve(readMark(img)); };
      img.onerror = function () { reject(new Error('The DEFXN mark did not decode: check the data URI in js/ark/mark-data.js.')); };
      img.src = window.DEFXN_MARK;
    });
    return markReady;
  }
  function readMark(img) {
    var w = img.naturalWidth, h = img.naturalHeight;
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0);
    var d = x.getImageData(0, 0, w, h).data, alpha = new Float32Array(w * h);
    var x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (var y = 0; y < h; y++) for (var i = 0; i < w; i++) {
      var a = d[(y * w + i) * 4 + 3] / 255; alpha[y * w + i] = a;
      if (a > 0.25) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    var white = document.createElement('canvas'); white.width = w; white.height = h;
    var wx = white.getContext('2d'); wx.drawImage(img, 0, 0);
    wx.globalCompositeOperation = 'source-in'; wx.fillStyle = '#fff'; wx.fillRect(0, 0, w, h);
    return { img: img, white: white, w: w, h: h, alpha: alpha, bx: x0, by: y0, bw: x1 - x0 + 1, bh: y1 - y0 + 1 };
  }
  var coverCache = {};
  function coverage(mark, rows, cols) {
    var key = rows + 'x' + cols;
    if (coverCache[key]) return coverCache[key];
    var cov = new Float32Array(rows * cols);
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var sum = 0;
      for (var sy = 0; sy < 4; sy++) for (var sx = 0; sx < 4; sx++) {
        var px = Math.floor(mark.bx + (c + (sx + 0.5) / 4) * mark.bw / cols);
        var py = Math.floor(mark.by + (r + (sy + 0.5) / 4) * mark.bh / rows);
        sum += mark.alpha[py * mark.w + px];
      }
      cov[r * cols + c] = sum / 16;
    }
    return (coverCache[key] = cov);
  }
  // the mark on a grid of `rows`, in the art's space (see the header)
  function markGrid(mark, rows) {
    var cell = ART.h * H / rows, cols = Math.round(ART.w * W / cell), g = coverage(mark, rows, cols);
    function cov(r, c) { return r < 0 || r >= rows || c < 0 || c >= cols ? 0 : g[r * cols + c]; }
    return {
      R: rows, C: cols, cell: cell, cov: cov,
      x: function (c) { return lx(ART.x * W + (c + 0.5) * cell); },
      y: function (r) { return ly(ART.y * H + (r + 0.5) * cell); },
      ok: function (r, c) {
        var X = ART.x * W + c * cell, Y = ART.y * H + r * cell;
        return X >= ART.calmFrom && X + cell <= W - 20 && Y >= 20 && Y + cell <= H - 20 && !inQuiet(X, Y, 6);
      },
      edge: function (r, c) { return cov(r, c) >= 0.5 && (cov(r - 1, c) < 0.5 || cov(r + 1, c) < 0.5 || cov(r, c - 1) < 0.5 || cov(r, c + 1) < 0.5); }
    };
  }

  /* ---------- colour ---------- */
  function channels(s) {                     // "200 80% 60%" -> [200, .8, .6]
    var p = String(s || '0 0% 100%').trim().split(/\s+/);
    return [parseFloat(p[0]) || 0, (parseFloat(p[1]) || 0) / 100, (parseFloat(p[2]) || 0) / 100];
  }
  function hslRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    function f(n) { var k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }
    return [f(0), f(8), f(4)];
  }
  function palette(el) {
    var a = (el && el.attrs) || {};
    return { a: channels(a.a), b: channels(a.b || a.a), c: channels(a.c || a.b || a.a) };
  }
  // a block's colour: mid greys keep little of the hue. Only bright blocks carry the full colour
  function tone(pal, slot, v) {
    var c = pal[slot] || pal.a, sat = c[1] * Math.max(0.1, Math.min(1, (v - 0.3) / 0.55));
    return hslRgb(c[0], sat, c[2] * Math.max(0, Math.min(1, v)));
  }
  function light(pal, slot) { var c = pal[slot] || pal.a; return hslRgb(c[0], c[1], c[2]); }
  function css(rgb, a) { return 'rgba(' + Math.round(rgb[0] * 255) + ',' + Math.round(rgb[1] * 255) + ',' + Math.round(rgb[2] * 255) + ',' + a + ')'; }

  /* ---------- the model ---------- */
  function Model() {
    this.cubes = []; this.glasses = []; this.points = []; this.lines = []; this.quads = [];
    this.bars = []; this.spheres = [];
  }
  Model.prototype.cube = function (x, y, z, sx, sy, sz, c, rot) { this.cubes.push({ x: x, y: y, z: z, sx: sx, sy: sy, sz: sz, c: c, rot: rot }); };
  Model.prototype.glass = function (x, y, z, sx, sy, sz, c, a, rot) { this.glasses.push({ x: x, y: y, z: z, sx: sx, sy: sy, sz: sz, c: c, a: a == null ? 0.7 : a, rot: rot }); };
  Model.prototype.point = function (x, y, z, s, c, a, soft) { this.points.push({ x: x, y: y, z: z, s: s, c: c, a: a == null ? 1 : a, soft: !!soft }); };
  Model.prototype.line = function (p, c, a, closed) { if (p && p.length >= 6) this.lines.push({ p: p, c: c, a: a == null ? 0.6 : a, closed: !!closed }); };
  Model.prototype.quad = function (x, y, z, ang, w, len, c, a, mode, segs) {
    this.quads.push({ x: x, y: y, z: z, ang: ang, w: w, len: len, c: c, a: a, mode: mode === 'peak' ? 1 : mode === 'bars' ? 2 : 0, segs: segs || 0 });
  };
  Model.prototype.bar = function (x, y, z, sx, sy, sz, c, a, rot) { this.bars.push({ x: x, y: y, z: z, sx: sx, sy: sy, sz: sz, c: c, a: a == null ? 0.4 : a, rot: rot }); };
  Model.prototype.rod = function (x, y, z, dir, len, w, c, a) {
    var n = Math.hypot(dir[0], dir[1], dir[2]) || 1, d = [dir[0] / n, dir[1] / n, dir[2] / n];
    this.bars.push({ x: x + d[0] * len / 2, y: y + d[1] * len / 2, z: z + d[2] * len / 2, sx: w, sy: len, sz: w, c: c, a: a == null ? 0.4 : a, dir: d });
  };
  Model.prototype.sphere = function (x, y, z, r, c, a) { this.spheres.push({ x: x, y: y, z: z, r: r, c: c, a: a == null ? 0.8 : a }); };

  function rotXZ(x, y, z, ax, az) {
    var ca = Math.cos(ax), sa = Math.sin(ax), y1 = y * ca - z * sa, z1 = y * sa + z * ca;
    var cz = Math.cos(az), sz = Math.sin(az);
    return [x * cz - y1 * sz, x * sz + y1 * cz, z1];
  }
  // a flat circle (in the x-z plane) tilted up by ax and rolled by az: a ring seen at an angle
  function ring(r, n, ax, az, ox, oy, oz) {
    var pts = [];
    for (var i = 0; i < n; i++) {
      var t = i / n * Math.PI * 2, p = rotXZ(r * Math.cos(t), 0, r * Math.sin(t), ax || 0, az || 0);
      pts.push(p[0] + (ox || 0), p[1] + (oy || 0), p[2] + (oz || 0));
    }
    return pts;
  }

  /* ---------- builders ---------- */
  var BUILDERS = {};
  function register(name, fn) {
    if (BUILDERS[name]) console.error('Art3D: a second builder is named "' + name + '". Give each builder its own name. The second one replaces the first.');
    BUILDERS[name] = fn;
  }
  register('none', function () {});

  // the glitch: the reference card's art. The mark is cut into vertical slices that slide up or
  // down, and in 3D each slice also steps toward or away from the viewer.
  var MELT = {
    drift: { melt: 0.65, far: 0.14, down: 0.68, reach: 9, stream: 0.6 },
    pour: { melt: 0.82, far: 0.3, down: 0.94, reach: 13, stream: 0.8 },
    lift: { melt: 0.82, far: 0.3, down: 0.08, reach: 13, stream: 0.8 },
    storm: { melt: 0.95, far: 0.48, down: 0.5, reach: 18, stream: 0.9 },
    still: { melt: 0.22, far: 0.03, down: 0.6, reach: 5, stream: 0.3 }
  };
  var CUT = { thin: { min: 1, span: 4, pow: 1.6 }, wide: { min: 2, span: 6, pow: 1 }, shred: { min: 1, span: 0, pow: 1 }, block: { min: 4, span: 8, pow: 1 } };
  var STREAK = {
    lines: { rate: 1, bar: 0.22, scan: 26, hot: 0.16 }, bars: { rate: 1, bar: 0.72, scan: 20, hot: 0.16 },
    rain: { rate: 1.7, bar: 0.1, scan: 56, hot: 0.1 }, quiet: { rate: 0.35, bar: 0.2, scan: 10, hot: 0.1 },
    scan: { rate: 0.8, bar: 0.2, scan: 72, hot: 0.5 }
  };
  function glitch2d(mark, key, G) {
    var rnd = T.prng(key, 0xa27);
    var R = G.rows, mh = ART.h * H, cell = mh / R, C = Math.round((ART.w * W) / cell);
    var g = coverage(mark, R, C);
    var mx = ART.x * W, my = ART.y * H;
    var cLo = -Math.floor(mx / cell), cHi = Math.ceil((W - mx) / cell);
    var rLo = -Math.floor(my / cell), rHi = Math.ceil((H - my) / cell);
    var GW = cHi - cLo, GH = rHi - rLo;
    function cov(r, c) { return (r < 0 || r >= R || c < 0 || c >= C) ? 0 : g[r * C + c]; }
    function xOf(c) { return mx + c * cell; }
    function yOf(r) { return my + r * cell; }
    function idx(c, r) { var gc = c - cLo, gr = r - rLo; return (gc < 0 || gc >= GW || gr < 0 || gr >= GH) ? -1 : gr * GW + gc; }
    function allowed(c, r) { var x = xOf(c), y = yOf(r); return x >= ART.calmFrom && x + cell <= W - 20 && y >= 20 && y + cell <= H - 20 && !inQuiet(x, y, 6); }
    var M = G.melt, S = G.streak, CU = G.cut;
    var style = {
      dropIn: 0.02 + rnd() * 0.03, dropEdge: 0.14 + rnd() * 0.18, loose: 0.06 + rnd() * 0.08, reach: 2 + Math.floor(rnd() * 3),
      melt: M.melt - 0.08 + rnd() * 0.16, far: M.far * (0.8 + rnd() * 0.4), down: M.down, stream: M.stream * (0.8 + rnd() * 0.4),
      streakTop: (0.36 + rnd() * 0.24) * S.rate, streakBottom: (0.3 + rnd() * 0.24) * S.rate, edgeLit: 0.32 + rnd() * 0.2
    };
    var colShift = new Int16Array(C), sliceOf = new Int16Array(C), sliceGain = [], sliceShift = [];
    for (var c0 = 0, sl = 0; c0 < C; sl++) {
      var wide = CU.min + Math.floor(Math.pow(rnd(), CU.pow) * (CU.span + 1)), dy = 0;
      if (rnd() < style.melt) {
        var far = rnd() < style.far;
        dy = far ? 4 + Math.floor(rnd() * (M.reach - 3)) : 1 + Math.floor(rnd() * 3);
        if (rnd() >= style.down) dy = -dy;
      }
      sliceGain.push(0.86 + rnd() * 0.26); sliceShift.push(dy);
      for (var k = c0; k < Math.min(C, c0 + wide); k++) { colShift[k] = dy; sliceOf[k] = sl; }
      c0 += wide;
    }
    var rowShift = new Int16Array(R), nRow = Math.floor(rnd() * 4);
    for (var b = 0; b < nRow; b++) {
      var start = Math.floor(R * 0.1 + rnd() * R * 0.8), tall = 1 + Math.floor(rnd() * 2);
      var push = (rnd() < 0.5 ? -1 : 1) * (1 + Math.floor(rnd() * 2));
      for (var t = start; t < Math.min(R, start + tall); t++) rowShift[t] = push;
    }
    var kind = new Uint8Array(GW * GH), value = new Float32Array(GW * GH), gain = new Float32Array(GW * GH), outline = new Uint8Array(GW * GH);
    var rLoM = -20, rHiM = R + 20;
    for (var c = 0; c < C; c++) {
      var dyc = colShift[c];
      for (var r = rLoM; r < rHiM; r++) {
        var sr = r - dyc, sc = c - (sr >= 0 && sr < R ? rowShift[sr] : 0), a = cov(sr, sc), i = idx(c, r), edge = false, keep;
        if (a <= 0.12) continue;
        if (a >= 0.5) {
          edge = cov(sr - 1, sc) < 0.5 || cov(sr + 1, sc) < 0.5 || cov(sr, sc - 1) < 0.5 || cov(sr, sc + 1) < 0.5;
          keep = rnd() >= (edge ? style.dropEdge : style.dropIn);
        } else keep = rnd() < a * 0.85;
        if (keep && i >= 0 && allowed(c, r)) { kind[i] = 1; gain[i] = sliceGain[sliceOf[c]]; outline[i] = a < 0.5 || edge ? 1 : 0; }
      }
    }
    for (var cs = 0; cs < C; cs++) {
      var d = colShift[cs];
      if (Math.abs(d) < 4) continue;
      if (rnd() >= style.stream) continue;
      for (var rs = 0; rs < R; rs++) {
        var here = cov(rs, cs) >= 0.5, prev = cov(rs - 1, cs) >= 0.5, next = cov(rs + 1, cs) >= 0.5;
        if (!here || (d > 0 ? prev : next)) continue;
        var n = Math.abs(d);
        for (var m = 0; m < n; m++) {
          var rr = d > 0 ? rs + m : rs - m, fill = 0.2 + 0.55 * (m / n), j = idx(cs, rr);
          if (j >= 0 && !kind[j] && allowed(cs, rr) && rnd() < fill) kind[j] = 2;
        }
      }
    }
    for (var cd = 0; cd < C; cd++) {
      if (rnd() > 0.22) continue;
      var low = -1;
      for (var rd = rHiM - 1; rd >= rLoM; rd--) { var jd = idx(cd, rd); if (jd >= 0 && kind[jd] === 1) { low = rd; break; } }
      if (low < 0) continue;
      var drop = 2 + Math.floor(Math.pow(rnd(), 1.5) * 12);
      for (var q = 1; q <= drop; q++) {
        var jq = idx(cd, low + q);
        if (jq >= 0 && allowed(cd, low + q) && rnd() < 0.75 * (1 - q / (drop + 1))) kind[jq] = 2;
      }
    }
    var dist = new Uint8Array(GW * GH), queue = [], head = 0, FAR = 255;
    for (var z = 0; z < GW * GH; z++) { dist[z] = kind[z] ? 0 : FAR; if (kind[z]) queue.push(z); }
    while (head < queue.length) {
      var p = queue[head++], pd = dist[p];
      if (pd >= style.reach) continue;
      var px = p % GW, py = (p - px) / GW;
      var nb = [px > 0 ? p - 1 : -1, px < GW - 1 ? p + 1 : -1, py > 0 ? p - GW : -1, py < GH - 1 ? p + GW : -1];
      for (var e = 0; e < 4; e++) if (nb[e] >= 0 && dist[nb[e]] === FAR) { dist[nb[e]] = pd + 1; queue.push(nb[e]); }
    }
    for (var l = 0; l < GW * GH; l++) {
      var dl = dist[l];
      if (dl === 0 || dl === FAR) continue;
      var tl = 1 - (dl - 1) / style.reach;
      if (rnd() >= style.loose * tl * tl) continue;
      var lc = l % GW + cLo, lr = Math.floor(l / GW) + rLo;
      if (!allowed(lc, lr)) continue;
      if (xOf(lc) < ART.calmEdge && rnd() > (xOf(lc) - ART.calmFrom) / (ART.calmEdge - ART.calmFrom)) continue;
      kind[l] = 3;
    }
    var colGain = new Float32Array(GW);
    for (var ci = 0; ci < GW; ci++) colGain[ci] = 0.9 + rnd() * 0.18;
    function grey(v) { return Math.round(Math.max(0.16, Math.min(1, v)) * 25) / 25; }
    for (var f = 0; f < GW * GH; f++) {
      if (!kind[f]) continue;
      var fc = f % GW, v;
      if (kind[f] === 1) {
        var roll = rnd();
        if (outline[f] && roll < style.edgeLit) v = 0.8 + rnd() * 0.2;
        else if (roll > 0.975) v = 0.86 + rnd() * 0.14;
        else v = (0.36 + rnd() * 0.34) * gain[f] * colGain[fc];
      } else if (kind[f] === 2) v = 0.26 + rnd() * 0.26;
      else v = rnd() < 0.12 ? 0.75 + rnd() * 0.2 : 0.28 + rnd() * 0.3;
      value[f] = grey(v);
    }
    var streaks = [];
    for (var gc2 = 0; gc2 < GW; gc2++) {
      var top = -1, bot = -1;
      for (var gr2 = 0; gr2 < GH; gr2++) if (kind[gr2 * GW + gc2]) { if (top < 0) top = gr2; bot = gr2; }
      if (top < 0) continue;
      var x = xOf(gc2 + cLo);
      if (x < ART.calmTo - 30) continue;
      [[-1, yOf(top + rLo), style.streakTop, yOf(top + rLo) - ART.top],
       [1, yOf(bot + rLo) + cell, style.streakBottom, ART.bottom - yOf(bot + rLo) - cell]].forEach(function (s) {
        if (rnd() >= s[2] || s[3] < cell * 3) return;
        var len = s[3] * (0.25 + 0.75 * Math.pow(rnd(), 0.8));
        var bar = rnd() < S.bar, off = Math.floor(rnd() * 3) * cell;
        streaks.push({ kind: bar ? 'bar' : 'line', dir: s[0], x: bar ? x : x + rnd() * cell * 0.6, w: bar ? cell * (1 - ART.gap) : 0.8 + rnd() * 1.1,
          y: s[1] + s[0] * off, len: Math.max(cell, Math.min(len, s[3] - off)), a: 0.26 + rnd() * 0.4 });
      });
    }
    var nScan = S.scan + Math.floor(rnd() * S.scan * 0.9);
    for (var sn = 0; sn < nScan; sn++) {
      var scol = Math.floor((ART.calmTo - mx) / cell) + Math.floor(rnd() * ((W - 24 - ART.calmTo) / cell));
      var y0 = ART.top + rnd() * H * 0.4, y1 = H * 0.6 + rnd() * (ART.bottom - H * 0.6), hot = rnd() < S.hot;
      streaks.push({ kind: 'scan', x: xOf(scol) + rnd() * cell, w: hot ? 1.3 : 0.9, y: y0, len: y1 - y0, a: hot ? 0.08 + rnd() * 0.07 : 0.02 + rnd() * 0.045 });
    }
    var pixels = [];
    for (var o = 0; o < GW * GH; o++) if (kind[o]) {
      var oc = o % GW, orow = (o - oc) / GW, col = oc + cLo;
      pixels.push({ x: xOf(col), y: yOf(orow + rLo), v: value[o], kind: kind[o], col: col >= 0 && col < C ? col : -1 });
    }
    return { cell: cell, pixels: pixels, streaks: streaks, sliceOf: sliceOf, sliceShift: sliceShift };
  }
  function streak3d(m, k, ctx, cell) {
    var c = ctx.light('b');
    if (k.kind === 'scan') m.quad(lx(k.x), ly(k.y), -cell * 2, Math.PI, k.w, k.len, c, k.a * 1.6, 'peak');
    else if (k.kind === 'bar') m.quad(lx(k.x + k.w / 2), ly(k.y), 0, k.dir < 0 ? 0 : Math.PI, k.w, k.len, c, k.a, 'bars', Math.max(1, Math.round(k.len / cell)));
    else m.quad(lx(k.x), ly(k.y), 0, k.dir < 0 ? 0 : Math.PI, k.w, k.len, c, k.a, 'fade');
  }
  register('mark-glitch', function (m, ctx) {
    var G = { rows: ctx.num('rows', 112), melt: MELT[ctx.P.melt] || MELT.drift, cut: CUT[ctx.P.cut] || CUT.thin, streak: STREAK[ctx.P.streak] || STREAK.lines };
    var g = glitch2d(ctx.mark, ctx.key, G), dzOf = {}, s = g.cell * (1 - ART.gap);
    g.pixels.forEach(function (p) {
      var dz = 0;
      if (p.col >= 0) {
        var sl = g.sliceOf[p.col];
        if (!(sl in dzOf)) dzOf[sl] = g.sliceShift[sl] ? (ctx.rnd() < 0.5 ? -1 : 1) * g.cell * (1 + Math.floor(ctx.rnd() * 4)) : 0;
        dz = dzOf[sl];
      }
      var d = p.kind === 1 ? g.cell * (1.1 + p.v * 2.6) : g.cell * 0.9;
      var z = p.kind === 3 ? (ctx.rnd() - 0.5) * g.cell * 8 : dz + d / 2;
      var cx = lx(p.x + g.cell / 2), cy = ly(p.y + g.cell / 2);
      m.cube(cx, cy, z, s, s, d, ctx.tone('a', p.v));
      if (p.kind !== 3) ctx.cells.push({ x: cx, y: cy, z: z + d / 2, s: g.cell });
    });
    g.streaks.forEach(function (k) { streak3d(m, k, ctx, g.cell); });
  });

  // the mark built other ways, from its grid
  function eachMarkCell(ctx, rows, fn) {
    var g = ctx.markGrid(rows);
    for (var r = 0; r < g.R; r++) for (var c = 0; c < g.C; c++) if (g.cov(r, c) >= 0.5 && g.ok(r, c)) fn(g, r, c);
    return g;
  }
  function pushCell(ctx, x, y, z, s) { ctx.cells.push({ x: x, y: y, z: z, s: s }); }
  function edgeStreaks(m, ctx, g, rate) {
    var c = ctx.light('b');
    for (var col = 0; col < g.C; col++) {
      var top = -1, bot = -1;
      for (var r = 0; r < g.R; r++) if (g.cov(r, col) >= 0.5) { if (top < 0) top = r; bot = r; }
      if (top < 0) continue;
      if (ctx.rnd() < rate) m.quad(g.x(col), g.y(top) + g.cell / 2, 0, 0, 1 + ctx.rnd(), 40 + ctx.rnd() * 220, c, 0.2 + ctx.rnd() * 0.35, 'fade');
      if (ctx.rnd() < rate) m.quad(g.x(col), g.y(bot) - g.cell / 2, 0, Math.PI, 1 + ctx.rnd(), 40 + ctx.rnd() * 220, c, 0.2 + ctx.rnd() * 0.35, 'fade');
    }
  }
  register('mark-solid', function (m, ctx) {
    var s, g = eachMarkCell(ctx, ctx.num('rows', 84), function (g, r, c) {
      if (ctx.rnd() < 0.012) return;
      var v = g.edge(r, c) ? 0.68 + ctx.rnd() * 0.14 : 0.3 + 0.16 * (1 - r / g.R) + ctx.rnd() * 0.06, d = g.cell * 3.2;
      s = g.cell * (1 - ART.gap);
      m.cube(g.x(c), g.y(r), d / 2, s, s, d, ctx.tone('a', v)); pushCell(ctx, g.x(c), g.y(r), d, g.cell);
    });
    edgeStreaks(m, ctx, g, 0.12);
  });
  register('mark-outline', function (m, ctx) {
    var g = eachMarkCell(ctx, ctx.num('rows', 96), function (g, r, c) {
      var s = g.cell * (1 - ART.gap), near = g.edge(r, c) || g.edge(r - 1, c) || g.edge(r + 1, c) || g.edge(r, c - 1) || g.edge(r, c + 1);
      if (near) { var d = g.cell * 4.5; m.cube(g.x(c), g.y(r), d / 2, s, s, d, ctx.tone('a', 0.6 + ctx.rnd() * 0.16)); pushCell(ctx, g.x(c), g.y(r), d, g.cell); }
      else if (ctx.rnd() < 0.3) m.cube(g.x(c), g.y(r), g.cell * 0.3, s, s, g.cell * 0.6, ctx.tone('a', 0.2 + ctx.rnd() * 0.1));
    });
    edgeStreaks(m, ctx, g, 0.18);
  });
  register('mark-halftone', function (m, ctx) {
    var g = ctx.markGrid(ctx.num('rows', 96)), step = 3;
    for (var r = 0; r < g.R; r += step) for (var c = ((r / step) % 2) ? 1 : 0; c < g.C; c += step) {
      var sum = 0;
      for (var i = 0; i < step; i++) for (var j = 0; j < step; j++) sum += g.cov(r + i, c + j);
      var a = sum / (step * step);
      if (a < 0.08 || !g.ok(r, c)) continue;
      var size = step * g.cell * 0.92 * Math.sqrt(a), x = g.x(c) + g.cell, y = g.y(r) - g.cell;
      m.cube(x, y, size * 0.6, size * 0.86, size * 0.86, size * 1.2, ctx.tone('a', 0.2 + 0.22 * a + ctx.rnd() * 0.08)); pushCell(ctx, x, y, size * 1.2, size);
    }
    edgeStreaks(m, ctx, g, 0.08);
  });
  register('mark-stripes', function (m, ctx) {
    var ph = ctx.rnd() * 6, g = eachMarkCell(ctx, ctx.num('rows', 96), function (g, r, c) {
      if (Math.floor(c / 2) % 2) return;
      var s = g.cell * (1 - ART.gap), wave = 0.5 + 0.5 * Math.sin(c * 0.28 + ph), d = g.cell * (1.5 + 2.6 * wave);
      m.cube(g.x(c), g.y(r), d / 2, s, s, d, ctx.tone('a', 0.3 + 0.38 * wave)); pushCell(ctx, g.x(c), g.y(r), d, g.cell);
    });
    edgeStreaks(m, ctx, g, 0.1);
  });
  register('mark-relief', function (m, ctx) {
    var g = ctx.markGrid(ctx.num('rows', 72)), dist = {}, queue = [];
    for (var r = 0; r < g.R; r++) for (var c = 0; c < g.C; c++) if (g.cov(r, c) >= 0.5 && g.edge(r, c)) { dist[r + ',' + c] = 1; queue.push([r, c]); }
    for (var h = 0; h < queue.length; h++) {
      var p = queue[h], dd = dist[p[0] + ',' + p[1]];
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (s) {
        var rr = p[0] + s[0], cc = p[1] + s[1], k = rr + ',' + cc;
        if (g.cov(rr, cc) >= 0.5 && !(k in dist)) { dist[k] = dd + 1; queue.push([rr, cc]); }
      });
    }
    Object.keys(dist).forEach(function (k) {
      var rc = k.split(','), r = +rc[0], c = +rc[1];
      if (!g.ok(r, c)) return;
      var n = Math.min(dist[k], 9), d = g.cell * (0.8 + n * 0.9), s = g.cell * (1 - ART.gap);
      m.cube(g.x(c), g.y(r), d / 2, s, s, d, ctx.tone('a', 0.3 + 0.045 * n + (n === 1 ? 0.26 : 0))); pushCell(ctx, g.x(c), g.y(r), d, g.cell);
    });
    edgeStreaks(m, ctx, g, 0.1);
  });
  register('mark-prism', function (m, ctx) {
    var g = ctx.markGrid(ctx.num('rows', 72)), s = g.cell * (1 - ART.gap);
    [['a', 0, 0, 1], ['b', -2.2, -5, 0.45], ['c', 2.2, -10, 0.45]].forEach(function (copy) {
      for (var r = 0; r < g.R; r++) for (var c = 0; c < g.C; c++) {
        if (g.cov(r, c) < 0.5 || !g.ok(r, c)) continue;
        if (copy[3] < 1 && !g.edge(r, c) && ctx.rnd() > copy[3]) continue;
        var d = g.cell * 2, x = g.x(c) + copy[1] * g.cell, z = copy[2] * g.cell + d / 2;
        m.cube(x, g.y(r), z, s, s, d, copy[0] === 'a' ? ctx.tone('a', 0.55) : ctx.tone(copy[0], 0.8));
        if (copy[0] === 'a') pushCell(ctx, x, g.y(r), z + d / 2, g.cell);
      }
    });
    edgeStreaks(m, ctx, g, 0.1);
  });
  register('mark-glass', function (m, ctx) {
    var edge = ctx.tone('a', 0.95), core = ctx.light('c');
    var g = eachMarkCell(ctx, ctx.num('rows', 40), function (g, r, c) {
      var s = g.cell * 0.86, z = (ctx.rnd() - 0.5) * g.cell * 1.2, rot = [(ctx.rnd() - 0.5) * 0.16, (ctx.rnd() - 0.5) * 0.16, (ctx.rnd() - 0.5) * 0.1];
      m.glass(g.x(c), g.y(r), z, s, s, s, edge, 0.45 + ctx.rnd() * 0.35, rot); pushCell(ctx, g.x(c), g.y(r), z + s / 2, g.cell);
      if (ctx.rnd() < 0.09) m.cube(g.x(c), g.y(r), z, s * 0.4, s * 0.4, s * 0.4, ctx.tone('a', 0.95));
      if (ctx.rnd() < 0.025) m.point(g.x(c), g.y(r), z, g.cell * 3, core, 0.5, true);
    });
    edgeStreaks(m, ctx, g, 0.15);
  });
  register('mark-skyline', function (m, ctx) {
    var g = ctx.markGrid(ctx.num('rows', 78)), lightB = ctx.light('b');
    for (var c = 0; c < g.C; c++) {
      var r = 0;
      while (r < g.R) {
        if (g.cov(r, c) < 0.5 || !g.ok(r, c)) { r++; continue; }
        var r0 = r; while (r < g.R && g.cov(r, c) >= 0.5 && g.ok(r, c)) r++;
        var run = r - r0, y = (g.y(r0) + g.y(r - 1)) / 2, d = g.cell * (1 + ctx.rnd() * 6), v = 0.42 + ctx.rnd() * 0.36;
        m.cube(g.x(c), y, d / 2, g.cell * 0.78, run * g.cell * 0.96, d, ctx.tone('a', v)); pushCell(ctx, g.x(c), g.y(r - 1), d, g.cell);
        if (ctx.rnd() < 0.5) m.bar(g.x(c), y, d + 0.6, 1.2, run * g.cell, 1, lightB, 0.3 + ctx.rnd() * 0.3);
        if (ctx.rnd() < 0.35) m.quad(g.x(c), g.y(r0) + g.cell / 2, d / 2, 0, 1.4, 30 + ctx.rnd() * 160, lightB, 0.35, 'fade');
        if (ctx.rnd() < 0.35) m.quad(g.x(c), g.y(r - 1) - g.cell / 2, d / 2, Math.PI, 1.4, 30 + ctx.rnd() * 160, lightB, 0.35, 'fade');
      }
    }
  });
  register('mark-dust', function (m, ctx) {
    eachMarkCell(ctx, ctx.num('rows', 130), function (g, r, c) {
      var edge = g.edge(r, c), v = edge ? 0.9 : 0.45 + ctx.rnd() * 0.4, x = g.x(c) + (ctx.rnd() - 0.5) * g.cell, y = g.y(r) + (ctx.rnd() - 0.5) * g.cell;
      var z = (ctx.rnd() + ctx.rnd() - 1) * 26;
      m.point(x, y, z, g.cell * (0.6 + ctx.rnd() * 0.6), ctx.tone('a', v), 0.55 + ctx.rnd() * 0.45);
      pushCell(ctx, x, y, z, g.cell);
    });
    for (var i = 0; i < 500; i++) m.point(-200 + ctx.rnd() * 400, -300 + ctx.rnd() * 140, (ctx.rnd() - 0.5) * 60, 1.4 + ctx.rnd() * 1.6, ctx.tone('a', 0.6), 0.2 + ctx.rnd() * 0.4);
  });
  register('mark-chunk', function (m, ctx) {
    var g = ctx.markGrid(ctx.num('rows', 60)), seed = ctx.rnd() * 100;
    function noise(x, y) { return 0.5 + 0.25 * Math.sin(x * 0.9 + seed) * Math.cos(y * 0.7 - seed) + 0.25 * Math.sin((x + y) * 0.37 + seed * 2); }
    for (var r = 0; r < g.R; r++) for (var c = 0; c < g.C; c++) {
      if (g.cov(r, c) < 0.5 || !g.ok(r, c) || ctx.rnd() < 0.06) continue;
      var n = noise(c * 0.3, r * 0.3), d = g.cell * (1 + n * 6) * (ctx.rnd() < 0.03 ? 2.4 : 1), s = g.cell * 0.94;
      var v = g.edge(r, c) ? 0.62 + ctx.rnd() * 0.2 : 0.2 + n * 0.22;
      m.cube(g.x(c), g.y(r), d / 2, s, s, d, ctx.tone('a', v)); pushCell(ctx, g.x(c), g.y(r), d, g.cell);
    }
    edgeStreaks(m, ctx, g, 0.14);
  });

  /* backdrop: far behind the mark */
  register('far-dust', function (m, ctx) {
    for (var i = 0; i < 800; i++) m.point(-260 + ctx.rnd() * 580, -340 + ctx.rnd() * 680, -140 - ctx.rnd() * 280, 1 + ctx.rnd() * 1.6, ctx.tone('a', 0.8), 0.15 + ctx.rnd() * 0.45);
  });
  register('far-grid', function (m, ctx) {
    var z = -240, c = ctx.light('c');
    for (var x = -260; x <= 320; x += 46) { var p = []; for (var y = -340; y <= 340; y += 20) p.push(x, y, z); m.line(p, c, 0.14); }
    for (var y2 = -322; y2 <= 330; y2 += 46) { var q = []; for (var x2 = -260; x2 <= 320; x2 += 20) q.push(x2, y2, z); m.line(q, c, 0.14); }
    for (var a = -260; a <= 320; a += 46) for (var b = -322; b <= 330; b += 46) if (ctx.rnd() < 0.35) m.point(a, b, z, 2.4, c, 0.5);
  });
  register('rays', function (m, ctx) {
    var n = 30 + Math.floor(ctx.rnd() * 14), c = ctx.light('b');
    for (var i = 0; i < n; i++) {
      var ang = ctx.rnd() * Math.PI * 2, r0 = 90 + ctx.rnd() * 40;
      m.quad(-Math.sin(ang) * r0, Math.cos(ang) * r0, -200, ang, 1.2 + ctx.rnd() * 1.8, 260 + ctx.rnd() * 200, c, 0.1 + ctx.rnd() * 0.18, 'fade');
    }
  });
  register('nebula', function (m, ctx) {
    var n = 3 + Math.floor(ctx.rnd() * 3), cb = ctx.light('b'), cc = ctx.light('c');
    for (var k = 0; k < n; k++) {
      var cx = -180 + ctx.rnd() * 420, cy = -260 + ctx.rnd() * 520, cz = -260 + ctx.rnd() * 120, rad = 70 + ctx.rnd() * 80;
      for (var i = 0; i < 450; i++) {
        var g1 = (ctx.rnd() + ctx.rnd() + ctx.rnd() - 1.5), g2 = (ctx.rnd() + ctx.rnd() + ctx.rnd() - 1.5), g3 = (ctx.rnd() + ctx.rnd() + ctx.rnd() - 1.5), t = ctx.rnd();
        var col = [cb[0] * t + cc[0] * (1 - t), cb[1] * t + cc[1] * (1 - t), cb[2] * t + cc[2] * (1 - t)];
        m.point(cx + g1 * rad, cy + g2 * rad, cz + g3 * rad * 0.6, 1.5 + ctx.rnd() * 3, col, 0.15 + ctx.rnd() * 0.45, ctx.rnd() < 0.2);
      }
      for (var j = 0; j < 14; j++) { var s = 5 + ctx.rnd() * 7; m.cube(cx + (ctx.rnd() - 0.5) * rad * 1.4, cy + (ctx.rnd() - 0.5) * rad * 1.4, cz, s, s, s, ctx.tone('a', 0.2 + ctx.rnd() * 0.12)); }
    }
  });
  register('wave', function (m, ctx) {
    var ph = ctx.rnd() * 6, ca = ctx.light('a'), cb = ctx.light('b');
    for (var k = 0; k < 12; k++) {
      var y0 = -40 + k * 9, line = [];
      for (var i = 0; i <= 140; i++) {
        var x = -300 + i * 4.6, y = y0 + 90 * Math.sin(x * 0.011 + ph + k * 0.12) * (0.6 + 0.4 * Math.sin(x * 0.004 + ph));
        var z = -180 + k * 6;
        if (i % 2 === 0) m.point(x, y, z, 1.4 + ctx.rnd(), k % 3 ? ca : cb, 0.25 + 0.5 * Math.sin(Math.PI * i / 140));
        line.push(x, y, z);
      }
      if (k % 4 === 0) m.line(line, cb, 0.2);
    }
  });
  register('galaxy', function (m, ctx) {
    var ax = 0.3, az = -0.25 + (ctx.rnd() - 0.5) * 0.3, ca = ctx.light('a'), cb = ctx.light('b');
    for (var i = 0; i < 1600; i++) {
      var r = 70 + 270 * Math.pow(ctx.rnd(), 0.8), t = ctx.rnd() * Math.PI * 2 + r * 0.012;
      var p = rotXZ(r * Math.cos(t), (ctx.rnd() - 0.5) * 10, r * Math.sin(t), ax, az);
      m.point(p[0], p[1], p[2] - 60, 1 + ctx.rnd() * 1.8, ctx.rnd() < 0.3 ? cb : ca, 0.2 + 0.6 * (1 - r / 340));
    }
    m.point(0, 0, -60, 120, ctx.light('c'), 0.4, true);
    for (var j = 0; j < 10; j++) { var q = rotXZ(150 + ctx.rnd() * 160, 0, 0, ax, az + ctx.rnd() * 6.28); m.quad(q[0], q[1], q[2] - 60, 0, 1.4, 60 + ctx.rnd() * 160, cb, 0.35, 'fade'); }
  });
  register('plates', function (m, ctx) {
    var edge = ctx.tone('a', 0.95);
    for (var k = 0; k < 3; k++) m.glass(0, -160 - k * 42, -120, 380 - k * 40, 4, 300 - k * 30, edge, 0.55, [0.62, 0.78, 0]);
    m.cube(0, -150, -120, 12, 12, 12, ctx.tone('a', 0.98));
    m.point(0, -150, -120, 80, ctx.light('c'), 0.5, true);
    for (var i = 0; i < 6; i++) m.quad((ctx.rnd() - 0.5) * 60, -150, -120, 0, 1.5 + ctx.rnd() * 3, 120 + ctx.rnd() * 220, ctx.light('b'), 0.4, 'fade');
  });
  register('ripple', function (m, ctx) {
    var cb = ctx.light('b');
    [60, 110, 160, 215, 270, 330].forEach(function (r, i) {
      m.line(ring(r, 160, 0.32, 0, 0, -300, -20), cb, 0.5 - i * 0.065, true);
      for (var j = 0; j < 8; j++) { var t = ctx.rnd() * Math.PI * 2, p = rotXZ(r * Math.cos(t), 0, r * Math.sin(t), 0.32, 0); m.point(p[0], p[1] - 300, p[2] - 20, 2.5, cb, 0.7); }
    });
    m.point(0, -300, -20, 90, ctx.light('c'), 0.55, true);
  });
  register('far-skyline', function (m, ctx) {
    var ph = ctx.rnd() * 6, cb = ctx.light('b');
    for (var x = -280; x <= 330; x += 11) {
      var h = 40 + 220 * (0.5 + 0.3 * Math.sin(x * 0.02 + ph) + 0.2 * Math.sin(x * 0.07 + ph * 2)) * (0.7 + ctx.rnd() * 0.3);
      m.bar(x, -330 + h / 2, -170, 5, h, 5, cb, 0.18 + ctx.rnd() * 0.22);
      m.point(x, -330 + h, -170, 6, cb, 0.6, true);
    }
  });

  /* aura: structures around the mark */
  register('rings', function (m, ctx) {
    var n = 2 + (ctx.rnd() < 0.5 ? 1 : 0), cb = ctx.light('b');
    for (var i = 0; i < n; i++) {
      var r = 250 + ctx.rnd() * 50, ax = 0.22 + ctx.rnd() * 0.2, az = (ctx.rnd() - 0.5) * 0.7, oy = (ctx.rnd() - 0.5) * 80, pts = ring(r, 180, ax, az, 0, oy, 0);
      m.line(pts, cb, 0.35 + ctx.rnd() * 0.25, true);
      for (var j = 0; j < 30; j++) { var k = Math.floor(ctx.rnd() * 180) * 3; m.point(pts[k], pts[k + 1], pts[k + 2], 2 + ctx.rnd() * 2, cb, 0.8); }
      for (var g = 0; g < 1 + Math.floor(ctx.rnd() * 2); g++) { var q = Math.floor(ctx.rnd() * 180) * 3, s = 10 + ctx.rnd() * 8; m.glass(pts[q], pts[q + 1], pts[q + 2], s, s, s, ctx.tone('a', 0.95), 0.8, [ctx.rnd(), ctx.rnd(), ctx.rnd()]); }
    }
  });
  register('orbit', function (m, ctx) {
    var cb = ctx.light('b');
    [[270, 0.3, -0.45], [305, 0.38, 0.4]].forEach(function (o) {
      var pts = ring(o[0], 200, o[1], o[2] + (ctx.rnd() - 0.5) * 0.2, 0, 0, 0);
      m.line(pts, cb, 0.45, true);
      for (var i = 0; i < 4; i++) {
        var k = Math.floor(ctx.rnd() * 200) * 3, s = 16 + ctx.rnd() * 12;
        m.glass(pts[k], pts[k + 1], pts[k + 2], s, s, s, ctx.tone('a', 0.95), 0.85, [ctx.rnd() * 3, ctx.rnd() * 3, 0]);
        m.point(pts[k], pts[k + 1], pts[k + 2], s * 2.2, ctx.light('c'), 0.25, true);
      }
      for (var j = 0; j < 24; j++) { var q = Math.floor(ctx.rnd() * 200) * 3; m.point(pts[q], pts[q + 1], pts[q + 2], 2.2, cb, 0.8); }
    });
  });
  register('halo', function (m, ctx) {
    var bands = 1 + (ctx.rnd() < 0.5 ? 1 : 0), cb = ctx.light('b');
    for (var b = 0; b < bands; b++) {
      var R = 270 + b * 40, ax = 0.28 + ctx.rnd() * 0.1, az = (ctx.rnd() - 0.5) * 0.5;
      for (var i = 0; i < 700; i++) {
        var t = ctx.rnd() * Math.PI * 2, r = R + (ctx.rnd() + ctx.rnd() - 1) * 16, p = rotXZ(r * Math.cos(t), (ctx.rnd() - 0.5) * 10, r * Math.sin(t), ax, az);
        m.point(p[0], p[1], p[2], 1.2 + ctx.rnd() * 2, cb, 0.3 + ctx.rnd() * 0.6);
      }
      m.line(ring(R, 180, ax, az), cb, 0.22, true);
    }
  });
  register('belt', function (m, ctx) {
    var R = 280, ax = 0.3, az = (ctx.rnd() - 0.5) * 0.6;
    for (var i = 0; i < 140; i++) {
      var t = ctx.rnd() * Math.PI * 2, r = R + (ctx.rnd() + ctx.rnd() - 1) * 24, p = rotXZ(r * Math.cos(t), (ctx.rnd() - 0.5) * 16, r * Math.sin(t), ax, az), s = 4 + ctx.rnd() * 7;
      if (ctx.rnd() < 0.1) m.glass(p[0], p[1], p[2], s * 2, s * 2, s * 2, ctx.tone('a', 0.95), 0.8, [ctx.rnd() * 3, ctx.rnd() * 3, ctx.rnd() * 3]);
      else m.cube(p[0], p[1], p[2], s, s, s, ctx.tone('a', 0.5 + ctx.rnd() * 0.45), [ctx.rnd() * 3, ctx.rnd() * 3, ctx.rnd() * 3]);
    }
    m.line(ring(R, 180, ax, az), ctx.light('b'), 0.18, true);
  });
  register('cage', function (m, ctx) {
    var cb = ctx.light('b'), R = 235, n = 16, top = ring(R, n * 8, 0.28, 0, 0, 255, 0), bot = ring(R, n * 8, 0.28, 0, 0, -255, 0);
    m.line(top, cb, 0.5, true); m.line(bot, cb, 0.5, true);
    for (var i = 0; i < n; i++) {
      var k = i * 8 * 3;
      m.line([top[k], top[k + 1], top[k + 2], bot[k], bot[k + 1], bot[k + 2]], cb, 0.28);
      if (ctx.rnd() < 0.35) m.bar(top[k], 0, top[k + 2], 3, 500, 3, cb, 0.25);
      m.cube(top[k], top[k + 1], top[k + 2], 6, 6, 6, ctx.tone('a', 0.9)); m.cube(bot[k], bot[k + 1], bot[k + 2], 6, 6, 6, ctx.tone('a', 0.9));
    }
  });
  register('crown', function (m, ctx) {
    var cb = ctx.light('b'), pts = ring(255, 180, 0.3, 0, 0, -215, 0), n = 30 + Math.floor(ctx.rnd() * 16);
    m.line(pts, cb, 0.5, true);
    for (var i = 0; i < n; i++) {
      var k = Math.floor(ctx.rnd() * 180) * 3, h = 60 + ctx.rnd() * 260, w = 3 + ctx.rnd() * 4;
      m.bar(pts[k], pts[k + 1] + h / 2, pts[k + 2], w, h, w, cb, 0.25 + ctx.rnd() * 0.3);
      m.quad(pts[k], pts[k + 1] + h, pts[k + 2], 0, 1.2, 30 + ctx.rnd() * 90, cb, 0.4, 'fade');
    }
    for (var j = 0; j < 30; j++) { var q = Math.floor(ctx.rnd() * 180) * 3; m.point(pts[q], pts[q + 1], pts[q + 2], 2.5, ctx.light('c'), 0.9); }
  });
  register('tower', function (m, ctx) {
    var cb = ctx.light('b');
    for (var i = 0; i < 6; i++) {
      var y = -270 + i * 108, r = 110 + (i % 2) * 120 + ctx.rnd() * 40;
      m.line(ring(r, 160, 0.25, 0, 0, y, 0), cb, 0.32 + ctx.rnd() * 0.25, true);
      for (var j = 0; j < 6; j++) { var t = ctx.rnd() * 6.28, p = rotXZ(r * Math.cos(t), 0, r * Math.sin(t), 0.25, 0); m.point(p[0], p[1] + y, p[2], 2.6, cb, 0.8); }
    }
    for (var k = 0; k < 10; k++) m.quad((ctx.rnd() - 0.5) * 120, -340, (ctx.rnd() - 0.5) * 60, 0, 1 + ctx.rnd() * 2, 680, cb, 0.15 + ctx.rnd() * 0.3, 'peak');
  });
  register('sphere', function (m, ctx) {
    var R = 285, n = 1100, ga = Math.PI * (3 - Math.sqrt(5)), ca = ctx.tone('a', 0.9);
    for (var i = 0; i < n; i++) {
      var y = 1 - (i / (n - 1)) * 2, rr = Math.sqrt(1 - y * y), t = ga * i, x = Math.cos(t) * rr, z = Math.sin(t) * rr;
      var limb = 1 - Math.abs(z);
      if (ctx.rnd() < 0.05) { var s = 3 + ctx.rnd() * 4; m.cube(x * R, y * R, z * R - 20, s, s, s, ctx.tone('a', 0.6 + ctx.rnd() * 0.3)); }
      else m.point(x * R, y * R, z * R - 20, 1.4 + ctx.rnd() * 1.6, ca, 0.15 + 0.75 * Math.pow(limb, 1.5));
    }
  });
  register('planet', function (m, ctx) {
    var cb = ctx.light('b');
    m.sphere(0, 0, -70, 215, cb, 0.45);
    var pts = ring(330, 200, 0.28, -0.32, 0, 0, -70);
    m.line(pts, cb, 0.45, true);
    for (var i = 0; i < 6; i++) { var k = Math.floor(ctx.rnd() * 200) * 3, s = 10 + ctx.rnd() * 10; m.glass(pts[k], pts[k + 1], pts[k + 2], s, s, s, ctx.tone('a', 0.95), 0.85, [ctx.rnd() * 3, ctx.rnd() * 3, 0]); }
    for (var j = 0; j < 40; j++) { var q = Math.floor(ctx.rnd() * 200) * 3; m.point(pts[q], pts[q + 1], pts[q + 2], 2, cb, 0.7); }
  });
  register('helix', function (m, ctx) {
    var cb = ctx.light('b'), ph = ctx.rnd() * 6;
    [0, Math.PI].forEach(function (off) {
      var line = [];
      for (var i = 0; i < 420; i++) {
        var t = i / 419, a = t * Math.PI * 6 + off + ph, x = 235 * Math.cos(a), z = 235 * Math.sin(a), y = -310 + t * 620;
        m.point(x, y, z, 1.6 + ctx.rnd() * 1.6, cb, 0.4 + 0.5 * (z > 0 ? 1 : 0.5));
        line.push(x, y, z);
      }
      m.line(line, cb, 0.22);
    });
    m.quad(0, -340, -40, 0, 3, 680, cb, 0.35, 'peak');
  });
  register('atom', function (m, ctx) {
    var cb = ctx.light('b'), cc = ctx.light('c');
    [0, 1.05, -1.05].forEach(function (az) {
      var pts = ring(290, 200, 0.32, az, 0, 0, 0);
      m.line(pts, cb, 0.4, true);
      var k = Math.floor(ctx.rnd() * 200) * 3;
      m.point(pts[k], pts[k + 1], pts[k + 2], 7, cc, 1); m.point(pts[k], pts[k + 1], pts[k + 2], 40, cc, 0.4, true);
    });
  });
  register('cross', function (m, ctx) {
    var cb = ctx.light('b'), a = 0.78 + ctx.rnd() * 0.12;
    [a, -a].forEach(function (ang) {
      var d = [Math.sin(ang), Math.cos(ang), 0];
      m.rod(-d[0] * 350, -d[1] * 350, -60, d, 700, 9, cb, 0.45);
      m.quad(-d[0] * 350, -d[1] * 350, -62, -ang, 30, 700, cb, 0.1, 'peak');
    });
    m.point(0, 0, -60, 90, ctx.light('c'), 0.6, true);
  });

  /* signal: light */
  register('rain', function (m, ctx) {
    var n = 70 + Math.floor(ctx.rnd() * 30), cb = ctx.light('b');
    for (var i = 0; i < n; i++) {
      var len = 120 + ctx.rnd() * 340, bars = ctx.rnd() < 0.12;
      m.quad(-250 + ctx.rnd() * 560, 200 + ctx.rnd() * 145, -80 + ctx.rnd() * 160, Math.PI, bars ? 4 : 1 + ctx.rnd() * 1.6, len, cb, 0.15 + ctx.rnd() * 0.35, bars ? 'bars' : 'fade', Math.round(len / 6));
    }
  });
  register('bars', function (m, ctx) {
    var n = 22 + Math.floor(ctx.rnd() * 10), cb = ctx.light('b');
    for (var i = 0; i < n; i++) {
      var x = -260 + ctx.rnd() * 560, y = (ctx.rnd() - 0.5) * 400, h = 60 + ctx.rnd() * 300, w = 3 + ctx.rnd() * 6, z = -60 + ctx.rnd() * 140;
      m.bar(x, y, z, w, h, w, cb, 0.2 + ctx.rnd() * 0.3);
      m.quad(x, y + h / 2, z, 0, 1.2, 40 + ctx.rnd() * 120, cb, 0.4, 'fade');
    }
  });
  register('beams', function (m, ctx) {
    var n = 3 + Math.floor(ctx.rnd() * 4), cb = ctx.light('b');
    for (var i = 0; i < n; i++) m.quad(-200 + ctx.rnd() * 460, -345, -100, 0, 18 + ctx.rnd() * 32, 690, cb, 0.05 + ctx.rnd() * 0.07, 'peak');
  });
  register('scan', function (m, ctx) {
    var n = 80 + Math.floor(ctx.rnd() * 30), cb = ctx.light('b');
    for (var i = 0; i < n; i++) { var hot = ctx.rnd() < 0.15; m.quad(-250 + ctx.rnd() * 560, 60 + ctx.rnd() * 280, (ctx.rnd() - 0.5) * 60, Math.PI, hot ? 1.4 : 0.9, 250 + ctx.rnd() * 350, cb, hot ? 0.1 + ctx.rnd() * 0.08 : 0.03 + ctx.rnd() * 0.06, 'peak'); }
  });
  register('burst', function (m, ctx) {
    var cx = (ctx.rnd() - 0.5) * 40, cy = (ctx.rnd() - 0.5) * 40, cz = -40, n = 46 + Math.floor(ctx.rnd() * 24), cc = ctx.light('c'), ca = ctx.tone('a', 0.95);
    for (var i = 0; i < n; i++) {
      var d = [ctx.rnd() * 2 - 1, ctx.rnd() * 2 - 1, (ctx.rnd() * 2 - 1) * 0.6], len = 110 + ctx.rnd() * 190, nn = Math.hypot(d[0], d[1], d[2]) || 1;
      m.rod(cx, cy, cz, d, len, 3 + ctx.rnd() * 3, i % 2 ? cc : ca, 0.3 + ctx.rnd() * 0.3);
      if (ctx.rnd() < 0.3) { var s = 6 + ctx.rnd() * 6; m.glass(cx + d[0] / nn * len, cy + d[1] / nn * len, cz + d[2] / nn * len, s, s, s, ca, 0.8, [ctx.rnd() * 3, ctx.rnd() * 3, 0]); }
    }
    m.point(cx, cy, cz, 150, cc, 0.55, true); m.point(cx, cy, cz, 46, cc, 0.95, true);
  });
  register('fountain', function (m, ctx) {
    var cb = ctx.light('b'), ph = ctx.rnd() * 6;
    for (var i = 0; i < 1300; i++) {
      var t = Math.pow(ctx.rnd(), 0.65), y = -300 + t * 580, rad = 18 + t * 150 * (0.4 + 0.6 * ctx.rnd()), a = t * 11 + ctx.rnd() * 0.8 + ph;
      m.point(rad * Math.cos(a), y, rad * Math.sin(a), 1.2 + ctx.rnd() * 1.6, cb, 0.1 + 0.8 * Math.pow(1 - t, 0.6));
    }
    m.point(0, -300, 0, 110, ctx.light('c'), 0.7, true);
    [40, 80, 125, 170].forEach(function (r, k) { m.line(ring(r, 120, 0.3, 0, 0, -300, 0), cb, 0.5 - k * 0.1, true); });
  });
  register('drip', function (m, ctx) {
    var cols = {};
    ctx.cells.forEach(function (c) { var k = Math.round(c.x / 4); if (!cols[k] || c.y < cols[k].y) cols[k] = c; });
    Object.keys(cols).forEach(function (k) {
      if (ctx.rnd() > 0.3) return;
      var c = cols[k], n = 3 + Math.floor(ctx.rnd() * 14), s = c.s * 0.86;
      for (var i = 1; i <= n; i++) m.cube(c.x, c.y - i * c.s, c.z - s / 2, s, s, s, ctx.tone('b', 0.85 * (1 - i / (n + 1)) + 0.1));
    });
  });
  register('static', function (m, ctx) {
    for (var i = 0; i < 420; i++) { var s = 2 + ctx.rnd() * 3; m.cube(-260 + ctx.rnd() * 560, -310 + ctx.rnd() * 620, -90 + ctx.rnd() * 200, s, s, s, ctx.tone('a', 0.3 + ctx.rnd() * 0.65), [ctx.rnd() * 3, ctx.rnd() * 3, 0]); }
  });
  register('flare', function (m, ctx) {
    var y = -60 + ctx.rnd() * 140, cc = ctx.light('c');
    m.quad(-280, y, 60, -Math.PI / 2, 2.4, 600, cc, 0.75, 'peak');
    m.quad(-280, y, 59, -Math.PI / 2, 16, 600, cc, 0.1, 'peak');
    m.quad(0, y - 110, 60, 0, 1.6, 220, cc, 0.5, 'peak');
    m.point(0, y, 60, 70, cc, 0.8, true); m.point(0, y, 60, 10, [1, 1, 1], 1, true);
  });
  register('pillar', function (m, ctx) {
    var x = (ctx.rnd() - 0.5) * 60, cb = ctx.light('b');
    m.quad(x, -345, -50, 0, 70, 690, cb, 0.1, 'peak'); m.quad(x, -345, -50, 0, 22, 690, cb, 0.2, 'peak'); m.quad(x, -345, -50, 0, 4, 690, cb, 0.55, 'peak');
    for (var i = 0; i < 5; i++) m.line(ring(50 + ctx.rnd() * 60, 100, 0.3, 0, x, -250 + i * 125, -50), cb, 0.4 + ctx.rnd() * 0.2, true);
  });
  register('aurora', function (m, ctx) {
    var ph = ctx.rnd() * 6, cb = ctx.light('b'), cc = ctx.light('c');
    for (var k = 0; k < 50; k++) {
      var s = k / 49, col = [cb[0] * (1 - s) + cc[0] * s, cb[1] * (1 - s) + cc[1] * s, cb[2] * (1 - s) + cc[2] * s];
      m.quad(-270 + s * 590, -120 + 80 * Math.sin(s * 5 + ph), -120 + 60 * Math.sin(s * 7 + ph), 0, 10 + ctx.rnd() * 6, 220 + ctx.rnd() * 160, col, 0.05 + ctx.rnd() * 0.09, 'peak');
    }
  });

  /* particles: in front */
  register('dust', function (m, ctx) {
    for (var i = 0; i < 320; i++) m.point(-260 + ctx.rnd() * 570, -320 + ctx.rnd() * 640, 10 + ctx.rnd() * 150, 1 + ctx.rnd() * 2, ctx.light('a'), 0.3 + ctx.rnd() * 0.6);
  });
  register('sparks', function (m, ctx) {
    var n = 12 + Math.floor(ctx.rnd() * 7);
    for (var i = 0; i < n; i++) {
      var x = -240 + ctx.rnd() * 530, y = -300 + ctx.rnd() * 600, z = 20 + ctx.rnd() * 120, c = ctx.rnd() < 0.5 ? ctx.light('a') : ctx.light('c'), l = 14 + ctx.rnd() * 26;
      m.point(x, y, z, 16 + ctx.rnd() * 14, c, 0.45, true); m.point(x, y, z, 3, [1, 1, 1], 1);
      for (var a = 0; a < 4; a++) m.quad(x, y, z, a * Math.PI / 2, 1.2, l, c, 0.8, 'fade');
    }
  });
  register('glass-cubes', function (m, ctx) {
    var n = 10 + Math.floor(ctx.rnd() * 13);
    for (var i = 0; i < n; i++) {
      var s = 12 + ctx.rnd() * 24, x = -260 + ctx.rnd() * 560, y = -300 + ctx.rnd() * 600, z = 20 + ctx.rnd() * 130;
      m.glass(x, y, z, s, s, s, ctx.tone('a', 0.95), 0.5 + ctx.rnd() * 0.3, [ctx.rnd() * 3, ctx.rnd() * 3, ctx.rnd() * 3]);
      if (ctx.rnd() < 0.2) m.point(x, y, z, s * 1.6, ctx.light('c'), 0.5, true);
    }
  });
  register('embers', function (m, ctx) {
    var n = 8 + Math.floor(ctx.rnd() * 9), cc = ctx.light('c');
    for (var i = 0; i < n; i++) {
      var s = 6 + ctx.rnd() * 8, x = -250 + ctx.rnd() * 550, y = -300 + ctx.rnd() * 600, z = 20 + ctx.rnd() * 120;
      m.cube(x, y, z, s, s, s, cc, [ctx.rnd() * 3, ctx.rnd() * 3, 0]); m.point(x, y, z, s * 5, cc, 0.4, true);
    }
  });
  register('core', function (m, ctx) {
    var cx = (ctx.rnd() - 0.5) * 40, cy = (ctx.rnd() - 0.5) * 60, cz = 80, rx = 0.5, ry = 0.6, edge = ctx.tone('a', 0.95), cc = ctx.light('c');
    for (var i = -1; i <= 1; i++) for (var j = -1; j <= 1; j++) for (var k = -1; k <= 1; k++) {
      if (ctx.rnd() < 0.25) continue;
      var p = rotXZ(i * 30 + (ctx.rnd() - 0.5) * 6, j * 30, k * 30, rx, ry);
      m.glass(cx + p[0], cy + p[1], cz + p[2], 26, 26, 26, edge, 0.75, [rx, ry, 0]);
    }
    m.point(cx, cy, cz, 120, cc, 0.7, true); m.point(cx, cy, cz, 34, cc, 1, true);
  });
  register('stream', function (m, ctx) {
    var ca = ctx.light('a'), cb = ctx.light('b');
    for (var i = 0; i < 1400; i++) {
      var t = ctx.rnd(), bx = 300 - t * 560, by = 300 - t * 620, spread = 40 * (0.4 + Math.sin(Math.PI * t)), g = (ctx.rnd() + ctx.rnd() - 1);
      m.point(bx + g * spread * 0.8, by - g * spread * 0.6, 40 + (ctx.rnd() + ctx.rnd() - 1) * 40, 1 + ctx.rnd() * 2, ctx.rnd() < 0.8 ? ca : cb, 0.3 + ctx.rnd() * 0.6);
    }
    for (var j = 0; j < 18; j++) { var u = ctx.rnd(), s = 4 + ctx.rnd() * 7; m.cube(300 - u * 560 + (ctx.rnd() - 0.5) * 60, 300 - u * 620 + (ctx.rnd() - 0.5) * 60, 40 + (ctx.rnd() - 0.5) * 60, s, s, s, ctx.tone('a', 0.6 + ctx.rnd() * 0.35), [ctx.rnd() * 3, ctx.rnd() * 3, 0]); }
  });
  register('satellites', function (m, ctx) {
    var ax = 0.34, az = (ctx.rnd() - 0.5) * 0.8, n = 8 + Math.floor(ctx.rnd() * 7), cb = ctx.light('b');
    m.line(ring(300, 180, ax, az), cb, 0.12, true);
    for (var i = 0; i < n; i++) {
      var t = ctx.rnd() * Math.PI * 2, s = 5 + ctx.rnd() * 5;
      var p = rotXZ(300 * Math.cos(t), 0, 300 * Math.sin(t), ax, az);
      m.cube(p[0], p[1], p[2], s, s, s, ctx.tone('a', 0.8 + ctx.rnd() * 0.2), [ctx.rnd() * 3, ctx.rnd() * 3, 0]);
      for (var k = 1; k <= 8; k++) { var q = rotXZ(300 * Math.cos(t - k * 0.02), 0, 300 * Math.sin(t - k * 0.02), ax, az); m.point(q[0], q[1], q[2], 2, cb, 0.6 * (1 - k / 9)); }
    }
  });
  register('comet', function (m, ctx) {
    var hx = 120 + ctx.rnd() * 140, hy = 150 + ctx.rnd() * 130, hz = 90, d = [-0.62, -0.78], cc = ctx.light('c');
    for (var i = 0; i < 260; i++) { var t = ctx.rnd(), sp = 4 + t * 40; m.point(hx + d[0] * t * 300 + (ctx.rnd() - 0.5) * sp, hy + d[1] * t * 300 + (ctx.rnd() - 0.5) * sp, hz + (ctx.rnd() - 0.5) * sp, 1 + ctx.rnd() * 1.6, ctx.light('a'), 0.8 * (1 - t)); }
    m.quad(hx, hy, hz, Math.atan2(-d[0], d[1]), 2, 260, cc, 0.6, 'fade');
    m.point(hx, hy, hz, 40, cc, 0.9, true); m.cube(hx, hy, hz, 7, 7, 7, ctx.tone('a', 1), [0.5, 0.6, 0]);
  });
  register('bits', function (m, ctx) {
    var cols = 6 + Math.floor(ctx.rnd() * 5);
    for (var c = 0; c < cols; c++) {
      var x = -250 + ctx.rnd() * 550, z = ctx.rnd() * 120, y = 300 - ctx.rnd() * 100, n = 10 + Math.floor(ctx.rnd() * 9);
      for (var i = 0; i < n; i++) { y -= 14 + ctx.rnd() * 8; var flip = ctx.rnd() < 0.5; m.cube(x, y, z, flip ? 6 : 3, flip ? 3 : 6, 3, ctx.tone('a', 0.4 + ctx.rnd() * 0.6)); }
    }
  });
  register('moons', function (m, ctx) {
    var n = 3 + Math.floor(ctx.rnd() * 3);
    for (var i = 0; i < n; i++) {
      var r = 14 + ctx.rnd() * 20, x = -230 + ctx.rnd() * 520, y = -290 + ctx.rnd() * 580, z = 40 + ctx.rnd() * 80, c = ctx.rnd() < 0.5 ? ctx.light('a') : ctx.light('b');
      m.sphere(x, y, z, r, c, 0.9);
      if (i === 0) m.line(ring(r * 1.8, 80, 0.3, 0.3, x, y, z), c, 0.5, true);
    }
  });
  register('shards', function (m, ctx) {
    var n = 6 + Math.floor(ctx.rnd() * 7);
    for (var i = 0; i < n; i++) m.glass(-250 + ctx.rnd() * 550, -290 + ctx.rnd() * 580, 30 + ctx.rnd() * 120, 30 + ctx.rnd() * 30, 2 + ctx.rnd(), 18 + ctx.rnd() * 18, ctx.tone('a', 0.95), 0.7, [ctx.rnd() * 3, ctx.rnd() * 3, ctx.rnd() * 3]);
  });

  // any drawing: every filled cell of the element's own SVG becomes a block, a glass cube or a point
  var rasterCache = {};
  function raster(svgText, cell) {
    var key = cell + '|' + svgText;
    if (rasterCache[key]) return rasterCache[key];
    rasterCache[key] = new Promise(function (resolve) {
      var doc = new DOMParser().parseFromString(svgText, 'image/svg+xml'), root = doc.documentElement;
      Array.prototype.forEach.call(doc.querySelectorAll('[data-sketch]'), function (n) { n.parentNode.removeChild(n); });
      var GW = Math.ceil(W / cell), GH = Math.ceil(H / cell), S = 4;
      root.setAttribute('width', GW * S); root.setAttribute('height', GH * S);
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas'); c.width = GW * S; c.height = GH * S;
        var x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, GW * S, GH * S);
        var d = x.getImageData(0, 0, GW * S, GH * S).data, out = [];
        for (var gy = 0; gy < GH; gy++) for (var gx = 0; gx < GW; gx++) {
          var a = 0, lum = 0;
          for (var sy = 0; sy < S; sy++) for (var sx = 0; sx < S; sx++) {
            var o = ((gy * S + sy) * GW * S + gx * S + sx) * 4, al = d[o + 3] / 255;
            a += al; lum += al * (0.2126 * d[o] + 0.7152 * d[o + 1] + 0.0722 * d[o + 2]) / 255;
          }
          a /= S * S;
          if (a > 0.4) out.push({ x: (gx + 0.5) * cell, y: (gy + 0.5) * cell, v: lum / (a * S * S) });
        }
        resolve(out);
      };
      img.onerror = function () { console.error('Art3D: an element drawing did not load. Check that it is a valid SVG.'); resolve([]); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(root));
    });
    return rasterCache[key];
  }
  register('extrude', function (m, ctx) {
    var cell = ctx.num('cell', 6), as = ctx.P.as || 'cubes', z0 = ctx.num('z', 0), depth = ctx.num('depth', cell), scatter = ctx.num('scatter', 0), slot = ctx.P.tint || 'a';
    return raster(ctx.el.svg || '', cell).then(function (cells) {
      cells.forEach(function (p) {
        if (p.x < ART.calmFrom || inQuiet(p.x, p.y, 4) || ctx.rnd() < 0.03) return;
        var x = lx(p.x), y = ly(p.y), z = z0 + (ctx.rnd() - 0.5) * scatter, v = Math.max(0.15, p.v) * (0.85 + ctx.rnd() * 0.3);
        if (as === 'points') m.point(x, y, z, cell * 0.6, ctx.tone(slot, Math.max(v, 0.7)), Math.min(1, v));
        else if (as === 'glass') m.glass(x, y, z, cell * 0.9, cell * 0.9, depth, ctx.tone(slot, 0.95), 0.6);
        else m.cube(x, y, z + depth / 2, cell * (1 - ART.gap), cell * (1 - ART.gap), depth, ctx.tone(slot, v));
      });
    });
  });

  /* ---------- build one card's model ---------- */
  function hashName(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0; return h >>> 0; }
  function build(mark, key, picks) {
    var model = new Model(), pal = palette(picks.palette), cells = [];
    var chain = Promise.resolve();
    T.LAYERS.forEach(function (layer) {
      var el = picks[layer.key];
      if (!el || el.kind !== 'build') return;
      chain = chain.then(function () { return T.need(el); }).then(function () {
        var fn = BUILDERS[el.attrs.build];
        if (!fn) {
          console.error('Art3D: ' + layer.folder + '/' + el.file + ' names the builder "' + el.attrs.build + '", and no builder has that name. ' +
            'Use data-build="extrude" to build the drawing itself, or load the script that registers it.');
          return;
        }
        var ctx = {
          el: el, P: el.attrs, key: key, mark: mark, cells: cells, pal: pal,
          rnd: T.prng(key, hashName(layer.key + '|' + el.name)),
          num: function (n, d) { var v = parseFloat(el.attrs[n]); return isFinite(v) ? v : d; },
          tone: function (slot, v) { return tone(pal, slot, v); },
          light: function (slot) { return light(pal, slot); },
          ring: ring, markGrid: function (rows) { return markGrid(mark, rows); },
          clear: clear, seen: seen,
          clearAt: function (x, y, z, pad) { var p = seen(x, y, z); return clear(p[0], p[1], pad); }
        };
        var before = { cubes: model.cubes.length, glasses: model.glasses.length, points: model.points.length };
        function noteMark() {
          if (layer.key === 'mark') model.markRange = { cubes: [before.cubes, model.cubes.length], glasses: [before.glasses, model.glasses.length], points: [before.points, model.points.length] };
        }
        var r = fn(model, ctx);
        return r && typeof r.then === 'function' ? r.then(noteMark) : noteMark();
      });
    });
    return chain.then(function () { model.haze = light(pal, 'b'); return model; });
  }

  /* ---------- the solid object: the mark with real thickness ----------
     On the card the mark is a relief, deep toward the viewer and thin from the side. Turned all the
     way round it would show a thin line, so the object view and the 3D file use a copy whose mark
     is THICK times deeper, centred on its own middle. Everything else stays as it is. */
  var THICK = 4;
  function solid(model) {
    if (model._solid) return model._solid;
    var r = model.markRange, out = Object.assign(new Model(), model);
    delete out._scene; delete out._solid;
    if (!r) return (model._solid = out);
    ['cubes', 'glasses', 'points'].forEach(function (k) {
      var lo = r[k][0], hi = r[k][1], zs = [];
      for (var i = lo; i < hi; i++) zs.push(model[k][i].z);
      if (!zs.length) return;
      var mid = (Math.min.apply(null, zs) + Math.max.apply(null, zs)) / 2;
      out[k] = model[k].slice();
      for (var j = lo; j < hi; j++) {
        var e = Object.assign({}, model[k][j]);
        e.z = (e.z - mid) * THICK;
        if (k === 'cubes') e.sz = e.sz * THICK;
        out[k][j] = e;
      }
    });
    return (model._solid = out);
  }

  /* ---------- three.js ---------- */
  var THREE = null, Dep = window.DEFXNDependencies, R = null, ENV = null, CAM = null, MAT = null, GEO = null;
  var GEN = 0;                               // the renderer's generation: release() starts a new one
  function renderer() {
    if (R !== null) return R || null;
    try {
      if (!Dep || !Dep.THREE) throw new Error('js/vendor/three-r180-defxn.js is not loaded');
      THREE = Dep.THREE;
      R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      R.setPixelRatio(1); R.setClearColor(0x000000, 0);
      R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.NoToneMapping;
      R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
      var pm = new THREE.PMREMGenerator(R); ENV = pm.fromScene(new Dep.RoomEnvironment(), 0.04).texture; pm.dispose();
      CAM = new THREE.PerspectiveCamera(FOV, W / H, 20, 6000); CAM.position.set(0, 0, DIST); CAM.lookAt(0, 0, 0);
      makeMaterials();
    } catch (err) {
      R = false;
      console.error('The card draws its art flat: 3D needs WebGL and three.js (' + err.message + ').');
    }
    return R || null;
  }
  function additive(vs, fs, uniforms, side) {
    return new THREE.ShaderMaterial({
      vertexShader: vs, fragmentShader: fs, uniforms: uniforms || {}, transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor, side: side || THREE.DoubleSide
    });
  }
  var OUT = 'gl_FragColor = vec4(c, max(max(c.r, c.g), c.b));';
  function makeMaterials() {
    GEO = { round: new Dep.RoundedBoxGeometry(1, 1, 1, 2, 0.14), box: new THREE.BoxGeometry(1, 1, 1), plane: new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), ball: new THREE.SphereGeometry(1, 48, 32) };
    MAT = {
      cube: new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.08 }),
      glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.12, depthWrite: false, envMapIntensity: 2.2, clearcoat: 1, clearcoatRoughness: 0.05 }),
      line: additive('attribute vec3 aColor; varying vec3 vC; void main(){ vC = aColor; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        'varying vec3 vC; void main(){ vec3 c = vC; ' + OUT + ' }'),
      point: additive('attribute vec3 aColor; attribute float aSize; attribute float aSoft; uniform float uScale; varying vec3 vC; varying float vS;void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = max(1.0, aSize * uScale / -mv.z); vC = aColor; vS = aSoft; }',
        'varying vec3 vC; varying float vS; void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; float a = vS > 0.5 ? exp(-r * r * 4.0) : smoothstep(1.0, 0.55, r); if (a < 0.01) discard; vec3 c = vC * a; ' + OUT + ' }',
        { uScale: { value: 1 } }),
      quad: additive('attribute vec3 aColor; attribute vec2 aMode; varying vec3 vC; varying vec2 vM; varying vec2 vUv;void main(){ vC = aColor; vM = aMode; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }',
        'varying vec3 vC; varying vec2 vM; varying vec2 vUv; void main(){ float t = vUv.y, a; float edge = 1.0 - abs(vUv.x - 0.5) * 2.0;if (vM.x < 0.5) a = pow(1.0 - t, 1.3); else if (vM.x < 1.5) a = sin(t * 3.14159); else a = pow(1.0 - t, 1.4) * step(0.14, fract(t * vM.y));a *= mix(1.0, edge, 0.6); vec3 c = vC * a; ' + OUT + ' }'),
      bar: additive('attribute vec3 aColor; varying vec3 vC; varying vec3 vN; varying vec3 vV;void main(){ vC = aColor; vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * mat3(instanceMatrix) * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
        'varying vec3 vC; varying vec3 vN; varying vec3 vV; void main(){ float f = 0.45 + 0.55 * pow(1.0 - abs(dot(vN, vV)), 1.5); vec3 c = vC * f; ' + OUT + ' }'),
      sphere: additive('varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
        'uniform vec3 uColor; uniform float uAlpha; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.6); vec3 c = uColor * uAlpha * (0.025 + f); ' + OUT + ' }',
        { uColor: { value: new THREE.Vector3(1, 1, 1) }, uAlpha: { value: 1 } }, THREE.FrontSide)
    };
  }
  function lin(rgb) { var c = new THREE.Color(); c.setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace); return c; }
  function placed(o, e) {
    o.position.set(e.x, e.y, e.z);
    if (e.dir) { o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(e.dir[0], e.dir[1], e.dir[2])); }
    else if (e.rot) o.rotation.set(e.rot[0] || 0, e.rot[1] || 0, e.rot[2] || 0);
    else o.rotation.set(0, 0, 0);
    o.scale.set(e.sx || 1, e.sy || 1, e.sz || 1); o.updateMatrix();
    return o.matrix;
  }
  function sceneOf(model) {
    if (model._scene && model._scene.gen === GEN) return model._scene;
    var scene = new THREE.Scene(), group = new THREE.Group(), o = new THREE.Object3D();
    scene.environment = ENV; scene.environmentIntensity = 0.5;
    group.position.set(MX - W / 2, H / 2 - MY, 0); scene.add(group);
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    var key = new THREE.DirectionalLight(0xffffff, 2.6);
    key.position.set(-420 + group.position.x, 560, 900); key.target.position.copy(group.position);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
    var sc = key.shadow.camera; sc.left = -520; sc.right = 520; sc.top = 520; sc.bottom = -520; sc.near = 100; sc.far = 3000;
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.8;
    scene.add(key); scene.add(key.target);
    var rim = new THREE.DirectionalLight(0xffffff, 1.3); rim.position.set(700, 260, -500); scene.add(rim);

    if (model.cubes.length) {
      var cm = new THREE.InstancedMesh(GEO.round, MAT.cube, model.cubes.length);
      model.cubes.forEach(function (e, i) { cm.setMatrixAt(i, placed(o, e)); cm.setColorAt(i, lin(e.c)); });
      cm.castShadow = cm.receiveShadow = true; cm.frustumCulled = false; group.add(cm);
    }
    var lp = [], lc = [];
    function seg(a, b, c) { lp.push(a.x, a.y, a.z, b.x, b.y, b.z); lc.push(c[0], c[1], c[2], c[0], c[1], c[2]); }
    if (model.glasses.length) {
      var gm = new THREE.InstancedMesh(GEO.round, MAT.glass, model.glasses.length), corners = [];
      for (var i = 0; i < 8; i++) corners.push(new THREE.Vector3(i & 1 ? 0.5 : -0.5, i & 2 ? 0.5 : -0.5, i & 4 ? 0.5 : -0.5));
      var EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
      model.glasses.forEach(function (e, k) {
        var mtx = placed(o, e).clone(), pts = corners.map(function (v) { return v.clone().applyMatrix4(mtx); }), c = [e.c[0] * e.a, e.c[1] * e.a, e.c[2] * e.a];
        gm.setMatrixAt(k, mtx);
        EDGES.forEach(function (ed) { seg(pts[ed[0]], pts[ed[1]], c); });
      });
      gm.frustumCulled = false; gm.renderOrder = 1; group.add(gm);
    }
    model.lines.forEach(function (l) {
      var p = l.p, n = p.length / 3, c = [l.c[0] * l.a, l.c[1] * l.a, l.c[2] * l.a];
      for (var i = 0; i < n - 1 + (l.closed ? 1 : 0); i++) {
        var j = (i + 1) % n;
        lp.push(p[i * 3], p[i * 3 + 1], p[i * 3 + 2], p[j * 3], p[j * 3 + 1], p[j * 3 + 2]); lc.push(c[0], c[1], c[2], c[0], c[1], c[2]);
      }
    });
    if (lp.length) {
      var lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); lg.setAttribute('aColor', new THREE.Float32BufferAttribute(lc, 3));
      var ls = new THREE.LineSegments(lg, MAT.line); ls.frustumCulled = false; ls.renderOrder = 2; group.add(ls);
    }
    if (model.points.length) {
      var pp = [], pc = [], ps = [], pf = [];
      model.points.forEach(function (e) { pp.push(e.x, e.y, e.z); pc.push(e.c[0] * e.a, e.c[1] * e.a, e.c[2] * e.a); ps.push(e.s); pf.push(e.soft ? 1 : 0); });
      var pg = new THREE.BufferGeometry();
      pg.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); pg.setAttribute('aColor', new THREE.Float32BufferAttribute(pc, 3));
      pg.setAttribute('aSize', new THREE.Float32BufferAttribute(ps, 1)); pg.setAttribute('aSoft', new THREE.Float32BufferAttribute(pf, 1));
      var pts3 = new THREE.Points(pg, MAT.point); pts3.frustumCulled = false; pts3.renderOrder = 3; group.add(pts3);
    }
    if (model.quads.length) {
      var qg = GEO.plane.clone(), qm = new THREE.InstancedMesh(qg, MAT.quad, model.quads.length), qc = [], qmode = [];
      model.quads.forEach(function (e, i) {
        o.position.set(e.x, e.y, e.z); o.rotation.set(0, 0, e.ang); o.scale.set(e.w, e.len, 1); o.updateMatrix();
        qm.setMatrixAt(i, o.matrix); qc.push(e.c[0] * e.a, e.c[1] * e.a, e.c[2] * e.a); qmode.push(e.mode, e.segs);
      });
      qg.setAttribute('aColor', new THREE.InstancedBufferAttribute(new Float32Array(qc), 3));
      qg.setAttribute('aMode', new THREE.InstancedBufferAttribute(new Float32Array(qmode), 2));
      qm.frustumCulled = false; qm.renderOrder = 4; group.add(qm);
    }
    if (model.bars.length) {
      var bg = GEO.box.clone(), bm = new THREE.InstancedMesh(bg, MAT.bar, model.bars.length), bc = [];
      model.bars.forEach(function (e, i) { bm.setMatrixAt(i, placed(o, e)); bc.push(e.c[0] * e.a, e.c[1] * e.a, e.c[2] * e.a); });
      bg.setAttribute('aColor', new THREE.InstancedBufferAttribute(new Float32Array(bc), 3));
      bm.frustumCulled = false; bm.renderOrder = 5; group.add(bm);
    }
    model.spheres.forEach(function (e) {
      var mt = MAT.sphere.clone(); mt.uniforms.uColor.value.set(e.c[0], e.c[1], e.c[2]); mt.uniforms.uAlpha.value = e.a;
      var s = new THREE.Mesh(GEO.ball, mt); s.position.set(e.x, e.y, e.z); s.scale.setScalar(e.r); s.renderOrder = 6; group.add(s);
    });
    return (model._scene = { scene: scene, group: group, key: key, gen: GEN });
  }

  // the same model drawn flat, for a browser with no WebGL
  function flat(ctx, model, s) {
    function X(x) { return (x + MX) * s; } function Y(y) { return (MY - y) * s; }
    model.cubes.forEach(function (e) { ctx.fillStyle = css(e.c, 1); ctx.fillRect(X(e.x - e.sx / 2), Y(e.y + e.sy / 2), e.sx * s, e.sy * s); });
    ctx.globalCompositeOperation = 'lighter';
    model.points.forEach(function (e) { ctx.fillStyle = css(e.c, e.a * (e.soft ? 0.3 : 1)); ctx.beginPath(); ctx.arc(X(e.x), Y(e.y), Math.max(0.5, e.s * s / 2), 0, 6.283); ctx.fill(); });
    model.lines.forEach(function (l) { ctx.strokeStyle = css(l.c, l.a); ctx.lineWidth = 1; ctx.beginPath(); for (var i = 0; i < l.p.length; i += 3) ctx[i ? 'lineTo' : 'moveTo'](X(l.p[i]), Y(l.p[i + 1])); if (l.closed) ctx.closePath(); ctx.stroke(); });
    model.glasses.forEach(function (e) { ctx.strokeStyle = css(e.c, e.a); ctx.strokeRect(X(e.x - e.sx / 2), Y(e.y + e.sy / 2), e.sx * s, e.sy * s); });
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ---------- paint: the art canvas and its glow ---------- */
  // opts.object: the art alone as an object to turn: centred, no fades for the words.
  // opts.aspect: the drawing's width / height when it is not the card's (a wide banner). The view
  // keeps its height, so the whole mark fits and a wider drawing shows more around it.
  // opts.zoom (object view): 1 shows the card's full height, 2 shows half of it, larger.
  // opts.shift (object view): moves the art sideways, in art units (positive is right).
  // opts.moving: a frame inside a hover or a turn. Like the home's ring kit, it skips the shadows
  // (and the shadow pass) while things move. The caller draws one full frame when the motion stops.
  function paint(target, model, pw, ph, tilt, opts) {
    var s = pw / W, gl = renderer(), object = !!(opts && opts.object), moving = !!(opts && opts.moving);
    [target.art, target.glow].forEach(function (c) { if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; } });
    var ctx = target.art.getContext('2d');
    ctx.clearRect(0, 0, pw, ph);
    if (gl) {
      var sc = sceneOf(object ? solid(model) : model);
      sc.group.rotation.set(tilt.x, tilt.y, 0);
      if (object) sc.group.position.set((opts && opts.shift) || 0, 0, 0); else sc.group.position.set(MX - W / 2, H / 2 - MY, 0);
      sc.key.castShadow = pw >= 1000 && !moving;
      var aspect = (opts && opts.aspect) || W / H, zoom = (object && opts.zoom) || 1;
      var fov = 2 * Math.atan(Math.tan(FOV / 2 * Math.PI / 180) / zoom) * 180 / Math.PI;
      if (CAM.aspect !== aspect || CAM.fov !== fov) { CAM.aspect = aspect; CAM.fov = fov; CAM.updateProjectionMatrix(); }
      gl.setSize(pw, ph, false);
      MAT.point.uniforms.uScale.value = ph / (2 * Math.tan(fov / 2 * Math.PI / 180));
      gl.render(sc.scene, CAM);
      ctx.drawImage(gl.domElement, 0, 0);
    } else flat(ctx, model, s);
    // the text side stays dark, and the words on the art's side stay readable
    if (!object) {
    ctx.globalCompositeOperation = 'destination-in';
    var calm = ctx.createLinearGradient(ART.calmFrom * s, 0, ART.calmTo * s, 0);
    calm.addColorStop(0, 'rgba(0,0,0,0)'); calm.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = calm; ctx.fillRect(0, 0, pw, ph);
    ctx.globalCompositeOperation = 'destination-out';
    ART.quiet.forEach(function (q) {
      var cx = (q[0] + q[2]) / 2 * s, cy = (q[1] + q[3]) / 2 * s, rx = ((q[2] - q[0]) / 2 + 16) * s, ry = ((q[3] - q[1]) / 2 + 14) * s;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx);
      var g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, 'rgba(0,0,0,.92)'); g.addColorStop(0.7, 'rgba(0,0,0,.92)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(-rx, -rx, rx * 2, rx * 2); ctx.restore();
    });
    }
    // the soft haze behind it all
    ctx.globalCompositeOperation = 'destination-over';
    if (object) s = ph / H * ((opts && opts.zoom) || 1);   // an object view measures by its height
    ctx.save(); ctx.translate(object ? pw / 2 + ((opts && opts.shift) || 0) * s : MX * s, object ? ph / 2 : MY * s); ctx.scale(1.05, 1);
    var hz = ctx.createRadialGradient(0, 0, 0, 0, 0, 340 * s);
    hz.addColorStop(0, css(model.haze || [1, 1, 1], 0.07)); hz.addColorStop(0.55, css(model.haze || [1, 1, 1], 0.03)); hz.addColorStop(1, css(model.haze || [1, 1, 1], 0));
    ctx.fillStyle = hz; ctx.fillRect(-340 * s, -340 * s, 680 * s, 680 * s); ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
    // the glow: the art blurred close and wide. Blurred at a quarter of the size and scaled back up:
    // the same soft light for a sixteenth of the work.
    var gx = target.glow.getContext('2d'), q = 4, gw = Math.max(1, Math.round(pw / q)), gh = Math.max(1, Math.round(ph / q));
    var small = glowScratch(gw, gh), sx = small.getContext('2d');
    gx.clearRect(0, 0, pw, ph);
    if (typeof sx.filter === 'string') {
      sx.clearRect(0, 0, gw, gh);
      sx.globalAlpha = 0.5; sx.filter = 'blur(' + (5 * s / q).toFixed(2) + 'px)'; sx.drawImage(target.art, 0, 0, gw, gh);
      sx.globalAlpha = 0.35; sx.filter = 'blur(' + (20 * s / q).toFixed(2) + 'px)'; sx.drawImage(target.art, 0, 0, gw, gh);
      sx.filter = 'none'; sx.globalAlpha = 1;
      gx.imageSmoothingEnabled = true; gx.imageSmoothingQuality = 'high';
      gx.drawImage(small, 0, 0, pw, ph);
    }
  }
  var scratch = null;
  function glowScratch(w, h) {
    if (!scratch) scratch = document.createElement('canvas');
    if (scratch.width !== w || scratch.height !== h) { scratch.width = w; scratch.height = h; }
    return scratch;
  }

  // one draw at a time across the page, so many cards never block it
  var queue = [], busy = false;
  function schedule(fn) {
    queue.push(fn);
    if (busy) return;
    busy = true;
    (function next() {
      var f = queue.shift();
      if (!f) { busy = false; return; }
      try { f(); } catch (err) { console.error(err.message); }
      setTimeout(next, 0);
    })();
  }

  // start the 3D engine while the page is still loading: create the renderer, build the light
  // probe and compile every material once on a tiny scene, so the first card draws at full speed
  function warm() {
    var gl = renderer();
    if (!gl) return;
    var m = new Model();
    m.cube(0, 0, 0, 10, 10, 10, [1, 1, 1]); m.glass(20, 0, 0, 10, 10, 10, [1, 1, 1], 0.5); m.point(0, 20, 0, 4, [1, 1, 1], 1, true);
    m.line([0, 0, 0, 10, 10, 0], [1, 1, 1], 1); m.quad(0, 0, 0, 0, 2, 20, [1, 1, 1], 1, 'peak'); m.bar(0, -20, 0, 4, 10, 4, [1, 1, 1], 0.5); m.sphere(-20, 0, 0, 6, [1, 1, 1], 0.5);
    m.haze = [1, 1, 1];
    var t = { art: document.createElement('canvas'), glow: document.createElement('canvas') };
    paint(t, m, 1000, 700, REST); paint(t, m, 400, 280, REST);   // with and without shadows
  }
  if (typeof requestIdleCallback === 'function') requestIdleCallback(function () { schedule(warm); }, { timeout: 300 });
  else setTimeout(function () { schedule(warm); }, 0);

  // free a model's GPU scenes (its card view and its solid view). It builds them again if drawn
  function dispose(model) {
    [model, model && model._solid].forEach(function (m) {
      var sc = m && m._scene;
      if (!sc) return;
      // the shared geometry and materials stay, unless release() already freed them
      var geo = GEO || {}, mat = MAT || {};
      sc.scene.traverse(function (o) {
        if (o.isInstancedMesh) o.dispose();
        if (o.geometry && o.geometry !== geo.round && o.geometry !== geo.ball && o.geometry !== geo.box && o.geometry !== geo.plane) o.geometry.dispose();
        if (o.material && Object.keys(mat).every(function (k) { return mat[k] !== o.material; })) o.material.dispose();
        if (o.shadow && o.shadow.map) o.shadow.map.dispose();
      });
      m._scene = null;
    });
  }

  // free the shared renderer, its light probe, materials and geometry: for a page the last card left.
  // Models drawn before keep their numbers; their GPU scenes are rebuilt by the next renderer.
  function release() {
    if (!R) { if (R === false) R = null; return false; }
    if (MAT) Object.keys(MAT).forEach(function (k) { if (MAT[k] && MAT[k].dispose) MAT[k].dispose(); });
    if (GEO) Object.keys(GEO).forEach(function (k) { if (GEO[k] && GEO[k].dispose) GEO[k].dispose(); });
    if (ENV) ENV.dispose();
    R.dispose();
    if (R.forceContextLoss) R.forceContextLoss();
    R = null; ENV = null; CAM = null; MAT = null; GEO = null; GEN++;
    return true;
  }

  // the holders of the renderer: release() runs when the last one is done
  var holders = 0;
  function use() {
    holders++;
    var done = false;
    return function () { if (done) return; done = true; holders--; if (!holders) release(); };
  }

  window.Art3D = { REST: REST, dispose: dispose, release: release, use: use, seen: seen, clear: clear, solid: solid, register: register, build: build, paint: paint, schedule: schedule, loadMark: loadMark, builders: function () { return Object.keys(BUILDERS); } };
})();

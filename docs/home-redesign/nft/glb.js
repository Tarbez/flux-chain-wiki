/* DEFXN identity card: the card's 3D art saved as a binary glTF 2.0 file (.glb).

   DefxnGLB.fromModel(model, meta) -> { bytes: Uint8Array, stats }
     model  the card's model from art3d.js (card._model). Only its seven lists are read.
     meta   { genesis, dna, mark, palette, record }: written to the root node's `extras` (record: the card's
            dense record, card-record.js). DefxnGLB.metaOf(card)
            makes it from a card element made by card.js.
   DefxnGLB.download(model, meta, filename) saves the file through the browser and returns the same
     { bytes, stats }. Nothing is sent anywhere.

   THE FILE. One root node, "DEFXN card <genesis>", holds one child node per part of the model. Each
   part is one mesh with its own material. A part's vertices are merged into as few primitives as
   16-bit indices allow (65,535 vertices each), so a card with 8,000 blocks is 4 draws for its
   blocks, not 8,000. Units are metres: one card unit is 1 mm, so the mark is about 0.4 m wide. Y is
   up and +Z faces the viewer, as glTF expects. The origin is the mark's centre.

   SIZE. Blocks are most of the file: 24 vertices each, so a Glitch mark of 8,000 blocks is 190,000
   vertices. Two things keep the largest card near 4 MB instead of 6 MB, and neither changes a
   vertex. Square blocks are written before turned ones, so the normals of every square block are
   the same 24 numbers in a row; and every chunk of boxes has the same index pattern. A normal or
   index list that is the start of a longer one reads that one's bufferView with a smaller count.

     part      made from                     geometry                        material
     Blocks    cubes                         box, 24 vertices, flat normals  lit PBR, roughness 0.4, metallic 0.08
     Glass     glasses                       box, 24 vertices, flat normals  lit PBR, white, alpha 0.12, roughness 0.05
     Lines     lines + the 12 edges of each  line segments (mode LINES)     unlit, blended
               glass block
     Points    hard points                   octahedron, radius 0.5 x size   unlit, blended
     Glows     soft points                   three crossed discs, alpha      unlit, blended, two-sided
                                             falling off from the centre
     Streaks   quads                         strip, 3 columns wide           unlit, blended, two-sided
     Bars      bars and rods                 box, 8 vertices                 unlit, blended, two-sided
     Spheres   spheres                       UV sphere, 16 x 12, poles on z  unlit, blended, two-sided

   LIGHT. On the card, everything except blocks and glass is drawn ADDITIVELY: it adds c x a to
   what is behind it. glTF has no additive blending, so each light part is unlit and alpha-blended,
   with COLOR_0 = (c, a). Over a dark background that shows c x a, as the card does, in a viewer
   that blends on the screen's sRGB values (three.js, model-viewer and Babylon.js do). A viewer that
   blends in linear light (Blender, Apple's RealityKit) shows faint light somewhat brighter.
   Shapes that the card shades per pixel are baked into vertex alpha: the fade along a streak, the
   brighter middle of a streak, the soft fall-off of a glow and the bright rim of a glass sphere
   (baked for a view from +Z).
   What is lost: light no longer piles up into white where many streaks and glows overlap; light
   over a bright block mixes toward its own colour instead of adding to the block; the card's 2D
   finish (the blurred glow canvas, the haze behind the mark, the fade on the text side and around
   the words, the crop to the card's edge) is not in the file, so parts the card fades out are
   fully there. Blocks lose their rounded edges, shadows and the card's light probe; glass loses
   its clear coat. A viewer lights the lit parts with its own lights.

   COLOUR. COLOR_0 is a normalized UNSIGNED_BYTE VEC4. Its RGB is linear light (the model's sRGB
   colours converted), as glTF requires; alpha is the light's strength.

   The same model always gives the same bytes: the lists are read in order and nothing is random. */
(function () {
  'use strict';

  var S = 0.001;                                   // card units -> metres
  var FLOAT = 5126, USHORT = 5123, UINT = 5125, UBYTE = 5121;
  var ARRAY_BUFFER = 34962, ELEMENT_ARRAY_BUFFER = 34963;
  var TRIANGLES = 4, LINES = 1;
  var UNLIT = 'KHR_materials_unlit';

  function fin(v) { return typeof v === 'number' && isFinite(v); }
  function num(v, d) { return fin(v) ? v : d; }
  function unit(v) { return v > 0 ? (v < 1 ? v : 1) : 0; }       // also maps NaN to 0
  function toLinear(v) { v = unit(v); return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  function rgb(c) { return c && c.length >= 3 ? [unit(c[0]), unit(c[1]), unit(c[2])] : [1, 1, 1]; }
  function linRgb(c) { c = rgb(c); return [toLinear(c[0]), toLinear(c[1]), toLinear(c[2])]; }

  /* ---------- rotations, as three.js builds them ---------- */
  // Euler [rx, ry, rz] in 'XYZ' order: the matrix Rx * Ry * Rz (row-major 3 x 3)
  function euler(rot) {
    var x = rot ? num(rot[0], 0) : 0, y = rot ? num(rot[1], 0) : 0, z = rot ? num(rot[2], 0) : 0;
    var a = Math.cos(x), b = Math.sin(x), c = Math.cos(y), d = Math.sin(y), e = Math.cos(z), f = Math.sin(z);
    var ae = a * e, af = a * f, be = b * e, bf = b * f;
    return [c * e, -c * f, d, af + be * d, ae - bf * d, -b * c, bf - ae * d, be + af * d, a * c];
  }
  // the rotation that turns +y onto the unit vector d (Quaternion.setFromUnitVectors)
  function upTo(d) {
    var x, y, z, w, r = d[1] + 1;
    if (r < Number.EPSILON) { x = 0; y = 0; z = 1; w = 0; }   // d points down: half a turn about z
    else { x = d[2]; y = 0; z = -d[0]; w = r; }
    var n = Math.hypot(x, y, z, w); x /= n; y /= n; z /= n; w /= n;
    return [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
      2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
      2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)];
  }
  var IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  function turnOf(e) {
    if (e.dir && e.dir.length >= 3) {
      var n = Math.hypot(num(e.dir[0], 0), num(e.dir[1], 0), num(e.dir[2], 0));
      return n > 0 ? upTo([e.dir[0] / n, e.dir[1] / n, e.dir[2] / n]) : IDENTITY;
    }
    var r = e.rot;
    return r && (num(r[0], 0) || num(r[1], 0) || num(r[2], 0)) ? euler(r) : IDENTITY;
  }

  /* ---------- a part: one mesh and one material ---------- */
  // A part's vertices go into chunks of at most 65,535 vertices, so every index is 16-bit (65,535
  // itself is the restart value and may not be used). Each chunk is one primitive. `colour` is the
  // COLOR_0 component type, or 0 for none.
  var CHUNK = 65535;
  function Part(name, mode, normals, colour) {
    this.name = name; this.mode = mode; this.hasN = normals; this.colour = colour;
    this.chunks = []; this.cur = null; this.v = 0; this.count = 0; this.newChunk();
  }
  Part.prototype.newChunk = function () {
    this.cur = { p: [], n: [], c: [], i: [], v: 0 };
    this.chunks.push(this.cur); this.v = 0;
  };
  // make room for one element of nv vertices, so an element never spans two chunks
  Part.prototype.room = function (nv) { if (this.v && this.v + nv > CHUNK) this.newChunk(); this.count++; };
  // a vertex at art-space (x, y, z), stored in metres; returns its index in the current chunk
  Part.prototype.vert = function (x, y, z, n, c) {
    var k = this.cur;
    k.p.push(x * S, y * S, z * S);
    if (this.hasN) k.n.push(n[0], n[1], n[2]);
    if (this.colour) k.c.push(c[0], c[1], c[2], c[3]);
    k.v++;
    return this.v++;
  };
  Part.prototype.tri = function (a, b, c) { this.cur.i.push(a, b, c); };
  Part.prototype.seg = function (a, b) { this.cur.i.push(a, b); };

  function apply(m, x, y, z) { return [m[0] * x + m[1] * y + m[2] * z, m[3] * x + m[4] * y + m[5] * z, m[6] * x + m[7] * y + m[8] * z]; }
  // as art3d.js scales a box: a missing or zero size is 1
  function sizesOf(e) { return [Math.abs(num(e.sx, 1) || 1), Math.abs(num(e.sy, 1) || 1), Math.abs(num(e.sz, 1) || 1)]; }
  function placed(e) { return fin(e.x) && fin(e.y) && fin(e.z); }
  function turned(e) { return turnOf(e) !== IDENTITY; }

  // a box with flat faces: 4 vertices per face, wound counter-clockwise seen from outside
  function flatBox(part, e, col) {
    var R = turnOf(e), s = sizesOf(e), k, sign, q;
    part.room(24);
    for (k = 0; k < 3; k++) for (sign = 1; sign >= -1; sign -= 2) {
      var a = (k + 1) % 3, b = (k + 2) % 3, u = sign > 0 ? a : b, v = sign > 0 ? b : a, ln = [0, 0, 0];
      ln[k] = sign;
      var nw = apply(R, ln[0], ln[1], ln[2]), first = part.v;
      for (q = 0; q < 4; q++) {
        var l = [0, 0, 0];
        l[k] = sign * 0.5; l[u] = (q === 1 || q === 2) ? 0.5 : -0.5; l[v] = q >= 2 ? 0.5 : -0.5;
        var w = apply(R, l[0] * s[0], l[1] * s[1], l[2] * s[2]);
        part.vert(e.x + w[0], e.y + w[1], e.z + w[2], nw, col);
      }
      part.tri(first, first + 1, first + 2); part.tri(first, first + 2, first + 3);
    }
  }
  // the 8 corners of a box (corner i: x from bit 0, y from bit 1, z from bit 2), in art space
  function corners(e) {
    var R = turnOf(e), s = sizesOf(e), out = [];
    for (var i = 0; i < 8; i++) {
      var w = apply(R, (i & 1 ? 0.5 : -0.5) * s[0], (i & 2 ? 0.5 : -0.5) * s[1], (i & 4 ? 0.5 : -0.5) * s[2]);
      out.push([e.x + w[0], e.y + w[1], e.z + w[2]]);
    }
    return out;
  }
  var BOX_TRIS = [0, 2, 3, 0, 3, 1, 4, 5, 7, 4, 7, 6, 0, 1, 5, 0, 5, 4, 2, 6, 7, 2, 7, 3, 0, 4, 6, 0, 6, 2, 1, 3, 7, 1, 7, 5];
  var BOX_EDGES = [0, 1, 2, 3, 4, 5, 6, 7, 0, 2, 1, 3, 4, 6, 5, 7, 0, 4, 1, 5, 2, 6, 3, 7];
  function cornerBox(part, e, col) {
    part.room(8);
    var first = part.v;
    corners(e).forEach(function (p) { part.vert(p[0], p[1], p[2], null, col); });
    for (var i = 0; i < BOX_TRIS.length; i += 3) part.tri(first + BOX_TRIS[i], first + BOX_TRIS[i + 1], first + BOX_TRIS[i + 2]);
  }

  /* ---------- light: COLOR_0 is the light's colour (linear RGB) and its strength (alpha) ---------- */
  function lightCol(lc, v) { return [lc[0], lc[1], lc[2], unit(v)]; }

  function octahedron(part, e, col) {
    part.room(6);
    var r = Math.max(0.6, num(e.s, 2) * 0.5), first = part.v;
    [[r, 0, 0], [-r, 0, 0], [0, r, 0], [0, -r, 0], [0, 0, r], [0, 0, -r]].forEach(function (d) { part.vert(e.x + d[0], e.y + d[1], e.z + d[2], null, col); });
    for (var sx = 0; sx < 2; sx++) for (var sy = 0; sy < 2; sy++) for (var sz = 0; sz < 2; sz++) {
      var a = first + sx, b = first + 2 + sy, c = first + 4 + sz;
      if ((sx + sy + sz) % 2) part.tri(a, c, b); else part.tri(a, b, c);   // outward in every octant
    }
  }

  // a glow: the card draws a round light of diameter s whose brightness falls as exp(-4 r^2).
  // Here: three crossed discs (facing x, y and z), each a fan with rings at 0.35 and 0.7 of the
  // radius and alpha 0 at the rim, so the fall-off reads from any side.
  var GLOW_RINGS = [0.35, 0.7, 1];
  function glow(part, e, lc) {
    var R = Math.max(1, num(e.s, 10) / 2), a = num(e.a, 1), n = e.s >= 60 ? 16 : 8;
    var shade = GLOW_RINGS.map(function (r) { return r >= 1 ? 0 : a * Math.exp(-4 * r * r); });
    part.room(3 * (1 + GLOW_RINGS.length * n));
    for (var ax = 0; ax < 3; ax++) {
      var u = (ax + 1) % 3, v = (ax + 2) % 3, centre = part.vert(e.x, e.y, e.z, null, lightCol(lc, a)), rings = [];
      GLOW_RINGS.forEach(function (rr, k) {
        var ring = [];
        for (var j = 0; j < n; j++) {
          var t = j / n * Math.PI * 2, d = [0, 0, 0];
          d[u] = Math.cos(t) * rr * R; d[v] = Math.sin(t) * rr * R;
          ring.push(part.vert(e.x + d[0], e.y + d[1], e.z + d[2], null, lightCol(lc, shade[k])));
        }
        rings.push(ring);
      });
      for (var j = 0; j < n; j++) {
        var j2 = (j + 1) % n;
        part.tri(centre, rings[0][j], rings[0][j2]);
        for (var k = 1; k < rings.length; k++) {
          part.tri(rings[k - 1][j], rings[k][j], rings[k][j2]); part.tri(rings[k - 1][j], rings[k][j2], rings[k - 1][j2]);
        }
      }
    }
  }

  // a streak: from its base it runs `len` along angle `ang` (0 = +y, counter-clockwise), `w` wide.
  // The card shades it per pixel; here the shade sits on a strip of rows, 3 columns wide (the
  // middle column is the bright one, the sides keep 0.4 of it, as the card's edge term does).
  function streak(part, e, lc) {
    var w = num(e.w, 1), len = num(e.len, 0), a = num(e.a, 1), ang = num(e.ang, 0), mode = e.mode | 0, segs = e.segs | 0;
    if (!(len > 0) || !(w > 0)) return false;
    var ca = Math.cos(ang), sa = Math.sin(ang);
    function row(t, f) {                          // three vertices across the strip at t (0..1)
      var out = [];
      [-0.5, 0, 0.5].forEach(function (u) {
        var lx = u * w, ly = t * len, side = u === 0 ? 1 : 0.4;
        out.push(part.vert(e.x + lx * ca - ly * sa, e.y + lx * sa + ly * ca, e.z, null, lightCol(lc, a * f * side)));
      });
      return out;
    }
    function band(r0, r1) { for (var c = 0; c < 2; c++) { part.tri(r0[c], r0[c + 1], r1[c + 1]); part.tri(r0[c], r1[c + 1], r1[c]); } }
    var K = 4, prev, k, t;
    if (mode === 2) {                             // broken into segs pieces, a gap at the start of each
      if (segs < 1) return false;                 // the card draws nothing for 'bars' with no segments
      part.room(segs * 6);
      for (k = 0; k < segs; k++) {
        var t0 = (k + 0.14) / segs, t1 = (k + 1) / segs;
        band(row(t0, Math.pow(1 - t0, 1.4)), row(t1, Math.pow(1 - t1, 1.4)));
      }
      return true;
    }
    part.room((K + 1) * 3);
    for (k = 0; k <= K; k++) {
      t = k / K;
      var r = row(t, mode === 1 ? Math.sin(t * Math.PI) : Math.pow(1 - t, 1.3));
      if (prev) band(prev, r);
      prev = r;
    }
    return true;
  }

  // a glass sphere: the card shows mostly its rim, c x a x (0.025 + (1 - |n . v|)^2.6). The rim is
  // baked into vertex alpha for a view from +Z, so the poles sit on the z axis. The material is
  // two-sided: when the view turns, the far half's rim fills the side the near half no longer covers.
  var LAT = 12, LON = 16;
  function sphere(part, e, lc) {
    part.room((LAT + 1) * (LON + 1));
    var r = Math.abs(num(e.r, 10)), a = num(e.a, 0.8), first = part.v, i, j;
    for (i = 0; i <= LAT; i++) {
      var th = i / LAT * Math.PI, st = Math.sin(th), ct = Math.cos(th), f = Math.pow(1 - Math.abs(ct), 2.6);
      for (j = 0; j <= LON; j++) {
        var ph = j / LON * Math.PI * 2;
        part.vert(e.x + r * st * Math.cos(ph), e.y + r * st * Math.sin(ph), e.z + r * ct, null, lightCol(lc, a * (0.025 + f)));
      }
    }
    for (i = 0; i < LAT; i++) for (j = 0; j < LON; j++) {
      var p = first + i * (LON + 1) + j, q = p + LON + 1;
      if (i > 0) part.tri(p, q, p + 1);
      if (i < LAT - 1) part.tri(p + 1, q, q + 1);
    }
  }

  /* ---------- the model, part by part ---------- */
  function partsOf(model, stats) {
    // Square blocks (no rotation) come first and turned ones after, in the model's order within
    // each: then every square block's normals are the same 24 numbers, and the file stores them once.
    var P = {
      blocks: new Part('Blocks', TRIANGLES, true, UBYTE),
      blocksTurned: new Part('Blocks', TRIANGLES, true, UBYTE),
      glass: new Part('Glass', TRIANGLES, true, 0),
      glassTurned: new Part('Glass', TRIANGLES, true, 0),
      lines: new Part('Lines', LINES, false, UBYTE),
      points: new Part('Points', TRIANGLES, false, UBYTE),
      glows: new Part('Glows', TRIANGLES, false, UBYTE),
      streaks: new Part('Streaks', TRIANGLES, false, UBYTE),
      bars: new Part('Bars', TRIANGLES, false, UBYTE),
      spheres: new Part('Spheres', TRIANGLES, false, UBYTE)
    };
    function list(name) { var l = model && model[name]; return Array.isArray(l) ? l : []; }
    function skip(name) { stats.skipped[name] = (stats.skipped[name] || 0) + 1; }

    list('cubes').forEach(function (e) {
      if (!placed(e)) return skip('cubes');
      var c = linRgb(e.c);
      flatBox(turned(e) ? P.blocksTurned : P.blocks, e, [c[0], c[1], c[2], 1]);
    });
    list('glasses').forEach(function (e) {
      if (!placed(e)) return skip('glasses');
      flatBox(turned(e) ? P.glassTurned : P.glass, e, null);
      P.lines.room(8);
      var col = lightCol(linRgb(e.c), num(e.a, 0.7)), first = P.lines.v;
      corners(e).forEach(function (p) { P.lines.vert(p[0], p[1], p[2], null, col); });
      for (var i = 0; i < BOX_EDGES.length; i += 2) P.lines.seg(first + BOX_EDGES[i], first + BOX_EDGES[i + 1]);
    });
    list('lines').forEach(function (l) {
      var p = l && l.p, n = p ? Math.floor(p.length / 3) : 0;
      if (n < 2) return skip('lines');
      for (var k = 0; k < n * 3; k++) if (!fin(p[k])) return skip('lines');
      P.lines.room(n);
      var col = lightCol(linRgb(l.c), num(l.a, 0.6)), first = P.lines.v;
      for (var i = 0; i < n; i++) P.lines.vert(p[i * 3], p[i * 3 + 1], p[i * 3 + 2], null, col);
      for (var j = 0; j < n - 1; j++) P.lines.seg(first + j, first + j + 1);
      if (l.closed && n > 2) P.lines.seg(first + n - 1, first);
    });
    list('points').forEach(function (e) {
      if (!placed(e)) return skip('points');
      var lc = linRgb(e.c);
      if (e.soft) glow(P.glows, e, lc);
      else octahedron(P.points, e, lightCol(lc, num(e.a, 1)));
    });
    list('quads').forEach(function (e) {
      if (!placed(e) || !streak(P.streaks, e, linRgb(e.c))) skip('quads');
    });
    list('bars').forEach(function (e) {
      if (!placed(e)) return skip('bars');
      // seen face-on, the card adds the front and the back face, each at 0.45 of c x a: two
      // blended layers of alpha q give 1 - (1 - q)^2, so q = 1 - sqrt(1 - 0.9 a)
      var q = 1 - Math.sqrt(1 - unit(0.9 * num(e.a, 0.4))), lc = linRgb(e.c);
      cornerBox(P.bars, e, [lc[0], lc[1], lc[2], q]);
    });
    list('spheres').forEach(function (e) {
      if (!placed(e)) return skip('spheres');
      sphere(P.spheres, e, linRgb(e.c));
    });
    return P;
  }

  /* ---------- materials ---------- */
  function pbr(name, base, metallic, rough, blend, twoSided) {
    var m = { name: name, pbrMetallicRoughness: { baseColorFactor: base, metallicFactor: metallic, roughnessFactor: rough } };
    if (blend) m.alphaMode = 'BLEND';
    if (twoSided) m.doubleSided = true;
    return m;
  }
  function unlit(name, blend, twoSided) {
    var m = pbr(name, [1, 1, 1, 1], 0, 1, blend, twoSided);
    m.extensions = {}; m.extensions[UNLIT] = {};
    return m;
  }
  var MATERIALS = {
    Blocks: function () { return pbr('Blocks', [1, 1, 1, 1], 0.08, 0.4, false, false); },
    Glass: function () { return pbr('Glass', [1, 1, 1, 0.12], 0, 0.05, true, false); },
    Lines: function () { return unlit('Lines', true, false); },
    Points: function () { return unlit('Points', true, false); },
    Glows: function () { return unlit('Glows', true, true); },
    Streaks: function () { return unlit('Streaks', true, true); },
    Bars: function () { return unlit('Bars', true, true); },
    Spheres: function () { return unlit('Spheres', true, true); }
  };

  /* ---------- the binary chunk ---------- */
  function f32(v) { return Math.fround(v); }
  function minMax(arr, n) {
    var lo = [], hi = [], i, k;
    for (k = 0; k < n; k++) { lo[k] = Infinity; hi[k] = -Infinity; }
    for (i = 0; i < arr.length; i += n) for (k = 0; k < n; k++) {
      var v = f32(arr[i + k]);
      if (v < lo[k]) lo[k] = v;
      if (v > hi[k]) hi[k] = v;
    }
    return { min: lo, max: hi };
  }
  function isPrefix(a, b) {                        // a is the start of b
    if (a.length > b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }
  function utf8(s) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s);
    var bin = unescape(encodeURIComponent(s)), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function text(v) { return v == null ? '' : String(v); }
  var BYTES = {}; BYTES[FLOAT] = 4; BYTES[UINT] = 4; BYTES[USHORT] = 2; BYTES[UBYTE] = 1;
  var WIDTH = { SCALAR: 1, VEC3: 3, VEC4: 4 };
  var NORMALIZED_TOP = {}; NORMALIZED_TOP[UBYTE] = 255; NORMALIZED_TOP[USHORT] = 65535;

  function fromModel(model, meta) {
    meta = meta || {};
    var stats = { bytes: 0, jsonBytes: 0, binBytes: 0, vertices: 0, triangles: 0, segments: 0, parts: {}, skipped: {}, sharedViews: 0 };
    var P = partsOf(model, stats);
    var gltf = {
      asset: { version: '2.0', generator: 'DEFXN card glb.js' },
      scene: 0,
      scenes: [{ name: 'DEFXN card', nodes: [0] }],
      nodes: [], meshes: [], materials: [], accessors: [], bufferViews: []
    };
    var genesis = text(meta.genesis);
    var root = { name: 'DEFXN card' + (genesis ? ' ' + genesis : ''), extras: { dna: text(meta.dna), genesis: genesis, mark: text(meta.mark), palette: text(meta.palette), record: text(meta.record) } };
    gltf.nodes.push(root);
    var used = {};

    // Every accessor is first a request: its numbers, how to store them, and whether it may share.
    // A shared request (normals, indices) whose numbers are the start of a longer one of the same
    // kind reads that one's bufferView with a smaller count, so repeated patterns are stored once.
    var requests = [];
    function request(arr, type, componentType, target, opts) {
      var r = { arr: arr, type: type, ct: componentType, target: target, normalized: !!(opts && opts.normalized), minMax: !!(opts && opts.minMax), share: opts && opts.share, owner: null, view: -1 };
      r.accessor = gltf.accessors.length;
      gltf.accessors.push(null);
      requests.push(r);
      return r.accessor;
    }

    var groups = [];
    Object.keys(P).forEach(function (key) {
      var part = P[key], g = groups.filter(function (x) { return x.name === part.name; })[0];
      if (!g) { g = { name: part.name, parts: [] }; groups.push(g); }
      g.parts.push(part);
    });
    groups.forEach(function (g) {
      var chunks = [], mode = g.parts[0].mode, elements = 0;
      g.parts.forEach(function (part) {
        elements += part.count;
        part.chunks.forEach(function (k) { if (k.v && k.i.length) chunks.push({ part: part, k: k }); });
      });
      if (!chunks.length) return;
      var mat = MATERIALS[g.name]();
      if (mat.extensions) Object.keys(mat.extensions).forEach(function (x) { used[x] = true; });
      gltf.materials.push(mat);
      var mi = gltf.materials.length - 1, prims = [], st = { elements: elements, vertices: 0, triangles: 0, segments: 0, primitives: chunks.length };
      chunks.forEach(function (ch) {
        var part = ch.part, k = ch.k;
        // 65535 is the restart value for UNSIGNED_SHORT and may not appear, so short indices need
        // at most 65535 vertices (largest index 65534). Chunks keep to that; UINT is the fallback
        // for a single line longer than a chunk.
        var ict = k.v <= 65535 ? USHORT : UINT;
        var attrs = { POSITION: request(k.p, 'VEC3', FLOAT, ARRAY_BUFFER, { minMax: true }) };
        if (part.hasN) attrs.NORMAL = request(k.n, 'VEC3', FLOAT, ARRAY_BUFFER, { share: 'normal' });
        if (part.colour) attrs.COLOR_0 = request(k.c, 'VEC4', part.colour, ARRAY_BUFFER, { normalized: true });
        prims.push({ attributes: attrs, indices: request(k.i, 'SCALAR', ict, ELEMENT_ARRAY_BUFFER, { share: 'index' + ict }), material: mi, mode: mode });
        st.vertices += k.v;
        if (mode === TRIANGLES) st.triangles += k.i.length / 3; else st.segments += k.i.length / 2;
      });
      gltf.meshes.push({ name: g.name, primitives: prims });
      gltf.nodes.push({ name: g.name, mesh: gltf.meshes.length - 1 });
      stats.parts[g.name] = st;
      stats.vertices += st.vertices; stats.triangles += st.triangles; stats.segments += st.segments;
    });
    if (gltf.nodes.length > 1) root.children = gltf.nodes.slice(1).map(function (n, i) { return i + 1; });

    // owners: longest first, so a shorter request can find the longer one it starts
    var byKind = {};
    requests.forEach(function (r, i) { if (r.share) (byKind[r.share] = byKind[r.share] || []).push(r); });
    Object.keys(byKind).forEach(function (kind) {
      var list = byKind[kind].slice().sort(function (a, b) { return b.arr.length - a.arr.length || requests.indexOf(a) - requests.indexOf(b); }), owners = [];
      list.forEach(function (r) {
        for (var i = 0; i < owners.length; i++) if (isPrefix(r.arr, owners[i].arr)) { r.owner = owners[i]; stats.sharedViews++; return; }
        owners.push(r);
      });
    });

    // lay out the bufferViews in accessor order, each 4-byte aligned
    var views = [], size = 0;
    function viewOf(r) {
      if (r.owner) return viewOf(r.owner);
      if (r.view >= 0) return r.view;
      var len = r.arr.length * BYTES[r.ct];
      views.push({ r: r, off: size, len: len });
      size += Math.ceil(len / 4) * 4;
      return (r.view = views.length - 1);
    }
    requests.forEach(function (r) {
      var a = { bufferView: viewOf(r), componentType: r.ct };
      if (r.normalized) a.normalized = true;
      a.count = r.arr.length / WIDTH[r.type]; a.type = r.type;
      if (r.minMax) { var mm = minMax(r.arr, WIDTH[r.type]); a.min = mm.min; a.max = mm.max; }
      gltf.accessors[r.accessor] = a;
    });

    var binBytes = null;
    if (size) {
      binBytes = new Uint8Array(size);
      var bdv = new DataView(binBytes.buffer);
      views.forEach(function (v) {
        var arr = v.r.arr, ct = v.r.ct, off = v.off, top = NORMALIZED_TOP[ct], i;
        if (ct === FLOAT) for (i = 0; i < arr.length; i++) bdv.setFloat32(off + i * 4, arr[i], true);
        else if (v.r.normalized && ct === UBYTE) for (i = 0; i < arr.length; i++) bdv.setUint8(off + i, Math.round(unit(arr[i]) * top));
        else if (v.r.normalized) for (i = 0; i < arr.length; i++) bdv.setUint16(off + i * 2, Math.round(unit(arr[i]) * top), true);
        else if (ct === USHORT) for (i = 0; i < arr.length; i++) bdv.setUint16(off + i * 2, arr[i], true);
        else for (i = 0; i < arr.length; i++) bdv.setUint32(off + i * 4, arr[i], true);
      });
      gltf.bufferViews = views.map(function (v) { return { buffer: 0, byteOffset: v.off, byteLength: v.len, target: v.r.target }; });
      gltf.buffers = [{ byteLength: size }];
    } else {
      delete gltf.accessors; delete gltf.bufferViews;
    }
    if (!gltf.meshes.length) { delete gltf.meshes; delete gltf.materials; }
    var ext = Object.keys(used).sort();
    if (ext.length) gltf.extensionsUsed = ext;

    var json = utf8(JSON.stringify(gltf)), jsonLen = Math.ceil(json.length / 4) * 4;
    var total = 12 + 8 + jsonLen + (binBytes ? 8 + binBytes.length : 0);
    var out = new Uint8Array(total), dv = new DataView(out.buffer);
    dv.setUint32(0, 0x46546C67, true);            // 'glTF'
    dv.setUint32(4, 2, true);
    dv.setUint32(8, total, true);
    dv.setUint32(12, jsonLen, true);
    dv.setUint32(16, 0x4E4F534A, true);           // 'JSON'
    out.set(json, 20);
    for (var i = 20 + json.length; i < 20 + jsonLen; i++) out[i] = 0x20;
    if (binBytes) {
      var at = 20 + jsonLen;
      dv.setUint32(at, binBytes.length, true);
      dv.setUint32(at + 4, 0x004E4942, true);     // 'BIN\0'
      out.set(binBytes, at + 8);
    }
    stats.bytes = total; stats.jsonBytes = jsonLen; stats.binBytes = binBytes ? binBytes.length : 0;
    return { bytes: out, stats: stats };
  }

  function download(model, meta, filename) {
    var res = fromModel(model, meta);
    var blob = new Blob([res.bytes], { type: 'model/gltf-binary' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename || ('defxn-card-' + ((meta && meta.genesis) || 'sample') + '.glb');
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    return res;
  }

  // the meta for a card element made by card.js (card._record and card._traits)
  function metaOf(card) {
    var t = (card && card._traits) || {}, r = (card && card._record) || {}, p = t.picks || {};
    return {
      genesis: text(r.genesisId || t.number || ''),
      dna: text(t.dna),
      mark: p.mark ? text(p.mark.name) : '',
      palette: p.palette ? text(p.palette.name) : ''
    };
  }

  window.DefxnGLB = { fromModel: fromModel, download: download, metaOf: metaOf };
})();

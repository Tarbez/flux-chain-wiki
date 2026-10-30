/* DEFXN grid look: a PROTOTYPE of the dark glass cube and of how a worn card transforms it.
   Design: docs/home-redesign/GRID-LOOK.md. This file is standalone. It touches no file in js/world or js/nft.

   What it shows
     1. The default look: a glass cube with glowing edges, voxels or panels lit from inside, a coloured glow at its
        base, and still particles. One fragment shader per cube; no transmission pass (that is the expensive part).
     2. The card -> grid mapping, as one function: derive(record) turns the card's palette and the census of
        what its 3D layers build (counted by Art3D.build, read only) into the closed grid-look parameter set.
        The same card always gives the same look. Nothing is authored per card.
     3. The apply rule: params ease over a set time and the world stops drawing when they arrive. Reduced motion:
        the change is instant and particles never drift.

   Page law kept here: the kind tint, the chosen edge, the signed pip and the ember are drawn by code the look
   cannot reach. The look moves only its own hue and strength, and its edge hue is kept clear of the locked hues. */
(function () {
  'use strict';
  var T = window.DEFXN_TRAITS;
  var canvas = document.getElementById('gl');
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var qs = new URLSearchParams(location.search);
  if (qs.get('bare')) document.body.classList.add('bare');

  /* ---------- the closed parameter set (same shape as an ArkWorld group: [min, max, default] or choices) ---------- */
  var SCHEMA = {
    glass: [0, 1, 0.6], kindTint: [0.35, 1, 0.7], edgeGlow: [0, 1, 0.75], edgeHue: [0, 360, 200],
    detail: [['voxels', 'panels', 'none'], 'voxels'], detailDensity: [0, 1, 0.55],
    texture: [['clear', 'frost', 'scan', 'dots'], 'frost'], textureAmount: [0, 1, 0.35],
    lightAHue: [0, 360, 222], lightBHue: [0, 360, 318], lightCHue: [0, 360, 38], lightStrength: [0, 1, 0.7],
    baseHue: [0, 360, 318], baseGlow: [0, 1, 0.6], rim: [0, 1, 0.5], vivid: [0.2, 1, 0.85],
    particles: [0, 1, 0.35], hazeTint: [0, 1, 0.2], bloom: [0, 1, 0.55]
  };
  var HUES = { edgeHue: 1, lightAHue: 1, lightBHue: 1, lightCHue: 1, baseHue: 1 };
  function defaults() { var o = {}; Object.keys(SCHEMA).forEach(function (k) { var s = SCHEMA[k]; o[k] = Array.isArray(s[0]) ? s[1] : s[2]; }); return o; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function sanitize(p) {
    var o = defaults();
    Object.keys(SCHEMA).forEach(function (k) {
      var s = SCHEMA[k], v = p && p[k];
      if (Array.isArray(s[0])) { if (s[0].indexOf(v) >= 0) o[k] = v; }
      else if (typeof v === 'number' && isFinite(v)) o[k] = clamp(v, s[0], s[1]);
    });
    return o;
  }

  /* ---------- the card -> grid mapping ---------- */
  function hsl(s) { var p = String(s || '0 0% 0%').trim().split(/\s+/); return { h: parseFloat(p[0]) || 0, s: (parseFloat(p[1]) || 0) / 100, l: (parseFloat(p[2]) || 0) / 100 }; }
  function lg(x, top) { return clamp(Math.log10(1 + x) / top, 0, 1); }
  function arc(a, b) { var d = Math.abs(((a - b) % 360 + 540) % 360 - 180); return d; }   /* hue distance, 0..180 */
  function wrap(h) { return ((h % 360) + 360) % 360; }
  function hueOf(css) { var n = parseInt(css.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = d === 0 ? 0 : mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return wrap(h * 60); }
  /* the hues a look must keep its edge away from: the chosen and signed light, the record ember, danger and live */
  var LOCKED_BANDS = [['signal', '#3fd1a8'], ['ember', '#f7752a'], ['danger', '#d9534f'], ['live', '#34d399']].map(function (x) { return { name: x[0], hue: hueOf(x[1]) }; });
  var BAND = 26;
  function clearOfLocked(h) {
    for (var pass = 0; pass < 3; pass++) {
      LOCKED_BANDS.forEach(function (b) {
        var d = arc(h, b.hue);
        if (d < BAND) { var dir = ((h - b.hue + 540) % 360) - 180 >= 0 ? 1 : -1; h = wrap(b.hue + dir * BAND); }
      });
    }
    return h;
  }
  function census(model) {
    return { cubes: model.cubes.length, glass: model.glasses.length + model.spheres.length, pts: model.points.length,
      thin: model.lines.length + model.quads.length + model.bars.length };
  }
  function sum(list) { return list.reduce(function (a, c) { return { cubes: a.cubes + c.cubes, glass: a.glass + c.glass, pts: a.pts + c.pts, thin: a.thin + c.thin }; }, { cubes: 0, glass: 0, pts: 0, thin: 0 }); }
  function all(c) { return c.cubes + c.glass + c.pts + c.thin; }

  /* counts what each 3D layer builds, one layer at a time (read only: Art3D.build makes data, it draws nothing) */
  async function measure(record) {
    var p = T.pick(record), key = T.keyOf(record), mark = await window.Art3D.loadMark(), out = { palette: p.picks.palette, layers: {} };
    for (var L of ['backdrop', 'aura', 'mark', 'signal', 'particles']) {
      var pk = { palette: p.picks.palette }; pk[L] = p.picks[L];
      out.layers[L] = Object.assign({ name: p.picks[L].name }, census(await window.Art3D.build(mark, key, pk)));
    }
    return out;
  }

  /* derive(m) -> { params, why }: a pure function of the palette and the census. No rarity, no per-card entry. */
  function derive(m) {
    var pal = m.palette.attrs, a = hsl(pal.a), b = hsl(pal.b), c = hsl(pal.c), Ly = m.layers, why = {};
    var ambient = sum([Ly.backdrop, Ly.aura, Ly.signal, Ly.particles]);
    var solid = Ly.mark.cubes + Ly.mark.glass + Ly.aura.cubes + Ly.aura.glass, thin = Ly.mark.thin + Ly.aura.thin + Ly.signal.thin;
    var p = {};
    /* colour: the palette's own three hues. A one-hue palette keeps one hue and spreads its tones by +-28 degrees. */
    p.vivid = clamp(0.2 + 0.85 * (b.s + c.s) / 2, 0.2, 1);
    p.lightAHue = b.h;
    p.lightBHue = arc(b.h, c.h) >= 25 ? c.h : wrap(b.h + 28);
    p.lightCHue = a.s >= 0.3 && arc(a.h, b.h) >= 25 ? a.h : wrap(b.h - 28);
    p.baseHue = p.lightBHue;
    p.edgeHue = clearOfLocked(c.h);
    why.edgeHue = arc(p.edgeHue, c.h) > 0.5 ? 'the accent hue sat inside a locked band; moved to its edge' : 'the accent hue';
    /* strength: how light the palette is, and how much the card builds */
    p.lightStrength = clamp(0.45 + 0.9 * (b.l - 0.4), 0.45, 0.9);
    p.bloom = clamp(0.35 + 0.8 * (c.l - 0.4), 0.35, 0.75);
    /* material: glass share of what the card builds in blocks */
    var gShare = (Ly.mark.glass + Ly.aura.glass) / (solid + 1);
    p.glass = clamp(0.35 + 0.55 * Math.min(1, gShare * 1.6), 0.35, 0.9);
    p.edgeGlow = 0.5 + 0.4 * lg(all(Ly.signal), 2.2);
    p.baseGlow = 0.35 + 0.45 * lg(all(Ly.aura), 2.6);
    p.rim = 0.35 + 0.4 * lg(all(Ly.backdrop), 3.6);
    p.hazeTint = 0.3 * lg(all(Ly.backdrop), 3.6);
    p.particles = lg(all(Ly.particles), 3.5);
    /* inner detail: blocks make voxels; a card that builds more thin things (lines, streaks, bars) makes panels */
    p.detail = solid + thin < 12 ? 'none' : thin / (solid + 1) >= 0.05 ? 'panels' : 'voxels';
    p.detailDensity = lg(solid, 4.2);
    var sDots = lg(ambient.pts, 3.6), sScan = lg(ambient.thin + Ly.mark.thin, 2.5), sFrost = gShare >= 0.2 ? 0.5 + gShare / 2 : 0;
    var top = Math.max(sDots, sScan, sFrost);
    p.texture = top < 0.45 ? 'clear' : top === sFrost ? 'frost' : top === sScan ? 'scan' : 'dots';
    p.textureAmount = p.texture === 'clear' ? 0 : clamp(top * 0.55, 0.2, 0.55);
    why.detail = solid + ' blocks, ' + thin + ' thin parts';
    why.texture = 'dots ' + sDots.toFixed(2) + ', scan ' + sScan.toFixed(2) + ', frost ' + sFrost.toFixed(2);
    /* kindTint is the readability of a cube's kind: a card never sets it */
    return { params: sanitize(p), why: why, census: m };
  }

  /* ---------- the grid look's renderer: fxn-3d (engine/render/gridlook.mjs) ---------- */
  function lin(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function hslLin(h, s, l) { h = wrap(h) / 360; var a = s * Math.min(l, 1 - l); function f(n) { var k = (n + h * 12) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); } return [lin(f(0)), lin(f(8)), lin(f(4))]; }
  function hexLin(hex) { var n = parseInt(hex.slice(1), 16); return [lin((n >> 16 & 255) / 255), lin((n >> 8 & 255) / 255), lin((n & 255) / 255)]; }
  var gl = canvas.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'high-performance' });
  if (!gl) { document.body.classList.add('no-webgl'); return; }
  var G = null, BG = hslLin(220, 0.25, 0.035);
  var cam = { yaw: 0.2, elev: 27 * Math.PI / 180, dist: 36, aim: [0, 0.9, 0] };
  var KIND = { L: hexLin('#bcc3c8'), T: hexLin('#3fd1a8'), D: hexLin('#525a5d') };
  var SIGNAL = hexLin('#3fd1a8');
  var CUBE = 0.62, cubes = [];
  (function () {
    function ring(n, r, y, off, kinds) { for (var i = 0; i < n; i++) { var a = off + i / n * Math.PI * 2; cubes.push({ x: Math.cos(a) * r, y: y, z: Math.sin(a) * r, kind: kinds[i % kinds.length], rot: a * 0.7 }); } }
    ring(12, 3.1, 1.35, 0.1, ['D', 'D', 'L', 'D', 'T', 'D']);
    ring(6, 1.55, 1.1, 0.5, ['L', 'T', 'D']);
    cubes.push({ x: 0, y: 1.7, z: 0, kind: 'L', rot: 0.4 });
  })();
  var CHOSEN = 4;
  /* the scene's facts, as the prototype laid them */
  var tileN = 30, tiles = [], stems = [], pips = [], parts = new Float32Array(cubes.length * 22 * 5);
  for (var ti = 0; ti < tileN; ti++) { var ta = ti / tileN * Math.PI * 2, tk = ['L', 'T', 'D'][ti % 3 === 0 ? 0 : ti % 7 === 0 ? 1 : 2]; tiles.push({ x: Math.cos(ta) * 4.35, y: 0.06, z: Math.sin(ta) * 4.35, yaw: -ta + Math.PI / 2, w: 0.62, h: 0.12, d: 0.42, color: KIND[tk].map(function (v) { return v * 0.55; }) }); }
  cubes.forEach(function (c) { stems.push({ x: c.x, z: c.z, h: c.y, r: 0.07, color: hexLin('#2a323a') }); });
  [0, 2, 7, 12].forEach(function (i) { var c = cubes[i]; pips.push({ x: c.x + 0.3, y: c.y + 0.05, z: c.z, s: 0.07, color: SIGNAL }); });
  (function () {
    var s = 7;
    function r() { s = (s * 16807) % 2147483647; return s / 2147483647; }
    for (var i = 0; i < cubes.length * 22; i++) {
      var c = cubes[i % cubes.length], a = r() * 6.283, rad = 0.2 + r() * 0.7;
      parts[i * 5] = c.x + Math.cos(a) * rad; parts[i * 5 + 1] = c.y + CUBE * (0.4 + r() * 1.6); parts[i * 5 + 2] = c.z + Math.sin(a) * rad; parts[i * 5 + 3] = r(); parts[i * 5 + 4] = r();
    }
  })();
  var FOV = 14;
  var U = { fov: FOV };
  var W = 1, H = 1, ratio = 1;
  var mod = import('/fxn-3d/js/render/world2-gridlook.mjs').then(function (m) {
    G = m.createGridLook(gl);
    m.afterRestore(gl, function () { wake(60); });   /* a lost WebGL context is rebuilt by the engine; this draws the current state once (fxn-3d context-guard.mjs) */
    G.setScene({ cubes: cubes.map(function (c) { return { x: c.x, y: c.y, z: c.z, rot: c.rot, kind: KIND[c.kind] }; }), size: CUBE, glowScale: 2.5, floor: { radius: 5.4, color: hexLin('#0a0e14') }, tiles: tiles, stems: stems, pips: pips,
      chosen: { x: cubes[CHOSEN].x, y: cubes[CHOSEN].y + CUBE / 2, z: cubes[CHOSEN].z, rot: cubes[CHOSEN].rot, size: CUBE * 1.08, color: SIGNAL }, particles: parts });
    G.look.bg = BG;
    resize(); push(cur); wake(60);
  }, function (e) { console.error('[grid look] the fxn-3d renderer did not start: ' + e.message); });
  /* lights of the prototype: a hemisphere (0x8899bb over black, .35) and two directional lights (0xc8d4ff .9 from -8 12 -3; 0x6688aa .7 from 3 5 -12) */
  function unit(v) { var l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; }
  var LIGHTS = { sky: hexLin('#8899bb').map(function (v) { return v * 0.35; }), keyDir: unit([-8, 12, -3]), keyCol: hexLin('#c8d4ff').map(function (v) { return v * 0.9; }), rimDir: unit([3, 5, -12]), rimCol: hexLin('#6688aa').map(function (v) { return v * 0.7; }) };
  function placeCam() {}
  function resize() {
    W = innerWidth; H = innerHeight;
    ratio = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt((W * H > 3.2e6 ? 4.2e6 : 2.6e6) / (W * H)));
    if (!G) return;
    G.resize(W, H, ratio); G.look.centre = [0.66, 0.5]; wake(60);
  }

  var framesDrawn = 0;
  function render() {
    if (!G) return;
    G.render({ aim: cam.aim, dist: cam.dist, elev: cam.elev, yaw: cam.yaw, fov: FOV, shift: 0.16, sky: LIGHTS.sky, keyDir: LIGHTS.keyDir, keyCol: LIGHTS.keyCol, rimDir: LIGHTS.rimDir, rimCol: LIGHTS.rimCol });
    framesDrawn++;
  }

  /* ---------- the apply rule: set the look, ease to it, settle ---------- */
  var cur = sanitize({}), from = cur, to = cur, easeT = 1, easeMs = 0, easeStart = 0, camFly = null, rafId = 0, awakeUntil = 0, driftOn = false, timeClock = 0, lastNow = 0;
  var KIND_ID = { detail: { none: 0, voxels: 1, panels: 2 }, texture: { clear: 0, frost: 1, scan: 2, dots: 3 } };
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpHue(a, b, t) { var d = ((b - a + 540) % 360) - 180; return wrap(a + d * t); }
  function mixParams(a, b, t) {
    var o = {}, sw = t >= 0.5;
    Object.keys(SCHEMA).forEach(function (k) { o[k] = Array.isArray(SCHEMA[k][0]) ? (sw ? b[k] : a[k]) : HUES[k] ? lerpHue(a[k], b[k], t) : lerp(a[k], b[k], t); });
    /* a changed kind never pops: its amount dips to zero at the switch and comes back */
    var dip = Math.abs(1 - 2 * t);
    if (a.detail !== b.detail) o.detailDensity = lerp(a.detailDensity, b.detailDensity, t) * dip;
    if (a.texture !== b.texture) o.textureAmount = lerp(a.textureAmount, b.textureAmount, t) * dip;
    return o;
  }
  function push(p) {
    cur = p;
    if (!G) return;
    var L = G.look;
    L.glass = p.glass; L.edge = p.edgeGlow; L.light = p.lightStrength; L.baseAmt = p.baseGlow; L.rim = p.rim; L.density = p.detailDensity; L.texAmt = p.textureAmount; L.kindTint = p.kindTint; L.particles = p.particles;
    L.detail = KIND_ID.detail[p.detail]; L.tex = KIND_ID.texture[p.texture];
    L.edgeCol = hslLin(p.edgeHue, p.vivid, 0.62); L.la = hslLin(p.lightAHue, p.vivid, 0.58); L.lb = hslLin(p.lightBHue, p.vivid, 0.58); L.lc = hslLin(p.lightCHue, p.vivid, 0.58); L.base = hslLin(p.baseHue, p.vivid, 0.55);
    L.bloom = p.bloom;
    /* haze: the background and the fog take a little of the look's base hue */
    L.bg = BG = hslLin(lerpHue(220, p.baseHue, p.hazeTint * 0.5), 0.25 + 0.2 * p.hazeTint * p.vivid, 0.035);
  }
  var EASE_MS = 900;
  function setGridLook(params, ms) {
    var p = sanitize(params); p.kindTint = sanitize({ kindTint: params && params.kindTint }).kindTint;
    from = cur; to = p; easeMs = reduced ? 0 : (ms == null ? EASE_MS : ms); easeStart = performance.now(); easeT = easeMs ? 0 : 1;
    if (!easeMs) push(to);
    wake(easeMs + 60);
    return new Promise(function (res) { settleWaiters.push(res); });
  }
  var settleWaiters = [];
  function wake(ms) { awakeUntil = Math.max(awakeUntil, performance.now() + ms); if (!rafId) { lastNow = performance.now(); rafId = requestAnimationFrame(frame); } }
  function frame(now) {
    rafId = 0;
    var dt = Math.max(0, Math.min(64, now - lastNow)); lastNow = now;
    if (easeT < 1) {
      easeT = easeMs ? Math.min(1, (now - easeStart) / easeMs) : 1;
      var e = easeT < 0.5 ? 2 * easeT * easeT : 1 - Math.pow(-2 * easeT + 2, 2) / 2;
      push(mixParams(from, to, e)); if (easeT >= 1) push(to);
    }
    if (camFly) {
      var ct = Math.min(1, (now - camFly.t0) / camFly.ms), ce = ct < 0.5 ? 2 * ct * ct : 1 - Math.pow(-2 * ct + 2, 2) / 2;
      cam.yaw = camFly.a + (camFly.b - camFly.a) * ce; if (ct >= 1) camFly = null;
    }
    if (!reduced && (easeT < 1 || camFly) && G) G.look.time += dt / 1000;   /* particles slide only while something else moves */
    render();
    if (easeT < 1 || camFly || now < awakeUntil) rafId = requestAnimationFrame(frame);
    else { var w = settleWaiters; settleWaiters = []; w.forEach(function (f) { f(); }); }
  }
  function fly() {
    if (reduced) { cam.yaw = cam.yaw > 0.5 ? 0.2 : 0.7; wake(60); return; }
    camFly = { a: cam.yaw, b: cam.yaw > 0.5 ? 0.2 : 0.7, t0: performance.now(), ms: 1400 }; wake(1500);
  }

  /* ---------- sources of params ---------- */
  var looks = { default: Promise.resolve({ params: sanitize({}), why: { all: 'the default look' } }) };
  function lookFor(name) {
    if (!looks[name]) looks[name] = measure(T.sampleRecord(+name)).then(derive);
    return looks[name];
  }
  var pretty = { glass: 1, kindTint: 1, edgeGlow: 1, rim: 1, detailDensity: 1, textureAmount: 1, lightStrength: 1, baseGlow: 1, vivid: 1, particles: 1, hazeTint: 1, bloom: 1 };
  function showVals(name, r) {
    var p = r.params, dl = document.getElementById('vals'), rows = [['look', name === 'default' ? 'default' : 'card ' + name + ' (' + r.census.palette.name + ')']];
    rows.push(['detail', p.detail + ' ' + p.detailDensity.toFixed(2)], ['texture', p.texture + ' ' + p.textureAmount.toFixed(2)], ['glass / edge', p.glass.toFixed(2) + ' / ' + p.edgeGlow.toFixed(2)],
      ['particles / bloom', p.particles.toFixed(2) + ' / ' + p.bloom.toFixed(2)]);
    function sw(h) { return '<span class="sw" style="background:hsl(' + Math.round(h) + ' ' + Math.round(p.vivid * 100) + '% 58%)"></span>'; }
    rows.push(['edge, lights, base', '<span>' + sw(p.edgeHue) + sw(p.lightAHue) + sw(p.lightBHue) + sw(p.lightCHue) + sw(p.baseHue) + '</span>']);
    dl.innerHTML = rows.map(function (x) { return '<dt>' + x[0] + '</dt><dd>' + x[1] + '</dd>'; }).join('');
  }
  var current = 'default';
  function choose(name) {
    current = name;
    document.querySelectorAll('#picks button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-look') === name)); });
    return lookFor(name).then(function (r) { showVals(name, r); return setGridLook(r.params).then(function () { return r; }); });
  }
  document.getElementById('picks').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) choose(b.getAttribute('data-look')); });
  addEventListener('resize', resize);
  addEventListener('keydown', function (e) { if (e.key === 'f') fly(); });

  /* ---------- measuring ---------- */
  function syncGpu() { var px = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
  function costMs(n) {
    n = n || 60; render(); syncGpu();
    var t0 = performance.now(); for (var i = 0; i < n; i++) { render(); } syncGpu();
    return (performance.now() - t0) / n;
  }
  /* luminance percentiles of a screen region of the last drawn frame (the words' column), 0..1 relative luminance */
  function luma(rect) {
    render();
    var c2 = document.createElement('canvas'); c2.width = canvas.width; c2.height = canvas.height;
    var g = c2.getContext('2d', { willReadFrequently: true }); g.drawImage(canvas, 0, 0);
    var x = Math.round(rect[0] * c2.width), y = Math.round(rect[1] * c2.height), w = Math.round(rect[2] * c2.width), h = Math.round(rect[3] * c2.height);
    var d = g.getImageData(x, y, w, h).data, ls = new Float32Array(d.length / 4);
    function lin(v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    for (var i = 0; i < ls.length; i++) ls[i] = 0.2126 * lin(d[i * 4]) + 0.7152 * lin(d[i * 4 + 1]) + 0.0722 * lin(d[i * 4 + 2]);
    ls.sort(); var pc = function (q) { return ls[Math.min(ls.length - 1, Math.floor(q * ls.length))]; };
    return { p50: pc(0.5), p95: pc(0.95), p99: pc(0.99), max: ls[ls.length - 1] };
  }
  /* idle frames: how many frames are drawn in a window after the world settled (must be 0) */
  function idleFrames(ms) { var n0 = framesDrawn; return new Promise(function (res) { setTimeout(function () { res(framesDrawn - n0); }, ms); }); }

  window.__gridLook = { choose: choose, setGridLook: setGridLook, derive: derive, measure: measure, sanitize: sanitize, SCHEMA: SCHEMA, fly: fly, costMs: costMs, luma: luma, idleFrames: idleFrames,
    frames: function () { return framesDrawn; }, info: function () { return { calls: G ? G.stats.calls : 0, ratio: ratio, w: W, h: H, pixels: Math.round(W * ratio) * Math.round(H * ratio), reduced: reduced, time: U.uTime.value, gpu: (function () { var gl = renderer.getContext(), e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; })() }; },
    setBloom: function (v) { if (G) G.look.bloom = v; }, current: function () { return cur; } };  resize();
  choose(qs.get('look') || 'default');
})();

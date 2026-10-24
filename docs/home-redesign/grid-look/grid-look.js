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
  var D = window.DEFXNDependencies, THREE = D.THREE, T = window.DEFXN_TRAITS;
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
  function hueOf(css) { var c = new THREE.Color(css), o = {}; c.getHSL(o, THREE.SRGBColorSpace); return o.h * 360; }
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

  /* ---------- three.js ---------- */
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
  var scene = new THREE.Scene();
  var BG = new THREE.Color().setHSL(220 / 360, 0.25, 0.035);
  scene.fog = new THREE.Fog(BG.getHex(), 26, 60);
  var camera = new THREE.PerspectiveCamera(14, 1.6, 1, 200);
  var cam = { yaw: 0.2, elev: 27 * Math.PI / 180, dist: 36, aim: new THREE.Vector3(0, 0.9, 0) };
  function placeCam() {
    camera.position.set(cam.aim.x + cam.dist * Math.cos(cam.elev) * Math.sin(cam.yaw), cam.aim.y + cam.dist * Math.sin(cam.elev), cam.aim.z + cam.dist * Math.cos(cam.elev) * Math.cos(cam.yaw));
    camera.lookAt(cam.aim); camera.updateMatrixWorld();
  }

  scene.add(new THREE.HemisphereLight(0x8899bb, 0x000000, 0.35));
  var key = new THREE.DirectionalLight(0xc8d4ff, 0.9); key.position.set(-8, 12, -3); scene.add(key);
  var rimLight = new THREE.DirectionalLight(0x6688aa, 0.7); rimLight.position.set(3, 5, -12); scene.add(rimLight);

  var KIND = { L: new THREE.Color('#bcc3c8'), T: new THREE.Color('#3fd1a8'), D: new THREE.Color('#525a5d') };
  var SIGNAL = new THREE.Color('#3fd1a8');

  /* the floor, and the tiles on it (kind coloured, not part of the look) */
  var floor = new THREE.Mesh(new THREE.CircleGeometry(5.4, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x0a0e14, roughness: 0.85, metalness: 0 }));
  scene.add(floor);
  var tileN = 30, tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.12, 0.42), new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.1 }), tileN);
  (function () {
    var m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), c = new THREE.Color();
    for (var i = 0; i < tileN; i++) {
      var a = i / tileN * Math.PI * 2, r = 4.35;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a + Math.PI / 2);
      m.compose(new THREE.Vector3(Math.cos(a) * r, 0.06, Math.sin(a) * r), q, s); tiles.setMatrixAt(i, m);
      tiles.setColorAt(i, c.copy(KIND[['L', 'T', 'D'][i % 3 === 0 ? 0 : i % 7 === 0 ? 1 : 2]]).multiplyScalar(0.55));
    }
    tiles.instanceMatrix.needsUpdate = true; tiles.instanceColor.needsUpdate = true;
  })();
  scene.add(tiles);

  /* cubes: two rings. Kind per cube: L identity, T signal, D other. */
  var CUBE = 0.62, cubes = [];
  (function () {
    function ring(n, r, y, off, kinds) { for (var i = 0; i < n; i++) { var a = off + i / n * Math.PI * 2; cubes.push({ x: Math.cos(a) * r, y: y, z: Math.sin(a) * r, kind: kinds[i % kinds.length], rot: a * 0.7 }); } }
    ring(12, 3.1, 1.35, 0.1, ['D', 'D', 'L', 'D', 'T', 'D']);
    ring(6, 1.55, 1.1, 0.5, ['L', 'T', 'D']);
    cubes.push({ x: 0, y: 1.7, z: 0, kind: 'L', rot: 0.4 });
  })();
  var CHOSEN = 4;    /* a cube the page has chosen: its teal edge light is drawn by the site, not by the look */
  var cubeGeo = new THREE.BoxGeometry(1, 1, 1);
  var seeds = new Float32Array(cubes.length);
  cubes.forEach(function (c, i) { seeds[i] = (i * 0.6180339) % 1; });
  cubeGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));

  var U = {
    uGlass: { value: 0.6 }, uEdge: { value: 0.75 }, uEdgeCol: { value: new THREE.Color() }, uLA: { value: new THREE.Color() }, uLB: { value: new THREE.Color() },
    uLC: { value: new THREE.Color() }, uLight: { value: 0.7 }, uBase: { value: new THREE.Color() }, uBaseAmt: { value: 0.6 }, uRim: { value: 0.5 },
    uDetail: { value: 1 }, uDensity: { value: 0.55 }, uTex: { value: 1 }, uTexAmt: { value: 0.35 }, uKindTint: { value: 0.7 },
    uParticles: { value: 0.35 }, uTime: { value: 0 }, uPx: { value: 1 }
  };
  var cubeMat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    vertexShader: [
      'attribute float aSeed; varying vec3 vP; varying vec3 vC; varying float vSeed; varying vec3 vKind;',
      'void main(){ mat4 M = modelMatrix * instanceMatrix; vP = position; vC = (inverse(M) * vec4(cameraPosition, 1.)).xyz; vSeed = aSeed; vKind = instanceColor;',
      ' gl_Position = projectionMatrix * viewMatrix * M * vec4(position, 1.); }'
    ].join('\n'),
    fragmentShader: [
      'precision highp float;',
      'varying vec3 vP; varying vec3 vC; varying float vSeed; varying vec3 vKind;',
      'uniform float uGlass, uEdge, uLight, uBaseAmt, uRim, uDetail, uDensity, uTex, uTexAmt, uKindTint;',
      'uniform vec3 uEdgeCol, uLA, uLB, uLC, uBase;',
      'float h31(vec3 p){ p = fract(p * .1031 + vec3(.1, .2, .3)); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }',
      /* distance from a point on the box surface to its nearest edge */
      'float edgeD(vec3 p){ vec3 q = .5 - abs(p); float lo = min(q.x, min(q.y, q.z)), hi = max(q.x, max(q.y, q.z)); return q.x + q.y + q.z - lo - hi; }',
      'vec3 pick(float o){ return o < .4 ? uLA : (o < .75 ? uLB : uLC); }',
      'void main(){',
      ' vec3 ro = clamp(vP, -.5, .5); vec3 rd = normalize(vP - vC);',
      ' vec3 tf = (sign(rd) * .5 - ro) / rd; float tex = max(min(tf.x, min(tf.y, tf.z)), 0.); vec3 pe = ro + rd * tex;',
      ' vec3 acc = vec3(0.); const int N = 8; float dt = tex / float(N);',
      ' float soft = mix(.02, .2, step(.5, uTex) * step(uTex, 1.5) * uTexAmt * 2.);',
      ' float G = floor(mix(3., 8., uDensity)); float fill = mix(.14, .52, uDensity);',
      ' for (int i = 0; i < N; i++){',
      '  vec3 p = ro + rd * dt * (float(i) + .5);',
      '  vec3 d1 = p - vec3(-.22, .12, .2), d2 = p - vec3(.24, -.2, -.12), d3 = p - vec3(.05, .3, -.22);',
      '  vec3 L = uLA * exp(-dot(d1, d1) * 11.) + uLB * exp(-dot(d2, d2) * 11.) + uLC * exp(-dot(d3, d3) * 12.);',
      '  L += uBase * uBaseAmt * exp(-(p.y + .5) * 8.) * .8;',
      '  acc += L * uLight * .15;',
      '  acc += vKind * uKindTint * exp(-dot(p, p) * 16.) * .3;',      /* a kind-coloured core: the cube always shows what it is */
      '  if (uDetail > .5 && uDetail < 1.5) {',
      '   vec3 q = (p + .5) * G; vec3 cell = floor(q); vec3 f = fract(q) - .5;',
      '   float o = h31(cell + vSeed * 17.); float occ = step(o, fill);',
      '   float m = 1. - smoothstep(.3 - soft, .3 + soft + .001, max(abs(f.x), max(abs(f.y), abs(f.z))));',
      '   vec3 col = mix(pick(h31(cell * 1.7 + 3.1)), uBase, clamp(.5 - p.y, 0., 1.) * .6);',
      '   acc += occ * m * col * (.5 + .7 * h31(cell + 9.)) * .5;',
      '  }',
      ' }',
      /* data panels: thin sheets crossed analytically, each with rows of bars */
      ' if (uDetail > 1.5) {',
      '  for (int k = 0; k < 5; k++){',
      '   float nL = 3. + floor(uDensity * 2.99); if (float(k) >= nL) break;',
      '   float zk = -.5 + (float(k) + .5) / nL; float t = (zk - ro.z) / rd.z;',
      '   if (t > 0. && t < tex){ vec3 pp = ro + rd * t; if (abs(pp.x) < .44 && abs(pp.y) < .44){',
      '    float rows = 7.; float r = floor((pp.y + .5) * rows); float fy = fract((pp.y + .5) * rows);',
      '    float len = .15 + .75 * h31(vec3(r, float(k), vSeed * 9.));',
      '    float bar = step(pp.x + .45, len) * smoothstep(.2 - soft, .2 + soft + .001, fy) * (1. - smoothstep(.62 - soft, .62 + soft + .001, fy));',
      '    float frame = 1. - smoothstep(.0, .02 + soft * .2, abs(max(abs(pp.x), abs(pp.y)) - .44));',
      '    vec3 col = pick(h31(vec3(r, float(k), 4.2 + vSeed)));',
      '    acc += col * (bar * .9 + frame * .55 + .05) * (.75 - float(k) * .08);',
      '   } }',
      '  }',
      ' }',
      /* the kind pad: a slab of the cube's kind colour on its inner floor, so identity, signal and other stay apart under any look */
      ' if (rd.y < -.001) { float tp = (-.46 - ro.y) / rd.y; if (tp > 0. && tp < tex) { vec3 pq = ro + rd * tp; float sq = max(abs(pq.x), abs(pq.z)); acc += vKind * uKindTint * (1. - smoothstep(.28, .34, sq)) * 1.05; } }',
      ' vec3 faceN = step(.499, abs(ro)) * sign(ro); float ndv = abs(dot(rd, faceN));',
      ' if (uTex > 1.5 && uTex < 2.5) acc *= 1. - uTexAmt * .55 * (.5 + .5 * sin((ro.y + pe.y) * 60.));',
      ' if (uTex > 2.5) { vec2 uv = abs(faceN.x) > .5 ? ro.zy : (abs(faceN.y) > .5 ? ro.xz : ro.xy); float dd = length(fract(uv * 12.) - .5); acc *= 1. - uTexAmt * .75 * smoothstep(.22, .4, dd); }',
      ' float ef = 1. - smoothstep(0., .04, edgeD(ro)); float eb = 1. - smoothstep(0., .035, edgeD(pe));',
      ' vec3 edge = uEdgeCol * (ef * 1.7 + eb * .55) * uEdge;',
      ' vec3 rim = uEdgeCol * pow(1. - ndv, 3.) * uRim * .9;',
      ' float a0 = mix(1., .2, uGlass);',
      ' vec3 body = vKind * uKindTint * (.2 + .12 * faceN.y + .06 * faceN.x);',
      ' vec3 glow = acc + edge + rim;',
      ' float alpha = clamp(a0 * .85 + dot(glow, vec3(.33)) * .6, 0., 1.);',
      ' gl_FragColor = vec4(body + glow * mix(1., .9, uGlass), alpha);',
      '}'
    ].join('\n')
  });
  var cubeMesh = new THREE.InstancedMesh(cubeGeo, cubeMat, cubes.length);
  cubeMesh.frustumCulled = false;
  (function () {
    var m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(CUBE, CUBE, CUBE), c = new THREE.Color();
    cubes.forEach(function (cb, i) {
      q.setFromEuler(e.set(0, cb.rot, 0)); m.compose(new THREE.Vector3(cb.x, cb.y + CUBE / 2, cb.z), q, s); cubeMesh.setMatrixAt(i, m);
      cubeMesh.setColorAt(i, c.copy(KIND[cb.kind]));
    });
    cubeMesh.instanceMatrix.needsUpdate = true; cubeMesh.instanceColor.needsUpdate = true;
  })();
  cubeMesh.renderOrder = 2;
  scene.add(cubeMesh);

  /* stems under the cubes, and the signed pip: drawn by the site, not moved by the look */
  var stemMat = new THREE.MeshStandardMaterial({ color: 0x2a323a, roughness: 0.5, metalness: 0.4 });
  cubes.forEach(function (c) { var s = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, c.y, 8), stemMat); s.position.set(c.x, c.y / 2, c.z); scene.add(s); });
  /* chosen cube: the site's own teal edge light, a thin outline slightly outside the cube */
  var chosen = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(CUBE * 1.08, CUBE * 1.08, CUBE * 1.08)), new THREE.LineBasicMaterial({ color: SIGNAL, toneMapped: false, fog: false }));
  chosen.position.set(cubes[CHOSEN].x, cubes[CHOSEN].y + CUBE / 2, cubes[CHOSEN].z); chosen.rotation.y = cubes[CHOSEN].rot; chosen.renderOrder = 3; scene.add(chosen);
  /* signed pips: a small teal square on the stem top of the signed cubes */
  [0, 2, 7, 12].forEach(function (i) { var c = cubes[i]; var p = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), new THREE.MeshBasicMaterial({ color: SIGNAL, toneMapped: false, fog: false })); p.position.set(c.x + 0.3, c.y + 0.05, c.z); scene.add(p); });

  /* base glow decals on the floor */
  var glowMat = new THREE.ShaderMaterial({
    uniforms: { uBase: U.uBase, uAmt: U.uBaseAmt }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.); }',
    fragmentShader: 'varying vec2 vUv; uniform vec3 uBase; uniform float uAmt; void main(){ float d = length(vUv - .5) * 2.; float g = pow(clamp(1. - d, 0., 1.), 2.2); gl_FragColor = vec4(uBase * g * uAmt * .26, 1.); }'
  });
  var glowMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), glowMat, cubes.length);
  glowMesh.frustumCulled = false;
  (function () {
    var m = new THREE.Matrix4();
    cubes.forEach(function (c, i) { m.compose(new THREE.Vector3(c.x, 0.02 + (c.y > 1.6 ? 0.02 : 0), c.z), new THREE.Quaternion(), new THREE.Vector3(2.5, 1, 2.5)); glowMesh.setMatrixAt(i, m); });
    glowMesh.instanceMatrix.needsUpdate = true;
  })();
  scene.add(glowMesh);

  /* particles: still at rest. They slide only while the world is already moving (look change, camera flight). */
  var PN = cubes.length * 22, pPos = new Float32Array(PN * 3), pSeed = new Float32Array(PN * 2);
  (function () {
    var s = 7;
    function r() { s = (s * 16807) % 2147483647; return s / 2147483647; }
    for (var i = 0; i < PN; i++) {
      var c = cubes[i % cubes.length], a = r() * 6.283, rad = 0.2 + r() * 0.7;
      pPos[i * 3] = c.x + Math.cos(a) * rad; pPos[i * 3 + 1] = c.y + CUBE * (0.4 + r() * 1.6); pPos[i * 3 + 2] = c.z + Math.sin(a) * rad;
      pSeed[i * 2] = r(); pSeed[i * 2 + 1] = r();
    }
  })();
  var pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('aSeed', new THREE.BufferAttribute(pSeed, 2));
  var pMat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: [
      'attribute vec2 aSeed; uniform float uParticles, uTime, uPx; uniform vec3 uLA, uLB, uLC; varying vec3 vCol; varying float vA;',
      'void main(){ float ph = fract(aSeed.x + uTime * (.05 + aSeed.y * .06)); vec3 p = position; p.y += ph * .9; p.x += sin(aSeed.x * 40. + ph * 3.) * .06;',
      ' vCol = aSeed.y < .4 ? uLA : (aSeed.y < .75 ? uLB : uLC); vA = step(aSeed.y * 1.03 + aSeed.x * .0, uParticles * 1.05 + .001) * sin(ph * 3.1416) * (.35 + .65 * aSeed.x);',
      ' vec4 mv = viewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = uPx * (2. + 3. * aSeed.x) * (30. / -mv.z); }'
    ].join('\n'),
    fragmentShader: 'varying vec3 vCol; varying float vA; void main(){ float d = length(gl_PointCoord - .5) * 2.; float g = pow(clamp(1. - d, 0., 1.), 2.); gl_FragColor = vec4(vCol * g * vA * 1.6, 1.); }'
  });
  var points = new THREE.Points(pGeo, pMat); points.frustumCulled = false; scene.add(points);

  /* ---------- the glow and tone pass (the same shape as the ring kit's: a quarter, an eighth, a sixteenth) ---------- */
  var post = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  var quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null); post.add(quad);
  var FS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
  var brightMat = new THREE.ShaderMaterial({ uniforms: { tex: { value: null } }, vertexShader: FS, depthTest: false, depthWrite: false,
    fragmentShader: 'varying vec2 vUv; uniform sampler2D tex; void main(){ vec3 c = texture2D(tex, vUv).rgb; float l = dot(c, vec3(.2126, .7152, .0722)); gl_FragColor = vec4(c * max(l - .22, 0.) / max(l, 1e-3), 1.); }' });
  var blurMat = new THREE.ShaderMaterial({ uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2() } }, vertexShader: FS, depthTest: false, depthWrite: false,
    fragmentShader: 'varying vec2 vUv; uniform sampler2D tex; uniform vec2 dir; void main(){ vec3 c = texture2D(tex, vUv).rgb * .2270270; c += (texture2D(tex, vUv + dir * 1.3846).rgb + texture2D(tex, vUv - dir * 1.3846).rgb) * .3162162; c += (texture2D(tex, vUv + dir * 3.2308).rgb + texture2D(tex, vUv - dir * 3.2308).rgb) * .0702703; gl_FragColor = vec4(c, 1.); }' });
  var compMat = new THREE.ShaderMaterial({
    uniforms: { tex: { value: null }, b1: { value: null }, b2: { value: null }, b3: { value: null }, bloom: { value: 0.55 }, centre: { value: new THREE.Vector2(0.6, 0.5) }, aspect: { value: 1.6 } },
    vertexShader: FS, depthTest: false, depthWrite: false,
    fragmentShader: [
      'varying vec2 vUv; uniform sampler2D tex, b1, b2, b3; uniform float bloom, aspect; uniform vec2 centre;',
      'void main(){ vec3 c = texture2D(tex, vUv).rgb; vec3 g = texture2D(b1, vUv).rgb * .55 + texture2D(b2, vUv).rgb * .65 + texture2D(b3, vUv).rgb * .75;',
      ' vec2 d = (vUv - centre) * vec2(aspect, 1.); float v = 1. - smoothstep(.45, 1.15, length(d));',   /* the frame: the world steps back outside the subject, as the kit does */
      ' c = (c + g * bloom) * mix(.55, 1., v);',
      ' float l = dot(c, vec3(.2126, .7152, .0722)); float knee = .8; if (l > knee) c *= (knee + (l - knee) / (1. + (l - knee) / (1. - knee))) / l;',
      ' gl_FragColor = vec4(pow(max(c, 0.), vec3(1. / 2.2)), 1.); }'
    ].join('\n')
  });
  function rt(w, h, s) { return new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), { type: THREE.HalfFloatType, samples: s || 0, depthBuffer: !!s }); }
  var T0 = {}, W = 1, H = 1, ratio = 1;
  function pass(mat, target) { quad.material = mat; renderer.setRenderTarget(target); renderer.render(post, postCam); }
  function blur(src, tmp, dst) {
    blurMat.uniforms.tex.value = src.texture; blurMat.uniforms.dir.value.set(1 / tmp.width, 0); pass(blurMat, tmp);
    blurMat.uniforms.tex.value = tmp.texture; blurMat.uniforms.dir.value.set(0, 1 / tmp.height); pass(blurMat, dst);
  }
  function resize() {
    W = innerWidth; H = innerHeight;
    ratio = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt((W * H > 3.2e6 ? 4.2e6 : 2.6e6) / (W * H)));
    renderer.setPixelRatio(ratio); renderer.setSize(W, H, false);
    var pw = Math.round(W * ratio), ph = Math.round(H * ratio);
    Object.keys(T0).forEach(function (k) { T0[k].dispose(); });
    T0.main = rt(pw, ph, 4); T0.b1 = rt(pw >> 2, ph >> 2); T0.b1t = rt(pw >> 2, ph >> 2); T0.b2 = rt(pw >> 3, ph >> 3); T0.b2t = rt(pw >> 3, ph >> 3); T0.b3 = rt(pw >> 4, ph >> 4); T0.b3t = rt(pw >> 4, ph >> 4);
    camera.aspect = W / H; camera.setViewOffset(W, H, -W * 0.16, 0, W, H); camera.updateProjectionMatrix();
    compMat.uniforms.aspect.value = W / H; compMat.uniforms.centre.value.set(0.66, 0.5);
    U.uPx.value = ratio * 1.2;
    placeCam(); wake(60);
  }

  var framesDrawn = 0;
  function render() {
    renderer.setClearColor(BG, 1); renderer.setRenderTarget(T0.main); renderer.render(scene, camera);
    brightMat.uniforms.tex.value = T0.main.texture; pass(brightMat, T0.b1); blur(T0.b1, T0.b1t, T0.b1);
    blurMat.uniforms.tex.value = T0.b1.texture; blurMat.uniforms.dir.value.set(0, 0); pass(blurMat, T0.b2); blur(T0.b2, T0.b2t, T0.b2);
    blurMat.uniforms.tex.value = T0.b2.texture; blurMat.uniforms.dir.value.set(0, 0); pass(blurMat, T0.b3); blur(T0.b3, T0.b3t, T0.b3);
    var u = compMat.uniforms; u.tex.value = T0.main.texture; u.b1.value = T0.b1.texture; u.b2.value = T0.b2.texture; u.b3.value = T0.b3.texture;
    pass(compMat, null);
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
  var tmp = new THREE.Color();
  function col(out, hue, s, l) { return out.setHSL(hue / 360, s, l, THREE.SRGBColorSpace); }
  function push(p) {
    cur = p;
    U.uGlass.value = p.glass; U.uEdge.value = p.edgeGlow; U.uLight.value = p.lightStrength; U.uBaseAmt.value = p.baseGlow; U.uRim.value = p.rim;
    U.uDensity.value = p.detailDensity; U.uTexAmt.value = p.textureAmount; U.uKindTint.value = p.kindTint; U.uParticles.value = p.particles;
    U.uDetail.value = KIND_ID.detail[p.detail]; U.uTex.value = KIND_ID.texture[p.texture];
    col(U.uEdgeCol.value, p.edgeHue, p.vivid, 0.62); col(U.uLA.value, p.lightAHue, p.vivid, 0.58); col(U.uLB.value, p.lightBHue, p.vivid, 0.58);
    col(U.uLC.value, p.lightCHue, p.vivid, 0.58); col(U.uBase.value, p.baseHue, p.vivid, 0.55);
    compMat.uniforms.bloom.value = p.bloom;
    /* haze: the background and the fog take a little of the look's base hue */
    BG.setHSL(wrap(lerpHue(220, p.baseHue, p.hazeTint * 0.5)) / 360, 0.25 + 0.2 * p.hazeTint * p.vivid, 0.035, THREE.SRGBColorSpace); scene.fog.color.copy(BG);
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
      cam.yaw = camFly.a + (camFly.b - camFly.a) * ce; placeCam(); if (ct >= 1) camFly = null;
    }
    if (!reduced && (easeT < 1 || camFly)) U.uTime.value += dt / 1000;   /* particles slide only while something else moves */
    render();
    if (easeT < 1 || camFly || now < awakeUntil) rafId = requestAnimationFrame(frame);
    else { var w = settleWaiters; settleWaiters = []; w.forEach(function (f) { f(); }); }
  }
  function fly() {
    if (reduced) { cam.yaw = cam.yaw > 0.5 ? 0.2 : 0.7; placeCam(); wake(60); return; }
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
  function syncGpu() { var gl = renderer.getContext(), px = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
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
    frames: function () { return framesDrawn; }, info: function () { return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, ratio: ratio, w: W, h: H, pixels: Math.round(W * ratio) * Math.round(H * ratio), reduced: reduced, time: U.uTime.value, gpu: (function () { var gl = renderer.getContext(), e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; })() }; },
    setBloom: function (v) { compMat.uniforms.bloom.value = v; }, current: function () { return cur; },
    solidBaseline: function (mode) { cubeMesh.visible = !mode; baseline.visible = mode === 'solid'; baselineT.visible = mode === 'transmission'; } };

  /* a stand-in for today's cube (a lit, solid, rounded physical material), for the cost comparison only */
  var baseline = new THREE.InstancedMesh(new D.RoundedBoxGeometry(1, 1, 1, 2, 0.12), new THREE.MeshPhysicalMaterial({ roughness: 0.45, clearcoat: 0.3 }), cubes.length);
  baseline.instanceMatrix.copy(cubeMesh.instanceMatrix); baseline.instanceColor = cubeMesh.instanceColor; baseline.visible = false; scene.add(baseline);
  /* and the usual way to make glass in three.js, a transmission material, for the cost comparison only */
  var baselineT = new THREE.InstancedMesh(new D.RoundedBoxGeometry(1, 1, 1, 2, 0.12), new THREE.MeshPhysicalMaterial({ roughness: 0.15, transmission: 1, thickness: 0.6, ior: 1.4, clearcoat: 0.3 }), cubes.length);
  baselineT.instanceMatrix.copy(cubeMesh.instanceMatrix); baselineT.instanceColor = cubeMesh.instanceColor; baselineT.visible = false; scene.add(baselineT);

  resize();
  choose(qs.get('look') || 'default');
})();

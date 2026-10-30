/* Moved to js/world/ (2026-10-24, the 3D port; the mockup loads it from here). It draws only if home has a
   .idcard [data-helix] box (the mockup's home, or a site home marked [data-world-home]) when it loads.

   DEFXN mockup app: home's identity chain, a helix of glass blocks that winds up to a lit person block
   (direction board "Record descent", card "Identity chain" and storyboard 04, 2026-10-24).

   Where it draws. In the one world (chains-scene.js), on the canvas under the page, glued to the box
   the identity card leaves for it (.idcard [data-helix]). The card's glass has a clear hole over that
   box (app.js helixHole), so these pixels are not blurred. The box is read every frame the world
   draws, and the helix is scaled to fit inside it at any window size and any turn. A dark plate the
   colour of the card's glass sits behind it, so the network does not show through the hole.

   What it is. 36 small blocks of near-black glass with a faint ember edge and a faint inner light, on
   a coil of two and a half turns that narrows at the top into your person block: teal glass, lit,
   with the person glyph of the identity tiles (ring-kit.js GLYPH.person). A thin proof line rises up
   the helix's axis, amber at the foot and teal where it meets you. Only the person block has full
   detail; the chain blocks stay simple, because the card is small (board: level of detail 1).

   Motion. Every move settles; nothing runs while nothing changes.
     - First visit: the home storyboard sends defxn:story { step: 4 }. The blocks build bottom to top
       (about 900 ms), the line rises with them, then the person block lights.
     - A return visit or reduced motion (the first step heard is already 4), step 4 while another
       view is shown, or no step 4 within 4.5 s of home first showing: the end state, at once.
     - Leaving home, the blocks wind down top to bottom as the home view leaves; coming back, they
       build up again. Motion only: nothing fades and nothing is cut.
     - Pointer over the box: one eased half-turn, then it stops. A click opens #/ring?i=identity-1.
   Nothing here shows a number or a live state. */
(function () {
  'use strict';
  var S = window.DEFXNScene;
  if (!S || !S.ok || !S.world) return;
  var W = S.world, k = W.k, THREE = W.THREE, ease = W.ease, clamp01 = ease.clamp01;
  var home = document.querySelector('.view[data-view="home"], [data-world-home]'), box = home && home.querySelector('.idcard [data-helix]');
  if (!box) return;
  var card = box.closest('.idcard'), TAU = Math.PI * 2, PI = Math.PI;

  /* ---------- the form, in helix units (radius 1) ---------- */
  /* a tall, thin coil of many small blocks (board: storyboard 04): two and a half turns with a steep
     pitch, seen from above, so the front and back pass of every turn show */
  var NB = 36, TURNS = 2.5, BW = .4, BH = .28, BD = .3, PITCH = 1.45, RISE = TURNS * PITCH;
  var PS = .58, TILT = .4, PT = TILT * .6;   /* person block size; we look down on the coil; the person block turns most of that back to face you */
  var TAPER = .86, BACK = .6;                /* where the top narrows in to the person block; the back pass of each turn, a little darker */
  var TOP = RISE + .28 + .5 * Math.sin(TILT); /* the person block's centre: clear of the top turn as the tilt lifts its back pass */
  var LINE0 = -BH * .5, LINE1 = TOP - PS * .5;   /* the proof line: from the foot of the helix to the person block */
  /* each block: its angle, height, radius and climb. The chain starts at the left, comes round the
     front, and at the top it narrows in to the person block, so the chain leads to you. */
  var B = [];
  for (var i = 0; i < NB; i++) {
    var u = i / (NB - 1), tp = u < TAPER ? 0 : (u - TAPER) / (1 - TAPER), taper = tp * tp * (3 - 2 * tp);
    B.push({ a: (1 - u) * TURNS * TAU, y: u * RISE, r: 1 - (1 - (PS + BD) / 2 - .02) * taper });   /* it ends on the right, at the person block's side */
  }
  var STEP_A = TURNS * TAU / (NB - 1), SLOPE = Math.atan(RISE / (NB - 1) / STEP_A);

  /* the person glyph of the identity tiles (ring-kit.js GLYPH.person): bars of x, y, width, height on a tile face of width 1 */
  var PERSON = (k.GLYPH && k.GLYPH.person) || [];
  var GLYPH_SCALE = 2.1;   /* the glyph fills about half the person block's face, as on the board */

  /* ---------- scratch ---------- */
  var M = new THREE.Matrix4(), M2 = new THREE.Matrix4(), M3 = new THREE.Matrix4(), TM = new THREE.Matrix4(), VM = new THREE.Matrix4(), SPIN = new THREE.Matrix4();
  var ZERO = new THREE.Matrix4().makeScale(1e-4, 1e-4, 1e-4), RXT = new THREE.Matrix4().makeRotationX(TILT);
  var P = new THREE.Vector3(), Q = new THREE.Quaternion(), E = new THREE.Euler(), SC = new THREE.Vector3();
  function local(F, x, y, z, rx, ry, rz, sx, sy, sz, out) {
    Q.setFromEuler(E.set(rx || 0, ry || 0, rz || 0));
    TM.compose(P.set(x, y, z), Q, SC.set(Math.max(1e-4, sx), Math.max(1e-4, sy == null ? sx : sy), Math.max(1e-4, sz == null ? sx : sz)));
    return (out || M2).copy(F).multiply(TM);
  }
  function grow(u) { u = clamp01(u); return u <= 0 ? 1e-4 : u < 1 ? ease.out(u) : 1; }
  /* the height on the helix at a block index f (between blocks too; below the first, down to the line's foot) */
  function yAt(f) {
    if (f < 0) return LINE0 + (B[0].y - LINE0) * (f + 1);
    var a = Math.min(NB - 1, Math.floor(f)), b = Math.min(NB - 1, a + 1);
    return B[a].y + (B[b].y - B[a].y) * (f - a);
  }

  /* ---------- tones (theme colours, repainted with the theme) ---------- */
  var ember = new THREE.Color(), teal = new THREE.Color(), glass = new THREE.Color(), tealGlass = new THREE.Color(), col = new THREE.Color(), WHITE = new THREE.Color(1, 1, 1);
  function tones() {
    ember.copy(k.C.ember);   /* --ember (kit.css): a chain block's edge and the proof line */
    teal.copy(k.C.signal);
    glass.copy(k.mix('canvas', 'muted', .15));   /* smoky, near-black glass (board: Chain block) */
    tealGlass.copy(k.mix('canvas', 'signal', .1));
    plate.material.color.copy(k.C.canvas);
    [lineCore, lineGlow].forEach(function (m) { m.material.uniforms.cA.value.copy(ember); m.material.uniforms.cB.value.copy(teal); });
  }

  /* ---------- materials ---------- */
  /* near-black glass with a clear coat: the edge and the inner light are drawn in light, below */
  function glassSet(n, geo) {
    var s = k.blockSet(n, geo, { plain: true, shadow: false }), m = s.mesh.material;
    m.transparent = true; m.opacity = .62; m.depthWrite = false; m.roughness = .3; m.metalness = .1;
    m.clearcoat = .7; m.clearcoatRoughness = .22; m.sheen = 0; m.envMapIntensity = 1.2;   /* soft glints: a mirror top face blooms into a flare at this size */
    s.mesh.renderOrder = 4; s.pickable = null;
    return s;
  }
  /* light that is drawn, not lit: additive, so it reads as glow and passes the glow pass */
  function lightSet(geo, n, side, order) {
    var m = k.instanced(geo, new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: side || THREE.FrontSide }), n, false);
    m.renderOrder = order || 6;
    for (var j = 0; j < n; j++) { m.setMatrixAt(j, ZERO); m.setColorAt(j, WHITE); }
    return { mesh: m, place: function (j, mm) { m.setMatrixAt(j, mm || ZERO); }, tint: function (j, c) { m.setColorAt(j, c); m.instanceColor.needsUpdate = true; }, show: function (on) { m.visible = on; } };
  }
  var BAR = new THREE.BoxGeometry(1, 1, 1);
  var blocks = glassSet(NB, k.bevel(BW, BH, BD)), inner = lightSet(k.bevel(BW, BH, BD), NB, THREE.BackSide, 3);
  var person = glassSet(1, k.bevel(1, 1, 1)), personIn = lightSet(k.bevel(1, 1, 1), 1, THREE.BackSide, 3);
  var edgeBars = lightSet(BAR, (NB + 1) * 12), glyph = lightSet(BAR, PERSON.length * 2, THREE.FrontSide, 7);
  /* the twelve edges of a block of size sx, sy, sz in frame F, laid on its bevel */
  var EDGES = [];
  [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach(function (ax) { [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function (q) { EDGES.push({ ax: ax, q: q }); }); });
  var EC = new THREE.Vector3(), EP = new THREE.Vector3(), cFar = new THREE.Color();
  function edges(base, F, sx, sy, sz, t, amt, c, far) {
    var r = .1 * Math.min(sx, sy, sz), hx = sx / 2 - r * .3, hy = sy / 2 - r * .3, hz = sz / 2 - r * .3;
    var dc = EC.set(0, 0, 0).applyMatrix4(F).distanceTo(k.camera.position);
    for (var e = 0; e < 12; e++) {
      var d = EDGES[e], j = base + e;
      if (!(amt > .01)) { edgeBars.place(j, null); continue; }
      var x, y, z, lx, ly, lz;
      if (d.ax[0]) { x = 0; y = d.q[0] * hy; z = d.q[1] * hz; lx = (sx - r * 1.2) * amt; ly = t; lz = t; }
      else if (d.ax[1]) { x = d.q[0] * hx; y = 0; z = d.q[1] * hz; lx = t; ly = (sy - r * 1.2) * amt; lz = t; }
      else { x = d.q[0] * hx; y = d.q[1] * hy; z = 0; lx = t; ly = t; lz = (sz - r * 1.2) * amt; }
      edgeBars.place(j, local(F, x, y, z, 0, 0, 0, lx, ly, lz, M3));
      /* an edge on the far side of the block is seen through the glass: dimmer */
      edgeBars.tint(j, EP.set(x, y, z).applyMatrix4(F).distanceTo(k.camera.position) > dc ? cFar.copy(c).multiplyScalar(far) : c);
    }
  }

  /* the proof line: a thin core and a soft glow round it, amber, turning teal only where it meets you,
     drawn up to `reveal` with its head brightest while it rises */
  function lineMesh(r, gain, alpha, core) {
    var m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 10, 1, true).translate(0, .5, 0), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, clipping: true,
      uniforms: { reveal: { value: 0 }, cA: { value: new THREE.Color() }, cB: { value: new THREE.Color() }, gain: { value: gain }, alpha: { value: alpha }, core: { value: core } },
      vertexShader: `#include <clipping_planes_pars_vertex>
        varying float vY;
        void main() {
          vY = position.y;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.);
          #include <clipping_planes_vertex>
          gl_Position = projectionMatrix * mvPosition;
        }`,
      fragmentShader: `#include <clipping_planes_pars_fragment>
        uniform float reveal; uniform vec3 cA; uniform vec3 cB; uniform float gain; uniform float alpha; uniform float core;
        varying float vY;
        void main() {
          #include <clipping_planes_fragment>
          if (vY > reveal) discard;
          vec3 c = mix(mix(cA, cB, smoothstep(.86, 1., vY)), vec3(1.), core);
          float head = smoothstep(reveal - .08, reveal, vY) * step(reveal, .999);
          gl_FragColor = vec4(c * gain * (1. + head * 1.6), alpha);
        }`
    }));
    m.matrixAutoUpdate = false; m.frustumCulled = false; m.visible = false; m.renderOrder = 5; k.scene.add(m);
    return m;
  }
  var lineCore = lineMesh(1, 1.35, 1, .3), lineGlow = lineMesh(1, 1, .22, 0);
  var LINE_R = .011, GLOW_R = .045;

  /* the plate behind the helix: the card's glass colour, so the hole reads as part of the card. The
     world blends in linear light, so .975 here dims what is behind about as much as the card's .84 */
  var plate = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: .975, depthWrite: true, toneMapped: false }));
  plate.matrixAutoUpdate = false; plate.frustumCulled = false; plate.visible = false; plate.renderOrder = 2; k.scene.add(plate);

  k.onPaint(tones); tones();

  /* the card wipes in and out with a clip-path (app.js gives the rail .rise); the canvas is under the
     page and is not clipped with it, so the helix clips itself to the part of its box on screen. The
     planes are set every frame (clipTo); only these materials use them. */
  var CLIP = [new THREE.Plane(), new THREE.Plane(), new THREE.Plane(), new THREE.Plane()];
  k.renderer.localClippingEnabled = true;
  [blocks.mesh, person.mesh, inner.mesh, personIn.mesh, edgeBars.mesh, glyph.mesh, lineCore, lineGlow].forEach(function (m) { m.material.clippingPlanes = CLIP; });

  /* ---------- how big the helix is, seen from the front at any turn ----------
     Derived from the form itself, once: every corner of every block and of the person block, at 24
     turns, through the tilt. The helix is then scaled so this box fits inside the screen box. */
  var BOUND = (function () {
    var b = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 }, R = new THREE.Matrix4(), A = new THREE.Matrix4(), C = new THREE.Vector3();
    function corners(F, sx, sy, sz) {
      for (var c = 0; c < 8; c++) {
        C.set((c & 1 ? .5 : -.5) * sx, (c & 2 ? .5 : -.5) * sy, (c & 4 ? .5 : -.5) * sz).applyMatrix4(F);
        b.x0 = Math.min(b.x0, C.x); b.x1 = Math.max(b.x1, C.x); b.y0 = Math.min(b.y0, C.y); b.y1 = Math.max(b.y1, C.y);
      }
    }
    for (var s = 0; s < 24; s++) {
      R.copy(RXT).multiply(A.makeRotationY(s / 24 * TAU));
      B.forEach(function (bk) { corners(blockFrame(R, bk, 0, M.clone()), BW, BH, BD); });
      corners(personFrame(R, M.clone()), PS, PS, PS);
    }
    return b;
  })();
  function blockFrame(F, bk, drop, out) { return local(F, Math.cos(bk.a) * bk.r, bk.y + (drop || 0), Math.sin(bk.a) * bk.r, 0, PI / 2 - bk.a, SLOPE, 1, 1, 1, out); }
  function personFrame(F, out) { return local(F, 0, TOP, 0, -PT, 0, 0, 1, 1, 1, out); }

  /* ---------- the screen box, in the world ---------- */
  var ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), FWD = new THREE.Vector3();
  var D = 14;   /* how far in front of the camera the helix stands: nearer than anything at home */
  function rayAt(x, y, d, out) {
    var sz = k.size(); ndc.set(x / sz.w * 2 - 1, 1 - y / sz.h * 2); ray.setFromCamera(ndc, k.camera);
    return out.copy(ray.ray.origin).addScaledVector(ray.ray.direction, d / ray.ray.direction.dot(FWD));
  }
  var RC = new THREE.Vector3(), RT = new THREE.Vector3(), RB = new THREE.Vector3(), RL = new THREE.Vector3(), RR = new THREE.Vector3();
  var MARGIN = .06, view = { scale: 0 };
  /* the helix's frame for the box r: centred, facing the camera, tilted so we look down on it */
  function frameFor(r, out) {
    k.camera.getWorldDirection(FWD);
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    rayAt(cx, cy, D, RC);
    var perPx = rayAt(cx, r.top, D, RT).distanceTo(rayAt(cx, r.bottom, D, RB)) / r.height;
    var s = Math.min(r.width * (1 - MARGIN) / (BOUND.x1 - BOUND.x0), r.height * (1 - MARGIN) / (BOUND.y1 - BOUND.y0)) * perPx;
    view.scale = s;
    out.compose(RC, k.camera.quaternion, SC.set(s, s, s));
    return out.multiply(TM.makeTranslation(-(BOUND.x0 + BOUND.x1) / 2, -(BOUND.y0 + BOUND.y1) / 2, 0)).multiply(RXT);
  }
  /* the plate: exactly over the box (a pixel larger all round), just behind the helix */
  function placePlate(r) {
    var d = D + 2.2 * view.scale, cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    rayAt(cx, cy, d, RC);
    var h = rayAt(cx, r.top - 1, d, RT).distanceTo(rayAt(cx, r.bottom + 1, d, RB)), w = rayAt(r.left - 1, cy, d, RL).distanceTo(rayAt(r.right + 1, cy, d, RR));
    plate.matrix.compose(RC, k.camera.quaternion, SC.set(w, h, 1)); plate.matrixWorldNeedsUpdate = true;
  }

  /* what of the box is on screen: the box, cut by every clip-path inset on the way up (the rail's
     wipe). A length is px, % or calc() of both, as a computed clip-path mid-transition is. */
  function len(str, ref, z) {
    var sum = 0, sign = 1;
    str.replace(/calc|\(|\)/g, ' ').trim().split(/\s+/).forEach(function (tok) {
      if (tok === '+') { sign = 1; return; }
      if (tok === '-') { sign = -1; return; }
      var n = parseFloat(tok); if (isNaN(n)) return;
      sum += sign * (tok.slice(-1) === '%' ? n / 100 * ref : n * z); sign = 1;
    });
    return sum;
  }
  function insets(cp, w, h, z) {
    var body = cp.slice(6, cp.lastIndexOf(')')).split(' round ')[0], parts = [], depth = 0, cur = '';
    for (var i = 0; i < body.length; i++) {
      var ch = body[i]; if (ch === '(') depth++; else if (ch === ')') depth--;
      if (ch === ' ' && depth === 0) { if (cur) parts.push(cur); cur = ''; } else cur += ch;
    }
    if (cur) parts.push(cur);
    var t = parts[0] || '0', r = parts[1] || t, b = parts[2] || t, l = parts[3] || r;
    return [len(t, h, z), len(r, w, z), len(b, h, z), len(l, w, z)];
  }
  var vis = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
  function visible(r) {
    var l = r.left, t = r.top, rt = r.right, b = r.bottom, z = window.DEFXNKitUI && window.DEFXNKitUI.scale ? window.DEFXNKitUI.scale() : 1;
    for (var el = box.parentElement; el && el !== document.documentElement; el = el.parentElement) {
      var cp = getComputedStyle(el).clipPath;
      if (!cp || cp.indexOf('inset(') !== 0) continue;
      var er = el.getBoundingClientRect(), q = insets(cp, er.width, er.height, z);
      l = Math.max(l, er.left + q[3]); rt = Math.min(rt, er.right - q[1]); t = Math.max(t, er.top + q[0]); b = Math.min(b, er.bottom - q[2]);
    }
    vis.left = l; vis.top = t; vis.right = rt; vis.bottom = b; vis.width = rt - l; vis.height = b - t;
    return vis;
  }
  /* four planes through the camera along the visible box's edges, facing in */
  var CI = new THREE.Vector3(), CA = new THREE.Vector3(), CB = new THREE.Vector3(), CN = new THREE.Vector3();
  function edgePlane(pl, x0, y0, x1, y1) {
    var O = k.camera.position;
    rayAt(x0, y0, D, CA).sub(O); rayAt(x1, y1, D, CB).sub(O);
    pl.setFromNormalAndCoplanarPoint(CN.crossVectors(CA, CB).normalize(), O);
    if (pl.distanceToPoint(CI) < 0) pl.negate();
  }
  function clipTo(v) {
    rayAt((v.left + v.right) / 2, (v.top + v.bottom) / 2, D, CI);
    edgePlane(CLIP[0], v.left, v.top, v.left, v.bottom); edgePlane(CLIP[1], v.right, v.top, v.right, v.bottom);
    edgePlane(CLIP[2], v.left, v.top, v.right, v.top); edgePlane(CLIP[3], v.left, v.bottom, v.right, v.bottom);
  }

  /* ---------- state ----------
     The storyboard (home-descent.js) announces steps 1 to 4 as the world's clock passes them, on
     whatever view is shown, and keeps the last in DEFXNScene.storyStep. Its rule, shared with
     home-sites.js: a first step heard that is already 4 means a return visit or reduced motion, so
     the helix stands built at once. Steps 1 to 3 first, then 4 on home: the helix builds. */
  var BUILD = { step: 680 / (NB - 1), pop: 220, person: [800, 1100], lit: [900, 1300] }, BUILD_END = 1320;   /* every block placed in about 900 ms */
  var mode = 'wait', t0 = 0, homeFirst = false, waitTimer = 0, heard = S.storyStep | 0;
  function settle() { mode = 'done'; clearTimeout(waitTimer); k.wake(40); }
  function build() { mode = 'build'; t0 = performance.now(); clearTimeout(waitTimer); k.wake(BUILD_END + 80); }
  if (heard >= 4 || k.reduced) settle();
  /* home shows for the first time: wait for step 4, and stand built if it does not come in 4.5 s */
  function onHomeFirst() { if (mode === 'wait') waitTimer = setTimeout(function () { if (mode === 'wait') settle(); }, 4500); }
  document.addEventListener('defxn:story', function (e) {
    var n = e.detail && e.detail.step | 0, first = !heard;
    heard = Math.max(heard, n);
    if (n !== 4 || mode !== 'wait') return;
    if (first || k.reduced || W.view() !== 'home') settle(); else build();
  });
  /* the half-turn on hover: one at a time, eased, and it stops */
  var spin = W.tween(0);
  box.addEventListener('pointerenter', function () {
    if (k.reduced || W.view() !== 'home') return;
    var now = performance.now();
    if (Math.abs(spin.get(now) - spin.to) > 1e-3) return;   /* still turning */
    spin.go(spin.to + PI, 820, now);
  });
  /* a click opens the identity chain's page (the box carries data-ui, so the click picks no ring behind the card) */
  box.addEventListener('click', function () { S.open('ring', { i: 'identity-1' }); });

  /* the box can move without the world moving (a layout change, a transition, a scroll): draw again */
  var lastRect = '';
  function nudge() { if (W.view() === 'home' || home.classList.contains('out')) k.wake(60); }
  if (window.ResizeObserver) { var ro = new ResizeObserver(nudge); [box, card, card && card.parentElement].forEach(function (el) { if (el) ro.observe(el); }); }
  ['transitionrun', 'transitionstart', 'transitionend', 'transitioncancel', 'animationstart', 'animationend'].forEach(function (ev) {
    document.addEventListener(ev, function (e) { if (e.target && e.target.contains && e.target.contains(box)) nudge(); }, { passive: true });
  });
  window.addEventListener('scroll', nudge, { passive: true });
  new MutationObserver(nudge).observe(home, { attributes: true, attributeFilter: ['class'] });

  /* ---------- every frame the world draws, once the camera is placed ---------- */
  var shown = null;
  function showAll(on) {
    if (on === shown) return; shown = on;
    [blocks, person].forEach(function (s) { s.show(on); });
    [inner, personIn, edgeBars, glyph].forEach(function (s) { s.show(on); });
    if (!on) { lineCore.visible = lineGlow.visible = false; plate.visible = false; }
  }
  var LM = new THREE.Matrix4(), FB = new THREE.Matrix4(), FP = new THREE.Matrix4(), dbg = { blocks: B.map(function () { return new THREE.Matrix4(); }), on: B.map(function () { return false; }), person: new THREE.Matrix4(), pOn: false };
  W.after(function (ms, now) {
    if (!homeFirst && W.view() === 'home') { homeFirst = true; onHomeFirst(); }
    var cardOn = home.classList.contains('on') || home.classList.contains('out') || (home.hasAttribute('data-world-home') && !home.closest('[hidden]')), hw = W.homeW();
    var r = box.getBoundingClientRect();
    if (!cardOn || r.width < 8 || r.height < 8 || r.bottom < 0 || r.top > innerHeight) { showAll(false); return; }
    showAll(true);
    var v = visible(r), key = [r.left, r.top, r.width, r.height, v.left, v.top, v.right, v.bottom].map(function (x) { return x.toFixed(1); }).join();
    if (key !== lastRect) { lastRect = key; k.wake(60); }   /* the box moves, or the card's wipe moves: keep drawing until it stops */

    if (v.width < 1 || v.height < 1) { showAll(false); return; }   /* wiped away with the card */
    frameFor(r, VM);
    placePlate(v); plate.visible = true;
    clipTo(v);

    /* how far the build has got (ms since step 4), and how much of home is here (leaving, arriving) */
    var t = mode === 'build' ? now - t0 : mode === 'done' ? 1e9 : -1;
    if (mode === 'build' && t > BUILD_END) settle();
    var front = hw * (NB + 4) - 1;   /* leaving: the top goes first; arriving: the foot comes first */
    var turn = spin.get(now);
    SPIN.copy(VM).multiply(M.makeRotationY(turn));

    var reach = -1;   /* the highest block placed: the line rises with the build */
    for (var i = 0; i < NB; i++) {
      var bk = B[i], gb = t < 0 ? 0 : clamp01((t - i * BUILD.step) / BUILD.pop), gl = clamp01((front - i) / 3), g = grow(gb) * grow(gl);
      if (gb > 0 && gl > 0) reach = Math.max(reach, i - 1 + Math.min(gb, gl));
      var F = blockFrame(SPIN, bk, (1 - ease.out(gb)) * .35, FB);   /* each block drops the last bit into place */
      blocks.place(i, local(F, 0, 0, 0, 0, 0, 0, g));
      inner.place(i, local(F, 0, 0, 0, 0, 0, 0, g * .96));
      /* the blocks at the back are seen through the ones in front: dimmer */
      var z = -Math.cos(bk.a) * Math.sin(turn) + Math.sin(bk.a) * Math.cos(turn), depth = .5 + .5 * z, up = .75 + .25 * (i / (NB - 1));
      blocks.tint(i, col.copy(glass).multiplyScalar(BACK + (1 - BACK) * depth));
      inner.tint(i, col.copy(ember).multiplyScalar(.1 * (BACK + (1 - BACK) * depth) * up));
      edges(i * 12, F, BW * g, BH * g, BD * g, .016, g, col.copy(ember).lerp(WHITE, .22).multiplyScalar(.62 * (BACK + (1 - BACK) * depth) * up), .32);   /* a pale rim with a warm cast: the board's faint ember edge */
      dbg.on[i] = g > .01; if (dbg.on[i]) local(F, 0, 0, 0, 0, 0, 0, g, g, g, dbg.blocks[i]);
    }
    /* the person block: it grows in as the line reaches it, then lights */
    var gpRaw = t < 0 ? 0 : clamp01((t - BUILD.person[0]) / (BUILD.person[1] - BUILD.person[0])), gp = grow(gpRaw), lit = t < 0 ? 0 : ease.inOut(clamp01((t - BUILD.lit[0]) / (BUILD.lit[1] - BUILD.lit[0])));
    var gpl = clamp01((front - NB) / 3), ps = PS * (gp < 1 ? (gp <= 1e-4 ? 1e-4 : ease.back(gp)) : 1) * grow(gpl);
    lit *= grow(gpl);
    personFrame(SPIN, FP);
    person.place(0, local(FP, 0, 0, 0, 0, 0, 0, ps)); person.tint(0, col.copy(glass).lerp(tealGlass, lit));
    personIn.place(0, local(FP, 0, 0, 0, 0, 0, 0, ps * .96)); personIn.tint(0, col.copy(teal).multiplyScalar(.05 + .17 * lit));
    edges(NB * 12, FP, ps, ps, ps, .03, ps > .02 ? 1 : 0, col.copy(ember).lerp(teal, lit).multiplyScalar(1.1 + .9 * lit), .45);
    /* the person glyph, lit with the block, on the face toward you: the front, or after a half-turn the back (mirrored) */
    PERSON.forEach(function (gb2, n) {
      for (var f = 0; f < 2; f++) {
        var j = n * 2 + f, zf = (f ? -1 : 1) * (.5 + .012), on = ps > .05 && lit > .01 && (Math.cos(turn) >= 0) === !f;   /* only the face toward you */
        glyph.place(j, on ? local(FP, (f ? -1 : 1) * gb2[0] * GLYPH_SCALE * ps, (gb2[1] - .01) * GLYPH_SCALE * ps, zf * ps, 0, 0, (f ? -1 : 1) * (gb2[4] || 0), gb2[2] * GLYPH_SCALE * ps, gb2[3] * GLYPH_SCALE * ps, .02 * ps, M3) : null);
        glyph.tint(j, col.copy(teal).lerp(WHITE, .25 * lit).multiplyScalar(.4 + 2.2 * lit));
      }
    });
    dbg.pOn = ps > .02; if (dbg.pOn) local(FP, 0, 0, 0, 0, 0, 0, ps, ps, ps, dbg.person);

    /* the proof line, up the axis from the foot to the person block: it reaches the highest block
       placed, and the person block once that grows */
    var yReach = reach <= -1 ? LINE0 : yAt(reach), pg = Math.min(gpRaw, gpl);
    if (pg > 0) yReach = Math.max(yReach, B[NB - 1].y + (LINE1 - B[NB - 1].y) * pg);
    var rv = clamp01((yReach - LINE0) / (LINE1 - LINE0));
    lineCore.visible = lineGlow.visible = rv > .005;
    if (rv > .005) {
      [[lineCore, LINE_R], [lineGlow, GLOW_R]].forEach(function (lm) {
        lm[0].matrix.copy(VM).multiply(LM.makeTranslation(0, LINE0, 0)).multiply(M3.makeScale(lm[1], LINE1 - LINE0, lm[1]));
        lm[0].matrixWorldNeedsUpdate = true; lm[0].material.uniforms.reveal.value = rv;
      });
    }
  });

  /* ---------- for checking in a browser console ---------- */
  window.DEFXNHelix = {
    /* where the helix is on screen, against its box: every visible corner, projected */
    debug: function () {
      var r = box.getBoundingClientRect(), bb = { l: 1e9, t: 1e9, r: -1e9, b: -1e9 }, C = new THREE.Vector3(), n = 0;
      function corners(F, sx, sy, sz) {
        for (var c = 0; c < 8; c++) {
          C.set((c & 1 ? .5 : -.5) * sx, (c & 2 ? .5 : -.5) * sy, (c & 4 ? .5 : -.5) * sz).applyMatrix4(F);
          var p = k.project(C, {}); if (!p) continue; n++;
          bb.l = Math.min(bb.l, p.x); bb.r = Math.max(bb.r, p.x); bb.t = Math.min(bb.t, p.y); bb.b = Math.max(bb.b, p.y);
        }
      }
      dbg.blocks.forEach(function (F, i) { if (dbg.on[i] && shown) corners(F, BW, BH, BD); });
      if (dbg.pOn && shown) corners(dbg.person, 1, 1, 1);
      return { bound: BOUND, scale: view.scale, mode: mode, shown: shown, visible: { l: vis.left, t: vis.top, r: vis.right, b: vis.bottom }, turn: spin.get(performance.now()), corners: n, box: { l: r.left, t: r.top, r: r.right, b: r.bottom },
        drawn: n ? bb : null, inside: n ? bb.l >= r.left - .5 && bb.r <= r.right + .5 && bb.t >= r.top - .5 && bb.b <= r.bottom + .5 : null };
    },
    /* play the build again (testing) */
    replay: function () { mode = 'wait'; build(); }
  };
})();

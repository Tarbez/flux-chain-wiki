/* DEFXN mockup app: DEFXN, the base chain kernel, as a logo inlaid in the ground, and the record descent as the stage
   of #/trace (owner's board "Record descent", 2026-10-24; owner, later the same day: "move the new
   orange box into a new page and remove that from the home illustration"; and the hub's ring gives way
   to the DEFXN logo, embedded in the grid as part of the ground).

   The ground logo, at the hub's centre on every view: the DEFXN mark cut into a floor-dark plate, its
   edge lit teal. On home the hub's own ring and its round mark sink into it (chains-scene.js), a thin
   beam rises out of it. It stands for DEFXN, the base chain kernel, which knows no coin (owner,
   2026-10-24): hover names it, a click opens the base-chain layer (#/layers?s=0). Home's
   labels: DEFXN, DeArk and CR3TV (.tags[data-for="home"]). The identity helix
   (home-helix.js) and the radio.fxn panels (home-sites.js) are other files. They follow home's
   storyboard through the event below.

   On #/trace (the page is trace-view.js), the record descent: a thin proof line rises out of the
   logo and runs toward you into the newest record of your sample chain (records-sample.js), a big
   near-black glass block with an ember edge. Its card shows the chosen record's place in the chain,
   then its fields with the signature last (the same fields as the Signature tab). From the block the
   line bends left through the records before it, each smaller and darker, to genesis, the chain's
   first record. ?s=<id> chooses a record: its block lights. The descent comes in along the line and
   goes back the same way; it never fades.

   Home's storyboard (first visit, about 4 s): the wide grid builds with the logo and its beam, then
   the identity chain builds. Steps are announced as document event 'defxn:story' with detail.step:
   step 1 at the start, step 4 for the helix. The step is kept in DEFXNScene.storyStep for a late
   reader. A return visit starts at the end and announces step 4 at once. Nothing here shows a count,
   a place or a live state: the only words are the sample chain's own and the names of the networks. */
(function () {
  'use strict';
  var S = window.DEFXNScene;
  if (!S || !S.ok || !S.world) return;
  var W = S.world, k = W.k, THREE = W.THREE, V = W.V, ease = W.ease, clamp01 = ease.clamp01, N = W.N, HUB = W.HUB;
  var REC = (window.DEFXN_RECORDS || { records: [] }).records, TAU = Math.PI * 2, PI = Math.PI;
  if (!REC.length) return;

  /* a return visit starts with the world built (the board: "a return visit skips to the end") */
  /* the first visit's story (ArkWorld story): a return visit skips the build when story.skipOnReturn is on, and
     story.on off skips it always. The seen mark is written once, on the first visit. */
  var KEY = 'defxn-home-descent-seen', STORY = window.ArkWorld ? ArkWorld.get().story : { on: true, step1: 600, step4: 3900, skipOnReturn: true };
  try {
    var seen = !!localStorage.getItem(KEY);
    if (!STORY.on || (seen && STORY.skipOnReturn)) k.skipBuild();
    if (!seen) localStorage.setItem(KEY, '1');
  } catch (e) { if (!STORY.on) k.skipBuild(); /* no storage: the intro plays */ }

  /* home's storyboard, in ms of the world's own clock */
  var T = { logo: 650, beam: 1250, helix: STORY.step4 };   /* helix: the story's step 4 (ArkWorld story.step4) */

  var M = new THREE.Matrix4(), M2 = new THREE.Matrix4(), M3 = new THREE.Matrix4(), TM = new THREE.Matrix4(), ZERO = new THREE.Matrix4().makeScale(1e-4, 1e-4, 1e-4);
  var P = new THREE.Vector3(), Q = new THREE.Quaternion(), E = new THREE.Euler(), SC = new THREE.Vector3();
  function frame(x, y, z, rx, ry, out) { Q.setFromEuler(E.set(rx || 0, ry || 0, 0)); return (out || M).compose(P.set(x, y, z), Q, SC.set(1, 1, 1)); }
  function local(F, x, y, z, rx, ry, sx, sy, sz, out) {
    Q.setFromEuler(E.set(rx || 0, ry || 0, 0));
    TM.compose(P.set(x, y, z), Q, SC.set(Math.max(1e-4, sx), Math.max(1e-4, sy == null ? sx : sy), Math.max(1e-4, sz == null ? sx : sz)));
    return (out || M2).copy(F).multiply(TM);
  }
  function grow(u) { u = clamp01(u); return u <= 0 ? 1e-4 : u < 1 ? ease.out(u) : 1; }
  function span(ms, a, b) { return clamp01((ms - a) / (b - a)); }

  /* ---------- tones ---------- */
  var col = new THREE.Color(), ember = new THREE.Color(), glass = new THREE.Color(), green = new THREE.Color(), white = new THREE.Color(1, 1, 1);
  function css(name, fb) { var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v ? 'hsl(' + v.split(/\s+/).join(', ') + ')' : fb; }
  function tones() { ember.copy(k.C.ember || new THREE.Color(css('--ember', '#f7752a'))); glass.copy(k.mix('canvas', 'other', .1)); green.copy(k.C.signal); }
  k.onPaint(tones); tones();
  function hex(c) { return '#' + c.getHexString(); }
  function mono(g, px, sp, wt) { g.font = (wt || 500) + ' ' + px + 'px "JetBrains Mono", ui-monospace, monospace'; if ('letterSpacing' in g) g.letterSpacing = (sp == null ? 3 : sp) + 'px'; }
  function sans(g, px, wt) { g.font = (wt || 700) + ' ' + px + 'px "Inter Tight", Inter, system-ui, sans-serif'; if ('letterSpacing' in g) g.letterSpacing = '-1px'; }

  /* ---------- materials of the board ---------- */
  /* chain block: near-black glass with a clear coat; its edge is drawn in light (below) */
  function glassSet(n, geo, near) {
    var s = k.blockSet(n, geo, { plain: true, shadow: false, lift: .04, grainNormal: near ? .45 : 0 }), m = s.mesh.material;   /* near: seen up close, so a faint grain bump */
    m.transparent = true; m.opacity = .78; m.depthWrite = false; m.roughness = .1; m.metalness = .15; m.clearcoat = 1; m.clearcoatRoughness = .04; m.sheen = 0; m.envMapIntensity = 1.5;
    s.mesh.renderOrder = 4;
    return s;
  }
  /* light that is drawn, not lit: edges, the glow inside a block, beads; additive, so it reads as glow */
  function lightSet(geo, n, opts) {
    opts = opts || {};
    var m = k.instanced(geo, new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: opts.side || THREE.FrontSide, opacity: opts.opacity == null ? 1 : opts.opacity }), n, false);
    m.renderOrder = opts.order || 6;
    for (var j = 0; j < n; j++) { m.setMatrixAt(j, ZERO); m.setColorAt(j, white); }
    return { mesh: m, n: n, place: function (j, mm) { m.setMatrixAt(j, mm || ZERO); }, tint: function (j, c) { m.setColorAt(j, c); m.instanceColor.needsUpdate = true; }, show: function (on) { m.visible = on; } };
  }
  var BAR = new THREE.BoxGeometry(1, 1, 1);
  /* the twelve edges of a block of size s in frame F, sitting on its bevel */
  var EDGES = [];
  [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach(function (ax) {
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function (q) { EDGES.push({ ax: ax, q: q }); });
  });
  function edges(set, base, F, sx, sy, sz, t, amt, c) {
    var r = .1 * Math.min(sx, sy, sz), hx = sx / 2 - r * .3, hy = sy / 2 - r * .3, hz = sz / 2 - r * .3;
    for (var e = 0; e < 12; e++) {
      var d = EDGES[e], j = base + e;
      if (!(amt > .01)) { set.place(j, null); continue; }
      var x, y, z, lx, ly, lz;
      if (d.ax[0]) { x = 0; y = d.q[0] * hy; z = d.q[1] * hz; lx = (sx - r * 1.2) * amt; ly = t; lz = t; }
      else if (d.ax[1]) { x = d.q[0] * hx; y = 0; z = d.q[1] * hz; lx = t; ly = (sy - r * 1.2) * amt; lz = t; }
      else { x = d.q[0] * hx; y = d.q[1] * hy; z = 0; lx = t; ly = t; lz = (sz - r * 1.2) * amt; }
      set.place(j, local(F, x, y, z, 0, 0, lx, ly, lz, M3)); set.tint(j, c);
    }
  }

  /* ---------- the ground logo: DEFXN, the base chain kernel, inlaid in the floor ---------- */
  /* (owner, 2026-10-24: the hub's ring goes, and the DEFXN logo sits in the grid as part of the ground) A shallow plate in floor-dark metal, flush with the grid, its rim a thin
     line of teal. The mark is cut into it: its body a dark groove, its edge lit teal, a faint glow
     spilling onto the floor round it. The plate hides the grid inside it, so the grid runs up to its
     rim, and the network's dotted links meet that rim. It builds once with the world and stays: it is
     the ground. On home it is DEFXN, the base chain kernel: it carries no coin and no ledger. Hover
     names it, a click opens the base-chain layer. */
  var HC = HUB.c, RP = HUB.R * 1.02, Y0 = .03;
  var plate = k.blockSet(1, new THREE.CylinderGeometry(1, 1, .06, 96), { plain: true, lift: 0 });
  /* unlit: any lit surface reads lighter than the unlit ground and becomes a grey disc; the plate is a
     shade of the ground itself, and its rim, wall and the lit mark give it its depth */
  plate.mesh.material = new THREE.MeshBasicMaterial({ color: 0xffffff }); plate.mesh.receiveShadow = false; plate.mesh.castShadow = false;
  plate.lift = 0;   /* the ground does not lift under the pointer */
  plate.pickable = function () { return W.view() === 'home' && W.homeW() > .9; };
  plate.label = function () { return { name: 'DEFXN · The base chain kernel', act: 'Open' }; };
  plate.onPick = function () { S.open('layers', { s: 0 }); };   /* the base-chain layer */
  function flat(geo, opts) {
    var m = new THREE.Mesh(geo.rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial(Object.assign({ toneMapped: false, transparent: true, depthWrite: false }, opts || {})));
    m.renderOrder = 2; m.visible = false; m.matrixAutoUpdate = true; k.scene.add(m); return m;
  }
  var wall = flat(new THREE.RingGeometry(RP * .9, RP, 96, 1)), rim = flat(new THREE.RingGeometry(RP * .992, RP * 1.008, 128, 1), { blending: THREE.AdditiveBlending });
  var halo = flat(new THREE.RingGeometry(RP * 1.06, RP * 1.075, 128, 1), { blending: THREE.AdditiveBlending });
  var LS = RP * 1.5, groove = flat(new THREE.PlaneGeometry(LS, LS)), edge = flat(new THREE.PlaneGeometry(LS, LS), { blending: THREE.AdditiveBlending }), glow = flat(new THREE.PlaneGeometry(LS * 1.5, LS * 1.5), { blending: THREE.AdditiveBlending });
  var logoReady = false;
  (function () {
    if (!window.DEFXN_MARK) return;
    var img = new Image();
    img.onload = function () {
      var Z = 512, pad = 56;
      function cv() { var c = document.createElement('canvas'); c.width = c.height = Z; return c; }
      /* the mark as a white mask; the same mask worn away by a few pixels; their difference is the edge */
      var mask = cv(), gm = mask.getContext('2d'); gm.drawImage(img, pad, pad, Z - 2 * pad, Z - 2 * pad); gm.globalCompositeOperation = 'source-in'; gm.fillStyle = '#fff'; gm.fillRect(0, 0, Z, Z);
      var worn = cv(), gw = worn.getContext('2d'), d = 6; gw.drawImage(mask, 0, 0); gw.globalCompositeOperation = 'destination-in';
      [[d, 0], [-d, 0], [0, d], [0, -d], [d * .7, d * .7], [-d * .7, d * .7], [d * .7, -d * .7], [-d * .7, -d * .7]].forEach(function (o) { gw.drawImage(mask, o[0], o[1]); });
      var band = cv(), gb = band.getContext('2d'); gb.drawImage(mask, 0, 0); gb.globalCompositeOperation = 'destination-out'; gb.drawImage(worn, 0, 0);
      /* the glow: the lit edge, soft, on a canvas half again as wide, so its light spills onto the floor */
      var spill = document.createElement('canvas'); spill.width = spill.height = Z; var gs = spill.getContext('2d');
      if ('filter' in gs) gs.filter = 'blur(7px)'; gs.drawImage(band, Z / 6, Z / 6, Z * 2 / 3, Z * 2 / 3);
      function tex(c) { var t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t; }
      groove.material.alphaMap = tex(mask); edge.material.alphaMap = tex(band); glow.material.alphaMap = tex(spill);
      [groove, edge, glow].forEach(function (m) { m.material.needsUpdate = true; });
      logoReady = true; k.redraw();
    };
    img.src = window.DEFXN_MARK;
  })();
  function paintLogo() {
    plate.tint(0, col.copy(k.mix('canvas', 'other', .07)));   /* floor-dark: a shade off the ground, not a disc on it */
    wall.material.color.copy(k.C.canvas).multiplyScalar(.55);
    groove.material.color.copy(k.C.canvas).multiplyScalar(.45);   /* the mark is cut in: its body darker than the plate */
  }
  k.onPaint(paintLogo); paintLogo();
  /* the beam: a thin green line of light rising out of the logo's middle (home only) */
  var fadeTex = (function () {
    var cv = document.createElement('canvas'); cv.width = 4; cv.height = 128; var g = cv.getContext('2d'), gr = g.createLinearGradient(0, 128, 0, 0);
    gr.addColorStop(0, '#fff'); gr.addColorStop(.35, '#bbb'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, 4, 128);
    return new THREE.CanvasTexture(cv);
  })();
  function beamMesh(r, op) {
    var m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 16, 1, true).translate(0, .5, 0),
      new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, alphaMap: fadeTex, opacity: op }));
    m.renderOrder = 7; m.visible = false; k.scene.add(m); return m;
  }
  var beamCore = beamMesh(.045, 1), beamGlow = beamMesh(.24, .28), BEAM_H = 7.5;
  /* atmosphere where a light motivates it (cinematic pass): a soft shaft round the beam, a glow the
     logo throws on the floor, and a sparse, still field of dust lit near the beam. Nothing drifts:
     the motes are placed once, and only the build moves them. */
  var shaft = new THREE.Mesh(new THREE.CylinderGeometry(.55, 1.5, 1, 32, 1, true).translate(0, .5, 0),
    new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, alphaMap: fadeTex, opacity: .055, side: THREE.DoubleSide }));
  shaft.renderOrder = 7; shaft.visible = false; k.scene.add(shaft);
  function radial() {
    var c = document.createElement('canvas'); c.width = c.height = 128; var g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, '#fff'); gr.addColorStop(.35, '#777'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  var RAD = radial();
  function floorGlow(r) {
    var m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, alphaMap: RAD }));
    m.renderOrder = 1; m.visible = false; k.scene.add(m); return m;
  }
  var logoPool = floorGlow(RP * 2.4), emberPool = floorGlow(7.5);
  var MOTES = 400, motePos = new Float32Array(MOTES * 3), moteCol = new Float32Array(MOTES * 3), moteK = new Float32Array(MOTES);
  (function () {
    var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    for (var i = 0; i < MOTES; i++) {
      var a = rnd() * TAU, rr = Math.pow(rnd(), .7) * 6.5, y = .3 + rnd() * 7.5;
      motePos[i * 3] = HC.x + Math.cos(a) * rr; motePos[i * 3 + 1] = y; motePos[i * 3 + 2] = HC.z + Math.sin(a) * rr;
      moteK[i] = Math.max(0, 1 - rr / 6.5) * (1 - y / 9);   /* lit by the beam: brighter near it */
    }
  })();
  var moteGeo = new THREE.BufferGeometry();   /* 400 are placed; the dust knob shows the first N (the first 150 are the built-in field) */ moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3)); moteGeo.setAttribute('color', new THREE.BufferAttribute(moteCol, 3));
  var motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({ size: .07, vertexColors: true, toneMapped: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  motes.renderOrder = 7; motes.visible = false; motes.frustumCulled = false; k.scene.add(motes);
  function paintMotes() { for (var i = 0; i < MOTES; i++) { var c = moteK[i]; moteCol[i * 3] = k.C.signal.r * c; moteCol[i * 3 + 1] = k.C.signal.g * c; moteCol[i * 3 + 2] = k.C.signal.b * c; } moteGeo.attributes.color.needsUpdate = true; }
  k.onPaint(paintMotes); paintMotes();
  /* the look's beam and dust (ArkWorld look.beam, look.dust): shown strength of the beam, shaft and glow, and how many specks */
  var BEAM_OP = [[beamCore, 1], [beamGlow, .28], [shaft, .055]];
  k.onLook(function (kn) { moteGeo.setDrawRange(0, Math.max(0, Math.min(MOTES, Math.round(kn.dust)))); BEAM_OP.forEach(function (b) { b[0].material.opacity = b[1] * kn.beam; }); });
  k.onPaint(function () { beamCore.material.color.copy(green).lerp(white, .45).multiplyScalar(1.6); beamGlow.material.color.copy(green).multiplyScalar(1.4); });
  /* the round mark over the hub sinks into the logo on home; elsewhere it stands as before */
  var MARK_Y = W.mark.position.y;

  /* ---------- #/trace: the record descent ---------- */
  /* the newest record floats in front of the network; the records before it run left and a little
     down, each smaller, to genesis */
  var nR = REC.length, BIG = 6.4;
  var CUBE = [{ p: V(.95, 3.2, 20.5), s: BIG }];
  var BACK = [V(-4.3, 2.8, 18.7), V(-7.4, 2.45, 17.6), V(-10.2, 2.15, 16.7), V(-12.7, 1.9, 15.9)], BSZ = [1.8, 1.4, 1.1, .9];
  for (var r = 1; r < nR; r++) CUBE.push({ p: BACK[Math.min(r - 1, BACK.length - 1)].clone(), s: BSZ[Math.min(r - 1, BSZ.length - 1)] });
  var cubes = glassSet(nR, k.bevel(1, 1, 1), true);
  var glowIn = lightSet(k.bevel(1, 1, 1), nR, { side: THREE.BackSide, opacity: 1, order: 3 });
  var edgeSet = lightSet(BAR, nR * 12);
  var sel = 0, live = 0;
  cubes.pickable = function () { return W.view() === 'trace' && live > .9; };
  cubes.label = function (j) {
    var rc = REC[j];
    return j === 0 ? { name: REC[sel].title, act: 'Open' } : j === nR - 1 ? { name: rc.title + ' · genesis, the first record', act: 'Follow its links' } : { name: rc.title, act: 'Choose' };
  };
  /* the big block opens the record its card shows; a block before it chooses that record (Back leaves
     the page); genesis follows its links */
  cubes.onPick = function (j) {
    if (j === 0) S.open('open', { r: REC[sel].id });
    else if (j === nR - 1) S.open('links', { r: REC[j].id });
    else S.open('trace', { s: REC[j].id }, { replace: true });
  };
  /* the proof line (the board's hero shot): it rises out of the ground logo, runs toward you over the
     front rings, into the newest record's back, through its middle (behind the card), out of its left
     side, then bends left through every record before it to genesis */
  var B0 = CUBE[0].p, H0 = BIG / 2;
  var CW = BIG * .9, CH = BIG * .8;   /* the card: most of the big block's front face */
  var BX = B0.x - .3;
  var path = [V(HC.x, Y0 + .02, HC.z), V(HC.x, 2.6, HC.z), V(HC.x, 2.6, HC.z + HUB.R + .9), V(HC.x + .9, 2.0, HC.z + HUB.R + 5.5),
    V(BX, 1.7, B0.z - H0 - 1.6), V(BX, B0.y - 1.2, B0.z - H0 - .2), V(BX, B0.y - 1.2, B0.z), V(B0.x - H0 - .2, B0.y - 1.2, B0.z)];
  var IB = 6;   /* the newest record's centre, on the line */
  var U = { cube: [] };   /* where along the line each record stands, 0 to 1 */
  for (var c = 1; c < nR; c++) path.push(CUBE[c].p.clone());
  var curve = new THREE.CatmullRomCurve3(path, false, 'catmullrom', 0);   /* tension 0: straight runs, sharp turns */
  function uAt(pi) { /* the line's share at path point pi */ var best = 0, bd = 1e9; for (var i = 0; i <= 400; i++) { var d = curve.getPointAt(i / 400).distanceTo(path[pi]); if (d < bd) { bd = d; best = i / 400; } } return best; }
  var U_BIG = uAt(IB); for (var ci = 1; ci < nR; ci++) U.cube[ci] = uAt(IB + 1 + ci); U.cube[0] = U_BIG;
  var lineMat = function (gain, alpha, whiteCore) {
    return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { reveal: { value: 0 }, cA: { value: new THREE.Color() }, cB: { value: new THREE.Color() }, gain: { value: gain }, alpha: { value: alpha }, core: { value: whiteCore } },
      vertexShader: `varying float vU;
        void main() { vU = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      /* green where it leaves the logo, ember along the chain (the board: white, green, amber); drawn up to the reveal, its head brightest */
      fragmentShader: `uniform float reveal; uniform vec3 cA; uniform vec3 cB; uniform float gain; uniform float alpha; uniform float core; varying float vU;
        void main() {
          if (vU > reveal) discard;
          vec3 c = mix(mix(cA, cB, smoothstep(.04, .16, vU)), vec3(1.), core);
          float head = smoothstep(reveal - .03, reveal, vU) * step(reveal, .999);
          gl_FragColor = vec4(c * gain * (1. + head * 1.5), alpha);
        }` });
  };
  var glowLine = new THREE.Mesh(new THREE.TubeGeometry(curve, 520, .07, 8, false), lineMat(1.3, .32, 0));
  var coreLine = new THREE.Mesh(new THREE.TubeGeometry(curve, 520, .018, 6, false), lineMat(1.6, 1, .35));
  [glowLine, coreLine].forEach(function (m) { m.renderOrder = 7; m.visible = false; m.frustumCulled = false; k.scene.add(m); });
  k.onPaint(function () { [glowLine, coreLine].forEach(function (m) { m.material.uniforms.cA.value.copy(green); m.material.uniforms.cB.value.copy(ember); }); });
  /* beads where the line turns and where it meets a record */
  var BEADS = [0, 1, 2, 3, 4, 5, 7], beads = lightSet(new THREE.SphereGeometry(1, 12, 10), BEADS.length + nR);
  var U_BEAD = BEADS.map(uAt), P_BEAD = U_BEAD.map(function (u) { return curve.getPointAt(u); });

  /* the card shows the chosen record: its place in the chain, then its fields, the signature last */
  function fieldsOf(i) {
    var rc = REC[i], older = REC[i + 1];
    return [['Type', rc.type || '—'], ['Title', rc.title], ['Date', rc.date], ['Links to', older ? older.title : 'Nothing: it is first'], ['Signature', rc.signedBy ? 'Your key' : 'Not signed']];
  }
  var card = k.textPlate(CW, CH, function (g, w, h) {
    var em = hex(ember), ink = hex(k.C.strong), mute = hex(k.C.muted), rc = REC[sel], FIELDS = fieldsOf(sel);
    g.fillStyle = 'rgb(9,8,7)'; g.fillRect(0, 0, w, h);   /* solid: the far edges' light is brighter than white, so even 10% of it crossed the words */
    g.strokeStyle = 'rgba(247,140,60,.55)'; g.lineWidth = 3; g.strokeRect(8, 8, w - 16, h - 16);
    mono(g, 62, 2, 600); g.fillStyle = ink; g.fillText('# ' + String(nR - sel).padStart(2, '0'), 28, 74);
    mono(g, 24, 5); g.fillStyle = mute; g.fillText('RECORD' + (rc.revision ? ' · REV ' + String(rc.revision).padStart(2, '0') : ''), 28, 110);
    g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(28, 128, w - 56, 2);
    FIELDS.forEach(function (f, i) {
      var y = 182 + i * 62, last = i === FIELDS.length - 1, signed = last && !!rc.signedBy;
      g.strokeStyle = signed ? em : 'rgba(255,255,255,.3)'; g.lineWidth = 3; g.strokeRect(30, y - 30, 38, 38);
      if (last) {   /* the signature's mark is a key, as in the Signature tab */
        g.strokeStyle = signed ? em : mute; g.lineWidth = 3; g.beginPath(); g.arc(42, y - 11, 6, 0, TAU); g.moveTo(48, y - 11); g.lineTo(60, y - 11); g.moveTo(56, y - 11); g.lineTo(56, y - 5); g.stroke();
      } else { mono(g, 22, 0, 600); g.fillStyle = mute; g.fillText(String(i + 1), 42, y - 3); }
      mono(g, 16, 3); g.fillStyle = mute; g.fillText(f[0].toUpperCase(), 84, y - 20);   /* the field's name small, its value large */
      sans(g, 36, 600); g.fillStyle = signed ? em : ink; g.fillText(f[1], 84, y + 14);
    });
  });
  card.mesh.renderOrder = 8;   /* drawn after the line and the edge light: what runs behind it stays behind it */

  /* the chosen block lifts a little and lights; the others step back */
  var pick = new Float32Array(nR), pickLast = 0;
  function stepPick(now) {
    var dt = pickLast ? Math.min(64, now - pickLast) : 16, a = k.reduced ? 1 : 1 - Math.exp(-dt / 160), moving = false;
    pickLast = now;
    for (var i = 0; i < nR; i++) { var want = i === sel ? 1 : 0, d = want - pick[i]; if (Math.abs(d) > .002) { pick[i] += d * a; moving = true; } else pick[i] = want; }
    if (moving) { k.wake(60); k.moved(60); }
  }
  var intro = W.tween(0), shownT = null;
  var newestTag = null;
  function showTrace(on) {
    if (on === shownT) return; shownT = on;
    /* its words go under its mark; the page's labels are made after this file loads, so the tag is looked up now */
    if (on && !newestTag) { newestTag = document.querySelector('.tags[data-for="trace"] [data-tag="newest"]'); if (newestTag) newestTag.dataset.at = 'below'; }
    cubes.show(on); [glowIn, edgeSet, beads].forEach(function (s) { s.show(on); });
    glowLine.visible = coreLine.visible = on;
    if (!on) { card.place(null); k.lights.ember.intensity = 0; emberPool.visible = false; }
  }
  S.stage({
    name: 'trace',
    /* the big block is the hero; the logo sits at the frame's top, where the line comes from */
    target: function (f, asp) { return { aim: V(-4.5, 2.8, 17.4), dist: W.fit(18.5, 10.5, asp, .94), elev: 19, yaw: 0, tilt: 1.2, n: 1.2 }; },
    set: function (st, w) {
      var i = REC.findIndex(function (rc) { return rc.id === st.s; }), was = sel;
      sel = i < 0 ? 0 : i;
      if (sel !== was) card.redraw();
      if (w < .05) { intro.snap(0); intro.go(1, 1500, performance.now(), 450); }
      k.wake(900);
    },
    pose: function (w, ms, now) {
      live = w; showTrace(w > .001); if (w <= .001) return;
      stepPick(now);
      /* the line comes in from the ground logo, and goes back the same way when you leave */
      var reveal = intro.get(now) * ease.inOut(clamp01(w * 1.25));
      glowLine.material.uniforms.reveal.value = coreLine.material.uniforms.reveal.value = reveal;
      U_BEAD.forEach(function (u, b) { var g = Math.max(1e-4, grow((reveal - u) * 30) * .085); beads.place(b, M.makeScale(g, g, g).setPosition(P_BEAD[b])); beads.tint(b, col.copy(ember).multiplyScalar(1.8)); });
      /* each record grows as the line reaches it; older ones smaller and darker; the chosen one lit */
      for (var ri = 0; ri < nR; ri++) {
        var C = CUBE[ri], u = pick[ri], g = grow((reveal - U.cube[ri] + .02) * 14), s = C.s * g * (ri ? 1 + .18 * u : 1), dark = ri / Math.max(1, nR - 1);
        var F = frame(C.p.x, C.p.y + (ri ? .35 * u : 0), C.p.z, 0, 0, M.clone());
        cubes.place(ri, local(F, 0, 0, 0, 0, 0, s)); cubes.tint(ri, col.copy(glass).multiplyScalar(1 - .35 * dark * (1 - u)));
        glowIn.place(ri, local(F, 0, 0, 0, 0, 0, s * .97)); glowIn.tint(ri, col.copy(ember).multiplyScalar((ri === 0 ? .05 : .035) * (1 - .6 * dark) + .07 * u));
        var lit = ri === 0 ? 1.2 + .7 * u : 1.45 * (1 - .4 * dark) + .9 * u;   /* far, small and dim, but still lit; the chosen one bright */
        edges(edgeSet, ri * 12, F, s, s, s, ri === 0 ? .035 : .022 + .012 * u, g, col.copy(ember).multiplyScalar(lit));
        beads.place(BEADS.length + ri, M.makeScale(.11 * g, .11 * g, .11 * g).setPosition(C.p)); beads.tint(BEADS.length + ri, col.copy(ember).multiplyScalar(2));
      }
      /* the card opens inside the big block once the line has reached it: it unfolds from its middle */
      var co = ease.inOut(clamp01((reveal - U_BIG) * 6));
      card.place(co > .02 ? local(frame(B0.x, B0.y, B0.z + H0 - .32), 0, 0, 0, 0, 0, Math.max(.02, co), co, 1) : null);
      /* the ember block is a small, hard light: it warms its neighbours and the floor under it */
      var el = grow((reveal - U_BIG) * 8) * clamp01(w * 1.25);
      k.lights.ember.position.set(B0.x, B0.y - .4, B0.z); k.lights.ember.intensity = k.knobs.emberLight * el;
      emberPool.visible = el > .01; emberPool.position.set(B0.x, .008, B0.z); emberPool.material.color.copy(ember).multiplyScalar(.3 * el);
    },
    anchor: function (out) { out.pos.set(B0.x, B0.y - (k.LIFT + .5) * 2, B0.z); out.quat.identity(); out.s = 2; },
    tags: function () {
      var on = intro.get(performance.now()) > .97, D1 = CUBE[1], G = CUBE[nR - 1];
      return [{ id: 'newest', p: V(B0.x - H0 * .8, .05, B0.z + H0), on: on },   /* under the big block: over it, the ring behind would cross its words */
        { id: 'prev', p: D1 ? D1.p.clone().add(V(-D1.s * .45, D1.s * .5 + .45, 0)) : V(0, -99, 0), on: on && !!D1 },
        { id: 'genesis', p: G.p.clone().add(V(-G.s * .45, G.s * .5 + .3, 0)), on: on }];
    }
  });

  /* ---------- home's labels (.tags[data-for="home"]): the ground logo and two networks ---------- */
  var layer = document.querySelector('.tags[data-for="home"]');
  var DEARK = N.NAMED ? Object.keys(N.NAMED).filter(function (i) { return N.NAMED[i].id === 'deark'; })[0] : null, CR3 = N.NAMED ? Object.keys(N.NAMED).filter(function (i) { return N.NAMED[i].id === 'cr3tv'; })[0] : null;
  if (layer) {
    var esc = window.DEFXNKitUI ? window.DEFXNKitUI.esc : function (s) { return s; };
    layer.innerHTML = [['logo', 'DEFXN', 'The base chain kernel', '', 'above'],
      ['deark', DEARK != null ? N.NAMED[DEARK].name : '', '', ' small', 'above'], ['cr3tv', CR3 != null ? N.NAMED[CR3].name : '', '', ' small', 'above']].map(function (t) {
      return '<span class="tag' + t[3] + '" data-tag="' + t[0] + '" data-at="' + t[4] + '"><b>' + esc(t[1]) + '</b>' + esc(t[2]) + '</span>';
    }).join('');
  }
  var built = 0;
  /* a label shows only where it covers none of the hero's words, the action or the feature row, and
     stays left of the right column */
  var words = null, sideL = innerWidth, sizes = {};
  function measureWords() {
    var home = document.querySelector('.view[data-view="home"], [data-world-home]'), side = home && home.querySelector('.rail'), out = [];
    if (!home) return out;
    function box(rc, mx, my) { out.push({ left: rc.left - mx, right: rc.right + mx, top: rc.top - my, bottom: rc.bottom + my }); }
    ['.eyebrow', 'h1', '.lede'].forEach(function (q) {
      home.querySelectorAll(q).forEach(function (el) {
        var walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), rg = document.createRange(), n;
        while ((n = walk.nextNode())) { if (!n.textContent.trim()) continue; rg.selectNodeContents(n); [].slice.call(rg.getClientRects()).forEach(function (rc) { box(rc, 8, 6); }); }
      });
    });
    /* the action and each item of the feature row, icon and words, with a 12px gap */
    home.querySelectorAll('.cta, .paths a').forEach(function (el) { box(el.getBoundingClientRect(), 12, 12); });
    sideL = side ? side.getBoundingClientRect().left : innerWidth;
    return out;
  }
  function forget() { words = null; sizes = {}; }
  window.addEventListener('resize', forget);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(forget);
  /* the box app.js will give the label (its placeTag), in screen pixels */
  function tagBox(id, x, y) {
    var el = layer && layer.querySelector('[data-tag="' + id + '"]'); if (!el) return null;
    var z = sizes[id] || (sizes[id] = { w: el.offsetWidth, h: el.offsetHeight, at: el.dataset.home || el.dataset.at || 'above', small: el.classList.contains('small') });
    var gx = z.small ? 13.5 : 16.5, gy = z.small ? 13.5 : 15.5;
    var bx = z.at === 'left' ? x - gx - z.w : z.at === 'right' ? x + gx : z.small ? x - z.w / 2 : x, by = z.at === 'below' ? y + gy : z.at === 'above' ? y - gy - z.h : y - z.h / 2;
    return { l: bx, t: by, r: bx + z.w, b: by + z.h };
  }
  function clear(id, p) {
    words = words || measureWords();
    var qp = k.project(p, {}); if (!qp) return false;
    var sc = window.DEFXNKitUI && window.DEFXNKitUI.scale ? window.DEFXNKitUI.scale() : 1, b = tagBox(id, qp.x / sc, qp.y / sc);
    if (!b) return true;
    var l = b.l * sc, t = b.t * sc, rr = b.r * sc, bt = b.b * sc;
    if (rr > sideL - 8) return false;
    for (var i = 0; i < words.length; i++) { var wd = words[i]; if (l < wd.right && rr > wd.left && t < wd.bottom && bt > wd.top) return false; }   /* no side of it fits: it stays hidden */
    return true;
  }
  /* chains-scene.js asks for these on home, after the camera is placed, and places them as a stage's */
  S.homeTags = function () {
    var on = built > .99, rs = W.ringList, tp = V(HC.x - RP * .98, Y0, HC.z - RP * .15), out = [
      { id: 'logo', p: tp, on: on && clear('logo', tp) }];   /* on the logo's far rim, a short leader down to it */
    if (DEARK != null) { var d = rs[DEARK], dp = V(d.c.x - d.R * .2, d.c.y + d.t * 1.6, d.c.z - d.R); out.push({ id: 'deark', p: dp, on: on && clear('deark', dp) }); }
    if (CR3 != null) { var c3 = rs[CR3], cp = V(c3.c.x, c3.c.y + c3.t * 1.5, c3.c.z - c3.R * .4); out.push({ id: 'cr3tv', p: cp, on: on && clear('cr3tv', cp) }); }   /* over its own ring */
    return out;
  };

  /* ---------- every frame, once the camera is placed ---------- */
  var shown = null;
  function showHome(on) {
    if (on === shown) return; shown = on;
    beamCore.visible = beamGlow.visible = shaft.visible = motes.visible = on;
    if (!on) W.mark.position.y = MARK_Y;
  }
  /* home's storyboard steps, for the helix and the site panels: announced as the world's clock passes
     each one, on whatever view is shown, so home is complete whenever you arrive. A first frame that
     is already past step 4 (a return visit, or reduced motion) announces step 4 alone. */
  var told = 0;
  function tell(n) { told = n; S.storyStep = n; document.dispatchEvent(new CustomEvent('defxn:story', { detail: { step: n } })); }
  var LOGO_M = new THREE.Matrix4();
  /* on request (the minute experience): light the ground logo further and raise the beam on any view, and turn
     them back. W.lightLogo(on, ms) / W.lightBeam(on, ms). Off, both are exactly as built: the grid's look is
     not touched. They are tweens, so the world draws only while one moves. */
  var logoX = W.tween(0), beamX = W.tween(0);
  W.lightLogo = function (on, ms) { logoX.go(on ? 1 : 0, ms || 700); };
  W.lightBeam = function (on, ms) { beamX.go(on ? 1 : 0, ms || 900); };
  W.after(function (ms) {
    if (told < 4) {
      var want = ms >= T.helix ? 4 : ms >= STORY.step1 ? 1 : 0;   /* step 1 is told at story.step1 */
      if (want === 4) tell(4); else if (want === 1 && !told) tell(1);
    }
    /* the ground logo builds once, from its middle out, and stays on every view; it steps back with
       the network when another world is in view */
    var lg = grow(span(ms, T.logo - 250, T.logo + 450)), le = grow(span(ms, T.logo + 100, T.logo + 800)), cur = W.cur(), nb = cur ? Math.min(1, cur.n) : 0;
    plate.place(0, LOGO_M.compose(P.set(HC.x, 0, HC.z), Q.identity(), SC.set(RP * Math.max(1e-4, lg), 1, RP * Math.max(1e-4, lg))));
    [wall, rim, halo].forEach(function (m) { m.visible = lg > .01; m.position.set(HC.x, Y0 + .002, HC.z); m.scale.setScalar(Math.max(1e-4, lg)); });
    [groove, edge, glow].forEach(function (m, i) { m.visible = logoReady && le > .01; m.position.set(HC.x, Y0 + .003 + i * .001, HC.z); m.scale.setScalar(Math.max(1e-4, le)); });
    rim.material.color.copy(k.C.signal).multiplyScalar(1.1 * (1 - .55 * nb)); halo.material.color.copy(k.C.signal).multiplyScalar(.28 * (1 - .6 * nb));
    /* the logo's teal glow is a light: it lights the floor round it and the near rings from below */
    var xl = logoX.get(performance.now()), xb = beamX.get(performance.now());
    var lit = le * (1 - .6 * nb) * (1 + .8 * xl);
    k.lights.logo.position.set(HC.x, .8, HC.z); k.lights.logo.intensity = k.knobs.logoLight * lit;
    logoPool.visible = lit > .01; logoPool.position.set(HC.x, .006, HC.z); logoPool.material.color.copy(k.C.signal).multiplyScalar(.16 * lit);
    edge.material.color.copy(k.C.signal).multiplyScalar(1.7 * (1 - .55 * nb) * (1 + .5 * xl)); glow.material.color.copy(k.C.signal).multiplyScalar(.2 * (1 - .6 * nb) * (1 + xl));
    var hw = W.homeW(), on = hw > .001;
    showHome(on || xb > .001);
    if (!on) {
      built = 0;
      if (xb > .001) {   /* the beam on request, on a view that is not home */
        [beamCore, beamGlow, shaft].forEach(function (m) { m.position.set(HC.x, Y0, HC.z); m.scale.set(1, Math.max(1e-4, BEAM_H * xb), 1); });
        shaft.material.color.copy(k.C.signal); motes.scale.set(1, Math.max(1e-4, xb), 1);
      }
      return;
    }
    var hwE = ease.inOut(hw);
    built = span(ms, T.beam, T.beam + 900);   /* the label comes once the logo and its beam stand */
    /* on home the round mark sinks into the logo and shrinks; the beam rises out of the logo's middle */
    W.mark.scale.multiplyScalar(Math.max(1e-4, 1 - hwE));
    W.mark.position.y = MARK_Y - hwE * MARK_Y;
    var bh = Math.max(grow(span(ms, T.beam, T.beam + 650)) * hwE, xb);
    [beamCore, beamGlow, shaft].forEach(function (m) { m.position.set(HC.x, Y0, HC.z); m.scale.set(1, Math.max(1e-4, BEAM_H * bh), 1); });
    shaft.material.color.copy(k.C.signal);
    motes.scale.set(1, Math.max(1e-4, bh), 1);
  });
})();

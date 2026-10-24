/* DEFXN mockup app: the two radio.fxn site panels on home (owner's board "Record descent",
   2026-10-24, "Published Site (radio.fxn)" in its scene graph).

   A name's site is served from the byte store and shown in a sandboxed frame, so a panel here means
   one thing: a published site, at a .fxn name. radio.fxn is the brief's own example name ("a name
   is flat: radio.fxn"). The brief names no second flat name, so both panels say radio.fxn, as the
   board does.

   Each panel is a tilted pane of dark glass with a teal edge: a small square icon and the name on
   top, three faint rows of the page under it. It floats over one of the two network chains of
   network-data.js (KIND 'network': DeArk and CR3TV) and a thin lit line runs from its foot down to
   that ring's rim. Nothing names a place or counts anything: the data has no node locations.

   Motion (MOTION-SPEC.md): on the storyboard's step 1, the wide grid (home-descent.js announces it
   as the 'defxn:story' event), each panel rises out of its ring once that ring has built. A first
   event that is already step 4 (a return visit, or reduced motion) shows them in place. If no step
   comes within 4.5 s of home first showing, they rise then. Under the pointer a panel lifts a
   little and stops. A click opens that ring's page. Leaving home, each panel sinks back into its
   ring as the camera leaves: motion only, never a fade or a cut. Frames run only while one moves. */
(function () {
  'use strict';
  var S = window.DEFXNScene;
  if (!S || !S.ok || !S.world) return;
  var W = S.world, k = W.k, THREE = W.THREE, V = W.V, ease = W.ease, clamp01 = ease.clamp01, N = W.N;
  var LIFT = k.LIFT;
  /* the two network chains of network-data.js (KIND 'network'): DeArk and CR3TV */
  var NETS = W.ringList.filter(function (r) { return r.kind === 'network' && !r.parent; }).slice(0, 2);
  if (!NETS.length) return;

  var M = new THREE.Matrix4(), M2 = new THREE.Matrix4(), M3 = new THREE.Matrix4(), TM = new THREE.Matrix4(), ZERO = new THREE.Matrix4().makeScale(1e-4, 1e-4, 1e-4);
  var P = new THREE.Vector3(), Q = new THREE.Quaternion(), E = new THREE.Euler(), SC = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  function frame(x, y, z, rx, ry, out) { Q.setFromEuler(E.set(rx || 0, ry || 0, 0, 'YXZ')); return (out || M).compose(P.set(x, y, z), Q, SC.set(1, 1, 1)); }
  function local(F, x, y, z, sx, sy, sz, out) {
    TM.compose(P.set(x, y, z), Q.identity(), SC.set(Math.max(1e-4, sx), Math.max(1e-4, sy == null ? sx : sy), Math.max(1e-4, sz == null ? sx : sz)));
    return (out || M2).copy(F).multiply(TM);
  }
  function span(ms, a, b) { return clamp01((ms - a) / (b - a)); }

  /* ---------- tones ---------- */
  var col = new THREE.Color(), teal = new THREE.Color(), glass = new THREE.Color(), white = new THREE.Color(1, 1, 1);
  function tones() { teal.copy(k.C.signal); glass.copy(k.mix('canvas', 'network', .12)).multiplyScalar(.7); }
  k.onPaint(tones); tones();
  function hex(c) { return '#' + c.getHexString(); }

  /* ---------- the panel: dark glass, a teal edge, its words ---------- */
  var SW = 3.0, SH = 2.3, SD = .1;
  var panes = k.blockSet(NETS.length, k.bevel(SW, SH, SD), { plain: true, shadow: false });
  var pm = panes.mesh.material;
  pm.transparent = true; pm.opacity = .82; pm.depthWrite = false; pm.roughness = .1; pm.metalness = .05;
  pm.clearcoat = 1; pm.clearcoatRoughness = .04; pm.envMapIntensity = .7; pm.sheen = 0; pm.specularIntensity = .5;   /* dark between its highlights, whichever way it turns to the key light */
  panes.mesh.renderOrder = 4;
  panes.lift = 0;   /* the whole panel lifts, words and line with it (below), not its glass alone */
  var edge = k.edgeLight(NETS.length, 'signal', 2.1);
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  var plates = NETS.map(function () {
    return k.textPlate(SW - .1, SH - .1, function (g, w, h) {
      var tl = hex(teal), x0 = 34, ic = 64, gr = g.createLinearGradient(0, 0, 0, h);
      /* light falls on the glass from above */
      gr.addColorStop(0, 'rgba(255,255,255,.07)'); gr.addColorStop(.45, 'rgba(255,255,255,.015)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      /* the site's icon: a small square, edged and lit in teal */
      g.strokeStyle = tl; g.lineWidth = 6; rr(g, x0, 30, ic, ic, 12); g.stroke();
      g.fillStyle = tl; rr(g, x0 + 17, 47, ic - 34, ic - 34, 6); g.fill();
      g.font = '700 66px "Inter Tight", Inter, system-ui, sans-serif'; if ('letterSpacing' in g) g.letterSpacing = '-1px';
      g.fillStyle = hex(k.C.strong); g.fillText('radio.fxn', x0 + ic + 24, 84);
      /* the page it serves: three rows, each a small mark and two faint lines */
      [.7, .52, .62].forEach(function (f, i) {
        var y = 136 + i * 88, bw = w - x0 * 2;
        g.fillStyle = 'rgba(255,255,255,.05)'; rr(g, x0, y, bw, 72, 10); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.09)'; g.lineWidth = 2; g.stroke();
        g.strokeStyle = 'rgba(120,220,190,.5)'; g.lineWidth = 3; rr(g, x0 + 14, y + 16, 40, 40, 7); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(x0 + 72, y + 22, (bw - 96) * f, 10);
        g.fillStyle = 'rgba(255,255,255,.11)'; g.fillRect(x0 + 72, y + 42, (bw - 96) * f * .7, 8);
      });
    });
  });
  /* the line from the panel's foot to its ring: a bright core in a soft glow, drawn in light */
  function lightSet(geo, n, opacity, order) {
    var m = k.instanced(geo, new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: opacity }), n, false);
    m.renderOrder = order || 7;
    for (var j = 0; j < n; j++) { m.setMatrixAt(j, ZERO); m.setColorAt(j, white); }
    return m;
  }
  var rod = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true).translate(0, .5, 0);
  var core = lightSet(rod, NETS.length, 1), halo = lightSet(rod, NETS.length, .3), beads = lightSet(new THREE.SphereGeometry(1, 12, 10), NETS.length * 2, 1);
  k.onPaint(function () {
    for (var j = 0; j < NETS.length; j++) {
      core.setColorAt(j, col.copy(teal).lerp(white, .35).multiplyScalar(1.5)); halo.setColorAt(j, col.copy(teal).multiplyScalar(1.2));
      beads.setColorAt(j * 2, col.copy(teal).multiplyScalar(2)); beads.setColorAt(j * 2 + 1, col.copy(teal).multiplyScalar(1.6));
    }
    [core, halo, beads].forEach(function (m) { m.instanceColor.needsUpdate = true; });
  });
  var DIR = new THREE.Vector3(), RQ = new THREE.Quaternion();
  function rodAt(m, j, a, b, r) {
    DIR.subVectors(b, a); var len = DIR.length();
    if (len < .01 || r < 1e-3) { m.setMatrixAt(j, ZERO); return; }
    RQ.setFromUnitVectors(UP, DIR.multiplyScalar(1 / len));
    m.setMatrixAt(j, M3.compose(a, RQ, SC.set(r, len, r)));
  }

  /* ---------- where each panel floats ----------
     Over the ring, in the open middle of the screen, as the board has them. CR3TV's floats over its
     far side, between the hero's words and the FXN tower. DeArk's floats over its far left, in the band
     right of the tower's label, since its right half stands under the side column. Each turns a little
     toward the middle. [x, height, z] from the ring's centre, the turn, and where on
     the rim its line lands (degrees; 90 faces the camera, 180 is the ring's left), clear of the ring's
     own label (home-descent.js puts DeArk's over its back). */
  var SPOT = { deark: [-1.0, 5.0, -1.8, -.18, 192], cr3tv: [-1.5, 4.0, -2.4, .2, 205] };
  var spots = NETS.map(function (r) {
    var id = N.IDS[r.i], o = SPOT[id] || [-r.R * .6, 4.6, -r.R * .5, 0, 200];
    var at = V(r.c.x + o[0], o[1], r.c.z + o[2]), fa = o[4] * W.D2R;
    var foot = V(r.c.x + Math.cos(fa) * r.R, r.t * (LIFT + 1), r.c.z + Math.sin(fa) * r.R);   /* on top of the rim's tiles */
    return { r: r, id: id, at: at, yaw: o[3], foot: foot, built: (r.at || 0) + 980, from: null, fit: new THREE.Vector3() };
  });

  /* ---------- each panel stays in the open part of the screen ----------
     Between the hero's words and the side column, under the header, at every screen size: a panel
     that would cross one of them slides along the screen until it does not. It is measured from
     the home camera itself (k.cam, without the first visit's fly-in or the pointer's lean), so the
     panel never drifts while the camera settles. */
  var VC = new THREE.PerspectiveCamera(), VF = new THREE.Vector3(), VR = new THREE.Vector3(), VU = new THREE.Vector3(), CP = new THREE.Vector3(), F2 = new THREE.Matrix4();
  var boxes = null;
  function lineBoxes(el, out) {
    var walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), rg = document.createRange(), t;
    while ((t = walk.nextNode())) { if (!t.textContent.trim()) continue; rg.selectNodeContents(t); [].push.apply(out, [].slice.call(rg.getClientRects())); }
  }
  function measure() {
    var home = document.querySelector('.view[data-view="home"]'); if (!home) return null;
    var lines = [];
    ['.eyebrow', 'h1', '.lede', '.paths'].forEach(function (q) { var el = home.querySelector(q); if (el) lineBoxes(el, lines); });
    var cta = home.querySelector('.copy .cta'); if (cta) lines.push(cta.getBoundingClientRect());
    var side = home.querySelector('.rail'), sr = side && side.getBoundingClientRect(), top = document.querySelector('.top');
    return { lines: lines, r: (sr && sr.width ? sr.left : innerWidth) - 14, t: (top ? top.getBoundingClientRect().bottom : 0) + 6 };
  }
  window.addEventListener('resize', function () { boxes = null; });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { boxes = null; });
  function fit(s) {
    boxes = boxes || measure(); if (!boxes) return;
    var c = k.cam, sz = k.size(), fr = k.frame(), x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    VC.projectionMatrix.copy(k.camera.projectionMatrix); VC.projectionMatrixInverse.copy(k.camera.projectionMatrixInverse);
    VC.position.set(c.aim.x + c.dist * Math.cos(c.elev) * Math.sin(c.yaw), c.aim.y + c.dist * Math.sin(c.elev), c.aim.z + c.dist * Math.cos(c.elev) * Math.cos(c.yaw));
    VC.lookAt(c.aim); VC.updateMatrixWorld();
    frame(s.at.x, s.at.y, s.at.z, -c.elev * .8, s.yaw, F2);
    for (var q = 0; q < 4; q++) {
      CP.set((q & 1 ? .5 : -.5) * SW, (q & 2 ? .5 : -.5) * SH, 0).applyMatrix4(F2).project(VC);
      var px = (CP.x + 1) / 2 * sz.w, py = (1 - CP.y) / 2 * sz.h;
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
    }
    var L = 0, dx = 0, dy = y0 < boxes.t ? boxes.t - y0 : 0;
    boxes.lines.forEach(function (b) { if (b.bottom > y0 + dy - 8 && b.top < y1 + dy + 8) L = Math.max(L, b.right + 16); });
    if (x1 > boxes.r) dx = boxes.r - x1;
    if (x0 + dx < L) dx = L - x0;   /* the words win over the side column: a panel over words is worse */
    VF.set(0, 0, -1).applyQuaternion(VC.quaternion); VR.set(1, 0, 0).applyQuaternion(VC.quaternion); VU.set(0, 1, 0).applyQuaternion(VC.quaternion);
    var wpp = 2 * CP.copy(s.at).sub(VC.position).dot(VF) * Math.tan(k.camera.fov * Math.PI / 360) / Math.max(1, fr.h);
    s.fit.copy(VR).multiplyScalar(dx * wpp).addScaledVector(VU, -dy * wpp);
  }

  /* ---------- the storyboard ---------- */
  var RISE = 900, STAGGER = 220;
  function riseNow(at) {
    if (k.reduced) { place(); return; }   /* reduced motion: the world's clock stands still, so they are simply there */
    spots.forEach(function (s, n) { if (s.from === null) s.from = Math.max(at, s.built) + n * STAGGER; }); k.wake(RISE + STAGGER * spots.length + 200);
  }
  function place() { spots.forEach(function (s) { s.from = -1e9; }); k.wake(120); }   /* a wake, not a redraw: the step may be told during a frame */
  var told = 0;
  function story(step) {
    if (told) return; told = step;
    if (step >= 4) place(); else riseNow(k.time());
  }
  document.addEventListener('defxn:story', function (e) { story(e.detail && e.detail.step | 0); });
  if (S.storyStep) story(S.storyStep);   /* a step announced before this file ran */
  var homeAt = 0;
  function homeShown() {
    if (homeAt) return; homeAt = performance.now();
    setTimeout(function () { if (!told) { told = -1; riseNow(k.time()); } }, 4500);
  }

  /* ---------- hover and click ---------- */
  function touchable() { return W.view() === 'home' && W.homeW() > .9; }
  panes.liftable = function (j) { return touchable() && spots[j].from !== null; };
  panes.pickable = panes.liftable;
  panes.label = function (j) { var nm = N.NAMED[spots[j].r.i]; return { name: 'radio.fxn · a sample site', act: 'Open ' + (nm ? nm.name : 'its chain') }; };
  panes.onPick = function (j) { location.hash = '#/ring?i=' + spots[j].id; };

  /* ---------- every frame, once the camera is placed ---------- */
  var shown = true, A = new THREE.Vector3(), B = new THREE.Vector3(), F = new THREE.Matrix4();
  function show(on) {
    if (on === shown) return; shown = on;
    panes.show(on); edge.mesh.visible = on; core.visible = halo.visible = beads.visible = on;
    if (!on) { plates.forEach(function (p) { p.place(null); }); for (var j = 0; j < spots.length; j++) edge.set(j, M, 0, 0, 0); }
  }
  show(false);
  W.after(function (ms) {
    var hw = W.homeW();
    if (W.view() === 'home') homeShown();
    var any = spots.some(function (s) { return s.from !== null; });
    show(hw > .001 && any);
    if (!shown) return;
    var hwE = ease.inOut(hw), el = k.cam.elev, moving = false, atHome = W.view() === 'home' && hw > .98;
    spots.forEach(function (s, n) {
      if (atHome) fit(s);
      var ru = s.from === null ? 0 : span(ms, s.from, s.from + RISE);
      if (ru > 0 && ru < 1) moving = true;
      var u = ease.glide(ru) * hwE, sc = u <= .001 ? 1e-4 : ease.out(clamp01(u * 1.15));
      /* it rises out of its ring and sinks back into it; under the pointer it lifts a little */
      A.copy(s.at).add(s.fit).sub(s.foot).multiplyScalar(u).add(s.foot); A.y += .32 * ease.glide(panes.hov[n]);
      frame(A.x, A.y, A.z, -el * .8, s.yaw, F);
      panes.place(n, local(F, 0, 0, 0, sc)); panes.tint(n, glass);
      plates[n].place(sc > .05 ? local(F, 0, 0, SD / 2 * sc + .006, sc, sc, 1, M3) : null);
      edge.set(n, local(F, 0, 0, SD / 2 * sc + .003, 1, 1, 1, M3), SW * sc - .03, SH * sc - .03, clamp01(u * 1.4 - .3), .026);
      /* the line: from the panel's foot to the ring's rim, with a bead at each end */
      B.set(-SW * .3 * sc, -SH / 2 * sc, 0).applyMatrix4(F);   /* from the foot's left part: the ring's own label stands under its middle */
      var lr = clamp01(u * 3);
      rodAt(core, n, s.foot, B, .016 * lr); rodAt(halo, n, s.foot, B, .06 * lr);
      beads.setMatrixAt(n * 2, M.makeScale(.07 * lr + 1e-4, .07 * lr + 1e-4, .07 * lr + 1e-4).setPosition(s.foot));
      beads.setMatrixAt(n * 2 + 1, M.makeScale(.045 * lr + 1e-4, .045 * lr + 1e-4, .045 * lr + 1e-4).setPosition(B));
    });
    if (moving) { k.wake(60); k.moved(60); }
  });
})();

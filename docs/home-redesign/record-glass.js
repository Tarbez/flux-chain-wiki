/* DEFXN mockup app: the board's chain block carried into the record pages (#/record and #/open).

   Owner's board "Record descent", 2026-10-24: on home a record is a near-black glass block with an
   ember edge, and a thin ember proof line runs from it to the record it links to (home-descent.js).
   A click on one flies the camera into the record pages; there the chosen record keeps that look,
   as the board's storyboard step 03 ("Inspect the record") and its close inspection level (field
   callouts, proofs, links) have it:
     #/record  the chosen record's tile turns to near-black glass with an ember edge on every side,
               and a thin ember line runs from it, over its chain link, to the record it links to
               (the one before it in the chain). The light under it warms to ember.
     #/open    the card the tile becomes is near-black glass with an ember edge, and the same line
               runs from its side to the record it links to.
   Teal keeps its own meaning on these pages: a signed record's mark and its earlier versions stay teal.

   No new view and no new tile: this file reads the chosen record's parts from chains-scene.js
   (DEFXNScene.recordParts, after pose) and dresses them in W.after, before the frame is drawn. Every
   change follows the flight's own morphs (cur.m and cur.g for the record, cur.s for the card), so it
   comes and goes with the camera and never on a timer of its own. */
(function () {
  'use strict';
  var S = window.DEFXNScene;
  if (!S || !S.ok || !S.world || !S.recordParts) return;
  var W = S.world, k = W.k, THREE = W.THREE, ease = W.ease, clamp01 = ease.clamp01;
  var nR = ((window.DEFXN_RECORDS || {}).records || []).length;
  if (!nR) return;

  var M = new THREE.Matrix4(), M2 = new THREE.Matrix4(), TM = new THREE.Matrix4(), HOV = new THREE.Matrix4(), HS = new THREE.Matrix4(), ZERO = new THREE.Matrix4().makeScale(1e-4, 1e-4, 1e-4);
  var P = new THREE.Vector3(), Q = new THREE.Quaternion(), SC = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  var FACE = new THREE.Matrix4().makeTranslation(0, 0, .143);   /* a tile's front face, as chains-scene.js lays its words */
  function local(F, x, y, z, sx, sy, sz, out) { return (out || M2).copy(F).multiply(TM.compose(P.set(x, y, z), Q.identity(), SC.set(Math.max(1e-4, sx), Math.max(1e-4, sy), Math.max(1e-4, sz)))); }

  /* ---------- tones ---------- */
  var warm = -1, col = new THREE.Color(), ember = new THREE.Color(), black = new THREE.Color(), shellTone = new THREE.Color(), white = new THREE.Color(1, 1, 1);
  var poolBase = new THREE.Color(), poolWarm = new THREE.Color(), poolMat = null;
  function css(name, fb) { var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v ? 'hsl(' + v.split(/\s+/).join(', ') + ')' : fb; }
  function tones() {
    ember.set(css('--ember', '#f7752a'));
    black.copy(k.C.canvas).multiplyScalar(.5);   /* near-black: any share of ember here turns brown under the key light */
    shellTone.copy(k.C.canvas).multiplyScalar(.35);   /* the glass itself: near-black; its warmth is the ember light round it */
    var R = S.recordParts();
    /* the card: near-black glass with a clear coat (chains-scene.js paints it dark grey first) */
    R.cardMat.color.copy(k.mix('canvas', 'other', .1)).multiplyScalar(.6);
    R.cardMat.roughness = .26; R.cardMat.clearcoat = .8; R.cardMat.clearcoatRoughness = .14; R.cardMat.envMapIntensity = 1;
    /* the light under the chosen record: its own colour, and the ember it warms to */
    poolMat = R.pool.material; poolBase.copy(poolMat.color); poolWarm.copy(ember).multiplyScalar(.7); warm = -1;
  }
  k.onPaint(tones); tones();   /* registered after chains-scene.js's paint, so these tones win */

  /* ---------- the glass round the chosen tile, its ember edges, the line to the record it links to ---------- */
  var SX = 1.03, SY = 1.03, SZ = .31;   /* a hair outside the tile (1 x 1 x .28), so its body is the glass's dark core */
  var shell = k.blockSet(1, k.bevel(SX, SY, SZ), { plain: true, shadow: false }), sm = shell.mesh.material;
  sm.transparent = true; sm.opacity = 0; sm.depthWrite = false; sm.roughness = .08; sm.metalness = 0; sm.clearcoat = 1; sm.clearcoatRoughness = .03; sm.envMapIntensity = .35; sm.sheen = 0; sm.specularIntensity = .3;   /* a black dielectric still shows 4% of every light: keep the glass dark between its highlights */
  shell.mesh.renderOrder = 4; shell.show(false);
  function lightSet(geo, n, opacity, order) {
    var m = k.instanced(geo, new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: opacity }), n, false);
    m.renderOrder = order || 6; m.visible = false;
    for (var j = 0; j < n; j++) { m.setMatrixAt(j, ZERO); m.setColorAt(j, white); }
    return m;
  }
  var bars = lightSet(new THREE.BoxGeometry(1, 1, 1), 12 * nR, 1);   /* twelve per record: on a turn, one record's edge gives way to the next's */
  var rod = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true).translate(0, .5, 0);
  var core = lightSet(rod, 1, 1, 7), halo = lightSet(rod, 1, .3, 7), beads = lightSet(new THREE.SphereGeometry(1, 12, 10), 2, 1, 7);
  /* the card's ember edge: four bars round its face, where its teal one was */
  var cardEdge = k.edgeLight(1, 'signal', 1.4);
  cardEdge.paint = function () { cardEdge.mesh.material.color.copy(ember).multiplyScalar(1.4);   /* lower than home's: a long bright edge would cast its glow over the card's words */ };
  k.onPaint(cardEdge.paint); cardEdge.paint();
  k.onPaint(function () {
    for (var e = 0; e < 12 * nR; e++) bars.setColorAt(e, col.copy(ember).multiplyScalar(1.45));
    core.setColorAt(0, col.copy(ember).lerp(white, .3).multiplyScalar(1.6)); halo.setColorAt(0, col.copy(ember).multiplyScalar(1.3));
    beads.setColorAt(0, col.copy(ember).multiplyScalar(2)); beads.setColorAt(1, col.copy(ember).multiplyScalar(2));
    [bars, core, halo, beads].forEach(function (m) { m.instanceColor.needsUpdate = true; });
  });

  /* the twelve edges of the glass, in the tile's body frame F (tile units, F carries the tile's size) */
  var EDGES = [];
  [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach(function (ax) { [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function (q) { EDGES.push({ ax: ax, q: q }); }); });
  function edges(j, F, amt, t) {
    var r = .1 * SZ, hx = SX / 2 - r * .3, hy = SY / 2 - r * .3, hz = SZ / 2 - r * .3;
    for (var i = 0; i < 12; i++) {
      var d = EDGES[i], e = j * 12 + i;
      if (!(amt > .01)) { bars.setMatrixAt(e, ZERO); continue; }
      if (d.ax[0]) local(F, 0, d.q[0] * hy, d.q[1] * hz, (SX - r * 1.2) * amt, t, t, M);
      else if (d.ax[1]) local(F, d.q[0] * hx, 0, d.q[1] * hz, t, (SY - r * 1.2) * amt, t, M);
      else local(F, d.q[0] * hx, d.q[1] * hy, 0, t, t, (SZ - r * 1.2) * amt, M);
      bars.setMatrixAt(e, M);
    }
  }
  var DIR = new THREE.Vector3(), RQ = new THREE.Quaternion(), RM = new THREE.Matrix4();
  function rodAt(m, a, b, r) {
    DIR.subVectors(b, a); var len = DIR.length();
    if (len < .01 || r < 1e-4) { m.setMatrixAt(0, ZERO); return; }
    RQ.setFromUnitVectors(UP, DIR.multiplyScalar(1 / len));
    m.setMatrixAt(0, RM.compose(a, RQ, SC.set(r, len, r)));
  }

  /* a tile's pose as the kit will draw it this frame: its place, its hover lift, its body */
  var F = new THREE.Matrix4(), FB = new THREE.Matrix4(), P0 = new THREE.Vector3(), P1 = new THREE.Vector3(), A = new THREE.Vector3(), B = new THREE.Vector3();
  function bodyOf(set, q, out) {
    var h = set.hov[q]; out.copy(set.base[q]);
    if (h > 0) out.multiply(HOV.makeTranslation(0, h * .12, 0)).multiply(HS.makeScale(1 + h * .04, 1 + h * .04, 1 + h * .04));
    return out.multiply(k.P.body);
  }
  function sizeOf(m) { return Math.hypot(m.elements[0], m.elements[1], m.elements[2]); }
  /* the line from record j0's side to record j1's side, over the chain link between them */
  function proofLine(R, j0, j1, amt) {
    if (j1 >= nR || amt < .01) { [core, halo, beads].forEach(function (m) { m.visible = false; }); return; }
    var y = R.ySet, q0 = R.slotOf[j0], q1 = R.slotOf[j1];
    bodyOf(y, q0, F); P0.setFromMatrixPosition(F); var s0 = sizeOf(y.base[q0]), w0 = s0 * y.stretch[q0];
    bodyOf(y, q1, FB); P1.setFromMatrixPosition(FB); var s1 = sizeOf(y.base[q1]), w1 = s1 * y.stretch[q1];
    DIR.set(P1.x - P0.x, 0, P1.z - P0.z); var d = DIR.length(); if (d < .01) return; DIR.multiplyScalar(1 / d);
    var top = (P0.y + P1.y) / 2 + s1 * .16;   /* along the top of the chain link (its bar is .24 of a tile high) */
    A.set(P0.x + DIR.x * w0 / 2, top, P0.z + DIR.z * w0 / 2);
    B.set(P1.x - DIR.x * w1 / 2, top, P1.z - DIR.z * w1 / 2).sub(A).multiplyScalar(ease.inOut(amt)).add(A);   /* it draws from the chosen record outward */
    [core, halo, beads].forEach(function (m) { m.visible = true; });
    rodAt(core, A, B, .012 * s1); rodAt(halo, A, B, .045 * s1);
    var br = .04 * s1;
    beads.setMatrixAt(0, M.makeScale(br, br, br).setPosition(A));
    beads.setMatrixAt(1, amt > .98 ? M.makeScale(br, br, br).setPosition(B) : ZERO);
  }

  /* ---------- every frame, after the pose, before the draw ---------- */
  /* How near the front each record stands, from its size: the chosen record is drawn cur.cs times a
     plain record's size, and a ring turn eases one size into the other (chains-scene.js). */
  var near = new Float32Array(nR);
  W.after(function () {
    var cur = W.cur(); if (!cur) return;
    var R = S.recordParts(), sel = R.sel, y = R.ySet, view = W.view(), j, q;
    /* the glass: while the camera comes to the record (the ring re-forms, cur.m) and while you look
       at it (cur.g); not while it is the card (cur.s) or the line of links (cur.l) */
    var amt = ease.inOut(clamp01(Math.max(cur.g, view === 'record' ? cur.m : 0) * (1 - cur.l))) * (cur.s > .002 ? 0 : 1);
    var tc = 1e9, best = sel;
    for (j = 0; j < nR; j++) tc = Math.min(tc, sizeOf(y.base[R.slotOf[j]]));
    for (j = 0; j < nR; j++) {
      near[j] = cur.m > .99 && cur.cs > 1.01 ? clamp01((sizeOf(y.base[R.slotOf[j]]) / tc - 1) / (cur.cs - 1)) : j === sel ? 1 : 0;   /* while the ring re-forms, sizes still grow: the chosen one is the one */
      if (near[j] > near[best]) best = j;
    }
    var any = false;
    for (j = 0; j < nR; j++) {
      var w = amt * ease.inOut(near[j]); q = R.slotOf[j];
      if (w <= .001) { edges(j, F, 0, 0); continue; }
      any = true; bodyOf(y, q, F);
      y.bodies.plain.getColorAt(q, col); y.tint(q, col.lerp(black, w));   /* every tile in this set is 'plain', so tile q is instance q */
      edges(j, F, w, .014);
      /* its teal edge (drawn by the pose at m * near^3) gives way to the ember one */
      var teal = cur.m * Math.pow(near[j], 3) * (1 - cur.s);
      if (teal > .01) R.edge.set(j, FB.copy(F).multiply(FACE), .93, .93, ease.out(teal) * (1 - w), .016);
    }
    bars.visible = any;
    /* one pane of glass, on the record at the front; on a turn it clears from one record before it
       forms on the next, so it never jumps between them */
    var gw = amt * clamp01(near[best] * 2 - 1);
    shell.show(gw > .001);
    if (gw > .001) { bodyOf(y, R.slotOf[best], F); shell.place(0, F); shell.tint(0, shellTone); sm.opacity = .86 * gw; }   /* dense enough that the tile's satin body is only its dark core */
    /* the light under it */
    var pw = amt * (view === 'record' ? 1 : 0);
    if (Math.abs(pw - warm) > .001) { warm = pw; if (poolMat) poolMat.color.copy(poolBase).lerp(poolWarm, pw); }
    /* the card: its ember edge, where the teal one was; flying to the card, the tile's teal edge stays off */
    q = R.slotOf[sel];
    if (view === 'open') R.edge.set(sel, M, 0, 0, 0);
    var cs = R.card.visible ? ease.out(clamp01((cur.s - .55) / .45)) : 0;
    if (cs > .001) {
      cardEdge.set(0, FB.copy(R.card.matrix).multiply(FACE), y.stretch[q] - .03, .97, cs, .012);
      R.edge.set(nR, M, 0, 0, 0);
    } else cardEdge.set(0, M, 0, 0, 0);
    /* the proof line to the record it links to (the one before it): after the glass, or as the card opens */
    proofLine(R, best, best + 1, Math.max(clamp01(gw * 1.6 - .6), cs));
  });
})();

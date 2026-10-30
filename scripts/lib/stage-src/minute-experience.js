/* The `movie` stage of the minute, the second half of what was js/world/minute-experience.js. It continues INSIDE the function that js/pages/world-minute-clock.js opens (BEATS and the clock's names are used here), so it is read joined to that file: scripts/lib/world-how-scene.mjs minuteText(). It is evidence, never served. */
  /* ---------------------------------------------------------------- the stage */
  var S = window.DEFXNScene, N = window.DEFXN_NETWORK;
  if (!S || !S.ok || !S.world || !N) return;
  var W = S.world, k = W.k, V = W.V, HUB = W.HUB, rings = W.ringList, win = W.win, num = W.num, anchorAt = W.anchorAt;
  var MINE = N.MINE, RES0 = N.KIND.indexOf('resolver');
  var NETS = rings.filter(function (r) { return r.kind === 'network' && !r.parent; }).map(function (r) { return rings.indexOf(r); });
  var step = 0, shown = -1, trace = W.tween(0), cube0 = 0;
  W.cubes.forEach(function (c, i) { if (c.distanceTo(rings[RES0].c) < W.cubes[cube0].distanceTo(rings[RES0].c)) cube0 = i; });
  function top(ri) { var r = rings[ri]; return V(r.c.x, r.c.y + r.t * 1.1, r.c.z); }
  /* a close pose on one ring: span is how many ring radii the frame holds across */
  function ring(ri, span, elev, yaw, asp) {
    var r = rings[ri], w = span * r.R;
    return { aim: V(r.c.x, r.c.y + r.t * .6, r.c.z), dist: W.fit(w, w * .55, asp, .9), elev: elev, yaw: yaw, tilt: 2, n: 0 };
  }
  /* the wide pose is the minute view's (concept-stages.js): the whole grid from above */
  function wide(asp, fill, pushLeft) {
    var d = W.fit(27, 15, asp, fill || .94), a = HUB.c.clone().add(V(0, 0, 1.5));
    /* push the grid to the left of the screen: the aim moves right by a share of the half width the camera sees */
    if (pushLeft) a.x += pushLeft * d * W.TAN * asp;
    return { aim: a, dist: d, elev: 34, yaw: 0, tilt: 2, n: 0 };
  }
  function between(a, b, spread, elev, asp) {
    var p = rings[a].c, q = rings[b].c, mid = p.clone().lerp(q, .5), len = p.distanceTo(q) + spread;
    return { aim: V(mid.x, 0, mid.z), dist: W.fit(len * 1.15, len * .62, asp, .9), elev: elev, yaw: 0, tilt: 2, n: 0 };
  }
  function camera(asp) {
    switch (step) {
      case 1: return ring(MINE, 3.6, 32, 0, asp);
      case 2: return ring(MINE, 2.5, 22, 24, asp);
      case 3: return wide(asp);
      case 4: return between(RES0, MINE, 6, 30, asp);
      case 5: return between(MINE, NETS.length ? NETS[0] : 0, 8, 32, asp);
      case 6: return ring(NETS.length ? NETS[0] : MINE, 2.8, 26, 4, asp);
      case 7: case 8: return wide(asp, .5, .46);
      case 9: return between(MINE, 0, 6, 30, asp);
      default: return wide(asp);
    }
  }
  /* what lights in each beat. Called once as a beat comes in; a rest of the beat asks for nothing */
  function focus() {
    if (step === 1) W.focusOn(function (i, kd) { return kd === 'identity'; }, false);
    else if (step === 2) W.focusOn(function (i) { return i === MINE; }, false);
    else if (step === 3) W.focusOn(function (i, kd) { return kd === 'hub' || kd === 'network'; }, false);
    else if (step === 4) W.focusOn(function (i) { return i === MINE || i === RES0; }, true);
    else if (step === 5) W.focusOn(function (i, kd) { return i === MINE || kd === 'network'; }, true);
    else if (step === 6) W.focusOn(function (i) { return i === NETS[0]; }, false);
    else if (step === 9) W.focusOn(function (i, kd) { return i === MINE || kd === 'hub'; }, false);
    else W.focusOn(null, false);
    if (W.logo && W.logo.lit) W.logo.lit(step === 3 || step === 9);   /* the 3D agent's hook; absent, the logo keeps its own light */
    trace.snap(0);
    if (step === 4 || step === 5 || step === 9) trace.go(1, step === 5 ? 1500 : 1200, performance.now(), k.reduced ? 0 : 500);
  }
  S.stage({
    name: 'movie', aims: true,
    target: function (f, asp) { return camera(asp); },
    set: function (st, w) {
      var n = num(st.s, 0, BEATS);
      if (n === step && shown >= 0) return;
      step = n; shown = -1; k.wake(900);
    },
    pose: function (w, ms, now) {
      if (w <= .05) { if (shown !== 0) { W.focusOn(null, false); if (W.logo && W.logo.lit) W.logo.lit(false); shown = 0; } return; }
      if (shown !== step) { shown = step; focus(); }
      if (w <= .5) return;
      var t = trace.get(now);
      if (step === 4) { var c = W.cubes[cube0]; W.lit.line(V(c.x, c.y, c.z), top(RES0), 14, win(t, 0, .5), .07); W.lit.line(top(RES0), top(MINE), 18, win(t, .45, 1), .07); }
      else if (step === 5) NETS.forEach(function (ri, j) { W.lit.line(top(MINE), top(ri), 20, win(t, j * .15, .6 + j * .15), .07); });
      else if (step === 9) W.lit.line(top(MINE), V(HUB.c.x, HUB.t * 1.1, HUB.c.z), 26, win(t, 0, 1), .07);
    },
    anchor: function (out) { anchorAt(out, W.mark.position.x, W.mark.position.y, W.mark.position.z, HUB.R * .4); },
    tags: function () {
      var p = step === 1 || step === 2 ? top(MINE) : step === 3 || step === 9 ? top(0) : step === 4 ? top(RES0) : step === 6 && NETS.length ? top(NETS[0]) : step === 5 && NETS.length ? top(NETS[0]) : null;
      return [{ id: 'focus', p: p || top(MINE), on: !!p }];
    }
  });
  /* the world may already be flying when this file lands: give the running pose a weight for this stage, so the morph
     from it is a number */
  var cur = W.cur && W.cur();
  if (cur && cur.w && cur.w.movie == null) cur.w.movie = 0;
})();

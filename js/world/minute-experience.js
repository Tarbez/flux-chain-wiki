/* IN ONE MINUTE, the 3D sequence: the stage and the clock (docs/home-redesign/MINUTE-EXPERIENCE.md).

   Two parts, one file, no DOM:

   1 THE STAGE  `movie`. It registers with the ring world (chains-scene.js, S.stage) as concept-stages.js registers
     `minute`. A page tells the world its state, { view: 'movie', s: '1'..'9' }, and the stage answers with a camera
     for that beat and with what lights: it moves the camera, lights rings that exist (W.focusOn), and runs lit lines
     between them (W.lit.line). It adds no material to the ring kit, recolours nothing, and draws no card. The card is
     the NFT engine's, in the page (js/pages/world-minute.js). Nothing here runs a frame loop: a beat asks for frames
     only while its camera or its line moves (k.wake, from the tweens).
       beat 1 your key         the identity rings light; the camera cranes down to your ring
       beat 2 your chain       closer on your ring, turned a little
       beat 3 the kernel       wide: the hub (FXN) and the network chains light; the ground logo lights when the world
                               can (W.logo.lit, optional: the 3D agent's)
       beat 4 a resolver       a resolver ring and your ring light; a line runs from a computer to the resolver to you
       beat 5 the mesh         the computers light; lines run from your ring to the network chains (the copies)
       beat 6 a name           close on the first network chain; its label says radio.fxn
       beat 7, 8 the card      wide again, the grid pushed to the left half so the card layer has the right half
       beat 9 proof            your ring and the hub light; a line runs from you back to the start
     Beat 0 is the wide grid before the first beat. The stage reads the network (DEFXN_NETWORK) and the kit; it owns
     nothing of them.

   2 THE CLOCK  DEFXNMinute.clock(). Nine beats and 60 seconds. It is a timer, not a frame loop: one setTimeout per
     beat, paused by clearing it, so a paused or finished sequence asks for nothing. It never navigates: it tells the
     page which beat it is on (onBeat) and the page does the rest. It is plain, so tests/world-minute.cjs runs it with
     a fake clock.

   Camera numbers are aim, dist, elev (height angle in degrees), yaw, tilt, as in chains-scene.js target(). */
(function () {
  'use strict';
  var BEATS = 9;
  /* seconds per beat, from the storyboard (60 in all), and the length of the camera flight that opens each beat */
  var SECONDS = [6, 6, 6, 7, 6, 6, 8, 7, 8];
  var FLIGHT = [2200, 1800, 1700, 1200, 1200, 900, 1500, 600, 1700];
  var api = { BEATS: BEATS, SECONDS: SECONDS.slice(), FLIGHT: FLIGHT.slice(), total: SECONDS.reduce(function (a, b) { return a + b; }, 0) };
  window.DEFXNMinute = api;

  function clamp(n) { n = parseInt(n, 10); return isNaN(n) ? 1 : Math.min(BEATS, Math.max(1, n)); }
  api.clamp = clamp;
  api.flight = function (n) { return FLIGHT[clamp(n) - 1]; };

  /* ---------------------------------------------------------------- the clock */
  api.clock = function (o) {
    var now = o.now || function () { return Date.now(); }, set = o.setTimeout || setTimeout, clear = o.clearTimeout || clearTimeout;
    var beat = clamp(o.start), playing = false, left = SECONDS[beat - 1] * 1000, t0 = 0, timer = 0, ended = false;
    function stop() { if (timer) { clear(timer); timer = 0; } }
    function arm() { stop(); t0 = now(); timer = set(fire, left); }
    function fire() {
      timer = 0;
      if (beat < BEATS) { beat++; left = SECONDS[beat - 1] * 1000; if (o.onBeat) o.onBeat(beat, 'auto'); if (playing) arm(); }
      else { playing = false; ended = true; left = 0; if (o.onEnd) o.onEnd(); if (o.onState) o.onState(c); }
    }
    var c = {
      beat: function () { return beat; }, playing: function () { return playing; }, ended: function () { return ended; },
      /* the time left on this beat, for a progress line that resumes */
      left: function () { return playing ? Math.max(0, left - (now() - t0)) : left; },
      play: function () {
        if (playing || o.reduced) return false;
        if (ended) { beat = 1; ended = false; left = SECONDS[0] * 1000; if (o.onBeat) o.onBeat(1, 'restart'); }
        playing = true; arm(); if (o.onState) o.onState(c); return true;
      },
      pause: function () {
        if (!playing) return false;
        left = Math.max(0, left - (now() - t0)); playing = false; stop(); if (o.onState) o.onState(c); return true;
      },
      /* the page moved to a beat (a step, a tick, the address): the clock follows without calling back */
      sync: function (n) {
        n = clamp(n); if (n === beat && !ended) return;
        beat = n; ended = false; left = SECONDS[n - 1] * 1000; if (playing) arm();
      },
      stop: function () { playing = false; stop(); }
    };
    return c;
  };

  /* ---------------------------------------------------------------- the stage */
  var S = window.DEFXNScene, N = window.DEFXN_NETWORK;
  if (!S || !S.ok || !S.world || !N) return;
  var W = S.world, k = W.k, V = W.V, HUB = W.HUB, rings = W.ringList, win = W.win, num = W.num, anchorAt = W.anchorAt;
  var MINE = N.MINE, RES0 = N.KIND.indexOf('resolver');
  var NETS = rings.filter(function (r) { return r.kind === 'network' && !r.parent; }).map(function (r) { return rings.indexOf(r); });
  var step = 0, shown = -1, trace = W.tween(0), cube0 = 0;
  W.cubes.forEach(function (c, i) { if (c.distanceTo(rings[RES0].c) < W.cubes[cube0].distanceTo(rings[RES0].c)) cube0 = i; });
  function top(ri) { var r = rings[ri]; return V(r.c.x, r.t * 1.1, r.c.z); }
  /* a close pose on one ring: span is how many ring radii the frame holds across */
  function ring(ri, span, elev, yaw, asp) {
    var r = rings[ri], w = span * r.R;
    return { aim: V(r.c.x, r.t * .6, r.c.z), dist: W.fit(w, w * .55, asp, .9), elev: elev, yaw: yaw, tilt: 2, n: 0 };
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

/* IN ONE MINUTE, the clock (docs/home-redesign/MINUTE-EXPERIENCE.md). The stage that shared this file moved to scripts/lib/stage-src/minute-experience.js when Three.js left the site; the encoder joins the two to read the movie view.

   Two parts, no DOM. This file serves only part 2, the clock; part 1 is evidence for the encoder:

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
})();

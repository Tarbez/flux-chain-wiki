/* The 3D of one chain of the network (#/ring?i=<ring id>, /ring on the site): the chosen ring rises out of the
   network and stays lit, and the camera flies to it. Moved out of docs/home-redesign/ring-view.js (2026-10-24, the 3D
   port); the page's words and its chips stay there. A new ring inside the view is a new flight (S.select).
   S.ringTarget(ri) says which view a click on a ring of the network opens: your ring is your chain, the FXN ledger is
   the FXN supply, any other ring is this view. The mockup's hook and the site's host both read it. */
(function () {
  'use strict';
  var N = window.DEFXN_NETWORK, S = window.DEFXNScene;
  if (!N || !S || !S.ok || !S.world) return;
  var ID = N.IDS;
  var index = N.ringIndex;
  S.ringTarget = function (ri) {
    if (ID[ri] === 'fxn-ledger') return { view: 'fxn' };
    return ri === N.MINE ? { view: 'chain' } : { view: 'ring', st: { i: ID[ri] } };
  };

  /* ---------- the stage: the chosen ring rises out of the network and stays lit ---------- */
  var W = S.world, k = W.k, V = W.V, ease = W.ease, clamp01 = ease.clamp01, rings = W.ringList, rise = W.ringRise;
  var sel = index(null), live = new Float32Array(rings.length), last = 0;
  /* the DEFXN kernel stays in place round its mark: it is lit, not raised (chains-scene.js) */
  function top(r) { return r.i === N.HUB ? 0 : W.riseH ? W.riseH(r) : r.R * .9 + 1.6; }   /* the scene's own rise, so the camera meets the ring */
  /* a new ring in the same view is a new flight: the camera goes to it */
  var select0 = S.select;
  S.select = function (st) { if (st.view === 'ring') return S.to(st); return select0.call(S, st); };
  S.stage({
    name: 'ring',
    target: function (f, asp) {
      var r = rings[sel], up = top(r);
      return { aim: V(r.c.x, r.c.y + up + r.t * .6, r.c.z), dist: W.fit(r.outer * 2 + r.t * 3.4, r.outer * 2 * Math.sin(30 * W.D2R) + r.t * 3.8, asp, .8),
        elev: 30, yaw: 0, tilt: 2.4, n: 1.25 };
    },
    set: function (st) { sel = index(st.i); k.wake(1400); k.moved(1400); },
    pose: function (w, ms, now) {
      var dt = last ? Math.min(64, now - last) : 16, a = k.reduced ? 1 : 1 - Math.exp(-dt / 240), moving = false;
      last = now;
      for (var i = 0; i < rings.length; i++) {
        var want = i === sel && w > .001 ? 1 : 0, d = want - live[i];
        if (Math.abs(d) > .002) { live[i] += d * a; moving = true; } else live[i] = want;
        rise[i] = live[i] * ease.glide(clamp01(w));
      }
      if (moving) { k.wake(60); k.moved(60); }
    },
    anchor: function (out) {
      var r = rings[sel], s = r.R * .7;
      out.pos.set(r.c.x, r.c.y + top(r) - (k.LIFT + .5) * s, r.c.z); out.quat.identity(); out.s = s;
    },
    tags: function () { return []; }   /* the page names the ring; a label in 3D would sit on its slot */
  });
})();

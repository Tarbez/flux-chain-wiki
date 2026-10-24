/* The 3D of the intro (#/intro, /intro on the site): the whole network seen from above, as on #/idvalue, with one
   card (a page) near its centre. The card is the one action: a click leaves for home, the camera dives from the
   overview into the network.
   Moved out of docs/home-redesign/intro-view.js (2026-10-24, the 3D port); the site's world-host.js used to hold a
   second copy. The card and its words stay in the mockup's intro-view.js and, on the site, in js/pages/intro.js.
   The stage draws nothing of its own. */
(function () {
  'use strict';
  var S = window.DEFXNScene;
  if (!S || !S.ok || !S.world) return;
  var W = S.world, V = W.V, ELEV = 72, D2R = Math.PI / 180;
  S.stage({
    name: 'intro',
    /* aimed in front of the kernel, so the ground logo sits in the upper part of the screen, above the card */
    target: function (f, asp) { return { aim: V(0, 0, 9), dist: W.fit(66, 72 * Math.sin(ELEV * D2R) + 2, asp, .96), elev: ELEV, yaw: 0, tilt: 1.4, n: 0 }; },
    set: function () {},
    pose: function () {},
    anchor: function (out) { out.pos.set(0, 0, 0); out.quat.identity(); out.s = 1; },
    tags: function () { return []; }
  });
})();

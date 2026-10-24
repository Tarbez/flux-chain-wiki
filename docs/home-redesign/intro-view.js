/* #/intro — the intro preset page (owner, 2026-10-24: "we start with a new home page inspired by #/idvalue:
   the card near centred, then click and zoom you in and you start the journey").

   The whole network seen from above, as on #/idvalue, with one card near the centre. The card is the one
   action: a click leaves for home (#/), the camera dives from the overview into the network, and the card
   grows toward you and closes to its centre as it goes (motion only: a scale and a wipe, never a fade).
   A fresh load at the site's root opens here; inside the site, "#/" is home as before.
   Counts come from the data files, never typed: network chains (network-data.js), capabilities and
   resolvers (their manifests' files), products (the brief). */
(function () {
  'use strict';
  /* a fresh load at the root starts with the intro; a link to "#/" inside the site still means home */
  if (!location.hash || location.hash === '#' || location.hash === '#/') location.replace('#/intro');

  var main = document.querySelector('main.views'), N = window.DEFXN_NETWORK, C = window.DEFXN_CONCEPT || {};
  if (!main || !N || !window.DEFXNKitUI) return;
  var esc = window.DEFXNKitUI.esc;
  var ARROW = '<svg viewBox="0 0 26 20" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M1 10h23M15 1l9 9-9 9"/></svg>';
  window.DEFXN_EXTRA_VIEWS = window.DEFXN_EXTRA_VIEWS || {};
  window.DEFXN_EXTRA_VIEWS.intro = { title: 'Enter the grid' };

  var nets = Object.keys(N.NAMED).filter(function (i) { return N.KIND[i] === 'network'; }).length;
  var caps = ((window.DEFXN_CAPABILITIES || {}).capabilities || []).length, res = ((window.DEFXN_RESOLVERS || {}).resolvers || []).length;
  var prods = C.products ? C.products.lanes.reduce(function (a, l) { return a + l.items.length; }, 0) : 0;
  var counts = [['Network chains', nets], ['Capabilities', caps], ['Resolvers', res], ['Products', prods]].filter(function (c) { return c[1] > 0; });

  main.insertAdjacentHTML('beforeend',
    '<section class="view introv" data-view="intro" aria-labelledby="intro-title">' +
    '<div class="intro-stage" data-stage></div>' +
    '<div class="intro-slot" data-panel>' +
    '<a class="intro-card rise" href="#/" data-ui>' +
    '<p class="eyebrow-dot mono">DEFXN · devnet</p>' +
    '<h1 id="intro-title" class="two">Enter the grid. <span>Many networks. One kernel.</span></h1>' +
    '<p class="intro-lede">Every network chain runs on the DEFXN kernel. Every record is signed, so anyone can check it.</p>' +
    '<dl class="strip intro-strip">' + counts.map(function (c) { return '<div><dt>' + esc(c[0]) + '</dt><dd>' + c[1] + '</dd></div>'; }).join('') + '</dl>' +
    '<span class="cta intro-go"><span class="say">Explore the network ' + ARROW + '</span></span>' +
    '<small class="intro-note mono">Counted from the data files · all on a devnet · nothing is live</small>' +
    '</a></div></section>');

  /* the stage: the overview from above (#/idvalue's camera, a little higher), nothing of its own to draw */
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

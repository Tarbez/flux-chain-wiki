/* The 3D of /download (owner, 2026-10-25: "get creative with the core illustration ... move them around, reshape ...
   with the 3d"). The page's picture of the FXN Browser is a window onto the real network: the window's body is the
   page's [data-stage], so the world frames the kernel inside it (world-host.js frame()). Each of the page's five steps
   reshapes the network in 3D, and the camera moves with it, then settles:
     1 Check the runtime          the kernel alone, the rings down
     2 Install the checkout       the rings nearest the kernel rise, one after another
     3 Verify the process         your ring rises and is lit, the others settle
     4 Know what success proves   only your ring stays up: a local start proves only that
     5 Continue with a network    a wave of rings rises out from the kernel: the network joined
   Motion answers the step and settles (the site's contract, js/pages/home-flow.js): the pose runs while a ring is still
   moving and asks for no frame after. Reduced motion takes each shape at once. The page chooses a step with
   ArkWorldHost.scene.select({ view: 'download', s: <0-4> }). */
(function () {
  'use strict';
  var S = window.DEFXNScene;
  if (!S || !S.ok || !S.world || !S.glass) return;
  var W = S.world, k = W.k, V = W.V, N = W.N, rings = W.ringList, rise = W.ringRise;
  var HUB = N.HUB, MINE = N.MINE, n = rings.length;
  /* the rings by distance from the kernel, nearest first (the wave's order) */
  /* top-level rings only: a child ring rides on its parent (a ring's parent field), so it never rises on its own here */
  var order = rings.map(function (r, i) { return i; }).filter(function (i) { return i !== HUB && !rings[i].parent; })
    .sort(function (a, b) { return rings[a].c.distanceTo(rings[HUB].c) - rings[b].c.distanceTo(rings[HUB].c); });
  var rank = new Float32Array(n).fill(999); order.forEach(function (ri, j) { rank[ri] = j; });
  /* each step's shape: how high each ring stands (0 to 1), and the camera */
  var SHAPES = [
    /* seen from about 35 degrees up, as the design image's network is: the kernel centred, its rings round it */
    { up: function () { return 0; }, cam: { yaw: -18, elev: 38, fit: 30 } },
    { up: function (ri) { return rank[ri] < 4 ? .7 : 0; }, cam: { yaw: -8, elev: 34, fit: 34 } },
    { up: function (ri) { return ri === MINE ? 1 : rank[ri] < 4 ? .3 : 0; }, cam: { yaw: 6, elev: 32, fit: 36 } },
    { up: function (ri) { return ri === MINE ? 1 : 0; }, cam: { yaw: 16, elev: 36, fit: 36 } },
    { up: function (ri) { return rank[ri] < 999 ? Math.max(.25, .9 - rank[ri] * .05) : 0; }, cam: { yaw: -4, elev: 30, fit: 48 } }
  ];
  /* DESTRUCT / CONSTRUCT (owner, 2026-10-25): every tile, link and cube of the network builds at its own moment on the
     world's build clock (chains-scene.js pose: nearest rings first). Each step winds that clock to its own point, so
     going forward builds the network out and going back takes it apart:
       1 the kernel's logo, the nearest rings   2 the inner chains build     3-4 more chains; yours rises
       5 the whole network builds out to its edge (the end of the build) */
  /* step 1 stops after the kernel's ground logo has built (its build is at 650 on this clock), with the first tiles */
  var BUILD = [1650, 2300, 3200, 3200, (k.END || 4700) + 300], BUILD_MS = 1700, holding = false;
  var step = 0, live = new Float32Array(n), changedAt = 0, last = 0;

  /* ---- GLASS WITH HOLES (owner, 2026-10-25: cutouts "with the 3d", not SVG) --------------------------------------
     Two thin extruded plates float over the kernel. Each is ONE THREE.Shape whose cutters are UNITED in its
     `holes` list (the 3D counterpart of an evenodd compound path), so every hole is real: the network below shows
     through it, unglazed. The plates are translucent (they overlap, and you see one through the other) and write no
     depth, so the rings behind them are never cut off. They show only on this view, fade with its weight, and rise a
     little with each step; reduced motion takes each height at once.
       lens   dark glass, a rounded viewport hole and two round ports (three cutters, one shape)
       badge  primary-tinted glass, a lanyard slot and a side notch, overlapping the lens's corner */
  /* the shapes and plates come from the shared glass kit (js/world/glass-kit.js) */
  var THREE = W.THREE, HUBC = rings[HUB].c, G = S.glass;
  var roundRect = G.roundRect, circle = G.circle;
  function plate(shape, color, opacity) { var m = G.plate(shape, { color: color, opacity: opacity }); m.geometry.center(); return m; }
  var themeColor = G.color;
  var LW = 13, LH = 8.4;
  var lensShape = roundRect(new THREE.Shape(), -LW / 2, -LH / 2, LW, LH, 1.1);
  lensShape.holes.push(roundRect(new THREE.Path(), -LW / 2 + 1.1, -LH / 2 + 1.3, LW - 2.2, LH - 2.6, .8), circle(-LW / 2 + .6, LH / 2 - .65, .26), circle(-LW / 2 + 1.35, LH / 2 - .65, .26));
  var BW = 3.6, BH = 4.8, badgeShape = new THREE.Shape();
  /* the badge outline with an inward half-circle notch on its left side, then the lanyard slot as a hole */
  badgeShape.moveTo(-BW / 2 + .5, -BH / 2); badgeShape.lineTo(BW / 2 - .5, -BH / 2); badgeShape.quadraticCurveTo(BW / 2, -BH / 2, BW / 2, -BH / 2 + .5);
  badgeShape.lineTo(BW / 2, BH / 2 - .5); badgeShape.quadraticCurveTo(BW / 2, BH / 2, BW / 2 - .5, BH / 2);
  badgeShape.lineTo(-BW / 2 + .5, BH / 2); badgeShape.quadraticCurveTo(-BW / 2, BH / 2, -BW / 2, BH / 2 - .5);
  badgeShape.lineTo(-BW / 2, .55); badgeShape.absarc(-BW / 2, 0, .55, Math.PI / 2, -Math.PI / 2, true); badgeShape.lineTo(-BW / 2, -BH / 2 + .5);
  badgeShape.quadraticCurveTo(-BW / 2, -BH / 2, -BW / 2 + .5, -BH / 2);
  badgeShape.holes.push(roundRect(new THREE.Path(), -.7, BH / 2 - .75, 1.4, .32, .16));
  var lens = plate(lensShape, themeColor('canvas', 0x141110), .38), badge = plate(badgeShape, themeColor('primary', 0xff8e59), .24);
  var glass = new THREE.Group(); glass.add(lens);   /* the badge plate is built but not shown (owner review: it read as a blob) */
  badge.position.set(LW / 2 - .6, .35, -LH / 2 + 1.2); badge.rotation.y = -.35;
  G.show(glass, { download: 1 });   /* the kit fades it in on this view and out on every other */
  /* each step's height of the glass over the network (a whole network wants the glass higher) */
  var GLASS_Y = [2.4, 2.6, 2.8, 2.8, 3], glassY = GLASS_Y[0], glassS = 1;
  /* tilted up toward the camera (the views look from 16-30 degrees up, where a flat plate shows edge-on), and sized
     with each step's framing (SHAPES[].cam.fit), so the holes keep framing the network as the camera pulls back */
  glass.rotation.x = .78;
  function want(ri) { return SHAPES[step].up(ri); }
  S.stage({
    name: 'download',
    aims: true,   /* a new step moves the camera too (chains-scene.js select) */
    target: function (f, asp) {
      var c = SHAPES[step].cam, span = c.fit;
      return { aim: V(rings[HUB].c.x, 1.2, rings[HUB].c.z + 2), dist: W.fit(span, span * .62, asp, .92), elev: c.elev, yaw: c.yaw, tilt: 1.2, n: 0 };
    },
    set: function (st) {
      var s = Math.max(0, Math.min(SHAPES.length - 1, Number(st && st.s) || 0));
      if (s === step && changedAt) return;
      step = s; changedAt = performance.now();
      if (k.clockTo) { k.clockTo(BUILD[step], BUILD_MS); holding = true; }
      /* light what the step is about: your ring from step 3, the computers once the network is joined */
      if (W.focusOn) W.focusOn(step >= 2 && step <= 3 ? function (ri) { return ri === MINE; } : step === 4 ? function (ri) { return rank[ri] < 9; } : null, true);
      k.wake(1800); k.moved(1800);
    },
    pose: function (w, ms, now) {
      /* another view: the build clock goes back to real time, built (by the view, not the weight: a flight into this view
         starts at weight 0) */
      if (holding && W.view() !== 'download' && k.clockRelease) { k.clockRelease(); holding = false; }
      /* the glass: shown with this view, its opacity following the view's weight, its height easing to the step's */
      if (w > .02) {
        var gy = GLASS_Y[step], ga = k.reduced ? 1 : 1 - Math.exp(-(last ? Math.min(64, now - last) : 16) / 260);
        if (Math.abs(gy - glassY) > .005) { glassY += (gy - glassY) * ga; k.wake(60); k.moved(60); } else glassY = gy;
        var gs = Math.max(.9, SHAPES[step].cam.fit / 26);
        if (Math.abs(gs - glassS) > .002) { glassS += (gs - glassS) * ga; k.wake(60); k.moved(60); } else glassS = gs;
        glass.position.set(HUBC.x, glassY, HUBC.z);
        glass.scale.setScalar(glassS);
      }
      if (w <= .001) return;   /* another view owns the rings' rise */
      var dt = last ? Math.min(64, now - last) : 16, a = k.reduced ? 1 : 1 - Math.exp(-dt / 220), moving = false;
      last = now;
      for (var i = 0; i < n; i++) {
        if (i === HUB) { rise[i] = 0; continue; }
        /* one after another, nearest first: each ring waits its turn (55 ms per place in the wave) */
        var due = k.reduced || now - changedAt > rank[i] * 55;
        var target = due ? want(i) : live[i], d = target - live[i];
        if (Math.abs(d) > .002) { live[i] += d * a; moving = true; } else live[i] = target;
        if (!due) moving = true;
        rise[i] = live[i] * w;
      }
      if (moving) { k.wake(60); k.moved(60); }
    },
    anchor: function (out) { out.pos.set(rings[HUB].c.x, 0, rings[HUB].c.z); out.quat.identity(); out.s = 1; },
    tags: function () { return []; }
  });
  if (window.ArkWorldHost && window.ArkWorldHost.setView) window.ArkWorldHost.setView('download', 'download');
})();

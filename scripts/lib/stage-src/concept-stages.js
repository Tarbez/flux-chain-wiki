/* The 3D of the concept's pages: In one minute, Three layers, Life of a resolver, Products, Identity and
   names (the brief's sketch), Nodes, Status. Each registers a stage with the world (chains-scene.js).
   Moved out of docs/home-redesign/concept-views.js (2026-10-24, the 3D port): the words and the DOM of those
   pages stay there (and, on the site, in the pages); this file holds only what is drawn. It reads no DOM and
   no address: a page tells the world its state (ArkWorldHost.state / select on the site, the address in the
   mockup), and a click that leaves the stage goes through S.open (chains-scene.js).
   Loaded after stages.js; the mockup loads it before concept-views.js. */
(function () {
  'use strict';
  var C = window.DEFXN_CONCEPT, S = window.DEFXNScene, N = window.DEFXN_NETWORK;
  if (!C || !S || !S.ok || !S.world) return;
  var RES = (window.DEFXN_RESOLVERS || { resolvers: [] }).resolvers, CAPS = (window.DEFXN_CAPABILITIES || { capabilities: [] }).capabilities;
  var W = S.world, k = W.k, THREE = W.THREE, V = W.V, ease = W.ease, clamp01 = ease.clamp01, lerp = W.lerp, win = W.win, HUB = W.HUB;
  var grow = W.grow, num = W.num, anchorAt = W.anchorAt, follower = W.follower;
  var RB = window.DEFXNDependencies.RoundedBoxGeometry, LIFT = k.LIFT, TAU = Math.PI * 2;
  var M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), E = new THREE.Euler(), SC = new THREE.Vector3();
  function compose(x, y, z, yaw, sx, sy, sz) { Q.setFromEuler(E.set(0, yaw || 0, 0)); return M.compose(P.set(x, y, z), Q, SC.set(Math.max(1e-4, sx), Math.max(1e-4, sy == null ? sx : sy), Math.max(1e-4, sz == null ? sx : sz))); }
  var col = new THREE.Color(), quiet = new THREE.Color(), teal = new THREE.Color(), slate = new THREE.Color(), dark = new THREE.Color(), bone = new THREE.Color();
  /* one material language on every stage (MOTION-SPEC.md, art direction): graphite for structure
     (plates, devices, computers), slate for resolvers, bone for records, teal only for what is
     chosen or signed. Light pastel bodies read as toys against the dark canvas, so none are used. */
  var graphite = new THREE.Color();
  function tones() {
    quiet.copy(k.mix('other', 'identity', .35)); teal.copy(k.C.network).lerp(k.C.signal, .35);
    slate.copy(k.C.resolver || k.C.other).lerp(k.C.canvas, .58); dark.copy(k.mix('canvas', 'other', .45)); bone.copy(k.C.record);
    graphite.copy(k.mix('canvas', 'other', .52));
  }
  k.onPaint(tones); tones();

  /* In one minute: the network itself; each idea lights what it names */
  (function () {
    var step = 1, set0 = -1, trace = W.tween(0), rings = W.ringList;
    var MINE = N.MINE, RES0 = N.KIND.indexOf('resolver'), cube0 = 0;
    W.cubes.forEach(function (c, i) { if (c.distanceTo(rings[RES0].c) < W.cubes[cube0].distanceTo(rings[RES0].c)) cube0 = i; });
    /* clear the focus once on the way out: clearing it every frame asked for a frame every frame */
    function focus(on) {
      if (!on) { if (set0 !== 0) { W.focusOn(null, false); set0 = 0; } return; }
      if (set0 === step) return; set0 = step;
      if (step === 1) W.focusOn(function (i, kd) { return kd === 'identity'; }, false);
      else if (step === 2) W.focusOn(function (i, kd) { return kd === 'token'; }, false);
      else if (step === 3) W.focusOn(function (i, kd) { return kd === 'resolver'; }, false);
      else if (step === 4) W.focusOn(null, true);
      else W.focusOn(function (i) { return i === MINE || i === RES0; }, true);
    }
    function top(ri) { var r = rings[ri]; return V(r.c.x, r.c.y + r.t * 1.1, r.c.z); }
    S.stage({
      name: 'minute',
      target: function (f, asp) { return { aim: HUB.c.clone().add(V(0, 0, 1.5)), dist: W.fit(27, 15, asp, .94), elev: 34, yaw: 0, tilt: 2, n: 0 }; },
      set: function (st, w) { step = num(st.s, 1, 5); set0 = -1; if (step === 5) { trace.snap(0); trace.go(1, 1100, performance.now(), w < .05 ? 900 : 200); } k.wake(900); },
      pose: function (w, ms, now) {
        focus(w > .5);
        if (step === 5 && w > .5) {
          var t = trace.get(now), c = W.cubes[cube0], a = V(c.x, c.y, c.z), b = top(RES0), d = top(MINE);
          W.lit.line(a, b, 14, win(t, 0, .5), .07); W.lit.line(b, d, 18, win(t, .45, 1), .07);
        }
      },
      anchor: function (out) { anchorAt(out, W.mark.position.x, W.mark.position.y, W.mark.position.z, HUB.R * .4); },
      tags: function () {
        var p = step === 1 ? top(MINE) : step === 2 ? top(N.KIND.indexOf('token')) : step === 3 ? top(RES0) : step === 4 ? W.cubes[cube0].clone().add(V(0, .6, 0)) : top(MINE);
        return [{ id: 'focus', p: p, on: true }];
      }
    });
  })();

  /* Three layers: three plates, the base chain at the bottom */
  (function () {
    /* How it works is one row in space (MOTION-SPEC.md): result, then layers 14 to its right, then
       life 14 further; the next chapter is a pan to the right, the one before a pan to the left */
    var O = HUB.c.clone().add(V(14, 10.2, 5)), sel = 0, PW = 8.4, PD = 4.4, GAPY = 1.9;
    /* every form at its true size and scaled evenly, so its bevel keeps the one corner rule */
    var plates = k.blockSet(3, k.bevel(PW, .16, PD), { lift: .05 });
    var mini = k.blockSet(30, k.bevel(.26, .3, .08), { shadow: false });            /* the base chain's chains */
    var capB = k.blockSet(CAPS.length, k.bevel(1, 1, 1), { shadow: false });        /* capabilities */
    var resB = k.blockSet(RES.length, k.bevel(1, 1, 1), { shadow: false });         /* resolvers */
    var f = follower(3, 160), open = W.tween(0), capIx = {};
    CAPS.forEach(function (c, i) { capIx[c.id] = i; });
    function plateY(i, o) { return O.y + i * GAPY * (1 + .35 * o); }
    function capP(i, o) { return V(O.x + (i % 9 - 4) * .78, plateY(1, o) + .3, O.z + (Math.floor(i / 9) - .5) * 1.3); }
    function resP(i, o) { return V(O.x + (i % 5 - 2) * 1.3, plateY(2, o) + .38, O.z + (Math.floor(i / 5) - 1) * 1.15); }
    S.stage({
      name: 'layers',
      target: function (fr, asp) { return { aim: O.clone().add(V(0, GAPY * 1.2, 0)), dist: W.fit(PW + 3, GAPY * 3.6 + 2, asp, .9), elev: 22, yaw: 0, tilt: 1.2, n: 1.4 }; },
      set: function (st, w) { sel = num(st.s, 0, 2); if (w < .05) { open.snap(0); open.go(1, 900, performance.now(), 700); } k.wake(900); },
      pose: function (w, ms, now) {
        var on = w > .001; [plates, mini, capB, resB].forEach(function (s) { s.show(on); }); if (!on) return;
        f.step(now, function (i) { return i === sel ? 1 : 0; });
        var o = open.get(now);
        for (var i = 0; i < 3; i++) {
          var u = f.v[i], g = grow(w, i * .12, .6 + i * .12);
          plates.place(i, compose(O.x, plateY(i, o), O.z + u * .7, 0, g, g, g));
          plates.tint(i, col.copy(dark).lerp(i === 0 ? teal : i === 1 ? graphite : slate, .06 + .24 * u));
        }
        for (var m = 0; m < 30; m++) {
          var ring = Math.floor(m / 10), a = (m % 10) / 10 * TAU, cx = O.x + (ring - 1) * 2.6, rr = .75;
          mini.place(m, compose(cx + Math.cos(a) * rr, plateY(0, o) + .26, O.z + f.v[0] * .7 + Math.sin(a) * rr, Math.PI / 2 - a, grow(w, .3, .8)));
          mini.tint(m, col.copy(ring === 1 ? teal : quiet).multiplyScalar(.45 + .55 * f.v[0]));
        }
        CAPS.forEach(function (c, i) { var p = capP(i, o); capB.place(i, compose(p.x, p.y, p.z + f.v[1] * .7, .3, .38 * grow(w, .35 + i * .01, .85))); capB.tint(i, col.copy(graphite).lerp(quiet, .3).lerp(teal, .7 * f.v[1])); });   /* a layer not chosen steps back */
        RES.forEach(function (r, i) { var p = resP(i, o); resB.place(i, compose(p.x, p.y, p.z + f.v[2] * .7, .35, .5 * grow(w, .45 + i * .01, .95))); resB.tint(i, col.copy(graphite).lerp(quiet, .3).lerp(slate, .4).multiplyScalar(1 + .7 * f.v[2])); });
        /* a resolver names its blocks: references down to the capabilities, never a copy */
        if (f.v[2] > .05) RES.forEach(function (r, i) {
          if (i % 3) return;
          var a = resP(i, o); a.z += f.v[2] * .7; a.y -= .25;
          r.composes.forEach(function (cid) { var ci = capIx[cid]; if (ci == null) return; var b = capP(ci, o); b.z += f.v[1] * .7; b.y += .2; W.lit.line(a, b, 10, f.v[2], .028); });
        });
      },
      anchor: function (out) { anchorAt(out, O.x, plateY(sel, 1), O.z, 1.6); },
      tags: function () { var o = open.get(performance.now()); return [0, 1, 2].map(function (i) { return { id: 'plate-' + i, p: V(O.x - PW / 2 - .2, plateY(i, o) + .1, O.z + f.v[i] * .7 + PD / 2), on: true }; }); }
    });
  })();

  /* Life of a resolver: one resolver from build to inspect */
  (function () {
    var O = HUB.c.clone().add(V(28, 11.5, 5)), st = W.tween(0), RS = 1.5;   /* the third chapter of the row */
    var tile = { kind: 'record', glyph: 'doc', link: false };
    var cube = k.blockSet(1, k.bevel(1, 1, 1), { lift: .04 }), caps = k.blockSet(4, k.bevel(1, 1, 1));
    var gram = k.tileSet([tile]), launch = k.tileSet([tile], { noShadow: true });
    var ringT = k.blockSet(10, k.bevel(.42, .5, .12)), node = k.blockSet(1, k.bevel(1, .5, .9)), keyD = k.blockSet(1, new THREE.CylinderGeometry(.5, .5, .12, 32).rotateX(Math.PI / 2));
    var CP = [V(-3.6, 1.4, 0), V(-3.9, .1, .3), V(-3.6, -1.2, 0), V(-2.4, -2, .2)].map(function (p) { return p.add(O); });
    var CC = O.clone(), GP = O.clone().add(V(2.4, .6, .2)), NP = O.clone().add(V(4.2, -1.4, -.3)), KP = O.clone().add(V(0, 1.75, .2));
    function edges(t, dashed, reveal) {
      var h = RS * .56, c = CC, pts = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map(function (p) { return V(c.x + p[0] * h, c.y + p[1] * h, c.z + p[2] * h); });
      [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(function (e) {
        (dashed ? W.dots : W.lit).line(pts[e[0]], pts[e[1]], dashed ? 6 : 14, reveal, dashed ? .03 : .026);
      });
    }
    S.stage({
      name: 'life',
      target: function (f, asp) { return { aim: O.clone().add(V(.3, -.2, 0)), dist: W.fit(10.5, 6, asp, .9), elev: 10, yaw: 0, tilt: 1.2, n: 1.4 }; },
      set: function (s, w) { var to = num(s.s, 1, 5); if (w < .05) st.snap(Math.max(0, to - 1)); st.go(to, 650 + 450 * Math.abs(to - st.to), performance.now(), w < .05 ? 800 : 0); },
      pose: function (w, ms, now) {
        var on = w > .001; [cube, caps, gram, launch, ringT, node, keyD].forEach(function (s) { s.show(on); }); if (!on) return;
        var t = st.get(now), g = grow(w, 0, .6);
        /* 1 build: the blocks it names, its grammar, the resolver takes shape */
        CP.forEach(function (p, i) { caps.place(i, compose(p.x, p.y, p.z, .4, .55 * g * grow(clamp01(t), i * .1, .5 + i * .1))); caps.tint(i, col.copy(graphite).lerp(quiet, .55)); });   /* teal marks only the served resolver */
        var b1 = win(t, .3, 1);
        cube.place(0, compose(CC.x, CC.y, CC.z, .5 + win(t, 1, 2) * Math.PI / 2, RS * g * (b1 < .01 ? 1e-4 : .4 + .6 * b1)));
        cube.tint(0, col.copy(slate).lerp(teal, win(t, 3.2, 4)));
        gram.place(0, compose(GP.x, GP.y - (LIFT + .5) * .9, GP.z, -.15, .9 * g * grow(clamp01(t), .4, 1)));
        CP.forEach(function (p) { W.dots.line(V(p.x + .3, p.y, p.z), V(CC.x - RS * .55, CC.y + (p.y - CC.y) * .3, CC.z), 8, win(t, .5, 1), .028); });
        /* 2 launch: one signed record gives it its own chain; dashed: launched */
        var l = win(t, 1, 1.7);
        launch.place(0, compose(lerp(CC.x - 2.6, CC.x, l), CC.y + 2.2 - l * 2.2 - (LIFT + .5) * .7, CC.z + .9, 0, t > 1 && t < 1.95 ? .7 * (1 - win(t, 1.6, 1.95)) : 0));
        for (var r = 0; r < 10; r++) {
          var a = Math.PI / 2 + r / 10 * TAU, gr = grow(t, 1.5 + r * .03, 1.9 + r * .03);
          ringT.place(r, compose(CC.x + Math.cos(a) * 1.9, CC.y - 1.95, CC.z + Math.sin(a) * 1.1, Math.PI / 2 - a, gr));
          ringT.tint(r, col.copy(graphite).lerp(bone, .55));   /* its own chain: record tiles, as every chain is drawn */
        }
        if (t > 1.6 && t < 4) edges(t, true, win(t, 1.6, 2));
        /* 3 who can change it: the control key */
        var kk = grow(t, 2, 2.8);
        keyD.place(0, compose(KP.x, KP.y + .15, KP.z, 0, .5 * kk)); keyD.tint(0, col.copy(k.C.signal));
        if (t > 2.4) W.lit.line(KP.clone().add(V(0, -.3, 0)), V(CC.x, CC.y + RS * .56, CC.z), 6, win(t, 2.4, 2.9), .03);
        /* 4 serve: a provider passes the checked cases; solid with a proof: served */
        node.place(0, compose(NP.x, NP.y, NP.z, -.3, 1.4 * g * grow(t, 3, 3.6))); node.tint(0, col.copy(graphite).lerp(teal, win(t, 3.4, 4) * .28));
        if (t > 3.3) W.lit.line(V(NP.x - .6, NP.y + .3, NP.z), V(CC.x + RS * .5, CC.y - .3, CC.z), 10, win(t, 3.3, 3.8), .035);
        if (t >= 4) edges(t, false, win(t, 4, 4.4));
        /* 5 inspect: the page follows every part and checks it */
        if (t > 4.2) { CP.forEach(function (p, i) { W.lit.line(V(GP.x, GP.y + .9, GP.z), V(p.x, p.y + .4, p.z), 12, win(t, 4.2 + i * .12, 4.7 + i * .12), .03); }); }
      },
      anchor: function (out) { anchorAt(out, CC.x, CC.y, CC.z, RS); },
      tags: function () {
        var t = st.get(performance.now());
        return [{ id: 'caps', p: CP[0].clone().add(V(0, .55, 0)), on: t > .4 }, { id: 'grammar', p: GP.clone().add(V(0, .95, 0)), on: t > .8 },
          { id: 'chain', p: V(CC.x, CC.y - 2.6, CC.z + 1.1), on: t > 1.9 }, { id: 'key', p: KP.clone().add(V(0, .55, 0)), on: t > 2.8 },
          { id: 'provider', p: NP.clone().add(V(0, .6, 0)), on: t > 3.6 }, { id: 'state', p: V(CC.x - RS * .56, CC.y + RS * .62, CC.z + RS * .3), on: t > 1.9 }];   /* at the cube's top left, clear of the key and the grammar */
      }
    });
  })();

  /* Products: seven groups as seven shelves; each tile keeps an empty emblem slot */
  (function () {
    var P = C.products, lanes = P.lanes, O = HUB.c.clone().add(V(-16, 13.5, -10)), sel = 0, items = [];
    lanes.forEach(function (l, li) { l.items.forEach(function (it, j) { items.push({ li: li, j: j }); }); });
    var tiles = k.blockSet(items.length, k.bevel(.95, .82, .2), { lift: .12 }), slots = k.blockSet(items.length, new THREE.CylinderGeometry(1, 1, .1, 28).rotateX(Math.PI / 2), { shadow: false });
    /* the product named after the dot (?s=social.play) gets the teal edge of the chosen thing */
    var pick = '', pEdge = k.edgeLight(1, 'signal', 2.6), EM = new THREE.Matrix4();
    function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
    var f = follower(lanes.length, 170), live = 0;
    tiles.liftable = tiles.pickable = function () { return live > .9; };
    tiles.label = function (i) { var it = lanes[items[i].li].items[items[i].j]; return { name: it.name, act: it.address || (it.stage ? it.stage : lanes[items[i].li].name) }; };
    tiles.onPick = function (i) { S.open('products', { s: lanes[items[i].li].slug }, { replace: true }); };
    function at(li, j, u) { return V(O.x + (li - (lanes.length - 1) / 2) * 1.55, O.y + 1.9 - j * 1.05 + u * .25, O.z + u * 1.4); }
    S.stage({
      name: 'products', aims: true,
      target: function (fr, asp) { return { aim: O.clone().add(V((sel - (lanes.length - 1) / 2) * .35, -.2, .5)), dist: W.fit(lanes.length * 1.55 + 1.6, 6.4, asp, .9), elev: 8, yaw: 0, tilt: 1.2, n: 1.4 }; },
      set: function (st) { var g0 = (st.s || '').split('.')[0]; pick = (st.s || '').split('.')[1] || ''; sel = Math.max(0, lanes.findIndex(function (l) { return l.slug === g0; })); k.wake(900); },   /* ?s=<group>.<product> (main) */
      pose: function (w, ms, now) {
        live = w; tiles.show(w > .001); slots.show(w > .001); if (w <= .001) { pEdge.set(0, EM, 0, 0, 0); return; }
        var lit = -1;
        f.step(now, function (li) { return li === sel ? 1 : 0; });
        items.forEach(function (it, i) {
          var u = f.v[it.li], p = at(it.li, it.j, u), g = grow(w, .1 + it.li * .05 + it.j * .03, .6 + it.li * .05 + it.j * .03);
          tiles.place(i, compose(p.x, p.y, p.z, 0, g));
          tiles.tint(i, col.copy(graphite).lerp(bone, .08 + .82 * u));
          slots.place(i, compose(p.x, p.y + .05, p.z + .11 * g, 0, .25 * g, .25 * g, .25 * g));
          slots.tint(i, col.copy(k.mix('canvas', 'other', .25)));
          if (pick && it.li === sel && slug(lanes[it.li].items[it.j].name) === pick) { lit = i; EM.makeTranslation(p.x, p.y, p.z + .101 * g); pEdge.set(0, EM, .95 * g - .02, .82 * g - .02, f.v[it.li], .03); }   /* thick: teal on bone is low contrast */
        });
        if (lit < 0) pEdge.set(0, EM, 0, 0, 0);
      },
      anchor: function (out) { var p = at(sel, 0, 1); anchorAt(out, p.x, p.y, p.z, .9); },
      tags: function () { return lanes.map(function (l, li) { var p = at(li, l.items.length - 1, f.v[li]); return { id: 'lane-' + li, p: p.clone().add(V(0, -.62, 0)), on: true }; }); }
    });
  })();

  /* Identity and names: your key file on your device; a flat name on the Domain resolver */
  (function () {
    /* (2026-10-23, owner: "flat grey slabs, cheap") a device that reads as a device, a browser that
       asks to sign, and the key file as a chip that never leaves the device. Every word on these
       plates is the brief's own (section 8). */
    var O = HUB.c.clone().add(V(16, 12.5, -10)), tab = W.tween(0);
    var ink = function () { return '#' + k.C.strong.getHexString(); }, mute = function () { return '#' + k.C.muted.getHexString(); }, sigc = function () { return '#' + k.C.signal.getHexString(); };
    function mono(g, px, sp) { g.font = '500 ' + px + 'px "JetBrains Mono", ui-monospace, monospace'; if ('letterSpacing' in g) g.letterSpacing = (sp || 3) + 'px'; }
    function sans(g, px, wt) { g.font = (wt || 700) + ' ' + px + 'px "Inter Tight", Inter, system-ui, sans-serif'; if ('letterSpacing' in g) g.letterSpacing = '-1px'; }
    /* each part at its true size (the bevel rule: a stretched cube pinches its bevel); scaled evenly */
    var SIZES = [[4.6, .14, 2.7], [4.4, 2.75, .12], [1.05, .1, .72], [2.7, 2.0, .1], [2.66, .22, .06], [1.6, 1.6, 1.6]];   /* deck, screen frame, chip, browser, its bar, domain */
    var partSets = SIZES.map(function (z) { return k.blockSet(1, k.bevel(z[0], z[1], z[2])); });
    var parts = { show: function (on) { partSets.forEach(function (p) { p.show(on); }); }, place: function (i, m) { partSets[i].place(0, m); }, tint: function (i, c) { partSets[i].tint(0, c); } };
    var owner = k.blockSet(8, k.bevel(.38, .46, .1)), edges = k.edgeLight(3, 'signal', 1.7);
    var screen = k.textPlate(3.9, 2.3, function (g, w, h) {
      g.fillStyle = 'rgba(8,16,14,.92)'; g.fillRect(0, 0, w, h);
      mono(g, 22); g.fillStyle = mute(); g.fillText('FXN ID · ON THIS DEVICE', 40, 60);
      sans(g, 64); g.fillStyle = ink(); g.fillText('.auth.fxn', 40, 150);
      sans(g, 28, 500); g.fillStyle = mute(); g.fillText('One key file for every network.', 40, 200); g.fillText('It stays on this device. It is never uploaded.', 40, 240);
    });
    var request = k.textPlate(2.3, 1.45, function (g, w, h) {
      g.fillStyle = 'rgba(232,228,218,.96)'; g.fillRect(0, 0, w, h);
      mono(g, 22); g.fillStyle = '#3d4743'; g.fillText('AN APP ASKS YOU TO SIGN', 32, 52);
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(32, 72, w - 64, 2);
      sans(g, 34, 600); g.fillStyle = '#121a17'; ['What will be signed', 'For which network', 'For how long'].forEach(function (l, i) { g.fillText(l, 32, 132 + i * 52); });
    });
    var chipWords = k.textPlate(.92, .62, function (g, w, h) { mono(g, 60, 6); g.fillStyle = ink(); g.fillText('.AUTH', 34, h * .48); g.fillText('.FXN', 34, h * .82); });
    var nameWords = k.textPlate(2.6, 1.1, function (g, w, h) {
      sans(g, 120); g.fillStyle = ink(); g.fillText('radio.fxn', 30, 140);
      mono(g, 30, 4); g.fillStyle = mute(); g.fillText('NEVER RADIO.DEFXN.FXN', 34, 200);
      g.fillStyle = mute(); g.fillRect(30, 188, g.measureText('NEVER RADIO.DEFXN.FXN').width + 8, 2);
    });
    var DECK = O.clone().add(V(.8, -1.2, .4)), SCR = O.clone().add(V(.8, .35, -.6)), CHIP = O.clone().add(V(2.1, -1.05, 1.05)), BR = O.clone().add(V(-3.3, .3, .6));
    var DOM = O.clone().add(V(-.6, -.6, .2)), NAME = O.clone().add(V(-.6, 1.05, .45)), OWN = O.clone().add(V(3, -.5, .2));
    var MT = new THREE.Matrix4(), TT = new THREE.Matrix4(), RT = new THREE.Matrix4(), QT = new THREE.Quaternion(), ET = new THREE.Euler();
    /* FXN ID and names are the two faces of one stage: changing tab turns it half a circle, so the
       other face comes round (a turn says "the other side of the same thing"); parts never shrink
       apart. SIDE is the turn of the face being placed. */
    var SIDE = new THREE.Matrix4(), SA = new THREE.Matrix4(), SB = new THREE.Matrix4(), SV3 = new THREE.Vector3();
    function turnOf(out, th) { return out.makeTranslation(O.x, O.y, O.z).multiply(RT.makeRotationY(th)).multiply(TT.makeTranslation(-O.x, -O.y, -O.z)); }
    function at(x, y, z, rx, ry, sx, sy, sz) { QT.setFromEuler(ET.set(rx || 0, ry || 0, 0)); return MT.compose(P.set(x, y, z), QT, SC.set(Math.max(1e-4, sx), Math.max(1e-4, sy), Math.max(1e-4, sz))).premultiply(SIDE); }
    function sv(x, y, z) { return SV3.set(x, y, z).applyMatrix4(SIDE).clone(); }
    S.stage({
      name: 'identity',
      target: function (f, asp) { return { aim: O.clone().add(V(-.1, -.1, .2)), dist: W.fit(10.4, 5.6, asp, .9), elev: 12, yaw: 0, tilt: 1.2, n: 1.4 }; },
      set: function (st, w) { var t = st.s === 'names' ? 1 : 0; if (w < .05) tab.snap(t); else tab.go(t, 1000, performance.now()); k.wake(1100); },
      pose: function (w, ms, now) {
        var on = w > .001; [parts, owner].forEach(function (s) { s.show(on); });
        if (!on) { [screen, request, chipWords, nameWords].forEach(function (p) { p.place(null); }); for (var e0 = 0; e0 < 3; e0++) edges.set(e0, MT, 0, 0, 0); return; }
        var t = tab.get(now), g0 = grow(w, 0, .6), a = g0 * (1 - win(t, .45, .8)), b = g0 * win(t, .2, .55), th = Math.PI * ease.inOut(t);
        turnOf(SA, th); turnOf(SB, th - Math.PI); SIDE.copy(SA);   /* FXN ID's face. Names' face is half a turn on */
        /* your device: a deck and a screen tilted back, in graphite, a thin lit seam where they meet */
        parts.place(0, at(DECK.x, DECK.y, DECK.z, 0, 0, a, a, a)); parts.tint(0, col.copy(graphite));
        parts.place(1, at(SCR.x, SCR.y, SCR.z, -.2, 0, a, a, a)); parts.tint(1, col.copy(dark));
        screen.place(a > .05 ? TT.copy(at(SCR.x, SCR.y, SCR.z, -.2, 0, a, a, 1)).multiply(RT.makeTranslation(0, 0, .075)) : null);
        /* the key file: a chip on the deck, edged in teal; a dashed line round it says it stays */
        parts.place(2, at(CHIP.x, CHIP.y + .1, CHIP.z, 0, -.2, a, a, a)); parts.tint(2, col.copy(dark).lerp(teal, .25));
        chipWords.place(a > .05 ? TT.copy(at(CHIP.x, CHIP.y + .156, CHIP.z, -Math.PI / 2, -.2, a, a, 1)) : null);
        edges.set(0, TT.copy(at(CHIP.x, CHIP.y + .155, CHIP.z, -Math.PI / 2, -.2, 1, 1, 1)), 1.05, .72, a, .014);
        for (var d = 0; d < 26; d++) { var an = d / 26 * TAU, pp = sv(CHIP.x + Math.cos(an) * 1.0, CHIP.y + .1, CHIP.z + Math.sin(an) * .7); W.dots.line(pp, pp, 1, clamp01(a * 1.6 - .5 - d / 60), .02); }
        /* the browser: a window and its bar, its request in bone; the request goes to the device, the signature comes back */
        parts.place(3, at(BR.x, BR.y, BR.z, 0, .32, a, a, a)); parts.tint(3, col.copy(graphite));
        parts.place(4, at(BR.x - .02, BR.y + .86, BR.z + .06, 0, .32, a, a, a)); parts.tint(4, col.copy(dark));
        request.place(a > .05 ? TT.copy(at(BR.x + .05, BR.y - .15, BR.z + .17, 0, .32, a, a, 1)) : null);
        edges.set(1, TT.copy(at(BR.x, BR.y, BR.z + .06, 0, .32, 1, 1, 1)), 2.7, 2.0, a * .7, .012);
        if (a > .5) {
          var rq = clamp01((a - .5) * 2);
          W.dots.line(sv(BR.x + 1.2, BR.y - .2, BR.z + .3), sv(CHIP.x - .55, CHIP.y + .2, CHIP.z), 16, rq, .028);
          W.lit.line(sv(CHIP.x - .55, CHIP.y + .35, CHIP.z - .1), sv(BR.x + 1.25, BR.y + .1, BR.z + .3), 16, clamp01(rq * 1.4 - .4), .03);
        }
        /* names: a flat name on the Domain resolver, and a lit line to its owner's chain */
        SIDE.copy(SB);
        parts.place(5, at(DOM.x, DOM.y, DOM.z, 0, .5, b, b, b)); parts.tint(5, col.copy(slate).multiplyScalar(1.4));
        edges.set(2, TT.copy(at(DOM.x, DOM.y, DOM.z, 0, .5, 1, 1, 1)).multiply(RT.makeTranslation(0, 0, .81)), 1.6, 1.6, b * .8, .014);
        nameWords.place(b > .05 ? TT.copy(at(NAME.x, NAME.y, NAME.z, 0, 0, b, b, 1)) : null);
        for (var r = 0; r < 8; r++) { var ao = Math.PI / 2 + r / 8 * TAU; owner.place(r, at(OWN.x + Math.cos(ao) * 1, OWN.y, OWN.z + Math.sin(ao) * .6, 0, Math.PI / 2 - ao, b, b, b)); owner.tint(r, col.copy(graphite).lerp(quiet, .5)); }
        if (b > .5) W.lit.line(sv(NAME.x + 1.35, NAME.y - .2, NAME.z), sv(OWN.x - 1, OWN.y + .25, OWN.z), 14, clamp01((b - .5) * 2), .03);
      },
      anchor: function (out) { anchorAt(out, SCR.x, SCR.y, SCR.z, 1.4); },
      tags: function () {
        var t = tab.get(performance.now());
        SIDE.copy(turnOf(SA, Math.PI * ease.inOut(t)));
        if (t < .5) return [{ id: 'device', p: sv(DECK.x - 2.2, DECK.y - .3, DECK.z + 1.3), on: t < .05 }, { id: 'file', p: sv(CHIP.x + .6, CHIP.y + .35, CHIP.z + .2), on: t < .05 }, { id: 'app', p: sv(BR.x, BR.y + 1.25, BR.z), on: t < .05 }];
        SIDE.copy(turnOf(SB, Math.PI * ease.inOut(t) - Math.PI));
        return [{ id: 'name', p: sv(NAME.x - 1.2, NAME.y + .75, NAME.z), on: t > .95 }, { id: 'domain', p: sv(DOM.x, DOM.y - 1.15, DOM.z + .8), on: t > .95 }, { id: 'owner', p: sv(OWN.x, OWN.y + .7, OWN.z), on: t > .95 }];
      }
    });
  })();

  /* Nodes: a browser tab, a phone, a server; the roles gather round the chosen one */
  (function () {
    var O = HUB.c.clone().add(V(-15, 14.5, 13)), sel = 0;   /* high enough that no ring sits behind the roles (coordinator, audit 4) */
    var lights = k.blockSet(9, new THREE.SphereGeometry(1, 10, 8), { shadow: false });
    var roles = k.blockSet(4, k.bevel(1, 1, 1)), f = follower(3, 170);
    var SIZE = [[2.6, 1.7, .16], [.95, 1.85, .14], [1.25, 2.3, 1.25]], X = [-3.2, 0, 3.2];
    /* each form at its true size (the bevel rule), scaled evenly */
    var formSets = SIZE.map(function (z) { return k.blockSet(1, k.bevel(z[0], z[1], z[2]), { lift: .08 }); });
    var forms = { show: function (on) { formSets.forEach(function (p) { p.show(on); }); }, place: function (i, m) { formSets[i].place(0, m); }, tint: function (i, c) { formSets[i].tint(0, c); } };
    S.stage({
      name: 'nodes', aims: true,
      target: function (fr, asp) { return { aim: O.clone().add(V(X[sel] * .3, .3, .6)), dist: W.fit(10.2, 5.6, asp, .9), elev: 5, yaw: 0, tilt: 1.2, n: 1.6 }; },
      set: function (st) { sel = num(st.s, 0, 2); k.wake(1000); },
      pose: function (w, ms, now) {
        var on = w > .001; [forms, lights, roles].forEach(function (s) { s.show(on); }); if (!on) return;
        f.step(now, function (i) { return i === sel ? 1 : 0; });
        for (var i = 0; i < 3; i++) {
          var u = f.v[i], g = grow(w, i * .12, .6 + i * .12), s = SIZE[i];
          forms.place(i, compose(O.x + X[i], O.y + u * .35, O.z + u * 1.2, -.12 * (i - 1), g));
          forms.tint(i, col.copy(dark).lerp(graphite, .4 + .6 * u).lerp(teal, .18 * u));
          for (var q = 0; q < 3; q++) { lights.place(i * 3 + q, compose(O.x + X[i] - s[0] * .3 + q * .22, O.y + u * .35 + s[1] * .38, O.z + u * 1.2 + s[2] / 2 + .02, 0, .055 * g)); lights.tint(i * 3 + q, col.copy(k.C.signal).multiplyScalar(.4 + .6 * u)); }
        }
        var c = V(O.x + X[sel], O.y + .35, O.z + 1.2);
        for (var r = 0; r < 4; r++) {
          var a = -Math.PI / 2 + (r - 1.5) * .7, rr = 2.1, g2 = grow(w, .4 + r * .08, .9 + r * .08);
          roles.place(r, compose(c.x + Math.cos(a) * rr * 1.15, c.y - 1.55 + r * .02, c.z + 1 + Math.sin(a) * .3, .3, .45 * g2));
          roles.tint(r, col.copy([teal, slate, quiet, k.C.identity][r]));
          W.dots.line(V(c.x + Math.cos(a) * rr * 1.15, c.y - 1.3, c.z + 1), V(c.x, c.y - SIZE[sel][1] * .45, c.z + .2), 8, g2, .025);
        }
      },
      anchor: function (out) { anchorAt(out, O.x + X[sel], O.y + .35, O.z + 1.2, 1.2); },
      tags: function () {
        var out = [0, 1, 2].map(function (i) { return { id: 'way-' + i, p: V(O.x + X[i], O.y - SIZE[i][1] * .62 + f.v[i] * .35, O.z + f.v[i] * 1.2), on: true }; }), c = V(O.x + X[sel], O.y + .35, O.z + 1.2);
        for (var r = 0; r < 4; r++) { var a = -Math.PI / 2 + (r - 1.5) * .7; out.push({ id: 'role-' + r, p: V(c.x + Math.cos(a) * 2.1 * 1.15, c.y - 2.05, c.z + 1), on: true }); }
        return out;
      }
    });
  })();

  /* Status: the network seen whole, behind the page */
  S.stage({
    name: 'status',
    target: function (f, asp) { return { aim: HUB.c.clone(), dist: W.fit(30, 17, asp, .96), elev: 40, yaw: 0, tilt: 1.6, n: 1.2 }; },
    set: function () {}, pose: function () {},
    anchor: function (out) { anchorAt(out, W.mark.position.x, W.mark.position.y, W.mark.position.z, HUB.R * .4); },
    tags: function () { return []; }
  });
})();

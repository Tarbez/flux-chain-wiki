/* DEFXN mockup app: the other worlds the camera flies to (2026-10-23, audit 2).

   Each stage floats above the network, in the same world as your chain, so every move between
   views is one camera flight. A stage is a target (where the camera looks), a pose (what stands
   where this frame), the thing the page slab opens out of (anchor) and the labels it names (tags).
   It shows at its view's weight w: a stage at w 0 is hidden and costs no draw call.
     resolve    how a result is made: Alice's and Bob's chains, their signed intents, a resolver,
                one signed result, copies on three computers, and the three checks back along the
                signatures (designer brief, section 3). The camera leans toward each step's part.
     resolvers  the first-party resolvers as cubes, and the capabilities each one names: a resolver
                points at its building blocks and never holds a copy (brief, section 5). A resolver
                whose grammar is not specified yet stands hollow.
     measured   every launched capability as a column with one cube per checked case, tallest first
     fxn        FXN's starting supply as a ring of 100 tiles round the mark, one tile per 1%
   Motion: every change eases to a stop. Nothing moves while you only look (home motion law).
   Big things glide into place; only small ones overshoot a little (fix 38).
   Colour: grey for everything, teal for the one thing chosen. Labels carry the names. */
(function () {
  'use strict';
  var S = window.DEFXNScene;
  if (!S || !S.ok || !S.world) return;
  var W = S.world, k = W.k, THREE = W.THREE, V = W.V, ease = W.ease, clamp01 = ease.clamp01, lerp = W.lerp, win = W.win, HUB = W.HUB;
  var RB = window.DEFXNDependencies.RoundedBoxGeometry, TAU = Math.PI * 2, LIFT = k.LIFT, HALF_D = k.HALF_D;
  var M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), E = new THREE.Euler(), SC = new THREE.Vector3();
  /* scratch vectors, made once and reused every frame (fix 89) */
  var T1 = V(0, 0, 0), T2 = V(0, 0, 0), T3 = V(0, 0, 0);
  function compose(x, y, z, yaw, s, sy) { Q.setFromEuler(E.set(0, yaw || 0, 0)); s = Math.max(1e-4, s); return M.compose(P.set(x, y, z), Q, SC.set(s, Math.max(1e-4, sy || s), s)); }
  /* a small thing grows in as w passes from a to b, with a small overshoot that settles */
  function grow(w, a, b) { var u = clamp01((w - a) / (b - a)); return u <= 0 ? 1e-4 : ease.back(u); }
  /* a big thing glides in, with no overshoot */
  function glide(w, a, b) { var u = clamp01((w - a) / (b - a)); return u <= 0 ? 1e-4 : ease.glide(u); }
  function pickHook(kind, id) { if (S.hooks.stagePick) S.hooks.stagePick(kind, id); }
  var col = new THREE.Color(), quiet = new THREE.Color(), teal = new THREE.Color(), dark = new THREE.Color(), hollow = new THREE.Color();
  function paintTones() { quiet.copy(k.mix('other', 'identity', .35)); teal.copy(k.C.network).lerp(k.C.signal, .35); dark.copy(k.mix('canvas', 'other', .55)); hollow.copy(k.mix('canvas', 'other', .25)); }
  k.onPaint(paintTones); paintTones();
  /* one weight per item that eases toward its target each frame; true while any still moves */
  function follower(n) {
    var f = { v: new Float32Array(n), last: 0 };
    f.step = function (now, want) {
      var dt = f.last ? Math.min(64, now - f.last) : 16, a = k.reduced ? 1 : 1 - Math.exp(-dt / 130), moving = false;
      f.last = now;
      for (var i = 0; i < n; i++) { var t = want(i), d = t - f.v[i]; if (Math.abs(d) > .002) { f.v[i] += d * a; moving = true; } else f.v[i] = t; }
      if (moving) { k.wake(60); k.moved(60); }
      return moving;
    };
    return f;
  }
  /* a ring of teal beads round a point, facing the camera: a signature */
  function seal(c, r, reveal, n) {
    for (var q = 0; q < n; q++) {
      var a = Math.PI / 2 - q / n * TAU;
      T3.set(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r, c.z);
      W.lit.line(T3, T3, 1, clamp01(reveal * n - q), .03);
    }
  }
  /* a texture of lines for a face, drawn grey on black for an alpha map */
  function faceTex(draw) {
    var cv = document.createElement('canvas'); cv.width = cv.height = 128;
    var g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#fff'; g.strokeStyle = '#fff';
    draw(g); return new THREE.CanvasTexture(cv);
  }

  /* ---------- how a result is made ---------- */
  (function () {
    var O = HUB.c.clone().add(V(0, 11.5, 5)), T = 1.1, RS = 1.9, XS = 1.3, CS = 1.15;
    function L(x, y, z) { return V(O.x + x, O.y + y, O.z + z); }
    var tile = { kind: 'record', glyph: 'doc', link: false };
    var intents = k.tileSet([tile, tile]), result = k.tileSet([tile]), copies = k.tileSet([tile, tile, tile], { noShadow: true });
    /* Alice's and Bob's own chains: a small identity ring behind each intent (fix 43) */
    var RN = 6, chains = k.tileSet(Array.apply(null, Array(RN * 2)).map(function () { return { kind: 'identity', glyph: 'iii', link: true }; }), { noShadow: true });
    var comp = k.blockSet(3, k.bevel(1, .42, .8));
    var AP = [L(-5.3, .55, 0), L(-5.3, -1.6, 0)], RP = L(-1.3, -.2, 0), XP = L(2.2, -.95, .5);
    var CP = [L(5.8, 1.15, -.5), L(5.8, -.25, -.5), L(5.8, -1.65, -.5)];
    var CC = AP.map(function (a) { return V(a.x - 1.8, a.y - .05, a.z - .3); }), CR = .62;
    /* the resolver: a cube with a rulebook's lines on its sides (fix 44) */
    var resolver = new THREE.Group(), resBody = new THREE.Mesh(k.bevel(1, 1, 1), new THREE.MeshPhysicalMaterial({ roughness: .45, clearcoat: .35, clearcoatRoughness: .3, envMapIntensity: .8 }));
    var rules = faceTex(function (g) { g.lineWidth = 7; g.lineCap = 'round'; [38, 58, 78].forEach(function (y, i) { g.beginPath(); g.moveTo(30, y); g.lineTo(i === 2 ? 70 : 98, y); g.stroke(); }); g.strokeRect(24, 22, 80, 84); });
    var faceMat = new THREE.MeshBasicMaterial({ alphaMap: rules, transparent: true, depthWrite: false });
    resBody.castShadow = true; resolver.add(resBody);
    [0, 1, 2, 3].forEach(function (i) { var f = new THREE.Mesh(new THREE.PlaneGeometry(.78, .78), faceMat); f.rotation.y = i * Math.PI / 2; f.position.set(Math.sin(i * Math.PI / 2) * .503, 0, Math.cos(i * Math.PI / 2) * .503); resolver.add(f); });
    resolver.visible = false; k.scene.add(resolver);
    k.onPaint(function () { resBody.material.color.copy(teal); faceMat.color.copy(k.mix('canvas', 'network', .35)); });
    var st = W.tween(0);
    function centre(b, s, out) { return (out || T1).set(b.x, b.y + (LIFT + .5) * s, b.z + HALF_D * s + .02); }
    /* the camera leans toward each step's part (fix 41): left, left, centre, right, wide */
    var LEAN = [-2.4, -2.4, -1.2, .4, 2.1, .25], NEAR = [.95, .95, .92, .92, .92, 1.06];
    S.stage({
      name: 'resolve', aims: true,
      target: function (f, asp) {
        var s = Math.round(st.to);
        return { aim: L(LEAN[s] * .45 + .25, -.15, 0), dist: W.fit(14.6, 6.4, asp, .9) * NEAR[s], elev: 13, yaw: 0, tilt: 1.2, n: 1.35 };
      },
      set: function (state, w) {
        var to = state.step || 1;
        if (w < .05) st.snap(Math.max(0, to - 1));       /* arriving: show this step's change once the camera is there */
        st.go(to, 700 + 520 * Math.abs(to - st.to), performance.now(), w < .05 ? 1150 : 0);
      },
      pose: function (w, ms, now) {
        var on = w > .001;
        [intents, result, copies, comp, chains].forEach(function (s) { s.show(on); });
        resolver.visible = on;
        if (!on) return;
        var t = st.get(now), vis = glide(w, .45, .9);   /* dots and signatures leave with their stage */
        /* the resolver turns a quarter as it clears the batch */
        resolver.position.copy(RP); resolver.rotation.set(0, .4 + win(t, 1.25, 2) * Math.PI / 2, 0); resolver.scale.setScalar(RS * glide(w, 0, .6));
        CP.forEach(function (c, i) { comp.place(i, compose(c.x, c.y, c.z, -.22, CS * glide(w, .12 + .08 * i, .7 + .08 * i))); comp.tint(i, dark); });
        /* Alice's and Bob's chains stand behind them */
        CC.forEach(function (c, ci) {
          for (var q = 0; q < RN; q++) {
            var th = Math.PI / 2 + q / RN * TAU, b = grow(w, .15 + ci * .08 + q * .02, .6 + ci * .08 + q * .02);
            chains.place(ci * RN + q, k.ringFrame(c, CR, th, .36, b, M));
            chains.placeLink(ci * RN + q, k.ringFrame(c, CR, th + Math.PI / RN, .36, b, M), .62);
          }
        });
        /* 1: two signed intents slide out of their own chains */
        var a1 = clamp01(t);
        AP.forEach(function (b, i) {
          var e = ease.glide(a1), x = lerp(CC[i].x, b.x, e), y = b.y, z = lerp(CC[i].z + CR, b.z, e);
          intents.place(i, compose(x, y, z, .12, T * lerp(.36 / T, 1, e) * glide(w, .2, .6)));
          if (a1 > .3) seal(centre(T2.set(x, y, z), T), T * .62, win(t, .45 + i * .1, 1) * vis, 14);
        });
        /* 2: the resolver reads both */
        AP.forEach(function (b, i) { W.dots.line(T1.set(b.x + T * .55, b.y + T * .66, b.z), T2.set(RP.x - RS * .52, RP.y + (i ? -.35 : .35), RP.z), 12, win(t, 1.05 + i * .1, 1.7 + i * .1) * vis, .04); });
        /* 3: one signed result comes out of it */
        var e3 = win(t, 2, 2.8), xs = XS * (t > 2 ? lerp(.25, 1, e3) : 0);
        result.place(0, compose(lerp(RP.x, XP.x, e3), lerp(RP.y - .6, XP.y, e3), lerp(RP.z, XP.z, e3), lerp(.4, -.08, e3), xs));
        if (t > 2.5) seal(centre(XP, XS), XS * .64, win(t, 2.55, 3) * vis, 16);
        /* 4: copies go to three computers; each one's light turns teal as its copy lands (fix 45) */
        CP.forEach(function (c, i) {
          var e4 = win(t, 3 + .14 * i, 3.75 + .14 * i), tx = c.x, ty = c.y + .21 * CS, tz = c.z;
          copies.place(i, compose(lerp(XP.x, tx, e4), lerp(XP.y + .3, ty, e4) + Math.sin(Math.PI * e4) * .9, lerp(XP.z, tz, e4), -.22, t > 3 ? lerp(XS * .7, .62, e4) : 0));
          W.dots.line(T1.set(XP.x + XS * .6, XP.y + XS * .6, XP.z), T2.set(tx - .5, ty + .25, tz), 10, win(t, 3 + .14 * i, 3.6 + .14 * i) * vis, .035);
          T3.set(c.x + .3 * CS, c.y, c.z + .56 * CS);
          if (e4 > .97) W.lit.line(T3, T3, 1, vis, .07); else W.dots.line(T3, T3, 1, vis, .055);
        });
        /* 5: anyone checks, following the signatures back: the result, then each intent */
        if (t > 4) {
          var rc = centre(XP, XS, T3), mx = CP[1].x - .2, my = CP[1].y + .55, mz = CP[1].z;
          W.lit.line(T1.set(mx, my, mz), T2.set(rc.x + XS * .5, rc.y, rc.z), 10, win(t, 4, 4.35) * vis, .045);
          W.lit.line(T1.set(rc.x - XS * .5, rc.y, rc.z), T2.set(RP.x + RS * .5, RP.y, RP.z + .3), 8, win(t, 4.3, 4.65) * vis, .045);
          AP.forEach(function (b, i) { var cb = centre(b, T, T2); W.lit.line(T1.set(RP.x - RS * .5, RP.y + (i ? -.3 : .3), RP.z + .3), cb, 10, win(t, 4.6, 5) * vis, .045); });
        }
      },
      anchor: function (out) { out.pos.set(RP.x, RP.y - (LIFT + .5) * RS, RP.z); out.quat.identity(); out.s = RS; },
      tags: function () {
        var t = st.get(performance.now()), rc = centre(XP, XS, V(0, 0, 0));
        return [
          { id: 'alice', p: L(-5.3, .55 + T * 1.32, 0), on: t > .75 },
          { id: 'bob', p: L(-5.3, -1.6 - .12, 0), on: t > .75 },
          { id: 'resolver', p: V(RP.x, RP.y + RS * .62, RP.z), on: true },
          { id: 'result', p: V(XP.x, XP.y + XS * 1.32, XP.z), on: t > 2.75 },
          { id: 'copies', p: V(CP[0].x, CP[0].y + .75, CP[0].z), on: t > 3.8 },
          /* the three checks, numbered in the order they are made (fix 46) */
          { id: 'c1', p: V(XP.x, XP.y - .3, XP.z), on: t > 4.35 },
          { id: 'c2', p: centre(AP[0], T, V(0, 0, 0)).add(V(T * .62, T * .25, 0)), on: t > 4.8 },
          { id: 'c3', p: centre(AP[1], T, V(0, 0, 0)).add(V(T * .62, -T * .25, 0)), on: t > 4.95 }
        ];
      }
    });
  })();

  /* ---------- the resolvers, and the capabilities each one names ---------- */
  (function () {
    var D = window.DEFXN_RESOLVERS, C = window.DEFXN_CAPABILITIES;
    if (!D || !C) return;
    var R = D.resolvers, CAPS = C.capabilities;
    var O = HUB.c.clone().add(V(-11.5, 10.5, -1)), SP = 1.5, CU = .92, CW = 9, CR = .58;
    var cubes = k.blockSet(R.length, k.bevel(1, 1, 1)), caps = k.blockSet(CAPS.length, k.bevel(1, 1, 1));
    /* a resolver whose grammar is not specified yet stands hollow: an outline round a dark core (fix 61) */
    var open = R.map(function (r, i) { return r.grammar === 'checked' ? -1 : i; }).filter(function (i) { return i >= 0; });
    var edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), edgeMat = new THREE.LineBasicMaterial({ transparent: true, opacity: .9 });
    var outlines = open.map(function () { var l = new THREE.LineSegments(edgeGeo, edgeMat); l.matrixAutoUpdate = false; l.visible = false; k.scene.add(l); return l; });
    k.onPaint(function () { edgeMat.color.copy(k.C.muted); });
    var sel = 0, fc = follower(R.length), fk = follower(CAPS.length);
    function cell(i, out) { return (out || T1).set(O.x + (i % 5 - 2) * SP, O.y + (1 - Math.floor(i / 5)) * SP + .7, O.z); }
    function capCell(c, out) { var row = Math.floor(c / CW), inRow = Math.min(CW, CAPS.length - row * CW); return (out || T2).set(O.x + (c % CW - (inRow - 1) / 2) * 1.02, O.y - 2.55 - row * 1.02, O.z + .5); }
    function order(i, cap) { return R[i].composes.indexOf(cap); }
    var live = 0;
    cubes.liftable = cubes.pickable = function () { return live > .9; };
    caps.liftable = caps.pickable = function () { return live > .9; };
    cubes.onPick = function (i) { pickHook('resolver', R[i].id); };
    caps.onPick = function (c) { pickHook('capability', CAPS[c].id); };
    /* hover names (fixes 59, 60) */
    cubes.label = function (i) { return { name: R[i].name, act: i === sel ? 'Chosen' : 'Choose' + (R[i].grammar === 'checked' ? '' : ' · grammar not specified') }; };
    caps.label = function (c) { var n = CAPS[c].id; return { name: n.charAt(0).toUpperCase() + n.slice(1), act: 'See its checked cases' }; };
    var last = { p: V(0, 0, 0), s: CU };
    S.stage({
      name: 'resolvers', aims: true,
      /* the camera leans a little toward the chosen cube (fix 62) */
      target: function (f, asp) { var c = cell(sel, V(0, 0, 0)); return { aim: O.clone().add(V((c.x - O.x) * .22, -.2 + (c.y - O.y - .7) * .15, .8)), dist: W.fit(9.4, 8.6, asp, .9), elev: 8, yaw: 7, tilt: 1.2, n: 1.35 }; },
      set: function (state) { var i = R.findIndex(function (r) { return r.id === state.id; }); sel = i < 0 ? 0 : i; k.wake(1200); k.moved(1200); },
      pose: function (w, ms, now) {
        live = w; cubes.show(w > .001); caps.show(w > .001);
        if (w <= .001) { outlines.forEach(function (o) { o.visible = false; }); return; }
        fc.step(now, function (i) { return i === sel ? 1 : 0; });
        fk.step(now, function (c) { return order(sel, CAPS[c].id) >= 0 ? 1 : 0; });
        R.forEach(function (r, i) {
          var c = cell(i), u = fc.v[i], s = CU * (1 + .32 * u) * glide(w, .02 * i, .5 + .02 * i), hol = open.indexOf(i);
          /* the chosen cube comes forward and turns an eighth (fix 62) */
          cubes.place(i, compose(c.x, c.y, c.z + 1.5 * u, u * Math.PI / 4 + .35, hol >= 0 ? s * .9 : s));
          cubes.tint(i, col.copy(hol >= 0 ? hollow : quiet).lerp(teal, u));
          if (hol >= 0) { var o = outlines[hol]; o.visible = true; o.matrix.copy(compose(c.x, c.y, c.z + 1.5 * u, u * Math.PI / 4 + .35, s * 1.02)); }
          if (i === sel) { last.p.set(c.x, c.y - (LIFT + .5) * s, c.z + 1.5 * u); last.s = s; }
        });
        var top = cell(sel, T3); top.z += 1.5 * fc.v[sel];
        CAPS.forEach(function (cp, c) {
          var p = capCell(c), u = fk.v[c], s = CR * grow(w, .3 + .015 * c, .8 + .015 * c), n = order(sel, cp.id);
          caps.place(c, compose(p.x, p.y + .45 * u, p.z + .3 * u, .35, s));
          caps.tint(c, col.copy(quiet).lerp(k.C.signal, u * .75));
          /* a resolver names its blocks: a dotted reference, not a copy; drawn one after another (fix 63) */
          if (u > .02) W.lit.line(T1.set(top.x, top.y - CU * .75, top.z), T2.set(p.x, p.y + .45 * u + CR * .6, p.z + .3 * u), 10, clamp01(u * 1.6 - Math.max(0, n) * .22) * glide(w, .45, .9), .03);
        });
      },
      anchor: function (out) { out.pos.copy(last.p); out.quat.identity(); out.s = last.s; },
      tags: function () {
        /* the chosen name stands above the wall, not over a cube (fix 59) */
        var list = [{ id: 'name', p: V(O.x - 2 * SP - CU * .5, O.y + SP + .7 + CU * .9, O.z), on: true }];
        CAPS.forEach(function (cp, i) { var p = capCell(i, V(0, 0, 0)); list.push({ id: 'cap-' + cp.id, p: V(p.x, p.y - .42, p.z + .3), on: fk.v[i] > .6 }); });
        return list;
      }
    });
  })();

  /* ---------- measured: one column per capability, one cube per checked case, tallest first ---------- */
  (function () {
    var C = window.DEFXN_CAPABILITIES;
    if (!C) return;
    var CAPS = C.capabilities, n = CAPS.length, CUBE = .3, PITCH = .35, DEEP = 3, GAPX = .6;
    /* rank by checked cases, so the columns compare at a glance (fix 68) */
    var rank = CAPS.map(function (c, i) { return i; }).sort(function (a, b) { return CAPS[b].count - CAPS[a].count || a - b; }), rankOf = [];
    rank.forEach(function (ci, r) { rankOf[ci] = r; });
    var O = HUB.c.clone().add(V(11.5, 9.5, -1)), owner = [], layer = [], depth = [], tops = [];
    CAPS.forEach(function (c, ci) { for (var q = 0; q < c.count; q++) { owner.push(ci); layer.push(Math.floor(q / DEEP)); depth.push(q % DEEP); } tops[ci] = Math.ceil(c.count / DEEP); });
    var blocks = k.blockSet(owner.length, k.bevel(1, 1, 1));
    /* a dark plate under the columns (fix 69) */
    var plate = new THREE.Mesh(k.bevel(n * GAPX + .5, .12, DEEP * PITCH + .5), new THREE.MeshPhysicalMaterial({ roughness: .7, clearcoat: .1, map: k.panelMap }));   /* at its true size: the bevel rule */
    plate.receiveShadow = true; plate.visible = false; k.scene.add(plate);
    k.onPaint(function () { plate.material.color.copy(k.mix('canvas', 'other', .3)); });
    var sel = 0, arrived = 0, built = false, live = 0, hoverCol = -1, f = follower(n), fh = follower(n), back = W.tween(0);
    blocks.liftable = blocks.pickable = function () { return live > .9; };
    blocks.onPick = function (i) { pickHook('capability', CAPS[owner[i]].id); };
    /* a column under the pointer lifts whole, and says its name and count (fix 70) */
    blocks.onHover = function (i) { hoverCol = i >= 0 ? owner[i] : -1; k.wake(600); };
    blocks.label = function (i) { var c = CAPS[owner[i]]; return { name: c.id.charAt(0).toUpperCase() + c.id.slice(1) + ' · ' + c.count + ' checked cases', act: owner[i] === sel ? 'Chosen' : 'Choose' }; };
    function colX(ci) { return O.x + (rankOf[ci] - (n - 1) / 2) * GAPX; }
    var TEN = 10 / DEEP * PITCH;
    S.stage({
      name: 'measured', aims: true,
      /* the camera leans toward the chosen column (fix 71) */
      target: function (fr, asp) { return { aim: O.clone().add(V((colX(sel) - O.x) * .18, 1.35, 0)), dist: W.fit(n * GAPX + 1.4, 5, asp, .9), elev: 12, yaw: -9, tilt: 1.2, n: 1.35 }; },
      set: function (state, w) {
        var i = CAPS.findIndex(function (c) { return c.id === state.c; }); sel = i < 0 ? 0 : i;
        /* the columns build on the first visit; on a return they stand (fix 74) */
        if (w < .05 && !built) { arrived = -1; built = true; }   /* -1: build once the camera is nearly there */
        back.go(state.tab === 'runs' ? 1 : 0, 700, performance.now());
        k.wake(w < .05 ? 3200 : 900); k.moved(w < .05 ? 3200 : 900);
      },
      pose: function (w, ms, now) {
        live = w; blocks.show(w > .001); plate.visible = w > .001;
        if (w <= .001) return;
        if (arrived < 0 && w > .7) { arrived = now; k.wake(2600); k.moved(2600); }
        f.step(now, function (ci) { return ci === sel ? 1 : 0; });
        fh.step(now, function (ci) { return ci === hoverCol ? 1 : 0; });
        /* the Runs tab: the columns step back, smaller and darker (fix 72) */
        var bk = back.get(now), shrink = lerp(1, .85, bk), leave = glide(w, 0, .65);
        var span = n * GAPX + .5;
        plate.position.set(O.x, O.y - .26, O.z); plate.scale.setScalar(Math.max(1e-4, shrink * leave)); plate.updateMatrix();
        for (var i = 0; i < owner.length; i++) {
          var ci = owner[i], a = k.reduced ? 1 : arrived < 0 ? 0 : clamp01((now - arrived - rankOf[ci] * 45 - layer[i] * 38) / 420);
          /* leaving, the columns sink into the plate, tops first, and the cubes go only at the end */
          var s = CUBE * (a <= 0 ? 1e-4 : ease.back(a)) * glide(w, 0, .3) * shrink, lift = (.2 * f.v[ci] + .25 * fh.v[ci]) * (1 - bk);
          blocks.place(i, compose(O.x + (colX(ci) - O.x) * shrink, O.y + (layer[i] * PITCH + lift) * shrink * glide(w, 0, .7) + (1 - ease.out(a)) * .9, O.z + (depth[i] - 1) * PITCH * shrink, 0, s));
          blocks.tint(i, col.copy(quiet).lerp(teal, f.v[ci]).lerp(k.C.canvas, .65 * bk));
        }
        /* one faint line at 10 cases */
        if (bk < .5) W.dots.line(T1.set(O.x - span / 2 * shrink, O.y + TEN * shrink, O.z - PITCH * 1.6), T2.set(O.x + span / 2 * shrink, O.y + TEN * shrink, O.z - PITCH * 1.6), 46, glide(w, .5, 1) * (1 - bk * 2), .016);
      },
      anchor: function (out) { out.pos.set(colX(sel), O.y + tops[sel] * PITCH, O.z); out.quat.identity(); out.s = .6; },
      tags: function () {
        var bk = back.to;
        return [{ id: 'col', p: V(colX(sel), O.y + (tops[sel] * PITCH + .2) + .5, O.z), on: !bk },
          { id: 'ten', p: V(O.x - (n * GAPX + .5) / 2, O.y + TEN, O.z - PITCH * 1.6), on: !bk }];
      }
    });
  })();

  /* ---------- FXN: the starting supply round the mark, one tile per 1% ---------- */
  (function () {
    var D = window.DEFXN_FXN;
    if (!D) return;
    var FR = HUB.R * .98, FY = HUB.t * 3.6 + .4, mark = W.mark, MARK_Y = mark.position.y;
    /* two layouts of the same 100 tiles: the supply by part, and the fee split; tile i keeps its
       place in the order, so switching layouts moves every tile to its new place */
    function layout(parts, gapPart, gapGroup) {
      var slots = [], partOf = [], groupAt = {}, partAt = {}, at = 0;
      parts.forEach(function (p, pi) {
        if (pi) at += p.group !== parts[pi - 1].group ? gapGroup : gapPart;
        var first = at;
        for (var q = 0; q < p.pct; q++) { slots.push(at++); partOf.push(p.id); }
        (groupAt[p.group] = groupAt[p.group] || []).push(first, at - 1);
        partAt[p.id] = [first, at - 1];
      });
      var total = at + gapGroup;
      function ang(a) { return -Math.PI / 2 - (a + .5) / total * TAU; }
      function mid(a) { return -Math.PI / 2 - ((Math.min.apply(null, a) + Math.max.apply(null, a) + 1) / 2) / total * TAU; }
      return { ang: slots.map(ang), part: partOf,
        mid: Object.keys(groupAt).reduce(function (o, g) { o[g] = mid(groupAt[g]); return o; }, {}),
        pmid: Object.keys(partAt).reduce(function (o, g) { o[g] = mid(partAt[g]); return o; }, {}) };
    }
    var supplyParts = [], pct = {};
    D.groups.forEach(function (g) { g.parts.forEach(function (p) { supplyParts.push({ id: p.id, pct: p.pct, group: g.id }); pct[p.id] = p.pct; }); });
    D.fees.parts.forEach(function (p) { pct[p.id] = p.pct; });
    var feeParts = D.fees.parts.map(function (p) { return { id: p.id, pct: p.pct, group: p.id }; });
    var LS = layout(supplyParts, 1, 3), LF = layout(feeParts, 1, 4);
    var TW = TAU * FR / 118, tiles = k.blockSet(100, k.bevel(TW * .82, .62, .14));   /* a supply tile at its true size: the bevel rule */
    var tab = W.tween(0), sel = 'mining', live = 0, arrived = 0, f = follower(100);
    tiles.liftable = tiles.pickable = function () { return live > .9; };
    tiles.onPick = function (i) { pickHook('fxn', tab.to > .5 ? LF.part[i] : LS.part[i]); };
    var NAMES = {}; D.groups.forEach(function (g) { g.parts.forEach(function (p) { NAMES[p.id] = p.name; }); }); D.fees.parts.forEach(function (p) { NAMES[p.id] = p.id === 'fund' ? 'Network fund' : 'Computers'; });
    tiles.label = function (i) { var id = tab.to > .5 ? LF.part[i] : LS.part[i]; return { name: NAMES[id] + ' · ' + pct[id] + '%', act: 'Choose' }; };
    S.stage({
      name: 'fxn',
      target: function (fr, asp) { return { aim: HUB.c.clone().add(V(0, FY * .95, 0)), dist: W.fit(FR * 2 + 2.4, FR * 2 * Math.sin(40 * W.D2R) + 3, asp, .88), elev: 40, yaw: 0, tilt: 1.2, n: 1.35 }; },
      set: function (state, w) {
        sel = state.g || 'mining';
        var fees = state.tab === 'fees' ? 1 : 0;
        if (w < .05) { tab.snap(fees); arrived = -1; } else if (fees !== tab.to) tab.go(fees, 1300, performance.now());
        k.wake(w < .05 ? 2600 : 1400); k.moved(w < .05 ? 2600 : 1400);
      },
      pose: function (w, ms, now) {
        live = w; tiles.show(w > .001);
        /* the mark rises out of the hub into the middle of its supply; the hub ring sinks away under it (fix 80) */
        mark.position.y = lerp(MARK_Y, FY + .3, ease.inOut(clamp01(w)));
        W.hubSink = HUB.t * 1.6 * ease.inOut(clamp01(w));
        if (w <= .001) return;
        if (arrived < 0 && w > .7) { arrived = now; k.wake(1400); k.moved(1400); }
        var ft = tab.get(now), part = function (i) { return ft > .5 ? LF.part[i] : LS.part[i]; };
        f.step(now, function (i) { return part(i) === sel ? 1 : 0; });
        for (var i = 0; i < 100; i++) {
          var th = lerp(LS.ang[i], LF.ang[i], ft), r = FR + Math.sin(Math.PI * ft) * .6, u = f.v[i];
          /* the tiles rise in one clockwise sweep, 600 ms in all (fix 79) */
          var a = k.reduced ? 1 : arrived < 0 ? 0 : clamp01((now - arrived - (99 - i) * 6) / 380), rise = (a <= 0 ? 1e-4 : ease.back(a)) * glide(w, 0, .5);
          var y = lerp(MARK_Y, FY, ease.out(a)) + u * .42;
          tiles.place(i, M.compose(P.set(HUB.c.x + Math.cos(th) * r, y, HUB.c.z + Math.sin(th) * r),
            Q.setFromEuler(E.set(0, Math.PI / 2 - th, 0)), SC.set(rise, rise, rise)));
          tiles.tint(i, col.copy(quiet).lerp(teal, u));
        }
      },
      anchor: function (out) { out.pos.copy(mark.position); out.pos.y -= (LIFT + .5) * HUB.R * .4; out.quat.identity(); out.s = HUB.R * .4; },
      tags: function () {
        var now = performance.now(), ft = tab.get(now), settled = Math.abs(ft - tab.to) < .01, out = [];
        /* a label on the side of the page moves inside the ring, away from the page (fix 77) */
        function at(a, id, on, lift) {
          var inner = Math.cos(a) > .25, rr = inner ? FR * .55 : FR + 1.7;
          out.push({ id: id, p: V(HUB.c.x + Math.cos(a) * rr, FY + (lift || .2), HUB.c.z + Math.sin(a) * rr), on: on });
        }
        /* fee labels show once the tiles have settled (fix 81) */
        D.groups.forEach(function (g) { at(LS.mid[g.id], 'g-' + g.id, ft < .5 && settled); });
        D.fees.parts.forEach(function (p) { at(LF.mid[p.id], 'g-' + p.id, ft >= .5 && settled); });
        /* the chosen part on its arc (fix 78) */
        var L = ft > .5 ? LF : LS;
        /* only where a group has more than one part: elsewhere the group's own label already names it */
        var many = D.groups.some(function (g) { return g.parts.length > 1 && g.parts.some(function (p) { return p.id === sel; }); });
        var pa = L.pmid[sel], pr = pa != null && Math.cos(pa) > .25 ? FR * .55 : FR;
        if (pa != null) out.push({ id: 'part', p: V(HUB.c.x + Math.cos(pa) * pr, FY + .9, HUB.c.z + Math.sin(pa) * pr), on: settled && ft < .5 && many });
        return out;
      }
    });
  })();
})();

/* DEFXN mockup app: the 3D of the identity flow's own steps (idstart, idsign, idsafe, idyou, idvalue).

   Owner, with the identity board (2026-10-23): "when you click Create your identity it leads to
   this: 1, 2, 3, the entire UX." The flow is nine steps (identity-flow.js); steps 1 to 4 are one row
   in space, 14 apart, high over the network and ending right over your ring, so Next is a pan to
   the right and step 5 (your chain) is a drop straight down into the ring (MOTION-SPEC.md). Step 9
   is the network seen whole from above.

   One material language with every other stage: graphite structure, slate for resolvers, bone for
   records, teal only for the key and what it signs, honey (the brief's Partial) as a dashed line,
   never as done. Every form is built at its true size and scaled evenly (the bevel rule, ring-kit.js).
   Nothing here shows a number or a live state: the only words are the brief's, the key file's name
   and the sample identity of identity-sample.js, which says it is a sample. */
(function () {
  'use strict';
  var S = window.DEFXNScene;
  if (!S || !S.ok || !S.world) return;
  var W = S.world, k = W.k, THREE = W.THREE, V = W.V, ease = W.ease, clamp01 = ease.clamp01, win = W.win, N = W.N;
  var grow = W.grow, num = W.num, anchorAt = W.anchorAt, follower = W.follower;
  var LIFT = k.LIFT, TAU = Math.PI * 2, PI = Math.PI;
  var I = window.DEFXN_IDENTITY || { name: '', devices: [] };
  var M = new THREE.Matrix4(), M2 = new THREE.Matrix4(), M3 = new THREE.Matrix4(), T = new THREE.Matrix4(), ZERO = new THREE.Matrix4().makeScale(1e-4, 1e-4, 1e-4);
  var P = new THREE.Vector3(), Q = new THREE.Quaternion(), E = new THREE.Euler(), SC = new THREE.Vector3();

  /* a frame: a place and a turn, no scale; a part is laid in a frame at its own offset, turn and size */
  function frame(x, y, z, rx, ry, out) { Q.setFromEuler(E.set(rx || 0, ry || 0, 0)); return (out || M).compose(P.set(x, y, z), Q, SC.set(1, 1, 1)); }
  function local(F, x, y, z, rx, ry, sx, sy, sz, out) {
    Q.setFromEuler(E.set(rx || 0, ry || 0, 0));
    T.compose(P.set(x, y, z), Q, SC.set(Math.max(1e-4, sx), Math.max(1e-4, sy == null ? sx : sy), Math.max(1e-4, sz == null ? sx : sz)));
    return (out || M2).copy(F).multiply(T);
  }
  function pt(F, x, y, z) { return new THREE.Vector3(x, y, z).applyMatrix4(F); }

  /* ---------- tones ---------- */
  var col = new THREE.Color(), quiet = new THREE.Color(), teal = new THREE.Color(), slate = new THREE.Color(), dark = new THREE.Color(), graphite = new THREE.Color();
  var bone = new THREE.Color(), silver = new THREE.Color(), honey = new THREE.Color(), danger = new THREE.Color(), deep = new THREE.Color();
  function css(name, fb) { var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v ? 'hsl(' + v.split(/\s+/).join(', ') + ')' : fb; }
  function tones() {
    quiet.copy(k.mix('other', 'identity', .35)); teal.copy(k.C.network).lerp(k.C.signal, .35);
    slate.copy(k.C.resolver || k.C.other).lerp(k.C.canvas, .58); dark.copy(k.mix('canvas', 'other', .45)); graphite.copy(k.mix('canvas', 'other', .52));
    bone.copy(k.C.record); silver.copy(k.C.identity); deep.copy(k.mix('canvas', 'network', .3));
    honey.set(css('--state-partial', '#e8b55a')); danger.set(css('--danger', '#d26a5f'));
  }
  k.onPaint(tones); tones();
  function hex(c) { return '#' + c.getHexString(); }
  function mono(g, px, sp, wt) { g.font = (wt || 500) + ' ' + px + 'px "JetBrains Mono", ui-monospace, monospace'; if ('letterSpacing' in g) g.letterSpacing = (sp == null ? 3 : sp) + 'px'; }
  function sans(g, px, wt) { g.font = (wt || 700) + ' ' + px + 'px "Inter Tight", Inter, system-ui, sans-serif'; if ('letterSpacing' in g) g.letterSpacing = '-1px'; }

  /* light that is drawn, not lit: rims, rings, crossed marks (an unlit instanced mesh) */
  function glow(geo, n, tone) {
    var m = k.instanced(geo, new THREE.MeshBasicMaterial({ toneMapped: false }), n, false), WH = new THREE.Color(1, 1, 1);
    m.renderOrder = 5;
    for (var j = 0; j < n; j++) { m.setMatrixAt(j, ZERO); m.setColorAt(j, WH); }
    return { mesh: m, place: function (j, mm) { m.setMatrixAt(j, mm || ZERO); }, tint: function (j, c) { m.setColorAt(j, c); m.instanceColor.needsUpdate = true; }, show: function (on) { m.visible = on; } };
  }
  /* an edge light in another tone than teal (honey for Partial) */
  function edgeIn(n, color, gain) {
    var e = k.edgeLight(n, 'signal', gain);
    e.paint = function () { e.mesh.material.color.copy(color).multiplyScalar(gain); };
    k.onPaint(e.paint); e.paint();
    return e;
  }
  /* what a stage holds, so leaving hides it once and not every frame */
  function parts() {
    var g = { sets: [], plates: [], edges: [], on: true };
    g.set = function (x) { g.sets.push(x); return x; };
    g.plate = function (p) { g.plates.push(p); return p; };
    g.edge = function (e, n) { g.edges.push([e, n]); return e; };
    g.show = function (on) {
      if (on === g.on) return on; g.on = on;
      g.sets.forEach(function (s) { s.show(on); });
      if (!on) { g.plates.forEach(function (p) { p.place(null); }); g.edges.forEach(function (e) { for (var i = 0; i < e[1]; i++) e[0].set(i, M, 0, 0, 0); }); k.redraw(); }
      return on;
    };
    return g;
  }

  /* ---------- shared forms ---------- */
  /* your key file: a card with a contact patch and its name engraved, edged in teal. It is the one
     thing every step shows, so it is one form everywhere. */
  var CW = 1.6, CH = 1.04, CD = .12, chipGeo = k.bevel(CW, CH, CD), padGeo = k.bevel(.17, .12, .03);
  function makeChip(g) {
    var body = g.set(k.blockSet(1, chipGeo)), pads = g.set(k.blockSet(6, padGeo, { shadow: false })), edge = g.edge(k.edgeLight(1, 'signal', 1.9), 1);
    var words = g.plate(k.textPlate(.92, .5, function (c, w, h) { mono(c, 112, 6, 600); c.fillStyle = hex(k.C.strong); c.fillText('.AUTH', 6, h * .45); c.fillText('.FXN', 6, h * .92); }));
    return {
      /* F: the chip's centre, facing +z; s: its size; lit: how much of its edge light is drawn */
      place: function (F, s, lit) {
        body.place(0, local(F, 0, 0, 0, 0, 0, s)); body.tint(0, col.copy(dark).lerp(teal, .14));
        for (var j = 0; j < 6; j++) { pads.place(j, local(F, (-.55 + (j % 2) * .21) * s, (.17 - Math.floor(j / 2) * .17) * s, CD / 2 * s, 0, 0, s)); pads.tint(j, col.copy(silver)); }
        words.place(s > .05 ? local(F, .3 * s, -.02 * s, CD / 2 * s + .006, 0, 0, s, s, 1, M3) : null);
        edge.set(0, local(F, 0, 0, CD / 2 * s + .003, 0, 0, 1, 1, 1, M3), CW * s - .03, CH * s - .03, lit, .016);
      }
    };
  }
  /* your identity: the hex key badge your chain carries, with a lit rim and the person mark */
  function hexShape(r, hole) {
    var s = new THREE.Shape();
    for (var i = 0; i <= 6; i++) { var a = PI / 2 + i * TAU / 6; if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    if (hole) { var h = new THREE.Path(); for (var j = 0; j <= 6; j++) { var b = PI / 2 - j * TAU / 6; if (j) h.lineTo(Math.cos(b) * hole, Math.sin(b) * hole); else h.moveTo(Math.cos(b) * hole, Math.sin(b) * hole); } s.holes.push(h); }
    return s;
  }
  var BR = .8, BD = .2;
  var badgeGeo = new THREE.ExtrudeGeometry(hexShape(BR * .88), { depth: BD * .64, bevelEnabled: true, bevelThickness: BD * .18, bevelSize: BR * .12 * .8, bevelSegments: 4, curveSegments: 1 }).translate(0, 0, -BD * .32);
  var rimGeo = new THREE.ExtrudeGeometry(hexShape(BR * 1.1, BR * 1.03), { depth: .02, bevelEnabled: false, curveSegments: 1 });
  function makeBadge(g) {
    var body = g.set(k.blockSet(1, badgeGeo, { plain: true })), rim = g.set(glow(rimGeo, 1));
    var face = g.plate(k.textPlate(1.1, 1.1, function (c, w, h) {
      c.strokeStyle = hex(k.C.signal); c.lineWidth = 22; c.lineCap = 'round';
      c.beginPath(); c.arc(w / 2, h * .37, w * .12, 0, TAU); c.stroke();
      c.beginPath(); c.moveTo(w * .25, h * .8); c.bezierCurveTo(w * .28, h * .6, w * .38, h * .55, w / 2, h * .55); c.bezierCurveTo(w * .62, h * .55, w * .72, h * .6, w * .75, h * .8); c.stroke();
    }));
    return {
      place: function (F, s, lit) {
        body.place(0, local(F, 0, 0, 0, 0, 0, s)); body.tint(0, col.copy(dark).lerp(teal, .12));
        rim.place(0, lit > .01 ? local(F, 0, 0, -.01 * s, 0, 0, s * (.9 + .1 * lit)) : null); rim.tint(0, col.copy(k.C.signal).multiplyScalar(1.9 * lit));
        face.place(s > .05 ? local(F, 0, 0, BD * .5 * s + .01, 0, 0, s, s, 1, M3) : null);
      }
    };
  }
  /* the brief's own words for a request to sign (section 8), as in the identity page */
  function requestPlate(g) {
    return g.plate(k.textPlate(2.25, 1.38, function (c, w, h) {
      c.fillStyle = 'rgba(232,228,218,.96)'; c.fillRect(0, 0, w, h);
      mono(c, 22); c.fillStyle = '#3d4743'; c.fillText('AN APP ASKS YOU TO SIGN', 30, 50);
      c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(30, 70, w - 60, 2);
      sans(c, 34, 600); c.fillStyle = '#121a17'; ['What will be signed', 'For which network', 'For how long'].forEach(function (l, i) { c.fillText(l, 30, 128 + i * 52); });
    }));
  }

  /* the broker's first question (js/broker/broker.js): a site asks who you are, and you choose */
  function sharePlate(g) {
    return g.plate(k.textPlate(2.25, 1.38, function (c, w, h) {
      c.fillStyle = 'rgba(232,228,218,.96)'; c.fillRect(0, 0, w, h);
      mono(c, 22); c.fillStyle = '#3d4743'; c.fillText('A SITE ASKS WHO YOU ARE', 30, 50);
      c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(30, 70, w - 60, 2);
      sans(c, 34, 600); c.fillStyle = '#121a17'; c.fillText('Share your identity?', 30, 128);
      var bw = (w - 84) / 2, by = h - 112;
      c.fillStyle = '#121a17'; c.fillRect(30, by, bw, 66); c.strokeStyle = '#121a17'; c.lineWidth = 3; c.strokeRect(54 + bw, by + 1.5, bw, 63);
      sans(c, 30, 600); c.fillStyle = 'rgba(232,228,218,.96)'; c.fillText('Share', 54, by + 44); c.fillStyle = '#121a17'; c.fillText('Don’t share', 78 + bw, by + 44);
    }));
  }

  /* steps 1 to 4: a row in space, 14 apart, the last one right over your ring */
  var MY = W.ringList[N.MINE].c;
  function ROW(i) { return V(MY.x + (i - 3) * 14, 16, MY.z); }
  var D2R = Math.PI / 180;

  /* ---------- 1 your FXN ID: one key, everything round it ---------- */
  (function () {
    var O = ROW(0), g = parts(), chip = makeChip(g), intro = W.tween(1), RN = 28, RR = 2.3, Z = 1.25;
    var ring = g.set(k.blockSet(RN, k.bevel(.38, .34, .1), { shadow: false }));
    var appLines = g.plate(k.textPlate(1.1, .55, function (c, w, h) { c.fillStyle = 'rgba(255,255,255,.16)'; [0, 1, 2].forEach(function (i) { c.fillRect(24, 34 + i * 52, (w - 48) * [1, .8, .55][i], 16); }); }));
    var app = g.set(k.blockSet(1, k.bevel(1.25, .84, .08))), appBar = g.set(k.blockSet(1, k.bevel(1.21, .15, .05), { shadow: false }));
    var mini = g.set(k.blockSet(9, k.bevel(.2, .24, .06), { shadow: false })), cube = g.set(k.blockSet(1, k.bevel(.66, .66, .66)));
    var prod = g.set(k.blockSet(3, k.bevel(.34, .42, .08), { shadow: false }));
    var SP = [V(-3.7, 1.4, -.2), V(3.7, 1.4, -.2), V(-3.6, -1.15, .7), V(3.6, -1.15, .7)].map(function (p) { return p.add(O); });   /* apps, chains, resolvers, products */
    var IDS = ['apps', 'chains', 'resolvers', 'products'], CC = O.clone().add(V(0, .3, 0));
    S.stage({
      name: 'idstart',
      target: function (f, asp) { return { aim: O.clone().add(V(0, .15, 0)), dist: W.fit(10, 5.4, asp, .9), elev: 12, yaw: 0, tilt: 1.2, n: 1.4 }; },
      set: function (st, w) { if (w < .05) { intro.snap(0); intro.go(1, 1500, performance.now(), 700); } k.wake(900); },
      pose: function (w) {
        if (!g.show(w > .001)) return;
        var i = intro.get(performance.now()), g0 = grow(w, 0, .5);
        /* the key file stands in the middle; its edge light draws round it as it arrives */
        chip.place(frame(CC.x, CC.y, CC.z, -.06, 0), 1.4 * g0, win(i, 0, .35));
        /* its ring: the one key's own chain, built round it tile by tile */
        for (var r = 0; r < RN; r++) {
          var a = PI / 2 + r / RN * TAU, gr = grow(i, .08 + r * .01, .3 + r * .01) * g0;
          ring.place(r, local(frame(O.x + Math.cos(a) * RR, O.y - 1.05, O.z + Math.sin(a) * RR * .8, 0, PI / 2 - a), 0, 0, 0, 0, 0, gr));
          ring.tint(r, col.copy(graphite).lerp(bone, .16 + .14 * Math.max(0, Math.sin(a))));
        }
        /* what it opens, each at its own point; a dotted line runs out to each in turn */
        var q = [0, 1, 2, 3].map(function (n) { return Z * grow(i, .55 + n * .07, .85 + n * .07) * g0; });
        app.place(0, local(frame(SP[0].x, SP[0].y, SP[0].z, 0, .28), 0, 0, 0, 0, 0, q[0])); app.tint(0, graphite);
        appBar.place(0, local(frame(SP[0].x, SP[0].y, SP[0].z, 0, .28), 0, .32 * q[0], .045 * q[0], 0, 0, q[0])); appBar.tint(0, dark);
        appLines.place(q[0] > .05 ? local(frame(SP[0].x, SP[0].y, SP[0].z, 0, .28), 0, -.06 * q[0], .045 * q[0], 0, 0, q[0], q[0], 1, M3) : null);
        for (var m = 0; m < 9; m++) { var b = PI / 2 + m / 9 * TAU; mini.place(m, local(frame(SP[1].x + Math.cos(b) * .5 * q[1], SP[1].y, SP[1].z + Math.sin(b) * .36 * q[1], 0, PI / 2 - b), 0, 0, 0, 0, 0, q[1])); mini.tint(m, col.copy(graphite).lerp(bone, .6)); }
        cube.place(0, local(frame(SP[2].x, SP[2].y, SP[2].z, 0, .55), 0, 0, 0, 0, 0, q[2])); cube.tint(0, col.copy(slate).multiplyScalar(1.35));
        for (var p = 0; p < 3; p++) { prod.place(p, local(frame(SP[3].x + (p - 1) * .44 * q[3], SP[3].y, SP[3].z, 0, -.2), 0, 0, 0, 0, 0, q[3])); prod.tint(p, col.copy(graphite).lerp(bone, .1 + .3 * p)); }
        SP.forEach(function (s, n) {
          var from = V(CC.x + Math.sign(s.x) * CW * .68, CC.y + (s.y > CC.y ? .25 : -.25), CC.z), to = V(s.x - Math.sign(s.x) * .95, s.y, s.z);
          W.dots.line(from, to, 13, win(i, .4 + n * .07, .7 + n * .07) * win(w, .5, .9), .028);   /* lines leave with the stage */
        });
      },
      anchor: function (out) { anchorAt(out, CC.x, CC.y, CC.z, 1.2); },
      tags: function () {
        var i = intro.get(performance.now());
        return [{ id: 'key', p: CC.clone().add(V(-.95, .85, 0)), on: i > .3 }].concat(SP.map(function (s, n) { return { id: IDS[n], p: s.clone().add(V(-.6, .62, 0)), on: i > .85 + n * .07 }; }));
      }
    });
  })();

  /* ---------- 2 signing in: an app asks, you approve on your device, the server checks ---------- */
  (function () {
    var O = ROW(1), g = parts(), chip = makeChip(g), st = W.tween(1), sel = 1, X = [-3.75, 0, 3.75];
    var win3 = g.set(k.blockSet(1, k.bevel(2.5, 1.72, .1))), bar = g.set(k.blockSet(1, k.bevel(2.46, .2, .06), { shadow: false })), req = requestPlate(g), ask = sharePlate(g);
    var pad = g.set(k.blockSet(1, k.bevel(2.4, .12, 1.6))), rack = g.set(k.blockSet(3, k.bevel(1.5, .44, 1.1)));
    var lights = g.set(glow(new THREE.SphereGeometry(1, 10, 8), 6)), print = g.set(glow(new THREE.TorusGeometry(1, .018, 6, 72, TAU * .8).rotateX(PI / 2), 5));
    var cross = g.set(glow(new THREE.TorusGeometry(.3, .03, 6, 40), 1)), crossBar = g.set(glow(new THREE.BoxGeometry(.46, .055, .03), 2));
    var edges = g.edge(k.edgeLight(2, 'signal', 1.5), 2);
    var BW = O.clone().add(V(X[0], .3, 0)), PAD = O.clone().add(V(X[1], -1.1, .3)), CHIP = PAD.clone().add(V(0, .06 + CH * .5, -.2)), SRV = O.clone().add(V(X[2], -1.05, 0)), XM = O.clone().add(V(X[2] + 1.2, -.55, .55));
    function at(t, i) { return clamp01(1 - Math.abs(t - (i + 1))); }
    S.stage({
      name: 'idsign', aims: true,
      target: function (f, asp) { return { aim: O.clone().add(V(X[sel - 1] * .1, -.3, 0)), dist: W.fit(10.6, 4.8, asp, .9), elev: 11, yaw: 0, tilt: 1.2, n: 1.4 }; },
      set: function (s, w) { sel = num(s.s, 1, 3); if (w < .05) st.snap(sel - 1); st.go(sel, 700 + 400 * Math.abs(sel - st.to), performance.now(), w < .05 ? 800 : 0); },
      pose: function (w) {
        if (!g.show(w > .001)) return;
        var t = st.get(performance.now()), g0 = grow(w, 0, .55);
        /* 1 the browser asks: its window, its bar, the brief's three questions; lit while it is the step */
        var FB = frame(BW.x, BW.y, BW.z, 0, .24, M3.clone());
        win3.place(0, local(FB, 0, 0, 0, 0, 0, g0)); win3.tint(0, graphite);
        bar.place(0, local(FB, 0, .74 * g0, .03 * g0, 0, 0, g0)); bar.tint(0, dark);
        /* step 1 shows the share question; on to step 2 the card turns over to the signing request (a turn, never a swap) */
        var fl = ease.out(clamp01((t - 1.2) / .55)), fa = fl < .5 ? fl * 2 : (fl - .5) * 2;
        ask.place(g0 > .05 && fl < .5 ? local(FB, 0, -.1 * g0, .056 * g0 + .004, fa * PI / 2, 0, g0, g0, 1) : null);
        req.place(g0 > .05 && fl >= .5 ? local(FB, 0, -.1 * g0, .056 * g0 + .004, -(1 - fa) * PI / 2, 0, g0, g0, 1) : null);
        edges.set(0, local(FB, 0, 0, .053, 0, 0, 1, 1, 1), 2.5 * g0, 1.72 * g0, win(t, .3, 1), .008 + .01 * at(t, 0));   /* thicker while it is the step */
        /* 2 your device: the key stands on it; a ring like a fingerprint lights as you approve */
        pad.place(0, local(frame(PAD.x, PAD.y, PAD.z, 0, 0), 0, 0, 0, 0, 0, g0)); pad.tint(0, graphite);
        chip.place(frame(CHIP.x, CHIP.y, CHIP.z, 0, 0), g0, .35 + .65 * Math.max(at(t, 1), win(t, 2, 2.6)));
        var ok = 1 - .45 * win(t, 2.2, 3);
        for (var r = 0; r < 5; r++) {
          var l = win(t, 1.25 + r * .1, 1.75 + r * .1) * ok, rr = .62 + r * .16;
          print.place(r, l > .01 ? local(frame(PAD.x, PAD.y + .065, PAD.z, 0, [.3, 2.1, 4, 1.2, 5.2][r]), 0, 0, 0, 0, 0, rr * g0, 1, rr * .62 * g0) : null);
          print.tint(r, col.copy(k.C.signal).multiplyScalar(.25 + 1.5 * l));
        }
        /* 3 the server: it checks the signature, its lights turn teal; the crossed mark: it never holds the key */
        var chk = win(t, 2.45, 3);
        for (var s = 0; s < 3; s++) {
          var FS = frame(SRV.x, SRV.y + s * .5, SRV.z, 0, -.24, M3.clone());
          rack.place(s, local(FS, 0, 0, 0, 0, 0, g0)); rack.tint(s, col.copy(dark).lerp(graphite, .5 + .2 * s));
          for (var d = 0; d < 2; d++) { lights.place(s * 2 + d, local(FS, (-.52 + d * .18) * g0, 0, .56 * g0, 0, 0, .045 * g0)); lights.tint(s * 2 + d, col.copy(chk > .5 ? k.C.signal : k.C.muted).multiplyScalar(chk > .5 ? .6 + 1.2 * chk : .5)); }
        }
        edges.set(1, local(frame(SRV.x, SRV.y + 1, SRV.z, 0, -.24), 0, 0, .556, 0, 0, 1, 1, 1), 1.5 * g0, .44 * g0, chk, .012);   /* the slab that checked it */
        var xg = grow(t, 2.3, 2.9) * g0;
        cross.place(0, xg > .01 ? local(frame(XM.x, XM.y, XM.z, 0, -.24), 0, 0, 0, 0, 0, xg) : null); cross.tint(0, col.copy(danger).multiplyScalar(1.3));
        for (var c = 0; c < 2; c++) { crossBar.place(c, xg > .01 ? local(frame(XM.x, XM.y, XM.z, 0, -.24), 0, 0, 0, 0, 0, xg).multiply(T.makeRotationZ(c ? PI / 4 : -PI / 4)) : null); crossBar.tint(c, col.copy(danger).multiplyScalar(1.3)); }
        /* the path: the request runs 1 to 2 (dotted), the signature 2 to 3 (lit); the key never travels */
        var lw = win(w, .5, .9);   /* lines leave with the stage */
        W.dots.line(pt(FB, 1.32, -.25, .1), V(CHIP.x - CW * .58, CHIP.y, CHIP.z), 14, win(t, 1, 1.7) * lw, .03);
        W.lit.line(V(CHIP.x + CW * .58, CHIP.y, CHIP.z), V(SRV.x - .85, SRV.y + .55, SRV.z + .4), 14, win(t, 2, 2.6) * lw, .03);
      },
      anchor: function (out) { anchorAt(out, CHIP.x, CHIP.y, CHIP.z, 1.1); },
      tags: function () {
        return [{ id: 'request', p: BW.clone().add(V(-1.2, 1.15, 0)), on: true }, { id: 'key', p: CHIP.clone().add(V(-.8, .72, 0)), on: true },
          { id: 'server', p: SRV.clone().add(V(-.75, 1.42, 0)), on: true }];
      }
    });
  })();

  /* ---------- 3 security: the key inside a glass vault; each safeguard is one face of it ---------- */
  (function () {
    var O = ROW(2), g = parts(), chip = makeChip(g), sel = 0, f = follower(3, 170), intro = W.tween(1), VS = 2.7, YAW = -.65, H = VS / 2;
    var plinth = g.set(k.blockSet(1, k.bevel(3.9, .22, 3.9))), vault = g.set(k.blockSet(1, k.bevel(VS, VS, VS), { plain: true, shadow: false }));
    vault.mesh.material.transparent = true; vault.mesh.material.opacity = .3; vault.mesh.material.depthWrite = false; vault.mesh.renderOrder = 3;
    var solid = g.edge(k.edgeLight(1, 'signal', 1.7), 1), dashes = g.edge(edgeIn(10, honey, 1.25), 10);
    /* built: a solid teal edge. Partial (the brief's state): a dashed honey edge, half lit, never solid */
    var STATE = ['built', 'partial', 'partial'];
    function icon(n) {
      return g.plate(k.textPlate(VS * .9, VS * .9, function (c, w, h) {
        var tone = hex(n === 0 ? k.C.signal : honey), x = w * (n === 1 ? .8 : .2), y = h * .2, s = w * .13;   /* in the corner away from the key */
        var gr = c.createRadialGradient(x, y, 0, x, y, w * .9); gr.addColorStop(0, n === 0 ? 'rgba(63,209,168,.18)' : 'rgba(232,181,90,.16)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = gr; c.fillRect(0, 0, w, h);
        c.strokeStyle = tone; c.lineWidth = 9; c.lineJoin = 'round'; c.lineCap = 'round';
        if (n === 0) { c.strokeRect(x - s, y - s * .7, s * 2, s * 1.3); c.beginPath(); c.moveTo(x - s * 1.4, y + s * .85); c.lineTo(x + s * 1.4, y + s * .85); c.stroke(); }   /* a device */
        else if (n === 1) { c.strokeRect(x - s * .8, y - s * .1, s * 1.6, s * 1.1); c.beginPath(); c.arc(x, y - s * .1, s * .55, PI, 0); c.stroke(); }   /* a lock */
        else { c.beginPath(); c.arc(x - s * .7, y, s * .38, 0, TAU); c.moveTo(x - s * .3, y); c.lineTo(x + s * .25, y); c.moveTo(x + s * .05, y - s * .25); c.lineTo(x + s * .3, y); c.lineTo(x + s * .05, y + s * .25); c.stroke(); c.beginPath(); c.arc(x + s * .78, y, s * .38, 0, TAU); c.stroke(); }   /* one key hands over to a new one */
      }));
    }
    var icons = [icon(0), icon(1), icon(2)];
    var FV = frame(O.x, O.y, O.z, 0, YAW, new THREE.Matrix4());
    /* each face's own frame: centre on the face, facing out (front, right, top of the turned vault) */
    var FACE = [local(FV, 0, 0, H, 0, 0, 1, 1, 1, new THREE.Matrix4()), local(FV, H, 0, 0, 0, PI / 2, 1, 1, 1, new THREE.Matrix4()), local(FV, 0, H, 0, -PI / 2, 0, 1, 1, 1, new THREE.Matrix4())];
    var ROTZ = new THREE.Matrix4().makeRotationZ(PI / 2), FD = new THREE.Matrix4();
    function dashed(slot, F, u, amt) {
      var L = VS * .94, n = 5, len = L / n * (.36 + .26 * u) * amt, th = .012 + .012 * u, q = 0;
      for (var side = 0; side < 4; side++) {
        var vert = side > 1, m = vert ? FD.copy(F).multiply(ROTZ) : F, off = (side % 2 ? -1 : 1) * L / 2;
        for (var d = 0; d < n; d++, q++) { var x = -L / 2 + (d + .5) * L / n; dashes.bar(slot + Math.floor(q / 4), q % 4, m, x, vert ? -off : off, len, th); }
      }
    }
    S.stage({
      name: 'idsafe',
      target: function (fr, asp) { return { aim: O.clone().add(V(0, -.25, 0)), dist: W.fit(8.4, 5.6, asp, .9), elev: 17, yaw: 0, tilt: 1.2, n: 1.4 }; },
      set: function (st, w) { sel = num(st.s, 0, 2); if (w < .05) { intro.snap(0); intro.go(1, 1300, performance.now(), 700); } k.wake(900); },
      pose: function (w, ms, now) {
        if (!g.show(w > .001)) return;
        f.step(now, function (i) { return i === sel ? 1 : 0; });
        var i = intro.get(now), g0 = grow(w, 0, .55);
        plinth.place(0, local(FV, 0, -H - .2, 0, 0, 0, g0)); plinth.tint(0, graphite);
        /* the key sits inside, facing you */
        chip.place(frame(O.x, O.y - .1, O.z, 0, 0), .95 * g0, win(i, .1, .45));
        /* the vault closes round it */
        var vg = grow(i, .2, .7) * g0;
        vault.place(0, local(FV, 0, 0, 0, 0, 0, vg)); vault.tint(0, col.copy(deep).lerp(f.v[0] > .5 ? teal : honey, .12 * Math.max(f.v[0], f.v[1], f.v[2])));
        var lit = win(i, .55, 1);
        for (var n = 0; n < 3; n++) {
          var u = f.v[n], F = local(FACE[n], 0, 0, .006, 0, 0, 1, 1, 1, M3);
          icons[n].place(lit > .02 ? local(FACE[n], 0, 0, .012, 0, 0, vg, vg, 1) : null);
          icons[n].mesh.material.opacity = lit * (.3 + .7 * u);
          if (STATE[n] === 'built') solid.set(0, F, VS * .94 * vg, VS * .94 * vg, lit, .012 + .014 * u);
          else dashed(n === 1 ? 0 : 5, F, u, lit * vg);
        }
      },
      anchor: function (out) { anchorAt(out, O.x, O.y, O.z, 1.6); },
      tags: function () {
        return [pt(FACE[0], -H * .95, H * .95, 0), pt(FACE[1], H * .95, 0, 0), pt(FACE[2], 0, H * .95, .2)].map(function (p, n) { return { id: 'facet-' + n, p: p, on: intro.get(performance.now()) > .6 }; });
      }
    });
  })();

  /* ---------- 4 your identity: the badge, its name, the two devices it is bound to ---------- */
  (function () {
    var O = ROW(3), g = parts(), badge = makeBadge(g), intro = W.tween(1);
    var nameSlab = g.set(k.blockSet(1, k.bevel(2.4, .62, .08))), deck = g.set(k.blockSet(1, k.bevel(2.3, .09, 1.5))), lid = g.set(k.blockSet(1, k.bevel(2.2, 1.38, .07)));
    var phone = g.set(k.blockSet(1, k.bevel(.8, 1.6, .09))), edges = g.edge(k.edgeLight(2, 'signal', 1.5), 2);
    var nameWords = g.plate(k.textPlate(2.3, .56, function (c, w, h) {
      sans(c, 92); c.fillStyle = hex(k.C.strong); c.fillText(I.name, 26, h * .7);
      mono(c, 30, 5, 600); c.fillStyle = hex(k.C.muted); var sw = c.measureText('SAMPLE').width; c.fillText('SAMPLE', w - sw - 26, h * .64);
    }));
    function screen(w, h) {
      return g.plate(k.textPlate(w, h, function (c, cw, ch) {
        c.fillStyle = 'rgba(8,16,14,.94)'; c.fillRect(0, 0, cw, ch);
        var x = cw / 2, y = ch * .42, r = Math.min(cw, ch) * .14;
        c.strokeStyle = hex(k.C.signal); c.lineWidth = 6; c.beginPath();
        for (var i = 0; i <= 6; i++) { var a = PI / 2 + i * TAU / 6; if (i) c.lineTo(x + Math.cos(a) * r, y - Math.sin(a) * r); else c.moveTo(x + Math.cos(a) * r, y - Math.sin(a) * r); }
        c.stroke(); mono(c, Math.round(cw * .065), 2); c.fillStyle = hex(k.C.muted); var tw = c.measureText(I.name).width; c.fillText(I.name, x - tw / 2, y + r + cw * .12);
      }));
    }
    var lidScreen = screen(2.0, 1.2), phoneScreen = screen(.68, 1.38);
    var BG = O.clone().add(V(0, 1.15, 0)), NM = O.clone().add(V(0, -.42, .1));
    var FL = frame(O.x - 3.55, O.y - 1.45, O.z + .35, 0, .32, new THREE.Matrix4()), FP = frame(O.x + 3.45, O.y - .7, O.z + .35, 0, -.3, new THREE.Matrix4());
    var LID = local(FL, 0, .68, -.72, -.16, 0, 1, 1, 1, new THREE.Matrix4());
    S.stage({
      name: 'idyou',
      target: function (f, asp) { return { aim: O.clone().add(V(0, -.05, 0)), dist: W.fit(10, 5.2, asp, .9), elev: 10, yaw: 0, tilt: 1.2, n: 1.4 }; },
      set: function (st, w) { if (w < .05) { intro.snap(0); intro.go(1, 1500, performance.now(), 700); } k.wake(900); },
      pose: function (w, ms, now) {
        if (!g.show(w > .001)) return;
        var i = intro.get(now), g0 = grow(w, 0, .5);
        badge.place(frame(BG.x, BG.y, BG.z, 0, 0), 1.15 * g0, win(i, 0, .3));
        nameSlab.place(0, local(frame(NM.x, NM.y, NM.z, 0, 0), 0, 0, 0, 0, 0, g0)); nameSlab.tint(0, col.copy(dark).multiplyScalar(.55));
        nameWords.place(g0 > .05 ? local(frame(NM.x, NM.y, NM.z + .046, 0, 0), 0, 0, 0, 0, 0, g0, g0, 1) : null);
        /* the two devices; a lit line runs from the badge to each, and its screen lights as it lands */
        var d0 = grow(i, .2, .55) * g0, d1 = grow(i, .3, .65) * g0;
        deck.place(0, local(FL, 0, 0, 0, 0, 0, d0)); deck.tint(0, graphite);
        lid.place(0, local(LID, 0, 0, 0, 0, 0, d0)); lid.tint(0, dark);
        lidScreen.place(d0 > .05 ? local(LID, 0, 0, .04 * d0, 0, 0, d0, d0, 1) : null);
        phone.place(0, local(FP, 0, 0, 0, 0, 0, d1)); phone.tint(0, dark);
        phoneScreen.place(d1 > .05 ? local(FP, 0, 0, .05 * d1, 0, 0, d1, d1, 1) : null);
        var lw = win(w, .5, .9), l0 = win(i, .45, .8) * lw, l1 = win(i, .55, .9) * lw;   /* lines leave with the stage */
        W.lit.line(V(BG.x - .95, BG.y - .2, BG.z), pt(LID, .3, .72, 0), 16, l0, .03);
        W.lit.line(V(BG.x + .95, BG.y - .2, BG.z), pt(FP, 0, .84, 0), 14, l1, .03);
        edges.set(0, local(LID, 0, 0, .04, 0, 0, 1, 1, 1), 2.2 * d0, 1.38 * d0, win(i, .75, 1), .013);
        edges.set(1, local(FP, 0, 0, .05, 0, 0, 1, 1, 1), .8 * d1, 1.6 * d1, win(i, .85, 1), .013);
      },
      anchor: function (out) { anchorAt(out, BG.x, BG.y, BG.z, 1.2); },
      tags: function () {
        var i = intro.get(performance.now());
        return [{ id: 'badge', p: BG.clone().add(V(.95, .7, 0)), on: i > .3 }, { id: 'device-0', p: pt(LID, -1.1, .95, 0), on: i > .8 }, { id: 'device-1', p: pt(FP, -.4, 1.05, 0), on: i > .9 }];
      }
    });
  })();

  /* ---------- 9 one identity, many chains: the network whole, your ring joined to every network ---------- */
  (function () {
    var g = parts(), badge = makeBadge(g), intro = W.tween(1), rings = W.ringList, MINE = N.MINE, set0 = -1, ELEV = 50;
    var NETS = Object.keys(N.NAMED).map(Number).filter(function (i) { return N.KIND[i] === 'network'; });   /* DEFXN is the kernel in the ground, not a network chain (owner, 2026-10-24) */
    var RESV = rings.filter(function (r) { return r.kind === 'resolver'; }).map(function (r) { return r.i; });
    function top(ri, h) { var r = rings[ri]; return V(r.c.x, r.c.y + r.t * (h || 1.2), r.c.z); }
    var BGP = top(MINE, 1).add(V(0, 3.2, 0));
    /* a line that arcs over the network, so it reads as a reach, not a cut across the rings */
    var A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), D = new THREE.Vector3();
    function arc(beads, a, b, lift, count, reveal, r) {
      C.copy(a).lerp(b, .5); C.y += lift;
      for (var s = 0; s < 4; s++) {
        var u0 = s / 4, u1 = (s + 1) / 4;
        A.copy(a).multiplyScalar((1 - u0) * (1 - u0)).add(D.copy(C).multiplyScalar(2 * u0 * (1 - u0))).add(P.copy(b).multiplyScalar(u0 * u0));
        B.copy(a).multiplyScalar((1 - u1) * (1 - u1)).add(D.copy(C).multiplyScalar(2 * u1 * (1 - u1))).add(P.copy(b).multiplyScalar(u1 * u1));
        beads.line(A.clone(), B.clone(), Math.ceil(count / 4), clamp01(reveal * 4 - s), r);
      }
    }
    function focus(on) {
      if (!on) { if (set0 !== 0) { if (set0 === 1) W.focusOn(null, false); set0 = 0; } return; }
      if (set0 === 1) return; set0 = 1;
      W.focusOn(function (i) { return i === MINE || NETS.indexOf(i) >= 0; }, false);
    }
    S.stage({
      name: 'idvalue',
      target: function (f, asp) { return { aim: V(-1, 0, -6.5), dist: W.fit(31, 46 * Math.sin(ELEV * D2R) + 2, asp, .96), elev: ELEV, yaw: 0, tilt: 1.4, n: 0 }; },
      set: function (st, w) { if (w < .05) { intro.snap(0); intro.go(1, 1600, performance.now(), 900); } k.wake(900); },
      pose: function (w, ms, now) {
        focus(w > .5);
        if (!g.show(w > .001)) return;
        var i = intro.get(now) * win(w, .5, .9), g0 = grow(w, .3, .8);   /* its lines leave with it */
        /* your identity over your ring, turned up to the camera */
        badge.place(frame(BGP.x, BGP.y, BGP.z, -ELEV * D2R * .7, 0), 1.9 * g0, win(i, 0, .25));
        W.lit.line(V(BGP.x, BGP.y - 1.2 * g0, BGP.z), top(MINE, 1.1), 6, win(i, .05, .25), .05);
        /* lit to the three network chains, dotted to the resolvers that read what it signs */
        NETS.forEach(function (ri, n) { arc(W.lit, top(MINE), top(ri), 3.5, 32, win(i, .2 + n * .12, .55 + n * .12), .1); });
        RESV.forEach(function (ri, n) { arc(W.dots, top(MINE), top(ri), 2, 20, win(i, .5 + n * .06, .85 + n * .06), .075); });
      },
      anchor: function (out) { anchorAt(out, BGP.x, BGP.y, BGP.z, 2); },
      tags: function () { return [{ id: 'you', p: BGP.clone().add(V(1.4, 1, 0)), on: intro.get(performance.now()) > .2 }]; }
    });
  })();
})();

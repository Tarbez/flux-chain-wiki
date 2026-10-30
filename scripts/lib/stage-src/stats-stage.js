/* The 3D of the stats section: ONE illustration that transforms into five states, one for each step of the story.
   (2026-10-25, owner: "these 5 steps inside the stats the illustration is not coherent at all ... no story no consistency and teaching", "for the
   capabilities it is about measuring that speed, cause swap is a capability, transfer is the same", and then, on a draft with five separate stations:
   "You are still splitting the 5 steps in 5 illustrations while I wanted one illustration that is transformative into 5 states".)

   ONE OBJECT: one pool of cubes on one base, seen from one camera angle. On each step the SAME cubes fly to a new formation and the base resizes under
   them; a cube the formation does not need sinks into the base, and rises out of it when a later formation needs it. Motion only: nothing fades or cuts.
     s = 'now'           The network: the fleet's totals, one block of swaps and one of transfers, all nodes at the same time (BENCH-013), live line in front
     s = 'capabilities'  Operations: a column for each measured way to run an operation (BENCH-013 matrix), a dotted outline for each one not built
     s = 'ceiling'       One node: a column for each number of connections, through the real WebSocket wire (BENCH-015)
   (2026-10-25, owner: "I do not think we need all the 5 steps we can reduce the noise. audit and remove we are repeating ourselves nonstop." The batch
   and the timeline states are gone: the batch's one telling fact, the send's length, is a fact of One node; every card names its run and date.)

   ONE WAY OF DRAWING, in every state: a cube is one stated unit and nothing is scaled. 1,000 a second in states 1, 3 and 4 (rounded to the nearest cube;
   the label has the exact value), A column is a stack of whole cubes in a fixed footprint, so its height is
   its count. What is not built or not measured yet is dotted, never a cube of height 0 (AGENTS.md).
   Grey is measured; what the reader chose takes the signal orange, the home page's one accent. The legend under the stage names the unit of the state in view.
   The numbers are the data files, read here and nothing more: ArkStatsHighlights; the grouping of operations is ArkStatsScale.operations.
   Settling: the formation change runs on a clock the stage owns and asks for frames only while a cube travels; nothing animates by itself. */
(function () {
  'use strict';
  var S = window.DEFXNScene, H = window.ArkStatsHighlights, SCL = window.ArkStatsScale;
  if (!S || !S.ok || !S.world || !H || !SCL || !SCL.operations || !H.clientPath || !H.operations || !H.operations.fleet) return;
  var W = S.world, k = W.k, THREE = W.THREE, V = W.V, ease = W.ease, clamp01 = ease.clamp01, lerp = W.lerp, HUB = W.HUB;
  var grow = W.grow, follower = W.follower;
  var M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), SC = new THREE.Vector3();
  function compose(x, y, z, sx, sy, sz) { return M.compose(P.set(x, y, z), Q, SC.set(Math.max(1e-4, sx), Math.max(1e-4, sy), Math.max(1e-4, sz))); }
  function stagePick(kind, id) { if (S.hooks.stagePick) S.hooks.stagePick(kind, id); }

  /* ---------- the tones: theme mixes only ---------- */
  var T = { cube: new THREE.Color(), teal: new THREE.Color(), base: new THREE.Color(), step: new THREE.Color(), send: new THREE.Color(), run: new THREE.Color() };
  function tones() {
    var quiet = k.mix('other', 'identity', .35);
    T.teal.copy(k.C.signal);   /* the brand's one accent, as on home: what is chosen glows in the signal orange */
    T.cube.copy(quiet); T.base.copy(k.mix('canvas', 'other', .14)); T.run.copy(quiet).lerp(T.teal, .5);
    T.step.copy(T.teal); T.send.copy(k.mix('canvas', 'other', .5));
  }

  /* ---------- the formations, from the data; each is laid out from x = 0 and then centred on the base ---------- */
  var O = V(HUB.c.x, .02, HUB.c.z + 36),   /* on the ground grid, in front of the network (owner, 2026-10-25: "instead of flying into space ... zoom into the
                                              ground grid and show the stats, that would feel part of the rest of the 3d"); the network stands behind it */
      CUBE = .22, PITCH = .26, GAP_COL = .34, GAP_GROUP = 1.3;
  var OPS_REC = H.operations, FLEET = OPS_REC.fleet, CP = H.clientPath, UNIT = SCL.CUBE_RATE;
  var GROUPS = SCL.operations(OPS_REC.rows);
  var NOT_BUILT = (OPS_REC.notBuilt || []).map(function (name) { return { id: 'nb-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: name }; });
  function span(side) { return side * PITCH; }
  function formation(key) { return { key: key, boxes: [], cols: [], marks: {}, w: 0, d: 3, tall: .6 }; }
  /* a column of whole cubes in a side x side footprint; returns where its labels stand */
  function column(F, id, x, z, count, side, tone, kind, ref) {
    var per = side * side, n = Math.max(0, Math.round(count));
    for (var j = 0; j < n; j++) {
      var layer = Math.floor(j / per), at = j % per;
      F.boxes.push({ x: x + (at % side - (side - 1) / 2) * PITCH, y: layer * PITCH, z: z + (Math.floor(at / side) - (side - 1) / 2) * PITCH, w: CUBE, h: CUBE, d: CUBE, tone: tone || 'cube', kind: kind, ref: ref });
    }
    var c = { id: id, x: x, z: z, top: Math.ceil(n / per) * PITCH, half: span(side) / 2 };
    F.cols.push(c); F.tall = Math.max(F.tall, c.top);
    return c;
  }
  function centre(F) {
    var dx = -F.w / 2;
    F.boxes.forEach(function (b) { b.x += dx; }); F.cols.forEach(function (c) { c.x += dx; });
    Object.keys(F.marks).forEach(function (m) { var v = F.marks[m]; (Array.isArray(v) ? v : [v]).forEach(function (o) { ['x', 'x0', 'x1'].forEach(function (f) { if (typeof o[f] === 'number') o[f] += dx; }); }); });
    return F;
  }
  var FORM = {};

  /* 1. capabilities */
  FORM.capabilities = (function () {
    var F = formation('capabilities'), side = 5, x = 0;
    F.marks.groups = [];
    GROUPS.forEach(function (g, gi) {
      if (gi) x += GAP_GROUP;
      var x0 = x;
      g.rows.forEach(function (r, ri) { column(F, 'op-' + g.id + '-' + ri, x + span(side) / 2, 0, r.rate / UNIT, side, 'cube', 'op', gi); x += span(side) + GAP_COL; });
      x -= GAP_COL;
      F.marks.groups.push({ id: g.id, x: (x0 + x) / 2 });
    });
    x += GAP_GROUP;
    F.marks.notBuilt = NOT_BUILT.map(function (nb) { var cx = x + span(3) / 2; x += span(3) + GAP_COL; return { id: nb.id, x: cx, half: span(3) / 2 }; });
    F.w = x - GAP_COL; F.d = span(side) + 2.2; F.labelZ = span(side) / 2 + 1;
    return centre(F);
  })();

  /* 3. one node, through the network */
  FORM.ceiling = (function () {
    var F = formation('ceiling'), side = 2, step = span(side) + GAP_COL + .55, x = 0, pts = CP.byConnections;
    pts.forEach(function (p, i) { column(F, 'pt-' + p.connections, x + span(side) / 2, 0, p.swapsPerSecond / UNIT, side, i === pts.length - 1 ? 'teal' : 'cube', 'point', i); x += step; });
    F.w = x - step + span(side); F.d = span(side) + 2;
    return centre(F);
  })();

  /* the network: the fleet's totals only, never one column for each node (owner, 2026-10-25: "we cannot show the nodes cause this is gonna grow for much so
     we only show total nodes speed and stats no naming"). One block for all swaps a second and one for all transfers, all nodes measured at the same time */
  FORM.fleet = (function () {
    var F = formation('fleet'), side = 8, x = 0;
    [{ id: 'total-swaps', rate: FLEET.parallelSwapsPerSecond }, { id: 'total-transfers', rate: FLEET.transfersPerSecond }].forEach(function (t, i) {
      column(F, t.id, x + span(side) / 2, 0, t.rate / UNIT, side, i ? 'cube' : 'teal', 'total', i); x += span(side) + 1.4;
    });
    F.w = x - 1.4; F.d = span(side) + 3; F.marks.live = { x0: -1, x1: F.w + 1, z: span(side) / 2 + 1.75 };
    return centre(F);
  })();

  /* ---------- the one pool of cubes: as many as the largest formation needs ---------- */
  var KEYS = ['fleet', 'capabilities', 'ceiling'];
  var N = Math.max.apply(null, KEYS.map(function (key) { return FORM[key].boxes.length; }));
  /* in each formation, cube i takes box i of a left-to-right order, so a cube travels to the same side it stands on; the rest sink into the base */
  KEYS.forEach(function (key) { FORM[key].boxes.sort(function (a, b) { return a.x - b.x || a.z - b.z || a.y - b.y; }); });
  var field = k.blockSet(N + 1, k.bevel(1, 1, 1, .035), { plain: true, lift: .06 });   /* the last instance is the base */
  var fm = field.mesh.material; fm.roughness = .9; fm.metalness = 0; fm.clearcoat = 0; fm.sheen = 0; fm.envMapIntensity = .12; fm.specularIntensity = .35;   /* matte: a gloss throws the key light back as one white patch */
  var BASE = N;
  function arr() { return new Float32Array(N + 1); }
  var cur = {}, from = {}, to = {}, FIELDS = ['x', 'y', 'z', 'w', 'h', 'd', 'r', 'g', 'b'];
  FIELDS.forEach(function (f) { cur[f] = arr(); from[f] = arr(); to[f] = arr(); });
  var kindOf = new Array(N), refOf = new Int16Array(N), delay = arr(), col = new THREE.Color();

  /* ---------- what the page chose ---------- */
  var sub = 'now', chosen = '', live = 0, setAt = 0, t0 = 0, DUR = 1150, form = null, ready = false;
  var pick = follower(GROUPS.length, 140);
  function state() { return sub === 'capabilities' || sub === 'ceiling' ? sub : 'now'; }
  function formOf(st) { return FORM[st === 'now' ? 'fleet' : st]; }
  function arrived() { var dur = S.debug ? (S.debug().dur || 0) : 0; return k.reduced || performance.now() - setAt > Math.max(Math.min(1800, dur), DUR) * .75; }
  function target(F, snap) {
    for (var i = 0; i < N; i++) {
      var b = F.boxes[i], tone = b ? (T[b.tone] || T.cube) : T.base;
      if (b) { to.x[i] = b.x; to.y[i] = b.y; to.z[i] = b.z; to.w[i] = b.w; to.h[i] = b.h; to.d[i] = b.d; kindOf[i] = b.kind; refOf[i] = typeof b.ref === 'number' ? b.ref : -1; }
      else { to.x[i] = cur.x[i] || 0; to.y[i] = -.1; to.z[i] = cur.z[i] || 0; to.w[i] = to.h[i] = to.d[i] = 1e-4; kindOf[i] = null; refOf[i] = -1; }   /* sinks into the base */
      to.r[i] = tone.r; to.g[i] = tone.g; to.b[i] = tone.b;
    }
    to.x[BASE] = 0; to.y[BASE] = -.14; to.z[BASE] = 0; to.w[BASE] = F.w + 1.6; to.h[BASE] = .1; to.d[BASE] = F.d + 1.4; to.r[BASE] = T.base.r; to.g[BASE] = T.base.g; to.b[BASE] = T.base.b;
    for (var q = 0; q <= N; q++) {
      delay[q] = snap || q === BASE ? 0 : 60 + (q / N) * 320;
      FIELDS.forEach(function (f) { from[f][q] = snap ? to[f][q] : cur[f][q]; if (snap) cur[f][q] = to[f][q]; });
    }
    form = F; t0 = performance.now(); ready = true;
    k.wake(DUR + 500); k.moved(DUR + 500);
  }
  k.onPaint(function () { tones(); if (form) target(form, true); }); tones();

  /* ---------- picks: in state 1 an operation is chosen; on the overview a node column opens the fleet ---------- */
  field.pickable = field.liftable = function (i) { return live >= .9 && i !== BASE && state() === 'capabilities' && kindOf[i] === 'op'; };
  field.onPick = function (i) { if (kindOf[i] === 'op') stagePick('operation', GROUPS[refOf[i]].id); };
  field.onHover = function () { k.wake(400); };

  /* ---------- dotted lines: what is not built, and the live line ---------- */
  var LA = V(0, 0, 0), LB = V(0, 0, 0);
  function line(a, b, count, reveal, r) { if (reveal > .004) W.dots.line(a, b, count, reveal, r); }
  function lines(a) {
    var st = state(), F = form, y = O.y + .02;
    if (!F || a < .004) return;
    if (st === 'capabilities') F.marks.notBuilt.forEach(function (nb) {
      var x = O.x + nb.x, z = O.z, h = nb.half;
      line(LA.set(x - h, y, z - h), LB.set(x + h, y, z - h), 5, a, .022); line(LA.set(x + h, y, z - h), LB.set(x + h, y, z + h), 5, a, .022);
      line(LA.set(x + h, y, z + h), LB.set(x - h, y, z + h), 5, a, .022); line(LA.set(x - h, y, z + h), LB.set(x - h, y, z - h), 5, a, .022);
    });
    if (st === 'now' && F.marks.live) line(LA.set(O.x + F.marks.live.x0, y, O.z + F.marks.live.z), LB.set(O.x + F.marks.live.x1, y, O.z + F.marks.live.z), 28, a, .026);   /* dotted until something streams */
  }

  /* ---------- the labels the page writes, placed here on their points ---------- */
  function tags() {
    var up = arrived(), st = state(), F = formOf(st), list = [], y0 = O.y;
    KEYS.forEach(function (key) {
      var G = FORM[key], on = up && F === G;
      G.cols.forEach(function (c) {
        list.push({ id: 'v-' + c.id, p: V(O.x + c.x, y0 + c.top + .12, O.z + c.z), on: on });
        if (key !== 'capabilities') list.push({ id: 'n-' + c.id, p: V(O.x + c.x, y0, O.z + c.z + c.half + .75), on: on });
      });
    });
    var C = FORM.capabilities, onC = up && st === 'capabilities';
    C.marks.groups.forEach(function (g) { list.push({ id: 'g-' + g.id, p: V(O.x + g.x, y0, O.z + C.labelZ), on: onC }); });
    C.marks.notBuilt.forEach(function (nb) { list.push({ id: 'n-' + nb.id, p: V(O.x + nb.x, y0, O.z), on: onC }); });
    var lv = F && F.marks.live;
    list.push({ id: 'live', p: lv ? V(O.x + lv.x0 - .2, y0 + .05, O.z + lv.z) : V(O.x, y0, O.z), on: up && !!lv && st === 'now' });
    return list;
  }

  /* ---------- the camera: one angle; only its distance follows the formation's size ---------- */
  var padTop = 0, padBottom = 0;
  S.stage({
    name: 'stats', aims: true,
    target: function (fr) {
      var F = formOf(state()), pb = padBottom + 56, ph = Math.max(120, fr.h - padTop - pb), a2 = fr.w / ph, elev = 31;
      var dist = W.fit(F.w + 3.4, F.tall + F.d * .5 + 3, a2, .95), up = (padTop - pb) / 2 * 2 * W.TAN * dist / (fr.h * Math.cos(elev * W.D2R));
      return { aim: V(O.x, O.y + F.tall * .4 + up, O.z + .4), dist: dist, elev: elev, yaw: -7, tilt: 1.2, n: 1.4 };
    },
    set: function (st, w) {
      var next = typeof st.s === 'string' && st.s ? st.s : 'now', changed = next !== sub;
      if (changed) { sub = next; setAt = performance.now(); }
      chosen = typeof st.c === 'string' ? st.c : '';
      padTop = +st.pt || 0; padBottom = +st.pb || 0;
      if (w < .05) setAt = performance.now();
      if (changed || !ready) target(formOf(state()), w < .05 || !ready || k.reduced);
      k.wake(900); k.moved(900);
    },
    pose: function (w, ms, now) {
      var on = w > .001; live = w; field.show(on);
      if (!on || !ready) return;
      var st = state(), gi = GROUPS.findIndex(function (g) { return g.id === chosen; }), moving = false;
      pick.step(now, function (i) { return st === 'capabilities' && i === (gi < 0 ? 0 : gi) ? 1 : 0; });
      var g = grow(w, .05, .7);
      for (var i = 0; i <= N; i++) {
        var u = k.reduced ? 1 : clamp01((now - t0 - delay[i]) / DUR), e = u >= 1 ? 1 : ease.inOut(u);
        if (u < 1) moving = true;
        for (var fi = 0; fi < FIELDS.length; fi++) { var f0 = FIELDS[fi]; cur[f0][i] = lerp(from[f0][i], to[f0][i], e); }
        var f = i < N && kindOf[i] === 'op' && refOf[i] >= 0 ? pick.v[refOf[i]] || 0 : 0;
        if (f > .001 && f < .999) moving = true;
        col.setRGB(cur.r[i], cur.g[i], cur.b[i]); if (f) col.lerp(T.teal, f);
        field.place(i, compose(O.x + cur.x[i], O.y + (cur.y[i] + cur.h[i] / 2) * g, O.z + cur.z[i], cur.w[i] * g, cur.h[i] * g, cur.d[i] * g));
        field.tint(i, col);
      }
      if (moving) { k.wake(60); k.moved(60); }
      lines(grow(w, .35, 1) * (moving ? .4 : 1));
    },
    anchor: function (out) { out.pos.set(O.x, O.y + 1.2, O.z); out.quat.identity(); out.s = .6; },
    tags: tags
  });

  /* the formations' make-up, read from the same data as the cubes, for the tests */
  window.ArkStatsStations = { groups: GROUPS, notBuilt: NOT_BUILT, states: KEYS, cubes: N, unit: UNIT, sizes: KEYS.map(function (key) { return FORM[key].boxes.length; }) };
})();

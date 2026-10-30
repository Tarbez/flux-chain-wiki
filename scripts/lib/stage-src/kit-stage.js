/* The 3D of the Kit page (/kit, editor only): board 05, "Category 05 - Identity, Network & Micrographics", as real
   objects floating above the network, nine at a time in a 3 x 3 grid, in board order (owner, 2026-10-26: "make it 3 by 3"). Each object comes from the object kit
   (js/world/object-kit.js, S.objects); a board element with no builder leaves its cell empty, a faint floor plate only.

   Page contract (js/pages/kit.js):
     ArkWorldHost.state / select({ view: 'kit', b: '<board 01..05>', s: '<element id>' })
       b      the board on screen. Boards 01-04 are flat HTML tiles over the world: the objects sink out of the way and
              the camera rests at the calm wide pose behind them. b '05' (or no b) shows the objects, the camera framed
              on the page's [data-stage] box (world-host.js hooks.frame).
       p      the page of nine on screen (0-based; board order, nine per page, as the page's tiles). The objects of other
              pages sink out of the way.
       s      one element id: the camera flies to it, and it lifts and turns slowly to face you, then settles. Its
              page is shown. '' (or an id with no builder) frames the page's grid.
     S.kit.built()        the ids that have a builder, in board order: the page derives which elements are built from
                          this, never from a list of its own. Ready as soon as this file has run.
     S.kit.screen(id)     { x, y, visible } in CSS pixels of the viewport: the point under the object's floor plate,
                          for an HTML label. visible is false while the object is out of view or not shown.
     S.kit.selected()     the element id the camera is at ('' for the whole grid)
     Labels the host places: ArkWorldHost.tags('kit') is the layer; one [data-tag="<element id>"] item per object.
     The stage's tags() puts each on the point S.kit.screen names; with an object chosen, only its own label shows.

   Skins. A card skin never recolours the grid (ring-kit.js). The kit objects are the exception the Kit page exists
   for: they wear the skin of the nearest [data-ark-skin] / [data-defxn-skin] wrapper of the world's canvas (the skin
   goes on #scene), falling back to body. They repaint on the bubbling ark:skin and defxn:skin events and on the
   theme's own repaint (k.onPaint), easing to the new colours over about half a second. Meaning tokens (--warning,
   --danger, --live) and the locked --chain-* tokens are always the site's own (S.objects.tones).

   Motion. Everything eases to a target and stops: the objects grow in with the view's weight and sink out when another
   board is shown; the orbit rings tilt into place once; the chosen object lifts and turns, then rests. Nothing moves
   while you only look. Reduced motion takes each target at once. At weight 0 every mesh is hidden: no draw call. */
(function () {
  'use strict';
  var S = window.DEFXNScene;
  if (!S || !S.ok || !S.world || !S.objects) return;
  var W = S.world, k = W.k, THREE = W.THREE, V = W.V, ease = W.ease, clamp01 = ease.clamp01;
  var COLS = 3, ROWS = 3, PER = COLS * ROWS, SP = 2.4, RISE = 1, DEPTH = SP * .8, SC = 1.25, REST_YAW = -.32, ELEV = 16;
  var O = W.HUB.c.clone().add(V(0, 18, -30));   /* the grid's front-centre, high over the network and behind it */

  /* ---------- the objects ---------- */
  var look = S.objects.look(), root = new THREE.Group();
  k.scene.add(root);   /* the root stays visible, so the kernel's first compile (k.go) reaches the hidden meshes */
  var items = [], byId = {};
  S.objects.ids().forEach(function (id) {
    var g = S.objects.build(id, { look: look });
    if (!g) return;
    var it = { id: id, g: g, meshes: g.userData.meshes, rings: g.userData.rings, cell: 0, page: 0, p: V(0, 0, 0) };
    items.push(it); byId[id] = it; root.add(g);
  });
  S.kit = {
    built: function () { return items.map(function (it) { return it.id; }); },
    screen: screen,
    selected: function () { return sel; }
  };

  /* the floor plates: one per cell of the page on screen, built or not (two instanced meshes for nine) */
  var CELLS = COLS * ROWS;
  var plates = new THREE.InstancedMesh(S.objects.bevel(1.7, .05, 1.5, .3), look.mats.glassDim, CELLS);
  var rims = new THREE.InstancedMesh(S.objects.frameGeo(1.66, 1.46, .012).clone().rotateX(-Math.PI / 2), look.mats.edgeDim, CELLS);
  plates.renderOrder = 6; rims.renderOrder = 9; root.add(plates); root.add(rims);
  var meshes = [plates, rims];
  items.forEach(function (it) { meshes = meshes.concat(it.meshes); });

  /* ---------- layout: board order, derived ---------- */
  /* reading order, as the board: the first row is the back one, highest, so 01 is top left on screen */
  function cellAt(n) { var c = n % COLS, r = ROWS - 1 - Math.floor(n / COLS); return V(O.x + (c - (COLS - 1) / 2) * SP, O.y + r * RISE, O.z - r * DEPTH); }
  function layout() {
    var board = window.DefxnKitBoards && DefxnKitBoards.board && DefxnKitBoards.board('05');
    var order = board ? board.items.map(function (x) { return x.id; }) : items.map(function (it) { return it.id; });
    items.forEach(function (it, i) { var n = order.indexOf(it.id); if (n < 0) n = i; it.page = Math.floor(n / PER); it.cell = n % PER; it.p.copy(cellAt(it.cell)); });
    total = order.length;
  }
  var total = 0;
  /* how many cells the page on screen has: nine, or what is left on the last page */
  function cellsOnPage() { return Math.max(0, Math.min(PER, total - page * PER)); }
  layout();
  function centreOf(it, out) { return (out || V(0, 0, 0)).set(it.p.x, it.p.y + .05 + SC * .5, it.p.z); }
  function labelAt(it, out) { return (out || V(0, 0, 0)).set(it.p.x, it.p.y - .05, it.p.z + .78); }

  /* ---------- state ---------- */
  var board = '05', sel = '', page = 0, shown = true;
  function setShown(on) { if (on === shown) return; shown = on; meshes.forEach(function (m) { m.visible = on; }); }
  setShown(false);
  var boardF = W.follower(1, 260), pageF = W.follower(items.length, 300), lift = W.follower(items.length, 220), turn = W.follower(items.length, 620), vis = 0;
  turn.v.fill(REST_YAW);

  /* ---------- skins: the objects follow the nearest skin wrapper, easing ---------- */
  var canvas = document.getElementById('chains');
  function skinBox() { return (canvas && canvas.closest && canvas.closest('[data-ark-skin],[data-defxn-skin]')) || document.body; }
  var tone = S.objects.tones(skinBox()), toneFrom = null, toneGoal = null, toneAt = 0, TONE_DUR = 520;
  look.paint(tone);
  function retone() {
    toneGoal = S.objects.tones(skinBox()); toneFrom = S.objects.lerpTones(tone, tone, 0); toneAt = performance.now();
    if (k.reduced || !shown) { S.objects.lerpTones(toneGoal, toneGoal, 0, tone); look.paint(tone); toneGoal = null; k.redraw(); return; }
    k.wake(TONE_DUR + 80);
  }
  /* the skin's attribute is set before its event bubbles; read it on the next frame, once styles have applied */
  function onSkin() { requestAnimationFrame(retone); }
  document.addEventListener('ark:skin', onSkin); document.addEventListener('defxn:skin', onSkin);
  k.onPaint(retone);

  /* ---------- the pose, each frame the world draws ---------- */
  var M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = V(0, 0, 0), SV = V(0, 0, 0), ZM = new THREE.Matrix4().makeScale(1e-4, 1e-4, 1e-4);
  function pose(w, ms, now) {
    boardF.step(now, function () { return board === '05' ? 1 : 0; });
    vis = w * boardF.v[0];
    if (toneGoal) {
      var u = vis > .001 ? clamp01((now - toneAt) / TONE_DUR) : 1;
      S.objects.lerpTones(toneFrom, toneGoal, ease.inOut(u), tone); look.paint(tone);
      if (u >= 1) toneGoal = null; else k.wake(60);
    }
    if (vis <= .001) { setShown(false); return; }
    setShown(true);
    pageF.step(now, function (i) { return items[i].page === page ? 1 : 0; });
    lift.step(now, function (i) { return items[i].id === sel ? 1 : 0; });
    turn.step(now, function (i) { return items[i].id === sel ? 0 : REST_YAW; });
    items.forEach(function (it, i) {
      var g = W.grow(vis * pageF.v[i], .04 + it.cell * .02, .5 + it.cell * .02);
      it.g.visible = g > .01;
      it.g.position.set(it.p.x, it.p.y + .05 - (1 - g) * .8 + lift.v[i] * .35 * SC, it.p.z);
      it.g.scale.setScalar(SC * g);
      it.g.rotation.y = turn.v[i];
      it.rings.forEach(function (r) { r.m.rotation.x = r.rx + (1 - g) * .7; r.m.scale.setScalar(.7 + .3 * g); });
    });
    var cells = cellsOnPage();
    for (var n = 0; n < CELLS; n++) {
      var f = n < cells ? W.grow(vis, .02 + n * .02, .45 + n * .02) : 0, c = cellAt(n);
      if (f < .01) { plates.setMatrixAt(n, ZM); rims.setMatrixAt(n, ZM); continue; }
      M4.compose(P.set(c.x, c.y - (1 - f) * .8, c.z), Q, SV.set(f, f, f));
      plates.setMatrixAt(n, M4);
      M4.compose(P.set(c.x, c.y - (1 - f) * .8 + .03, c.z), Q, SV.set(f, f, f));
      rims.setMatrixAt(n, M4);
    }
    plates.instanceMatrix.needsUpdate = true; rims.instanceMatrix.needsUpdate = true;
    plates.boundingSphere = null; rims.boundingSphere = null;
  }

  /* ---------- labels ---------- */
  var LP = V(0, 0, 0);
  function screen(id) {
    var it = byId[id], out = { x: -999, y: -999, visible: false };
    if (!it) return out;
    var p = k.project(labelAt(it, LP), {}), size = k.size();
    if (!p) return out;
    out.x = p.x; out.y = p.y;
    out.visible = shown && vis > .9 && it.page === page && sel === id && p.x >= 0 && p.y >= 0 && p.x <= size.w && p.y <= size.h;
    return out;
  }

  S.stage({
    name: 'kit',
    aims: true,   /* a new board or element moves the camera too (chains-scene.js select) */
    target: function (f, asp) {
      if (board !== '05') {
        var calm = (window.ArkWorldHost && ArkWorldHost.calm) || { n: .6, elev: 30, dist: 135, tilt: 1.2 };
        return { aim: V(0, 0, 0), dist: calm.dist * Math.max(1, (W.N.W / W.N.H) / asp), elev: calm.elev, yaw: 0, tilt: calm.tilt, n: calm.n };
      }
      var it = byId[sel];
      if (it) {
        var c = centreOf(it); c.y += .35 * SC;
        return { aim: c, dist: W.fit(SP * 1.45, SP * 1.25, asp, .9), elev: 12, yaw: 0, tilt: .6, n: 1.2 };
      }
      var e = ELEV * W.D2R, h = (ROWS - 1) * RISE * Math.cos(e) + (ROWS - 1) * DEPTH * Math.sin(e) + SC * 1.1 + .8;
      return { aim: V(O.x, O.y + (ROWS - 1) * RISE / 2 + SC * .45, O.z - (ROWS - 1) * DEPTH / 2), dist: W.fit(COLS * SP + .6, h, asp, .92), elev: ELEV, yaw: 0, tilt: .8, n: 1.2 };
    },
    set: function (st) {
      var b = st && st.b != null && st.b !== '' ? String(st.b) : '05';
      var s = st && st.s != null ? String(st.s) : sel;
      if (!byId[s]) s = '';
      layout();   /* the board's own order, once its table of contents has loaded */
      var pg = st && st.p != null && st.p !== '' && isFinite(+st.p) ? Math.max(0, Math.floor(+st.p)) : page;
      if (s) pg = byId[s].page;   /* a chosen object brings its own page */
      if (b === board && s === sel && pg === page) return;
      board = b; sel = s; page = pg;
      k.wake(1400); k.moved(1400);
    },
    pose: pose,
    anchor: function (out) {
      var it = byId[sel];
      if (it) centreOf(it, out.pos); else out.pos.set(O.x, O.y, O.z);
      out.quat.identity(); out.s = 1;
    },
    tags: function () {
      /* the list names every object; over the 3D only the chosen one is labelled, so no label lies over the next row */
      return items.map(function (it) { return { id: it.id, p: labelAt(it), on: board === '05' && it.page === page && !!sel && sel === it.id }; });
    }
  });
})();

/* DEFXN mockup app: the one 3D world behind every view (2026-10-23).

   One world, never rebuilt, so moving between views is one camera flight with no cut:
     home    the whole network: the hub ring with the DEFXN mark, the chains around it, a label
             for each kind, cubes on stems, dotted orbits and lines (owner's network picture)
     chain   the camera flies down to your ring; it rises and re-forms into one tile per record.
             The chosen record's tile lifts out, flies to you, turns to face you and opens into
             the chain's page: a dark slab the page's words sit on (owner: "the chain cube needs
             to animate and open and become a page").
     record  the slab glides from the chain's page to the record's page; the chosen tile comes
             forward and its earlier versions fan out behind it. Opening the record folds the
             slab back into the tile, and the tile becomes the card.
     record  the camera comes to that tile; its earlier versions fan out behind it, and the next
             record waits on the ring to its right
     open    the camera faces the tile; the tile widens into the card's shape, its slots fade,
             and the card's words sit on it: the tile IS the card's background. The other records
             line up on each side, joined by links (owner: "zoom in one of those cubes and that
             cube becomes the background of the ui card")
     links   the ring unrolls into a line, oldest on the left; the chosen record comes forward
             with its earlier versions behind it, its related records in front, and your key above
     the key your identity, at the centre of your ring while you look at your chain (panel 02)
     chain links each record links to the one before it, so the ring has a gap where it starts
   The other worlds (how a result is made, resolvers, measured, FXN) live in stages.js and
   register here (api.stage); they float above the network so the camera flies to them too.
   Each view is a target: camera aim, distance, height, lean, design frame, and three morphs
   (your ring re-forming, the earlier versions, the card). A move eases every one of them from
   where it is now, so a move can start mid-flight and nothing jumps.

   The app (app.js) owns the views and the address; it gives this file each view's screen box
   (hooks.frame) and hears picks (hooks.pick). Layout comes from network-data.js, records from
   records-sample.js, the tile, colour and timeline from ring-kit.js. */
(function () {
  'use strict';
  var N = window.DEFXN_NETWORK, REC = window.DEFXN_RECORDS;
  var hooks = {}, api = { ok: false, hooks: hooks, to: function () {}, select: function () {}, labels: function () {} };
  window.DEFXNScene = api;
  if (!N || !REC || !window.DEFXNRingKit) return;

  var DESIGN = N.W / N.H, FOV = 12, TAN = Math.tan(FOV / 2 * Math.PI / 180), HOME_ELEV = 24, HOME_DIST = 99;
  var k = window.DEFXNRingKit.start({
    canvas: document.getElementById('chains'),
    camera: { fov: FOV, elev: HOME_ELEV, dist: HOME_DIST, design: DESIGN, near: 1, far: 500 },
    intro: { dist: 1.2, elev: 24, yaw: 2, fly: 4400 },   /* the record descent's storyboard (2026-10-24): 01 the wide grid from above, then down to the hero view */
    end: 4700, tilt: 2.2, onResize: onResize, pose: pose, after: after
  });
  if (!k) return;
  api.ok = true;
  var THREE = k.THREE, TAU = Math.PI * 2, SLOT = k.SLOT, HALF_D = k.HALF_D, LIFT = k.LIFT, MID = LIFT + .5;
  var D2R = Math.PI / 180, ease = k.ease, clamp01 = ease.clamp01;
  function V(x, y, z) { return new THREE.Vector3(x, y, z); }

  /* ---------- rings, cast from the picture ---------- */
  var rings = N.RINGS.map(function (r, ri) {
    var w = r[2], n = r[3], h = .5, c, R, t;
    for (var q = 0; q < 3; q++) {
      var a = k.at((r[0] - w / 2) / N.W, r[1] / N.H, h), b = k.at((r[0] + w / 2) / N.W, r[1] / N.H, h);
      c = a.clone().lerp(b, .5);
      R = a.distanceTo(b) / 2 / (1 + TAU * HALF_D / (SLOT * n));
      t = TAU * R / (SLOT * n);
      h = t * MID;
    }
    c.y = 0;
    return { i: ri, c: c, R: R, t: t, n: n, kind: N.KIND[ri], outer: R + HALF_D * t, parent: null };
  });
  var HUB = rings[N.HUB], Y = rings[N.MINE], OUTER = rings.slice();
  var order = rings.map(function (r, i) { return i; }).sort(function (a, b) { return rings[a].c.distanceTo(HUB.c) - rings[b].c.distanceTo(HUB.c); });
  var RING_LAG = 110, RING_FOR = 560, TILE_FOR = 420;
  rings.forEach(function (r) { r.at = order.indexOf(r.i) * RING_LAG; });
  /* FLOATING CHAINS (owner, 2026-10-25: "chains float above the grid instead of lying flat"). Every chain but the
     kernel hovers: its centre stands HOVER above the grid, and each ring takes its own share of it, so the network
     reads in layers. The share is derived from the ring's place in the network's order (nearest the kernel first),
     spread by the golden ratio so neighbours never share a height; nothing is placed by hand. The kernel stays the
     ground (its logo is inlaid in the grid, home-descent.js). A ring's centre IS its floating centre, so everything
     placed from it (tiles, logo slot, lines, labels, a page's camera) floats with it; a ring's rise, hover lift and
     focus still add on top (ringUp). */
  var HOVER = 1.7;
  function hoverOf(rank) { return HOVER * (.62 + .76 * ((rank * .618034) % 1)); }
  rings.forEach(function (r) { if (r !== HUB) r.c.y = hoverOf(order.indexOf(r.i)); });
  /* chains inside chains (network-data.js CHILDREN): each one sits inside its network ring, placed
     by angle and share of the parent's radius, and builds just after its parent */
  (N.CHILDREN || []).forEach(function (ch, j) {
    var p = rings[ch[0]], a = ch[2] * D2R, R = p.R * ch[4], n = ch[5], t = TAU * R / (SLOT * n), ri = rings.length;
    var c = V(p.c.x + Math.cos(a) * p.R * ch[3], p.c.y, p.c.z + Math.sin(a) * p.R * ch[3]);   /* it floats with its network */
    rings.push({ i: ri, c: c, R: R, t: t, n: n, kind: N.KIND[ri], outer: R + HALF_D * t, parent: p, at: p.at + 380 + j % 5 * 90 });
    order.push(ri);
  });
  /* how far a ring rises for its own page: an inside chain rises clear of its parent's tiles */
  function riseH(r) { return r.parent ? r.parent.t * 2.6 + r.R * 1.8 : r.R * .9 + 1.6; }

  /* each kind of chain has its own tile glyph (ring-kit.js); the hub keeps its bars */
  var KIND_GLYPH = { identity: 'person', resolver: 'rules', token: 'coin', pool: 'arrows', network: 'net', ledger: 'coin' };
  /* the network's tiles: every ring but yours */
  var net = [], netList = [];
  order.forEach(function (ri) {
    if (ri === N.MINE) return;
    var r = rings[ri], step = TAU / r.n;
    for (var i = 0; i < r.n; i++) {
      net.push({ ring: r, ri: ri, theta: Math.PI / 2 + i * step, half: step / 2, at: r.at + (i / r.n) * RING_FOR });
      netList.push({ kind: r.kind, glyph: KIND_GLYPH[r.kind] || 'iii', link: true });
    }
  });
  var netSet = k.tileSet(netList);
  /* every ring of the network can be opened from home: the whole ring lifts under the pointer
     (ringLift below), so a single tile does not */
  netSet.groupLift = true;
  /* home shows each network as one plain ring (owner, 2026-10-24: "the same as the images"); the chains inside a
     network show on that network's page, so on home they are neither lifted nor picked */
  netSet.liftable = netSet.pickable = function (j) { return view === 'home' && !(j != null && net[j] && (rings[net[j].ri].parent || net[j].ri === N.HUB)); };   /* on home the hub is the ground logo (home-descent.js) */
  netSet.label = function (j) {
    var ri = net[j].ri, kd = N.KIND[ri], named = N.NAMED[ri], r = rings[ri], inside = r.parent ? N.NAMED[r.parent.i] : null;
    if (ri === N.HUB) return { name: 'DEFXN · The base chain kernel', act: 'Open' };
    if (kd === 'ledger') return { name: named.name + ' · inside ' + inside.name, act: named.coin === 'FXN' ? 'See the FXN supply' : 'Open' };
    if (inside) return { name: N.NAMES[kd].replace(/s$/, '') + ' · inside ' + inside.name, act: 'Open' };
    return { name: named ? named.name + ' · ' + (named.first ? 'The first chain' : named.coin) : N.NAMES[kd].replace(/s$/, ''), act: 'Open' };
  };
  netSet.onPick = function (j) { if (hooks.pickRing) hooks.pickRing(net[j].ri); };
  var ringLift = new Float32Array(rings.length), ringRise = new Float32Array(rings.length), ringLast = 0;
  /* focus (audit 4): light some rings, and the computers, and step the rest back. The home legend
     and the "In one minute" page set it; it eases like a lift. */
  var focusWant = new Float32Array(rings.length), ringFocus = new Float32Array(rings.length), cubeWant = 0, cubeFocus = 0;
  var insideW = 0;   /* how far the chains inside a network show: 0 on home, 1 elsewhere. They shrink into their ring, never fade */
  var hubW = 0;      /* the same for the hub's own ring (owner, 2026-10-24): it sinks into the ground logo and shrinks, except on its own page */
  /* a tile's colour is its kind's. A ring that is not the subject steps back by a share of it */
  var WHITE = new THREE.Color(1, 1, 1), dimCol = new THREE.Color(), lastDims = '';
  /* each network and the chains inside it read as one family: its accent (kit.css --net-*), at 40%
     over the kind's own colour; a ring outside every network has no family */
  var FAMKEY = { fxn: 'netFxn', deark: 'netDeark', cr3tv: 'netCr3tv' }, famOf = [];   /* the DEFXN kernel has no family: it is the ground */
  function families() {
    rings.forEach(function (r) {
      var n = r; while (n.parent) n = n.parent;
      var c = k.C[FAMKEY[N.IDS[n.i]]];
      famOf[r.i] = c ? c.clone().multiplyScalar(1 / Math.max(c.r, c.g, c.b, 1e-3)) : null;
    });
  }
  families(); k.onPaint(function () { families(); lastDims = ''; });
  Object.keys(netSet.bodies).forEach(function (kd) { netSet.bodies[kd].setColorAt(0, WHITE); });

  /* ---------- the FXN ledger: a chain circle of its own, inside the FXN chain ----------
     (owner, 2026-10-24: DEFXN is the base chain kernel and knows no currency; FXN is the first chain.
     The history below is kept as written.)
     (owner, 2026-10-23: "the FXN icon has a chain circle of its own; it is connected inside two
     chains".) The brief: "FXN lives on the defxn chain", and a network's ledger is "balances for
     each network's own native token, worked out from its events" (the ledger capability). So the
     hub ring is the DEFXN chain, and FXN's ledger is the small ring round the mark inside it,
     joined to the chain by four dotted lines: the ledger is worked out from the chain it lives in. */
  /* (audit 4) it is now one of the chains inside chains: the "fxn-ledger" ring in network-data.js,
     drawn like DARO's and CR3's ledgers, with the same joins to its network */

  /* your ring: its network slots, with the records spread over them; the other slots are filler
     that leaves when the ring re-forms into the record ring */
  var recs = REC.records, nR = recs.length, nY = Y.n, stepY = TAU / nY, stepR = TAU / nR;
  var slotOf = recs.map(function (r, j) { return Math.round(j * nY / nR); });
  var yTile = [], yList = [];
  for (var q = 0; q < nY; q++) {
    var rj = slotOf.indexOf(q);
    yTile.push({ slot: q, rec: rj, at: Y.at + (q / nY) * RING_FOR });
    yList.push({ kind: 'plain', glyph: rj >= 0 ? recs[rj].glyph || 'doc' : 'person', link: true });
  }
  var ySet = k.tileSet(yList);
  var TC = Y.t * 1.2, TS = TC * 1.4, GAP = .35;   /* record tile, chosen tile, gap in the card row */
  /* your ring rises out of the network as it re-forms (so it touches no other ring) and opens wider */
  var RISE = Y.c.y + Y.R * 1.3, RC = Y.R * 1.45;   /* RISE is a height above the grid: your ring floats, then rises */
  ySet.liftable = function (q) { return (view === 'home' || RING[view]) && !(view === 'open' && yTile[q].rec === sel); };
  ySet.pickable = function (q) { var j = yTile[q].rec; return j >= 0 && (view === 'home' || RING[view]) && (view !== 'record' || j === sel || j === sel + 1) && !(view === 'open' && j === sel); };
  ySet.onPick = function (q) { if (hooks.pick) hooks.pick(view, yTile[q].rec); };

  /* earlier versions: faint tiles that fan out behind the chosen record */
  var GH = 3, gSet = k.tileSet([0, 1, 2].map(function () { return { kind: 'ghost', glyph: 'none' }; }));
  /* the page: a copy of the chosen record's tile that flies out and opens into the chain's page */
  var pSet = k.tileSet([{ kind: 'page', glyph: 'doc', link: false }], { panel: true, noShadow: true });

  /* ---------- the mark at the hub ---------- */
  var mark = new THREE.Group(), MR = HUB.R * .2;
  var disc = new THREE.Mesh(new THREE.CylinderGeometry(MR, MR, MR * .16, 48).rotateX(Math.PI / 2),
    new THREE.MeshPhysicalMaterial({ roughness: .4, metalness: .3, clearcoat: .6, clearcoatRoughness: .2 }));
  var rim = new THREE.Mesh(new THREE.TorusGeometry(MR * 1.02, MR * .045, 12, 64), new THREE.MeshBasicMaterial());
  var face = new THREE.Mesh(new THREE.PlaneGeometry(MR * 1.32, MR * 1.32), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0 }));
  face.position.z = MR * .09; rim.position.z = MR * .02;
  mark.add(disc, rim, face); mark.rotation.x = -HOME_ELEV * D2R;
  mark.position.set(HUB.c.x, HUB.t * MID, HUB.c.z);
  disc.castShadow = true;
  k.scene.add(mark);
  if (window.DEFXN_MARK) {
    var img = new Image();
    img.onload = function () {
      /* the mark's shape as a white mask: the colour comes from the theme (--signal) */
      var cv = document.createElement('canvas'); cv.width = cv.height = 256;
      var g = cv.getContext('2d'); g.drawImage(img, 16, 16, 224, 224);
      g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256);
      face.material.alphaMap = new THREE.CanvasTexture(cv); face.material.opacity = 1; face.material.needsUpdate = true;
      k.redraw();
    };
    img.src = window.DEFXN_MARK;
  }

  /* ---------- an empty logo slot at the centre of every ring (owner, 2026-10-23: "leave space for
     the logo, empty until I give you the logos"). A dark disc with a dashed rim faces the camera;
     a logo named in network-data.js LOGOS is drawn on the disc instead of the empty face. ---------- */
  /* the slots sit on the outer rings. A network's slot sits inside its coin's ledger, so it is smaller */
  var SLOTS = rings.filter(function (r) { return r.i !== N.HUB && !r.parent; }), DASH = 22;
  SLOTS.forEach(function (r) { r.sr = r.kind === 'network' ? r.R * .17 : Math.min(r.R * .42, r.t * 1.1); });   /* small, so it hides none of the chains inside */
  var slotDisc = k.instanced(new THREE.CylinderGeometry(1, 1, .12, 40).rotateX(Math.PI / 2),
    new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: .62, depthWrite: false }), SLOTS.length, false);   /* unlit and dark: an empty slot, not a plate; dark glass now, so a chain's mark on the grid shows through it */
  var slotDash = k.instanced(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ toneMapped: false }), SLOTS.length * DASH, false);
  var logoFaces = {};
  SLOTS.forEach(function (r) {
    var src = N.LOGOS && N.LOGOS[N.IDS[r.i]];
    if (!src) return;
    var face = new THREE.Mesh(new THREE.CircleGeometry(.86, 48), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0 }));
    var im = new Image();
    im.onload = function () { face.material.map = new THREE.Texture(im); face.material.map.needsUpdate = true; face.material.map.colorSpace = THREE.SRGBColorSpace; face.material.opacity = 1; face.material.needsUpdate = true; k.redraw(); };
    im.src = src; k.scene.add(face); logoFaces[r.i] = face;
  });
  /* ---------- under each floating chain: its shadow and its echo on the grid (2026-10-25) ----------
     Seen from above, a hover only reads by what it leaves on the ground. Each chain that floats has a soft dark ring
     of shade on the grid under it and a thin lit circle, its echo, in its own colour: the gap between the chain and
     its echo is the height it floats at, and it widens when the chain rises for its own page. */
  var FLOATS = OUTER.filter(function (r) { return r !== HUB; });
  var echo = k.instanced(new THREE.RingGeometry(.97, 1, 96, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .4 }), FLOATS.length, false);
  var shade = k.instanced(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, depthWrite: false, opacity: .5 }), FLOATS.length, false);
  echo.renderOrder = 1; shade.renderOrder = 1;
  (function () {
    /* a soft band of shade where the ring's tiles are, clear in the middle: drawn grey on black (an alpha map reads green) */
    var cv = document.createElement('canvas'); cv.width = cv.height = 128;
    var g = cv.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.fillStyle = '#000'; g.fillRect(0, 0, 128, 128);
    gr.addColorStop(0, 'rgb(40,40,40)'); gr.addColorStop(.62, 'rgb(70,70,70)'); gr.addColorStop(.8, 'rgb(200,200,200)'); gr.addColorStop(.9, 'rgb(120,120,120)'); gr.addColorStop(1, 'rgb(0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    shade.material.alphaMap = new THREE.CanvasTexture(cv);
  })();
  function paintEcho(dims) {
    FLOATS.forEach(function (r, i) {
      var tone = famOf[r.i] || k.C[r.kind] || k.C.muted;
      echo.setColorAt(i, slotCol.copy(tone).multiplyScalar(.6 * (1 - (dims ? dims[r.i] : 0))));
    });
    if (echo.instanceColor) echo.instanceColor.needsUpdate = true;
  }
  var slotCol = new THREE.Color();
  function paintSlots(dims) {
    paintEcho(dims);
    SLOTS.forEach(function (r, i) {
      var f = 1 - (dims ? dims[r.i] : 0);
      slotDisc.setColorAt(i, slotCol.copy(k.mix('canvas', 'other', .22)).multiplyScalar(f));
      var tone = r.kind === 'network' ? k.C.network : r.kind === 'identity' ? k.C.identity : k.C.muted;
      for (var q = 0; q < DASH; q++) slotDash.setColorAt(i * DASH + q, slotCol.copy(tone).multiplyScalar(.85 * f));
    });
    if (slotDisc.instanceColor) slotDisc.instanceColor.needsUpdate = true;
    if (slotDash.instanceColor) slotDash.instanceColor.needsUpdate = true;
  }

  /* ---------- cubes on stems ---------- */
  var CUBE = .5, LIFTC = 1.7;
  var cubes = N.CUBES.map(function (c, i) {
    var p = k.at(c[0] / N.W, c[1] / N.H, LIFTC + CUBE / 2);
    return { p: V(p.x, LIFTC, p.z), tone: c[2], at: 2600 + i * 60 };
  });
  var cubeMesh = k.instanced(new window.DEFXNDependencies.RoundedBoxGeometry(CUBE, CUBE, CUBE, 2, .06),
    new THREE.MeshPhysicalMaterial({ roughness: .45, clearcoat: .3, envMapIntensity: .8 }), cubes.length, true);
  var cubeTone = { L: 'identity', T: 'signal', D: 'other' };
  var cubeDim = 0, cubeColor = new THREE.Color();
  function paintCubes() {
    cubes.forEach(function (c, i) { cubeMesh.setColorAt(i, cubeColor.copy(k.C[cubeTone[c.tone]] || k.C.identity).lerp(k.C.canvas, cubeDim)); });
    if (cubeMesh.instanceColor) cubeMesh.instanceColor.needsUpdate = true;
  }
  k.onPaint(function (C) {
    paintCubes(); paintSlots(null); lastDims = '';
    disc.material.color.copy(k.mix('canvas', 'other', .35));
    rim.material.color.copy(C.signal).multiplyScalar(1.9);
    face.material.color.copy(C.signal).multiplyScalar(2.2);
  });

  /* ---------- lines, orbits, pearls, label leaders (all derived) ---------- */
  function flat(a, b) { var dx = a.x - b.x, dz = a.z - b.z; return Math.sqrt(dx * dx + dz * dz); }
  function segDist(c, a, b) {
    var abx = b.x - a.x, abz = b.z - a.z, l2 = abx * abx + abz * abz;
    var u = l2 ? Math.min(1, Math.max(0, ((c.x - a.x) * abx + (c.z - a.z) * abz) / l2)) : 0;
    var dx = a.x + abx * u - c.x, dz = a.z + abz * u - c.z;
    return Math.sqrt(dx * dx + dz * dz);
  }
  function clear(a, b, skipA, skipB) {
    for (var i = 0; i < rings.length; i++) if (i !== skipA && i !== skipB && segDist(rings[i].c, a, b) < rings[i].outer + .2) return false;
    return true;
  }
  function rim2(r, toward, pad) { var d = V(toward.x - r.c.x, 0, toward.z - r.c.z).normalize(); return r.c.clone().addScaledVector(d, r.outer + (pad || .15)); }
  var LINES_AT = 2300, paths = [], balls = [], seen = {};
  function line(a, b, at) {
    paths.push({ pts: [a, b], at: at, dur: 600 });
    balls.push({ p: a.clone().lerp(b, .5), r: .09, lit: false, at: at + 300 });
  }
  /* spokes: the hub to every ring it can see (rings inside a network are reached through it) */
  OUTER.forEach(function (r) {
    if (r === HUB) return;
    var a = rim2(HUB, r.c), b = rim2(r, HUB.c);
    if (clear(a, b, HUB.i, r.i)) { seen[HUB.i + '-' + r.i] = 1; line(a, b, LINES_AT + flat(a, HUB.c) * 40); }
  });
  /* each ring to its two nearest rings */
  OUTER.forEach(function (r) {
    if (r === HUB) return;
    OUTER.filter(function (s) { return s !== r && s !== HUB; })
      .sort(function (s1, s2) { return flat(r.c, s1.c) - flat(r.c, s2.c); }).slice(0, 2)
      .forEach(function (s) {
        var id = Math.min(r.i, s.i) + '-' + Math.max(r.i, s.i); if (seen[id]) return; seen[id] = 1;
        var a = rim2(r, s.c), b = rim2(s, r.c);
        if (clear(a, b, r.i, s.i)) line(a, b, LINES_AT + 400 + flat(a, HUB.c) * 40);
      });
  });
  /* stems under the cubes */
  cubes.forEach(function (c) {
    paths.push({ pts: [V(c.p.x, 0, c.p.z), V(c.p.x, c.p.y, c.p.z)], at: c.at - 300, dur: 400 });
    balls.push({ p: V(c.p.x, 0, c.p.z), r: .07, lit: c.tone === 'T', at: c.at - 300 });
  });
  k.dots(paths, .17, .055);
  /* orbits round the hub */
  var orbit = [];
  [1.75, 2.6].forEach(function (f, n) {
    var pts = [];
    for (var s = 0; s <= 160; s++) pts.push(V(HUB.c.x + Math.cos(s / 160 * TAU) * HUB.R * f, 0, HUB.c.z + Math.sin(s / 160 * TAU) * HUB.R * f));
    orbit.push({ pts: pts, at: 1600 + n * 300, dur: 1600, lit: .32 });
  });
  k.dots(orbit, .3, .045);
  /* inside each network: its ledger joins the chain on the near side (the ledger is worked out from
     the chain's events), and each pool joins the two tokens beside it (a pool trades a pair).
     One set of dots per network, so they go with it when it rises or sinks. */
  var inner = {};
  rings.forEach(function (r) {
    if (!r.parent) return;
    var p = r.parent, list = inner[p.i] = inner[p.i] || [];
    if (r.kind === 'ledger') [55, 90, 125].forEach(function (deg) {
      var a = deg * D2R, r0 = r.outer + .1, r1 = p.R - HALF_D * p.t - .15;
      list.push({ pts: [V(p.c.x + Math.cos(a) * r0, p.c.y, p.c.z + Math.sin(a) * r0), V(p.c.x + Math.cos(a) * r1, p.c.y, p.c.z + Math.sin(a) * r1)], at: r.at + 420, dur: 380, lit: .8 });
    });
    if (r.kind === 'pool') rings.filter(function (s) { return s.parent === p && s.kind === 'token'; })
      .sort(function (s1, s2) { return flat(s1.c, r.c) - flat(s2.c, r.c); }).slice(0, 2)
      .forEach(function (s) { list.push({ pts: [rim2(r, s.c, .06), rim2(s, r.c, .06)], at: r.at + 500, dur: 300, lit: .9 }); });
  });
  var innerDots = {};
  Object.keys(inner).forEach(function (pi) { innerDots[pi] = k.dots(inner[pi], .1, .045, 'signal'); });
  /* kind labels: each sits on a callout spot of the picture, with a leader to the nearest thing
     it names (a ring of its kind, or for "Computers" a cube's stem); the FXN chain's label sits
     over the mark itself */
  /* (2026-10-23, owner: "from home I want to see each kind") each kind's label now sits on the
     ring of that kind nearest the hub, where the screen is open, so every kind shows; the
     computers' label sits on the cube nearest the hub. No leader is needed. */
  var labels = [];
  /* every ring of a kind offers a spot; the page keeps the one that lands in the open screen
     (ring-view.js), so each kind shows on whatever layout the screen has */
  ['identity', 'network', 'resolver', 'token', 'pool'].forEach(function (kd) {
    rings.forEach(function (ring) {
      if (ring.kind !== kd) return;
      /* a chain inside a network is named at the network's edge, beside it, never over the centre */
      if (ring.parent) { var e = rim2(ring.parent, ring.c, .3); labels.push({ kind: kd, p: V(e.x, ring.parent.c.y + ring.parent.t * 1.2, e.z), to: null }); return; }
      labels.push({ kind: kd, p: V(ring.c.x - ring.R * .9, ring.c.y + ring.t * 1.55, ring.c.z - ring.R * .35), to: null });   /* over its top left */
      labels.push({ kind: kd, p: V(ring.c.x + ring.outer + .25, ring.c.y + ring.t * .9, ring.c.z), to: null });            /* beside its right side */
    });
  });
  cubes.forEach(function (c) { labels.push({ kind: 'computers', p: V(c.p.x + .35, c.p.y + .55, c.p.z), to: null }); });
  /* the DEFXN kernel's label sits over the back of its ring */
  labels.push({ kind: 'fxn', p: V(HUB.c.x, HUB.t * 1.75, HUB.c.z - HUB.R * 1.05), to: null });
  k.dots(labels.filter(function (l) { return l.to; }).map(function (l) {
    return { pts: [l.p, l.to], at: 3600, dur: 500, lit: .7 };
  }), .14, .05, 'signal');
  k.balls(balls);
  k.shadow(HUB.c, 120, .38);

  var SLOTP = new THREE.Vector3(), DP = new THREE.Vector3(), DQ = new THREE.Quaternion(), DZ = new THREE.Quaternion(), ZAX = new THREE.Vector3(0, 0, 1);
  /* for the ring pages (ring-view.js): which ring rises, where a ring's top is on screen;
     merged into api.world once it exists */
  var ringApi = { ringRise: ringRise, ringList: rings, hoverRing: -1, cubes: cubes.map(function (c) { return c.p; }), riseH: riseH };
  /* which: a function from ring index to true or false, or null for no focus; cubes: light the computers */
  ringApi.focusOn = function (which, cubes) {
    for (var i = 0; i < rings.length; i++) focusWant[i] = which && which(i, rings[i].kind) ? 1 : 0;
    cubeWant = cubes ? 1 : 0; k.wake(700); k.moved(700);
  };
  ringApi.ringTop = function (ri) {
    var r = rings[ri]; if (!r) return null;
    return k.project(SLOTP.set(r.c.x, r.c.y + ringUp(r) + r.t * 1.35, r.c.z), {});
  };
  /* how high a ring stands this frame: its own hover lift, focus and rise, plus its parent's
     (a network lifts with everything inside it), less the hub's sink on the FXN page */
 /* a floating chain lifts off the grid as it builds, and comes back down when the build clock is wound back
     (download-stage.js); a chain inside a network rides with it */
  var buildMs = 0, YC = V(0, 0, 0);
  function liftOff(r) { return r.parent || r === HUB ? 1 : ease.inOut(clamp01((buildMs - r.at - RING_FOR * .5) / 900)); }
  function ringUp(r) {
    var up = (r.parent || r === HUB ? 0 : -(1 - liftOff(r)) * r.c.y) + r.t * .32 * ease.glide(ringLift[r.i]) + r.t * .5 * ease.glide(ringFocus[r.i]) + (r === HUB ? 0 : ringRise[r.i] * riseH(r));
    if (r.parent) up += ringUp(r.parent);
    if (r === HUB && api.world && api.world.hubSink) up -= api.world.hubSink;   /* its chains inside sink with it, through ringUp(parent) */
    return up;
  }

  /* ---------- your key: the identity that signs your chain (the person at the ring's centre, panel 02) ---------- */
  var KR = TC * .45, key = new THREE.Group();
  /* (2026-10-23, "cyber pro") your key is a sharp hexagonal badge with a lit edge, not a round plate */
  var kDisc = new THREE.Mesh(new THREE.CylinderGeometry(KR, KR, KR * .16, 6).rotateX(Math.PI / 2),
    new THREE.MeshPhysicalMaterial({ roughness: .45, metalness: .35, clearcoat: .4, clearcoatRoughness: .25, flatShading: true }));
  var kRim = new THREE.Mesh(new THREE.TorusGeometry(KR * 1.05, KR * .028, 4, 6).rotateZ(Math.PI / 2), new THREE.MeshBasicMaterial({ toneMapped: false }));
  var kFace = new THREE.Mesh(new THREE.PlaneGeometry(KR * 1.25, KR * 1.25), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
  kFace.position.z = KR * .08; kRim.position.z = KR * .02;
  (function () {
    var cv = document.createElement('canvas'); cv.width = cv.height = 128;
    var g = cv.getContext('2d'); g.strokeStyle = '#fff'; g.lineWidth = 8; g.lineCap = 'round';
    g.beginPath(); g.arc(64, 44, 18, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(30, 104); g.bezierCurveTo(35, 80, 48, 71, 64, 71); g.bezierCurveTo(80, 71, 93, 80, 98, 104); g.stroke();
    kFace.material.alphaMap = new THREE.CanvasTexture(cv);
  })();
  key.add(kDisc, kRim, kFace); kDisc.castShadow = true; key.scale.setScalar(1e-4); key.visible = false; k.scene.add(key);
  /* the soft teal light under the chosen record (a pool on the ring's floor) */
  var pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false }));
  (function () {
    var cv = document.createElement('canvas'); cv.width = cv.height = 128;
    /* an alpha map reads the green channel, so the light is drawn grey on black, not white on clear */
    var g = cv.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.fillStyle = '#000'; g.fillRect(0, 0, 128, 128);
    gr.addColorStop(0, 'rgb(150,150,150)'); gr.addColorStop(.4, 'rgb(60,60,60)'); gr.addColorStop(1, 'rgb(0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    pool.material.alphaMap = new THREE.CanvasTexture(cv);
  })();
  pool.renderOrder = 1; pool.visible = false; k.scene.add(pool);

  /* ---------- the records' own words, edge light and earlier versions (2026-10-23, "cyber pro") ----------
     Each record tile carries its title, revision and date on its face, engraved: words the sample
     gives, nothing invented. The chosen record has a thin teal edge light. A signed record has a teal
     line along its foot, because its signature is its last field. Earlier versions are clear panes on
     a lit line, each with its revision engraved. */
  function hex(c) { return '#' + c.getHexString(); }
  var slabA = new THREE.Color(), slabB = new THREE.Color();
  k.onPaint(function () { slabA.copy(k.mix('canvas', 'other', .62)); slabB.copy(k.mix('other', 'identity', .18)); });
  function wrapWords(g, text, maxW, maxLines) {
    var words = String(text).split(' '), lines = [], line = '';
    words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line);
    return lines.slice(0, maxLines);
  }
  function drawRecord(g, w, h, r) {
    var ink = hex(k.C.strong), mute = hex(k.C.muted), sig = hex(k.C.signal), pad = 40;
    g.fillStyle = mute; g.font = '500 30px "JetBrains Mono", ui-monospace, monospace'; if ('letterSpacing' in g) g.letterSpacing = '5px';
    g.fillText(r.revision ? 'REV ' + String(r.revision).padStart(2, '0') : 'RECORD', pad, pad + 26);
    g.fillStyle = mute; g.globalAlpha = .5; g.fillRect(pad, pad + 48, w - pad * 2, 2); g.globalAlpha = 1;
    if ('letterSpacing' in g) g.letterSpacing = '-1px';
    g.fillStyle = ink; g.font = '700 66px "Inter Tight", Inter, system-ui, sans-serif';
    wrapWords(g, r.title, w - pad * 2, 3).forEach(function (l, i) { g.fillText(l, pad, pad + 140 + i * 74); });
    if ('letterSpacing' in g) g.letterSpacing = '3px';
    g.fillStyle = mute; g.font = '500 28px "JetBrains Mono", ui-monospace, monospace'; g.fillText(String(r.date || '').toUpperCase(), pad, h - pad);
    if (r.signedBy) { g.fillStyle = sig; g.fillText('SIGNED', w - pad - g.measureText('SIGNED').width, h - pad); }
  }
  var recPlates = recs.map(function (r) { return k.textPlate(.84, .84, function (g, w, h) { drawRecord(g, w, h, r); }); });
  var recEdge = k.edgeLight(nR + 1, 'signal', 1.8);   /* one per record, and one for the card */
  var panes = k.blockSet(GH, k.bevel(1, 1, .03), { shadow: false, plain: true });
  panes.mesh.material.transparent = true; panes.mesh.material.opacity = .34; panes.mesh.material.depthWrite = false; panes.mesh.material.roughness = .18; panes.mesh.renderOrder = 3;
  var paneEdge = k.edgeLight(GH, 'signal', 1.1), paneRev = [0, 0, 0], paneSel = -1;
  var panePlates = [0, 1, 2].map(function (i) {
    return k.textPlate(.84, .22, function (g, w, h) {
      if (!paneRev[i]) return;
      g.fillStyle = hex(k.C.strong); g.font = '600 64px "JetBrains Mono", ui-monospace, monospace'; if ('letterSpacing' in g) g.letterSpacing = '8px';
      g.fillText('REV ' + String(paneRev[i]).padStart(2, '0'), 24, h * .7);
    });
  });
  var FM = new THREE.Matrix4(), FX = new THREE.Matrix4(), FACE = new THREE.Matrix4().makeTranslation(0, 0, .143), HOV = new THREE.Matrix4();
  k.floor(HUB.c, 46);   /* the ground under the network and every stage above it */
  /* a tiny status light where a state is real: on each signed record's face, top right */
  var statusPts = recs.map(function () { return new THREE.Vector3(); }), statusOn = recs.map(function () { return 0; });
  /* a tile's face frame: its pose, its hover lift, its body centre, its front face */
  function faceOf(base, h, out) {
    out.copy(base); if (h > 0) out.multiply(HOV.makeTranslation(0, h * .12, 0)).multiply(FX.makeScale(1 + h * .04, 1 + h * .04, 1 + h * .04));
    return out.multiply(k.P.body).multiply(FACE);
  }
  /* the card: the chosen record's tile drawn by one mesh whose corners keep their size as it widens
     (a stretched tile would turn its corners into ovals). uExtra widens it, uR sets the corner. */
  var CARD_R0 = .13, cardU = { extra: { value: 0 }, r: { value: CARD_R0 } };
  var cardMat = new THREE.MeshPhysicalMaterial({ roughness: .5, metalness: 0, clearcoat: .3, clearcoatRoughness: .35, envMapIntensity: .8 });
  cardMat.onBeforeCompile = function (sh) {
    sh.uniforms.uExtra = cardU.extra; sh.uniforms.uR = cardU.r;
    sh.vertexShader = ['uniform float uExtra', 'uniform float uR', ''].join(';\n') +   /* GLSL, not copy */ sh.vertexShader.replace('#include <begin_vertex>',
      'vec3 hb = vec3(.5, .5, .15); vec3 inner = hb - ' + CARD_R0.toFixed(3) + ';\n' +
      'vec3 cc = clamp(position, -inner, inner); vec3 oo = position - cc;\n' +
      'vec3 edge = step(inner - 1e-4, abs(cc));\n' +
      'cc += sign(cc) * edge * (' + CARD_R0.toFixed(3) + ' - uR);\n' +
      'cc.x += sign(position.x) * uExtra;\n' +
      'vec3 transformed = cc + oo * (uR / ' + CARD_R0.toFixed(3) + ');');
  };
  var card = new THREE.Mesh(new window.DEFXNDependencies.RoundedBoxGeometry(1, 1, .3, 4, CARD_R0), cardMat);
  card.matrixAutoUpdate = false; card.visible = false; card.frustumCulled = false; k.scene.add(card);
  k.onPaint(function (C) {
    kDisc.material.color.copy(k.mix('canvas', 'other', .35));
    kRim.material.color.copy(C.signal).multiplyScalar(1.9);
    kFace.material.color.copy(C.signal).multiplyScalar(2.2);
    pool.material.color.copy(C.signal).multiplyScalar(.85);
    cardMat.color.copy(k.mix('canvas', 'other', .34));   /* the card is dark glass, as the page is (2026-10-23) */
  });
  /* the record's other links (the sample's related records), and the dotted lines of this world */
  var rSet = k.tileSet([0, 1].map(function () { return { kind: 'plain', glyph: 'doc', link: false }; }));
  var dots = k.beads(240, 'muted'), lit = k.beads(200, 'signal');
  /* the page's thin light edge: a second page a hair larger, just behind it */
  var rimSet = k.tileSet([{ kind: 'rim', glyph: 'none', link: false }], { panel: true, noShadow: true });
  api.recordParts = function () { return { sel: sel, ySet: ySet, slotOf: slotOf, edge: recEdge, card: card, cardMat: cardMat, pool: pool }; };   /* record-glass.js: the chosen record's parts, read after pose */

  /* ---------- the views ----------
     A view is a target: camera (aim, dist, elev, yaw, tilt), the screen box it is framed in, and
     its morphs: m your ring re-formed into records, j the chain's links joined, kk your key, g
     earlier versions, s the card row, l the chain laid out as a line (links), p the page slab, n the
     network stepping back, and one weight per stage (stages.js). rr is the record ring's radius and
     cs the chosen record's size, so the chain's ring is tight and the record's ring has room.
     A move eases every one of them; entering your chain they run in order (fix 6): the empty slots
     fold, the records rise and turn out, the links join oldest first, your key rises with one ring
     of light, a bead runs the chain once, then the page opens. */
  var view = 'home', sel = 0, pos = 0, earlier = 0, A = 1.9, stages = {}, NAMES = [];
  var RCR = RC, RCT = TC * 1.16;                           /* the record ring, and the chain's tight ring */
  var RINGC = V(Y.c.x, RISE, Y.c.z);                     /* your ring's centre once it has risen */
  var FRONT = RINGC.clone().add(V(0, 0, RCR + .5 * TC));  /* where the chosen record stands */
  var LSP = TC * 2.3, LC = RINGC.clone();                 /* links: the chain in a line, oldest on the left */
  var KEY_Y = TC * .7;                                    /* your key stands in the ring's centre, at the tiles' height */
  var RING = { chain: 1, record: 1, open: 1, links: 1 };
  function fit(w, h, asp, fill) { fill = fill || .86; return Math.max(w / (fill * 2 * TAN * asp), h / (fill * 2 * TAN)); }
  function base(f) { return { aim: V(0, 0, 0), dist: HOME_DIST, elev: HOME_ELEV, yaw: 0, tilt: 2.4, frame: f, m: 0, j: 0, kk: 0, ks: 1, g: 0, s: 0, l: 0, p: 0, n: 1, w: {}, pr: null, rr: RCR, cs: TS / TC, pw: .35 }; }
  function target(v) {
    var f = hooks.frame ? hooks.frame(v) : { x: 0, y: 0, w: 1440, h: 900 }, asp = f.w / f.h, t = base(f);
    if (v === 'chain') {
      var out = RCT + .5 * TC + .62 * TC, E = 32;
      Object.assign(t, { aim: RINGC.clone().add(V(0, TC * .62, TC * .2)), dist: fit(2 * (RCT * .95 + .62 * TC), (2 * RCT + .6 * TC) * Math.sin(E * D2R) + TC * 1.35 * Math.cos(E * D2R) + TC * .55, asp, .88),
        elev: E, tilt: 1.4, m: 1, j: 1, kk: 1, p: 1, rr: RCT, cs: 1.15, pw: .45 });
    } else if (v === 'record') Object.assign(t, { aim: FRONT.clone().add(V(TS * .3, TS * MID, -TS * .25)), dist: fit(TS * 3.7, TS * 1.9, asp, .92), elev: 9, tilt: 1.4, m: 1, j: 1, kk: 1, ks: .62, g: 1, p: 1 });
    else if (v === 'links') Object.assign(t, { aim: LC.clone().add(V(((nR - 1 - sel) - (nR - 1) / 2) * LSP * .3, TC * .8, TC * 1.0)), dist: fit((nR - 1) * LSP + TC * 1.6, TC * 4.6, asp, .92), elev: 24, tilt: 1.2, m: 1, j: 1, kk: 1, ks: .72, g: 1, l: 1, p: 1 });
    else if (v === 'open') { A = asp; Object.assign(t, { aim: FRONT.clone().add(V(0, TS * MID, 0)), dist: TS * .5 / TAN + HALF_D * TS, elev: 0, tilt: 0, m: 1, j: 1, s: 1 }); }
    else if (stages[v]) { Object.assign(t, stages[v].target(f, asp)); t.p = 1; t.w[v] = 1; }
    else t.n = 0;
    /* the CMS's per-view camera (ArkWorld views[route], through the host): a field it names replaces the
       view's own number, a field it leaves out keeps it */
    var ov = hooks.override ? hooks.override(v) : null;
    if (ov) {
      var ax = ov.aimX != null ? ov.aimX : t.aim.x, ay = ov.aimY != null ? ov.aimY : t.aim.y, az = ov.aimZ != null ? ov.aimZ : t.aim.z;
      t.aim = V(ax, ay, az);
      if (ov.dist != null) t.dist = ov.dist;
      if (ov.elev != null) t.elev = ov.elev;
      if (ov.yaw != null) t.yaw = ov.yaw;
      if (ov.tilt != null) t.tilt = ov.tilt;
      if (ov.dim != null) t.n = ov.dim;
    }
    if (t.p) t.pr = panelBox(v);
    NAMES.forEach(function (n) { if (!(n in t.w)) t.w[n] = 0; });
    return t;
  }
  function copy(t) {
    return Object.assign({}, t, { aim: t.aim.clone(), frame: Object.assign({}, t.frame), w: Object.assign({}, t.w), pr: t.pr ? Object.assign({}, t.pr) : null });
  }
  /* the box a view's page sits in (null for a view with no page) */
  function panelBox(v) { return hooks.panel ? hooks.panel(v) : null; }
  var cur = null, from = null, to = null, t0 = 0, DUR = 1750, CRANE = 0, ENTER = false;
  /* ArkWorld motion.flight scales every flight (1750 is the built-in cap, so the default changes nothing);
     motion.crane scales the lift on long flights (1 is as built). */
  function motion() { var m = window.ArkWorld ? ArkWorld.get().motion : null; return { flight: m ? m.flight / 1750 : 1, crane: m ? m.crane : 1 }; }
  function lerp(a, b, u) { return a + (b - a) * u; }
  function win(u, a, b) { return ease.inOut(clamp01((u - a) / (b - a))); }
  function morph(a, b, u, inA, inB, outA, outB) { return lerp(a, b, b > a ? win(u, inA, inB) : win(u, outA, outB)); }
  function step(now) {
    if (!from) return;
    var u = clamp01((now - t0) / DUR), e = ease.inOut(u);
    cur.aim.lerpVectors(from.aim, to.aim, e);
    /* even zoom speed. A long flight pulls back in the middle, so the camera passes over the network */
    cur.dist = Math.exp(lerp(Math.log(from.dist), Math.log(to.dist), e)) * (1 + CRANE * Math.sin(Math.PI * e));
    cur.elev = lerp(from.elev, to.elev, e) + CRANE * 14 * Math.sin(Math.PI * e); cur.yaw = lerp(from.yaw, to.yaw, e); cur.tilt = lerp(from.tilt, to.tilt, e);
    ['x', 'y', 'w', 'h'].forEach(function (key) { cur.frame[key] = lerp(from.frame[key], to.frame[key], e); });
    cur.frame.cx = lerp(from.frame.cx == null ? from.frame.x + from.frame.w / 2 : from.frame.cx, to.frame.cx == null ? to.frame.x + to.frame.w / 2 : to.frame.cx, e);
    cur.m = morph(from.m, to.m, u, .08, .62, .3, .85);
    cur.j = morph(from.j, to.j, u, .5, .8, 0, .3);
    cur.kk = morph(from.kk, to.kk, u, .6, .86, 0, .35);
    cur.ks = lerp(from.ks, to.ks, e); cur.rr = lerp(from.rr, to.rr, e); cur.cs = lerp(from.cs, to.cs, e);
    cur.n = morph(from.n, to.n, u, 0, .4, .3, .9);
    cur.g = morph(from.g, to.g, u, .5, 1, 0, .45);
    cur.s = morph(from.s, to.s, u, .22, .9, 0, .55);
    cur.l = morph(from.l, to.l, u, .15, .9, 0, .6);
    cur.p = morph(from.p, to.p, u, to.pw, 1, 0, to.s > from.s ? .5 : .7);
    cur.run = ENTER ? clamp01((u - .5) / .5) : 1;
    NAMES.forEach(function (n) { cur.w[n] = morph(from.w[n], to.w[n], u, .3, 1, 0, .55); });
    /* the page glides from one view's box to the next; a view with no page keeps the last box */
    var pa = from.pr || to.pr, pb = to.pr || from.pr;
    if (pa && pb) { cur.pr = cur.pr || {}; ['x', 'y', 'w', 'h'].forEach(function (key) { cur.pr[key] = lerp(pa[key], pb[key], e); }); }
    /* a page that moves to a new box glides; a page that stays (a choice inside it) does not */
    cur.glide = !to.still && from.p > .99 && to.p > .99 && pa && pb && Math.abs(pb.x - pa.x) + Math.abs(pb.y - pa.y) + Math.abs(pb.h - pa.h) > 4 ? e : 1;
    cur.dx = pa && pb ? Math.sign(pb.x - pa.x) || 1 : 1;
    if (u >= 1) { from = null; cur.run = 1; cur.glide = 1; ENTER = false; fitShadow(to); }
  }
  function apply() {
    k.cam.aim.copy(cur.aim); k.cam.dist = cur.dist; k.cam.elev = cur.elev * D2R; k.cam.yaw = cur.yaw * D2R;
    k.cam.tilt = k.reduced ? 0 : cur.tilt * D2R;
    k.setFrame(cur.frame);
  }
  function pick(st) {
    var idx = Math.max(0, recs.findIndex(function (r) { return r.id === st.r; })), r = recs[idx];
    earlier = r.earlier ? Math.min(GH, r.earlier[1] - r.earlier[0] + 1) : 0;
    return idx;
  }
  /* the ring turns to a new record on a timed ease, the same at any frame rate */
  var turn = null;
  function turnTo(now) {
    var d = wrap(sel - pos);
    if (Math.abs(d) < .001 || k.reduced) { pos = sel; turn = null; return; }
    turn = { from: pos, d: d, t0: now, dur: 420 + 110 * Math.abs(d) }; k.wake(turn.dur + 60); k.moved(turn.dur + 60);
  }
  /* returns the flight's timing, so the words can come in as the page opens (fix 29) */
  var CHAPTER = { minute: 1, resolve: 1, layers: 1, life: 1 };
  /* the intro's arrival: 1.7x the resting distance, 12 degrees higher (72 + 12 stays under the zenith), turned
     16 degrees, over 3.2 s on the kernel's in-out ease */
  var WELCOME = { dist: 1.7, elev: 12, yaw: -16, fly: 3200 };   /* How it works: one row in space */
  api.to = function (st, first) {
    var v = st.view, now = performance.now(), was = view;
    if (RING[v]) { var idx = pick(st); if (idx !== sel) { sel = idx; if (first || !RING[view]) { pos = sel; turn = null; } else turnTo(now); } }
    if (stages[v]) stages[v].set(st, cur ? cur.w[v] || 0 : 0, first);
    view = v; to = target(v);
    /* the page opens out of the new view's thing; closing, it folds back into the old one */
    to.pv = to.p > 0 ? v : (cur && cur.pv) || v;
    if (first || !cur || k.reduced) {
      /* The intro is a welcome, so it ARRIVES (owner, 2026-10-25: it opened on the grid and pulled away, "an exit
         animation, not a welcome one"). The camera starts farther out, higher and a little turned, and glides down
         and in onto the network; the words come in as it settles. Every other first view starts in place. */
      var welcome = first && v === 'intro' && !k.reduced && k.setIntro;
      if (welcome) k.setIntro(WELCOME); else if (first && v !== 'home') k.skipIntro();
      cur = copy(to); cur.run = 1; cur.glide = 1; cur.dx = 1; from = null; fitShadow(to); apply(); k.moved(100); k.start(); k.redraw();
      if (welcome) { k.wake(WELCOME.fly + 200); k.moved(WELCOME.fly + 200); return { dur: WELCOME.fly, words: WELCOME.fly * .45 }; }
      return { dur: 0, words: 0 };
    }
    from = copy(cur);
    /* a flight's length follows the camera's travel; entering your chain gets room for its story */
    var travel = from.aim.distanceTo(to.aim), zoom = Math.abs(Math.log(to.dist / from.dist));
    /* audit 4 (owner: "animations are still not good enough"): words were readable only at 2.6 s.
       Shorter flights, and the page and words start at about half the flight. */
    var mo = motion();
    DUR = Math.min(1700, Math.max(900, 900 + travel * 40 + zoom * 260)) * mo.flight;
    ENTER = to.m > from.m + .5;
    if (ENTER) DUR = 1800 * mo.flight;
    CRANE = k.reduced ? 0 : clamp01((travel - 8) / 18) * .35 * mo.crane;
    /* a pan from one chapter to the next keeps its height: the next idea in a sequence, not a new world */
    if (CHAPTER[was] && CHAPTER[v] && was !== 'minute' && v !== 'minute') CRANE = 0;
    /* so does one step of the identity flow to the next (identity-flow.js): steps 1 to 4 are a row,
       step 5 lies straight below step 4 */
    var FLOW = window.DEFXN_FLOW || [], fa = FLOW.indexOf(was), fb = FLOW.indexOf(v);
    if (fa >= 0 && fb >= 0 && Math.abs(fa - fb) === 1) CRANE = 0;
    t0 = now; k.wake(DUR + 120); k.moved(DUR + 120);
    fitShadow(from, to);
    var opens = to.p > from.p + .5, glides = to.p > .99 && from.p > .99;
    /* the card's words wait until the tile has widened into it (it widens from .22 to .9 of the
       flight), so no word stands past the card's edge while it grows (audit 3, loop 2) */
    var card = to.s > .5 && from.s < .5;
    return { dur: DUR, words: card ? DUR * .7 : opens ? DUR * (to.pw + .45 * (1 - to.pw)) : glides ? DUR * .4 : DUR * .35 };
  };
  function retarget(dur) {
    if (!cur || k.reduced) { if (cur) { cur = Object.assign(cur, copy(target(view))); apply(); } return; }
    var keep = cur.pv; from = copy(cur); to = target(view); to.pv = keep; cur.pv = keep;
    DUR = dur; ENTER = false; CRANE = 0; t0 = performance.now(); k.wake(dur + 120); k.moved(dur + 120);
  }
  /* the page's box changed size after it was measured (its styles or words came in late): in a flight the
     flight's end takes the new box; at rest the page eases onto it in 240 ms, flat, with no glide turn */
  api.refit = function () {
    if (!cur) return;
    if (from) { var pr = panelBox(view); if (pr && to) to.pr = pr; return; }
    retarget(240); if (to) to.still = true;
  };
  /* the CMS changed a view's numbers (ArkWorld views): the camera eases to the current view's new target */
  api.refresh = function (dur) { if (cur && !k.reduced) retarget(dur == null ? 500 : dur); else if (cur) retarget(0); };
  api.select = function (st) {
    if (stages[st.view]) { stages[st.view].set(st, 1, false); if (stages[st.view].aims) retarget(900); return; }
    var idx = recs.findIndex(function (r) { return r.id === st.r; });
    if (idx < 0 || idx === sel) return;
    pick(st); sel = idx; turnTo(performance.now()); k.wake(900); k.moved(900);
    if (view === 'links') retarget(800);
  };
  /* a row under the pointer in the page lifts its tile (fix 12) */
  api.hoverRecord = function (j) { ySet.force = j >= 0 && j < nR ? slotOf[j] : -1; k.wake(400); };
  /* the shadow map's area (fix 37): the whole network at home, your ring and its neighbours on the
     record views, a stage's own box; for a flight, one area that holds both ends */
  var SHC = new THREE.Vector3();
  function shadowR(t) { return t.n < .5 ? 40 : t.m > .5 ? 16 : 14; }
  function fitShadow(a, b) {
    if (!k.shadowFit || !a) return;
    if (!b) { k.shadowFit(a.aim, shadowR(a)); return; }
    SHC.copy(a.aim).lerp(b.aim, .5);
    k.shadowFit(SHC, Math.min(40, a.aim.distanceTo(b.aim) / 2 + Math.max(shadowR(a), shadowR(b))));
  }
  /* A resize eases the camera to its new fit over 240 ms instead of jumping (audit 3, fix 29). In
     the middle of a flight the flight's own end is re-aimed instead, so the flight still lands. */
  function onResize() {
    if (!hooks.frame) return;
    if (!cur) { to = target(view); to.pv = view; cur = copy(to); cur.run = 1; cur.glide = 1; cur.dx = 1; apply(); return; }
    if (from) { var keep = to.pv; to = target(view); to.pv = keep; apply(); return; }
    retarget(240);
  }
  /* A page that scrolls (tablet, phone) moves every box the 3D is glued to by the same amount, so the
     page tile and the frame move with it, in a flight too, and never drift (fix 30). */
  var lastScroll = window.scrollY || 0;
  function onScroll() {
    var y = window.scrollY || 0, dy = y - lastScroll; lastScroll = y;
    if (!cur || !dy) return;
    [cur, from, to].forEach(function (t) { if (!t) return; t.frame.y -= dy; if (t.pr) t.pr.y -= dy; });
    apply();
  }

  /* ---------- what the stages (stages.js) may use ---------- */
  function tween(v) {
    var tw = { from: v, to: v, t0: 0, dur: 1 };
    tw.get = function (now) { return lerp(tw.from, tw.to, ease.inOut(clamp01((now - tw.t0) / tw.dur))); };
    /* delay: wait for the camera, so the change happens where you can see it */
    tw.go = function (v2, dur, now, delay) {
      now = now || performance.now(); delay = k.reduced ? 0 : delay || 0;
      tw.from = tw.get(now); tw.to = v2; tw.t0 = now + delay; tw.dur = Math.max(1, k.reduced ? 1 : dur);
      k.wake(delay + tw.dur + 80); k.moved(delay + tw.dur + 80);
    };
    tw.snap = function (v2) { tw.from = tw.to = v2; tw.t0 = 0; };
    return tw;
  }
  api.world = { k: k, THREE: THREE, V: V, N: N, HUB: HUB, rings: rings, mark: mark, ease: ease, D2R: D2R, TAN: TAN, MID: MID,
    fit: fit, tween: tween, lerp: lerp, win: win, dots: dots, lit: lit, view: function () { return view; }, cur: function () { return cur; },
    homeW: function () { return homeW(); }, after: function (fn) { afters.push(fn); } };
  Object.assign(api.world, ringApi);
  /* the camera targets a stage may rely on (the minute experience, the concept stages): the hub (W.HUB), your ring
     (W.mine), the nth ring of a kind in the network's own order (W.ringOf('resolver', 0), W.ringOf('network', 1)), and
     W.fit for the distance that frames a width and a height. Each is a ring of W.ringList: .c is its centre. */
  api.world.mine = rings[N.MINE];
  api.world.ringOf = function (kind, n) {
    var seen = -1;
    for (var i = 0; i < rings.length; i++) if (N.KIND[i] === kind && ++seen === (n || 0)) return rings[i];
    return null;
  };
  /* what the concept's and the identity flow's stages share (concept-stages.js, identity-stages.js): a part that grows
     in over a span of the stage's weight, a stage's number from its state, the anchor the page tile opens from, and a
     value that follows its target and asks for frames only while it moves */
  api.world.grow = function (w, a, b) { var u = clamp01((w - a) / (b - a)); return u <= 0 ? 1e-4 : u < 1 ? ease.out(u) : 1; };
  api.world.num = function (s, lo, hi) { var n = parseInt(s, 10); return isNaN(n) ? lo : Math.min(hi, Math.max(lo, n)); };
  api.world.anchorAt = function (out, x, y, z, s) { out.pos.set(x, y - (k.LIFT + .5) * s, z); out.quat.identity(); out.s = s; };
  api.world.follower = function (n, tau) {
    var f = { v: new Float32Array(n), last: 0 };
    f.step = function (now, want) {
      var dt = f.last ? Math.min(64, now - f.last) : 16, a = k.reduced ? 1 : 1 - Math.exp(-dt / (tau || 140)), moving = false;
      f.last = now;
      for (var i = 0; i < n; i++) { var t = want(i), d = t - f.v[i]; if (Math.abs(d) > .002) { f.v[i] += d * a; moving = true; } else f.v[i] = t; }
      if (moving) { k.wake(60); k.moved(60); }
    };
    return f;
  };
  api.stage = function (def) { stages[def.name] = def; NAMES.push(def.name); };
  /* A click inside the 3D that leaves for another view (the ground logo opens the layers, a record block opens
     the record). The host that owns the pages answers through hooks.open(view, state, { replace }): the site's
     world-host.js flies to the page of that view. With no host, the mockup's address carries it (app.js reads it),
     in the keys its address uses. */
  var ADDRESS = ['r', 'tab', 'step', 'id', 'c', 'g', 'i', 's'];
  api.open = function (v, st, opts) {
    if (hooks.open) { hooks.open(v, st || {}, opts || {}); return; }
    var q = ADDRESS.filter(function (key) { return st && st[key] != null && st[key] !== ''; }).map(function (key) { return key + '=' + encodeURIComponent(st[key]); });
    var hash = '#/' + v + (q.length ? '?' + q.join('&') : '');
    if (opts && opts.replace) location.replace(hash); else location.hash = hash;
  };
  /* the hover tag: what is under the pointer, and what a click does (fix 40) */
  k.onHover = function (lab, x, y) { if (hooks.hover) hooks.hover(lab, x, y); };
  gSet.liftable = function (i) { return view === 'record' && i < earlier; };
  gSet.label = function (i) { var r = recs[sel]; return r.earlier && i < earlier ? { name: 'Rev ' + pad2(r.earlier[1] - i), act: 'Earlier version, kept on file' } : null; };
  function pad2(v) { return String(v).padStart(2, '0'); }
  ySet.label = function (q) {
    var j = yTile[q].rec; if (j < 0) return null;
    var act = view === 'home' ? 'Open your chain' : view === 'record' ? (j === sel ? 'Open' : 'Next in chain') : j === sel ? 'Open' : 'Choose';
    return { name: recs[j].title, act: act, rec: j };
  };

  /* ---------- pose: every frame while anything moves ---------- */
  var M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), E = new THREE.Euler(), SC = new THREE.Vector3();
  var tint = new THREE.Color(), homeTint = new THREE.Color(), quiet = new THREE.Color(), chainTint = new THREE.Color();
  function compose(x, y, z, yaw, s) { Q.setFromEuler(E.set(0, yaw, 0)); s = Math.max(1e-4, s); return M.compose(P.set(x, y, z), Q, SC.set(s, s, s)); }
  function wrap(d) { return ((d % nR) + nR * 1.5) % nR - nR / 2; }
  function angLerp(a, b, u) { var d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + d * u; }
  /* each record tile's pose this frame: links, ghosts, the key, labels and the page read it */
  var PX = [], PY = [], PZ = [], PA = [], PS = [], PW = [];
  var lastDim = -1, ZM = new THREE.Matrix4().makeScale(1e-4, 1e-4, 1e-4);
  k.onPaint(function () { lastDim = -1; });
  var LA = V(0, 0, 0), LB = V(0, 0, 0), LC2 = V(0, 0, 0), KUP = V(0, 0, 0), KP = V(0, 0, 0), SINKC = V(0, 0, 0);
  /* a chain link from record j0 to record j1, edge to edge, on tile q of j0 */
  function linkBetween(q, j0, j1, amt) {
    var dx = PX[j1] - PX[j0], dz = PZ[j1] - PZ[j0], d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d;
    var ax = PX[j0] + ux * PW[j0] / 2, az = PZ[j0] + uz * PW[j0] / 2, bx = PX[j1] - ux * PW[j1] / 2, bz = PZ[j1] - uz * PW[j1] / 2;
    var len = Math.hypot(bx - ax, bz - az);
    if (amt < .01 || len < .02 || (bx - ax) * ux + (bz - az) * uz < 0) { ySet.placeLink(q, ZM, 0); return; }
    Q.setFromEuler(E.set(0, Math.atan2(-(bz - az), bx - ax), 0));
    var y = (PY[j0] + PS[j0] * (LIFT + .5) + PY[j1] + PS[j1] * (LIFT + .5)) / 2 - TC * (LIFT + .5);
    /* a link grows out of the older record toward the newer one as the chain joins */
    var mx = lerp(bx, (ax + bx) / 2, ease.glide(amt)), mz = lerp(bz, (az + bz) / 2, ease.glide(amt));
    ySet.placeLink(q, M.compose(P.set(mx, y, mz), Q, SC.set(TC, TC, TC)), (len / TC + .27) * ease.glide(amt));
  }
  function pose(ms, now) {
    step(now); if (cur) apply();
    buildMs = ms;
    /* the network builds once */
    var sink = api.world.hubSink || 0;
    /* the ring under the pointer lifts as one. The ring a page is about rises out of the network */
    var hv = k.hovered(), hr = view === 'home' && hv.set === netSet && hv.j >= 0 ? net[hv.j].ri : hv.set === ySet && view === 'home' ? N.MINE : -1;
    var dt = ringLast ? Math.min(64, now - ringLast) : 16, ka = k.reduced ? 1 : 1 - Math.exp(-dt / 110), lifting = false;
    ringLast = now;
    for (var rq = 0; rq < rings.length; rq++) {
      var want = rq === hr ? 1 : 0, dd = want - ringLift[rq];
      if (Math.abs(dd) > .002) { ringLift[rq] += dd * ka; lifting = true; } else ringLift[rq] = want;
    }
    var kf = k.reduced ? 1 : 1 - Math.exp(-dt / 180), fAny = 0;
    for (var rf = 0; rf < rings.length; rf++) {
      var df = focusWant[rf] - ringFocus[rf];
      if (Math.abs(df) > .002) { ringFocus[rf] += df * kf; lifting = true; } else ringFocus[rf] = focusWant[rf];
      fAny = Math.max(fAny, ringFocus[rf]);
    }
    if (Math.abs(cubeWant - cubeFocus) > .002) { cubeFocus += (cubeWant - cubeFocus) * kf; lifting = true; } else cubeFocus = cubeWant;
    var iw = view === 'home' ? 0 : 1;
    if (Math.abs(iw - insideW) > .002) { insideW += (iw - insideW) * kf; lifting = true; } else insideW = iw;
    /* the kernel is the ground logo on every view (owner, 2026-10-24: DEFXN is the base chain kernel); its ring
       and round mark stand only on its own page, #/ring?i=defxn, where the ring page raises it */
    var hw = view === 'ring' && ringRise[HUB.i] > .01 ? 1 : 0;
    if (Math.abs(hw - hubW) > .002) { hubW += (hw - hubW) * kf; lifting = true; } else hubW = hw;
    fAny = Math.max(fAny, cubeFocus);
    if (lifting) { k.wake(60); k.moved(60); }
    api.world.hoverRing = hr;
    /* a network's inner joins stay on the floor: show them while it stands in its place */
    Object.keys(innerDots).forEach(function (pi) { var p = rings[pi]; innerDots[pi].visible = insideW > .98 && Math.abs(ringUp(p)) < .02 && ringLift[pi] < .02; });
    var upCache = [];
    net.forEach(function (tl, j) {
      var r0 = tl.ring, up = upCache[r0.i] != null ? upCache[r0.i] : (upCache[r0.i] = ringUp(r0));
      var hs = r0 === HUB ? (1 - hubW) * HUB.t * 1.6 : 0, c = up || hs ? SINKC.copy(r0.c).setY(r0.c.y + up - hs) : r0.c;
      var inW = r0.parent ? insideW : r0 === HUB ? hubW : 1;
      netSet.place(j, k.ringFrame(c, tl.ring.R, tl.theta, tl.ring.t, clamp01((ms - tl.at) / TILE_FOR) * inW, M));
      netSet.placeLink(j, k.ringFrame(c, tl.ring.R, tl.theta + tl.half, tl.ring.t, clamp01((ms - tl.at - 140) / TILE_FOR) * inW, M), .62);
    });
    var hb = clamp01((ms - 900) / 700);
    mark.scale.setScalar((hb <= 0 ? 1e-4 : ease.back(hb)) * Math.max(1e-4, hubW));
    if (cur) mark.rotation.x = -cur.elev * D2R;   /* the mark faces the camera from every height */
    cubes.forEach(function (c, i) {
      var a = clamp01((ms - c.at) / 420), s = a <= 0 ? 1e-4 : ease.back(a);
      cubeMesh.setMatrixAt(i, compose(c.p.x, c.p.y + (1 - ease.out(a)) * .8 + cubeFocus * .45, c.p.z, .3 * i, s * (1 + cubeFocus * .15)));
    });

    /* the network steps back while you look at anything but the whole; a ring that has risen
       for its own page stays lit (each tile's colour is its kind's, times its ring's share) */
    var nb = cur ? cur.n : 0, dim = nb * .62;
    var dims = [], key2 = '';
    var dimF = dim + fAny * .6 * (1 - dim);   /* a focus steps everything else back further */
    for (var rd = 0; rd < rings.length; rd++) {
      var keep = Math.max(ringRise[rd] * 1.5, ringFocus[rd], rings[rd].parent ? ringRise[rings[rd].parent.i] * 1.5 : 0);   /* a risen network keeps what is inside it lit */
      dims[rd] = Math.min(.92, dimF) * (1 - Math.min(1, keep)); key2 += dims[rd].toFixed(3) + ',';
    }
    key2 += cubeFocus.toFixed(3);
    if (key2 !== lastDims) {
      lastDims = key2;
      Object.keys(netSet.bodies).forEach(function (kd) {
        /* a network ring's own colour is its network's accent (the tint below), so its base is neutral */
        netSet.bodies[kd].material.color.copy(kd === 'hub' ? k.mix('identity', 'strong', .25) : kd === 'network' ? k.mix('identity', 'strong', .2) : k.C[kd] || k.C.other);
      });
      net.forEach(function (tl, j) {
        var fam = famOf[tl.ri], own = tl.ring.kind === 'network';   /* DeArk and CR3TV wear their accent in full; what is inside, at 40% */
        netSet.tint(j, (fam ? dimCol.copy(WHITE).lerp(fam, own ? .9 : .4) : dimCol.copy(WHITE)).multiplyScalar(1 - dims[tl.ri]));
      });
      paintSlots(dims);
    }
    /* the shadow and echo under each floating chain: the shade tightens and darkens as the chain comes down to the
       grid, the echo stays where the chain would lie */
    FLOATS.forEach(function (r, i) {
      var b = clamp01((ms - r.at) / (RING_FOR + 300)), sc = b <= 0 ? 1e-4 : ease.out(b), h = r.c.y + ringUp(r);
      echo.setMatrixAt(i, M.compose(SLOTP.set(r.c.x, .025, r.c.z), Q.identity(), SC.set(r.outer * sc, 1, r.outer * sc)));
      var sw = r.outer * (1.05 + h * .04) * sc;
      shade.setMatrixAt(i, M.compose(SLOTP.set(r.c.x, .02, r.c.z), Q.identity(), SC.set(sw, 1, sw)));
    });
    var cd = Math.min(.95, dimF * 1.2) * (1 - cubeFocus);
    if (Math.abs(cd - lastDim) > .001) { lastDim = cd; cubeDim = cd; paintCubes(); }
    /* the logo slots: at each ring's centre, facing the camera, built with the ring */
    var el = cur ? -cur.elev * D2R : 0, mGone = cur ? cur.m : 0;
    Q.setFromEuler(E.set(el, 0, 0));
    SLOTS.forEach(function (r, i) {
      var b = clamp01((ms - r.at - RING_FOR * .6) / 420), up = ringUp(r);
      var sc = r.sr * (b <= 0 ? 1e-4 : ease.back(b)) * (r.i === N.MINE ? 1 - mGone : 1) * (1 + ringRise[r.i] * .2);
      SLOTP.set(r.c.x, r.c.y + up + r.t * MID, r.c.z);
      slotDisc.setMatrixAt(i, M.compose(SLOTP, Q, SC.set(Math.max(1e-4, sc), Math.max(1e-4, sc), Math.max(1e-4, sc))));
      for (var q = 0; q < DASH; q++) {
        var a = q / DASH * TAU, rr = sc * 1.08;
        DQ.setFromEuler(E.set(el, 0, 0)).multiply(DZ.setFromAxisAngle(ZAX, a));
        DP.set(Math.cos(a) * rr, Math.sin(a) * rr, sc * .07).applyQuaternion(Q).add(SLOTP);
        slotDash.setMatrixAt(i * DASH + q, M.compose(DP, DQ, SC.set(Math.max(1e-4, sc * .02), Math.max(1e-4, sc * .16), Math.max(1e-4, sc * .02))));
      }
      var lf = logoFaces[r.i];
      if (lf) { lf.position.copy(SLOTP).addScaledVector(DP.set(0, 0, 1).applyQuaternion(Q), sc * .075); lf.quaternion.copy(Q); lf.scale.setScalar(Math.max(1e-4, sc)); }
    });

    /* your ring, floating as it builds */
    YC.copy(Y.c).setY(Y.c.y * liftOff(Y));
    if (turn) { var tu = clamp01((now - turn.t0) / turn.dur); pos = turn.from + turn.d * ease.glide(tu); if (tu >= 1) { pos = sel; turn = null; } }
    var m = cur ? cur.m : 0, s = cur ? cur.s : 0, g = cur ? cur.g : 0, l = cur ? cur.l : 0, jn = cur ? cur.j : 0;
    var rr = cur ? cur.rr : RCR, cs = cur ? cur.cs : TS / TC, fold = clamp01(m * 1.9);
    homeTint.copy(k.C.identity).lerp(k.C.signal, .4).lerp(k.C.canvas, dim * (1 - m));   /* your ring dims with the network when another world is in view */
    quiet.copy(k.mix('other', 'identity', .35));
    var wF = TS * (1 + (A - 1) * s), rowX = [], rowZ = [];
    if (s > 0) for (var jr = 0; jr < nR; jr++) {
      var rl = wrap(jr - pos), ab = Math.abs(rl), sgn = rl < 0 ? -1 : 1;
      var rx0 = sgn * (Math.min(ab, 1) * (wF / 2 + GAP * TC + TC * .45) + Math.max(0, ab - 1) * (TC * (.85 + GAP)));
      /* (audit 4) the neighbours no longer drift with the pointer: motion that only adds interest
         competes with the card, which is the one thing to read here (MOTION-SPEC.md) */
      rowX[jr] = FRONT.x + rx0; rowZ[jr] = FRONT.z - .025 * rx0 * rx0 / TC - (ab > .5 ? 3.4 * TC : 0);
    }
    for (var qq = 0; qq < nY; qq++) {
      var tl = yTile[qq], th = Math.PI / 2 + tl.slot * stepY, build = clamp01((ms - tl.at) / TILE_FOR);
      var bH = build <= 0 ? 0 : ease.back(build), dropH = (1 - ease.out(build)) * 1.4 * Y.t;
      if (tl.rec < 0) {
        /* an empty slot folds away first, flat into the floor, as your ring becomes your chain */
        ySet.place(qq, k.ringFrame(YC, Y.R, th, Y.t * (1 - ease.inOut(fold)), build, M));
        ySet.placeLink(qq, k.ringFrame(YC, Y.R, th + stepY / 2, Y.t * (1 - ease.inOut(fold)), build, M), .62);
        ySet.tint(qq, homeTint);
        continue;
      }
      var j = tl.rec, rel = wrap(j - pos), near = Math.max(0, 1 - Math.abs(rel));
      /* ring pose: home slot, morphing to the record ring; each record turns out a little after the last */
      var mj = clamp01(m * 1.25 - (nR - 1 - j) * .05), me = ease.inOut(mj);
      var thC = Math.PI / 2 - rel * stepR, theta = angLerp(th, thC, me);
      var R = lerp(Y.R, rr + .5 * TC * near, me), sc = lerp(Y.t, TC * (1 + (cs - 1) * near), me);
      var x = Y.c.x + R * Math.cos(theta), z = Y.c.z + R * Math.sin(theta), yaw = Math.PI / 2 - theta, y = lerp(Y.c.y * liftOff(Y), RISE, me) + (1 - m) * dropH;
      /* links pose: the chain in a line, oldest on the left, the chosen record pulled forward;
         it unrolls from the chosen record outward (fix 52) */
      if (l > 0) {
        var lj = clamp01(l * 1.35 - Math.abs(j - sel) * .09), le = ease.inOut(lj);
        var lx = LC.x + ((nR - 1 - j) - (nR - 1) / 2) * LSP + (LC.x - LC.x);
        x = lerp(x, lx, le); z = lerp(z, LC.z - TC * .5 + TC * 2 * near, le); y = lerp(y, RISE + TC * .25 * near, le);
        yaw = angLerp(yaw, 0, le); sc = lerp(sc, lerp(TC * 1.05, TS * .92, near), le);
      }
      /* card row pose: the records side by side, the chosen one comes to you, swings and widens */
      if (s > 0) {
        var rx = rowX[j] - FRONT.x, ryaw = Math.atan(.05 * rx / TC), rs = j === sel ? TS : TC * .85;
        x = lerp(x, rowX[j], s); z = lerp(z, rowZ[j], s); yaw = angLerp(yaw, ryaw, s); sc = lerp(sc, rs, s); y = lerp(y, RISE, s);
        if (j === sel && !k.reduced) { var sw = Math.sin(Math.PI * s); z += sw * TS * .8; yaw += sw * .5 * (pos >= sel ? 1 : -1); y += sw * TS * .12; }
      }
      var str = j === sel ? 1 + (A - 1) * s : 1;
      PX[j] = x; PY[j] = y; PZ[j] = z; PA[j] = yaw; PS[j] = sc; PW[j] = sc * str;
      ySet.place(qq, compose(x, y, z, yaw, sc * (m > 0 ? 1 : bH)));
      ySet.stretch[qq] = str;
      var wordsIn = ease.out(clamp01((m - .5) * 2.5));   /* the record's own words take the glyph's place */
      ySet.glyph[qq] = (j === sel ? 1 - s : 1) * (1 - wordsIn);
      /* the chosen record in the light; the others a step back (25% darker, 40% in the card row) */
      /* graphite data slabs (2026-10-23): the chosen one a step lighter, with its edge light; light
         engraved words read on every one */
      chainTint.copy(slabA).lerp(slabB, Math.pow(near, 1.5)).lerp(k.C.canvas, (1 - near) * (.25 * m * (1 - s) + .58 * s));
      ySet.tint(qq, tint.copy(homeTint).lerp(chainTint, m));
      ySet.noBody[qq] = j === sel && s > .002 ? 1 : 0;
      faceOf(ySet.base[qq], ySet.hov[qq], FM);
      var pw2 = wordsIn * (j === sel ? 1 - clamp01(s * 4) : 1);
      recPlates[j].place(pw2 > .01 ? FX.copy(FM).multiply(HOV.makeScale(pw2, pw2, 1)) : null);
      /* the chosen record's edge light, and a signed record's signature line */
      var edgeAmt = m * Math.pow(near, 3) * (1 - s);
      if (edgeAmt > .01) recEdge.set(j, FM, .93, .93, ease.out(edgeAmt), .016);
      else { recEdge.set(j, FM, 0, 0, 0); if (recs[j].signedBy && m > .5 && !(j === sel && s > .02)) recEdge.bar(j, 1, FM, -.16, -.43, .5 * wordsIn, .022); }
      statusOn[j] = recs[j].signedBy && !(j === sel && s > .02) ? wordsIn : 0;
      if (statusOn[j] > .01) statusPts[j].set(.38, .38, .015).applyMatrix4(FM);
      if (m < .5) ySet.placeLink(qq, k.ringFrame(YC, Y.R, th + stepY / 2, Y.t * (1 - m * 2), build, M), .62);
    }
    /* the card: the chosen tile's body, its corners kept as it widens (fix 18) */
    card.visible = s > .002;
    if (card.visible) {
      card.matrix.copy(compose(PX[sel], PY[sel], PZ[sel], PA[sel], PS[sel])).multiply(k.P.body);
      cardU.extra.value = (1 + (A - 1) * s - 1) / 2; cardU.r.value = lerp(CARD_R0, .02, ease.inOut(s));   /* angular as it opens */
    }
    recEdge.set(nR, card.visible ? FX.copy(card.matrix).multiply(FACE) : FM, card.visible ? 1 + (A - 1) * s - .03 : 0, .97, card.visible ? ease.out(clamp01((s - .55) / .45)) : 0, .012);
    /* chain links: each record links to the one before it, joined oldest first (fix 6). The newest
       links to nothing yet, so the ring has a gap where it starts and ends. */
    for (var q2 = 0; q2 < nY; q2++) {
      var j2 = yTile[q2].rec; if (j2 < 0 || m < .5) continue;
      if (j2 < nR - 1) linkBetween(q2, j2, j2 + 1, clamp01(jn * nR - (nR - 2 - j2))); else ySet.placeLink(q2, ZM, 0);
    }
    /* earlier versions behind the chosen record */
    gSet.show(false);
    if (paneSel !== sel) {   /* each pane's revision, from the record's earlier range */
      paneSel = sel; var rr0 = recs[sel];
      for (var pi = 0; pi < GH; pi++) { paneRev[pi] = rr0.earlier && pi < earlier ? rr0.earlier[1] - pi : 0; panePlates[pi].redraw(); }
    }
    dots.begin(); lit.begin();
    for (var sj = 0; sj < nR; sj++) if (statusOn[sj] > .01) lit.line(statusPts[sj], statusPts[sj], 1, statusOn[sj], .03 * (PS[sj] || TC));
    var prevC = null;
    for (var i = 0; i < GH; i++) {
      var gi = i < earlier ? g : 0, bs = PS[sel] || TS, psc = bs * (.86 - .13 * i) * ease.out(gi);
      if (gi <= .01) { panes.place(i, ZM); paneEdge.set(i, ZM, 0, 0, 0); panePlates[i].place(null); continue; }
      /* older is smaller, higher and further back, along one curve */
      var pxx = PX[sel] - bs * (.7 + .52 * i) * gi, pyy = PY[sel] + bs * (.1 + .22 * i) * gi, pzz = PZ[sel] - bs * (.6 + .5 * i) * gi, pyaw = (.3 + .08 * i) * gi;
      FM.copy(compose(pxx, pyy, pzz, pyaw, psc)).multiply(k.P.body);
      panes.place(i, FX.copy(FM).multiply(HOV.makeScale(1, 1, 1)));
      panes.tint(i, tint.copy(k.mix('canvas', 'signal', .22)));
      FX.copy(FM).multiply(HOV.makeTranslation(0, 0, .02));
      paneEdge.set(i, FX, .98, .98, gi, .01);
      panePlates[i].place(FX.clone().multiply(HOV.makeTranslation(-.02, .3, .005)));
      var cpt = LB.set(pxx, pyy + psc * (k.LIFT + .5), pzz).clone();
      lit.line(prevC || LA.set(PX[sel], PY[sel] + bs * (k.LIFT + .5), PZ[sel] - bs * .2), cpt, 7, gi, .022);
      lit.line(cpt, cpt, 1, gi, .045);
      prevC = cpt;
    }
    /* your key: above the ring's centre while you look at your chain; above the record in links */
    var kk = cur ? cur.kk * (1 - s) : 0, ks = cur ? cur.ks : 1, r0 = recs[sel], elev = (cur ? cur.elev : 0) * D2R;
    key.visible = kk > .01;
    if (key.visible) {
      KP.set(RINGC.x, RISE + KEY_Y * ks, RINGC.z).lerp(LA.set(PX[sel], PY[sel] + PS[sel] * 1.75, PZ[sel] - TC * .2), l);
      var rise = ease.out(clamp01(kk * 1.2));
      key.position.set(KP.x, KP.y - (1 - rise) * TC * 1.2, KP.z);
      key.scale.setScalar(Math.max(1e-4, ks * ease.back(clamp01(kk * 1.3 - .3))));
      key.rotation.set(-elev, 0, 0);
      /* one ring of light leaves the key as it lands, then it is gone */
      var run = cur ? cur.run : 1, pp = clamp01(run * 1.7);
      if (pp > 0 && pp < 1) {
        KUP.set(0, Math.cos(elev), -Math.sin(elev));
        for (var b = 0; b < 40; b++) {
          var a = b / 40 * TAU, rp = KR * ks * (1.1 + 1.7 * ease.out(pp));
          LC2.set(key.position.x + Math.cos(a) * rp, key.position.y + KUP.y * Math.sin(a) * rp, key.position.z + KUP.z * Math.sin(a) * rp);
          lit.line(LC2, LC2, 1, 1, .045 * Math.sin(Math.PI * pp));
        }
      }
    }
    /* one bead runs the chain once, oldest to newest, and stops at the newest record (fix 7) */
    var br = cur ? clamp01(((cur.run || 1) - .22) / .78) : 1;
    if (m > .9 && br > 0 && br < 1) {
      var fpos = br * (nR - 1), seg = Math.min(nR - 2, Math.floor(fpos)), fu = fpos - seg, ja = nR - 1 - seg, jb = ja - 1;
      LC2.set(lerp(PX[ja], PX[jb], fu), lerp(PY[ja] + PS[ja] * (LIFT + .5), PY[jb] + PS[jb] * (LIFT + .5), fu), lerp(PZ[ja], PZ[jb], fu));
      lit.line(LC2, LC2, 1, 1, .085 * Math.sin(Math.PI * br));
    }
    /* the light under the chosen record */
    var pw = m * (1 - s) * (1 - l) * (view === 'record' ? .6 : 1);
    pool.visible = pw > .01;
    if (pool.visible) {
      var psz = PS[sel] * 1.9 * ease.out(clamp01(pw * 1.4 - .4));
      pool.position.set(PX[sel], PY[sel] + .01, PZ[sel]); pool.scale.set(psz, 1, psz * .8); pool.rotation.y = PA[sel];
    }
    /* related records (links): two small tiles in front, joined to the chosen one by dots that draw
       in after the line has settled (fix 55) */
    var rw = l * (r0.links ? 1 : 0), dr = clamp01((rw - .75) * 4);
    rSet.show(rw > .01);
    for (var ri = 0; ri < 2; ri++) {
      var on = r0.links && ri < r0.links.length ? rw : 0, sgn2 = ri ? 1 : -1;
      var rxp = PX[sel] + sgn2 * TC * 1.6, rzp = PZ[sel] + TC * 2.1, ryp = RISE - TC * .25;
      rSet.place(ri, compose(rxp, ryp, rzp, -sgn2 * .25, on < .01 ? 0 : TC * .72 * ease.back(clamp01(on * 1.3 - .3))));
      rSet.tint(ri, quiet);
      if (on > .5) dots.line(LA.set(PX[sel], PY[sel] + PS[sel] * .25, PZ[sel] + PS[sel] * HALF_D),
        LB.set(rxp, ryp + TC * .72 * .6, rzp - TC * .2), 9, clamp01(dr * 2 - ri), .032);
    }
    if (l > .5 && r0.signedBy) lit.line(LA.set(PX[sel], PY[sel] + PS[sel] * 1.55, PZ[sel] - TC * .2),
      LB.set(PX[sel], PY[sel] + PS[sel] * (LIFT + 1.1), PZ[sel]), 6, clamp01((l - .5) * 2), .035);
    /* links: a chevron on each link points to the older record (fix 54) */
    if (l > .5) for (var cj = 0; cj < nR - 1; cj++) {
      var cx = (PX[cj] + PX[cj + 1]) / 2, cz = (PZ[cj] + PZ[cj + 1]) / 2, cy = (PY[cj] + PY[cj + 1]) / 2 + TC * (LIFT + .5) + TC * .22;
      var dxs = Math.sign(PX[cj + 1] - PX[cj]) || -1, rv = clamp01((l - .6) * 2.5 - cj * .1);
      dots.line(LA.set(cx + dxs * TC * .1, cy, cz), LB.set(cx - dxs * TC * .02, cy + TC * .09, cz), 3, rv, .022);
      dots.line(LA.set(cx + dxs * TC * .1, cy, cz), LB.set(cx - dxs * TC * .02, cy - TC * .09, cz), 3, rv, .022);
    }
    /* the other worlds */
    NAMES.forEach(function (n) { stages[n].pose(cur ? cur.w[n] || 0 : 0, ms, now); });
    dots.end(); lit.end();
  }

  /* ---------- the page tile: from the thing that opened to the page's box ---------- */
  var anchorQ = new THREE.Quaternion(), GQ = new THREE.Quaternion(), GUP = new THREE.Vector3(), GFWD = new THREE.Vector3();
  var anchorP = new THREE.Vector3(), page = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), s: 1, stretch: 1 };
  var anc = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), s: 1 };
  var PM = new THREE.Matrix4(), PSv = new THREE.Vector3(), ZERO = new THREE.Matrix4().makeScale(1e-4, 1e-4, 1e-4), RP = new THREE.Vector3();
  /* where the page starts: the chosen record's tile as it stands now, or the stage's own thing */
  function anchorOf(v) {
    if (stages[v] && stages[v].anchor) { stages[v].anchor(anc); return; }
    anc.pos.set(PX[sel], PY[sel], PZ[sel]); anc.quat.setFromEuler(E.set(0, PA[sel] || 0, 0)); anc.s = PS[sel] || TS;
  }
  function placePage() {
    var p = cur ? cur.p : 0;
    pSet.show(p > .001); rimSet.show(p > .9);
    if (p < .001 || !cur.pr) { pSet.place(0, ZERO); rimSet.place(0, ZERO); return; }
    anchorOf(cur.pv || view);
    anchorP.copy(anc.pos); anchorQ.copy(anc.quat);
    /* where it ends: laid over the page's box, close to the camera, so nothing passes in front of it */
    var e = ease.inOut(p), open = clamp01((p - .55) / .45), dz = 1 - .9 * ease.inOut(open);   /* the cube thins into a sheet as it opens */
    k.panel(cur.pr, Math.max(3, cur.dist * .22), page, dz);
    P.copy(anchorP).lerp(page.pos, e); P.y += Math.sin(Math.PI * e) * TC * 1.6;   /* it lifts out in an arc */
    Q.copy(anchorQ).slerp(page.quat, e);
    /* page to page it glides with a slight turn and lift, then settles flat (fix 30) */
    var gl = cur.glide == null ? 1 : cur.glide, gs = Math.sin(Math.PI * gl);
    if (gs > .001 && !k.reduced) {
      k.camera.getWorldDirection(GFWD); GUP.set(0, 1, 0).applyQuaternion(k.camera.quaternion);
      Q.premultiply(GQ.setFromAxisAngle(GUP, gs * 6 * D2R * cur.dx));
      P.addScaledVector(GUP, gs * page.s * .035);
    }
    var sc = lerp(anc.s, page.s, e);
    PM.compose(P, Q, PSv.set(sc, sc, sc * dz));
    pSet.place(0, PM);
    pSet.stretch[0] = 1 + (page.stretch - 1) * ease.inOut(open);
    pSet.glyph[0] = 1 - clamp01((p - .3) / .4);
    /* the rim: 1.5 css pixels larger all round, a little thinner, so only its edge shows */
    var ep = 1.5 / Math.max(40, cur.pr.h), rs = sc * (1 + 2 * ep);
    RP.set(0, 1, 0).applyQuaternion(Q);
    PM.compose(LA.copy(P).addScaledVector(RP, -(LIFT + .5) * sc * 2 * ep), Q, PSv.set(rs, rs, sc * dz * .9));
    rimSet.place(0, PM);
    rimSet.stretch[0] = (pSet.stretch[0] + 2 * ep) / (1 + 2 * ep); rimSet.glyph[0] = 0;
  }

  /* ---------- labels follow the camera ---------- */
  var TP = new THREE.Vector3();
  function linkTags() {
    /* the chosen record's name sits at its right side, clear of the dotted lines below it (fix 53) */
    var out = recs.map(function (r, j) { return { id: 'rec-' + r.id, p: j === sel ? V(PX[j] + PW[j] * .55, PY[j] + PS[j] * (LIFT + .5), PZ[j]) : TP.set(PX[j], PY[j] - PS[j] * .12, PZ[j] + PS[j] * .2).clone(), on: true }; });
    if (earlier) out.push({ id: 'ghosts', p: V(PX[sel] - PS[sel] * 1.05, PY[sel] + PS[sel] * 1.45, PZ[sel] - PS[sel] * .9), on: true });
    out.push({ id: 'key', p: V(PX[sel] + PS[sel] * .5, PY[sel] + PS[sel] * 1.9, PZ[sel] - TC * .2), on: true });
    [0, 1].forEach(function (ri) {
      var sg = ri ? 1 : -1;
      out.push({ id: 'rel-' + ri, p: V(PX[sel] + sg * TC * 1.6, RISE - TC * .32, PZ[sel] + TC * 2.15), on: !!(recs[sel].links && recs[sel].links[ri]) });
    });
    return out;
  }
  /* the chain's labels: your key, and the chain's two ends (fixes 5, 8) */
  function chainTags() {
    var on = cur && cur.j > .97 && cur.kk > .95;
    return [
      { id: 'key', p: V(RINGC.x + RCT * .55, RISE + TC * (LIFT + 1.2), RINGC.z - RCT * .8), on: on },
      { id: 'oldest', p: V(PX[nR - 1], PY[nR - 1] - PS[nR - 1] * .08, PZ[nR - 1] + PS[nR - 1] * .2), on: on && pos === sel },
      { id: 'newest', p: V(PX[0], PY[0] - PS[0] * .08, PZ[0] + PS[0] * .2), on: on && pos === sel }
    ];
  }
  /* the record's labels: its earlier versions and the next record (fixes 84, 85) */
  function recordTags() {
    var out = [], bs = PS[sel] || TS;
    if (sel + 1 < nR) out.push({ id: 'next', p: V(PX[sel + 1], PY[sel + 1] + PS[sel + 1] * (LIFT + 1.12), PZ[sel + 1]), on: cur && cur.g > .95 && pos === sel });
    return out;
  }
  /* home's own 3D (home-descent.js) runs once the camera is placed, so what it glues to the screen
     does not trail the camera by a frame */
  var afters = [];
  function homeW() { return cur ? clamp01(1 - (cur.p + cur.m + cur.n)) : 1; }
  function after(ms, now) {
    placePage();
    afters.forEach(function (fn) { fn(ms, now); });
    if (!hooks.labels) return;
    hooks.labels(labels.map(function (l) { var p = k.project(l.p, {}); return { kind: l.kind, x: p ? p.x : -999, y: p ? p.y : -999 }; }));
    if (!hooks.tags) return;
    var list = view === 'links' ? linkTags() : view === 'chain' ? chainTags() : view === 'record' ? recordTags() : view === 'home' && api.homeTags ? api.homeTags() : stages[view] && stages[view].tags ? stages[view].tags() : [];
    var w = view === 'links' ? (cur ? cur.l : 0) : RING[view] ? (cur ? cur.m : 0) : view === 'home' ? homeW() : cur && cur.w[view] != null ? cur.w[view] : 0;
    hooks.tags(view, list.map(function (t) { var p = k.project(t.p, {}); return { id: t.id, x: p ? p.x : -999, y: p ? p.y : -999, on: t.on && w > .92 }; }));
  }

  /* for checking in a browser console */
  api.debug = function () { return { view: view, p: cur && cur.p, m: cur && cur.m, l: cur && cur.l, j: cur && cur.j, w: cur && cur.w, dur: DUR, pos: page.pos.toArray(), cam: k.camera.position.toArray() }; };
  /* a page that scrolls (phones) moves the boxes the page tile and card are glued to: draw again */
  api.nudge = function () { onScroll(); k.wake(40); };
  /* the app sets its hooks and the stages register, then the world starts */
  api.go = function () { k.go(); };
})();

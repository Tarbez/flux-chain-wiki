/* The 3D of /auth (owner, 2026-10-25, docs/design/auth/): your FXN ID card, standing over the kernel's ground logo
   on its beam, with glass status panels beside it, orbit rings round it and cubes floating near it. The card's look
   is the sign-in state the page reads (js/pages/auth.js); the page chooses it with
   ArkWorldHost.select({ view: 'auth', s: <state>, net: <network name> }):
     none       the card stands dark and still, its mark dim: no file is open
     file       the card lifts and its edge lights: a file is being read
     verify     two orbit rings turn round the card and the beam rises: the file is opening (they turn only while
                the session is busy, then settle)
     connected  the card is bright, one orbit ring stays round it, the cubes gather close: you are signed in
     missing    the card tips over, its glow goes out, a warning mark shows on its face and a corner breaks into
                cubes: saved details, no file
     create     a new card is being made: it stands small and faint, its pieces loose round its corner
     words      the pieces fly in and the card grows: the file exists, its recovery words are on screen
     saved      the card is whole and lit, one orbit ring round it: the file is saved, ready to choose
     fail       a refused file (the page's failure screens): the card's edge turns --danger, it leans and cracks, and
                the warning shows on its face
     offline    signed in, but this device is offline: the connected card, its edge half --danger, the cubes drift out
     ended      signed out, details forgotten, or a kept sign-in lost: the card stands dark and the beam goes out
   Built from parts with real overlap and transparency: the card's body is translucent glass (its edge light and
   mark show through it), the orbit rings pass in front of and behind it, and each glass status panel is ONE
   THREE.Shape with real holes (js/world/glass-kit.js): one round port per status line, a lit bead behind each port
   showing through it. The panels' words are the state's own facts, never a reading the page did not make.
   Motion answers a change and settles (js/pages/home-flow.js's contract): a value eases to its state's target and
   asks for frames only while it moves; reduced motion takes each state at once. */
(function () {
  'use strict';
  var S = window.DEFXNScene;
  if (!S || !S.ok || !S.world || !S.glass) return;
  var W = S.world, k = W.k, THREE = W.THREE, V = W.V, G = S.glass, N = W.N;
  var HUBC = W.HUB.c, TAU = Math.PI * 2;
  var STATES = ['none', 'file', 'verify', 'connected', 'missing', 'create', 'words', 'saved', 'fail', 'offline', 'ended'];
  var state = 'none', net = '', cb = 0, ic = '', changedAt = 0, holding = false;

  /* ---- sizes: the card stands on the ground logo's beam (home-descent.js W.lightBeam, 7.5 tall) ---- */
  /* sized from the design: the card is about 0.65 of the ground logo's width tall, and floats about a third of its
     height above it; HUB.R is the kernel's radius (about 4.6) */
  var RH = W.HUB.R, CH = RH * 1.32, CW = CH * .7, CD = CH * .1, CY = CH * .5 + RH * .5, PS = RH * .42;   /* card height, width, depth, centre height; panel scale */

  /* ---- colours, from the theme (base = --primary; meaning tokens for warning and danger) ---- */
  var C = { primary: new THREE.Color(), deep: new THREE.Color(), dark: new THREE.Color(), steel: new THREE.Color(), danger: new THREE.Color(), live: new THREE.Color() };
  function tones() {
    C.primary.copy(G.color('primary', 0xff8e59)); C.deep.copy(G.color('primary-300', 0x5a3424));
    C.dark.copy(k.mix('canvas', 'other', .3)); C.steel.copy(k.mix('canvas', 'muted', .45));
    C.danger.copy(G.color('danger', 0xd26a5f)); C.live.copy(G.color('live', 0x6fb3cf));
  }
  tones(); k.onPaint(function () { tones(); drawFace(); drawPanels(); });

  var root = new THREE.Group();   /* the whole stage; the glass kit fades it in on this view and out on every other */
  function base(mesh, opacity) { mesh.material.transparent = true; mesh.userData.base = opacity; return mesh; }
  function glowMat() { return new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, depthWrite: false }); }

  /* ---------- the card ----------
     Two shapes of one card. The plain FXN ID card stands tall (the design's); when the visitor holds a PVA card (the
     NFT session's card: their PVA on the chain, or a review sample named in the address), the card turns into that
     card's own wide shape (10 : 7) and wears its real front, the picture DefxnCard.toCanvas makes (js/nft/card.js).
     The page hands the picture over with S.authFace(canvas); null goes back to the plain card. */
  var card = new THREE.Group(); root.add(card);
  /* translucent body: dark glass, its edge light and face show through it (shared by both shapes) */
  var bodyMat = new THREE.MeshPhysicalMaterial({ color: 0x1a1412, roughness: .22, metalness: .55, clearcoat: 1, clearcoatRoughness: .12, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  var plateMat = new THREE.MeshPhysicalMaterial({ color: 0x0d0a09, roughness: .35, metalness: .4, clearcoat: .7, transparent: true, depthWrite: false });
  var edgeMat = glowMat(); edgeMat.blending = THREE.AdditiveBlending;
  function frameBars(g, w, h, z, t) {
    [[0, h / 2, w, t], [0, -h / 2, w, t], [-w / 2, 0, t, h], [w / 2, 0, t, h]].forEach(function (b) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(b[2], b[3], t), edgeMat); m.position.set(b[0], b[1], z); m.renderOrder = 9; base(m, 1); g.add(m);
    });
  }
  /* one shape: body, inset plate (the bezel), edge light, and a face canvas laid on the plate */
  function shape(w, h, d, inset, cvW, cvH, additive) {
    var g = new THREE.Group();
    var body = new THREE.Mesh(k.bevel(w, h, d, .12), bodyMat); body.renderOrder = 7; base(body, .82); g.add(body);
    var front = new THREE.Mesh(k.bevel(w * inset, h * (1 - (1 - inset) * w / h), d * .3, .1), plateMat); front.position.z = d * .5; front.renderOrder = 8; base(front, .9); g.add(front);
    frameBars(g, w * 1.008, h * 1.006, d * .52, w * .016);
    frameBars(g, w * inset, h * (1 - (1 - inset) * w / h), d * .67, w * .009);
    var cv = document.createElement('canvas'); cv.width = cvW; cv.height = cvH;
    var tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    var mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: true, depthWrite: false });
    if (additive) mat.blending = THREE.AdditiveBlending;
    var fw = w * (inset - .04), face = new THREE.Mesh(new THREE.PlaneGeometry(fw, fw * cvH / cvW), mat); face.position.z = d * .69; face.renderOrder = 10; base(face, 1); g.add(face);
    card.add(g);
    return { g: g, cv: cv, tex: tex, mat: mat, w: w, h: h };
  }
  var PW = CH * 1.3, PH = PW * .7;
  var plain = shape(CW, CH, CD, .84, 512, 720, true), pva = shape(PW, PH, CD, .94, 1000, 700, false);
  pva.g.visible = false;
  var pvaImg = null, faceMat = plain.mat;
  function shapeNow() { return pvaImg ? pva : plain; }
  S.authFace = function (canvas) {
    pvaImg = canvas || null; plain.g.visible = !pvaImg; pva.g.visible = !!pvaImg; faceMat = shapeNow().mat;
    drawFace(); k.wake(400); k.moved(400);
  };
  var markImg = null;
  if (window.DEFXN_MARK) { markImg = new Image(); markImg.onload = function () { drawFace(); k.redraw(); }; markImg.src = window.DEFXN_MARK; }
  function css(c, a) { return 'rgba(' + Math.round(c.r * 255) + ',' + Math.round(c.g * 255) + ',' + Math.round(c.b * 255) + ',' + a + ')'; }
  /* the broken link and the warning sign (--danger) a missing file puts on the face, centred at (x, y), sized u */
  function warning(g, x, y, u) {
    g.save(); g.translate(x - u * .5, y); g.rotate(-.6); g.strokeStyle = css(C.primary, 1); g.lineWidth = u * .2; g.lineCap = 'round';
    [[-u * .64, -u * .13], [u * .64, u * .13]].forEach(function (p) { g.beginPath(); g.ellipse(p[0], p[1], u * .56, u * .27, 0, 0, TAU); g.stroke(); });
    g.restore();
    g.save(); g.translate(x + u * 1.25, y); g.fillStyle = css(C.danger, 1);
    g.beginPath(); g.moveTo(0, -u * .7); g.lineTo(u * .76, u * .6); g.lineTo(-u * .76, u * .6); g.closePath(); g.fill();
    g.globalCompositeOperation = 'destination-out'; g.fillRect(-u * .07, -u * .27, u * .14, u * .5); g.beginPath(); g.arc(0, u * .42, u * .08, 0, TAU); g.fill();
    g.restore();
  }
  function drawFace() {
    var missing = state === 'missing' || state === 'fail' || state === 'offline';   /* the warning sign shows on every failure */
    if (pvaImg) {
      /* the PVA card's own front; a missing file darkens it and lays the warning over it */
      var pg = pva.cv.getContext('2d'), pw = pva.cv.width, ph = pva.cv.height;
      pg.clearRect(0, 0, pw, ph); pg.drawImage(pvaImg, 0, 0, pw, ph);
      if (missing) { pg.fillStyle = 'rgba(8,6,5,.62)'; pg.fillRect(0, 0, pw, ph); warning(pg, pw / 2, ph / 2, 120); }
      pva.tex.needsUpdate = true;
      return;
    }
    var g = plain.cv.getContext('2d'), w = plain.cv.width, h = plain.cv.height;
    g.clearRect(0, 0, w, h);
    /* the hexagon frame round the mark */
    g.save(); g.translate(w / 2, h * (missing ? .36 : .46)); g.strokeStyle = css(C.primary, .55); g.lineWidth = 5;
    g.beginPath(); for (var i = 0; i < 6; i++) { var a = Math.PI / 6 + i * TAU / 6; g.lineTo(Math.cos(a) * 190, Math.sin(a) * 190); } g.closePath(); g.stroke(); g.restore();
    if (markImg && markImg.complete) {
      /* the mark as a mask in the base colour */
      var m = document.createElement('canvas'); m.width = m.height = 300; var mg = m.getContext('2d');
      mg.drawImage(markImg, 0, 0, 300, 300); mg.globalCompositeOperation = 'source-in'; mg.fillStyle = css(C.primary, 1); mg.fillRect(0, 0, 300, 300);
      var sz = missing ? 210 : 270; g.drawImage(m, w / 2 - sz / 2, h * (missing ? .36 : .46) - sz / 2, sz, sz);
    }
    if (missing) warning(g, w / 2 - 40, h * .76, 100);
    /* the icon picked in the create wizard: it is one of the gate's factors, so it shows only while it is being chosen
       and made (the page sends it only then), never on a card after sign-in */
    var glyph = ic && (window.ArkAdminAuth && ArkAdminAuth.FXN_ID_ICONS || []).filter(function (c) { return c.id === ic; })[0];
    if (glyph && glyph.path && (state === 'create' || state === 'words')) {
      /* ark-ui's drawn path on its 24 grid, scaled to 120px and stroked in the base colour, never an emoji */
      g.save(); g.translate(w / 2 - 60, h * .82 - 60); g.scale(5, 5);
      g.strokeStyle = css(C.primary, 1); g.lineWidth = 1.5; g.lineCap = 'round'; g.lineJoin = 'round';
      g.stroke(new Path2D(glyph.path)); g.restore();
    }
    plain.tex.needsUpdate = true;
  }
  drawFace();
  /* the broken corner (missing): small cubes that leave the card's top right corner */
  var BITS = 14, bitGeo = new THREE.BoxGeometry(1, 1, 1), bitMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .4, metalness: .2, emissiveIntensity: 1, transparent: true });
  var bits = new THREE.InstancedMesh(bitGeo, bitMat, BITS); base(bits, 1); card.add(bits);
  var BIT = []; for (var b = 0; b < BITS; b++) {
    var u = b / BITS, r = .4 + ((b * 37) % 11) / 11 * .9;
    var bu = CW / 2.5;
    BIT.push({ from: V(CW / 2 - bu * (.2 + (b % 3) * .18), CH / 2 - bu * (.2 + ((b * 5) % 4) * .18), 0), to: V(CW / 2 + bu * (.25 + Math.cos(u * 3) * r), CH / 2 - bu * (.1 + u * 1.6 - Math.sin(b) * .3), bu * (.2 + (b % 4) * .18)), s: bu * (.1 + ((b * 7) % 5) * .035) });
  }
  var M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), SC = new THREE.Vector3();

  /* ---------- the orbit rings (verify: two; connected: one) ---------- */
  var orbitMat = glowMat(), orbits = [];
  [[CW * .92, .028, 1.42, .25], [CW * 1.05, .02, 1.28, -.5]].forEach(function (o) {
    var ring = new THREE.Mesh(new THREE.TorusGeometry(o[0], o[1] * CW / 2.5, 8, 160), orbitMat.clone()); ring.renderOrder = 11; base(ring, 1);
    ring.userData.tilt = o[2]; ring.userData.turn = o[3]; root.add(ring); orbits.push(ring);
  });

  /* ---------- floating cubes round the card: base glass and steel ---------- */
  var CUBES = 12, cubeMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .3, metalness: .2, clearcoat: .8, transparent: true, depthWrite: false });
  var cubes = new THREE.InstancedMesh(k.bevel(1, 1, 1, .12), cubeMat, CUBES); cubes.renderOrder = 6; base(cubes, .92); root.add(cubes);
  var CUBE = []; for (var q = 0; q < CUBES; q++) {
    var ang = q / CUBES * TAU + .3, rad = RH * (1.25 + (q % 3) * .3), y = RH * (.3 + ((q * 5) % 7) * .28);
    CUBE.push({ a: ang, r: rad, y: y, s: RH * (.08 + ((q * 3) % 4) * .025), warm: q % 3 !== 1, spin: q * .7 });
  }
  var cubeCol = new THREE.Color();
  function paintCubes() { for (var i = 0; i < CUBES; i++) cubes.setColorAt(i, cubeCol.copy(CUBE[i].warm ? C.primary : C.steel)); cubes.instanceColor.needsUpdate = true; }
  paintCubes(); k.onPaint(paintCubes);

  /* ---------- the glass status panels: one shape each, a round port (a real hole) per status line ---------- */
  function panel(w, h, lines) {
    var shape = G.roundRect(new THREE.Shape(), -w / 2, -h / 2, w, h, .12), ports = [];
    for (var i = 0; i < lines; i++) { var py = h / 2 - .62 - i * .34; shape.holes.push(G.circle(w / 2 - .26, py, .065)); ports.push(py); }
    var g = new THREE.Group(), glass = G.plate(shape, { color: C.dark, opacity: .78, depth: .05 });
    glass.rotation.x = Math.PI / 2;   /* stand it up: the plate lies flat, its shape's +y becomes up */
    g.add(glass);
    /* a lit bead behind each port: it shows through the hole */
    var beads = ports.map(function (py) { var m = new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 8), glowMat()); m.position.set(w / 2 - .26, py, -.08); base(m, 1); g.add(m); return m; });
    var cv = document.createElement('canvas'); cv.width = 512; cv.height = Math.round(512 * h / w);
    var tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    var words = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: true, depthWrite: false }));
    words.position.z = .04; words.renderOrder = 12; base(words, 1); g.add(words);
    /* a thin lit edge on the panel's top */
    var top = new THREE.Mesh(new THREE.BoxGeometry(w * .3, .018, .018), glowMat()); top.position.set(-w * .35, h / 2, .03); base(top, 1); g.add(top);
    root.add(g);
    return { g: g, cv: cv, tex: tex, beads: beads, top: top, w: w, h: h };
  }
  var left = panel(2.2, 1.55, 3), right = panel(2.3, 1.55, 3);
  /* the words of each state: the FXN ID panel says what the file is doing, the network panel what this browser is set to */
  var SAY = {
    none: [['No file open', 'dim'], ['Choose your file', 'dim'], ['Not signed in', 'dim']],
    file: [['File chosen', 'on'], ['Read on this device', 'on'], ['Locked', 'dim']],
    verify: [['File read', 'on'], ['Opening', 'run'], ['Checking', 'run']],
    connected: [['Open', 'on'], ['Signed in', 'on'], ['This tab', 'on']],
    missing: [['File not open', 'bad'], ['Details saved', 'on'], ['Choose again', 'bad']],
    create: [['New file', 'run'], ['Made here', 'on'], ['Not saved yet', 'dim']],
    words: [['File made', 'on'], ['Words on screen', 'run'], ['Not saved yet', 'dim']],
    saved: [['File saved', 'on'], ['In your downloads', 'on'], ['Choose it', 'run']],
    fail: [['Refused', 'bad'], ['Nothing opened', 'dim'], ['Choose a file', 'run']],
    offline: [['Open', 'on'], ['Offline', 'bad'], ['This tab', 'on']],
    ended: [['Closed', 'dim'], ['Not signed in', 'dim'], ['Choose your file', 'run']]
  };
  var NET = { fail: 'Not signed in', offline: 'Offline', ended: 'Not signed in', create: 'Waiting for file', words: 'Waiting for file', saved: 'Waiting for file', none: 'Waiting for file', file: 'Waiting for file', verify: 'Waiting for file', connected: 'Ready', missing: 'Not signed in' };
  function mono(g, px) { g.font = '500 ' + px + 'px "JetBrains Mono", ui-monospace, monospace'; if ('letterSpacing' in g) g.letterSpacing = '3px'; }
  function writePanel(p, title, rows) {
    var g = p.cv.getContext('2d'), w = p.cv.width, h = p.cv.height, u = w / p.w;
    g.clearRect(0, 0, w, h);
    mono(g, 34); g.fillStyle = css(C.primary, 1); g.textBaseline = 'middle'; g.fillText(title.toUpperCase(), u * .2, u * .3);
    rows.forEach(function (r, i) {
      var y = u * (.62 + i * .34);
      mono(g, 29); g.fillStyle = r[1] === 'dim' ? 'rgba(220,214,210,.55)' : 'rgba(246,242,238,1)'; g.fillText(r[0].toUpperCase(), u * .2, y);
    });
    p.tex.needsUpdate = true;
  }
  function drawPanels() {
    writePanel(left, 'FXN ID', SAY[state]);
    writePanel(right, 'DEFXN network', [[net || 'Network', net ? 'on' : 'dim'], [NET[state], state === 'connected' ? 'on' : 'dim'], [state === 'connected' ? 'Signing as you' : 'No signer', state === 'connected' ? 'on' : 'dim']]);
  }
  drawPanels();
  /* the panels' beads: on, running (the base, bright), dim, bad (--danger) */
  function beadTone(p, rows, i, glow) {
    var r = rows[i] ? rows[i][1] : 'dim', m = p.beads[i].material;
    m.color.copy(r === 'bad' ? C.danger : C.primary).multiplyScalar(r === 'dim' ? .25 : r === 'run' ? 2.2 * glow : 1.6);
  }

  G.show(root, { auth: 1 });

  /* ---------- each state's pose: values that ease to their targets ---------- */
  /* lift: the card's height above its rest; tip: how far it leans over; glow: its edge and mark; orbit: the rings;
     beam: the ground logo's beam; gather: the cubes close in; broken: the corner's cubes leave; build: how much of a
     new card is made (its size, and its loose pieces flying in) */
  var POSE = {
    none:      { lift: 0,   tip: 0,   glow: .55, orbit: 0, beam: 1, gather: 0,  broken: 0, build: 1, bad: 0 },
    file:      { lift: .35, tip: 0,   glow: .8,  orbit: 0, beam: 1, gather: .2, broken: 0, build: 1, bad: 0 },
    verify:    { lift: .55, tip: 0,   glow: 1.1, orbit: 1, beam: 1, gather: .5, broken: 0, build: 1, bad: 0 },
    connected: { lift: .6,  tip: 0,   glow: 1.3, orbit: .5, beam: 1, gather: 1, broken: 0, build: 1, bad: 0 },
    missing:   { lift: -.15, tip: 1,  glow: .45, orbit: 0, beam: 1, gather: 0,  broken: 1, build: 1, bad: 0 },
    create:    { lift: .2,  tip: 0,   glow: .5,  orbit: 0, beam: 1, gather: .8, broken: 0, build: .15, bad: 0 },
    words:     { lift: .35, tip: 0,   glow: .8,  orbit: 0, beam: 1, gather: .6, broken: 0, build: .7, bad: 0 },
    saved:     { lift: .5,  tip: 0,   glow: 1.25, orbit: .5, beam: 1, gather: .3, broken: 0, build: 1, bad: 0 },
    fail:      { lift: 0,   tip: .35, glow: .7,  orbit: 0, beam: 1, gather: 0,  broken: .55, build: 1, bad: 1 },
    offline:   { lift: .4,  tip: 0,   glow: .8,  orbit: 0, beam: 1, gather: -.4, broken: 0, build: 1, bad: .55 },
    ended:     { lift: -.1, tip: 0,   glow: .25, orbit: 0, beam: 0, gather: 0,  broken: 0, build: 1, bad: 0 }
  };
  var KEYS = Object.keys(POSE.none), live = {}; KEYS.forEach(function (key) { live[key] = POSE.none[key]; });
  var spin = 0, last = 0, beamOn = false;

  S.stage({
    name: 'auth',
    aims: true,
    /* seen from a little above, a little to the left, as the design's card is: the card centred in the open room,
       the ground logo and the nearest rings under it */
    target: function (f, asp) {
      var tall = asp < .9;
      return { aim: V(HUBC.x, CY * .55, HUBC.z), dist: W.fit(tall ? RH * 3.2 : RH * 4.3, RH * 3.1, asp, .96), elev: 22, yaw: -14, tilt: 1.1, n: .6 };
    },
    set: function (st) {
      var s = st && STATES.indexOf(st.s) >= 0 ? st.s : state, n = st && st.net != null ? String(st.net) : net, b = st && st.b != null ? Number(st.b) || 0 : 0;
      var icn = st && st.ic != null ? String(st.ic) : '';
      if (s === state && n === net && b === cb && icn === ic && changedAt) return;
      var icChanged = icn !== ic; cb = b; ic = icn;
      var redraw = s !== state || n !== net || icChanged; state = s; net = n; changedAt = performance.now();
      if (redraw) { drawFace(); drawPanels(); }
      k.wake(1600); k.moved(1600);
    },
    pose: function (w, ms, now) {
      /* leaving this view: the beam goes back as it was built */
      if (W.view() !== 'auth' && beamOn && W.lightBeam) { W.lightBeam(false, 700); if (W.lightLogo) W.lightLogo(false, 700); beamOn = false; }
      if (w <= .001) { last = 0; return; }
      var dt = last ? Math.min(64, now - last) : 16, a = k.reduced ? 1 : 1 - Math.exp(-dt / 260), moving = false, want = POSE[state];
      /* the create wizard: each answered step builds the card further and lifts it; while the file is being made
         (b = 4) the orbit rings come and turn */
      if (state === 'create') want = Object.assign({}, want, { build: [.12, .22, .32, .42, .52, .62, .74][Math.min(6, cb)], lift: .1 + cb * .06, glow: .45 + cb * .09, gather: .8 - cb * .08, orbit: cb >= 6 ? 1 : 0 });
      last = now;
      KEYS.forEach(function (key) { var d = want[key] - live[key]; if (Math.abs(d) > .002) { live[key] += d * a; moving = true; } else live[key] = want[key]; });
      /* the beam and the logo light follow the state (home-descent.js's tweens, which settle) */
      var beamWant = want.beam > .5 && W.view() === 'auth';
      if (beamWant !== beamOn && W.lightBeam) { W.lightBeam(beamWant, 900); if (W.lightLogo) W.lightLogo(beamWant, 900); beamOn = beamWant; }
      /* the rings turn while the file is opening (the session is busy), and stop when it is done */
      if ((state === 'verify' || (state === 'create' && cb >= 6)) && !k.reduced) { spin += dt * .0012; moving = true; }

      /* the card: standing over the logo, turned to the camera, tipping over when the file is missing */
      var tip = live.tip;
      card.position.set(HUBC.x, CY + (live.lift - tip * .5) * RH * .3, HUBC.z);
      card.rotation.set(-.1 - tip * .22, -.5 + tip * .1, -.2 - tip * .32);
      card.scale.setScalar(.4 + .6 * live.build);
      edgeMat.color.copy(C.primary).lerp(C.danger, Math.max(0, Math.min(1, live.bad))).multiplyScalar(1.8 * live.glow);
      bodyMat.color.copy(C.dark).lerp(C.deep, .25 * Math.min(1, live.glow));
      bodyMat.emissive = bodyMat.emissive || new THREE.Color(); bodyMat.emissive.copy(C.primary).multiplyScalar(.06 * live.glow);
      faceMat.color.setScalar(pvaImg ? Math.max(.55, Math.min(1.1, .6 + live.glow * .4)) : Math.max(.25, Math.min(1.6, live.glow * 1.15)));
      /* the broken corner */
      /* the loose pieces: out when the file is missing, and out round a card still being made (they fly in as it is built) */
      var loose = Math.max(live.broken, 1 - live.build);
      for (var i = 0; i < BITS; i++) {
        var bt = BIT[i], u = Math.min(1, Math.max(0, loose * 1.4 - i / BITS * .4)), sz = bt.s * Math.max(1e-4, u > .01 ? 1 : 0);
        P.copy(bt.from).lerp(bt.to, u); P.x += (shapeNow().w - CW) / 2; P.y += (shapeNow().h - CH) / 2; Q.setFromEuler(E.set(u * i, u * i * .7, 0));
        bits.setMatrixAt(i, M4.compose(P, Q, SC.set(sz, sz, sz)));
      }
      bits.instanceMatrix.needsUpdate = true; bits.visible = loose > .01;
      bitMat.color.copy(C.primary); bitMat.emissive.copy(C.primary).multiplyScalar(.6);
      /* the orbit rings: round the card, tilted, the second only while verifying */
      orbits.forEach(function (ring, j) {
        var on = j === 0 ? Math.min(1, live.orbit * 2) : Math.max(0, live.orbit * 2 - 1);
        ring.visible = on > .01; ring.position.copy(card.position);
        ring.rotation.set(ring.userData.tilt, 0, spin * (j ? -1.3 : 1) + ring.userData.turn + (j ? -.18 : .12));
        ring.scale.setScalar((.85 + .15 * on) * (pvaImg ? PW / CW * .78 : 1));
        ring.userData.base = on; ring.material.color.copy(C.primary).multiplyScalar(1.9);
      });
      /* the cubes: they gather in toward the card as you sign in, and drift out when the file is missing */
      for (var c = 0; c < CUBES; c++) {
        var cu = CUBE[c], r = cu.r * (1 - .32 * live.gather) + live.broken * .6, yy = cu.y + live.gather * .35 * Math.sin(cu.a * 2) - live.broken * .5;
        P.set(HUBC.x + Math.cos(cu.a) * r, yy, HUBC.z + Math.sin(cu.a) * r * .75);
        Q.setFromEuler(E.set(cu.spin, cu.spin * 1.3 + spin * .4, cu.spin * .5));
        cubes.setMatrixAt(c, M4.compose(P, Q, SC.setScalar(cu.s)));
      }
      cubes.instanceMatrix.needsUpdate = true;
      /* the panels: the FXN ID panel to the card's upper left, the network panel to its right, both facing the camera */
      var yaw = -14 * W.D2R;
      left.g.position.set(HUBC.x - RH * 1.12, CY + RH * .62, HUBC.z + RH * .2); left.g.rotation.set(-.05, yaw + .35, .04); left.g.scale.setScalar(PS);
      right.g.position.set(HUBC.x + RH * 1.22, CY + RH * .05, HUBC.z + RH * .35); right.g.rotation.set(-.05, yaw - .3, -.03); right.g.scale.setScalar(PS);
      var rowsL = SAY[state];
      for (var l = 0; l < 3; l++) beadTone(left, rowsL, l, .7 + .3 * Math.sin(now / 220 + l));
      var rowsR = [[0, net ? 'on' : 'dim'], [0, state === 'connected' ? 'on' : 'dim'], [0, state === 'connected' ? 'on' : 'dim']];
      for (var r2 = 0; r2 < 3; r2++) beadTone(right, rowsR, r2, 1);
      left.top.material.color.copy(C.primary).multiplyScalar(1.6); right.top.material.color.copy(C.primary).multiplyScalar(1.6);
      if (moving) { k.wake(60); k.moved(60); }
    },
    anchor: function (out) { out.pos.set(HUBC.x, 0, HUBC.z); out.quat.identity(); out.s = 1; },
    tags: function () { return []; }
  });
  if (window.ArkWorldHost && window.ArkWorldHost.setView) window.ArkWorldHost.setView('auth', 'auth');
})();

/* THE OBJECT KIT (S.objects): the board 05 objects ("Category 05 - Identity, Network & Micrographics") as real 3D,
   one home for every view that wants them. The Kit page shows them all (js/world/kit-stage.js); the /auth and identity
   stages may take them later instead of their own copies.

     S.objects.ids()                 the element ids this file can build, in board order (DefxnKitBoards board '05')
     S.objects.build(id, opts)       a THREE.Group: about one unit tall, centred on x and z, standing on y = 0, facing +z.
                                     opts.look: the look its materials come from (default: the shared look). Returns null
                                     for an id with no builder. group.userData: { id, rings: [{ m, rx, rz }] } (the
                                     orbit rings and their resting tilt, so a stage can ease them into place), meshes: every mesh in it
     S.objects.look()                a new look: its own set of materials, so one view can wear a card skin while another
                                     does not. look.paint(tones) colours every object built with it
     S.objects.tones(box)            the colours to paint with, read from box (a skin wrapper, or body): --primary,
                                     --primary-300, --canvas, --text-strong, --text-muted. The meaning tokens (--warning,
                                     --danger, --live) and the locked ones (--chain-*) are read from body, never skinned
     S.objects.lerpTones(a, b, u, out)  tones between two sets, for a transition that eases
     S.objects.frameGeo(w, h, t)     the shared lit-frame geometry (a flat outline facing +z); S.objects.bevel(w, h, d, share)
                                     the shared rounded box, cached by size

   The house style is the /auth card's (auth-stage.js): dark translucent glass bodies, an inset plate, additive edge
   light in the base colour (--primary), orbit rings, small floating cubes in base and steel.
   Speed. Geometries are made once per size and shared; each look has one set of materials, shared by all its objects;
   the small cubes of an object are instanced. Every face with words or a mark is a region of ONE atlas texture, drawn
   as masks (red = ink, green = accent, blue = warning) and coloured by the look's uniforms, so a skin change recolours
   the words without redrawing a canvas. The atlas redraws only when the fonts or the mark arrive.
   The words are samples: short, sentence case, never a number presented as measured. */
(function () {
  'use strict';
  var S = window.DEFXNScene;
  if (!S || !S.ok || !S.world || !S.glass) return;
  var W = S.world, k = W.k, THREE = W.THREE, G = S.glass, TAU = Math.PI * 2, PI = Math.PI;
  var ADDR = 'fxn1q8…7k2d';   /* a sample short address, never a real one */

  /* ---------- tones ---------- */
  function parse(v, fb) {
    var c = new THREE.Color();
    v = (v || '').trim();
    if (!v) return c.set(fb);
    try { c.setStyle(/^-?[\d.]+(deg)?\s+[\d.]+%/.test(v) ? 'hsl(' + v.split(/\s+/).slice(0, 3).join(', ') + ')' : v); } catch (e) { c.set(fb); }
    return c;
  }
  var TONE_KEYS = ['primary', 'deep', 'canvas', 'strong', 'muted', 'dark', 'steel', 'warning', 'danger', 'live'];
  function tones(box) {
    var body = document.body || document.documentElement, css = getComputedStyle(box || body), base = getComputedStyle(body);
    function tok(name, fb) { return parse(css.getPropertyValue(name), fb); }
    function meaning(name, fb) { return parse(base.getPropertyValue(name), fb); }
    var t = { primary: tok('--primary', '#ff8e59'), deep: tok('--primary-300', '#5a3424'), canvas: tok('--canvas', '#0a100d'),
      strong: tok('--text-strong', '#f3f8f4'), muted: tok('--text-muted', '#9aa3a8'),
      warning: meaning('--warning', '#e8b55a'), danger: meaning('--danger', '#d26a5f'), live: meaning('--live', '#6fb3cf') };
    var other = meaning('--chain-other', '#525a5d');   /* locked: always the site's own */
    t.dark = t.canvas.clone().lerp(other, .3);
    t.steel = t.canvas.clone().lerp(t.muted, .45);
    return t;
  }
  function lerpTones(a, b, u, out) {
    out = out || {};
    TONE_KEYS.forEach(function (key) { (out[key] = out[key] || new THREE.Color()).copy(a[key]).lerp(b[key], u); });
    return out;
  }

  /* ---------- the atlas: every face's words and marks, as masks ---------- */
  var AS = 2048, PPU = 220, PAD = 10;
  var atlasCv = document.createElement('canvas'); atlasCv.width = atlasCv.height = AS;
  var atlasTex = new THREE.CanvasTexture(atlasCv); atlasTex.anisotropy = 8;   /* masks are data: no colour space */
  var faces = [], shelf = { x: 0, y: 0, h: 0 };
  var INK = '255,0,0', ACC = '0,255,0', WARN = '0,0,255';
  function face(w, h, draw) {
    var pw = Math.ceil(w * PPU), ph = Math.ceil(h * PPU);
    if (shelf.x + pw + PAD > AS) { shelf.x = 0; shelf.y += shelf.h + PAD; shelf.h = 0; }
    if (shelf.y + ph > AS) { if (window.console) console.warn('[objects] the atlas is full'); return null; }
    var r = { x: shelf.x, y: shelf.y, w: pw, h: ph, draw: draw };
    shelf.x += pw + PAD; shelf.h = Math.max(shelf.h, ph);
    faces.push(r); paintFace(r); atlasTex.needsUpdate = true;
    var geo = new THREE.PlaneGeometry(w, h), uv = geo.attributes.uv;
    var u0 = r.x / AS, u1 = (r.x + r.w) / AS, vt = 1 - r.y / AS, vb = 1 - (r.y + r.h) / AS;
    for (var i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), vb + uv.getY(i) * (vt - vb));
    return geo;
  }
  function paintFace(r) {
    var g = atlasCv.getContext('2d');
    g.save(); g.clearRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
    g.beginPath(); g.rect(r.x, r.y, r.w, r.h); g.clip(); g.translate(r.x, r.y);
    r.draw(g, r.w, r.h);
    g.restore();
  }
  function redrawAtlas() { faces.forEach(paintFace); atlasTex.needsUpdate = true; k.redraw(); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(redrawAtlas);

  /* canvas helpers: c is a channel (INK, ACC, WARN), a its strength */
  function rgba(c, a) { return 'rgba(' + c + ',' + (a == null ? 1 : a) + ')'; }
  function fontOf(kind) {
    var css = getComputedStyle(document.body || document.documentElement);
    var v = css.getPropertyValue(kind === 'mono' ? '--font-mono' : '--font-sans').trim();
    return v || (kind === 'mono' ? '"JetBrains Mono", ui-monospace, monospace' : '"Albert Sans", system-ui, sans-serif');
  }
  function text(g, s, x, y, px, o) {
    o = o || {};
    g.font = (o.wt || (o.mono ? 500 : 600)) + ' ' + Math.round(px) + 'px ' + fontOf(o.mono ? 'mono' : 'sans');
    if ('letterSpacing' in g) g.letterSpacing = (o.sp == null ? (o.mono ? Math.round(px * .12) : 0) : o.sp) + 'px';
    g.textAlign = o.al || 'left'; g.textBaseline = 'middle'; g.fillStyle = rgba(o.c || INK, o.a);
    g.fillText(s, x, y);
  }
  function pen(g, c, a, lw) { g.strokeStyle = rgba(c, a); g.fillStyle = rgba(c, a); g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; }
  function person(g, x, y, s, c, a, lw) {
    pen(g, c, a, lw || s * .1);
    g.beginPath(); g.arc(x, y - s * .2, s * .2, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(x - s * .38, y + s * .45); g.bezierCurveTo(x - s * .36, y + s * .1, x - s * .18, y + s * .06, x, y + s * .06);
    g.bezierCurveTo(x + s * .18, y + s * .06, x + s * .36, y + s * .1, x + s * .38, y + s * .45); g.stroke();
  }
  function check(g, x, y, s, c, a) { pen(g, c, a, s * .16); g.beginPath(); g.moveTo(x - s * .35, y); g.lineTo(x - s * .08, y + s * .28); g.lineTo(x + s * .4, y - s * .3); g.stroke(); }
  function hexagon(g, x, y, r, c, a, lw) {
    pen(g, c, a, lw); g.beginPath();
    for (var i = 0; i < 6; i++) { var t = PI / 6 + i * TAU / 6; g.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r); }
    g.closePath(); g.stroke();
  }
  function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function pill(g, s, x, y, px, c) {
    g.font = '500 ' + Math.round(px) + 'px ' + fontOf('mono'); if ('letterSpacing' in g) g.letterSpacing = Math.round(px * .1) + 'px';
    var w = g.measureText(s).width + px * 1.4, h = px * 1.8;
    pen(g, c, .9, Math.max(2, px * .12)); rrect(g, x, y - h / 2, w, h, h / 2); g.stroke();
    text(g, s, x + w / 2, y + 1, px, { mono: true, c: c, al: 'center' });
    return w;
  }
  function triangle(g, x, y, s, c) {
    g.save(); pen(g, c, 1, s * .1);
    g.beginPath(); g.moveTo(x, y - s * .5); g.lineTo(x + s * .55, y + s * .45); g.lineTo(x - s * .55, y + s * .45); g.closePath(); g.stroke();
    g.fillRect(x - s * .045, y - s * .18, s * .09, s * .36); g.beginPath(); g.arc(x, y + s * .3, s * .06, 0, TAU); g.fill();
    g.restore();
  }
  /* the DEFXN mark (window.DEFXN_MARK) as a mask in one channel */
  var markImg = null, markTint = {};
  if (window.DEFXN_MARK) { markImg = new Image(); markImg.onload = function () { markTint = {}; redrawAtlas(); }; markImg.src = window.DEFXN_MARK; }
  function mark(g, x, y, s, c, a) {
    if (!markImg || !markImg.complete || !markImg.naturalWidth) return;
    var m = markTint[c];
    if (!m) {
      m = markTint[c] = document.createElement('canvas'); m.width = m.height = 256;
      var mg = m.getContext('2d'); mg.drawImage(markImg, 0, 0, 256, 256); mg.globalCompositeOperation = 'source-in'; mg.fillStyle = rgba(c, 1); mg.fillRect(0, 0, 256, 256);
    }
    g.save(); g.globalAlpha = a == null ? 1 : a; g.drawImage(m, x - s / 2, y - s / 2, s, s); g.restore();
  }

  /* ---------- shared geometry ---------- */
  var GEO = {};
  function geo(key, make) { return GEO[key] || (GEO[key] = make()); }
  function bevel(w, h, d, share) { return geo('b' + [w, h, d, share].join(','), function () { return k.bevel(w, h, d, share == null ? .12 : share); }); }
  function torus(r, t, arc) { return geo('t' + [r, t, arc || 0].join(','), function () { return new THREE.TorusGeometry(r, t, 10, 96, arc || TAU); }); }
  /* a lit frame round a face: one flat shape with the face cut out of it (facing +z) */
  function frameGeo(w, h, t) {
    return geo('f' + [w, h, t].join(','), function () {
      var s = G.roundRect(new THREE.Shape(), -w / 2 - t / 2, -h / 2 - t / 2, w + t, h + t, Math.min(w, h) * .05 + t / 2);
      s.holes.push(G.roundRect(new THREE.Path(), -w / 2 + t / 2, -h / 2 + t / 2, w - t, h - t, Math.max(.001, Math.min(w, h) * .05 - t / 2)));
      return new THREE.ShapeGeometry(s, 6);
    });
  }
  var CUBE = k.bevel(1, 1, 1, .12), LINE = new THREE.CylinderGeometry(1, 1, 1, 6, 1).translate(0, .5, 0);

  /* ---------- looks: one set of materials each ---------- */
  var FACE_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }';
  var FACE_FRAG = 'uniform sampler2D map; uniform vec3 ink, acc, warn; varying vec2 vUv;' +
    'void main(){ vec4 t = texture2D(map, vUv); if (t.a < .01) discard; vec3 w = t.rgb / max(t.r + t.g + t.b, 1e-3);' +
    'gl_FragColor = vec4(ink * w.r + acc * w.g + warn * w.b, t.a); }';
  function glowMat() { return new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }); }
  function look() {
    var glassOpts = { roughness: .22, metalness: .55, clearcoat: 1, clearcoatRoughness: .12, transparent: true, opacity: .82, depthWrite: false, side: THREE.DoubleSide };
    var m = {
      glass: new THREE.MeshPhysicalMaterial(glassOpts),
      glassDim: new THREE.MeshPhysicalMaterial(Object.assign({}, glassOpts, { opacity: .42 })),
      plate: new THREE.MeshPhysicalMaterial({ roughness: .35, metalness: .4, clearcoat: .7, transparent: true, opacity: .9, depthWrite: false }),
      sheet: new THREE.MeshPhysicalMaterial(Object.assign({}, glassOpts, { opacity: .34, metalness: .2, roughness: .18 })),
      steel: new THREE.MeshPhysicalMaterial({ roughness: .3, metalness: .75, clearcoat: .6, clearcoatRoughness: .2 }),
      graphite: new THREE.MeshPhysicalMaterial({ roughness: .45, metalness: .5, clearcoat: .4, clearcoatRoughness: .3 }),
      lit: new THREE.MeshStandardMaterial({ roughness: .3, emissiveIntensity: 1 }),
      edge: glowMat(), edgeDim: glowMat(), warn: glowMat(), live: glowMat(),
      cubeWarm: new THREE.MeshPhysicalMaterial({ roughness: .3, metalness: .2, clearcoat: .8, transparent: true, opacity: .92, depthWrite: false }),
      cubeSteel: new THREE.MeshPhysicalMaterial({ roughness: .3, metalness: .2, clearcoat: .8, transparent: true, opacity: .92, depthWrite: false }),
      face: new THREE.ShaderMaterial({ vertexShader: FACE_VERT, fragmentShader: FACE_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide,
        uniforms: { map: { value: atlasTex }, ink: { value: new THREE.Color() }, acc: { value: new THREE.Color() }, warn: { value: new THREE.Color() } } })
    };
    [m.glass, m.glassDim, m.steel, m.graphite].forEach(function (x) { k.grain(x, .3); });
    m.glass.emissive = new THREE.Color(); m.glassDim.emissive = new THREE.Color();
    var L = { mats: m };
    L.paint = function (t) {
      m.glass.color.copy(t.dark).lerp(t.deep, .25); m.glass.emissive.copy(t.primary).multiplyScalar(.05);
      m.glassDim.color.copy(t.dark); m.glassDim.emissive.copy(t.primary).multiplyScalar(.015);
      m.plate.color.copy(t.dark).multiplyScalar(.6);
      m.sheet.color.copy(t.dark).lerp(t.primary, .08);
      m.steel.color.copy(t.steel); m.graphite.color.copy(t.steel).lerp(t.dark, .55);
      m.lit.color.copy(t.primary); m.lit.emissive.copy(t.primary).multiplyScalar(.8);
      m.edge.color.copy(t.primary).multiplyScalar(1.8); m.edgeDim.color.copy(t.primary).multiplyScalar(.5);
      m.warn.color.copy(t.warning).multiplyScalar(1.8); m.live.color.copy(t.live).multiplyScalar(1.6);
      m.cubeWarm.color.copy(t.primary); m.cubeSteel.color.copy(t.steel);
      m.face.uniforms.ink.value.copy(t.strong); m.face.uniforms.acc.value.copy(t.primary).multiplyScalar(1.5); m.face.uniforms.warn.value.copy(t.warning).multiplyScalar(1.4);
    };
    L.paint(tones());
    return L;
  }
  var shared = null;
  function sharedLook() {
    if (!shared) { shared = look(); k.onPaint(function () { shared.paint(tones()); }); }
    return shared;
  }

  /* ---------- parts ---------- */
  var ORDER = { glass: 7, glassDim: 7, sheet: 7, plate: 8, steel: 6, graphite: 6, lit: 6, edge: 9, edgeDim: 9, warn: 9, live: 9, face: 10 };
  /* a part: geometry, material name, place and turn */
  function mesh(g, gm, mat, x, y, z, rx, ry, rz) {
    var m = new THREE.Mesh(gm, g.userData.look.mats[mat]);
    m.position.set(x || 0, y || 0, z || 0); m.rotation.set(rx || 0, ry || 0, rz || 0);
    m.renderOrder = ORDER[mat] || 7;
    g.add(m); return m;
  }
  function sub(g, x, y, z, rx, ry, rz) {
    var s = new THREE.Group(); s.position.set(x || 0, y || 0, z || 0); s.rotation.set(rx || 0, ry || 0, rz || 0);
    s.userData.look = g.userData.look; s.userData.rings = g.userData.rings; g.add(s); return s;
  }
  function facePart(g, w, h, draw, x, y, z, rx, ry, rz) { var gm = face(w, h, draw); return gm ? mesh(g, gm, 'face', x, y, z, rx, ry, rz) : null; }
  function frame(g, w, h, t, mat, z) { return mesh(g, frameGeo(w, h, t), mat || 'edge', 0, 0, z || 0); }
  /* the card of auth-stage.js: glass body, inset plate, lit outer and inner frame, a face on the plate */
  function card(g, w, h, d, o) {
    o = o || {};
    var c = sub(g, o.x, o.y, o.z, o.rx, o.ry, o.rz), inset = o.inset || .86, ih = h - w * (1 - inset);
    mesh(c, bevel(w, h, d, .12), o.dim ? 'glassDim' : 'glass');
    mesh(c, bevel(w * inset, ih, d * .3, .1), 'plate', 0, 0, d * .5);
    frame(c, w * 1.008, h * 1.006, w * .016, o.dim ? 'edgeDim' : 'edge', d * .52);
    if (!o.bare) frame(c, w * inset, ih, w * .008, 'edgeDim', d * .67);
    if (o.face) facePart(c, w * (inset - .04), ih - w * .04, o.face, 0, 0, d * .69);
    return c;
  }
  function slab(g, w, h, d, o) {
    o = o || {};
    var c = sub(g, o.x, o.y, o.z, o.rx, o.ry, o.rz);
    mesh(c, bevel(w, h, d, o.share), o.mat || 'glass');
    if (o.edge !== false) frame(c, w * 1.004, h * 1.006, Math.min(w, h) * .022, o.edge || 'edge', d * .51);
    if (o.face) facePart(c, w * .92, h * .9, o.face, 0, 0, d * .53);
    return c;
  }
  /* an orbit ring: lit, tilted; a stage may ease it into place (userData.rings: its mesh and resting tilt) */
  function orbit(g, r, t, x, y, z, rx, ry, rz, mat) {
    var m = mesh(g, torus(r, t), mat || 'edge', x, y, z, rx, ry, rz); m.renderOrder = 11;
    g.userData.rings.push({ m: m, rx: m.rotation.x, rz: m.rotation.z });
    return m;
  }
  /* small cubes: [x, y, z, size, warm, turn], instanced, base and steel */
  function cubes(g, list) {
    var warm = list.filter(function (c) { return c[4]; }), steel = list.filter(function (c) { return !c[4]; });
    var M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), SC = new THREE.Vector3();
    [[warm, 'cubeWarm'], [steel, 'cubeSteel']].forEach(function (pair) {
      if (!pair[0].length) return;
      var im = new THREE.InstancedMesh(CUBE, g.userData.look.mats[pair[1]], pair[0].length); im.renderOrder = 6;
      pair[0].forEach(function (c, i) { var r = c[5] == null ? i * .7 + .4 : c[5]; im.setMatrixAt(i, M4.compose(P.set(c[0], c[1], c[2]), Q.setFromEuler(E.set(r, r * 1.3, r * .5)), SC.setScalar(c[3]))); });
      g.add(im);
    });
  }
  function line(g, a, b, r, mat) {
    var A = new THREE.Vector3().fromArray(a), B = new THREE.Vector3().fromArray(b), d = B.clone().sub(A), len = d.length();
    var m = mesh(g, LINE, mat || 'edgeDim'); m.position.copy(A);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); m.scale.set(r, len, r);
    return m;
  }
  /* a flat shape stood up (facing +z), extruded by d */
  function solid(shape, d) { return new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: true, bevelThickness: d * .25, bevelSize: d * .25, bevelSegments: 3, curveSegments: 32 }).translate(0, 0, -d / 2); }
  /* the lit outline of a flat shape, stood up (glass-kit's stroke lies flat) */
  function outline(shape, w) { return G.stroke([shape], w).rotateX(PI / 2); }

  /* ---------- the faces ---------- */
  function idFace(g, w, h) {
    hexagon(g, w / 2, h * .42, w * .34, ACC, .55, w * .012);
    mark(g, w / 2, h * .42, w * .5, ACC);
    text(g, 'FXN ID', w / 2, h * .84, w * .1, { mono: true, al: 'center' });
  }
  function rows(g, w, h, title, list, o) {
    o = o || {};
    if (title) text(g, title, w * .08, h * .13, h * .085, { mono: true, c: ACC });
    list.forEach(function (r, i) {
      var y = h * ((title ? .32 : .18) + i * (o.step || .17));
      g.fillStyle = rgba(ACC, .9); g.beginPath(); g.arc(w * .1, y, h * .025, 0, TAU); g.fill();
      text(g, r, w * .17, y, h * .075, { mono: !!o.mono, a: .92 });
      if (o.check) check(g, w * .87, y, h * .09, ACC, 1);
    });
  }

  /* ---------- the builders, in board order ---------- */
  var B = {};
  B['05-fxn-id-card'] = function (g) {
    card(g, .68, 1, .07, { y: .52, face: idFace });
    cubes(g, [[.48, .86, -.1, .07, true], [-.46, .3, .1, .05, false], [.42, .2, .12, .045, false]]);
  };
  B['05-minimal-id-card'] = function (g) {
    card(g, 1, .62, .06, { y: .42, rx: -.12, inset: .92, bare: true, face: function (c, w, h) {
      text(c, 'FXN ID', w * .07, h * .2, h * .13, { mono: true, c: ACC });
      text(c, ADDR, w * .07, h * .78, h * .11, { mono: true, a: .85 });
      mark(c, w * .86, h * .24, h * .26, ACC, .9);
    } });
  };
  B['05-id-card-stacked'] = function (g) {
    card(g, .58, .86, .05, { x: -.22, y: .5, z: -.16, rz: .2, dim: true, bare: true });
    card(g, .58, .86, .05, { x: .22, y: .5, z: -.08, rz: -.2, dim: true, bare: true });
    card(g, .58, .86, .05, { y: .48, z: .04, face: idFace });
  };
  B['05-wallet-tile'] = function (g) {
    slab(g, 1, .66, .12, { y: .4, rx: -.08, face: function (c, w, h) {
      pen(c, ACC, 1, h * .03); rrect(c, w * .07, h * .2, h * .34, h * .26, h * .04); c.stroke();
      c.beginPath(); c.arc(w * .07 + h * .26, h * .33, h * .03, 0, TAU); c.fill();
      text(c, 'Wallet', w * .07, h * .62, h * .14);
      text(c, '3 identities', w * .07, h * .82, h * .095, { mono: true, a: .7 });
      pen(c, ACC, 1, h * .03); c.beginPath(); c.moveTo(w * .8, h * .72); c.lineTo(w * .9, h * .72); c.moveTo(w * .86, h * .66); c.lineTo(w * .9, h * .72); c.lineTo(w * .86, h * .78); c.stroke();
    } });
  };
  B['05-ghost-identity-token'] = function (g) {
    var t = sub(g, 0, .5, 0);
    mesh(t, geo('coin', function () { return new THREE.CylinderGeometry(.34, .34, .08, 64).rotateX(PI / 2); }), 'glass');
    mesh(t, torus(.34, .014), 'edge', 0, 0, 0);
    facePart(t, .56, .56, function (c, w, h) { person(c, w / 2, h / 2, w * .6, ACC, 1); }, 0, 0, .046);
    orbit(t, .52, .007, 0, 0, 0, 1.25, 0, .3);
    cubes(g, [[.5, .9, 0, .05, false], [-.48, .2, .05, .04, true]]);
  };
  B['05-resolver-stack'] = function (g) {
    ['ROUTE', 'LOOKUP', 'RESOLVE'].forEach(function (word, i) {
      var y = .12 + i * .3, s = sub(g, 0, y, 0);
      mesh(s, bevel(.9, .18, .6, .2), 'glass');
      frame(s, .9, .18, .012, i === 2 ? 'edge' : 'edgeDim', .302);
      facePart(s, .8, .12, function (c, w, h) { text(c, word, w * .04, h / 2, h * .62, { mono: true, c: i === 2 ? ACC : INK, a: i === 2 ? 1 : .8 }); }, 0, 0, .305);
    });
  };
  B['05-chain-ring'] = function (g) {
    var list = [], n = 12, r = .4;
    for (var i = 1; i < n; i++) { var a = PI / 2 + i / n * TAU; list.push([Math.cos(a) * r, .5 + Math.sin(a) * r, 0, .13, false, 0]); }
    cubes(g, list);
    var lit = sub(g, 0, .5 + r, 0);   /* the one lit block, at the top */
    mesh(lit, bevel(.15, .15, .15, .12), 'lit');
    frame(lit, .15, .15, .01, 'edge', .078);
  };
  B['05-network-node-cluster'] = function (g) {
    var c = [0, .5, 0], list = [];
    mesh(g, bevel(.24, .24, .24, .12), 'lit', 0, .5, 0, .3, .5, 0);
    for (var i = 0; i < 6; i++) {
      var a = i / 6 * TAU + .3, p = [Math.cos(a) * .4, .5 + Math.sin(a * 2) * .14, Math.sin(a) * .3];
      list.push([p[0], p[1], p[2], .09, false]); line(g, c, p, .006);
    }
    cubes(g, list);
  };
  B['05-chain-link'] = function (g) {
    [[-.15, 0], [.15, PI / 2]].forEach(function (l) {
      var s = sub(g, l[0], .5, 0, l[1], 0, 0); s.scale.set(1.45, 1, 1);
      mesh(s, torus(.2, .05), 'glass'); mesh(s, torus(.2, .016), 'edge');
    });
  };
  B['05-bundle-tile'] = function (g) {
    slab(g, .74, .56, .56, { y: .29, face: function (c, w, h) {
      text(c, 'Bundle', w * .08, h * .68, h * .15);
      text(c, '4 items', w * .08, h * .86, h * .1, { mono: true, a: .7 });
      pen(c, ACC, .9, h * .02); c.beginPath(); c.moveTo(w * .08, h * .3); c.lineTo(w * .92, h * .3); c.stroke();
    } });
    mesh(g, bevel(.78, .05, .6, .3), 'graphite', 0, .59, 0);   /* the lid */
    cubes(g, [[.46, .78, .1, .05, true], [-.44, .7, -.1, .04, false]]);
  };
  B['05-domain-tile'] = function (g) {
    slab(g, 1, .66, .06, { y: .4, mat: 'sheet', face: function (c, w, h) {
      var x = w * .14, y = h * .3, r = h * .14; pen(c, ACC, 1, h * .02);
      c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); c.beginPath(); c.ellipse(x, y, r * .45, r, 0, 0, TAU); c.stroke();
      c.beginPath(); c.moveTo(x - r, y); c.lineTo(x + r, y); c.stroke();
      text(c, 'subzero.fxn', w * .07, h * .66, h * .14, { mono: true, wt: 600 });
      pill(c, 'Owned', w * .07, h * .86, h * .08, ACC);
    } });
  };
  B['05-record-tile'] = function (g) {
    ['PERMISSIONS', 'SIGNATURE', 'IDENTITY'].forEach(function (word, i) {
      var top = i === 2;
      slab(g, .82, .5, .02, { y: .3 + (2 - i) * .14, z: (i - 2) * .14, mat: 'sheet', edge: top ? 'edge' : 'edgeDim', share: .4, face: function (c, w, h) {
        text(c, word, w * .05, h * .14, h * .11, { mono: true, c: top ? ACC : INK, a: top ? 1 : .75 });
        if (top) [.4, .55, .7].forEach(function (y, j) { c.fillStyle = rgba(INK, .35); c.fillRect(w * .05, h * y, w * (.7 - j * .15), h * .04); });
      } });
    });
  };
  B['05-permissions-tile'] = function (g) {
    slab(g, .8, .96, .04, { y: .5, mat: 'sheet', share: .3, face: function (c, w, h) {
      rows(c, w, h, 'Permissions', ['identity', 'access', 'trust', 'ownership'], { check: true, step: .17 });
    } });
  };
  B['05-key-object'] = function (g) {
    var s = sub(g, 0, .5, 0, 0, 0, -.7);
    mesh(s, torus(.17, .05), 'steel', 0, .22, 0); orbit(s, .23, .006, 0, .22, 0, 0, 0, 0);
    mesh(s, geo('keydisc', function () { return new THREE.CylinderGeometry(.13, .13, .03, 48).rotateX(PI / 2); }), 'glass', 0, .22, 0);
    facePart(s, .22, .22, function (c, w, h) { mark(c, w / 2, h / 2, w * .9, ACC); }, 0, .22, .02);
    mesh(s, bevel(.07, .48, .05, .2), 'steel', 0, -.12, 0);
    mesh(s, bevel(.11, .05, .05, .2), 'steel', .07, -.28, 0); mesh(s, bevel(.08, .05, .05, .2), 'steel', .06, -.18, 0);
  };
  B['05-lock-object'] = function (g) {
    mesh(g, torus(.17, .045, PI), 'steel', 0, .52, 0);
    mesh(g, bevel(.045, .12, .045, .2), 'steel', -.17, .48, 0); mesh(g, bevel(.045, .12, .045, .2), 'steel', .17, .48, 0);
    slab(g, .6, .46, .22, { y: .25, face: function (c, w, h) { mark(c, w / 2, h * .48, h * .7, ACC); } });
  };
  B['05-shield-object'] = function (g) {
    var sh = new THREE.Shape(); sh.moveTo(0, .42); sh.bezierCurveTo(.12, .35, .26, .33, .34, .33); sh.lineTo(.34, .02);
    sh.bezierCurveTo(.34, -.22, .16, -.36, 0, -.44); sh.bezierCurveTo(-.16, -.36, -.34, -.22, -.34, .02); sh.lineTo(-.34, .33);
    sh.bezierCurveTo(-.26, .33, -.12, .35, 0, .42);
    var s = sub(g, 0, .5, 0);
    mesh(s, geo('shield', function () { return solid(sh, .08); }), 'glass');
    mesh(s, geo('shieldEdge', function () { return outline(sh, .022); }), 'edge', 0, 0, .065);
    facePart(s, .4, .4, function (c, w, h) { mark(c, w / 2, h / 2, w * .9, ACC); }, 0, .02, .07);
    orbit(s, .55, .007, 0, 0, 0, 1.3, 0, -.4);
  };
  B['05-endpoint-object'] = function (g) {
    slab(g, .52, .52, .52, { y: .42, mat: 'graphite', face: function (c, w, h) {
      for (var i = 0; i < 4; i++) { c.fillStyle = rgba(INK, .3); c.fillRect(w * .15, h * (.2 + i * .1), w * .5, h * .04); }
      c.fillStyle = rgba(ACC, 1); c.beginPath(); c.arc(w * .8, h * .8, h * .05, 0, TAU); c.fill();
    } });
    [[-.12, 1], [.12, -1]].forEach(function (cb, i) {
      var curve = new THREE.CubicBezierCurve3(new THREE.Vector3(cb[0], .3, -.26), new THREE.Vector3(cb[0], .2, -.5), new THREE.Vector3(cb[0] + cb[1] * .3, .02, -.4), new THREE.Vector3(cb[0] + cb[1] * .45, .02, -.1));
      mesh(g, geo('cable' + i, function () { return new THREE.TubeGeometry(curve, 24, .025, 8, false); }), 'steel');
    });
  };
  B['05-node-beacon'] = function (g) {
    mesh(g, geo('pad', function () { return new THREE.CylinderGeometry(.4, .42, .06, 64); }), 'glass', 0, .03, 0);
    mesh(g, torus(.36, .01), 'edge', 0, .065, 0, PI / 2, 0, 0);
    mesh(g, torus(.24, .006), 'edgeDim', 0, .065, 0, PI / 2, 0, 0);
    var crystal = geo('crystal', function () { return new THREE.OctahedronGeometry(.2, 0).scale(1, 1.7, 1); });
    mesh(g, crystal, 'glass', 0, .62, 0, 0, .4, 0);
    var core = mesh(g, crystal, 'edgeDim', 0, .62, 0, 0, .4, 0); core.scale.setScalar(.55);
    cubes(g, [[.34, .9, .05, .045, true], [-.32, .72, -.1, .04, false]]);
  };
  B['05-signature-glyph'] = function (g) {
    slab(g, .96, .62, .04, { y: .4, rx: -.06, mat: 'sheet', share: .3, face: function (c, w, h) {
      pen(c, ACC, 1, h * .035); c.beginPath(); c.moveTo(w * .08, h * .5);
      c.bezierCurveTo(w * .16, h * .1, w * .24, h * .1, w * .26, h * .45); c.bezierCurveTo(w * .28, h * .7, w * .36, h * .62, w * .42, h * .38);
      c.bezierCurveTo(w * .48, h * .2, w * .52, h * .55, w * .6, h * .5); c.bezierCurveTo(w * .66, h * .46, w * .7, h * .4, w * .78, h * .44); c.stroke();
      text(c, ADDR, w * .08, h * .84, h * .1, { mono: true, a: .8 });
      pen(c, ACC, 1, h * .025); c.beginPath(); c.arc(w * .87, h * .82, h * .09, 0, TAU); c.stroke(); check(c, w * .87, h * .82, h * .1, ACC, 1);
    } });
  };
  B['05-encrypted-packet'] = function (g) {
    var s = sub(g, 0, .42, 0, 0, .5, 0);
    mesh(s, bevel(.5, .5, .5, .12), 'sheet');
    frame(s, .5, .5, .012, 'edge', .252);
    facePart(s, .3, .3, function (c, w, h) { mark(c, w / 2, h / 2, w * .95, ACC); }, 0, 0, 0);
    cubes(g, [[.42, .8, .1, .06, true], [-.42, .62, .05, .05, false], [.38, .12, .2, .04, false], [-.3, .9, -.1, .035, true]]);
  };
  B['05-explorer-cube'] = function (g) {
    var s = sub(g, -.06, .38, 0, 0, .45, 0);
    mesh(s, bevel(.5, .5, .5, .12), 'sheet'); frame(s, .5, .5, .012, 'edgeDim', .252);
    var m = sub(g, .14, .42, .3, 0, 0, .6);
    mesh(m, torus(.13, .026), 'steel'); orbit(m, .13, .008, 0, 0, .01, 0, 0, 0);
    mesh(m, geo('lens', function () { return new THREE.CircleGeometry(.12, 40); }), 'sheet');
    mesh(m, bevel(.05, .22, .05, .3), 'steel', 0, -.24, 0);
  };
  B['05-connection-hub'] = function (g) {
    var c = [0, .38, 0], list = [];
    mesh(g, geo('hub', function () { return new THREE.CylinderGeometry(.18, .2, .1, 48); }), 'glass', 0, .38, 0);
    mesh(g, torus(.19, .01), 'edge', 0, .43, 0, PI / 2, 0, 0);
    for (var i = 0; i < 5; i++) { var a = i / 5 * TAU + .4, p = [Math.cos(a) * .44, .38 + (i % 2 ? .12 : -.08), Math.sin(a) * .34]; list.push([p[0], p[1], p[2], .08, i === 0]); line(g, c, p, .006); }
    cubes(g, list);
  };
  B['05-resource-loader'] = function (g) {
    var s = sub(g, -.32, .3, 0, 0, .5, 0);
    mesh(s, bevel(.32, .32, .32, .12), 'glass'); frame(s, .32, .32, .01, 'edge', .162);
    slab(g, .62, .44, .03, { x: .2, y: .5, z: .08, mat: 'sheet', share: .3, face: function (c, w, h) {
      text(c, 'Syncing', w * .08, h * .18, h * .13, { mono: true, c: ACC });
      [.62, .38, .8].forEach(function (u, i) {
        var y = h * (.45 + i * .17); c.fillStyle = rgba(INK, .18); c.fillRect(w * .08, y, w * .84, h * .05);
        c.fillStyle = rgba(ACC, .95); c.fillRect(w * .08, y, w * .84 * u, h * .05);   /* a picture of bars, not a reading */
      });
    } });
  };
  B['05-profile-card'] = function (g) {
    card(g, 1, .64, .05, { y: .4, inset: .94, bare: true, face: function (c, w, h) {
      var ax = h * .27, ay = h * .32; pen(c, ACC, 1, h * .022); c.beginPath(); c.arc(ax, ay, h * .17, 0, TAU); c.stroke();
      person(c, ax, ay + h * .01, h * .2, ACC, 1, h * .022);
      text(c, 'subzero', h * .52, h * .25, h * .14);
      text(c, ADDR, h * .52, h * .42, h * .085, { mono: true, a: .7 });
      var x = h * .1; ['FXN ID', 'devnet'].forEach(function (t) { x += pill(c, t, x, h * .78, h * .075, ACC) + h * .06; });
    } });
  };
  B['05-no-profile-tile'] = function (g) {
    card(g, .9, .64, .05, { y: .4, dim: true, inset: .94, bare: true, face: function (c, w, h) {
      c.setLineDash([h * .03, h * .03]); pen(c, INK, .45, h * .018); c.beginPath(); c.arc(w / 2, h * .34, h * .17, 0, TAU); c.stroke(); c.setLineDash([]);
      person(c, w / 2, h * .35, h * .2, INK, .45, h * .02);
      text(c, 'No identity yet', w / 2, h * .74, h * .1, { al: 'center', a: .6 });
      pen(c, ACC, 1, h * .025); c.beginPath(); c.moveTo(w * .86, h * .1); c.lineTo(w * .86, h * .24); c.moveTo(w * .79, h * .17); c.lineTo(w * .93, h * .17); c.stroke();
    } });
  };
  B['05-identity-verification-ring'] = function (g) {
    var s = sub(g, 0, .56, 0);
    [[.42, .01, 'edge', 0], [.33, .006, 'edgeDim', .5], [.24, .008, 'edge', 1.1]].forEach(function (r) { orbit(s, r[0], r[1], 0, 0, 0, 0, 0, r[3], r[2]); });
    mesh(s, geo('vdisc', function () { return new THREE.CylinderGeometry(.17, .17, .04, 48).rotateX(PI / 2); }), 'glass');
    facePart(s, .26, .26, function (c, w, h) { mark(c, w / 2, h / 2, w * .9, ACC); }, 0, 0, .025);
    facePart(g, .6, .1, function (c, w, h) { text(c, 'Verifying', w / 2, h / 2, h * .6, { mono: true, c: ACC, al: 'center' }); }, 0, .04, .05);
  };
  B['05-devnet-warning-badge'] = function (g) {
    slab(g, 1, .5, .1, { y: .3, edge: 'warn', face: function (c, w, h) {
      triangle(c, h * .3, h * .5, h * .42, WARN);
      text(c, 'DEFXN DEVNET', h * .62, h * .36, h * .15, { mono: true, wt: 600, c: WARN });
      text(c, 'Not for production use.', h * .62, h * .66, h * .11, { a: .8 });
    } });
  };
  B['05-session-token'] = function (g) {
    var s = sub(g, -.18, .3, 0, 0, 0, PI / 2);
    mesh(s, geo('capsule', function () { return new THREE.CapsuleGeometry(.13, .36, 8, 24); }), 'glass');
    mesh(s, geo('capband', function () { return new THREE.CylinderGeometry(.08, .08, .3, 24); }), 'edgeDim');
    mesh(s, geo('capend', function () { return new THREE.CylinderGeometry(.06, .06, .05, 24); }), 'steel', 0, .3, 0);
    facePart(g, .16, .16, function (c, w, h) { mark(c, w / 2, h / 2, w * .9, ACC); }, -.18, .3, .14);
    slab(g, .46, .3, .03, { x: .26, y: .7, z: .05, mat: 'sheet', share: .3, face: function (c, w, h) {
      text(c, 'Session', w * .1, h * .3, h * .2, { mono: true, c: ACC });
      text(c, 'Active', w * .26, h * .7, h * .18, { a: .9 });
    } });
    mesh(g, geo('bead', function () { return new THREE.SphereGeometry(.022, 12, 8); }), 'live', .1, .64, .08);
  };
  B['05-authority-chip'] = function (g) {
    var s = sub(g, -.2, .36, 0, 0, .3, 0);
    mesh(s, bevel(.4, .4, .07, .15), 'graphite'); frame(s, .4, .4, .01, 'edge', .036);
    facePart(s, .26, .26, function (c, w, h) { mark(c, w / 2, h / 2, w * .9, ACC); }, 0, 0, .04);
    for (var i = 0; i < 4; i++) { var y = -.14 + i * .093; mesh(s, bevel(.08, .03, .02, .3), 'steel', -.24, y, 0); mesh(s, bevel(.08, .03, .02, .3), 'steel', .24, y, 0); }
    slab(g, .5, .5, .03, { x: .26, y: .52, z: .1, mat: 'sheet', share: .3, face: function (c, w, h) { rows(c, w, h, '', ['VALID', 'SIGNED', 'TRUSTED'], { check: true, mono: true, step: .3 }); } });
  };
  B['05-micrographic-asset'] = function (g) {
    var list = [];
    for (var i = 0; i < 14; i++) { var a = i / 14 * TAU, r = .26 + (i % 3) * .1; list.push([Math.cos(a) * r, .5 + Math.sin(a * 3) * .12 + (i % 2 ? .06 : -.06), Math.sin(a) * r * .6, .04 + (i % 4) * .015, i % 3 === 0]); }
    cubes(g, list);
    mesh(g, bevel(.12, .12, .12, .12), 'lit', 0, .5, 0, .5, .6, 0);
    orbit(g, .38, .005, 0, .5, 0, 1.35, 0, .2); orbit(g, .46, .004, 0, .5, 0, 1.15, .5, -.4, 'edgeDim');
  };

  function ids() {
    var own = Object.keys(B), board = window.DefxnKitBoards && DefxnKitBoards.board && DefxnKitBoards.board('05');
    if (!board) return own;
    return board.items.map(function (it) { return it.id; }).filter(function (id) { return !!B[id]; });
  }
  function build(id, opts) {
    if (!B[id]) return null;
    var g = new THREE.Group();
    g.userData = { id: id, look: (opts && opts.look) || sharedLook(), rings: [], meshes: [] };
    B[id](g);
    g.traverse(function (o) { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; g.userData.meshes.push(o); } });
    return g;
  }
  S.objects = { ids: ids, build: build, look: look, tones: tones, lerpTones: lerpTones, frameGeo: frameGeo, bevel: bevel, has: function (id) { return !!B[id]; } };
})();

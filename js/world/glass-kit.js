/* THE GLASS KIT: translucent plates with real holes, in the 3D world (owner, 2026-10-25: cutouts, transparency and
   overlap "with the 3d", not SVG). One place for every view that wants glass (download, intro, home).

   A shape with holes is ONE THREE.Shape: its outline, and its cutters UNITED in `shape.holes` (the 3D counterpart of
   an evenodd compound path). Each hole is real: the network shows through it, with no glass in it. Plates are
   translucent and write no depth, so two plates that overlap show through each other and never cut the rings behind.

     S.glass.roundRect(path, x, y, w, h, r)   a rounded rectangle on a THREE.Shape or THREE.Path
     S.glass.circle(cx, cy, r)                a circle cutter (a THREE.Path, wound against the outline)
     S.glass.ring(rOuter, rInner, ports)      an annulus: one shape, the inner disc as a hole, plus one round port
                                              hole per { a: angle, d: distance, r: radius }
     S.glass.plate(shape, opts)               the mesh: { color, opacity, depth }; lies flat (y up)
     S.glass.show(group, views)               the group fades in on those views ({ view: opacity factor }) and out on
                                              every other, with the world's own glide; nothing runs once it settles
     S.glass.color(token, fallback)           a theme token as a THREE.Color, so the glass follows the theme family */
(function () {
  'use strict';
  var S = window.DEFXNScene;
  if (!S || !S.ok || !S.world) return;
  var W = S.world, k = W.k, THREE = W.THREE;
  function roundRect(path, x, y, w, h, r) {
    path.moveTo(x + r, y); path.lineTo(x + w - r, y); path.quadraticCurveTo(x + w, y, x + w, y + r);
    path.lineTo(x + w, y + h - r); path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    path.lineTo(x + r, y + h); path.quadraticCurveTo(x, y + h, x, y + h - r);
    path.lineTo(x, y + r); path.quadraticCurveTo(x, y, x + r, y);
    return path;
  }
  function circle(cx, cy, r) { var p = new THREE.Path(); p.absarc(cx, cy, r, 0, Math.PI * 2, true); return p; }
  function ring(rOuter, rInner, ports) {
    var shape = new THREE.Shape(); shape.absarc(0, 0, rOuter, 0, Math.PI * 2, false);
    shape.holes.push(circle(0, 0, rInner));
    (ports || []).forEach(function (p) { shape.holes.push(circle(Math.cos(p.a) * p.d, Math.sin(p.a) * p.d, p.r)); });
    return shape;
  }
  function color(token, fallback) {
    try { var v = getComputedStyle(document.documentElement).getPropertyValue('--' + token).trim(); if (v) return new THREE.Color().setStyle('hsl(' + v.split(/\s+/).join(', ') + ')'); } catch (e) {}
    return new THREE.Color(fallback);
  }
  function plate(shape, opts) {
    opts = opts || {};
    var geo = new THREE.ExtrudeGeometry(shape, { depth: opts.depth || .12, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 2, curveSegments: 48 });
    geo.rotateX(-Math.PI / 2);   /* lie flat; the shape's +y becomes the world's -z */
    var mat = new THREE.MeshPhysicalMaterial({ color: opts.color || 0xffffff, transparent: true, opacity: opts.opacity == null ? .4 : opts.opacity,
      roughness: .25, metalness: .15, clearcoat: .8, clearcoatRoughness: .15, depthWrite: false, side: THREE.DoubleSide });
    var mesh = new THREE.Mesh(geo, mat); mesh.renderOrder = 8; mesh.userData.base = mat.opacity;
    return mesh;
  }
  /* view fades: each shown group eases its alpha toward its view's factor (0 elsewhere) */
  var shown = [];
  function show(group, views) { group.visible = false; group.userData.fade = 0; shown.push({ g: group, views: views }); k.scene.add(group); }
  var last = 0;
  W.after(function (ms, now) {
    var dt = last ? Math.min(64, now - last) : 16, a = k.reduced ? 1 : 1 - Math.exp(-dt / 320), moving = false, v = W.view();
    last = now;
    shown.forEach(function (s) {
      var want = s.views[v] || 0, f = s.g.userData.fade, d = want - f;
      if (Math.abs(d) > .003) { f += d * a; moving = true; } else f = want;
      s.g.userData.fade = f; s.g.visible = f > .01;
      s.g.traverse(function (o) { if (o.material && o.userData.base != null) o.material.opacity = o.userData.base * f; });
    });
    if (moving) { k.wake(60); k.moved(60); }
  });
  S.glass = { roundRect: roundRect, circle: circle, ring: ring, plate: plate, show: show, color: color };

  /* ---- the halo over the kernel: intro and home -----------------------------------------------------------------
     A ring of glass with the kernel showing through its centre hole and one port hole per network chain, each port on
     the line from the kernel to that chain (DERIVED from network-data.js: its KIND and ring centres, never placed by
     hand). A second, darker ring overlaps it, turned and a little larger: where they overlap you see one through the
     other. Base colour on the first, the base's deep tone on the second (docs/PRODUCT-DESIGN-LAWS.md laws 71-74). */
  var N = W.N, rings = W.ringList || W.rings, HUB = rings[N.HUB];
  var R = HUB.outer || HUB.R * 1.2;
  var ports = [];
  rings.forEach(function (r, i) {
    if (N.KIND[i] !== 'network' || r.parent) return;
    ports.push({ a: Math.atan2(-(r.c.z - HUB.c.z), r.c.x - HUB.c.x), d: R * 1.58, r: R * .24 });
  });
  var halo = new THREE.Group();
  var front = plate(ring(R * 1.95, R * 1.16, ports), { color: color('primary', 0xff8e59), opacity: .2 });
  var back = plate(ring(R * 2.25, R * 1.85, []), { color: color('primary-300', 0x5a3424), opacity: .32 });
  back.position.set(R * .12, -.08, R * .06);
  halo.add(back); halo.add(front);
  halo.position.set(HUB.c.x, 1.1, HUB.c.z);
  show(halo, { intro: 1, home: .6 });
})();

/* THE CHAIN MARKS ON THE GRID (owner, 2026-10-25): each named network chain has its mark laid into the grid under it,
   the way the DEFXN kernel's logo is inlaid at the hub (home-descent.js). The chain floats over its mark
   (chains-scene.js), so you see the mark through the chain's glass.

     DeArk   the ARK mark: the owner's docs/design/chains/ARK.svg, two mirrored stepped polygons. The points below are
             that file's one polygon, exactly as drawn; the second is its mirror, as the file's transform makes it.
     CR3TV   the "CR3TV" wordmark. STAND-IN: the owner has sent no CR3TV mark yet. These are clean geometric letters
             cut on a 4 x 6 grid, one stroke wide, until the real mark replaces them (swap CR3TV_LETTERS below).

   Each mark is 3D geometry from its points (THREE.Shape, built by the glass kit's inlay), never a picture. It wears its
   network's colour token (--net-deark, --net-cr3tv in css/world.css), builds with its chain, and steps back with the
   network when another world is in view. Nothing moves once it is built. */
(function () {
  'use strict';
  var S = window.DEFXNScene;
  if (!S || !S.ok || !S.world || !S.glass) return;
  var W = S.world, k = W.k, THREE = W.THREE, N = W.N, G = S.glass, rings = W.ringList, ease = W.ease;

  /* ---- ARK: docs/design/chains/ARK.svg (525 x 525 frame). The motif's polygon, in its own units ---- */
  var ARK_POINTS = [70.2484626, 265, 118.938703, 265, 118.938703, 185.144635, 193, 185.144635, 193, 0, 186.177238, 0, 176.433759, 0,
    176.433759, 15.0400238, 152.901242, 15.0400238, 152.901242, 28.714428, 131.624231, 28.714428, 131.624231, 42.1733678,
    118.938703, 42.1733678, 118.938703, 62.9732716, 111.305278, 62.9732716, 111.305278, 101.325939, 24.1453636, 101.325939,
    24.1453636, 129.336315, 16.9812455, 129.336315, 0, 129.336315, 0, 185.144635, 70.2484626, 185.144635];
  /* the file places the motif twice: translate(282, 130), and mirrored about x = 146.5 after translate(50, 130).
     Both land in the frame, then the frame is centred on 0, 0 with SVG's down turned to the shape's up */
  function arkShapes() {
    var right = [], left = [], C = 262.5;
    for (var i = 0; i < ARK_POINTS.length; i += 2) {
      var x = ARK_POINTS[i], y = ARK_POINTS[i + 1] + 130;
      right.push(x + 282 - C, C - y);
      left.push(2 * 146.5 - (x + 50) - C, C - y);
    }
    return [G.polygon(right), G.polygon(left)];
  }

  /* ---- CR3TV: STAND-IN letters on a 4 x 6 grid (x right, y up), one unit stroke, chamfered like the ARK steps ---- */
  var CR3TV_LETTERS = [
    { out: [.8, 0, 4, 0, 4, 1, 1, 1, 1, 5, 4, 5, 4, 6, .8, 6, 0, 5.2, 0, .8] },                                          /* C */
    { out: [0, 0, 1, 0, 1, 2.4, 2, 2.4, 3, 0, 4.1, 0, 3.05, 2.5, 4, 3.2, 4, 5.2, 3.2, 6, 0, 6],
      hole: [1, 3.4, 2.8, 3.4, 3, 3.6, 3, 4.8, 2.8, 5, 1, 5] },                                                          /* R */
    { out: [0, 0, 3.2, 0, 4, .8, 4, 2.6, 3.4, 3, 4, 3.4, 4, 5.2, 3.2, 6, 0, 6, 0, 5, 3, 5, 3, 3.5, 1, 3.5, 1, 2.5, 3, 2.5, 3, 1, 0, 1] },   /* 3 */
    { out: [1.5, 0, 2.5, 0, 2.5, 5, 4, 5, 4, 6, 0, 6, 0, 5, 1.5, 5] },                                                   /* T */
    { out: [1.4, 0, 2.6, 0, 4, 6, 2.95, 6, 2, 1.3, 1.05, 6, 0, 6] }                                                       /* V */
  ];
  function wordShapes() {
    var adv = 5, total = CR3TV_LETTERS.length * adv - 1, out = [];
    function place(pts, n) { var o = []; for (var i = 0; i < pts.length; i += 2) o.push(pts[i] + n * adv - total / 2, pts[i + 1] - 3); return o; }
    CR3TV_LETTERS.forEach(function (L, n) {
      var sh = G.polygon(place(L.out, n));
      if (L.hole) { var hp = place(L.hole, n), path = new THREE.Path(); path.moveTo(hp[0], hp[1]); for (var i = 2; i < hp.length; i += 2) path.lineTo(hp[i], hp[i + 1]); path.closePath(); sh.holes.push(path); }
      out.push(sh);
    });
    return { shapes: out, w: total, h: 6 };
  }

  /* each mark: its chain, its shapes and their width in their own units, the share of the chain's radius it spans,
     and its colour token (k.C, read from css/world.css) */
  var MARKS = [
    { id: 'deark', make: function () { return { shapes: arkShapes(), w: 425 }; }, span: 1.7, tone: 'netDeark' },
    { id: 'cr3tv', make: wordShapes, span: 1.5, tone: 'netCr3tv' }
  ];
  var built = [];
  MARKS.forEach(function (mk) {
    var ri = N.IDS.indexOf(mk.id), r = rings[ri];
    if (!r) return;
    var m = mk.make(), sc = r.R * mk.span / m.w;
    /* the edge keeps one width in the world, whatever the mark's own units */
    var g = G.inlay(m.shapes, { depth: .05 / sc, edge: .05 / sc, opacity: .3 });
    g.scale.set(sc, sc, sc); g.position.set(r.c.x, .006, r.c.z);
    k.scene.add(g);
    built.push({ g: g, r: r, tone: mk.tone });
  });
  function paint() { built.forEach(function (b) { b.g.paint(k.C[b.tone] || k.C.signal, k.C.canvas); }); }
  k.onPaint(paint); paint();
  /* builds with its chain on the world's clock (wound back on /download, it goes with it), steps back with the network */
  var last = -1;
  W.after(function (ms) {
    var cur = W.cur(), nb = cur ? Math.min(1, cur.n) : 0, key = '';
    built.forEach(function (b) {
      var a = ease.inOut(Math.max(0, Math.min(1, (ms - b.r.at - 200) / 700))) * (1 - .7 * nb);
      b.g.amount(a); key += a.toFixed(3);
    });
    if (key !== last) { last = key; k.redraw && k.redraw(); }
  });
})();

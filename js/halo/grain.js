/* =====================================================================
   HALO GRAIN
   ---------------------------------------------------------------------
   Paints the grainy ring into a small canvas. The canvas is a fixed grid
   of D x D cells that CSS scales up with `image-rendering: pixelated`, so
   the grain is square, crisp, identical on every screen, and painted
   exactly once: there is no resize handler and nothing to repaint.

   THE MODEL — read off the reference, not invented.
   Sampling the reference poster showed the ring is NOT a uniform circle of
   speckle. Each cell's brightness is

       v = clamp( ring(r) * lift(y)  +  NOISE * gate(ring) * n ,  0 , CAP )

     ring(r)  radial envelope. Zero inside the hollow, rising to 1 over the
              inner ramp (a smoothstep raised to INNER_GAMMA), holding, then
              falling to 0 at the outer edge (a plain smoothstep, longer and
              softer than the inner one).
     lift(y)  a straight vertical gradient over the ring's own height.
              Bright at the top of the ring, a third as bright at its centre
              line, and gone about two thirds of the way down. This is what
              makes the ring read as lit from above; without it the ring is a
              flat white donut.
     n        zero-mean, unit-variance noise (three summed uniforms), hashed
              from the cell's coordinates so the grain never changes.
     gate     fades the noise out where the ring ends, so no stray specks sit
              in the hollow or beyond the outer edge.
     CAP      the brightest a cell may get: white at 40% opacity (#666).

   Values are white with alpha = v, so the ring composites over whatever is
   behind it.

   THE CONSTANTS were fitted, not typed in: a coordinate-descent search
   minimised the difference between this model and the reference's measured
   mean, spread, median and 90th percentile, per 10 px ring radius and per
   100 px of height. After the fit, mean brightness across the ring agrees
   with the reference to within ~3 levels of 255 and the spread to within ~2
   (the tails and the plateau alike). The remaining difference is the
   randomness of the noise itself.
   ===================================================================== */
var Halo = (function () {
  'use strict';

  var CAP = 0.40;              /* peak white opacity                          */
  var LIFT_CENTRE = 0.208;     /* light level at the ring's centre line       */
  var LIFT_SLOPE = 0.304;      /* how much it drops per ring-radius downward  */
  var NOISE = 0.109;           /* one standard deviation of the grain         */
  var INNER_RAMP = 0.165;      /* inner ramp width, as a fraction of R        */
  var INNER_GAMMA = 0.664;     /* <1 bends the inner ramp toward the hollow   */
  var OUTER_RAMP = 0.178;      /* outer ramp width, as a fraction of R        */
  var GATE = 0.02;             /* ring level below which the noise is faded   */
  var SEED = 1337;

  /* integer hash -> [0,1) */
  function hashi(x, y, s) {
    var n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1274126177);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    n = n ^ (n >>> 16);
    return (n >>> 0) / 4294967296;
  }

  /* ~N(0,1): the sum of three uniforms has variance 1/4, so scale by 2 */
  function gauss(x, y) {
    return (hashi(x, y, SEED) + hashi(x, y, SEED + 1) + hashi(x, y, SEED + 2) - 1.5) * 2;
  }

  function smooth(e0, e1, x) {
    var t = (x - e0) / (e1 - e0);
    t = t < 0 ? 0 : (t > 1 ? 1 : t);
    return t * t * (3 - 2 * t);
  }

  /* props: radius, inner (same unit, e.g. % of stage width), density
     (cells across the diameter), alpha (peak, percent, 40 = the reference) */
  function paint(canvas, props) {
    var D = Math.max(64, Math.round(ArkProps.num(props.density, 520)));
    var outer = ArkProps.num(props.radius, 44.52);
    var inner = ArkProps.num(props.inner, 20.96);
    var scale = ArkProps.num(props.alpha, CAP * 100) / (CAP * 100);

    canvas.width = D;
    canvas.height = D;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var in0 = inner / outer;                         /* where the hollow ends    */
    var in1 = in0 + INNER_RAMP;                      /* where the ring is full   */
    var out0 = 1 - OUTER_RAMP;                       /* where it starts to fade  */
    var cap = CAP * scale;

    var img = ctx.createImageData(D, D);
    var px = img.data;
    var half = D / 2;

    for (var y = 0; y < D; y++) {
      var dy = (y + 0.5 - half) / half;              /* -1 top … +1 bottom */
      var lift = (LIFT_CENTRE - LIFT_SLOPE * dy) * scale;
      if (lift < 0) lift = 0;

      for (var x = 0; x < D; x++) {
        var dx = (x + 0.5 - half) / half;
        var r = Math.sqrt(dx * dx + dy * dy);
        if (r >= 1) continue;                        /* transparent already */

        var ring = Math.pow(smooth(in0, in1, r), INNER_GAMMA) * (1 - smooth(out0, 1, r));
        if (ring <= 0) continue;

        var v = ring * lift + NOISE * scale * smooth(0, GATE, ring) * gauss(x, y);
        if (v <= 0) continue;
        if (v > cap) v = cap;

        var i = (y * D + x) << 2;
        px[i] = 255; px[i + 1] = 255; px[i + 2] = 255;
        px[i + 3] = (v * 255 + 0.5) | 0;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  return { paint: paint };
})();

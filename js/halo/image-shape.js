/* Image-driven particle relief: replaces the faceted iceberg with a mesh
   that renders the source image directly. create() is a pure function
   (deterministic, no Math.random) so it can be unit-tested with a synthetic
   sampler; load() is the only DOM-dependent part. Both meshes and the
   shared water plane keep the same [x,y,z,light] contract IcebergGeometry
   used, so zero-webgl.js and the shader do not change: primary mesh rises
   from the waterline, 80% of the surface mesh forms the submerged echo,
   the last 20% stays a viewport-wide water plane.

   Mesh 1 (primary) is a photo plane: u maps to x, v maps to height y, and
   brightness pushes the particle toward/away from the viewer in z (the
   shader shears z into screen x/y slightly, so bright regions physically
   stand out of the plane). The light channel carries the same contrasted
   brightness, so the photo's silhouette and shading read directly instead
   of being rank-stacked into uniform columns. Neither axis is grid-snapped
   — every particle gets its own R2 low-discrepancy (u,v), so continuous
   photo gradients render smoothly. Earlier versions grid-snapped x/y to
   22x22 then 40x40 shared columns, or quantised v into 10 tier rows, or
   rank-stacked solid columns capped by local brightness: all of them
   collapsed real photos into a vague fog or dotted blob. Mesh 2 (the
   submerged echo) takes an optional SECOND image: when given one, it
   mirrors mesh 1's own mapping (sunk below the waterline instead of
   rising above it) so each page's two shapes are two independent
   pictures; with no second image it falls back to a plain dim static
   echo, unrelated to the photo, as before. */
var ImageShape = Object.freeze({
  DEPTH: .70,
  GAMMA: 1.50,

  /* Every number below can be retuned live from admin.html (Mesh tuning),
     which posts a params object through create()/measureRange() rather than
     editing this file: js/content/mesh-settings.js holds the admin-facing
     field list (label/min/max/step) and reads its own `def` values from
     here, so this object is the one place the numbers are decided. */
  defaults: Object.freeze({
    gamma: 1.50, depth: .70,
    lightLo: .40, lightSpan: .34, lightExp: .80,
    // .12 looked fine against the old synthetic test pattern but, measured
    // against a real photo, painted its whole bounding rectangle as a faint
    // visible box (every pixel gets at least this much alpha, background
    // included). .03 keeps particles from vanishing to nothing without
    // reintroducing that box.
    minLight: .03,
    loPercentile: .20, hiPercentile: .95,
    yBase: .20, yScale: .80
  }),

  /* sample(u,v) -> brightness in [0,1] for image-space coordinates in [0,1].
     Real photos rarely span the full [0,1] brightness range: a linear map
     then stacks everything at mid height, a uniform fog. measureRange scans
     a fixed 32x32 lattice once, takes the loPercentile/hiPercentile brightness,
     and normalize() stretches that band to [0,1] before a gamma lift, so the
     mesh uses the photo's actual dynamic range. The low percentile sits well
     above 5 because real photos have large near-black regions (a portrait's
     dark clothing, shadows): pinning lo to the 5th percentile leaves the
     whole subject as a dim mid-grey film instead of letting it fall to the
     back of the slab. Deterministic and pure: a pure function of `sample`. */
  measureRange: function (sample, params) {
    var p = Object.assign({}, this.defaults, params);
    var N = 32, lows = [], highs = [];
    for (var j = 0; j < N; j++) for (var i = 0; i < N; i++) {
      var b = Math.max(0, Math.min(1, sample((i + .5) / N, (j + .5) / N)));
      (b < .5 ? lows : highs).push(b);
    }
    lows.sort(function (a, b) { return a - b; });
    highs.sort(function (a, b) { return a - b; });
    var pick = function (arr, frac) { return arr.length ? arr[Math.min(arr.length - 1, Math.floor(frac * arr.length))] : 0; };
    return [pick(lows, p.loPercentile), Math.max(pick(highs, p.hiPercentile), pick(lows, p.loPercentile) + 1e-3)];
  },

  /* surfaceSample is optional: with none, mesh 2 keeps the old synthetic
     echo (a plain dim shape unrelated to any image); with one, it mirrors
     mesh 1's own mapping using ITS OWN brightness range, sunk below the
     waterline instead of rising above it. */
  create: function (primaryCount, surfaceCount, sample, surfaceSample, params) {
    var p = Object.assign({}, this.defaults, params);
    var data = new Float32Array((primaryCount + surfaceCount) * 4);
    var GAMMA = p.gamma, DEPTH = p.depth;
    var range = this.measureRange(sample, p), lo = range[0], hi = range[1];
    function brightness(u, v) {
      var b = Math.max(0, Math.min(1, sample(u, v)));
      b = Math.max(0, Math.min(1, (b - lo) / (hi - lo)));
      return Math.pow(b, GAMMA);
    }
    var surfaceRange = surfaceSample ? this.measureRange(surfaceSample, p) : null;
    var surfaceLo = surfaceRange && surfaceRange[0], surfaceHi = surfaceRange && surfaceRange[1];
    function surfaceBrightness(u, v) {
      var b = Math.max(0, Math.min(1, surfaceSample(u, v)));
      b = Math.max(0, Math.min(1, (b - surfaceLo) / (surfaceHi - surfaceLo)));
      return Math.pow(b, GAMMA);
    }
    // R2 low-discrepancy sequence: spreads particles evenly over the image
    // without repeating, and stays a pure function of the index.
    var g = 1.32471795724474602596, a1 = 1 / g, a2 = 1 / (g * g);
    for (var i = 0; i < primaryCount + surfaceCount; i++) {
      var below = i >= primaryCount, local = below ? i - primaryCount : i;
      var total = below ? surfaceCount : primaryCount;
      var t = (local + .5) / total;
      var x, y, z, light;
      if (below && t > .80) {
        // Thin rippled water plane, identical to IcebergGeometry's: the
        // shader stretches this region across the full viewport regardless
        // of the mesh's own content, so it must not depend on either image.
        x = (((local * .61803398875) % 1) * 2 - 1) * 1.25;
        z = ((t - .8) / .2 * 2 - 1) * .62;
        y = .20 + Math.sin(x * 28 + z * 19) * .006;
        light = .45 + .30 * Math.sin(x * 16 + z * 12) ** 2;
      } else if (below && surfaceSample) {
        if (below) t /= .80;
        var u2 = (0.5 + a1 * i) % 1, v2 = (0.5 + a2 * i) % 1;
        var b2 = surfaceBrightness(u2, v2);
        // Mirrors the primary mapping exactly, just sunk below the
        // waterline (y negated from it) instead of rising above it.
        x = (u2 * 2 - 1) * .90;
        z = (b2 - .5) * DEPTH;
        y = p.yBase - v2 * p.yScale;
        light = Math.pow(Math.max(0, Math.min(1, (b2 - p.lightLo) / p.lightSpan)), p.lightExp);
      } else {
        if (below) t /= .80;
        var u = (0.5 + a1 * i) % 1, v = (0.5 + a2 * i) % 1;
        var b = brightness(u, v);
        // The image plane itself is the mesh: x across, v up from the
        // waterline, brightness as depth relief toward the viewer (the
        // shader's z shear turns it into a physical stand-off) and as the
        // light channel, so the photo's silhouette and shading read
        // directly. Dark regions sink to the back of the slab instead of
        // stacking into solid columns.
        x = (u * 2 - 1) * .90;
        z = below ? (Math.floor(v * 10) / 10 - .5) * .90 : (b - .5) * DEPTH;
        y = below ? .20 - t * 1.48 * Math.max(b, .04) : p.yBase + v * p.yScale;
        // Only the photo's bright structure (rim light, highlights, sparkle
        // field) is allowed to glow; everything below the band becomes
        // near-invisible film, so the dark subject reads as a clean void —
        // a silhouette against its own bright surround. A midtone S-curve
        // was tried first and failed: the background grey and the subject
        // landed within ~2x of each other and the shape never emerged.
        light = below ? (.18 + .55 * b) * .62 : Math.pow(Math.max(0, Math.min(1, (b - p.lightLo) / p.lightSpan)), p.lightExp);
      }
      data.set([x, y, z, Math.max(p.minLight, Math.min(1, light))], i * 4);
    }
    return data;
  },

  // DOM-only. Loads an image and hands back sample(u,v) via done(), or
  // done(null) if the image cannot be loaded or its canvas cannot be read.
  load: function (url, done) {
    var img = new Image();
    img.onload = function () {
      try {
        var size = 256;
        var canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        var ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, size, size);
        var pixels = ctx.getImageData(0, 0, size, size).data;
        done(function (u, v) {
          var x = Math.max(0, Math.min(size - 1, Math.floor(u * size)));
          var y = Math.max(0, Math.min(size - 1, Math.floor((1 - v) * size)));
          var o = (y * size + x) * 4;
          var luminance = (pixels[o] * .299 + pixels[o + 1] * .587 + pixels[o + 2] * .114) / 255;
          return luminance * (pixels[o + 3] / 255);
        });
      } catch (error) { done(null); }
    };
    img.onerror = function () { done(null); };
    img.src = url;
  }
});

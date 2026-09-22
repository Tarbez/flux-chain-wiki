/* =====================================================================
   MESH TUNING SETTINGS
   ---------------------------------------------------------------------
   The concept page's iceberg relief (js/halo/image-shape.js) is driven by
   a handful of numbers -- contrast gamma, depth, the glow threshold, the
   waterline offset -- that only look right or wrong once you can see the
   real render. Baking a single guess into image-shape.js meant re-editing
   code and reloading for every trial. This module holds an admin-editable
   override for those numbers (admin.html -> Mesh tuning), so they can be
   dragged live against the real preview and saved once they read right.
   get() returns null only before the data file below has run at all
   (never in the shipped site, where mesh-settings-data.js always calls
   define(), even with {} -- which sanitizes to image-shape.js's defaults).

   `fields()` is the one place the admin panel's sliders (label/min/max/
   step) are described; it reads its numeric defaults from ImageShape.defaults
   so this file is never a second place those numbers could drift from
   image-shape.js. It reads lazily (a function, not a value computed at
   load time) because script load order should not matter here.
   ===================================================================== */
var ArkMeshSettings = (function () {
  'use strict';

  var FALLBACK_DEFAULTS = {
    gamma: 1.50, depth: .70,
    lightLo: .40, lightSpan: .34, lightExp: .80, minLight: .12,
    loPercentile: .20, hiPercentile: .95,
    yBase: .20, yScale: .80
  };

  function baseDefaults() {
    return (typeof ImageShape !== 'undefined' && ImageShape.defaults) || FALLBACK_DEFAULTS;
  }

  /* Particle counts are js/zero-webgl.js's own numbers, not image-shape.js's,
     so their defaults are plain literals here (its previous desktop default)
     rather than routed through baseDefaults(). A phone is still protected: on
     a narrow viewport zero-webgl.js caps whatever these say to a safe ceiling. */
  var PARTICLE_DEFAULTS = { primaryParticles: 19200, surfaceParticles: 24000 };

  /* label/min/max/step is display metadata only; the numeric default (`def`)
     for the relief fields always comes from baseDefaults() so it can only
     ever match image-shape.js. */
  function fields() {
    var base = baseDefaults();
    var meta = [
      ['gamma', 'Contrast gamma (higher = darker midtones)', .6, 3.0, .05, base.gamma],
      ['depth', 'Depth relief (brightness -> stand-off from the plane)', 0, 1.4, .02, base.depth],
      ['lightLo', 'Glow threshold (brightness where glow starts)', 0, .9, .01, base.lightLo],
      ['lightSpan', 'Glow band width (threshold to full glow)', .05, .9, .01, base.lightSpan],
      ['lightExp', 'Glow curve (exponent inside the band)', .3, 2.5, .05, base.lightExp],
      ['minLight', 'Floor brightness (never fully invisible)', 0, .5, .01, base.minLight],
      ['loPercentile', 'Black point (percentile stretched to 0)', 0, .45, .01, base.loPercentile],
      ['hiPercentile', 'White point (percentile stretched to 1)', .55, 1, .01, base.hiPercentile],
      ['yBase', 'Waterline offset (mesh bottom)', 0, .6, .01, base.yBase],
      ['yScale', 'Vertical scale (image height on the mesh)', .3, 1.2, .01, base.yScale],
      ['primaryParticles', 'Primary particles (image detail)', 4000, 60000, 500, PARTICLE_DEFAULTS.primaryParticles],
      ['surfaceParticles', 'Surface particles (echo + water)', 4000, 40000, 500, PARTICLE_DEFAULTS.surfaceParticles]
    ];
    return meta.map(function (row) {
      return { key: row[0], label: row[1], min: row[2], max: row[3], step: row[4], def: row[5] };
    });
  }

  var current = null; /* null until define() is called with a saved (or previewed) value */

  function sanitize(p) {
    var out = {};
    fields().forEach(function (f) {
      var n = Number(p && p[f.key] !== undefined ? p[f.key] : f.def);
      out[f.key] = isFinite(n) ? Math.max(f.min, Math.min(f.max, n)) : f.def;
    });
    return out;
  }

  function problems(p) {
    if (!p || typeof p !== 'object') return ['settings must be an object'];
    return [];
  }

  function define(p) { current = sanitize(p || {}); }
  function get() { return current ? Object.assign({}, current) : null; }
  function defaults() {
    var out = {};
    fields().forEach(function (f) { out[f.key] = f.def; });
    return out;
  }

  /* the exact file text; the admin page and a hand edit produce the same bytes */
  function serialize(p) {
    return '/* Live-tunable relief parameters for the concept page\'s iceberg mesh\n' +
      '   (js/halo/image-shape.js). Edit these in admin.html -> Mesh tuning;\n' +
      '   this file is not meant for hand editing. */\n' +
      'ArkMeshSettings.define(' + JSON.stringify(sanitize(p), null, 2) + ');\n';
  }

  return { fields: fields, defaults: defaults, sanitize: sanitize, problems: problems,
           define: define, get: get, serialize: serialize };
})();

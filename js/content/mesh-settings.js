/* =====================================================================
   MESH TUNING + PAGE SHAPES
   ---------------------------------------------------------------------
   Every page's particle system (js/zero-webgl.js) can show two images --
   one for the mesh that rises above the waterline, one for the mesh that
   sinks below it -- instead of its built-in orb/knot/word or reference
   symbol. This module holds two admin-editable things:

     tuning   the shading numbers (js/halo/image-shape.js: contrast gamma,
              depth, glow threshold, waterline offset, particle counts).
              SHARED across every page on purpose -- these are a look, not
              a per-photo setting, and one set is far easier to reason
              about than six drifting copies.
     pages    which two images (by js/content/assets.js id) each page
              uses, keyed by the page id SurfaceMotion.forPage/zero-webgl.js
              already use ('zero', 'proximity', 'lab', 'about', 'concept').
              A page with no primary image keeps its original built-in
              shape entirely (zero-webgl.js checks pages[page].primary).

   get() returns null only before the data file below has run at all
   (never in the shipped site, where mesh-settings-data.js always calls
   define(), even with {} -- which sanitizes to every default below).

   `fields()` is the one place the admin panel's tuning sliders (label/
   min/max/step) are described; it reads its numeric defaults from
   ImageShape.defaults so this file is never a second place those numbers
   could drift from image-shape.js. It reads lazily (a function, not a
   value computed at load time) because script load order should not
   matter here.
   ===================================================================== */
var ArkMeshSettings = (function () {
  'use strict';

  var FALLBACK_DEFAULTS = {
    gamma: 1.50, depth: .70,
    lightLo: .40, lightSpan: .34, lightExp: .80, minLight: .03,
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

  function sanitizeTuning(p) {
    var out = {};
    fields().forEach(function (f) {
      var n = Number(p && p[f.key] !== undefined ? p[f.key] : f.def);
      out[f.key] = isFinite(n) ? Math.max(f.min, Math.min(f.max, n)) : f.def;
    });
    return out;
  }

  function tuningDefaults() {
    var out = {};
    fields().forEach(function (f) { out[f.key] = f.def; });
    return out;
  }

  /* The pages that can carry their own two-image shape. 'learnings' and the
     article/theory routes are not listed: they have no [data-iceberg-anchor]
     yet, so a page id absent from this list just keeps its built-in shape. */
  var PAGES = [
    { id: 'zero', label: 'Home' },
    { id: 'proximity', label: 'Experiments' },
    { id: 'lab', label: 'The open lab' },
    { id: 'about', label: 'About' },
    { id: 'concept', label: 'Theory' }
  ];

  /* Ships with the theory page already wearing the image it always used, so
     upgrading this file does not blank out an existing site. */
  var PAGE_DEFAULTS = { concept: { primary: 'iceberg-blocks', primaryMode: 'image', surface: null, surfaceMode: 'built-in' } };

  /* size/x/y place the mesh on screen (js/zero-webgl.js: measureIceberg()):
     size scales it, x/y nudge it, both in the same normalized units the
     renderer already uses for its own placement math. `hidden` overrides
     everything else -- including a page whose SurfaceMotion profile forces
     its built-in shape on by default (concept) -- so "no shape at all" is
     always reachable, not just "no image assigned". */
  function placementFields() {
    return [
      { key: 'size', label: 'Size', min: .25, max: 3, step: .05, def: 1 },
      { key: 'x', label: 'Horizontal position', min: -1.5, max: 1.5, step: .02, def: 0 },
      { key: 'y', label: 'Vertical position', min: -1.5, max: 1.5, step: .02, def: 0 }
    ];
  }

  function sanitizePageEntry(row) {
    var num = function (v, def, lo, hi) { var n = Number(v); return isFinite(n) ? Math.max(lo, Math.min(hi, n)) : def; };
    var mode = function (v, fallback) { return v === 'image' || v === 'none' || v === 'built-in' ? v : fallback; };
    var hidden = !!(row && row.hidden);
    var primary = row && typeof row.primary === 'string' && row.primary ? row.primary : null;
    var surface = row && typeof row.surface === 'string' && row.surface ? row.surface : null;
    return {
      primary: primary,
      surface: surface,
      primaryMode: hidden ? 'none' : mode(row && row.primaryMode, primary ? 'image' : 'built-in'),
      surfaceMode: hidden ? 'none' : mode(row && row.surfaceMode, surface ? 'image' : 'built-in'),
      hidden: hidden,
      size: num(row && row.size, 1, .25, 3),
      x: num(row && row.x, 0, -1.5, 1.5),
      y: num(row && row.y, 0, -1.5, 1.5)
    };
  }
  function sanitizePages(p) {
    var out = {};
    PAGES.forEach(function (page) {
      out[page.id] = sanitizePageEntry((p && p[page.id]) || PAGE_DEFAULTS[page.id]);
    });
    return out;
  }
  function pagesDefaults() { return sanitizePages(PAGE_DEFAULTS); }

  var current = null; /* null until define() is called with a saved (or previewed) value */

  function sanitize(whole) {
    return { tuning: sanitizeTuning(whole && whole.tuning), pages: sanitizePages(whole && whole.pages) };
  }

  function shapeVisible(pageId, whole) {
    var pages = whole && whole.pages ? sanitizePages(whole.pages) : (current ? current.pages : pagesDefaults());
    var row = pages && pages[pageId];
    return !(row && (row.hidden || (row.primaryMode === 'none' && row.surfaceMode === 'none')));
  }

  function problems(whole) {
    if (!whole || typeof whole !== 'object') return ['settings must be an object'];
    return [];
  }

  function define(whole) { current = sanitize(whole || {}); }
  function get() { return current ? { tuning: Object.assign({}, current.tuning), pages: Object.assign({}, current.pages) } : null; }
  function defaults() { return { tuning: tuningDefaults(), pages: pagesDefaults() }; }

  /* the exact file text; the admin page and a hand edit produce the same bytes */
  function serialize(whole) {
    return '/* Live-tunable relief tuning and per-page shape images\n' +
      '   (js/halo/image-shape.js, js/zero-webgl.js). Edit these in\n' +
      '   admin.html -> a page\'s Shapes tab; this file is not meant for\n' +
      '   hand editing. */\n' +
      'ArkMeshSettings.define(' + JSON.stringify(sanitize(whole), null, 2) + ');\n';
  }

  return { fields: fields, placementFields: placementFields, pages: function () { return PAGES.slice(); }, shapeVisible: shapeVisible, defaults: defaults,
           sanitize: sanitize, problems: problems, define: define, get: get, serialize: serialize };
})();

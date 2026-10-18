/* =====================================================================
   SITE-WIDE SETTINGS-GEAR DEFAULTS
   ---------------------------------------------------------------------
   scripts/settings-entry.js (compiled to js/settings/panel.js, loaded by
   index.html) is the real settings-gear widget every visitor sees. Before
   (and unless) a visitor ever touches it, every default it shows was a
   hardcoded literal in that file: theme 'ghost', motif 'blocks', and one
   shared pattern config (structure/visibility/scale/density/softness/
   delay/animated) applied no matter which motif is active. This module
   holds an OVERRIDE on top of those literals -- settings-entry.js reads
   this module's get() as SITE_DEFAULTS, consulted only as the fallback a
   real visitor's own localStorage choice is missing (read(key, fallback)
   already means "my own choice wins; otherwise use the fallback" -- this
   module only changes what that fallback IS, never the precedence).

   get() returns null only before the data file below has run at all
   (never in the shipped site, where settings-defaults-data.js always
   calls define(), even with {} -- which sanitizes to every default
   below, byte-identical to today's hardcoded literals).

   THEME_OPTIONS mirrors scripts/theme-options.js (a GENERATED file --
   never hand-edit it; scripts/settings-entry.js imports it directly as an
   ES module, which this plain script cannot do, so the list is mirrored
   here as a literal -- the same mirrored-constant situation as
   js/admin/admin.js's CMS_FILL_TOKENS, mirrored from
   js/content/layout.js). If scripts/theme-options.js's generated list
   ever changes, update THEME_OPTIONS here to match it.
   ===================================================================== */
var ArkSiteDefaults = (function () {
  'use strict';

  var THEME_OPTIONS = ['clay', 'ochre', 'ghost', 'marine', 'grove', 'moss', 'glacier', 'bone'];
  var MOTIFS = ['blocks', 'traces', 'layers', 'nodes', 'routes', 'tiles', 'frames', 'none'];

  /* Exact literal min/max/default from scripts/settings-entry.js's own `controls` object.
     This module is the one place those numbers are allowed to move away from that literal --
     settings-entry.js's own copy stays as the fallback-of-the-fallback for a control/motif
     combination this module's data file does not cover. */
  var CONTROLS = {
    structure: { min: 0, max: 100, def: 50 },
    visibility: { min: 0, max: 100, def: 72 },
    scale: { min: 60, max: 180, def: 100 },
    density: { min: 20, max: 100, def: 60 },
    softness: { min: 0, max: 100, def: 0 },
    delay: { min: .3, max: 10, def: 1.2 }
  };

  function themeOptions() { return THEME_OPTIONS.slice(); }
  function motifs() { return MOTIFS.slice(); }
  function controls() { return JSON.parse(JSON.stringify(CONTROLS)); }

  function sanitizeTheme(value) {
    return typeof value === 'string' && THEME_OPTIONS.indexOf(value) >= 0 ? value : 'ghost';
  }
  function sanitizeMotif(value) {
    return typeof value === 'string' && MOTIFS.indexOf(value) >= 0 ? value : 'blocks';
  }

  /* `animated` mirrors settings-entry.js's own `stored.animated !== false` rule: anything
     other than the exact boolean false counts as "on" (default true). */
  function sanitizeMotifConfig(row) {
    var out = {};
    Object.keys(CONTROLS).forEach(function (key) {
      var c = CONTROLS[key], n = Number(row && row[key]);
      out[key] = Number.isFinite(n) ? Math.max(c.min, Math.min(c.max, n)) : c.def;
    });
    out.animated = !(row && row.animated === false);
    return out;
  }
  function sanitizePatternConfig(whole) {
    var out = {};
    MOTIFS.forEach(function (motif) { out[motif] = sanitizeMotifConfig(whole && whole[motif]); });
    return out;
  }

  function sanitize(whole) {
    return {
      theme: sanitizeTheme(whole && whole.theme),
      motif: sanitizeMotif(whole && whole.motif),
      patternConfig: sanitizePatternConfig(whole && whole.patternConfig)
    };
  }

  function defaults() {
    var patternConfig = {};
    MOTIFS.forEach(function (motif) { patternConfig[motif] = sanitizeMotifConfig({}); });
    return { theme: 'ghost', motif: 'blocks', patternConfig: patternConfig };
  }

  function problems(whole) {
    if (!whole || typeof whole !== 'object') return ['settings defaults must be an object'];
    return [];
  }

  var current = null; /* null until define() is called with a saved (or previewed) value */
  function define(whole) { current = sanitize(whole || {}); }
  function get() { return current ? JSON.parse(JSON.stringify(current)) : null; }

  /* the exact file text; the admin page and a hand edit produce the same bytes */
  function serialize(whole) {
    return '/* Site-wide settings-gear defaults (scripts/settings-entry.js, compiled to\n' +
      '   js/settings/panel.js): the theme/motif/pattern-config an unconfigured visitor lands\n' +
      '   on. A real visitor\'s OWN later choice, saved to their own localStorage, always wins\n' +
      '   over this. Edit these inside admin-app.html\'s Design panel; this file is not meant\n' +
      '   for hand editing. */\n' +
      'ArkSiteDefaults.define(' + JSON.stringify(sanitize(whole), null, 2) + ');\n';
  }

  return { themeOptions: themeOptions, motifs: motifs, controls: controls,
           sanitize: sanitize, defaults: defaults, problems: problems,
           define: define, get: get, serialize: serialize };
})();

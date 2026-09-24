/* =====================================================================
   THEME (admin-editable themes + background layers)
   ---------------------------------------------------------------------
   The palette js/tokens.js bakes into the base stylesheet at load time is
   fixed. This module holds an OVERRIDE on top of it: colour values,
   defaulting to Tokens.colors so nothing changes until someone edits it
   in the admin, plus a background style choice (js/ark/vendor/backgrounds.js,
   generated from design/ark-ui's background generators -- see
   scripts/sync-ark-backgrounds.cjs). js/main.js applies Tokens.css() first,
   then ArkTheme.css() right after -- later :root rules win by cascade
   order, so this file never has to touch tokens.js or the atomizer.

   Only the plain #rrggbb entries in Tokens.colors are exposed as colour
   fields: a few colours there carry an alpha channel (rgba(...)), which a
   color input cannot represent, so those keep their fixed value.

   get() returns null only before the data file below has run at all
   (never in the shipped site, where theme-data.js always calls define(),
   even with {} -- which sanitizes to every default below).
   ===================================================================== */
var ArkTheme = (function () {
  'use strict';

  var HEX = /^#[0-9a-fA-F]{6}$/;
  var HSL_VALUE = /^\s*\d+(?:\.\d+)?\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%(?:\s*\/\s*(?:0|1|0?\.\d+|\d+(?:\.\d+)?%))?\s*$/;
  var THEME_KEYS = ['ghost', 'bone', 'glacier', 'moss', 'clay', 'grove', 'ochre', 'marine'];
  var THEME_LABELS = { ghost: 'Ghost', bone: 'Bone', glacier: 'Glacier', moss: 'Moss', clay: 'Clay', grove: 'Grove', ochre: 'Ochre', marine: 'Marine' };
  var SEMANTIC_FIELDS = [
    { key: 'canvas', label: 'Canvas' },
    { key: 'surface', label: 'Surface' },
    { key: 'raised', label: 'Raised surface' },
    { key: 'text-strong', label: 'Strong text' },
    { key: 'text', label: 'Body text' },
    { key: 'text-muted', label: 'Muted text' },
    { key: 'primary', label: 'Primary' },
    { key: 'complement', label: 'Complement' },
    { key: 'accent', label: 'Accent' },
    { key: 'accent-subtle', label: 'Accent surface' },
    { key: 'live', label: 'Live signal' },
    { key: 'badge', label: 'Badge' }
  ];

  /* 'none' keeps the flat canvas colour (this site's original look); every other key
     names a style in js/ark/vendor/backgrounds.js (ArkBackgrounds.<key>). */
  var BACKGROUND_LABELS = {
    none: 'None (flat canvas colour)',
    deepTide: 'Deep tide (soft floating shapes)',
    contours: 'Contours', fabric: 'Fabric', lattice: 'Cipher lattice (grid + signal traces)',
    rift: 'Rift', tiles: 'Tiles', typefield: 'Typefield'
  };

  function baseColors() { return (typeof Tokens !== 'undefined' && Tokens.colors) || {}; }

  /* label/def is display metadata; the default always comes from Tokens.colors
     so it can only ever match the site's own built-in palette. */
  function colorFields() {
    var labels = {
      canvas: 'Canvas (the whole page)', ink: 'Ink (headings, CTA label)', 'ink-body': 'Body text',
      'ink-eyebrow': 'Eyebrow text', 'ink-muted': 'Muted nav links', 'cta-a': 'CTA face, top',
      'cta-b': 'CTA face, bottom', 'cta-ink': 'CTA label', 'step-fill': 'Step pill face',
      'step-edge-a': 'Step pill border, left', 'step-edge-b': 'Step pill border, right',
      'nav-edge': 'Nav edge', 'ink-soft': 'Soft ink', 'ink-handle': 'Ink handle', rule: 'Rule line'
    };
    var base = baseColors();
    return Object.keys(base).filter(function (key) { return HEX.test(base[key]); }).map(function (key) {
      return { key: key, label: labels[key] || key, def: base[key] };
    });
  }

  /* the background styles this build actually ships (js/ark/vendor/backgrounds.js), plus
     'none'; reads the vendor bundle's own keys rather than a hand-kept list, so a style
     added there later shows up here with no edit needed -- falls back to the label map's
     own key order if the vendor script has not loaded (e.g. inside a validator test). */
  function backgroundStyles() {
    var keys = (typeof ArkBackgrounds !== 'undefined' ? Object.keys(ArkBackgrounds) : Object.keys(BACKGROUND_LABELS).filter(function (k) { return k !== 'none'; }));
    return ['none'].concat(keys).map(function (key) { return { key: key, label: BACKGROUND_LABELS[key] || key }; });
  }

  function themeOptions() {
    return THEME_KEYS.map(function (key) { return { key: key, label: THEME_LABELS[key] || key }; });
  }

  function semanticFields() {
    return SEMANTIC_FIELDS.map(function (f) { return Object.assign({}, f); });
  }

  function sanitizeColors(overrides) {
    var out = {};
    colorFields().forEach(function (f) {
      var v = overrides && overrides[f.key];
      out[f.key] = typeof v === 'string' && HEX.test(v) ? v : f.def;
    });
    return out;
  }

  function sanitizeBackground(bg) {
    var known = backgroundStyles().map(function (s) { return s.key; });
    var style = bg && typeof bg.style === 'string' && known.indexOf(bg.style) >= 0 ? bg.style : 'none';
    return { style: style };
  }

  function sanitizeActiveTheme(key) {
    return typeof key === 'string' && THEME_KEYS.indexOf(key) >= 0 ? key : 'ghost';
  }

  function sanitizeSemantic(themes) {
    var out = {};
    if (!themes || typeof themes !== 'object') return out;
    THEME_KEYS.forEach(function (theme) {
      var source = themes[theme];
      if (!source || typeof source !== 'object') return;
      var clean = {};
      SEMANTIC_FIELDS.forEach(function (f) {
        var v = source[f.key];
        if (typeof v === 'string' && HSL_VALUE.test(v)) clean[f.key] = v.trim().replace(/\s+/g, ' ');
      });
      if (Object.keys(clean).length) out[theme] = clean;
    });
    return out;
  }

  function sanitize(whole) {
    return {
      colors: sanitizeColors(whole && whole.colors),
      activeTheme: sanitizeActiveTheme(whole && whole.activeTheme),
      themes: sanitizeSemantic(whole && whole.themes),
      background: sanitizeBackground(whole && whole.background)
    };
  }

  function defaults() {
    var colors = {};
    colorFields().forEach(function (f) { colors[f.key] = f.def; });
    return { colors: colors, activeTheme: 'ghost', themes: {}, background: { style: 'none' } };
  }

  function problems(whole) {
    if (!whole || typeof whole !== 'object') return ['theme must be an object'];
    return [];
  }

  var current = null;
  function define(whole) { current = sanitize(whole || {}); }
  function get() {
    return current ? {
      colors: Object.assign({}, current.colors),
      activeTheme: current.activeTheme,
      themes: JSON.parse(JSON.stringify(current.themes || {})),
      background: Object.assign({}, current.background)
    } : null;
  }

  /* :root{--ark-canvas:#...;...} -- appended after Tokens.css() so it wins by source order.
     Only colours: the background style is a DOM mount (js/main.js), not a custom property. */
  function css(draft) {
    var whole = draft ? sanitize(draft) : (get() || defaults());
    var decls = Object.keys(whole.colors).map(function (k) { return '--ark-' + k + ':' + whole.colors[k] + ';'; }).join('');
    var rules = [':root{' + decls + '}'];
    Object.keys(whole.themes || {}).forEach(function (theme) {
      var body = Object.keys(whole.themes[theme]).map(function (k) { return '--' + k + ':' + whole.themes[theme][k] + ';'; }).join('');
      if (body) rules.push(':root[data-theme="' + theme + '"]{' + body + '}');
    });
    return rules.join('\n');
  }

  /* the exact file text; the admin page and a hand edit produce the same bytes */
  function serialize(whole) {
    return '/* Live-tunable themes and background layers (css/themes.css,\n' +
      '   js/ark/vendor/backgrounds.js). Edit these inside each page in admin.html; this file\n' +
      '   is not meant for hand editing. */\n' +
      'ArkTheme.define(' + JSON.stringify(sanitize(whole), null, 2) + ');\n';
  }

  return { colorFields: colorFields, semanticFields: semanticFields, themeOptions: themeOptions, backgroundStyles: backgroundStyles, defaults: defaults, sanitize: sanitize, problems: problems,
           define: define, get: get, css: css, serialize: serialize };
})();

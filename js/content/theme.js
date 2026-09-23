/* =====================================================================
   THEME (admin-editable "shades" + "background")
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

  function sanitize(whole) {
    return { colors: sanitizeColors(whole && whole.colors), background: sanitizeBackground(whole && whole.background) };
  }

  function defaults() {
    var colors = {};
    colorFields().forEach(function (f) { colors[f.key] = f.def; });
    return { colors: colors, background: { style: 'none' } };
  }

  function problems(whole) {
    if (!whole || typeof whole !== 'object') return ['theme must be an object'];
    return [];
  }

  var current = null;
  function define(whole) { current = sanitize(whole || {}); }
  function get() { return current ? { colors: Object.assign({}, current.colors), background: Object.assign({}, current.background) } : null; }

  /* :root{--ark-canvas:#...;...} -- appended after Tokens.css() so it wins by source order.
     Only colours: the background style is a DOM mount (js/main.js), not a custom property. */
  function css() {
    var whole = get() || defaults();
    var decls = Object.keys(whole.colors).map(function (k) { return '--ark-' + k + ':' + whole.colors[k] + ';'; }).join('');
    return ':root{' + decls + '}';
  }

  /* the exact file text; the admin page and a hand edit produce the same bytes */
  function serialize(whole) {
    return '/* Live-tunable colour overrides and background style (js/tokens.js\'s palette,\n' +
      '   js/ark/vendor/backgrounds.js). Edit these in admin.html -> Design; this file\n' +
      '   is not meant for hand editing. */\n' +
      'ArkTheme.define(' + JSON.stringify(sanitize(whole), null, 2) + ');\n';
  }

  return { colorFields: colorFields, backgroundStyles: backgroundStyles, defaults: defaults, sanitize: sanitize, problems: problems,
           define: define, get: get, css: css, serialize: serialize };
})();

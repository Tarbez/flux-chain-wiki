/* =====================================================================
   THE 3D WORLD, AS CONTENT (ArkWorld)
   ---------------------------------------------------------------------
   The ring world that stands under every page (the home redesign merge, owner 2026-10-24: "we now also
   need to support editing the 3D from the CMS, and even control the animations and exits from there").
   This module is the one description of what the CMS may change about that world, and the one reader
   the world uses. The world (js/world/*) never keeps its own copy of these numbers: it asks get().

   SCHEMA below is the single source. sanitize() clamps every knob to it, defaults() is it with no input,
   and knobs() lists it for the CMS panel, so a knob added here appears in the editor with no other change
   (derive, don't author).

   Stored form: FLX, never JSON (workspace law, "stored state is FLX"). serialize() writes the value as
   records of ARK's structured-state grammar (js/vendor/flx-state-grammar.js, ARK_FLX_STATE), one record
   per leaf. The site loads from file:// too, so the records travel inside one JS call:
       ArkWorld.define("<FLX records>");
   define() takes that text (or a plain value from the CMS preview), decodes it and sanitizes it.
   The round trip is exact: decode(encode(x)) re-encodes to the same records (tests/world-content.cjs).

   Shape: { version, look: {...}, motion: {...}, story: {...}, views: { <route>: {...} }, exits: { <route>: {...} } }
     look     the light and the air, site-wide
     motion   how the camera flies and how a page's words come and go
     story    the first visit's intro steps
     views    per route: camera overrides (any field left out keeps the view's own built-in camera)
     exits    per route: how its words leave
   The defaults are the values the world shipped with on 2026-10-24 (the cinematic pass), so an empty
   draft changes nothing. */
var ArkWorld = (function () {
  'use strict';

  /* [min, max, default, step, label] per number knob; arrays of choices for a choice knob */
  var SCHEMA = {
    look: {
      keyStrength: [0, 6, 2.3, 0.05, 'Key light'],
      keyX: [-60, 60, -30, 1, 'Key light, left to right'],
      keyY: [0, 60, 26, 1, 'Key light, height'],
      keyZ: [-60, 60, -8, 1, 'Key light, front to back'],
      keySoftness: [0, 24, 9, 0.5, 'Key shadow softness'],
      backStrength: [0, 4, 1.05, 0.05, 'Back light'],
      fillStrength: [0, 2, 0.2, 0.02, 'Fill light (cool)'],
      skyStrength: [0, 2, 0.22, 0.02, 'Sky light'],
      envStrength: [0, 2, 0.16, 0.02, 'Room light'],
      exposure: [0.4, 2.4, 1.12, 0.02, 'Exposure'],
      contrast: [0, 1, 0.32, 0.01, 'Contrast'],
      fogStart: [0.3, 3, 0.93, 0.01, 'Haze starts (times the view distance)'],
      fogEnd: [0.6, 6, 2.4, 0.05, 'Haze is full (times the view distance)'],
      grain: [0, 1, 1, 0.05, 'Surface grain'],
      logoLight: [0, 60, 22, 0.5, 'Ground logo light'],
      logoReach: [2, 40, 16, 0.5, 'Ground logo light reach'],
      emberLight: [0, 60, 26, 0.5, 'Record light (trace page)'],
      emberReach: [2, 40, 12, 0.5, 'Record light reach'],
      beam: [0, 1, 1, 0.05, 'Beam'],
      dust: [0, 400, 150, 10, 'Dust specks']
    },
    motion: {
      flight: [400, 4000, 1750, 50, 'Camera flight (ms)'],
      crane: [0, 2, 1, 0.05, 'Lift on long flights'],
      riseIn: [0, 1600, 550, 10, 'Words come in (ms)'],
      riseStagger: [0, 160, 40, 2, 'Words come in, one after another (ms)'],
      riseOut: [0, 1200, 320, 10, 'Words leave (ms)'],
      cardZoom: [1, 3, 1.45, 0.05, 'Intro card zoom (scale)'],
      cardZoomTime: [100, 2000, 600, 10, 'Intro card zoom (ms)']
    },
    story: {
      on: [false, true, true, null, 'Play the first-visit intro'],
      step1: [0, 8000, 600, 50, 'Step 1: the wide grid (ms)'],
      step4: [0, 12000, 3900, 50, 'Step 4: the identity chain (ms)'],
      skipOnReturn: [false, true, true, null, 'Skip it on a return visit']
    },
    view: {
      aimX: [-80, 80, null, 0.1, 'Camera looks at, left to right'],
      aimY: [-20, 40, null, 0.1, 'Camera looks at, height'],
      aimZ: [-80, 80, null, 0.1, 'Camera looks at, front to back'],
      dist: [2, 400, null, 0.5, 'Camera distance'],
      elev: [-10, 89, null, 0.5, 'Camera height angle (degrees)'],
      yaw: [-180, 180, null, 0.5, 'Camera turn (degrees)'],
      tilt: [0, 4, null, 0.05, 'Camera tilt'],
      dim: [0, 1, null, 0.01, 'Network steps back']
    },
    exit: {
      words: [['up', 'side', 'zoom'], 'up', 'How its words leave']
    }
  };
  var GROUPS = ['look', 'motion', 'story'];
  var ROUTE = /^\/[a-z0-9/_-]*$/;   /* a route as the page table writes it: "/", "/chain", "/how/ask" */

  function isBool(spec) { return typeof spec[0] === 'boolean'; }
  function num(spec, value) {
    if (value === null || value === undefined || value === '') return spec[2];
    var n = Number(value);
    return Number.isFinite(n) ? Math.max(spec[0], Math.min(spec[1], n)) : spec[2];
  }
  function one(spec, value) { return isBool(spec) ? (typeof value === 'boolean' ? value : spec[2]) : num(spec, value); }
  function group(name, whole) {
    var out = {}, src = whole && typeof whole[name] === 'object' && whole[name] || {};
    Object.keys(SCHEMA[name]).forEach(function (k) { out[k] = one(SCHEMA[name][k], src[k]); });
    return out;
  }
  /* a view keeps only the overrides it was given: an absent field means "the view's own camera" */
  function view(src) {
    var out = {};
    Object.keys(SCHEMA.view).forEach(function (k) {
      if (src && src[k] !== null && src[k] !== undefined && src[k] !== '' && Number.isFinite(Number(src[k]))) out[k] = num(SCHEMA.view[k], src[k]);
    });
    return out;
  }
  function exit(src) {
    var choices = SCHEMA.exit.words[0], w = src && src.words;
    return { words: choices.indexOf(w) >= 0 ? w : SCHEMA.exit.words[1] };
  }
  function byRoute(map, read, keep) {
    var out = {};
    if (map && typeof map === 'object') Object.keys(map).sort().forEach(function (route) {
      if (!ROUTE.test(route)) return;
      var v = read(map[route]); if (keep(v)) out[route] = v;
    });
    return out;
  }

  function sanitize(whole) {
    var out = { version: 1 };
    GROUPS.forEach(function (g) { out[g] = group(g, whole); });
    out.views = byRoute(whole && whole.views, view, function (v) { return Object.keys(v).length > 0; });
    out.exits = byRoute(whole && whole.exits, exit, function (v) { return v.words !== SCHEMA.exit.words[1]; });
    return out;
  }
  function defaults() { return sanitize({}); }

  /* the knobs, for the CMS panel: one row per knob, in schema order */
  function knobs() {
    var rows = [];
    Object.keys(SCHEMA).forEach(function (g) {
      Object.keys(SCHEMA[g]).forEach(function (k) {
        var s = SCHEMA[g][k];
        if (g === 'exit') rows.push({ group: g, key: k, kind: 'choice', choices: s[0].slice(), value: s[1], label: s[2] });
        else rows.push({ group: g, key: k, kind: isBool(s) ? 'toggle' : 'number', min: s[0], max: s[1], value: s[2], step: s[3], label: s[4] });
      });
    });
    return rows;
  }

  function flx() {
    var F = typeof ARK_FLX_STATE !== 'undefined' ? ARK_FLX_STATE : (typeof require === 'function' ? require('../vendor/flx-state-grammar.js') : null);
    if (!F) throw new Error('ArkWorld needs js/vendor/flx-state-grammar.js loaded before it (ARK_FLX_STATE)');
    return F;
  }
  function encode(whole) { return flx().encodeState(sanitize(whole)); }
  function decode(text) { return sanitize(flx().decodeState(String(text))); }

  var current = defaults(), listeners = [];
  /* FLX text from the data file, or a plain value from the CMS preview */
  function define(value) {
    current = typeof value === 'string' ? decode(value) : sanitize(value);
    listeners.slice().forEach(function (fn) { try { fn(get()); } catch (e) { console.error('ArkWorld listener: ' + e.message); } });
    return get();
  }
  function get() { return JSON.parse(JSON.stringify(current)); }
  /* the world repaints on a change (the CMS preview defines a new draft in place); returns a stop function */
  function onChange(fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; }
  /* one route's camera overrides and exit, already sanitized */
  function forRoute(route) { return { view: current.views[route] || {}, exit: current.exits[route] || { words: SCHEMA.exit.words[1] } }; }

  /* the exact file text: the Studio edit and a hand edit produce the same bytes */
  function serialize(whole) {
    return '/* The 3D world under every page: light, air, motion, the first-visit story, per-route camera and\n' +
      '   exits (js/content/world.js). FLX records of ARK\'s structured-state grammar, one per leaf.\n' +
      '   Edit from DEFXN Studio, Design > World; this file is not meant for hand editing. */\n' +
      'ArkWorld.define(' + JSON.stringify(encode(whole)) + ');\n';
  }

  return { SCHEMA: SCHEMA, sanitize: sanitize, defaults: defaults, knobs: knobs, encode: encode, decode: decode,
    define: define, get: get, onChange: onChange, forRoute: forRoute, serialize: serialize };
})();
if (typeof module === 'object' && module.exports) module.exports = ArkWorld;

/* =====================================================================
   PER-ELEMENT IN/OUT ANIMATION OVERRIDES
   ---------------------------------------------------------------------
   js/ark/scene-state.js's ArkUI.createPresence is the real, live element
   entrance/exit animator -- it runs on every route change, driven by two
   hardcoded CSS-class-name selector lists (homeItems/pageItems) that stagger
   opacity + a small translate3d for whatever matches. This module lets a real,
   individually addressed element (one already carrying a data-ark-layout-key,
   the same address js/content/layout.js's responsive overrides use) override
   its own direction/distance/duration/delay/easing instead of the computed
   default -- additive, never a replacement of the existing stagger: an
   element with no entry here keeps today's exact existing behavior.

   Shape: { version, routes: { route: { key: { direction, distance, duration,
   delay, easing } } } }. Mirrors js/content/layout.js's exact per-route/per-
   key storage shape and sanitize caps (ROUTE_CAP/KEY_CAP/ROUTE_LEN/KEY_LEN
   below are the SAME numbers ArkLayout.sanitize() uses, for consistency, not
   a second set of limits) -- but unlike a layout frame, where most fields are
   optional and merge across breakpoints, an element-motion entry always
   carries all five fields (defaulted by cleanEntry), since there is no
   breakpoint cascade here to merge against.

   Edited from DEFXN Studio's animation-only mode (restrictMode === 'anim',
   admin-studio.html) via a postMessage round trip into the connected preview
   iframe, mirroring js/content/canvas-transitions.js's own command pipeline
   exactly, substituting this module's per-route/per-key addressing for that
   module's single global object: js/main.js holds the live draft and relays
   whole-draft replaces up to admin-studio.html, which relays them on to
   js/admin/admin.js, which persists via ArkAdminStore.saveElementMotion ->
   this file's sibling element-motion-data.js. Studio's "Preview" button calls
   a one-shot animation built the same way createPresence's own show() would,
   against the connected preview's live DOM, with no real navigation. */
var ArkElementMotion = (function () {
  'use strict';

  var DIRECTIONS = ['up', 'down', 'left', 'right', 'none'];
  /* Same EASINGS enum as js/content/canvas-transitions.js's ArkCanvasTransitions,
     reused rather than inventing a second list, for consistency across the two
     new Studio-authored animation systems. */
  var EASINGS = ['ease', 'ease-out', 'ease-in-out'];
  /* Direction vectors describe the point an element travels FROM (entering) or
     TO (exiting), relative to its resting position -- 'up' means the element's
     own motion travels upward over the course of the animation, matching the
     sign createPresence's existing hardcoded 'up'-shaped stagger already uses
     (translate3d(0,+8px,0) entering, translate3d(0,-6px,0) exiting: both move
     in the same upward direction, just from different sides of rest). */
  var VECTORS = { up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0], none: [0, 0] };

  /* distance: createPresence's own existing hardcoded translate magnitude is
     8px (entering) / 6px (exiting) -- 0-60px keeps a single override distance
     in the same rough magnitude family while allowing a deliberately larger
     move, never an unrelated scale. duration/delay: 0-1200ms, the same
     MIN_MS/MAX_MS ArkCanvasTransitions already uses for its own fade timings,
     reused here for the same "one sane animation-duration ceiling across both
     new systems" reasoning as the shared easing enum. */
  var MIN_DISTANCE = 0, MAX_DISTANCE = 60;
  var MIN_MS = 0, MAX_MS = 1200;
  var DEFAULT_DIRECTION = 'up', DEFAULT_DISTANCE = 8, DEFAULT_DURATION = 260, DEFAULT_DELAY = 0, DEFAULT_EASING = 'ease';

  /* The SAME route/key caps and length limits ArkLayout.sanitize() uses
     (js/content/layout.js: 500 routes, 3000 keys per route, 300/500 char
     limits) -- reused, not re-derived, for the law this file's own header
     states: addressing one real element the same way everywhere. */
  var ROUTE_CAP = 500, KEY_CAP = 3000, ROUTE_LEN = 300, KEY_LEN = 500;

  function clamp(value, min, max, fallback) {
    /* Number(null) is 0, a finite number -- without this explicit check a
       missing field on a null/undefined whole entry would silently sanitize
       to 0 instead of falling back to the real default (same reasoning as
       ArkCanvasTransitions.clampDuration). */
    if (value === null || value === undefined) return fallback;
    var n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  }
  function oneOf(value, list, fallback) { return list.indexOf(value) >= 0 ? value : fallback; }
  function cleanEntry(entry) {
    entry = entry && typeof entry === 'object' ? entry : {};
    return {
      direction: oneOf(entry.direction, DIRECTIONS, DEFAULT_DIRECTION),
      distance: clamp(entry.distance, MIN_DISTANCE, MAX_DISTANCE, DEFAULT_DISTANCE),
      duration: clamp(entry.duration, MIN_MS, MAX_MS, DEFAULT_DURATION),
      delay: clamp(entry.delay, MIN_MS, MAX_MS, DEFAULT_DELAY),
      easing: oneOf(entry.easing, EASINGS, DEFAULT_EASING)
    };
  }
  function defaultEntry() { return cleanEntry({}); }

  function sanitize(whole) {
    var out = { version: 1, routes: {} }, routes = whole && whole.routes;
    if (!routes || typeof routes !== 'object') routes = {};
    Object.keys(routes).slice(0, ROUTE_CAP).forEach(function (route) {
      if (route[0] !== '/' || route.length > ROUTE_LEN) return;
      var nodes = routes[route]; if (!nodes || typeof nodes !== 'object') return;
      var cleanNodes = {};
      Object.keys(nodes).slice(0, KEY_CAP).forEach(function (key) {
        if (!key || key.length > KEY_LEN) return;
        cleanNodes[key] = cleanEntry(nodes[key]);
      });
      if (Object.keys(cleanNodes).length) out.routes[route] = cleanNodes;
    });
    return out;
  }
  function defaults() { return sanitize({}); }
  var current = defaults();
  function define(value) { current = sanitize(value); return get(); }
  function get() { return JSON.parse(JSON.stringify(current)); }

  /* Pure lookup against any whole-document-shaped value (the module's own live
     `current`, or an unsaved draft held elsewhere, e.g. js/main.js's
     cmsElementMotionDraft) -- mirrors js/content/layout.js's labelFor(value,
     route, key) taking an explicit value rather than always reading its own
     closure, since both the live runtime (createPresence) and Studio's
     draft-aware Preview button need to look a single entry up, from two
     different documents. Returns null, never a default-filled entry, when no
     override is stored -- callers that need "no override" to mean exactly
     that (createPresence's additive branch) rely on this distinction. */
  function entryFor(value, route, key) {
    if (!route || !key) return null;
    var doc = sanitize(value), nodes = doc.routes[route], entry = nodes && nodes[key];
    return entry ? cleanEntry(entry) : null;
  }

  function set(value, route, key, patch) {
    var doc = sanitize(value), nodes = doc.routes[route] || (doc.routes[route] = {});
    nodes[key] = cleanEntry(Object.assign({}, nodes[key], patch));
    return sanitize(doc);
  }
  function remove(value, route, key) {
    var doc = sanitize(value), nodes = doc.routes[route];
    if (nodes) { delete nodes[key]; if (!Object.keys(nodes).length) delete doc.routes[route]; }
    return sanitize(doc);
  }

  /* the exact file text; the Studio-driven edit and a hand edit produce the same bytes */
  function serialize(whole) {
    return '/* Per-element in/out animation overrides authored in DEFXN Studio\'s\n' +
      '   animation-only mode ("Edit canvas" on the connected preview\'s right-click menu,\n' +
      '   then "Switch to animations"). Edits ArkUI.createPresence\'s per-element stagger\n' +
      '   (js/ark/scene-state.js) -- an element with no entry here keeps its existing\n' +
      '   hardcoded behavior unchanged. This file is not meant for hand editing. */\n' +
      'ArkElementMotion.define(' + JSON.stringify(sanitize(whole), null, 2) + ');\n';
  }

  return {
    directions: function () { return DIRECTIONS.slice(); },
    easings: function () { return EASINGS.slice(); },
    vectorFor: function (direction) { return (VECTORS[direction] || VECTORS[DEFAULT_DIRECTION]).slice(); },
    sanitize: sanitize, defaults: defaults, defaultEntry: defaultEntry,
    define: define, get: get, entryFor: entryFor, set: set, remove: remove, serialize: serialize,
    MIN_DISTANCE: MIN_DISTANCE, MAX_DISTANCE: MAX_DISTANCE, MIN_MS: MIN_MS, MAX_MS: MAX_MS
  };
})();

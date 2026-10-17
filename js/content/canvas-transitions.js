/* =====================================================================
   SITE-WIDE BACKGROUND IN/OUT TRANSITION
   ---------------------------------------------------------------------
   js/ark/page-router.js's navigate() is the only real caller: the lattice/
   atmosphere/brand-mesh canvases live in one persistent layer
   (scene.querySelector('[data-ark-layer="persistent"]'), the same single
   container js/lattice.js/js/hero-motion.js/js/zero-webgl.js already append
   their own elements into), booted once outside the routed outlet. Before
   this module existed, that layer had zero enter/exit animation tied to
   navigation -- only the continuous camera pan already running kept moving.
   This module adds one small, additive, CSS-only opacity (and, for
   'fade-scale', transform) transition on that single element, applied once
   when a navigation begins (phase 'out') and once when the incoming page
   starts entering (phase 'in'). It is site-wide, not per-element or per-
   route, same as js/content/settings-defaults.js's own site-wide shape --
   the background is one persistent layer, not a per-route thing today.

   Shape: { version, effect: 'fade'|'fade-scale', outDuration, inDuration,
            easing }. There is no "today's behavior" this has to stay
   byte-identical to (no page-background transition existed before this),
   so the DEFAULT is a real, intentional, subtle transition -- a quick
   ~220ms fade out / ~260ms fade in with the platform 'ease' timing --
   never "disabled," which the plan this module implements explicitly
   calls out: defaulting to invisible would be "built but defaulted to
   not existing," not what was asked for.

   Edited from DEFXN Studio's canvas-only mode (restrictMode === 'canvas',
   admin-studio.html) via a postMessage round trip into the connected
   preview iframe, mirroring js/content/states.js's own command pipeline:
   js/main.js holds the live draft and relays whole-draft replaces up to
   admin-studio.html, which relays them on to js/admin/admin.js, which
   persists via ArkAdminStore.saveCanvasTransitions -> this file's sibling
   canvas-transitions-data.js. Studio's "Preview this transition" button
   calls apply() directly against the connected iframe's persistent layer,
   with no real navigation, reusing this exact apply() function. */
var ArkCanvasTransitions = (function () {
  'use strict';

  var EFFECTS = ['fade', 'fade-scale'];
  var EASINGS = ['ease', 'ease-out', 'ease-in-out'];
  var MIN_MS = 0, MAX_MS = 1200;
  var DEFAULT_OUT_MS = 220, DEFAULT_IN_MS = 260, DEFAULT_EASING = 'ease', DEFAULT_EFFECT = 'fade';
  /* The subtle 'fade-scale' scale value the outgoing layer eases toward and the
     incoming layer eases back from -- small enough to read as a gentle settle,
     never a zoom. */
  var OUT_SCALE = 0.98, IN_SCALE = 1;

  function effects() { return EFFECTS.slice(); }
  function easings() { return EASINGS.slice(); }

  function clampDuration(value, fallback) {
    /* Number(null) is 0, a finite number -- without this explicit check, a missing
       field on a null/undefined whole object (a plain `whole && whole.outDuration`
       lookup, which is null rather than undefined when whole itself is null) would
       silently sanitize to 0ms instead of falling back to the real default. */
    if (value === null || value === undefined) return fallback;
    var n = Number(value);
    return Number.isFinite(n) ? Math.max(MIN_MS, Math.min(MAX_MS, n)) : fallback;
  }

  function sanitize(whole) {
    return {
      version: 1,
      effect: whole && EFFECTS.indexOf(whole.effect) >= 0 ? whole.effect : DEFAULT_EFFECT,
      outDuration: clampDuration(whole && whole.outDuration, DEFAULT_OUT_MS),
      inDuration: clampDuration(whole && whole.inDuration, DEFAULT_IN_MS),
      easing: whole && EASINGS.indexOf(whole.easing) >= 0 ? whole.easing : DEFAULT_EASING
    };
  }

  function defaults() { return sanitize({}); }

  var current = defaults();
  function define(value) { current = sanitize(value); return get(); }
  function get() { return JSON.parse(JSON.stringify(current)); }

  /* the exact file text; the Studio-driven edit and a hand edit produce the same bytes */
  function serialize(whole) {
    return '/* Site-wide background in/out transition (js/ark/page-router.js navigate()): the\n' +
      '   fade the persistent lattice/atmosphere/brand-mesh layer goes through between pages.\n' +
      '   Edit from DEFXN Studio\'s canvas-only mode ("Edit canvas" on the connected preview\'s\n' +
      '   right-click menu); this file is not meant for hand editing. */\n' +
      'ArkCanvasTransitions.define(' + JSON.stringify(sanitize(whole), null, 2) + ');\n';
  }

  /* The one real runtime entry point (also reused as-is by Studio's "Preview this
     transition" button, against the connected preview's own persistent layer, with
     no real navigation involved). Plain CSS, deliberately simpler than
     ArkUI.createPresence's WAAPI stagger in js/ark/scene-state.js -- this is one
     single element, never a staggered list, so a transition/opacity (and, for
     'fade-scale', transform) style write is all it needs. Returns the duration (ms)
     it just applied, so a caller that needs to sequence a follow-up (Studio's preview
     round trip) does not have to re-read get() itself. Never throws: a non-element
     argument is a safe no-op, the same "missing script/unusual boot order degrades to
     no background transition, never a broken navigation" guarantee page-router.js's
     own call site also applies defensively. */
  function apply(element, phase) {
    if (!element || !element.style) return 0;
    var cfg = get();
    var duration = phase === 'in' ? cfg.inDuration : cfg.outDuration;
    var transition = 'opacity ' + duration + 'ms ' + cfg.easing;
    if (cfg.effect === 'fade-scale') transition += ', transform ' + duration + 'ms ' + cfg.easing;
    element.style.transition = transition;
    element.style.opacity = phase === 'in' ? '1' : '0';
    if (cfg.effect === 'fade-scale') element.style.transform = 'scale(' + (phase === 'in' ? IN_SCALE : OUT_SCALE) + ')';
    else if (element.style.transform) element.style.transform = '';
    return duration;
  }

  return {
    effects: effects, easings: easings,
    sanitize: sanitize, defaults: defaults, define: define, get: get, serialize: serialize,
    apply: apply
  };
})();

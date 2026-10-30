/* =====================================================================
   THE DESIGN BOARD'S SIDE OF THE GRAMMAR HOST (docs/home-redesign/home-mockup.html).
   ---------------------------------------------------------------------
   world2-host.mjs was written for the site: it reads its pages from ArkUI.pageRouter, its current page from ArkUI.sceneState
   and its motion knobs from ArkWorld. The board has none of those (it is one page whose .view sections app.js shows and hides),
   so this module gives the host the five things it asks for, answered from the board's own DOM. It must be evaluated before
   world2-host.mjs (world2-board.mjs imports it first). It holds no scene logic and no numbers of the world: the host draws,
   the board only answers "which page", "which box" and "which knobs".

   Why a stand-in and not a second host: the host's flights, build-up, picks, hovers and labels are the same motion the Three.js
   board had (chains-scene.js was their source), and a second copy would drift from the first (workspace law: centralize).
   ===================================================================== */
(function () {
  'use strict';
  var root = document.documentElement, page = 'home';
  function viewOf(key) { return typeof key === 'string' ? document.querySelector('.view[data-view="' + key + '"]') : null; }

  /* the board's views, found at the moment they are asked for: the concept, identity, intro and trace views add their sections after this module runs */
  var pages = new Proxy({}, { get: function (_, key) { return viewOf(key) || undefined; } });
  var catalog = new Proxy({}, { get: function (_, key) { return viewOf(key) ? { path: '/' + key, aliases: [] } : undefined; } });

  /* a click in the world that leaves for another view is the board's address: the same hash app.js reads */
  var router = {
    pages: pages,
    onMount: function () {},   /* the board shows a view itself (app.js show()); the host is told by S.to, not by a mount */
    navigate: function (key, settings) {
      var q = settings && settings.query ? '?' + settings.query : '', hash = '#/' + key + q;
      if (settings && settings.history === 'replace') location.replace(hash); else location.hash = hash;
    }
  };

  /* a view that is not shown is held to one screen's height by the board's CSS; app.js measures it with the class "measuring" (asShown in app.js) */
  function asShown(el, fn) {
    var hidden = el && el.classList && el.classList.contains('view') && !el.classList.contains('on') && !el.classList.contains('out');
    if (hidden) el.classList.add('measuring');
    try { return fn(); } finally { if (hidden) el.classList.remove('measuring'); }
  }

  window.ArkUI = Object.assign(window.ArkUI || {}, {
    pageRouter: router,
    pageCatalog: catalog,
    sceneState: { get: function () { return { page: page }; }, set: function (key) { page = key; } },
    prefersReducedMotion: function () { return matchMedia('(prefers-reduced-motion: reduce)').matches; },
    asShown: asShown,
    /* the board zooms its root by kit-ui.js's scale above 1440 x 900 (js DEFXNKitUI.scale), so a label's place is the screen point divided by it, as app.js did */
    pageScale: function () { return window.DEFXNKitUI && window.DEFXNKitUI.scale ? window.DEFXNKitUI.scale() : 1; },
    /* the board's home picture is fitted a little wider than the site's (app.js frameOf: the far rings run under the side cards, 2026-10-24) */
    homeRoom: 1.6
  });

  /* the host reads the motion knobs of the words' rise (ArkWorld.get().motion) and the CMS per-route camera (forRoute(path).view). The board has no CMS:
     the camera is the world's own, and the rise is the board's CSS (home-mockup.html .rise), so the knobs are left empty and the host's variables are unused here. */
  window.ArkWorld = window.ArkWorld || {
    get: function () { return { motion: {}, look: {} }; },
    forRoute: function () { return { view: null, exit: { words: 'up' } }; },
    onChange: function () { return function () {}; }
  };
  root.dataset.board = '1';
})();

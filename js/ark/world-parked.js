/* THE OLD 3D WORLD IS PARKED (owner, 2026-11-11: "the old 3D from the past, that kernel, is still there... we needed to park that").
   Layer: app (the site). The site's only 3D is the fxn-3d view: the home's portal and the twelve topic objects, through js/ark/stage.js.

   What is parked, in place and unloaded (no page asks for any of it): js/world2/* (the scene, entry world2-host.mjs), js/space/* (its
   parts: the labels, the map, the tags, the keys, the shows, the trips, the old intro film), css/space/*, and the records world/world.flx,
   card.flx and kit.flx. A copy as it stood is in /Volumes/PortableSSD/archive/site-old-3d-world-2026-11-11/. To bring it back, put
   <script type="module" src="js/world2/world2-host.mjs"> in the place of this file in index.html and build the shell.

   This file is what the pages still need from that host, with the same behaviour the host had wherever the world was off
   (it stopped at `if (!wanted) return`, and every page was written to work without it):
     html[data-world="off"]   the pages' own "no world" styles (css/world-chain.css, css/world-measure.css, css/account.css)
     window.ArkWorldHost      the surface pages test before they talk to a world: owns() answers false, ready stays false, and state,
                              select and on are absent, which is each page's sign to work on its own (js/pages/world-sheet.js host())
     ArkUI.worldRise          how a .world-page's words enter and leave: by transform and clip, never a fade (js/ark/scene-state.js calls it)
     the address              an old address that opens a page (catalog aliases) is rewritten to the page's own path
   A fresh load of "/" opens the home hero in js/hero-motion.js (restoreRoute), so the host's own copy of that rule did not move here. */
(function () {
  'use strict';
  var root = document.documentElement, scene = document.getElementById('scene');
  var router = window.ArkUI && ArkUI.pageRouter, state = window.ArkUI && ArkUI.sceneState;
  if (!scene || !router || !state || !window.ArkWorld) return;

  var ease = 'cubic-bezier(.22,.7,.18,1)';
  /* route key -> the view the old world drew for it. Kept because the surface names it (viewOf, viewFor, keyOf); nothing draws from it */
  var VIEW_OF = {
    zero: 'home', intro: 'intro', download: 'download',
    chain: 'chain', 'chain/record': 'record', 'chain/open': 'open', 'chain/links': 'links',
    identity: 'idstart', 'identity/sign': 'idsign', 'identity/safe': 'idsafe', 'identity/you': 'idyou',
    resolvers: 'resolvers', fxn: 'fxn', ring: 'ring', account: 'idvalue', auth: 'auth', kit: 'kit',
    'stats/ceiling': 'stats', 'stats/capabilities': 'stats', 'stats/now': 'stats',
    works: 'movie', 'works/resolve': 'resolve', 'works/layers': 'layers', 'works/life': 'life', trace: 'trace'
  };
  var KEY_OF = {};
  Object.keys(VIEW_OF).forEach(function (key) { KEY_OF[VIEW_OF[key]] = key; });
  function viewFor(key) { return VIEW_OF[key] || 'calm'; }
  function setView(key, view) { VIEW_OF[key] = view; KEY_OF[view] = key; }
  function pathOf(key) { var entry = ArkUI.pageCatalog && ArkUI.pageCatalog[key]; return entry ? entry.path : '/'; }

  /* no world: owns() is false and whenReady never calls back, as on a machine where the world could not start */
  window.ArkWorldHost = { film: function () { return null; }, filmState: null, version: 'parked-2026-11-11', grammar: true, parked: true,
    calm: { n: .6, elev: 30, dist: 135, tilt: 1.2 }, viewOf: VIEW_OF, viewFor: viewFor, setView: setView, keyOf: function (view) { return KEY_OF[view] || null; },
    ready: false, failed: false, covered: false, owns: function () { return false; }, whenReady: function () {} };

  /* ---------- the words' rise (docs/design/world-grammar/CONTRACT.md), moved here unchanged from js/world2/world2-host.mjs ----------
     A world page (class world-page) enters and leaves by its .rise items: a transform and a clip, with the timings of ArkWorld.motion.
     Nothing fades. ArkUI.createPresence (js/ark/scene-state.js) calls this for a page with that class and waits for the animations. */
  var CARD_IN = { transform: 'translateY(18px) scale(.97)', clipPath: 'inset(0 0 100% 0 round 16px 5px)' };
  var CARD_SHOWN = { transform: 'none', clipPath: 'inset(-40px round 16px 5px)' };
  var RISE_IN = { transform: 'translateY(16px)', clipPath: 'inset(0 0 100% 0)' };
  var RAIL_IN = { transform: 'translateX(56px)', clipPath: 'inset(0 0 0 100%)' };
  var SHOWN = { transform: 'none', clipPath: 'inset(-24px -60px -24px -60px)' };
  function riseItems(el) {
    var all = Array.prototype.slice.call(el.querySelectorAll('.rise'));
    return all.filter(function (item) { for (var n = item; n && n !== el; n = n.parentElement) if (n.hidden) return false; return true; });
  }
  function leaving(kind, m, card) {
    if (card) return { to: { transform: 'scale(' + m.cardZoom + ')', clipPath: 'inset(48% 48% 48% 48% round 16px 5px)' }, duration: m.cardZoomTime, step: 0 };
    if (kind === 'side') return { to: { transform: 'translateX(-34px)', clipPath: 'inset(0 100% 0 0)' }, duration: m.riseOut, step: 18 };
    if (kind === 'zoom') return { to: { transform: 'scale(' + m.cardZoom + ')', clipPath: 'inset(48% 48% 48% 48%)' }, duration: m.riseOut, step: 18 };
    return { to: { transform: 'translateY(-22px)', clipPath: 'inset(0 0 100% 0)' }, duration: m.riseOut, step: 18 };
  }
  ArkUI.worldRise = function (el, active) {
    var w = ArkWorld.get(), m = w.motion, key = el.dataset.arkPage, kind = ArkWorld.forRoute(pathOf(key)).exit.words;
    var late = active ? Math.max(0, (Number(el.dataset.worldWordsAt) || 0) - performance.now()) : 0;
    var animations = riseItems(el).map(function (item, i) {
      var card = item.classList.contains('intro-card'), rail = item.classList.contains('rail') || item.dataset.rise === 'side';
      if (active) {
        return item.animate([card ? CARD_IN : rail ? RAIL_IN : RISE_IN, card ? CARD_SHOWN : SHOWN],
          { duration: m.riseIn, delay: late + Math.min(i, 7) * m.riseStagger, easing: ease, fill: 'both' });
      }
      var out = rail ? { to: RAIL_IN, duration: m.riseOut, step: 18 } : leaving(kind, m, card);
      return item.animate([card ? CARD_SHOWN : SHOWN, out.to], { duration: out.duration, delay: i * out.step, easing: ease, fill: 'both' });
    });
    return { animations: animations, done: Promise.all(animations.map(function (a) { return a.finished.catch(function () {}); })) };
  };
  var motion = ArkWorld.get().motion;
  if (motion && motion.riseIn != null) {
    root.style.setProperty('--rise-in', motion.riseIn + 'ms'); root.style.setProperty('--rise-stagger', motion.riseStagger + 'ms'); root.style.setProperty('--rise-out', motion.riseOut + 'ms');
  }

  /* an old address that opened this page (catalog aliases) becomes the page's own path, once the route has landed */
  window.addEventListener('ark:route-ready', function () {
    var entry = ArkUI.pageCatalog && ArkUI.pageCatalog[state.get().page];
    if (!entry || !entry.path || !(entry.aliases || []).some(function (a) { return a === location.pathname; })) return;
    try { history.replaceState(history.state, '', entry.path + location.search + location.hash); } catch (e) { /* the address stays as typed */ }
  });
  root.dataset.world = 'off';
})();

/* =====================================================================
   FRAME -- the site's one way to ask the browser for animation frames (window.ArkFrame).
   ---------------------------------------------------------------------
   A classic script (index.html loads it deferred before every script that uses it), because the
   site's views are classic scripts that must open from file://.
   The rule is the wake-and-settle pattern of js/world2/world2-host.mjs (wake/tick): a frame is
   asked for only while something still moves, and nothing runs while the page is idle.
     once(fn)        a scheduler: calling it any number of times inside one frame runs fn ONCE on
                     the next frame (the latest arguments win). cancel() drops a pending run.
     idle(fn)        runs fn when the browser is idle (requestIdleCallback), or on the next frame
                     where it has none. Returns a cancel function.
     settleLoop(step) a loop that sleeps until wake(): each frame calls step(now) and asks for the
                     next frame only while step returns true. stop() ends it at once.
     afterHero(fn)   THE SITE'S ONE LAZY LOAD GATE (owner 2026-11-11: "do lazy load for insane smooth UX"). Runs fn once the
                     first screen has settled and the browser is idle, so work the first screen does not need (the footer's
                     chain reader, the next page's scripts) never competes with the loader or the hero's film. Settled is
                     the first of: the window event `ark-hero-settled` (the hero's owner says so); the loading screen has
                     let go (html loses `plaza-hold`), plus HERO_QUIET ms where a portal hero stands (html[data-portal-up]:
                     its film into rest plays just after the loader), plus nothing on any other page; HERO_CEILING ms after
                     the window's load, so a loader that never lets go still gets its lazy work. Then requestIdleCallback
                     with a 2 s timeout (a 200 ms timer where there is none). Asked after the settle, fn runs at the next
                     idle moment. Returns nothing: lazy work is never cancelled, only late.
   ===================================================================== */
(function () {
  'use strict';
  /* looked up on every call, not bound at load, so a host that sets the frame functions after this file runs is still used */
  function raf(fn) { return window.requestAnimationFrame ? window.requestAnimationFrame(fn) : setTimeout(function () { fn(Date.now()); }, 16); }
  function caf(id) { if (window.cancelAnimationFrame) window.cancelAnimationFrame(id); else clearTimeout(id); }

  function once(fn) {
    var id = 0, args = null;
    function run(now) { id = 0; var a = args; args = null; fn.apply(null, a && a.length ? a : [now]); }
    function schedule() { args = Array.prototype.slice.call(arguments); if (!id) id = raf(run); }
    schedule.cancel = function () { if (id) caf(id); id = 0; args = null; };
    schedule.pending = function () { return id !== 0; };
    return schedule;
  }

  function idle(fn) {
    if (window.requestIdleCallback) { var i = window.requestIdleCallback(fn); return function () { window.cancelIdleCallback(i); }; }
    var f = raf(function () { fn(); });
    return function () { caf(f); };
  }

  function settleLoop(step) {
    var id = 0;
    function tick(now) { id = 0; if (step(now) && !id) id = raf(tick); }   /* a wake() inside step has already asked for the frame */
    return {
      wake: function () { if (!id) id = raf(tick); },
      stop: function () { if (id) caf(id); id = 0; },
      running: function () { return id !== 0; }
    };
  }

  var HERO_QUIET = 3000, HERO_CEILING = 20000, heroSettled = null;
  function heroSettle() {
    if (heroSettled) return heroSettled;
    heroSettled = new Promise(function (resolve) {
      var root = document.documentElement, done = false, seen = null, quiet = 0;
      function finish() { if (done) return; done = true; if (seen) seen.disconnect(); clearTimeout(quiet); resolve(); }
      function held() { return root.classList.contains('plaza-hold'); }
      function check() { if (done || quiet || held() || document.readyState !== 'complete') return; quiet = setTimeout(finish, root.hasAttribute('data-portal-up') ? HERO_QUIET : 0); }
      window.addEventListener('ark-hero-settled', finish, { once: true });
      if (window.MutationObserver) { seen = new MutationObserver(check); seen.observe(root, { attributes: true, attributeFilter: ['class'] }); }
      function loaded() { check(); setTimeout(finish, HERO_CEILING); }
      if (document.readyState === 'complete') loaded(); else window.addEventListener('load', loaded, { once: true });
    });
    return heroSettled;
  }
  function afterHero(fn) {
    heroSettle().then(function () {
      if (window.requestIdleCallback) window.requestIdleCallback(function () { fn(); }, { timeout: 2000 }); else setTimeout(fn, 200);
    });
  }

  window.ArkFrame = { once: once, idle: idle, settleLoop: settleLoop, afterHero: afterHero };
})();

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

  window.ArkFrame = { once: once, idle: idle, settleLoop: settleLoop };
})();

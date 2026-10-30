/* =====================================================================
   THE DESIGN BOARD'S 3D, drawn by the grammar world (docs/home-redesign/home-mockup.html).
   ---------------------------------------------------------------------
   Owner law, 2026-10-30: "THREEJS IS DEPRECATED! ALL ANIMATIONS AND WORK HAS TO BE RECREATED IN FXN3D". The board used to build its own
   Three.js world (js/world/chains-scene.js and its stage files) behind window.DEFXNScene. This module is DEFXNScene again, with the same
   surface the board's scripts call (ok, hooks, to, select, go, open, refresh, hoverRecord, nudge, world.focusOn, ringTarget), but every
   call goes to the one grammar host (world2-host.mjs), which draws with the fxn-3d engine from the records in world/world.flx.

   Nothing of the world is restated here. A board view is a world view: the names that differ are listed below once, and the host's own
   table (host.viewOf) says which others exist. Flights, the first-visit build-up, record descent, swings, joins, hovers and picks are the
   host's, the same code the 29 site routes use.

   Load order: world2-board-env.mjs first (it answers the host's questions from the board's DOM), then the host, then this module's body.
   The board's classic scripts carry `defer` and come after this module in the page, so DEFXNScene exists when app.js runs.
   ===================================================================== */
import './world2-board-env.mjs';
import './world2-host.mjs';
import { fetchGroup, fetchBlob, fetchLines } from './world2-decode.mjs';

(function () {
  'use strict';
  var host = window.ArkWorldHost, ADDRESS = ['r', 'tab', 'step', 'id', 'c', 'g', 'i', 's'];
  var hooks = {};
  var S = window.DEFXNScene = { ok: false, grammar: true, hooks: hooks, world: {} };
  if (!host) return;   /* the host found no #scene, no router or no WebGL 2: the board draws no world (app.js adds body.no-webgl) */

  S.ok = true;
  var sceneState = ArkUI.sceneState;

  /* the board names two views differently from the world: the minute of "How it works" is the world's movie. Every other board view has a world view
     of the same name, or none yet (measured, products, identity, nodes and status are stages the site never carried: docs/design/world-grammar/BOARD-GAPS.md). */
  /* Every board view is a world view of the same name: the site's views (idstart, chain, record, resolve...), and the board's own six (minute, status, nodes, products, identity, measured:
     scripts/lib/world-board-specs.mjs). The host's table is the site's: its key "identity" is the sign-in start (idstart) and "account" is the value view, and its "works" is the movie, so
     each world view is bound to the board's key for it here, once (the host's reverse table then answers a click's view with the board's key). A board key whose view the world does not
     hold is drawn on the calm network (the host's viewName falls back to calm). */
  Object.keys(host.viewOf).forEach(function (key) { host.setView(host.viewOf[key], host.viewOf[key]); });
  function boardName(v) { return v; }
  function viewKey(key) { host.setView(key, key); return key; }

  /* the host asks for a view's label layer by the world's name; the board's layer for the minute is data-for="minute" */
  var tagsOf = host.tags;
  host.tags = function (v) { return tagsOf(boardName(v)); };

  /* a page change: the state it carries goes to the host, which flies the camera (the host's fly is chains-scene.js api.to) */
  S.to = function (st, first) {
    var key = viewKey(st.view);
    sceneState.set(key);
    host.state(st);
    host.fly(key);
    var el = ArkUI.pageRouter.pages[key], at = el && Number(el.dataset.worldWordsAt);
    /* the milliseconds until the words may rise: the host stamps the instant on the page; before the world has loaded there is none yet */
    return { words: at ? Math.max(0, at - performance.now()) : undefined };
  };
  S.select = function (st) { host.select(st); };
  S.refresh = function (dur) { if (host.scene) host.scene.refresh(dur); };
  S.hoverRecord = function (j) { host.hoverRecord(j); };
  S.go = function () {};            /* the host starts itself after first paint */
  S.nudge = function () {};         /* the host draws on events (a flight, the pointer, a resize), never on a poll */

  /* a click in the 3D that leaves for another view: the board's address carries it, in the keys its address uses (chains-scene.js api.open) */
  S.open = function (v, st, opts) {
    var q = ADDRESS.filter(function (key) { return st && st[key] != null && st[key] !== ''; }).map(function (key) { return key + '=' + encodeURIComponent(st[key]); });
    var hash = '#/' + v + (q.length ? '?' + q.join('&') : '');
    if (opts && opts.replace) location.replace(hash); else location.hash = hash;
  };
  /* the host names a world view; the board names its own */
  function boardKey(v) {
    return boardName(v);
  }
  host.on('open', function (v, st, opts) { S.open(boardKey(v), st, opts); return true; });

  /* where a click on a ring of the network goes is the ring's own words in the world (the ring records), never a table kept here */
  S.ringTarget = function (ri) {
    var w = host.scene && host.scene.stage.wordsOf({ item: ri, slot: 0 });
    return w ? { view: boardKey(w.view), st: w.key ? (function (o) { o[w.key] = w.value; return o; })({}) : undefined } : null;
  };

  /* the page's hooks are read each time they fire, so a script that sets S.hooks.pick after this module ran is heard */
  ['pick', 'pickRing', 'stagePick', 'hover'].forEach(function (name) {
    host.on(name, function () { return hooks[name] ? (hooks[name].apply(null, arguments), true) : false; });
  });

  /* The Three.js board held every view in memory, so a flight to a view started at once. The grammar world fetches a view's group the first time the camera flies to it,
     which stretched the first flight to each chain, identity and how-it-works view by 0.6 to 1.2 s. The board is a design board, not a first-request budget:
     once the world is drawn, every group, its frame blob and its words are fetched (the decoder caches them, so the flight finds them), one group at a time. */
  host.whenReady(function () {
    var w = host.scene.world, names = Object.keys(w.groups), i = 0;
    (function next() {
      if (i >= names.length) return;
      var g = names[i++];
      fetchGroup(w, g).then(function () {
        var jobs = [];
        Object.keys(w.frames).forEach(function (k) { if (w.frames[k] && w.frames[k].cid) jobs.push(fetchBlob(w.frames[k].cid)); });
        Object.keys(w.stage.names).forEach(function (k) { if (w.stage.names[k] && w.stage.names[k].cid) jobs.push(fetchLines(w.stage.names[k].cid).catch(function () {})); });
        return Promise.all(jobs);
      }).catch(function () {}).then(function () { (window.requestIdleCallback || setTimeout)(next, { timeout: 500 }); });
    })();
  });

  /* light some rings and the computers, step the rest back (ring-view.js hovering a callout) */
  S.world.focusOn = function (which, cubes) { if (host.scene) host.scene.focusOn(which, cubes); };
})();

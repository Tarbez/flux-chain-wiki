/* =====================================================================
   THE WORLD HOST: the 3D world under every page of the real site.
   ---------------------------------------------------------------------
   docs/home-redesign/app.js is the mockup's coordinator: it owns the routes and gives the world its boxes
   (S.hooks). On the site the router, the header, the footer and the page modules are the site's own, so this
   file plays the part app.js played and nothing more:

     1 starts the world after first paint. The page shell and the words paint first; Three.js (724 KB) and
       the world's scripts load after, from this origin (script-src 'self'). The world needs no network.
     2 follows the router. A page that mounts (or a route that lands) tells the world which view to fly to:
         every route in VIEW_OF below has a view of its own, the one the mockup flew to for that page:
           '/' home, '/intro' intro, the chain pages (chain, record, open, links), the identity steps
           (idstart, idsign, idsafe, idyou), resolvers, measured, fxn, ring, How it works (minute, resolve,
           layers, life) and trace. The 3D of each is in js/world/ (stages.js, concept-stages.js,
           identity-stages.js, ring-stage.js, intro-stage.js, home-descent.js, chains-scene.js).
         any other route     the CALM pose, below. Reading pages sit over a quiet world.
       The page contract (what a world page calls; the mockup carried all of it in its address):
         ArkWorldHost.state({ r, step, id, tab, c, g, i, s })  while mounting: the view's state, used by the next flight
         ArkWorldHost.select({ ... })                          a change inside the mounted page: the 3D moves to it
         ArkWorldHost.on('pick' | 'pickRing' | 'hover' | 'stagePick' | 'open', fn)  returns off(); call it on dispose
         ArkWorldHost.tags(view)                               the .tags[data-for] layer a view's labels are placed in
     3 gives the world the boxes it needs, read from the mounted page: its [data-stage] (the frame the camera is
       fitted to) and its [data-panel] (the box the page slab lies under). The header and footer strip are only
       read, to keep the world's labels clear of them.
     4 applies ArkWorld (js/content/world.js), the one source of every editable number, and applies it again
       on ArkWorld.onChange without a remount:
         look     -> ring-kit.js k.setLook: key, back, fill, sky and room light, exposure, contrast, fog, grain;
                     the ground logo's and the record's light, the beam and the dust (k.knobs, read by
                     home-descent.js each frame)
         motion   -> flight length and crane (chains-scene.js motion()), the words' rise timings (CSS variables
                     on :root and ArkUI.worldRise below), the intro card's zoom
         story    -> home-descent.js: step times, play, skip on return
         views    -> chains-scene.js target(): a route's camera aim, distance, height, turn, tilt, dim
         exits    -> ArkUI.worldRise: how a leaving page's words go (up, side, zoom)
     5 keeps the old particle relief as the no-WebGL fallback: if the world cannot start, js/zero-webgl.js runs
       as it always did.

   No frame loop lives here: the world draws on demand (ring-kit.js), and this file draws nothing. Transitions
   are motion only: words rise and leave by transform and clip, never by opacity (ArkUI.worldRise).
   ===================================================================== */
(function () {
  'use strict';
  var root = document.documentElement, scene = document.getElementById('scene');
  var router = window.ArkUI && ArkUI.pageRouter, state = window.ArkUI && ArkUI.sceneState;
  if (!scene || !router || !state || !window.ArkWorld) return;

  var VERSION = '20261024-w3';
  var ease = 'cubic-bezier(.22,.7,.18,1)';

  /* ---------- the one place the calm pose is named ----------
     The pose of every route with no world view of its own: the home network seen wide and stepped back, so a
     reading page sits over a quiet world. n is how far the network steps back (home is 0, a page's own stage
     about .6); elev is the camera's height angle in degrees. The CMS can move any route off it with a
     views[route] override (ArkWorld). */
  var CALM = { n: .6, elev: 30, dist: 135, tilt: 1.2 };
  /* route key -> the world view the camera flies to (the mockup's #/<view>). A key not listed gets the calm pose. */
  var VIEW_OF = {
    zero: 'home', intro: 'intro',
    chain: 'chain', 'chain/record': 'record', 'chain/open': 'open', 'chain/links': 'links',
    identity: 'idstart', 'identity/sign': 'idsign', 'identity/safe': 'idsafe', 'identity/you': 'idyou',
    resolvers: 'resolvers', measured: 'measured', fxn: 'fxn', ring: 'ring',
    works: 'movie', 'works/resolve': 'resolve',   /* works: the 60-second sequence (js/world/minute-experience.js) */ 'works/layers': 'layers', 'works/life': 'life',
    trace: 'trace'
  };
  var KEY_OF = {};
  Object.keys(VIEW_OF).forEach(function (key) { KEY_OF[VIEW_OF[key]] = key; });
  function viewFor(key) { return VIEW_OF[key] || 'calm'; }
  /* a stage loaded later (a file that registers itself with S.stage) names the route it belongs to */
  function setView(key, view) { VIEW_OF[key] = view; KEY_OF[view] = key; }
  function pathOf(key) { var entry = ArkUI.pageCatalog && ArkUI.pageCatalog[key]; return entry ? entry.path : '/'; }

  var host = window.ArkWorldHost = { version: VERSION, calm: CALM, viewOf: VIEW_OF, viewFor: viewFor, setView: setView, keyOf: function (view) { return KEY_OF[view] || null; }, ready: false, failed: false, covered: false, owns: owns, whenReady: whenReady };
  var wanted = wantWorld(), readyHooks = [];
  function owns() { return wanted && !host.failed; }
  function whenReady(fn) { if (host.ready) fn(); else readyHooks.push(fn); }
  function wantWorld() {
    if (/[?&]world=off(&|$)/.test(location.search)) return false;
    try {
      var gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return false;
      var lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
      return true;
    } catch (e) { return false; }
  }
  function reduced() { return ArkUI.prefersReducedMotion ? ArkUI.prefersReducedMotion() : false; }

  /* ---------- the words' rise ----------
     A world page (class world-page) enters and leaves by its .rise items: a transform and a clip, with the
     timings of ArkWorld.motion. Nothing fades. ArkUI.createPresence (js/ark/scene-state.js) calls this for a
     page with that class and waits for the animations. A page the CMS gives no exit leaves upward. */
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
      var card = item.classList.contains('intro-card'), rail = item.classList.contains('rail');
      if (active) {
        return item.animate([card ? CARD_IN : rail ? RAIL_IN : RISE_IN, card ? CARD_SHOWN : SHOWN],
          { duration: m.riseIn, delay: late + Math.min(i, 7) * m.riseStagger, easing: ease, fill: 'both' });
      }
      var out = rail ? { to: RAIL_IN, duration: m.riseOut, step: 18 } : leaving(kind, m, card);
      return item.animate([card ? CARD_SHOWN : SHOWN, out.to], { duration: out.duration, delay: i * out.step, easing: ease, fill: 'both' });
    });
    return { animations: animations, done: Promise.all(animations.map(function (a) { return a.finished.catch(function () {}); })) };
  };

  /* ArkWorld.motion as CSS variables on :root, so page presence and a page's own CSS can read the same
     timings: --rise-in, --rise-stagger, --rise-out (milliseconds) */
  function setRiseVariables(m) {
    root.style.setProperty('--rise-in', m.riseIn + 'ms'); root.style.setProperty('--rise-stagger', m.riseStagger + 'ms'); root.style.setProperty('--rise-out', m.riseOut + 'ms');
  }
  setRiseVariables(ArkWorld.get().motion);

  /* ---------- a fresh load of "/" opens the intro; "/" inside the site is home ---------- */
  var arrived = false, navigate = router.navigate, preview = /[?&](cms-)?preview(=|&|$)/.test(location.search);
  router.navigate = function (page, settings) {
    if (!arrived && wanted && !preview && page === 'zero' && ArkUI.pageCatalog.intro) { page = 'intro'; settings = Object.assign({}, settings, { history: 'replace' }); }
    arrived = true;
    return navigate.call(router, page, settings);
  };

  if (!wanted) { root.dataset.world = 'off'; return; }
  /* 'loading' until the world draws: the old relief is already out of sight, so the background never cuts from one picture to another */
  root.dataset.world = 'loading';

  /* ---------- the layer and the canvas ---------- */
  var persistent = scene.querySelector('[data-ark-layer="persistent"]');   /* the shell's persistent layer, where the particle relief stands */
  if (!persistent) { fail('no persistent layer'); return; }
  var layer = document.createElement('div'), canvas = document.createElement('canvas');
  layer.className = 'world-layer'; layer.setAttribute('aria-hidden', 'true');
  canvas.id = 'chains'; canvas.className = 'world-canvas'; layer.appendChild(canvas);
  /* The layer stands beside the persistent layer, just before it, in the same stack. The router fades the persistent
     layer itself on every navigation (ArkCanvasTransitions, js/ark/page-router.js fadeCanvas): a world inside it
     would fade out and back in with every page, and transitions here are motion only. */
  persistent.parentNode.insertBefore(layer, persistent);
  /* home's labels (home-descent.js fills .tags[data-for="home"] when it loads) */
  var tagsLayer = document.createElement('div');
  tagsLayer.className = 'tags world-tags'; tagsLayer.dataset.for = 'home'; tagsLayer.setAttribute('aria-hidden', 'true');
  scene.appendChild(tagsLayer);

  /* ---------- loading: after first paint, in order, from this origin ---------- */
  var SCRIPTS = [
    ['DEFXNDependencies', 'js/vendor/three-r180-defxn.js'], ['DEFXN_MARK', 'js/ark/mark-data.js'],
    ['DEFXN_NETWORK', 'js/content/network-data.js'], ['DEFXN_RECORDS', 'js/content/records-sample.js'],
    ['DEFXNRingKit', 'js/world/ring-kit.js'],
    ['DEFXN_CAPABILITIES', 'js/content/capabilities-data.js'], ['DEFXN_RESOLVERS', 'js/content/resolvers-data.js'], ['DEFXN_FXN', 'js/content/fxn-data.js'],
    ['DEFXNScene', 'js/world/chains-scene.js'], [null, 'js/world/stages.js'],
    ['DEFXN_CONCEPT', 'js/content/concept-data.js'], ['DEFXN_IDENTITY', 'js/content/identity-sample.js'],
    [null, 'js/world/ring-stage.js'], [null, 'js/world/concept-stages.js'], [null, 'js/world/identity-stages.js'], [null, 'js/world/intro-stage.js'],
    [null, 'js/world/home-descent.js'], [null, 'js/world/home-helix.js'], [null, 'js/world/home-sites.js'], [null, 'js/world/record-glass.js']
  ];
  function src(path) { return (location.protocol === 'file:' ? '' : '/') + path + '?v=' + VERSION; }
  function load(list) {
    return new Promise(function (resolve, reject) {
      var left = list.length;
      if (!left) { resolve(); return; }
      list.forEach(function (item) {
        if (item[0] && window[item[0]]) { if (!--left) resolve(); return; }   /* a page already loaded this data */
        var s = document.createElement('script');
        s.src = src(item[1]); s.async = false;   /* download together, run in this order */
        s.onload = function () { if (!--left) resolve(); };
        s.onerror = function () { reject(new Error('could not load ' + item[1])); };
        document.head.appendChild(s);
      });
    });
  }
  /* the mockup's small UI kit gives the world two things: text escaping and the page scale (1 on the site) */
  window.DEFXNKitUI = window.DEFXNKitUI || { scale: function () { return 1; }, esc: function (s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); } };

  function afterPaint(fn) {
    requestAnimationFrame(function () { requestAnimationFrame(function () { (window.requestIdleCallback || function (f) { setTimeout(f, 0); })(fn, { timeout: 1500 }); }); });
  }
  afterPaint(function () { load(SCRIPTS).then(start, function (error) { fail(error.message); }); });

  /* ---------- the boxes the world asks for ---------- */
  var S = null, W = null, cur = null, flown = null, pending = null;
  function rect(el) { return el.getBoundingClientRect(); }
  function pageEl(key) { return router.pages && router.pages[key] || null; }
  /* a mounted page waits hidden for its entrance, so it is measured as it will stand once shown */
  function asShown(el, fn) {
    if (!el || !el.hidden) return fn();
    el.hidden = false; var was = el.style.visibility; el.style.visibility = 'hidden';
    try { return fn(); } finally { el.hidden = true; el.style.visibility = was; }
  }
  function headerBottom() { var h = scene.querySelector('.ark-header'); return h ? rect(h).bottom : 0; }
  function footTop() { var f = scene.querySelector('.site-footer-strip'); return f ? rect(f).top : innerHeight; }
  function whole() { return { x: 0, y: 0, w: innerWidth, h: innerHeight }; }
  function textRight(el) {
    var right = 0, walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), r = document.createRange(), n;
    while ((n = walk.nextNode())) { if (!n.textContent.trim()) continue; r.selectNodeContents(n); right = Math.max(right, r.getBoundingClientRect().right); }
    return right;
  }
  /* home: the network fits the open room between the words and the rail, under the header, over the footer
     strip; its far rings may run under the rail, which is near-solid glass (the record descent) */
  function homeFrame(page) {
    var N = window.DEFXN_NETWORK, DESIGN = N.W / N.H, w = innerWidth, h = innerHeight, topY = headerBottom(), footY = footTop();
    var h1 = page && page.querySelector('h1'), lede = page && page.querySelector('.lede'), rail = page && page.querySelector('.rail');
    var copyRight = Math.max(h1 ? textRight(h1) : 0, lede ? textRight(lede) : 0), rr = rail ? rect(rail) : null;
    var railLeft = rr && rr.width ? rr.left : w, hx = N.RINGS[N.HUB][0] / N.W, hy = N.RINGS[N.HUB][1] / N.H;
    if (w <= 900) { var hp = Math.max(h * .5, w / DESIGN); return { x: w / 2 - hp * DESIGN * hx, y: topY, w: hp * DESIGN, h: hp, cx: w / 2 }; }
    var room = railLeft - copyRight, fw = Math.min((footY - topY) * .86 * DESIGN, room * 1.45), fh = fw / DESIGN, open = (copyRight + railLeft) / 2;
    return { x: open - fw * hx, y: topY + ((footY - topY) * .86 - fh) / 2 + fh * (.5 - hy) * .5, w: fw, h: fh, cx: open };
  }
  function frame(v) {
    var page = cur && pageEl(cur.key);
    return asShown(page, function () {
      if (v === 'home') return homeFrame(page);
      /* the open record is framed by its card ([data-card]); the record view keeps its 3:2 shape inside the stage, as app.js did */
      var stage = page && page.querySelector(v === 'open' && page.querySelector('[data-card]') ? '[data-card]' : '[data-stage]'), r = stage && rect(stage);
      if (!r || !r.width) return whole();
      if (v === 'record') { var A = 1.5, sw = Math.min(r.width, r.height * A), sh = sw / A; return { x: r.left + (r.width - sw) / 2, y: r.top + (r.height - sh) / 2, w: sw, h: sh }; }
      return { x: r.left, y: r.top, w: Math.max(1, r.width), h: Math.max(1, r.height) };
    });
  }
  function panel(v) {
    var page = cur && pageEl(cur.key), el = page && page.querySelector('[data-panel]');
    if (!el) return null;
    return asShown(page, function () { var r = rect(el); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  }

  /* ---------- the labels of every view: placed clear of the header, footer, words and page box ----------
     A view's labels live in a .tags layer with data-for="<view>" (home's is made above). A page asks for its
     layer with ArkWorldHost.tags(view), fills it with [data-tag] items, and the scene's hooks.tags places them
     on their points every frame the world draws (as app.js did in the mockup): a label that would cover the
     header, the footer, the page's [data-panel] or another label tries its other side, else it wipes out. */
  var FLIP = { above: 'below', below: 'above', left: 'right', right: 'left' };
  var layers = { home: tagsLayer }, tagEls = {}, tagCtx = {};
  function findLayer(v) {
    var layer = layers[v];
    if (layer && layer.isConnected) return layer;
    layer = document.querySelector('.tags[data-for="' + v + '"]');
    if (layer) layers[v] = layer; else delete layers[v];
    return layer;
  }
  host.tags = function (v) {
    var layer = findLayer(v);
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'tags world-tags'; layer.dataset.for = v; layer.setAttribute('aria-hidden', 'true');
      scene.appendChild(layer); layers[v] = layer;
    }
    return layer;
  };
  /* only the layer of the view the camera is at stands in; the others wipe out */
  function showTags() {
    var v = cur ? viewFor(cur.key) : null;
    Array.prototype.forEach.call(document.querySelectorAll('.tags[data-for]'), function (layer) { layer.classList.toggle('here', layer.dataset.for === v); });
  }
  function placeTag(at, small, px, py, w, h) {
    var x = at === 'left' ? px - 16.5 - w : at === 'right' ? px + 16.5 : small ? px - w / 2 : px;
    var y = at === 'below' ? py + (small ? 13.5 : 15.5) : at === 'above' ? py - (small ? 13.5 : 15.5) - h : py - h / 2;
    return { x: x, y: y, r: x + w, b: y + h };
  }
  function hits(a, b, m) { return a.x < b.r + m && a.r > b.x - m && a.y < b.b + m && a.b > b.y - m; }
  function tagBoxes(v, layer) {
    var page = cur && pageEl(cur.key), stage = page && page.querySelector('[data-stage]'), pr = v === 'home' ? null : panel(v);
    var sr = stage && asShown(page, function () { return rect(stage); });
    layer.classList.toggle('compact', !!sr && sr.width < 620);   /* on a small stage a label shows its title only */
    return { tY: headerBottom(), fY: footTop(), W: innerWidth, pb: pr ? { x: pr.x, y: pr.y, r: pr.x + pr.w, b: pr.y + pr.h } : null };
  }
  function placeTags(v, spots) {
    var layer = findLayer(v); if (!layer) return;
    var live = !!cur && viewFor(cur.key) === v;
    layer.classList.toggle('here', live);
    var els = tagEls[v];
    if (!els || !els.list.length || !els.list[0].el.isConnected) {
      els = tagEls[v] = { list: [], by: {} };
      Array.prototype.forEach.call(layer.querySelectorAll('[data-tag]'), function (el) {
        el.dataset.home = el.dataset.home || el.dataset.at || 'above'; el.dataset.at = el.dataset.home;
        var t = { el: el, w: el.offsetWidth, h: el.offsetHeight, seen: el.classList.contains('seen') };
        els.list.push(t); els.by[el.dataset.tag] = t;
      });
    }
    var c = tagCtx[v] || (tagCtx[v] = tagBoxes(v, layer)), placed = [], order = 0;
    function free(q) {
      if (q.x < 8 || q.r > c.W - 8 || q.y < c.tY + 4 || q.b > c.fY - 4) return false;
      if (c.pb && hits(q, c.pb, 8)) return false;
      for (var i = 0; i < placed.length; i++) if (hits(q, placed[i], 6)) return false;
      return true;
    }
    spots.forEach(function (p) {
      var t = els.by[p.id]; if (!t) return;
      var el = t.el, home = el.dataset.home, small = el.classList.contains('small'), on = p.on && live;
      var side = home, q = placeTag(side, small, p.x, p.y, t.w, t.h), ok = on && free(q);
      if (on && !ok) { var alt = placeTag(FLIP[home], small, p.x, p.y, t.w, t.h); if (free(alt)) { side = FLIP[home]; q = alt; ok = true; } }
      if (ok) placed.push(q);
      /* a label that is out keeps its last side, so it wipes out where it was */
      if (ok && el.dataset.at !== side) el.dataset.at = side;
      if (ok !== t.seen) { el.style.transitionDelay = ok ? Math.min(400, order++ * 80) + 'ms' : '0ms'; el.classList.toggle('seen', ok); t.seen = ok; }
      if (ok || !t.seen) el.style.transform = 'translate(' + Math.round(q.x) + 'px,' + Math.round(q.y) + 'px)';
    });
    if (!live) els.list.forEach(function (t) { if (t.seen) { t.el.style.transitionDelay = '0ms'; t.el.classList.remove('seen'); t.seen = false; } });
  }
  window.addEventListener('resize', function () { tagCtx = {}; tagEls = {}; });

  /* ---------- what a page tells the world, and what the world tells a page ----------
     A page calls state() while it mounts and select() when something inside it changes; it listens with on().
     The state keys are the mockup's address: r (record), tab, step, id (resolver), c (capability), g (FXN part),
     i (ring), s (a view's own choice). The view itself comes from the route. */
  var carried = null, current = {}, handlers = {};
  host.state = function (st) { carried = Object.assign(carried || {}, st || {}); return host; };
  host.select = function (st) {
    if (!host.ready || !cur) { host.state(st); return host; }
    Object.assign(current, st || {});
    S.select(Object.assign({}, current, { view: viewFor(cur.key) }));
    return host;
  };
  host.on = function (name, fn) {
    (handlers[name] || (handlers[name] = [])).push(fn);
    return function off() { var list = handlers[name] || [], i = list.indexOf(fn); if (i >= 0) list.splice(i, 1); };
  };
  /* tell the page's listeners; true when someone is listening (they replace the default) */
  function emit(name, args) {
    var list = (handlers[name] || []).slice(), claimed = false;
    list.forEach(function (fn) { if (fn.apply(null, args) !== false) claimed = true; });
    return claimed;
  }
  host.hoverRecord = function (j) { if (S && S.hoverRecord) S.hoverRecord(j); };
  /* the query a page reads back from its address: the same keys, in the mockup's order */
  function queryOf(st) {
    var q = ['r', 'tab', 'step', 'id', 'c', 'g', 'i', 's'].filter(function (key) { return st && st[key] != null && st[key] !== ''; })
      .map(function (key) { return key + '=' + encodeURIComponent(st[key]); });
    return q.length ? '?' + q.join('&') : '';
  }

  /* ---------- the world starts ---------- */
  function start() {
    S = window.DEFXNScene;
    if (!S || !S.ok || !S.world) { fail('the world did not start'); return; }
    W = S.world;
    var V = W.V;
    /* the calm stage: every route with no view of its own (CALM, above) */
    S.stage({
      name: 'calm',
      target: function (f, asp) { var design = W.N.W / W.N.H; return { aim: V(0, 0, 0), dist: CALM.dist * Math.max(1, design / asp), elev: CALM.elev, yaw: 0, tilt: CALM.tilt, n: CALM.n }; },
      set: function () {}, pose: function () {},
      anchor: function (out) { out.pos.set(0, 0, 0); out.quat.identity(); out.s = 1; }, tags: function () { return []; }
    });
    var hooks = S.hooks;
    hooks.frame = frame; hooks.panel = panel;
    hooks.override = function (v) { return cur ? ArkWorld.forRoute(pathOf(cur.key)).view : null; };
    hooks.labels = function () {};
    hooks.tags = placeTags;
    /* a click on your ring (home) opens the chain page; a page that listens (ArkWorldHost.on) takes it instead.
       covered: a worn card's world hides the rings (js/ark/skin-site.js) */
    hooks.pick = function (v, j) {
      if (host.covered || j < 0) return;
      if (emit('pick', [v, j])) return;
      if (v === 'home') go('chain');
    };
    /* a click on another ring of the network: the ring's own page, as the mockup's ring-view.js did */
    hooks.pickRing = function (ri) {
      if (host.covered || emit('pickRing', [ri])) return;
      var t = S.ringTarget && S.ringTarget(ri);
      if (t) hooks.open(t.view, t.st || {}, {});
    };
    hooks.hover = function (lab, x, y) { emit('hover', [lab, x, y]); };
    hooks.stagePick = function (kind, id) { emit('stagePick', [kind, id]); };   /* a resolver cube, a capability block, a supply tile */
    /* a click in the 3D that leaves for another view (S.open): the page of that view, with the state it names */
    hooks.open = function (v, st, opts) {
      if (emit('open', [v, st, opts])) return;
      var key = KEY_OF[v];
      if (!key || !ArkUI.pageCatalog[key]) return;
      if (cur && cur.key === key) { host.select(st); return; }
      host.state(st);
      router.navigate(key, opts && opts.replace ? { query: queryOf(st), history: 'replace' } : { query: queryOf(st) });
    };
    function go(key) { router.navigate(key); }
    var k = W.k;
    root.dataset.world = 'on';
    layer.dataset.ready = '1';
    ArkWorld.onChange(applyWorld);
    k.setLook(ArkWorld.get().look);
    S.go();
    host.ready = true; host.scene = S;
    var key = pending || state.get().page;
    pending = null;
    fly(key);
    readyHooks.splice(0).forEach(function (fn) { fn(); });
  }
  function applyWorld() {
    var w = ArkWorld.get();
    setRiseVariables(w.motion);
    if (!host.ready) return;
    W.k.setLook(w.look);
    if (S.refresh) S.refresh(500);   /* the camera eases to the route's new view numbers */
  }

  /* ---------- follow the router ---------- */
  function fly(key) {
    if (!host.ready) { pending = key; return; }
    if (!ArkUI.pageCatalog[key]) return;
    var first = flown === null;
    cur = { key: key };
    /* the state the page gave while it mounted is used by this flight, once */
    current = carried || {}; carried = null;
    delete tagCtx[viewFor(key)]; delete tagEls[viewFor(key)];
    showTags();
    var timing = S.to(Object.assign({}, current, { view: viewFor(key) }), first);
    flown = key;
    var el = pageEl(key);
    if (el && timing) el.dataset.worldWordsAt = String(performance.now() + (timing.words || 0));
  }
  host.fly = fly;   /* what the router's events call; a test or a page that is not routed may fly the world to a route's view too */
  /* a page that mounts starts the flight at once: the old page's words are still leaving, so the camera and
     the exit move together. The route landing confirms it (a navigation that was replaced flies again). */
  router.onMount(function (el, key) { if (key !== flown) fly(key); });
  window.addEventListener('ark:route-ready', function () { var key = state.get().page; if (key !== flown) fly(key); });

  /* ---------- the fallback ---------- */
  function fail(why) {
    host.failed = true; root.dataset.world = 'off';
    if (layer.parentNode) layer.remove();
    Object.keys(layers).forEach(function (v) { var l = layers[v]; if (l && l.parentNode && l.classList.contains('world-tags')) l.remove(); });
    if (window.console) console.warn('[world] the 3D world is off (' + why + '); the particle relief runs instead');
    var relief = document.createElement('script'); relief.src = src('js/zero-webgl.js'); document.head.appendChild(relief);
  }
})();

/* =====================================================================
   THE WORLD HOST, grammar edition (docs/design/world-grammar/CONTRACT.md, "decoder"; slice 1).
   ---------------------------------------------------------------------
   The only world. (Three.js and its host, js/world/world-host.js, left the site: docs/design/world-grammar/PORT.md, "Three.js removed". ?world=off still turns the world off, below.)
   This file draws the same .world-layer and #chains canvas the Three.js host drew, and keeps its contract: the same window.ArkWorldHost surface for the pages, the same words' rise (ArkUI.worldRise and
   the --rise-* variables, so the pages cannot tell), the same fresh-"/"-to-/intro redirect,
   and the same following of the router (router.onMount, ark:route-ready).

   What differs is under the canvas. No Three.js, no scene graph, no stage files: one request for world/world.flx
   (every record of the world, read through the generated reader), one for the first view's frame blob, one for the
   mark. The renderer (world2-gl.mjs) uploads the blob once and draws one call per part. The camera moves on the
   CPU; a flight eases it over the motion knobs' flight time with the kernel's in-out ease; the intro's welcome
   arrival starts farther, higher and turned (chains-scene.js WELCOME) and glides in. Nothing draws unless something
   moved: a flight, the pointer's lean, a resize, a theme repaint (workspace law: animations settle).

   Views in slice 1: intro (introtall under an aspect of .9), home, calm. Every other route takes calm, as the
   Three.js host's CALM pose did. The 3D of the chain, identity, stats and other pages is not here yet; their routes
   fly to calm, which is what a reading page gets today.

   Left out of this slice, on purpose (reported, not hidden): hover lift and ring lift under the pointer, picks
   (clicks on rings), hover labels and the per-view .tags placement (host.tags still returns a layer, nothing fills
   it), the page slab under [data-panel], the first-visit build-up and the beam's rise. After the owner confirmed
   slice 1 (2026-10-29) the floor came in: the grid and its orbit rings, the kernel's glow pool, the chain marks under
   their rings (WLOGO records, SVG masks by content id) and the key light's shadow map, fitted round each view's aim
   as chains-scene.js fitShadow does (40 round the network, 14 on the calm pose). The card (/auth, MESH.md): a
   view that has a camera record but no frame of its own may carry a mesh; on the first flight to one the host
   imports world2-mesh.mjs, fetches world/card.flx once, mounts the mesh and hands it to the renderer; leaving the
   view takes it off (the mount stays for the next visit).
   ===================================================================== */
import { fetchWorld, fetchBlob, fetchNames, fetchGroup, fetchLines, firstInstance, worldPath, PICTURE } from './world2-decode.mjs';
import { createRenderer, FOV, afterRestore } from './world2-gl.mjs';
import { createStage } from './world2-stage.mjs';
import { createSites } from './world2-sites.mjs';
import { createHelix } from './world2-helix.mjs';
import { mountHubMark } from './world2-hubmark.mjs';
import { createTags } from './world2-tags.mjs';

(function () {
  'use strict';
  var root = document.documentElement, scene = document.getElementById('scene');
  var router = window.ArkUI && ArkUI.pageRouter, state = window.ArkUI && ArkUI.sceneState;
  if (!scene || !router || !state || !window.ArkWorld) return;

  var VERSION = '20261029-w2';
  var ease = 'cubic-bezier(.22,.7,.18,1)';
  var D2R = Math.PI / 180, TAN = Math.tan(FOV / 2 * D2R);

  /* the calm pose as the Three.js host names it (host.calm is part of its surface); the numbers are replaced by
     the WVIEW-Rcalm record once the world is read, so one place (the encoder) owns them */
  var CALM = { n: .6, elev: 30, dist: 135, tilt: 1.2 };
  /* route key -> world view, the Three.js host's table, so viewFor/keyOf answer the same for every page. A view
     with no WVIEW record in slice 1 takes the calm camera. */
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

  var host = window.ArkWorldHost = { version: VERSION, grammar: true, calm: CALM, viewOf: VIEW_OF, viewFor: viewFor, setView: setView, keyOf: function (view) { return KEY_OF[view] || null; }, ready: false, failed: false, covered: false, owns: owns, whenReady: whenReady };
  var wanted = wantWorld(), readyHooks = [];
  function owns() { return wanted && !host.failed; }
  function whenReady(fn) { if (host.ready) fn(); else readyHooks.push(fn); }
  host.whenReady = whenReady;   /* a page that must act once the world has loaded (the design board warms the view groups) */
  function wantWorld() {
    if (/[?&]world=off(&|$)/.test(location.search)) return false;
    try {
      var gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return false;
      var lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
      return true;
    } catch (e) { return false; }
  }
  /* the page's zoom: 1 on the site; the design board zooms its root above 1440 x 900 and says by how much (world2-board-env.mjs) */
  function pageScale() { return ArkUI.pageScale ? ArkUI.pageScale() || 1 : 1; }
  function reduced() { return ArkUI.prefersReducedMotion ? ArkUI.prefersReducedMotion() : false; }

  /* ---------- the words' rise (the contract the pages were written against: docs/design/world-grammar/CONTRACT.md) ----------
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
  function setRiseVariables(m) {
    if (m.riseIn == null) return;   /* a host with no rise knobs (the design board) keeps its own CSS */
    root.style.setProperty('--rise-in', m.riseIn + 'ms'); root.style.setProperty('--rise-stagger', m.riseStagger + 'ms'); root.style.setProperty('--rise-out', m.riseOut + 'ms');
  }
  setRiseVariables(ArkWorld.get().motion);

  /* ---------- a fresh load of "/" opens the intro; "/" inside the site is home (as the Three.js host) ---------- */
  var arrived = false, toIntro = false, navigate = router.navigate, preview = /[?&](cms-)?preview(=|&|$)/.test(location.search);
  router.navigate = function (page, settings) {
    if (!arrived && wanted && !preview && page === 'zero' && ArkUI.pageCatalog.intro) { page = 'intro'; toIntro = true; settings = Object.assign({}, settings, { history: 'replace' }); }
    arrived = true;
    return navigate.call(router, page, settings);
  };
  window.addEventListener('ark:route-ready', function () {
    var entry = ArkUI.pageCatalog && ArkUI.pageCatalog[state.get().page];
    if (!entry || !entry.path || !(entry.aliases || []).some(function (a) { return a === location.pathname; })) return;
    try { history.replaceState(history.state, '', entry.path + location.search + location.hash); } catch (e) {}
  });
  if (!wanted) { root.dataset.world = 'off'; return; }
  root.dataset.world = 'loading';

  /* ---------- the layer and the canvas, where the Three.js host puts them ---------- */
  var persistent = scene.querySelector('[data-ark-layer="persistent"]');
  if (!persistent) { fail('no persistent layer'); return; }
  var layer = document.createElement('div'), canvas = document.createElement('canvas');
  layer.className = 'world-layer'; layer.setAttribute('aria-hidden', 'true');
  canvas.id = 'chains'; canvas.className = 'world-canvas'; layer.appendChild(canvas);
  persistent.parentNode.insertBefore(layer, persistent);
  var tagsLayer = document.createElement('div');
  tagsLayer.className = 'tags world-tags'; tagsLayer.dataset.for = 'home'; tagsLayer.setAttribute('aria-hidden', 'true');
  scene.appendChild(tagsLayer);
  var layers = { home: tagsLayer };
  host.tags = function (v) {
    var l = layers[v];
    if (l && l.isConnected) return l;
    l = document.querySelector('.tags[data-for="' + v + '"]');
    if (!l) { l = document.createElement('div'); l.className = 'tags world-tags'; l.dataset.for = v; l.setAttribute('aria-hidden', 'true'); scene.appendChild(l); }
    layers[v] = l; return l;
  };

  /* ---------- the page contract: state, select, on (kept; nothing in slice 1 emits) ---------- */
  var carried = null, current = {}, handlers = {};
  host.state = function (st) { carried = Object.assign(carried || {}, st || {}); return host; };
  /* a change inside the mounted page: its state keys go to the stage, which moves the view's channels to the state they name (auth's eleven) */
  host.select = function (st) {
    /* a choice on the Kit page (board, page, object): the objects move to it, wherever the camera is, and at /kit it follows (kit-stage.js aims: a 900 ms retarget) */
    if (kit && st && st.view === 'kit') {
      var kitChanged = kit.set(st);
      if (cur && viewFor(cur.key) === 'kit') { if (kitChanged) { flyTo(target('kit'), 900, null); wake(); } else refit(); }   /* the page has built its [data-stage] by now: the frame is read again */
    }
    if (!host.ready || !cur) { host.state(st); return host; }
    const v = viewFor(cur.key), before = Object.assign({}, current);
    Object.assign(current, st || {}); applyState(v);
    /* a step inside an identity or how-it-works view: its channels move to the state, and the camera follows (idsign aims a tenth of the way to the step; the movie's beats each have a camera and a flight of their own) */
    const sk = stage && stage.IDV.has(v) && stage.idrig ? stage.idrig.keyOf(v) : 's';
    if (stage && stage.IDV.has(v) && keyValue(sk, current) !== keyValue(sk, before)) { applyFocus(v, performance.now()); flyTo(target(v), stage.setOf(v, 'flight', idStateIndex(v)) * motion().flight || 800, null); wake(); }
    /* a choice inside the chain's pages turns the ring to that record; in the links view the camera follows it; a new ring in the ring view is a new flight */
    if (stage && stage.dyn && v !== 'ring' && stage.FAMILY.has(v) && current.r !== before.r) {
      stage.turnTo(recIndex(current.r), performance.now());
      if (v === 'links') flyTo(target(v), 800, null);
      wake();
    } else if (v === 'ring' && current.i !== before.i) fly(cur.key, true);
    return host;
  };
  host.on = function (name, fn) {
    (handlers[name] || (handlers[name] = [])).push(fn);
    return function off() { var list = handlers[name] || [], i = list.indexOf(fn); if (i >= 0) list.splice(i, 1); };
  };
  /* tell the page's listeners; true when someone is listening (they replace the default). The same rule as the Three.js host's emit. */
  function emit(name, args) {
    var list = (handlers[name] || []).slice(), claimed = false;
    list.forEach(function (fn) { if (fn.apply(null, args) !== false) claimed = true; });
    return claimed;
  }
  /* a row of the page under the pointer lifts its tile (chains-scene.js hoverRecord) */
  host.hoverRecord = function (j) { if (stage && stage.dyn) { stage.hover(j >= 0 && j < stage.dyn.nR ? j : -1, performance.now(), true); wake(); } };
  /* the query a page reads back from its address: the same keys, in the mockup's order */
  function queryOf(st) {
    var q = ['r', 'tab', 'step', 'id', 'c', 'g', 'i', 's'].filter(function (key) { return st && st[key] != null && st[key] !== ''; })
      .map(function (key) { return key + '=' + encodeURIComponent(st[key]); });
    return q.join('&');   /* ArkUI.route.write adds the '?' itself; a '?' here made the address '??i=' and the page read no key */
  }
  /* a click in the world that leaves for another view: the page of that view, with the state it names (the host's open hook) */
  function open(v, st, opts) {
    if (emit('open', [v, st, opts])) return;
    var key = KEY_OF[v];
    if (!key || !ArkUI.pageCatalog[key]) return;
    if (cur && cur.key === key) { host.select(st); return; }
    host.state(st);
    router.navigate(key, opts && opts.replace ? { query: queryOf(st), history: 'replace' } : { query: queryOf(st) });
  }
  host.open = open;

  /* ---------- the theme: 18 tones from the live tokens, as ring-kit.js readTheme() reads them ----------
     HSL channels on body ("210 18% 72%"), to sRGB, to linear (Three.js's Color does the same under its colour
     management), in the palette order of CONTRACT.md: 20 tones. Tone 7, the hub, is identity leaned to strong by .25. */
  var TOKENS = [['--chain-identity', '#bcc3c8'], ['--chain-resolver', '#667e88'], ['--chain-token', '#525a5d'], ['--chain-pool', '#8e8a9f'], ['--chain-network', '#378f7c'], ['--chain-ledger', '#3aa88a'], ['--chain-other', '#525a5d'], null,
    ['--signal', '#3fd1a8'], ['--text-muted', '#9aa3a8'], ['--canvas', '#0a100d'], ['--record', '#e6e1d8'], ['--text-strong', '#f3f8f4'], ['--text', '#c3cdd6'], ['--net-fxn', '#3d8f7c'], ['--net-deark', '#b5764a'], ['--net-cr3tv', '#b07890'], ['--ember', '#f7752a'],
    /* 18 and 19, the halo's glass (glass-kit.js color(): the base and its deep tone, laws 71-74) */
    ['--primary', '#ff8e59'], ['--primary-300', '#5a3424'],
    /* 20, the auth stage's warning (auth-stage.js: the glow and a bead turn to --danger as a state goes bad). The engine palette holds all 22 tones (WORLD.tones), so tone 20 draws as --danger. */
    ['--danger', '#d26a5f'],
    /* 21, the identity steps' Partial: a dashed honey edge, never solid. The SDK token is --drift (honey, review); the Three.js stage read --state-partial, which no theme defines, so it always drew the fallback. */
    ['--drift', '#e8b55a']];
  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) / 360; s /= 100; l /= 100;
    function f(n) { var k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }
    return [f(0), f(8), f(4)];
  }
  function hexToRgb(hex) { var n = parseInt(hex.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
  function toLinear(c) { return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); }
  var paletteNow = null;
  function readPalette() {
    var css = getComputedStyle(document.body || root), out = new Float32Array(66);
    function tok(i) {
      var t = TOKENS[i], v = css.getPropertyValue(t[0]).trim(), rgb;
      if (v) { var p = v.split(/\s+/); rgb = hslToRgb(parseFloat(p[0]), parseFloat(p[1]), parseFloat(p[2])); } else rgb = hexToRgb(t[1]);
      return rgb.map(toLinear);
    }
    for (var i = 0; i < 22; i++) {
      var c = i === 7 ? (function () { var a = tok(0), b = tok(12); return [a[0] + (b[0] - a[0]) * .25, a[1] + (b[1] - a[1]) * .25, a[2] + (b[2] - a[2]) * .25]; })() : tok(i);
      out[i * 3] = c[0]; out[i * 3 + 1] = c[1]; out[i * 3 + 2] = c[2];
    }
    return out;
  }

  /* ---------- the boxes the world asks for (copied: the frame the camera is fitted to) ---------- */
  var S = null, R = null, world = null, cur = null, flown = null, pending = null;
  /* every box the frame reads goes through rect() or touch(), so the set of elements the fit depends on is DERIVED from the frame functions, never listed.
     frame() clears it and refills it; settled() then re-fits when a transition or animation ends on one of them (or on an ancestor that carries them). */
  var reads = new Set(), watched = new Set(), recording = false;
  /* boxes another reader (the site panes) measures: kept for the page's life, so a transition ending on one of them re-measures that reader too */
  function watch(el) { if (el) { watched.add(el); arm(el); } return el; }
  function rect(el) { if (recording) reads.add(el); return el.getBoundingClientRect(); }
  function touch(el) { if (el && recording) reads.add(el); return el; }
  function pageEl(key) { return router.pages && router.pages[key] || null; }
  function asShown(el, fn) {
    if (ArkUI.asShown) return ArkUI.asShown(el, fn);   /* the design board shows a view by a class, not by [hidden] (world2-board-env.mjs) */
    if (!el || !el.hidden) return fn();
    el.hidden = false; var was = el.style.visibility; el.style.visibility = 'hidden';
    try { return fn(); } finally { el.hidden = true; el.style.visibility = was; }
  }
  function headerBottom() { var h = scene.querySelector('.ark-header'); return h ? rect(h).bottom : 0; }
  function footTop() { var f = scene.querySelector('.site-footer-strip'); return f ? rect(f).top : innerHeight; }
  function whole() { return { x: 0, y: 0, w: innerWidth, h: innerHeight }; }
  function textRight(el) {
    touch(el);
    var right = 0, walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), r = document.createRange(), n;
    while ((n = walk.nextNode())) { if (!n.textContent.trim()) continue; r.selectNodeContents(n); right = Math.max(right, r.getBoundingClientRect().right); }
    return right;
  }
  /* the hub's share of the owner's picture, from the hub RING record (network-data.js N.RINGS[N.HUB] before) */
  function hubShare() {
    var hub = world && world.rings.filter(function (r) { return r.kind === 'hub'; })[0];
    return hub ? { x: hub.x / PICTURE.w, y: hub.y / PICTURE.h } : { x: .5, y: .42 };
  }
  function homeFrame(page) {
    var DESIGN = PICTURE.w / PICTURE.h, w = innerWidth, h = innerHeight, topY = headerBottom(), footY = footTop();
    var h1 = page && page.querySelector('h1'), lede = page && page.querySelector('.lede'), rail = page && page.querySelector('.rail');
    var copyRight = Math.max(h1 ? textRight(h1) : 0, lede ? textRight(lede) : 0), rr = rail ? rect(rail) : null;
    var railLeft = rr && rr.width ? rr.left : w, hs = hubShare(), hx = hs.x, hy = hs.y;
    if (w <= 900) { var hp = Math.max(h * .5, w / DESIGN); return { x: w / 2 - hp * DESIGN * hx, y: topY, w: hp * DESIGN, h: hp, cx: w / 2 }; }
    var room = railLeft - copyRight, fw = Math.min((footY - topY) * .86 * DESIGN, room * (ArkUI.homeRoom || 1.45)), fh = fw / DESIGN, open = (copyRight + railLeft) / 2;
    return { x: open - fw * hx, y: topY + ((footY - topY) * .86 - fh) / 2 + fh * (.5 - hy) * .5, w: fw, h: fh, cx: open };
  }
  function frame(v) {
    var page = cur && pageEl(cur.key);
    reads.clear(); recording = true;
    try { return frameOf(v, page); } finally { recording = false; reads.forEach(arm); }
  }
  function frameOf(v, page) {
    return asShown(page, function () {
      if (v === 'home') return homeFrame(page);
      /* the open record is framed by its card ([data-card]); the record view keeps its 3:2 shape inside the stage (the record view's frame) */
      var stage = page && page.querySelector(v === 'open' && page.querySelector('[data-card]') ? '[data-card]' : '[data-stage]'), r = stage && rect(stage);
      if (!r || !r.width) return whole();
      if (v === 'record') { var A = 1.5, sw = Math.min(r.width, r.height * A), sh = sw / A; return { x: r.left + (r.width - sw) / 2, y: r.top + (r.height - sh) / 2, w: sw, h: sh }; }
      return { x: r.left, y: r.top, w: Math.max(1, r.width), h: Math.max(1, r.height) };
    });
  }

  /* the page's [data-panel] box and its [data-stage] width, for the labels that keep clear of them (the panel and tag boxes) */
  function panelRect(v) {
    var page = cur && pageEl(cur.key), el = page && page.querySelector('[data-panel]');
    if (!el) return null;
    return asShown(page, function () { var r = rect(el); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  }
  function stageWidth() {
    var page = cur && pageEl(cur.key), el = page && page.querySelector('[data-stage]');
    return el ? asShown(page, function () { return rect(el).width; }) : null;
  }

  /* ---------- the camera of a view (CONTRACT.md "Camera and the frame of the page") ---------- */
  function fit(w, h, asp, fill) { return Math.max(w / (fill * 2 * TAN * asp), h / (fill * 2 * TAN)); }
  /* the view record a route's view resolves to: its own record, its <view>tall record under a tall aspect (intro,
     auth), else calm */
  function viewName(v, asp) {
    if (asp < .9 && world.views[v + 'tall']) return v + 'tall';
    return world.views[v] ? v : 'calm';
  }
  /* the ring view's camera is the ring the page names: its state 'i' is a ring id, the group names each ring's state by the id's letters and digits */
  function ringIndex() {
    var list = (world.stage.states.ring || []), id = String(current.i || '').replace(/[^a-z0-9]/g, ''), hit = list.filter(function (s) { return s.name === id; })[0] || list.filter(function (s) { return s.name === 'deark'; })[0];
    return hit ? hit.index : 0;
  }
  /* the record the pages name (their address key r) as the ring's position; an unknown one is the newest, as chains-scene.js pick() reads it */
  function recIndex(id) { return stage && stage.dyn ? Math.max(0, stage.dyn.recIds.indexOf(id)) : 0; }
  function target(v) {
    var kitView = v === 'kit' && kit;
    if (kitView && !kit.on()) v = 'calm';   /* boards 01 to 04 are flat tiles over the world: it rests at the calm pose (kit-stage.js target) */
    var f = frame(v), asp = f.w / f.h, name = v === 'ring' && world.views['ring0'] ? 'ring' + ringIndex() : viewName(v, asp);
    /* a how-it-works view with a camera for each state (the movie's nine beats, the resolve steps) has a view record for each, named by the view and the state's number */
    if (stage && stage.IDV.has(v) && stage.rigFor(v)) { var sn = idStateName(v); if (sn && world.views[v + sn.slice(1)]) name = v + sn.slice(1); }
    var rec = world.views[name];
    var t = { view: name, frame: f, aim: rec.aim.slice(), elev: rec.elev, yaw: rec.yaw, tilt: rec.tilt, n: rec.back, aspect: asp };
    if (v === 'links' && stage && stage.dyn) { var ax = stage.setOf('links', 'aimx', recIndex(current.r)); t.aim[0] += ax; }
    if (stage && stage.IDV.has(v)) t.aim[0] += stage.setOf(v, 'aimx', idStateIndex(v));
    if (rec.fit) t.dist = fit(rec.fit.w, rec.fit.h, asp, rec.fit.fill);
    /* calm keeps the Three.js host's rule: wider than the design, as far; narrower, stepped back by the ratio */
    else t.dist = name === 'calm' ? rec.dist * Math.max(1, (PICTURE.w / PICTURE.h) / asp) : rec.dist;
    /* the movie pushes its grid aside by a share of the half width the camera sees (minute-experience.js wide(): aim.x += push * dist * TAN * aspect): WSET push on the state's view */
    var push = stage ? stage.setOf(name, 'push', 0) : 0;
    if (push) t.aim[0] += push * t.dist * TAN * asp;
    /* a camera fitted to the page's box less the page's own top and bottom (the stats canyon: stats-stage.js target): the page's paddings pt and pb, and the stage's own gap */
    if (stage && stage.IDV.has(v) && stage.setOf(v, 'pad', idStateIndex(v))) {
      var gap = stage.setOf(v, 'padgap', idStateIndex(v)), pt = Number(current.pt) || 0, pb = Number(current.pb) || 0, ph = Math.max(120, f.h - pt - (pb + gap));
      t.dist = fit(rec.fit.w, rec.fit.h, f.w / ph, rec.fit.fill);
      t.aim[1] += (pt - (pb + gap)) / 2 * 2 * TAN * t.dist / (f.h * Math.cos(t.elev * D2R));
    }
    if (kitView && kit.on()) kit.aim(t, asp, fit);   /* the chosen object's camera, over the grid's */
    /* the CMS's per-view camera (ArkWorld views[route]) still replaces a number it names */
    var ov = cur ? ArkWorld.forRoute(pathOf(cur.key)).view : null;
    if (ov) {
      if (ov.aimX != null) t.aim[0] = ov.aimX; if (ov.aimY != null) t.aim[1] = ov.aimY; if (ov.aimZ != null) t.aim[2] = ov.aimZ;
      if (ov.dist != null) t.dist = ov.dist; if (ov.elev != null) t.elev = ov.elev; if (ov.yaw != null) t.yaw = ov.yaw; if (ov.tilt != null) t.tilt = ov.tilt;
    }
    return t;
  }

  /* ---------- the camera in motion: flights, the welcome, the pointer's lean ---------- */
  var cam = null, flyFrom = null, flying = false, to = null, t0 = 0, DUR = 0, raf = 0, stage = null, drawnYaw = 0, sites = null, sitesMoving = false, drawParts = null, atHome = false;
  var hubMark = null, hubMarkImg = null, helix = null, helixLoad = null, helixBox = null, helixMoving = false, helixInset = null;
  /* the Kit's 3D (world2-kit.mjs): mounted when the camera is first to fly to /kit; false when it could not load, so /kit keeps the calm world */
  var kit = null, kitLoad = null, kitMoving = false, msaa = 0;   /* msaa: 4 while the Kit shows (its thin lit lines), else 0 */
  var pointer = { x: 0, y: 0 }, lean = { x: 0, y: 0 }, W = 1, H = 1, ratio = 1;
  function motion() { var m = world.knobs.motion; return { flight: m && m.flight ? m.flight / 1750 : 1 }; }
  function wake() { if (!raf) raf = requestAnimationFrame(tick); }
  /* one frame: the stage plays its channels and the camera's flight through the one sampler (world2-stage.mjs), plus the pointer's lean;
     draws, and asks for the next frame only while a channel, the flight or the lean still moves */
  function tick(now) {
    raf = 0;
    if (!cam || !R) return;
    var moving = false;
    if (stage) {
      var c = stage.cameraAt(now);
      if (c) { cam.aim = c.aim; cam.dist = c.dist; cam.elev = c.elev; cam.yaw = c.yaw; cam.tilt = c.tilt; if (c.done) { flying = false; if (to) fitShadowFor(to); measureSlab(); refit(); } else moving = true; }
      if (stage.step(now)) moving = true;
    }
    var tx = reduced() ? 0 : pointer.x, ty = reduced() ? 0 : pointer.y;
    lean.x += (tx - lean.x) * .08; lean.y += (ty - lean.y) * .08;
    if (Math.abs(tx - lean.x) > .001 || Math.abs(ty - lean.y) > .001) moving = true;
    /* a channel that moves things (a lift, the build-up, the card's pose) moves their shadows: the map is drawn again for those frames only */
    draw(!!(stage && stage.busy()));
    if (sitesMoving) moving = true;
    if (helixMoving || haloMoving) moving = true;
    if (kit) { kitMoving = kit.step(now); if (kitMoving) moving = true; }
    afterDraw();
    if (moving) raf = requestAnimationFrame(tick);
  }
  /* forceShadow: the measurement's redraw draws the shadow map again so one frame carries the whole cost */
  function draw(forceShadow) {
    if (!cam || !R) return;
    var c = drawn();
    drawnYaw = c.yaw;
    stage.place(c, slabRect);   /* the page slab follows the camera as it is drawn, the lean included */
    if (sites) { sitesMoving = sites.step(performance.now()); sites.flush(); }
    haloMoving = haloStep(performance.now());   /* the glass halo over the kernel fades with the view (glass-kit.js show: 1 on intro, .6 on home, 0 elsewhere, tau 320 ms) */
    helixInset = stepHelix(c);   /* the identity card's helix, where the page has its box */   /* the site panes: where each stands this frame, laid into the draw list */
    R.setPointLight(stage.idrig ? stage.idrig.light() : null);   /* the trace's ember light (world2-idrig.mjs light()) */
    if (kit) kit.flush();   /* the Kit's objects: where each stands this frame, laid into the mesh pass and the draw list */
    var lg = stage.logoState(); R.setLogoState(lg.nb, lg.xl);   /* the kernel's light, pool and mark follow the view's step back and its lit state */
    R.render(c, to ? to.dist : cam.dist, !!forceShadow, helixInset ? [helixInset] : undefined);
  }
  /* the camera exactly as it is drawn (radians, the lean applied), with the frame it is fitted to: what picking and the labels project through */
  function drawn() {
    return { aim: cam.aim, dist: cam.dist, elev: (cam.elev - lean.y * cam.tilt * .6) * D2R, yaw: (cam.yaw + lean.x * cam.tilt) * D2R, frame: to ? to.frame : whole(), W: W, H: H };
  }
  function redraw() { if (!raf) { draw(); afterDraw(); } }

  /* ---------- touch: hover, lift, picks, labels (world2-stage.mjs, world2-tags.mjs) ---------- */
  var tags = null, spots = [], over = null, down = { x: 0, y: 0 };
  /* home's two site panes (world2-sites.mjs): the pane under a point of the page, for the camera as drawn; -1 over none, over the page's own controls or while a worn card covers the world */
  function paneAt(x, y, t) {
    if (!sites || !cam || host.covered || (t && overUI(t))) return -1;
    var box = rect(layer);
    return sites.at(x - box.left, y - box.top, drawn());
  }
  function overUI(t) { return !!(t && t.closest && t.closest('a,button,input,select,textarea,label,[role="tab"],[data-ui]')); }
  /* what is under a point of the page, through the camera as drawn; null off the canvas or over the page's own controls */
  function hitAt(x, y) {
    if (!stage || !cam || host.covered) return null;
    var box = rect(layer);
    return stage.pick(x - box.left, y - box.top, drawn());
  }
  function hoverAt(x, y, target) {
    var pj = paneAt(x, y, target);
    if (sites) sites.hover(pj);
    if (pj >= 0) {   /* a pane lifts under the pointer and names itself; nothing else of the world is under it */
      var pw = sites.wordsOf(pj), pkey = 'p' + pj;
      stage.hover(-1, performance.now()); stage.hover(-1, performance.now(), true);
      document.body.classList.add('picking');
      if (pkey !== over) { over = pkey; emit('hover', [{ name: pw.name, act: pw.act }, x, y]); }
      wake(); return;
    }
    if (!stage) return;   /* a pointer move can arrive before the stage is built (owner's browser, 2026-10-30: 26 errors) */
    var hit = !overUI(target) ? hitAt(x, y) : null, words = hit ? stage.wordsOf(hit) : null, dynHit = !!(hit && hit.dyn);
    var id = hit && hit.item >= 0 && (dynHit ? !!words : stage.hoverable.has(hit.item)) ? hit.item : -1;
    if (stage.idrig && stage.idrig.hoverRow(hit && hit.rig ? hit.part : null, hit && hit.rig ? hit.instance : -1)) wake();   /* a block of a how-it-works view lifts under the pointer (world2-idrig.mjs) */
    var key = hit ? (dynHit ? 'd' : '') + hit.item + ':' + hit.slot : '';
    stage.hover(id, performance.now(), dynHit && id >= 0);
    document.body.classList.toggle('picking', !!words);
    if (key !== over) { over = key; emit('hover', [words ? { name: words.name, act: words.act, rec: words.hook === 'pick' ? Number(words.arg) : undefined } : null, x, y]); }
    wake();
  }
  /* a click on a touchable instance: the hook its words name, else the page it opens (hooks pick / pickRing / stagePick, CONTRACT.md) */
  function clickAt(x, y) {
    var pj = paneAt(x, y, null);
    if (pj >= 0) {   /* a click on a pane is a click on its ring (home-sites.js: hooks.pickRing): the page that listens takes it, else the ring's own page from the ring's words */
      var ringIx = sites.wordsOf(pj).ring, to = stage.wordsOf({ item: ringIx, slot: 0 });
      if (emit('pickRing', [ringIx]) || !to) return;
      open(to.view, to.key ? { [to.key]: to.value } : {}, {});
      return;
    }
    var hit = hitAt(x, y), w = hit ? stage.wordsOf(hit) : null;
    if (!w) return;
    if (w.hook === 'none') return;   /* an earlier version names itself and does nothing when clicked */
    var arg = Number(w.arg);
    if (w.hook === 'stagePick') { emit('stagePick', [w.key, w.arg]); return; }
    if (w.hook === 'open') { open(w.view, w.key ? { [w.key]: w.value } : {}, w.replace ? { replace: true } : {}); return; }   /* a block of the record descent: the view and state its stage names */
    if (w.hook === 'pick') { if (emit('pick', [w.pickView || 'home', arg])) return; if (w.pickView && w.pickView !== 'home') return; }
    else if (emit('pickRing', [arg])) return;
    open(w.view, w.key ? { [w.key]: w.value } : {}, {});
  }
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    pointer.x = e.clientX / innerWidth * 2 - 1; pointer.y = e.clientY / innerHeight * 2 - 1; hoverAt(e.clientX, e.clientY, e.target);
  }, { passive: true });
  document.addEventListener('pointerleave', function () { pointer.x = pointer.y = 0; if (stage) { stage.hover(-1, performance.now()); stage.hover(-1, performance.now(), true); document.body.classList.remove('picking'); if (over) { over = null; emit('hover', [null, 0, 0]); } } wake(); });
  window.addEventListener('pointerdown', function (e) { down.x = e.clientX; down.y = e.clientY; }, { passive: true });
  window.addEventListener('click', function (e) {
    if (overUI(e.target) || document.body.classList.contains('no-scene')) return;
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    clickAt(e.clientX, e.clientY);
  });
  /* after a draw the labels follow the camera: each tag's point on the canvas, placed clear of the page (home's wait for the build) */
  function afterDraw() {
    if (!stage || !tags || !cam) return;
    var c = drawn(), box = rect(layer), v = cur ? viewFor(cur.key) : null, sc = pageScale();   /* labels live in the page's own px (the design board zooms its root above 1440 wide) */
    if (world.stage.spots.home) {
      var layerEl = host.tags('home'), ready = stage.tagsReady(), pts = world.stage.spots.home;
      spots = Object.keys(pts).map(function (id) {
        var q = stage.project(pts[id], c), x = q ? (q[0] + box.left) / sc : -999, y = q ? (q[1] + box.top) / sc : -999;
        return { id: id, x: x, y: y, on: ready && !!q && tags.clear(layerEl, id, x, y) };
      });
      tags.place('home', spots);
    }
    /* the chain views' labels hang off rows of the frames (the key, the chain's two ends, the next record, the earlier versions, the related records) */
    if (v && stage.idrig && stage.IDV.has(v)) {
      tags.place(v, stage.idrig.spotsOf(v, function (n) { return stage.value(v, n); }, stage.stateOf(v)).map(function (sp) {
        var q = stage.project(sp.p, c);
        return { id: sp.id, x: q ? (q[0] + box.left) / sc : -999, y: q ? (q[1] + box.top) / sc : -999, on: sp.on && !!q };
      }));
    }
    if (kit && v === 'kit') tags.place('kit', kit.spots());   /* the Kit's names over the 3D: the chosen object's alone */
    if (v && stage.dyn && stage.engaged && stage.CHAIN.has(v) && v !== 'ring') {
      var list = stage.dyn.spotsOf(v, function (n) { return stage.value('flight', n); }).map(function (sp) {
        var q = stage.project(sp.p, c);
        return { id: sp.id, x: q ? (q[0] + box.left) / sc : -999, y: q ? (q[1] + box.top) / sc : -999, on: sp.on && !!q };
      });
      tags.place(v, list);
    }
  }

  /* ---------- size ---------- */
  function resize() {
    var box = rect(layer);
    if (!box.width || !box.height || !R) return;
    W = box.width; H = box.height;
    if (tags) tags.reset();
    if (sites) sites.relayout();
    /* drawn pixels: 2.6 million, or 4.2 million on a big screen (above 3.2 million screen pixels), as ring-kit.js */
    ratio = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt((W * H > 3.2e6 ? 4.2e6 : 2.6e6) / (W * H)));
    R.resize(W * ratio, H * ratio, msaa);
    if (cur && to) {
      to = target(viewFor(cur.key));
      /* mid-flight the flight lands on the new box: the same poses from here, for the time that is left */
      if (!flying) Object.assign(cam, { aim: to.aim.slice(), dist: to.dist, elev: to.elev, yaw: to.yaw, tilt: to.tilt });
      else if (stage) stage.fly({ aim: cam.aim.slice(), dist: cam.dist, elev: cam.elev, yaw: cam.yaw, tilt: cam.tilt }, { aim: to.aim.slice(), dist: to.dist, elev: to.elev, yaw: to.yaw, tilt: to.tilt }, Math.max(1, DUR - (performance.now() - t0)), performance.now());
      R.setFrame(to.frame, W, H);
      measureSlab();
    }
    else R.setFrame(whole(), W, H);
    redraw();
  }

  /* ---------- the world starts: after first paint, three requests, one upload ---------- */
  function afterPaint(fn) {
    requestAnimationFrame(function () { requestAnimationFrame(function () { (window.requestIdleCallback || function (f) { setTimeout(f, 0); })(fn, { timeout: 1500 }); }); });
  }
  afterPaint(function () {
    try { R = createRenderer(canvas); } catch (e) { fail(e.message); return; }
    if (!R) { fail('no WebGL 2 context'); return; }
    /* a lost WebGL context (Chrome keeps about 16 and takes the oldest) is rebuilt by the engine; the picture is drawn once when it is back (context-guard.mjs) */
    afterRestore(R.gl, function () { if (raf) return; draw(true); afterDraw(); });
    fetchWorld().then(function (w) {
      world = w;
      if (w.views.calm) { CALM.n = w.views.calm.back; CALM.elev = w.views.calm.elev; CALM.dist = w.views.calm.dist; CALM.tilt = w.views.calm.tilt; }
      R.setLook(w.knobs.look);
      /* one blob serves every view in slice 1; a view with its own blob would be fetched here on its first flight */
      var first = w.frames.intro || w.frames[Object.keys(w.frames)[0]];
      if (!first) throw new Error('no frame record');
      var words = w.stage.names.home;
      return Promise.all([fetchBlob(first.cid), words ? fetchNames(words.cid) : { items: new Map(), tags: [] }]).then(function (got) { start(first.cid, got[0], got[1]); });
    }).catch(function (e) { fail(e.message); });
  });
  function start(cid, buffer, words) {
    var parts = world.parts.intro || world.parts[Object.keys(world.parts)[0]] || [];
    drawParts = parts;
    parts.forEach(function (p) { if (p.part === 'pearl') { p.like = 'solid'; p.shape = 'sphere'; p.noShadow = true; } if (p.part === 'glyph') { p.like = 'solid'; p.shape = 'cube'; p.noShadow = true; } });   /* the glyph bars engraved on the network's tiles: solid boxes in the frame's own buffer */
    R.setFrameBlob(cid, buffer, parts);
    /* the stage gives the parts their state and morph streams (the renderer's per-part buffers) and owns every channel */
    stage = createStage({ world: world, R: R, parts: parts, blob: buffer, names: words, fov: FOV, reduced: reduced, wake: wake, palette: function () { return paletteNow || (paletteNow = readPalette()); } });
    tags = createTags({ layerOf: function (v) { return host.tags(v); }, here: function () { return cur ? viewFor(cur.key) : null; }, scale: pageScale,
      panel: function (v) { var r = panelRect(v), z = pageScale(); return r && { x: r.x / z, y: r.y / z, w: r.w / z, h: r.h / z }; },
      stageWidth: function () { var w = stageWidth(); return w == null ? w : w / pageScale(); },
      top: function () { return headerBottom() / pageScale(); }, foot: function () { return footTop() / pageScale(); }, width: function () { return innerWidth / pageScale(); } });
    tags.fill(host.tags('home'), words.tags);
    var ground = parts.filter(function (p) { return p.part === 'ground'; })[0];
    if (ground) R.setPlate(firstInstance(buffer, ground));
    /* the mark, by its content id; the plate draws without it until it lands */
    hubMark = mountHubMark(R, parts, world.stage.set.home && world.stage.set.home[0] && world.stage.set.home[0].hubtube || .045 / 1.02);   /* the hub's round mark: its parts are the home frame's */
    if (world.mark) { var img = new Image(); img.onload = function () { R.setMark(img); hubMarkImg = img; hubMark.paint(img); redraw(); }; img.src = worldPath(world.mark + '.png'); }
    /* the chain marks, by content id, in LOGO record order (the mark part's instance order); each quad's world width
       is read from its instance so the renderer can wear the mask's edge by the inlay's .05 units. The floor draws
       without them until every mask has landed. */
    var markPart = parts.filter(function (p) { return p.part === 'mark'; })[0];
    if (markPart && world.logos.length) {
      var logos = [], left = world.logos.length;
      world.logos.forEach(function (l, j) {
        var im = new Image();
        im.onload = function () { logos[j] = { img: im, scale: firstInstance(buffer, markPart, j).scale }; if (--left === 0) { R.setLogos(logos); redraw(); } };
        im.onerror = function () { if (window.console) console.warn('[world2] chain mark ' + l.cid + '.svg did not load; ring ' + l.ring + ' shows no mark'); if (--left === 0 && logos.length) { R.setLogos(logos.filter(Boolean)); redraw(); } };
        im.src = worldPath(l.cid + '.svg');
      });
    }
    R.setDim(0);   /* a stepped-back instance is its colour times (1 - dim), as chains-scene.js tints it (1 - dims[ring]); the engine's default floor of .25 left the focus dimming weaker than Three.js */
    R.setPalette((paletteNow = readPalette()));
    var repaint = function () { R.setPalette((paletteNow = readPalette())); if (sites) sites.repaint(); if (helix) helix.repaint(); if (hubMark) hubMark.paint(hubMarkImg); if (kit) kit.repaint(); if (stage.dyn) { stage.dyn.paintAll(); stage.refresh(); } if (stage.rig) { stage.rig.repaint(); stage.refresh(); } if (stage.idrig) { stage.idrig.repaint(); stage.refresh(); } redraw(); };
    new MutationObserver(repaint).observe(root, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', repaint);
    new ResizeObserver(resize).observe(layer);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
    ArkWorld.onChange(applyWorld);
    if (!reduced() && peekBuild()) stage.unbuilt();   /* the first visit's network starts unbuilt: no flash of the finished world before the build begins */
    resize();
    root.dataset.world = 'on';
    layer.dataset.ready = '1';
    /* the pages' S (DEFXNScene) has no counterpart here; what they may read of it is named */
    S = host.scene = { ok: true, grammar: true, hooks: {}, world: world, renderer: R, stage: stage,
      /* light some rings, and the computers, and step the rest back (chains-scene.js ringApi.focusOn); which(ringIndex, kind) */
      focusOn: function (which, cubes) { stage.focus(which ? function (i) { return which(i, world.rings[i] && world.rings[i].kind); } : null, cubes, performance.now()); wake(); },
      refresh: function () { if (cur) flyTo(target(viewFor(cur.key)), 500, null); },
      /* a page that chooses a step of its own view (download.js: select({ view: 'download', s })) */
      select: function (st) { host.select(st); } };
    /* read-only camera for the parity harness (scripts/world-parity.mjs): the same shape the Three.js host answers, aim in world units and angles in degrees */
    host.camera = function () { return cam ? { aim: cam.aim.slice(), dist: cam.dist, elev: cam.elev, yaw: cam.yaw, tilt: cam.tilt } : null; };
    host.ready = true;
    loadSites();
    /* the groups of the views a visitor goes to first (the chain views, the identity steps, how a result is made) are read and mounted when the page has nothing else to do, so the first flight
       to one of them starts on time: a flight waited 100 to 250 ms for its group to mount (BOARD-GAPS, lane A). One at a time, in idle time, after home has drawn. */
    warmGroups();
    window.__world2 = { R: R, parts: function () { return drawParts; }, kit: function () { return kit; }, target: function () { return to; }, sites: function () { return sites; }, helix: function () { return helix; },  stage: stage, hit: hitAt, project: function (p) { var q = stage.project(p, drawn()), b = rect(layer); return q ? [q[0] + b.left, q[1] + b.top] : null; }, stats: R.stats, redraw: function () { draw(true); }, gl: R.gl, world: world, programs: R.programs, halfFloat: R.halfFloat, shadows: R.shadows, camera: function () { return cam; }, card: function () { return cardOn && cards[cardOn] ? cards[cardOn] : null; }, pieces: function () { return piecesMod; } };
    var key = pending || state.get().page;
    pending = null;
    if (key === 'zero' && (toIntro || (!arrived && wanted && !preview && ArkUI.pageCatalog.intro))) setTimeout(function () { toIntro = false; if (flown === null) fly(state.get().page); }, 4000);
    else fly(key);
    readyHooks.splice(0).forEach(function (fn) { fn(); });
  }
  /* the CMS changed a knob: the look is re-applied with its keys lowercased (the records' knob names), the rise
     variables follow, and the camera eases to the route's new numbers */
  function applyWorld() {
    var w = ArkWorld.get();
    setRiseVariables(w.motion);
    if (!host.ready) return;
    var look = {}; Object.keys(w.look || {}).forEach(function (k) { if (typeof w.look[k] === 'number') look[k.toLowerCase()] = w.look[k]; });
    R.setLook(look);
    if (cur) flyTo(target(viewFor(cur.key)), 500, null);
  }

  /* ---------- follow the router ---------- */
  /* the shadow map's box: round the view's aim, 40 for the network's views and 14 for the calm pose (chains-scene.js
     shadowR); fitted to the new view at a flight's start, so the map is drawn once per flight, not per frame */
  /* chains-scene.js shadowR / fitShadow: the whole network at home, your ring and its neighbours on the chain views, 14 elsewhere; a flight holds both ends */
  function shadowR(t) { return t.n < .5 ? 40 : stage.setOf(t.view, 'm') > .5 ? 16 : 14; }
  function fitShadowFor(a, b) {
    if (!b) { R.fitShadow(a.aim, shadowR(a)); return; }
    var c = [(a.aim[0] + b.aim[0]) / 2, (a.aim[1] + b.aim[1]) / 2, (a.aim[2] + b.aim[2]) / 2], d = Math.hypot(a.aim[0] - b.aim[0], a.aim[1] - b.aim[1], a.aim[2] - b.aim[2]) / 2;
    R.fitShadow(c, Math.min(40, d + Math.max(shadowR(a), shadowR(b))));
  }
  function flyTo(t, dur, startAt) {
    var was = to;
    if (window.__defxnDiag) window.__defxnDiag('fly', 'view=' + t.view + ' from=' + (was && was.view) + ' dur=' + dur + ' reduced=' + reduced() + ' hascam=' + !!cam);   /* dev reporter only (scripts/serve-site.mjs DEFXN_DIAG_LOG) */
    to = t;
    if (sites) sites.relayout();   /* the frame the panes slide inside is the camera's */
    R.setFrame(t.frame, W, H);
    if (was && dur > 0 && !reduced() && stage.FAMILY.has(t.view.replace(/\d+$/, '')) !== stage.FAMILY.has(was.view.replace(/\d+$/, ''))) fitShadowFor(was, t); else fitShadowFor(t);
    if (!cam || dur <= 0 || reduced()) { cam = { aim: t.aim.slice(), dist: t.dist, elev: t.elev, yaw: t.yaw, tilt: reduced() ? 0 : t.tilt }; flying = false; stage.stop(); draw(); afterDraw(); return 0; }
    t0 = performance.now(); DUR = dur; flying = true;
    /* the camera's keys are the two poses; the stage reads them through the sampler on the kernel's in-out clock */
    flyFrom = startAt || { aim: cam.aim.slice(), dist: cam.dist, elev: cam.elev, yaw: cam.yaw, tilt: cam.tilt };
    stage.fly(flyFrom, { aim: t.aim.slice(), dist: t.dist, elev: t.elev, yaw: t.yaw, tilt: t.tilt }, dur, t0);
    wake();
    return dur;
  }
  /* the first visit builds the network once (home-descent.js: story.on, and a return visit skips it when story.skipOnReturn is on) */
  function wantBuild() {
    var story = world.knobs.story || {}, on = story.on == null ? true : story.on > 0, skip = story.skiponreturn == null ? true : story.skiponreturn > 0, KEY = 'defxn-home-descent-seen';
    try {
      var seen = !!localStorage.getItem(KEY);
      if (!seen) localStorage.setItem(KEY, '1');
      return on && !(seen && skip);
    } catch (e) { return on; }
  }
  /* the same question without writing the seen mark: the first draw (resize) happens before the first flight starts the build, and a settled network drawn there is a flash of the finished world */
  function peekBuild() {
    var story = world.knobs.story || {}, on = story.on == null ? true : story.on > 0, skip = story.skiponreturn == null ? true : story.skiponreturn > 0;
    try { return on && !(!!localStorage.getItem('defxn-home-descent-seen') && skip); } catch (e) { return on; }
  }
  /* a page's state keys name a state of the view (auth's s, and the create wizard's step b); the stage moves its channels there */
  /* an identity step's state from the page's key s: the steps of a sign-in (s1..s3) and the faces of the vault (s0..s2) are the states the group names */
  /* the page's value for a view's state key: one key, or several joined (the stats' step and its chosen group: 's|c') */
  function keyValue(key, from) { return String(key).split('|').map(function (k) { return from[k] == null ? '' : from[k]; }).join('|'); }
  function idStateName(v) {
    var list = world.stage.states[v]; if (!list || !list.length) return null;
    var key = stage && stage.idrig ? stage.idrig.keyOf(v) : 's';
    /* a view whose states are named by something other than a number (the record descent: the record's id) */
    var byId = stage && stage.idrig && key.indexOf('|') < 0 && current[key] != null ? stage.idrig.stateOfKey(v, current[key]) : null;
    if (key.indexOf('|') >= 0 && stage && stage.idrig) { var whole = keyValue(key, current); byId = stage.idrig.stateOfKey(v, whole) || stage.idrig.stateOfKey(v, whole.split('|')[0] + '|'); if (!byId) return list[0].name; }
    if (byId) return byId;
    var lo = parseInt(list[0].name.slice(1), 10), n = parseInt(current[key], 10);
    n = isNaN(n) ? lo : Math.min(lo + list.length - 1, Math.max(lo, n));
    return 's' + n;
  }
  function idStateIndex(v) {
    var name = idStateName(v), list = world.stage.states[v] || [];
    for (var i = 0; i < list.length; i++) if (list[i].name === name) return list[i].index;
    return 0;
  }
  function applyState(v) {
    if (stage && stage.IDV.has(v)) { var nm = idStateName(v); if (nm) stage.setState(v, nm, performance.now()); return; }
    if (!stage || v !== 'auth') return;
    var st = current || {}, b = Math.min(6, Math.max(0, Number(st.b) || 0)), name = st.s === 'create' ? 'create' + b : st.s;
    stage.setNet(st.net == null ? '' : String(st.net));   /* the page names the network its second panel reads */
    if (name) stage.setState('auth', name, performance.now());
  }
  /* the view a view record belongs to: its tall record, the ring view's record for a ring, a how-it-works view's record for a state (movie4, resolve3) */
  function baseView(v) {
    var base = v.replace(/tall$/, '').replace(/^ring\d+$/, 'ring'), named = /^(.*?)\d+$/.exec(base);
    return named && stage && stage.IDV.has(named[1]) && !stage.IDV.has(base) ? named[1] : base;
  }
  /* the rings a view lights: the account step lights your ring and the three networks and steps the rest back (identity-stages.js focus); each beat of the minute lights what it names (minute-experience.js focus()),
     read from the stage (the group's `beat` lines). A view that lights nothing clears what the last one lit. */
  var focusSet = false;
  function applyFocus(base, now) {
    var rig = stage.idrig, ids = rig && rig.focusOf(base), beat = rig && stage.IDV.has(base) ? rig.beatOf(base, stage.stateOf(base)) : null;
    if (beat) { focusSet = true; stage.focus(beat.rings ? function (i) { return beat.rings.indexOf(i) >= 0; } : null, beat.cubes, now); }
    else if (ids) { focusSet = true; stage.focus(function (i) { return ids.indexOf(i) >= 0; }, false, now); }
    else if (focusSet) { focusSet = false; stage.focus(null, false, now); }
  }
  /* a view the camera arrives at: its touchable parts, its state; a view it leaves rests (auth's beam is on again for the network) */
  function enterView(v, was, flight) {
    var base = baseView(v), now = performance.now();
    atHome = base === 'home';
    if (sites) sites.view(atHome, now);
    if (kit) kit.view(!!cur && viewFor(cur.key) === 'kit', now, flight.dur);   /* the Kit's objects grow in as the camera comes and sink as it leaves (chains-scene.js morph) */
    stage.setView(base); stage.hover(-1, now); stage.hover(-1, now, true); document.body.classList.remove('picking');
    stage.presentOnly(base, now, flight.dur);   /* the glass of the sign-in view and the identity steps come in with the camera and go as it leaves */
    if (was === 'auth' && base !== 'auth') stage.rest('auth', now);
    if (base === 'auth') applyState('auth');
    if (stage.IDV.has(base)) { applyState(base); stage.enterId(base, now); applyFocus(base, now); }
    else applyFocus(base, now);
    /* the chain group (your chain's views, the ring view): the rows blend toward the view the camera arrives at */
    if (stage.dyn) stage.enter(base, was, now, flight);
    wake();
  }
  /* where the page slab lies: the page's [data-panel] in the canvas's own pixels, measured when a flight begins and when it ends */
  /* the page's box can change after the flight began (its styles or words landed late): the camera is fitted again to the box as it is now, over 240 ms (chains-scene.js refit) */
  function refit() {
    if (!cur || !to || !stage || !world) return;
    var t2 = target(viewFor(cur.key));
    if (!(Math.abs(t2.dist - to.dist) > 1e-3 || Math.abs(t2.frame.w - to.frame.w) > .5 || Math.abs(t2.frame.h - to.frame.h) > .5)) return;
    /* during a flight only the flight's end moves: same start, same clock, so the motion stays one piece. A new 240 ms flight here
       restarted from rest and jumped (owner, 2026-10-30: back to home refitted three times at 1.2 s into the 1.7 s flight) */
    if (flying && flyFrom && t2.view === to.view) {
      to = t2; R.setFrame(t2.frame, W, H); if (sites) sites.relayout();
      stage.fly(flyFrom, { aim: t2.aim.slice(), dist: t2.dist, elev: t2.elev, yaw: t2.yaw, tilt: t2.tilt }, DUR, t0);
      wake(); return;
    }
    flyTo(t2, 240, null); measureSlab();
  }
  /* The page's own CSS slides and rises elements after the first measure (home's rail moves 56 px after fonts load; the fit read it mid-slide). When a transition or
     animation ends on an element the frame read, or on an ancestor of one, the box is final: fit once more through refit(), which glides on the camera tween. It is an
     event, not a poll: nothing runs between ends, and a fit that finds no change does nothing. */
  function settled(e) {
    var t = e.target;
    if ((!reads.size && !watched.size) || !t || t.nodeType !== 1) return;
    var hit = false;
    reads.forEach(function (el) { if (el === t || t.contains(el)) hit = true; });
    watched.forEach(function (el) { if (el === t || t.contains(el)) hit = true; });
    /* the site panes lay themselves out from the page's boxes too (world2-sites.mjs measure(), which reads them through watch()); they measure again even when the camera's frame did not change */
    if (hit) settledNow();
  }
  /* The page's rise-ins run through the Web Animations API (el.animate), which fires no transitionend or animationend. Every running animation on a measured element, or on an
     ancestor that moves it, is asked once for its finished promise; when it resolves the box is final and the same re-fit runs. A cancelled animation rejects and does nothing. */
  var armed = new WeakSet();
  function settledNow() { if (sites) sites.relayout(); refit(); wake(); }
  function arm(el) {
    for (var n = el; n && n.getAnimations; n = n.parentElement) {
      n.getAnimations().forEach(function (a) { if (armed.has(a)) return; armed.add(a); a.finished.then(settledNow, function () {}); });
    }
  }
  document.addEventListener('transitionend', settled, true);
  document.addEventListener('animationend', settled, true);
  var slabRect = null;
  function measureSlab() {
    var v = cur ? viewFor(cur.key) : null, r = v && stage && stage.dyn && stage.FAMILY.has(v) ? panelRect(v) : null, b = rect(layer);
    slabRect = r ? { x: r.x - b.left, y: r.y - b.top, w: r.w, h: r.h } : null;
  }
  /* the chain group is fetched, read and mounted once, the first time the camera is to fly to one of its views (or the page opens on one) */
  var dynData = null, dynMount = null;
  function fetchDyn() {
    if (!dynData) dynData = fetchGroup(world, 'chain').then(function () {
      var fr = world.frames.dyn, nm = world.stage.names.dyn;
      if (!fr || !nm) throw new Error('the chain group names no blob or no words');
      return Promise.all([fetchBlob(fr.cid), fetchLines(nm.cid), fetchPieces()]);
    });
    return dynData;
  }
  /* home's two site panes (world2-sites.mjs): the group is read once, after the first frame, and mounted on the draw list the stage holds; the pane glass goes through the mesh pass like the chain
     views' glass. A browser that cannot read the group draws home without the panes. */
  /* the identity card's helix (world2-helix.mjs): drawn in the box the page names with [data-helix] (the identity card of the board, or a [data-helix] inside the site home).
     The group is read when such a box first exists; a page with no box never fetches it. */
  var haloFade = 1, haloAt = 0, haloMoving = false;
  function haloStep(now) {
    var halos = drawParts ? drawParts.filter(function (p) { return p.part === 'halo'; }) : [];
    if (!halos.length) return false;
    var v = cur ? viewFor(cur.key) : 'home', want = v === 'intro' || v === 'home' ? 1 : 0, dt = haloAt ? Math.min(64, now - haloAt) : 16;
    haloAt = now;
    haloFade = reduced() ? want : haloFade + (want - haloFade) * (1 - Math.exp(-dt / 320));
    if (Math.abs(want - haloFade) < .002) { haloFade = want; haloAt = 0; }
    halos.forEach(function (p) { p.fade = haloFade; });
    return haloFade !== want;
  }
  function findHelixBox() {
    var home = pageEl('zero'), el = home && home.querySelector('.idcard [data-helix], [data-helix]');
    if (el && el !== helixBox) {
      helixBox = el;
      el.addEventListener('pointerenter', function () { if (helix && atHome) { helix.hover(performance.now()); wake(); } });
      el.addEventListener('click', function () { if (atHome) open('ring', { i: 'identity-1' }); });
      if (window.ResizeObserver) new ResizeObserver(function () { wake(); }).observe(el);
      watch(el);
    }
    return helixBox && helixBox.isConnected ? helixBox : null;
  }
  function stepHelix(c) {
    helixMoving = false;
    var el = world && world.groups.helix ? findHelixBox() : null;
    if (!el) return null;
    if (!helix) {
      if (!helixLoad) helixLoad = fetchGroup(world, 'helix').then(function () {
        var nm = world.stage.names.helix;
        if (!nm) throw new Error('the helix group names no words');
        return fetchLines(nm.cid);
      }).then(function (lines) {
        helix = createHelix({ world: world, R: R, lines: lines, palette: function () { return paletteNow || (paletteNow = readPalette()); }, wake: wake, reduced: reduced, fov: FOV });
        wake();
      }).catch(function (e) { if (window.console) console.warn('[world2] the helix did not load (' + e.message + '); the identity card draws without it'); });
      return null;
    }
    var page = pageEl('zero'), lb = rect(layer);
    var out = helix.step(performance.now(), { box: function () { return el; }, layerBox: function () { return lb; }, scale: canvas.width / Math.max(1, lb.width), canvasH: canvas.height, canvasW: canvas.width, homeW: function () { return stage.homeW(); }, clock: function () { return stage.clockMs(); },
      building: function () { return stage.isBuilding(); }, atHome: function () { return atHome; }, cardOn: function () { return !!page && !page.hidden && !el.closest('[hidden]'); } });
    helixMoving = out.moving;
    return out.inset;
  }
  function loadSites() {
    if (!world.groups.sites) return;
    fetchGroup(world, 'sites').then(function () {
      var fr = world.frames.sites, nm = world.stage.names.sites;
      if (!fr || !nm) throw new Error('the sites group names no blob or no words');
      return Promise.all([fetchBlob(fr.cid), fetchLines(nm.cid), fetchPieces()]);
    }).then(function (got) {
      sites = createSites({ world: world, R: R, blob: got[0], lines: got[1], pieces: got[2], list: drawParts, wake: wake, reduced: reduced, fov: FOV,
        palette: function () { return paletteNow || (paletteNow = readPalette()); },
        page: function () { return pageEl('zero'); }, layerBox: function () { return rect(layer); }, watch: watch,
        homeCam: function () { var t = to && baseView(to.view) === 'home' ? to : target('home'); return { aim: t.aim, dist: t.dist, elev: t.elev, yaw: t.yaw, frame: t.frame, W: W, H: H }; },
        building: function () { return stage.isBuilding(); }, clock: function () { return stage.clockMs(); } });
      sites.view(atHome, performance.now()); wake();
    }).catch(function (e) { if (window.console) console.warn('[world2] the site panes did not load (' + e.message + '); home draws without them'); });
  }
  /* the Kit (world2-kit.mjs): its module, the mesh pass and its records are fetched once, the first time the camera is to fly to /kit. The page reads ArkWorldHost.kit once it stands. */
  function loadKit() {
    if (!kitLoad) kitLoad = Promise.all([import('./world2-kit.mjs'), import('/fxn-3d/js/render/world2-mesh.mjs'), fetchPieces()]).then(function (m) {
      return m[0].createKit({ R: R, mesh: m[1], pieces: m[2], list: drawParts, wake: wake, reduced: reduced,
        project: function (p) { var q = stage.project(p, drawn()), b = rect(layer); return q ? [q[0] + b.left, q[1] + b.top] : null; },
        size: function () { var b = rect(layer); return { w: b.width, h: b.height }; },
        markUrl: world.mark ? worldPath(world.mark + '.png') : null,
        msaa: function (on) { var n = on ? 4 : 0; if (n === msaa) return; msaa = n; if (R && W && H) R.resize(W * ratio, H * ratio, msaa); },
        order: function () { var b = window.DefxnKitBoards && window.DefxnKitBoards.board && window.DefxnKitBoards.board('05'); return b ? b.items.map(function (x) { return x.id; }) : null; } });
    }).then(function (k) {
      var g = k.gridView();
      world.views.kit = { aim: g.aim, elev: g.elev, yaw: g.yaw, tilt: g.tilt, back: g.back, fit: g.fit, dist: 0 };   /* the Kit's grid camera, as a WVIEW record would hold it */
      kit = k; host.kit = k.api;
      window.dispatchEvent(new CustomEvent('ark:kit-ready'));
      return k;
    });
    return kitLoad;
  }
  /* the mesh pass for the parts the chain views draw as glass and satin (world2-pieces.mjs): its module and the baked room are fetched with the group; a browser that
     cannot read either draws those parts in the lit program as before */
  var piecesMod = null, piecesLoad = null;
  function fetchPieces() {
    if (!piecesLoad) piecesLoad = loadPieces();
    return piecesLoad;
  }
  function loadPieces() {
    return Promise.all([import('/fxn-3d/js/render/world2-mesh.mjs'), import('./world2-pieces.mjs')]).then(function (m) {
      return m[0].fetchEnvironment().then(function (env) { return env; }, function () { return null; }).then(function (env) { piecesMod = m[1].createPieces(R, m[0], env); R.setPieces(piecesMod); return piecesMod; });
    }).catch(function (e) { if (window.console) console.warn('[world2] the mesh pass did not start (' + e.message + '); record tiles are lit without a clear coat'); return null; });
  }
  /* a rig view's group: its records, its blob, its words, the badge's mesh and the mesh pass, read once and mounted on the stage. The five identity steps are one group (`id`, fetched with
     any of them); each how-it-works view is a group of its own, named by the view. */
  function loadId(v) {
    if (stage.rigFor(v)) return Promise.resolve(true);
    var g = stage.groupOf(v);
    return fetchGroup(world, v).then(function () {
      var fr = world.frames[g], nm = world.stage.names[g];
      if (!fr || !nm) throw new Error('the ' + g + ' group names no blob or no words');
      return Promise.all([fetchBlob(fr.cid), fetchLines(nm.cid), fetchPieces(), import('/fxn-3d/js/render/world2-mesh.mjs')]);
    }).then(function (got) {
      var shape = world.stage.shape, names = (world.parts[g] || []).map(function (p) { return p.part; }).filter(function (n) { return n in shape; });
      return Promise.all(names.map(function (n) { return got[3].fetchMesh(shape[n].cid); })).then(function (list) {
        var meshes = {}; names.forEach(function (n, i) { meshes[n] = list[i]; });
        stage.mountId(got[0], got[1], got[2], meshes, g);
        return true;
      });
    });
  }
  function loadDyn() {
    if (!dynMount) dynMount = fetchDyn().then(function (got) {
      if (!stage.dyn) { stage.mountDyn(got[0], got[1], got[2]); }
      return true;
    });
    return dynMount;
  }
  var loading = null, mountedRig = false;
  function warmGroups() {
    var jobs = [function () { return loadDyn(); }, function () { return loadId('idstart'); }, function () { return loadId('resolve'); }];
    function next() {
      var job = jobs.shift(); if (!job || !stage) return;
      var run = function () { Promise.resolve().then(job).then(function () { later(); }, function () { later(); }); };
      (window.requestIdleCallback || function (f) { setTimeout(f, 200); })(run, { timeout: 4000 });
    }
    function later() { setTimeout(next, 150); }
    setTimeout(next, 2500);
  }
  /* the auth group: its records, its blob, its words, the panels' meshes and the mesh pass, read once, and mounted on the stage */
  function loadRig() {
    if (stage.rig || mountedRig) return Promise.resolve(true);
    return fetchGroup(world, 'auth').then(function () {
      var fr = world.frames.rig, nm = world.stage.names.auth;
      if (!fr || !nm) throw new Error('the auth group names no blob or no words');
      return Promise.all([fetchBlob(fr.cid), fetchLines(nm.cid), fetchPieces(), import('/fxn-3d/js/render/world2-mesh.mjs')]);
    }).then(function (got) {
      var shape = world.stage.shape, names = Object.keys(shape);
      return Promise.all(names.map(function (n) { return got[3].fetchMesh(shape[n].cid); })).then(function (list) {
        var meshes = {}; names.forEach(function (n, i) { meshes[n] = list[i]; });
        stage.mountRig(got[0], got[1], got[2], meshes, cardFrame);
        return true;
      });
    });
  }
  /* the card as it stands, for the parts that are written in its own units (the glow, the loose pieces): its centre, its lean and its size, from the channels
     poseOf() reads (lift, tip, build), and the camera's turn, which the card follows */
  function cardFrame() {
    var place = cardPlace; if (!place || !stage) return null;
    var lift = stage.value('auth', 'lift'), tip = stage.value('auth', 'tip'), build = stage.value('auth', 'build'), RH = place.height / 1.32, k = .4 + .6 * build;
    var rx = -tip * .22, ry = tip * .1, rz = -tip * .32, cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
    var R3 = [cy * cz, cx * sz + sx * sy * cz, sx * sz - cx * sy * cz, -cy * sz, cx * cz - sx * sy * sz, sx * cz + cx * sy * sz, sy, -sx * cy, cx * cy];
    var yc = Math.cos(drawnYaw), ys = Math.sin(drawnYaw), Ry = [yc, 0, -ys, 0, 1, 0, ys, 0, yc], rot = new Array(9);
    for (var col = 0; col < 3; col++) for (var row = 0; row < 3; row++) { var t = 0; for (var q = 0; q < 3; q++) t += Ry[row + 3 * q] * R3[q + 3 * col]; rot[row + 3 * col] = t; }
    return { rot: rot, k: k, c: [place.x, place.y + (lift - tip * .5) * RH * .3, place.z] };
  }
  var cardPlace = null;
  function fly(key, again) {
    if (!host.ready) { pending = key; return; }
    if (!ArkUI.pageCatalog[key]) return;
    if (flown === null && key === 'zero' && toIntro) return;
    /* a view of the chain group needs its records before the camera knows where to go */
    if (!stage.dyn && stage.FAMILY.has(viewFor(key))) {
      if (loading !== key) { loading = key; loadDyn().then(function () { loading = null; fly(key); }, function (e) { loading = null; if (window.console) console.warn('[world2] the chain views did not load (' + e.message + '); the camera stays where it is'); }); }
      return;
    }
    /* the Kit needs its records, shapes and words before the camera comes (world2-kit.mjs): the same fetch-once; if they cannot load, /kit keeps the calm world */
    if (viewFor(key) === 'kit' && kit === null) {
      if (loading !== key) { loading = key; loadKit().then(function () { loading = null; fly(key); }, function (e) { loading = null; kit = false; if (window.console) console.warn('[world2] the Kit did not load (' + e.message + '); /kit shows the calm world'); fly(key); }); }
      return;
    }
    /* the auth view needs its rows (the glow, rings, cubes and panels) before the camera comes: the same fetch-once as the chain group */
    if (viewFor(key) === 'auth' && !stage.rig) {
      if (loading !== key) { loading = key; loadRig().then(function () { loading = null; fly(key); }, function (e) { loading = null; if (window.console) console.warn('[world2] the auth stage did not load (' + e.message + '); the card stands alone'); mountedRig = true; fly(key); }); }
      return;
    }
    /* the identity steps need their rows (and the chain group's page slab) before the camera comes */
    if (stage.IDV.has(viewFor(key)) && !stage.rigFor(viewFor(key))) {
      if (loading !== key) { loading = key; loadId(viewFor(key)).then(function () { loading = null; fly(key); }, function (e) { loading = null; if (window.console) console.warn('[world2] the identity steps did not load (' + e.message + '); the camera stays where it is'); }); }
      return;
    }
    var first = flown === null;
    if (!again) { cur = { key: key }; current = carried || {}; carried = null; }
    if (kit && viewFor(key) === 'kit') kit.set(current);   /* the page's choice made before the camera came */
    var vname = viewFor(key), wasView = flown === null ? null : viewFor(flown).replace(/tall$/, '');
    var t = target(vname), dur, words;
    measureSlab();
    if (first) {
      /* the intro's arrival is a WCAM record: the rest pose times its first key, then the sampler glides it in (chains-scene.js WELCOME) */
      var arrive = t.view.indexOf('intro') === 0 && !reduced() ? stage.arrival('intro') : null;
      if (arrive) {
        /* the camera is placed at the far pose first, then glides in: the words come in as it settles */
        cam = { aim: t.aim.slice(), dist: t.dist * arrive.from.dist, elev: t.elev + arrive.from.elev, yaw: t.yaw + arrive.from.yaw, tilt: t.tilt };
        dur = flyTo(t, arrive.dur, null); words = dur * arrive.words;
      } else { dur = flyTo(t, 0, null); words = 0; }
      if (wantBuild()) stage.startBuild(performance.now());
    } else {
      /* a flight's length follows the camera's travel, scaled by the motion knob (chains-scene.js api.to) */
      var travel = Math.hypot(t.aim[0] - cam.aim[0], t.aim[1] - cam.aim[1], t.aim[2] - cam.aim[2]), zoom = Math.abs(Math.log(t.dist / cam.dist));
      var ms = Math.min(1700, Math.max(900, 900 + travel * 40 + zoom * 260)) * motion().flight;
      /* entering your chain gets room for its story (chains-scene.js: ENTER, 1800 ms) */
      if (stage.dyn && RING_VIEWS[vname] && !RING_VIEWS[wasView]) ms = 1800 * motion().flight;
      dur = flyTo(t, ms, null); words = dur * .35;
      /* the words wait for the page to open out of its tile, or for the card to widen (chains-scene.js api.to) */
      if (stage.dyn && (RING_VIEWS[vname] || stage.IDV.has(vname)) || vname === 'ring') {
        var pf = stage.value('flight', 'p'), pt = stage.setOf(vname === 'ring' ? 'ring' : vname, 'p', vname === 'ring' ? ringIndex() : 0), sf = stage.value('flight', 's'), st_ = stage.setOf(vname, 's');
        var pw = vname === 'chain' ? .45 : .35;
        words = dur * (st_ > .5 && sf < .5 ? .7 : pt > pf + .5 ? pw + .45 * (1 - pw) : pt > .99 && pf > .99 ? .4 : .35);
      }
    }
    var was = wasView;
    flown = key;
    enterView(t.view, was, { dur: dur, sel: recIndex(current.r), aspect: t.aspect, ring: vname === 'ring' ? ringIndex() : 0, first: first || again });
    showCard(t.view);
    if (first) requestAnimationFrame(function () { requestAnimationFrame(function () { layer.dataset.flown = '1'; }); });
    var el = pageEl(key);
    if (el) el.dataset.worldWordsAt = String(performance.now() + words);
  }
  host.fly = fly;
  var RING_VIEWS = { chain: 1, record: 1, links: 1, open: 1 };

  /* ---------- the card (world2-mesh.mjs, MESH.md): fetched once, drawn only on the view that carries it ---------- */
  var meshMod = null, cards = {}, cardOn = null;
  /* the card's pose from its view's channels (auth-stage.js pose(): lift, tip, build): it floats (lift - tip x .5) x RH x .3 above its rest, leans over
     by tip, and grows from .4 to 1 with build. The rest pose is the model matrix; this turns it about the card's own centre, so the rest is unchanged. */
  function poseOf(view, m, place) {
    if (!stage || view !== 'auth') return m;
    var lift = stage.value(view, 'lift'), tip = stage.value(view, 'tip'), build = stage.value(view, 'build'), RH = place.height / 1.32;
    var k = .4 + .6 * build, rx = -tip * .22, ry = tip * .1, rz = -tip * .32;
    var cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
    /* R = Rx Ry Rz (Three.js Euler XYZ), applied in the card's local frame: M' = T(lift) x M x R x scale(k) */
    var R3 = [cy * cz, cx * sz + sx * sy * cz, sx * sz - cx * sy * cz, -cy * sz, cx * cz - sx * sy * sz, sx * cz + cx * sy * sz, sy, -sx * cy, cx * cy];
    var out = new Float32Array(16);
    for (var c = 0; c < 3; c++) for (var r = 0; r < 3; r++) out[c * 4 + r] = k * (m[0 * 4 + r] * R3[c * 3] + m[1 * 4 + r] * R3[c * 3 + 1] + m[2 * 4 + r] * R3[c * 3 + 2]);
    out[12] = m[12]; out[13] = m[13] + (lift - tip * .5) * RH * .3; out[14] = m[14]; out[15] = 1;
    return out;
  }
  function showCard(view) {
    var base = baseView(view);
    /* a view with a frame of its own is the network; one with a camera but no frame may carry a mesh (auth) */
    if (!world.views[base] || world.frames[base] || stage.FAMILY.has(base) || /^ring\d+$/.test(base)) { cardOn = null; R.setCard(null); return; }
    cardOn = base;
    if (!(base in cards)) {
      cards[base] = (meshMod ? Promise.resolve(meshMod) : import('/fxn-3d/js/render/world2-mesh.mjs').then(function (m) { meshMod = m; return m; }))
        .then(function (m) { return m.fetchCard(base); })
        .then(function (card) {
          var mount = meshMod.mountCard(R.gl, card);
          /* the pose of the view's channels goes in as the draw's own model matrix (world2-mesh.mjs draw opts.model), so the renderer's draw is not touched */
          var posed = function (yaw) { return poseOf(base, meshMod.modelMatrix(mount.mesh, mount.place, yaw), mount.place); };
          return { draw: function (proj, vw, eye, light, o) { return mount.draw(proj, vw, eye, light, Object.assign({}, o, { model: posed(o && o.yaw) })); }, place: mount.place, mesh: mount.mesh, upload: mount.upload, stats: mount.stats, model: posed };
        })
        .catch(function (e) { if (window.console) console.warn('[world2] no card for view ' + base + ' (' + e.message + ')'); return null; });
    }
    cards[base].then(function (c) { if (c && base === 'auth') { cardPlace = c.place; if (stage.rig) stage.refresh(); } if (cardOn === base) { R.setCard(c); redraw(); } });
  }
  router.onMount(function (el, key) { if (key !== flown) fly(key); });
  window.addEventListener('ark:route-ready', function () { var key = state.get().page; if (key !== flown) fly(key); });

  /* ---------- the fallback: as the Three.js host, the particle relief runs instead ---------- */
  function fail(why) {
    host.failed = true; root.dataset.world = 'off';
    if (layer.parentNode) layer.remove();
    Object.keys(layers).forEach(function (v) { var l = layers[v]; if (l && l.parentNode) l.remove(); });
    if (window.console) console.warn('[world2] the grammar world is off (' + why + '); the particle relief runs instead');
    var relief = document.createElement('script'); relief.src = (location.protocol === 'file:' ? '' : '/') + 'js/zero-webgl.js?v=' + VERSION; document.head.appendChild(relief);
  }
})();

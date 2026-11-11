/* THE STAGE: the site's one 3D surface, above the routes. Layer: app (the site).
   Design: docs/design/space/p05-upgrade/MOTION.md ("Continuity", "Stage API"), cut down 2026-11-11 when the home's ring menu left the site.

   Why it exists. js/ark/page-router.js removes the outgoing page when a navigation ends, so anything inside a page dies with it. The
   hero's portal is a live fxn-3d frame and takes seconds to draw, so it lives here and is never removed. This element is a child of
   #scene after the persistent layer and before the outlet (css/motion.css .site-stage): the pages paint over it and it paints over the
   world canvas.

   What it holds. Up to three site-view frames (fxn-3d world/site-view/index.html): `portal` (Portal 101, the home hero, built once and
   kept), `topic` (the shown topic object) and `next` (the one loading hidden for the cut). One view element holds them all; a topic
   page sets its transform once so the object's measured box fills the page's object slot (the contract with the art director: centre x
   70%, y 48%, height 52% of the viewport, width equal to the height).

   There is no flight. A page change is a plain navigation: a topic page asks open(), the object appears in its slot, and leaving the
   page drops it. The emblem-on-a-chain flight from a ring stone into a topic page (handoff, back, the travel streak) was removed with
   the ring menu; it is saved in /Volumes/PortableSSD/archive/site-ring-menu-2026-11-11/. The pages never make iframes: they call this.

   The MAIN object, never the emblem (owner, 2026-11-11: "You left the icons and you took the main objects of the clickable pages").
   A topic document holds two things: the topic's main object (its loop, LOOP_RANGE) and the small emblem that used to fly in from
   the ring (frame 0 and HANDOVER, then docked on the object with a chain). open() asks site-view for `?pose=object`: the first loop
   frame, the emblem and chain left out, the whole object measured. The first cut of this file after the removal still asked for
   `?pose=merge` (frame 0: the emblem alone, the object hidden) and fitted the EMBLEM's box into the slot. */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  /* THIS FILE RUNS BEFORE THE SHELL (2026-11-11, speed lane 1; layer: app). index.html loads it as its own script after js/loader-plaza.js.
     The stage is window.ArkStage: js/ark/runtime.js makes a new ArkUI when the shell arrives, so js/ark/stage-attach.js (in the shell's list) then
     names it ArkUI.stage, the name the pages use. Nothing here reads ArkUI before a route is up.
     IT MAKES NO FRAME BY ITSELF (2026-11-11, speed lane 1C). For one cut this file made the home's portal frame the moment it ran, before the
     shell. Measured on the build node behind Caddy (5 cold loads a cell): the frame was first asked at 175 ms instead of 371, but 206 of the
     view's files (688 KB) then went down the line ahead of the shell's chunks, and the home's words read at 848 ms instead of 600 (cable) and at
     4,563 ms instead of 2,200 (slow 4G); the 3D's first picture came no sooner on cable. Caddy's HTTP/2 does not order answers by priority, so
     the order the page asks in is the only lever. The order now: the words (markup in index.html), then the shell's scripts, then the frame,
     made by warm() when js/main.js says the shell is up. */
  /* WHERE THE 3D FRAME COMES FROM (owner ruling 2026-11-11: the live 3D ships with the site bundle; audit F01). Never the host name: the question
     is "is the 3D frame there".
     0. THE PACK SAYS SO: a packed shell that ships the view carries <meta name="defxn-view" content="bundle"> (scripts/pack-fxn-site.mjs writes it
        only when it copied the view). Then the bundle is the source at once and no HEAD is asked.
     1. THE BUNDLE: the site's own copy of the view, same origin, at BUNDLE_VIEW. scripts/pack-fxn-site.mjs ships it when the 3D repo has built one.
        A deployed site allows frames from itself only (the pack writes frame-src 'self'), so this is the one source it can use.
     2. THE STUDIO: the fxn-3d edit server on this machine (STUDIO), for local development. It is used only when the bundle does not answer AND this
        document's own CSP names it as a frame source, which only the source index.html does.
     3. Neither: there is no 3D on this host. `ready` resolves false, and each page says so in its own place (the home keeps its words, a topic page
        draws its refusal in the slot).
     `ready` is asked once per document. A frame's src is set only after it answers, so the pages call showPortal and open as before */
  var STUDIO = 'http://127.0.0.1:3440', STUDIO_VIEW = STUDIO + '/world/site-view/index.html', BUNDLE_VIEW = '/fxn-3d/view/index.html';
  var VIEW = null, ORIGIN = null, source = null;
  function studioAllowed() {
    var meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]'), m = meta && /frame-src([^;]*)/.exec(meta.content || '');
    return !meta || !!(m && m[1].split(/\s+/).indexOf(STUDIO) >= 0);   /* a document with no CSP of its own (a test page) may frame anything */
  }
  function useStudio() { if (!studioAllowed()) return false; VIEW = STUDIO_VIEW; ORIGIN = STUDIO; source = 'studio'; return true; }
  function useBundle() { VIEW = location.origin + BUNDLE_VIEW; ORIGIN = location.origin; source = 'bundle'; return true; }
  var packed = !!document.querySelector('meta[name="defxn-view"][content="bundle"]');
  var ready = packed ? Promise.resolve(useBundle()) : (/^https?:$/.test(location.protocol) && window.fetch ? fetch(BUNDLE_VIEW, { method: 'HEAD', cache: 'no-store' }).then(function (r) {
    /* the view answers when the path is a page of its own: 200, HTML, not a redirect. (A host that answered every unknown .html path with the
       shell and 200 would pass this check wrongly; the .fxn site server and serve-site.mjs answer 404 there) */
    if (r.ok && !r.redirected && /text\/html/.test(r.headers.get('content-type') || '')) return useBundle();
    return useStudio();
  }, useStudio) : Promise.resolve(useStudio()));
  var root = document.documentElement;
  var RATE = 24;
  function still() { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function ms(frames) { return still() ? 0 : Math.round(frames / RATE * 1000); }

  /* colours: a theme token is an HSL triple ("180 50% 4.7%"); site-view clears its picture to sRGB bytes ("6,18,18") */
  function rgbOf(hsl) {
    var m = String(hsl || '').trim().match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/); if (!m) return '';
    var h = +m[1] / 360, s = +m[2] / 100, l = +m[3] / 100;
    function f(n) { var k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }
    return f(0) + ',' + f(8) + ',' + f(4);
  }
  /* the portal's ground is a token on .intro-world (css/world-pages.css --portal-ground); a hidden probe of that class reads it before the page is mounted */
  function groundHSL() {
    var probe = document.querySelector('.intro-world'), made = !probe;
    if (made) { probe = document.createElement('section'); probe.className = 'intro-world'; probe.hidden = true; document.body.appendChild(probe); }
    var v = getComputedStyle(probe).getPropertyValue('--portal-ground').trim();
    if (made) probe.remove();
    return v || '180 50% 4.7%';
  }
  /* the page canvas as the topic page itself computes it (a page may set --canvas to its own ground), else the root's */
  function canvasHSL() {
    var pg = document.querySelector('.topic-page, .learn-page'), made = !pg;
    /* with no page mounted yet, a hidden probe of the topic page's class reads its ground (as groundHSL does) */
    if (made) { pg = document.createElement('section'); pg.className = 'topic-page'; pg.hidden = true; document.body.appendChild(pg); }
    var cs = getComputedStyle(pg);
    /* the world pages set their ground as --portal-ground and point --canvas at it; the plain token is read first (a var() chain may come back unsubstituted) */
    var v = cs.getPropertyValue('--portal-ground').trim() || cs.getPropertyValue('--canvas').trim();
    if (made) pg.remove();
    if (!rgbOf(v)) v = getComputedStyle(root).getPropertyValue('--canvas').trim();
    return rgbOf(v) ? v : '18 7.5% 3.6%';
  }
  function groundRGB() { return rgbOf(groundHSL()) || '6,18,18'; }
  function canvasRGB() { return rgbOf(canvasHSL()) || '10,9,8'; }

  var el = null, view = null, frames = { portal: null, topic: null, next: null }, listeners = {}, last = { ring: null, segments: null };
  /* warm: the portal frame was made when the shell came up (warm() below) and no page has asked for it yet. kept: what the warm frame said
     meanwhile, for the page that asks for it */
  var state = { current: null, object: null, placed: null, portalDead: false, warm: false }, kept = [];
  function make() {
    el = document.createElement('div'); el.className = 'site-stage'; el.setAttribute('aria-hidden', 'true');
    view = document.createElement('div'); view.className = 'site-stage-view'; el.appendChild(view);
  }
  function mount() {
    if (el) return el;
    var scene = document.getElementById('scene') || document.body, persistent = scene.querySelector('[data-ark-layer="persistent"]');
    /* right after the persistent layer, inside whatever holds it (the scene's wrapper), so the stage paints over the world canvas (inserted
       before that layer by world2-host) and under the outlet, which follows it */
    var into = persistent && persistent.parentNode ? persistent.parentNode : scene, before = persistent && persistent.parentNode ? persistent.nextSibling : scene.firstChild;
    make();
    into.insertBefore(el, before);
    return el;
  }
  function makeFrame(name) {
    var f = document.createElement('iframe'); f.className = 'site-stage-frame'; f.title = ''; f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
    f.dataset.stageFrame = name; f._drawn = false; f._box = null; f._waiters = []; view.appendChild(f); return f;
  }
  function drop(name) { var f = frames[name]; if (f) { f.remove(); frames[name] = null; } }
  function nameOf(win) { return Object.keys(frames).filter(function (k) { return frames[k] && frames[k].contentWindow === win; })[0] || null; }
  function post(msg, name) { var f = frames[name || state.current]; if (f && f.contentWindow && ORIGIN) f.contentWindow.postMessage(msg, ORIGIN); }
  /* a frame's address is set once the source is known (ready); a frame dropped or replaced meanwhile is left alone */
  function aim(f, query) { ready.then(function (ok) { if (ok && f.isConnected && !f.getAttribute('src')) f.src = VIEW + query; }); }
  function emit(type, data, from) {
    /* what a warm portal frame says before a page has asked for it is kept and said again to that page (showPortal). Not the three kinds a late
       listener already gets: segments and ring (on() replays them) and the load counts (loads()) */
    if (state.warm && from === 'portal' && type !== 'segments' && type !== 'ring' && type !== 'load') kept.push([type, data]);
    (listeners[type] || []).slice().forEach(function (fn) { try { fn(data, from); } catch (e) { if (window.console) console.error('[stage] listener failed', type, e); } });
  }
  function whenDrawn(f) {
    if (!f) return Promise.resolve(false);
    if (f._drawn) return Promise.resolve(true);
    return new Promise(function (resolve) { f._waiters.push(resolve); setTimeout(function () { resolve(f._drawn); }, 20000); });
  }
  addEventListener('message', function (e) {
    if (!ORIGIN || e.origin !== ORIGIN || !e.data || !e.data.siteView) return;
    var from = nameOf(e.source); if (!from) return;
    var d = e.data, f = frames[from];
    if (d.segments) { last.segments = d; emit('segments', d, from); }
    if (d.ring) { if (from === 'portal') last.ring = d.ring; emit('ring', d.ring, from); }
    /* the frame measures its object in its own px (the view at scale 1); listeners get where that box IS on screen, through the view's transform */
    if (d.box) {
      var first = !f._box; f._box = d.box;
      /* the first measure after a placement made from the default box: the view settles onto the measured one (the studio drew late). So does the answer to
         a placement's own measure when the object stands more than the contract's 8 px off the slot (a resize: the frame's px changed under the old box).
         That second placement asks for no measure, so the two never answer each other for good while the object's loop moves its box by a pixel */
      var asked = f._asked; f._asked = false;
      if (state.placed && from === state.current && from !== 'portal' && (first ? !sameRect(onScreen(d.box), state.placed) : asked && miss(onScreen(d.box), state.placed) > 8)) place(state.placed, { quiet: true });
      emit('box', onScreen(d.box), from);
    }
    /* a measure the frame could not make: it says why (site-view measure), and the reason is kept for debug() and written once to the console */
    if (d.nobox) { if (f._nobox !== d.nobox && window.console) console.warn('[stage] ' + from + ' (' + (f._object || PORTAL) + ') could not be measured: ' + d.nobox); f._nobox = d.nobox; }
    if (d.lost) { f._drawn = false; f.classList.remove('is-drawn'); if (from === 'portal') state.portalDead = true; hold(); emit('lost', d, from); }
    if (d.drawn) { f._drawn = true; f.classList.add('is-drawn'); if (from === 'portal') state.portalDead = false; hold(); var w = f._waiters; f._waiters = []; w.forEach(function (r) { r(true); }); emit('drawn', d, from); }
    if (d.built) emit('built', d, from);
    if (d.held) emit('held', d.held, from);
    /* THE LOAD COUNT (2026-11-11; fxn-3d world/site-view "THE LOAD COUNT"): { kind, done, total } for each thing a frame has really finished loading.
       The newest count of each kind is kept per frame (loads(name)), so a listener that comes late (js/loader-plaza.js loads before this file) misses none */
    if (d.load && d.load.kind) { (f._loads = f._loads || {})[d.load.kind] = { done: d.load.done, total: d.load.total }; emit('load', d.load, from); }
  });
  /* the world behind (js/world2/world2-host.mjs) draws nothing while a drawn frame shows, so the GPU carries one scene */
  function hold() {
    var f = state.current && frames[state.current], on = !!(f && f._drawn && root.hasAttribute('data-stage-on'));
    if (on === root.hasAttribute('data-world-held')) return;
    if (on) root.setAttribute('data-world-held', ''); else { root.removeAttribute('data-world-held'); dispatchEvent(new CustomEvent('ark-world-release')); }
  }
  function reveal(name) {
    Object.keys(frames).forEach(function (k) { if (frames[k]) frames[k].classList.toggle('is-shown', k === name); });
    state.current = name; root.setAttribute('data-stage-on', ''); hold();
  }
  function setBg(which) { mount(); el.style.setProperty('--stage-bg', which === 'ground' ? groundHSL() : canvasHSL()); }
  /* the object slot (the contract with the art director): centre x 70%, y 48% of the viewport, height 52% of its height, width equal to the height */
  function slot() { var W = innerWidth, H = innerHeight, h = Math.round(H * .52); return { x: Math.round(W * .70 - h / 2), y: Math.round(H * .48 - h / 2), w: h, h: h }; }
  /* where an object stands before site-view has measured it: the frame's centre, .62 of its height */
  function defaultBox() { var H = innerHeight, h = H * .62; return { x: innerWidth / 2 - h / 2, y: H / 2 - h / 2, w: h, h: h }; }
  /* a box in the frame's px mapped through the view's current transform (matrix(a, b, c, d, e, f)) to viewport px */
  function onScreen(box) {
    if (!view || !box) return box;
    var m = /matrix\(([^)]+)\)/.exec(getComputedStyle(view).transform || ''); if (!m) return box;
    var v = m[1].split(',').map(Number), s = v[0], tx = v[4], ty = v[5];
    return { x: Math.round(box.x * s + tx), y: Math.round(box.y * s + ty), w: Math.round(box.w * s), h: Math.round(box.h * s) };
  }
  function transformFor(rect, box) {
    if (!rect) return 'none';
    var s = Math.min(rect.w / box.w, rect.h / box.h), cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    return 'translate(' + (rect.x + rect.w / 2 - s * cx).toFixed(1) + 'px, ' + (rect.y + rect.h / 2 - s * cy).toFixed(1) + 'px) scale(' + s.toFixed(4) + ')';
  }
  function sameRect(a, b) { return !!(a && b && Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2 && Math.abs(a.w - b.w) < 2 && Math.abs(a.h - b.h) < 2); }
  /* how far a box stands from where it was placed, in px: its centre against the rectangle's centre, and its longer side against the side that fits
     (an object keeps its own proportions, so a wide one fills the slot's width and a tall one its height: the other side is never compared) */
  function miss(box, rect) {
    var s = Math.min(rect.w / box.w, rect.h / box.h);
    return Math.round(Math.max(Math.abs(box.x + box.w / 2 - rect.x - rect.w / 2), Math.abs(box.y + box.h / 2 - rect.y - rect.h / 2), Math.abs(box.w * s - box.w), Math.abs(box.h * s - box.h)));
  }
  /* set the view so the shown object's box fills `rect` (viewport px); null = the full view. At once: there is no glide any more. Resolves when set */
  function place(rect, opts) {
    mount(); opts = opts || {};
    var f = frames[state.current], box = opts.box || (f && f._box) || defaultBox();
    state.placed = rect || null;
    view.style.transform = transformFor(rect, box);
    /* a fresh measure, so the box event says where the object landed; the portal is never measured (its box is the whole ring) */
    if (rect && f && f._drawn && state.current === 'topic' && !opts.quiet) { f._asked = true; post({ measure: true }, 'topic'); }
    return Promise.resolve();
  }
  /* Portal 101 on the stage, the home hero. hold: 'PORTALREST' opens on the closed portal with no film; reload: a fresh frame even if one stands */
  var PORTAL = 'portal101';
  function portalFrame(hold) {
    var f = frames.portal = makeFrame('portal'); state.portalDead = false;
    /* the frame's name carries what it was asked to hold: the CSS that places and hides the portal frame reads it before the address is set */
    f.dataset.stageObject = PORTAL; f.dataset.stageHold = hold || '';
    aim(f, '?o=' + PORTAL + '&alone=1&bg=' + groundRGB() + (hold ? '&hold=' + hold : ''));
    return f;
  }
  /* THE WARM START: the home's portal frame, made when the shell is up (js/main.js calls this once, right after it has drawn the scene) and
     before the home's page has come: the page's own scripts are one more round trip away, and the frame need not wait for them. The hold is
     the one the load screen names (ArkPlazaHero.warmHold: set only on the home with motion on). The frame is made IN ITS PLACE, in the scene,
     shown exactly as showPortal() shows it (the stage laid out, the frame the shown one), so it has its size and its animation frames from
     the start; the first showPortal() with the same hold takes it over, and what it said meanwhile is said again to that page (kept).
     THERE IS NO HIDDEN HOLDER ANY MORE (2026-11-11, speed lane 1C). The cut before this made the frame before the scene existed, in a holder
     in <body> kept out of sight (visibility: hidden), and moved it into the scene later with Element.moveBefore. Nothing is parked and
     nothing is moved now, so the frame never lives anywhere but its final place, and a browser without moveBefore gets the warm start too */
  function warm() {
    var hero = window.ArkPlazaHero, hold = hero && hero.warmHold;
    if (!hold || el || frames.portal) return false;
    mount(); state.warm = true;
    portalFrame(hold); setBg('ground'); reveal('portal');
    return true;
  }
  function showPortal(opts) {
    mount(); opts = opts || {};
    /* a topic object still loading for a page the visitor has left is dropped, and a shown one goes: open() sees frames.next change and stops */
    drop('next'); drop('topic'); state.object = null; state.placed = null; view.style.transform = 'none';
    var f = frames.portal, said = kept, taken = state.warm && !!f && !state.portalDead && !opts.reload && f.dataset.stageHold === (opts.hold || '');
    /* a warm frame that was asked to hold something else than this page wants is not the page's frame: a new one is made */
    if (state.warm && !taken) { drop('portal'); f = null; }
    state.warm = false; kept = [];
    if (!f || state.portalDead || opts.reload) { drop('portal'); f = portalFrame(opts.hold); }
    setBg('ground'); reveal('portal');
    /* after the caller's own setup (its listeners stand before it asks), in the order the frame said them */
    if (taken && said.length) Promise.resolve().then(function () { if (frames.portal === f) said.forEach(function (m) { emit(m[0], m[1], 'portal'); }); });
    return whenDrawn(f);
  }
  function load(name, object, bg, pose) {
    var f = frames[name] = makeFrame(name); f._object = object; f.classList.add('is-loading');
    f.dataset.stageObject = object;
    aim(f, '?o=' + encodeURIComponent(object) + '&alone=1&pose=' + (pose || 'merge') + '&bg=' + bg);
    return f;
  }
  /* the next frame becomes the topic frame and shows; the frame it replaces goes */
  function cutToNext() {
    var f = frames.next; if (!f) return false;
    drop('topic'); frames.topic = f; frames.next = null; f.dataset.stageFrame = 'topic'; f.classList.remove('is-loading');
    state.object = f._object; reveal('topic'); return true;
  }
  /* a topic page's MAIN object: it appears in the page's slot, whole, on its own loop (site-view ?pose=object: no emblem, no chain, no HANDOVER, no
     flight). The box is measured as the frame says it has drawn; waiting for it (600 ms at most) places the object right the first time. A topic frame
     that already stands is only placed again */
  function open(object, opts) {
    mount(); opts = opts || {}; setBg('canvas');
    /* the home's portal does not linger behind a topic page while its object loads: the page shows on its own ground until the object is cut in */
    if (frames.portal) frames.portal.classList.remove('is-shown');
    var rect = opts.rect || opts.slot || slot();
    if (state.current === 'topic' && frames.topic && frames.topic._object === object) return place(rect).then(function () { return true; });
    if (!frames.next || frames.next._object !== object) { drop('next'); load('next', object, canvasRGB(), 'object'); }
    /* the stage is laid out while the object loads. On a fresh load of a topic page nothing had shown the stage yet, so it stood at display: none, the
       frame inside it was 0 x 0 and got no animation frames, and site-view (which answers `drawn` from one) never answered: the object joined only when
       whenDrawn gave up after 20 s, placed from no box at all (measured 2026-11-11, r6: canvas 1 x 1, no message in 11 s). The stage's own colour is the
       page's ground (setBg above), so the page looks the same with the stage under it */
    root.setAttribute('data-stage-on', '');
    var f = frames.next;
    function whenBox() { if (f._box) return Promise.resolve(); return new Promise(function (r) { var t = setTimeout(r, 600); var off = on('box', function (b, from) { if (frames[from] === f) { clearTimeout(t); off(); r(); } }); }); }
    return whenDrawn(f).then(function () { if (frames.next !== f) return false; return whenBox().then(function () { if (frames.next !== f) return false; cutToNext(); return place(rect).then(function () { return true; }); }); });
  }
  /* the stage steps aside on a page that does not stand on it (Learn, auth): the topic frames go, the portal frame waits */
  function off() { if (!el) return; drop('next'); drop('topic'); state.current = frames.portal ? 'portal' : null; root.removeAttribute('data-stage-on'); hold(); }
  addEventListener('ark:route-ready', function () {
    var r = window.ArkUI && ArkUI.pageRouter, page = r && r.active, entry = page && ArkUI.pageCatalog && ArkUI.pageCatalog[page];
    var module = entry && entry.module;
    if (module !== 'intro' && module !== 'topic') off();
  });
  function on(type, fn) {
    (listeners[type] = listeners[type] || []).push(fn);
    /* the replay comes after the caller's own setup has run (a page subscribes before it has made the elements the handler places), never inside on() */
    var replay = type === 'ring' ? last.ring : type === 'segments' ? last.segments : null;
    if (replay) Promise.resolve().then(function () { if ((listeners[type] || []).indexOf(fn) >= 0) fn(replay, 'portal'); });
    return function () { var l = listeners[type] || []; var i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); };
  }
  window.ArkStage = {
    /* ready: a promise of true when a 3D source answers (the bundle or the studio), false when this host has none. source: 'bundle', 'studio' or null */
    ready: ready, get source() { return source; }, ms: ms, still: still,
    /* origin: where the 3D frame comes from once `ready` has answered (the site's own origin in a bundle, the studio in local development), else null.
       A page that links into the studio builds its link from this and never types the studio's address. The built view holds the site's objects only:
       a studio page outside it (the game, world/portal/game.html) is not in the bundle, so such a link exists only when source is 'studio' */
    get origin() { return ORIGIN; },
    slot: slot, warm: warm, showPortal: showPortal, open: open, place: place, off: off, post: post, on: on, miss: miss,
    get current() { return state.current; }, get object() { return state.object; },
    /* a warm frame no page has asked for yet is not a portal the visitor has seen: the home then shows its first load, not a return */
    portal: function () { var p = state.warm ? null : frames.portal; return { exists: !!p, alive: !!(p && p._drawn && !state.portalDead) }; },
    box: function () { var f = frames[state.current]; return f ? f._box : null; },
    loads: function (name) { var f = frames[name || 'portal']; return (f && f._loads) || {}; },
    /* what the stage holds right now, for a probe or the console: never for a page's logic */
    debug: function () { return { current: state.current, object: state.object, placed: state.placed, warm: state.warm,
      frames: Object.keys(frames).map(function (k) { var f = frames[k]; return k + ':' + (f ? (f._object || PORTAL) + (f._drawn ? ' drawn' : ' loading') + (f._box ? '' : f._nobox ? ' no box: ' + f._nobox : ' not measured') : '-'); }) }; }
  };
})();

/* THE LOAD SCREEN (owner, 2026-11-11: "Starts empty, page loads one at a time smoothly, lazy load for insane smooth UX"; the approved nine-frame
   load board; fxn-3d docs/design/direction/portal-101/NOTES.md "The load board and the home hero"). Layer: app. Look: css/loader-plaza.css and the
   inline first-paint rules in index.html. It replaces the plaza gate of 2026-11-10 (two stills and the loader's own headline).

   What it is. The first paint is the empty ground: floor rings, floor lines, a low disc and an empty bar, drawn by index.html alone (no script, no
   picture, no font). This file then shows what has really loaded, and lets the plaza arrive one stop at a time.

   The flow on a fresh load of / or /intro:
   1. EMPTY. html.plaza-hold keeps the loader up. The bar is empty.
   2. LOADS. Each thing that finishes adds its share to the bar: the shell (html.shell-ready), and what the studio's frame reports through the stage
      (ArkUI.stage.on('load'): view, page, document, pack bytes, meshes, pictures; fxn-3d js/editor/log.mjs loadSay), then the frame's first drawn
      picture. Nothing is timed: with no finished load the bar does not move.
   3. LIVE. js/pages/intro.js holds the stage's portal frame on the same empty ground (portal101 LOADSTART) and says plaza-drawn. The drawn ground
      fades and the frame under it shows: one object, no cut.
   4. STOPS. The plaza comes in as stops (portal101 PLAZASTOPS: one per stone, two for the mark, one for the floor rings). playStop(n, of) plays one.
      A stop plays when the share of loads it stands for has landed, one at a time, in order: the next starts only when the last has held, and never
      sooner than its part of the sequence's time after it started (FEEL: calm when the 3D showed early, capped when the load was slow). Each held stop adds its share to the bar, so the bar is full only when nothing is left to wait for.
   5. DONE. With the last stop held the bar fades and the loader says plaza-open by itself. Nothing is pressed (owner ruling 2026-11-11: the one
      "Enter FXN" is the hero's own, js/pages/intro.js .intro-portal-enter; a key or a click during the load changes nothing).
   6. HERO. On plaza-open intro.js plays the load's end into the hero (HEROIN, or PORTALIN on a document without the stops) and answers
      plaza-assembled; the loader is done and the page's chrome and words come in.
   Reduced motion: no stops. The page under the loader is the settled hero (intro.js holds PORTALREST), and the loader cross-fades
   onto it in 0.4 s once the shell is up and the portal has drawn.
   No live scene (another route, no studio on this host, or the studio silent for WAIT_ALL): the loader cross-fades onto the page by itself.
   It runs once per document load. Loaded as a plain script after the loader's markup (the page's CSP allows no inline script). */
(function () {
  'use strict';
  var root = document.documentElement, L = document.getElementById('world-loader');
  /* THE HERO'S PLACES, in one place (2026-11-11, audit F05). Layer: app. This file runs before the first paint and js/pages/intro.js runs after the
     shell, and both must put the 3D on the same pixels, so the arithmetic lives here once (window.ArkPlazaHero) and intro.js calls it.
     hero(at, wordsH)  where the portal frame must move so the portal stands in its hero place. `at` is where the document's hero camera draws the
                       portal: its centre `ox` right of the frame's centre (or `x` as a share of the width) and `y` down the frame, its outer radius
                       `R`, each as a share of the drawn frame's height. Side by side: the centre goes to HERO.x of the width. Stacked (4:3 and
                       narrow views): the portal stands above the words, scaled to the room between HERO.top and the words.
     load(at, wordsH)  the load's place. Since portal101r113 the load camera itself frames the plaza on the right (LOAD_CAM aims left of the plaza),
                       so the frame and the drawn ground of the first paint stand exactly where hero() puts them and the lift into the hero moves
                       nothing in CSS. load() adds what only the load needs: `bar`, the load bar's place (small, under the plaza's centre, above the
                       dock), and `solid`, how far from the left the hero's words reach: the ground is faded out over that part, so no floor ring
                       runs under a word (0 when stacked: the words stand under the picture there).
     ground()          the plaza's ground in the load camera's frame, read off the first paint's own SVG (scripts/loader-ground.mjs draws it through
                       LOAD_CAM): the widest floor ring that lies inside the frame. Shares of the frame's height, from the frame's centre. */
  var PH = window.ArkPlazaHero = (function () {
    var HERO = { x: .65, top: 80, pad: 40 }, NOW = { ox: .224, y: .43, R: .288 }, kept = null;
    function stacked() { return innerWidth / innerHeight < 1.45 || innerWidth < 900; }
    function hero(at, wordsH) {
      var W = innerWidth, H = innerHeight, Hd = Math.min(H, W / 1.6), px = at.ox != null ? W / 2 + at.ox * Hd : at.x * W, py = H / 2 + (at.y - .5) * Hd, R = at.R * Hd;
      if (!stacked()) return { dx: Math.round(HERO.x * W - px), dy: 0, k: 1, stack: false, sx: HERO.x * W, sy: py, sR: R };
      var low = H - HERO.pad - (wordsH || 280) - 18, D = Math.max(120, Math.min(2 * R, low - HERO.top, W - 32)), k = D / (2 * R);
      return { dx: Math.round((W / 2 - px) * k), dy: Math.round((HERO.top + low) / 2 - H / 2 - (py - H / 2) * k), k: +k.toFixed(4), stack: true, low: low, sx: W / 2, sy: (HERO.top + low) / 2, sR: D / 2 };
    }
    function ground() {
      if (kept) return kept;
      var svg = L && L.querySelector('svg.plaza-ground'), vb = svg && svg.viewBox && svg.viewBox.baseVal, best = null;
      if (vb && vb.height > 0) Array.prototype.forEach.call(svg.querySelectorAll('.r path'), function (p) {
        var b; try { b = p.getBBox(); } catch (e) { return; }
        if (b.width / 2 < vb.width / 2 && (!best || b.width > best.width)) best = b;
      });
      /* with no drawn ground to read (a bare document), the ring of portal101r112's load camera */
      kept = best ? { ox: (best.x + best.width / 2) / vb.height, oy: (best.y + best.height / 2) / vb.height, rx: best.width / 2 / vb.height, ry: best.height / 2 / vb.height } : { ox: 0, oy: .195, rx: .635, ry: .293 };
      return kept;
    }
    /* the dock's top edge on the home (css/world-pages.css .intro-world --dock-h), read from the sheet so the number is written once */
    function dockTop() {
      var probe = document.createElement('section'); probe.className = 'intro-world'; probe.hidden = true; (document.body || root).appendChild(probe);
      var h = parseFloat(getComputedStyle(probe).getPropertyValue('--dock-h')); probe.remove();
      return innerHeight - (h > 0 ? h : 191);
    }
    /* the right edge of the hero's words column (css/world-pages.css .intro-portal-words), read from the sheet through a hidden copy of the two boxes */
    function wordsRight() {
      var pg = document.createElement('section'), w = document.createElement('div');
      pg.className = 'intro-world'; pg.style.visibility = 'hidden'; w.className = 'intro-portal-words'; pg.appendChild(w); (document.body || root).appendChild(pg);
      var r = w.getBoundingClientRect().right; pg.remove();
      return r > 0 ? Math.round(r) : Math.round(innerWidth * .38);
    }
    function load(at, wordsH) {
      var W = innerWidth, H = innerHeight, Hd = Math.min(H, W / 1.6), h = hero(at, wordsH), g = ground();
      /* a point of the frame on screen, through the hero's transform (about the frame's centre) */
      var cx = W / 2 + h.k * g.ox * Hd + h.dx, bottom = H / 2 + h.k * (g.oy + g.ry) * Hd + h.dy;
      /* floor: the dock's top edge; the ground is not drawn below it, so no floor ring crosses the status bar or the chips during the load */
      return { dx: h.dx, dy: h.dy, k: h.k, stack: h.stack, low: h.low, solid: h.stack ? 0 : wordsRight(), floor: h.stack ? H : dockTop(),
        bar: { x: Math.round(cx), y: Math.round(Math.min(bottom + 14, (h.stack ? h.low : dockTop()) - 14)), w: Math.round(.18 * Hd) } };
    }
    /* LOAD_HOLD: what the portal frame is asked to hold under the load screen (the empty ground, else the plaza at rest on a document without the
       load stops). One name for the two files that ask for it: js/ark/stage.js starts the frame early with it (warmHold, set below when this load
       will show the portal) and js/pages/intro.js asks the stage for the same frame, which must be the same address */
    return { HERO: HERO, NOW: NOW, LOAD_HOLD: 'LOADSTART.PLAZAREST', stacked: stacked, hero: hero, load: load, ground: ground };
  })();
  if (!L) return;
  L.classList.add('plaza'); root.classList.add('plaza-hold');
  var still = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var home = /^\/(?:intro\/?)?$/.test(location.pathname);
  /* THE HOME'S FIRST PAINT (audit F05): the drawn ground stands where the live frame will (the hero's transform), its left part fades out under the
     hero's words, and the bar is small, under the plaza (css/loader-plaza.css .hero-load). Placed again on a resize while the loader is up */
  function placeLoad(at, wordsH) {
    var t = PH.load(at && at.R ? at : PH.NOW, wordsH > 0 ? wordsH : 0);
    L.style.setProperty('--load-t', 'translate(' + t.dx + 'px, ' + t.dy + 'px) scale(' + t.k + ')');
    L.style.setProperty('--load-solid', t.solid + 'px'); L.style.setProperty('--load-fade', t.stack ? '0px' : '120px'); L.style.setProperty('--load-floor', t.floor + 'px');
    L.style.setProperty('--load-bar-x', t.bar.x + 'px'); L.style.setProperty('--load-bar-y', t.bar.y + 'px'); L.style.setProperty('--load-bar-w', t.bar.w + 'px');
  }
  /* intro.js places the ground again once it knows the words' height and the document's own portal place (PH.placeLoad) */
  if (home) { L.classList.add('hero-load'); placeLoad(); PH.placeLoad = placeLoad; addEventListener('resize', function () { if (!finished) placeLoad(); }); }
  /* THE HOME'S WORDS SHOW NOW (2026-11-11, speed lane 1C; audit F05). index.html carries the hero's words as markup (#hero-first, written by the
     build from the manifest); this script, the first one the page runs after its sheets, shows them on the home, over the drawn ground, before any
     shell script has been asked for. Stacked or side by side is decided here as js/pages/intro.js decides it for the page (PH.stacked), again on a
     resize for as long as the section stands. intro.js moves the words into its page and takes the section away (css/loader-plaza.css #hero-first).
     On another route the section is taken out of the document here, so that page never holds a second, hidden h1 (a reader of "the page's
     headline", a screen reader or a test, finds the page's own); the home's page then builds its words itself when the visitor goes there */
  var first = document.getElementById('hero-first');
  if (first && !home) { first.remove(); first = null; }
  if (first) {
    var firstPlace = function () { if (first.isConnected) first.classList.toggle('hero-stack', PH.stacked()); else removeEventListener('resize', firstPlace); };
    firstPlace(); first.hidden = false; first.classList.add('is-on'); addEventListener('resize', firstPlace);
  }
  /* the home's load plays wherever the 3D frame is there. Whether it is, the stage says once it has loaded (ArkUI.stage.ready: the site's bundled
     view, or the studio in local development; never the host name). has3d: null until it answers */
  var want3d = home && !still, has3d = null;
  /* the hold the stage (js/ark/stage.js) makes the portal's frame with when the shell is up (ArkStage.warm, called by js/main.js), before the
     home's page has come. Not sooner: the frame's files would go down the line ahead of the shell's scripts */
  if (want3d) PH.warmHold = PH.LOAD_HOLD;
  var t0 = performance.now();
  /* ceilings, in ms: the whole load from the first paint, the pressed open's held answer, and one stop's held answer */
  var WAIT_ALL = 22000, WAIT_BUILT = 6000, WAIT_STOP = 3000;
  /* THE LOAD'S FEEL, in one place (2026-11-11). Measured before this: every load had landed before the 3D showed, so the empty ground stood for
     3.4 s (warm) to 7.7 s (cold) and then all fifteen stops ran back to back. Now the stops share one time budget, and each stop gets an equal part
     of it: a stop never starts sooner than its part after the one before it started, and it plays at the rate that fills its part.
     CALM_MS  the whole sequence when the 3D showed early (within EARLY_MS of the first paint): one stone at a time, calmly.
     CAP_MS   the whole sequence when the load was slow: a slow load is not made slower.
     Between the two, every millisecond the 3D came later than EARLY_MS is taken off the sequence, down to CAP_MS.
     RATE_MIN and RATE_MAX bound a stop's frame rate (the film's own rate is 24) */
  var FEEL = { CALM_MS: 5200, CAP_MS: 2500, EARLY_MS: 1500, RATE_MIN: 24, RATE_MAX: 90, LAG_MS: 40 }, seqMs = FEEL.CAP_MS;
  function stopMs() { return seqMs / of; }
  /* THE SEQUENCE KEEPS ITS OWN CLOCK (2026-11-11, speed lane 1). Measured on the build node (cold, 5 loads): the 15 stops took about 316 ms each
     against a part of 275, so the sequence ran 0.6 s over its budget. Cause: a stop played at the rate that fills its whole part, and its `held`
     answer comes after that (the frame waits two animation frames for the stones' places, then the message crosses), and the next stop waited for
     that answer. Each stop paid the answer's delay on top of its part.
     Now stop n is due at seqStart + n parts, and it plays at the rate that ends it `lag` before the next one is due, so the answer lands on the
     clock. `lag` is measured: how much later than the range's own length the last answers came (LAG_MS until the first one is measured).
     A stop that held late is followed on the clock, so the whole sequence keeps its designed length; it is never shorter (no stop starts before
     it is due). A stop that waited for a load (more than half a part late) moves the clock instead: nothing rushes to catch a slow load up. */
  var seqStart = 0, lag = FEEL.LAG_MS, lagSeen = 0, playMs = 0;
  function stopLen(n) { return stops ? stops[n][1] - stops[n][0] : (plazaIn[1] - plazaIn[0]) / of; }
  /* frames a second that play stop n in `room` ms (two decimals: the frame steps by the clock, so a rate need not be whole) */
  function stopRate(n, room) { return Math.max(FEEL.RATE_MIN, Math.min(FEEL.RATE_MAX, Math.round(stopLen(n) * 100000 / room) / 100)); }
  /* the shares of the bar that are loads; the stops add one share each */
  var UNITS = { shell: 1, view: 1, page: 1, document: 1, pack: 2, mesh: 1, picture: 1, drawn: 1 }, LOAD_UNITS = 9;
  var have = { shell: 0, view: 0, page: 0, document: 0, pack: 0, mesh: 0, picture: 0, drawn: 0 }, seen = {};
  var stops = null, plazaIn = null, of = 15, next = 0, held = 0, playing = false, startedAt = 0, stopTimer = 0;
  var live = false, opened = false, finished = false, stage = null;
  /* the loader plays the stops, so intro.js plays none (its contract: window.ArkPlazaStops) */
  if (want3d) window.ArkPlazaStops = true;

  function loadShare() { var s = 0; for (var k in UNITS) s += UNITS[k] * have[k]; return s / LOAD_UNITS; }
  function show() {
    var k = want3d ? (loadShare() * LOAD_UNITS + held) / (LOAD_UNITS + of) : have.shell;
    L.style.setProperty('--plaza-fill', Math.max(0, Math.min(1, k)).toFixed(4));
  }
  function took(kind, done, total) {
    if (!(kind in have) || !(total > 0)) return;
    seen[kind] = true; have[kind] = Math.max(have[kind], Math.min(1, done / total));
    /* a boot that reads no pack (one mesh, or ?nopack) has no pack bytes to wait for: the meshes' own count stands for them */
    if (kind === 'mesh' && have.mesh >= 1 && !seen.pack) have.pack = 1;
    show(); pump();
  }

  /* THE SEAM (fxn-3d portal101 PLAZASTOPS): play stop n of `of` and hold its end. With the document's stops it is the stage's own range call,
     answered by held 'stop:<n>'. On a document without them (portal101r109) the old reveal, PLAZAIN, is cut into `of` equal parts, answered by
     held 'load:<n>' */
  function playStop(n, total, rate) {
    if (stops) { stage.post({ range: stops[n], tag: 'stop:' + n, rate: rate }, 'portal'); return 'stop:' + n; }
    var a = plazaIn[0], b = plazaIn[1];
    stage.post({ range: [Math.round(a + (b - a) * n / total), Math.round(a + (b - a) * (n + 1) / total)], tag: 'load:' + n, rate: rate }, 'portal'); return 'load:' + n;
  }
  var waitTag = null;
  /* A HIDDEN PAGE (a tab opened in the background, measured 2026-11-11: it gets no animation frames at all, so no stop it is asked to play ever
     holds). The load then finishes by state: the last stop's end is asked for as one frame-long range, the stops count as held, and the loader goes
     on. The studio answers that range on the first frame it gets, which is when the visitor looks: they find the plaza whole, and the hero follows */
  function finishStops() {
    clearTimeout(stopTimer); playing = false; waitTag = null;
    /* the load was not played: intro.js then holds the hero's rest frame and plays no lift (its plaza-open listener reads this) */
    window.ArkPlazaSkipped = true;
    if (stage && has3d !== false && (stops || plazaIn)) { var end = stops ? stops[of - 1][1] : plazaIn[1]; owed = false; stage.post({ range: [end, end], tag: (stops ? 'stop:' : 'load:') + (of - 1) }, 'portal'); }
    else owed = true;   /* the frame's ranges are not known yet: asked for when they come (the segments listener in meet()) */
    next = held = of; show();
  }
  var owed = false;
  document.addEventListener('visibilitychange', function () { pump(); });
  /* a page can get no frames and still say it is visible (measured 2026-11-11 in the FXN Browser: a tab that is not in front has document.hidden
     false and 0 frames in 3 s). So frames are watched themselves: `unseen` is true once three watch ticks in a row found the last frame older
     than 3 s (three, because one long task holds frames and timers back together, and the timer may run first after it; 3 s, because the
     studio's first draw can hold the frames of a page in front for a while, and that page must never be taken for a hidden one) */
  var lastFrame = performance.now(), stale = 0;
  (function beat() { lastFrame = performance.now(); if (!finished) requestAnimationFrame(beat); })();
  function unseen() { return document.hidden || stale >= 3; }
  function pump() {
    if (finished) return;   /* the visitor left the home during the load: no further stop is asked of a frame nobody sees */
    if (live && !opened && next < of && unseen()) { finishStops(); settle(); return; }
    if (!live || playing || opened || next >= of) return;
    /* stop n stands for the loads up to share (n + 1) / of */
    if (loadShare() + 1e-9 < (next + 1) / of) return;
    var now = performance.now(), part = stopMs();
    if (!seqStart) seqStart = now;
    var due = seqStart + next * part;
    if (now < due) { clearTimeout(dueTimer); dueTimer = setTimeout(pump, due - now); return; }
    if (now - due > part / 2) { seqStart += now - due; due = now; }
    var rate = stopRate(next, Math.max(part / 2, due + part - now - lag));
    playing = true; startedAt = now; playMs = stopLen(next) * 1000 / rate; waitTag = playStop(next, of, rate);
    clearTimeout(stopTimer); stopTimer = setTimeout(function () { stopHeld(waitTag); }, WAIT_STOP);
  }
  var dueTimer = 0;
  /* real: the frame's own answer (not the ceiling's): its delay past the range's length is the lag the next stops allow for */
  function stopHeld(tag, real) {
    if (!playing || tag !== waitTag) return;
    if (real) { var over = Math.max(0, Math.min(stopMs() / 2, performance.now() - startedAt - playMs)); lag = lagSeen++ ? (lag + over) / 2 : over; }
    clearTimeout(stopTimer); playing = false; waitTag = null; next++; held = next; show();
    /* the last stop's answer may come a few ms before the sequence's own end: the load goes on at that end, never before it */
    if (held >= of) { var left = seqStart + of * stopMs() - performance.now(); if (left > 1 && !unseen()) setTimeout(settle, left); else settle(); } else pump();
  }

  /* the stage arrives with the shell's scripts, after this file: its kept counts are read once, then each new one as it comes */
  function meet() {
    /* window.ArkStage: the stage's own name. It is there from the script after this one, before the shell makes ArkUI (js/ark/stage-attach.js) */
    if (stage || !window.ArkStage) return;
    stage = window.ArkStage;
    /* no 3D on this host: nothing to wait for, the loader cross-fades onto the page (the tick below) */
    stage.ready.then(function (ok) { has3d = !!ok; if (!ok) { want3d = false; window.ArkPlazaStops = false; show(); } });
    var kept = stage.loads ? stage.loads('portal') : {}; for (var k in kept) took(k, kept[k].done, kept[k].total);
    stage.on('load', function (l, from) { if (from === 'portal') took(l.kind, l.done, l.total); });
    stage.on('segments', function (d, from) {
      if (from !== 'portal') return;
      stops = Array.isArray(d.stops) && d.stops.length && d.loadStart && d.heroIn ? d.stops : null; plazaIn = d.plazaIn || null;
      if (stops) of = stops.length;
      if (owed) finishStops(); else show();
    });
    stage.on('held', function (h, from) { if (from === 'portal') stopHeld(h, true); });
    stage.on('drawn', function (d, from) { if (from === 'portal' && still) portalDrawn = true; });
  }
  var portalDrawn = false;
  /* intro.js: the portal frame holds the empty ground (LOADSTART), or the plaza at rest on a document without the stops */
  addEventListener('plaza-drawn', function () {
    if (!want3d || live || opened) return;
    meet(); if (!stage) return;
    /* the frame's first picture has landed: a picture count that never came means the document names no pictures */
    have.drawn = 1; if (!seen.picture) have.picture = 1;
    /* a drawn frame has its view, page, document and meshes by then, whether or not each count reached this page */
    have.view = have.page = have.document = have.mesh = have.pack = 1;
    if (!stops && !plazaIn) { want3d = false; show(); return; }   /* no reveal to play: the page shows as it is */
    if (!stops) stage.post({ frame: plazaIn[0] }, 'portal');   /* the old reveal's first frame, the empty floor */
    /* the next frame, so the frame's picture is on screen before the drawn ground fades; a hidden page gets no frame, so it goes by the clock */
    var goLive = function () { if (live) return; live = true; seqMs = Math.max(FEEL.CAP_MS, Math.min(FEEL.CALM_MS, FEEL.CALM_MS - Math.max(0, performance.now() - t0 - FEEL.EARLY_MS))); L.classList.add('is-live'); root.classList.add('plaza-live'); show(); pump(); };
    setTimeout(function () { if (document.hidden) goLive(); else { requestAnimationFrame(goLive); setTimeout(goLive, 400); } }, stops ? 0 : 150);
  });
  addEventListener('plaza-assembled', function () { done(); });

  if (want3d) L.setAttribute('aria-busy', 'true');
  /* every load has landed and every stop has held: the loader asks for nothing (owner ruling 2026-11-11: one "Enter FXN", the hero's own; nothing
     a visitor must press to see the home). The bar fades and the load goes straight on into the hero */
  function settle() { if (opened) return; L.setAttribute('aria-busy', 'false'); open(); }

  function shellUp() { return root.classList.contains('shell-ready') || root.classList.contains('world-ready'); }
  /* a watch on states that send no event of their own (the shell's class, the stage's arrival, the manifest's copy); it moves no bar by itself */
  /* ANOTHER ROUTE'S WORDS DO NOT WAIT FOR THE CLOCK (2026-11-11, speed lane 1). Measured on the build node, /fxn/keepers, cold: first paint at 160 ms,
     words readable at 1,716 ms, and every one of the page's requests had finished before that. Cause, all of it here and in css/loader-plaza.css:
     the loader opened no sooner than 400 ms and only on a 100 ms tick, faded for 450 ms while the page under it stayed hidden, waited 150 ms more,
     and only then let the page fade in (0.4 s). Now, on a route that is not the home: the loader opens when the router says the page is mounted
     (ark:route-ready; ROUTE_WAIT is the ceiling for a route that never says so), and html.plaza-cross lets the page fade in while the loader
     fades out, one cross-fade of 0.4 s. The home keeps its own timing: its words never waited (html.hero-up) */
  var routed = false, ROUTE_WAIT = 4000;
  addEventListener('ark:route-ready', function () { routed = true; if (!home) watch(); });
  var tick = setInterval(watch, 100);
  function watch() {
    var t = performance.now() - t0;
    if (!have.shell && shellUp()) { have.shell = 1; show(); pump(); }
    meet();
    /* the studio is silent past the ceiling, or the page is hidden and the studio has not drawn (it cannot, with no frames): stop waiting for it.
       The last stop is still asked for, so intro.js, which waits for it before the hero, goes on once the studio draws */
    stale = performance.now() - lastFrame > 3000 ? stale + 1 : 0;
    if (want3d && live && !opened && unseen()) pump();
    if (want3d) { if (!opened && !live && have.shell && (t >= WAIT_ALL || (unseen() && t >= 1500))) { finishStops(); want3d = false; show(); } else if (!opened && live && t >= WAIT_ALL + WAIT_STOP * 2) { finishStops(); settle(); } return; }
    if (opened || !have.shell) return;
    /* no live scene to wait for. Reduced motion on the home: the settled hero is the page itself, so the loader waits for its portal (6 s at most) */
    if (home && still && stage && has3d !== false && !portalDrawn && t < 6000) return;
    if (home ? t >= 400 : routed || t >= ROUTE_WAIT) open();
  }

  function open() {
    opened = true; show();
    if (!home && !live) root.classList.add('plaza-cross');
    L.classList.add('opening');
    /* intro.js plays the load's end into the hero on plaza-open and says plaza-assembled when it holds; with no live scene under the loader the
       page takes the same event (so a portal that drew late still goes on to its hero) and the loader's own cross-fade is 0.4 s */
    if (home) dispatchEvent(new Event('plaza-open'));
    setTimeout(done, live ? WAIT_BUILT : 450);
  }
  function done() {
    if (finished) return; finished = true; clearInterval(tick); clearTimeout(stopTimer);
    setTimeout(function () { root.classList.add('plaza-done'); root.classList.remove('plaza-hold', 'plaza-live'); L.setAttribute('aria-hidden', 'true'); }, 150);
  }
})();

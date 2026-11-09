/* /intro: the first page of a fresh visit. It is the world and the intro part (js/space/intro.mjs); the page itself holds no words.

   Rebuilt 2026-11-07 (docs/design/space/SPACE.md, "Intro: plan", lane 3). The old film chrome (caption, rail, Skip intro), the five doors,
   the three counters, the hero words and the ledger left: home's plan places them. What stays is the world's stage, a "Replay intro" chip
   at the dock and the hand-shake with the part. The part tells the page when it plays (event ark-intro-state, detail {playing, done}); the
   page dims the nav while it plays (html[data-intro="playing"], css/world-pages.css) and hands the part a mount event
   (ark-intro-mount, detail {page, wanted}) so the part knows whether this load plays the intro. "Replay intro" fires ark-intro-replay.
   A fresh load of "/" or "/intro" plays the intro once (FILM_KEY rule: loadedOnIntro and not yet played); a move back to /intro inside
   the site finds shot 5 standing, never a replay.

   REDUCTION TEST
   1 About: the first thirty seconds with one FXN ID: get, pay, see it spread, say who you are.
   2 Dominant action: the press on the lit thing (the chip, the complement, once per state).
   3 Know now: you get an FXN ID, a keeper signs the payment, copies reach pinners; it is a rehearsal and nothing is live.
   4 Hidden until asked: roles, home, every other page (shot 5 and the nav, which returns at shot 5).
   5 Repeated elsewhere: nothing; the words are the LANDING.* keys of the home manifest.
   6 Only because the data has it: the one number, with its condition on the same screen.
   7 Removable: the mono step numbers, on a short screen.
   8 Leaving keeps state: the role, in defxn-quest-v1 (the part writes it).
   9 Returning: the Back button finds shot 5.
   10 If WebGL is missing: the host never sends a visitor here; a direct link shows the page name and the replay chip.
   Words: HOME.LANDING.* (ArkCopy). Layout: css/world-pages.css. */
(function () {
  'use strict';
  function copy(role) { return ArkCopy.text('HOME.LANDING.' + role); }
  function node(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }
  /* Page responses (SPACE.md "interaction map", lane 3): a door, counter or stat lights the places it names in the world while
     the pointer or focus is on it, and a counter or stat press flies to the first of them. Shared with js/pages/home.js
     (ArkUI.placeResponse). Every ArkSpace call is guarded: with no world, nothing here does anything. */
  function still() { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function places(kind) {
    var S = window.ArkSpace, N = window.DEFXN_NETWORK || {}, list = S && S.targets ? S.targets() : [];
    function kindOf(t) { return N.KIND ? N.KIND[String(t.id).split(':')[1]] : null; }
    var ids = function (f) { return list.filter(f).map(function (t) { return t.id; }); };
    if (kind === 'networks') return ['*'];
    if (kind === 'network') return ids(function (t) { return t.kind === 'network'; }).slice(0, 1);
    if (kind === 'chains') return ids(function (t) { return t.kind === 'chain'; });
    if (kind === 'kernel') return ids(function (t) { return t.kind === 'kernel'; });
    if (kind === 'resolver-chain') return ids(function (t) { return t.kind === 'chain' && kindOf(t) === 'resolver'; }).slice(0, 1);
    return [];
  }
  function lightOn(ids) {
    var S = window.ArkSpace; if (!S || !ids.length) return;
    if (S.light) S.light(ids); else if (S.hover && ids[0] !== '*') S.hover(ids[0]);
  }
  function lightOff() {
    var S = window.ArkSpace; if (!S) return;
    if (S.light) S.light(null); else if (S.hover) S.hover(null);
  }
  /* kind is a places() name; press: true = a press flies to the first lit place instead of the element's own action */
  function placeResponse(el, kind, press) {
    el.dataset.place = kind;
    var on = false;
    function enter() { if (on) return; on = true; lightOn(places(kind)); }
    function leave() { if (!on) return; on = false; lightOff(); }
    el.addEventListener('pointerenter', enter); el.addEventListener('pointerleave', leave);
    el.addEventListener('focusin', enter); el.addEventListener('focusout', leave);
    if (press) el.addEventListener('click', function (e) {
      var S = window.ArkSpace, ids = places(kind).filter(function (i) { return i !== '*'; });
      if (!S || !S.focus) return;
      if (kind === 'networks') ids = places('network');
      if (!ids.length) return;
      e.preventDefault(); e.stopPropagation(); leave(); S.focus(ids[0]);
    }, true);
  }
  /* a number rolls to its value on the number spring (k 60, d 15.5) when it first comes into view; once, then stops. The
     frame loop runs only while the roll runs. Reduced motion: the value stands. */
  function rollIn(el) {
    var target = parseInt(el.textContent, 10);
    if (!(target > 0) || still() || !window.IntersectionObserver) return;
    var io = new IntersectionObserver(function (es) {
      if (!es.some(function (e) { return e.isIntersecting; })) return;
      io.disconnect();
      var x = 0, v = 0, last = performance.now(), K = 60, D = 15.5;
      el.textContent = '0';
      /* a settle loop (js/lib/frame.js): it asks for frames only until the spring rests, then sleeps for good */
      ArkFrame.settleLoop(function (now) {
        var dt = Math.min(0.033, (now - last) / 1000); last = now;
        v += (K * (1 - x) - D * v) * dt; x += v * dt;
        if (Math.abs(1 - x) < 0.002 && Math.abs(v) < 0.02) { el.textContent = String(target); return false; }
        el.textContent = String(Math.min(target, Math.max(0, Math.round(target * x))));
        return true;
      }).wake();
    }, { threshold: 0.6 });
    io.observe(el);
  }
  ArkUI.placeResponse = placeResponse; ArkUI.rollIn = rollIn;
  var FILM_KEY = 'defxn-intro-film-v1';
  /* the intro plays on every fresh load of /intro or / (owner, 2026-11-05); a move back to /intro inside the site finds it done */
  var loadedOnIntro = /\/intro\/?$/.test(location.pathname) || location.pathname === '/';
  var played = false;
  function wanted() { return loadedOnIntro && !played && !document.documentElement.hasAttribute('data-portal-up'); }   /* the portal stands first: the film waits for the dive */
  function playing(on) {
    if (on) document.documentElement.setAttribute('data-intro', 'playing'); else document.documentElement.removeAttribute('data-intro');
  }
  window.addEventListener('ark-intro-state', function (e) {
    var d = e.detail || {};
    playing(!!d.playing);
    if (d.done) played = true;
  });
  ArkUI.introPage = { key: FILM_KEY, wanted: wanted };

  /* THE PORTAL (owner, 2026-11-09; board 40 in flux/fxn-3d/docs/design/direction/owner-boards-2026-11-08/). Layer: app.
     The intro gains the site object Portal 101 on the right and the board's words on the left; the nav, the world and
     the Replay chip stay. Scroll plays the board's three beats: the ring's edge lights, a record flies in, the ring opens
     on the city. The object is drawn live by the fxn-3d studio on this Mac (flux/fxn-3d/world/site-view/index.html), because
     no export is allowed yet; so the portal is added only when the site itself runs on this machine, and a visitor sees the
     intro as before. The beat frame ranges are the object's own (its geometry.mjs INTRO); this page sends a progress from
     0 to 3 and never a frame number. Words: HOME.LANDING.PORTAL.*. Layout: css/world-pages.css "intro portal". */
  /* Portal 101 alone (owner, 2026-11-09: "use Portal 101, 3D and no background, just that object"): the studio leaves out the
     object's floor and backdrop and clears to this page's own background colour, read from the page, never written here */
  function portalView() {
    var m = (getComputedStyle(document.body).backgroundColor || '').match(/\d+/g), bg = m && m.length >= 3 ? m.slice(0, 3).join(',') : '';
    return 'http://127.0.0.1:3440/world/site-view/index.html?o=portal101&alone=1' + (bg ? '&bg=' + bg : '');
  }
  /* the underground DEFXN world the dive enters (fxn-3d world/underground: the site objects arrive, then animate) */
  var UNDERGROUND_VIEW = 'http://127.0.0.1:3440/world/site-view/index.html?o=underground';
  var portalHere = /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
  function addPortal(page) {
    var frame = node('iframe', 'intro-portal-stage'); frame.title = ''; frame.setAttribute('aria-hidden', 'true'); frame.tabIndex = -1;
    var words = node('div', 'intro-portal-words');
    var eyebrow = node('p', 'intro-portal-eyebrow mono', copy('PORTAL.EYEBROW'));
    var head = node('p', 'intro-portal-headline', copy('PORTAL.HEADLINE'));
    var line = node('p', 'intro-portal-line', copy('PORTAL.LINE'));
    var enter = node('a', 'intro-portal-enter mono', copy('PORTAL.ENTER')); enter.href = '/'; enter.setAttribute('data-scene-link', 'zero');
    words.append(eyebrow, head, line, enter);
    page.insertBefore(frame, page.firstChild); page.appendChild(words);
    page.classList.add('has-portal'); document.documentElement.setAttribute('data-portal-up', '');

    /* The frame shows only once the studio has drawn the object (no white flash while the studio page loads). While it shows and
       this page is the one on screen, the world behind it is held (js/world2/world2-host.mjs), so the GPU draws one scene. If the
       GPU drops the studio's context, the portal fades out, the world comes back, and the frame loads once more. */
    var drawn = false, retried = false, root = document.documentElement;
    function hold() {
      if (page.hidden) document.documentElement.removeAttribute('data-portal-ring');   /* the site's header and footer come back on any other page */
      var on = drawn && !page.hidden;
      if (on === root.hasAttribute('data-world-held')) return;
      if (on) root.setAttribute('data-world-held', ''); else { root.removeAttribute('data-world-held'); dispatchEvent(new CustomEvent('ark-world-release')); }
    }
    new MutationObserver(hold).observe(page, { attributes: true, attributeFilter: ['hidden'] });
    addEventListener('message', function (e) {
      /* the next frame loads hidden behind the current one; it takes over only once it has drawn (no black gap, so the clicked
         stone and the film's first frame meet in a match cut) */
      if (pending && e.source === pending.contentWindow && e.data) {
        if (e.data.ring) { ringAt(e.data.ring); return; }
        if (e.data.segments) { segs = e.data.segments; ringSel = e.data.select; ringOpen = e.data.open; ringView = e.data.ringview; ringSpawn = e.data.spawn; return; }
        if (!e.data.drawn) return;
        var old = frame, then = pending._then; frame = pending; pending = null; frame.classList.remove('intro-portal-next'); old.remove();
        if (then) then();
        return;
      }
      if (e.source !== frame.contentWindow || !e.data) return;
      if (e.data.lost) {
        drawn = false; page.classList.remove('portal-drawn'); hold();
        if (!retried && !gone) { retried = true; setTimeout(function () { frame.src = portalView(); }, 1000); }
        else if (below === 'in' && !retriedBelow) { retriedBelow = true; below = 'loading'; page.classList.remove('in-underground'); setTimeout(function () { frame.src = UNDERGROUND_VIEW; }, 1000); }
        return;
      }
      if (e.data.segments) { segs = e.data.segments; ringSel = e.data.select; ringOpen = e.data.open; ringView = e.data.ringview; ringSpawn = e.data.spawn; return; }
      if (e.data.held && /^open:/.test(e.data.held)) { openTopic(+e.data.held.slice(5)); return; }
      if (e.data.held === 'RINGVIEW' && ringSpawn) { page.classList.add('portal-drawn'); drawn = true; post({ play: 'SPAWN' }); return; }
      if (e.data.held === 'RINGVIEW' || e.data.held === 'SPAWN') { page.classList.add('portal-drawn'); drawn = true; showMenu(); return; }
      if (e.data.shotDone) { backToRing(); return; }
      if (e.data.cinemaEnd) { if (!topic) question(); return; }
      if (e.data.shot) { cine(e.data.shot); return; }
      if (e.data.ring) { ringAt(e.data.ring); try { localStorage.setItem('defxn-portal-ring', JSON.stringify({ x: e.data.ring.x, y: e.data.ring.y, r: e.data.ring.r, w: innerWidth, h: innerHeight })); } catch (x) { /* only a convenience */ } return; }
      if (!e.data.drawn) return;
      if (below === 'loading') { arrive(); return; }
      if (gone) return;
      drawn = true; page.classList.add('portal-drawn'); hold();
    });
    frame.src = portalView();

    /* NEVER BLANK (owner, 2026-11-09: "first it is blank and then the object shows up"). While the studio loads, a mint outline of
       the ring draws itself at once where the ring will stand: the last place the studio reported (kept per viewer), else its usual
       place at this aspect (measured at 1440x900: centre .788, .447 of the view, radius .1417 of its width). When the studio has drawn,
       the outline fades and the 3D portal builds itself (fxn-3d portal101 BUILD, played by site-view). */
    var NS = 'http://www.w3.org/2000/svg', ghost = document.createElementNS(NS, 'svg'), gc = document.createElementNS(NS, 'circle'), gi = document.createElementNS(NS, 'circle');
    ghost.setAttribute('class', 'intro-portal-ghost'); ghost.setAttribute('aria-hidden', 'true');
    gc.setAttribute('class', 'outer'); gi.setAttribute('class', 'inner'); ghost.append(gc, gi); page.appendChild(ghost);
    function ghostAt(r) {
      ghost.setAttribute('viewBox', '0 0 ' + innerWidth + ' ' + innerHeight);
      [[gc, r.r], [gi, r.r * .78]].forEach(function (c) { c[0].setAttribute('cx', r.x); c[0].setAttribute('cy', r.y); c[0].setAttribute('r', c[1]); c[0].setAttribute('pathLength', '1'); });
    }
    var kept = null; try { kept = JSON.parse(localStorage.getItem('defxn-portal-ring') || 'null'); } catch (e) { kept = null; }
    ghostAt(kept && kept.w === innerWidth && kept.h === innerHeight ? kept : { x: innerWidth * .788, y: innerHeight * .447, r: innerWidth * .1417 });

    /* THE DIVE (owner, 2026-11-09: "clicking on the portal and it zooms in like your camera goes inside of it as it glitches
       different words insanely fast, then it shows the underground DEFXN world"). The ring is a button over the ring's own place on
       screen (the studio reports it, js: site-view ring). A press: the view pushes into the ring's centre, words flicker over it
       every 40 ms, a mint flash, and the portal is gone: the frame is emptied (its GPU context goes), the world is released and
       its intro film plays. That world is the network under the city, DEFXN. The words are the site's own journeys and pages
       (js/content/site-pages.js), never a list written here. Reduced motion: no push and no flicker, a cross-fade only. */
    var ring = node('button', 'intro-portal-ring'); ring.type = 'button'; ring.hidden = true;
    ring.setAttribute('aria-label', copy('PORTAL.DIVE'));
    var glitch = node('div', 'intro-portal-glitch'); glitch.setAttribute('aria-hidden', 'true');
    var flash = node('div', 'intro-portal-flash'); flash.setAttribute('aria-hidden', 'true');
    page.append(ring, glitch, flash);
    var at = null, gone = false, below = '', retriedBelow = false, timer = 0;
    function ringAt(r) {
      at = r; ring.hidden = gone;
      Object.assign(ring.style, { left: (r.x - r.r) + 'px', top: (r.y - r.r) + 'px', width: 2 * r.r + 'px', height: 2 * r.r + 'px' });
    }
    function wordsOf() {
      var P = window.ArkSitePages, list = [];
      if (P) { P.journeys().forEach(function (j) { list.push(j.title); }); P.pages().forEach(function (p) { list.push(p.short || p.label); }); }
      String(copy('PORTAL.HEADLINE')).split(/[\s,.]+/).forEach(function (w) { if (w.length > 2) list.push(w); });
      return list.map(function (w) { return String(w).toUpperCase(); });
    }
    /* THE CUT (owner, 2026-11-09: "the portal motion glitch is lame, it doesn't fit with the 3D at all... do hard cuts"). A press
       pushes into the ring for 0.45 s, then a hard cut to black. The same frame loads the cinema behind the black (one studio context
       at a time), and a hard cut shows it when it has drawn. No glitch film, no tear, no flickering words. */
    function dive() {
      if (gone || !drawn) return;
      if (segs && frame.contentWindow) {   /* the ring view: the portal itself becomes the menu */
        gone = true; ring.hidden = true; page.classList.add('ring-view'); document.documentElement.setAttribute('data-portal-ring', '');
        frame.contentWindow.postMessage({ play: 'RINGVIEW' }, 'http://127.0.0.1:3440');
        return;
      }
      gone = true; ring.hidden = true; page.classList.add('portal-diving');
      var still0 = still(), cx = at ? at.x : innerWidth * .7, cy = at ? at.y : innerHeight * .45;
      frame.style.transformOrigin = cx + 'px ' + cy + 'px';
      var push = still0 ? null : frame.animate([{ transform: 'scale(1)' }, { transform: 'scale(2.4)' }], { duration: 450, easing: 'cubic-bezier(.6,0,1,.4)', fill: 'forwards' });
      setTimeout(function () {
        if (push) push.cancel();
        drawn = false; page.classList.remove('portal-drawn', 'portal-diving'); page.classList.add('portal-gone'); hold();
        below = 'loading'; frame.style.transformOrigin = ''; frame.src = UNDERGROUND_VIEW;
      }, still0 ? 0 : 450);
    }
    /* THE CINEMA WORDS (owner, 2026-11-09: "fast kinetic FXN Motion aligned with the object"). The underground plays one shot per
       object (fxn-3d world/underground SHOTS); site-view passes the shot on screen and the object's anchor. Each shot gets the object's
       name and one line that names what it just did (HOME.LANDING.CINE.<ID>.NAME and .LINE), pinned beside the object. The letters
       spring in one by one on the letter spring (--ease-letter) and cut out with the camera's cut. Reduced motion: no letter motion. */
    var cineBox = node('div', 'intro-cine'); cineBox.setAttribute('aria-live', 'polite'); page.appendChild(cineBox);
    var cineId = null, cineEl = null;
    function letters(text) {
      var line = node('p', 'intro-cine-line'), i = 0;
      String(text).split(' ').forEach(function (word, w) {
        var wd = node('span', 'w');
        Array.prototype.forEach.call(word, function (ch) { var c = node('span', 'c', ch); c.style.setProperty('--i', i++); wd.appendChild(c); });
        line.appendChild(wd); if (w) line.insertBefore(document.createTextNode(' '), wd);
      });
      return line;
    }
    function cine(shot) {
      if (shot.id !== cineId) {
        if (cineEl) { var old = cineEl; old.classList.add('out'); setTimeout(function () { old.remove(); }, 240); }
        cineId = shot.id; cineEl = null;
        if (!shot.id) return;
      }
      /* the words come after the object acts (site-view reports acted), never before it */
      if (shot.id && !cineEl && shot.acted && shot.id === cineId) {
        var key = 'CINE.' + String(shot.id).toUpperCase(), name = copy(key + '.NAME'), text = copy(key + '.LINE');
        if (!text || text.indexOf('CINE.') >= 0) return;
        cineEl = node('div', 'intro-cine-shot');
        cineEl.append(node('p', 'intro-cine-name mono', name), letters(text));
        cineBox.appendChild(cineEl);
      }
      if (!cineEl) return;
      /* beside the object: the words end left of it, on its height; when the object stands too far left, they sit under it */
      var w = Math.min(560, innerWidth * .4), gap = Math.min(shot.r, 260) + 32, right = shot.x - gap, left = right - w;
      if (left < 48) { left = Math.max(48, Math.min(innerWidth - w - 48, shot.x - w / 2)); cineEl.style.top = Math.min(innerHeight - 220, shot.y + Math.min(shot.r, 260) + 24) + 'px'; }
      else cineEl.style.top = Math.max(96, shot.y - 60) + 'px';
      cineEl.style.left = left + 'px'; cineEl.style.width = w + 'px';
    }
    /* THE RING MENU (owner, 2026-11-09: "when you click the portal everything animates, then only the portal is visible as a full
       circle, and each part of that portal is a click that takes you to a cinematic intro to the objects"). Portal 101's RINGVIEW
       holds the ring square-on; its SEGMENTS (fxn-3d portal101 geometry.mjs: centre angle on screen, 0 = top, clockwise, and width)
       place one click area over each stone. TOPIC maps a segment to the film shot that explains it (world/underground SHOTS id); the
       FXN ID has no object yet. Names: HOME.LANDING.RING.<n>. A click opens that one shot, and its end returns to the held ring. */
    /* 12 stones once the ring has closed; a stone's place on the ring (its screen angle / 30) picks its topic. The bottom stone is
       the game. TOPIC gives the film shot that explains it (world/underground SHOTS id); null = no film yet. */
    var TOPIC = ['fxnid', 'recordline', 'keeperring', 'keepertower', 'chaindrum', null, null, 'markgate', 'bundlepress', 'multisiglock', 'bridgespan', 'networkwall'];
    var segs = null, menu = null, topic = null, ringSel = null, ringOpen = null, ringView = null, ringSpawn = null, hovered = -1;
    var soon = node('p', 'intro-ring-soon mono', copy('RING.SOON')); page.appendChild(soon);
    var tag = node('p', 'intro-ring-tag mono'); page.appendChild(tag);
    var SVGNS = 'http://www.w3.org/2000/svg';
    function arcPath(cx, cy, r0, r1, a, w) {
      var p = function (r, deg) { var t = (deg - 90) * Math.PI / 180; return (cx + r * Math.cos(t)).toFixed(1) + ' ' + (cy + r * Math.sin(t)).toFixed(1); };
      var a0 = a - w / 2, a1 = a + w / 2, big = w > 180 ? 1 : 0;
      return 'M' + p(r1, a0) + ' A' + r1 + ' ' + r1 + ' 0 ' + big + ' 1 ' + p(r1, a1) + ' L' + p(r0, a1) + ' A' + r0 + ' ' + r0 + ' 0 ' + big + ' 0 ' + p(r0, a0) + ' Z';
    }
    function post(msg) { if (frame.contentWindow) frame.contentWindow.postMessage(msg, 'http://127.0.0.1:3440'); }
    function slot(sg) { var ang = sg.at != null ? sg.at : sg.angle; return ((Math.round(ang / 30) % 12) + 12) % 12; }
    /* the stone itself answers: SELECT[n] slides it out and lights it (fxn-3d portal101); leaving returns the held ring frame */
    var opening = false;
    /* the object that came to the centre stays there while the pointer travels from its stone into the centre, so it can be
       clicked there (owner, 2026-11-09: "I hover, it shows, I go down to click, it goes out again"). Leaving waits a moment; the
       centre or another stone cancels the wait. */
    var releaseTimer = 0, current = null;
    function release(sg) { clearTimeout(releaseTimer); releaseTimer = setTimeout(function () { if (current === sg) { current = null; select(sg, false); } }, 220); }
    function keep() { clearTimeout(releaseTimer); }
    function select(sg, on) {
      var n = sg.n;
      if (opening) return;   /* a click is transforming the object: no hover answer may run over it */
      if (on) { keep(); if (current && current !== sg) { var was = current; current = null; select(was, false); } current = sg; }
      if (on) {
        hovered = n; var k = slot(sg), ang = (sg.at != null ? sg.at : sg.angle);
        tag.textContent = copy('RING.S' + (k + 1));
        var t = (ang - 90) * Math.PI / 180, lr = at.r * 1.5; tag.style.left = (at.x + lr * Math.cos(t)) + 'px'; tag.style.top = (at.y + lr * Math.sin(t)) + 'px';
        if (ringSel && ringSel[n]) post({ range: ringSel[n], tag: 'sel:' + n });
      } else if (hovered === n) {
        hovered = -1; page.classList.remove('tag-on');
        /* the object goes back to its stone: SELECT played in reverse; with no SELECT, the held frame */
        if (ringSel && ringSel[n]) post({ range: [ringSel[n][1], ringSel[n][0]], tag: 'unsel:' + n });
        else if (ringSpawn) post({ frame: ringSpawn[1] }); else if (ringView) post({ frame: ringView[1] });
      }
    }
    function showMenu() {
      if (!segs || !at) return;
      if (menu) menu.remove();
      menu = document.createElementNS(SVGNS, 'svg'); menu.setAttribute('class', 'intro-ring-menu');
      menu.setAttribute('viewBox', '0 0 ' + innerWidth + ' ' + innerHeight);
      segs.forEach(function (sg) {
        var k = slot(sg), ang = sg.at != null ? sg.at : sg.angle;
        var g = document.createElementNS(SVGNS, 'a'); g.setAttribute('href', '#'); g.setAttribute('aria-label', copy('RING.S' + (k + 1)));
        var path = document.createElementNS(SVGNS, 'path'); path.setAttribute('d', arcPath(at.x, at.y, at.r * .68, at.r * 1.75, ang, (sg.width || 30) - 1));   /* the word inside the ring, the stone and its object pushed out past it: one door (owner, 2026-11-09: hovering the name brings the object in too) */
        g.appendChild(path);
        /* the topic's word on its stone at rest, just inside the ring (audit fix 6): every door says what it opens */
        var tr = (ang - 90) * Math.PI / 180, word = document.createElementNS(SVGNS, 'text');
        word.setAttribute('x', (at.x + at.r * .8 * Math.cos(tr)).toFixed(1)); word.setAttribute('y', (at.y + at.r * .8 * Math.sin(tr)).toFixed(1));
        word.setAttribute('text-anchor', 'middle'); word.setAttribute('dominant-baseline', 'middle'); word.textContent = copy('RING.S' + (k + 1));
        g.appendChild(word);
        /* its micro object (SEGMENTS micro: screen centre and radius, 0 to 1 of the frame) is the same door */
        if (sg.micro) { var c = document.createElementNS(SVGNS, 'circle'); c.setAttribute('cx', (sg.micro.x * innerWidth).toFixed(1)); c.setAttribute('cy', (sg.micro.y * innerHeight).toFixed(1)); c.setAttribute('r', Math.max(18, sg.micro.r * innerHeight * 1.2).toFixed(1)); g.appendChild(c); }
        g.addEventListener('pointerenter', function () { if (current !== sg) select(sg, true); else keep(); });
        g.addEventListener('pointerleave', function () { release(sg); });
        g.addEventListener('focus', function () { if (current !== sg) select(sg, true); });
        g.addEventListener('blur', function () { release(sg); });
        sg._open = function () {
          if (!TOPIC[k]) { page.classList.add('topic-soon'); setTimeout(function () { page.classList.remove('topic-soon'); }, 1600); return; }
          page.classList.remove('tag-on');
          if (ringOpen && ringOpen[sg.n] && !still()) { opening = true; if (menu) menu.style.pointerEvents = 'none'; post({ range: ringOpen[sg.n], tag: 'open:' + k }); }
          else openTopic(k);
        };
        g.addEventListener('click', function (e) { e.preventDefault(); sg._open(); });
        menu.appendChild(g);
      });
      /* the centre: the object that came in is clicked here */
      var mid = document.createElementNS(SVGNS, 'circle'); mid.setAttribute('class', 'centre');
      mid.setAttribute('cx', at.x); mid.setAttribute('cy', at.y); mid.setAttribute('r', (at.r * .66).toFixed(1));
      mid.addEventListener('pointerenter', function () { if (current) keep(); });
      mid.addEventListener('pointerleave', function () { if (current) release(current); });
      mid.addEventListener('click', function (e) { e.preventDefault(); if (current && current._open) current._open(); });
      menu.appendChild(mid);
      page.appendChild(menu); page.classList.add('menu-on');
    }
    var pending = null;
    function swapTo(src, then) {
      if (pending) pending.remove();
      pending = node('iframe', 'intro-portal-stage intro-portal-next'); pending.title = ''; pending.setAttribute('aria-hidden', 'true'); pending.tabIndex = -1;
      pending._then = then; page.insertBefore(pending, frame); pending.src = src;
    }
    function openTopic(i) {
      var id = TOPIC[i];
      if (!id) { page.classList.add('topic-soon'); setTimeout(function () { page.classList.remove('topic-soon'); }, 1600); return; }
      topic = id; page.classList.remove('menu-on', 'tag-on'); if (menu) menu.remove(); menu = null;
      swapTo('http://127.0.0.1:3440/world/site-view/index.html?o=underground&shot=' + id, function () {
        drawn = false; below = 'in'; page.classList.add('portal-gone', 'in-underground');
      });
    }
    function backToRing() {
      topic = null; opening = false;
      if (cineEl) { cineEl.remove(); cineEl = null; } cineId = null;
      swapTo(portalView() + '&hold=' + (ringSpawn ? 'SPAWN' : 'RINGVIEW'), function () {
        below = ''; page.classList.remove('in-underground', 'portal-gone'); page.classList.add('portal-drawn'); drawn = true; showMenu();
      });
    }
    function arrive() {
      below = 'in';
      page.classList.add('in-underground');   /* a hard cut: no flash, no fade */
      dispatchEvent(new CustomEvent('ark-portal-entered'));
    }
    /* THE QUESTION (owner, 2026-11-09: "you just get the cinematic run quickly and then you get a question to answer"). When the
       cinema ends (site-view reports cinemaEnd from the scene's own CINEMA range), a hard cut to the question. Words:
       HOME.LANDING.PORTAL.ASK*. The owner shapes what follows it. */
    var ask = node('div', 'intro-ask'); ask.hidden = true;
    var askQ = node('p', 'intro-ask-q', copy('PORTAL.ASK'));
    var askYes = node('a', 'intro-ask-yes mono', copy('PORTAL.ASK.YES')); askYes.href = '/auth'; askYes.setAttribute('data-scene-link', 'auth');
    var askNo = node('a', 'intro-ask-no mono', copy('PORTAL.ASK.NO')); askNo.href = '/'; askNo.setAttribute('data-scene-link', 'zero');
    var askRow = node('div', 'intro-ask-row'); askRow.append(askYes, askNo); ask.append(askQ, askRow); page.appendChild(ask);
    function question() {
      if (!ask.hidden) return;
      ask.hidden = false; page.classList.add('asking');
      frame.src = 'about:blank';   /* the cinema's GPU context goes */
      try { askYes.focus({ preventScroll: true }); } catch (e) { /* focus is a convenience */ }
    }
    ring.addEventListener('click', dive);
    /* no studio on 3440, or it never draws: after 20 s the portal steps aside and the words stay */
    setTimeout(function () {
      if (drawn || gone) return;
      gone = true; ring.hidden = true; page.classList.add('portal-gone', 'portal-missing'); frame.src = 'about:blank';
    }, 20000);
  }

  ArkUI.pageModules.intro = {
    unmount: function () { playing(false); },
    mount: function (host) {
      var page = node('section', 'world-page intro-world');
      page.setAttribute('aria-labelledby', 'intro-title');
      var stage = node('div', 'intro-stage'); stage.setAttribute('data-stage', '');
      /* no [data-panel]: the world draws its glass page slab behind that box, and the intro has no card any more (a
         full-width slab drew a hard line across the screen) */
      var title = node('h1', 'intro-title'); title.id = 'intro-title'; title.textContent = copy('TITLE');
      /* "Replay intro": an 11 mono chip at the dock. Not the complement: the lit thing's chip owns it */
      var again = node('button', 'intro-replay mono', copy('REPLAY')); again.type = 'button'; again.setAttribute('data-ui', '');
      again.addEventListener('click', function () { played = false; window.dispatchEvent(new CustomEvent('ark-intro-replay')); });
      page.appendChild(stage); page.appendChild(title); page.appendChild(again);
      if (portalHere) addPortal(page);
      /* the CMS's insertion point for reusable blocks (js/content/components.js): empty, and out of the layout */
      var anchor = node('div', 'world-insert'); anchor.setAttribute('data-ark-insert', 'main'); page.appendChild(anchor);
      host.appendChild(page);
      window.dispatchEvent(new CustomEvent('ark-intro-mount', { detail: { page: page, wanted: wanted() } }));
      return page;
    }
  };
})();

/* / and /intro: the home. Layer: app. It is the hero (addPortal below): the words and two buttons on the left, the closed portal on the right, the
   status bar and the explore row at the foot, one link on each of the portal's twelve stones. The old intro film and its page chrome (the hidden
   page name, the "Replay intro" chip, the dimmed bar, the mount hand-shake) left on 2026-11-11 with audit findings F01, F12 and F33.

   REDUCTION TEST (the home, 2026-11-11; the audit's answers, updated for what this file now does)
   1 About: FXN, a new network to build on. The headline says it, and it is the page's h1 and the tab's title.
   2 Dominant action: Enter FXN. The bar's Initiate FXN ID is a second amber button, the owner's open call (D2).
   3 Know now: what FXN is, and that devnet genesis is next. Both read at once: no word waits for the 3D.
   4 Hidden until asked: the twelve topics' own pages, behind the bar's menus and the stone links.
   5 Repeated elsewhere: both hero buttons open Learn; the stone links repeat the menus' items (owner's picture, D8).
   6 Only because the data has it: nothing. A figure with no source reads TBA, never 0.
   7 Removable: the status bar's five TBA figures and the second button (owner's call, D8).
   8 Leaving keeps state: yes. The portal frame is kept by the stage.
   9 Returning: the hero stands again on its rest frame, by the mark, the Home link or Back.
   10 If the 3D is missing: the words, the bar and the dock stay; the portal and the stone links step out.
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
  /* THE OLD INTRO FILM NEVER PLAYS (owner ruling 2026-11-11, audit F01 and F33: the home is the hero on every host). The world part that held it
     (js/space/intro.mjs: "Welcome to FXN.", "Switch on the kernel", "A rehearsal. Nothing is live.") asks this page whether a load wants the film;
     the answer is always no. The part itself stays loaded because the role picker (ark-quest-open) lives in the same file */
  ArkUI.introPage = { key: 'defxn-intro-film-v1', wanted: function () { return false; } };

  /* THE HERO (owner, 2026-11-11: the ring menu left the site; navigation is the top bar's menus, js/resolvers/header.js). Layer: app.
     The home is the load, then the hero, and it ends there: the words on the left (tag, headline, line, the Enter FXN link) and the
     closed Portal 101 on the right, still. The portal is a picture: nothing lies over it, so it takes no click and no hover. Enter FXN is
     a plain link to /learn. The 3D is on THE STAGE (js/ark/stage.js, ArkUI.stage), one surface above the routes. The hero's words, the dock and
     the stone links are built on every host; the portal shows wherever the stage finds its 3D frame (ArkUI.stage.ready: the site's bundled view,
     or the studio in local development), and where it finds none the words stand alone. Words: HOME.LANDING.PORTAL.*. Layout:
     css/world-pages.css "intro portal". The ring menu, its twelve stones, the emblem flight into a topic page and the way back are in
     /Volumes/PortableSSD/archive/site-ring-menu-2026-11-11/. */

  /* THE HOME'S PARTS ARE SHARED (2026-11-11): the line icons, the feature items and the rounded bar are built by js/content/topics.js
     (ArkTopics.lineIcon, .features, .statusBar, .networkFigures), which this page loads first (js/pages/catalog.js), so the home, the topic
     pages and Learn draw them from one place. The figures' one source is ArkUI.homeStatus (js/pages/catalog.js, a file every page loads). */

  /* THE DOCK (owner reference, 2026-11-11): the status bar and, under it, the explore row, at the foot of the home hero. Layer: app.
     The status bar leads with the network's state (its dot is not lit: the chain is not live), then five figures, each from ArkUI.homeStatus:
     the price first, then the four network figures every inner page's bar shows too.
     The explore row's chips are never typed: one product for each lane of the product kit (DefxnKit.LANES), the lane's first product that has
     a public page (its `site`), drawn with its own mark (DefxnKit.productMark) and linked to that page (DefxnKit.productHref). A lane with no
     public page shows no chip: on 2026-11-11 that is DeFi, whose one product has no page yet. Words: HOME.LANDING.STATUS.* and HOME.LANDING.EXPLORE.*. Layout: css/world-pages.css "home dock". */
  function homeDock() {
    var dock = node('div', 'intro-dock');
    var bar = ArkTopics.statusBar(copy('STATUS.LABEL'), { text: copy('STATUS.STATE'), lit: false },
      [{ id: 'price', name: copy('STATUS.PRICE'), value: ArkUI.homeStatus.read('price') }].concat(ArkTopics.networkFigures()), copy('STATUS.TBA'));
    var row = node('div', 'intro-explore'), say = node('div', 'intro-explore-words');
    say.append(node('p', 'intro-explore-caption mono', copy('EXPLORE.CAPTION')), node('p', 'intro-explore-line', copy('EXPLORE.LINE')));
    var chips = node('ul', 'intro-chips'); chips.setAttribute('aria-label', copy('EXPLORE.LABEL'));
    var K = window.DefxnKit;
    if (K && K.LANES && K.PRODUCTS && K.productMark) K.LANES.forEach(function (lane) {
      var p = K.PRODUCTS.filter(function (x) { return x.lane === lane.id && !!x.site; })[0];
      if (!p) return;
      var chip = node('a', 'intro-chip'); chip.href = (K.productHref && K.productHref(p)) || p.site;
      chip.append(K.productMark(p.id, { size: 18, className: 'intro-chip-mark' }), node('span', '', p.name));
      var li = node('li'); li.appendChild(chip); chips.appendChild(li);
    });
    row.append(say, chips); dock.append(bar, row);
    return dock;
  }
  function addPortal(page) {
    var stage = ArkUI.stage, root = document.documentElement, subs = [];
    /* THE WORDS (the pill tag, the headline, the line, the two buttons, the three feature items) are written by one writer, ArkTopics.heroWords
       (js/content/topics.js): the page's one h1 is the headline (audit F12; the section is named by it, aria-labelledby in mount); the filled
       button (owner 2026-11-11) is a plain link to Learn, the site's start page, and the outlined one opens the same page, said as what the
       visitor finds there (neither is .mono: the buttons are set in the sans, and `.world-page .mono` would outrank the shared button class);
       the feature items are a line icon, a name and one short line (HOME.LANDING.HERO.F1-F3).
       THE WORDS THE VISITOR ALREADY READS ARE TAKEN, NOT BUILT AGAIN (2026-11-11, speed lane 1C). On a fresh load index.html carries the same
       words as markup (#hero-first, written by the build with the same writer, shown by js/loader-plaza.js at the first paint). This page takes
       that node: it is moved in when the router shows the page (taking, below), so the words a visitor is reading never blink. The markup is
       checked against what this page would write and replaced when it differs (a word changed and the shell not built again, or an address in
       hash form), so the manifest stays the one source. With no such node (a visit inside the site after the first) the words are built here */
    var learnHref = ArkUI.route.href(ArkUI.pageCatalog && ArkUI.pageCatalog.learn ? ArkUI.pageCatalog.learn.path : '/learn');
    var wordsHTML = ArkTopics.heroWords(ArkTopics.heroSpec(copy, learnHref));
    var first = document.getElementById('hero-first'), words = first && first.querySelector('.intro-portal-words');
    if (words) { if (words.innerHTML !== wordsHTML) words.innerHTML = wordsHTML; }
    else { first = null; words = node('div', 'intro-portal-words'); words.innerHTML = wordsHTML; }
    /* the page behind a button loads while the pointer or focus rests on it */
    Array.prototype.forEach.call(words.querySelectorAll('.intro-portal-enter, .intro-portal-second'), function (a) {
      ['pointerenter', 'focus'].forEach(function (type) { a.addEventListener(type, function () { if (ArkUI.warmPage) ArkUI.warmPage('learn'); }); });
    });
    var edge = node('div', 'intro-hero-edge'); edge.setAttribute('aria-hidden', 'true');
    var veil = node('div', 'intro-load-veil'); veil.setAttribute('aria-hidden', 'true');
    var dock = homeDock(), stones = node('div', 'intro-stones');
    /* where the taken words go: a mark that holds their place in the page until the page shows */
    var wordsAt = first ? document.createComment('the hero words') : words;
    /* the document order is the tab order (audit F11): the hero's buttons, then the stone links, then the dock's chips. The bar comes before the
       page (js/resolvers/header.js onMount) */
    page.appendChild(edge); page.appendChild(veil); page.appendChild(wordsAt); page.appendChild(stones); page.appendChild(dock);
    /* THE WORDS MOVE IN WHEN THE PAGE SHOWS, NOT WHEN IT IS MOUNTED. The router mounts a page hidden (js/ark/page-router.js: el.hidden = true,
       and css/world-pages.css .world-page[hidden] is display: none) and shows it a moment later. Moved in at the mount, the words stood in a box
       that was not drawn, so their entrance started again from nothing (seen 2026-11-11 in the FXN Browser: the headline's animation went from
       183 ms back to 0). Until the page shows they stay where the visitor reads them, over the load screen, on the same pixels.
       moveBefore keeps the entrance running where it is; a plain insert would start it again, so there the words stand as they are
       (.is-taken, css/loader-plaza.css) when the visitor could already see them */
    if (first) {
      var taking = new MutationObserver(function () {
        if (page.hidden || !page.isConnected) return;
        taking.disconnect();
        var seen = first.classList.contains('is-on');
        try { page.moveBefore(words, wordsAt); } catch (e) { if (seen) words.classList.add('is-taken'); page.insertBefore(words, wordsAt); }
        wordsAt.remove(); first.remove(); first = null;
      });
      taking.observe(page, { attributes: true, attributeFilter: ['hidden'] });
    }
    /* THE WORDS NEVER WAIT FOR THE 3D (audit F05, 2026-11-11: every word stayed hidden 10 to 15 s). .hero-words shows the words and the dock at once;
       html.hero-up tells the load screen to go see-through and lets the bar in (css/loader-plaza.css). Only the stone links wait for the portal */
    page.classList.add('has-portal', 'hero-words'); root.setAttribute('data-portal-up', ''); root.classList.add('hero-up');

    /* The stage's messages, routed here while this page lives (the router removes the page after a navigation, so every listener is
       dropped with it: arkDispose). The world behind is held by the stage. */
    function sub(type, fn) { subs.push(stage.on(type, fn)); }
    page.arkDispose = function () {
      subs.forEach(function (off) { off(); }); subs = []; gone = true; heroSet(false, 0); root.classList.remove('hero-up'); root.removeAttribute('data-hero-wait');
      /* a page that goes before it ever showed leaves the first paint's words where they were: they step out with it */
      if (first) { taking.disconnect(); first.classList.remove('is-on'); }
      /* the visitor left during the load (the bar is up, so they can): the load screen ends now and the next page shows */
      if (root.classList.contains('plaza-hold')) dispatchEvent(new Event('plaza-assembled'));
    };
    /* the hero owns the screen: the footer steps out while it shows and comes back on any other page (css world-pages.css) */
    function chrome() { if (gone || page.hidden || page.classList.contains('portal-gone')) root.removeAttribute('data-portal-ring'); else root.setAttribute('data-portal-ring', ''); }
    new MutationObserver(chrome).observe(page, { attributes: true, attributeFilter: ['hidden'] }); chrome();
    var drawn = false, gone = false;
    sub('segments', function (d, from) {
      if (from !== 'portal') return;
      /* a document with the hero camera says where it draws the portal; one before it (no HEROIN) holds the portal on the centre */
      PORTAL_AT = d.portalAt || (d.heroIn ? PH.NOW : { x: .5, y: .4765, R: .3228 });
      loadStops = Array.isArray(d.stops) && d.loadStart && d.heroIn ? d.stops : null; loadStart = d.loadStart || null;
      if (heroOn) heroSet(true, 0, loading);
    });
    /* where the ring stands on screen is kept per viewer, so the next visit's outline (the ghost below) starts on the right place */
    sub('ring', function (r, from) { if (from !== 'portal') return; try { localStorage.setItem('defxn-portal-ring', JSON.stringify({ x: r.x, y: r.y, r: r.r, w: innerWidth, h: innerHeight })); } catch (x) { /* only a convenience */ } });
    /* a frame that has drawn can take asks: a rest that is wanted (a fresh rest frame, or a load nobody watched) is asked for now, twice */
    sub('drawn', function (d, from) { if (from !== 'portal') return; drawn = true; page.classList.add('portal-drawn'); if (wantRest) askRest(3); });
    sub('held', function (h, from) {
      if (from !== 'portal') return;
      /* HEROIN held (after the load's last stop), PORTALIN held (a document with no stops) or PORTALREST held (a move inside the site, reduced motion): the
         portal stands closed and still as the hero. Nothing plays after this. */
      /* (with reduced motion HEROIN is the answer to ?hold=, and the loader ends by its own cross-fade once the frame has drawn) */
      if (h === 'PORTALIN' || (h === 'HEROIN' && playedIn)) { if (!still()) dispatchEvent(new Event('plaza-assembled')); portalReady(); return; }
      /* THE ?hold= FRAME IS NOT RELIED ON (seen 2026-11-11 in the FXN Browser, three times: a fresh frame asked ?hold=HEROIN showed the plaza, once
         with the mark and once without, and once answered `drawn` with no `held` at all; the same frame asked for frame 2763 by range a minute
         later showed the hero). site-view checks the held name against the document before the document has finished loading, so the hold can
         be dropped. And with motion on, an ask sent in the same moment as that answer got no reply at all (seen twice: the frame stayed hidden for
         good, while the same ask a minute later was answered at once), so something in the frame takes the player's turn just after it draws.
         So the hero's rest is asked for by name once the frame has drawn (askRest, from the `drawn` listener above), three times, 600 ms apart,
         each on its own clock and never waiting for the answer before it; the frame stays out of sight meanwhile (html[data-hero-wait]) and
         the stone links wait for the answer to the LAST ask. ASK FOR THE 3D LANE: make ?hold= wait for the loaded document and hold; then one ask is enough */
      if (h === 'HEROIN' || h === 'PORTALREST') { if (!wantRest) holdHero(3); return; }
      /* the hero's rest frame, the answer to the last ask of askRest(): drawn, so the stone links may show */
      if (/^HEROREST/.test(h)) { if (wantRest && h === restFinal) { wantRest = false; portalReady(); } return; }
      /* the frame opened on the empty ground itself (?hold=LOADSTART, a document with the load stops): once the studio has drawn it the loader may go
         live onto it. Nothing else has been drawn, so no plaza shows under the see-through loader first.
         THE 150 ms IS NEEDED BY THE FRAME, NOT BY THE PICTURE (2026-11-11, speed lane 1, measured in the FXN Browser). With two animation frames
         in its place the loader went live 29 ms after this answer and asked for stop 0 at once: the frame never answered `held stop:0`, the
         loader's 3 s ceiling ran out, and the film stood on the empty ground for 3.2 s (stops 1 to 14 then played on the clock). With 150 ms the
         first ask is answered (the build node's five loads, and the walk after this was put back). It is the defect named above ("an ask sent in
         the same moment as that answer got no reply at all"). ASK FOR THE 3D LANE: site-view must answer a range asked right after `held` with
         `drawn`; then this wait can be two animation frames (about 120 ms sooner into the film).
         THE FRAME WAS FIXED, SO THE WAIT IS TWO ANIMATION FRAMES (2026-11-11, speed lane 2C). Cause of the lost answer: the studio's load counts
         reached site-view's ask listener and ended the range that was playing (fxn-3d world/site-view/index.html, "ONLY THE PAGE THAT FRAMES THIS
         VIEW ASKS"). With that fixed a range asked one frame after `held` is answered every time (20 of 20 cold loads on the build node). Two
         frames, so the frame's picture is on screen before the loader goes see-through onto it. A page that gets no animation frames (a tab
         opened in the background) starts by the old 150 ms clock instead, whichever comes first, once */
      if (h === 'LOADSTART') {
        var begun = false, begin = function () { if (begun) return; begun = true; if (rested || gone) return; dispatchEvent(new Event('plaza-drawn')); if (!window.ArkPlazaStops && loadStops) post({ range: loadStops[0], tag: 'stop:0' }); };
        requestAnimationFrame(function () { requestAnimationFrame(begin); }); setTimeout(begin, 150); return; }
      /* THE LOAD AS STOPS (portal101r110; fxn-3d geometry.mjs PLAZASTOPS): a document that has them opens on the empty ground (LOADSTART) and each stop
         is played alone when its load has landed. The loader owns that (window.ArkPlazaStops true: it posts { range: stops[n], tag: 'stop:' + n }
         itself). With no owner the stops play here, one after another, never two at once. Enter waits for the last one (stopsDone) */
      if (/^stop:/.test(h)) { stopAt = +h.slice(5) + 1; if (stopAt >= loadStops.length) { if (enterWaits) { enterWaits = false; heroIn(); } } else if (!window.ArkPlazaStops) post({ range: loadStops[stopAt], tag: 'stop:' + stopAt }); return; }
      if (h === 'PLAZAREST' && loadStops && !still()) {
        /* the frame steps to the empty ground, and 150 ms later (the studio has drawn it) the loader may go see-through onto it */
        post({ frame: loadStart[0] }); setTimeout(function () { dispatchEvent(new Event('plaza-drawn')); if (!window.ArkPlazaStops) post({ range: loadStops[0], tag: 'stop:0' }); }, 150); return; }
      /* r2 (never blank): the loader's own still reveals the plaza from the first paint while the studio loads, so the portal frame opens on
         PLAZAREST, the frame that still ends on, and the loader goes see-through onto it with no jump */
      if (h === 'PLAZAREST') { dispatchEvent(new Event('plaza-drawn')); return; }
    });
    /* the GPU dropped the portal's context: the stage loads the hero's portal once more */
    sub('lost', function (d, from) { if (from !== 'portal') return; drawn = false; page.classList.remove('portal-drawn'); setTimeout(function () { if (!page.hidden && !gone) freshRest(true); }, 1000); });

    /* THE HOME HERO (owner 2026-11-11; fxn-3d docs/design/direction/portal-101/NOTES.md "The load board and the home hero"). The portal holds on the right
       (its centre at HERO.x of the width) and the words stand on the left; on a 4:3 or narrow view the portal stands above and the words below. The
       portal frame is moved by one CSS transform (css/world-pages.css --hero-t), eased over the film that plays under it (PORTALIN in),
       so the camera's move and the frame's move read as one. PORTAL_AT is where the document's own portal hold stands in the drawn frame: its centre
       as shares of the frame's width and height, and its outer radius as a share of the frame's height (measured on portal101r109 at 1440 x 900; a
       document whose camera already aims the portal to the right posts its own, and the shift it needs is then zero). The frame is drawn no narrower
       than 1.6:1 and scaled to the width (fxn-3d portal101 MIN_ASPECT) */
    /* the arithmetic of both places (the hero's, and the load's in the portal's place) is js/loader-plaza.js ArkPlazaHero, shared with the first paint */
    var PH = window.ArkPlazaHero, HERO = PH.HERO, PORTAL_AT = PH.NOW, heroOn = false, loading = false;
    var loadStops = null, loadStart = null, stopAt = 0, enterWaits = false, rested = false, wantRest = false, restSeq = 0, restFinal = '', playedIn = false;
    /* asks the frame for the hero's rest by the range's NAME, so the site holds no frame number: HEROIN at a rate that reaches its last frame on the
       first step, answered by `held HEROREST<n>` (a document without HEROIN answers the same tag with missing, and the frame it holds is its rest).
       times: how many asks, 600 ms apart, each sent on the clock; only the answer to the last one (restFinal) counts */
    function askRest(times) {
      var tag = 'HEROREST' + (++restSeq); restFinal = times > 1 ? '' : tag;
      post({ play: 'HEROIN', tag: tag, rate: 9600 });
      if (times > 1) setTimeout(function () { if (!gone && wantRest) askRest(times - 1); }, 600);
    }
    /* a fresh frame asked to hold the rest stays out of sight until the rest frame has really been drawn (css/world-pages.css html[data-hero-wait]);
       the ask itself goes out when the frame says it has drawn */
    function freshRest(reload) { wantRest = true; rested = true; root.setAttribute('data-hero-wait', ''); heroSet(true, 0); page.classList.remove('hero-veil'); return stage.showPortal({ hold: REST, reload: !!reload }); }
    /* THE HERO'S REST (audit F02, 2026-11-11: an empty ground with no portal). The hero-only document (portal101r112h3) has no PORTALREST: its rest is
       the LAST frame of HEROIN. REST asks site-view for that frame and falls back to PORTALREST on a document before it (?hold=A.B holds the first
       name the document has). Every path that shows the hero without the load holds it: reduced motion, a visit inside the site, a restored page,
       a load nobody watched */
    var REST = 'HEROIN.PORTALREST';
    /* Enter at the loader: the plaza's stones lift into the portal (HEROIN from the load's last stop) while the frame moves from the load's place to
       the hero's. A document with no load stops has no film to play, so the hero stands at once */
    function heroIn() { if (gone || page.hidden) return; if (loadStops) { playedIn = true; heroSet(true, 2250); post({ play: 'HEROIN' }); } else portalReady(); }
    /* the hero with no film: the frame takes its hero place at once and is asked for the rest frame; `held HEROREST` then shows the stone links.
       A frame that has not drawn yet cannot hear the ask: it is asked again when it draws (the `drawn` listener) */
    function holdHero(asks) {
      if (gone) return;
      rested = true; enterWaits = false; wantRest = true; heroSet(true, 0); page.classList.remove('hero-veil');
      askRest(asks || 1);
    }
    function stacked() { return PH.stacked(); }
    function heroWant() { return PH.hero(PORTAL_AT, words.offsetHeight); }
    /* load: true = the load's place (the plaza small, in the portal's place); the same call without it is the hero's place */
    function heroSet(on, ms, load) {
      heroOn = on; loading = !!(on && load); root.style.setProperty('--hero-ms', (ms || 0) + 'ms');
      if (!on) { root.removeAttribute('data-hero'); return; }
      page.classList.toggle('hero-stack', stacked());   /* first, so the words' own height is the stacked one */
      var w = heroWant(), t = loading ? PH.load(PORTAL_AT, words.offsetHeight) : w; page.classList.toggle('hero-stack', w.stack);
      if (loading) { page.style.setProperty('--veil-solid', t.solid + 'px'); if (PH.placeLoad) PH.placeLoad(PORTAL_AT, words.offsetHeight); }   /* the veil over the frame and the drawn ground of the load screen fade over the same pixels */
      root.style.setProperty('--hero-t', 'translate(' + t.dx + 'px, ' + t.dy + 'px) scale(' + t.k + ')'); root.setAttribute('data-hero', loading ? 'load' : '');
      /* the cut edge of the moved frame: its left edge when the portal stands right, its lower edge (under the words) when stacked */
      if (w.stack) Object.assign(edge.style, { left: '0', right: '0', top: (w.low - 96) + 'px', bottom: '0', width: '' });
      else Object.assign(edge.style, { left: '0', top: '0', bottom: '0', right: '', width: (w.dx + 96) + 'px' });
    }
    /* THE STONE WORDS (owner reference, 2026-11-11): one HTML word over each of the portal's twelve stones, a plain link to that topic's page.
       The hero document posts no place for a stone, so each word stands on fixed shares of the drawn frame, measured on the held hero at
       1440 x 900: the stones' ring is a circle on screen, its centre STONE.cx of the frame height right of HERO.x and STONE.cy of it above the
       middle, the words STONE.R of it from that centre, one every 30 degrees clockwise from the top. The topics and their order are
       ArkSitePages.topics(), the words the ring's own copy (HOME.LANDING.RING.S<n>). Placed once the hero has settled and again on a
       resize, never per frame, so a word cannot jitter. Hidden when stacked (css) */
    var STONE = { R: .24, cx: .0096, cy: -.07 }, stoneLinks = null;
    function stonesBuild() {
      if (stoneLinks || typeof ArkSitePages === 'undefined') return;
      stoneLinks = ArkSitePages.topics().slice(0, 12).map(function (t, i) {
        var name = copy('RING.S' + (i + 1)), a = node('a', 'intro-stone mono', name);
        a.href = ArkUI.route.href(t.path); a.setAttribute('aria-label', name); a.setAttribute('data-scene-link', t.key);
        stones.appendChild(a); return a;
      });
    }
    function stonesPlace() {
      if (!stoneLinks) return;
      var W = innerWidth, H = innerHeight, Hd = Math.min(H, W / 1.6), cx = HERO.x * W + STONE.cx * Hd, cy = H / 2 + STONE.cy * Hd;
      stoneLinks.forEach(function (a, i) {
        var t = i * Math.PI / 6;
        a.style.left = Math.round(cx + STONE.R * Hd * Math.sin(t)) + 'px'; a.style.top = Math.round(cy - STONE.R * Hd * Math.cos(t)) + 'px';
      });
    }
    addEventListener('resize', function () { if (heroOn && !gone && !page.hidden) { heroSet(true, 0, loading); stonesPlace(); } });
    /* a page restored from the browser's back-forward cache stands as it was left: the hero is asked to hold its rest frame again */
    addEventListener('pageshow', function (e) { if (e.persisted && !gone && !page.hidden && !root.classList.contains('plaza-hold')) holdHero(1); });
    /* the hero stands: the words are placed from their measured height, the portal is drawn, and the lazy loads that wait for the hero (js/lib/frame.js ArkFrame.afterHero) may start */
    function portalReady() {
      if (gone || absent) return;
      root.removeAttribute('data-hero-wait');
      heroSet(true, 0);   /* the same place again, now with the words' measured height */
      page.classList.add('portal-view', 'portal-drawn'); page.classList.remove('opening', 'hero-veil'); chrome(); drawn = true;
      stonesBuild(); stonesPlace(); page.classList.add('stones-on');
      window.dispatchEvent(new Event('ark-hero-settled'));
    }
    /* the first show (owner 2026-11-10, "stop the auto animate"): under the loading screen (js/loader-plaza.js, html.plaza-hold) the portal frame opens
       on the empty ground (LOADSTART, or the plaza at rest on a document without the load stops), in the load's place, with the veil over its edges;
       the loader plays the stops and its plaza-open lifts the stones into the portal (HEROIN), which then holds as the hero. With reduced motion, or
       with no loading screen, the page opens on the hero's rest frame (REST), already in its hero place. The 20 s missing check starts with it */
    function showFirst() {
      var plaza = root.classList.contains('plaza-hold') && !still();
      if (plaza) { heroSet(true, 0, true); page.classList.add('hero-veil'); stage.showPortal({ hold: PH.LOAD_HOLD }); } else freshRest();
      setTimeout(missing, 20000);
      /* HEROIN's camera eases over its first 54 frames (2.25 s at 24 a second); the frame's move takes the same time on the same curve (heroIn).
         A load that was not played (a tab nobody looked at, a studio that answered late: the loader says ArkPlazaSkipped) has no lift to show:
         the hero holds its rest frame */
      if (plaza) addEventListener('plaza-open', function () {
        if (gone) return;
        if (window.ArkPlazaSkipped || document.hidden) { holdHero(2); return; }
        if (loadStops && stopAt < loadStops.length) { enterWaits = true; if (window.ArkPlazaStops) return; } else heroIn();
      }, { once: true });
    }
    /* a visit inside the site (the mark, the Home link, the browser's Back from a page): a frame the stage kept is asked for the hero's rest frame, whatever
       it showed when the visitor left (it may have been mid-load); a frame the stage lost or never had is loaded again on that frame. The words stand
       at once; the stone links wait for the frame's answer */
    var returning = stage.portal().exists || stage.current === 'topic';
    if (!returning) showFirst();
    else {
      if (stage.portal().alive) { heroSet(true, 0); stage.showPortal({ hold: REST }); drawn = true; Promise.resolve().then(function () { holdHero(1); }); }
      else { freshRest(true); setTimeout(missing, 20000); }
    }

    /* NEVER BLANK (owner, 2026-11-09: "first it is blank and then the object shows up"). While the studio loads, a mint outline of
       the ring draws itself at once where the ring will stand: the last place the studio reported (kept per viewer), else its usual
       place at this aspect (measured at 1440x900: centre .788, .447 of the view, radius .1417 of its width). When the studio has drawn,
       the outline fades. */
    var NS = 'http://www.w3.org/2000/svg', ghost = document.createElementNS(NS, 'svg'), gc = document.createElementNS(NS, 'circle'), gi = document.createElementNS(NS, 'circle');
    ghost.setAttribute('class', 'intro-portal-ghost'); ghost.setAttribute('aria-hidden', 'true');
    gc.setAttribute('class', 'outer'); gi.setAttribute('class', 'inner'); ghost.append(gc, gi); page.appendChild(ghost);
    function ghostAt(r) {
      ghost.setAttribute('viewBox', '0 0 ' + innerWidth + ' ' + innerHeight);
      [[gc, r.r], [gi, r.r * .78]].forEach(function (c) { c[0].setAttribute('cx', r.x); c[0].setAttribute('cy', r.y); c[0].setAttribute('r', c[1]); c[0].setAttribute('pathLength', '1'); });
    }
    var kept = null; try { kept = JSON.parse(localStorage.getItem('defxn-portal-ring') || 'null'); } catch (e) { kept = null; }
    ghostAt(kept && kept.w === innerWidth && kept.h === innerHeight ? kept : { x: innerWidth * .788, y: innerHeight * .447, r: innerWidth * .1417 });

    function post(msg) { stage.post(msg, 'portal'); }
    /* this host has no 3D frame at all (ArkUI.stage.ready answered false): the portal steps aside at once and the words stay. No stone links: they
       name places on a portal that is not drawn; the bar's menus reach the same twelve pages */
    var absent = false;
    stage.ready.then(function (ok) { if (!ok) { absent = true; missing(); } });
    /* the 3D source is there but never draws: after 20 s the portal steps aside and the words stay */
    function missing() {
      if (drawn || gone || page.hidden) return;
      page.classList.add('portal-gone', 'portal-missing'); page.classList.remove('hero-veil'); root.removeAttribute('data-hero-wait'); stage.off(); chrome();
      window.dispatchEvent(new Event('ark-hero-settled'));
    }
  }


  ArkUI.pageModules.intro = {
    unmount: function () { document.documentElement.removeAttribute('data-intro'); },
    mount: function (host) {
      var page = node('section', 'world-page intro-world');
      /* the section is named by the headline, the page's one h1 (addPortal; audit F12: the h1 was a hidden word) */
      page.setAttribute('aria-labelledby', 'intro-title');
      var stage = node('div', 'intro-stage'); stage.setAttribute('data-stage', '');
      /* no [data-panel]: the world draws its glass page slab behind that box, and the intro has no card any more (a
         full-width slab drew a hard line across the screen) */
      page.appendChild(stage);
      addPortal(page);
      /* the CMS's insertion point for reusable blocks (js/content/components.js): empty, and out of the layout */
      var anchor = node('div', 'world-insert'); anchor.setAttribute('data-ark-insert', 'main'); page.appendChild(anchor);
      host.appendChild(page);
      return page;
    }
  };
})();

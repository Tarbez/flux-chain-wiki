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
  function wanted() { return loadedOnIntro && !played; }
  function playing(on) {
    if (on) document.documentElement.setAttribute('data-intro', 'playing'); else document.documentElement.removeAttribute('data-intro');
  }
  window.addEventListener('ark-intro-state', function (e) {
    var d = e.detail || {};
    playing(!!d.playing);
    if (d.done) played = true;
  });
  ArkUI.introPage = { key: FILM_KEY, wanted: wanted };

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
      /* the CMS's insertion point for reusable blocks (js/content/components.js): empty, and out of the layout */
      var anchor = node('div', 'world-insert'); anchor.setAttribute('data-ark-insert', 'main'); page.appendChild(anchor);
      host.appendChild(page);
      window.dispatchEvent(new CustomEvent('ark-intro-mount', { detail: { page: page, wanted: wanted() } }));
      return page;
    }
  };
})();

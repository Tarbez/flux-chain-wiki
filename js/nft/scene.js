/* DEFXN identity card: the card's ART as a site's SCENE. The card's 3D art layers (backdrop, aura,
   mark, signal, particles) leave the card and dress the page around it, drawn by the card's own
   engine (art3d.js), never by the site's ring world.

   DefxnScene.world(host, record, opts) -> { ready, remove }
       The WORLD: the card's art painted once as the page's background, in a wide view (the mark sits
       right of centre, its backdrop, aura, signal and particles fill the rest). It is a still image:
       painted once per size, with a vignette in the page's --canvas colour on the words' side so text
       stays readable. It leans a little away from the pointer (a CSS transform per pointer move, eased
       by CSS), and stops with the pointer. With prefers-reduced-motion it does not lean or fade.
       It is inserted as the first child of `host`, which the site positions (css/nft-card.css styles
       .nft-world). opts: picks (a worn mix; default the record's own), only (the art layers; default
       WORLD: backdrop, aura, signal and particles, without the mark, because a site shows its own mark
       and a second, large one behind the words competes with them; DefxnScene.ART adds the mark),
       leanOn (the element whose pointer moves lean it; default host), lean: false.
       remove() takes away everything world() added and stops every watcher.
   DefxnScene.avatar(host, record, opts) -> { ready, remove }
       The card's art cut square around the mark, sized to `host` (an account button, a profile). opts:
       picks, only, artWidth (the width the art is painted at before the cut).
   DefxnScene.model / paintWide / cardArt / cut are the drawing steps the design pages share
   (docs/home-redesign/nft/world.js draws its banner and avatar with them).

   Each paint holds the shared renderer only while it paints (Art3D.use) and frees the model's GPU
   scene after it, so a page with a world and no card keeps no WebGL renderer between paints.
   Nothing here runs a frame loop. Sample data: nothing here is live.
   Needs: js/nft/traits.js, js/nft/art3d.js (and what they need). Styles: css/nft-card.css. */
(function () {
  'use strict';

  var T = window.DEFXN_TRAITS, A = window.Art3D;
  if (!T || !A || !A.use) throw new Error('scene.js needs js/nft/traits.js and js/nft/art3d.js loaded before it.');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var ART = ['backdrop', 'aura', 'mark', 'signal', 'particles'];
  var WORLD = ['backdrop', 'aura', 'signal', 'particles'];

  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }
  function glowAlpha() { return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nft-glow-a')) || 0.8; }

  /* ---------- the model: the art layers of a mix, built once ---------- */
  function picksOf(picks, only) {
    var out = { palette: picks.palette };
    (only || ART).forEach(function (k) { if (picks[k]) out[k] = picks[k]; });
    return out;
  }
  var models = {}, order = [];
  function model(record, picks, only) {
    var p = picksOf(picks || T.pick(record).picks, only);
    var sig = T.keyHex(record) + '|' + Object.keys(p).sort().map(function (k) { return k + ':' + (p[k] && p[k].name); }).join('|');
    if (models[sig]) return models[sig];
    order.push(sig);
    if (order.length > 32) delete models[order.shift()];   // its GPU scene is already freed after each paint
    return (models[sig] = A.loadMark().then(function (mark) { return A.build(mark, T.keyOf(record), p); }));
  }

  /* ---------- painting: the art, and its glow added on top ---------- */
  function compose(out, t, w, h, alpha) {
    if (out.width !== w || out.height !== h) { out.width = w; out.height = h; }
    var x = out.getContext('2d');
    x.clearRect(0, 0, w, h); x.drawImage(t.art, 0, 0);
    x.globalCompositeOperation = 'screen'; x.globalAlpha = alpha; x.drawImage(t.glow, 0, 0);
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
  }
  // paint on the scheduler, holding the renderer only for that paint; the model's scene is freed after
  function painted(m, fn) {
    return new Promise(function (resolve, reject) {
      var done = A.use();
      A.schedule(function () {
        try { resolve(fn()); } catch (err) { reject(err); } finally { A.dispose(m); done(); }
      });
    });
  }
  // the wide views: where the camera looks, how close, and how far right the mark sits
  var VIEWS = {
    world: { tilt: { x: 0.05, y: 0.26 }, zoom: 0.92, shift: function (aspect) { return 350 * aspect * 0.34; }, glow: function () { return 0.8; } },
    banner: { tilt: { x: 0.06, y: 0.22 }, zoom: 1.15, shift: function (aspect, zoom) { return 350 * aspect / zoom * 0.42; }, glow: glowAlpha },
    panel: { tilt: { x: 0.04, y: 0.2 }, zoom: 1.05, shift: function (aspect) { return 350 * aspect * 0.4; }, glow: function () { return 0.7; } }
  };
  function paintWide(cv, m, pw, ph, view) {
    var t = { art: el('canvas'), glow: el('canvas') }, aspect = pw / ph;
    A.paint(t, m, pw, ph, view.tilt, { object: true, aspect: aspect, zoom: view.zoom, shift: view.shift(aspect, view.zoom) });
    compose(cv, t, pw, ph, view.glow());
    return cv;
  }
  // the card's own view, painted once per mix and width (an avatar is cut from it)
  var arts = {};
  function cardArt(record, picks, only, width) {
    var w = width || 1400, p = picksOf(picks || T.pick(record).picks, only);
    var sig = T.keyHex(record) + '|' + Object.keys(p).sort().map(function (k) { return k + ':' + (p[k] && p[k].name); }).join('|') + '|' + w;
    if (arts[sig]) return arts[sig];
    return (arts[sig] = model(record, picks, only).then(function (m) {
      return painted(m, function () {
        var t = { art: el('canvas'), glow: el('canvas') }, h = Math.round(w * 0.7), out = el('canvas');
        A.paint(t, m, w, h, A.REST);
        compose(out, t, w, h, glowAlpha());
        return out;
      });
    }));
  }
  // a cut of the card's art, in card units (the card is 1000 x 700; the mark's box is x 480-880, y 84-630)
  var AVATAR = { x: 380, y: 57, w: 600, h: 600 };
  function cut(cv, src, box, w, h) {
    var dpr = Math.min(2, window.devicePixelRatio || 1), pw = Math.round(w * dpr), ph = Math.round(h * dpr);
    if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
    var x = cv.getContext('2d'), k = src.width / 1000, fx = pw / box.w, fy = ph / box.h;
    x.clearRect(0, 0, pw, ph);
    var sx0 = Math.max(0, box.x), sy0 = Math.max(0, box.y), sx1 = Math.min(1000, box.x + box.w), sy1 = Math.min(700, box.y + box.h);
    if (sx1 <= sx0 || sy1 <= sy0) return;
    x.drawImage(src, sx0 * k, sy0 * k, (sx1 - sx0) * k, (sy1 - sy0) * k, (sx0 - box.x) * fx, (sy0 - box.y) * fy, (sx1 - sx0) * fx, (sy1 - sy0) * fy);
  }

  /* ---------- the world: the page's background ---------- */
  function world(host, record, opts) {
    opts = opts || {};
    var bg = el('div', 'nft-world'), cv = el('canvas'), alive = true, last = '', timer = 0, m = null, first = null;
    bg.setAttribute('aria-hidden', 'true');
    bg.appendChild(cv);
    host.insertBefore(bg, host.firstChild);
    var ready = new Promise(function (resolve) { first = resolve; });
    function draw() {
      if (!alive || !m || !bg.clientWidth) return;
      var cw = bg.clientWidth, ch = bg.clientHeight;
      // at most 1.5 pixels per CSS pixel, and near 2.6 million pixels in all (as the card)
      var dpr = Math.min(1.5, window.devicePixelRatio || 1, Math.sqrt(2.6e6 / (cw * ch)));
      var w = Math.round(cw * dpr), h = Math.round(ch * dpr), k = w + 'x' + h;
      if (k === last) return;
      last = k;
      painted(m, function () { if (alive) { paintWide(cv, m, w, h, VIEWS.world); bg.classList.add('is-drawn'); } return cv; })
        .then(function () { if (alive && first) { first(cv); first = null; } }, function (err) { console.error(err.message); });
    }
    model(record, opts.picks, opts.only || WORLD).then(function (mm) { m = mm; draw(); }, function (err) { console.error(err.message); if (first) { first(null); first = null; } });
    var ro = window.ResizeObserver ? new ResizeObserver(function () { clearTimeout(timer); timer = setTimeout(draw, 150); }) : null;
    if (ro) ro.observe(bg);
    // the lean: the world moves a little against the pointer, eased by CSS, and stops with it
    var leanOn = opts.lean === false ? null : (opts.leanOn || host);
    function lean(e) {
      if (reduce && reduce.matches) return;
      var r = leanOn.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
      bg.style.transform = 'translate(' + (-nx * 18).toFixed(1) + 'px,' + (-ny * 12).toFixed(1) + 'px) scale(1.04)';
    }
    function rest() { bg.style.transform = ''; }
    if (leanOn) { leanOn.addEventListener('pointermove', lean); leanOn.addEventListener('pointerleave', rest); }
    return {
      ready: ready,
      remove: function () {
        if (!alive) return;
        alive = false;
        clearTimeout(timer);
        if (ro) ro.disconnect();
        if (leanOn) { leanOn.removeEventListener('pointermove', lean); leanOn.removeEventListener('pointerleave', rest); }
        if (bg.parentNode) bg.parentNode.removeChild(bg);
        if (first) { first(null); first = null; }
      }
    };
  }

  /* ---------- the panel art: the card's 3D layers inside one panel ----------
     DefxnScene.panel(host, record, opts) -> { ready, remove }. The card's background, glow, beam and
     particles (no logo), painted once per size as a still image behind `host`'s content: a page header,
     a hero, a profile panel. It never covers the ring world: a site gives it only a panel of its own.
     The host takes `isolation: isolate` (and `position: relative` only when it was static) while the art
     is on, so the art sits under the host's own children without moving any of them. A fade in the
     page's --canvas colour runs from the words' side, so text keeps its contrast (css/nft-card.css).
     remove() takes away the art and the classes it added. opts: picks, only, strength (0 to 1). */
  function panel(host, record, opts) {
    opts = opts || {};
    var art = el('div', 'nft-panel-art'), cv = el('canvas'), alive = true, last = '', timer = 0, m = null, first = null;
    var added = ['nft-has-art'];
    art.setAttribute('aria-hidden', 'true');
    if (opts.strength != null) art.style.setProperty('--nft-panel-a', String(opts.strength));
    art.appendChild(cv);
    if (getComputedStyle(host).position === 'static') added.push('nft-pos');
    added.forEach(function (c) { host.classList.add(c); });
    host.insertBefore(art, host.firstChild);
    var ready = new Promise(function (resolve) { first = resolve; });
    function draw() {
      if (!alive || !m || !art.clientWidth) return;
      var cw = art.clientWidth, ch = art.clientHeight;
      var dpr = Math.min(1.5, window.devicePixelRatio || 1, Math.sqrt(2.6e6 / (cw * ch)));
      var w = Math.round(cw * dpr), h = Math.round(ch * dpr), k = w + 'x' + h;
      if (k === last) return;
      last = k;
      painted(m, function () { if (alive) { paintWide(cv, m, w, h, VIEWS.panel); art.classList.add('is-drawn'); } return cv; })
        .then(function () { if (alive && first) { first(cv); first = null; } }, function (err) { console.error(err.message); });
    }
    model(record, opts.picks, opts.only || WORLD).then(function (mm) { m = mm; draw(); }, function (err) { console.error(err.message); if (first) { first(null); first = null; } });
    var ro = window.ResizeObserver ? new ResizeObserver(function () { clearTimeout(timer); timer = setTimeout(draw, 150); }) : null;
    if (ro) ro.observe(art);
    return {
      ready: ready,
      remove: function () {
        if (!alive) return;
        alive = false;
        clearTimeout(timer);
        if (ro) ro.disconnect();
        if (art.parentNode) art.parentNode.removeChild(art);
        added.forEach(function (c) { host.classList.remove(c); });
        if (!host.getAttribute('class')) host.removeAttribute('class');
        if (first) { first(null); first = null; }
      }
    };
  }

  /* ---------- the avatar: the card's art cut square around the mark ---------- */
  function avatar(host, record, opts) {
    opts = opts || {};
    var cv = el('canvas', 'nft-avatar-art'), alive = true, src = null;
    cv.setAttribute('aria-hidden', 'true');                  // the host names the person
    host.appendChild(cv);
    var dpr = Math.min(2, window.devicePixelRatio || 1), side = Math.max(host.clientWidth, host.clientHeight, 24);
    // paint the art only as wide as the cut needs: the cut is 0.6 of the card's width
    var width = opts.artWidth || Math.min(1400, Math.max(320, Math.ceil(side * dpr / 0.6 * 1.25)));
    function draw() { if (alive && src && host.clientWidth) cut(cv, src, AVATAR, host.clientWidth, host.clientHeight); }
    var ready = cardArt(record, opts.picks, opts.only, width).then(function (s) { src = s; draw(); return alive ? cv : null; });
    ready.catch(function (err) { console.error(err.message); });
    var ro = window.ResizeObserver ? new ResizeObserver(draw) : null;
    if (ro) ro.observe(host);
    return {
      ready: ready,
      remove: function () {
        if (!alive) return;
        alive = false;
        if (ro) ro.disconnect();
        if (cv.parentNode) cv.parentNode.removeChild(cv);
      }
    };
  }

  window.DefxnScene = {
    ART: ART, WORLD: WORLD, VIEWS: VIEWS, AVATAR: AVATAR,
    world: world, panel: panel, avatar: avatar,
    model: model, paintWide: paintWide, cardArt: cardArt, cut: cut, painted: painted
  };
})();

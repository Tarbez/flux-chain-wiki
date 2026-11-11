/* LOADER PICK (owner, 2026-11-09): "put all the 3D logos inside the first loading screen and I will pick one".
   While no logo is chosen, #world-loader shows every candidate as a turning loop in one grid; a click shows that one in
   the real loader layout (logo, "Welcome to FXN.", bar). The loops are rendered from each logo's own 3D document by the
   fxn-3d marks server (POST /edit/<doc>/render, one frame per yaw step) and live in assets/marks/pick/<id>.webm with a
   poster <id>.png. `?marks=off` skips the grid and the loader behaves as before.
   THE SWITCH: when the owner names one, set CHOSEN below to its id (e.g. 'A05'). The grid then never shows and the loader
   plays that loop in place of assets/marks/loading-white.jpg. This is the only line to change.
   Loaded as a plain script right after the loader's markup (the page's CSP allows no inline script), so the pick class is
   on <html> before the 8 s fade could start. */
(function () {
  'use strict';
  var CHOSEN = 'A07';   /* owner's pick, 2026-11-09: A07 champagne, on a transparent ground */
  /* every candidate: id, the 3D document it was rendered from, and its look in one plain line */
  var MARKS = [
    ['A01', 'defxn world/marks/a01.fxn', 'Clear crystal: clear glass, facets, white lit rim'],
    ['A02', 'defxn world/marks/a02.fxn', 'Holographic: lavender glass with a rainbow film'],
    ['A03', 'defxn world/marks/a03.fxn', 'Frosted ice: rough white glass, soft white glow'],
    ['A04', 'defxn world/marks/a04.fxn', 'Cracked aqua ice: cyan glass with cell cracks'],
    ['A05', 'defxn world/marks/a05.fxn', 'Amber: orange glass, warm glow, gold rim'],
    ['A06', 'defxn world/marks/a06.fxn', 'Amethyst: violet glass, facets, purple glow'],
    ['A07', 'defxn world/marks/a07.fxn', 'Champagne: clear glass, warm amber inside'],
    ['A08', 'defxn world/marks/a08.fxn', 'Sapphire: deep blue glass, blue-white rim'],
    ['A09', 'defxn world/marks/a09.fxn', 'Smoky quartz: tan glass with gold veins'],
    ['A10', 'defxn world/marks/a10.fxn', 'Opal: milky white glass, pastel film on the rim'],
    ['F01', 'fxn-3d world/edit/markcrystal.fxn', 'Six thick chamfered crystal pieces, amber bars'],
    ['F02', 'fxn-3d world/edit/markcrystal2.fxn', 'Six crystal pieces, white edge lines, amber bars'],
    ['F03', 'fxn-3d world/edit/markcrystal3.fxn', 'Crystal pieces, edge lines front and back'],
    ['F04', 'fxn-3d world/edit/markfacet.fxn', 'Six faceted crystal pieces, thin edge line'],
    ['F05', 'fxn-3d world/edit/ptmark.fxn', 'Flat-cut rim mark'],
    ['F06', 'fxn-3d world/edit/ptmarkgem.fxn', 'Gem-facet mark'],
    ['F07', 'fxn-3d world/edit/ptmarksmooth.fxn', 'Smooth mark']
  ];
  /* root paths: the page is also served under /fxn/ and /stats/, where a relative path points nowhere */
  var DIR = '/assets/marks/pick/';
  var root = document.documentElement, loader = document.getElementById('world-loader');
  if (!loader) return;
  /* pick mode only on the first load of / or /intro (or with ?marks=pick), never on other routes, so it never blocks the site */
  var q = location.search, forced = /(?:^|[?&])marks=(?:pick|[A-Z]\d\d)(?:&|$)/.test(q), skipped = false;
  try { skipped = sessionStorage.getItem('marks-pick') === 'done'; } catch (e) { /* storage blocked: show the grid once more */ }
  var off = /(?:^|[?&])marks=off(?:&|$)/.test(q) || (!forced && (skipped || !/^\/(?:intro\/?)?$/.test(location.pathname)));
  var mark = loader.querySelector('.mark');

  function loop(id, lazy) {
    var v = document.createElement('video');
    v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'none';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
    v.poster = DIR + id + '.png';
    v.dataset.src = DIR + id + '.webm';
    if (!lazy) { v.src = v.dataset.src; v.autoplay = true; }
    return v;
  }

  /* the chosen logo replaces the flat image in the normal loader; nothing else changes */
  /* with a pick made, the grid shows only when asked for (?marks=pick or ?marks=<id>) */
  if (CHOSEN && mark && !forced) {
    /* the poster paints on the loader's first frame; the video, loading at once, covers it when it can play */
    var img = new Image(); img.src = DIR + CHOSEN + '.png'; img.alt = ''; img.className = 'loop-poster';
    var v = loop(CHOSEN, false); v.preload = 'auto';
    mark.classList.add('is-loop'); mark.appendChild(img); mark.appendChild(v);
    /* both are transparent, so the poster must go once the video plays or two logos would show */
    v.addEventListener('playing', function () { img.style.visibility = 'hidden'; }, { once: true });
    /* first load in a tab: the shell is ready in 0.1-0.3 s, so the loader is held 1.4 s from the logo's first paint and its
       reveal plays once; later loads in the tab skip the hold. The loader takes no clicks, so the page under it stays usable. */
    var first = true;
    try { first = sessionStorage.getItem('loader-seen') !== '1'; sessionStorage.setItem('loader-seen', '1'); } catch (e) { /* storage blocked: hold every load */ }
    if (first) {
      root.classList.add('loader-hold');
      var release = function () { root.classList.remove('loader-hold'); };
      var painted = function () { requestAnimationFrame(function () { setTimeout(release, 1400); }); };
      if (img.complete) painted(); else { img.onload = painted; img.onerror = release; }
      setTimeout(release, 4000);   /* never longer than 4 s, even if the poster never arrives */
    }
    return;
  }
  if (off || (CHOSEN && !forced)) return;

  root.classList.add('marks-pick');
  loader.setAttribute('aria-hidden', 'false');
  var grid = document.createElement('div'); grid.className = 'pick-grid';
  var head = document.createElement('header'); head.className = 'pick-head';
  head.innerHTML = '<h2>Pick the loading logo</h2><p>' + MARKS.length + ' logos. Click one to see it in the loader.</p><button type="button" class="pick-skip">Skip</button>';
  /* Skip: the loader goes away for this tab and stops taking clicks; ?marks=pick brings the grid back */
  head.querySelector('.pick-skip').addEventListener('click', function () {
    root.classList.remove('marks-pick', 'marks-full'); root.classList.add('marks-done');
    loader.setAttribute('aria-hidden', 'true');
    loader.querySelectorAll('video').forEach(function (v) { v.pause(); v.removeAttribute('src'); v.load(); });
    try { sessionStorage.setItem('marks-pick', 'done'); } catch (e) { /* storage blocked: the grid shows again on the next load of / */ }
  });
  MARKS.forEach(function (m) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'pick-tile'; b.dataset.id = m[0];
    b.title = m[1];
    b.appendChild(loop(m[0], true));
    var cap = document.createElement('span'); cap.className = 'pick-cap'; cap.textContent = m[0] + '  ' + m[2];
    b.appendChild(cap); grid.appendChild(b);
  });
  var back = document.createElement('button'); back.type = 'button'; back.className = 'pick-back'; back.textContent = 'Back to all';
  var label = document.createElement('span'); label.className = 'pick-label';
  loader.insertBefore(head, loader.firstChild); loader.appendChild(grid); loader.appendChild(back); loader.appendChild(label);

  /* lazy: a tile's loop loads only when it is on screen; the poster paints first, so the site under it keeps its bandwidth */
  function start(v) { if (!v.src) v.src = v.dataset.src; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  var vids = grid.querySelectorAll('video');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { start(e.target); io.unobserve(e.target); } }); });
    vids.forEach(function (v) { io.observe(v); });
  } else vids.forEach(start);

  var full = null;
  function show(id, text) {
    if (full) full.remove();
    full = loop(id, false); mark.classList.add('is-loop'); mark.appendChild(full);
    label.textContent = id + '  ' + text;
    root.classList.add('marks-full');
    /* replay the reveal, the welcome and the bar from their start, as the real loader plays them */
    loader.classList.add('replay');
    var parts = loader.querySelectorAll('.mark,.welcome,.bar,.bar i');
    parts.forEach(function (el) { el.style.animation = 'none'; }); void loader.offsetWidth;
    parts.forEach(function (el) { el.style.animation = ''; });
    vids.forEach(function (v) { v.pause(); });
  }
  grid.addEventListener('click', function (e) {
    var t = e.target.closest('.pick-tile'); if (!t) return;
    var m = MARKS.filter(function (x) { return x[0] === t.dataset.id; })[0]; show(m[0], m[2]);
  });
  /* ?marks=<id> opens that logo in the loader layout straight away, so a link can show one candidate */
  var ask = (/(?:^|[?&])marks=([A-Z]\d\d)(?:&|$)/.exec(location.search) || [])[1];
  MARKS.forEach(function (m) { if (m[0] === ask) show(m[0], m[2]); });
  back.addEventListener('click', function () {
    root.classList.remove('marks-full'); if (full) { full.remove(); full = null; }
    vids.forEach(function (v) { if (v.src) start(v); });
  });
})();

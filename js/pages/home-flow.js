/* Home: one agreement, played step by step.

   The "now" tile illustrates the step: the acting party signs the record it
   writes, which lands on the stack of records already written (each pointing
   to the one before it); the quote says what they agreed. Under it, the five
   stages are listed once, as the step links that drive the scene. The scene auto-advances, pauses on
   hover/focus or with its own button, and stops when the page is hidden.
   Reduced motion, or a paused scene, shows the finished trail with the steps
   still selectable. The example is illustrative. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var STEP_MS = 3200, RESTART_MS = 4200;

  var ACTORS = [
    { id: 'requester', label: 'Requester' },
    { id: 'provider', label: 'Provider' },
    { id: 'verifier', label: 'Verifier' }
  ];
  var STEPS = [
    { actors: ['requester'], who: 'Requester', says: 'Translate this 2,000-word brief into Spanish by Friday.', records: 'intent', hash: '7f3a' },
    { actors: ['provider'], who: 'Provider', says: 'I can deliver Thursday, for 36 FXN.', records: 'offer', hash: 'c41e' },
    { actors: ['requester', 'provider'], who: 'Requester + Provider', says: 'Agreed: Thursday, 36 FXN, checked on delivery.', records: 'agreement', hash: '2b9d' },
    { actors: ['provider'], who: 'Provider', says: 'Delivered es-brief.pdf, content hash 4d10.', records: 'fulfillment', hash: 'e058' },
    { actors: ['verifier'], who: 'Verifier', says: 'The delivery matches the agreed terms.', records: 'receipt', hash: '91c6' }
  ];

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }
  function icon(d) {
    var root = document.createElementNS(NS, 'svg');
    root.setAttribute('viewBox', '0 0 12 12'); root.setAttribute('aria-hidden', 'true');
    var path = document.createElementNS(NS, 'path'); path.setAttribute('d', d);
    root.appendChild(path);
    return root;
  }
  // "points to offer #c41e", or "opens the trail" for the first record.
  function backRef(i) {
    return i === 0 ? 'opens the trail' : 'points to ' + STEPS[i - 1].records + ' #' + STEPS[i - 1].hash;
  }

  function svg(tag, attrs, text) {
    var node = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    if (text != null) node.textContent = text;
    return node;
  }

  // Party glyphs, drawn in a 24-unit box centred on the avatar.
  var GLYPHS = {
    requester: 'M12 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5.5 19.5c.8-3.4 3.4-5.5 6.5-5.5s5.7 2.1 6.5 5.5',
    provider: 'M4.5 8.5 12 4.5l7.5 4v7L12 19.5l-7.5-4zM4.5 8.5 12 12.5l7.5-4M12 12.5v7',
    verifier: 'M12 3.5 18.5 6v5.5c0 4-2.8 6.9-6.5 8.5-3.7-1.6-6.5-4.5-6.5-8.5V6zM9 11.8l2.2 2.2 4-4.2'
  };
  var AV_X = 54, AV_Y = [44, 112, 180], AV_R = 21;
  var CARD = { x: 222, y: 64, w: 248, h: 142 };
  var STAMP_X = [CARD.x + 92, CARD.x + 128, CARD.x + 164], STAMP_Y = CARD.y + CARD.h - 24;
  var GHOSTS = 4, GHOST_DX = 9, GHOST_DY = 11;

  /* The scene: three parties on the left; on the right the record being
     written, with the records already written stacked behind it. A beam runs
     from each acting party to its signature on the record. */
  function drawScene() {
    var root = svg('svg', { viewBox: '0 0 520 222', class: 'flow-scene', fill: 'none' });
    var defs = svg('defs', {});
    var glow = svg('radialGradient', { id: 'flow-glow' });
    glow.appendChild(svg('stop', { offset: '0', class: 'flow-glow-in' }));
    glow.appendChild(svg('stop', { offset: '1', class: 'flow-glow-out' }));
    defs.appendChild(glow); root.appendChild(defs);

    // Woven backdrop: the "fabric" the trail is written into.
    var weave = svg('g', { class: 'flow-weave' });
    for (var w = 0; w < 7; w++) {
      var y = 24 + w * 30;
      weave.appendChild(svg('path', { d: 'M120 ' + y + 'C200 ' + (y - 18) + ' 300 ' + (y + 18) + ' 520 ' + y }));
    }
    root.appendChild(weave);

    // Records already written, stacked behind the current one.
    var ghosts = [];
    for (var g = GHOSTS; g >= 1; g--) {
      var gx = CARD.x + g * GHOST_DX, gy = CARD.y - g * GHOST_DY;
      var ghost = svg('g', { class: 'flow-ghost', 'data-depth': String(g) });
      ghost.appendChild(svg('rect', { x: gx, y: gy, width: CARD.w, height: CARD.h, rx: 12, class: 'flow-ghost-box' }));
      var gt = svg('text', { x: gx + 14, y: gy + 8.5, class: 'flow-ghost-label' });
      ghost.appendChild(gt);
      ghost.label = gt;
      ghosts[g] = ghost;
      root.appendChild(ghost);
    }

    // Beams, under the card so they meet its edge cleanly.
    var beams = ACTORS.map(function (actor, k) {
      var sy = AV_Y[k], ex = CARD.x + 2, ey = CARD.y + 40 + k * 26;
      var d = 'M' + (AV_X + AV_R + 4) + ' ' + sy + 'C' + (AV_X + 90) + ' ' + sy + ' ' + (ex - 70) + ' ' + ey + ' ' + ex + ' ' + ey;
      var group = svg('g', { class: 'flow-beam', 'data-actor': actor.id });
      group.appendChild(svg('path', { d: d, pathLength: '1', class: 'flow-beam-line' }));
      group.appendChild(svg('path', { d: d, pathLength: '1', class: 'flow-beam-spark' }));
      group.appendChild(svg('circle', { cx: ex, cy: ey, r: 3, class: 'flow-beam-end' }));
      root.appendChild(group);
      return group;
    });

    // Parties.
    ACTORS.forEach(function (actor, k) {
      var cy = AV_Y[k];
      var g = svg('g', { class: 'flow-avatar', 'data-actor': actor.id });
      g.appendChild(svg('circle', { cx: AV_X, cy: cy, r: AV_R + 14, fill: 'url(#flow-glow)', class: 'flow-avatar-glow' }));
      g.appendChild(svg('circle', { cx: AV_X, cy: cy, r: AV_R + 5, class: 'flow-avatar-ring' }));
      g.appendChild(svg('circle', { cx: AV_X, cy: cy, r: AV_R, class: 'flow-avatar-disc' }));
      g.appendChild(svg('path', { d: GLYPHS[actor.id], transform: 'translate(' + (AV_X - 12) + ' ' + (cy - 12) + ')', class: 'flow-avatar-glyph' }));
      g.appendChild(svg('text', { x: AV_X, y: cy + AV_R + 15, 'text-anchor': 'middle', class: 'flow-avatar-label' }, actor.label));
      root.appendChild(g);
    });

    // The record being written.
    var card = svg('g', { class: 'flow-card' });
    card.appendChild(svg('rect', { x: CARD.x, y: CARD.y, width: CARD.w, height: CARD.h, rx: 12, class: 'flow-card-box' }));
    card.appendChild(svg('path', { d: 'M' + CARD.x + ' ' + (CARD.y + CARD.h - 48) + 'h' + CARD.w + 'v36a12 12 0 0 1-12 12h-' + (CARD.w - 24) + 'a12 12 0 0 1-12-12z', class: 'flow-card-band' }));
    var type = svg('text', { x: CARD.x + 18, y: CARD.y + 26, class: 'flow-card-type' });
    var count = svg('text', { x: CARD.x + CARD.w - 18, y: CARD.y + 26, 'text-anchor': 'end', class: 'flow-card-count' });
    var hash = svg('text', { x: CARD.x + 18, y: CARD.y + 58, class: 'flow-card-hash' });
    var prev = svg('text', { x: CARD.x + 18, y: CARD.y + 80, class: 'flow-card-prev' });
    card.appendChild(type); card.appendChild(count); card.appendChild(hash); card.appendChild(prev);
    card.appendChild(svg('text', { x: CARD.x + 18, y: STAMP_Y + 4, class: 'flow-card-signed' }, 'SIGNED'));
    var stamps = ACTORS.map(function (actor, k) {
      var st = svg('g', { class: 'flow-stamp', 'data-actor': actor.id });
      st.appendChild(svg('circle', { cx: STAMP_X[k], cy: STAMP_Y, r: 12, class: 'flow-stamp-disc' }));
      st.appendChild(svg('text', { x: STAMP_X[k], y: STAMP_Y + 4, 'text-anchor': 'middle', class: 'flow-stamp-mark' }, actor.label.charAt(0)));
      card.appendChild(st);
      return st;
    });
    var seal = svg('g', { class: 'flow-seal' });
    seal.appendChild(svg('circle', { cx: CARD.x + CARD.w - 34, cy: CARD.y + 66, r: 20, class: 'flow-seal-disc' }));
    seal.appendChild(svg('path', { d: 'M' + (CARD.x + CARD.w - 42) + ' ' + (CARD.y + 66) + 'l6 6 10-11', class: 'flow-seal-check' }));
    card.appendChild(seal);
    root.appendChild(card);

    return {
      svg: root,
      paint: function (i) {
        var step = STEPS[i];
        type.textContent = step.records.toUpperCase();
        count.textContent = String(i + 1).padStart(2, '0') + ' / 05';
        hash.textContent = '#' + step.hash;
        prev.textContent = i === 0 ? 'genesis · opens the trail' : '↳ points to #' + STEPS[i - 1].hash;
        for (var d = 1; d <= GHOSTS; d++) {
          var k = i - d;
          ghosts[d].setAttribute('data-on', k >= 0 ? 'true' : 'false');
          ghosts[d].label.textContent = k >= 0 ? STEPS[k].records.toUpperCase() + '  #' + STEPS[k].hash : '';
        }
        beams.forEach(function (b, k) { b.setAttribute('data-on', step.actors.indexOf(ACTORS[k].id) >= 0 ? 'true' : 'false'); });
        stamps.forEach(function (st, k) { st.setAttribute('data-on', step.actors.indexOf(ACTORS[k].id) >= 0 ? 'true' : 'false'); });
      }
    };
  }

  ArkUI.buildAgreementFlow = function (options) {
    var stages = options.stages, hrefFor = options.hrefFor;
    var root = el('div', 'flow');
    root.dataset.step = '0';

    // Now: an illustration of the step (who signs which record, stacked on
    // the trail so far), then what they say.
    var now = el('div', 'flow-now');
    now.setAttribute('aria-hidden', 'true');
    var scene = drawScene();
    now.appendChild(scene.svg);
    var says = el('strong', 'flow-says');
    now.appendChild(says);
    root.appendChild(now);

    // Ledger: the records are the step links (the real, accessible content).
    var rail = el('ol', 'home-cycle-records flow-ledger');
    var links = stages.map(function (s, i) {
      var item = el('li'), link = el('a', 'home-cycle-step flow-record');
      link.dataset.stage = s.id; link.dataset.i = String(i);
      link.href = hrefFor(s.id); link.dataset.sceneLink = 'lifecycle/' + s.id;
      link.appendChild(el('span', 'flow-record-num', String(i + 1).padStart(2, '0')));
      link.appendChild(el('span', 'flow-record-name', s.title));
      var bar = el('span', 'flow-record-bar'); bar.setAttribute('aria-hidden', 'true');
      link.appendChild(bar);
      link.setAttribute('aria-label', s.title + ': ' + STEPS[i].who + ' — ' + STEPS[i].says + ' Records ' + STEPS[i].records + ' #' + STEPS[i].hash + ', ' + backRef(i) + '. Illustrative example. Open this step.');
      item.appendChild(link); rail.appendChild(item);
      return link;
    });
    root.appendChild(rail);

    var toggle = el('button', 'flow-toggle');
    toggle.type = 'button';
    toggle.appendChild(icon('M3 2h2v8H3zM7 2h2v8H7z'));
    toggle.appendChild(icon('M3 1.5v9l7.5-4.5z'));
    root.appendChild(toggle);

    var reduce = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    var current = 0, held = -1, userPaused = false, timer = 0, disposed = false;

    function show(i, complete) {
      var step = STEPS[i];
      root.dataset.step = String(i);
      root.dataset.complete = complete ? 'true' : 'false';
      root.dataset.actors = step.actors.join(' ');
      says.textContent = '“' + step.says + '”';
      scene.paint(i);
      links.forEach(function (link, k) { link.toggleAttribute('data-current', k === i); link.toggleAttribute('data-done', k < i); });
      root.classList.remove('flow-run'); void root.offsetWidth; root.classList.add('flow-run');
    }
    function still() {
      return reduce.matches || userPaused || held >= 0 || disposed ||
        (typeof document !== 'undefined' && document.hidden) ||
        !!(root.closest && root.closest('[hidden]')) ||
        !!(ArkUI.sceneState && ArkUI.sceneState.get().paused);
    }
    function paintToggle() {
      var playing = !reduce.matches && !userPaused;
      toggle.setAttribute('aria-label', playing ? 'Pause the agreement animation' : 'Play the agreement animation');
      toggle.title = playing ? 'Pause' : 'Play';
      root.dataset.playing = playing ? 'true' : 'false';
    }
    function schedule() {
      clearTimeout(timer); timer = 0;
      if (still()) return;
      var last = current === STEPS.length - 1;
      timer = setTimeout(function () {
        if (still()) { schedule(); return; }
        current = last ? 0 : current + 1;
        show(current, current === STEPS.length - 1);
        schedule();
      }, last ? RESTART_MS : STEP_MS);
    }
    function hold(i) { held = i; show(i, i === STEPS.length - 1); clearTimeout(timer); timer = 0; }
    function release() { if (held < 0) return; current = held; held = -1; schedule(); }

    links.forEach(function (link, i) {
      link.addEventListener('pointerenter', function () { hold(i); });
      link.addEventListener('focus', function () { hold(i); });
      link.addEventListener('pointerleave', release);
      link.addEventListener('blur', release);
    });
    toggle.addEventListener('click', function () { userPaused = !userPaused; paintToggle(); schedule(); });
    function wake() { schedule(); }
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', wake);
    if (reduce.addEventListener) reduce.addEventListener('change', function () { paintToggle(); show(reduce.matches ? STEPS.length - 1 : current, reduce.matches); schedule(); });
    var unsubscribe = ArkUI.sceneState && ArkUI.sceneState.subscribe ? ArkUI.sceneState.subscribe(wake) : null;

    paintToggle();
    if (reduce.matches) { current = STEPS.length - 1; show(current, true); }
    else show(0, false);
    schedule();

    return {
      element: root,
      toggle: toggle,
      restore: schedule,
      dispose: function () {
        disposed = true; clearTimeout(timer);
        if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', wake);
        if (typeof unsubscribe === 'function') unsubscribe();
      }
    };
  };
})();

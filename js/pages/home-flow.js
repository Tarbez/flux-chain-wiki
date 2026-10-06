/* Home: one agreement, played step by step.

   Three parties act; each step writes one record, and every record points to
   the record before it, so the five of them form a trail anyone can replay.
   The scene auto-advances, pauses on hover/focus or with its own button, and
   stops when the page is hidden. Reduced motion, or a paused scene, shows the
   finished trail with the steps still selectable. The example is illustrative. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var STEP_MS = 3200, RESTART_MS = 4200;

  var ACTORS = [
    { id: 'requester', label: 'Requester', x: 70 },
    { id: 'provider', label: 'Provider', x: 220 },
    { id: 'verifier', label: 'Verifier', x: 370 }
  ];
  var STEPS = [
    { actors: ['requester'], who: 'Requester', says: 'Translate this 2,000-word brief into Spanish by Friday.', records: 'intent', note: 'opens the trail', hash: '7f3a' },
    { actors: ['provider'], who: 'Provider', says: 'I can deliver Thursday, for 36 FXN.', records: 'offer', note: 'points to intent #7f3a', hash: 'c41e' },
    { actors: ['requester', 'provider'], who: 'Requester + Provider', says: 'Agreed: Thursday, 36 FXN, checked on delivery.', records: 'agreement', note: 'both signatures · points to offer #c41e', hash: '2b9d' },
    { actors: ['provider'], who: 'Provider', says: 'Delivered es-brief.pdf, content hash 4d10.', records: 'fulfillment', note: 'points to agreement #2b9d', hash: 'e058' },
    { actors: ['verifier'], who: 'Verifier', says: 'The delivery matches the agreed terms.', records: 'receipt', note: 'closes the trail · points to fulfillment #e058', hash: '91c6' }
  ];
  var CARD_W = 76, CARD_Y = 98, CARD_H = 42;
  function cardX(i) { return 8 + i * 86; }

  function svg(tag, attrs, text) {
    var node = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    if (text != null) node.textContent = text;
    return node;
  }
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function drawStage() {
    var root = svg('svg', { viewBox: '0 0 440 150', fill: 'none', class: 'flow-stage-svg' });
    ACTORS.forEach(function (actor) {
      var g = svg('g', { class: 'flow-actor', 'data-actor': actor.id });
      g.appendChild(svg('rect', { x: actor.x - 48, y: 6, width: 96, height: 26, rx: 13, class: 'flow-actor-chip' }));
      g.appendChild(svg('circle', { cx: actor.x - 32, cy: 19, r: 3, class: 'flow-actor-dot' }));
      g.appendChild(svg('text', { x: actor.x + 6, y: 23, 'text-anchor': 'middle', class: 'flow-actor-label' }, actor.label));
      root.appendChild(g);
    });
    STEPS.forEach(function (step, i) {
      var cx = cardX(i) + CARD_W / 2;
      step.actors.forEach(function (actorId) {
        var ax = ACTORS.filter(function (a) { return a.id === actorId; })[0].x;
        root.appendChild(svg('path', {
          d: 'M' + ax + ' 33C' + ax + ' 66 ' + cx + ' 62 ' + cx + ' ' + (CARD_Y - 2),
          pathLength: '1', class: 'flow-beam', 'data-i': i
        }));
      });
    });
    STEPS.forEach(function (step, i) {
      var x = cardX(i);
      if (i > 0) {
        // The back-reference: each record points at the one before it.
        root.appendChild(svg('path', { d: 'M' + (x - 1) + ' ' + (CARD_Y + 21) + 'h-8m3-3l-3 3 3 3', class: 'flow-link', 'data-i': i }));
      }
      var g = svg('g', { class: 'flow-card', 'data-i': i });
      g.appendChild(svg('rect', { x: x, y: CARD_Y, width: CARD_W, height: CARD_H, rx: 6, class: 'flow-card-box' }));
      g.appendChild(svg('rect', { x: x, y: CARD_Y, width: CARD_W, height: 2, class: 'flow-card-stripe' }));
      g.appendChild(svg('text', { x: x + 9, y: CARD_Y + 17, class: 'flow-card-type' }, step.records.toUpperCase()));
      g.appendChild(svg('text', { x: x + 9, y: CARD_Y + 32, class: 'flow-card-hash' }, '#' + step.hash));
      g.appendChild(svg('text', { x: x + 9, y: CARD_Y + 32, class: 'flow-card-empty' }, '····'));
      root.appendChild(g);
    });
    return root;
  }

  ArkUI.buildAgreementFlow = function (options) {
    var stages = options.stages, hrefFor = options.hrefFor;
    var root = el('div', 'flow');
    root.dataset.step = '0';

    var stage = el('div', 'flow-stage');
    stage.setAttribute('aria-hidden', 'true');
    stage.appendChild(drawStage());
    var verified = el('span', 'flow-verified', 'Trail verified');
    stage.appendChild(verified);
    root.appendChild(stage);

    var caption = el('div', 'flow-caption');
    caption.setAttribute('aria-hidden', 'true');
    var who = el('span', 'flow-who'), says = el('strong', 'flow-says'), recordLine = el('span', 'flow-records');
    caption.appendChild(who); caption.appendChild(says); caption.appendChild(recordLine);
    root.appendChild(caption);

    // The step links are the real, accessible content: each names its step,
    // what it records, and opens that step's page.
    var rail = el('ol', 'home-cycle-records flow-steps');
    var links = stages.map(function (s, i) {
      var item = el('li'), link = el('a', 'home-cycle-step');
      link.dataset.stage = s.id; link.dataset.i = String(i);
      link.href = hrefFor(s.id); link.dataset.sceneLink = 'lifecycle/' + s.id;
      var num = el('span', 'flow-step-num', String(i + 1).padStart(2, '0'));
      var name = el('span', 'flow-step-name', s.title);
      var bar = el('span', 'flow-step-bar'); bar.setAttribute('aria-hidden', 'true');
      link.appendChild(num); link.appendChild(name); link.appendChild(bar);
      link.setAttribute('aria-label', s.title + ': ' + STEPS[i].who + ' — ' + STEPS[i].says + ' Records ' + STEPS[i].records + ', ' + STEPS[i].note + '. Open this step.');
      item.appendChild(link); rail.appendChild(item);
      return link;
    });
    root.appendChild(rail);

    var foot = el('div', 'flow-foot');
    var toggle = el('button', 'flow-toggle');
    toggle.type = 'button';
    foot.appendChild(el('span', 'flow-note', 'Illustrative example · each record points to the one before it'));
    foot.appendChild(toggle);
    root.appendChild(foot);

    var parts = Array.prototype.slice.call(stage.querySelectorAll('[data-i]'));
    var reduce = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    var current = 0, held = -1, userPaused = false, timer = 0, disposed = false;

    function show(i, complete) {
      var step = STEPS[i];
      root.dataset.step = String(i);
      root.dataset.complete = complete ? 'true' : 'false';
      root.dataset.actors = step.actors.join(' ');
      who.textContent = String(i + 1).padStart(2, '0') + ' · ' + step.who;
      says.textContent = '“' + step.says + '”';
      recordLine.innerHTML = '';
      recordLine.appendChild(document.createTextNode('Records '));
      recordLine.appendChild(el('b', '', step.records));
      recordLine.appendChild(document.createTextNode(' · ' + step.note));
      links.forEach(function (link, k) { link.toggleAttribute('data-current', k === i); link.toggleAttribute('data-done', k < i); });
      parts.forEach(function (node) {
        var k = Number(node.getAttribute('data-i'));
        node.setAttribute('data-state', k < i ? 'written' : k === i ? 'current' : 'future');
      });
      // Restart the CSS draw for the current step.
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
      toggle.textContent = playing ? 'Pause' : 'Play';
      toggle.setAttribute('aria-label', playing ? 'Pause the agreement animation' : 'Play the agreement animation');
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
      restore: schedule,
      dispose: function () {
        disposed = true; clearTimeout(timer);
        if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', wake);
        if (typeof unsubscribe === 'function') unsubscribe();
      }
    };
  };
})();

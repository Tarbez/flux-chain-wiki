/* Home: one agreement, played step by step.

   Two tiles, each saying one thing. The "now" tile shows who acts, what they
   say, and the record that step writes (with the record it points back to).
   The ledger is the five records themselves: they are also the step links,
   so the stages are listed once. The scene auto-advances, pauses on
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

  ArkUI.buildAgreementFlow = function (options) {
    var stages = options.stages, hrefFor = options.hrefFor;
    var root = el('div', 'flow');
    root.dataset.step = '0';

    // Now: who acts, what they say, what it writes.
    var now = el('div', 'flow-now');
    now.setAttribute('aria-hidden', 'true');
    var head = el('div', 'flow-now-head');
    var parties = el('div', 'flow-parties');
    ACTORS.forEach(function (actor) {
      var chip = el('span', 'flow-party');
      chip.dataset.actor = actor.id;
      chip.appendChild(el('i', 'flow-party-dot'));
      chip.appendChild(document.createTextNode(actor.label));
      parties.appendChild(chip);
    });
    head.appendChild(parties);
    now.appendChild(head);
    var says = el('strong', 'flow-says');
    now.appendChild(says);
    var meta = el('div', 'flow-meta');
    var writes = el('span', 'flow-writes'), points = el('span', 'flow-points'), signs = el('span', 'flow-signs');
    meta.appendChild(writes); meta.appendChild(points); meta.appendChild(signs);
    meta.appendChild(el('span', 'flow-verified', 'Trail verified'));
    now.appendChild(meta);
    root.appendChild(now);

    // Ledger: the records are the step links (the real, accessible content).
    var rail = el('ol', 'home-cycle-records flow-ledger');
    var links = stages.map(function (s, i) {
      var item = el('li'), link = el('a', 'home-cycle-step flow-record');
      link.dataset.stage = s.id; link.dataset.i = String(i);
      link.href = hrefFor(s.id); link.dataset.sceneLink = 'lifecycle/' + s.id;
      link.appendChild(el('span', 'flow-record-num', String(i + 1).padStart(2, '0')));
      link.appendChild(el('span', 'flow-record-name', s.title));
      var hash = el('span', 'flow-record-hash'); hash.setAttribute('aria-hidden', 'true');
      hash.dataset.hash = '#' + STEPS[i].hash;
      link.appendChild(hash);
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
      writes.innerHTML = '';
      writes.appendChild(document.createTextNode('writes '));
      writes.appendChild(el('b', '', step.records + ' #' + step.hash));
      points.textContent = backRef(i);
      signs.textContent = step.actors.length === 1 ? '1 signature' : step.actors.length + ' signatures';
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

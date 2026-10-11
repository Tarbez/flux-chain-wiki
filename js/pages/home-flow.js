/* Home: one record joins the FXN chain, played step by step (docs/whitepaper.md §1-2).

   The "now" tile illustrates the step: the holder signs a record that extends
   their own chain; the chain checks only grammar, signature, head and
   position, then copies it to K-of-N peers; a resolver reads what it means.
   The records stacked behind are the holder's earlier positions, each
   pointing to the one before. Under it, the five steps are listed once, as
   the step links that drive the scene. The scene auto-advances, pauses on
   hover/focus or with its own button, and stops when the page is hidden.
   Reduced motion, or a paused scene, shows the finished record with the
   steps still selectable. The example is illustrative. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var STEP_MS = 3200, RESTART_MS = 4200;

  var ACTORS = [
    { id: 'holder', label: 'Holder' },
    { id: 'chain', label: 'Chain' },
    { id: 'resolver', label: 'Resolver' }
  ];
  /* Same mechanism, different meaning: the sign/check/extend/replicate steps
     never change -- only what the resolver reads at the end does. Switching
     cases is the fastest way to show that the chain itself has no idea
     which of these it is admitting. */
  var CASES = [
    { id: 'swaps', label: 'Swaps', recordType: 'YLEDGERENTRY', amount: '36 FXN → studio.fxn', resolverName: 'DeFi resolver', says: 'The DeFi resolver reads the payload: 36 FXN to studio.fxn.' },
    { id: 'transfers', label: 'Transfers', recordType: 'YTRANSFER', amount: '120 FXN → alice.fxn', resolverName: 'Transfers resolver', says: 'The transfers resolver reads the payload: 120 FXN to alice.fxn.' },
    { id: 'staking', label: 'Staking', recordType: 'YSTAKE', amount: '500 FXN → validator.fxn', resolverName: 'Staking resolver', says: 'The staking resolver reads the payload: 500 FXN staked with validator.fxn.' },
    { id: 'governance', label: 'Governance', recordType: 'YVOTE', amount: 'YES → proposal-14', resolverName: 'Governance resolver', says: 'The governance resolver reads the payload: a yes vote on proposal 14.' }
  ];
  var CASES_BY_ID = {};
  CASES.forEach(function (c) { CASES_BY_ID[c.id] = c; });
  ArkUI.chainCases = CASES;

  // The record being admitted, and the holder's chain behind it.
  var RECORD = { type: 'LEDGERENTRY · Y1A', hash: 'e058', pos: 42, prev: '2b9d' };
  var TRAIL = [{ pos: 41, hash: '2b9d' }, { pos: 40, hash: 'c41e' }, { pos: 39, hash: '7f3a' }, { pos: 38, hash: '91c6' }];
  // Checks on the record's band, lit once passed: Grammar, Signature, Chain head, K-of-N peers.
  var CHECKS = ['G', 'S', 'C', 'K'];
  var BASE_STEPS = [
    { id: 'sign', title: 'Sign', page: 'account', actors: ['holder'], checks: 0, says: 'The holder signs one record that extends their own chain, at position 42.' },
    { id: 'check', title: 'Check', page: 'stats', actors: ['chain'], checks: 2, says: 'Grammar parses and the signature verifies. Meaning is not checked.' },
    { id: 'extend', title: 'Extend', page: 'explorer', actors: ['chain'], checks: 3, says: 'It points to the current head, #2b9d, and position 42 is still free.' },
    { id: 'replicate', title: 'Replicate', page: 'stats', actors: ['chain'], checks: 4, says: 'Copied to 3 of 4 peers, then stored. No other chain had to wait.' },
    { id: 'resolve', title: 'Resolve', page: 'resolver', actors: ['resolver'], checks: 4, says: 'The DeFi resolver reads the payload: 36 FXN to studio.fxn.' }
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

  function svg(tag, attrs, text) {
    var node = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    if (text != null) node.textContent = text;
    return node;
  }

  /* The scene: one changing panel, not five stacked rows. The record is the
     same record throughout -- sign, check, extend, replicate, resolve are
     five things that happen TO it, not five places on a page -- so only one
     of them is ever drawn at a time, in the full width of the frame, and a
     tracker above it (built from the same accessible step links) shows
     where in the sequence it is. Switching panels is a cross-fade; nothing
     is stacked, nothing competes for space, and a tall list that used to
     force a scrollbar is just gone.

     Illustrative values: the hashes and the amount are examples, and the
     long fields are truncated to fit. The SHAPE is real. */

  var BLOCKS = [
    { x: 16,  w: 26, text: 'G',            under: 'who' },
    { x: 55,  w: 96, text: 'YLEDGERENTRY', under: 'what kind' },
    { x: 164, w: 24, text: 'V3',           under: 'version' },
    { x: 201, w: 78, text: 'M1760…',       under: 'when' },
    { x: 292, w: 34, text: 'J42',          under: 'position' },
    { x: 339, w: 60, text: 'C2b9d…',       under: 'extends' },
    { x: 412, w: 52, text: 'S9f1…',        under: 'signature' }
  ];
  var LAMPS = [
    { mark: 'G', name: 'grammar' },
    { mark: 'S', name: 'signature' },
    { mark: 'C', name: 'head' },
    { mark: 'K', name: 'peers' }
  ];
  var CHAIN = ['J38', 'J39', 'J40', 'J41', 'J42'];
  var PEERS = 12, PEERS_STORED = 9;
  var W = 480, CY = 96;

  function drawScene(payload) {
    var root = svg('svg', { viewBox: '0 0 ' + W + ' 192', class: 'flow-scene', fill: 'none' });
    var card = svg('rect', { x: 1, y: 1, width: W - 2, height: 190, rx: 16, class: 'flow-card' });
    root.appendChild(card);

    function panel(id) {
      var g = svg('g', { class: 'flow-panel', 'data-panel': id });
      root.appendChild(g);
      return g;
    }

    /* SIGN — the record, block by block: the actual wire grammar, not a
       stylised card. That is the part nothing else on the site shows. */
    var pSign = panel('sign');
    var blocks = BLOCKS.map(function (b, i) {
      var g = svg('g', { class: 'flow-block', 'data-i': String(i) });
      g.setAttribute('style', '--i:' + i);
      g.appendChild(svg('rect', { x: b.x, y: CY - 18, width: b.w, height: 36, rx: 6, class: 'flow-block-box' }));
      g.appendChild(svg('text', { x: b.x + b.w / 2, y: CY + 4, 'text-anchor': 'middle', class: 'flow-block-text' }, i === 1 ? payload.recordType : b.text));
      g.appendChild(svg('text', { x: b.x + b.w / 2, y: CY + 34, 'text-anchor': 'middle', class: 'flow-block-under' }, b.under));
      if (i < BLOCKS.length - 1) g.appendChild(svg('path', { d: 'M' + (b.x + b.w + 4) + ' ' + (CY - 1) + 'h5', class: 'flow-block-dash' }));
      pSign.appendChild(g);
      return g;
    });

    /* CHECK — four lamps, lit together: grammar, signature, head, peers.
       Meaning is never one of them. */
    var pCheck = panel('check');
    var lampGap = 108, lampStart = W / 2 - (LAMPS.length - 1) * lampGap / 2;
    var lamps = LAMPS.map(function (l, i) {
      var cx = lampStart + i * lampGap;
      var g = svg('g', { class: 'flow-lamp', 'data-mark': l.mark });
      g.setAttribute('style', '--i:' + i);
      g.appendChild(svg('circle', { cx: cx, cy: CY - 10, r: 22, class: 'flow-lamp-disc' }));
      g.appendChild(svg('text', { x: cx, y: CY - 2, 'text-anchor': 'middle', class: 'flow-lamp-mark' }, l.mark));
      g.appendChild(svg('text', { x: cx, y: CY + 36, 'text-anchor': 'middle', class: 'flow-lamp-name' }, l.name));
      pCheck.appendChild(g);
      return g;
    });
    pCheck.appendChild(svg('text', { x: W / 2, y: CY + 62, 'text-anchor': 'middle', class: 'flow-band-sub' }, 'meaning is never checked here'));

    /* EXTEND — the holder's own chain, which this record joins. */
    var pExtend = panel('extend');
    var nodeW = 68, nodeGap = 98, chainStart = W / 2 - ((CHAIN.length - 1) * nodeGap + nodeW) / 2;
    var links = [];
    var nodes = CHAIN.map(function (name, i) {
      var x = chainStart + i * nodeGap;
      if (i > 0) {
        var link = svg('path', { d: 'M' + (x - (nodeGap - nodeW)) + ' ' + CY + 'H' + x, class: 'flow-link' });
        link.setAttribute('style', '--i:' + i);
        pExtend.appendChild(link);
        links.push(link);
      }
      var g = svg('g', { class: 'flow-node', 'data-i': String(i) });
      g.setAttribute('style', '--i:' + i);
      g.appendChild(svg('rect', { x: x, y: CY - 18, width: nodeW, height: 36, rx: 8, class: 'flow-node-box' }));
      g.appendChild(svg('text', { x: x + nodeW / 2, y: CY + 5, 'text-anchor': 'middle', class: 'flow-node-text' }, name));
      pExtend.appendChild(g);
      return g;
    });
    pExtend.appendChild(svg('text', { x: W / 2, y: CY + 48, 'text-anchor': 'middle', class: 'flow-band-sub' }, 'one chain per identity · nobody else had to wait'));

    /* REPLICATE — peers filling in as they store it. */
    var pReplicate = panel('replicate');
    var peerGap = 26, peerStart = W / 2 - (PEERS - 1) * peerGap / 2;
    var peers = [];
    for (var p = 0; p < PEERS; p++) {
      var dot = svg('circle', { cx: peerStart + p * peerGap, cy: CY - 8, r: 9, class: 'flow-peer' });
      dot.setAttribute('style', '--i:' + p);
      pReplicate.appendChild(dot);
      peers.push(dot);
    }
    var peerCount = svg('text', { x: W / 2, y: CY + 32, 'text-anchor': 'middle', class: 'flow-band-sub' });
    pReplicate.appendChild(peerCount);

    /* RESOLVE — what it means, which only a resolver decides. */
    var pResolve = panel('resolve');
    pResolve.appendChild(svg('rect', { x: W / 2 - 190, y: CY - 28, width: 380, height: 58, rx: 12, class: 'flow-meaning-box' }));
    pResolve.appendChild(svg('text', { x: W / 2, y: CY - 1, 'text-anchor': 'middle', class: 'flow-meaning-text' }, payload.amount));
    pResolve.appendChild(svg('text', { x: W / 2, y: CY + 21, 'text-anchor': 'middle', class: 'flow-meaning-who' }, payload.resolverName));

    /* Said once, in the picture rather than only in a tooltip: the values
       are examples and the long fields are cut to fit. The shape is real. */
    root.appendChild(svg('text', { x: W / 2, y: 178, 'text-anchor': 'middle', class: 'flow-scene-caption' },
      'illustrative values · the record shape is the real wire grammar'));

    var panels = { sign: pSign, check: pCheck, extend: pExtend, replicate: pReplicate, resolve: pResolve };

    return {
      svg: root,
      paint: function (i) {
        var step = BASE_STEPS[i];
        Object.keys(panels).forEach(function (id) { panels[id].setAttribute('class', 'flow-panel' + (id === step.id ? ' flow-panel-active' : '')); });

        if (step.id === 'check') lamps.forEach(function (l) { l.setAttribute('data-on', 'true'); });
        if (step.id === 'extend') {
          nodes.forEach(function (n, k) { n.setAttribute('data-on', 'true'); n.setAttribute('data-new', String(k === CHAIN.length - 1)); });
          links.forEach(function (l) { l.setAttribute('data-on', 'true'); });
        }
        if (step.id === 'replicate') {
          peers.forEach(function (d, k) { d.setAttribute('data-on', String(k < PEERS_STORED)); });
          peerCount.textContent = PEERS_STORED + ' of ' + PEERS + ' peers hold it · the acknowledgement waited on them';
        }
      }
    };
  }

  ArkUI.buildChainFlow = function (options) {
    var hrefFor = options.hrefFor;
    var payload = CASES_BY_ID[options.caseId] || CASES_BY_ID.swaps;
    // Only what the resolver reads changes per case; the mechanism (checks,
    // replication) is identical, so only the resolve step's narration and
    // its accessible label need the case-specific text.
    var STEPS = BASE_STEPS.slice();
    var resolveStep = {};
    for (var key in BASE_STEPS[4]) resolveStep[key] = BASE_STEPS[4][key];
    resolveStep.says = payload.says;
    STEPS[4] = resolveStep;
    var root = el('div', 'flow');
    root.dataset.step = '0';
    root.dataset.case = payload.id;

    // Tracker first: the step links (the real, accessible content), each to
    // the page that shows that part for real. It sits above the scene now
    // and doubles as the visual "chain" -- five connected circles -- that
    // the single panel below answers to.
    var rail = el('ol', 'home-cycle-records flow-ledger');
    var links = STEPS.map(function (s, i) {
      var item = el('li'), link = el('a', 'home-cycle-step flow-record');
      link.dataset.stage = s.id; link.dataset.i = String(i);
      link.href = hrefFor(s.page); link.dataset.sceneLink = s.page;
      link.appendChild(el('span', 'flow-record-num', String(i + 1).padStart(2, '0')));
      link.appendChild(el('span', 'flow-record-name', s.title));
      link.setAttribute('aria-label', s.title + ': ' + s.says + ' Illustrative example. Open the related page.');
      item.appendChild(link); rail.appendChild(item);
      return link;
    });
    root.appendChild(rail);

    // Now: the one panel that answers the selected step.
    var now = el('div', 'flow-now');
    var scene = drawScene(payload);
    scene.svg.setAttribute('aria-hidden', 'true');
    now.appendChild(scene.svg);
    var says = el('strong', 'flow-says');
    says.setAttribute('aria-hidden', 'true');
    now.appendChild(says);
    root.appendChild(now);

    var toggle = el('button', 'flow-toggle');
    toggle.type = 'button';
    toggle.appendChild(icon('M3 2h2v8H3zM7 2h2v8H7z'));
    toggle.appendChild(icon('M3 1.5v9l7.5-4.5z'));
    // Sits in the scene tile's bottom-right corner, beside the quote.
    now.appendChild(toggle);

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
      toggle.setAttribute('aria-label', playing ? 'Pause the chain animation' : 'Play the chain animation');
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
    function hold(i) { held = i; root.dataset.held = 'true'; show(i, i === STEPS.length - 1); clearTimeout(timer); timer = 0; }
    function release() { if (held < 0) return; current = held; held = -1; delete root.dataset.held; schedule(); }

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

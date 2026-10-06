/* /what-is-a-resolver as four small pages (Ask, Resolve, Check, Laws) beside
   one working illustration. Each step and the chosen input live in the
   address (?step=…&input=…), so Back/Forward and shared links land on the same
   state. The illustration runs a real (local, illustrative) resolver once per
   request and stops; "Run again" repeats it and the run log shows the claim id
   does not change, which is the determinism law, demonstrated rather than told.
   Copy lives in js/content/manifests/resolver.js. */
(function () {
  'use strict';
  var ADDRESS = 'policy.doc-size/v1';
  var LIMIT = 5 * 1000 * 1000;
  var INPUTS = [
    { id: '7f3a', name: 'Quarterly report', bytes: 3200000 },
    { id: 'c41e', name: 'Launch video', bytes: 48000000 },
    { id: '2b9d', name: 'Brand logo', bytes: 12000 }
  ];
  var STEPS = ['ask', 'resolve', 'check', 'laws'];
  var PHASE_MS = { send: 520, resolve: 640, sign: 420 };

  function size(bytes) { return bytes >= 1e6 ? (bytes / 1e6).toFixed(1).replace(/\.0$/, '') + ' MB' : Math.round(bytes / 1e3) + ' KB'; }
  // A real, stable digest of what the claim says: same address + input + result, same id.
  function claimId(input, result) {
    var text = ADDRESS + '|doc:' + input.id + '|' + result, h = 2166136261;
    for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ('00000000' + (h >>> 0).toString(16)).slice(-8);
  }
  function evaluate(input) { return input.bytes <= LIMIT; }

  ArkUI.buildResolverLab = function (opts) {
    var page = opts.page, words = opts.words, link = opts.link, el = ArkUI.el;
    var reduce = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    var root = el('section', 'ark-page guided-page resolver-lab');
    root.dataset.arkPage = page;
    root.setAttribute('aria-labelledby', 'resolver-lab-title');

    /* Left: place, title, step tabs, the current step, and the way on. */
    var copy = el('div', 'resolver-lab-copy');
    var path = el('nav', 'content-layer-path'); path.setAttribute('aria-label', 'Your place');
    path.appendChild(link(words('BACK'), 'zero'));
    var here = el('span', '', 'Resolver'); here.setAttribute('aria-current', 'page'); path.appendChild(here);
    copy.appendChild(path);
    copy.appendChild(el('p', 'resolver-lab-kicker', words('EYEBROW')));
    var title = el('h1', '', words('DISPLAY.TITLE')); title.id = 'resolver-lab-title'; copy.appendChild(title);
    copy.appendChild(el('p', 'resolver-lab-lede', words('DISPLAY.LEDE')));

    var tabs = el('nav', 'resolver-lab-steps'); tabs.setAttribute('aria-label', 'Resolver steps');
    var STEP_COPY = {
      ask: [words('INPUT'), words('INPUT.TEXT'), words('ASK.BODY')],
      resolve: [words('LOGIC'), words('LOGIC.TEXT'), words('RESOLVE.BODY')],
      check: [words('CLAIM'), words('CLAIM.TEXT'), words('CHECK.BODY')],
      laws: [words('LAWS'), words('LAWS.BODY'), '']
    };
    var tabButtons = STEPS.map(function (id, i) {
      var b = el('button', 'resolver-lab-step');
      b.type = 'button'; b.dataset.step = id;
      b.appendChild(el('span', 'resolver-lab-step-num', String(i + 1).padStart(2, '0')));
      b.appendChild(el('span', 'resolver-lab-step-name', STEP_COPY[id][0]));
      b.addEventListener('click', function () { go(id, true); });
      tabs.appendChild(b); return b;
    });
    copy.appendChild(tabs);

    var panel = el('div', 'resolver-lab-panel'); panel.setAttribute('aria-live', 'polite');
    var panelTitle = el('h2', ''), panelBody = el('p', '');
    panel.appendChild(panelTitle); panel.appendChild(panelBody);
    copy.appendChild(panel);

    var footer = el('nav', 'resolver-lab-footer'); footer.setAttribute('aria-label', 'Continue');
    var prev = el('button', 'resolver-lab-prev'); prev.type = 'button';
    var next = el('a', 'resolver-lab-next');
    var spec = el('a', 'resolver-lab-spec', words('SOURCE') + ' ↗'); spec.href = 'docs/protocol/resolvers.md';
    footer.appendChild(prev); footer.appendChild(next); footer.appendChild(spec);
    copy.appendChild(footer);
    root.appendChild(copy);

    /* Right: the illustration. */
    var scene = el('figure', 'resolver-lab-scene');
    var head = el('figcaption', 'resolver-lab-scene-head');
    head.appendChild(el('span', '', 'Illustration · runs in your browser'));
    head.appendChild(el('code', '', ADDRESS));
    scene.appendChild(head);

    var stage = el('div', 'resolver-lab-stage');
    // Input tile: the defined input, as a choice.
    var inputTile = el('section', 'resolver-lab-tile resolver-lab-input');
    inputTile.appendChild(el('h3', '', 'Input · document id'));
    var inputList = el('div', 'resolver-lab-inputs'); inputList.setAttribute('role', 'group'); inputList.setAttribute('aria-label', 'Choose an input');
    var inputButtons = INPUTS.map(function (input) {
      var b = el('button', 'resolver-lab-doc'); b.type = 'button'; b.dataset.input = input.id;
      b.appendChild(el('code', '', 'doc:' + input.id));
      b.appendChild(el('span', '', input.name));
      b.appendChild(el('small', '', size(input.bytes)));
      b.addEventListener('click', function () { choose(input.id, true); });
      inputList.appendChild(b); return b;
    });
    inputTile.appendChild(inputList);
    stage.appendChild(inputTile);

    function connector(cls) { var c = el('div', 'resolver-lab-wire ' + cls); c.setAttribute('aria-hidden', 'true'); c.appendChild(el('span', 'resolver-lab-packet')); return c; }
    stage.appendChild(connector('resolver-lab-wire-in'));

    // Logic tile: the addressed rule, evaluated with the real numbers.
    var logicTile = el('section', 'resolver-lab-tile resolver-lab-logic');
    logicTile.appendChild(el('h3', '', 'Logic · ' + ADDRESS));
    var rule = el('p', 'resolver-lab-rule'); rule.innerHTML = '<code>size(doc) ≤ 5 MB</code>';
    var evalLine = el('p', 'resolver-lab-eval');
    logicTile.appendChild(rule); logicTile.appendChild(evalLine);
    stage.appendChild(logicTile);
    stage.appendChild(connector('resolver-lab-wire-out'));

    // Claim tile: what the resolver says, who signed it, and what it does not settle.
    var claimTile = el('section', 'resolver-lab-tile resolver-lab-claim');
    claimTile.appendChild(el('h3', '', 'Claim'));
    var claimLine = el('p', 'resolver-lab-claim-line');
    var claimMeta = el('dl', 'resolver-lab-claim-meta');
    function meta(label) { var d = el('div', ''); d.appendChild(el('dt', '', label)); var v = el('dd', ''); d.appendChild(v); claimMeta.appendChild(d); return v; }
    var idValue = meta('Claim id'), signValue = meta('Signed by'), acceptValue = meta('Accepted?');
    signValue.textContent = 'provider P-3 (example)';
    acceptValue.textContent = 'Decided by checker + authority';
    claimTile.appendChild(claimLine); claimTile.appendChild(claimMeta);
    stage.appendChild(claimTile);
    scene.appendChild(stage);

    // Laws view, shown on the Laws step in place of the stage.
    var laws = el('ol', 'resolver-lab-laws');
    // Status rows from docs/status.md: definition (Live, CAP-004), publication
    // (Partial, CAP-004), deployment (Partial, CAP-005). Law 4 is a rule of the
    // specification, not a capability, so it carries no status claim.
    var STATUS = [['Live', 'CAP-004'], ['Partial', 'CAP-004'], ['Partial', 'CAP-005'], ['Spec', 'spec']];
    [1, 2, 3, 4].forEach(function (n, i) {
      var item = el('li', 'resolver-lab-law');
      var top = el('div', 'resolver-lab-law-top');
      top.appendChild(el('span', 'resolver-lab-law-num', String(n).padStart(2, '0')));
      top.appendChild(el('strong', '', words('LAW' + n)));
      var status = el('span', 'resolver-lab-law-status', STATUS[i][0]); status.dataset.status = STATUS[i][0].toLowerCase();
      if (STATUS[i][1] !== 'spec') status.title = 'docs/status.md · ' + STATUS[i][1];
      top.appendChild(status);
      item.appendChild(top);
      var detail = el('p', '', words('LAW' + n + '.TEXT')); detail.id = 'resolver-law-' + n;
      item.appendChild(detail);
      // On phones each law opens on its own; on wider screens all details show.
      var toggle = el('button', 'resolver-lab-law-toggle'); toggle.type = 'button';
      toggle.setAttribute('aria-controls', detail.id); toggle.setAttribute('aria-label', 'Show detail: ' + words('LAW' + n));
      item.dataset.open = String(i === 0); toggle.setAttribute('aria-expanded', String(i === 0));
      toggle.addEventListener('click', function () {
        laws.querySelectorAll('.resolver-lab-law').forEach(function (other) { var open = other === item; other.dataset.open = String(open); other.querySelector('.resolver-lab-law-toggle').setAttribute('aria-expanded', String(open)); });
      });
      item.appendChild(toggle);
      laws.appendChild(item);
    });
    var lawsSource = el('p', 'resolver-lab-laws-source');
    var specLink = el('a', '', 'docs/protocol/resolvers.md'); specLink.href = 'docs/protocol/resolvers.md';
    var statusLink = el('a', '', 'docs/status.md'); statusLink.href = 'docs/status.md';
    lawsSource.appendChild(document.createTextNode('Wording from ')); lawsSource.appendChild(specLink);
    lawsSource.appendChild(document.createTextNode(' · status from ')); lawsSource.appendChild(statusLink);
    scene.appendChild(laws); scene.appendChild(lawsSource);

    var foot = el('div', 'resolver-lab-scene-foot');
    var log = el('ol', 'resolver-lab-log'); log.setAttribute('aria-label', 'Run log');
    var again = el('button', 'resolver-lab-again', 'Run again'); again.type = 'button';
    again.addEventListener('click', function () { run(); });
    foot.appendChild(log); foot.appendChild(again);
    scene.appendChild(foot);
    root.appendChild(scene);

    /* State ----------------------------------------------------------------- */
    var state = { step: 'ask', input: INPUTS[0].id }, timers = [], runs = [], disposed = false;
    function clear() { timers.forEach(clearTimeout); timers = []; }
    function current() { return INPUTS.filter(function (x) { return x.id === state.input; })[0]; }

    function paintStep() {
      var i = STEPS.indexOf(state.step), copyFor = STEP_COPY[state.step];
      root.dataset.step = state.step;
      tabButtons.forEach(function (b, k) { b.setAttribute('aria-pressed', String(k === i)); });
      panelTitle.textContent = copyFor[1];
      panelBody.textContent = copyFor[2];
      panelBody.hidden = !copyFor[2];
      prev.hidden = i === 0;
      if (i > 0) { prev.textContent = '← ' + STEP_COPY[STEPS[i - 1]][0]; prev.onclick = function (event) { event.stopPropagation(); go(STEPS[i - 1], true); }; }
      if (i < STEPS.length - 1) {
        next.textContent = 'Next: ' + STEP_COPY[STEPS[i + 1]][0] + ' →';
        next.href = ArkUI.route.href(ArkUI.pageCatalog[page].path + '?step=' + STEPS[i + 1] + '&input=' + state.input);
        delete next.dataset.sceneLink;
        // Stop here: go() repaints this same link, and the router must not then follow it.
        next.onclick = function (event) { event.preventDefault(); event.stopPropagation(); go(STEPS[i + 1], true); };
      } else {
        next.textContent = words('NEXT') + ' →';
        next.href = ArkUI.route.href(ArkUI.pageCatalog.deployment.path);
        next.dataset.sceneLink = 'deployment';
        next.onclick = null;
      }
    }
    function paintInput() {
      inputButtons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.input === state.input)); });
    }
    function paintResult(input) {
      var ok = evaluate(input), id = claimId(input, ok);
      evalLine.innerHTML = '';
      evalLine.appendChild(el('code', '', size(input.bytes) + ' ≤ 5 MB'));
      evalLine.appendChild(el('span', 'resolver-lab-arrow', '→'));
      var verdict = el('b', '', ok ? 'true' : 'false'); verdict.dataset.result = String(ok); evalLine.appendChild(verdict);
      claimLine.innerHTML = '';
      claimLine.appendChild(el('code', '', 'doc:' + input.id));
      claimLine.appendChild(document.createTextNode(ok ? ' satisfies ' : ' does not satisfy '));
      claimLine.appendChild(el('code', '', ADDRESS));
      idValue.textContent = '#' + id;
      return id;
    }
    function record(id) {
      runs.unshift({ input: state.input, id: id });
      runs = runs.slice(0, 3);
      log.replaceChildren();
      runs.forEach(function (r, k) {
        var item = el('li', '');
        item.appendChild(el('span', 'resolver-lab-log-n', 'Run ' + (runCount - k)));
        item.appendChild(el('code', '', 'doc:' + r.input + ' → #' + r.id));
        // Mark a run that repeats an earlier run on the same input with the same claim id.
        var earlier = runs.slice(k + 1).filter(function (o) { return o.input === r.input; });
        if (earlier.length && earlier.every(function (o) { return o.id === r.id; })) item.appendChild(el('span', 'resolver-lab-same', 'same claim'));
        log.appendChild(item);
      });
    }
    var runCount = 0;
    // One run: send → resolve → sign, then stop. Never loops.
    function run() {
      clear();
      var input = current();
      runCount += 1;
      if (reduce.matches) { var quick = paintResult(input); root.dataset.phase = 'signed'; record(quick); return; }
      root.dataset.phase = 'idle';
      void root.offsetWidth;
      root.dataset.phase = 'send';
      timers.push(setTimeout(function () {
        if (disposed) return;
        var id = paintResult(input);
        root.dataset.phase = 'resolve';
        timers.push(setTimeout(function () {
          if (disposed) return;
          root.dataset.phase = 'sign';
          timers.push(setTimeout(function () { if (!disposed) { root.dataset.phase = 'signed'; record(id); } }, PHASE_MS.sign));
        }, PHASE_MS.resolve));
      }, PHASE_MS.send));
    }

    function write(mode) {
      ArkUI.route.write(ArkUI.pageCatalog[page].path, 'step=' + state.step + '&input=' + state.input, mode);
    }
    function go(step, push) {
      if (STEPS.indexOf(step) < 0) step = 'ask';
      var changed = step !== state.step;
      state.step = step; paintStep();
      if (push && changed) write('push');
      if (changed && step !== 'laws' && root.dataset.phase !== 'signed') run();
    }
    function choose(id, push) {
      if (!INPUTS.some(function (x) { return x.id === id; })) id = INPUTS[0].id;
      var changed = id !== state.input;
      state.input = id; paintInput();
      if (push && changed) write('replace');
      if (changed && runCount) run();
    }
    function restore() {
      if (ArkUI.route.path() !== ArkUI.pageCatalog[page].path) return;
      var q = new URLSearchParams(ArkUI.route.search());
      var step = q.get('step'), input = q.get('input');
      state.step = STEPS.indexOf(step) >= 0 ? step : 'ask';
      paintStep();
      choose(input || state.input, false);
    }

    // Run when the page is actually on screen, so the visitor sees the run happen.
    var waitTimer = 0;
    function runWhenVisible(tries) {
      clearTimeout(waitTimer);
      if (disposed) return;
      var shown = root.isConnected && !(root.closest && root.closest('[hidden]')) && root.getBoundingClientRect().width > 0;
      if (shown) { waitTimer = setTimeout(function () { if (state.step !== 'laws') run(); }, 280); return; }
      if ((tries || 0) < 60) waitTimer = setTimeout(function () { runWhenVisible((tries || 0) + 1); }, 200);
    }
    paintStep(); paintInput();
    restore();
    paintResult(current()); root.dataset.phase = 'idle';
    runWhenVisible(0);
    window.addEventListener('popstate', restore);
    root.arkRestore = function () { restore(); runWhenVisible(0); };
    root.arkDispose = function () { disposed = true; clear(); clearTimeout(waitTimer); window.removeEventListener('popstate', restore); };
    return root;
  };
})();

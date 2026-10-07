/* /what-is-a-resolver: four small pages (Ask, Resolve, Check, Laws) beside one
   illustration drawn in the site's block-cell mesh language (js/ark/mesh-fabric.js):
   finite choreographies on the cells, never an idle loop.

   The illustration is a real resolver run, locally:
   Ask      the chosen document assembles as a block of cells sized by its file size.
   Resolve  it travels to a gate whose opening is the 5 MB rule. It passes or it stops.
   Check    the claim forms as a fingerprint drawn from its claim id, receives a
            signature mark, and an open frame shows acceptance is decided elsewhere.
   Run again first outlines the previous fingerprint, then fills the new one into
   it: same address + input, same claim (the determinism law, shown).

   The stepper is the page's signal track: a glow travels to the chosen step and
   stops. Steps and input live in the address (?step=…&input=…).
   Copy lives in js/content/manifests/resolver.js. */
(function () {
  'use strict';
  var ADDRESS = 'policy.doc-size/v1';
  var LIMIT = 5 * 1000 * 1000;
  // Each input: its size, and its footprint in cells (width x height).
  var INPUTS = [
    { id: '7f3a', name: 'Report', bytes: 3200000, w: 5, h: 5 },
    { id: 'c41e', name: 'Video', bytes: 48000000, w: 8, h: 11 },
    { id: '2b9d', name: 'Logo', bytes: 12000, w: 2, h: 2 }
  ];
  var GATE_ROWS = 7; // the 5 MB opening, in cells
  var STEPS = ['ask', 'resolve', 'check', 'laws'];
  var DURATION = { ask: 760, resolve: 1250, check: 1150 };

  function size(bytes) { return bytes >= 1e6 ? (bytes / 1e6).toFixed(1).replace(/\.0$/, '') + ' MB' : Math.round(bytes / 1e3) + ' KB'; }
  // A real, stable digest of what the claim says: same address + input + result, same id.
  function claimId(input, result) {
    var text = ADDRESS + '|doc:' + input.id + '|' + result, h = 2166136261;
    for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ('00000000' + (h >>> 0).toString(16)).slice(-8);
  }
  function evaluate(input) { return input.bytes <= LIMIT; }
  function bits(id) { var n = parseInt(id, 16), out = []; for (var i = 0; i < 36; i++) out.push(((n >>> (i % 32)) ^ (i > 31 ? 1 : 0)) & 1); return out; }
  var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var clamp = function (v) { return Math.max(0, Math.min(1, v)); };

  /* ---- the mesh scene ----------------------------------------------------- */
  function createScene(canvas, overlay) {
    var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    var CW = 16, CH = 12, GAP = 1, OX = 0, OY = 0, cols = 0, rows = 0, width = 0, height = 0, scale = 1, colors = {}, frame = 0, revision = 0, disposed = false;
    var view = { stage: 'ask', p: 1, input: INPUTS[0], ghost: null, same: false, preview: null, pointer: null };
    var labels = {};
    var narration = document.createElement('p'); narration.className = 'resolver-mesh-narration'; overlay.appendChild(narration);
    ['doc', 'rule', 'claim', 'sign', 'accept'].forEach(function (k) { var n = document.createElement('span'); n.className = 'resolver-mesh-label resolver-mesh-label-' + k; overlay.appendChild(n); labels[k] = n; });

    function ink(style, name, a) { return 'hsl(' + style.getPropertyValue('--' + name).trim() + ' / ' + a + ')'; }
    function measure() {
      if (disposed || !canvas.getBoundingClientRect) return false;
      var box = canvas.getBoundingClientRect(); if (!box.width || !box.height) return false;
      width = Math.round(box.width); height = Math.round(box.height); scale = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(width * scale)) canvas.width = Math.round(width * scale);
      if (canvas.height !== Math.round(height * scale)) canvas.height = Math.round(height * scale);
      // Small stages use smaller cells, so the whole story still fits.
      CW = width < 380 ? 11 : 16; CH = Math.round(CW * .75);
      cols = Math.floor(width / CW); rows = Math.floor(height / CH);
      OX = Math.floor((width - cols * CW) / 2); OY = Math.floor((height - rows * CH) / 2);
      var s = getComputedStyle(document.documentElement);
      colors = {
        line: ink(s, 'text-strong', .06), quiet: ink(s, 'text-strong', .028), block: ink(s, 'text-strong', .09),
        doc: s.getPropertyValue('--text-strong').trim(), primary: s.getPropertyValue('--primary').trim(),
        success: s.getPropertyValue('--success').trim(), muted: s.getPropertyValue('--text-muted').trim()
      };
      return cols >= 22 && rows >= 14;
    }
    // Geometry in cells, derived from the canvas size.
    function layout(input) {
      var midRow = Math.floor(rows / 2);
      var gate = Math.round(cols * .4);
      var h = Math.min(input.h, rows - 4), w = input.w;
      var startCol = Math.max(1, Math.round(cols * .17) - Math.floor(w / 2));
      var fits = h <= GATE_ROWS;
      // A fitting document streams through the opening and is absorbed; a large one stops at the rail.
      var endCol = fits ? gate + 1 : gate - w;
      var fpCol = cols - 10, fpRow = midRow - 3;
      return { midRow: midRow, gate: gate, w: w, h: h, top: midRow - Math.floor(h / 2), startCol: startCol, endCol: endCol, fits: fits,
        openTop: midRow - Math.floor(GATE_ROWS / 2), openBottom: midRow - Math.floor(GATE_ROWS / 2) + GATE_ROWS - 1, fpCol: fpCol, fpRow: fpRow };
    }
    function cell(ctx, c, r, fill, grow) {
      var g = grow == null ? 1 : grow, w = (CW - GAP * 2) * g, h = (CH - GAP * 2) * g;
      ctx.fillStyle = fill; ctx.fillRect(OX + c * CW + CW / 2 - w / 2, OY + r * CH + CH / 2 - h / 2, w, h);
    }
    var easeBack = function (t) { var k = 1.4; return 1 + (k + 1) * Math.pow(t - 1, 3) + k * Math.pow(t - 1, 2); };
    // A well-mixed integer hash, so the fabric's stronger blocks scatter without stripes.
    function scatter(c, r) { var h = Math.imul(c + 11, 374761393) + Math.imul(r + 5, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) % 97; }
    function hsla(triplet, a) { return 'hsl(' + triplet + ' / ' + a + ')'; }

    function paint() {
      if (disposed || !width) return;
      var ctx = canvas.getContext('2d'); ctx.setTransform(scale, 0, 0, scale, 0, 0); ctx.clearRect(0, 0, width, height);
      var L = layout(view.input), stage = view.stage, p = view.p, ok = evaluate(view.input), id = claimId(view.input, ok);
      // Base fabric: quiet cells and hairlines, a few stronger blocks.
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
        cell(ctx, c, r, scatter(c, r) < 4 ? colors.block : colors.quiet);
        if (view.pointer) {
          var d = Math.hypot(c - view.pointer[0], (r - view.pointer[1]) * .75);
          if (d < 3.2) cell(ctx, c, r, hsla(colors.doc, .07 * (1 - d / 3.2)));
        }
        ctx.strokeStyle = colors.line; ctx.strokeRect(OX + c * CW + .5, OY + r * CH + .5, CW, CH);
      }
      var after = function (s) { return STEPS.indexOf(stage) > STEPS.indexOf(s) || stage === 'laws'; };
      var resolveP = stage === 'resolve' ? ease(p) : after('resolve') ? 1 : 0;
      var askP = stage === 'ask' ? p : 1;
      var checkP = stage === 'check' ? p : after('check') ? 1 : 0;
      var dim = stage === 'laws' ? .45 : 1;

      // The gate: two rails with an opening the height of the rule.
      var gateGlow = stage === 'resolve' ? clamp((p - .45) / .25) * (1 - clamp((p - .85) / .15) * .5) : 0;
      for (r = 1; r < rows - 1; r++) {
        if (r >= L.openTop && r <= L.openBottom) continue;
        cell(ctx, L.gate, r, hsla(colors.doc, (.22 + gateGlow * .35) * dim));
      }
      cell(ctx, L.gate, L.openTop - 1, hsla(colors.primary, (.55 + gateGlow * .4) * dim));
      cell(ctx, L.gate, L.openBottom + 1, hsla(colors.primary, (.55 + gateGlow * .4) * dim));

      // The document: assembles (Ask), then travels (Resolve).
      var col0 = L.startCol + (L.endCol - L.startCol) * resolveP;
      var blocked = !L.fits && resolveP > .92;
      for (var i = 0; i < L.w; i++) for (var j = 0; j < L.h; j++) {
        var order = ((i * 7 + j * 13) % 23) / 23;
        if (order > askP * 1.15) continue;
        var cc = Math.round(col0) + i, rr = L.top + j;
        if (cc < 0 || cc >= cols || rr < 0 || rr >= rows) continue;
        if (L.fits && cc > L.gate) continue;          // absorbed by the logic
        var front = stage === 'resolve' && p < .98 && i === L.w - 1;
        var fresh = stage === 'ask' && order > askP * 1.15 - .2;
        var near = L.fits && cc === L.gate ? .45 : 1; // dissolving into the opening
        var a = blocked ? (rr < L.openTop || rr > L.openBottom ? .12 : .3) : .62 * near;
        var grow = stage === 'ask' && p < 1 ? .35 + .65 * clamp((askP * 1.15 - order) / .2) : 1;
        cell(ctx, cc, rr, front || fresh ? hsla(colors.primary, .85 * dim * near) : hsla(colors.doc, a * dim), grow);
      }
      // Hovering a document chip previews its footprint where the input waits.
      if (view.preview && view.preview !== view.input) {
        var P = layout(view.preview);
        ctx.save(); ctx.setLineDash([2, 3]); ctx.strokeStyle = hsla(colors.primary, .75);
        ctx.strokeRect(OX + P.startCol * CW + .5, OY + P.top * CH + .5, P.w * CW, P.h * CH); ctx.restore();
      }
      // The logic at work: the opening lights as the document passes, then settles.
      if (L.fits && resolveP > .45) {
        var lit = stage === 'resolve' ? clamp((p - .45) / .3) * (1 - clamp((p - .85) / .15) * .6) : .4;
        for (r = L.openTop; r <= L.openBottom; r++) cell(ctx, L.gate, r, hsla(colors.primary, lit * dim));
        // A short trace leads from the gate toward where the claim will form.
        var reach = stage === 'resolve' ? clamp((p - .7) / .3) : 1;
        for (c = L.gate + 1; c < L.gate + 1 + Math.round((L.fpCol - L.gate - 2) * reach); c++) cell(ctx, c, L.midRow, hsla(colors.primary, .35 * dim));
      }
      if (blocked) {
        // The rails hold: rows of the document outside the opening are what does not fit.
        for (r = L.top; r < L.top + L.h; r++) if (r < L.openTop || r > L.openBottom) cell(ctx, L.gate - 1, r, hsla(colors.doc, .45 * dim));
      }

      // The claim fingerprint: drawn from the claim id, row by row.
      if (checkP > 0 || view.ghost) {
        var fp = bits(id);
        if (view.ghost && stage === 'check') {
          var gb = bits(view.ghost);
          ctx.strokeStyle = hsla(colors.muted, .55);
          gb.forEach(function (bit, k) { if (bit) ctx.strokeRect(OX + (L.fpCol + k % 6) * CW + 2.5, OY + (L.fpRow + Math.floor(k / 6)) * CH + 2.5, CW - 5, CH - 5); });
        }
        var fill = clamp(checkP / .62);
        fp.forEach(function (bit, k) {
          var age = fill * 36 - k;                      // how long ago this cell was written, in cells
          if (age < 0) return;
          var flash = stage === 'check' && p < 1 ? clamp(1 - age / 4) : 0;
          var grow = stage === 'check' && p < 1 ? .4 + .6 * clamp(age / 2) : 1;
          var c0 = L.fpCol + k % 6, r0 = L.fpRow + Math.floor(k / 6);
          cell(ctx, c0, r0, bit ? hsla(colors.primary, .82 * dim) : hsla(colors.doc, .1 * dim), grow);
          if (flash) cell(ctx, c0, r0, hsla(colors.doc, .55 * flash), grow);
        });
        // Signature: a mark beside the claim.
        if (checkP > .7) { cell(ctx, L.fpCol + 6, L.fpRow + 6, hsla(colors.primary, dim)); cell(ctx, L.fpCol + 7, L.fpRow + 6, hsla(colors.primary, .55 * dim)); }
        // Acceptance: an open frame, decided by the checker and authority rules.
        if (checkP > .82) {
          ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = hsla(colors.muted, .7 * clamp((checkP - .82) / .18) * dim);
          ctx.strokeRect(OX + (L.fpCol - 1) * CW + .5, OY + (L.fpRow - 1) * CH + .5, 8 * CW, 9 * CH); ctx.restore();
        }
        if (view.same && checkP >= 1) {
          ctx.strokeStyle = hsla(colors.success, .9); ctx.lineWidth = 2;
          ctx.strokeRect(OX + L.fpCol * CW - 1, OY + L.fpRow * CH - 1, 6 * CW + 2, 6 * CH + 2); ctx.lineWidth = 1;
        }
      }
      placeLabels(L, ok, id, askP, resolveP, checkP);
      narrate(L, ok, id);
    }
    // One plain sentence for what the scene is doing right now.
    function narrate(L, ok, id) {
      var input = view.input, stage = view.stage, p = view.p, text = '';
      if (stage === 'ask') text = p < 1 ? 'Assembling doc:' + input.id + ' (' + size(input.bytes) + ')…' : 'doc:' + input.id + ' is ready. The rule waits at the gate.';
      else if (stage === 'resolve') text = p < .6 ? 'Sending doc:' + input.id + ' to ' + ADDRESS + '…' : p < 1 ? 'Evaluating size ≤ 5 MB…' : (ok ? 'It fits: the rule returns true.' : 'Too large: the rails hold, the rule returns false.');
      else if (stage === 'check') text = p < .65 ? 'Writing the claim, cell by cell…' : p < 1 ? 'Signing it…' : view.same ? 'Same input, same claim: #' + id + ' again.' : 'Signed claim #' + id + '. A checker decides acceptance.';
      if (narration.textContent !== text) narration.textContent = text;
      narration.dataset.show = String(stage !== 'laws');
      narration.dataset.done = String(p >= 1);
    }
    function at(node, c, r, show, dy) { node.style.left = (OX + c * CW) + 'px'; node.style.top = (OY + r * CH + (dy || 0)) + 'px'; node.dataset.show = String(!!show); }
    function placeLabels(L, ok, id, askP, resolveP, checkP) {
      var input = view.input, stage = view.stage;
      labels.doc.textContent = 'doc:' + input.id + ' · ' + size(input.bytes);
      var absorbed = L.fits && resolveP > .82;
      at(labels.doc, Math.max(0, Math.round(L.startCol + (L.endCol - L.startCol) * resolveP)), L.top + L.h + .4, askP > .6 && stage !== 'laws' && !absorbed);
      labels.rule.textContent = stage === 'ask' ? 'rule · size ≤ 5 MB' : size(input.bytes) + ' ≤ 5 MB → ' + ok;
      labels.rule.dataset.result = stage === 'ask' ? '' : String(ok);
      at(labels.rule, L.gate + .5, Math.max(.3, L.openTop - 2.4), stage !== 'laws' && (stage === 'ask' || resolveP > .75));
      labels.claim.textContent = (ok ? 'satisfies ' : 'does not satisfy ') + '· #' + id;
      // The claim's three lines stack beneath the fingerprint at a fixed line height.
      at(labels.claim, L.fpCol + 3, L.fpRow + 7, checkP > .55 && stage !== 'laws', 6);
      labels.sign.textContent = 'signed · provider P-3';
      at(labels.sign, L.fpCol + 3, L.fpRow + 7, checkP > .75 && stage !== 'laws', 26);
      labels.accept.textContent = view.same ? 'same input · same claim' : 'acceptance · checker decides';
      labels.accept.dataset.same = String(view.same);
      at(labels.accept, L.fpCol + 3, L.fpRow + 7, checkP > .9 && stage !== 'laws', 46);
    }

    function stop() { revision++; if (frame) cancelAnimationFrame(frame); frame = 0; }
    function play(stage, input, opts) {
      opts = opts || {};
      stop();
      view.stage = stage; view.input = input; view.ghost = opts.ghost || null; view.same = false;
      canvas.dataset.stage = stage;
      if (!measure()) return;
      var still = reduce.matches || document.hidden || !opts.animate || !DURATION[stage] || (ArkUI.sceneState && ArkUI.sceneState.get().paused);
      if (still) { view.p = 1; view.same = !!opts.ghost; paint(); if (opts.done) opts.done(); return; }
      var ticket = revision, began = -1, last = -Infinity;
      function tick(now) {
        if (disposed || ticket !== revision) return; frame = 0;
        if (began < 0) began = now;
        view.p = Math.min(1, (now - began) / DURATION[stage]);
        if (view.p === 1 && opts.ghost) view.same = opts.ghost === claimId(input, evaluate(input));
        if (now - last >= 1000 / 40 || view.p === 1) { paint(); last = now; }
        if (view.p < 1) frame = requestAnimationFrame(tick); else if (opts.done) opts.done();
      }
      frame = requestAnimationFrame(tick);
    }
    function refresh() { if (frame) return; if (measure()) paint(); }
    var pointerFrame = 0;
    function idlePaint() { if (frame || pointerFrame) return; pointerFrame = requestAnimationFrame(function () { pointerFrame = 0; if (!frame && width) paint(); }); }
    canvas.addEventListener('pointermove', function (event) {
      if (reduce.matches) return;
      var box = canvas.getBoundingClientRect();
      view.pointer = [(event.clientX - box.left - OX) / CW - .5, (event.clientY - box.top - OY) / CH - .5]; idlePaint();
    });
    canvas.addEventListener('pointerleave', function () { view.pointer = null; idlePaint(); });
    function preview(input) { view.preview = input; idlePaint(); }
    var resize = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(refresh) : null; if (resize) resize.observe(canvas);
    var theme = typeof MutationObserver !== 'undefined' ? new MutationObserver(function () { if (measure()) paint(); }) : null;
    if (theme) theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return { play: play, preview: preview, dispose: function () { disposed = true; stop(); if (resize) resize.disconnect(); if (theme) theme.disconnect(); } };
  }

  /* ---- the page ----------------------------------------------------------- */
  ArkUI.buildResolverLab = function (opts) {
    var page = opts.page, words = opts.words, link = opts.link, el = ArkUI.el;
    var root = el('section', 'ark-page guided-page resolver-lab');
    root.dataset.arkPage = page;
    root.setAttribute('aria-labelledby', 'resolver-lab-title');

    var STEP_COPY = {
      ask: [words('INPUT'), words('INPUT.TEXT'), words('ASK.BODY')],
      resolve: [words('LOGIC'), words('LOGIC.TEXT'), words('RESOLVE.BODY')],
      check: [words('CLAIM'), words('CLAIM.TEXT'), words('CHECK.BODY')],
      laws: [words('LAWS'), words('LAWS.BODY'), '']
    };

    /* Left: place, title, the signal-track stepper, the step, the way on. */
    var copy = el('div', 'resolver-lab-copy');
    var path = el('nav', 'content-layer-path'); path.setAttribute('aria-label', 'Your place');
    path.appendChild(link(words('BACK'), 'zero'));
    var here = el('span', '', 'Resolver'); here.setAttribute('aria-current', 'page'); path.appendChild(here);
    copy.appendChild(path);
    copy.appendChild(el('p', 'resolver-lab-kicker', words('EYEBROW')));
    var title = el('h1', '', words('DISPLAY.TITLE')); title.id = 'resolver-lab-title'; copy.appendChild(title);
    copy.appendChild(el('p', 'resolver-lab-lede', words('DISPLAY.LEDE')));

    var track = el('nav', 'resolver-track'); track.setAttribute('aria-label', 'Resolver steps');
    var line = el('span', 'resolver-track-line'); line.setAttribute('aria-hidden', 'true');
    var glow = el('span', 'resolver-track-glow'); glow.setAttribute('aria-hidden', 'true');
    var progress = el('span', 'resolver-track-progress'); progress.setAttribute('aria-hidden', 'true');
    track.appendChild(line); track.appendChild(progress); track.appendChild(glow);
    var tabButtons = STEPS.map(function (id, i) {
      var b = el('button', 'resolver-track-node'); b.type = 'button'; b.dataset.step = id;
      b.style.setProperty('--at', (i / (STEPS.length - 1) * 100) + '%');
      b.appendChild(el('span', 'resolver-track-mark'));
      var label = el('span', 'resolver-track-label');
      label.appendChild(el('small', '', String(i + 1).padStart(2, '0')));
      label.appendChild(document.createTextNode(STEP_COPY[id][0]));
      b.appendChild(label);
      b.addEventListener('click', function () { go(id, true); });
      track.appendChild(b); return b;
    });
    // Arrow keys move along the track, like a tab list.
    track.addEventListener('keydown', function (event) {
      var i = STEPS.indexOf(state.step), to = event.key === 'ArrowRight' ? i + 1 : event.key === 'ArrowLeft' ? i - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? STEPS.length - 1 : -2;
      if (to === -2) return;
      event.preventDefault(); to = Math.max(0, Math.min(STEPS.length - 1, to));
      go(STEPS[to], true); tabButtons[to].focus();
    });
    copy.appendChild(track);

    var caption = el('div', 'resolver-lab-caption'); caption.setAttribute('aria-live', 'polite');
    var captionTitle = el('h2', ''), captionBody = el('p', '');
    caption.appendChild(captionTitle); caption.appendChild(captionBody);
    copy.appendChild(caption);

    var footer = el('nav', 'resolver-lab-footer'); footer.setAttribute('aria-label', 'Continue');
    var prev = el('button', 'resolver-lab-prev'); prev.type = 'button';
    var next = el('a', 'resolver-lab-next');
    var spec = el('a', 'resolver-lab-spec', words('SOURCE') + ' ↗'); spec.href = 'docs/protocol/resolvers.md';
    footer.appendChild(prev); footer.appendChild(next); footer.appendChild(spec);
    copy.appendChild(footer);
    root.appendChild(copy);

    /* Right: the mesh illustration, its inputs, and the laws. */
    var scene = el('figure', 'resolver-lab-scene');
    var head = el('figcaption', 'resolver-lab-scene-head');
    var address = el('span', 'resolver-lab-address');
    address.appendChild(el('code', '', ADDRESS));
    address.appendChild(document.createTextNode(' · runs in your browser'));
    head.appendChild(address);
    scene.appendChild(head);

    var stage = el('div', 'resolver-lab-stage');
    var canvas = el('canvas', 'resolver-mesh'); canvas.setAttribute('aria-hidden', 'true');
    var overlay = el('div', 'resolver-mesh-labels'); overlay.setAttribute('aria-hidden', 'true');
    stage.appendChild(canvas); stage.appendChild(overlay);
    scene.appendChild(stage);

    var controls = el('div', 'resolver-lab-controls');
    var inputs = el('div', 'resolver-lab-inputs'); inputs.setAttribute('role', 'group'); inputs.setAttribute('aria-label', 'Choose a document');
    var inputButtons = INPUTS.map(function (input) {
      var b = el('button', 'resolver-lab-doc'); b.type = 'button'; b.dataset.input = input.id;
      b.appendChild(el('span', '', input.name));
      b.appendChild(el('small', '', size(input.bytes)));
      b.setAttribute('aria-label', input.name + ', ' + size(input.bytes) + ', doc:' + input.id);
      b.addEventListener('click', function () { choose(input.id, true); });
      b.addEventListener('pointerenter', function () { mesh && mesh.preview(input); });
      b.addEventListener('focus', function () { mesh && mesh.preview(input); });
      b.addEventListener('pointerleave', function () { mesh && mesh.preview(null); });
      b.addEventListener('blur', function () { mesh && mesh.preview(null); });
      inputs.appendChild(b); return b;
    });
    var again = el('button', 'resolver-lab-again'); again.type = 'button';
    again.appendChild(el('span', 'resolver-lab-again-icon', '↻')); again.appendChild(document.createTextNode('Run again'));
    again.addEventListener('click', function () { rerun(); });
    controls.appendChild(inputs); head.appendChild(again);
    scene.appendChild(controls);

    // The run, in words, for screen readers (the canvas is decorative).
    var result = el('p', 'resolver-lab-sr'); result.setAttribute('aria-live', 'polite'); scene.appendChild(result);

    // Laws, shown in place of the stage on the Laws step.
    var laws = el('ol', 'resolver-lab-laws');
    // Status rows from docs/status.md: definition (Live, CAP-004), publication
    // (Partial, CAP-004), deployment (Partial, CAP-005). Law 4 is a rule of the
    // specification, not a capability, so it carries no status claim.
    var STATUS = [['Live', 'CAP-004'], ['Partial', 'CAP-004'], ['Partial', 'CAP-005'], ['Spec', 'spec']];
    [1, 2, 3, 4].forEach(function (n, i) {
      var item = el('li', 'resolver-lab-law');
      item.style.setProperty('--i', i);
      var top = el('div', 'resolver-lab-law-top');
      top.appendChild(el('span', 'resolver-lab-law-num', String(n).padStart(2, '0')));
      top.appendChild(el('strong', '', words('LAW' + n)));
      var status = el('span', 'resolver-lab-law-status', STATUS[i][0]); status.dataset.status = STATUS[i][0].toLowerCase();
      if (STATUS[i][1] !== 'spec') status.title = 'docs/status.md · ' + STATUS[i][1];
      top.appendChild(status);
      item.appendChild(top);
      var detail = el('p', '', words('LAW' + n + '.TEXT')); detail.id = 'resolver-law-' + n;
      item.appendChild(detail);
      // Laws you can watch happen link back to the moment in the illustration.
      var SEE = { 1: ['Watch it repeat', 'check', true], 2: ['See the address', 'resolve', false], 4: ['See the signature', 'check', false] };
      if (SEE[n]) {
        var see = el('button', 'resolver-lab-law-see', SEE[n][0] + ' →'); see.type = 'button';
        see.addEventListener('click', function (event) {
          event.stopPropagation();
          var input = current();
          go(SEE[n][1], true, SEE[n][2] ? claimId(input, evaluate(input)) : null);
        });
        detail.appendChild(document.createTextNode(' ')); detail.appendChild(see);
      }
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
    var specLink = el('a', '', 'resolver spec'); specLink.href = 'docs/protocol/resolvers.md';
    var statusLink = el('a', '', 'status page'); statusLink.href = 'docs/status.md';
    lawsSource.appendChild(document.createTextNode('Wording from the ')); lawsSource.appendChild(specLink);
    lawsSource.appendChild(document.createTextNode(' · status from the ')); lawsSource.appendChild(statusLink);
    scene.appendChild(laws); scene.appendChild(lawsSource);
    root.appendChild(scene);

    var mesh = createScene(canvas, overlay);

    /* State ----------------------------------------------------------------- */
    var state = { step: 'ask', input: INPUTS[0].id }, disposed = false, played = false;
    function current() { return INPUTS.filter(function (x) { return x.id === state.input; })[0]; }
    function describe() {
      var input = current(), ok = evaluate(input);
      result.textContent = 'doc:' + input.id + ', ' + size(input.bytes) + ': ' + (ok ? 'satisfies' : 'does not satisfy') + ' ' + ADDRESS + '. Claim id ' + claimId(input, ok) + '.';
    }
    function paintStep() {
      var i = STEPS.indexOf(state.step), copyFor = STEP_COPY[state.step];
      root.dataset.step = state.step;
      track.style.setProperty('--progress', (i / (STEPS.length - 1) * 100) + '%');
      tabButtons.forEach(function (b, k) { b.setAttribute('aria-pressed', String(k === i)); b.dataset.done = String(k < i); b.tabIndex = k === i ? 0 : -1; });
      track.classList.remove('is-arriving'); void track.offsetWidth; track.classList.add('is-arriving');
      captionTitle.textContent = copyFor[1];
      captionBody.textContent = copyFor[2];
      captionBody.hidden = !copyFor[2];
      caption.classList.remove('is-entering'); void caption.offsetWidth; caption.classList.add('is-entering');
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
      again.hidden = state.step === 'ask' || state.step === 'laws';
    }
    function paintInput() { inputButtons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.input === state.input)); }); }
    function visible() { return root.isConnected && !(root.closest && root.closest('[hidden]')) && root.getBoundingClientRect().width > 0; }
    function show(animate, ghost) {
      describe();
      next.classList.remove('is-ready');
      mesh.play(state.step, current(), { animate: animate && visible(), ghost: ghost, done: function () {
        if (state.step !== 'laws') { void next.offsetWidth; next.classList.add('is-ready'); }
      } });
      played = played || (animate && visible());
    }
    function rerun() {
      var input = current();
      state.step = state.step === 'resolve' ? 'resolve' : 'check';
      // Outline the claim we already have, then build the new one into it.
      if (state.step === 'check') show(true, claimId(input, evaluate(input)));
      else mesh.play('resolve', input, { animate: true, done: function () { go('check', true, claimId(input, evaluate(input))); } });
    }

    function write(mode) { ArkUI.route.write(ArkUI.pageCatalog[page].path, 'step=' + state.step + '&input=' + state.input, mode); }
    function go(step, push, ghost) {
      if (STEPS.indexOf(step) < 0) step = 'ask';
      var changed = step !== state.step;
      state.step = step; paintStep();
      if (push && changed) write('push');
      if (changed || ghost) show(true, ghost);
    }
    function choose(id, push) {
      if (!INPUTS.some(function (x) { return x.id === id; })) id = INPUTS[0].id;
      var changed = id !== state.input;
      state.input = id; paintInput();
      if (push && changed) write('replace');
      if (changed) { if (state.step === 'laws') { state.step = 'ask'; paintStep(); write('replace'); } show(true); }
    }
    // Apply the address only when it differs from what is on screen. The router
    // also calls this after our own pushState; replaying then restarted the run.
    function restore(force) {
      if (ArkUI.route.path() !== ArkUI.pageCatalog[page].path) return;
      var q = new URLSearchParams(ArkUI.route.search());
      var step = STEPS.indexOf(q.get('step')) >= 0 ? q.get('step') : 'ask';
      var input = INPUTS.some(function (x) { return x.id === q.get('input'); }) ? q.get('input') : state.input;
      if (!force && step === state.step && input === state.input) return;
      state.step = step; state.input = input;
      paintStep(); paintInput(); show(true);
    }
    // Play the scene once the page is actually on screen, so the visitor sees it happen.
    var waitTimer = 0;
    function whenVisible(tries) {
      clearTimeout(waitTimer);
      if (disposed) return;
      if (visible()) { waitTimer = setTimeout(function () { show(true); }, 220); return; }
      if ((tries || 0) < 60) waitTimer = setTimeout(function () { whenVisible((tries || 0) + 1); }, 200);
    }

    paintStep(); paintInput();
    restore(true);
    if (!played) whenVisible(0);
    function onPop() { restore(false); }
    window.addEventListener('popstate', onPop);
    root.arkRestore = function () { restore(false); if (!played) whenVisible(0); };
    root.arkDispose = function () { disposed = true; clearTimeout(waitTimer); mesh.dispose(); window.removeEventListener('popstate', onPop); };
    return root;
  };
})();

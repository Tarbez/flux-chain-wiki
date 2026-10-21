/* /what-is-a-resolver: the story template (js/pages/story.js) around one illustration drawn in
   the site's block-cell mesh language (js/ark/mesh-fabric.js): finite choreographies on the
   cells, never an idle loop.

   The page (DEFXN polish Wave 3, W3-GUIDE): The idea is the definition and the three steps in
   one line each; How it works is each step in full; Evidence is the four laws with their status,
   what "verified on chain" means and the sources. The boundary (its signature is its result;
   trust is decided before you send) stays in sight in every view. It used to be a hand-built
   two-column screen that met the fold rule on phones with ~10 display:none rules -- the
   definition, the kicker, the policy address, the law bodies, the breadcrumb, the spec link
   (docs/ux-audit/pages-ux-b.md /what-is-a-resolver P1). Every one of them is on the page now.

   The illustration is a real resolver run, locally, in Ark's figure frame (beside the views
   wider than 900px; behind "Show the illustration" narrower -- a press away, never removed):
   Ask      the chosen document assembles as a block of cells sized by its file size.
   Resolve  it travels to a gate whose opening is the 5 MB rule. It passes or it stops.
   Check    the claim forms as a fingerprint drawn from its claim id, receives a
            signature mark, and an open frame shows that trust in the resolver was
            decided before anything was sent: its grammar, capabilities and control.
   Laws     opens the Evidence view; the scene dims.
   Run again first outlines the previous fingerprint, then fills the new one into
   it: same address + input, same claim (the determinism law, shown).

   The illustration's stepper is its signal track: a glow travels to the chosen step and stops.
   Steps and input live in the address (?step=…&input=…, plus ?view= for a depth); every address
   saved before still opens what it opened (?step=laws opens the laws, now in Evidence).
   Copy lives in js/content/manifests/resolver.js. Regression: tests/resolver-lab.cjs,
   tests/resolver-guide-blocks.cjs. */
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
        // Trust: an open frame -- whether to rely on this resolver was decided before the record was sent.
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
      else if (stage === 'check') text = p < .65 ? 'Writing the claim, cell by cell…' : p < 1 ? 'Signing it…' : view.same ? 'Same input, same claim: #' + id + ' again.' : 'Signed by provider P-3: claim #' + id + '. Its signature is its result.';
      // Phones hide the stacked doc/sign/accept labels (no room under the fingerprint), so
      // this line carries what they say -- including the signer, which it once left out.
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
      labels.accept.textContent = view.same ? 'same input · same claim' : 'trust · decided before sending';
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
  /* Status rows from docs/status.md (observed 2026-10-19): law 1 and law 4 are resolver
     launch and upgrade (Partial, CAP-010), law 2 the capability registry and composition
     check (Partial, CAP-011), law 3 grammar enforcement (Partial, CAP-012). Partial, not
     Live: built and running on the development network, production not established. */
  var STATUS = [['Partial', 'CAP-010'], ['Partial', 'CAP-011'], ['Partial', 'CAP-012'], ['Partial', 'CAP-010']];
  /* Laws you can watch happen open the moment in the illustration. */
  var SEE = { 2: ['See it applied', 'resolve', false], 3: ['See the gate', 'resolve', false], 4: ['Watch it repeat', 'check', true] };

  ArkUI.resolverLabDef = function (page) {
    var manifest = ArkManifest.get(page), el = ArkUI.el;
    function words(role) { return ArkCopy.text('RESOLVER.' + role); }
    function copy(role) { return 'copy:RESOLVER.' + role; }
    var STEP_COPY = {
      ask: [words('INPUT'), words('INPUT.TEXT'), words('ASK.BODY')],
      resolve: [words('LOGIC'), words('LOGIC.TEXT'), words('RESOLVE.BODY')],
      check: [words('CLAIM'), words('CLAIM.TEXT'), words('CHECK.BODY')],
      laws: [words('LAWS'), words('LAWS.BODY'), '']
    };

    /* ---- the illustration (the figure's slot): its head, the steps, the step's line, the stage, the
       documents and the way through -- the page's own live content, framed by Ark's figure. The
       canvas scene is hand-drawn because it IS the run; its controls are Ark blocks (ledger W4d / P4,
       2026-10-21), where a hand-built track with its own arrow keys, pressed-state document buttons
       and a pill-shaped Next stood:
         the steps and the documents  Ark's `choice`: a real radio group, so the browser supplies the
                                      keyboard (one tab stop; arrow keys move AND choose). They redraw
                                      one stage and own no panel, so they are not tabs (a tab owns a
                                      panel; the page's one tablist is the depth control).
         Run again, Previous, Next    Ark's actions: buttons that raise ark:action (the def's
                                      handlers), never links a router could follow away from the page.
       The signal rail under the steps stays the page's own drawing: a glow travels to the chosen
       step and stops. */
    function block(spec) { return ArkUI.blocks.render(spec, { onInvalid: 'throw' }); }
    var figure = el('div', 'resolver-lab-scene');
    var head = el('div', 'resolver-lab-scene-head');
    var address = el('span', 'resolver-lab-address');
    address.appendChild(el('code', '', ADDRESS));
    address.appendChild(document.createTextNode(' · runs in your browser'));
    head.appendChild(address);
    var again = block({ block: 'actions', was: WAS['resolver-again'], props: { items: [{ label: 'Run again', action: 'resolver-again', tone: 'secondary' }] } });
    head.appendChild(again);
    figure.appendChild(head);

    var track = el('div', 'resolver-track');
    var stepChoice = block({ block: 'choice', id: 'resolver-steps', was: WAS['resolver-steps'], props: { label: 'Resolver steps', look: 'segmented', value: STEPS[0],
      options: STEPS.map(function (id, i) { return { value: id, label: String(i + 1).padStart(2, '0') + ' ' + STEP_COPY[id][0] }; }) } });
    track.appendChild(stepChoice);
    var rail = el('span', 'resolver-track-rail'); rail.setAttribute('aria-hidden', 'true');
    rail.appendChild(el('span', 'resolver-track-progress')); rail.appendChild(el('span', 'resolver-track-glow'));
    track.appendChild(rail);
    // A choice of a step is a step (an arrow key chooses too).
    stepChoice.addEventListener('change', function (event) { if (event.target.checked) go(event.target.value, true); });
    figure.appendChild(track);
    // What this step does, in one line (the full step is How it works).
    var caption = el('p', 'resolver-lab-caption'); caption.setAttribute('aria-live', 'polite');
    figure.appendChild(caption);

    var stage = el('div', 'resolver-lab-stage');
    var canvas = el('canvas', 'resolver-mesh'); canvas.setAttribute('aria-hidden', 'true');
    var overlay = el('div', 'resolver-mesh-labels'); overlay.setAttribute('aria-hidden', 'true');
    stage.appendChild(canvas); stage.appendChild(overlay);
    figure.appendChild(stage);

    var controls = el('div', 'resolver-lab-controls');
    var docChoice = block({ block: 'choice', id: 'resolver-documents', was: WAS['resolver-documents'], props: { label: 'Choose a document', look: 'segmented', value: INPUTS[0].id,
      options: INPUTS.map(function (input) { return { value: input.id, label: input.name + ' · ' + size(input.bytes) }; }) } });
    docChoice.addEventListener('change', function (event) { if (event.target.checked) choose(event.target.value, true); });
    // Pointing at or focusing a document previews its footprint on the stage.
    Array.prototype.forEach.call(docChoice.querySelectorAll('[data-ark-part="choice-option"]'), function (option) {
      var input = INPUTS.filter(function (x) { return x.id === option.querySelector('input').value; })[0];
      function on() { if (mesh) mesh.preview(input); }
      function off() { if (mesh) mesh.preview(null); }
      option.addEventListener('pointerenter', on); option.addEventListener('pointerleave', off);
      option.addEventListener('focusin', on); option.addEventListener('focusout', off);
    });
    controls.appendChild(docChoice);
    var way = block({ block: 'actions', was: WAS['resolver-way'], props: { label: 'Step through', items: [
      { label: 'Previous step', action: 'resolver-back', tone: 'ghost' }, { label: 'Next step', action: 'resolver-next', tone: 'primary' }] } });
    way.classList.add('resolver-lab-way');
    var prev = way.querySelector('[data-action="resolver-back"]'), next = way.querySelector('[data-action="resolver-next"]');
    controls.appendChild(way);
    figure.appendChild(controls);
    // The legends name each group for a screen reader; on screen the steps and documents say it.
    [stepChoice, docChoice].forEach(function (choice) { choice.querySelector('[data-ark-part="choice-legend"]').classList.add('ark-visually-hidden'); });
    // The run, in words, for screen readers (the canvas is decorative).
    var result = el('p', 'resolver-lab-sr'); result.setAttribute('aria-live', 'polite'); figure.appendChild(result);

    var mesh = createScene(canvas, overlay);

    /* ---- the views, as blocks ---- */
    var steps = ['ask', 'resolve', 'check'];
    var laws = [1, 2, 3, 4].map(function (n, i) {
      var item = { value: 'law-' + n, title: String(n).padStart(2, '0') + ' · ' + words('LAW' + n) + ' · ' + STATUS[i][0],
        content: words('LAW' + n + '.TEXT') + '\n\nStatus: ' + STATUS[i][0] + ' (docs/status.md · ' + STATUS[i][1] + ').' };
      if (SEE[n]) item.blocks = [{ block: 'actions', props: { label: words('LAW' + n), items: [{ label: SEE[n][0], action: 'see-law-' + n, tone: 'link' }] } }];
      return item;
    });
    /* The way through and Run again: Ark action buttons, answered here. A button is not a link, so
       nothing can follow it off the page after go() repaints (the old Next was a link the router took). */
    var handlers = {
      'resolver-back': function () { var i = STEPS.indexOf(state.step); if (i > 0) go(STEPS[i - 1], true); },
      'resolver-next': function () { var i = STEPS.indexOf(state.step); if (i < STEPS.length - 1) go(STEPS[i + 1], true); },
      'resolver-again': function () { rerun(); }
    };
    Object.keys(SEE).forEach(function (n) {
      handlers['see-law-' + n] = function () {
        var input = current();
        if (root && root.story) root.story.select('context', { quiet: true });
        // On a phone the illustration is folded behind "Show the illustration": open it.
        var fold = root && root.querySelector('#resolver-figure');
        var trigger = fold && fold.querySelector('[data-ark-part="disclosure-trigger"]');
        if (fold && fold.getAttribute('data-state') === 'closed' && trigger && trigger.offsetParent) trigger.click();
        go(SEE[n][1], false, SEE[n][2] ? claimId(input, evaluate(input)) : null);
        write('push');
      };
    });

    /* ---- state ---- */
    var state = { step: 'ask', input: INPUTS[0].id }, disposed = false, played = false, root = null;
    function current() { return INPUTS.filter(function (x) { return x.id === state.input; })[0]; }
    function describe() {
      var input = current(), ok = evaluate(input);
      result.textContent = 'doc:' + input.id + ', ' + size(input.bytes) + ': ' + (ok ? 'satisfies' : 'does not satisfy') + ' ' + ADDRESS + '. Claim id ' + claimId(input, ok) + '.';
    }
    function view(name) { if (root && root.story && root.story.view() !== name) root.story.select(name); }
    function query(depth) {
      var v = depth || (root && root.story ? root.story.view() : 'focus');
      if (v === 'reference') return 'view=reference&step=laws&input=' + state.input;
      return (v === 'context' ? 'view=context&' : '') + 'step=' + state.step + '&input=' + state.input;
    }
    function write(mode) { if (root) ArkUI.route.write(ArkUI.pageCatalog[page].path, query(), mode); }
    // Choosing in a choice block is checking its radio (no change event, so no second go()).
    function mark(choice, value) { var box = choice.querySelector('input[value="' + value + '"]'); if (box && !box.checked) box.checked = true; }
    function paintStep() {
      var i = STEPS.indexOf(state.step), copyFor = STEP_COPY[state.step];
      figure.dataset.step = state.step;
      // The rail's glow stops under the chosen step (the steps share the width equally).
      track.style.setProperty('--progress', ((i + .5) / STEPS.length * 100) + '%');
      mark(stepChoice, state.step);
      track.classList.remove('is-arriving'); void track.offsetWidth; track.classList.add('is-arriving');
      caption.textContent = copyFor[1];
      // A button that is about to hide hands the focus to the step now chosen, not to the page.
      var lost = (i === 0 && document.activeElement === prev) || (i === STEPS.length - 1 && document.activeElement === next);
      prev.hidden = i === 0; next.hidden = i === STEPS.length - 1;
      if (lost) { var chosen = stepChoice.querySelector('input:checked'); if (chosen) chosen.focus(); }
      again.hidden = state.step === 'ask' || state.step === 'laws';
    }
    function paintInput() { mark(docChoice, state.input); }
    function visible() { return figure.isConnected && !(figure.closest && figure.closest('[hidden]')) && figure.getBoundingClientRect().width > 0; }
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
    /* Laws is the Evidence view: choosing it there opens the view; leaving the view leaves Laws. */
    function go(step, push, ghost) {
      if (STEPS.indexOf(step) < 0) step = 'ask';
      var changed = step !== state.step;
      state.step = step; paintStep();
      // Choosing Laws opens Evidence (and leaving it leaves Evidence): the view change writes the
      // address itself, so it is written once.
      var depth = root && root.story ? root.story.view() : 'focus', switched = false;
      if (step === 'laws' && depth !== 'reference') { view('reference'); switched = true; }
      else if (step !== 'laws' && depth === 'reference') { view('focus'); switched = true; }
      if (push && changed && !switched) write('push');
      if (changed || ghost) show(true, ghost);
    }
    function choose(id, push) {
      if (!INPUTS.some(function (x) { return x.id === id; })) id = INPUTS[0].id;
      var changed = id !== state.input;
      state.input = id; paintInput();
      if (push && changed) write('replace');
      if (changed) { if (state.step === 'laws') { state.step = 'ask'; paintStep(); write('replace'); } show(true); }
    }
    // Apply the address only when it differs from what is on screen. The router also calls this
    // after our own pushState; replaying then restarted the run.
    function restore(params, force) {
      if (!params) return;
      var step = STEPS.indexOf(params.get('step')) >= 0 ? params.get('step') : 'ask';
      var input = INPUTS.some(function (x) { return x.id === params.get('input'); }) ? params.get('input') : state.input;
      if (params.get('view') === 'reference') step = 'laws';
      if (!force && step === state.step && input === state.input) return;
      state.step = step; state.input = input;
      if (step === 'laws' && root.story.view() !== 'reference') root.story.select('reference', { quiet: true });
      paintStep(); paintInput(); show(true);
    }
    // Play the scene once the illustration is actually on screen, so the visitor sees it happen.
    var waitTimer = 0;
    function whenVisible(tries) {
      clearTimeout(waitTimer);
      if (disposed) return;
      if (visible()) { waitTimer = setTimeout(function () { show(true); }, 220); return; }
      if ((tries || 0) < 60) waitTimer = setTimeout(function () { whenVisible((tries || 0) + 1); }, 200);
    }
    paintStep(); paintInput();

    /* "Wording from the resolver spec · status from the status page": the laws' two sources (the spec link is also the old footer's "Read the resolver spec") */
    var sources = [{ label: 'Wording from the resolver spec', href: words('SOURCE.HREF'), tone: 'link' }, { label: 'Status from the status page', href: words('STATUS.HREF'), tone: 'link' }];
    /* what "verified on chain" means, what is planned, and where the two products run today */
    var verified = [1, 2, 3].map(function (n) { return words('VERIFIED.FACT' + n); }).concat([words('VERIFIED.PLANNED'), words('PRODUCTS.NOTE')]).join('\n\n');
    /* The page this journey starts at (Resolutions: every thing you can resolve, one page each): the Laws step led to the registry, the math and
       the examples but not to the list of what resolves (docs/ux-audit/ledger.md WR-3). Derived from the journey, not typed here. */
    var resolutions = ArkUI.journeyLead ? [ArkUI.journeyLead(page)].filter(Boolean).map(function (item) { return { label: item.label, href: item.href }; }) : [];
    return {
      page: page, id: 'resolver', className: 'resolver-lab', titleId: 'resolver-lab-title', was: WAS, insertWas: WAS.insert,
      crumbs: [{ label: 'Home', href: words('HOME.HREF') }, { label: 'Resolver' }],
      eyebrow: copy('EYEBROW'), title: copy('DISPLAY.TITLE'),
      depth: {
        focus: { text: copy('DISPLAY.LEDE'), blocks: [{ block: 'steps', props: { label: 'One run', items: steps.map(function (id) { return { title: STEP_COPY[id][0], body: STEP_COPY[id][1] }; }) } }] },
        /* one step open at a time, as the illustration plays one at a time */
        context: { blocks: [{ block: 'accordion', props: { label: 'How a resolver answers', multiple: false, defaultOpen: ['ask'], headingLevel: 3, items: steps.map(function (id) { return { value: id, title: STEP_COPY[id][0] + ' · ' + STEP_COPY[id][1], content: STEP_COPY[id][2] }; }) } }] },
        reference: { text: copy('LAWS.BODY'), blocks: [
          { block: 'accordion', props: { label: words('LAWS'), multiple: true, headingLevel: 3, items: laws.concat([{ value: 'verified', title: words('VERIFIED.TITLE'), content: verified }]) } },
          { block: 'actions', props: { label: 'Sources', items: sources } }
        ] }
      },
      /* The trust boundary, in sight in every view; on a phone it folds behind "Show the status". */
      boundary: { tone: 'reference', title: copy('BOUNDARY.LABEL'), body: copy('BOUNDARY') }, boundaryFold: 'phone',
      figure: { slot: 'lab', kind: 'live', caption: 'A real resolver run, in your browser: ' + ADDRESS + ' applies its 5 MB rule to the document you choose.' },
      slots: { lab: figure },
      handlers: handlers,
      pager: { label: 'Continue',
        next: { label: copy('NEXT'), href: 'route:' + manifest.meta.next },
        related: ['REGISTRY', 'MATH', 'EXPLORE', 'DEPLOYER'].map(function (k) { return { label: copy(k + '.LINK'), href: words(k + '.HREF') }; })
          .concat([{ label: 'Inspect reference evidence', href: words('INSPECT.HREF') }], resolutions) },
      query: function (depth) { return query(depth); },
      onView: function (depth) {
        if (!root) return;
        if (depth === 'reference' && state.step !== 'laws') { state.step = 'laws'; paintStep(); show(false); }
        else if (depth !== 'reference' && state.step === 'laws') { state.step = 'ask'; paintStep(); show(true); }
      },
      onRestore: function (params) { restore(params, false); },
      onFigureVisibility: function (node, on) { if (on && !played) whenVisible(0); },
      afterMount: function (el) {
        root = el;
        restore(el.story.params() || new URLSearchParams(''), true);
        if (!played) whenVisible(0);
        var prior = el.arkRestore;
        el.arkRestore = function () { if (prior) prior(); if (!played) whenVisible(0); };
      },
      dispose: function () { disposed = true; clearTimeout(waitTimer); mesh.dispose(); }
    };
  };
  /* `was`: the key each element of the hand-built page had, so a CMS edit saved against it still
     lands (docs/cms-architecture.md "Layout keys"). Started from tests/lib/layout-continuity.cjs's
     derive against the frozen census (tests/fixtures/layout-keys/what-is-a-resolver.tsv) and
     settled by hand where a word matched by chance (a "01" step number is not a law's "01");
     tests/resolver-guide-blocks.cjs lists every reshaped and retired key with its reason. */
  var LAW = function (i) { return ':scope > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(' + i + ') > div:nth-of-type(1) > div:nth-of-type(1)'; };
  var VERIFIED = ':scope > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(5) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(';
  var RELATED = function (n) { return ':scope > div:nth-of-type(2) > ul:nth-of-type(1) > li:nth-of-type(' + n + ') > a:nth-of-type(1)'; };
  var WAS = {
    'resolver-crumbs': { ':root': 'page:/div:1/nav:1', 'breadcrumb-item': 'page:/div:1/nav:1/a:1', 'breadcrumb-item#2': 'page:/div:1/nav:1/span:1' },
    'resolver-hero': { eyebrow: 'page:/div:1/p:1', 'hero-title': 'id:resolver-lab-title' },
    'resolver-depth': {
      ':scope > div:nth-of-type(2) > p:nth-of-type(1)': 'page:/div:1/p:2',
      'accordion-item': { key: 'page:/div:1/div:1', self: true }, 'accordion-content': 'page:/div:1/div:1/p:1',
      'accordion#2': { key: 'page:/figure:1/ol:1', self: true },
      'accordion-item#4': { key: 'page:/figure:1/ol:1/li:1', self: true }, 'accordion-item#5': { key: 'page:/figure:1/ol:1/li:2', self: true },
      'accordion-item#6': { key: 'page:/figure:1/ol:1/li:3', self: true }, 'accordion-item#7': { key: 'page:/figure:1/ol:1/li:4', self: true },
      'accordion-trigger#4': { key: 'page:/figure:1/ol:1/li:1/div:1', self: true }, 'accordion-trigger#5': { key: 'page:/figure:1/ol:1/li:2/div:1', self: true },
      'accordion-trigger#6': { key: 'page:/figure:1/ol:1/li:3/div:1', self: true }, 'accordion-trigger#7': { key: 'page:/figure:1/ol:1/li:4/div:1', self: true },
      'button': 'page:/figure:1/ol:1/li:2/p:1/button:1', 'button#2': 'page:/figure:1/ol:1/li:3/p:1/button:1', 'button#3': 'page:/figure:1/ol:1/li:4/p:1/button:1',
      'actions#4': 'page:/figure:1/p:2', 'button#4': 'page:/figure:1/p:2/a:1', 'button#5': 'page:/figure:1/p:2/a:2',
      'accordion-item#8': { key: 'page:/div:1/div:2', self: true }, 'accordion-trigger#8': { key: 'page:/div:1/div:2/details:1/summary:1', self: true },
      'accordion-content#8': { key: 'page:/div:1/div:2/details:1', self: true }
    },
    'resolver-figure': {
      'figure': { key: 'page:/figure:1', self: true },
      '.resolver-lab-scene-head': 'page:/figure:1/figcaption:1', '.resolver-lab-caption': 'page:/div:1/div:1/h2:1',
      '.resolver-lab-stage': 'page:/figure:1/div:1', '.resolver-lab-controls': 'page:/figure:1/div:2', '.resolver-lab-sr': 'page:/figure:1/p:1',
      /* the old track's line, progress and glow are the rail's three spans */
      '.resolver-track-rail': 'page:/div:1/nav:2/span:1', '.resolver-track-progress': 'page:/div:1/nav:2/span:2', '.resolver-track-glow': 'page:/div:1/nav:2/span:3'
    },
    /* The illustration's controls became Ark blocks on 2026-10-21 (ledger W4d / P4); each keeps the
       keys of what it replaced. The steps' choice is the old track (its four buttons, their words);
       the documents' choice is the old document group; Run again and the way through are Ark buttons. */
    'resolver-steps': { 'choice-options': 'page:/div:1/nav:2' },
    'resolver-documents': { 'choice-options': 'page:/figure:1/div:2/div:1', 'choice-option': 'page:/figure:1/div:2/div:1/button:1',
      'choice-option#2': 'page:/figure:1/div:2/div:1/button:2', 'choice-option#3': 'page:/figure:1/div:2/div:1/button:3' },
    'resolver-again': { 'button': 'page:/figure:1/figcaption:1/button:1' },
    'resolver-way': { ':root': { key: 'page:/div:1/nav:3', self: true }, 'button': 'page:/div:1/nav:3/button:1', 'button#2': 'page:/div:1/nav:3/a:1' },
    'resolver-pager': {
      ':scope > div:nth-of-type(1) > a:nth-of-type(1) > span:nth-of-type(2)': 'page:/div:1/div:2/nav:1/a:2', ':scope > div:nth-of-type(2) > ul:nth-of-type(1)': { key: 'page:/div:1/div:2/nav:1', self: true }
    },
    insert: 'page:/div:2'
  };
  [1, 2, 3, 4].forEach(function (n) { WAS['resolver-depth'][LAW(n) + ' > p:nth-of-type(1)'] = 'id:resolver-law-' + n; });
  [1, 2, 3, 4].forEach(function (n) {
    var sfx = n > 1 ? '#' + n : '', old = 'page:/div:1/nav:2/button:' + n;
    WAS['resolver-steps']['choice-option' + sfx] = old; WAS['resolver-steps']['choice-text' + sfx] = old + '/span:2';
  });
  [1, 2, 3].forEach(function (n) { WAS['resolver-depth'][VERIFIED + n + ')'] = 'page:/div:1/div:2/details:1/ol:1/li:' + n; });
  WAS['resolver-depth'][VERIFIED + '4)'] = 'page:/div:1/div:2/details:1/p:1';
  WAS['resolver-depth'][VERIFIED + '5)'] = 'page:/div:1/div:2/p:1';
  [[1, 1], [3, 3], [4, 4], [2, 5], [5, 6]].forEach(function (pair) { WAS['resolver-pager'][RELATED(pair[0])] = 'page:/div:1/div:2/nav:1/a:' + pair[1]; });
})();

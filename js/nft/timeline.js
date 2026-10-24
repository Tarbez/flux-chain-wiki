/* DEFXN identity card: TIMELINES. A card's pieces move together, once, and stop.

   A timeline is tracks. Each track names a target, a property, an easing, a delay, a stagger and its
   keyframes, every one from a closed set, so a timeline that would break a page cannot be written:
     target    the skin's drawn pieces by kind: frame, corner, nameplate, accent-strip, divider, icon
               (Ark UI's data-ark-skin-deco names; the old names tag, ornament and emblem still match),
               or art: the card's panel art and world (js/nft/scene.js)
     property  draw   the piece is revealed from one side (clip-path inset), from: left|top|right|bottom
               rise   it moves up into place (translateY, px)
               grow   it scales up into place
               turn   it turns into place (deg)
     easing    out | in-out | snap
   Times are ms. A track's keyframes go from its `from` value to its rest. The site has no fades, so no
   track touches opacity.

   The rails, checked by DefxnTimeline.check(timeline) before anything plays:
     - every track ends; the whole timeline lasts at most MAX_MS (1200 ms), stagger included;
     - with prefers-reduced-motion nothing plays and the page shows its rest at once;
     - a played timeline leaves no inline style behind (each animation is cancelled at its end, so the
       element's own style is what remains) and no idle frame (the browser's own engine plays it).

   DefxnTimeline.arrival(recipe) derives a card's own arrival from what its 3D layers build (each
   element's census, js/nft/grid-look.js) and its rules, so every card arrives its own way:
     - the beam layer's thin parts draw the pieces from a side (a scan); its points pop them in order;
       a card with no beam lets them rise
     - the particles layer's count sets the stagger: many particles, a quick cascade
     - the glow layer's count sets how long the art takes to arrive
     - the edge rule sets the easing: cut snaps, soft eases out, square eases both ways
   DefxnTimeline.play(root, timeline) -> Promise of { played, ms }. DefxnTimeline.encode / decode write
   and read a timeline as FLX records (DFXNTL1), for timelines a person authors in the CMS 3D studio.
   Works in the browser (window.DefxnTimeline); encode, decode, check and arrival also work in Node. */
(function (root) {
  'use strict';

  var MAX_MS = 1200;
  var TARGETS = ['frame', 'corner', 'nameplate', 'accent-strip', 'divider', 'icon', 'art'];
  var ALIAS = { frame: ['frame', 'corners'], corner: ['corner', 'corners'], nameplate: ['nameplate', 'tag'], 'accent-strip': ['ornament', 'accent-strip'], divider: ['divider'], icon: ['icon', 'emblem'] };
  var PROPS = { draw: ['left', 'top', 'right', 'bottom'], rise: [0, 48], grow: [0.6, 1], turn: [-30, 30] };
  var EASE = { out: 'cubic-bezier(.2,.7,.2,1)', 'in-out': 'cubic-bezier(.6,0,.3,1)', snap: 'cubic-bezier(.7,0,.2,1.15)' };
  var ORDER = ['backdrop', 'aura', 'mark', 'signal', 'particles'];

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lg(x, top) { return clamp(Math.log10(1 + x) / top, 0, 1); }

  // a timeline that keeps every rail, or a refusal that names what to change
  function check(tl) {
    var problems = [];
    (tl.tracks || []).forEach(function (t, i) {
      if (TARGETS.indexOf(t.target) < 0) problems.push('track ' + (i + 1) + ': target "' + t.target + '" is not one of ' + TARGETS.join(', '));
      if (!PROPS[t.prop]) problems.push('track ' + (i + 1) + ': property "' + t.prop + '" is not one of ' + Object.keys(PROPS).join(', '));
      else if (t.prop === 'draw' && PROPS.draw.indexOf(t.from) < 0) problems.push('track ' + (i + 1) + ': draw comes from ' + PROPS.draw.join(', '));
      else if (t.prop !== 'draw' && (typeof t.from !== 'number' || t.from < PROPS[t.prop][0] || t.from > PROPS[t.prop][1])) problems.push('track ' + (i + 1) + ': ' + t.prop + ' starts between ' + PROPS[t.prop].join(' and '));
      if (!EASE[t.easing]) problems.push('track ' + (i + 1) + ': easing "' + t.easing + '" is not one of ' + Object.keys(EASE).join(', '));
      var end = (t.delay || 0) + (t.ms || 0) + (t.stagger || 0) * Math.max(0, (t.most || 12) - 1);
      if (!(t.ms > 0) || end > MAX_MS) problems.push('track ' + (i + 1) + ': it must end within ' + MAX_MS + ' ms, stagger included (it ends at ' + Math.round(end) + ' ms)');
    });
    return { ok: !problems.length, problems: problems };
  }

  // a card's own arrival, from its census and its rules
  function arrival(recipe) {
    var traits = recipe && recipe.traits, picks = (recipe && recipe.picks) || (traits && traits.picks) || {};
    var census = {};
    ORDER.forEach(function (k) { census[k] = (picks[k] && picks[k].census) || { cubes: 0, glass: 0, pts: 0, thin: 0 }; });
    var rules = (recipe && recipe.rules) || {};
    var beam = census.signal, beamParts = beam.cubes + beam.glass + beam.pts + beam.thin;
    var mode = !beamParts ? 'rise' : beam.thin >= beam.pts ? 'scan' : 'pop';
    var side = mode === 'scan' ? (beam.thin % 2 ? 'left' : 'top') : 'left';
    var p = census.particles, many = lg(p.pts + p.cubes + p.glass, 3.5);
    var stagger = Math.round(70 - 50 * many);                      // 20 to 70 ms between pieces
    var g = census.aura, glow = lg(g.pts + g.cubes + g.glass + g.thin, 2.6);
    var artMs = Math.round(420 + 360 * glow);                     // 420 to 780 ms
    var easing = rules.edge === 'cut' ? 'snap' : rules.edge === 'square' ? 'in-out' : 'out';
    var piece = mode === 'scan' ? { prop: 'draw', from: side } : mode === 'pop' ? { prop: 'grow', from: 0.6 } : { prop: 'rise', from: 18 };
    var tracks = [
      { target: 'art', prop: 'draw', from: 'left', easing: 'out', delay: 0, ms: artMs, stagger: 0, most: 1 },
      { target: 'frame', prop: piece.prop, from: piece.from, easing: easing, delay: 80, ms: 380, stagger: stagger, most: 10 },
      { target: 'corner', prop: piece.prop, from: piece.from, easing: easing, delay: 80, ms: 300, stagger: stagger, most: 10 },
      { target: 'nameplate', prop: 'rise', from: 12, easing: easing, delay: 160, ms: 320, stagger: stagger, most: 4 },
      { target: 'accent-strip', prop: 'draw', from: 'left', easing: easing, delay: 200, ms: 360, stagger: stagger, most: 8 },
      { target: 'divider', prop: 'draw', from: 'left', easing: easing, delay: 220, ms: 340, stagger: stagger, most: 8 },
      { target: 'icon', prop: mode === 'pop' ? 'grow' : 'rise', from: mode === 'pop' ? 0.6 : 10, easing: easing, delay: 260, ms: 260, stagger: Math.round(stagger / 2), most: 12 }
    ];
    return { version: 1, name: 'arrival', mode: mode, tracks: tracks, why: 'beam ' + beamParts + ' parts (' + mode + '), particles ' + (p.pts + p.cubes + p.glass) + ' (stagger ' + stagger + ' ms), glow ' + Math.round(glow * 100) + '% (art ' + artMs + ' ms), edge ' + (rules.edge || 'keep') + ' (' + easing + ')' };
  }

  function keyframes(t) {
    if (t.prop === 'draw') {
      var hide = { left: 'inset(0 100% 0 0)', right: 'inset(0 0 0 100%)', top: 'inset(0 0 100% 0)', bottom: 'inset(100% 0 0 0)' }[t.from];
      return [{ clipPath: hide }, { clipPath: 'inset(0 0 0 0)' }];
    }
    if (t.prop === 'rise') return [{ transform: 'translateY(' + t.from + 'px)' }, { transform: 'translateY(0)' }];
    if (t.prop === 'grow') return [{ transform: 'scale(' + t.from + ')' }, { transform: 'scale(1)' }];
    return [{ transform: 'rotate(' + t.from + 'deg)' }, { transform: 'rotate(0)' }];
  }
  function targets(rootEl, t) {
    if (t.target === 'art') return Array.prototype.slice.call(rootEl.querySelectorAll('.nft-panel-art, .nft-world'));
    var names = ALIAS[t.target] || [t.target];
    return Array.prototype.slice.call(rootEl.querySelectorAll('[data-ark-skin-deco]')).filter(function (e) {
      var d = e.getAttribute('data-ark-skin-deco'); return names.some(function (n) { return d === n || d.indexOf(n + '-') === 0; });
    }).filter(function (e) { var r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight; });
  }
  // the animations each root is playing: a new play on a root ends that root's earlier one, and never
  // another root's (one module-wide list let a play anywhere cancel the art's arrival elsewhere)
  var running = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  function play(rootEl, tl) {
    var prior = running && running.get(rootEl);
    if (prior) prior.forEach(function (a) { a.cancel(); });
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var ok = check(tl);
    if (!ok.ok) return Promise.reject(new Error('The timeline was not played: ' + ok.problems.join('; ') + '.'));
    if (reduce || !Element.prototype.animate) return Promise.resolve({ played: 0, ms: 0, reduced: !!reduce });
    var t0 = performance.now(), anims = [];
    tl.tracks.forEach(function (t) {
      targets(rootEl, t).slice(0, t.most || 12).forEach(function (e, i) {
        var a = e.animate(keyframes(t), { duration: t.ms, delay: (t.delay || 0) + i * (t.stagger || 0), easing: EASE[t.easing], fill: 'backwards' });
        anims.push(a);
      });
    });
    if (running) running.set(rootEl, anims);
    var cancelled = 0;
    return Promise.all(anims.map(function (a) { return a.finished.catch(function () { cancelled++; }); })).then(function () {
      anims.forEach(function (a) { a.cancel(); });               // nothing stays behind on the element
      if (running && running.get(rootEl) === anims) running.delete(rootEl);
      return { played: anims.length, cancelled: cancelled, ms: Math.round(performance.now() - t0) };
    });
  }

  /* ---------- the FLX grammar of a timeline: DFXNTL1 ----------
     One record per track: DFXNTL1-K<hex target>-P<hex property>-F<hex from>-E<hex easing>-D<delay>-M<ms>-S<stagger>-X<most>
     Text is hex of its UTF-8 bytes, numbers are decimal. decode() refuses anything encode() could not write. */
  function hex(s) { var b = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(String(s)) : Buffer.from(String(s), 'utf8'); return Array.prototype.map.call(b, function (x) { return (x < 16 ? '0' : '') + x.toString(16); }).join(''); }
  function unhex(h) { var a = new Uint8Array(h.length / 2); for (var i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return typeof TextDecoder !== 'undefined' ? new TextDecoder().decode(a) : Buffer.from(a).toString('utf8'); }
  var BOX = [['DFXNTL1', /^$/], ['K', /^(?:[0-9a-f]{2})+$/], ['P', /^(?:[0-9a-f]{2})+$/], ['F', /^(?:[0-9a-f]{2})+$/], ['E', /^(?:[0-9a-f]{2})+$/], ['D', /^\d+$/], ['M', /^\d+$/], ['S', /^\d+$/], ['X', /^\d+$/]];
  function encode(tl) {
    return tl.tracks.map(function (t) {
      return ['DFXNTL1', 'K' + hex(t.target), 'P' + hex(t.prop), 'F' + hex(t.from), 'E' + hex(t.easing), 'D' + (t.delay || 0), 'M' + t.ms, 'S' + (t.stagger || 0), 'X' + (t.most || 12)].join('-');
    }).join('\n') + '\n';
  }
  function decode(text) {
    var tracks = String(text).split('\n').filter(function (l) { return l.trim(); }).map(function (line, n) {
      var boxes = line.trim().split('-');
      if (boxes.length !== BOX.length) throw new Error('Timeline line ' + (n + 1) + ' must have ' + BOX.length + ' boxes: DFXNTL1-K-P-F-E-D-M-S-X.');
      var v = {};
      boxes.forEach(function (b, i) {
        var l = BOX[i][0];
        if (b.indexOf(l) !== 0 || !BOX[i][1].test(b.slice(l.length))) throw new Error('Timeline line ' + (n + 1) + ': box ' + (i + 1) + ' must be ' + l + ' with a payload it allows.');
        v[l] = b.slice(l.length);
      });
      var prop = unhex(v.P), from = unhex(v.F);
      return { target: unhex(v.K), prop: prop, from: prop === 'draw' ? from : +from, easing: unhex(v.E), delay: +v.D, ms: +v.M, stagger: +v.S, most: +v.X };
    });
    var tl = { version: 1, tracks: tracks }, c = check(tl);
    if (!c.ok) throw new Error('The timeline reads, but breaks a rail: ' + c.problems.join('; ') + '.');
    if (encode(tl) !== String(text).split('\n').filter(function (l) { return l.trim(); }).join('\n') + '\n') throw new Error('The timeline reads, but does not write back the same. It was not written by this grammar.');
    return tl;
  }

  root.DefxnTimeline = { MAX_MS: MAX_MS, TARGETS: TARGETS.slice(), PROPS: Object.keys(PROPS), EASINGS: Object.keys(EASE), check: check, arrival: arrival, play: play, encode: encode, decode: decode };
})(typeof window !== 'undefined' ? window : globalThis);

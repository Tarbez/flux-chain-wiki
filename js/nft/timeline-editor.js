/* DEFXN identity card: the TIMELINE EDITOR (the owner's goal: people create and animate timelines with their card's
   elements, in the CMS studio). It edits one DFXNTL1 timeline (js/nft/timeline.js) with controls that offer only the
   grammar's closed values, so a timeline that would break a page cannot be made here either.

   Every change is checked with DefxnTimeline.check. A timeline that fails says which track and what to change, and
   it is not handed on. One that passes goes to opts.onChange with its FLX text. Preview plays it on opts.preview()
   (an element: the card's components or a dressed part), and plays nothing under reduced motion, as on a site.

   DefxnTimelineEditor.mount(host, opts) -> { get() -> the timeline, set(timeline), remove(), destroy() }
     opts.timeline   where to start (default: one frame track)
     opts.preview    () -> the element a preview plays on (without it, no Preview button: the host previews)
     opts.onChange   (timeline, flxText) after each change that passes the check
   Needs js/nft/timeline.js. */
(function (root) {
  'use strict';
  if (root.DefxnTimelineEditor) return;

  var NAMES = { frame: 'Frame', corner: 'Corners', nameplate: 'Nameplate', 'accent-strip': 'Accent strip', divider: 'Divider', icon: 'Icon', art: 'Art' };
  var MOVES = { draw: 'Draw from a side', rise: 'Rise into place', grow: 'Grow into place', turn: 'Turn into place' };
  var EASE = { out: 'Ease out', 'in-out': 'Ease in and out', snap: 'Snap' };
  var START = { draw: 'left', rise: 12, grow: 0.8, turn: 12 };

  function mount(host, opts) {
    opts = opts || {};
    var T = root.DefxnTimeline;
    if (!T) throw new Error('The timeline editor needs js/nft/timeline.js. Load it first.');
    var tl = JSON.parse(JSON.stringify(opts.timeline || { version: 1, tracks: [{ target: 'frame', prop: 'draw', from: 'left', easing: 'out', delay: 0, ms: 360, stagger: 40, most: 8 }] }));
    var form = document.createElement('div'), list = document.createElement('ol'), tools = document.createElement('div'), problems = document.createElement('div'), out = document.createElement('pre');
    form.className = 'defxn-tle'; list.className = 'defxn-tle__tracks'; tools.className = 'defxn-tle__tools';
    problems.className = 'defxn-tle__problems'; problems.setAttribute('role', 'status');
    out.className = 'defxn-tle__flx'; out.setAttribute('aria-label', 'The timeline as FLX records');
    form.appendChild(list); form.appendChild(tools); form.appendChild(problems); form.appendChild(out);
    host.appendChild(form);

    function field(label, control) {
      var l = document.createElement('label'), s = document.createElement('span');
      l.className = 'defxn-tle__field'; s.textContent = label; l.appendChild(s); l.appendChild(control);
      return l;
    }
    function select(options, value, on) {
      var sel = document.createElement('select');
      Object.keys(options).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = options[k]; if (String(k) === String(value)) o.selected = true; sel.appendChild(o); });
      sel.addEventListener('change', function () { on(sel.value); });
      return sel;
    }
    function number(value, min, max, step, on) {
      var n = document.createElement('input');
      n.type = 'number'; n.min = min; n.max = max; n.step = step; n.value = value; n.inputMode = 'numeric';
      n.addEventListener('change', function () { var v = Number(n.value); if (!isFinite(v)) return; on(Math.max(min, Math.min(max, v))); });
      return n;
    }
    function button(label, on, cls) { var b = document.createElement('button'); b.type = 'button'; b.className = cls || 'defxn-tle__btn'; b.textContent = label; b.addEventListener('click', on); return b; }

    function draw() {
      list.textContent = '';
      tl.tracks.forEach(function (t, i) {
        var li = document.createElement('li'), head = document.createElement('p');
        li.className = 'defxn-tle__track';
        head.className = 'defxn-tle__head'; head.textContent = 'Track ' + (i + 1);
        li.appendChild(head);
        li.appendChild(field('Piece', select(NAMES, t.target, function (v) { t.target = v; changed(); })));
        li.appendChild(field('Move', select(MOVES, t.prop, function (v) { t.prop = v; t.from = START[v]; changed(true); })));
        li.appendChild(field('From', t.prop === 'draw'
          ? select({ left: 'Left', top: 'Top', right: 'Right', bottom: 'Bottom' }, t.from, function (v) { t.from = v; changed(); })
          : t.prop === 'rise' ? number(t.from, 0, 48, 1, function (v) { t.from = v; changed(); })
          : t.prop === 'grow' ? number(t.from, 0.6, 1, 0.05, function (v) { t.from = v; changed(); })
          : number(t.from, -30, 30, 1, function (v) { t.from = v; changed(); })));
        li.appendChild(field('Easing', select(EASE, t.easing, function (v) { t.easing = v; changed(); })));
        li.appendChild(field('Delay, ms', number(t.delay || 0, 0, T.MAX_MS, 10, function (v) { t.delay = v; changed(); })));
        li.appendChild(field('Length, ms', number(t.ms, 60, T.MAX_MS, 10, function (v) { t.ms = v; changed(); })));
        li.appendChild(field('Between pieces, ms', number(t.stagger || 0, 0, 200, 5, function (v) { t.stagger = v; changed(); })));
        li.appendChild(field('At most', number(t.most || 12, 1, 24, 1, function (v) { t.most = v; changed(); })));
        li.appendChild(button('Remove track ' + (i + 1), function () { tl.tracks.splice(i, 1); changed(true); }, 'defxn-tle__remove'));
        list.appendChild(li);
      });
    }
    function changed(redraw, quiet) {
      if (redraw) draw();
      var ok = T.check(tl);
      problems.textContent = '';
      if (!ok.ok) {
        var p = document.createElement('p'); p.textContent = 'Not handed on: ' + ok.problems.join('. ') + '.'; problems.appendChild(p);
        problems.setAttribute('data-ok', 'false');
        return;
      }
      problems.setAttribute('data-ok', 'true');
      var text = tl.tracks.length ? T.encode(tl) : '';
      out.textContent = text || 'No tracks: the pieces arrive with no motion.';
      if (opts.onChange && !quiet) opts.onChange(JSON.parse(JSON.stringify(tl)), text);   // the first draw is not an edit
    }
    tools.appendChild(button('Add a track', function () {
      if (tl.tracks.length >= 12) { problems.textContent = 'A timeline holds at most 12 tracks.'; return; }
      tl.tracks.push({ target: 'icon', prop: 'rise', from: 12, easing: 'out', delay: 0, ms: 300, stagger: 30, most: 8 });
      changed(true);
    }));
    var play = button('Preview', function () {
      var el = opts.preview && opts.preview();
      if (!el || !T.check(tl).ok) return;
      play.disabled = true;
      T.play(el, tl).then(function (r) {
        play.disabled = false;
        problems.textContent = r.reduced ? 'Reduced motion is on, so nothing moves: the pieces show at rest, as they would on a site.' : 'Played ' + r.played + ' pieces in ' + r.ms + ' ms.';
      }, function (e) { play.disabled = false; problems.textContent = e.message; });
    }, 'defxn-tle__btn defxn-tle__btn--main');
    if (opts.preview) tools.appendChild(play);   // a host that previews through its own channel (the Skin lab) has no button here
    draw(); changed(false, true);
    function remove() { if (form.parentNode) form.parentNode.removeChild(form); }
    return {
      get: function () { return JSON.parse(JSON.stringify(tl)); },
      set: function (next) { tl = JSON.parse(JSON.stringify(next)); changed(true); },
      remove: remove, destroy: remove
    };
  }

  root.DefxnTimelineEditor = { mount: mount };
})(typeof window !== 'undefined' ? window : globalThis);

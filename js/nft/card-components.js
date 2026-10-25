/* DEFXN identity card: CARD COMPONENTS. New elements a site can place, made from the visitor's own card (the owner's
   goal: "the site takes the card's elements and becomes the site's, and can shape new elements").

   A site author places a SLOT, not a card: "a card banner here". Each visitor's kept card fills it, so the same page
   shows every wearer their own banner, and a visitor with no card sees nothing there. The kinds are a closed set
   (WEAR-AUDIT.md E11: a nameplate, a banner and a seal; the seal is wear.js's own):
     banner     the card's frame around a block: its name as the heading, "Card N · palette" above it, its strip below
     stamp      the card's icon, large, with its corner pieces, and its number under it
     nameplate  the card's own nameplate drawing at a readable size (12 px words or more), labelled for screen readers
   Words are real text in the site's faces, never only drawn. Drawings are decoration, hidden from assistive
   technology, laid out by Ark UI's own layoutArkChrome (which also cleans them). Each piece carries data-defxn-piece,
   so a timeline (js/nft/timeline.js) can move it.

   A slot is stored as FLX, its own grammar (CMS content, never JSON):
     DFXNCOMP1-K<hex kind>        one slot; followed by DFXNTL1 lines when the author gave it its own motion
   decode() re-encodes and refuses anything it could not have written.

   DefxnCardComponents.KINDS
   DefxnCardComponents.render(kind, wear, opts) -> the element (null with no wear)   wear: a DefxnWear wear
   DefxnCardComponents.fill(host, slotText)     renders the slot into host with the card that is on (tried or kept);
                                                redraws on 'defxn:wear'.
                                                -> { remove() }
   DefxnCardComponents.encode(slot) / decode(text)   slot: { kind, timeline }
   DefxnCardComponents.editor(host, { value, onChange, preview }) -> { destroy() }   the slot editor for the CMS Skin
                                                lab: FLX text in, FLX text out (needs js/nft/timeline-editor.js)
   Needs Ark UI's skin layer (sanitizing, layout), js/nft/skin-package.js, js/nft/timeline.js; fill() needs wear.js. */
(function (root) {
  'use strict';
  if (root.DefxnCardComponents) return;

  var KINDS = ['banner', 'stamp', 'nameplate'];
  var PLAIN = /^[^;{}<>\\]*$/;
  function hex(s) { return Array.prototype.map.call(new TextEncoder().encode(String(s)), function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join(''); }
  function unhex(h) { var a = new Uint8Array(h.length / 2); for (var i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return new TextDecoder().decode(a); }

  /* ---------- the slot grammar ---------- */
  function encode(slot) {
    if (KINDS.indexOf(slot.kind) < 0) throw new Error('A card slot is one of ' + KINDS.join(', ') + '. "' + slot.kind + '" is not.');
    var text = 'DFXNCOMP1-K' + hex(slot.kind) + '\n';
    if (slot.timeline && slot.timeline.tracks && slot.timeline.tracks.length) text += root.DefxnTimeline.encode(slot.timeline);
    return text;
  }
  function decode(text) {
    text = String(text);
    var lines = text.split('\n').filter(function (l) { return l; }), head = lines[0] || '', m = /^DFXNCOMP1-K((?:[0-9a-f]{2})+)$/.exec(head);
    if (!m) throw new Error('A card slot starts with DFXNCOMP1-K<hex kind>. This text does not, so this grammar did not write it.');
    var slot = { kind: unhex(m[1]), timeline: null };
    if (KINDS.indexOf(slot.kind) < 0) throw new Error('A card slot is one of ' + KINDS.join(', ') + '. This one names "' + slot.kind + '".');
    if (lines.length > 1) {
      if (!root.DefxnTimeline) throw new Error('This slot carries a timeline, and js/nft/timeline.js is not loaded. Load it first.');
      slot.timeline = root.DefxnTimeline.decode(lines.slice(1).join('\n') + '\n');
    }
    if (encode(slot) !== lines.join('\n') + '\n') throw new Error('This card slot does not encode back to the same text, so this grammar did not write it.');
    return slot;
  }

  /* ---------- drawing ---------- */
  function piece(name, chrome, w, h, align) {
    var K = root.ArkKitSkin, span = document.createElement('span');
    span.className = 'defxn-comp__piece defxn-comp__piece--' + name;
    span.setAttribute('data-defxn-piece', name); span.setAttribute('aria-hidden', 'true');
    var svg = chrome && K && K.layoutArkChrome ? K.layoutArkChrome(chrome, w, h, 'cc-' + name + '-' + Math.random().toString(36).slice(2, 7) + '-', align) : null;
    if (svg) span.innerHTML = svg;
    return svg ? span : null;
  }
  function inks(el, tokens) {
    Object.keys(tokens).forEach(function (k) { if (/^--[a-z0-9-]+$/.test(k) && PLAIN.test(tokens[k]) && !/url\(/i.test(tokens[k])) el.style.setProperty(k, tokens[k]); });
  }
  function render(kind, wear, opts) {
    opts = opts || {};
    if (!wear) return null;
    if (KINDS.indexOf(kind) < 0) throw new Error('A card component is one of ' + KINDS.join(', ') + '. "' + kind + '" is not.');
    var data = root.DefxnSkinPackage.decode(wear.package), c = data.chrome, el;
    var label = wear.title || 'Card ' + wear.number, who = (wear.name || label), line = label + (wear.palette ? ' · ' + wear.palette : '');
    if (kind === 'banner') {
      el = document.createElement('section');
      el.className = 'defxn-comp defxn-comp--banner';
      var eyebrow = document.createElement('p'); eyebrow.className = 'defxn-comp__eyebrow'; eyebrow.textContent = line;
      var title = document.createElement(opts.heading || 'h2'); title.className = 'defxn-comp__title'; title.textContent = who;
      el.appendChild(eyebrow); el.appendChild(title);
      var strip = piece('accent-strip', c['accent-strip'], 240, 40, 'xMinYMid');
      if (strip) el.appendChild(strip);
      var mark = piece('icon', c.icon, 44, 50);
      if (mark) { mark.classList.add('defxn-comp__corner-icon'); el.appendChild(mark); }
      // the frame needs the block's own size: drawn once it is in the page, and again only when that size changes
      var framed = function () {
        var r = el.getBoundingClientRect(), old = el.querySelector('[data-defxn-piece="frame"]');
        if (!r.width || !r.height) return;
        var f = piece('frame', c.frame, Math.round(r.width), Math.round(r.height));
        if (old) old.parentNode.removeChild(old);
        if (f) { f.classList.add('defxn-comp__frame'); el.insertBefore(f, el.firstChild); }
      };
      el.__defxnLayout = framed;
    } else if (kind === 'stamp') {
      el = document.createElement('figure');
      el.className = 'defxn-comp defxn-comp--stamp';
      var big = piece('icon', c.icon, 90, 102);
      if (big) el.appendChild(big);
      ['tl', 'tr', 'bl', 'br'].forEach(function (k) { var p = piece('corner', c.corner, 28, 28); if (p) { p.classList.add('defxn-comp__corner--' + k); el.appendChild(p); } });
      var cap = document.createElement('figcaption'); cap.className = 'defxn-comp__num'; cap.textContent = wear.title || 'Card ' + wear.number;
      el.appendChild(cap);
    } else {
      el = document.createElement('span');
      el.className = 'defxn-comp defxn-comp--nameplate';
      el.setAttribute('role', 'img'); el.setAttribute('aria-label', line + (wear.name ? ', ' + wear.name : ''));
      var plate = piece('nameplate', c.nameplate, 346, 48, 'xMinYMid');   // 48 px tall: the drawing's 12 to 13 unit words read at 12 px or more
      if (plate) el.appendChild(plate); else el.textContent = line;
    }
    inks(el, data.tokens);
    el.setAttribute('data-defxn-card', String(wear.object || wear.number));
    return el;
  }
  // after the element is in the page: a banner draws its frame at its size, and again when its size changes
  function settle(el) {
    if (!el || !el.__defxnLayout) return function () {};
    el.__defxnLayout();
    if (typeof ResizeObserver === 'undefined') return function () {};
    var w = 0, h = 0, ro = new ResizeObserver(function (list) {
      var r = list[0].contentRect;
      if (Math.abs(r.width - w) < 1 && Math.abs(r.height - h) < 1) return;
      w = r.width; h = r.height; el.__defxnLayout();
    });
    ro.observe(el);
    return function () { ro.disconnect(); };
  }

  /* ---------- a slot, filled by the kept card ---------- */
  function fill(host, slotText) {
    var slot = decode(slotText), W = root.DefxnWear, live = null, stop = function () {};
    function draw() {
      stop(); stop = function () {};
      if (live && live.parentNode) live.parentNode.removeChild(live);
      live = null;
      var wear = W && W.worn ? W.worn() : null;
      if (!wear) { host.hidden = true; return; }
      live = render(slot.kind, wear);
      host.hidden = false;
      host.appendChild(live);
      stop = settle(live);
      var tl = slot.timeline || (root.DefxnSkinPackage.decode(wear.package).arrival);
      if (tl && root.DefxnTimeline) root.DefxnTimeline.play(live, { version: 1, tracks: tl.tracks.filter(function (t) { return t.target !== 'art'; }) }).catch(function () {});
    }
    document.addEventListener('defxn:wear', draw);
    draw();
    return { remove: function () { document.removeEventListener('defxn:wear', draw); stop(); if (live && live.parentNode) live.parentNode.removeChild(live); } };
  }

  /* ---------- the slot editor, for the CMS Skin lab (mounted there by its owner) ----------
     FLX in, FLX out: value is a slot's text, onChange gets the new text after each change that passes the checks. */
  var LABELS = { banner: 'Banner', stamp: 'Stamp', nameplate: 'Nameplate' };
  function editor(host, opts) {
    opts = opts || {};
    if (!root.DefxnTimelineEditor) throw new Error('The slot editor needs js/nft/timeline-editor.js. Load it first.');
    var slot = opts.value ? decode(opts.value) : { kind: 'banner', timeline: null };
    var box = document.createElement('div'), label = document.createElement('label'), span = document.createElement('span'), sel = document.createElement('select'), tlHost = document.createElement('div');
    box.className = 'defxn-slot-editor'; label.className = 'defxn-tle__field'; span.textContent = 'What the card makes here';
    KINDS.forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = LABELS[k]; if (k === slot.kind) o.selected = true; sel.appendChild(o); });
    label.appendChild(span); label.appendChild(sel); box.appendChild(label); box.appendChild(tlHost); host.appendChild(box);
    function emit() { if (opts.onChange) opts.onChange(encode(slot)); }
    sel.addEventListener('change', function () { slot.kind = sel.value; emit(); });
    var tle = root.DefxnTimelineEditor.mount(tlHost, { timeline: slot.timeline || { version: 1, tracks: [] }, preview: opts.preview,
      onChange: function (tl) { slot.timeline = tl.tracks.length ? tl : null; emit(); } });
    return { destroy: function () { tle.destroy(); if (box.parentNode) box.parentNode.removeChild(box); } };
  }

  root.DefxnCardComponents = { KINDS: KINDS.slice(), render: render, settle: settle, fill: fill, encode: encode, decode: decode, editor: editor };
})(typeof window !== 'undefined' ? window : globalThis);

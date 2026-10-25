/* DEFXN identity card: the SKIN GATE. It puts one element at a time on every Ark UI part the site ships and
   measures what breaks there, so a broken element is found before the shop sells it or a card is born with it.

   Where it runs: primitives.html (every Ark UI part, from Ark UI's own examples, at real size) in a frame. Each
   element goes on through the site's own code, DefxnSkinSite.preview: the site's part table, its policy, its locks,
   its contrast rules and Ark UI's skin layer. The gate adds no rule of its own to the skin.

   What it measures. It does not ask Ark UI whether a piece covers content: Ark UI's own cover check already ran, and
   a census that reuses the reader's check shares its blind spot. The gate reads the drawn pieces itself. It draws
   each piece again into a canvas and samples its painted pixels (so a hollow frame is not read as its box) and counts:
     text      a painted point lies on a line of the page's text
     control   a painted point lies on a control (a link, a button, a field) that is not the piece's own part
     clip      a part's box cuts off 10% or more of the piece's painted points (the piece is drawn cut off)
     deco      two drawings paint the same place: one part's piece and another part's piece, or a piece's own
               drawings (a part too small for its four corners)
     contrast  a line of text reads below 4.5:1 (3:1 for large text) where the look it is compared with read it
   A break of the drawn pieces (text, control, clip, deco) counts only for the pieces of the element's own slot: the
   rest of the sample card's pieces are not this element's work. A contrast break is compared with the look the
   element changes: a palette with the site's own look, a drawing with the sample card it is put on.

   A drawing reaches the page only where the card's rules ask for its piece (an emblem only where a rule draws
   icons), so it goes on each review sample (27, 263, 512) in turn until one sample's rules draw it, and then with a
   partner element whose rules do (see check() below).

   What it does not measure (it says so, it does not score 0): a 3D element (backdrop, aura, mark, signal,
   particles) draws no Ark UI part; a drawing that no review sample's rules draw; text over a gradient or an image
   has no one background colour; a marker (Ark UI draws it in the text's flow, as a ::before); motion; a part that
   mounts only after a click (an open dialog, a popover); and the site's own page layouts (the home hero, the
   navbar's dropdown): the gate reads Ark UI's parts as Ark UI's examples draw them, not every page of the site.

   The results are PROPOSED holds (review-record.js, DFXNGATE1 lines). The owner holds or keeps each element on the
   review board (review.html). The gate holds nothing itself.

   DefxnSkinGate.open(host)              the parts page in a frame inside host -> { ready, run, show, close }
     ready                               Promise: the parts page has drawn and the site's skin code is loaded
     run(elements, { onStep, stopped })  Promise of { found: [{ id, part, break, count }], notMeasured: [{ id, why }] }
     show(element)                       put one element on and outline the parts where it broke; -> Promise of
                                         { sample, found: { 'part|break': count }, unknown: [kinds] } or { notMeasured }
     close()                             take the look off and remove the frame
   DefxnSkinGate.BREAKS                  the codes, each with the words the board shows */
(function (root) {
  'use strict';
  if (root.DefxnSkinGate) return;

  var BREAKS = {
    text: 'Covers text',
    control: 'Covers a control',
    clip: 'Drawn cut off',
    deco: 'Hits another drawing',
    contrast: 'Text hard to read'
  };
  /* Ark UI's decoration kinds and the chrome piece each one draws (ark-ui.skin.ts, makeDeco callers). Notches are
     Ark UI's own drawing for a frame rule, so they count as the frame's. A kind missing here is reported, not guessed. */
  var PIECE_OF = { frame: 'frame', notches: 'frame', corners: 'corner', nameplate: 'nameplate', 'accent-strip': 'accent-strip',
    'accent-strip-title': 'accent-strip', divider: 'divider', 'divider-rule': 'divider', 'icon-center': 'icon', 'icon-title': 'icon', button: 'button', badge: 'badge', menu: 'menu', line: 'line', link: 'link', grid: 'grid' };
  var SHAPES = 'rect,path,line,circle,ellipse,polygon,polyline,text,use,image';
  var CONTROLS = 'a[href],button,input,select,textarea,[role="button"],[role="tab"],[role="switch"],[role="checkbox"],[role="radio"],[role="menuitem"]';
  var MAX_POINTS = 500;   // painted-shape samples per drawn shape: a piece is never read as one box
  var MIN_HITS = 2;       // one sample on an edge is not a break
  var SAMPLE = '27';      // the plain born review sample: a palette is compared with the site on this card

  function open(host) {
    var frame = document.createElement('iframe');
    frame.title = 'Ark UI parts, for the skin gate';
    frame.src = 'primitives.html?size=real';
    frame.setAttribute('data-skin-gate', '');
    host.appendChild(frame);
    var win = null, doc = null, scene = null, undo = null;

    var ready = new Promise(function (resolve, reject) {
      frame.addEventListener('load', function () {
        win = frame.contentWindow; doc = frame.contentDocument; scene = doc.getElementById('scene');
        if (!win.DefxnSkinSite || !scene) { reject(new Error('The parts page did not load the site\'s skin code. Reload the board.')); return; }
        // a card this browser holds is put on by the parts page itself: the gate starts from the site's own look
        win.DefxnSkinSite.remove();
        var style = doc.createElement('style');
        style.textContent = '[data-gate-hit]{outline:2px solid hsl(8 80% 64%) !important;outline-offset:2px}';
        doc.head.appendChild(style);
        win.DefxnSkinSite.sample(SAMPLE).then(function () { return frames(3); }).then(resolve, reject);
      }, { once: true });
    });

    // n painted frames, or 40 ms each where the browser paints none (a tab in the background): layout is read in sync
    function frames(n) {
      return new Promise(function (r) {
        (function f(k) {
          if (!k) return r();
          var go = false, t = win.setTimeout(step, 40);
          function step() { if (go) return; go = true; win.clearTimeout(t); f(k - 1); }
          win.requestAnimationFrame(step);
        })(n);
      });
    }
    /* Ark UI puts a skin on in slices: its report counts the parts still pending (276 right after a preview, 0 about
       0.8 s later, measured on the parts page). A piece measured before then is measured half on, so the gate waits
       for none pending, and refuses to measure after 20 s. */
    var SETTLE_MS = 20000;
    function settle() {
      var t0 = Date.now();
      return new Promise(function (r, fail) {
        (function poll() {
          var rep = win.ArkKitSkin.getArkSkinReport(scene);
          if (!rep || !rep.pending) return r();
          if (Date.now() - t0 > SETTLE_MS) return fail(new Error('Ark UI still had ' + rep.pending + ' parts pending after ' + SETTLE_MS / 1000 + ' s, so nothing was measured'));
          win.setTimeout(poll, 25);
        })();
      }).then(function () { return frames(2); });
    }
    function off() { if (undo) { undo(); undo = null; } }
    function wear(record) {
      off();
      if (!record) return frames(2);
      return win.DefxnSkinSite.preview(record, scene).then(function (u) { undo = u; return settle(); });
    }
    // the sample card n wearing the element, and a partner element (from another slot) when one is given
    function recordFor(e, n, partner) {
      return win.DefxnSkinSite.sample(n || SAMPLE).then(function (rec) {
        var T = win.DEFXN_TRAITS, l = T && (T.CATEGORIES || T.LAYERS).filter(function (x) { return x.key === e.layer; })[0];
        if (!l || !l.elements.some(function (x) { return x.name === e.name; })) return null;   // the site's table has no such element
        return Object.assign({}, rec, { skin: (partner ? partner.layer + ':' + partner.name + '|' : '') + e.layer + ':' + e.name });
      });
    }

    /* ---------- where a break is: the part the page shows it in ---------- */
    function partOf(node) {
      var t = node.closest('.pg-tile');
      if (t) return t.getAttribute('data-block');
      return node.closest('header') ? 'header' : 'page';
    }

    /* ---------- the painted shape of a piece, sampled ---------- */
    /* What a piece paints, read from the pixels. Each svg of a piece is drawn once more into a small canvas, at its size on
       the page, with every colour made black, and its painted pixels become screen points. That is exactly what the browser
       draws: Ark UI's stretched cells (a <use> per slice, each clipped to its cell), thin non-scaling strokes, flipped and
       turned corners. (The first gate sampled the shapes' geometry instead, and missed the thin strokes in a stretched
       piece's corner cells and read whole pieces into every cell.) */
    var MAX_PIXELS = 6000;   // sampled pixels per svg: a 1-2 px grid on a button, coarser on a page-wide frame
    function blackened(svg, w, h) {
      var copy = svg.cloneNode(true);
      copy.setAttribute('width', w); copy.setAttribute('height', h);
      // (no xmlns attribute here: the serializer writes the namespace, and a second one makes the image fail to load)
      copy.removeAttribute('style'); copy.removeAttribute('class');
      var text = new win.XMLSerializer().serializeToString(copy);
      for (var i = 0; i < 4 && /var\(/.test(text); i++) text = text.replace(/var\([^()]*\)/g, '#000');
      return text.replace(/currentColor/g, '#000');
    }
    function rasterize(svg, view) {
      var r = svg.getBoundingClientRect(), cs = win.getComputedStyle(svg);
      if (r.width < 0.5 || r.height < 0.5 || cs.display === 'none' || cs.visibility === 'hidden') return Promise.resolve([]);
      // the svg's own box before its CSS transform (a corner is flipped or turned by its transform)
      var w = svg.offsetWidth || parseFloat(cs.width) || r.width, h = svg.offsetHeight || parseFloat(cs.height) || r.height;
      if (!(w > 0) || !(h > 0)) { w = r.width; h = r.height; }
      var m = cs.transform && cs.transform !== 'none' ? new win.DOMMatrix(cs.transform) : null;
      var cw = Math.max(1, Math.ceil(w)), ch = Math.max(1, Math.ceil(h));
      return new Promise(function (resolve) {
        var img = new win.Image(), url = win.URL.createObjectURL(new win.Blob([blackened(svg, cw, ch)], { type: 'image/svg+xml' }));
        img.onload = function () {
          var cv = doc.createElement('canvas'); cv.width = cw; cv.height = ch;
          var c2 = cv.getContext('2d', { willReadFrequently: true }); c2.drawImage(img, 0, 0, cw, ch);
          var data = c2.getImageData(0, 0, cw, ch).data, step = Math.max(1, Math.round(Math.sqrt(cw * ch / MAX_PIXELS))), pts = [];
          var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          for (var y = 0; y < ch; y += step) for (var x = 0; x < cw; x += step) {
            if (data[(y * cw + x) * 4 + 3] < 32) continue;
            var lx = x + 0.5 - w / 2, ly = y + 0.5 - h / 2, px = m ? m.a * lx + m.c * ly : lx, py = m ? m.b * lx + m.d * ly : ly;
            var p = [cx + px, cy + py];
            if (inside(p, view)) pts.push(p);
          }
          win.URL.revokeObjectURL(url); resolve(pts);
        };
        img.onerror = function () { win.URL.revokeObjectURL(url); resolve([]); };
        img.src = url;
      });
    }
    // where a piece can paint at all: its own box and its svg's, when they hide what overflows
    function viewOf(deco) {
      var box = { left: -Infinity, top: -Infinity, right: Infinity, bottom: Infinity };
      // the piece and its own top-level drawings only: the stretcher's cells are nested svgs, each clipping its own slice
      [deco].concat(Array.prototype.slice.call(deco.children).filter(function (c) { return c.localName === 'svg'; })).forEach(function (n) {
        var cs = win.getComputedStyle(n);
        if (!/hidden|clip/.test(cs.overflowX + cs.overflowY)) return;
        var r = n.getBoundingClientRect();
        box = { left: Math.max(box.left, r.left), top: Math.max(box.top, r.top), right: Math.min(box.right, r.right), bottom: Math.min(box.bottom, r.bottom) };
      });
      return box;
    }
    // each point carries the index of the piece's own svg it was painted by (corners: one svg per corner)
    // every svg of a piece, each point tagged with the index of the svg that painted it (corners: one svg per corner)
    function painted(deco) {
      var view = viewOf(deco), svgs = Array.prototype.slice.call(deco.children).filter(function (c) { return c.localName === 'svg'; });
      return Promise.all(svgs.map(function (svg, i) {
        return rasterize(svg, view).then(function (pts) { return pts.map(function (p) { return [p[0], p[1], svgs.length > 1 ? i : -1]; }); });
      })).then(function (lists) { return [].concat.apply([], lists); });
    }
    // every piece on the page, read once per look
    function paintedAll() {
      var decos = Array.prototype.slice.call(scene.querySelectorAll('[data-ark-skin-deco]'));
      return Promise.all(decos.map(painted)).then(function (lists) { var map = new Map(); decos.forEach(function (d, i) { map.set(d, lists[i]); }); return map; });
    }
    function inside(p, r) { return p[0] >= r.left && p[0] <= r.right && p[1] >= r.top && p[1] <= r.bottom; }
    function hits(pts, rects) { var n = 0; pts.forEach(function (p) { if (rects.some(function (r) { return inside(p, r); })) n++; }); return n; }
    function shrink(r, d) { return { left: r.left + d, right: r.right - d, top: r.top + d, bottom: r.bottom - d }; }
    function overlaps(a, b) { return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom; }
    function near(box, rects) { return rects.filter(function (r) { return overlaps(box, r); }); }
    // a piece's painted points by 2px cell, so two pieces compare cell by cell and not point by point
    function cells(pts) { var c = new Set(); pts.forEach(function (p) { c.add(Math.floor(p[0] / 2) + ',' + Math.floor(p[1] / 2)); }); return c; }
    function shared(pts, c) {
      var n = 0;
      pts.forEach(function (p) {
        var x = Math.floor(p[0] / 2), y = Math.floor(p[1] / 2);
        for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) if (c.has((x + dx) + ',' + (y + dy))) { n++; return; }
      });
      return n;
    }

    /* ---------- the page's text: each line box of each text node, outside the pieces ---------- */
    function textLines() {
      var out = [], walk = doc.createTreeWalker(scene, win.NodeFilter.SHOW_TEXT), n;
      while ((n = walk.nextNode())) {
        if (!n.nodeValue.trim() || !n.parentElement || n.parentElement.closest('[data-ark-skin-deco],script,style,[hidden]')) continue;
        var range = doc.createRange(); range.selectNodeContents(n);
        Array.prototype.forEach.call(range.getClientRects(), function (r) { if (r.width > 1 && r.height > 1) out.push({ el: n.parentElement, rect: shrink(r, 1) }); });
      }
      return out;
    }
    // the boxes that cut a piece off: its part and the part's ancestors up to the tile, where overflow is hidden or clip
    function clipBox(host) {
      var box = { left: -Infinity, top: -Infinity, right: Infinity, bottom: Infinity }, n = host;
      while (n && n !== scene && !(n.classList && n.classList.contains('pg-tile-body'))) {
        var cs = win.getComputedStyle(n);
        if (/hidden|clip/.test(cs.overflowX + cs.overflowY)) {
          var r = n.getBoundingClientRect();
          box = { left: Math.max(box.left, r.left), top: Math.max(box.top, r.top), right: Math.min(box.right, r.right), bottom: Math.min(box.bottom, r.bottom) };
        }
        n = n.parentElement;
      }
      return box;
    }

    /* ---------- contrast: each text line against the colour under it ---------- */
    var cx = null, rgbaCache = {};
    function rgba(str) {
      if (rgbaCache[str]) return rgbaCache[str];
      if (!cx) { var cv = doc.createElement('canvas'); cv.width = cv.height = 1; cx = cv.getContext('2d', { willReadFrequently: true }); }
      cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = str; cx.fillRect(0, 0, 1, 1);
      var d = cx.getImageData(0, 0, 1, 1).data;
      return (rgbaCache[str] = [d[0], d[1], d[2], d[3] / 255]);
    }
    function over(top, under) {
      var a = top[3] + under[3] * (1 - top[3]);
      if (!a) return [0, 0, 0, 0];
      return [0, 1, 2].map(function (i) { return (top[i] * top[3] + under[i] * under[3] * (1 - top[3])) / a; }).concat([a]);
    }
    function lum(c) { var f = function (v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); }
    // the colour behind an element: its own and its ancestors' background colours, laid over each other; null when a
    // gradient or an image is in the way (then there is no one colour to read against)
    function behind(el) {
      var stack = [], n = el;
      while (n && n.nodeType === 1) {
        var cs = win.getComputedStyle(n);
        if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
        var c = rgba(cs.backgroundColor);
        if (c[3] > 0) { stack.push(c); if (c[3] >= 0.999) break; }
        n = n.parentElement;
      }
      var col = [0, 0, 0, 1];   // nothing opaque under it: the frame's own page is the canvas, black at worst
      for (var i = stack.length - 1; i >= 0; i--) col = over(stack[i], col);
      return col;
    }
    function contrastOf(el) {
      var bg = behind(el);
      if (!bg) return null;
      var cs = win.getComputedStyle(el), fg = over(rgba(cs.color), bg), a = lum(fg), b = lum(bg);
      var size = parseFloat(cs.fontSize) || 16, bold = (parseInt(cs.fontWeight, 10) || 400) >= 700;
      return { ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), min: size >= 24 || (bold && size >= 18.66) ? 3 : 4.5 };
    }
    // every text-bearing element, in page order: the same list in every look, so looks compare line by line
    function readings() {
      var seen = new Set(), out = [];
      textLines().forEach(function (t) {
        if (seen.has(t.el)) return; seen.add(t.el);
        out.push({ el: t.el, c: contrastOf(t.el) });
      });
      return out;
    }

    /* ---------- one element on the page, measured ---------- */
    // pieces: the chrome pieces whose drawings count for the element; base: the readings its contrast is compared with
    function measure(pieces, base, points) {
      var found = {}, decos = Array.prototype.slice.call(scene.querySelectorAll('[data-ark-skin-deco]')), unknown = {};
      function add(part, br) { var k = part + '|' + br; found[k] = (found[k] || 0) + 1; }
      var lines = textLines(), controls = Array.prototype.slice.call(scene.querySelectorAll(CONTROLS)).filter(function (c) { return !c.closest('[data-ark-skin-deco]') && paints(c); });
      var mine = [], all = decos.map(function (d) {
        var kind = d.getAttribute('data-ark-skin-deco'), piece = PIECE_OF[kind];
        if (!piece) unknown[kind] = true;
        var host = d.parentElement, pts = points.get(d) || [], rec = { deco: d, host: host, pts: pts, piece: piece, box: d.getBoundingClientRect() };
        if (pieces.indexOf(piece) >= 0) mine.push(rec);
        return rec;
      });
      mine.forEach(function (m) {
        if (!m.pts.length) return;
        var part = partOf(m.host), broke = false;
        // a pattern (a worn grid) is drawn behind the content on purpose: only a cut-off counts against it
        if (m.deco.getAttribute('data-ark-skin-place') === 'pattern') {
          var cbp = clipBox(m.host), outp = m.pts.filter(function (p) { return !inside(p, cbp); }).length;
          if (outp >= Math.max(3, m.pts.length * 0.1)) { add(part, 'clip'); m.host.setAttribute('data-gate-hit', ''); }
          return;
        }
        // text: a line of text that is not inside the piece itself
        if (hits(m.pts, near(m.box, lines.map(function (l) { return l.rect; }))) >= MIN_HITS) { add(part, 'text'); broke = true; }
        // control: one that is not the piece's own part or a part around it
        var foreign = controls.filter(function (c) { return c !== m.host && !c.contains(m.host); }).map(function (c) { return shrink(c.getBoundingClientRect(), 1); });
        if (hits(m.pts, near(m.box, foreign)) >= MIN_HITS) { add(part, 'control'); broke = true; }
        // clip: the part's box cuts the drawing off
        var cb = clipBox(m.host), out = m.pts.filter(function (p) { return !inside(p, cb); }).length;
        if (out >= Math.max(3, m.pts.length * 0.1)) { add(part, 'clip'); broke = true; }
        // deco: the piece's own drawings paint the same place (a part too small for its four corners)
        var own = {};
        m.pts.forEach(function (p) { if (p[2] >= 0) (own[p[2]] = own[p[2]] || []).push(p); });
        var keys = Object.keys(own);
        for (var a = 0; a < keys.length; a++) for (var b = a + 1; b < keys.length; b++) {
          if (shared(own[keys[a]], cells(own[keys[b]])) >= MIN_HITS) { add(part, 'deco'); broke = true; a = keys.length; break; }
        }
        // deco: another part's piece paints the same place
        all.forEach(function (o) {
          if (o === m || o.host === m.host || !overlaps(m.box, o.box)) return;
          if (!o.cells) o.cells = cells(o.pts);
          if (shared(m.pts, o.cells) >= MIN_HITS) { add(part, 'deco'); broke = true; }
        });
        if (broke) m.host.setAttribute('data-gate-hit', '');
      });
      // contrast: lines the compared look read, that this one does not
      if (base) {
        readings().forEach(function (r, i) {
          var was = base[i];
          if (!r.c || !was || !was.c || was.el !== r.el) return;
          if (r.c.ratio < r.c.min && was.c.ratio >= was.c.min) { add(partOf(r.el), 'contrast'); r.el.setAttribute('data-gate-hit', ''); }
        });
      }
      return { found: found, unknown: Object.keys(unknown) };
    }
    /* A control that paints nothing is a hit area, not something a piece can cover: Ark UI's choice stretches an input
       at opacity 0 over each option card, and the first corners run counted 36 of 77 corners "covering" it. */
    function paints(c) {
      for (var n = c; n && n !== scene; n = n.parentElement) {
        var cs = win.getComputedStyle(n);
        if (Number(cs.opacity) === 0 || cs.visibility === 'hidden') return false;
      }
      return true;
    }
    function clearHits() { Array.prototype.forEach.call(doc.querySelectorAll('[data-gate-hit]'), function (n) { n.removeAttribute('data-gate-hit'); }); }

    /* ---------- the run ---------- */
    /* What an element is answerable for. A drawing is answerable for its own piece. A frame is also answerable for what
       its RULE draws: Ark UI turns a full frame that has its own border, or that would cover content, into corners, so
       most frames reach the page as the corner piece (the first full run found 5 of 123 frames drawing a frame piece at
       all, and spent two minutes on each of the rest looking for one). Those corners are drawn with the sample card's
       corner drawing, so their breaks count for the frame only where they differ from the sample card without it. */
    var RULED = { frame: ['corner'] };
    function ownPieces(e) { return e.kind === 'chrome' ? [win.DEFXN_TRAITS.uiName(e.layer)] : []; }
    function ruledPieces(e) { return e.kind === 'chrome' ? RULED[e.layer] || [] : []; }
    var baselines = {};
    // the look an element is compared with: the site's own (for a palette), or the sample card (and partner) without it:
    // its text readings, and the breaks of each slot's ruled pieces there
    function baseline(n, partner) {
      var key = n + '|' + (partner ? partner.layer + '/' + partner.name : '');
      if (baselines[key]) return Promise.resolve(baselines[key]);
      var rec = n === 'site' ? Promise.resolve(null) : win.DefxnSkinSite.sample(n).then(function (r) {
        return partner ? Object.assign({}, r, { skin: partner.layer + ':' + partner.name }) : r;
      });
      return rec.then(wear).then(function () {
        var b = { readings: readings(), ruled: {} };
        return paintedAll().then(function (points) {
          Object.keys(RULED).forEach(function (slot) { b.ruled[slot] = measure(RULED[slot], null, points).found; });
          clearHits();
          return (baselines[key] = b);
        });
      });
    }
    // breaks the element's rule added: what the sample card without it did not have
    function beyond(found, base) {
      var out = {};
      Object.keys(found).forEach(function (k) { var n = found[k] - (base[k] || 0); if (n > 0) out[k] = n; });
      return out;
    }
    // the reason Ark UI gave for taking back the rule of this name, on any part, or ''
    function backWhy(rule) {
      var rep = win.ArkKitSkin.getArkSkinReport(scene), why = '';
      ((rep && rep.parts) || []).forEach(function (p) { ((p.rules && p.rules.reverted) || []).forEach(function (r) { if (!why && r.rule === rule) why = r.why; }); });
      return why;
    }
    function drawsAny(pieces) {
      return Array.prototype.some.call(scene.querySelectorAll('[data-ark-skin-deco]'), function (d) { return pieces.indexOf(PIECE_OF[d.getAttribute('data-ark-skin-deco')]) >= 0; });
    }
    /* A drawing reaches the page only where the card's rules ask for its piece (an emblem only where a rule draws
       icons). So a drawing goes on each review sample in turn. Where no sample's rules draw its piece, the gate looks
       for a PARTNER: an element of another slot whose rules do, tried in the table's order on sample 27 with the
       drawing, at most PARTNER_TRIES of them. The partner found is kept for the whole slot and named in the result.
       Where none is found, the drawing is not measured, and the gate says so. */
    /* Only a piece that ANOTHER slot's rule orders can need a partner: the corner (the frame rule draws it) and the icon
       (an ornament rule would). A frame, tag, strip or divider is ordered by its own element's rule, so where no sample
       draws it, that element draws nothing on any part, and a partner cannot change that (the first full run spent
       minutes per tag looking). */
    var PARTNER_TRIES = 60, partners = {}, ORDERED_ELSEWHERE = ['corner', 'icon'];
    function partnerFor(e, piece) {
      if (partners[piece] !== undefined) return Promise.resolve(partners[piece]);
      // one element of each other slot in turn, so every slot's rules are tried early
      var T = win.DEFXN_TRAITS, slots = T.LAYERS.filter(function (l) { return l.key !== e.layer && l.elements.some(function (x) { return x.kind === 'chrome'; }); }), list = [];
      for (var i = 0; list.length < PARTNER_TRIES && slots.some(function (l) { return i < l.elements.length; }); i++) slots.forEach(function (l) { if (l.elements[i] && list.length < PARTNER_TRIES) list.push(l.elements[i]); });
      function tryAt(k) {
        if (k >= list.length) return (partners[piece] = null);
        return recordFor(e, SAMPLE, list[k]).then(wear).then(function () { return drawsAny([piece]) ? (partners[piece] = list[k]) : tryAt(k + 1); });
      }
      return tryAt(0);
    }
    /* One element, measured. -> { sample, partner, found, unknown } or { notMeasured } */
    function check(e) {
      var id = e.layer + '/' + e.name;
      if (e.kind !== 'chrome' && e.kind !== 'palette') return Promise.resolve({ notMeasured: 'A 3D element draws no Ark UI part.' });
      var takenBack = '', own = ownPieces(e), ruled = ruledPieces(e), piece = own[0], samples = e.kind === 'palette' ? [SAMPLE] : win.DefxnSkinSite.SAMPLES.slice();
      function on(n, partner, next) {
        return baseline(e.kind === 'palette' ? 'site' : n, e.kind === 'palette' ? null : partner).then(function (base) {
          return recordFor(e, n, partner).then(function (rec) {
            if (!rec) return { notMeasured: 'The site\'s element table (js/nft/skin-bundle.js) has no ' + id + '.' };
            clearHits();
            return wear(rec).then(function () {
              if (piece && !drawsAny(own.concat(ruled))) { takenBack = takenBack || backWhy(e.layer); return next(); }
              return paintedAll().then(function (points) {
                var m = measure(own, base.readings, points), found = m.found;
                if (ruled.length) {
                  var r = beyond(measure(ruled, null, points).found, base.ruled[e.layer] || {});
                  Object.keys(r).forEach(function (k) { found[k] = (found[k] || 0) + r[k]; });
                }
                return { sample: n, partner: partner ? partner.layer + '/' + partner.name : null, found: found, unknown: m.unknown };
              });
            });
          });
        });
      }
      function attempt(k) {
        if (k < samples.length) return on(samples[k], null, function () { return attempt(k + 1); });
        // Ark UI took it back everywhere it went: that is the element's own break, not an absence
        if (takenBack) return { notMeasured: 'Ark UI takes it back on every part it could go on: ' + takenBack + '. It never shows.' };
        if (ORDERED_ELSEWHERE.indexOf(piece) < 0) return { notMeasured: 'Its own rules draw no ' + piece + ' piece on any review sample (' + samples.join(', ') + '), so it draws nothing on a part there.' };
        return partnerFor(e, piece).then(function (p) {
          var none = { notMeasured: 'Neither the review samples (' + samples.join(', ') + ') nor ' + PARTNER_TRIES + ' partner elements draw the ' + piece + ' piece, so the gate saw nothing of it.' };
          return p ? on(SAMPLE, p, function () { return none; }) : none;
        });
      }
      return ready.then(function () { return attempt(0); });
    }
    function run(elements, opts) {
      opts = opts || {};
      var result = { found: [], notMeasured: [] }, unknown = {}, i = 0;
      function next() {
        if (opts.stopped && opts.stopped()) return Promise.resolve();
        var e = elements[i++];
        if (!e) return Promise.resolve();
        var id = e.layer + '/' + e.name;
        if (opts.onStep) opts.onStep(i, elements.length, e);
        return check(e).then(function (m) {
          if (m.notMeasured) { result.notMeasured.push({ id: id, why: m.notMeasured }); return; }
          m.unknown.forEach(function (k) { unknown[k] = true; });
          Object.keys(m.found).forEach(function (k) { var p = k.split('|'); result.found.push({ id: id, part: p[0], 'break': p[1], count: m.found[k] }); });
        }).catch(function (err) { result.notMeasured.push({ id: id, why: 'It did not go on: ' + err.message }); })
          .then(next);
      }
      return ready.then(next).then(function () {
        off(); clearHits();
        result.unknownKinds = Object.keys(unknown);
        return result;
      });
    }
    // one element on the parts, with the parts it broke outlined, for the owner to see; it stays on until the next
    function show(e) { return check(e); }
    function close() { try { off(); } catch (err) { /* the frame is going */ } frame.remove(); }
    // the painted points the gate reads for one drawn piece, to check the gate itself against what is on screen
    function pointsOf(deco) { return painted(deco); }
    // the element's drawn breaks on the page as it is now, without wearing it again (a check of the gate itself)
    function measureNow(e) { return paintedAll().then(function (points) { return measure(ownPieces(e), null, points); }); }
    return { ready: ready, run: run, show: show, close: close, frame: frame, pointsOf: pointsOf, measureNow: measureNow };
  }

  root.DefxnSkinGate = { open: open, BREAKS: BREAKS };
})(window);

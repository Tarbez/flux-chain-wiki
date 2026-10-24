/* DEFXN identity card: any ONE element drawn by itself, isolated, so it can be seen before it is
   picked (the shop, shop.html, and the card's skin drawer, card.html).

   DefxnThumbs.thumb(element, opts) returns a small tile that draws itself when it scrolls into view:
     a 3D element    built alone (art3d.js) and drawn as an object on black. An element that grows
                     from the mark (it builds nothing alone) is drawn with the mark, dimmed.
     a palette       the reference mark built in that palette, with its three colours as dots
     a chrome piece  its drawing alone (card.js chromeSvg): a corner at the four corners of the tile,
                     a frame around it, a tag, ornament or divider across it, an emblem in its middle
   DefxnThumbs.stage(box, element, opts) draws the same element large. A 3D element turns under the
   pointer (drag; a double-click puts it back) and stops when the pointer does. Nothing loops.

   opts.palette: the palette element the piece is shown in (default: the Glass palette, so accents
   show). opts.record: the record whose fields a tag or ornament shows (default: a Preview record).
   Each tile is drawn once and kept, per element, palette and size. Needs traits.js, art3d.js,
   builders-bundle.js and card.js. */
(function () {
  'use strict';

  var T = window.DEFXN_TRAITS, A = window.Art3D, C = window.DefxnCard;
  var SHOWCASE = { genesisId: '000', identity: '0x5A3C...E07D', name: 'preview.fxn', status: 'Preview', role: 'Member',
    network: 'DEFXN', joined: '24 OCT 2026', serial: '000', tagline: ['A chain of chains.', 'For a more open internet.'] };
  var KEY = T.keyOf({ identity: 'shop-showcase', genesisId: '0' });
  var REF = (window.DEFXN_CARDS || [])[0] || {};
  var REST = A.REST, ZOOM = { mark: 1.18, palette: 1.18, aura: 0.92, backdrop: 0.9, signal: 0.95, particles: 0.95 };

  function layerOf(e) { for (var i = 0; i < T.LAYERS.length; i++) if (T.LAYERS[i].key === e.layer) return T.LAYERS[i]; return null; }
  function byName(layerKey, name) {
    var l = T.LAYERS.filter(function (x) { return x.key === layerKey; })[0];
    return l ? l.elements.filter(function (e) { return e.name === name; })[0] || l.elements[0] : null;
  }
  function defaultPalette() { return byName('palette', 'Glass'); }
  function refMark() { return byName('mark', (REF.traits && REF.traits.mark) || 'Glitch'); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  /* ---------- 3D: build alone, paint as an object ---------- */
  // the last few models stay ready for the large view; a small tile builds, draws once and frees its own
  var models = {}, order = [];
  function modelFor(element, pal, keep) {
    var k = element.layer + '/' + element.name + '|' + pal.name;
    if (models[k]) return models[k];
    var p = A.loadMark().then(function (mark) {
      var picks = { palette: pal }, withMark = false;
      if (element.layer === 'palette') { picks.palette = element; picks.mark = refMark(); withMark = true; }
      else picks[element.layer] = element;
      return A.build(mark, KEY, picks).then(function (m) {
        var empty = !(m.cubes.length || m.glasses.length || m.points.length || m.lines.length || m.quads.length || m.bars.length || m.spheres.length);
        if (!empty || element.layer === 'mark' || withMark) return { model: m, ghost: false };
        picks.mark = refMark();                         // it grows from the mark: show it with the mark
        return A.build(mark, KEY, picks).then(function (m2) { A.dispose(m); return { model: m2, ghost: true }; });
      });
    });
    if (!keep) return p;
    models[k] = p; order.push(k);
    while (order.length > 6) { var old = order.shift(); models[old].then(function (r) { A.dispose(r.model); }); delete models[old]; }
    return p;
  }
  function paintObject(target, model, w, h, tilt, zoom, moving) {
    var t = { art: target.art || el('canvas'), glow: target.glow || el('canvas') };
    A.paint(t, model, w, h, tilt, { object: true, aspect: w / h, zoom: zoom, moving: !!moving });
    return t;
  }
  function composite(cv, t, w, h) {
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    var x = cv.getContext('2d');
    x.clearRect(0, 0, w, h); x.drawImage(t.art, 0, 0);
    x.globalCompositeOperation = 'screen'; x.globalAlpha = 0.85; x.drawImage(t.glow, 0, 0);
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
  }

  /* ---------- chrome: the drawing alone ---------- */
  function chromeOf(element, pal, record) {
    var rec = Object.assign({}, record || SHOWCASE), traits = T.pick(Object.assign({}, rec, { traits: Object.assign({}, REF.traits || {}, { palette: pal.name }) }));
    var svg = C.chromeSvg(element, rec, traits);
    if (svg) svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    return svg;
  }
  function drawChrome(box, element, pal, record) {
    var slot = element.attrs.slot;
    box.classList.add('is-' + slot);
    if (slot === 'corner') {
      ['tl', 'tr', 'bl', 'br'].forEach(function (k) {
        var s = chromeOf(element, pal, record);
        if (s) { s.setAttribute('class', 'th-corner ' + k); box.appendChild(s); }
      });
      return;
    }
    var svg = chromeOf(element, pal, record);
    if (!svg) return;
    svg.setAttribute('class', 'th-svg'); box.appendChild(svg);
    // a tag, ornament or divider often draws only part of its box: show the part it draws
    if (slot === 'tag' || slot === 'ornament' || slot === 'divider') {
      try {
        var bb = svg.getBBox(), vb = svg.viewBox.baseVal, pad = Math.max(4, bb.height * 0.18);
        if (bb.width > 0 && bb.height > 0) {
          var x0 = Math.max(vb.x, bb.x - pad), y0 = Math.max(vb.y, bb.y - pad), x1 = Math.min(vb.x + vb.width, bb.x + bb.width + pad), y1 = Math.min(vb.y + vb.height, bb.y + bb.height + pad);
          svg.setAttribute('viewBox', [x0, y0, x1 - x0, y1 - y0].map(function (n) { return +n.toFixed(2); }).join(' '));
        }
      } catch (e) { /* not rendered yet: keep the whole box */ }
    }
  }
  function swatches(box, pal) {
    var row = el('span', 'th-swatches');
    ['a', 'b', 'c'].forEach(function (k) { var d = el('i'); d.style.background = 'hsl(' + String(pal.attrs[k]).split(/\s+/).join(', ') + ')'; row.appendChild(d); });
    box.appendChild(row);
  }

  /* ---------- tiles, drawn when they come into view ---------- */
  var drawn = {}, io = null;
  function observe(node) {
    if (!('IntersectionObserver' in window)) { node._thDraw(); return; }
    if (!io) io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { io.unobserve(en.target); en.target._thDraw(); } });
    }, { rootMargin: '300px 0px' });
    io.observe(node);
  }
  function thumb(element, opts) {
    opts = opts || {};
    var pal = opts.palette || defaultPalette(), box = el('div', 'th th-' + (element.kind === 'chrome' ? 'chrome' : element.kind === 'palette' ? 'palette' : '3d'));
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', element.name + ', ' + (layerOf(element) || {}).name + ' element');
    box._thDraw = function () {
      if (element.kind === 'chrome') { drawChrome(box, element, pal, opts.record); return; }
      var cv = el('canvas');
      box.appendChild(cv);
      if (element.kind === 'palette') swatches(box, element);
      var k = element.layer + '/' + element.name + '|' + pal.name;
      function put(src) { cv.width = src.width; cv.height = src.height; cv.getContext('2d').drawImage(src, 0, 0); box.classList.add('is-drawn'); }
      if (drawn[k]) { put(drawn[k]); return; }
      modelFor(element, pal).then(function (r) {
        A.schedule(function () {
          var w = 300, h = 210, src = el('canvas'), t = paintObject({}, r.model, w, h, REST, ZOOM[element.layer] || 1);
          composite(src, t, w, h);
          drawn[k] = src; put(src);
          if (!models[k]) A.dispose(r.model);         // not kept for a large view: free it now
          if (r.ghost) box.classList.add('is-ghost');
        });
      }).catch(function (err) { console.error('The element ' + element.name + ' could not be drawn alone: ' + err.message); });
    };
    observe(box);
    return box;
  }

  /* ---------- the large view ---------- */
  function stage(box, element, opts) {
    opts = opts || {};
    var pal = opts.palette || defaultPalette();
    box.textContent = '';
    box.className = 'th-stage th-' + (element.kind === 'chrome' ? 'chrome' : element.kind === 'palette' ? 'palette' : '3d');
    if (element.kind === 'chrome') { drawChrome(box, element, pal, opts.record); return function () {}; }
    var cv = el('canvas'), hint = el('span', 'th-hint', 'Drag to turn. Double-click to reset.');
    box.appendChild(cv); box.appendChild(hint);
    if (element.kind === 'palette') swatches(box, element);
    var model = null, rot = { x: REST.x, y: REST.y }, raf = 0, drag = null, settle = 0, t = {}, alive = true;
    var zoom = (ZOOM[element.layer] || 1) * 1.05;
    function draw(moving) {
      if (!model || !alive || !box.clientWidth) return;
      var dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.round(box.clientWidth * dpr), h = Math.round(box.clientHeight * dpr);
      t = paintObject(t, model, w, h, rot, zoom, moving);
      composite(cv, t, w, h);
      clearTimeout(settle);
      if (moving) settle = setTimeout(function () { draw(false); }, 140);
    }
    modelFor(element, pal, true).then(function (r) { model = r.model; if (r.ghost) box.classList.add('is-ghost'); A.schedule(function () { draw(false); }); });
    var ro = window.ResizeObserver ? new ResizeObserver(function () { draw(false); }) : null;
    if (ro) ro.observe(box);
    box.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY }; box.setPointerCapture(e.pointerId); box.classList.add('is-turning'); });
    box.addEventListener('pointermove', function (e) {
      if (!drag) return;
      rot = { x: rot.x + (e.clientY - drag.y) * 0.008, y: rot.y + (e.clientX - drag.x) * 0.008 };
      drag = { x: e.clientX, y: e.clientY };
      if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(true); });
    });
    function up() { drag = null; box.classList.remove('is-turning'); }
    box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
    box.addEventListener('dblclick', function () { rot = { x: REST.x, y: REST.y }; draw(false); });
    return function () { alive = false; if (ro) ro.disconnect(); clearTimeout(settle); };
  }

  // the tiles' look, written once
  var css = [
    '.th{position:relative;overflow:hidden;background:#050606;border-radius:6px;aspect-ratio:10/7}',
    '.th canvas,.th-stage canvas{position:absolute;inset:0;width:100%;height:100%;display:block}',
    '.th.th-3d canvas,.th.th-palette canvas{opacity:0;transition:opacity .35s ease-out}',
    '.th.is-drawn canvas{opacity:1}',
    '.th.is-ghost::after,.th-stage.is-ghost::after{content:"with the mark";position:absolute;right:6px;bottom:5px;font:400 9px/1 "JetBrains Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.4)}',
    '.th-chrome{display:grid;place-items:center}',
    '.th-svg{display:block;max-width:100%;max-height:100%}',
    '.th.is-frame .th-svg,.th-stage.is-frame .th-svg{width:100%;height:100%}',
    '.th.is-tag .th-svg,.th.is-ornament .th-svg,.th.is-divider .th-svg{width:90%;height:auto}',
    '.th.is-emblem .th-svg{height:58%;width:auto}',
    '.th-corner{position:absolute;width:42%;height:auto;aspect-ratio:1}',
    '.th-corner.tl{left:6%;top:8%}.th-corner.tr{right:6%;top:8%;transform:scaleX(-1)}',
    '.th-corner.bl{left:6%;bottom:8%;transform:scaleY(-1)}.th-corner.br{right:6%;bottom:8%;transform:scale(-1,-1)}',
    '.th-swatches{position:absolute;left:8px;bottom:8px;display:flex;gap:4px}',
    '.th-swatches i{width:10px;height:10px;border-radius:50%;box-shadow:0 0 0 1px rgba(0,0,0,.5)}',
    '.th-stage{position:relative;overflow:hidden;background:#050606;border-radius:8px;touch-action:none}',
    '.th-stage.th-3d,.th-stage.th-palette{cursor:grab}',
    '.th-stage.is-turning{cursor:grabbing}',
    '.th-stage.th-chrome{display:grid;place-items:center;padding:6%}',
    '.th-stage.is-tag .th-svg,.th-stage.is-ornament .th-svg,.th-stage.is-divider .th-svg{width:94%;height:auto}',
    '.th-stage.is-emblem .th-svg{height:62%;width:auto}',
    '.th-stage .th-corner{width:36%}',
    '.th-hint{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);white-space:nowrap;pointer-events:none;font:400 10px/1 "JetBrains Mono",monospace;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.42)}'
  ].join('\n');
  (function () { var st = document.createElement('style'); st.setAttribute('data-defxn-thumbs', ''); st.textContent = css; document.head.appendChild(st); })();

  window.DefxnThumbs = { thumb: thumb, stage: stage, SHOWCASE: SHOWCASE, defaultPalette: defaultPalette };
})();

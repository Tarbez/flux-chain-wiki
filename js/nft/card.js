/* DEFXN identity card: renders one card from one record (see cards-data.js for the fields).

   DefxnCard.mount(host, record, opts) draws one card inside `host`, for a site page. It loads what
   the card needs first (its builder files, its 3D settings and its six chrome drawings, through
   traits.js), then draws. It returns { ready, unmount }: `ready` resolves to the card element (or
   rejects, naming what did not load), and unmount() stops every timer and watcher, frees the card's
   GPU scenes, removes what mount added, and leaves `host` exactly as it was. A mounted card holds the
   shared 3D renderer (Art3D.use); when its last holder is done, the renderer is freed too
   (opts.release: false keeps the hold, so the renderer stays).
   The card fills the host's width at 10 : 7, at any size (card units scale with its box).
   DefxnCard.render(box, record) builds the card inside `box` at once and returns the card element.
   It needs every picked element complete (the full layers-bundle.js, or after mount's loading).
   traits.js picks the card's DNA: one element from each layer folder in layers/. Two kinds of
   element come out of it:
     - the ART layers are built in 3D by art3d.js and drawn into the card's art canvas;
     - the CHROME layers (corner, frame, tag, ornament, divider, emblem) are flat SVG drawings
       placed on the card. Their colours and record fields are filled in by js/nft/card-chrome.js,
       the same helpers a site uses to wear the card's skin.
   The words come only from the record. The same record always gives the same card.

   Motion: the card fades in once (card.css). On hover the 3D art tilts toward the pointer, one frame
   per pointer move, and eases back when the pointer leaves; then it stops. In the OBJECT view
   (card._setMode('object')) the words step aside and the art becomes a solid object to turn all the
   way round: drag to turn (it coasts briefly, then stops), arrow keys turn it by 15 degrees, and a
   double-click resets it. Nothing here runs an idle frame loop. With prefers-reduced-motion the art
   does not tilt on hover and does not coast.

   Needs, in order: js/ark/mark-data.js, js/vendor/three-r180-defxn.js, a layer table (the full
   docs/home-redesign/nft/layers-bundle.js, or js/nft/skin-bundle.js on the site), js/nft/cards-data.js,
   js/nft/traits.js, js/nft/art3d.js, js/nft/card-chrome.js. Styles: css/nft-card.css. */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var T = window.DEFXN_TRAITS, A = window.Art3D, H = window.DefxnCardChrome;
  if (!H) throw new Error('The card needs its chrome helpers: load js/nft/card-chrome.js before card.js.');
  var isLive = H.isLive, shortId = H.shortId;
  var CORNERS = ['tl', 'tr', 'bl'];

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function label(text) { return el('span', 'nft-label', text); }

  function cssVar(node, name, fallback) { return getComputedStyle(node).getPropertyValue(name).trim() || fallback; }

  function build(record, traits) {
    var card = el('article', 'nft is-wait');
    card._record = record;
    card.setAttribute('aria-label', 'DEFXN identity card, genesis ID ' + (record.genesisId || ''));
    card.dataset.key = T.keyHex(record);
    card.dataset.dna = traits.dna;
    card.dataset.traits = traits.list.map(function (e) { return e.name; }).join(' ');
    var ghost = el('i', 'nft-ghost');
    if (window.DEFXN_MARK) ghost.style.setProperty('--nft-mark-img', 'url("' + window.DEFXN_MARK + '")');
    card.appendChild(ghost);
    card.appendChild(el('canvas', 'nft-art'));
    card.appendChild(el('canvas', 'nft-glow'));

    var colours = H.colours(record, traits), picks = traits.picks;
    function chrome(slot, cls) {
      var e = picks[slot];
      if (!e || e.kind !== 'chrome') return null;
      var svg = H.fill(e, record, traits, colours);
      if (svg) svg.setAttribute('class', 'nft-chrome ' + slot + (cls ? ' ' + cls : ''));
      return svg;
    }
    var frame = chrome('frame'); if (frame) card.appendChild(frame);
    CORNERS.forEach(function (k) { var c = chrome('corner', k); if (c) card.appendChild(c); });

    var brand = el('div', 'nft-text nft-brand');
    var mark = el('img'); mark.alt = ''; mark.src = window.DEFXN_MARK || '';
    brand.appendChild(mark); brand.appendChild(el('b', null, 'DEFXN'));
    card.appendChild(brand);

    var gid = el('div', 'nft-text nft-gid');
    gid.appendChild(label('Genesis ID')); gid.appendChild(el('b', null, record.genesisId || ''));
    card.appendChild(gid);

    var who = el('div', 'nft-text nft-who');
    who.appendChild(label('Identity'));
    var idEl = el('b', null, shortId(record.identity));
    if (idEl.textContent !== String(record.identity || '')) idEl.title = record.identity;
    who.appendChild(idEl);
    who.appendChild(el('small', null, record.name || ''));
    card.appendChild(who);

    var tag = chrome('tag'); if (tag) card.appendChild(tag);

    var facts = el('dl', 'nft-text nft-facts');
    [['Status', record.status], ['Role', record.role], ['Network', record.network], ['Joined', record.joined]].forEach(function (row) {
      facts.appendChild(el('dt', null, row[0]));
      var dd = el('dd');
      if (row[0] === 'Status' && isLive(row[1])) { dd.className = 'is-live'; dd.appendChild(el('i', 'nft-dot')); }
      dd.appendChild(document.createTextNode(row[1] || ''));
      facts.appendChild(dd);
    });
    card.appendChild(facts);

    var orn = chrome('ornament'); if (orn) card.appendChild(orn);
    var div = chrome('divider'); if (div) card.appendChild(div);

    var foot = el('div', 'nft-text nft-foot');
    var emblem = chrome('emblem'); if (emblem) foot.appendChild(emblem);
    var lines = el('p');
    (record.tagline || []).forEach(function (t) { lines.appendChild(el('span', null, t)); lines.appendChild(el('br')); });
    if (lines.lastChild) lines.removeChild(lines.lastChild);
    foot.appendChild(lines);
    card.appendChild(foot);

    card.appendChild(el('span', 'nft-text nft-serial', record.serial || ''));
    return card;
  }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  function render(box, record) {
    var traits = T.pick(record), missing = traits.list.filter(function (e) { return !T.ready(e); });
    if (missing.length) {
      throw new Error('The card cannot draw yet: ' + missing.map(function (e) { return e.id; }).join(', ') +
        ' still need their drawings or 3D settings. Use DefxnCard.mount, which loads them, or load the full layers-bundle.js.');
    }
    box.classList.add('nft-box');
    box.textContent = '';
    var card = build(record, traits);
    card._traits = traits;
    box.appendChild(card);
    var key = T.keyOf(record), model = null, tilt = { x: A.REST.x, y: A.REST.y }, last = '', timer = 0, raf = 0, ease = 0, want = null;
    var mode = 'card', FRONT = { x: 0.12, y: 0 }, rot = { x: FRONT.x, y: FRONT.y }, drag = null, coast = 0;
    var target = { art: card.querySelector('.nft-art'), glow: card.querySelector('.nft-glow') };
    // drawn pixels are capped near 2.6 million, as in the home's ring kit
    var settle = 0, dead = false, ro = null, hold = A.use();   // the card holds the shared renderer until _stop
    function draw(force, moving) {
      if (dead || !model || !card.clientWidth) return;
      var cw = card.clientWidth, ch = card.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(2.6e6 / (cw * ch)));
      var w = Math.round(cw * dpr), h = Math.round(ch * dpr), k = w + 'x' + h;
      if (!force && k === last) return;
      last = k;
      A.paint(target, model, w, h, mode === 'object' ? rot : tilt, { object: mode === 'object', moving: !!moving });
      // after the last moving frame, one full frame with shadows
      clearTimeout(settle);
      if (moving) settle = setTimeout(function () { draw(true, false); }, 140);
    }
    A.loadMark().then(function (mark) { return A.build(mark, key, traits.picks); }).then(function (m) {
      if (dead) { A.dispose(m); return; }
      model = m; card._model = m;
      A.schedule(function () { if (dead) return; draw(true); card.classList.remove('is-wait'); card.classList.add('is-new'); });
    }).catch(function (err) {
      card.classList.remove('is-wait');
      console.error(err.message);
    });
    if (window.ResizeObserver) {
      ro = new ResizeObserver(function () { clearTimeout(timer); timer = setTimeout(function () { draw(false); }, 80); });
      ro.observe(card);
    }
    // stop everything this card started: timers, frames, the size watcher, and its GPU scenes
    card._stop = function () {
      if (dead) return;
      dead = true;
      clearTimeout(timer); clearTimeout(settle);
      [raf, ease, coast].forEach(function (id) { if (id) cancelAnimationFrame(id); });
      raf = ease = coast = 0;
      if (ro) ro.disconnect();
      if (model) A.dispose(model);
      model = null; card._model = null;
      hold();
    };
    // hover: one frame per pointer move, then an ease back that ends
    function frame() {
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = 0; if (want) { tilt = want; draw(true, true); } });
    }
    card.addEventListener('pointermove', function (e) {
      if (mode === 'object') { turnMove(e); return; }
      if (!model || (reduce && reduce.matches)) return;
      if (ease) { cancelAnimationFrame(ease); ease = 0; }
      var r = card.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width * 2 - 1, ny = (e.clientY - r.top) / r.height * 2 - 1;
      want = { x: A.REST.x + ny * 0.2, y: A.REST.y + nx * 0.36 };
      frame();
    });
    card.addEventListener('pointerleave', function () {
      if (mode === 'object' || !model || (reduce && reduce.matches)) return;
      want = null;
      var from = { x: tilt.x, y: tilt.y }, t0 = performance.now();
      function step(now) {
        var t = Math.min(1, (now - t0) / 520), e = 1 - Math.pow(1 - t, 3);
        tilt = { x: from.x + (A.REST.x - from.x) * e, y: from.y + (A.REST.y - from.y) * e };
        draw(true, t < 1);
        ease = t < 1 ? requestAnimationFrame(step) : 0;
      }
      ease = requestAnimationFrame(step);
    });

    /* the object view: turn the art all the way round */
    function stopMotion() { if (coast) { cancelAnimationFrame(coast); coast = 0; } if (ease) { cancelAnimationFrame(ease); ease = 0; } }
    function turnFrame() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; draw(true, true); }); }
    function easeTo(goal, ms) {
      stopMotion();
      var from = { x: rot.x, y: rot.y }, t0 = performance.now();
      // the short way round on the turning axis
      var dy = ((goal.y - from.y) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
      function step(now) {
        var t = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - t, 3);
        rot = { x: from.x + (goal.x - from.x) * e, y: from.y + dy * e };
        draw(true, t < 1);
        ease = t < 1 ? requestAnimationFrame(step) : 0;
      }
      ease = requestAnimationFrame(step);
    }
    function turnMove(e) {
      if (!drag) return;
      var now = performance.now(), dx = e.clientX - drag.x, dy = e.clientY - drag.y, dt = Math.max(1, now - drag.t);
      rot = { x: rot.x + dy * 0.008, y: rot.y + dx * 0.008 };
      drag.vx = dx * 0.008 / dt; drag.vy = dy * 0.008 / dt;
      drag.x = e.clientX; drag.y = e.clientY; drag.t = now;
      turnFrame();
    }
    card.addEventListener('pointerdown', function (e) {
      if (mode !== 'object' || !model) return;
      stopMotion();
      drag = { x: e.clientX, y: e.clientY, t: performance.now(), vx: 0, vy: 0 };
      card.setPointerCapture(e.pointerId); card.classList.add('is-turning');
    });
    function release() {
      if (!drag) return;
      var vx = drag.vx, vy = drag.vy; drag = null; card.classList.remove('is-turning');
      if (reduce && reduce.matches) return;
      var t0 = performance.now(), last = t0;
      function step(now) {                   // a short coast that slows to a stop
        var dt = now - last; last = now;
        var k = Math.pow(0.9, dt / 16); vx *= k; vy *= k;
        rot = { x: rot.x + vy * dt, y: rot.y + vx * dt };
        var more = Math.abs(vx) + Math.abs(vy) > 0.00004 && now - t0 < 1200;
        draw(true, more);
        coast = more ? requestAnimationFrame(step) : 0;
      }
      if (Math.abs(vx) + Math.abs(vy) > 0.0001) coast = requestAnimationFrame(step);
    }
    card.addEventListener('pointerup', release);
    card.addEventListener('pointercancel', release);
    card.addEventListener('dblclick', function () { if (mode === 'object') easeTo(FRONT, 500); });
    card.addEventListener('keydown', function (e) {
      if (mode !== 'object') return;
      var step = Math.PI / 12, k = { ArrowLeft: [0, -step], ArrowRight: [0, step], ArrowUp: [-step, 0], ArrowDown: [step, 0] }[e.key];
      if (!k) return;
      e.preventDefault(); easeTo({ x: rot.x + k[0], y: rot.y + k[1] }, 220);
    });
    card._setMode = function (m) {
      if (m === mode) return;
      mode = m; stopMotion(); drag = null;
      card.classList.toggle('is-object', m === 'object');
      if (m === 'object') { card.tabIndex = 0; card.setAttribute('aria-roledescription', 'turnable 3D object'); rot = { x: FRONT.x, y: FRONT.y }; draw(true); card.focus({ preventScroll: true }); }
      else { card.removeAttribute('tabindex'); card.removeAttribute('aria-roledescription'); tilt = { x: A.REST.x, y: A.REST.y }; draw(true); }
    };
    var hint = el('span', 'nft-hint', 'Drag to turn. Double-click to reset.');
    card.appendChild(hint);
    return card;
  }

  /* ---------- mount: one card on a site page, loaded, drawn and removed exactly ---------- */
  function mount(host, record, opts) {
    opts = opts || {};
    var box = document.createElement('div'), alive = true, card = null;
    box.className = 'nft-mount';
    host.appendChild(box);
    var ready = T.needAll(T.pick(record).picks).then(function () {
      if (!alive) return null;
      card = render(box, record);
      return card;
    });
    ready.catch(function () {});              // the caller reads the refusal from `ready`
    return {
      ready: ready,
      unmount: function () {
        if (!alive) return;
        alive = false;
        if (opts.release === false) A.use();                // a hold never given back: the renderer stays
        if (card && card._stop) card._stop();
        box.remove();
      }
    };
  }

  /* ---------- PNG: the whole card, words included, drawn from what the page shows ---------- */
  function svgImage(svg) {
    var clone = svg.cloneNode(true);
    Array.prototype.forEach.call(clone.querySelectorAll('text'), function (n) { n.parentNode.removeChild(n); });
    clone.setAttribute('xmlns', NS); clone.removeAttribute('class');
    return new Promise(function (resolve) {
      var im = new Image();
      im.onload = function () { resolve(im); };
      im.onerror = function () { resolve(null); };
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
    });
  }
  function toCanvas(card, scale) {
    var box = card.getBoundingClientRect(), k = scale || (2000 / box.width);
    var out = document.createElement('canvas');
    out.width = Math.round(box.width * k); out.height = Math.round(box.height * k);
    var x = out.getContext('2d');
    function rel(e) { var r = e.getBoundingClientRect(); return { x: (r.left - box.left) * k, y: (r.top - box.top) * k, w: r.width * k, h: r.height * k }; }
    var cs = getComputedStyle(card), rad = parseFloat(cs.borderTopLeftRadius) * k;
    var svgs = Array.prototype.slice.call(card.querySelectorAll('svg.nft-chrome'));
    return Promise.all(svgs.map(svgImage)).then(function (images) {
      x.save();
      x.beginPath(); x.roundRect(0, 0, out.width, out.height, rad); x.clip();
      x.fillStyle = cs.backgroundColor; x.fillRect(0, 0, out.width, out.height);
      if (card._model) {                     // the art, painted again at the export's size
        var t = { art: document.createElement('canvas'), glow: document.createElement('canvas') };
        A.paint(t, card._model, out.width, out.height, A.REST);
        x.drawImage(t.art, 0, 0);
        x.globalCompositeOperation = 'screen';
        x.globalAlpha = parseFloat(cssVar(card, '--nft-glow-a', '.8'));
        x.drawImage(t.glow, 0, 0);
        x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
      }
      svgs.forEach(function (svg, i) {       // the chrome, mirrored as the page mirrors the corners
        if (!images[i]) return;
        var r = rel(svg), cl = svg.getAttribute('class') || '';
        x.save();
        if (/\btr\b/.test(cl)) { x.translate(r.x + r.w, r.y); x.scale(-1, 1); x.drawImage(images[i], 0, 0, r.w, r.h); }
        else if (/\bbl\b/.test(cl)) { x.translate(r.x, r.y + r.h); x.scale(1, -1); x.drawImage(images[i], 0, 0, r.w, r.h); }
        else x.drawImage(images[i], r.x, r.y, r.w, r.h);
        x.restore();
      });
      var serial = card.querySelector('.nft-serial'), sc = getComputedStyle(serial), sr = rel(serial), lw = Math.max(1, k * 0.9);
      x.fillStyle = sc.borderRightColor; x.fillRect(sr.x + sr.w - lw, sr.y, lw, sr.h); x.fillRect(sr.x, sr.y + sr.h - lw, sr.w, lw);
      x.restore();                           // the card has no edge of its own: the frame drawing above is it
      return A.loadMark();
    }).then(function (mark) {
      var ir = rel(card.querySelector('.nft-brand img'));
      x.drawImage(mark.white, ir.x, ir.y, ir.w, ir.h);
      var dot = card.querySelector('.nft-dot');
      if (dot) {
        var dr = rel(dot), dc = getComputedStyle(dot).backgroundColor;
        x.save(); x.fillStyle = dc; x.shadowColor = dc; x.shadowBlur = 14 * k / 2;
        x.beginPath(); x.arc(dr.x + dr.w / 2, dr.y + dr.h / 2, dr.w / 2, 0, Math.PI * 2); x.fill(); x.restore();
      }
      // the words, HTML and SVG alike: each text node, letter by letter, at the font the page uses
      var walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
      for (var n = walker.nextNode(); n; n = walker.nextNode()) {
        var t = n.nodeValue; if (!t.trim()) continue;
        var pe = n.parentElement, c = getComputedStyle(pe), range = document.createRange(), owner = pe.closest('svg'), unit = 1;
        if (owner && owner.viewBox && owner.viewBox.baseVal && owner.viewBox.baseVal.width) unit = owner.getBoundingClientRect().width / owner.viewBox.baseVal.width;
        range.selectNodeContents(n);
        var rr = range.getBoundingClientRect();
        if (c.textTransform === 'uppercase') t = t.toUpperCase();
        if (c.textTransform === 'lowercase') t = t.toLowerCase();
        var px = parseFloat(c.fontSize) * unit * k, ls = (parseFloat(c.letterSpacing) || 0) * unit * k;
        x.font = c.fontWeight + ' ' + px + 'px ' + c.fontFamily;
        x.fillStyle = owner ? c.fill : c.color; x.textBaseline = 'alphabetic';
        var m = x.measureText(t), asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent;
        var tx = (rr.left - box.left) * k, ty = (rr.top - box.top) * k + ((rr.height * k) - (asc + desc)) / 2 + asc;
        for (var i = 0; i < t.length; i++) { x.fillText(t[i], tx, ty); tx += x.measureText(t[i]).width + ls; }
      }
      return out;
    });
  }
  function downloadPNG(card, filename) {
    return toCanvas(card).then(function (c) {
      return new Promise(function (resolve) {
        c.toBlob(function (blob) {
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob); a.download = filename || 'defxn-card.png';
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
          resolve(blob);
        }, 'image/png');
      });
    });
  }

  window.DefxnCard = { mount: mount, render: render, toCanvas: toCanvas, downloadPNG: downloadPNG, fieldOf: H.fieldOf, chromeSvg: H.chromeSvg, colours: H.colours, isLive: isLive };
})();

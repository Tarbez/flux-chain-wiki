/* DEFXN identity world: the owner's card shapes the site.

   DefxnWorld.theme(traits, record) turns one card's picks (traits.js) into a THEME: the SDK's
   semantic colour tokens, derived from the card's palette, plus the card's chrome elements. The
   builders below return DOM for each UI piece, drawn in that theme. The owner sees the site this
   way, and so does everyone who opens the owner's profile.

   Every chrome piece is drawn by DefxnCard.chromeSvg, the function that draws the card, so the UI
   and the card cannot disagree. The banner and the avatar are cuts of the card's own 3D art, built
   and painted once by art3d.js.

     palette    --primary and --role from --b (the light), --accent and --complement from --c. Surfaces
                stay near-black, as on the card. --live is the Minted green, used only for Minted.
     corner     three corners of every panel, placed as on the card, and the corners of outline buttons
     frame      the frame of every panel. Each side is cut in five bands: the ends and the middle keep
                their shape, and the two bands between them stretch. Hairlines stay 1 px.
     tag        the badge under the name, drawn as on the card. A role or status badge the tag does not
                show takes the tag's outline: pill, rounded box, box, notch, brackets or a plain rule.
     ornament   the strip beside a section heading
     divider    the line between sections. Its marks and words keep their shape; its plain runs stretch.
     emblem     the glyph beside the name, and the list bullets
     mark       the avatar: a square cut of the art around the mark
     backdrop, aura, signal, particles
                the banner: a wide cut of the art

   API (each builder returns a DOM node; `th` is a theme):
     theme(traits, record)            the theme. th.apply(node) puts its tokens on a node.
     panel(th, opts)                  a panel; put content in panel.body. opts: title, scale, frame, corners
     button(th, text, opts)           opts: primary, href, onClick
     tag(th, opts) / badge(th, field) / badges(th)
     header(th, text, opts) / divider(th, opts) / emblem(th, px) / nameLine(th, opts) / bullets(th, items)
     avatar(th, px, opts) / banner(th, opts)
     sample(layerKey, element, record)  what that ONE element shapes, drawn small
     dress(node, th, opts) / ornament(th, opts)  the frame and corners laid over an element the page
                                      already has, and the heading strip alone (nft-engine.js)
     SHAPES[layerKey]                 one line: what the layer shapes

   Nothing here runs an idle frame loop. The art is painted once per card and cut again only when a
   box changes size. Needs, in order: js/ark/mark-data.js, js/vendor/three-r180-defxn.js, layers-bundle.js,
   js/nft/cards-data.js, js/nft/traits.js, js/nft/art3d.js, js/nft/card-chrome.js, js/nft/card.js,
   js/nft/skin-recipe.js (js/ paths are at the site root). Styles: css/nft-card.css. */
(function () {
  'use strict';

  var T = window.DEFXN_TRAITS, A = window.Art3D, C = window.DefxnCard;
  if (!T || !A || !C || !C.chromeSvg) {
    throw new Error('world.js needs js/nft/traits.js, js/nft/art3d.js and js/nft/card.js loaded before it. ' +
      'Load them in the order card.html uses, then world.js.');
  }
  var NS = 'http://www.w3.org/2000/svg';
  var CHROME = ['corner', 'frame', 'tag', 'ornament', 'divider', 'emblem'];
  var ART_LAYERS = ['backdrop', 'aura', 'mark', 'signal', 'particles'];

  // what each layer shapes in the UI, one line each (shown beside every sample)
  var SHAPES = {
    backdrop: 'The far layer of the profile banner.',
    palette: 'The colour of buttons and links, and the focus ring.',
    aura: 'The shape around the mark in the banner.',
    mark: 'The avatar, cut square around the mark.',
    signal: 'The light in the banner.',
    particles: 'The small things in front, in the banner.',
    corner: 'Panel corners and outline buttons.',
    frame: 'The frame of every panel.',
    tag: 'The badges under the name.',
    ornament: 'The strip beside each section heading.',
    divider: 'The line between sections.',
    emblem: 'The glyph beside the name, and the list bullets.'
  };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function report(err) { console.error(err && err.message ? err.message : String(err)); }
  // colour helpers and the token derivation live in skin-recipe.js (DefxnSkin): one copy for the card,
  // world.js, nft-engine.js and Ark UI
  var S = window.DefxnSkin;
  if (!S) throw new Error('world.js needs skin-recipe.js: load it after card.js and before world.js.');
  var rootVar = S.colour.rootVar, chan = S.colour.chan, hsl = S.colour.hsl, luminance = S.colour.luminance, contrast = S.colour.contrast;
  function coloursOf(record, traits) { return C.colours(record, traits); }

  /* ---------- the theme ---------- */
  var DRAWS = /<(rect|path|line|circle|ellipse|polygon|polyline|text|use|image)\b/i;
  function drawn(e) { return e && e.kind === 'chrome' && DRAWS.test(String(e.svg || '')) ? e : null; }

  function theme(traits, record) {
    record = record || {};
    var picks = traits.picks, vars = S.tokens(traits, record), colours = coloursOf(record, traits);
    var chrome = {};
    CHROME.forEach(function (slot) { chrome[slot] = drawn(picks[slot]); });
    return {
      record: record, traits: traits, picks: picks, palette: picks.palette || null, chrome: chrome, vars: vars, colours: colours,
      minted: C.isLive ? C.isLive(record.status) : colours.state !== colours.dim,
      key: T.keyOf(record),
      apply: function (node) {
        Object.keys(vars).forEach(function (k) { node.style.setProperty(k, vars[k]); });
        node.classList.add('w-world');
        return node;
      }
    };
  }
  // a theme where one layer's element is swapped (for the samples)
  function themeWith(record, layerKey, element) {
    var base = T.pick(record), picks = Object.assign({}, base.picks);
    if (element) picks[layerKey] = element;
    return theme(Object.assign({}, base, { picks: picks }), record);
  }

  /* ---------- measuring a chrome drawing ---------- */
  // the drawing's content placed in a hidden box at 1 unit = 1 px, so its parts can be measured
  var host = null;
  function measure(svg, fn) {
    if (!host) {
      host = document.createElementNS(NS, 'svg');
      host.setAttribute('aria-hidden', 'true');
      host.style.cssText = 'position:absolute;left:-12000px;top:0;width:1200px;height:800px;visibility:hidden;pointer-events:none';
      (document.body || document.documentElement).appendChild(host);
    }
    var g = document.createElementNS(NS, 'g');
    Array.prototype.forEach.call(svg.childNodes, function (n) { g.appendChild(n.cloneNode(true)); });
    host.appendChild(g);
    try { return fn(g); } finally { host.removeChild(g); }
  }
  function boxOf(n) {
    var b = n.getBBox(), m = n.getCTM();
    if (!b.width && !b.height) return null;
    var pts = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]];
    if (m) pts = pts.map(function (p) { return [m.a * p[0] + m.c * p[1] + m.e, m.b * p[0] + m.d * p[1] + m.f]; });
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    var sw = parseFloat(n.getAttribute('stroke-width')) || (n.getAttribute('stroke') ? 1 : 0), pad = sw / 2;
    // a part may stretch when it is plain: a rect, a line, an ellipse, or a path of one stroke
    var plain = /^(rect|line|ellipse)$/.test(n.nodeName) || (n.nodeName === 'path' && ((n.getAttribute('d') || '').match(/[Mm]/g) || []).length === 1);
    return { x0: Math.min.apply(null, xs) - pad, x1: Math.max.apply(null, xs) + pad, y0: Math.min.apply(null, ys) - pad, y1: Math.max.apply(null, ys) + pad, text: n.nodeName === 'text', plain: plain };
  }
  // every drawn part of a filled chrome drawing, and their union. Cached per element and words.
  var parts = {};
  function analyse(svg, id) {
    var key = id + '|' + svg.textContent;
    if (parts[key]) return parts[key];
    return (parts[key] = measure(svg, function (g) {
      var list = [], all = null;
      function add(b) {
        if (!b) return;
        list.push(b);
        all = all ? { x0: Math.min(all.x0, b.x0), x1: Math.max(all.x1, b.x1), y0: Math.min(all.y0, b.y0), y1: Math.max(all.y1, b.y1) } : { x0: b.x0, x1: b.x1, y0: b.y0, y1: b.y1 };
      }
      Array.prototype.forEach.call(g.querySelectorAll('rect,path,line,circle,ellipse,polygon,polyline,text'), function (n) {
        if (n.closest('defs,clipPath,mask,pattern,marker,symbol')) return;
        // one path may draw several shapes (two hexagons, a row of ticks): measure each stroke alone,
        // when every stroke starts with an absolute move
        var d = n.nodeName === 'path' ? n.getAttribute('d') || '' : '', subs = d.split(/(?=M)/).filter(function (x) { return /\S/.test(x); });
        if (subs.length > 1 && !/m/.test(d.slice(1))) {
          subs.forEach(function (sub) {
            var one = n.cloneNode(false);
            one.setAttribute('d', sub);
            n.parentNode.insertBefore(one, n);
            add(boxOf(one));
            n.parentNode.removeChild(one);
          });
          return;
        }
        add(boxOf(n));
      });
      return { list: list, box: all };
    }));
  }

  /* ---------- size watching (no frame loop: a box is redrawn only when its size changes) ---------- */
  var RO = typeof ResizeObserver === 'function' ? new ResizeObserver(function (entries) {
    entries.forEach(function (en) {
      var t = en.target, fn = t._wFit, w = en.contentRect.width, h = en.contentRect.height;
      if (!fn || w < 1 || h < 1) return;
      var k = Math.round(w * 4) + 'x' + Math.round(h * 4);
      if (t._wSize === k) return;
      t._wSize = k;
      try { fn(w, h); } catch (err) { report(err); }
    });
  }) : null;
  function fit(node, fn) {
    node._wFit = fn;
    if (RO) RO.observe(node);
    else setTimeout(function () { if (node.clientWidth) fn(node.clientWidth, node.clientHeight); }, 0);
  }

  /* ---------- slicing: a drawing cut into bands, some kept, some stretched ---------- */
  // bands along one side: [{u0, u1, p0, p1}] maps drawing units u to box pixels p
  function bands(total, end, mid, len, s) {
    var E = Math.round(end * s), M = Math.round(mid * s);
    if (len >= 2 * E + M + 16) {
      var c0 = Math.round((len - M) / 2), m0 = (total - mid) / 2;
      return [{ u0: 0, u1: end, p0: 0, p1: E }, { u0: end, u1: m0, p0: E, p1: c0 }, { u0: m0, u1: m0 + mid, p0: c0, p1: c0 + M },
        { u0: m0 + mid, u1: total - end, p0: c0 + M, p1: Math.round(len) - E }, { u0: total - end, u1: total, p0: Math.round(len) - E, p1: len }];
    }
    if (len >= 2 * E + 8) return [{ u0: 0, u1: end, p0: 0, p1: E }, { u0: end, u1: total - end, p0: E, p1: Math.round(len) - E }, { u0: total - end, u1: total, p0: Math.round(len) - E, p1: len }];
    return [{ u0: 0, u1: total, p0: 0, p1: len }];
  }
  // bands that keep every mark and word and stretch only the gaps between them (dividers). A long
  // plain part (a rule, an outline box) stretches, and its two ends are kept so its corners stay true.
  // A row of many tiny marks (dots, ticks, slashes) repeats at its own size, so a dot stays a dot.
  function keepBands(info, total, len, s) {
    var marks = [[0, 12], [total - 12, total]], tiny = [], runs = [];
    info.list.forEach(function (b) {
      var w = b.x1 - b.x0;
      if (!b.text && b.plain && w > total * 0.18) runs.push([b.x0, b.x1]);
      else if (!b.text && w < total * 0.03) tiny.push([b.x0, b.x1]);
      else marks.push([Math.max(0, b.x0 - 3), Math.min(total, b.x1 + 3)]);
    });
    function merge(list, gap) {
      var out = [];
      list.slice().sort(function (p, q) { return p[0] - q[0]; }).forEach(function (k) {
        var last = out[out.length - 1];
        if (last && k[0] <= last[1] + gap) { last[1] = Math.max(last[1], k[1]); last[2]++; } else out.push([k[0], k[1], 1]);
      });
      return out;
    }
    // the row is made of the commonest size of tiny mark (the dots of a dotted line, not the few
    // slashes that sit on it); every other tiny mark is kept where it is
    var sizes = {}, fill = null;
    tiny.forEach(function (t) { var k = Math.round(Math.log(Math.max(0.5, t[1] - t[0])) / Math.LN2 * 2); (sizes[k] = sizes[k] || []).push(t); });
    Object.keys(sizes).forEach(function (k) { if (!fill || sizes[k].length > sizes[fill].length) fill = k; });
    function isRow(r) { return r[2] >= 6 && r[1] - r[0] > total * 0.18; }
    var keeps = merge(marks, 6), rows = fill ? merge(sizes[fill], 8).filter(isRow) : [];
    Object.keys(sizes).forEach(function (k) {
      (k === fill ? merge(sizes[k], 8).filter(function (r) { return !isRow(r); }) : sizes[k]).forEach(function (r) { keeps.push([Math.max(0, r[0] - 2), Math.min(total, r[1] + 2)]); });
    });
    // cut the length at every edge, then name each piece: kept beats row beats run beats an empty gap
    var edges = [0, total];
    [keeps, rows, runs].forEach(function (l) { l.forEach(function (r) { edges.push(Math.max(0, Math.min(total, r[0])), Math.max(0, Math.min(total, r[1]))); }); });
    edges = edges.sort(function (p, q) { return p - q; }).filter(function (e, i, all) { return i === 0 || e - all[i - 1] > 0.01; });
    function inside(list, a, b) { return list.some(function (r) { return r[0] <= a + 0.01 && r[1] >= b - 0.01; }); }
    var cuts = [];
    for (var i = 0; i < edges.length - 1; i++) {
      var a = edges[i], z = edges[i + 1];
      var kind = inside(keeps, a, z) ? 'keep' : inside(rows, a, z) ? 'row' : inside(runs, a, z) ? 'run' : 'gap';
      var last = cuts[cuts.length - 1];
      if (last && last.kind === kind) last.b = z; else cuts.push({ a: a, b: z, kind: kind });
    }
    var extra = len - total * s;
    function room(kind) { return cuts.reduce(function (n, c) { return n + (c.kind === kind ? c.b - c.a : 0); }, 0); }
    var grow = room('run') >= 8 ? 'run' : 'row', space = room(grow);
    if (extra < 0 || space < 8) return [{ u0: 0, u1: total, p0: 0, p1: len }];
    var out = [], p = 0;
    cuts.forEach(function (c, j) {
      var w = (c.b - c.a) * s + (c.kind === grow ? extra * (c.b - c.a) / space : 0);
      var p1 = j === cuts.length - 1 ? len : Math.round(p + w);
      if (p1 > p) out.push({ u0: c.a, u1: c.b, p0: p, p1: p1, tile: c.kind === 'row' && grow === 'row' ? s : 0 });
      p = p1;
    });
    return out;
  }
  // a band marked `tile` repeats its drawing at k px per unit instead of stretching it
  function tiles(x) {
    if (!x.tile) return [x];
    var out = [], k = x.tile, step = (x.u1 - x.u0) * k;
    for (var p = x.p0; p < x.p1 - 0.5; p += step) {
      var w = Math.min(step, x.p1 - p);
      out.push({ u0: x.u0, u1: x.u0 + w / k, p0: p, p1: p + w });
    }
    return out;
  }
  function placePieces(holder, src, xs, ys, ringOnly) {
    holder.textContent = '';
    function place(x, y) {
      if (x.p1 - x.p0 < 0.5 || y.p1 - y.p0 < 0.5) return;
      var piece = src.cloneNode(true);
      piece.setAttribute('viewBox', [x.u0, y.u0, x.u1 - x.u0, y.u1 - y.u0].join(' '));
      piece.setAttribute('preserveAspectRatio', 'none');
      piece.setAttribute('class', 'w-piece');
      piece.style.cssText = 'left:' + x.p0 + 'px;top:' + y.p0 + 'px;width:' + (x.p1 - x.p0) + 'px;height:' + (y.p1 - y.p0) + 'px';
      holder.appendChild(piece);
    }
    ys.forEach(function (y, j) {
      xs.forEach(function (band, i) {
        if (ringOnly && i > 0 && i < xs.length - 1 && j > 0 && j < ys.length - 1) return;
        tiles(band).forEach(function (x) { place(x, y); });
      });
    });
  }

  /* ---------- chrome pieces ---------- */
  function chromeSvg(th, slot, element) {
    var e = element || th.chrome[slot];
    return e ? C.chromeSvg(e, th.record, th.traits) : null;
  }
  // the corner element at three corners of a box, as on the card (top-right and bottom-left mirrored)
  function corners(box, th, s, inset, element) {
    var e = element || th.chrome.corner;
    if (!e) return;
    var size = Math.max(6, Math.round(120 * s)), at = Math.round(inset) + 'px';
    ['tl', 'tr', 'bl'].forEach(function (k) {
      var svg = C.chromeSvg(e, th.record, th.traits);
      if (!svg) return;
      svg.setAttribute('class', 'w-corner ' + k);
      svg.style.width = svg.style.height = size + 'px';
      svg.style[k === 'bl' ? 'bottom' : 'top'] = at;
      svg.style[k === 'tr' ? 'right' : 'left'] = at;
      box.appendChild(svg);
    });
  }
  // the frame element drawn around a box, cut in bands so its corners and middle keep their shape
  function frame(box, th, s, element) {
    var src = chromeSvg(th, 'frame', element);
    if (!src) return;
    var holder = el('div', 'w-frame');
    box.appendChild(holder);
    fit(holder, function (w, h) { placePieces(holder, src, bands(1000, 120, 240, w, s), bands(700, 120, 200, h, s), true); });
  }

  function panel(th, opts) {
    opts = opts || {};
    var s = opts.scale || 0.42, root = el(opts.tag || 'section', 'w-panel' + (opts.className ? ' ' + opts.className : ''));
    var deco = el('div', 'w-deco');
    deco.setAttribute('aria-hidden', 'true');
    root.appendChild(deco);
    root.style.setProperty('--w-pad', (opts.pad || Math.round(Math.max(14, 52 * s))) + 'px');
    root.style.setProperty('--w-radius', Math.round(30 * s) + 'px');
    if (opts.frame !== false) frame(deco, th, s, opts.frameElement);
    // the card's frame is the panel's border: the panel's own line goes when a frame is drawn
    if (opts.frame !== false && (opts.frameElement || th.chrome.frame)) root.classList.add('has-frame');
    if (opts.corners !== false) corners(deco, th, s, 28 * s, opts.cornerElement);
    var body = el('div', 'w-body');
    root.appendChild(body);
    if (opts.title) body.appendChild(header(th, opts.title, opts));
    root.body = body;
    return root;
  }

  // dress an existing element in the NFT: its frame and corners laid over it (the element must be
  // position: relative). Returns the layer, so the caller can remove it again.
  function dress(node, th, opts) {
    opts = opts || {};
    var s = opts.scale || 0.42, deco = el('div', 'w-deco');
    deco.setAttribute('aria-hidden', 'true');
    if (opts.frame !== false) frame(deco, th, s, opts.frameElement);
    if (opts.corners !== false) corners(deco, th, s, opts.inset != null ? opts.inset : 28 * s, opts.cornerElement);
    node.insertBefore(deco, node.firstChild);
    return deco;
  }
  // the ornament strip on its own, for a heading the page already has
  function ornament(th, opts) {
    opts = opts || {};
    var strip = fitted(th, 'ornament', { maxH: opts.ornH || 30, maxW: opts.ornW || 170, maxK: 0.75 }, opts.element);
    if (strip) strip.setAttribute('aria-hidden', 'true');
    return strip;
  }

  function button(th, text, opts) {
    opts = opts || {};
    var b = el(opts.href ? 'a' : 'button', 'w-btn ' + (opts.primary ? 'is-primary' : 'is-outline'));
    if (opts.href) b.href = opts.href; else b.type = 'button';
    b.appendChild(el('span', null, text));
    if (!opts.primary && th.chrome.corner) {
      var deco = el('span', 'w-deco');
      deco.setAttribute('aria-hidden', 'true');
      corners(deco, th, opts.cornerScale || 0.26, 0);
      b.insertBefore(deco, b.firstChild);
      b.classList.add('has-corners');
    }
    if (opts.onClick) b.addEventListener('click', opts.onClick);
    return b;
  }

  // a chrome drawing cut to what it draws, at one scale that fits (maxW x maxH) and is at most maxK
  function fitted(th, slot, opts, element) {
    opts = opts || {};
    var e = element || th.chrome[slot], svg = e ? C.chromeSvg(e, th.record, th.traits) : null;
    if (!svg) return null;
    var info = analyse(svg, e.file || e.name);
    if (!info.box) return null;
    var b = info.box, pad = 1, x = b.x0 - pad, y = b.y0 - pad, w = b.x1 - b.x0 + pad * 2, h = b.y1 - b.y0 + pad * 2;
    var k = Math.min(opts.maxK || 1, (opts.maxW || 1e4) / w, (opts.maxH || 1e4) / h);
    svg.setAttribute('viewBox', [x, y, w, h].map(function (v) { return +v.toFixed(2); }).join(' '));
    svg.setAttribute('preserveAspectRatio', 'xMinYMid meet');
    svg.setAttribute('class', 'w-fit w-' + slot);
    svg.style.width = Math.round(w * k) + 'px';
    svg.style.height = Math.round(h * k) + 'px';
    return svg;
  }

  /* ---------- badges ---------- */
  function fieldsOf(e) {
    var out = [];
    String((e && e.svg) || '').replace(/data-field="(\w+)"/g, function (m, f) { if (out.indexOf(f) < 0) out.push(f); });
    return out;
  }
  // the tag's outline, read from its first outline-sized shape: pill, round, box, notch, bracket or plain
  var families = {};
  function family(e) {
    if (!e) return { kind: 'plain', line: 'rule' };
    var id = e.file || e.name;
    if (families[id]) return families[id];
    var doc = new DOMParser().parseFromString(e.svg, 'image/svg+xml'), out = { kind: 'plain', line: 'rule' };
    var shapes = doc.querySelectorAll('rect,path,polygon');
    for (var i = 0; i < shapes.length; i++) {
      var n = shapes[i], stroke = new RegExp(window.DefxnCardChrome ? DefxnCardChrome.INK_SOURCE : 'var\\(--(line|rule|faint|acc2|acc|dim|ink)\\)').exec(n.getAttribute('stroke') || '');
      if (!stroke) continue;
      if (n.nodeName === 'rect') {
        var h = parseFloat(n.getAttribute('height')) || 0, w = parseFloat(n.getAttribute('width')) || 0, rx = parseFloat(n.getAttribute('rx')) || 0;
        if (h < 12 || w < 40) continue;                          // a small mark, not the outline
        out = { kind: rx >= h * 0.4 ? 'pill' : rx > 0 ? 'round' : 'box', line: stroke[1] };
        break;
      }
      var d = n.getAttribute('d') || n.getAttribute('points') || '', nums = d.match(/-?\d*\.?\d+/g) || [];
      if (nums.length < 6) continue;
      var subs = (d.match(/[Mm]/g) || []).length, closed = /[Zz]/.test(d) || n.nodeName === 'polygon';
      if (closed) {
        out = { kind: /[AaCcQqSsTt]/.test(d) ? 'round' : /[Ll]|[Mm]\s*-?[\d.]+[\s,]+-?[\d.]+[\s,]+-?[\d.]/.test(d) ? 'notch' : 'box', line: stroke[1] };
        break;
      }
      if (subs >= 2) { out = { kind: 'bracket', line: stroke[1] }; break; }
    }
    return (families[id] = out);
  }
  function chip(th, field) {
    var f = family(th.chrome.tag), c = el('span', 'w-chip is-' + f.kind + ' is-' + field);
    c.style.setProperty('--w-cl', th.colours[f.line] || th.colours.rule);
    if (field === 'status' && th.minted) c.classList.add('is-minted');
    c.appendChild(el('span', 'w-sr', field === 'role' ? 'Role: ' : 'Status: '));
    c.appendChild(el('i', 'w-chip-mark'));
    c.appendChild(el('span', null, C.fieldOf(th.record, th.traits, field)));
    return c;
  }
  // the tag as the card draws it, cut to what it draws
  function tag(th, opts) {
    var svg = fitted(th, 'tag', Object.assign({ maxK: 1, maxH: 40 }, opts || {}));
    if (!svg) return null;
    var fields = fieldsOf(th.chrome.tag), wrap = el('span', 'w-tag');
    svg.setAttribute('aria-hidden', 'true');
    wrap.appendChild(svg);
    wrap.appendChild(el('span', 'w-sr', fields.map(function (f) { return f + ': ' + C.fieldOf(th.record, th.traits, f); }).join(', ')));
    return wrap;
  }
  function badge(th, field) { return fieldsOf(th.chrome.tag).indexOf(field) >= 0 ? tag(th) : chip(th, field); }
  // the tag, then a badge for role and status when the tag does not show them already
  function badges(th, opts) {
    var out = [], shown = fieldsOf(th.chrome.tag), t = tag(th, opts);
    if (t) out.push(t);
    ['role', 'status'].forEach(function (f) { if (shown.indexOf(f) < 0 && th.record[f]) out.push(chip(th, f)); });
    return out;
  }

  /* ---------- headings, dividers, glyphs ---------- */
  function header(th, text, opts) {
    opts = opts || {};
    var h = el('div', 'w-head'), t = el(opts.level || 'h3', 'w-head-text', text);
    h.appendChild(t);
    if (opts.ornament !== false) {
      var strip = fitted(th, 'ornament', { maxH: opts.ornH || 30, maxW: opts.ornW || 170, maxK: 0.75 }, opts.ornamentElement);
      if (strip) { strip.setAttribute('aria-hidden', 'true'); h.appendChild(strip); }
    }
    return h;
  }
  function divider(th, opts) {
    opts = opts || {};
    var d = el('div', 'w-divider'), src = chromeSvg(th, 'divider', opts.element);
    d.setAttribute('role', 'separator');
    if (!src) { d.classList.add('is-plain'); return d; }
    var info = analyse(src, (opts.element || th.chrome.divider).file);
    fit(d, function (w, h) { placePieces(d, src, keepBands(info, 360, w, h / 24), [{ u0: 0, u1: 24, p0: 0, p1: h }], false); });
    return d;
  }
  // the emblem at a height in px. Below 20 px its thin strokes are drawn at their card width.
  function emblem(th, px, element) {
    var svg = chromeSvg(th, 'emblem', element);
    if (!svg) return null;
    svg.setAttribute('class', 'w-emblem');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.height = px + 'px';
    svg.style.width = Math.round(px * 30 / 34) + 'px';
    if (px < 20) {
      Array.prototype.forEach.call(svg.querySelectorAll('[stroke]'), function (n) {
        if ((parseFloat(n.getAttribute('stroke-width')) || 1) <= 2) n.setAttribute('vector-effect', 'non-scaling-stroke');
      });
    }
    return svg;
  }
  function nameLine(th, opts) {
    opts = opts || {};
    var line = el(opts.level || 'div', 'w-name' + (opts.className ? ' ' + opts.className : ''));
    var g = emblem(th, opts.glyph || 22, opts.element);
    if (g) { g.setAttribute('aria-hidden', 'true'); line.appendChild(g); }
    line.appendChild(el('span', null, opts.text != null ? opts.text : (th.record.name || '')));
    return line;
  }
  function bullets(th, items, opts) {
    opts = opts || {};
    var ul = el('ul', 'w-bullets');
    items.forEach(function (item) {
      var li = el('li'), g = emblem(th, opts.glyph || 12, opts.element) || el('i', 'w-dot');
      g.setAttribute('aria-hidden', 'true');
      li.appendChild(g);
      if (typeof item === 'string') li.appendChild(el('span', null, item)); else li.appendChild(item);
      ul.appendChild(li);
    });
    return ul;
  }

  /* ---------- the art: banner and avatar ----------
     The painting is js/nft/scene.js (DefxnScene), the same code a site uses for its world and avatar.
     world.js adds only its boxes and corners. */
  var SC = window.DefxnScene;
  if (!SC) throw new Error('world.js needs js/nft/scene.js: load it after js/nft/card.js and before world.js.');
  function avatar(th, size, opts) {
    opts = opts || {};
    var box = el('span', 'w-avatar'), cv = el('canvas');
    box.style.width = box.style.height = size + 'px';
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', (th.record.name || 'Owner') + ' avatar');
    box.appendChild(cv);
    if (size >= 56 && opts.corners !== false) {
      var deco = el('span', 'w-deco');
      corners(deco, th, size * 0.3 / 120, Math.round(size * 0.05), opts.cornerElement);
      box.appendChild(deco);
    }
    SC.cardArt(th.record, th.picks, opts.only || ART_LAYERS, opts.artWidth || 1400).then(function (src) { fit(cv, function (w, h) { SC.cut(cv, src, SC.AVATAR, w, h); }); }).catch(report);
    return box;
  }
  // the banner: the art drawn with a wide camera (Art3D.paint aspect), so the whole mark sits in the
  // strip with its backdrop, aura, signal and particles around it (DefxnScene.VIEWS.banner)
  function banner(th, opts) {
    opts = opts || {};
    var box = el('div', 'w-banner'), cv = el('canvas');
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', opts.label || 'Banner drawn from the card art');
    box.appendChild(cv);
    SC.model(th.record, th.picks, opts.only || ART_LAYERS).then(function (model) {
      fit(cv, function (w, h) {
        var dpr = Math.min(2, window.devicePixelRatio || 1), pw = Math.max(1, Math.round(w * dpr)), ph = Math.max(1, Math.round(h * dpr));
        SC.painted(model, function () { return SC.paintWide(cv, model, pw, ph, SC.VIEWS.banner); }).catch(report);
      });
    }).catch(report);
    return box;
  }

  /* ---------- samples: what ONE element shapes ---------- */
  function row(label, value) {
    var r = el('div', 'w-row');
    r.appendChild(el('span', 'w-label', label));
    r.appendChild(el('span', 'w-value', value));
    return r;
  }
  function sample(layerKey, element, record) {
    var th = themeWith(record, layerKey, element), box = th.apply(el('div', 'w-sample is-' + layerKey));
    box.setAttribute('data-layer', layerKey);
    function mini(opts) {
      var p = panel(th, Object.assign({ scale: 0.3, pad: 12 }, opts));
      p.body.appendChild(el('b', 'w-mini-name', th.record.name || ''));
      p.body.appendChild(el('span', 'w-mini-sub', C.fieldOf(th.record, th.traits, 'role')));
      return p;
    }
    switch (layerKey) {
      case 'corner': box.appendChild(mini({ frame: false, cornerElement: element })); break;
      case 'frame': box.appendChild(mini({ corners: false, frameElement: element })); break;
      case 'tag': {
        var t = tag(th, { maxW: 200, maxK: 0.8 }), line = el('div', 'w-chips');
        if (t) box.appendChild(t);
        var shown = fieldsOf(th.chrome.tag);
        ['role', 'status'].forEach(function (f) { if (shown.indexOf(f) < 0) line.appendChild(chip(th, f)); });
        if (line.firstChild) box.appendChild(line);
        break;
      }
      case 'ornament': box.appendChild(header(th, 'Names', { ornH: 34, ornW: 140, ornamentElement: element })); break;
      case 'divider':
        box.appendChild(row('Name', th.record.name || ''));
        box.appendChild(divider(th, { element: element }));
        box.appendChild(row('Role', C.fieldOf(th.record, th.traits, 'role')));
        break;
      case 'emblem':
        box.appendChild(nameLine(th, { glyph: 18, element: element }));
        box.appendChild(bullets(th, ['Names', 'Records'], { glyph: 11, element: element }));
        break;
      case 'palette': {
        var acts = el('div', 'w-acts');
        acts.appendChild(button(th, 'Save', { primary: true }));
        var link = el('a', 'w-link', 'View profile');
        link.href = '#'; link.addEventListener('click', function (e) { e.preventDefault(); });
        acts.appendChild(link);
        var ring = el('span', 'w-ring', 'Focus');
        acts.appendChild(ring);
        box.appendChild(acts);
        break;
      }
      case 'mark': {
        var who = el('div', 'w-who');
        who.appendChild(avatar(th, 56, { only: ['mark'], artWidth: 700, corners: false }));
        who.appendChild(el('b', 'w-mini-name', th.record.name || ''));
        box.appendChild(who);
        break;
      }
      default:
        if (ART_LAYERS.indexOf(layerKey) >= 0) box.appendChild(banner(th, { only: [layerKey, 'mark'], artWidth: 700, label: element.name + ' in the banner' }));
    }
    return box;
  }

  /* ---------- styles: injected once, read from the theme's tokens ---------- */
  var CSS = [
    '.w-world{--w-display:"Inter Tight","Inter",system-ui,sans-serif;--w-sans:"Inter",system-ui,sans-serif;--w-mono:"JetBrains Mono",ui-monospace,monospace;',
    '  --w-chip-bg:hsl(var(--canvas));background:hsl(var(--canvas));color:hsl(var(--text));font:400 13px/1.5 var(--w-sans);-webkit-font-smoothing:antialiased}',
    '.w-world *{box-sizing:border-box}',
    '.w-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}',
    '.w-deco{position:absolute;inset:0;pointer-events:none}',
    '.w-deco svg,.w-frame svg{position:absolute;display:block;overflow:hidden}',
    '.w-frame{position:absolute;inset:0}',
    '.w-corner{overflow:visible!important}',
    '.w-corner.tr{transform:scaleX(-1)}.w-corner.bl{transform:scaleY(-1)}',
    '.w-panel{--w-chip-bg:hsl(var(--surface));position:relative;isolation:isolate;min-width:0;background:hsl(var(--surface));',
    '  border:1px solid hsl(var(--border-default));border-radius:var(--w-radius,12px)}',
    '.w-panel.has-frame{border-color:transparent}',
    '.w-panel>.w-deco{z-index:0}.w-body{position:relative;z-index:1;padding:var(--w-pad,22px);height:100%;display:flex;flex-direction:column;gap:12px;min-height:0}',
    '.w-body>*{flex-shrink:0}',
    '.w-head{display:flex;align-items:center;gap:16px;min-height:28px;min-width:0}',
    '.w-head-text{margin:0;font:700 15px/1.1 var(--w-display);letter-spacing:.01em;color:hsl(var(--text-strong))}',
    '.w-fit{display:block;flex:none;overflow:visible}',
    '.w-divider{position:relative;height:20px;flex:none}.w-divider svg{position:absolute;display:block;overflow:hidden}',
    '.w-divider.is-plain{height:1px;background:var(--w-rule)}',
    '.w-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:36px;padding:0 16px;border-radius:3px;cursor:pointer;',
    '  font:500 11px/1 var(--w-mono);letter-spacing:.16em;text-transform:uppercase;text-decoration:none;white-space:nowrap;transition:background-color .15s,border-color .15s,color .15s}',
    '.w-btn.is-primary{background:hsl(var(--primary));color:hsl(var(--text-inverse));border:1px solid hsl(var(--primary))}',
    '.w-btn.is-primary:hover{background:hsl(var(--accent));border-color:hsl(var(--accent))}',
    '.w-btn.is-outline{background:none;color:hsl(var(--text-strong));border:1px solid hsl(var(--border-subtle))}',
    '.w-btn.is-outline:hover{border-color:hsl(var(--border-default));background:hsl(var(--text-strong) / .04)}',
    '.w-btn.is-outline.has-corners,.w-btn.is-outline.has-corners:hover{border-color:transparent}',   /* the corners are its border */
    '.w-btn>span:not(.w-deco){position:relative}',
    '.w-btn:focus-visible,.w-link:focus-visible,.w-world [tabindex]:focus-visible{outline:2px solid hsl(var(--accent));outline-offset:3px}',
    '.w-link{color:hsl(var(--primary));text-decoration:underline;text-decoration-color:hsl(var(--primary) / .45);text-underline-offset:4px;font:500 12px/1.2 var(--w-mono);letter-spacing:.04em}',
    '.w-link:hover{text-decoration-color:hsl(var(--primary))}',
    '.w-ring{display:inline-flex;align-items:center;min-height:30px;padding:0 12px;border-radius:3px;border:1px solid hsl(var(--border-default));color:hsl(var(--text-strong));',
    '  font:500 10.5px/1 var(--w-mono);letter-spacing:.16em;text-transform:uppercase;outline:2px solid hsl(var(--accent));outline-offset:3px}',
    '.w-tag{display:inline-flex;align-items:center;min-width:0}',
    '.w-chip{position:relative;isolation:isolate;display:inline-flex;align-items:center;gap:8px;height:26px;padding:0 12px;white-space:nowrap;',
    '  font:500 11px/1 var(--w-mono);letter-spacing:.2em;text-transform:uppercase;color:hsl(var(--text-strong))}',
    '.w-chip.is-pill{border:1px solid var(--w-cl);border-radius:999px}',
    '.w-chip.is-round{border:1px solid var(--w-cl);border-radius:4px}',
    '.w-chip.is-box{border:1px solid var(--w-cl)}',
    '.w-chip.is-notch{background:var(--w-cl);clip-path:polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))}',
    '.w-chip.is-notch::before{content:"";position:absolute;inset:1px;z-index:-1;background:var(--w-chip-bg);',
    '  clip-path:polygon(0 0,calc(100% - 7.6px) 0,100% 7.6px,100% 100%,7.6px 100%,0 calc(100% - 7.6px))}',
    '.w-chip.is-bracket{--w-b:7px;background:linear-gradient(var(--w-cl),var(--w-cl)) 0 0/var(--w-b) 1px,linear-gradient(var(--w-cl),var(--w-cl)) 0 0/1px var(--w-b),',
    '  linear-gradient(var(--w-cl),var(--w-cl)) 100% 0/var(--w-b) 1px,linear-gradient(var(--w-cl),var(--w-cl)) 100% 0/1px var(--w-b),',
    '  linear-gradient(var(--w-cl),var(--w-cl)) 0 100%/var(--w-b) 1px,linear-gradient(var(--w-cl),var(--w-cl)) 0 100%/1px var(--w-b),',
    '  linear-gradient(var(--w-cl),var(--w-cl)) 100% 100%/var(--w-b) 1px,linear-gradient(var(--w-cl),var(--w-cl)) 100% 100%/1px var(--w-b);background-repeat:no-repeat}',
    '.w-chip.is-plain{padding:0 2px;border-bottom:1px solid var(--w-rule);height:24px}',
    '.w-chip-mark{flex:none;width:5px;height:5px;background:var(--w-acc)}',
    '.w-chip.is-role{color:hsl(var(--role))}',
    '.w-chip.is-status .w-chip-mark{width:7px;height:7px;border-radius:50%;background:var(--w-state)}',
    '.w-chip.is-status.is-minted{color:hsl(var(--live))}',
    '.w-chip.is-status.is-minted .w-chip-mark{box-shadow:0 0 6px hsl(var(--live) / .8)}',
    '.w-chips{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
    '.w-emblem{display:block;flex:none;overflow:visible}',
    '.w-name{display:flex;align-items:center;gap:10px;margin:0;min-width:0;font:700 22px/1.1 var(--w-display);color:hsl(var(--text-strong));letter-spacing:.005em}',
    '.w-name>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.w-bullets{list-style:none;margin:0;padding:0;display:grid;gap:9px}',
    '.w-bullets li{display:flex;align-items:center;gap:11px;min-width:0;color:hsl(var(--text));font:400 13px/1.3 var(--w-sans)}',
    '.w-dot{flex:none;width:5px;height:5px;background:var(--w-dim)}',
    '.w-avatar{position:relative;display:block;flex:none;overflow:hidden;border-radius:4px;background:hsl(180 8% 3%);border:1px solid hsl(var(--border-default))}',
    '.w-avatar canvas,.w-banner canvas{position:absolute;inset:0;width:100%;height:100%;display:block}',
    '.w-banner{position:relative;overflow:hidden;background:hsl(180 8% 3%)}',
    '.w-row{display:flex;justify-content:space-between;gap:12px;font:400 11px/1.2 var(--w-mono);letter-spacing:.14em;text-transform:uppercase}',
    '.w-label{color:hsl(var(--text-muted))}.w-value{color:hsl(var(--text-strong));font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.w-acts{display:flex;align-items:center;gap:16px;flex-wrap:wrap}',
    /* samples: small, one element each */
    '.w-sample{position:relative;display:flex;flex-direction:column;justify-content:center;gap:6px;padding:10px;min-height:84px;border-radius:4px}',
    '.w-sample .w-panel{width:100%;min-height:64px}.w-sample .w-body{gap:2px;justify-content:center}',
    '.w-mini-name{font:700 13px/1.2 var(--w-display);color:hsl(var(--text-strong));overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.w-mini-sub{font:400 9.5px/1.2 var(--w-mono);letter-spacing:.18em;color:hsl(var(--text-muted))}',
    '.w-sample .w-head-text{font-size:14px}',
    '.w-sample .w-name{font-size:15px;gap:8px}.w-sample .w-bullets{gap:4px;padding-left:2px}.w-sample .w-bullets li{font-size:11.5px;gap:9px}',
    '.w-sample .w-btn{min-height:28px;padding:0 11px;font-size:10px}.w-sample .w-acts{gap:12px}',
    '.w-sample .w-chip{height:22px;padding:0 9px;font-size:9.5px;gap:6px}',
    '.w-sample.is-backdrop,.w-sample.is-aura,.w-sample.is-signal,.w-sample.is-particles{padding:0;overflow:hidden}',
    '.w-sample .w-banner{height:84px;border-radius:4px}',
    '.w-who{display:flex;align-items:center;gap:12px;min-width:0}',
    '.w-sample .w-divider{height:16px}',
    '@media (prefers-reduced-motion:reduce){.w-btn{transition:none}}'
  ].join('\n');
  function injectCss() {
    if (document.getElementById('defxn-world-css')) return;
    var s = el('style');
    s.id = 'defxn-world-css';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }
  injectCss();

  window.DefxnWorld = {
    SHAPES: SHAPES, theme: theme, themeWith: themeWith, dress: dress, ornament: ornament,
    panel: panel, button: button, tag: tag, badge: badge, badges: badges, chip: chip,
    header: header, divider: divider, emblem: emblem, nameLine: nameLine, bullets: bullets,
    avatar: avatar, banner: banner, sample: sample, fieldsOf: fieldsOf, family: family
  };
})();

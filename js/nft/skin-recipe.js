/* DEFXN identity card: a card as a SKIN RECIPE, in plain data, for Ark UI (skin contract v2,
   docs/home-redesign/SKIN-CONTRACT.md). No three.js, no 3D layers: Ark UI draws the chrome itself.

   DefxnSkin.tokens(traits, record)  the SDK colour tokens a card sets ("H S% L%" channels), plus the
                                     chrome colours --w-ink ... --w-state. The ONE place a palette
                                     becomes tokens: world.js and nft-engine.js call it.
   DefxnSkin.recipe(record, opts)    -> Promise of {
       version, table, dna, record (the DFXNCARD1 line, when card-record.js is loaded),
       tokens:  the tokens above, less opts.locked and the meaning tokens (MEANING),
       chrome:  { frame, corner, tag, ornament, divider, emblem }: each { name, svg, viewBox },
                with the record's fields filled in and colours left as var(--w-*) so a contrast
                fallback recolours them too. frame and divider also carry `keep`: the bands that keep
                their shape when the piece stretches (only the bands between them stretch). corner
                carries `mirror: true` (it is drawn at the top-left and mirrored),
       family:  the matched set the card wears whole ("Arcade"), or null; palette: its palette's name,
       gridLook: { params, why, notes } for the ring world (js/nft/grid-look.js, loaded before this file),
       arrival: the card's own arrival timeline (js/nft/timeline.js, loaded before this file),
       layouts: per-part layouts and rules.density, each derived from the card's own drawings,
       voice:   the headings' slot ('keep', 'sans' or 'mono'), from the frame's line; sent as --font-display,
       locks:   the token names the site locked (opts.locked), carried so Ark UI skips them too,
       rules:   { frame, edge, ornament, marker, header, layout, density } (closed sets only),
       notes:   anything left out, and why }
   DefxnSkin.rulesOf(element)        -> Promise of the rules ONE element implies (measured, cached)
   DefxnSkin.arkSkin(recipe, opts)   the recipe in the shape Ark UI's applyArkSkin takes (below)
   DefxnSkin.drawing(element)        -> Promise: the element with its drawing loaded (below)

   RULES are derived from the elements the card wears, never from its rarity. A frame is measured in
   the page: continuous edges on three or four sides make "full", only marks near the corners make
   "corners", edges on one or two sides make "bracket", a full frame with a raised or cut tab in the
   middle of its top or bottom makes "ticket". Its top-left corner gives the edge: a straight
   45-degree cut is "cut", a curve is "soft", a right angle is "square". A worn ornament gives
   ornament "strip", a worn icon marker "icon" or "index" (by its ink), a worn nameplate header "nameplate".
   Layouts and density come from the measures below. A card that wears all six pieces of one matched set (the
   "<Set> <Piece>" families, such as Arcade) reports that set as `family`.

   Needs, in order: skin-bundle.js (or the full layers-bundle.js), cards-data.js, traits.js,
   card-chrome.js (colours, fieldOf); card-record.js for the record line. All in js/nft/ but the full
   bundle, which stays with the card in docs/home-redesign/nft/. Sample data: nothing here is live. */
(function () {
  'use strict';

  var T = window.DEFXN_TRAITS, C = window.DefxnCardChrome, NS = 'http://www.w3.org/2000/svg';
  var VERSION = 1;

  /* ---------- colour ---------- */
  function rootVar(name, fallback) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback; }
  function chan(s) { var p = String(s || '').trim().split(/\s+/); return [parseFloat(p[0]) || 0, parseFloat(p[1]) || 0, parseFloat(p[2]) || 0]; }
  function hsl(c) { return +c[0].toFixed(1) + ' ' + +c[1].toFixed(1) + '% ' + +c[2].toFixed(1) + '%'; }
  function rgb(c) {
    var h = c[0] / 360, s = c[1] / 100, l = c[2] / 100;
    function f(n) { var k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }
    return [f(0), f(8), f(4)];
  }
  function luminance(c) {
    var v = rgb(c).map(function (x) { return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }
  function contrast(a, b) { return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); }

  // tokens a skin never sets: their colour says something true about the site (Ark UI meaning tokens)
  // (--reference is a role, not meaning: the SDK's deriveSkinTokens derives it with its ladder)
  // the meaning tokens and the part table live once, in js/nft/skin-package.js; recipe() loads it first
  function pkg() {
    if (!window.DefxnSkinPackage) throw new Error('The skin recipe needs js/nft/skin-package.js. recipe() loads it. A caller that skips recipe() loads it first.');
    return window.DefxnSkinPackage;
  }
  function needPackage() { return window.DefxnSkinPackage ? Promise.resolve() : T.load('js/nft/skin-package.js'); }
  // the drawings' colour names (card-chrome.js INKS): structure, meaning and the old accents get the card's colours;
  // the three roles get the site's role tokens, so a role reads the same as the site's own primary, complement, reference
  function inks() { return C.INKS; }
  var ROLE_TOKENS = { primary: 'hsl(var(--primary))', complementary: 'hsl(var(--secondary))', referential: 'hsl(var(--reference))' };

  /* ---------- tokens: the one place a palette becomes tokens ---------- */
  function tokens(traits, record) {
    record = record || {};
    var pal = (traits.picks.palette && traits.picks.palette.attrs) || {};
    var a = chan(pal.a || '0 0% 100%'), b = pal.b ? chan(pal.b) : a, c = pal.c ? chan(pal.c) : b;
    var hue = b[0], at = atmosphere(traits, b);
    function surface(l, k) { return hsl([hue, at.sat * (k == null ? 0.5 : k), at.light + l]); }
    var surfaces = { '--canvas': surface(0, 1), '--surface': surface(1.8), '--raised': surface(4.8), '--nested': surface(7.9), '--overlay': surface(3.2) };
    // text on a fill (--primary is the light, --accent the accent): near-black or white, whichever reads better on
    // the worse of the two, as Ark UI's gate checks both
    var dark = [hue, Math.min(40, b[1]), 7], fills = [luminance(b), luminance(c)];
    function worst(l) { return Math.min.apply(null, fills.map(function (f) { return contrast(f, l); })); }
    var light = [0, 0, 98], useDark = worst(luminance(dark)) >= worst(luminance(light)), inverse = hsl(useDark ? dark : light), ink = luminance(useDark ? dark : light);
    // a fill that neither reads on (Blood's two mid reds) moves its lightness away from the text, a step at a time,
    // until the text reads at 4.6:1 (4.5 and a margin for Ark UI's rounding); its hue and saturation stay the card's
    function fill(col) { var f = col.slice(); while (contrast(luminance(f), ink) < 4.6 && f[2] > 4 && f[2] < 96) f[2] += useDark ? 1 : -1; return f; }
    var fb = fill(b), fc = fill(c);
    // the text and the rules: the light's hue, faintly; a two-hue palette gives its headings and rules the accent
    var two = arc(b[0], c[0]) >= 25 && c[1] >= 20, lead = two ? c : b, lightest = luminance(chan(surfaces['--nested']));
    var vars = Object.assign(surfaces, {
      '--text-strong': at.tinted ? hsl([lead[0], Math.min(18, lead[1] * 0.2), 95]) : rootVar('--nft-ink', '0 0% 97%'),
      '--text': at.tinted ? readable([hue, Math.min(16, b[1] * 0.18)], 80, lightest, 4.6) : '0 0% 80%',
      '--text-muted': at.tinted ? readable([hue, Math.min(14, b[1] * 0.16)], 58, lightest, 4.6) : rootVar('--nft-muted', '180 2% 56%'),
      '--text-faint': at.tinted ? hsl([hue, Math.min(10, b[1] * 0.12), 42]) : '180 2% 40%', '--text-inverse': inverse,
      // --a is the tint of the 3D blocks, near white in every palette (L 82-100%). It is not a site
      // colour: as --complement and --role it told sites "white buttons, white links", and the SDK's
      // ladders seeded from it came out grey. The site's action colour (--complement) is the card's
      // accent --c; its link and control colour (--role) is the card's light --b. One-hue palettes
      // (Copper) give both the same hue; Mono gives white, which the SDK keeps as a neutral ladder.
      '--primary': hsl(fb), '--accent': hsl(fc), '--complement': hsl(fc),
      '--live': rootVar('--nft-live', '156 76% 54%'), '--role': hsl(b), '--badge': hsl(b),
      '--border-subtle': at.tinted ? hsl([hue, b[1] * 0.6, 72]) + ' / 0.09' : '0 0% 100% / 0.075',
      '--border-default': at.tinted ? hsl([hue, b[1] * 0.6, 72]) + ' / 0.2' : '0 0% 100% / 0.16',
      '--border-strong': at.tinted ? hsl([lead[0], lead[1] * 0.7, 68]) + ' / 0.5' : '0 0% 100% / 0.42'
    });
    // raised parts (menus, popovers, dialogs) cast the glow's colour, as strongly as the glow layer builds
    if (at.glow != null) vars['--theme-shadow-color'] = hsl([c[0], Math.min(72, c[1]), 5 + 21 * at.glow]);
    var colours = C.colours(record, traits);
    inks().forEach(function (k) { vars['--w-' + k] = ROLE_TOKENS[k] || colours[k]; });
    // On the card, chrome lines are white at 42%, 16% and 7.5% over its own art, and they read. On a
    // site's near-black surfaces they vanished (measured, WEAR-AUDIT.md C4). An interface draws them
    // stronger, in the same order: the main line in the card's light, the rule and the faint line in
    // white at 3:1 and below. The card itself (card.js) keeps its own inks.
    var lb2 = rgbOf(b);
    vars['--w-line'] = 'rgba(' + lb2.join(',') + ',0.86)';
    vars['--w-rule'] = 'rgba(255,255,255,0.34)';
    vars['--w-faint'] = 'rgba(255,255,255,0.18)';
    return vars;
  }
  function rgbOf(c) { return rgb(c).map(function (v) { return Math.round(v * 255); }); }
  function arc(x, y) { return Math.abs(((x - y) % 360 + 540) % 360 - 180); }
  /* The page's atmosphere, from the card's 3D layers (WEAR-AUDIT.md, loop 6, A9 A10 A12 D2). The canvas takes the
     card's light hue as strongly as its background layer builds (the grid look's hazeTint, from the census), and is
     as light as its glow layer builds (baseGlow). Surfaces hold half that colour, so content stays restrained. A
     grey palette stays grey. A layer with no census keeps the restrained values every card had before (8% at most),
     and says so in the grid look's notes. */
  var ATMOS = { base: 0.14, haze: 0.32, light: 3.6, glow: 2.4 };
  function atmosphere(traits, b) {
    var look = window.DefxnGridLook ? window.DefxnGridLook.derive(traits).params : {};
    var haze = look.hazeTint != null ? Math.min(1, look.hazeTint / 0.3) : null;
    var glow = look.baseGlow != null ? Math.max(0, Math.min(1, (look.baseGlow - 0.35) / 0.45)) : null;
    return { tinted: haze != null, glow: glow,
      sat: haze != null ? b[1] * (ATMOS.base + ATMOS.haze * haze) : Math.min(8, b[1] * 0.08),
      light: ATMOS.light + (glow != null ? ATMOS.glow * glow : 0) };
  }
  // the darkest lightness from `from` up that reads at `min`:1 on the lightest surface (Ark UI's gate checks it again)
  function readable(hs, from, lightest, min) {
    for (var l = from; l < 96; l += 1) if (contrast(luminance([hs[0], hs[1], l]), lightest) >= min) return hsl([hs[0], hs[1], l]);
    return hsl([hs[0], 0, 96]);
  }
  // the tokens a site may receive: less the meaning tokens and the product's locked list
  function siteTokens(vars, locked) {
    var out = {}, skip = pkg().MEANING.concat(locked || []);
    Object.keys(vars).forEach(function (k) { if (skip.indexOf(k) < 0) out[k] = vars[k]; });
    return out;
  }

  /* ---------- chrome as plain data ---------- */
  var VIEW = { corner: [0, 0, 120, 120], frame: [0, 0, 1000, 700], tag: [0, 0, 360, 50], ornament: [0, 0, 360, 80], divider: [0, 0, 360, 24], emblem: [0, 0, 30, 34], button: [0, 0, 200, 56] };
  var KEEP = {                               // the bands world.js keeps unstretched (keepBands)
    frame: { x: [0, 120, 380, 620, 880, 1000], y: [0, 120, 250, 450, 580, 700] },
    divider: { x: [0, 60, 150, 210, 300, 360], y: [0, 24] },
    // a button keeps its two ends and its top and bottom edge bands; its middle stretches to the label
    button: { x: [0, 24, 176, 200], y: [0, 14, 42, 56] }
  };
  var DRAWS = /<(rect|path|line|circle|ellipse|polygon|polyline|text|use|image)\b/i;

  /* ---------- drawings: in the full bundle, or one file each (the site's table) ----------
     traits.js loads a drawing the table left out (DEFXN_TRAITS.need): with the full bundle the
     drawing is there and nothing loads. */
  function drawing(element) { return T.need(element); }
  // the six drawings a card wears, loaded together
  function drawingsOf(traits) { return T.needAll(traits.picks, 'chrome'); }
  // the drawing with its fields filled in and its colours left as var(--w-*)
  function chromeData(element, record, traits) {
    if (element && element.kind === 'chrome' && element.svg == null) {
      throw new Error('The drawing of ' + element.layer + '/' + element.name + ' is not loaded yet. Call DefxnSkin.drawing(element) first, or use DefxnSkin.recipe, which loads it.');
    }
    if (!element || element.kind !== 'chrome' || !DRAWS.test(String(element.svg || ''))) return null;
    var slot = element.attrs.slot, text = String(element.svg).replace(new RegExp(C.INK_SOURCE, 'g'), 'var(--w-$1)');
    var doc = new DOMParser().parseFromString(text, 'image/svg+xml'), root = doc.documentElement;
    if (root.nodeName !== 'svg') return null;
    Array.prototype.forEach.call(root.querySelectorAll('[data-sketch],title,script'), function (n) { n.parentNode.removeChild(n); });
    // On a site the nameplate names its wearer: the first field shows the card's name and the second its
    // number. A sample's status and role ("SAMPLE", "PROTOCOL") meant nothing on a notice (WEAR-AUDIT.md
    // C12). A nameplate that spells a field one character per cell keeps its cells.
    var plate = slot === 'tag' && !root.querySelector('[data-char]'), nth = 0;
    Array.prototype.forEach.call(root.querySelectorAll('[data-field]'), function (n) {
      var f = n.getAttribute('data-field');
      if (plate) f = ['name', 'number'][nth++] || '';
      var v = f ? C.fieldOf(record, traits, f) : '', ch = n.getAttribute('data-char');
      if (plate && f === 'number' && v) v = '#' + v;
      n.textContent = ch == null ? v : (v.charAt(+ch) || '');
      n.removeAttribute('data-char');                       // used up: the character is in the text now
    });
    // Ark UI's allow-list takes no style attribute: a style becomes what it does. text-transform
    // changes the text itself; the few presentation properties become attributes of the same name.
    var PRESENT = ['fill', 'stroke', 'opacity', 'font-size', 'font-weight', 'font-family', 'letter-spacing', 'text-anchor'];
    Array.prototype.forEach.call(root.querySelectorAll('[style]'), function (n) {
      String(n.getAttribute('style')).split(';').forEach(function (decl) {
        var i = decl.indexOf(':'), k = decl.slice(0, i).trim().toLowerCase(), v = decl.slice(i + 1).trim();
        if (i < 0 || !v) return;
        if (k === 'text-transform' && v === 'uppercase') n.textContent = n.textContent.toUpperCase();
        else if (k === 'text-transform' && v === 'lowercase') n.textContent = n.textContent.toLowerCase();
        else if (PRESENT.indexOf(k) >= 0 && !n.hasAttribute(k)) n.setAttribute(k, v);
      });
      n.removeAttribute('style');
    });
    Array.prototype.forEach.call(root.querySelectorAll('[class]'), function (n) { n.removeAttribute('class'); });
    // first-party drawings only: still, no event attributes and no outside references reach the data
    Array.prototype.forEach.call(root.querySelectorAll('*'), function (n) {
      Array.prototype.slice.call(n.attributes).forEach(function (a) { if (/^on/i.test(a.name) || (/href$/i.test(a.name) && !/^#/.test(a.value))) n.removeAttribute(a.name); });
    });
    root.removeAttribute('data-slot');
    if (slot === 'frame') edgeOnly(root, VIEW.frame, FRAME.ring);
    var out = { name: element.name, svg: new XMLSerializer().serializeToString(root), viewBox: VIEW[slot] };
    if (KEEP[slot]) out.keep = KEEP[slot];
    if (slot === 'corner') out.mirror = true;
    if (slot === 'tag') out.fields = Array.prototype.map.call(root.querySelectorAll('[data-field]'), function (n) { return n.getAttribute('data-field'); });
    return out;
  }

  /* ---------- a frame for an interface keeps its edge ring ----------
     On the card a frame's middle is the art's place, and some frames draw there: a centre piece, a
     network, a field of dots. Over an interface part that middle is the part's content, so those
     drawings covered words (WEAR-AUDIT.md G1; a drawn-line check found it on the notice under all three
     samples). Ark UI's sanitizer strips clip paths, so the middle is removed as geometry: every shape
     that lies wholly inside the ring is dropped. A path made of many pieces (the squeeze joins dots) is
     split at each absolute move first, so its edge pieces stay. The card's own frame is untouched. */
  var measureHost = null;
  function edgeOnly(root, view, ring) {
    if (!measureHost) {
      measureHost = document.createElementNS(NS, 'svg');
      measureHost.setAttribute('aria-hidden', 'true');
      measureHost.setAttribute('style', 'position:absolute;left:-10000px;top:0;width:1000px;height:700px;visibility:hidden;pointer-events:none');
    }
    var W = view[2], H = view[3], x0 = ring, y0 = ring, x1 = W - ring, y1 = H - ring;
    var live = document.importNode(root, true);
    live.setAttribute('width', W); live.setAttribute('height', H);
    measureHost.textContent = '';
    measureHost.appendChild(live);
    document.body.appendChild(measureHost);
    function inside(el) {
      var b; try { b = el.getBBox(); } catch (e) { return false; }
      var m = el.getCTM && el.getCTM(), r = live.getCTM && live.getCTM();
      var pts = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]];
      if (m && r) { var k = r.inverse().multiply(m); pts = pts.map(function (p) { return [k.a * p[0] + k.c * p[1] + k.e, k.b * p[0] + k.d * p[1] + k.f]; }); }
      return pts.every(function (p) { return p[0] > x0 && p[0] < x1 && p[1] > y0 && p[1] < y1; });
    }
    // split joined paths at each absolute move, so each piece is judged on its own
    Array.prototype.slice.call(live.querySelectorAll('path')).forEach(function (path) {
      var d = path.getAttribute('d') || '';
      if (/[m]/.test(d.replace(/^\s*m/, 'M')) || (d.match(/M/g) || []).length < 2) return;
      d.split(/(?=M)/).forEach(function (piece) {
        var q = path.cloneNode(false); q.setAttribute('d', piece); path.parentNode.insertBefore(q, path);
      });
      path.parentNode.removeChild(path);
    });
    var dropped = 0;
    Array.prototype.slice.call(live.querySelectorAll('path,rect,circle,ellipse,line,polyline,polygon,text,use')).forEach(function (el) {
      if (inside(el)) { el.parentNode.removeChild(el); dropped++; }
    });
    measureHost.removeChild(live);
    if (measureHost.parentNode) measureHost.parentNode.removeChild(measureHost);
    // write the kept drawing back into the data's own root
    root.textContent = '';
    Array.prototype.slice.call(live.childNodes).forEach(function (n) { root.appendChild(document.importNode(n, true)); });
    return dropped;
  }

  /* ---------- rules, measured from the drawing ---------- */
  var ruleCache = {};
  function rasterize(svgText, w, h) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        var x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, w, h);
        resolve(x.getImageData(0, 0, w, h).data);
      };
      img.onerror = function () { resolve(null); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
    });
  }
  // every colour white; a faint glow keeps its faintness, so only the drawn line itself counts. A raw
  // element names its colours as var(--line) and the like, which an image cannot resolve: every one
  // becomes white too, or its lines would draw invisible and measure as gaps.
  function opaque(svgText) { return svgText.replace(/var\(--[a-z0-9-]+\)/g, '#fff'); }
  // the drawing at a pixel size: its own size attributes are replaced, never doubled
  function sized(svgText, W, H, stretch) {
    return opaque(svgText).replace(/<svg\b([^>]*)>/, function (m, a) {
      a = a.replace(/\s(width|height|preserveAspectRatio)="[^"]*"/g, '');
      return '<svg' + a + ' width="' + W + '" height="' + H + '"' + (stretch ? ' preserveAspectRatio="none"' : '') + '>';
    });
  }
  function frameRules(svgText) {
    var W = 1000, H = 700;
    return rasterize(opaque(svgText).replace('<svg', '<svg width="' + W + '" height="' + H + '"'), W, H).then(function (d) {
      if (!d) return { frame: 'full', edge: 'keep' };
      function lit(x, y) { return d[(y * W + x) * 4 + 3] > 60; }
      // how much of each edge band carries a line
      function cover(horizontal, from, to) {
        var hits = 0, n = 0;
        if (horizontal) for (var x = 40; x < W - 40; x += 2) { n++; for (var y = from; y < to; y++) if (lit(x, y)) { hits++; break; } }
        else for (var y2 = 40; y2 < H - 40; y2 += 2) { n++; for (var x2 = from; x2 < to; x2++) if (lit(x2, y2)) { hits++; break; } }
        return hits / n;
      }
      var top = cover(true, 0, 27), bottom = cover(true, H - 27, H), left = cover(false, 0, 27), right = cover(false, W - 27, W);
      var sides = [top, bottom, left, right], full = sides.filter(function (v) { return v > 0.6; }).length, some = sides.filter(function (v) { return v > 0.25; }).length;
      var frame = full >= 3 ? 'full' : some >= 1 ? 'bracket' : 'corners';
      // a ticket: a full frame whose top or bottom middle steps away from its edge line (a tab or a notch)
      if (frame === 'full') {
        var depth = function (y0, y1, step) { var best = -1; for (var x = 400; x < 600; x += 4) for (var y = y0; y !== y1; y += step) if (lit(x, y)) { best = Math.max(best, Math.abs(y - y0)); break; } return best; };
        var edgeDepth = function (y0, y1, step) { var v = []; [80, 160, 840, 920].forEach(function (x) { for (var y = y0; y !== y1; y += step) if (lit(x, y)) { v.push(Math.abs(y - y0)); break; } }); return v.length ? Math.min.apply(null, v) : -1; };
        var tTop = depth(0, 60, 1), eTop = edgeDepth(0, 60, 1), tBot = depth(H - 1, H - 61, -1), eBot = edgeDepth(H - 1, H - 61, -1);
        if ((tTop >= 0 && eTop >= 0 && Math.abs(tTop - eTop) > 6) || (tBot >= 0 && eBot >= 0 && Math.abs(tBot - eBot) > 6)) frame = 'ticket';
      }
      // the top-left corner's shape: the leftmost drawn pixel of each row near the corner
      var profile = [], y0 = -1;
      for (var y = 0; y < 90; y++) { var fx = -1; for (var x = 0; x < 90; x++) if (lit(x, y)) { fx = x; break; } if (fx >= 0 && y0 < 0) y0 = y; if (y0 >= 0) profile.push(fx); }
      // the corner's span: from the first drawn row to the row where the side line settles. Inside it,
      // a straight run is a cut and a bending run is a curve; no span at all is a right angle.
      var edge = 'keep';
      if (profile.length > 24 && profile[0] >= 0 && profile.every(function (v, i) { return i > 40 || v >= 0; })) {
        var z = profile[Math.min(40, profile.length - 1)], t = 0;
        while (t < profile.length && profile[t] > z + 1) t++;
        if (t <= 2) edge = 'square';
        else {
          var a0 = profile[0], mid = profile[Math.floor(t / 2)], end = profile[t];
          edge = Math.abs(mid - (a0 + end) / 2) <= Math.max(1.5, t * 0.08) ? 'cut' : 'soft';
        }
      }
      // the frame's inner margin: how far its innermost parallel line sits inside its outer line, at the
      // middle of the top and the left side (0 when the frame is one line)
      function inset(horizontal) {
        var first = -1, last = -1, on = false;
        for (var k = 0; k < 200; k++) {
          var v = horizontal ? lit(500, k) : lit(k, 350);
          if (v && !on) { if (first < 0) first = k; last = k; }
          on = v;
        }
        return first < 0 ? 0 : last - first;
      }
      return { frame: frame, edge: edge, inset: Math.max(inset(true), inset(false)) };
    });
  }
  // the ink of a drawing: its columns' ink along its length, at a width and a height
  function columns(svgText, W, H) {
    return rasterize(sized(svgText, W, H, true), W, H).then(function (d) {
      if (!d) return null;
      var col = [];
      for (var x = 0; x < W; x++) { var c = 0; for (var y = 0; y < H; y++) if (d[(y * W + x) * 4 + 3] > 60) c++; col.push(c); }
      return col;
    });
  }
  // a strip's repetition: the best self-match of its ink at a shift of 4 to 30% of its length
  function stripRules(svgText) {
    var W = 720, H = 160;
    return columns(svgText, W, H).then(function (col) {
      if (!col) return { ornament: 'strip', period: 0, ink: 0 };
      var mean = col.reduce(function (a, b) { return a + b; }, 0) / W, v = col.map(function (c) { return c - mean; });
      var den = v.reduce(function (a, b) { return a + b * b; }, 0) || 1, best = 0;
      for (var lag = Math.round(W * 0.04); lag < W * 0.3; lag++) { var t = 0; for (var x = 0; x + lag < W; x++) t += v[x] * v[x + lag]; best = Math.max(best, t / den); }
      return { ornament: 'strip', period: +best.toFixed(2), ink: +(mean / H).toFixed(3) };
    });
  }
  // a divider's pattern: unbroken, broken into segments, or capped with heavier ends
  function dividerRules(svgText) {
    var W = 720, H = 48;
    return columns(svgText, W, H).then(function (col) {
      if (!col) return { divider: 'line' };
      var mid = col.slice(W * 0.2, W * 0.8), ends = col.slice(0, W * 0.1).concat(col.slice(W * 0.9));
      var cont = mid.filter(function (c) { return c > 0; }).length / mid.length;
      var mm = mid.reduce(function (a, b) { return a + b; }, 0) / mid.length, em = ends.reduce(function (a, b) { return a + b; }, 0) / ends.length;
      return { divider: cont < DIVIDE.broken ? 'segmented' : em / (mm || 0.01) > DIVIDE.capped ? 'capped' : 'line' };
    });
  }
  // an icon's weight: the share of its box it inks
  function iconRules(svgText) {
    var W = 90, H = 102;
    return rasterize(sized(svgText, W, H, false), W, H).then(function (d) {
      if (!d) return { marker: 'icon' };
      var lit = 0; for (var i = 3; i < d.length; i += 4) if (d[i] > 60) lit++;
      return { marker: lit / (W * H) > ICON.heavy ? 'index' : 'icon', iconInk: lit / (W * H) };
    });
  }
  /* The cut points, measured over every element on 2026-10-24 (WEAR-AUDIT.md, loop 1). Each splits its
     layer near a third, so no one class takes almost every card again: an icon heavier than the upper
     third (22% ink) marks with a count; a divider with less than 90% of its middle inked is broken;
     one whose ends carry 1.38 times its middle's ink is capped; a strip that matches itself above 0.73 at
     a shift repeats; a frame whose inner line sits 8 px or more inside it is airy. */
  var ICON = { heavy: 0.22 }, DIVIDE = { broken: 0.9, capped: 1.38 }, STRIP = { repeats: 0.73, heavy: 0.058 }, FRAME = { airy: 8, ring: 120 };
  /* The heading voice, from the frame's own line (WEAR-AUDIT.md, loop 6, E3 D13 B11). The share of the edge ring's
     length that curves, measured over all 123 frames on 2026-10-24: a third of them curve less than 0.009 (32 not
     at all) and a third more than 0.036. A straight, cut line speaks in the site's mono, a mixed line in its sans, a
     curving line keeps its display serif. The voice is one of the site's three slots, never a new face. */
  var VOICE = { sans: 0.009, display: 0.036 };
  /* The type that Ark UI 0.2.21 lets a card reach, each from a measure of the card's own drawings (loop 6):
     - the nameplate's letter spacing (em of its own size; over 75 nameplates the thirds fall at 0.138 and 0.2)
       becomes the eyebrow's spacing (the card's small label is the site's small label), and sets the headings'
       spacing: a tight nameplate tightens them, an open one opens them, the middle third keeps the site's;
     - the icon's ink (over 77 icons the lower third ends at 0.106; the heavy cut is the marker's 0.22) sets the
       headings' weight: a light icon 500, a heavy one 700, the middle keeps the site's 600;
     - numbers take the mono face, as every card face writes its own numbers;
     - the edge rule sets the focus ring's corner: soft is round, square and cut are sharp.
     Case is not sent: 131 of 132 nameplate words are upper case, so no card decides it. */
  var TRACK = { tight: 0.138, open: 0.2 }, INK = { light: 0.106 };
  // the nameplate's letter spacing, in em of its own font size (its first text with a size)
  function trackOf(svgText) {
    var m = /<text\b[^>]*>/.exec(svgText);
    if (!m) return null;
    var size = /font-size="([\d.]+)"/.exec(m[0]), ls = /letter-spacing="(-?[\d.]+)"/.exec(m[0]);
    return size ? (ls ? parseFloat(ls[1]) : 0) / parseFloat(size[1]) : null;
  }
  function typeTokens(m, rules) {
    var t = { '--font-numeric': 'var(--font-mono)' };
    if (m.track != null) {
      t['--type-eyebrow-tracking'] = Math.max(0.04, Math.min(0.32, m.track)).toFixed(3) + 'em';
      if (m.track < TRACK.tight) t['--type-heading-tracking'] = '-0.035em';
      else if (m.track > TRACK.open) t['--type-heading-tracking'] = '0.02em';
    }
    if (m.iconInk != null) {
      if (m.iconInk < INK.light) t['--type-heading-weight'] = '500';
      else if (m.iconInk > ICON.heavy) t['--type-heading-weight'] = '700';
    }
    if (rules.edge === 'soft') t['--focus-radius'] = '10px';
    else if (rules.edge === 'square' || rules.edge === 'cut') t['--focus-radius'] = '0px';
    return t;
  }
  function voiceOf(curve) { return curve == null ? 'keep' : curve >= VOICE.display ? 'keep' : curve >= VOICE.sans ? 'sans' : 'mono'; }
  // the share of a drawing's line length that curves: turns of 0.4 to 25 degrees per 2 units; a sharper turn is a corner
  function curveOf(svgText) {
    if (!svgText || typeof document === 'undefined') return null;
    var host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.setAttribute('style', 'position:absolute;left:-10000px;top:0;width:1000px;height:700px;visibility:hidden;pointer-events:none');
    host.innerHTML = svgText;
    document.body.appendChild(host);
    var curved = 0, straight = 0;
    Array.prototype.forEach.call(host.querySelectorAll('path,line,polyline,polygon,rect,circle,ellipse'), function (g) {
      var len = 0; try { len = g.getTotalLength(); } catch (e) { return; }
      if (!(len > 0)) return;
      var prev = null, pp = g.getPointAtLength(0), n = Math.floor(len / 2);
      for (var i = 1; i <= n; i++) {
        var p = g.getPointAtLength(i * 2), dir = Math.atan2(p.y - pp.y, p.x - pp.x);
        if (prev != null) { var t = Math.abs(dir - prev); if (t > Math.PI) t = 2 * Math.PI - t; t = t * 180 / Math.PI; if (t > 0.4 && t < 25) curved += 2; else straight += 2; }
        prev = dir; pp = p;
      }
    });
    host.parentNode.removeChild(host);
    return curved + straight ? curved / (curved + straight) : null;
  }
  function rulesOf(element) {
    if (!element) return Promise.resolve({});
    var k = element.layer + '/' + element.name;
    if (ruleCache[k]) return ruleCache[k];
    if (element.kind === 'chrome' && element.svg == null) return (ruleCache[k] = drawing(element).then(function () { delete ruleCache[k]; return rulesOf(element); }));
    var draws = element.kind === 'chrome' && DRAWS.test(String(element.svg || '')), p;
    if (element.layer === 'frame') {
      // a frame may DECLARE its rules (data-rule-frame, data-rule-edge on its root) where the
      // measurement reads it wrong; docs/home-redesign/nft/make-layers.mjs checks the values against the closed sets
      var declared = {};
      if (element.attrs && element.attrs.ruleFrame) declared.frame = element.attrs.ruleFrame;
      if (element.attrs && element.attrs.ruleEdge) declared.edge = element.attrs.ruleEdge;
      var measured = !draws ? Promise.resolve({ frame: 'none', edge: 'keep' })
        : declared.frame && declared.edge ? Promise.resolve({})
        : frameRules(String(element.svg).replace(/var\(--[a-z0-9]+\)/g, 'var(--w-ink)'));
      p = measured.then(function (m) { return Object.assign({}, m, declared); });
    } else if (element.layer === 'ornament') p = draws ? stripRules(String(element.svg)) : Promise.resolve({ ornament: 'none', period: 0, ink: 0 });
    else if (element.layer === 'emblem') p = draws ? iconRules(String(element.svg)) : Promise.resolve({ marker: 'none' });
    else if (element.layer === 'divider') p = draws ? dividerRules(String(element.svg)) : Promise.resolve({ divider: 'none' });
    else if (element.layer === 'tag') p = Promise.resolve({ header: draws ? 'nameplate' : 'none', track: draws ? trackOf(String(element.svg)) : null });
    else p = Promise.resolve({});
    return (ruleCache[k] = p);
  }

  // the matched set a card wears whole, if any: six chrome pieces named "<Set> <Piece>"
  var PIECE = { corner: 'Corner', frame: 'Frame', tag: 'Tag', ornament: 'Strip', divider: 'Rule', emblem: 'Sigil' };
  function familyOf(picks) {
    var name = null;
    for (var layer in PIECE) {
      var e = picks[layer], m = e && e.name.match(new RegExp('^(.+) ' + PIECE[layer] + '$'));
      if (!m || (name && m[1] !== name)) return null;
      name = m[1];
    }
    return name;
  }

  /* ---------- each card's own structure, from its own drawings ----------
     density: a frame with an inner line well inside it gives room (airy); a one-line frame with a heavy
     strip packs things close (compact). layouts, per part, each from the piece that part shows most:
     the frame's shape for cards and dialogs, the divider's pattern for tabs, the strip's repetition for
     menus. Every value is one of Ark UI's closed sets (design/ark-ui/SKINS.md). */
  function densityOf(m) {
    if ((m.inset || 0) >= FRAME.airy) return 'airy';
    if (!(m.inset > 0) && (m.ink || 0) > STRIP.heavy) return 'compact';
    return 'keep';
  }
  function layoutsOf(m) {
    var repeats = (m.period || 0) > STRIP.repeats, strip = m.ornament === 'strip';
    return {
      CARD: m.frame === 'ticket' ? 'ticket' : m.frame === 'full' ? 'framed' : m.frame === 'none' ? 'keep' : 'plain',
      MODAL: m.frame === 'bracket' ? 'sheet' : 'centered',
      TABSLIST: m.divider === 'segmented' ? 'pills' : m.divider === 'capped' ? 'rail' : m.divider === 'line' ? 'underline' : 'keep',
      MEGAMENUPANEL: repeats ? 'tiles' : strip ? 'columns' : 'list',
      POPOVER: repeats ? 'tiles' : 'list',
      LIST: repeats ? 'tiles' : 'list'
    };
  }

  /* ---------- the recipe ---------- */
  function recipe(record, opts) {
    opts = opts || {};
    var traits = T.pick(record), picks = traits.picks, notes = [], vars = tokens(traits, record), chrome = {};
    if (traits.review && !traits.review.ok) notes.push('The worn mix has a held element or a clashing pair: a site should not apply it.');
    if (traits.takenBy) notes.push('Another genesis number was born with the worn mix: a site should not apply it.');
    return needPackage().then(function () { return drawingsOf(traits); }).then(function () {
      // keyed by the interface names Ark UI takes (frame, corner, nameplate, accent-strip, divider, icon)
      Object.keys(PIECE).forEach(function (slot) { chrome[T.uiName(slot)] = chromeData(picks[slot], record, traits); });
      // the wear-only pieces (layers/worn/): only when the card wears one, so a born card sends none
      (T.WORN || []).forEach(function (l) { if (picks[l.key]) chrome[T.uiName(l.key)] = chromeData(picks[l.key], record, traits); });
      return Promise.all(['frame', 'ornament', 'emblem', 'tag', 'divider'].map(function (l) { return rulesOf(picks[l]); }));
    }).then(function (parts) {
      var m = {};
      parts.forEach(function (r) { Object.keys(r).forEach(function (k) { m[k] = r[k]; }); });
      var rules = { frame: m.frame || 'none', edge: m.edge || 'keep', ornament: m.ornament || 'none', marker: m.marker || 'none',
        header: m.header || 'none', layout: 'keep', density: densityOf(m),
        // a worn button draws every control's outline (Ark UI's button rule; only control parts take it)
        button: picks.button ? 'drawn' : 'none' };
      var layouts = layoutsOf(m);
      var frame = chrome[T.uiName('frame')], curve = frame ? curveOf(frame.svg) : null, voice = voiceOf(curve);
      if (voice !== 'keep') vars['--font-display'] = 'var(--font-' + voice + ')';
      var type = typeTokens(m, rules);
      Object.keys(type).forEach(function (k) { vars[k] = type[k]; });
      var R = window.DefxnCardRecord;
      return {
        version: VERSION, table: window.DEFXN_LAYERS_TABLE || '', dna: traits.dna,
        record: R ? R.of(record, traits) : '',
        family: familyOf(picks), palette: picks.palette ? picks.palette.name : '', locks: (opts.locked || []).slice(),
        tokens: siteTokens(vars, opts.locked), chrome: chrome, rules: rules, layouts: layouts,
        // the ring world's look while this card is worn (js/nft/grid-look.js; docs/home-redesign/GRID-LOOK.md)
        gridLook: window.DefxnGridLook ? window.DefxnGridLook.derive(traits) : null,
        // the card's own arrival when it is put on (js/nft/timeline.js): it ends, and skips under reduced motion
        arrival: window.DefxnTimeline ? window.DefxnTimeline.arrival({ picks: picks, rules: rules }) : null,
        voice: voice,
        measures: { inset: m.inset || 0, period: m.period || 0, ink: m.ink || 0, divider: m.divider || 'none', curve: curve == null ? null : Math.round(curve * 1000) / 1000,
          track: m.track == null ? null : Math.round(m.track * 1000) / 1000, iconInk: m.iconInk == null ? null : Math.round(m.iconInk * 1000) / 1000 }, notes: notes
      };
    });
  }

  /* ---------- the recipe in Ark UI's shape ----------
     applyArkSkin(root, { name, tokens, chrome, rules }, { locks }) keys rules by part. A card's rule
     set is one flat set; PART_RULES says which of its rules each part wears. layout and density are
     never sent: they stay "keep" until the owner reviews the sets. opts.parts limits the parts;
     opts.derive is the SDK's deriveSkinTokens, and its tokens (--reference and its ladder,
     --secondary, --border-control) join the card's own, so every caller derives them one way. */

  /* opts.keys: send the card's whole rule set to every part key given (Ark UI's arkSkinPartKeys() and its
     block parts), with each part's own layout. Ark UI's kind table then decides what each part takes, and
     reports what it skipped, so each card brings all of its own rules (WEAR-AUDIT.md, loop 1). */
  // one copy of how a card's rules reach Ark UI's parts: js/nft/skin-package.js (loaded before this file)
  function arkSkin(recipe, opts) { return pkg().toArkSkin(recipe, opts); }

  /* three SAMPLE cards for a coverage page (skin contract v2): call recipe() on each, by path, live.
     A plain born card, a card that wears a skin over its birth, and a card that wears a whole set. */
  function samples() {
    var a = T.sampleRecord(27), b = T.sampleRecord(263), c = T.sampleRecord(512);
    b.skin = 'palette:Copper|aura:Orbit|corner:Bevel';
    c.skin = 'palette:Glass|corner:Arcade Corner|frame:Arcade Frame|tag:Arcade Tag|ornament:Arcade Strip|divider:Arcade Rule|emblem:Arcade Sigil';
    return [a, b, c];
  }

  window.DefxnSkin = {
    get MEANING() { return pkg().MEANING; }, get PART_RULES() { return pkg().PART_RULES; }, needPackage: needPackage,
    samples: samples, arkSkin: arkSkin,
    VERSION: VERSION, tokens: tokens, siteTokens: siteTokens, recipe: recipe, rulesOf: rulesOf, familyOf: familyOf,
    chromeData: chromeData, drawing: drawing, drawingsOf: drawingsOf, colour: { chan: chan, hsl: hsl, rgb: rgb, luminance: luminance, contrast: contrast, rootVar: rootVar }
  };
})();

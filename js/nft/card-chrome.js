/* DEFXN identity card: the CHROME helpers, shared by the card and by any site that wears its skin.
   A chrome element is a flat SVG drawing (a corner, the frame, a tag, an ornament, the divider, the
   footer emblem). These helpers fill in its colours and its record fields exactly as the card draws
   them, so a site and the card cannot disagree.

   DefxnCardChrome.fieldOf(record, traits, field)   the text a data-field shows ("name", "dna"...)
   DefxnCardChrome.colours(record, traits)          the chrome colours: every name in INKS
   DefxnCardChrome.INKS, INK_SOURCE                 the colour names a drawing may write as var(--name), and the
                                                    regular expression source that finds them (one list, read by
                                                    the card, the skin recipe and the world page)
   DefxnCardChrome.chromeSvg(element, record, traits) the element's SVG, colours and fields filled in
   DefxnCardChrome.fill(element, record, traits, colours) the same, with colours given
   DefxnCardChrome.isLive(status), shortId(id)

   The card (docs/home-redesign/nft/card.js) draws with these; the skin recipe (skin-recipe.js) reads
   fieldOf and colours. Needs nothing else. Sample data: nothing here is live.
   The file is ASCII only (other characters are written as \u escapes), so it reads the same in a page
   with any charset. */
(function () {
  'use strict';

  function isLive(status) { return String(status || '').trim().toLowerCase() === 'minted'; }
  // a full identity is cut to the reference's shape (0x6D4...F0C8); a short one is shown as given
  function shortId(id) {
    id = String(id || '');
    if (id.length <= 14 || /\.\.\.|\u2026/.test(id)) return id;
    var head = /^0x/i.test(id) ? 5 : 3;
    return id.slice(0, head) + '...' + id.slice(-4);
  }
  function rgba(ch, a) {                     // "0 0% 97%" -> "rgba(...)"
    var p = String(ch || '0 0% 100%').trim().split(/\s+/), h = (parseFloat(p[0]) || 0) / 360, s = (parseFloat(p[1]) || 0) / 100, l = (parseFloat(p[2]) || 0) / 100;
    function f(n) { var k = (n + h * 12) % 12, q = s * Math.min(l, 1 - l); return Math.round((l - q * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255); }
    return 'rgba(' + f(0) + ',' + f(8) + ',' + f(4) + ',' + a + ')';
  }
  function cssVar(node, name, fallback) { return getComputedStyle(node).getPropertyValue(name).trim() || fallback; }
  /* The colours a drawing may name (layers/README.md). Structure: ink, dim, line, faint, rule. Meaning: state (locked).
     Role (the design laws 71 to 77): primary, complementary, referential. A stroke that names a role takes that role's
     colour wherever it is drawn: on the card the palette's, on a site the site's role token (skin-recipe.js).
     acc and acc2 are the names drawings used before roles; they keep their exact colours (acc is the palette's
     accent, the complementary hue; acc2 the light, the primary hue). */
  var INKS = ['ink', 'dim', 'line', 'faint', 'rule', 'state', 'primary', 'complementary', 'referential', 'acc2', 'acc'];
  var INK_SOURCE = 'var\\(--(' + INKS.join('|') + ')\\)';
  // the colours a chrome drawing may name, as var(--ink) and so on (layers/README.md)
  function colours(record, traits) {
    var root = document.documentElement, pal = (traits.picks.palette && traits.picks.palette.attrs) || {};
    var ink = cssVar(root, '--nft-ink', '0 0% 97%'), muted = cssVar(root, '--nft-muted', '180 2% 56%'), line = cssVar(root, '--nft-line', '0 0% 100%');
    return {
      ink: rgba(ink, 1), dim: rgba(muted, 1), line: rgba(line, 0.42), faint: rgba(line, 0.075), rule: rgba(line, 0.16),
      acc: rgba(pal.c || ink, 1), acc2: rgba(pal.b || ink, 1),
      // on the card the roles are the palette's own colours: the light is the card's identity, the accent its contrast,
      // and a reference is the light held back (the palette has two hues; --a is the 3D blocks' near-white tint)
      primary: rgba(pal.b || ink, 1), complementary: rgba(pal.c || ink, 1), referential: rgba(pal.b || ink, 0.72),
      state: isLive((record || {}).status) ? rgba(cssVar(root, '--nft-live', '156 76% 54%'), 1) : rgba(muted, 1)
    };
  }
  function fieldOf(record, traits, f) {
    var t = record.tagline || [];
    switch (f) {
      case 'identity': return shortId(record.identity);
      case 'name': return String(record.name || '').toLowerCase();
      case 'tagline1': return String(t[0] || '').toUpperCase();
      case 'tagline2': return String(t[1] || '').toUpperCase();
      case 'dna': return traits.dna.split('-').join('\u00b7');   // a middle dot
      case 'number': return traits.number ? String(traits.number) : '';
      case 'mark': return traits.picks.mark ? traits.picks.mark.name.toUpperCase() : '';
      case 'palette': return traits.picks.palette ? traits.picks.palette.name.toUpperCase() : '';
    }
    return String(record[f] == null ? '' : record[f]).toUpperCase();
  }
  function fill(element, record, traits, cols) {
    var text = String(element.svg || '').replace(new RegExp(INK_SOURCE, 'g'), function (m, k) { return cols[k]; });
    var doc = new DOMParser().parseFromString(text, 'image/svg+xml'), root = doc.documentElement;
    if (root.nodeName !== 'svg') { console.error('Chrome ' + element.file + ' is not a valid SVG: fix the file in layers/ and run make-layers.mjs.'); return null; }
    Array.prototype.forEach.call(root.querySelectorAll('[data-sketch],title'), function (n) { n.parentNode.removeChild(n); });
    // data-field fills in a record field; data-char="n" keeps only its n-th character (0 is the first)
    Array.prototype.forEach.call(root.querySelectorAll('[data-field]'), function (n) {
      var v = fieldOf(record, traits, n.getAttribute('data-field')), ch = n.getAttribute('data-char');
      n.textContent = ch == null ? v : (v.charAt(+ch) || '');
    });
    var svg = document.importNode(root, true);
    svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    svg.setAttribute('preserveAspectRatio', 'none');
    return svg;
  }
  // one chrome element drawn for any UI piece outside the card: exactly as the card draws it
  function chromeSvg(element, record, traits) { return fill(element, record, traits, colours(record, traits)); }

  window.DefxnCardChrome = { INKS: INKS.slice(), INK_SOURCE: INK_SOURCE, fieldOf: fieldOf, colours: colours, chromeSvg: chromeSvg, fill: fill, isLive: isLive, shortId: shortId };
})();

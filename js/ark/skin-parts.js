/* =====================================================================
   THE SITE'S PART MAP FOR SKINS (DefxnSkinParts)
   ---------------------------------------------------------------------
   An NFT skin reaches a part of the page through Ark UI's part names (data-ark-part, the style-schema
   keys in design/ark-ui/ark-ui.components.ts). Ark UI's own primitives stamp them already. The site's
   hand-built pieces do not: the navbar and its Products mega dropdown (js/resolvers/header.js), the
   all-pages menu layer, the redesign's rail and sheets. This file is the one place that says which
   Ark UI part each of those is (docs/home-redesign/SKIN-CONTRACT.md, section 2).

   Why a map here and not attributes in header.js: header.js ships on every route and is held to a
   gzip budget (tests/header-ark-parts.cjs), so it cannot grow by a byte; this file loads only when a
   skin is applied. A part already named by Ark UI is never renamed.

   mark(root) names the parts under root and returns the undo. watch(root) also names parts that
   mount later (the mega dropdown and the popovers build on first press) and returns a stop function.
   LOCKS are the tokens a skin may never set on this site (the product lock list in the contract). */
var DefxnSkinParts = (function () {
  'use strict';

  /* selector -> Ark UI part key; first match wins, so the more specific rows come first */
  var PARTS = [
    ['header.ark-header', 'MENUBAR'],
    ['header.ark-header nav', 'NAVMENU'],
    ['.ark-cta, .cta:not(.quiet)', 'PRIMARY|BUTTON'],
    ['.cta.quiet', 'SECONDARY|BUTTON'],
    ['.header-account-link', 'GHOST|BUTTON'],
    ['.header-products-toggle, .header-chain-trigger, .nav-layer-back', 'BUTTON'],
    ['.ark-link, .nav-route-link, .products-mega-link, .products-mega-all, .products-mega-how', 'LINK'],
    ['.header-chain-popover, .nav-layer', 'POPOVER'],
    ['.nav-layer-body', 'LIST'],
    ['.nav-layer-choice', 'ITEM'],
    ['.products-mega', 'MEGAMENUPANEL'],
    ['.products-mega-primary, .products-mega-more', 'MEGAMENUCOLUMN'],
    ['.products-mega-feature, .rx-fleet, .rx-focus, .intro-card', 'CARD'],
    ['.products-mega-heading, .nav-layer-title', 'HEADING|TEXT'],
    ['.sheet', 'PANEL'],
    ['.rail', 'ASIDE'],
    ['.tabs', 'TABSLIST'],
    ['.tabs [role="tab"]', 'TABSTRIGGER']
  ];
  /* never skinned here: meaning, the chain kinds, the networks, the record descent's light */
  var LOCKS = ['--live', '--trust', '--drift', '--warning', '--danger', '--hidden', '--success',
    '--chain-identity', '--chain-resolver', '--chain-token', '--chain-pool', '--chain-ledger',
    '--net-fxn', '--net-deark', '--net-cr3tv', '--ember'];
  /* The site's one table of which part wears which of the card's elements (the owner: "some elements of skins should
     require their own rules when applied to UI"). A card wears one flat rule set (frame, edge, ornament, marker,
     header); this says which of them each part takes. A part not named here wears nothing. Ark UI still decides what a
     part's kind can take (its family table) and reports what it skipped. The CMS skin lab edits this table as content
     (policy() below); these are its defaults.
     A dense navbar and its mega dropdown take a frame and an edge, never strips, tags or list markers that would crowd
     them; the reading panels may carry more. */
  var ALLOW = {
    MEGAMENUPANEL: ['frame', 'edge', 'ornament'],
    POPOVER: ['frame', 'edge'],   /* Ark UI dresses the popover's panel, never its wrapper, and a cut edge clips nothing (0.2.20) */
    CARD: ['frame', 'edge'],
    PANEL: ['frame', 'edge', 'ornament', 'header'],
    MODAL: ['frame', 'edge', 'header'],   /* the signing review (ArkUI.authorizationDialog) */
    BUTTON: ['edge'], 'PRIMARY|BUTTON': ['edge'], 'SECONDARY|BUTTON': ['edge'], 'GHOST|BUTTON': ['edge'],
    LIST: ['marker'], SEPARATOR: ['ornament'],
    /* Ark UI's block parts, the blocks every page is built from (Ark UI 0.2.20, ARK_SKIN_BLOCK_PARTS). Named in upper case
       with no hyphen, one spelling for the site and the CMS policy: tabs-list is TABSLIST, section-header SECTIONHEADER.
       Ark UI decides where each element sits on its kind (SKINS.md); this says which kinds this site lets them reach. */
    HERO: ['ornament'], SECTIONHEADER: ['ornament'],                       /* the strip after the page's title and each section title */
    HEROMETA: ['ornament'], TABSLIST: ['ornament'], PAGER: ['ornament'],   /* the divider piece on their rule lines */
    LISTROW: ['ornament'], FACT: ['ornament'],
    /* A callout wears the tag strip and a figure its frame again: Ark UI now keeps a tag on its part, never stretches a
       piece's words, and takes back a decoration that would cover text or a control (a full frame falls back to its
       corners), with the reason in its report. Before that, the tag covered the tab strip on /account and the
       figure's frame line ran through its label. */
    ALERT: ['frame', 'edge', 'header'],
    STAT: ['frame', 'edge'], FIGUREFRAME: ['frame', 'edge'], LISTEMPTY: ['frame', 'edge'], TERMTIP: ['frame', 'edge'],
    TABSCONTENT: ['edge'], DISCLOSUREPANEL: ['edge'], ACCORDIONCONTENT: ['edge'],
    LISTROWS: ['marker']                                                   /* one emblem before each row of a list */
  };
  /* The card's flat rule set, given to each part this table (or a policy's) names, cut to the rules it allows.
     `keep` is the part's own arrangement, so it is not sent: layout and density stay the part's until the owner
     reviews the whole sets (the contract's open question 1). */
  function rulesFor(cardRules, allowMap) {
    var out = {}, map = allowMap || ALLOW;
    Object.keys(map).forEach(function (part) {
      var kept = {};
      map[part].forEach(function (k) { var v = cardRules && cardRules[k]; if (v && v !== 'keep' && v !== 'none') kept[k] = v; });
      if (Object.keys(kept).length) out[part] = kept;
    });
    return out;
  }
  /* The CMS's skin policy (js/content/skin-policy.js, ArkSkinPolicy; edited in the CMS skin lab) is content over these
     defaults: { allow: { PART: [rule keys] }, families: { family: { allow: {...} } }, contrast: [{ fg, bg, min }] }.
     Its allow replaces a part's list here, and a card family's replaces both for that family's cards. Its contrast
     rules are ADDED: a policy can raise the floor, never lower the site's own. `given` is a draft policy (the CMS
     preview); otherwise the published one, if loaded. */
  function policy(given, family) {
    var p = given || (typeof ArkSkinPolicy !== 'undefined' && ArkSkinPolicy.get ? ArkSkinPolicy.get() : null) || {};
    var allow = {}, fam = family && p.families && p.families[family];
    [ALLOW, p.allow, fam && fam.allow].forEach(function (layer) { Object.keys(layer || {}).forEach(function (part) { allow[part] = layer[part].slice(); }); });
    return { allow: allow, contrast: CONTRAST.concat(p.contrast || []) };
  }
  /* a recipe's per-part rules, cut down to what this site allows (or what `allowMap`, a policy's, allows) */
  function limit(rules, allowMap) {
    var out = {}, map = allowMap || ALLOW;
    Object.keys(rules || {}).forEach(function (part) {
      var allow = map[part], r = rules[part], kept = {};
      Object.keys(r).forEach(function (k) { if (!allow || allow.indexOf(k) >= 0) kept[k] = r[k]; });
      if (Object.keys(kept).length) out[part] = kept;
    });
    return out;
  }
  /* the site's small-text rule (tests/theme-color-contrast.cjs): every text level on the canvas and on a surface
     at 4.5:1. A skin is held to it too, so a card can never make the site's labels harder to read than the site
     allows. tests/skin-parts.cjs fails if the theme test's rule and this one part ways.
     The second rule is the mega dropdown's own backgrounds (css/resolutions.css): its labels sit on the --primary-100
     glow (.products-mega-body), and a hovered or focused feature card turns --reference-100, which the SDK derives
     from the card's hue. With the first rule alone, the product labels read 4.43 to 4.47:1 on the glow (rendered
     pixels, 1440x900) and 4.47 to 4.50:1 on the focused card, under the three samples. */
  var CONTRAST = [
    { fg: ['--text-strong', '--text', '--text-muted', '--text-faint'], bg: ['--canvas', '--surface'], min: 4.5 },
    { fg: ['--text-strong', '--text', '--text-muted', '--text-faint'], bg: ['--primary-100', '--reference-100'], min: 4.5 }
  ];
  var MARK = 'data-defxn-part';   /* who named it: this map, so undo removes only what it added */

  function name(el, added) {
    if (el.hasAttribute('data-ark-part')) return;
    for (var i = 0; i < PARTS.length; i++) {
      if (el.matches(PARTS[i][0])) { el.setAttribute('data-ark-part', PARTS[i][1]); el.setAttribute(MARK, ''); added.push(el); return; }
    }
  }
  function sweep(node, added) {
    if (node.nodeType !== 1) return;
    name(node, added);
    var all = node.querySelectorAll(PARTS.map(function (p) { return p[0]; }).join(','));
    for (var i = 0; i < all.length; i++) name(all[i], added);
  }
  function undoOf(added) {
    return function () { added.forEach(function (el) { if (el.hasAttribute(MARK)) { el.removeAttribute('data-ark-part'); el.removeAttribute(MARK); } }); added.length = 0; };
  }
  function mark(root) { var added = []; sweep(root || document.body, added); return undoOf(added); }
  /* parts that mount after the skin lands: one observer, child lists only, stopped with the skin */
  function watch(root) {
    var added = [], target = root || document.body;
    sweep(target, added);
    var obs = new MutationObserver(function (records) {
      records.forEach(function (r) { for (var i = 0; i < r.addedNodes.length; i++) sweep(r.addedNodes[i], added); });
    });
    obs.observe(target, { childList: true, subtree: true });
    var undo = undoOf(added);
    return function () { obs.disconnect(); undo(); };
  }

  return { PARTS: PARTS, LOCKS: LOCKS, ALLOW: ALLOW, CONTRAST: CONTRAST, policy: policy, rulesFor: rulesFor, limit: limit, mark: mark, watch: watch };
})();
if (typeof module === 'object' && module.exports) module.exports = DefxnSkinParts;

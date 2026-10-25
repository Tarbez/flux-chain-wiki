/* =====================================================================
   THE SITE'S PART MAP FOR SKINS (DefxnSkinParts)
   ---------------------------------------------------------------------
   An NFT skin reaches a part of the page through Ark UI's part names (data-ark-part, the style-schema
   keys in design/ark-ui/ark-ui.components.ts). Ark UI's own primitives stamp them already. The site's
   hand-built pieces do not: the navbar and its Products mega dropdown (js/resolvers/header.js), the
   all-pages menu layer, the footer strip, the redesign's rail and sheets. This file is the one place that says which
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
    /* The bar has three navs since the 2026-10-25 header: the family (the mark and the Products switcher), the page links,
       and the "you" panel. 'header.ark-header nav' named all three, and a skin's NAVMENU padding and position on the family
       nav moved the mark over Products and hung the Products panel from that nav, 765px to the right (skin audit,
       2026-10-25). Only the page links are the NAVMENU; the "you" panel is a popover. */
    ['header.ark-header .dx-bar__nav', 'NAVMENU'],
    ['#primary-navigation', 'POPOVER'],
    ['.site-footer-strip', 'TOOLBAR'],   /* the footer strip (js/hero-motion.js): it took no rule until it had a part name (NFT sweep, 2026-10-24) */
    /* the Products switcher (the kit's, assets/kit/defxn-product.js; built on first press). css/navigation.css hands
       it the site's tokens again, so a skin's colours reach it; these rows let the card's per-part rules reach it too
       (skin audit, 2026-10-25: before them it took no rule at all) */
    ['.dx-switch__panel', 'MEGAMENUPANEL'],
    ['.dx-switch__find', 'INPUTGROUP'],
    ['.dx-switch__find-input', 'SEARCH|TEXT'],
    ['.dx-switch__close, .dx-switch__back, .dx-related__item', 'GHOST|BUTTON'],
    ['.dx-switch__tabs', 'TABSLIST'],   /* the rail itself takes no part: as ASIDE its frame and padding nested a second box around the list and narrowed it on a phone */
    ['.dx-switch__tab', 'TABSTRIGGER'],
    ['.dx-switch__stage', 'MEGAMENUCOLUMN'],
    ['.dx-lane__name, .dx-related__label', 'LABEL|TEXT'],
    ['.dx-product-link', 'ITEM'],
    ['.dx-row__mark', 'ITEMLEADING'],
    ['.dx-row__text', 'ITEMCONTENT'],
    ['.dx-row__go', 'ITEMTRAILING'],
    ['.dx-product-link__name, .dx-related__name', 'TITLE|TEXT'],
    ['.dx-product-link__line, .dx-preview__line, .dx-preview__caveat, .dx-related__line, .dx-switch__none', 'BODY|TEXT'],
    ['.dx-row__facts', 'META|TEXT'],
    ['.dx-tag', 'OUTLINE|BADGE|TEXT'],
    ['.dx-switch__panel .dx-badge', 'BADGE'],
    ['.dx-switch__preview', 'CARD'],
    ['.dx-preview__eyebrow', 'CAPTION|TEXT'],
    ['.dx-preview__tile', 'MEDIA'],
    ['.dx-preview__name', 'HEADING|TEXT'],
    ['.dx-preview__what', 'LEAD|TEXT'],
    ['.dx-facts', 'DETAIL'],
    ['.dx-facts dt', 'LABEL|TEXT'],
    ['.dx-facts dd', 'VALUE|TEXT'],
    ['.dx-switch__foot', 'TOOLBAR'],
    ['.dx-switch__cap', 'KBD|TEXT'],
    ['.dx-switch__home', 'LINK'],
    ['.dx-switch__trigger', 'BUTTON'],
    ['.ark-cta, .cta:not(.quiet), .dx-cta:not(.dx-cta--here)', 'PRIMARY|BUTTON'],
    ['.cta.quiet, .header-run-link', 'SECONDARY|BUTTON'],   /* Get FXN Browser: the bar's one action took no rule (skin audit, 2026-10-25) */
    ['.header-you', 'GHOST|BUTTON'],
    ['.header-account-link', 'BUTTON'],
    ['.ark-link, .nav-route-link, .products-mega-link, .products-mega-all, .products-mega-how', 'LINK'],
    ['.products-mega', 'MEGAMENUPANEL'],
    ['.products-mega-primary, .products-mega-more', 'MEGAMENUCOLUMN'],
    ['.products-mega-feature, .rx-fleet, .rx-focus, .intro-card', 'CARD'],
    ['.products-mega-heading', 'HEADING|TEXT'],
    ['.sheet', 'PANEL'],
    ['.rail', 'ASIDE'],
    ['.tabs', 'TABSLIST'],
    ['.tabs [role="tab"]', 'TABSTRIGGER']
  ];
  /* never skinned here: meaning, the chain kinds, the networks, the record descent's light */
  var LOCKS = ['--live', '--trust', '--drift', '--warning', '--danger', '--hidden', '--success',
    '--chain-identity', '--chain-resolver', '--chain-token', '--chain-pool', '--chain-ledger',
    '--net-fxn', '--net-deark', '--net-cr3tv', '--ember'];
  /* Which of the card's rules each part does NOT wear. The owner's decision (2026-10-24): a card dresses the site by
     its own rules, so every part takes every rule the card sends, and Ark UI decides what each part's kind can wear
     (its family table), takes back a decoration that would cover text or a control, and holds colours to the contrast
     rules below. The CMS switches rules off as content (js/content/skin-policy.js, policy() below); this is the code's
     own list: a rule is switched off only for a reason measured on the real page, written next to it.
     (Until that decision a table here listed what each part MAY take. On the NFT gallery the card's own rules dress
     62 of 123 parts with nothing covered; the table had kept most of them bare.) */
  var OFF = {
    /* A table drew corners on every level at once: table-wrap, table, tbody, thead and each row. The thead and its row
       share one box, so two sets of corners drew on the same points, and every row carried four corners (skin gate,
       2026-10-25: 71 of 77 corner elements collided on the table). The table keeps its frame on table-wrap and table. */
    THEAD: ['frame'], TBODY: ['frame'], ROW: ['frame']
  };
  function squash(v) { return String(v).replace(/[^A-Za-z0-9|]/g, '').toUpperCase(); }
  /* the card's per-part rules (Ark UI's part keys, any spelling) less what `off` switches off. `off` is in the site's
     one spelling (CARD, PRIMARY|BUTTON, SECTIONHEADER for section-header), so both sides are compared squashed. */
  function switchOff(rules, off) {
    var map = {}, out = {};
    Object.keys(off || {}).forEach(function (part) { map[squash(part)] = off[part]; });
    Object.keys(rules || {}).forEach(function (part) {
      var gone = map[squash(part)] || [], kept = {};
      Object.keys(rules[part]).forEach(function (k) { if (gone.indexOf(k) < 0) kept[k] = rules[part][k]; });
      if (Object.keys(kept).length) out[part] = kept;
    });
    return out;
  }
  /* The owner's shape rule (2026-10-25): a full frame (or ticket) belongs to the big hero sections only. Every other
     part that asks for one takes corners, and a surface (a card, a stat, an alert, a panel that pops up) carries nothing
     under it: no strip. familyOf is Ark UI's part-kind reader (ArkKitSkin.arkSkinFamilyOfName). */
  var FRAMED = ['HERO'];
  function shapeRules(rules, familyOf) {
    var out = {};
    Object.keys(rules || {}).forEach(function (part) {
      var r = Object.assign({}, rules[part]), hero = FRAMED.indexOf(squash(part)) >= 0;
      if (!hero && (r.frame === 'full' || r.frame === 'ticket')) r.frame = 'corners';
      if (!hero && r.ornament && familyOf && familyOf(part) === 'surface') delete r.ornament;
      if (Object.keys(r).length) out[part] = r;
    });
    return out;
  }
  /* The CMS's skin policy (js/content/skin-policy.js, ArkSkinPolicy; edited in the CMS skin lab) adds to these
     defaults: { off: { PART: [rule keys] }, families: { family: { off: {...} } }, contrast: [{ fg, bg, min }] }.
     Every list only takes rules away, the card family's for that family's cards too. Its contrast rules are ADDED:
     a policy can raise the floor, never lower the site's own. `given` is a draft policy (the CMS preview);
     otherwise the published one, if loaded. */
  function policy(given, family) {
    var p = given || (typeof ArkSkinPolicy !== 'undefined' && ArkSkinPolicy.get ? ArkSkinPolicy.get() : null) || {};
    var off = {}, fam = family && p.families && p.families[family];
    [OFF, p.off, fam && fam.off].forEach(function (layer) {
      Object.keys(layer || {}).forEach(function (part) { off[part] = (off[part] || []).concat(layer[part].filter(function (r) { return (off[part] || []).indexOf(r) < 0; })); });
    });
    return { off: off, contrast: CONTRAST.concat(p.contrast || []) };
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

  return { PARTS: PARTS, LOCKS: LOCKS, OFF: OFF, CONTRAST: CONTRAST, FRAMED: FRAMED, policy: policy, switchOff: switchOff, shapeRules: shapeRules, mark: mark, watch: watch };
})();
if (typeof module === 'object' && module.exports) module.exports = DefxnSkinParts;

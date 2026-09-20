/* =====================================================================
   ARK ATOMIZER
   ---------------------------------------------------------------------
   Each unique declaration block becomes one class, injected once into a
   runtime-owned stylesheet. Identical styles collapse into one atom, so
   the scene ships zero authored CSS: every node is styled from a style
   object a resolver returns.

   Two sheets, in this order:
     1. base  — raw rules (custom properties, resets). Written first.
     2. atoms — one class per unique declaration block. Written after,
                so an atom always wins the cascade over a base rule.
   Call base() before the first atomize(); the runtime guarantees that
   by having main.js apply the tokens before it renders.
   ===================================================================== */
var ArkAtomizer = (function () {
  'use strict';

  var atomIndex = Object.create(null);
  var baseEl = null;
  var atomEl = null;

  function kebab(k) {
    return k.replace(/[A-Z]/g, function (m) { return '-' + m.toLowerCase(); });
  }

  /* FNV-1a, base 36. Stable across sessions, so a class name is a pure
     function of its declarations. */
  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }

  function makeSheet(role) {
    var el = document.createElement('style');
    el.setAttribute('data-ark-ui', role);
    return el;
  }

  function head() { return document.head || document.documentElement; }

  function atomSheet() {
    if (!atomEl) {
      atomEl = makeSheet('atoms');
      head().appendChild(atomEl);
    }
    return atomEl;
  }

  function baseSheet() {
    if (!baseEl) {
      baseEl = makeSheet('base');
      head().insertBefore(baseEl, atomEl);      /* atomEl null -> plain append */
    }
    return baseEl;
  }

  /* Append raw CSS text to the base sheet. */
  function base(cssText) {
    baseSheet().appendChild(document.createTextNode(cssText));
  }

  /* style object -> class name ('' when there is nothing to declare) */
  function atomize(styles) {
    if (!styles) return '';
    var keys = Object.keys(styles);
    if (!keys.length) return '';

    var decl = '';
    for (var i = 0; i < keys.length; i++) {
      var val = styles[keys[i]];
      if (val === null || val === undefined || val === '') continue;
      decl += (decl ? ';' : '') + kebab(keys[i]) + ':' + val;
    }
    if (!decl) return '';

    var cls = 'k' + hashStr(decl);
    if (!atomIndex[cls]) {
      atomIndex[cls] = decl;
      atomSheet().appendChild(document.createTextNode('.' + cls + '{' + decl + '}'));
    }
    return cls;
  }

  return { atomize: atomize, base: base };
})();

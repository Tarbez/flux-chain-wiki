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

  /* class name -> the declaration block it stands for, or '' for a class this atomizer
     never minted. The inverse of atomize(): js/content/components.js's capture() reads a
     selection's atom classes back into declarations so a captured component can re-mint the
     SAME classes on any page -- an atom's rule only exists once something on the current
     page has atomized it, so a bare class name copied to another page would style nothing. */
  function declaration(cls) { return atomIndex[cls] || ''; }

  /* A PINNED atom: the styling a captured component's element took from where it was
     captured (an ancestor-dependent rule such as `.how-chapter-header h1`), carried with the
     component so it looks the same on any page (js/content/components.js, contextStyles).
     Same hashing and the same sheet as atomize(), but the rule must outrank the page rules it
     stands in for -- `#scene h1` (1,0,1) on the destination would otherwise beat a bare
     `.k…` (0,1,0) -- so the selector carries id-level weight through :is(), whose
     specificity is its most specific argument even though only the class matches:
     `.kp…:is(.kp…,#ark-pin#ark-pin)` is (2,1,0). Inline styles (a Studio layout override
     on the instance) still win, as they should. */
  var pinIndex = Object.create(null);
  function pin(styles) {
    if (!styles) return '';
    var decl = '', keys = Object.keys(styles);
    for (var i = 0; i < keys.length; i++) {
      var val = styles[keys[i]];
      if (val === null || val === undefined || val === '') continue;
      decl += (decl ? ';' : '') + kebab(keys[i]) + ':' + val;
    }
    if (!decl) return '';
    var cls = 'kp' + hashStr(decl);
    if (!pinIndex[cls]) {
      pinIndex[cls] = decl;
      atomSheet().appendChild(document.createTextNode('.' + cls + ':is(.' + cls + ',#ark-pin#ark-pin){' + decl + '}'));
    }
    return cls;
  }
  function pinDeclaration(cls) { return pinIndex[cls] || ''; }

  return { atomize: atomize, base: base, declaration: declaration, pin: pin, pinDeclaration: pinDeclaration };
})();

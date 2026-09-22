/* =====================================================================
   ARK PROPS
   ---------------------------------------------------------------------
   Small readers every resolver uses to turn a terse Flux value into
   something usable. A value that will not parse falls back to the
   default the resolver passed in; nothing here throws.
   ===================================================================== */
var ArkProps = (function () {
  'use strict';

  /* '2.5', '2.5pct', ' 2.5u' -> 2.5    (anything unreadable -> dflt) */
  function num(v, dflt) {
    var x = parseFloat(v);
    return isNaN(x) ? dflt : x;
  }

  /* 'c8c8c8' or '#c8c8c8' -> '#c8c8c8'    (empty -> dflt) */
  function color(v, dflt) {
    if (!v) return dflt;
    v = String(v).trim();
    return v.charAt(0) === '#' ? v : '#' + v;
  }

  /* Where copy may send a visitor: a hash route (#/...) or a same-origin path (/...). Nothing else: not javascript:, data:,
     a protocol-relative //host, an absolute URL, or anything with whitespace or a backslash (which browsers can read as a slash). */
  function isSiteHref(v) {
    return typeof v === 'string' && /^(?:#[^\s\\]*|\/(?!\/)[^\s\\]*)$/.test(v);
  }

  return { num: num, color: color, isSiteHref: isSiteHref };
})();

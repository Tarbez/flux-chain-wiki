/* =====================================================================
   THE SKIN POLICY, AS CONTENT (ArkSkinPolicy)
   ---------------------------------------------------------------------
   Which rules the site switches OFF on which of its parts when a card is worn, and which extra contrast floors
   a skin is held to. The owner tests skins on the real site "skin by skin" from the CMS (Skin lab), so these
   switches are content (a saved FLX draft), not code.

   The owner's decision (2026-10-24): a card dresses the site by its own rules. Every part takes every rule the
   card sends, and Ark UI decides what each part's kind can wear (its family table, cover checks, contrast). The
   CMS can switch any rule off on any part. Before that decision a site table listed what each part MAY take
   (an "allow" map); that map is retired, and a saved one is read as nothing (none had been saved).
   The code defaults live in js/ark/skin-parts.js (DefxnSkinParts.OFF and .CONTRAST). DefxnSkinParts.policy()
   adds this module's switches to them:
     off       { PART: [rule keys] }   rules that part never wears, added to the code's
     families  { <family>: { off: { PART: [rule keys] } } }   switched off too, for cards of that family only
     contrast  [{ fg: [tokens], bg: [tokens], min }]   ADDED to the site's own rules, never removed
   A switch only ever takes a rule away: a family cannot switch back on what the site switched off.
   An empty policy (the default) changes nothing: the site behaves as the code defaults say.

   sanitize() keeps only what is well formed. problems() says what it would drop and what would fix it,
   in sentences the CMS can show. Stored form is FLX, never JSON (workspace law, "stored state is FLX"):
   serialize() writes records of ARK's structured-state grammar (js/vendor/flx-state-grammar.js) inside one
       ArkSkinPolicy.define("<FLX records>");
   call, the same way js/content/world.js does. The round trip is exact (tests/skin-policy.cjs). */
var ArkSkinPolicy = (function () {
  'use strict';

  /* the closed rule keys of docs/home-redesign/SKIN-CONTRACT.md, section 3, in the contract's order */
  var RULES = ['frame', 'edge', 'ornament', 'density', 'marker', 'header', 'layout'];
  /* an Ark UI part key in the site's one spelling: upper-case words joined by |, such as CARD, PRIMARY|BUTTON, MEGAMENUPANEL,
     or a block part with its hyphens dropped (section-header is SECTIONHEADER) */
  var PART = /^[A-Z][A-Z0-9]*(?:\|[A-Z][A-Z0-9]*)*$/;
  var TOKEN = /^--[a-z0-9-]+$/;
  var FAMILY = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,39}$/;

  function isObject(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function unique(list) { return list.filter(function (v, i) { return list.indexOf(v) === i; }); }

  /* ---- problems: what is wrong, and what would fix it ------------------------------------- */
  function ruleList(list, where, out) {
    if (!Array.isArray(list)) { out.push({ path: where, sentence: where + ' must be a list of rule keys, such as ["frame", "edge"]. Use [] to switch no rule off.' }); return []; }
    var kept = [];
    list.forEach(function (rule) {
      if (RULES.indexOf(rule) >= 0) kept.push(rule);
      else out.push({ path: where, sentence: where + ' names the rule ' + JSON.stringify(rule) + ', which the skin contract does not have. Use one of: ' + RULES.join(', ') + '.' });
    });
    return RULES.filter(function (r) { return kept.indexOf(r) >= 0; });
  }
  function offMap(map, where, out) {
    var res = {};
    if (map === undefined) return res;
    if (!isObject(map)) { out.push({ path: where, sentence: where + ' must be an object of part keys, such as { "CARD": ["frame"] }.' }); return res; }
    Object.keys(map).sort().forEach(function (part) {
      if (!PART.test(part)) {
        out.push({ path: where + '.' + part, sentence: where + ' has the part key ' + JSON.stringify(part) + '. A part key is an Ark UI part in upper case with no hyphen, such as CARD, PRIMARY|BUTTON or SECTIONHEADER (the block part section-header).' });
        return;
      }
      var list = ruleList(map[part], where + '.' + part, out);
      if (list.length) res[part] = list;   /* an empty list switches nothing off: it is not kept */
    });
    return res;
  }
  function tokenList(list, where, out) {
    if (!Array.isArray(list) || !list.length) { out.push({ path: where, sentence: where + ' must be a list of at least one colour token, such as ["--text-faint"].' }); return null; }
    var kept = [];
    list.forEach(function (t) {
      if (typeof t === 'string' && TOKEN.test(t)) kept.push(t);
      else out.push({ path: where, sentence: where + ' has ' + JSON.stringify(t) + ', which is not a token name. A token starts with -- and uses lower-case letters, digits and -, such as --text-faint.' });
    });
    kept = unique(kept);
    return kept.length ? kept : null;
  }
  function contrastList(list, out) {
    var res = [];
    if (list === undefined) return res;
    if (!Array.isArray(list)) { out.push({ path: 'contrast', sentence: 'contrast must be a list of rules, such as [{ "fg": ["--text-faint"], "bg": ["--canvas"], "min": 4.5 }].' }); return res; }
    list.forEach(function (rule, i) {
      var where = 'contrast[' + i + ']';
      if (!isObject(rule)) { out.push({ path: where, sentence: where + ' must be an object with fg, bg and min.' }); return; }
      var fg = tokenList(rule.fg, where + '.fg', out), bg = tokenList(rule.bg, where + '.bg', out);
      var min = Number(rule.min);
      if (!Number.isFinite(min) || min < 1 || min > 21) {
        out.push({ path: where + '.min', sentence: where + '.min is ' + JSON.stringify(rule.min) + '. A contrast ratio runs from 1 to 21; text is read at 4.5 and up.' });
        return;
      }
      if (fg && bg) res.push({ fg: fg, bg: bg, min: Math.round(min * 100) / 100 });
    });
    return res;
  }
  function familyMap(map, out) {
    var res = {};
    if (map === undefined) return res;
    if (!isObject(map)) { out.push({ path: 'families', sentence: 'families must be an object of card families, such as { "Arcade": { "off": { "CARD": ["frame"] } } }.' }); return res; }
    Object.keys(map).sort().forEach(function (name) {
      var where = 'families.' + name;
      if (!FAMILY.test(name)) { out.push({ path: where, sentence: 'The family name ' + JSON.stringify(name) + ' is not usable. Use the name the card shows (such as Arcade): letters, digits, spaces, - and _, up to 40 characters.' }); return; }
      if (!isObject(map[name])) { out.push({ path: where, sentence: where + ' must be an object with an off map.' }); return; }
      var off = offMap(map[name].off, where + '.off', out);
      if (Object.keys(off).length) res[name] = { off: off };
    });
    return res;
  }

  /* what sanitize() would drop or change, as [{ path, sentence }] -- empty for a well formed policy */
  function problems(whole) {
    var out = [];
    if (whole === undefined || whole === null) return out;
    if (!isObject(whole)) { out.push({ path: '', sentence: 'A skin policy is an object with off, families and contrast. Start from {}.' }); return out; }
    offMap(whole.off, 'off', out); familyMap(whole.families, out); contrastList(whole.contrast, out);
    return out;
  }

  function sanitize(whole) {
    var src = isObject(whole) ? whole : {}, ignore = [];
    return { version: 2, off: offMap(src.off, 'off', ignore), families: familyMap(src.families, ignore), contrast: contrastList(src.contrast, ignore) };
  }
  function defaults() { return sanitize({}); }

  /* The rules a part has switched off, for a card of `family` (or none): the code's, the policy's and the family's
     together. DefxnSkinParts.policy() does the same on the site; the CMS needs it before the canvas answers, so
     tests/skin-policy.cjs holds the two to the same result. A part with no list wears every rule the card sends. */
  function effectiveOff(codeDefaults, policy, family) {
    var p = sanitize(policy), fam = family && p.families[family], off = {};
    [codeDefaults, p.off, fam && fam.off].forEach(function (layer) {
      Object.keys(layer || {}).forEach(function (part) {
        var had = off[part] || [];
        off[part] = RULES.filter(function (r) { return had.indexOf(r) >= 0 || layer[part].indexOf(r) >= 0; });
      });
    });
    return off;
  }

  function flx() {
    var F = typeof ARK_FLX_STATE !== 'undefined' ? ARK_FLX_STATE : (typeof require === 'function' ? require('../vendor/flx-state-grammar.js') : null);
    if (!F) throw new Error('ArkSkinPolicy needs js/vendor/flx-state-grammar.js loaded before it (ARK_FLX_STATE)');
    return F;
  }
  function encode(whole) { return flx().encodeState(sanitize(whole)); }
  function decode(text) { return sanitize(flx().decodeState(String(text))); }

  var current = defaults(), listeners = [];
  /* FLX text from the data file, or a plain value from the CMS preview */
  function define(value) {
    current = typeof value === 'string' ? decode(value) : sanitize(value);
    listeners.slice().forEach(function (fn) { try { fn(get()); } catch (e) { console.error('ArkSkinPolicy listener: ' + e.message); } });
    return get();
  }
  function get() { return JSON.parse(JSON.stringify(current)); }
  function onChange(fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; }

  /* the exact file text: the CMS Save and a hand edit produce the same bytes */
  function serialize(whole) {
    return '/* The skin policy: which rules the site switches off on which of its parts when a card is worn, and the extra contrast\n' +
      '   floors it is held to (js/content/skin-policy.js). FLX records of ARK\'s structured-state grammar, one per leaf.\n' +
      '   Edit from DEFXN Studio, More > Skin lab. This file is not meant for hand editing. */\n' +
      'ArkSkinPolicy.define(' + JSON.stringify(encode(whole)) + ');\n';
  }

  return { RULES: RULES.slice(), sanitize: sanitize, problems: problems, defaults: defaults, effectiveOff: effectiveOff,
    encode: encode, decode: decode, define: define, get: get, onChange: onChange, serialize: serialize };
})();
if (typeof module === 'object' && module.exports) module.exports = ArkSkinPolicy;

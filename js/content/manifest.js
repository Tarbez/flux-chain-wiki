/* =====================================================================
   PAGE MANIFESTS AND THE COPY THEY OWN
   ---------------------------------------------------------------------
   Every page has one manifest in js/content/manifests/<id>.js. A manifest
   holds all the words that page shows, and nothing else does:

     id        lowercase, letters and digits. Its capitals are the AREA in a
               copy key: the manifest `home` owns HOME.EYEBROW, HOME.TITLE...
     title     the name shown in the admin page
     route     where the page lives, used to preview it
     group     'site' (shared chrome), 'page', or 'theory' (a page of the
               theory; the concept page lists these and routes to them)
     meta      structure the words do not carry: placement ('row' or 'rail'
               on the concept page), next (route a page's onward link opens)
     shape     optional per-page scene config: { kind: 'zero' | 'orb' |
               'knot' | 'proximity' | 'word', rotation: [tilt, turn],
               dissolve: 0..1, depth: 0..1 }. It overrides the scene's
               built-in config for the page whose route matches. (SEO
               titles/descriptions live in js/content/seo.js, not here.)
     fields    ROLE -> { label, kind: 'line' | 'text', section, value }

   Pages, the shell and Flux patterns all read words through ArkCopy, so
   editing a manifest (by hand, or in admin.html) changes the site and there
   is no second copy to keep in step. A Flux pattern holds the key, never
   the words; see js/ark/runtime.js.

   The repeated part of a sheet is derived, not declared: a page has as many
   points as it has POINT<n>.TITLE fields, so adding a point adds two fields
   and nothing else.
   ===================================================================== */
var ArkManifest = (function () {
  'use strict';

  var ID = /^[a-z][a-z0-9]*$/;
  var ROLE = /^[A-Z][A-Z0-9]*(\.[A-Z][A-Z0-9]*)*$/;
  var GROUPS = ['site', 'page', 'theory'];
  var KINDS = ['line', 'text'];
  var SHAPE_KINDS = ['zero', 'orb', 'knot', 'proximity', 'word'];
  var pages = [];

  function problems(m) {
    var out = [];
    if (!m || typeof m !== 'object') return ['a manifest is an object'];
    if (!ID.test(m.id || '')) out.push('id must be lowercase letters and digits, starting with a letter');
    if (typeof m.title !== 'string' || !m.title) out.push('title is missing');
    if (typeof m.route !== 'string' || m.route.charAt(0) !== '/') out.push('route must start with /');
    if (GROUPS.indexOf(m.group) < 0) out.push('group must be one of ' + GROUPS.join(', '));
    if (m.shape !== undefined) {
      var s = m.shape;
      if (!s || typeof s !== 'object' || Array.isArray(s)) out.push('shape must be an object');
      else {
        if (SHAPE_KINDS.indexOf(s.kind) < 0) out.push('shape kind must be one of ' + SHAPE_KINDS.join(', '));
        if (s.rotation !== undefined && (!Array.isArray(s.rotation) || s.rotation.length !== 2 ||
            s.rotation.some(function (n) { return typeof n !== 'number' || !isFinite(n); })))
          out.push('shape rotation must be two numbers (tilt, turn)');
        ['dissolve', 'depth'].forEach(function (key) {
          if (s[key] !== undefined && (typeof s[key] !== 'number' || !isFinite(s[key]) || s[key] < 0 || s[key] > 1))
            out.push('shape ' + key + ' must be a number from 0 to 1');
        });
      }
    }
    if (!m.fields || typeof m.fields !== 'object') { out.push('fields are missing'); return out; }
    Object.keys(m.fields).forEach(function (role) {
      var f = m.fields[role];
      if (!ROLE.test(role)) out.push('field "' + role + '" must be capitals and digits joined by dots');
      else if (!f || typeof f.value !== 'string') out.push(role + ' has no value');
      else if (KINDS.indexOf(f.kind) < 0) out.push(role + ' kind must be line or text');
      else if (!f.label) out.push(role + ' needs a label');
    });
    return out;
  }

  function define(m) {
    var bad = problems(m);
    if (bad.length) throw new Error('ArkManifest: ' + (m && m.id) + ': ' + bad.join('; '));
    var at = pages.findIndex(function (p) { return p.id === m.id; });
    if (at < 0) pages.push(m); else pages[at] = m;
    return m;
  }

  function get(id) { return pages.find(function (p) { return p.id === id; }); }
  function all() { return pages.slice(); }
  function group(name) { return pages.filter(function (p) { return p.group === name; }); }
  function remove(id) { pages = pages.filter(function (p) { return p.id !== id; }); }

  /* how many POINT<n> blocks a manifest has: contiguous from 1 */
  function points(m) {
    var n = 0;
    while (m.fields['POINT' + (n + 1) + '.TITLE']) n++;
    return n;
  }

  /* the exact file text; the admin page and a hand edit produce the same bytes */
  function serialize(m) {
    return '/* One page\'s copy. Edit it in admin.html, or by hand: keep the object valid JSON. */\n' +
      'ArkManifest.define(' + JSON.stringify(m, null, 2) + ');\n';
  }

  return { define: define, get: get, all: all, group: group, remove: remove, points: points,
           problems: problems, serialize: serialize, groups: GROUPS, kinds: KINDS, shapeKinds: SHAPE_KINDS };
})();

/* =====================================================================
   COPY: the one way any code turns a key into words.
   A key reads AREA.ROLE in capitals (HOME.TITLE, NAV.BACK.ZERO). It is
   recognised by that shape, not by a list, so a mistyped key is reported
   as a missing entry and a sentence is reported as words.
   ===================================================================== */
var ArkCopy = (function () {
  'use strict';

  var KEY = /^[A-Z][A-Z0-9]*(\.[A-Z][A-Z0-9]*)+$/;

  function isKey(value) { return KEY.test(value); }

  function field(key) {
    if (!isKey(key)) return null;
    var dot = key.indexOf('.');
    var manifest = ArkManifest.get(key.slice(0, dot).toLowerCase());
    if (!manifest) return null;
    return Object.prototype.hasOwnProperty.call(manifest.fields, key.slice(dot + 1)) ? manifest.fields[key.slice(dot + 1)] : null;
  }

  function has(key) { return !!field(key); }

  /* every key the manifests define, for tools and tests */
  function keys() {
    var out = [];
    ArkManifest.all().forEach(function (m) {
      Object.keys(m.fields).forEach(function (role) { out.push(m.id.toUpperCase() + '.' + role); });
    });
    return out;
  }

  /* key -> words. `where` and `prop` only shape the refusal. */
  function resolve(value, where, prop) {
    var f = field(value);
    if (f) return f.value;
    var label = where + ' prop "' + prop + '"';
    if (isKey(value)) {
      var area = value.slice(0, value.indexOf('.')).toLowerCase();
      throw new Error('ArkCopy: ' + label + ' asks for ' + value + ', which has no entry. ' +
        'Add the field to js/content/manifests/' + area + '.js (or in admin.html), or use a key that exists.');
    }
    throw new Error('ArkCopy: ' + label + ' is "' + value + '", but copy is referred to by key, not written as words. ' +
      'Add the words as a field in the page\'s manifest (js/content/manifests/, or admin.html) and use its key, AREA.ROLE, for example HOME.TITLE.');
  }

  /* for pages and the shell, which name a key directly */
  function text(key) { return resolve(key, 'code', 'key'); }

  return { isKey: isKey, has: has, keys: keys, resolve: resolve, text: text };
})();

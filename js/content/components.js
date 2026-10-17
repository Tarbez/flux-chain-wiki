/* Reusable content blocks ("components") inserted in DEFXN Studio.
   Mirrors js/content/layout.js's proven shape: a small sanitized model, a
   pure set of mutators that take the current draft and return a new
   sanitized one (the caller holds the draft, same as cmsLayoutDraft/
   layoutDraft do for ArkLayout), and a module-level `current` used only when
   no explicit draft is passed in (the real deployed site, reading the
   baked components-data.js).

   Why an instance needs no copy of its master's content: every page module
   already rebuilds its whole DOM tree from scratch on every route mount, so
   an instance is just a thin pointer -- { key, masterId, overrides } -- that
   gets rebuilt fresh from the CURRENT master every time its anchor renders.
   A master edit is visible everywhere on the very next render; there is no
   separate resync step to get wrong, unlike the standalone canvas's deep-
   copy-plus-resync design (admin-studio.html's own component/instance
   system), which needs copies because its node graph is mutated in place.

   Shape: { version, masters: { masterId: { resolver, props, label } },
            routes: { route: { anchorId: [ { key, masterId, overrides } ] } } }
   `route` is a path ('/about'), the same keying ArkLayout.routes already
   uses -- not a pageCatalog key -- so the two modules agree on what "this
   route" means. */
var ArkComponents = (function () {
  'use strict';

  var current = { version: 1, masters: {}, routes: {} };

  /* The 6 generic, document-flow block resolvers (js/resolvers/blocks/*.js),
     registered the same way as every other ArkUI resolver. A master naming
     anything else is dropped by sanitize() -- this is the whitelist Part 3's
     design calls for, so Studio can never write a master pointing at one of
     the hero-scene's own %/u-space resolvers. */
  var RESOLVERS = ['RBLOCK_TEXT_V1', 'RBLOCK_CTA_V1', 'RBLOCK_IMAGE_V1', 'RBLOCK_CARD_V1', 'RBLOCK_QUOTE_V1', 'RBLOCK_DIVIDER_V1'];

  /* Each resolver's own real prop names -- not a separate formal schema
     object (these 6 resolver files just read p.xxx directly, no terse Flux
     keys, since components are never built through Flux source text). An
     override or a master's own props naming anything else for that resolver
     is dropped, the same "validate against the resolver's own schema" rule
     js/content/manifest.js's 'link' kind already applies to its own value. */
  var RESOLVER_PROPS = {
    RBLOCK_TEXT_V1: ['heading', 'body', 'align', 'size'],
    RBLOCK_CTA_V1: ['label', 'href', 'variant'],
    RBLOCK_IMAGE_V1: ['src', 'alt', 'caption'],
    RBLOCK_CARD_V1: ['icon', 'title', 'text'],
    RBLOCK_QUOTE_V1: ['quote', 'attribution'],
    RBLOCK_DIVIDER_V1: []
  };

  var ID = /^[a-z][a-z0-9_-]{0,79}$/i;
  var ROUTE = /^\/\S{0,299}$/;

  function isPlainObject(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function okValue(v) { return (typeof v === 'string' && v.length <= 4000) || (typeof v === 'number' && isFinite(v)) || typeof v === 'boolean'; }

  /* Keeps only the keys a resolver actually declares, each with a value of
     a safe shape and size -- the same per-field discipline manifest.js's
     problems() already applies to a page manifest's own fields. */
  function cleanProps(resolver, raw) {
    var allowed = RESOLVER_PROPS[resolver] || [], out = {};
    if (!isPlainObject(raw)) return out;
    allowed.forEach(function (key) { if (okValue(raw[key])) out[key] = raw[key]; });
    return out;
  }

  function cleanMaster(raw) {
    if (!isPlainObject(raw) || RESOLVERS.indexOf(raw.resolver) < 0) return null;
    return { resolver: raw.resolver, props: cleanProps(raw.resolver, raw.props), label: String(raw.label || raw.resolver).slice(0, 120) };
  }

  function cleanInstance(raw, masters) {
    if (!isPlainObject(raw) || typeof raw.key !== 'string' || !ID.test(raw.key)) return null;
    var master = typeof raw.masterId === 'string' ? masters[raw.masterId] : null;
    if (!master) return null;
    return { key: raw.key, masterId: raw.masterId, overrides: cleanProps(master.resolver, raw.overrides) };
  }

  function sanitize(value) {
    var out = { version: 1, masters: {}, routes: {} };
    var rawMasters = value && value.masters;
    if (isPlainObject(rawMasters)) Object.keys(rawMasters).slice(0, 300).forEach(function (id) {
      if (!ID.test(id)) return;
      var clean = cleanMaster(rawMasters[id]);
      if (clean) out.masters[id] = clean;
    });
    var rawRoutes = value && value.routes;
    if (isPlainObject(rawRoutes)) Object.keys(rawRoutes).slice(0, 500).forEach(function (route) {
      if (!ROUTE.test(route)) return;
      var rawAnchors = rawRoutes[route];
      if (!isPlainObject(rawAnchors)) return;
      var cleanAnchors = {};
      Object.keys(rawAnchors).slice(0, 50).forEach(function (anchorId) {
        if (!ID.test(anchorId) || !Array.isArray(rawAnchors[anchorId])) return;
        var cleanList = [];
        rawAnchors[anchorId].slice(0, 200).forEach(function (item) {
          var instance = cleanInstance(item, out.masters);
          if (instance) cleanList.push(instance);
        });
        if (cleanList.length) cleanAnchors[anchorId] = cleanList;
      });
      if (Object.keys(cleanAnchors).length) out.routes[route] = cleanAnchors;
    });
    return out;
  }

  function define(value) { current = sanitize(value); return get(); }
  function get() { return JSON.parse(JSON.stringify(current)); }
  /* the exact file text; the Studio-driven edit and a hand edit produce the same bytes,
     the same contract js/content/layout.js's serialize() keeps for layout-data.js */
  function serialize(value) {
    return '/* Reusable content blocks inserted in DEFXN Studio. */\nArkComponents.define(' + JSON.stringify(sanitize(value), null, 2) + ');\n';
  }

  /* ---- mutators: pure, draft-in draft-out, exactly like ArkLayout.set/group/
     ungroup/remove -- the caller (js/main.js's cmsComponentsDraft, admin.js's
     componentsDraft) holds the draft and reassigns it from the return value.
     Each id/key is supplied by the caller, the same way ArkLayout.group()
     takes a caller-generated group id rather than inventing one here. */

  function createMaster(value, id, resolver, props, label) {
    var draft = sanitize(value);
    if (!ID.test(id || '') || RESOLVERS.indexOf(resolver) < 0) return draft;
    draft.masters[id] = { resolver: resolver, props: cleanProps(resolver, props), label: String(label || resolver).slice(0, 120) };
    return sanitize(draft);
  }

  function updateMaster(value, id, patch) {
    var draft = sanitize(value), master = draft.masters[id];
    if (!master || !isPlainObject(patch)) return draft;
    if (typeof patch.label === 'string') master.label = patch.label.slice(0, 120);
    if (patch.props !== undefined) master.props = cleanProps(master.resolver, patch.props);
    return sanitize(draft);
  }

  function insertInstance(value, route, anchorId, key, masterId) {
    var draft = sanitize(value);
    if (!ROUTE.test(route || '') || !ID.test(anchorId || '') || !ID.test(key || '') || !draft.masters[masterId]) return draft;
    var anchors = draft.routes[route] || (draft.routes[route] = {});
    var list = anchors[anchorId] || (anchors[anchorId] = []);
    list.push({ key: key, masterId: masterId, overrides: {} });
    return sanitize(draft);
  }

  function setOverride(value, route, anchorId, key, propPath, propValue) {
    var draft = sanitize(value);
    var list = draft.routes[route] && draft.routes[route][anchorId];
    var instance = list && list.find(function (item) { return item.key === key; });
    if (!instance) return draft;
    if (propValue === undefined || propValue === null) delete instance.overrides[propPath];
    else instance.overrides[propPath] = propValue;
    return sanitize(draft);
  }

  function removeInstance(value, route, anchorId, key) {
    var draft = sanitize(value);
    var anchors = draft.routes[route], list = anchors && anchors[anchorId];
    if (!list) return draft;
    var kept = list.filter(function (item) { return item.key !== key; });
    if (kept.length) anchors[anchorId] = kept; else delete anchors[anchorId];
    if (!Object.keys(anchors).length) delete draft.routes[route];
    return sanitize(draft);
  }

  /* ---- render: rebuilds one anchor's current instance list into real DOM,
     reusing ArkUI.build (js/ark/runtime.js) exactly as every other resolver
     tree does -- never a second, parallel builder. `host` is the anchor
     element itself ( <div data-ark-insert="..."> ), so this fully replaces
     its content: safe to call on every mount, and again on every Studio
     edit, with no leftover stale instance. `value` is the draft to read;
     omitted, it reads the module's own `current` (the deployed site, or a
     test that only called define()), the same default ArkLayout.apply()
     falls back to. */
  function render(host, route, anchorId, value) {
    if (!host) return [];
    while (host.firstChild) host.firstChild.remove();
    var draft = sanitize(value !== undefined ? value : current);
    var list = (draft.routes[route] && draft.routes[route][anchorId]) || [];
    var ctx = { mounts: [], emerge: [] }, built = [];
    list.forEach(function (instance) {
      var master = draft.masters[instance.masterId];
      if (!master) return;                        /* self-healing: a dangling pointer renders nothing, never throws */
      /* `from` is injected, never user data: the route a link-field CTA
         resolves a doc: link's return-to against (js/ark/dash-kit.js's
         resolveLinkField/linkEl), always the instance's own current route. */
      var props = Object.assign({}, master.props, instance.overrides, { from: route });
      var node = { name: instance.key, resolver: master.resolver, props: props, children: [] };
      var el = ArkUI.build(node, ctx);
      if (el) {
        /* Identifies this element back to its instance for Studio's inspector
           (js/main.js's cmsSelectionInfo reads these three back on selection) --
           the one way a click in the live preview resolves to a real
           setOverride()/removeInstance() call instead of a layout-only pick. */
        if (el.setAttribute) {
          el.setAttribute('data-ark-component-key', instance.key);
          el.setAttribute('data-ark-component-anchor', anchorId);
          el.setAttribute('data-ark-component-master', instance.masterId);
        }
        host.appendChild(el); built.push(el);
      }
    });
    for (var i = 0; i < ctx.mounts.length; i++) ctx.mounts[i].fn(ctx.mounts[i].el, ctx.mounts[i].p);
    return built;
  }

  /* Every [data-ark-insert] anchor id under root -- a read-only listing, used
     both by renderAll() below and by the real site's js/main.js to report
     back to Studio which anchors the current route actually declares. */
  function anchorsIn(root) {
    if (!root || !root.querySelectorAll) return [];
    return Array.prototype.slice.call(root.querySelectorAll('[data-ark-insert]'))
      .map(function (el) { return el.getAttribute('data-ark-insert'); });
  }

  /* Every [data-ark-insert] anchor under root, rendered from `value` (or the
     module's own `current`). Returns the anchor ids found, so a caller (the
     real site's js/main.js) can both fill every anchor on a page in one call
     and report back to Studio which anchors this route actually has. */
  function renderAll(root, route, value) {
    if (!root || !root.querySelectorAll) return [];
    var anchors = Array.prototype.slice.call(root.querySelectorAll('[data-ark-insert]'));
    anchors.forEach(function (el) { render(el, route, el.getAttribute('data-ark-insert'), value); });
    return anchors.map(function (el) { return el.getAttribute('data-ark-insert'); });
  }

  return {
    define: define, get: get, sanitize: sanitize, serialize: serialize,
    createMaster: createMaster, updateMaster: updateMaster,
    insertInstance: insertInstance, setOverride: setOverride, removeInstance: removeInstance,
    render: render, renderAll: renderAll, anchorsIn: anchorsIn,
    resolvers: RESOLVERS.slice(), resolverProps: RESOLVER_PROPS
  };
})();

/* Responsive visual-layout overrides written by the DEFXN Studio.
   They are deliberately additive: page modules keep owning their markup and
   ordinary CSS while Studio stores only the transforms a designer changed. */
var ArkLayout = (function () {
  'use strict';
  var current = { version: 2, routes: {}, groups: {}, labels: {} };
  var owned = ['translate', 'width', 'height', 'rotate', 'scale', 'zIndex', 'maxWidth', 'maxHeight', 'minWidth', 'minHeight',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginBottom',
    'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'textAlign', 'color', 'backgroundColor', 'borderRadius', 'borderWidth', 'borderStyle', 'borderColor', 'opacity', 'overflow',
    'display', 'flexDirection', 'gridTemplateColumns', 'gap', 'alignItems', 'justifyContent', 'flexWrap'];

  /* Real design tokens the live DEFXN site defines (css/themes.css's :root block) -- the
     visual-style controls bind to these instead of inventing a parallel palette or type
     scale. This is the ONE copy: js/admin/admin.js reads them as ArkLayout.TEXT_TOKENS etc.
     (it used to hand-mirror them as CMS_*_TOKENS, a holdover from the deleted admin-studio.html
     document that could not load scripts; tests/admin-token-source.cjs keeps it from coming back). */
  var TEXT_TOKENS = ['text-strong', 'text', 'text-muted', 'text-faint', 'text-inverse'];
  var FILL_TOKENS = ['canvas', 'surface', 'raised', 'nested', 'overlay', 'primary', 'complement', 'accent', 'trust', 'live', 'warning', 'danger', 'hidden', 'reference'];
  var BORDER_TOKENS = ['border-subtle', 'border-default', 'border-strong'];
  var FONT_TOKENS = ['display', 'sans', 'mono'];
  var TYPE_SIZE_TOKENS = ['hero', 'h1', 'h2', 'h3', 'body', 'label', 'metadata'];
  var RADIUS_TOKENS = ['none', 'card', 'control', 'panel'];
  var RADIUS_CSS = { none: '0', card: 'var(--size-card-radius)', control: 'var(--size-control-radius)', panel: 'var(--size-panel-radius)' };
  var BORDER_WIDTH_CSS = { thin: '1px', thick: '2px' };
  var BORDER_VALUES = ['none'].concat(Object.keys(BORDER_WIDTH_CSS));
  var WRAP_VALUES = ['no', 'yes'];
  var OPACITY_STEPS = [100, 80, 60, 40];
  var OVERFLOW_VALUES = ['visible', 'hidden', 'scroll'];
  var FONT_WEIGHT_STEPS = [400, 500, 600, 700, 800];
  var LINE_HEIGHT_TOKENS = ['tight', 'snug', 'normal', 'loose'];
  var LINE_HEIGHT_CSS = { tight: '1.1', snug: '1.3', normal: '1.5', loose: '1.7' };
  var TEXT_ALIGN_VALUES = ['left', 'center', 'right'];
  var DISPLAY_TOKENS = ['stack', 'row', 'grid', 'block', 'hide'];
  var ALIGN_ITEMS_TOKENS = ['stretch', 'start', 'center', 'end'];
  var ALIGN_ITEMS_CSS = { stretch: 'stretch', start: 'flex-start', center: 'center', end: 'flex-end' };
  var JUSTIFY_TOKENS = ['start', 'center', 'end', 'between'];
  var JUSTIFY_CSS = { start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between' };
  /* Alt text: generous enough for a real description, short enough that it stays alt text. */
  var ALT_MAX = 400;
  /* Which attribute carries an element's text alternative: <img> has alt; the other media a
     page draws (inline <svg>, <canvas>, <video>) take their accessible name from aria-label.
     Anything else has no text alternative of its own to set. */
  function altAttribute(element) {
    var tag = element && element.tagName ? element.tagName.toLowerCase() : '';
    return tag === 'img' ? 'alt' : (tag === 'svg' || tag === 'canvas' || tag === 'video') ? 'aria-label' : '';
  }
  /* Every attribute giving an element a text alternative can touch. Describing an <svg> or
     <canvas> the page marked aria-hidden means it is no longer decorative, so it also gets
     role="img" and loses aria-hidden -- a label on a hidden element is read by nobody. */
  function altTouches(element) {
    var attr = altAttribute(element);
    return !attr ? [] : attr === 'alt' ? ['alt'] : element.tagName.toLowerCase() === 'video' ? ['aria-label', 'aria-hidden'] : ['aria-label', 'aria-hidden', 'role'];
  }

  /* ---- scopes: where a per-element edit is stored -------------------------------------
     Every map below (routes, groups, labels, alts; and ArkStates.routes, ArkComponents.routes /
     spots, ArkElementMotion.routes) is keyed by a SCOPE, then by layout key. A scope is a route
     ('/about') for the content of that route's page, or SHELL for the persistent shell (header,
     nav, background layers) that every route shows. An edit to a header link used to be stored
     under whichever route the editor happened to be on, so it showed on that route only and the
     header looked different on every other page. Which scope an element belongs to is decided by
     structure (scopeOf: inside a page root or not), never by a list of selectors.
     Data saved before SHELL existed keeps the route it was saved under and still applies there
     (future law: a stored record is never rewritten); where both exist, SHELL wins field by field.
     SHELL is '*' in every module that keys by scope (states.js, components.js, element-motion.js
     repeat the one character so that sanitizing a draft never needs this file loaded; regression:
     tests/layout-shell-scope.cjs holds them equal). */
  var SHELL = '*';
  function isScope(route) { return route === SHELL || (typeof route === 'string' && route[0] === '/' && route.length <= 300); }

  /* ---- moved scopes: edits saved under a scope that has since been split ------------------------
     A page that shows several documents at one route declares a scope per document (see "a page's
     layout scope" below). Edits saved before it did are stored under the bare route, and they were
     made on the one document the route opened by default then. They belong to that document: they
     are read as stored under its scope, and nowhere else. The stored record is not edited by hand
     (future law); this mapping runs when a draft is sanitized, so the next Save writes them forward
     under the scope they belong to. Where both exist, the newer scope's own entry wins, field by
     field for a layout frame.
       '/reference'  -> '/reference?doc=docs/protocol/agreements.md'
         Until 2026-10-22 /reference with no ?doc= opened docs/protocol/agreements.md, and every
         /reference document shared the one '/reference' bucket, so all edits saved there were made
         on Agreements (the census tests/fixtures/layout-keys/reference.tsv was taken on it). The
         default is now a current document (js/pages/reference.js, defaultDoc).
     One table, here: js/content/states.js, components.js and element-motion.js sanitize through
     ArkLayout.moveScopes when this file is loaded (it loads first in index.html and admin-app.html).
     Regression: tests/layout-document-scope.cjs. */
  var MOVED_SCOPES = { '/reference': '/reference?doc=docs/protocol/agreements.md' };
  function movedScope(route) { return Object.prototype.hasOwnProperty.call(MOVED_SCOPES, route) ? MOVED_SCOPES[route] : route; }
  /* `map` (scope -> key -> entry) with every moved scope's entries under the scope it moved to.
     `mergeEntry(older, newer)` combines two entries for one key (default: the newer one). The input
     is not changed. */
  function moveScopes(map, mergeEntry) {
    if (!map || typeof map !== 'object' || Array.isArray(map)) return map;
    var moved = Object.keys(map).filter(function (route) { return movedScope(route) !== route; });
    if (!moved.length) return map;
    var out = {};
    Object.keys(map).forEach(function (route) { if (moved.indexOf(route) < 0) out[route] = map[route]; });
    moved.forEach(function (route) {
      var older = map[route], target = movedScope(route), newer = out[target];
      if (!older || typeof older !== 'object') return;
      if (!newer || typeof newer !== 'object') { out[target] = older; return; }
      var both = Object.assign({}, older);
      Object.keys(newer).forEach(function (key) { both[key] = mergeEntry && Object.prototype.hasOwnProperty.call(older, key) ? mergeEntry(older[key], newer[key]) : newer[key]; });
      out[target] = both;
    });
    return out;
  }
  /* two stored layout entries ({ desktop, tablet, phone }) for one key: the newer one's fields over the older */
  function mergeFrames(older, newer) {
    if (!older || typeof older !== 'object') return newer;
    if (!newer || typeof newer !== 'object') return older;
    var out = {};
    ['desktop', 'tablet', 'phone'].forEach(function (bp) { if (older[bp] || newer[bp]) out[bp] = Object.assign({}, older[bp], newer[bp]); });
    return out;
  }

  function finite(value, min, max) {
    value = Number(value);
    return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : null;
  }
  function oneOf(value, list) { return list.indexOf(value) >= 0 ? value : null; }
  function cleanFrame(frame) {
    frame = frame && typeof frame === 'object' ? frame : {};
    var out = {}, value;
    [['x', -10000, 10000], ['y', -10000, 10000], ['width', 1, 10000], ['height', 1, 10000],
     ['rotation', -360, 360], ['scaleX', 0.01, 100], ['scaleY', 0.01, 100], ['z', -1000, 10000],
     ['pt', 0, 400], ['pr', 0, 400], ['pb', 0, 400], ['pl', 0, 400], ['mt', -400, 400], ['mb', -400, 400],
     ['maxw', 0, 10000], ['minh', 0, 10000], ['gap', 0, 400]].forEach(function (spec) {
      value = finite(frame[spec[0]], spec[1], spec[2]); if (value !== null) out[spec[0]] = Math.round(value * 100) / 100;
    });
    var font = oneOf(frame.font, FONT_TOKENS); if (font) out.font = font;
    var textSize = oneOf(frame.textSize, TYPE_SIZE_TOKENS); if (textSize) out.textSize = textSize;
    var color = oneOf(frame.color, TEXT_TOKENS); if (color) out.color = color;
    var bg = frame.bg === 'none' ? 'none' : oneOf(frame.bg, FILL_TOKENS); if (bg) out.bg = bg;
    var radius = oneOf(frame.radius, RADIUS_TOKENS); if (radius) out.radius = radius;
    var border = oneOf(frame.border, BORDER_VALUES); if (border) out.border = border;
    var borderColor = oneOf(frame.borderColor, BORDER_TOKENS); if (borderColor) out.borderColor = borderColor;
    var overflow = oneOf(frame.overflow, OVERFLOW_VALUES); if (overflow) out.overflow = overflow;
    var op = Number(frame.op); if (OPACITY_STEPS.indexOf(op) >= 0) out.op = op;
    var fw = Number(frame.fw); if (FONT_WEIGHT_STEPS.indexOf(fw) >= 0) out.fw = fw;
    var lh = oneOf(frame.lh, LINE_HEIGHT_TOKENS); if (lh) out.lh = lh;
    var ta = oneOf(frame.ta, TEXT_ALIGN_VALUES); if (ta) out.ta = ta;
    var display = oneOf(frame.display, DISPLAY_TOKENS); if (display) out.display = display;
    var align = oneOf(frame.align, ALIGN_ITEMS_TOKENS); if (align) out.align = align;
    var justify = oneOf(frame.justify, JUSTIFY_TOKENS); if (justify) out.justify = justify;
    var wrap = oneOf(frame.wrap, WRAP_VALUES); if (wrap) out.wrap = wrap;
    return out;
  }
  function sanitize(value) {
    var out = { version: 2, routes: {}, groups: {}, labels: {} }, routes = moveScopes(value && value.routes, mergeFrames);
    if (!routes || typeof routes !== 'object') routes = {};
    Object.keys(routes).slice(0, 500).forEach(function (route) {
      if (!isScope(route)) return;
      var nodes = routes[route]; if (!nodes || typeof nodes !== 'object') return;
      var cleanNodes = {};
      Object.keys(nodes).slice(0, 3000).forEach(function (key) {
        if (!key || key.length > 500) return;
        var raw = nodes[key] || {}, clean = {};
        ['desktop', 'tablet', 'phone'].forEach(function (bp) { var frame = cleanFrame(raw[bp]); if (Object.keys(frame).length) clean[bp] = frame; });
        if (Object.keys(clean).length) cleanNodes[key] = clean;
      });
      if (Object.keys(cleanNodes).length) out.routes[route] = cleanNodes;
    });
    var groups = moveScopes(value && value.groups);
    if (groups && typeof groups === 'object') Object.keys(groups).slice(0, 500).forEach(function (route) {
      if (!isScope(route) || !groups[route] || typeof groups[route] !== 'object') return;
      var cleanGroups = {};
      Object.keys(groups[route]).slice(0, 1000).forEach(function (id) {
        var raw = groups[route][id], members = raw && Array.isArray(raw.members) ? raw.members.filter(function (key) { return typeof key === 'string' && key && key.length <= 500; }).slice(0, 200) : [];
        members = Array.from(new Set(members));
        if (members.length > 1) cleanGroups[id.replace(/[^a-z0-9_-]/gi, '').slice(0, 80)] = { members: members, label: String(raw.label || 'Group').slice(0, 120) };
      });
      if (Object.keys(cleanGroups).length) out.groups[route] = cleanGroups;
    });
    /* A real element's editable display name, keyed the same way routes/groups already are.
       Caps mirror routes' own exact numbers (500 routes, 3000 keys per route -- the same
       per-route key namespace labels share with routes, not groups' separate id namespace),
       and the 120-char cap mirrors group()'s own label field below. */
    var labels = moveScopes(value && value.labels);
    if (labels && typeof labels === 'object') Object.keys(labels).slice(0, 500).forEach(function (route) {
      if (!isScope(route) || !labels[route] || typeof labels[route] !== 'object') return;
      var cleanLabels = {};
      Object.keys(labels[route]).slice(0, 3000).forEach(function (key) {
        if (!key || key.length > 500 || typeof labels[route][key] !== 'string') return;
        var label = labels[route][key].trim().slice(0, 120);
        if (label) cleanLabels[key] = label;
      });
      if (Object.keys(cleanLabels).length) out.labels[route] = cleanLabels;
    });
    /* A plain image's alt text, keyed exactly like labels (route -> layout key). Plain
       <img>s are page-module markup with no content record of their own -- the layout key
       is the only stable identity they have, and it is the one every other per-element
       edit is already stored under. Emitted only when something is set, so a layout with
       no alt overrides serializes byte-for-byte as it did before this field existed. */
    var alts = moveScopes(value && value.alts), cleanAlts = {};
    if (alts && typeof alts === 'object') Object.keys(alts).slice(0, 500).forEach(function (route) {
      if (!isScope(route) || !alts[route] || typeof alts[route] !== 'object') return;
      var routeAlts = {};
      Object.keys(alts[route]).slice(0, 3000).forEach(function (key) {
        if (!key || key.length > 500 || typeof alts[route][key] !== 'string') return;
        var text = alts[route][key].replace(/\s+/g, ' ').trim().slice(0, ALT_MAX);
        if (text) routeAlts[key] = text;
      });
      if (Object.keys(routeAlts).length) cleanAlts[route] = routeAlts;
    });
    if (Object.keys(cleanAlts).length) out.alts = cleanAlts;
    return out;
  }
  function define(value) { current = sanitize(value); return get(); }
  function get() { return JSON.parse(JSON.stringify(current)); }
  function serialize(value) { return '/* Responsive visual overrides edited in DEFXN Studio. */\nArkLayout.define(' + JSON.stringify(sanitize(value), null, 2) + ');\n'; }
  function breakpoint(width) { return width <= 520 ? 'phone' : width <= 900 ? 'tablet' : 'desktop'; }
  function merged(entry, width) {
    var out = Object.assign({}, entry && entry.desktop || {});
    if (width <= 900) Object.assign(out, entry && entry.tablet || {});
    if (width <= 520) Object.assign(out, entry && entry.phone || {});
    return out;
  }
  /* ---- layout keys -------------------------------------------------------------------
     Every saved per-element edit (layout frames, labels, alts, groups here; state members and
     triggers in js/content/states.js; component spots in js/content/components.js; element
     motion in js/content/element-motion.js) is stored under route -> key. So a key must name
     the same AUTHORED element whatever else happens to be in the DOM when it is computed.

     It used to be a path from #scene, computed once and then frozen on the element. Which
     path depended on navigation history: the routed page sits in the outlet next to the page
     it replaces while that one exits (/chain's section was section:1 on a direct load and
     section:2 coming from Home), or inside the continuity host appended to the scene (div:7
     instead of the outlet's div:2); and a stage illustration carried over from the previous
     lifecycle stage (js/ark/stage-scenes.js moves the element itself) would keep that stage's
     key (read from the code, not measured). Measured 2026-10-18 over every catalog route
     (tests/browser/layout-key-stability.mjs): 875 of 1547 keys on / changed when arriving from
     /learnings instead of loading directly; on /chain the same page mixed div:2 and div:7 keys.
     A saved edit therefore attached to a different element, or to none, depending on how the
     visitor got there. Now a key is a pure function of the element's place in its own scope:

       page:/<path>               content of a routed page, from the page root ([data-ark-page])
                                  -- 'page:/' is the page root itself
       path:<path>                the persistent shell (header, nav, layers) from the root passed
                                  in (#scene) -- the format these keys always had
       copy:<copy key>            a runtime-built element carrying its manifest copy key
       id:<id>                    an element with an authored id
       component:<instance>[/<path>]  inside a component instance, from the instance root
       insert:<anchor id>         an anchor the editor/runtime inserted (a state's or a spot's)
       group:<id>                 a layout group wrapper (set when the group is built)
       <pinned key>[/<path>]      an element (and its subtree) a converted page pinned to the key
                                  it had before conversion (data-ark-layout-pin; js/ark/blocks.js)

     A <path> is tag:n segments, n counting same-tag siblings among the AUTHORED children only.
     What the runtime and the editor insert is never counted and never adds a segment:
       - data-ark-transient="hold" (the continuity host, a stage illustration held between two
         routes): neither it nor anything in it is content of this scope;
       - a layout group wrapper: transparent -- its members keep the keys they had before
         grouping, the wrapper adds no segment;
       - a state anchor / spot anchor ([data-ark-state-anchor], [data-ark-spot]) and a component
         instance root: their own scope, not counted among the page's children;
       - another routed page: its own scope.
     The original a component instance replaces stays in the DOM (hidden) and keeps counting:
     it is authored content. The structure decides, not a list of classes: every inserting
     module marks what it inserts (js/ark/panel-continuity.js, js/ark/stage-scenes.js,
     js/content/states.js, js/content/components.js).

     copy:/id: keys are not unique by construction, so a repeat inside one route's scope (the
     shell plus that route's page, in that order) is numbered: copy:X, copy:X#2, ... Inside a
     component instance only the instance path is used: a captured instance repeats the ids and
     copy of the originals it stands in for. The page root is always 'page:/' -- its id is
     assigned late, by js/hero-motion.js. Regression: tests/layout-keys.cjs (the rules) and
     tests/browser/layout-key-stability.mjs (every route, every history). */
  var KEY_ATTR = 'data-ark-layout-key';
  /* Tag list derived from actual usage across js/pages/*.js and js/ark/runtime.js (grep
     counted span 48x, strong 13x, small/summary/details 6x each, dl/dt/dd, table parts --
     all real content units a selection/grouping tool needs to see, not a guessed list. */
  /* caption (2026-10-19, W3-ARK-FOLLOWUPS): a table's caption is the words that introduce it --
     converted pages moved a panel heading into Ark's table caption, and with no key it could
     carry neither an edit nor a pin. Adding a tag adds keys: path segments count siblings by tag,
     so no path key moves (a caption showing a copy: key would take its place in that key's #n
     numbering; no caption shows one, and each page's continuity test holds the census). */
  var KEY_TAGS = 'header,main,footer,section,article,nav,aside,div,h1,h2,h3,h4,p,a,button,img,canvas,svg,g,path,rect,circle,ellipse,line,polyline,polygon,text,figure,figcaption,picture,video,form,ul,ol,li,span,strong,small,summary,details,dl,dt,dd,table,caption,thead,tbody,tr,th,td,label';
  function hasAttr(node, name) { return !!(node && node.hasAttribute && node.hasAttribute(name)); }
  function isHeld(node) { return !!(node && node.getAttribute && node.getAttribute('data-ark-transient') === 'hold'); }
  function isPageRoot(node) { return hasAttr(node, 'data-ark-page'); }
  function isGroupWrapper(node) { return hasAttr(node, 'data-ark-layout-group'); }
  function isInsertedAnchor(node) { return hasAttr(node, 'data-ark-state-anchor') || hasAttr(node, 'data-ark-spot'); }
  function isInstanceRoot(node) { return hasAttr(node, 'data-ark-component-key'); }
  /* a node with a scope of its own, or none: never one of its parent's authored children */
  function ownScope(node) { return isHeld(node) || isPageRoot(node) || isInsertedAnchor(node) || isInstanceRoot(node); }
  /* the authored children of `parent`: group wrappers flattened, own-scope nodes left out */
  function authoredChildren(parent, cache) {
    var cached = cache && cache.get(parent); if (cached) return cached;
    var out = [];
    Array.prototype.forEach.call(parent.children || [], function (child) {
      if (child.nodeType !== 1 || ownScope(child)) return;
      if (isGroupWrapper(child)) out.push.apply(out, authoredChildren(child, cache)); else out.push(child);
    });
    if (cache) cache.set(parent, out);
    return out;
  }
  function segment(node, parent, cache) {
    var tag = node.tagName, index = 0;
    authoredChildren(parent, cache).some(function (child) { if (child.tagName === tag) index++; return child === node; });
    return tag.toLowerCase() + ':' + index;
  }
  /* -> { kind: 'page'|'shell'|'component'|'insert'|'pinned', scope: node, path: 'tag:n/...' } or null
     (inside a held node, or not under `root`) */
  function placeOf(element, root, cache) {
    var parts = [], node = element;
    while (node && node.nodeType === 1) {
      if (isHeld(node)) return null;
      if (node !== element && hasAttr(node, 'data-ark-layout-pin') && node.getAttribute('data-ark-layout-pin-scope') !== 'self') return { kind: 'pinned', scope: node, path: parts.join('/') };
      if (isPageRoot(node)) return { kind: 'page', scope: node, path: parts.join('/') };
      if (node === root) return { kind: 'shell', scope: node, path: parts.join('/') };
      if (isInstanceRoot(node)) return { kind: 'component', scope: node, path: parts.join('/') };
      if (isInsertedAnchor(node)) return { kind: 'insert', scope: node, path: parts.join('/') };
      var parent = node.parentNode;
      while (parent && parent !== root && isGroupWrapper(parent)) parent = parent.parentNode;
      if (!parent || parent.nodeType !== 1) return null;
      if (!isGroupWrapper(node)) parts.unshift(segment(node, parent, cache));
      node = parent;
    }
    return null;
  }
  /* the key before repeats are numbered ('' = this element is not keyed at all) */
  function baseKey(element, root, cache) {
    if (!element || element.nodeType !== 1) return '';
    if (isGroupWrapper(element)) return 'group:' + element.getAttribute('data-ark-layout-group');
    var place = placeOf(element, root, cache);
    if (!place) return '';
    if (place.kind === 'component') return 'component:' + place.scope.getAttribute('data-ark-component-key') + (place.path ? '/' + place.path : '');
    if (place.kind === 'insert') return 'insert:' + place.scope.getAttribute('data-ark-insert') + (place.path ? '/' + place.path : '');
    if (place.kind === 'page' && !place.path) return 'page:/';
    /* A pinned key: the key this element had before its page was converted to data
       (js/ark/blocks.js stamps it from a block spec's `was`), so edits saved against the old
       structure still land on the same content -- saved records are never rewritten
       (docs/cms-architecture.md, "Layout keys"; tests/lib/layout-continuity.cjs). A pin anchors
       its subtree: a descendant with no copy key or id of its own is keyed by the pin plus its
       path below it, which is its old key wherever the moved subtree kept its inner structure
       (a swatch grid moved into a tab keeps all 19 of its swatches' keys with one pin) -- unless
       the pin is for itself only (data-ark-layout-pin-scope="self": a section that became a tab
       panel, whose inside is new). */
    var pin = isPinned(element) && element.getAttribute('data-ark-layout-pin');
    if (pin) return pin;
    /* an editor-only text binding (js/main.js annotateCmsPreviewCopy marks it) is not a key:
       the public page never has it, so a key from it would name nothing there */
    var copy = hasAttr(element, 'data-ark-copy-preview') ? '' : String(element.getAttribute('data-ark-copy-keys') || '').split(/\s+/).filter(Boolean)[0];
    if (copy) return 'copy:' + copy;
    if (element.id && !/^ark-r-/.test(element.id)) return 'id:' + element.id;
    if (place.kind === 'pinned') return place.scope.getAttribute('data-ark-layout-pin') + '/' + place.path;
    if (place.kind !== 'page') return 'path:' + place.path;
    /* A new element whose path happens to be a key the page pinned to another element (the old
       CMS anchor's path is now the tab list's) must not take that element's saved edits: it is
       keyed apart, '@new'. Measured on /palette's conversion (tests/palette-blocks.cjs). */
    var key = 'page:/' + place.path;
    return pinsOf(place.scope, cache)[key] ? key + '@new' : key;
  }
  function repeatable(base) { return base.indexOf('copy:') === 0 || base.indexOf('id:') === 0; }
  /* every key pinned inside a page, once per pass (`cache` is the pass's Map; null = no cache) */
  function pinsOf(page, cache) {
    var memo = cache && (cache.pins || (cache.pins = new Map()));
    var known = memo && memo.get(page); if (known) return known;
    var out = Object.create(null);
    if (page.querySelectorAll) Array.prototype.forEach.call(page.querySelectorAll('[data-ark-layout-pin]'), function (el) { out[el.getAttribute('data-ark-layout-pin')] = true; });
    if (memo) memo.set(page, out);
    return out;
  }
  /* a pinned key is already the exact (numbered) key it had: never numbered again */
  function isPinned(element) { return hasAttr(element, 'data-ark-layout-pin') && !!pageOf(element); }
  function pageOf(element) {
    for (var node = element; node && node.nodeType === 1; node = node.parentNode) if (isPageRoot(node)) return node;
    return null;
  }
  /* The route a mounted page element renders -- the same catalog lookup js/ark/scene-state.js's
     element-motion override uses. null when it cannot be told (no catalog: a unit test). */
  function routeOfPage(page) {
    var id = page && page.getAttribute('data-ark-page'), catalog = typeof ArkUI !== 'undefined' && ArkUI && ArkUI.pageCatalog;
    return id && catalog && catalog[id] && catalog[id].path ? catalog[id].path : null;
  }
  /* ---- a page's layout scope ----------------------------------------------------------------
     A page's edits are stored under its route. A page that shows different documents at one route
     (/reference?doc=...) declares a finer scope on its root: data-ark-layout-scope="doc=<id>", and
     its edits are stored under '<route>?doc=<id>'. Without it every document shared one bucket, so
     an edit made on one document landed on whatever element had the same key in every other one.
     The page names only the qualifier: the route part is always its own catalog route, so a page
     cannot declare a scope outside its route. A page that declares nothing behaves as before.
     Everything that asks "which scope are the edits of the page shown" asks scopeFor: js/main.js's
     mount/settle passes and the editor (cmsLayoutScope), and js/ark/scene-state.js's motion lookup
     (pageScope). Regression: tests/layout-document-scope.cjs. */
  var SCOPE_ATTR = 'data-ark-layout-scope';
  function pageScope(page) {
    var route = routeOfPage(page), qualifier = page && page.getAttribute && page.getAttribute(SCOPE_ATTR);
    if (!route || !qualifier || /[\s?#]/.test(qualifier)) return route;
    return isScope(route + '?' + qualifier) ? route + '?' + qualifier : route;
  }
  /* The scope the edits on `route` are stored under, for the page shown in `where` (that page's root,
     or a root holding the mounted pages, e.g. #scene): the scope its page declares, else `route`.
     A scope given as `route` (or SHELL) comes back as it is. */
  function scopeFor(route, where) {
    if (!route || route === SHELL || !where) return route;
    var pages = isPageRoot(where) ? [where] : where.querySelectorAll ? where.querySelectorAll('[data-ark-page]') : [];
    for (var i = pages.length - 1; i >= 0; i--) if (routeOfPage(pages[i]) === route) return pageScope(pages[i]) || route;
    return route;
  }
  /* Whether `element` belongs to `route`'s scope: the shell always, a page only if it is that
     route's page. While one route replaces another both pages are mounted and both have a
     'page:/' -- without this, the outgoing page (first in the outlet) took the incoming route's
     edits. No route, or a page whose route cannot be told, is in scope. `route` may be a page's
     declared scope ('/reference?doc=X'): then only the page showing that document is in it. */
  function inRoute(element, route) {
    if (!route) return true;
    var page = pageOf(element), pageRoute = page && routeOfPage(page);
    return !page || !pageRoute || pageRoute === route || pageScope(page) === route;
  }
  /* The scope an element's edits are stored under: its route when it is page content, SHELL
     when it is part of the persistent shell. A set (a group's or a state group's members, a
     captured selection) is SHELL only when every member is shell: anything that names page
     content exists on that route alone. */
  function scopeOf(element, route) { return !element || pageOf(element) ? route : SHELL; }
  function scopeOfAll(elements, route) { return elements && elements.length && elements.every(function (element) { return !pageOf(element); }) ? SHELL : route; }
  /* `route`'s value for `key` in one scope-keyed map (labels, alts): SHELL's when there is one
     and the element is not page content, else the route's own. */
  function scopedValue(map, route, key, element) {
    var every = route !== SHELL && map && map[SHELL] && map[SHELL][key];
    if (every && !(element && pageOf(element))) return every;
    return (map && map[route] && map[route][key]) || '';
  }
  /* The stored entry (per breakpoint) that applies to `key` on `route`: the route's own, with
     SHELL's fields over it for a shell element -- or null. */
  function entryOf(layout, route, key, element) {
    var own = layout.routes[route] && layout.routes[route][key];
    var every = route !== SHELL && !(element && pageOf(element)) && layout.routes[SHELL] && layout.routes[SHELL][key];
    if (!every) return own || null;
    if (!own) return every;
    var out = {};
    ['desktop', 'tablet', 'phone'].forEach(function (bp) { if (own[bp] || every[bp]) out[bp] = Object.assign({}, own[bp], every[bp]); });
    return out;
  }
  function entryFor(value, route, key, element) { return entryOf(sanitize(value), route, key, element); }
  /* Every group that applies on `route`: its own and SHELL's ({ id: { members, label, scope } }) */
  function groupsOf(layout, route) {
    var out = {};
    [route, SHELL].forEach(function (scope) {
      var groups = layout.groups[scope] || {};
      Object.keys(groups).forEach(function (id) { if (!out[id]) out[id] = { members: groups[id].members, label: groups[id].label, scope: scope }; });
    });
    return out;
  }
  function groupsFor(value, route) { return groupsOf(sanitize(value), route); }
  /* Every element annotate() considers (plus `extra`, at its place in document order), with its
     final key ('' = none). Repeats are numbered per route scope: the shell first, then each
     page on its own -- so two pages mounted at once never number each other's keys, and where
     the page sits relative to the header (outlet before it, continuity host after it) does not
     change the numbering. */
  function keyedList(root, route, extra) {
    var cache = typeof Map === 'function' ? new Map() : null;
    var all = [root].concat(Array.prototype.slice.call(root.querySelectorAll(KEY_TAGS)));
    if (extra && all.indexOf(extra) < 0) {
      var at = extra.compareDocumentPosition ? all.findIndex(function (element) { return element.compareDocumentPosition(extra) & 2; }) : -1;
      all.splice(at < 0 ? all.length : at, 0, extra);
    }
    var items = all.map(function (element) { return { element: element, page: pageOf(element), base: baseKey(element, root, cache), key: '' }; });
    var shellSeen = {}, pageSeen = new Map();
    function number(item, seen) { if (!repeatable(item.base) || isPinned(item.element)) return item.base; var n = seen[item.base] = (seen[item.base] || 0) + 1; return n > 1 ? item.base + '#' + n : item.base; }
    items.forEach(function (item) { if (item.base && !item.page) item.key = number(item, shellSeen); });
    items.forEach(function (item) {
      if (!item.base || !item.page) return;
      var seen = pageSeen.get(item.page); if (!seen) { seen = Object.assign({}, shellSeen); pageSeen.set(item.page, seen); }
      item.key = number(item, seen);
    });
    return route ? items.filter(function (item) { return inRoute(item.element, route); }) : items;
  }
  /* The key `element` has (or would have) under `root` -- the same value annotate() writes. */
  function keyFor(element, root) {
    if (!element || element.nodeType !== 1) return '';
    var base = baseKey(element, root, null);
    if (!base || !repeatable(base) || isPinned(element) || !root || !root.querySelectorAll) return base;
    var mine = keyedList(root, null, element).filter(function (item) { return item.element === element; })[0];
    return mine ? mine.key : base;
  }
  /* Writes every key in `route`'s scope (every scope when no route is given) and returns the
     keyed elements in document order. A key is recomputed on every pass -- never kept from an
     earlier one, which is how a key computed mid-transition used to stick -- and a node that
     is no longer keyed (it became a held continuity host) loses the one it had. */
  function annotate(root, route) {
    if (!root || !root.querySelectorAll) return [];
    var out = [];
    keyedList(root, route).forEach(function (item) {
      if (item.key) { if (item.element.getAttribute(KEY_ATTR) !== item.key) item.element.setAttribute(KEY_ATTR, item.key); out.push(item.element); }
      else if (item.element.removeAttribute && item.element.hasAttribute(KEY_ATTR)) item.element.removeAttribute(KEY_ATTR);
    });
    return out;
  }
  /* key -> element for `route`'s scope, from one annotate() pass (keys are unique in a scope) */
  function index(root, route) {
    var out = {};
    annotate(root, route).forEach(function (element) { var key = element.getAttribute(KEY_ATTR); if (key && !out[key]) out[key] = element; });
    return out;
  }
  /* The element `key` names in `route`'s scope, or null. Elements annotate() does not tag
     (an <em> the editor promoted into a group) are found by computing their key directly, so
     a key the editor wrote resolves on the public page too. */
  function find(root, key, route) {
    if (!root || !key) return null;
    var listed = annotate(root, route);
    for (var i = 0; i < listed.length; i++) if (listed[i].getAttribute(KEY_ATTR) === key) return listed[i];
    if (!root.querySelectorAll) return null;
    /* the cheap scope-local base key first; the full key (which numbers repeats) only on a match */
    var base = key.replace(/#\d+$/, ''), seen = typeof Set === 'function' ? new Set(listed) : null, cache = typeof Map === 'function' ? new Map() : null;
    var rest = root.querySelectorAll('*');
    for (var j = 0; j < rest.length; j++) {
      var element = rest[j];
      if ((seen ? seen.has(element) : listed.indexOf(element) >= 0) || !inRoute(element, route)) continue;
      if (baseKey(element, root, cache) === base && keyFor(element, root) === key) return element;
    }
    return null;
  }
  /* ArkLayout undoes only what ArkLayout wrote. resetElement() used to blank every `owned`
     property on EVERY annotated element under the host, on every apply() -- including inline
     geometry the page runtime owns. The router's continuity host (js/ark/panel-continuity.js)
     is sized by inline left/top/width/height and sits inside the same host, so one rAF after
     each mount its width and height were wiped: /about, whose content is inset:0 inside that
     host, rendered 0px wide at every viewport, and /download, /explore and /lifecycle (+ its
     five stages) lost the host's height and collapsed to 250-320px, their panels overlapping
     (measured 2026-10-18 at 1280x800; regression: tests/layout-reset-owns-only-its-
     writes.cjs, tests/browser/route-sweep.mjs). Now each write pass records, per element, the
     inline values it changed (before -> after); a reset puts back `before` only where the
     value is still the one ArkLayout wrote, so a value someone else changed since is theirs. */
  var written = typeof WeakMap === 'function' ? new WeakMap() : null;
  function ownedValues(element) { var out = {}; owned.forEach(function (name) { out[name] = element.style[name] || ''; }); return out; }
  function remember(element, before) {
    if (!written) return;
    var changed = {}, any = false;
    owned.forEach(function (name) { var now = element.style[name] || ''; if (now !== before[name]) { changed[name] = { before: before[name], after: now }; any = true; } });
    if (any) written.set(element, changed); else written.delete(element);
  }
  function resetElement(element) {
    var changed = written && written.get(element);
    if (changed) Object.keys(changed).forEach(function (name) { if ((element.style[name] || '') === changed[name].after) element.style[name] = changed[name].before; });
    if (written) written.delete(element);
    element.removeAttribute('data-ark-layout-applied');
  }
  function applyFrame(element, frame) {
    resetElement(element);
    var before = ownedValues(element);
    applyGroupDefault(element);
    writeFrame(element, frame);
    remember(element, before);
  }
  function writeFrame(element, frame) {
    if (!frame || !Object.keys(frame).length) return;
    element.style.translate = (frame.x || 0) + 'px ' + (frame.y || 0) + 'px';
    if (frame.width != null) { element.style.width = frame.width + 'px'; element.style.maxWidth = 'none'; element.style.minWidth = '0'; }
    if (frame.height != null) { element.style.height = frame.height + 'px'; element.style.maxHeight = 'none'; element.style.minHeight = '0'; }
    if (frame.maxw != null) element.style.maxWidth = frame.maxw + 'px';
    if (frame.minh != null) element.style.minHeight = frame.minh + 'px';
    if (frame.rotation != null) element.style.rotate = frame.rotation + 'deg';
    if (frame.scaleX != null || frame.scaleY != null) element.style.scale = (frame.scaleX == null ? 1 : frame.scaleX) + ' ' + (frame.scaleY == null ? 1 : frame.scaleY);
    if (frame.z != null) element.style.zIndex = String(frame.z);
    if (frame.pt != null) element.style.paddingTop = frame.pt + 'px';
    if (frame.pr != null) element.style.paddingRight = frame.pr + 'px';
    if (frame.pb != null) element.style.paddingBottom = frame.pb + 'px';
    if (frame.pl != null) element.style.paddingLeft = frame.pl + 'px';
    if (frame.mt != null) element.style.marginTop = frame.mt + 'px';
    if (frame.mb != null) element.style.marginBottom = frame.mb + 'px';
    if (frame.font) element.style.fontFamily = 'var(--font-' + frame.font + ')';
    if (frame.textSize) element.style.fontSize = 'var(--type-' + frame.textSize + ')';
    if (frame.fw != null) element.style.fontWeight = String(frame.fw);
    if (frame.lh) element.style.lineHeight = LINE_HEIGHT_CSS[frame.lh];
    if (frame.ta) element.style.textAlign = frame.ta;
    if (frame.color) element.style.color = 'hsl(var(--' + frame.color + '))';
    if (frame.bg) element.style.backgroundColor = frame.bg === 'none' ? 'transparent' : 'hsl(var(--' + frame.bg + '))';
    if (frame.radius) element.style.borderRadius = RADIUS_CSS[frame.radius];
    if (frame.border && frame.border !== 'none') { element.style.borderWidth = BORDER_WIDTH_CSS[frame.border]; element.style.borderStyle = 'solid'; element.style.borderColor = 'hsl(var(--' + (frame.borderColor || 'border-default') + '))'; }
    if (frame.op != null) element.style.opacity = String(frame.op / 100);
    if (frame.overflow) element.style.overflow = frame.overflow;
    if (frame.display === 'stack') { element.style.display = 'flex'; element.style.flexDirection = 'column'; }
    else if (frame.display === 'row') { element.style.display = 'flex'; element.style.flexDirection = 'row'; }
    else if (frame.display === 'grid') { element.style.display = 'grid'; element.style.gridTemplateColumns = 'repeat(auto-fit, minmax(160px, 1fr))'; }
    else if (frame.display === 'block') { element.style.display = 'block'; }
    else if (frame.display === 'hide') { element.style.display = 'none'; }
    if (frame.gap != null) element.style.gap = frame.gap + 'px';
    if (frame.align) element.style.alignItems = ALIGN_ITEMS_CSS[frame.align];
    if (frame.justify) element.style.justifyContent = JUSTIFY_CSS[frame.justify];
    if (frame.wrap) element.style.flexWrap = frame.wrap === 'yes' ? 'wrap' : 'nowrap';
    element.setAttribute('data-ark-layout-applied', '');
  }
  /* Makes the DOM's group wrappers match the groups that apply on `route` (its own and SHELL's).
     A wrapper that already holds exactly its group's members is KEPT, not rebuilt: apply() runs
     on every remount, every settle and every edit, and it used to unwrap every group and wrap it
     again in a new element each time. The persistent header is never remounted, so a selected
     header group was an emptied, detached wrapper after the next pass -- the editor's selection
     restore compared the new wrapper's text with the old one's (now '') and dropped the
     selection, hiding the toolbar under the Ungroup button (tests/browser/full-audit.mjs
     "layout group"; regression: tests/layout-shell-scope.cjs). Only `route`'s wrappers are
     touched: the page it replaces may still be leaving, grouped as it was. */
  function unwrap(group) {
    var parent = group.parentNode; if (!parent) return;
    while (group.firstChild) parent.insertBefore(group.firstChild, group);
    group.remove();
  }
  function syncGroups(root, route, layout) {
    var groups = groupsOf(layout, route), ids = Object.keys(groups);
    var wrappers = Array.prototype.slice.call(root.querySelectorAll('[data-ark-layout-group]')).filter(function (group) { return inRoute(group, route); });
    /* nothing to wrap and nothing wrapped: a full key pass (10-15 ms on a 1,500-element route)
       to find no members is skipped -- apply() annotates once right after this anyway */
    if (!ids.length && !wrappers.length) return;
    var elements = annotate(root, route), byKey = {};
    elements.forEach(function (element) { var key = element.getAttribute(KEY_ATTR); if (key && !byKey[key]) byKey[key] = element; });
    /* a group's members as elements, in document order -- `members` is recorded in selection
       (click) order, and grouping must nest elements without ever reordering them; a SHELL
       group takes shell elements only */
    function membersOf(id) {
      var group = groups[id];
      return group.members.map(function (key) { return byKey[key]; })
        .filter(function (element) { return element && (group.scope !== SHELL || !pageOf(element)); })
        .sort(function (a, b) { return elements.indexOf(a) - elements.indexOf(b); });
    }
    var kept = {};
    wrappers.slice().reverse().forEach(function (wrapper) {
      var id = wrapper.getAttribute('data-ark-layout-group'), want = groups[id] && !kept[id] ? membersOf(id) : null;
      var holds = Array.prototype.filter.call(wrapper.children, function (child) { return !ownScope(child); });
      if (want && want.length > 1 && holds.length === want.length && holds.every(function (child, i) { return child === want[i]; })) {
        kept[id] = true; wrapper.setAttribute('aria-label', groups[id].label || 'Group'); return;
      }
      unwrap(wrapper);
    });
    ids.forEach(function (id) {
      if (kept[id]) return;
      var members = membersOf(id);
      if (members.length < 2) return;
      var parent = members[0].parentNode; if (!parent || !members.every(function (element) { return element.parentNode === parent; })) return;
      var svg = parent.namespaceURI === 'http://www.w3.org/2000/svg';
      var wrapper = document.createElementNS(svg ? parent.namespaceURI : 'http://www.w3.org/1999/xhtml', svg ? 'g' : 'div');
      wrapper.setAttribute('data-ark-layout-group', id); wrapper.setAttribute(KEY_ATTR, 'group:' + id); wrapper.setAttribute('aria-label', groups[id].label || 'Group');
      if (!svg) wrapper.style.position = 'relative';
      parent.insertBefore(wrapper, members[0]); members.forEach(function (element) { wrapper.appendChild(element); });
      /* a later group can hold this one */
      byKey['group:' + id] = wrapper; elements.splice(elements.indexOf(members[0]), 0, wrapper);
    });
  }
  /* A group wrapper needs a sensible container default (flex column) even when nobody has
     styled it yet. `display`/`flexDirection` are in `owned`, so they are wiped by
     resetElement() below like every other style property -- re-establish the default right
     after the reset, before any stored frame for this group's own key (set through the
     Layout panel) is applied over it, so an explicit override still wins. */
  function applyGroupDefault(element) {
    if (!element.hasAttribute('data-ark-layout-group') || element.namespaceURI === 'http://www.w3.org/2000/svg') return;
    element.style.display = 'flex'; element.style.flexDirection = 'column'; element.style.minWidth = '0';
    /* A group keeps its members laid out the way their parent laid them out. Grouping two links
       of a header's flex ROW used to stack them in a column, 80px tall inside a 40px bar, so one
       of them vanished from view (seen in tests/browser/full-audit.mjs's layout-group surface;
       regression: tests/layout-group-follows-parent.cjs). Read from the parent's own computed
       layout, not a list of tags. */
    var parent = element.parentElement, view = element.ownerDocument && element.ownerDocument.defaultView;
    if (!parent || !view || typeof view.getComputedStyle !== 'function') return;
    var around = view.getComputedStyle(parent);
    /* A grid that places its children in columns (grid-auto-flow: column) lays them out in a row
       too: the family bar's nav is one (assets/kit/defxn-components.css .dx-bar__nav, since
       2026-10-19), and a group of two of its links stacked in one cell (full-audit layout-group
       surface; regression: tests/layout-group-follows-parent.cjs). */
    var gridRow = /grid$/.test(around.display) && /^column/.test(around.gridAutoFlow || '');
    if (gridRow || (/flex$/.test(around.display) && /^row/.test(around.flexDirection || 'row'))) {
      element.style.flexDirection = 'row';
      if (around.alignItems) element.style.alignItems = around.alignItems;
      var gap = around.columnGap && around.columnGap !== 'normal' ? around.columnGap : around.gap;
      if (gap && gap !== 'normal') element.style.gap = gap;
    }
  }
  function apply(root, route, width, value) {
    var layout = sanitize(value || current), elements, byKey = {};
    syncGroups(root, route, layout); elements = annotate(root, route);
    elements.forEach(function (element) { var key = element.getAttribute('data-ark-layout-key'); if (key && !byKey[key]) byKey[key] = element; resetElement(element); var before = ownedValues(element); applyGroupDefault(element); remember(element, before); });
    /* the route's own entries and SHELL's (a header edit shows on every route) */
    Object.keys(Object.assign({}, layout.routes[route], layout.routes[SHELL])).forEach(function (key) {
      var element = byKey[key], entry = element && entryOf(layout, route, key, element);
      if (entry) applyFrame(element, merged(entry, width));
    });
    applyAlts(root, route, layout, elements);
    return elements;
  }
  /* Sets each overridden element's alt (or aria-label, see altAttribute) and puts back the
     markup's own value on any element whose override was removed -- the originals are kept on
     the element itself (data-ark-alt-base, a JSON snapshot) the first time they are replaced,
     so removing an override restores exactly what the page module wrote. Cheap and layout-
     free, so js/main.js also runs it synchronously at mount: the server-rendered HTML
     (api/lib/render-core.mjs serializes at ark:route-ready, before ArkLayout.apply()'s
     requestAnimationFrame pass) then carries the alt text too. */
  function altBase(element) {
    try { return JSON.parse(element.getAttribute('data-ark-alt-base')); } catch (error) { return null; }
  }
  /* What the page module itself wrote for this element's text alternative (null: nothing),
     whether or not an override is applied right now. */
  function altOwn(element) {
    var attr = altAttribute(element), base = element.hasAttribute('data-ark-alt-base') ? altBase(element) : null;
    if (!attr) return null;
    var hidden = base ? base['aria-hidden'] : element.getAttribute('aria-hidden');
    return { attr: attr, own: base ? (base[attr] == null ? null : base[attr]) : element.getAttribute(attr), decorative: hidden === 'true' };
  }
  function applyAlt(element, text) {
    var touches = altTouches(element); if (!touches.length) return;
    var attr = touches[0];
    if (text) {
      if (!element.hasAttribute('data-ark-alt-base')) {
        var base = {}; touches.forEach(function (name) { base[name] = element.hasAttribute(name) ? element.getAttribute(name) : null; });
        element.setAttribute('data-ark-alt-base', JSON.stringify(base));
      }
      element.setAttribute(attr, text);
      if (attr === 'aria-label') { element.removeAttribute('aria-hidden'); if (touches.indexOf('role') >= 0) element.setAttribute('role', 'img'); }
    } else if (element.hasAttribute('data-ark-alt-base')) {
      var saved = altBase(element) || {};
      touches.forEach(function (name) { if (saved[name] == null) element.removeAttribute(name); else element.setAttribute(name, saved[name]); });
      element.removeAttribute('data-ark-alt-base');
    }
  }
  function applyAlts(root, route, value, elements) {
    if (!root || !root.querySelectorAll) return;
    var layout = sanitize(value || current);
    (elements || annotate(root, route)).forEach(function (element) {
      var key = element.getAttribute('data-ark-layout-key'), text = key ? scopedValue(layout.alts, route, key, element) : '';
      if (key && (text || element.hasAttribute('data-ark-alt-base'))) applyAlt(element, text);
    });
  }
  function setAlt(value, route, key, text) {
    var layout = sanitize(value), alts = layout.alts || (layout.alts = {}), routeAlts = alts[route] || (alts[route] = {});
    var clean = String(text == null ? '' : text).replace(/\s+/g, ' ').trim().slice(0, ALT_MAX);
    if (clean) routeAlts[key] = clean; else delete routeAlts[key];
    return sanitize(layout);
  }
  /* the alt text that applies to `key` on `route` (SHELL's for a shell element); `element`,
     when known, rules SHELL out for page content */
  function altFor(value, route, key, element) { return scopedValue(sanitize(value).alts, route, key, element); }
  function set(value, route, key, bp, patch) {
    var layout = sanitize(value), nodes = layout.routes[route] || (layout.routes[route] = {}), entry = nodes[key] || (nodes[key] = {});
    var base = Object.assign({}, entry[bp] || {});
    /* Every existing caller only ever patches a field to a concrete valid value (a segmented
       control always picks one of its own enum members), so merging cleanFrame(patch) onto
       the existing frame has never needed to literally remove a field -- until the Layers
       panel's hide toggle, which must be reversible: un-hiding has to remove 'display'
       entirely, not merely fail to set it (the element's natural CSS display, not a second
       guessed enum value, is what should show again). An explicit `null` on a recognized
       field is the one sentinel that means "delete this field," never "leave it alone" (an
       absent/undefined field already means that) -- cleanFrame itself ignores null the same
       way it ignores any other invalid value, so this is the only place that needs to know. */
    Object.keys(patch || {}).forEach(function (field) { if (patch[field] === null) delete base[field]; });
    entry[bp] = Object.assign(base, cleanFrame(patch));
    if (!Object.keys(entry[bp]).length) delete entry[bp];
    return sanitize(layout);
  }
  function remove(value, route, key, bp) {
    var layout = sanitize(value), nodes = layout.routes[route], entry = nodes && nodes[key];
    if (!entry) return layout;
    if (bp) delete entry[bp]; else delete nodes[key];
    if (entry && !Object.keys(entry).length) delete nodes[key];
    if (nodes && !Object.keys(nodes).length) delete layout.routes[route];
    return sanitize(layout);
  }
  function setLabel(value, route, key, label) {
    var layout = sanitize(value), labels = layout.labels, routeLabels = labels[route] || (labels[route] = {});
    var clean = String(label == null ? '' : label).trim().slice(0, 120);
    if (clean) routeLabels[key] = clean; else delete routeLabels[key];
    if (!Object.keys(routeLabels).length) delete labels[route];
    return sanitize(layout);
  }
  function labelFor(value, route, key, element) { return scopedValue(sanitize(value).labels, route, key, element); }

  /* ---- LAYER NAMES -----------------------------------------------------------------------
     The name the editor's Layers row shows for an element nobody has renamed (a stored label,
     setLabel/labelFor above, always wins; the caller -- js/main.js cmsRealTree -- asks this only
     when there is none). It used to be the bare tag, so a page read "div, div, section, canvas".
     Derived from what the element IS on the page, in this order, never from a list of words:
       1. identity the drafts give it: a group's name, a component instance's block label, a
          state's label (ctx.groups, ctx.components, ctx.states -- the drafts the canvas shows);
       2. the name the page itself gives it for assistive technology: aria-label, aria-labelledby,
          an image's alt, an SVG's <title>, title, placeholder;
       3. a landmark (header, nav, main, footer, aside, or a role attribute: the HTML/ARIA
          landmark elements), with the class hint below to tell two navs apart;
       4. the heading it owns: for sectioning content (section, article, aside, nav) the first
          heading whose nearest sectioning ancestor is this element -- HTML's own rule for which
          section a heading titles -- and for any other element a heading that is its direct child;
       5. its words, when they are its own: a text node directly inside it, or every layer under
          it is a leaf (a link of spans, a list of items) -- truncated;
       6. a hint from its id or its first authored class ('hero-copy' -> 'Hero copy'), skipping the
          runtime's atom classes (ArkAtomizer minted them: they name a declaration, not a thing);
       7. the first words it holds (an <li> around a button, a bare wrapper);
       8. its tag.
     -> { name, from } (`from`: group | component | state | aria | landmark | role | heading | text
     | hint | tag). `ctx.leafRows`: whether every layer row under the element is a leaf (true for a leaf).
     Reads only the element and its subtree; a whole tree of ~1,500 layers names in a few ms
     (tests/layer-names.cjs measures it). */
  var NAME_MAX = 40;
  var HEADING = 'h1,h2,h3,h4,h5,h6,[role="heading"]', SECTIONING = 'section,article,aside,nav';
  var LANDMARK_TAG = /^(header|footer|main|nav|aside)$/;
  function nameText(text) {
    var t = String(text || '').replace(/\s+/g, ' ').trim();
    return t.length > NAME_MAX ? t.slice(0, NAME_MAX - 1).replace(/\s+$/, '') + '…' : t;
  }
  function capital(text) { return text ? text.charAt(0).toUpperCase() + text.slice(1) : text; }
  function attr(element, name) { var v = element.getAttribute && element.getAttribute(name); return v ? nameText(v) : ''; }
  function isHeadingEl(element) { return /^h[1-6]$/i.test(element.tagName || '') || (element.getAttribute && element.getAttribute('role') === 'heading'); }
  function ariaName(element) {
    var own = attr(element, 'aria-label'); if (own) return own;
    var by = element.getAttribute && element.getAttribute('aria-labelledby'), doc = element.ownerDocument;
    if (by && doc) {
      var words = by.split(/\s+/).map(function (id) { var target = doc.getElementById(id); return target ? wordsOf(target, '') : ''; }).join(' ');
      if (nameText(words)) return nameText(words);
    }
    var alt = attr(element, 'alt'); if (alt) return alt;
    if (/^svg$/i.test(element.tagName || '')) {
      for (var c = element.firstElementChild; c; c = c.nextElementSibling) if (/^title$/i.test(c.tagName) && nameText(c.textContent)) return nameText(c.textContent);
    }
    return attr(element, 'title') || attr(element, 'placeholder');
  }
  function ownHeading(element) {
    var tag = String(element.tagName || '').toLowerCase();
    if (SECTIONING.split(',').indexOf(tag) >= 0 && element.querySelectorAll) {
      var all = element.querySelectorAll(HEADING);
      for (var i = 0; i < all.length; i++) if (all[i].closest(SECTIONING) === element && nameText(all[i].textContent)) return all[i];
      return null;
    }
    for (var c = element.firstElementChild; c; c = c.nextElementSibling) if (isHeadingEl(c) && nameText(c.textContent)) return c;
    return null;
  }
  /* an element's words, an element boundary read as a space (textContent glues "chain.<br>A" and
     "<li>One</li><li>Two</li>"); stops once it has more than a name's worth */
  function wordsOf(node, out) {
    for (var n = node.firstChild; n && out.length <= NAME_MAX * 2; n = n.nextSibling) {
      if (n.nodeType === 3) out += n.nodeValue;
      else if (n.nodeType === 1 && !/^(script|style|template)$/i.test(n.tagName)) out = wordsOf(n, out + ' ') + ' ';
    }
    return out;
  }
  function ownWords(element) {
    for (var n = element.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && /\S/.test(n.nodeValue)) return true;
    return false;
  }
  function isAtomClass(cls) {
    var atomizer = typeof ArkAtomizer !== 'undefined' ? ArkAtomizer : null;
    return !!(atomizer && ((atomizer.declaration && atomizer.declaration(cls)) || (atomizer.pinDeclaration && atomizer.pinDeclaration(cls))));
  }
  /* 'hero-copy' / 'heroCopy' / 'hero_copy' -> 'hero copy'; '' when it carries no word (digits, a hash) */
  function hintWords(token) {
    var words = String(token || '').replace(/([a-z])([A-Z])/g, '$1 $2').split(/[-_\s]+/).filter(function (w) { return /[a-z]{2,}/i.test(w) && !/\d{3,}/.test(w); });
    return words.length ? words.join(' ').toLowerCase().slice(0, 28) : '';
  }
  function classHint(element) {
    var id = element.id && hintWords(element.id); if (id) return id;
    var classes = String((element.getAttribute && element.getAttribute('class')) || '').split(/\s+/);
    for (var i = 0; i < classes.length; i++) { if (!classes[i] || isAtomClass(classes[i])) continue; var h = hintWords(classes[i]); if (h) return h; }
    return '';
  }
  function scopedGroup(map, route) { return (map && map[route]) || {}; }
  function layerName(element, key, ctx) {
    ctx = ctx || {};
    var tag = String(element.tagName || '').toLowerCase(), route = ctx.route;
    if (key && key.indexOf('group:') === 0) {
      var groupId = key.slice(6), groups = ctx.groups || {}, g = groups[groupId];
      if (g && g.label) return { name: nameText(g.label), from: 'group' };
    }
    var masterId = element.getAttribute && element.getAttribute('data-ark-component-master');
    if (masterId) {
      var master = ctx.components && ctx.components.masters && ctx.components.masters[masterId];
      return { name: nameText((master && master.label) || masterId), from: 'component' };
    }
    var stateGroup = element.getAttribute && element.hasAttribute('data-ark-state-index') && element.getAttribute('data-ark-state-group');
    if (stateGroup) {
      var states = ctx.states && ctx.states.routes, group = scopedGroup(states, route)[stateGroup] || scopedGroup(states, SHELL)[stateGroup];
      var state = group && group.states && group.states[Number(element.getAttribute('data-ark-state-index'))];
      if (state && state.label) return { name: nameText(state.label), from: 'state' };
    }
    var aria = ariaName(element); if (aria) return { name: aria, from: 'aria' };
    var role = element.getAttribute && element.getAttribute('role');
    if (LANDMARK_TAG.test(tag) || (role && role !== 'presentation' && role !== 'none' && role !== 'heading')) {
      var lhint = classHint(element);
      return { name: capital(role || tag) + (lhint ? ' · ' + lhint : ''), from: role ? 'role' : 'landmark' };
    }
    var heading = ownHeading(element); if (heading) return { name: nameText(wordsOf(heading, '')), from: 'heading' };
    if (ownWords(element) || ctx.leafRows) { var words = nameText(wordsOf(element, '')); if (words) return { name: words, from: 'text' }; }
    var hint = classHint(element); if (hint) return { name: capital(hint), from: 'hint' };
    /* nothing names it but what it holds (an <li> around a button, a bare wrapper): its first words
       say where it is better than its tag does */
    var held = nameText(wordsOf(element, '')); if (held) return { name: held, from: 'text' };
    return { name: tag, from: 'tag' };
  }
  function group(value, route, id, members, label) {
    var layout = sanitize(value), routes = layout.groups, groups = routes[route] || (routes[route] = {});
    groups[id] = { members: members, label: label || 'Group' }; return sanitize(layout);
  }
  /* A group id is unique (a time stamp plus randomness), so ungrouping removes it from whichever
     scope holds it -- `route` or SHELL -- and the caller need not know which. */
  function ungroup(value, route, id) {
    var layout = sanitize(value);
    [route, SHELL].forEach(function (scope) {
      var groups = layout.groups[scope]; if (groups) { delete groups[id]; if (!Object.keys(groups).length) delete layout.groups[scope]; }
      var nodes = layout.routes[scope]; if (nodes) { delete nodes['group:' + id]; if (!Object.keys(nodes).length) delete layout.routes[scope]; }
    });
    return sanitize(layout);
  }
  return { define: define, get: get, sanitize: sanitize, serialize: serialize, breakpoint: breakpoint, merged: merged, annotate: annotate, keyFor: keyFor, find: find, index: index, inRoute: inRoute, apply: apply,
    scopeFor: scopeFor, pageScope: pageScope, moveScopes: moveScopes, MOVED_SCOPES: MOVED_SCOPES,
    SHELL: SHELL, isScope: isScope, scopeOf: scopeOf, scopeOfAll: scopeOfAll, entryFor: entryFor, groupsFor: groupsFor, applyFrame: applyFrame, applyGroupDefault: applyGroupDefault, set: set, remove: remove, group: group, ungroup: ungroup, setLabel: setLabel, labelFor: labelFor, layerName: layerName,
    setAlt: setAlt, altFor: altFor, applyAlt: applyAlt, applyAlts: applyAlts, altAttribute: altAttribute, altOwn: altOwn, ALT_MAX: ALT_MAX,
    TEXT_TOKENS: TEXT_TOKENS, FILL_TOKENS: FILL_TOKENS, BORDER_TOKENS: BORDER_TOKENS, FONT_TOKENS: FONT_TOKENS, TYPE_SIZE_TOKENS: TYPE_SIZE_TOKENS, RADIUS_TOKENS: RADIUS_TOKENS, RADIUS_CSS: RADIUS_CSS,
    DISPLAY_TOKENS: DISPLAY_TOKENS, ALIGN_ITEMS_TOKENS: ALIGN_ITEMS_TOKENS, JUSTIFY_TOKENS: JUSTIFY_TOKENS, LINE_HEIGHT_TOKENS: LINE_HEIGHT_TOKENS,
    BORDER_VALUES: BORDER_VALUES, WRAP_VALUES: WRAP_VALUES, OPACITY_STEPS: OPACITY_STEPS, OVERFLOW_VALUES: OVERFLOW_VALUES, FONT_WEIGHT_STEPS: FONT_WEIGHT_STEPS, TEXT_ALIGN_VALUES: TEXT_ALIGN_VALUES };
})();

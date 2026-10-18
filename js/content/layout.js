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
    var out = { version: 2, routes: {}, groups: {}, labels: {} }, routes = value && value.routes;
    if (!routes || typeof routes !== 'object') routes = {};
    Object.keys(routes).slice(0, 500).forEach(function (route) {
      if (route[0] !== '/' || route.length > 300) return;
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
    var groups = value && value.groups;
    if (groups && typeof groups === 'object') Object.keys(groups).slice(0, 500).forEach(function (route) {
      if (route[0] !== '/' || route.length > 300 || !groups[route] || typeof groups[route] !== 'object') return;
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
    var labels = value && value.labels;
    if (labels && typeof labels === 'object') Object.keys(labels).slice(0, 500).forEach(function (route) {
      if (route[0] !== '/' || route.length > 300 || !labels[route] || typeof labels[route] !== 'object') return;
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
    var alts = value && value.alts, cleanAlts = {};
    if (alts && typeof alts === 'object') Object.keys(alts).slice(0, 500).forEach(function (route) {
      if (route[0] !== '/' || route.length > 300 || !alts[route] || typeof alts[route] !== 'object') return;
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
  function pathKey(element, root) {
    var parts = [], node = element;
    while (node && node !== root && node.nodeType === 1) {
      var tag = node.tagName.toLowerCase(), index = 1, sibling = node;
      while ((sibling = sibling.previousElementSibling)) if (sibling.tagName === node.tagName) index++;
      parts.unshift(tag + ':' + index); node = node.parentElement;
    }
    return 'path:' + parts.join('/');
  }
  function keyFor(element, root) {
    if (!element || element.nodeType !== 1) return '';
    var existing = element.getAttribute('data-ark-layout-key'); if (existing) return existing;
    var copy = String(element.getAttribute('data-ark-copy-keys') || '').split(/\s+/).filter(Boolean)[0];
    if (copy) return 'copy:' + copy;
    if (element.id && !/^ark-r-/.test(element.id)) return 'id:' + element.id;
    return pathKey(element, root);
  }
  function annotate(root) {
    if (!root || !root.querySelectorAll) return [];
    /* Tag list derived from actual usage across js/pages/*.js and js/ark/runtime.js (grep
       counted span 48x, strong 13x, small/summary/details 6x each, dl/dt/dd, table parts --
       all real content units a selection/grouping tool needs to see, not a guessed list. */
    var elements = [root].concat(Array.prototype.slice.call(root.querySelectorAll('header,main,footer,section,article,nav,aside,div,h1,h2,h3,h4,p,a,button,img,canvas,svg,g,path,rect,circle,ellipse,line,polyline,polygon,text,figure,figcaption,picture,video,form,ul,ol,li,span,strong,small,summary,details,dl,dt,dd,table,thead,tbody,tr,th,td,label')));
    elements.forEach(function (element) { var key = keyFor(element, root); if (key) element.setAttribute('data-ark-layout-key', key); });
    return elements;
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
  function unwrapGroups(root) {
    Array.prototype.slice.call(root.querySelectorAll('[data-ark-layout-group]')).reverse().forEach(function (group) {
      var parent = group.parentNode; if (!parent) return;
      while (group.firstChild) parent.insertBefore(group.firstChild, group);
      group.remove();
    });
  }
  function buildGroups(root, route, layout) {
    var groups = layout.groups[route] || {}, elements = annotate(root), byKey = {};
    elements.forEach(function (element) { var key = element.getAttribute('data-ark-layout-key'); if (key && !byKey[key]) byKey[key] = element; });
    Object.keys(groups).forEach(function (id) {
      var members = groups[id].members.map(function (key) { return byKey[key]; }).filter(Boolean);
      if (members.length < 2) return;
      /* `members` is recorded in selection (click) order, not document order -- grouping must
         nest elements without ever reordering them, so sort back to where they already sit. */
      members.sort(function (a, b) { return elements.indexOf(a) - elements.indexOf(b); });
      var parent = members[0].parentNode; if (!parent || !members.every(function (element) { return element.parentNode === parent; })) return;
      var svg = parent.namespaceURI === 'http://www.w3.org/2000/svg';
      var wrapper = document.createElementNS(svg ? parent.namespaceURI : 'http://www.w3.org/1999/xhtml', svg ? 'g' : 'div');
      wrapper.setAttribute('data-ark-layout-group', id); wrapper.setAttribute('data-ark-layout-key', 'group:' + id); wrapper.setAttribute('aria-label', groups[id].label || 'Group');
      if (!svg) wrapper.style.position = 'relative';
      parent.insertBefore(wrapper, members[0]); members.forEach(function (element) { wrapper.appendChild(element); });
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
    if (/flex$/.test(around.display) && /^row/.test(around.flexDirection || 'row')) {
      element.style.flexDirection = 'row';
      if (around.alignItems) element.style.alignItems = around.alignItems;
      var gap = around.columnGap && around.columnGap !== 'normal' ? around.columnGap : around.gap;
      if (gap && gap !== 'normal') element.style.gap = gap;
    }
  }
  function apply(root, route, width, value) {
    var layout = sanitize(value || current), nodes = layout.routes[route] || {}, elements, byKey = {};
    unwrapGroups(root); buildGroups(root, route, layout); elements = annotate(root);
    elements.forEach(function (element) { var key = element.getAttribute('data-ark-layout-key'); if (key && !byKey[key]) byKey[key] = element; resetElement(element); var before = ownedValues(element); applyGroupDefault(element); remember(element, before); });
    Object.keys(nodes).forEach(function (key) { if (byKey[key]) applyFrame(byKey[key], merged(nodes[key], width)); });
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
    var layout = sanitize(value || current), routeAlts = (layout.alts && layout.alts[route]) || {};
    (elements || annotate(root)).forEach(function (element) {
      var key = element.getAttribute('data-ark-layout-key');
      if (key && (routeAlts[key] || element.hasAttribute('data-ark-alt-base'))) applyAlt(element, routeAlts[key] || '');
    });
  }
  function setAlt(value, route, key, text) {
    var layout = sanitize(value), alts = layout.alts || (layout.alts = {}), routeAlts = alts[route] || (alts[route] = {});
    var clean = String(text == null ? '' : text).replace(/\s+/g, ' ').trim().slice(0, ALT_MAX);
    if (clean) routeAlts[key] = clean; else delete routeAlts[key];
    return sanitize(layout);
  }
  function altFor(value, route, key) {
    var layout = sanitize(value);
    return (layout.alts && layout.alts[route] && layout.alts[route][key]) || '';
  }
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
  function labelFor(value, route, key) {
    var layout = sanitize(value), routeLabels = layout.labels[route];
    return (routeLabels && routeLabels[key]) || '';
  }
  function group(value, route, id, members, label) {
    var layout = sanitize(value), routes = layout.groups, groups = routes[route] || (routes[route] = {});
    groups[id] = { members: members, label: label || 'Group' }; return sanitize(layout);
  }
  function ungroup(value, route, id) {
    var layout = sanitize(value), groups = layout.groups[route]; if (groups) { delete groups[id]; if (!Object.keys(groups).length) delete layout.groups[route]; }
    var nodes = layout.routes[route]; if (nodes) { delete nodes['group:' + id]; if (!Object.keys(nodes).length) delete layout.routes[route]; }
    return sanitize(layout);
  }
  return { define: define, get: get, sanitize: sanitize, serialize: serialize, breakpoint: breakpoint, merged: merged, annotate: annotate, keyFor: keyFor, apply: apply, applyFrame: applyFrame, applyGroupDefault: applyGroupDefault, set: set, remove: remove, group: group, ungroup: ungroup, setLabel: setLabel, labelFor: labelFor,
    setAlt: setAlt, altFor: altFor, applyAlt: applyAlt, applyAlts: applyAlts, altAttribute: altAttribute, altOwn: altOwn, ALT_MAX: ALT_MAX,
    TEXT_TOKENS: TEXT_TOKENS, FILL_TOKENS: FILL_TOKENS, BORDER_TOKENS: BORDER_TOKENS, FONT_TOKENS: FONT_TOKENS, TYPE_SIZE_TOKENS: TYPE_SIZE_TOKENS, RADIUS_TOKENS: RADIUS_TOKENS, RADIUS_CSS: RADIUS_CSS,
    DISPLAY_TOKENS: DISPLAY_TOKENS, ALIGN_ITEMS_TOKENS: ALIGN_ITEMS_TOKENS, JUSTIFY_TOKENS: JUSTIFY_TOKENS, LINE_HEIGHT_TOKENS: LINE_HEIGHT_TOKENS,
    BORDER_VALUES: BORDER_VALUES, WRAP_VALUES: WRAP_VALUES, OPACITY_STEPS: OPACITY_STEPS, OVERFLOW_VALUES: OVERFLOW_VALUES, FONT_WEIGHT_STEPS: FONT_WEIGHT_STEPS, TEXT_ALIGN_VALUES: TEXT_ALIGN_VALUES };
})();

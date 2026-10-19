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
   separate resync step to get wrong, unlike the deleted standalone canvas's
   deep-copy-plus-resync design (the old admin-studio.html's own component/
   instance system), which needed copies because its node graph was mutated
   in place.

   Shape: { version, masters: { masterId: { resolver, props, label, tree?, detached? } },
            routes: { route: { anchorId: [ { key, masterId, overrides } ] } },
            spots?: { route: { anchorId: { after: layoutKey, replaces: [layoutKey...] } } } }
   `route` is a path ('/about'), the same keying ArkLayout.routes already
   uses -- not a pageCatalog key -- so the two modules agree on what "this
   route" means.

   CAPTURED components ("Make into component", js/main.js): arbitrary page markup is not
   any typed block, so a selection is captured as a master whose resolver is
   RBLOCK_CAPTURED_V1 and whose `tree` is the selection's own sanitized element structure.
   Its props are not a fixed list: every non-blank text node and every <img> src/alt in the
   tree is a slot, named from the element that holds it (propsOf), and the master's props
   are the captured values -- so editing the definition is editing those slots, and an
   instance override is the same per-slot override every typed block already has.
   A SPOT is an anchor the page module never declared: created on render right after the
   real element `after`, it is how an instance takes the place of the selection it was made
   from (`replaces` is hidden while the spot has an instance) and how a block is inserted
   after any element. A spot with no instance left is dropped by sanitize(), which is what
   brings the replaced originals back when the last instance there is removed. */
var ArkComponents = (function () {
  'use strict';

  var current = { version: 1, masters: {}, routes: {} };

  /* ---- what a master can be. Three kinds, and sanitize() keeps a master only when it is one:
       an ARK BLOCK  -- resolver ARK_BLOCK_<NAME>: one of @deadark/ark-ui/blocks' premade blocks
                        (hero, card, stat, table, tabs, ...), registered as an ArkUI resolver by
                        js/ark/blocks.js looping ArkKit.ARK_BLOCK_NAMES. What the Library offers
                        to create from nothing (W2-LIBRARY, docs/ux-audit/components.md §5 line 6).
       a CAPTURED selection -- RBLOCK_CAPTURED_V1, see the header; its props come from its tree.
       a LEGACY typed block -- RBLOCK_TEXT/CTA/IMAGE/CARD/QUOTE/DIVIDER_V1, the six hand-built
                        resolvers the Library offered before Ark had blocks (js/resolvers/blocks/).
                        READ ALIASES, kept as-is (future law: a saved master is never migrated in
                        place), rendering byte-identically (tests/components-legacy-continuity.cjs).
     Anything else is dropped by sanitize() -- this is the whitelist Part 3's design calls for,
     so Studio can never write a master pointing at one of the hero-scene's own %/u-space
     resolvers. */
  var CAPTURED = 'RBLOCK_CAPTURED_V1';

  /* The legacy blocks, each described ONCE in the Ark prop-schema vocabulary (kind, label,
     values) so the editor draws their fields with the same schema-driven editor as an Ark
     block's -- the names and values are what each resolver file reads (p.heading, p.align ===
     'center', ...). `primary` is the prop each one shows as visible text (starterProps).
     `successor` names the Ark block that does the same job: while the loaded registry has it,
     the legacy block is no longer offered for NEW components (it still renders and edits);
     Ark ships no prose `text` and no `divider` block yet (2026-10-19), so Text and Divider are
     still offered, and step aside by themselves the day Ark adds them. */
  var LEGACY = {
    RBLOCK_TEXT_V1: { label: 'Text', description: 'A heading and a paragraph.', group: 'text', primary: 'heading', successor: 'text',
      props: { heading: { kind: 'line', label: 'Heading' }, body: { kind: 'text', label: 'Paragraph' }, align: { kind: 'enum', label: 'Alignment', values: ['left', 'center'] }, size: { kind: 'enum', label: 'Heading size', values: ['h2', 'h3'] } } },
    RBLOCK_CTA_V1: { label: 'Button / link', description: 'One button that opens a page or a site.', group: 'text', primary: 'label', successor: 'actions',
      props: { label: { kind: 'line', label: 'Button text' }, href: { kind: 'href', label: 'Link' }, variant: { kind: 'enum', label: 'Look', values: ['primary', 'secondary'] } } },
    RBLOCK_IMAGE_V1: { label: 'Image', description: 'An image with a caption.', group: 'media', primary: 'caption', successor: 'figure',
      props: { src: { kind: 'line', label: 'Image address' }, alt: { kind: 'line', label: 'Alt text', help: 'what the image shows, read aloud by screen readers' }, caption: { kind: 'text', label: 'Caption' } } },
    RBLOCK_CARD_V1: { label: 'Card', description: 'An icon, a title and a sentence.', group: 'navigation', primary: 'title', successor: 'card',
      props: { icon: { kind: 'line', label: 'Icon name' }, title: { kind: 'line', label: 'Title' }, text: { kind: 'text', label: 'Text' } } },
    RBLOCK_QUOTE_V1: { label: 'Quote', description: 'Someone\'s words and who said them.', group: 'text', primary: 'quote', successor: 'quote',
      props: { quote: { kind: 'text', label: 'Quote' }, attribution: { kind: 'line', label: 'Who said it' } } },
    RBLOCK_DIVIDER_V1: { label: 'Divider', description: 'A line between two parts of a page.', group: 'layout', primary: '', successor: 'divider', props: {} }
  };
  var LEGACY_RESOLVERS = Object.keys(LEGACY);
  var RESOLVERS = LEGACY_RESOLVERS.concat([CAPTURED]);
  /* each legacy resolver's real prop names, in the order its master stores them (cleanProps) */
  var RESOLVER_PROPS = {};
  LEGACY_RESOLVERS.forEach(function (r) { RESOLVER_PROPS[r] = Object.keys(LEGACY[r].props); });

  /* ---- the Ark block registry. Read from ArkKit (js/ark/vendor/ark-kit.js on the editor,
     ark-kit-public.js on the site) WHEN it is there: an Ark master is recognised by the SHAPE
     of its resolver name, never by registry membership, so a components-data.js that loads
     before ArkKit -- or a record written by a newer Ark with a block this one lacks -- is never
     dropped by sanitize() (future law: saved records outlive editors). The name is derived:
     hero -> ARK_BLOCK_HERO, section-header -> ARK_BLOCK_SECTION_HEADER (js/ark/blocks.js
     registers exactly these). */
  var ARK_PREFIX = 'ARK_BLOCK_';
  var ARK_RESOLVER = /^ARK_BLOCK_[A-Z][A-Z0-9_]{0,63}$/;
  function isArk(resolver) { return typeof resolver === 'string' && ARK_RESOLVER.test(resolver); }
  function isKnownResolver(resolver) { return RESOLVERS.indexOf(resolver) >= 0 || isArk(resolver); }
  function arkResolverFor(name) { return ARK_PREFIX + String(name || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_'); }
  var described = null;
  function registry() {
    if (described) return described;
    var kit = typeof ArkKit !== 'undefined' && ArkKit && typeof ArkKit.describeArkBlocks === 'function' ? ArkKit : null;
    if (!kit) return [];                                   /* not loaded (yet): asked again next time */
    try { described = kit.describeArkBlocks() || []; } catch (e) { return []; }
    return described;
  }
  function descriptorOf(resolver) {
    if (!isArk(resolver)) return null;
    return registry().find(function (d) { return arkResolverFor(d.name) === resolver; }) || null;
  }
  /* the block name an Ark resolver stands for, registry or not ('ARK_BLOCK_CARD_GRID' -> 'card-grid') */
  function arkBlockName(resolver) {
    var d = descriptorOf(resolver);
    if (d) return d.name;
    return isArk(resolver) ? resolver.slice(ARK_PREFIX.length).toLowerCase().replace(/_/g, '-') : null;
  }
  function eachSchema(schemas, visit) {
    Object.keys(schemas || {}).forEach(function (name) {
      (function walk(s) {
        if (!s || typeof s !== 'object') return;
        visit(s);
        walk(s.of); if (s.values && !Array.isArray(s.values)) walk(s.values);
        Object.keys(s.fields || {}).forEach(function (k) { walk(s.fields[k]); });
      })(schemas[name]);
    });
  }

  /* ---- the Library's groups (docs/ux-audit/cms.md P2-5, IA: Text, Media, Layout, Data,
     Navigation, Captured). A block's group is decided by its STRUCTURE first -- a block that
     holds other blocks is Layout, one that takes an image or a live slot is Media -- and
     otherwise by the category Ark gives it, where only Ark's word "content" is renamed (to
     "Text"); a category Ark adds later becomes its own group, named after itself. */
  var GROUP_ORDER = ['text', 'media', 'layout', 'data', 'navigation', 'captured'];
  var GROUP_NAMES = { text: 'Text', media: 'Media', layout: 'Layout', data: 'Data', navigation: 'Navigation', captured: 'Captured' };
  function groupName(group) { return GROUP_NAMES[group] || (String(group || '').charAt(0).toUpperCase() + String(group || '').slice(1)); }
  function groupOfDescriptor(d) {
    var nests = false, media = false;
    eachSchema(d.props, function (s) {
      if (s.kind === 'blocks') nests = true;
      if (s.kind === 'slot' || (s.kind === 'object' && s.fields && s.fields.src)) media = true;
    });
    if (nests) return 'layout';
    if (media) return 'media';
    return d.category === 'content' ? 'text' : String(d.category || 'text');
  }
  function groupOf(resolver) {
    if (resolver === CAPTURED) return 'captured';
    if (LEGACY[resolver]) return LEGACY[resolver].group;
    var d = descriptorOf(resolver);
    return d ? groupOfDescriptor(d) : 'text';
  }
  function groups() { return GROUP_ORDER.map(function (g) { return { group: g, label: groupName(g) }; }); }

  function labelOf(resolver) {
    if (resolver === CAPTURED) return 'Made from a selection';
    if (LEGACY[resolver]) return LEGACY[resolver].label;
    var d = descriptorOf(resolver);
    if (d) return d.label;
    var name = arkBlockName(resolver);
    return name ? name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ') : String(resolver || '');
  }

  /* The blocks a person can create from nothing, in group order: every Ark block in the loaded
     registry, then each legacy block whose successor the registry does not have yet. A captured
     component is never in this list (it is made from a selection). Each entry:
     { resolver, name, label, description, group, groupLabel, props: [names], legacy, example } */
  function blocks() {
    var out = [];
    var names = registry().map(function (d) { return d.name; });
    registry().forEach(function (d) {
      var group = groupOfDescriptor(d);
      out.push({ resolver: arkResolverFor(d.name), name: d.name, label: d.label, description: d.description || '', group: group, groupLabel: groupName(group),
        props: Object.keys(d.props || {}), legacy: false, example: JSON.parse(JSON.stringify(d.example || {})) });
    });
    LEGACY_RESOLVERS.forEach(function (r) {
      if (names.indexOf(LEGACY[r].successor) >= 0) return;
      out.push({ resolver: r, name: r, label: LEGACY[r].label, description: LEGACY[r].description, group: LEGACY[r].group, groupLabel: groupName(LEGACY[r].group),
        props: RESOLVER_PROPS[r].slice(), legacy: true, example: {} });
    });
    var rank = function (g) { var i = GROUP_ORDER.indexOf(g); return i < 0 ? GROUP_ORDER.length : i; };
    return out.map(function (b, i) { return { b: b, i: i }; }).sort(function (x, y) { return rank(x.b.group) - rank(y.b.group) || x.i - y.i; }).map(function (x) { return x.b; });
  }

  /* One editor field per prop, in the Ark prop-schema vocabulary ({ prop, kind, label, ... }):
     an Ark block's from the registry (the editor prefers the SDK's getCmsArkBlockEditorFields,
     which is generated from the same registry -- tests/components-library.cjs holds them equal),
     a legacy block's from LEGACY, a captured component's one text field per slot, named from
     the slot ('link2' -> "Link 2"). */
  function slotLabel(name) { var m = /^([a-z]+?)([A-Z][a-z]*)?(\d*)$/.exec(name) || [name, name, '', '']; return (m[1].charAt(0).toUpperCase() + m[1].slice(1) + (m[2] ? ' ' + m[2].toLowerCase() : '') + (m[3] ? ' ' + m[3] : '')); }
  function fieldsOf(master) {
    if (!master) return [];
    var schemas = null;
    /* a captured slot is one run of text (or an image's address): one line */
    if (master.resolver === CAPTURED) return slotsOf(master.tree).map(function (name) { return { prop: name, kind: 'line', label: slotLabel(name) }; });
    if (LEGACY[master.resolver]) schemas = LEGACY[master.resolver].props;
    else { var d = descriptorOf(master.resolver); if (d) schemas = d.props; }
    if (!schemas) return Object.keys(master.props || {}).map(function (name) { return { prop: name, kind: 'text', label: slotLabel(name) }; });
    return Object.keys(schemas).map(function (name) { return Object.assign({ prop: name }, JSON.parse(JSON.stringify(schemas[name]))); });
  }

  /* The prop each block shows as visible text, so a block created with nothing typed in yet
     still renders as SOMETHING (regression: tests/components-starter-props.cjs). A Text block
     with props {} renders an empty <section> of zero size: added as a new state's content it
     was invisible, and with a 'self' trigger it was also unclickable, so the state group could
     never be clicked past it. A Divider has no text and needs none (it renders an <hr>).
     An Ark block starts from its registry example (Ark tests that every example is valid), with
     the text put into its first required one-line or text prop -- derived from the schema. */
  function primaryOf(resolver) {
    if (LEGACY[resolver]) return LEGACY[resolver].primary;
    var d = descriptorOf(resolver); if (!d) return '';
    var names = Object.keys(d.props || {}), textual = function (n) { return d.props[n].kind === 'line' || d.props[n].kind === 'text'; };
    return names.find(function (n) { return textual(n) && d.props[n].required; }) || names.find(textual) || '';
  }
  function starterProps(resolver, text) {
    var props = {}, d = descriptorOf(resolver);
    if (d) props = JSON.parse(JSON.stringify(d.example || {}));
    var key = primaryOf(resolver);
    if (key && text) props[key] = String(text).slice(0, 4000);
    return props;
  }

  var ID = /^[a-z][a-z0-9_-]{0,79}$/i;
  var ROUTE = /^\/\S{0,299}$/;
  /* The persistent shell's scope -- an instance placed in the header shows on every route
     (js/content/layout.js, "scopes": ArkLayout.SHELL is the same '*'; repeated here so a draft
     sanitizes without that file loaded, held equal by tests/layout-shell-scope.cjs). */
  var SHELL = '*';
  function isScope(route) { return route === SHELL || ROUTE.test(route || ''); }
  /* An anchor id is unique, so the scope that holds it is the route's own or SHELL's: a caller
     that names the route it shows finds an instance stored for every route too. */
  function scopeHolding(draft, route, anchorId) {
    if (draft.routes[route] && draft.routes[route][anchorId]) return route;
    return draft.routes[SHELL] && draft.routes[SHELL][anchorId] ? SHELL : route;
  }
  function instancesAt(value, route, anchorId) {
    var draft = sanitize(value), scope = scopeHolding(draft, route, anchorId);
    return (draft.routes[scope] && draft.routes[scope][anchorId]) || [];
  }

  function isPlainObject(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function okValue(v) { return (typeof v === 'string' && v.length <= 4000) || (typeof v === 'number' && isFinite(v)) || typeof v === 'boolean'; }
  /* An Ark block's props are structured (an actions list, table rows, a status object), so they
     are kept by SHAPE: plain data of bounded size -- strings, finite numbers, booleans, null (a
     stat's null IS its absent reading), lists and plain objects, nested a few levels. Kept even
     when the loaded registry does not declare the prop: a record written by a newer editor must
     survive an older one (future law). Whether the props are RIGHT for the block is the save
     path's question -- problems(), strict -- never sanitize()'s. */
  var PROP_NAME = /^[A-Za-z_$][A-Za-z0-9_$-]{0,63}$/;
  function cleanData(value, depth, budget) {
    if (budget.n++ > 4000 || depth > 8) return undefined;
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.length <= 4000 ? value : undefined;
    if (typeof value === 'number') return isFinite(value) ? value : undefined;
    if (Array.isArray(value)) {
      var list = [];
      value.slice(0, 200).forEach(function (item) { var clean = cleanData(item, depth + 1, budget); if (clean !== undefined) list.push(clean); });
      return list;
    }
    if (isPlainObject(value)) {
      var out = {};
      Object.keys(value).slice(0, 60).forEach(function (key) { if (!PROP_NAME.test(key)) return; var clean = cleanData(value[key], depth + 1, budget); if (clean !== undefined) out[key] = clean; });
      return out;
    }
    return undefined;
  }

  /* ---- captured trees ("Make into component"). A tree is an array of nodes:
       ' '                         blank text kept between elements (collapsed to one space)
       { p: 'heading' }            a text SLOT: rendered as the text of prop `heading`
       { t, svg?, c?, s?, a?, ps?, k? }  an element: tag, SVG namespace flag, plain classes,
                                   atom declarations (re-minted as classes on render),
                                   attributes, attribute->prop slots (an <img>'s src/alt),
                                   children.
     Tags are an allowlist on purpose: this is a sanitizer, and an allowlist is the only
     safe direction for one -- anything that runs, embeds or submits (script, iframe,
     object, form controls) is never rebuilt, and neither is <canvas>, whose pixels are
     painted by page code a capture cannot carry. */
  var TAGS = /^(a|abbr|article|aside|b|blockquote|br|button|cite|code|dd|del|details|dfn|div|dl|dt|em|figcaption|figure|footer|h[1-6]|header|hr|i|img|ins|kbd|label|li|main|mark|nav|ol|p|picture|pre|q|s|section|small|source|span|strong|sub|summary|sup|table|tbody|td|tfoot|th|thead|time|tr|u|ul|svg|g|path|rect|circle|ellipse|line|polyline|polygon|text|tspan|use|defs|symbol|title|desc|lineargradient|radialgradient|stop|clippath|mask)$/i;
  var ATTR = /^[a-z_:][-a-z0-9_:.]{0,63}$/i;
  var URL_ATTR = /^(href|src|xlink:href|srcset|poster|action)$/i;
  var BAD_URL = /^\s*(javascript|vbscript|data:text)/i;
  var SLOT = /^[a-z][a-z0-9]{0,39}$/i;
  var MAX_NODES = 600, MAX_DEPTH = 40;

  /* Which attributes a captured element keeps is decided by what an attribute DOES, not
     by a list of names: event handlers (on*) and runtime/editor bookkeeping (data-ark-*,
     which the editor and the runtime re-derive on every render) never travel; `id` never
     travels because a copy with the same id would collide with its original; a URL that
     would run script is dropped; everything else -- aria-*, role, href, data-scene-link
     (the router's own delegated hook, so a captured nav link still navigates), SVG
     geometry -- is markup and is kept. */
  function keepAttr(name, value) {
    if (!ATTR.test(name) || /^on/i.test(name) || /^data-ark-/i.test(name) || /^(id|class|srcdoc|formaction|nonce)$/i.test(name)) return false;
    if (typeof value !== 'string' || value.length > 2000) return false;
    if (URL_ATTR.test(name) && BAD_URL.test(value)) return false;
    if (/^style$/i.test(name) && /expression\s*\(|javascript:|behavior\s*:/i.test(value)) return false;
    return true;
  }

  function cleanTree(raw) {
    var budget = { n: 0 };
    function cleanNode(node, depth) {
      if (budget.n++ > MAX_NODES || depth > MAX_DEPTH) return null;
      if (typeof node === 'string') return /^\s{1,20}$/.test(node) ? ' ' : null;
      if (!isPlainObject(node)) return null;
      if (typeof node.p === 'string') return SLOT.test(node.p) ? { p: node.p } : null;
      if (typeof node.t !== 'string' || !TAGS.test(node.t)) return null;
      var out = { t: node.t };
      if (node.svg) out.svg = 1;
      if (typeof node.c === 'string' && node.c.trim()) out.c = node.c.replace(/\s+/g, ' ').trim().slice(0, 1000);
      if (Array.isArray(node.s)) {
        var decls = node.s.filter(function (d) { return typeof d === 'string' && d.length > 0 && d.length <= 2000 && !/[{}<]/.test(d); }).slice(0, 40);
        if (decls.length) out.s = decls;
      }
      /* `x`: the styling this element took from WHERE it was captured (see contextStyles) --
         one declaration block, re-minted as a pinned atom on render. Absent on every node
         captured before it existed, so those definitions keep their exact bytes. */
      if (typeof node.x === 'string' && node.x.trim() && node.x.length <= 2000 && !/[{}<]/.test(node.x)) out.x = node.x;
      if (isPlainObject(node.a)) {
        var attrs = {};
        Object.keys(node.a).slice(0, 40).forEach(function (name) { if (keepAttr(name, node.a[name])) attrs[name] = node.a[name]; });
        if (Object.keys(attrs).length) out.a = attrs;
      }
      if (isPlainObject(node.ps)) {
        var slots = {};
        ['src', 'alt'].forEach(function (name) { if (typeof node.ps[name] === 'string' && SLOT.test(node.ps[name])) slots[name] = node.ps[name]; });
        if (Object.keys(slots).length) out.ps = slots;
      }
      if (Array.isArray(node.k)) {
        var kids = node.k.map(function (child) { return cleanNode(child, depth + 1); }).filter(function (child) { return child !== null; });
        if (kids.length) out.k = kids;
      }
      return out;
    }
    if (!Array.isArray(raw)) return null;
    var tree = raw.map(function (node) { return cleanNode(node, 0); }).filter(function (node) { return node !== null; });
    return tree.some(function (node) { return typeof node !== 'string'; }) ? tree : null;
  }

  /* The slot names a tree declares, in document order: its editable props. */
  function slotsOf(tree) {
    var out = [];
    (function walk(nodes) {
      (nodes || []).forEach(function (node) {
        if (!node || typeof node !== 'object') return;
        if (node.p) { if (out.indexOf(node.p) < 0) out.push(node.p); return; }
        if (node.ps) ['src', 'alt'].forEach(function (name) { if (node.ps[name] && out.indexOf(node.ps[name]) < 0) out.push(node.ps[name]); });
        walk(node.k);
      });
    })(tree);
    return out;
  }
  /* A master's editable props: a typed block's fixed list, a captured one's own slots, an Ark
     block's schema (or, with no registry loaded, the props it holds). */
  function propsOf(master) {
    if (!master) return [];
    if (master.resolver === CAPTURED) return slotsOf(master.tree);
    if (isArk(master.resolver)) { var d = descriptorOf(master.resolver); return d ? Object.keys(d.props || {}) : Object.keys(master.props || {}); }
    return (RESOLVER_PROPS[master.resolver] || []).slice();
  }

  /* Keeps only the keys a resolver actually declares, each with a value of
     a safe shape and size -- the same per-field discipline manifest.js's
     problems() already applies to a page manifest's own fields. A captured
     master declares its keys through its own tree (slotsOf). */
  function cleanProps(resolver, raw, tree) {
    var allowed = resolver === CAPTURED ? slotsOf(tree) : (RESOLVER_PROPS[resolver] || []), out = {};
    if (!isPlainObject(raw)) return out;
    if (isArk(resolver)) {
      var budget = { n: 0 };
      Object.keys(raw).slice(0, 60).forEach(function (key) { if (!PROP_NAME.test(key)) return; var clean = cleanData(raw[key], 0, budget); if (clean !== undefined) out[key] = clean; });
      return out;
    }
    allowed.forEach(function (key) { if (okValue(raw[key])) out[key] = raw[key]; });
    return out;
  }

  function cleanMaster(raw) {
    if (!isPlainObject(raw) || !isKnownResolver(raw.resolver)) return null;
    var tree = null;
    if (raw.resolver === CAPTURED) { tree = cleanTree(raw.tree); if (!tree) return null; }
    var out = { resolver: raw.resolver, props: cleanProps(raw.resolver, raw.props, tree), label: String(raw.label || raw.resolver).slice(0, 120) };
    if (tree) out.tree = tree;
    if (raw.detached === true) out.detached = true;
    return out;
  }

  function cleanInstance(raw, masters) {
    if (!isPlainObject(raw) || typeof raw.key !== 'string' || !ID.test(raw.key)) return null;
    var master = typeof raw.masterId === 'string' ? masters[raw.masterId] : null;
    if (!master) return null;
    return { key: raw.key, masterId: raw.masterId, overrides: cleanProps(master.resolver, raw.overrides, master.tree) };
  }

  function cleanKey(key) { return typeof key === 'string' && key.length > 0 && key.length <= 500 ? key : null; }
  function cleanSpot(raw) {
    if (!isPlainObject(raw) || !cleanKey(raw.after)) return null;
    var replaces = Array.isArray(raw.replaces) ? Array.from(new Set(raw.replaces.map(cleanKey).filter(Boolean))).slice(0, 50) : [];
    return { after: raw.after, replaces: replaces };
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
      if (!isScope(route)) return;
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
    /* A spot exists only while something is in it: one with no instance would hide the
       content it replaced and show nothing in its place. */
    var rawSpots = value && value.spots, spots = {};
    if (isPlainObject(rawSpots)) Object.keys(rawSpots).slice(0, 500).forEach(function (route) {
      if (!isScope(route) || !isPlainObject(rawSpots[route]) || !out.routes[route]) return;
      var clean = {};
      Object.keys(rawSpots[route]).slice(0, 50).forEach(function (anchorId) {
        if (!ID.test(anchorId) || !out.routes[route][anchorId]) return;
        var spot = cleanSpot(rawSpots[route][anchorId]);
        if (spot) clean[anchorId] = spot;
      });
      if (Object.keys(clean).length) spots[route] = clean;
    });
    /* written only when there is one, so a site with no spots keeps the exact bytes its
       components-data.js had before spots existed (tests/site-bundle.test.mjs) */
    if (Object.keys(spots).length) out.spots = spots;
    /* A detached copy belongs to the one instance that was detached into it; once nothing
       points at it, it is gone -- it is never offered in the Library. */
    var used = {};
    Object.keys(out.routes).forEach(function (route) { Object.keys(out.routes[route]).forEach(function (anchorId) { out.routes[route][anchorId].forEach(function (item) { used[item.masterId] = true; }); }); });
    Object.keys(out.masters).forEach(function (id) { if (out.masters[id].detached && !used[id]) delete out.masters[id]; });
    return out;
  }

  function define(value) { current = sanitize(value); return get(); }
  function get() { return JSON.parse(JSON.stringify(current)); }
  /* the exact file text; the Studio-driven edit and a hand edit produce the same bytes,
     the same contract js/content/layout.js's serialize() keeps for layout-data.js */
  function serialize(value) {
    return '/* Reusable content blocks inserted in DEFXN Studio. */\nArkComponents.define(' + JSON.stringify(sanitize(value), null, 2) + ');\n';
  }

  /* ---- the save path's check. Every Ark master's props, and every instance's props as it
     SHOWS them (the definition with its overrides folded in), go through the SDK's
     validateCmsArkBlock in STRICT mode (@deadark/sdk/cms; the editor loads it as
     js/admin/vendor/cms-blocks.js, global ArkCmsBlocks) -- strict also refuses a prop the block
     does not define, which rendering ignores. Save refuses the components draft while any
     refusal stands (js/admin/save.js), so nothing invalid is ever written; sanitize() and render
     stay lenient (future law: a saved record still renders). A refusal names the failure, what
     is needed and the remedy (scripts/lib/refusal.mjs), plus WHERE in plain words: the
     component's own name and the field's label path, never only `props.items[2].label`.
     Legacy and captured masters have no Ark schema and are not checked here. With no check
     loaded, an Ark master is refused as unchecked -- never passed as checked. `validate(spec)`
     may be passed in (tests); it returns { ok } or { ok: false, refusals }. */
  function defaultCheck() {
    if (typeof ArkCmsBlocks !== 'undefined' && ArkCmsBlocks && typeof ArkCmsBlocks.validateCmsArkBlock === 'function') {
      return function (spec) { return ArkCmsBlocks.validateCmsArkBlock(spec, { strict: true }); };
    }
    return null;
  }
  function schemasOf(resolver) {
    if (LEGACY[resolver]) return LEGACY[resolver].props;
    var d = descriptorOf(resolver);
    return d ? d.props : null;
  }
  /* 'props.items[2].label' -> "Actions #3 › Button text", from the block's own schema labels */
  function pathLabel(resolver, path) {
    var schemas = schemasOf(resolver) || {}, schema = null, out = [];
    (String(path || '').replace(/^props\.?/, '').match(/\[\d+\]|[^.[\]]+/g) || []).forEach(function (part) {
      var index = /^\[(\d+)\]$/.exec(part);
      if (index) { if (out.length) out[out.length - 1] += ' #' + (Number(index[1]) + 1); schema = schema && schema.of; return; }
      var next = !schema ? schemas[part] : schema.kind === 'object' ? (schema.fields || {})[part] : schema.kind === 'record' ? schema.values : null;
      out.push(schema && schema.kind === 'record' ? part : (next && next.label) || part);
      schema = next || null;
    });
    return out.join(' › ');
  }
  function problems(value, validate) {
    var draft = sanitize(value), check = validate || defaultCheck(), out = [], refusedPaths = {};
    function refuse(where, master, refusal, extra) {
      var field = pathLabel(master.resolver, refusal.path);
      out.push(Object.assign({ label: master.label, block: arkBlockName(master.resolver), path: refusal.path, field: field, failure: refusal.failure, needs: refusal.needs, remedy: refusal.remedy,
        sentence: where + (field ? ', ' + field : '') + ': ' + refusal.failure + '. Needs ' + refusal.needs + '. Remedy: ' + refusal.remedy + '.' }, extra));
    }
    Object.keys(draft.masters).forEach(function (id) {
      var master = draft.masters[id];
      if (!isArk(master.resolver)) return;
      var where = 'Component "' + master.label + '"';
      if (!check) {
        refuse(where, master, { path: '', failure: 'it could not be checked', needs: 'the block check (js/admin/vendor/cms-blocks.js, @deadark/sdk validateCmsArkBlock)', remedy: 'reload the editor so the check loads, then save again' }, { masterId: id });
        return;
      }
      var own = check({ block: arkBlockName(master.resolver), props: master.props });
      if (own && own.ok === false) own.refusals.forEach(function (r) { refuse(where, master, r, { masterId: id }); });
      refusedPaths[id] = own && own.ok === false ? own.refusals.map(function (r) { return r.path; }) : [];
    });
    if (check) Object.keys(draft.routes).forEach(function (route) {
      Object.keys(draft.routes[route]).forEach(function (anchorId) {
        draft.routes[route][anchorId].forEach(function (instance) {
          var master = draft.masters[instance.masterId];
          if (!master || !isArk(master.resolver) || !Object.keys(instance.overrides).length) return;
          var shown = check({ block: arkBlockName(master.resolver), props: Object.assign({}, master.props, instance.overrides) });
          /* what the definition already refuses is said once, on the definition */
          if (shown && shown.ok === false) shown.refusals.filter(function (r) { return (refusedPaths[instance.masterId] || []).indexOf(r.path) < 0; }).forEach(function (r) {
            refuse('"' + master.label + '" on ' + (route === SHELL ? 'every page' : route), master, r, { masterId: instance.masterId, route: route, anchorId: anchorId, key: instance.key });
          });
        });
      });
    });
    return out;
  }

  /* ---- mutators: pure, draft-in draft-out, exactly like ArkLayout.set/group/
     ungroup/remove -- the caller (js/main.js's cmsComponentsDraft, admin.js's
     componentsDraft) holds the draft and reassigns it from the return value.
     Each id/key is supplied by the caller, the same way ArkLayout.group()
     takes a caller-generated group id rather than inventing one here. */

  /* `tree` is only read for RBLOCK_CAPTURED_V1 (it IS that master's definition). A NEW Ark
     master must name a block the loaded registry has (a typo would otherwise save a master that
     renders nothing); with no registry loaded the name's shape is all there is to check. */
  function createMaster(value, id, resolver, props, label, tree) {
    var draft = sanitize(value);
    if (!ID.test(id || '') || !isKnownResolver(resolver)) return draft;
    if (isArk(resolver) && registry().length && !descriptorOf(resolver)) return draft;
    var master = cleanMaster({ resolver: resolver, props: props, label: label, tree: tree });
    if (master) draft.masters[id] = master;
    return sanitize(draft);
  }

  function updateMaster(value, id, patch) {
    var draft = sanitize(value), master = draft.masters[id];
    if (!master || !isPlainObject(patch)) return draft;
    if (typeof patch.label === 'string') master.label = patch.label.slice(0, 120);
    if (patch.props !== undefined) master.props = cleanProps(master.resolver, patch.props, master.tree);
    return sanitize(draft);
  }

  function insertInstance(value, route, anchorId, key, masterId) {
    var draft = sanitize(value);
    if (!isScope(route) || !ID.test(anchorId || '') || !ID.test(key || '') || !draft.masters[masterId]) return draft;
    var anchors = draft.routes[route] || (draft.routes[route] = {});
    var list = anchors[anchorId] || (anchors[anchorId] = []);
    list.push({ key: key, masterId: masterId, overrides: {} });
    return sanitize(draft);
  }

  /* An instance in a brand-new spot right after the real element `after`, optionally
     standing in for the real elements `replaces` -- one call, because sanitize() drops a
     spot that has no instance yet. */
  function placeInstance(value, route, spotId, after, replaces, key, masterId) {
    var draft = insertInstance(value, route, spotId, key, masterId);
    var spot = cleanSpot({ after: after, replaces: replaces });
    if (!spot || !draft.routes[route] || !draft.routes[route][spotId]) return sanitize(value);
    var spots = draft.spots || (draft.spots = {});
    (spots[route] || (spots[route] = {}))[spotId] = spot;
    return sanitize(draft);
  }

  function setOverride(value, route, anchorId, key, propPath, propValue) {
    var draft = sanitize(value);
    route = scopeHolding(draft, route, anchorId);
    var list = draft.routes[route] && draft.routes[route][anchorId];
    var instance = list && list.find(function (item) { return item.key === key; });
    if (!instance) return draft;
    if (propValue === undefined || propValue === null) delete instance.overrides[propPath];
    else instance.overrides[propPath] = propValue;
    return sanitize(draft);
  }

  function removeInstance(value, route, anchorId, key) {
    var draft = sanitize(value);
    route = scopeHolding(draft, route, anchorId);
    var anchors = draft.routes[route], list = anchors && anchors[anchorId];
    if (!list) return draft;
    var kept = list.filter(function (item) { return item.key !== key; });
    if (kept.length) anchors[anchorId] = kept; else delete anchors[anchorId];
    if (!Object.keys(anchors).length) delete draft.routes[route];
    return sanitize(draft);
  }

  /* Detach: the instance stops following its definition. It is re-pointed at a private
     copy (`newId`) of what it shows right now -- the master's props with its own overrides
     folded in -- so the page looks the same, and no later definition edit reaches it. The
     copy is flagged `detached`: the Library never lists it, and sanitize() drops it once
     its one instance is gone. */
  function detachInstance(value, route, anchorId, key, newId) {
    var draft = sanitize(value);
    route = scopeHolding(draft, route, anchorId);
    var list = draft.routes[route] && draft.routes[route][anchorId];
    var instance = list && list.find(function (item) { return item.key === key; });
    var master = instance && draft.masters[instance.masterId];
    if (!master || !ID.test(newId || '') || draft.masters[newId]) return draft;
    var copy = JSON.parse(JSON.stringify(master));
    copy.props = Object.assign({}, master.props, instance.overrides);
    copy.label = (master.label + ' (detached)').slice(0, 120);
    copy.detached = true;
    draft.masters[newId] = copy;
    instance.masterId = newId; instance.overrides = {};
    return sanitize(draft);
  }

  /* ---- capture: a real DOM selection -> { tree, props }, for "Make into component".
     Runs where the selection lives (the preview iframe, js/main.js); pure apart from
     READING the DOM, so it is tested in jsdom against real markup. `atomDecl(cls)` returns
     the declaration block of a runtime atom class (ArkAtomizer.declaration), '' otherwise. */

  /* A slot is named after the nearest element in the capture that gives its text a role
     -- a link's text is `link`, a heading's is `heading` -- falling back to `text`; the
     2nd of a name is `link2`. Naming only; nothing is decided by membership here. */
  var SLOT_ROLE = { a: 'link', button: 'button', h1: 'heading', h2: 'heading', h3: 'heading', h4: 'heading', h5: 'heading', h6: 'heading', p: 'paragraph', li: 'item', label: 'label', figcaption: 'caption', blockquote: 'quote', q: 'quote', td: 'cell', th: 'cell', dt: 'term', dd: 'detail' };

  function defaultAtomDecl(cls) {
    var atomizer = typeof ArkAtomizer !== 'undefined' ? ArkAtomizer : null;
    return atomizer && atomizer.declaration ? atomizer.declaration(cls) : '';
  }
  /* a pinned context atom (ArkAtomizer.pin) read back into `x`, so capturing an instance of a
     captured component carries its context styling forward instead of losing it */
  function defaultPinDecl(cls) {
    var atomizer = typeof ArkAtomizer !== 'undefined' ? ArkAtomizer : null;
    return atomizer && atomizer.pinDeclaration ? atomizer.pinDeclaration(cls) : '';
  }

  /* ---- context styling: what a captured element looked like BECAUSE OF WHERE IT WAS.
     A capture keeps an element's own classes and atoms, but a rule that matches it only
     through its ancestors (`.how-chapter-header h1` on /download) does not travel: the same
     classes inserted on /chain fall back to the browser's default h1. So at capture time
     the selection is rebuilt from its own cleaned tree in a NEUTRAL spot -- inside the
     scene's host, outside the scene root that carries the route (data-page) and outside
     every page container -- and each element's computed style there is compared with the
     original's. Whatever differs is exactly what the context contributed, whatever the
     selector shape (:has, :not, attribute or id ancestry, nesting): the browser has already
     resolved the cascade, so nothing here re-implements selector matching or specificity.

     Chosen over collecting and re-scoping the ancestor-dependent RULES because that needs
     a selector parser, a specificity calculator and shorthand/var() longhand handling to
     re-run the cascade honestly, and gets each wrong in its own way; the computed diff asks
     the browser, which is the one cascade implementation that is right by definition. What
     it gives up, stated rather than hidden: the pinned values are the RESTING state at the
     capture's viewport -- a context rule's :hover variant, its @media variants and its
     ::before/::after are not carried (the element's own classes still bring theirs).

     Which properties: the look vocabulary the Studio itself styles (js/content/layout.js's
     frame: type, colour, fill, border, radius, opacity, padding, vertical margin, flex
     layout, max width) plus the typography text inherits, and SVG paint. Left out on
     purpose: width/height/insets and horizontal margins, whose computed value is the USED
     pixel size in the original container (a `margin: 0 auto` would freeze as a px offset).

     Values are stored as design tokens where one reproduces the value (ArkLayout's own
     token lists: hsl(var(--text-strong)), var(--font-display), var(--type-h1), the radius
     sizes), line-height as a unitless ratio and letter-spacing in em -- so they keep
     scaling with the font -- and a literal otherwise. Every value is checked by applying it
     to the neutral rebuild and reading it back; one that does not reproduce the original is
     not stored. A top-level element also pins the inherited typography it showed even when
     the neutral spot already matches, because the DESTINATION's ancestors would otherwise
     restyle it (a component must look the same wherever it is placed). */
  var CONTEXT_PROPS = ['font-size', 'font-family', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform', 'text-align', 'text-decoration-line', 'color',
    'background-color', 'opacity', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-bottom',
    'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width', 'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
    'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
    'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
    'display', 'flex-direction', 'flex-wrap', 'align-items', 'justify-content', 'row-gap', 'column-gap', 'max-width', 'fill', 'stroke', 'stroke-width'];
  var INHERITED_TYPE = { 'font-size': 1, 'font-family': 1, 'font-weight': 1, 'font-style': 1, 'line-height': 1, 'letter-spacing': 1, 'text-transform': 1, 'text-align': 1, color: 1 };
  var PX = /^(-?\d*\.?\d+)px$/;
  function sameValue(a, b) {
    if (a === b) return true;
    var pa = PX.exec(a), pb = PX.exec(b);
    return !!(pa && pb && Math.abs(Number(pa[1]) - Number(pb[1])) < 0.05);
  }
  function roundNum(n, places) { var f = Math.pow(10, places); return String(Math.round(n * f) / f); }
  /* the forms worth trying before the literal, best first */
  function contextCandidates(prop, want, fontPx) {
    var L = typeof ArkLayout !== 'undefined' ? ArkLayout : null, out = [];
    if (L && /(^|-)color$|^fill$|^stroke$/.test(prop)) {
      var m = /^rgba?\(([^)]*)\)$/.exec(want);
      if (m) {
        var parts = m[1].split(/[\s,/]+/).filter(Boolean), alpha = parts.length > 3 ? Number(parts[3]) : 1;
        var lists = prop === 'color' ? [L.TEXT_TOKENS, L.FILL_TOKENS, L.BORDER_TOKENS] : prop === 'background-color' ? [L.FILL_TOKENS, L.TEXT_TOKENS, L.BORDER_TOKENS] : /^border/.test(prop) ? [L.BORDER_TOKENS, L.TEXT_TOKENS, L.FILL_TOKENS] : [L.TEXT_TOKENS, L.FILL_TOKENS, L.BORDER_TOKENS];
        if (alpha > 0) lists.forEach(function (list) { (list || []).forEach(function (t) { var v = alpha < 1 ? 'hsl(var(--' + t + ') / ' + roundNum(alpha, 3) + ')' : 'hsl(var(--' + t + '))'; if (out.indexOf(v) < 0) out.push(v); }); });
      }
    } else if (L && prop === 'font-family') (L.FONT_TOKENS || []).forEach(function (t) { out.push('var(--font-' + t + ')'); });
    else if (L && prop === 'font-size') (L.TYPE_SIZE_TOKENS || []).forEach(function (t) { out.push('var(--type-' + t + ')'); });
    else if (L && /radius$/.test(prop) && L.RADIUS_CSS) (L.RADIUS_TOKENS || []).forEach(function (t) { if (t !== 'none' && L.RADIUS_CSS[t]) out.push(L.RADIUS_CSS[t]); });
    else if (prop === 'line-height' && PX.test(want) && fontPx > 0) out.push(roundNum(Number(PX.exec(want)[1]) / fontPx, 3));
    else if (prop === 'letter-spacing' && PX.test(want) && fontPx > 0) out.push(roundNum(Number(PX.exec(want)[1]) / fontPx, 4) + 'em');
    out.push(want);
    return out;
  }
  function contextStyles(elements, tree, options) {
    var first = elements && elements[0], doc = first && first.ownerDocument, view = doc && doc.defaultView;
    if (!view || typeof view.getComputedStyle !== 'function' || !first.isConnected) return;
    var neutral = options.neutralHost;
    if (!neutral) { var sceneRoot = first.closest && first.closest('[data-page]'); neutral = sceneRoot && sceneRoot.parentElement; }
    if (!neutral) return;
    /* The rebuild's container mirrors the original parent's layout type and content width,
       so differences that come from layout (a flex item is blockified, a % padding resolves
       against the parent) are not mistaken for context styling. */
    var parent = first.parentElement, around = parent ? view.getComputedStyle(parent) : null;
    var wrapper = doc.createElement('div');
    wrapper.setAttribute('aria-hidden', 'true');
    var width = parent ? parent.clientWidth - (parseFloat(around.paddingLeft) || 0) - (parseFloat(around.paddingRight) || 0) : 0;
    wrapper.style.cssText = 'position:absolute;left:-100000px;top:0;visibility:hidden;pointer-events:none;margin:0;padding:0;border:0' +
      (around && /flex|grid/.test(around.display) ? ';display:' + around.display.replace(/^inline-/, '') + ';flex-direction:' + around.flexDirection : ';display:block') +
      (width > 0 ? ';width:' + width + 'px' : '');
    tree.forEach(function (node) { var built = buildNode(node, options.props || {}, doc); if (built) wrapper.appendChild(built); });
    neutral.appendChild(wrapper);
    try {
      var tagOf = function (el) { return el.namespaceURI === 'http://www.w3.org/2000/svg' ? el.tagName : el.tagName.toLowerCase(); };
      var kept = function (list) { return Array.prototype.filter.call(list || [], function (el) { return el.nodeType === 1 && TAGS.test(tagOf(el)); }); };
      var pairs = [];
      (function pair(sources, nodes, probes, root) {
        nodes = (nodes || []).filter(function (n) { return n && typeof n === 'object' && n.t; });
        for (var i = 0; i < nodes.length; i++) {
          var src = sources[i], probe = probes[i];
          if (!src || !probe || tagOf(src) !== nodes[i].t || tagOf(probe) !== nodes[i].t) return; /* a capture cut short by its node budget: stop pairing, never mis-pair */
          pairs.push({ src: src, probe: probe, node: nodes[i], root: root });
          pair(kept(src.children), nodes[i].k, Array.prototype.slice.call(probe.children), false);
        }
      })(kept(elements), tree, Array.prototype.slice.call(wrapper.children), true);
      /* top-down, applying each pin to the rebuild as it is decided, so a child is compared
         against a parent that already looks like the original and pins only its own share */
      pairs.forEach(function (p) {
        var cs = view.getComputedStyle(p.src), cp = view.getComputedStyle(p.probe), decls = [];
        CONTEXT_PROPS.forEach(function (prop) {
          var want = cs.getPropertyValue(prop);
          if (!want) return;
          var side = /^border-(top|right|bottom|left)-color$/.exec(prop);
          if (side && cs.getPropertyValue('border-' + side[1] + '-style') === 'none') return;
          if (!(p.root && INHERITED_TYPE[prop]) && sameValue(want, cp.getPropertyValue(prop))) return;
          var fontPx = parseFloat(cs.getPropertyValue('font-size')) || 0;
          var chosen = contextCandidates(prop, want, fontPx).find(function (candidate) {
            p.probe.style.setProperty(prop, candidate);
            return sameValue(cp.getPropertyValue(prop), want);
          });
          if (chosen) decls.push(prop + ':' + chosen); else p.probe.style.removeProperty(prop);
        });
        if (!decls.length) return;
        /* a re-capture keeps what an earlier capture pinned, with this pass's values winning */
        var merged = p.node.x ? parseDecl(p.node.x) : {};
        decls.forEach(function (d) { var at = d.indexOf(':'); merged[d.slice(0, at)] = d.slice(at + 1); });
        var ordered = CONTEXT_PROPS.filter(function (prop) { return merged[prop] !== undefined; }).concat(Object.keys(merged).filter(function (prop) { return CONTEXT_PROPS.indexOf(prop) < 0; }).sort());
        var x = ordered.map(function (prop) { return prop + ':' + merged[prop]; }).join(';');
        if (x.length <= 2000) p.node.x = x;
      });
    } finally {
      wrapper.remove();
    }
  }

  function capture(elements, options) {
    options = options || {};
    var atomDecl = options.atomDecl || defaultAtomDecl, pinDecl = options.pinDecl || defaultPinDecl;
    var props = {}, used = {}, count = { n: 0 };
    function slotName(role) {
      used[role] = (used[role] || 0) + 1;
      return used[role] === 1 ? role : role + used[role];
    }
    function roleFor(textNode, stop) {
      for (var node = textNode.parentNode; node; node = node.parentNode) {
        var tag = node.tagName ? node.tagName.toLowerCase() : '';
        if (SLOT_ROLE[tag]) return SLOT_ROLE[tag];
        if (node === stop) break;
      }
      return 'text';
    }
    function walk(node, top) {
      if (count.n++ > MAX_NODES) return null;
      if (node.nodeType === 3) {
        var text = node.nodeValue || '';
        if (!text.trim()) return /\s/.test(text) ? ' ' : null;
        var name = slotName(roleFor(node, top));
        props[name] = text.replace(/\s+/g, ' ').slice(0, 4000);
        return { p: name };
      }
      if (node.nodeType !== 1) return null;
      var isSvg = node.namespaceURI === 'http://www.w3.org/2000/svg';
      var tag = isSvg ? node.tagName : node.tagName.toLowerCase();
      if (!TAGS.test(tag)) return null;
      var out = { t: tag };
      if (isSvg) out.svg = 1;
      var plain = [], decls = [], pinned = '';
      String(node.getAttribute('class') || '').split(/\s+/).filter(Boolean).forEach(function (cls) {
        var pin = pinDecl(cls);
        if (pin) { pinned = pin; return; }
        var decl = atomDecl(cls);
        if (decl) decls.push(decl); else plain.push(cls);
      });
      if (plain.length) out.c = plain.join(' ');
      if (decls.length) out.s = decls;
      if (pinned) out.x = pinned;
      var attrs = {};
      Array.prototype.forEach.call(node.attributes || [], function (attr) { if (keepAttr(attr.name, attr.value)) attrs[attr.name] = attr.value; });
      if (tag === 'img') {
        var slots = {};
        if (attrs.src) { slots.src = slotName('image'); props[slots.src] = attrs.src.slice(0, 4000); delete attrs.src; }
        if (attrs.alt !== undefined) { slots.alt = slotName('imageAlt'); props[slots.alt] = attrs.alt.slice(0, 4000); delete attrs.alt; }
        if (Object.keys(slots).length) out.ps = slots;
      }
      if (Object.keys(attrs).length) out.a = attrs;
      var kids = [];
      Array.prototype.forEach.call(node.childNodes || [], function (child) { var built = walk(child, top); if (built !== null) kids.push(built); });
      if (kids.length) out.k = kids;
      return out;
    }
    var tree = [];
    (elements || []).forEach(function (element) { var built = element && walk(element, element); if (built && typeof built === 'object') tree.push(built); });
    var clean = cleanTree(tree);
    if (!clean) return null;
    var cleanedProps = cleanProps(CAPTURED, props, clean);
    /* options.context === false skips it (a caller that wants structure only) */
    if (options.context !== false) contextStyles(elements, clean, { neutralHost: options.neutralHost, props: cleanedProps });
    return { tree: cleanTree(clean), props: cleanedProps };
  }

  /* The starter content for a NEW STATE, derived from the state-0 content it stands in for
     (regression: tests/components-capture.cjs). A fixed big Text heading looked like a
     page title dropped into a nav bar. The unit is found by structure: the first non-blank
     text in state 0, widened to the largest element around it that holds no OTHER text --
     for a nav of links that is one link (icon and all), for a heading the heading. That
     unit is captured (so it keeps its own classes and look) with its first text slot set to
     `text` and any other text slot emptied. Null when state 0 has no text at all (e.g. an
     image), so the caller falls back to a typed block. */
  function starterFrom(elements, text, options) {
    var first = null;
    function texts(node) {
      var found = [];
      (function walk(n) { if (n.nodeType === 3 && n.nodeValue.trim()) found.push(n); else Array.prototype.forEach.call(n.childNodes || [], walk); })(node);
      return found;
    }
    (elements || []).some(function (element) { var t = element ? texts(element) : []; if (t.length) { first = { node: t[0], top: element }; return true; } return false; });
    if (!first) return null;
    var unit = first.node.parentNode;
    while (unit !== first.top && unit.parentNode && texts(unit.parentNode).length === 1) unit = unit.parentNode;
    var captured = capture([unit], options);
    if (!captured) return null;
    /* A starter borrows state 0's LOOK, not its behaviour: an HTML element keeps its classes
       and atoms but none of its attributes (a copied nav link would otherwise still carry the
       original's href and router hook, and open a page nobody chose); SVG keeps its geometry,
       which is what draws it. */
    (function strip(nodes) {
      (nodes || []).forEach(function (node) {
        if (!node || typeof node !== 'object' || node.p) return;
        if (!node.svg && node.a) { var hidden = node.a['aria-hidden']; delete node.a; if (hidden) node.a = { 'aria-hidden': hidden }; }
        strip(node.k);
      });
    })(captured.tree);
    var slots = slotsOf(captured.tree).filter(function (name) { var role = name.replace(/\d+$/, ''); return role !== 'image' && role !== 'imageAlt'; });
    slots.forEach(function (name, i) { captured.props[name] = i === 0 ? String(text || '').slice(0, 4000) : ''; });
    return captured;
  }

  /* ---- build: one captured node -> real DOM, called by the RBLOCK_CAPTURED_V1 resolver
     (js/resolvers/blocks/rblock-captured-v1.js). Text goes in as text, never markup; atom
     declarations are re-minted through the same atomizer every resolver uses, so the class
     names are byte-identical to the originals' and their rules exist on every page. */
  function parseDecl(decl) {
    var styles = {}, depth = 0, quote = '', start = 0, parts = [];
    for (var i = 0; i <= decl.length; i++) {
      var ch = decl.charAt(i);
      if (i === decl.length || (ch === ';' && !depth && !quote)) { parts.push(decl.slice(start, i)); start = i + 1; continue; }
      if (quote) { if (ch === quote) quote = ''; continue; }
      if (ch === '"' || ch === "'") quote = ch;
      else if (ch === '(') depth++;
      else if (ch === ')') depth = Math.max(0, depth - 1);
    }
    parts.forEach(function (part) { var at = part.indexOf(':'); if (at > 0) styles[part.slice(0, at)] = part.slice(at + 1); });
    return styles;
  }
  function buildNode(node, props, doc) {
    doc = doc || document;
    if (typeof node === 'string') return doc.createTextNode(' ');
    if (!node || typeof node !== 'object') return null;
    if (node.p) return doc.createTextNode(props && props[node.p] != null ? String(props[node.p]) : '');
    var el = node.svg ? doc.createElementNS('http://www.w3.org/2000/svg', node.t) : doc.createElement(node.t);
    var classes = [];
    if (node.c) classes.push(node.c);
    (node.s || []).forEach(function (decl) { var cls = typeof ArkUI !== 'undefined' && ArkUI.atomize ? ArkUI.atomize(parseDecl(decl)) : ''; if (cls) classes.push(cls); });
    /* the context styling it was captured with, as one pinned atom (see contextStyles) */
    if (node.x && typeof ArkAtomizer !== 'undefined' && ArkAtomizer.pin) { var pinCls = ArkAtomizer.pin(parseDecl(node.x)); if (pinCls) classes.push(pinCls); }
    if (classes.length) el.setAttribute('class', classes.join(' '));
    Object.keys(node.a || {}).forEach(function (name) {
      try { if (name === 'xlink:href') el.setAttributeNS('http://www.w3.org/1999/xlink', name, node.a[name]); else el.setAttribute(name, node.a[name]); } catch (e) { /* a name the DOM refuses is skipped, never thrown */ }
    });
    Object.keys(node.ps || {}).forEach(function (name) {
      var v = props && props[node.ps[name]];
      if (v == null || (name === 'src' && BAD_URL.test(String(v)))) return;
      el.setAttribute(name, String(v));
    });
    (node.k || []).forEach(function (child) { var built = buildNode(child, props, doc); if (built) el.appendChild(built); });
    return el;
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
    var list = (draft.routes[route] && draft.routes[route][anchorId]) || (draft.routes[SHELL] && draft.routes[SHELL][anchorId]) || [];
    var ctx = { mounts: [], emerge: [] }, built = [];
    list.forEach(function (instance) {
      var master = draft.masters[instance.masterId];
      if (!master) return;                        /* self-healing: a dangling pointer renders nothing, never throws */
      /* `from` is injected, never user data: the route a link-field CTA
         resolves a doc: link's return-to against (js/ark/dash-kit.js's
         resolveLinkField/linkEl), always the instance's own current route.
         `tree` likewise: a captured master's definition, read by its resolver. */
      var props = Object.assign({}, master.props, instance.overrides, { from: route });
      if (master.tree) props.tree = master.tree;
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

  /* ---- spots in the real DOM. Keys are ArkLayout's own data-ark-layout-key values,
     resolved by scanning rather than by an attribute-value selector (a key holds ':' and
     '/'), the same way js/content/states.js's findByKey does. */
  var REPLACED = 'data-ark-component-replaced';
  function elementsWithAttr(root, attr) { return root && root.querySelectorAll ? Array.prototype.slice.call(root.querySelectorAll('[' + attr + ']')) : []; }
  /* Through ArkLayout.find() when it is loaded: one key function, and only `route`'s own page
     answers (the page being replaced is still mounted while it leaves, with keys of the same
     shape -- a spot used to be inserted into whichever came first). */
  function findByKey(root, key, route) {
    if (typeof ArkLayout !== 'undefined' && ArkLayout.find) return ArkLayout.find(root, key, route);
    var found = null;
    elementsWithAttr(root, 'data-ark-layout-key').some(function (el) { if (el.getAttribute('data-ark-layout-key') === key) { found = el; return true; } return false; });
    return found;
  }
  /* A replaced element is hidden by an attribute rule, not an inline style: ArkLayout's
     apply() resets inline styles on every pass, and an !important rule also wins over the
     page's own display rules (a nav link is display:inline-flex by a class). */
  function ensureReplacedRule(doc) {
    if (!doc || !doc.head || doc.querySelector('style[data-ark-components]')) return;
    var style = doc.createElement('style');
    style.setAttribute('data-ark-components', '');
    style.textContent = '[' + REPLACED + ']{display:none!important}[data-ark-spot]{display:contents}';
    doc.head.appendChild(style);
  }
  /* Makes the DOM match the route's spots: every spot anchor exists right after its `after`
     element (created on demand -- display:contents, so what it holds lays out as children
     of the original parent, exactly where the selection was), every replaced element is
     hidden, and anything left over from an earlier draft (a removed spot, another route's
     spot in the persistent header) is taken back out. A spot anchor is marked data-ark-spot
     before it is inserted, and js/content/layout.js never counts a marked anchor among its
     siblings, so inserting one never renumbers anything (keys are recomputed on every pass;
     they used to be frozen at first annotate, and this relied on annotating first). */
  function syncSpots(root, route, draft) {
    if (!root || !root.querySelectorAll) return;
    /* the route's own spots and SHELL's (spot ids are unique); a SHELL spot is placed only after
       a shell element: ArkLayout.find() with SHELL as the route answers for the shell alone */
    var spots = {}, scopeOfSpot = {};
    [route, SHELL].forEach(function (scope) {
      var own = (draft.spots && draft.spots[scope]) || {};
      Object.keys(own).forEach(function (id) { if (!spots[id]) { spots[id] = own[id]; scopeOfSpot[id] = scope; } });
    });
    var ids = Object.keys(spots), doc = root.ownerDocument || (typeof document !== 'undefined' ? document : null);
    /* the leaving page's spots and hidden originals are its own route's: left as they are */
    var mine = function (el) { return typeof ArkLayout === 'undefined' || !ArkLayout.inRoute || ArkLayout.inRoute(el, route); };
    elementsWithAttr(root, 'data-ark-spot').forEach(function (el) { if (mine(el) && ids.indexOf(el.getAttribute('data-ark-insert')) < 0) el.remove(); });
    var hidden = {};
    if (ids.length) {
      ensureReplacedRule(doc);
      ids.forEach(function (id) {
        var spot = spots[id], anchor = elementsWithAttr(root, 'data-ark-spot').find(function (el) { return mine(el) && el.getAttribute('data-ark-insert') === id; });
        if (!anchor) {
          var after = findByKey(root, spot.after, scopeOfSpot[id]);
          if (!after || !after.parentNode || !doc) return;                /* the page changed: render nothing, never throw */
          anchor = doc.createElement('div');
          anchor.setAttribute('data-ark-insert', id);
          anchor.setAttribute('data-ark-spot', '');
          anchor.style.display = 'contents';
          after.parentNode.insertBefore(anchor, after.nextSibling);
        }
        spot.replaces.forEach(function (key) { var el = findByKey(root, key, scopeOfSpot[id]); if (el) { el.setAttribute(REPLACED, id); hidden[key] = true; } });
      });
    }
    elementsWithAttr(root, REPLACED).forEach(function (el) { if (mine(el) && !hidden[el.getAttribute('data-ark-layout-key')]) el.removeAttribute(REPLACED); });
  }

  /* Every [data-ark-insert] anchor under root, rendered from `value` (or the
     module's own `current`). Returns the anchor ids found, so a caller (the
     real site's js/main.js) can both fill every anchor on a page in one call
     and report back to Studio which anchors this route actually has. */
  function renderAll(root, route, value) {
    if (!root || !root.querySelectorAll) return [];
    var draft = sanitize(value !== undefined ? value : current);
    syncSpots(root, route, draft);
    /* only this route's anchors: the page being replaced keeps its own instances while it leaves */
    var anchors = Array.prototype.slice.call(root.querySelectorAll('[data-ark-insert]')).filter(function (el) { return typeof ArkLayout === 'undefined' || !ArkLayout.inRoute || ArkLayout.inRoute(el, route); });
    anchors.forEach(function (el) { render(el, route, el.getAttribute('data-ark-insert'), draft); });
    return anchors.map(function (el) { return el.getAttribute('data-ark-insert'); });
  }

  return {
    define: define, get: get, sanitize: sanitize, serialize: serialize,
    createMaster: createMaster, updateMaster: updateMaster,
    insertInstance: insertInstance, placeInstance: placeInstance, setOverride: setOverride, removeInstance: removeInstance, detachInstance: detachInstance,
    render: render, renderAll: renderAll, anchorsIn: anchorsIn, instancesAt: instancesAt, SHELL: SHELL,
    capture: capture, starterFrom: starterFrom, buildNode: buildNode, propsOf: propsOf,
    resolvers: RESOLVERS.slice(), resolverProps: RESOLVER_PROPS, starterProps: starterProps, CAPTURED: CAPTURED,
    blocks: blocks, labelOf: labelOf,
    /* the Ark block registry, as the Library and the save path read it */
    isArk: isArk, arkResolverFor: arkResolverFor, arkBlockName: arkBlockName, descriptorOf: descriptorOf,
    groups: groups, groupOf: groupOf, fieldsOf: fieldsOf, pathLabel: pathLabel, problems: problems
  };
})();

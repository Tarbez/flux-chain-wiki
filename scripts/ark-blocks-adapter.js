/* ARK BLOCKS ADAPTER: every Ark UI block as an ArkUI resolver (ARK_BLOCK_<UPPER_SNAKE(name)>, derived
   from ArkKit.ARK_BLOCK_NAMES, never listed), ArkUI.page(spec, host): a page as data, and
   ArkUI.blocks.update(el, props): a live block patched in place. ArkUI is defxn's resolver engine
   (js/ark/runtime.js); ArkKit is Ark UI (js/ark/vendor/ark-kit-public.js; ark-kit.js in the editor).
   The contract is documented once, in docs/cms-architecture.md "Pages as data".

   THIS IS THE SOURCE of js/ark/blocks.js, which scripts/build-ark-vendor.cjs writes from it
   minified (esbuild; local names only, every property, string and global kept): every block route
   pays for the served file inside the R2 budget (components.md), and minifying it took it from 6.4
   to 3.9 KB gz (W3-BUDGET, 2026-10-19), so the comments here cost the visitor nothing. Edit this
   file, then `npm run build:ark`; `npm run check:ark` (tests/ark-vendor.cjs) refuses a served copy
   that is not this source's build. Regression: tests/ark-blocks-adapter.cjs, tests/ssr-ark-blocks.cjs. */
(function () {
  'use strict';

  var PREFIX = 'ARK_BLOCK_';

  function resolverId(name) { return PREFIX + String(name).toUpperCase().replace(/[^A-Z0-9]+/g, '_'); }

  function kit() {
    if (typeof ArkKit === 'undefined' || !ArkKit.renderArkBlock) {
      throw new Error('ArkUI.blocks refused: no Ark kit is loaded on this page. Needs: js/ark/vendor/ark-kit-public.js (or ark-kit.js) before js/ark/blocks.js. ' +
        'Remedy: list ArkUI.blockScripts in the route\'s scripts (js/pages/catalog.js); js/ark/page-loader.js adds them by itself for routes with saved Ark blocks.');
    }
    return ArkKit;
  }

  function glossary() { return typeof ArkGlossary !== 'undefined' && ArkGlossary.map ? ArkGlossary.map : {}; }

  function routeOf(page) {
    var entry = page && ArkUI.pageCatalog && ArkUI.pageCatalog[page];
    return entry ? entry.path : undefined;
  }

  /* route:/doc:/url: through the site's one link resolver; anything else is already an href. */
  function resolveLink(value, from) {
    if (!/^(route|doc|url):/.test(value || '')) return { href: value, sceneLink: null };
    if (!ArkUI.dash || !ArkUI.dash.resolveLinkField) {
      throw new Error('ArkUI.blocks refused the link "' + value + '": js/ark/dash-kit.js (resolveLinkField) is not loaded. Remedy: load ArkUI.blockScripts in order.');
    }
    return ArkUI.dash.resolveLinkField(value, from);
  }
  function resolveHref(value, from) { return resolveLink(value, from).href; }

  /* data-scene-link: the router follows the link (js/hero-motion.js) instead of reloading the site. */
  function stampSceneLinks(root, links) {
    if (!links.length) return;
    Array.prototype.forEach.call(root.querySelectorAll('a[href]'), function (a) {
      for (var i = 0; i < links.length; i++) {
        if (links[i].href === a.getAttribute('href')) { a.setAttribute('data-scene-link', links[i].sceneLink); return; }
      }
    });
  }

  /* A slot node carries its name (data-ark-slot), so a pin can name it. */
  function namedSlots(slots) {
    if (!slots) return slots;
    var out = {};
    Object.keys(slots).forEach(function (name) {
      out[name] = function () {
        var node = typeof slots[name] === 'function' ? slots[name]() : slots[name];
        if (node && node.setAttribute) node.setAttribute('data-ark-slot', name);
        return node;
      };
    });
    return out;
  }

  /* A prop's schema kind ('items[0].body' -> 'text'), from Ark's registry: only `text` (prose) takes a
     glossary term, never a `line` (a title, a label, a button). */
  function propKind(block, prop) {
    var def = kit().ARK_BLOCKS && kit().ARK_BLOCKS[block];
    var schema = def ? { kind: 'object', fields: def.props } : null;
    String(prop || '').split('.').forEach(function (step) {
      if (!schema) return;
      var m = /^([^[]+)((?:\[\d+\])*)$/.exec(step);
      schema = m && schema.fields ? schema.fields[m[1]] : null;
      for (var n = m ? (m[2].match(/\[/g) || []).length : 0; schema && n > 0; n--) schema = schema.of;
    });
    return schema ? schema.kind : null;
  }
  /* terms: 'first-use': the first prose use of a glossary word becomes [[word|key]], derived from the
     glossary (never a word list); whole words, in the entry's sense. docs/cms-architecture.md. */
  var WORD = 'A-Za-z0-9_\\u00C0-\\u024F-';
  function escapeRe(text) { return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function source(phrase) { return escapeRe(String(phrase).trim()).replace(/\s+/g, '\\s+'); }
  /* (before)(words)(plural s): whole words -- no letter, digit, hyphen either side, and not a word
     joined by a dot ("Node.js" is not the fleet's "node"; W3-GUIDE 2026-10-19, /download). */
  function wordsRe(alternation) { return new RegExp('(^|[^' + WORD + '.])(' + alternation + ')(s)?(?![' + WORD + ']|\\.[A-Za-z])', 'gi'); }
  function senseOf(entry) {
    var context = entry && entry.context, qualifier = entry && /\(([^)]*)\)\s*$/.exec(entry.term || '');
    if (!context && qualifier) context = [qualifier[1].trim().split(/\s+/).pop()];
    return { context: (context || []).map(function (word) { return new RegExp('(^|[^A-Za-z0-9])' + escapeRe(word), 'i'); }),
      except: ((entry && entry.except) || []).map(function (phrase) { return wordsRe(source(phrase)); }) };
  }
  function termMarker(map) {
    var keys = Object.keys(map || {}).sort(function (a, b) { return b.length - a.length; });
    if (!keys.length) return null;
    var re = wordsRe(keys.map(source).join('|'));
    var used = {}, senses = {};
    function applies(key, text, at) {
      var sense = senses[key] || (senses[key] = senseOf(typeof map[key] === 'object' ? map[key] : null));
      if (sense.context.length && !sense.context.some(function (word) { return word.test(text); })) return false;
      return !sense.except.some(function (phrase) {
        phrase.lastIndex = 0;
        for (var m; (m = phrase.exec(text));) { var start = m.index + m[1].length; if (at >= start && at < start + m[2].length + (m[3] || '').length) return true; }
        return false;
      });
    }
    return function (text) {
      if (text.indexOf('[[') >= 0) return text;
      return text.replace(re, function (match, before, word, plural, offset) {
        var key = word.toLowerCase().replace(/\s+/g, ' ');
        if (used[key] || !applies(key, text, offset + before.length)) return match;
        used[key] = true;
        return before + '[[' + word + (plural || '') + '|' + key + ']]';
      });
    };
  }

  function context(options, record) {
    var gloss = options.glossary || glossary();
    var mark = options.terms === 'first-use' ? (options.termState || termMarker(gloss)) : null;
    return {
      document: options.document || document,
      glossary: gloss,
      slots: namedSlots(options.slots),
      onInvalid: options.onInvalid || 'render',
      onFigureVisibility: options.onFigureVisibility,
      resolveText: function (value, where) {
        var m = /^copy:([A-Z][A-Z0-9]*(?:\.[A-Z][A-Z0-9]*)+)$/.exec(value);
        var text = m ? ArkCopy.text(m[1]) : value;
        if (where && where.measure) return text; // Ark measuring a line's maxLength: record nothing
        if (mark && where && propKind(where.block, where.prop) === 'text') text = mark(text);
        if (m) record.copy.push({ key: m[1], text: text });
        return text;
      },
      resolveHref: function (value) {
        var link = resolveLink(value, options.from);
        if (link.sceneLink) record.links.push(link);
        return link.href;
      }
    };
  }

  /* The innermost element whose whole text is a copy value carries its key; split text stays unstamped. */
  function norm(text) { return String(text || '').replace(/\s+/g, ' ').trim(); }
  /* An element's own words: a glossary term's tooltip (its definition) is not part of them. */
  function ownWords(el) {
    var text = el.textContent;
    Array.prototype.forEach.call(el.querySelectorAll('[data-ark-part="term-tip"]'), function (tip) { text = text.replace(tip.textContent, ''); });
    return norm(text);
  }
  /* Text with term markup shows its labels: '[[resolvers|resolver]]' reads 'resolvers'. */
  function plainWords(text) { return norm(String(text || '').replace(/\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/g, '$1')); }
  function stampCopyKeys(root, record) {
    var used = [];
    record.copy.forEach(function (entry) {
      var want = plainWords(entry.text);
      if (!want) return;
      var all = [root].concat(Array.prototype.slice.call(root.querySelectorAll('*')));
      var match = null;
      for (var i = 0; i < all.length && !match; i++) {
        var el = all[i];
        if (used.indexOf(el) >= 0 || ownWords(el) !== want) continue;
        var deeper = Array.prototype.some.call(el.children, function (child) { return ownWords(child) === want; });
        if (!deeper) match = el;
      }
      if (!match) return;
      used.push(match);
      var keys = String(match.getAttribute('data-ark-copy-keys') || '').split(/\s+/).filter(Boolean);
      if (keys.indexOf(entry.key) < 0) keys.push(entry.key);
      match.setAttribute('data-ark-copy-keys', keys.join(' '));
    });
  }

  /* One spec -> element. options: { from, onInvalid, slots, glossary, document }. */
  function render(spec, options) {
    options = options || {};
    var record = { copy: [], links: [] };
    var el;
    try {
      el = kit().renderArkBlock({ block: spec && spec.block, id: spec && spec.id, props: spec && spec.props }, context(options, record));
    } catch (error) {
      if (options.onInvalid === 'throw') throw error;
      // A saved record never breaks a page: Ark's refusal callout, naming the failure.
      el = kit().renderArkBlock({ block: 'callout', props: {
        tone: 'danger',
        title: 'This "' + (spec && spec.block) + '" block could not be shown',
        body: String(error && error.message || error),
        remedy: 'Edit the block in the editor, or remove it.'
      } }, { document: options.document || document });
      el.setAttribute('data-ark-block-refused', String(spec && spec.block));
      return el;
    }
    stampCopyKeys(el, record);
    stampSceneLinks(el, record.links);
    if (spec.was) pinKeys(el, spec.was);
    nestedSpecs(spec).forEach(function (nested) {
      if (!nested.was) return;
      var at = nested.id ? Array.prototype.filter.call(el.querySelectorAll('[data-ark-block]'), function (node) { return node.id === nested.id; })[0] : null;
      if (!at) throw new Error('ArkUI.page refused the pins of a nested "' + nested.block + '" block: ' + (nested.id ? 'no block has the id "' + nested.id + '"' : 'it has no id') +
        '. Needs: an authored id (its refs are relative to it). Remedy: give it one, or re-derive the pins with tests/lib/layout-continuity.cjs.');
      pinKeys(at, nested.was);
    });
    return el;
  }

  /* Specs nested in a spec's props (kind 'blocks', at any depth), found through Ark's schema. */
  function nestedSpecs(spec, out) {
    out = out || [];
    var def = spec && kit().ARK_BLOCKS && kit().ARK_BLOCKS[spec.block];
    (function walk(schema, value) {
      if (!schema || value == null) return;
      if (schema.kind === 'blocks' && Array.isArray(value)) value.forEach(function (child) { if (child && typeof child.block === 'string') { out.push(child); nestedSpecs(child, out); } });
      else if (schema.kind === 'list' && Array.isArray(value)) value.forEach(function (item) { walk(schema.of, item); });
      else if (schema.kind === 'object' && typeof value === 'object') Object.keys(schema.fields).forEach(function (name) { walk(schema.fields[name], value[name]); });
    })(def ? { kind: 'object', fields: def.props } : null, spec && spec.props);
    return out;
  }

  /* ArkUI.blocks.update(el, props, options): `el` re-rendered and patched in place (Ark's
     patchArkBlock), so a CMS edit or pin on a live block survives a refresh. options: { from, slots,
     glossary, onInvalid ('render'), keep }. On public pages the morph is its own chunk (LIVE_SCRIPT,
     global ArkKitLive), loaded by a page's FIRST update and queued until it arrives (latest props per
     element win): a block route with no live block never pays for it. docs/cms-architecture.md. */
  var LIVE_SCRIPT = 'js/ark/vendor/ark-kit-live.js';
  var liveLoad = null, queued = [];
  function patcher() {
    if (typeof ArkKitLive !== 'undefined' && ArkKitLive.patchArkBlock) return ArkKitLive.patchArkBlock;
    return kit().PUBLIC_KIT ? null : kit().patchArkBlock;
  }
  /* No chunk (it failed, or the page has no ArkUI.loadScript): the queued readings still show, by
     replacement -- what hung on the old elements is lost -- and the console says why; the next
     update tries again. A live tile never breaks its page. */
  function loadLive() {
    if (liveLoad) return liveLoad;
    var load = ArkUI.loadScript ? ArkUI.loadScript(LIVE_SCRIPT) : Promise.reject(new Error('this page has no ArkUI.loadScript (js/ark/page-loader.js)'));
    liveLoad = load.then(function () {
      var patch = patcher(), work = queued;
      queued = [];
      work.forEach(function (job) { patch(job.el, job.fresh, job.options); });
    }, function (error) {
      var work = queued;
      queued = []; liveLoad = null;
      work.forEach(function (job) { job.el.replaceWith(job.fresh); });
      console.error('ArkUI.blocks.update: live blocks were replaced, not patched in place: ' + LIVE_SCRIPT + ' did not load (' + (error && error.message) +
        '). Needs: that chunk after the public kit. Remedy: load js/ark/page-loader.js (ArkUI.loadScript), or list the chunk in the route\'s scripts.');
    });
    return liveLoad;
  }
  function update(el, props, options) {
    options = options || {};
    var name = el && el.getAttribute ? el.getAttribute('data-ark-block-refused') || el.getAttribute('data-ark-block') : null;
    if (!name || !kit().ARK_BLOCKS[name]) {
      throw new Error('ArkUI.blocks.update refused: the element is not a rendered Ark block. Needs: the root ArkUI.blocks.render or ArkUI.page made. Remedy: pass that root.');
    }
    var id = el.id && !/^ark-r-/.test(el.id) ? el.id : undefined;
    var fresh = render({ block: name, id: id, props: props }, { from: options.from, slots: options.slots, glossary: options.glossary,
      onInvalid: options.onInvalid || 'render', document: el.ownerDocument });
    if (fresh.hasAttribute('data-ark-block-refused') || el.hasAttribute('data-ark-block-refused')) { el.replaceWith(fresh); return fresh; }
    var patchOptions = options.keep ? { keep: options.keep } : {}, patch = patcher();
    if (patch) return patch(el, fresh, patchOptions);
    queued = queued.filter(function (job) { return job.el !== el; });
    queued.push({ el: el, fresh: fresh, options: patchOptions });
    loadLive();
    return el;
  }

  /* `was`: { ':root' | '<part>[#n]' | css selector: old layout key }, derived by tests/lib/layout-continuity.cjs. */
  function pinOf(root, ref) {
    if (ref === ':root') return root;
    var m = /^([a-z][a-z0-9-]*)(?:#(\d+))?$/.exec(ref);
    if (m) {
      var parts = [root].concat(Array.prototype.slice.call(root.querySelectorAll('[data-ark-part]'))).filter(function (el) { return el.getAttribute('data-ark-part') === m[1]; });
      if (parts.length) return parts[(m[2] ? +m[2] : 1) - 1] || null;
    }
    try { return root.querySelector(ref); } catch (_) { return null; }
  }
  /* A value is the old key (element and subtree), or { key, self: true } for the element alone. */
  function pinKeys(root, was) {
    Object.keys(was || {}).forEach(function (ref) {
      var el = pinOf(root, ref), value = was[ref], key = typeof value === 'string' ? value : value && value.key;
      if (!el || !key) throw new Error('ArkUI.page refused the pin "' + ref + '" -> ' + key + ': nothing in this block matches it. Remedy: re-derive the pins with tests/lib/layout-continuity.cjs.');
      el.setAttribute('data-ark-layout-pin', key);
      if (value && value.self) el.setAttribute('data-ark-layout-pin-scope', 'self');
    });
  }

  /* ArkUI.page: docs/cms-architecture.md "Pages as data". Authored specs throw on a defect
     (onInvalid 'throw'): a missing copy key is a code defect, not a box on the page. */
  function page(specs, host, options) {
    options = options || {};
    var doc = options.document || document;
    var from = options.from || routeOf(options.page);
    var root = doc.createElement(options.tag || 'section');
    root.className = ['ark-page', 'ark-block-page', options.className].filter(Boolean).join(' ');
    if (options.labelledBy) root.setAttribute('aria-labelledby', options.labelledBy);
    var renderOptions = { from: from, slots: options.slots, onInvalid: options.onInvalid || 'throw', document: doc, glossary: options.glossary,
      onFigureVisibility: options.onFigureVisibility, terms: options.terms,
      termState: options.terms === 'first-use' ? termMarker(options.glossary || glossary()) : null };
    (specs || []).forEach(function (entry) {
      if (!entry) return;
      var node;
      if (entry.insert) {
        node = doc.createElement('div');
        node.setAttribute('data-ark-insert', entry.insert);
        if (entry.was) pinKeys(node, { ':root': entry.was });
      } else if (entry.block === 'custom') {
        node = entry.mount({ document: doc, from: from, render: function (spec) { return render(spec, renderOptions); } });
        if (node && entry.id && !node.id) node.id = entry.id;
      } else {
        node = render(entry, renderOptions);
      }
      if (node && entry.was && entry.block === 'custom') pinKeys(node, entry.was);
      if (node) root.appendChild(node);
    });
    if (options.titleId) {
      var heading = root.querySelector('h1') || root.querySelector('h2');
      if (heading && !heading.id) heading.id = options.titleId;
      root.setAttribute('aria-labelledby', options.titleId);
    }
    if (options.actions) {
      root.addEventListener('ark:action', function (event) {
        var handler = event.detail && options.actions[event.detail.action];
        if (handler) handler(event.detail, event);
      });
    }
    if (host) host.appendChild(root);
    return root;
  }

  /* Every Ark block, by the name rule: the list is the kit's. */
  function install() {
    var names = kit().ARK_BLOCK_NAMES;
    names.forEach(function (name) {
      ArkUI.register(resolverId(name), {
        arkBlock: name,
        create: function (p) {
          var props = {};
          for (var k in p) if (Object.prototype.hasOwnProperty.call(p, k) && k !== 'from' && k !== 'tree') props[k] = p[k];
          return render({ block: name, props: props }, { from: p.from, onInvalid: 'render' });
        }
      });
    });
    return names.map(resolverId);
  }

  ArkUI.blocks = {
    PREFIX: PREFIX,
    scripts: ArkUI.blockScripts,
    resolverId: resolverId,
    nameOf: function (id) {
      if (String(id || '').indexOf(PREFIX) !== 0) return null;
      var names = kit().ARK_BLOCK_NAMES;
      for (var i = 0; i < names.length; i++) if (resolverId(names[i]) === id) return names[i];
      return null;
    },
    resolvers: install(),
    render: render,
    update: update,
    liveScript: LIVE_SCRIPT,
    page: page,
    glossary: glossary,
    resolveHref: resolveHref
  };
  ArkUI.page = page;
})();

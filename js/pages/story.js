/* =====================================================================
   THE STORY TEMPLATE -- one guided page, built from Ark blocks.
   ---------------------------------------------------------------------
   The theory sheets (/concept/*, /dao), the agreement chapters
   (/how-deployment-works/ask|work|check) and the agreement lifecycle (/lifecycle and its five
   stages) were three hand-built templates with seven tab/depth controls, three ARIA models and
   three label sets for the same idea -- "The core idea / How it works / Evidence & limits",
   "How it works / Why this way / What it proves", "Answer / Understand why / Evidence"
   (docs/ux-audit/pages-ux-a.md, pages-ux-b.md). They are one template now:

     breadcrumb   where the page sits (no ordinals: the eyebrow carries the position)
     hero         eyebrow = the position in its sequence ("Agreement lifecycle · 2 of 5"),
                  the title, and the page's hand-offs as its actions. The plain-language lede
                  -- the short answer -- opens The idea, so every view fits the fold rule on a
                  phone (a lede above the depth control pushed two views past 1.6 screens)
     depth        ONE control: Ark tabs, variant segmented, ONE label set on every page --
                  The idea · Step by step · Evidence. Values are the URL's own (?view=context,
                  ?view=reference; the idea has none), so every deep link saved since
                  2026-10-02 still opens its view, and history restores it.
     boundary     the callout for what is not true / not live yet, under the depth control,
                  readable in every view (a long one folds behind "Show the status" on phones)
     figure       the page's diagram in Ark's figure frame (labels >= 12px, pauses offscreen),
                  beside the depth control wider than 900px, folded under it narrower behind
                  "Show the illustration" (Ark's disclosure: never display:none)
     pager        previous / next and related pages: no story page is a dead end
     glossary     the first use of each glossary word in the page's prose becomes a term
                  (ArkUI.page terms: 'first-use', derived from docs/glossary.md)

   A page module describes its page as data (`def`, below) and calls ArkUI.story.mount. The
   contract of the blocks is docs/cms-architecture.md "Pages as data"; this file adds only the
   arrangement and the depth control's address. Layout: css/block-page.css (the story body's
   two columns), nothing per page. Regression: tests/story-blocks.cjs.

   def = {
     page, id, className, titleId,          catalog key; block-id prefix; extra root class; h1 id
     crumbs: [{ label, href }],             the last one is this page (no href)
     eyebrow, title, lede, actions, meta,   hero (lede: optional; actions: the hand-offs, at most three;
                                            meta: the page's record -- a note's series, read time, review date)
     depth: { focus: { text, blocks }, context: {...}, reference: {...} },   text first, then blocks
     boundary: <callout props>,             optional
     boundaryFold: 'phone',                 optional: a long boundary folds on phones
     boundaryMore, boundaryLess,            optional: the fold's button words (default "Show the status" / "Hide the status")
     boundaryAside: true,                   optional: the boundary sits in the side column (beside the depth control wider
                                            than 900px) -- for a page with no figure whose views are long (a note's questions)
     figure: { slot, caption, description, kind, more, less },   optional
     pager: <pager props>,                  optional
     slots, handlers,                       as ArkUI.page's slots and actions
     was: { '<block id>': <was map> },      layout-key pins, by the id of each block
     insertWas,                             the CMS anchor's old key
     query(view, el) -> string,             optional: the address of a view (default view=<v>)
     onView(view, el)             a view was chosen (also once at mount)
     onRestore(params, el)        history brought this page's address back (not at mount: read el.story.params())
     onFigureVisibility(figure, visible), dispose()
   }
   ===================================================================== */
(function () {
  'use strict';

  /* "Step by step", not "How it works" (first-visit audit 2026-10-22, P1): the header's "How it works" opens
     /how-deployment-works, so the same words on this tab opened two different things. The value stays 'context':
     every saved ?view=context address still opens this view. */
  var DEPTH = [
    { value: 'focus', label: 'The idea' },
    { value: 'context', label: 'Step by step' },
    { value: 'reference', label: 'Evidence' }
  ];
  var VALUES = DEPTH.map(function (d) { return d.value; });

  function pathOf(page) { var entry = ArkUI.pageCatalog && ArkUI.pageCatalog[page]; return entry ? entry.path : undefined; }
  /* What the address asks of `page` -- { view, params } -- or null when it is another page's. */
  function addressed(page, values, fallback) {
    if (!ArkUI.route || ArkUI.route.path() !== pathOf(page)) return null;
    var params = new URLSearchParams(ArkUI.route.search());
    var view = params.get('view');
    return { view: values.indexOf(view) >= 0 ? view : fallback, params: params };
  }

  /* A page's Ark tabs bound to its address: ?view=<value> (none for `fallback`), written on a
     choice, restored from history. Shared by the depth control and /concept's question groups,
     so the address of a view is written one way. options: { page, values, fallback,
     query(view) -> string, onView(view), onRestore(params) }. */
  function bindTabs(root, tabs, options) {
    var values = options.values, fallback = options.fallback || values[0];
    var list = tabs.querySelector('[data-ark-part="tabs-list"]');
    var triggers = Array.prototype.slice.call(list.querySelectorAll('[data-ark-part="tabs-trigger"]'));
    var panels = Array.prototype.filter.call(tabs.children, function (node) { return node.getAttribute('data-ark-part') === 'tabs-content'; });
    function current() {
      for (var i = 0; i < triggers.length; i++) if (triggers[i].getAttribute('aria-selected') === 'true') return values[i];
      return fallback;
    }
    var last = current(), quiet = false;
    function settle() {
      var now = current();
      if (now === last) return;
      last = now;
      if (options.onView) options.onView(now);
      if (!quiet && ArkUI.route) ArkUI.route.write(pathOf(options.page), options.query ? options.query(now) : (now === fallback ? '' : 'view=' + now), 'push');
    }
    /* The tabs primitive handles the click (and Enter / Space); this only follows the result. */
    list.addEventListener('click', function () { settle(); });
    /* Selecting a view the page asks for: through the primitive (a click), never by hand. */
    function select(view, how) {
      var i = values.indexOf(view);
      if (i < 0) return;
      quiet = !!(how && how.quiet);
      if (current() !== view) triggers[i].click();
      settle();
      quiet = false;
      if (how && how.focus) triggers[i].focus();
    }
    function restore() {
      var now = addressed(options.page, values, fallback);
      if (!now) return;
      select(now.view, { quiet: true });
      if (options.onRestore) options.onRestore(now.params);
    }
    root.arkRestore = restore;
    window.addEventListener('popstate', restore); window.addEventListener('hashchange', restore);
    if (options.onView) options.onView(last);
    return {
      view: current, select: select, tabs: tabs,
      panel: function (view) { return panels[values.indexOf(view)] || null; },
      /* The address's parameters while it is this page's (a page reads its own extra state, e.g. ?step=). */
      params: function () { var now = addressed(options.page, values, fallback); return now ? now.params : null; },
      dispose: function () { window.removeEventListener('popstate', restore); window.removeEventListener('hashchange', restore); }
    };
  }
  /* The value the address asks for now: a tabs block's defaultValue at render. */
  function initialView(page, values, fallback) { var at = addressed(page, values, fallback || values[0]); return at ? at.view : (fallback || values[0]); }

  function spec(def) {
    var id = def.id, was = def.was || {};
    function block(name, suffix, props) { var key = id + '-' + suffix; return { block: name, id: key, props: props, was: was[key] }; }
    var hero = { title: def.title, density: 'compact' };
    if (def.eyebrow) hero.eyebrow = def.eyebrow;
    if (def.lede) hero.lede = def.lede;
    if (def.actions) hero.actions = def.actions;
    if (def.meta) hero.meta = def.meta;
    var list = [
      block('breadcrumb', 'crumbs', { label: 'Your place', items: def.crumbs }),
      block('hero', 'hero', hero)
    ];
    list.push({ block: 'custom', id: id + '-body', was: was[id + '-body'], mount: function (ctx) {
      var doc = ctx.document;
      var body = doc.createElement('div'); body.className = 'story-body';
      var main = doc.createElement('div'); main.className = 'story-main';
      var side = doc.createElement('div'); side.className = 'story-side';
      var depth = ctx.render(block('tabs', 'depth', {
        label: 'Explanation depth', variant: 'segmented', defaultValue: def.view || 'focus',
        items: DEPTH.map(function (d) {
          var view = def.depth[d.value] || {}, item = { value: d.value, label: d.label };
          if (view.text) item.content = view.text;
          if (view.blocks && view.blocks.length) item.blocks = view.blocks;
          return item;
        })
      }));
      depth.setAttribute('data-story-depth', '');
      main.appendChild(depth);
      /* boundaryFold 'phone': a long status folds behind "Show the status" at 600px and narrower
         (Ark's disclosure: a press away, found by find-in-page); wider it is always in sight. */
      var holder = def.boundaryAside ? side : main;
      if (def.boundary && def.boundaryFold) {
        holder.appendChild(ctx.render(block('disclosure', 'status', { foldBelow: def.boundaryFold, more: def.boundaryMore || 'Show the status', less: def.boundaryLess || 'Hide the status',
          blocks: [{ block: 'callout', props: def.boundary }] })));
      } else if (def.boundary) holder.appendChild(ctx.render(block('callout', 'boundary', def.boundary)));
      if (def.figure) {
        var figure = { kind: def.figure.kind || 'illustration', slot: def.figure.slot, caption: def.figure.caption };
        if (def.figure.description) figure.description = def.figure.description;
        side.appendChild(ctx.render(block('disclosure', 'figure', {
          foldBelow: 'tablet', more: def.figure.more || 'Show the illustration', less: def.figure.less || 'Hide the illustration',
          blocks: [{ block: 'figure', props: figure }]
        })));
      }
      body.appendChild(main);
      if (side.childNodes.length) { body.appendChild(side); body.setAttribute('data-split', ''); }
      return body;
    } });
    list.push({ insert: 'main', was: def.insertWas });
    if (def.pager) list.push(block('pager', 'pager', def.pager));
    return list;
  }

  function mount(def, host) {
    def.view = initialView(def.page, VALUES, 'focus');
    var el = ArkUI.page(spec(def), null, {
      page: def.page, className: ['story-page', def.className].filter(Boolean).join(' '), titleId: def.titleId,
      slots: def.slots, actions: def.handlers, terms: 'first-use', onFigureVisibility: def.onFigureVisibility
    });
    var story = el.story = bindTabs(el, el.querySelector('[data-story-depth]'), {
      page: def.page, values: VALUES, fallback: 'focus',
      query: def.query && function (view) { return def.query(view, el); },
      onView: def.onView && function (view) { def.onView(view, el); },
      onRestore: def.onRestore && function (params) { def.onRestore(params, el); }
    });
    /* Escape returns to the idea from a deeper view (the theory sheets did this before). */
    el.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || story.view() === 'focus' || event.defaultPrevented) return;
      event.preventDefault();
      story.select('focus', { focus: true });
    });
    el.arkDispose = function () { story.dispose(); if (def.dispose) def.dispose(); };
    if (host) host.appendChild(el);
    return el;
  }

  /* "<sequence> · <n> of <N>": the eyebrow that says where a page sits in its sequence. */
  function position(name, index, count) { return name + ' · ' + (index + 1) + ' of ' + count; }

  ArkUI.story = { DEPTH: DEPTH, spec: spec, mount: mount, position: position, bindTabs: bindTabs, initialView: initialView };
})();

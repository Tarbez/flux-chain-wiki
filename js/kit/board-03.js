/* =====================================================================
   KIT BOARD 03 · NAVIGATION & STRUCTURE (js/kit/board-03.js)
   ---------------------------------------------------------------------
   The renderers for the 30 elements of the owner's board 03, registered in DefxnKit (js/kit/registry.js) under the
   ids of js/content/kit-boards.js. Styles: css/kit-boards-b.css (every rule under .kit-el .kbx).

   Each element is the real Ark UI part where Ark has one: an Ark primitive (ArkKitCatalog) run on Ark's light-DOM
   host (ArkKit.createArkDomHost, as js/admin/ark-host.js does), or an Ark block (ArkUI.blocks.render). Where Ark
   has no part, the element is composed of Ark parts plus the least markup, registered with info.partial naming the
   missing part, and shaped like an Ark part so it can be promoted into Ark UI later.

   Every hand-built piece carries data-ark-part with an Ark schema key (MENUBAR, NAVMENU, ITEM, POPOVER...) so an
   NFT skin reaches it (design/ark-ui/SKINS.md). Ark's primitives only stamp a part name where the element has none,
   so a schema key set here first wins over the primitive's own name.

   DefxnKitDom, below, is the helpers boards 03 and 04 share (js/kit/board-04.js reads it). It loads with this file.
   Every value an element shows is sample data; labels come from the site's pages (ArkSitePages) and the site's
   sample files (DEFXN_RESOLVERS, DEFXN_RECORDS) where they exist, so nothing here is a second list of them.
   ===================================================================== */
var DefxnKitDom = (function () {
  'use strict';
  var SVGNS = 'http://www.w3.org/2000/svg';
  /* strokes on the 24px grid of js/ark/icons.js, for the icons that file does not have yet */
  var PATHS = {
    lock: ['M6 11h12v9H6z', 'M9 11V8a3 3 0 0 1 6 0v3'],
    shield: ['m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z'],
    search: ['M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z', 'm15 15 5 5'],
    home: ['m4 11 8-7 8 7', 'M6 10v10h12V10'],
    grid: ['M5 5h5v5H5z', 'M14 5h5v5h-5z', 'M5 14h5v5H5z', 'M14 14h5v5h-5z'],
    folder: ['M4 6h6l2 2h8v11H4z'],
    file: ['M7 3h7l4 4v14H7z', 'M14 3v5h4'],
    down: ['m6 9 6 6 6-6'],
    right: ['m9 6 6 6-6 6'],
    left: ['m15 6-6 6 6 6'],
    plus: ['M12 5v14', 'M5 12h14'],
    close: ['m6 6 12 12', 'M18 6 6 18'],
    menu: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
    alert: ['M12 4 3 20h18L12 4Z', 'M12 10v4', 'M12 17v.5'],
    info: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z', 'M12 11v6', 'M12 7.5v.5'],
    offline: ['M4 9a12 12 0 0 1 16 0', 'M7 12.5a7 7 0 0 1 10 0', 'M10 16a2.5 2.5 0 0 1 4 0', 'M4 4l16 16'],
    upload: ['M12 16V5', 'm7 10 5-5 5 5', 'M5 19h14'],
    key: ['M8 10a4 4 0 1 0 0 .1Z', 'M12 12h9', 'M18 12v3', 'M21 12v2'],
    clock: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z', 'M12 7v5l3 2'],
    ban: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z', 'm6 6 12 12'],
    grip: ['M9 6v.5', 'M15 6v.5', 'M9 12v.5', 'M15 12v.5', 'M9 18v.5', 'M15 18v.5'],
    record: ['M5 4h14v16H5z', 'M8 8h8', 'M8 12h8', 'M8 16h5']
  };

  function add(el, kid) {
    if (kid == null || kid === false) return;
    if (Array.isArray(kid)) { kid.forEach(function (k) { add(el, k); }); return; }
    el.appendChild(typeof kid === 'string' || typeof kid === 'number' ? document.createTextNode(String(kid)) : kid);
  }
  /* h(tag, attrs, ...children): `part` is data-ark-part, `text` the text, `hidden: true` the hidden attribute */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'part') el.setAttribute('data-ark-part', v);
      else if (k === 'hidden') el.hidden = true;
      else el.setAttribute(k, v === true ? '' : String(v));
    });
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function refusal(what, needs, remedy) {
    return new Error(what + ' Needs: ' + needs + ' Remedy: ' + remedy);
  }
  /* an Ark primitive factory: the full catalog first (the Kit route loads it), then the full kit */
  function kit(name) {
    var f = (window.ArkKitCatalog && window.ArkKitCatalog[name]) || (window.ArkKit && window.ArkKit[name]);
    if (typeof f !== 'function') throw refusal('Ark UI has no ' + name + ' on this page.', 'js/ark/vendor/ark-kit-catalog.js (ArkKitCatalog).', 'load the Kit route\'s scripts (js/pages/catalog.js, pageCatalog.kit).');
    return f;
  }
  /* a fresh light-DOM host per element (with overlays: focus in and back, Escape and outside press dismiss) */
  function host() {
    if (!window.ArkKit || typeof window.ArkKit.createArkDomHost !== 'function') throw refusal('Ark UI\'s light-DOM host is not loaded.', 'js/ark/vendor/ark-kit.js (ArkKit.createArkDomHost).', 'load the Kit route\'s scripts (js/pages/catalog.js, pageCatalog.kit).');
    return window.ArkKit.createArkDomHost(document);
  }
  function block(name, props) {
    if (!window.ArkUI || !ArkUI.blocks || typeof ArkUI.blocks.render !== 'function') throw refusal('Ark blocks are not loaded.', 'js/ark/blocks.js (ArkUI.blocks).', 'load the Kit route\'s scripts (js/pages/catalog.js, pageCatalog.kit).');
    return ArkUI.blocks.render({ block: name, props: props }, { onInvalid: 'throw' });
  }
  /* moves a rendered Ark block on to new props through Ark's live patch (ArkUI.blocks.update): the root, the focused
     button and every listener on the root stay; returns the root to keep (a refused patch hands back a new one) */
  function update(el, props) {
    if (!window.ArkUI || !ArkUI.blocks || typeof ArkUI.blocks.update !== 'function') throw refusal('Ark blocks cannot be updated on this page.', 'js/ark/blocks.js (ArkUI.blocks.update) over the full kit (js/ark/vendor/ark-kit.js).', 'load the Kit route\'s scripts (js/pages/catalog.js, pageCatalog.kit).');
    return ArkUI.blocks.update(el, props, { onInvalid: 'throw' });
  }
  function icon(name, size) {
    var paths = (window.ArkUI && ArkUI.iconPaths && ArkUI.iconPaths[name]) || PATHS[name];
    if (!paths) throw refusal('No icon named "' + name + '".', 'a stroke list in js/ark/icons.js or DefxnKitDom.PATHS.', 'use one of those names.');
    var svg = document.createElementNS(SVGNS, 'svg');
    var px = String(size || 14);
    [['viewBox', '0 0 24 24'], ['width', px], ['height', px], ['aria-hidden', 'true'], ['focusable', 'false'], ['fill', 'none'], ['stroke', 'currentColor'],
      ['stroke-width', '1.6'], ['stroke-linecap', 'round'], ['stroke-linejoin', 'round'], ['class', 'kbx-ico']].forEach(function (a) { svg.setAttribute(a[0], a[1]); });
    paths.forEach(function (d) { var p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', d); svg.appendChild(p); });
    return svg;
  }
  /* the site's own page: { label, href } from js/content/site-pages.js; `as` is a shorter label where a tile is narrow */
  function page(key, as) {
    var P = window.ArkSitePages, row = P && P.pages ? P.pages().filter(function (r) { return r.key === key; })[0] : null;
    if (!row) throw refusal('The site has no page "' + key + '".', 'a row with that key in js/content/site-pages.js (ArkSitePages).', 'use a key from ArkSitePages.pages().');
    return { label: as || row.short || row.label, href: row.path, key: key };
  }
  function sample(name, file) {
    var d = window[name];
    if (!d) throw refusal('The sample data ' + name + ' is not loaded.', file + '.', 'load the Kit route\'s scripts (js/pages/catalog.js, pageCatalog.kit).');
    return d;
  }
  function resolvers() { return sample('DEFXN_RESOLVERS', 'js/content/resolvers-data.js').resolvers; }
  function records() { return sample('DEFXN_RECORDS', 'js/content/records-sample.js').records; }
  function resolver(id) { return resolvers().filter(function (r) { return r.id === id; })[0] || resolvers()[0]; }

  /* the element's root inside the page's box; links inside never navigate the editor's canvas */
  function root(box, name, tag) {
    var r = h(tag || 'div', { class: 'kbx kbx-' + name });
    r.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (a && r.contains(a)) e.preventDefault();
    });
    box.appendChild(r);
    return r;
  }
  /* what an element set up outside its root, undone by the cleanup it returns */
  function bag() {
    var fns = [];
    return {
      add: function (fn) { fns.push(fn); },
      later: function (fn, ms) { var t = setTimeout(fn, ms); fns.push(function () { clearTimeout(t); }); return t; },
      on: function (target, type, fn, opt) { target.addEventListener(type, fn, opt); fns.push(function () { target.removeEventListener(type, fn, opt); }); },
      done: function () { fns.splice(0).forEach(function (fn) { try { fn(); } catch (e) { /* already gone */ } }); }
    };
  }
  function reduced() { try { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } }
  /* sets data-visible on el while it is on screen (a spinner turns only then); returns the stop */
  function whileVisible(el) {
    if (typeof IntersectionObserver !== 'function') { el.setAttribute('data-visible', ''); return function () {}; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { el.toggleAttribute('data-visible', en.isIntersecting); });
    });
    io.observe(el);
    return function () { io.disconnect(); el.removeAttribute('data-visible'); };
  }
  var seq = 0;
  function uid(scope) { seq += 1; return 'kbx-' + scope + '-' + seq; }

  /* a row of links that marks where you are: Ark's roving focus (arrows between them), aria-current on the chosen */
  function navLinks(H, links, orientation, current) {
    var refs = links.map(function (a) { return H.bind(a, 'nav-link'); });
    H.createRovingFocusGroup(uid('nav'), { refs: refs, orientation: orientation || 'horizontal', loop: true });
    function pick(i) { links.forEach(function (a, j) { if (j === i) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }); }
    links.forEach(function (a, i) { a.addEventListener('click', function () { pick(i); }); });
    pick(current || 0);
    return pick;
  }
  /* an Ark menu (createArkMenu or createArkDropdownMenu) on a trigger and a hidden content; items close it on pick */
  function menu(H, trigger, content, items, onPick, factory) {
    content.hidden = true;
    var t = H.bind(trigger, 'menu-trigger'), c = H.bind(content, 'menu');
    var refs = items.map(function (it) { return H.bind(it, 'menu-item'); });
    var handle = kit(factory || 'createArkMenu')(H, { triggerRef: t, contentRef: c, itemRefs: refs, loop: true, typeahead: true });
    items.forEach(function (it, i) {
      it.addEventListener('click', function () {
        if (onPick) onPick(i, it);
        /* createArkMenu hands back close(); createArkDropdownMenu hands back nothing, and a press inside the content
           already closes it (the menu listens for presses on its content) */
        if (handle && handle.close) handle.close();
      });
    });
    return { handle: handle, refs: refs, contentRef: c };
  }
  function meta(text, cls) { return h('span', { class: 'kbx-meta' + (cls ? ' ' + cls : ''), part: 'META|TEXT' }, text); }
  function mark() { return h('span', { class: 'kbx-mark', 'aria-hidden': 'true' }, 'DX'); }
  function initials(name) { return String(name).replace(/\.fxn$/, '').slice(0, 2).toUpperCase(); }
  /* an Ark avatar: initials (no image in a sample), and a presence dot when the status is given */
  function avatar(H, name, status) {
    var fb = h('span', { class: 'kbx-avatar__fallback' }, initials(name));
    var dot = status ? h('span', { class: 'kbx-avatar__status' }) : null;
    var el = h('span', { class: 'kbx-avatar', part: 'AVATAR' }, fb, dot);
    kit('createArkAvatar')(H, { rootRef: H.bind(el, 'avatar'), fallbackRef: H.bind(fb, 'avatar-fallback'), statusRef: dot ? H.bind(dot, 'avatar-status') : undefined, status: status, size: 'sm' });
    return { el: el, set: function (n) { fb.textContent = initials(n); } };
  }
  function reg(id, render, info) { DefxnKit.register(id, render, info); }

  return { h: h, kit: kit, host: host, block: block, update: update, icon: icon, page: page, resolvers: resolvers, records: records, resolver: resolver,
    root: root, bag: bag, reduced: reduced, whileVisible: whileVisible, uid: uid, navLinks: navLinks, menu: menu, meta: meta, mark: mark,
    avatar: avatar, refusal: refusal, reg: reg, PATHS: PATHS };
})();

(function () {
  'use strict';
  var D = DefxnKitDom, h = D.h, reg = D.reg;

  /* ---- 01 Top navigation bar: the site bar's parts (MENUBAR, NAVMENU, LINK), Ark's roving focus between links ---- */
  reg('03-top-navigation-bar', function (box) {
    var H = D.host(), R = D.root(box, 'topnav');
    var links = ['about', 'learnings', 'resolutions'].map(function (k) { var p = D.page(k); return h('a', { class: 'kbx-topnav__link', href: p.href, part: 'LINK' }, p.label); });
    R.appendChild(h('header', { class: 'kbx-topnav__bar', part: 'MENUBAR' },
      h('a', { class: 'kbx-topnav__home', href: '/', 'aria-label': 'DEFXN home', part: 'LINK' }, D.mark()),
      h('nav', { class: 'kbx-topnav__nav', 'aria-label': 'Pages', part: 'NAVMENU' }, links),
      h('button', { type: 'button', class: 'kbx-iconbtn', 'aria-label': 'Your account', part: 'GHOST|BUTTON' }, D.icon('account'))));
    D.navLinks(H, links, 'horizontal');
  }, { uses: ['MENUBAR', 'NAVMENU', 'LINK', 'GHOST|BUTTON', 'ArkKit.createArkDomHost roving focus'] });

  /* ---- 02 Side navigation: createArkSidebar (collapses to its icons), links in Ark's roving focus ---- */
  reg('03-side-navigation', function (box) {
    var H = D.host(), R = D.root(box, 'side');
    var rows = [['account', 'account'], ['account/domains', 'document'], ['identity/safe', 'authority'], ['explorer', 'network']];
    var links = rows.map(function (r) { var p = D.page(r[0]); return h('a', { class: 'kbx-side__link', href: p.href, part: 'ITEM', title: p.label }, D.icon(r[1]), h('span', { class: 'kbx-side__label' }, p.label)); });
    var toggle = h('button', { type: 'button', class: 'kbx-iconbtn kbx-side__toggle', 'aria-label': 'Fold the side navigation', 'aria-expanded': 'true', part: 'GHOST|BUTTON' }, D.icon('left'));
    var aside = h('aside', { class: 'kbx-side__bar', part: 'ASIDE', 'data-open': '' }, toggle, h('nav', { class: 'kbx-side__nav', 'aria-label': 'Account' }, links));
    R.appendChild(aside);
    R.appendChild(h('div', { class: 'kbx-side__main', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')));
    D.kit('createArkSidebar')(H, { sidebarRef: H.bind(aside, 'sidebar'), triggerRef: H.bind(toggle, 'sidebar-trigger'), openWidth: '62%', closedWidth: '30px',
      onOpenChange: function (open) {
        aside.toggleAttribute('data-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Fold the side navigation' : 'Open the side navigation');
        toggle.replaceChildren(D.icon(open ? 'left' : 'right'));
      } });
    D.navLinks(H, links, 'vertical', 1);
  }, { uses: ['createArkSidebar', 'ASIDE', 'ITEM', 'GHOST|BUTTON', 'ArkKit.createArkDomHost roving focus'] });

  /* ---- 03 Bottom navigation: Ark's bottom-nav block; a press moves the current page through Ark's live update ---- */
  reg('03-bottom-navigation', function (box) {
    var R = D.root(box, 'bottom');
    var rows = [['zero', 'house', 'Home'], ['explorer', 'compass', 'Explore'], ['learnings', 'book-open', null], ['account', 'user', 'You']];
    var items = rows.map(function (r) { var p = D.page(r[0], r[2]); return { label: p.label, href: p.href, icon: r[1] }; });
    function props(cur) { return { label: 'Main', items: items.map(function (it, i) { return { label: it.label, href: it.href, icon: it.icon, current: i === cur }; }) }; }
    R.appendChild(h('div', { class: 'kbx-bottom__screen', 'aria-hidden': 'true' }, h('i'), h('i')));
    var el = D.block('bottom-nav', props(0));
    R.appendChild(el);
    el.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href]') : null;
      var links = Array.prototype.slice.call(el.querySelectorAll('a[href]')), i = links.indexOf(a);
      if (i >= 0) el = D.update(el, props(i));
    });
  }, { uses: ['bottom-nav block', 'bottom-nav-item', 'ArkUI.blocks.update'] });

  /* ---- 04 Breadcrumb trail: Ark's breadcrumb block (createArkBreadcrumbs; collapses behind … past three) ---- */
  reg('03-breadcrumb-trail', function (box) {
    var R = D.root(box, 'crumbs');
    var trail = ['zero', 'account', 'account/domains'].map(function (k) { var p = D.page(k); return { label: p.label, href: p.href }; });
    trail.push({ label: 'subzero.fxn' });
    R.appendChild(D.block('breadcrumb', { items: trail, maxVisible: 3 }));
  }, { uses: ['breadcrumb block', 'createArkBreadcrumbs', 'BREADCRUMBS'] });

  /* ---- 05 Tab set: Ark's tabs block (createArkTabs), underline look ---- */
  reg('03-tab-set', function (box) {
    var R = D.root(box, 'tabset');
    var name = D.resolver('records');
    R.appendChild(D.block('tabs', { label: 'Name details', variant: 'tabs', activation: 'automatic', items: [
      { value: 'what', label: 'What', content: name.line },
      { value: 'offers', label: 'Offers', content: name.offers.join(', ') + '.' },
      { value: 'price', label: 'Price', content: name.price + '.' }] }));
  }, { uses: ['tabs block', 'createArkTabs', 'TABSLIST', 'TABSTRIGGER', 'TABSCONTENT'] });

  /* ---- 06 Pill tabs: the same block, segmented look ---- */
  reg('03-pill-tabs', function (box) {
    var R = D.root(box, 'pills');
    var list = D.resolvers().slice(0, 3);
    R.appendChild(D.block('tabs', { label: 'Resolver', variant: 'segmented', activation: 'automatic',
      items: list.map(function (r) { return { value: r.id, label: r.name, content: r.line }; }) }));
  }, { uses: ['tabs block (segmented)', 'createArkTabs', 'TABSLIST', 'TABSTRIGGER'] });

  /* ---- 07 Stepper: Ark's steps block in progress mode, the sign-in page's four steps (js/pages/auth.js) ---- */
  reg('03-stepper', function (box) {
    var R = D.root(box, 'stepper');
    var states = ['done', 'done', 'current', 'pending'];
    R.appendChild(D.block('steps', { label: 'Sign-in steps', mode: 'progress',
      items: ['Identity', 'Verify', 'Connect', 'Ready'].map(function (t, i) { return { title: t, state: states[i] }; }) }));
  }, { uses: ['steps block', 'STEPPER', 'STEP'] });

  /* ---- 08 Progress rail: createArkProgress over the agreement lifecycle's five stages; a stage moves the rail ---- */
  reg('03-progress-rail', function (box) {
    var H = D.host(), R = D.root(box, 'rail');
    var stages = ['lifecycle/intent', 'lifecycle/offer', 'lifecycle/agreement', 'lifecycle/fulfillment', 'lifecycle/receipt'].map(function (k) { return D.page(k); });
    var fill = h('span', { class: 'kbx-rail__fill' });
    var track = h('div', { class: 'kbx-rail__track', part: 'PROGRESS', 'aria-label': 'Agreement lifecycle' }, h('span', { class: 'kbx-rail__ind', part: 'PROGRESSINDICATOR' }, fill));
    var now = h('p', { class: 'kbx-rail__now' });
    var btns = stages.map(function (s, i) { return h('button', { type: 'button', class: 'kbx-rail__stop', part: 'STEP', 'aria-label': s.label }, h('i'), h('span', null, s.label)); });
    R.appendChild(h('p', { class: 'kbx-meta' }, 'Agreement lifecycle'));
    R.appendChild(h('div', { class: 'kbx-rail__line' }, track, h('div', { class: 'kbx-rail__stops' }, btns)));
    R.appendChild(now);
    var ind = track.firstChild;
    var bar = D.kit('createArkProgress')(H, { rootRef: H.bind(track, 'progress'), indicatorRef: H.bind(ind, 'progress-indicator'), min: 0, max: stages.length - 1, value: 2,
      onValueChange: function (v) {
        btns.forEach(function (b, i) { b.setAttribute('data-state', i < v ? 'done' : i === v ? 'current' : 'pending'); if (i === v) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
        now.textContent = 'Now: ' + stages[v].label;
      } });
    var refs = btns.map(function (b) { return H.bind(b, 'stage'); });
    H.createRovingFocusGroup(D.uid('rail'), { refs: refs, orientation: 'horizontal', loop: false });
    btns.forEach(function (b, i) { b.addEventListener('click', function () { bar.setValue(i); }); });
  }, { uses: ['createArkProgress', 'PROGRESS', 'PROGRESSINDICATOR', 'STEP'] });

  /* ---- 09 Section header: Ark's section-header block ---- */
  reg('03-section-header', function (box) {
    var R = D.root(box, 'sechead');
    R.appendChild(D.block('section-header', { eyebrow: 'Your domains', index: '03', title: 'Names you hold', lede: 'Flat .fxn names this FXN ID holds on devnet.', level: 3 }));
  }, { uses: ['section-header block', 'SECTION', 'HEADING'] });

  /* ---- 10 Sticky toolbar: a TOOLBAR that stays at the top while the rows under it scroll ---- */
  reg('03-sticky-toolbar', function (box) {
    var H = D.host(), R = D.root(box, 'sticky');
    var modes = ['Edit', 'Preview'].map(function (t) { return h('button', { type: 'button', class: 'kbx-seg__item', part: 'BUTTON' }, t); });
    var group = h('div', { class: 'kbx-seg', part: 'TOGGLEGROUP', 'aria-label': 'Mode' }, modes);
    var acts = [['sign', 'Sign'], ['link', 'Copy link'], ['open', 'Open']].map(function (a) { return h('button', { type: 'button', class: 'kbx-iconbtn', 'aria-label': a[1], title: a[1], part: 'GHOST|BUTTON' }, D.icon(a[0])); });
    var tools = h('div', { class: 'kbx-sticky__acts' }, acts);
    var rows = D.records().map(function (r) { return h('li', { class: 'kbx-sticky__row', part: 'ITEM' }, h('span', null, r.title), D.meta('Rev ' + r.revision)); });
    R.appendChild(h('div', { class: 'kbx-sticky__bar', role: 'toolbar', 'aria-label': 'Record tools', part: 'TOOLBAR' }, group, tools));
    R.appendChild(h('ul', { class: 'kbx-sticky__rows', 'aria-label': 'Records' }, rows));
    R.setAttribute('tabindex', '0');
    R.setAttribute('aria-label', 'Records, scrolls under the toolbar');
    var modeRefs = modes.map(function (m) { return H.bind(m, 'toggle'); });
    D.kit('createArkToggleGroup')(H, { rootRef: H.bind(group, 'toggle-group'), itemRefs: modeRefs, selectedRefs: [modeRefs[0]] });
    D.kit('createArkButtonGroup')(H, { rootRef: H.bind(tools, 'button-group'), itemRefs: acts.map(function (a) { return H.bind(a, 'tool'); }), label: 'Record actions' });
  }, { uses: ['TOOLBAR', 'createArkToggleGroup', 'createArkButtonGroup', 'ITEM'] });

  /* ---- 11 Command bar: createArkCommandSurface over the Domain resolver's own offers (DEFXN_RESOLVERS) ---- */
  reg('03-command-bar', function (box) {
    var H = D.host(), R = D.root(box, 'cmd');
    var offers = D.resolver('domain').offers;
    var input = h('input', { class: 'kbx-cmd__input', type: 'text', placeholder: 'Type a command', 'aria-label': 'Command', autocomplete: 'off', part: 'SEARCH|TEXT' });
    var opts = offers.map(function (o) { return h('li', { class: 'kbx-cmd__opt', part: 'ITEM' }, h('span', null, o), h('kbd', { class: 'kbx-kbd', part: 'KBD|TEXT' }, '↵')); });
    var empty = h('li', { class: 'kbx-cmd__empty', part: 'EMPTY|TEXT' }, 'No command matches.');
    var list = h('ul', { class: 'kbx-cmd__list kbx-pop', part: 'COMMANDLIST', hidden: true }, opts, empty);
    var said = h('p', { class: 'kbx-cmd__said', role: 'status' }, 'Domain resolver · ' + offers.length + ' commands');
    R.appendChild(h('div', { class: 'kbx-cmd__field', part: 'INPUTGROUP' }, D.icon('search'), input, h('kbd', { class: 'kbx-kbd', part: 'KBD|TEXT' }, '/')));
    R.appendChild(list);
    R.appendChild(said);
    R.setAttribute('data-ark-part', 'COMMAND');
    D.kit('createArkCommandSurface')(H, { inputRef: H.bind(input, 'command-input'), contentRef: H.bind(list, 'command-list'), optionRefs: opts.map(function (o) { return H.bind(o, 'command'); }),
      emptyRef: H.bind(empty, 'command-empty'), openOnFocus: true,
      onCommand: function (ref, value) { if (value) said.textContent = 'Chose: ' + value + ' (sample, nothing runs)'; } });
  }, { uses: ['createArkCommandSurface', 'COMMAND', 'COMMANDLIST', 'INPUTGROUP', 'KBD|TEXT'] });

  /* ---- 12 Dock: Ark's dock block over the site's main pages; a press (its ark:action) marks that app open ---- */
  reg('03-dock', function (box) {
    var R = D.root(box, 'dock');
    var rows = [['zero', 'house'], ['explorer', 'compass'], ['resolutions', 'route'], ['bundledeployer', 'terminal']];
    var end = D.page('account');
    var apps = rows.map(function (r) { var p = D.page(r[0]); return { label: p.label, icon: r[1], action: 'open-' + p.key }; });
    var all = apps.concat([{ label: end.label, icon: 'user', action: 'open-' + end.key }]);
    function props(open) {
      var mark = function (it) { return { label: it.label, icon: it.icon, action: it.action, active: it.action === open }; };
      return { label: 'Apps', items: apps.map(mark), endItems: [mark(all[all.length - 1])] };
    }
    var el = D.block('dock', props(all[0].action));
    R.appendChild(el);
    el.addEventListener('ark:action', function (e) {
      var act = e.detail && e.detail.action;
      if (all.some(function (it) { return it.action === act; })) el = D.update(el, props(act));
    });
  }, { uses: ['dock block', 'dock-item', 'ark:action', 'ArkUI.blocks.update'] });

  /* ---- 13 Menu list: an open Ark menu (role menu): a label, a radio pair, a check item, a separator ---- */
  reg('03-menu-list', function (box) {
    var H = D.host(), R = D.root(box, 'menulist');
    var label = h('p', { class: 'kbx-menu__label', part: 'LABEL|TEXT' }, 'subzero.fxn');
    var points = ['Point at bundle', 'Point at address'].map(function (t) { return h('div', { class: 'kbx-menu__item', part: 'ITEM' }, h('span', { class: 'kbx-menu__check', 'aria-hidden': 'true' }), t); });
    var show = h('div', { class: 'kbx-menu__item', part: 'ITEM' }, h('span', { class: 'kbx-menu__check', 'aria-hidden': 'true' }), 'Show on profile');
    var sep = h('div', { class: 'kbx-menu__sep', part: 'SEPARATOR' });
    var copy = h('div', { class: 'kbx-menu__item', part: 'ITEM' }, h('span', { class: 'kbx-menu__check', 'aria-hidden': 'true' }), 'Copy name');
    var menu = h('div', { class: 'kbx-menu', part: 'POPOVER' }, label, points, sep, show, copy);
    R.appendChild(menu);
    var items = points.concat([show, copy]);
    var refs = items.map(function (it) { return H.bind(it, 'menu-item'); });
    var mref = H.bind(menu, 'menu');
    H.configureRef(mref, { role: 'menu', label: 'Name actions' });
    refs.forEach(function (r) { H.configureRef(r, { role: 'menuitem' }); });
    H.createRovingFocusGroup(D.uid('menu'), { refs: refs, orientation: 'vertical', loop: true, typeahead: true });
    D.kit('createArkMenuLabel')(H, { labelRef: H.bind(label, 'menu-label') });
    D.kit('createArkMenuSeparator')(H, { separatorRef: H.bind(sep, 'menu-separator') });
    D.kit('createArkMenuRadioGroup')(H, { itemRefs: refs.slice(0, 2), selectedRef: refs[0] });
    D.kit('createArkMenuCheckboxItem')(H, { itemRef: refs[2], checked: true });
  }, { uses: ['createArkMenuRadioGroup', 'createArkMenuCheckboxItem', 'createArkMenuLabel', 'createArkMenuSeparator', 'POPOVER', 'ITEM'] });

  /* ---- 14 Context menu: createArkContextMenu; right-click (or the menu key, or Shift+F10) opens it where you are ---- */
  reg('03-context-menu', function (box) {
    var H = D.host(), R = D.root(box, 'ctx');
    var target = h('div', { class: 'kbx-ctx__target', tabindex: '0', part: 'ITEM', 'aria-label': 'subzero.fxn, right-click for actions' },
      D.icon('record'), h('span', null, 'subzero.fxn'), D.meta('Right-click'));
    var anchor = h('span', { class: 'kbx-ctx__anchor', 'aria-hidden': 'true' });
    var labels = ['Open record', 'Copy name', 'Transfer name'];
    var items = labels.map(function (t) { return h('div', { class: 'kbx-menu__item', part: 'ITEM' }, t); });
    var content = h('div', { class: 'kbx-menu kbx-pop kbx-ctx__menu', part: 'POPOVER', hidden: true }, items);
    var said = h('p', { class: 'kbx-ctx__said', role: 'status' });
    R.appendChild(target); R.appendChild(anchor); R.appendChild(content); R.appendChild(said);
    var refs = items.map(function (it) { return H.bind(it, 'menu-item'); });
    var place = function (x, y) {
      var r = R.getBoundingClientRect();
      content.style.left = Math.max(0, Math.min(x - r.left, r.width - 112)) + 'px';
      content.style.top = Math.max(0, Math.min(y - r.top, r.height - 62)) + 'px';
    };
    target.addEventListener('contextmenu', function (e) { place(e.clientX, e.clientY); });
    var handle = D.kit('createArkContextMenu')(H, { targetRef: H.bind(target, 'context-target'), anchorRef: H.bind(anchor, 'context-anchor'), contentRef: H.bind(content, 'context-menu'), itemRefs: refs, loop: true });
    target.addEventListener('keydown', function (e) {
      if (e.key !== 'ContextMenu' && !(e.shiftKey && e.key === 'F10')) return;
      e.preventDefault();
      var t = target.getBoundingClientRect(); place(t.left + 24, t.top + t.height / 2);
      handle.open();
    });
    items.forEach(function (it, i) { it.addEventListener('click', function () { said.textContent = labels[i] + ' (sample)'; handle.close(); target.focus(); }); });
  }, { uses: ['createArkContextMenu', 'POPOVER', 'ITEM'] });

  /* ---- 15 Mega menu tile: one panel of the Products mega menu, in the site's own part names ---- */
  reg('03-mega-menu-tile', function (box) {
    var H = D.host(), R = D.root(box, 'mega');
    var links = [['resolutions', 'resolver'], ['resolver', 'inspect'], ['resolver-math', 'model']].map(function (r) {
      var p = D.page(r[0]);
      return h('a', { class: 'kbx-mega__link', href: p.href, part: 'ITEM' }, h('span', { part: 'ITEMLEADING' }, D.icon(r[1])), h('span', { class: 'kbx-mega__name', part: 'ITEMCONTENT' }, p.label));
    });
    var feat = D.page('bundledeployer');
    R.appendChild(h('div', { class: 'kbx-mega__panel', part: 'MEGAMENUPANEL', role: 'group', 'aria-label': 'Build' },
      h('div', { class: 'kbx-mega__col', part: 'MEGAMENUCOLUMN' }, h('p', { class: 'kbx-meta' }, 'Build'), links),
      h('a', { class: 'kbx-mega__feature', href: feat.href, part: 'CARD' }, D.icon('terminal', 16), h('b', { part: 'TITLE|TEXT' }, feat.label), h('span', { part: 'BODY|TEXT' }, 'Put a site on devnet.'))));
    H.createRovingFocusGroup(D.uid('mega'), { refs: links.map(function (a) { return H.bind(a, 'mega-link'); }), orientation: 'vertical', loop: true });
  }, { uses: ['MEGAMENUPANEL', 'MEGAMENUCOLUMN', 'ITEM', 'CARD'] });

  /* ---- 16 Account switcher: an Ark avatar on a menu trigger; the menu picks which FXN ID on this device signs ---- */
  reg('03-account-switcher', function (box) {
    var H = D.host(), R = D.root(box, 'acct');
    var names = ['subzero.fxn', 'alex.fxn'];
    var av = D.avatar(H, names[0], 'online');
    var who = h('span', { class: 'kbx-acct__name', part: 'TITLE|TEXT' }, names[0]);
    var trigger = h('button', { type: 'button', class: 'kbx-acct__trigger', part: 'BUTTON', 'aria-label': 'Switch FXN ID' }, av.el,
      h('span', { class: 'kbx-acct__words' }, who, D.meta('Public ID · devnet')), D.icon('down'));
    var picks = names.map(function (n) { return h('div', { class: 'kbx-menu__item', part: 'ITEM' }, h('span', { class: 'kbx-menu__check', 'aria-hidden': 'true' }), n); });
    var addId = h('div', { class: 'kbx-menu__item', part: 'ITEM' }, D.icon('plus', 12), 'Add an FXN ID');
    var content = h('div', { class: 'kbx-menu kbx-pop kbx-acct__menu', part: 'POPOVER' }, picks, h('div', { class: 'kbx-menu__sep', part: 'SEPARATOR' }), addId);
    R.appendChild(trigger); R.appendChild(content);
    var m = D.menu(H, trigger, content, picks.concat([addId]), function (i) { if (i < names.length) { who.textContent = names[i]; av.set(names[i]); } });
    D.kit('createArkMenuRadioGroup')(H, { itemRefs: m.refs.slice(0, names.length), selectedRef: m.refs[0] });
  }, { uses: ['createArkMenu', 'createArkMenuRadioGroup', 'createArkAvatar', 'POPOVER', 'AVATAR', 'ITEM'] });

  /* ---- 17 Dropdown nav: createArkDropdownMenu of the site's resolver pages ---- */
  reg('03-dropdown-nav', function (box) {
    var H = D.host(), R = D.root(box, 'dropnav');
    var pages = ['resolutions', 'resolver', 'resolver-math', 'references'].map(function (k) { return D.page(k); });
    var cur = h('span', { class: 'kbx-dropnav__cur' }, pages[0].label);
    var trigger = h('button', { type: 'button', class: 'kbx-dropnav__trigger', part: 'BUTTON' }, D.meta('Build'), cur, D.icon('down'));
    var items = pages.map(function (p) { return h('a', { class: 'kbx-menu__item', href: p.href, part: 'ITEM' }, p.label); });
    var content = h('nav', { class: 'kbx-menu kbx-pop kbx-dropnav__menu', part: 'POPOVER', 'aria-label': 'Build pages' }, items);
    R.appendChild(trigger); R.appendChild(content);
    items[0].setAttribute('aria-current', 'page');
    D.menu(H, trigger, content, items, function (i) {
      cur.textContent = pages[i].label;
      items.forEach(function (a, j) { if (i === j) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    }, 'createArkDropdownMenu');
  }, { uses: ['createArkDropdownMenu', 'POPOVER', 'ITEM', 'BUTTON'] });

  /* ---- 18 Pagination: createArkPagination, nine pages, one each side of the current, the rest behind … ---- */
  reg('03-pagination', function (box) {
    var H = D.host(), R = D.root(box, 'pager');
    var n = 9, pages = [];
    for (var i = 0; i < n; i++) pages.push(h('button', { type: 'button', class: 'kbx-pager__page', part: 'BUTTON' }, String(i + 1)));
    var prev = h('button', { type: 'button', class: 'kbx-pager__step', 'aria-label': 'Previous page', part: 'GHOST|BUTTON' }, D.icon('left', 12));
    var next = h('button', { type: 'button', class: 'kbx-pager__step', 'aria-label': 'Next page', part: 'GHOST|BUTTON' }, D.icon('right', 12));
    var lead = h('span', { class: 'kbx-pager__gap', 'aria-hidden': 'true' }, '…'), trail = h('span', { class: 'kbx-pager__gap', 'aria-hidden': 'true' }, '…');
    var nav = h('nav', { class: 'kbx-pager__nav', part: 'PAGINATION', 'aria-label': 'Record pages' }, prev, pages[0], lead, pages.slice(1, n - 1), trail, pages[n - 1], next);
    var said = h('p', { class: 'kbx-pager__said', role: 'status' });
    R.appendChild(nav); R.appendChild(said);
    D.kit('createArkPagination')(H, { navRef: H.bind(nav, 'pagination'), pageRefs: pages.map(function (p) { return H.bind(p, 'page'); }), previousRef: H.bind(prev, 'previous'), nextRef: H.bind(next, 'next'),
      leadingEllipsisRef: H.bind(lead, 'leading'), trailingEllipsisRef: H.bind(trail, 'trailing'), siblingCount: 1, currentRef: undefined,
      onPageChange: function (ref, index) { said.textContent = 'Page ' + (index + 1) + ' of ' + n; } });
  }, { uses: ['createArkPagination', 'PAGINATION', 'BUTTON'] });

  /* ---- 19 Carousel controls: createArkCarousel over three resolvers (DEFXN_RESOLVERS), arrows and dots ---- */
  reg('03-carousel-controls', function (box) {
    var H = D.host(), R = D.root(box, 'carousel');
    var list = D.resolvers().slice(0, 3);
    var slides = list.map(function (r) { return h('div', { class: 'kbx-carousel__slide', part: 'CARD' }, h('b', { part: 'TITLE|TEXT' }, r.name), h('span', { part: 'BODY|TEXT' }, r.line)); });
    var track = h('div', { class: 'kbx-carousel__track' }, slides);
    var view = h('div', { class: 'kbx-carousel__view', tabindex: '0' }, track);
    var prev = h('button', { type: 'button', class: 'kbx-iconbtn', 'aria-label': 'Previous resolver', part: 'GHOST|BUTTON' }, D.icon('left', 12));
    var next = h('button', { type: 'button', class: 'kbx-iconbtn', 'aria-label': 'Next resolver', part: 'GHOST|BUTTON' }, D.icon('right', 12));
    var dots = slides.map(function (s, i) { return h('button', { type: 'button', class: 'kbx-carousel__dot', 'aria-label': 'Show ' + list[i].name, part: 'MARKER' }); });
    R.appendChild(view);
    R.appendChild(h('div', { class: 'kbx-carousel__controls' }, prev, h('div', { class: 'kbx-carousel__dots' }, dots), next));
    D.kit('createArkCarousel')(H, { viewportRef: H.bind(view, 'carousel'), trackRef: H.bind(track, 'track'), slideRefs: slides.map(function (s) { return H.bind(s, 'slide'); }),
      prevRef: H.bind(prev, 'prev'), nextRef: H.bind(next, 'next'), dotRefs: dots.map(function (d) { return H.bind(d, 'dot'); }), label: 'Resolvers',
      onSlideChange: function (i) {
        dots.forEach(function (d, j) { if (i === j) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
        prev.disabled = i === 0; next.disabled = i === slides.length - 1;
      } });
  }, { uses: ['createArkCarousel', 'CARD', 'MARKER', 'GHOST|BUTTON'] });

  /* a two-pane Ark resizable split (createArkResizablePanels) with one handle */
  function split(H, R, orientation, first, second, label) {
    var a = h('div', { class: 'kbx-split__pane', part: 'PANEL' }, first), b = h('div', { class: 'kbx-split__pane', part: 'PANEL' }, second);
    var handle = h('div', { class: 'kbx-split__handle', 'aria-label': label, part: 'RESIZABLEHANDLE' }, h('span', { class: 'kbx-split__grip' }));
    var wrap = h('div', { class: 'kbx-split__wrap' }, a, handle, b);
    R.appendChild(wrap);
    D.kit('createArkResizablePanels')(H, { containerRef: H.bind(wrap, 'panels'), panelRefs: [H.bind(a, 'panel'), H.bind(b, 'panel')], handleRefs: [H.bind(handle, 'handle')],
      orientation: orientation, sizes: [0.42, 0.58], minSizes: [0.2, 0.2],
      onSizesChange: function (s) { handle.setAttribute('aria-valuenow', String(Math.round(s[0] * 100))); handle.setAttribute('aria-valuemin', '20'); handle.setAttribute('aria-valuemax', '80'); } });
  }

  /* ---- 20 Split-pane divider: records on the left, the chosen record on the right; drag or arrow the divider ---- */
  reg('03-split-pane-divider', function (box) {
    var H = D.host(), R = D.root(box, 'split');
    var recs = D.records();
    split(H, R, 'horizontal',
      h('ul', { class: 'kbx-split__list' }, recs.slice(0, 4).map(function (r, i) { return h('li', { 'data-on': i === 0 ? '' : null }, r.title); })),
      h('div', { class: 'kbx-split__detail' }, h('b', null, recs[0].title), D.meta(recs[0].type + ' · Rev ' + recs[0].revision), h('span', null, recs[0].about)),
      'Resize the record list');
  }, { uses: ['createArkResizablePanels', 'RESIZABLEHANDLE', 'PANEL'] });

  /* ---- 21 Resizable panel handle: the same primitive stacked, the handle itself drawn as the grip ---- */
  reg('03-resizable-panel-handle', function (box) {
    var H = D.host(), R = D.root(box, 'resize');
    split(H, R, 'vertical',
      h('div', { class: 'kbx-resize__pane' }, D.meta('Editor'), h('span', null, 'index.html')),
      h('div', { class: 'kbx-resize__pane' }, D.meta('Preview'), h('span', null, 'subzero.fxn')),
      'Resize the editor');
  }, { uses: ['createArkResizablePanels', 'RESIZABLEHANDLE', 'PANEL'] });

  /* ---- 22 Tree navigation: Ark's tree block (WAI-ARIA navigation tree; arrows, Home, End, type-ahead, *) ---- */
  reg('03-tree-navigation', function (box) {
    var R = D.root(box, 'tree');
    var recs = D.records().slice(0, 2);
    R.appendChild(D.block('tree', { label: 'Your names', items: [
      { label: 'subzero.fxn', value: 'subzero', icon: 'globe', expanded: true, children: [
        { label: 'Records', value: 'subzero-records', icon: 'layers', children: recs.map(function (r, i) { return { label: r.title, value: 'subzero-record-' + i, icon: 'scroll-text', current: i === 0 }; }) },
        { label: 'Keys', value: 'subzero-keys', icon: 'key-round', children: [{ label: 'Public ID', value: 'subzero-public-id', icon: 'fingerprint' }] }] },
      { label: 'radio.fxn', value: 'radio', icon: 'globe', children: [{ label: 'Records', value: 'radio-records', icon: 'layers' }] }] }));
  }, { partial: 'Ark\'s tree selects one item at a time and holds every branch in the page: it has no multi-select and loads no branch when it opens.',
    uses: ['tree block', 'tree-item', 'role tree (WAI-ARIA)'] });

  /* ---- 23 Explorer row: createArkItem rows (leading, content, trailing) over the sample records (DEFXN_RECORDS) ---- */
  reg('03-explorer-row', function (box) {
    var H = D.host(), R = D.root(box, 'explore');
    var recs = D.records().slice(0, 3), group = D.uid('explore');
    var rows = recs.map(function (r) {
      return h('button', { type: 'button', class: 'kbx-row', part: 'ITEM' },
        h('span', { class: 'kbx-row__lead', part: 'ITEMLEADING' }, D.icon('record', 13)),
        h('span', { class: 'kbx-row__main', part: 'ITEMCONTENT' }, h('b', null, r.title), D.meta(r.type + ' · Rev ' + r.revision + ' · ' + r.date)),
        h('span', { class: 'kbx-row__trail', part: 'ITEMTRAILING' }, r.state ? h('span', { class: 'kbx-row__state', 'data-tone': r.state === 'Signed' ? 'trust' : 'drift', part: 'STATUS' }, r.state) : null, D.icon('right', 12)));
    });
    var list = h('div', { class: 'kbx-explore__list', role: 'group', 'aria-label': 'Records' }, rows);
    R.appendChild(list);
    var refs = rows.map(function (row) { return H.bind(row, 'row'); });
    H.createRovingFocusGroup(group, { refs: refs, orientation: 'vertical', loop: true });
    refs.forEach(function (ref, i) {
      D.kit('createArkItem')(H, { itemRef: ref, collection: group, selected: i === 0,
        onSelect: function () { rows.forEach(function (row, j) { row.toggleAttribute('data-selected', i === j); row.setAttribute('aria-pressed', String(i === j)); }); } });
      rows[i].setAttribute('aria-pressed', String(i === 0)); rows[i].toggleAttribute('data-selected', i === 0);
    });
  }, { uses: ['createArkItem', 'ITEM', 'ITEMLEADING', 'ITEMCONTENT', 'ITEMTRAILING', 'STATUS'] });

  /* ---- 24 Item selector: createArkRadioGroup, pick one resolver (DEFXN_RESOLVERS) ---- */
  reg('03-item-selector', function (box) {
    var H = D.host(), R = D.root(box, 'select');
    var list = D.resolvers().slice(0, 3);
    var items = list.map(function (r) {
      return h('div', { class: 'kbx-select__item', part: 'ITEM' }, h('span', { class: 'kbx-select__radio', 'aria-hidden': 'true' }), h('span', { class: 'kbx-select__words' }, h('b', null, r.name), h('span', null, r.line)));
    });
    var group = h('div', { class: 'kbx-select__group', part: 'RADIOGROUP', 'aria-label': 'Resolver' }, items);
    R.appendChild(group);
    D.kit('createArkRadioGroup')(H, { rootRef: H.bind(group, 'radio-group'), itemRefs: items.map(function (it) { return H.bind(it, 'radio'); }), orientation: 'vertical' });
  }, { uses: ['createArkRadioGroup', 'RADIOGROUP', 'ITEM'] });

  /* ---- 25 Section switcher: createArkNavigationMenu (Ark's tabs model as role navigation) between a name's sections ---- */
  reg('03-section-switcher', function (box) {
    var H = D.host(), R = D.root(box, 'switch');
    var recs = D.records(), id = window.DEFXN_IDENTITY, devices = id && id.devices ? id.devices.length : 0;
    if (!devices) throw D.refusal('The sample identity is not loaded.', 'js/content/identity-sample.js (DEFXN_IDENTITY).', 'load the Kit route\'s scripts (js/pages/catalog.js, pageCatalog.kit).');
    var sections = [['Records', recs.length + ' records in this sample'], ['Keys', 'One Public ID can sign'], ['Devices', devices + (devices === 1 ? ' device holds' : ' devices hold') + ' this FXN ID']];
    var triggers = sections.map(function (s) { return h('button', { type: 'button', class: 'kbx-switch__trigger', part: 'TABSTRIGGER' }, s[0]); });
    var panels = sections.map(function (s) { return h('div', { class: 'kbx-switch__panel', part: 'TABSCONTENT' }, h('span', null, s[1])); });
    var list = h('div', { class: 'kbx-switch__list', part: 'NAVMENU', 'aria-label': 'Sections of subzero.fxn' }, triggers);
    R.appendChild(list); panels.forEach(function (p) { R.appendChild(p); });
    D.kit('createArkNavigationMenu')(H, { listRef: H.bind(list, 'navigation-menu'), triggerRefs: triggers.map(function (t) { return H.bind(t, 'section'); }), contentRefs: panels.map(function (p) { return H.bind(p, 'section-panel'); }) });
  }, { uses: ['createArkNavigationMenu', 'NAVMENU', 'TABSTRIGGER', 'TABSCONTENT'] });

  /* ---- 26 App launcher tile: Ark's launcher block over the site's products; arrows move by row and column ---- */
  reg('03-app-launcher-tile', function (box) {
    var R = D.root(box, 'launch');
    var apps = [['explorer', 'compass', 'Explorer'], ['bundledeployer', 'terminal', 'Deployer'], ['account/domains', 'globe', 'Domains'], ['stats/now', 'activity', 'Stats'], ['identity', 'fingerprint', 'FXN ID'], ['download', 'download', 'Browser']];
    R.appendChild(D.block('launcher', { label: 'DEFXN apps', columns: 3,
      items: apps.map(function (a) { var p = D.page(a[0], a[2]); return { label: p.label, href: p.href, icon: a[1] }; }) }));
  }, { uses: ['launcher block', 'launcher-item'] });

  /* ---- 27 Search overlay trigger: a search field look that opens a non-modal Ark popover searching the site's pages ---- */
  reg('03-search-overlay-trigger', function (box) {
    var H = D.host(), R = D.root(box, 'search');
    var trigger = h('button', { type: 'button', class: 'kbx-search__trigger', part: 'INPUTGROUP', 'aria-label': 'Search pages' }, D.icon('search'), h('span', { part: 'SEARCH|TEXT' }, 'Search pages'), h('kbd', { class: 'kbx-kbd', part: 'KBD|TEXT' }, '⌘K'));
    var input = h('input', { class: 'kbx-search__input', type: 'search', placeholder: 'Page name', 'aria-label': 'Page name', autocomplete: 'off', part: 'SEARCH|TEXT' });
    var hits = h('ul', { class: 'kbx-search__hits', 'aria-label': 'Pages' });
    var close = h('button', { type: 'button', class: 'kbx-iconbtn', 'aria-label': 'Close search', part: 'GHOST|BUTTON' }, D.icon('close', 12));
    var panel = h('div', { class: 'kbx-pop kbx-search__panel', part: 'POPOVER', role: 'dialog', 'aria-label': 'Search pages', hidden: true },
      h('div', { class: 'kbx-search__field', part: 'INPUTGROUP' }, D.icon('search'), input, close), hits);
    R.appendChild(trigger); R.appendChild(panel);
    var all = window.ArkSitePages ? ArkSitePages.pages().filter(function (p) { return p.journey; }) : [];
    var paint = function () {
      var q = input.value.trim().toLowerCase();
      var found = all.filter(function (p) { return !q || p.label.toLowerCase().indexOf(q) >= 0; }).slice(0, 3);
      hits.replaceChildren.apply(hits, found.length ? found.map(function (p) { return h('li', null, h('a', { href: p.path, part: 'LINK' }, p.label)); })
        : [h('li', { class: 'kbx-search__none', part: 'EMPTY|TEXT' }, 'No page has that name.')]);
    };
    input.addEventListener('input', paint); paint();
    D.kit('createArkPopover')(H, { triggerRef: H.bind(trigger, 'search-trigger'), contentRef: H.bind(panel, 'search-panel'), closeRef: H.bind(close, 'search-close'), initialFocusRef: H.bind(input, 'search-input'), modal: false });
  }, { uses: ['createArkPopover', 'POPOVER', 'INPUTGROUP', 'SEARCH|TEXT', 'KBD|TEXT'] });

  /* ---- 28 Footer navigation: the site footer strip's part (TOOLBAR) with its links and the network it is on ---- */
  reg('03-footer-navigation', function (box) {
    var H = D.host(), R = D.root(box, 'foot', 'footer');
    var links = ['about', 'learnings', 'stats/now', 'download'].map(function (k) { var p = D.page(k); return h('a', { class: 'kbx-foot__link', href: p.href, part: 'LINK' }, p.label); });
    R.setAttribute('data-ark-part', 'TOOLBAR');
    R.appendChild(h('nav', { class: 'kbx-foot__nav', 'aria-label': 'Footer' }, links));
    R.appendChild(h('div', { class: 'kbx-foot__meta' }, D.mark(), D.meta('DEFXN · devnet'), h('span', { class: 'kbx-foot__dot', 'data-tone': 'live', 'aria-hidden': 'true' })));
    D.navLinks(H, links, 'horizontal', -1);
  }, { uses: ['TOOLBAR', 'LINK', 'META|TEXT'] });

  /* ---- 29 Workspace switcher: no Ark part; an Ark menu with a radio group of the names you manage ---- */
  reg('03-workspace-switcher', function (box) {
    var H = D.host(), R = D.root(box, 'ws');
    var names = ['subzero.fxn', 'radio.fxn', 'alex.fxn'];
    var tile = h('span', { class: 'kbx-ws__tile', 'aria-hidden': 'true' }, 'SU');
    var cur = h('span', { class: 'kbx-ws__name', part: 'TITLE|TEXT' }, names[0]);
    var trigger = h('button', { type: 'button', class: 'kbx-ws__trigger', part: 'BUTTON', 'aria-label': 'Switch name' }, tile, h('span', { class: 'kbx-acct__words' }, cur, D.meta('Name · devnet')), D.icon('down'));
    var picks = names.map(function (n) { return h('div', { class: 'kbx-menu__item', part: 'ITEM' }, h('span', { class: 'kbx-menu__check', 'aria-hidden': 'true' }), n); });
    var claim = h('div', { class: 'kbx-menu__item', part: 'ITEM' }, D.icon('plus', 12), 'Claim a name');
    var label = h('p', { class: 'kbx-menu__label', part: 'LABEL|TEXT' }, 'Your names');
    var content = h('div', { class: 'kbx-menu kbx-pop kbx-ws__menu', part: 'POPOVER' }, label, picks, h('div', { class: 'kbx-menu__sep', part: 'SEPARATOR' }), claim);
    R.appendChild(trigger); R.appendChild(content);
    var m = D.menu(H, trigger, content, picks.concat([claim]), function (i) { if (i < names.length) { cur.textContent = names[i]; tile.textContent = names[i].slice(0, 2).toUpperCase(); } });
    D.kit('createArkMenuRadioGroup')(H, { itemRefs: m.refs.slice(0, names.length), selectedRef: m.refs[0] });
    D.kit('createArkMenuLabel')(H, { labelRef: H.bind(label, 'menu-label') });
  }, { partial: 'Ark UI has no workspace switcher part: this is an Ark menu with a radio group, with no search, no per-name state and a claim row that opens nothing.',
    uses: ['createArkMenu', 'createArkMenuRadioGroup', 'POPOVER', 'ITEM'] });

  /* ---- 30 Compact mobile nav: a MENUBAR whose menu button opens the page links (createArkDisclosure); Esc closes ---- */
  reg('03-compact-mobile-nav', function (box) {
    var H = D.host(), R = D.root(box, 'mobile');
    var btn = h('button', { type: 'button', class: 'kbx-iconbtn kbx-mobile__btn', 'aria-label': 'Menu', part: 'GHOST|BUTTON' }, D.icon('menu'));
    var links = ['about', 'resolutions', 'learnings', 'auth'].map(function (k) { var p = D.page(k); return h('a', { class: 'kbx-mobile__link', href: p.href, part: 'LINK' }, p.label); });
    var sheet = h('nav', { class: 'kbx-pop kbx-mobile__sheet', part: 'NAVMENU', 'aria-label': 'Pages' }, links);
    R.appendChild(h('header', { class: 'kbx-mobile__bar', part: 'MENUBAR' }, D.mark(), h('span', { class: 'kbx-mobile__title' }, 'DEFXN'), btn));
    R.appendChild(sheet);
    var handle = D.kit('createArkDisclosure')(H, { triggerRef: H.bind(btn, 'menu-button'), contentRef: H.bind(sheet, 'menu-sheet'), defaultOpen: false,
      onOpenChange: function (open) { btn.replaceChildren(D.icon(open ? 'close' : 'menu')); btn.setAttribute('aria-label', open ? 'Close menu' : 'Menu'); } });
    R.addEventListener('keydown', function (e) { if (e.key === 'Escape' && handle.getState().open) { e.preventDefault(); handle.close(); btn.focus(); } });
    D.navLinks(H, links, 'vertical');
    links.forEach(function (a) { a.addEventListener('click', function () { handle.close(); btn.focus(); }); });
  }, { uses: ['createArkDisclosure', 'MENUBAR', 'NAVMENU', 'LINK', 'GHOST|BUTTON'] });
})();

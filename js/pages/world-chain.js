/* /chain: your chain on the 3D world (js/world2/world2-host.mjs), as ONE page (owner, 2026-11-05).

   On the game layout since 2026-11-05 (K.hud, docs/design/space/SPACE.md "The page layout"; the show is
   js/space/shows/chain.mjs). Left column: the answer "{n} records, all signed by your key", the row of four sections
   (Revisions, One record, Links, Trace) and the body, which holds the records while no section is open and the open
   section otherwise. Right column: records, signed, newest date. Dock: newer / where you are / older, and Open record
   (the one dominant action). /chain/record, /chain/open, /chain/links and /trace redirect here with ?s=. The middle is
   the 3D's. The crumbs and the Back link left this page: the space's own path and Back do that job.
   The 3D is told { view: 'chain', r } while the page mounts and on every new record (ArkWorldHost.state / select). Clicks
   on a tile come back through on('pick'), and a hover on a tile lights its row (on('hover')).

   REDUCTION TEST
   1 About. Your chain, and the record you chose on it.
   2 Dominant action. Open record (it opens the One record section).
   3 Know now. How many records there are and how many your key signed, the newest date, and the records in order.
   4 Hidden until asked. Revisions, the record's content and signature, its links, and the trace to the first record.
   5 Repeated elsewhere. Nothing: each fact has one section.
   6 Only because the data has it. Records, dates, revisions, signers, links and history are js/content/records-sample.js.
     The title says "Sample chain" once; a missing value shows a dash, never a zero.
   7 Removable without changing the decision. Nothing more. The nine-step identity strip was cut from this page.
   8 Leaving keeps state. The record and the open section ride in the address (?r=, ?s=).
   9 Returning. The address restores the same record and section.
   10 If WebGL is missing. Every row, section and button works on a flat glass slab.

   Words: the worldchain manifest (WORLDCHAIN.*, read by ArkCopy). No word is written in this file. The helpers below
   (ArkUI.worldFrame) are shared with js/pages/world-identity.js, which still draws the identity strip (K.flow).
   Layout: css/space-frame.css (the .hud classes), css/world-chain.css for rows and facts, css/chain-one.css for the section row inside the HUD. Nothing fades. */
(function () {
  'use strict';
  var K = ArkUI.worldFrame = ArkUI.worldFrame || {};
  var ARROW = '<svg viewBox="0 0 26 20" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M1 10h23M15 1l9 9-9 9"/></svg>';
  var ARROW_L = '<svg viewBox="0 0 16 14" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M15 7H2M7.5 1.5L2 7l5.5 5.5"/></svg>';
  var ARROW_R = '<svg viewBox="0 0 16 14" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M1 7h13M8.5 1.5L14 7l-5.5 5.5"/></svg>';
  /* the record icons, drawn like the glyphs on the 3D tiles */
  var GLYPH = {
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="4.5" y="3" width="15" height="18" rx="2"/><path d="M8 8h8M8 11.5h8M8 15h5"/></svg>',
    img: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M6 17l4.5-5 3 3 2-2 3 4"/><circle cx="15.5" cy="9" r="1.2"/></svg>',
    iii: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M9 8v8M12 8v8M15 8v8"/></svg>',
    key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c.9-3.6 3.6-5.6 7-5.6s6.1 2 7 5.6"/></svg>',
    ghost: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2.5 2" aria-hidden="true"><rect x="4.5" y="3" width="15" height="18" rx="2"/></svg>'
  };
  K.ARROW = ARROW; K.ARROW_L = ARROW_L; K.ARROW_R = ARROW_R; K.GLYPH = GLYPH;

  /* ---------- small helpers every world page of this group shares ---------- */
  K.node = function (tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  };
  K.fmt = function (text, vars) { return String(text).replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] != null ? vars[k] : m; }); };
  /* t = K.words('WORLDCHAIN.'): t('ONE.COUNT.MANY', { n: 5 }) reads the manifest field and fills its {n} */
  K.words = function (area) { return function (role, vars) { return K.fmt(ArkCopy.text(area + role), vars); }; };
  K.pad = function (n) { return (n < 10 ? '0' : '') + n; };
  K.clamp = function (value, lo, hi, dflt) { var n = parseInt(value, 10); return isNaN(n) ? dflt : Math.min(hi, Math.max(lo, n)); };
  K.params = function () { return new URLSearchParams(ArkUI.route.search()); };
  function entry(key) { return ArkUI.pageCatalog && ArkUI.pageCatalog[key]; }
  K.href = function (key, query) { var e = entry(key); return e ? ArkUI.route.href(e.path) + (query ? '?' + query : '') : '#'; };
  /* a link to a page of the site: the router follows it (js/hero-motion.js reads data-scene-link) */
  K.link = function (a, key, query) { a.dataset.sceneLink = key; a.href = K.href(key, query); if (query) a.dataset.routeQuery = query; return a; };   /* routeQuery: as W.link in js/pages/world-sheet.js */
  /* a link to a choice inside the page: the same address, for a new tab or a copied link, but the page handles the click */
  K.stayLink = function (a, key, query) { a.href = K.href(key, query); return a; };
  K.go = function (key, query) { return ArkUI.pageRouter.navigate(key, { query: query || '' }); };
  K.plain = function (e) { return !(e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey); };
  /* the world, when it has landed and started: a page guards every call with this */
  K.host = function () { return window.ArkWorldHost && ArkWorldHost.state ? window.ArkWorldHost : null; };
  K.icon = function (parent, svg) { parent.insertAdjacentHTML('beforeend', svg); return parent; };

  /* the page's one filled action: a cut-corner link with an arrow (css/world-pages.css .cta) */
  K.cta = function () {
    var a = K.node('a', 'cta small'), say = K.node('span', 'say');
    a.say = K.node('span'); say.appendChild(a.say); say.insertAdjacentHTML('beforeend', ' ' + ARROW); a.appendChild(say);
    return a;
  };
  /* the foot of a sheet: the action, then up to two quiet links */
  K.foot = function (cta, more) {
    var foot = K.node('div', 'wc-foot'); foot.appendChild(cta);
    (more || []).forEach(function (a) { a.classList.add('more'); foot.appendChild(a); });
    return foot;
  };
  /* a two-part heading: the plain words, then the muted ones */
  K.title = function (h, first, second) {
    h.textContent = '';
    h.appendChild(K.node('span', null, first));
    if (second) { h.appendChild(document.createTextNode(' ')); h.appendChild(K.node('span', 'dim', second)); }
  };
  K.state = function (text, kind) { var s = K.node('span', 'state', text); s.dataset.state = kind; return s; };
  /* dt/dd cells of a strip: [label, value] */
  K.cells = function (dl, rows) {
    dl.textContent = '';
    rows.forEach(function (r) { var cell = K.node('div'); cell.appendChild(K.node('dt', null, r[0])); cell.appendChild(K.node('dd', null, r[1])); dl.appendChild(cell); });
  };
  /* the words of a changed choice wipe in, one after another: children of every [data-sw] box */
  K.swap = function (root) {
    [].slice.call(root.querySelectorAll('[data-sw]')).forEach(function (box) {
      if (box.hidden) return;
      box.classList.remove('wc-swap'); void box.offsetWidth;
      [].slice.call(box.children).forEach(function (c, i) { c.style.setProperty('--k', Math.min(i, 6)); });
      box.classList.add('wc-swap');
    });
  };

  /* ---------- pill tabs: one pill slides behind the chosen tab ---------- */
  K.tabs = function (label, items, onPick) {
    var bar = K.node('div', 'wc-tabs'); bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', label);
    var pill = K.node('i', 'wc-pill'); pill.setAttribute('aria-hidden', 'true'); bar.appendChild(pill);
    var buttons = items.map(function (it) {
      var b = K.node('button', null, it.text); b.type = 'button'; b.setAttribute('role', 'tab'); b.id = it.tab; b.setAttribute('aria-controls', it.panel);
      b.addEventListener('click', function () { onPick(it.id); });
      b.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
        var next = items[(items.indexOf(it) + d + items.length) % items.length];
        e.preventDefault(); onPick(next.id); buttons[items.indexOf(next)].focus();
      });
      bar.appendChild(b); return b;
    });
    function place() {
      var on = buttons.filter(function (b) { return b.getAttribute('aria-selected') === 'true'; })[0];
      if (!on || !on.offsetWidth) return;
      pill.style.width = on.offsetWidth + 'px'; pill.style.transform = 'translateX(' + on.offsetLeft + 'px)'; bar.classList.add('slides');
    }
    var tabs = { bar: bar, place: place, buttons: buttons };
    tabs.select = function (id) {
      buttons.forEach(function (b, i) { var on = items[i].id === id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
      place();
    };
    if (window.ResizeObserver) { var ro = new ResizeObserver(place); ro.observe(bar); tabs.stop = function () { ro.disconnect(); }; }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    return tabs;
  };

  /* ---------- the labels the 3D places: one layer per view, kept and updated in place ---------- */
  K.tags = function (view, list) {
    var h = K.host(); if (!h || !h.tags) return;
    var layer = h.tags(view); if (!layer) return;
    var have = [].slice.call(layer.children);
    var same = have.length === list.length && have.every(function (el, i) { return el.dataset.tag === list[i].id; });
    if (!same) { layer.textContent = ''; have = []; }
    list.forEach(function (t, i) {
      var el = have[i] || layer.appendChild(K.node('span'));
      var seen = el.classList.contains('seen');
      el.className = 'tag' + (t.cls ? ' ' + t.cls : '') + (seen ? ' seen' : '');
      el.dataset.tag = t.id; if (t.at && !el.dataset.home) el.dataset.at = t.at;
      el.textContent = '';
      el.appendChild(K.node('b', null, t.name)); if (t.sub) el.appendChild(document.createTextNode(t.sub));
    });
  };

  /* ---------- the identity flow strip: where you are in the nine steps, and the way back and forward ---------- */
  var FLOW = ['identity', 'identity/sign', 'identity/safe', 'identity/you', 'chain', 'chain/record', 'chain/open', 'chain/links', 'intro'];
  K.flow = function (step) {
    var say = K.words('WORLDCHAIN.FLOW.');
    var nav = K.node('nav', 'wc-flow'); nav.setAttribute('aria-label', say('LABEL'));
    var label = function (i) { return say('S' + (i + 1)); };
    function arrow(i, role, svg) {
      if (i < 0 || i >= FLOW.length) { var gap = K.node('span', 'fl-step'); gap.setAttribute('aria-hidden', 'true'); return gap; }
      var a = K.link(K.node('a', 'fl-step'), FLOW[i]); a.innerHTML = svg; a.setAttribute('aria-label', say(role, { label: label(i) })); return a;
    }
    nav.appendChild(arrow(step - 1, 'BACK', ARROW_L));
    var segs = K.node('span', 'fl-segs');
    FLOW.forEach(function (key, j) {
      var a = K.link(K.node('a', j < step ? 'done' : ''), key);
      if (j === step) a.setAttribute('aria-current', 'step');
      a.setAttribute('aria-label', say('GOTO', { n: j + 1, label: label(j) })); segs.appendChild(a);
    });
    nav.appendChild(segs);
    nav.appendChild(K.node('span', 'fl-where mono', say('STEP', { n: step + 1, label: label(step) })));
    nav.appendChild(arrow(step + 1, 'NEXT', ARROW_R));
    return nav;
  };

  /* ---------- the frame: crumbs, a stage for the 3D, a slab for the words ---------- */
  K.frame = function (o) {
    var t = K.words(o.area);
    var page = K.node('section', 'world-page wc wc-' + o.view + (o.card ? ' wc-card-page' : ''));
    page.setAttribute('aria-labelledby', o.titleId);
    var f = { page: page, t: t };
    if (o.crumbs !== false) {
      f.top = K.node('div', 'wc-top');
      var crumbs = K.node('nav', 'wc-crumbs rise'); crumbs.setAttribute('aria-label', t('COMMON.WHERE'));
      var path = K.node('span', 'path'); path.appendChild(K.node('b', null, t('COMMON.ROOT'))); path.appendChild(document.createTextNode(' / ' + o.here));
      var back = K.link(K.node('a', 'back'), o.back.key, o.back.query); back.innerHTML = ARROW_L; back.appendChild(document.createTextNode(o.back.text));
      crumbs.appendChild(path); crumbs.appendChild(back); f.top.appendChild(crumbs); f.crumbs = crumbs; f.back = back;
      page.appendChild(f.top);
    }
    f.body = K.node('div', 'wc-body');
    if (o.card) {
      /* the opened record: the card stands where the 3D tile opens, so the stage and the slab are the same box */
      f.slot = K.node('div', 'wc-cardslot'); f.slot.setAttribute('data-stage', ''); f.slot.setAttribute('data-panel', '');
      f.sheet = f.slot; f.body.appendChild(f.slot);
    } else {
      f.col = K.node('div', 'wc-stagecol'); f.stage = K.node('div', 'wc-stage'); f.stage.setAttribute('data-stage', ''); f.col.appendChild(f.stage);
      f.slot = K.node('div', 'wc-slot'); f.slot.setAttribute('data-panel', '');
      f.sheet = K.node('div', 'wc-sheet'); f.slot.appendChild(f.sheet);
      f.body.appendChild(f.col); f.body.appendChild(f.slot);
    }
    page.appendChild(f.body);
    /* the CMS's insertion point for reusable blocks (js/content/components.js): empty, and out of the layout */
    var anchor = K.node('div', 'world-insert'); anchor.setAttribute('data-ark-insert', 'main'); page.appendChild(anchor);
    /* an item of the sheet that rises with the page; swap marks the box whose children wipe in on a new choice */
    f.add = function (el, swap, into) { el.classList.add('rise'); if (swap) el.setAttribute('data-sw', ''); (into || f.sheet).appendChild(el); return el; };
    return f;
  };

  /* ---------- the game layout (docs/design/space/SPACE.md "The page layout", css/space-frame.css) ----------
     A page that stands on the space: the words in a left column, at most three real numbers in a right column, the
     page's controls and its one dominant action in a dock at the bottom, and the middle left to the 3D. The same
     f the slab frame returns (f.add, f.sheet, f.col), so a page moves onto it by passing hud: true to K.mount.
     f.col is the dock's chip row; f.sheet is .hud-body, the one box that scrolls. */
  K.hud = function (o) {
    var t = K.words(o.area);
    var page = K.node('section', 'world-page hud hud-' + o.view);
    page.setAttribute('aria-labelledby', o.titleId);
    var f = { page: page, t: t };
    /* the frame the host fits an own-scene view to (world2-host.mjs reads [data-stage]): the whole screen, behind the columns */
    f.stage = K.node('div', 'hud-stage'); f.stage.setAttribute('data-stage', ''); f.stage.setAttribute('aria-hidden', 'true');
    f.stage.style.cssText = 'position:absolute;inset:0;pointer-events:none';
    page.appendChild(f.stage);
    f.left = K.node('div', 'hud-left'); f.left.setAttribute('data-panel', '');
    f.kicker = f.left.appendChild(K.node('p', 'hud-kicker'));
    f.title = f.left.appendChild(K.node('h1', 'hud-title')); f.title.id = o.titleId;
    f.answer = f.left.appendChild(K.node('p', 'hud-answer'));
    f.tabs = f.left.appendChild(K.node('div', 'hud-tabs'));
    f.sheet = f.body = f.left.appendChild(K.node('div', 'hud-body'));
    f.right = K.node('div', 'hud-right');
    f.stats = f.right.appendChild(K.node('dl', 'hud-stats'));
    f.actions = f.right.appendChild(K.node('div', 'hud-actions'));
    f.dock = K.node('div', 'hud-dock');
    f.col = f.dock.appendChild(K.node('div', 'hud-chips'));
    page.appendChild(f.left); page.appendChild(f.right); page.appendChild(f.dock);
    var anchor = K.node('div', 'world-insert'); anchor.setAttribute('data-ark-insert', 'main'); page.appendChild(anchor);
    f.add = function (el, swap, into) { if (swap) el.setAttribute('data-sw', ''); (into || f.sheet).appendChild(el); return el; };
    /* the one dominant action: the complement, once per view (laws 71-77) */
    f.go = function (el) { el.classList.add('hud-go'); f.dock.appendChild(el); return el; };
    return f;
  };
  /* the right column's numbers: [value, label] pairs; a missing value shows the page's dash, never a zero */
  K.stats = function (dl, rows, dash) {
    dl.textContent = '';
    rows.slice(0, 3).forEach(function (r) {
      var d = K.node('div', 'hud-stat'); d.appendChild(K.node('b', null, r[0] == null || r[0] === '' ? dash : String(r[0]))); d.appendChild(K.node('span', null, r[1])); dl.appendChild(d);
    });
  };

  /* ---------- the controller: the address, the world, the words ----------
     def: view (the mockup's name for the view), key (the catalog route), area (manifest prefix), titleId, here, back,
     card (the opened record), parse(params) -> state, query(state) -> string, world(state) -> what the 3D is told,
     build(ctx) once, render(state, ctx) on every choice, keys(event, state, ctx), picks { name: fn(a, b, ctx, state) }. */
  K.mount = function (hostEl, def) {
    var f = def.hud ? K.hud({ view: def.view, area: def.area, titleId: def.titleId })
      : K.frame({ view: def.view, area: def.area, titleId: def.titleId, here: def.here, back: def.back, card: def.card, crumbs: def.crumbs });
    var path = entry(def.key).path, offs = [], listeners = [], st = def.parse(K.params());
    var ctx = { f: f, t: f.t, page: f.page, st: st, def: def, stops: [] };
    function world() { return def.world ? def.world(st) : null; }
    function draw(swap) { ctx.st = st; def.render(st, ctx); if (swap) K.swap(f.sheet); }
    /* a choice inside the page: the address (Back leaves the page, so it replaces the entry), the world, the words */
    ctx.set = function (patch, mode) {
      var before = def.query(st);
      st = Object.assign({}, st, patch);
      ArkUI.route.write(path, def.query(st), mode || 'replace');
      var h = K.host(), w = world(); if (h && w && h.select) h.select(w);
      draw(def.query(st) !== before);
    };
    ctx.stay = function (e, patch, mode) { if (!K.plain(e)) return; e.preventDefault(); e.stopPropagation(); ctx.set(patch, mode); };
    def.build(ctx);
    hostEl.appendChild(f.page);
    draw(false);
    var h = K.host();
    if (h) {
      var w = world(); if (w) h.state(w);
      if (h.on) Object.keys(def.picks || {}).forEach(function (name) {
        var off = h.on(name, function (a, b) { return def.picks[name](a, b, ctx, st); });
        if (typeof off === 'function') offs.push(off);
      });
    }
    /* Back and Forward inside the page */
    function again() {
      if (ArkUI.route.path() !== path) return;
      var next = def.parse(K.params());
      if (def.query(next) === def.query(st)) return;
      st = next; var hh = K.host(), ww = world(); if (hh && ww && hh.select) hh.select(ww);
      draw(true);
    }
    window.addEventListener('popstate', again); listeners.push(['popstate', again]);
    if (def.keys) {
      var onKey = function (e) {
        if (e.target && e.target.closest && e.target.closest('input,textarea,select,[role="tab"]')) return;
        if (!f.page.isConnected || f.page.hidden) return;
        def.keys(e, st, ctx);
      };
      document.addEventListener('keydown', onKey); listeners.push(['keydown', onKey, document]);
    }
    f.page.arkDispose = function () {
      offs.splice(0).forEach(function (off) { off(); });
      listeners.splice(0).forEach(function (l) { (l[2] || window).removeEventListener(l[0], l[1]); });
      ctx.stops.splice(0).forEach(function (stop) { stop(); });
    };
    f.page.arkState = function () { return st; };
    return f.page;
  };

  /* =====================================================================
     THE CHAIN PAGE: the answer, the records, one section open at a time
     ===================================================================== */
  var area = 'WORLDCHAIN.';
  var t = K.words(area);
  function data() { return window.DEFXN_RECORDS || { chain: '', records: [] }; }
  function list() { return data().records; }
  function find(id) {
    var all = list();
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return { record: all[i], index: i };
    return { record: all[0] || null, index: 0 };
  }
  var missing = function () { return t('COMMON.MISSING'); };
  /* a count always carries its noun: "1 record", "5 records" */
  function records(n) { return n === 1 ? t('ONE.COUNT.ONE') : t('ONE.COUNT.MANY', { n: n }); }
  /* a row's second line: revision and date, each named, no abbreviation */
  function rowNote(x) { return [x.revision ? t('ONE.ROW.REV', { n: x.revision }) : null, x.date].filter(Boolean).join(' · '); }
  function glyph(parent, name) { var mk = K.node('span', 'mk'); mk.innerHTML = GLYPH[name || 'doc']; parent.appendChild(mk); return mk; }
  function signedPill(r) { return r.signedBy ? K.node('span', 'st', t('COMMON.SIGNED')) : K.node('span', 'st none', t('COMMON.NOTSIGNED')); }
  function keepFocus(box, build) {
    var was = document.activeElement && box.contains(document.activeElement) ? document.activeElement.getAttribute('data-pick') : null;
    build();
    if (was) { var again = box.querySelector('[data-pick="' + was + '"]'); if (again) again.focus({ preventScroll: true }); }
  }
  /* a <dl> of [label, value] pairs; a value with a title is a record, chosen in place */
  function factList(rows, cls) {
    var dl = K.node('dl', cls || 'wc-facts plain');
    rows.forEach(function (x) {
      dl.appendChild(K.node('dt', null, x[0]));
      var dd = K.node('dd');
      if (x[1] && x[1].title) { var a = K.stayLink(K.node('a', null, x[1].title), 'chain', 'r=' + x[1].id); a.dataset.pick = x[1].id; dd.appendChild(a); }
      else dd.textContent = x[1] || missing();
      dl.appendChild(dd);
    });
    return dl;
  }
  /* a record as a choosable row: icon, title, note, and its signed state */
  function recRow(x, j, note, current) {
    var a = K.stayLink(K.node('a'), 'chain', 'r=' + x.id);
    a.dataset.pick = x.id; a.dataset.j = j; if (current != null) a.setAttribute('aria-current', String(current));
    glyph(a, x.glyph);
    var words = K.node('span'); words.appendChild(K.node('b', null, x.title)); words.appendChild(K.node('small', null, note)); a.appendChild(words);
    a.appendChild(signedPill(x));
    return a;
  }

  /* the four sections, in the row's order; the ids are the ?s= values the redirects send */
  var SECTIONS = ['record', 'open', 'links', 'trace'];
  var SECTION_WORD = { record: 'ONE.SEC.RECORD', open: 'ONE.SEC.OPEN', links: 'ONE.SEC.LINKS', trace: 'ONE.SEC.TRACE' };

  /* Revisions: which revision this is, what was kept, and the record's history */
  function drawRevisions(box, r) {
    box.appendChild(K.node('p', 'wc-lede tight', r.revision ? t('ONE.REV.THIS', { n: r.revision }) : t('ONE.REV.NOREV')));
    box.appendChild(K.node('p', 'wc-lede tight' + (r.earlier ? '' : ' none'),
      r.earlier ? t('ONE.REV.EARLIER', { a: r.earlier[0], b: r.earlier[1] }) : t('ONE.REV.NONE')));
    if (r.provenance) {
      var steps = K.node('ol', 'wc-steps');
      r.provenance.forEach(function (x) { var li = K.node('li'); li.appendChild(K.node('span', null, t('ONE.REV.STEP', { what: x.what, by: x.by }))); li.appendChild(K.node('time', null, x.date)); steps.appendChild(li); });
      box.appendChild(steps);
    }
  }
  /* One record: what it says, its facts, and how it is signed behind one more click */
  function drawRecord(box, r, next) {
    if (r.about) box.appendChild(K.node('p', 'wc-lede tight', r.about));
    if (r.content) {
      var cols = K.node('div', 'wc-cols');
      r.content.forEach(function (sec) {
        var part = K.node('section'); part.appendChild(K.node('h3', null, sec.head));
        var ul = K.node('ul'); sec.items.forEach(function (x) { ul.appendChild(K.node('li', null, x)); }); part.appendChild(ul); cols.appendChild(part);
      });
      box.appendChild(cols);
    } else box.appendChild(K.node('p', 'none', t('ONE.OPEN.NOCONTENT')));
    box.appendChild(factList([[t('COMMON.FACT.TYPE'), r.type], [t('COMMON.FACT.STATE'), r.state || t('COMMON.NOTSIGNED')], [t('COMMON.FACT.SIGNEDBY'), r.signedBy], [t('ONE.FACT.DATE'), r.date]]));
    var how = K.node('details', 'wc-how'); how.appendChild(K.node('summary', null, t('ONE.SIG.SUMMARY')));
    var fig = K.node('figure', 'wc-anat'), ol = K.node('ol');
    var parts = [[t('ONE.SIG.TYPE'), r.type || missing()], [t('ONE.SIG.TITLE'), r.title], [t('ONE.SIG.DATE'), r.date],
      [t('ONE.SIG.LINKS'), next ? next.title : t('ONE.SIG.FIRST')], [t('ONE.SIG.SIGNATURE'), r.signedBy ? t('ONE.SIG.YOURKEY') : t('COMMON.NOTSIGNED')]];
    parts.forEach(function (x, i) {
      var last = i === parts.length - 1, li = K.node('li', last ? 'last' : ''), n = K.node('span');
      if (last) n.innerHTML = GLYPH.key; else n.textContent = String(i + 1);
      li.style.setProperty('--i', i); li.appendChild(n); li.appendChild(K.node('b', null, x[0])); li.appendChild(K.node('small', null, x[1])); ol.appendChild(li);
    });
    fig.appendChild(ol); fig.appendChild(K.node('figcaption', null, t('ONE.SIG.CAPTION'))); how.appendChild(fig);
    how.appendChild(K.node('p', r.signedBy ? 'wc-lede tight' : 'none', r.signedBy ? t('ONE.SIG.SIGNED', { name: r.signedBy, date: r.date }) : t('ONE.SIG.NONE')));
    if (r.signedBy) how.appendChild(K.node('p', 'wc-lede tight', t('ONE.SIG.NOTE')));
    box.appendChild(how);
  }
  /* Links: the record before it, the one after it, its related records, its signer; each group counts its records */
  function drawLinks(box, r, idx, all) {
    var next = all[idx + 1] || null, newer = all[idx - 1] || null;
    function plain(mark, title, note) {
      var el = K.node('span', 'row'); glyph(el, mark);
      var words = K.node('span'); words.appendChild(K.node('b', null, title)); words.appendChild(K.node('small', null, note)); el.appendChild(words); return el;
    }
    var groups = [
      ['LINKSTO', next ? [recRow(next, idx + 1, t('ONE.LINKS.BEFORE'))] : [], t('ONE.LINKS.NONE.LINKSTO')],
      ['LINKEDFROM', newer ? [recRow(newer, idx - 1, t('ONE.LINKS.AFTER'))] : [], t('ONE.LINKS.NONE.LINKEDFROM')],
      ['RELATED', (r.links || []).map(function (l) { return plain('doc', l.title, l.note); }), t('ONE.LINKS.NONE.RELATED')],
      ['SIGNEDBY', r.signedBy ? [plain('key', t('ONE.SIG.YOURKEY'), t('ONE.LINKS.SIGNEDDATE', { date: r.date }))] : [], t('ONE.LINKS.NONE.SIGNEDBY')]
    ];
    var dl = K.node('dl', 'wc-groups');
    groups.forEach(function (g) {
      var dt = K.node('dt', null, t('ONE.LINKS.G.' + g[0]));
      if (g[0] !== 'SIGNEDBY') dt.appendChild(K.node('span', 'n', ' · ' + records(g[1].length)));
      dl.appendChild(dt);
      var dd = K.node('dd'); if (g[1].length) g[1].forEach(function (el) { dd.appendChild(el); }); else dd.appendChild(K.node('p', 'none', g[2]));
      dl.appendChild(dd);
    });
    box.appendChild(dl);
  }
  /* Trace: from the chosen record back along its links to the first record, each step with its signed state */
  function drawTrace(box, idx, all) {
    var path = all.slice(idx);
    box.appendChild(K.node('p', 'wc-lede tight', t('ONE.TRACE.LEDE', { count: records(path.length) })));
    var ol = K.node('ol', 'wc-recs wc-trace');
    path.forEach(function (x, k) {
      var li = K.node('li'), j = idx + k, last = j === all.length - 1;
      li.appendChild(recRow(x, j, last ? t('ONE.TRACE.FIRST') : rowNote(x), k === 0));
      ol.appendChild(li);
    });
    box.appendChild(ol);
  }

  ArkUI.pageModules.worldChain = {
    mount: function (hostEl, opts) {
      var hover, forced = opts && opts.section;
      return K.mount(hostEl, {
        view: 'chain', key: 'chain', area: area, titleId: 'wc-chain-title',
        parse: function (params) {
          var r = find(params.get('r')).record, s = params.get('s') || forced || '';
          return { r: (r || {}).id || null, s: SECTIONS.indexOf(s) >= 0 ? s : '' };
        },
        query: function (st) { return 'r=' + encodeURIComponent(st.r) + (st.s ? '&s=' + st.s : ''); },
        world: function (st) { return { view: 'chain', r: st.r }; },
        hud: true,
        build: function (c) {
          var f = c.f, s = c.refs = {};
          f.kicker.textContent = t('COMMON.HERE');
          s.h1 = f.title; s.answer = f.answer;
          /* the dock: newer, where you are, older (the arrow keys do the same) */
          var turns = K.node('div', 'wc-turns'); turns.setAttribute('role', 'group'); turns.setAttribute('aria-label', t('ONE.TURN.LABEL'));
          [[-1, ARROW_L, 'ONE.TURN.NEWER'], [1, ARROW_R, 'ONE.TURN.OLDER']].forEach(function (x, n) {
            var b = K.node('button', 'turn hud-chip'); b.type = 'button'; b.innerHTML = x[1]; b.setAttribute('aria-label', t(x[2]));
            b.addEventListener('click', function () { turn(c, c.st, x[0]); });
            if (n === 1) turns.appendChild(s.count = K.node('span', 'hud-chip mono')); turns.appendChild(b);
          });
          s.count.setAttribute('aria-live', 'polite');
          f.col.appendChild(turns);
          /* the section row: four disclosure buttons, one open at a time; the arrow keys move between them */
          var row = f.tabs; row.classList.add('wc-secrow'); row.setAttribute('role', 'group'); row.setAttribute('aria-label', t('ONE.SECTIONS'));
          s.secs = SECTIONS.map(function (id, i) {
            var b = K.node('button', null, t(SECTION_WORD[id])); b.type = 'button'; b.id = 'wc-sec-' + id; b.setAttribute('aria-controls', 'wc-secpanel');
            b.addEventListener('click', function () { c.set({ s: c.st.s === id ? '' : id }); });
            b.addEventListener('keydown', function (e) {
              var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
              e.preventDefault(); e.stopPropagation(); s.secs[(i + d + SECTIONS.length) % SECTIONS.length].focus();
            });
            row.appendChild(b); return b;
          });
          /* the body: the records while no section is open, else the open section (one idea at a time) */
          s.recs = f.add(K.node('ol', 'wc-recs')); s.recs.setAttribute('aria-label', t('ONE.LIST'));
          s.panel = f.add(K.node('div', 'wc-secpanel'), true); s.panel.id = 'wc-secpanel'; s.panel.setAttribute('role', 'region');
          s.cta = K.cta(); s.cta.say.textContent = t('ONE.CTA');
          s.cta.addEventListener('click', function (e) { c.stay(e, { s: 'open' }); });
          f.go(s.cta);
          /* a record chosen anywhere on the page: the list, a link, a trace step */
          f.left.addEventListener('click', function (e) { var a = e.target.closest('a[data-pick]'); if (a) c.stay(e, { r: a.dataset.pick }); });
          hover = hoverRows(s.recs, 'a');
          c.def.picks.hover = function (lab) { return hover(lab); };
        },
        render: function (st, c) {
          var s = c.refs, all = list(), found = find(st.r), r = found.record, idx = found.index;
          if (!r) return;
          var signed = all.filter(function (x) { return x.signedBy; }).length;
          K.title(s.h1, t('ONE.TITLE'));
          s.answer.textContent = signed === all.length ? t('ONE.ANSWER.ALL', { count: records(all.length) }) : t('ONE.ANSWER.SOME', { count: records(all.length), s: signed });
          K.stats(c.f.stats, [[all.length, t('ONE.STAT.RECORDS')], [signed, t('ONE.STAT.SIGNED')], [all[0].date, t('ONE.STAT.NEWEST')]], missing());
          s.count.textContent = t('ONE.OF', { n: idx + 1, total: records(all.length) });
          keepFocus(s.recs, function () {
            s.recs.textContent = '';
            all.forEach(function (x, i) { var li = K.node('li'); li.appendChild(recRow(x, i, rowNote(x), i === idx)); s.recs.appendChild(li); });
          });
          s.recs.hidden = !!st.s;
          s.secs.forEach(function (b, i) { b.setAttribute('aria-expanded', String(SECTIONS[i] === st.s)); });
          s.panel.textContent = ''; s.panel.hidden = !st.s;
          if (st.s) {
            s.panel.setAttribute('aria-labelledby', 'wc-sec-' + st.s);
            if (st.s === 'record') drawRevisions(s.panel, r);
            else if (st.s === 'open') drawRecord(s.panel, r, all[idx + 1] || null);
            else if (st.s === 'links') drawLinks(s.panel, r, idx, all);
            else drawTrace(s.panel, idx, all);
          }
          s.cta.hidden = st.s === 'open';
          K.stayLink(s.cta, 'chain', 'r=' + encodeURIComponent(r.id) + '&s=open');
          K.tags('chain', [
            { id: 'key', name: t('ONE.TAG.KEY'), sub: records(all.length), cls: 'lit', at: 'above' },
            { id: 'oldest', name: t('ONE.TAG.OLDEST'), cls: 'small', at: 'below' },
            { id: 'newest', name: t('ONE.TAG.NEWEST'), cls: 'small', at: 'below' }
          ]);
        },
        keys: function (e, st, c) { var d = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0; if (d) turn(c, st, d); },
        picks: {
          /* a click on the chosen tile opens One record; on another tile it chooses that record */
          pick: function (v, j, c, st) {
            var all = list();
            if (v !== 'chain' || j == null || j < 0 || !all[j]) return false;
            if (j === find(st.r).index) c.set({ s: 'open' }); else c.set({ r: all[j].id });
            return true;
          }
        }
      });
    }
  };
  /* the record turned to by the arrows: a step through the list, newest first */
  function turn(ctx, st, d) {
    var all = list(); if (!all.length) return;
    ctx.set({ r: all[(find(st.r).index + d + all.length) % all.length].id });
  }
  /* a hover on a tile lights its row, and a row lights its tile */
  function hoverRows(box, rowSel) {
    var lit = null;
    function light(j) {
      var row = j >= 0 ? box.querySelector(rowSel + '[data-j="' + j + '"]') : null;
      if (row === lit) return; if (lit) lit.classList.remove('hot'); if (row) row.classList.add('hot'); lit = row;
    }
    function tell(j) { var h = K.host(); if (h && h.hoverRecord) h.hoverRecord(j); }
    box.addEventListener('mouseover', function (e) { var a = e.target.closest(rowSel + '[data-j]'); tell(a ? +a.dataset.j : -1); });
    box.addEventListener('mouseleave', function () { tell(-1); });
    return function (lab) { light(lab && lab.rec != null ? lab.rec : -1); return false; };
  }
  /* the old routes, until the catalog redirects them: each mounts this page with its section open */
  [['worldRecord', 'record'], ['worldOpen', 'open'], ['worldLinks', 'links']].forEach(function (x) {
    ArkUI.pageModules[x[0]] = { mount: function (hostEl) { return ArkUI.pageModules.worldChain.mount(hostEl, { section: x[1] }); } };
  });
})();

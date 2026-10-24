/* /chain, /chain/record, /chain/open, /chain/links: your chain on the 3D world (js/world/world-host.js).

   The mockup's four chain views (docs/home-redesign/home-mockup.html #/chain, #/record, #/open, #/links), each with its
   own 3D, as site pages. /chain replaces the old chain page. The page carries the view: the camera's frame is its
   [data-stage], the slab under its words is its [data-panel], and what the 3D must know (which record, which tab) goes to
   ArkWorldHost.state() while the page mounts and ArkWorldHost.select() when a choice inside it changes. Clicks on the 3D
   come back through ArkWorldHost.on('pick'), and a hover on a tile lights its row (on('hover')). Without the world every
   page still reads and works on its own.

   REDUCTION TEST (one answer for each of the four views, in the mockup's own order)
   1 About. chain: your chain and the record you look at. record: one record, its versions, its place in time.
     open: the content of one record. links: what one record is linked to.
   2 Dominant action. chain: View record. record: Open record. open: See connections. links: Open record.
   3 Know now. chain: how many records, the newest, how many are signed, what the chosen record links to, and that your key
     signs each record. record: name, revision, date, signer, a first line of what it says, earlier versions, what comes
     next, where it sits on the timeline. open: what it says, beside it its type, state, signer and next record.
     links: the record before it, the one after it, its earlier versions, its related records, its signer.
   4 Hidden until asked. chain: the activity (a tab). record: the full text, connections and history (one click on).
     open: details, signature and history (tabs). links: the record's text.
   5 Repeated elsewhere. Nothing: the path lives in the open card's top line, and connections live on their own page.
   6 Only because the data has it. The records, dates, revisions, signers, related records and history are the sample
     data (js/content/records-sample.js). Nothing here is live: every page says it is a sample or shows a dash.
   7 Removable without changing the decision. Nothing more.
   8 Leaving keeps state. The record and the tab ride in the address (?r=, ?tab=), so Back, Forward and a shared link work.
   9 Returning. The address restores the same record and tab.
   10 If WebGL is missing. The words, rows, tabs, arrows and the open card work with no 3D, on a flat glass slab.

   Words: the worldchain manifest (WORLDCHAIN.*, read by ArkCopy). No word is written in this file. The identity flow strip
   that tops each page (steps 5 to 8 of 9) is built here and shared with js/pages/world-identity.js as ArkUI.worldFrame.
   Layout: css/world-chain.css. Motion: every .rise item rises in and leaves by transform and clip (ArkUI.worldRise), and
   a new choice wipes the changed words in by transform and clip. Nothing fades. */
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
  /* t = K.words('WORLDCHAIN.'): t('CHAIN.TITLE', { n: 5 }) reads the manifest field and fills its {n} */
  K.words = function (area) { return function (role, vars) { return K.fmt(ArkCopy.text(area + role), vars); }; };
  K.pad = function (n) { return (n < 10 ? '0' : '') + n; };
  K.clamp = function (value, lo, hi, dflt) { var n = parseInt(value, 10); return isNaN(n) ? dflt : Math.min(hi, Math.max(lo, n)); };
  K.params = function () { return new URLSearchParams(ArkUI.route.search()); };
  function entry(key) { return ArkUI.pageCatalog && ArkUI.pageCatalog[key]; }
  K.href = function (key, query) { var e = entry(key); return e ? ArkUI.route.href(e.path) + (query ? '?' + query : '') : '#'; };
  /* a link to a page of the site: the router follows it (js/hero-motion.js reads data-scene-link) */
  K.link = function (a, key, query) { a.dataset.sceneLink = key; a.href = K.href(key, query); return a; };
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

  /* ---------- the controller: the address, the world, the words ----------
     def: view (the mockup's name for the view), key (the catalog route), area (manifest prefix), titleId, here, back,
     card (the opened record), parse(params) -> state, query(state) -> string, world(state) -> what the 3D is told,
     build(ctx) once, render(state, ctx) on every choice, keys(event, state, ctx), picks { name: fn(a, b, ctx, state) }. */
  K.mount = function (hostEl, def) {
    var f = K.frame({ view: def.view, area: def.area, titleId: def.titleId, here: def.here, back: def.back, card: def.card, crumbs: def.crumbs });
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
     THE FOUR CHAIN VIEWS
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
  function dayOf(r) { var d = Date.parse(r.date + ' UTC'); return isNaN(d) ? null : d / 864e5; }
  var missing = function () { return t('COMMON.MISSING'); };
  /* metadata the kit way: revision, date, signer, a dash for none */
  function facts(r) {
    return [r.revision ? t('COMMON.REV', { n: K.pad(r.revision) }) : null, r.date, r.signedBy ? t('COMMON.SIGNEDBY', { name: r.signedBy }) : null].filter(Boolean).join(' · ');
  }
  function twoTitle(h, r, second) { var sub = second || (r.revision ? t('COMMON.REVISION', { n: K.pad(r.revision) }) : ''); K.title(h, r.title + '.', sub.replace(/\.$/, '') + ' · ' + t('COMMON.SAMPLE')); }
  function glyph(parent, name) { var mk = K.node('span', 'mk'); mk.innerHTML = GLYPH[name || 'doc']; parent.appendChild(mk); return mk; }
  function earlierText(r) { return r.earlier ? t('COMMON.EARLIER', { a: K.pad(r.earlier[0]), b: K.pad(r.earlier[1]) }) : null; }
  /* a state pill and the words: Signed or Not signed */
  function signedPill(r) { return r.signedBy ? K.node('span', 'st', t('COMMON.SIGNED')) : K.node('span', 'st none', t('COMMON.NOTSIGNED')); }
  /* a list keeps its keyboard place when its rows are rebuilt */
  function keepFocus(box, build) {
    var was = document.activeElement && box.contains(document.activeElement) ? document.activeElement.getAttribute('data-pick') : null;
    build();
    if (was) { var again = box.querySelector('[data-pick="' + was + '"]'); if (again) again.focus({ preventScroll: true }); }
  }

  var TABS = { chain: ['records', 'activity'], open: ['content', 'details', 'signature', 'history'] };
  function parseChain(view) {
    return function (params) {
      var first = list()[0], r = find(params.get('r')).record, tabs = TABS[view] || [], tab = params.get('tab');
      var st = { r: (r || first || {}).id || null };
      if (tabs.length) st.tab = tabs.indexOf(tab) >= 0 ? tab : tabs[0];
      return st;
    };
  }
  function queryChain(view) {
    return function (st) {
      var q = ['r=' + encodeURIComponent(st.r)], tabs = TABS[view];
      if (tabs && st.tab && st.tab !== tabs[0]) q.push('tab=' + st.tab);
      return q.join('&');
    };
  }
  /* what the 3D is told: the mockup's address state for the view */
  function worldOf(view) { return function (st) { var w = { view: view, r: st.r }; if (st.tab) w.tab = st.tab; return w; }; }
  /* the record turned to by the arrows: a step through the list, newest first */
  function turn(ctx, st, d) {
    var all = list(); if (!all.length) return;
    var i = find(st.r).index; ctx.set({ r: all[(i + d + all.length) % all.length].id });
  }
  /* a click on a 3D tile: j is the record's index. Returns false for another view's click so the host keeps its own default. */
  function tileClick(view, onChosen, onOther) {
    return function (v, j, ctx, st) {
      var all = list();
      if (v !== view || j == null || j < 0 || !all[j]) return false;
      var i = find(st.r).index;
      if (j === i) onChosen(ctx, st, all[j]); else onOther(ctx, st, all[j]);
      return true;
    };
  }
  /* a hover on a tile lights its row, and a row lights its tile */
  function hoverRows(ctx, box, rowSel) {
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

  /* ---------- /chain: every record, newest first ---------- */
  ArkUI.pageModules.worldChain = {
    mount: function (hostEl) {
      var tabsApi, hover;
      return K.mount(hostEl, {
        view: 'chain', key: 'chain', area: area, titleId: 'wc-chain-title', here: t('COMMON.HERE'),
        back: { key: 'zero', text: t('COMMON.BACKNETWORK') },
        parse: parseChain('chain'), query: queryChain('chain'), world: worldOf('chain'),
        build: function (c) {
          var f = c.f, s = c.refs = {};
          /* under the ring: newer, the count, older */
          var turns = K.node('div', 'wc-turns rise'); turns.setAttribute('role', 'group'); turns.setAttribute('aria-label', t('CHAIN.TURN.LABEL'));
          [['newer', -1, ARROW_L, 'CHAIN.TURN.NEWER'], ['older', 1, ARROW_R, 'CHAIN.TURN.OLDER']].forEach(function (x, n) {
            var b = K.node('button', 'turn'); b.type = 'button'; b.innerHTML = x[2]; b.setAttribute('aria-label', t(x[3]));
            b.addEventListener('click', function () { turn(c, c.st, x[1]); });
            if (n === 1) turns.appendChild(s.count = K.node('span', 'mono')); turns.appendChild(b);
          });
          s.count.setAttribute('aria-live', 'polite');
          f.col.appendChild(turns);
          f.add(K.flow(4));
          s.h1 = f.add(K.node('h1', 'wc-two')); s.h1.id = 'wc-chain-title';
          var lede = f.add(K.node('p', 'wc-lede tight')); lede.appendChild(K.state(t('COMMON.SAMPLE'), 'none')); lede.appendChild(document.createTextNode(' ' + t('CHAIN.LEDE')));
          s.strip = f.add(K.node('dl', 'wc-strip'));
          s.next = f.add(K.node('p', 'wc-nextrow'), true);
          var line = f.add(K.node('div', 'wc-tabline'));
          tabsApi = K.tabs(t('CHAIN.TABS'), [
            { id: 'records', text: t('CHAIN.TAB.RECORDS'), tab: 'wc-tab-records', panel: 'wc-records' },
            { id: 'activity', text: t('CHAIN.TAB.ACTIVITY'), tab: 'wc-tab-activity', panel: 'wc-activity' }
          ], function (id) { c.set({ tab: id }); });
          line.appendChild(tabsApi.bar); c.stops.push(function () { if (tabsApi.stop) tabsApi.stop(); });
          s.recs = f.add(K.node('ol', 'wc-recs')); s.recs.id = 'wc-records'; s.recs.setAttribute('role', 'tabpanel'); s.recs.setAttribute('aria-labelledby', 'wc-tab-records');
          s.act = f.add(K.node('ol', 'wc-recs activity')); s.act.id = 'wc-activity'; s.act.setAttribute('role', 'tabpanel'); s.act.setAttribute('aria-labelledby', 'wc-tab-activity');
          s.cta = K.cta(); s.cta.say.textContent = t('CHAIN.CTA');
          s.links = K.node('a', null, t('COMMON.CONNECTIONS')); s.history = K.node('a', null, t('COMMON.HISTORY'));
          f.add(K.foot(s.cta, [s.links, s.history]));
          s.recs.addEventListener('click', function (e) { var a = e.target.closest('[data-pick]'); if (a) c.stay(e, { r: a.dataset.pick }); });
          hover = hoverRows(c, s.recs, 'a');
          c.def.picks.hover = function (lab) { return hover(lab); };
        },
        render: function (st, c) {
          var s = c.refs, all = list(), found = find(st.r), r = found.record, idx = found.index, next = all[idx + 1] || null;
          if (!r) return;
          var signed = all.filter(function (x) { return x.signedBy; }).length;
          K.title(s.h1, t('CHAIN.TITLE'), t('CHAIN.SUB', { n: all.length }));
          K.cells(s.strip, [[t('CHAIN.CELL.RECORDS'), all.length], [t('CHAIN.CELL.NEWEST'), all[0].date], [t('CHAIN.CELL.SIGNED'), t('CHAIN.OF', { n: signed, total: all.length })]]);
          /* what the chosen record links to: the record before it */
          s.next.textContent = ''; s.next.appendChild(K.node('span', 'mono', t('CHAIN.LINKSTO')));
          if (next) { var go = K.link(K.node('a', null, next.title + ' →'), 'chain/record', 'r=' + next.id); s.next.appendChild(go); }
          else s.next.appendChild(K.node('span', null, t('CHAIN.ISFIRST')));
          s.count.textContent = t('CHAIN.OF', { n: idx + 1, total: all.length });
          keepFocus(s.recs, function () {
            s.recs.textContent = '';
            all.forEach(function (x, i) {
              var li = K.node('li'), a = K.stayLink(K.node('a'), 'chain', 'r=' + x.id);
              a.dataset.pick = x.id; a.dataset.j = i; a.setAttribute('aria-current', String(i === idx));
              glyph(a, x.glyph);
              var words = K.node('span'); words.appendChild(K.node('b', null, x.title));
              words.appendChild(K.node('small', null, facts({ revision: x.revision, date: x.date })));
              a.appendChild(words); a.appendChild(signedPill(x)); a.insertAdjacentHTML('beforeend', ARROW_R.replace('<svg ', '<svg class="go" '));
              li.appendChild(a); s.recs.appendChild(li);
            });
          });
          /* activity: the sample's history steps across the chain, newest first */
          var acts = []; all.forEach(function (x) { (x.provenance || []).forEach(function (p, k) { acts.push({ x: x, p: p, k: k }); }); });
          acts.sort(function (a, b) { return (dayOf(b.x) - dayOf(a.x)) || b.k - a.k; });
          s.act.textContent = '';
          if (!acts.length) s.act.appendChild(K.node('li', 'none', t('CHAIN.NOACTIVITY')));
          acts.forEach(function (a) {
            var li = K.node('li'); glyph(li, a.x.glyph);
            var words = K.node('span'); words.appendChild(K.node('b', null, a.p.what)); words.appendChild(K.node('small', null, t('CHAIN.ACTIVITY', { title: a.x.title, by: a.p.by })));
            li.appendChild(words); li.appendChild(K.node('time', null, a.p.date)); s.act.appendChild(li);
          });
          tabsApi.select(st.tab);
          s.recs.hidden = st.tab !== 'records'; s.act.hidden = st.tab !== 'activity';
          K.link(s.cta, 'chain/record', 'r=' + r.id); K.link(s.links, 'chain/links', 'r=' + r.id); K.link(s.history, 'chain/open', 'r=' + r.id + '&tab=history');
          K.tags('chain', [
            { id: 'key', name: t('CHAIN.TAG.KEY'), sub: t('CHAIN.TAG.KEYSUB', { n: all.length }), cls: 'lit', at: 'above' },
            { id: 'oldest', name: t('CHAIN.TAG.OLDEST'), cls: 'small', at: 'below' },
            { id: 'newest', name: t('CHAIN.TAG.NEWEST'), cls: 'small', at: 'below' }
          ]);
        },
        keys: function (e, st, c) { var d = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0; if (d) turn(c, st, d); },
        picks: {
          pick: tileClick('chain', function (c, st, r) { K.go('chain/record', 'r=' + r.id); }, function (c, st, r) { c.set({ r: r.id }); })
        }
      });
    }
  };

  /* ---------- /chain/record: one record, its versions, its place in time ---------- */
  ArkUI.pageModules.worldRecord = {
    mount: function (hostEl) {
      return K.mount(hostEl, {
        view: 'record', key: 'chain/record', area: area, titleId: 'wc-record-title', here: t('COMMON.HERE'),
        back: { key: 'chain', text: t('COMMON.BACKCHAIN') },
        parse: parseChain('record'), query: queryChain('record'), world: worldOf('record'),
        build: function (c) {
          var f = c.f, s = c.refs = {};
          s.timeline = K.node('nav', 'wc-timeline rise'); s.timeline.setAttribute('aria-label', t('RECORD.TIMELINE'));
          f.col.appendChild(s.timeline);
          f.add(K.flow(5));
          s.kind = f.add(K.node('p', 'wc-eyebrow mono'), true);
          s.h1 = f.add(K.node('h1', 'wc-two'), true); s.h1.id = 'wc-record-title';
          s.meta = f.add(K.node('p', 'wc-meta mono'), true);
          s.about = f.add(K.node('p', 'wc-lede'), true);
          s.preview = f.add(K.node('p', 'wc-preview'), true);
          s.facts = f.add(K.node('dl', 'wc-facts'), true);
          s.cta = K.cta(); s.cta.say.textContent = t('RECORD.CTA');
          s.links = K.node('a', null, t('COMMON.CONNECTIONS')); s.history = K.node('a', null, t('COMMON.HISTORY'));
          f.add(K.foot(s.cta, [s.links, s.history]));
          /* one dot per record, placed by its date; the highlight slides from the old dot to the new one */
          var all = list(), days = all.map(dayOf), lo = Math.min.apply(null, days), hi = Math.max.apply(null, days);
          s.hi = K.node('b', 'tl-hi'); s.hi.setAttribute('aria-hidden', 'true'); s.timeline.appendChild(s.hi);
          s.dots = all.slice().reverse().map(function (x, n) {
            var j = all.length - 1 - n, a = K.stayLink(K.node('a', n % 2 ? 'low' : ''), 'chain/record', 'r=' + x.id);
            a.dataset.pick = x.id; a.dataset.j = j; a.style.left = (hi > lo ? (days[j] - lo) / (hi - lo) * 100 : 50).toFixed(2) + '%';
            a.setAttribute('aria-label', x.title + ', ' + x.date);
            a.appendChild(K.node('i'));
            var label = K.node('span');
            if (x.revision) { label.appendChild(K.node('em', null, t('COMMON.REV', { n: K.pad(x.revision) }))); }
            label.appendChild(K.node('u', null, x.date.slice(0, 6)));
            a.appendChild(label); s.timeline.appendChild(a); return a;
          });
          s.timeline.addEventListener('click', function (e) { var a = e.target.closest('[data-pick]'); if (a) c.stay(e, { r: a.dataset.pick }, 'push'); });
          /* two labels on one side that would touch shorten to the revision */
          function polish() {
            s.dots.forEach(function (a) { a.classList.remove('short'); });
            [false, true].forEach(function (low) {
              var row = s.dots.filter(function (a) { return a.classList.contains('low') === low; }).sort(function (x, y) { return parseFloat(x.style.left) - parseFloat(y.style.left); });
              for (var i = 1; i < row.length; i++) {
                var a = row[i - 1].lastChild.getBoundingClientRect(), b = row[i].lastChild.getBoundingClientRect();
                if (a.width && b.left < a.right + 8) { row[i - 1].classList.add('short'); row[i].classList.add('short'); }
              }
            });
          }
          c.polish = function () { requestAnimationFrame(polish); };
          var timer = 0, onResize = function () { clearTimeout(timer); timer = setTimeout(polish, 200); };
          window.addEventListener('resize', onResize); c.stops.push(function () { clearTimeout(timer); window.removeEventListener('resize', onResize); });
        },
        render: function (st, c) {
          var s = c.refs, all = list(), found = find(st.r), r = found.record, idx = found.index, next = all[idx + 1] || null;
          if (!r) return;
          s.kind.textContent = t('COMMON.KIND', { type: r.type || t('COMMON.DEFAULTTYPE'), chain: data().chain });
          twoTitle(s.h1, r); s.meta.textContent = facts(r); K.link(c.f.back, 'chain', 'r=' + r.id);
          s.about.textContent = r.about || t('RECORD.NODESC'); s.about.classList.toggle('none', !r.about);
          /* a preview of what the record says: its first heading and its first line or two */
          var first = r.content && r.content[0];
          s.preview.textContent = '';
          if (first) {
            s.preview.appendChild(K.node('span', 'mono', first.head));
            s.preview.appendChild(document.createTextNode(first.items[0] + (first.items.length > 1 ? ' · ' + first.items[1] : '') + '…'));
          }
          s.preview.hidden = !first;
          s.facts.textContent = '';
          [[t('COMMON.FACT.TYPE'), r.type || missing()], [t('COMMON.FACT.STATE'), r.state || t('COMMON.NOTSIGNED')], [t('COMMON.FACT.SIGNEDBY'), r.signedBy || missing()],
            [t('COMMON.FACT.EARLIER'), earlierText(r) || missing()], [t('COMMON.FACT.NEXT'), next]].forEach(function (x) {
            s.facts.appendChild(K.node('dt', null, x[0]));
            var dd = K.node('dd');
            if (x[1] && x[1].title) dd.appendChild(K.link(K.node('a', null, x[1].title), 'chain/record', 'r=' + x[1].id)); else dd.textContent = x[1] || missing();
            s.facts.appendChild(dd);
          });
          K.link(s.cta, 'chain/open', 'r=' + r.id); K.link(s.links, 'chain/links', 'r=' + r.id); K.link(s.history, 'chain/open', 'r=' + r.id + '&tab=history');
          s.dots.forEach(function (a) { a.setAttribute('aria-current', String(+a.dataset.j === idx)); });
          s.hi.style.left = s.dots.filter(function (a) { return +a.dataset.j === idx; })[0].style.left;
          c.polish();
          var tags = [];
          if (r.earlier) for (var i = 0; i < Math.min(3, r.earlier[1] - r.earlier[0] + 1); i++) tags.push({ id: 'g' + i, name: t('RECORD.TAG.REV', { n: K.pad(r.earlier[1] - i) }), cls: 'small', at: 'above' });
          if (next) tags.push({ id: 'next', name: t('RECORD.TAG.NEXT'), sub: next.title, at: 'above' });
          K.tags('record', tags);
        },
        picks: {
          pick: tileClick('record', function (c, st, r) { K.go('chain/open', 'r=' + r.id); }, function (c, st, r) { c.set({ r: r.id }, 'push'); })
        }
      });
    }
  };

  /* ---------- /chain/open: the record opened into its card ---------- */
  ArkUI.pageModules.worldOpen = {
    mount: function (hostEl) {
      var tabsApi;
      return K.mount(hostEl, {
        view: 'open', key: 'chain/open', area: area, titleId: 'wc-open-title', card: true, crumbs: false,
        parse: parseChain('open'), query: queryChain('open'), world: worldOf('open'),
        build: function (c) {
          var f = c.f, s = c.refs = {};
          var card = f.add(K.node('article', 'wc-card'), false, f.sheet);
          card.appendChild(K.flow(6));
          var top = K.node('div', 'wc-cardtop');
          s.back = K.node('a', 'back pill'); s.back.innerHTML = ARROW_L; s.back.appendChild(document.createTextNode(t('COMMON.BACKCHAIN')));
          s.path = K.node('span', 'wc-path'); s.path.setAttribute('data-sw', '');
          s.kind = K.node('span', 'wc-kind mono'); s.kind.setAttribute('data-sw', '');
          top.appendChild(s.back); top.appendChild(s.path); top.appendChild(s.kind); card.appendChild(top);
          s.h2 = K.node('h1', 'wc-two'); s.h2.id = 'wc-open-title'; s.h2.setAttribute('data-sw', ''); card.appendChild(s.h2);
          s.meta = K.node('p', 'wc-meta mono'); s.meta.setAttribute('data-sw', ''); card.appendChild(s.meta);
          var bar = K.node('div', 'wc-cardbar');
          var names = ['content', 'details', 'signature', 'history'];
          tabsApi = K.tabs(t('OPEN.TABS'), names.map(function (n) { return { id: n, text: t('OPEN.TAB.' + n.toUpperCase()), tab: 'wc-tab-' + n, panel: 'wc-panel-' + n }; }), function (id) { c.set({ tab: id }); });
          bar.appendChild(tabsApi.bar); c.stops.push(function () { if (tabsApi.stop) tabsApi.stop(); });
          s.cta = K.cta(); s.cta.say.textContent = t('OPEN.CTA'); bar.appendChild(s.cta); card.appendChild(bar);
          var body = K.node('div', 'wc-cardbody'), panels = K.node('div', 'wc-panels');
          s.panels = {};
          names.forEach(function (n) {
            var p = K.node('section', 'wc-panel'); p.id = 'wc-panel-' + n; p.setAttribute('role', 'tabpanel'); p.setAttribute('aria-labelledby', 'wc-tab-' + n); p.setAttribute('data-sw', '');
            s.panels[n] = p; panels.appendChild(p);
          });
          s.facts = K.node('dl', 'wc-cardfacts'); s.facts.setAttribute('data-sw', '');
          body.appendChild(panels); body.appendChild(s.facts); card.appendChild(body);
          c.card = card;
        },
        render: function (st, c) {
          var s = c.refs, all = list(), found = find(st.r), r = found.record, idx = found.index, next = all[idx + 1] || null;
          if (!r) return;
          K.link(s.back, 'chain', 'r=' + r.id); K.link(s.cta, 'chain/links', 'r=' + r.id);
          s.path.textContent = data().chain + ' / '; s.path.appendChild(K.node('b', null, r.title));
          s.kind.textContent = t('COMMON.KIND', { type: r.type || t('COMMON.DEFAULTTYPE'), chain: data().chain });
          twoTitle(s.h2, r); s.meta.textContent = facts(r);
          /* the rail beside the words: type, state, signer, next record */
          s.facts.textContent = '';
          [[t('COMMON.FACT.TYPE'), r.type || missing()], [t('COMMON.FACT.STATE'), r.state || t('COMMON.NOTSIGNED')], [t('COMMON.FACT.SIGNEDBY'), r.signedBy || missing()], [t('COMMON.FACT.NEXT'), next]].forEach(function (x) {
            var cell = K.node('div'); cell.appendChild(K.node('dt', null, x[0]));
            var dd = K.node('dd');
            if (x[1] && x[1].title) dd.appendChild(K.link(K.node('a', null, x[1].title), 'chain/open', 'r=' + x[1].id)); else dd.textContent = x[1] || missing();
            cell.appendChild(dd); s.facts.appendChild(cell);
          });
          /* content: the record's sections, side by side */
          var p = s.panels;
          p.content.textContent = '';
          if (r.content) {
            var cols = K.node('div', 'wc-cols');
            r.content.forEach(function (sec) {
              var box = K.node('section'); box.appendChild(K.node('h3', null, sec.head));
              var ul = K.node('ul'); sec.items.forEach(function (x) { ul.appendChild(K.node('li', null, x)); }); box.appendChild(ul); cols.appendChild(box);
            });
            p.content.appendChild(cols);
          } else p.content.appendChild(K.node('p', 'none', t('OPEN.NOCONTENT')));
          /* details: what it says about itself, and its chain, revision and earlier versions */
          p.details.textContent = '';
          p.details.appendChild(K.node('p', r.about ? 'wc-about' : 'none', r.about || t('RECORD.NODESC')));
          var dl = K.node('dl', 'wc-facts plain');
          [[t('OPEN.DETAILS.CHAIN'), data().chain], [t('OPEN.DETAILS.REVISION'), r.revision ? K.pad(r.revision) : null], [t('OPEN.DETAILS.EARLIER'), r.earlier ? K.pad(r.earlier[0]) + '–' + K.pad(r.earlier[1]) : null]].forEach(function (x) {
            dl.appendChild(K.node('dt', null, x[0])); dl.appendChild(K.node('dd', null, x[1] || missing()));
          });
          p.details.appendChild(dl);
          /* signature: how the record is built, its fields in order and the signature last */
          p.signature.textContent = '';
          var fig = K.node('figure', 'wc-anat'), ol = K.node('ol');
          var parts = [[t('OPEN.SIG.TYPE'), r.type || missing()], [t('OPEN.SIG.TITLE'), r.title], [t('OPEN.SIG.DATE'), r.date],
            [t('OPEN.SIG.LINKS'), next ? next.title : t('OPEN.SIG.FIRST')], [t('OPEN.SIG.SIGNATURE'), r.signedBy ? t('OPEN.SIG.YOURKEY') : t('OPEN.SIG.NOTSIGNED')]];
          parts.forEach(function (x, i) {
            var li = K.node('li', i === parts.length - 1 ? 'last' : ''), n = K.node('span');
            if (i === parts.length - 1) n.innerHTML = GLYPH.key; else n.textContent = String(i + 1);
            li.style.setProperty('--i', i); li.appendChild(n); li.appendChild(K.node('b', null, x[0])); li.appendChild(K.node('small', null, x[1])); ol.appendChild(li);
          });
          fig.appendChild(ol); fig.appendChild(K.node('figcaption', null, t('OPEN.SIG.CAPTION'))); p.signature.appendChild(fig);
          if (r.signedBy) {
            var sig = K.node('div', 'wc-sig'), seal = K.node('span', 'seal'); seal.innerHTML = GLYPH.key; sig.appendChild(seal);
            var words = K.node('div'); words.appendChild(K.node('p', null, t('OPEN.SIG.SIGNED', { name: r.signedBy, date: r.date }))); words.appendChild(K.node('p', null, t('OPEN.SIG.NOTE'))); sig.appendChild(words);
            p.signature.appendChild(sig);
          } else p.signature.appendChild(K.node('p', 'none', t('OPEN.SIG.NONE')));
          /* history: the sample's steps, then the earlier revisions kept on file */
          p.history.textContent = '';
          if (r.provenance) {
            var steps = K.node('ol', 'wc-steps');
            r.provenance.forEach(function (x) { var li = K.node('li'); li.appendChild(K.node('span', null, t('OPEN.HISTORY.STEP', { what: x.what, by: x.by }))); li.appendChild(K.node('time', null, x.date)); steps.appendChild(li); });
            if (r.earlier) { var kept = K.node('li'); kept.appendChild(K.node('span', null, t('OPEN.HISTORY.KEPT', { a: K.pad(r.earlier[0]), b: K.pad(r.earlier[1]) }))); kept.appendChild(K.node('time')); steps.appendChild(kept); }
            p.history.appendChild(steps);
          } else p.history.appendChild(K.node('p', 'none', t('OPEN.HISTORY.NONE')));
          tabsApi.select(st.tab);
          Object.keys(p).forEach(function (n) { p[n].hidden = n !== st.tab; });
        },
        picks: {
          pick: function (v, j, c, st) {
            var all = list();
            if (v !== 'open' || j == null || j < 0 || !all[j] || j === find(st.r).index) return false;
            c.set({ r: all[j].id }, 'push'); return true;
          }
        }
      });
    }
  };

  /* ---------- /chain/links: what the record links to, and what links to it ---------- */
  ArkUI.pageModules.worldLinks = {
    mount: function (hostEl) {
      return K.mount(hostEl, {
        view: 'links', key: 'chain/links', area: area, titleId: 'wc-links-title', here: t('COMMON.HERE'),
        back: { key: 'chain/record', text: t('COMMON.BACKRECORD') },
        parse: parseChain('links'), query: queryChain('links'), world: worldOf('links'),
        build: function (c) {
          var f = c.f, s = c.refs = {};
          var legend = K.node('ul', 'wc-legend mono rise'); legend.setAttribute('aria-label', t('LINKS.LEGEND'));
          [['lg-link', 'LINK'], ['lg-dots', 'DOTS'], ['lg-ghost', 'GHOST'], ['lg-key', 'KEY']].forEach(function (x) { var li = K.node('li'); li.appendChild(K.node('i', x[0])); li.appendChild(document.createTextNode(t('LINKS.LEGEND.' + x[1]))); legend.appendChild(li); });
          f.col.appendChild(legend);
          f.add(K.flow(7));
          f.add(K.node('p', 'wc-eyebrow mono', t('LINKS.EYEBROW')));
          s.h1 = f.add(K.node('h1', 'wc-two'), true); s.h1.id = 'wc-links-title';
          s.groups = f.add(K.node('dl', 'wc-groups'), true);
          s.cta = K.cta(); s.cta.say.textContent = t('LINKS.CTA'); s.chain = K.node('a', null, t('COMMON.BACKCHAIN'));
          f.add(K.foot(s.cta, [s.chain]));
          s.groups.addEventListener('click', function (e) { var a = e.target.closest('[data-pick]'); if (a) c.stay(e, { r: a.dataset.pick }); });
          var hover = hoverRows(c, s.groups, 'a');
          c.def.picks.hover = function (lab) { return hover(lab); };
        },
        render: function (st, c) {
          var s = c.refs, all = list(), found = find(st.r), r = found.record, idx = found.index, next = all[idx + 1] || null, newer = all[idx - 1] || null;
          if (!r) return;
          twoTitle(s.h1, r, t('LINKS.SUB'));
          function row(x, note) {
            var a = K.stayLink(K.node('a'), 'chain/links', 'r=' + x.id); a.dataset.pick = x.id; a.dataset.j = all.indexOf(x); glyph(a, x.glyph);
            var words = K.node('span'); words.appendChild(K.node('b', null, x.title)); words.appendChild(K.node('small', null, note)); a.appendChild(words); return a;
          }
          function plainRow(mark, title, note) {
            var el = K.node('span', 'row'); glyph(el, mark);
            var words = K.node('span'); words.appendChild(K.node('b', null, title)); words.appendChild(K.node('small', null, note)); el.appendChild(words); return el;
          }
          var groups = [
            ['LINKSTO', next ? [row(next, t('LINKS.BEFORE'))] : [], t('LINKS.NONE.LINKSTO')],
            ['LINKEDFROM', newer ? [row(newer, t('LINKS.AFTER'))] : [], t('LINKS.NONE.LINKEDFROM')],
            ['EARLIER', r.earlier ? [plainRow('ghost', earlierText(r).replace(/, .*$/, ''), t('LINKS.EARLIERNOTE'))] : [], t('LINKS.NONE.EARLIER'), r.earlier ? r.earlier[1] - r.earlier[0] + 1 : 0],
            ['RELATED', (r.links || []).map(function (l) { return plainRow('doc', l.title, t('LINKS.RELATEDNOTE', { note: l.note })); }), t('LINKS.NONE.RELATED')],
            ['SIGNEDBY', r.signedBy ? [plainRow('key', t('LINKS.TAG.KEY'), t('LINKS.SIGNEDDATE', { date: r.date }))] : [], t('LINKS.NONE.SIGNEDBY')]
          ];
          s.groups.textContent = '';
          groups.forEach(function (g) {
            var n = g[3] != null ? g[3] : g[1].length, dt = K.node('dt', null, t('LINKS.G.' + g[0]));
            dt.appendChild(K.node('span', 'n', ' · ' + n)); s.groups.appendChild(dt);
            var dd = K.node('dd'); if (g[1].length) g[1].forEach(function (el) { dd.appendChild(el); }); else dd.appendChild(K.node('p', 'none', g[2]));
            s.groups.appendChild(dd);
          });
          K.link(s.cta, 'chain/open', 'r=' + r.id); K.link(s.chain, 'chain', 'r=' + r.id);
          K.link(c.f.back, 'chain/record', 'r=' + r.id);
          var tags = all.map(function (x, i) {
            return { id: 'rec-' + x.id, name: x.title, sub: x.revision ? t('COMMON.REV', { n: K.pad(x.revision) }) : '', cls: i === idx ? 'hot' : 'small', at: i === idx ? 'right' : 'below' };
          });
          tags.push({ id: 'ghosts', name: t('LINKS.TAG.GHOSTS'), sub: t('LINKS.TAG.GHOSTSSUB') });
          tags.push({ id: 'key', name: t('LINKS.TAG.KEY'), sub: r.signedBy ? t('LINKS.TAG.SIGNEDIT') : t('LINKS.TAG.NOTSIGNED'), cls: 'lit', at: 'right' });
          (r.links || []).forEach(function (l, i) { tags.push({ id: 'rel-' + i, name: l.title, sub: l.note, cls: 'small', at: 'below' }); });
          K.tags('links', tags);
        },
        keys: function (e, st, c) { var d = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0; if (d) turn(c, st, -d); },
        picks: {
          pick: tileClick('links', function (c, st, r) { K.go('chain/open', 'r=' + r.id); }, function (c, st, r) { c.set({ r: r.id }); })
        }
      });
    }
  };
})();

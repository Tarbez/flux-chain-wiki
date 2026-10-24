/* The frame every redesign page shares: the crumbs and the corner map, a stage on the left for the 3D, a page slab on the
   right, the labels the 3D places, and the one controller that keeps a page's choice in its address and tells the
   world about it. js/pages/world-measure.js and js/pages/world-works.js each add their pages to it; nothing here is a
   page of its own.

   WHAT A PAGE GETS
   - ArkUI.worldSheet.mount(host, def) builds the page, reads its choice from the address, renders it, and returns the
     page element. def says: view (the id the mockup's address state calls it), key (the catalog route), titleId,
     here (a manifest key), note (a manifest key or a function), parse(params) -> state, query(state) -> string,
     world(state) -> the mockup's address state for the 3D, build(ctx) (once), render(state, ctx) (every choice),
     keys(event, state, ctx) (arrow keys), picks ({ pick: fn, pickRing: fn }) for clicks on 3D things.
   - The world is optional. ArkWorldHost.state(st) is called while mounting, ArkWorldHost.select(st) when a choice inside
     the page changes, ArkWorldHost.on(name, fn) for clicks on 3D things, and every off() runs in page.arkDispose. When
     ArkWorldHost.state is missing (the world is off, or has not landed) the page still works on its own.
   - A choice inside a page replaces the history entry (Back leaves the page), as the mockup's stay() did. A link to
     another page goes through the site router (data-scene-link), never through a hash.
   - Words: ArkCopy.text(key). The only words written here are none; the shared chrome (Back to network, Where you are)
     are WORLDMEASURE.COMMON.* in the worldmeasure manifest.
   Layout and motion: css/world-measure.css (shared, .wp-*) and css/world-works.css. Every .rise item rises in and leaves
   by transform and clip (ArkUI.worldRise); a choice inside the page wipes the new words in by transform and clip. */
(function () {
  'use strict';
  var W = ArkUI.worldSheet = {};
  var ARROW = '<svg viewBox="0 0 26 20" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M1 10h23M15 1l9 9-9 9"/></svg>';
  var ARROW_L = '<svg viewBox="0 0 16 14" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M15 7H2M7.5 1.5L2 7l5.5 5.5"/></svg>';
  W.ARROW = ARROW; W.ARROW_L = ARROW_L;

  W.node = function (tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  };
  /* the words of a key, with {name} filled in from vars */
  W.fmt = function (text, vars) { return String(text).replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] != null ? vars[k] : m; }); };
  W.text = function (key, vars) { return W.fmt(ArkCopy.text(key), vars); };
  W.common = function (role) { return ArkCopy.text('WORLDMEASURE.COMMON.' + role); };
  W.num = function (n) { return Number(n).toLocaleString('en-US'); };
  W.pad = function (n) { return (n < 10 ? '0' : '') + n; };
  W.clamp = function (value, lo, hi, dflt) { var n = parseInt(value, 10); return isNaN(n) ? dflt : Math.min(hi, Math.max(lo, n)); };
  W.pick = function (list, id, key) { for (var i = 0; i < list.length; i++) if (list[i][key || 'id'] === id) return list[i]; return list[0] || null; };

  /* ---------- links ---------- */
  function entry(key) { return ArkUI.pageCatalog && ArkUI.pageCatalog[key]; }
  W.href = function (key, query) { var e = entry(key); return e ? ArkUI.route.href(e.path) + (query ? '?' + query : '') : '#'; };
  /* a link to a page of the site: the router follows it (js/hero-motion.js reads data-scene-link) */
  W.link = function (a, key, query) { a.dataset.sceneLink = key; a.href = W.href(key, query); return a; };
  /* a link field (route:<key>) of a manifest, or a plain address */
  W.field = function (a, role) {
    var value = ArkCopy.text(role), tagged = /^route:(\S+)$/.exec(value);
    if (tagged) return W.link(a, tagged[1]);
    a.href = value.replace(/^(url|doc):/, ''); return a;
  };
  /* the same destination, for a script that navigates */
  W.go = function (key, query) { return ArkUI.pageRouter.navigate(key, { query: query || '' }); };
  function plain(e) { return !(e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey); }
  W.plainClick = plain;

  /* ---------- the world, when it is there ---------- */
  function host() { return window.ArkWorldHost && ArkWorldHost.state ? window.ArkWorldHost : null; }
  W.host = host;
  /* the mockup's address state (app.js parse): every field has a value, whichever view it is for */
  W.state = function (view, patch) {
    var R = window.DEFXN_RECORDS, N = window.DEFXN_NETWORK, RES = (window.DEFXN_RESOLVERS || {}).resolvers || [], CAPS = (window.DEFXN_CAPABILITIES || {}).capabilities || [];
    var st = { view: view, r: R && R.records[0] ? R.records[0].id : null, tab: null, step: 1, id: RES[0] ? RES[0].id : null, c: CAPS[0] ? CAPS[0].id : null, g: 'mining', i: 'deark', s: null };
    return Object.assign(st, patch || {});
  };

  /* ---------- the labels the 3D places ---------- */
  /* one layer per page, its labels kept and updated in place; the world sets .seen and the transform */
  W.tags = function (layer, list) {
    var have = [].slice.call(layer.children);
    var same = have.length === list.length && have.every(function (el, i) { return el.dataset.tag === list[i].id; });
    if (!same) { layer.textContent = ''; have = []; }
    list.forEach(function (t, i) {
      var el = have[i] || layer.appendChild(W.node('span'));
      var seen = el.classList.contains('seen');
      el.className = 'tag' + (t.cls ? ' ' + t.cls : '') + (seen ? ' seen' : '');
      el.dataset.tag = t.id; if (t.at) el.dataset.at = t.at;
      el.textContent = '';
      el.appendChild(W.node('b', null, t.name)); if (t.sub) el.appendChild(document.createTextNode(t.sub));
    });
  };

  /* ---------- the corner map: the network, flat ---------- */
  W.minimap = function (hi) {
    var N = window.DEFXN_NETWORK, ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '18');
    if (!N) return svg;
    svg.setAttribute('viewBox', '0 0 ' + N.W + ' ' + N.H);
    N.RINGS.forEach(function (r, i) {
      var e = document.createElementNS(ns, 'ellipse'), rx = r[2] / 2, on = i === (hi == null ? N.MINE : hi);
      e.setAttribute('cx', r[0]); e.setAttribute('cy', r[1]); e.setAttribute('rx', rx); e.setAttribute('ry', rx * .36);
      if (on) { e.setAttribute('class', 'yours'); e.setAttribute('stroke-width', '30'); }
      svg.appendChild(e);
    });
    return svg;
  };

  /* ---------- pill tabs ---------- */
  W.tabs = function (label, items, onPick) {
    var bar = W.node('div', 'wp-tabs rise'); bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', label);
    var pill = W.node('i', 'wp-pill'); pill.setAttribute('aria-hidden', 'true'); bar.appendChild(pill);
    var buttons = items.map(function (it) {
      var b = W.node('button', null, it.text); b.type = 'button'; b.setAttribute('role', 'tab'); b.id = it.tab; b.setAttribute('aria-controls', it.panel);
      b.addEventListener('click', function () { onPick(it.id); });
      b.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
        var at = items.indexOf(it), next = items[(at + d + items.length) % items.length];
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
      buttons.forEach(function (b, i) { var on = items[i].id === id; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
      place();
    };
    if (window.ResizeObserver) { var ro = new ResizeObserver(place); ro.observe(bar); tabs.stop = function () { ro.disconnect(); }; }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    return tabs;
  };

  /* the page's one action: a cut-corner link with an arrow; its words are set with cta.say.textContent */
  W.cta = function (cls) {
    var a = W.node('a', 'wp-cta' + (cls ? ' ' + cls : '')), say = W.node('span', 'say');
    a.say = W.node('span'); say.appendChild(a.say); say.insertAdjacentHTML('beforeend', ' ' + ARROW); a.appendChild(say); return a;
  };
  /* a link field (route:<key>) of a manifest, with a query for the page it opens */
  W.fieldTo = function (a, role, query) {
    var m = /^route:(\S+)$/.exec(ArkCopy.text(role));
    if (m) return W.link(a, m[1], query);
    return W.field(a, role);
  };
  /* dt/dd cells of a strip: [label, value, muted] */
  W.cells = function (dl, rows) {
    dl.textContent = '';
    rows.forEach(function (r) {
      var cell = W.node('div'); cell.appendChild(W.node('dt', null, r[0]));
      var dd = W.node('dd', r[2] ? 'muted' : null); if (r[1] && r[1].nodeType) dd.appendChild(r[1]); else dd.textContent = r[1];
      cell.appendChild(dd); dl.appendChild(cell);
    });
  };
  /* the brief's state labels: Built, Partial, Decided, Not built */
  W.badge = function (text) { var s = W.node('span', 'state', text); s.dataset.state = String(text).toLowerCase().replace(/\s+/g, '-'); return s; };

  /* the words of a changed choice wipe in, one after another: children of every [data-sw] container */
  W.swap = function (root) {
    [].slice.call(root.querySelectorAll('[data-sw]')).forEach(function (box) {
      if (box.hidden) return;
      box.classList.remove('wp-swap'); void box.offsetWidth;
      [].slice.call(box.children).forEach(function (c, i) { c.style.setProperty('--k', Math.min(i, 6)); });
      box.classList.add('wp-swap');
    });
  };
  /* a title of two parts: the plain words, then the muted ones, each a child so each can wipe in */
  W.title = function (h, first, second) {
    h.textContent = '';
    h.appendChild(W.node('span', null, first));
    if (second) { h.appendChild(document.createTextNode(' ')); h.appendChild(W.node('span', 'dim', second)); }
  };

  /* ---------- the frame ---------- */
  W.frame = function (o) {
    var page = W.node('section', 'world-page wp wp-' + o.view);
    page.setAttribute('aria-labelledby', o.titleId); page.dataset.wpView = o.view;
    var top = W.node('div', 'wp-top');
    var crumbs = W.node('nav', 'wp-crumbs rise'); crumbs.setAttribute('aria-label', W.common('WHERE'));
    var path = W.node('span', 'path'); path.appendChild(W.node('b', null, W.common('ROOT'))); path.appendChild(document.createTextNode(' / ' + o.here));
    var back = W.link(W.node('a', 'back'), 'zero'); back.innerHTML = ARROW_L; back.appendChild(document.createTextNode(W.common('BACK')));
    crumbs.appendChild(path); crumbs.appendChild(back);
    var map = W.link(W.node('a', 'wp-minimap rise'), 'zero'); map.setAttribute('aria-label', W.common('BACK')); map.appendChild(W.minimap());
    top.appendChild(crumbs); top.appendChild(map);
    var body = W.node('div', 'wp-body'), col = W.node('div', 'wp-stagecol');
    var stage = W.node('div', 'wp-stage'); stage.setAttribute('data-stage', '');
    col.appendChild(stage);
    var note = null;
    if (o.note !== false) { note = W.node('p', 'wp-note mono rise'); col.appendChild(note); }
    var slot = W.node('div', 'wp-slot'); slot.setAttribute('data-panel', '');
    var sheet = W.node('div', 'wp-sheet'); slot.appendChild(sheet);
    body.appendChild(col); body.appendChild(slot);
    var tags = W.node('div', 'tags wp-tags'); tags.dataset.for = o.view; tags.setAttribute('aria-hidden', 'true');
    var anchor = W.node('div', 'world-insert'); anchor.setAttribute('data-ark-insert', 'main');
    page.appendChild(top); page.appendChild(body); page.appendChild(tags); page.appendChild(anchor);
    var f = { page: page, top: top, crumbs: crumbs, map: map, stage: stage, note: note, slot: slot, sheet: sheet, tags: tags };
    /* an item of the sheet that rises with the page */
    f.add = function (el, swap) { el.classList.add('rise'); if (swap) el.setAttribute('data-sw', ''); sheet.appendChild(el); return el; };
    return f;
  };

  /* ---------- the controller ---------- */
  W.mount = function (hostEl, def, query) {
    var f = W.frame({ view: def.view, titleId: def.titleId, here: ArkCopy.text(def.here), note: def.note === false ? false : true });
    var path = entry(def.key).path, offs = [], listeners = [], st = def.parse(W.params(query)), ctx = { f: f, page: f.page, sheet: f.sheet, tags: f.tags, st: st, def: def };
    function world() { return def.world ? def.world(st) : null; }
    function draw(swap) {
      ctx.st = st;
      if (typeof def.note === 'function' && f.note) f.note.textContent = def.note(st); else if (typeof def.note === 'string' && f.note) f.note.textContent = ArkCopy.text(def.note);
      def.render(st, ctx);
      if (swap) W.swap(f.sheet);
    }
    /* a choice inside the page: the address (replacing the entry), the world, the words */
    ctx.set = function (patch) {
      var before = def.query(st);
      st = Object.assign({}, st, patch);
      ArkUI.route.write(path, def.query(st), 'replace');
      var h = host(), w = world(); if (h && w && h.select) h.select(w);
      draw(def.query(st) !== before);
    };
    ctx.stay = function (e, patch) { if (!plain(e)) return; e.preventDefault(); ctx.set(patch); };
    if (def.build) def.build(ctx);
    hostEl.appendChild(f.page);
    draw(false);
    var h = host();
    if (h) {
      var w = world(); if (w) h.state(w);
      Object.keys(def.picks || {}).forEach(function (name) {
        if (!h.on) return;
        var off = h.on(name, function (a, b) { def.picks[name](a, b, ctx, st); });
        if (typeof off === 'function') offs.push(off);
      });
    }
    /* Back and Forward inside the page */
    function again() {
      if (ArkUI.route.path() !== path) return;
      var next = def.parse(W.params());
      if (def.query(next) === def.query(st)) return;
      st = next; var hh = host(), ww = world(); if (hh && ww && hh.select) hh.select(ww);
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
      if (ctx.dispose) ctx.dispose();
    };
    f.page.arkState = function () { return st; };
    return f.page;
  };
  /* the query a page is opened with: the router hands it to prepare() before the address is written */
  W.params = function (query) { return new URLSearchParams(query != null ? query : ArkUI.route.search()); };
  W.page = function (build) {
    var pending = null;
    return {
      prepare: function (_page, settings) { pending = settings && typeof settings.query === 'string' ? settings.query : null; },
      mount: function (hostEl) { var q = pending; pending = null; return W.mount(hostEl, build(), q); }
    };
  };

  /* a click on a 3D thing arrives as (kind, id), as ({kind, id}) or as an index: name them the same way */
  W.picked = function (a, b) { return a && typeof a === 'object' ? { kind: a.kind, id: a.id, index: a.index } : typeof a === 'number' ? { index: a } : { kind: a, id: b }; };
})();

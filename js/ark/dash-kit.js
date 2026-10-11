/* The dashboard layout kit: the small set of builders that give /stats and
   /resolver-math the same shell, grid, panels, tables and bars.

   Extracted from js/pages/stats.js on 2026-10-10, when /resolver-math
   needed the same vocabulary. The alternative was a second copy of these
   sixty lines, which is the defect this workspace's first law names: a
   duplicated builder drifts, and then two pages that are supposed to look
   identical slowly stop. css/stats-dashboard.css owns the matching styles;
   neither page defines its own panel or grid.

   Every builder returns the element it made, so a caller composes rather
   than configures. No builder reads global state. */
(function () {
  'use strict';

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /* en-US with no decimals: every figure on these pages is a count or a
     rate, and a stray ".5 swaps" reads as false precision. */
  function fmt(n) { return Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 }); }

  function panel(cls, label, title) {
    var p = el('section', 'dash-panel ' + (cls || ''));
    if (label) p.appendChild(el('p', 'dash-label', label));
    if (title) p.appendChild(el('h2', 'dash-title', title));
    return p;
  }

  /* `plain` is an optional sentence in ordinary words, rendered between the
     heading and the precise note. It exists because a section whose point
     cannot be said plainly is usually a section that is confused, and
     because a reader who bounces off the precise line still gets to keep
     reading. */
  function sectionHead(label, note, plain) {
    var h = el('div', 'dash-section');
    h.appendChild(el('h2', 'dash-section-title', label));
    if (plain) h.appendChild(el('p', 'dash-section-plain', plain));
    if (note) h.appendChild(el('p', 'dash-section-note', note));
    return h;
  }

  /* A figure tile. Returns its parts as well as the tile, because a live
     page updates the number in place rather than rebuilding the tile —
     which is how the "no number when the feed is down" rule stays
     possible. */
  function stat(cls, label, value, unit, detail) {
    var t = el('article', 'dash-stat ' + (cls || ''));
    t.appendChild(el('p', 'dash-label', label));
    var v = el('p', 'dash-stat-value');
    var n = el('strong', null, value);
    var u = el('span', 'dash-unit', unit || '');
    v.appendChild(n); v.appendChild(u); t.appendChild(v);
    var d = el('p', 'dash-stat-detail', detail || '');
    t.appendChild(d);
    return { tile: t, num: n, unit: u, detail: d };
  }

  /* A proportional bar. `share` is 0..1; the floor of 2% keeps a real but
     tiny value visible instead of rendering as nothing, which would read
     as a missing measurement rather than a small one. */
  function bar(share, cls) {
    var track = el('span', 'dash-bar' + (cls ? ' ' + cls : ''));
    var fill = el('span', 'dash-bar-fill');
    fill.style.setProperty('--w', Math.max(2, Math.min(100, share * 100)).toFixed(1) + '%');
    track.appendChild(fill);
    return track;
  }

  /* A table from headers plus rows of cells. A cell is a string, or
     { text, cls, node } for a numeric column or an embedded element. */
  function table(headers, rows, cls) {
    var wrap = el('div', 'dash-table-wrap');
    var t = el('table', 'dash-table' + (cls ? ' ' + cls : ''));
    var thead = el('thead');
    var hr = el('tr');
    headers.forEach(function (h) {
      var cell = el('th', h && h.cls ? h.cls : null, h && h.text != null ? h.text : h);
      hr.appendChild(cell);
    });
    thead.appendChild(hr);
    t.appendChild(thead);
    var tbody = el('tbody');
    rows.forEach(function (row) {
      var tr = el('tr');
      row.forEach(function (cell) {
        if (cell && cell.node) {
          var holder = el('td', cell.cls || null);
          holder.appendChild(cell.node);
          tr.appendChild(holder);
          return;
        }
        tr.appendChild(el('td', cell && cell.cls ? cell.cls : null,
          cell && cell.text != null ? cell.text : cell));
      });
      tbody.appendChild(tr);
    });
    t.appendChild(tbody);
    wrap.appendChild(t);
    return wrap;
  }

  /* Route and document links. A page never writes an href by hand: the
     catalog owns paths, and a doc opens in the in-site reference reader
     so the reader never leaves the site to read a .md file. */
  function href(key) {
    var entry = ArkUI.pageCatalog && ArkUI.pageCatalog[key];
    return entry ? (ArkUI.route ? ArkUI.route.href(entry.path) : '#' + entry.path) : '#/' + key;
  }
  function docHref(doc, from) {
    var query = 'doc=' + encodeURIComponent(doc) + '&from=' + encodeURIComponent(from || '/');
    return ArkUI.route ? ArkUI.route.href('/reference?' + query) : '#/reference?' + query;
  }
  function pageLink(label, key, cls) {
    var a = el('a', cls, label);
    a.href = href(key);
    a.dataset.sceneLink = key;
    return a;
  }
  function docLink(label, doc, from, cls) {
    var a = el('a', cls, label);
    a.href = docHref(doc, from);
    a.dataset.sceneLink = 'reference';
    return a;
  }

  /* The page shell every dashboard-shaped page opens with: breadcrumb,
     kicker, title, lede. Returns the parts so a caller can hang its own
     status block in the header. */
  function shell(options) {
    var page = el('section', 'ark-page task-page ' + (options.pageClass || '') + ' stats-dash');
    var titleId = options.titleId || 'dash-title';
    page.setAttribute('aria-labelledby', titleId);

    if (options.crumbs) {
      var path = el('nav', 'content-layer-path');
      path.setAttribute('aria-label', 'Your place');
      options.crumbs.forEach(function (crumb) {
        if (crumb.key) {
          path.appendChild(pageLink(crumb.label, crumb.key));
          return;
        }
        var here = el('span', '', crumb.label);
        here.setAttribute('aria-current', 'page');
        path.appendChild(here);
      });
      page.appendChild(path);
    }

    var body = el('div', (options.shellClass || '') + ' dash-shell');
    page.appendChild(body);

    var head = el('header', 'dash-head');
    var copy = el('div', 'dash-head-copy');
    if (options.kicker) copy.appendChild(el('p', 'dash-kicker', options.kicker));
    var h1 = el('h1', 'dash-h1', options.title);
    h1.id = titleId;
    copy.appendChild(h1);
    if (options.lede) copy.appendChild(el('p', 'dash-lede', options.lede));
    head.appendChild(copy);
    body.appendChild(head);

    return { page: page, body: body, head: head, headCopy: copy, title: h1 };
  }

  ArkUI.dash = {
    el: el, fmt: fmt, panel: panel, sectionHead: sectionHead, stat: stat, bar: bar,
    table: table, href: href, docHref: docHref, pageLink: pageLink, docLink: docLink,
    shell: shell
  };
})();

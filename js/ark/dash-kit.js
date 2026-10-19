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
  /* `from` is the route the reader's "Return" link goes back to. Omitted, the link names no
     origin and js/hero-motion.js fills in the page it is clicked on -- writing '/' here sent
     every reader that did not pass `from` back to Home (docs/ux-audit/pages.md P1). */
  function docHref(doc, from) {
    var query = 'doc=' + encodeURIComponent(doc) + (from ? '&from=' + encodeURIComponent(from) : '');
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

  /* The one place a manifest field of kind 'link' (js/content/manifest.js)
     turns into a real href. `value` is the field's tagged string:
       route:<pageCatalogKey>   -- an internal page, resolved like href(key)
       doc:<referenceDocsPath>  -- the in-site reference reader, like docHref
       url:<absoluteAddress>    -- passed through untouched, isExternal: true
     `from` is the route a doc link should return to; callers already pass
     this to docHref today (typically the current route), so it is threaded
     through the same way here. Returns { href, isExternal, sceneLink } --
     `sceneLink` is what a caller sets as `a.dataset.sceneLink` (the route
     key for 'route:', 'reference' for 'doc:', omitted for 'url:' since an
     external address is not one of this site's own routes). Centralizing
     this is the point: every retrofitted call site uses this one function
     instead of its own near-duplicate of href()/docHref(). */
  function resolveLinkField(value, from) {
    var m = /^(route|doc|url):(\S+)/.exec(value || '');
    if (!m) return { href: '#', isExternal: false, sceneLink: null };
    var tag = m[1], rest = m[2];
    if (tag === 'route') return { href: href(rest), isExternal: false, sceneLink: rest };
    if (tag === 'doc') return { href: docHref(rest, from), isExternal: false, sceneLink: 'reference' };
    return { href: rest, isExternal: true, sceneLink: null };
  }

  /* An <a> built straight from a manifest 'link' field's value -- the one
     call every retrofitted site/page helper reduces to. */
  function linkEl(label, value, from, cls) {
    var r = resolveLinkField(value, from);
    var a = el('a', cls, label);
    a.href = r.href;
    if (r.sceneLink) a.dataset.sceneLink = r.sceneLink;
    if (r.isExternal) { a.target = '_blank'; a.rel = 'noopener'; }
    return a;
  }

  /* The icon an onward link earns: 'open' (the leave-the-site glyph) only when the link really
     leaves the site -- a new tab, or an absolute address on another origin -- and 'arrow-right'
     for every in-site route or in-site reader. /about and / put the external glyph on internal
     routes such as "See how DEFXN works" (docs/ux-audit/pages-ux-a.md /about P1; the same rule
     as the text arrows: ↗ only on links that leave the site; regression: tests/site-exits.cjs). */
  function linkIcon(a) {
    if (!a) return 'arrow-right';
    if (a.target === '_blank') return 'open';
    var link = a.getAttribute ? a.getAttribute('href') || '' : String(a.href || '');
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(link)) return 'arrow-right';
    try { return typeof location !== 'undefined' && new URL(link).origin === location.origin ? 'arrow-right' : 'open'; } catch (_) { return 'open'; }
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
    resolveLinkField: resolveLinkField, linkEl: linkEl, linkIcon: linkIcon, shell: shell
  };

  /* foldToggle: the one way a page keeps content off its first screen
     without deleting it. Defect it replaces (UX audit 2026-10-19,
     docs/ux-audit/pages-ux-b.md cross-page finding 2): the fold rule was being
     met by `display:none` on phones and by line-clamps with no way to expand,
     so the lifecycle illustration, the resolutions deck and footer note were
     simply gone or cut off with "...". A page now keeps that content in the
     DOM, marks its container `data-fold="open|closed"`, and lets its own CSS
     decide what "closed" looks like at which width; this button is the only
     thing that flips it, and says so to assistive tech (aria-expanded).

     options.host     element whose data-fold this button owns (required)
     options.more     label while closed   (default 'More')
     options.less     label while open     (default 'Less')
     options.controls id of the region it reveals (aria-controls)
     options.clamp    a line-clamped element: while closed, the button hides
                      itself when that element is not actually cut off (a wide
                      screen fits the whole sentence), so it never offers a
                      "More" that reveals nothing.
     Site-side until Ark UI ships a Disclosure block (plan.md, Wave 2 adapter);
     css/components.css paints .fold-toggle. */
  ArkUI.dash.foldToggle = function (options) {
    var host = options.host, clamp = options.clamp || null;
    var button = el('button', 'fold-toggle' + (options.cls ? ' ' + options.cls : ''));
    button.type = 'button';
    if (options.controls) button.setAttribute('aria-controls', options.controls);
    function set(open) {
      host.dataset.fold = open ? 'open' : 'closed';
      button.setAttribute('aria-expanded', String(open));
      button.textContent = open ? (options.less || 'Less') : (options.more || 'More');
    }
    function fit() {
      if (!clamp || host.dataset.fold === 'open' || !clamp.isConnected) return;
      button.hidden = clamp.scrollHeight <= clamp.clientHeight + 1;
    }
    button.addEventListener('click', function () { set(host.dataset.fold !== 'open'); fit(); });
    set(!!options.open);
    if (clamp && typeof requestAnimationFrame === 'function') requestAnimationFrame(fit);
    if (clamp && typeof ResizeObserver === 'function') new ResizeObserver(fit).observe(clamp);
    return button;
  };
})();

/* The dashboard layout kit: the small set of builders that gave /stats and
   /resolver-math the same shell and panels, plus the site's one link resolver.

   Extracted from js/pages/stats.js on 2026-10-10, when /resolver-math
   needed the same vocabulary. The alternative was a second copy of these
   sixty lines, which is the defect this workspace's first law names: a
   duplicated builder drifts, and then two pages that are supposed to look
   identical slowly stop. css/stats-dashboard.css owns the matching styles;
   neither page defines its own panel or grid.

   Every builder returns the element it made, so a caller composes rather
   than configures. No builder reads global state.

   stat, table, bar and sectionHead were deleted on 2026-10-19 (W3-ARK-FOLLOWUPS): every page
   that called them is now Ark blocks (stat/stats, table, meter, section-header; js/ark/blocks.js),
   and a grep of js/ found no caller left. tests/lib/block-page-checks.cjs refuses a converted page
   that calls a layout builder again. */
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

  /* productHandoff / productLink: where a page of this site overlaps a DEFXN product, it
     explains the idea and hands the reader to that product (owner decision 2026-10-19,
     docs/ux-audit/plan.md: "explain + hand off", no duplicated tooling). The block and the link
     are the family kit's own ("Open <Product>", DefxnKit.productHandoff / productLink in
     assets/kit/defxn-product.js): the product's name, lane and address come from its own
     declaration, never from a URL written here, and the look is the kit's .dx-onward.
     options.product  catalog id ('explore', 'dao', 'treasury', 'domains', 'bundles', ...)
     options.text     the plain explanation (one or two sentences)
     options.query    optional search params for the product URL ({ q: 'name.fxn' })
     options.label    optional link label (default "Open <Product>")
     Both return null when the family catalog is not loaded (a headless test harness), so a
     page never breaks for want of it. */
  function familyKit() { return typeof window !== 'undefined' && window.DefxnKit && window.DefxnKit.productHandoff ? window.DefxnKit : null; }
  function productHandoff(options) {
    var kit = familyKit();
    var aside = kit ? kit.productHandoff(options.product, { text: options.text, query: options.query || null, label: options.label || null }) : null;
    /* Derived from the catalog, not authored content: held out of the CMS layout keys, so the
       page's own elements keep the keys they had before it was inserted (an existing
       aside.bundle-release went from aside:1 to aside:2 without this; js/content/layout.js). */
    if (aside) aside.setAttribute('data-ark-transient', 'hold');
    return aside;
  }
  function productLink(options) {
    var kit = familyKit();
    return kit ? kit.productLink(options.product, { query: options.query || null, label: options.label || null }) : null;
  }

  ArkUI.dash = {
    el: el, fmt: fmt, panel: panel, href: href, docHref: docHref, pageLink: pageLink, docLink: docLink,
    resolveLinkField: resolveLinkField, linkEl: linkEl, linkIcon: linkIcon, shell: shell,
    productHandoff: productHandoff, productLink: productLink
  };

  /* foldToggle lived here (Wave 1's stand-in for a disclosure Ark did not yet ship). It is gone:
     a page that keeps content off its first screen uses Ark's `disclosure` block
     (ArkUI.blocks.render({ block: 'disclosure', ... }), js/ark/blocks.js) -- a clamp with "More",
     or a fold below a width. Regression: tests/fold-no-hidden-content.cjs. */
})();

/* DEFXN mockup kit: the parts every page shares, written once (rule R07: every page belongs to
   the same system as Home). A page marks a slot with data-kit and this fills it:
     data-kit="top"      the header
     data-kit="foot"     the footer
     data-kit="mock"     the mockup-only bar (scene switch and the page list); not part of the design
     data-kit="crumbs"   where you are: DEFXN / data-here, and the way back (data-back, data-back-label)
     data-kit="minimap"  the network, flat, with your chain marked; it links back to the network
   Run it before the scene script: the scene's switch lives in the mockup bar.

   SCALE (audit 3, fix 1): above 1440x900 the whole page grows with the screen. One number, --s,
   is 1 at 1440x900 and below and grows to 1.6 at 2560x1440 (the smaller of width/1440 and
   height/900). The root is zoomed by it, so every px in the kit grows together, and the CSS
   divides its viewport units by it so a screen is still a screen. At --s 1 nothing changes.
   While the window resizes, body.resizing stops every transition, so a layout that changes at a
   size threshold moves at once and never animates (fix 35). */
(function () {
  var ARROW_L = '<svg viewBox="0 0 16 14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 7H2M7.5 1.5L2 7l5.5 5.5"/></svg>';
  var ARROW_UR = '<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 11L11 3M5 3h6v6"/></svg>';
  var MARK = '<svg class="mark" width="26" height="28" viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M18 2l14 8v16l-14 8-14-8V10z"/><circle cx="18" cy="18" r="4"/><path d="M18 2v12M18 22v12M4 10l10.5 6M21.5 20L32 26M32 10l-10.5 6M14.5 20L4 26"/></svg>';
  var PAGES = [['#/', 'Home'], ['#/chain', 'Chain'], ['#/record', 'Record'], ['#/open', 'Open'], ['#/links', 'Links'],
    ['#/minute', 'Minute'], ['#/resolve', 'Result'], ['#/layers', 'Layers'], ['#/life', 'Life'], ['#/resolvers', 'Resolvers'], ['#/measured', 'Measured'],
    ['#/products', 'Products'], ['#/identity', 'Identity'], ['#/nodes', 'Nodes'], ['#/fxn', 'FXN'], ['#/ring?i=defxn', 'Chains'], ['#/status', 'Status']];   /* views of the one app: moving between them never reloads */
  /* the header's pages: each one is a view of the app, so the camera flies there (2026-10-23) */
  /* the concept's map (audit 4): How it works is four chapters. Chains are the network's rings.
     each item's third field lists every view it stands for, so it stays marked on all of them */
  var NAV = [['minute', 'How it works', 'minute resolve layers life'], ['ring?i=defxn', 'Chains', 'ring'], ['resolvers', 'Resolvers', 'resolvers measured'],
    ['products', 'Products', 'products'], ['fxn', 'FXN', 'fxn']];
  function navLink(n) { return '<a href="#/' + n[0] + '" data-nav="' + n[0].split('?')[0] + '" data-views="' + n[2] + '">' + n[1] + '</a>'; }

  var parts = {
    top: function () {
      return '<a class="brand" href="#/" aria-label="DEFXN home"><b>DEFXN</b><small>FXN CHAIN</small></a>' +
        '<nav class="nav" aria-label="Main">' +
        NAV.map(navLink).join('') + '</nav>' +
        '<span class="rule-v" aria-hidden="true"></span>' +
        '<a class="account" href="#/idyou"><svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="15" cy="10" r="6"/><path d="M4 28c1.5-6 5.6-9 11-9s9.5 3 11 9"/></svg>' +
        '<span>Account<small>Signed out</small></span></a>' +
        '<span class="rule-v" aria-hidden="true"></span>' +
        '<a class="earn" href="#/fxn">Earn FXN ' + ARROW_UR + '</a>' +
        '<button class="menu" type="button" aria-expanded="false" aria-controls="menu-sheet">Menu</button>' +
        /* tablet and phone: the nav slides down from the header (fix 10) */
        '<div class="menu-sheet" id="menu-sheet" role="dialog" aria-label="Menu">' +
        NAV.map(navLink).join('') +
        '<a href="#/idyou">Account <small>Signed out</small></a><a href="#/fxn">Earn FXN ' + ARROW_UR + '</a></div>';
    },
    foot: function () {
      return '<a href="#/status">' + MARK + 'DEFXN runs on a devnet for now. ' +
        '<svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 11L11 3M5 3h6v6"/></svg></a>' +
        '<small>© 2026 FXN</small>';
    },
    /* a small pill at the bottom right; folded below 1100px wide, opened by a tap (fix 12) */
    mock: function () {
      return '<button type="button" class="mock-toggle" aria-expanded="false">Mockup</button><span class="mock-body">' +
        '<button type="button" id="toggle-scene">Scene: on</button> ' +
        PAGES.map(function (p) { return '<a href="' + p[0] + '">' + p[1] + '</a>'; }).join(' · ') + '</span>';
    },
    crumbs: function (el) {
      return '<span class="path"><b>DEFXN</b> / ' + esc(el.dataset.here || '') + '</span>' +
        (el.dataset.back ? '<a class="back" href="' + el.dataset.back + '">' + ARROW_L + esc(el.dataset.backLabel || 'Back') + '</a>' : '');
    },
    minimap: function () {
      var n = window.DEFXN_NETWORK;
      if (!n) return '';
      var rings = n.RINGS.map(function (r, i) {
        var rx = r[2] / 2, ry = rx * .36;
        return '<ellipse' + (i === n.MINE ? ' class="yours" stroke-width="30"' : '') + ' cx="' + r[0] + '" cy="' + r[1] + '" rx="' + rx + '" ry="' + ry + '"/>';
      }).join('');
      return '<svg viewBox="0 0 ' + n.W + ' ' + n.H + '" fill="none" stroke="currentColor" stroke-width="18" aria-hidden="true">' + rings + '</svg>';
    }
  };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  document.querySelectorAll('[data-kit]').forEach(function (el) {
    var fn = parts[el.getAttribute('data-kit')];
    if (fn) el.innerHTML = fn(el);
  });
  /* ---------- the scale ---------- */
  var root = document.documentElement, S = 1, resizing = 0;
  function scale() {
    var s = Math.min(1.6, Math.max(1, Math.min(innerWidth / 1440, innerHeight / 900)));
    s = Math.round(s * 100) / 100;
    if (s !== S || !root.style.getPropertyValue('--s')) {
      S = s; root.style.setProperty('--s', s); root.style.zoom = s === 1 ? '' : s;
    }
  }
  scale();
  window.addEventListener('resize', function () {
    scale();
    document.body.classList.add('resizing'); clearTimeout(resizing);
    resizing = setTimeout(function () { document.body.classList.remove('resizing'); }, 180);
  });

  /* ---------- the menu sheet ---------- */
  var menuBtn = document.querySelector('.top .menu'), sheet = document.getElementById('menu-sheet');
  function menu(open) {
    if (!menuBtn) return;
    menuBtn.setAttribute('aria-expanded', open); document.body.classList.toggle('menu-open', open);
    if (open) { var a = sheet.querySelector('a'); if (a) a.focus(); } else if (document.activeElement && sheet.contains(document.activeElement)) menuBtn.focus();
  }
  if (menuBtn) {
    menuBtn.addEventListener('click', function () { menu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
    sheet.addEventListener('click', function (e) { if (e.target.closest('a')) menu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) { e.stopPropagation(); menu(false); } }, true);
    window.addEventListener('hashchange', function () { menu(false); });
  }

  /* ---------- the mockup pill ---------- */
  var mock = document.querySelector('[data-kit="mock"]'), mockBtn = mock && mock.querySelector('.mock-toggle');
  function fold(f) { mock.classList.toggle('folded', f); mockBtn.setAttribute('aria-expanded', !f); }
  if (mockBtn) { fold(innerWidth < 1100); mockBtn.addEventListener('click', function () { fold(!mock.classList.contains('folded')); }); }

  window.DEFXNKitUI = { esc: esc, ARROW_L: ARROW_L, scale: function () { return S; } };
})();

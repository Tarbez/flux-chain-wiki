/* =====================================================================
   RESOLVER  RHEADER_V1  —  the navbar
   ---------------------------------------------------------------------
   Owner, 2026-11-09: "update the navbar ... make sure it shows in every page and make sure no .html is
   shown ... build an insanely fast rendering frame". The bar is static markup in index.html (#fxn-nav), so
   it paints with the page's first paint, before any script has run, and every link in it is a clean path
   (/intro, /learn, /auth, /download) that works with no JavaScript. This resolver ADOPTS that element when
   the shell renders: it moves the bar's children into the scene's header, rewrites each href through the
   router (file:// opens the same site by hash), marks the current route, swaps Sign in for Account once the
   visitor is signed in, and prefetches a route's scripts and sheets when the pointer rests on its link.

   Items (owner's list; ART-DIRECTOR.md "Navbar wishes"): the DEFXN mark (home), Portal, Learn, Sign in /
   Account, Get FXN Browser. No Products switcher: the portal ring is the site's navigation. The network
   choice that the old "you" panel held is on the account page's Wallet tab (js/pages/account.js), the one
   place it was always written to. Dress: css/navigation.css.

   What stays from the old bar, because other files reach it: lazyHeaderPopover (js/ark/skin-site.js hands it
   to the worn skin's user menu), ArkUI.loadWalletModule (the footer's price, js/hero-motion.js, and the
   account page), ArkUI.accountOpen (js/pages/account.js), ArkUI.refreshAccountNav (js/ark/account-session.js),
   ArkUI.headerPages and the class names header-mark, header-core-links, header-account-link, header-run-link,
   ark-header and data-header-item (js/hero-motion.js, js/ark/skin-parts.js, the browser drivers).
   ===================================================================== */

/* Ark popovers, swapped in on first press by js/resolvers/header-popover.js (tests/header-ark-parts.cjs). The bar itself
   opens no panel today; a worn NFT skin's user menu (js/ark/skin-site.js) still opens through this. */
function lazyHeaderPopover(spec) {
  var ctl, state = 0, ask = {};
  function plain(on) { spec.fallback.hidden = !on; spec.trigger.setAttribute('aria-expanded', !!on); }
  function load() {
    state = 1;
    ArkUI.loadScript('js/resolvers/header-popover.js').then(function () { return ArkHeaderPopover.attach(spec, ask); }).then(function (made) { ctl = made; }, function (error) {
      state = 3; plain(ask.open);
      console.error('Header popover not loaded (' + (error && error.message) + '). Needs: js/resolvers/header-popover.js and js/ark/vendor/ark-kit-popover.js. Remedy: reload; the menu still opens and closes by its button.');
    });
  }
  var pop = {
    warm: function () { if (!state) load(); },
    isOpen: function () { return ctl ? ctl.isOpen() : state === 3 && !spec.fallback.hidden; },
    want: function (on, byHover) {
      ask.open = on; ask.intent = on && byHover;
      if (ctl) ctl.want(on, byHover); else if (state === 3) plain(on); else if (on && !state) load();
    }
  };
  spec.trigger.addEventListener('click', function () {
    if (ask.open && ask.intent) ask.intent = false; else pop.want(state === 3 ? spec.fallback.hidden : !ask.open);
  });
  return pop;
}

/* The wallet module (js/ark/dense-wire-wallet.mjs: 21 files, 131 KB measured 2026-11-09) is off the critical path:
   the footer's price and the account page read through this one loader, and the import starts only once the window
   has loaded and the browser is idle, so it never competes with the page's own scripts for the first paint. A caller
   that asks earlier waits for that moment; nothing on the first screen needs it. Loaded with import(), never in a
   classic script list: a module that fails to load hides its own control and never takes the bar down. */
var HEADER_WALLET_MODULE = 'js/ark/dense-wire-wallet.mjs?v=20261029-decimals1';
var headerWalletModulePromise = null;
function headerIdle() {
  return new Promise(function (resolve) {
    function idle() { (window.requestIdleCallback || function (f) { setTimeout(f, 200); })(function () { resolve(); }, { timeout: 2500 }); }
    if (document.readyState === 'complete') idle(); else window.addEventListener('load', idle, { once: true });
  });
}
function loadHeaderWalletModule() {
  if (!headerWalletModulePromise) {
    headerWalletModulePromise = headerIdle().then(function () {
      var path = (location.protocol === 'file:' ? '' : '/') + HEADER_WALLET_MODULE;
      return import(new URL(path, document.baseURI).href);
    }).catch(function (error) {
      headerWalletModulePromise = null;
      throw error;
    });
  }
  return headerWalletModulePromise;
}
ArkUI.loadWalletModule = loadHeaderWalletModule;   /* one loader, one versioned path: the footer's price reads through it */

/* [copy key, page, words until the key exists]: the bar's links in order. The third item is the words until
   js/content/manifests/nav.js holds the key; then the manifest's words win. `zero` is the mark. */
/* The landing bar (owner reference, 2026-11-11: "that's how the site should look now"): the mark and wordmark, four
   links (Products, Network, Developers, Resources), Sign In, Get FXN Browser and the filled Initiate FXN ID. A fourth
   item names the control when two controls open one page (data-header-item); without it the page's key is the name.
   The four middle links become menu buttons with a chevron (buildHeaderMenus below). The page named here is where the
   static link goes with scripts off, and it is always a page that exists: before 2026-11-11 three of the four named
   retired pages (Resolutions, Network stats, Resolvers and capabilities), so two menu items opened one page and two
   menus were marked current at once (audit F08). The home is the mark's own page.
   NO SEARCH BUTTON: the site has no search, and the lens opened an unrelated page. It returns with a real search (owner decision D9). */
var HEADER_LINKS = [
  ['NAV.BRAND.NAME', 'zero', 'DEFXN'],
  ['NAV.BAR.PRODUCTS', 'fxn/apps', 'Products', 'products'],
  ['NAV.BAR.NETWORK', 'fxn/network', 'Network', 'network'],
  ['NAV.BAR.DEVELOPERS', 'fxn/records', 'Developers', 'developers'],
  ['NAV.BAR.RESOURCES', 'learn', 'Resources', 'resources'],
  ['NAV.BAR.SIGNIN', 'auth', 'Sign In'],
  ['NAV.ACCOUNT', 'account', 'Account'],
  ['NAV.RUN', 'download', 'Get FXN Browser'],
  ['NAV.BAR.INITIATE', 'auth', 'Initiate FXN ID', 'initiate']
];
/* the four links of the bar's middle, in order (their names in HEADER_LINKS) */
var HEADER_CORE = ['products', 'network', 'developers', 'resources'];
/* the pages the bar links (js/pages/not-found.js and the sitemap read these as the bar's pages) */
ArkUI.headerPages = HEADER_LINKS.map(function (item) { return item[1]; }).filter(function (key, i, all) { return key !== 'zero' && all.indexOf(key) === i; });
function headerItem(name) {
  for (var i = 0; i < HEADER_LINKS.length; i++) if ((HEADER_LINKS[i][3] || HEADER_LINKS[i][1]) === name) return HEADER_LINKS[i];
  return null;
}
function headerWords(name) {
  var item = headerItem(name);
  return !item ? '' : typeof ArkCopy !== 'undefined' && ArkCopy.has(item[0]) ? ArkCopy.text(item[0]) : item[2];
}
function headerPath(key) { var entry = ArkUI.pageCatalog && ArkUI.pageCatalog[key]; return entry ? entry.path : key === 'zero' ? '/' : '/' + key; }
function headerNode(tag, className, text) {
  var item = document.createElement(tag);
  if (className) item.className = className;
  if (text != null) item.textContent = text;
  return item;
}
/* The bar's markup, the same as index.html's #fxn-nav: built here only when no static bar exists (a test's bare
   document, the editor's canvas). Classes: css/navigation.css dresses .fxn-nav-*; the header-* names are the hooks
   other files read (see the top). */
function buildHeaderBar(el) {
  var mark = headerNode('a', 'fxn-nav-mark header-mark');
  mark.href = headerPath('zero'); mark.dataset.nav = 'zero'; mark.setAttribute('aria-label', 'DEFXN home');
  var glyph = headerNode('i', 'dx-mark'); glyph.setAttribute('aria-hidden', 'true'); mark.appendChild(glyph);
  var word = headerNode('span', 'fxn-nav-word', headerWords('zero')); word.setAttribute('aria-hidden', 'true'); mark.appendChild(word);   /* the wordmark, NAV.BRAND.NAME */
  var links = headerNode('nav', 'fxn-nav-links header-core-links'); links.setAttribute('aria-label', 'Site');
  function link(name, className) { var item = headerItem(name), a = headerNode('a', className, headerWords(name)); a.href = headerPath(item[1]); a.dataset.nav = item[1]; a.dataset.headerItem = name; return a; }
  HEADER_CORE.forEach(function (name) { links.appendChild(link(name, '')); });
  var you = link('auth', 'fxn-nav-you header-account-link'), run = link('download', 'fxn-nav-action header-run-link'), id = link('initiate', 'fxn-nav-id');
  el.appendChild(mark); el.appendChild(links); el.appendChild(you); el.appendChild(run); el.appendChild(id);
}

/* Who is here, read once per paint from the local identity, the unlocked session and the CMS session. */
function headerWho() {
  var who = ArkUI.localIdentity && ArkUI.localIdentity.current();
  var unlocked = ArkUI.accountSession && ArkUI.accountSession.isUnlocked();
  var signedIn = !!(who && ArkUI.cmsSession && ArkUI.cmsSession.isAuthenticated(who.publicKeyB64));
  return {
    state: !who ? 'out' : signedIn ? 'in' : unlocked ? 'unlocked' : 'saved',
    name: who ? who.displayName || 'Your account' : 'Account',
    status: !who ? 'Signed out' : signedIn ? 'Signed in' : unlocked ? 'Key unlocked' : 'Details saved'
  };
}
/* Signed in enough to open /account: a session the CMS accepts, or a key unlocked in this tab. Anything less goes to
   /auth to connect. The one rule: the bar's link and /account's lock both read it (owner, 2026-10-25). */
ArkUI.accountOpen = function () { var s = headerWho().state; return s === 'in' || s === 'unlocked'; };

/* Prefetch on hover (owner, 2026-11-09): a route's scripts and sheets load while the pointer rests on its link, so the
   click that follows mounts from memory. The warm itself lives in the page loader (js/ark/page-loader.js ArkUI.warmPage:
   once per route, a failed load lets the click load again), shared with the idle warm of a page's next pages. */
function headerPrefetch(key) { if (ArkUI.warmPage) ArkUI.warmPage(key); }

/* THE FOUR MENUS (owner, 2026-11-11: the home's ring menu left the site, so every page it reached is reachable from this bar in two clicks).
   Each of Products, Network, Developers and Resources is a button that opens a short panel of links. A panel lists only pages that exist, each once:
   the topics that belong to the menu, and before them the menu's own page (HEADER_LINKS) when that page is not a topic (Learn, under Resources).
   The items are never typed: the topics come from ArkSitePages.topics() in the ring's order, their words from the ring's own copy
   (HOME.LANDING.RING.S<n>, as the catalog titles them), and Learn's word from its row in js/content/site-pages.js. Only the grouping below is
   written down: topic slug -> menu. A topic with no entry here lands under Resources, so a new topic can never fall out of the bar. Every page is
   in one menu only, so one menu at most is marked current. With scripts off, the static links of index.html stay and each opens its menu's page. */
var HEADER_MENU_OF = { apps: 'products', game: 'products', releases: 'products', names: 'products', network: 'network', chains: 'network', keepers: 'network', capacity: 'network', deposits: 'network', records: 'developers', rules: 'developers', id: 'resources' };
function headerPageLabel(key) {
  if (typeof ArkSitePages === 'undefined') return key;
  var rows = ArkSitePages.pages().concat(ArkSitePages.retired());
  for (var i = 0; i < rows.length; i++) if (rows[i].key === key) return rows[i].label;
  return key;
}
/* the items of one menu: [{ key, label }]. The menu's own page leads only when it is a page that is not a topic (a topic is listed in its place) */
function headerMenuItems(name) {
  var first = headerItem(name), items = [];
  if (typeof ArkSitePages === 'undefined') return [{ key: first[1], label: headerPageLabel(first[1]) }];
  if (!ArkSitePages.topics().some(function (t) { return t.key === first[1]; })) items.push({ key: first[1], label: headerPageLabel(first[1]) });
  ArkSitePages.topics().forEach(function (t, i) {
    if ((HEADER_MENU_OF[t.slug] || 'resources') !== name) return;
    var stone = 'HOME.LANDING.RING.S' + (i + 1);
    items.push({ key: t.key, label: typeof ArkCopy !== 'undefined' && ArkCopy.has(stone) ? ArkCopy.text(stone) : t.slug });
  });
  return items;
}
/* Replaces each of the four static links with a button and its panel. Behaviour: click, Enter or Space opens; ArrowDown opens and moves to the
   first item; the arrows, Home and End move between items; Escape closes and returns focus to the button; a click outside, or focus leaving the
   menu, closes it. No hover opens a menu, so touch and keyboard reach every item. Hover or focus on an item loads its page ahead of the click. */
function buildHeaderMenus(bar) {
  var menus = [];
  function closeAll(except) { menus.forEach(function (m) { if (m !== except) m.close(); }); }
  HEADER_CORE.forEach(function (name) {
    var old = bar.querySelector('.fxn-nav-links [data-header-item="' + name + '"]');
    if (!old || !headerItem(name)) return;
    var wrap = headerNode('div', 'fxn-nav-item'), id = 'fxn-menu-' + name;
    var trigger = headerNode('button', 'fxn-nav-trigger', headerWords(name));
    trigger.type = 'button'; trigger.dataset.headerItem = name; trigger.setAttribute('aria-expanded', 'false'); trigger.setAttribute('aria-controls', id);
    var chev = headerNode('i', 'fxn-nav-chev'); chev.setAttribute('aria-hidden', 'true'); trigger.appendChild(chev);
    var panel = headerNode('div', 'fxn-nav-panel'); panel.id = id; panel.hidden = true;
    headerMenuItems(name).forEach(function (item) {
      var a = headerNode('a', '', item.label); a.href = ArkUI.route.href(headerPath(item.key)); a.dataset.nav = item.key; a.dataset.menuItem = name;
      ['pointerenter', 'focus'].forEach(function (type) { a.addEventListener(type, function () { headerPrefetch(item.key); }); });
      panel.appendChild(a);
    });
    wrap.append(trigger, panel);
    old.replaceWith(wrap);
    function items() { return Array.prototype.slice.call(panel.querySelectorAll('a')); }
    var menu = {
      open: function () { closeAll(menu); panel.hidden = false; trigger.setAttribute('aria-expanded', 'true'); },
      close: function () { panel.hidden = true; trigger.setAttribute('aria-expanded', 'false'); },
      isOpen: function () { return !panel.hidden; }
    };
    menus.push(menu);
    trigger.addEventListener('click', function () { if (menu.isOpen()) menu.close(); else menu.open(); });
    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); menu.open(); items()[0].focus(); }
      else if (e.key === 'Escape' && menu.isOpen()) { e.preventDefault(); menu.close(); }
    });
    panel.addEventListener('keydown', function (e) {
      var list = items(), at = list.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); menu.close(); trigger.focus(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); list[(at + 1) % list.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (at <= 0) trigger.focus(); else list[at - 1].focus(); }
      else if (e.key === 'Home') { e.preventDefault(); list[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); list[list.length - 1].focus(); }
    });
    panel.addEventListener('click', function () { menu.close(); });   /* a chosen item closes its menu while the page changes */
    wrap.addEventListener('focusout', function (e) { if (menu.isOpen() && e.relatedTarget && !wrap.contains(e.relatedTarget)) menu.close(); });
  });
  document.addEventListener('pointerdown', function (e) { menus.forEach(function (m) { if (m.isOpen() && !e.target.closest('.fxn-nav-item')) m.close(); }); });
}

/* REDUCTION TEST (the bar, docs/PRODUCT-DESIGN-LAWS.md)
   1 About: moving between the site's five places. 2 Dominant action: none of its own; the page's one action keeps the
   complement, the bar's Get FXN Browser is soft. 3 Know now: where you are (the marked link) and whether you are signed
   in (Sign in / Account). 4 Hidden until asked: the four menus' panels, opened by a press. 5 Repeated elsewhere: the twelve topics
   are the jump bar's too; the bar's menus are now how a visitor first reaches them (the ring left the home on 2026-11-11). 6 Only because the data has it: the Account word, from the session.
   7 Removable: nothing; each item is one of the owner's five. 8 Leaving keeps state: the bar is the same element on every
   route. 9 Returning: the marked link moves. 10 If the scripts fail: the static bar's plain links still open every page. */
ArkUI.register('RHEADER_V1', {
  tag: 'header',
  /* Placement only; css/navigation.css dresses the bar. */
  base: { position: 'absolute', top: '0', left: '0', right: '0', zIndex: '20' },
  decorate: function (el) {
    el.classList.add('ark-header', 'fxn-nav');
    /* the static bar from index.html, adopted: the same nodes move into the scene, so nothing repaints twice */
    var made = typeof document !== 'undefined' && document.getElementById('fxn-nav');
    if (made && made !== el) {
      while (made.firstChild) el.appendChild(made.firstChild);
      made.remove();
    } else if (!el.querySelector('.fxn-nav-mark')) {
      buildHeaderBar(el);
    }
    el.id = 'fxn-nav';
    var mark = el.querySelector('.fxn-nav-mark');
    if (mark) { mark.dataset.sceneLink = 'zero'; mark.href = ArkUI.route.href(headerPath('zero')); }
    el.querySelectorAll('a[data-nav]').forEach(function (link) {
      var key = link.dataset.nav;
      if (key !== 'zero') {
        link.href = ArkUI.route.href(headerPath(key)); var name = link.dataset.headerItem || key, words = headerWords(name);
        if (words && name !== 'auth' && name !== 'account') link.textContent = words;
      }
      ['pointerenter', 'focus'].forEach(function (type) { link.addEventListener(type, function () { headerPrefetch(link.dataset.nav); }); });
    });
    buildHeaderMenus(el);
    /* the current route, before js/hero-motion.js takes the marking over on every navigation */
    function current() {
      var here = ArkUI.route.path();
      el.querySelectorAll('a[data-nav]').forEach(function (link) {
        var key = link.dataset.nav, path = headerPath(key);
        if (key !== 'zero' && (here === path || (key === 'auth' && here === headerPath('account')))) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
      });
      hereMenus();
    }
    /* a menu whose panel holds the current page shows it on its button too */
    function hereMenus() { el.querySelectorAll('.fxn-nav-item').forEach(function (item) { item.querySelector('.fxn-nav-trigger').toggleAttribute('data-here', !!item.querySelector('a[aria-current="page"]')); }); }
    /* js/hero-motion.js marks the links on each navigation; the buttons follow once it has */
    addEventListener('ark:route-ready', function () { setTimeout(hereMenus, 0); });
    /* paints the one control that shows who is here: Sign in, or Account (js/ark/account-session.js calls this on change) */
    ArkUI.refreshAccountNav = function () {
      var me = headerWho(), you = el.querySelector('.fxn-nav-you');
      if (!you) return;
      var open = ArkUI.accountOpen(), key = open ? 'account' : 'auth';
      you.textContent = open ? headerWords('account') : headerWords('auth');
      you.href = ArkUI.route.href(headerPath(key)); you.dataset.nav = key; you.dataset.headerItem = key;
      you.dataset.you = me.state; you.dataset.signedIn = me.state === 'in' ? 'true' : 'false';
      you.title = me.name + ' · ' + me.status;
      you.setAttribute('aria-label', (open ? 'Account: ' : 'Sign in: ') + me.name + ', ' + me.status.toLowerCase());
      /* Initiate FXN ID is for a visitor with no FXN ID on this device: once one is saved, the control leaves the bar */
      var id = el.querySelector('.fxn-nav-id'); if (id) id.hidden = me.state !== 'out';
      current();
    };
    if (ArkUI.localIdentity && !ArkUI.accountNavSubscribed) {
      ArkUI.accountNavSubscribed = true;
      ArkUI.localIdentity.subscribe(function () { ArkUI.refreshAccountNav(); });
    }
    ArkUI.refreshAccountNav();
  },
  /* the runtime appends a pattern's children after decorate: the scene pattern's legacy nav child (js/scene.flux.js
     F-NAV-RNAV_V1, eight hash links) is not part of this bar and leaves here, once it exists */
  onMount: function (el) {
    var legacy = el.querySelector('#primary-navigation');
    if (legacy) legacy.remove();
    /* THE BAR COMES FIRST IN THE TAB ORDER (audit F11: Tab went through the page's 20 controls before it reached the mark). The scene pattern
       places the header after the page outlet, so the bar moves before it in the document; it is placed by position and z-index (base above),
       so nothing moves on screen. The skip link (index.html, before the scene) stays the first stop and takes its word from the manifest */
    var outlet = el.parentNode && el.parentNode.querySelector('[data-ark-layer="outlet"]');
    if (outlet && outlet.parentNode === el.parentNode && (outlet.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) el.parentNode.insertBefore(el, outlet);
    var skip = document.querySelector('body > .skip');
    if (skip && typeof ArkCopy !== 'undefined' && ArkCopy.has('NAV.BAR.SKIP')) skip.textContent = ArkCopy.text('NAV.BAR.SKIP');
  }
});

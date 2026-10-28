/* =====================================================================
   RESOLVER  RHEADER_V1  —  the top bar
   ---------------------------------------------------------------------
   The DEFXN mark alone at the left; every control in one cluster at the right, in this order
   (owner, 2026-10-25): Get FXN Browser, then Products + Overview + Mesh Explorer as one
   segmented control, then ONE "you" control. The "you" control replaced three (Account, the
   network pill and MENU): it shows who you are and which network you are on, and opens one
   panel in layers -- you and your network first, then the few pages that matter.
   ===================================================================== */

/* Ark popovers for the pill and the Resolutions menu, swapped in on first press by js/resolvers/header-popover.js (tests/header-ark-parts.cjs) */
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

/* Network switcher, site-wide (directed 2026-10-16: "the network chain
   switch at the nav level inside defxn"; corrected the same day: "make
   sure it is outside of the popover and right next to the menu icon
   itself as the chain popover" -- the first pass buried it inside the
   hamburger menu's own panel, where it went unnoticed). Reuses
   js/ark/dense-wire-wallet.mjs's KNOWN_NETWORKS/resolveWireUrl/
   rememberWireUrl -- the one place that already defines what networks
   exist and remembers a holder's choice for the account page's Wallet
   tab -- via its shared `mountNetworkSelect` helper (a real themed
   listbox, never a native <select>: confirmed live that a native
   select's OPEN state is unstyleable OS chrome even inside a custom
   glass-panel popover), so this is a second place that WIRES a network
   picker, never a second place that KNOWS how. Loaded on first use with
   import(), same reasoning as
   account.js: a page-loader classic script list cannot carry an ES
   module, and a wallet module that fails to load (no module support, a
   file: URL) must not take the rest of the header down with it -- a
   mount that fails just hides its own control. */
var HEADER_WALLET_MODULE = 'js/ark/dense-wire-wallet.mjs?v=20261025-price1';
var headerWalletModulePromise = null;
function loadHeaderWalletModule() {
  if (!headerWalletModulePromise) {
    headerWalletModulePromise = Promise.resolve().then(function () {
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
function shortNetworkLabel(url, knownNetworks) {
  for (var i = 0; i < knownNetworks.length; i++) {
    if (knownNetworks[i].url === url) return knownNetworks[i].label;
  }
  return 'Custom';
}
/* The network list inside the "you" panel's Network layer: js/ark/dense-wire-wallet.mjs's shared
   mountNetworkSelect (the one place that knows which networks exist and remembers the choice; a
   real listbox, never a native <select>). `show` is told the current name now and on every change,
   from here or from the account page's Wallet tab (defxn-network-changed). A module that fails to
   load hides the Network row instead of breaking the bar. */
function mountHeaderNetwork(list, show, picked, failed) {
  loadHeaderWalletModule().then(function (dw) {
    show(shortNetworkLabel(dw.resolveWireUrl(), dw.KNOWN_NETWORKS));
    dw.mountNetworkSelect(list, picked);
    window.addEventListener('defxn-network-changed', function (event) {
      var url = event.detail && event.detail.url;
      if (url) show(shortNetworkLabel(url, dw.KNOWN_NETWORKS));
    });
  }).catch(failed);
}

/* The "you" panel's pages: only the critical ones (owner, 2026-10-25: "truly reduce all the noise").
   DERIVED, never listed: the page where each journey starts (site-pages.js `lead`) and the pages the
   bar itself links (ArkUI.headerPages, so a link the row fit folds away is still one click away
   here), in journey order. Account is the panel's own head; design previews are not critical. */
function headerCriticalPages(catalog) {
  var journeys = typeof ArkSitePages !== 'undefined' ? ArkSitePages.journeys() : [], keys = [];
  journeys.forEach(function (journey) {
    if (journey.id === 'preview') return;
    Object.keys(catalog).forEach(function (key) {
      var entry = catalog[key], row = ArkSitePages.row(key) || {};
      if (entry.journey !== journey.id || entry.hiddenFromNavigation || key === 'account') return;
      if (row.lead || ArkUI.headerPages.indexOf(key) >= 0) keys.push(key);
    });
  });
  return keys;
}

/* One row, never squeezed (tests/browser/public-header.mjs, 1024-1920px). Above the compact
   breakpoint every core link used to stay in the row and shrink to fit: at 1280px "How it works",
   "Mesh Explorer" and "Run DEFXN" wrapped onto two lines and Account read "Acc...". Instead, while
   the row's controls are wider than the header's content box, the next link in
   HEADER_COLLAPSE_ORDER leaves the row (.header-collapsed); every one of them stays one click
   away in the MENU panel, which lists every page. The order is the editorial priority, lowest
   first: supporting reads go before orientation (Overview, Mesh Explorer, the Resolutions
   menu), and the run action goes last. Account is never collapsed: it carries the visitor's
   own state. Widths are MEASURED, not breakpoints, so a longer network name, a signed-in
   display name or a copy change re-fits instead of silently wrapping again. Since 2026-10-19
   the row is the family bar (DefxnKit.mountShell, below): brand, product switcher, these
   links in the bar's nav, then Account, Run DEFXN, the network pill and MENU in its actions.
   The kit's own fold-everything menu (menuAt) is not used: this site already has its
   all-pages MENU, so collapsing link by link into it keeps every other control in the row. */
var HEADER_COLLAPSE_ORDER = ['about', 'explorer', 'resolutions', 'download'];
function headerRowOverflows(header) {
  var box = header.getBoundingClientRect();
  if (!box.width) return false;                      /* not laid out (server render, hidden) */
  var cs = getComputedStyle(header), gap = parseFloat(cs.columnGap) || 0, used = 0, count = 0;
  Array.prototype.forEach.call(header.children, function (child) {
    var ccs = getComputedStyle(child);
    if (ccs.display === 'none' || ccs.position === 'absolute' || ccs.position === 'fixed') return;
    used += child.getBoundingClientRect().width; count += 1;
  });
  var room = box.width - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
  return used + gap * Math.max(0, count - 1) > room + 0.5;
}
function fitHeaderRow(header) {
  function fit() {
    if (!header.isConnected) return;
    var items = HEADER_COLLAPSE_ORDER.map(function (key) { return header.querySelector('[data-header-item="' + key + '"]'); }).filter(Boolean);
    var before = items.map(function (item) { return item.classList.contains('header-collapsed'); }).join();
    items.forEach(function (item) { item.classList.remove('header-collapsed'); });
    for (var i = 0; i < items.length && headerRowOverflows(header); i++) items[i].classList.add('header-collapsed');
    /* a link leaving or rejoining the row moves its neighbours a frame after whatever changed
       the row; anything drawn over them (the editor's selection outline, js/main.js) re-places */
    if (items.map(function (item) { return item.classList.contains('header-collapsed'); }).join() !== before) header.dispatchEvent(new CustomEvent('ark-header-refit', { bubbles: true }));
  }
  if (typeof ResizeObserver === 'undefined') return;
  /* Re-fit whenever anything in the row changes width: the header itself (the viewport), every
     control (a network name, a signed-in name) and the link bar -- whose links are restyled by
     a route change, which no single control's size reveals. Fitting changes the bar's own
     width, so the fit runs in the next frame, outside the observer's delivery: fitting inside
     it would resize an observed element mid-delivery ("ResizeObserver loop completed with
     undelivered notifications"). The fit is idempotent, so the bar's re-measure after it
     settles in one more frame. */
  var queued = 0;
  function queue() { if (!queued) queued = requestAnimationFrame(function () { queued = 0; fit(); }); }
  var observer = new ResizeObserver(queue);
  observer.observe(header);
  ['.dx-bar__brand', '.dx-switch__trigger', '.header-core-links', '.header-account-link', '.dx-bar__actions', '.nav-toggle'].forEach(function (selector) { var target = header.querySelector(selector); if (target) observer.observe(target); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queue);
}

/* The header's own controls, built once. Each keeps the class and data-header-item hook the
   row fit, js/hero-motion.js (MENU open/close, route clicks), the editor's layer tools and the
   browser drivers read. */
/* [copy key, page]: Overview and Mesh Explorer are the bar's nav (in this order: the row fit and
   the editor's layer keys count them); Get FXN Browser leads the cluster; Account is the "you"
   control's panel head. */
var HEADER_LINKS = [
  ['NAV.OVERVIEW', 'about'],
  ['NAV.MESH', 'explorer'],
  ['NAV.ACCOUNT', 'account'],
  ['NAV.RUN', 'download']
];
/* the footer leaves these out (js/hero-motion.js) */
ArkUI.headerPages = HEADER_LINKS.map(function (item) { return item[1]; }).concat(['resolutions']);
var HEADER_ICONS = { about: 'overview', explorer: 'network', stats: 'evidence', account: 'account', download: 'terminal', resolutions: 'cycle', learnings: 'document', 'stats/now': 'evidence', zero: 'overview' };
function headerNode(tag, className, text) {
  var item = document.createElement(tag);
  if (className) item.className = className;
  if (text != null) item.textContent = text;
  return item;
}
function headerLink(item) {
  var key = item[1], link = document.createElement('a');
  link.href = ArkUI.route.href(ArkUI.pageCatalog[key].path);
  link.textContent = ArkCopy.text(item[0]);
  link.dataset.headerItem = key;
  if (ArkUI.actionIcon) ArkUI.actionIcon(link, HEADER_ICONS[key]);
  return link;
}
/* The "you" control: one button, two lines -- who you are, then the network you are on -- and the
   avatar ring takes the trust colour once you are signed in. Its full state is in its name and title,
   because a phone shows the avatar and the network dot only. It keeps .nav-toggle inside .header-menu:
   hero-motion.js, the popover helper and the drivers find the MENU by them. */
function headerYouToggle() {
  var toggle = headerNode('button', 'nav-toggle header-you');
  toggle.type = 'button';
  var avatar = headerNode('span', 'header-you-avatar');
  var icon = ArkUI.icon && ArkUI.icon('account');
  if (icon) avatar.appendChild(icon);
  var words = headerNode('span', 'header-you-words');
  words.appendChild(headerNode('span', 'header-you-name header-account-name', 'Account'));
  var net = headerNode('span', 'header-you-net');
  net.appendChild(headerNode('i', 'header-chain-dot'));
  net.appendChild(headerNode('span', 'header-you-net-name', 'Network'));
  words.appendChild(net);
  var chev = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  chev.setAttribute('viewBox', '0 0 12 12'); chev.setAttribute('class', 'header-you-chev');
  chev.setAttribute('aria-hidden', 'true'); chev.setAttribute('focusable', 'false');
  chev.innerHTML = '<path d="m3 4.5 3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>';
  toggle.appendChild(avatar); toggle.appendChild(words); toggle.appendChild(chev);
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'primary-navigation');
  toggle.setAttribute('aria-label', 'Open your account, network and pages');
  return toggle;
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
/* REDUCTION TEST (the "you" panel, docs/PRODUCT-DESIGN-LAWS.md)
   1 About: you on this site. 2 Dominant action: the head's one button (Sign in / Open account). 3 Know now: who you
   are, your state, your network. 4 Hidden until asked: the network list (its own layer). 5 Repeated elsewhere: the
   pages are the bar's links and the journeys' first pages, derived. 6 Only because the data has it: the network name.
   7 Removable: the journey tags beside the pages. 8 Leaving keeps state: the network choice is remembered. 9 Returning:
   the panel opens on its first layer. 10 If the wallet module fails: the Network row hides, the rest works. */
/* Signed in enough to open /account: a session the CMS accepts, or a key unlocked in this tab. Anything less goes to
   /auth to connect. The one rule: the panel's action and /account's lock both read it (owner, 2026-10-25). */
ArkUI.accountOpen = function () { var s = headerWho().state; return s === 'in' || s === 'unlocked'; };
/* What the panel head says and offers, by state: one sentence and one action each. */
var HEADER_YOU_HEAD = {
  out: ['Sign in to sign records and keep your names.', 'Sign in'],
  saved: ['Your public details are saved here. Select your FXN ID file to sign in.', 'Sign in'],
  unlocked: ['Your key is unlocked in this tab. Finish signing in on your account page.', 'Finish signing in'],
  in: ['You are signed in. Your records and names are on your account page.', 'Open account']
};

ArkUI.register('RHEADER_V1', {
  tag: 'header',
  /* Placement only: the bar's own layout (height, gutters, gap, alignment) is the family
     kit's (.dx-bar in assets/kit/defxn-components.css), dressed for the scene in
     css/navigation.css. */
  base: {
    position: 'absolute',
    top: '0',
    left: '0',
    right: '0',
    zIndex: '20'
  },
  decorate: function (el) {
    /* defxn.com is the DEFXN family home (owner decision 2026-10-19, docs/ux-audit/plan.md):
       it wears the kit bar every product wears -- the DEFXN mark linking home, the product
       switcher with all seven lanes, then this site's own nav and actions -- mounted on this
       resolver's element (options.bar), so the CMS keeps owning the header and the all-pages
       menu (RNAV_V1) stays its child. Classic script (assets/kit/defxn-product.js), so it also
       renders in the SSR pass and on file://. */
    el.classList.add('ark-header');
    var core = document.createElement('nav');
    var run = null;
    HEADER_LINKS.forEach(function (item) {
      if (item[1] === 'download') run = headerLink(item);
      else if (item[1] !== 'account') core.appendChild(headerLink(item));
    });
    /* the bar's one action, soft: the page below keeps its own one solid action */
    run.className = 'header-run-link dx-btn dx-btn--soft dx-btn--sm';
    var toggle = headerYouToggle();
    var menuWrap = document.createElement('span');   /* the MENU's Ark popover root takes this wrapper's place */
    menuWrap.className = 'header-menu';
    menuWrap.appendChild(toggle);
    var kit = typeof window !== 'undefined' && window.DefxnKit;
    var nav = core;
    if (kit && typeof kit.mountShell === 'function') {
      var shell = kit.mountShell({ mode: 'home', bar: el, nav: core, actions: [menuWrap], brandSub: 'FXN CHAIN', home: ArkUI.route.href('/') });
      nav = shell.nav;
      var brand = el.querySelector('.dx-bar__brand');
      if (brand) {
        brand.dataset.sceneLink = 'zero';
        /* the site's name for the bare mark: css/focus.css leaves it out of the fills it gives current and focused header links */
        brand.classList.add('header-mark');
        brand.setAttribute('aria-label', 'DEFXN — home');
        var word = brand.querySelector('.dx-bar__brand-word');
        if (word) word.textContent = ArkCopy.text('NAV.BRAND.NAME');
      }
      /* Get FXN Browser leads the right-hand cluster: a child of the bar just before the
         family (mark + Products), so the row fit counts it like any other part */
      var family = el.querySelector('.dx-bar__family');
      if (family) el.insertBefore(run, family); else el.insertBefore(run, nav);
      /* one panel at a time: opening the product switcher closes the "you" panel */
      var switchTrigger = el.querySelector('.dx-switch__trigger');
      if (switchTrigger) switchTrigger.addEventListener('click', function () { if (el.menuPop) el.menuPop.want(false); });
    } else {
      /* no kit (it failed to load): the same controls, unstyled by the family, all reachable */
      var actions = document.createElement('div');
      actions.className = 'dx-bar__actions';
      actions.appendChild(menuWrap);
      el.appendChild(run);
      el.appendChild(core);
      el.appendChild(actions);
    }
    nav.className += ' header-core-links';
    nav.setAttribute('aria-label', 'Core pages');
    /* paints every surface that shows who is here: the "you" button and, once built, the panel head */
    ArkUI.refreshAccountNav = function () {
      var me = headerWho(), net = el.dataset.network || 'Network';
      el.querySelectorAll('.header-you, .header-you-head').forEach(function (node) { node.dataset.signedIn = me.state === 'in' ? 'true' : 'false'; node.dataset.you = me.state; });
      el.querySelectorAll('.header-account-name').forEach(function (node) { node.textContent = me.name; });
      el.querySelectorAll('.header-account-status').forEach(function (node) { node.textContent = me.status; });
      el.querySelectorAll('.header-you-net-name, .header-you-net-value').forEach(function (node) { node.textContent = net; });
      var head = HEADER_YOU_HEAD[me.state];
      el.querySelectorAll('.header-you-line').forEach(function (node) { node.textContent = head[0]; });
      var goKey = ArkUI.accountOpen() ? 'account' : 'auth', goTo = ArkUI.pageCatalog && ArkUI.pageCatalog[goKey];
      el.querySelectorAll('.header-you-go').forEach(function (node) {
        node.lastChild.textContent = head[1];
        if (goTo) { node.href = ArkUI.route.href(goTo.path); node.dataset.sceneLink = goKey; node.dataset.navRoute = goKey; }
      });
      var t = el.querySelector('.header-you');
      if (t) { t.title = me.name + ' · ' + me.status + ' · ' + net; t.dataset.label = me.name + ', ' + me.status.toLowerCase() + ', on ' + net + '. Open your account, network and pages'; if (!el.classList.contains('nav-open')) t.setAttribute('aria-label', t.dataset.label); }
    };
    if (ArkUI.localIdentity && !ArkUI.accountNavSubscribed) {
      ArkUI.accountNavSubscribed = true;
      ArkUI.localIdentity.subscribe(function () { ArkUI.refreshAccountNav(); });
    }
    ArkUI.refreshAccountNav();
    fitHeaderRow(el);
  },
  onMount: function (el) {
    var menu = el.querySelector('#primary-navigation');
    var catalog = ArkUI.pageCatalog;
    menu.replaceChildren();
    /* The "you" panel, in layers (the rich index of before 2026-10-24, reduced): the first layer is
       you (your state and its one action), your network (a row that opens its own layer), then the
       critical pages. The Network layer has a Back control. Layers swap in place at one size, so
       the panel never jumps; reduced motion swaps with no movement. */
    var layers = {}, stack = ['you'];
    /* the site's own short name (site-pages.js short, then label), not the page's search title */
    function label(key) { var row = typeof ArkSitePages !== 'undefined' && ArkSitePages.row(key) || {}; return key === 'zero' ? 'Home' : row.short || row.label || catalog[key].short || catalog[key].title.split(' — ')[0]; }
    function layer(id, title, back) {
      var panel = headerNode('div', 'nav-layer');
      panel.dataset.navLayer = id;
      panel.setAttribute('role', 'group');
      panel.setAttribute('aria-label', title);
      panel.hidden = id !== 'you';
      if (back) {
        var top = headerNode('div', 'nav-layer-top');
        var button = headerNode('button', 'nav-layer-back', '← Back');
        button.type = 'button';
        button.setAttribute('aria-label', 'Back to your account and pages');
        button.addEventListener('click', goBack);
        top.appendChild(button);
        top.appendChild(headerNode('span', 'nav-layer-depth', title));
        panel.appendChild(top);
      }
      menu.appendChild(panel);
      layers[id] = panel;
      return panel;
    }
    function show(id, focus) {
      Object.keys(layers).forEach(function (key) { layers[key].hidden = key !== id; });
      layers[id].classList.remove('nav-layer-in'); void layers[id].offsetWidth; layers[id].classList.add('nav-layer-in');
      if (focus) focus.focus();
    }
    function push(id) { stack.push(id); show(id, layers[id].querySelector('.nav-layer-back')); }
    function goBack() { if (stack.length < 2) return; var from = stack.pop(); show(stack[stack.length - 1], layers.you.querySelector('[data-nav-target="' + from + '"]')); }
    function reset() { stack = ['you']; Object.keys(layers).forEach(function (key) { layers[key].hidden = key !== 'you'; layers[key].classList.remove('nav-layer-in'); }); }

    /* Layer 1: you, your network, the pages */
    var you = layer('you', 'Your account and pages');
    var head = headerNode('div', 'header-you-head');
    var avatar = headerNode('span', 'header-you-avatar');
    var icon = ArkUI.icon && ArkUI.icon('account');
    if (icon) avatar.appendChild(icon);
    var who = headerNode('div', 'header-you-who');
    who.appendChild(headerNode('strong', 'header-account-name', 'Account'));
    who.appendChild(headerNode('span', 'header-account-status', 'Signed out'));
    head.appendChild(avatar); head.appendChild(who);
    head.appendChild(headerNode('p', 'header-you-line'));
    var go = headerNode('a', 'header-you-go header-account-link');
    go.href = ArkUI.route.href(catalog.account.path);
    go.dataset.sceneLink = 'account'; go.dataset.navRoute = 'account';
    go.appendChild(document.createTextNode('Sign in'));
    head.appendChild(go);
    you.appendChild(head);

    var netRow = headerNode('button', 'header-you-netrow');
    netRow.type = 'button';
    netRow.dataset.navTarget = 'network';
    netRow.appendChild(headerNode('span', 'header-you-netrow-label', 'Network'));
    var netValue = headerNode('span', 'header-you-netrow-value');
    netValue.appendChild(headerNode('i', 'header-chain-dot'));
    netValue.appendChild(headerNode('span', 'header-you-net-value', el.dataset.network || 'Network'));
    netRow.appendChild(netValue);
    netRow.appendChild(headerNode('span', 'header-you-netrow-go', '›'));
    netRow.addEventListener('click', function () { push('network'); });
    you.appendChild(netRow);

    you.appendChild(headerNode('p', 'nav-layer-heading', 'Pages'));
    var pages = headerNode('ul', 'header-you-pages');
    var critical = headerCriticalPages(catalog);
    critical.forEach(function (key) {
      var item = headerNode('li');
      var link = headerNode('a', 'header-you-page nav-route-link');
      link.href = ArkUI.route.href(catalog[key].path);
      link.dataset.navRoute = key; link.dataset.sceneLink = key;
      var mark = headerNode('span', 'header-you-page-mark');
      var glyph = ArkUI.icon && ArkUI.icon(HEADER_ICONS[key] || 'open');
      if (glyph) mark.appendChild(glyph);
      link.appendChild(mark);
      link.appendChild(headerNode('span', 'header-you-page-name', label(key)));
      var journey = (typeof ArkSitePages !== 'undefined' ? ArkSitePages.journeys() : []).filter(function (j) { return j.id === catalog[key].journey; })[0];
      if (journey) link.appendChild(headerNode('span', 'header-you-page-meta', journey.title));
      item.appendChild(link);
      pages.appendChild(item);
    });
    you.appendChild(pages);
    menu.dataset.pageCount = String(critical.length);

    /* Layer 2: the network */
    var network = layer('network', 'Network', true);
    network.appendChild(headerNode('h2', 'nav-layer-title', 'Network'));
    network.appendChild(headerNode('p', 'nav-layer-note', 'Where this site reads and writes. Your choice is kept in this browser.'));
    var list = headerNode('div', 'network-options');
    network.appendChild(list);
    mountHeaderNetwork(list, function (name) { el.dataset.network = name; ArkUI.refreshAccountNav(); }, function () { goBack(); }, function () { netRow.hidden = true; });

    ArkUI.refreshAccountNav();
    menu.navLayers = { reset: reset, back: goBack, current: function () { return stack[stack.length - 1]; } };
    menu.addEventListener('click', function (event) { if (event.target.closest('a') && el.menuPop) el.menuPop.want(false); });
    /* The panel's open/close, Escape, outside press and focus return are Ark's popover, loaded on the first press
       (or a resting pointer / focus on the button); the layer stack above stays ours. header-popover.js and
       hero-motion.js reach it as el.menuPop. */
    var wrap = el.querySelector('.header-menu'), trigger = wrap && wrap.querySelector('.nav-toggle');
    if (!trigger) return;
    menu.hidden = true;
    el.menuPop = lazyHeaderPopover({ wrap: wrap, trigger: trigger, fallback: menu, label: 'Your account, network and pages', align: 'end', id: 'primary-navigation', content: [].slice.call(menu.childNodes), menu: el });
    ['pointerenter', 'focus'].forEach(function (type) { trigger.addEventListener(type, el.menuPop.warm); });
  },
  emerge: { delay: 0, dur: 400 }
});

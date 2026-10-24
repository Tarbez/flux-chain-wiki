/* =====================================================================
   RESOLVER  RHEADER_V1  —  the top bar
   ---------------------------------------------------------------------
   Spans the full width of the screen (not the centred poster): logo at
   one end, navigation at the other. At compact widths the links move
   into an index panel beneath the header.

   Its padding follows the smaller screen dimension, with a 20px floor.
   ===================================================================== */
/* The Products megamenu: every resolution, one click from any page, in three weights.
   Primary: the resolutions people can use today, drawn large with the products that already
   do the work. Complementary: every other resolver, grouped, as compact names. Reference:
   one peek line that describes whichever name is under the pointer, plus the page links.
   The trigger sits first in the core links; the panel hangs under the header. */
/* Primary picks are editorial: the outcomes people can already reach with released products.
   Their product names come from js/content/resolution-products.js (each inner page's "Ready now"). */
var FEATURED_RESOLUTIONS = [
  { key: 'WEBSITE', art: 'site' },
  { key: 'DEPLOYMENTS', art: 'bundle' },
  { key: 'NETWORK', art: 'mesh' }
];
var RESOLUTION_ART = {
  site: '<rect x="5" y="6" width="54" height="36" rx="4"/><path d="M5 14h54"/><rect class="art-hot" x="18" y="8.5" width="28" height="3" rx="1.5"/><path d="M12 21h20M12 27h26M12 33h16"/><circle class="art-hot art-pop" cx="47" cy="31" r="6"/><path class="art-hot art-pop" d="m44.2 31 2 2 3.6-3.8"/>',
  bundle: '<path class="art-hot art-lift" d="m32 5 20 9-20 9-20-9 20-9Z"/><path d="m12 22 20 9 20-9"/><path d="m12 30 20 9 20-9"/><path class="art-faint" d="M32 23v20"/>',
  mesh: '<path d="M32 24 12 10M32 24l20-14M32 24 12 38M32 24l20 14M12 10h40M12 38h40"/><circle class="art-hot" cx="32" cy="24" r="5"/><circle class="art-node" cx="12" cy="10" r="3.2"/><circle class="art-node" cx="52" cy="10" r="3.2"/><circle class="art-node" cx="12" cy="38" r="3.2"/><circle class="art-node" cx="52" cy="38" r="3.2"/>'
};
var RESOLUTION_GROUP_ICONS = { BUILD: 'layers', VALUE: 'cycle', PEOPLE: 'account', INTELLIGENCE: 'model', OPERATIONS: 'network' };

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
var HEADER_WALLET_MODULE = 'js/ark/dense-wire-wallet.mjs?v=20261024-devnet1';
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
function shortNetworkLabel(url, knownNetworks) {
  for (var i = 0; i < knownNetworks.length; i++) {
    if (knownNetworks[i].url === url) return knownNetworks[i].label;
  }
  return 'Custom';
}
/** Builds the standalone chain/network pill that sits next to the MENU
 *  button, own trigger + own popover -- never nested inside
 *  `#primary-navigation`, so it is reachable and visible at every
 *  header width, not just when the hamburger menu happens to be open.
 *  The trigger's own label always shows the CURRENT network (e.g.
 *  "Public devnet"/"Local devnet"), kept in sync with every other mounted
 *  network control on the page (the account page's Wallet tab included)
 *  via `mountNetworkSelect`'s own cross-select `defxn-network-changed`
 *  event -- switching here updates there and back, live, no reload. */
function buildHeaderChainPopover() {
  var wrap = document.createElement('div');
  wrap.className = 'header-chain';

  var trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.id = 'header-chain-trigger';
  trigger.className = 'header-chain-trigger';
  trigger.setAttribute('aria-haspopup', 'true');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', 'header-chain-popover');
  var dot = document.createElement('span');
  dot.className = 'header-chain-dot';
  dot.setAttribute('aria-hidden', 'true');
  var triggerLabel = document.createElement('span');
  triggerLabel.className = 'header-chain-trigger-label';
  /* The name also goes on the trigger itself: below 360px the pill shows only its dot
     (css/navigation.css), and the accessible name and tooltip must still say which network. */
  function showNetwork(label) {
    triggerLabel.textContent = label;
    trigger.setAttribute('aria-label', 'Network: ' + label);
    trigger.title = 'Network: ' + label;
  }
  triggerLabel.textContent = 'Network';
  trigger.appendChild(dot);
  trigger.appendChild(triggerLabel);
  wrap.appendChild(trigger);

  var popover = document.createElement('div');
  popover.id = 'header-chain-popover';
  popover.className = 'header-chain-popover';
  popover.hidden = true;
  popover.setAttribute('role', 'region');
  popover.setAttribute('aria-labelledby', 'header-chain-trigger');
  var innerLabel = document.createElement('div');
  innerLabel.className = 'header-network-label';
  innerLabel.textContent = 'Network';
  var list = document.createElement('div');
  list.className = 'network-options';
  popover.appendChild(innerLabel);
  popover.appendChild(list);
  wrap.appendChild(popover);

  var pop = lazyHeaderPopover({ wrap: wrap, trigger: trigger, fallback: popover, label: 'Network', align: 'end', id: 'header-chain-popover', content: [innerLabel, list],
    done: function (made) { wrap = made.root; trigger = made.trigger; } });

  loadHeaderWalletModule().then(function (dw) {
    showNetwork(shortNetworkLabel(dw.resolveWireUrl(), dw.KNOWN_NETWORKS));
    dw.mountNetworkSelect(list, function () {
      /* Convenience only: remembering the choice is enough for any page
         that reads resolveWireUrl() fresh (account.js's loadWallet
         already does) -- nothing in the header itself holds a live wire
         connection to reset. Closing is this surface's own UX choice:
         the popover's one job is picking a network, so a real choice
         closes it, same as any other menu on this site. */
      pop.want(false);
    });
    if (typeof window !== 'undefined') {
      window.addEventListener('defxn-network-changed', function (event) {
        var url = event.detail && event.detail.url;
        if (url) showNetwork(shortNetworkLabel(url, dw.KNOWN_NETWORKS));
      });
    }
  }).catch(function () {
    wrap.hidden = true;
  });
  return wrap;
}

function buildProducts(header, core) {
  function make(tag, className, text) {
    var item = document.createElement(tag);
    if (className) item.className = className;
    if (text) item.textContent = text;
    return item;
  }
  function routeTo(link, target) {
    link.href = ArkUI.route.href(ArkUI.pageCatalog[target].path);
    link.dataset.sceneLink = target;
    return link;
  }
  var shortName = ArkResolutions.shortName;
  var wrap = make('div', 'header-products');
  wrap.dataset.headerItem = 'resolutions';
  var trigger = make('button', 'header-products-toggle');
  trigger.type = 'button';
  trigger.id = 'products-trigger';
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', 'products-mega');
  trigger.appendChild(make('span', 'header-products-label', ArkCopy.text('NAV.PRODUCTS')));
  var chevron = make('span', 'header-products-chevron');
  chevron.setAttribute('aria-hidden', 'true');
  trigger.appendChild(chevron);
  if (ArkUI.actionIcon) ArkUI.actionIcon(trigger, 'layers');
  wrap.appendChild(trigger);
  core.insertBefore(wrap, core.firstChild);

  var mega = make('div', 'products-mega');
  mega.id = 'products-mega';
  mega.hidden = true;
  mega.setAttribute('role', 'region');
  mega.setAttribute('aria-labelledby', 'products-trigger');
  var body = make('div', 'products-mega-body');

  /* Primary */
  var primary = make('section', 'products-mega-primary');
  primary.appendChild(make('h3', 'products-mega-heading', ArkCopy.text('RESOLUTIONS.MEGA.READY')));
  var featuredKeys = {}, shownProducts = {};
  FEATURED_RESOLUTIONS.forEach(function (feature) {
    var entry = ArkResolutions.find(feature.key.toLowerCase());
    featuredKeys[feature.key] = true;
    var card = routeTo(make('a', 'products-mega-feature'), 'resolutions/' + entry.slug);
    card.dataset.resolution = entry.slug;
    var art = make('span', 'products-mega-art');
    art.setAttribute('aria-hidden', 'true');
    art.innerHTML = '<svg viewBox="0 0 64 48" focusable="false">' + RESOLUTION_ART[feature.art] + '</svg>';
    card.appendChild(art);
    var words = make('span', 'products-mega-feature-words');
    words.appendChild(make('strong', '', shortName(entry.title)));
    words.appendChild(make('span', 'products-mega-feature-line', entry.text));
    /* Up to three released products per card, none repeated from the card above. */
    var ready = make('span', 'products-mega-ready');
    var shelf = typeof ArkResolutionProducts !== 'undefined' && ArkResolutionProducts.forResolution(feature.key);
    (shelf ? shelf.ready : []).filter(function (product) {
      return product.status === 'ready' && !shownProducts[product.key];
    }).slice(0, 3).forEach(function (product) {
      shownProducts[product.key] = true;
      ready.appendChild(make('span', '', product.name));
    });
    if (ready.childNodes.length) words.appendChild(ready);
    card.appendChild(words);
    primary.appendChild(card);
  });
  body.appendChild(primary);

  /* Complementary */
  var more = make('section', 'products-mega-more');
  var moreHead = make('div', 'products-mega-more-head');
  moreHead.appendChild(make('h3', 'products-mega-heading', ArkCopy.text('RESOLUTIONS.MEGA.MORE')));
  var rows = make('div', 'products-mega-rows');
  var moreCount = 0;
  ArkResolutions.list().forEach(function (group) {
    var items = group.items.filter(function (entry) { return !featuredKeys[entry.key]; });
    if (!items.length) return;
    var row = make('div', 'products-mega-row');
    row.dataset.group = group.key;
    var label = make('span', 'products-mega-row-label');
    var icon = ArkUI.icon && ArkUI.icon(RESOLUTION_GROUP_ICONS[group.key]);
    if (icon) label.appendChild(icon);
    label.appendChild(make('span', '', group.title));
    row.appendChild(label);
    var list = make('ul', 'products-mega-chips');
    items.forEach(function (entry) {
      var item = make('li');
      var link = routeTo(make('a', 'products-mega-link', shortName(entry.title)), 'resolutions/' + entry.slug);
      link.dataset.resolution = entry.slug;
      link.dataset.line = entry.text;
      item.appendChild(link);
      list.appendChild(item);
      moreCount += 1;
    });
    row.appendChild(list);
    rows.appendChild(row);
  });
  moreHead.appendChild(make('span', 'products-mega-count', String(moreCount)));
  more.appendChild(moreHead);
  more.appendChild(rows);

  /* Reference: the footer's peek line swaps in place for whichever resolver is pointed at. */
  var peek = make('p', 'products-mega-peek');
  peek.setAttribute('aria-live', 'polite');
  var peekName = make('strong');
  var peekLine = make('span', '', ArkCopy.text('RESOLUTIONS.MEGA.TEXT'));
  peek.appendChild(peekName);
  peek.appendChild(peekLine);
  function showPeek(link) {
    rows.querySelectorAll('.is-peeked').forEach(function (row) { row.classList.remove('is-peeked'); });
    if (!link) {
      peek.classList.remove('is-active');
      peekName.textContent = '';
      peekLine.textContent = ArkCopy.text('RESOLUTIONS.MEGA.TEXT');
      return;
    }
    link.closest('.products-mega-row').classList.add('is-peeked');
    peek.classList.add('is-active');
    peekName.textContent = link.textContent;
    peekLine.textContent = link.dataset.line;
  }
  rows.addEventListener('pointerover', function (event) { var link = event.target.closest('.products-mega-link'); if (link) showPeek(link); });
  rows.addEventListener('pointerleave', function () { showPeek(null); });
  rows.addEventListener('focusin', function (event) { var link = event.target.closest('.products-mega-link'); if (link) showPeek(link); });
  rows.addEventListener('focusout', function (event) { if (!rows.contains(event.relatedTarget)) showPeek(null); });
  body.appendChild(more);
  mega.appendChild(body);

  var foot = make('div', 'products-mega-foot');
  foot.appendChild(peek);
  var how = routeTo(make('a', 'products-mega-how', ArkCopy.text('RESOLUTIONS.MEGA.HOW') + ' →'), 'resolver');
  foot.appendChild(how);
  var all = routeTo(make('a', 'products-mega-all', ArkCopy.text('RESOLUTIONS.MEGA.ALL') + ' →'), 'resolutions');
  foot.appendChild(all);
  mega.appendChild(foot);
  header.appendChild(mega);

  /* the header's own: hover-intent (closes 220 ms after leaving), and closing after a link */
  var closeTimer = 0;
  var hover = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : { matches: false };
  var pop = lazyHeaderPopover({ wrap: wrap, trigger: trigger, fallback: mega, label: ArkCopy.text('NAV.PRODUCTS'), id: 'products-mega', content: [body, foot],
    done: function (made) { watch(made.root); } });
  function watch(zone) {
    ['pointerenter', 'pointerleave'].forEach(function (type) {
      zone.addEventListener(type, function (event) {
        if (!hover.matches || event.pointerType !== 'mouse') return;
        window.clearTimeout(closeTimer);
        if (type === 'pointerenter') pop.want(true, true); else closeTimer = window.setTimeout(function () { pop.want(false); }, 220);
      });
    });
  }
  watch(wrap);
  header.addEventListener('click', function (event) { if (event.target.closest('.products-mega a')) { window.clearTimeout(closeTimer); pop.want(false); } });
  header.addEventListener('click', function (event) { if (event.target.closest('.nav-toggle')) pop.want(false); });
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
var HEADER_COLLAPSE_ORDER = ['stats', 'deployment', 'about', 'explorer', 'resolutions', 'download'];
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
/* [copy key, page]: the first four are the bar's nav (in this order: the row fit and the
   editor's layer keys count them), Account and Run DEFXN are its actions. */
var HEADER_LINKS = [
  ['NAV.OVERVIEW', 'about'],
  ['NAV.HOW', 'deployment'],
  ['NAV.MESH', 'explorer'],
  ['NAV.STATS', 'stats'],
  ['NAV.ACCOUNT', 'account'],
  ['NAV.RUN', 'download']
];
/* the footer leaves these out (js/hero-motion.js) */
ArkUI.headerPages = HEADER_LINKS.map(function (item) { return item[1]; }).concat(['resolutions']);
var HEADER_ICONS = { about: 'overview', deployment: 'layers', explorer: 'network', stats: 'evidence', account: 'account', download: 'terminal' };
function headerLink(item) {
  var key = item[1], link = document.createElement('a');
  link.href = ArkUI.route.href(ArkUI.pageCatalog[key].path);
  link.textContent = ArkCopy.text(item[0]);
  link.dataset.headerItem = key;
  if (ArkUI.actionIcon) ArkUI.actionIcon(link, HEADER_ICONS[key]);
  return link;
}
function headerAccountLink(item) {
  var link = headerLink(item);
  link.className = 'header-account-link dx-btn dx-btn--ghost dx-btn--sm';
  /* the label is rebuilt as name + state; the icon actionIcon added stays first */
  Array.prototype.slice.call(link.childNodes).forEach(function (node) { if (node.nodeType === 3) link.removeChild(node); });
  var accountName = document.createElement('span');
  accountName.className = 'header-account-name';
  accountName.textContent = 'Account';
  var accountStatus = document.createElement('span');
  accountStatus.className = 'header-account-status';
  accountStatus.textContent = 'Signed out';
  var accountLabel = document.createElement('span');
  accountLabel.className = 'header-account-label';
  accountLabel.appendChild(accountName); accountLabel.appendChild(accountStatus);
  link.appendChild(accountLabel);
  return link;
}
function headerMenuToggle() {
  var toggle = document.createElement('button');
  toggle.className = 'nav-toggle';
  toggle.type = 'button';
  var toggleLabel = document.createElement('span');
  toggleLabel.className = 'nav-toggle-label';
  toggleLabel.textContent = 'Menu';
  toggle.appendChild(toggleLabel);
  var dots = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  dots.setAttribute('viewBox', '0 0 24 24');
  dots.setAttribute('width', '20');
  dots.setAttribute('height', '20');
  dots.setAttribute('aria-hidden', 'true');
  dots.setAttribute('focusable', 'false');
  [5, 12, 19].forEach(function (x) {
    var dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', String(x));
    dot.setAttribute('cy', '12');
    dot.setAttribute('r', '1.7');
    dot.setAttribute('fill', 'currentColor');
    dots.appendChild(dot);
  });
  toggle.appendChild(dots);
  toggle.setAttribute('aria-label', 'Open all pages');
  toggle.setAttribute('title', 'All pages');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'primary-navigation');
  return toggle;
}

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
    /* the links' container: the kit moves them into its own nav, which then takes this class
       (the row fit, the editor's layer tools and the browser drivers find the links by it) */
    var core = document.createElement('nav');
    var account = null, run = null;
    HEADER_LINKS.forEach(function (item) {
      if (item[1] === 'account') account = headerAccountLink(item);
      else if (item[1] === 'download') run = headerLink(item);
      else core.appendChild(headerLink(item));
    });
    /* the bar's action, soft: the page below keeps its own one solid action */
    run.className = 'header-run-link dx-btn dx-btn--soft dx-btn--sm';
    var chain = buildHeaderChainPopover();
    var toggle = headerMenuToggle();
    var menuWrap = document.createElement('span');   /* the MENU's Ark popover root takes this wrapper's place */
    menuWrap.className = 'header-menu';
    menuWrap.appendChild(toggle);
    var kit = typeof window !== 'undefined' && window.DefxnKit;
    var nav = core;
    if (kit && typeof kit.mountShell === 'function') {
      var shell = kit.mountShell({ mode: 'home', bar: el, nav: core, actions: [account, run, chain, menuWrap], brandSub: 'FXN CHAIN', home: ArkUI.route.href('/') });
      nav = shell.nav;
      var brand = el.querySelector('.dx-bar__brand');
      if (brand) {
        brand.dataset.sceneLink = 'zero';
        brand.setAttribute('aria-label', 'DEFXN — home');
        var word = brand.querySelector('.dx-bar__brand-word');
        if (word) word.textContent = ArkCopy.text('NAV.BRAND.NAME');
      }
      /* one panel at a time: opening the product switcher closes the all-pages MENU (the
         MENU, the network popover and the Resolutions menu already close on any click
         outside their own controls) */
      var switchTrigger = el.querySelector('.dx-switch__trigger');
      if (switchTrigger) switchTrigger.addEventListener('click', function () { if (el.menuPop) el.menuPop.want(false); });
    } else {
      /* no kit (it failed to load): the same controls, unstyled by the family, all reachable */
      var actions = document.createElement('div');
      actions.className = 'dx-bar__actions';
      [account, run, chain, menuWrap].forEach(function (node) { actions.appendChild(node); });
      el.appendChild(core);
      el.appendChild(actions);
    }
    nav.className += ' header-core-links';
    nav.setAttribute('aria-label', 'Core pages');
    function paintAccount(link) {
      if (!link) return;
      var who = ArkUI.localIdentity && ArkUI.localIdentity.current();
      var unlocked = ArkUI.accountSession && ArkUI.accountSession.isUnlocked();
      var authenticated = who && ArkUI.cmsSession && ArkUI.cmsSession.isAuthenticated(who.publicKeyB64);
      link.dataset.signedIn = authenticated ? 'true' : 'false';
      var accountName = who ? who.displayName || 'Your account' : 'Account';
      var accountStatus = who ? (authenticated ? 'Signed in' : (unlocked ? 'Key unlocked' : 'Details saved')) : 'Signed out';
      link.querySelector('.header-account-name').textContent = accountName;
      link.querySelector('.header-account-status').textContent = accountStatus;
      // Phones show this link icon-only (css/navigation.css), so the tooltip carries the hidden label.
      link.title = accountName + ' · ' + accountStatus;
      link.setAttribute('aria-label', who ? (who.displayName || 'Your account') + (authenticated ? ', signed in. Open account' : ', public identity details saved, not signed in. Select your Auth Kit to sign in') : 'Account, signed out. Sign in');
    }
    ArkUI.refreshAccountNav = function () {
      document.querySelectorAll('.header-account-link').forEach(paintAccount);
    };
    if (ArkUI.localIdentity && !ArkUI.accountNavSubscribed) {
      ArkUI.accountNavSubscribed = true;
      ArkUI.localIdentity.subscribe(function () { ArkUI.refreshAccountNav(); });
    }
    // Paint the account link before the header has been attached to the document.
    paintAccount(account);
    if (ArkUI.pageCatalog.resolutions && typeof ArkResolutions !== 'undefined') buildProducts(el, nav);
    fitHeaderRow(el);
  },
  onMount: function (el) {
    var menu = el.querySelector('#primary-navigation');
    var catalog = ArkUI.pageCatalog;
    var existing = Object.create(null);
    Array.prototype.forEach.call(menu.querySelectorAll('a'), function (link) {
      existing[link.getAttribute('href')] = link;
    });
    // Rebuild the menu from these detached links. Legacy hash links must not
    // remain as visible siblings behind the new navigation layers.
    menu.replaceChildren();
    /* Every group is DERIVED from each page's journey (js/content/site-pages.js, copied onto its
       catalog entry). Until 2026-10-19 this built four hand-written arrays plus a catch-all that
       pushed every unlisted page into "Evaluate -- live local mesh data, evidence", so the design
       mocks /treasury and /deposits and the design-system /palette were filed as live evidence
       (docs/ux-audit/pages.md P7; regression: tests/navigation-index.cjs). A page with no journey
       is in no group. A page whose path sits under another listed page's path (/lifecycle/intent
       under /lifecycle) is that page's child: three or more children get their own layer, fewer
       are listed right after their parent. */
    var journeys = typeof ArkSitePages !== 'undefined' ? ArkSitePages.journeys() : [];
    var listed = Object.keys(catalog).filter(function (key) { return catalog[key].journey && !catalog[key].hiddenFromNavigation; });
    var byPath = Object.create(null);
    listed.forEach(function (key) { byPath[catalog[key].path] = key; });
    function parentOf(key) {
      var path = catalog[key].path;
      if (path === '/') return null;
      var parent = path.slice(0, path.lastIndexOf('/'));
      return parent && byPath[parent] && catalog[byPath[parent]].journey === catalog[key].journey ? byPath[parent] : null;
    }
    var children = Object.create(null);
    listed.forEach(function (key) { var parent = parentOf(key); if (parent) (children[parent] = children[parent] || []).push(key); });
    menu.dataset.pageCount = String(listed.length);
    function label(key) {
      if (key === 'zero') return 'Home';
      if (key.indexOf('concept/') === 0) return ArkCopy.text(key.split('/')[1].toUpperCase() + '.TITLE');
      if (key.indexOf('article/') === 0) return LearningContent.find(key.split('/')[1]).title;
      return catalog[key].short || catalog[key].title.split(' — ')[0];
    }
    function node(tag, className, text) {
      var item = document.createElement(tag);
      item.className = className;
      if (text) item.textContent = text;
      return item;
    }
    var panels = Object.create(null);
    var stack = ['index'];
    var timer = 0;
    var moving = false;
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    function layer(id, title, note, parent) {
      var panel = node('div', 'nav-layer');
      panel.dataset.navLayer = id;
      panel.setAttribute('role', 'group');
      panel.setAttribute('aria-label', title);
      panel.hidden = id !== 'index';
      var top = node('div', 'nav-layer-top');
      if (parent) {
        var back = node('button', 'nav-layer-back', '← Back');
        back.type = 'button';
        back.setAttribute('aria-label', 'Back to ' + parent);
        top.appendChild(back);
        back.addEventListener('click', function () { goBack(); });
      }
      top.appendChild(node('span', 'nav-layer-depth', id === 'index' ? '01 / INDEX' : (parent === 'the index' ? '02 / ' : '03 / ') + title.toUpperCase()));
      panel.appendChild(top);
      panel.appendChild(node('h2', 'nav-layer-title', title));
      panel.appendChild(node('p', 'nav-layer-note', note));
      var body = node('div', 'nav-layer-body');
      panel.appendChild(body);
      menu.appendChild(panel);
      panels[id] = { panel: panel, body: body, back: back || null };
      return body;
    }
    function move(to, direction, focusTarget) {
      if (moving || stack[stack.length - 1] === to) return false;
      var fromPanel = panels[stack[stack.length - 1]].panel;
      var toPanel = panels[to].panel;
      moving = true;
      if (reducedMotion.matches) {
        toPanel.hidden = false;
        toPanel.scrollTop = 0;
        if (focusTarget) focusTarget.focus();
        fromPanel.hidden = true;
        moving = false;
        return true;
      }
      fromPanel.classList.add(direction === 'forward' ? 'nav-layer-out-forward' : 'nav-layer-out-back');
      timer = window.setTimeout(function () {
        toPanel.hidden = false;
        toPanel.scrollTop = 0;
        if (focusTarget) focusTarget.focus();
        fromPanel.hidden = true;
        fromPanel.classList.remove('nav-layer-out-forward', 'nav-layer-out-back');
        toPanel.classList.add(direction === 'forward' ? 'nav-layer-in-forward' : 'nav-layer-in-back');
        timer = window.setTimeout(function () {
          toPanel.classList.remove('nav-layer-in-forward', 'nav-layer-in-back');
          moving = false;
        }, 170);
      }, 150);
      return true;
    }
    function push(id) {
      var destination = panels[id];
      if (!destination || !move(id, 'forward', destination.back || destination.panel.querySelector('a'))) return;
      stack.push(id);
    }
    function goBack() {
      if (stack.length < 2) return;
      var previous = stack[stack.length - 2];
      var focusTarget = panels[previous].panel.querySelector('[data-nav-target="' + stack[stack.length - 1] + '"]') || panels[previous].back;
      if (move(previous, 'back', focusTarget)) stack.pop();
    }
    function reset() {
      window.clearTimeout(timer);
      moving = false;
      stack = ['index'];
      Object.keys(panels).forEach(function (id) {
        panels[id].panel.hidden = id !== 'index';
        panels[id].panel.classList.remove('nav-layer-out-forward', 'nav-layer-out-back', 'nav-layer-in-forward', 'nav-layer-in-back');
      });
    }
    function routeLink(key, stage) {
      var href = ArkUI.route.href(catalog[key].path);
      var link = existing[href] || existing['#' + catalog[key].path];
      if (!link) {
        link = node('a', 'ark-link');
        link.href = href;
        link.appendChild(node('span', 'ark-link-label', label(key)));
      }
      link.href = href;
      link.classList.add('nav-route-link');
      link.dataset.navRoute = key;
      if(ArkUI.actionIcon)ArkUI.actionIcon(link,key.indexOf('lifecycle')===0?'cycle':key.indexOf('article/')===0?'document':key.indexOf('concept/')===0?'layers':({explorer:'network',account:'account',download:'terminal',deploy:'terminal',about:'overview',learnings:'document',dao:'authority'}[key]||'open'));
      if (stage) link.classList.add('nav-lifecycle-stage');
      return link;
    }
    function choice(title, description, count, id) {
      var button = node('button', 'nav-layer-choice');
      button.type = 'button';
      button.dataset.navTarget = id;
      button.appendChild(node('span', 'nav-choice-title', title));
      button.appendChild(node('span', 'nav-choice-description', description));
      button.appendChild(node('span', 'nav-choice-count', String(count).padStart(2, '0') + ' PAGES'));
      button.addEventListener('click', function () { push(id); });
      return button;
    }
    var index = layer('index', 'Explore DEFXN', 'Choose a path.');
    journeys.forEach(function (journey) {
      var top = listed.filter(function (key) { return catalog[key].journey === journey.id && !parentOf(key); });
      if (!top.length) return;
      var count = listed.filter(function (key) { return catalog[key].journey === journey.id; }).length;
      index.appendChild(choice(journey.title, journey.note, count, journey.id));
      var body = layer(journey.id, journey.title, journey.note, 'the index');
      top.forEach(function (key) {
        var kids = children[key] || [];
        if (kids.length >= 3) {
          var id = 'sub-' + key.replace(/[^a-z0-9]+/gi, '-');
          var row = ArkSitePages.row(key) || {};
          body.appendChild(choice(label(key), row.note || ('Everything under ' + label(key)), kids.length + 1, id));
          var sub = layer(id, label(key), row.note || '', journey.id);
          sub.appendChild(routeLink(key, false));
          kids.forEach(function (child) { sub.appendChild(routeLink(child, child.indexOf('lifecycle/') === 0)); });
          return;
        }
        body.appendChild(routeLink(key, false));
        kids.forEach(function (child) { body.appendChild(routeLink(child, child.indexOf('lifecycle/') === 0)); });
      });
    });
    menu.navLayers = { reset: reset, back: goBack, current: function () { return stack[stack.length - 1]; } };
    /* The MENU's open/close, Escape, outside press and focus return are Ark's popover, loaded on the first press
       (or a resting pointer / focus on the button) like the pill and the Resolutions menu; the layer stack above stays
       ours. header-popover.js and hero-motion.js reach it as el.menuPop. */
    var wrap = el.querySelector('.header-menu'), trigger = wrap && wrap.querySelector('.nav-toggle');
    if (!trigger) return;
    menu.hidden = true;
    el.menuPop = lazyHeaderPopover({ wrap: wrap, trigger: trigger, fallback: menu, label: 'Menu', align: 'end', id: 'primary-navigation', content: [].slice.call(menu.childNodes), menu: el });
    ['pointerenter', 'focus'].forEach(function (type) { trigger.addEventListener(type, el.menuPop.warm); });
  },
  emerge: { delay: 0, dur: 400 }
});

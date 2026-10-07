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
var FEATURED_RESOLUTIONS = [
  /* `ready` mirrors the released products on each inner page's "Ready now" list. */
  { key: 'WEBSITE', art: 'site', ready: ['Code manager', '.fxn names', 'Site gateway'] },
  { key: 'DEPLOYMENTS', art: 'bundle', ready: ['Mesh packages', 'Resolvers', 'Mesh monitor'] },
  { key: 'NETWORK', art: 'mesh', ready: ['Named networks', 'Mesh Explorer'] }
];
var RESOLUTION_ART = {
  site: '<rect x="5" y="6" width="54" height="36" rx="4"/><path d="M5 14h54"/><rect class="art-hot" x="18" y="8.5" width="28" height="3" rx="1.5"/><path d="M12 21h20M12 27h26M12 33h16"/><circle class="art-hot art-pop" cx="47" cy="31" r="6"/><path class="art-hot art-pop" d="m44.2 31 2 2 3.6-3.8"/>',
  bundle: '<path class="art-hot art-lift" d="m32 5 20 9-20 9-20-9 20-9Z"/><path d="m12 22 20 9 20-9"/><path d="m12 30 20 9 20-9"/><path class="art-faint" d="M32 23v20"/>',
  mesh: '<path d="M32 24 12 10M32 24l20-14M32 24 12 38M32 24l20 14M12 10h40M12 38h40"/><circle class="art-hot" cx="32" cy="24" r="5"/><circle class="art-node" cx="12" cy="10" r="3.2"/><circle class="art-node" cx="52" cy="10" r="3.2"/><circle class="art-node" cx="12" cy="38" r="3.2"/><circle class="art-node" cx="52" cy="38" r="3.2"/>'
};
var RESOLUTION_GROUP_ICONS = { BUILD: 'layers', VALUE: 'cycle', PEOPLE: 'account', INTELLIGENCE: 'model', OPERATIONS: 'network' };

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
  var featuredKeys = {};
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
    var ready = make('span', 'products-mega-ready');
    feature.ready.forEach(function (name) { ready.appendChild(make('span', '', name)); });
    words.appendChild(ready);
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
  var how = routeTo(make('a', 'products-mega-how', ArkCopy.text('RESOLUTIONS.MEGA.HOW') + ' ↗'), 'resolver');
  foot.appendChild(how);
  var all = routeTo(make('a', 'products-mega-all', ArkCopy.text('RESOLUTIONS.MEGA.ALL') + ' →'), 'resolutions');
  foot.appendChild(all);
  mega.appendChild(foot);
  header.appendChild(mega);

  var closeTimer = 0, openedAt = 0;
  var hover = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : { matches: false };
  function setOpen(open, focusTrigger) {
    window.clearTimeout(closeTimer);
    if (mega.hidden === !open) return;
    mega.hidden = !open;
    if (open) openedAt = Date.now();
    trigger.setAttribute('aria-expanded', String(open));
    header.classList.toggle('products-open', open);
    if (!open) showPeek(null);
    if (!open && focusTrigger) trigger.focus();
  }
  trigger.addEventListener('click', function () {
    /* A hover that just opened the menu must not be undone by the click that follows it. */
    if (!mega.hidden && Date.now() - openedAt < 400) return;
    setOpen(mega.hidden, false);
  });
  [wrap, mega].forEach(function (zone) {
    zone.addEventListener('pointerenter', function (event) { if (hover.matches && event.pointerType === 'mouse') setOpen(true); });
    zone.addEventListener('pointerleave', function (event) {
      if (!hover.matches || event.pointerType !== 'mouse') return;
      window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(function () { setOpen(false); }, 220);
    });
  });
  header.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !mega.hidden) { event.stopPropagation(); setOpen(false, true); }
  });
  header.addEventListener('focusout', function (event) {
    if (!mega.hidden && !wrap.contains(event.relatedTarget) && !mega.contains(event.relatedTarget)) setOpen(false);
  });
  document.addEventListener('click', function (event) {
    if (!mega.hidden && !wrap.contains(event.target) && !mega.contains(event.target)) setOpen(false);
  });
  mega.addEventListener('click', function (event) {
    var link = event.target.closest('a');
    if (!link) return;
    setOpen(false);
  });
  var toggle = header.querySelector('.nav-toggle');
  if (toggle) toggle.addEventListener('click', function () { setOpen(false); });
}

ArkUI.register('RHEADER_V1', {
  tag: 'header',
  base: {
    position: 'absolute',
    top: '0',
    left: '0',
    right: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px ' + Tokens.u(3),
    padding: 'max(18px, 2.35cqmin) max(20px, 2.8cqmin)',
    zIndex: '4'
  },
  decorate: function (el) {
    el.classList.add('ark-header');
    var identity = document.createElement('a');
    identity.className = 'ark-studio-identity';
    identity.href = ArkUI.route.href('/');
    identity.dataset.sceneLink = 'zero';
    identity.setAttribute('aria-label', 'DEFXN — home');
    var lockup = document.createElement('span');
    lockup.className = 'ark-brand-lockup';
    var wordmark = document.createElement('span');
    wordmark.className = 'ark-brand-wordmark';
    wordmark.textContent = ArkCopy.text('NAV.BRAND.NAME');
    var descriptor = document.createElement('span');
    descriptor.className = 'ark-brand-descriptor';
    descriptor.textContent = 'AGREEMENT FABRIC';
    descriptor.setAttribute('aria-hidden', 'true');
    lockup.appendChild(wordmark);
    lockup.appendChild(descriptor);
    identity.appendChild(lockup);
    el.appendChild(identity);

    var core = document.createElement('nav');
    core.className = 'header-core-links';
    core.setAttribute('aria-label', 'Core pages');
    [
      ['NAV.OVERVIEW', 'about'],
      ['NAV.HOW', 'deployment'],
      ['NAV.MESH', 'explorer'],
      ['NAV.STATS', 'stats'],
      ['NAV.ACCOUNT', 'account'],
      ['NAV.RUN', 'download']
    ].forEach(function (item) {
      var link = document.createElement('a');
      link.href = ArkUI.route.href(ArkUI.pageCatalog[item[1]].path);
      link.textContent = ArkCopy.text(item[0]);
      if (item[1] === 'account') {
        link.classList.add('header-account-link');
        link.textContent = '';
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
      }
      if (item[1] === 'download') link.classList.add('header-run-link');
      if(ArkUI.actionIcon)ArkUI.actionIcon(link,{about:'overview',deployment:'layers',explorer:'network',stats:'evidence',account:'account',download:'terminal'}[item[1]]);core.appendChild(link);
    });
    el.appendChild(core);
    function paintAccount(link) {
      if (!link) return;
      var who = ArkUI.localIdentity && ArkUI.localIdentity.current();
      var unlocked = ArkUI.accountSession && ArkUI.accountSession.isUnlocked();
      var authenticated = who && ArkUI.cmsSession && ArkUI.cmsSession.isAuthenticated(who.publicKeyB64);
      link.dataset.signedIn = authenticated ? 'true' : 'false';
      link.querySelector('.header-account-name').textContent = who ? who.displayName || 'Your account' : 'Account';
      link.querySelector('.header-account-status').textContent = who ? (authenticated ? 'Signed in' : (unlocked ? 'Key unlocked' : 'Details saved')) : 'Signed out';
      link.setAttribute('aria-label', who ? (who.displayName || 'Your account') + (authenticated ? ', signed in. Open account' : ', public identity details saved, not signed in. Select your Auth Kit to sign in') : 'Account, signed out. Sign in');
    }
    ArkUI.refreshAccountNav = function () {
      document.querySelectorAll('.header-account-link').forEach(paintAccount);
    };
    if (ArkUI.localIdentity && !ArkUI.accountNavSubscribed) {
      ArkUI.accountNavSubscribed = true;
      ArkUI.localIdentity.subscribe(function () { ArkUI.refreshAccountNav(); });
    }
    // Paint this core before it has been attached to the document.
    paintAccount(core.querySelector('.header-account-link'));

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
    el.appendChild(toggle);
    if (ArkUI.pageCatalog.resolutions && typeof ArkResolutions !== 'undefined') buildProducts(el, core);
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
    var understand = ['zero', 'about', 'resolutions', 'resolver', 'deployment'].filter(function (key) { return catalog[key]; });
    var evaluate = ['explorer', 'account', 'treasury', 'deposits', 'references', 'concept', 'dao'];
    var run = ['download', 'bundledeployer', 'deploy'];
    var read = ['learnings', 'proximity', 'lab'];
    var lifecycle = Object.keys(catalog).filter(function (key) { return key === 'lifecycle' || key.indexOf('lifecycle/') === 0; });
    var mechanics = Object.keys(catalog).filter(function (key) { return key.indexOf('concept/') === 0; });
    var articles = Object.keys(catalog).filter(function (key) { return key.indexOf('article/') === 0; });
    var nested = Object.keys(catalog).filter(function (key) { return catalog[key].nestedNavigation; });
    var named = understand.concat(evaluate, run, read, lifecycle, mechanics, articles, nested);
    Object.keys(catalog).forEach(function (key) { if (named.indexOf(key) < 0 && !catalog[key].hiddenFromNavigation) evaluate.push(key); });
    menu.dataset.pageCount = String(Object.keys(catalog).filter(function (key) { return !catalog[key].hiddenFromNavigation && !catalog[key].nestedNavigation; }).length);
    function label(key) {
      if (key === 'zero') return 'Home';
      if (key === 'learnings') return 'Notes';
      if (key === 'lifecycle') return 'View the full lifecycle';
      if (key.indexOf('lifecycle/') === 0) return ArkUI.lifecycleStages.find(function (stage) { return stage.id === key.split('/')[1]; }).title;
      if (key.indexOf('concept/') === 0) return ArkCopy.text(key.split('/')[1].toUpperCase() + '.TITLE');
      if (key.indexOf('article/') === 0) return LearningContent.find(key.split('/')[1]).title;
      return catalog[key].title.split(' — ')[0];
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
      top.appendChild(node('span', 'nav-layer-depth', id === 'index' ? '01 / INDEX' : id === 'stages' ? '03 / AGREEMENT LIFECYCLE' : '02 / ' + id.toUpperCase()));
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
      if(ArkUI.actionIcon)ArkUI.actionIcon(link,key.indexOf('lifecycle')===0?'cycle':key.indexOf('article/')===0?'document':key.indexOf('concept/')===0?'layers':({explorer:'network',account:'account',download:'terminal',deploy:'terminal',about:'overview',learnings:'document',lab:'model',proximity:'model',dao:'authority'}[key]||'open'));
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
    [
      ['Understand', 'Overview, resolvers, networks, and agreements', understand, 'understand'],
      ['Evaluate', 'Live local mesh data, evidence, governance, and status', evaluate, 'evaluate'],
      ['Run', 'Source setup and named-network operations', run, 'run'],
      ['Read', 'Notes, articles, and the interactive model', read, 'read']
    ].forEach(function (entry) {
      index.appendChild(choice(entry[0], entry[1], entry[2].length + (entry[3] === 'understand' ? lifecycle.length : entry[3] === 'evaluate' ? mechanics.length : entry[3] === 'read' ? articles.length : 0), entry[3]));
      var body = layer(entry[3], entry[0], entry[1], 'the index');
      entry[2].forEach(function (key) { body.appendChild(routeLink(key, key.indexOf('lifecycle/') === 0)); });
    });
    [
      ['understand', 'stages', 'Agreement lifecycle', 'Follow one request through five signed records', lifecycle],
      ['evaluate', 'mechanics', 'Operating model', 'Choose the mechanism you want to inspect', mechanics],
      ['read', 'articles', 'Notes and articles', 'Choose an architectural question', articles]
    ].forEach(function (entry) {
      panels[entry[0]].body.appendChild(choice(entry[2], entry[3], entry[4].length, entry[1]));
      var body = layer(entry[1], entry[2], entry[3], entry[0]);
      entry[4].forEach(function (key) { body.appendChild(routeLink(key, key.indexOf('lifecycle/') === 0)); });
    });
    menu.navLayers = { reset: reset, back: goBack, current: function () { return stack[stack.length - 1]; } };
  },
  emerge: { delay: 0, dur: 400 }
});

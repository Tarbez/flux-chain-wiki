/* =====================================================================
   RESOLVER  RHEADER_V1  —  the top bar
   ---------------------------------------------------------------------
   Spans the full width of the screen (not the centred poster): logo at
   one end, navigation at the other. At compact widths the links move
   into an index panel beneath the header.

   Its padding follows the smaller screen dimension, with a 20px floor.
   ===================================================================== */
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
    var mark = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    mark.setAttribute('class', 'ark-brand-mark');
    mark.setAttribute('viewBox', '0 0 32 32');
    mark.setAttribute('width', '32');
    mark.setAttribute('height', '32');
    mark.setAttribute('aria-hidden', 'true');
    mark.setAttribute('focusable', 'false');
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', 'currentColor');
    path.setAttribute('d', 'M6 5h9c7 0 12 4 12 11s-5 11-12 11H6V5Zm6 6v10h3c4 0 6-2 6-5s-2-5-6-5h-3Z');
    mark.appendChild(path);
    identity.appendChild(mark);
    var wordmark = document.createElement('span');
    wordmark.className = 'ark-brand-wordmark';
    wordmark.textContent = ArkCopy.text('NAV.BRAND.NAME');
    identity.appendChild(wordmark);
    el.appendChild(identity);

    var core = document.createElement('nav');
    core.className = 'header-core-links';
    core.setAttribute('aria-label', 'Core pages');
    [
      ['NAV.OVERVIEW', 'about'],
      ['NAV.HOW', 'deployment'],
      ['NAV.MESH', 'explorer'],
      ['NAV.ACCOUNT', 'account'],
      ['NAV.RUN', 'download']
    ].forEach(function (item) {
      var link = document.createElement('a');
      link.href = ArkUI.route.href(ArkUI.pageCatalog[item[1]].path);
      link.textContent = ArkCopy.text(item[0]);
      if (item[1] === 'download') link.classList.add('header-run-link');
      if(ArkUI.actionIcon)ArkUI.actionIcon(link,{about:'overview',deployment:'layers',explorer:'network',account:'account',download:'terminal'}[item[1]]);core.appendChild(link);
    });
    el.appendChild(core);

    var toggle = document.createElement('button');
    toggle.className = 'nav-toggle';
    toggle.type = 'button';
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
    var understand = ['zero', 'about', 'resolver', 'deployment'];
    var evaluate = ['explorer', 'account', 'treasury', 'deposits', 'references', 'concept', 'dao'];
    var run = ['download', 'deploy'];
    var read = ['learnings', 'proximity', 'lab'];
    var lifecycle = Object.keys(catalog).filter(function (key) { return key === 'lifecycle' || key.indexOf('lifecycle/') === 0; });
    var mechanics = Object.keys(catalog).filter(function (key) { return key.indexOf('concept/') === 0; });
    var articles = Object.keys(catalog).filter(function (key) { return key.indexOf('article/') === 0; });
    var named = understand.concat(evaluate, run, read, lifecycle, mechanics, articles);
    Object.keys(catalog).forEach(function (key) { if (named.indexOf(key) < 0 && !catalog[key].hiddenFromNavigation) evaluate.push(key); });
    menu.dataset.pageCount = String(Object.keys(catalog).filter(function (key) { return !catalog[key].hiddenFromNavigation; }).length);
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

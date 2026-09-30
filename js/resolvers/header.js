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
    identity.href = '#/';
    identity.dataset.sceneLink = 'zero';
    identity.setAttribute('aria-label', 'Flux Protocol — home');
    var mark = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    mark.setAttribute('class', 'ark-brand-mark');
    mark.setAttribute('viewBox', '0 0 32 32');
    mark.setAttribute('width', '32');
    mark.setAttribute('height', '32');
    mark.setAttribute('aria-hidden', 'true');
    mark.setAttribute('focusable', 'false');
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', 'currentColor');
    path.setAttribute('d', 'M5 4H29L25 10H11V28H5Z M15 14H25L21 20H15Z');
    mark.appendChild(path);
    identity.appendChild(mark);
    el.appendChild(identity);

    var core = document.createElement('nav');
    core.className = 'header-core-links';
    core.setAttribute('aria-label', 'Core pages');
    [
      ['NAV.RESOLVER', 'resolver'],
      ['NAV.DEPLOYMENT', 'deployment'],
      ['NAV.DEPLOY', 'deploy']
    ].forEach(function (item) {
      var link = document.createElement('a');
      link.href = '#' + ArkUI.pageCatalog[item[1]].path;
      link.textContent = ArkCopy.text(item[0]);
      core.appendChild(link);
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
    var start = ['zero', 'resolver', 'references', 'deployment', 'deploy', 'about'];
    var explore = ['concept', 'proximity', 'lab', 'dao', 'download', 'learnings'];
    var lifecycle = Object.keys(catalog).filter(function (key) { return key === 'lifecycle' || key.indexOf('lifecycle/') === 0; });
    var mechanics = Object.keys(catalog).filter(function (key) { return key.indexOf('concept/') === 0; });
    var articles = Object.keys(catalog).filter(function (key) { return key.indexOf('article/') === 0; });
    var named = start.concat(explore, lifecycle, mechanics, articles);
    Object.keys(catalog).forEach(function (key) { if (named.indexOf(key) < 0) explore.push(key); });
    menu.dataset.pageCount = String(Object.keys(catalog).length);
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
      var href = '#' + catalog[key].path;
      var link = existing[href];
      if (!link) {
        link = node('a', 'ark-link');
        link.href = href;
        link.appendChild(node('span', 'ark-link-label', label(key)));
      }
      link.classList.add('nav-route-link');
      link.dataset.navRoute = key;
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
    var index = layer('index', 'Explore Flux', 'Choose a path.');
    [
      ['Start here', 'The essentials and the deployment path', start, 'start'],
      ['Explore', 'Ideas and tools', explore, 'explore'],
      ['Agreement lifecycle', 'From intent to receipt', lifecycle, 'lifecycle'],
      ['The mechanics', 'How the system works', mechanics, 'mechanics'],
      ['Reading', 'Essays and context', articles, 'reading']
    ].forEach(function (entry) {
      index.appendChild(choice(entry[0], entry[1], entry[2].length, entry[3]));
      var body = layer(entry[3], entry[0], entry[1], 'the index');
      if (entry[3] === 'lifecycle') {
        body.appendChild(routeLink('lifecycle', false));
        body.appendChild(choice('Five stages', 'Intent, offer, agreement, fulfillment, receipt', 5, 'stages'));
      } else entry[2].forEach(function (key) { body.appendChild(routeLink(key, false)); });
    });
    var stages = layer('stages', 'Five stages', 'Follow an agreement from intent to receipt.', 'Agreement lifecycle');
    lifecycle.filter(function (key) { return key !== 'lifecycle'; }).forEach(function (key) {
      stages.appendChild(routeLink(key, true));
    });
    menu.navLayers = { reset: reset, back: goBack, current: function () { return stack[stack.length - 1]; } };
  },
  emerge: { delay: 0, dur: 400 }
});

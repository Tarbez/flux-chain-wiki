/* Resolutions: every product, grouped. ?r=<slug> brings one resolution forward. */
(function () {
  'use strict';

  ArkUI.pageModules.resolutions = {
    mount: function (host) {
      function words(role) { return ArkCopy.text('RESOLUTIONS.' + role); }
      function el(tag, className, text) { return ArkUI.el(tag, className || '', text); }
      function routeLink(label, target, className) {
        var link = el('a', className, label);
        link.href = ArkUI.route.href(ArkUI.pageCatalog[target].path);
        link.dataset.sceneLink = target;
        return link;
      }

      var page = el('section', 'ark-page resolutions-page');
      page.dataset.arkPage = 'resolutions';
      page.setAttribute('aria-labelledby', 'resolutions-title');

      var path = el('nav', 'content-layer-path resolutions-path');
      path.setAttribute('aria-label', 'Your place');
      path.appendChild(routeLink('← Home', 'zero'));
      var here = el('span', '', ArkManifest.get('resolutions').title.replace(/\s*\(.*\)$/, ''));
      here.setAttribute('aria-current', 'page');
      path.appendChild(here);
      page.appendChild(path);

      var hero = el('header', 'resolutions-hero');
      hero.appendChild(el('p', 'resolutions-eyebrow', words('EYEBROW')));
      var title = el('h1', '', words('TITLE'));
      title.id = 'resolutions-title';
      hero.appendChild(title);
      hero.appendChild(el('p', 'resolutions-deck', words('DECK')));
      var promise = el('ul', 'resolutions-promise');
      promise.setAttribute('aria-label', words('PROMISE'));
      words('PROMISE').split('·').forEach(function (part) { promise.appendChild(el('li', '', part.trim())); });
      hero.appendChild(promise);
      page.appendChild(hero);

      var groups = ArkResolutions.list();
      var jump = el('nav', 'resolutions-jump');
      jump.setAttribute('aria-label', words('JUMP'));
      jump.appendChild(el('span', 'resolutions-jump-label', words('JUMP')));
      page.appendChild(jump);

      var cards = Object.create(null);
      groups.forEach(function (group) {
        var section = el('section', 'resolutions-group');
        section.id = 'resolutions-group-' + group.key.toLowerCase();
        section.tabIndex = -1;
        var heading = el('div', 'resolutions-group-head');
        heading.appendChild(el('h2', '', group.title));
        heading.appendChild(el('span', 'resolutions-group-count', String(group.items.length).padStart(2, '0')));
        section.appendChild(heading);
        var grid = el('div', 'resolutions-grid');
        group.items.forEach(function (item) {
          var card = el('article', 'resolution-card');
          card.id = 'resolution-' + item.slug;
          card.dataset.resolution = item.slug;
          card.tabIndex = -1;
          card.appendChild(el('h3', '', item.title));
          card.appendChild(el('p', '', item.text));
          if (item.start && ArkUI.pageCatalog[item.start]) card.appendChild(routeLink(words('START') + ' →', item.start, 'resolution-start'));
          grid.appendChild(card);
          cards[item.slug] = card;
        });
        section.appendChild(grid);
        page.appendChild(section);
        var chip = el('button', 'resolutions-jump-chip', group.title);
        chip.type = 'button';
        chip.addEventListener('click', function () {
          section.scrollIntoView({ behavior: ArkUI.prefersReducedMotion && ArkUI.prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
          section.focus({ preventScroll: true });
        });
        jump.appendChild(chip);
      });

      var note = el('aside', 'resolutions-note');
      note.appendChild(el('p', '', words('NOTE')));
      var status = el('a', 'resolutions-note-link', words('NOTE.LINK') + ' ↗');
      status.href = 'docs/status.md';
      note.appendChild(status);
      page.appendChild(note);

      function bringForward(slug, smooth) {
        var card = cards[slug];
        if (!card) return;
        Object.keys(cards).forEach(function (key) { cards[key].classList.toggle('is-focused', key === slug); });
        card.scrollIntoView({ behavior: smooth && !(ArkUI.prefersReducedMotion && ArkUI.prefersReducedMotion()) ? 'smooth' : 'auto', block: 'center' });
        card.focus({ preventScroll: true });
      }
      function fromRoute(smooth) {
        if (ArkUI.route.path() !== ArkUI.pageCatalog.resolutions.path) return false;
        var slug = new URLSearchParams(ArkUI.route.search()).get('r');
        if (slug) bringForward(slug, smooth);
        return true;
      }
      function onPop() { fromRoute(false); }
      /* The Products menu calls this when it is used while this page is already open. */
      var focusHook = function (slug) { bringForward(slug, true); };
      ArkUI.focusResolution = focusHook;
      if (window.addEventListener) window.addEventListener('popstate', onPop);
      /* The router writes the address once the page has arrived, so wait for it (briefly) before reading ?r=. */
      var tries = 0, waitTimer = 0;
      function waitForRoute() {
        waitTimer = 0;
        if ((page.isConnected && fromRoute(true)) || ++tries > 200) return;
        waitTimer = window.setTimeout(waitForRoute, 75);
      }
      if (typeof window.setTimeout === 'function') waitTimer = window.setTimeout(waitForRoute, 75);
      page.arkDispose = function () {
        if (waitTimer) window.clearTimeout(waitTimer);
        if (ArkUI.focusResolution === focusHook) ArkUI.focusResolution = null;
        if (window.removeEventListener) window.removeEventListener('popstate', onPop);
      };

      host.appendChild(page);
      return page;
    }
  };
})();

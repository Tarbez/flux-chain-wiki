/* Resolutions: a quiet category index and one canonical page per resolution. */
(function () {
  'use strict';

  var groupIntroductions = {
    BUILD: 'Make, publish and keep digital work available without building a server stack around it.',
    VALUE: 'Keep value exchange between the partners involved, with an inspectable trail of agreement and receipt.',
    PEOPLE: 'Coordinate people as peers: shared rules and records without a platform sitting above the group.',
    INTELLIGENCE: 'Put data, logic and provenance in the same resolvable fabric so results can be checked.',
    OPERATIONS: 'Run the connective work of a network without handing its keys or continuity to a cloud account.'
  };

  ArkUI.pageModules.resolutions = {
    mount: function (host, pageKey) {
      function words(role) { return ArkCopy.text('RESOLUTIONS.' + role); }
      function el(tag, className, text) { return ArkUI.el(tag, className || '', text); }
      function routeLink(label, target, className) {
        var link = el('a', className, label);
        link.href = ArkUI.route.href(ArkUI.pageCatalog[target].path);
        link.dataset.sceneLink = target;
        return link;
      }
      function short(item) { return ArkResolutions.shortName(item.title); }

      function breadcrumb(page, item) {
        var path = el('nav', 'content-layer-path resolutions-path');
        path.setAttribute('aria-label', 'Your place');
        if (item) {
          path.appendChild(routeLink('← All resolutions', 'resolutions'));
          var current = el('span', '', short(item));
          current.setAttribute('aria-current', 'page');
          path.appendChild(current);
        } else {
          path.appendChild(routeLink('← Home', 'zero'));
          var here = el('span', '', 'Resolutions');
          here.setAttribute('aria-current', 'page');
          path.appendChild(here);
        }
        page.appendChild(path);
      }

      function resolutionLink(item, index) {
        var key = 'resolutions/' + item.slug;
        var link = routeLink('', key, 'resolution-entry');
        link.dataset.resolution = item.slug;
        link.appendChild(el('span', 'resolution-entry-number', String(index + 1).padStart(2, '0')));
        var copy = el('span', 'resolution-entry-copy');
        copy.appendChild(el('strong', '', short(item)));
        copy.appendChild(el('span', '', item.text));
        link.appendChild(copy);
        var arrow = el('span', 'resolution-entry-arrow', '↗');
        arrow.setAttribute('aria-hidden', 'true');
        link.appendChild(arrow);
        return link;
      }

      function mountIndex() {
        var page = el('section', 'ark-page resolutions-page resolutions-index');
        page.dataset.arkPage = 'resolutions';
        page.setAttribute('aria-labelledby', 'resolutions-title');
        breadcrumb(page);

        var hero = el('header', 'resolutions-hero');
        var heroCopy = el('div', 'resolutions-hero-copy');
        heroCopy.appendChild(el('p', 'resolutions-eyebrow', words('EYEBROW')));
        var title = el('h1', '', words('TITLE'));
        title.id = 'resolutions-title';
        heroCopy.appendChild(title);
        heroCopy.appendChild(el('p', 'resolutions-deck', words('DECK')));
        hero.appendChild(heroCopy);
        var measure = el('dl', 'resolutions-measure');
        [['20', 'resolutions'], ['05', 'domains'], ['01', 'mesh']].forEach(function (entry) {
          var cell = el('div');
          cell.appendChild(el('dt', '', entry[0]));
          cell.appendChild(el('dd', '', entry[1]));
          measure.appendChild(cell);
        });
        hero.appendChild(measure);
        page.appendChild(hero);

        var groups = ArkResolutions.list();
        var browser = el('section', 'resolutions-browser');
        browser.setAttribute('aria-label', 'Browse resolutions by domain');
        var tabs = el('div', 'resolutions-domains');
        tabs.setAttribute('role', 'tablist');
        tabs.setAttribute('aria-label', 'Resolution domains');
        var panel = el('div', 'resolutions-domain-panel');
        panel.id = 'resolution-domain-panel';
        panel.setAttribute('role', 'tabpanel');
        panel.tabIndex = 0;
        var buttons = [];

        function selectGroup(selected) {
          buttons.forEach(function (button, index) {
            var active = index === selected;
            button.setAttribute('aria-selected', String(active));
            button.tabIndex = active ? 0 : -1;
          });
          var group = groups[selected];
          panel.setAttribute('aria-labelledby', 'resolution-domain-' + group.key.toLowerCase());
          panel.replaceChildren();
          var head = el('div', 'resolutions-domain-head');
          var headingCopy = el('div');
          headingCopy.appendChild(el('p', 'resolutions-domain-index', String(selected + 1).padStart(2, '0') + ' / ' + String(groups.length).padStart(2, '0')));
          headingCopy.appendChild(el('h2', '', group.title));
          head.appendChild(headingCopy);
          head.appendChild(el('p', '', groupIntroductions[group.key]));
          panel.appendChild(head);
          var list = el('div', 'resolutions-list');
          group.items.forEach(function (item, index) { list.appendChild(resolutionLink(item, index)); });
          panel.appendChild(list);
        }

        groups.forEach(function (group, index) {
          var button = el('button', 'resolutions-domain-tab');
          button.type = 'button';
          button.id = 'resolution-domain-' + group.key.toLowerCase();
          button.setAttribute('role', 'tab');
          button.setAttribute('aria-label', group.title);
          button.setAttribute('aria-controls', panel.id);
          button.appendChild(el('span', 'resolutions-domain-tab-number', String(index + 1).padStart(2, '0')));
          button.appendChild(el('span', 'resolutions-domain-tab-name', group.title));
          button.appendChild(el('span', 'resolutions-domain-tab-count', String(group.items.length).padStart(2, '0')));
          button.addEventListener('click', function () { selectGroup(index); });
          button.addEventListener('keydown', function (event) {
            if (event.key !== 'ArrowDown' && event.key !== 'ArrowRight' && event.key !== 'ArrowUp' && event.key !== 'ArrowLeft') return;
            event.preventDefault();
            var direction = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
            var next = (index + direction + buttons.length) % buttons.length;
            selectGroup(next);
            buttons[next].focus();
          });
          buttons.push(button);
          tabs.appendChild(button);
        });
        browser.appendChild(tabs);
        browser.appendChild(panel);
        page.appendChild(browser);
        selectGroup(0);

        var note = el('aside', 'resolutions-note');
        note.appendChild(el('p', '', words('NOTE')));
        var status = el('a', 'resolutions-note-link', words('NOTE.LINK') + ' ↗');
        status.href = 'docs/status.md';
        note.appendChild(status);
        page.appendChild(note);
        return page;
      }

      /* One resolution: who it is for and the problem it removes on the left; on the right,
         one panel that changes state in place (ready products, product ideas, how it resolves)
         so the page never scrolls. */
      function mountDetail(item) {
        var all = ArkResolutions.all();
        var position = all.findIndex(function (candidate) { return candidate.slug === item.slug; });
        var group = ArkResolutions.groupFor(item.group);
        var previous = all[(position - 1 + all.length) % all.length];
        var next = all[(position + 1) % all.length];
        var shelf = typeof ArkResolutionProducts !== 'undefined' ? ArkResolutionProducts.forResolution(item.key) : null;
        var page = el('article', 'ark-page resolutions-page resolution-detail');
        page.dataset.arkPage = pageKey;
        page.dataset.resolutionGroup = item.group.toLowerCase();
        page.setAttribute('aria-labelledby', 'resolution-title-' + item.slug);
        breadcrumb(page, item);

        var workspace = el('div', 'resolution-detail-workspace');
        var intro = el('header', 'resolution-detail-intro');
        intro.appendChild(el('p', 'resolution-detail-index', String(position + 1).padStart(2, '0') + ' / ' + String(all.length).padStart(2, '0') + ' · ' + group.title));
        var title = el('h1', '', item.title);
        title.id = 'resolution-title-' + item.slug;
        intro.appendChild(title);
        intro.appendChild(el('p', 'resolution-detail-deck', item.text));
        if (shelf) {
          var brief = el('dl', 'resolution-brief');
          [['For', shelf.audience], ['Problem', shelf.problem]].forEach(function (row) {
            var line = el('div');
            line.appendChild(el('dt', '', row[0]));
            line.appendChild(el('dd', '', row[1]));
            brief.appendChild(line);
          });
          intro.appendChild(brief);
        }
        var actions = el('div', 'resolution-detail-actions');
        if (item.start && ArkUI.pageCatalog[item.start]) actions.appendChild(routeLink(words('START') + ' →', item.start, 'resolution-primary-action'));
        else actions.appendChild(routeLink('How resolvers work →', 'resolver', 'resolution-primary-action'));
        intro.appendChild(actions);
        workspace.appendChild(intro);

        var panel = el('section', 'resolution-shelf');
        panel.setAttribute('aria-label', short(item) + ' products');
        var tabs = el('div', 'resolution-level-tabs');
        tabs.setAttribute('role', 'tablist');
        tabs.setAttribute('aria-label', 'Products, ideas and how it works');
        var view = el('div', 'resolution-level');
        view.id = 'resolution-level-' + item.slug;
        view.setAttribute('role', 'tabpanel');
        view.tabIndex = 0;
        var tabButtons = [];
        var selectedIdea = 0;

        function statusMark(product) {
          var mark = el('span', 'resolution-status resolution-status-' + product.status, product.status === 'ready' ? 'Ready' : 'Building');
          return mark;
        }
        function productTile(product) {
          var target = product.page && ArkUI.pageCatalog[product.page] ? product.page : null;
          var tile = target ? routeLink('', target, 'resolution-product') : el('div', 'resolution-product');
          var head = el('span', 'resolution-product-head');
          head.appendChild(el('strong', '', product.name));
          head.appendChild(statusMark(product));
          tile.appendChild(head);
          tile.appendChild(el('span', 'resolution-product-line', product.line));
          if (target) tile.appendChild(el('span', 'resolution-product-open', 'Open →'));
          return tile;
        }
        function showReady() {
          var grid = el('div', 'resolution-products');
          shelf.ready.forEach(function (product) { grid.appendChild(productTile(product)); });
          view.appendChild(grid);
        }
        function showIdeas() {
          var ideas = el('div', 'resolution-ideas');
          var rail = el('div', 'resolution-idea-rail');
          rail.setAttribute('role', 'group');
          rail.setAttribute('aria-label', 'Product ideas');
          var detail = el('div', 'resolution-idea');
          detail.setAttribute('aria-live', 'polite');
          var picks = [];
          function pick(index) {
            selectedIdea = index;
            picks.forEach(function (button, i) { button.setAttribute('aria-pressed', String(i === index)); });
            var idea = shelf.ideas[index];
            detail.replaceChildren();
            var head = el('div', 'resolution-idea-head');
            head.appendChild(el('span', 'resolution-section-label', 'Idea ' + String(index + 1).padStart(2, '0') + ' · not built yet'));
            head.appendChild(el('h2', '', idea.name));
            head.appendChild(el('p', 'resolution-idea-audience', 'For ' + idea.audience.charAt(0).toLowerCase() + idea.audience.slice(1)));
            detail.appendChild(head);
            var body = el('dl', 'resolution-idea-body');
            [['Problem', idea.problem], ['Product', idea.product]].forEach(function (row) {
              var line = el('div');
              line.appendChild(el('dt', '', row[0]));
              line.appendChild(el('dd', '', row[1]));
              body.appendChild(line);
            });
            detail.appendChild(body);
            var builds = el('div', 'resolution-idea-builds');
            builds.appendChild(el('span', 'resolution-section-label', 'Builds on'));
            var chips = el('ul', '');
            idea.builds.forEach(function (product) {
              var chip = el('li', 'resolution-chip resolution-chip-' + product.status, product.name);
              chip.title = product.line + (product.status === 'ready' ? '' : ' (building)');
              chips.appendChild(chip);
            });
            builds.appendChild(chips);
            detail.appendChild(builds);
          }
          shelf.ideas.forEach(function (idea, index) {
            var button = el('button', 'resolution-idea-pick');
            button.type = 'button';
            button.appendChild(el('span', '', String(index + 1).padStart(2, '0')));
            button.appendChild(el('strong', '', idea.name));
            button.addEventListener('click', function () { pick(index); });
            picks.push(button);
            rail.appendChild(button);
          });
          ideas.appendChild(rail);
          ideas.appendChild(detail);
          view.appendChild(ideas);
          pick(selectedIdea);
        }
        function showHow() {
          var how = el('div', 'resolution-how');
          var shift = el('div', 'resolution-how-shift');
          shift.appendChild(el('span', 'resolution-section-label', 'The shift'));
          shift.appendChild(el('h2', '', item.shift));
          shift.appendChild(el('p', '', 'Instead of ' + item.old.charAt(0).toLowerCase() + item.old.slice(1)));
          how.appendChild(shift);
          var steps = el('ol', 'resolution-steps');
          item.steps.forEach(function (step, index) {
            var row = el('li', 'resolution-step');
            row.appendChild(el('span', 'resolution-step-number', String(index + 1).padStart(2, '0')));
            row.appendChild(el('strong', '', ['Define', 'Publish', 'Resolve'][index]));
            row.appendChild(el('p', '', step));
            steps.appendChild(row);
          });
          how.appendChild(steps);
          view.appendChild(how);
        }

        var levels = shelf
          ? [['Ready now', shelf.ready.length, showReady], ['Product ideas', shelf.ideas.length, showIdeas], ['How it resolves', 0, showHow]]
          : [['How it resolves', 0, showHow]];
        function showLevel(selected) {
          tabButtons.forEach(function (button, index) {
            var active = index === selected;
            button.setAttribute('aria-selected', String(active));
            button.tabIndex = active ? 0 : -1;
          });
          view.setAttribute('aria-labelledby', 'resolution-level-tab-' + item.slug + '-' + selected);
          view.dataset.level = String(selected);
          view.replaceChildren();
          levels[selected][2]();
        }
        levels.forEach(function (level, index) {
          var button = el('button', 'resolution-level-tab');
          button.type = 'button';
          button.id = 'resolution-level-tab-' + item.slug + '-' + index;
          button.setAttribute('role', 'tab');
          button.setAttribute('aria-controls', view.id);
          button.appendChild(document.createTextNode(level[0]));
          if (level[1]) button.appendChild(el('span', '', String(level[1])));
          button.addEventListener('click', function () { showLevel(index); });
          button.addEventListener('keydown', function (event) {
            if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
            event.preventDefault();
            var nextLevel = (index + (event.key === 'ArrowRight' ? 1 : -1) + tabButtons.length) % tabButtons.length;
            showLevel(nextLevel);
            tabButtons[nextLevel].focus();
          });
          tabButtons.push(button);
          tabs.appendChild(button);
        });
        panel.appendChild(tabs);
        panel.appendChild(view);
        var legend = el('p', 'resolution-legend');
        legend.appendChild(el('span', 'resolution-legend-ready', 'Ready: usable today'));
        legend.appendChild(el('span', 'resolution-legend-building', 'Building: in source, not released'));
        legend.appendChild(el('span', 'resolution-legend-idea', 'Ideas: proposed, not built'));
        var statusLink = el('a', 'resolution-boundary-link', words('NOTE.LINK') + ' ↗');
        statusLink.href = 'docs/status.md';
        legend.appendChild(statusLink);
        panel.appendChild(legend);
        workspace.appendChild(panel);
        page.appendChild(workspace);
        showLevel(0);

        var footer = el('nav', 'resolution-next');
        footer.setAttribute('aria-label', 'More resolutions');
        var previousLink = routeLink('← ' + short(previous), 'resolutions/' + previous.slug, 'resolution-next-link resolution-next-previous');
        previousLink.appendChild(el('span', '', 'Previous'));
        var nextLink = routeLink(short(next) + ' →', 'resolutions/' + next.slug, 'resolution-next-link resolution-next-forward');
        nextLink.appendChild(el('span', '', 'Next'));
        footer.appendChild(previousLink);
        footer.appendChild(routeLink('All 20', 'resolutions', 'resolution-next-all'));
        footer.appendChild(nextLink);
        page.appendChild(footer);
        return page;
      }

      var slug = String(pageKey || '').indexOf('resolutions/') === 0 ? String(pageKey).slice('resolutions/'.length) : '';
      var item = slug ? ArkResolutions.find(slug) : null;
      var page = item ? mountDetail(item) : mountIndex();
      host.appendChild(page);
      return page;
    }
  };
})();

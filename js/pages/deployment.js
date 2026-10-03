(function () {
  'use strict';

  /* A wide three-part journey. Each chapter keeps its own mesh object and
     expands from the exact surface the reader chose. */
  ArkUI.pageModules.deployment = {
    mount: function (host) {
      function words(role) { return ArkCopy.text('DEPLOYMENT.SIMPLE.' + role); }
      function routeLink(label, key, className) {
        var link = ArkUI.el('a', className || '', label);
        link.href = ArkUI.route.href(ArkUI.pageCatalog[key].path);
        link.dataset.sceneLink = key;
        return link;
      }

      var chapters = [
        { key: 'ASK', route: 'how/ask', pattern: 'story-ask', signal: 'REQUEST' },
        { key: 'WORK', route: 'how/work', pattern: 'story-work', signal: 'PROMISE' },
        { key: 'CHECK', route: 'how/check', pattern: 'story-check', signal: 'PROOF' }
      ];
      var fabrics = [];
      var el = ArkUI.el('section', 'ark-page how-simple how-triptych');
      el.dataset.arkPage = 'deployment';

      var path = ArkUI.el('nav', 'content-layer-path how-path');
      path.setAttribute('aria-label', 'Your place');
      path.appendChild(routeLink('\u2190 Home', 'zero'));
      var current = ArkUI.el('span', '', 'How it works');
      current.setAttribute('aria-current', 'page');
      path.appendChild(current);
      el.appendChild(path);

      var heading = ArkUI.el('header', 'how-triptych-intro');
      var headingCopy = ArkUI.el('div', 'how-triptych-heading');
      headingCopy.appendChild(ArkUI.el('p', 'story-kicker', 'DEFXN / HOW IT WORKS'));
      var title = ArkUI.el('h1', '', words('TITLE'));
      title.id = 'deployment-title';
      el.setAttribute('aria-labelledby', title.id);
      headingCopy.appendChild(title);
      heading.appendChild(headingCopy);
      var intro = ArkUI.el('p', 'how-simple-deck', words('INTRO'));
      heading.appendChild(intro);
      el.appendChild(heading);

      var cards = ArkUI.el('nav', 'how-work-cards');
      cards.setAttribute('aria-label', 'Three parts of a DEFXN agreement');
      chapters.forEach(function (chapter, index) {
        var card = routeLink('', chapter.route, 'how-work-card how-work-card-' + chapter.key.toLowerCase());
        card.dataset.continuityCard = chapter.route;
        card.dataset.workStep = chapter.key.toLowerCase();

        var top = ArkUI.el('div', 'how-work-card-top');
        top.appendChild(ArkUI.el('span', 'how-work-number', String(index + 1).padStart(2, '0')));
        top.appendChild(ArkUI.el('span', 'how-work-signal', chapter.signal));
        card.appendChild(top);
        card.appendChild(ArkUI.el('h2', '', words(chapter.key + '.TITLE')));
        card.appendChild(ArkUI.el('p', 'how-work-answer', words(chapter.key + '.TEXT')));

        var meshFrame = ArkUI.el('div', 'how-work-mesh-frame');
        meshFrame.appendChild(ArkUI.el('span', 'how-work-mesh-label', chapter.signal + ' / MESH RECORD'));
        var mesh = ArkUI.el('canvas', 'how-work-mesh');
        mesh.setAttribute('aria-hidden', 'true');
        meshFrame.appendChild(mesh);
        card.appendChild(meshFrame);

        var more = ArkUI.el('span', 'how-work-more', words(chapter.key + '.ACTION') + ' \u2192');
        more.setAttribute('aria-hidden', 'true');
        card.appendChild(more);

        var fabric = ArkUI.createMeshFabric(mesh);
        fabrics.push({ controller: fabric, pattern: chapter.pattern });
        var pointer = false;
        function activate() {
          card.dataset.active = 'true';
          fabric.select(chapter.pattern, true, true);
        }
        function reset() {
          if (!pointer && document.activeElement !== card) {
            card.dataset.active = 'false';
            fabric.select(chapter.pattern, false);
          }
        }
        card.addEventListener('pointerenter', function () { pointer = true; activate(); });
        card.addEventListener('pointerleave', function () { pointer = false; reset(); });
        card.addEventListener('focus', activate);
        card.addEventListener('blur', reset);
        cards.appendChild(card);
      });
      el.appendChild(cards);

      var footer = ArkUI.el('footer', 'how-simple-footer');
      var boundary = ArkUI.el('div', 'how-simple-boundary');
      boundary.appendChild(ArkUI.el('span', 'how-boundary-label', 'CURRENT IMPLEMENTATION'));
      boundary.appendChild(ArkUI.el('strong', '', words('BOUNDARY')));
      footer.appendChild(boundary);
      footer.appendChild(routeLink('Trace the five-stage lifecycle \u2192', 'lifecycle', 'how-simple-next'));
      el.appendChild(footer);

      el.arkDispose = function () {
        fabrics.forEach(function (entry) { entry.controller.dispose(); });
      };
      host.appendChild(el);
      fabrics.forEach(function (entry) { entry.controller.select(entry.pattern, false); });
      return el;
    }
  };
})();

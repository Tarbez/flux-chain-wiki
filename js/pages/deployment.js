(function () {
  'use strict';

  /* /how-deployment-works: "Deploy a resolver" (since 2026-10-19; the URL is kept, its six
     inbound links with it). Six steps in three cards -- write it, launch it, serve it -- each
     card keeping its own mesh object. Detail sits behind two disclosures (the key-freeze
     caution and what is planned), and the page hands off to the Deploy and Explore products.

     The three agreement chapters (/how-deployment-works/ask, /work, /check) used to be this
     page. They describe the earlier agreement path, which is no longer the direction; they stay
     reachable from here, under their own heading, read-only (the resolver content audit,
     Q4). Copy: js/content/manifests/deployment.js. */
  ArkUI.pageModules.deployment = {
    mount: function (host) {
      var manifest = ArkManifest.get('deployment');
      function words(role) { return ArkCopy.text('DEPLOYMENT.SIMPLE.' + role); }
      function top(role) { return ArkCopy.text('DEPLOYMENT.' + role); }
      /* `hrefRole`'s field is a manifest field of kind 'link'; js/ark/dash-kit.js's
         linkEl is the one place that turns its tagged value into a real href. */
      function routeLink(label, hrefRole, className) {
        return ArkUI.dash.linkEl(label, words(hrefRole), manifest.route, className || '');
      }

      var cards = [
        { key: 'WRITE', steps: [1, 2], pattern: 'story-ask' },
        { key: 'LAUNCH', steps: [3, 4], pattern: 'story-work' },
        { key: 'SERVE', steps: [5, 6], pattern: 'story-check' }
      ];
      var fabrics = [];
      var el = ArkUI.el('section', 'ark-page how-simple how-triptych how-deploy');
      el.dataset.arkPage = 'deployment';

      var path = ArkUI.el('nav', 'content-layer-path how-path');
      path.setAttribute('aria-label', 'Your place');
      path.appendChild(routeLink('← Home', 'HOME.HREF'));
      var current = ArkUI.el('span', '', manifest.title);
      current.setAttribute('aria-current', 'page');
      path.appendChild(current);
      el.appendChild(path);

      var heading = ArkUI.el('header', 'how-triptych-intro');
      var headingCopy = ArkUI.el('div', 'how-triptych-heading');
      var title = ArkUI.el('h1', '', words('TITLE'));
      title.id = 'deployment-title';
      el.setAttribute('aria-labelledby', title.id);
      headingCopy.appendChild(title);
      heading.appendChild(headingCopy);
      heading.appendChild(ArkUI.el('p', 'how-simple-deck', words('INTRO')));
      el.appendChild(heading);

      var list = ArkUI.el('div', 'how-work-cards');
      list.setAttribute('role', 'list');
      list.setAttribute('aria-label', 'Six steps to deploy a resolver');
      cards.forEach(function (spec, index) {
        var card = ArkUI.el('article', 'how-work-card how-work-card-' + spec.key.toLowerCase());
        card.setAttribute('role', 'listitem');
        card.dataset.workStep = spec.key.toLowerCase();

        var head = ArkUI.el('div', 'how-work-card-top');
        head.appendChild(ArkUI.el('span', 'how-work-number', String(index + 1).padStart(2, '0')));
        head.appendChild(ArkUI.el('span', 'how-work-signal', words(spec.key + '.SIGNAL')));
        card.appendChild(head);
        card.appendChild(ArkUI.el('h2', '', words(spec.key + '.TITLE')));
        card.appendChild(ArkUI.el('p', 'how-work-answer', words(spec.key + '.TEXT')));

        var meshFrame = ArkUI.el('div', 'how-work-mesh-frame');
        var mesh = ArkUI.el('canvas', 'how-work-mesh');
        mesh.setAttribute('aria-hidden', 'true');
        meshFrame.appendChild(mesh);
        card.appendChild(meshFrame);

        // The card's two steps, numbered across the whole page (1-6).
        var steps = ArkUI.el('ol', 'how-work-pair');
        steps.start = spec.steps[0];
        spec.steps.forEach(function (n) {
          var item = ArkUI.el('li', '');
          item.appendChild(ArkUI.el('strong', '', top('STEP' + n)));
          item.appendChild(ArkUI.el('span', '', top('BODY' + n)));
          steps.appendChild(item);
        });
        card.appendChild(steps);

        // clean: the fabric's story labels name the agreement path (YOUR REQUEST, THEIR OFFER); a deploy step is not that.
        var fabric = ArkUI.createMeshFabric(mesh, { clean: true });
        fabrics.push({ controller: fabric, pattern: spec.pattern });
        card.addEventListener('pointerenter', function () { card.dataset.active = 'true'; fabric.select(spec.pattern, true, true); });
        card.addEventListener('pointerleave', function () { card.dataset.active = 'false'; fabric.select(spec.pattern, false); });
        list.appendChild(card);
      });
      el.appendChild(list);

      /* Detail behind disclosures: the one hazard every deployer must hear before signing, and
         what is planned (labelled so, never shown as live). Then the earlier agreement path. */
      var notes = ArkUI.el('div', 'how-deploy-detail');
      [['CAUTION.TITLE', 'CAUTION', 'how-deploy-hazard'], ['PLANNED.TITLE', 'PLANNED', 'how-deploy-planned']].forEach(function (pair) {
        var box = ArkUI.el('details', 'how-deploy-fold ' + pair[2]);
        box.appendChild(ArkUI.el('summary', '', words(pair[0])));
        box.appendChild(ArkUI.el('p', '', words(pair[1])));
        notes.appendChild(box);
      });
      var agreement = ArkUI.el('nav', 'how-deploy-agreement');
      agreement.setAttribute('aria-label', words('AGREEMENT.TITLE'));
      agreement.appendChild(ArkUI.el('strong', '', words('AGREEMENT.TITLE')));
      agreement.appendChild(ArkUI.el('p', '', words('AGREEMENT.TEXT')));
      var chapters = ArkUI.el('p', 'how-deploy-chapters');
      ['ASK', 'WORK', 'CHECK'].forEach(function (key) {
        var chapter = routeLink(words(key + '.TITLE'), key + '.HREF', 'how-deploy-chapter');
        chapter.dataset.continuityCard = { ASK: 'how/ask', WORK: 'how/work', CHECK: 'how/check' }[key];
        chapters.appendChild(chapter);
      });
      chapters.appendChild(routeLink('Agreement lifecycle', 'NEXT.HREF', 'how-deploy-chapter'));
      agreement.appendChild(chapters);
      notes.appendChild(agreement);
      el.appendChild(notes);

      var footer = ArkUI.el('footer', 'how-simple-footer');
      var boundary = ArkUI.el('div', 'how-simple-boundary');
      boundary.appendChild(ArkUI.el('span', 'how-boundary-label', 'CURRENT IMPLEMENTATION'));
      boundary.appendChild(ArkUI.el('strong', '', words('BOUNDARY')));
      footer.appendChild(boundary);
      var actions = ArkUI.el('div', 'how-deploy-handoffs');
      actions.appendChild(routeLink(words('DEPLOYER.LINK') + ' ↗', 'DEPLOYER.HREF', 'how-simple-next'));
      actions.appendChild(routeLink(words('EXPLORE.LINK') + ' ↗', 'EXPLORE.HREF', 'how-deploy-handoff'));
      actions.appendChild(routeLink(words('REGISTRY.LINK') + ' →', 'REGISTRY.HREF', 'how-deploy-handoff'));
      footer.appendChild(actions);
      el.appendChild(footer);

      /* Anchor for reusable content blocks (js/content/components.js); rendering into it
         is centralized in js/main.js's onMount hook, not called here. */
      var components = ArkUI.el('div', 'how-components');
      components.setAttribute('data-ark-insert', 'main');
      el.appendChild(components);

      el.arkDispose = function () {
        fabrics.forEach(function (entry) { entry.controller.dispose(); });
      };
      host.appendChild(el);
      fabrics.forEach(function (entry) { entry.controller.select(entry.pattern, false); });
      return el;
    }
  };
})();

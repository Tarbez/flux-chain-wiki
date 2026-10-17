/* The chain-of-chains walkthrough. Just the illustration, picked from a
   small set of cases: swaps, transfers, staking, governance. Switching case
   changes only what the resolver reads at the end (js/pages/home-flow.js's
   CASES) -- the sign/check/extend/replicate mechanism never changes, which
   is the actual point: the chain has no idea which of these it admitted.
   A back control for wayfinding and a visually hidden heading for the
   document outline/aria label; nothing else competes with the scene. */
(function () {
  'use strict';
  var preparedCase = null;

  ArkUI.pageModules.chain = {
    prepare: function (_page, settings) {
      var params = new URLSearchParams(settings && settings.query || ArkUI.route.search());
      var requested = params.get('case');
      preparedCase = ArkUI.chainCases.some(function (c) { return c.id === requested; }) ? requested : null;
    },
    mount: function (host) {
      var manifest = ArkManifest.get('chain');
      /* `key` is a real pageCatalog/route key -- the structural per-step
         targets js/pages/home-flow.js's buildChainFlow draws from its own
         CASES data (sign/check/extend/replicate/resolve), not an editorial
         destination hardcoded in this page module. Resolved the one shared
         way every retrofitted call site is -- js/ark/dash-kit.js's
         resolveLinkField -- replacing the old direct pageCatalog lookup. */
      function pageHref(key) { return ArkUI.dash.resolveLinkField('route:' + key).href; }

      var el = ArkUI.el('section', 'ark-page chain-page');
      el.dataset.arkPage = 'chain';
      el.setAttribute('aria-labelledby', 'chain-title');

      /* The back link reuses manifest.meta.back (ArkManifest.get('chain').meta.back),
         the same existing route picker js/pages/resolver-guide.js and
         js/pages/sheet.js already read for their own back links -- not a
         hardcoded literal duplicating the same destination. */
      var back = ArkUI.el('a', 'chain-back');
      back.href = pageHref(manifest.meta.back); back.dataset.sceneLink = manifest.meta.back; back.dataset.icon = 'arrow-left';
      back.appendChild(ArkUI.el('span', '', 'Home'));
      el.appendChild(back);

      var title = ArkUI.el('h1', 'visually-hidden', manifest.title);
      title.id = 'chain-title';
      el.appendChild(title);

      var cases = ArkUI.chainCases;
      var tabs = ArkUI.el('div', 'chain-cases');
      tabs.setAttribute('role', 'tablist');
      tabs.setAttribute('aria-label', 'See it from a different resolver');
      var buttons = [];
      var current = preparedCase || cases[0].id;
      var flow = null;

      function mountFlow(caseId) {
        if (flow) { flow.dispose(); flow.element.remove(); }
        flow = ArkUI.buildChainFlow({ hrefFor: pageHref, caseId: caseId });
        flow.element.classList.add('chain-flow');
        el.appendChild(flow.element);
        el.arkRestore = flow.restore;
        el.arkDispose = flow.dispose;
      }
      function select(caseId) {
        current = caseId;
        buttons.forEach(function (button) {
          var selected = button.dataset.case === caseId;
          button.setAttribute('aria-selected', String(selected));
          button.tabIndex = selected ? 0 : -1;
        });
        mountFlow(caseId);
      }
      cases.forEach(function (c) {
        var button = ArkUI.el('button', 'chain-case', c.label);
        button.type = 'button'; button.setAttribute('role', 'tab'); button.dataset.case = c.id;
        button.addEventListener('click', function () { if (current !== c.id) select(c.id); });
        buttons.push(button); tabs.appendChild(button);
      });
      el.appendChild(tabs);

      select(current);

      /* Anchor for reusable content blocks (js/content/components.js); rendering into it
         is centralized in js/main.js's onMount hook, not called here. */
      var components = ArkUI.el('div', 'chain-components');
      components.setAttribute('data-ark-insert', 'main');
      el.appendChild(components);

      host.appendChild(el);
      return el;
    }
  };
})();

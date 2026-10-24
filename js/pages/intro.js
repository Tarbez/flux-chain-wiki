/* /intro: the first page of a fresh visit, standing on the 3D world (js/world/world-host.js).

   The whole network seen from above, as on the redesign's #/idvalue, with one card near the centre. The card is
   the one action: a click leaves for home, the camera dives from the overview into the network, and the card grows
   toward you and closes to its centre as it goes (a scale and a clip, never a fade; its size and time are
   ArkWorld.motion.cardZoom and cardZoomTime). A fresh load of "/" opens here (the host redirects it); a link to "/"
   inside the site is home.

   REDUCTION TEST
   1 About: the entrance to the network. 2 Dominant action: Explore the network (the whole card is the link).
   3 Know now: every network chain runs on one kernel and every record is signed; how many network chains,
   capabilities and resolvers there are. 4 Hidden until asked: everything else; home is one click on.
   5 Repeated elsewhere: the counts come from the data files, never typed. 6 Only because the data has it: the counts.
   7 Removable: the note, on a short screen. 8 Leaving keeps state: none to keep. 9 Returning: the Back button comes here.
   10 If WebGL is missing: the host never sends a visitor here; a direct link still shows the card.

   Counts: network chains (js/content/network-data.js), capabilities and resolvers (their data files). The redesign also
   counted products from its concept brief; the site has no such data file, so the card does not count them.
   Words: the home manifest's HOME.LANDING.* (ArkCopy). Layout: css/world-pages.css. */
(function () {
  'use strict';
  var ARROW = '<svg viewBox="0 0 26 20" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M1 10h23M15 1l9 9-9 9"/></svg>';
  function copy(role) { return ArkCopy.text('HOME.LANDING.' + role); }
  function node(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }
  function counts() {
    var N = window.DEFXN_NETWORK, C = window.DEFXN_CAPABILITIES, R = window.DEFXN_RESOLVERS;
    var networks = N && N.NAMED ? Object.keys(N.NAMED).filter(function (i) { return N.KIND[i] === 'network'; }).length : 0;
    var caps = C && C.capabilities ? C.capabilities.length : 0, resolvers = R && R.resolvers ? R.resolvers.length : 0;
    return [['COUNT.NETWORKS', networks], ['COUNT.CAPABILITIES', caps], ['COUNT.RESOLVERS', resolvers]].filter(function (c) { return c[1] > 0; });
  }

  ArkUI.pageModules.intro = {
    mount: function (host) {
      var page = node('section', 'world-page intro-world');
      page.setAttribute('aria-labelledby', 'intro-title');
      var stage = node('div', 'intro-stage'); stage.setAttribute('data-stage', '');
      var slot = node('div', 'intro-slot'); slot.setAttribute('data-panel', '');
      var card = node('a', 'intro-card rise'); card.setAttribute('data-ui', '');
      card.dataset.sceneLink = 'zero'; card.href = ArkUI.route.href(ArkUI.pageCatalog.zero.path);
      card.appendChild(node('p', 'eyebrow-dot mono', copy('EYEBROW')));
      var title = node('h1', 'two'); title.id = 'intro-title';
      var rows = copy('TITLE').split('\n');
      title.appendChild(document.createTextNode(rows[0] + ' '));
      if (rows[1]) title.appendChild(node('span', null, rows[1]));
      card.appendChild(title);
      card.appendChild(node('p', 'intro-lede', copy('LEDE')));
      var strip = node('dl', 'intro-strip');
      counts().forEach(function (c) {
        var cell = node('div'); cell.appendChild(node('dt', null, copy(c[0]))); cell.appendChild(node('dd', null, String(c[1]))); strip.appendChild(cell);
      });
      if (strip.children.length) card.appendChild(strip);
      var go = node('span', 'cta intro-go'); go.innerHTML = '<span class="say"></span>';
      go.firstChild.appendChild(document.createTextNode(copy('CTA') + ' ')); go.firstChild.insertAdjacentHTML('beforeend', ARROW);
      card.appendChild(go);
      card.appendChild(node('small', 'intro-note mono', copy('NOTE')));
      slot.appendChild(card); page.appendChild(stage); page.appendChild(slot);
      /* the CMS's insertion point for reusable blocks (js/content/components.js): empty, and out of the layout */
      var anchor = node('div', 'world-insert'); anchor.setAttribute('data-ark-insert', 'main'); page.appendChild(anchor);
      host.appendChild(page);
      return page;
    }
  };
})();

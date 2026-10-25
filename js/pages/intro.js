/* /intro: the first page of a fresh visit, standing on the 3D world (js/world/world-host.js).

   The whole network seen from above, as on the redesign's #/idvalue. Redesigned 2026-10-25 in home's voice (owner:
   "far more attractive", "follow the rules from the home page"): the words stand bottom left with no box around
   them -- eyebrow, display heading, lede, one cut-corner action -- and the counts stand bottom right as a ledger.
   Arriving, the camera glides down and in onto the network (chains-scene.js WELCOME) and the words rise as it
   settles. Leaving by the action, the camera dives into the network and the words grow toward you and close to
   their centre (a scale and a clip, never a fade; ArkWorld.motion.cardZoom and cardZoomTime). A fresh load of "/"
   opens here (the host redirects it); a link to "/" inside the site is home.

   REDUCTION TEST
   1 About: the entrance to the network. 2 Dominant action: Explore the network (the one filled button).
   3 Know now: every network chain runs on one kernel and every record is signed; how many network chains,
   capabilities and resolvers there are. 4 Hidden until asked: everything else; home is one click on.
   5 Repeated elsewhere: the counts come from the data files, never typed. 6 Only because the data has it: the counts.
   7 Removable: the note and the lede's last line, on a short screen. 8 Leaving keeps state: none to keep. 9 Returning: the Back button comes here.
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
  /* The five doors (owner, 2026-10-25): compact cards, top right, beside the network. [copy key, page, icon].
     The page keys are the catalog's; a card whose page is missing is left out. */
  var DOORS = [['NETWORK', 'stats/now', 'network'], ['CHAINS', 'chain', 'chains'], ['RESOLVERS', 'resolvers', 'layers'], ['PRODUCTS', 'resolutions', 'box'], ['DOCS', 'reference', 'book']];
  var DOOR_ICONS = {
    network: '<circle cx="12" cy="12" r="2.6"/><circle cx="5" cy="5" r="1.8"/><circle cx="19" cy="5" r="1.8"/><circle cx="5" cy="19" r="1.8"/><circle cx="19" cy="19" r="1.8"/><path d="m6.4 6.4 3.7 3.7m7.5-3.7-3.7 3.7m-7.5 7.5 3.7-3.7m7.5 3.7-3.7-3.7"/>',
    chains: '<path d="m12 3 4 2.3v4.6L12 12 8 9.9V5.3Z"/><path d="m7.5 12.5 4 2.3v4.6l-4 2.3-4-2.3v-4.6Z"/><path d="m16.5 12.5 4 2.3v4.6l-4 2.3-4-2.3v-4.6Z"/>',
    layers: '<path d="m12 3 9 4.5-9 4.5-9-4.5Z"/><path d="m3 12 9 4.5 9-4.5"/><path d="m3 16.5 9 4.5 9-4.5"/>',
    box: '<path d="m12 2.8 8.5 4.6v9.2L12 21.2l-8.5-4.6V7.4Z"/><path d="m3.5 7.4 8.5 4.6 8.5-4.6M12 12v9.2"/>',
    book: '<path d="M3 5.5c3-1.3 6-1.3 9 .6 3-1.9 6-1.9 9-.6v13c-3-1.3-6-1.3-9 .6-3-1.9-6-1.9-9-.6Z"/><path d="M12 6.1v13"/>'
  };
  var DOOR_ARROW = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>';
  function doors() {
    var nav = node('nav', 'intro-doors rise'); nav.setAttribute('data-ui', ''); nav.setAttribute('aria-label', 'Where to go'); nav.dataset.rise = 'side';
    DOORS.forEach(function (d, i) {
      var entry = ArkUI.pageCatalog[d[1]];
      if (!entry) return;
      var a = node('a', 'intro-door tp-panel' + (i === 0 ? ' is-lead' : ''));   /* tp-panel: the shared glass (css/cutouts.css) */
      a.href = ArkUI.route.href(entry.path); a.dataset.sceneLink = d[1];
      var mark = node('span', 'intro-door-mark');
      mark.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true">' + DOOR_ICONS[d[2]] + '</svg>';
      var words = node('span', 'intro-door-words');
      words.appendChild(node('b', null, copy('LINK.' + d[0] + '.NAME')));
      words.appendChild(node('small', null, copy('LINK.' + d[0] + '.LINE')));
      var go = node('span', 'intro-door-go'); go.innerHTML = DOOR_ARROW;
      a.appendChild(mark); a.appendChild(words); a.appendChild(go);
      nav.appendChild(a);
    });
    return nav;
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
      /* no [data-panel]: the world draws its glass page slab behind that box, and the intro has no card any more (a
         full-width slab drew a hard line across the screen) */
      var slot = node('div', 'intro-slot');
      var card = node('div', 'intro-card rise'); card.setAttribute('data-ui', '');
      var eyebrow = node('p', 'eyebrow mono');
      eyebrow.appendChild(node('i')); eyebrow.appendChild(node('b', 'dash')); eyebrow.appendChild(document.createTextNode(copy('EYEBROW')));
      card.appendChild(eyebrow);
      var title = node('h1'); title.id = 'intro-title';
      var rows = copy('TITLE').split('\n');
      title.appendChild(node('b', null, rows[0]));
      if (rows[1]) title.appendChild(node('span', null, rows[1]));
      card.appendChild(title);
      card.appendChild(node('p', 'intro-lede', copy('LEDE')));
      var go = node('a', 'cta intro-go'); go.innerHTML = '<span class="say"></span>';
      go.dataset.sceneLink = 'zero'; go.href = ArkUI.route.href(ArkUI.pageCatalog.zero.path);
      go.firstChild.appendChild(document.createTextNode(copy('CTA') + ' ')); go.firstChild.insertAdjacentHTML('beforeend', ARROW);
      card.appendChild(go);
      slot.appendChild(card);
      /* the counts, bottom right: a ledger of three figures read from the data files, and the note that says
         where they come from. It slides in from the right, like home's rail (ArkUI.worldRise reads data-rise="side";
         never the class .rail, which js/world/rail-capabilities.js fills with home's fleet on load). */
      var list = counts();
      if (list.length) {
        var ledger = node('aside', 'intro-ledger rise'); ledger.setAttribute('data-ui', ''); ledger.dataset.rise = 'side';
        ledger.setAttribute('aria-label', 'The network in numbers');
        var strip = node('dl', 'intro-strip');
        list.forEach(function (c) {
          var cell = node('div'); cell.appendChild(node('dd', null, String(c[1]))); cell.appendChild(node('dt', null, copy(c[0]))); strip.appendChild(cell);
        });
        ledger.appendChild(strip);
        ledger.appendChild(node('small', 'intro-note mono', copy('NOTE')));
        slot.appendChild(ledger);
      }
      /* the scrim under the words is a MaskLayer (css/cutouts.css .mk-scrim): dark behind the text, with a soft
         elliptical KNOCKOUT over the network, so the 3D there stays at full brightness instead of being dimmed too */
      var scrim = node('div', 'mk-scrim intro-scrim'); scrim.setAttribute('aria-hidden', 'true');
      page.appendChild(stage); page.appendChild(scrim); page.appendChild(doors()); page.appendChild(slot);
      /* the CMS's insertion point for reusable blocks (js/content/components.js): empty, and out of the layout */
      var anchor = node('div', 'world-insert'); anchor.setAttribute('data-ark-insert', 'main'); page.appendChild(anchor);
      host.appendChild(page);
      return page;
    }
  };
})();

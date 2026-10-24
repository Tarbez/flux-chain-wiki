/* /: home, standing on the 3D world (js/world/world-host.js).

   REDUCTION TEST
   1 About: DEFXN is an open world of networks and chains under one set of rules, and you can run a node.
   2 Dominant action: Explore a record (the outlined main action; the Measured rail's own action is a second
     choice for those who want the numbers first).
   3 Know now: what DEFXN is in two sentences; the three things you can do; one dated benchmark run, named by
     what it counts, and what each capability checks.
   4 Hidden until asked: each capability's checked cases and its plain words (a pick in the rail).
   5 Repeated elsewhere: nothing. The kind labels live only in the 3D.
   6 Only because the data has it: the fleet run and the capability list (js/content/capabilities-data.js).
   7 Removable without changing the decision: nothing further.
   8 Leaving keeps state: the chosen capability resets; the address is the page.
   9 Returning: the world is already there; the camera flies back to the network.
   10 If WebGL is missing: the words, the three actions and the rail all work without the 3D.

   The words are the home manifest's (HOME.WORLD.*, read by ArkCopy). The 3D behind them is the world; the
   page only leaves it room (js/world/world-host.js reads this page's .copy, .lede and .rail to size the network
   it flies to). The three actions and the rail's action are links into the site's own pages.
   Layout: css/world-pages.css. Motion: every .rise item rises in and leaves by transform and clip, with the
   timings of ArkWorld.motion (ArkUI.worldRise); nothing fades.

   This page replaces the Ark block home. The block page, its layout-key pins and its tab views are gone with
   it; the pages it pointed at (/chain, /about, /explore, /stats) are the targets now. */
(function () {
  'use strict';
  var ARROW = '<svg viewBox="0 0 26 20" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M1 10h23M15 1l9 9-9 9"/></svg>';
  var ICON = {
    trace: '<svg viewBox="0 0 34 36" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M17 2l15 8v16l-15 8-15-8V10z"/><path d="M2 10l15 8 15-8M17 18v16"/></svg>',
    verify: '<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M18 3l15 7-15 7-15-7z"/><path d="M3 18l15 7 15-7M3 26l15 7 15-7"/></svg>',
    understand: '<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="18" cy="7" r="4.5"/><circle cx="7" cy="28" r="4.5"/><circle cx="29" cy="28" r="4.5"/><path d="M15.6 10.8L9.4 24.2M20.4 10.8l6.2 13.4M11.5 28h13"/></svg>'
  };
  function copy(role) { return ArkCopy.text('HOME.WORLD.' + role); }
  function node(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }
  /* a link field (route:<key>) becomes a link the router follows; anything else is a plain address */
  function link(a, role) {
    var value = copy(role), tagged = /^route:(\S+)$/.exec(value);
    if (tagged) { a.dataset.sceneLink = tagged[1]; a.href = ArkUI.pageCatalog[tagged[1]] ? ArkUI.route.href(ArkUI.pageCatalog[tagged[1]].path) : '#'; }
    else a.href = value.replace(/^(url|doc):/, '');
    return a;
  }
  function path(kind, role) {
    var a = link(node('a'), role + '.HREF');
    a.innerHTML = ICON[kind];
    var words = node('span'); words.appendChild(node('b', null, copy(role + '.TITLE'))); words.appendChild(node('small', null, copy(role + '.LINE')));
    a.appendChild(words);
    return a;
  }

  ArkUI.pageModules.zero = {
    mount: function (host) {
      var page = node('section', 'world-page home-world');
      page.setAttribute('data-world-home', '');
      page.setAttribute('aria-labelledby', 'home-title');

      var lead = node('section', 'lead'), copyBox = node('div', 'copy');
      var eyebrow = node('p', 'eyebrow mono rise'); eyebrow.setAttribute('data-ui', '');
      eyebrow.appendChild(node('i')); eyebrow.appendChild(node('b', 'dash')); eyebrow.appendChild(document.createTextNode(copy('EYEBROW')));
      /* the heading: one row per line of the field; the last row is the accent */
      var h1 = node('h1', 'rise'); h1.id = 'home-title'; h1.setAttribute('data-ui', '');
      var rows = copy('TITLE').split('\n');
      rows.forEach(function (row, i) {
        h1.appendChild(node(i === rows.length - 1 && rows.length > 1 ? 'span' : 'b', null, row));
        if (i < rows.length - 1) h1.appendChild(document.createTextNode(' '));
      });
      var lede = node('p', 'lede rise'); lede.setAttribute('data-ui', '');
      lede.appendChild(node('span', null, copy('LEDE1'))); lede.appendChild(document.createTextNode(' ')); lede.appendChild(node('span', null, copy('LEDE2')));
      var cta = link(node('a', 'cta quiet rise'), 'CTA.HREF'); cta.innerHTML = '<span class="say"></span>';
      cta.firstChild.appendChild(document.createTextNode(copy('CTA') + ' ')); cta.firstChild.insertAdjacentHTML('beforeend', ARROW);
      var paths = node('nav', 'paths rise'); paths.setAttribute('aria-label', copy('PATHS.LABEL'));
      paths.appendChild(path('trace', 'TRACE')); paths.appendChild(path('verify', 'VERIFY')); paths.appendChild(path('understand', 'UNDERSTAND'));
      [eyebrow, h1, lede, cta, paths].forEach(function (el) { copyBox.appendChild(el); });
      lead.appendChild(copyBox); page.appendChild(lead);

      /* the Measured rail: js/world/rail-capabilities.js fills it from js/content/capabilities-data.js */
      var rail = node('aside', 'rail rise'); rail.setAttribute('aria-labelledby', 'home-measured');
      rail.innerHTML = '<svg class="rail-line" viewBox="0 0 60 1000" preserveAspectRatio="none" fill="none" stroke="currentColor" stroke-width="2.5" vector-effect="non-scaling-stroke" aria-hidden="true"><path d="M0 0 L30 45 L30 955 L60 1000" vector-effect="non-scaling-stroke"/></svg>' +
        '<div class="rail-head"><i></i><span class="mono" id="home-measured"></span><p><span class="rail-line-text"></span> <span data-cap="summary"></span></p></div>' +
        '<section class="rx-fleet" data-cap="fleet"></section>' +
        '<section class="rx-caps"><div class="rx-row"><h3 class="mono"></h3><span class="rx-count" data-cap="count"></span></div><div class="rx-stack" data-cap="stack" aria-hidden="true"></div><ol class="rx-grid" data-cap="list"></ol></section>' +
        '<section class="rx-focus" data-cap="focus" aria-live="polite"></section>';
      rail.querySelector('#home-measured').textContent = copy('RAIL.TITLE');
      rail.querySelector('.rail-line-text').textContent = copy('RAIL.LINE');
      rail.querySelector('.rx-caps h3').textContent = copy('RAIL.CAPS');
      rail.querySelector('.rx-caps').setAttribute('aria-label', copy('RAIL.CAPS'));
      rail.querySelector('.rx-fleet').setAttribute('aria-label', copy('RAIL.FLEET'));
      var railCta = link(node('a', 'cta small rail-cta'), 'RAIL.HREF'); railCta.innerHTML = '<span class="say"></span>';
      railCta.firstChild.appendChild(document.createTextNode(copy('RAIL.CTA') + ' ')); railCta.firstChild.insertAdjacentHTML('beforeend', ARROW);
      rail.appendChild(railCta);
      page.appendChild(rail);
      host.appendChild(page);

      if (window.DEFXNRail) DEFXNRail.mount(rail, {
        fleet: copy('RAIL.FLEET'), oneRun: copy('RAIL.ONERUN'), nodes: copy('RAIL.NODES'), checked: copy('RAIL.CHECKED'), checkedCases: copy('RAIL.CHECKEDCASES'),
        inFocus: copy('RAIL.INFOCUS'), of: copy('RAIL.OF'), speed: copy('RAIL.SPEED'), notMeasured: copy('RAIL.NOTMEASURED'), noWords: copy('RAIL.NOWORDS'),
        counts: { 'ops/s': copy('RAIL.OPS'), 'swaps/s': copy('RAIL.SWAPS'), 'transfers/s': copy('RAIL.TRANSFERS'), 'records/s': copy('RAIL.RECORDS') }
      });
      return page;
    }
  };
})();

/* /: home (the 'zero' route). Layer: app (the defxn site). The home is the space itself, in the shared game layout
   (css/space-frame.css, the .hud classes of docs/design/space/SPACE.md "The page layout"): kicker, heading and one line
   top left, three counts top right, the networks and the one action in the dock. The middle is the 3D's; its show is
   js/space/shows/zero.mjs.

   REDUCTION TEST
   1 About: DEFXN is a grid of networks you can move through.
   2 Dominant action: the one .hud-go ("See the networks") flies to the first network (ArkSpace.focus); with no space it
     follows its route (HOME.WORLD.CTA.HREF).
   3 Know now: what DEFXN is in one heading and one line, and how many resolvers a node reports (or "No node answered").
   4 Hidden until asked: everything about a place. The space's focus card shows it once the visitor picks one.
   5 Repeated elsewhere: nothing. The map, the path and the hover label are the space's parts.
   6 Only because the data has it: the network chips are ArkSpace.targets() of kind 'network'; the one count is read live
     from /api/fleet-resolvers (STATS_LIVE). None is typed here.
   7 Removable without changing the decision: nothing further.
   8 Leaving keeps state: the address is the page; the space keeps its own focus.
   9 Returning: the space is already standing; the chips fill at once.
   10 If WebGL or the space is missing: the heading, the line and the action still work; the chip row stays empty.

   Kept hooks: data-world-home, .home-world, the h1 #home-title, .lede (world-host.js sizes its flight from h1 and .lede),
   .home-nets/.home-net and the data-ark-insert anchor for the CMS. Removed 2026-11-05: nothing a visitor used; the column
   became the HUD. Styles: css/space-home.css (a page sheet: the page loader takes css/<name>.css only). */
(function () {
  'use strict';
  function copy(role) { return ArkCopy.text('HOME.WORLD.' + role); }
  function node(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }
  /* the fallback address: a route:<key> field becomes a link the router follows; anything else is a plain address */
  function link(a, role) {
    var value = copy(role), tagged = /^route:(\S+)$/.exec(value);
    if (tagged) { a.dataset.sceneLink = tagged[1]; a.href = ArkUI.pageCatalog[tagged[1]] ? ArkUI.route.href(ArkUI.pageCatalog[tagged[1]].path) : '#'; }
    else a.href = value.replace(/^(url|doc):/, '');
    return a;
  }
  function networks(space) {
    return space.targets().filter(function (t) { return t.kind === 'network'; }).slice(0, 3);
  }
  /* 2026-11-10 (owner, docs/design/space/CLAIMS-AUDIT-2026-11-10.md): no count is typed or drawn from a picture. The
     Networks and Chains counts were the rings of the network picture (kinds, not chains), so they left. The one count is
     Resolvers, read live: the resolvers a node reported in its STATS_LIVE window, through /api/fleet-resolvers
     (scripts/lib/fleet-stats.mjs; docs/stats/LIVE-DATA-CONTRACT.md). No answer, or no resolver in the window, shows
     "No node answered", never 0 and never a typed number. */
  function liveResolvers() {
    if (typeof fetch !== 'function') return Promise.resolve(null);
    return fetch('/api/fleet-resolvers', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (body) {
      var R = body && body.ok !== false && body.resolvers && typeof body.resolvers === 'object' ? body.resolvers : null;
      return R && Object.keys(R).length ? Object.keys(R).length : null;
    }, function () { return null; });
  }
  /* what each stat counts, as a name ArkUI.placeResponse (js/pages/intro.js) turns into places */
  var STAT_PLACE = { Resolvers: 'kernel' };
  /* the shared response lives in intro.js; load it if the home was reached first */
  function withResponse(fn) {
    if (ArkUI.placeResponse) return fn();
    if (ArkUI.loadScript) ArkUI.loadScript('js/pages/intro.js').then(function () { if (ArkUI.placeResponse) fn(); }, function () {});
  }
  function fillStats(box) {
    liveResolvers().then(function (n) {
      var stat = node('div', 'hud-stat');
      if (n) {
        var b = node('b', null, String(n));
        stat.append(b, node('span', null, 'Resolvers'));
        stat.tabIndex = 0;
        withResponse(function () { ArkUI.placeResponse(stat, STAT_PLACE.Resolvers, true); ArkUI.rollIn(b); });
      } else {
        stat.classList.add('is-absent');
        stat.append(node('span', null, 'Resolvers: No node answered'));
      }
      box.appendChild(stat);
    });
  }

  ArkUI.pageModules.zero = {
    mount: function (host) {
      var page = node('section', 'hud world-page home-world home-space');
      page.setAttribute('data-world-home', '');
      page.setAttribute('aria-labelledby', 'home-title');

      var left = node('div', 'hud-left');
      left.appendChild(node('p', 'hud-kicker', 'DEFXN'));
      /* the heading keeps its line breaks as spaces: one short heading, never a stacked poster */
      var h1 = node('h1', 'hud-title home-title', copy('TITLE').split('\n').join(' ')); h1.id = 'home-title';
      /* one line: the first sentence of the field, so the line is derived from the copy and never retyped here */
      var lede = node('p', 'hud-answer lede', (copy('LEDE1').match(/^[^.!?]*[.!?]/) || [copy('LEDE1')])[0]);
      left.appendChild(h1); left.appendChild(lede);

      var right = node('div', 'hud-right');
      var stats = node('div', 'hud-stats'); right.appendChild(stats);

      var dock = node('div', 'hud-dock');
      var row = node('nav', 'home-nets'); row.setAttribute('aria-label', copy('NETS.LABEL'));
      var cta = link(node('a', 'hud-go home-cta'), 'CTA.HREF'); cta.textContent = copy('NETS.CTA');
      dock.appendChild(row); dock.appendChild(cta);

      [left, right, dock].forEach(function (el) { page.appendChild(el); });
      var anchor = node('div', 'world-insert'); anchor.setAttribute('data-ark-insert', 'main'); page.appendChild(anchor);
      host.appendChild(page);

      fillStats(stats);

      var space = window.ArkSpace;
      if (space && space.whenReady) space.whenReady(function (s) {
        var nets = networks(s);
        /* with the space standing, the action flies to the first network instead of leaving the page */
        if (nets.length) cta.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); s.focus(nets[0].id); }, true);
        nets.forEach(function (net) {
          var b = node('button', 'hud-chip home-net'); b.type = 'button';
          var dot = node('i', 'dot'); dot.setAttribute('aria-hidden', 'true');
          if (net.token) dot.style.background = 'hsl(var(' + net.token + '))';
          b.appendChild(dot); b.appendChild(node('span', null, net.short || net.name.split(' · ')[0]));
          b.title = net.name;
          b.addEventListener('click', function () { s.focus(net.id); });
          b.addEventListener('pointerenter', function () { s.hover(net.id); });
          b.addEventListener('pointerleave', function () { s.hover(null); });
          row.appendChild(b);
        });
      });
      return page;
    }
  };
})();

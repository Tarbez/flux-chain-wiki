/* /download: Get FXN Browser. Layer: app (the defxn site).

   2026-11-05: the page stands on the space in the shared game layout (css/space-frame.css, the .hud classes of
   docs/design/space/SPACE.md "The page layout"). Its show (js/space/shows/download.mjs) drops a node into the grid and
   lights the network it joins; the page around it is:
     .hud-left   kicker, title, the lede, two tabs (Apps, Run a node) and the open tab in .hud-body
     .hud-right  three counts from this file's own lists, and the page's links (FXN ID, the guide, the Bundle Deployer, next)
     .hud-dock   one chip per step of running a node, and the one .hud-go "Get FXN Browser"
   An app links its download once DOWNLOAD.APP.<KEY>.URL holds an https:// address; until then it says so, and the .hud-go
   opens the Apps tab instead of a link that goes nowhere. Every step stays addressable (?step=N).
   Removed then: the story template (depth views, boundary, figure, pager), the browser and FXN ID picture, the step
   player (the show replaces it) and the layout pins (WAS). tests/resolver-guide-blocks.cjs and the layout-continuity
   census pinned those and will fail until the owner confirms this design. Words stay in the download manifest. */
(function () {
  'use strict';

  /* What each step looks like at the terminal. Commands and defaults come from docs/operators. */
  var TERMINAL = [
    { lines: ['node --version', 'npm --version'], expect: 'v22 or newer, with npm on the path' },
    { lines: ['cd /path/to/ark-miner-cli', 'npm install', 'cp .env.example .env', 'npm start'], expect: 'Review .env before npm start' },
    { checks: [['Process', 'Stays running'], ['Status', '127.0.0.1:8766 (default)'], ['Record', 'Revision, version, config, time']] },
    { proves: ['Local startup'], not: ['Public-network membership', 'Deployed resolver capacity', 'Independent-host readiness', 'Production activation'] },
    { lines: ['flux-network network list', 'flux-network network create "my-network"', 'FLUX_MINER_NETWORK=<network-id> flux-miner start'], expect: 'Networks partition presence only' }
  ];
  /* the browser's own apps only (owner, 2026-10-25: "focus on the product"); the miner apps live with the operator guide */
  var APPS = ['BROWSER', 'MOBILE'];

  function node(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }
  /* a manifest address (route:, doc:, url: or plain) as an href, through the one resolver the blocks use */
  function hrefOf(value, from) {
    if (ArkUI.blocks && ArkUI.blocks.resolveHref) return ArkUI.blocks.resolveHref(value, from);
    var tagged = /^route:(\S+)$/.exec(value);
    if (tagged && ArkUI.pageCatalog[tagged[1]]) return ArkUI.route.href(ArkUI.pageCatalog[tagged[1]].path);
    return String(value).replace(/^(url|doc):/, '');
  }

  ArkUI.pageModules.download = {
    mount: function (host) {
      var manifest = ArkManifest.get('download');
      function words(key) { return ArkCopy.text('DOWNLOAD.' + key); }
      function stepTitle(i) { return words('POINT' + (i + 1) + '.TITLE').replace(/^\d+\.\s*/, '').replace(/\.$/, ''); }
      var count = TERMINAL.length, active = 0, tab = 'apps';
      var apps = APPS.map(function (key) {
        var url = words('APP.' + key + '.URL');
        return { key: key, name: words('APP.' + key + '.NAME'), platforms: words('APP.' + key + '.PLATFORMS'), url: /^https:\/\//.test(url) ? url : '' };
      });

      /* 2026-11-11 (owner: "follow the same UI as the new home page"): the page wears the home (.home-wear, css/world-pages.css "the remaining
         pages"). Its kicker, title, lede and one button carry the home's own classes beside the HUD's, so the home's rules draw them */
      var page = node('section', 'hud download-page home-wear');
      page.setAttribute('aria-labelledby', 'download-title');

      var left = node('div', 'hud-left');
      left.appendChild(node('p', 'hud-kicker intro-portal-eyebrow', 'Download'));
      var title = node('h1', 'hud-title intro-portal-headline', words('TITLE')); title.id = 'download-title';
      left.appendChild(title);
      left.appendChild(node('p', 'hud-answer intro-portal-line', words('LEDE')));
      var tabs = node('div', 'hud-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Sections');
      var body = node('div', 'hud-body'); body.setAttribute('role', 'tabpanel'); body.setAttribute('aria-live', 'polite');
      left.appendChild(tabs); left.appendChild(body);
      var tabFor = {};
      /* 2026-11-10 (owner, CLAIMS-AUDIT-2026-11-10): the "Run a node" tab, its five steps, its count and the operator guide link left.
         They ran the old ark-miner-cli, not the devnet release node. TERMINAL stays for the release operator guide to replace. */
      [['apps', words('APPS.TITLE')]].forEach(function (t) {
        var b = node('button', 'hud-chip', t[1]); b.type = 'button'; b.setAttribute('role', 'tab');
        b.addEventListener('click', function () { show(t[0]); });
        tabs.appendChild(b); tabFor[t[0]] = b;
      });

      /* the counts, read from the list above: none is typed; no published app reads "Not published yet", never 0 */
      var right = node('div', 'hud-right'), stats = node('div', 'hud-stats'), published = apps.filter(function (a) { return a.url; }).length;
      [[String(apps.length), 'Apps'], published ? [String(published), 'Published'] : ['', 'Not published yet']].forEach(function (c) {
        var stat = node('div', 'hud-stat'); if (c[0]) stat.appendChild(node('b', null, c[0])); stat.appendChild(node('span', null, c[1])); stats.appendChild(stat);
      });
      var actions = node('nav', 'hud-actions'); actions.setAttribute('aria-label', 'Go further');
      /* word law (owner, 2026-11-09): "Initiate FXN ID", the bar's own words (NAV.BAR.INITIATE), never "create" */
      [[ArkCopy.text('NAV.BAR.INITIATE'), 'route:account'],
        ['Deploy a site with the Bundle Deployer', words('ASIDE.HREF')], [ArkUI.sentenceCase(words('NEXT')), 'route:' + manifest.meta.next]].forEach(function (l) {
        var a = node('a', 'hud-chip', l[0]); a.href = hrefOf(l[1], manifest.route);
        var tagged = /^route:(\S+)$/.exec(l[1]); if (tagged) a.dataset.sceneLink = tagged[1];
        actions.appendChild(a);
      });
      right.appendChild(stats); right.appendChild(actions);

      /* the dock: the one action (the step chips left with the "Run a node" tab) */
      var dock = node('div', 'hud-dock'), chips = [];
      var browser = apps.filter(function (a) { return a.key === 'BROWSER'; })[0];
      var go = node(browser && browser.url ? 'a' : 'button', 'hud-go intro-portal-enter', 'Get FXN Browser');
      if (browser && browser.url) go.href = browser.url;
      else { go.type = 'button'; go.addEventListener('click', function () { show('apps'); }); }
      dock.appendChild(go);

      /* Copy is the site's one (js/ark/page-kit.js ArkUI.copyCommand), the control /deploy uses; its words follow the step */
      var copier = ArkUI.copyCommand ? ArkUI.copyCommand({ text: function () { return (TERMINAL[active].lines || []).join('\n'); }, noun: 'commands' }) : null;

      function paintApps() {
        var ul = node('ul', 'download-apps');
        apps.forEach(function (app) {
          var li = node('li', 'hud-card');
          li.appendChild(node('b', null, app.platforms)); li.appendChild(node('span', null, ' · ' + app.name));
          if (app.url) { var a = node('a', null, 'Download'); a.href = app.url; li.appendChild(node('br')); li.appendChild(a); }
          else li.appendChild(node('p', 'download-status', 'Not published yet'));
          ul.appendChild(li);
        });
        body.appendChild(ul);
        body.appendChild(node('p', 'download-note', words('APPS.NOTE')));
      }
      function paintStep() {
        var t = TERMINAL[active];
        body.appendChild(node('p', 'hud-kicker', 'Step ' + (active + 1) + ' of ' + count));
        body.appendChild(node('h2', 'download-step-title', stepTitle(active)));
        body.appendChild(node('p', 'download-step-text', words('POINT' + (active + 1) + '.TEXT')));
        if (t.lines) {
          var pre = node('pre', 'download-code');
          t.lines.forEach(function (line) { pre.appendChild(node('code', null, line)); });
          body.appendChild(pre);
          if (copier) { copier.setName('commands for ' + stepTitle(active)); body.appendChild(copier.element); body.appendChild(copier.status); }
        } else if (t.checks) {
          var dl = node('dl', 'download-checks');
          t.checks.forEach(function (pair) { dl.appendChild(node('dt', null, pair[0])); dl.appendChild(node('dd', null, pair[1])); });
          body.appendChild(dl);
        } else {
          [['Proves', t.proves], ['Does not prove', t.not]].forEach(function (g) {
            body.appendChild(node('p', 'hud-kicker', g[0]));
            var ul = node('ul', 'download-proves'); g[1].forEach(function (x) { ul.appendChild(node('li', null, x)); }); body.appendChild(ul);
          });
        }
        if (t.expect) body.appendChild(node('p', 'download-expect', t.expect));
      }
      function show(which) {
        tab = which;
        Object.keys(tabFor).forEach(function (k) { tabFor[k].setAttribute('aria-selected', k === tab ? 'true' : 'false'); });
        chips.forEach(function (c, n) { c.setAttribute('aria-current', tab === 'node' && n === active ? 'step' : 'false'); });
        body.textContent = '';
        if (tab === 'apps') paintApps(); else paintStep();
        body.scrollTop = 0;
      }
      function select(index, write) {
        active = Math.max(0, Math.min(count - 1, index));
        show('node');
        if (write) ArkUI.route.write(ArkUI.pageCatalog.download.path, 'step=' + active, 'push');
      }

      /* the dock stands inside the words column (2026-11-11), so the one button comes under the lede, as on the home and on /auth. Placement
         only: the same node with the same listener */
      left.appendChild(dock);
      [left, right].forEach(function (el) { page.appendChild(el); });
      var anchor = node('div'); anchor.setAttribute('data-ark-insert', 'main'); page.appendChild(anchor);
      host.appendChild(page);

      show('apps');   /* an old ?step= link opens the apps */
      page.downloadSelect = select;
      return page;
    }
  };
})();

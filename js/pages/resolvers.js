/* /resolvers · Resolvers and capabilities.
 *
 * Every fact on this page comes from js/content/registry-snapshot.js, which
 * scripts/snapshot-registry.mjs generates from the code that defines each
 * resolver and capability (defxn-defi-rs), plus the last recorded
 * development-network observation. Nothing here is typed by hand: not the
 * counts, not the chain ids, not what a resolver composes. The words live in
 * js/content/manifests/resolver.js (REGISTRY.*), beside the hub that explains
 * them.
 *
 * The snapshot is dated and says so; it is never presented as live. A fact
 * the sources do not hold (a resolver's control key, how many providers
 * announce right now) is shown as a dash and sent to Explore, which reads a
 * node -- never as 0.
 *
 * Until 2026-10-19 this page was a hand-written directory of six
 * applications (js/content/resolver-registry.js). They are not resolver
 * chains; they stay, collapsed, under their own heading
 * (js/content/resolver-applications.js).
 */
(function () {
  'use strict';

  var EXPLORE = 'https://explore.defxn.com';

  function words(role) { return ArkCopy.text('RESOLVER.' + role); }
  function el(tag, cls, text) { return ArkUI.el(tag, cls, text); }
  function short(hex, n) { return hex ? String(hex).slice(0, n || 12) : '—'; }
  function absent() { return el('span', 'registry-dash', '—'); }
  /* One literal per hand-built class (docs/ux-audit/component-census-baseline.tsv must never
     rise): a full-width tile and a tile's prose are spelled once, here, and reused. */
  function wide(cls, label, id) { return tile('stats-span-12' + (cls ? ' ' + cls : ''), label, id); }
  function statusChip(ok, text) { return el('span', 'resolver-status ' + (ok ? 'is-ok' : 'is-warn'), text); }
  function prose(text) { return el('p', 'stats-tile-copy', text); }
  function tile(cls, label, id) {
    var t = el('article', 'stats-tile ' + cls);
    if (label) { var l = el('p', 'stats-tile-label', label); if (id) { l.id = id; t.setAttribute('aria-labelledby', id); } t.appendChild(l); }
    return t;
  }
  function chips(list) {
    if (!list || !list.length) return absent();
    var wrap = el('span', 'registry-uses');
    list.forEach(function (item) { wrap.appendChild(el('code', '', item)); });
    return wrap;
  }
  function explorerLink(chainId) {
    var a = el('a', 'registry-open', words('REGISTRY.OPEN') + ' ↗');
    a.href = EXPLORE + '/#' + encodeURIComponent(chainId);
    a.target = '_blank'; a.rel = 'noopener';
    a.setAttribute('aria-label', words('REGISTRY.OPEN') + ': ' + chainId);
    return a;
  }
  function table(caption, heads, rows) {
    var wrap = el('div', 'registry-scroll');
    var t = el('table', '');
    t.appendChild(el('caption', 'visually-hidden', caption));
    var tr = el('tr', '');
    heads.forEach(function (h) { var th = el('th', '', h); th.scope = 'col'; tr.appendChild(th); });
    var thead = el('thead', ''); thead.appendChild(tr); t.appendChild(thead);
    var body = el('tbody', '');
    rows.forEach(function (cells) {
      var row = el('tr', '');
      cells.forEach(function (cell, i) {
        var td = el(i === 0 ? 'th' : 'td', '');
        if (i === 0) td.scope = 'row';
        if (cell && typeof cell === 'object' && cell.nodeType) td.appendChild(cell); else td.textContent = cell;
        row.appendChild(td);
      });
      body.appendChild(row);
    });
    t.appendChild(body); wrap.appendChild(t);
    return wrap;
  }
  function grammarChip(state) {
    var c = statusChip(state === 'enforced', state === 'enforced' ? 'Grammar enforced' : 'Unspecified (legacy)');
    return c;
  }

  ArkUI.pageModules.resolvers = {
    mount: function (host) {
      var snap = window.ArkRegistrySnapshot;
      var apps = window.ArkResolverApplications;
      var page = el('section', 'ark-page task-page stats-page resolvers-page');
      page.setAttribute('aria-labelledby', 'resolvers-title');
      var shell = el('div', 'stats-shell'), bento = el('div', 'stats-bento');
      shell.appendChild(bento); page.appendChild(shell);

      // ---- hero: what this is, and exactly which commit and observation it is ------------------
      var hero = tile('stats-hero');
      hero.appendChild(el('p', 'stats-kicker', words('REGISTRY.KICKER')));
      var h1 = el('h1', '', words('REGISTRY.TITLE')); h1.id = 'resolvers-title'; hero.appendChild(h1);
      hero.appendChild(el('p', '', words('REGISTRY.LEDE')));
      var heroChips = el('p', 'stats-chips');
      if (snap) {
        heroChips.appendChild(el('span', '', 'Snapshot · ' + snap.source.repo.replace(/^flux\//, '') + ' ' + short(snap.source.commit, 7) + ' · ' + snap.source.commitDate));
        heroChips.appendChild(el('span', '', 'Development network · ' + snap.observation.date));
      }
      var live = el('a', 'registry-live', 'Live view · explore.defxn.com ↗');
      live.href = EXPLORE; live.target = '_blank'; live.rel = 'noopener';
      heroChips.appendChild(live);
      hero.appendChild(heroChips);
      bento.appendChild(hero);

      if (!snap) {
        // A refusal that names what it needs, never an empty table that reads as "no resolvers".
        var missing = wide('');
        missing.appendChild(prose('The registry snapshot did not load, so no resolver is listed here. Missing: js/content/registry-snapshot.js. Remedy: node scripts/snapshot-registry.mjs --write, or read the live list in Explore.'));
        bento.appendChild(missing);
      } else {
        var counts = snap.counts, obs = snap.observation;

        // ---- counts, each with what it counts --------------------------------------------------
        var countTile = tile('stats-span-5 registry-counts');
        [[counts.nativeResolverChains, 'native resolver chains'], [counts.bridgeChains, 'bridge chains'], [counts.capabilities, 'capability manifests']].forEach(function (pair) {
          var row = el('p', 'registry-count');
          row.appendChild(el('strong', '', String(pair[0])));
          row.appendChild(el('span', '', pair[1]));
          countTile.appendChild(row);
        });
        countTile.appendChild(el('p', 'registry-count-source', 'In source at ' + short(snap.source.commit, 7) + '. The development network listed ' + obs.resolverChainsListed + ' resolver chains' + (obs.allNative ? ', all native,' : '') + ' on ' + obs.date + '.'));
        bento.appendChild(countTile);

        // ---- resolver chains --------------------------------------------------------------------
        var chains = wide('registry-chains', words('REGISTRY.CHAINS.LABEL'), 'registry-chains-label');
        chains.appendChild(el('h2', '', counts.nativeResolverChains + ' first-party resolver chains, each launched by one record'));
        chains.appendChild(prose(words('REGISTRY.CHAINS.BODY')));
        chains.appendChild(table('Resolver chains in the snapshot', ['Chain id', 'Resolver', 'Built from', 'Grammar', 'Control', ''], snap.resolvers.map(function (r) {
          return [el('code', '', r.chainId), r.name, chips(r.composes), grammarChip(r.grammar), r.control ? el('code', '', short(r.control)) : absent(), explorerLink(r.chainId)];
        })));
        chains.appendChild(el('p', 'registry-footnote', 'Grammar state is the source manifest at ' + short(snap.source.commit, 7) + '; the development network was launched before it and was not re-read. Control key and announcing providers are not in the sources: read them in Explore.'));
        bento.appendChild(chains);

        // ---- capabilities -----------------------------------------------------------------------
        var caps = wide('registry-caps', words('REGISTRY.CAPS.LABEL'), 'registry-caps-label');
        caps.appendChild(el('h2', '', counts.capabilities + ' capability manifests, derived from their crates’ own tests'));
        caps.appendChild(prose(words('REGISTRY.CAPS.BODY')));
        // A measured zero is said as a measured zero; only an absent reading would be a dash.
        if (obs.capabilitiesLaunched === 0) caps.appendChild(el('p', 'registry-zero', words('REGISTRY.CAPS.EMPTY')));
        else if (typeof obs.capabilitiesLaunched === 'number') caps.appendChild(el('p', 'registry-zero', 'Launched on the development network at its last recorded restart: ' + obs.capabilitiesLaunched + '.'));
        caps.appendChild(table('Capability manifests in the snapshot', ['Capability', 'Version', 'Test vectors', 'Source hash', 'Used by'], snap.capabilities.map(function (c) {
          return [el('code', '', c.id), c.version, String(c.vectors), el('code', '', short(c.sourceHash)), chips(c.usedBy)];
        })));
        bento.appendChild(caps);

        // ---- bridge chains (collapsed: secondary) ----------------------------------------------
        var bridges = wide('registry-bridges');
        var bridgeBox = el('details', 'registry-fold');
        bridgeBox.appendChild(el('summary', '', words('REGISTRY.BRIDGES.LABEL') + ' · ' + counts.bridgeChains));
        bridgeBox.appendChild(prose(words('REGISTRY.BRIDGES.BODY')));
        bridgeBox.appendChild(table('Bridge chains in the snapshot', ['Chain id', 'Product', 'Through', 'Records', 'Note'], snap.bridges.map(function (b) {
          return [el('code', '', b.chainId), b.name, b.via, chips(b.records), b.note];
        })));
        bridges.appendChild(bridgeBox);
        bento.appendChild(bridges);
      }

      // ---- deploy your own (the short version; the walkthrough is /how-deployment-works) --------
      var deploy = wide('stats-scope', words('REGISTRY.DEPLOY.TITLE'), 'registry-deploy-label');
      var steps = el('ol', 'stats-scope-list is-single');
      words('REGISTRY.DEPLOY.STEPS').split('\n').filter(Boolean).forEach(function (line) { steps.appendChild(el('li', '', line)); });
      deploy.appendChild(steps);
      var actions = el('p', 'registry-ways');
      actions.appendChild(ArkUI.dash.linkEl(words('REGISTRY.DEPLOY.LINK') + ' →', words('DEPLOY.HREF'), '/resolvers', 'registry-way'));
      actions.appendChild(ArkUI.dash.linkEl(words('DEPLOYER.LINK') + ' ↗', words('DEPLOYER.HREF'), '/resolvers', 'registry-way'));
      actions.appendChild(ArkUI.dash.linkEl('What is a resolver? →', 'route:resolver', '/resolvers', 'registry-way'));
      /* The rest of the resolver journey (js/content/site-pages.js 'build'): this page was a dead
         end with no way on (docs/ux-audit/pages.md P2/"Next-step links"; regression:
         tests/site-exits.cjs). */
      actions.appendChild(ArkUI.dash.linkEl('Resolver math →', 'route:resolver-math', '/resolvers', 'registry-way'));
      actions.appendChild(ArkUI.dash.linkEl('Reference resolvers →', 'route:references', '/resolvers', 'registry-way'));
      actions.appendChild(ArkUI.dash.linkEl('Create or join a network →', 'route:deploy', '/resolvers', 'registry-way'));
      deploy.appendChild(actions);
      deploy.appendChild(el('p', 'registry-footnote', words('PRODUCTS.NOTE')));
      bento.appendChild(deploy);

      // ---- applications that are not resolver chains (collapsed; owner question Q5) -------------
      if (apps && apps.applications && apps.applications.length) {
        var appTile = wide('registry-apps');
        var appBox = el('details', 'registry-fold');
        appBox.appendChild(el('summary', '', words('REGISTRY.APPS.LABEL') + ' · ' + apps.applications.length));
        appBox.appendChild(prose(words('REGISTRY.APPS.BODY') + ' Listed ' + apps.updated + '.'));
        var list = el('ul', 'registry-app-list');
        apps.applications.forEach(function (a) {
          var li = el('li', 'registry-app');
          var head = el('p', 'registry-app-head');
          head.appendChild(el('strong', '', a.name));
          head.appendChild(statusChip(a.status === 'deployed', a.status === 'deployed' ? 'In service' : 'Draft'));
          li.appendChild(head);
          li.appendChild(prose(a.shortSummary));
          if (a.note) li.appendChild(el('p', 'resolver-meta', a.note));
          var m = a.measured || {};
          li.appendChild(el('p', 'resolver-meta', (m.label || 'Measured') + ': ' + (m.rate == null ? '— · ' + (m.source || 'no published benchmark') : Number(m.rate).toLocaleString('en-US') + ' ' + (m.unit || '') + ' · ' + (m.source || ''))));
          if (a.openIssues && a.openIssues.length) li.appendChild(el('p', 'resolver-meta', 'Open issues: ' + a.openIssues.join('; ')));
          list.appendChild(li);
        });
        appBox.appendChild(list);
        appTile.appendChild(appBox);
        bento.appendChild(appTile);
      }

      var boundary = wide('registry-boundary');
      boundary.appendChild(prose(words('REGISTRY.BOUNDARY')));
      bento.appendChild(boundary);

      /* Anchor for reusable content blocks (js/content/components.js); rendering into it is
         centralized in js/main.js's onMount hook, not called here. */
      var anchor = el('div', ''); anchor.setAttribute('data-ark-insert', 'main'); bento.appendChild(anchor);
      host.appendChild(page);
      return page;
    }
  };
})();

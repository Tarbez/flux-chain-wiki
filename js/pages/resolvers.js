/* /resolvers · the directory of FXN resolvers.
 *
 * The chain is agnostic grammar; the resolver interprets payload semantics
 * and OWNS the measured speed for its domain. This page lists every
 * currently published or in-registered-design resolver, each with its own
 * benchmark number, status and open issues. In production this is also
 * the surface backing resolve.defxn.com — the "deploy a resolver" flow
 * routes signed resolver packages here for discovery.
 */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function fmt(n) { return n == null ? '–' : Number(n).toLocaleString('en-US'); }
  function tile(cls, label, body, id) {
    return '<article class="stats-tile ' + cls + '"' + (id ? ' aria-labelledby="' + id + '"' : '') + '>' +
      (label ? '<p class="stats-tile-label"' + (id ? ' id="' + id + '"' : '') + '>' + label + '</p>' : '') +
      body + '</article>';
  }
  function statusChip(status) {
    var map = {
      deployed: ['Deployed', 'is-ok'],
      draft:    ['Draft',    'is-warn'],
      planned:  ['Planned',  'is-faint']
    };
    var pair = map[status] || ['Unknown', 'is-faint'];
    return '<span class="resolver-status ' + pair[1] + '">' + pair[0] + '</span>';
  }
  function measuredRow(m) {
    if (!m || m.rate == null) {
      var reason = (m && m.source) ? m.source : 'no published benchmark';
      return '<div class="resolver-measured is-missing">' +
        '<span class="resolver-measured-label">Measured throughput</span>' +
        '<span class="resolver-measured-value">—</span>' +
        '<span class="resolver-measured-source">' + esc(reason) + '</span></div>';
    }
    var secondary = (m.secondary || []).map(function (s) {
      return '<li>' + esc(s.label) + ' · <strong>' + fmt(s.rate) + '</strong> ' + esc(s.unit || '') + '</li>';
    }).join('');
    return '<div class="resolver-measured">' +
      '<span class="resolver-measured-label">' + esc(m.label) + '</span>' +
      '<span class="resolver-measured-value"><strong>' + fmt(m.rate) + '</strong> ' + esc(m.unit) + '</span>' +
      '<span class="resolver-measured-source">' + esc(m.source) + '</span>' +
      (secondary ? '<ul class="resolver-measured-secondary">' + secondary + '</ul>' : '') +
      '</div>';
  }
  function resolverCard(r) {
    var openIssues = (r.openIssues || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    var yCodes = (r.yCodes || []).map(function (y) { return '<code>' + esc(y) + '</code>'; }).join(' · ');
    return tile('stats-span-6 resolver-card', esc(r.domain || ''),
      '<header class="resolver-head">' +
        '<h3>' + esc(r.name) + '</h3>' +
        statusChip(r.status) +
      '</header>' +
      '<p class="stats-tile-copy">' + esc(r.shortSummary || '') + '</p>' +
      '<p class="resolver-meta"><strong>Y codes:</strong> ' + (yCodes || '<em>none registered</em>') + '</p>' +
      '<p class="resolver-meta"><strong>Implementation:</strong> <code>' + esc(r.implementation || '—') + '</code></p>' +
      '<p class="resolver-meta"><strong>Author:</strong> ' + esc(r.author || '—') + '</p>' +
      measuredRow(r.measured) +
      (openIssues ? '<details class="resolver-issues"><summary>Open issues</summary><ul>' + openIssues + '</ul></details>' : ''),
      'resolver-' + r.slug + '-title');
  }

  ArkUI.pageModules.resolvers = {
    mount: function (host) {
      var registry = window.ArkResolverRegistry || { chain: {}, resolvers: [] };
      var page = document.createElement('section');
      page.className = 'ark-page task-page stats-page resolvers-page';
      page.setAttribute('aria-labelledby', 'resolvers-title');
      var cards = (registry.resolvers || []).map(resolverCard).join('');
      page.innerHTML = '<div class="stats-shell"><div class="stats-bento">' +
        tile('stats-hero', '',
          '<p class="stats-kicker">The chain is agnostic grammar · the resolver carries meaning</p>' +
          '<h1 id="resolvers-title">FXN resolvers</h1>' +
          '<p>A LEDGERENTRY is admitted by the chain if its grammar is well-formed, the signature verifies under <code>G</code>, and the position <code>J</code> extends the holder\'s own chain. Nothing else about the payload is interpreted at the chain level. Each resolver below registers against a <code>Y</code> code (the manifest type) and interprets that payload\'s semantics for its own domain. Speed is per resolver.</p>' +
          '<p class="stats-chips"><span>Updated ' + esc(registry.updated || '') + '</span><span>Future home · resolve.defxn.com</span></p>') +

        tile('stats-span-12 stats-chosen', 'The chain, for context', '<h2>Grammar-only admit path</h2>' +
          '<p class="stats-tile-copy">' + esc(registry.chain.shortSummary || '') + '</p>' +
          '<p class="resolver-meta"><strong>Y codes it carries:</strong> ' + ((registry.chain.yCodes || []).map(function (y) { return '<code>' + esc(y) + '</code>'; }).join(' · ') || '—') + '</p>' +
          measuredRow(registry.chain.measured)) +

        tile('stats-span-12', 'Deployed and in-registered-design resolvers', '<h2>' + (registry.resolvers || []).length + ' resolvers, each with its own measured speed</h2>' +
          '<p class="stats-tile-copy">Different domains, different grammars, different speeds. The DeFi transfer resolver\'s finalized-transfer rate has nothing to do with the PVA resolver\'s record-lookup rate; they share the chain but not the semantics. If a resolver below has no published number, that is honest — nobody has run its benchmark yet, and we say so plainly.</p>') +

        cards +

        tile('stats-span-12 stats-scope', 'Deploy a new resolver', '<h2>How a resolver gets published</h2>' +
          '<ul class="stats-scope-list is-single">' +
            '<li>Pick a free <code>Y</code> code or extend a registered one with a payload variant. The registered grammar lives in <code>flux-spec/registry/manifest-types.json</code>.</li>' +
            '<li>Implement the resolver as a crate or module (Rust for in-process; Node for HTTP). The resolver\'s only job is to interpret payload references and refuse invalid ones. Grammar admission is already handled by the chain.</li>' +
            '<li>Publish a signed resolver manifest (name, version, Y codes claimed, author key, benchmark proof). On the fleet, this is a LEDGERENTRY on a resolver-registry chain; the chain itself is agnostic about which resolver reads which payload.</li>' +
            '<li>Register with the directory so <code>/resolvers</code> (and in time <code>resolve.defxn.com</code>) can list it, link its code, and show its measured speed. Numbers are per resolver; the directory does not aggregate them.</li>' +
            '<li>Open issues are listed next to each resolver, not hidden. A resolver without a benchmark is listed as "no published benchmark" rather than inflated into the chain\'s own numbers.</li>' +
          '</ul>' +
          '<p class="stats-tile-copy">A command-line deployer and the <code>resolve.defxn.com</code> landing surface are the next step. Today this page is read-only from <code>js/content/resolver-registry.js</code>.</p>', 'resolvers-deploy-title') +

        '</div></div>';
      host.appendChild(page);
      return page;
    }
  };
})();

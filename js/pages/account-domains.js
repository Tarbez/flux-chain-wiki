/* Your domains: the names this browser has chosen to follow (see js/ark/local-domains.js for
   why there is no server-side "list my names" query to read instead), each one click from the
   Domains product.

   Explain + hand off (owner decision 2026-10-19, docs/ux-audit/plan.md). Until then each card
   looked its name up here, in the Miner's `names` source -- the GUN names/* registry, which the
   one-name-system law retired (docs/DEFXN-NAMES-ONE-SYSTEM.md: names resolve ONLY through
   dense-wire's signed KDOM records, checked with the one shared verifier) -- and trusted one
   node's answer. Domains looks a name up the lawful way (owner, target, claim, transfer), so
   the lookup is Domains' and this page keeps only what Domains has no place for: the list
   itself (localStorage `defxn-local-domains-v1`, unchanged), the count on /account, and each
   name's live-site link. */
(function () {
  'use strict';

  function text(value, fallback) { return value == null || value === '' ? (fallback || '—') : String(value); }
  /* liveUrl() builds a per-domain external address (a name's live site), not an editorial link. */
  function escapeHtml(value) { return String(value).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  function liveUrl(name) {
    var label = name.replace(/\.fxn$/i, '');
    return label === name ? null : 'https://' + label + '.defxn.com';
  }

  /* `was`: the key each element of the hand-built page had (tests/lib/layout-continuity.cjs against
     tests/fixtures/layout-keys/account-domains.tsv); reasons in tests/task-pages-blocks.cjs. */
  var H = 'page:/div:1/header:1';
  var WAS = {
    'account-domains-crumbs': { 'breadcrumb-item#2': H + '/a:1' },
    'account-domains-hero': { ':root': { key: H, self: true }, eyebrow: H + '/p:1', 'hero-lede': H + '/p:2' },
    'account-domains-track': { 'form': H + '/form:1', '[data-domains-add-status]': H + '/p:3', '[data-domains-handoff]': H + '/div:1' },
    'account-domains-list': { ':root': 'page:/div:1/section:1' },
    insert: 'page:/div:1/div:1'
  };

  /* The page as Ark blocks around its two live parts (DEFXN polish Wave 3, W3-GUIDE): the form that
     tracks a name, with the family's Domains hand-off, and the list of tracked names -- the
     page's own, hand-built because they ARE the page (they read and write this browser's list).
     The crumbs (the old "← Your account" link is the trail's middle step), the heading and the
     ways on are Ark's. */
  function spec() {
    return [
      { block: 'breadcrumb', id: 'account-domains-crumbs', was: WAS['account-domains-crumbs'], props: { label: 'Your place', items: [{ label: 'Home', href: 'route:zero' }, { label: 'Your account', href: 'route:account' }, { label: 'Your domains' }] } },
      { block: 'hero', id: 'account-domains-hero', was: WAS['account-domains-hero'], props: { eyebrow: 'Names you track', title: 'Your domains.', density: 'compact',
        lede: 'This browser keeps the list of names you follow. Who owns each one and where it points is checked in Domains, against the name\u2019s signed records.' } },
      { block: 'custom', id: 'account-domains-track', was: WAS['account-domains-track'], mount: function () {
        var box = document.createElement('div'); box.className = 'account-domains-track';
        box.innerHTML = '<form data-domains-form aria-label="Track a domain"><label for="domainsNameInput">Track an exact name</label><input id="domainsNameInput" type="text" autocomplete="off" placeholder="yourname.fxn" /><button type="submit" class="palette-solid">Track</button></form>' +
          '<p data-domains-add-status role="status" aria-live="polite"></p><div data-domains-handoff></div>';
        return box;
      } },
      { block: 'custom', id: 'account-domains-list', was: WAS['account-domains-list'], mount: function () {
        var box = document.createElement('div');
        box.innerHTML = '<section class="account-domains-list" aria-label="Tracked domains"><p class="account-card-caption">Tracked names <span data-domains-count>(0)</span></p>' +
          '<ul data-domains-items></ul>' +
          '<p class="account-domains-empty" data-domains-empty hidden>No names tracked yet. Add one to keep it one step from Domains.</p></section>';
        return box.firstChild;
      } },
      { insert: 'main', was: WAS.insert },
      { block: 'pager', id: 'account-domains-pager', props: { label: 'Continue', prev: { label: 'Your account', href: 'route:account' },
        related: [{ label: 'Resolve your website', href: 'route:resolutions/website' }, { label: 'FXN Bundle Deployer', href: 'route:bundledeployer' }] } }
    ];
  }

  ArkUI.pageModules.accountDomains = {
    spec: spec,
    mount: function (host) {
      var page = ArkUI.page(spec(), host, { page: 'account/domains', className: 'account-domains-page', titleId: 'account-domains-title' });

      var form = page.querySelector('[data-domains-form]');
      var input = page.querySelector('#domainsNameInput');
      var addStatus = page.querySelector('[data-domains-add-status]');
      var itemsEl = page.querySelector('[data-domains-items]');
      var countEl = page.querySelector('[data-domains-count]');
      var emptyEl = page.querySelector('[data-domains-empty]');
      var handoff = ArkUI.dash.productHandoff && ArkUI.dash.productHandoff({ product: 'domains', text: 'A .fxn name points people to your site or app. Looking a name up, claiming it and pointing it happen in Domains, where every answer is checked.' });
      var handoffHost = page.querySelector('[data-domains-handoff]');
      if (handoff && handoffHost) handoffHost.appendChild(handoff);

      /* each tracked name: open it in Domains (its owner and target, checked there), and its
         live site; no lookup runs here (see the header comment) */
      function renderList(names) {
        countEl.textContent = '(' + names.length + ')';
        emptyEl.hidden = names.length > 0;
        itemsEl.innerHTML = '';
        names.forEach(function (name) {
          var li = document.createElement('li');
          li.className = 'account-domains-item';
          var lookup = ArkUI.dash.productLink && ArkUI.dash.productLink({ product: 'domains', query: { q: name }, label: 'Check in Domains' });
          var live = liveUrl(name);
          li.innerHTML = '<div class="account-domains-item-head"><strong>' + escapeHtml(name) + '</strong><button type="button" data-domains-remove="' + escapeHtml(name) + '">Stop tracking</button></div>' +
            '<p class="account-domains-item-status">' + (lookup ? 'Owner and target are checked in Domains.' : 'Domains is not reachable from this page.') + '</p>' +
            (live ? '<a data-open href="' + escapeHtml(live) + '" target="_blank" rel="noopener">Open ' + escapeHtml(live.replace(/^https:\/\//, '')) + ' \u2197</a>' : '');
          /* the same "Open <Product>" link the overlap pages' handoff carries (the kit's) */
          if (lookup) li.insertBefore(lookup, li.querySelector('[data-open]'));
          itemsEl.appendChild(li);
        });
      }

      itemsEl.addEventListener('click', function (event) {
        var button = event.target.closest && event.target.closest('[data-domains-remove]');
        if (!button) return;
        window.ArkUI.localDomains.remove(button.getAttribute('data-domains-remove'));
      });

      form.addEventListener('submit', function (event) {
        event.preventDefault();
        try {
          var name = window.ArkUI.localDomains.add(input.value);
          input.value = '';
          addStatus.textContent = 'Tracking ' + name + '.';
        } catch (error) {
          addStatus.textContent = text(error && error.message, 'Could not track that name.');
        }
      });

      var unsubscribe = window.ArkUI.localDomains.subscribe(renderList);
      page.arkDispose = function () { unsubscribe(); };
      return page;
    }
  };
})();

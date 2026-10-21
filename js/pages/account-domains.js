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
    'account-domains-form': { ':root': { key: H + '/form:1', self: true },
      ':scope > div:nth-of-type(1) > div:nth-of-type(1) > label:nth-of-type(1) > span:nth-of-type(1)': H + '/form:1/label:1', 'button': H + '/form:1/button:1' },
    'account-domains-track': { '[data-domains-add-status]': H + '/p:3', '[data-domains-handoff]': H + '/div:1' },
    'account-domains-list': { ':root': 'page:/div:1/section:1' },
    insert: 'page:/div:1/div:1'
  };

  /* The page as Ark blocks (DEFXN polish Wave 3, W3-GUIDE; the form and the list on Ark since 2026-10-21, ledger
     recheck T13/T16/W4c): the crumbs, the heading, the form that tracks a name (Ark's form), the family's Domains
     hand-off (the kit's, so a custom slot), the list of tracked names (Ark's list, whose empty state says why it is
     empty and what to do) and the ways on. Only the hand-off and the one status line are the page's own. */
  function listProps(names) {
    return { label: 'Tracked names (' + names.length + ')',
      empty: { reason: 'No names tracked yet.', remedy: 'Track one above to keep it one step from Domains.' },
      items: names.map(function (name) {
        var lookup = ArkUI.dash.productLink && ArkUI.dash.productLink({ product: 'domains', query: { q: name }, label: 'Check in Domains' });
        var live = liveUrl(name), actions = [];
        if (lookup && lookup.getAttribute('href')) actions.push({ label: 'Check in Domains', href: lookup.getAttribute('href'), tone: 'link' });
        if (live) actions.push({ label: 'Open ' + live.replace(/^https:\/\//, ''), href: live, tone: 'link' });
        actions.push({ label: 'Stop tracking', action: 'domains-remove', tone: 'ghost' });
        return { id: name, title: name, meta: lookup ? 'Owner and target are checked in Domains.' : 'Domains is not reachable from this page.', actions: actions };
      }) };
  }
  function formProps() {
    return { label: 'Track a domain', fields: [{ name: 'name', label: 'Track an exact name', type: 'text', required: true, autocomplete: 'off', placeholder: 'yourname.fxn' }],
      submit: { label: 'Track', action: 'domains-track', tone: 'primary' } };
  }
  function spec(names) {
    return [
      { block: 'breadcrumb', id: 'account-domains-crumbs', was: WAS['account-domains-crumbs'], props: { label: 'Your place', items: [{ label: 'Home', href: 'route:zero' }, { label: 'Your account', href: 'route:account' }, { label: 'Your domains' }] } },
      { block: 'hero', id: 'account-domains-hero', was: WAS['account-domains-hero'], props: { eyebrow: 'Names you track', title: 'Your domains.', density: 'compact',
        lede: 'This browser keeps the list of names you follow. Who owns each one and where it points is checked in Domains, against the name’s signed records.' } },
      { block: 'form', id: 'account-domains-form', was: WAS['account-domains-form'], props: formProps() },
      { block: 'custom', id: 'account-domains-track', was: WAS['account-domains-track'], mount: function () {
        var box = document.createElement('div'); box.className = 'account-domains-track';
        box.innerHTML = '<p data-domains-add-status role="status" aria-live="polite"></p><div data-domains-handoff></div>';
        return box;
      } },
      { block: 'list', id: 'account-domains-list', was: WAS['account-domains-list'], props: listProps(names || []) },
      { insert: 'main', was: WAS.insert },
      { block: 'pager', id: 'account-domains-pager', props: { label: 'Continue', prev: { label: 'Your account', href: 'route:account' },
        related: [{ label: 'Resolve your website', href: 'route:resolutions/website' }, { label: 'FXN Bundle Deployer', href: 'route:bundledeployer' }] } }
    ];
  }

  ArkUI.pageModules.accountDomains = {
    spec: function () { return spec([]); },
    mount: function (host) {
      var addStatus, list;
      var page = ArkUI.page(spec(window.ArkUI.localDomains ? window.ArkUI.localDomains.list() : []), host, { page: 'account/domains', className: 'account-domains-page', titleId: 'account-domains-title', actions: {
        'domains-track': function (detail) {
          try {
            var name = window.ArkUI.localDomains.add(detail.values.name);
            addStatus.textContent = 'Tracking ' + name + '.'; addStatus.dataset.tone = 'ok';
            var input = page.querySelector('#account-domains-form input'); if (input) input.value = '';
          } catch (error) { addStatus.textContent = text(error && error.message, 'Could not track that name.'); addStatus.dataset.tone = 'error'; }
        },
        'domains-remove': function (detail) { window.ArkUI.localDomains.remove(detail.item); addStatus.textContent = 'Stopped tracking ' + detail.item + '.'; addStatus.dataset.tone = 'ok'; }
      } });
      addStatus = page.querySelector('[data-domains-add-status]');
      list = page.querySelector('#account-domains-list');
      var handoff = ArkUI.dash.productHandoff && ArkUI.dash.productHandoff({ product: 'domains', text: 'A .fxn name points people to your site or app. Looking a name up, claiming it and pointing it happen in Domains, where every answer is checked.' });
      var handoffHost = page.querySelector('[data-domains-handoff]');
      if (handoff && handoffHost) handoffHost.appendChild(handoff);

      /* each tracked name: open it in Domains (its owner and target, checked there), and its live site; no lookup
         runs here (see the header comment). The list is patched in place, so its rows keep their keys. */
      var unsubscribe = window.ArkUI.localDomains.subscribe(function (names) {
        if (!list.isConnected) list = page.querySelector('#account-domains-list') || list;
        list = ArkUI.blocks.update(list, listProps(names)) || list;
      });
      page.arkDispose = function () { unsubscribe(); };
      return page;
    }
  };
})();

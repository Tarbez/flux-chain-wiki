/* /deploy -- Create or join a network -- as a page of Ark blocks around five real, copyable
   commands.

   Converted to data in DEFXN polish Wave 3 (W3-GUIDE). The hand-built page set its deck in
   monospace, showed only "01-05" for its step tabs on a phone, pointed two forward links with "←"
   and drew a Copy button unlike /download's (docs/ux-audit/pages-ux-a.md /deploy). It is the hero
   (the deck in the sans body), a callout for readers who came to deploy a resolver or a site, the
   five steps as Ark tabs -- each its words and its command card, the expected result as the
   card's caption -- with the way through, "Review all steps" as one table, the scope boundary in
   sight, and a pager. The command cards are the page's own (Copy is the procedure, Ark ships no
   command block); every step stays addressable (?step=N, ?view=review). Layout keys of the old
   page are pinned (`WAS`, tests/lib/layout-continuity.cjs). Regression: tests/task-pages-blocks.cjs,
   tests/routes-live.cjs. */
(function () {
  'use strict';

  var STEPS = [
    {
      n: '01',
      title: 'Check discovery',
      body: 'Confirm the network CLI can reach its configured peers. This directory is best-effort discovery, not authoritative membership.',
      cmd: 'flux-network network list',
      expected: 'Expected: a "Known networks" list followed by the best-effort discovery warning.'
    },
    {
      n: '02',
      title: 'Create or select',
      body: 'Pass a name as a positional argument. If that ID already exists, the CLI selects the existing network instead of creating another one.',
      cmd: 'flux-network network create "my-network"',
      expected: 'Expected: either Network "<network-id>" created, or a message that the network already exists.'
    },
    {
      n: '03',
      title: 'Start the miner',
      body: 'Use the returned network ID when starting the daemon. FLUX_MINER_NETWORK is the preferred name; ARK_MINER_NETWORK remains a legacy alias.',
      cmd: 'FLUX_MINER_NETWORK=<network-id> flux-miner start',
      expected: 'Expected: the process remains running and exposes its configured status listener.'
    },
    {
      n: '04',
      title: 'Verify health',
      body: 'Query the local miner through the network CLI. Change the URL if the status listener uses a different host or port.',
      cmd: 'flux-network health --miner http://127.0.0.1:8766',
      expected: 'Expected: a JSON health response from the running miner.'
    },
    {
      n: '05',
      title: 'Inspect topology',
      body: 'Inspect the selected network while preserving the current boundary: topology and presence do not establish trusted membership or data isolation.',
      cmd: 'flux-network topology --miner http://127.0.0.1:8766 --network-id <network-id>',
      expected: 'Expected: topology JSON for the requested network ID.'
    }
  ];
  var SCOPE = 'network create / network list are not a security boundary today. Presence is partitioned per network; accounts, identities, and DAOs are not yet network-scoped.';
  /* `was`: the key each element of the hand-built page had, by block id, so a CMS edit saved
     against it still lands. Started from tests/lib/layout-continuity.cjs's derive against the
     frozen census (tests/fixtures/layout-keys/deploy.tsv); every reshaped and retired key is
     listed with its reason in tests/task-pages-blocks.cjs. */
  var C = 'page:/div:1', DESC = '[data-ark-part="alert-description"] > p:nth-of-type(';
  var WAS = {
    'deploy-hero': { ':root': { key: C, self: true }, eyebrow: C + '/p:1', 'hero-title': 'id:deploy-title', 'hero-lede': C + '/p:2' },
    'deploy-elsewhere': {}, 'deploy-steps': { ':root': { key: C + '/div:1', self: true }, 'tabs-list': C + '/nav:1' },
    'deploy-way': { ':root': { key: C + '/div:2', self: true }, 'button': C + '/div:2/button:1', 'button#2': C + '/div:2/button:2' },
    'deploy-review': { 'disclosure-trigger': C + '/div:2/button:3' },
    'deploy-scope': { ':root': { key: C + '/details:1', self: true }, 'disclosure-trigger': C + '/details:1/summary:1', 'button': C + '/details:1/a:1' },
    'deploy-pager': { ':root': { key: C + '/nav:2', self: true }, ':scope > div:nth-of-type(1) > a:nth-of-type(1) > span:nth-of-type(2)': C + '/nav:2/a:1' },
    insert: C + '/div:3'
  };
  WAS['deploy-elsewhere'][DESC + '1)'] = C + '/p:3';
  WAS['deploy-elsewhere'][DESC + '2)'] = C + '/p:4';
  WAS['deploy-elsewhere']['button'] = C + '/p:3/a:1';
  WAS['deploy-elsewhere']['button#2'] = C + '/p:4/a:1';
  WAS['deploy-elsewhere']['button#3'] = { key: C + '/p:3/a:2', self: true };
  WAS['deploy-scope'][DESC + '1)'] = C + '/details:1/p:1';
  [1, 2, 3, 4, 5].forEach(function (n) {
    var k = n > 1 ? '#' + n : '', at = C + '/div:1/section:' + n + '/div:1', slot = '[data-ark-slot="cmd-0' + n + '"] ';
    WAS['deploy-steps']['tabs-content' + k] = { key: 'id:deploy-step-0' + n, self: true };
    WAS['deploy-steps'][':scope > div:nth-of-type(' + (n + 1) + ') > p:nth-of-type(1)'] = at + '/p:1';
    WAS['deploy-steps']['figure' + k] = { key: at, self: true };
    WAS['deploy-steps']['figure-caption' + k] = at + '/p:2';
    WAS['deploy-steps'][slot + '.deploy-copy'] = at + '/pre:1/button:1';
    WAS['deploy-steps'][slot + '.deploy-copy-feedback'] = at + '/span:1';
  });

  /* One command, with Copy and its spoken result: the step's figure. */
  function commandCard(step) {
    var card = ArkUI.el('div', 'deploy-command-card');
    var pre = ArkUI.el('pre', 'deploy-command');
    pre.appendChild(ArkUI.el('code', '', step.cmd));
    var copy = ArkUI.el('button', 'deploy-copy', 'Copy'); copy.type = 'button';
    copy.setAttribute('aria-label', 'Copy command for ' + step.title);
    var feedback = ArkUI.el('span', 'deploy-copy-feedback'); feedback.setAttribute('role', 'status');
    copy.addEventListener('click', function () {
      function done() { copy.textContent = 'Copied'; feedback.textContent = 'Command copied.'; window.setTimeout(function () { copy.textContent = 'Copy'; }, 1400); }
      function failed() { feedback.textContent = 'Copy unavailable. Select and copy the command text below.'; }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(step.cmd).then(done, failed);
      else {
        var field = document.createElement('textarea');
        field.value = step.cmd; field.setAttribute('readonly', '');
        field.style.position = 'fixed'; field.style.opacity = '0';
        document.body.appendChild(field); field.select();
        try { if (document.execCommand('copy')) done(); else failed(); } catch (error) { failed(); }
        field.remove();
      }
    });
    pre.appendChild(copy);
    card.appendChild(pre); card.appendChild(feedback);
    return card;
  }

  /* The family's "Open Deploy" (the product that launches resolvers), its address from the kit's catalog. */
  function productAction(id) {
    var kit = typeof window !== 'undefined' && window.DefxnKit, product = kit && kit.productById && kit.productById(id);
    var href = product && kit.productHref(product);
    return href ? { label: 'Open ' + product.name, href: /^https?:/.test(href) ? 'url:' + href : href, tone: 'secondary' } : null;
  }

  /* the Open Deploy pin only when the kit names the product (the button is there only then) */
  function elsewhereWas(open) { var was = Object.assign({}, WAS['deploy-elsewhere']); if (!open) delete was['button#3']; return was; }

  function spec() {
    var manifest = ArkManifest.get('deploy');
    function words(role) { return ArkCopy.text('DEPLOY.' + role); }
    function copy(role) { return 'copy:DEPLOY.' + role; }
    var open = productAction('deploy');
    return [
      { block: 'breadcrumb', id: 'deploy-crumbs', was: WAS['deploy-crumbs'], props: { label: 'Your place', items: [{ label: 'Home', href: 'route:zero' }, { label: manifest.title }] } },
      { block: 'hero', id: 'deploy-hero', was: WAS['deploy-hero'], props: { eyebrow: copy('EYEBROW'), title: copy('TITLE'), lede: copy('DECK'), density: 'compact' } },
      /* Readers who came to deploy a resolver or a site are on the wrong page: say so first, with
         the ways there (and the family's Deploy product, which launches resolvers). In sight from
         601px up; on a phone one press away, named. */
      { block: 'disclosure', id: 'deploy-elsewhere', was: elsewhereWas(open), props: { foldBelow: 'phone', more: 'Deploying a resolver or a site instead?', less: 'Hide',
        blocks: [{ block: 'callout', props: { tone: 'reference',
          body: words('RESOLVER.NOTE') + '\n\nDeploying a site? You will need the local FXN Bundle Deployer.',
          actions: [{ label: copy('RESOLVER.LINK'), href: words('RESOLVER.HREF'), tone: 'link' }, { label: 'CLI status and public bundle guidance', href: words('BUNDLEDEPLOYER.HREF'), tone: 'link' }] } }]
          .concat(open ? [{ block: 'actions', props: { label: 'The Deploy product', items: [open] } }] : []) } },
      { block: 'tabs', id: 'deploy-steps', was: WAS['deploy-steps'], props: { label: 'Setup steps', items: STEPS.map(function (step, i) {
        return { value: 'step-' + (i + 1), label: step.n + ' / ' + step.title, content: step.body,
          blocks: [{ block: 'figure', props: { kind: 'illustration', slot: 'cmd-' + step.n, caption: step.expected } }] };
      }) } },
      { block: 'actions', id: 'deploy-way', was: WAS['deploy-way'], props: { label: 'Step through', items: [
        { label: 'Previous step', action: 'deploy-previous', tone: 'ghost' }, { label: 'Next step', action: 'deploy-next', tone: 'primary' }] } },
      /* Every command at once, for review: one table, a press away. */
      { block: 'disclosure', id: 'deploy-review', was: WAS['deploy-review'], props: { more: 'Review all steps', less: 'Return to one step', blocks: [
        { block: 'table', props: { caption: 'All 5 steps / review only', rowHeader: true, maxHeight: 'none',
          columns: [{ key: 'n', label: 'Step' }, { key: 'cmd', label: 'Command', mono: true }, { key: 'expected', label: 'Expected' }],
          rows: STEPS.map(function (step) { return { n: step.n + ' / ' + step.title, cmd: step.cmd, expected: step.expected.replace(/^Expected: /, '') }; }) } }
      ] } },
      /* The scope note and the guide, folded as before ("Network scope and source guide"); the deck
         above already says the boundary in one line. */
      { block: 'disclosure', id: 'deploy-scope', was: WAS['deploy-scope'], props: { more: 'Network scope and source guide', less: 'Hide the network scope',
        blocks: [{ block: 'callout', props: { tone: 'drift', body: SCOPE, actions: [{ label: 'Read the network guide', href: words('GUIDE.HREF'), tone: 'link' }] } }] } },
      { insert: 'main', was: WAS.insert },
      { block: 'pager', id: 'deploy-pager', was: WAS['deploy-pager'], props: { label: 'Continue',
        prev: { label: words('BACK').charAt(0) + words('BACK').slice(1).toLowerCase(), href: 'route:' + manifest.meta.back },
        next: { label: 'FXN Bundle Deployer', href: words('BUNDLEDEPLOYER.HREF') } } }
    ];
  }

  ArkUI.pageModules.deploy = {
    spec: spec, steps: STEPS,
    mount: function (host) {
      var slots = {};
      STEPS.forEach(function (step) { slots['cmd-' + step.n] = function () { return commandCard(step); }; });
      var page, tabs, review, previous, next;
      function triggers() { return Array.prototype.slice.call(tabs.querySelectorAll('[data-ark-part="tabs-trigger"]')); }
      function current() { var list = triggers(); for (var i = 0; i < list.length; i++) if (list[i].getAttribute('aria-selected') === 'true') return i; return 0; }
      function reviewing() { return review.getAttribute('data-state') === 'open'; }
      function paint() { var i = current(); previous.hidden = i === 0; next.hidden = i === STEPS.length - 1; }
      function write() { if (page.arkWriteState) page.arkWriteState({ step: current(), review: reviewing() }); }
      function select(index, all) {
        var list = triggers(), i = Math.max(0, Math.min(STEPS.length - 1, index));
        if (current() !== i) list[i].click();
        var trigger = review.querySelector('[data-ark-part="disclosure-trigger"]');
        if (!!all !== reviewing()) trigger.click();
        paint();
      }
      page = ArkUI.page(spec(), host, { page: 'deploy', titleId: 'deploy-title', terms: 'first-use', slots: slots, actions: {
        'deploy-previous': function () { select(current() - 1, reviewing()); write(); },
        'deploy-next': function () { select(current() + 1, reviewing()); write(); }
      } });
      tabs = page.querySelector('#deploy-steps');
      review = page.querySelector('#deploy-review');
      previous = page.querySelector('#deploy-way [data-action="deploy-previous"]');
      next = page.querySelector('#deploy-way [data-action="deploy-next"]');
      tabs.querySelector('[data-ark-part="tabs-list"]').addEventListener('click', function () { paint(); write(); });
      review.querySelector('[data-ark-part="disclosure-trigger"]').addEventListener('click', function () { write(); });
      paint();
      ArkUI.attachProcedureState(page, 'deploy', STEPS.length, function (index, all) { select(index, all); });
      return page;
    }
  };
})();

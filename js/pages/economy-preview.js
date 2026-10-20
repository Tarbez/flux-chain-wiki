/* /treasury and /deposits: design-only financial surfaces, as pages of Ark blocks. Values and
   entries are fictional; no API or wallet calls exist here. FXN and Credits are intentionally
   distinct.

   Converted to data in DEFXN polish Wave 3 (W3-GUIDE). The treasury mock was a hand-built
   header, an aria-pressed asset picker styled as tabs (a third tab look), a list that replaced the
   overview in place and a detail that replaced the list, with no breadcrumb and one way out
   (docs/ux-audit/pages-ux-b.md /treasury). It is Ark's breadcrumb, hero and warning callout, the
   Treasury hand-off (W2-SHELL, the family kit), and one tab set -- FXN / Tier 1, Credits, and the
   sample movements, each an accordion row that opens its evidence -- with a pager. The deposit
   mock keeps its form and its local result (the page's own: the form is the preview) inside the
   same frame. Every word is kept; layout keys of the old pages are pinned (`WAS`,
   tests/lib/layout-continuity.cjs). Regression: tests/task-pages-blocks.cjs. */
(function () {
  'use strict';
  var movements = [
    { id: 'DEMO-001', label: 'Reserve proposed', amount: '1,200 FXN', state: 'Draft', explanation: 'A sample reserve request awaiting review. Nothing has been signed or moved.' },
    { id: 'DEMO-002', label: 'Deposit inspected', amount: '480 FXN', state: 'Illustrative', explanation: 'A fictional deposit record used to show where a receipt and verification result would appear.' },
    { id: 'DEMO-003', label: 'Allocation noted', amount: '320 FXN', state: 'Illustrative', explanation: 'An example allocation line. It does not describe current network treasury policy.' }
  ];
  var KICKER = 'DESIGN PREVIEW / NOT LIVE';
  var MOCK = 'Design mock only — no wallet, balance, deposit, transfer, or ledger is connected.';

  function node(tag, className, text) {
    var item = document.createElement(tag);
    if (className) item.className = className;
    if (text != null) item.textContent = text;
    return item;
  }

  /* `was`: the key each element of the hand-built pages had, by block id. Started from
     tests/lib/layout-continuity.cjs's derive against the frozen censuses
     (tests/fixtures/layout-keys/treasury.tsv, deposits.tsv); every reshaped and retired key is
     listed with its reason in tests/task-pages-blocks.cjs. */
  var S = 'page:/div:1';
  function headWas(page) {
    return { ':root': { key: S + '/header:1', self: true }, eyebrow: S + '/header:1/p:1', 'hero-title': 'id:' + page + '-preview-title', 'hero-lede': S + '/header:1/p:2' };
  }
  var WAS = {
    treasury: {
      'treasury-tabs': { ':root': { key: S + '/section:1', self: true }, 'tabs-list': { key: S + '/div:1', self: true }, 'tabs-trigger': S + '/div:1/button:1', 'tabs-trigger#2': S + '/div:1/button:2',
        'tabs-trigger#3': S + '/button:1', 'tabs-content': { key: S + '/section:1/div:1', self: true }, 'tabs-content#2': { key: S + '/section:1/div:2', self: true },
        'tabs-content#3': { key: S + '/section:2', self: true },
        ':scope > div:nth-of-type(2) > p:nth-of-type(1)': S + '/section:1/div:1/p:1', ':scope > div:nth-of-type(3) > p:nth-of-type(1)': S + '/section:1/div:2/p:1',
        'fact-term': S + '/section:1/div:1/span:1', 'fact-value': S + '/section:1/div:1/strong:1', 'fact-term#2': S + '/section:1/div:2/span:1', 'fact-value#2': S + '/section:1/div:2/strong:1',
        eyebrow: S + '/section:2/p:1', 'section-title': S + '/section:2/h2:1', 'eyebrow#2': S + '/section:3/p:1',
        'accordion-trigger': { key: S + '/section:2/button:2', self: true }, 'accordion-trigger#2': { key: S + '/section:2/button:3', self: true }, 'accordion-trigger#3': { key: S + '/section:2/button:4', self: true } },
      'treasury-pager': { ':root': { key: S + '/nav:1', self: true }, ':scope > div:nth-of-type(1) > a:nth-of-type(1) > span:nth-of-type(2)': S + '/nav:1/a:1' },
      insert: S + '/div:2'
    },
    deposits: {
      'deposits-draft': { ':root': S, 'button#2': S + '/section:1/button:1' },
      /* the form block, rendered by draft() inside the page's own frame */
      'deposits-form': {
        ':root': { key: S + '/form:1', self: true },
        ':scope > div:nth-of-type(1) > div:nth-of-type(1) > label:nth-of-type(1) > span:nth-of-type(1)': S + '/form:1/label:1',
        'field#2': S + '/form:1/label:2', 'field-hint': S + '/form:1/p:1', 'button': S + '/form:1/button:1'
      },
      'deposits-pager': { ':root': { key: S + '/nav:1', self: true }, ':scope > div:nth-of-type(1) > a:nth-of-type(1) > span:nth-of-type(2)': S + '/nav:1/a:1' },
      insert: S + '/div:1'
    }
  };

  function head(page, title, deck, crumbs) {
    return [
      { block: 'breadcrumb', id: page + '-crumbs', props: { label: 'Your place', items: crumbs } },
      { block: 'hero', id: page + '-hero', was: headWas(page), props: { eyebrow: KICKER, title: title, lede: deck, density: 'compact' } },
      { block: 'callout', id: page + '-mock', was: { '[data-ark-part="alert-description"] > p:nth-of-type(1)': S + '/header:1/p:3' }, props: { tone: 'warning', body: MOCK } }
    ];
  }

  function treasurySpec() {
    var was = WAS.treasury;
    return head('treasury', 'Inspect a treasury before funds move.', 'Preview assets, reserves, and the evidence behind each movement.',
      [{ label: 'Home', href: 'route:zero' }, { label: 'Treasury preview' }]).concat([
      /* Explain + hand off (owner decision 2026-10-19): real treasuries -- live balances, spends
         proposed, approved and claimed under a DAO's rules -- are the Treasury product's. This
         mock keeps what Treasury does not show: FXN beside Credits, and the deposit preview. */
      { block: 'custom', id: 'treasury-handoff', mount: function () {
        return ArkUI.dash.productHandoff && ArkUI.dash.productHandoff({ product: 'treasury', text: 'A treasury is money a group holds together, and it moves only when enough of the group’s named signers approve the same spend. Every founded DAO’s real treasury is in Treasury.' }) || document.createComment('no product kit');
      } },
      { block: 'tabs', id: 'treasury-tabs', was: was['treasury-tabs'], props: { label: 'Choose a sample asset', items: [
        { value: 'fxn', label: 'FXN / Tier 1', /* "Tier 1" was a bare label (docs/ux-audit/ledger.md TR-3). docs/economy-preview.md is the one place that says what it is:
             the native token, set apart from Credits. Said in plain words in the sentence beside the figure it labels. */
          content: 'Fictional sample amount for the native token. Not supply, price, or a real treasury balance. “Tier 1” is this preview’s label for FXN, the network’s native token, to tell it apart from Credits: identity-bound units that cannot be transferred.',
          blocks: [{ block: 'facts', props: { label: 'Sample asset overview', columns: 1, items: [{ term: 'FXN / TIER 1', value: '12,400 FXN', mono: true }] } }] },
        { value: 'credits', label: 'Credits', content: 'Universal name: Credits. Identity-bound and non-transferable; separate from FXN. This quantity is fictional.',
          blocks: [{ block: 'facts', props: { label: 'Sample asset overview', columns: 1, items: [{ term: 'CREDITS', value: '840 Credits', mono: true }] } }] },
        { value: 'movements', label: 'Inspect sample movements', blocks: [
          { block: 'section-header', props: { eyebrow: '02 / Sample movements', title: 'Choose one movement.', level: 3 } },
          { block: 'accordion', props: { label: 'Fictional movements', headingLevel: 3, items: movements.map(function (m) {
            return { value: m.id.toLowerCase(), title: m.id + ' · ' + m.label + ' · ' + m.amount, content: m.explanation, blocks: [
              { block: 'eyebrow', props: { text: '03 / Evidence layer' } },
              { block: 'facts', props: { label: 'Sample movement detail', columns: 2, items: [{ term: 'Reference', value: m.id, mono: true }, { term: 'Example amount', value: m.amount }, { term: 'State', value: m.state }, { term: 'Proof', value: 'None — design mock' }] } }
            ] };
          }) } }
        ] }
      ] } },
      { insert: 'main', was: was.insert },
      { block: 'pager', id: 'treasury-pager', was: was['treasury-pager'], props: { label: 'Continue', next: { label: 'Preview a deposit', href: 'route:deposits' },
        related: [{ label: 'Resolve your payments', href: 'route:resolutions/payments' }, { label: 'Your account', href: 'route:account' }] } }
    ]);
  }

  /* The deposit draft: the page's own form and its local result (the preview IS the form). The form is Ark's
     `form` block (js/ark/vendor/ark-kit-forms.js, listed in the /deposits route's scripts): its purpose list was
     a native <select> with the browser's own arrow (docs/ux-audit/ledger.md /deposits P2), it is Ark's select
     field now, and an amount that is missing, not a number, or below the smallest is refused by the form in
     words, beside the field (it used to move focus and say nothing). Nothing is posted; the result stays local. */
  var PURPOSES = [['reserve', 'Reserve for future operation'], ['service', 'Fund a service agreement'], ['review', 'Hold for review']];
  function draft() {
    var box = node('div', 'economy-draft');
    var form = ArkUI.blocks.render({ block: 'form', id: 'deposits-form', was: WAS.deposits['deposits-form'], props: {
      label: 'Mock FXN deposit draft',
      fields: [
        { name: 'amount', label: 'Example FXN amount', type: 'number', required: true, min: 0.01, placeholder: '0.00',
          hint: 'Credits are identity-bound and non-transferable. They are not deposited, sent, or converted in this preview.' },
        { name: 'purpose', label: 'Illustrative purpose', type: 'select', value: PURPOSES[0][0], options: PURPOSES.map(function (pair) { return { value: pair[0], label: pair[1] }; }) }
      ],
      submit: { label: 'Preview draft', action: 'deposit-preview', tone: 'primary' }
    } });
    /* any amount above the smallest is a deposit: the browser's "no step", which Ark's numeric `step` cannot say */
    form.querySelector('[name="amount"]').setAttribute('step', 'any');
    box.appendChild(form);
    var result = node('section', 'economy-deposit-result'); result.hidden = true; result.inert = true;
    result.setAttribute('aria-label', 'Mock deposit preview');
    result.appendChild(ArkUI.blocks.render({ block: 'eyebrow', props: { text: '02 / Local draft' } }));
    var resultTitle = node('h2', '', 'This is only a preview.'); resultTitle.tabIndex = -1; result.appendChild(resultTitle);
    var resultText = node('p', 'economy-detail-copy'); result.appendChild(resultText);
    var facts = node('dl', 'economy-detail-facts'); result.appendChild(facts);
    result.appendChild(node('p', 'economy-warning', 'No wallet connection, signature, transaction, or network record was created.'));
    result.appendChild(ArkUI.blocks.render({ block: 'actions', props: { items: [{ label: 'Edit draft', action: 'deposit-edit', tone: 'ghost' }] } }));
    box.appendChild(result);
    box.addEventListener('ark:action', function (event) {
      var detail = event.detail || {};
      if (detail.action === 'deposit-preview') {
        var value = Number(detail.values.amount), purpose = PURPOSES.filter(function (pair) { return pair[0] === detail.values.purpose; })[0];
        facts.replaceChildren();
        [['Asset', 'FXN / Tier 1'], ['Example amount', String(value) + ' FXN'], ['Purpose', purpose ? purpose[1] : String(detail.values.purpose)],
          ['Recipient', 'Not selected'], ['State', 'Local mock draft']].forEach(function (pair) {
          var row = node('div'); row.appendChild(node('dt', '', pair[0])); row.appendChild(node('dd', '', pair[1])); facts.appendChild(row);
        });
        resultText.textContent = 'The future flow would let an operator inspect these terms and their authority before signing. This preview stops here.';
        form.hidden = true; form.inert = true; result.hidden = false; result.inert = false;
        resultTitle.focus({ preventScroll: true });
      } else if (detail.action === 'deposit-edit') {
        result.hidden = true; result.inert = true; form.hidden = false; form.inert = false;
        form.querySelector('[name="amount"]').focus({ preventScroll: true });
      }
    });
    return box;
  }

  function depositsSpec() {
    var was = WAS.deposits;
    return head('deposits', 'Preview a deposit before any funds move.',
      'A local-only layout study for a future FXN deposit. Enter an example amount, inspect the proposed intent, then return to edit it. There is no submit action.',
      [{ label: 'Home', href: 'route:zero' }, { label: 'Treasury preview', href: 'route:treasury' }, { label: 'Deposit preview' }]).concat([
      { block: 'custom', id: 'deposits-draft', was: was['deposits-draft'], mount: function () { return draft(); } },
      { insert: 'main', was: was.insert },
      { block: 'pager', id: 'deposits-pager', was: was['deposits-pager'], props: { label: 'Continue', prev: { label: 'Return to treasury preview', href: 'route:treasury' },
        related: [{ label: 'Resolve your payments', href: 'route:resolutions/payments' }] } }
    ]);
  }

  ArkUI.pageModules.economyPreview = {
    treasurySpec: treasurySpec, depositsSpec: depositsSpec,
    mount: function (host, page) {
      var treasury = page === 'treasury';
      return ArkUI.page(treasury ? treasurySpec() : depositsSpec(), host, { page: page, className: 'economy-preview-page', titleId: page + '-preview-title' });
    }
  };
})();

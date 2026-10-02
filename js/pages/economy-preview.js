/* Design-only financial surfaces. Values and entries are fictional; no API or
   wallet calls exist here. FXN and Credits are intentionally distinct. */
(function () {
  'use strict';
  var movements = [
    { id: 'DEMO-001', label: 'Reserve proposed', amount: '1,200 FXN', state: 'Draft', explanation: 'A sample reserve request awaiting review. Nothing has been signed or moved.' },
    { id: 'DEMO-002', label: 'Deposit inspected', amount: '480 FXN', state: 'Illustrative', explanation: 'A fictional deposit record used to show where a receipt and verification result would appear.' },
    { id: 'DEMO-003', label: 'Allocation noted', amount: '320 FXN', state: 'Illustrative', explanation: 'An example allocation line. It does not describe current network treasury policy.' }
  ];
  function node(tag, className, text) {
    var item = document.createElement(tag);
    if (className) item.className = className;
    if (text != null) item.textContent = text;
    return item;
  }
  function link(page, label) {
    var item = node('a', 'economy-next-link', label + ' ↗');
    item.href = '#' + ArkUI.pageCatalog[page].path;
    item.dataset.sceneLink = page;
    return item;
  }
  function buildBase(page, title, deck) {
    var root = node('section', 'ark-page task-page economy-preview-page ' + page + '-preview-page');
    root.dataset.arkPage = page;
    root.setAttribute('aria-labelledby', page + '-preview-title');
    var shell = node('div', 'economy-preview-shell');
    var header = node('header', 'economy-preview-header');
    header.appendChild(node('p', 'economy-kicker', 'DESIGN PREVIEW / NOT LIVE'));
    var heading = node('h1', '', title); heading.id = page + '-preview-title'; header.appendChild(heading);
    header.appendChild(node('p', 'economy-deck', deck));
    header.appendChild(node('p', 'economy-warning', 'Design mock only — no wallet, balance, deposit, transfer, or ledger is connected.'));
    shell.appendChild(header); root.appendChild(shell);
    return { root: root, shell: shell };
  }
  function treasury(host) {
    var parts = buildBase('treasury', 'Inspect a treasury before funds move.',
      'Preview assets, reserves, and the evidence behind each movement.');
    var shell = parts.shell;
    var assetTabs = node('div', 'economy-asset-tabs'); assetTabs.setAttribute('role', 'group'); assetTabs.setAttribute('aria-label', 'Choose a sample asset');
    var fxnTab = node('button', '', 'FXN / Tier 1'); fxnTab.type = 'button'; fxnTab.setAttribute('aria-pressed', 'true');
    var creditTab = node('button', '', 'Credits'); creditTab.type = 'button'; creditTab.setAttribute('aria-pressed', 'false');
    assetTabs.appendChild(fxnTab); assetTabs.appendChild(creditTab); shell.appendChild(assetTabs);
    var overview = node('section', 'economy-overview');
    overview.setAttribute('aria-label', 'Sample asset overview');
    var fxn = node('div', 'economy-asset-line');
    fxn.appendChild(node('span', 'economy-asset-code', 'FXN / TIER 1'));
    fxn.appendChild(node('strong', '', '12,400 FXN'));
    fxn.appendChild(node('p', '', 'Fictional sample amount for the native token. Not supply, price, or a real treasury balance.'));
    overview.appendChild(fxn);
    var credits = node('div', 'economy-asset-line');
    credits.appendChild(node('span', 'economy-asset-code', 'CREDITS'));
    credits.appendChild(node('strong', '', '840 Credits'));
    credits.appendChild(node('p', '', 'Universal name: Credits. Identity-bound and non-transferable; separate from FXN. This quantity is fictional.'));
    overview.appendChild(credits);
    credits.hidden = true;
    shell.appendChild(overview);
    var open = node('button', 'economy-primary', 'Inspect sample movements'); open.type = 'button'; shell.appendChild(open);
    var list = node('section', 'economy-movement-list'); list.hidden = true; list.inert = true;
    list.setAttribute('aria-label', 'Fictional movements');
    var listBack = node('button', 'economy-return', '← Back to overview'); listBack.type = 'button'; list.appendChild(listBack);
    list.appendChild(node('p', 'economy-kicker', '02 / SAMPLE MOVEMENTS'));
    list.appendChild(node('h2', '', 'Choose one movement.'));
    movements.forEach(function (movement) {
      var button = node('button', 'economy-movement'); button.type = 'button'; button.dataset.movementId = movement.id;
      button.appendChild(node('span', '', movement.id));
      button.appendChild(node('strong', '', movement.label));
      button.appendChild(node('span', '', movement.amount));
      list.appendChild(button);
    });
    shell.appendChild(list);
    var detail = node('section', 'economy-movement-detail'); detail.hidden = true; detail.inert = true;
    detail.setAttribute('aria-label', 'Sample movement detail');
    var detailBack = node('button', 'economy-return', '← Back to movements'); detailBack.type = 'button'; detail.appendChild(detailBack);
    detail.appendChild(node('p', 'economy-kicker', '03 / EVIDENCE LAYER'));
    var detailTitle = node('h2'); detail.appendChild(detailTitle);
    var detailCopy = node('p', 'economy-detail-copy'); detail.appendChild(detailCopy);
    var detailFacts = node('dl', 'economy-detail-facts'); detail.appendChild(detailFacts);
    shell.appendChild(detail);
    var aside = node('nav', 'economy-page-next'); aside.setAttribute('aria-label', 'Continue');
    aside.appendChild(link('deposits', 'Preview a deposit')); shell.appendChild(aside);
    function selectAsset(selected) {
      var showFxn = selected === 'fxn';
      fxn.hidden = !showFxn; credits.hidden = showFxn;
      fxnTab.setAttribute('aria-pressed', String(showFxn)); creditTab.setAttribute('aria-pressed', String(!showFxn));
    }
    fxnTab.addEventListener('click', function () { selectAsset('fxn'); });
    creditTab.addEventListener('click', function () { selectAsset('credits'); });
    function show(target) {
      assetTabs.hidden = target !== 'overview';
      overview.hidden = target !== 'overview'; open.hidden = target !== 'overview';
      list.hidden = target !== 'list'; list.inert = target !== 'list';
      detail.hidden = target !== 'detail'; detail.inert = target !== 'detail';
      (target === 'overview' ? open : target === 'list' ? list.querySelector('h2') : detailTitle).focus({ preventScroll: true });
    }
    list.querySelector('h2').tabIndex = -1; detailTitle.tabIndex = -1;
    open.addEventListener('click', function () { show('list'); });
    listBack.addEventListener('click', function () { show('overview'); });
    detailBack.addEventListener('click', function () { show('list'); });
    Array.prototype.forEach.call(list.querySelectorAll('[data-movement-id]'), function (button) {
      button.addEventListener('click', function () {
        var movement = movements.find(function (item) { return item.id === button.dataset.movementId; });
        detailTitle.textContent = movement.label;
        detailCopy.textContent = movement.explanation;
        detailFacts.replaceChildren();
        [['Reference', movement.id], ['Example amount', movement.amount], ['State', movement.state], ['Proof', 'None — design mock']].forEach(function (pair) {
          var row = node('div'); row.appendChild(node('dt', '', pair[0])); row.appendChild(node('dd', '', pair[1])); detailFacts.appendChild(row);
        });
        show('detail');
      });
    });
    host.appendChild(parts.root);
    return parts.root;
  }
  function deposits(host) {
    var parts = buildBase('deposits', 'Preview a deposit before any funds move.',
      'A local-only layout study for a future FXN deposit. Enter an example amount, inspect the proposed intent, then return to edit it. There is no submit action.');
    var shell = parts.shell;
    var form = node('form', 'economy-deposit-form'); form.setAttribute('aria-label', 'Mock FXN deposit draft');
    var amountLabel = node('label', '', 'Example FXN amount');
    var amount = node('input'); amount.type = 'number'; amount.min = '0.01'; amount.step = 'any'; amount.inputMode = 'decimal';
    amount.placeholder = '0.00'; amount.required = true; amountLabel.appendChild(amount); form.appendChild(amountLabel);
    var purposeLabel = node('label', '', 'Illustrative purpose');
    var purpose = node('select');
    [['reserve', 'Reserve for future operation'], ['service', 'Fund a service agreement'], ['review', 'Hold for review']].forEach(function (pair) {
      var option = node('option', '', pair[1]); option.value = pair[0]; purpose.appendChild(option);
    });
    purposeLabel.appendChild(purpose); form.appendChild(purposeLabel);
    form.appendChild(node('p', 'economy-credit-note', 'Credits are identity-bound and non-transferable. They are not deposited, sent, or converted in this preview.'));
    var preview = node('button', 'economy-primary', 'Preview draft'); preview.type = 'submit'; form.appendChild(preview);
    shell.appendChild(form);
    var result = node('section', 'economy-deposit-result'); result.hidden = true; result.inert = true;
    result.setAttribute('aria-label', 'Mock deposit preview');
    result.appendChild(node('p', 'economy-kicker', '02 / LOCAL DRAFT'));
    var resultTitle = node('h2', '', 'This is only a preview.'); resultTitle.tabIndex = -1; result.appendChild(resultTitle);
    var resultText = node('p', 'economy-detail-copy'); result.appendChild(resultText);
    var facts = node('dl', 'economy-detail-facts'); result.appendChild(facts);
    result.appendChild(node('p', 'economy-warning', 'No wallet connection, signature, transaction, or network record was created.'));
    var edit = node('button', 'economy-return', '← Edit draft'); edit.type = 'button'; result.appendChild(edit);
    shell.appendChild(result);
    var aside = node('nav', 'economy-page-next'); aside.setAttribute('aria-label', 'Continue');
    aside.appendChild(link('treasury', 'Return to treasury preview')); shell.appendChild(aside);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var value = Number(amount.value);
      if (!Number.isFinite(value) || value <= 0) { amount.focus(); return; }
      facts.replaceChildren();
      [['Asset', 'FXN / Tier 1'], ['Example amount', String(value) + ' FXN'], ['Purpose', purpose.options[purpose.selectedIndex].textContent],
        ['Recipient', 'Not selected'], ['State', 'Local mock draft']].forEach(function (pair) {
        var row = node('div'); row.appendChild(node('dt', '', pair[0])); row.appendChild(node('dd', '', pair[1])); facts.appendChild(row);
      });
      resultText.textContent = 'The future flow would let an operator inspect these terms and their authority before signing. This preview stops here.';
      form.hidden = true; form.inert = true; result.hidden = false; result.inert = false;
      resultTitle.focus({ preventScroll: true });
    });
    edit.addEventListener('click', function () { result.hidden = true; result.inert = true; form.hidden = false; form.inert = false; amount.focus({ preventScroll: true }); });
    host.appendChild(parts.root);
    return parts.root;
  }
  ArkUI.pageModules.economyPreview = {
    mount: function (host, page) { return page === 'treasury' ? treasury(host) : deposits(host); }
  };
})();

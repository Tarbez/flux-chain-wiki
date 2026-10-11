ArkUI.pageModules.zero = {
  mount: function (host) {
    function pageHref(key) { return '#' + ArkUI.pageCatalog[key].path; }
    var el = ArkUI.render([
      'F-HOME-RLAYER_V1', '-N-zero',
      '. F-BODY-RBODY_V1',
      '  -E-HOME.EYEBROW', '  -H-HOME.TITLE', '  -T-HOME.INTRO',
      '  -S-1.42', '  .', '.'
    ].join('\n'), host);
    el.classList.add('ark-page'); el.dataset.arkPage = 'zero';
    var body = el.querySelector('.ark-hero-body');
    body.classList.add('home-centered');
    var heading = body.querySelector('.ark-hero-title');
    var headline = ArkCopy.text('HOME.TITLE');
    if (heading) {
      heading.textContent = '';
      var mainLine = document.createElement('span');
      mainLine.className = 'home-headline-main';
      var lead=document.createElement('span');lead.className='home-headline-lead';lead.textContent='Every identity has';
      var pivot=document.createElement('span');pivot.className='home-headline-pivot';pivot.textContent='its own chain,';
      var reveal=document.createElement('span');reveal.className='home-headline-network';reveal.textContent='bound into a chain of chains.';
      mainLine.appendChild(lead);mainLine.appendChild(pivot);mainLine.appendChild(reveal);
      heading.appendChild(mainLine);
      heading.setAttribute('aria-label', headline);
    }
    var promise = document.createElement('p');
    promise.className = 'home-promise';
    promise.textContent = ArkCopy.text('HOME.PROMISE');
    body.insertBefore(promise, body.firstChild);
    var actions = document.createElement('div');
    actions.className = 'home-hero-actions';
    function actionCopy(link, kicker, label) {
      var copy = document.createElement('span'); copy.className = 'home-cta-copy';
      var meta = document.createElement('small'); meta.className = 'home-cta-kicker'; meta.textContent = kicker;
      var text = document.createElement('strong'); text.className = 'home-cta-label'; text.textContent = label;
      copy.appendChild(meta); copy.appendChild(text); link.appendChild(copy);
    }
    // One dominant action -- learn the model -- so the hero has a single
    // answer to "what do I click." Explore and pressure-test are real,
    // named paths but read as secondary, not three boxes of equal weight.
    var learn = document.createElement('a');
    learn.className = 'home-primary-cta';
    learn.href = pageHref('deployment'); learn.dataset.sceneLink = 'deployment';
    learn.setAttribute('aria-label', ArkCopy.text('HOME.CTA'));
    actionCopy(learn, 'Learn', ArkCopy.text('HOME.CTA'));
    actions.appendChild(learn);
    body.appendChild(actions);

    var questions = document.createElement('nav');
    questions.className = 'home-question-links';
    questions.setAttribute('aria-label', 'Pressure-test a claim yourself');
    var pressureTest = document.createElement('a');
    pressureTest.href = pageHref('resolver'); pressureTest.dataset.sceneLink = 'resolver';
    pressureTest.textContent = ArkCopy.text('HOME.PRESSURETEST');
    questions.appendChild(pressureTest);
    body.appendChild(questions);

    // The left column: the chain teaser, then a compact grid of icon
    // references to the core pages below it. One wrapper so both share the
    // same grid cell and stack by normal document flow inside it.
    var leftColumn = document.createElement('div');
    leftColumn.className = 'home-left-column';

    // Compact teaser for the full chain-of-chains walkthrough: a small
    // fraction of the real scene, enough to recognize it, before the panel
    // expands into /chain and reassembles itself there.
    var lifecycle = document.createElement('nav');
    lifecycle.className = 'home-lifecycle home-chain-teaser';
    lifecycle.setAttribute('aria-label', 'How one record joins the chain');
    var caption = document.createElement('p'); caption.className = 'home-lifecycle-caption';
    caption.textContent = 'The chain of chains'; lifecycle.appendChild(caption);
    var title = document.createElement('strong'); title.className = 'home-cycle-title';
    title.textContent = 'Every record extends its own chain.'; lifecycle.appendChild(title);
    var preview = document.createElement('div'); preview.className = 'home-chain-teaser-strip';
    preview.setAttribute('aria-hidden', 'true');
    for (var dot = 0; dot < 5; dot++) preview.appendChild(document.createElement('span'));
    lifecycle.appendChild(preview);
    // Three onward actions, not one: the same walkthrough, from three real
    // cases, so a visitor picks the one that matches what they came for
    // instead of getting a single generic "watch a record" link. Each opens
    // /chain with that case preselected (js/pages/home-flow.js's CASES).
    // Short, parallel phrasing (not "watch a swaps record join the chain")
    // so the three rows wrap the same way instead of one fitting on a
    // single line while its neighbors ragged onto two.
    var walkthroughLabels = { swaps: 'Watch a swap join the chain', staking: 'Watch a stake join the chain', governance: 'Watch a vote join the chain' };
    var walkthroughCases = ['swaps', 'staking', 'governance'];
    var allCases = ArkUI.chainCases || [];
    walkthroughCases.forEach(function (id) {
      var found = allCases.filter(function (c) { return c.id === id; });
      var kase = found[0];
      if (!kase) return;
      var open = document.createElement('a'); open.className = 'home-lifecycle-all';
      open.href = pageHref('chain'); open.dataset.sceneLink = 'chain'; open.dataset.routeQuery = 'case=' + id; open.dataset.icon = 'arrow-right';
      var label = walkthroughLabels[id] || ('Watch a ' + kase.label.toLowerCase() + ' join the chain');
      open.setAttribute('aria-label', label);
      var openCopy = document.createElement('span'); openCopy.className = 'home-lifecycle-all-copy';
      var openKicker = document.createElement('small'); openKicker.textContent = kase.label;
      var openLabel = document.createElement('span'); openLabel.textContent = label;
      openCopy.appendChild(openKicker); openCopy.appendChild(openLabel); open.appendChild(openCopy);
      lifecycle.appendChild(open);
    });
    leftColumn.appendChild(lifecycle);

    // A compact grid of icon references to the core pages -- the protocol
    // in six destinations, not a sentence explaining each one.
    var coreLinks = document.createElement('nav');
    coreLinks.className = 'home-core-links';
    coreLinks.setAttribute('aria-label', 'Core pages');
    [
      ['network', 'explorer', 'Explorer'],
      ['account', 'account', 'Account'],
      ['layers', 'resolvers', 'Resolvers'],
      ['evidence', 'stats', 'Stats'],
      ['terminal', 'deploy', 'Deploy'],
      ['authority', 'dao', 'Governance']
    ].forEach(function (item) {
      var link = document.createElement('a'); link.className = 'home-core-link';
      link.href = pageHref(item[1]); link.dataset.sceneLink = item[1]; link.dataset.icon = item[0];
      link.setAttribute('aria-label', item[2]);
      var label = document.createElement('span'); label.textContent = item[2];
      link.appendChild(label);
      coreLinks.appendChild(link);
    });
    leftColumn.appendChild(coreLinks);
    el.appendChild(leftColumn);

    // Measured numbers, shared with /stats (js/content/stats-highlights.js).
    var stats = window.ArkStatsHighlights;
    var status = document.createElement('aside');
    status.className = 'home-status-rail';
    status.setAttribute('aria-label', 'Measured mesh performance');
    var liveReadout = document.createElement('div'); liveReadout.className = 'home-status-item'; liveReadout.dataset.state = 'loading';
    var liveLabel = document.createElement('small'); liveLabel.textContent = 'Live fleet pulse';
    var liveValue = document.createElement('strong'); liveValue.className = 'home-status-value'; liveValue.textContent = '–';
    var liveUnit = document.createElement('span'); liveUnit.className = 'home-status-unit'; liveUnit.textContent = 'ops/s'; liveValue.appendChild(liveUnit);
    var liveDetail = document.createElement('span'); liveDetail.className = 'home-status-detail'; liveDetail.textContent = 'Loading the measured public-fleet pulse; resolver cards below are labeled local or fleet.';
    liveReadout.appendChild(liveLabel); liveReadout.appendChild(liveValue); liveReadout.appendChild(liveDetail); status.appendChild(liveReadout);
    /* One line, once, instead of "the fleet, all 10 nodes" repeated in
       every row: the scope is stated here, each stat below just names
       the operation. The long BENCH note still rides along as the title
       tooltip for anyone who hovers -- the full paragraph lives on
       /stats, not crammed into every row's screen-reader text here. */
    var statusScope = document.createElement('small'); statusScope.className = 'home-status-scope-label';
    statusScope.textContent = 'Fleet-wide · 10 nodes · ' + stats.operations.record;
    status.appendChild(statusScope);
    var shortNames = { '643,632': 'Swaps', '69,895': 'Transfers', '6,044,992': 'Records' };
    stats.items.slice(0, 3).forEach(function (stat) {
      var readout = document.createElement('div'); readout.className = 'home-status-item';
      readout.title = stat.label + ': ' + stat.detail;
      var label = document.createElement('small'); label.textContent = shortNames[stat.value] || stat.short || stat.label;
      var value = document.createElement('strong'); value.className = 'home-status-value';
      value.textContent = stat.value.replace('-', '–');
      var unit = document.createElement('span'); unit.className = 'home-status-unit'; unit.textContent = stat.unit;
      value.appendChild(unit);
      var detail = document.createElement('span'); detail.className = 'home-status-detail'; detail.textContent = stat.label + ', measured concurrently across the fleet.';
      readout.appendChild(label); readout.appendChild(value); readout.appendChild(detail);
      status.appendChild(readout);
    });
    var statusLink = document.createElement('a');
    statusLink.className = 'home-status-link';
    statusLink.href = pageHref('stats'); statusLink.dataset.sceneLink = 'stats';
    statusLink.textContent = 'All measurements →';
    statusLink.setAttribute('aria-label', 'All measurements. Measured ' + stats.measured + ', ' + stats.scope);
    status.appendChild(statusLink);
    el.insertBefore(status, leftColumn);

    if (window.ArkPulse) ArkPulse.get().then(function (result) {
      var data = result.data;
      var alive = data.nodes.filter(function (n) { return !n.error && n.qps > 0; }).length;
      liveValue.firstChild.nodeValue = Math.round(data.aggregate_qps).toLocaleString('en-US');
      liveLabel.textContent = 'Live capacity · ' + alive + '/' + data.nodes.length + ' nodes';
      liveDetail.textContent = 'Hourly synthetic benchmark measured ' + new Date(data.measured_at_ms).toLocaleString() + '; ' + data.total_entries.toLocaleString('en-US') + ' benchmark operations, ' + data.errors + ' errors. This is capacity, not cumulative ledger growth.';
      liveReadout.dataset.state = data.errors ? 'warn' : 'ok';
    }).catch(function () {
      liveLabel.textContent = 'Live fleet pulse unavailable';
      liveDetail.textContent = 'Audited measurements below remain dated evidence; no live value has been substituted.';
      liveReadout.dataset.state = 'warn';
    });

    return el;
  }
};

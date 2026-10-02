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
    // A vector drafting plate keeps the pattern crisp at every viewport size.
    var plate = document.createElement('div');
    plate.className = 'home-drafting-plate';
    plate.setAttribute('aria-hidden', 'true');
    var arcs = '';
    for (var r = 42; r <= 240; r += 14) {
      arcs += '<circle cx="300" cy="250" r="' + r + '" />';
    }
    var strokes = '';
    for (var n = 0; n < 24; n++) {
      strokes += '<path d="M' + (370 + n * 9) + ' 470 l95 -150" stroke-width="' + (1 + n / 8) + '" />';
    }
    plate.innerHTML = '<svg viewBox="0 0 680 600" fill="none" xmlns="http://www.w3.org/2000/svg"><g class="plate-arcs">' + arcs + '</g><path class="plate-axis" d="M0 250H680M300 0V600M60 10V590M620 10V590"/><g class="plate-lines">' + strokes + '</g><path class="plate-block" d="M300 10H540V250H300Z"/><path class="plate-cut" d="M300 10a240 240 0 0 1 240 240H300Z"/><g class="plate-nodes"><path d="M54 250h12m-6 -6v12M294 490h12m-6 -6v12M614 250h12m-6 -6v12"/><rect x="294" y="244" width="12" height="12"/><rect x="54" y="484" width="12" height="12"/></g></svg><span class="plate-label">F / 01 — INDEPENDENT NETWORKS</span><span class="plate-index">SUBSTRATE / AGREEMENT / RECEIPT</span>';
    el.appendChild(plate);
    var body = el.querySelector('.ark-hero-body');
    var heading = body.querySelector('.ark-hero-title');
    var headline = ArkCopy.text('HOME.TITLE');
    if (heading && headline.indexOf('Run your own network ') === 0) {
      heading.textContent = '';
      var mainLine = document.createElement('span');
      mainLine.className = 'home-headline-main'; mainLine.textContent = 'Run your own network';
      var subLine = document.createElement('span');
      subLine.className = 'home-headline-detail'; subLine.textContent = headline.slice(21);
      heading.appendChild(mainLine); heading.appendChild(subLine);
    }
    var promise = document.createElement('p');
    promise.className = 'home-promise';
    promise.textContent = ArkCopy.text('HOME.PROMISE');
    body.insertBefore(promise, body.firstChild);
    var actions = document.createElement('div');
    actions.className = 'home-hero-actions';
    var primary = document.createElement('a');
    primary.className = 'home-primary-cta';
    primary.href = pageHref('deployment'); primary.dataset.sceneLink = 'deployment';
    primary.textContent = ArkCopy.text('HOME.CTA');
    actions.appendChild(primary);
    var secondary = document.createElement('a');
    secondary.className = 'home-ghost-cta';
    secondary.href = pageHref('download'); secondary.dataset.sceneLink = 'download';
    secondary.textContent = ArkCopy.text('HOME.SECONDARY');
    actions.appendChild(secondary);
    var questions = document.createElement('nav');
    questions.className = 'home-question-links';
    questions.setAttribute('aria-label', 'Learn about Flux');
    [['HOME.QUESTION.RESOLVER', 'resolver'], ['HOME.QUESTION.FLUX', 'about']].forEach(function (item) {
      var link = document.createElement('a');
      link.href = pageHref(item[1]); link.dataset.sceneLink = item[1];
      link.textContent = ArkCopy.text(item[0]);
      questions.appendChild(link);
    });
    actions.appendChild(questions);
    body.appendChild(actions);

    var lifecycle = document.createElement('nav');
    lifecycle.className = 'home-lifecycle';
    lifecycle.setAttribute('aria-label', 'The agreement lifecycle');
    var flow = document.createElement('div');
    flow.className = 'home-agreement-flow';
    flow.dataset.homeFlow = 'ordered';
    flow.setAttribute('aria-hidden', 'true');
    var symbols = ['?', '↗', '=', '→', '✓'];
    ArkUI.lifecycleStages.forEach(function (stage, i) {
      var node = document.createElement('span');
      node.className = 'home-flow-node';
      node.style.setProperty('--flow-step', i);
      node.textContent = symbols[i];
      flow.appendChild(node);
    });
    lifecycle.appendChild(flow);
    var caption = document.createElement('p');
    caption.className = 'home-lifecycle-caption';
    caption.textContent = 'Agreement lifecycle';
    lifecycle.appendChild(caption);
    var lifecycleIntro = document.createElement('div');
    lifecycleIntro.className = 'home-lifecycle-intro';
    var lifecycleTitle = document.createElement('strong');
    lifecycleTitle.textContent = 'From intent to receipt.';
    var lifecycleMeta = document.createElement('span');
    lifecycleMeta.textContent = '05 stages / one verifiable agreement';
    lifecycleIntro.appendChild(lifecycleTitle);
    lifecycleIntro.appendChild(lifecycleMeta);
    lifecycle.appendChild(lifecycleIntro);
    var seeAll = document.createElement('a');
    seeAll.className = 'home-lifecycle-all';
    seeAll.href = pageHref('lifecycle'); seeAll.dataset.sceneLink = 'lifecycle';
    seeAll.textContent = 'See all';
    lifecycle.appendChild(seeAll);
    var rail = document.createElement('ol');
    rail.className = 'home-stage-rail';
    ArkUI.lifecycleStages.forEach(function (stage, i) {
      var li = document.createElement('li');
      var link = document.createElement('a');
      link.className = 'home-stage-link';
      link.href = pageHref('lifecycle/' + stage.id); link.dataset.sceneLink = 'lifecycle/' + stage.id;
      var num = document.createElement('span');
      num.className = 'home-stage-num'; num.textContent = ('0' + (i + 1)).slice(-2);
      var name = document.createElement('span');
      name.className = 'home-stage-name'; name.textContent = stage.title;
      var bar = document.createElement('span');
      bar.className = 'home-stage-bar'; bar.setAttribute('aria-hidden', 'true');
      link.appendChild(num); link.appendChild(name); link.appendChild(bar);
      link.style.setProperty('--flow-step', i);
      li.appendChild(link); rail.appendChild(li);
    });
    lifecycle.appendChild(rail);
    el.appendChild(lifecycle);

    var status = document.createElement('aside');
    status.className = 'home-status-rail';
    status.setAttribute('aria-label', 'Protocol status');
    for (var s = 1; s <= 3; s++) {
      var item = [ArkCopy.text('HOME.STATUS' + s + '.LABEL'), ArkCopy.text('HOME.STATUS' + s + '.VALUE')];
      var readout = document.createElement('span');
      readout.className = 'home-status-item';
      var label = document.createElement('small');
      label.textContent = item[0];
      var value = document.createElement('strong');
      value.textContent = item[1];
      readout.appendChild(label);
      readout.appendChild(value);
      status.appendChild(readout);
    }
    var statusLink = document.createElement('a');
    statusLink.className = 'home-status-link';
    statusLink.href = 'docs/status.md';
    statusLink.textContent = ArkCopy.text('HOME.STATUS.NOTE') + ' ↗';
    status.appendChild(statusLink);
    el.insertBefore(status, lifecycle);

    return el;
  }
};

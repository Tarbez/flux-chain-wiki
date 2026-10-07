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
    var heading = body.querySelector('.ark-hero-title');
    var headline = ArkCopy.text('HOME.TITLE');
    if (heading) {
      heading.textContent = '';
      var mainLine = document.createElement('span');
      mainLine.className = 'home-headline-main';
      var lead=document.createElement('span');lead.className='home-headline-lead';lead.textContent='What if agreement';
      var pivot=document.createElement('span');pivot.className='home-headline-pivot';pivot.textContent="didn't need";
      var reveal=document.createElement('span');reveal.className='home-headline-network';reveal.textContent='a global chain?';
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
    var primary = document.createElement('a');
    primary.className = 'home-primary-cta';
    primary.href = pageHref('deployment'); primary.dataset.sceneLink = 'deployment';
    primary.setAttribute('aria-label', ArkCopy.text('HOME.CTA'));
    actionCopy(primary, 'Interactive walkthrough', ArkCopy.text('HOME.CTA'));
    actions.appendChild(primary);
    var secondary = document.createElement('a');
    secondary.className = 'home-ghost-cta';
    secondary.href = pageHref('download'); secondary.dataset.sceneLink = 'download';
    secondary.setAttribute('aria-label', ArkCopy.text('HOME.SECONDARY'));
    actionCopy(secondary, 'Build it yourself', ArkCopy.text('HOME.SECONDARY'));
    actions.appendChild(secondary);
    var questions = document.createElement('nav');
    questions.className = 'home-question-links';
    questions.setAttribute('aria-label', 'Learn about DEFXN');
    [['HOME.QUESTION.RESOLVER', 'resolver']].forEach(function (item) {
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
    var caption = document.createElement('p'); caption.className = 'home-lifecycle-caption';
    caption.textContent = 'The agreement fabric'; lifecycle.appendChild(caption);
    var title = document.createElement('strong'); title.className = 'home-cycle-title';
    title.textContent = 'Every step leaves a trace.'; lifecycle.appendChild(title);
    var flow=ArkUI.buildAgreementFlow({stages:ArkUI.lifecycleStages,hrefFor:function(id){return pageHref('lifecycle/'+id);}});
    lifecycle.appendChild(flow.element);
    // One onward action, styled as a tile: what it is, then where it goes.
    var open = document.createElement('a'); open.className = 'home-lifecycle-all';
    open.href = pageHref('lifecycle'); open.dataset.sceneLink = 'lifecycle';open.dataset.icon='arrow-right';
    open.setAttribute('aria-label', 'Trace one agreement, end to end');
    var openCopy = document.createElement('span'); openCopy.className = 'home-lifecycle-all-copy';
    var openKicker = document.createElement('small'); openKicker.textContent = 'Full walkthrough';
    var openLabel = document.createElement('span'); openLabel.textContent = 'Trace one agreement, end to end';
    openCopy.appendChild(openKicker); openCopy.appendChild(openLabel); open.appendChild(openCopy);
    lifecycle.appendChild(open);
    el.appendChild(lifecycle);

    // Measured numbers, shared with /stats (js/content/stats-highlights.js).
    var stats = window.ArkStatsHighlights;
    var status = document.createElement('aside');
    status.className = 'home-status-rail';
    status.setAttribute('aria-label', 'Measured mesh performance');
    stats.items.forEach(function (stat) {
      var readout = document.createElement('div'); readout.className = 'home-status-item';
      var label = document.createElement('small'); label.textContent = stat.label;
      var value = document.createElement('strong'); value.className = 'home-status-value';
      value.textContent = stat.value;
      var unit = document.createElement('span'); unit.className = 'home-status-unit'; unit.textContent = stat.unit;
      value.appendChild(unit);
      var detail = document.createElement('span'); detail.className = 'home-status-detail'; detail.textContent = stat.detail;
      readout.appendChild(label); readout.appendChild(value); readout.appendChild(detail);
      status.appendChild(readout);
    });
    var statusLink = document.createElement('a');
    statusLink.className = 'home-status-link';
    statusLink.href = pageHref('stats'); statusLink.dataset.sceneLink = 'stats';
    var scope = document.createElement('small'); scope.className = 'home-status-scope';
    scope.textContent = 'Measured ' + stats.measured + ' · ' + stats.scope;
    statusLink.appendChild(scope); statusLink.appendChild(document.createTextNode('All measurements →'));
    statusLink.setAttribute('aria-label', 'All measurements. Measured ' + stats.measured + ', ' + stats.scope);
    status.appendChild(statusLink);
    el.insertBefore(status, lifecycle);

    el.arkRestore=flow.restore;
    el.arkDispose=flow.dispose;
    return el;
  }
};

ArkUI.pageModules.zero = {
  mount: function (host) {
    var el = ArkUI.render([
      'F-HOME-RLAYER_V1', '-N-zero',
      '. F-BODY-RBODY_V1',
      '  -E-HOME.EYEBROW', '  -H-HOME.TITLE', '  -T-HOME.INTRO',
      '  -S-1.42', '  .', '.'
    ].join('\n'), host);
    el.classList.add('ark-page'); el.dataset.arkPage = 'zero';
    var body = el.querySelector('.ark-hero-body');
    var promise = document.createElement('p');
    promise.className = 'home-promise';
    promise.textContent = ArkCopy.text('HOME.PROMISE');
    body.insertBefore(promise, body.firstChild);
    var title = el.querySelector('.ark-hero-title');
    var words = (title.textContent || '').trim().split(/\s+/);
    if (words.length > 2) {
      title.textContent = '';
      var kicker = document.createElement('span');
      kicker.className = 'home-title-kicker';
      kicker.textContent = words.shift();
      title.appendChild(kicker);
      title.appendChild(document.createTextNode(' '));
      var main = document.createElement('span');
      main.className = 'home-title-main';
      main.textContent = words.slice(0, -1).join(' ');
      title.appendChild(main);
      title.appendChild(document.createTextNode(' '));
      var finish = document.createElement('em');
      finish.className = 'home-title-finish';
      finish.textContent = words[words.length - 1];
      title.appendChild(finish);
    } else if (words.length > 1) {
      var accent = words.pop();
      title.textContent = '';
      var lead = document.createElement('span');
      lead.textContent = words.join(' ');
      title.appendChild(lead);
      title.appendChild(document.createTextNode(' '));
      var em = document.createElement('em');
      em.textContent = accent;
      title.appendChild(em);
    }

    var actions = document.createElement('div');
    actions.className = 'home-hero-actions';
    var deploy = document.createElement('a');
    deploy.className = 'home-primary-cta';
    deploy.href = '#/deploy'; deploy.dataset.sceneLink = 'deploy';
    deploy.textContent = ArkCopy.text('HOME.CTA');
    actions.appendChild(deploy);
    var questions = document.createElement('nav');
    questions.className = 'home-question-links';
    questions.setAttribute('aria-label', 'Learn about Flux');
    [['HOME.QUESTION.RESOLVER', 'resolver'], ['HOME.QUESTION.FLUX', 'about']].forEach(function (item) {
      var link = document.createElement('a');
      link.href = '#/' + item[1]; link.dataset.sceneLink = item[1];
      link.textContent = ArkCopy.text(item[0]);
      questions.appendChild(link);
    });
    actions.appendChild(questions);
    body.appendChild(actions);

    var signal = document.createElement('div');
    signal.className = 'home-signal-map';
    signal.setAttribute('aria-hidden', 'true');
    var signalMeta = document.createElement('span');
    signalMeta.className = 'home-signal-meta';
    signalMeta.textContent = 'RESOLVER / LIVE';
    signal.appendChild(signalMeta);
    ['outer', 'middle', 'inner'].forEach(function (ring) {
      var orbit = document.createElement('span');
      orbit.className = 'home-signal-orbit home-signal-orbit-' + ring;
      signal.appendChild(orbit);
    });
    var core = document.createElement('span');
    core.className = 'home-signal-core';
    core.textContent = 'R';
    signal.appendChild(core);
    [
      ['manifest', 'MANIFEST'],
      ['mesh', 'MESH'],
      ['agreement', 'AGREEMENT']
    ].forEach(function (item) {
      var node = document.createElement('span');
      node.className = 'home-signal-node home-signal-node-' + item[0];
      node.textContent = item[1];
      signal.appendChild(node);
    });
    el.appendChild(signal);

    var lifecycle = document.createElement('nav');
    lifecycle.className = 'home-lifecycle';
    lifecycle.setAttribute('aria-label', 'The agreement lifecycle');
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
    seeAll.href = '#/lifecycle'; seeAll.dataset.sceneLink = 'lifecycle';
    seeAll.textContent = 'See all';
    lifecycle.appendChild(seeAll);
    var rail = document.createElement('ol');
    rail.className = 'home-stage-rail';
    ArkUI.lifecycleStages.forEach(function (stage, i) {
      var li = document.createElement('li');
      var link = document.createElement('a');
      link.className = 'home-stage-link';
      link.href = '#/lifecycle/' + stage.id; link.dataset.sceneLink = 'lifecycle/' + stage.id;
      var num = document.createElement('span');
      num.className = 'home-stage-num'; num.textContent = ('0' + (i + 1)).slice(-2);
      var name = document.createElement('span');
      name.className = 'home-stage-name'; name.textContent = stage.title;
      var bar = document.createElement('span');
      bar.className = 'home-stage-bar'; bar.setAttribute('aria-hidden', 'true');
      link.appendChild(num); link.appendChild(name); link.appendChild(bar);
      li.appendChild(link); rail.appendChild(li);
    });
    lifecycle.appendChild(rail);
    el.appendChild(lifecycle);

    var status = document.createElement('aside');
    status.className = 'home-status-rail';
    status.setAttribute('aria-label', 'Protocol status');
    [
      ['MESH', 'ONLINE'],
      ['RESOLVERS', 'OPEN'],
      ['AGREEMENTS', 'VERIFIABLE']
    ].forEach(function (item) {
      var readout = document.createElement('span');
      readout.className = 'home-status-item';
      var label = document.createElement('small');
      label.textContent = item[0];
      var value = document.createElement('strong');
      value.textContent = item[1];
      readout.appendChild(label);
      readout.appendChild(value);
      status.appendChild(readout);
    });
    el.appendChild(status);

    if (!window.ArkMeshSettings || ArkMeshSettings.shapeVisible('zero')) {
      var figure = document.createElement('figure');
      figure.className = 'page-iceberg';
      figure.setAttribute('data-iceberg-anchor', '');
      figure.setAttribute('role', 'img');
      figure.setAttribute('aria-label', 'Decorative particle form');
      el.appendChild(figure);
    }
    return el;
  }
};

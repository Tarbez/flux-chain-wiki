ArkUI.pageModules.zero = {
  mount: function (host) {
    var el = ArkUI.render([
      'F-HOME-RLAYER_V1', '-N-zero',
      '. F-STEP-RSTEP_V1', '  -L-SUB', '  -K-0.2', '  -P-48', '  .',
      '. F-BODY-RBODY_V1',
      '  -E-SUBZERO_/_DESIGN_WITH_DEPTH',
      '  -H-Below_the_surface.',
      '  -T-Carefully_crafted_digital_experiences_that_invite_curiosity,_deepen_understanding,_and_make_every_step_mean_something.',
      '  -S-1.42', '  .', '.'
    ].join('\n'), host);
    el.classList.add('ark-page'); el.dataset.arkPage = 'zero';
    var cta = document.createElement('a');
    cta.className = 'home-primary-cta';
    cta.href = '#/experiments'; cta.dataset.sceneLink = 'proximity';
    var label = document.createElement('span'); label.textContent = 'Explore the experiments';
    var arrow = document.createElement('span'); arrow.className = 'home-cta-arrow';
    arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true');
    cta.appendChild(label); cta.appendChild(arrow);
    el.querySelector('.ark-hero-body').appendChild(cta);
    return el;
  }
};

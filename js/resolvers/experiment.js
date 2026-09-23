/* Page markup lives in the ARK registry; presence is owned by scene state. */
ArkUI.register('REXPERIMENT_V1', {
  tag: 'section',
  attrs: function () { return {
    id: 'hero-recent-experiment', class: 'hero-experiment-state ark-page',
    'data-ark-page': 'proximity', 'aria-label': 'Quorum demo',
    hidden: '', inert: '', 'aria-hidden': 'true'
  }; },
  decorate: function (el) {
    el.innerHTML = [
    '<p class="hero-experiment-kicker"><span>FROM THE SPEC</span><b>FX—001</b></p>',
    '<div class="hero-experiment-copy">',
    '  <p class="hero-experiment-index">01 / QUORUM</p>',
    '  <h2>AGREEMENT</h2>',
    '  <p class="hero-experiment-question">When do separate copies start to read as one?</p>',
    '  <p class="hero-experiment-note">Three ribbons. Thousands of points. Independent paths draw close, overlap, and begin to read as one continuous form — the same idea behind a quorum of separate nodes converging on one ledger.</p>',
    '  <a href="#/experiments/lab" data-scene-link="lab">OPEN THE LAB <span aria-hidden="true">↘</span></a>',
    '</div>',
    '<div class="hero-experiment-meter" aria-hidden="true"><i></i><span>AGREEMENT / 50</span></div>'
  ].join('');
  }
});

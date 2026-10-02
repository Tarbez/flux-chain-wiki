/* Page markup lives in the ARK registry; presence is owned by scene state. */
ArkUI.register('REXPERIMENT_V1', {
  tag: 'section',
  attrs: function () { return {
    id: 'hero-recent-experiment', class: 'hero-experiment-state ark-page',
    'data-ark-page': 'proximity', 'aria-label': 'Interactive model introduction',
    hidden: '', inert: '', 'aria-hidden': 'true'
  }; },
  decorate: function (el) {
    el.innerHTML = [
    '<p class="hero-experiment-kicker"><span>INTERACTIVE MODEL</span><b>FX—001</b></p>',
    '<div class="hero-experiment-copy">',
    '  <p class="hero-experiment-index">01 / AUTHORITY</p>',
    '  <h1>THRESHOLD</h1>',
    '  <p class="hero-experiment-question">How can threshold agreement be pictured?</p>',
    '  <p class="hero-experiment-note"><strong>Illustrative, not live network data.</strong> The moving forms are a visual analogy for independent inputs approaching a threshold. They do not represent real nodes, votes, or a ledger.</p>',
    '  <a href="#/experiments/lab" data-scene-link="lab">EXPLORE THE MODEL <span aria-hidden="true">↘</span></a>',
    '</div>',
    '<div class="hero-experiment-meter" aria-hidden="true"><i></i><span>AGREEMENT / 50</span></div>'
  ].join('');
  }
});

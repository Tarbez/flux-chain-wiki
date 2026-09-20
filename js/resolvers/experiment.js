/* Page markup lives in the ARK registry; presence is owned by scene state. */
ArkUI.register('REXPERIMENT_V1', {
  tag: 'section',
  attrs: function () { return {
    id: 'hero-recent-experiment', class: 'hero-experiment-state ark-page',
    'data-ark-page': 'proximity', 'aria-label': 'Proximity experiment',
    hidden: '', inert: '', 'aria-hidden': 'true'
  }; },
  decorate: function (el) {
    el.innerHTML = [
    '<p class="hero-experiment-kicker"><span>RECENT EXPERIMENT</span><b>SZ—001</b></p>',
    '<div class="hero-experiment-copy">',
    '  <p class="hero-experiment-index">01 / PERCEPTION STUDY</p>',
    '  <h2>PROXIMITY</h2>',
    '  <p class="hero-experiment-question">When does a collection become a group?</p>',
    '  <p class="hero-experiment-note">Three ribbons. Thousands of points. Separate paths draw close, overlap, and begin to read as one continuous form.</p>',
    '  <a href="#/experiments/lab" data-scene-link="lab">OPEN THE EXPERIMENT <span aria-hidden="true">↘</span></a>',
    '</div>',
    '<div class="hero-experiment-meter" aria-hidden="true"><i></i><span>DISTANCE / 50</span></div>'
  ].join('');
  }
});

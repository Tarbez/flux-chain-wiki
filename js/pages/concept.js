ArkUI.pageModules.concept = {
  mount: function (host) {
    var el = document.createElement('section');
    el.className = 'ark-page learning-page concept-page'; el.dataset.arkPage = 'concept';
    el.setAttribute('aria-labelledby', 'concept-title');
    el.innerHTML = '<div class="concept-content"><p class="learning-eyebrow">THE SUBZERO THEORY</p><h1 id="concept-title" class="learning-heading">Go beneath the surface.</h1><p class="concept-deck">A rich experience gives attention somewhere meaningful to go. We believe digital spaces can invite curiosity, deepen understanding, and make the journey itself worth taking.</p><div class="concept-principles"><section><span>01</span><div><h2>Give every step a purpose.</h2><p>A page, a transition, a moment of pause: each should help someone discover, understand, or decide. Progress means more than moving further down a screen.</p></div></section><section><span>02</span><div><h2>Make depth accessible.</h2><p>Complex ideas deserve thoughtful explanations. Let people try things, see what changes, and learn at their own pace—without needing to know the tools first.</p></div></section><section><span>03</span><div><h2>Build a shared practice.</h2><p>Subzero is a starting point for a community of curious people: designers, learners, and people with something to build. We want to share questions, experiments, and discoveries that make the next experience better.</p></div></section></div><a class="article-back" href="#/learnings" data-scene-link="learnings">START WITH THE NOTES ↗</a><br><a class="article-back" href="#/about" data-scene-link="about">ABOUT THE STUDIO ↗</a></div>';
    var figure = document.createElement('figure');
    figure.className = 'concept-iceberg';
    figure.setAttribute('data-iceberg-anchor', '');
    figure.setAttribute('role', 'img');
    figure.setAttribute('aria-label', 'An iceberg: a small visible peak above the water and a much larger mass below. The experience is what you see; thoughtful work gives it depth.');
    el.appendChild(figure);
    host.appendChild(el); return el;
  }
};

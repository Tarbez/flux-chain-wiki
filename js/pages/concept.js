ArkUI.pageModules.concept = {
  mount: function (host) {
    var el = document.createElement('section');
    el.className = 'ark-page learning-page concept-page'; el.dataset.arkPage = 'concept';
    el.setAttribute('aria-labelledby', 'concept-title');
    // Every link on this page opens one of the theory's own pages; the list in TheoryContent decides which.
    function cta(entry) {
      return '<a class="article-back" href="#/concept/' + entry.slug + '" data-scene-link="concept/' + entry.slug + '">' + entry.cta + ' <span class="cta-arrow" aria-hidden="true">↗</span></a>';
    }
    var pages = TheoryContent.pages;
    var rows = pages.filter(function (entry) { return entry.number; }).map(function (entry) {
      return '<section><span>' + entry.number + '</span><h2>' + entry.title + '</h2>' + cta(entry) + '</section>';
    }).join('');
    var rail = pages.filter(function (entry) { return !entry.number; }).map(cta).join('');
    el.innerHTML = '<div class="concept-content"><p class="learning-eyebrow">THE SUBZERO THEORY</p><h1 id="concept-title" class="learning-heading">Go beneath the surface.</h1><p class="concept-deck">A rich experience gives attention somewhere meaningful to go. We believe digital spaces can invite curiosity, deepen understanding, and make the journey itself worth taking.</p><div class="concept-principles">' + rows + '</div><nav class="concept-links" aria-label="Continue exploring">' + rail + '</nav></div>';
    var figure = document.createElement('figure');
    figure.className = 'concept-iceberg';
    figure.setAttribute('data-iceberg-anchor', '');
    figure.setAttribute('role', 'img');
    figure.setAttribute('aria-label', 'An iceberg: a small visible peak above the water and a much larger mass below. The experience is what you see; thoughtful work gives it depth.');
    el.appendChild(figure);
    host.appendChild(el); return el;
  }
};

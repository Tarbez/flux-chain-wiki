ArkUI.pageModules.proximity = {
  mount: function (host) {
    var el = ArkUI.render('F-EXPERIMENT-REXPERIMENT_V1', host);
    var intro = document.createElement('div'); intro.className = 'experiment-page-intro';
    while (el.firstChild) intro.appendChild(el.firstChild);
    var anchor = document.createElement('div'); anchor.className = 'experiment-mesh-anchor'; anchor.dataset.meshAnchor = 'true'; intro.appendChild(anchor);
    el.appendChild(intro);
    el.className = 'ark-page learning-page experiments-page';
    if (!window.ArkMeshSettings || ArkMeshSettings.shapeVisible('proximity')) {
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

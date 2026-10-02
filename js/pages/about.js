ArkUI.pageModules.about = {
  mount: function (host) {
    var el = ArkUI.sheet('about', 'about');
    var principles = el.querySelector('.concept-principles');
    if (principles && principles.parentNode && !principles.parentNode.classList.contains('content-layer-context')) {
      var contextLayer = document.createElement('details');
      contextLayer.className = 'content-layer content-layer-context';
      var summary = document.createElement('summary');
      summary.textContent = ArkCopy.text('ABOUT.CONTEXT');
      contextLayer.appendChild(summary);
      principles.parentNode.insertBefore(contextLayer, principles);
      contextLayer.appendChild(principles);
    }
    var footer = el.querySelector('.theory-footer');
    if (footer) {
      var status = ArkUI.el('a', 'article-back');
      status.href = 'docs/status.md';
      status.textContent = ArkCopy.text('ABOUT.STATUS') + ' ↗';
      footer.appendChild(status);
    }
    if (!window.ArkMeshSettings || ArkMeshSettings.shapeVisible('about')) {
      var figure = document.createElement('figure');
      figure.className = 'page-iceberg';
      figure.setAttribute('data-iceberg-anchor', '');
      figure.setAttribute('role', 'img');
      figure.setAttribute('aria-label', 'Decorative particle form');
      el.appendChild(figure);
    }
    host.appendChild(el); return el;
  }
};

ArkUI.pageModules.download = {
  mount: function (host) {
    var el = ArkUI.sheet('download', 'download');
    if (!window.ArkMeshSettings || ArkMeshSettings.shapeVisible('download')) {
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

ArkUI.pageModules.concept = {
  mount: function (host) {
    var el = ArkUI.el('section', 'ark-page learning-page concept-page');
    el.dataset.arkPage = 'concept'; el.setAttribute('aria-labelledby', 'concept-title');
    function words(role) { return ArkCopy.text('CONCEPT.' + role); }
    // Every link on this page opens one of the theory's pages. The manifests decide which exist and where each sits.
    function cta(manifest) {
      var area = manifest.id.toUpperCase();
      var a = ArkUI.el('a', 'article-back');
      a.href = '#/concept/' + manifest.id; a.dataset.sceneLink = 'concept/' + manifest.id;
      a.appendChild(document.createTextNode(ArkCopy.text(area + '.CTA') + ' '));
      var arrow = ArkUI.el('span', 'cta-arrow', '↗'); arrow.setAttribute('aria-hidden', 'true');
      a.appendChild(arrow); return a;
    }
    var theory = ArkManifest.group('theory');
    var content = ArkUI.el('div', 'concept-content');
    content.appendChild(ArkUI.el('p', 'learning-eyebrow', words('EYEBROW')));
    var title = ArkUI.el('h1', 'learning-heading', words('TITLE')); title.id = 'concept-title';
    content.appendChild(title);
    content.appendChild(ArkUI.el('p', 'concept-deck', words('DECK')));
    var rows = ArkUI.el('div', 'concept-principles');
    theory.filter(function (m) { return m.meta.placement === 'row'; }).forEach(function (m, i) {
      var row = ArkUI.el('section');
      row.appendChild(ArkUI.el('span', '', ('0' + (i + 1)).slice(-2)));
      row.appendChild(ArkUI.el('h2', '', ArkCopy.text(m.id.toUpperCase() + '.TITLE')));
      row.appendChild(cta(m)); rows.appendChild(row);
    });
    content.appendChild(rows);
    var rail = ArkUI.el('nav', 'concept-links'); rail.setAttribute('aria-label', words('RAIL'));
    theory.filter(function (m) { return m.meta.placement === 'rail'; }).forEach(function (m) { rail.appendChild(cta(m)); });
    content.appendChild(rail); el.appendChild(content);
    if (!window.ArkMeshSettings || ArkMeshSettings.shapeVisible('concept')) {
      var figure = ArkUI.el('figure', 'concept-iceberg');
      figure.setAttribute('data-iceberg-anchor', ''); figure.setAttribute('role', 'img');
      figure.setAttribute('aria-label', words('ICEBERG'));
      el.appendChild(figure);
    }
    host.appendChild(el); return el;
  }
};

/* The resolver story is three short, sequential pages. Copy and relationships
   live in manifests; this module only owns their shared semantic structure. */
ArkUI.pageModules.resolverGuide = {
  mount: function (host, page) {
    var manifest = ArkManifest.get(page);
    var area = page.toUpperCase();
    function words(role) { return ArkCopy.text(area + '.' + role); }
    function routeLink(role, target, className) {
      var link = ArkUI.el('a', className);
      link.href = '#' + ArkUI.pageCatalog[target].path; link.dataset.sceneLink = target;
      link.appendChild(document.createTextNode(words(role) + ' '));
      var arrow = ArkUI.el('span', 'cta-arrow', '↗');
      arrow.setAttribute('aria-hidden', 'true');
      link.appendChild(arrow);
      return link;
    }

    var el = ArkUI.el('section', 'ark-page learning-page resolver-guide-page ' + page + '-page');
    el.dataset.arkPage = page;
    el.setAttribute('aria-labelledby', page + '-title');
    var content = ArkUI.el('div', 'resolver-guide-content');
    content.appendChild(ArkUI.el('p', 'learning-eyebrow', words('EYEBROW')));
    var title = ArkUI.el('h1', 'learning-heading', words('TITLE'));
    title.id = page + '-title';
    content.appendChild(title);

    var copy = ArkUI.el('div', 'resolver-guide-copy');
    for (var n = 1; manifest.fields['BODY' + n]; n++) copy.appendChild(ArkUI.el('p', '', words('BODY' + n)));
    content.appendChild(copy);

    var footer = ArkUI.el('nav', 'resolver-guide-links');
    footer.setAttribute('aria-label', 'Continue');
    if (manifest.meta.next) footer.appendChild(routeLink('NEXT', manifest.meta.next, manifest.meta.primary ? 'resolver-primary-cta' : 'resolver-next-link'));
    if (manifest.meta.back) footer.appendChild(routeLink('BACK', manifest.meta.back, 'resolver-back-link'));
    content.appendChild(footer);
    el.appendChild(content);
    host.appendChild(el);
    return el;
  }
};

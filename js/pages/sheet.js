/* One page of headed points: the theory's detail pages and About are the same sheet with different words.
   The words come from the page's manifest; the sheet has as many points as the manifest has POINT<n> fields. */
ArkUI.sheet = function (id, page) {
  var manifest = ArkManifest.get(id);
  var area = id.toUpperCase();
  function words(role) { return ArkCopy.text(area + '.' + role); }
  function link(role, target, className) {
    var a = ArkUI.el('a', className || 'article-back');
    a.href = '#'; a.dataset.sceneLink = target;
    a.appendChild(document.createTextNode(words(role) + ' '));
    var arrow = ArkUI.el('span', 'cta-arrow', '↗'); arrow.setAttribute('aria-hidden', 'true');
    a.appendChild(arrow); return a;
  }
  var el = ArkUI.el('section', 'ark-page learning-page theory-page ' + id + '-page');
  el.dataset.arkPage = page; el.setAttribute('aria-labelledby', id + '-title');
  var content = ArkUI.el('div', 'concept-content');
  content.appendChild(ArkUI.el('p', 'learning-eyebrow', words('EYEBROW')));
  var title = ArkUI.el('h1', 'learning-heading', words('TITLE')); title.id = id + '-title';
  content.appendChild(title);
  content.appendChild(ArkUI.el('p', 'concept-deck', words('DECK')));
  var list = ArkUI.el('div', 'concept-principles');
  for (var n = 1; n <= ArkManifest.points(manifest); n++) {
    var row = ArkUI.el('section'), body = ArkUI.el('div');
    row.appendChild(ArkUI.el('span', '', ('0' + n).slice(-2)));
    body.appendChild(ArkUI.el('h2', '', words('POINT' + n + '.TITLE')));
    body.appendChild(ArkUI.el('p', '', words('POINT' + n + '.TEXT')));
    row.appendChild(body); list.appendChild(row);
  }
  content.appendChild(list);
  var footer = ArkUI.el('nav', 'theory-footer'); footer.setAttribute('aria-label', 'Continue');
  if (manifest.meta.next) footer.appendChild(link('NEXT', manifest.meta.next, 'article-back theory-cta'));
  if (manifest.meta.back) footer.appendChild(link('BACK', manifest.meta.back));
  content.appendChild(footer);
  el.appendChild(content);
  return el;
};

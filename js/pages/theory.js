/* One module renders every detail page of the theory; the route names the page. */
ArkUI.pageModules.theory = {
  mount: function (host, page) {
    var entry = TheoryContent.find(String(page).replace(/^concept\//, ''));
    var el = document.createElement('section');
    el.className = 'ark-page learning-page theory-page'; el.dataset.arkPage = page;
    el.setAttribute('aria-labelledby', 'theory-title');
    function node(tag, className, text) {
      var made = document.createElement(tag);
      if (className) made.className = className;
      if (text) made.textContent = text;
      return made;
    }
    function link(label, target, className) {
      var a = node('a', className || 'article-back');
      a.href = '#'; a.dataset.sceneLink = target;
      a.appendChild(document.createTextNode(label + ' '));
      var arrow = node('span', 'cta-arrow', '↗'); arrow.setAttribute('aria-hidden', 'true');
      a.appendChild(arrow); return a;
    }
    var content = node('div', 'concept-content');
    content.appendChild(node('p', 'learning-eyebrow', entry.eyebrow));
    var title = node('h1', 'learning-heading', entry.title); title.id = 'theory-title';
    content.appendChild(title);
    content.appendChild(node('p', 'concept-deck', entry.deck));
    var list = node('div', 'concept-principles');
    entry.points.forEach(function (point, index) {
      var row = node('section'), body = node('div');
      row.appendChild(node('span', '', '0' + (index + 1)));
      body.appendChild(node('h2', '', point.h)); body.appendChild(node('p', '', point.p));
      row.appendChild(body); list.appendChild(row);
    });
    content.appendChild(list);
    var footer = node('nav', 'theory-footer'); footer.setAttribute('aria-label', 'Continue');
    footer.appendChild(link(entry.next.label, entry.next.page, 'article-back theory-cta'));
    footer.appendChild(link('THE THEORY', 'concept'));
    content.appendChild(footer);
    el.appendChild(content);
    host.appendChild(el); return el;
  }
};

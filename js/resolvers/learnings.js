(function () {
  'use strict';
  function node(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  }
  function link(label, page, className) {
    var el = node('a', className, label);
    el.href = '#' + page;
    el.dataset.sceneLink = page;
    return el;
  }
  function attrs(page, label) {
    return { class: 'ark-page learning-page', 'data-ark-page': page, 'aria-label': label, hidden: '', inert: '', 'aria-hidden': 'true', tabindex: '-1' };
  }
  ArkUI.register('RLEARNINGS_V1', {
    tag: 'section', attrs: function () { return attrs('learnings', 'Latest learnings'); },
    decorate: function (el) {
      var wrap = node('div', 'learning-index');
      wrap.appendChild(node('p', 'learning-eyebrow', 'NOTES / ' + String(LearningContent.articles.length).padStart(2, '0')));
      wrap.appendChild(node('h1', 'learning-heading', 'Learnings'));
      wrap.appendChild(node('p', 'learning-intro', 'Notes from the work.'));
      var list = node('ol', 'learning-list');
      LearningContent.articles.forEach(function (article, i) {
        var item = node('li');
        var entry = link('', 'article/' + article.slug, 'learning-entry');
        entry.appendChild(node('span', 'learning-number', String(i + 1).padStart(2, '0')));
        entry.appendChild(node('h2', '', article.title));
        entry.appendChild(node('span', 'learning-duration', article.minutes));
        var arrow = node('span', 'learning-arrow', '↗');
        arrow.setAttribute('aria-hidden', 'true'); entry.appendChild(arrow);
        item.appendChild(entry); list.appendChild(item);
      });
      wrap.appendChild(list);
      el.appendChild(wrap);
    }
  });
  ArkUI.register('RARTICLE_V1', {
    tag: 'article', schema: { S: 'slug' },
    attrs: function (p) { return attrs('article/' + p.slug, LearningContent.find(p.slug).title); },
    decorate: function (el, p) {
      var article = LearningContent.find(p.slug);
      el.classList.add('article-page');
      var header = node('header', 'article-header');
      header.appendChild(link('← ALL LEARNINGS', 'learnings', 'article-back'));
      header.appendChild(node('p', 'learning-eyebrow', article.category + ' · ' + article.minutes));
      var anchor = node('div', 'article-mesh-anchor');
      anchor.dataset.meshAnchor = 'true';
      anchor.setAttribute('aria-hidden', 'true');
      anchor.appendChild(node('span', 'article-word-fallback', article.title));
      header.appendChild(anchor);
      header.appendChild(node('h1', 'article-title', article.title));
      header.appendChild(node('p', 'article-deck', article.summary));
      var playground = node('form', 'article-playground');
      playground.addEventListener('submit', function (event) { event.preventDefault(); });
      var label = node('label', '', 'Try your own title');
      var input = node('input');
      input.type = 'text'; input.maxLength = 72; input.value = article.title;
      input.dataset.wordInput = 'true'; input.setAttribute('aria-label', 'Particle title, up to 72 characters');
      label.appendChild(input); playground.appendChild(label);
      var reset = node('button', '', 'RESET TITLE'); reset.type = 'button'; reset.dataset.resetWord = article.title;
      playground.appendChild(reset);
      playground.appendChild(node('p', 'playground-note', 'Your words reshape the field above. Drag the words left, right, up, or down to look around them. Arrow keys rotate; Home resets. This changes your preview only.'));
      header.appendChild(playground);
      el.appendChild(header);
      var body = node('div', 'article-body');
      var contents = node('nav', 'article-contents'); contents.setAttribute('aria-label', 'In this article');
      contents.appendChild(node('p', 'learning-eyebrow', 'IN THESE NOTES'));
      article.sections.forEach(function (section, i) {
        var button = node('button', '', String(i + 1).padStart(2, '0') + ' / ' + section[0]);
        button.type = 'button'; button.dataset.sectionTarget = article.slug + '-section-' + i;
        contents.appendChild(button);
      });
      body.appendChild(contents);
      var reading = node('div', 'article-reading');
      article.sections.forEach(function (section, i) {
        var block = node('section'); block.id = article.slug + '-section-' + i; block.tabIndex = -1;
        block.appendChild(node('h2', '', section[0]));
        section.slice(1).forEach(function (paragraph) { block.appendChild(node('p', '', paragraph)); });
        reading.appendChild(block);
      });
      if (article.numbers) {
        var tableWrap = node('div', 'article-table');
        var table = node('table'); table.appendChild(node('caption', '', 'The current starting values'));
        var head = node('tr'); ['Choice', 'Value', 'What it means'].forEach(function (text) { var cell = node('th', '', text); cell.scope = 'col'; head.appendChild(cell); });
        var thead = node('thead'); thead.appendChild(head); table.appendChild(thead);
        var tbody = node('tbody');
        [ ['Particle budget', '6,000–24,000', 'The number of sampled points, selected by screen size and hardware signal.'], ['Ribbons', '3 / 72 filaments', 'Three bands, each built from 24 continuous paths.'], ['Dissolution', '0% → 50%', 'Whole at home; partly dispersed in the experiment.'], ['Mesh transition', '1.8 seconds', 'Time to travel to the new target shape.'], ['Turn / tilt', '±180° / ±90°', 'Viewing angle around the form.'], ['Title preview', 'Up to 72 characters', 'The text used to generate the point addresses.'] ].forEach(function (row) { var tr = node('tr'); row.forEach(function (text) { tr.appendChild(node('td', '', text)); }); tbody.appendChild(tr); });
        table.appendChild(tbody); tableWrap.appendChild(table); reading.appendChild(tableWrap);
      }
      var sources = node('aside', 'article-sources');
      sources.appendChild(node('h2', '', 'Keep exploring'));
      sources.appendChild(node('p', '', 'Our visual starting point was Blurry, Domenicobrz’s open-source exploration of depth of field with particles. This site uses its own geometry and renderer, with ARK/Flux managing page state and presence.'));
      var source = node('a', '', 'Explore the Blurry source ↗'); source.href = 'https://github.com/Domenicobrz/Blurry'; sources.appendChild(source);
      reading.appendChild(sources);
      var next = LearningContent.articles[(LearningContent.articles.indexOf(article) + 1) % LearningContent.articles.length];
      reading.appendChild(link('NEXT NOTE / ' + next.title + ' ↗', 'article/' + next.slug, 'article-next'));
      body.appendChild(reading); el.appendChild(body);
    }
  });
})();

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
    el.href = page.indexOf('article/') === 0 ? '#/learnings/' + page.slice(8) : '#/learnings';
    el.dataset.sceneLink = page;
    return el;
  }
  function pageLink(label, page, className) {
    var entry = ArkUI.pageCatalog && ArkUI.pageCatalog[page];
    if (!entry) return null;
    var el = node('a', className, label);
    el.href = '#' + entry.path;
    el.dataset.sceneLink = page;
    return el;
  }
  function attrs(page, label) {
    return { class: 'ark-page learning-page', 'data-ark-page': page, 'aria-label': label, hidden: '', inert: '', 'aria-hidden': 'true', tabindex: '-1' };
  }
  function questionFromHash(slug, count) {
    if (typeof location === 'undefined') return -1;
    var parts = location.hash.split('?');
    if (parts[0] !== '#/learnings/' + slug || !parts[1]) return -1;
    var value = new URLSearchParams(parts[1]).get('q');
    var index = Number(value) - 1;
    return Number.isInteger(index) && index >= 0 && index < count ? index : -1;
  }
  if (typeof window !== 'undefined') {
    function restoreQuestion() {
      var page = document.querySelector('.article-page:not([hidden])');
      if (page && page.selectArticleQuestionFromRoute) page.selectArticleQuestionFromRoute();
    }
    window.addEventListener('popstate', restoreQuestion);
    window.addEventListener('hashchange', restoreQuestion);
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
      var articleIndex = LearningContent.articles.indexOf(article);
      var header = node('header', 'article-header');
      var top = node('div', 'article-topline');
      top.appendChild(link('← ALL LEARNINGS', 'learnings', 'article-back'));
      top.appendChild(node('span', 'article-position', (article.category || 'NOTE / ' + String(articleIndex + 1).padStart(2, '0')) + '  /  ' + article.minutes));
      var coreReturn = node('button', 'article-core-return', '← CORE');
      coreReturn.type = 'button'; coreReturn.hidden = true;
      top.appendChild(coreReturn);
      header.appendChild(top);
      header.appendChild(node('h1', 'article-title', article.title));
      var core = node('div', 'article-core');
      core.appendChild(node('span', 'article-core-label', 'THE CORE'));
      core.appendChild(node('p', 'article-core-text', article.core || article.summary));
      core.appendChild(node('p', 'article-relevance', article.relevance));
      header.appendChild(core);
      el.appendChild(header);
      var body = node('div', 'article-body');
      var contents = node('nav', 'article-contents'); contents.setAttribute('aria-label', 'Choose a question');
      contents.appendChild(node('p', 'learning-eyebrow', 'QUESTIONS / ' + String(article.sections.length).padStart(2, '0')));
      var coreChoice = node('button', 'article-core-choice', '00');
      coreChoice.type = 'button';
      coreChoice.setAttribute('aria-label', '00 Return to the core');
      coreChoice.title = 'Return to the core';
      contents.appendChild(coreChoice);
      var choices = [];
      article.sections.forEach(function (section, i) {
        var button = node('button', 'article-choice');
        button.type = 'button';
        button.setAttribute('aria-label', String(i + 1).padStart(2, '0') + ' ' + ((article.questions || [])[i] || section[0]));
        button.title = (article.questions || [])[i] || section[0];
        button.setAttribute('aria-controls',article.slug + '-section-' + i);
        button.appendChild(node('span', 'article-choice-number', String(i + 1).padStart(2, '0')));
        button.appendChild(node('span', 'article-choice-question', (article.questions || [])[i] || section[0]));
        choices.push(button);
        contents.appendChild(button);
      });
      body.appendChild(contents);
      var reading = node('div', 'article-reading');
      var panels = [];
      var sectionLabels = [];
      article.sections.forEach(function (section, i) {
        var block = node('section'); block.id = article.slug + '-section-' + i; block.tabIndex = -1;
        var sectionLabel = node('span', 'article-section-index');
        block.appendChild(sectionLabel); sectionLabels.push(sectionLabel);
        block.appendChild(node('h2', '', section[0]));
        section.slice(1).forEach(function (paragraph) { block.appendChild(node('p', '', paragraph)); });
        reading.appendChild(block); panels.push(block);
      });
      if (article.numbers) {
        var tableWrap = node('div', 'article-table');
        var table = node('table'); table.appendChild(node('caption', '', 'The current starting values'));
        var head = node('tr'); ['Choice', 'Value', 'What it means'].forEach(function (text) { var cell = node('th', '', text); cell.scope = 'col'; head.appendChild(cell); });
        var thead = node('thead'); thead.appendChild(head); table.appendChild(thead);
        var tbody = node('tbody');
        [ ['Particle budget', '6,000–24,000', 'The number of sampled points, selected by screen size and hardware signal.'], ['Ribbons', '3 / 72 filaments', 'Three bands, each built from 24 continuous paths.'], ['Dissolution', '0% → 50%', 'Whole at home; partly dispersed in the experiment.'], ['Mesh transition', '1.8 seconds', 'Time to travel to the new target shape.'], ['Turn / tilt', '±180° / ±90°', 'Viewing angle around the form.'], ['Title preview', 'Up to 72 characters', 'The text used to generate the point addresses.'] ].forEach(function (row) { var tr = node('tr'); row.forEach(function (text) { tr.appendChild(node('td', '', text)); }); tbody.appendChild(tr); });
        table.appendChild(tbody); tableWrap.appendChild(table); panels[panels.length - 1].appendChild(tableWrap);
      }
      var next = LearningContent.articles[(LearningContent.articles.indexOf(article) + 1) % LearningContent.articles.length];
      var controls = node('div', 'article-answer-controls');
      var previous = node('button', '', '← PREVIOUS'); previous.type = 'button';
      var counter = node('span', 'article-answer-count');
      counter.setAttribute('aria-live', 'polite');
      var forward = node('button', '', 'NEXT QUESTION →'); forward.type = 'button';
      controls.appendChild(previous); controls.appendChild(counter); controls.appendChild(forward);
      reading.appendChild(controls);
      var nextNote = link('NEXT NOTE / ' + next.title + ' ↗', 'article/' + next.slug, 'article-next');
      reading.appendChild(nextNote);
      body.appendChild(reading);
      var sources = node('details', 'article-sources');
      sources.appendChild(node('summary', '', 'Evidence, review date & next step'));
      sources.appendChild(node('p', 'article-reviewed', 'Editorial review: ' + article.reviewed + '. This is not live capability verification.'));
      var evidenceLink = node('a', 'article-evidence-link', article.evidenceLabel);
      evidenceLink.href = article.evidenceHref;
      sources.appendChild(evidenceLink);
      var related = pageLink('Related mechanism ↗', article.relatedPage, 'article-related');
      var action = pageLink(article.actionLabel + ' ↗', article.actionPage, 'article-action');
      if (related) sources.appendChild(related);
      if (action) sources.appendChild(action);
      body.appendChild(sources); el.appendChild(body);
      var choiceAnimation = null;
      var choiceRevision = 0;
      function setSectionLabel(hovered) {
        var current = Number(el.dataset.articleChoice);
        if (current < 0 || current >= panels.length) return;
        sectionLabels[current].textContent = hovered === undefined
          ? String(current + 1).padStart(2, '0') + ' / ' + ((article.questions || [])[current] || article.sections[current][0])
          : hovered < 0 ? '00 / RETURN TO CORE'
          : String(hovered + 1).padStart(2, '0') + ' / CONTINUE READING → ' + article.sections[hovered][0];
      }
      function select(index, scroll, writeHistory) {
        var active = index >= 0 && index < panels.length;
        el.classList.toggle('has-answer',active);
        reading.hidden = !active;
        coreReturn.hidden = !active;
        choices.forEach(function (choice, i) {
          choice.setAttribute('aria-pressed',String(i === index));
          panels[i].hidden = i !== index;
        });
        previous.disabled = !active;
        previous.textContent = index <= 0 ? '← THE CORE' : '← ' + ((article.questions || [])[index - 1] || article.sections[index - 1][0]);
        forward.hidden = !active || index === panels.length - 1;
        if (active && index < panels.length - 1) forward.textContent = ((article.questions || [])[index + 1] || article.sections[index + 1][0]) + ' →';
        nextNote.hidden = index !== panels.length - 1;
        counter.textContent = active ? String(index + 1).padStart(2, '0') + ' / ' + String(panels.length).padStart(2, '0') : '';
        el.dataset.articleChoice = String(index);
        if (active) setSectionLabel();
        if (writeHistory && typeof history !== 'undefined' && typeof location !== 'undefined') {
          var hash = '#/learnings/' + article.slug + (active ? '?q=' + (index + 1) : '');
          if (location.hash !== hash) history.pushState(null,'',hash);
        }
        if (scroll) {
          var scene = el.closest && el.closest('.hero-alive');
          if (scene) scene.scrollTop = 0;
          if (typeof window !== 'undefined' && window.scrollTo) {
            var target = 0;
            if (active) {
              var anchor = window.innerWidth <= 760 ? reading : body;
              target = window.scrollY + anchor.getBoundingClientRect().top - 92;
            }
            window.scrollTo({ top: Math.max(0,target),
              behavior: ArkUI.prefersReducedMotion && ArkUI.prefersReducedMotion() ? 'instant' : 'smooth' });
          }
        }
        if (typeof CustomEvent !== 'undefined' && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('article:choice', { detail: { index: index, total: panels.length } }));
        }
      }
      function change(index, scroll, writeHistory) {
        var revision = ++choiceRevision;
        if (choiceAnimation) choiceAnimation.cancel();
        if (Number(el.dataset.articleChoice) === index) return;
        if (typeof body.animate !== 'function' ||
            (ArkUI.prefersReducedMotion && ArkUI.prefersReducedMotion()) ||
            (ArkUI.sceneState && ArkUI.sceneState.get().paused)) {
          select(index,scroll,writeHistory);
          return;
        }
        choiceAnimation = body.animate([
          { opacity: 1, transform: 'translateY(0)' },
          { opacity: 0, transform: 'translateY(-5px)' }
        ], { duration: 130, easing: 'ease-in', fill: 'both' });
        choiceAnimation.finished.then(function () {
          if (revision !== choiceRevision) return;
          choiceAnimation.cancel();
          select(index,scroll,writeHistory);
          choiceAnimation = body.animate([
            { opacity: 0, transform: 'translateY(7px)' },
            { opacity: 1, transform: 'translateY(0)' }
          ], { duration: 220, easing: 'cubic-bezier(.2,.65,.2,1)', fill: 'both' });
          choiceAnimation.finished.then(function () {
            if (revision === choiceRevision) { choiceAnimation.cancel(); choiceAnimation = null; }
          }).catch(function () {});
        }).catch(function () {});
      }
      choices.forEach(function (choice, i) {
        choice.addEventListener('click', function () { change(i,true,true); });
        choice.addEventListener('mouseenter', function () { setSectionLabel(i); });
        choice.addEventListener('focus', function () { setSectionLabel(i); });
        choice.addEventListener('mouseleave', function () { setSectionLabel(); });
        choice.addEventListener('blur', function () { setSectionLabel(); });
      });
      coreChoice.addEventListener('click', function () { change(-1,true,true); });
      coreChoice.addEventListener('mouseenter', function () { setSectionLabel(-1); });
      coreChoice.addEventListener('focus', function () { setSectionLabel(-1); });
      coreChoice.addEventListener('mouseleave', function () { setSectionLabel(); });
      coreChoice.addEventListener('blur', function () { setSectionLabel(); });
      coreReturn.addEventListener('click', function () { change(-1,true,true); });
      previous.addEventListener('click', function () { change(Number(el.dataset.articleChoice) - 1,true,true); });
      forward.addEventListener('click', function () { change(Number(el.dataset.articleChoice) + 1,true,true); });
      el.addEventListener('keydown', function (event) {
        if (event.altKey || event.ctrlKey || event.metaKey ||
            !['ArrowLeft','ArrowRight'].includes(event.key) ||
            (event.target.closest && event.target.closest('input,textarea,select,[contenteditable="true"],.article-table'))) return;
        var current = Number(el.dataset.articleChoice);
        var nextIndex = current + (event.key === 'ArrowRight' ? 1 : -1);
        if (nextIndex < -1 || nextIndex >= panels.length) return;
        event.preventDefault();
        change(nextIndex,true,true);
      });
      el.selectArticleQuestionFromRoute = function () {
        var index = questionFromHash(article.slug,panels.length);
        if (Number(el.dataset.articleChoice) !== index) change(index,true,false);
      };
      select(questionFromHash(article.slug,panels.length),false,false);
    }
  });
})();

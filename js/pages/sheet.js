/* One page of headed points: the theory's detail pages and About are the same sheet with different words.
   The words come from the page's manifest; the sheet has as many points as the manifest has POINT<n> fields. */
ArkUI.sheet = function (id, page) {
  var manifest = ArkManifest.get(id);
  var area = id.toUpperCase();
  function words(role) { return ArkCopy.text(area + '.' + role); }
  function link(role, target, className) {
    var a = ArkUI.el('a', className || 'article-back');
    a.href = '#' + ArkUI.pageCatalog[target].path; a.dataset.sceneLink = target;
    a.appendChild(document.createTextNode(words(role) + ' '));
    var arrow = ArkUI.el('span', 'cta-arrow', '↗'); arrow.setAttribute('aria-hidden', 'true');
    a.appendChild(arrow); return a;
  }
  var el = ArkUI.el('section', 'ark-page learning-page theory-page ' + id + '-page');
  el.dataset.arkPage = page; el.setAttribute('aria-labelledby', id + '-title');
  var content = ArkUI.el('div', 'concept-content');
  if (manifest.group === 'theory' || manifest.fields['STATUS.TEXT']) {
    var path = ArkUI.el('nav', 'content-layer-path');
    path.setAttribute('aria-label', 'Content depth');
    var parent = ArkUI.el('a', '', '01 / Operating model');
    parent.href = '#/concept'; parent.dataset.sceneLink = 'concept'; path.appendChild(parent);
    var current = ArkUI.el('span', '', '02 / ' + manifest.title);
    current.setAttribute('aria-current', 'page'); path.appendChild(current);
    content.appendChild(path);
  }
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
  if (manifest.group === 'theory' || manifest.fields['STATUS.TEXT']) {
    var contextLayer = ArkUI.el('details', 'content-layer content-layer-context');
    contextLayer.appendChild(ArkUI.el('summary', '', 'Context / inspect how it works'));
    contextLayer.appendChild(list); content.appendChild(contextLayer);
  } else content.appendChild(list);
  if (manifest.fields['STATUS.TEXT']) {
    var status = ArkUI.el('aside', 'mechanism-status-summary');
    status.setAttribute('aria-label', 'Current status');
    status.appendChild(ArkUI.el('h2', '', words('STATUS.TITLE')));
    status.appendChild(ArkUI.el('p', '', words('STATUS.TEXT')));
    content.appendChild(status);
  }
  if (manifest.fields['LIMIT.TEXT'] || (manifest.meta.docs && manifest.fields.EVIDENCE)) {
    var referenceLayer = ArkUI.el('details', 'content-layer content-layer-reference');
    referenceLayer.appendChild(ArkUI.el('summary', '', 'Reference / limits and evidence'));
    if (manifest.fields['LIMIT.TEXT']) {
      var limit = ArkUI.el('section', 'mechanism-limit');
      limit.appendChild(ArkUI.el('h2', '', words('LIMIT.TITLE')));
      limit.appendChild(ArkUI.el('p', '', words('LIMIT.TEXT')));
      referenceLayer.appendChild(limit);
    }
    if (manifest.meta.docs && manifest.fields.EVIDENCE) {
      var docs = ArkUI.el('a', 'article-back theory-evidence-link');
      docs.href = manifest.meta.docs;
      docs.appendChild(document.createTextNode(words('EVIDENCE') + ' '));
      var docsArrow = ArkUI.el('span', 'cta-arrow', '↗'); docsArrow.setAttribute('aria-hidden', 'true');
      docs.appendChild(docsArrow); referenceLayer.appendChild(docs);
    }
    content.appendChild(referenceLayer);
  }
  var footer = ArkUI.el('nav', 'theory-footer'); footer.setAttribute('aria-label', 'Continue');
  if (manifest.meta.next) footer.appendChild(link('NEXT', manifest.meta.next, 'article-back theory-cta'));
  if (manifest.meta.back) footer.appendChild(link('BACK', manifest.meta.back));
  content.appendChild(footer);
  el.appendChild(content);
  if (manifest.fields['STATUS.TEXT']) ArkUI.mountMechanismLayers(el, content, manifest, list, title);
  return el;
};

/* One active reading surface. The page owns its inner state and restores it on return. */
ArkUI.mechanismMemory = ArkUI.mechanismMemory || Object.create(null);
ArkUI.mountMechanismLayers = function (el, content, manifest, list, title) {
  var memory = ArkUI.mechanismMemory[manifest.id] || { layer: 'focus', step: 0 };
  ArkUI.mechanismMemory[manifest.id] = memory;
  var context = content.querySelector('.content-layer-context');
  var reference = content.querySelector('.content-layer-reference');
  if (!context || !reference) return;
  el.classList.add('mechanism-explorer');
  var focusItems = Array.from(content.children).filter(function (child) {
    return child !== context && child !== reference && !child.classList.contains('content-layer-path') && !child.classList.contains('theory-footer') && !child.classList.contains('mechanism-status-summary');
  });
  function panelFrom(details, label) {
    var panel = ArkUI.el('section', 'mechanism-inner');
    panel.id = manifest.id + '-' + label;
    Array.from(details.children).forEach(function (child) { if (child.tagName !== 'SUMMARY') panel.appendChild(child); });
    content.insertBefore(panel, details); details.remove();
    return panel;
  }
  context = panelFrom(context, 'context'); reference = panelFrom(reference, 'reference');
  var controls = ArkUI.el('nav', 'mechanism-depth');
  controls.setAttribute('aria-label', 'Explore ' + manifest.title);
  var buttons = {};
  [['focus', '01', 'The core idea'], ['context', '02', 'How it works'], ['reference', '03', 'Evidence & limits']].forEach(function (item) {
    var button = ArkUI.el('button', 'mechanism-depth-button'); button.type = 'button';
    button.appendChild(ArkUI.el('span', 'mechanism-depth-number', item[1]));
    button.appendChild(ArkUI.el('span', '', item[2]));
    button.setAttribute('aria-controls', item[0] === 'focus' ? title.id : manifest.id + '-' + item[0]);
    button.addEventListener('click', function () { select(item[0], true); });
    buttons[item[0]] = button; controls.appendChild(button);
  });
  content.insertBefore(controls, context);
  var innerTitle = ArkUI.el('h1', 'mechanism-inner-title', manifest.title);
  innerTitle.tabIndex = -1; content.insertBefore(innerTitle, controls);
  var rows = Array.from(list.children);
  var steps = ArkUI.el('nav', 'mechanism-steps'); steps.setAttribute('aria-label', manifest.title + ' details');
  var stepButtons = [];
  rows.forEach(function (row, index) {
    var heading = row.querySelector('h2');
    var button = ArkUI.el('button', 'mechanism-step', ('0' + (index + 1)).slice(-2) + ' / ' + heading.textContent.replace(/^\d+\.\s*/, ''));
    button.type = 'button'; row.id = manifest.id + '-step-' + index;
    button.setAttribute('aria-controls', row.id);
    button.addEventListener('click', function () { selectStep(index); });
    steps.appendChild(button); stepButtons.push(button);
  });
  context.insertBefore(steps, list);
  var progress = ArkUI.el('p', 'mechanism-progress'); progress.setAttribute('aria-live', 'polite'); context.appendChild(progress);
  var next = ArkUI.el('button', 'mechanism-next', 'Next detail ↗'); next.type = 'button';
  next.addEventListener('click', function () { if (memory.step < rows.length - 1) selectStep(memory.step + 1); else select('reference', true); });
  context.appendChild(next);
  function animate(panel, direction) {
    if (!panel.animate || ArkUI.prefersReducedMotion() || (ArkUI.sceneState && ArkUI.sceneState.get().paused)) return;
    panel.getAnimations().forEach(function (animation) { animation.cancel(); });
    panel.animate([{ opacity: 0, transform: 'translateY(' + direction * 12 + 'px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 320, easing: 'cubic-bezier(.2,.75,.2,1)' });
  }
  function selectStep(index) {
    memory.step = index;
    rows.forEach(function (row, i) { row.hidden = i !== index; row.inert = i !== index; stepButtons[i].setAttribute('aria-pressed', String(i === index)); });
    progress.textContent = ('0' + (index + 1)).slice(-2) + ' / ' + ('0' + rows.length).slice(-2);
    next.textContent = index === rows.length - 1 ? 'Inspect evidence ↗' : 'Next detail ↗';
    animate(rows[index], 1);
  }
  function select(layer, moveFocus) {
    var previous = memory.layer; memory.layer = layer; el.dataset.readingLayer = layer;
    focusItems.forEach(function (item) { item.hidden = layer !== 'focus'; });
    context.hidden = layer !== 'context'; context.inert = context.hidden;
    reference.hidden = layer !== 'reference'; reference.inert = reference.hidden;
    innerTitle.hidden = layer === 'focus';
    innerTitle.textContent = manifest.title + (layer === 'context' ? ' / How it works' : ' / Evidence & limits');
    Object.keys(buttons).forEach(function (key) { buttons[key].setAttribute('aria-pressed', String(key === layer)); });
    if (moveFocus) {
      var target = layer === 'focus' ? title : innerTitle; target.tabIndex = -1; target.focus({ preventScroll: true });
      animate(layer === 'focus' ? title : layer === 'context' ? context : reference, previous === 'reference' ? -1 : 1);
    }
  }
  el.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && memory.layer !== 'focus') { event.preventDefault(); event.stopPropagation(); select('focus', true); }
  });
  selectStep(Math.min(memory.step, rows.length - 1)); select(memory.layer, false);
};

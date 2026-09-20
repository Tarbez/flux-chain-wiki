/* The module is lazy-loaded once; values persist when the page is remounted. */
ArkUI.studioValues = ArkUI.studioValues || { mode: 'spacing', spacing: 50, rhythm: 50, depth: 50 };
ArkUI.mountStudio = function (root) {
  'use strict';
  function findById(id) { return root.querySelector('#' + id); }
  var studies = {
    spacing: { title: 'When does a collection become a group?', description: 'Bring things closer and they begin to belong together. Move them apart and new boundaries appear.', label: 'Distance between groups', start: 'Together', end: 'Apart', note: 'THE SAME ELEMENTS. A DIFFERENT RELATIONSHIP.', code: 'SZ—001' },
    rhythm: { title: 'What gives a pattern its rhythm?', description: 'A repeated beat feels steady. Introduce variation and the same elements begin to suggest movement.', label: 'Variation in height', start: 'Uniform', end: 'Expressive', note: 'REPETITION SETS THE RULE. VARIATION GIVES IT CHARACTER.', code: 'SZ—002' },
    depth: { title: 'How little does it take to suggest depth?', description: 'These are flat squares. A small shift in position makes them read as layers, with a space between them.', label: 'Separation of layers', start: 'Flat', end: 'Dimensional', note: 'A FLAT SURFACE. A SENSE OF SPACE.', code: 'SZ—003' }
  };
  var mode = ArkUI.studioValues.mode; var values = ArkUI.studioValues;
  var specimen = root.querySelector('.specimen');
  var range = findById('variable');
  var stage = root.querySelector('.experiment-stage');
  function update() {
    var value = Number(range.value); values[mode] = value;
    findById('variable-value').textContent = value + '%';
    range.setAttribute('aria-valuetext', value + ' percent, ' + studies[mode].label.toLowerCase());
    specimen.style.setProperty('--distance', (4 + value * .7) + 'px');
    specimen.style.setProperty('--depth', value);
    if (mode === 'rhythm') Array.from(specimen.children).forEach(function (bar, index) {
      bar.style.setProperty('--amplitude', String(35 + Math.sin(index * .65) * value * .55 + value * .4));
      bar.style.setProperty('--opacity', String(1 - (value / 100) * (.55 - (Math.sin(index * .65) + 1) * .275)));
    });
    var descriptions = { spacing: 'Twelve dots arranged in three groups of four. Distance between groups: ', rhythm: 'Sixteen vertical bars forming a wave. Variation in height: ', depth: 'Four overlapping square outlines. Separation of layers: ' };
    stage.setAttribute('aria-label', descriptions[mode] + value + ' percent.');
  }
  function selectStudy(next) {
    mode = next; values.mode = next; var study = studies[mode];
    root.querySelector('.lab').dataset.mode = mode;
    root.querySelectorAll('[data-study]').forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.study === mode)); });
    findById('study-title').textContent = study.title;
    findById('study-description').textContent = study.description;
    root.querySelector('label[for="variable"]').textContent = study.label;
    findById('range-start').textContent = study.start;
    findById('range-end').textContent = study.end;
    root.querySelector('.stage-footnote').textContent = study.note;
    root.querySelector('.stage-corner').textContent = study.code;
    specimen.replaceChildren(); range.value = values[mode];
    var count = mode === 'spacing' ? 3 : mode === 'rhythm' ? 16 : 4;
    for (var j = 0; j < count; j++) {
      var item = document.createElement('span');
      item.className = mode === 'spacing' ? 'dot-group' : mode === 'rhythm' ? 'rhythm-bar' : 'depth-plane';
      if (mode === 'spacing') for (var k = 0; k < 4; k++) item.appendChild(document.createElement('i'));
      if (mode === 'depth') item.style.setProperty('--layer', j - 1.5);
      specimen.appendChild(item);
    }
    update();
  }
  root.querySelectorAll('[data-study]').forEach(function (button) { button.addEventListener('click', function () { selectStudy(button.dataset.study); }); });
  range.addEventListener('input', update);
  selectStudy(mode);
  root.querySelectorAll('[data-study], #variable').forEach(function (control) { control.disabled = false; });
  document.documentElement.classList.add('is-ready');
};

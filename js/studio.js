(function () {
  'use strict';
  // Extend the original ENTER event into the lab without changing the scene.
  document.addEventListener('ark:enter', function () {
    var work = document.getElementById('work');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    work.focus({ preventScroll: true });
    work.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  });
  var studies = {
    spacing: { title: 'When does a collection become a group?', description: 'Bring things closer and they begin to belong together. Move them apart and new boundaries appear.', label: 'Distance between groups', start: 'Together', end: 'Apart', note: 'THE SAME ELEMENTS. A DIFFERENT RELATIONSHIP.', code: 'SZ—001' },
    rhythm: { title: 'What gives a pattern its rhythm?', description: 'A repeated beat feels steady. Introduce variation and the same elements begin to suggest movement.', label: 'Variation in height', start: 'Uniform', end: 'Expressive', note: 'REPETITION SETS THE RULE. VARIATION GIVES IT CHARACTER.', code: 'SZ—002' },
    depth: { title: 'How little does it take to suggest depth?', description: 'These are flat squares. A small shift in position makes them read as layers, with a space between them.', label: 'Separation of layers', start: 'Flat', end: 'Dimensional', note: 'A FLAT SURFACE. A SENSE OF SPACE.', code: 'SZ—003' }
  };
  var mode = 'spacing'; var values = { spacing: 50, rhythm: 50, depth: 50 };
  var specimen = document.querySelector('.specimen');
  var range = document.getElementById('variable');
  var stage = document.querySelector('.experiment-stage');
  function update() {
    var value = Number(range.value); values[mode] = value;
    document.getElementById('variable-value').textContent = value + '%';
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
    mode = next; var study = studies[mode];
    document.querySelector('.lab').dataset.mode = mode;
    document.querySelectorAll('[data-study]').forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.study === mode)); });
    document.getElementById('study-title').textContent = study.title;
    document.getElementById('study-description').textContent = study.description;
    document.querySelector('label[for="variable"]').textContent = study.label;
    document.getElementById('range-start').textContent = study.start;
    document.getElementById('range-end').textContent = study.end;
    document.querySelector('.stage-footnote').textContent = study.note;
    document.querySelector('.stage-corner').textContent = study.code;
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
  document.querySelectorAll('[data-study]').forEach(function (button) { button.addEventListener('click', function () { selectStudy(button.dataset.study); }); });
  range.addEventListener('input', update);
  selectStudy(mode);
  document.querySelectorAll('[data-study], #variable').forEach(function (control) { control.disabled = false; });
  document.documentElement.classList.add('is-ready');
})();

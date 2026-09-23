/* The module is lazy-loaded once; values persist when the page is remounted. */
ArkUI.studioValues = ArkUI.studioValues || { mode: 'spacing', spacing: 50, rhythm: 50, depth: 50 };
ArkUI.mountStudio = function (root) {
  'use strict';
  function findById(id) { return root.querySelector('#' + id); }
  var studies = {
    spacing: { title: 'When do separate copies start to read as one?', description: 'Bring independent groups of points closer and they begin to read as a single shape. Move them apart and each looks like its own story — the same idea behind a quorum: several copies of a ledger, agreeing rather than any one dictating the rest.', label: 'How closely the copies agree', start: 'Diverging', end: 'Agreeing', note: 'SEVERAL COPIES. ONE LEDGER, ONCE THEY AGREE.', code: 'FX—001' },
    rhythm: { title: 'What makes a reference feel dense?', description: 'A short, repeated pattern is compact — the same reference standing in for something bigger each time. Break the pattern and the same content has to be spelled out again, every time.', label: 'How much gets spelled out', start: 'Referenced', end: 'Spelled out', note: 'A REFERENCE REPEATS THE PATTERN. SPELLING IT OUT BREAKS IT.', code: 'FX—002' },
    depth: { title: 'How much can storage change before identity does?', description: 'These are the same squares. Shift how they’re layered and the arrangement looks completely different — but nothing about what they are has changed.', label: 'How differently it’s stored', start: 'One shape', end: 'Rearranged', note: 'STORAGE CAN CHANGE SHAPE. THE HASH DOESN’T.', code: 'FX—003' }
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
    var descriptions = { spacing: 'Twelve dots arranged in three independent groups. How closely the copies agree: ', rhythm: 'Sixteen vertical bars forming a wave. How much gets spelled out: ', depth: 'Four overlapping square outlines. How differently it’s stored: ' };
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

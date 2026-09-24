/* The module is lazy-loaded once; values persist when the page is remounted. */
ArkUI.studioValues = ArkUI.studioValues || { mode: 'spacing', spacing: 50, rhythm: 50, depth: 50 };
ArkUI.mountStudio = function (root) {
  'use strict';
  function findById(id) { return root.querySelector('#' + id); }
  var studies = {
    spacing: { title: 'When does a cell stop needing a committee?', description: 'An ephemeral authority cell is derived for one object, verifies one transition, and dissolves. Bring the independent copies into agreement and the cell closes; keep them apart and it stays open, waiting for threshold evidence — never for one voice to just decide.', label: 'How close the copies are to threshold agreement', start: 'Diverging', end: 'At threshold', note: 'A CELL FORMS, CERTIFIES ONE TRANSITION, AND DISSOLVES.', code: 'FX—001' },
    rhythm: { title: 'What does one agreement look like, closing?', description: 'INTENT, OFFER, AGREEMENT, FULFILLMENT, RECEIPT — five stages, each a signed manifest pointing at the one before it by CID. Scrub through and watch one agreement close, independent of every other agreement happening on the substrate at the same time.', label: 'How far through the lifecycle', start: 'INTENT', end: 'RECEIPT', note: 'FIVE STAGES. NO GLOBAL ORDER BETWEEN UNRELATED AGREEMENTS.', code: 'FX—002' },
    depth: { title: 'How do networks share one substrate?', description: 'These are the same four networks. Shift how isolated they are and the arrangement looks completely different — but Flux Protocol underneath them hasn’t changed. Today that isolation partitions presence only; it is not yet a full security boundary.', label: 'How isolated the networks are', start: 'Shared', end: 'Isolated', note: 'ONE SUBSTRATE. NETWORK ISOLATION IS PARTIAL, NOT A GUARANTEE.', code: 'FX—003' }
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
    var descriptions = { spacing: 'Twelve dots arranged in three independent groups, standing in for an authority cell’s copies. How close to threshold agreement: ', rhythm: 'Sixteen vertical bars forming a wave, standing in for the five-stage agreement lifecycle. How far through the lifecycle: ', depth: 'Four overlapping square outlines, standing in for networks sharing one substrate. How isolated the networks are: ' };
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

/* The module is lazy-loaded once; values persist when the page is remounted. */
ArkUI.studioValues = ArkUI.studioValues || { mode: 'spacing', spacing: 50, rhythm: 50, depth: 50 };
ArkUI.mountStudio = function (root) {
  'use strict';
  function findById(id) { return root.querySelector('#' + id); }
  var studies = {
    spacing: { title: 'How can threshold agreement be pictured?', description: 'This model moves independent groups closer together as a visual analogy for threshold evidence. It does not calculate a real roster, vote, certificate, or transition.', label: 'Visual convergence', start: 'Apart', end: 'Together', note: 'A VISUAL ANALOGY FOR DERIVED, TEMPORARY AUTHORITY.', code: 'FX—001' },
    rhythm: { title: 'How can one agreement lifecycle be pictured?', description: 'This model moves through intent, offer, agreement, fulfillment, and receipt as an explanatory sequence. It does not load signed manifests, verify CID links, or observe a live agreement.', label: 'Position in the illustrated lifecycle', start: 'INTENT', end: 'RECEIPT', note: 'AN ILLUSTRATION OF FIVE LINKED STAGES, NOT A LIVE TRACE.', code: 'FX—002' },
    depth: { title: 'How can network boundaries be pictured?', description: 'This model separates four shapes to illustrate named-network scope on one substrate. Current isolation partitions miner presence; the control does not test or imply a security boundary.', label: 'Visual separation', start: 'Shared', end: 'Separated', note: 'PRESENCE SCOPE IS PARTIAL, NOT A SECURITY GUARANTEE.', code: 'FX—003' }
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
    var descriptions = { spacing: 'Illustrative dots in three independent groups. Visual convergence: ', rhythm: 'Illustrative bars representing positions in a five-stage agreement lifecycle: ', depth: 'Illustrative square outlines representing named-network presence scope. Visual separation: ' };
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

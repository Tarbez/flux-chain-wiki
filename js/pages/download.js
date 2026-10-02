ArkUI.pageModules.download = {
  mount: function (host) {
    var el = ArkUI.sheet('download', 'download');
    var footer = el.querySelector('.theory-footer');
    if (footer) {
      var guide = ArkUI.el('a', 'article-back');
      guide.href = 'docs/operators/run-from-source.md';
      guide.textContent = ArkCopy.text('DOWNLOAD.GUIDE') + ' ↗';
      footer.insertBefore(guide, footer.firstChild);
    }
    var list = el.querySelector('.concept-principles');
    if (list && list.children.length > 1) {
      var steps = Array.from(list.children), active = 0, review = false;
      var picker = ArkUI.el('nav', 'source-step-picker');
      picker.setAttribute('aria-label', 'Local setup steps');
      var choices = steps.map(function (step, index) {
        step.id = 'source-step-' + (index + 1);
        var heading = step.querySelector('h2');
        var button = ArkUI.el('button', 'source-step-choice', ('0' + (index + 1)).slice(-2) + ' / ' + (heading ? heading.textContent.replace(/^\d+\.\s*/, '') : 'Step'));
        button.type = 'button'; button.dataset.stepNumber = ('0' + (index + 1)).slice(-2);
        button.setAttribute('aria-label', button.textContent); button.setAttribute('aria-controls', step.id);
        button.addEventListener('click', function () { review = false; select(index, true); });
        picker.appendChild(button); return button;
      });
      var progress = ArkUI.el('p', 'source-step-progress');
      progress.setAttribute('role', 'status');
      var controls = ArkUI.el('div', 'source-step-controls');
      var previous = ArkUI.el('button', '', 'Previous step'); previous.type = 'button';
      var next = ArkUI.el('button', 'mechanism-next', 'Next step ↗'); next.type = 'button';
      var all = ArkUI.el('button', '', 'Review all steps'); all.type = 'button';
      function select(index, focus) {
        active = Math.max(0, Math.min(steps.length - 1, index));
        steps.forEach(function (step, i) {
          step.hidden = !review && i !== active; step.inert = step.hidden;
          choices[i].setAttribute('aria-pressed', String(!review && i === active));
        });
        previous.hidden = review || active === 0;
        next.hidden = review || active === steps.length - 1;
        all.textContent = review ? 'Return to one step' : 'Review all steps';
        all.setAttribute('aria-pressed', String(review));
        progress.textContent = review ? 'All ' + steps.length + ' steps / review' : 'Step ' + (active + 1) + ' of ' + steps.length;
        if (focus) { var heading = steps[active].querySelector('h2'); if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); } }
      }
      previous.addEventListener('click', function () { select(active - 1, true); });
      next.addEventListener('click', function () { select(active + 1, true); });
      all.addEventListener('click', function () { review = !review; select(active, !review); });
      controls.appendChild(previous); controls.appendChild(next); controls.appendChild(all);
      list.parentNode.insertBefore(picker, list);
      list.parentNode.insertBefore(progress, list.nextSibling);
      list.parentNode.insertBefore(controls, progress.nextSibling);
      select(0, false);
    }
    if (!window.ArkMeshSettings || ArkMeshSettings.shapeVisible('download')) {
      var figure = document.createElement('figure');
      figure.className = 'page-iceberg';
      figure.setAttribute('data-iceberg-anchor', '');
      figure.setAttribute('role', 'img');
      figure.setAttribute('aria-label', 'Decorative particle form');
      el.appendChild(figure);
    }
    host.appendChild(el); return el;
  }
};

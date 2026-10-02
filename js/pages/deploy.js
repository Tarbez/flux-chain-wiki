/* A custom page module: sheet.js has no concept of a command block, and this
   page's whole point is real, copyable commands, not eyebrow/points prose. */
ArkUI.pageModules.deploy = {
  mount: function (host) {
    var id = 'deploy';
    function words(role) { return ArkCopy.text('DEPLOY.' + role); }
    var el = ArkUI.el('section', 'ark-page learning-page theory-page deploy-page');
    el.dataset.arkPage = id;
    el.setAttribute('aria-labelledby', 'deploy-title');

    var content = ArkUI.el('div', 'concept-content deploy-content');
    content.appendChild(ArkUI.el('p', 'learning-eyebrow', words('EYEBROW')));
    var title = ArkUI.el('h1', 'learning-heading', words('TITLE'));
    title.id = 'deploy-title';
    content.appendChild(title);
    content.appendChild(ArkUI.el('p', 'concept-deck', words('DECK')));

    var STEPS = [
      {
        n: '01',
        title: 'Check discovery',
        body: 'Confirm the network CLI can reach its configured peers. This directory is best-effort discovery, not authoritative membership.',
        cmd: 'flux-network network list',
        expected: 'Expected: a "Known networks" list followed by the best-effort discovery warning.'
      },
      {
        n: '02',
        title: 'Create or select',
        body: 'Pass a name as a positional argument. If that ID already exists, the CLI selects the existing network instead of creating another one.',
        cmd: 'flux-network network create "my-network"',
        expected: 'Expected: either Network "<network-id>" created, or a message that the network already exists.'
      },
      {
        n: '03',
        title: 'Start the miner',
        body: 'Use the returned network ID when starting the daemon. FLUX_MINER_NETWORK is the preferred name; ARK_MINER_NETWORK remains a legacy alias.',
        cmd: 'FLUX_MINER_NETWORK=<network-id> flux-miner start',
        expected: 'Expected: the process remains running and exposes its configured status listener.'
      },
      {
        n: '04',
        title: 'Verify health',
        body: 'Query the local miner through the network CLI. Change the URL if the status listener uses a different host or port.',
        cmd: 'flux-network health --miner http://127.0.0.1:8766',
        expected: 'Expected: a JSON health response from the running miner.'
      },
      {
        n: '05',
        title: 'Inspect topology',
        body: 'Inspect the selected network while preserving the current boundary: topology and presence do not establish trusted membership or data isolation.',
        cmd: 'flux-network topology --miner http://127.0.0.1:8766 --network-id <network-id>',
        expected: 'Expected: topology JSON for the requested network ID.'
      }
    ];

    var progress = ArkUI.el('nav', 'deploy-progress');
    progress.setAttribute('aria-label', 'Setup steps');
    var list = ArkUI.el('div', 'deploy-steps');
    var rows = [], choices = [], activeStep = 0, showAll = false;
    STEPS.forEach(function (step) {
      var row = ArkUI.el('section', 'deploy-step');
      row.id = 'deploy-step-' + step.n;
      var choice = ArkUI.el('button', 'deploy-step-choice', step.n + ' / ' + step.title);
      choice.type = 'button'; choice.setAttribute('aria-controls', row.id);
      choice.addEventListener('click', function () { showAll = false; selectStep(rows.indexOf(row), true); });
      choices.push(choice); progress.appendChild(choice);
      row.appendChild(ArkUI.el('span', 'deploy-step-num', step.n));
      var body = ArkUI.el('div', 'deploy-step-body');
      body.appendChild(ArkUI.el('h2', '', step.title));
      body.appendChild(ArkUI.el('p', '', step.body));
      var pre = ArkUI.el('pre', 'deploy-command');
      pre.appendChild(ArkUI.el('code', '', step.cmd));
      var copy = ArkUI.el('button', 'deploy-copy', 'Copy');
      copy.type = 'button';
      copy.setAttribute('aria-label', 'Copy command for ' + step.title);
      var feedback = ArkUI.el('span', 'deploy-copy-feedback');
      feedback.setAttribute('role', 'status');
      copy.addEventListener('click', function () {
        var done = function () {
          copy.textContent = 'Copied';
          feedback.textContent = 'Command copied.';
          window.setTimeout(function () { copy.textContent = 'Copy'; }, 1400);
        };
        var failed = function () { feedback.textContent = 'Copy unavailable. Select and copy the command text below.'; };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(step.cmd).then(done, failed);
        else {
          var field = document.createElement('textarea');
          field.value = step.cmd; field.setAttribute('readonly', '');
          field.style.position = 'fixed'; field.style.opacity = '0';
          document.body.appendChild(field); field.select();
          try { if (document.execCommand('copy')) done(); else failed(); } catch (error) { failed(); }
          field.remove();
        }
      });
      pre.appendChild(copy);
      body.appendChild(pre);
      body.appendChild(feedback);
      body.appendChild(ArkUI.el('p', 'deploy-expected', step.expected));
      row.appendChild(body);
      list.appendChild(row);
      rows.push(row);
    });
    content.appendChild(progress);
    content.appendChild(list);
    var controls = ArkUI.el('div', 'deploy-workflow-controls');
    var previous = ArkUI.el('button', 'deploy-workflow-back', 'Previous step'); previous.type = 'button';
    var next = ArkUI.el('button', 'mechanism-next', 'Next step ↗'); next.type = 'button';
    var all = ArkUI.el('button', 'deploy-workflow-all', 'Review all steps'); all.type = 'button';
    var position = ArkUI.el('p', 'deploy-position'); position.setAttribute('role', 'status');
    function selectStep(index, focus) {
      activeStep = Math.max(0, Math.min(rows.length - 1, index));
      rows.forEach(function (row, i) {
        row.hidden = !showAll && i !== activeStep; row.inert = row.hidden;
        choices[i].setAttribute('aria-pressed', String(!showAll && i === activeStep));
      });
      previous.hidden = showAll || activeStep === 0;
      next.hidden = showAll || activeStep === rows.length - 1;
      all.textContent = showAll ? 'Return to one step' : 'Review all steps';
      all.setAttribute('aria-pressed', String(showAll));
      position.textContent = showAll ? 'All 5 steps / review only' : 'Step ' + (activeStep + 1) + ' of 5 / ' + STEPS[activeStep].title;
      if (focus) {
        var heading = rows[activeStep].querySelector('h2');
        heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true });
      }
    }
    previous.addEventListener('click', function () { selectStep(activeStep - 1, true); });
    next.addEventListener('click', function () { selectStep(activeStep + 1, true); });
    all.addEventListener('click', function () {
      showAll = !showAll; selectStep(activeStep, !showAll);
      if (!showAll && rows[activeStep].scrollIntoView) rows[activeStep].scrollIntoView({ block: 'start' });
    });
    controls.appendChild(previous); controls.appendChild(next); controls.appendChild(all);
    content.appendChild(position); content.appendChild(controls);
    selectStep(0, false);

    var note = ArkUI.el('p', 'deploy-caveat', 'network create / network list are not a security boundary today. Presence is partitioned per network; accounts, identities, and DAOs are not yet network-scoped.');
    content.appendChild(note);

    var footer = ArkUI.el('nav', 'theory-footer');
    footer.setAttribute('aria-label', 'Continue');
    var back = ArkUI.el('a', 'article-back');
    back.href = '#' + ArkUI.pageCatalog.download.path; back.dataset.sceneLink = 'download';
    back.appendChild(document.createTextNode(words('BACK') + ' '));
    var arrow = ArkUI.el('span', 'cta-arrow', '↗');
    arrow.setAttribute('aria-hidden', 'true');
    back.appendChild(arrow);
    footer.appendChild(back);
    content.appendChild(footer);

    el.appendChild(content);
    host.appendChild(el);
    return el;
  }
};

/* Run DEFXN from source, in the How it works chapter layout: a terminal card for the chosen step
   beside the five steps, one screen, no scroll. Steps swap in place; the card follows the step. */
ArkUI.pageModules.download = {
  mount: function (host) {
    function words(key) { return ArkCopy.text('DOWNLOAD.' + key); }
    function link(label, target, cls) { var a = ArkUI.el('a', cls || '', label); a.href = ArkUI.route.href(ArkUI.pageCatalog[target].path); a.dataset.sceneLink = target; return a; }
    /* What each step looks like at the terminal. Commands and defaults come from docs/operators. */
    var terminal = [
      { lines: ['node --version', 'npm --version'], expect: 'v22 or newer, with npm on the path' },
      { lines: ['cd /path/to/ark-miner-cli', 'npm install', 'cp .env.example .env', 'npm start'], expect: 'Review .env before npm start' },
      { checks: [['Process', 'Stays running'], ['Status', '127.0.0.1:8766 (default)'], ['Record', 'Revision, version, config, time']] },
      { proves: ['Local startup'], not: ['Public-network membership', 'Deployed resolver capacity', 'Independent-host readiness', 'Production activation'] },
      { lines: ['flux-network network list', 'flux-network network create "my-network"', 'FLUX_MINER_NETWORK=<network-id> flux-miner start'], expect: 'Networks partition presence only' }
    ];
    var count = terminal.length, active = 0;

    var el = ArkUI.el('section', 'ark-page how-chapter download-page'); el.dataset.arkPage = 'download';
    var header = ArkUI.el('header', 'how-chapter-header');
    var kicker = ArkUI.el('div', 'download-kicker-row'); kicker.appendChild(ArkUI.el('p', 'download-kicker', words('EYEBROW')));
    /* Phones have no room in the footer, so the guide link moves up beside the kicker there. */
    var guideTop = ArkUI.el('a', 'download-guide-top', 'Operator guide ↗'); guideTop.href = 'docs/operators/run-from-source.md'; kicker.appendChild(guideTop);
    header.appendChild(kicker);
    var title = ArkUI.el('h1', '', words('TITLE')); title.id = 'download-title'; el.setAttribute('aria-labelledby', title.id);
    header.appendChild(title); header.appendChild(ArkUI.el('p', '', words('DECK'))); el.appendChild(header);

    /* Left: the terminal card for the current step. */
    var card = ArkUI.el('section', 'how-record-card how-request-brief download-terminal');
    card.setAttribute('aria-live', 'polite');
    var top = ArkUI.el('div', 'download-terminal-top');
    var label = ArkUI.el('span', 'how-chapter-label'); top.appendChild(label);
    var copy = ArkUI.el('button', 'download-copy', 'Copy'); copy.type = 'button'; top.appendChild(copy);
    card.appendChild(top);
    var cardTitle = ArkUI.el('h2'); card.appendChild(cardTitle);
    var screen = ArkUI.el('div', 'download-screen'); card.appendChild(screen);
    var expect = ArkUI.el('p', 'download-expect'); card.appendChild(expect);
    copy.addEventListener('click', function () {
      var text = (terminal[active].lines || []).join('\n'); if (!text) return;
      function done() { copy.textContent = 'Copied'; window.setTimeout(function () { copy.textContent = 'Copy'; }, 1400); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { copy.textContent = 'Select to copy'; });
    });
    function stepTitle(i) { return words('POINT' + (i + 1) + '.TITLE').replace(/^\d+\.\s*/, '').replace(/\.$/, ''); }
    function paint() {
      var t = terminal[active];
      label.textContent = (t.lines ? 'TERMINAL' : t.checks ? 'CHECK' : 'WHAT IT PROVES') + ' · STEP ' + String(active + 1).padStart(2, '0') + ' / ' + String(count).padStart(2, '0');
      cardTitle.textContent = stepTitle(active);
      screen.textContent = ''; copy.hidden = !t.lines; expect.hidden = !t.expect; expect.textContent = t.expect || '';
      if (t.lines) {
        var pre = ArkUI.el('pre', 'download-code'); copy.setAttribute('aria-label', 'Copy commands for ' + stepTitle(active));
        t.lines.forEach(function (line) { var row = ArkUI.el('code'); row.appendChild(ArkUI.el('span', 'download-prompt', '$ ')); row.appendChild(document.createTextNode(line)); pre.appendChild(row); });
        screen.appendChild(pre);
      } else if (t.checks) {
        var dl = ArkUI.el('dl', 'how-record-fields download-checks');
        t.checks.forEach(function (pair) { dl.appendChild(ArkUI.el('dt', '', pair[0])); dl.appendChild(ArkUI.el('dd', '', pair[1])); });
        screen.appendChild(dl);
      } else {
        var split = ArkUI.el('div', 'download-proves');
        [['PROVES', t.proves, 'yes'], ['DOES NOT PROVE', t.not, 'no']].forEach(function (group) {
          var col = ArkUI.el('div', 'download-proves-' + group[2]); col.appendChild(ArkUI.el('span', 'how-chapter-label', group[0]));
          var ul = ArkUI.el('ul'); group[1].forEach(function (item) { ul.appendChild(ArkUI.el('li', '', item)); }); col.appendChild(ul); split.appendChild(col);
        });
        screen.appendChild(split);
      }
    }

    /* Right: the five steps. The chosen one opens its text in place; the others stay one line. */
    var picker = ArkUI.el('ol', 'how-steps download-steps'); picker.setAttribute('aria-label', 'Local setup steps');
    var rows = [], choices = [];
    for (var i = 0; i < count; i++) (function (index) {
      var item = ArkUI.el('li', 'how-step'), b = ArkUI.el('button', 'how-step-button'); b.type = 'button';
      b.appendChild(ArkUI.el('span', 'how-step-number', String(index + 1).padStart(2, '0'))); b.appendChild(ArkUI.el('strong', '', stepTitle(index)));
      b.dataset.stepNumber = String(index + 1).padStart(2, '0');
      var text = ArkUI.el('p', 'how-step-text', words('POINT' + (index + 1) + '.TEXT')); text.id = 'source-step-' + (index + 1); b.setAttribute('aria-controls', text.id);
      b.addEventListener('click', function () { select(index, true); });
      item.appendChild(b); item.appendChild(text); picker.appendChild(item); choices.push(b); rows.push(text);
    })(i);
    var side = ArkUI.el('section', 'how-chapter-side'); side.appendChild(picker);
    var body = ArkUI.el('div', 'how-chapter-body'); body.appendChild(card); body.appendChild(side); el.appendChild(body);

    /* Footer: reference links on the left, step navigation on the right; the last step hands on to /deploy. */
    var footer = ArkUI.el('nav', 'how-chapter-footer download-footer'); footer.setAttribute('aria-label', 'Continue');
    var guide = ArkUI.el('a', 'how-deeper-link', words('GUIDE').charAt(0) + words('GUIDE').slice(1).toLowerCase() + ' ↗'); guide.href = 'docs/operators/run-from-source.md';
    footer.appendChild(guide);
    footer.appendChild(link('Deploy a site with the Bundle Deployer', 'bundledeployer', 'download-aside-link'));
    var progress = ArkUI.el('span', 'download-progress'); progress.setAttribute('role', 'status'); footer.appendChild(progress);
    var previous = ArkUI.el('button', 'download-previous', '← '); previous.type = 'button'; previous.setAttribute('aria-label', 'Previous step'); previous.appendChild(ArkUI.el('span', 'download-previous-word', 'Previous'));
    var next = ArkUI.el('button', 'how-chapter-next download-next', 'Next step →'); next.type = 'button';
    var onward = link(words('NEXT').charAt(0) + words('NEXT').slice(1).toLowerCase() + ' →', ArkManifest.get('download').meta.next, 'how-chapter-next download-onward');
    footer.appendChild(previous); footer.appendChild(next); footer.appendChild(onward);
    previous.addEventListener('click', function () { select(active - 1, true); });
    next.addEventListener('click', function () { select(active + 1, true); });
    el.appendChild(footer);

    function select(index, write) {
      active = Math.max(0, Math.min(count - 1, index));
      rows.forEach(function (row, j) {
        var on = j === active; row.hidden = !on; row.inert = !on;
        row.parentNode.dataset.active = String(on); choices[j].setAttribute('aria-pressed', String(on));
      });
      previous.hidden = active === 0; next.hidden = active === count - 1; onward.hidden = active !== count - 1;
      progress.textContent = 'Step ' + (active + 1) + ' of ' + count;
      paint();
      if (write && el.arkWriteState) el.arkWriteState({ step: active, review: false });
    }
    select(0, false);
    ArkUI.attachProcedureState(el, 'download', count, function (index) { select(index, false); });
    host.appendChild(el); return el;
  }
};

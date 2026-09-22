ArkUI.pageModules.zero = {
  mount: function (host) {
    var el = ArkUI.render([
      'F-HOME-RLAYER_V1', '-N-zero',
      '. F-STEP-RSTEP_V1', '  -L-HOME.STEP', '  -K-0.2', '  -P-49', '  .',
      '. F-BODY-RBODY_V1',
      '  -E-HOME.EYEBROW',
      '  -H-HOME.TITLE',
      '  -T-HOME.INTRO',
      '  -S-1.42', '  .', '.'
    ].join('\n'), host);
    el.classList.add('ark-page'); el.dataset.arkPage = 'zero';

    /* The headline accents its last word in cyan, as in the reference. */
    var title = el.querySelector('.ark-hero-title');
    var words = (title.textContent || '').trim().split(/\s+/);
    if (words.length > 1) {
      var accent = words.pop();
      title.textContent = '';
      title.appendChild(document.createTextNode(words.join(' ') + ' '));
      var em = document.createElement('em');
      em.textContent = accent;
      title.appendChild(em);
    }

    var actions = document.createElement('div');
    actions.className = 'home-hero-actions';

    var cta = document.createElement('a');
    cta.className = 'home-primary-cta';
    cta.href = '#/concept'; cta.dataset.sceneLink = 'concept';
    var label = document.createElement('span'); label.textContent = ArkCopy.text('HOME.CTA');
    cta.appendChild(label);
    actions.appendChild(cta);

    var ghost = document.createElement('a');
    ghost.className = 'home-ghost-cta';
    ghost.href = '#/about'; ghost.dataset.sceneLink = 'about';
    ghost.textContent = ArkCopy.text('HOME.CTA.SPEC');
    actions.appendChild(ghost);

    el.querySelector('.ark-hero-body').appendChild(actions);

    /* The readout strip: the registry's live counters, pinned to the foot. */
    var readout = document.createElement('div');
    readout.className = 'home-readout';
    readout.setAttribute('role', 'list');
    var units = String(ArkManifest.all().length);
    [
      ['HOME.READOUT.UNITS', units, ''],
      ['HOME.READOUT.PAYLOAD', '< 5 kb', 'c-cyan'],
      ['HOME.READOUT.REGISTRY', 'Live', 'c-amber'],
      ['HOME.READOUT.OBSERVER', 'Idle', 'c-violet']
    ].forEach(function (cell) {
      var item = document.createElement('div');
      item.className = 'home-readout-item';
      item.setAttribute('role', 'listitem');
      var k = document.createElement('span');
      k.className = 'home-readout-k';
      k.textContent = ArkCopy.text(cell[0]);
      var v = document.createElement('span');
      v.className = 'home-readout-v' + (cell[2] ? ' ' + cell[2] : '');
      v.textContent = cell[1];
      item.appendChild(k); item.appendChild(v);
      readout.appendChild(item);
    });
    el.appendChild(readout);
    return el;
  }
};

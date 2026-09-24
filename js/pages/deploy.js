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
        title: 'Register',
        body: 'flux-network create returns a networkId for a new, independently addressable network on Flux Protocol.',
        cmd: 'flux-network network create --name "my-network"'
      },
      {
        n: '02',
        title: 'Join',
        body: 'Set the networkId before starting the daemon to join that network instead of creating a new isolated one — the same primitive, the other direction.',
        cmd: 'FLUX_MINER_NETWORK=<networkId> flux-miner start'
      },
      {
        n: '03',
        title: 'Inspect',
        body: 'List the networks a miner already knows about.',
        cmd: 'flux-network network list'
      }
    ];

    var list = ArkUI.el('div', 'deploy-steps');
    STEPS.forEach(function (step) {
      var row = ArkUI.el('section', 'deploy-step');
      row.appendChild(ArkUI.el('span', 'deploy-step-num', step.n));
      var body = ArkUI.el('div', 'deploy-step-body');
      body.appendChild(ArkUI.el('h2', '', step.title));
      body.appendChild(ArkUI.el('p', '', step.body));
      var pre = ArkUI.el('pre', 'deploy-command');
      pre.appendChild(ArkUI.el('code', '', step.cmd));
      body.appendChild(pre);
      row.appendChild(body);
      list.appendChild(row);
    });
    content.appendChild(list);

    var note = ArkUI.el('p', 'deploy-caveat', 'network create / network list are not a security boundary today. Presence is partitioned per network; accounts, identities, and DAOs are not yet network-scoped.');
    content.appendChild(note);

    var footer = ArkUI.el('nav', 'theory-footer');
    footer.setAttribute('aria-label', 'Continue');
    var back = ArkUI.el('a', 'article-back');
    back.href = '#'; back.dataset.sceneLink = 'concept';
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

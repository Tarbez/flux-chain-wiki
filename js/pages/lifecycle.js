/* Content and screen-reader equivalent for the interactive lattice view. */
(function () {
  'use strict';

  ArkUI.lifecycleContent = {
    intent: {
      lead: 'Example: a client asks a provider to replicate a named dataset snapshot.',
      heading: 'State the exact need.',
      body: 'The client signs an intent that identifies the snapshot, desired outcome, and applicable constraints. Later records can now refer to this request by CID instead of relying on a conversation or global queue position.',
      note: 'What is still not true: no provider has committed, no work has occurred, and no result has been checked.',
      facts: [
        ['Who writes it', 'The client requesting replication.'],
        ['References', 'The dataset snapshot and applicable request policy.'],
        ['Becomes true', 'One signed, addressable request exists.'],
        ['Next', 'A provider offer references this intent CID.']
      ]
    },
    offer: {
      lead: 'A provider proposes how it will replicate that exact snapshot and under which terms.',
      heading: 'Answer the request precisely.',
      body: 'The provider signs an offer that references the intent CID. The terms stay attached to the request they answer, so the client can inspect capability, constraints, and proposed evidence before accepting anything.',
      note: 'What is still not true: a signed offer is a proposal, not a shared agreement or proof of capacity.',
      facts: [
        ['Who writes it', 'The provider proposing the work.'],
        ['References', 'The client intent CID.'],
        ['Becomes true', 'One attributable proposal exists for that request.'],
        ['Next', 'The participants accept matching terms.']
      ]
    },
    agreement: {
      lead: 'The client and provider record the accepted match between request and offer.',
      heading: 'Commit to the shared terms.',
      body: 'The signed agreement links the accepted intent and offer. It defines what fulfillment will be checked against while unrelated agreements continue independently.',
      note: 'What is still not true: accepted terms do not prove the replication happened or that downstream settlement occurred.',
      facts: [
        ['Who writes it', 'The participating client and provider.'],
        ['References', 'The accepted intent and offer CIDs.'],
        ['Becomes true', 'The participants have one inspectable set of terms.'],
        ['Next', 'The provider performs and documents the work.']
      ]
    },
    fulfillment: {
      lead: 'The provider submits the result and evidence for the requested replication.',
      heading: 'Show what was produced.',
      body: 'The fulfillment record references the agreement and carries the result evidence defined by its terms. The work remains attached to the request, provider, and policy that gave it meaning.',
      note: 'What is still not true: submission is not acceptance, semantic truth, or proof of every downstream effect.',
      facts: [
        ['Who writes it', 'The provider that performed the work.'],
        ['References', 'The agreement CID and result artifacts.'],
        ['Becomes true', 'A signed result is available for checking.'],
        ['Next', 'The applicable checker and authority evaluate it.']
      ]
    },
    receipt: {
      lead: 'The verifying participant records the outcome under the identified checker and authority rules.',
      heading: 'Close the evidence trail.',
      body: 'The receipt links the fulfillment to the agreement, offer, and intent. An auditor can follow one continuous path from request to verification without reconstructing a global block order.',
      note: 'What is still not true: a receipt is not universal truth, legal finality, treasury settlement, or production-readiness evidence.',
      facts: [
        ['Who writes it', 'The participant responsible for the verification outcome.'],
        ['References', 'The fulfillment and its linked agreement history.'],
        ['Becomes true', 'One policy-bound verification outcome is recorded.'],
        ['Result', 'An inspectable intent-to-receipt evidence trail.']
      ]
    }
  };

  ArkUI.pageModules.lifecycle = {
    mount: function (host, page) {
      var id = page.split('/')[1];
      var detail = ArkUI.lifecycleContent[id];
      if (id && !detail) throw new Error('Unknown lifecycle stage: ' + id);
      var el = ArkUI.el('section', 'ark-page learning-page lifecycle-page');
      el.dataset.arkPage = page;
      el.setAttribute('aria-label', id ? id + ' / Agreement lifecycle' : 'Agreement lifecycle');
      var path = ArkUI.el('nav', 'content-layer-path'); path.setAttribute('aria-label', 'Content depth');
      var model = ArkUI.el('a', '', '01 / Operating model'); model.href = '#/concept'; model.dataset.sceneLink = 'concept'; path.appendChild(model);
      if (id) {
        var overview = ArkUI.el('a', '', '02 / Agreement lifecycle'); overview.href = '#/lifecycle'; overview.dataset.sceneLink = 'lifecycle'; path.appendChild(overview);
        var stageDepth = ArkUI.el('span', '', '03 / ' + id.charAt(0).toUpperCase() + id.slice(1)); stageDepth.setAttribute('aria-current', 'page'); path.appendChild(stageDepth);
      } else {
        var lifecycleDepth = ArkUI.el('span', '', '02 / Agreement lifecycle'); lifecycleDepth.setAttribute('aria-current', 'page'); path.appendChild(lifecycleDepth);
      }
      el.appendChild(path);
      el.appendChild(ArkUI.el('h1', '', id ? detail.heading : 'How does one agreement become verifiable?'));
      el.appendChild(ArkUI.el('p', 'lifecycle-scenario', id ? detail.lead : 'Illustrative scenario: a client asks a provider to replicate one named dataset snapshot. Follow the object through five stages.'));
      var stages = id ? ArkUI.lifecycleStages.filter(function (stage) { return stage.id === id; }) : ArkUI.lifecycleStages;
      stages.forEach(function (stage) {
        var copy = ArkUI.lifecycleContent[stage.id];
        var section = ArkUI.el('section', '');
        if (!id) section.className = 'lifecycle-stage-summary';
        var heading = ArkUI.el('h2', '');
        if (id) heading.textContent = stage.title;
        else {
          var stageLink = ArkUI.el('a', '', stage.title);
          stageLink.href = '#/lifecycle/' + stage.id; stageLink.dataset.sceneLink = 'lifecycle/' + stage.id;
          heading.appendChild(stageLink);
        }
        section.appendChild(heading);
        if (!id) section.appendChild(ArkUI.el('p', '', copy.heading + ' ' + copy.lead));
        if (id) {
          section.appendChild(ArkUI.el('p', '', copy.body));
          section.appendChild(ArkUI.el('p', '', copy.note));
          var facts = ArkUI.el('div', 'lifecycle-facts');
          var choices = ArkUI.el('nav', ''); choices.setAttribute('aria-label', 'Inspect ' + stage.title);
          var answer = ArkUI.el('p', '', copy.facts[0][1]); answer.id = 'lifecycle-fact-' + stage.id; answer.setAttribute('aria-live', 'polite');
          var factButtons = [];
          copy.facts.forEach(function (fact, index) {
            var choice = ArkUI.el('button', 'mechanism-step', fact[0]); choice.type = 'button';
            choice.setAttribute('aria-pressed', String(index === 0)); choice.setAttribute('aria-controls', answer.id);
            choice.addEventListener('click', function () {
              answer.textContent = fact[1];
              factButtons.forEach(function (button, i) { button.setAttribute('aria-pressed', String(i === index)); });
              if (answer.animate && !ArkUI.prefersReducedMotion() && !ArkUI.sceneState.get().paused) answer.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 220 });
            });
            factButtons.push(choice); choices.appendChild(choice);
          });
          facts.appendChild(choices); facts.appendChild(answer); section.appendChild(facts);
        } else {
          var openStage = ArkUI.el('a', 'lifecycle-stage-link', 'Open this stage ↗');
          openStage.href = '#/lifecycle/' + stage.id; openStage.dataset.sceneLink = 'lifecycle/' + stage.id;
          section.appendChild(openStage);
        }
        el.appendChild(section);
      });
      var evidence = ArkUI.el('aside', 'lifecycle-evidence');
      evidence.appendChild(ArkUI.el('strong', '', 'Status / Partial'));
      evidence.appendChild(ArkUI.el('p', '', 'The lifecycle is implemented in source. Full public production automation and economic settlement are not established by this audit.'));
      var guide = ArkUI.el('a', '', 'Read the agreement guide ↗');
      guide.href = 'docs/protocol/agreements.md'; evidence.appendChild(guide); el.appendChild(evidence);
      host.appendChild(el);
      return el;
    }
  };
})();

/* Content and screen-reader equivalent for the interactive lattice view. */
(function () {
  'use strict';

  ArkUI.lifecycleContent = {
    intent: {
      lead: 'A peer states what it wants to happen. This is the opening record, not an agreement yet.',
      heading: 'State the need.',
      body: 'Intent begins a single agreement object. The initiating peer signs the request so later responses can refer to a specific statement, rather than a loose conversation or a place in a global transaction queue.',
      note: 'An intent alone does not bind another peer or complete the object.',
      facts: [
        ['Input', 'A requested action or outcome.'],
        ['Record', 'A signed intent manifest with its own CID.'],
        ['Next', 'An offer references that CID and answers this request.']
      ]
    },
    offer: {
      lead: 'Another peer answers the intent with proposed terms tied to that exact request.',
      heading: 'Answer precisely.',
      body: 'The offer is a signed response, not a free-floating bid. Its CID reference keeps the proposal attached to the intent it addresses. The participating peers can inspect the terms before anything is treated as agreed.',
      note: 'A proposed offer is still open until the participating peers reach a signed match.',
      facts: [
        ['Input', 'The intent CID and a proposed way to fulfill it.'],
        ['Record', 'A signed offer manifest pointing back to intent.'],
        ['Next', 'The matching terms become an agreement.']
      ]
    },
    agreement: {
      lead: 'The participating peers record the signed match between request and offer.',
      heading: 'Commit the match.',
      body: 'Agreement is the point at which the object has shared terms. Its authority is local to the peers concerned with this object; unrelated agreements do not wait behind it in one global block order.',
      note: 'Finality belongs to the agreement and its evidence trail, not to a network-wide transaction slot.',
      facts: [
        ['Input', 'The intent and the accepted offer.'],
        ['Record', 'A signed agreement manifest linking the prior stage.'],
        ['Next', 'Fulfillment is checked against these terms.']
      ]
    },
    fulfillment: {
      lead: 'The work or handoff is recorded against the terms the peers agreed to.',
      heading: 'Show the work.',
      body: 'Fulfillment carries the evidence that the agreed action was undertaken. By pointing back to the agreement, it keeps the work attached to the object and terms that gave it meaning.',
      note: 'Recording fulfillment is not the same as claiming that every downstream system has settled.',
      facts: [
        ['Input', 'The agreement and evidence of work or handoff.'],
        ['Record', 'A signed fulfillment manifest linked by CID.'],
        ['Next', 'A receipt closes the trail for this object.']
      ]
    },
    receipt: {
      lead: 'The closing record makes the object auditable from its first request to its result.',
      heading: 'Close the trail.',
      body: 'Receipt links back through fulfillment, agreement, offer, and intent. A reader can follow those signed CID references to see what was requested, promised, done, and acknowledged without reconstructing a global chain.',
      note: 'A receipt records closure of this agreement; it does not itself imply treasury settlement.',
      facts: [
        ['Input', 'The fulfillment record and its linked history.'],
        ['Record', 'A signed receipt manifest.'],
        ['Result', 'One object with a complete, inspectable evidence trail.']
      ]
    }
  };

  ArkUI.pageModules.lifecycle = {
    mount: function (host, page) {
      var id = page.split('/')[1];
      var detail = ArkUI.lifecycleContent[id];
      if (id && !detail) throw new Error('Unknown lifecycle stage: ' + id);
      var el = ArkUI.el('section', 'ark-page lifecycle-page');
      el.dataset.arkPage = page;
      el.setAttribute('aria-label', id ? id + ' / Agreement lifecycle' : 'Agreement lifecycle');
      el.appendChild(ArkUI.el('h1', '', 'Agreement lifecycle'));
      var stages = id ? ArkUI.lifecycleStages.filter(function (stage) { return stage.id === id; }) : ArkUI.lifecycleStages;
      stages.forEach(function (stage) {
        var copy = ArkUI.lifecycleContent[stage.id];
        var section = ArkUI.el('section', '');
        section.appendChild(ArkUI.el('h2', '', stage.title));
        section.appendChild(ArkUI.el('p', '', copy.heading + ' ' + copy.lead));
        section.appendChild(ArkUI.el('p', '', copy.body));
        section.appendChild(ArkUI.el('p', '', copy.note));
        copy.facts.forEach(function (fact) { section.appendChild(ArkUI.el('p', '', fact[0] + ': ' + fact[1])); });
        el.appendChild(section);
      });
      host.appendChild(el);
      return el;
    }
  };
})();

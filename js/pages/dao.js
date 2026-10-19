/* Governance, explained here; done in DAO (owner decision 2026-10-19: overlap pages explain and
   hand off -- the sheet is the explanation the product does not carry, the signing is the
   product's). ArkUI.dash.productHandoff reads the DAO product's address from the family catalog.
   The hand-off follows the short answer, in the story template's first view (js/pages/story.js). */
ArkUI.pageModules.dao = { mount: function(host) {
  var el=ArkUI.sheet('dao','dao');
  var handoff=ArkUI.dash&&ArkUI.dash.productHandoff&&ArkUI.dash.productHandoff({product:'dao',text:'A network\u2019s named signers decide changes for that network only: a decision counts once enough of them sign, and takes effect only when its own conditions are met. DAO is where they sign.'});
  if(handoff){var idea=el.story&&el.story.panel('focus');if(idea)idea.appendChild(handoff);else el.appendChild(handoff);}
  host.appendChild(el); return el; } };

/* Governance, explained here; done in DAO (owner decision 2026-10-19: overlap pages explain and
   hand off -- the sheet is the explanation the product does not carry, the signing is the
   product's). ArkUI.dash.productHandoff reads the DAO product's address from the family catalog.
   The hand-off follows the short answer, in the story template's first view (js/pages/story.js).

   W4-S13 (2026-10-20), both from js/pages/resolver-page-parts.js (the figure) and js/ark/page-kit.js (the links):
   - "Who can change a resolver?" (point 6) carries the manifest's upgrade-supersedes figure: the
     old declaration stays on the line, quieter but present; an immutable launch has a lock where
     the key was. It is drawn from meta.diagrams in js/content/manifests/dao.js, inside the row the
     reader opened, behind "Show the illustration" (open, the row ran to 2.0 screens at 1440), so the
     question and its picture are one thing.
   - The page used to end in its hero's one action. Evidence now leads on: to the resolution that
     starts here (js/content/resolutions.js `start`) and to the rest of its journey, derived from
     the site's journey table -- Deploy a resolver is one of them (resolvers-content.md 5.c). */
ArkUI.pageModules.dao = { mount: function(host) {
  var el=ArkUI.sheet('dao','dao');
  var handoff=ArkUI.dash&&ArkUI.dash.productHandoff&&ArkUI.dash.productHandoff({product:'dao',text:'A network’s named signers decide changes for that network only: a decision counts once enough of them sign, and takes effect only when its own conditions are met. DAO is where they sign.'});
  if(handoff){var idea=el.story&&el.story.panel('focus');if(idea)idea.appendChild(handoff);else el.appendChild(handoff);}
  var parts=ArkUI.resolverPageParts;
  if(parts&&el.story&&ArkUI.blocks){
    /* the upgrade figure, inside the row that asks the question */
    var question=ArkCopy.text('DAO.POINT6.TITLE'),rows=el.querySelectorAll('[data-ark-part="accordion-item"]'),row=null;
    for(var i=0;i<rows.length&&!row;i++){var trigger=rows[i].querySelector('[data-ark-part="accordion-trigger"]');if(trigger&&trigger.textContent.indexOf(question)>=0)row=rows[i];}
    var body=row&&row.querySelector('[data-ark-part="accordion-content"]');
    if(body){var upgrade=parts.figureBlock('dao','upgrade-supersedes',{foldBelow:'always',id:'dao-upgrade-figure',more:'Show the illustration',less:'Hide the illustration'}),slots={};slots[upgrade.slot]=upgrade.node;
      body.appendChild(ArkUI.blocks.render(upgrade.spec,{slots:slots}));}
    /* where next: what starts here, then the rest of the journey (Chain, Deploy a resolver, ...) */
    var evidence=el.story.panel('reference'),start=ArkResolutions.startingFrom('dao').filter(function(r){return ArkUI.pageCatalog['resolutions/'+r.slug];});
    var blocks=[];
    if(start.length){blocks.push({block:'eyebrow',props:{text:'What you can resolve here'}});
      blocks.push({block:'actions',props:{label:'What you can resolve here',items:start.map(function(r){return{label:r.title,href:'route:resolutions/'+r.slug,tone:'link'};})}});}
    blocks=blocks.concat(ArkUI.journeyPageBlocks?ArkUI.journeyPageBlocks('dao',{exclude:['concept']}):[]);
    if(evidence)blocks.forEach(function(spec){evidence.appendChild(ArkUI.blocks.render(spec,{}));});
  }
  host.appendChild(el); return el; } };

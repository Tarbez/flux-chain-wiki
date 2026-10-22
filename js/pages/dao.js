/* Governance, explained here; done in DAO (owner decision 2026-10-19: overlap pages explain and
   hand off -- the sheet is the explanation the product does not carry, the signing is the
   product's). The DAO product's address comes from the family catalog (DefxnKit).
   The hand-off is the hero's one action, "Open DAO" (since 2026-10-22; below).

   W4-S13 (2026-10-20), both from js/pages/resolver-page-parts.js (the figure) and js/ark/page-kit.js (the links):
   - "Who can change a resolver?" (point 6) carries the manifest's upgrade-supersedes figure: the
     old declaration stays on the line, quieter but present; an immutable launch has a lock where
     the key was. It is drawn from meta.diagrams in js/content/manifests/dao.js, inside the row the
     reader opened, behind "Show the illustration" (open, the row ran to 2.0 screens at 1440), so the
     question and its picture are one thing.
   - The page used to end in its hero's one action. Evidence now leads on: to the resolution that
     starts here (js/content/resolutions.js `start`) and to the rest of its journey, derived from
     the site's journey table -- Deploy a resolver is one of them (resolvers-content.md 5.c). */
/* "Open DAO" is the hero's one action (first-visit audit 2026-10-22, P1): the hero's teal button was "Separate approval
   from activation", the notes page's words, while the product sat in a small outlined button in a card lower down. The
   address is the family kit's (DefxnKit.productHref), never typed here; with no kit loaded (a headless harness) the sheet
   keeps its notes link as the hero action. The notes link is the first of the ways on, in The idea (js/pages/sheet.js).
   The card that held the button is gone: its one sentence repeated the deck, and its button is the hero's now. */
function daoProductAction(){
  var kit=typeof window!=='undefined'&&window.DefxnKit,product=kit&&kit.productById&&kit.productById('dao'),href=product&&kit.productHref(product);
  return href?{label:'Open '+product.name,href:/^https?:/.test(href)?'url:'+href:href}:null;
}
ArkUI.pageModules.dao = { mount: function(host) {
  var el=ArkUI.sheet('dao','dao',{action:daoProductAction()});
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

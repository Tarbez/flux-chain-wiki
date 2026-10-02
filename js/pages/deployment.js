/* Three everyday steps. Technical depth is in the linked agreement pages. */
ArkUI.pageModules.deployment={mount:function(host){
 function words(role){return ArkCopy.text('DEPLOYMENT.SIMPLE.'+role);}
 function link(label,key,cls){var a=ArkUI.el('a',cls||'',label);a.href=ArkUI.route.href(ArkUI.pageCatalog[key].path);a.dataset.sceneLink=key;return a;}
 var el=ArkUI.el('section','ark-page how-simple');el.dataset.arkPage='deployment';
 var path=ArkUI.el('nav','content-layer-path');path.setAttribute('aria-label','Your place');path.appendChild(link('← Home','zero'));var here=ArkUI.el('span','','How it works');here.setAttribute('aria-current','page');path.appendChild(here);el.appendChild(path);
 var heading=ArkUI.el('header','how-simple-intro');heading.appendChild(ArkUI.el('p','story-kicker','DEFXN / HOW IT WORKS'));var title=ArkUI.el('h1','',words('TITLE'));title.id='deployment-title';el.setAttribute('aria-labelledby',title.id);heading.appendChild(title);heading.appendChild(ArkUI.el('p','how-simple-deck',words('INTRO')));el.appendChild(heading);
 var cards=ArkUI.el('nav','how-work-cards');cards.setAttribute('aria-label','Three parts of a job');var fabrics=[];
 [{key:'ASK',pattern:'intent',route:'lifecycle/intent'},{key:'WORK',pattern:'agreement',route:'lifecycle/agreement'},{key:'CHECK',pattern:'receipt',route:'lifecycle/receipt'}].forEach(function(part,i){
  var card=link('',part.route,'how-work-card');card.dataset.continuityCard='work-'+part.key.toLowerCase();card.dataset.workStep=part.key.toLowerCase();
  card.appendChild(ArkUI.el('span','how-work-number',String(i+1).padStart(2,'0')));card.appendChild(ArkUI.el('h2','',words(part.key+'.TITLE')));card.appendChild(ArkUI.el('p','how-work-answer',words(part.key+'.TEXT')));
  var mesh=ArkUI.el('canvas','how-work-mesh');mesh.setAttribute('aria-hidden','true');card.appendChild(mesh);var more=ArkUI.el('span','how-work-more','See this part →');more.setAttribute('aria-hidden','true');card.appendChild(more);
  var fabric=ArkUI.createMeshFabric(mesh);fabrics.push(fabric);var pointer=false;
  function activate(){card.dataset.active='true';fabric.select(part.pattern,true);}
  function reset(){if(!pointer&&document.activeElement!==card){card.dataset.active='false';fabric.select('quiet',true);}}
  card.addEventListener('pointerenter',function(){pointer=true;activate();});card.addEventListener('pointerleave',function(){pointer=false;reset();});card.addEventListener('focus',activate);card.addEventListener('blur',reset);cards.appendChild(card);
 });el.appendChild(cards);
 var footer=ArkUI.el('footer','how-simple-footer');footer.appendChild(ArkUI.el('p','how-simple-boundary',words('BOUNDARY')));footer.appendChild(link('Follow the full story →','lifecycle','how-simple-next'));el.appendChild(footer);
 el.arkDispose=function(){fabrics.forEach(function(fabric){fabric.dispose();});};host.appendChild(el);fabrics.forEach(function(fabric){fabric.select('quiet',false);});return el;
}};

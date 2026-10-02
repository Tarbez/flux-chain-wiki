/* The first choice is a question. The chosen card is the route's visual origin. */
ArkUI.pageModules.concept = { mount:function(host){
  var el=ArkUI.el('section','ark-page guided-page story-index');el.dataset.arkPage='concept';el.setAttribute('aria-labelledby','concept-title');
  var path=ArkUI.el('nav','content-layer-path');path.setAttribute('aria-label','Your place');var back=ArkUI.el('a','','← Overview');back.href='#/about';back.dataset.sceneLink='about';path.appendChild(back);el.appendChild(path);
  var title=ArkUI.el('h1','',ArkCopy.text('CONCEPT.TITLE'));title.id='concept-title';el.appendChild(title);
  el.appendChild(ArkUI.el('p','story-index-answer',ArkCopy.text('CONCEPT.DECK')));
  var choices=ArkUI.el('nav','story-depth');choices.setAttribute('aria-label','Question group');var buttons=[];
  ['Start with a question','Inspect evidence & activation'].forEach(function(label,i){var b=ArkUI.el('button','',label);b.type='button';b.addEventListener('click',function(){select(i,true);});buttons.push(b);choices.appendChild(b);});el.appendChild(choices);
  var grid=ArkUI.el('div','story-topic-grid');el.appendChild(grid);
  function select(group,write){buttons.forEach(function(b,i){b.setAttribute('aria-pressed',String(i===group));});grid.replaceChildren();ArkManifest.group('theory').filter(function(m){return m.meta.placement===(group?'rail':'row');}).forEach(function(m,i){var card=ArkUI.el('article','story-topic');card.dataset.continuityCard='concept/'+m.id;var icon=ArkUI.icon&&ArkUI.icon({purpose:'network',depth:'cycle',practice:'authority',notes:'layers',studio:'evidence',spec:'inspect'}[m.id]||'document');if(icon)card.appendChild(icon);card.appendChild(ArkUI.el('span','story-index-number',('0'+(i+1)).slice(-2)));var a=ArkUI.el('a','',ArkCopy.text(m.id.toUpperCase()+'.TITLE'));a.href='#'+m.route;a.dataset.sceneLink='concept/'+m.id;card.appendChild(a);card.appendChild(ArkUI.el('span','story-topic-purpose',m.title+' / open explanation →'));grid.appendChild(card);});if(write)ArkUI.route.write('/concept',group?'view=more':'','push');}
  function restore(){if(ArkUI.route.path()==='/concept')select(new URLSearchParams(ArkUI.route.search()).get('view')==='more'?1:0,false);}
  select(0,false);restore();el.arkRestore=restore;window.addEventListener('popstate',restore);window.addEventListener('hashchange',restore);el.arkDispose=function(){window.removeEventListener('popstate',restore);window.removeEventListener('hashchange',restore);};host.appendChild(el);return el;
} };

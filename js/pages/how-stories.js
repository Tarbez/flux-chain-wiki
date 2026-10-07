/* Three dedicated nontechnical chapters; lifecycle records remain a separate deeper journey.
   Each chapter teaches one part of the agreement: three steps that drive the record and mesh,
   then why DEFXN works this way, then what the step does and does not establish. */
ArkUI.pageModules.howStory={mount:function(host,page){
 var id=page.split('/')[1],ids=['ask','work','check'],index=ids.indexOf(id);if(index<0)throw new Error('Unknown work story');
 function words(key){return ArkCopy.text('DEPLOYMENT.CHAPTER.'+id.toUpperCase()+'.'+key);}
 function link(label,target,cls){var a=ArkUI.el('a',cls||'',label);a.href=ArkUI.route.href(ArkUI.pageCatalog[target].path);a.dataset.sceneLink=target;return a;}
 var el=ArkUI.el('section','ark-page how-chapter how-chapter-'+id);el.dataset.arkPage=page;
 var path=ArkUI.el('nav','content-layer-path');path.setAttribute('aria-label','Your place');path.appendChild(link('← How it works','deployment'));var current=ArkUI.el('span','',String(index+1).padStart(2,'0')+' / '+['State the request','Agree on the terms','Verify the result'][index]);current.setAttribute('aria-current','page');path.appendChild(current);el.appendChild(path);
 var header=ArkUI.el('header','how-chapter-header');var title=ArkUI.el('h1','',words('TITLE'));title.id='how-'+id+'-title';el.setAttribute('aria-labelledby',title.id);header.appendChild(title);header.appendChild(ArkUI.el('p','',words('INTRO')));el.appendChild(header);

 var canvas=ArkUI.el('canvas','how-chapter-mesh');canvas.setAttribute('aria-hidden','true');var motion=ArkUI.el('p','mesh-story-cue');
 var fabric=ArkUI.createMeshFabric(canvas,{caption:motion}),patterns={ask:['story-ask','story-goal','story-limits'],work:['story-request','story-proposal','story-work'],check:['story-promise','story-result','story-decision']}[id],pattern=patterns[0];

 /* The record this chapter produces. "[1,2] name: meaning" ties a row to the steps that explain it; untagged rows always stay lit. */
 var fields=[];
 function light(n){fields.forEach(function(f){var on=!f.tags||f.tags.indexOf(n)>=0;f.cells.forEach(function(c){c.dataset.lit=String(on);});});}
 var list=ArkUI.el('dl','how-record-fields');list.setAttribute('aria-label',words('RECORD.LABEL'));
 words('RECORD').split('\n').forEach(function(line){var tags=null,m=/^\[([\d,\s]+)\]\s*/.exec(line);if(m){tags=m[1].split(',').map(Number);line=line.slice(m[0].length);}var cut=line.indexOf(': ');if(cut<0)return;var dt=ArkUI.el('dt','',line.slice(0,cut)),dd=ArkUI.el('dd','',line.slice(cut+2));list.appendChild(dt);list.appendChild(dd);fields.push({tags:tags,cells:[dt,dd]});});
 var card=ArkUI.el('section',['how-request-brief','how-common-record','how-returned-result'][index]+' how-record-card');
 card.appendChild(ArkUI.el('span','how-chapter-label',words('RECORD.LABEL')));card.appendChild(ArkUI.el('h2','',words(['JOB','JOIN','RESULT'][index])));card.appendChild(list);card.appendChild(canvas);card.appendChild(motion);

 /* Three steps, all readable at once; the selected one drives the record and the mesh. */
 var steps=ArkUI.el('ol','how-steps');steps.setAttribute('aria-label','How this part works');var choices=[];
 function step(n){
  var item=ArkUI.el('li','how-step'),b=ArkUI.el('button','how-step-button');b.type='button';b.setAttribute('aria-pressed',String(n===1));var pointer=false;
  b.appendChild(ArkUI.el('span','how-step-number',String(n).padStart(2,'0')));b.appendChild(ArkUI.el('strong','',words('CHOICE'+n)));
  var text=ArkUI.el('p','how-step-text',words('DETAIL'+n));
  function preview(){fabric.select(patterns[n-1],true);light(n);}
  function reset(){if(!pointer&&document.activeElement!==b){fabric.select(pattern,true);light(patterns.indexOf(pattern)+1);}}
  b.addEventListener('pointerenter',function(){pointer=true;preview();});b.addEventListener('pointerleave',function(){pointer=false;reset();});b.addEventListener('focus',preview);b.addEventListener('blur',reset);
  b.addEventListener('click',function(){pattern=patterns[n-1];choices.forEach(function(button,i){button.setAttribute('aria-pressed',String(i===n-1));button.parentNode.dataset.active=String(i===n-1);});fabric.select(pattern,true,true);light(n);});
  item.dataset.active=String(n===1);item.appendChild(b);item.appendChild(text);choices.push(b);return item;
 }
 for(var n=1;n<=3;n++)steps.appendChild(step(n));
 var body=ArkUI.el('div','how-chapter-body');body.appendChild(card);body.appendChild(steps);el.appendChild(body);

 var why=ArkUI.el('section','how-why');why.appendChild(ArkUI.el('h2','how-section-title','Why it works this way'));var grid=ArkUI.el('div','how-why-grid');
 for(var w=1;w<=3;w++){var point=ArkUI.el('article','how-why-point');point.appendChild(ArkUI.el('h3','',words('WHY'+w+'.TITLE')));point.appendChild(ArkUI.el('p','',words('WHY'+w+'.TEXT')));grid.appendChild(point);}
 why.appendChild(grid);el.appendChild(why);
 var truth=ArkUI.el('div','how-record-truth');[['TRUE AFTER THIS STEP','NOW'],['NOT YET TRUE','NOT']].forEach(function(pair){var row=ArkUI.el('p','how-record-'+pair[1].toLowerCase());row.appendChild(ArkUI.el('span','',pair[0]));row.appendChild(ArkUI.el('span','',words(pair[1])));truth.appendChild(row);});el.appendChild(truth);
 light(1);

 var footer=ArkUI.el('nav','how-chapter-footer');footer.setAttribute('aria-label','Continue this story');var records=['intent','agreement','receipt'];footer.appendChild(link('Explore the signed record','lifecycle/'+records[index],'how-deeper-link'));if(index>0)footer.appendChild(link('← Previous part','how/'+ids[index-1]));footer.appendChild(link(index<2?'Next: '+['','agree on the terms','verify the result'][index+1]+' →':'Back to the three parts →',index<2?'how/'+ids[index+1]:'deployment','how-chapter-next'));el.appendChild(footer);
 el.arkDispose=function(){fabric.dispose();};host.appendChild(el);fabric.select(pattern,false);return el;
}};

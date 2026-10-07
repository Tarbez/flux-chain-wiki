/* Three dedicated nontechnical chapters; lifecycle records remain a separate deeper journey. */
ArkUI.pageModules.howStory={mount:function(host,page){
 var id=page.split('/')[1],ids=['ask','work','check'],index=ids.indexOf(id);if(index<0)throw new Error('Unknown work story');
 function words(key){return ArkCopy.text('DEPLOYMENT.CHAPTER.'+id.toUpperCase()+'.'+key);}
 function link(label,target,cls){var a=ArkUI.el('a',cls||'',label);a.href=ArkUI.route.href(ArkUI.pageCatalog[target].path);a.dataset.sceneLink=target;return a;}
 var el=ArkUI.el('section','ark-page how-chapter how-chapter-'+id);el.dataset.arkPage=page;
 var path=ArkUI.el('nav','content-layer-path');path.setAttribute('aria-label','Your place');path.appendChild(link('← How it works','deployment'));var current=ArkUI.el('span','',String(index+1).padStart(2,'0')+' / '+['State the request','Agree on the terms','Verify the result'][index]);current.setAttribute('aria-current','page');path.appendChild(current);el.appendChild(path);
 var header=ArkUI.el('header','how-chapter-header');var title=ArkUI.el('h1','',words('TITLE'));title.id='how-'+id+'-title';el.setAttribute('aria-labelledby',title.id);header.appendChild(title);header.appendChild(ArkUI.el('p','',words('INTRO')));el.appendChild(header);
 var body=ArkUI.el('div','how-chapter-body');var choices=[],detail=ArkUI.el('p','how-chapter-detail',words('DETAIL1'));detail.setAttribute('aria-live','polite');
 var canvas=ArkUI.el('canvas','how-chapter-mesh');canvas.setAttribute('aria-hidden','true');var motion=ArkUI.el('p','mesh-story-cue');var fabric=ArkUI.createMeshFabric(canvas,{caption:motion}),patterns={ask:['story-ask','story-goal','story-limits'],work:['story-request','story-proposal'],check:['story-promise','story-result','story-decision']}[id],pattern=patterns[0];
 var fields=[];
 function light(n){fields.forEach(function(f){var on=!f.tags||f.tags.indexOf(n)>=0;f.cells.forEach(function(c){c.dataset.lit=String(on);});});}
 function choice(n,cls){
  var b=ArkUI.el('button',cls||'how-chapter-choice',words('CHOICE'+n));b.type='button';b.setAttribute('aria-pressed',String(n===1));var pointer=false;
  function preview(){fabric.select(patterns[n-1],true);light(n);}
  function reset(){if(!pointer&&document.activeElement!==b){fabric.select(pattern,true);light(patterns.indexOf(pattern)+1);}}
  b.addEventListener('pointerenter',function(){pointer=true;preview();});b.addEventListener('pointerleave',function(){pointer=false;reset();});b.addEventListener('focus',preview);b.addEventListener('blur',reset);
  b.addEventListener('click',function(){pattern=patterns[n-1];choices.forEach(function(button,i){button.setAttribute('aria-pressed',String(i===n-1));});detail.textContent=words('DETAIL'+n);fabric.select(pattern,true,true);light(n);});choices.push(b);return b;
 }
 /* The record a chapter produces. "[1,2] name: meaning" ties a row to the choices that explain it; untagged rows always stay lit. */
 function record(){
  var list=ArkUI.el('dl','how-record-fields');list.setAttribute('aria-label',words('RECORD.LABEL'));
  words('RECORD').split('\n').forEach(function(line){var tags=null,m=/^\[([\d,\s]+)\]\s*/.exec(line);if(m){tags=m[1].split(',').map(Number);line=line.slice(m[0].length);}var cut=line.indexOf(': ');if(cut<0)return;var dt=ArkUI.el('dt','',line.slice(0,cut)),dd=ArkUI.el('dd','',line.slice(cut+2));list.appendChild(dt);list.appendChild(dd);fields.push({tags:tags,cells:[dt,dd]});});
  return list;
 }
 function truth(){var box=ArkUI.el('div','how-record-truth');[['TRUE NOW','NOW'],['NOT YET','NOT']].forEach(function(pair){var row=ArkUI.el('p','how-record-'+pair[1].toLowerCase());row.appendChild(ArkUI.el('span','',pair[0]));row.appendChild(ArkUI.el('span','',words(pair[1])));box.appendChild(row);});return box;}
 function object(cls,heading){var box=ArkUI.el('section',cls);box.appendChild(ArkUI.el('span','how-chapter-label',words('RECORD.LABEL')));if(heading)box.appendChild(ArkUI.el('h2','',heading));box.appendChild(record());box.appendChild(canvas);box.appendChild(motion);return box;}
 if(id==='ask'){
  body.appendChild(object('how-request-brief',words('JOB')));
  var inspector=ArkUI.el('section','how-request-inspector');var menu=ArkUI.el('nav','how-request-choices');menu.setAttribute('aria-label','What a request needs');for(var n=1;n<=3;n++)menu.appendChild(choice(n));inspector.appendChild(menu);inspector.appendChild(detail);inspector.appendChild(truth());body.appendChild(inspector);
 }else if(id==='work'){
  var handshake=ArkUI.el('section','how-shared-promise');
  var parties=ArkUI.el('nav','how-promise-parties');parties.setAttribute('aria-label','Inspect both sides');parties.appendChild(choice(1,'how-promise-party'));parties.appendChild(choice(2,'how-promise-party'));handshake.appendChild(parties);
  var shared=object('how-common-record');shared.insertBefore(ArkUI.el('h2','how-common-promise',words('JOIN')),shared.children[1]);handshake.appendChild(shared);body.appendChild(handshake);
  var note=ArkUI.el('aside','how-promise-note');note.appendChild(detail);note.appendChild(truth());body.appendChild(note);
 }else{
  body.appendChild(object('how-returned-result',words('RESULT')));
  var ledger=ArkUI.el('section','how-check-ledger');var rows=ArkUI.el('nav','how-check-choices');rows.setAttribute('aria-label','Follow the checking decision');for(var j=1;j<=3;j++){var button=choice(j,'how-check-row');button.insertBefore(ArkUI.el('span','',String(j).padStart(2,'0')),button.firstChild);rows.appendChild(button);}ledger.appendChild(rows);ledger.appendChild(detail);ledger.appendChild(truth());body.appendChild(ledger);
 }light(1);
 el.appendChild(body);
 var footer=ArkUI.el('nav','how-chapter-footer');footer.setAttribute('aria-label','Continue this story');var records=['intent','agreement','receipt'];footer.appendChild(link('Explore the signed record','lifecycle/'+records[index],'how-deeper-link'));if(index>0)footer.appendChild(link('← Previous part','how/'+ids[index-1]));footer.appendChild(link(index<2?'Next: '+['','agree on the terms','verify the result'][index+1]+' →':'Back to the three parts →',index<2?'how/'+ids[index+1]:'deployment','how-chapter-next'));el.appendChild(footer);
 el.arkDispose=function(){fabric.dispose();};host.appendChild(el);fabric.select(pattern,false);return el;
}};

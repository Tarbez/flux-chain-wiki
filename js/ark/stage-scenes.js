/* Distinct reading objects for each stage; all describe an illustration, never a live record. */
(function(){
 ArkUI.createStageScene=function(id,copy){
  var scene=ArkUI.el('figure','stage-scene stage-scene-'+id);scene.setAttribute('aria-label',id+' illustration');
  var top=ArkUI.el('div','stage-scene-top');top.appendChild(ArkUI.el('span','','ILLUSTRATION'));top.appendChild(ArkUI.el('span','','NOT A LIVE RECORD'));scene.appendChild(top);
  var titles={intent:'The request brief',offer:'A reply to the brief',agreement:'The shared commitment',fulfillment:'The evidence package',receipt:'The decision trail'};
  scene.appendChild(ArkUI.el('figcaption','stage-scene-title',titles[id]));
  var object=ArkUI.el('div','stage-scene-object');
  function item(label,text,cls){var row=ArkUI.el('div',cls||'stage-object-row');row.appendChild(ArkUI.el('span','stage-object-label',label));row.appendChild(ArkUI.el('p','',text));return row;}
  if(id==='intent'){
   object.appendChild(item('THE JOB','Replicate a named dataset snapshot.','stage-brief-job'));
   object.appendChild(item('THE RULES','The desired outcome and constraints travel with the request.'));
  }else if(id==='offer'){
   object.appendChild(item('YOU ASKED','Replicate this snapshot.','stage-offer-request'));
   object.appendChild(item('THE PROVIDER PROPOSES','Terms, capability, and the evidence they plan to supply.','stage-offer-reply'));
  }else if(id==='agreement'){
   object.appendChild(item('CLIENT','The request','stage-party'));
   object.appendChild(item('PROVIDER','The offer','stage-party'));
   object.appendChild(item('ONE SHARED RECORD','The accepted terms link both sides.','stage-common-terms'));
  }else if(id==='fulfillment'){
   object.appendChild(item('01 / RESULT','What the provider produced.','stage-package-result'));
   object.appendChild(item('02 / EVIDENCE','The supporting material required by the terms.','stage-package-evidence'));
  }else{
   object.appendChild(item('RESULT','The submitted work.','stage-ledger-row'));
   object.appendChild(item('RULES','The identified checker and authority.','stage-ledger-row'));
   object.appendChild(item('DECISION','The recorded verification outcome.','stage-ledger-row'));
  }
  scene.appendChild(object);
  var canvas=ArkUI.el('canvas','stage-scene-mesh');canvas.setAttribute('aria-hidden','true');scene.appendChild(canvas);var motion=ArkUI.el('p','mesh-story-cue');scene.appendChild(motion);
  var controls=ArkUI.el('nav','stage-scene-choices');controls.setAttribute('aria-label','Inspect the '+id+' illustration');
  var detail=ArkUI.el('p','stage-scene-detail','Choose a label to inspect this part.');detail.setAttribute('aria-live','polite');var buttons=[];
  var inspectionPatterns={intent:['story-ask','story-limits'],offer:['story-proposal','story-request'],agreement:['story-work','story-promise'],fulfillment:['story-result','story-request'],receipt:['story-decision','story-check']}[id];
  var options=id==='intent'?['Who asks','What travels']:id==='offer'?['Who replies','What it answers']:id==='agreement'?['Both sides','The link']:id==='fulfillment'?['Who submits','What it follows']:['Who checks','The trail'];
  options.forEach(function(label,i){var button=ArkUI.el('button','',label);button.type='button';button.setAttribute('aria-pressed','false');button.addEventListener('click',function(){buttons.forEach(function(b,j){b.setAttribute('aria-pressed',String(i===j));});detail.textContent=copy.facts[i][1];fabric.select(inspectionPatterns[i],true,true);});buttons.push(button);controls.appendChild(button);});scene.appendChild(controls);scene.appendChild(detail);
  var patterns={intent:'story-ask',offer:'story-offer',agreement:'story-work',fulfillment:'story-result',receipt:'story-check'},pattern=patterns[id];var fabric=ArkUI.createMeshFabric(canvas,{caption:motion});
  scene.arkStageActivate=function(){fabric.select(pattern,true,true);};
  return {element:scene,start:function(){fabric.select(pattern,false);},preview:function(stage){fabric.select(patterns[stage]||pattern,true,true);},dispose:function(){fabric.dispose();}};
 };
})();

/* Preserve the actual illustration surface independently of route-content lifetime. */
ArkUI.createStageRetention=function(shell){
 var held=null,slot=null;
 function cancel(){}
 function restore(){cancel();if(held&&slot&&slot.parentNode){slot.parentNode.replaceChild(held,slot);held.style.position='';held.style.left='';held.style.top='';held.style.width='';held.style.height='';held.style.zIndex='';held.style.pointerEvents='';held.inert=false;held.removeAttribute('aria-hidden');}else if(held)held.remove();held=null;slot=null;}
 return {
  hold:function(outgoing,incoming,immediate){
   if(!incoming||!incoming.querySelector('.stage-scene')){restore();return;}
   if(held)return;
   var surface=outgoing&&outgoing.querySelector('.stage-scene');if(!surface)return;
   var rect=surface.getBoundingClientRect(),base=shell.getBoundingClientRect();
   slot=document.createElement('div');slot.className='stage-scene-slot';slot.style.height=rect.height+'px';
   surface.parentNode.replaceChild(slot,surface);held=surface;held.inert=true;held.setAttribute('aria-hidden','true');
   Object.assign(held.style,{position:'absolute',left:(rect.left-base.left)+'px',top:(rect.top-base.top)+'px',width:rect.width+'px',height:rect.height+'px',zIndex:'6',pointerEvents:'none'});
   shell.appendChild(held);
  },
  commit:function(incoming){
   if(!held)return;
   var replacement=incoming.querySelector('.stage-scene');if(!replacement){restore();return;}
   cancel();var activate=replacement.arkStageActivate;held.className=replacement.className;held.setAttribute('aria-label',replacement.getAttribute('aria-label'));
   held.replaceChildren.apply(held,Array.from(replacement.children));replacement.parentNode.replaceChild(held,replacement);
   held.arkStageActivate=activate;
   ['position','left','top','width','height','zIndex','pointerEvents'].forEach(function(key){held.style[key]='';});
   held.inert=false;held.removeAttribute('aria-hidden');held=null;slot=null;
  },
  activate:function(incoming){var surface=incoming&&incoming.querySelector('.stage-scene');if(surface&&typeof surface.arkStageActivate==='function')surface.arkStageActivate();},
  restore:restore
 };
};

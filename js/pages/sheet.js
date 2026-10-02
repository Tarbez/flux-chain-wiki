/* One page of headed points: the theory's detail pages and About are the same sheet with different words.
   The words come from the page's manifest; the sheet has as many points as the manifest has POINT<n> fields. */
ArkUI.sheet = function (id, page) {
  var manifest = ArkManifest.get(id);
  if (id === 'about' || manifest.fields['STATUS.TEXT']) return ArkUI.storySheet(id, page);
  var area = id.toUpperCase();
  function words(role) { return ArkCopy.text(area + '.' + role); }
  function link(role, target, className) {
    var a = ArkUI.el('a', className || 'article-back');
    a.href = '#' + ArkUI.pageCatalog[target].path; a.dataset.sceneLink = target;
    a.appendChild(document.createTextNode(words(role) + ' '));
    var arrow = ArkUI.el('span', 'cta-arrow', '↗'); arrow.setAttribute('aria-hidden', 'true');
    a.appendChild(arrow); return a;
  }
  var el = ArkUI.el('section', 'ark-page learning-page theory-page ' + id + '-page');
  el.dataset.arkPage = page; el.setAttribute('aria-labelledby', id + '-title');
  var content = ArkUI.el('div', 'concept-content');
  if (manifest.group === 'theory' || manifest.fields['STATUS.TEXT']) {
    var path = ArkUI.el('nav', 'content-layer-path');
    path.setAttribute('aria-label', 'Content depth');
    var parent = ArkUI.el('a', '', '01 / Operating model');
    parent.href = '#/concept'; parent.dataset.sceneLink = 'concept'; path.appendChild(parent);
    var current = ArkUI.el('span', '', '02 / ' + manifest.title);
    current.setAttribute('aria-current', 'page'); path.appendChild(current);
    content.appendChild(path);
  }
  content.appendChild(ArkUI.el('p', 'learning-eyebrow', words('EYEBROW')));
  var title = ArkUI.el('h1', 'learning-heading', words('TITLE')); title.id = id + '-title';
  content.appendChild(title);
  content.appendChild(ArkUI.el('p', 'concept-deck', words('DECK')));
  var list = ArkUI.el('div', 'concept-principles');
  for (var n = 1; n <= ArkManifest.points(manifest); n++) {
    var row = ArkUI.el('section'), body = ArkUI.el('div');
    row.appendChild(ArkUI.el('span', '', ('0' + n).slice(-2)));
    body.appendChild(ArkUI.el('h2', '', words('POINT' + n + '.TITLE')));
    body.appendChild(ArkUI.el('p', '', words('POINT' + n + '.TEXT')));
    row.appendChild(body); list.appendChild(row);
  }
  if (manifest.group === 'theory' || manifest.fields['STATUS.TEXT']) {
    var contextLayer = ArkUI.el('details', 'content-layer content-layer-context');
    contextLayer.appendChild(ArkUI.el('summary', '', 'Context / inspect how it works'));
    contextLayer.appendChild(list); content.appendChild(contextLayer);
  } else content.appendChild(list);
  if (manifest.fields['STATUS.TEXT']) {
    var status = ArkUI.el('aside', 'mechanism-status-summary');
    status.setAttribute('aria-label', 'Current status');
    status.appendChild(ArkUI.el('h2', '', words('STATUS.TITLE')));
    status.appendChild(ArkUI.el('p', '', words('STATUS.TEXT')));
    content.appendChild(status);
  }
  if (manifest.fields['LIMIT.TEXT'] || (manifest.meta.docs && manifest.fields.EVIDENCE)) {
    var referenceLayer = ArkUI.el('details', 'content-layer content-layer-reference');
    referenceLayer.appendChild(ArkUI.el('summary', '', 'Reference / limits and evidence'));
    if (manifest.fields['LIMIT.TEXT']) {
      var limit = ArkUI.el('section', 'mechanism-limit');
      limit.appendChild(ArkUI.el('h2', '', words('LIMIT.TITLE')));
      limit.appendChild(ArkUI.el('p', '', words('LIMIT.TEXT')));
      referenceLayer.appendChild(limit);
    }
    if (manifest.meta.docs && manifest.fields.EVIDENCE) {
      var docs = ArkUI.el('a', 'article-back theory-evidence-link');
      docs.href = manifest.meta.docs;
      docs.appendChild(document.createTextNode(words('EVIDENCE') + ' '));
      var docsArrow = ArkUI.el('span', 'cta-arrow', '↗'); docsArrow.setAttribute('aria-hidden', 'true');
      docs.appendChild(docsArrow); referenceLayer.appendChild(docs);
    }
    content.appendChild(referenceLayer);
  }
  var footer = ArkUI.el('nav', 'theory-footer'); footer.setAttribute('aria-label', 'Continue');
  if (manifest.meta.next) footer.appendChild(link('NEXT', manifest.meta.next, 'article-back theory-cta'));
  if (manifest.meta.back) footer.appendChild(link('BACK', manifest.meta.back));
  content.appendChild(footer);
  el.appendChild(content);
  return el;
};

/* A question keeps one answer surface, an essential boundary, and its return.
   Diagram nodes express source relationships; they are never live telemetry. */
ArkUI.storySheet = function(id,page) {
  var manifest=ArkManifest.get(id), area=id.toUpperCase();
  function words(role){return ArkCopy.text(area+'.'+role);}
  function link(label,key,cls){var a=ArkUI.el('a',cls||'',label);a.href='#'+ArkUI.pageCatalog[key].path;a.dataset.sceneLink=key;return a;}
  var el=ArkUI.el('section','ark-page guided-page mechanism-story '+id+'-page');el.dataset.arkPage=page;
  var path=ArkUI.el('nav','content-layer-path');path.setAttribute('aria-label','Your place');var parentLink=link(id==='about'?'← Home':'← Operating model',id==='about'?'zero':'concept');if(manifest.meta.placement==='rail'){parentLink.dataset.routeQuery='view=more';parentLink.href+='?view=more';}path.appendChild(parentLink);path.appendChild(ArkUI.el('span','','Question / '+manifest.title));el.appendChild(path);
  var title=ArkUI.el('h1','',words('TITLE'));title.id=id+'-title';el.setAttribute('aria-labelledby',title.id);el.appendChild(title);
  var controls=ArkUI.el('nav','story-depth');controls.setAttribute('aria-label','Explanation depth');var buttons=[];
  ['The core idea','How it works','Evidence & limits'].forEach(function(label,i){var b=ArkUI.el('button','',label);b.type='button';b.dataset.icon=['overview','layers','evidence'][i];b.addEventListener('click',function(){select(i,0,true);});buttons.push(b);controls.appendChild(b);});el.appendChild(controls);
  var body=ArkUI.el('div','guided-body'), copy=ArkUI.el('div','guided-answer');copy.setAttribute('aria-live','polite');var left=ArkUI.el('div','guided-left');left.appendChild(copy);body.appendChild(left);
  var diagram=ArkUI.el('figure','guided-diagram mechanism-relationship');diagram.appendChild(ArkUI.el('figcaption','','Illustration / '+manifest.title+' relationships'));
  var labels={about:['Directory / named presence','Fabric / linked agreements','Governance / bounded authority'],purpose:['Network A / miner presence','Network B / miner presence','Shared accounts / outside this isolation'],depth:['Intent','Offer','Agreement','Fulfillment','Receipt'],practice:['Object + applicable policy','Bounded authority cell','Threshold evidence','Cell dissolves'],dao:['Mesh policy / substrate','Network policy / own network','Approval ≠ activation'],notes:['Approval / signed consent','Readiness + safety gates','Activation / separate evidence'],studio:['Named network ID','Source revision','Dated observation','Evidence + isolation boundary'],spec:['Workload + method','Raw results / missing','Digest + conditions','Conclusion / Unverified']}[id]||[];
  var drafting=ArkUI.createStoryDiagram&&ArkUI.createStoryDiagram(id);if(drafting)diagram.appendChild(drafting.element);
  labels.forEach(function(label,i){var record=ArkUI.el('button','story-record',label);record.type='button';record.dataset.diagramNumber=String(i+1).padStart(2,'0');record.addEventListener('click',function(){select(1,Math.min(i,count-1),true);});diagram.appendChild(record);});body.appendChild(diagram);el.appendChild(body);
  // Status remains readable in every depth; a code alone cannot state a limit.
  var status=ArkUI.el('aside','lifecycle-boundary mechanism-status-summary');status.setAttribute('aria-label','Current status');status.appendChild(ArkUI.el('strong','',id==='about'?'Current source boundary':words('STATUS.TITLE')));status.appendChild(ArkUI.el('p','',id==='about'?words('POINT4.TEXT'):words('STATUS.TEXT')));left.appendChild(status);
  var footer=ArkUI.el('nav','lifecycle-next');footer.setAttribute('aria-label','Continue');
  if(manifest.meta.next)footer.appendChild(link(words('NEXT')+' →',manifest.meta.next,'story-primary'));else if(id==='dao')footer.appendChild(link('Inspect activation gates →','concept/notes','story-primary'));el.appendChild(footer);
  var count=ArkManifest.points(manifest), selectedDepth=0,selectedStep=0;
  function select(depth,step,write){
    selectedDepth=depth;selectedStep=step;el.dataset.readingLayer=['focus','context','reference'][depth];
    buttons.forEach(function(b,i){b.setAttribute('aria-pressed',String(i===depth));});copy.replaceChildren();
    if(depth===0)copy.appendChild(ArkUI.el('p','guided-primary-answer',words('DECK')));
    else if(depth===1){
      var picker=ArkUI.el('nav','guided-step-picker');picker.setAttribute('aria-label',manifest.title+' questions');
      for(var i=0;i<count;i++)(function(index){var b=ArkUI.el('button','',words('POINT'+(index+1)+'.TITLE'));b.type='button';b.setAttribute('aria-pressed',String(index===step));b.addEventListener('click',function(){select(1,index,true);});picker.appendChild(b);})(i);
      copy.appendChild(picker);var answer=ArkUI.el('section','mechanism-inner-answer');answer.appendChild(ArkUI.el('h2','',words('POINT'+(step+1)+'.TITLE')));answer.appendChild(ArkUI.el('p','',words('POINT'+(step+1)+'.TEXT')));copy.appendChild(answer);
    }else{
      if(manifest.fields['LIMIT.TEXT']){var limit=ArkUI.el('section','content-layer-reference');limit.appendChild(ArkUI.el('h2','',words('LIMIT.TITLE')));limit.appendChild(ArkUI.el('p','',words('LIMIT.TEXT')));copy.appendChild(limit);}
      var doc=ArkUI.el('a','story-reference',id==='about'?words('STATUS')+' ↗':words('EVIDENCE')+' ↗');doc.href=id==='about'?'docs/status.md':manifest.meta.docs;copy.appendChild(doc);
    }
    if(drafting)drafting.select(depth===1?step:0,write);
    diagram.querySelectorAll('.story-record').forEach(function(node,i){var selected=depth===1&&i===Math.min(step,labels.length-1);node.dataset.selected=String(selected);node.setAttribute('aria-pressed',String(selected));});
    if(ArkUI.decorateActionIcons)ArkUI.decorateActionIcons(copy);
    if(write)ArkUI.route.write(ArkUI.pageCatalog[page].path,(depth?'?view='+['focus','context','reference'][depth]+(depth===1?'&step='+step:''):'').replace(/^\?/,''),'push');
  }
  function restore(){if(ArkUI.route.path()!==ArkUI.pageCatalog[page].path)return;var q=new URLSearchParams(ArkUI.route.search()),v=q.get('view'),step=Math.max(0,Math.min(count-1,Number(q.get('step'))||0));select(v==='context'?1:v==='reference'?2:0,step,false);}
  el.addEventListener('keydown',function(event){if(event.key==='Escape'&&selectedDepth){event.preventDefault();event.stopPropagation();select(0,0,true);buttons[0].focus();}});
  select(0,0,false);restore();el.arkRestore=restore;window.addEventListener('popstate',restore);window.addEventListener('hashchange',restore);el.arkDispose=function(){if(drafting)drafting.dispose();window.removeEventListener('popstate',restore);window.removeEventListener('hashchange',restore);};return el;
};

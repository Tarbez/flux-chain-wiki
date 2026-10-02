/* A model entry states its question and boundaries before inviting interaction. */
ArkUI.register('REXPERIMENT_V1', {
 tag:'section',attrs:function(){return {class:'ark-page guided-page','data-ark-page':'proximity','aria-labelledby':'model-entry-title',hidden:'',inert:'','aria-hidden':'true'};},
 decorate:function(el){
  el.classList.remove('learning-page');el.classList.add('guided-page');
  function link(label,target,cls){var a=ArkUI.el('a',cls||'',label);a.href='#'+ArkUI.pageCatalog[target].path;a.dataset.sceneLink=target;return a;}
  var path=ArkUI.el('nav','content-layer-path');path.setAttribute('aria-label','Your place');path.appendChild(link('← Home','zero'));el.appendChild(path);
  var title=ArkUI.el('h1','','How can threshold agreement be pictured?');title.id='model-entry-title';el.appendChild(title);
  var body=ArkUI.el('div','guided-body');body.appendChild(ArkUI.el('p','','Bring independent groups closer together to explore a visual analogy for threshold evidence. Then inspect the actual authority contract.'));
  var diagram=ArkUI.el('figure','guided-diagram');diagram.appendChild(ArkUI.el('figcaption','','Illustration / independent inputs'));
  var drafting=ArkUI.createStoryDiagram&&ArkUI.createStoryDiagram('authority');if(drafting){diagram.appendChild(drafting.element);el.arkDispose=drafting.dispose;}
  ['Input A','Input B','Input C'].forEach(function(label){diagram.appendChild(ArkUI.el('div','story-record',label));});body.appendChild(diagram);el.appendChild(body);
  var boundary=ArkUI.el('aside','lifecycle-boundary');boundary.appendChild(ArkUI.el('strong','','Illustrative, not live network data.'));boundary.appendChild(ArkUI.el('p','','They do not represent real nodes, votes, or a ledger. The model does not calculate a roster, quorum, certificate, or transition.'));el.appendChild(boundary);
  var next=ArkUI.el('nav','lifecycle-next');next.setAttribute('aria-label','Continue');next.appendChild(link('Read the authority contract','concept/practice','story-reference'));next.appendChild(link('Explore the model →','lab','story-primary'));el.appendChild(next);
 }
});

/* Primary answer, requested explanation, and canonical evidence share a frame.
   Editable facts remain in manifests; the view does not fork their wording. */
ArkUI.pageModules.resolverGuide = {
  mount: function (host, page) {
    var manifest=ArkManifest.get(page), area=page.toUpperCase();
    function words(role){return ArkCopy.text(area+'.'+role);}
    function link(label,key,cls){var a=ArkUI.el('a',cls||'',label);a.href='#'+ArkUI.pageCatalog[key].path;a.dataset.sceneLink=key;return a;}
    if(page==='resolver'){
      // Four addressable steps beside a working illustration: js/pages/resolver-lab.js.
      var lab=ArkUI.buildResolverLab({page:page,words:words,link:link});
      host.appendChild(lab);if(ArkUI.decorateActionIcons)ArkUI.decorateActionIcons(lab);return lab;
    }
    var el=ArkUI.el('section','ark-page guided-page');el.dataset.arkPage=page;
    var path=ArkUI.el('nav','content-layer-path');path.setAttribute('aria-label','Your place');path.appendChild(link('← Home','zero'));var currentPage=ArkUI.el('span','',manifest.title);currentPage.setAttribute('aria-current','page');path.appendChild(currentPage);el.appendChild(path);
    el.appendChild(ArkUI.el('p','story-kicker',words('EYEBROW')));
    var title=ArkUI.el('h1','',words('TITLE'));title.id=page+'-title';el.setAttribute('aria-labelledby',title.id);el.appendChild(title);
    var depths=ArkUI.el('nav','story-depth');depths.setAttribute('aria-label','Explanation depth');var buttons=[];
    ['Answer','Understand why','Evidence'].forEach(function(label,i){var b=ArkUI.el('button','',label);b.type='button';b.dataset.icon=['overview','layers','evidence'][i];b.addEventListener('click',function(){select(i,0,true);});buttons.push(b);depths.appendChild(b);});el.appendChild(depths);
    var body=ArkUI.el('div','guided-body'), copy=ArkUI.el('div','guided-answer');copy.setAttribute('aria-live','polite');var left=ArkUI.el('div','guided-left');left.appendChild(copy);body.appendChild(left);
    var diagram=ArkUI.el('figure','guided-diagram');diagram.appendChild(ArkUI.el('figcaption','','Illustration / relationships, not live progress'));
    var labels=page==='deployment'?['Network + resolver','Signed agreement trail','Policy-bound receipt']:page==='resolver'?['Defined input','Addressed logic','Defined claim']:['Reference name','Source artifact','Dated observation'];
    var drafting=ArkUI.createStoryDiagram&&ArkUI.createStoryDiagram(page);if(drafting)diagram.appendChild(drafting.element);
    labels.forEach(function(label,i){var record=ArkUI.el('div','story-record',label);record.dataset.diagramNumber=String(i+1).padStart(2,'0');diagram.appendChild(record);});body.appendChild(diagram);el.appendChild(body);
    var boundary=ArkUI.el('aside','lifecycle-boundary');boundary.appendChild(ArkUI.el('strong','','Essential boundary'));
    boundary.appendChild(ArkUI.el('p','',page==='resolver'?words('BODY3'):page==='references'?words('BODY2'):words('BOUNDARY')));left.appendChild(boundary);
    var footer=ArkUI.el('nav','lifecycle-next');footer.setAttribute('aria-label','Continue');
    if(manifest.meta.back)footer.appendChild(link(words('BACK'),manifest.meta.back));
    if(manifest.meta.next)footer.appendChild(link(words('NEXT')+' →',manifest.meta.next,'story-primary'));el.appendChild(footer);
    function select(depth,step,write){
      buttons.forEach(function(b,i){b.setAttribute('aria-pressed',String(i===depth));});copy.replaceChildren();
      el.dataset.depth=['focus','context','reference'][depth];
      if(depth===0)copy.appendChild(ArkUI.el('p','guided-primary-answer',page==='deployment'?words('SUMMARY'):words('BODY1')));
      else if(depth===1){
        if(page==='deployment'){
          var picker=ArkUI.el('nav','guided-step-picker');picker.setAttribute('aria-label','Protocol movement');
          ['Network','Logic','Intent','Fulfillment','Receipt'].forEach(function(label,i){var b=ArkUI.el('button','',String(i+1)+' / '+label);b.type='button';b.setAttribute('aria-pressed',String(i===step));b.addEventListener('click',function(){select(1,i,true);});picker.appendChild(b);});copy.appendChild(picker);copy.appendChild(ArkUI.el('p','',words('BODY'+(step+1))));
        }else copy.appendChild(ArkUI.el('p','',words(page==='resolver'?'BODY2':'BODY3')));
      }else{
        var doc=page==='resolver'?'docs/protocol/resolvers.md':page==='references'?'docs/evidence/registry.md':'docs/protocol/agreements.md';
        var source=ArkUI.el('a','story-reference','Read the canonical '+(page==='references'?'evidence registry':'guide')+' ↗');source.href=doc;copy.appendChild(source);
        if(page==='resolver')copy.appendChild(link('Inspect reference evidence →','references','story-reference'));
        copy.appendChild(ArkUI.el('p','',page==='references'?words('BODY3'):'The source defines the contract. An illustration does not establish active capacity, accepted work, or production readiness.'));
      }
      if(drafting)drafting.select(depth===1?(page==='deployment'?[0,0,1,1,2][step]:step):0,write);
      diagram.querySelectorAll('.story-record').forEach(function(record,i){record.dataset.selected=String(depth===1&&i===(page==='deployment'?[0,0,1,1,2][step]:step));});
      if(ArkUI.decorateActionIcons)ArkUI.decorateActionIcons(copy);
      if(write){var query=depth?'?view='+['focus','context','reference'][depth]+(page==='deployment'&&depth===1?'&step='+step:''):'';ArkUI.route.write(ArkUI.pageCatalog[page].path,query.replace(/^\?/,''),'push');}
    }
    function restore(){if(ArkUI.route.path()!==ArkUI.pageCatalog[page].path)return;var q=new URLSearchParams(ArkUI.route.search()),value=q.get('view'),step=Math.max(0,Math.min(4,Number(q.get('step'))||0));select(value==='context'?1:value==='reference'?2:0,step,false);}
    select(0,0,false);restore();el.arkRestore=restore;window.addEventListener('popstate',restore);window.addEventListener('hashchange',restore);
    el.arkDispose=function(){if(drafting)drafting.dispose();window.removeEventListener('popstate',restore);window.removeEventListener('hashchange',restore);};host.appendChild(el);return el;
  }
};

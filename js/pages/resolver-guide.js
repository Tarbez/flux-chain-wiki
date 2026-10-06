/* Primary answer, requested explanation, and canonical evidence share a frame.
   Editable facts remain in manifests; the view does not fork their wording. */
ArkUI.pageModules.resolverGuide = {
  mount: function (host, page) {
    var manifest=ArkManifest.get(page), area=page.toUpperCase();
    function words(role){return ArkCopy.text(area+'.'+role);}
    function link(label,key,cls){var a=ArkUI.el('a',cls||'',label);a.href='#'+ArkUI.pageCatalog[key].path;a.dataset.sceneLink=key;return a;}
    if(page==='resolver'){
      var resolver=ArkUI.el('section','ark-page guided-page resolver-story');resolver.dataset.arkPage=page;resolver.setAttribute('aria-labelledby','resolver-story-title');
      var resolverPath=ArkUI.el('nav','content-layer-path resolver-story-path');resolverPath.setAttribute('aria-label','Your place');resolverPath.appendChild(link(words('BACK'),'zero'));var resolverCurrent=ArkUI.el('span','','Resolver');resolverCurrent.setAttribute('aria-current','page');resolverPath.appendChild(resolverCurrent);resolver.appendChild(resolverPath);

      var resolverCopy=ArkUI.el('div','resolver-story-copy');
      resolverCopy.appendChild(ArkUI.el('p','resolver-story-kicker',words('EYEBROW')));
      var resolverTitle=ArkUI.el('h1','',words('DISPLAY.TITLE'));resolverTitle.id='resolver-story-title';resolverCopy.appendChild(resolverTitle);
      resolverCopy.appendChild(ArkUI.el('p','resolver-story-lede',words('DISPLAY.LEDE')));
      var resolverActions=ArkUI.el('div','resolver-story-actions');
      resolverActions.appendChild(link(words('NEXT')+' →',manifest.meta.next,'resolver-story-primary'));
      var resolverSource=ArkUI.el('a','resolver-story-source',words('SOURCE')+' ↗');resolverSource.href='docs/protocol/resolvers.md';resolverActions.appendChild(resolverSource);resolverCopy.appendChild(resolverActions);
      resolver.appendChild(resolverCopy);

      var signal=ArkUI.el('figure','resolver-signal');signal.setAttribute('aria-labelledby','resolver-signal-caption');
      var signalHead=ArkUI.el('div','resolver-signal-head');var signalCaption=ArkUI.el('figcaption','',words('FLOW.LABEL'));signalCaption.id='resolver-signal-caption';signalHead.appendChild(signalCaption);signalHead.appendChild(ArkUI.el('span','','01 — 03'));signal.appendChild(signalHead);
      var track=ArkUI.el('div','resolver-signal-track');track.setAttribute('aria-hidden','true');
      ['input','logic','claim'].forEach(function(kind,i){var node=ArkUI.el('span','resolver-signal-node resolver-signal-node-'+kind);node.dataset.step=String(i+1).padStart(2,'0');track.appendChild(node);});signal.appendChild(track);
      var steps=ArkUI.el('ol','resolver-signal-steps');
      [['INPUT','INPUT.TEXT'],['LOGIC','LOGIC.TEXT'],['CLAIM','CLAIM.TEXT']].forEach(function(pair,i){var item=ArkUI.el('li','');item.dataset.step=String(i+1).padStart(2,'0');item.appendChild(ArkUI.el('strong','',words(pair[0])));item.appendChild(ArkUI.el('span','',words(pair[1])));steps.appendChild(item);});signal.appendChild(steps);resolver.appendChild(signal);

      var insight=ArkUI.el('aside','resolver-story-insight');insight.appendChild(ArkUI.el('span','',words('WHY.LABEL')));insight.appendChild(ArkUI.el('p','',words('WHY')));resolver.appendChild(insight);
      var trust=ArkUI.el('aside','resolver-story-trust');trust.appendChild(ArkUI.el('span','',words('BOUNDARY.LABEL')));trust.appendChild(ArkUI.el('p','',words('BOUNDARY')));resolver.appendChild(trust);
      host.appendChild(resolver);return resolver;
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

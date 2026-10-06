ArkUI.pageModules.zero = {
  mount: function (host) {
    function pageHref(key) { return '#' + ArkUI.pageCatalog[key].path; }
    var el = ArkUI.render([
      'F-HOME-RLAYER_V1', '-N-zero',
      '. F-BODY-RBODY_V1',
      '  -E-HOME.EYEBROW', '  -H-HOME.TITLE', '  -T-HOME.INTRO',
      '  -S-1.42', '  .', '.'
    ].join('\n'), host);
    el.classList.add('ark-page'); el.dataset.arkPage = 'zero';
    var body = el.querySelector('.ark-hero-body');
    var heading = body.querySelector('.ark-hero-title');
    var headline = ArkCopy.text('HOME.TITLE');
    if (heading) {
      heading.textContent = '';
      var mainLine = document.createElement('span');
      mainLine.className = 'home-headline-main';
      var lead=document.createElement('span');lead.className='home-headline-lead';lead.textContent='What if agreement';
      var pivot=document.createElement('span');pivot.className='home-headline-pivot';pivot.textContent="didn't need";
      var reveal=document.createElement('span');reveal.className='home-headline-network';reveal.textContent='a global chain?';
      mainLine.appendChild(lead);mainLine.appendChild(pivot);mainLine.appendChild(reveal);
      heading.appendChild(mainLine);
      heading.setAttribute('aria-label', headline);
    }
    var promise = document.createElement('p');
    promise.className = 'home-promise';
    promise.textContent = ArkCopy.text('HOME.PROMISE');
    body.insertBefore(promise, body.firstChild);
    var actions = document.createElement('div');
    actions.className = 'home-hero-actions';
    function actionCopy(link, kicker, label) {
      var copy = document.createElement('span'); copy.className = 'home-cta-copy';
      var meta = document.createElement('small'); meta.className = 'home-cta-kicker'; meta.textContent = kicker;
      var text = document.createElement('strong'); text.className = 'home-cta-label'; text.textContent = label;
      copy.appendChild(meta); copy.appendChild(text); link.appendChild(copy);
    }
    var primary = document.createElement('a');
    primary.className = 'home-primary-cta';
    primary.href = pageHref('deployment'); primary.dataset.sceneLink = 'deployment';
    primary.setAttribute('aria-label', ArkCopy.text('HOME.CTA'));
    actionCopy(primary, 'Interactive walkthrough', ArkCopy.text('HOME.CTA'));
    actions.appendChild(primary);
    var secondary = document.createElement('a');
    secondary.className = 'home-ghost-cta';
    secondary.href = pageHref('download'); secondary.dataset.sceneLink = 'download';
    secondary.setAttribute('aria-label', ArkCopy.text('HOME.SECONDARY'));
    actionCopy(secondary, 'Build it yourself', ArkCopy.text('HOME.SECONDARY'));
    actions.appendChild(secondary);
    var questions = document.createElement('nav');
    questions.className = 'home-question-links';
    questions.setAttribute('aria-label', 'Learn about DEFXN');
    [['HOME.QUESTION.RESOLVER', 'resolver']].forEach(function (item) {
      var link = document.createElement('a');
      link.href = pageHref(item[1]); link.dataset.sceneLink = item[1];
      link.textContent = ArkCopy.text(item[0]);
      questions.appendChild(link);
    });
    actions.appendChild(questions);
    body.appendChild(actions);

    var lifecycle = document.createElement('nav');
    lifecycle.className = 'home-lifecycle';
    lifecycle.setAttribute('aria-label', 'The agreement lifecycle');
    var caption = document.createElement('p'); caption.className = 'home-lifecycle-caption';
    caption.textContent = '01 / The agreement fabric'; lifecycle.appendChild(caption);
    var title = document.createElement('strong'); title.className = 'home-cycle-title';
    title.textContent = 'Every step leaves a trace.'; lifecycle.appendChild(title);
    var description=document.createElement('p');description.className='home-cycle-description';description.textContent='One request. Linked terms, work, and verification.';lifecycle.appendChild(description);
    var windowEl=document.createElement('div');windowEl.className='home-substrate-window';windowEl.setAttribute('aria-hidden','true');
    windowEl.innerHTML='<span class="home-window-label">Shared substrate / one connected trail</span><span class="home-window-bracket"></span>';lifecycle.appendChild(windowEl);
    var drawing=document.createElement('div');drawing.className='home-cycle-drawing';drawing.setAttribute('aria-hidden','true');
    var svgNS='http://www.w3.org/2000/svg';
    function vector(tag,attrs,text){var node=document.createElementNS(svgNS,tag);Object.keys(attrs).forEach(function(key){node.setAttribute(key,attrs[key]);});if(text)node.textContent=text;return node;}
    var svg=vector('svg',{viewBox:'0 0 480 120',fill:'none'});
    // A request emerges from the substrate and accumulates linked records.
    var trail='M240 0v12q0 8-8 8H56q-8 0-8 8v38h384';
    svg.appendChild(vector('path',{d:trail,class:'home-record-connector'}));
    [48,144,240,336,432].forEach(function(x,i){
      var stage=ArkUI.lifecycleStages[i];
      var record=vector('g',{class:'home-record','data-record':stage.id});
      record.appendChild(vector('rect',{x:x-19,y:47,width:38,height:38,rx:7,class:'home-record-node'}));
      record.appendChild(vector('text',{x:x,y:70,'text-anchor':'middle',class:'home-record-number'},String(i+1).padStart(2,'0')));
      svg.appendChild(record);
      if(i>0)svg.appendChild(vector('path',{d:'M'+(x-77)+' 66h58',class:'home-record-incoming','data-record':stage.id,pathLength:'1'}));
      if(i<4)svg.appendChild(vector('path',{d:'M'+(x+48-3)+' 63l3 3-3 3',class:'home-record-direction'}));
    });
    drawing.appendChild(svg);lifecycle.appendChild(drawing);
    var rail = document.createElement('ol'); rail.className = 'home-cycle-records';
    var contributions=[
      'Intent defines what is being requested.',
      'Offer proposes terms for the request.',
      'Agreement links the accepted terms.',
      'Fulfillment records the work and its result.',
      'Receipt records the verification outcome.'
    ];
    ArkUI.lifecycleStages.forEach(function (stage, i) {
      var item = document.createElement('li');
      var link = document.createElement('a');link.className='home-cycle-step';link.dataset.stage=stage.id;
      link.href=pageHref('lifecycle/'+stage.id);link.dataset.sceneLink='lifecycle/'+stage.id;
      link.textContent=stage.title;link.setAttribute('aria-label','Explore '+stage.title+': '+contributions[i]);
      item.appendChild(link);rail.appendChild(item);
    }); lifecycle.appendChild(rail);
    var insight=document.createElement('p');insight.className='home-cycle-insight';insight.setAttribute('aria-hidden','true');
    var idle=document.createElement('span');idle.className='home-cycle-insight-idle';idle.textContent='Select a step to see what it records.';insight.appendChild(idle);
    ArkUI.lifecycleStages.forEach(function(stage,i){var text=document.createElement('span');text.dataset.insight=stage.id;text.textContent=contributions[i];insight.appendChild(text);});
    lifecycle.appendChild(insight);
    var open = document.createElement('a'); open.className = 'home-lifecycle-all';
    open.href = pageHref('lifecycle'); open.dataset.sceneLink = 'lifecycle';open.dataset.icon='arrow-right';
    open.textContent = 'Trace one agreement, end to end →'; lifecycle.appendChild(open);
    el.appendChild(lifecycle);

    var status = document.createElement('aside');
    status.className = 'home-status-rail';
    status.setAttribute('aria-label', 'Protocol status');
    for (var s = 1; s <= 4; s++) {
      var item = [ArkCopy.text('HOME.STATUS' + s + '.LABEL'), ArkCopy.text('HOME.STATUS' + s + '.VALUE')];
      var readout = document.createElement('span');
      readout.className = 'home-status-item';
      var label = document.createElement('small');
      label.textContent = item[0];
      var value = document.createElement('strong');
      value.textContent = item[1];
      readout.appendChild(label);
      readout.appendChild(value);
      status.appendChild(readout);
    }
    var statusLink = document.createElement('a');
    statusLink.className = 'home-status-link';
    statusLink.href = 'docs/status.md';
    statusLink.textContent = ArkCopy.text('HOME.STATUS.NOTE') + ' ↗';
    status.appendChild(statusLink);
    el.insertBefore(status, lifecycle);

    // The original dense canvas field stays alive, cropped to the chosen panel.
    // Its artwork cannot take focus or imply a verified live observation.
    var scene=el.closest&&el.closest('.hero-alive'),observer=null,alignFrame=0,disposed=false,lastMeshBounds=null;
    function alignMesh(){
      if(disposed)return;
      var currentWindow=el.querySelector('.home-substrate-window');
      if(!scene||!currentWindow||!currentWindow.getBoundingClientRect)return;
      var target=currentWindow.getBoundingClientRect(),base=scene.getBoundingClientRect();
      if(!target.width||!target.height)return;
      var bounds=[target.left-base.left,target.top-base.top,target.width,target.height];
      if(lastMeshBounds&&bounds.every(function(value,index){return value===lastMeshBounds[index];}))return;
      lastMeshBounds=bounds;
      scene.style.setProperty('--home-mesh-left',bounds[0]+'px');
      scene.style.setProperty('--home-mesh-top',(target.top-base.top)+'px');
      scene.style.setProperty('--home-mesh-width',target.width+'px');
      scene.style.setProperty('--home-mesh-height',target.height+'px');
    }
    if(typeof ResizeObserver!=='undefined'&&scene){observer=new ResizeObserver(alignMesh);observer.observe(el);observer.observe(lifecycle);observer.observe(windowEl);}
    el.arkRestore=alignMesh;
    if(typeof requestAnimationFrame==='function')alignFrame=requestAnimationFrame(function(){alignFrame=0;alignMesh();});
    el.arkDispose=function(){disposed=true;if(observer)observer.disconnect();if(alignFrame&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(alignFrame);};
    return el;
  }
};

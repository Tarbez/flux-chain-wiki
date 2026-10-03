/* Shared local fabric: finite responses on the existing cells, never an idle loop. */
(function(){
 'use strict';
 ArkUI.createMeshFabric=function(canvas,options){
  options=options||{};
  var stories={
   ask:["The job starts with you.","Your request travels to a provider.","The provider receives the job and its rules."],
   goal:["Name what a good result looks like.","The target takes shape.","This is the result the work must aim for."],
   limits:["Start with the job.","Add the boundaries around it.","The work must stay inside these limits."],
   request:["You describe the job.","Your request reaches the shared meeting point.","The provider can reply to this request."],
   proposal:["The provider prepares an offer.","Their offer comes back to meet your request.","You can compare the offer with what you asked for."],
   promise:["Start with the accepted promise.","Its rules are laid out one by one.","These rules are the reference for checking the result."],
   result:["The provider returns the work.","The result and its supporting pieces assemble.","The returned package is ready to be checked."],
   decision:["Keep the promise in place.","Compare the returned work with each rule.","Record the outcome beside the checked rules."],
   work:["You and the provider start on separate sides.","Both sides meet around the same job.","One shared promise links the request and offer."],
   check:["Begin with the returned package.","Check each part against the agreed rules.","A trail remains showing what was checked."],
   offer:["Start with the request.","The provider adds their proposed terms.","A reply is ready for you to consider."]
  };
  var storyLabels={ask:["YOUR REQUEST","PROVIDER"],goal:["THE JOB","DESIRED RESULT"],limits:["JOB + RULES","BOUNDARIES"],request:["YOUR REQUEST","MEETING POINT"],proposal:["MEETING POINT","THEIR OFFER"],promise:["ACCEPTED RULES","REFERENCE"],result:["RETURNED WORK","SUPPORTING PIECES"],decision:["RULES + WORK","RECORDED OUTCOME"],work:["YOUR REQUEST","THEIR OFFER"],check:["RETURNED PACKAGE","CHECKED TRAIL"],offer:["REQUEST","PROPOSED TERMS"]};
  var revision=0,frame=0,disposed=false,selected='receipt',previous='receipt',start=0,last=-Infinity,cells=[],width=0,height=0,scale=1,colors={},paused=false,cellWidth=16,cellHeight=12,gap=1;
  var reduce=window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):null;
  function stop(){revision++;if(frame)window.cancelAnimationFrame(frame);frame=0;}
  function ink(style,name,alpha){return 'hsl('+style.getPropertyValue('--'+name).trim()+' / '+alpha+')';}
  function measure(){
   if(disposed||!canvas.getContext||!canvas.getBoundingClientRect)return false;
   var box=canvas.getBoundingClientRect();if(!box.width||!box.height)return false;
   width=Math.round(box.width);height=Math.round(box.height);scale=Math.min(window.devicePixelRatio||1,1.5);
   if(canvas.width!==Math.round(width*scale))canvas.width=Math.round(width*scale);
   if(canvas.height!==Math.round(height*scale))canvas.height=Math.round(height*scale);
   var style=getComputedStyle(document.documentElement);
   var role=options.background?'text-muted':'primary';
   colors={line:ink(style,'text-strong',.09),block:ink(style,'text-strong',.13),quiet:ink(style,'text-strong',.025),label:ink(style,'text-muted',.4),storyLabel:ink(style,'text-strong',.75),primary:style.getPropertyValue('--'+role).trim()||style.getPropertyValue('--primary').trim()};
   cellWidth=options.background?16*(options.patternScale||100)/100:16;cellHeight=cellWidth*.75;gap=options.background?1+(100-(options.density||60))/25:1;
   var cols=Math.ceil(width/cellWidth),rows=Math.ceil(height/cellHeight);cells=[];
   for(var r=0;r<rows;r++)for(var c=0;c<cols;c++)cells.push({col:c,row:r,x:(c+.5)/cols,y:(r+.5)/rows,order:(r*cols+c)/(rows*cols),hash:(c*37+r*53+c*r*7)%41});
   return true;
  }
  function level(stage,p,cell){
   if(options.background){var structure=typeof options.structure==='number'?options.structure/100:.5;if(stage==='mesh-nodes'){var step=6+Math.round(structure*6),cx=cell.col%step,cy=cell.row%step;return cx<2&&cy<2?.55:cx===0||cy===0?.14:0;}
    if(stage==='mesh-routes'){var pitch=5+Math.round(structure*7),route=(Math.floor(cell.col/pitch)%2===0?cell.col:-cell.col);return (cell.row+route+pitch*100)%pitch===0?.45:cell.row%pitch===0&&cell.col%pitch===0?.65:0;}
    if(stage==='mesh-tiles'){var tile=3+Math.round(structure*5);return (Math.floor(cell.col/tile)+Math.floor(cell.row/tile))%2===0&&cell.col%tile<tile-1&&cell.row%tile<tile-1?.24:0;}
    if(stage==='mesh-frames'){var size=7+Math.round(structure*7),xx=cell.col%size,yy=cell.row%size;return xx===1&&yy>0&&yy<size-1||yy===1&&xx>0&&xx<size-1||xx===size-2&&yy>0&&yy<size-1||yy===size-2&&xx>0&&xx<size-1?.35:0;}
    if(stage==='network')return cell.x>.12&&cell.x<.25+structure*.35&&cell.y>.18&&cell.y<.82&&cell.order<p?.38:0;if(stage==='logic'){var steps=2+Math.round(structure*6);return Math.abs(cell.y-(.18+Math.floor(cell.x*steps)*.6/steps))<.05&&cell.x<p?.48:0;}if(stage==='story-check')return cell.x>.08&&cell.x<.92&&cell.y>.16&&cell.y<.84&&cell.row%(2+Math.round(structure*4))===0?.4:0;}

   // Story-specific choreography: a request travels, two commitments meet,
   // and a checking sweep leaves an ordered reference trail.
   if(stage==='story-goal'){
    var radius=Math.max(Math.abs(cell.x-.76),Math.abs(cell.y-.5));
    return radius<.06+p*.17?(Math.abs(radius-(.06+p*.17))<.045?.7:(cell.col+cell.row)%2===0?.3:0):0;
   }
   if(stage==='story-limits'){
    var edges=Math.abs(cell.x-.18)<.045||Math.abs(cell.x-.82)<.045;
    var rails=Math.abs(cell.y-.2)<.06||Math.abs(cell.y-.8)<.06;
    return cell.order<p&&((edges&&cell.y>.15&&cell.y<.85)||(rails&&cell.x>.18&&cell.x<.82))?.55:0;
   }
   if(stage==='story-request'){
    var front=.12+p*.38;
    return cell.x>.12&&cell.x<front&&cell.y>.24&&cell.y<.76?(Math.abs(cell.x-front)<.05?.75:cell.row%2===0?.36:0):0;
   }
   if(stage==='story-proposal'){
    var front=.88-p*.38;
    return cell.x<.88&&cell.x>front&&(Math.abs(cell.y-.32)<.09||Math.abs(cell.y-.68)<.09)?(Math.abs(cell.x-front)<.05?.75:.42):0;
   }
   if(stage==='story-promise'){
    var side=(Math.abs(cell.x-.12)<.045||Math.abs(cell.x-.88)<.045)&&cell.y>.2&&cell.y<.8;
    var rule=cell.row%4===1&&cell.y>.2&&cell.y<.8&&cell.x>.12&&cell.x<.12+p*.76;
    return side?.27:rule?.5:0;
   }
   if(stage==='story-decision'){
    var row=cell.row%3===0&&cell.y>.2&&cell.y<.8;
    var rule=row&&cell.x>.2&&cell.x<.48;
    var matched=row&&cell.x>.52&&cell.x<.8&&cell.y<.2+Math.max(0,(p-.25)/.5)*.6;
    var record=row&&cell.x>.84&&cell.x<.92&&cell.y<.2+Math.max(0,(p-.7)/.3)*.6;
    return record?.8:matched?.55:rule?.28:0;
   }
   if(stage==='story-ask'){
    var path=Math.abs(cell.y-.5)<.06&&cell.x>.12&&cell.x<.15+p*.7;
    var origin=Math.abs(cell.x-.15)<.07&&Math.abs(cell.y-.5)<.18;
    var arrival=p>.75&&Math.abs(cell.x-.82)<.06&&Math.abs(cell.y-.5)<.18;
    return origin?.38:arrival?.55:path?(Math.abs(cell.x-(.15+p*.7))<.06?.8:.25):0;
   }
   if(stage==='story-work'){
    var gap=(1-p)*.24;
    var left=cell.x>.12+gap&&cell.x<.47&&Math.abs(cell.y-.5)<.23;
    var right=cell.x>.53&&cell.x<.88-gap&&Math.abs(cell.y-.5)<.23;
    var seam=p>.6&&Math.abs(cell.x-.5)<.07&&Math.abs(cell.y-.5)<.23;
    return seam?.75:left&&(cell.col+cell.row)%2===0?.36:right&&(cell.col+cell.row)%2===1?.36:0;
   }
   if(stage==='story-check'){
    var scan=Math.abs(cell.x-(.08+p*.84))<.04&&cell.y>.16&&cell.y<.84;
    var checked=cell.x<.08+p*.84&&cell.x>.08&&cell.y>.16&&cell.y<.84&&cell.row%3===0;
    return scan?.75:checked?.4:0;
   }
   if(stage==='story-offer')return cell.x>.1&&cell.x<.1+p*.75&&(Math.abs(cell.y-.3)<.06||Math.abs(cell.y-.7)<.06)?.5:0;
   if(stage==='story-result')return cell.order<p&&cell.x>.15&&cell.x<.85&&cell.y>.2&&cell.y<.8&&(cell.col+cell.row)%3===0?.5:0;

   if(stage==='mesh-nodes'){var step=6+Math.round(structure*6),cx=cell.col%step,cy=cell.row%step;return cx<2&&cy<2?.55:cx===0||cy===0?.14:0;}
    if(stage==='mesh-routes'){var pitch=5+Math.round(structure*7),route=(Math.floor(cell.col/pitch)%2===0?cell.col:-cell.col);return (cell.row+route+pitch*100)%pitch===0?.45:cell.row%pitch===0&&cell.col%pitch===0?.65:0;}
    if(stage==='mesh-tiles'){var tile=3+Math.round(structure*5);return (Math.floor(cell.col/tile)+Math.floor(cell.row/tile))%2===0&&cell.col%tile<tile-1&&cell.row%tile<tile-1?.24:0;}
    if(stage==='mesh-frames'){var size=7+Math.round(structure*7),xx=cell.col%size,yy=cell.row%size;return xx===1&&yy>0&&yy<size-1||yy===1&&xx>0&&xx<size-1||xx===size-2&&yy>0&&yy<size-1||yy===size-2&&xx>0&&xx<size-1?.35:0;}
    if(stage==='network')return cell.x>.12&&cell.x<.42&&cell.y>.18&&cell.y<.82&&cell.order<p?.38:0;
   if(stage==='logic')return Math.abs(cell.y-(.22+Math.floor(cell.x*4)*.14))<.07&&cell.x<p?.48:0;
   return ArkUI.agreementCellLevel?ArkUI.agreementCellLevel(stage,p,cell):0;
  }
  function paint(progress,motion){
   if(disposed||!canvas.getContext||!width)return;
   var ctx=canvas.getContext('2d');ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,width,height);ctx.font='500 5px ui-monospace,monospace';
   var names=['SNAPSHOT','INTENT','TERMS','OFFER','LINK','RESULT','CHECK','TRACE'];
   cells.forEach(function(cell){
    var x=cell.col*cellWidth,y=cell.row*cellHeight;
    ctx.fillStyle=cell.hash===0||cell.hash===3?colors.block:colors.quiet;ctx.fillRect(x+gap,y+gap,Math.max(1,cellWidth-gap*2),Math.max(1,cellHeight-gap*2));
    ctx.strokeStyle=colors.line;ctx.strokeRect(x+.5,y+.5,cellWidth,cellHeight);
    var strength=selected.indexOf('story-')===0?level(selected,progress,cell):level(previous,1,cell)*(1-progress)+level(selected,progress,cell)*progress;
    if(options.background&&typeof motion==='number'){var band=Math.max(0,1-Math.abs(cell.x-motion)/.1)*Math.sin(motion*Math.PI);strength+=band*.28;}
    if(strength&&cell.hash%5!==1){ctx.fillStyle='hsl('+colors.primary+' / '+strength+')';ctx.fillRect(x+gap,y+gap,Math.max(1,cellWidth-gap*2),Math.max(1,cellHeight-gap*2));}
    if(cell.row%3===1&&cell.col%4===1){ctx.fillStyle=colors.label;ctx.fillText(names[(cell.row+cell.col)%names.length],x+3,y+8,40);}
   });
   var key=selected.replace('story-',''),story=stories[key],labels=storyLabels[key];
   if(story&&options.caption){var sentence=story[progress<.3?0:progress<.78?1:2];if(options.caption.textContent!==sentence)options.caption.textContent=sentence;}
   if(labels&&!options.background){ctx.fillStyle=colors.storyLabel;ctx.font='500 9px ui-monospace,monospace';ctx.fillText(labels[0],8,12,width*.47);ctx.fillText(labels[1],width*.54,12,width*.44);}
   canvas.dataset.stage=selected;
  }
  function staticPaint(){stop();if(measure())paint(1);}
  function tick(now,ticket){
   if(disposed||ticket!==revision)return;frame=0;
   if(paused||document.hidden||reduce&&reduce.matches){paint(1);return;}
   if(start<0)start=now;
   var duration=selected==='story-work'?1600:selected.indexOf('story-')===0?1500:650;
   var p=Math.min(1,(now-start)/duration);
   if(now-last>=1000/30||p===1){paint(p);last=now;}
   if(p<1)frame=window.requestAnimationFrame(function(now){tick(now,ticket);});
  }
  function select(stage,animate,replay){
   if(disposed||animate&&!replay&&stage===selected&&width)return;
   var changed=stage!==selected||replay;previous=replay?'quiet':selected;selected=stage;canvas.dataset.stage=selected;stop();
   if(!measure())return;
   if(animate&&changed&&!paused&&!document.hidden&&!(reduce&&reduce.matches)&&window.requestAnimationFrame){start=-1;last=-Infinity;var ticket=revision;frame=window.requestAnimationFrame(function(now){tick(now,ticket);});}else paint(1);
  }
  function animateBackground(){
   if(!options.background||disposed||paused||document.hidden||reduce&&reduce.matches)return;
   stop();if(!measure())return;var ticket=revision,began=-1,lastPaint=-Infinity;
   function scan(now){if(disposed||ticket!==revision)return;frame=0;if(paused||document.hidden||reduce&&reduce.matches){paint(1);return;}if(began<0)began=now;var phase=Math.min(1,(now-began)/1800);if(now-lastPaint>=1000/30||phase===1){paint(1,phase);lastPaint=now;}if(phase<1)frame=window.requestAnimationFrame(scan);}
   frame=window.requestAnimationFrame(scan);
  }
  var resize=typeof ResizeObserver!=='undefined'?new ResizeObserver(staticPaint):null;if(resize)resize.observe(canvas);
  var theme=typeof MutationObserver!=='undefined'?new MutationObserver(staticPaint):null;if(theme)theme.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  function visibility(){if(document.hidden)stop();else staticPaint();}
  if(document.addEventListener)document.addEventListener('visibilitychange',visibility);
  if(reduce&&reduce.addEventListener)reduce.addEventListener('change',staticPaint);
  var unsubscribe=ArkUI.sceneState&&ArkUI.sceneState.subscribe?ArkUI.sceneState.subscribe(function(state){if(paused===state.paused)return;paused=state.paused;if(paused)staticPaint();}):null;
  return {select:select,animate:animateBackground,configure:function(config){if(!options.background)return;options.patternScale=config.scale;options.density=config.density;options.structure=config.structure;staticPaint();},refresh:staticPaint,dispose:function(){disposed=true;stop();if(resize)resize.disconnect();if(theme)theme.disconnect();if(unsubscribe)unsubscribe();if(document.removeEventListener)document.removeEventListener('visibilitychange',visibility);if(reduce&&reduce.removeEventListener)reduce.removeEventListener('change',staticPaint);}};
 };
})();

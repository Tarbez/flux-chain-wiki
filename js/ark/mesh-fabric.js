/* Shared local fabric: finite responses on the existing cells, never an idle loop. */
(function(){
 'use strict';
 ArkUI.createMeshFabric=function(canvas){
  var revision=0,frame=0,disposed=false,selected='receipt',previous='receipt',start=0,last=-Infinity,cells=[],width=0,height=0,scale=1,colors={},paused=false;
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
   colors={line:ink(style,'text-strong',.09),block:ink(style,'text-strong',.13),quiet:ink(style,'text-strong',.025),label:ink(style,'text-muted',.4),primary:style.getPropertyValue('--primary').trim()};
   var cols=Math.ceil(width/16),rows=Math.ceil(height/12);cells=[];
   for(var r=0;r<rows;r++)for(var c=0;c<cols;c++)cells.push({col:c,row:r,x:(c+.5)/cols,y:(r+.5)/rows,order:(r*cols+c)/(rows*cols),hash:(c*37+r*53+c*r*7)%41});
   return true;
  }
  function level(stage,p,cell){
   if(stage==='network')return cell.x>.12&&cell.x<.42&&cell.y>.18&&cell.y<.82&&cell.order<p?.38:0;
   if(stage==='logic')return Math.abs(cell.y-(.22+Math.floor(cell.x*4)*.14))<.07&&cell.x<p?.48:0;
   return ArkUI.agreementCellLevel?ArkUI.agreementCellLevel(stage,p,cell):0;
  }
  function paint(progress){
   if(disposed||!canvas.getContext||!width)return;
   var ctx=canvas.getContext('2d');ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,width,height);ctx.font='500 5px ui-monospace,monospace';
   var names=['SNAPSHOT','INTENT','TERMS','OFFER','LINK','RESULT','CHECK','TRACE'];
   cells.forEach(function(cell){
    var x=cell.col*16,y=cell.row*12;
    ctx.fillStyle=cell.hash===0||cell.hash===3?colors.block:colors.quiet;ctx.fillRect(x+1,y+1,14,10);
    ctx.strokeStyle=colors.line;ctx.strokeRect(x+.5,y+.5,16,12);
    var strength=level(previous,1,cell)*(1-progress)+level(selected,progress,cell)*progress;
    if(strength&&cell.hash%5!==1){ctx.fillStyle='hsl('+colors.primary+' / '+strength+')';ctx.fillRect(x+1,y+1,14,10);}
    if(cell.row%3===1&&cell.col%4===1){ctx.fillStyle=colors.label;ctx.fillText(names[(cell.row+cell.col)%names.length],x+3,y+8,40);}
   });canvas.dataset.stage=selected;
  }
  function staticPaint(){stop();if(measure())paint(1);}
  function tick(now,ticket){
   if(disposed||ticket!==revision)return;frame=0;
   if(paused||document.hidden||reduce&&reduce.matches){paint(1);return;}
   if(start<0)start=now;
   var p=Math.min(1,(now-start)/650);
   if(now-last>=1000/30||p===1){paint(p);last=now;}
   if(p<1)frame=window.requestAnimationFrame(function(now){tick(now,ticket);});
  }
  function select(stage,animate){
   if(disposed||animate&&stage===selected&&width)return;
   var changed=stage!==selected;previous=selected;selected=stage;stop();
   if(!measure())return;
   if(animate&&changed&&!paused&&!document.hidden&&!(reduce&&reduce.matches)&&window.requestAnimationFrame){start=-1;last=-Infinity;var ticket=revision;frame=window.requestAnimationFrame(function(now){tick(now,ticket);});}else paint(1);
  }
  var resize=typeof ResizeObserver!=='undefined'?new ResizeObserver(staticPaint):null;if(resize)resize.observe(canvas);
  var theme=typeof MutationObserver!=='undefined'?new MutationObserver(staticPaint):null;if(theme)theme.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  function visibility(){if(document.hidden)stop();else staticPaint();}
  if(document.addEventListener)document.addEventListener('visibilitychange',visibility);
  if(reduce&&reduce.addEventListener)reduce.addEventListener('change',staticPaint);
  var unsubscribe=ArkUI.sceneState&&ArkUI.sceneState.subscribe?ArkUI.sceneState.subscribe(function(state){if(paused===state.paused)return;paused=state.paused;if(paused)staticPaint();}):null;
  return {select:select,refresh:staticPaint,dispose:function(){disposed=true;stop();if(resize)resize.disconnect();if(theme)theme.disconnect();if(unsubscribe)unsubscribe();if(document.removeEventListener)document.removeEventListener('visibilitychange',visibility);if(reduce&&reduce.removeEventListener)reduce.removeEventListener('change',staticPaint);}};
 };
})();

/* Native drafting figures. Geometry explains a relationship; no idle rotation,
   fabricated live activity, or decorative percentage is introduced. */
(function(){
 'use strict';
 var NS='http://www.w3.org/2000/svg';
 function el(tag,attrs,text){var n=document.createElementNS(NS,tag);Object.keys(attrs||{}).forEach(function(k){n.setAttribute(k,attrs[k]);});if(text)n.textContent=text;return n;}
 ArkUI.createStoryDiagram=function(kind,options){
  options=options||{};
  var svg=el('svg',{viewBox:'0 0 360 218',class:'story-drawing','aria-hidden':'true',focusable:'false'}),motion=[];
  function add(tag,attrs,text){var n=el(tag,attrs,text);svg.appendChild(n);return n;}
  function path(d,cls){return add('path',{d:d,class:cls||'drawing-line'});}
  function box(x,y,w,h,cls){return add('rect',{x:x,y:y,width:w,height:h,rx:5,class:cls||'drawing-line'});}
  function dot(x,y,r,cls){return add('circle',{cx:x,cy:y,r:r||3,class:cls||'drawing-point'});}
  function word(x,y,t,cls){return add('text',{x:x,y:y,class:cls||'drawing-label'},t);}
  // A bounded patch retains the dense mesh language without covering the text.
  var hatch='';for(var i=0;i<18;i++){var x=9+i*4;hatch+='M'+x+' 14l0 55 ';}path(hatch,'drawing-mesh');
  [[12,12],[348,12],[12,204],[348,204]].forEach(function(p){path('M'+(p[0]-4)+' '+p[1]+'h8M'+p[0]+' '+(p[1]-4)+'v8','drawing-register');});
  var points=[],route='',title='';
  if(kind==='practice'||kind==='authority'){
   title='ONE OBJECT / BOUNDED AUTHORITY';
   box(105,42,143,131,'drawing-boundary');box(154,85,46,42);word(162,110,'OBJ');
   points=[[69,107],[177,47],[273,107],[305,171]];
   [[132,70],[220,71],[229,137],[174,155],[121,134]].forEach(function(p){dot(p[0],p[1],5);path('M'+p[0]+' '+p[1]+'L177 106','drawing-thread');});
   path('M69 107h36M248 107h25M273 107v64h32');dot(69,107,8);box(260,94,26,26);path('M266 107l5 5 9-12','drawing-accent');
   box(295,158,23,26,'drawing-dashed');route='M69 107H105V47H177V107H273V171H305';
  }else if(kind==='purpose'||kind==='networks'){
   title='SEPARATE PRESENCE / SHARED SUBSTRATE';
   box(49,41,128,86,'drawing-boundary');box(193,74,118,86,'drawing-boundary');
   for(var a=0;a<6;a++){path('M57 '+(51+a*12)+'h111M201 '+(84+a*12)+'h102','drawing-mesh');}
   [[73,63],[122,95],[153,63],[215,99],[258,137],[290,99]].forEach(function(p){dot(p[0],p[1],4);});
   word(58,118,'A');word(202,151,'B');box(137,174,92,25);word(148,191,'ACCOUNTS');path('M113 127v59h24M252 160v26h-23','drawing-dashed');
   points=[[113,79],[252,117],[183,186]];route='M113 79V186H252V117';
  }else if(kind==='dao'){
   title='TWO SCOPES / TWO POLICY BOUNDARIES';
   box(37,47,138,112,'drawing-boundary');box(197,75,123,112,'drawing-boundary');
   [[66,75],[112,69],[143,113],[84,138],[226,105],[286,111],[255,159]].forEach(function(p){dot(p[0],p[1],4);});
   path('M66 75L112 69 143 113 84 138Z M226 105L286 111 255 159Z','drawing-thread');word(47,180,'MESH POLICY');word(208,61,'NETWORK POLICY');
   points=[[106,105],[258,133],[326,133]];route='M106 105H175V133H258H326';path(route,'drawing-dashed');
  }else if(kind==='notes'||kind==='activation'){
   title='CONSENT / READINESS / ACTIVATION';
   points=[[66,111],[174,111],[289,111]];route='M66 111H289';path(route,'drawing-line');
   dot(66,111,26,'drawing-boundary');box(146,80,56,61,'drawing-boundary');dot(289,111,29,'drawing-dashed');
   path('M157 112l12 12 22-28','drawing-thread');for(var g=0;g<3;g++)path('M'+(224+g*5)+' 83v56','drawing-mesh');
   word(42,165,'APPROVAL');word(149,165,'GATES');word(257,165,'SEPARATE');
  }else if(kind==='spec'||kind==='benchmark'){
   title='MEASUREMENTS / ARTIFACT REQUIRED';
   path('M47 38v139h265');for(var b=0;b<6;b++)path('M47 '+(53+b*22)+'h265','drawing-mesh');
   box(102,79,155,53,'drawing-dashed');word(122,110,'NO RAW ARTIFACT');word(48,197,'NO PERFORMANCE CURVE INFERRED');
   points=[[47,177],[177,105],[312,177]];route='';
  }else if(kind==='studio'||kind==='references'||kind==='evidence'){
   title='SOURCE / REVISION / DATED EVIDENCE';
   points=[[63,108],[139,93],[218,119],[296,101]];route='M63 108L139 93 218 119 296 101';
   points.forEach(function(p,i){box(p[0]-22,p[1]-34,44,68,i===3?'drawing-dashed':'drawing-line');for(var j=0;j<3;j++)path('M'+(p[0]-12)+' '+(p[1]-12+j*10)+'h23','drawing-mesh');});
   word(30,184,'PROVENANCE STAYS WITH THE CLAIM');
  }else if(kind==='depth'||kind==='lifecycle'){
   title='ONE SNAPSHOT / A GROWING REFERENCE TRAIL';
   box(18,32,57,37,'drawing-boundary');word(28,54,'DATA');
   points=[[58,112],[114,130],[170,148],[226,166],[282,184]];
   var count=options.count||5;points.slice(0,count).forEach(function(p,i){box(p[0]-15,p[1]-13,30,26);word(p[0]-7,p[1]+4,String(i+1).padStart(2,'0'));path('M47 69V'+p[1]+'H'+(p[0]-15),'drawing-thread');});
   route='M47 50V112'+points.slice(0,count).map(function(p){return 'L'+p[0]+' '+p[1];}).join('');
  }else{
   title=kind==='resolver'?'INPUT / ADDRESSED LOGIC / RESULT':'PRESENCE / AGREEMENT / VERIFICATION';
   points=[[65,110],[178,110],[294,110]];route='M65 110H294';path(route);
   box(39,82,52,56);box(140,64,76,91,'drawing-boundary');dot(294,110,25,'drawing-boundary');
   for(var c=0;c<9;c++)path('M'+(148+c*7)+' 75v69','drawing-mesh');path('M280 110l10 10 20-22','drawing-thread');
  }
  word(86,24,title,'drawing-title');
  var trace=route?path(route,'drawing-trace'):null;
  var marker=add('g',{class:'drawing-marker'});marker.appendChild(el('circle',{r:10,class:'drawing-selection'}));marker.appendChild(el('circle',{r:2,class:'drawing-point'}));
  function cancel(){motion.forEach(function(a){a.cancel();});motion=[];}
  function select(index,animate){
   var p=points[Math.max(0,Math.min(points.length-1,index))];if(!p)return;cancel();
   var previous=marker.style.transform||'translate('+p[0]+'px,'+p[1]+'px)';var next='translate('+p[0]+'px,'+p[1]+'px)';marker.style.transform=next;
   if(animate && marker.animate && !(ArkUI.prefersReducedMotion&&ArkUI.prefersReducedMotion()) && !(ArkUI.sceneState&&ArkUI.sceneState.get().paused)){
    motion.push(marker.animate([{transform:previous},{transform:next}],{duration:380,easing:'cubic-bezier(.22,1,.36,1)'}));
    if(trace&&trace.getTotalLength){var length=trace.getTotalLength();motion.push(trace.animate([{strokeDasharray:length,strokeDashoffset:length},{strokeDasharray:length,strokeDashoffset:0}],{duration:460,easing:'cubic-bezier(.22,.7,.2,1)'}));}
   }
  }
  var media=typeof window!=='undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function settlePreference(){if(media&&media.matches)cancel();}
  if(media&&media.addEventListener)media.addEventListener('change',settlePreference);
  var unsubscribe=ArkUI.sceneState&&ArkUI.sceneState.subscribe?ArkUI.sceneState.subscribe(function(state){if(state.paused)cancel();}):null;
  select(options.selected||0,false);return {element:svg,select:select,dispose:function(){cancel();if(media&&media.removeEventListener)media.removeEventListener('change',settlePreference);if(typeof unsubscribe==='function')unsubscribe();}};
 };
})();

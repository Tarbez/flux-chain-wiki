import themeOptions from './theme-options.js';
import { createArkUI } from '/Volumes/PortableSSD/design/ark-ui/dist/ark-ui.runtime.js';
import { createArkHeadlessComponent, defineArkHeadlessComponent } from '/Volumes/PortableSSD/design/ark-ui/dist/ark-ui.headless.js';
import { createArkPopover } from '/Volumes/PortableSSD/design/ark-primitives/src/dialog.js';
import { mountArkBackground, ARK_BACKGROUND_PRESETS, createArkBackgroundConfig } from '/Volumes/PortableSSD/design/ark-ui/dist/ark-ui.backgrounds.js';
const host = document.querySelector('.site-settings');
const ui = createArkUI();
// The host forwards document events; ARK owns inside/branch detection and dismissal.
const outsidePointer = event => { if (event.target instanceof Node) ui.handleOutsidePointer(event.target); };
document.addEventListener('pointerdown', outsidePointer, true);
const themes=themeOptions;
const atmosphereFixed=Object.freeze({intensity:37,grain:90});
const controls={structure:{label:'Structure',min:0,max:100,value:50},visibility:{label:'Visibility',min:0,max:100,value:60},scale:{label:'Scale',min:60,max:180,value:100},density:{label:'Density',min:20,max:100,value:60},softness:{label:'Softness',min:0,max:100,value:10},delay:{label:'Loop delay (seconds)',min:.3,max:10,value:.3}};
ui.register('ATMOSPHERERANGE|BUTTON',{tag:'input',attrs:{type:'range'}});
const root=document.documentElement;
const read=(key,fallback)=>{try{return localStorage.getItem(key)||fallback;}catch{return fallback;}};
const save=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
let theme=read('flux-chain-theme','ghost'),renderer,frame=0;
// One dark and one light palette; earlier palette keys migrate to them.
theme={clay:'ghost',ochre:'ghost',marine:'ghost',grove:'glacier',moss:'glacier',bone:'glacier'}[theme]||theme;
if(!themes.includes(theme))theme='ghost';
let saved={};try{saved=JSON.parse(read('defxn-pattern-config-v1','{}'))||{};}catch{}
let values={};
function patternValues(name){const stored=saved[name]||{};const result={animated:stored.animated===true};for(const [key,c] of Object.entries(controls)){result[key]=typeof stored[key]==='number'&&Number.isFinite(stored[key])?Math.max(c.min,Math.min(c.max,stored[key])):c.value;}for(const [key,choices] of Object.entries({scale:[80,100,140],density:[35,60,90]}))result[key]=choices.reduce((a,b)=>Math.abs(a-result[key])<Math.abs(b-result[key])?a:b);return result;}
values=patternValues(read('defxn-motif-v1','blocks'));
root.dataset.background='atmosphere';
const backgroundHost=document.createElement('div');backgroundHost.className='ark-background-host';backgroundHost.setAttribute('aria-hidden','true');
document.querySelector('[data-ark-layer="persistent"]').prepend(backgroundHost);
const brandField=document.createElement('div');brandField.className='defxn-brand-field';brandField.setAttribute('aria-hidden','true');document.querySelector('.hero-alive').append(brandField);
const meshCanvas=document.createElement('canvas');meshCanvas.className='defxn-brand-mesh';brandField.append(meshCanvas);
const meshPattern=ArkUI.createMeshFabric(meshCanvas,{background:true});
const themeNames={ghost:'Night',glacier:'Day'};
const darkThemes=['ghost'],lightThemes=['glacier'];
const motifs=['blocks','traces','layers','nodes','routes','tiles','frames','none'];
const motifMigration={wave:'traces',weave:'traces',rosette:'blocks',arches:'layers',survey:'traces'};
let motif=read('defxn-motif-v1','blocks');motif=motifMigration[motif]||motif;if(!motifs.includes(motif))motif='blocks';
const title=value=>themeNames[value]||value[0].toUpperCase()+value.slice(1);
const slots={};
function slot(name,text,button=false,cls=''){
 const ref='SZ'+name.toUpperCase();
 slots[name]={ref,pattern:'R-'+ref+(button?'-X-SECONDARY-M-CONTROL-A-CLICK':'-M-LABEL'),state:{text},config:{attrs:{class:cls}}};return {slot:name};
}
function group(name,items){
 const children=items.map((value,i)=>slot(name+i,title(value),true,'settings-choice'));
 slots[name]={ref:'SZ'+name.toUpperCase(),pattern:'R-SZ'+name.toUpperCase()+'-F-GROUP-D-COLUMN',config:{attrs:{class:'settings-choices',role:'group','aria-label':name}}};return {slot:name,children};
}
const presets={scale:{compact:80,standard:100,wide:140},density:{sparse:35,balanced:60,full:90}};
const rangeCopy={structure:{label:'Structure',hint:'Shape the selected pattern.',ends:['Simple','Detailed']},visibility:{label:'Visibility',hint:'Set how strongly the pattern appears.',ends:['Hidden','Clear']},delay:{label:'Pause between loops',hint:'Time to rest after each gentle pulse.',ends:['300 ms','10 seconds']}};
const rangeValue=key=>key==='delay'?(values[key]<1?Math.round(values[key]*1000)+' ms':values[key]+' s'):values[key]+'%';
const sliders=['structure','visibility','delay'].map(key=>{
 const control=controls[key],copy=rangeCopy[key];
 slots[key+'Card']={ref:'SZ'+key.toUpperCase()+'CARD',pattern:'R-SZ'+key.toUpperCase()+'CARD-F-GROUP-D-COLUMN',config:{attrs:{class:'settings-slider-card'}}};
 slots[key+'Header']={ref:'SZ'+key.toUpperCase()+'HEADER',pattern:'R-SZ'+key.toUpperCase()+'HEADER-F-GROUP-D-ROW',config:{attrs:{class:'settings-slider-header'}}};
 const label=slot(key+'Label',copy.label,false,'settings-slider-label'),value=slot(key+'Value',rangeValue(key),false,'settings-slider-value');
 slots[key+'Ends']={ref:'SZ'+key.toUpperCase()+'ENDS',pattern:'R-SZ'+key.toUpperCase()+'ENDS-F-GROUP-D-ROW',config:{attrs:{class:'settings-slider-ends'}}};
 const ref='SZ'+key.toUpperCase();slots[key]={ref,pattern:'R-'+ref+'-M-ATMOSPHERERANGE-A-INPUT',state:{text:String(values[key])},config:{label:copy.label,attrs:{class:'settings-range',min:control.min,max:control.max,step:key==='delay'?.1:1,value:String(values[key])}}};
 return {slot:key+'Card',children:[{slot:key+'Header',children:[label,value]},slot(key+'Hint',copy.hint,false,'settings-slider-hint'),{slot:key},{slot:key+'Ends',children:[slot(key+'Min',copy.ends[0]),slot(key+'Max',copy.ends[1])]}]};
});
const contents=[slot('label','Your space',false,'settings-title'),slot('description','A few ways to make it yours.',false,'settings-description'),slot('themeLabel','Theme',false,'settings-label'),slot('darkLabel','Dark',false,'settings-control-label'),group('themesDark',darkThemes),slot('lightLabel','Light',false,'settings-control-label'),group('themesLight',lightThemes),slot('motifLabel','Pattern',false,'settings-label'),group('motifs',motifs),slot('backgroundLabel','Active pattern',false,'settings-label'),slot('sizeLabel','Cell size',false,'settings-control-label'),group('scale',Object.keys(presets.scale)),slot('spacingLabel','Cell spacing',false,'settings-control-label'),group('density',Object.keys(presets.density)),...sliders,slot('animate','Enable pattern animation',true,'settings-action'),slot('animationNote','A soft scan across the mesh, then a pause. Reduced motion is respected.',false,'settings-description'),slot('remove','Remove pattern',true,'settings-action'),slot('restore','Reset this pattern',true,'settings-action'),slot('motionLabel','Motion',false,'settings-label'),slot('pause','Pause motion',true,'settings-action'),slot('reset','Reset viewing angle',true,'settings-action')];
slots.root={ref:'SZROOT',pattern:'R-SZROOT-F-ROOT-D-COLUMN',config:{attrs:{class:'settings-root'}}};
slots.trigger={ref:'SZTRIGGER',pattern:'R-SZTRIGGER-X-SECONDARY-M-SETTINGS-A-CLICK',state:{text:'⚙'},config:{label:'Open settings',attrs:{class:'settings-trigger'}}};
slots.content={ref:'SZCONTENT',pattern:'R-SZCONTENT-F-POPOVER-D-COLUMN',state:{open:false,hidden:true},config:{attrs:{class:'settings-panel'}}};
const component=createArkHeadlessComponent(ui,defineArkHeadlessComponent({name:'flux-chain-settings',tree:{slot:'root',children:[{slot:'trigger'},{slot:'content',children:contents}]},slots,
 mount(runtime,c){createArkPopover(runtime,{triggerRef:c.getRef('trigger'),contentRef:c.getRef('content'),labelRef:c.getRef('label'),placement:'top',align:'start',keepMounted:true});}
}));
component.render(host);component.mount();
const bind=(name,fn)=>ui.onAction(component.getRef(name),(_,detail)=>{if(detail.action==='CLICK')fn();});
function selected(group,values,current){values.forEach((value,i)=>{const ref=component.getRef(group+i);ui.configureRef(ref,{attrs:{'aria-pressed':String(value===current)}});ui.update(ref,{text:title(value)});});}
function applyTheme(value){theme=value;root.dataset.theme=value;save('flux-chain-theme',value);selected('themesDark',darkThemes,value);selected('themesLight',lightThemes,value);}
function applyMotif(value){motif=value;root.dataset.motif=value;save('defxn-motif-v1',value);selected('motifs',motifs,value);values=patternValues(value);meshPattern.select({blocks:'network',traces:'logic',layers:'story-check',nodes:'mesh-nodes',routes:'mesh-routes',tiles:'mesh-tiles',frames:'mesh-frames'}[value]||'quiet',false);if(ready)syncPattern();}
motifs.forEach((value,i)=>bind('motifs'+i,()=>applyMotif(value)));
let ready=false;applyMotif(motif);
const base=createArkBackgroundConfig(ARK_BACKGROUND_PRESETS.quiet);
function atmosphereConfig(){
 const palette=['hsl(var(--text-muted))','hsl(var(--text-faint))','hsl(var(--surface))','hsl(var(--nested))'];
 const recolor=(shapes)=>shapes.map((shape,index)=>({...shape,color:palette[index%palette.length],size:shape.size}));
 return {...base,canvas:'hsl(var(--canvas))',sub:{opacity:atmosphereFixed.intensity/100,blur:155},base:{...base.base,opacity:atmosphereFixed.intensity/340,blur:Math.min(320,155*1.6)},grain:{...base.grain,opacity:atmosphereFixed.grain/1000},complementary:{...base.complementary,color:'hsl(var(--text-muted))'},shapes:recolor(base.shapes),extras:recolor(base.extras)};
}
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let loopTimer=0,pulse=null,disposed=false;
function stopPattern(){meshPattern.refresh();clearTimeout(loopTimer);loopTimer=0;if(pulse)pulse.cancel();pulse=null;}
function schedulePattern(){
 stopPattern();
 if(disposed||!values.animated||motif==='none'||document.hidden||reduced.matches||ArkUI.sceneState.get().paused)return;
 loopTimer=setTimeout(()=>{loopTimer=0;if(disposed)return;meshPattern.animate(); const opacity=Number(getComputedStyle(brandField).opacity)||.62;pulse=brandField.animate([{opacity},{opacity:opacity*.79},{opacity}],{duration:1800,easing:'ease-in-out'});pulse.onfinish=()=>{pulse=null;schedulePattern();};},values.delay*1000);
}
function persistPattern(){saved[motif]={...values};save('defxn-pattern-config-v1',JSON.stringify(saved));}
function restoreRangeValues(){for(const key of ['structure','visibility','delay']){const input=ui.getElement(component.getRef(key));if(!input)continue;input.value=String(values[key]);input.style.setProperty('--range-fill',((values[key]-controls[key].min)/(controls[key].max-controls[key].min)*100)+'%');input.setAttribute('aria-valuetext',rangeValue(key));const output=ui.getElement(component.getRef(key+'Value'));if(output&&output.textContent!==rangeValue(key))output.textContent=rangeValue(key);}}

function syncPattern(fromInput=false){
 meshPattern.configure(values);
 meshCanvas.style.filter='blur('+values.softness/100+'px)';
 
 root.style.setProperty('--pattern-visibility',String(values.visibility/100));
 if(fromInput){restoreRangeValues();schedulePattern();return;}
 for(const key of ['structure','visibility','delay']){const c=controls[key];if(!fromInput)ui.update(component.getRef(key),String(values[key]));ui.update(component.getRef(key+'Value'),{text:rangeValue(key)});ui.configureRef(component.getRef(key+'Card'),{attrs:{'data-disabled':String(motif==='none'||key==='delay'&&!values.animated)}});if(!fromInput)ui.configureRef(component.getRef(key),{attrs:{disabled:motif==='none'||key==='delay'&&!values.animated}});}
 for(const [key,options] of Object.entries(presets)){const closest=Object.keys(options).reduce((a,b)=>Math.abs(options[a]-values[key])<Math.abs(options[b]-values[key])?a:b);Object.keys(options).forEach((name,i)=>{ui.configureRef(component.getRef(key+i),{attrs:{role:'radio','aria-checked':String(name===closest),tabindex:name===closest?'0':'-1',disabled:motif==='none'}});});}
 ui.update(component.getRef('animate'),{text:values.animated?'Disable pattern animation':'Enable pattern animation'});
 ui.configureRef(component.getRef('animate'),{attrs:{'aria-pressed':String(values.animated),disabled:motif==='none'}});
 ui.configureRef(component.getRef('remove'),{attrs:{disabled:motif==='none'}});
 ui.configureRef(component.getRef('restore'),{attrs:{disabled:motif==='none'}});
 restoreRangeValues();schedulePattern();
}
for(const key of ['structure','visibility','delay']){const c=controls[key];
 // Native input events own the range value; suppress the button action fallback.
 ui.onAction(component.getRef(key),()=>{});
 ui.bindRefEvent(component.getRef(key),'input',(event,element)=>{const value=Number(element.value);if(!Number.isFinite(value))return;values[key]=Math.max(c.min,Math.min(c.max,value));syncPattern(true);persistPattern();});
}
for(const [key,options] of Object.entries(presets)){ui.configureRef(component.getRef(key),{attrs:{role:'radiogroup','aria-label':key==='scale'?'Cell size':'Cell spacing'}});Object.entries(options).forEach(([name,value],i)=>{bind(key+i,()=>{values[key]=value;persistPattern();syncPattern();});ui.bindRefEvent(component.getRef(key+i),'keydown',event=>{const keys=Object.keys(options);let next;if(['ArrowRight','ArrowDown'].includes(event.key))next=(i+1)%keys.length;else if(['ArrowLeft','ArrowUp'].includes(event.key))next=(i+keys.length-1)%keys.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=keys.length-1;else return;event.preventDefault();values[key]=options[keys[next]];persistPattern();syncPattern();ui.getElement(component.getRef(key+next))?.focus();});});}
bind('remove',()=>applyMotif('none'));
bind('animate',()=>{values.animated=!values.animated;persistPattern();syncPattern();});
bind('restore',()=>{delete saved[motif];values=patternValues(motif);persistPattern();syncPattern();});
document.addEventListener('visibilitychange',schedulePattern);reduced.addEventListener('change',schedulePattern);
const rangeObserver=new MutationObserver(restoreRangeValues);rangeObserver.observe(host,{childList:true,subtree:true});
ready=true;syncPattern();
for(const [groupName,items] of [['themesDark',darkThemes],['themesLight',lightThemes]])items.forEach((value,i)=>{ui.configureRef(component.getRef(groupName+i),{attrs:{'data-theme-choice':value,'aria-label':themeNames[value]+' '+(groupName==='themesDark'?'dark':'light')}});bind(groupName+i,()=>applyTheme(value));});
bind('pause',()=>ArkUI.sceneState.pause(!ArkUI.sceneState.get().paused));bind('reset',()=>ArkUI.sceneState.orient(0,0));
let paused;
const unsubscribeMotion=ArkUI.sceneState.subscribe(state=>{if(state.paused===paused)return;paused=state.paused;const ref=component.getRef('pause');ui.configureRef(ref,{attrs:{'aria-pressed':String(paused)}});ui.update(ref,{text:paused?'Resume motion':'Pause motion'});restoreRangeValues();schedulePattern();});
applyTheme(theme);renderer=mountArkBackground(backgroundHost,atmosphereConfig());restoreRangeValues();
window.addEventListener('pagehide',()=>{disposed=true;rangeObserver.disconnect();stopPattern();unsubscribeMotion();document.removeEventListener('visibilitychange',schedulePattern);reduced.removeEventListener('change',schedulePattern);document.removeEventListener('pointerdown',outsidePointer,true);if(frame)cancelAnimationFrame(frame);if(renderer)renderer.destroy();meshPattern.dispose();},{once:true});

import themeOptions from './theme-options.js';
import { createArkUI } from '/Volumes/PortableSSD/shared/ark-ui/dist/ark-ui.runtime.js';
import { createArkHeadlessComponent, defineArkHeadlessComponent } from '/Volumes/PortableSSD/shared/ark-ui/dist/ark-ui.headless.js';
import { createArkPopover } from '/Volumes/PortableSSD/shared/ark-primitives/src/dialog.js';
import { mountArkBackground, ARK_BACKGROUND_PRESETS, createArkBackgroundConfig } from '/Volumes/PortableSSD/shared/ark-ui/dist/ark-ui.backgrounds.js';
const host = document.querySelector('.site-settings');
const ui = createArkUI();
// The host forwards document events; ARK owns inside/branch detection and dismissal.
const outsidePointer = event => { if (event.target instanceof Node) ui.handleOutsidePointer(event.target); };
document.addEventListener('pointerdown', outsidePointer, true);
const themes=['original',...themeOptions];
const atmosphereFixed=Object.freeze({intensity:37,grain:90});
const controls={softness:{label:'Softness',min:0,max:160,value:155},scale:{label:'Scale',min:60,max:180,value:66}};
ui.register('ATMOSPHERERANGE|BUTTON',{tag:'input',attrs:{type:'range'}});
const root=document.documentElement;
const read=(key,fallback)=>{try{return localStorage.getItem(key)||fallback;}catch{return fallback;}};
const save=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
let theme=read('subzero-theme','original'),renderer,frame=0;
if(!themes.includes(theme))theme='original';
let saved={};try{saved=JSON.parse(read('subzero-atmosphere-v2','{}'))||{};}catch{}
const values={};
for(const [key,control] of Object.entries(controls)){const value=saved[key];values[key]=typeof value==='number'&&Number.isFinite(value)?Math.max(control.min,Math.min(control.max,value)):control.value;}
root.dataset.background='atmosphere';
const backgroundHost=document.createElement('div');backgroundHost.className='ark-background-host';backgroundHost.setAttribute('aria-hidden','true');
document.querySelector('[data-ark-layer="persistent"]').prepend(backgroundHost);
const title=value=>value==='original'?'Subzero':value[0].toUpperCase()+value.slice(1);
const slots={};
function slot(name,text,button=false,cls=''){
 const ref='SZ'+name.toUpperCase();
 slots[name]={ref,pattern:'R-'+ref+(button?'-X-SECONDARY-M-CONTROL-A-CLICK':'-M-LABEL'),state:{text},config:{attrs:{class:cls}}};return {slot:name};
}
function group(name,items){
 const children=items.map((value,i)=>slot(name+i,title(value),true,'settings-choice'));
 slots[name]={ref:'SZ'+name.toUpperCase(),pattern:'R-SZ'+name.toUpperCase()+'-F-GROUP-D-COLUMN',config:{attrs:{class:'settings-choices',role:'group','aria-label':name}}};return {slot:name,children};
}
const sliders=Object.entries(controls).flatMap(([key,control])=>{
 const label=slot(key+'Label',control.label+' / '+values[key],false,'settings-control-label');
 const ref='SZ'+key.toUpperCase();slots[key]={ref,pattern:'R-'+ref+'-M-ATMOSPHERERANGE-A-INPUT',state:{text:String(values[key])},config:{label:control.label,attrs:{class:'settings-range',min:control.min,max:control.max,step:1}}};
 return [label,{slot:key}];
});
const contents=[slot('label','Your space',false,'settings-title'),slot('description','A few ways to make it yours.',false,'settings-description'),slot('themeLabel','Theme',false,'settings-label'),group('themes',themes),slot('backgroundLabel','Atmosphere',false,'settings-label'),...sliders,slot('restore','Reset atmosphere',true,'settings-action'),slot('motionLabel','Motion',false,'settings-label'),slot('pause','Pause motion',true,'settings-action'),slot('reset','Reset viewing angle',true,'settings-action')];
slots.root={ref:'SZROOT',pattern:'R-SZROOT-F-ROOT-D-COLUMN',config:{attrs:{class:'settings-root'}}};
slots.trigger={ref:'SZTRIGGER',pattern:'R-SZTRIGGER-X-SECONDARY-M-SETTINGS-A-CLICK',state:{text:'⚙'},config:{label:'Open settings',attrs:{class:'settings-trigger'}}};
slots.content={ref:'SZCONTENT',pattern:'R-SZCONTENT-F-POPOVER-D-COLUMN',state:{open:false,hidden:true},config:{attrs:{class:'settings-panel'}}};
const component=createArkHeadlessComponent(ui,defineArkHeadlessComponent({name:'subzero-settings',tree:{slot:'root',children:[{slot:'trigger'},{slot:'content',children:contents}]},slots,
 mount(runtime,c){createArkPopover(runtime,{triggerRef:c.getRef('trigger'),contentRef:c.getRef('content'),labelRef:c.getRef('label'),placement:'top',align:'start',keepMounted:true});}
}));
component.render(host);component.mount();
const bind=(name,fn)=>ui.onAction(component.getRef(name),(_,detail)=>{if(detail.action==='CLICK')fn();});
function selected(group,values,current){values.forEach((value,i)=>{const ref=component.getRef(group+i);ui.configureRef(ref,{attrs:{'aria-pressed':String(value===current)}});ui.update(ref,{text:title(value)});});}
function applyTheme(value){theme=value;root.dataset.theme=value;save('subzero-theme',value);selected('themes',themes,value);}
const base=createArkBackgroundConfig(ARK_BACKGROUND_PRESETS.quiet);
function atmosphereConfig(){
 const palette=['hsl(var(--primary))','hsl(var(--text-muted))','hsl(var(--surface))','hsl(var(--complement))'];
 const recolor=(shapes)=>shapes.map((shape,index)=>({...shape,color:palette[index%palette.length],size:shape.size*values.scale/100}));
 return {...base,canvas:'hsl(var(--canvas))',sub:{opacity:atmosphereFixed.intensity/100,blur:values.softness},base:{...base.base,opacity:atmosphereFixed.intensity/340,blur:Math.min(320,values.softness*1.6)},grain:{...base.grain,opacity:atmosphereFixed.grain/1000},complementary:{...base.complementary,color:'hsl(var(--complement))'},shapes:recolor(base.shapes),extras:recolor(base.extras)};
}
function scheduleAtmosphere(){if(frame)return;frame=requestAnimationFrame(()=>{frame=0;renderer.update(atmosphereConfig());});}
for(const [key,control] of Object.entries(controls)){
 ui.bindRefEvent(component.getRef(key),'input',(event,element)=>{
  const value=Number(element.value);if(!Number.isFinite(value))return;
  values[key]=Math.max(control.min,Math.min(control.max,value));
  ui.update(component.getRef(key+'Label'),{text:control.label+' / '+values[key]});scheduleAtmosphere();
 });
 ui.bindRefEvent(component.getRef(key),'change',()=>save('subzero-atmosphere-v2',JSON.stringify(values)));
}
bind('restore',()=>{for(const [key,control] of Object.entries(controls)){values[key]=control.value;ui.update(component.getRef(key),{text:String(control.value)});ui.update(component.getRef(key+'Label'),{text:control.label+' / '+control.value});}save('subzero-atmosphere-v2',JSON.stringify(values));scheduleAtmosphere();});
themes.forEach((value,i)=>bind('themes'+i,()=>applyTheme(value)));
bind('pause',()=>ArkUI.sceneState.pause(!ArkUI.sceneState.get().paused));bind('reset',()=>ArkUI.sceneState.orient(0,0));
let paused;
ArkUI.sceneState.subscribe(state=>{if(state.paused===paused)return;paused=state.paused;const ref=component.getRef('pause');ui.configureRef(ref,{attrs:{'aria-pressed':String(paused)}});ui.update(ref,{text:paused?'Resume motion':'Pause motion'});});
applyTheme(theme);renderer=mountArkBackground(backgroundHost,atmosphereConfig());
window.addEventListener('pagehide',()=>{document.removeEventListener('pointerdown',outsidePointer,true);if(frame)cancelAnimationFrame(frame);if(renderer)renderer.destroy();},{once:true});

import themeOptions from './theme-options.js';
// Ark UI comes from the synced packages (node_modules/@deadark/*, filled by `npm run sync:ark`);
// build: node scripts/build-ark-vendor.cjs -> js/settings/panel.js.
import { createArkUI } from '@deadark/ark-ui/runtime';
import { createArkHeadlessComponent, defineArkHeadlessComponent } from '@deadark/ark-ui/headless';
import { createArkPopover } from '@deadark/ark-primitives/dialog';
import { mountArkBackground, ARK_BACKGROUND_PRESETS, createArkBackgroundConfig } from '@deadark/ark-ui/backgrounds';
const host = document.querySelector('.site-settings');
const ui = createArkUI();
// The host forwards document events; ARK owns inside/branch detection and dismissal.
const outsidePointer = event => { if (event.target instanceof Node) ui.handleOutsidePointer(event.target); };
document.addEventListener('pointerdown', outsidePointer, true);
const themes=themeOptions;
const atmosphereFixed=Object.freeze({intensity:37,grain:90});
const controls={structure:{label:'Structure',min:0,max:100,value:50},visibility:{label:'Visibility',min:0,max:100,value:72},scale:{label:'Scale',min:60,max:180,value:100},density:{label:'Density',min:20,max:100,value:60},softness:{label:'Softness',min:0,max:100,value:0},delay:{label:'Wave delay (seconds)',min:.3,max:10,value:1.2}};
ui.register('ATMOSPHERERANGE|BUTTON',{tag:'input',attrs:{type:'range'}});
const root=document.documentElement;
// Site-wide owner-set defaults (js/content/settings-defaults.js + -data.js), consulted only
// as the fallback a real visitor's own localStorage choice is missing -- read(key,fallback)'s
// own precedence (their choice wins) is unchanged, this only moves what the fallback IS.
// `let`, and `previewOnly`: inside the editor's preview a new default can arrive later (see the
// 'ark-site-defaults-preview' listener at the end), and from then on nothing is saved.
let SITE_DEFAULTS=(window.ArkSiteDefaults&&ArkSiteDefaults.get())||{},previewOnly=false;
const read=(key,fallback)=>{try{return localStorage.getItem(key)||fallback;}catch{return fallback;}};
const save=(key,value)=>{if(previewOnly)return;try{localStorage.setItem(key,value);}catch{}};
let theme=read('flux-chain-theme',SITE_DEFAULTS.theme||'ghost'),renderer,frame=0;
if(!themes.includes(theme))theme='ghost';
let saved={};try{saved=JSON.parse(read('defxn-pattern-config-v1','{}'))||{};}catch{}
let values={};
function patternValues(name){const stored=saved[name]||{};const siteDefault=(SITE_DEFAULTS.patternConfig&&SITE_DEFAULTS.patternConfig[name])||{};const result={animated:stored.animated!==undefined?stored.animated!==false:typeof siteDefault.animated==='boolean'?siteDefault.animated:true};for(const [key,c] of Object.entries(controls)){result[key]=typeof stored[key]==='number'&&Number.isFinite(stored[key])?Math.max(c.min,Math.min(c.max,stored[key])):typeof siteDefault[key]==='number'&&Number.isFinite(siteDefault[key])?Math.max(c.min,Math.min(c.max,siteDefault[key])):c.value;}for(const [key,choices] of Object.entries({scale:[80,100,140],density:[35,60,90]}))result[key]=choices.reduce((a,b)=>Math.abs(a-result[key])<Math.abs(b-result[key])?a:b);return result;}
values=patternValues(read('defxn-motif-v1',SITE_DEFAULTS.motif||'blocks'));
root.dataset.background='atmosphere';
const backgroundHost=document.createElement('div');backgroundHost.className='ark-background-host';backgroundHost.setAttribute('aria-hidden','true');
document.querySelector('[data-ark-layer="persistent"]').prepend(backgroundHost);
const brandField=document.createElement('div');brandField.className='defxn-brand-field';brandField.setAttribute('aria-hidden','true');document.querySelector('.hero-alive').append(brandField);
const meshCanvas=document.createElement('canvas');meshCanvas.className='defxn-brand-mesh';brandField.append(meshCanvas);
const meshPattern=ArkUI.createMeshFabric(meshCanvas,{background:true});
// Five relaxed families, each in a dark and a light palette (css/flux-themes.css).
const themeNames={ghost:'Ember',clay:'Tide',ochre:'Moss',marine:'Dune',dusk:'Dusk',glacier:'Ember',grove:'Tide',moss:'Moss',bone:'Dune',dawn:'Dusk'};
const darkThemes=['ghost','clay','ochre','marine','dusk'],lightThemes=['glacier','grove','moss','bone','dawn'];
const motifs=['blocks','traces','layers','nodes','routes','tiles','frames','none'];
const motifMigration={wave:'traces',weave:'traces',rosette:'blocks',arches:'layers',survey:'traces'};
let motif=read('defxn-motif-v1',SITE_DEFAULTS.motif||'blocks');motif=motifMigration[motif]||motif;if(!motifs.includes(motif))motif='blocks';
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
const rangeCopy={structure:{label:'Structure',hint:'Shape the selected pattern.',ends:['Simple','Detailed']},visibility:{label:'Visibility',hint:'Set how strongly the pattern appears.',ends:['Hidden','Clear']},delay:{label:'Wave delay',hint:'How long the pattern rests before its wave, after it appears or a setting changes.',ends:['300 ms','10 seconds']}};
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
const contents=[slot('label','Your space',false,'settings-title'),slot('description','A few ways to make it yours.',false,'settings-description'),slot('themeLabel','Theme',false,'settings-label'),slot('darkLabel','Dark',false,'settings-control-label'),group('themesDark',darkThemes),slot('lightLabel','Light',false,'settings-control-label'),group('themesLight',lightThemes),slot('palette','See the full palette →',true,'settings-action settings-palette-link'),slot('motifLabel','Pattern',false,'settings-label'),group('motifs',motifs),slot('backgroundLabel','Active pattern',false,'settings-label'),slot('sizeLabel','Cell size',false,'settings-control-label'),group('scale',Object.keys(presets.scale)),slot('spacingLabel','Cell spacing',false,'settings-control-label'),group('density',Object.keys(presets.density)),...sliders,slot('animate','Enable pattern animation',true,'settings-action'),slot('animationNote','One wave follows the shape of the pattern when it appears or a setting changes, then rests. Pause anytime; reduced motion is respected.',false,'settings-description'),slot('remove','Remove pattern',true,'settings-action'),slot('restore','Reset this pattern',true,'settings-action'),slot('motionLabel','Motion',false,'settings-label'),slot('pause','Pause motion',true,'settings-action'),slot('reset','Reset viewing angle',true,'settings-action')];
slots.root={ref:'SZROOT',pattern:'R-SZROOT-F-ROOT-D-COLUMN',config:{attrs:{class:'settings-root'}}};
slots.trigger={ref:'SZTRIGGER',pattern:'R-SZTRIGGER-X-SECONDARY-M-SETTINGS-A-CLICK',state:{text:'⚙'},config:{label:'Open settings',attrs:{class:'settings-trigger'}}};
slots.content={ref:'SZCONTENT',pattern:'R-SZCONTENT-F-POPOVER-D-COLUMN',state:{open:false,hidden:true},config:{attrs:{class:'settings-panel'}}};
const component=createArkHeadlessComponent(ui,defineArkHeadlessComponent({name:'flux-chain-settings',tree:{slot:'root',children:[{slot:'trigger'},{slot:'content',children:contents}]},slots,
 mount(runtime,c){createArkPopover(runtime,{triggerRef:c.getRef('trigger'),contentRef:c.getRef('content'),labelRef:c.getRef('label'),placement:'top',align:'start',keepMounted:true});}
}));
component.render(host);component.mount();
const bind=(name,fn)=>ui.onAction(component.getRef(name),(_,detail)=>{if(detail.action==='CLICK')fn();});
function selected(group,values,current){values.forEach((value,i)=>{const ref=component.getRef(group+i);ui.configureRef(ref,{attrs:{'aria-pressed':String(value===current)}});ui.update(ref,{text:title(value)});});}
// THE ONE OWNER of <html data-theme> on the public page (js/bootstrap.js only paints this
// browser's last answer early; js/main.js no longer writes it -- the colour theme's activeTheme
// is the theme the EDITOR is editing, not a visitor palette). `chosen` is true only for a click
// in this panel: only a real choice is saved as the visitor's own. Until 2026-10-18 every page
// load saved the current site default here as if chosen, so a visitor who never touched the
// theme kept their first visit's default forever and never saw the owner change it
// (regression: tests/browser/theme-owner.mjs). The same holds for the pattern (motif).
function applyTheme(value,chosen){theme=value;root.dataset.theme=value;if(chosen)save('flux-chain-theme',value);selected('themesDark',darkThemes,value);selected('themesLight',lightThemes,value);}
function applyMotif(value,chosen){motif=value;root.dataset.motif=value;if(chosen)save('defxn-motif-v1',value);selected('motifs',motifs,value);values=patternValues(value);meshPattern.select({blocks:'network',traces:'logic',layers:'story-check',nodes:'mesh-nodes',routes:'mesh-routes',tiles:'mesh-tiles',frames:'mesh-frames'}[value]||'quiet',false);if(ready)syncPattern();}
motifs.forEach((value,i)=>bind('motifs'+i,()=>applyMotif(value,true)));
let ready=false;applyMotif(motif);
const base=createArkBackgroundConfig(ARK_BACKGROUND_PRESETS.quiet);
function atmosphereConfig(){
 const palette=['hsl(var(--text-muted))','hsl(var(--text-faint))','hsl(var(--surface))','hsl(var(--nested))'];
 const recolor=(shapes)=>shapes.map((shape,index)=>({...shape,color:palette[index%palette.length],size:shape.size}));
 return {...base,canvas:'hsl(var(--canvas))',sub:{opacity:atmosphereFixed.intensity/100,blur:155},base:{...base.base,opacity:atmosphereFixed.intensity/340,blur:Math.min(320,155*1.6)},grain:{...base.grain,opacity:atmosphereFixed.grain/1000},complementary:{...base.complementary,color:'hsl(var(--text-muted))'},shapes:recolor(base.shapes),extras:recolor(base.extras)};
}
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let loopTimer=0,disposed=false;
function stopPattern(){meshPattern.refresh();clearTimeout(loopTimer);loopTimer=0;}
// "Animated pattern" is ONE bounded wave per real change, never a loop (memory
// defxn_animation_must_settle; measured by tests/browser/idle-frames.mjs). schedulePattern() is
// called by exactly the real changes: the pattern or one of its settings changing (syncPattern),
// the tab becoming visible, reduced motion lifting, motion being resumed. After `delay` seconds
// of rest it plays the fabric's 3.2 s scan (js/ark/mesh-fabric.js animate(), which paints its own
// settled frame and stops) and then nothing is scheduled until the next real change. Until
// 2026-10-19 the wave re-armed itself after every scan, so a settled page still requested ~20
// frames/s forever; a slider called "Loop delay" set only how long that loop rested.
function schedulePattern(){
 stopPattern();
 if(disposed||!values.animated||motif==='none'||document.hidden||reduced.matches||ArkUI.sceneState.get().paused)return;
 loopTimer=setTimeout(()=>{loopTimer=0;if(disposed)return;meshPattern.animate();},values.delay*1000);
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
// "See the full palette": /palette, the design-system reference for these themes, had no inbound
// link anywhere (docs/ux-audit/pages.md P2). It goes through the page router like every in-site
// link, then closes this popover so the page is not covered (regression: tests/site-exits.cjs).
bind('palette',()=>{const router=window.ArkUI&&ArkUI.pageRouter;if(!router)return;router.navigate('palette');const trigger=ui.getElement(component.getRef('trigger'));if(trigger&&trigger.getAttribute('aria-expanded')==='true')trigger.click();});
bind('remove',()=>applyMotif('none',true));
bind('animate',()=>{values.animated=!values.animated;persistPattern();syncPattern();});
bind('restore',()=>{delete saved[motif];values=patternValues(motif);persistPattern();syncPattern();});
document.addEventListener('visibilitychange',schedulePattern);reduced.addEventListener('change',schedulePattern);
const rangeObserver=new MutationObserver(restoreRangeValues);rangeObserver.observe(host,{childList:true,subtree:true});
ready=true;syncPattern();
for(const [groupName,items] of [['themesDark',darkThemes],['themesLight',lightThemes]])items.forEach((value,i)=>{ui.configureRef(component.getRef(groupName+i),{attrs:{'data-theme-choice':value,'aria-label':themeNames[value]+' '+(groupName==='themesDark'?'dark':'light')}});bind(groupName+i,()=>applyTheme(value,true));});
bind('pause',()=>ArkUI.sceneState.pause(!ArkUI.sceneState.get().paused));bind('reset',()=>ArkUI.sceneState.orient(0,0));
let paused;
const unsubscribeMotion=ArkUI.sceneState.subscribe(state=>{if(state.paused===paused)return;paused=state.paused;const ref=component.getRef('pause');ui.configureRef(ref,{attrs:{'aria-pressed':String(paused)}});ui.update(ref,{text:paused?'Resume motion':'Pause motion'});restoreRangeValues();schedulePattern();});
applyTheme(theme);renderer=mountArkBackground(backgroundHost,atmosphereConfig());restoreRangeValues();
// What js/bootstrap.js paints before first paint for a visitor with no choice of their own: the
// site default as this browser last saw it (a cache of the owner's setting, never the visitor's
// choice). A changed default shows from the next load on with no flash.
if(SITE_DEFAULTS.theme&&themes.includes(SITE_DEFAULTS.theme))save('defxn-site-theme-default',SITE_DEFAULTS.theme);
// CMS preview hook. js/main.js fires this only inside the editor's preview iframe, after it
// re-defines ArkSiteDefaults from an unsaved edit or from a past version (Versions panel). The
// preview shows what an UNCONFIGURED visitor lands on, so the defaults apply over this browser's
// own stored choices -- and nothing is written to localStorage from then on: the editor shares the
// public site's origin, so a write here would become the owner's own visitor choice.
// The theme is re-asserted every time (a full preview state re-applies the colour theme first);
// the pattern is re-applied only when the defaults changed, so typing elsewhere does not restart it.
let previewShown='';
window.addEventListener('ark-site-defaults-preview',event=>{
 const next=event.detail||{};previewOnly=true;
 applyTheme(themes.includes(next.theme)?next.theme:'ghost');
 const key=JSON.stringify(next);if(key===previewShown)return;previewShown=key;
 SITE_DEFAULTS=next;saved={};
 let nextMotif=motifMigration[next.motif]||next.motif;if(!motifs.includes(nextMotif))nextMotif='blocks';
 applyMotif(nextMotif);
});
window.addEventListener('pagehide',()=>{disposed=true;rangeObserver.disconnect();stopPattern();unsubscribeMotion();document.removeEventListener('visibilitychange',schedulePattern);reduced.removeEventListener('change',schedulePattern);document.removeEventListener('pointerdown',outsidePointer,true);if(frame)cancelAnimationFrame(frame);if(renderer)renderer.destroy();meshPattern.dispose();},{once:true});

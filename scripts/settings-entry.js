import themeOptions, { legacyThemeIds } from './theme-options.js';
// Ark UI comes from the synced packages (node_modules/@deadark/*, filled by `npm run sync:ark`);
// build: node scripts/build-ark-vendor.cjs -> js/settings/panel.js.
import { createArkUI } from '@deadark/ark-ui/runtime';
import { createArkHeadlessComponent, defineArkHeadlessComponent } from '@deadark/ark-ui/headless';
import { createArkPopover } from '@deadark/ark-primitives/dialog';
const host = document.querySelector('.site-settings');
const ui = createArkUI();
// The host forwards document events; ARK owns inside/branch detection and dismissal.
const outsidePointer = event => { if (event.target instanceof Node) ui.handleOutsidePointer(event.target); };
document.addEventListener('pointerdown', outsidePointer, true);
const themes=themeOptions;
const root=document.documentElement;
// Site-wide owner-set defaults (js/content/settings-defaults.js + -data.js), consulted only
// as the fallback a real visitor's own localStorage choice is missing -- read(key,fallback)'s
// own precedence (their choice wins) is unchanged, this only moves what the fallback IS.
// `let`, and `previewOnly`: inside the editor's preview a new default can arrive later (see the
// 'ark-site-defaults-preview' listener at the end), and from then on nothing is saved.
let SITE_DEFAULTS=(window.ArkSiteDefaults&&ArkSiteDefaults.get())||{},previewOnly=false;
const read=(key,fallback)=>{try{return localStorage.getItem(key)||fallback;}catch{return fallback;}};
const save=(key,value)=>{if(previewOnly)return;try{localStorage.setItem(key,value);}catch{}};
// Palette ids are the SDK's published names (generated scripts/theme-options.js). Stored choices
// live in two vocabularies in SEPARATE keys (legacy `moss` = Moss light, published `defxn-moss` =
// Moss dark): THEME_KEY holds published ids and is the only one written; the old keys
// (flux-chain-theme, defxn-site-theme-default) are READ once, mapped, and never rewritten or removed.
// The visitor's own choice, old or new, beats the site default (precedence unchanged).
const THEME_KEY='defxn-theme-v1',SITE_THEME_KEY='defxn-theme-default-v1';
const publishedNow=value=>value&&themes.includes(value)?value:null;
const publishedOld=value=>value&&Object.prototype.hasOwnProperty.call(legacyThemeIds,value)?legacyThemeIds[value]:null;
const publishedAny=value=>publishedNow(value)||publishedOld(value);
const ownTheme=publishedNow(read(THEME_KEY,''))||publishedOld(read('flux-chain-theme',''));
if(ownTheme&&!publishedNow(read(THEME_KEY,'')))save(THEME_KEY,ownTheme);
let theme=ownTheme||publishedAny(SITE_DEFAULTS.theme)||'ember';
// No pattern and no atmosphere (owner, 2026-11-05): the page paints two layers, its colour and the 3D world.
// The mesh pattern, the Ark atmosphere and their controls (Pattern, cell size and spacing, structure, visibility,
// wave delay) left with them. Old visitors' stored defxn-motif-v1 and defxn-pattern-config-v1 are read by nothing now.
// Five relaxed families, each in a dark and a light palette (css/themes.css).
const themeNames={'ember':'Ember','defxn-tide':'Tide','defxn-moss':'Moss','defxn-dune':'Dune','defxn-dusk':'Dusk','ember-light':'Ember','defxn-tide-light':'Tide','defxn-moss-light':'Moss','defxn-dune-light':'Dune','defxn-dusk-light':'Dusk'};
const darkThemes=['ember','defxn-tide','defxn-moss','defxn-dune','defxn-dusk'],lightThemes=['ember-light','defxn-tide-light','defxn-moss-light','defxn-dune-light','defxn-dusk-light'];
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
const contents=[slot('label','Your space',false,'settings-title'),slot('description','A few ways to make it yours.',false,'settings-description'),slot('themeLabel','Theme',false,'settings-label'),slot('darkLabel','Dark',false,'settings-control-label'),group('themesDark',darkThemes),slot('lightLabel','Light',false,'settings-control-label'),group('themesLight',lightThemes),slot('palette','See the full palette →',true,'settings-action settings-palette-link'),slot('motionLabel','Motion',false,'settings-label'),slot('pause','Pause motion',true,'settings-action'),slot('reset','Reset viewing angle',true,'settings-action')];
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
// (regression: tests/browser/theme-owner.mjs).
function applyTheme(value,chosen){theme=value;root.dataset.theme=value;if(chosen)save(THEME_KEY,value);selected('themesDark',darkThemes,value);selected('themesLight',lightThemes,value);}
// "See the full palette": /palette, the design-system reference for these themes, had no inbound
// link anywhere (docs/ux-audit/pages.md P2). It goes through the page router like every in-site
// link, then closes this popover so the page is not covered (regression: tests/site-exits.cjs).
bind('palette',()=>{const router=window.ArkUI&&ArkUI.pageRouter;if(!router)return;router.navigate('palette');const trigger=ui.getElement(component.getRef('trigger'));if(trigger&&trigger.getAttribute('aria-expanded')==='true')trigger.click();});
for(const [groupName,items] of [['themesDark',darkThemes],['themesLight',lightThemes]])items.forEach((value,i)=>{ui.configureRef(component.getRef(groupName+i),{attrs:{'data-theme-choice':value,'aria-label':themeNames[value]+' '+(groupName==='themesDark'?'dark':'light')}});bind(groupName+i,()=>applyTheme(value,true));});
bind('pause',()=>ArkUI.sceneState.pause(!ArkUI.sceneState.get().paused));bind('reset',()=>ArkUI.sceneState.orient(0,0));
let paused;
const unsubscribeMotion=ArkUI.sceneState.subscribe(state=>{if(state.paused===paused)return;paused=state.paused;const ref=component.getRef('pause');ui.configureRef(ref,{attrs:{'aria-pressed':String(paused)}});ui.update(ref,{text:paused?'Resume motion':'Pause motion'});});
applyTheme(theme);
// What js/bootstrap.js paints before first paint for a visitor with no choice of their own: the
// site default as this browser last saw it (a cache of the owner's setting, never the visitor's
// choice). A changed default shows from the next load on with no flash.
if(publishedAny(SITE_DEFAULTS.theme))save(SITE_THEME_KEY,publishedAny(SITE_DEFAULTS.theme));
// CMS preview hook. js/main.js fires this only inside the editor's preview iframe, after it
// re-defines ArkSiteDefaults from an unsaved edit or from a past version (Versions panel). The
// preview shows what an UNCONFIGURED visitor lands on, so the defaults apply over this browser's
// own stored choices -- and nothing is written to localStorage from then on: the editor shares the
// public site's origin, so a write here would become the owner's own visitor choice.
// The theme is re-asserted every time (a full preview state re-applies the colour theme first).
window.addEventListener('ark-site-defaults-preview',event=>{
 const next=event.detail||{};previewOnly=true;SITE_DEFAULTS=next;
 applyTheme(publishedAny(next.theme)||'ember');
});
window.addEventListener('pagehide',()=>{unsubscribeMotion();document.removeEventListener('pointerdown',outsidePointer,true);},{once:true});

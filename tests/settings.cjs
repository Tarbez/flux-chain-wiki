const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root={dataset:{},style:{setProperty(){},removeProperty(){}}},data={paused:false},refs={},configs={},actions={},events={};let spec,subscriber,rotation,options,destroyed=0,mounts=[],updates=[],frame;
const documentEvents={},windowEvents={},outsideTargets=[];class TestNode {}
const ui={handleOutsidePointer(target){outsideTargets.push(target);},register(){},bindRefEvent(ref,event,fn){events[ref+event]=fn;},configureRef(ref,c){configs[ref]={...configs[ref],...c,attrs:{...configs[ref]?.attrs,...c.attrs}};},update(ref,state){refs[ref]={...state,attrs:{...configs[ref]?.attrs}};},onAction(ref,fn){actions[ref]=fn;},getElement(){return null;}};
class TestMutationObserver{constructor(fn){this.fn=fn;}observe(){}disconnect(){}}
const context=vm.createContext({Node:TestNode,MutationObserver:TestMutationObserver,themeOptions:['ember','defxn-dune-light'],legacyThemeIds:{ghost:'ember',bone:'defxn-dune-light'},createArkUI:()=>ui,defineArkHeadlessComponent:s=>s,
 createArkHeadlessComponent:(runtime,s)=>{spec=s;return {render(){for(const slot of Object.values(s.slots)){ui.configureRef(slot.ref,slot.config||{});ui.update(slot.ref,slot.state||{});}},mount(){s.mount(runtime,this);},getRef:k=>s.slots[k].ref};},createArkPopover:(runtime,o)=>{options=o;},
 ARK_BACKGROUND_PRESETS:{quiet:{}},createArkBackgroundConfig:()=>({base:{},grain:{},complementary:{},shapes:[{size:72}],extras:[]}),requestAnimationFrame:fn=>{frame=fn;return 1;},cancelAnimationFrame(){},mountArkBackground:(host,o)=>{mounts.push(o);return {destroy(){destroyed++;},update(o){updates.push(o);}};},
 document:{addEventListener(name,fn,capture){documentEvents[name]={fn,capture};},removeEventListener(name){delete documentEvents[name];},querySelector:()=>({prepend(){},append(){}}),documentElement:root,createElement:()=>({setAttribute(){},append(){},style:{}})},window:{addEventListener(name,fn){windowEvents[name]=fn;},removeEventListener(){}},localStorage:{getItem:()=>'<invalid>',setItem(){}},matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),setTimeout:()=>0,clearTimeout(){},
 ArkUI:{sceneState:{subscribe(fn){subscriber=fn;fn(data);return()=>{};},get:()=>data,pause(v){data.paused=v;subscriber(data);},orient(...v){rotation=v;}},createMeshFabric:()=>({select(){},refresh(){},animate(){},configure(){},dispose(){}})}});
vm.runInContext(fs.readFileSync('scripts/settings-entry.js','utf8').replace(/^import .*;\n/gm,''),context);
const outside=new TestNode();documentEvents.pointerdown.fn({target:outside});assert.equal(outsideTargets[0],outside);assert.equal(documentEvents.pointerdown.capture,true);
const click=ref=>actions[ref](ref,{action:'CLICK'});
click('SZPAUSE');assert(data.paused);assert.equal(refs.SZPAUSE.text,'Resume motion');
click('SZPAUSE');assert(!data.paused);
assert.equal(root.dataset.theme,'ember','invalid saved themes fall back to ember (the SDK id of the old Night Signal ghost)');click('SZTHEMESLIGHT3');assert.equal(root.dataset.theme,'defxn-dune-light');
assert.equal(root.dataset.background,'atmosphere');assert.equal(mounts.length,1);
assert.equal(mounts[0].canvas,'hsl(var(--canvas))');assert.equal(mounts[0].sub.opacity,.37);
assert.equal(mounts[0].sub.blur,155);assert.equal(mounts[0].grain.opacity,.09);
// Atmosphere tuning is fixed now (atmosphereFixed); the old sliders that drove it stay removed.
assert(!events.SZSTRENGTHinput && !events.SZGRAINinput && !events.SZSOFTNESSinput);
// Cell size/spacing are discrete presets (not sliders), defaulting to the middle choice.
assert.equal(configs.SZSCALE1.attrs['aria-checked'],'true','cell size defaults to the standard preset');
assert.equal(configs.SZDENSITY1.attrs['aria-checked'],'true','cell spacing defaults to the balanced preset');
click('SZSCALE0');assert.equal(configs.SZSCALE0.attrs['aria-checked'],'true');assert.equal(configs.SZSCALE1.attrs['aria-checked'],'false');
click('SZDENSITY2');assert.equal(configs.SZDENSITY2.attrs['aria-checked'],'true');assert.equal(configs.SZDENSITY1.attrs['aria-checked'],'false');
click('SZRESTORE');assert.equal(configs.SZSCALE1.attrs['aria-checked'],'true','restore returns cell size to its default preset');assert.equal(configs.SZDENSITY1.attrs['aria-checked'],'true','restore returns cell spacing to its default preset');
assert.equal(mounts.length,1,'pattern control edits never remount the atmosphere background');
click('SZRESET');assert.deepEqual(rotation,[0,0]);assert.equal(options.placement,'top');
// Regression: controls and styling must be inside ARK's model, not appended DOM
// that disappears when the popover's content subtree is replaced.
const content=spec.tree.children.find(n=>n.slot==='content');
assert(content.children.some(n=>n.slot==='themesDark')&&content.children.some(n=>n.slot==='themesLight'),'themes are split into dark and light groups');
assert(!content.children.some(n=>n.slot==='themes'),'the old unified theme group stays removed');
assert(!content.children.some(n=>n.slot==='backgrounds'));
assert(!content.children.some(n=>n.slot==='strength'||n.slot==='grain'||n.slot==='softness'),'the old atmosphere-tuning sliders stay removed');
assert(content.children.some(n=>n.slot==='density'),'cell spacing is a real control inside ARK\'s model');
for(const slot of Object.values(spec.slots)){const saved=refs[slot.ref];ui.update(slot.ref,saved);assert.equal(refs[slot.ref].attrs.class,slot.config?.attrs?.class);}
assert.equal(configs.SZCONTENT.attrs.class,'settings-panel');assert.equal(configs.SZTRIGGER.attrs.class,'settings-trigger');
assert.equal(refs.SZTHEMESLIGHT3.attrs['aria-pressed'],'true');
windowEvents.pagehide();assert(!documentEvents.pointerdown);
console.log('PASS: document pointer events forward to ARK with cleanup; declarative controls/styles survive simulated ARK replacement, split dark/light theme selection, fixed atmosphere background, discrete cell-size/spacing presets with restore, reset, palette binding, pause integration. Runtime mocked.');

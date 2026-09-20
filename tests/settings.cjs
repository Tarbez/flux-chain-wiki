const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root={dataset:{}},data={paused:false},refs={},configs={},actions={},events={};let spec,subscriber,rotation,options,destroyed=0,mounts=[],updates=[],frame;
const documentEvents={},windowEvents={},outsideTargets=[];class TestNode {}
const ui={handleOutsidePointer(target){outsideTargets.push(target);},register(){},bindRefEvent(ref,event,fn){events[ref+event]=fn;},configureRef(ref,c){configs[ref]={...configs[ref],...c,attrs:{...configs[ref]?.attrs,...c.attrs}};},update(ref,state){refs[ref]={...state,attrs:{...configs[ref]?.attrs}};},onAction(ref,fn){actions[ref]=fn;}};
const context=vm.createContext({Node:TestNode,themeOptions:['ghost','bone'],createArkUI:()=>ui,defineArkHeadlessComponent:s=>s,
 createArkHeadlessComponent:(runtime,s)=>{spec=s;return {render(){for(const slot of Object.values(s.slots)){ui.configureRef(slot.ref,slot.config||{});ui.update(slot.ref,slot.state||{});}},mount(){s.mount(runtime,this);},getRef:k=>s.slots[k].ref};},createArkPopover:(runtime,o)=>{options=o;},
 ARK_BACKGROUND_PRESETS:{quiet:{}},createArkBackgroundConfig:()=>({base:{},grain:{},complementary:{},shapes:[{size:72}],extras:[]}),requestAnimationFrame:fn=>{frame=fn;return 1;},cancelAnimationFrame(){},mountArkBackground:(host,o)=>{mounts.push(o);return {destroy(){destroyed++;},update(o){updates.push(o);}};},
 document:{addEventListener(name,fn,capture){documentEvents[name]={fn,capture};},removeEventListener(name){delete documentEvents[name];},querySelector:()=>({prepend(){}}),documentElement:root,createElement:()=>({setAttribute(){}})},window:{addEventListener(name,fn){windowEvents[name]=fn;}},localStorage:{getItem:()=>'<invalid>',setItem(){}},
 ArkUI:{sceneState:{subscribe(fn){subscriber=fn;fn(data);},get:()=>data,pause(v){data.paused=v;subscriber(data);},orient(...v){rotation=v;}}}});
vm.runInContext(fs.readFileSync('scripts/settings-entry.js','utf8').replace(/^import .*;\n/gm,''),context);
const outside=new TestNode();documentEvents.pointerdown.fn({target:outside});assert.equal(outsideTargets[0],outside);assert.equal(documentEvents.pointerdown.capture,true);
const click=ref=>actions[ref](ref,{action:'CLICK'});
click('SZPAUSE');assert(data.paused);assert.equal(refs.SZPAUSE.text,'Resume motion');
click('SZPAUSE');assert(!data.paused);
assert.equal(root.dataset.theme,'original');click('SZTHEMES2');assert.equal(root.dataset.theme,'bone');
assert.equal(root.dataset.background,'atmosphere');assert.equal(mounts.length,1);
assert.equal(mounts[0].canvas,'hsl(var(--canvas))');assert.equal(mounts[0].sub.opacity,.37);
assert.equal(mounts[0].sub.blur,155);assert.equal(mounts[0].grain.opacity,.09);assert.equal(refs.SZSCALE.text,'66');
assert(!events.SZSTRENGTHinput && !events.SZGRAINinput);
events.SZSOFTNESSinput({}, {value:'99'});events.SZSCALEinput({}, {value:'120'});assert.equal(updates.length,0);frame();
assert.equal(updates.at(-1).sub.opacity,.37);assert.equal(updates.at(-1).sub.blur,99);assert.equal(updates.at(-1).grain.opacity,.09);
click('SZRESTORE');frame();assert.equal(updates.at(-1).sub.opacity,.37);assert.equal(refs.SZSOFTNESS.text,'155');assert.equal(refs.SZSCALE.text,'66');
assert.equal(mounts.length,1,'slider edits update the existing atmosphere');
click('SZRESET');assert.deepEqual(rotation,[0,0]);assert.equal(options.placement,'top');
// Regression: controls and styling must be inside ARK's model, not appended DOM
// that disappears when the popover's content subtree is replaced.
const content=spec.tree.children.find(n=>n.slot==='content');assert(content.children.some(n=>n.slot==='themes'));assert(!content.children.some(n=>n.slot==='backgrounds'));assert(!content.children.some(n=>n.slot==='strength'||n.slot==='grain'));assert(content.children.some(n=>n.slot==='softness'));
for(const slot of Object.values(spec.slots)){const saved=refs[slot.ref];ui.update(slot.ref,saved);assert.equal(refs[slot.ref].attrs.class,slot.config?.attrs?.class);}
assert.equal(configs.SZCONTENT.attrs.class,'settings-panel');assert.equal(configs.SZTRIGGER.attrs.class,'settings-trigger');
assert.equal(refs.SZTHEMES2.attrs['aria-pressed'],'true');
windowEvents.pagehide();assert(!documentEvents.pointerdown);
console.log('PASS: document pointer events forward to ARK with cleanup; declarative controls/styles survive simulated ARK replacement, theme selection, atmosphere-only controls, batched slider updates, bounds, reset, palette binding, pause integration. Runtime mocked.');

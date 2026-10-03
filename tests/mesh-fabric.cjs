/* Exercise the actual shared finite mesh controller with deterministic browser lifetimes. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let id=0,reads=0,paints=0,disconnections=0,subscriptions=0;
const frames=new Map(),docListeners=new Map(),mediaListeners=new Map();
const reduce={matches:false,addEventListener:(k,fn)=>mediaListeners.set(k,fn),removeEventListener:k=>mediaListeners.delete(k)};
const document={hidden:false,documentElement:{},addEventListener:(k,fn)=>docListeners.set(k,fn),removeEventListener:k=>docListeners.delete(k)};
let activeCells=[];
const ctx={setTransform(){},clearRect(){paints++;activeCells=[];},fillRect(x,y){const alpha=Number((this.fillStyle.match(/\/ ([0-9.]+)/)||[])[1]);if(alpha>=.2)activeCells.push([x,y]);},strokeRect(){},fillText(){}};
const canvas={dataset:{},getContext:()=>ctx,getBoundingClientRect(){reads++;return {width:420,height:140};}};
let listener;const ArkUI={agreementCellLevel:(stage,p)=>stage==='intent'?p*.6:p*.3,sceneState:{subscribe(fn){listener=fn;subscriptions++;fn({paused:false});return()=>{listener=null;subscriptions--;};}}};
class Observer{observe(){}disconnect(){disconnections++;}}
const window={devicePixelRatio:2,matchMedia:()=>reduce,requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:k=>frames.delete(k)};
const scope=vm.createContext({ArkUI,window,document,ResizeObserver:Observer,MutationObserver:Observer,getComputedStyle:()=>({getPropertyValue:()=> '180 40% 40%'})});
vm.runInContext(fs.readFileSync('js/ark/mesh-fabric.js','utf8'),scope);
const caption={textContent:''};const fabric=ArkUI.createMeshFabric(canvas,{caption});fabric.select('network',false);
assert.equal(canvas.width,630,'DPR is bounded at 1.5');assert.equal(frames.size,0);
const beforeReads=reads,beforePaints=paints;fabric.select('intent',true);
assert.equal(reads,beforeReads+1,'layout read only at interaction start');
for(let t=0;t<=800;t+=1000/60){for(const [key,fn] of [...frames]){frames.delete(key);fn(t);}}
assert.equal(frames.size,0,'settled mesh has no idle loop');assert.equal(reads,beforeReads+1,'frames never measure layout');
const painted=paints-beforePaints;assert(painted<=22,'finite response is capped at 30 paints/sec');
fabric.select('network',true);const stale=[...frames.values()][0];fabric.select('receipt',true);stale(900);assert.equal(frames.size,1,'cancelled callbacks cannot resurrect old motion');
listener({paused:true});assert.equal(frames.size,0,'pause settles existing cells');listener({paused:false});
reduce.matches=true;fabric.select('logic',true);assert.equal(frames.size,0,'reduced motion is static');reduce.matches=false;
fabric.select('intent',true);document.hidden=true;docListeners.get('visibilitychange')();assert.equal(frames.size,0,'hidden tabs stop motion');document.hidden=false;
const shapes=[];
for(const pattern of ['story-ask','story-work','story-check','story-goal','story-limits','story-request','story-proposal','story-promise','story-result','story-decision']){
 const before=paints;fabric.select(pattern,true,true);
 for(let t=0;t<=1800;t+=1000/60){for(const [key,fn] of [...frames]){frames.delete(key);fn(t);}}
 assert.equal(frames.size,0,'story response settles instead of looping');
 assert(paints-before<=50,'story choreography stays below 30 paints/sec');
 assert(activeCells.length>0,'story leaves a meaningful settled cell arrangement');shapes.push(JSON.stringify(activeCells));
}
assert.equal(new Set(shapes).size,10,'every story and inspection has a distinct settled cell arrangement');
fabric.select('story-decision',true,true);
for(const [key,fn] of [...frames]){frames.delete(key);fn(0);}
assert.equal(caption.textContent,'Keep the promise in place.');
for(const [key,fn] of [...frames]){frames.delete(key);fn(700);}
assert.equal(caption.textContent,'Compare the returned work with each rule.');
for(const [key,fn] of [...frames]){frames.delete(key);fn(1500);}
assert.equal(caption.textContent,'Record the outcome beside the checked rules.');
reduce.matches=true;fabric.select('story-promise',true,true);
assert.equal(caption.textContent,'These rules are the reference for checking the result.');reduce.matches=false;
fabric.dispose();assert.equal(subscriptions,0);assert.equal(docListeners.size,0);assert.equal(mediaListeners.size,0);assert.equal(disconnections,2);
for(let i=0;i<100;i++){const item=ArkUI.createMeshFabric(canvas);item.select('intent',true);item.dispose();}
assert.equal(frames.size,0);assert.equal(subscriptions,0);assert.equal(docListeners.size,0);assert.equal(mediaListeners.size,0);
// Background branding must use the same cells while leaving all brand pigments
// for information and actions. Static patterns must not start an animation loop.
const inks=[];
scope.getComputedStyle=()=>({getPropertyValue(name){inks.push(name);return '180 40% 40%';}});
const background=ArkUI.createMeshFabric(canvas,{background:true});
const arrangements=[];
for(const stage of ['network','logic','story-check','mesh-nodes','mesh-routes','mesh-tiles','mesh-frames']){
 background.select(stage,false);arrangements.push(JSON.stringify(activeCells));
 assert.equal(frames.size,0,'background patterns are static');
}
assert.equal(new Set(arrangements).size,7,'all seven backgrounds preserve distinct mesh arrangements');
assert(!inks.includes('--primary')&&!inks.includes('--complement')&&!inks.includes('--reference'),'background must remain neutral');
const motionPaints=paints;const motionReads=reads;background.animate();assert.equal(frames.size,1);for(let t=0;t<=2000;t+=1000/60){for(const [key,fn] of [...frames]){frames.delete(key);fn(t);}}assert.equal(frames.size,0,'micro scan settles between loops');assert(paints-motionPaints<=56,'micro scan limits painting to 30 fps');assert.equal(reads,motionReads+1,'micro scan measures once');background.animate();background.refresh();assert.equal(frames.size,0,'disable cancels micro scan');
background.dispose();assert.equal(subscriptions,0);
console.log(`PASS: shared mesh 10 distinct arrangements, ${painted} bounded paints, no frame layout reads, stale-frame cancellation, pause, reduced motion, visibility, and 100 disposal cycles.`);

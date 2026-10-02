/* Exercise the actual shared finite mesh controller with deterministic browser lifetimes. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let id=0,reads=0,paints=0,disconnections=0,subscriptions=0;
const frames=new Map(),docListeners=new Map(),mediaListeners=new Map();
const reduce={matches:false,addEventListener:(k,fn)=>mediaListeners.set(k,fn),removeEventListener:k=>mediaListeners.delete(k)};
const document={hidden:false,documentElement:{},addEventListener:(k,fn)=>docListeners.set(k,fn),removeEventListener:k=>docListeners.delete(k)};
const ctx={setTransform(){},clearRect(){paints++;},fillRect(){},strokeRect(){},fillText(){}};
const canvas={dataset:{},getContext:()=>ctx,getBoundingClientRect(){reads++;return {width:420,height:140};}};
let listener;const ArkUI={agreementCellLevel:(stage,p)=>stage==='intent'?p*.6:p*.3,sceneState:{subscribe(fn){listener=fn;subscriptions++;fn({paused:false});return()=>{listener=null;subscriptions--;};}}};
class Observer{observe(){}disconnect(){disconnections++;}}
const window={devicePixelRatio:2,matchMedia:()=>reduce,requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:k=>frames.delete(k)};
const scope=vm.createContext({ArkUI,window,document,ResizeObserver:Observer,MutationObserver:Observer,getComputedStyle:()=>({getPropertyValue:()=> '180 40% 40%'})});
vm.runInContext(fs.readFileSync('js/ark/mesh-fabric.js','utf8'),scope);
const fabric=ArkUI.createMeshFabric(canvas);fabric.select('network',false);
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
fabric.dispose();assert.equal(subscriptions,0);assert.equal(docListeners.size,0);assert.equal(mediaListeners.size,0);assert.equal(disconnections,2);
for(let i=0;i<100;i++){const item=ArkUI.createMeshFabric(canvas);item.select('intent',true);item.dispose();}
assert.equal(frames.size,0);assert.equal(subscriptions,0);assert.equal(docListeners.size,0);assert.equal(mediaListeners.size,0);
console.log(`PASS: shared mesh ${painted} bounded paints, no frame layout reads, stale-frame cancellation, pause, reduced motion, visibility, and 100 disposal cycles.`);

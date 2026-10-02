/* Run the real Home canvas controller with deterministic frame scheduling. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('js/lattice.js','utf8');
const controller=source.slice(source.indexOf('  // Home interactions repaint'),source.indexOf('  function tick()'));
let clock=0,nextId=0,measurements=0,paints=0,current={page:'zero',paused:false};
const frames=new Map(),clears=[],events={};
const ctx={clearRect:(...rect)=>clears.push(rect),fillRect:()=>paints++};
const canvas={dataset:{},getContext:()=>ctx};
const scene={contains:()=>true,addEventListener:(type,fn)=>{assert(!events[type]);events[type]=fn;},querySelector:()=>({getBoundingClientRect:()=>{measurements++;return {left:820,top:330,right:1320,bottom:448,width:500,height:118};}}),getBoundingClientRect:()=>{measurements++;return {left:0,top:0};}};
const sandbox={ArkUI:{},scene,activity:canvas,width:1440,height:900,cellWidth:15.5,cellHeight:10.5,colors:{activeLabel:'#0f8'},state:{get:()=>current},reduce:{matches:false},document:{hidden:false},performance:{now:()=>clock},unit:n=>Math.max(0,Math.min(1,n)),window:{requestAnimationFrame:fn=>{const id=++nextId;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id)}};
vm.createContext(sandbox);vm.runInContext(controller,sandbox);
function target(stage){const link={dataset:{stage}};return {closest:()=>link};}
function step(time){clock=time;for(const [id,fn] of [...frames]){frames.delete(id);fn(time);}}
events.focusin({target:target('intent')});
assert.equal(frames.size,1);
assert.equal(measurements,2,'geometry is read once per interaction');
let drawCount=0;
for(let t=0;t<=900;t+=1000/60){const before=clears.length;step(t);if(clears.length>before)drawCount++;}
assert(drawCount<=27,`painting must stay bounded at 30 fps, saw ${drawCount}`);
assert(paints>0);assert.equal(frames.size,0,'animation has no idle frame loop');
assert.equal(measurements,2,'frames do not read layout');
assert(clears.every(r=>r[2]<520&&r[3]<120),'only the cropped mesh region is cleared');
const settled=paints;step(2000);assert.equal(paints,settled,'settled hover paints nothing');
events.focusin({target:target('offer')});const stale=[...frames.values()][0];
events.focusin({target:target('agreement')});assert.equal(frames.size,1,'rapid switching retains only one callback');
const pending=frames.size;stale(2100);assert.equal(frames.size,pending,'cancelled callbacks cannot resurrect an old run');
events.pointerover({target:target('receipt')});assert.equal(canvas.dataset.homeMeshStage,'receipt','pointer has priority over keyboard focus');
events.pointerout({relatedTarget:null});assert.equal(canvas.dataset.homeMeshStage,'agreement');
current.page='about';step(2200);assert.equal(frames.size,0);assert(!canvas.dataset.homeMeshStage,'navigation clears pending activity');
current.page='zero';current.paused=true;sandbox.startHomeMesh('fulfillment',false);assert.equal(frames.size,0,'pause paints one static state');
current.paused=false;sandbox.reduce.matches=true;sandbox.startHomeMesh('receipt',false);assert.equal(frames.size,0,'reduced motion paints one static state');
sandbox.reduce.matches=false;sandbox.startHomeMesh('intent',false);sandbox.document.hidden=true;step(2300);assert.equal(frames.size,0,'hidden tabs cancel the loop');
sandbox.document.hidden=false;
for(let i=0;i<100;i++){sandbox.startHomeMesh('offer',false);sandbox.stopHomeMesh();}
assert.equal(frames.size,0,'repeated start/stop does not accumulate frames');
assert.equal(Object.keys(events).length,4,'delegated listeners are installed once');
console.log(`PASS: ${drawCount} bounded paints, two layout reads/run, cropped clears, idle silence, interruption, navigation, pause, reduced motion, visibility and 100 cleanup cycles.`);

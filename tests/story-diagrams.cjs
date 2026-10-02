const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class Node{
 constructor(tag){this.tag=tag;this.attrs={};this.children=[];this.style={};this.runs=[];}
 setAttribute(k,v){this.attrs[k]=v;}appendChild(n){this.children.push(n);return n;}
 getTotalLength(){return 100;}
 animate(frames,options){const run={frames,options,canceled:false,finished:Promise.resolve(),cancel(){this.canceled=true;}};this.runs.push(run);return run;}
}
let reduced=false,paused=false;const ctx={document:{createElementNS:(ns,tag)=>{assert.equal(ns,'http://www.w3.org/2000/svg');return new Node(tag);}},ArkUI:{prefersReducedMotion:()=>reduced,sceneState:{get:()=>({paused})}}};
vm.runInNewContext(fs.readFileSync('js/ark/story-diagrams.js','utf8'),ctx);
const create=ctx.ArkUI.createStoryDiagram;
const cell=create('practice'),net=create('purpose'),missing=create('spec');
assert.equal(cell.element.attrs['aria-hidden'],'true','the figure caption and labeled controls carry the explanation');
assert(cell.element.children.some(n=>n.textContent==='ONE OBJECT / BOUNDED AUTHORITY'));
assert(net.element.children.some(n=>n.textContent==='SEPARATE PRESENCE / SHARED SUBSTRATE'));
assert(missing.element.children.some(n=>n.textContent==='NO RAW ARTIFACT'),'missing evidence never gets an invented performance curve');
function runs(d){return d.element.children.flatMap(n=>n.runs);}
assert.equal(runs(cell).length,0,'no idle or mount animation');cell.select(2,true);
assert.equal(runs(cell).length,2,'selection moves its marker and traces the actual relationship');assert(runs(cell).every(r=>r.frames.every(f=>!('opacity' in f))));
const preceding=runs(cell).slice();cell.select(1,true);assert(preceding.every(r=>r.canceled),'a second selection cancels the preceding motion');cell.dispose();assert(runs(cell).every(r=>r.canceled));
reduced=true;cell.select(3,true);assert.equal(runs(cell).length,4);reduced=false;paused=true;cell.select(0,true);assert.equal(runs(cell).length,4,'pause updates state without motion');
const one=create('lifecycle',{count:1}),five=create('lifecycle',{count:5});assert.equal(five.element.children.filter(n=>n.tag==='rect').length-one.element.children.filter(n=>n.tag==='rect').length,4,'the illustrated reference trail grows by real named stages');
console.log('PASS: native chapter diagrams, no fabricated measurement, causal selection motion, interruption/disposal, pause/reduced motion, and growing record trail.');

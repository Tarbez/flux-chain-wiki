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
// 2026-10-19 (the story template, js/pages/story.js): a drawing sits in Ark's figure frame. Its
// title moved out of the SVG into the figure's caption -- drawn at 6-8px it was unreadable, and at
// the frame's 12px floor it no longer fit the drawing -- so it is returned, not drawn.
assert.equal(cell.title,'ONE OBJECT / BOUNDED AUTHORITY');assert(!cell.element.children.some(n=>n.textContent===cell.title),'the title is the caption, not a label inside the drawing');
assert.equal(net.title,'SEPARATE PRESENCE / SHARED SUBSTRATE');
// Every label the drawing writes is marked for the frame's 12px floor (docs/ux-audit/pages-ux-a.md #11).
const words=[cell,net,missing].flatMap(d=>d.element.children.filter(n=>n.tag==='text'));assert(words.length>0&&words.every(n=>n.attrs['data-ark-label']===''),'every drawn label carries data-ark-label');
// 2026-10-19: the benchmark figure stopped saying "NO RAW ARTIFACT" once the registry verified
// BENCH-006/-007/-009/-012/-013/-015 (docs/ux-audit/pages.md P4). The rule it drew is kept:
// the raw artifact comes first, and no performance curve is inferred from a figure.
assert(missing.element.children.some(n=>n.textContent==='ARTIFACT FIRST'),'the benchmark figure states the artifact rule');
assert(missing.element.children.some(n=>n.textContent==='NO PERFORMANCE CURVE INFERRED'),'missing evidence never gets an invented performance curve');
function runs(d){return d.element.children.flatMap(n=>n.runs);}
assert.equal(runs(cell).length,0,'no idle or mount animation');cell.select(2,true);
assert.equal(runs(cell).length,2,'selection moves its marker and traces the actual relationship');assert(runs(cell).every(r=>r.frames.every(f=>!('opacity' in f))));
const preceding=runs(cell).slice();cell.select(1,true);assert(preceding.every(r=>r.canceled),'a second selection cancels the preceding motion');cell.dispose();assert(runs(cell).every(r=>r.canceled));
reduced=true;cell.select(3,true);assert.equal(runs(cell).length,4);reduced=false;paused=true;cell.select(0,true);assert.equal(runs(cell).length,4,'pause updates state without motion');
// Offscreen (the figure scrolled away, Ark's figure-visibility): running motion stops and none starts.
paused=false;const away=create('practice');away.select(2,true);const before=runs(away).slice();away.visible(false);assert(before.every(r=>r.canceled),'scrolling away cancels the running motion');away.select(1,true);assert.equal(runs(away).length,before.length,'no motion starts while the figure is offscreen');away.visible(true);away.select(3,true);assert(runs(away).length>before.length,'motion resumes when the figure is back');away.dispose();
const one=create('lifecycle',{count:1}),five=create('lifecycle',{count:5});assert.equal(five.element.children.filter(n=>n.tag==='rect').length-one.element.children.filter(n=>n.tag==='rect').length,4,'the illustrated reference trail grows by real named stages');
console.log('PASS: native chapter diagrams (title as caption, 12px labels, paused offscreen), no fabricated measurement, causal selection motion, interruption/disposal, pause/reduced motion, and growing record trail.');

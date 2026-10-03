const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class Element{
 constructor(className='',rect={}){this.className=className;this.style={};this.children=[];this.attributes={};this.runs=[];this.rect={left:80,top:140,width:410,height:350,...rect};}
 getBoundingClientRect(){return this.rect;}
 appendChild(el){el.remove();el.parentNode=this;this.children.push(el);return el;}
 replaceChild(el,old){const i=this.children.indexOf(old);assert(i>=0);el.remove();this.children[i]=el;el.parentNode=this;old.parentNode=null;}
 replaceChildren(...els){this.children.forEach(el=>el.parentNode=null);this.children=[];els.forEach(el=>this.appendChild(el));}
 remove(){if(this.parentNode){this.parentNode.children=this.parentNode.children.filter(x=>x!==this);this.parentNode=null;}}
 querySelector(selector){for(const el of this.children){if(el.className.split(' ').includes(selector.slice(1)))return el;const match=el.querySelector(selector);if(match)return match;}return null;}
 setAttribute(name,value){this.attributes[name]=value;}
 removeAttribute(name){delete this.attributes[name];}
 getAttribute(name){return this.attributes[name]||null;}
 animate(frames,options){const run={frames,options,cancelled:false,cancel(){this.cancelled=true;}};this.runs.push(run);return run;}
}
const scope=vm.createContext({ArkUI:{},document:{createElement:()=>new Element()}});vm.runInContext(fs.readFileSync('js/ark/stage-scenes.js','utf8'),scope);
function page(id){const root=new Element(),body=root.appendChild(new Element());const surface=body.appendChild(new Element('stage-scene stage-scene-'+id));surface.setAttribute('aria-label',id+' illustration');surface.appendChild(new Element('contents-'+id));surface.activations=0;surface.arkStageActivate=function(){this.activations++;};return {root,surface};}
const shell=new Element('shell',{left:0,top:0}),bridge=scope.ArkUI.createStageRetention(shell);
const first=page('intent'),second=page('agreement');shell.appendChild(first.root);
bridge.hold(first.root,second.root,false);
assert.equal(first.root.querySelector('.stage-scene'),null,'surface leaves the fading route ancestry');
assert(shell.children.includes(first.surface),'same surface remains attached to the visible shell');
assert.equal(first.surface.runs.length,0,'the illustration box receives no opacity animation');
assert.equal(first.surface.children[0].runs.length,0,'outgoing illustration content never fades');
first.root.remove();shell.appendChild(second.root);bridge.commit(second.root);
assert.equal(second.root.querySelector('.stage-scene'),first.surface,'arrival reuses the identical illustration node');
assert.equal(first.surface.children[0].className,'contents-agreement','new contents replace the old scene');
bridge.activate(second.root);assert.equal(first.surface.activations,1,'the retained illustration starts its new stage motion after arrival');
assert.equal(first.surface.style.position,'');
const third=page('receipt');bridge.hold(second.root,third.root,false);bridge.hold(second.root,third.root,false);bridge.restore();
assert.equal(second.root.querySelector('.stage-scene'),first.surface,'interrupted navigation restores the same object');
assert.equal(shell.children.filter(el=>el.className.startsWith('stage-scene')).length,0,'no orphaned portal remains');
const previousRuns=first.surface.children[0].runs.length;bridge.hold(second.root,third.root,true);assert.equal(first.surface.children[0].runs.length,previousRuns,'reduced motion keeps the illustration static');bridge.commit(third.root);
assert.equal(third.root.querySelector('.stage-scene'),first.surface);
console.log('PASS: lifecycle illustration identity, opaque content, stage activation, interruption restoration, no orphan portal, and reduced motion.');

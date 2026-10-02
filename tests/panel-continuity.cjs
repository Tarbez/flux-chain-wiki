/* Regression: removing/fading a route root used to destroy the selected box. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
class Element {
  constructor(className = '', rect = {}) {
    this.className = className; this.rect = Object.assign({left:0,top:0,width:1280,height:800},rect);
    this.style = {}; this.dataset = {}; this.children = []; this.attributes = {}; this.runs = [];
    this.classList = {add:(name)=>{if (!this.className.split(' ').includes(name)) this.className += ' '+name;},remove:(name)=>{this.className=this.className.split(' ').filter(x=>x!==name).join(' ');}};
  }
  get firstChild() {return this.children[0];}
  appendChild(el) {el.remove();el.parentNode=this;this.children.push(el);return el;}
  replaceChild(el,old) {const i=this.children.indexOf(old);assert(i>=0);el.remove();this.children[i]=el;el.parentNode=this;old.parentNode=null;return old;}
  insertBefore(el,reference){const i=this.children.indexOf(reference);el.remove();this.children.splice(i,0,el);el.parentNode=this;return el;}
  replaceChildren(...els) {this.children.forEach(x=>x.parentNode=null);this.children=[];els.forEach(x=>this.appendChild(x));}
  remove() {if(this.parentNode){this.parentNode.children=this.parentNode.children.filter(x=>x!==this);this.parentNode=null;}}
  setAttribute(k,v){this.attributes[k]=v;}
  removeAttribute(k){if(k==='style')this.style={};delete this.attributes[k];}
  focus(){this.focused=true;}
  querySelector(selector){const all=this.children.flatMap(x=>[x,...x.descendants()]);if(selector.startsWith('.'))return all.find(x=>x.className.split(' ').includes(selector.slice(1)));const card=selector.match(/data-continuity-card="([^"]+)"/);if(card)return all.find(x=>x.dataset.continuityCard===card[1]);const key=selector.match(/data-scene-link="([^"]+)"/);return key?all.find(x=>x.dataset.sceneLink===key[1]):null;}
  closest(){if(this.dataset.continuityCard)return this;return this.parentNode&&this.parentNode.closest();}
  descendants(){return this.children.flatMap(x=>[x,...x.descendants()]);}
  getBoundingClientRect(){return Object.fromEntries(['left','top','width','height'].map(k=>[k,this.midpoint&&this.midpoint[k]!==undefined?this.midpoint[k]:this.style[k]?parseFloat(this.style[k]):this.rect[k]]));}
  animate(frames,options){let finish;const finished=new Promise(resolve=>{finish=resolve;});const run={frames,options,finished,finish,cancel:()=>{this.midpoint=null;finish();}};this.runs.push(run);return run;}
}
const context={ArkUI:{},document:{createElement:()=>new Element()}};
vm.runInNewContext(fs.readFileSync('js/ark/route.js','utf8'),context);
vm.runInNewContext(fs.readFileSync('js/ark/panel-continuity.js','utf8'),context);
function home(){const el=new Element();const box=el.appendChild(new Element('home-lifecycle',{left:820,top:320,width:320,height:340}));const link=box.appendChild(new Element('home-lifecycle-all'));link.dataset.sceneLink='lifecycle';return {el,box,link};}
(async()=>{
 const scene=new Element();const controller=context.ArkUI.createPanelContinuity(scene);const initial=home();scene.appendChild(initial.el);
 const intent=new Element('lifecycle-page');let plan=controller.begin('zero','lifecycle/intent',{zero:initial.el},initial.link);
 assert.equal(controller.host,initial.box,'the actual chosen source box survives, rather than a cloned rectangle');
 assert.equal(initial.box.parentNode,scene,'the box leaves the disposable route root');
 assert.equal(initial.link.parentNode.className,'continuity-origin','original contents remain in a measured wrapper during expansion');
 assert.equal(initial.link.parentNode.style.width,'318px','compact text cannot reflow as the outer panel grows');
 const opening=plan.commit(intent,false);assert.equal(controller.host,initial.box);assert.equal(intent.parentNode,initial.box);
 const run=initial.box.runs.at(-1);assert(run.frames.every(x=>!Object.hasOwn(x,'opacity')),'outer geometry must not fade');assert.equal(run.frames[0].width,'320px');assert.equal(run.frames[1].width,'1080px');run.finish();await opening;
 plan=controller.begin('lifecycle/intent','lifecycle/offer',{'lifecycle/intent':intent});const offer=new Element('lifecycle-page');const advancing=plan.commit(offer,false);initial.box.runs.at(-1).finish();await advancing;
 assert.equal(controller.host,initial.box,'child routes share the same host');assert.equal(intent.parentNode,null,'outgoing semantic content is replaced');assert.equal(offer.parentNode,initial.box);
 const restored=home();scene.appendChild(restored.el);plan=controller.begin('lifecycle/offer','zero',{'lifecycle/offer':offer});const returning=plan.commit(restored.el,false);initial.box.runs.at(-1).finish();await returning;
 assert.equal(controller.host,null);assert.equal(restored.el.querySelector('.home-lifecycle'),initial.box,'Back returns the same box to its source slot');assert(restored.el.querySelector('.home-lifecycle-all').focused,'Back restores its entry focus');
 const direct=context.ArkUI.createPanelContinuity(scene);plan=direct.begin(null,'lifecycle',{});const final=new Element('lifecycle-page');await plan.commit(final,true);const directHost=direct.host;
 assert.equal(directHost.runs.length,0,'direct links render final geometry without inventing a source');
 const directHome=home();scene.appendChild(directHome.el);plan=direct.begin('lifecycle','zero',{lifecycle:final});await plan.commit(directHome.el,true);
 assert.equal(directHome.el.querySelector('.home-lifecycle'),directHost,'a direct-link host acquires the compact source layout on return');
 const fast=context.ArkUI.createPanelContinuity(scene);const fastHome=home();scene.appendChild(fastHome.el);plan=fast.begin('zero','lifecycle',{zero:fastHome.el});const first=plan.commit(new Element('lifecycle-page'),false);
 fastHome.box.midpoint={left:480,top:200,width:600,height:450};plan=fast.begin('lifecycle','lifecycle/receipt',{});const last=plan.commit(new Element('lifecycle-page'),false);
 const rerouted=fastHome.box.runs.at(-1);assert.equal(rerouted.frames[0].width,'600px','interruption retargets from current geometry');rerouted.finish();await Promise.all([first,last]);assert.equal(fast.host,fastHome.box);
 const topics=context.ArkUI.createPanelContinuity(scene);context.location={hash:'#/concept?view=more'};
 const index=new Element(),card=index.appendChild(new Element('story-topic',{left:40,top:250,width:310,height:160}));card.dataset.continuityCard='concept/spec';
 const entry=card.appendChild(new Element());entry.dataset.sceneLink='concept/spec';scene.appendChild(index);
 plan=topics.begin('concept','concept/spec',{concept:index},entry);const chapter=new Element('guided-page');await plan.commit(chapter,true);
 assert.equal(topics.host,card,'the chosen topic surface is retained');assert.equal(topics.returnQuery('concept'),'view=more','reverse return retains the selected question group');
 const parent=new Element(),slot=parent.appendChild(new Element('story-topic',{left:40,top:280,width:310,height:160}));slot.dataset.continuityCard='concept/spec';const again=slot.appendChild(new Element());again.dataset.sceneLink='concept/spec';scene.appendChild(parent);
 plan=topics.begin('concept/spec','concept',{'concept/spec':chapter});await plan.commit(parent,true);
 assert.equal(parent.querySelector('[data-continuity-card="concept/spec"]'),card);assert(again.focused,'reverse topic return restores its selected link');assert.equal(topics.host,null);
 console.log('PASS: source identity, opaque geometry, inner-content replacement, reverse/focus return, direct links, reduced motion, and interrupted retargeting.');
})().catch(error=>{console.error(error);process.exitCode=1;});

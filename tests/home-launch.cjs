/* Exercise the real homepage module: audience disclosure, model, and teardown. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
class Element {
  constructor(tag) { this.tagName=tag; this.children=[]; this.dataset={}; this.attrs={}; this.listeners={}; this._text=''; }
  appendChild(child) { this.children.push(child); return child; }
  replaceChildren(...children) { this.children=children; this._text=''; }
  setAttribute(key,value) { this.attrs[key]=String(value); }
  addEventListener(key,fn) { this.listeners[key]=fn; }
  focus() { this.focused=true; }
  set textContent(value) { this._text=String(value); this.children=[]; }
  get textContent() { return this._text+this.children.map(child=>child.textContent).join(' '); }
  all() { return [this,...this.children.flatMap(child=>child.all())]; }
}
async function run(fail) {
  let settle,disposed=0,refreshed=0;
  const selections=[];
  const context={document:{createElement:tag=>new Element(tag)},ArkUI:{pageModules:{},pageCatalog:{},chainCases:[{id:'transfers',label:'Transfers'},{id:'staking',label:'Staking'}],buildChainFlow:options=>{selections.push(options);return {element:new Element('div'),restore:()=>refreshed++,dispose:()=>disposed++};}}};
  context.window=context;
  context.ArkPulse={get:()=>new Promise((resolve,reject)=>{settle=fail?reject:resolve;})};
  vm.createContext(context);
  for(const file of ['js/content/manifest.js','js/content/manifests/home.js','js/content/stats-highlights.js']) vm.runInContext(fs.readFileSync(file,'utf8'),context);
  for(const route of ['deployment','explorer','about','chain','stats','resolver','resolvers','download','deploy','dao']) context.ArkUI.pageCatalog[route]={path:'/'+route};
  vm.runInContext(fs.readFileSync('js/ark/dash-kit.js','utf8'),context);
  vm.runInContext(fs.readFileSync('js/pages/home.js','utf8'),context);
  const host=new Element('main'),root=context.ArkUI.pageModules.zero.mount(host);
  const byClass=name=>root.all().filter(el=>(el.className||'').split(' ').includes(name));
  const tabs=byClass('hl-audience-tab'),panel=byClass('hl-audience-panel')[0];
  assert.equal(tabs.length,3);
  assert.equal(tabs.filter(tab=>tab.attrs['aria-selected']==='true').length,1);
  assert.equal(panel.all().filter(el=>el.tagName==='a').length,3,'only one audience action and its two references are rendered');
  assert(panel.textContent.includes('For the curious'));
  tabs[1].listeners.click();
  assert(panel.textContent.includes('For developers & founders'));
  assert(!panel.textContent.includes('Walk the chain'),'other audience references leave the panel');
  let prevented=false;
  tabs[1].listeners.keydown({key:'ArrowRight',preventDefault:()=>{prevented=true;}});
  assert(prevented && tabs[2].focused);
  assert.equal(tabs[2].tabIndex,0);
  assert.equal(tabs[1].tabIndex,-1);
  assert.equal(panel.attrs['aria-labelledby'],tabs[2].id);
  assert(panel.textContent.includes('For operators & partners'));
  tabs[2].listeners.keydown({key:'Home',preventDefault(){}});
  assert.equal(tabs[0].attrs['aria-selected'],'true');
  assert.equal(selections[0].rich,true,'restore the rich original chain scene');
  assert.equal(selections[0].inline,true,'hero steps explore in place, not competing route links');
  assert.equal(selections[0].caseId,'transfers');
  const cases=byClass('hl-case');
  assert.equal(cases.length,2,'one button per example');
  assert.equal(cases.find(b=>b.dataset.case==='transfers').attrs['aria-pressed'],'true','the current example is pressed');
  cases.find(b=>b.dataset.case==='staking').listeners.click();
  assert.equal(cases.find(b=>b.dataset.case==='staking').attrs['aria-pressed'],'true','choosing an example presses it');
  assert.equal(disposed,1,'changing the example disposes its previous animation');
  assert.equal(selections.at(-1).caseId,'staking');
  assert(root.textContent.includes('Illustrative / not live traffic'));
  assert(root.textContent.includes('not end-to-end transaction rates'));
  assert(root.textContent.includes('BENCH-013'));
  assert(root.all().filter(el=>el.tagName==='a').every(el=>el.href==='#'+context.ArkUI.pageCatalog[el.dataset.sceneLink].path));
  root.arkRestore();assert.equal(refreshed,1);
  if(fail) {
    settle(new Error('offline'));await new Promise(resolve=>setImmediate(resolve));
    assert(byClass('hl-pulse')[0].textContent.includes('unavailable'));
  } else {
    root.arkDispose();settle({data:{nodes:[],aggregate_qps:0}});await new Promise(resolve=>setImmediate(resolve));
    assert.equal(disposed,2);
    assert.equal(byClass('hl-pulse')[0].textContent,'Fleet measurement loading','late response cannot update a disposed page');
  }
}
Promise.all([run(false),run(true)]).then(()=>console.log('PASS: homepage audience tabs, keyboard selection, model, evidence, routes, failure state, and teardown.')).catch(error=>{console.error(error);process.exitCode=1;});

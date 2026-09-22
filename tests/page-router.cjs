const assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
class Element {
  constructor() { this.children=[];this.dataset={};this.attrs={};this.style={};this.scrollTop=0;this.hidden=false; }
  appendChild(el){el.parent=this;this.children.push(el);return el;}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(el=>el!==this);}
  setAttribute(key,value){this.attrs[key]=value;if(key==='hidden')this.hidden=true;}
  removeAttribute(key){delete this.attrs[key];if(key==='hidden')this.hidden=false;}
  getAnimations(){return [];}
  contains(el){return this===el||this.children.some(child=>child.contains(el));}
  focus(){}
  querySelector(){return null;}
}
const document={createElement:()=>new Element(),querySelector:()=>null,activeElement:null};
const context=vm.createContext({console,document,window:{matchMedia:()=>({matches:true})},getComputedStyle:()=>({opacity:'1',transform:'none'}),ArkUI:{prefersReducedMotion:()=>true}});
for(const file of ['js/ark/vendor/engines.js','js/content/learnings.js','js/content/article-index.js','js/ark/scene-state.js','js/pages/catalog.js','js/ark/page-router.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
(async()=>{
 const scene=new Element(),canvas=scene.appendChild(new Element()),header=scene.appendChild(new Element()),outlet=scene.appendChild(new Element());
 const loads={},mounts={},disposed={},writes=[];let resolveSlow,failConcept=true;
 function module(page){return {mount(host){mounts[page]=(mounts[page]||0)+1;return host.appendChild(new Element());}};}
 const router=context.ArkUI.createPageRouter({scene,outlet,state:context.ArkUI.sceneState,writeHistory:(page,mode)=>writes.push([page,mode]),load:async(page)=>{
   loads[page]=(loads[page]||0)+1;
   if(page==='proximity')return new Promise(resolve=>{resolveSlow=()=>resolve(module(page));});
   if(page==='concept'&&failConcept){failConcept=false;throw Error('Network fixture');}
   return module(page);
 }});
 router.onMount((el,page)=>()=>{disposed[page]=(disposed[page]||0)+1;});
 let error=false;router.onStatus((message,failed)=>{error=failed;});
 assert(await router.navigate('zero'));assert.equal(outlet.children.length,1);
 assert.deepEqual(Object.keys(loads),['zero'],'Home must not fetch other pages');
 await router.navigate('learnings');const oldLearning=router.pages.learnings;oldLearning.scrollTop=321;
 await router.navigate('zero');assert.equal(oldLearning.parent.children.includes(oldLearning),false);assert.equal(disposed.learnings,1);
 await router.navigate('learnings');assert.notEqual(router.pages.learnings,oldLearning);assert.equal(router.pages.learnings.scrollTop,321);assert.equal(loads.learnings,1);
 const slow=router.navigate('proximity');await router.navigate('zero');resolveSlow();assert.equal(await slow,false);assert.equal(router.active,'zero');assert(!mounts.proximity);
 assert.equal(await router.navigate('concept'),false);assert.equal(router.active,'zero');assert(error);assert.equal(outlet.children.length,1);
 assert(await router.retry());assert.equal(router.active,'concept');assert.equal(loads.concept,2);
 await router.navigate('article/from-points-to-form',{history:'none'});assert.equal(outlet.children.length,1);
 assert.equal(scene.children[0],canvas);assert.equal(scene.children[1],header);assert.equal(scene.children[2],outlet);
 assert.equal(router.resolve('#/about'),'about');
// Reason this case exists: the header link was `#/work`, a catalog route whose page file had been deleted, so WORK opened a
// page that could never load. Both legacy spellings now resolve to the lab, and the catalog assets check below keeps it so.
assert.equal(router.resolve('#/work'),'lab');assert.equal(Object.keys(context.ArkUI.pageCatalog).includes('work'),false);
 assert.equal(router.resolve('#/experiments/lab'),'lab');assert.equal(router.resolve('#work'),'lab');
 assert(!context.ArkUI.pageCatalog.proximity.scripts.includes('js/studio.js'));
 assert(!fs.readFileSync('js/pages/experiments.js','utf8').includes('mountStudio'));
 assert(fs.readFileSync('js/pages/lab.js','utf8').includes('The open lab'));
 assert.equal(router.resolve('#/experiments'),'proximity');assert.equal(router.resolve('#proximity'),'proximity');
 assert.equal(router.resolve('#/learnings/from-points-to-form'),'article/from-points-to-form');assert.equal(router.url('zero'),'#/');
 assert.equal(writes.at(-1)[1],'none');
 await router.navigate('about');assert.equal(router.active,'about');assert.equal(context.ArkUI.sceneState.get().page,'about');
 await router.navigate('lab');assert.equal(router.active,'lab');assert.equal(outlet.children.length,1);assert.equal(context.ArkUI.sceneState.get().page,'lab');
 for(const key of ['__proto__','constructor','toString']) { assert.equal(router.resolve('#'+key),'zero'); await assert.rejects(router.navigate(key),/Unknown page/); }
 const html=fs.readFileSync('index.html','utf8');assert(!html.includes('class="expansion"'));assert(!html.includes('js/content/articles/'));assert(!html.includes('src="js/studio.js"'));assert(!html.includes('src="js/resolvers/learnings.js"'));
 for(const definition of Object.values(context.ArkUI.pageCatalog)) for(const file of definition.scripts)assert(fs.existsSync(file),file);
 console.log('PASS: lazy home, module caching, outgoing DOM disposal, scroll restoration, last request wins, failure/retry, deep links/history, stable canvas/header/outlet identities, catalog assets.');
})().catch(error=>{console.error(error);process.exitCode=1;});

const assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
class Element {
  constructor() { this.children=[];this.dataset={};this.attrs={};this.style={};this.scrollTop=0;this.hidden=false;this.classList={values:new Set(),add(name){this.values.add(name);},remove(name){this.values.delete(name);},contains(name){return this.values.has(name);},toggle(name,on){if(on)this.add(name);else this.remove(name);}}; }
  appendChild(el){el.parent=this;this.children.push(el);return el;}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(el=>el!==this);}
  setAttribute(key,value){this.attrs[key]=value;if(key==='hidden')this.hidden=true;}
  removeAttribute(key){delete this.attrs[key];if(key==='hidden')this.hidden=false;}
  getAnimations(){return [];}
  contains(el){return this===el||this.children.some(child=>child.contains(el));}
  focus(){}
  querySelector(){return null;}
}
const description={value:'Initial site description',getAttribute(){return this.value;},setAttribute(key,value){if(key==='content')this.value=value;}};
const head=new Element();
const documentElement=new Element();
const document={head,documentElement,createElement:()=>new Element(),querySelector:selector=>{
 if(selector==='meta[name="description"]')return description;
 // Broadened beyond name|property|rel so a script[data-ark-ld="1"]-style selector (the
 // JSON-LD block's own identity, dedup-checked on every navigation) matches too -- the
 // real DOM accepts any attribute name here, this stub previously only modeled three.
 const match=selector.match(/\[([\w-]+)="([^"]+)"\]/);
 return match?head.children.find(el=>el.attrs[match[1]]===match[2])||null:null;
},activeElement:null};
const window={scrollY:0,scrollTo(x,y){this.scrollY=y;},matchMedia:()=>({matches:true}),dispatchEvent(){}};
const context=vm.createContext({console,document,window,Event,getComputedStyle:()=>({opacity:'1',transform:'none'}),ArkUI:{prefersReducedMotion:()=>true}});
for(const file of ['js/ark/vendor/engines.js','js/content/learnings.js','js/content/article-index.js','js/ark/scene-state.js','js/content/site-pages.js','js/pages/catalog.js','js/ark/route.js','js/ark/page-router.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
context.ArkSEO={pageDescription:(id,fallback)=>id==='about'?'About-specific description':fallback,articleDescription:(id,fallback)=>fallback,
 ogImage:(map,id)=>id==='about'?'https://example.com/about.png':'',canonical:(map,id)=>id==='about'?'https://example.com/about':'',
 site:()=>({name:'Test Site',baseUrl:'https://example.com',org:'Organization',lang:'en',handle:'@teststudio',defaultDescription:'Initial site description'}),
 noindex:(map,id)=>id==='about',aiBlocked:(map,id)=>id==='about',
 schemaType:(map,id,fallback)=>id==='about'?'AboutPage':fallback,
 aiSummary:(map,id,fallback)=>fallback};
(async()=>{
 const scene=new Element(),canvas=scene.appendChild(new Element()),header=scene.appendChild(new Element()),outlet=scene.appendChild(new Element());
 const loads={},mounts={},disposed={},writes=[];let resolveSlow,failConcept=true;
 function module(page){return {mount(host){mounts[page]=(mounts[page]||0)+1;const el=host.appendChild(new Element());if(page==='learnings')el.classList.add('learning-page');return el;}};}
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
 await router.navigate('learnings');const oldLearning=router.pages.learnings;window.scrollTo(0,321);
 await router.navigate('zero');assert.equal(oldLearning.parent.children.includes(oldLearning),false);assert.equal(disposed.learnings,1);
 assert.equal(window.scrollY,0,'non-reading routes reset document scroll');
 await router.navigate('learnings');assert.notEqual(router.pages.learnings,oldLearning);assert.equal(window.scrollY,321,'reading routes restore document scroll');assert.equal(router.pages.learnings.scrollTop,0,'reading pages do not scroll internally');assert.equal(loads.learnings,1);
 const slow=router.navigate('proximity');await router.navigate('zero');resolveSlow();assert.equal(await slow,false);assert.equal(router.active,'zero');assert(!mounts.proximity);
 assert.equal(await router.navigate('concept'),false);assert.equal(router.active,'zero');assert(error);assert.equal(outlet.children.length,1);
 assert(await router.retry());assert.equal(router.active,'concept');assert.equal(loads.concept,2);
 await router.navigate('article/why-the-chain-was-retired',{history:'none'});assert.equal(outlet.children.length,1);
 assert.equal(scene.children[0],canvas);assert.equal(scene.children[1],header);assert.equal(scene.children[2],outlet);
 assert.equal(router.resolve('#/about'),'about');
// Reason this case exists: the header link was `#/work`, a catalog route whose page file had been deleted, so WORK opened a
// page that could never load. Both legacy spellings now resolve to the interactive model.
// 2026-10-19 (docs/ux-audit/pages.md P3): /experiments and /experiments/lab were two pages for one model with the same h1;
// they are one page at /experiments (key 'proximity', drawn by the lab module), and the old lab address is an alias of it.
assert.equal(router.resolve('#/work'),'proximity');assert.equal(Object.keys(context.ArkUI.pageCatalog).includes('work'),false);
 assert.equal(router.resolve('#/experiments/lab'),'proximity');assert.equal(router.resolve('#work'),'proximity');
 assert.equal(router.resolve('/experiments/lab'),'proximity','the old lab path opens the merged page');
 assert.equal(Object.keys(context.ArkUI.pageCatalog).includes('lab'),false,'one catalog entry for the interactive model');
 assert.equal(context.ArkUI.pageCatalog.proximity.module,'lab','the merged page is the lab');
 assert(fs.readFileSync('js/pages/lab.js','utf8').includes('Interactive model'));
// 2026-10-19 (docs/ux-audit/pages.md P8): an address nothing answers used to resolve to Home, silently. It resolves to the
// not-found page, which names it; aliases (/explorer, /monitor) still open their page.
 assert.equal(router.resolve('/no-such-page'),'notfound');assert.equal(router.resolve('/explorer'),'explorer');assert.equal(router.resolve('/monitor'),'stats');
 assert.equal(router.resolve('#'),'zero');assert.equal(router.resolve(''),'zero');
 assert.equal(router.resolve('#/experiments'),'proximity');assert.equal(router.resolve('#proximity'),'proximity');
 assert.equal(router.resolve('#/lifecycle'),'lifecycle');assert.equal(router.url('lifecycle'),'#/lifecycle');
 assert.equal(context.ArkUI.sceneState.pages.lifecycle.mesh,'zero');
 for(const id of ['intent','offer','agreement','fulfillment','receipt']) {
  const key='lifecycle/'+id;
  assert.equal(router.resolve('#/'+key),key);
  assert.equal(router.url(key),'#/'+key);
  assert.equal(context.ArkUI.sceneState.pages[key].mesh,'zero');
 }
 assert.equal(router.resolve('#/learnings/why-the-chain-was-retired'),'article/why-the-chain-was-retired');assert.equal(router.url('zero'),'#/');
 assert.equal(router.resolve('#/learnings/why-the-chain-was-retired?q=3'),'article/why-the-chain-was-retired','question links resolve to the parent article');
// Clean paths (served over http) resolve exactly like the old #/ forms, and the explorer moved from /explorer to /explore.
assert.equal(router.resolve('/explore'),'explorer');assert.equal(router.resolve('/explore/'),'explorer','a trailing slash is the same route');assert.equal(router.resolve('/explorer'),'explorer','the old explorer address still lands on the explorer');assert.equal(router.resolve('#/explorer'),'explorer');
assert.equal(router.resolve('/learnings/why-the-chain-was-retired'),'article/why-the-chain-was-retired');assert.equal(router.resolve('/'),'zero');assert.equal(router.resolve('/no-such-page'),'notfound','an unknown address names itself instead of showing Home');
// /monitor was retired 2026-10-10; a bookmarked link must land on /stats, not silently redirect to home.
assert.equal(router.resolve('/monitor'),'stats','a bookmarked /monitor link lands on stats, which carries the live pulse now');assert.equal(router.resolve('#/monitor'),'stats');
 assert.equal(writes.at(-1)[1],'none');
 await router.navigate('about');assert.equal(router.active,'about');assert.equal(context.ArkUI.sceneState.get().page,'about');
 assert.equal(description.value,'About-specific description');
 assert.equal(document.querySelector('meta[property="og:description"]').attrs.content,description.value);
 assert.equal(document.querySelector('meta[property="og:title"]').attrs.content,document.title);
 assert.equal(document.querySelector('meta[name="twitter:card"]').attrs.content,'summary_large_image');
 assert.equal(document.querySelector('link[rel="canonical"]').attrs.href,'https://example.com/about');
 assert.equal(document.documentElement.lang,'en','site language is reflected onto <html lang>');
 assert.equal(document.querySelector('meta[name="twitter:site"]').attrs.content,'@teststudio','the site-wide social handle is set regardless of route');
 assert.equal(document.querySelector('meta[name="robots"]').attrs.content,'noindex, noai, noimageai','a page marked noindex+aiBlocked gets one combined robots directive');
 const ld=JSON.parse(document.querySelector('script[data-ark-ld="1"]').textContent);
 assert.equal(ld['@context'],'https://schema.org');
 assert.equal(ld['@type'],'AboutPage','an explicit schemaType override wins over the derived WebPage/Article fallback');
 assert.equal(ld.description,'About-specific description');
 assert.equal(head.children.filter(el=>el.attrs['data-ark-ld']==='1').length,1,'the JSON-LD block is written once, not appended again on re-render');
 await router.navigate('deploy');assert.equal(router.active,'deploy');assert.equal(outlet.children.length,1);assert.equal(context.ArkUI.sceneState.get().page,'deploy');
 assert.equal(description.value,'Initial site description','routes without overrides must not inherit the previous route description');
 for(const selector of ['link[rel="canonical"]','meta[property="og:url"]','meta[property="og:image"]','meta[name="twitter:image"]','meta[name="robots"]']) assert.equal(document.querySelector(selector),null,'stale optional metadata removed: '+selector);
 assert.equal(document.querySelector('meta[name="twitter:card"]').attrs.content,'summary');
 const ldAfter=JSON.parse(document.querySelector('script[data-ark-ld="1"]').textContent);
 assert.equal(ldAfter['@type'],'WebPage','a route with no schemaType override derives the generic WebPage type, not the previous route\'s AboutPage');
 assert.equal(head.children.filter(el=>el.attrs.property==='og:title').length,1,'navigation updates tags without duplicates');
 const savedAboutScene=context.ArkUI.sceneState.pages.about;
 delete context.ArkUI.sceneState.pages.about;
 const preservedPage=router.pages.deploy;
 assert.equal(await router.navigate('about'),false,'missing scene config fails before handoff');
 assert.equal(router.active,'deploy');assert.equal(router.pages.deploy,preservedPage);
 assert.equal(preservedPage.hidden,false,'failed route leaves current content visible');
 assert.equal(outlet.children.length,1,'failed route does not mount a hidden replacement');
 context.ArkUI.sceneState.pages.about=savedAboutScene;
 for(const key of ['__proto__','constructor','toString']) { assert.equal(router.resolve('#'+key),'notfound'); await assert.rejects(router.navigate(key),/Unknown page/); }

 const animatedRoot=new Element();animatedRoot.dataset.arkPage='zero';
 animatedRoot.calls=[];animatedRoot.animate=function(frames,timing){this.calls.push({frames,timing});return {finished:Promise.resolve(),cancel(){}};};
 const staggered=Array.from({length:3},()=>animatedRoot.appendChild(new Element()));
 staggered.forEach(item=>{item.calls=[];item.animate=function(frames,timing){this.calls.push({frames,timing});return {finished:Promise.resolve(),cancel(){}};};});
 animatedRoot.querySelectorAll=()=>staggered;
 const elementPresence=context.ArkUI.createPresence({zero:animatedRoot});
 await elementPresence.hide('zero',false);
 assert(staggered[0].calls[0].timing.delay>staggered[2].calls[0].timing.delay,'exit cascades across elements in reverse order');
 assert(staggered.every(item=>!item.hidden),'exit does not hide individual elements permanently');
 assert(animatedRoot.hidden,'the page hides only after its element exits');
 assert.equal(animatedRoot.calls[0].frames.at(-1).opacity,'0','root fades unmatched content as well as staggered elements');
 await elementPresence.enter('zero',false);
 assert(staggered[0].calls[1].timing.delay<staggered[2].calls[1].timing.delay,'enter reveals individual elements in reading order');
 assert(!animatedRoot.hidden,'the page remains available after its element entrances');
 assert.equal(animatedRoot.calls[1].frames[0].opacity,'0','root starts concealed on entry');

 const articleRoot=new Element();articleRoot.dataset.arkPage='article/test';articleRoot.hidden=true;
 const articleTitle=articleRoot.appendChild(new Element()),hiddenAnswer=articleRoot.appendChild(new Element());
 hiddenAnswer.hidden=true;
 for(const item of [articleTitle,hiddenAnswer]) {
  item.parentElement=articleRoot;item.calls=[];
  item.animate=function(frames,timing){this.calls.push({frames,timing});return {finished:Promise.resolve(),cancel(){}};};
 }
 articleRoot.querySelectorAll=()=>[articleTitle,hiddenAnswer];
 const articlePresence=context.ArkUI.createPresence({article:articleRoot});
 await articlePresence.enter('article',false);
 assert.equal(articleTitle.calls.length,1,'the visible article title enters even while its page root starts hidden');
 assert.equal(hiddenAnswer.calls.length,0,'unselected answer chunks never animate');

 const presenceCalls=[],presenceModes=[];let releaseExit;
 context.ArkUI.prefersReducedMotion=()=>false;
 context.ArkUI.createPresence=()=>({
   hide(page,immediate){presenceCalls.push('hide:'+page);presenceModes.push(['hide',page,!!immediate]);if(immediate)return Promise.resolve();return new Promise(resolve=>{releaseExit=resolve;});},
   enter(page){presenceCalls.push('enter:'+page);return Promise.resolve();},
   show(page,immediate){presenceCalls.push('show:'+page);presenceModes.push(['show',page,!!immediate]);return Promise.resolve();}
 });
 const transitionScene=new Element(),transitionOutlet=transitionScene.appendChild(new Element());
 const transitionState={page:'zero',get(){return {page:this.page,paused:false};},navigate(page){this.page=page;}};
 const transitionRouter=context.ArkUI.createPageRouter({scene:transitionScene,outlet:transitionOutlet,state:transitionState,
   catalog:{zero:{path:'/',title:'Home'},'lifecycle/intent':{path:'/lifecycle/intent',title:'Intent'}},
   load:async()=>({mount(host){return host.appendChild(new Element());}}),writeHistory(){}
 });
 await transitionRouter.navigate('zero');presenceCalls.length=0;
 const transitioning=transitionRouter.navigate('lifecycle/intent');
 for(let i=0;i<10&&!releaseExit;i++)await Promise.resolve();
 assert.equal(transitionState.page,'zero','outgoing page keeps its layout for its entire exit');
 assert(transitionRouter.pages.zero,'outgoing page remains mounted until its exit finishes');
 assert(transitionRouter.pages['lifecycle/intent'].hidden,'incoming content remains hidden during exit');
 releaseExit();releaseExit=null;
 for(let i=0;i<10&&!transitionState.lifecycleRun;i++)await Promise.resolve();
 assert.equal(transitionState.page,'lifecycle/intent','grid zoom starts with route change');
 assert(transitionScene.classList.contains('is-lifecycle-transition'),'canvas opacity stays stable during the zoom');
 assert.equal(transitionRouter.pages.zero,undefined,'home is removed before lifecycle styles can reflow its cards');
 assert.deepEqual(presenceCalls,['hide:zero','enter:lifecycle/intent'],'incoming content starts as soon as the outgoing page is removed');
 const run=transitionState.lifecycleRun;
 const timing=context.ArkUI.lifecycleTransition;
 run.advance(timing.zoomMs);await Promise.resolve();await Promise.resolve();
 assert.deepEqual(presenceCalls,['hide:zero','enter:lifecycle/intent'],'content stays in the same handoff as the mesh zoom');
 assert(Math.abs(timing.opacityOut(timing.enterMs)-.2)<.001,'incoming starts while 20% of outgoing content is still visible');
 assert.equal(timing.opacityIn(timing.enterMs),0);
 assert(timing.opacityOut(timing.enterMs+20)>0&&timing.opacityIn(timing.enterMs+20)>0,'both content layers are visible during the crossfade');
 run.advance(timing.enterMs);await Promise.resolve();await Promise.resolve();
 assert(presenceCalls.includes('enter:lifecycle/intent'),'new content is not delayed until the late overlap point');
 run.finish();await transitioning;
 assert(!transitionScene.classList.contains('is-lifecycle-transition'),'transition styles clear after arrival');
 presenceCalls.length=0;
 const returning=transitionRouter.navigate('zero');
 for(let i=0;i<10&&!releaseExit;i++)await Promise.resolve();
 assert.equal(transitionState.page,'lifecycle/intent','reverse transition also retains outgoing route styles');
 releaseExit();releaseExit=null;
 for(let i=0;i<10&&transitionState.page!=='zero';i++)await Promise.resolve();
 const reverseRun=transitionState.lifecycleRun;
 assert(reverseRun,'zoom-out uses the same canvas timeline');
 assert.equal(transitionRouter.pages['lifecycle/intent'],undefined,'the outgoing stage is removed before home styles apply');
 assert.deepEqual(presenceCalls,['hide:lifecycle/intent','enter:zero'],'home begins entering with the zoom-out');
 reverseRun.advance(timing.zoomMs);await Promise.resolve();await Promise.resolve();
 assert.deepEqual(presenceCalls,['hide:lifecycle/intent','enter:zero']);
 reverseRun.advance(timing.enterMs);await Promise.resolve();await Promise.resolve();
 assert(presenceCalls.includes('enter:zero'),'home does not wait for the late overlap point');
 reverseRun.finish();await returning;
 assert.equal(transitionRouter.active,'zero');
 const stageScene=new Element(),stageOutlet=stageScene.appendChild(new Element());
 const stageState={get(){return {paused:false};},navigate(){}};
 const stageRouter=context.ArkUI.createPageRouter({scene:stageScene,outlet:stageOutlet,state:stageState,
   catalog:{'lifecycle/receipt':{path:'/lifecycle/receipt',title:'Receipt'},'lifecycle/agreement':{path:'/lifecycle/agreement',title:'Agreement'}},
   load:async()=>({mount(host){return host.appendChild(new Element());}}),writeHistory(){}
 });
 await stageRouter.navigate('lifecycle/receipt');presenceCalls.length=0;presenceModes.length=0;
 await stageRouter.navigate('lifecycle/agreement');
 assert.deepEqual(presenceCalls,['hide:lifecycle/receipt','show:lifecycle/agreement'],'stage navigation swaps content without page entrance/exit fades');
 assert.deepEqual(presenceModes,[['hide','lifecycle/receipt',true],['show','lifecycle/agreement',true]],'both sides of a stage swap use immediate page presence');
 // Apply the same handoff invariant to every registered route, not just lifecycle.
 const allScene=new Element(),allOutlet=allScene.appendChild(new Element());
 const allState={get(){return {paused:false};},navigate(page){
   assert.equal(allOutlet.children.length,1,'no outgoing DOM survives the route-style switch: '+page);
   assert.equal(allOutlet.children[0].dataset.arkPage,page);
   assert(allOutlet.children[0].hidden,'incoming page is concealed at the route-style switch: '+page);
 }};
 const allRouter=context.ArkUI.createPageRouter({scene:allScene,outlet:allOutlet,state:allState,catalog:context.ArkUI.pageCatalog,
   load:async()=>({mount(host){return host.appendChild(new Element());}}),writeHistory(){}
 });
 for(const page of Object.keys(context.ArkUI.pageCatalog)) {
   let settled=false;const hop=allRouter.navigate(page).then(value=>{settled=true;return value;});
   for(let i=0;i<40&&!settled;i++) {
     await Promise.resolve();
     if(releaseExit){const release=releaseExit;releaseExit=null;release();}
     if(allState.lifecycleRun)allState.lifecycleRun.finish();
   }
   assert(settled,'transition settles: '+page);assert(await hop);
 }
 const lifecycleCss=fs.readFileSync('css/lifecycle.css','utf8');
 assert(!lifecycleCss.includes('.lifecycle-departing'),'no partial home hide may leave its status and cards exposed');
 assert(lifecycleCss.includes('#scene .ark-page[hidden] { display:none !important; }'),'hidden home page cannot show early on zoom-out');
 const html=fs.readFileSync('index.html','utf8');assert(!html.includes('class="expansion"'));assert(!html.includes('js/content/articles/'));assert(!html.includes('src="js/studio.js"'));assert(!html.includes('src="js/resolvers/learnings.js"'));
 for(const definition of Object.values(context.ArkUI.pageCatalog)) for(const file of definition.scripts)assert(fs.existsSync(file),file);

 // Part G (follow-up plan): the background in/out transition (js/content/
 // canvas-transitions.js), wired into navigate() itself. A real module instance, a
 // real persistent-layer element, and the real fadeCanvas() call sites -- not a
 // reimplementation of the sequencing to check against itself.
 {
  const canvasModuleContext=vm.createContext({window:{}});
  vm.runInContext(fs.readFileSync('js/content/canvas-transitions.js','utf8'),canvasModuleContext);
  const ArkCanvasTransitions=vm.runInContext('ArkCanvasTransitions',canvasModuleContext);
  ArkCanvasTransitions.define({effect:'fade',outDuration:150,inDuration:180,easing:'ease'});
  window.ArkCanvasTransitions=ArkCanvasTransitions; // bridge into page-router.js's own bare `window`

  const canvasScene=new Element(),canvasOutlet=canvasScene.appendChild(new Element());
  const persistentEl=new Element();
  canvasScene.querySelector=(selector)=>selector==='[data-ark-layer="persistent"]'?persistentEl:null;
  const canvasLog=[];
  context.ArkUI.createPresence=()=>({
   hide(page){canvasLog.push(['hide-called',page,persistentEl.style.opacity]);return Promise.resolve();},
   show(page){canvasLog.push(['show-called',page,persistentEl.style.opacity]);return Promise.resolve();},
   enter(page){canvasLog.push(['enter-called',page,persistentEl.style.opacity]);return Promise.resolve();}
  });
  const canvasState={get(){return {paused:false};},navigate(){}};
  const canvasRouter=context.ArkUI.createPageRouter({scene:canvasScene,outlet:canvasOutlet,state:canvasState,
   catalog:{zero:{path:'/',title:'Home'},about:{path:'/about',title:'About'}},
   load:async()=>({mount(host){return host.appendChild(new Element());}}),writeHistory(){}
  });
  await canvasRouter.navigate('zero');
  assert.equal(persistentEl.style.opacity,'1','the background has eased back in by the time the very first navigation settles');
  canvasLog.length=0;
  await canvasRouter.navigate('about');
  assert.equal(canvasLog.length,2,'exactly one hide call and one show/enter call for a plain cross-page navigation');
  assert.deepEqual([canvasLog[0][0],canvasLog[0][1]],['hide-called','zero']);
  assert.equal(canvasLog[0][2],'0','the background has ALREADY faded out by the time the outgoing page is told to hide -- fadeCanvas(\'out\') runs strictly before presence.hide(), never after');
  assert.deepEqual([canvasLog[1][0],canvasLog[1][1]],['show-called','about']);
  assert.equal(canvasLog[1][2],'0','at the exact moment presence.show() is invoked for the incoming page, the background is still mid fade-out (not yet flipped to fading in) -- the fade-in call lands strictly AFTER presence.show()/enter() is called, so the two transitions are layered in sequence, never racing to start at the same instant');
  assert.equal(persistentEl.style.opacity,'1','after presence.show() returns, the background fade-in call has already run and eased it back in');
  assert.equal(persistentEl.style.transition,'opacity 180ms ease','the fade-in call used the configured inDuration/easing');

  // This runs on every real navigation for every real visitor, so it must degrade
  // silently -- never throw -- when the persistent layer is missing or the script
  // itself did not load, exactly as js/ark/page-router.js's own fadeCanvas() guards.
  canvasScene.querySelector=()=>null;
  await assert.doesNotReject(canvasRouter.navigate('zero'),'navigation does not throw when the persistent layer is missing');
  delete window.ArkCanvasTransitions;
  canvasScene.querySelector=(selector)=>selector==='[data-ark-layer="persistent"]'?persistentEl:null;
  await assert.doesNotReject(canvasRouter.navigate('about'),'navigation does not throw when ArkCanvasTransitions itself is unavailable');
 }

 console.log('PASS: lazy home, module caching, outgoing DOM disposal, scroll restoration, last request wins, failure/retry, deep links/history, stable canvas/header/outlet identities, catalog assets, background in/out transition sequencing.');
})().catch(error=>{console.error(error);process.exitCode=1;});

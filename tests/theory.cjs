const assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
// Every link on the concept page must open a page of its own, and every such page must be a real, mountable route.
// The pages are the theory-group manifests, so adding a manifest adds a routed page with no other edit.
const context=vm.createContext({console,ArkUI:{},document:{write(){}}});
vm.runInContext(fs.readFileSync('js/content/manifest.js','utf8'),context);
vm.runInContext(fs.readFileSync('js/content/manifests/index.js','utf8'),context);
for(const id of vm.runInContext('ArkManifestIds',context)) vm.runInContext(fs.readFileSync('js/content/manifests/'+id+'.js','utf8'),context);
for(const file of ['js/content/learnings.js','js/content/article-index.js','js/ark/vendor/engines.js','js/ark/scene-state.js','js/content/site-pages.js','js/pages/catalog.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
const {ArkManifest,ArkCopy,ArkUI}=vm.runInContext('({ArkManifest,ArkCopy,ArkUI})',context);
const theory=ArkManifest.group('theory');
assert.equal(theory.length,6,'three principles plus three rail links');
assert.equal(theory.filter(m=>m.meta.placement==='row').length,3);
assert.equal(theory.filter(m=>m.meta.placement==='rail').length,3);
const scene=ArkUI.createSceneState('zero');
for(const m of theory){
  const key='concept/'+m.id, route=ArkUI.pageCatalog[key], area=m.id.toUpperCase();
  assert(route,key+' must be routed');assert.equal(route.path,m.route);assert.equal(route.path,'/'+key);
  for(const file of route.scripts)assert(fs.existsSync(file),file);
  scene.navigate(key);assert.equal(scene.get().page,key);
  for(const role of ['EYEBROW','TITLE','DECK','CTA','NEXT','BACK']) assert(ArkCopy.text(area+'.'+role),key+' '+role);
  assert(ArkManifest.points(m)>=1,key+' has points');
  for(let n=1;n<=ArkManifest.points(m);n++) assert(ArkCopy.text(`${area}.POINT${n}.TEXT`),key+' point '+n+' has text');
  assert(ArkUI.pageCatalog[m.meta.next],key+' onward link must resolve: '+m.meta.next);
  assert.equal(m.meta.back,'concept');
  // first-visit audit 2026-10-22 (P2): a readable address, derived from the sheet's name, opens the sheet beside its old path
  const readable='/concept/'+m.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  if(readable!==m.route) assert.deepEqual(Array.from(route.aliases||[]),[readable],key+' has the readable alias '+readable);
}
const paths=Object.values(ArkUI.pageCatalog).flatMap(e=>[e.path].concat(e.aliases||[]));
assert.equal(new Set(paths).size,paths.length,'no address names two pages (a readable alias never shadows another page)');
// first-visit audit 2026-10-22 (P2): a note's address said "why-the-chain-was-retired" under the title "From one chain to one per
// identity". Every note answers at an address derived from its title too; the old one stays its own (saved edits are stored under it).
for(const a of vm.runInContext('LearningContent.articles',context)){
  const route=ArkUI.pageCatalog['article/'+a.slug], readable='/learnings/'+a.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  assert.equal(route.path,'/learnings/'+a.slug,a.slug+' keeps its own address');
  if(readable!==route.path) assert.deepEqual(Array.from(route.aliases||[]),[readable],a.slug+' has the readable alias '+readable);
}
assert.deepEqual(Array.from(ArkUI.pageCatalog['article/why-the-chain-was-retired'].aliases),['/learnings/from-one-chain-to-one-per-identity']);
assert.equal(ArkManifest.points(ArkManifest.get('about')),5);assert(ArkUI.pageCatalog[ArkManifest.get('about').meta.next]);
// Nothing on the concept page may point at an existing non-theory page: the point of the change is new pages.
const concept=fs.readFileSync('js/pages/concept.js','utf8');
assert(!/data-scene-link="(learnings|about|proximity)"/.test(concept));
// A page the admin adds later routes with no code change: prove it with a manifest that exists nowhere on disk.
vm.runInContext(`ArkManifest.define(${JSON.stringify({id:'extra',title:'Theory: Extra',route:'/concept/extra',group:'theory',meta:{placement:'rail',next:'learnings',back:'concept'},fields:{TITLE:{label:'Heading',kind:'line',value:'An extra page.',section:'Page'}}})})`,context);
assert.equal(ArkManifest.group('theory').length,7);
const html=fs.readFileSync('index.html','utf8');
const motion=fs.readFileSync('js/halo/surface-motion.js','utf8');
assert(motion.includes("indexOf('concept/') === 0"),'theory pages need a surface profile');
assert(html.includes('js/pages/sheet.js')===false,'the sheet loads with its route, not on every page');
console.log('theory ok');

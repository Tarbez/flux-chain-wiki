const assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
// Every link on the concept page must open a page of its own, and every such page must be a real, mountable route.
const context=vm.createContext({console,ArkUI:{}});
for(const file of ['js/content/learnings.js','js/content/theory.js','js/ark/vendor/engines.js','js/ark/scene-state.js','js/pages/catalog.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
const {TheoryContent,ArkUI}=vm.runInContext('({TheoryContent,ArkUI})',context);
assert.equal(TheoryContent.pages.length,5,'three principles plus two rail links');
assert.equal(TheoryContent.pages.filter(p=>p.number).length,3);
const slugs=new Set(TheoryContent.pages.map(p=>p.slug));assert.equal(slugs.size,5,'slugs are unique');
const scene=ArkUI.createSceneState('zero');
for(const entry of TheoryContent.pages){
  const key='concept/'+entry.slug, route=ArkUI.pageCatalog[key];
  assert(route,key+' must be routed');assert.equal(route.path,'/'+key);
  for(const file of route.scripts)assert(fs.existsSync(file),file);
  scene.navigate(key);assert.equal(scene.get().page,key);
  assert(entry.title&&entry.deck&&entry.cta&&entry.eyebrow,key+' has copy');
  assert.equal(entry.points.length,3,key+' has three points');
  assert(ArkUI.pageCatalog[entry.next.page],key+' onward link must resolve: '+entry.next.page);
}
// Nothing on the concept page may point at an existing non-theory page: the point of the change is new pages.
const concept=fs.readFileSync('js/pages/concept.js','utf8');
assert(!/data-scene-link="(learnings|about|proximity)"/.test(concept));
assert(fs.readFileSync('index.html','utf8').indexOf('js/content/theory.js')<fs.readFileSync('index.html','utf8').indexOf('js/ark/scene-state.js'),'theory content loads before scene state');
const motion=fs.readFileSync('js/halo/surface-motion.js','utf8');
assert(motion.includes("indexOf('concept/') === 0"),'theory pages need a surface profile');
console.log('theory ok');

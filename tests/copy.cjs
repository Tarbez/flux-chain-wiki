const assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
// Copy lives in page manifests and is referred to by key. This reads the real manifests, patterns, resolvers and pages,
// so a pattern or page that names a key nobody defines, or a manifest nobody uses, fails here rather than on screen.
const manifests={}, rendered=[];
const node=()=>({classList:{add(){}},dataset:{},appendChild(){},insertBefore(){},setAttribute(){},querySelector:()=>node(),textContent:''});
const ArkUI={pageModules:{},register:(id,m)=>{manifests[id]=m;},alias(){},base(){},atomize(){},render:(src)=>{rendered.push(src);return node();}};
const written=[];
const context=vm.createContext({console,ArkUI,Tokens:new Proxy({},{get:()=>()=>''}),document:{createElement:node,createElementNS:node,createTextNode:()=>({}),write:s=>written.push(s)},window:{addEventListener(){}}});
for(const file of ['js/content/manifest.js','js/ark/flux.js']) vm.runInContext(fs.readFileSync(file,'utf8'),context);
// The index loads each manifest by document.write in the browser; here we load the same files directly, in the same order.
vm.runInContext(fs.readFileSync('js/content/manifests/index.js','utf8'),context);
const ids=vm.runInContext('ArkManifestIds',context);
assert.equal(written.length,ids.length,'the index writes one script per manifest');
ids.forEach((id,i)=>{assert(written[i].includes('js/content/manifests/'+id+'.js'));vm.runInContext(fs.readFileSync('js/content/manifests/'+id+'.js','utf8'),context);});
for(const file of fs.readdirSync('js/resolvers')) if(file.endsWith('.js')) vm.runInContext(fs.readFileSync('js/resolvers/'+file,'utf8'),context);
vm.runInContext(fs.readFileSync('js/scene.flux.js','utf8'),context);
for(const file of ['js/content/learnings.js','js/content/article-index.js','js/pages/catalog.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
// Home's other page scripts, as the catalog loads them: shared stats data and the
// flow builder (stubbed: it draws an illustration and names no copy keys).
vm.runInContext(fs.readFileSync('js/content/stats-highlights.js','utf8'),context);
ArkUI.buildAgreementFlow=()=>({element:node(),restore(){},dispose(){}});
vm.runInContext(fs.readFileSync('js/pages/home.js','utf8'),context);
context.ArkUI.pageModules.zero.mount({appendChild(){}});
const {ArkCopy,ArkFlux,ArkManifest,F_SCENE_RZERO_V0}=vm.runInContext('({ArkCopy,ArkFlux,ArkManifest,F_SCENE_RZERO_V0})',context);

// Every manifest file is exactly what the admin page would write, and is valid.
assert.deepEqual(fs.readdirSync('js/content/manifests').filter(f=>f!=='index.js').map(f=>f.replace('.js','')).sort(),[...ids].sort(),'every manifest file is listed in the index, and every listed file exists');
for(const id of ids){
  const m=ArkManifest.get(id); assert(m,id); assert.equal(ArkManifest.problems(m).join('; '),'',id);
  assert.equal(fs.readFileSync('js/content/manifests/'+id+'.js','utf8'),ArkManifest.serialize(m),id+' file matches its canonical serialization');
}
// Patterns hold keys, never words, and every key resolves.
const patterns=[F_SCENE_RZERO_V0,...rendered]; assert.equal(patterns.length,2);
const used=new Set();
function walk(node,where){
  const m=manifests[node.resolver]; if(!m) return;
  const schema=m.schema||{}, copy=m.copy||[];
  for(const [key,value] of Object.entries(node.props)){ const name=schema[key]||key;
    if(copy.includes(name)){ assert(ArkCopy.has(value),`${node.resolver} "${name}" in ${where} is "${value}", not a key in any manifest`); used.add(value); } }
  node.children.forEach(child=>walk(child,where));
}
patterns.forEach((src,i)=>walk(ArkFlux.parse(src),'pattern '+i));
// Pages and the shell name keys directly; each one they name must exist.
const named=new Set();
for(const file of ['js/pages/concept.js','js/pages/sheet.js','js/pages/theory.js','js/pages/about.js','js/pages/home.js','js/hero-motion.js','js/resolvers/header.js','js/pages/catalog.js']){
  const src=fs.readFileSync(file,'utf8');
  for(const m of src.matchAll(/ArkCopy\.text\('([A-Z0-9.]+)'\)/g)) named.add(m[1]);
  for(const m of src.matchAll(/\['(HOME\.[A-Z.]+)', '/g)) named.add(m[1]);
}
for(const key of named) assert(ArkCopy.has(key),key+' is named in code but no manifest defines it');
// Words are never written in a page or the shell where a key belongs.
for(const [file,literal] of [['js/pages/concept.js','Go beneath'],['js/pages/about.js','Care is part'],['js/resolvers/header.js','INDEPENDENT STUDIO'],['js/hero-motion.js','Curiosity is our'],['js/hero-motion.js','BACK TO ZERO'],['js/pages/home.js','Explore the experiments']])
  assert(!fs.readFileSync(file,'utf8').includes(literal),`${file} still spells out "${literal}"`);
// Refusals name the failure, the missing thing, and the remedy.
assert.throws(()=>ArkCopy.resolve('DESIGN WITH DEPTH','RBODY_V1','eyebrow'),e=>/by key, not written as words/.test(e.message)&&/manifests/.test(e.message)&&/AREA\.ROLE/.test(e.message));
assert.throws(()=>ArkCopy.resolve('HOME.NOPE','RBODY_V1','text'),e=>/HOME\.NOPE.*no entry/.test(e.message)&&/manifests\/home\.js/.test(e.message));
assert.throws(()=>ArkCopy.text('NOAREA.TITLE'),/no entry/);
for(const words of ['Theory','HOME','home.title','DESIGN WITH DEPTH']) assert(!ArkCopy.isKey(words),words+' is words, not a key');
assert.equal(ArkCopy.text('HOME.TITLE'),"What if agreement didn't need a global chain?");
assert.throws(()=>ArkManifest.define({id:'Bad',title:'x',route:'/',group:'page',fields:{}}),/id must be/);
assert.throws(()=>ArkManifest.define({id:'ok',title:'x',route:'/',group:'page',fields:{lower:{label:'l',kind:'line',value:'v'}}}),/capitals/);
// The runtime is the one place patterns swap keys for words; every resolver that shows copy declares it.
assert(fs.readFileSync('js/ark/runtime.js','utf8').includes('ArkCopy.resolve'));
for(const id of ['RBODY_V1','RCTA_V1','RLOGO_V1','RLINK_V1','RSTEP_V1']) assert(manifests[id]&&manifests[id].copy&&manifests[id].copy.length,id+' declares its copy props');
const html=fs.readFileSync('index.html','utf8');
assert(html.indexOf('js/content/manifest.js')>-1&&html.indexOf('js/content/manifest.js')<html.indexOf('js/content/manifests/index.js'),'the registry loads before the manifests');
assert(html.indexOf('js/content/manifests/index.js')<html.indexOf('js/ark/scene-state.js'),'manifests load before scene state and the catalog');
console.log('copy ok');

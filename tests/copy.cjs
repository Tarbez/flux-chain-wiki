const assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
// Patterns hold copy keys, never words. A pattern that looks editable but is not the content misleads the next developer,
// so the test reads the real patterns and the real resolver manifests rather than a fixture.
const manifests={}, rendered=[];
const ArkUI={pageModules:{},register:(id,m)=>{manifests[id]=m;},alias(){},base(){},atomize(){},render:(src)=>{rendered.push(src);return {classList:{add(){}},dataset:{},querySelector:()=>({appendChild(){}})};}};
const context=vm.createContext({console,ArkUI,Tokens:new Proxy({},{get:()=>()=>''}),document:{createElement:()=>({dataset:{},appendChild(){},setAttribute(){}})},window:{}});
for(const file of ['js/content/copy.js','js/ark/flux.js']) vm.runInContext(fs.readFileSync(file,'utf8'),context);
for(const file of fs.readdirSync('js/resolvers')) if(file.endsWith('.js')) vm.runInContext(fs.readFileSync('js/resolvers/'+file,'utf8'),context);
vm.runInContext(fs.readFileSync('js/scene.flux.js','utf8'),context);
vm.runInContext(fs.readFileSync('js/pages/home.js','utf8'),context);
context.ArkUI.pageModules.zero.mount({appendChild(){}});
const {ArkCopy,ArkFlux,F_SCENE_RZERO_V0}=vm.runInContext('({ArkCopy,ArkFlux,F_SCENE_RZERO_V0})',context);
const patterns=[F_SCENE_RZERO_V0,...rendered];
assert.equal(patterns.length,2,'the scene and the home page are the two patterns that carry copy');
const used=new Set();
function walk(node,where){
  const m=manifests[node.resolver]; if(!m) return;
  const schema=m.schema||{}, copy=m.copy||[];
  for(const [key,value] of Object.entries(node.props)){
    const name=schema[key]||key;
    if(copy.includes(name)){
      assert(ArkCopy.has(value),`${node.resolver} "${name}" in ${where} is "${value}", not a key in js/content/copy.js`);
      used.add(value);
    }
  }
  node.children.forEach(child=>walk(child,where));
}
patterns.forEach((src,i)=>walk(ArkFlux.parse(src),'pattern '+i));
for(const code of Object.keys(ArkCopy.table)) assert(used.has(code),code+' is in the table but no pattern uses it');
for(const [key,words] of Object.entries(ArkCopy.table)){ assert(ArkCopy.isKey(key),key+' must read AREA.ROLE'); assert(words&&!/_/.test(words),key+' holds real words, spaces not underscores'); }
// Refusals name the failure, the missing thing, and the remedy.
assert.throws(()=>ArkCopy.resolve('DESIGN WITH DEPTH','RBODY_V1','eyebrow'),e=>/patterns hold copy keys, not words/.test(e.message)&&/js\/content\/copy\.js/.test(e.message)&&/AREA\.ROLE/.test(e.message));
assert.throws(()=>ArkCopy.resolve('HOME.NOPE','RBODY_V1','text'),/HOME\.NOPE.*no entry/);
for(const words of ['Theory','HOME','home.title','DESIGN WITH DEPTH']) assert(!ArkCopy.isKey(words),words+' is words, not a key');
assert.throws(()=>ArkCopy.resolve('__proto__','RBODY_V1','text'),/not words/);
// The runtime is the one place codes are swapped for words, and every resolver that shows copy declares it.
assert(fs.readFileSync('js/ark/runtime.js','utf8').includes('ArkCopy.resolve'));
for(const id of ['RBODY_V1','RCTA_V1','RLOGO_V1','RLINK_V1','RSTEP_V1']) assert(manifests[id]&&manifests[id].copy&&manifests[id].copy.length,id+' declares its copy props');
const html=fs.readFileSync('index.html','utf8');
assert(html.indexOf('js/content/copy.js')>-1&&html.indexOf('js/content/copy.js')<html.indexOf('js/ark/runtime.js'),'copy loads before the runtime');
console.log('copy ok');

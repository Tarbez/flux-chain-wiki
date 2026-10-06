const assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
// The products (resolutions) are structure in js/content/resolutions.js and words in the `resolutions` manifest.
// Every resolution the menu, the Resolutions page and About list must have its words; every key a page names must exist.
const context=vm.createContext({console,document:{write(){}}});
vm.runInContext(fs.readFileSync('js/content/manifest.js','utf8'),context);
for(const id of ['nav','about','resolutions']) vm.runInContext(fs.readFileSync(`js/content/manifests/${id}.js`,'utf8'),context);
vm.runInContext(fs.readFileSync('js/content/resolutions.js','utf8'),context);
const {ArkCopy,ArkResolutions}=vm.runInContext('({ArkCopy,ArkResolutions})',context);
const listed=fs.readFileSync('js/content/manifests/index.js','utf8');
assert(listed.includes('"resolutions"'),'the resolutions manifest is loaded with the others');

const groups=ArkResolutions.list();
assert.equal(groups.length,5,'five groups');
const keys=ArkResolutions.keys();
assert.equal(new Set(keys).size,keys.length,'no resolution is listed twice');
for(const name of ['WEBSITE','NETWORK','CONTENT','PAYMENTS','FINANCE','COMMUNITY','COMMUNICATIONS','GOVERNANCE','LOGISTICS','INTELLIGENCE','DATA','ALGORITHMS','FILES','ENCRYPTIONS','COLLABORATIONS','PRODUCTIVITY','INFORMATION','RULES','DEPLOYMENTS','AUTOMATION'])
  assert(keys.includes(name),name+' is a resolution');
for(const group of groups){
  assert(group.title&&group.items.length,group.key+' has a title and items');
  for(const item of group.items){
    assert(/^Resolve your /.test(item.title),item.key+' title reads "Resolve your …"');
    assert(item.text.length>10,item.key+' has a one-line description');
    assert(item.shift.length>20,item.key+' has a concise inner-page shift');
    assert(item.old.length>20,item.key+' names the stack it replaces');
    assert.equal(item.steps.length,3,item.key+' has exactly three inner-page movements');
    assert.equal(item.slug,item.key.toLowerCase());
  }
}
assert.equal(ArkResolutions.find('rules').title,'Resolve your rules and patterns');
assert.equal(ArkResolutions.find('nope'),null);
assert.equal(ArkResolutions.shortName('Resolve your rules and patterns'),'Rules and patterns','short names keep sentence case');

// Each key a page or the header spells out exists in a manifest.
for(const [file,pattern,prefix] of [
  ['js/pages/resolutions.js',/words\('([A-Z0-9.]+)'\)/g,'RESOLUTIONS.'],
  ['js/pages/about.js',/words\('([A-Z0-9.]+)'\)/g,'ABOUT.'],
  ['js/resolvers/header.js',/ArkCopy\.text\('([A-Z0-9.]+)'\)/g,'']
]){
  for(const m of fs.readFileSync(file,'utf8').matchAll(pattern)) assert(ArkCopy.has(prefix+m[1]),`${file} names ${prefix+m[1]}, which no manifest defines`);
}
// About's numbered blocks are written as words('NO' + index ...) etc.; check those families directly.
for(const i of [1,2,3,4]) for(const r of ['TITLE','TEXT']) assert(ArkCopy.has(`ABOUT.NO${i}.${r}`));
for(const i of [1,2,3]) for(const f of ['PILLAR','FLOW']) for(const r of ['TITLE','TEXT']) assert(ArkCopy.has(`ABOUT.${f}${i}.${r}`));
// The route is registered and opens in the framed panel like About.
assert(fs.readFileSync('js/pages/catalog.js','utf8').includes("resolutions: { path: '/resolutions'"));
assert(fs.readFileSync('js/pages/catalog.js','utf8').includes("path: '/resolutions/' + item.slug"),'every resolution receives a nested route');
assert(!fs.readFileSync('js/resolvers/header.js','utf8').includes("'?r=' + entry.slug"),'the Products menu no longer creates query-string detail links');
assert(!fs.readFileSync('js/pages/about.js','utf8').includes("'r=' + item.slug"),'About links directly to inner resolution pages');
assert(fs.readFileSync('js/ark/panel-continuity.js','utf8').includes("indexOf('resolutions/')"),'inner resolution pages stay in the framed panel');
const resolutionPage=fs.readFileSync('js/pages/resolutions.js','utf8'),resolutionCss=fs.readFileSync('css/resolutions.css','utf8');
assert(resolutionPage.includes("['Outcome', 'Shift', 'Path']"),'inner pages reveal one concise information level at a time');
assert(resolutionPage.includes("level.replaceChildren()"),'changing levels replaces rather than accumulates information');
assert(/#scene \.resolutions-page[\s\S]*?overflow:hidden/.test(resolutionCss),'resolution pages never introduce a scrolling page surface');
console.log('resolutions ok');

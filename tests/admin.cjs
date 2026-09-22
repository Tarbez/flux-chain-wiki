const assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
// The admin store writes through a directory handle. A fake one proves what lands on disk without a browser.
class FakeFile{constructor(){this.text='';}async createWritable(){const f=this;let buf='';return {async write(t){buf+=t;},async close(){f.text=buf;}};}}
class FakeDir{constructor(){this.files=new Map();this.dirs=new Map();}
 async getFileHandle(n,o){if(!this.files.has(n)){if(!(o&&o.create))throw new Error('NotFound');this.files.set(n,new FakeFile());}return this.files.get(n);}
 async getDirectoryHandle(n,o){if(!this.dirs.has(n)){if(!(o&&o.create))throw new Error('NotFound');this.dirs.set(n,new FakeDir());}return this.dirs.get(n);}
 async removeEntry(n){if(!this.files.delete(n))throw new Error('NotFound');}}
const context=vm.createContext({console,document:{write(){}}});
for(const file of ['js/content/manifest.js','js/content/learnings.js','js/admin/store.js']) vm.runInContext(fs.readFileSync(file,'utf8'),context);
const {ArkManifest,ArkAdminStore,LearningContent}=vm.runInContext('({ArkManifest,ArkAdminStore,LearningContent})',context);
(async()=>{
 // The index file on disk is exactly what the store would write, so the admin and a hand edit never disagree.
 const onDisk=fs.readFileSync('js/content/manifests/index.js','utf8');
 const ids=JSON.parse(onDisk.match(/ArkManifestIds = (\[.*?\]);/)[1]);
 assert.equal(ArkAdminStore.indexText(ids),onDisk);
 // The written index still loads every manifest in order.
 const writes=[];vm.runInContext(onDisk,vm.createContext({document:{write:s=>writes.push(s)}}));
 assert.equal(writes.length,ids.length);assert(writes.every((w,i)=>w.includes(`manifests/${ids[i]}.js" defer></script>`)));
 // A folder that is not the project is refused with a message that says what to pick.
 await assert.rejects(ArkAdminStore.manifestsDir(new FakeDir()),/contains index\.html and js\/content/);
 const root=new FakeDir();root.files.set('index.html',new FakeFile());
 const js=await root.getDirectoryHandle('js',{create:true});await js.getDirectoryHandle('content',{create:true});
 const dir=await ArkAdminStore.manifestsDir(root);
 // Saving writes the manifest and the index; a new page appears in the index in the order given.
 const m={id:'fresh',title:'Theory: Fresh',route:'/concept/fresh',group:'theory',meta:{placement:'rail',next:'learnings',back:'concept'},fields:{TITLE:{label:'Heading',kind:'line',section:'Page',value:'Fresh & new "page".'}}};
 await ArkAdminStore.save(dir,m,[...ids,'fresh']);
 assert.equal(dir.files.get('fresh.js').text,ArkManifest.serialize(m));
 assert(dir.files.get('index.js').text.includes('"fresh"'));
 // What was written loads back as the same manifest, including quotes and punctuation.
 const reload=vm.createContext({});vm.runInContext(fs.readFileSync('js/content/manifest.js','utf8'),reload);
 vm.runInContext(dir.files.get('fresh.js').text,reload);
 assert.equal(vm.runInContext('ArkCopy.text("FRESH.TITLE")',reload),'Fresh & new "page".');
 // Removing deletes the file and drops the id from the index.
 await ArkAdminStore.remove(dir,'fresh',[...ids,'fresh']);
 assert(!dir.files.has('fresh.js'));assert(!dir.files.get('index.js').text.includes('fresh'));
 await assert.rejects(ArkAdminStore.remove(dir,'fresh',ids),/NotFound/);
 // Articles: the body and the index are written as the exact bytes on disk today, so saving changes nothing until an edit.
 const live=vm.createContext({});for(const f of ['js/content/learnings.js','js/content/article-index.js'])vm.runInContext(fs.readFileSync(f,'utf8'),live);
 const slugs=live.LearningContent.articles.map(a=>a.slug);slugs.forEach(s=>vm.runInContext(fs.readFileSync('js/content/articles/'+s+'.js','utf8'),live));
 const list=JSON.parse(JSON.stringify(live.LearningContent.articles));
 await assert.rejects(ArkAdminStore.contentDirs(new FakeDir()),/contains index\.html and js\/content/);
 const adirs=await ArkAdminStore.contentDirs(root);
 await ArkAdminStore.saveArticle(adirs,list[0],list);
 assert.equal(adirs.articles.files.get(list[0].slug+'.js').text,fs.readFileSync('js/content/articles/'+list[0].slug+'.js','utf8'));
 assert.equal(adirs.content.files.get('article-index.js').text,fs.readFileSync('js/content/article-index.js','utf8'));
 // A new article lands in the index and loads back as itself, quotes and dashes included.
 const fresh={slug:'a-new-note',title:'A "new" note — with a dash',category:'NOTES / 004',minutes:'2 MIN READ',summary:'Short.',sections:[['Heading','One paragraph.','Two “curly” paragraphs.']],numbers:false};
 assert.deepEqual(JSON.parse(JSON.stringify(LearningContent.problems(fresh))),[]);
 await ArkAdminStore.saveArticle(adirs,fresh,[...list,fresh]);
 assert(adirs.content.files.get('article-index.js').text.includes('"a-new-note"'));
 const back=vm.createContext({});vm.runInContext(fs.readFileSync('js/content/learnings.js','utf8'),back);
 vm.runInContext(adirs.content.files.get('article-index.js').text,back);vm.runInContext(adirs.articles.files.get('a-new-note.js').text,back);
 assert.deepEqual(JSON.parse(JSON.stringify(back.LearningContent.find('a-new-note'))),fresh);
 // Removing deletes the body and rewrites the index without it; removing twice is refused, not silent.
 await ArkAdminStore.removeArticle(adirs,'a-new-note',list);
 assert(!adirs.articles.files.has('a-new-note.js'));assert(!adirs.content.files.get('article-index.js').text.includes('a-new-note'));
 await assert.rejects(ArkAdminStore.removeArticle(adirs,'a-new-note',list),/NotFound/);
 // Validation names the reason.
 for(const [bad,re] of [[{...fresh,slug:'Bad Slug'},/slug must be lowercase/],[{...fresh,sections:[['heading only']]},/needs a heading and a paragraph/],[{...fresh,title:''},/title is missing/],[{...fresh,numbers:'yes'},/numbers must be true or false/],[{...fresh,sections:[]},/at least one section/]])
  assert(LearningContent.problems(bad).some(p=>re.test(p)),String(re));
 console.log('admin store ok');
})().catch(e=>{console.error(e);process.exitCode=1;});

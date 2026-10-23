/* Regression: evidence left the shell, and a query-driven reader must not
   fetch arbitrary files or interpret source Markdown as executable HTML. */
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), crypto = require('node:crypto');
const sync = require('../scripts/sync-reference-docs.cjs');
class Element {
 constructor(tag,text=''){this.tagName=tag;this.ownText=text;this.children=[];this.dataset={};this.attributes={};}
 appendChild(x){this.children.push(x);return x;} replaceChildren(){this.children=[];}
 setAttribute(k,v){this.attributes[k]=v;} get textContent(){return this.ownText+this.children.map(x=>x.textContent).join('');}
 get all(){return this.children.flatMap(x=>[x,...x.all]);}
}
const guide = '# Agreements\n\nA **signed** record references `intent_cid`.\n\n<script>alert(1)</script>\n\n[Unsafe](javascript:alert) and [Authority](authority.md).\n\n| Record | Meaning |\n| --- | --- |\n| Intent | exact need |\n\n```sh\nflux miner discover\n```\n\n## Evidence\n\nWhat was measured.\n\n### Detail\n\nHow.';
const sha=text=>crypto.createHash('sha256').update(text).digest('hex');
const calls=[];
/* The reader's two inputs, as the generator writes them: an index (always loaded) and one text file per document, loaded on demand
   through ArkUI.loadScript. `fails` is the set of files the fake loader cannot fetch. */
const files={'js/content/reference/protocol/agreements.js':['docs/protocol/agreements.md',guide],'js/content/reference/protocol/authority.js':['docs/protocol/authority.md','# Authority\n\nWho may.']};
const referenceIndex=Object.fromEntries(Object.entries(files).map(([file,[doc,text]])=>[doc,{file,title:(text.match(/^#\s+(.+)$/m)||[])[1],sha256:sha(text),origins:['seed']}]));
function makeContext(fails=new Set(),index=referenceIndex){
 const ArkUI={route:{href:p=>'#'+p},pageModules:{},pageCatalog:{zero:{path:'/'},'lifecycle/offer':{path:'/lifecycle/offer',title:'Offer: propose the terms — DEFXN'},reference:{path:'/reference'}},referenceDocs:['docs/protocol/agreements.md','docs/protocol/authority.md'],referenceIndex:index,el:(tag,_cls,text)=>new Element(tag,text),
  loadScript:async(file)=>{calls.push(file);if(fails.has(file)||!files[file])throw new Error('Could not load '+file);const [doc,text]=files[file];(ArkUI.referenceText=ArkUI.referenceText||{})[doc]={text,sha256:sha(text)};}};
 const context={ArkUI,document:{createTextNode:text=>new Element('#text',text)},location:{href:'http://127.0.0.1:3438/index.html',hash:'#/reference'},URL,URLSearchParams,Map,AbortController,console:{warn(){},error(){}}};
 vm.runInNewContext(fs.readFileSync('js/pages/reference.js','utf8'),context);
 return context;
}
const failing=new Set();
const context=makeContext(failing);
(async()=>{
 const reader=context.ArkUI.pageModules.reference;
 await assert.rejects(reader.prepare('reference',{query:'doc=docs%2F..%2Fsecrets.md'}),/approved/);assert.equal(calls.length,0,'unapproved paths never reach the loader');
 await reader.prepare('reference',{query:'doc=docs%2Fprotocol%2Fagreements.md&from=%2Flifecycle%2Foffer%3Fview%3Dreference'});
 assert.deepEqual(calls,['js/content/reference/protocol/agreements.js'],'the reader loads the file of the document it shows, and no other');
 const root=new Element('div'), el=reader.mount(root);
 assert(el.textContent.includes('signed record references intent_cid'),'canonical inline words and identifiers survive');
 assert(el.textContent.includes('flux miner discover'),'exact command survives into the rendered reader');
 assert(el.textContent.includes('<script>alert(1)</script>'),'source HTML is visible literal text');
 assert(!el.all.some(x=>x.tagName==='script'),'source cannot create an executable script');
 const anchors=el.all.filter(x=>x.tagName==='a');
 assert(anchors.some(x=>x.href==='#/lifecycle/offer?view=reference'),'return preserves the originating route and evidence depth');
 // Named regression (2026-10-19, docs/ux-audit/pages.md P1): the return link was a bare '#'+from
 // hash, and every reader opened with from='/' because doc links lost their query; it is a scene
 // link now (the router takes it, query included) and names the page it returns to.
 const back=anchors.find(x=>x.dataset.sceneLink==='lifecycle/offer');
 assert(back&&back.dataset.sceneLink==='lifecycle/offer'&&back.dataset.routeQuery==='view=reference','the return link is a scene link to the source page, with its query');
 assert(back.textContent.includes('Return to Offer: propose the terms'),'and is labelled with the page it returns to');
 assert(anchors.some(x=>x.dataset.sceneLink==='reference'&&x.href.startsWith('#/reference?doc=docs%2Fprotocol%2Fauthority.md')),'links between approved docs stay scene links inside the reader');
 assert(anchors.some(x=>x.dataset.referenceOriginal==='true'&&x.href==='docs/protocol/agreements.md'),'original canonical source remains available');
 assert(!anchors.some(x=>/^javascript:/.test(x.href)),'unsafe schemes never become reader links');
 assert(anchors.some(x=>x.href&&x.href.startsWith('#/reference?doc=docs%2Fprotocol%2Fauthority.md')),'approved relative sources stay inside the reader');
 assert(el.all.some(x=>x.tagName==='th'&&x.attributes.scope==='col'),'table headers retain semantic scope');
 // Named regression (2026-10-20, docs/ux-audit/ledger.md RF-2/RF-3): a document's `##` rendered as h3 under the page h1
 // (the outline skipped h2), and a raw "Canonical reference / docs/..." path stood as the kicker. The reader owns one h1 (the
 // title), `##` is h2 and `###` is h3; each keeps the layout key it was saved under as the old h3/h4, by pin.
 const tags=el.all.filter(x=>/^h[1-6]$/.test(x.tagName));
 assert.deepEqual(tags.map(x=>x.tagName+':'+x.textContent),['h1:Agreements','h2:Evidence','h3:Detail'],'the outline is h1 > h2 > h3, with no level skipped and the title once');
 assert.equal(tags[1].attributes['data-ark-layout-pin'],'page:/article:1/h3:1','a corrected heading keeps the key it was saved under (it was an h3)');
 assert.equal(tags[2].attributes['data-ark-layout-pin'],'page:/article:1/h4:1','and so does the one below it (it was an h4)');
 assert(tags.slice(1).every(x=>/^reference-/.test(x.id)),'every heading has an id for the contents to link to');
 assert(!el.textContent.includes('Canonical reference'),'the raw path kicker is gone');
 assert(!el.textContent.includes('docs/protocol/agreements.md Agreements'),'and the document path is not printed as text');
 const original=el.textContent;
 // A document already on screen is never erased by a failed load: the load throws, and the router says so.
 failing.add('js/content/reference/protocol/authority.js');
 await assert.rejects(reader.prepare('reference',{query:'doc=docs%2Fprotocol%2Fauthority.md'}),/could not load/);assert.equal(el.textContent,original,'load failure cannot erase current evidence');
 // Loaded once, kept: going back to a document already read does not fetch it again.
 await reader.prepare('reference',{query:'doc=docs%2Fprotocol%2Fagreements.md'});
 assert.equal(calls.filter(f=>/agreements/.test(f)).length,1,'a document already loaded is not fetched again');

 // Named regression (2026-10-20, docs/ux-audit/plan.md W5-REF): the reader failed with a bare "Reference could not load" and nothing
 // on the page. With nothing on screen yet, a document that cannot load is a refusal in the page that names the failure, what is
 // missing and what to do; the title and the way back still stand.
 const refused=makeContext(new Set(['js/content/reference/protocol/authority.js'])).ArkUI.pageModules.reference;
 await refused.prepare('reference',{query:'doc=docs%2Fprotocol%2Fauthority.md&from=%2Flifecycle%2Foffer'});
 const refusal=refused.mount(new Element('div'));
 const refusalTerms=refusal.all.filter(x=>x.tagName==='dt').map(x=>x.textContent);
 assert.deepEqual(refusalTerms,['Failure','Missing','Remedy'],'a refusal states the failure, what is missing and the remedy');
 assert(refusal.textContent.includes('js/content/reference/protocol/authority.js'),'and names the file that is missing');
 assert(refusal.all.some(x=>x.tagName==='h1'&&x.textContent==='Authority'),'the title (from the index) still stands');
 assert(refusal.all.some(x=>x.tagName==='a'&&x.dataset.referenceOriginal==='true'&&x.href==='docs/protocol/authority.md'),'the original Markdown is the way round');
 assert(refusal.all.some(x=>x.tagName==='a'&&x.dataset.sceneLink==='lifecycle/offer'),'and so is the way back');
 // ... and when the file loads but is not the one the index describes (a cached file against a new index), that is refused too
 const skewed=makeContext(new Set(),{...referenceIndex,'docs/protocol/authority.md':{...referenceIndex['docs/protocol/authority.md'],sha256:'0'.repeat(64)}}).ArkUI.pageModules.reference;
 await skewed.prepare('reference',{query:'doc=docs%2Fprotocol%2Fauthority.md'});
 assert(/different releases/.test(skewed.mount(new Element('div')).textContent),'a document that does not match the index is a refusal, not a silent wrong text');
 // ... and one the index does not know is a refusal that names the index
 const unindexed=makeContext(new Set(),{}).ArkUI.pageModules.reference;
 await unindexed.prepare('reference',{query:'doc=docs%2Fprotocol%2Fauthority.md'});
 assert(/reference-index\.js/.test(unindexed.mount(new Element('div')).textContent),'an index without the document names the index as what is missing');
 console.log('PASS: allowlisted sources, one-document loading, literal HTML, safe links, canonical content/commands, table semantics, provenance, exact return depth, load-failure preservation, and refusals that name failure, missing and remedy.');
})().catch(error=>{console.error(error);process.exitCode=1;});

// The packaged reader must be byte-for-byte derived from canonical source: the generator's own --check, per file and the index.
// Run `node scripts/sync-reference-docs.cjs --check` for the same answer outside the suite.
const stale=sync.check();
assert.deepEqual(stale,[],'the reference snapshots are stale; run `'+sync.REMEDY+'`:\n  '+stale.join('\n  '));
// One document per file: the reader can load exactly what it shows.
const payloadIndex={ArkUI:{}};vm.runInNewContext(fs.readFileSync('js/content/reference-index.js','utf8'),payloadIndex);
const index=payloadIndex.ArkUI.referenceIndex, approved={ArkUI:{}};vm.runInNewContext(fs.readFileSync('js/ark/reference-docs.js','utf8'),approved);
assert.deepEqual(Object.keys(index),[...approved.ArkUI.referenceDocs],'the index covers exactly the approved documents');
for(const [doc,entry] of Object.entries(index)){
 const payload={ArkUI:{}};vm.runInNewContext(fs.readFileSync(entry.file,'utf8'),payload);
 assert.deepEqual(Object.keys(payload.ArkUI.referenceText),[doc],'one document in '+entry.file);
 const source=fs.readFileSync(doc,'utf8'),text=payload.ArkUI.referenceText[doc];
 assert.equal(text.text,source,'source-owned text survives for '+doc);
 assert.equal(text.sha256,sha(source),'source revision matches '+doc);
 assert.equal(entry.sha256,text.sha256,'the index and the file agree for '+doc);
 assert.equal(entry.title,(source.match(/^#\s+(.+)$/m)||[])[1]||'Reference','the index title is the document\'s first heading for '+doc);
 assert(entry.origins.length>0,doc+' is approved because something links it');
}
// The route loads the index and the reader, never a document's text: that is the reader's job, for the one it shows.
const route=fs.readFileSync('js/pages/catalog.js','utf8').match(/reference: \{[^\n]*\}/)[0];
assert(route.includes("'js/content/reference-index.js'")&&route.includes("'js/pages/reference.js'"),'the reference route loads the index and the reader');
assert(!/reference\/|reference-text/.test(route),'and no document text, and not the one-file snapshot');

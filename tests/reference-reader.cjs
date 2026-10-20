/* Regression: evidence left the shell, and a query-driven reader must not
   fetch arbitrary files or interpret source Markdown as executable HTML. */
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
class Element {
 constructor(tag,text=''){this.tagName=tag;this.ownText=text;this.children=[];this.dataset={};this.attributes={};}
 appendChild(x){this.children.push(x);return x;} replaceChildren(){this.children=[];}
 setAttribute(k,v){this.attributes[k]=v;} get textContent(){return this.ownText+this.children.map(x=>x.textContent).join('');}
 get all(){return this.children.flatMap(x=>[x,...x.all]);}
}
const guide = '# Agreements\n\nA **signed** record references `intent_cid`.\n\n<script>alert(1)</script>\n\n[Unsafe](javascript:alert) and [Authority](authority.md).\n\n| Record | Meaning |\n| --- | --- |\n| Intent | exact need |\n\n```sh\nflux miner discover\n```\n\n## Evidence\n\nWhat was measured.\n\n### Detail\n\nHow.';
const calls=[];
const context={ArkUI:{route:{href:p=>'#'+p},pageModules:{},pageCatalog:{zero:{path:'/'},'lifecycle/offer':{path:'/lifecycle/offer',title:'Offer: propose the terms — DEFXN'},reference:{path:'/reference'}},referenceDocs:['docs/protocol/agreements.md','docs/protocol/authority.md'],referenceText:{'docs/protocol/agreements.md':{text:guide}},el:(tag,_cls,text)=>new Element(tag,text)},document:{createTextNode:text=>new Element('#text',text)},location:{href:'http://127.0.0.1:3438/index.html',hash:'#/reference'},URL,URLSearchParams,Map,AbortController,fetch:async(path)=>{calls.push(path);return {ok:true,text:async()=>guide};}};
vm.runInNewContext(fs.readFileSync('js/pages/reference.js','utf8'),context);
(async()=>{
 const reader=context.ArkUI.pageModules.reference;
 await assert.rejects(reader.prepare('reference',{query:'doc=docs%2F..%2Fsecrets.md'}),/approved/);assert.equal(calls.length,0,'unapproved paths never reach fetch');
 await reader.prepare('reference',{query:'doc=docs%2Fprotocol%2Fagreements.md&from=%2Flifecycle%2Foffer%3Fview%3Dreference'});
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
 await assert.rejects(reader.prepare('reference',{query:'doc=docs%2Fprotocol%2Fauthority.md'}),/could not load/);assert.equal(el.textContent,original,'load failure cannot erase current evidence');
 console.log('PASS: allowlisted sources, literal HTML, safe links, canonical content/commands, table semantics, provenance, exact return depth, and load-failure preservation.');
})().catch(error=>{console.error(error);process.exitCode=1;});

// The packaged reader must be byte-for-byte derived from canonical source.
const payload={ArkUI:{}};vm.runInNewContext(fs.readFileSync('js/content/reference-text.js','utf8'),payload);
const crypto=require('node:crypto');
for(const [doc,entry] of Object.entries(payload.ArkUI.referenceText)){
 const source=fs.readFileSync(doc,'utf8');assert.equal(entry.text,source,'source-owned text survives for '+doc);
 assert.equal(entry.sha256,crypto.createHash('sha256').update(source).digest('hex'),'source revision matches '+doc);
}

/* Regression: evidence left the shell, and a query-driven reader must not
   fetch arbitrary files or interpret source Markdown as executable HTML. */
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
class Element {
 constructor(tag,text=''){this.tagName=tag;this.ownText=text;this.children=[];this.dataset={};this.attributes={};}
 appendChild(x){this.children.push(x);return x;} replaceChildren(){this.children=[];}
 setAttribute(k,v){this.attributes[k]=v;} get textContent(){return this.ownText+this.children.map(x=>x.textContent).join('');}
 get all(){return this.children.flatMap(x=>[x,...x.all]);}
}
const guide = '# Agreements\n\nA **signed** record references `intent_cid`.\n\n<script>alert(1)</script>\n\n[Unsafe](javascript:alert) and [Authority](authority.md).\n\n| Record | Meaning |\n| --- | --- |\n| Intent | exact need |\n\n```sh\nflux miner discover\n```';
const calls=[];
const context={ArkUI:{pageModules:{},pageCatalog:{zero:{path:'/'},'lifecycle/offer':{path:'/lifecycle/offer'},reference:{path:'/reference'}},referenceDocs:['docs/protocol/agreements.md','docs/protocol/authority.md'],referenceText:{'docs/protocol/agreements.md':{text:guide}},el:(tag,_cls,text)=>new Element(tag,text)},document:{createTextNode:text=>new Element('#text',text)},location:{href:'http://127.0.0.1:3438/index.html',hash:'#/reference'},URL,URLSearchParams,Map,AbortController,fetch:async(path)=>{calls.push(path);return {ok:true,text:async()=>guide};}};
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
 assert(anchors.some(x=>x.dataset.referenceOriginal==='true'&&x.href==='docs/protocol/agreements.md'),'original canonical source remains available');
 assert(!anchors.some(x=>/^javascript:/.test(x.href)),'unsafe schemes never become reader links');
 assert(anchors.some(x=>x.href&&x.href.startsWith('#/reference?doc=docs%2Fprotocol%2Fauthority.md')),'approved relative sources stay inside the reader');
 assert(el.all.some(x=>x.tagName==='th'&&x.attributes.scope==='col'),'table headers retain semantic scope');
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

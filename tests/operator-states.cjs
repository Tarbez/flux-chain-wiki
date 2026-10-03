/* Test fixtures stay in this VM. They never enter the rendered public pages. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class Element{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.dataset={};this.attrs={};this.listeners={};this.selectors={};this.isConnected=true;this.value='';this.hidden=false;}
 appendChild(el){this.children.push(el);return el;}replaceChildren(...els){this.children=els;}setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}addEventListener(k,fn){this.listeners[k]=fn;}querySelector(s){return this.selectors[s]||(this.selectors[s]=new Element());}focus(){this.focused=true;}blur(){}get textContent(){return this._text||'';}set textContent(v){this._text=v;this.children=[];}
}
const document={createElement:t=>new Element(t),visibilityState:'visible'};
const window={setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){}};
const reads=[],pending=[];let authOptions,disposed=false,summaryCounts=null;
const context={ArkUI:{pageModules:{}},document,window,console,AbortController,Date,TypeError,ArkAdminAuth:{create(opts){authOptions=opts;return {dispose(){disposed=true;}};}},fetch:async(url,options)=>{
 reads.push({url,options});let data={};
 const src=(id,category)=>({id,label:id,category,state:'available',visibility:'public',enumeration:'enumerable',capabilities:['query']});
 if(url.endsWith('/catalog'))data={sources:[{id:'agreements',label:'Agreements',state:'available',visibility:'public',enumeration:'bounded',capabilities:['query']},src('identities','identity'),src('networks','network'),{id:'accounts',label:'accounts',category:'identity',state:'available',visibility:'exact_id_only',enumeration:'exact_id_only',capabilities:['query','record_detail']}]};
 if(url.endsWith('/health'))data={status:'running'};
 // An older node has no summary route and answers with no counts; a current one answers with what the test sets.
 if(url.includes('/summary'))data=summaryCounts?{health:{status:'running'},counts:summaryCounts,walk:{pageSize:100,maxPages:5}}:{};
 if(url.endsWith('/query')){
  const body=JSON.parse(options.body),rec=i=>({id:body.sourceId+'-'+i,kind:body.sourceId});
  // identities: 107 records over two pages. networks: a cursor that never ends (the walk must stop at its cap).
  if(body.sourceId==='identities')data=body.cursor?{records:Array.from({length:7},(_,i)=>rec(100+i)),page:{nextCursor:null}}:{records:Array.from({length:100},(_,i)=>rec(i)),page:{nextCursor:'c1'}};
  else if(body.sourceId==='networks')data={records:Array.from({length:100},(_,i)=>rec(i)),page:{nextCursor:'more'}};
  else data={records:[{id:'fixture-agreement',kind:'agreement',verification:{state:'unverified'},updatedAt:'2026-10-02T00:00:00Z'}]};
 }
 if(url.endsWith('/record'))return new Promise(resolve=>pending.push({resolve,options}));
 return {ok:true,json:async()=>({apiVersion:'explorer-api-v1',generatedAt:'2026-10-02T00:00:00Z',data})};
}};
vm.runInNewContext(fs.readFileSync('js/pages/explorer.js','utf8'),context);
vm.runInNewContext(fs.readFileSync('js/pages/account.js','utf8'),context);
async function flush(){for(let i=0;i<20;i++)await Promise.resolve();}
(async()=>{
 const host=new Element(),page=context.ArkUI.pageModules.explorer.mount(host),q=s=>page.querySelector(s);
 assert.equal(reads.length,0,'disconnected page cannot perform a read');assert(q('.mesh-explorer-data').hidden);assert(q('.mesh-explorer-metrics').hidden);assert(q('[data-explorer-refresh]').hidden);
 await q('[data-explorer-connect]').listeners.click();assert.equal(page.dataset.connection,'live');assert(!q('.mesh-explorer-data').hidden);assert(!q('[data-explorer-disconnect]').hidden);
 assert.equal(reads[0].url,'https://public.defxn.com/explorer/v1/catalog','the page reads the public mesh by default, not a local Miner');
 assert(reads.every(r=>/^https:\/\/(public|st[1-4])\.defxn\.com\/explorer\/v1\//.test(r.url)),'only the public node and the named storage nodes are contacted');
 assert.equal(JSON.parse(reads.find(r=>r.url.endsWith('/query')).options.body).limit,20,'the record list keeps the bounded read contract');
 // Network at a glance: counts come from walking the source's own cursor pages, capped; wallets are never counted.
 const cards=Object.fromEntries(q('[data-explorer-stats]').children.map(c=>[c.children[0].textContent,c.children[1].textContent]));
 assert.equal(cards.Identities,'107','identities are counted across both cursor pages');
 assert.equal(cards.Networks,'500+','a source that never ends is capped and shown as N+');
 assert.equal(cards.Wallets,'Not public','accounts are exact-ID only, so no wallet total is invented');
 assert(!('Documents' in cards)&&!('Publications' in cards),'sources this node does not offer are not shown as zero');
 assert.equal(q('[data-explorer-nodes]').children.length,5,'public plus st1-st4 are probed for the node list');
 // A node with the one-request summary: the glance comes from that single GET, with no health call, no count walks and no node probes on a refresh.
 summaryCounts={identities:{state:'counted',count:3,capped:false},networks:{state:'unavailable',code:'SOURCE_UNAVAILABLE'}};const before=reads.length;
 await q('[data-explorer-refresh]').listeners.click();const later=reads.slice(before);
 const fresh=Object.fromEntries(q('[data-explorer-stats]').children.map(c=>[c.children[0].textContent,c.children[1].textContent]));
 assert.equal(fresh.Identities,'3','a counted figure is shown');assert.equal(fresh.Networks,'Unavailable','a figure the node could not read is never shown as zero');
 assert(later.some(r=>r.url.endsWith('/explorer/v1/summary?sources=identities,networks')),'the glance is one request');
 assert(!later.some(r=>r.url.endsWith('/health')),'the summary carries the status, so no separate health call or node probe is made');
 assert(later.filter(r=>r.url.endsWith('/query')).every(r=>JSON.parse(r.options.body).limit===20),'no count walks run beside the summary');
 assert(later.filter(r=>r.options&&r.options.body).every(r=>/^text\/plain/.test(r.options.headers['content-type'])),'a POST stays a simple request, so the browser sends no preflight');
 summaryCounts=null;
 // Switching to a local Miner reads only that Miner and stops probing the public nodes.
 const mark=reads.length;q('#mesh-origin').value='local';await q('#mesh-origin').listeners.change();
 assert(reads.length>mark&&reads.slice(mark).every(r=>r.url.startsWith('http://127.0.0.1:8766/explorer/v1/')),'local mode contacts only the local Miner');
 assert.equal(page.dataset.connection,'live');q('#mesh-origin').value='public';await q('#mesh-origin').listeners.change();
 q('[data-explorer-records]').children[0].children[0].listeners.click();await flush();assert.equal(pending.length,1);
 q('[data-explorer-disconnect]').listeners.click();assert(pending[0].options.signal.aborted);pending[0].resolve({ok:true,json:async()=>({apiVersion:'explorer-api-v1',data:{record:{id:'fixture-agreement',sourceId:'agreements'}}})});await flush();assert(q('[data-explorer-detail]').hidden,'a late exact record cannot resurrect a disconnected state');assert(q('.mesh-explorer-data').hidden);assert.equal(page.dataset.connection,'offline');page._explorerCleanup();
 await q('[data-explorer-connect]').listeners.click();
 const origin=q('[data-explorer-records]').children[0], summary=origin.children[0];summary.listeners.click();await flush();
 pending[1].resolve({ok:true,json:async()=>({apiVersion:'explorer-api-v1',data:{record:{id:'fixture-agreement',sourceId:'agreements',verification:{state:'unverified'}}}})});await flush();
 assert.equal(page.dataset.recordView,'detail');assert.equal(q('[data-explorer-records]').children[0],origin,'the actual selected record box becomes its detail');assert(origin.className.includes('mesh-explorer-detail'));
 await q('[data-explorer-refresh]').listeners.click();assert.equal(q('[data-explorer-records]').children[0],origin,'a poll cannot discard the retained detail box');
 origin.children[0].listeners.click();assert.equal(page.dataset.recordView,'list');assert.equal(origin.children[0],summary,'return restores the original summary in the same box');
 summary.listeners.click();await flush();pending[2].resolve({ok:true,json:async()=>({apiVersion:'explorer-api-v1',data:{record:{id:'different-record',sourceId:'agreements'}}})});await flush();
 assert.equal(page.dataset.recordView,'list','an unexpected ID cannot open a misleading detail');assert(q('[data-explorer-result-message]').textContent.includes('different record or source'));
 page._explorerCleanup();
 const account=context.ArkUI.pageModules.account.mount(new Element());authOptions.onChange(null);assert(account.querySelector('.account-state').hidden);assert(account.querySelector('.account-live').hidden);const count=reads.length;await account.querySelector('[data-account-mesh-check]').listeners.click();assert.equal(reads.length,count,'signed-out state cannot query an identity');
 authOptions.onChange({identityId:'fixture-identity',publicKeyB64:'fixture-public-root',displayName:'Fixture'});assert(!account.querySelector('.account-state').hidden);assert(!account.querySelector('.account-live').hidden);assert(account.querySelector('[data-account-verification]').textContent.includes('No mesh account or balance has been verified'));
 authOptions.onChange(null);assert(account.querySelector('.account-live').hidden);account.arkDispose();assert(disposed,'unmount disposes the local signer');
 console.log('PASS: no read before the page starts, public-first with explicit local switch, cursor-walk counts with a cap, wallets never counted, node list, bounded query, retained record identity and reverse, exact-ID rejection, abort/stale-read isolation, local identity scope, and signer disposal.');
})().catch(error=>{console.error(error);process.exitCode=1;});

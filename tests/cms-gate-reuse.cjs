/* A live public signer is reused by the gate; a restored cookie permits editing
   without manufacturing a signer from remembered public metadata. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class El {
 constructor(){this.children=[];this.dataset={};this.classList={add(){},remove(){}};}
 setAttribute(){} addEventListener(){} appendChild(x){this.children.push(x);return x;} remove(){} focus(){}
}
async function gate({shared=null,authenticated=false,publicKey='root',denied=false,localDevelopment=false}){
 const nodes=new Map();const get=id=>{if(!nodes.has(id))nodes.set(id,new El());return nodes.get(id);};
 const body=new El();let onChange;let pointer={publicKeyB64:'root',displayName:'Member'},listeners=[];let signs=0,clears=0;
 const who={publicKeyB64:'root',displayName:'Member',async sign(){signs++;return 'sig';}};
 const account={current:()=>pointer,set(x){pointer=x;listeners.forEach(f=>f(x));},clear(){clears++;pointer=null;listeners.forEach(f=>f(null));},subscribe(f){listeners.push(f);f(pointer);}};
 const window={ArkAdminAuth:{},ArkUI:{localIdentity:account,cmsSession:{sharedSigner:()=>shared?who:null,revoke:async()=>{}}},confirm:()=>true};
 const location={protocol:'http:',host:'127.0.0.1:3437',origin:'http://127.0.0.1:3437'};
 const paths=[];
 const fetch=async path=>{paths.push(path);let data={ok:true};
 if(path==='/api/cms/access')Object.assign(data,{authorized:!denied,error:denied?'Not the owner':undefined});
 if(path==='/api/session')Object.assign(data,{authenticated,publicKeyB64:publicKey,localDevelopment});
 if(path.endsWith('challenge'))Object.assign(data,{message:'flux-chain-admin-login/v1|127.0.0.1:3437|nonce',nonce:'nonce'});
 if(path.endsWith('login'))Object.assign(data,{done:true});
 return {ok:data.ok,json:async()=>data};};
 const ArkAdminAuth={create(o){onChange=o.onChange;return {signOut(){onChange(null);}};}};
 vm.runInNewContext(fs.readFileSync('js/admin/gate.js','utf8'),{window,location,fetch,ArkAdminAuth,document:{getElementById:get,createElement:()=>new El(),body},setTimeout:fn=>{queueMicrotask(fn);},clearInterval(){},setInterval(){}});
 await new Promise(resolve=>setImmediate(resolve));
 return {window,body,paths,signs,clears,nodes,account};
}
(async()=>{
 const live=await gate({shared:true});assert.equal(live.signs,1);assert.equal(live.body.children.length,1,'authorized shared signer opens editor');assert(live.window.ArkGate.identity(),'editor receives live identity');
 const existing=await gate({shared:true,authenticated:true});assert.equal(existing.signs,0);assert(existing.window.ArkGate.identity());
 const reload=await gate({authenticated:true});assert.equal(reload.body.children.length,1);assert.equal(reload.window.ArkGate.identity(),null,'cookie restores editing only');
 reload.account.clear();await new Promise(resolve=>setImmediate(resolve));
 assert(reload.paths.includes('/api/session/logout'),'public sign-out revokes restored editor even without a live signer');
 assert.equal(reload.nodes.get('gateHeading').textContent,'Locked.');
 const denied=await gate({shared:true,denied:true});assert.equal(denied.body.children.length,0);assert.equal(denied.clears,0,'CMS refusal must not sign out the valid public identity');
 assert.equal(denied.nodes.get('gateHeading').textContent,'Signed in. CMS access not granted.');
 const local=await gate({localDevelopment:true});assert.equal(local.body.children.length,1);assert.equal(local.signs,0);assert.equal(local.window.ArkGate.identity(),null);
 console.log('PASS: CMS gate reuses live account, resumes cookie session, locks signer on reload, and preserves public login on access refusal.');
})().catch(e=>{console.error(e);process.exitCode=1;});

import assert from 'node:assert/strict';
import http from 'node:http';
import {createHost} from '../scripts/publish-host.mjs';
import {createCmsPermissions} from '../scripts/lib/cms-permissions.mjs';
import {createFluxRootHandle} from '../../flux-auth/src/rootFromMnemonic.mjs';
import {buildNameRecordSigningMessage} from '../../ark-miner-cli/src/state/name-record-validators.js';
const owner=await createFluxRootHandle('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
const other=await createFluxRootHandle('legal winner thank year wave sausage worth useful legal winner thank yellow');
const sign=(handle,text)=>Buffer.from(handle.sign(new TextEncoder().encode(text))).toString('base64');
const record={name:'flux-chain.ark',ownerPublicKey:owner.publicKeyB64,version:1,updatedAt:'2026-10-03T00:00:00.000Z',targets:[{type:'ipfs_cid',value:'bafy-test-site'}]};
record.proof={alg:'Ed25519',sig:'pending'};
record.proof.sig=sign(owner,buildNameRecordSigningMessage(record));
const item={id:record.name,sourceId:'names',verification:{state:'verified'},record};
const provider=createCmsPermissions({name:record.name,fetchImpl:async()=>({ok:true,json:async()=>({apiVersion:'explorer-api-v1',partial:false,data:{record:item}})})});
assert.equal((await provider(owner.publicKeyB64)).authorized,true);
await assert.rejects(()=>provider(other.publicKeyB64),/does not verify/);
record.proof.sig=sign(other,buildNameRecordSigningMessage(record));
await assert.rejects(()=>provider(owner.publicKeyB64),/does not verify/,'claimed verification flag cannot replace signature verification');
const missing=createCmsPermissions({name:record.name,fetchImpl:async()=>({ok:true,json:async()=>({apiVersion:'explorer-api-v1',data:{record:null}})})});
await assert.rejects(()=>missing(owner.publicKeyB64),/no verified public ownership/,'empty registry grants nobody access');
record.proof.sig=sign(owner,buildNameRecordSigningMessage(record));
const reserve=http.createServer();await new Promise(r=>reserve.listen(0,'127.0.0.1',r));const port=reserve.address().port;await new Promise(r=>reserve.close(r));
let minerCalls=0;
const publisher={name:record.name,authorize(){minerCalls++;throw Error('No local Miner');},status(){minerCalls++;return {reachable:false,detail:'Publishing connection unavailable'};}};
const server=createHost({port,publisher,permissions:provider,dataDir:null});await new Promise(r=>server.listen(port,'127.0.0.1',r));
let cookie='';
async function call(path,body){const res=await fetch(`http://127.0.0.1:${port}${path}`,{method:body===undefined?'GET':'POST',headers:{connection:'close',cookie,...(body===undefined?{}:{'content-type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});if(res.headers.get('set-cookie'))cookie=res.headers.get('set-cookie').split(';')[0];return res;}
async function login(who){const challenge=await (await call('/api/session/challenge',{})).json();return call('/api/session/login',{publicKeyB64:who.publicKeyB64,nonce:challenge.nonce,signature:sign(who,challenge.message)});}
try{
 assert.equal((await login(other)).status,200,'any valid identity can sign in without Miner or CMS permission');
 assert.equal(minerCalls,0);
 assert.equal((await (await call('/api/session')).json()).authenticated,true);
 assert.equal((await (await call('/api/cms/access')).json()).authorized,false);
 for(const path of ['/admin-app.html','/js/admin/store.js','/api/status','/api/site'])assert.equal((await call(path)).status,403,`identity session alone must not open ${path}`);
 assert.equal((await login(owner)).status,200);
 assert.equal((await (await call('/api/cms/access')).json()).authorized,true);
 assert.equal((await call('/admin-app.html')).status,200,'mesh owner can edit without local Miner');
 assert.equal(minerCalls,0);
 assert.equal((await (await call('/api/status')).json()).reachable,false,'publishing connection reported separately');
 await call('/api/session/logout',{});
 assert.equal((await call('/admin-app.html')).status,401);
 console.log('PASS: Miner-independent identity login; separate server-enforced CMS permission; signed public ownership; empty/forged records denied; publishing unavailable without blocking editing.');
}finally{await new Promise(r=>server.close(r));}
const local=createHost({port,publisher,localDevelopment:true});await new Promise(r=>local.listen(port,'127.0.0.1',r));
try {
 cookie='';
 assert.equal((await call('/admin-app.html')).status,200,'direct local editor needs no identity');
 assert.equal((await (await call('/api/session')).json()).localDevelopment,true);
 assert.equal((await call('/api/prepare',{})).status,401,'local publishing still needs a signed identity');
 assert.equal((await call('/api/publish',{})).status,401);
 for(const header of ['forwarded','x-forwarded-for','x-forwarded-host']) {
  const res=await fetch(`http://127.0.0.1:${port}/admin-app.html`,{headers:{[header]:'127.0.0.1'}});
  assert.equal(res.status,401,'forwarded loopback must not receive local editor access');
 }
 const foreign=await fetch(`http://127.0.0.1:${port}/api/session/logout`,{method:'POST',headers:{origin:'https://evil.example','content-type':'application/json'},body:'{}'});
 assert.equal(foreign.status,403);
}finally{await new Promise(r=>local.close(r));}
assert.throws(()=>createHost({port,publisher,localDevelopment:true,deployedOrigin:'https://defxn.com'}),/cannot enable/);
const domain=createHost({port,publisher,permissions:provider,deployedOrigin:'https://defxn.com'});await new Promise(r=>domain.listen(port,'127.0.0.1',r));
async function domainCall(path,body,origin='https://defxn.com') {
 return new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port,path,method:body===undefined?'GET':'POST',headers:{host:'defxn.com',origin,cookie,...(body===undefined?{}:{'content-type':'application/json'})}},res=>{let text='';res.on('data',c=>text+=c);res.on('end',()=>resolve({status:res.statusCode,headers:{get:key=>{const value=res.headers[key];return Array.isArray(value)?value.join(','):value;}},json:async()=>JSON.parse(text)}));});req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body));});
}
try {
 cookie='';
 assert.equal((await call('/admin-app.html')).status,403,'domain mode rejects loopback Host');
 assert.equal((await domainCall('/admin-app.html')).status,401,'domain editor never opens anonymously');
 const challenge=await (await domainCall('/api/session/challenge',{})).json();assert(challenge.message.includes('|defxn.com|'));
 const loginResponse=await domainCall('/api/session/login',{publicKeyB64:owner.publicKeyB64,nonce:challenge.nonce,signature:sign(owner,challenge.message)});
 assert.equal(loginResponse.status,200);assert(loginResponse.headers.get('set-cookie').includes('; Secure'));
 cookie=loginResponse.headers.get('set-cookie').split(';')[0];
 assert.equal((await domainCall('/admin-app.html')).status,200);
 record.version=2;record.ownerPublicKey=other.publicKeyB64;record.proof.sig=sign(other,buildNameRecordSigningMessage(record));
 assert.equal((await domainCall('/admin-app.html')).status,403,'mesh ownership transfer revokes the old maintainer immediately');
 assert.equal((await (await domainCall('/api/session')).json()).authenticated,true,'loss of permission does not destroy identity');
 const csrf=await domainCall('/api/session/logout',{},'http://defxn.com');assert.equal(csrf.status,403);
 console.log('PASS: local editor opens without authentication; publishing stays signed; forwarded local bypass denied; HTTPS domain mode requires current mesh owner and secure cookie; ownership transfer revokes access.');
}finally{await new Promise(r=>domain.close(r));owner.dispose();other.dispose();}

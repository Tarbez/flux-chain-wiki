import assert from 'node:assert/strict';
import http from 'node:http';
import {createHost} from '../scripts/publish-host.mjs';
import {createCmsPermissions, nameNodesFromEnv} from '../scripts/lib/cms-permissions.mjs';
import {createFluxRootHandle} from '../../fxn-auth/src/rootFromMnemonic.mjs';
import {signer, handleSigner, buildProof, answers, tamper, dense} from './lib/dense-wire-proof.mjs';
/* Who may edit is who owns the name on the dense-wire chain (docs/DEFXN-NAMES-ONE-SYSTEM.md).
   The owner's identity key is the chain's genesis key here (claims are genesis-only), and the
   fake node answers whatever `served` holds, so the cases below are each a way the chain, or a
   node, could decide: owner, stranger, no claim, a proof that does not verify, a transfer. */
const owner=await createFluxRootHandle('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
const other=await createFluxRootHandle('legal winner thank year wave sausage worth useful legal winner thank yellow');
const sign=async (handle,text)=>Buffer.from(await handle.sign(new TextEncoder().encode(text))).toString('base64');
const NAME='flux-chain.ark';
const ownerSigner=handleSigner(owner), otherSigner=handleSigner(other);
const ownedByOwner=await buildProof({fqdn:NAME,genesis:ownerSigner,targets:[{type:'ipfs_cid',value:'bafy-test-site'}]});
let served=answers.proof(ownedByOwner);
assert.deepEqual(nameNodesFromEnv({}),['wss://nodes.defxn.com/native'],'a Node process sends no Origin, so it must use /native');
assert.deepEqual(nameNodesFromEnv({DEFXN_NAME_NODES:'ws://a:1/native, ws://b:1/native'}),['ws://a:1/native','ws://b:1/native']);
const provider=createCmsPermissions({name:NAME,genesisPubHex:ownerSigner.pubHex,dense,askProof:(fqdn)=>served(fqdn)});
assert.equal((await provider(owner.publicKeyB64)).authorized,true);
assert.equal((await provider(owner.publicKeyB64)).source,'dense-wire-domain-proof');
await assert.rejects(()=>provider(other.publicKeyB64),/does not verify this identity as the site owner/);
served=answers.proof([tamper(ownedByOwner[0]),ownedByOwner[1]]);
await assert.rejects(()=>provider(owner.publicKeyB64),/does not verify \(BadSignature\)/,'a proof that does not verify authorizes nobody, not even the owner');
served=answers.proof(await buildProof({fqdn:NAME,genesis:signer(),targets:[{type:'ipfs_cid',value:'bafy-test-site'}]}));
await assert.rejects(()=>provider(owner.publicKeyB64),/NotGenesisClaim/,'a claim by a key that is not the pinned genesis key is nobody\'s ownership');
served=answers.none();
await assert.rejects(()=>provider(owner.publicKeyB64),/no such name/,'an unclaimed name grants nobody access');
const bootstrap=createCmsPermissions({name:NAME,genesisPubHex:ownerSigner.pubHex,dense,askProof:answers.none(),firstOwnerPublicKeyB64:owner.publicKeyB64});
assert.equal((await bootstrap(owner.publicKeyB64)).source,'first-owner-bootstrap','the pre-declared operator key may edit before the name is claimed');
await assert.rejects(()=>bootstrap(other.publicKeyB64),/no such name/,'nobody else may');
await assert.rejects(()=>createCmsPermissions({name:NAME,genesisPubHex:'',dense,askProof:answers.proof(ownedByOwner)})(owner.publicKeyB64),/no genesis key is pinned/);
await assert.rejects(()=>createCmsPermissions({name:NAME,genesisPubHex:ownerSigner.pubHex,dense,askProof:answers.silent()})(owner.publicKeyB64),/did not answer/);
await assert.rejects(()=>createCmsPermissions({name:'a.b.fxn',genesisPubHex:ownerSigner.pubHex,dense,askProof:answers.none()})(owner.publicKeyB64),/not a name the one name system carries/);
served=answers.proof(ownedByOwner);
const reserve=http.createServer();await new Promise(r=>reserve.listen(0,'127.0.0.1',r));const port=reserve.address().port;await new Promise(r=>reserve.close(r));
let minerCalls=0;
const publisher={name:NAME,authorize(){minerCalls++;throw Error('No local Miner');},status(){minerCalls++;return {reachable:false,detail:'Publishing connection unavailable'};}};
const server=createHost({port,publisher,permissions:provider,dataDir:null});await new Promise(r=>server.listen(port,'127.0.0.1',r));
let cookie='';
async function call(path,body){const res=await fetch(`http://127.0.0.1:${port}${path}`,{method:body===undefined?'GET':'POST',headers:{connection:'close',cookie,...(body===undefined?{}:{'content-type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});if(res.headers.get('set-cookie'))cookie=res.headers.get('set-cookie').split(';')[0];return res;}
async function login(who){const challenge=await (await call('/api/session/challenge',{})).json();return call('/api/session/login',{publicKeyB64:who.publicKeyB64,nonce:challenge.nonce,signature:await sign(who,challenge.message)});}
try{
 assert.equal((await login(other)).status,200,'any valid identity can sign in without Miner or CMS permission');
 assert.equal(minerCalls,0);
 assert.equal((await (await call('/api/session')).json()).authenticated,true);
 assert.equal((await (await call('/api/cms/access')).json()).authorized,false);
 for(const path of ['/admin-app.html','/js/admin/admin.js','/js/admin/store.js','/api/status','/api/site'])assert.equal((await call(path)).status,403,`identity session alone must not open ${path}`);
 assert.equal((await login(owner)).status,200);
 assert.equal((await (await call('/api/cms/access')).json()).authorized,true);
 assert.equal((await call('/admin-app.html')).status,200,'mesh owner can edit without local Miner');
 assert.equal(minerCalls,0);
 assert.equal((await (await call('/api/status')).json()).reachable,false,'publishing connection reported separately');
 await call('/api/session/logout',{});
 assert.equal((await call('/admin-app.html')).status,401);
 console.log('PASS: Miner-independent identity login; separate server-enforced CMS permission; chain-verified ownership; unclaimed names and bad proofs denied; publishing unavailable without blocking editing.');
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
 const loginResponse=await domainCall('/api/session/login',{publicKeyB64:owner.publicKeyB64,nonce:challenge.nonce,signature:await sign(owner,challenge.message)});
 assert.equal(loginResponse.status,200);assert(loginResponse.headers.get('set-cookie').includes('; Secure'));
 cookie=loginResponse.headers.get('set-cookie').split(';')[0];
 assert.equal((await domainCall('/admin-app.html')).status,200);
 served=answers.proof(await buildProof({fqdn:NAME,genesis:ownerSigner,transferTo:otherSigner,targets:[{type:'ipfs_cid',value:'bafy-test-site'}]}));
 assert.equal((await domainCall('/admin-app.html')).status,403,'a transfer of the name on the chain revokes the old maintainer immediately');
 assert.equal((await (await domainCall('/api/session')).json()).authenticated,true,'loss of permission does not destroy identity');
 const csrf=await domainCall('/api/session/logout',{},'http://defxn.com');assert.equal(csrf.status,403);
 console.log('PASS: local editor opens without authentication; publishing stays signed; forwarded local bypass denied; HTTPS domain mode requires current mesh owner and secure cookie; ownership transfer revokes access.');
}finally{await new Promise(r=>domain.close(r));owner.dispose();other.dispose();}

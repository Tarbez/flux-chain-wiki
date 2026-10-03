/* Regression: public sign-in must reuse CMS access without treating cached
   metadata as authorization, leaking a key, or surviving explicit sign-out. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const who={identityId:'id',publicKeyB64:'root',displayName:'Member',rootVerified:true,async sign(){return 'signature';}};
function bridge(fetch,opener=null){
 const window={ArkUI:{},opener};
 const location={hostname:'127.0.0.1',host:'127.0.0.1:3437',origin:'http://127.0.0.1:3437'};
 vm.runInNewContext(fs.readFileSync('js/ark/cms-session.js','utf8'),{window,location,fetch});
 return window.ArkUI.cmsSession;
}
const response=data=>({ok:true,json:async()=>({ok:true,...data})});
async function main(){
 let calls=[],signed=0;
 const identity={...who,async sign(message){signed++;assert(message.startsWith('flux-chain-admin-login/v1|127.0.0.1:3437|'));return 'signature';}};
 const cms=bridge(async(path,options)=>{calls.push({path,body:options.body&&JSON.parse(options.body)});return response(path==='/api/session'?{authenticated:false}:path.endsWith('/challenge')?{message:'flux-chain-admin-login/v1|127.0.0.1:3437|nonce',nonce:'nonce'}:{done:true,authorized:true});});
 await cms.connect(identity);
 assert.equal(signed,1);assert.equal(cms.status(),'Signed in · CMS access granted.');
 assert.deepEqual(Object.keys(calls.find(call=>call.path==='/api/session/login').body).sort(),['label','nonce','publicKeyB64','signature']);
 await cms.revoke();assert.equal(calls.at(-1).path,'/api/session/logout');
 let badSigns=0;
 const bad=bridge(async path=>response(path==='/api/session'?{authenticated:false}:{message:'flux-chain-admin-login/v1|evil.example|nonce'}));
 await bad.connect({...who,async sign(){badSigns++;}});assert.equal(badSigns,0,'foreign-host challenge must not be signed');
 let requests=0;await bridge(async()=>{requests++;return response({authenticated:false});}).connect({...who,rootVerified:false});assert.equal(requests,1,'cached pointer performs only a session read, never login');;
 const already=bridge(async path=>{assert(['/api/session','/api/cms/access'].includes(path));return response({authenticated:true,publicKeyB64:'root',authorized:true});});
 await already.connect(identity);assert.equal(signed,1,'matching authorized session avoids a redundant login');
 let release,started;const ready=new Promise(r=>started=r);const paths=[];
 const race=bridge(async path=>{paths.push(path);if(path==='/api/session/login'){started();return new Promise(r=>release=()=>r(response({done:true})));}return response(path==='/api/session'?{authenticated:false}:{message:'flux-chain-admin-login/v1|127.0.0.1:3437|nonce',nonce:'nonce'});});
 const pending=race.connect(identity);await ready;await race.revoke();release();await pending;
 assert.equal(paths.at(-1),'/api/session/logout','late login completion must revoke rather than restore a signed-out session');
 const location={origin:'http://127.0.0.1:3437'};
 const opener={location,ArkUI:{accountSession:{isUnlocked:()=>true,current:()=>who}}};
 assert.equal(bridge(()=>{},opener).sharedSigner(),who,'same-origin account can supply its live signer');
 assert.equal(bridge(()=>{},{...opener,location:{origin:'https://other.example'}}).sharedSigner(),null);
 opener.ArkUI.accountSession.isUnlocked=()=>false;assert.equal(bridge(()=>{},opener).sharedSigner(),null,'remembered account cannot supply signing authority');
 console.log('PASS: public/CMS access reuse, host-bound signatures, metadata refusal, shared signer, and sign-out race.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});

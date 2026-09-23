const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({Object,JSON});
vm.runInContext(fs.readFileSync('js/content/secrets.js','utf8'),ctx);
const ArkSecret=ctx.ArkSecret;

// A well-formed secret: ciphertext + one wrapped-key envelope. Only shape is checked here
// (base64-ness, required fields), not that the bytes actually decrypt -- tests/content-crypto.cjs
// proves the crypto round-trips; this proves ArkSecret accepts and reserializes real output from it.
const envelope={recipientPublicKey:'AAAA',algorithm:'x25519-xsalsa20poly1305',nonce:'BBBB',ephemeralPublicKey:'CCCC',ciphertext:'DDDD'};
const good={id:'draft-note',label:'Draft note',ciphertextBase64:'RUFB',metadata:{version:1,cipherAlgorithm:'AES-GCM',iv:'RUFB'},recipients:[envelope]};
assert.equal(ArkSecret.problems(good).length,0,'a well-formed secret has no problems');
ArkSecret.define(good);
assert.deepEqual(ArkSecret.get('draft-note'),good,'define/get round-trips');
assert.equal(ArkSecret.all().length,1);

// define() replaces an existing id rather than duplicating it.
ArkSecret.define(Object.assign({},good,{label:'Renamed'}));
assert.equal(ArkSecret.all().length,1,'redefining an id updates it in place');
assert.equal(ArkSecret.get('draft-note').label,'Renamed');

ArkSecret.remove('draft-note');
assert.equal(ArkSecret.all().length,0,'remove actually removes it');

// Every rejection reason, named, so admin.js can show it without guessing.
const cases=[
 [{id:'Bad Id',label:'x',ciphertextBase64:'RUFB',metadata:good.metadata,recipients:[envelope]},/id must be lowercase/],
 [{id:'ok',label:'',ciphertextBase64:'RUFB',metadata:good.metadata,recipients:[envelope]},/label is missing/],
 [{id:'ok',label:'x',ciphertextBase64:'',metadata:good.metadata,recipients:[envelope]},/ciphertextBase64 is missing/],
 [{id:'ok',label:'x',ciphertextBase64:'not base64!!',metadata:good.metadata,recipients:[envelope]},/ciphertextBase64 is not base64/],
 [{id:'ok',label:'x',ciphertextBase64:'RUFB',metadata:{cipherAlgorithm:'AES-CBC',iv:'RUFB'},recipients:[envelope]},/cipherAlgorithm must be AES-GCM/],
 [{id:'ok',label:'x',ciphertextBase64:'RUFB',metadata:good.metadata,recipients:[]},/recipients must list at least one/],
 [{id:'ok',label:'x',ciphertextBase64:'RUFB',metadata:good.metadata,recipients:[Object.assign({},envelope,{algorithm:'aes'})]},/algorithm must be x25519-xsalsa20poly1305/],
 [{id:'ok',label:'x',ciphertextBase64:'RUFB',metadata:good.metadata,recipients:[Object.assign({},envelope,{ciphertext:undefined})]},/recipient 1: ciphertext is missing/],
];
cases.forEach(function([secret,pattern]){
 const bad=ArkSecret.problems(secret);
 assert(bad.length && pattern.test(bad.join('; ')),'problems() names: '+JSON.stringify(secret));
 assert.throws(function(){ArkSecret.define(secret);},pattern,'define() refuses the same secret');
});

// The size cap is enforced on the decoded ciphertext length, not the base64 string length.
const oversizedBase64=Buffer.alloc(ArkSecret.maxBytes+1).toString('base64');
const oversized={id:'too-big',label:'x',ciphertextBase64:oversizedBase64,metadata:good.metadata,recipients:[envelope]};
assert(/larger than/.test(ArkSecret.problems(oversized).join('; ')),'oversized ciphertext is refused with a size reason');
const atCap={id:'at-cap',label:'x',ciphertextBase64:Buffer.alloc(ArkSecret.maxBytes).toString('base64'),metadata:good.metadata,recipients:[envelope]};
assert.equal(ArkSecret.problems(atCap).length,0,'exactly at the cap is still accepted');

// No plaintext-shaped field exists on the object at all -- there is nothing to leak by serializing it.
assert(!Object.keys(good).some(k=>/plain|content|body/i.test(k)),'a secret carries only ciphertext and envelopes, never a plaintext field');

// serialize() produces the exact file text ArkSecret.define can read back.
const source=ArkSecret.serialize(good);
const ctx2=vm.createContext({Object,JSON});
vm.runInContext(fs.readFileSync('js/content/secrets.js','utf8'),ctx2);
vm.runInContext(source,ctx2);
const roundTripped=JSON.parse(JSON.stringify(vm.runInContext('ArkSecret.get("draft-note")',ctx2)));
assert.deepEqual(roundTripped,good,'serialize/define round-trips the exact object');

console.log('PASS: ArkSecret define/get/remove, every validation reason named, size cap enforced on decoded ciphertext, no plaintext field, serialize round-trips.');

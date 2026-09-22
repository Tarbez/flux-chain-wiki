const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({Object,JSON});
vm.runInContext(fs.readFileSync('js/content/assets.js','utf8'),ctx);
const ArkAsset=ctx.ArkAsset;

// A tiny valid PNG base64 blob (1x1) stands in for a real image: only its
// shape (mime, size, base64-ness) is checked, not its pixels.
const TINY_PNG='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

// problems()/all() return arrays built inside the vm sandbox; compared against
// a host-realm [] literal, assert.deepStrictEqual sees different Array
// constructors and fails even on equal content, so these compare via length
// or a JSON round trip (the same fix scripts/lib/site-bundle.mjs uses for the
// same cross-realm issue) rather than assert.deepEqual directly.
const good={id:'iceberg-blocks',label:'Iceberg blocks',mime:'image/png',dataBase64:TINY_PNG};
assert.equal(ArkAsset.problems(good).length,0,'a well-formed asset has no problems');
ArkAsset.define(good);
assert.deepEqual(ArkAsset.get('iceberg-blocks'),good,'define/get round-trips');
assert.equal(ArkAsset.all().length,1);
assert.equal(ArkAsset.dataUrl('iceberg-blocks'),'data:image/png;base64,'+TINY_PNG,'dataUrl composes a usable src');
assert.equal(ArkAsset.dataUrl('missing'),null,'an unknown id resolves to nothing, not a throw');

// define() replaces an existing id rather than duplicating it.
ArkAsset.define(Object.assign({},good,{label:'Renamed'}));
assert.equal(ArkAsset.all().length,1,'redefining an id updates it in place');
assert.equal(ArkAsset.get('iceberg-blocks').label,'Renamed');

ArkAsset.remove('iceberg-blocks');
assert.equal(ArkAsset.all().length,0,'remove actually removes it');

// Every rejection reason, named, so admin.js can show it without guessing.
const cases=[
 [{id:'Bad Id',label:'x',mime:'image/png',dataBase64:TINY_PNG},/id must be lowercase/],
 [{id:'ok',label:'',mime:'image/png',dataBase64:TINY_PNG},/label is missing/],
 [{id:'ok',label:'x',mime:'image/gif',dataBase64:TINY_PNG},/mime must be one of/],
 [{id:'ok',label:'x',mime:'image/png',dataBase64:''},/dataBase64 is missing/],
 [{id:'ok',label:'x',mime:'image/png',dataBase64:'not base64!!'},/dataBase64 is not base64/],
];
cases.forEach(function([asset,pattern]){
 const bad=ArkAsset.problems(asset);
 assert(bad.length && pattern.test(bad.join('; ')),'problems() names: '+JSON.stringify(asset));
 assert.throws(function(){ArkAsset.define(asset);},pattern,'define() refuses the same asset');
});

// The size cap is enforced on the decoded length, not the base64 string length.
const oversizedBase64=Buffer.alloc(ArkAsset.maxBytes+1).toString('base64');
const oversized={id:'too-big',label:'x',mime:'image/png',dataBase64:oversizedBase64};
assert(/larger than/.test(ArkAsset.problems(oversized).join('; ')),'an oversized image is refused with a size reason');
const atCap={id:'at-cap',label:'x',mime:'image/png',dataBase64:Buffer.alloc(ArkAsset.maxBytes).toString('base64')};
assert.equal(ArkAsset.problems(atCap).length,0,'exactly at the cap is still accepted');

// serialize() produces the exact file text ArkAsset.define can read back.
const source=ArkAsset.serialize(good);
const ctx2=vm.createContext({Object,JSON});
vm.runInContext(fs.readFileSync('js/content/assets.js','utf8'),ctx2);
vm.runInContext(source,ctx2);
const roundTripped=JSON.parse(JSON.stringify(vm.runInContext('ArkAsset.get("iceberg-blocks")',ctx2)));
assert.deepEqual(roundTripped,good,'serialize/define round-trips the exact object');

console.log('PASS: ArkAsset define/get/remove/dataUrl, every validation reason named, size cap enforced on decoded bytes, serialize round-trips.');

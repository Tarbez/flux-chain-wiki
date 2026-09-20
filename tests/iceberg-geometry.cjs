const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({Float32Array,Math,Object});
vm.runInContext(fs.readFileSync('js/halo/iceberg.js','utf8'),ctx);
const primary=19200,secondary=24000;
const mesh=ctx.IcebergGeometry.create(primary,secondary);
assert.equal(mesh.length,(primary+secondary)*4);
assert(mesh.every(Number.isFinite));
let above=[Infinity,-Infinity],below=[Infinity,-Infinity],water=[Infinity,-Infinity];
for(let i=0;i<primary+secondary;i++){
 const y=mesh[i*4+1];
 const region=i<primary?above:i<primary+secondary*.8?below:water;
 region[0]=Math.min(region[0],y);region[1]=Math.max(region[1],y);
 assert(mesh[i*4+3]>=.11 && mesh[i*4+3]<=1);
}
assert(above[0]>=.20-1e-4 && above[1]>.99,'mesh one rises from the waterline');
assert(below[1]<=.20 && below[0]<-1.27,'mesh two forms the submerged mass');
assert(below[1]-below[0]>(above[1]-above[0])*1.8,'the submerged mass is substantially deeper');
assert(water[0]>=.194-1e-6 && water[1]<=.206+1e-6,'water samples remain at the shared waterline');
assert.deepEqual(mesh,ctx.IcebergGeometry.create(primary,secondary),'stable targets prevent regenerated-particle jumps');
console.log('PASS: stable two-mesh iceberg, shared waterline, deeper submerged body, finite positions and light values.');
const waterX=[];
for(let i=primary+secondary*.8;i<primary+secondary;i++)waterX.push(mesh[i*4]/1.25*1.04);
assert(Math.min(...waterX)<-1 && Math.max(...waterX)>1,'water has samples beyond both viewport edges');

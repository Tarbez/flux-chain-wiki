const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({Float32Array,Math,Object});
vm.runInContext(fs.readFileSync('js/halo/image-shape.js','utf8'),ctx);
const primary=19200,secondary=24000;
// Synthetic stepped-pyramid sampler: pure function of (u,v), same shape the
// generated PNG encodes, so this exercises the module the way the real
// asset would without needing a browser/canvas.
function sample(u,v){
 const dx=(u-.5)*2,dy=(v-.5)*2,d=Math.max(Math.abs(dx),Math.abs(dy));
 return Math.max(0,1-Math.floor(d*5)/5);
}
const mesh=ctx.ImageShape.create(primary,secondary,sample);
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
assert(below[1]<=.20 && below[0]<-1.27,'mesh two forms the submerged echo');
assert(water[0]>=.194-1e-6 && water[1]<=.206+1e-6,'water samples remain at the shared waterline');
assert.deepEqual(mesh,ctx.ImageShape.create(primary,secondary,sample),'stable targets prevent regenerated-particle jumps');
const waterX=[];
for(let i=primary+secondary*.8;i<primary+secondary;i++)waterX.push(mesh[i*4]/1.25*1.04);
assert(Math.min(...waterX)<-1 && Math.max(...waterX)>1,'water has samples beyond both viewport edges');
// A brighter sampler must raise more points near the peak: content actually
// reaches the mesh, not just the fixed envelope.
const dim=ctx.ImageShape.create(primary,secondary,()=>0);
const bright=ctx.ImageShape.create(primary,secondary,()=>1);
let dimLight=0,brightLight=0;
for(let i=0;i<primary;i++){dimLight+=dim[i*4+3];brightLight+=bright[i*4+3];}
assert(brightLight>dimLight*3,'image brightness reaches the light channel');
console.log('PASS: stable two-mesh image shape, shared waterline, image brightness reaches the mesh, finite positions and light values.');

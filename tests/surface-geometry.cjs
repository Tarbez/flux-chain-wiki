// Evaluate the actual shader's scalar geometry expressions, not a copied model.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('js/halo/shaders.js','utf8'),ctx);
const source=ctx.ParticleShaders.vertex;
const names=['envelope','extent','growth','echo','spiral','unfurl'];
const body=names.map(name=>{
 const match=source.match(new RegExp('float '+name+'=([^;]+);'));
 assert(match,'shader expression '+name+' exists');return 'const '+name+'='+match[1]+';';
}).join('\n');
const sample=new Function('reach','angle','clock',`
 const {sin,cos,pow,max}=Math;
 const uFieldExtent={x:2.8,y:1.7};
 const smoothstep=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
 ${body}
 return [echo,spiral,unfurl];
`);
assert(sample(0,1,2).filter((_,i)=>i!==1).every(r=>r===.96),'the two wide forms attach to the same rim');
const separation=Array.from({length:3},()=>Array(3).fill(0));let samples=0;
for(let r=.3;r<.9;r+=.1) for(let a=0;a<Math.PI*2;a+=.12){
 const radii=sample(r,a,1);
 assert(radii.every(Number.isFinite));
 assert(radii.filter((_,i)=>i!==1).every(v=>v>=.96),'wide states stay outside the zero');
 assert(radii[1]>=.10 && radii[1]<=.36,'only the middle spiral fits within the opening');
 for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)separation[i][j]+=(radii[i]-radii[j])**2;
 samples++;
}
for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)assert(Math.sqrt(separation[i][j]/samples)>.15,'each pair has a materially different projected radius');
console.log('PASS: two wide profiles share the rim; the middle spiral fits inside the opening; all three remain distinct. Not a GPU render.');
assert.deepEqual(sample(.55,1.2,0),sample(.55,1.2,100),'settled forms do not rotate or pulse with the idle clock');
assert(!source.includes('twistAngle'),'morphing does not rotate angular particle coordinates');
assert(!source.includes('1.0+uBurst*.10'),'no secondary-layer zoom pulse');

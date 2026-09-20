const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync('js/halo/surface-motion.js', 'utf8'), context);
const motion = context.SurfaceMotion;
for (let t = 0; t <= 64; t += .017) {
  const a = motion.sample(t).weights;
  const b = motion.sample(t + .017).weights;
  assert.equal(a[1],0,'removed fourth state never contributes');
  assert(a.every(v => Number.isFinite(v) && v >= 0 && v <= 1));
  assert(Math.abs(a.reduce((sum,v) => sum+v,0)-1) < 1e-10);
  assert(Math.max(...a.map((v,i) => Math.abs(v-b[i]))) < .011, 'no jumps across holds, morphs or cycle seams');
}
for (let i=0;i<3;i++) {
  const start=i*8;
  assert.equal(motion.sample(start+1).stage,'fast');
  assert.equal(motion.sample(start+3).stage,'slow');
  assert.equal(motion.sample(start+6).stage,'pause');
  assert.equal(motion.sample(start+6).weights[[0,2,3][(i+1)%3]],1);
  assert.equal(motion.sample(start+5).time,motion.sample(start+7.9).time,'all procedural surface motion holds');
  const early=motion.sample(start+.5).time-motion.sample(start).time;
  const late=motion.sample(start+4.5).time-motion.sample(start+4).time;
  assert(early>late*10,'fast travel decelerates into the hold');
}
console.log('PASS: fast → slow → pause timing, normalized morphs, frozen procedural clock and continuous loop seams.');

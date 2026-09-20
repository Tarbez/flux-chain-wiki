const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync('js/halo/proximity.js', 'utf8'), context);
const geometry = context.ProximityGeometry.create();
assert.equal(geometry.segments, 9216);
for (let i = 0; i < 24000; i++) {
  const p = geometry.sample((i + .5) / 24000);
  assert(p.every(Number.isFinite));
  assert(Math.hypot(...p) < 1.25, 'Geometry must stay inside the persistent canvas');
}
for (let band = 0; band < 3; band++) for (let strand = 0; strand < 24; strand++) {
  const a = context.ProximityGeometry.point(0, band, strand);
  const b = context.ProximityGeometry.point(Math.PI * 2, band, strand);
  assert(Math.hypot(...a.map((value, axis) => value - b[axis])) < 1e-10, 'Filaments must close without seams');
}
console.log('PASS: continuous filament loops, finite arc-length samples, canvas bounds.');

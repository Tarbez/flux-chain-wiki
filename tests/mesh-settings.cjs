const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const context = vm.createContext({});
vm.runInContext(fs.readFileSync('js/content/mesh-settings.js', 'utf8'), context);
const { ArkMeshSettings } = vm.runInContext('({ ArkMeshSettings })', context);

assert.equal(ArkMeshSettings.shapeVisible('zero'), true, 'default home shape is visible');
assert.equal(ArkMeshSettings.shapeVisible('zero', { pages: { zero: { hidden: true } } }), false, 'hidden=true suppresses a page shape');
assert.equal(ArkMeshSettings.shapeVisible('about', { pages: { about: { primaryMode: 'none', surfaceMode: 'none' } } }), false, 'both shape slots set to none suppress the page shape');
assert.equal(ArkMeshSettings.shapeVisible('about', { pages: { about: { primaryMode: 'none', surfaceMode: 'built-in' } } }), true, 'one visible slot keeps the page shape visible');

[
  ['js/pages/home.js', "shapeVisible('zero')"],
  ['js/pages/about.js', "shapeVisible('about')"],
  ['js/pages/experiments.js', "shapeVisible('proximity')"],
  ['js/pages/lab.js', "shapeVisible('lab')"],
  ['js/pages/concept.js', "shapeVisible('concept')"]
].forEach(([file, guard]) => {
  const source = fs.readFileSync(file, 'utf8');
  assert(source.includes(guard), file + ' must guard its shape anchor with ArkMeshSettings.shapeVisible');
});

console.log('PASS: hidden page shapes are conditional in mesh settings and every page renderer.');

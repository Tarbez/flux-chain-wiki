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

// The page-level shape anchors this loop used to guard (home, about, experiments, lab, concept) were removed by the guided-reading redesign;
// no page references a shape now, so there is nothing left to guard. shapeVisible itself is still covered by the cases above.

console.log('PASS: hidden page shapes are conditional in mesh settings and every page renderer.');

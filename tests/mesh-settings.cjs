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

// Regression: sanitizePages kept only the keys in PAGES, so a page that left PAGES (the retired 'proximity' and 'lab', which stay in
// js/content/mesh-settings-data.js because saved CMS data is never rewritten) was dropped when the site was written back, and
// tests/site-bundle.test.mjs ("writing the site back to the project changes nothing") failed. Every saved entry survives, decided by the data's keys.
{
  const saved = { zero: { primary: 'a', surface: 'b' }, proximity: { primary: 'p', surface: null, size: 2 }, lab: { hidden: true }, about: {} };
  const kept = ArkMeshSettings.sanitize({ tuning: {}, pages: saved }).pages;
  assert.deepEqual(Object.keys(kept).slice(0, 4), ['zero', 'proximity', 'lab', 'about'], 'saved entries keep their order and none is dropped');
  assert.equal(kept.proximity.primary, 'p'); assert.equal(kept.proximity.size, 2, 'a kept entry keeps its saved values');
  assert.equal(kept.lab.hidden, true); assert.equal(kept.lab.primaryMode, 'none', 'a kept entry is still checked by sanitizePageEntry');
  const again = ArkMeshSettings.sanitize({ tuning: {}, pages: kept }).pages;
  assert.deepEqual(JSON.parse(JSON.stringify(again)), JSON.parse(JSON.stringify(kept)), 'sanitizing twice changes nothing: the round trip is exact');
  assert.equal(ArkMeshSettings.sanitize({ pages: { junk: 'x', zero: null } }).pages.junk, undefined, 'a saved entry that is not an object is not an entry');
}

console.log('PASS: hidden page shapes are conditional in mesh settings and every page renderer.');

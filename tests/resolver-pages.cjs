const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = vm.createContext({ document: { write() {} } });
vm.runInContext(fs.readFileSync('js/content/manifest.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/content/manifests/index.js', 'utf8'), context);
const ids = vm.runInContext('ArkManifestIds', context);
ids.forEach((id) => vm.runInContext(fs.readFileSync('js/content/manifests/' + id + '.js', 'utf8'), context));

const manifests = vm.runInContext("['resolver','references'].map(id => ArkManifest.get(id))", context);
assert.deepEqual(Array.from(manifests, (manifest) => manifest.route), [
  '/what-is-a-resolver',
  '/start-from-something-real'
]);
assert.equal(manifests[0].meta.next, 'resolutions', 'the primary journey does not force an unverified-reference detour');
assert.equal(manifests[1].meta.next, 'resolutions');

/* Home stands on the 3D world since 2026-10-24 (js/pages/home.js, tests/world-pages.cjs): its hero action is "Explore a record" (HOME.WORLD.CTA)
   and its "Understand" action reaches the overview. The old Learn CTA is gone with the block hero; its manifest field stays, as the overview's address. */
assert.equal(vm.runInContext("ArkManifest.get('home').fields['LEARN.HREF'].value", context), 'route:about', 'the Learn CTA opens the overview');
// The pressure-test link's destination is now a manifest field of kind 'link' (js/content/manifest.js),
// resolved through js/ark/dash-kit.js's linkEl rather than a hardcoded literal/explicit dataset assignment.
assert.equal(vm.runInContext("ArkManifest.get('home').fields['PRESSURETEST.HREF'].value", context), 'route:resolver');
assert(fs.readFileSync('js/resolvers/header.js', 'utf8').includes("['NAV.OVERVIEW', 'about']"), 'overview remains reachable in shared navigation');

const catalogSource = fs.readFileSync('js/pages/catalog.js', 'utf8');
for (const id of ['resolver', 'references']) {
  assert(catalogSource.includes(id + ': {'), id + ' is a first-class page route');
}

const scene = fs.readFileSync('js/scene.flux.js', 'utf8');
for (const key of ['NAV.RESOLVER', 'NAV.REFERENCES']) {
  assert(scene.includes('-L-' + key), key + ' is in primary navigation');
}
console.log('PASS: resolver pages, sequence, home actions, catalog routes, and primary navigation.');

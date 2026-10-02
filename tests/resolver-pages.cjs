const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = vm.createContext({ document: { write() {} } });
vm.runInContext(fs.readFileSync('js/content/manifest.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/content/manifests/index.js', 'utf8'), context);
const ids = vm.runInContext('ArkManifestIds', context);
ids.forEach((id) => vm.runInContext(fs.readFileSync('js/content/manifests/' + id + '.js', 'utf8'), context));

const manifests = vm.runInContext("['resolver','references','deployment'].map(id => ArkManifest.get(id))", context);
assert.deepEqual(Array.from(manifests, (manifest) => manifest.route), [
  '/what-is-a-resolver',
  '/start-from-something-real',
  '/how-deployment-works'
]);
assert.equal(manifests[0].meta.next, 'references');
assert.equal(manifests[1].meta.next, 'deployment');
assert.equal(manifests[2].meta.next, 'download');

const home = fs.readFileSync('js/pages/home.js', 'utf8');
assert(home.includes("primary.dataset.sceneLink = 'deployment'"));
assert(home.includes("secondary.dataset.sceneLink = 'download'"));
assert(home.includes("['HOME.QUESTION.RESOLVER', 'resolver']"));
assert(home.includes("['HOME.QUESTION.FLUX', 'about']"));
assert(home.includes("lifecycle.className = 'home-lifecycle'"), 'the right-side agreement lifecycle remains on the home page');
assert(!home.includes("signal.className = 'home-signal-map'"), 'the decorative signal diagram no longer competes with the decision path');

const catalogSource = fs.readFileSync('js/pages/catalog.js', 'utf8');
for (const id of ['resolver', 'references', 'deployment']) {
  assert(catalogSource.includes(id + ': {'), id + ' is a first-class page route');
}

const scene = fs.readFileSync('js/scene.flux.js', 'utf8');
for (const key of ['NAV.RESOLVER', 'NAV.REFERENCES', 'NAV.DEPLOYMENT']) {
  assert(scene.includes('-L-' + key), key + ' is in primary navigation');
}
console.log('PASS: resolver pages, sequence, home actions, catalog routes, and primary navigation.');

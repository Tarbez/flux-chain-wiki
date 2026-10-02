const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = vm.createContext({ document: { write() {} } });
vm.runInContext(fs.readFileSync('js/content/manifest.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/content/manifests/index.js', 'utf8'), context);
const ids = vm.runInContext('ArkManifestIds', context);
ids.forEach((id) => vm.runInContext(fs.readFileSync('js/content/manifests/' + id + '.js', 'utf8'), context));
const manifest = (id) => JSON.parse(JSON.stringify(vm.runInContext(`ArkManifest.get(${JSON.stringify(id)})`, context)));

const mechanisms = ['purpose', 'depth', 'practice', 'dao', 'notes', 'studio', 'spec'];
mechanisms.forEach((id) => {
  const page = manifest(id);
  assert(page.meta.docs, id + ' links to canonical documentation');
  for (const field of ['STATUS.TITLE', 'STATUS.TEXT', 'LIMIT.TITLE', 'LIMIT.TEXT', 'EVIDENCE']) {
    assert(page.fields[field] && page.fields[field].value.trim(), id + ' includes ' + field);
  }
});

const questions = mechanisms.map((id) => manifest(id).fields.TITLE.value);
assert.equal(new Set(questions).size, questions.length, 'each mechanism page owns one distinct question');

const benchmarks = fs.readFileSync('js/content/manifests/spec.js', 'utf8');
for (const unsupported of ['65.2', '0.134', '5.85', 'Solana']) {
  assert(!benchmarks.includes(unsupported), 'benchmark page does not publish unsupported value ' + unsupported);
}
assert(benchmarks.includes('BENCH-001'));
assert(benchmarks.includes('Unverified'));

const governance = fs.readFileSync('js/content/manifests/dao.js', 'utf8');
assert(governance.includes('Mesh operations / scope'));
assert(governance.includes('Network DAO / scope'));
assert(!/registered today|live today/i.test(governance), 'governance does not imply an evidenced live deployment');

const networks = fs.readFileSync('js/content/manifests/purpose.js', 'utf8');
assert(networks.includes('miner-presence discovery'));
assert(networks.includes('not an authoritative membership list or security boundary'));

const lifecycle = fs.readFileSync('js/pages/lifecycle.js', 'utf8');
for (const phrase of ['one named dataset snapshot', 'Who writes it', 'References', 'Becomes true', 'What is still not true']) {
  assert(lifecycle.includes(phrase), 'lifecycle preserves the continuous scenario and evidence anatomy: ' + phrase);
}

const sheet = fs.readFileSync('js/pages/sheet.js', 'utf8');
assert(sheet.includes('mechanism-status-summary'), 'shared sheet keeps the current status visible');
assert(sheet.includes('content-layer-reference'), 'shared sheet places limitations and evidence in the reference layer');
assert(sheet.includes('manifest.meta.docs'), 'shared sheet renders canonical documentation links');

const lab = fs.readFileSync('js/pages/lab.js', 'utf8');
assert(lab.includes('Illustrative, not live network data.'), 'model boundary is beside the title');
assert(!lab.includes('Nothing simulated but the pace'));
assert(!lab.includes('mechanics are real and sourced'));
const modelIntro = fs.readFileSync('js/resolvers/experiment.js', 'utf8');
assert(modelIntro.includes('They do not represent real nodes, votes, or a ledger.'));

console.log('PASS: Batch 3 mechanism questions, status boundaries, evidence links, benchmark restraint, and illustrative-model labels.');

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = vm.createContext({ document: { write() {} } });
vm.runInContext(fs.readFileSync('js/content/manifest.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/content/manifests/index.js', 'utf8'), context);
const ids = vm.runInContext('ArkManifestIds', context);
ids.forEach((id) => vm.runInContext(fs.readFileSync('js/content/manifests/' + id + '.js', 'utf8'), context));
const manifest = (id) => JSON.parse(JSON.stringify(vm.runInContext(`ArkManifest.get(${JSON.stringify(id)})`, context)));
const value = (id, field) => manifest(id).fields[field].value;

assert.equal(value('home', 'EYEBROW'), 'Protocol infrastructure for independent networks');
assert.equal(value('home', 'CTA'), 'See how DEFXN works');
assert.equal(value('home', 'SECONDARY'), 'Run DEFXN from source');
assert.equal(value('home', 'STATUS1.VALUE'), 'PARTIAL');
assert.equal(value('home', 'STATUS3.VALUE'), 'UNVERIFIED');
assert(!value('home', 'TITLE').includes('Deploy parse resolve'));
const benchmarkNote = fs.readFileSync('js/content/articles/why-the-chain-was-retired.js','utf8');
assert(!/65\.2\/s|5\.85x|3,900–4,100/.test(benchmarkNote), 'unregistered benchmark numbers do not return to the public note');

assert.match(value('resolver', 'BODY1'), /^A resolver is addressed, deterministic logic/);
assert(value('resolver', 'BODY3').includes('Publishing makes a resolver addressable'));
assert(value('resolver', 'BODY3').includes('does not make the claim true'));

assert.equal(manifest('references').title, 'Reference resolvers');
assert(value('references', 'BODY2').includes('Reference evidence pending'));
assert(!Object.values(manifest('references').fields).some((field) => /running on the fabric today/i.test(field.value)));

const how = manifest('deployment');
assert.equal(how.title, 'How DEFXN works');
assert.equal(how.meta.next, 'download');
for (let i = 1; i <= 5; i++) assert(how.fields['BODY' + i], 'How DEFXN works includes movement ' + i);

assert.equal(manifest('download').title, 'Run Flux from source');
assert(value('download', 'DECK').includes('Public repository URLs and packaged downloads are not yet verified'));
assert.equal(manifest('deploy').title, 'Create or join a network');
assert(value('deploy', 'DECK').includes('miner presence only'));

const deploySource = fs.readFileSync('js/pages/deploy.js', 'utf8');
assert(deploySource.includes('flux-network network create "my-network"'), 'network name is the supported positional argument');
assert(deploySource.includes('flux-network health --miner http://127.0.0.1:8766'));
assert(deploySource.includes('flux-network topology --miner http://127.0.0.1:8766 --network-id <network-id>'));
assert(!deploySource.includes('network create --name'), 'unsupported --name syntax is absent');
assert(!deploySource.includes('network inspect'), 'unsupported network inspect command is absent');
assert(deploySource.includes("copy.setAttribute('aria-label'"), 'every rendered command receives a copy control');
assert(deploySource.includes('step.expected'), 'every rendered command includes expected output');

const header = fs.readFileSync('js/resolvers/header.js', 'utf8');
assert(header.includes("['NAV.OVERVIEW', 'about']"));
assert(header.includes("['NAV.HOW', 'deployment']"));
assert(header.includes("['NAV.RUN', 'download']"));
for (const group of ['Understand', 'Evaluate', 'Run', 'Read']) assert(header.includes("['" + group + "'"), group + ' intent group exists');

console.log('PASS: Batch 2 conversion copy, status boundaries, journey CTAs, supported network commands, and intent navigation.');

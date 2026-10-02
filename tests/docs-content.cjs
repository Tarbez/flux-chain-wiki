const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const required = [
  'docs/index.md',
  'docs/overview.md',
  'docs/quickstart.md',
  'docs/operators/prerequisites.md',
  'docs/operators/run-from-source.md',
  'docs/operators/networks.md',
  'docs/operators/verification.md',
  'docs/operators/troubleshooting.md',
  'docs/protocol/resolvers.md',
  'docs/protocol/agreements.md',
  'docs/protocol/authority.md',
  'docs/protocol/governance.md',
  'docs/protocol/benchmarks.md',
  'docs/status.md',
  'docs/glossary.md',
  'docs/content-sources.md',
  'docs/evidence/registry.md',
  'docs/evidence/public-claim-inventory.md',
  'docs/ui-state-system.md'
];

required.forEach((file) => {
  assert(fs.existsSync(file), file + ' exists');
  assert(fs.readFileSync(file, 'utf8').trim().length > 80, file + ' is not an empty skeleton');
});

required.concat(['README.md']).forEach((file) => {
  const markdown = fs.readFileSync(file, 'utf8');
  for (const match of markdown.matchAll(/\[[^\]]*\]\(([^)#]+)(?:#[^)]+)?\)/g)) {
    const target = match[1];
    if (/^(?:https?:|\/)/.test(target)) continue;
    assert(fs.existsSync(path.resolve(path.dirname(file), target)), file + ' links to existing ' + target);
  }
});

const status = fs.readFileSync('docs/status.md', 'utf8');
['Live', 'Partial', 'Not built', 'Unverified'].forEach((label) => {
  assert(status.includes('`' + label + '`'), 'status vocabulary includes ' + label);
});

const glossary = fs.readFileSync('docs/glossary.md', 'utf8');
assert(glossary.includes('**Flux Protocol**'), 'current product name is defined');
assert(glossary.includes('**Flux Chain**'), 'legacy-name boundary is documented');
assert(glossary.includes('Do not use `published` to mean `deployed`'), 'critical resolver distinction is enforced');

const registry = fs.readFileSync('docs/evidence/registry.md', 'utf8');
['CAP-001', 'REF-001', 'BENCH-001'].forEach((id) => assert(registry.includes(id), id + ' evidence type is represented'));
for (const revision of ['ef685fbe5f83','54f9a4f657a9','8f59718a953d','5bcd1c05424b']) assert(registry.includes(revision), 'source snapshot records revision ' + revision);
assert(fs.readFileSync('docs/evidence/cap-004-verification.md','utf8').includes('9 tests passed'), 'CAP-004 names its repeatable verification result');
const claims = fs.readFileSync('docs/evidence/public-claim-inventory.md', 'utf8');
for (const surface of ['Home and protocol overview', 'Networks pages', 'Agreement lifecycle pages', 'Authority pages', 'Governance pages', 'Benchmark page', 'Interactive model']) {
  assert(claims.includes(surface), surface + ' is assigned to canonical evidence');
}

const seo = fs.readFileSync('js/content/seo-data.js', 'utf8');
assert(seo.includes('"name": "DEFXN"'), 'SEO data uses the canonical product name');

assert(/<title>[^<]*\bDEFXN\b[^<]*<\/title>/.test(fs.readFileSync('index.html', 'utf8')), 'public title uses the canonical product name');
assert(fs.readFileSync('admin.html', 'utf8').includes('<title>Flux Protocol admin</title>'), 'admin title uses the canonical product name');
assert(fs.readFileSync('admin-app.html', 'utf8').includes('<title>Flux Protocol content</title>'), 'content editor title uses the canonical product name');
assert(fs.readFileSync('js/content/manifests/nav.js', 'utf8').includes('"value": "Run DEFXN"'), 'navigation uses the canonical product name');

console.log('PASS: Batch 1 documentation topology, status vocabulary, evidence records, and product naming.');

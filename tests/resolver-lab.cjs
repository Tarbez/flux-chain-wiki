/* /what-is-a-resolver: the illustration runs once and stops, its claim id is a
   real function of address + input + result, the steps live in the address,
   and every law and status shown traces to the docs it cites. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const css = fs.readFileSync('css/resolver-lab.css', 'utf8');
assert(!/infinite/.test(css), 'no resolver animation loops forever');
const js = fs.readFileSync('js/pages/resolver-lab.js', 'utf8');
assert(!/setInterval/.test(js), 'the run is a finite sequence of timeouts, not an interval');
assert(js.includes("['ask', 'resolve', 'check', 'laws']") && js.includes("'step=' + state.step + '&input=' + state.input"), 'each step and input is an addressable state');
assert(js.includes('event.stopPropagation(); go(STEPS[i + 1], true)'), 'stepping forward cannot be hijacked into leaving the page');

// The claim id is deterministic: same address + input + result, same id; different input, different id.
const ctx = vm.createContext({ ArkUI: {}, matchMedia: () => ({ matches: true }) });
vm.runInContext(js.replace("ArkUI.buildResolverLab = function", "ArkUI.claimId = claimId; ArkUI.evaluate = evaluate; ArkUI.INPUTS = INPUTS; ArkUI.buildResolverLab = function"), ctx);
const { claimId, evaluate, INPUTS } = ctx.ArkUI;
const [report, video, logo] = INPUTS;
assert.equal(claimId(report, evaluate(report)), claimId(report, evaluate(report)), 'same input, same claim id');
assert.notEqual(claimId(report, true), claimId(logo, true), 'different input, different claim id');
assert.equal(evaluate(report), true); assert.equal(evaluate(video), false); assert.equal(evaluate(logo), true);

// Laws: wording traces to the resolver spec; statuses match docs/status.md.
const spec = fs.readFileSync('docs/protocol/resolvers.md', 'utf8');
const status = fs.readFileSync('docs/status.md', 'utf8');
const manifest = fs.readFileSync('js/content/manifests/resolver.js', 'utf8');
for (const phrase of ['addressed, deterministic logic', 'exact logic under evaluation', 'admitted active provider reports fresh capacity', 'identifies the signer', 'checker, authority cell, agreement']) {
  assert(spec.includes(phrase), `spec states "${phrase}"`);
}
for (const phrase of ['deterministic logic', 'exact logic under evaluation', 'admitted active provider reports fresh capacity', 'identifies the signer', 'checker, authority cell, agreement']) {
  assert(manifest.includes(phrase), `the page's laws carry "${phrase}"`);
}
const row = name => (status.split('\n').find(l => l.includes(name)) || '').split('|').map(c => c.trim());
assert.equal(row('Resolver definition')[2], 'Live'); assert.equal(row('Resolver publication')[2], 'Partial'); assert.equal(row('Resolver deployment')[2], 'Partial');
assert(js.includes("[['Live', 'CAP-004'], ['Partial', 'CAP-004'], ['Partial', 'CAP-005'], ['Spec', 'spec']]"), 'law badges match the status rows');
assert(!/how it reached the result|claim with a trail/.test(manifest), 'copy no longer overclaims what a resolver output shows');

console.log('PASS: resolver lab runs once, deterministic claim ids, addressable steps, laws and statuses traced to the docs.');

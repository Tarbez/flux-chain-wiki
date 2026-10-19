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
// Since 2026-10-19 the laws are the current resolver model (docs/protocol/resolvers.md §2-§6).
// Each phrase is stated by the spec and carried by the page, so neither can drift alone.
for (const phrase of ['own chain', 'immutable by default', 'before the record goes to peers', 'Launched is not served', 'not launched, or is pinned to a stale manifest']) {
  assert(spec.includes(phrase), `spec states "${phrase}"`);
}
for (const phrase of ['One launch, one chain.', 'Built from checked parts.', 'Its grammar is the gate.', 'Fixed unless you said otherwise.', 'immutable by default', 'Launched is not served.']) {
  assert(manifest.includes(phrase), `the page carries "${phrase}"`);
}
const row = name => (status.split('\n').find(l => l.includes(name)) || '').split('|').map(c => c.trim());
assert.equal(row('Resolver launch and upgrade')[2], 'Partial'); assert.equal(row('Resolver launch and upgrade')[4], 'CAP-010');
assert.equal(row('Capability registry and composition check')[2], 'Partial'); assert.equal(row('Capability registry and composition check')[4], 'CAP-011');
assert.equal(row('Resolver grammar enforcement')[2], 'Partial'); assert.equal(row('Resolver grammar enforcement')[4], 'CAP-012');
assert(js.includes("[['Partial', 'CAP-010'], ['Partial', 'CAP-011'], ['Partial', 'CAP-012'], ['Partial', 'CAP-010']]"), 'law badges match the status rows');
// The hub hands off: the registry page, the walkthrough, and the Explore and Deploy products.
for (const key of ['REGISTRY.HREF', 'DEPLOY.HREF', 'EXPLORE.HREF', 'DEPLOYER.HREF', 'MATH.HREF']) assert(manifest.includes(`"${key}"`), `the hub links ${key}`);
assert(manifest.includes('"route:resolvers"') && manifest.includes('"url:https://explore.defxn.com"') && manifest.includes('"url:https://deploy.defxn.com"'), 'hub link targets are the registry page and the product subdomains');
assert(!/how it reached the result|claim with a trail/.test(manifest), 'copy no longer overclaims what a resolver output shows');

console.log('PASS: resolver lab runs once, deterministic claim ids, addressable steps, laws and statuses traced to the docs.');

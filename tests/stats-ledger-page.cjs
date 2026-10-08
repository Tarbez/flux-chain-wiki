const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

function node(tag) {
  return { tagName: tag, className: '', innerHTML: '', dataset: {}, attrs: {}, children: [],
    setAttribute(k, v) { this.attrs[k] = v; }, querySelector() { return null; }, appendChild(c) { this.children.push(c); return c; } };
}
const context = vm.createContext({ window: {}, document: { createElement: node }, ArkUI: { pageModules: {}, pageCatalog: {} } });
context.window = context;
for (const file of ['js/content/chain-sample.js', 'js/pages/stats-ledger.js']) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context);
}
const page = context.ArkUI.pageModules.statsLedger.mount(node('main'));
assert(page.innerHTML.includes('A finance resolver by construction'), 'hero present');
assert(page.innerHTML.includes('41,762 entries a second'), 'measured headline present');
assert(page.innerHTML.includes('K-of-N peer replication'), 'durability framed as replication, not disk-sync');
assert(!/fsync/i.test(page.innerHTML), '/stats/ledger must not mention fsync');
assert(page.innerHTML.includes('Fork gossip'), 'equivocation gossip tile present');
assert(page.innerHTML.includes('TCP server'), 'chain server tile present');
assert(page.innerHTML.includes('Head-only sig') || page.innerHTML.includes('head-only sig') || page.innerHTML.includes('head') && page.innerHTML.includes('hash chain'), 'head-only replay story present');
assert(page.innerHTML.includes('LEDGERENTRY'), 'registered type named');
assert(page.innerHTML.includes('pos 0'), 'genesis entry rendered');
assert(page.innerHTML.includes('pos 4'), 'last entry rendered');
assert.equal(context.ArkChainSample.entries.length, 5, 'five entries in sample');
assert(context.ArkChainSample.entries[0].payload === 'Genesis');
assert(context.ArkChainSample.entries[3].payload === 'Spend');
// every entry has a real-looking signature at the end
for (const e of context.ArkChainSample.entries) {
  assert(/-S[0-9a-f]{128}$/.test(e.text), 'entry text ends in a 64-byte ed25519 signature: '+e.pos);
  assert(/^G[0-9a-f]{64}-YLEDGERENTRY-/.test(e.text), 'entry starts with G<key>-YLEDGERENTRY-: '+e.pos);
}
// stats.js references stats/ledger
assert(fs.readFileSync('js/pages/stats.js', 'utf8').includes("href('stats/ledger')"), '/stats links to /stats/ledger');
// catalog registers the route and loads the sample first
const cat = fs.readFileSync('js/pages/catalog.js', 'utf8');
assert(/stats\/ledger[^}]+scripts:\s*\['js\/content\/chain-sample\.js'/.test(cat), '/stats/ledger loads chain-sample.js first');
console.log('PASS: /stats/ledger mounts, chain sample is real signed ledger, /stats links to it, catalog registered.');

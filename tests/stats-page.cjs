/* Named regressions: the /stats module appended its page but returned nothing,
   so the router threw on `el.dataset` and the page stayed stranded below home;
   and the home page's headline figures must never drift from the measured
   tables they summarize. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function node(tag) {
  return { tagName: tag, className: '', innerHTML: '', dataset: {}, attrs: {}, children: [],
    setAttribute(k, v) { this.attrs[k] = v; }, appendChild(c) { this.children.push(c); return c; } };
}
const context = vm.createContext({ window: {}, document: { createElement: node }, ArkUI: { pageModules: {} } });
context.window = context;
vm.runInContext(fs.readFileSync('js/content/stats-highlights.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/pages/stats.js', 'utf8'), context);

const host = node('main');
const page = context.ArkUI.pageModules.stats.mount(host);
assert(page && page.dataset, 'stats mount() returns its page element for the router');
assert.equal(host.children[0], page, 'the returned element is the one mounted');
assert(page.innerHTML.includes('class="stats-highlights"'), '/stats shows the shared headline figures');

// Each highlight must match a real row of the fleet quorum table.
const source = fs.readFileSync('js/pages/stats.js', 'utf8');
const rows = [...source.matchAll(/row\(\[([^\]]+)\]\)/g)].map(m => [...m[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(c => c[1]));
const fleet = rows.filter(r => ['Durable', 'Accepted'].includes(r[0]) && r[1] === '4,000');
const accepted = fleet.find(r => r[0] === 'Accepted'), durable = fleet.find(r => r[0] === 'Durable');
const items = context.ArkStatsHighlights.items;
assert.equal(Math.floor(parseFloat(accepted[3])), Number(items[0].value), 'accepted throughput matches the 4,000-transfer fleet row');
assert.equal(Math.floor(parseFloat(durable[3])), Number(items[1].value), 'durable throughput matches the 4,000-transfer fleet row');
assert.equal(accepted[4], items[2].value + ' ms', 'median finality matches the accepted p50');
const quorum = rows.filter(r => ['Durable', 'Accepted'].includes(r[0]));
assert(quorum.every(r => r[r.length - 1] === '0'), 'zero failures holds for every quorum row');

const home = fs.readFileSync('js/pages/home.js', 'utf8');
assert(home.includes('window.ArkStatsHighlights') && !home.includes("ArkCopy.text('HOME.STATUS'"), 'home reads the shared measurements, not separate copy');

console.log('PASS: /stats mounts for the router; home and /stats share headline figures that match the measured fleet table.');

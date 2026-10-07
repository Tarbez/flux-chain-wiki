/* Named regressions, kept from the first /stats:
   - the module appended its page but returned nothing, so the router threw on `el.dataset`
     and the page stayed stranded below home;
   - a headline figure once disagreed with a stale table row, so every headline here must be
     derivable from the evidence the page draws;
   - /monitor must stay registered, read the real fleet feed rather than simulate one, and
     stop its timer when the router removes it.
   Added with the 2026-10-07 education redesign:
   - the fleet headline equals the sum of its per-server rows, before and after;
   - every CPU breakdown adds up to 100%;
   - every range on the page contains the mean shown beside it;
   - the sample transfer on /stats is REAL grammar (registered letters, the right number of
     signatures and references), and its size matches the figure quoted for it;
   - every article /stats links to exists in the article index;
   - /monitor reads the same fleet record /stats does, and never shows an audited figure as live. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function node(tag) {
  return { tagName: tag, className: '', innerHTML: '', dataset: {}, attrs: {}, children: [],
    setAttribute(k, v) { this.attrs[k] = v; }, querySelector() { return null; }, appendChild(c) { this.children.push(c); return c; } };
}
const context = vm.createContext({ window: {}, document: { createElement: node }, ArkUI: { pageModules: {} } });
context.window = context;
for (const file of ['js/content/stats-highlights.js', 'js/content/stats-sample.js', 'js/pages/stats.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), context);

const host = node('main');
const page = context.ArkUI.pageModules.stats.mount(host);
assert(page && page.dataset, 'stats mount() returns its page element for the router');
assert.equal(host.children[0], page, 'the returned element is the one mounted');
assert(page.innerHTML.includes('class="stats-bento"'), '/stats renders as a bento grid');
assert(!/border(-top|-bottom)?\s*:\s*1px/.test(fs.readFileSync('css/stats.css', 'utf8').replace(/border-bottom:1px solid hsl\(var\(--reference-400\)\)/, '')), '/stats draws no hairline borders (the one inline-link underline excepted)');

// ---- the fleet headline is derivable from its rows ---------------------------------------------
const run = context.ArkStatsHighlights.fleetRun;
const ev = context.ArkUI.statsEvidence;
assert.equal(run.perServer.reduce((t, s) => t + s.now, 0), run.total, 'per-server rates add up to the fleet total');
assert.equal(run.perServer.reduce((t, s) => t + s.before, 0), run.before, 'per-server "before" rates add up to the earlier fleet total');
assert.equal(ev.fleet.total, run.total, '/stats reads the same fleet record as the home page and /monitor');
assert(page.innerHTML.includes(run.total.toLocaleString('en-US')), 'the fleet total appears on the page');
const fleetItem = context.ArkStatsHighlights.items.find((i) => i.label.includes('Whole fleet'));
assert(fleetItem && Number(fleetItem.value.replace(/,/g, '')) === run.total, 'the home rail shows the same fleet total');
assert(/not like for like/.test(fleetItem.detail), 'the home rail never shows the prototype number without saying it is not comparable');
assert(run.perServer.every((s) => s.busy > 0 && s.busy <= 100 && s.now > s.before), 'every server is faster than before and its CPU share is a percentage');

// ---- every breakdown adds up -------------------------------------------------------------------
for (const model of [ev.cpuBefore, ev.cpuAfter]) {
  const total = model.parts.reduce((t, p) => t + p.v, 0);
  assert(Math.abs(total - 100) < 0.25, model.title + ' CPU shares add up to 100 (got ' + total.toFixed(2) + ')');
}
const inRange = (range, mean) => { const [lo, hi] = range.split('-').map((x) => Number(x.replace(/,/g, ''))); return mean >= lo && mean <= hi; };
for (const row of [...ev.ladder, ...ev.batchModes]) assert(inRange(row.range, row.value), row.label + ': the mean lies inside its own range');
assert(ev.ladder.at(-1).strong === true && ev.ladder.at(-1).value === Math.max(...ev.ladder.map((l) => l.value)), 'the ladder ends at its best configuration');

// ---- the sample transfer is real grammar -------------------------------------------------------
const REGISTERED = new Set('IBATRGYSCMVHPDQOLWUE'.split(''));
const sample = context.ArkStatsSample.records;
assert.deepEqual(Array.from(sample, (r) => r.name), ['ISSUANCE', 'INTENT', 'OFFER', 'AGREEMENT', 'VALUEOBJECT', 'FULFILLMENT']);
for (const r of sample) {
  assert(/^[A-Za-z0-9-]+$/.test(r.text), r.name + ' uses only letters, digits and the dash');
  const blocks = r.text.split('-');
  assert(blocks.every((b) => b.length > 1 && REGISTERED.has(b[0])), r.name + ': every block is a registered role letter plus a value');
  assert(!r.text.includes('--'), r.name + ' has no empty block');
}
const count = (r, letter) => r.text.split('-').filter((b) => b[0] === letter).length;
const get = (name) => sample.find((r) => r.name === name);
assert.equal(count(get('AGREEMENT'), 'S'), 2, 'an agreement carries two chained signatures');
assert.equal(count(get('AGREEMENT'), 'C'), 5, 'an agreement carries five ordered references');
assert.equal(count(get('INTENT'), 'C'), 2); assert.equal(count(get('OFFER'), 'C'), 3);
assert.equal(count(get('VALUEOBJECT'), 'C'), 4); assert.equal(count(get('FULFILLMENT'), 'C'), 3);
assert.equal(get('AGREEMENT').text.length, 674, 'the sample agreement is the 674-byte record the cost figures describe');
assert.equal(get('AGREEMENT').text.split('-').length, 11, 'and it has the 11 blocks the page says it has');
assert(page.innerHTML.includes('11 blocks'), 'the page quotes that block count');
assert.equal(sample.slice(1).reduce((t, r) => t + r.text.length, 0), 358 + 424 + 674 + 622 + 412, 'a transfer is five records of the quoted sizes');
const sigs = sample.slice(1).reduce((t, r) => t + count(r, 'S'), 0);
assert.equal(sigs, 6, 'a transfer carries six signatures, which is what the CPU breakdown says');

// ---- links resolve -----------------------------------------------------------------------------
const statsSource = fs.readFileSync('js/pages/stats.js', 'utf8');
const articleIndex = fs.readFileSync('js/content/article-index.js', 'utf8');
for (const [, slug] of statsSource.matchAll(/'article\/([a-z0-9-]+)'/g)) assert(articleIndex.includes('"slug": "' + slug + '"'), 'article ' + slug + ' exists in the index');
for (const [, doc] of statsSource.matchAll(/href="(\/docs\/[a-z0-9/_-]+\.md)"/g)) assert(fs.existsSync('.' + doc), doc + ' exists');

// ---- the home page reads the shared record -----------------------------------------------------
const home = fs.readFileSync('js/pages/home.js', 'utf8');
assert(home.includes('window.ArkStatsHighlights') && !home.includes("ArkCopy.text('HOME.STATUS'"), 'home reads the shared measurements, not separate copy');

// ---- /monitor ----------------------------------------------------------------------------------
const catalog = fs.readFileSync('js/pages/catalog.js', 'utf8');
assert(/monitor:\s*\{\s*path:\s*'\/monitor'[^}]*module:\s*'monitor'[^}]*scripts:\s*\['js\/pages\/monitor\.js'\]/.test(catalog), '/monitor is in the page catalog');
assert(/stats:\s*\{\s*path:\s*'\/stats'[^}]*scripts:\s*\['js\/content\/stats-sample\.js',\s*'js\/pages\/stats\.js'\]/.test(catalog), '/stats loads its sample data before the page');
assert(fs.readFileSync('index.html', 'utf8').includes('css/monitor.css'), 'monitor styles are linked');
const monitor = fs.readFileSync('js/pages/monitor.js', 'utf8');
assert(monitor.includes("'https://defxn.com/api/fleet-status'"), '/monitor polls the real fleet-status feed');
assert(!/Math\.random/.test(monitor), '/monitor generates no numbers of its own');
assert(/arkDispose\s*=\s*function\s*\(\)\s*\{\s*clearInterval\(pollTimer\)/.test(monitor), '/monitor stops its timer on unmount');
assert(monitor.includes('window.ArkStatsHighlights.fleetRun'), '/monitor reads the same fleet record as /stats');
assert(/not live/.test(monitor) && /Audited/.test(monitor), '/monitor labels the audited figures as not live');
for (const machine of Object.keys(context.ArkStatsHighlights.fleetRun.perServer.reduce((o, s) => (o[s.machine] = 1, o), {}))) assert(new RegExp('\\b' + machine + ':\\s*\\{\\s*cores:').test(monitor), machine + ' (an audited server) is drawn on the monitor map');

console.log('PASS: /stats mounts as a bento grid; every figure is derivable from its evidence; the sample transfer is real grammar; links resolve; /monitor is registered, reads the real feed, labels audited figures as not live, and disposes cleanly.');

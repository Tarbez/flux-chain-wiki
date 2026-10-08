/* /stats is a dashboard (2026-10-08 redesign). Named regressions:
   - the module must return the element it mounts, or the router throws on `el.dataset`;
   - live values come only from the fleet pulse; when the pulse fails the page shows no number
     in their place and says why;
   - the audited headline is the three whitepaper §5 numbers, each derivable from its node rows;
   - the page stops polling when the router removes it;
   - every evidence record, article and page it links to exists;
   - the engineering detail it used to carry lives in docs/whitepaper.md, and the sample
     transfer cited there is real grammar;
   - /monitor still reads the same feed and labels audited figures as dated. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// A small DOM: enough for the page to build itself and for the test to read it back.
class Node {
  constructor(tag) { this.tagName = tag; this.className = ''; this.children = []; this.dataset = {}; this.attrs = {}; this.listeners = {}; this.style = { setProperty() {} }; this._text = ''; this.hidden = false; }
  appendChild(c) { this.children.push(c); c.parent = this; return c; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
  set textContent(v) { this._text = v == null ? '' : String(v); this.children = []; }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(' '); }
  all() { return [this].concat(...this.children.map((c) => c.all())); }
  find(cls) { return this.all().filter((n) => n.className.split(' ').includes(cls)); }
}
let pulseResult = null;
const timers = new Set(), docListeners = {};
const document = { hidden: false, createElement: (t) => new Node(t),
  addEventListener(t, f) { docListeners[t] = f; }, removeEventListener(t) { delete docListeners[t]; } };
const context = vm.createContext({
  document, console, Date, Math, Number, String, Promise, encodeURIComponent,
  setTimeout(f) { const id = {}; timers.add(id); return id; }, clearTimeout(id) { timers.delete(id); },
  setInterval() { const id = {}; timers.add(id); return id; }, clearInterval(id) { timers.delete(id); },
  ArkUI: { pageModules: {}, pageCatalog: {}, route: { href: (p) => '#' + p } }
});
context.window = context;
context.ArkPulse = { get: () => pulseResult };
for (const file of ['js/content/stats-highlights.js', 'js/content/resolver-registry.js', 'js/pages/stats.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), context);
const S = context.ArkStatsHighlights;

(async () => {
  // ---- offline first: no live number is invented -------------------------------------------
  pulseResult = Promise.reject(new Error('HTTP 502 from /api/fleet-pulse'));
  let host = new Node('main');
  let page = context.ArkUI.pageModules.stats.mount(host);
  assert(page && page.dataset, 'stats mount() returns its page element for the router');
  assert.equal(host.children[0], page, 'the returned element is the one mounted');
  await new Promise((r) => setImmediate(r));
  const pill = page.find('dash-pill')[0];
  assert.equal(pill.dataset.state, 'down', 'an unreachable pulse shows as down');
  for (const k of page.find('dash-stat').slice(0, 4)) assert(k.textContent.includes('–'), 'live tiles show a dash, not a number, while offline');
  assert(page.find('dash-empty')[0].textContent.includes('HTTP 502'), 'the offline message names the failure');
  page.arkDispose();
  assert.equal(timers.size, 0, 'dispose clears every timer');
  assert(!docListeners.visibilitychange, 'dispose removes the visibility listener');

  // ---- live: values are the pulse's values ---------------------------------------------------
  const nodes = [{ name: 'bk2', addr: 'a:1', ok: 10, total: 10, elapsed_ms: 5, qps: 900, error: null },
                 { name: 'mk2', addr: 'b:1', ok: 0, total: 10, elapsed_ms: 5, qps: 0, error: 'timeout' }];
  pulseResult = Promise.resolve({ data: { measured_at_ms: Date.now(), aggregate_qps: 900, total_entries: 20, longest_ms: 7, errors: 1, nodes } });
  host = new Node('main');
  page = context.ArkUI.pageModules.stats.mount(host);
  await new Promise((r) => setImmediate(r));
  assert.equal(page.find('dash-pill')[0].dataset.state, 'warn', 'a down node degrades the status');
  assert(page.find('dash-stat')[0].textContent.includes('1/2'), 'nodes online counts only nodes that answered');
  assert.equal(page.find('dash-node').length, 2, 'one card per pulse node');
  assert(page.find('dash-node-error')[0].textContent.includes('timeout'), 'a failing node shows its error');
  page.arkDispose();

  // ---- the audited headline is derivable -----------------------------------------------------
  const HT = S.honestTransfers;
  const sum = (k) => HT.perNode.reduce((t, n) => t + n[k], 0);
  assert.equal(sum('finalizedTps'), HT.fleetFinalizedTps, 'finalized transfers/s is the sum of its node rows');
  assert.equal(sum('finalized'), HT.fleetFinalized, 'finalized transfers is the sum of its node rows');
  assert(Math.abs(sum('logicalOpsPerSecond') - HT.fleetLogicalOpsPerSecond) <= 2, 'logical ops/s is the sum of its node rows');
  assert(Math.abs(sum('replicaAppsPerSecond') - HT.fleetReplicaAppsPerSecond) <= 6, 'replica applications/s is the sum of its node rows');
  const text = page.textContent;
  for (const n of [HT.fleetFinalizedTps, HT.fleetLogicalOpsPerSecond, HT.fleetReplicaAppsPerSecond]) assert(text.includes(n.toLocaleString('en-US')), n + ' appears with the other two');
  const soak = S.chainFleetSoak;
  assert.equal(soak.perNode.reduce((t, n) => t + n.accepted, 0), soak.accepted, 'the soak total is derivable from its node rows');
  assert(text.includes(soak.accepted.toLocaleString('en-US')) && soak.failures === 0, 'the soak and its zero failures appear');
  const cert = S.certifiedFleet;
  assert.equal(Math.round(cert.perNode.reduce((t, n) => t + n.qps, 0)), cert.combined, 'the certified-segment total is derivable');
  assert(/local cache/.test(text), 'the page says the soak did not run with K-of-N replication');

  // ---- links resolve -------------------------------------------------------------------------
  const src = fs.readFileSync('js/pages/stats.js', 'utf8');
  const articleIndex = fs.readFileSync('js/content/article-index.js', 'utf8');
  for (const [, slug] of src.matchAll(/'article\/([a-z0-9-]+)'/g)) assert(articleIndex.includes('"slug": "' + slug + '"'), 'article ' + slug + ' exists');
  const allowed = fs.readFileSync('js/ark/reference-docs.js', 'utf8');
  for (const [, doc] of src.matchAll(/'(docs\/[a-z0-9/_-]+\.md)'/g)) {
    assert(fs.existsSync(doc), doc + ' exists');
    assert(allowed.includes('"' + doc + '"'), doc + ' is readable in the reference reader');
  }
  assert(!/Math\.random/.test(src), '/stats generates no numbers of its own');

  // ---- the detail moved to the whitepaper ---------------------------------------------------
  const paper = fs.readFileSync('docs/whitepaper.md', 'utf8');
  for (const heading of ['Appendix B', 'Appendix C', 'Appendix D', 'Appendix E', 'Appendix F']) assert(paper.includes('## ' + heading), 'whitepaper has ' + heading);
  for (const n of ['1,712,006', '5,891', '54.7%', '24,908', '113,432']) assert(paper.includes(n), 'whitepaper carries ' + n);

  // The sample transfer cited by Appendix B is real grammar.
  const sc = vm.createContext({ window: {} }); sc.window = sc;
  vm.runInContext(fs.readFileSync('js/content/stats-sample.js', 'utf8'), sc);
  const REGISTERED = new Set('IBATRGYSCMVHPDQOLWUE'.split(''));
  const sample = sc.ArkStatsSample.records;
  for (const r of sample) assert(r.text.split('-').every((b) => b.length > 1 && REGISTERED.has(b[0])), r.name + ': every block is a registered letter');
  const agreement = sample.find((r) => r.name === 'AGREEMENT');
  assert.equal(agreement.text.length, 674); assert.equal(agreement.text.split('-').length, 11);
  assert.equal(sample.slice(1).reduce((t, r) => t + r.text.length, 0), 358 + 424 + 674 + 622 + 412, 'a transfer is five records of the sizes Appendix B quotes');
  assert.equal(sample.slice(1).reduce((t, r) => t + r.text.split('-').filter((b) => b[0] === 'S').length, 0), 6, 'six signatures');

  // ---- catalog and /monitor ------------------------------------------------------------------
  const catalog = fs.readFileSync('js/pages/catalog.js', 'utf8');
  assert(/stats:\s*\{\s*path:\s*'\/stats'[^}]*scripts:\s*\[[^\]]*'js\/ark\/pulse-client\.js',\s*'js\/pages\/stats\.js'\]/.test(catalog), '/stats loads the shared pulse client before the page');
  assert(fs.readFileSync('index.html', 'utf8').includes('css/stats-dashboard.css'), 'dashboard styles are linked');
  const monitor = fs.readFileSync('js/pages/monitor.js', 'utf8');
  assert(monitor.includes('ArkPulse.get()') && !/Math\.random/.test(monitor), '/monitor reads the real feed');
  assert(/arkDispose\s*=\s*function\s*\(\)\s*\{\s*clearInterval\(pulseTimer\)/.test(monitor), '/monitor stops its timer on unmount');

  vm.runInContext(fs.readFileSync('js/pages/monitor.js', 'utf8'), context);
  pulseResult = Promise.reject(new Error('HTTP 502'));
  host = new Node('main');
  const mon = context.ArkUI.pageModules.monitor.mount(host);
  await new Promise((r) => setImmediate(r));
  assert.equal(mon.find('dash-pill')[0].dataset.state, 'down', '/monitor shows an unreachable pulse as down');
  for (const k of mon.find('dash-stat')) assert(k.textContent.includes('–'), '/monitor shows no number while offline');
  assert(!/42,637|170,553|682,213/.test(mon.textContent), '/monitor repeats no audited figure as if it were live');
  mon.arkDispose();
  assert.equal(timers.size, 0, '/monitor clears its timers on unmount');

  console.log('PASS: /stats dashboard shows only pulse values live and nothing when offline, its audited numbers are derivable, it disposes cleanly, its links resolve, and the detail lives in the whitepaper.');
})().catch((e) => { console.error(e); process.exit(1); });

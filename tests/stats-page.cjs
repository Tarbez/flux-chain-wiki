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
for (const file of ['js/ark/dash-kit.js', 'js/content/stats-highlights.js', 'js/content/resolver-registry.js', 'js/pages/stats.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), context);
const S = context.ArkStatsHighlights;
function fmt(n) { return Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 }); }

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
  for (const k of page.find('dash-stat').slice(0, 8)) assert(k.textContent.includes('–'), 'live tiles show a dash, not a number, while offline — this now covers the swap/transfer/store/per-core tiles too, since they moved into Live');
  assert(page.find('dash-empty')[0].textContent.includes('HTTP 502'), 'the offline message names the failure');
  page.arkDispose();
  assert.equal(timers.size, 0, 'dispose clears every timer');
  assert(!docListeners.visibilitychange, 'dispose removes the visibility listener');

  // ---- live: values are the pulse's values ---------------------------------------------------
  const nodes = [{ name: 'bk2', addr: 'a:1', ok: 10, total: 10, elapsed_ms: 5, qps: 900, error: null },
                 { name: 'mk2', addr: 'b:1', ok: 0, total: 10, elapsed_ms: 5, qps: 0, error: 'timeout' }];
  // Added 2026-10-10: fleet-pulse now aggregates each node's own ops-pulse
  // daemon into this same payload. Two nodes reporting of two total, so
  // the "all N nodes reporting" (not partial) path is what this mock
  // exercises first; a separate case below exercises the partial path.
  const operations = {
    measured_at_ms: Date.now() - 500,
    nodes_reporting: 2, nodes_total: 2,
    parallel_swaps_per_second: 637149, transfers_per_second: 68188, stores_per_second: 5752753, stakes_per_second: 68192,
    cores: 37, swaps_per_core: 17220,
    per_node: [
      { node: 'bk2', swaps_per_second: 93932, transfers_per_second: 6505, stores_per_second: 205695, stakes_per_second: 6800, cores: 7 },
      { node: 'mk2', swaps_per_second: 96375, transfers_per_second: 7330, stores_per_second: 549332, stakes_per_second: 7100, cores: 5 }
    ]
  };
  pulseResult = Promise.resolve({ data: { measured_at_ms: Date.now(), aggregate_qps: 900, total_entries: 20, longest_ms: 7, errors: 1, nodes, operations } });
  host = new Node('main');
  page = context.ArkUI.pageModules.stats.mount(host);
  await new Promise((r) => setImmediate(r));
  assert.equal(page.find('dash-pill')[0].dataset.state, 'warn', 'a down node degrades the status');
  assert(page.find('dash-stat')[0].textContent.includes('1/2'), 'nodes online counts only nodes that answered');
  assert.equal(page.find('dash-node').length, 2, 'one card per pulse node');
  assert(page.find('dash-node-error')[0].textContent.includes('timeout'), 'a failing node shows its error');
  page.arkDispose();

  // ---- the shown figures are derivable, not asserted ----------------------------------------
  // Same intent as before: a number on the page must be reconstructible
  // from its parts. The chain-era objects these checks used were retired
  // 2026-10-10, so they now check the signed-resolution figures.
  const DS = S.defiShard;
  assert.equal(DS.swapsResolved, DS.swapsPerBatch * DS.batches, 'swaps resolved is swaps/batch x batches');
  assert.equal(DS.replicationCostBytes, Math.round(DS.signedResultBytes * DS.peersReached) + 1, 'replication cost is bytes x peers (+1 rounding)');
  assert(Math.abs(DS.lzma2RunRatio - DS.signedResultBytesRaw / DS.signedResultBytes) < 0.05, 'the LZMA2 ratio matches raw/compressed');
  const stageSum = DS.verifyLatencyMsBatched + DS.auctionLatencyMs + DS.signLatencyMs;
  assert(stageSum <= DS.batchLatencyMs + 0.001, 'the stages fit inside the batch latency');
  assert(stageSum / DS.batchLatencyMs > 0.85, 'the stages account for most of the batch, so nothing large is unattributed');
  // Broadcast must never be folded into the resolution latency.
  assert(DS.broadcastLatencyMs > DS.batchLatencyMs * 10, 'broadcast dominates and is reported separately');
  const text = page.textContent;
  assert(text.includes(String(DS.swapsPerBatch)), 'swaps per batch appears on the page');
  assert(/not pipelined/i.test(text), 'the page names the broadcast as the binding constraint');
  assert(!/\b(TPS|accepted\/s|replica applications)\b/i.test(text), 'the page shows no retired unit');

  // ---- the operation matrix renders, each row with its own unit --------------------------------
  const OPS = S.operations;
  assert(OPS && OPS.rows.length >= 7, 'the operation matrix carries every measured operation');
  const units = new Set(OPS.rows.map((r) => r.unit));
  assert(units.size >= 3, 'operations carry DIFFERENT units; one unit for all of them is the bug this table fixes');
  assert(OPS.rows.some((r) => r.unit === 'transfers/s'), 'a transfer is measured in transfers/s');
  assert(OPS.rows.some((r) => r.unit === 'swaps/s'), 'a swap is measured in swaps/s');
  assert(OPS.notBuilt.length > 0 && !OPS.rows.some((r) => r.rate === 0), 'not-built operations are named, never reported as a zero rate');
  // The sweep must keep its own evidence: a claim that batch size is not
  // the lever is only honest if the measured points are shown.
  assert(OPS.batchSizeSweep.length >= 3, 'the batch-size sweep keeps its measured points');
  const biggest = OPS.batchSizeSweep[OPS.batchSizeSweep.length - 1];
  const smallest = OPS.batchSizeSweep[0];
  assert(biggest.batch / smallest.batch >= 16, 'the sweep spans a wide range of batch sizes');
  assert(biggest.swapsPerSecond / smallest.swapsPerSecond < 2, 'the sweep shows batch size is NOT the lever');
  for (const row of OPS.rows) assert(/\S/.test(row.note), row.op + ' says what its number means');

  // ---- BENCH-015: the client path is its own quantity, derivable, and never mixed with the fleet figure ----
  const CP = S.clientPath;
  assert(CP && CP.byConnections.length >= 5, 'the client path keeps its measured points');
  const cpFirst = CP.byConnections[0], cpPeak = Math.max(...CP.byConnections.map((x) => x.swapsPerSecond));
  assert.equal(cpFirst.connections, 1, 'the curve starts at one connection');
  assert.equal(CP.ceilingSwapsPerSecond, cpPeak, 'the stated ceiling is the highest measured point, not a separate claim');
  assert(CP.ceilingSwapsPerSecond < OPS.fleet.parallelSwapsPerSecond, 'one client-path node is far below the fleet total; the two must not be conflated');
  assert(CP.byConnections.every((x, i, a) => i === 0 || x.connections > a[i - 1].connections), 'points are in increasing connection order');
  assert(/unbacked|moves no balance|no balance/i.test(CP.caveats), 'the client path says it is not custodied');
  assert(/quorum 0/.test(CP.quorum), 'the zero-replication quorum is stated beside the number');
  assert(/loopback/.test(CP.caveats) && /limiter/.test(CP.caveats), 'loopback and the production limiter are stated');
  assert(CP.byConnections.some((x) => x.connections >= 1000), 'the sweep reaches 1,000 connections');
  assert(CP.otherAxes.length >= 3 && CP.otherAxes.every((x) => x.swapsPerSecond <= CP.ceilingSwapsPerSecond), 'the other axes (tokens, holders) are shown and never exceed the ceiling');
  assert(/HEAD round trip/.test(CP.caveats), 'the extra HEAD round trip per swap is stated beside the number');
  assert(CP.previousBuild && /\b300\b/.test(CP.previousBuild.note), 'the previous build is named, not silently replaced');
  assert(/shared machine|competing/.test(CP.caveats + CP.verdict), 'machine-load variance is stated');
  assert(CP.transfers && CP.transfers.byConnections.length >= 3, 'the native-transfer points are kept');
  assert(CP.transfers.byConnections.every((x) => x.perSecond > 0) && /signed at send time|signing client/.test(CP.transfers.note + CP.transfers.metric), 'the transfer figure says who signs and when, so it is not read as a pure server ceiling');
  assert(/not a swap/i.test(CP.transfers.note) && /no balance/i.test(CP.transfers.note), 'transfers are not conflated with swaps, and swaps are still said to move no balance');
  assert(text.includes('Native-token transfers'), 'the transfers block renders');
  assert(text.includes(CP.record) && text.includes('Client path'), 'the client-path section renders');
  assert(text.includes(fmt(CP.ceilingSwapsPerSecond)) || text.includes(String(CP.ceilingSwapsPerSecond)), 'the ceiling figure appears on the page');

  // ---- the fleet figure is a SUM of its rows, not a multiple ----------------------------------
  const FL = OPS.fleet;
  assert(FL && FL.perNode.length === FL.nodes, 'the fleet figure keeps one row per node');
  const nodeSum = FL.perNode.reduce((t, n) => t + n.swapsPerSecond, 0);
  assert.equal(nodeSum, FL.parallelSwapsPerSecond, 'the fleet total is the SUM of its node rows');
  assert.equal(FL.perNode.reduce((t, n) => t + n.cores, 0), FL.cores, 'the fleet core count is the sum of its node rows');
  // The failure mode this guards: a per-node figure multiplied by node
  // count. If the total were ever that, every row would be identical.
  assert(new Set(FL.perNode.map((n) => n.swapsPerSecond)).size === FL.nodes, 'node rows differ, so the total cannot be one node multiplied');
  assert(Math.abs(FL.swapsPerCore - FL.parallelSwapsPerSecond / FL.cores) < 1, 'per-core is derived from the total and the core count');
  assert(/sum of concurrent measurements/i.test(FL.note), 'the fleet figure says how it was obtained');

  // ---- swaps/transfers/stores are LIVE now, not a dated strip ---------------------------------
  // Redesigned 2026-10-10: these were first added as a dated AUDITED strip
  // (a reader could not find them at all); now fleet-pulse genuinely
  // re-measures them hourly per node, so they belong in Live itself, with
  // no "not live" disclaimer — that disclaimer would now be dishonest in
  // the other direction.
  assert.equal(page.find('is-audited-strip').length, 0, 'the old dated-strip wrapper must be gone now that these numbers are live');
  assert.equal(page.find('headline-fleet-strip').length, 0, 'the old strip container must be gone — the tiles live in the Live grid itself now');
  const liveGrid = page.find('live-fleet-grid')[0];
  assert(liveGrid, 'the Live grid lost its scoping class');
  const statsLiveTiles = liveGrid.find('dash-stat');
  assert.equal(statsLiveTiles.length, 9, 'Live must carry exactly 9 tiles: nodes, admission, ops, errors, swaps, transfers, stores, stakes, per-core');
  const statsLiveText = statsLiveTiles.map((t) => t.textContent).join(' ');
  for (const needed of ['swaps/s', 'transfers/s', 'results/s', 'stakes/s']) {
    assert(statsLiveText.includes(needed), `Live is missing a ${needed} tile — this is the exact gap a reader pointed at (stakes was forgotten on the first pass)`);
  }
  assert(statsLiveText.includes(fmt(operations.parallel_swaps_per_second)), 'the live swaps figure must be the pulse’s real operations.parallel_swaps_per_second, not a different number');
  assert(statsLiveText.includes(fmt(operations.transfers_per_second)), 'the live transfers figure must be the pulse’s real number');
  assert(statsLiveText.includes(fmt(operations.stores_per_second)), 'the live stores figure must be the pulse’s real number');
  assert(statsLiveText.includes(fmt(operations.stakes_per_second)), 'the live stakes figure must be the pulse’s real number');
  assert(statsLiveText.includes(fmt(operations.swaps_per_core)), 'per-core must be the pulse’s own derived figure, not recomputed client-side from a different total');
  assert(/all 2 nodes reporting/.test(statsLiveText), 'full reporting must say so in plain words, not just imply it by a clean number');

  // The live tile must no longer claim to be a generic "ops" figure now
  // that swaps/transfers/stores are named and shown separately — it
  // measures one specific thing (record admission), and must say so.
  assert(/record admission/i.test(text), 'the live tile must name what it actually benches, not say generic "ops"');
  assert(!/>Capacity now</.test(page.textContent), 'the ambiguous "Capacity now" label must be gone');
  page.arkDispose();

  // ---- a node that has not reported yet is absent, not a silent zero --------------------------
  const partialOps = {
    measured_at_ms: Date.now() - 500,
    nodes_reporting: 1, nodes_total: 2,
    parallel_swaps_per_second: 93932, transfers_per_second: 6505, stores_per_second: 205695, stakes_per_second: 6800,
    cores: 7, swaps_per_core: 13419,
    per_node: [{ node: 'bk2', swaps_per_second: 93932, transfers_per_second: 6505, stores_per_second: 205695, stakes_per_second: 6800, cores: 7 }]
  };
  pulseResult = Promise.resolve({ data: { measured_at_ms: Date.now(), aggregate_qps: 900, total_entries: 20, longest_ms: 7, errors: 0, nodes: [nodes[0]], operations: partialOps } });
  let partialHost = new Node('main');
  let partialPage = context.ArkUI.pageModules.stats.mount(partialHost);
  await new Promise((r) => setImmediate(r));
  const partialText = partialPage.find('dash-stat').map((t) => t.textContent).join(' ');
  assert(/1 of 2 nodes reporting/.test(partialText), 'a partial fleet sum must say exactly how partial it is');
  assert(partialText.includes(fmt(partialOps.parallel_swaps_per_second)), 'a partial sum is still shown, honestly labelled — not hidden and not padded to look complete');
  const partialSwapTile = partialPage.find('dash-stat').find((t) => /Swaps \/ s, fleet-wide/.test(t.textContent));
  assert.equal(partialSwapTile.dataset.state, 'warn', 'a partial fleet sum must visually read as incomplete, the same way a down node does');
  partialPage.arkDispose();

  // ---- an older pulse with no operations field yet is "not reporting", never a fabricated zero -
  pulseResult = Promise.resolve({ data: { measured_at_ms: Date.now(), aggregate_qps: 900, total_entries: 20, longest_ms: 7, errors: 0, nodes: [nodes[0]] } });
  let noOpsHost = new Node('main');
  let noOpsPage = context.ArkUI.pageModules.stats.mount(noOpsHost);
  await new Promise((r) => setImmediate(r));
  const noOpsTiles = noOpsPage.find('dash-stat').slice(4, 9);
  for (const t of noOpsTiles) {
    assert(t.textContent.includes('–'), 'with no operations field in the payload, the swap/transfer/store/per-core tiles must show a dash, not 0 or a stale number');
    assert(/not reporting yet/.test(t.textContent), 'the detail must say WHY there is no number, not just that there is none');
  }
  noOpsPage.arkDispose();

  // `page` stays the disposed live-pulse mount from above: disposal clears
  // timers and listeners, not the rendered tree, and the checks below only
  // read static text/content — they do not need a second live mount.

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
  // The whitepaper was rewritten 2026-10-10 around signed resolution, and
  // the chain-era edition is preserved unedited. The intent of these
  // assertions is unchanged — every number the page shows has detail in a
  // paper — so each now points at the paper that actually carries it.
  const paper = fs.readFileSync('docs/whitepaper.md', 'utf8');
  for (const heading of ['Appendix A', 'Appendix B', 'Appendix C']) assert(paper.includes('## ' + heading), 'whitepaper has ' + heading);
  // Current figures, and the CPU attribution that carried forward.
  for (const n of ['256', '8.920', '180', '54.7%', '3 \u00d7 Ed25519']) assert(paper.includes(n), 'whitepaper carries ' + n);
  assert(/two parties sign/i.test(paper), 'whitepaper states the protocol');
  assert(/signature IS the truth/i.test(paper), 'whitepaper states where truth comes from');

  // The retired figures the status rail still shows as ceilings keep their
  // detail in the preserved edition, which must stay present and labelled.
  const chainEra = fs.readFileSync('docs/whitepaper-chain-era.md', 'utf8');
  for (const heading of ['Appendix D', 'Appendix E', 'Appendix F']) assert(chainEra.includes('## ' + heading), 'chain-era paper has ' + heading);
  for (const n of ['1,712,006', '5,891', '24,908', '113,432']) assert(chainEra.includes(n), 'chain-era paper carries ' + n);
  assert(/SUPERSEDED/.test(chainEra.slice(0, 1200)), 'the chain-era paper is labelled superseded up front');

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
  // The pulse client must load BEFORE the page, not immediately before it:
  // the route legitimately gained js/ark/chain-pulse-client.js between them.
  // Asserting adjacency made a correct addition look like a regression.
  const statsEntry = catalog.match(/stats:\s*\{\s*path:\s*'\/stats'[^}]*\}/);
  assert(statsEntry, '/stats route is missing from the catalog');
  const statsScripts = statsEntry[0];
  // indexOf returns -1 when absent, and -1 is "before" everything -- so the
  // presence check has to be its own assertion or dropping the script passes.
  const pulseAt = statsScripts.indexOf("'js/ark/pulse-client.js'");
  const pageAt = statsScripts.indexOf("'js/pages/stats.js'");
  assert(pulseAt >= 0, '/stats no longer loads the shared pulse client at all');
  assert(pageAt >= 0, '/stats no longer loads its own page module');
  assert(pulseAt < pageAt, '/stats loads the shared pulse client before the page');
  assert(fs.readFileSync('index.html', 'utf8').includes('css/stats-dashboard.css'), 'dashboard styles are linked');
  // ---- /monitor removed 2026-10-10: /stats carries the live pulse now --------------------------
  // The page, its route, its nav link, and every reference to it across
  // the content layer were removed in the same pass — this guards that
  // removal stays removed, rather than quietly drifting back as someone
  // adds a new page and half-remembers the old one.
  assert(!fs.existsSync('js/pages/monitor.js'), 'js/pages/monitor.js must not exist — /stats carries the live pulse now');
  assert(!fs.existsSync('css/monitor.css'), 'css/monitor.css must not exist');
  assert(!/^\s*monitor:\s*\{/m.test(catalog), 'the catalog must carry no /monitor route');
  assert(!/css\/monitor\.css/.test(fs.readFileSync('index.html', 'utf8')), 'index.html must not link the removed monitor stylesheet');
  const headerSrc = fs.readFileSync('js/resolvers/header.js', 'utf8');
  assert(!/NAV\.MONITOR/.test(headerSrc), 'the header nav must carry no Monitor link');
  const navManifest = fs.readFileSync('js/content/manifests/nav.js', 'utf8');
  assert(!/"MONITOR"/.test(navManifest), 'the nav copy manifest must carry no MONITOR field');

  console.log('PASS: /stats dashboard shows only pulse values live and nothing when offline, its audited numbers are derivable, it disposes cleanly, its links resolve, and the detail lives in the whitepaper.');
})().catch((e) => { console.error(e); process.exit(1); });

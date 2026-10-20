'use strict';
/* run-tests-timeout-ms: 300000 */
/* /stats is a dashboard (2026-10-08 redesign), a page of Ark blocks since 2026-10-19 (DEFXN polish
   Wave 3, W3-STATS: js/pages/stats.js). Named regressions:
   - the module must return the element it mounts, or the router throws on `el.dataset`;
   - live values come only from the fleet pulse; when the pulse fails the page shows no number in
     their place (Ark's "No reading", never 0 or a dash) and says why;
   - the audited headline is the whitepaper §5 numbers, each derivable from its node rows;
   - the page stops polling when the router removes it (and the 1 s clock stops in a hidden tab:
     docs/ux-audit/pages-ux-b.md /stats P2);
   - every evidence record, article and page it links to exists;
   - the engineering detail it used to carry lives in docs/whitepaper.md, and the sample transfer
     cited there is real grammar;
   - /monitor stays retired;
   - Overload (pages-ux-b.md /stats P0): 3,387 words at 12.6x / 20.7x the viewport; now the hero
     answers (status, nodes online, swaps per second, last pulse) and the detail is seven tabs by
     question, each dated run one accordion row -- every number, table, bar and note kept, each view
     <= 1.6x at 1440x900 and 390x844 (W3-STATS report);
   - a live refresh keeps each tile's element (only its text moves), so a CMS edit applied to a
     tile is not dropped on the next poll;
   - saved CMS data is never rewritten: every old layout key still lands
     (tests/lib/layout-continuity.cjs against tests/fixtures/layout-keys/stats.tsv). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const continuity = require('./lib/layout-continuity.cjs');
const checks = require('./lib/block-page-checks.cjs');
const { mount } = require('./lib/stats-mount.cjs');

const ROUTE = '/stats';
const P = 'page:/div:1';
const LIVE = 'Live fleet, hourly self-bench', THROUGHPUT = 'Live swaps, transfers, stores and stakes, fleet-wide';
const ctx = vm.createContext({ window: {} }); ctx.window = ctx;
vm.runInContext(fs.readFileSync('js/content/stats-highlights.js', 'utf8'), ctx);
const S = JSON.parse(JSON.stringify(ctx.ArkStatsHighlights));
function fmt(n) { return Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 }); }

/* Why each old key whose words changed shape still lands on its successor. */
const reshaped = {
  [P + '/header:1']: 'the page header became the hero block: eyebrow, title and lede kept; its status block became the hero\'s details and its Refresh button the hero\'s second action, after the whitepaper',
  [P + '/header:1/div:2']: 'the live status block became the hero\'s details: status, nodes online, swaps per second, last pulse',
  [P + '/div:1']: 'the "Live" section head became the Live tab panel; its heading is the tab',
  [P + '/div:3']: 'the chain section head became the Chain tab panel',
  [P + '/div:5']: 'the sovereign-chains section head became the accordion item that also holds the top contributors',
  [P + '/div:7']: 'the fleet-capacity section head became the accordion item of the same name',
  [P + '/div:9']: 'the measured-resolver section head became the first row of the Throughput tab, its title now carrying its headline number',
  [P + '/div:10/section:1']: 'the resolver-registry panel became an accordion item of the same name',
  [P + '/div:10/section:1/p:1']: 'the panel\'s title line is the accordion item\'s title, renamed "Resolver families audited": "registry" collided with the registry ledger (the launch log on the base chain), and this table is the audit\'s families (docs/ux-audit/resolvers-content.md 2.11)',
  [P + '/section:12/div:1/table:1/tbody:1/tr:3/td:1']: 'the records table\'s row for the audit, renamed "Resolver families audited" for the same reason as the accordion item',
  [P + '/div:10/section:1/ol:1']: 'the registry list became a table: resolver, signers and work, state',
  [P + '/div:10/section:2']: 'the binding-constraint panel became an accordion item of the same name',
  [P + '/div:10/section:2/p:2']: 'the "449.229 ms to 10 replicas" line is the stat\'s value now; "to 10 replicas" is its label',
  [P + '/div:10/section:2/dl:1']: 'the same four facts, in Ark\'s facts block',
  [P + '/section:4']: 'the operations panel became the "Every operation in its own unit" accordion item',
  [P + '/section:5']: 'the per-node panel became "The fleet, measured" accordion item (its tiles and bars together)',
  [P + '/section:6']: 'the route-forward panel became an accordion item of the same name',
  [P + '/section:7']: 'the batch-size panel became an accordion item of the same name',
  [P + '/section:8']: 'the client-path panel became the Client path tab panel',
  [P + '/section:10']: 'the dispatch note panel became the "Native FXN Compute Rent Resolver dispatch" accordion item',
  [P + '/section:11']: 'the remote-env panel became an accordion item of the same name',
  [P + '/div:14']: 'the platform section head became the Platform tab panel',
  [P + '/div:16']: 'the benchmark-runs section head became the Evidence tab panel',
  [P + '/div:17']: 'the readiness section head became the Readiness tab panel',
  [P + '/div:18/section:1/ul:1']: 'the readiness list became an accordion grouped by state (done, partial, not yet)',
  [P + '/div:18/section:2']: 'the "Go deeper" panel became Ark\'s pager under the same label, in the Evidence tab',
  [P + '/div:18/section:2/ul:1']: 'the same six links; the whitepaper\'s label was shortened to fit the pager',
  [P + '/div:18/section:2/ul:1/li:1']: 'the whitepaper link\'s label was shortened to fit the pager ("Whitepaper: how it works, and every number’s source")',
  [P + '/div:18/section:2/ul:1/li:1/a:1']: 'the whitepaper link\'s label was shortened to fit the pager ("Whitepaper: how it works, and every number’s source")',
  'page:/div:2': 'the CMS insertion anchor, kept: now its own row after the tabs'
};
for (let i = 1; i <= 9; i++) reshaped[P + '/div:2/article:' + i] = 'a live tile became an Ark stat tile; with no reading it says "No reading" and why (it said "–")';
for (let i = 1; i <= 6; i++) reshaped[P + '/div:4/article:' + i] = 'a chain tile became an Ark stat tile; with no reading it says "No reading" and why (it said "unavailable")';
for (let i = 1; i <= 4; i++) reshaped[P + '/div:8/article:' + i] = 'a capacity tile became an Ark stat tile; with no reading it says "No reading" and why (it said "unavailable")';
for (let i = 1; i <= 9; i++) reshaped[P + '/div:2/article:' + i + '/p:2'] = 'the value line: "No reading" (Ark\'s absent state) where it showed "–"; the unit returns with the first reading';
for (let i = 1; i <= 6; i++) reshaped[P + '/div:4/article:' + i + '/p:2'] = 'the value line: "No reading" (Ark\'s absent state) where it said "unavailable"';
for (let i = 1; i <= 4; i++) reshaped[P + '/div:8/article:' + i + '/p:2'] = 'the value line: "No reading" (Ark\'s absent state) where it said "unavailable"';
reshaped[P + '/div:4/article:1/p:3'] = 'the lead tile\'s refusal: the failure and the missing thing, then the remedy on its own "Fix:" line (it read "Remedy:")';
reshaped[P + '/div:8/article:1/p:3'] = 'the lead tile\'s refusal: the failure and the missing thing, then the remedy on its own "Fix:" line (it read "Remedy:")';
reshaped[P + '/div:2/section:1'] = 'the nodes panel became the "Nodes" accordion item';
reshaped[P + '/div:2/section:1/ul:1'] = 'the node cards are Ark\'s bar list now (ops/s per node), beside a table of each node\'s result';
reshaped[P + '/div:2/section:2'] = 'the per-node operations panel became an accordion item of the same name';
for (const wrap of [P + '/div:2/section:2/div:1', P + '/section:1/div:1', P + '/section:2/div:1', P + '/section:3/div:1']) reshaped[wrap] = 'the live table\'s wrapper is Ark\'s table now: with no rows it says why in its one cell';
for (const wrap of [P + '/section:4/div:1', P + '/section:9/div:1', P + '/section:11/div:1', P + '/section:12/div:1']) {
  reshaped[wrap] = 'the same table, now with a caption that says what it shows';
  reshaped[wrap + '/table:1'] = 'the same table, now with a caption that says what it shows';
}
reshaped[P + '/section:12/div:1/table:1/tbody:1'] = 'the same eleven runs; each record\'s link is in "The records behind the runs" beside the table';
for (let tr = 1; tr <= 11; tr++) reshaped[P + '/section:12/div:1/table:1/tbody:1/tr:' + tr] = 'the same run; its record\'s link is in "The records behind the runs" beside the table';
for (const li of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
  reshaped[P + '/div:18/section:1/ul:1/li:' + li] = 'a readiness item became a fact (title, then its state and text) in the group of its state';
  reshaped[P + '/div:18/section:1/ul:1/li:' + li + '/div:1/p:1'] = 'the item\'s text, now after its state ("Measured — …")';
}
for (let b = 1; b <= 4; b++) reshaped[P + '/section:7/ol:1/li:' + b + '/p:1'] = 'the bar\'s name, shortened to fit Ark\'s 48-character bar label ("swaps/batch · verification N%")';
for (let b = 1; b <= 4; b++) reshaped[P + '/section:7/ol:1/li:' + b] = 'the same bar, its name shortened to fit Ark\'s bar label';
/* Why nothing carries these keys now. */
const retired = {
  [P]: 'the page column wrapper (dash shell); a block page has none -- its root (page:/) is the column',
  [P + '/header:1/div:1']: 'the header\'s copy wrapper; the hero lays out its own parts',
  [P + '/header:1/div:2/p:3']: 'the "next check" line: its words join the Last pulse detail ("… · Next check in m:ss")',
  [P + '/div:2']: 'the live grid; its tiles are the Live tab\'s stat rows, its panels accordion items',
  [P + '/div:4']: 'the chain grid; its tiles are the Chain tab\'s stat row',
  [P + '/div:4/section:1']: 'the "Not yet available" panel; its lines are paragraphs of the Chain tab\'s note',
  [P + '/div:6']: 'the top-contributors section head; its words open the same accordion item as the sovereign chains',
  [P + '/div:8']: 'the capacity tile grid; its tiles are the accordion item\'s stat row',
  [P + '/div:10']: 'the audited grid; its tiles and panels are rows of the Throughput tab',
  [P + '/div:11']: 'the operations section head; its words open the operations accordion item',
  [P + '/div:12']: 'the fleet section head; its words open "The fleet, measured" accordion item',
  [P + '/div:13']: 'the fleet tile grid; its tiles are the accordion item\'s stat row',
  [P + '/section:1']: 'the sovereign-chains panel; its table is in the accordion item',
  [P + '/section:2']: 'the top-contributors panel; its table is in the same accordion item',
  [P + '/section:3']: 'the capacity table panel; its table is in the accordion item',
  [P + '/section:9']: 'the platform audit panel; its table is the Platform tab\'s',
  [P + '/div:15']: 'the dispatch tile grid; its tiles are the dispatch accordion item\'s stat row',
  [P + '/section:12']: 'the benchmark-runs panel; its table is the Evidence tab\'s',
  [P + '/div:18']: 'the readiness grid; its panels are the Readiness tab and the Evidence tab\'s pager',
  [P + '/div:18/section:1']: 'the readiness panel; its summary is the Readiness tab\'s note, its list an accordion',
  [P + '/section:5/h2:1']: 'kept as a line of the fleet item\'s note? -- see reshaped'
};
delete retired[P + '/section:5/h2:1'];
for (const k of [P + '/section:9/p:1', P + '/section:9/h2:1']) retired[k] = 'the panel\'s label and heading are now the caption of the table they introduced (same words); a <caption> is not a layout target (js/content/layout.js KEY_TAGS has no caption), so nothing can carry its key until captions become keyable';
for (const { key } of continuity.readCensus(ROUTE)) {
  if (/\/article:\d+\/p:2\/(strong|span):1$/.test(key) && /div:(2|4|8)\//.test(key)) retired[key] = 'the tile\'s number and unit elements; with no reading Ark\'s stat draws "No reading" in the value line, which keeps the key';
  if (/\/article:\d+\/p:3$/.test(key) && /div:(13|15)\//.test(key)) retired[key] = 'an empty detail line; Ark\'s stat draws none when there is no detail';
  if (/\/ol:\d+\/li:\d+\/span:1(\/span:1)?$/.test(key)) retired[key] = 'the bar\'s empty track and fill; Ark\'s bar list draws its own beside the label';
  if (/\/ol:\d+\/li:\d+\/p:1\/(b|span):1$/.test(key) && !/div:10\/section:1\//.test(key)) retired[key] = 'the bar\'s name and detail, written as one label in Ark\'s bar list (which keeps the name line\'s key)';
  if (/\/div:18\/section:1\/p:1\/span:\d$/.test(key)) retired[key] = 'a count in the readiness summary; the summary line keeps the key and the words';
  if (/\/div:18\/section:1\/ul:1\/li:\d+\/(span:1|div:1)$/.test(key)) retired[key] = 'the item\'s badge and copy wrapper; the state is its group and the fact\'s value, the title and text keep their keys';
  if (/section:12\/div:1\/table:1\/tbody:1\/tr:\d+\/td:6\/a:1$/.test(key)) retired[key] = 'the record link in the runs table; the records are linked once each in "The records behind the runs", which keeps the first link\'s key';
}
reshaped['page:/div:1/div:9/h2:1'] = 'the section heading "Measured resolver · 2026-10-10" is the accordion row\'s title now, followed by its headline number';

const R = reshaped, X = retired;
R['page:/div:1/section:5/ol:1'] = 'the per-node bars are Ark\'s bar list (each name and core count one label; the census\'s 160-character cut falls later)';
R['page:/div:1/section:7/ol:1'] = 'the batch-size bars are Ark\'s bar list; each name shortened to fit its 48-character label';
R['page:/div:1/section:8/ol:1'] = 'the connection bars are Ark\'s bar list (each name one label; the census\'s 160-character cut falls later)';
X['page:/div:1/div:10/section:2/p:2/span:1'] = 'the unit line "ms to 10 replicas": "ms" is the stat\'s unit and "to 10 replicas" its label now';
for (let li = 1; li <= 6; li++) X['page:/div:1/div:10/section:1/ol:1/li:' + li + '/p:1'] = 'the registry row\'s name line; its two parts are the row\'s Resolver and Signers cells, which keep their keys';
for (let li = 1; li <= 6; li++) X['page:/div:1/div:10/section:1/ol:1/li:' + li + '/span:1'] = 'the registry row\'s empty spacer bar; a table row needs none';

(async () => {
  /* ---- the module is a spec of Ark blocks -------------------------------------------------- */
  checks.assertSourceIsSpec(fs.readFileSync('js/pages/stats.js', 'utf8'), 'js/pages/stats.js');

  // ---- offline first: no live number is invented -------------------------------------------
  let m = mount({ pulse: () => Promise.reject(new Error('HTTP 502 from /api/fleet-pulse')) });
  assert(m.page && m.page.dataset, 'stats mount() returns its page element for the router');
  assert.equal(m.page.parentNode, m.host, 'the returned element is the one mounted');
  await m.flush();
  assert.equal(m.meta().Status, 'Pulse unreachable', 'an unreachable pulse shows as unreachable');
  const offline = m.tiles(LIVE).concat(m.tiles(THROUGHPUT));
  assert.equal(offline.length, 9, 'all nine live tiles are there');
  for (const t of offline) {
    assert.equal(t.state, 'absent', t.label + ': no reading while offline');
    assert(/No reading/.test(t.value) && !/\d/.test(t.value), t.label + ': "No reading", never a number or a dash: ' + t.value);
  }
  assert(m.table('Each node in the last pulse')[0][0].includes('HTTP 502'), 'the offline message names the failure');
  m.dispose();
  assert.equal(m.timers.size, 0, 'dispose clears every timer');
  assert.equal((m.listeners.visibilitychange || []).length, 0, 'dispose removes the visibility listener');

  // ---- live: values are the pulse's values ---------------------------------------------------
  const nodes = [{ name: 'bk2', addr: 'a:1', ok: 10, total: 10, elapsed_ms: 5, qps: 900, error: null },
                 { name: 'mk2', addr: 'b:1', ok: 0, total: 10, elapsed_ms: 5, qps: 0, error: 'timeout' }];
  const operations = {
    measured_at_ms: Date.now() - 500, nodes_reporting: 2, nodes_total: 2,
    parallel_swaps_per_second: 637149, transfers_per_second: 68188, stores_per_second: 5752753, stakes_per_second: 68192,
    cores: 37, swaps_per_core: 17220.4,
    per_node: [
      { node: 'bk2', swaps_per_second: 93932, transfers_per_second: 6505, stores_per_second: 205695, stakes_per_second: 6800, cores: 7 },
      { node: 'mk2', swaps_per_second: 96375, transfers_per_second: 7330, stores_per_second: 549332, stakes_per_second: 7100, cores: 5 }
    ]
  };
  let pulse = { data: { measured_at_ms: Date.now(), aggregate_qps: 900, total_entries: 20, longest_ms: 7, errors: 1, nodes, operations } };
  m = mount({ pulse: () => Promise.resolve(pulse) });
  await m.flush();
  assert.equal(m.meta().Status, '1 of 2 nodes down', 'a down node degrades the status');
  assert.equal(m.meta()['Nodes online'], '1/2 nodes', 'the hero counts only nodes that answered');
  assert.equal(m.tiles(LIVE)[0].value.replace(/\s/g, ''), '1/2nodes', 'nodes online counts only nodes that answered');
  const nodeRows = m.table('Each node in the last pulse');
  assert.equal(nodeRows.length, 2, 'one row per pulse node');
  assert(nodeRows.some((row) => row.includes('timeout')), 'a failing node shows its error');
  const bars = [...m.page.querySelectorAll('[data-ark-block="meter"][aria-label="Record admission per node, last pulse"] [data-ark-part="meter"]')];
  assert.equal(bars.length, 2, 'one bar per pulse node');
  assert.equal(bars[1].getAttribute('data-state'), 'absent', 'a node that did not answer draws no bar (absent, not 0)');

  // swaps/transfers/stores/stakes are live: the pulse's own numbers, in their own units
  const liveTiles = m.tiles(LIVE).concat(m.tiles(THROUGHPUT));
  assert.equal(liveTiles.length, 9, 'Live carries exactly 9 tiles: nodes, admission, ops, errors, swaps, transfers, stores, stakes, per-core');
  const liveText = liveTiles.map((t) => t.text).join(' ');
  for (const needed of ['swaps/s', 'transfers/s', 'results/s', 'stakes/s']) assert(liveText.includes(needed), 'Live is missing a ' + needed + ' tile — stakes was forgotten on the first pass');
  for (const key of ['parallel_swaps_per_second', 'transfers_per_second', 'stores_per_second', 'stakes_per_second', 'swaps_per_core']) {
    assert(liveText.includes(fmt(operations[key])), 'the live tile shows the pulse’s real ' + key + ' (' + fmt(operations[key]) + '), with no false precision');
  }
  assert(/all 2 nodes reporting/.test(liveText), 'full reporting says so in plain words');
  assert(/record admission/i.test(m.text()), 'the admission tile names what it actually benches');
  assert(!/>Capacity now</.test(m.page.innerHTML), 'the ambiguous "Capacity now" label stays gone');
  assert.equal(m.meta()['Swaps per second'], fmt(operations.parallel_swaps_per_second) + ' swaps/s', 'the hero answers with the live swap rate');

  // a refresh keeps each tile's element: only the words move (a CMS edit on it survives the poll)
  const swapTile = m.tiles(THROUGHPUT)[0].el;
  swapTile.setAttribute('data-ark-layout-applied', 'true'); swapTile.setAttribute('style', 'opacity: 0.8');
  pulse = { data: Object.assign({}, pulse.data, { operations: Object.assign({}, operations, { parallel_swaps_per_second: 700001 }) }) };
  m.page.querySelector('#stats-hero button[data-action="refresh"]').click();
  await m.flush();
  assert.equal(m.tiles(THROUGHPUT)[0].el, swapTile, 'the same tile element after a refresh');
  assert(swapTile.textContent.includes('700,001'), 'with the new number');
  assert.equal(swapTile.getAttribute('style'), 'opacity: 0.8', 'and the saved edit\'s style still on it');
  m.dispose();

  // ---- a node that has not reported yet is absent, not a silent zero --------------------------
  const partialOps = { measured_at_ms: Date.now() - 500, nodes_reporting: 1, nodes_total: 2,
    parallel_swaps_per_second: 93932, transfers_per_second: 6505, stores_per_second: 205695, stakes_per_second: 6800, cores: 7, swaps_per_core: 13419,
    per_node: [{ node: 'bk2', swaps_per_second: 93932, transfers_per_second: 6505, stores_per_second: 205695, stakes_per_second: 6800, cores: 7 }] };
  m = mount({ pulse: () => Promise.resolve({ data: { measured_at_ms: Date.now(), aggregate_qps: 900, total_entries: 20, longest_ms: 7, errors: 0, nodes: [nodes[0]], operations: partialOps } }) });
  await m.flush();
  const partialText = m.tiles(THROUGHPUT).map((t) => t.text).join(' ');
  assert(/1 of 2 nodes reporting/.test(partialText), 'a partial fleet sum says exactly how partial it is');
  assert(/PARTIAL sum/.test(partialText), 'and reads as incomplete in words (Ark\'s stat has no warn tone: reported by W3-STATS)');
  assert(partialText.includes(fmt(partialOps.parallel_swaps_per_second)), 'a partial sum is still shown, honestly labelled');
  m.dispose();

  // ---- an older pulse with no operations field yet is "not reporting", never a fabricated zero -
  m = mount({ pulse: () => Promise.resolve({ data: { measured_at_ms: Date.now(), aggregate_qps: 900, total_entries: 20, longest_ms: 7, errors: 0, nodes: [nodes[0]] } }) });
  await m.flush();
  for (const t of m.tiles(THROUGHPUT)) {
    assert.equal(t.state, 'absent', t.label + ' has no reading without an operations field');
    assert(/not reporting yet/.test(t.text), t.label + ' says WHY there is no number');
  }
  m.dispose();

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
  const text = (() => { const mm = mount({ pulse: () => Promise.reject(new Error('offline')) }); const t = mm.text(); mm.dispose(); return t; })();
  assert(text.includes(String(DS.swapsPerBatch)), 'swaps per batch appears on the page');
  assert(/not pipelined/i.test(text), 'the page names the broadcast as the binding constraint');
  assert(!/\b(TPS|accepted\/s|replica applications)\b/i.test(text), 'the page shows no retired unit');
  assert(text.includes('449.229'), 'measured figures are shown as recorded, not rounded by the tile');

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
  assert(/replica requirement 0/.test(CP.replicationNote), 'the zero-replication setting is stated beside the number');
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
  assert(text.includes('client processes'), 'the multi-process block renders');
  assert(text.includes(CP.record) && text.includes('Client path'), 'the client-path section renders');
  assert(text.includes(fmt(CP.ceilingSwapsPerSecond)), 'the ceiling figure appears on the page');

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

  // ---- catalog ------------------------------------------------------------------------------
  const catalog = fs.readFileSync('js/pages/catalog.js', 'utf8');
  const statsRoute = require('./lib/site-catalog.cjs').loadCatalog().catalog.stats;
  assert(statsRoute && statsRoute.path === '/stats', '/stats route is missing from the catalog');
  const scripts = [...statsRoute.scripts];
  // indexOf returns -1 when absent, and -1 is "before" everything -- so presence is its own check.
  for (const file of ['js/ark/pulse-client.js', 'js/ark/chain-pulse-client.js', 'js/ark/chain-fleet-capacity-client.js', 'js/ark/blocks.js', 'js/content/glossary.js']) {
    assert(scripts.indexOf(file) >= 0 && scripts.indexOf(file) < scripts.indexOf('js/pages/stats.js'), '/stats loads ' + file + ' before the page');
  }
  assert(fs.readFileSync('index.html', 'utf8').includes('css/ark-blocks.css'), 'the block styles are linked');
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


  /* ---- what the visitor gets, through the real server render -------------------------------- */
  const seen = await checks.visit(ROUTE, (window, page) => ({
    tabs: [...page.querySelectorAll('#stats-views [role="tab"]')].map((el) => el.textContent.trim()),
    links: [...page.querySelectorAll('a[data-scene-link]')].map((a) => a.getAttribute('data-scene-link'))
  }));
  assert.deepEqual(seen.blocks, ['breadcrumb', 'hero', 'tabs'], 'trail, the answer, the detail as tabs');
  assert.deepEqual(seen.tabs, ['Live', 'Chain', 'Throughput', 'Client path', 'Platform', 'Evidence', 'Readiness']);
  for (const target of ['resolvers', 'stats/ledger', 'stats/gpu', 'reference']) assert(seen.links.includes(target), 'the page leads on to ' + target);
  assert.deepEqual(seen.refused, [], 'no block was refused');
  assert.deepEqual(seen.termsMissing, [], 'every glossary term has an entry in docs/glossary.md');
  assert(['node', 'shard', 'replica', 'ed25519', 'segment'].every((t) => seen.terms.includes(t)), 'jargon is glossed: ' + seen.terms.join(', '));
  assert.equal(seen.inserts, 1, 'the CMS insertion anchor is still there');
  assert.deepEqual(seen.h1, ['stats-title']);

  const ssr = await checks.assertServerRender(ROUTE, 'stats', { idPrefix: 'stats-' });

  /* ---- saved CMS edits still land ---------------------------------------------------------- */
  const census = continuity.readCensus(ROUTE);
  const after = await continuity.pageKeys(ROUTE);
  const tally = continuity.assertContinuity(census, after, { reshaped, retired });
  assert.equal(tally.kept + tally.reshaped + tally.retired, census.length, 'every old key is accounted for');
  const landed = await continuity.assertSavedEditsLand(ROUTE, census, { reshaped, retired, live: {
    'page:/div:1/header:1/div:2/p:2': 'the pulse status line (stats.js paintOffline/paintAge): its words follow the fetch, so the census froze one state of them'
  } });
  assert.equal(landed, census.length - 1 - Object.keys(retired).length, 'a saved frame on every old key but page:/ and the retired ones landed');
  assert(after.every((entry) => !/^id:ark-r-/.test(entry.key)), 'no generated (ark-r-) id became a layout key');

  console.log('PASS: /stats is a spec of Ark blocks: pulse values live and nothing when offline, a refresh keeps the tiles, its audited numbers are derivable, it disposes cleanly, its links resolve, the detail lives in the whitepaper (' + ssr.blocks + ' blocks server-rendered styled); ' + tally.kept + ' old layout keys kept, ' + tally.reshaped + ' reshaped, ' + tally.retired + ' retired, and ' + landed + ' saved edits land.');
})().catch((e) => { console.error(e); process.exit(1); });

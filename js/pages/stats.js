/* /stats: the mesh performance dashboard, as a page of Ark blocks.

   The page answers three questions, in this order, and nothing else:
     1. Is the fleet up right now, and what is it doing?  (LIVE: the hourly
        fleet self-bench through ArkPulse, re-checked every minute while the
        tab is visible. Never simulated; when the pulse is unreachable the
        page says so and shows no number in its place.)
     2. What has the fleet measurably done?  (AUDITED: the dated runs, each
        with its evidence record.)
     3. How close is this to production?  (READINESS: what is measured,
        partial, or not yet done.)

   Converted to data in DEFXN polish Wave 3 (W3-STATS). It was 3,387 words at 12.6x the viewport
   on a desktop and 20.7x on a phone, a research log under a dashboard title: 20 sections, 7
   hand-built tables, 7+ hand-built bar lists, 31 tiles (docs/ux-audit/pages-ux-b.md /stats P0).
   Now the hero answers -- the fleet's status, nodes online, swaps per second, the last pulse --
   and the detail is seven tabs by question (Live · Chain · Throughput · Client path · Platform ·
   Evidence · Readiness), each dated run folded into an accordion. Every number, table, bar and
   note is still here; the tiles are Ark's stat (with its absent state: "No reading", never 0 or a
   dash), the tables Ark's table, the bars Ark's meter.

   Live blocks are patched in place from the same spec when a feed answers (refresh(), below, on
   ArkUI.blocks.update): an element whose shape did not change is kept and only its text and
   attributes move, so a saved CMS edit on a tile stays applied between polls.

   The engineering detail that used to live here (a transfer taken apart, CPU profiles, the
   ladder, batch checks, the certified-segment run, the retired fabric numbers) moved to
   docs/whitepaper.md, appendices B-F. Every figure is read from js/content/stats-highlights.js,
   shared with the home page. Change a number in its evidence record first.

   Layout keys: tests/stats-page.cjs holds the continuity of every old key
   (tests/fixtures/layout-keys/stats.tsv). */
(function () {
  'use strict';

  var POLL_MS = 60000;
  var STALE_MS = 2 * 60 * 60 * 1000; // the pulse runs hourly; two hours without one is stale
  var WHITEPAPER = 'docs/whitepaper.md';
  var ARTICLE_STORY = 'article/how-we-got-fast-and-what-we-got-wrong';
  var FROM = '/stats';

  /* en-US with no decimals (js/ark/dash-kit.js fmt): every live figure is a count or a rate. */
  function fmt(n) { return ArkUI.dash.fmt(n); }
  function ago(ms) {
    var min = Math.max(0, Math.round(ms / 60000));
    if (min < 1) return 'just now';
    if (min < 60) return min + ' min ago';
    var h = Math.floor(min / 60), m = min % 60;
    return h + ' h' + (m ? ' ' + m + ' min' : '') + ' ago';
  }

  /* A live feed this page could not read is refused, never painted as 0 or as a bare dash
     (AGENTS.md: "never report a capability that does not exist as 0"; "a refusal must name
     what it needs"). Returns the failure, the missing thing and the remedy for one feed.
     Named regression (2026-10-19, tests/stats-unavailable-not-zero.cjs): on a host that does
     not route /api/chain-pulse the "Chain · dense-wire" tiles said "Chain reachable: no" --
     a claim about the chain the page never measured -- and dashes everywhere else. A 404
     means THIS HOST does not serve the API; that is a different remedy from a feed that
     answered and said the chain-server is down. */
  function feedUnavailable(feed, error) {
    var e = error || {}, message = e.message || String(error || 'unknown error');
    var endpoint = e.endpoint || window[feed.override] || feed.endpoint;
    var serve = 'run ' + feed.server + ' behind ' + endpoint + ' (ops/caddy/defxn-site.caddy routes it on defxn.com), or open this page on defxn.com';
    var r;
    if (e.notLoaded) r = { failure: 'did not load its client', missing: feed.client, remedy: 'add ' + feed.client + ' to this route’s scripts' };
    else if (e.status === 404) r = { failure: 'answered 404', missing: 'the ' + feed.api + ' — this host does not serve it', remedy: serve };
    else if (e.status) r = { failure: 'answered ' + e.status, missing: 'a working ' + feed.api + ' response', remedy: 'check ' + feed.server + ' on the host behind ' + endpoint };
    else if (e.name === 'AbortError') r = { failure: 'did not answer within 6 s', missing: 'an answer from ' + feed.server, remedy: 'check that it is running and reachable from this host' };
    else if (e.name === 'SyntaxError') r = { failure: 'answered with something that is not JSON', missing: 'the ' + feed.api + ' — this host answered with a page instead', remedy: serve };
    else if (/^Malformed/.test(message)) r = { failure: 'answered in the wrong shape (' + message + ')', missing: 'a response ' + feed.client + ' accepts', remedy: 'fix the response in ' + feed.server };
    else r = { failure: 'could not be reached (' + message + ')', missing: 'a network path to ' + endpoint, remedy: 'check the connection, then ' + feed.server };
    r.failure = feed.name + ' unavailable: ' + (e.notLoaded ? 'the page ' : endpoint + ' ') + r.failure;
    r.text = r.failure + '. Missing: ' + r.missing + '. Remedy: ' + r.remedy + '.';
    return r;
  }
  var CHAIN_PULSE_FEED = { name: 'Chain pulse', api: 'chain pulse API', endpoint: '/api/chain-pulse', override: 'ArkChainPulseEndpoint', server: 'ops/chain-pulse-api.mjs', client: 'js/ark/chain-pulse-client.js' };
  var FLEET_CAPACITY_FEED = { name: 'Fleet capacity', api: 'fleet capacity API', endpoint: '/api/chain-fleet-capacity', override: 'ArkChainFleetCapacityEndpoint', server: 'ops/chain-fleet-capacity-api.mjs', client: 'js/ark/chain-fleet-capacity-client.js' };

  // Readiness: each line names its state and the evidence behind it.
  var READINESS = [
    { state: 'done', badge: 'Measured', title: 'Resolver throughput (synthetic, not production)', text: '256 swaps per batch auction, 8.920 ms batch latency, 180 bytes per signed result, broadcast to 10 live replicas, 60/60 audits passed (BENCH-012). Not production: no external users, and the party-to-shard transport is excluded. Earlier generations were measured in units this project no longer reports \u2014 see docs/deprecated.md. Earlier generations of this measurement are in the frozen BENCH records and docs/whitepaper-chain-era.md; they are not restated here.' },
    { state: 'done', badge: 'Passing', title: 'Attack suite', text: '7 of 7 attacks refused: replay, double-spend, concurrent double-append, cross-chain confusion, wrong-prev fork, tampered signature, equivocation.' },
    { state: 'partial', badge: 'Partial', title: 'Sustained load', text: 'A 303-second soak accepted 3,760,000 records with zero failures. No 30-minute soak has run across the full mesh.' },
    { state: 'done', badge: 'Measured', title: 'Full 10-node transfer bench', text: 'BENCH-011 ran on all ten flx-* nodes concurrently (10 s each, mixed topology, segmented-v3). Zero errors across 852,152 signed transfers.' },
    { state: 'partial', badge: 'Partial', title: 'Live node discovery', text: 'The pulse reads a configured roster; nodes that join are not discovered automatically yet.' },
    { state: 'partial', badge: 'Partial', title: 'Evidence record for the headline run', text: 'Filed as BENCH-008 with every node’s result. The raw JSON files and source revision still have to be attached.' },
    { state: 'todo', badge: 'Not yet', title: 'Pipelined broadcast to replicas', text: 'A signed result reaches ten of ten replicas, but the broadcast is not pipelined: 449 ms against 8.9 ms to resolve, which caps the fleet near 2.2 batches/s and is the binding constraint on everything. The intended shape is one feed per pool. Historical: Implemented and tested, but the fleet soak ran on the local cache. The rerun with replication on is planned as BENCH-009.' },
    { state: 'todo', badge: 'Not yet', title: 'Public client traffic', text: 'Every client so far was operator-driven.' },
    { state: 'todo', badge: 'Not yet', title: 'Independent security review', text: 'Only our own tests have looked at the per-identity chain, the resolver launch and grammar checks, and the capability crates.' },
    { state: 'partial', badge: 'Partial', title: 'DAO treasury multisig', text: 'Real N-of-M threshold-gated DAO founding, treasury binding, and split-payment spend (BENCH-014) — now wired into the live TCP/WS wire protocol and verified end to end against a real standalone chain-server (devnet dry run, 17/17 steps). Durable: 1174-1357 claims/s local 2-replica, 17 claims/s against two real fleet nodes over real WAN (2-of-2 signer threshold, bottlenecked on the farther node’s real network distance). Accepted, not yet durable: up to ~3017 claims/s local, ~1003 claims/s real WAN. 428 crate tests passing. Still not on production: no sovereign chain or DAO has launched there, and only 2 of 6 fleet nodes have been measured.' }
  ];

  /* ---- live state: one record per live tile, painted by the polls below ------------------- */
  /* A tile with no reading carries the reason (and, for a feed that failed, the remedy): Ark's
     stat renders it as "No reading" with that reason -- never a 0, never a bare dash. */
  function waiting(reason) { return { absent: { kind: 'unavailable', reason: reason } }; }
  function reading(value, unit, detail) { return { value: value, unit: unit, detail: detail }; }
  var LIVE_TILES = [['nodes', 'Nodes online'], ['rate', 'Record admission now'], ['ops', 'Operations in last bench'], ['errors', 'Errors in last bench'],
    ['swaps', 'Swaps / s, fleet-wide'], ['transfers', 'Transfers / s, fleet-wide'], ['stores', 'Stores / s, fleet-wide'], ['stakes', 'Stakes / s, fleet-wide'], ['perCore', 'Swaps per core']];
  var LIVE_UNITS = { nodes: 'nodes', rate: 'records/s', ops: 'ops', errors: '', swaps: 'swaps/s', transfers: 'transfers/s', stores: 'results/s', stakes: 'stakes/s', perCore: 'swaps/s' };
  var CHAIN_TILES = [['status', 'Chain reachable'], ['peers', 'Peers connected now'], ['seg', 'Pending segment votes'], ['lines', 'Lines in pending segment'], ['supporters', 'Live supporters'], ['providers', 'Live providers']];
  var CAPACITY_TILES = [['signers', 'Signers up'], ['floor', 'Signer floor'], ['peers', 'Peers up'], ['probe', 'Last probe']];
  var LABEL = { live: 'Live fleet, hourly self-bench', throughput: 'Live swaps, transfers, stores and stakes, fleet-wide', chain: 'Chain-server, live', capacity: 'Fleet capacity, live', nodes: 'Record admission per node, last pulse',
    nodeTable: 'Each node in the last pulse', ops: 'Swaps, transfers, stores and stakes per node, last pulse', sovereign: 'Sovereign chains on this node, live',
    leaders: 'Top contributors per chain, live', capTable: 'Every chain-server node, probed directly' };

  function freshState() {
    var s = { live: {}, chain: {}, capacity: {}, nodes: null, nodeNote: 'Loading the latest pulse…', ops: null, opsNote: 'Waiting for each node’s own ops-pulse…',
      chains: null, chainsNote: 'Waiting for the chain pulse…', leaders: null, leadersNote: 'Waiting for the chain pulse…', capNodes: null, capNote: 'Waiting for the fleet capacity probe…' };
    LIVE_TILES.forEach(function (t) { s.live[t[0]] = waiting('waiting for pulse'); });
    CHAIN_TILES.forEach(function (t) { s.chain[t[0]] = waiting(t[0] === 'supporters' || t[0] === 'providers' ? 'waiting for roster status' : 'waiting for pulse'); });
    CAPACITY_TILES.forEach(function (t) { s.capacity[t[0]] = waiting('waiting for fleet capacity'); });
    return s;
  }
  function statItem(label, st) {
    var item = { label: label };
    if (st.absent) item.absent = st.absent; else { item.value = st.value; item.unit = st.unit || undefined; item.detail = st.detail || undefined; }
    return item;
  }
  function liveBlocks(state) {
    return {
      live: { block: 'stats', props: { label: LABEL.live, columns: 4, items: LIVE_TILES.slice(0, 4).map(function (t) { return statItem(t[1], state.live[t[0]]); }) } },
      throughput: { block: 'stats', props: { label: LABEL.throughput, columns: 4, items: LIVE_TILES.slice(4).map(function (t) { return statItem(t[1], state.live[t[0]]); }) } },
      chain: { block: 'stats', props: { label: LABEL.chain, columns: 4, items: CHAIN_TILES.map(function (t) { return statItem(t[1], state.chain[t[0]]); }) } },
      capacity: { block: 'stats', props: { label: LABEL.capacity, columns: 2, items: CAPACITY_TILES.map(function (t) { return statItem(t[1], state.capacity[t[0]]); }) } },
      nodes: { block: 'meter', props: { label: LABEL.nodes, items: state.nodes && state.nodes.length
        ? state.nodes.map(function (n) { return { label: n.name, value: n.error || !(n.qps > 0) ? null : n.qps, display: n.error || !(n.qps > 0) ? undefined : fmt(n.qps) + ' ops/s', tone: n.error ? 'danger' : undefined }; })
        : [{ label: 'No pulse yet', value: null }] } },
      nodeTable: { block: 'table', props: { caption: LABEL.nodeTable, maxHeight: 'compact', empty: state.nodeNote,
        columns: [{ key: 'name', label: 'Node' }, { key: 'addr', label: 'Address', mono: true }, { key: 'qps', label: 'ops/s', numeric: true }, { key: 'ok', label: 'Result' }, { key: 'ms', label: 'Elapsed', numeric: true }],
        rows: (state.nodes || []).map(function (n) { return { name: n.name, addr: n.addr, qps: n.error ? null : fmt(n.qps), ok: n.error ? n.error : fmt(n.ok) + ' / ' + fmt(n.total) + ' ok', ms: n.error ? null : fmt(n.elapsed_ms) + ' ms' }; }) } },
      ops: { block: 'table', props: { caption: LABEL.ops, maxHeight: 'compact', empty: state.opsNote,
        columns: [{ key: 'node', label: 'Node' }, { key: 'swaps', label: 'Swaps/s', numeric: true }, { key: 'transfers', label: 'Transfers/s', numeric: true }, { key: 'stores', label: 'Stores/s', numeric: true }, { key: 'stakes', label: 'Stakes/s', numeric: true }, { key: 'cores', label: 'Cores', numeric: true }],
        rows: (state.ops || []).map(function (n) { return { node: n.node, swaps: fmt(n.swaps_per_second), transfers: fmt(n.transfers_per_second), stores: fmt(n.stores_per_second), stakes: fmt(n.stakes_per_second || 0), cores: String(n.cores) }; }) } },
      sovereign: { block: 'table', props: { caption: LABEL.sovereign, maxHeight: 'compact', empty: state.chainsNote,
        columns: [{ key: 'chain', label: 'Chain' }, { key: 'token', label: 'Token' }, { key: 'credited', label: 'Compute credited', numeric: true }, { key: 'reserve', label: 'Reserve remaining', numeric: true }, { key: 'treasury', label: 'Treasury', numeric: true }, { key: 'top', label: 'Top contributor', numeric: true }],
        rows: (state.chains || []).map(function (c) { return { chain: c.chainId, token: c.tokenSymbol,
          credited: c.computeCredited == null ? 'not reported' : fmt(c.computeCredited) + ' / ' + fmt(c.computeRewardSupply),
          reserve: c.computeReserveRemaining == null ? 'not reported' : fmt(c.computeReserveRemaining),
          treasury: c.treasuryBalance == null ? 'not reported' : fmt(c.treasuryBalance) + ' / ' + fmt(c.distributedSupply),
          top: c.leaderboard == null ? 'not reported' : !c.leaderboard.length ? 'none yet' : c.leaderboard[0].holder.slice(0, 10) + '… · ' + fmt(c.leaderboard[0].amount) }; }) } },
      leaders: { block: 'table', props: { caption: LABEL.leaders, maxHeight: 'compact', empty: state.leadersNote,
        columns: [{ key: 'chain', label: 'Chain' }, { key: 'rank', label: 'Rank', numeric: true }, { key: 'holder', label: 'Holder', mono: true }, { key: 'amount', label: 'Holds', numeric: true }],
        rows: (state.leaders || []).reduce(function (rows, c) {
          if (!c.leaderboard.length) return rows.concat([{ chain: c.chainId + ' · ' + c.tokenSymbol, rank: '—', holder: 'Minted, but no real supporter/provider holds a balance yet.', amount: '—' }]);
          return rows.concat(c.leaderboard.map(function (row, i) { return { chain: c.chainId + ' · ' + c.tokenSymbol, rank: '#' + (i + 1), holder: row.holder.slice(0, 14) + '…', amount: fmt(row.amount) }; }));
        }, []) } },
      capTable: { block: 'table', props: { caption: LABEL.capTable, maxHeight: 'compact', empty: state.capNote,
        columns: [{ key: 'id', label: 'Node' }, { key: 'role', label: 'Role' }, { key: 'up', label: 'Up' }, { key: 'latency', label: 'Latency', numeric: true }, { key: 'peers', label: 'Peers connected', numeric: true }],
        rows: (state.capNodes || []).map(function (n) { return { id: n.id, role: n.role, up: n.reachable ? 'yes' : 'no', latency: Number.isFinite(n.latencyMs) ? fmt(n.latencyMs) + ' ms' : 'no answer', peers: n.reachable ? fmt(n.peerCount) : (n.error || 'no answer') }; }) } }
    };
  }

  /* ---- refresh: a live block patched in place from its spec --------------------------------- */
  /* ArkUI.blocks.update (js/ark/blocks.js, Ark's patchArkBlock): elements whose shape did not
     change keep their identity -- only text and attributes move -- so a CMS edit applied to a
     tile, and every pin, survives each poll; a part whose shape changed (a reading that became
     "No reading") is replaced. This page used to carry its own copy of that morph (W3-STATS). */
  function findBlock(page, spec) {
    var name = spec.block, label = spec.props.label || spec.props.caption;
    var found = null;
    Array.prototype.forEach.call(page.querySelectorAll('[data-ark-block="' + name + '"]'), function (el) {
      if (found) return;
      var own = name === 'table' ? (el.querySelector('caption') || {}).textContent : el.getAttribute('aria-label');
      if (own === label) found = el;
    });
    return found;
  }
  function refresh(page, spec) {
    var el = findBlock(page, spec);
    if (el) ArkUI.blocks.update(el, spec.props, { from: FROM });
  }

  /* ---- the page, as data ---------------------------------------------------------------- */
  /* `was`: the layout key each element had on the old page. HAND are the pins words alone cannot
     choose -- each tile, panel, table and bar list by its place (a tile or panel that became an
     accordion item or a tab panel keys that element alone, `self`); DERIVED is what
     tests/lib/layout-continuity.cjs derived on top of them. Live blocks are rendered once from a
     fresh state, so the numbered refs below always name the same parts; refresh() keeps the pins.
     tests/stats-page.cjs lists every reshaped or retired key with its reason. */
  var P = 'page:/div:1';
  function self(key) { return { key: key, self: true }; }
  var HAND = {
    'stats-hero': { ':root': self(P + '/header:1'), 'hero-meta': self(P + '/header:1/div:2'), 'button#2': P + '/header:1/div:2/button:1',
      ':scope > dl:nth-of-type(1) > div:nth-of-type(1) > dd:nth-of-type(1)': P + '/header:1/div:2/p:1',
      ':scope > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)': P + '/header:1/div:2/p:2' },
    'stats-views': {}
  };
  (function views(V) {
    function tiles(from, keys) { keys.forEach(function (key, i) { V['stat' + (from + i > 1 ? '#' + (from + i) : '')] = self(key); }); }
    function art(base, n) { var out = []; for (var i = 1; i <= n; i++) out.push(base + '/article:' + i); return out; }
    tiles(1, art(P + '/div:2', 9)); tiles(10, art(P + '/div:4', 6)); tiles(16, art(P + '/div:8', 4));
    tiles(20, art(P + '/div:10', 4)); tiles(25, art(P + '/div:13', 4)); tiles(29, art(P + '/div:15', 4));
    for (var i = 1; i <= 19; i++) V['stat-value' + (i > 1 ? '#' + i : '')] = P + (i <= 9 ? '/div:2/article:' + i : i <= 15 ? '/div:4/article:' + (i - 9) : '/div:8/article:' + (i - 15)) + '/p:2';
    V['stat-value#24'] = P + '/div:10/section:2/p:2';
    V['stat-detail#10'] = P + '/div:4/article:1/p:3'; V['stat-detail#16'] = P + '/div:8/article:1/p:3';
    V['accordion-trigger#6'] = P + '/div:9/h2:1';
    V['[data-ark-part="pager-related"] li:first-child'] = P + '/div:18/section:2/ul:1/li:1';
    V['[data-ark-part="pager-related"] li:first-child > a'] = P + '/div:18/section:2/ul:1/li:1/a:1';
    [['tabs-content', '/div:1'], ['tabs-content#2', '/div:3'], ['tabs-content#4', '/section:8'], ['tabs-content#5', '/div:14'], ['tabs-content#6', '/div:16'], ['tabs-content#7', '/div:17'],
     ['accordion-item#2', '/div:2/section:1'], ['accordion-item#3', '/div:2/section:2'], ['accordion-item#4', '/div:7'], ['accordion-item#5', '/div:5'],
     ['accordion-item#6', '/div:9'], ['accordion-item#7', '/div:10/section:1'], ['accordion-item#8', '/div:10/section:2'], ['accordion-item#9', '/section:4'],
     ['accordion-item#10', '/section:5'], ['accordion-item#11', '/section:6'], ['accordion-item#12', '/section:7'], ['accordion-item#16', '/section:10'], ['accordion-item#17', '/section:11'],
     ['accordion#7', '/div:18/section:1/ul:1'], ['meter-list', '/div:2/section:1/ul:1'], ['table-wrap#6', '/div:10/section:1/ol:1'], ['pager', '/div:18/section:2'],
     ['pager-related', '/div:18/section:2/ul:1']].forEach(function (pair) { V[pair[0]] = self(P + pair[1]); });
    [['table-wrap#2', '/div:2/section:2/div:1'], ['table-wrap#3', '/section:3/div:1'], ['table-wrap#4', '/section:1/div:1'], ['table-wrap#5', '/section:2/div:1'],
     ['table-wrap#7', '/section:4/div:1'], ['table-wrap#8', '/section:9/div:1'], ['table-wrap#9', '/section:11/div:1'], ['table-wrap#10', '/section:12/div:1'],
     ['meter-list#2', '/section:5/ol:1'], ['meter-list#3', '/section:6/ol:1'], ['meter-list#4', '/section:7/ol:1'], ['meter-list#5', '/section:8/ol:1'],
     ['meter-list#6', '/section:8/ol:2'], ['meter-list#7', '/section:8/ol:3'], ['meter-list#8', '/section:8/ol:4'], ['facts', '/div:10/section:2/dl:1']].forEach(function (pair) { V[pair[0]] = P + pair[1]; });
    // the sweep's bar names were shortened to fit Ark's 48-character bar label
    for (var b = 1; b <= 4; b++) V['meter-label#' + (15 + b)] = P + '/section:7/ol:1/li:' + b + '/p:1';
    // readiness: each item by its old place, grouped by state now (done 1 2 4 · partial 3 5 6 10 · not yet 7 8 9)
    [1, 2, 4, 3, 5, 6, 10, 7, 8, 9].forEach(function (li, i) {
      V['fact#' + (13 + i)] = self(P + '/div:18/section:1/ul:1/li:' + li);
      V['fact-value#' + (13 + i)] = P + '/div:18/section:1/ul:1/li:' + li + '/div:1/p:1';
    });
  })(HAND['stats-views']);
  HAND.insert = self('page:/div:2');
  var DERIVED = {
    'stats-views': {
      'tabs-trigger': P + '/div:1/h2:1',
      'disclosure-panel': P + '/div:1/p:1',
      ':scope > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': P + '/div:3/h2:1',
      ':scope > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)': P + '/div:3/p:1',
      ':scope > div:nth-of-type(3) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': P + '/div:5/h2:1',
      ':scope > div:nth-of-type(3) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)': P + '/div:5/p:1',
      'cell#4': P + '/section:1/p:1',
      ':scope > div:nth-of-type(3) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(3)': P + '/div:6/h2:1',
      ':scope > div:nth-of-type(3) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(4)': P + '/div:6/p:1',
      'row#8': P + '/section:2/p:1',
      'accordion-trigger#4': P + '/div:7/h2:1',
      ':scope > div:nth-of-type(3) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': P + '/div:7/p:1',
      'cell#3': P + '/section:3/p:1',
      ':scope > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': P + '/div:9/p:1',
      'accordion-trigger#9': P + '/div:11/h2:1',
      ':scope > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': P + '/div:11/p:1',
      ':scope > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)': P + '/section:4/p:1',
      ':scope > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(3)': P + '/section:4/p:2',
      ':scope > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(4)': P + '/section:4/p:3',
      'accordion-trigger#10': P + '/div:12/h2:1',
      ':scope > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(5) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': P + '/div:12/p:1',
      ':scope > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(5) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)': P + '/section:5/p:1',
      ':scope > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(5) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(3)': P + '/section:5/h2:1',
      ':scope > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(5) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(4)': P + '/section:5/p:2',
      'accordion-trigger#11': P + '/section:6/p:1',
      ':scope > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': P + '/section:6/h2:1',
      ':scope > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)': P + '/section:6/p:2',
      'accordion-trigger#12': P + '/section:7/p:1',
      ':scope > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': P + '/section:7/h2:1',
      ':scope > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)': P + '/section:7/p:2',
      ':scope > div:nth-of-type(5) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': P + '/section:8/p:1',
      ':scope > div:nth-of-type(5) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)': P + '/section:8/h2:1',
      'accordion-trigger#13': P + '/section:8/p:2',
      'accordion-trigger#14': P + '/section:8/p:3',
      ':scope > div:nth-of-type(5) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': P + '/section:8/p:4',
      'accordion-trigger#15': P + '/section:8/p:5',
      ':scope > div:nth-of-type(5) > div:nth-of-type(3) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': P + '/section:8/p:6',
      ':scope > div:nth-of-type(5) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(3)': P + '/section:8/p:7',
      ':scope > div:nth-of-type(5) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(4)': P + '/section:8/p:8',
      ':scope > div:nth-of-type(5) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(5)': P + '/section:8/p:9',
      ':scope > div:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': P + '/div:14/h2:1',
      ':scope > div:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)': P + '/div:14/p:1',
      ':scope > div:nth-of-type(6) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': P + '/section:9/p:2',
      ':scope > div:nth-of-type(6) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)': P + '/section:10/p:1',
      'accordion-trigger#17': P + '/section:11/p:1',
      ':scope > div:nth-of-type(6) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': P + '/section:11/h2:1',
      ':scope > div:nth-of-type(6) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)': P + '/section:11/p:2',
      'button': P + '/section:11/a:1',
      ':scope > div:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': P + '/div:16/h2:1',
      ':scope > div:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)': P + '/div:16/p:1',
      ':scope > div:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(3)': P + '/section:12/p:1',
      ':scope > div:nth-of-type(8) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)': P + '/div:17/h2:1',
      ':scope > div:nth-of-type(8) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(3)': P + '/div:17/p:1',
      'stat-label': P + '/div:2/article:1/p:1',
      'stat-detail': P + '/div:2/article:1/p:3',
      'stat-label#2': P + '/div:2/article:2/p:1',
      'stat-detail#2': P + '/div:2/article:2/p:3',
      'stat-label#3': P + '/div:2/article:3/p:1',
      'stat-detail#3': P + '/div:2/article:3/p:3',
      'stat-label#4': P + '/div:2/article:4/p:1',
      'stat-detail#4': P + '/div:2/article:4/p:3',
      'stat-label#5': P + '/div:2/article:5/p:1',
      'stat-detail#5': P + '/div:2/article:5/p:3',
      'stat-label#6': P + '/div:2/article:6/p:1',
      'stat-detail#6': P + '/div:2/article:6/p:3',
      'stat-label#7': P + '/div:2/article:7/p:1',
      'stat-detail#7': P + '/div:2/article:7/p:3',
      'stat-label#8': P + '/div:2/article:8/p:1',
      'stat-detail#8': P + '/div:2/article:8/p:3',
      'stat-label#9': P + '/div:2/article:9/p:1',
      'stat-detail#9': P + '/div:2/article:9/p:3',
      'accordion-trigger#2': P + '/div:2/section:1/p:1',
      'cell': P + '/div:2/section:1/p:2',
      'accordion-trigger#3': P + '/div:2/section:2/p:1',
      'cell#2': P + '/div:2/section:2/p:2',
      'stat-label#10': P + '/div:4/article:1/p:1',
      'stat-label#11': P + '/div:4/article:2/p:1',
      'stat-detail#11': P + '/div:4/article:2/p:3',
      'stat-label#12': P + '/div:4/article:3/p:1',
      'stat-detail#12': P + '/div:4/article:3/p:3',
      'stat-label#13': P + '/div:4/article:4/p:1',
      'stat-detail#13': P + '/div:4/article:4/p:3',
      'stat-label#14': P + '/div:4/article:5/p:1',
      'stat-detail#14': P + '/div:4/article:5/p:3',
      'stat-label#15': P + '/div:4/article:6/p:1',
      'stat-detail#15': P + '/div:4/article:6/p:3',
      ':scope > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(3)': P + '/div:4/section:1/p:1',
      ':scope > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(4)': P + '/div:4/section:1/h2:1',
      ':scope > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(5)': P + '/div:4/section:1/p:2',
      ':scope > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(6)': P + '/div:4/section:1/p:3',
      'stat-label#16': P + '/div:8/article:1/p:1',
      'stat-label#17': P + '/div:8/article:2/p:1',
      'stat-detail#17': P + '/div:8/article:2/p:3',
      'stat-label#18': P + '/div:8/article:3/p:1',
      'stat-detail#18': P + '/div:8/article:3/p:3',
      'stat-label#19': P + '/div:8/article:4/p:1',
      'stat-detail#19': P + '/div:8/article:4/p:3',
      'stat-label#20': P + '/div:10/article:1/p:1',
      'stat-value#20': P + '/div:10/article:1/p:2',
      'stat-detail#20': P + '/div:10/article:1/p:3',
      'stat-label#21': P + '/div:10/article:2/p:1',
      'stat-value#21': P + '/div:10/article:2/p:2',
      'stat-detail#21': P + '/div:10/article:2/p:3',
      'stat-label#22': P + '/div:10/article:3/p:1',
      'stat-value#22': P + '/div:10/article:3/p:2',
      'stat-detail#22': P + '/div:10/article:3/p:3',
      'stat-label#23': P + '/div:10/article:4/p:1',
      'stat-value#23': P + '/div:10/article:4/p:2',
      'stat-detail#23': P + '/div:10/article:4/p:3',
      'accordion-trigger#7': P + '/div:10/section:1/p:1',
      ':scope > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': P + '/div:10/section:1/h2:1',
      ':scope > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)': P + '/div:10/section:1/p:2',
      'accordion-trigger#8': P + '/div:10/section:2/p:1',
      ':scope > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': P + '/div:10/section:2/h2:1',
      ':scope > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)': P + '/div:10/section:2/p:3',
      'stat-label#25': P + '/div:13/article:1/p:1',
      'stat-value#25': P + '/div:13/article:1/p:2',
      'stat-label#26': P + '/div:13/article:2/p:1',
      'stat-value#26': P + '/div:13/article:2/p:2',
      'stat-label#27': P + '/div:13/article:3/p:1',
      'stat-value#27': P + '/div:13/article:3/p:2',
      'stat-label#28': P + '/div:13/article:4/p:1',
      'stat-value#28': P + '/div:13/article:4/p:2',
      'stat-label#29': P + '/div:15/article:1/p:1',
      'stat-value#29': P + '/div:15/article:1/p:2',
      'stat-label#30': P + '/div:15/article:2/p:1',
      'stat-value#30': P + '/div:15/article:2/p:2',
      'stat-label#31': P + '/div:15/article:3/p:1',
      'stat-value#31': P + '/div:15/article:3/p:2',
      'stat-label#32': P + '/div:15/article:4/p:1',
      'stat-value#32': P + '/div:15/article:4/p:2',
      ':scope > div:nth-of-type(8) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': P + '/div:18/section:1/p:1',
      ':scope > div:nth-of-type(7) > div:nth-of-type(3) > div:nth-of-type(1) > nav:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': P + '/div:18/section:2/p:1',
      ':scope > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(1)': P + '/div:10/article:1/p:2/strong:1',
      'stat-unit': P + '/div:10/article:1/p:2/span:1',
      ':scope > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > p:nth-of-type(2) > span:nth-of-type(1)': P + '/div:10/article:2/p:2/strong:1',
      'stat-unit#2': P + '/div:10/article:2/p:2/span:1',
      ':scope > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > p:nth-of-type(2) > span:nth-of-type(1)': P + '/div:10/article:3/p:2/strong:1',
      'stat-unit#3': P + '/div:10/article:3/p:2/span:1',
      ':scope > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(4) > p:nth-of-type(2) > span:nth-of-type(1)': P + '/div:10/article:4/p:2/strong:1',
      'stat-unit#4': P + '/div:10/article:4/p:2/span:1',
      'row#12': P + '/div:10/section:1/ol:1/li:1',
      'row#13': P + '/div:10/section:1/ol:1/li:2',
      'row#14': P + '/div:10/section:1/ol:1/li:3',
      'row#15': P + '/div:10/section:1/ol:1/li:4',
      'row#16': P + '/div:10/section:1/ol:1/li:5',
      'row#17': P + '/div:10/section:1/ol:1/li:6',
      ':scope > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(1)': P + '/div:10/section:2/p:2/strong:1',
      ':scope > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(5) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(1)': P + '/div:13/article:1/p:2/strong:1',
      'stat-unit#6': P + '/div:13/article:1/p:2/span:1',
      ':scope > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(5) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > p:nth-of-type(2) > span:nth-of-type(1)': P + '/div:13/article:2/p:2/strong:1',
      'stat-unit#7': P + '/div:13/article:2/p:2/span:1',
      ':scope > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(5) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > p:nth-of-type(2) > span:nth-of-type(1)': P + '/div:13/article:3/p:2/strong:1',
      'stat-unit#8': P + '/div:13/article:3/p:2/span:1',
      ':scope > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(5) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(4) > p:nth-of-type(2) > span:nth-of-type(1)': P + '/div:13/article:4/p:2/strong:1',
      'stat-unit#9': P + '/div:13/article:4/p:2/span:1',
      'meter-label#2': P + '/section:5/ol:1/li:1/p:1',
      'meter-value#2': P + '/section:5/ol:1/li:1/strong:1',
      'meter-label#3': P + '/section:5/ol:1/li:2/p:1',
      'meter-value#3': P + '/section:5/ol:1/li:2/strong:1',
      'meter-label#4': P + '/section:5/ol:1/li:3/p:1',
      'meter-value#4': P + '/section:5/ol:1/li:3/strong:1',
      'meter-label#5': P + '/section:5/ol:1/li:4/p:1',
      'meter-value#5': P + '/section:5/ol:1/li:4/strong:1',
      'meter-label#6': P + '/section:5/ol:1/li:5/p:1',
      'meter-value#6': P + '/section:5/ol:1/li:5/strong:1',
      'meter-label#7': P + '/section:5/ol:1/li:6/p:1',
      'meter-value#7': P + '/section:5/ol:1/li:6/strong:1',
      'meter-label#8': P + '/section:5/ol:1/li:7/p:1',
      'meter-value#8': P + '/section:5/ol:1/li:7/strong:1',
      'meter-label#9': P + '/section:5/ol:1/li:8/p:1',
      'meter-value#9': P + '/section:5/ol:1/li:8/strong:1',
      'meter-label#10': P + '/section:5/ol:1/li:9/p:1',
      'meter-value#10': P + '/section:5/ol:1/li:9/strong:1',
      'meter-label#11': P + '/section:5/ol:1/li:10/p:1',
      'meter-value#11': P + '/section:5/ol:1/li:10/strong:1',
      'meter-label#12': P + '/section:6/ol:1/li:1/p:1',
      'meter-value#12': P + '/section:6/ol:1/li:1/strong:1',
      'meter-label#13': P + '/section:6/ol:1/li:2/p:1',
      'meter-value#13': P + '/section:6/ol:1/li:2/strong:1',
      'meter-label#14': P + '/section:6/ol:1/li:3/p:1',
      'meter-value#14': P + '/section:6/ol:1/li:3/strong:1',
      'meter-label#15': P + '/section:6/ol:1/li:4/p:1',
      'meter-value#15': P + '/section:6/ol:1/li:4/strong:1',
      'meter-value#16': P + '/section:7/ol:1/li:1/strong:1',
      'meter-value#17': P + '/section:7/ol:1/li:2/strong:1',
      'meter-value#18': P + '/section:7/ol:1/li:3/strong:1',
      'meter-value#19': P + '/section:7/ol:1/li:4/strong:1',
      'meter-label#20': P + '/section:8/ol:1/li:1/p:1',
      'meter-value#20': P + '/section:8/ol:1/li:1/strong:1',
      'meter-label#21': P + '/section:8/ol:1/li:2/p:1',
      'meter-value#21': P + '/section:8/ol:1/li:2/strong:1',
      'meter-label#22': P + '/section:8/ol:1/li:3/p:1',
      'meter-value#22': P + '/section:8/ol:1/li:3/strong:1',
      'meter-label#23': P + '/section:8/ol:1/li:4/p:1',
      'meter-value#23': P + '/section:8/ol:1/li:4/strong:1',
      'meter-label#24': P + '/section:8/ol:1/li:5/p:1',
      'meter-value#24': P + '/section:8/ol:1/li:5/strong:1',
      'meter-label#25': P + '/section:8/ol:1/li:6/p:1',
      'meter-value#25': P + '/section:8/ol:1/li:6/strong:1',
      'meter-label#26': P + '/section:8/ol:2/li:1/p:1',
      'meter-value#26': P + '/section:8/ol:2/li:1/strong:1',
      'meter-label#27': P + '/section:8/ol:2/li:2/p:1',
      'meter-value#27': P + '/section:8/ol:2/li:2/strong:1',
      'meter-label#28': P + '/section:8/ol:2/li:3/p:1',
      'meter-value#28': P + '/section:8/ol:2/li:3/strong:1',
      'meter-label#29': P + '/section:8/ol:2/li:4/p:1',
      'meter-value#29': P + '/section:8/ol:2/li:4/strong:1',
      'meter-label#30': P + '/section:8/ol:3/li:1/p:1',
      'meter-value#30': P + '/section:8/ol:3/li:1/strong:1',
      'meter-label#31': P + '/section:8/ol:3/li:2/p:1',
      'meter-value#31': P + '/section:8/ol:3/li:2/strong:1',
      'meter-label#32': P + '/section:8/ol:3/li:3/p:1',
      'meter-value#32': P + '/section:8/ol:3/li:3/strong:1',
      'meter-label#33': P + '/section:8/ol:3/li:4/p:1',
      'meter-value#33': P + '/section:8/ol:3/li:4/strong:1',
      'meter-label#34': P + '/section:8/ol:4/li:1/p:1',
      'meter-value#34': P + '/section:8/ol:4/li:1/strong:1',
      'meter-label#35': P + '/section:8/ol:4/li:2/p:1',
      'meter-value#35': P + '/section:8/ol:4/li:2/strong:1',
      'meter-label#36': P + '/section:8/ol:4/li:3/p:1',
      'meter-value#36': P + '/section:8/ol:4/li:3/strong:1',
      'meter-label#37': P + '/section:8/ol:4/li:4/p:1',
      'meter-value#37': P + '/section:8/ol:4/li:4/strong:1',
      ':scope > div:nth-of-type(6) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(1)': P + '/div:15/article:1/p:2/strong:1',
      'stat-unit#10': P + '/div:15/article:1/p:2/span:1',
      ':scope > div:nth-of-type(6) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > p:nth-of-type(2) > span:nth-of-type(1)': P + '/div:15/article:2/p:2/strong:1',
      'stat-unit#11': P + '/div:15/article:2/p:2/span:1',
      ':scope > div:nth-of-type(6) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > p:nth-of-type(2) > span:nth-of-type(1)': P + '/div:15/article:3/p:2/strong:1',
      'stat-unit#12': P + '/div:15/article:3/p:2/span:1',
      ':scope > div:nth-of-type(6) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(4) > p:nth-of-type(2) > span:nth-of-type(1)': P + '/div:15/article:4/p:2/strong:1',
      'stat-unit#13': P + '/div:15/article:4/p:2/span:1',
      ':scope > div:nth-of-type(7) > div:nth-of-type(3) > div:nth-of-type(1) > nav:nth-of-type(1) > div:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(2)': P + '/div:18/section:2/ul:1/li:2',
      ':scope > div:nth-of-type(7) > div:nth-of-type(3) > div:nth-of-type(1) > nav:nth-of-type(1) > div:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(3)': P + '/div:18/section:2/ul:1/li:3',
      ':scope > div:nth-of-type(7) > div:nth-of-type(3) > div:nth-of-type(1) > nav:nth-of-type(1) > div:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(4)': P + '/div:18/section:2/ul:1/li:4',
      ':scope > div:nth-of-type(7) > div:nth-of-type(3) > div:nth-of-type(1) > nav:nth-of-type(1) > div:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(5)': P + '/div:18/section:2/ul:1/li:5',
      ':scope > div:nth-of-type(7) > div:nth-of-type(3) > div:nth-of-type(1) > nav:nth-of-type(1) > div:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(6)': P + '/div:18/section:2/ul:1/li:6',
      'cell#8': P + '/div:10/section:1/ol:1/li:1/strong:1',
      'cell#11': P + '/div:10/section:1/ol:1/li:2/strong:1',
      'cell#14': P + '/div:10/section:1/ol:1/li:3/strong:1',
      'cell#17': P + '/div:10/section:1/ol:1/li:4/strong:1',
      'cell#20': P + '/div:10/section:1/ol:1/li:5/strong:1',
      'cell#23': P + '/div:10/section:1/ol:1/li:6/strong:1',
      'cell#7': P + '/div:10/section:1/ol:1/li:1/p:1/span:1',
      'cell#10': P + '/div:10/section:1/ol:1/li:2/p:1/span:1',
      'cell#13': P + '/div:10/section:1/ol:1/li:3/p:1/span:1',
      'cell#16': P + '/div:10/section:1/ol:1/li:4/p:1/span:1',
      'cell#19': P + '/div:10/section:1/ol:1/li:5/p:1/span:1',
      'cell#22': P + '/div:10/section:1/ol:1/li:6/p:1/span:1',
      'fact-term#13': P + '/div:18/section:1/ul:1/li:1/div:1/strong:1',
      'fact-term#14': P + '/div:18/section:1/ul:1/li:2/div:1/strong:1',
      'fact-term#16': P + '/div:18/section:1/ul:1/li:3/div:1/strong:1',
      'fact-term#15': P + '/div:18/section:1/ul:1/li:4/div:1/strong:1',
      'fact-term#17': P + '/div:18/section:1/ul:1/li:5/div:1/strong:1',
      'fact-term#18': P + '/div:18/section:1/ul:1/li:6/div:1/strong:1',
      'fact-term#20': P + '/div:18/section:1/ul:1/li:7/div:1/strong:1',
      'fact-term#21': P + '/div:18/section:1/ul:1/li:8/div:1/strong:1',
      'fact-term#22': P + '/div:18/section:1/ul:1/li:9/div:1/strong:1',
      'fact-term#19': P + '/div:18/section:1/ul:1/li:10/div:1/strong:1'
    },
    'stats-hero': {
      'eyebrow': P + '/header:1/div:1/p:1',
      'hero-lede': P + '/header:1/div:1/p:2'
    }
  };
  var WAS = {};
  Object.keys(HAND).concat(Object.keys(DERIVED)).forEach(function (id) { WAS[id] = id === 'insert' ? HAND.insert : Object.assign({}, DERIVED[id], HAND[id]); });

  function note(text, more) { return { block: 'disclosure', props: { content: text, foldBelow: 'phone', more: more || 'Read the note', less: 'Fold the note' } }; }
  function meterSpec(label, items) { return { block: 'meter', props: { label: label, items: items } }; }

  function spec(S, state) {
    var DS = S.defiShard || {}, OPS = S.operations || {}, CP = S.clientPath || {}, INFRA = S.infraResolvers || {};
    var grammarOnly = (S.grammarOnlyAdmission && S.grammarOnlyAdmission.rate) || null;
    var live = liveBlocks(state);
    var counts = { done: 0, partial: 0, todo: 0 };
    READINESS.forEach(function (r) { counts[r.state] += 1; });
    var FL = OPS.fleet;
    var views = [
      { value: 'live', label: 'Live', blocks: [
        note('Hourly self-bench, fleet-wide. Record admission from flx-bk2 against every [[node]]; swaps, transfers, stores and stakes from each node’s own hardware, summed here.', 'What these live figures are'),
        { block: 'disclosure', props: { foldBelow: 'phone', more: 'The four admission figures', less: 'Fold the figures', blocks: [live.live] } },
        { block: 'accordion', props: { label: 'More live figures, and each node', items: [
          { value: 'throughput', title: 'Swaps, transfers, stores and stakes · fleet-wide', blocks: [live.throughput] },
          { value: 'nodes', title: 'Nodes', blocks: [live.nodes, live.nodeTable] },
          { value: 'ops', title: 'Nodes · swaps, transfers, stores, stakes', blocks: [live.ops] }
        ] } }
      ] },
      { value: 'chain', label: 'Chain', blocks: [
        { block: 'disclosure', props: { preview: 1, more: 'Which chain this is, and what is not available', less: 'Fold it',
          content: 'Chain · dense-wire\n\nnodes.defxn.com’s chain-server, a separate mesh from the ark-miner-cli nodes above — the one future apps (starting with the chat app) write to. Live where the wire protocol allows it; named as not-yet-available where it doesn’t.\n\nNot yet available\n\nNamed, not guessed\n\nSigner liveness (how many of the 10 configured signers are live right now): not available — the wire protocol has no command exposing per-signer vote identity, only the aggregate have/need count above.\n\nSupporters and providers above are distinct live roster identities whose heartbeat has not expired; they are not WebSocket connection counts and are not earning balances.' } },
        { block: 'disclosure', props: { foldBelow: 'phone', more: 'The six chain figures', less: 'Fold the figures', blocks: [live.chain] } },
        { block: 'accordion', props: { label: 'The chain-server mesh', items: [
          { value: 'capacity', title: 'Fleet capacity · chain-server mesh',
            content: 'Every dense-wire chain-server node, probed directly. Signer nodes can sign and propose [[segments|segment]]; peer nodes bootstrap and serve but never sign — a real, live reachability check, not a roster that assumes everything it lists is up.',
            blocks: [live.capacity, live.capTable] },
          { value: 'sovereign', title: 'Sovereign chains · compute credited, and top contributors per chain',
            content: 'Sovereign chains · compute credited\n\nChains launched on top of the base chain above, each with its own 1B-unit native token and its own compute-reward reserve. A number here means a real supporter-witness round trip actually moved real units out of that chain’s reserve. Today the code gives each launch a chain of its own; the planned model keeps launched tokens as assets inside a native chain, and is not built yet.\n\nTop contributors · per chain\n\nReal per-identity holdings, ranked. The project’s own treasury and compute-reserve accounts are excluded server-side so this list is supporters and providers only, never the project itself.',
            blocks: [live.sovereign, live.leaders] }
        ] } }
      ] },
      { value: 'throughput', label: 'Throughput', blocks: [
        /* Each dated run is one row -- what was measured, its headline number, the date -- that
           opens in place onto its method, tiles, tables and bars (docs/ux-audit/pages-ux-b.md
           /stats fix 2). */
        { block: 'accordion', props: { label: 'Measured runs', items: [
          { value: 'resolver', title: 'Measured resolver · ' + (DS.date || '2026-10-10') + ' · ' + fmt(DS.swapsPerSecondResolved) + ' swaps/s resolved',
            content: 'BENCH-012. Two parties sign their intent; a resolver [[shard]] resolves a batch and signs the result — that signature is the truth; [[replicas|replica]] store it without re-verifying. Not live; re-run to update.',
            blocks: [{ block: 'stats', props: { label: 'Measured resolver, BENCH-012', columns: 2, items: [
          { label: 'Swaps resolved / s', value: String(DS.swapsPerSecondResolved), unit: 'swaps/s', detail: (DS.batchesPerSecond || 153.7) + ' [[batch auctions|batch auction]] per second x ' + (DS.swapsPerBatch || 256) + ' swaps per batch, on one resolver shard. Resolution only — never add the broadcast to this.' },
          { label: 'Swaps per batch auction', value: String(DS.swapsPerBatch), unit: 'swaps', detail: 'Every intent in a batch clears at one price, so position inside the batch cannot change what anyone pays. ' + (DS.matchedInternallyPct || 100) + '% matched internally with zero curve slippage.' },
          { label: 'Batch latency', value: String(DS.batchLatencyMs), unit: 'ms', detail: 'Batched signature verification is ' + (DS.verifyLatencyMsBatched || 10.403) + ' ms of it; the shard signing the result — the thing that makes it true — is ' + (DS.signLatencyMs || 0.0403) + ' ms.' },
          { label: 'Bytes per signed result', value: String(DS.signedResultBytes), unit: 'bytes', detail: (DS.signedResultBytesRaw || 580) + ' bytes of dense FLX, ' + (DS.lzma2RunRatio || 3.22) + 'x smaller after LZMA2 across a run. Audit cost: ' + (DS.auditEd25519Verifies || 3) + ' [[Ed25519]] verifications.' }
        ] } }] },
          { value: 'registry', title: 'Resolver families audited · 20 resolvers',
            content: 'What can be made real today\n\nNot built is recorded as not built, never as zero: zero would mean measured and scored nothing. Each unbuilt resolver is a region of intent that cannot be made real yet. Full table and signed audit manifests: docs/resolver-audit.md.',
            blocks: [{ block: 'table', props: { caption: 'Resolver families audited: what can be made real today', maxHeight: 'compact',
              columns: [{ key: 'name', label: 'Resolver' }, { key: 'work', label: 'Signers and work' }, { key: 'state', label: 'State' }],
              rows: [
                ['DeFi-Swap-AMM', '2 signers · batch auction + AMM residual', 'measured'],
                ['Identity-Name-Ownership', '1 signer · store and index ownership', 'measured'],
                ['Device-Enrollment', '1 signer · roster update', 'measured'],
                ['Grammar-Admission-Floor', 'shape only · no signature', 'measured'],
                ['Stake-Position', '1 signer · verifies its own signature', 'measured'],
                ['15 further resolvers', 'lending, governance, vault, search, AI/TLM and more', 'not built']
              ].map(function (r) { return { name: r[0], work: r[1], state: r[2] }; }) } }] },
          { value: 'constraint', title: 'The binding constraint',
            content: 'Broadcast is not pipelined\n\nSerialised, this caps the fleet near 2.2 batches/s no matter how fast the resolver gets. The resolution figures above are resolution-only — never add the broadcast to them. The intended shape is one feed per pool.',
            blocks: [
              { block: 'stat', props: { label: 'Broadcast to 10 replicas', value: String(DS.broadcastLatencyMs || 449), unit: 'ms', detail: 'The time a signed result takes to reach every replica, serialised.' } },
              { block: 'facts', props: { label: 'Resolve against broadcast', columns: 2, items: [
                { term: 'To resolve', value: (DS.batchLatencyMs || 13.874) + ' ms' }, { term: 'To broadcast', value: (DS.broadcastLatencyMs || 449) + ' ms' },
                { term: 'Replicas reached', value: String(DS.peersReached || 10) }, { term: 'Audits passed', value: (DS.auditsPassed || 60) + '/' + (DS.batches || 60) }] } }
            ] },
          { value: 'operations', title: 'Every operation in its own unit · ' + (OPS.date || '2026-10-10'),
            content: ['BENCH-013. Transfers, swaps, staking and replica storage do different amounts of work, so each is measured in its own unit. One headline figure hid which operation was slow.']
              .concat((OPS.notBuilt || []).length ? ['Not built, named rather than reported as zero: ' + OPS.notBuilt.join(', ') + '. Zero would mean measured and scored nothing, which is a different and much stronger claim.'] : [])
              .concat(OPS.verdict ? [OPS.verdict] : [])
              .concat(['No row is multiplied by a node or replica count, and rows are not comparable across units — do not rank them against each other.']).join('\n\n'),
            blocks: [{ block: 'table', props: { caption: 'Every operation in its own unit', maxHeight: 'compact',
              columns: [{ key: 'op', label: 'Operation' }, { key: 'rate', label: 'Rate', numeric: true }, { key: 'unit', label: 'Unit' }, { key: 'note', label: 'What it means' }],
              rows: (OPS.rows || []).map(function (r) { return { op: r.op, rate: fmt(r.rate), unit: r.unit, note: r.note }; }) } }] }
        ].concat(FL && (FL.perNode || []).length ? [
          { value: 'fleet', title: 'The fleet, measured · all ' + FL.nodes + ' nodes at once',
            content: FL.parallelSwapsPerSecond.toLocaleString('en-US') + ' swaps/s across ' + FL.cores + ' cores, against ' + FL.oneShardSwapsPerSecond.toLocaleString('en-US') + ' with one shard per node — a ' + FL.parallelGain + 'x gain from parallelism alone.\n\nPer node · shards set to each node’s core count\n\nCore count does NOT predict the result\n\n' + FL.note,
            blocks: [
              { block: 'stats', props: { label: 'The fleet, measured', columns: 2, items: [
                { label: 'Fleet swaps / s', value: fmt(FL.parallelSwapsPerSecond), unit: 'swaps/s' }, { label: 'Fleet transfers / s', value: fmt(FL.transfersPerSecond), unit: 'transfers/s' },
                { label: 'Fleet stores / s', value: fmt(FL.storesPerSecond), unit: 'results/s' }, { label: 'Per core', value: fmt(FL.swapsPerCore), unit: 'swaps/s' }] } },
              meterSpec('Per node · shards set to each node’s core count', FL.perNode.map(function (n) { return { label: n.node + ' · ' + n.cores + (n.cores === 1 ? ' core' : ' cores'), value: n.swapsPerSecond, display: fmt(n.swapsPerSecond) }; }))
            ] }
        ] : []).concat((OPS.shardScaling || []).length ? [
          { value: 'route', title: 'The route forward · parallel resolver shards',
            content: 'Each point RUN, never multiplied' + (OPS.route ? '\n\n' + OPS.route : ''),
            blocks: [meterSpec('Swaps per second by parallel resolver shards', OPS.shardScaling.map(function (p) { return { label: p.shards + (p.shards === 1 ? ' shard' : ' shards') + ' · ' + p.efficiencyPct + '% of linear', value: p.swapsPerSecond, display: fmt(p.swapsPerSecond) }; }))] }
        ] : []).concat((OPS.batchSizeSweep || []).length ? [
          { value: 'sweep', title: 'Swap batch size · the lever that is not there',
            content: 'A 64x increase in batch size bought 1.3x\n\nVerification stays at 71-77% of a batch at every size, because batched Ed25519 is near-linear in signature count. Parallel shards buy 4.5x instead, measured by running eight of them.',
            blocks: [meterSpec('Swaps per second by batch size', OPS.batchSizeSweep.map(function (p) { return { label: fmt(p.batch) + ' swaps/batch · verification ' + p.verifySharePct + '%', value: p.swapsPerSecond, display: fmt(p.swapsPerSecond) }; }))] }
        ] : []) } }
      ] }
    ];
    if ((CP.byConnections || []).length) {
      var first = CP.byConnections[0].swapsPerSecond;
      var cpItems = [];
      if ((CP.otherAxes || []).length) cpItems.push({ value: 'axes', title: 'Same node, other axes',
        blocks: [meterSpec('Swaps per second on the same node, other axes', CP.otherAxes.map(function (ax) { return { label: ax.label, value: ax.swapsPerSecond, display: fmt(ax.swapsPerSecond) }; }))] });
      if (CP.transfers && (CP.transfers.byConnections || []).length) cpItems.push({ value: 'transfers', title: 'Native-token transfers on the same node', content: CP.transfers.note,
        blocks: [meterSpec('Native-token transfers per second, by connections', CP.transfers.byConnections.map(function (p) { return { label: fmt(p.connections) + (p.connections === 1 ? ' connection' : ' connections'), value: p.perSecond, display: fmt(p.perSecond) }; }))] });
      if (CP.transfers && (CP.transfers.byClientProcesses || []).length) cpItems.push({ value: 'processes', title: 'The same transfers with the client split over several processes (64 connections, after the ledger fix)', content: CP.transfers.processesNote,
        blocks: [meterSpec('Transfers per second, by client processes', CP.transfers.byClientProcesses.map(function (p) { return { label: fmt(p.processes) + (p.processes === 1 ? ' client process' : ' client processes'), value: p.perSecond, display: fmt(p.perSecond) }; }))] });
      views.push({ value: 'client', label: 'Client path', blocks: [
        { block: 'disclosure', props: { preview: 2, more: 'The verdict, and the method', less: 'Fold it',
          content: 'Client path · swaps over the wire, by concurrent connections · ' + (CP.date || '2026-10-15') + '\n\n' + CP.record + ' (' + (CP.build || 'current build') + '). Accepted swaps/s into ONE node. Not the fleet figure above, and not custodied.\n\n' + CP.verdict +
            (CP.previousBuild ? '\n\nPrevious build: ' + CP.previousBuild.note : '') + '\n\nMetric: ' + CP.metric + '. Mode: ' + CP.mode + '. ' + CP.replicationNote + '. Machine: ' + CP.machine + '. ' + CP.caveats } },
        { block: 'disclosure', props: { foldBelow: 'phone', more: 'Swaps by concurrent connections', less: 'Fold the bars', blocks: [
          meterSpec('Swaps per second into one node, by concurrent connections', CP.byConnections.map(function (p) { return { label: fmt(p.connections) + (p.connections === 1 ? ' connection' : ' connections') + ' · ' + Math.round(p.swapsPerSecond / first * 10) / 10 + 'x one connection', value: p.swapsPerSecond, display: fmt(p.swapsPerSecond) }; }))
        ] } },
        { block: 'accordion', props: { label: 'More of the client path', items: cpItems } }
      ] });
    }
    views.push({ value: 'platform', label: 'Platform', blocks: [
      note('Platform & infra resolvers · ' + (INFRA.date || '2026-10-12') + '\n\n' + INFRA.record + ': internal platform systems, not the FLX DeFi chain above — the deployment/preview pipeline, repo storage, and dev tooling, audited and benchmarked with the same discipline (a resolver turns admitted records into a decision; absent is named, never scored as zero).', 'Which systems these are'),
      { block: 'table', props: { caption: 'Resolver audit · six platform systems: does a resolver exist, and if so how fast', maxHeight: 'compact',
        columns: [{ key: 'system', label: 'System' }, { key: 'resolver', label: 'Resolver found?' }, { key: 'rate', label: 'Rate', numeric: true }, { key: 'deployable', label: 'Chain-deployable?' }],
        rows: (INFRA.audit || []).map(function (r) { return { system: r.system, resolver: r.resolver, rate: r.rate, deployable: r.deployable }; }) } },
      { block: 'accordion', props: { label: 'Platform measurements', items: [
        { value: 'dispatch', title: 'Native FXN Compute Rent Resolver dispatch',
          content: 'bundle-deploy, flux-code-host and flx-blockstore have no resolver by design — reported as absent, never averaged in as a zero score.\n\nNative FXN Compute Rent Resolver (CRR) dispatch (manifest routing + signature-verified admission, worker-isolated execution): routing is near-free; real ed25519 verification is the entire cost of the gap between it and the signature-verified path.',
          blocks: [{ block: 'stats', props: { label: 'Compute Rent Resolver dispatch', columns: 2, items: [
            { label: 'Manifest routing', value: '3,230,585', unit: 'decisions/s' }, { label: 'Signature-verified fetch', value: '5,893', unit: 'decisions/s' },
            { label: 'Worker dispatch, sequential', value: '52,265', unit: 'round-trips/s' }, { label: 'Worker dispatch, concurrent', value: '235,043', unit: 'commands/s' }] } }] },
        { value: 'autoswitch', title: 'remote-env access decision · auto-switching verification',
          content: 'Matches fixed-inline at low concurrency, beats fixed-pooled above it\n\n' + (INFRA.note || ''),
          blocks: [
            { block: 'table', props: { caption: 'Access decisions per second by concurrency: fixed inline, fixed pooled, auto-switch', maxHeight: 'compact',
              columns: [{ key: 'c', label: 'Concurrency', numeric: true }, { key: 'inline', label: 'Fixed inline', numeric: true }, { key: 'pooled', label: 'Fixed pooled', numeric: true }, { key: 'auto', label: 'Auto-switch', numeric: true }],
              rows: (INFRA.autoSwitch || []).map(function (r) { return { c: r.concurrency, inline: r.inline, pooled: r.pooled, auto: r.autoSwitch }; }) } },
            { block: 'actions', props: { label: 'The record', items: [{ label: 'Full record · ' + INFRA.record, href: 'doc:docs/evidence/infra-001-platform-resolver-audit.md', tone: 'link' }] } }
          ] }
      ] } }
    ] });
    views.push({ value: 'evidence', label: 'Evidence', blocks: [
      { block: 'disclosure', props: { preview: 2, more: 'How to read the runs', less: 'Fold it', content: 'Benchmark runs\n\nEvery number above, and the other dated runs, with the record that holds its method and raw output.\n\nEach run measures something different. Do not add rows together, and never add the broadcast to the resolution latency.' } },
      { block: 'table', props: { caption: 'Benchmark runs: what each measured, and its record', maxHeight: 'compact',
        columns: [{ key: 'run', label: 'Run' }, { key: 'scope', label: 'Scope' }, { key: 'result', label: 'Result', numeric: true }, { key: 'window', label: 'Window' }, { key: 'errors', label: 'Errors', numeric: true }, { key: 'record', label: 'Record' }],
        rows: RUNS(DS, INFRA, grammarOnly).map(function (r) { return { run: r[0], scope: r[1], result: r[2], window: r[3], errors: r[4], record: r[5] }; }) } },
      { block: 'disclosure', props: { foldBelow: 'phone', more: 'Go deeper: six more pages', less: 'Fold the links', blocks: [
      { block: 'pager', props: { label: 'Go deeper', relatedLabel: 'Go deeper', related: [
        { label: 'Whitepaper: how it works, and every number’s source', href: 'doc:' + WHITEPAPER },
        { label: 'Resolvers · each one’s own measured throughput', href: 'route:resolvers' },
        { label: 'Finance ledger · double-spend by construction', href: 'route:stats/ledger' },
        /* /stats/gpu had no inbound link anywhere and was in no menu or sitemap: unreachable
           (docs/ux-audit/pages.md P2; regression: tests/site-exits.cjs). */
        { label: 'The GPU, and why it is not compute-bound', href: 'route:stats/gpu' },
        { label: 'How we got fast, and what we got wrong', href: 'route:' + ARTICLE_STORY },
        { label: 'Mainnet readiness', href: 'doc:docs/mainnet-readiness.md' }
      ] } }
      ] } },
      { block: 'accordion', props: { label: 'The records', items: [{ value: 'records', title: 'The records behind the runs', blocks: [
      { block: 'facts', props: { label: 'The records behind the runs', columns: 2, items: [
        { term: 'Resolver batch and broadcast', value: 'BENCH-012', href: 'doc:docs/evidence/bench-012-defi-shard-signed-resolution.md' },
        { term: 'Resolver families audited', value: 'Resolver audit', href: 'doc:docs/resolver-audit.md' },
        { term: 'Grammar-only admission', value: 'Whitepaper §3', href: 'doc:' + WHITEPAPER },
        { term: 'Platform resolver audit', value: INFRA.record || 'INFRA-001', href: 'doc:docs/evidence/infra-001-platform-resolver-audit.md' },
        { term: 'DAO treasury claim, local', value: 'BENCH-014', href: 'doc:docs/evidence/bench-014-dao-treasury-multisig-claim.md' },
        { term: 'DAO treasury claim, real WAN', value: 'BENCH-014 · real fleet WAN', href: 'doc:docs/evidence/2026-10-12-treasury-claim-bench-real-fleet-wan.md' },
        { term: 'DAO/treasury devnet dry run', value: 'BENCH-014 · devnet dry run', href: 'doc:docs/evidence/2026-10-12-devnet-dao-treasury-dry-run.md' },
        { term: 'Client-path swaps', value: 'BENCH-015', href: 'doc:docs/evidence/bench-015-client-path-swaps-by-connections.md' }
      ] } }
      ] }] } }
    ] });
    var STATES = [['done', 'Done'], ['partial', 'Partial'], ['todo', 'Not yet']];
    views.push({ value: 'readiness', label: 'Readiness', blocks: [
      { block: 'disclosure', props: { preview: 1, more: 'Where the measurements stop', less: 'Fold it',
        content: counts.done + ' done · ' + counts.partial + ' partial · ' + counts.todo + ' not yet\n\nProduction readiness\n\nWhere the measurements stop. Updated with each new evidence record.' } },
      { block: 'accordion', props: { label: 'Production readiness, by state', multiple: true, items: STATES.map(function (st) {
        var items = READINESS.filter(function (r) { return r.state === st[0]; });
        return { value: st[0], title: st[1] + ' · ' + items.length, blocks: [{ block: 'facts', props: { label: st[1], columns: 1, items: items.map(function (r) {
          return { term: r.title, value: r.badge + ' — ' + r.text };
        }) } }] };
      }) } }
    ] });

    return [
      { block: 'breadcrumb', id: 'stats-crumbs', was: WAS['stats-crumbs'], props: { label: 'Your place', items: [{ label: 'Home', href: 'route:zero' }, { label: 'Mesh performance' }] } },
      /* The answer: is the fleet up, how many nodes, how fast right now, and when that was
         measured. The details are live (paintHero, below) and announced politely as they change
         (`live`); the next step is a fresh check. */
      { block: 'hero', id: 'stats-hero', was: WAS['stats-hero'], props: {
        eyebrow: 'DEFXN · Mesh performance', title: 'Fleet dashboard', density: 'compact', live: true,
        lede: 'Live capacity from the fleet’s hourly self-bench, the audited runs behind every number, and what still stands between this and production.',
        actions: [{ label: 'How every number is measured', href: 'doc:' + WHITEPAPER, tone: 'primary' }, { label: 'Refresh', action: 'refresh', tone: 'secondary' }],
        meta: [
          { label: 'Status', value: 'Checking fleet' },
          { label: 'Nodes online', value: 'No reading' },
          { label: 'Swaps per second', value: 'No reading' },
          { label: 'Last pulse', value: 'Waiting for the first pulse' }
        ] } },
      { block: 'tabs', id: 'stats-views', was: WAS['stats-views'], props: { label: 'Dashboard views', items: views } },
      { insert: 'main', was: WAS.insert }
    ];
  }

  /* The dated runs and the record behind each (the Evidence tab). */
  function RUNS(DS, INFRA, grammarOnly) {
    return [
      ['Resolver batch', '256 signed intents, one shard', (DS.swapsPerBatch || 256) + ' swaps/batch', (DS.batchLatencyMs || 13.874) + ' ms', '0', 'BENCH-012'],
      ['Signed-result broadcast', (DS.peersReached || 10) + ' replicas, store only', fmt(DS.replicationCostBytes || 1801) + ' bytes/batch', 'not pipelined', '0', 'BENCH-012'],
      ['Resolver families audited', '20 resolvers audited', '6 measured, 14 not built', 'audit', '—', 'Resolver audit'],
      ['Grammar-only admission', 'one Mac core', grammarOnly == null ? 'not recorded' : fmt(grammarOnly) + ' ops/s', 'bench', '—', 'Whitepaper §3'],
      ['Platform resolver audit', '6 non-chain systems', '3 measured, 3 absent by design', 'audit', '—', INFRA.record || 'INFRA-001'],
      ['DAO treasury claim (durable)', 'local, 2 real replicas', '1174-1357 claims/s', '3 runs', '0', 'BENCH-014'],
      ['DAO treasury claim (accepted)', 'local, replication off critical path', '2882-3017 claims/s', '3 runs', '0', 'BENCH-014'],
      ['DAO treasury claim (durable, real WAN)', '2 real fleet nodes, 2-of-2 signer threshold', '17 claims/s', '2 runs', '0', 'BENCH-014'],
      ['DAO treasury claim (accepted, real WAN)', '2 real fleet nodes, replication off critical path', '~1003 claims/s', '1 run', '0', 'BENCH-014'],
      ['DAO/treasury devnet dry run', 'full wire sequence, real standalone chain-server', '17/17 steps passed', '1 run', '0', 'BENCH-014'],
      ['Client-path swaps (unbacked)', 'one node, 1-1,000 connections, chain-position build, pre-signed, loopback, store replica requirement 0', '4,400 swaps/s at 1 connection, ~31,000 at 1,000', '5 timed reps per point; 3 runs at 256 and 1,000', '0', 'BENCH-015']
    ];
  }

  ArkUI.pageModules.stats = {
    spec: spec,
    mount: function (host) {
      var S = window.ArkStatsHighlights || {};
      var state = freshState();
      var page = ArkUI.page(spec(S, state), host, { page: 'stats', className: 'stats-page', titleId: 'stats-title',
        actions: { refresh: function () { clearTimeout(pollTimer); pollTimer = 0; check(); } } });
      var meta = Array.prototype.slice.call(page.querySelectorAll('#stats-hero [data-ark-part="hero-meta"] dd'));
      var refreshButton = page.querySelector('#stats-hero button[data-action="refresh"]');
      function setMeta(i, text) { if (meta[i] && meta[i].textContent !== text) meta[i].textContent = text; }
      function redraw(names) { var blocks = liveBlocks(state); names.forEach(function (name) { refresh(page, blocks[name]); }); }

      // ---- chain pulse wiring (separate endpoint, own short poll loop) --------------------------
      var chainPollTimer = 0, chainDisposed = false, chainInFlight = false;
      /* A feed this page could not read: every tile it feeds has no reading -- never 0, never a
         dash -- the lead tile carrying the whole refusal (failure, missing, remedy) and the rest
         its failure line. */
      function unavailableTiles(group, keys, refusal) {
        keys.forEach(function (key, i) {
          state[group][key] = { absent: i ? { kind: 'unavailable', reason: refusal.failure }
            : { kind: 'unavailable', reason: refusal.failure + '. Missing: ' + refusal.missing + '.', remedy: refusal.remedy } };
        });
      }
      var NO_VALUE = 'no live value; nothing substituted', NO_ROSTER = 'no live roster value; nothing substituted';
      function paintChain(data) {
        var keys = CHAIN_TILES.map(function (t) { return t[0]; });
        if (data.unavailable) {
          unavailableTiles('chain', keys, data.unavailable);
          paintSovereignChains(null, data.unavailable);
          redraw(['chain']);
          return;
        }
        var c = state.chain;
        if (!data.reachable) {
          c.status = reading('no', '', data.lastError || 'chain-server unreachable');
          c.peers = waiting(NO_VALUE); c.seg = waiting(NO_VALUE); c.lines = waiting(NO_VALUE);
          c.supporters = waiting(NO_ROSTER); c.providers = waiting(NO_ROSTER);
          paintSovereignChains(null);
          redraw(['chain']);
          return;
        }
        c.status = reading('yes', '', '');
        // Real-time WebSocket connections to the one node nodes.defxn.com resolves to -- rises the
        // instant an app opens a connection, falls the instant it closes. Not a chain record and
        // not a fleet-wide sum -- see ops/chain-pulse-api.mjs's header for both reasons.
        c.peers = data.peerCount != null ? reading(fmt(data.peerCount), 'of ' + fmt(data.peerCountMax), 'live on ' + (data.peerCountNode || 'the node nodes.defxn.com resolves to') + ' — rises/falls as apps open and close, right now') : waiting(NO_VALUE);
        if (data.segment) {
          c.seg = reading(data.segment.have + '/' + data.segment.need, 'have/need', 'root ' + data.segment.root.slice(0, 10) + '… · seq ' + data.segment.seq);
          c.lines = reading(fmt(data.segment.linesCount), 'lines', 'in the currently pending segment');
        } else {
          c.seg = reading('idle', 'have/need', 'real, measured state: nothing pending to sign right now, not a probe failure');
          c.lines = reading('0', 'lines', 'nothing pending');
        }
        c.supporters = data.supporterCount != null ? reading(fmt(data.supporterCount), 'live', 'heartbeat-scoped identities on ' + (data.rosterChainId || 'defxn')) : waiting('ROSTER_STATUS is not deployed or unreachable; nothing substituted');
        c.providers = data.providerCount != null ? reading(fmt(data.providerCount), 'live', 'voting-role roster identities; separate from signer liveness') : waiting('ROSTER_STATUS is not deployed or unreachable; nothing substituted');
        paintSovereignChains(data.sovereignChains);
        redraw(['chain']);
      }
      function paintSovereignChains(chains, refusal) {
        if (chains == null) {
          // With no pulse at all, CHAIN_LIST was never asked: say the pulse failed, not the node.
          var why = refusal ? refusal.text : 'CHAIN_LIST is not deployed on this node, or it is unreachable — no live value substituted.';
          state.chains = []; state.chainsNote = why; state.leaders = []; state.leadersNote = why;
        } else if (!chains.length) {
          state.chains = []; state.chainsNote = 'Zero sovereign chains launched on this node right now — a real, measured zero, not a missing capability.';
          state.leaders = []; state.leadersNote = 'Zero sovereign chains launched on this node right now — nothing to rank.';
        } else {
          state.chains = chains;
          // The full ranking per chain, same CHAIN_LEADERBOARD read; custody accounts are excluded
          // server-side, so this is real supporters and providers, never the project's own balances.
          state.leaders = chains.filter(function (c) { return c.leaderboard != null; });
          state.leadersNote = 'No chain on this node has a readable leaderboard right now — CHAIN_LEADERBOARD unreachable or not deployed.';
        }
        redraw(['sovereign', 'leaders']);
      }
      function checkChain() {
        if (chainDisposed || chainInFlight) return;
        if (!window.ArkChainPulse) { paintChain({ unavailable: feedUnavailable(CHAIN_PULSE_FEED, { notLoaded: true }) }); return; }
        chainInFlight = true;
        window.ArkChainPulse.get().then(function (result) {
          if (!chainDisposed) paintChain(result.data);
        }).catch(function (e) {
          if (!chainDisposed) paintChain({ unavailable: feedUnavailable(CHAIN_PULSE_FEED, e) });
        }).then(function () {
          chainInFlight = false;
          if (!chainDisposed) chainPollTimer = setTimeout(checkChain, POLL_MS);
        });
      }

      // ---- fleet capacity wiring (separate endpoint, own short poll loop) ------------------------
      var capacityPollTimer = 0, capacityDisposed = false, capacityInFlight = false;
      function paintCapacity(data) {
        var keys = CAPACITY_TILES.map(function (t) { return t[0]; });
        if (!data || !Array.isArray(data.nodes)) {
          var refusal = (data && data.unavailable) || feedUnavailable(FLEET_CAPACITY_FEED, { message: 'no node list in the response' });
          unavailableTiles('capacity', keys, refusal);
          state.capNodes = []; state.capNote = refusal.text;
          redraw(['capacity', 'capTable']);
          return;
        }
        // The live fleet-capacity wire fields below (ops/chain-fleet-capacity-api.mjs,
        // deployed on flx-bk2/flx-mk2) still carry their original names;
        // renaming them needs a coordinated server redeploy, out of scope here.
        var s = data.summary || {}, cap = state.capacity;
        cap.signers = reading(fmt(s.committeeUp), 'of ' + fmt(s.committeeTotal), 'signer-eligible nodes, probed directly by IP right now'); // ALLOW-DEPRECATED-TERM: live wire field
        cap.floor = reading(s.committeeHasQuorum ? 'yes' : 'no', 'needed: ' + fmt(s.committeeQuorum), s.committeeHasQuorum ? 'enough signer nodes up to certify a segment' : 'below the 6-of-10 certification floor right now'); // ALLOW-DEPRECATED-TERM: live wire field
        cap.peers = reading(fmt(s.peersUp), 'of ' + fmt(s.peersTotal), 'bootstrap-only — never sign or propose');
        cap.probe = data.generatedAt ? reading(ago(Date.now() - new Date(data.generatedAt).getTime()), '', data.generatedAt) : waiting('the probe carries no time');
        state.capNodes = data.nodes;
        redraw(['capacity', 'capTable']);
      }
      function checkCapacity() {
        if (capacityDisposed || capacityInFlight) return;
        if (!window.ArkChainFleetCapacity) { paintCapacity({ unavailable: feedUnavailable(FLEET_CAPACITY_FEED, { notLoaded: true }) }); return; }
        capacityInFlight = true;
        window.ArkChainFleetCapacity.get().then(function (result) {
          if (!capacityDisposed) paintCapacity(result.data);
        }).catch(function (e) {
          if (!capacityDisposed) paintCapacity({ unavailable: feedUnavailable(FLEET_CAPACITY_FEED, e) });
        }).then(function () {
          capacityInFlight = false;
          if (!capacityDisposed) capacityPollTimer = setTimeout(checkCapacity, POLL_MS);
        });
      }

      // ---- live wiring --------------------------------------------------------------------------
      var lastPulse = null, nextAt = 0, pollTimer = 0, clockTimer = 0, disposed = false, inFlight = false;
      var status = { pill: 'Checking fleet', updated: 'Waiting for the first pulse', next: '' };
      function paintHero() {
        var live = state.live;
        setMeta(0, status.pill);
        setMeta(1, live.nodes.absent ? 'No reading' : live.nodes.value + ' nodes');
        setMeta(2, live.swaps.absent ? 'No reading' : live.swaps.value + ' swaps/s');
        setMeta(3, status.updated + (status.next ? ' · ' + status.next : ''));
      }
      function paintAge() {
        if (lastPulse) status.updated = 'Measured ' + ago(Date.now() - lastPulse.measured_at_ms) + ' · ' + new Date(lastPulse.measured_at_ms).toLocaleTimeString();
        if (nextAt) {
          var s = Math.max(0, Math.round((nextAt - Date.now()) / 1000));
          status.next = document.hidden ? 'Paused while this tab is hidden' : 'Next check in ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
        } else if (document.hidden) status.next = 'Paused while this tab is hidden';
        paintHero();
      }
      function paint(data) {
        lastPulse = data;
        var up = data.nodes.filter(function (n) { return !n.error && n.qps > 0; }).length;
        var count = data.nodes.length;
        var stale = Date.now() - data.measured_at_ms > STALE_MS;
        var healthy = up === count && !data.errors && !stale;
        status.pill = healthy ? 'All systems normal' : stale ? 'Pulse is stale' : up < count ? (count - up) + ' of ' + count + ' nodes down' : 'Errors in last bench';
        var L = state.live;
        L.nodes = reading(up + '/' + count, 'nodes', up === count ? 'every node in the roster answered' : (count - up) + ' did not answer');
        L.rate = reading(fmt(data.aggregate_qps), 'records/s', 'genesis + receive admission, all nodes in parallel, ' + fmt(data.longest_ms) + ' ms wall clock — not a swap or store bench; see the tiles below');
        L.ops = reading(fmt(data.total_entries), 'ops', 'synthetic writes in the last self-bench');
        L.errors = reading(fmt(data.errors), '', data.errors ? 'see the nodes below' : 'zero refusals');
        var ops = data.operations;
        if (ops) {
          var partial = ops.nodes_reporting < ops.nodes_total;
          var reportingNote = partial
            ? ops.nodes_reporting + ' of ' + ops.nodes_total + ' nodes reporting — the rest have not completed their first hourly self-bench yet, so this is a real PARTIAL sum, not a full fleet total'
            : 'all ' + ops.nodes_total + ' nodes reporting, measured on each node’s own hardware';
          L.swaps = reading(fmt(ops.parallel_swaps_per_second), 'swaps/s', reportingNote);
          L.transfers = reading(fmt(ops.transfers_per_second), 'transfers/s', reportingNote);
          L.stores = reading(fmt(ops.stores_per_second), 'results/s', reportingNote);
          L.stakes = reading(fmt(ops.stakes_per_second), 'stakes/s', reportingNote);
          L.perCore = reading(fmt(ops.swaps_per_core), 'swaps/s', ops.cores + ' cores total — derived from the fleet swap total, never typed separately');
          state.ops = ops.per_node && ops.per_node.length ? ops.per_node.slice().sort(function (a, b) { return (b.swaps_per_second || 0) - (a.swaps_per_second || 0); }) : [];
          state.opsNote = 'Not reporting yet — no live value substituted.';
        } else {
          ['swaps', 'transfers', 'stores', 'stakes', 'perCore'].forEach(function (k) { L[k] = waiting('not reporting yet — no live value substituted'); });
          state.ops = []; state.opsNote = 'Not reporting yet — no live value substituted.';
        }
        state.nodes = data.nodes.slice().sort(function (a, b) { return (b.qps || 0) - (a.qps || 0); });
        redraw(['live', 'throughput', 'nodes', 'nodeTable', 'ops']);
        paintAge();
      }
      function paintOffline(message) {
        status.pill = 'Pulse unreachable';
        if (!lastPulse) {
          status.updated = 'No pulse received yet';
          LIVE_TILES.forEach(function (t) { state.live[t[0]] = waiting(NO_VALUE); });
          state.nodes = []; state.nodeNote = 'The fleet pulse could not be reached (' + message + '). The dated evidence records further down still stand; no live number has been put in their place.';
          state.ops = []; state.opsNote = 'The fleet pulse could not be reached (' + message + ').';
          redraw(['live', 'throughput', 'nodes', 'nodeTable', 'ops']);
        } else {
          status.updated = 'Last good pulse ' + ago(Date.now() - lastPulse.measured_at_ms) + ' · latest check failed';
        }
        paintHero();
      }
      /* The 1 s clock runs only while the page is visible (it used to keep ticking in a hidden tab;
         docs/ux-audit/pages-ux-b.md /stats P2). */
      function startClock() { if (!clockTimer && !document.hidden && !disposed) clockTimer = setInterval(paintAge, 1000); }
      function stopClock() { clearInterval(clockTimer); clockTimer = 0; }
      function schedule() {
        clearTimeout(pollTimer); pollTimer = 0;
        if (disposed || document.hidden) { nextAt = 0; paintAge(); return; }
        nextAt = Date.now() + POLL_MS;
        pollTimer = setTimeout(check, POLL_MS);
      }
      function check() {
        if (disposed || inFlight) return;
        if (!window.ArkPulse) { paintOffline('pulse client not loaded'); return; }
        inFlight = true;
        if (refreshButton) refreshButton.disabled = true;
        if (!lastPulse) { status.pill = 'Checking fleet'; paintHero(); }
        ArkPulse.get().then(function (result) {
          if (!disposed) paint(result.data);
        }).catch(function (e) {
          if (!disposed) paintOffline(e && e.message ? e.message : 'unknown error');
        }).then(function () {
          inFlight = false; if (refreshButton) refreshButton.disabled = false;
          schedule();
        });
      }
      function onVisibility() {
        if (document.hidden) { stopClock(); paintAge(); return; }
        startClock();
        if (!pollTimer) check(); else paintAge();
      }

      document.addEventListener('visibilitychange', onVisibility);
      startClock();
      checkChain();
      checkCapacity();
      check();

      page.arkDispose = function () {
        disposed = true;
        chainDisposed = true;
        capacityDisposed = true;
        clearTimeout(pollTimer); stopClock(); clearTimeout(chainPollTimer); clearTimeout(capacityPollTimer);
        document.removeEventListener('visibilitychange', onVisibility);
      };
      return page;
    }
  };
})();

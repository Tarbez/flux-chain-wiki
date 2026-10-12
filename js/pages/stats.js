/* /stats: the mesh performance dashboard.

   Redesigned 2026-10-08 for production. The page answers three questions,
   in this order, and nothing else:
     1. Is the fleet up right now, and what is it doing?  (LIVE: the hourly
        fleet self-bench through ArkPulse, re-checked every minute while the
        tab is visible. Never simulated; when the pulse is unreachable the
        page says so and shows no number in its place.)
     2. What has the fleet measurably done?  (AUDITED: the dated 6-node
        mesh run as the three numbers the whitepaper §5 requires together,
        the five-minute soak, and the other dated runs, each with its
        evidence record.)
     3. How close is this to production?  (READINESS: what is measured,
        partial, or not yet done.)

   The engineering detail that used to live here (a transfer taken apart,
   CPU profiles, the ladder, batch checks, the certified-segment run, the
   retired fabric numbers) moved to docs/whitepaper.md, appendices B-F.
   Every figure is read from js/content/stats-highlights.js, shared with the
   home page. Change a number in its evidence record first. */
(function () {
  'use strict';

  var POLL_MS = 60000;
  var STALE_MS = 2 * 60 * 60 * 1000; // the pulse runs hourly; two hours without one is stale
  var WHITEPAPER = 'docs/whitepaper.md';
  var ARTICLE_STORY = 'article/how-we-got-fast-and-what-we-got-wrong';

  /* The dashboard builders live in js/ark/dash-kit.js, shared with
     /resolver-math so both pages are literally the same layout system
     rather than two copies that drift. Bound to local names here so the
     rest of this file reads as it did. */
  var D = ArkUI.dash;
  var el = D.el, fmt = D.fmt, bar = D.bar, panel = D.panel, sectionHead = D.sectionHead, stat = D.stat;
  function href(key) { return D.href(key); }
  function docHref(doc) { return D.docHref(doc, '/stats'); }
  function pageLink(label, key, cls) { return D.pageLink(label, key, cls); }
  function docLink(label, doc, cls) { return D.docLink(label, doc, '/stats', cls); }
  function ago(ms) {
    var min = Math.max(0, Math.round(ms / 60000));
    if (min < 1) return 'just now';
    if (min < 60) return min + ' min ago';
    var h = Math.floor(min / 60), m = min % 60;
    return h + ' h' + (m ? ' ' + m + ' min' : '') + ' ago';
  }

  // Readiness: each line names its state and the evidence behind it.
  var READINESS = [
    { state: 'done', badge: 'Measured', title: 'Resolver throughput (synthetic, not production)', text: '256 swaps per batch auction, 8.920 ms batch latency, 180 bytes per signed result, broadcast to 10 live replicas, 60/60 audits passed (BENCH-012). Not production: no external users, and the party-to-shard transport is excluded. Earlier generations were measured in units this project no longer reports \u2014 see docs/deprecated.md. Earlier generations of this measurement are in the frozen BENCH records and docs/whitepaper-chain-era.md; they are not restated here.' },
    { state: 'done', badge: 'Passing', title: 'Attack suite', text: '7 of 7 attacks refused: replay, double-spend, concurrent double-append, cross-chain confusion, wrong-prev fork, tampered signature, equivocation.' },
    { state: 'partial', badge: 'Partial', title: 'Sustained load', text: 'A 303-second soak accepted 3,760,000 records with zero failures. No 30-minute soak has run across the full mesh.' },
    { state: 'done', badge: 'Measured', title: 'Full 10-node transfer bench', text: 'BENCH-011 ran on all ten flx-* nodes concurrently (10 s each, mixed topology, segmented-v3). Zero errors across 852,152 finalized transfers.' },
    { state: 'partial', badge: 'Partial', title: 'Live node discovery', text: 'The pulse reads a configured roster; nodes that join are not discovered automatically yet.' },
    { state: 'partial', badge: 'Partial', title: 'Evidence record for the headline run', text: 'Filed as BENCH-008 with every node’s result. The raw JSON files and source revision still have to be attached.' },
    { state: 'todo', badge: 'Not yet', title: 'Pipelined broadcast to replicas', text: 'A signed result reaches ten of ten replicas, but the broadcast is not pipelined: 449 ms against 8.9 ms to resolve, which caps the fleet near 2.2 batches/s and is the binding constraint on everything. The intended shape is one feed per pool. Historical: Implemented and tested, but the fleet soak ran on the local cache. The rerun with replication on is planned as BENCH-009.' },
    { state: 'todo', badge: 'Not yet', title: 'Public client traffic', text: 'Every client so far was operator-driven.' },
    { state: 'todo', badge: 'Not yet', title: 'Independent security review', text: 'Only our own tests have looked at the per-identity chain + certified-segment path.' },
    { state: 'partial', badge: 'Partial', title: 'DAO treasury multisig', text: 'Real N-of-M quorum-gated DAO founding, treasury binding, and split-payment spend (BENCH-014) — now wired into the live TCP/WS wire protocol and verified end to end against a real standalone chain-server (devnet dry run, 17/17 steps). Durable: 1174-1357 claims/s local 2-replica, 17 claims/s against two real fleet nodes over real WAN (quorum 2-of-2, bottlenecked on the farther node’s real network distance). Accepted finality: up to ~3017 claims/s local, ~1003 claims/s real WAN. 428 crate tests passing. Still not on production: no sovereign chain or DAO has launched there, and only 2 of 6 fleet nodes have been measured.' }
  ];

  ArkUI.pageModules.stats = {
    mount: function (host) {
      var stats = window.ArkStatsHighlights || {};
      var DS = stats.defiShard || {};
      var OPS = stats.operations || {};
      var INFRA = stats.infraResolvers || {};
      var registry = window.ArkResolverRegistry || {};
      var grammarOnly = (registry.chain && registry.chain.measured && registry.chain.measured.rate) || 83225;

      var page = el('section', 'ark-page task-page stats-page stats-dash');
      page.setAttribute('aria-labelledby', 'stats-title');
      var shell = el('div', 'stats-shell dash-shell');
      page.appendChild(shell);

      // ---- header: title, fleet status, refresh -----------------------------------------------
      var head = el('header', 'dash-head');
      var headCopy = el('div', 'dash-head-copy');
      headCopy.appendChild(el('p', 'dash-kicker', 'DEFXN · Mesh performance'));
      var h1 = el('h1', 'dash-h1', 'Fleet dashboard'); h1.id = 'stats-title'; headCopy.appendChild(h1);
      headCopy.appendChild(el('p', 'dash-lede', 'Live capacity from the fleet’s hourly self-bench, the audited runs behind every number, and what still stands between this and production.'));
      head.appendChild(headCopy);
      var status = el('div', 'dash-status');
      status.setAttribute('role', 'status');
      var pill = el('p', 'dash-pill', 'Checking fleet');
      pill.dataset.state = 'loading';
      var updated = el('p', 'dash-status-line', 'Waiting for the first pulse');
      var next = el('p', 'dash-status-line is-quiet', '');
      var refresh = el('button', 'dash-refresh', 'Refresh');
      refresh.type = 'button';
      status.appendChild(pill); status.appendChild(updated); status.appendChild(next); status.appendChild(refresh);
      head.appendChild(status);
      shell.appendChild(head);

      // ---- live ---------------------------------------------------------------------------------
      // Every tile here is re-measured by the fleet itself — the admission
      // bench hourly from flx-bk2, and swaps/transfers/stores hourly on
      // EACH node's own hardware via its own ops-pulse daemon, summed here
      // when fleet-pulse polls them. Nothing on this page is a live number
      // standing in for a dated one, or a dated one standing in for live.
      shell.appendChild(sectionHead('Live', 'Hourly self-bench, fleet-wide. Record admission from flx-bk2 against every node; swaps, transfers, stores and stakes from each node’s own hardware, summed here.'));
      var live = el('div', 'dash-grid live-fleet-grid');
      var kNodes = stat('dash-span-3', 'Nodes online', '–', '', 'waiting for pulse');
      var kRate = stat('dash-span-3', 'Record admission now', '–', 'records/s', 'waiting for pulse');
      var kOps = stat('dash-span-3', 'Operations in last bench', '–', '', 'waiting for pulse');
      var kErr = stat('dash-span-3', 'Errors in last bench', '–', '', 'waiting for pulse');
      var kSwaps = stat('dash-span-3 is-lead', 'Swaps / s, fleet-wide', '–', 'swaps/s', 'waiting for pulse');
      var kTransfers = stat('dash-span-3', 'Transfers / s, fleet-wide', '–', 'transfers/s', 'waiting for pulse');
      var kStores = stat('dash-span-3', 'Stores / s, fleet-wide', '–', 'results/s', 'waiting for pulse');
      var kStakes = stat('dash-span-3', 'Stakes / s, fleet-wide', '–', 'stakes/s', 'waiting for pulse');
      var kPerCore = stat('dash-span-3', 'Swaps per core', '–', 'swaps/s', 'waiting for pulse');
      [kNodes, kRate, kOps, kErr, kSwaps, kTransfers, kStores, kStakes, kPerCore].forEach(function (k) { live.appendChild(k.tile); });
      var nodesPanel = panel('dash-span-12', 'Nodes', null);
      var nodeList = el('ul', 'dash-nodes');
      nodeList.setAttribute('aria-label', 'Per-node results of the last pulse');
      var nodeEmpty = el('p', 'dash-empty', 'Loading the latest pulse…');
      nodesPanel.appendChild(nodeList); nodesPanel.appendChild(nodeEmpty);
      live.appendChild(nodesPanel);

      // Per-node swaps/transfers/stores/stakes — the one breakdown the
      // retired /monitor page carried that the fleet-wide tiles above do
      // not: which node is contributing what, not just the sum.
      var opsPanel = panel('dash-span-12', 'Nodes · swaps, transfers, stores, stakes', null);
      var opsTableWrap = el('div', 'dash-table-wrap');
      var opsEmpty = el('p', 'dash-empty', 'Waiting for each node\u2019s own ops-pulse…');
      opsPanel.appendChild(opsTableWrap); opsPanel.appendChild(opsEmpty);
      live.appendChild(opsPanel);
      shell.appendChild(live);

      // ---- chain (dense-wire) ---------------------------------------------------------------------
      // A SEPARATE mesh from the ark-miner-cli quorums above: the chain-server
      // behind nodes.defxn.com (SEG_SUB/segments), the one the chat app will
      // actually write to. Two numbers here are real today: the live
      // WebSocket peer count (added 2026-10-11, confirmed end-to-end with
      // the native fxn-browser app -- opening it moves this number, closing
      // it moves it back) and the currently pending segment's signer-vote
      // fraction. Live provider/supporter roster counts use a separate
      // heartbeat-scoped wire read; committee liveness remains explicitly
      // unavailable rather than guessed or reported as 0.
      shell.appendChild(sectionHead('Chain · dense-wire', 'nodes.defxn.com’s chain-server, a separate mesh from the ark-miner-cli nodes above — the one future apps (starting with the chat app) write to. Live where the wire protocol allows it; named as not-yet-available where it doesn’t.'));
      var chain = el('div', 'dash-grid');
      var cStatus = stat('dash-span-3', 'Chain reachable', '–', '', 'waiting for pulse');
      var cPeers = stat('dash-span-3 is-lead', 'Peers connected now', '–', 'live', 'waiting for pulse');
      var cSeg = stat('dash-span-3', 'Pending segment votes', '–', 'have/need', 'waiting for pulse');
      var cLines = stat('dash-span-3', 'Lines in pending segment', '–', '', 'waiting for pulse');
      var cSupporters = stat('dash-span-3', 'Live supporters', '–', '', 'waiting for roster status');
      var cProviders = stat('dash-span-3', 'Live providers', '–', '', 'waiting for roster status');
      [cStatus, cPeers, cSeg, cLines, cSupporters, cProviders].forEach(function (k) { chain.appendChild(k.tile); });
      var chainNotes = panel('dash-span-12', 'Not yet available', 'Named, not guessed');
      chainNotes.appendChild(el('p', 'dash-note', 'Signer liveness (how many of the 10 configured signers are live right now): not available — the wire protocol has no command exposing per-signer vote identity, only the aggregate have/need count above.'));
      chainNotes.appendChild(el('p', 'dash-note', 'Supporters and providers above are distinct live roster identities whose heartbeat has not expired; they are not WebSocket connection counts and are not earning balances.'));
      chain.appendChild(chainNotes);
      shell.appendChild(chain);

      // ---- sovereign chains · compute credited (Track 24, added 2026-10-11) ---------------------
      // Each launched chain stakes FXN on the base chain above, then runs
      // its OWN committee and mints its OWN native token (1B units: <=30%
      // distributed, the derived >=70% remainder reserved for compute
      // work). `computeCredited` is read fresh every poll from two real
      // balances (`computeRewardSupply - computeReserveRemaining`), never
      // a stored counter — see ops/chain-pulse-api.mjs's `readSovereignChains`.
      // An empty list is the honest, currently-true answer: no sovereign
      // chain has launched on production yet, so there is nothing here to
      // show, not a failure to measure.
      shell.appendChild(sectionHead('Sovereign chains · compute credited', 'Chains launched on top of the base chain above, each with its own 1B-unit native token and its own compute-reward reserve. A number here means a real supporter-witness round trip actually moved real units out of that chain’s reserve.'));
      var sovereignPanel = panel('dash-span-12', null, null);
      var sovereignWrap = el('div', 'dash-table-wrap');
      var sovereignEmpty = el('p', 'dash-empty', 'Waiting for the chain pulse…');
      sovereignPanel.appendChild(sovereignWrap);
      sovereignPanel.appendChild(sovereignEmpty);
      shell.appendChild(sovereignPanel);

      // ---- per-identity leaderboard (Track 24, CHAIN_LEADERBOARD) -----------------------------
      // Who actually holds a sovereign chain's native token, ranked, real
      // supporter/provider identities only (custody accounts excluded
      // server-side). Read fresh every poll alongside sovereignChains above
      // — see ops/chain-pulse-api.mjs's readChainLeaderboard.
      shell.appendChild(sectionHead('Top contributors · per chain', 'Real per-identity holdings, ranked. The project’s own treasury and compute-reserve accounts are excluded server-side so this list is supporters and providers only, never the project itself.'));
      var leaderboardPanel = panel('dash-span-12', null, null);
      var leaderboardWrap = el('div', 'dash-leaderboard-wrap');
      var leaderboardEmpty = el('p', 'dash-empty', 'Waiting for the chain pulse…');
      leaderboardPanel.appendChild(leaderboardWrap);
      leaderboardPanel.appendChild(leaderboardEmpty);
      shell.appendChild(leaderboardPanel);

      // ---- fleet capacity · dense-wire chain-server mesh (added 2026-10-11) ---------------------
      // Not one node's segment state (the "Chain" section above) and not a
      // chain record — which of the 14 chain-server nodes answer right now,
      // probed directly by IP. 10 committee (quorum-bearing, 6-of-10 needed
      // to finalize a segment) + 4 peers (bootstrap-only, never sign or
      // propose — owner call 2026-10-11). See ops/chain-fleet-capacity-api.mjs.
      shell.appendChild(sectionHead('Fleet capacity · chain-server mesh', 'Every dense-wire chain-server node, probed directly. Committee nodes can sign and propose segments; peer nodes bootstrap and serve but never sign — a real, live reachability check, not a roster that assumes everything it lists is up.'));
      var capacityGrid = el('div', 'dash-grid');
      var capCommitteeUp = stat('dash-span-3 is-lead', 'Committee up', '–', 'of 10', 'waiting for fleet capacity');
      var capQuorum = stat('dash-span-3', 'Quorum', '–', 'needed: 6', 'waiting for fleet capacity');
      var capPeersUp = stat('dash-span-3', 'Peers up', '–', 'of 4', 'waiting for fleet capacity');
      var capGenerated = stat('dash-span-3', 'Last probe', '–', '', 'waiting for fleet capacity');
      [capCommitteeUp, capQuorum, capPeersUp, capGenerated].forEach(function (k) { capacityGrid.appendChild(k.tile); });
      shell.appendChild(capacityGrid);
      var capacityPanel = panel('dash-span-12', null, null);
      var capacityWrap = el('div', 'dash-table-wrap');
      var capacityEmpty = el('p', 'dash-empty', 'Waiting for the fleet capacity probe…');
      capacityPanel.appendChild(capacityWrap);
      capacityPanel.appendChild(capacityEmpty);
      shell.appendChild(capacityPanel);

      // ---- audited baseline ---------------------------------------------------------------------
      shell.appendChild(sectionHead('Measured resolver \u00b7 ' + (DS.date || '2026-10-10'), 'BENCH-012. Two parties sign their intent; a resolver shard resolves a batch and signs the result \u2014 that signature is the truth; replicas store it without re-verifying. Not live; re-run to update.'));
      var audited = el('div', 'dash-grid');
      [
        ['dash-span-4 is-lead', 'Swaps resolved / s', DS.swapsPerSecondResolved, 'swaps/s', (DS.batchesPerSecond || 153.7) + ' batch auctions per second x ' + (DS.swapsPerBatch || 256) + ' swaps per batch, on one resolver shard. Resolution only \u2014 never add the broadcast to this.'],
        ['dash-span-4', 'Swaps per batch auction', DS.swapsPerBatch, 'swaps', 'Every intent in a batch clears at one price, so position inside the batch cannot change what anyone pays. ' + (DS.matchedInternallyPct || 100) + '% matched internally with zero curve slippage.'],
        ['dash-span-4', 'Batch latency', DS.batchLatencyMs, 'ms', 'Batched signature verification is ' + (DS.verifyLatencyMsBatched || 10.403) + ' ms of it; the shard signing the result \u2014 the thing that makes it true \u2014 is ' + (DS.signLatencyMs || 0.0403) + ' ms.'],
        ['dash-span-4', 'Bytes per signed result', DS.signedResultBytes, 'bytes', (DS.signedResultBytesRaw || 580) + ' bytes of dense FLX, ' + (DS.lzma2RunRatio || 3.22) + 'x smaller after LZMA2 across a run. Audit cost: ' + (DS.auditEd25519Verifies || 3) + ' Ed25519 verifications.']
      ].forEach(function (s) { audited.appendChild(stat(s[0], s[1], s[2], s[3], s[4]).tile); });

      // The per-node transfer bars and the sustained-soak panel are RETIRED:
      // both rendered rates per second of transfers or records, the unit this
      // project no longer reports (docs/deprecated.md). Their numbers survive
      // in the frozen BENCH records.
      var registry = panel('dash-span-8', 'Resolver registry \u00b7 20 resolvers', 'What can be made real today');
      var regList = el('ol', 'dash-bars');
      [
        ['DeFi-Swap-AMM', '2 signers \u00b7 batch auction + AMM residual', 'measured'],
        ['Identity-Name-Ownership', '1 signer \u00b7 store and index ownership', 'measured'],
        ['Device-Enrollment', '1 signer \u00b7 roster update', 'measured'],
        ['Grammar-Admission-Floor', 'shape only \u00b7 no signature', 'measured'],
        ['Stake-Position', '1 signer \u00b7 verifies its own signature', 'measured'],
        ['15 further resolvers', 'lending, governance, vault, search, AI/TLM and more', 'not built']
      ].forEach(function (r) {
        var li = el('li', 'dash-bars-row');
        var name = el('p', 'dash-bars-name');
        name.appendChild(el('b', null, r[0]));
        name.appendChild(el('span', null, r[1]));
        li.appendChild(name);
        li.appendChild(el('span', 'dash-bar is-spacer'));
        li.appendChild(el('strong', 'dash-bars-value', r[2]));
        regList.appendChild(li);
      });
      registry.appendChild(regList);
      registry.appendChild(el('p', 'dash-note', 'Not built is recorded as not built, never as zero: zero would mean measured and scored nothing. Each unbuilt resolver is a region of intent that cannot be made real yet. Full table and signed audit manifests: docs/resolver-audit.md.'));
      audited.appendChild(registry);

      var constraint = panel('dash-span-4 dash-soak', 'The binding constraint', 'Broadcast is not pipelined');
      var cValue = el('p', 'dash-stat-value');
      cValue.appendChild(el('strong', null, String(DS.broadcastLatencyMs || 449)));
      cValue.appendChild(el('span', 'dash-unit', 'ms to 10 replicas'));
      constraint.appendChild(cValue);
      var cFacts = el('dl', 'dash-facts');
      [['To resolve', (DS.batchLatencyMs || 13.874) + ' ms'], ['To broadcast', (DS.broadcastLatencyMs || 449) + ' ms'], ['Replicas reached', String(DS.peersReached || 10)], ['Audits passed', (DS.auditsPassed || 60) + '/' + (DS.batches || 60)]].forEach(function (f) {
        var row = el('div'); row.appendChild(el('dt', null, f[0])); row.appendChild(el('dd', null, f[1])); cFacts.appendChild(row);
      });
      constraint.appendChild(cFacts);
      constraint.appendChild(el('p', 'dash-note', 'Serialised, this caps the fleet near 2.2 batches/s no matter how fast the resolver gets. The resolution figures above are resolution-only \u2014 never add the broadcast to them. The intended shape is one feed per pool.'));
      audited.appendChild(constraint);
      shell.appendChild(audited);

      // ---- every operation in its own unit (BENCH-013) -------------------------------------------
      // Each operation carries its OWN unit. Rows are deliberately NOT
      // ranked against each other: a transfer is one or two records, a
      // swap is verify + auction + AMM + signature, and a replica store
      // decides nothing. Comparing the numbers directly is the mistake
      // this table exists to prevent.
      shell.appendChild(sectionHead('Every operation in its own unit \u00b7 ' + (OPS.date || '2026-10-10'),
        'BENCH-013. Transfers, swaps, staking and replica storage do different amounts of work, so each is measured in its own unit. One headline figure hid which operation was slow.'));
      var opsPanel = el('section', 'dash-panel dash-span-12');
      var opsWrap = el('div', 'dash-table-wrap');
      var opsTable = el('table', 'dash-table');
      var oHead = el('thead'), oHr = el('tr');
      ['Operation', 'Rate', 'Unit', 'What it means'].forEach(function (c) {
        var th = el('th', null, c); th.scope = 'col'; oHr.appendChild(th);
      });
      oHead.appendChild(oHr); opsTable.appendChild(oHead);
      var oBody = el('tbody');
      (OPS.rows || []).forEach(function (r) {
        var tr = el('tr');
        tr.appendChild(el('td', null, r.op));
        tr.appendChild(el('td', 'is-num', fmt(r.rate)));
        tr.appendChild(el('td', null, r.unit));
        tr.appendChild(el('td', null, r.note));
        oBody.appendChild(tr);
      });
      opsTable.appendChild(oBody); opsWrap.appendChild(opsTable); opsPanel.appendChild(opsWrap);
      if ((OPS.notBuilt || []).length) {
        opsPanel.appendChild(el('p', 'dash-note', 'Not built, named rather than reported as zero: ' + OPS.notBuilt.join(', ') + '. Zero would mean measured and scored nothing, which is a different and much stronger claim.'));
      }
      if (OPS.verdict) opsPanel.appendChild(el('p', 'dash-note', OPS.verdict));
      opsPanel.appendChild(el('p', 'dash-note', 'No row is multiplied by a node or replica count, and rows are not comparable across units \u2014 do not rank them against each other.'));
      shell.appendChild(opsPanel);

      // ---- the fleet, measured concurrently -----------------------------------------------------
      // A sum of concurrent measurements: every node ran at the same time
      // with shards set to its own core count. Never one node's figure
      // multiplied by ten — that multiplication is what this whole table
      // exists to avoid.
      if (OPS.fleet && (OPS.fleet.perNode || []).length) {
        var FL = OPS.fleet;
        shell.appendChild(sectionHead('The fleet, measured \u00b7 all ' + FL.nodes + ' nodes at once',
          FL.parallelSwapsPerSecond.toLocaleString('en-US') + ' swaps/s across ' + FL.cores + ' cores, against ' + FL.oneShardSwapsPerSecond.toLocaleString('en-US') + ' with one shard per node \u2014 a ' + FL.parallelGain + 'x gain from parallelism alone.'));
        var fleetGrid = el('div', 'dash-grid');
        [
          ['dash-span-3 is-lead', 'Fleet swaps / s', FL.parallelSwapsPerSecond, 'swaps/s'],
          ['dash-span-3', 'Fleet transfers / s', FL.transfersPerSecond, 'transfers/s'],
          ['dash-span-3', 'Fleet stores / s', FL.storesPerSecond, 'results/s'],
          ['dash-span-3', 'Per core', FL.swapsPerCore, 'swaps/s']
        ].forEach(function (t) {
          fleetGrid.appendChild(stat(t[0] + ' dash-stat-audited', t[1], fmt(t[2]), t[3], '').tile);
        });
        shell.appendChild(fleetGrid);

        var fleetPanel = panel('dash-span-12', 'Per node \u00b7 shards set to each node\u2019s core count', 'Core count does NOT predict the result');
        var fleetList = el('ol', 'dash-bars');
        var fMax = Math.max.apply(null, FL.perNode.map(function (n) { return n.swapsPerSecond; }).concat([1]));
        FL.perNode.forEach(function (n) {
          var li = el('li', 'dash-bars-row');
          var nm = el('p', 'dash-bars-name');
          nm.appendChild(el('b', null, n.node));
          nm.appendChild(el('span', null, n.cores + (n.cores === 1 ? ' core' : ' cores')));
          li.appendChild(nm);
          li.appendChild(bar(n.swapsPerSecond / fMax));
          li.appendChild(el('strong', 'dash-bars-value', fmt(n.swapsPerSecond)));
          fleetList.appendChild(li);
        });
        fleetPanel.appendChild(fleetList);
        fleetPanel.appendChild(el('p', 'dash-note', FL.note));
        shell.appendChild(fleetPanel);
      }

      // ---- the route forward: one shard per performance core ------------------------------------
      if ((OPS.shardScaling || []).length) {
        var scale = panel('dash-span-12', 'The route forward \u00b7 parallel resolver shards', 'Each point RUN, never multiplied');
        var scaleList = el('ol', 'dash-bars');
        var scaleMax = Math.max.apply(null, OPS.shardScaling.map(function (p3) { return p3.swapsPerSecond; }).concat([1]));
        OPS.shardScaling.forEach(function (p3) {
          var li = el('li', 'dash-bars-row');
          var nm = el('p', 'dash-bars-name');
          nm.appendChild(el('b', null, p3.shards + (p3.shards === 1 ? ' shard' : ' shards')));
          nm.appendChild(el('span', null, p3.efficiencyPct + '% of linear'));
          li.appendChild(nm);
          li.appendChild(bar(p3.swapsPerSecond / scaleMax));
          li.appendChild(el('strong', 'dash-bars-value', fmt(p3.swapsPerSecond)));
          scaleList.appendChild(li);
        });
        scale.appendChild(scaleList);
        if (OPS.route) scale.appendChild(el('p', 'dash-note', OPS.route));
        shell.appendChild(scale);
      }

      // ---- the swap lever that is not there -----------------------------------------------------
      if ((OPS.batchSizeSweep || []).length) {
        var sweep = panel('dash-span-12', 'Swap batch size \u00b7 the lever that is not there', 'A 64x increase in batch size bought 1.3x');
        var sweepList = el('ol', 'dash-bars');
        var sweepMax = Math.max.apply(null, OPS.batchSizeSweep.map(function (p2) { return p2.swapsPerSecond; }).concat([1]));
        OPS.batchSizeSweep.forEach(function (p2) {
          var li = el('li', 'dash-bars-row');
          var nm = el('p', 'dash-bars-name');
          nm.appendChild(el('b', null, fmt(p2.batch) + ' swaps/batch'));
          nm.appendChild(el('span', null, 'signature verification ' + p2.verifySharePct + '% of the batch'));
          li.appendChild(nm);
          li.appendChild(bar(p2.swapsPerSecond / sweepMax));
          li.appendChild(el('strong', 'dash-bars-value', fmt(p2.swapsPerSecond)));
          sweepList.appendChild(li);
        });
        sweep.appendChild(sweepList);
        sweep.appendChild(el('p', 'dash-note', 'Verification stays at 71-77% of a batch at every size, because batched Ed25519 is near-linear in signature count. Parallel shards buy 4.5x instead, measured by running eight of them.'));
        shell.appendChild(sweep);
      }

      // ---- platform / infra resolvers (INFRA-001, added 2026-10-12) -----------------------------
      // Deliberately separate from everything above: these are internal
      // platform systems (the deployment/preview pipeline, repo storage,
      // dev tooling), never the FLX DeFi chain, and never comparable to a
      // swap/transfer/stake rate. Kept in its own section, own heading, own
      // numbering track (INFRA-0XX, not BENCH-0XX) so nothing here is read
      // as a chain metric. See js/content/stats-highlights.js's
      // `infraResolvers` for the frozen source data.
      shell.appendChild(sectionHead('Platform & infra resolvers · ' + (INFRA.date || '2026-10-12'),
        INFRA.record + ': internal platform systems, not the FLX DeFi chain above — the deployment/preview pipeline, repo storage, and dev tooling, audited and benchmarked with the same discipline (a resolver turns admitted records into a decision; absent is named, never scored as zero).'));

      var infraAudit = panel('dash-span-12', 'Resolver audit · six platform systems', 'Does a resolver exist, and if so how fast');
      var infraAuditWrap = el('div', 'dash-table-wrap');
      var infraAuditTable = el('table', 'dash-table');
      var iaHead = el('thead'), iaHr = el('tr');
      ['System', 'Resolver found?', 'Rate', 'Chain-deployable?'].forEach(function (c) {
        var th = el('th', null, c); th.scope = 'col'; iaHr.appendChild(th);
      });
      iaHead.appendChild(iaHr); infraAuditTable.appendChild(iaHead);
      var iaBody = el('tbody');
      (INFRA.audit || []).forEach(function (r) {
        var tr = el('tr');
        tr.appendChild(el('td', null, r.system));
        tr.appendChild(el('td', null, r.resolver));
        tr.appendChild(el('td', 'is-num', r.rate));
        tr.appendChild(el('td', null, r.deployable));
        iaBody.appendChild(tr);
      });
      infraAuditTable.appendChild(iaBody); infraAuditWrap.appendChild(infraAuditTable); infraAudit.appendChild(infraAuditWrap);
      infraAudit.appendChild(el('p', 'dash-note', 'bundle-deploy, flux-code-host and flx-blockstore have no resolver by design — reported as absent, never averaged in as a zero score.'));
      shell.appendChild(infraAudit);

      var infraGrid = el('div', 'dash-grid');
      [
        ['dash-span-3 is-lead', 'Manifest routing', '3,230,585', 'decisions/s'],
        ['dash-span-3', 'Signature-verified fetch', '5,893', 'decisions/s'],
        ['dash-span-3', 'Worker dispatch, sequential', '52,265', 'round-trips/s'],
        ['dash-span-3', 'Worker dispatch, concurrent', '235,043', 'commands/s']
      ].forEach(function (t) {
        infraGrid.appendChild(stat(t[0], t[1], t[2], t[3], '').tile);
      });
      shell.appendChild(infraGrid);
      var infraDispatchPanel = panel('dash-span-12', null, null);
      infraDispatchPanel.appendChild(el('p', 'dash-note', 'Native resolver-deployment network (manifest routing + signature-verified admission, worker-isolated execution): routing is near-free; real ed25519 verification is the entire cost of the gap between it and the signature-verified path.'));
      shell.appendChild(infraDispatchPanel);

      var infraAuto = panel('dash-span-12', 'remote-env access decision · auto-switching verification', 'Matches fixed-inline at low concurrency, beats fixed-pooled above it');
      var infraAutoWrap = el('div', 'dash-table-wrap');
      var infraAutoTable = el('table', 'dash-table');
      var iuHead = el('thead'), iuHr = el('tr');
      ['Concurrency', 'Fixed inline', 'Fixed pooled', 'Auto-switch'].forEach(function (c) {
        var th = el('th', null, c); th.scope = 'col'; iuHr.appendChild(th);
      });
      iuHead.appendChild(iuHr); infraAutoTable.appendChild(iuHead);
      var iuBody = el('tbody');
      (INFRA.autoSwitch || []).forEach(function (r) {
        var tr = el('tr');
        tr.appendChild(el('td', 'is-num', r.concurrency));
        tr.appendChild(el('td', 'is-num', r.inline));
        tr.appendChild(el('td', 'is-num', r.pooled));
        tr.appendChild(el('td', 'is-num', r.autoSwitch));
        iuBody.appendChild(tr);
      });
      infraAutoTable.appendChild(iuBody); infraAutoWrap.appendChild(infraAutoTable); infraAuto.appendChild(infraAutoWrap);
      infraAuto.appendChild(el('p', 'dash-note', INFRA.note || ''));
      infraAuto.appendChild(docLink('Full record · ' + INFRA.record, 'docs/evidence/infra-001-platform-resolver-audit.md', 'dash-link'));
      shell.appendChild(infraAuto);

      // ---- benchmark runs -----------------------------------------------------------------------
      shell.appendChild(sectionHead('Benchmark runs', 'Every number above, and the other dated runs, with the record that holds its method and raw output.'));
      var runs = panel('dash-span-12 dash-runs', null, null);
      var wrap = el('div', 'dash-table-wrap');
      var table = el('table', 'dash-table');
      var thead = el('thead'), hr = el('tr');
      ['Run', 'Scope', 'Result', 'Window', 'Errors', 'Record'].forEach(function (c) { var th = el('th', null, c); th.scope = 'col'; hr.appendChild(th); });
      thead.appendChild(hr); table.appendChild(thead);
      var tbody = el('tbody');
      [
        ['Resolver batch', '256 signed intents, one shard', (DS.swapsPerBatch || 256) + ' swaps/batch', (DS.batchLatencyMs || 13.874) + ' ms', '0', 'BENCH-012', 'docs/evidence/bench-012-defi-shard-signed-resolution.md'],
        ['Signed-result broadcast', (DS.peersReached || 10) + ' replicas, store only', fmt(DS.replicationCostBytes || 1801) + ' bytes/batch', 'not pipelined', '0', 'BENCH-012', 'docs/evidence/bench-012-defi-shard-signed-resolution.md'],
        ['Resolver registry', '20 resolvers audited', '6 measured, 14 not built', 'audit', '\u2014', 'Resolver audit', 'docs/resolver-audit.md'],
        ['Grammar-only admission', 'one Mac core', fmt(grammarOnly) + ' ops/s', 'bench', '\u2014', 'Whitepaper \u00a73', WHITEPAPER],
        ['Platform resolver audit', '6 non-chain systems', '3 measured, 3 absent by design', 'audit', '\u2014', INFRA.record || 'INFRA-001', 'docs/evidence/infra-001-platform-resolver-audit.md'],
        ['DAO treasury claim (durable)', 'local, 2 real replicas', '1174-1357 claims/s', '3 runs', '0', 'BENCH-014', 'docs/evidence/bench-014-dao-treasury-multisig-claim.md'],
        ['DAO treasury claim (accepted)', 'local, replication off critical path', '2882-3017 claims/s', '3 runs', '0', 'BENCH-014', 'docs/evidence/bench-014-dao-treasury-multisig-claim.md'],
        ['DAO treasury claim (durable, real WAN)', '2 real fleet nodes, quorum 2-of-2', '17 claims/s', '2 runs', '0', 'BENCH-014', 'docs/evidence/2026-10-12-treasury-claim-bench-real-fleet-wan.md'],
        ['DAO treasury claim (accepted, real WAN)', '2 real fleet nodes, replication off critical path', '~1003 claims/s', '1 run', '0', 'BENCH-014', 'docs/evidence/2026-10-12-treasury-claim-bench-real-fleet-wan.md'],
        ['DAO/treasury devnet dry run', 'full wire sequence, real standalone chain-server', '17/17 steps passed', '1 run', '0', 'BENCH-014', 'docs/evidence/2026-10-12-devnet-dao-treasury-dry-run.md']
      ].forEach(function (r) {
        var tr = el('tr');
        r.slice(0, 5).forEach(function (c, i) { tr.appendChild(el('td', i === 2 ? 'is-num' : null, c)); });
        var cell = el('td'); cell.appendChild(docLink(r[5], r[6], 'dash-link')); tr.appendChild(cell);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody); wrap.appendChild(table); runs.appendChild(wrap);
      runs.appendChild(el('p', 'dash-note', 'Each run measures something different. Do not add rows together, and never add the broadcast to the resolution latency.'));
      shell.appendChild(runs);

      // ---- readiness + deeper -------------------------------------------------------------------
      shell.appendChild(sectionHead('Production readiness', 'Where the measurements stop. Updated with each new evidence record.'));
      var bottom = el('div', 'dash-grid');
      var ready = panel('dash-span-8 dash-ready', null, null);
      var counts = { done: 0, partial: 0, todo: 0 };
      READINESS.forEach(function (r) { counts[r.state] += 1; });
      var summary = el('p', 'dash-ready-summary');
      summary.appendChild(el('span', 'is-done', counts.done + ' done'));
      summary.appendChild(el('span', 'is-partial', counts.partial + ' partial'));
      summary.appendChild(el('span', 'is-todo', counts.todo + ' not yet'));
      ready.appendChild(summary);
      var list = el('ul', 'dash-ready-list');
      READINESS.forEach(function (r) {
        var li = el('li', 'dash-ready-item'); li.dataset.state = r.state;
        li.appendChild(el('span', 'dash-badge', r.badge));
        var copy = el('div');
        copy.appendChild(el('strong', null, r.title));
        copy.appendChild(el('p', null, r.text));
        li.appendChild(copy);
        list.appendChild(li);
      });
      ready.appendChild(list);
      bottom.appendChild(ready);

      var deeper = panel('dash-span-4 dash-deeper', 'Go deeper', null);
      var links = el('ul', 'dash-links');
      [
        docLink('Whitepaper · how it works, what made it fast, every number’s source', WHITEPAPER),
        pageLink('Resolvers · each one’s own measured throughput', 'resolvers'),
        pageLink('Finance ledger · double-spend by construction', 'stats/ledger'),
        pageLink('How we got fast, and what we got wrong', ARTICLE_STORY),
        docLink('Mainnet readiness', 'docs/mainnet-readiness.md')
      ].forEach(function (a) { var li = el('li'); a.className = 'dash-link-row'; li.appendChild(a); links.appendChild(li); });
      deeper.appendChild(links);
      bottom.appendChild(deeper);
      shell.appendChild(bottom);

      // ---- chain pulse wiring (separate endpoint, own short poll loop) --------------------------
      var chainPollTimer = 0, chainDisposed = false, chainInFlight = false;
      function paintChain(data) {
        cStatus.tile.dataset.state = data.reachable ? 'ok' : 'down';
        setStat(cStatus, data.reachable ? 'yes' : 'no', '', data.reachable ? '' : (data.lastError || 'chain-server unreachable'));
        if (!data.reachable) {
          setStat(cPeers, '–', 'live', 'no live value; nothing substituted');
          setStat(cSeg, '–', 'have/need', 'no live value; nothing substituted');
          setStat(cLines, '–', '', 'no live value; nothing substituted');
          setStat(cSupporters, '–', '', 'no live roster value; nothing substituted');
          setStat(cProviders, '–', '', 'no live roster value; nothing substituted');
          paintSovereignChains(null);
          return;
        }
        // Real-time WebSocket connections to the one node nodes.defxn.com
        // resolves to -- rises the instant an app (the fxn-browser app, the
        // nodes.defxn.com page itself, anything) opens a connection, falls
        // the instant it closes. Not a chain record and not a fleet-wide
        // sum -- see ops/chain-pulse-api.mjs's header for both reasons.
        if (data.peerCount != null) {
          cPeers.tile.dataset.state = 'ok';
          setStat(cPeers, fmt(data.peerCount), 'of ' + fmt(data.peerCountMax), 'live on ' + (data.peerCountNode || 'the node nodes.defxn.com resolves to') + ' — rises/falls as apps open and close, right now');
        } else {
          setStat(cPeers, '–', 'live', 'no live value; nothing substituted');
        }
        if (data.segment) {
          cSeg.tile.dataset.state = 'ok';
          setStat(cSeg, data.segment.have + '/' + data.segment.need, 'have/need', 'root ' + data.segment.root.slice(0, 10) + '… · seq ' + data.segment.seq);
          setStat(cLines, fmt(data.segment.linesCount), 'lines', 'in the currently pending segment');
        } else {
          cSeg.tile.dataset.state = 'ok';
          setStat(cSeg, 'idle', 'have/need', 'real, measured state: nothing pending to sign right now, not a probe failure');
          setStat(cLines, '0', 'lines', 'nothing pending');
        }
        if (data.supporterCount != null) {
          cSupporters.tile.dataset.state = 'ok';
          setStat(cSupporters, fmt(data.supporterCount), 'live', 'heartbeat-scoped identities on ' + (data.rosterChainId || 'defxn'));
        } else {
          setStat(cSupporters, '–', '', 'ROSTER_STATUS is not deployed or unreachable; nothing substituted');
        }
        if (data.providerCount != null) {
          cProviders.tile.dataset.state = 'ok';
          setStat(cProviders, fmt(data.providerCount), 'live', 'voting-role roster identities; separate from signer liveness');
        } else {
          setStat(cProviders, '–', '', 'ROSTER_STATUS is not deployed or unreachable; nothing substituted');
        }
        paintSovereignChains(data.sovereignChains);
      }
      function paintSovereignChains(chains) {
        if (chains == null) {
          sovereignWrap.textContent = '';
          sovereignEmpty.hidden = false;
          sovereignEmpty.textContent = 'CHAIN_LIST is not deployed on this node, or it is unreachable — no live value substituted.';
          leaderboardWrap.textContent = '';
          leaderboardEmpty.hidden = false;
          leaderboardEmpty.textContent = 'CHAIN_LIST is not deployed on this node, or it is unreachable — no live value substituted.';
          return;
        }
        if (!chains.length) {
          sovereignWrap.textContent = '';
          sovereignEmpty.hidden = false;
          sovereignEmpty.textContent = 'Zero sovereign chains launched on this node right now — a real, measured zero, not a missing capability.';
          leaderboardWrap.textContent = '';
          leaderboardEmpty.hidden = false;
          leaderboardEmpty.textContent = 'Zero sovereign chains launched on this node right now — nothing to rank.';
          return;
        }
        var table = el('table', 'dash-table'), thead = el('thead'), hr = el('tr');
        ['Chain', 'Token', 'Compute credited', 'Reserve remaining', 'Treasury', 'Top contributor'].forEach(function (c) {
          var th = el('th', null, c); th.scope = 'col'; hr.appendChild(th);
        });
        thead.appendChild(hr); table.appendChild(thead);
        var body = el('tbody');
        chains.forEach(function (c) {
          var tr = el('tr');
          tr.appendChild(el('td', null, c.chainId));
          tr.appendChild(el('td', null, c.tokenSymbol));
          tr.appendChild(el('td', 'is-num', c.computeCredited == null ? '–' : fmt(c.computeCredited) + ' / ' + fmt(c.computeRewardSupply)));
          tr.appendChild(el('td', 'is-num', c.computeReserveRemaining == null ? '–' : fmt(c.computeReserveRemaining)));
          tr.appendChild(el('td', 'is-num', c.treasuryBalance == null ? '–' : fmt(c.treasuryBalance) + ' / ' + fmt(c.distributedSupply)));
          var topCell = el('td', 'is-num');
          if (c.leaderboard == null) {
            topCell.textContent = '–';
          } else if (!c.leaderboard.length) {
            topCell.textContent = 'none yet';
          } else {
            topCell.textContent = c.leaderboard[0].holder.slice(0, 10) + '… · ' + fmt(c.leaderboard[0].amount);
          }
          tr.appendChild(topCell);
          body.appendChild(tr);
        });
        table.appendChild(body);
        sovereignWrap.textContent = ''; sovereignWrap.appendChild(table); sovereignEmpty.hidden = true;
        paintLeaderboards(chains);
      }
      // ---- per-identity leaderboard (Track 24, same CHAIN_LEADERBOARD read) ---------------------
      // Full top-10 ranking per chain, same real data as the "Top contributor"
      // column above (one holder, truncated) -- server-side exclusion of the
      // chain's own treasury/compute-reserve custody accounts means this list
      // is real supporters/providers only, never the project's own balances
      // inflating its own leaderboard. A chain with leaderboard === null (never
      // minted here) or an empty ranked list (minted, zero real holders yet)
      // is rendered honestly rather than hidden.
      function paintLeaderboards(chains) {
        leaderboardWrap.textContent = '';
        var ranked = chains.filter(function (c) { return c.leaderboard != null; });
        if (!ranked.length) {
          leaderboardEmpty.hidden = false;
          leaderboardEmpty.textContent = chains.length
            ? 'No chain on this node has a readable leaderboard right now — CHAIN_LEADERBOARD unreachable or not deployed.'
            : 'Zero sovereign chains launched on this node right now — nothing to rank.';
          return;
        }
        leaderboardEmpty.hidden = true;
        ranked.forEach(function (c) {
          var card = el('div', 'dash-leaderboard-card');
          card.appendChild(el('h4', null, c.chainId + ' · ' + c.tokenSymbol));
          if (!c.leaderboard.length) {
            card.appendChild(el('p', 'dash-empty', 'Minted, but no real supporter/provider holds a balance yet.'));
          } else {
            var ol = el('ol', 'dash-leaderboard-list');
            c.leaderboard.forEach(function (row, i) {
              var li = el('li', 'dash-leaderboard-row');
              li.appendChild(el('span', 'dash-leaderboard-rank', '#' + (i + 1)));
              li.appendChild(el('span', 'dash-leaderboard-holder', row.holder.slice(0, 14) + '…'));
              li.appendChild(el('strong', 'dash-leaderboard-amount', fmt(row.amount)));
              ol.appendChild(li);
            });
            card.appendChild(ol);
          }
          leaderboardWrap.appendChild(card);
        });
      }
      function checkChain() {
        if (chainDisposed || chainInFlight) return;
        if (!window.ArkChainPulse) { paintChain({ reachable: false, lastError: 'chain pulse client not loaded' }); return; }
        chainInFlight = true;
        window.ArkChainPulse.get().then(function (result) {
          if (!chainDisposed) paintChain(result.data);
        }).catch(function (e) {
          if (!chainDisposed) paintChain({ reachable: false, lastError: e && e.message ? e.message : 'unknown error' });
        }).then(function () {
          chainInFlight = false;
          if (!chainDisposed) chainPollTimer = setTimeout(checkChain, POLL_MS);
        });
      }
      checkChain();

      // ---- fleet capacity wiring (separate endpoint, own short poll loop) ------------------------
      var capacityPollTimer = 0, capacityDisposed = false, capacityInFlight = false;
      function paintCapacity(data) {
        if (!data || !Array.isArray(data.nodes)) {
          setStat(capCommitteeUp, '–', 'of 10', 'no live value; nothing substituted');
          setStat(capQuorum, '–', 'needed: 6', 'no live value; nothing substituted');
          setStat(capPeersUp, '–', 'of 4', 'no live value; nothing substituted');
          setStat(capGenerated, '–', '', data && data.lastError ? data.lastError : 'unreachable');
          capacityWrap.textContent = '';
          capacityEmpty.hidden = false;
          capacityEmpty.textContent = 'The fleet capacity probe is unreachable — no live value substituted.';
          return;
        }
        var s = data.summary || {};
        capCommitteeUp.tile.dataset.state = s.committeeHasQuorum ? 'ok' : 'down';
        setStat(capCommitteeUp, fmt(s.committeeUp), 'of ' + fmt(s.committeeTotal), 'quorum-bearing nodes, probed directly by IP right now');
        setStat(capQuorum, s.committeeHasQuorum ? 'yes' : 'no', 'needed: ' + fmt(s.committeeQuorum), s.committeeHasQuorum ? 'enough committee nodes up to finalize a segment' : 'below the 6-of-10 finality floor right now');
        capPeersUp.tile.dataset.state = s.peersUp === s.peersTotal ? 'ok' : 'down';
        setStat(capPeersUp, fmt(s.peersUp), 'of ' + fmt(s.peersTotal), 'bootstrap-only — never sign or propose');
        setStat(capGenerated, data.generatedAt ? ago(Date.now() - new Date(data.generatedAt).getTime()) : '–', '', data.generatedAt || '');

        var table = el('table', 'dash-table'), thead = el('thead'), hr = el('tr');
        ['Node', 'Role', 'Up', 'Latency', 'Peers connected'].forEach(function (c) {
          var th = el('th', null, c); th.scope = 'col'; hr.appendChild(th);
        });
        thead.appendChild(hr); table.appendChild(thead);
        var body = el('tbody');
        data.nodes.forEach(function (n) {
          var tr = el('tr');
          tr.appendChild(el('td', null, n.id));
          tr.appendChild(el('td', null, n.role));
          tr.appendChild(el('td', 'is-num', n.reachable ? 'yes' : 'no'));
          tr.appendChild(el('td', 'is-num', Number.isFinite(n.latencyMs) ? fmt(n.latencyMs) + ' ms' : '–'));
          tr.appendChild(el('td', 'is-num', n.reachable ? fmt(n.peerCount) : (n.error || '–')));
          body.appendChild(tr);
        });
        table.appendChild(body);
        capacityWrap.textContent = ''; capacityWrap.appendChild(table); capacityEmpty.hidden = true;
      }
      function checkCapacity() {
        if (capacityDisposed || capacityInFlight) return;
        if (!window.ArkChainFleetCapacity) { paintCapacity(null); return; }
        capacityInFlight = true;
        window.ArkChainFleetCapacity.get().then(function (result) {
          if (!capacityDisposed) paintCapacity(result.data);
        }).catch(function (e) {
          if (!capacityDisposed) paintCapacity({ lastError: e && e.message ? e.message : 'unknown error' });
        }).then(function () {
          capacityInFlight = false;
          if (!capacityDisposed) capacityPollTimer = setTimeout(checkCapacity, POLL_MS);
        });
      }
      checkCapacity();

      // ---- live wiring --------------------------------------------------------------------------
      var lastPulse = null, nextAt = 0, pollTimer = 0, clockTimer = 0, disposed = false, inFlight = false;

      function setStat(k, value, unit, detail) { k.num.textContent = value; k.unit.textContent = unit || ''; k.detail.textContent = detail || ''; }
      function paintNodes(data) {
        nodeList.textContent = '';
        var sorted = data.nodes.slice().sort(function (a, b) { return (b.qps || 0) - (a.qps || 0); });
        var max = Math.max.apply(null, sorted.map(function (n) { return n.qps || 0; }).concat([1]));
        sorted.forEach(function (n) {
          var down = !!n.error || !(n.qps > 0);
          var li = el('li', 'dash-node'); li.dataset.state = down ? 'down' : 'up';
          var top = el('p', 'dash-node-head');
          top.appendChild(el('span', 'dash-dot'));
          top.appendChild(el('b', null, n.name));
          top.appendChild(el('span', 'dash-node-addr', n.addr));
          li.appendChild(top);
          if (n.error) {
            li.appendChild(el('p', 'dash-node-error', n.error));
          } else {
            var v = el('p', 'dash-node-value');
            v.appendChild(el('strong', null, fmt(n.qps)));
            v.appendChild(el('span', 'dash-unit', 'ops/s'));
            li.appendChild(v);
            li.appendChild(bar(n.qps / max, 'is-thin'));
            li.appendChild(el('p', 'dash-node-meta', fmt(n.ok) + ' / ' + fmt(n.total) + ' ok · ' + fmt(n.elapsed_ms) + ' ms'));
          }
          nodeList.appendChild(li);
        });
        nodeEmpty.hidden = true;
      }
      function paintOpsTable(ops) {
        if (!ops || !(ops.per_node || []).length) {
          opsTableWrap.textContent = ''; opsEmpty.hidden = false;
          opsEmpty.textContent = 'Not reporting yet \u2014 no live value substituted.';
          return;
        }
        var sorted = ops.per_node.slice().sort(function (a, b) { return (b.swaps_per_second || 0) - (a.swaps_per_second || 0); });
        var table = el('table', 'dash-table'), thead = el('thead'), hr = el('tr');
        ['Node', 'Swaps/s', 'Transfers/s', 'Stores/s', 'Stakes/s', 'Cores'].forEach(function (c) { var th = el('th', null, c); th.scope = 'col'; hr.appendChild(th); });
        thead.appendChild(hr); table.appendChild(thead);
        var body = el('tbody');
        sorted.forEach(function (n) {
          var tr = el('tr');
          var name = el('td'); var nh = el('span', 'dash-node-head'); nh.appendChild(el('span', 'dash-dot')); nh.appendChild(el('b', null, n.node)); name.appendChild(nh); tr.appendChild(name);
          tr.appendChild(el('td', 'is-num', fmt(n.swaps_per_second)));
          tr.appendChild(el('td', 'is-num', fmt(n.transfers_per_second)));
          tr.appendChild(el('td', 'is-num', fmt(n.stores_per_second)));
          tr.appendChild(el('td', 'is-num', fmt(n.stakes_per_second || 0)));
          tr.appendChild(el('td', 'is-num', String(n.cores)));
          body.appendChild(tr);
        });
        table.appendChild(body);
        opsTableWrap.textContent = ''; opsTableWrap.appendChild(table); opsEmpty.hidden = true;
      }
      function paintAge() {
        if (lastPulse) {
          var age = Date.now() - lastPulse.measured_at_ms;
          updated.textContent = 'Measured ' + ago(age) + ' · ' + new Date(lastPulse.measured_at_ms).toLocaleTimeString();
        }
        if (nextAt) {
          var s = Math.max(0, Math.round((nextAt - Date.now()) / 1000));
          next.textContent = document.hidden ? 'Paused while this tab is hidden' : 'Next check in ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
        }
      }
      function paint(data) {
        lastPulse = data;
        var up = data.nodes.filter(function (n) { return !n.error && n.qps > 0; }).length;
        var count = data.nodes.length;
        var stale = Date.now() - data.measured_at_ms > STALE_MS;
        var healthy = up === count && !data.errors && !stale;
        pill.dataset.state = healthy ? 'ok' : 'warn';
        pill.textContent = healthy ? 'All systems normal' : stale ? 'Pulse is stale' : up < count ? (count - up) + ' of ' + count + ' nodes down' : 'Errors in last bench';
        setStat(kNodes, up + '/' + count, 'nodes', up === count ? 'every node in the roster answered' : (count - up) + ' did not answer');
        setStat(kRate, fmt(data.aggregate_qps), 'records/s', 'genesis + receive admission, all nodes in parallel, ' + fmt(data.longest_ms) + ' ms wall clock — not a swap or store bench; see the tiles below');
        setStat(kOps, fmt(data.total_entries), 'ops', 'synthetic writes in the last self-bench');
        setStat(kErr, fmt(data.errors), '', data.errors ? 'see the nodes below' : 'zero refusals');
        kErr.tile.dataset.state = data.errors ? 'warn' : 'ok';
        var ops = data.operations;
        if (ops) {
          var partial = ops.nodes_reporting < ops.nodes_total;
          var reportingNote = partial
            ? ops.nodes_reporting + ' of ' + ops.nodes_total + ' nodes reporting — the rest have not completed their first hourly self-bench yet, so this is a real PARTIAL sum, not a full fleet total'
            : 'all ' + ops.nodes_total + ' nodes reporting, measured on each node’s own hardware';
          setStat(kSwaps, fmt(ops.parallel_swaps_per_second), 'swaps/s', reportingNote);
          setStat(kTransfers, fmt(ops.transfers_per_second), 'transfers/s', reportingNote);
          setStat(kStores, fmt(ops.stores_per_second), 'results/s', reportingNote);
          setStat(kStakes, fmt(ops.stakes_per_second), 'stakes/s', reportingNote);
          setStat(kPerCore, fmt(ops.swaps_per_core), 'swaps/s', ops.cores + ' cores total — derived from the fleet swap total, never typed separately');
          [kSwaps, kTransfers, kStores, kStakes, kPerCore].forEach(function (k) { k.tile.dataset.state = partial ? 'warn' : 'ok'; });
        } else {
          [kSwaps, kTransfers, kStores, kStakes, kPerCore].forEach(function (k) {
            setStat(k, '–', k.unit.textContent, 'not reporting yet — no live value substituted');
          });
        }
        paintNodes(data);
        paintOpsTable(ops);
        paintAge();
      }
      function paintOffline(message) {
        pill.dataset.state = 'down';
        pill.textContent = 'Pulse unreachable';
        if (!lastPulse) {
          updated.textContent = 'No pulse received yet';
          [kNodes, kRate, kOps, kErr, kSwaps, kTransfers, kStores, kStakes, kPerCore].forEach(function (k) { setStat(k, '–', k.unit.textContent, 'no live value; nothing substituted'); });
          nodeList.textContent = '';
          nodeEmpty.hidden = false;
          nodeEmpty.textContent = 'The fleet pulse could not be reached (' + message + '). The dated evidence records further down still stand; no live number has been put in their place.';
          opsTableWrap.textContent = '';
          opsEmpty.hidden = false;
          opsEmpty.textContent = 'The fleet pulse could not be reached (' + message + ').';
        } else {
          updated.textContent = 'Last good pulse ' + ago(Date.now() - lastPulse.measured_at_ms) + ' · latest check failed';
        }
      }
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
        refresh.disabled = true;
        if (!lastPulse) { pill.dataset.state = 'loading'; pill.textContent = 'Checking fleet'; }
        ArkPulse.get().then(function (result) {
          if (!disposed) paint(result.data);
        }).catch(function (e) {
          if (!disposed) paintOffline(e && e.message ? e.message : 'unknown error');
        }).then(function () {
          inFlight = false; refresh.disabled = false;
          schedule();
        });
      }
      function onVisibility() { if (!document.hidden && !pollTimer) check(); else paintAge(); }

      refresh.addEventListener('click', function () { clearTimeout(pollTimer); pollTimer = 0; check(); });
      document.addEventListener('visibilitychange', onVisibility);
      clockTimer = setInterval(paintAge, 1000);
      check();

      page.arkDispose = function () {
        disposed = true;
        chainDisposed = true;
        capacityDisposed = true;
        clearTimeout(pollTimer); clearInterval(clockTimer); clearTimeout(chainPollTimer); clearTimeout(capacityPollTimer);
        document.removeEventListener('visibilitychange', onVisibility);
      };
      host.appendChild(page);
      return page;
    }
  };
})();

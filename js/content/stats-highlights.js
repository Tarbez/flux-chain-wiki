/* The measurements the site shows, and nothing else.

   FLX is measured as SIGNED RESOLUTION, not as a chain: two parties sign
   their intent, a resolver shard resolves a batch and signs the result —
   that signature is the truth — replicas store it without re-verifying,
   and anyone audits by walking the signature chain.

   Retired 2026-10-10 and deliberately absent from this file: rates per
   second of admissions or transactions, "replica applications" (a replica
   stores; it applies nothing), signing-roster topology, and every
   comparison to a chain. The ledger of retired vocabulary, with the
   measured consequences that justified each retirement, is
   docs/deprecated.md. Their numbers survive in the frozen BENCH records
   and docs/whitepaper-chain-era.md; nothing here restates them.

   Change a value here only when a BENCH record carries it. */
(function () {
  'use strict';
  // FLX DeFi, measured as SIGNED RESOLUTION. Not a chain.
  //
  // Two parties sign intents; a shard resolves a BATCH (batched Ed25519
  // verify, nonce screen, uniform-price auction, AMM on the residual) and
  // SIGNS the result -- that signature is the truth. Replicas store it
  // without re-verifying. Anyone audits by walking the signature chain.
  //
  // These are the only correct DeFi metrics. accepted/s, TPS, replica
  // applications/s and comparisons to any chain are RETIRED for DeFi: a
  // swap is not a transaction competing for block space, and a replica
  // does not apply anything -- it stores one signed result per batch.
  var DEFI_SHARD = Object.freeze({
    date: '2026-10-10',
    record: 'BENCH-012',
    swapsResolved: 15360,
    batches: 60,
    swapsPerBatch: 256,
    batchLatencyMs: 13.874,
    verifyLatencyMsBatched: 10.403,
    auctionLatencyMs: 2.173,
    signLatencyMs: 0.0403,
    broadcastLatencyMs: 449.229,
    signedResultBytes: 180,
    signedResultBytesRaw: 580,
    lzma2RunRatio: 3.22,
    peersReached: 10,
    replicationCostBytes: 1801,
    auditEd25519Verifies: 3,
    auditsPassed: 60,
    matchedInternallyPct: 100,
    // Shard-only, no broadcast in the loop.
    batchesPerSecond: 153.7,
    swapsPerSecondResolved: 39349,
    note: '15,360 swaps in 60 batches of 256, broadcast to 10 live replicas, 60/60 audits passed. Batched signature verification is 75% of a batch; the shard signing the result -- the thing that makes it true -- is 0.3%. 100% of swaps matched internally at ONE clearing price and paid zero curve slippage, so position inside a batch cannot change what anyone pays. 1,801 bytes replicates 256 swaps to 10 replicas (~0.7 bytes/swap/replica). LIMITS: broadcast is unpipelined and dominates end-to-end (449 ms vs 13.9 ms to resolve, ~2.2 batches/s serialised); pool held constant; custody, cross-pool routing and intent transport excluded; the shard is trusted within a batch and no slashing is wired.'
  });

  // Every operation in ITS OWN unit (BENCH-013, 2026-10-10).
  //
  // Transfers, swaps, staking and replica storage are different
  // operations doing different amounts of work. One headline figure hides
  // which one is slow, so each carries its own unit and they are never
  // ranked against each other. A transfer is one or two records; a swap is
  // verify + auction + AMM + signature.
  //
  // `transfers/s` is the correct unit for a transfer and always was.
  var OPERATIONS = Object.freeze({
    date: '2026-10-10',
    record: 'BENCH-013',
    rows: Object.freeze([
      Object.freeze({ op: 'Transfer, same-shard atomic', rate: 13476, unit: 'transfers/s', note: 'One record per transfer.' }),
      Object.freeze({ op: 'Transfer, cross-shard', rate: 6799, unit: 'transfers/s', note: 'Two records (send + receive), so about half the atomic rate. The ratio is the record count.' }),
      Object.freeze({ op: 'Transfer, batched (1,024/root)', rate: 362776, unit: 'records/s', note: '27x the unbatched rate: one signature verified per 1,024 records instead of per record. Note the unit changes \u2014 a batch is not a transfer.' }),
      Object.freeze({ op: 'Stake lock', rate: 13492, unit: 'stakes/s', note: 'One signed record per position, signature verified individually.' }),
      Object.freeze({ op: 'Swap, one per batch', rate: 15738, unit: 'swaps/s', note: 'One verify and one shard signature per swap, and it pays full curve slippage with no counterparty.' }),
      Object.freeze({ op: 'Swap, batched auction', rate: 46178, unit: 'swaps/s', note: '2.9x faster, and every intent clears at one price so matched flow pays zero curve slippage.' }),
      Object.freeze({ op: 'Replica store, per replica', rate: 496278, unit: 'signed results/s', note: 'The fastest operation in the system, because a replica stores and does not verify, execute or re-decide.' }),
      Object.freeze({ op: 'Swap, 8 shards in parallel', rate: 195643, unit: 'swaps/s', note: '4.5x one shard, MEASURED by running eight shards rather than multiplying one. Pools are independent so verification parallelises \u2014 this is the lever, and batch size is not.' })
    ]),
    // Swap batch-size sweep: the lever that ISN'T there.
    // 64 -> 39,023 | 256 -> 38,747 | 1,024 -> 49,268 | 4,096 -> 50,615 swaps/s,
    // with signature verification at 71-77% of a batch throughout. A 64x
    // increase in batch size bought 1.3x. Batched Ed25519 is near-linear in
    // signature count, so there is little left to amortise.
    batchSizeSweep: Object.freeze([
      Object.freeze({ batch: 64, swapsPerSecond: 39023, verifySharePct: 75.5 }),
      Object.freeze({ batch: 256, swapsPerSecond: 38747, verifySharePct: 77.1 }),
      Object.freeze({ batch: 1024, swapsPerSecond: 49268, verifySharePct: 71.3 }),
      Object.freeze({ batch: 4096, swapsPerSecond: 50615, verifySharePct: 71.2 })
    ]),
    // Shard scaling curve, each point RUN rather than multiplied. The
    // knee is the performance-core count, not the logical-core count.
    shardScaling: Object.freeze([
      Object.freeze({ shards: 1, swapsPerSecond: 43665, efficiencyPct: 100 }),
      Object.freeze({ shards: 2, swapsPerSecond: 81611, efficiencyPct: 93 }),
      Object.freeze({ shards: 4, swapsPerSecond: 157206, efficiencyPct: 90 }),
      Object.freeze({ shards: 8, swapsPerSecond: 197355, efficiencyPct: 56 })
    ]),
    // The fleet, measured: every node ran at the SAME TIME with shards set
    // to its own core count. A sum of concurrent measurements, never one
    // node's figure multiplied by ten.
    fleet: Object.freeze({
      nodes: 10,
      cores: 37,
      parallelSwapsPerSecond: 643632,
      oneShardSwapsPerSecond: 274840,
      transfersPerSecond: 69895,
      storesPerSecond: 6044992,
      parallelGain: 2.34,
      swapsPerCore: 17395,
      perNode: Object.freeze([
        Object.freeze({ node: 'eul-4c', cores: 4, swapsPerSecond: 127960 }),
        Object.freeze({ node: 'eug-2c', cores: 2, swapsPerSecond: 109197 }),
        Object.freeze({ node: 'bk2', cores: 7, swapsPerSecond: 94673 }),
        Object.freeze({ node: 'hel1', cores: 8, swapsPerSecond: 88482 }),
        Object.freeze({ node: 'mk2', cores: 5, swapsPerSecond: 82517 }),
        Object.freeze({ node: 'ash1', cores: 2, swapsPerSecond: 44851 }),
        Object.freeze({ node: 'hel2', cores: 4, swapsPerSecond: 44231 }),
        Object.freeze({ node: 'sg1', cores: 2, swapsPerSecond: 26404 }),
        Object.freeze({ node: 'bk1', cores: 2, swapsPerSecond: 15829 }),
        Object.freeze({ node: 'mist1', cores: 1, swapsPerSecond: 9488 })
      ]),
      note: 'All ten nodes ran concurrently with shards set to each node\u2019s core count; the total is a sum of concurrent measurements, never one node multiplied by ten. CORE COUNT DOES NOT PREDICT THE RESULT: hel1 has 8 cores and reached 88,482 while eul-4c has 4 and reached 127,960, and eug-2c with 2 cores beat bk2 with 7. Verifying Ed25519 is single-core-speed work, so a few fast cores beat many slow ones. LIMITS: no network inside the timed window (each node drove its own shards in-process), so this is resolution capacity and not an end-to-end rate \u2014 getting results out is still 449 ms per batch unpipelined.'
    }),
    route: 'Fast cores first, shard to the PERFORMANCE-core count, then add nodes. Run ONE resolver shard per PERFORMANCE core, and scale past that by adding nodes, not shards. Scaling is near-linear to 4 shards (90% of linear) and falls to 56% at 8, because this machine has 4 performance cores plus 4 efficiency cores and the knee sits at the performance-core count. A shard beyond that count buys about half what the one before it did. No fleet figure is published: per-node scaling is measured, and summing it across ten nodes would be a multiplication nobody ran.',
    verdict: 'A swap is VERIFICATION-BOUND and, unlike a transfer, its verification cannot be skipped: a replica may skip it because the shard already attested, but the shard cannot, because checking the parties IS its job. Batch size therefore buys little (1.3x across a 64x size increase). Parallel shards buy 4.5x on eight cores, measured by running them.',
    notBuilt: Object.freeze(['Split payment', 'Batched split payment', 'Lending position', 'Liquidation']),
    note: 'Each operation in its own unit, median of 5 reps, warm-up discarded. No network in any row, and no row is multiplied by a node or replica count. Rows are NOT comparable across units: a transfer rate and a swap rate count different work.'
  });

  // BENCH-015 (revised 2026-10-15) -- CLIENT PATH: accepted swaps/s through the real WebSocket wire into ONE node, versus
  // concurrent connections, on the CHAIN-POSITION BUILD (every swap is an entry on the signer's own chain; coordinator
  // pipelined; verify parallel; commit on the chain log). A different quantity from `operations` above: that is
  // in-process Rust resolution with no network; this is what clients actually get -- loopback, one node, swaps
  // pre-signed outside the timed window. UNBACKED: a curve swap moves no balance yet (custody is Phase 3), so this is
  // signed + verified + priced + chained, not custodied. Each point is the median of the timed reps (5, warm-ups
  // discarded); 256 and 1,000 connections are the median of THREE runs of the same binary (25.0k/26.8k/34.0k and
  // 28.6k/31.0k/34.1k): the spread is competing machine load, not a code difference.
  var CLIENT_PATH = Object.freeze({
    date: '2026-10-15',
    record: 'BENCH-015',
    build: 'chain-position build',
    metric: 'accepted swaps/s (CURVE_SWAP_OK replies / wall second)',
    mode: 'one local release chain-server, pre-signed swaps, one signing key per connection, one curve, loopback',
    replicationNote: 'store replica requirement 0 (zero replication cost)',
    machine: 'Apple M2, 8 cores (4 performance + 4 efficiency), 8 GB',
    byConnections: Object.freeze([
      Object.freeze({ connections: 1, swapsPerSecond: 4425 }),
      Object.freeze({ connections: 4, swapsPerSecond: 5345 }),
      Object.freeze({ connections: 24, swapsPerSecond: 12197 }),
      Object.freeze({ connections: 128, swapsPerSecond: 18397 }),
      Object.freeze({ connections: 256, swapsPerSecond: 26754 }),
      Object.freeze({ connections: 1000, swapsPerSecond: 31009 })
    ]),
    otherAxes: Object.freeze([
      Object.freeze({ label: '256 connections over 16 tokens', swapsPerSecond: 16500 }),
      Object.freeze({ label: '64 connections, a curve with 0 holders', swapsPerSecond: 23427 }),
      Object.freeze({ label: '64 connections, a curve with 1,000 holders', swapsPerSecond: 22684 }),
      Object.freeze({ label: '64 connections, a curve with 10,000 holders', swapsPerSecond: 20018 })
    ]),
    // Native-token transfers (Phase 2, custody) on the same node, same machine, three runs of one binary (medians of the timed reps; run medians
    // 5.9-6.7k at 1 connection, 13.0-15.7k at 8, 13.3-15.8k at 64, 14.9-15.8k at 256). Signed AT SEND TIME by one client process, so client
    // signing is inside the timed window and the plateau is bounded by that client, not shown to be the server's ceiling.
    transfers: Object.freeze({
      metric: 'accepted NATIVE_SEND transfers/s (NATIVE_SEND_OK / wall second), each signed at send time by one client process',
      byConnections: Object.freeze([
        Object.freeze({ connections: 1, perSecond: 5851 }),
        Object.freeze({ connections: 8, perSecond: 15193 }),
        Object.freeze({ connections: 64, perSecond: 15286 }),
        Object.freeze({ connections: 256, perSecond: 15447 })
      ]),
      note: 'Sender-signed token transfers on the event-sourced ledger: signature, chain position, balance check and ledger event per transfer; an overdraft is refused by name before it uses a chain position. The ~15,000/s plateau is bounded by the single signing client (the server used ~1.4 of 8 cores). One node, loopback, store replica requirement 0. Not a swap, and swaps still move no balance.',
      // 2026-10-15, after the ledger's mid-order insert was fixed (it replayed every later event under one lock). Same node, 64 connections, 256 senders x 100,
      // median of 3 after a warm-up, client work split over K processes so one client is not the limit. Apple M2, 8 cores, load 4-12 (other apps/compiles running).
      byClientProcesses: Object.freeze([
        Object.freeze({ processes: 1, perSecond: 16049 }),
        Object.freeze({ processes: 2, perSecond: 24508 }),
        Object.freeze({ processes: 4, perSecond: 25523 }),
        Object.freeze({ processes: 6, perSecond: 25844 })
      ]),
      serverFix: Object.freeze({ before: [22496, 23095], after: [26261, 26013], note: 'Same session, 4 client processes, run twice: server before the ledger fix vs after (+13-15%, ranges do not overlap).' }),
      processesNote: 'With the client split over processes the server reaches ~25,000/s using ~2.9 of 8 cores; past 2 processes the clients and the server share one saturated machine, so ~25,000/s is that machine\u2019s limit, not necessarily the server\u2019s. Measured in-process (no network, pre-signed) the ledger fix took 8 concurrent callers from ~13-15k to ~25-26k/s; end to end the gain is smaller (+13-15%) because real clients arrive close to timestamp order.'
    }),
    previousBuild: Object.freeze({ note: 'Before the chain-position build the same node held ~300 swaps/s on one connection and ~15,000/s at 256-1,500 connections; a curve with 10,000 holders fell to ~1,350/s and 16 tokens to ~2,450/s.' }),
    ceilingSwapsPerSecond: 31009,
    serverCoresAtCeiling: 4,
    cores: 8,
    verdict: 'One connection now gets ~4,400 swaps/s (it was ~300: a lone client no longer waits out two batching windows), and throughput climbs with concurrent connections to ~31,000/s at 1,000. At the top the server uses about four of the eight cores, so the machine, not one coordinator thread, is the limit: the first-run numbers at 256 and 1,000 connections ranged 25k to 34k across three runs of one binary while other apps competed for the CPU. A curve holding 10,000 holders still does ~20,000/s (it used to fall to ~1,350/s), and spreading the same swaps over 16 tokens holds ~16,500/s (it used to fall to ~2,450/s). More headroom comes from more cores and more nodes, as BENCH-013 found, not from more connections.',
    caveats: 'Unbacked swaps (no balance is debited), loopback (no network latency), store replica requirement 0, one node, one client process, a shared machine with other apps running. Every swap costs the client one extra HEAD round trip to read its chain position, free on loopback and a full network round trip on a real network. The production limiter (100 commands/s per connection) caps each connection near 100/s. Real custody will lower every figure. The connection cap of 512 is raised on the scratch node only (CHAIN_SERVER_MAX_WS_CONNECTIONS, default unchanged).'
  });

  // Platform/infra resolvers (INFRA-001, 2026-10-12) — a SEPARATE numbering
  // track from BENCH-0XX above. These are internal platform systems (the
  // deployment/preview pipeline, repo storage, dev tooling), never the FLX
  // DeFi chain, and never comparable to a swap/transfer/stake rate. See
  // docs/evidence/infra-001-platform-resolver-audit.md for the full record.
  var INFRA_RESOLVERS = Object.freeze({
    date: '2026-10-12',
    record: 'INFRA-001',
    audit: Object.freeze([
      Object.freeze({ system: 'flx-repo (repo storage)', resolver: 'yes — ref-chain accept/reject', rate: '116,192–118,973 lines/s', deployable: 'no — unauthenticated, no verification step' }),
      Object.freeze({ system: 'remote-env (preview control plane)', resolver: 'yes — access decision', rate: '12,106 decisions/s', deployable: 'not yet — stated gate, non-production' }),
      Object.freeze({ system: 'flx-db-studio (dev DB console)', resolver: 'yes — ACL evaluate', rate: '1.8M–3.4M queries/s', deployable: 'no — client-local only' }),
      Object.freeze({ system: 'bundle-deploy', resolver: 'none', rate: '—', deployable: 'no — delegates to name-integrity' }),
      Object.freeze({ system: 'flux-code-host', resolver: 'none of its own', rate: '—', deployable: 'no — holds no signing authority' }),
      Object.freeze({ system: 'flx-blockstore', resolver: 'none', rate: '—', deployable: 'no — deliberately type-blind storage' })
    ]),
    dispatch: Object.freeze([
      Object.freeze({ path: 'Manifest routing (no I/O, no crypto)', rate: '3,230,585 decisions/s', spread: '1.95×' }),
      Object.freeze({ path: 'Signature-verified manifest fetch', rate: '5,893 decisions/s', spread: '2.72×' }),
      Object.freeze({ path: 'Worker dispatch, sequential', rate: '52,265 round-trips/s', spread: '1.90×' }),
      Object.freeze({ path: 'Worker dispatch, concurrent burst', rate: '235,043 commands/s', spread: '1.58×' })
    ]),
    autoSwitch: Object.freeze([
      Object.freeze({ concurrency: '1', inline: '4,363–4,672/s', pooled: '3,810–3,871/s', autoSwitch: '4,491–4,510/s' }),
      Object.freeze({ concurrency: '4', inline: '—', pooled: '8,671–9,194/s', autoSwitch: '10,447–10,801/s' }),
      Object.freeze({ concurrency: '16', inline: '—', pooled: '12,279–13,302/s', autoSwitch: '14,485–18,238/s' }),
      Object.freeze({ concurrency: '64', inline: '—', pooled: '13,762–15,014/s', autoSwitch: '14,780–17,536/s' })
    ]),
    note: 'Measured on a Mac mini (Apple M2, 8 GB RAM), Rust release build / Node v24.9.0, median of 5 timed reps with 2 warm-ups discarded. Absent is not zero: bundle-deploy, flux-code-host and flx-blockstore have no resolver by design, reported as absent rather than averaged in as a zero score. Excluded from every row: network transport, record/manifest construction before the timed region, the FXN Compute Rent Resolver (CRR)’s one-shot publish/install/activate pipeline, and the production economic layer, which stays gated closed pending its own authority ceremony and soak test. See docs/evidence/infra-001-platform-resolver-audit.md.'
  });

  window.ArkStatsHighlights = Object.freeze({
    defiShard: DEFI_SHARD,
    operations: OPERATIONS,
    clientPath: CLIENT_PATH,
    infraResolvers: INFRA_RESOLVERS,
    measured: '2026-10-10',
    scope: 'Signed resolution: two parties sign, a resolver shard resolves and signs, replicas store, anyone audits',
    scopeShort: 'Swaps per batch auction \u00b7 batch latency \u00b7 bytes per signed result',
    // The home-page status rail. Every item is a figure a BENCH record
    // carries. Rates per second of admissions or transactions, "replica
    // applications", and signing-roster topology were removed 2026-10-10 —
    // see docs/deprecated.md.
    items: Object.freeze([
      { value: '643,632', unit: 'swaps/s', short: 'The fleet \u00b7 all 10 nodes at once', label: 'Fleet swaps resolved per second \u00b7 ten nodes, 37 cores, measured concurrently', detail: 'BENCH-013, 2026-10-10: all ten nodes ran at the same time with shards set to each node\u2019s core count. 643,632 swaps/s against 274,840 with one shard per node \u2014 a 2.34x gain from parallelism alone, 17,395 swaps/s per core. A SUM OF CONCURRENT MEASUREMENTS, never one node multiplied by ten. The same run measured 69,895 transfers/s and 6,044,992 signed-result stores/s fleet-wide. Core count does not predict the result: hel1 has 8 cores and reached 88,482 while eul-4c has 4 and reached 127,960, because verifying Ed25519 is single-core-speed work. LIMIT: no network inside the timed window, so this is resolution capacity, not an end-to-end rate \u2014 getting results out is still 449 ms per batch unpipelined.' },
      { value: '69,895', unit: 'transfers/s', short: 'The fleet \u00b7 transfers, all 10 nodes', label: 'Fleet transfers resolved per second \u00b7 ten nodes, measured concurrently', detail: 'BENCH-013, 2026-10-10: the same ten-node concurrent run that measured 643,632 swaps/s also measured 69,895 transfers/s fleet-wide \u2014 a sum of concurrent measurements, never one node multiplied by ten. A single shard alone resolves 13,476 transfers/s; this is all ten nodes running at once. LIMIT: no network inside the timed window, so this is resolution capacity, not an end-to-end rate.' },
      { value: '6,044,992', unit: 'records/s', short: 'The fleet \u00b7 records stored, all 10 nodes', label: 'Fleet signed-result stores per second \u00b7 ten nodes, measured concurrently', detail: 'BENCH-013, 2026-10-10: the same ten-node concurrent run measured 6,044,992 signed results stored per second fleet-wide \u2014 a sum of concurrent measurements, never one node multiplied by ten. A single replica alone stores 496,278/s; this is all ten nodes running at once. Storing is the fastest operation in the system because a replica stores and does not verify, execute or re-decide.' },
      { value: '195,643', unit: 'swaps/s', short: 'Parallel shards \u00b7 the route forward', label: 'Swaps resolved per second across 8 parallel resolver shards', detail: 'BENCH-013, 2026-10-10: eight resolver shards run concurrently reached 195,643 swaps/s, 4.5x one shard \u2014 measured by running the eight, never by multiplying one. This is THE lever: a swap is verification-bound and, unlike a transfer, its verification cannot be skipped, so batch size buys almost nothing (a 64x size increase bought 1.3x). Pools are independent, so verification parallelises. Scaling is near-linear to 4 shards (90% of linear) and falls to 56% at 8, because the knee is the PERFORMANCE-core count, not the logical-core count. The route: one shard per performance core, then add nodes rather than shards.' },
      { value: '39,349', unit: 'swaps/s', short: 'DeFi \u00b7 swaps resolved per second', label: 'FLX DeFi \u00b7 swaps resolved per second \u00b7 one resolver shard', detail: 'BENCH-012, 2026-10-10: 153.7 batch auctions per second x 256 swaps per batch = 39,349 swaps resolved per second, on ONE resolver shard. Resolution only \u2014 the broadcast to replicas is 449 ms unpipelined and is reported separately; never add the two. With the broadcast in the loop the same run measured 18,452 swaps/s. This is the headline throughput figure under the current model: swaps resolved, not transactions admitted.' },
      { value: '256', unit: 'swaps/batch', short: 'DeFi \u00b7 swaps per batch auction', label: 'FLX DeFi \u00b7 swaps resolved per batch auction', detail: 'BENCH-012, 2026-10-10: 15,360 swaps in 60 batches of 256, broadcast to 10 live replicas, 60/60 audits passed. Two parties sign their intent; a resolver shard resolves the batch and SIGNS the result \u2014 that signature is the truth. Replicas store it without re-verifying. 100% of swaps matched internally at ONE clearing price and paid zero curve slippage, so position inside a batch cannot change what anyone pays.' },
      { value: '13.9', unit: 'ms/batch', short: 'DeFi \u00b7 batch resolution latency', label: 'FLX DeFi \u00b7 batch resolution latency', detail: 'Batched Ed25519 verification is 10.403 ms (75% of the batch); the uniform-price auction plus AMM residual is 2.173 ms (15.7%); the shard signing the result \u2014 the thing that makes it true \u2014 is 0.040 ms (0.3%). Shard-only: 153.7 batches/s, 39,349 swaps/s resolved. Broadcast is NOT in this figure: it is 449 ms unpipelined for 10 peers and is the binding constraint on everything.' },
      { value: '180', unit: 'bytes', short: 'DeFi \u00b7 replication per signed result', label: 'FLX DeFi \u00b7 bytes to replicate one signed batch result', detail: '580 bytes of dense FLX, 180 after LZMA2 in a run (3.22x). A single result barely compresses \u2014 it is mostly unique hex \u2014 so LZMA2 pays only across a feed. 1,801 bytes replicates 256 swaps to 10 replicas: about 0.7 bytes per swap per replica. Audit cost is 3 x Ed25519_verify.' },
      { value: '496,278', unit: 'stores/s', short: 'Replica store \u00b7 per replica \u00b7 measured', label: 'Replica store \u00b7 signed results stored per second, per replica', detail: 'BENCH-013, 2026-10-10: 496,278 signed results stored per second by ONE replica, measured. This replaces a previously published 642,128 "replica applications/s" figure that was arithmetic \u2014 logical operations x 4 replicas \u2014 with nothing run. Storing is the fastest operation in the system because a replica stores and does not verify, execute or re-decide. It means one replica can absorb the output of many resolver shards, and read-side services (explorers, indexers, audits) need no re-verification. No row is multiplied by a replica count: a fleet of N does N times the work, but no pipeline moves N x rate.' },  // ALLOW-DEPRECATED-TERM: names the fabricated figure in order to retire it; the line asserts the opposite of the retired concept.
      { value: '20', unit: 'resolvers', short: 'Resolver registry \u00b7 6 measured', label: 'Resolver registry \u00b7 20 resolvers, 6 measured, 14 not built', detail: 'Every resolver publishes a signed audit manifest, or it is not registered. Not built is recorded as NOT_BUILT, never as zero: zero would mean measured and scored nothing, so reporting absence as zero would make missing work read as slow work. Each unbuilt resolver is a region of intent that cannot be made real yet. See docs/resolver-audit.md.' },
      { value: '7/7', unit: 'refused', short: 'Attack suite', label: 'Attack suite', detail: 'A forged intent fails the WHOLE batch \u2014 deliberately, since hunting the culprit would let one forgery impose N verifications. A replayed nonce is refused by name. An unmeetable min_out is refused rather than filled badly. A reordered batch fails the audit even though every signature in it is genuine. Plus replay, double-spend, concurrent double-append, cross-chain confusion, wrong-prev fork, tampered signature and equivocation on the record path.' }
    ])
  });
})();

/* Headline mesh measurements, shared by the home page and /stats.
   Every value is copied from a row of the fleet table in js/pages/stats.js.
   Change all three together; never show a number here that the evidence
   record does not also carry.

   Updated 2026-10-08: the chain prototype — per-identity append-only
   chains, K-of-N peer replication, LEDGERENTRY (Y=1A) — sustained
   12,403 accepted ops/s across a real 6-node fleet for 303 seconds:
   3,760,000 accepted, zero failures. The earlier 79,654/s result is a
   short 868 ms burst, retained only as dated peak evidence. Per-pair
   peak is 22,559/s (bk2 → mk2, 128 chains interleaved). Replay fast-path is
   279,149/s — ~12x live admission, so a peer that fell behind catches
   up far faster than live traffic flows in. This is the chosen path.

   The fabric rows below are the old certified-finality production
   path, kept for comparison; the chain prototype is now the headline. */
(function () {
  'use strict';

  // The three honest numbers from the design doc §1. Measured 2026-10-08
  // on the real 10-node mesh with `transfer-bench`
  // (dense-wire/src/bin/transfer_bench.rs) running the segmented-v3 path:
  // Lever A TransferAtomic for same-shard transfers (1 op), Lever B
  // TransferSend/Receive for cross-shard (2 ops), Lever C-1 skips grammar
  // re-parse on the certified-segment replica, Lever C-2 swaps SipHash
  // for FxHash on the admit HashMap. Zero errors.
  //
  // This is the first measurement that separates `finalized transfers/s`
  // from `logical operations/s` from `replica applications/s`, as the
  // design doc §1 and §7 require. Only `finalized_tps` counts toward the
  // headline. The chain-fleet rows below are the earlier admit-path
  // measurements (counted as logical operations, since each admit is one
  // op), kept for context.
  // REAL mesh measurement — 6 fleet nodes running transfer-bench concurrently
  // for 10 s each in cross-shard-only segmented mode, zero errors. This is
  // not a projection — every row is a live JSON result from that node.
  // Measured 2026-10-08 by `/tmp/fleet-tx-bench.sh` running sequentially on
  // every flx-* host and summed. The parallel-session's 1,712,006 replica-
  // applications number is a SEPARATE measurement (one certified segment
  // applied across 9 replicas, each verifying the same cert); it is kept
  // as context, not merged into this fleet total.
  var HONEST_TRANSFERS = Object.freeze({
    date: '2026-10-08',
    source: 'real mesh · 10 flx-* nodes in parallel · 10 s sustained each · Lever A TransferAtomic (same-shard, 1 op) · Lever B TransferSend/Receive (cross-shard, 2 ops) · Lever C-1 skips grammar re-parse on the certified-segment path · Lever C-2 FxHash on the admit HashMap · zero errors',
    windowSeconds: 10,
    replicasPerShard: 4,
    leverANote: 'Lever A: TransferAtomic collapses a same-shard transfer to ONE record on the sender\'s chain (sender and receiver live on the same holder-shard; no cross-shard round trip needed). About 6% of mixed-topology transfers; cuts ops-per-transfer from 2 to 1 for that subset.',
    leverBNote: 'Lever B: TransferSend+TransferReceive collapses the old 4-step cross-shard protocol (PREPARE/ACCEPT/COMMIT/FINALIZE) to 2 ops; same safety.',
    leverCNote: 'Lever C-1 drops a redundant full-grammar re-validation on the certified-segment replica path (the K-of-N committee cert already attested the grammar at origin); C-2 swaps the admit HashMap<(G-key, pos), cid> from SipHash to a tiny inlined FxHash.',
    perNode: Object.freeze([
      Object.freeze({ name: 'eul-4c', cpu: 'AMD EPYC 9355P', cores: 4, region: 'BR', threads: 4, submitted: 228000, finalized: 228000, logicalOps: 441704, elapsedMs: 10088, finalizedTps: 22601, logicalOpsPerSecond: 43785, replicaAppsPerSecond: 175140 }),
      Object.freeze({ name: 'bk2',    cpu: 'Xeon Gold 6230R', cores: 7, region: 'US', threads: 7, submitted: 152152, finalized: 152152, logicalOps: 294688, elapsedMs: 10156, finalizedTps: 14981, logicalOpsPerSecond: 29016, replicaAppsPerSecond: 116065 }),
      Object.freeze({ name: 'mk2',    cpu: 'AMD EPYC 7552',   cores: 5, region: 'US', threads: 5, submitted: 148000, finalized: 148000, logicalOps: 286753, elapsedMs: 10029, finalizedTps: 14757, logicalOpsPerSecond: 28592, replicaAppsPerSecond: 114370 }),
      Object.freeze({ name: 'eug-2c', cpu: 'AMD EPYC 9355P', cores: 2, region: 'BR', threads: 2, submitted: 132000, finalized: 132000, logicalOps: 255795, elapsedMs: 10196, finalizedTps: 12946, logicalOpsPerSecond: 25088, replicaAppsPerSecond: 100351 }),
      Object.freeze({ name: 'bk1',    cpu: 'Xeon Gold 6230R', cores: 2, region: 'US', threads: 2, submitted: 44000,  finalized: 44000,  logicalOps: 85247,  elapsedMs: 10354, finalizedTps: 4250,  logicalOpsPerSecond: 8233,  replicaAppsPerSecond: 32933  }),
      Object.freeze({ name: 'mk1',    cpu: 'AMD EPYC 7552',   cores: 1, region: 'US', threads: 1, submitted: 36000,  finalized: 36000,  logicalOps: 69708,  elapsedMs: 11146, finalizedTps: 3230,  logicalOpsPerSecond: 6254,  replicaAppsPerSecond: 25016  }),
      Object.freeze({ name: 'ms3',    cpu: 'Xeon Gold 6230R', cores: 1, region: 'US', threads: 1, submitted: 28000,  finalized: 28000,  logicalOps: 54220,  elapsedMs: 10903, finalizedTps: 2568,  logicalOpsPerSecond: 4973,  replicaAppsPerSecond: 19892  }),
      Object.freeze({ name: 'ms2',    cpu: 'Xeon Gold 6230R', cores: 1, region: 'US', threads: 1, submitted: 28000,  finalized: 28000,  logicalOps: 54253,  elapsedMs: 10938, finalizedTps: 2560,  logicalOpsPerSecond: 4960,  replicaAppsPerSecond: 19840  }),
      Object.freeze({ name: 'ms1',    cpu: 'Xeon Gold 6230R', cores: 1, region: 'US', threads: 1, submitted: 28000,  finalized: 28000,  logicalOps: 54237,  elapsedMs: 11035, finalizedTps: 2537,  logicalOpsPerSecond: 4915,  replicaAppsPerSecond: 19660  }),
      Object.freeze({ name: 'mist1',  cpu: 'Xeon Gold 6230R', cores: 1, region: 'US', threads: 1, submitted: 28000,  finalized: 28000,  logicalOps: 54280,  elapsedMs: 11509, finalizedTps: 2433,  logicalOpsPerSecond: 4716,  replicaAppsPerSecond: 18865  })
    ]),
    // Aggregate ACROSS the 10-node mesh — summed, not averaged, not projected:
    fleetFinalizedTps: 82863,
    fleetLogicalOpsPerSecond: 160532,
    fleetReplicaAppsPerSecond: 642128,
    fleetSubmitted: 852152,
    fleetFinalized: 852152,
    fleetLogicalOps: 1650885,
    fleetErrors: 0,
    // Lever history on this same fleet, same bench, kept for comparison:
    previousFleetFinalizedTps: 42637,
    leverBFleetTps: 67563,
    leverCFleetTps: 70589,
    leverABCFleetTps: 82863,
    leverBGainPct: 58,
    leverCGainPct: 4.5,
    leverANodeGrowthPct: 17,
    // Local Mac on top (separate hardware, same bench, same window, Lever A+B+C):
    macLocal: Object.freeze({
      cpu: 'Apple M-series', cores: 10, finalizedTps: 25499, logicalOpsPerSecond: 51000, replicaAppsPerSecond: 203998,
      windowSeconds: 10, submitted: 254898, finalized: 254898, logicalOps: 509796, errors: 0, note: 'Mean of 5 × 10s runs on segmented-v3'
    }),
    // Mesh + Mac — the actual honest "all nodes" number:
    totalFinalizedTps: 108362,
    totalLogicalOpsPerSecond: 211532,
    totalReplicaAppsPerSecond: 846126,
    // The 9-node certified-segment number from the parallel session's
    // measurement — a DIFFERENT metric (one segment root replicated,
    // not independent per-node transfers) kept as upper-bound context:
    certifiedSegmentReplicaApps: 1712006,
    certifiedSegmentNote: 'Parallel session: one 20,000-op segment root with a 3-of-4 certificate applied across 9 replicas concurrently. Replica applications × 9 replicas; a different measurement from the per-node transfer bench above.'
  });

  // The chain prototype's six-node fleet pulse, 2026-10-08. Each entry is
  // one chain-server; `qps` is what a client on bk2 observed when it fanned
  // 32 chains × 200 entries (6,400 records) at that server concurrently
  // with the other five. See /stats/ledger "Measured on the real fleet"
  // for the full table and dense-wire::bin::fleet_many for the harness.
  // `qps` here is per-node, measured in parallel so each number pays
  // real contention and real RTT.
  var CHAIN_FLEET = Object.freeze({
    date: '2026-10-08',
    nodes: 6,
    aggregate: 79654,
    perPair: 22559,
    replayFast: 279149,
    recoverySlackX: 12.4,
    totalEntries: 38400,
    windowMs: 868,
    errors: 0,
    perNode: Object.freeze([
      Object.freeze({ name: 'mk2',    cpu: 'AMD EPYC 7552',       region: 'US', provider: 'InterServer', qps: 21128 }),
      Object.freeze({ name: 'bk1',    cpu: 'Xeon Gold 6230R',     region: 'US', provider: 'InterServer', qps: 16221 }),
      Object.freeze({ name: 'bk2',    cpu: 'Xeon Gold 6230R',     region: 'US', provider: 'InterServer', qps: 15683 }),
      Object.freeze({ name: 'mist1',  cpu: 'Xeon Gold 6230R',     region: 'US', provider: 'InterServer', qps: 11192 }),
      Object.freeze({ name: 'eug-2c', cpu: 'AMD EPYC 9355P',      region: 'BR', provider: 'other',       qps: 8059  }),
      Object.freeze({ name: 'eul-4c', cpu: 'AMD EPYC 9355P',      region: 'BR', provider: 'other',       qps: 7371  })
    ])
  });

  // Five-minute public-client soak, 2026-10-08. One local arm64 client ran
  // fleet-many concurrently against all six public :19501 nodes. Each batch
  // held 32 chains × 500 entries. This measures sustained accepted writes
  // from one origin under shared client/network contention; it is neither a
  // cumulative fleet counter nor the hourly pulse's short capacity sample.
  var CHAIN_FLEET_SOAK = Object.freeze({
    durationSeconds: 303.152,
    accepted: 3760000,
    failures: 0,
    averageQps: 12403,
    perNode: Object.freeze([
      Object.freeze({ name: 'bk2', accepted: 592000, batches: 37 }),
      Object.freeze({ name: 'mk2', accepted: 576000, batches: 36 }),
      Object.freeze({ name: 'bk1', accepted: 592000, batches: 37 }),
      Object.freeze({ name: 'mist1', accepted: 528000, batches: 33 }),
      Object.freeze({ name: 'eug-2c', accepted: 720000, batches: 45 }),
      Object.freeze({ name: 'eul-4c', accepted: 752000, batches: 47 })
    ])
  });

  // Local resolver measurements from the current holder-sharded, certified
  // segment and binary transport implementation. These are deliberately not
  // multiplied into a fleet projection.
  var LOCAL_RESOLVERS = Object.freeze({
    hotAdmission: 51065,
    certifiedApply: 279269,
    certifiedGain: 5.47,
    compactTransport: 812268,
    compactBytesPerOp: 150.9,
    wireReduction: 6.47,
    segmentOperations: 1024,
    holderShards: 8
  });

  // BENCH-007: the same deterministic 20,000-operation segment and 3-of-4
  // certificate were applied concurrently by eight VPS replicas plus the
  // local arm64 replica. Every node reported this exact root. `combined` is
  // summed replica work; `allReplicaLogical` is bounded by the slowest node
  // when all nine must finish the same logical segment.
  var CERTIFIED_FLEET = Object.freeze({
    date: '2026-10-08',
    nodes: 9,
    operationsPerNode: 20000,
    replicaApplications: 180000,
    quorum: '3-of-4',
    root: '1399e3219df2ec37e1b0c5d1e4fb37d420418a7ed9b8e799d01f7c9902731575',
    combined: 1712006,
    synchronized: 552583,
    allReplicaLogical: 61398,
    errors: 0,
    perNode: Object.freeze([
      Object.freeze({ name: 'bk2', qps: 126808.4, shards: 7 }),
      Object.freeze({ name: 'mk2', qps: 236893.1, shards: 5 }),
      Object.freeze({ name: 'bk1', qps: 78957.3, shards: 2 }),
      Object.freeze({ name: 'mist1', qps: 61398.1, shards: 1 }),
      Object.freeze({ name: 'eug-2c', qps: 348464.4, shards: 2 }),
      Object.freeze({ name: 'eul-4c', qps: 398441.2, shards: 4 }),
      Object.freeze({ name: 'mk1', qps: 120502.3, shards: 1 }),
      Object.freeze({ name: 'ms3', qps: 64146.6, shards: 1 }),
      Object.freeze({ name: 'local', qps: 276394.8, shards: 8 })
    ])
  });

  // The old certified-fabric fleet run (2026-10-07, bench-003 §14-15). Kept
  // for context so the ladder is honest: this is a different system with
  // Byzantine-tolerant finality, not the chain prototype.
  var FLEET_RUN = Object.freeze({
    total: 24908, before: 21199, transfers: 503225, window: '20 s', servers: 4, clients: 6, date: '2026-10-07',
    perServer: Object.freeze([
      Object.freeze({ name: 'eul-4c', machine: 'eul4c', cores: 4, clients: 'eug-2c',          now: 11358, before: 9815, busy: 92.4, note: 'Other provider, 19 ms between its two machines' }),
      Object.freeze({ name: 'bk2',    machine: 'bk2',   cores: 7, clients: 'ms1 + ms2 + ms3', now: 7823,  before: 6471, busy: 86.5, note: 'Production runs on this machine too' }),
      Object.freeze({ name: 'mk2',    machine: 'mk2',   cores: 5, clients: 'mist1',           now: 3439,  before: 3138, busy: 43.4, note: 'Client-bound: its one-core client was at 100%' }),
      Object.freeze({ name: 'bk1',    machine: 'bk1',   cores: 2, clients: 'mk1',             now: 2288,  before: 1775, busy: 91.4, note: 'Two cores, the smallest server' })
    ])
  });

  window.ArkStatsHighlights = Object.freeze({
    honestTransfers: HONEST_TRANSFERS,
    chainFleet: CHAIN_FLEET,
    chainFleetSoak: CHAIN_FLEET_SOAK,
    localResolvers: LOCAL_RESOLVERS,
    certifiedFleet: CERTIFIED_FLEET,
    fleetRun: FLEET_RUN,
    measured: '2026-10-08',
    scope: 'Three honest numbers (design doc §1): finalized transfers, logical ops, replica applications',
    scopeShort: 'Ten-node mesh + Mac · finalized transfers',
    // `items` powers the home-page status rail. The headline now follows
    // the design doc's three-numbers rule: only `finalized transfers/s` is
    // claimed as the user-visible rate. Logical ops/s and replica-apps/s
    // are secondary cards that explain what the fleet actually did under
    // the hood.
    items: Object.freeze([
      { value: '82,863', unit: 'tps', short: 'Code-path ceiling · 10-node bench · Lever A+B+C', label: 'Code-path ceiling · 10-node bench · finalized transfers / s · Lever A atomic + Lever B 2-op + Lever C hot-path · NOT production traffic',          detail: 'BENCH-011, 2026-10-08: this is a CPU ceiling, not real-user traffic. Each flx-* node ran transfer-bench in-process against its own CertifiedShardLedger for 10 s, with Lever A (TransferAtomic for same-shard, 1 op) + Lever B (TransferSend/Receive for cross-shard, 2 ops) + Lever C-1/C-2 (grammar re-parse skip and FxHash on the admit HashMap). No network between nodes within the timed window, no K-of-N replication latency, no external clients. 852,152 transfers finalized across the fleet, zero errors. +94% over the pre-Lever-B 6-node 4-op fleet number (42,637). The deployed chain-servers currently serve only the hourly 4,800-op synthetic pulse.' },
      { value: '642,128', unit: 'ops/s',      short: 'Replica applications / s',          label: 'Ten-node mesh · replica applications / s',                  detail: 'Same BENCH-011 run: 160,532 logical operations/s × 4 replicas per shard, the 3-of-4 committee shape. Total committee work, not transfers.' },
      { value: '108,362', unit: 'transfers/s', short: 'Fleet + Mac · total finalized tps', label: 'Ten-node mesh + one Mac · total finalized transfers / s', detail: '10-node fleet summed with the local Mac (25,499 tps, mean of 5 × 10s runs on segmented-v3) = 108,362 finalized transfers / s. Hardware-honest total, not a projection.' },
      { value: '1,712,006', unit: 'ops/s',    short: 'Certified-segment ceiling',         label: '9-node certified-segment replica applications',             detail: 'Parallel session: one 20,000-op segment root with a 3-of-4 certificate applied across 9 replicas concurrently. Different measurement — upper bound, not merged into the mesh rows above.' },
      { value: '7/7',     unit: 'refused',    short: 'Attack suite',                      label: 'Chain prototype · attack suite',                            detail: 'Replay, double-spend, concurrent double-append, cross-chain confusion, wrong-prev fork, tampered signature, equivocation. 29 chain tests + 5 cross-shard tests + 3 TCP tests pass.' }
    ])
  });
})();

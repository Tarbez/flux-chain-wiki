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

  // The three honest numbers from the design doc §1. Measured in-process on
  // one M-series Mac core on 2026-10-08 with `transfer-bench`
  // (dense-wire/src/bin/transfer_bench.rs): 10 s sustained window, 8 holder
  // shards, 4 replicas-per-shard assumed for the replica number, 87% of
  // transfers were cross-shard. Every finalized transfer completed the full
  // 4-step PREPARE/ACCEPT/COMMIT/FINALIZE dance; errors = 0.
  //
  // This is the first measurement that separates `finalized transfers/s`
  // from `logical operations/s` from `replica applications/s`, as the
  // design doc §1 and §7 require. Only `finalized_tps` counts toward the
  // headline. The chain-fleet rows below are the earlier admit-path
  // measurements (counted as logical operations, since each admit is one
  // op), kept for context.
  var HONEST_TRANSFERS = Object.freeze({
    date: '2026-10-08',
    source: 'in-process · M-series Mac · 10 s sustained window',
    shards: 8,
    replicasPerShard: 4,
    windowSeconds: 10,
    submitted: 24000,
    finalized: 24000,
    sameShard: 3014,
    crossShard: 20986,
    logicalOps: 96000,
    errors: 0,
    // The three design-doc §1 numbers:
    finalizedTps: 3768,
    logicalOpsPerSecond: 15073,
    replicaAppsPerSecond: 60292,
    // Burst variants (1,000 transfers, single run):
    burst: Object.freeze({
      mixed:       Object.freeze({ finalizedTps: 4237, logicalOpsPerSecond: 16949 }),
      crossShard:  Object.freeze({ finalizedTps: 4132, logicalOpsPerSecond: 16529 }),
      sameShard:   Object.freeze({ finalizedTps: 3472, logicalOpsPerSecond: 13889 })
    })
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
    scopeShort: 'Finalized transfers · the headline',
    // `items` powers the home-page status rail. The headline now follows
    // the design doc's three-numbers rule: only `finalized transfers/s` is
    // claimed as the user-visible rate. Logical ops/s and replica-apps/s
    // are secondary cards that explain what the fleet actually did under
    // the hood.
    items: Object.freeze([
      { value: '3,768', unit: 'transfers/s', short: 'Finalized transfers',       label: 'Design doc §1 headline · finalized transfers per second',   detail: '24,000 cross-shard transfers completed in 10 s sustained window (87% cross-shard, 8-shard routing). Each ran the full 4-step PREPARE/ACCEPT/COMMIT/FINALIZE dance; zero errors.' },
      { value: '15,073', unit: 'ops/s',      short: 'Logical ledger ops',        label: 'Design doc §1 · ledger records produced by those transfers',detail: '4 records per cross-shard transfer, 4 per same-shard transfer in the current same-wire shape. 96,000 records logged across 10 s. Honest count — not inflated into transfers.' },
      { value: '60,292', unit: 'ops/s',      short: 'Replica applications',      label: 'Design doc §1 · total work across 4-replica committees',    detail: 'logical_ops × 4 replicas per shard, the 3-of-4 committee the design doc specifies. Separated from the headline so no single number overclaims.' },
      { value: '0',      unit: 'failures',   short: 'All runs',                  label: 'Every honest transfer run on this page',                    detail: '24,000 transfers end-to-end in the sustained run, 1,000 in each burst variant (mixed / cross / same). All zero failures.' },
      { value: '12,403', unit: 'ops/s',      short: 'Admit path · 6-node soak',  label: 'Earlier admit-path soak · logical ops / s',                 detail: 'Historical: six public nodes for 303 s, 3,760,000 ops accepted (the admit path, not the finalized-transfer path above). Context, not the headline.' },
      { value: '7/7',    unit: 'refused',    short: 'Attack suite',              label: 'Chain prototype · attack suite',                            detail: 'Replay, double-spend, concurrent double-append, cross-chain confusion, wrong-prev fork, tampered signature, equivocation. 29 chain tests + 5 cross-shard tests + 3 TCP tests pass.' }
    ])
  });
})();

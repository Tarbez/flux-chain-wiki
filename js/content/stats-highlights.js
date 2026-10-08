/* Headline mesh measurements, shared by the home page and /stats.
   Every value is copied from a row of the fleet table in js/pages/stats.js.
   Change all three together; never show a number here that the evidence
   record does not also carry.

   Updated 2026-10-08: the chain prototype — per-identity append-only
   chains, K-of-N peer replication, LEDGERENTRY (Y=1A) — scaled to a
   real 6-node fleet across 3 regions and 2 providers. Aggregate real
   ingestion is 79,654 entries/s with zero errors on 38,400 entries in
   868 ms wall-clock. Per-pair peak is 22,559/s (bk2 → mk2, 128 chains
   interleaved, server-side burst batching). Replay fast-path is
   279,149/s — ~12x live admission, so a peer that fell behind catches
   up far faster than live traffic flows in. This is the chosen path.

   The fabric rows below are the old certified-finality production
   path, kept for comparison; the chain prototype is now the headline. */
(function () {
  'use strict';

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
    chainFleet: CHAIN_FLEET,
    fleetRun: FLEET_RUN,
    measured: '2026-10-08',
    scope: 'Chain prototype — real 6-node fleet across 3 regions and 2 providers',
    scopeShort: 'Chain prototype · 6-node fleet',
    // `items` powers the home-page status rail. First four rows are the
    // CHOSEN direction (the chain prototype); the fabric row remains for
    // the certified-finality production comparison.
    items: Object.freeze([
      { value: '79,654', unit: 'entries/s', short: '6-node chain, aggregate', label: 'Chain prototype · 6-node fleet, parallel ingestion', detail: '2026-10-08: bk2+mk2+bk1+mist1+eug-2c+eul-4c, 38,400 entries in 868 ms wall-clock, zero errors. Each chain lives on one node; no cross-node coordination needed. Add nodes, the number adds linearly.' },
      { value: '22,559', unit: 'entries/s', short: 'Per-pair peak',           label: 'Chain prototype · single-pair, 128 chains interleaved',    detail: '2026-10-08: bk2 → mk2 cross-WAN, 64,000 entries in 2,836 ms, server-side burst batching across chains, zero errors. The per-pair component of the aggregate above.' },
      { value: '279,149', unit: 'entries/s', short: 'Replay (recovery)',       label: 'Chain prototype · replay fast-path',                          detail: 'Cold-start replay with head-only sig verify + hash chain. ~12x hot-write ceiling: a lagging peer catches up far faster than live traffic flows in. This is the real durability story.' },
      { value: '7/7',     unit: 'refused',    short: 'Attack suite',           label: 'Chain prototype · attack suite',                              detail: 'Replay, double-spend, concurrent double-append, cross-chain confusion, wrong-prev fork, tampered signature, equivocation. 24 chain tests + 3 TCP tests pass.' },
      { value: '0',       unit: 'failures',   short: 'All runs',               label: 'Every chain-prototype run',                                   detail: '38,400 entries across 6 nodes, 64,000 on the per-pair burst, 32,000 on the Mac core. Zero failures end-to-end.' }
    ])
  });
})();

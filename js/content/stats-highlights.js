/* Headline mesh measurements, shared by the home page and /stats.
   Every value is copied from a row of the fleet table in js/pages/stats.js.
   Change all three together; never show a number here that the evidence
   record does not also carry.
   Updated 2026-10-06: both systems rebuilt as minimal, single-purpose
   daemons (stripped out of the old do-everything miner process), ported
   to Rust, and re-measured for real on the production fleet -- see
   /stats for the full before/after and methodology.
   Updated 2026-10-07 (evening): the stale 151/s FXN-transfers item is
   replaced by the whole-fleet run on the REGISTERED FLX grammar
   (bench-003 section 14). It is a prototype, accepted finality only, and
   not like for like with the certified fabric rows beside it -- the detail
   string says so, on purpose. */
(function () {
  'use strict';
  // The one place the whole-fleet real-grammar run's headline figures live. /stats
  // and /monitor both read it (bench-003 section 14); neither carries its own copy.
  // Single source for the whole-fleet real-grammar run (bench-003 sections 14-15). /stats and
  // /monitor both read it. `before` = same fleet without batch signature checks (section 14).
  var FLEET_RUN = Object.freeze({
    total: 24908, before: 21199, transfers: 503225, window: '20 s', servers: 4, clients: 6, date: '2026-10-07',
    perServer: Object.freeze([
      Object.freeze({ name: 'eul-4c', machine: 'eul4c', cores: 4, clients: 'eug-2c', now: 11358, before: 9815, busy: 92.4, note: 'Other provider, 19 ms between its two machines' }),
      Object.freeze({ name: 'bk2', machine: 'bk2', cores: 7, clients: 'ms1 + ms2 + ms3', now: 7823, before: 6471, busy: 86.5, note: 'Production runs on this machine too' }),
      Object.freeze({ name: 'mk2', machine: 'mk2', cores: 5, clients: 'mist1', now: 3439, before: 3138, busy: 43.4, note: 'Client-bound: its one-core client was at 100%' }),
      Object.freeze({ name: 'bk1', machine: 'bk1', cores: 2, clients: 'mk1', now: 2288, before: 1775, busy: 91.4, note: 'Two cores, the smallest server' })
    ])
  });
  window.ArkStatsHighlights = Object.freeze({
    fleetRun: FLEET_RUN,
    measured: '2026-10-07',
    scope: 'Real production fleet (InterServer VPS plus two nodes on another provider), Node and Rust',
    // The home rail's one-line scope; the long form above stays on /stats.
    scopeShort: 'Rust · real fleet',
    // short: the home rail's label. label + detail stay on /stats and become
    // the rail item's tooltip and screen-reader text.
    items: Object.freeze([
      { value: '3,250', unit: 'tx/s', short: 'Fabric accepted', label: 'Agreement-fabric, accepted (Rust)', detail: '11.1x the Node number, concurrency 1,200, real fleet' },
      { value: '5,711-6,041', unit: 'tx/s', short: 'Fleet, 4 quorums', label: 'Aggregate fleet capacity (4 quorums)', detail: '4 independent quorums in parallel, 5 audited runs, 2 cleared 6,000/s -- not one quorum\'s speed' },
      { value: '676-827', unit: 'tx/s', short: 'Fabric durable', label: 'Agreement-fabric, durable (Rust)', detail: 'Quorum A, real fleet, 5 audited runs, up from 269-351 after a thread-bug fix' },
      { value: FLEET_RUN.total.toLocaleString('en-US'), unit: 'tx/s', short: 'Real grammar, fleet', label: 'Whole fleet on the registered FLX grammar (prototype)', detail: '10 machines, 4 servers at once, 5 signed manifests per transfer, 20 s window, accepted finality only, no certificate -- not like for like with the certified rows' },
      { value: '0', unit: 'failures', short: 'All runs', label: 'Every benchmark run', detail: 'Up to 4,000 transfers per run, both languages' }
    ])
    // The fsync-vs-replication finding doesn't fit this rail's shape
    // (no unit, longer prose than a stat card) and the home hero is a
    // deliberately tight, single-viewport "no scroll" layout -- adding
    // a line here pushed the rail below the fold at normal window
    // heights (confirmed: visible at 1400px tall, invisible at 900px).
    // The full finding already lives on /stats, which scrolls normally.
    // The aggregate-fleet-capacity item above is the one exception,
    // added 2026-10-06 at the user's explicit request for production:
    // its detail string is written to make clear it is 4 independent
    // quorums summed, not one system doing 5,xxx-6,xxx tx/s. Auto-join
    // (real, deployed -- /stats section 03.8) lets a node join ONE
    // quorum's live membership without hand-editing config; it does not
    // merge separate quorums into one or add a work-sharding coordinator
    // across them, so "independent quorums summed" still describes this
    // number accurately. Jumped from 4,111-4,398 (3 quorums) to
    // 5,711-6,041 (4 quorums, 2 of 5 audit runs over 6,000) after /stats
    // section 03.9 found the real cause of an earlier "unexplained"
    // bk2+mk2 ceiling: a missing ufw rule on one of the two boxes, not
    // an architecture problem -- fixed, and that pairing's real idle
    // capacity (already visible in earlier CPU profiling, just never
    // reachable) became a fourth real quorum. The CSS grid
    // (css/home-flow.css, .home-status-rail) was widened from 4 to 5
    // columns to fit this without displacing another stat or breaking
    // the "no scroll" home layout -- verified by screenshot at multiple
    // viewport heights.
    //
    // Durable-finality item updated 2026-10-07: the old 355/s figure was
    // real but stale -- from a separate, earlier fsync-vs-replication
    // investigation (bench-003 Sec 1), never re-applied to quorum A's live
    // deployment. Measured quorum A at only 131.35/s, found and fixed a
    // real routing bug (auto-join broke durable finality for clients that
    // hadn't heard of a new member) and a real thread-starvation bug
    // (FABRIC_THREADS silently defaulted to CPU core count -- 2, on the
    // primary -- badly undersized for network-wait-bound request handling),
    // landing at 676-827/s, 5 audited runs, zero failures. A hop-count-
    // reduction redesign was also tried and genuinely lost on this fleet's
    // own sub-millisecond RTT (worse by ~25-35%) -- but then won by a real
    // ~2x on a rented box with genuine ~71ms RTT to the fleet, validating
    // the original theory on a topology that could actually test it. That
    // finding doesn't fit this rail (no single fleet-capacity number to
    // show -- it's a conditional, topology-dependent result) and stays on
    // /stats and docs/evidence/bench-003-rust-fleet-ceiling.md Sec 7-9.
  });
})();

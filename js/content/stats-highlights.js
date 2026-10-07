/* Headline mesh measurements, shared by the home page and /stats.
   Every value is copied from a row of the fleet table in js/pages/stats.js.
   Change all three together; never show a number here that the evidence
   record does not also carry.
   Updated 2026-10-06: both systems rebuilt as minimal, single-purpose
   daemons (stripped out of the old do-everything miner process), ported
   to Rust, and re-measured for real on the production fleet -- see
   /stats for the full before/after and methodology. */
(function () {
  'use strict';
  window.ArkStatsHighlights = Object.freeze({
    measured: '2026-10-06',
    scope: 'Real production fleet (InterServer VPS), Node and Rust head to head',
    items: Object.freeze([
      { value: '3,250', unit: 'tx/s', label: 'Agreement-fabric, accepted (Rust)', detail: '11.1x the Node number, concurrency 1,200, real fleet' },
      { value: '4,126-4,181', unit: 'tx/s', label: 'Aggregate fleet capacity (3 quorums)', detail: '3 independent quorums run in parallel, summed -- not one quorum\'s speed' },
      { value: '355', unit: 'tx/s', label: 'Agreement-fabric, durable (Rust)', detail: 'Replication-backed, no redundant fsync; 2.5x the Node number' },
      { value: '151', unit: 'tx/s', label: 'FXN value-object transfers (Rust)', detail: '1.1x the Node number, same real fleet' },
      { value: '0', unit: 'failures', label: 'Every benchmark run', detail: 'Up to 4,000 transfers per run, both languages' }
    ])
    // The fsync-vs-replication finding doesn't fit this rail's shape
    // (no unit, longer prose than a stat card) and the home hero is a
    // deliberately tight, single-viewport "no scroll" layout -- adding
    // a line here pushed the rail below the fold at normal window
    // heights (confirmed: visible at 1400px tall, invisible at 900px).
    // The full finding already lives on /stats, which scrolls normally.
    // The aggregate-fleet-capacity item above is the one exception,
    // added 2026-10-06 at the user's explicit request for production:
    // its detail string is written to make clear it is 3 independent,
    // uncoordinated quorums summed by hand (no auto-join, no shared
    // ledger, no work-sharding coordinator exists) -- never read this
    // value as "one system doing 4,126 tx/s". Full nuance and both
    // confirmed concurrent-run numbers are in /stats section 03.7;
    // the CSS grid (css/home-flow.css, .home-status-rail) was widened
    // from 4 to 5 columns to fit this without displacing another stat
    // or breaking the "no scroll" home layout -- verified by screenshot
    // at multiple viewport heights, not assumed safe.
  });
})();

/* Headline mesh measurements, shared by the home page and /stats.
   Every value is copied from a row of the fleet table in js/pages/stats.js,
   which renders docs/evidence/bench-001-verification.md. Change all three
   together; never show a number here that the evidence record does not carry. */
(function () {
  'use strict';
  window.ArkStatsHighlights = Object.freeze({
    measured: '2026-10-06',
    scope: '5-node production fleet · pre-genesis',
    items: Object.freeze([
      { value: '121', unit: 'tx/s', label: 'Accepted finality', detail: 'Quorum-signed · 4,000 transfers' },
      { value: '68', unit: 'tx/s', label: 'Durable finality', detail: '3 validators attest and commit to disk' },
      { value: '718', unit: 'ms', label: 'Median finality', detail: 'Accepted p50 · 4,000 transfers' },
      { value: '0', unit: 'failures', label: 'Quorum runs', detail: 'Every run, up to 4,000 transfers' }
    ])
  });
})();

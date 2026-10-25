/* The two scales of the stats section's one canyon (js/world/stats-stage.js draws with them, js/pages/world-stats.js labels with them).
   One file, so the 3D and the words beside it cannot disagree about where 10 ms or 20,000 swaps a second stands.

   A scale is not a reading. Its numbers (1, 10 and 100 ms; 10,000, 20,000 and 30,000 swaps a second) are marks on a ruler, chosen by the rules below
   from the data's own largest value; tests/world-stats.cjs derives them again by an independent rule and allows those marks and no other new number.

   latency   log10, from 1 ms to 100 ms. A reading outside the ruler is drawn at its end and says so (clamped), never off the ruler and never rescaled.
   linear    a ruler for a count or a rate: 0 up to the first whole step at or above the largest value, in steps of 1, 2 or 5 times a power of ten, at most four ticks. */
(function () {
  'use strict';
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  var LATENCY = { min: 1, max: 100, ticks: [1, 10, 100] };
  LATENCY.at = function (ms) { return clamp01(Math.log(Math.max(ms, LATENCY.min) / LATENCY.min) / Math.log(LATENCY.max / LATENCY.min)); };
  LATENCY.clamped = function (ms) { return ms < LATENCY.min || ms > LATENCY.max; };
  /* a ruler from 0 to the first whole step at or above `max`: { top, step, ticks: [step, 2 step, ...], at(value) }. The step is the smallest of 1, 2 and 5 times a power of
     ten that gives at most four ticks, so a ruler never crowds. */
  function linear(max) {
    var p = Math.pow(10, Math.floor(Math.log(max) / Math.LN10) - 1), step = p, mult = [1, 2, 5];
    for (var i = 0; Math.ceil(max / step - 1e-9) > 4; i++) step = mult[i % 3] * Math.pow(10, Math.floor(i / 3)) * p;
    var n = Math.ceil(max / step - 1e-9), ticks = [];
    for (var j = 1; j <= n; j++) ticks.push(Math.round(step * j * 1e6) / 1e6);
    var top = ticks[ticks.length - 1];
    return { top: top, step: step, ticks: ticks, at: function (v) { return clamp01(v / top); } };
  }
  /* The operations of the capabilities station, from the operation matrix (stats-highlights.js operations.rows): an operation is the words of a row
     before its comma ("Swap, batched auction" is Swap), its variants the rows that share them, in the order the matrix lists them. Derived here once,
     so the 3D and the card group the same rows the same way, and a new row joins its operation by its name alone. */
  function operations(rows) {
    var out = [];
    (rows || []).forEach(function (r) {
      var op = String(r.op), cut = op.indexOf(','), name = (cut < 0 ? op : op.slice(0, cut)).trim(), variant = cut < 0 ? '' : op.slice(cut + 1).trim();
      var g = out.filter(function (x) { return x.name === name; })[0];
      if (!g) { g = { id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: name, rows: [] }; out.push(g); }
      g.rows.push({ op: op, variant: variant, rate: r.rate, unit: r.unit, note: r.note });
    });
    return out;
  }
  /* one cube stands for this many a second on the stations that count rates (capabilities, one node, the fleet) */
  var CUBE_RATE = 1000;
  window.ArkStatsScale = { latency: LATENCY, linear: linear, operations: operations, CUBE_RATE: CUBE_RATE };
})();

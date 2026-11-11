/* DEFXN site content: the speed facts table. Pure data, no dependencies.
   Layer: app (site content).
   2026-11-10 (owner, relayed by FXN Genesis): a page shows only numbers measured on the build that goes to devnet,
   release 1 of kernel main 63353a01, and no number is typed by hand. No rate or time has been measured on that release,
   and the perf resolver that files KPERF1 and KPERF2 records is not in release 1 yet. So this table holds no rows: every
   speed block reads `note`. The 30 typed rows it held (prototype ladders, pre-release keeper runs) left that day; the
   audit that removed them is docs/design/space/CLAIMS-AUDIT-2026-11-10.md, and their sources stay in
   /Volumes/PortableSSD/docs/fxn-vs-osf-2026-10-31/. A row comes back only from a KPERF record read from the chain,
   with that record's build and device (PERF_RESULTS, PERF_RUNS). */
(function () {
  var speedFacts = {
    asOf: null,
    note: 'Not measured yet on the devnet release. Measured after devnet starts.',
    rows: [],
    notMeasured: []
  };

  window.ArkUI = window.ArkUI || {};
  window.ArkUI.speedFacts = speedFacts;
  window.DEFXN_SPEED_FACTS = speedFacts;
})();

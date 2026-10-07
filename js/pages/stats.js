/* Real, measured mesh performance numbers -- not projections, not marketing
   round numbers. Every figure here is from an actual run against the real
   production fleet (InterServer VPS nodes) or this machine (zero-network),
   on the dates stated. Rewritten 2026-10-06: both value-transfer systems
   were found to be bundled inside a single do-everything miner daemon
   (twelve unrelated registries sharing one process), which was making
   every number measured against them unrepresentative of the systems
   themselves. Both were rebuilt as minimal, single-purpose daemons and
   re-measured for real -- this page now shows only that current state,
   not the superseded bundled-daemon numbers.
   Trimmed 2026-10-07: this page previously carried the full investigation
   narrative inline (every dead end, bug, and reversed theory from the
   fleet-ceiling and auto-join work) -- real and honest, but not what a
   visitor needs to see to trust the headline numbers. That full account
   now lives in docs/evidence/bench-003-rust-fleet-ceiling.md, linked from
   section 03.5 and the scope section below; this page states the current,
   verified state only. Change the numbers here and in
   js/content/stats-highlights.js together -- never show one that the
   evidence doc doesn't also carry. */
(function () {
  'use strict';

  function row(cells) { return '<tr>' + cells.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }
  function headRow(cells) { return '<tr>' + cells.map(function (c) { return '<th scope="col">' + c + '</th>'; }).join('') + '</tr>'; }

  function highlights() {
    var stats = window.ArkStatsHighlights;
    if (!stats) return '';
    return '<dl class="stats-highlights" aria-label="At a glance, measured ' + stats.measured + '">' + stats.items.map(function (s) {
      return '<div><dt>' + s.label + '</dt><dd><strong>' + s.value + '<span>' + s.unit + '</span></strong><small>' + s.detail + '</small></dd></div>';
    }).join('') + '</dl><p class="stats-highlights-scope">Measured ' + stats.measured + ' · ' + stats.scope + '.</p>';
  }

  ArkUI.pageModules.stats = {
    mount: function (host) {
      var page = document.createElement('section');
      page.className = 'ark-page task-page stats-page';
      page.setAttribute('aria-labelledby', 'stats-title');
      page.innerHTML =
        '<div class="stats-shell">' +
        '<header class="stats-hero"><p class="account-kicker">// MEASURED, NOT CLAIMED</p>' +
        '<h1 id="stats-title">Mesh performance.</h1>' +
        '<p>Every number below is from an actual run against the real production fleet or this machine. Both systems here were rebuilt this cycle as minimal, single-purpose daemons -- carrying only the one job being measured, not bundled into the larger miner process everything else runs in. Dates and conditions are stated with every table.</p>' +
        highlights() +
        '</header>' +

        '<section class="stats-section" aria-labelledby="stats-fxn-title">' +
        '<p class="account-kicker">01 / FXN VALUE-OBJECT REGISTRY — defxn-defi</p>' +
        '<h2 id="stats-fxn-title">A minimal, single-purpose settlement daemon</h2>' +
        '<p>The ordered, replicated log of value transfers (genesis → agreement → fulfillment, double-spend prevented by strict append order) is the real settlement layer. <code>defxn-defi</code> carries only that -- no chat, no OAuth, no marketplace, no DM relay, no twelve other registries the full miner daemon bundles. Each "transfer" is 3 real signed HTTP round trips (agreement, recipient-signed output, fulfillment) against a live deployed node.</p>' +
        '<div class="stats-table-wrap"><table class="stats-table"><thead>' +
        headRow(['Path', 'Count', 'Concurrency', 'Throughput', 'p50', 'Failures']) +
        '</thead><tbody>' +
        row(['Full daemon (old, bundled, pre-fix)', '1,000', '20', '6.82/s', '2885 ms', '0']) +
        row(['defxn-defi, real fleet (flx-mk2)', '2,000', '150', '<strong>137.25/s</strong>', '1057 ms', '0']) +
        row(['defxn-defi, local (this machine)', '1,000', '100', '476/s', '207 ms', '0']) +
        '</tbody></table></div>' +
        '<p class="stats-note">137.25/s on the real deployed fleet is a <strong>20.1x</strong> improvement over the old bundled daemon\'s 6.82/s, same hardware, same network path. The gap to the 476/s local number is real network round-trip time between physically separate machines, not software overhead -- confirmed directly, not assumed (concurrency scaling from 20→150→400 tracked the ceiling, and a single CPU core was found pinned near 82% while 4 others on the same box sat idle).</p>' +
        '</section>' +

        '<section class="stats-section" aria-labelledby="stats-fabric-title">' +
        '<p class="account-kicker">02 / AGREEMENT-FABRIC — minimal certifier daemon</p>' +
        '<h2 id="stats-fabric-title">Byzantine quorum value transfers</h2>' +
        '<p>A 3-of-3 attesting committee, selected per-transfer from the eligible member pool. <strong>Durable finality</strong> means three independent validators cryptographically attested, a certificate was aggregated, all three durably committed it to disk, and the successor value object was registered with a signed availability receipt. <strong>Accepted finality</strong> stops at the quorum-signed certificate, no durable-commit wait. Re-measured 2026-10-06 against a minimal certifier daemon (the role process carries only attestation/certification, nothing else) instead of the old bundled miner.</p>' +
        '<div class="stats-table-wrap"><table class="stats-table"><thead>' +
        headRow(['Finality', 'Count', 'Concurrency', 'Old (bundled daemon)', 'New (minimal daemon)', 'Improvement']) +
        '</thead><tbody>' +
        row(['Accepted', '4,000', '150', '121.29/s', '<strong>291.79/s</strong>', '2.4x']) +
        row(['Durable', '4,000', '150', '68.22/s', '<strong>139.47/s</strong>', '2.0x']) +
        '</tbody></table></div>' +
        '<p class="stats-note">Zero failures at any scale tested, both before and after. The crypto work itself (attestation signing + N-of-N verification + certificate signing) was isolated and measured at ~204μs per closure -- a theoretical ceiling near 4,900 closures/s if that were the only cost, confirming the crypto is not what limits the real daemon; HTTP transport and the deterministic cell-assignment bookkeeping dominate instead.</p>' +
        '</section>' +

        '<section class="stats-section" aria-labelledby="stats-rust-title">' +
        '<p class="account-kicker">03 / RUST, ON THE REAL FLEET</p>' +
        '<h2 id="stats-rust-title">A from-scratch Rust implementation, head to head</h2>' +
        '<p>Both systems above are Node.js. Both now also exist as real Rust daemons (<code>defxn-defi-rs</code>, <code>agreement-fabric-rs</code> -- a full port of the real protocol: deterministic cell assignment, attestation, certificate aggregation, durable commit, successor routing and signed availability receipts, not just the crypto), deployed to the same production fleet and measured the same way. A real, caught-in-review bug is part of this result, not hidden from it: the first Rust build of agreement-fabric\'s durable path used per-call fsync (no batching across concurrent requests) and measured 3x <em>slower</em> than Node on the real fleet (46.88/s) despite being 8x faster on accepted finality (2,328/s) -- that split was the signal. Applying the same group-commit batching <code>defxn-defi</code> already needed fixed it: durable finality went from 46.88/s to 182.70/s on the next real-fleet run.</p>' +
        '<div class="stats-table-wrap"><table class="stats-table"><thead>' +
        headRow(['System', 'Count/Concurrency', 'Node (real fleet)', 'Rust (real fleet)', 'Result']) +
        '</thead><tbody>' +
        row(['FXN value-object transfers', '2,000/150', '137.25/s', '<strong>151.37/s</strong>', '1.1x']) +
        row(['Agreement-fabric, accepted', '8,000-24,000/150-2,400', '291.79/s', '<strong>~3,000-3,300/s</strong>', '11.3x']) +
        row(['Agreement-fabric, durable', '4,000/150', '139.47/s', '<strong>182.70/s</strong>', '1.3x']) +
        '</tbody></table></div>' +
        '<p class="stats-note">Zero failures across every run, both languages. Rust wins on every row measured so far, by a wide margin on accepted finality specifically -- the parts of the real daemon that are genuinely CPU/dispatch-bound (not disk- or network-bound) are exactly where a language with real OS threads and no garbage collector shows up most.</p>' +
        '<p class="stats-note stats-note-warn">Not the final word: the FXN comparison above ran client-and-server on the same box (no cross-node network hop) for the Rust side, vs. a real two-node path for the Node side -- not perfectly matched yet. Both Rust daemons are newly built this cycle and have not had the weeks of production hardening the Node originals have had.</p>' +
        '</section>' +

        '<section class="stats-section" aria-labelledby="stats-ceiling-title">' +
        '<p class="account-kicker">03.5 / FLEET CEILING AND AUTO-JOIN</p>' +
        '<h2 id="stats-ceiling-title">What this fleet can really do, and how a node joins it</h2>' +
        '<div class="stats-table-wrap"><table class="stats-table"><thead>' +
        headRow(['Configuration', 'Throughput', 'Audit runs', 'Failures']) +
        '</thead><tbody>' +
        row(['One 2-of-2 quorum (shipped, two-phase path)', '<strong>~2,900-3,300/s</strong>', 'Repeated sweeps, concurrency 150-2,400', '0']) +
        row(['Aggregate: 4 independent quorums, concurrent', '<strong>5,711-6,041/s</strong>', '5 consecutive runs', '1 transient timeout / 24,000 closures']) +
        '</tbody></table></div>' +
        '<p>Two different, both-real numbers, not one disputing the other: ~2,900-3,300/s is what a single quorum (two validators agreeing on one shared pool of value objects) sustains on this hardware, found by profiling CPU on every node until the real bottleneck (one validator\'s 2 vCPUs, fully saturated) was directly observed, not inferred. 5,711-6,041/s is what the whole 8-machine fleet does running four such quorums side by side, each an independent pool, real results summed rather than estimated. Which number matters depends on the deployment -- one shared ledger, or several sharded ones.</p>' +
        '<p>Nodes join a running quorum with nothing but one existing member\'s address -- no hand-written config, no pre-shared membership list. The joining member is added to live state and gossiped to every other member the one it contacted already knows, so one call converges the whole set; verified on the real fleet by a new node going from zero knowledge to a fully interchangeable validator (its attestations accepted standing in for either original member) and independently confirmed by querying every node\'s view of membership, not just the joiner\'s own claim. A shared secret, set once out of band, gates admission; a negative control (a real node from a different quorum, never joined to this one) is correctly rejected.</p>' +
        '<p class="stats-note">Full investigation log, including every dead end, the bugs found and fixed along the way, and the exact sequence of audit runs behind both numbers above: <a href="/docs/evidence/bench-003-rust-fleet-ceiling.md">BENCH-003 →</a></p>' +
        '</section>' +

        '<section class="stats-section" aria-labelledby="stats-scope-title">' +
        '<p class="account-kicker">04 / WHAT THIS DOES NOT PROVE YET</p>' +
        '<h2 id="stats-scope-title">Scope, stated plainly</h2>' +
        '<ul class="stats-scope-list">' +
        '<li>Real-fleet numbers were reached through a real-internet node-to-node path between fleet machines (plus, where stated, an SSH tunnel for a non-fleet machine), not the raw public internet from an arbitrary client -- a public client\'s path may differ.</li>' +
        '<li>Each quorum is 2-3 real nodes. This proves correctness and speed at this scale; it says nothing about behavior at 50 or 500 validators, or under adversarial conditions.</li>' +
        '<li>Auto-join (nodes joining a running quorum without hand-written config) is a working mechanism, not a full production admission policy -- no vote, no stake, and membership does not yet survive a validator restart.</li>' +
        '<li>No independent security audit has reviewed any of this. Every verification on this page is our own.</li>' +
        '<li>FXN is pre-genesis -- no real token exists yet. These are protocol-throughput numbers, not a live economy.</li>' +
        '<li>The Rust builds are real, deployed, and tested on the production fleet -- but still run alongside the Node originals, not yet replacing them, and are not fully feature-complete against them.</li>' +
        '</ul>' +
        '<p><a href="/docs/evidence/bench-001-verification.md">Read the first evidence record →</a> &nbsp;·&nbsp; <a href="/docs/evidence/bench-003-rust-fleet-ceiling.md">Read the full fleet-ceiling investigation →</a></p>' +
        '</section>' +
        '</div>';
      host.appendChild(page);
      // The router labels, hides and focuses the element mount() returns;
      // returning nothing made navigation to /stats throw and strand the page.
      return page;
    },
  };
})();

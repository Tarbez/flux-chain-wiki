/* Real, measured mesh performance numbers -- not projections, not marketing
   round numbers. Every figure here is from an actual run against either
   this machine (zero-network) or the real 5-6 node InterServer VPS fleet
   (reached over SSH tunnel / the live flux0 WireGuard mesh), on the dates
   stated. See docs/evidence/bench-001-verification.md for the full
   methodology this page summarizes -- this file is the public-facing
   rendering of that record, not a second source of truth for it. Update
   both together; never let this page assert a number the evidence record
   does not also carry. */
(function () {
  'use strict';

  function row(cells) { return '<tr>' + cells.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }
  function headRow(cells) { return '<tr>' + cells.map(function (c) { return '<th scope="col">' + c + '</th>'; }).join('') + '</tr>'; }

  ArkUI.pageModules.stats = {
    mount: function (host) {
      var page = document.createElement('section');
      page.className = 'ark-page task-page stats-page';
      page.setAttribute('aria-labelledby', 'stats-title');
      page.innerHTML =
        '<div class="stats-shell">' +
        '<header class="stats-hero"><p class="account-kicker">// MEASURED, NOT CLAIMED</p>' +
        '<h1 id="stats-title">Mesh performance.</h1>' +
        '<p>Every number on this page came from an actual run, against either this machine (zero-network, in-process) or the real production fleet (5-6 real InterServer VPS nodes, reached over SSH tunnel or the live WireGuard mesh). Dates and conditions are stated with every table. Nothing here is a projection.</p>' +
        '</header>' +

        '<section class="stats-section" aria-labelledby="stats-fabric-title">' +
        '<p class="account-kicker">01 / AGREEMENT-FABRIC QUORUM</p>' +
        '<h2 id="stats-fabric-title">Byzantine quorum value transfers</h2>' +
        '<p>A 3-of-3 attesting committee, selected per-transfer from the eligible member pool. <strong>Durable finality</strong> means three independent validators cryptographically attested, a certificate was aggregated, all three durably committed it to disk, and the successor value object was registered with a signed availability receipt — the expensive, honest version of "done". <strong>Accepted finality</strong> stops at the quorum-signed certificate, no durable-commit wait — the softer number most published blockchain TPS figures actually measure.</p>' +

        '<h3>Real production fleet (5 nodes: flx-bk1, flx-mist1, flx-ms1, flx-ms2, flx-mk1), 2026-10-06</h3>' +
        '<div class="stats-table-wrap"><table class="stats-table"><thead>' +
        headRow(['Finality', 'Count', 'Concurrency', 'Throughput', 'p50', 'p95', 'p99', 'p999', 'Max', 'Failures']) +
        '</thead><tbody>' +
        row(['Durable', '20', '1', '0.95/s', '1028 ms', '1281 ms', '1627 ms', '1627 ms', '1627 ms', '0']) +
        row(['Durable', '225', '75', '39.22/s', '1420 ms', '1978 ms', '2274 ms', '2387 ms', '2387 ms', '0']) +
        row(['Durable', '4,000', '150', '68.22/s', '1616 ms', '2705 ms', '3071 ms', '3329 ms', '3394 ms', '0']) +
        row(['Accepted', '20', '1', '2.33/s', '378 ms', '667 ms', '702 ms', '702 ms', '702 ms', '0']) +
        row(['Accepted', '225', '75', '83.20/s', '594 ms', '880 ms', '910 ms', '1042 ms', '1042 ms', '0']) +
        row(['Accepted', '400', '150', '83.99/s', '863 ms', '2496 ms', '2617 ms', '2710 ms', '2710 ms', '0']) +
        row(['Accepted', '4,000', '150', '121.29/s', '718 ms', '1642 ms', '2159 ms', '2267 ms', '2304 ms', '0']) +
        '</tbody></table></div>' +
        '<p class="stats-note">Throughput held or improved at higher volume in every run — 4,000-transfer runs outperformed their 225/400-transfer counterparts in both modes, with zero failures at any scale tested. Concurrency 75 → 150 plateaued for accepted finality (83.20/s → 83.99/s at the smaller count) — that is the real ceiling at this fleet size, not a measurement gap.</p>' +

        '<h3>Local, zero-network (this machine, 5 in-process members, real HTTP/2 inter-validator traffic over loopback)</h3>' +
        '<div class="stats-table-wrap"><table class="stats-table"><thead>' +
        headRow(['Finality', 'Count', 'Concurrency', 'Throughput', 'p50', 'p95', 'p99', 'p999', 'Max', 'Failures']) +
        '</thead><tbody>' +
        row(['Durable', '500', '100', '374.92/s', '223 ms', '317 ms', '329 ms', '336 ms', '336 ms', '0']) +
        row(['Accepted', '500', '100', '891.67/s', '100 ms', '122 ms', '125 ms', '126 ms', '126 ms', '0']) +
        '</tbody></table></div>' +
        '<p class="stats-note">This isolates the protocol\'s own compute/signing cost from real internet latency — the gap between this and the fleet numbers above is mostly network round-trip time between 5 separate physical machines, not software overhead.</p>' +
        '</section>' +

        '<section class="stats-section" aria-labelledby="stats-registry-title">' +
        '<p class="account-kicker">02 / FXN MESH VALUE-OBJECT REGISTRY</p>' +
        '<h2 id="stats-registry-title">Identity-directory transfers (light load)</h2>' +
        '<p>A separate, newer system (not the quorum above) — value transfers recorded directly in the mesh identity directory. Each "transfer" below is 3 real signed HTTP round trips (agreement, recipient-signed output, fulfillment) against one real deployed miner.</p>' +
        '<div class="stats-table-wrap"><table class="stats-table"><thead>' +
        headRow(['Target', 'Count', 'Concurrency', 'Throughput', 'Failures']) +
        '</thead><tbody>' +
        row(['Real fleet (flx-bk1)', '200', '25', '21.73/s', '0']) +
        row(['Real fleet (flx-bk1)', '300', '60', '35.31/s', '0']) +
        row(['Real fleet (flx-bk1)', '500', '70', '23.49/s', '0']) +
        row(['Real fleet (flx-bk1)', '400', '120', '29.90/s', '0']) +
        row(['Local (this machine)', '2,000', '70', '93.44/s', '0']) +
        '</tbody></table></div>' +

        '<h3>7,000-transfer run, per node, 2026-10-06 — fleet-only vs. fleet + a 6th local-machine writer</h3>' +
        '<p>Same total volume (7,000 transfers, split across the participating nodes, concurrency 20 per node), run twice: once across the 5 production fleet nodes only (each reached over an SSH tunnel), once with this machine added as a genuine 6th writer on the same shared, replicated log. Full latency distribution per node, not just throughput.</p>' +
        '<p class="account-kicker" style="margin-top:1.5rem">Fleet only (5 nodes, 6,996/7,000 succeeded)</p>' +
        '<div class="stats-table-wrap"><table class="stats-table"><thead>' +
        headRow(['Node', 'Reached via', 'Completed', 'Throughput', 'p50', 'p95', 'p99', 'p999', 'Max', 'Failed']) +
        '</thead><tbody>' +
        row(['flx-bk1', 'SSH tunnel', '1,397', '2.48/s', '8046 ms', '11133 ms', '20291 ms', '21642 ms', '21730 ms', '3']) +
        row(['flx-mist1', 'SSH tunnel', '1,400', '2.74/s', '7163 ms', '10318 ms', '18988 ms', '19549 ms', '19614 ms', '0']) +
        row(['flx-ms1', 'SSH tunnel', '1,399', '2.66/s', '7345 ms', '11055 ms', '23402 ms', '26532 ms', '26723 ms', '1']) +
        row(['flx-ms2', 'SSH tunnel', '1,400', '2.41/s', '7308 ms', '11204 ms', '79370 ms', '85735 ms', '85893 ms', '0']) +
        row(['flx-mk1', 'SSH tunnel', '1,400', '3.98/s', '5085 ms', '8078 ms', '8842 ms', '10550 ms', '10757 ms', '0']) +
        '</tbody></table></div>' +
        '<p class="account-kicker" style="margin-top:1.5rem">Fleet + this machine as a 6th real writer (6/6 nodes reporting; one run did not finish in the session window and is omitted, not papered over)</p>' +
        '<div class="stats-table-wrap"><table class="stats-table"><thead>' +
        headRow(['Node', 'Reached via', 'Completed', 'Throughput', 'p50', 'p95', 'p99', 'p999', 'Max', 'Failed']) +
        '</thead><tbody>' +
        row(['This machine', 'Local (no network hop)', '1,166', '14.91/s', '490 ms', '4250 ms', '23153 ms', '23923 ms', '24171 ms', '0']) +
        row(['flx-mist1', 'SSH tunnel', '1,106', '12.53/s', '1464 ms', '2503 ms', '4550 ms', '4574 ms', '4588 ms', '0']) +
        row(['flx-mk1', 'SSH tunnel', '1,126', '6.34/s', '1674 ms', '3031 ms', '68810 ms', '69075 ms', '69232 ms', '0']) +
        row(['flx-ms1', 'SSH tunnel', '1,126', '5.36/s', '1876 ms', '9166 ms', '85286 ms', '85396 ms', '85399 ms', '0']) +
        row(['flx-bk1', 'SSH tunnel', '1,165', '2.11/s', '9638 ms', '12541 ms', '14024 ms', '15129 ms', '15465 ms', '1']) +
        '</tbody></table></div>' +
        '<p class="stats-note"><strong>The local machine\'s p50 (490ms) vs. the tunneled nodes\' p50 (1,464-9,638ms in the same run) is the real finding here, not a number to be proud of.</strong> A from-scratch speed audit (<a href="/docs/evidence/fxn-speed-audit-v0.md">full doc</a>) traced the cause directly on real fleet hardware: <code>iostat</code> on the worst-performing node showed 90-99% iowait and 65-172ms per disk write, and the node was separately found to be memory-exhausted and swapping (1.6GB RAM, 958MB daemon RSS). The fleet\'s core has since been migrated to properly-provisioned hardware (flx-bk2: 28GB RAM / 7 vCPU, flx-mk2: 20GB RAM / 5 vCPU), and a batching fix (15 Autobase round trips per transfer down to 6) has shipped. <strong>A controlled before/after on the new hardware measured both real: 4.32x throughput from the hardware move, 1.51x from the batching fix alone, 6.53x combined (2.41 → 15.74 tx/s, p50 7308ms → 1120ms) — both sides actually run, not modeled.</strong> Crypto, JSON, and log size were all measured and ruled out as causes. A compression lever was measured too, with a correction: the 47-57% figure elsewhere on this site is from an unrelated natural-language corpus and does not apply to these crypto-heavy records — a real fulfillment record compresses only ~21% per-record (generic gzip already saturates that, since 79% of the record is incompressible signature/hash entropy), but ~50% at the batch level across many distinct records sharing one dictionary. Reaching that requires bundling multiple records per Hypercore write, a scoped design change, not yet built.</p>' +
        '<p class="stats-note stats-note-warn"><strong>Known, disclosed limit:</strong> this registry does not hold up at bulk scale the way the quorum fabric above does. A 10,000-transfer run degraded under sustained load (local: 93 → ~20 → 8.5 tx/s as the run progressed; the real-fleet run stalled outright and had to be killed). A batched write-path fix was shipped and verified (277.5 genesis-object writes/sec, 0 failures) for the <em>seeding</em> side, and — as of 2026-10-06 — for the live 3-step transfer cycle itself (15 Autobase round trips per transfer down to 6, correctness re-verified via real-crypto tests). The 7,000-transfer numbers in the tables above predate that second fix and have not yet been re-run against it. Full detail: <a href="/docs/evidence/bench-001-verification.md">the evidence record</a>.</p>' +
        '</section>' +

        '<section class="stats-section" aria-labelledby="stats-solana-title">' +
        '<p class="account-kicker">02.5 / HOW THIS COMPARES TO SOLANA TODAY</p>' +
        '<h2 id="stats-solana-title">An honest comparison, not a favorable one</h2>' +
        '<p>Solana mainnet-beta, live reading captured 2026-10-06 (<a href="https://solana.com/" rel="noreferrer">public status page</a>) alongside our own real numbers from the tables above, same date. These are not comparable deployments — Solana is a live mainnet with 672 independent validators and real economic stake; defxn\'s FXN registry is a 5-6 node pre-genesis fleet under active development. The gap below is real and currently large. We are publishing it, not hiding it, because the whole point of this page is measured numbers, not marketing ones.</p>' +
        '<div class="stats-table-wrap"><table class="stats-table"><thead>' +
        headRow(['', 'Solana mainnet-beta', 'defxn FXN registry (fleet-only, pre-fix)']) +
        '</thead><tbody>' +
        row(['Throughput', '1,561 non-vote TPS', '~12/s combined, 5 nodes (2.4-4.0/s per node)']) +
        row(['Typical confirmation latency', '~230-270 ms per slot', '5,000-8,000 ms p50 per transfer']) +
        row(['Validators / writer nodes', '672 validators, 442M SOL staked', '5-6 nodes, pre-genesis, no real stake yet']) +
        '</tbody></table></div>' +
        '<p class="stats-note stats-note-warn">At today\'s numbers, Solana is roughly two orders of magnitude faster on both axes. This page previously said a Solana comparison was unverified and blocked by a faucet issue — that is no longer the blocker; the honest comparison is now run and the gap is real. The speed audit (<a href="/docs/evidence/fxn-speed-audit-v0.md">fxn-speed-audit-v0.md</a>) sets a 20-100x improvement target and has identified concrete, measured levers (writer-count topology, batched Autobase round trips) to close part of this gap — none of that work has been re-measured end to end yet, so no revised throughput number is claimed here until it is.</p>' +
        '</section>' +

        '<section class="stats-section" aria-labelledby="stats-scope-title">' +
        '<p class="account-kicker">03 / WHAT THIS DOES NOT PROVE YET</p>' +
        '<h2 id="stats-scope-title">Scope, stated plainly</h2>' +
        '<ul class="stats-scope-list">' +
        '<li>Both "real fleet" surfaces were reached through an SSH tunnel or the private WireGuard mesh, not the raw public internet — a public client\'s path may differ.</li>' +
        '<li>The quorum fabric is 5 real nodes. This proves correctness and speed at this scale; it says nothing about behavior at 50 or 500 validators, or under adversarial conditions.</li>' +
        '<li>No independent security audit has reviewed any of this. Every verification on this page is our own.</li>' +
        '<li>FXN is pre-genesis — no real token exists yet. These are protocol-throughput numbers, not a live economy.</li>' +
        '<li>We have not re-measured a head-to-head Solana comparison this cycle — an earlier attempt was blocked by an exhausted public devnet faucet, not a performance finding. Treat any "faster than Solana" framing as unverified until re-run.</li>' +
        '</ul>' +
        '<p><a href="/docs/evidence/bench-001-verification.md">Read the full evidence record →</a></p>' +
        '</section>' +
        '</div>';
      host.appendChild(page);
    },
  };
})();

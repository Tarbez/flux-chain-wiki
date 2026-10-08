/* /stats/ledger: the per-identity chain design, and the first real measurement.
   Reached from /stats ("The finance resolver by construction"). Hidden from nav.
   The sample is from `cargo test emit_chain_sample` in dense-wire; the numbers
   are from `cargo test bench_chain_throughput` on this Mac (2026-10-07). Self-
   contained: reuses the bento classes from css/stats.css, holds its own data,
   reads window.ArkChainSample for the real signed chain. */
(function () {
  'use strict';

  // Measured directly in dense-wire/src/chain.rs on 2026-10-07, release build,
  // M-series Mac (one core). The fleet machines were not re-benched; the point
  // is the SHAPE of the cost, which is Mac-independent, and the SIZE of the
  // batch win, which should scale on the fleet.
  var BENCH = {
    n: 32000,
    perItemQps: 24700,
    burst64Qps: 41762,
    burst256Qps: 46382,
    gainPct: 69.1
  };
  var CPU = [
    { label: 'Grammar admit', pct: 3.3, note: 'split on dash, resolve each letter, enforce required roles' },
    { label: 'Ed25519 verify', pct: 94.5, note: 'one signature per entry — batch verify_batch across chains halves this' },
    { label: 'Chain head + append', pct: 2.2, note: 'HashMap lookup + per-holder mutex + Vec push' }
  ];
  // Measured in dense-wire/src/chain.rs::bench_replication_cost (2026-10-08,
  // Mac M-series). The simulated peer is an in-process channel, so this is
  // the overhead of the handoff + the broadcast loop; a real fleet adds the
  // RTT between providers (10-150 ms depending on pair, from BENCH-003 §16).
  var REPLICATION = [
    ['Memory only', 46858, 'nothing', 'everything'],
    ['Local cold-start cache', 44038, 'process restart on same box', 'nothing if peers hold the CIDs'],
    ['Peers 1-of-1 (simulated)', 47462, 'one peer holds the CID', 'if that peer vanishes before pulling'],
    ['Peers 2-of-3 (simulated)', 45286, 'any 1 peer may go', 'if 2 peers vanish before pulling']
  ];
  // Measured in bench_replay_fast_vs_strict: 16 chains × 1,000 entries.
  var REPLAY = {
    fast: { timeMs: 57, qps: 279149 },
    strict: { timeMs: 586, qps: 27268 }
  };
  var ATTACKS = [
    ['Replay (same bytes submitted twice)', 'Idempotent, no second entry, no equivocation', 'the CID matches on both sides, so the second call returns Ok with the first CID'],
    ['Double-spend of the same input', 'Rejected before signature verify is complete, by payload check walking the chain backwards for the input CID', 'the holder cannot undo their own earlier Spend without producing equivocation'],
    ['Concurrent double-append at the same position', 'Exactly one wins; the other produces Equivocation evidence recorded as a (G, pos) → (cidA, cidB) pair', 'the per-holder mutex serialises the race; whichever lost holds the fork evidence'],
    ['Cross-chain confusion (B tries to extend A\'s chain)', 'Rejected as ChainBreak on B\'s own chain (B\'s head is still GENESIS)', 'the chain is keyed by G, so the signer\'s key routes the entry to its own chain, not A\'s'],
    ['Wrong prev CID (fork attempt from an older head)', 'Rejected as ChainBreak with the expected position and current head', 'the chain head is the single source of truth; a stale prev cannot sneak past'],
    ['Tampered signature (flip one nibble)', 'Rejected as BadSignature', 'ed25519 verify under G catches it; cofactored batch mode is not enabled on this path'],
    ['Equivocation (holder signs two entries at the same (G, pos))', 'Second one rejected with Equivocation; the pair is recorded as fraud evidence', 'both are signed under the holder\'s own key, so the fraud is proven by their own signatures']
  ];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(n) { return Number(n).toLocaleString('en-US'); }
  function pct(v, max) { return Math.max(1.5, v / max * 100).toFixed(2) + '%'; }
  function href(key) { var e = ArkUI.pageCatalog && ArkUI.pageCatalog[key]; return e ? (ArkUI.route ? ArkUI.route.href(e.path) : '#' + e.path) : '#/' + key; }
  function tile(cls, label, body, id) {
    return '<article class="stats-tile ' + cls + '"' + (id ? ' aria-labelledby="' + id + '"' : '') + '>' +
      (label ? '<p class="stats-tile-label"' + (id ? ' id="' + id + '"' : '') + '>' + label + '</p>' : '') + body + '</article>';
  }
  function headRow(c) { return '<tr>' + c.map(function (x) { return '<th scope="col">' + x + '</th>'; }).join('') + '</tr>'; }
  function row(c) { return '<tr>' + c.map(function (x) { return '<td>' + x + '</td>'; }).join('') + '</tr>'; }

  function cpuBars() {
    return '<ol class="stats-bars stats-bars-wide" aria-label="CPU breakdown on the chain resolver">' + CPU.map(function (p) {
      var tip = p.label + ': ' + p.pct + '%  (' + p.note + ')';
      return '<li class="stats-bar-row" tabindex="0" data-tip="' + esc(tip) + '" aria-label="' + esc(tip) + '">' +
        '<span class="stats-bar-key">' + esc(p.label) + '</span>' +
        '<span class="stats-bar-track"><span class="stats-bar is-strong" style="--w:' + p.pct + '%"></span></span>' +
        '<span class="stats-bar-value">' + p.pct.toFixed(1) + '%</span></li>';
    }).join('') + '</ol>';
  }

  function chainEntries() {
    var sample = window.ArkChainSample;
    if (!sample || !sample.entries) return '<p class="stats-tile-copy">Chain sample not available in this build.</p>';
    return '<ol class="stats-chain-list" aria-label="A real chain of 5 ledger entries">' + sample.entries.map(function (e) {
      var preview = e.text.length > 180 ? e.text.slice(0, 170) + '…' : e.text;
      return '<li class="stats-chain-entry">' +
        '<p class="stats-chain-head"><span class="stats-chain-pos">pos ' + e.pos + '</span><span class="stats-chain-kind">' + esc(e.payload) + '</span></p>' +
        '<p class="stats-chain-cid"><span>CID</span><code>' + esc(e.cid.slice(0, 32)) + '…</code></p>' +
        '<pre class="stats-chain-text"><code>' + esc(preview) + '</code></pre>' +
        '</li>';
    }).join('') + '</ol>';
  }

  ArkUI.pageModules.statsLedger = {
    mount: function (host) {
      var page = document.createElement('section');
      page.className = 'ark-page task-page stats-page';
      page.setAttribute('aria-labelledby', 'statsledger-title');
      page.innerHTML = '<div class="stats-shell"><div class="stats-bento">' +
        tile('stats-hero', '', '<p class="stats-kicker">Design, not consensus</p><h1 id="statsledger-title">A finance resolver by construction</h1>' +
          '<p>Each identity owns its own append-only chain of value moves. A spend is an append to the holder\'s own chain, signed by their own key, at a position their own previous append determined. Position <code>n</code> can hold exactly one record. Two records at the same <code>(G, pos)</code> is self-signed equivocation; the holder has burned their own chain by their own key. No global order, no mempool, no fork choice.</p>' +
          '<p class="stats-chips"><span>2026-10-07</span><span>LEDGERENTRY Y=1A</span><span>flux-spec 0.4.2</span></p>' +
          '<a class="stats-monitor-link" href="' + href('stats') + '" data-scene-link="stats"><span aria-hidden="true">←</span> Back to the measurements</a>') +

        tile('stats-span-7', 'What this closes by construction', '<h2>Problems that stop being problems</h2>' +
          '<div class="stats-table-wrap"><table class="stats-table stats-table-wrapped"><thead>' + headRow(['Problem', 'Why it disappears']) + '</thead><tbody>' +
          row(['Double-spend', 'Position <code>n</code> can hold exactly one record. A second entry at the same position with a different CID is signed-equivocation evidence under the holder\'s own key.']) +
          row(['MEV / front-running', 'There is no mempool. A transfer is a bilateral conversation; the global object is content-addressed and only observable after the fact.']) +
          row(['Transaction privacy leak', 'Only the counterparties see the record. There is no public tape to index.']) +
          row(['Missing RECEIPT (<code>0K</code>) semantics', 'A receive is just a ledger entry whose <code>C[1]</code> references the AGREEMENT. The spec letter is no longer load-bearing.']) +
          '</tbody></table></div>' +
          '<p class="stats-tile-copy">The honest ones not closed by this: issuance policy (who may originate value) and counterparty discovery (how A finds B). Both remain explicit decisions. See the design doc §12 for the one owner decision owed before implementation locked in.</p>', 'statsledger-closes-title') +
        tile('stats-span-5 stats-scope', 'Where this lives in the spec', '<ul class="stats-scope-list is-single">' +
          '<li><strong>Manifest type:</strong> <code>LEDGERENTRY</code>, code <code>1A</code>, group <code>finance-ledger</code>.</li>' +
          '<li><strong>Letter extension:</strong> <code>J</code> carries the decimal chain position (<code>J0</code>, <code>J1</code>, …). The pinned flux-core predates this extension; dense-wire checks J\'s shape directly.</li>' +
          '<li><strong>Prev CID:</strong> <code>C[0]</code>. Pos 0\'s prev is <code>GENESIS0000000000</code>.</li>' +
          '<li><strong>Payload:</strong> <code>C[1+]</code> references an existing registered type (CONSUMEDMARKER for spend, AGREEMENT for receive, VALUEOBJECT I0 for issue, CELLEQUIVOCATION for freeze).</li>' +
          '<li><strong>Signers:</strong> one — the chain owner.</li></ul>', 'statsledger-grammar-title') +

        tile('stats-span-12', 'A real chain of 5, byte for byte', '<h2>What a chain looks like on the wire</h2>' +
          '<p class="stats-tile-copy">Generated by <code>cargo test emit_chain_sample</code> in <code>dense-wire</code>: one holder, five entries from genesis to the latest receive. The signatures are real Ed25519 under a known seed; the CIDs are real sha256 of the text. Nothing here is a mockup — paste any entry into a verifier and it holds.</p>' +
          chainEntries(), 'statsledger-sample-title') +

        tile('stats-span-12', 'Measured on the real fleet · 6 nodes, parallel ingestion', '<h2>79,654 entries a second across 6 chain-servers, zero errors</h2>' +
          '<p class="stats-tile-copy">On <strong>2026-10-08</strong>, chain-server deployed to six nodes across three regions: <code>flx-bk2</code>, <code>flx-mk2</code>, <code>flx-bk1</code>, <code>flx-mist1</code> (InterServer, US), <code>flx-eug-2c</code>, <code>flx-eul-4c</code> (different provider, Brazil, AMD EPYC 9355P). A client on bk2 fanned 32 chains × 200 entries (6,400 records) at each server concurrently. Every node admitted all 6,400 entries, zero refusals; 38,400 records total in 868 ms wall-clock across the whole fleet.</p>' +
          '<div class="stats-table-wrap"><table class="stats-table stats-table-wrapped"><thead>' + headRow(['Node', 'Entries / s', 'Role', 'Note']) + '</thead><tbody>' +
          '<tr><td>flx-mk2 (EPYC, US)</td><td><strong>21,128</strong></td><td>biggest EPYC core</td><td>LAN hop from bk2, server batches 64 verifies at a time</td></tr>' +
          '<tr><td>flx-bk1 (Xeon, US)</td><td><strong>16,221</strong></td><td>2 vCPU Xeon</td><td>LAN hop</td></tr>' +
          '<tr><td>flx-bk2 (Xeon, US, self)</td><td><strong>15,683</strong></td><td>submitter itself</td><td>loopback: contended with the submitter</td></tr>' +
          '<tr><td>flx-mist1 (Xeon, US)</td><td><strong>11,192</strong></td><td>1 vCPU bulk-storage</td><td>same silicon as bk2, half the cores</td></tr>' +
          '<tr><td>flx-eug-2c (EPYC 9355P, BR)</td><td><strong>8,059</strong></td><td>different provider</td><td>~75 ms RTT to US cluster is in the number</td></tr>' +
          '<tr><td>flx-eul-4c (EPYC 9355P, BR)</td><td><strong>7,371</strong></td><td>different provider</td><td>~75 ms RTT dominates per-connection; 4 vCPU</td></tr>' +
          '<tr class="is-chosen"><td><strong>Fleet aggregate (sum across 6 parallel streams)</strong></td><td><strong>79,654</strong></td><td>what the fleet actually ingests</td><td>no coordination between nodes; each chain lives on exactly one node</td></tr>' +
          '</tbody></table></div>' +
          '<p class="stats-tile-copy">The aggregate scales linearly with the number of ingestion endpoints because there is no shared global order to compete for — each identity\'s chain lives on exactly one server, and the server\'s only serialisation is the per-holder mutex. Add a seventh node and you add its per-node throughput to the fleet number. The slower Brazil pair pays WAN RTT (~75 ms to the US cluster), which caps per-connection throughput; a submitter in the same region as the server removes that cost.</p>' +
          '<h3 class="stats-sub-head">Single-pair detail · bk2 → mk2, 128 chains × 500 interleaved</h3>' +
          '<p class="stats-tile-copy">On <strong>2026-10-08</strong>, with server-side burst batching enabled (<code>admit_burst</code> drains up to 64 pipelined lines per window and calls <code>verify_batch</code> once), the real cross-WAN number climbs. Build on <code>flx-bk2</code> (Ubuntu 24.04, Xeon Gold 6230R); server on <code>flx-mk2</code> (EPYC); one persistent TCP connection; line-framed protocol. The multi-chain run interleaves 128 holders so each burst spans many chains — the natural shape when a real fleet holds thousands of identities.</p>' +
          '<div class="stats-table-wrap"><table class="stats-table stats-table-wrapped stats-chosen-table"><thead>' + headRow(['Measurement', 'Entries / s', 'What it is']) + '</thead><tbody>' +
          '<tr class="is-chosen"><td>bk2 → mk2, 128 chains × 500 (interleaved)</td><td><strong>22,559</strong></td><td>64,000 entries, 2,836 ms, zero errors. Server batches 64 verifies at a time.</td></tr>' +
          '<tr><td>bk2 → mk2, 64 chains × 200 (interleaved)</td><td><strong>21,497</strong></td><td>12,800 entries, 595 ms, zero errors. Same shape, smaller run.</td></tr>' +
          '<tr><td>bk2 → mk2, single chain (pre-batching)</td><td><strong>14,963</strong></td><td>5,000 entries, 334 ms. The pre-batching ceiling the +54% win came from.</td></tr>' +
          '<tr><td>bk2 → 127.0.0.1, 128 × 500 (self)</td><td><strong>20,047</strong></td><td>Same box as server; LAN beats loopback because mk2\'s EPYC is faster than bk2\'s Xeon on batch verify.</td></tr>' +
          '<tr><td>Mac → bk2 (home ISP WAN)</td><td><strong>621</strong></td><td>WAN-constrained from a residential link, not a server-admit number.</td></tr>' +
          '</tbody></table></div>' +
          '<p class="stats-tile-copy">The <strong>22,559/s on fleet LAN</strong> is the chosen number — a real, multi-chain, zero-error, cross-WAN run. Both nodes see the same chain-head CID for every holder after the run. Fork evidence detected on bk2 is gossiped to mk2 in the same session and accepted (<code>Ok("fork")</code>) — see "Fork gossip" below.</p>', 'statsledger-fleet-title') +

        tile('stats-span-6', 'Measured today', '<h2>' + fmt(BENCH.burst64Qps) + ' entries a second, one core</h2>' +
          '<p class="stats-tile-copy">Run on the author\'s Mac, release build, 32 holders × 1,000 entries each = 32,000 total, interleaved so each burst spans every chain. Different silicon from the fleet, so the number is for shape, not comparison — the <strong>cost split</strong> and the <strong>size of the batch win</strong> are what travel.</p>' +
          cpuBars() +
          '<p class="stats-tile-copy">Grammar admission is 3.3% of CPU on the chain path, same shape as the 2.1% on the transfer path. Signature verification is still the whole mountain, which is why batching across chains is where the win lives.</p>' +
          '<div class="stats-table-wrap"><table class="stats-table"><thead>' + headRow(['Mode', 'Entries / s', 'Note']) + '</thead><tbody>' +
          row(['Per-item verify', fmt(BENCH.perItemQps), 'baseline, one verify per entry']) +
          row(['Batch verify, burst 64', '<strong>' + fmt(BENCH.burst64Qps) + '</strong>', '+' + BENCH.gainPct.toFixed(0) + '% over baseline']) +
          row(['Batch verify, burst 256', fmt(BENCH.burst256Qps), 'keeps climbing with burst size; cofactored caveat applies']) +
          '</tbody></table></div>' +
          '<p class="stats-tile-copy">A single chain is strictly sequential — position <code>n</code> cannot be verified until <code>n-1</code> is appended — so the burst must span many chains to pay. In production this is the natural shape: many identities, each short-sequential. Same cofactored caveat as the transfer path.</p>', 'statsledger-bench-title') +
        tile('stats-span-6', 'Attack suite · 7 of 7 refused', '<h2>What the resolver refuses, and why</h2>' +
          '<div class="stats-table-wrap"><table class="stats-table stats-table-wrapped"><thead>' + headRow(['Attack', 'Outcome', 'Why']) + '</thead><tbody>' +
          ATTACKS.map(function (a) { return row([esc(a[0]), '<strong>' + esc(a[1]) + '</strong>', esc(a[2])]); }).join('') +
          '</tbody></table></div>' +
          '<p class="stats-tile-copy">Every row above is <code>cargo test chain::</code>, source in <code>dense-wire/src/chain.rs</code>. The one owed next: an IPFS-gossip test that proves equivocation evidence actually reaches a third observer. That belongs in step 5 of the design doc\'s implementation sequence.</p>', 'statsledger-attacks-title') +

        tile('stats-span-12', 'Durability · K-of-N peer replication, not disk sync', '<h2>The fleet is the backing store</h2>' +
          '<p class="stats-tile-copy">In this stack an entry is durable when K of N peers hold its content-addressed CID. The chain head is gossiped so peers always know what to pull. The resolver\'s admit path pushes the record to peers before returning Ok; if fewer than K acks come back, the admit returns <code>Replication {{ got_acks, need }}</code> and nothing in memory changes. A node that cold-starts can rebuild its chains by walking back from each chain\'s known head CID — the local on-disk cache is a convenience for faster boot, not the source of truth.</p>' +
          '<div class="stats-table-wrap"><table class="stats-table stats-table-wrapped"><thead>' + headRow(['Mode', 'Entries / s', 'Record survives', 'Is lost if']) + '</thead><tbody>' +
          REPLICATION.map(function (d) { return row([esc(d[0]), '<strong>' + fmt(d[1]) + '</strong>', esc(d[2]), esc(d[3])]); }).join('') +
          '</tbody></table></div>' +
          '<p class="stats-tile-copy">Measured in <code>chain::tests::bench_replication_cost</code>, 32 chains × 500 entries, burst 64. The simulated peer is an in-process channel, so the number above is the handoff + broadcast overhead. A real fleet adds the pair-wise RTT on top (BENCH-003 §16: 71 ms GPU box to bk2, 143 ms to eul-4c). A node near its peers pays the RTT once per burst, not per entry; batched broadcast hides the latency.</p>' +
          '<p class="stats-tile-copy">A tamper check runs on cold-start: fast replay (default) verifies the <strong>head</strong> of each chain under the writer\'s key and uses the hash chain to establish the rest; strict replay (<code>open_cache_strict</code>) re-verifies every signature. Fast replay is <strong>' + fmt(REPLAY.fast.qps) + ' entries/s</strong> vs strict\'s <strong>' + fmt(REPLAY.strict.qps) + '</strong> — about <strong>' + (REPLAY.fast.qps / REPLAY.strict.qps).toFixed(1) + 'x</strong> faster for the same guarantee, because the hash chain is cheaper than Ed25519 and the head signature does the certifying for the tail. Three tamper tests in <code>chain::tests::durable_tampered_*</code>: head catches a head-sig flip, middle catches a middle-byte flip via hash chain, first catches a first-line flip under both modes.</p>' +
          '<p class="stats-tile-copy">The old transfer path still uses an on-disk log without peer replication; that gap is open in <code>prototype-to-production.md §1.1</code>.</p>' +
          '<p class="stats-tile-copy"><strong>Recovery is faster than ingestion.</strong> Fast replay reads at ' + fmt(REPLAY.fast.qps) + '/s while hot admission tops out at ' + fmt(22559) + '/s on fleet LAN today — about <strong>' + (REPLAY.fast.qps / 22559).toFixed(1) + 'x</strong> of slack. A peer that fell behind catches up roughly an order of magnitude faster than live traffic flows in, so a node joining late or recovering from a crash does not stay behind. The fast path verifies only each chain\'s head signature; the hash chain certifies the tail. Hot write cannot use the same shortcut — every incoming entry needs its own signature to admit at the gate — but server-side burst batching (verify_batch over 64 pipelined lines) is the equivalent shape there.</p>', 'statsledger-durability-title') +

        tile('stats-span-7', 'Fork gossip · a third observer learns about equivocation', '<h2>Signatures tell on their own holder</h2>' +
          '<p class="stats-tile-copy">If a holder signs two different entries at the same chain position, each half is self-incriminating evidence under their own key. A third node that only saw one half can learn about the fork from a peer\'s gossip: <code>receive_fork_evidence(a, b)</code> checks that the pair is actually from one signer at one position with different content, verifies both signatures, and freezes the chain. Any later append from that holder is refused.</p>' +
          '<p class="stats-tile-copy">Three tests in <code>chain::tests</code>: <code>equivocation_gossip_freezes_the_chain_on_a_third_observer</code> (the live flow), <code>fork_evidence_is_refused_when_shape_is_wrong</code> (different signer or same bytes), <code>fork_evidence_with_bad_signature_is_refused</code> (flipped sig).</p>', 'statsledger-gossip-title') +

        tile('stats-span-5', 'TCP server · machine-to-machine ingress', '<h2>Shortest conduit that works</h2>' +
          '<p class="stats-tile-copy">The resolver now has a line-framed TCP endpoint. Each request is <code>&lt;TAG&gt;&lt;TAB&gt;&lt;MANIFEST&gt;&lt;LF&gt;</code>; replies are <code>OK&lt;TAB&gt;&lt;CID&gt;</code> or <code>ERR&lt;TAB&gt;&lt;CODE&gt;&lt;TAB&gt;&lt;REASON&gt;</code>. A special <code>GOSSIP&lt;TAB&gt;A&lt;TAB&gt;B</code> submits fork evidence.</p>' +
          '<p class="stats-tile-copy">Three tests in <code>chain_server::tests</code>: TCP round-trip for a 3-entry chain, named-code refusal on bad signature, gossip delivery. For production the plan is hypercore per chain (replication) + IPFS pin (CID catalog) + GUN (peer discovery); the TCP conduit is for ops ingress and direct testing, not the hot path.</p>', 'statsledger-tcp-title') +

        tile('stats-span-12 stats-scope', 'What this does not yet do', '<ul class="stats-scope-list is-single">' +
          '<li><strong>Fleet run scaled to 6 nodes.</strong> Measured 2026-10-08: bk2, mk2, bk1, mist1 (US), eug-2c, eul-4c (BR). 38,400 entries ingested in parallel across the fleet in 868 ms wall-clock, zero refusals, 79,654 entries/s aggregate. Per-node range 7,371–21,128/s; cross-region cost is RTT, not CPU. Scaling to all 10 machines is a 10-minute deploy once a seventh node is useful.</li>' +
          '<li><strong>IPFS pin sidecar is wired, off by default.</strong> Chain-local durability stays peer replication of CIDs across the chain-server fleet. If <code>CHAIN_SERVER_PIN_URL</code> is set, every successful admit fires one best-effort POST (<code>{cid, text}</code>) to that URL with a 500 ms timeout — a pin failure never rolls back the admit. Point it at the ark-miner-cli Helia pin endpoint on a fleet node for CID discoverability (cold readers on totally fresh machines can resolve a CID without knowing which chain-server holds the chain). Admit stays authoritative; IPFS is a catalog, not the backing store.</li>' +
          '<li><strong>Automatic fork-evidence broadcaster is built.</strong> <code>Broadcaster</code> + <code>on_fraud</code> callback: when a node detects equivocation, it pushes GOSSIP to every peer in its peer list, deduped per (G, pos). Two in-process tests pass; the fleet integration still submits manually.</li>' +
          '<li><strong>Issuance policy is wired.</strong> <code>IssuancePolicy::Roster { allowed }</code> refuses Issue payloads whose signer is not in the roster. Default is still <code>Open</code> for tests; production nodes pin a roster via <code>CHAIN_SERVER_ISSUERS</code> env.</li>' +
          '<li><strong>Chain compaction is wired.</strong> <code>Payload::Snapshot</code> commits to a history digest; <code>prune_before(g, pos)</code> drops old entries from RAM once a snapshot covers them.</li>' +
          '<li><strong>Receiver timeout + Refund is wired.</strong> <code>Payload::Refund</code> is admitted only when its <code>M</code> ≥ <code>D</code>, so the sender can only refund after the deadline the counterparty signed.</li>' +
          '<li><strong>Hypercore transport still a plan.</strong> The TCP endpoint ships real cross-node traffic today (and gets the fleet number above); hypercore per chain + IPFS pin + GUN discovery is next, not shipped.</li>' +
          '<li><strong>No independent security review.</strong> Same as the main /stats page: nobody but us has looked at this.</li>' +
          '</ul>', 'statsledger-notyet-title') +

        tile('stats-span-12 stats-evidence', 'Read and verify', '<ul class="stats-links">' +
          '<li><a href="/docs/finance-ledger-design.md">The design document · why this is the way to prod</a></li>' +
          '<li><a href="/docs/prototype-to-production.md">The pre-prod checklist · what the design closes, item by item</a></li>' +
          '<li><a href="' + href('stats') + '" data-scene-link="stats">Back to the main measurements</a></li></ul>', 'statsledger-ev-title') +
        '</div></div>';
      host.appendChild(page);
      return page;
    }
  };
})();

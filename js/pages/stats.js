/* /stats: how fast the protocol is, why, and how we found out. Written to teach.

   Redesigned 2026-10-07 (evening). The earlier page was a record of the Node-versus-Rust
   rebuild; that history is now told in one place, the trail at the bottom and the article
   it links to, and nothing stale is shown as a headline. The page now follows the order a
   reader needs:
     1. a REAL transfer, taken apart block by block (js/content/stats-sample.js: the exact
        bytes a server admits, not an illustration);
     2. where a server's time actually goes, before and after;
     3. the ladder of gains on the same four cores;
     4. what batch signature checking can and cannot do;
     5. the whole fleet, per machine, before and after;
     6. the trail of wrong turns, with numbers;
     7. what none of it proves.

   Every number lives once, in EVIDENCE below, and is carried by
   docs/evidence/bench-003-rust-fleet-ceiling.md (sections 11-15). Nothing here is
   projected: ranges are the min and max of the runs, shown as ranges. The fleet headline
   lives in js/content/stats-highlights.js (`fleetRun`), shared with the home page and
   /monitor. Change a number in the evidence doc first, then here. */
(function () {
  'use strict';

  var RUN = (window.ArkStatsHighlights && window.ArkStatsHighlights.fleetRun) || { total: 24908, before: 21199, transfers: 503225, window: '20 s', perServer: [] };
  var ARTICLE_STORY = 'article/how-we-got-fast-and-what-we-got-wrong';
  var ARTICLE_GRAMMAR = 'article/the-grammar-does-almost-no-work';

  var EVIDENCE = {
    // Whole fleet, concurrent, 20 s window, one shared start instant, 0 failures (bench-003 s14-15).
    fleet: {
      total: RUN.total, before: RUN.before, transfers: RUN.transfers, window: RUN.window,
      servers: RUN.perServer
    },
    // Same four cores, accepted finality, 300 concurrent, 3 runs each (bench-003 s14-15).
    ladder: [
      { label: 'HTTP + JSON, 3 requests', value: 1926, range: '1,718-2,082', note: 'The old way: HTTP, JSON trees, three round trips' },
      { label: 'Registered grammar, one record per trip', value: 4158, range: '4,060-4,271', note: 'Same checks, raw TCP, five records per transfer' },
      { label: 'Whole transfer in one write', value: 4845, range: '4,725-4,989', note: 'Five records and six signatures sent together' },
      { label: '+ batch signature checks (burst)', value: 5674, range: '5,397-5,994', note: 'Signatures from one write verified together' },
      { label: '+ batch signature checks (pool, 2 threads)', value: 5891, range: '5,793-6,081', note: 'Signatures from many connections verified together', strong: true }
    ],
    // perf with call stacks, server pinned to 4 cores, shares of SERVER CPU (bench-003 s7 and s14).
    cpuBefore: {
      title: 'HTTP + JSON server', samples: '33,188 samples',
      parts: [
        { k: 'http', label: 'HTTP layer and kernel network calls', v: 40.3 },
        { k: 'crypto', label: 'Signatures and hashing', v: 20.8 },
        { k: 'json', label: 'Building, sorting and writing JSON', v: 15.1 },
        { k: 'store', label: 'Storage', v: 11.1 },
        { k: 'other', label: 'Everything else', v: 12.7 }
      ]
    },
    cpuAfter: {
      title: 'Registered-grammar server', samples: '31,028 samples',
      parts: [
        { k: 'crypto', label: 'Signature checks (6 per transfer)', v: 54.7 },
        { k: 'store', label: 'Storage: writer, queue, reads', v: 20.3 },
        { k: 'admit', label: 'Admission logic over stored records', v: 13.8 },
        { k: 'http', label: 'Connection loop', v: 5.0 },
        { k: 'hash', label: 'sha256 of records', v: 3.5 },
        { k: 'grammar', label: 'The grammar itself: split and resolvers', v: 2.1 },
        { k: 'other', label: 'Everything else', v: 0.6 }
      ]
    },
    // ed25519-dalek verify_batch on bk2's Xeon, one core (bench-003 s15).
    batchCurve: [
      { n: 1, x: 0.76 }, { n: 2, x: 1.16 }, { n: 6, x: 1.46, note: 'one transfer' }, { n: 12, x: 2.16 },
      { n: 30, x: 1.77, note: 'five transfers' }, { n: 60, x: 1.93 }, { n: 96, x: 2.12 }, { n: 192, x: 2.25 }
    ],
    batchModes: [
      { label: 'One at a time', value: 4845, range: '4,725-4,989' },
      { label: 'Burst: one write, together', value: 5674, range: '5,397-5,994' },
      { label: 'Pool, 1 verifier thread', value: 4628, range: '4,567-4,735', note: 'Slower: batches passed 100 and one thread became the bottleneck' },
      { label: 'Pool, 2 verifier threads', value: 5891, range: '5,793-6,081', strong: true }
    ],
    // Micro-benchmark on bk2, one core, one real 674-byte AGREEMENT of 11 blocks (bench-003 s14).
    parseCost: [
      { label: 'Split on the dash', ns: 1515 },
      { label: '+ each block\'s resolver', ns: 2888 },
      { label: 'Full admission checks', ns: 5028 },
      { label: 'Decode every field into a tree', ns: 13279, note: '2.6x the door check: the part we avoid' },
      { label: 'Two signature checks', ns: 113432, note: 'Where the time is', strong: true }
    ],
    // The honest like-for-like table.
    compare: {
      cols: ['', 'Certified fabric', 'Grammar prototype'],
      rows: [
        ['What it measured', '4 quorums, 2 validators each, side by side', '4 servers, 6 clients, one notebook per server'],
        ['Signed records per transfer', 'Attestations and a threshold certificate', '5 manifests, 6 signatures'],
        ['Certificate / Byzantine tolerance', 'Yes', 'No: bilateral signatures only'],
        ['Finality measured', 'Accepted (certificate); durable measured separately', 'Accepted only: not replicated, not flushed'],
        ['Throughput', '5,711-6,041 /s accepted; 676-827 /s durable per quorum', RUN.total.toLocaleString('en-US') + ' /s accepted'],
        ['Status', 'Deployed on the fleet', 'Prototype, not a service']
      ]
    },
    // The trail: wrong turns included. Each line is in bench-003.
    trail: [
      { kind: 'win', tag: 'Win', title: 'Take the transfer out of the do-everything miner', from: '6.82', to: '137.25', unit: '/s', body: 'Same machines, same network. The miner was relaying, storing and pinning too. 20x from deleting work.' },
      { kind: 'win', tag: 'Win', title: 'Group commit, then drop the redundant flush', from: '46.88', to: '354.54', unit: '/s durable', body: 'Rust started 3x slower than Node. Batching flushes, then noticing three validators already hold a copy.' },
      { kind: 'win', tag: 'Win, three bugs', title: 'One quorum\'s durable finality', from: '131-184', to: '676-827', unit: '/s', body: 'A routing bug, a redundant flush, and server threads capped at the CPU core count (2) while requests mostly waited.' },
      { kind: 'lost', tag: 'Lost, then won', title: 'Four round trips collapsed into one', from: '763', to: '579', unit: '/s, short link', body: 'Slower on the quorum measured, whose two machines are under 1 ms apart; 2x faster over a 71 ms link. Right idea, wrong map.' },
      { kind: 'wrong', tag: 'Wrong conclusion, corrected', title: 'The GPU, and "it is not compute-bound"', from: 'GPU', to: '0 use', unit: 'compute contexts', body: 'We first read idle CPU as proof. It was starved threads. The clean finding: the protocol links no GPU library and opens no GPU device — it never uses the GPU. A modern EPYC CPU is ~2.5x the fleet Xeon per core, which is the whole story.' },
      { kind: 'refuted', tag: 'Refuted', title: 'Pipelined replication', from: '877-954', to: '841-911', unit: '/s durable', body: 'Expected near accepted speed. Measured against a control: no gain. Left off.' },
      { kind: 'wrong', tag: 'Wrong test', title: 'Benchmarked the wrong codec', from: '', to: '', unit: '', body: 'The learning library\'s vocabulary codec cannot encode a transfer. The grammar meant is the registered one in flux-core, and it had not been tested. The owner caught it.' },
      { kind: 'win', tag: 'Win', title: 'The registered grammar on a raw socket', from: '1,926', to: '5,076', unit: '/s, same 4 cores', body: 'Then the whole fleet: 21,199 /s. A simpler stand-in showed 35,499 but carried half the signatures, so it is not the number.' },
      { kind: 'mixed', tag: 'Smaller than hoped', title: 'Batch signature checks', from: '2x', to: '+17-22%', unit: 'measured', body: 'The micro-benchmark said about twice as fast; it can only shrink a share of the cost. One verifier thread made it worse. Fleet: 21,199 to 24,908.' },
      { kind: 'wrong', tag: 'Harness bugs', title: 'Mistakes that cost hours, none in the protocol', from: '', to: '', unit: '', body: 'A missing firewall rule posed as an architecture ceiling; a kill scoped too broadly took production down 19 minutes; a 128-slot listen queue dropped two clients; pkill -x ignores names over 15 characters.' },
      { kind: 'win', tag: 'Historical step', title: 'A finance resolver by construction (LEDGERENTRY)', from: '24,700', to: '41,762', unit: 'ops/s, one core (Mac)', body: 'This was the first measured batch-verification step. The current matched local measurements are 51,065 ops/s hot admission and 279,269 ops/s certified holder-sharded application; see BENCH-006.' },
      { kind: 'win', tag: 'Durability + transport + gossip', title: 'Replication, replay fast path, fork gossip, TCP ingress', from: 'disk-sync', to: 'K-of-N peer acks', unit: 'content-addressed CIDs', body: 'Durability moved from a disk-sync primitive to K-of-N peer replication of CIDs + head gossip — the fleet is the backing store. Fast cold-start replay verifies each chain\'s head signature and uses the hash chain to establish the tail: ~10x the throughput of strict replay for the same guarantee. A third observer can accept fork evidence via gossip (receive_fork_evidence) and freeze the holder\'s chain. A line-framed TCP endpoint ships operations between machines today (hypercore + IPFS pin + GUN discovery is the production transport, not HTTP). 15 chain tests + 3 TCP tests pass.' },
      { kind: 'win', tag: 'Cross-WAN fleet run', title: 'The chain, measured across machines, 64 chains interleaved, zero errors', from: '14,963', to: '22,559', unit: '/s cross-WAN', body: 'On 2026-10-08: chain-server deployed on flx-bk2 (Xeon) and flx-mk2 (EPYC), server-side burst batching enabled (admit_burst drains up to 64 pipelined lines per window, verify_batch once). From bk2 a client submitted 64,000 LedgerEntry records across 128 interleaved holders to mk2 over one persistent connection: 2,836 ms wall-clock, zero refusals, head CID agrees on both sides for every holder. Fork detected at bk2 and GOSSIPed to mk2 in the same run — the third-observer cross-WAN propagation works. Automatic broadcaster, issuance roster, compaction, and Refund-after-deadline are all wired and tested on the same build.' }
    ]
  };
  ArkUI.statsEvidence = EVIDENCE;

  // ---- the real transfer, taken apart ---------------------------------------------------
  var ROLE = {
    G: { name: 'Signer', note: 'The signer\'s public key, in hex. Its resolver only requires an unbroken run of at least 32 letters or digits.' },
    Y: { name: 'Kind', note: 'A compact registered code: 0G intent, 0H offer, 0I agreement, 0J fulfillment, 0L value object. A code nobody registered is refused at the door.' },
    V: { name: 'Version', note: 'Digits only.' },
    M: { name: 'Moment', note: 'When it was made, in unix seconds. Digits only.' },
    D: { name: 'Deadline', note: 'When it stops being valid, in unix seconds. The server refuses an expired one.' },
    I: { name: 'Sequence', note: 'How many hands this object has passed through. 0 means it was issued, not transferred.' },
    R: { name: 'Object', note: 'The identity of this value object. The grammar gives it no internal structure.' },
    H: { name: 'Holder', note: 'Who holds it now, written as the hex of the holder\'s key text, which is the grammar\'s rule for holder ids. That doubles its length.' },
    T: { name: 'Amount', note: 'A whole number then its unit. There are no decimals, so there is no punctuation to escape.' },
    C: { name: 'Reference', note: 'The SHA-256 identifier of another record: a pointer by content. Order is meaningful.' },
    S: { name: 'Signature', note: 'An ed25519 signature over the exact text before this block, as written, never re-rendered. A second signature therefore covers the first.' }
  };
  var CREF = {
    INTENT: ['the constraint document (standing terms)', 'the input being spent'],
    OFFER: ['the intent it answers', 'the offer contract (standing terms)', 'the input being spent'],
    AGREEMENT: ['the intent', 'the offer', 'the authority policy', 'the resolver', 'the expected output'],
    VALUEOBJECT: ['the asset policy', 'the predecessor it replaces', 'the agreement it came from', 'the fulfillment plan'],
    FULFILLMENT: ['the agreement', 'the fulfillment plan', 'the successor it creates']
  };
  var STAGE = {
    INTENT: { by: 'the sender', does: 'Says what is on offer. The server checks the signer really holds the input and that the input is unspent.' },
    OFFER: { by: 'the recipient', does: 'Says the recipient will take it. The server checks it answers a real intent for the same input.' },
    AGREEMENT: { by: 'the sender, then the recipient', does: 'Names both. Two signatures in one chain: the recipient\'s covers the sender\'s. The server checks the policy is the registered one.' },
    VALUEOBJECT: { by: 'the recipient', does: 'The new holding. The server checks its amount and sequence match what the agreement promised.' },
    FULFILLMENT: { by: 'the sender', does: 'Closes it. This is the one step that needs an order: a second spend of the same input is refused.' }
  };
  var STAGE_ORDER = ['INTENT', 'OFFER', 'AGREEMENT', 'VALUEOBJECT', 'FULFILLMENT'];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(n, digits) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: digits || 0, maximumFractionDigits: digits || 0 }); }
  function pct(v, max) { return Math.max(1.5, v / max * 100).toFixed(2) + '%'; }
  function href(key) { var entry = ArkUI.pageCatalog && ArkUI.pageCatalog[key]; return entry ? (ArkUI.route ? ArkUI.route.href(entry.path) : '#' + entry.path) : '#/' + key; }
  function row(cells) { return '<tr>' + cells.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }
  function headRow(cells) { return '<tr>' + cells.map(function (c) { return '<th scope="col">' + c + '</th>'; }).join('') + '</tr>'; }
  function tile(cls, label, body, id) {
    return '<article class="stats-tile ' + cls + '"' + (id ? ' aria-labelledby="' + id + '"' : '') + '>' +
      (label ? '<p class="stats-tile-label"' + (id ? ' id="' + id + '"' : '') + '>' + label + '</p>' : '') + body + '</article>';
  }
  function shorten(v) { return v.length > 20 ? v.slice(0, 8) + '…' + v.slice(-4) : v; }

  function parseBlocks(record) {
    var seenC = 0, seenS = 0;
    return record.text.split('-').map(function (raw) {
      var letter = raw.charAt(0), value = raw.slice(1), label = (ROLE[letter] || {}).name || letter, ctx = '';
      if (letter === 'C') { ctx = (CREF[record.name] || [])[seenC] || ''; seenC += 1; label = 'Reference ' + seenC; }
      if (letter === 'S') { seenS += 1; label = seenS > 1 ? 'Signature 2' : 'Signature'; }
      return { letter: letter, value: value, label: label, ctx: ctx, pos: seenC };
    });
  }

  function transferTile() {
    var sample = window.ArkStatsSample;
    if (!sample) return '';
    var byName = {}; sample.records.forEach(function (r) { byName[r.name] = r; });
    var tabs = STAGE_ORDER.map(function (name, i) {
      return '<button type="button" class="stats-stage-tab" role="tab" data-stage="' + name + '" aria-selected="' + (i === 2 ? 'true' : 'false') + '" tabindex="' + (i === 2 ? '0' : '-1') + '">' +
        '<b>' + (i + 1) + '</b>' + esc(name.charAt(0) + name.slice(1).toLowerCase()) + '</button>';
    }).join('');
    return tile('stats-span-12 stats-transfer', 'The whole idea · a real transfer', '<h2>A transfer is five short lines of text</h2>' +
      '<p class="stats-tile-copy">These are the exact bytes a server admits, generated from fixed keys, with real signatures and real identifiers. Pick a record, then pick any block. The parser\'s only job is to split on the dash; each block\'s own resolver decides what it means, and only when it is reached.</p>' +
      '<div class="stats-stage-tabs" role="tablist" aria-label="The five records of one transfer">' + tabs + '</div>' +
      '<div class="stats-stage-body" id="stats-stage-body"></div>' +
      '<p class="stats-tile-copy"><a class="stats-inline-link" href="' + href(ARTICLE_GRAMMAR) + '" data-scene-link="' + ARTICLE_GRAMMAR + '">Read the short explainer</a> on why this grammar does almost no work.</p>', 'stats-transfer-title');
  }

  function renderStage(host, name) {
    var sample = window.ArkStatsSample, rec = sample.records.filter(function (r) { return r.name === name; })[0];
    var blocks = parseBlocks(rec), sig = blocks.filter(function (b) { return b.letter === 'S'; }).length, info = STAGE[name];
    var chips = blocks.map(function (b, i) {
      var cls = 'stats-block is-' + (b.letter === 'S' ? 'sig' : b.letter === 'C' ? 'ref' : (b.letter === 'G' || b.letter === 'H') ? 'who' : 'plain');
      return '<button type="button" class="' + cls + '" data-block="' + i + '" aria-pressed="' + (i === 0 ? 'true' : 'false') + '"><i>' + esc(b.letter) + '</i><span>' + esc(shorten(b.value)) + '</span></button>';
    }).join('<em aria-hidden="true">-</em>');
    host.innerHTML =
      '<div class="stats-stage-meta"><p><strong>' + esc(name.charAt(0) + name.slice(1).toLowerCase()) + '</strong> · signed by ' + esc(info.by) + '</p><p>' + esc(info.does) + '</p></div>' +
      '<div class="stats-block-flow" role="group" aria-label="The blocks of this record, in order">' + chips + '</div>' +
      '<div class="stats-block-detail" aria-live="polite"></div>' +
      '<ul class="stats-stage-facts"><li><b>' + rec.text.length + '</b> characters</li><li><b>' + blocks.length + '</b> blocks</li><li><b>' + sig + '</b> signature' + (sig > 1 ? 's' : '') + '</li><li><b>' + blocks.filter(function (b) { return b.letter === 'C'; }).length + '</b> references</li></ul>';
    function show(i) {
      var b = blocks[i], r = ROLE[b.letter] || { name: b.letter, note: '' }, d = host.querySelector('.stats-block-detail');
      [].forEach.call(host.querySelectorAll('.stats-block'), function (el, k) { el.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
      d.innerHTML = '<p class="stats-detail-head"><span class="stats-detail-letter">' + esc(b.letter) + '</span><strong>' + esc(b.label) + '</strong>' + (b.ctx ? ' · points at ' + esc(b.ctx) : '') + '</p>' +
        '<p>' + esc(r.note) + '</p><p class="stats-detail-value" tabindex="0" aria-label="Full value">' + esc(b.value) + '</p>';
    }
    [].forEach.call(host.querySelectorAll('.stats-block'), function (el) {
      el.addEventListener('click', function () { show(Number(el.getAttribute('data-block'))); });
    });
    show(0);
  }

  // ---- charts ---------------------------------------------------------------------------
  function stack(model) {
    var legend = model.parts.map(function (p) {
      return '<li><i class="seg seg-' + p.k + '" aria-hidden="true"></i><span>' + esc(p.label) + '</span><b>' + p.v.toFixed(1) + '%</b></li>';
    }).join('');
    var bar = model.parts.map(function (p) {
      return '<span class="seg seg-' + p.k + '" style="--w:' + p.v + '%" data-tip="' + esc(p.label + ': ' + p.v.toFixed(1) + '% of server CPU') + '" tabindex="0"></span>';
    }).join('');
    return '<div class="stats-stack"><p class="stats-stack-title"><b>' + esc(model.title) + '</b><span>' + esc(model.samples) + '</span></p>' +
      '<div class="stats-stack-bar" role="img" aria-label="' + esc(model.title + ': ' + model.parts.map(function (p) { return p.label + ' ' + p.v + '%'; }).join(', ')) + '">' + bar + '</div>' +
      '<ul class="stats-stack-legend">' + legend + '</ul></div>';
  }

  function wideBars(items, max, suffix, label) {
    return '<ol class="stats-bars stats-bars-wide" aria-label="' + esc(label) + '">' + items.map(function (it) {
      var shown = it.range || it.shown || fmt(it.value);
      var tip = it.label + ': ' + shown + suffix + (it.note ? '. ' + it.note : '');
      return '<li class="stats-bar-row" tabindex="0" data-tip="' + esc(tip) + '" aria-label="' + esc(tip) + '">' +
        '<span class="stats-bar-key">' + esc(it.label) + '</span>' +
        '<span class="stats-bar-track"><span class="stats-bar' + (it.strong ? ' is-strong' : '') + '" style="--w:' + pct(it.value, max) + '"></span></span>' +
        '<span class="stats-bar-value">' + esc(shown) + '</span></li>';
    }).join('') + '</ol>';
  }

  function batchCurve() {
    var max = 2.5;
    return '<ol class="stats-curve" aria-label="Speedup of batch signature checking by batch size">' + EVIDENCE.batchCurve.map(function (p) {
      var tip = 'Batch of ' + p.n + ': ' + p.x.toFixed(2) + 'x one-at-a-time' + (p.note ? ' (' + p.note + ')' : '');
      return '<li data-tip="' + esc(tip) + '" tabindex="0" aria-label="' + esc(tip) + '"><span class="stats-curve-col"><span class="' + (p.x < 1 ? 'is-slower' : '') + '" style="--h:' + pct(p.x, max) + '"></span></span><b>' + p.x.toFixed(2) + 'x</b><small>' + p.n + '</small></li>';
    }).join('') + '</ol><p class="stats-chart-foot"><span>signatures checked together →</span><span>1.00x = no gain</span></p>';
  }

  function parseCost() {
    var max = Math.log(120000);
    return '<ol class="stats-bars stats-bars-wide" aria-label="Cost of parsing against signature checking, one record">' + EVIDENCE.parseCost.map(function (c) {
      var w = (Math.log(c.ns) / max * 100).toFixed(2) + '%', shown = c.ns >= 10000 ? fmt(c.ns / 1000, 1) + ' µs' : fmt(c.ns / 1000, 2) + ' µs';
      var tip = c.label + ': ' + shown + (c.note ? '. ' + c.note : '');
      return '<li class="stats-bar-row" tabindex="0" data-tip="' + esc(tip) + '" aria-label="' + esc(tip) + '"><span class="stats-bar-key">' + esc(c.label) + '</span>' +
        '<span class="stats-bar-track"><span class="stats-bar' + (c.strong ? ' is-strong' : '') + '" style="--w:' + w + '"></span></span><span class="stats-bar-value">' + shown + '</span></li>';
    }).join('') + '</ol><p class="stats-chart-foot"><span>log scale, one 674-byte agreement</span><span></span></p>';
  }

  function serverCards() {
    return '<ul class="stats-servers">' + EVIDENCE.fleet.servers.map(function (s) {
      var gain = ((s.now / s.before - 1) * 100).toFixed(0);
      var tip = s.name + ': ' + fmt(s.now) + '/s now, ' + fmt(s.before) + '/s before batch checks, CPU ' + s.busy + '% busy';
      return '<li class="stats-server" tabindex="0" data-tip="' + esc(tip) + '"><p class="stats-server-head"><b>' + esc(s.name) + '</b><span>' + s.cores + ' cores</span></p>' +
        '<p class="stats-server-rate"><strong>' + fmt(s.now) + '</strong><span>/s</span><em>+' + gain + '%</em></p>' +
        '<p class="stats-server-was">was ' + fmt(s.before) + '/s · client' + (s.clients.indexOf('+') > -1 ? 's ' : ' ') + esc(s.clients) + '</p>' +
        '<div class="stats-meter" role="img" aria-label="CPU ' + s.busy + ' percent busy"><span style="--w:' + s.busy + '%"></span></div>' +
        '<p class="stats-server-note">' + s.busy.toFixed(1) + '% CPU · ' + esc(s.note) + '</p></li>';
    }).join('') + '</ul>';
  }

  function fleetLadder() {
    var items = [
      { label: 'Certified fabric, 4 quorums', value: 6041, shown: '5,711-6,041', note: 'Threshold certificates, accepted finality. Deployed.' },
      { label: 'Grammar prototype, one record per trip', value: RUN.before, shown: fmt(RUN.before), note: 'Whole fleet, 20 s window' },
      { label: 'Grammar prototype + batch signature checks', value: RUN.total, shown: fmt(RUN.total), note: RUN.transfers.toLocaleString('en-US') + ' transfers, 0 failures', strong: true }
    ];
    return wideBars(items, 26000, '/s', 'Whole-fleet transfers per second');
  }

  function trail() {
    return '<ol class="stats-trail">' + EVIDENCE.trail.map(function (t) {
      var num = t.from ? '<p class="stats-trail-num"><span>' + esc(t.from) + '</span><i aria-hidden="true">→</i><b>' + esc(t.to) + '</b><small>' + esc(t.unit) + '</small></p>' : '';
      return '<li class="stats-trail-item is-' + t.kind + '"><p class="stats-trail-tag">' + esc(t.tag) + '</p><h3>' + esc(t.title) + '</h3>' + num + '<p>' + esc(t.body) + '</p></li>';
    }).join('') + '</ol>';
  }

  function compareTable() {
    var c = EVIDENCE.compare;
    return '<div class="stats-table-wrap"><table class="stats-table stats-table-wrapped"><thead>' + headRow(c.cols) + '</thead><tbody>' +
      c.rows.map(function (r) { return row([esc(r[0]), esc(r[1]), esc(r[2])]); }).join('') + '</tbody></table></div>';
  }

  function rawTables() {
    var f = EVIDENCE.fleet;
    return '<details class="stats-raw"><summary>Every measurement, as tables</summary>' +
      '<h3>Whole fleet, concurrent (bench-003 §15)</h3><p>Four servers and six clients started from one wall-clock instant; ' + fmt(f.transfers) + ' transfers in a ' + f.window + ' window, zero failures. Batch checking on, five transfers per write.</p>' +
      '<div class="stats-table-wrap"><table class="stats-table"><thead>' + headRow(['Server', 'Cores', 'Client(s)', 'Transfers/s', 'Before batch', 'Server CPU']) + '</thead><tbody>' +
      f.servers.map(function (s) { return row([esc(s.name), s.cores, esc(s.clients), '<strong>' + fmt(s.now) + '</strong>', fmt(s.before), s.busy + '%']); }).join('') +
      row(['<strong>Fleet</strong>', '18', '6 clients', '<strong>' + fmt(f.total) + '</strong>', fmt(f.before), '']) + '</tbody></table></div>' +
      '<h3>One box, same four cores (bench-003 §14-15)</h3><p>Server pinned to 4 cores, client on 3 others, accepted finality, 300 concurrent, three runs each.</p>' +
      '<div class="stats-table-wrap"><table class="stats-table"><thead>' + headRow(['Path', 'Runs (transfers/s)', 'Mean']) + '</thead><tbody>' +
      EVIDENCE.ladder.map(function (l) { return row([esc(l.label), esc(l.range), fmt(l.value)]); }).join('') +
      row(['Pool, 1 verifier thread', '4,567-4,735', '4,628']) + '</tbody></table></div>' +
      '<h3>Certified fabric, for reference (BENCH-003 §1-8)</h3><p>Threshold-certificate path, deployed. Quote these with their finality label.</p>' +
      '<div class="stats-table-wrap"><table class="stats-table"><thead>' + headRow(['Configuration', 'Throughput', 'Evidence']) + '</thead><tbody>' +
      row(['One quorum, accepted', '~2,900-3,300/s', 'Concurrency sweeps 150-2,400, 0 failures']) +
      row(['Four quorums side by side, accepted', '<strong>5,711-6,041/s</strong>', '5 consecutive runs; 1 transient timeout in 24,000']) +
      row(['One quorum, durable (replicated and registered)', '<strong>676-827/s</strong>', '5 audited runs, 0 failures']) + '</tbody></table></div></details>';
  }

  ArkUI.pageModules.stats = {
    mount: function (host) {
      var page = document.createElement('section');
      page.className = 'ark-page task-page stats-page';
      page.setAttribute('aria-labelledby', 'stats-title');
      var stats = window.ArkStatsHighlights || { measured: '', scope: '' };
      var CHAIN = stats.chainFleet || {};
      var SOAK = stats.chainFleetSoak || {};
      var LOCAL = stats.localResolvers || {};
      var CERTIFIED_FLEET = stats.certifiedFleet || {};
      var kpis = [
        { v: fmt(CERTIFIED_FLEET.combined || 1712006), u: 'replica-apps/s', l: 'Combined certified capacity · 9 nodes', d: 'Eight VPS replicas plus local applied the same 20,000-operation root with one 3-of-4 certificate. Summed resolver work; not logical replicated throughput.', lead: true },
        { v: fmt(CERTIFIED_FLEET.allReplicaLogical || 61398), u: 'ops/s', l: 'All-replica logical rate', d: 'Same certified segment on all nine replicas, bounded by the slowest required replica.' },
        { v: fmt(LOCAL.compactTransport || 812268), u: 'ops/s', l: 'Compact segment transport · two peers', d: '1,024 operations transported and reconstructed in one binary envelope. This is transport throughput, not accepted chain throughput.' },
        { v: String(LOCAL.compactBytesPerOp || 150.9), u: 'bytes/op', l: 'Binary segment wire', d: '6.47× below the former 976-byte outer-hex payload; exact operation bytes reconstruct.' },
        { v: fmt(LOCAL.hotAdmission || 51065), u: 'ops/s', l: 'Hot chain admission · local', d: 'Full per-operation verification on the same 20,000-operation corpus used for the certified comparison.' },
        { v: fmt(SOAK.averageQps || 12403), u: 'ops/s', l: 'Latest sustained public fleet · 6 nodes', d: '303-second historical baseline: 3,760,000 accepted, zero failures. It predates the new certified binary path.' }
      ];
      page.innerHTML = '<div class="stats-shell"><div class="stats-bento">' +
        tile('stats-hero', '', '<p class="stats-kicker">Measured, not claimed · chain prototype</p><h1 id="stats-title">What the fleet measurements show</h1>' +
          '<p>The current certified resolver fleet measures 1,712,006 summed replica-applications/s across eight VPS nodes plus local. Each replica verifies one certified segment root and 3-of-4 quorum once. Applying the same segment on every replica yields 61,398 logical ops/s at the all-node barrier. Compact two-peer transport remains separately measured at 812,268 effective ops/s.</p>' +
          '<p class="stats-chips"><span>' + esc(stats.measured) + '</span><span>9-node certified resolver evidence</span><span class="stats-live-chip" id="stats-live-chip" data-state="loading">Checking fleet status…</span></p>' +
          '<div class="stats-cta"><a class="stats-monitor-link" href="' + href(ARTICLE_STORY) + '" data-scene-link="' + ARTICLE_STORY + '">Read the whole story <span aria-hidden="true">→</span></a>' +
          '<a class="stats-monitor-link is-quiet" href="' + href('monitor') + '" data-scene-link="monitor">Live monitor <span aria-hidden="true">→</span></a></div>') +
        kpis.map(function (k) {
          return tile('stats-kpi' + (k.lead ? ' stats-kpi-lead' : ''), esc(k.l), '<p class="stats-kpi-value"><strong>' + esc(k.v) + '</strong><span>' + esc(k.u) + '</span></p><p class="stats-kpi-detail">' + esc(k.d) + '</p>');
        }).join('') +

        transferTile() +

        tile('stats-span-7', 'Where a server\'s time goes', '<h2>Before and after: the shape changed</h2>' +
          stack(EVIDENCE.cpuBefore) + stack(EVIDENCE.cpuAfter) +
          '<p class="stats-tile-copy">Shares of each server\'s own CPU under load, from call-stack profiles. The two servers run at different speeds, so compare the shapes, not the areas: HTTP and JSON were over half of the old one; signature checks are over half of the new one.</p>', 'stats-cpu-title') +
        tile('stats-span-5', 'Parsing against checking', '<h2>The parser is the cheap part</h2>' + parseCost() +
          '<p class="stats-tile-copy">One real agreement of 11 blocks. Splitting and resolving it costs about 3 µs; two signatures cost 113 µs. Canonical parsing measured 306,665 ops/s on one M2 core. Current matched chain measurements are <strong>51,065 ops/s hot admission</strong> and <strong>279,269 ops/s certified sharded application</strong>. Neither is an eight-node fleet result.</p>', 'stats-parse-title') +

        tile('stats-span-7', 'The ladder · same four cores', '<h2>What each step bought</h2>' + wideBars(EVIDENCE.ladder, 6500, ' transfers/s', 'Transfers per second on the same four cores') +
          '<p class="stats-tile-copy">Accepted finality, 300 concurrent, three runs each; ranges are the lowest and highest run. Dropping HTTP and tree-building took most of it. Sending the whole transfer in one write and checking signatures in batches took the rest.</p>', 'stats-ladder-title') +
        tile('stats-span-5', 'Batch signature checks', '<h2>Batching pays only when the batch is big</h2>' + batchCurve() +
          '<p class="stats-tile-copy">Checking one signature in a batch is slower than checking it alone. From about a dozen up it is twice as fast. A server can only get a big batch by pooling signatures, so it measured two ways to do that.</p>' +
          wideBars(EVIDENCE.batchModes, 6500, ' transfers/s', 'Transfers per second by verification mode') +
          '<p class="stats-tile-copy">One caution travels with this: batch checking can accept a signature that checking one at a time would reject, if the signer crafts it. Safe for a single notebook; every party that must agree on validity has to run the same mode.</p>', 'stats-batch-title') +

        tile('stats-span-12', 'Context · the old fabric fleet run', '<h2>' + fmt(RUN.total) + ' transfers a second on the certified-fabric path</h2>' + serverCards() +
          '<p class="stats-tile-copy">Kept here as context, not as the chosen direction. This is the earlier agreement-fabric path on four servers, six clients, ' + RUN.window + ' window, zero failures. The chain-prototype peak above (' + fmt(CHAIN.aggregate || 79654) + ' ops/s across 6 nodes) is a different short benchmark; sustained throughput must be measured under shared client and network contention, as the five-minute soak does.</p>' + fleetLadder(), 'stats-fleet-title') +

        (function () {
          var HT = stats.honestTransfers || {};
          return tile('stats-span-12 stats-chosen', 'Honest transfers · three numbers, side by side', '<h2>Finalized transfers · logical ops · replica applications</h2>' +
            '<p class="stats-tile-copy">The design doc §1 insists on three numbers reported together, so no single value overclaims. Measured 2026-10-08 on one M-series Mac core with <code>transfer-bench</code>: ' + fmt(HT.submitted || 24000) + ' transfers over a ' + (HT.windowSeconds || 10) + '-second sustained window, 8 holder shards, 4 replicas per shard assumed for the replica number, zero errors. ' + fmt(HT.sameShard || 3014) + ' same-shard, ' + fmt(HT.crossShard || 20986) + ' cross-shard — every finalized transfer completed the full 4-step PREPARE/ACCEPT/COMMIT/FINALIZE dance.</p>' +
            '<div class="stats-table-wrap"><table class="stats-table stats-table-wrapped stats-chosen-table"><thead>' + headRow(['Measurement', 'Rate', 'What it counts', 'What it does NOT count']) + '</thead><tbody>' +
            '<tr class="is-chosen"><td><strong>Finalized transfers / s</strong> · the headline</td><td><strong>' + fmt(HT.finalizedTps || 3768) + '</strong></td><td>Only FINALIZE entries that referenced a real COMMIT that referenced a real ACCEPT that referenced a real PREPARE. Transfers, not ledger ops.</td><td>Does not include transfers that only reached ACCEPT or COMMIT; does not multiply by replica count.</td></tr>' +
            '<tr><td>Logical ops / s</td><td><strong>' + fmt(HT.logicalOpsPerSecond || 15073) + '</strong></td><td>Every admitted ledger record. In the current same-wire shape, cross-shard = 4 ops per transfer, same-shard = 4 ops per transfer. Logical, not multiplied.</td><td>Is not a transfer count. Divide by ~4 to get finalized transfers.</td></tr>' +
            '<tr><td>Replica applications / s</td><td><strong>' + fmt(HT.replicaAppsPerSecond || 60292) + '</strong></td><td>logical_ops × replicas-per-shard (4, matching the 3-of-4 committee the design doc specifies). Total resolver work the fleet performs.</td><td>Is not a transfer count. Is not a certified-finality rate.</td></tr>' +
            '</tbody></table></div>' +
            '<p class="stats-tile-copy"><strong>Burst variants</strong> (1,000 transfers per run, single pass): mixed = ' + fmt((HT.burst && HT.burst.mixed && HT.burst.mixed.finalizedTps) || 4237) + ' finalized tps; cross-shard-only = ' + fmt((HT.burst && HT.burst.crossShard && HT.burst.crossShard.finalizedTps) || 4132) + '; same-shard-only = ' + fmt((HT.burst && HT.burst.sameShard && HT.burst.sameShard.finalizedTps) || 3472) + '. Cross-shard is slightly faster than same-shard in this run because the same-shard chain carries more sequential state per party in-process; a real fleet with separate shards admitting in parallel would widen that gap.</p>' +
            '<p class="stats-tile-copy">The ledger-ops numbers on the "chosen path" table below describe the admit path by itself — a different number from honest finalized transfers. Both are real; neither is quoted without its label.</p>', 'stats-honest-title');
        })() +

        tile('stats-span-12 stats-chosen', 'The chosen path · the chain prototype on the real fleet', '<h2>The numbers that describe where we are shipping</h2>' +
          '<p class="stats-tile-copy">Every row below is the chain prototype on real hardware: per-identity chains and content-addressed records over the current line-framed TCP ingress. The public soak used each node\'s local cold-start cache; K-of-N peer replication and hypercore transport are separate implementation stages and are not included in the 12,403 ops/s result. Each row describes a different measurement window. None is a projection.</p>' +
          '<div class="stats-table-wrap"><table class="stats-table stats-table-wrapped stats-chosen-table"><thead>' + headRow(['Measurement', 'Ops / s', 'What it is', 'What it is not']) + '</thead><tbody>' +
          '<tr class="is-chosen"><td>Chain resolver, batch, local core</td><td><strong>41,762</strong></td><td>Per-identity chain, burst batch verify across 32 chains, one M-series Mac core. The baseline shape.</td><td>Mac silicon.</td></tr>' +
          '<tr class="is-chosen"><td>Chain resolver, hot admission, local node</td><td><strong>51,065</strong></td><td>20,000 independent holders with full per-operation verification.</td><td>Local memory-state measurement, not fleet throughput.</td></tr>' +
          '<tr class="is-chosen"><td>Certified segment application, nine-node combined capacity</td><td><strong>1,712,006 replica-applications/s</strong></td><td>Eight VPS replicas plus local concurrently applied the same 20,000-operation root with one 3-of-4 certificate; 180,000/180,000 applications succeeded.</td><td>Summed resolver work. All-replica logical rate is 61,398 ops/s; network broadcast and durable segment commit are excluded.</td></tr>' +
          '<tr class="is-chosen"><td>Compact segment transport, two local peers</td><td><strong>812,268</strong></td><td>1,024 operations in one binary signed envelope over TCP + Noise + Yamux.</td><td>Transport/reconstruction, not accepted chain operations.</td></tr>' +
          '<tr class="is-chosen"><td>Chain resolver, 6-node short parallel benchmark</td><td><strong>79,654</strong></td><td>bk2, mk2, bk1, mist1, eug-2c, eul-4c (3 regions, 2 providers). 38,400 operations in parallel streams, zero errors, 868 ms wall-clock.</td><td>A short capacity sample, not cumulative growth and not a sustained-load forecast.</td></tr>' +
          '<tr class="is-chosen"><td>Six-node sustained public-client soak</td><td><strong>12,403</strong></td><td>3,760,000 operations accepted over 303 seconds while one local arm64 client drove all six public nodes concurrently; zero failures.</td><td>Not six times the single-node run, not replica-certified durability, and not a cumulative counter.</td></tr>' +
          '<tr class="is-chosen"><td>Chain resolver, single pair, 128 chains interleaved</td><td><strong>22,559</strong></td><td>bk2 → mk2 cross-WAN, 64,000 operations, server-side burst batching, zero errors. The per-pair component of the fleet number above.</td><td>Not a soak run; chain-server runs with LocalCache replication.</td></tr>' +
          '<tr><td>Chain resolver, replay (fast)</td><td><strong>279,149</strong></td><td>Cold-start replay with head-only sig verify + hash chain for the tail. Same guarantee as strict replay for 10x the throughput — about 12x faster than live admission, so a peer recovers faster than it falls behind.</td><td>A replay number, not a hot-write number.</td></tr>' +
          '<tr><td>GPU box CPU, per core, batch</td><td><strong>10,476</strong></td><td>EPYC 9355 shared with other tenants, 2+2 cores, batch verify on. Compared to the fleet Xeon (3,107/s), ~3.4x per core.</td><td>The GPU itself is never touched; this is CPU only (see /stats/gpu).</td></tr>' +
          '</tbody></table></div>' +
          '<p class="stats-tile-copy">The chosen row is highlighted because it is where this project is heading, not because it is the biggest number. The 279,149/s replay figure is bigger, but it describes cold-start recovery, not production throughput — and that recovery-faster-than-ingestion gap (about 12x) is the real durability story: a lagging peer catches up far faster than live traffic flows in.</p>', 'stats-chosen-title') +

        tile('stats-span-12 stats-scope', 'What none of this proves', '<ul class="stats-scope-list is-single">' +
          '<li>The 12,403 ops/s soak measured signed admission into each node\'s local cold-start cache. It did not exercise K-of-N peer replication, hypercore transport, or a partition.</li>' +
          '<li>Clients were fleet machines, not the public. It is a prototype on a real multi-provider fleet, not yet a public service.</li>' +
          '<li>Batch checking is cofactored; safe within a single notebook, but every party that must agree on validity has to run the same mode.</li>' +
          '<li>No independent security review has looked at any of this.</li></ul>', 'stats-scope-title') +

        tile('stats-span-12', 'One-million-ops audit · target, not result', '<h2>The parser can scale there; accepted operations do not yet</h2>' +
          '<p class="stats-tile-copy">The chain hot path uses dense FLX text with no JSON wrapper and no per-operation <code>fsync</code>. The matched current run measured 51,065 ops/s for full hot admission and 279,269 ops/s for certified application on eight holder shards. Binary segment transport measured 812,268 effective ops/s between two local peers.</p>' +
          '<p class="stats-tile-copy">The global ledger mutex, repeated operation verification, per-operation broadcast and outer hex wrapper have been removed from the new path. The remaining proof is production integration: authorized validator keys and quorum roster, group-commit-to-segment wiring, eight-node deployment, then a sustained replicated fleet rerun. One million accepted durable ops/s remains unverified.</p>' +
          '<p class="stats-tile-copy"><a class="stats-inline-link" href="/docs/evidence/bench-005-million-ops-audit.md">Read BENCH-005 · measurements, boundary, and exact implementation scope →</a></p>', 'stats-million-title') +

        tile('stats-span-12', 'A finance resolver by construction', '<h2>Make double-spend unrepresentable, not prevented</h2>' +
          '<p class="stats-tile-copy">The next design does not try to lock the spend marker harder. It removes the thing that needs locking. Each identity owns an append-only chain of value moves; a spend is one entry on the holder\'s own chain, signed by their own key, at a position their own previous entry determined. Position <code>n</code> can hold exactly one record — a second one is self-signed equivocation under the holder\'s own signature, and the chain is burned from there. There is no global order, no mempool, no fork choice.</p>' +
          '<p class="stats-tile-copy">The grammar extension is one letter (<code>J</code>, decimal chain position) under registered type <code>LEDGERENTRY</code>. The current matched local run measures <strong>51,065 ops/s</strong> with full verification and <strong>279,269 ops/s</strong> after one certified root/quorum check across eight holder shards. Seven core attacks plus segment tampering, missing quorum and sequence replay are refused by tests.</p>' +
          '<p class="stats-tile-copy"><a class="stats-inline-link" href="' + href('stats/ledger') + '" data-scene-link="stats/ledger">Open /stats/ledger →</a> for the sample, the attack suite, the measurement, and the open items.</p>', 'stats-ledger-title') +

        tile('stats-span-12 stats-trail-tile', 'The trail · including the wrong turns', '<h2>How we got here, and what we got wrong</h2>' +
          '<p class="stats-tile-copy">One working session, ten steps. Four were wins, one lost before it won, four were wrong, refuted or harness bugs, and one was smaller than hoped. Each is in the evidence log with its numbers.</p>' + trail() +
          '<p class="stats-tile-copy"><a class="stats-inline-link" href="' + href(ARTICLE_STORY) + '" data-scene-link="' + ARTICLE_STORY + '">Read the full story</a> in plain language.</p>', 'stats-trail-title') +

        tile('stats-span-12 stats-evidence', 'Read and verify', '<ul class="stats-links">' +
          '<li><a href="' + href(ARTICLE_STORY) + '" data-scene-link="' + ARTICLE_STORY + '">Article · How we got fast, and everything we got wrong</a></li>' +
          '<li><a href="' + href(ARTICLE_GRAMMAR) + '" data-scene-link="' + ARTICLE_GRAMMAR + '">Article · The grammar does almost no work</a></li>' +
          '<li><a href="' + href('stats/gpu') + '" data-scene-link="stats/gpu">The GPU experiment · what the GPU actually does, and the CPU that matters</a></li>' +
          '<li><a href="' + href('stats/ledger') + '" data-scene-link="stats/ledger">The finance ledger · a resolver that makes double-spend unrepresentable</a></li>' +
          '<li><a href="/docs/finance-ledger-design.md">The design document · LEDGERENTRY grammar + 6-step resolver</a></li>' +
          '<li><a href="/docs/evidence/bench-003-rust-fleet-ceiling.md">BENCH-003 · The full investigation log, sections 1-16</a></li>' +
          '<li><a href="/docs/evidence/bench-004-chain-fleet-soak.md">BENCH-004 · Five-minute six-node soak</a></li>' +
          '<li><a href="/docs/evidence/bench-005-million-ops-audit.md">BENCH-005 · Path to one million accepted operations a second</a></li>' +
          '<li><a href="/docs/mainnet-readiness.md">Mainnet readiness · what the prototype does and does not change</a></li>' +
          '<li><a href="/docs/evidence/bench-001-verification.md">BENCH-001 · First verification record</a></li></ul>', 'stats-evidence-title') +

        tile('stats-span-12 stats-raw-tile', '', rawTables()) +
        '</div></div>';
      host.appendChild(page);

      // Record picker for the real transfer.
      var body = page.querySelector('#stats-stage-body');
      if (body && window.ArkStatsSample) {
        var tabs = [].slice.call(page.querySelectorAll('.stats-stage-tab'));
        var select = function (name) {
          tabs.forEach(function (t) { var on = t.getAttribute('data-stage') === name; t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; });
          renderStage(body, name);
        };
        tabs.forEach(function (t, i) {
          t.addEventListener('click', function () { select(t.getAttribute('data-stage')); });
          t.addEventListener('keydown', function (e) {
            var k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
            if (!k) return;
            var next = tabs[(i + k + tabs.length) % tabs.length]; next.focus(); select(next.getAttribute('data-stage')); e.preventDefault();
          });
        });
        select('AGREEMENT');
      }

      // One real, live check fetched on load, not polled. Production uses
      // ArkPulse's same-origin HTTPS route; local operators may override it.
      var chip = page.querySelector('#stats-live-chip');
      if (chip && window.ArkPulse) {
        ArkPulse.get()
          .then(function (result) {
            var data = result.data;
            var alive = (data.nodes || []).filter(function (n) { return !n.error; }).length;
            var total = (data.nodes || []).length;
            chip.dataset.state = alive === total ? 'ok' : 'warn';
            chip.textContent = 'Live capacity · ' + alive + '/' + total + ' nodes · ' + Math.round(data.aggregate_qps || 0).toLocaleString('en-US') + ' ops/s · ' + new Date(data.measured_at_ms).toLocaleTimeString();
          })
          .catch(function () { chip.dataset.state = 'warn'; chip.textContent = 'Pulse unreachable'; });
      }
      return page;
    }
  };
})();

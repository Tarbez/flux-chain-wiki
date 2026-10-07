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
      { kind: 'wrong', tag: 'Wrong conclusion', title: 'The GPU, and "it is not compute-bound"', from: '2,298', to: '2,356', unit: '/s laptop vs GPU', body: 'The GPU did nothing, correctly. But idle CPUs were starved threads, not proof. Fixed, the servers ran at 90-95% CPU.' },
      { kind: 'refuted', tag: 'Refuted', title: 'Pipelined replication', from: '877-954', to: '841-911', unit: '/s durable', body: 'Expected near accepted speed. Measured against a control: no gain. Left off.' },
      { kind: 'wrong', tag: 'Wrong test', title: 'Benchmarked the wrong codec', from: '', to: '', unit: '', body: 'The learning library\'s vocabulary codec cannot encode a transfer. The grammar meant is the registered one in flux-core, and it had not been tested. The owner caught it.' },
      { kind: 'win', tag: 'Win', title: 'The registered grammar on a raw socket', from: '1,926', to: '5,076', unit: '/s, same 4 cores', body: 'Then the whole fleet: 21,199 /s. A simpler stand-in showed 35,499 but carried half the signatures, so it is not the number.' },
      { kind: 'mixed', tag: 'Smaller than hoped', title: 'Batch signature checks', from: '2x', to: '+17-22%', unit: 'measured', body: 'The micro-benchmark said about twice as fast; it can only shrink a share of the cost. One verifier thread made it worse. Fleet: 21,199 to 24,908.' },
      { kind: 'wrong', tag: 'Harness bugs', title: 'Mistakes that cost hours, none in the protocol', from: '', to: '', unit: '', body: 'A missing firewall rule posed as an architecture ceiling; a kill scoped too broadly took production down 19 minutes; a 128-slot listen queue dropped two clients; pkill -x ignores names over 15 characters.' }
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
      var kpis = [
        { v: fmt(RUN.total), u: 'transfers/s', l: 'Whole fleet · registered grammar', d: 'Ten machines, four servers at once, ' + RUN.window + ', ' + fmt(RUN.transfers) + ' transfers, 0 failures. Prototype, accepted finality.', lead: true },
        { v: '~3x', u: 'per core', l: 'Same four cores', d: 'About 1,900 transfers/s over HTTP + JSON, about 5,700-5,900 on the grammar with batch checks.' },
        { v: '2%', u: 'of server CPU', l: 'The grammar itself', d: 'Signature checks are 55%. The parser is not the cost.' },
        { v: '0', u: 'failures', l: 'Every run on this page', d: RUN.transfers.toLocaleString('en-US') + ' transfers in the fleet run alone.' }
      ];
      page.innerHTML = '<div class="stats-shell"><div class="stats-bento">' +
        tile('stats-hero', '', '<p class="stats-kicker">Measured, not claimed</p><h1 id="stats-title">How fast, and why</h1>' +
          '<p>A transfer is five short lines of text. Parsing them is about 2% of a server\'s work. Below: the real bytes, where the time goes, what each step bought, every wrong turn on the way, and what none of it proves.</p>' +
          '<p class="stats-chips"><span>' + esc(stats.measured) + '</span><span>10 machines, 2 providers</span><span class="stats-live-chip" id="stats-live-chip" data-state="loading">Checking fleet status…</span></p>' +
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
          '<p class="stats-tile-copy">One real agreement of 11 blocks. Splitting and resolving it costs about 3 µs; two signatures cost 113 µs. Decoding every field into a tree first costs more than the whole door check, so the server slices stored records instead.</p>', 'stats-parse-title') +

        tile('stats-span-7', 'The ladder · same four cores', '<h2>What each step bought</h2>' + wideBars(EVIDENCE.ladder, 6500, ' transfers/s', 'Transfers per second on the same four cores') +
          '<p class="stats-tile-copy">Accepted finality, 300 concurrent, three runs each; ranges are the lowest and highest run. Dropping HTTP and tree-building took most of it. Sending the whole transfer in one write and checking signatures in batches took the rest.</p>', 'stats-ladder-title') +
        tile('stats-span-5', 'Batch signature checks', '<h2>Batching pays only when the batch is big</h2>' + batchCurve() +
          '<p class="stats-tile-copy">Checking one signature in a batch is slower than checking it alone. From about a dozen up it is twice as fast. A server can only get a big batch by pooling signatures, so it measured two ways to do that.</p>' +
          wideBars(EVIDENCE.batchModes, 6500, ' transfers/s', 'Transfers per second by verification mode') +
          '<p class="stats-tile-copy">One caution travels with this: batch checking can accept a signature that checking one at a time would reject, if the signer crafts it. Safe for a single notebook; every party that must agree on validity has to run the same mode.</p>', 'stats-batch-title') +

        tile('stats-span-12', 'The whole fleet · one run, six clients at once', '<h2>' + fmt(RUN.total) + ' transfers a second, machine by machine</h2>' + serverCards() +
          '<p class="stats-tile-copy">Same start instant, ' + RUN.window + ' window, zero failures. Three of the four servers were 86-92% busy, so those pairs are server-bound; <strong>mk2</strong> was waiting on its one-core client. The percentage is the gain over the same fleet without batch checks.</p>' + fleetLadder(), 'stats-fleet-title') +

        tile('stats-span-7', 'Not like for like', '<h2>Faster is not the same as comparable</h2>' + compareTable() +
          '<p class="stats-tile-copy">The certified fabric does more per transfer. The prototype is faster partly because it does less. Both numbers are real; neither should be quoted without its label.</p>', 'stats-compare-title') +
        tile('stats-span-5 stats-scope', 'What none of this proves', '<ul class="stats-scope-list is-single">' +
          '<li>Accepted finality only: nothing is replicated or flushed, so a crash loses it. A durable path over the wire does not exist yet.</li>' +
          '<li>No threshold certificate, so no Byzantine tolerance on this path.</li>' +
          '<li>Clients were fleet machines, not the public. It is a prototype, not a deployed service.</li>' +
          '<li>Batch checking is cofactored; unsafe where several parties must agree on validity until they share one mode.</li>' +
          '<li>No independent security review has looked at any of this.</li></ul>', 'stats-scope-title') +

        tile('stats-span-12 stats-trail-tile', 'The trail · including the wrong turns', '<h2>How we got here, and what we got wrong</h2>' +
          '<p class="stats-tile-copy">One working session, ten steps. Four were wins, one lost before it won, four were wrong, refuted or harness bugs, and one was smaller than hoped. Each is in the evidence log with its numbers.</p>' + trail() +
          '<p class="stats-tile-copy"><a class="stats-inline-link" href="' + href(ARTICLE_STORY) + '" data-scene-link="' + ARTICLE_STORY + '">Read the full story</a> in plain language.</p>', 'stats-trail-title') +

        tile('stats-span-12 stats-evidence', 'Read and verify', '<ul class="stats-links">' +
          '<li><a href="' + href(ARTICLE_STORY) + '" data-scene-link="' + ARTICLE_STORY + '">Article · How we got fast, and everything we got wrong</a></li>' +
          '<li><a href="' + href(ARTICLE_GRAMMAR) + '" data-scene-link="' + ARTICLE_GRAMMAR + '">Article · The grammar does almost no work</a></li>' +
          '<li><a href="/docs/evidence/bench-003-rust-fleet-ceiling.md">BENCH-003 · The full investigation log, sections 1-15</a></li>' +
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

      // One real, live check fetched on load, not polled. Failure says so plainly.
      var chip = page.querySelector('#stats-live-chip');
      if (chip && window.fetch) {
        var controller = new AbortController();
        var timer = setTimeout(function () { controller.abort(); }, 6000);
        fetch('https://defxn.com/api/fleet-status', { cache: 'no-store', signal: controller.signal })
          .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
          .then(function (data) {
            clearTimeout(timer);
            var s = data.summary;
            chip.dataset.state = s.quorumsOnline === s.quorumsTotal ? 'ok' : 'warn';
            chip.textContent = s.quorumsOnline + '/' + s.quorumsTotal + ' quorums online right now';
          })
          .catch(function () { clearTimeout(timer); chip.dataset.state = 'warn'; chip.textContent = 'Live status unavailable'; });
      }
      return page;
    }
  };
})();

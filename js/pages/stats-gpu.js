/* /stats/gpu: the GPU-box experiment, and the correction it forced.
   Reached from /stats ("The GPU, and 'it is not compute-bound'"). Hidden from nav.
   Every figure is from docs/evidence/bench-003-rust-fleet-ceiling.md §16 (and §9 for the
   superseded claim). Self-contained: reuses the bento classes from css/stats.css, holds its
   own data, reads nothing from stats.js. 2+2 means 2 server cores + 2 client cores, to
   compare silicon rather than core count. */
(function () {
  'use strict';

  var CPUS = [
    { name: 'bk2', cpu: 'Intel Xeon Gold 6230R @2.1 GHz', kind: 'fleet', sig: 51549, agree: 137802, grammar: 2398, batch: 3107, dedicated: true },
    { name: 'eul-4c', cpu: 'AMD EPYC 9355P (dedicated)', kind: 'fleet', sig: 25812, agree: 57015, grammar: 5844, batch: 7926, dedicated: true },
    { name: 'GPU box', cpu: 'AMD EPYC 9355 (shared, 8-core cap)', kind: 'gpu', sig: 24564, agree: 55134, grammar: 7341, batch: 10476, dedicated: false }
  ];
  var WAN = [
    { path: 'GPU → bk2', rtt: 71, one: 2659, five: 4980 },
    { path: 'GPU → eul-4c', rtt: 143, one: 1786, five: 5205 }
  ];
  var PROOF = [
    ['GPU compute contexts from our processes', '0', 'nvidia-smi --query-compute-apps, while running flat out'],
    ['CUDA / cuBLAS / nvrtc linked in our binaries', '0', 'ldd on every binary we ran'],
    ['/dev/nvidia* handles held by our processes', '0', 'walked /proc/*/fd'],
    ['The 99% / 550 W readings seen earlier', 'other tenants', 'a shared multi-tenant GPU host; load ~11-13 even when we are idle']
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

  function bars(items, max, suffix, key, label) {
    return '<ol class="stats-bars stats-bars-wide" aria-label="' + esc(label) + '">' + items.map(function (it) {
      var v = it[key], shown = key === 'sig' || key === 'agree' ? (v / 1000).toFixed(1) + ' µs' : fmt(v) + suffix;
      var tip = it.name + ': ' + shown + ' (' + it.cpu + ')';
      return '<li class="stats-bar-row" tabindex="0" data-tip="' + esc(tip) + '" aria-label="' + esc(tip) + '">' +
        '<span class="stats-bar-key">' + esc(it.name) + '</span>' +
        '<span class="stats-bar-track"><span class="stats-bar' + (it.kind === 'gpu' ? '' : ' is-strong') + '" style="--w:' + pct(v, max) + '"></span></span>' +
        '<span class="stats-bar-value">' + esc(shown) + '</span></li>';
    }).join('') + '</ol>';
  }

  ArkUI.pageModules.statsGpu = {
    mount: function (host) {
      var page = document.createElement('section');
      page.className = 'ark-page task-page stats-page';
      page.setAttribute('aria-labelledby', 'statsgpu-title');
      var maxGrammar = 11000, maxSig = 140000;
      page.innerHTML = '<div class="stats-shell"><div class="stats-bento">' +
        tile('stats-hero', '', '<p class="stats-kicker">Measured, not claimed</p><h1 id="statsgpu-title">The GPU does nothing here</h1>' +
          '<p>We rented a box with an RTX PRO 6000 to see whether more hardware would help. It did not, and this time we can say exactly why: the protocol never addresses the GPU at all. It is signatures and hashing on the CPU. The box is fast because of its <em>CPU</em>, and that is worth measuring.</p>' +
          '<p class="stats-chips"><span>2026-10-07</span><span>registered grammar</span><span>accepted finality</span></p>' +
          '<a class="stats-monitor-link" href="' + href('stats') + '" data-scene-link="stats"><span aria-hidden="true">←</span> Back to the measurements</a>') +

        tile('stats-span-7', 'What touches the GPU', '<h2>Nothing of ours, checked four ways</h2>' +
          '<div class="stats-table-wrap"><table class="stats-table stats-table-wrapped"><thead>' + headRow(['Checked', 'Result', 'How']) + '</thead><tbody>' +
          PROOF.map(function (p) { return row([esc(p[0]), '<strong>' + esc(p[1]) + '</strong>', esc(p[2])]); }).join('') +
          '</tbody></table></div>' +
          '<p class="stats-tile-copy">Earlier we wrote "a GPU does not help" and reasoned from idle CPU — but that idle was starved threads, not proof. Fixed, the servers run at 90-95% CPU. The clean statement is simpler: our binaries link no GPU library and open no GPU device. The 99% readings were the host’s other tenants.</p>', 'statsgpu-proof-title') +
        tile('stats-span-5 stats-scope', 'So why was it fast?', '<ul class="stats-scope-list is-single">' +
          '<li><strong>The CPU.</strong> A modern AMD EPYC verifies an ed25519 signature in about half the time of the fleet’s Intel Xeons, and verification is ~55% of a server’s work.</li>' +
          '<li><strong>Not the GPU.</strong> It sat idle for us throughout; its power draw was other tenants’ work.</li>' +
          '<li><strong>Eco by consequence.</strong> A validator needs a plain CPU core, not an accelerator.</li></ul>', 'statsgpu-why-title') +

        tile('stats-span-6', 'Per core: one signature verify', '<h2>Half the time on EPYC</h2>' + bars(CPUS, maxSig, '', 'sig', 'Single ed25519 verify') +
          '<p class="stats-tile-copy">One ed25519 verify, one core. The whole speed story is here: EPYC does it in ~25 µs, the Xeon in ~52 µs.</p>', 'statsgpu-sig-title') +
        tile('stats-span-6', 'Per core: grammar throughput', '<h2>~2.5x the Xeon, same code</h2>' + bars(CPUS, maxGrammar, ' /s', 'batch', 'Grammar throughput with batch verification') +
          '<p class="stats-tile-copy">2 server + 2 client cores, burst batch verification, accepted finality. eul-4c is a dedicated EPYC and the trustworthy read; the GPU box runs a little higher but is a shared, contended host, so treat it as noisy.</p>', 'statsgpu-grammar-title') +

        tile('stats-span-12', 'Over the real internet', '<h2>Batching beats distance</h2>' +
          '<p class="stats-tile-copy">The GPU box gave the first genuine wide-area client. Real round trips: 71 ms to bk2, 143 ms to eul-4c. One transfer per write is capped by the round trip; five per write amortise it and recover about 5,000/s on both paths — the pipelining lesson, now over a real intercontinental link.</p>' +
          '<div class="stats-table-wrap"><table class="stats-table"><thead>' + headRow(['Client → server', 'Round trip', '1 transfer / write', '5 transfers / write']) + '</thead><tbody>' +
          WAN.map(function (w) { return row([esc(w.path), w.rtt + ' ms', fmt(w.one) + '/s', '<strong>' + fmt(w.five) + '/s</strong>']); }).join('') +
          '</tbody></table></div>', 'statsgpu-wan-title') +

        tile('stats-span-12 stats-evidence', 'Read and verify', '<ul class="stats-links">' +
          '<li><a href="/docs/evidence/bench-003-rust-fleet-ceiling.md">BENCH-003 §16 · the GPU box, measured and corrected</a></li>' +
          '<li><a href="' + href('stats') + '" data-scene-link="stats">Back to the main measurements</a></li></ul>', 'statsgpu-ev-title') +
        '</div></div>';
      host.appendChild(page);
      return page;
    }
  };
})();

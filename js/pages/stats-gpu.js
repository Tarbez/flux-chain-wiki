/* /stats/gpu: the GPU-box experiment, and the correction it forced, as a page of Ark blocks.
   Reached from /stats ("The GPU, and why it is not compute-bound"). Hidden from nav.
   Every figure is from docs/evidence/bench-003-rust-fleet-ceiling.md §16 (and §9 for the
   superseded claim). The page holds its own data and reads nothing from stats.js. 2+2 means
   2 server cores + 2 client cores, to compare silicon rather than core count.

   Converted to data in DEFXN polish Wave 3 (W3-STATS): the answer first (the hero and the three
   numbers that settle it), then the detail by question in tabs. It was 2.03x the viewport on a
   desktop and 3.28x on a phone (docs/ux-audit/pages-ux-b.md /stats/gpu); every table, bar and
   note is still here. The hand-built tile/table/bar helpers (esc, fmt, pct, tile, headRow, row,
   bars) and their css/stats.css classes are gone: the blocks are Ark's.

   Layout keys: every element of the old page with words keeps the key it had (the `was` pins,
   derived by tests/lib/layout-continuity.cjs from the frozen census
   tests/fixtures/layout-keys/stats-gpu.tsv). Regression: tests/stats-gpu-blocks.cjs. */
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

  function fmt(n) { return Number(n).toLocaleString('en-US'); }
  function micro(ns) { return (ns / 1000).toFixed(1) + ' µs'; }
  var XEON = CPUS[0], EPYC = CPUS[1];

  /* `was`: the layout key each element had on the old page, by spec entry -- derived by
     tests/lib/layout-continuity.cjs (derive /stats/gpu, from the frozen census), except the
     `self` pins and the hand pins of reshaped words, which tests/stats-gpu-blocks.cjs lists
     with the reason for each. */
  var T = 'page:/div:1/div:1';
  var WAS = {
    'statsgpu-hero': {
      ':root': { key: T + '/article:1', self: true }, 'eyebrow': T + '/article:1/p:1', 'hero-lede': T + '/article:1/p:2',
      'hero-meta': { key: T + '/article:1/p:3', self: true }, ':scope > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)': T + '/article:1/p:3/span:1'
    },
    'statsgpu-views': {
      'tabs-trigger': 'id:statsgpu-proof-title', 'tabs-content': { key: T + '/article:2', self: true },
      'table-wrap': T + '/article:2/div:1', 'disclosure-panel': T + '/article:2/p:2',
      'tabs-trigger#2': 'id:statsgpu-why-title', 'tabs-content#2': { key: T + '/article:3', self: true }, 'facts': T + '/article:3/ul:1',
      'fact': T + '/article:3/ul:1/li:1', 'fact#2': T + '/article:3/ul:1/li:2', 'fact#3': T + '/article:3/ul:1/li:3',
      'fact-term': T + '/article:3/ul:1/li:1/strong:1', 'fact-term#2': T + '/article:3/ul:1/li:2/strong:1', 'fact-term#3': T + '/article:3/ul:1/li:3/strong:1',
      'tabs-trigger#3': 'id:statsgpu-sig-title', 'tabs-content#3': { key: T + '/article:4', self: true },
      'section-title': T + '/article:4/h2:1', 'meter-list': T + '/article:4/ol:1', 'disclosure-panel#2': T + '/article:4/p:2',
      'tabs-trigger#4': 'id:statsgpu-grammar-title', 'tabs-content#4': { key: T + '/article:5', self: true },
      'section-title#2': T + '/article:5/h2:1', 'meter-list#2': T + '/article:5/ol:1', 'disclosure-panel#3': T + '/article:5/p:2',
      'tabs-trigger#5': 'id:statsgpu-wan-title', 'tabs-content#5': { key: T + '/article:6', self: true },
      'table-wrap#2': T + '/article:6/div:1', 'disclosure-panel#4': T + '/article:6/p:2'
    },
    insert: { key: T + '/div:1', self: true },
    'statsgpu-onward': {
      ':root': { key: T + '/article:7', self: true },
      ':scope > div:nth-of-type(1) > p:nth-of-type(1)': 'id:statsgpu-ev-title', ':scope > div:nth-of-type(1) > ul:nth-of-type(1)': T + '/article:7/ul:1'
    }
  };

  /* A note that sits beside its table or bars: whole on a tablet or desktop, folded behind one
     button on a phone (Ark's disclosure, foldBelow) -- kept in the page, never cut off. */
  function note(text) { return { block: 'disclosure', props: { content: text, foldBelow: 'phone', more: 'Read the note', less: 'Fold the note' } }; }

  function spec() {
    return [
      { block: 'breadcrumb', id: 'statsgpu-crumbs', was: WAS['statsgpu-crumbs'], props: { label: 'Your place', items: [
        { label: 'Home', href: 'route:zero' }, { label: 'Mesh performance', href: 'route:stats' }, { label: 'GPU benchmark detail' }] } },
      /* The answer: what the page is (the lede) and the three numbers that settle it (the
         details). The way back is the trail above and the pager below, so the hero carries no
         third copy of it (its old back link kept a phone view inside the fold rule). */
      { block: 'hero', id: 'statsgpu-hero', was: WAS['statsgpu-hero'], props: {
        eyebrow: 'Measured, not claimed', title: 'The GPU does nothing here', density: 'compact',
        lede: 'We rented a box with an RTX PRO 6000 to see whether more hardware would help. It did not, and this time we can say exactly why: the protocol never addresses the GPU at all. It is signatures and hashing on the CPU. The box is fast because of its CPU, and that is worth measuring.',
        meta: [
          { label: 'Our GPU work', value: '0 contexts' },
          { label: 'One signature verify', value: 'EPYC ' + micro(EPYC.sig) + ' · Xeon ' + micro(XEON.sig) },
          { label: 'Grammar throughput', value: 'EPYC ' + fmt(EPYC.batch) + '/s · Xeon ' + fmt(XEON.batch) + '/s' },
          { label: 'Measured', value: '2026-10-07 · registered grammar · measured, not production' }
        ] } },
      { block: 'tabs', id: 'statsgpu-views', was: WAS['statsgpu-views'], props: { label: 'GPU benchmark views', items: [
        { value: 'gpu', label: 'What touches the GPU', blocks: [
          { block: 'table', props: { caption: 'Nothing of ours, checked four ways', maxHeight: 'compact',
            columns: [{ key: 'checked', label: 'Checked' }, { key: 'result', label: 'Result' }, { key: 'how', label: 'How', mono: true }],
            rows: PROOF.map(function (p) { return { checked: p[0], result: p[1], how: p[2] }; }) } },
          note('Earlier we wrote "a GPU does not help" and reasoned from idle CPU — but that idle was starved threads, not proof. Fixed, the servers run at 90-95% CPU. The clean statement is simpler: our binaries link no GPU library and open no GPU device. The 99% readings were the host’s other tenants.')
        ] },
        { value: 'why', label: 'Why it was fast', blocks: [
          { block: 'facts', props: { label: 'Why the box was fast', columns: 1, items: [
            { term: 'The CPU.', value: 'A modern AMD EPYC verifies an ed25519 signature in about half the time of the fleet’s Intel Xeons, and verification is ~55% of a server’s work.' },
            { term: 'Not the GPU.', value: 'It sat idle for us throughout; its power draw was other tenants’ work.' },
            { term: 'Eco by consequence.', value: 'A resolver shard needs a plain CPU core, not an accelerator.' }
          ] } }
        ] },
        { value: 'signature', label: 'Signature verify', blocks: [
          { block: 'section-header', props: { title: 'Half the time on EPYC', level: 2 } },
          { block: 'meter', props: { label: 'Single ed25519 verify, one core', items: CPUS.map(function (it) { return { label: it.name + ' · ' + it.cpu, value: it.sig, display: micro(it.sig) }; }) } },
          note('One [[ed25519]] verify, one core. The whole speed story is here: EPYC does it in ~25 µs, the Xeon in ~52 µs.')
        ] },
        { value: 'grammar', label: 'Grammar throughput', blocks: [
          { block: 'section-header', props: { title: '~2.5x the Xeon, same code', level: 2 } },
          { block: 'meter', props: { label: 'Grammar throughput with batch verification', items: CPUS.map(function (it) { return { label: it.name + ' · ' + it.cpu, value: it.batch, display: fmt(it.batch) + ' /s' }; }) } },
          note('2 server + 2 client cores, burst batch verification, measured on a prototype. eul-4c is a dedicated EPYC and the trustworthy read; the GPU box runs a little higher but is a shared, contended host, so treat it as noisy.')
        ] },
        { value: 'internet', label: 'Over the internet', blocks: [
          { block: 'table', props: { caption: 'Batching beats distance', maxHeight: 'compact',
            columns: [{ key: 'path', label: 'Client → server' }, { key: 'rtt', label: 'Round trip', numeric: true }, { key: 'one', label: '1 transfer / write', numeric: true }, { key: 'five', label: '5 transfers / write', numeric: true }],
            rows: WAN.map(function (w) { return { path: w.path, rtt: w.rtt + ' ms', one: fmt(w.one) + '/s', five: fmt(w.five) + '/s' }; }) } },
          note('The GPU box gave the first genuine wide-area client. Real round trips: 71 ms to bk2, 143 ms to eul-4c. One transfer per write is capped by the round trip; five per write amortise it and recover about 5,000/s on both paths — the pipelining lesson, now over a real intercontinental link.')
        ] }
      ] } },
      { insert: 'main', was: WAS.insert },
      { block: 'pager', id: 'statsgpu-onward', was: WAS['statsgpu-onward'], props: { label: 'Read and verify', relatedLabel: 'Read and verify', related: [
        { label: 'BENCH-003 §16 · the GPU box, measured and corrected', href: 'doc:docs/evidence/bench-003-rust-fleet-ceiling.md' },
        { label: 'Back to the main measurements', href: 'route:stats' }
      ] } }
    ];
  }

  ArkUI.pageModules.statsGpu = {
    spec: spec,
    mount: function (host) {
      return ArkUI.page(spec(), host, { page: 'stats/gpu', terms: 'first-use', className: 'stats-gpu-page', titleId: 'statsgpu-title' });
    }
  };
})();

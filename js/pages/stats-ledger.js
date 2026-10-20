/* /stats/ledger: the per-identity chain design, and the first real measurement, as a page of Ark
   blocks. Reached from /stats ("Finance ledger · double-spend by construction"). Hidden from nav.
   The sample is from `cargo test emit_chain_sample` in dense-wire; the numbers are from
   `cargo test bench_chain_throughput` on this Mac (2026-10-07) and the dated fleet runs named
   below. The page holds its own data and reads window.ArkChainSample for the real signed chain.

   Converted to data in DEFXN polish Wave 3 (W3-STATS). It was a 2,636-word research log 8.98x the
   viewport on a desktop and 14.6x on a phone, with five raw numbers as headings
   (docs/ux-audit/pages-ux-b.md /stats/ledger P0). It now answers first -- a plain sentence and the
   three numbers that matter -- then keeps every table, bar, sample entry and note in seven tabs by
   question, the dated runs and the side topics folded into accordions. The hand-built
   esc/fmt/pct/tile/headRow/row/cpuBars helpers and their css/stats.css classes are gone.

   Layout keys: every element of the old page with words keeps the key it had where a successor
   can carry it (the `was` pins, derived by tests/lib/layout-continuity.cjs from the frozen census
   tests/fixtures/layout-keys/stats-ledger.tsv); tests/stats-ledger-page.cjs lists each key that
   was reshaped or retired, with the reason. */
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
    { label: 'Ed25519 verify', pct: 94.5, note: 'one signature per operation — verify_batch across chains nearly halves this' },
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
  // Measured in bench_replay_fast_vs_strict: 16 chains × 1,000 operations.
  var REPLAY = {
    fast: { timeMs: 57, qps: 279149 },
    strict: { timeMs: 586, qps: 27268 }
  };
  var FLEET_LAN_QPS = 22559; // the chosen hot-admission number, bk2 -> mk2 on fleet LAN (below)
  var ATTACKS = [
    ['Replay (same bytes submitted twice)', 'Idempotent, no second entry, no equivocation', 'the CID matches on both sides, so the second call returns Ok with the first CID'],
    ['Double-spend of the same input', 'Rejected before signature verify is complete, by payload check walking the chain backwards for the input CID', 'the holder cannot undo their own earlier Spend without producing equivocation'],
    ['Concurrent double-append at the same position', 'Exactly one wins; the other produces Equivocation evidence recorded as a (G, pos) → (cidA, cidB) pair', 'the per-holder mutex serialises the race; whichever lost holds the fork evidence'],
    ['Cross-chain confusion (B tries to extend A\'s chain)', 'Rejected as ChainBreak on B\'s own chain (B\'s head is still GENESIS)', 'the chain is keyed by G, so the signer\'s key routes the entry to its own chain, not A\'s'],
    ['Wrong prev CID (fork attempt from an older head)', 'Rejected as ChainBreak with the expected position and current head', 'the chain head is the single source of truth; a stale prev cannot sneak past'],
    ['Tampered signature (flip one nibble)', 'Rejected as BadSignature', 'ed25519 verify under G catches it; cofactored batch mode is not enabled on this path'],
    ['Equivocation (holder signs two entries at the same (G, pos))', 'Second one rejected with Equivocation; the pair is recorded as fraud evidence', 'both are signed under the holder\'s own key, so the fraud is proven by their own signatures']
  ];
  var CLOSES = [
    ['Double-spend', 'Position n can hold exactly one record. A second entry at the same position with a different CID is signed-equivocation evidence under the holder\'s own key.'],
    ['MEV / front-running', 'There is no mempool. A transfer is a bilateral conversation; the global object is content-addressed and only observable after the fact.'],
    ['Transaction privacy leak', 'Only the counterparties see the record. There is no public tape to index.'],
    ['Missing RECEIPT (0K) semantics', 'A receive is just a ledger entry whose C[1] references the AGREEMENT. The spec letter is no longer load-bearing.']
  ];
  var SPEC = [
    ['Manifest type:', 'LEDGERENTRY, code 1A, group finance-ledger.'],
    ['Letter extension:', 'J carries the decimal chain position (J0, J1, …). The pinned flux-core predates this extension; dense-wire checks J\'s shape directly.'],
    ['Prev CID:', 'C[0]. Pos 0\'s prev is GENESIS0000000000.'],
    ['Payload:', 'C[1+] references an existing registered type (CONSUMEDMARKER for spend, AGREEMENT for receive, VALUEOBJECT I0 for issue, CELLEQUIVOCATION for freeze).'],
    ['Signers:', 'one — the chain owner.']
  ];
  var BURST_NODES = [
    ['flx-mk2 (EPYC, US)', '21,128', 'biggest EPYC core', 'LAN hop from bk2, server batches 64 verifies at a time'],
    ['flx-bk1 (Xeon, US)', '16,221', '2 vCPU Xeon', 'LAN hop'],
    ['flx-bk2 (Xeon, US, self)', '15,683', 'submitter itself', 'loopback: contended with the submitter'],
    ['flx-mist1 (Xeon, US)', '11,192', '1 vCPU bulk-storage', 'same silicon as bk2, half the cores'],
    ['flx-eug-2c (EPYC 9355P, BR)', '8,059', 'different provider', '~75 ms RTT to US cluster is in the number'],
    ['flx-eul-4c (EPYC 9355P, BR)', '7,371', 'different provider', '~75 ms RTT dominates per-connection; 4 vCPU'],
    ['Historical burst aggregate (sum across 6 short streams)', '79,654', '868 ms peak sample', 'not the sustained fleet headline']
  ];
  var PAIR = [
    ['bk2 → mk2, 128 chains × 500 (interleaved)', '22,559', '64,000 operations, 2,836 ms, zero errors. Server batches 64 verifications at a time.'],
    ['bk2 → mk2, 64 chains × 200 (interleaved)', '21,497', '12,800 operations, 595 ms, zero errors. Same shape, smaller run.'],
    ['bk2 → mk2, single chain (pre-batching)', '14,963', '5,000 operations, 334 ms. The pre-batching ceiling the +54% win came from.'],
    ['bk2 → 127.0.0.1, 128 × 500 (self)', '20,047', 'Same box as server; LAN beats loopback because mk2\'s EPYC is faster than bk2\'s Xeon on batch verify.'],
    ['Mac → bk2 (home ISP WAN)', '621', 'WAN-constrained from a residential link, not a server-admit number.']
  ];
  var NOT_YET = [
    ['Fleet sustained across 6 nodes.', 'Measured 2026-10-08: 3,760,000 operations accepted over 303 seconds, 12,403 ops/s average, zero failures. The older 79,654 ops/s measurement is retained as an 868 ms burst peak, not the sustained headline.'],
    ['IPFS pin sidecar is wired, off by default.', 'Chain-local durability stays peer replication of CIDs across the chain-server fleet. If CHAIN_SERVER_PIN_URL is set, every successful admit fires one best-effort POST ({cid, text}) to that URL with a 500 ms timeout — a pin failure never rolls back the admit. Point it at the ark-miner-cli Helia pin endpoint on a fleet node for CID discoverability (cold readers on totally fresh machines can resolve a CID without knowing which chain-server holds the chain). Admit stays authoritative; IPFS is a catalog, not the backing store.'],
    ['Automatic fork-evidence broadcaster is built.', 'Broadcaster + on_fraud callback: when a node detects equivocation, it pushes GOSSIP to every peer in its peer list, deduped per (G, pos). Two in-process tests pass; the fleet integration still submits manually.'],
    ['Issuance policy is wired.', 'IssuancePolicy::Roster { allowed } refuses Issue payloads whose signer is not in the roster. Default is still Open for tests; production nodes pin a roster via CHAIN_SERVER_ISSUERS env.'],
    ['Chain compaction is wired.', 'Payload::Snapshot commits to a history digest; prune_before(g, pos) drops old entries from RAM once a snapshot covers them.'],
    ['Receiver timeout + Refund is wired.', 'Payload::Refund is admitted only when its M ≥ D, so the sender can only refund after the deadline the counterparty signed.'],
    ['Certified binary P2P transport is built locally.', '/flx-traffic/2 signs raw binary segment envelopes over libp2p TCP + Noise + Yamux; legacy dense/hex traffic remains read-compatible. Production wiring still needs the authorized resolver-shard key source and the deployed replica addresses.'],
    ['10-node fleet is now the headline.', 'Transfer bench BENCH-011 (2026-10-08) ran on every flx-* node with Lever A+B+C and summed to 82,863 signed transfers/s, 108,362 with the local Mac. The soak above remains 6 nodes (bk1, bk2, mk2, mist1, eug-2c, eul-4c) because the four smallest nodes (mk1, ms1, ms2, ms3) can\'t host a chain-server on their current RAM allocation.'],
    ['No independent security review.', 'Same as the main /stats page: nobody but us has looked at this.']
  ];

  function fmt(n) { return Number(n).toLocaleString('en-US'); }
  function rows(list, keys) { return list.map(function (r) { var o = {}; keys.forEach(function (k, i) { o[k] = r[i]; }); return o; }); }
  /* A note beside its table or bars: whole on a tablet or desktop, folded behind one button on a
     phone (Ark's disclosure, foldBelow) -- kept in the page, never cut off. */
  function note(text, more) { return { block: 'disclosure', props: { content: text, foldBelow: 'phone', more: more || 'Read the note', less: 'Fold the note' } }; }
  /* A long explanation: its first lines in view on every screen, the rest a press away. */
  function longNote(text, more) { return { block: 'disclosure', props: { content: text, preview: 2, more: more || 'Read the rest', less: 'Fold it' } }; }

  function chainRows() {
    var sample = window.ArkChainSample;
    if (!sample || !sample.entries) return [];
    return sample.entries.map(function (e) {
      return { pos: 'pos ' + e.pos, payload: e.payload, cid: e.cid.slice(0, 32) + '…', text: e.text.length > 180 ? e.text.slice(0, 170) + '…' : e.text };
    });
  }

  /* `was`: the layout key each element had on the old page, by spec entry -- derived by
     tests/lib/layout-continuity.cjs (derive /stats/ledger) and corrected by hand where words alone
     chose wrongly (an empty bar track, a "CID" label, a list and its first item); the hand pins
     and every reshaped or retired key are listed with their reasons in
     tests/stats-ledger-page.cjs. A `self` pin keys the element alone: a tile that became a tab
     panel or an accordion item, whose inside is new. Deep refs are paths inside the tabs block:
     panel n is div n+1 (the tab list is div 1); in it, an accordion's item, panel, body, paragraph. */
  var T = 'page:/div:1/div:1';
  function inPanel(tab, accordion, item, rest) {
    return ':scope > div:nth-of-type(' + (tab + 1) + ') > div:nth-of-type(' + accordion + ') > div:nth-of-type(' + item + ') > div:nth-of-type(1) > div:nth-of-type(1) > ' + rest;
  }
  var WAS = {
    'statsledger-hero': { ':root': { key: T + '/article:1', self: true }, 'eyebrow': T + '/article:1/p:1' },
    'statsledger-views': {
      // How it works: the old lede, and the spec tile
      'disclosure-panel': T + '/article:1/p:2',
      'accordion-item': { key: T + '/article:3', self: true }, 'accordion-trigger': 'id:statsledger-grammar-title', 'facts': T + '/article:3/ul:1',
      'fact': T + '/article:3/ul:1/li:1', 'fact#2': T + '/article:3/ul:1/li:2', 'fact#3': T + '/article:3/ul:1/li:3', 'fact#4': T + '/article:3/ul:1/li:4', 'fact#5': T + '/article:3/ul:1/li:5',
      'fact-term': T + '/article:3/ul:1/li:1/strong:1', 'fact-term#2': T + '/article:3/ul:1/li:2/strong:1', 'fact-term#3': T + '/article:3/ul:1/li:3/strong:1', 'fact-term#4': T + '/article:3/ul:1/li:4/strong:1', 'fact-term#5': T + '/article:3/ul:1/li:5/strong:1',
      'fact-value#6': T + '/article:1/p:3/span:1', 'fact-value#7': T + '/article:1/p:3/span:2', 'fact-value#8': T + '/article:1/p:3/span:3',
      // What it closes, and what it does not do yet
      'tabs-trigger#2': 'id:statsledger-closes-title', 'tabs-content#2': { key: T + '/article:2', self: true },
      'table-wrap': T + '/article:2/div:1', 'disclosure-panel#2': T + '/article:2/p:2',
      'accordion-item#2': { key: T + '/article:14', self: true }, 'accordion-trigger#2': 'id:statsledger-notyet-title',
      'facts#2': T + '/article:14/ul:1', 'fact#9': T + '/article:14/ul:1/li:1', 'fact#10': T + '/article:14/ul:1/li:2', 'fact#11': T + '/article:14/ul:1/li:3',
      'fact#12': T + '/article:14/ul:1/li:4', 'fact#13': T + '/article:14/ul:1/li:5', 'fact#14': T + '/article:14/ul:1/li:6', 'fact#15': T + '/article:14/ul:1/li:7',
      'fact#16': T + '/article:14/ul:1/li:8', 'fact#17': T + '/article:14/ul:1/li:9',
      'fact-term#9': T + '/article:14/ul:1/li:1/strong:1', 'fact-term#10': T + '/article:14/ul:1/li:2/strong:1', 'fact-term#11': T + '/article:14/ul:1/li:3/strong:1',
      'fact-term#12': T + '/article:14/ul:1/li:4/strong:1', 'fact-term#13': T + '/article:14/ul:1/li:5/strong:1', 'fact-term#14': T + '/article:14/ul:1/li:6/strong:1',
      'fact-term#15': T + '/article:14/ul:1/li:7/strong:1', 'fact-term#16': T + '/article:14/ul:1/li:8/strong:1', 'fact-term#17': T + '/article:14/ul:1/li:9/strong:1',
      // On the wire: the sample, now a table, and the TCP tile
      'tabs-trigger#3': 'id:statsledger-sample-title', 'tabs-content#3': { key: T + '/article:4', self: true }, 'disclosure-panel#3': T + '/article:4/p:2',
      'tbody#2': { key: T + '/article:4/ol:1', self: true },
      'row#7': { key: T + '/article:4/ol:1/li:1', self: true }, 'row#8': { key: T + '/article:4/ol:1/li:2', self: true }, 'row#9': { key: T + '/article:4/ol:1/li:3', self: true },
      'row#10': { key: T + '/article:4/ol:1/li:4', self: true }, 'row#11': { key: T + '/article:4/ol:1/li:5', self: true },
      'cell#9': T + '/article:4/ol:1/li:1/p:1/span:1', 'cell#10': T + '/article:4/ol:1/li:1/p:1/span:2', 'cell#11': T + '/article:4/ol:1/li:1/p:2',
      'cell#13': T + '/article:4/ol:1/li:2/p:1/span:1', 'cell#14': T + '/article:4/ol:1/li:2/p:1/span:2', 'cell#15': T + '/article:4/ol:1/li:2/p:2',
      'cell#17': T + '/article:4/ol:1/li:3/p:1/span:1', 'cell#18': T + '/article:4/ol:1/li:3/p:1/span:2', 'cell#19': T + '/article:4/ol:1/li:3/p:2',
      'cell#21': T + '/article:4/ol:1/li:4/p:1/span:1', 'cell#22': T + '/article:4/ol:1/li:4/p:1/span:2', 'cell#23': T + '/article:4/ol:1/li:4/p:2',
      'cell#25': T + '/article:4/ol:1/li:5/p:1/span:1', 'cell#26': T + '/article:4/ol:1/li:5/p:1/span:2', 'cell#27': T + '/article:4/ol:1/li:5/p:2',
      'accordion-item#3': { key: T + '/article:13', self: true }, 'accordion-trigger#3': 'id:statsledger-tcp-title',
      [inPanel(3, 3, 1, 'p:nth-of-type(1)')]: T + '/article:13/h2:1', [inPanel(3, 3, 1, 'p:nth-of-type(2)')]: T + '/article:13/p:2', [inPanel(3, 3, 1, 'p:nth-of-type(3)')]: T + '/article:13/p:3',
      // Fleet runs
      'accordion-item#4': { key: T + '/article:5', self: true }, 'accordion-trigger#4': T + '/article:5/p:1',
      [inPanel(4, 1, 1, 'p:nth-of-type(1)')]: T + '/article:5/h2:1', [inPanel(4, 1, 1, 'p:nth-of-type(2)')]: T + '/article:5/p:2',
      'accordion-item#5': { key: T + '/article:6', self: true }, 'accordion-trigger#5': 'id:statsledger-soak-title',
      [inPanel(4, 1, 2, 'p:nth-of-type(1)')]: T + '/article:6/h2:1', [inPanel(4, 1, 2, 'p:nth-of-type(2)')]: T + '/article:6/p:2', [inPanel(4, 1, 2, 'p:nth-of-type(3)')]: T + '/article:6/p:3',
      'accordion-item#6': { key: T + '/article:7', self: true }, 'accordion-trigger#6': 'id:statsledger-fleet-title',
      [inPanel(4, 1, 3, 'p:nth-of-type(1)')]: T + '/article:7/h2:1', [inPanel(4, 1, 3, 'p:nth-of-type(2)')]: T + '/article:7/p:2', [inPanel(4, 1, 3, 'p:nth-of-type(3)')]: T + '/article:7/p:3',
      'table-wrap#3': T + '/article:7/div:1',
      'accordion-header#7': T + '/article:7/h3:1',
      [inPanel(4, 1, 3, 'div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)')]: T + '/article:7/p:4',
      [inPanel(4, 1, 3, 'div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)')]: T + '/article:7/p:5',
      'table-wrap#4': T + '/article:7/div:2',
      // One machine
      'accordion-item#8': { key: T + '/article:8', self: true }, 'accordion-trigger#8': 'id:statsledger-bench-title',
      [inPanel(5, 1, 1, 'p:nth-of-type(1)')]: T + '/article:8/h2:1', [inPanel(5, 1, 1, 'p:nth-of-type(2)')]: T + '/article:8/p:2',
      [inPanel(5, 1, 1, 'p:nth-of-type(3)')]: T + '/article:8/p:3', [inPanel(5, 1, 1, 'p:nth-of-type(4)')]: T + '/article:8/p:4',
      'meter-list': T + '/article:8/ol:1', 'meter': T + '/article:8/ol:1/li:1', 'meter#2': T + '/article:8/ol:1/li:2', 'meter#3': T + '/article:8/ol:1/li:3',
      'fact-value#18': T + '/article:8/ol:1/li:1/span:1/small:1', 'fact-value#19': T + '/article:8/ol:1/li:2/span:1/small:1', 'fact-value#20': T + '/article:8/ol:1/li:3/span:1/small:1',
      'table-wrap#5': T + '/article:8/div:1',
      'accordion-item#9': { key: T + '/article:9', self: true }, 'accordion-trigger#9': 'id:statsledger-million-title',
      [inPanel(5, 1, 2, 'p:nth-of-type(1)')]: T + '/article:9/h2:1', [inPanel(5, 1, 2, 'p:nth-of-type(2)')]: T + '/article:9/p:2', [inPanel(5, 1, 2, 'p:nth-of-type(3)')]: T + '/article:9/p:3',
      'actions': T + '/article:9/p:4', 'button': T + '/article:9/p:4/a:1',
      // Attacks, and fork gossip
      'tabs-trigger#6': 'id:statsledger-attacks-title', 'tabs-content#6': { key: T + '/article:10', self: true },
      'table-wrap#6': T + '/article:10/div:1', 'disclosure-panel#4': T + '/article:10/p:2',
      'accordion-item#10': { key: T + '/article:12', self: true }, 'accordion-trigger#10': 'id:statsledger-gossip-title',
      [inPanel(6, 3, 1, 'p:nth-of-type(1)')]: T + '/article:12/h2:1', [inPanel(6, 3, 1, 'p:nth-of-type(2)')]: T + '/article:12/p:2', [inPanel(6, 3, 1, 'p:nth-of-type(3)')]: T + '/article:12/p:3',
      // Durability
      'tabs-content#7': { key: T + '/article:11', self: true }, 'table-wrap#7': T + '/article:11/div:1',
      ':scope > div:nth-of-type(8) > div:nth-of-type(2) > div:nth-of-type(1) > p:nth-of-type(1)': 'id:statsledger-durability-title',
      ':scope > div:nth-of-type(8) > div:nth-of-type(2) > div:nth-of-type(1) > p:nth-of-type(2)': T + '/article:11/p:2',
      ':scope > div:nth-of-type(8) > div:nth-of-type(2) > div:nth-of-type(1) > p:nth-of-type(3)': T + '/article:11/p:3',
      ':scope > div:nth-of-type(8) > div:nth-of-type(2) > div:nth-of-type(1) > p:nth-of-type(4)': T + '/article:11/p:4',
      ':scope > div:nth-of-type(8) > div:nth-of-type(2) > div:nth-of-type(1) > p:nth-of-type(5)': T + '/article:11/p:5',
      ':scope > div:nth-of-type(8) > div:nth-of-type(2) > div:nth-of-type(1) > p:nth-of-type(6)': T + '/article:11/p:6'
    },
    insert: { key: T + '/div:1', self: true },
    'statsledger-onward': { ':scope > div:nth-of-type(1) > p:nth-of-type(1)': 'id:statsledger-ev-title', 'pager-related': T + '/article:15' }
  };

  function spec() {
    return [
      { block: 'breadcrumb', id: 'statsledger-crumbs', was: WAS['statsledger-crumbs'], props: { label: 'Your place', items: [
        { label: 'Home', href: 'route:zero' }, { label: 'Mesh performance', href: 'route:stats' }, { label: 'Ledger benchmark detail' }] } },
      /* The answer: what the design is, in one plain sentence, and the three numbers that matter. */
      { block: 'hero', id: 'statsledger-hero', was: WAS['statsledger-hero'], props: {
        eyebrow: 'Design, not agreement / a finance resolver by construction', title: 'Ledger benchmark detail', density: 'compact',
        lede: 'Every identity keeps its own append-only chain of value moves, so a double-spend is not refused by a referee: it cannot be written twice.',
        meta: [
          { label: 'Sustained, 6 nodes, 5 min', value: '12,403 ops/s, zero failures' },
          { label: 'Attacks refused', value: ATTACKS.length + ' of ' + ATTACKS.length },
          { label: 'Recovery vs live admission', value: fmt(REPLAY.fast.qps) + '/s vs ' + fmt(FLEET_LAN_QPS) + '/s' }
        ] } },
      { block: 'tabs', id: 'statsledger-views', was: WAS['statsledger-views'], props: { label: 'Ledger benchmark views', items: [
        { value: 'how', label: 'How it works', blocks: [
          { block: 'disclosure', props: { preview: 3, more: 'Read the whole statement', less: 'Fold it',
            content: 'Each identity owns its own append-only chain of value moves. A spend is an append to the holder\'s own chain, signed by their own key, at a position their own previous append determined. Position n can hold exactly one record. Two records at the same (G, pos) is self-signed [[equivocation]]; the holder has burned their own chain by their own key. No global order, no mempool, no fork choice.' } },
          { block: 'accordion', props: { label: 'The design in the spec', items: [
            { value: 'spec', title: 'Where this lives in the spec', blocks: [
              { block: 'facts', props: { label: 'Where this lives in the spec', columns: 1, items: SPEC.map(function (s) { return { term: s[0], value: s[1] }; }).concat([
                { term: 'Measured', value: '2026-10-07' }, { term: 'Record', value: 'LEDGERENTRY Y=1A', mono: true }, { term: 'Spec', value: 'flux-spec 0.4.2', mono: true }]) } }
            ] }
          ] } }
        ] },
        { value: 'closes', label: 'What it closes', blocks: [
          { block: 'table', props: { caption: 'What this closes by construction: problems that stop being problems', maxHeight: 'compact',
            columns: [{ key: 'problem', label: 'Problem' }, { key: 'why', label: 'Why it disappears' }], rows: rows(CLOSES, ['problem', 'why']) } },
          note('The honest ones not closed by this: issuance policy (who may originate value) and counterparty discovery (how A finds B). Both remain explicit decisions. See the design doc §12 for the one owner decision owed before implementation locked in.'),
          { block: 'accordion', props: { label: 'What it does not do yet', items: [
            { value: 'not-yet', title: 'What this does not yet do', blocks: [
              { block: 'facts', props: { label: 'What this does not yet do', columns: 1, items: NOT_YET.map(function (n) { return { term: n[0], value: n[1] }; }) } }
            ] }
          ] } }
        ] },
        { value: 'wire', label: 'On the wire', blocks: [
          note('Generated by cargo test emit_chain_sample in dense-wire: one holder, five entries from genesis to the latest receive. The signatures are real Ed25519 under a known seed; the CIDs are real sha256 of the text. Nothing here is a mockup — paste any entry into a verifier and it holds.', 'How this sample was made'),
          { block: 'table', props: { caption: 'A real chain of 5, byte for byte: what a chain looks like on the wire', maxHeight: 'compact', empty: 'Chain sample not available in this build.',
            columns: [{ key: 'pos', label: 'Position', mono: true }, { key: 'payload', label: 'Payload' }, { key: 'cid', label: 'CID', mono: true }, { key: 'text', label: 'Entry, as signed', mono: true }], rows: chainRows() } },
          { block: 'accordion', props: { label: 'How entries reach a node', items: [
            { value: 'tcp', title: 'TCP server · machine-to-machine ingress',
              content: 'Shortest conduit that works\n\nThe resolver now has a line-framed TCP endpoint. Each request is <TAG><TAB><MANIFEST><LF>; replies are OK<TAB><CID> or ERR<TAB><CODE><TAB><REASON>. A special GOSSIP<TAB>A<TAB>B submits fork evidence.\n\nThree tests in chain_server::tests: TCP round-trip for a 3-entry chain, named-code refusal on bad signature, gossip delivery. For production the plan is hypercore per chain (replication) + IPFS pin (CID catalog) + GUN (peer discovery); the TCP conduit is for ops ingress and direct testing, not the hot path.' }
          ] } }
        ] },
        { value: 'fleet', label: 'Fleet runs', blocks: [
          { block: 'accordion', props: { label: 'Dated fleet runs, newest first', items: [
            { value: 'certified', title: 'Newest certified resolver fleet · 8 VPS nodes + local',
              content: '1,712,006 combined replica-applications/s · 61,398 all-replica logical ops/s\n\nOn 2026-10-08, all nine [[nodes|node]] applied the exact same deterministic 20,000-operation [[segment]] root 1399e321…31575 after verifying one 3-of-4 certificate. The run completed 180,000/180,000 stores with zero errors. Combined capacity sums each resolver\'s work; logical throughput requiring all replicas is bounded by the slowest node. Network broadcast and durable segment commit were outside this test.' },
            { value: 'soak', title: 'Historical admission fleet · 6 nodes sustained for 5 minutes',
              content: '12,403 accepted ops/s · 3,760,000 operations · zero failures\n\nOn 2026-10-08, one Apple arm64 client drove all six public :19501 chain-servers concurrently for 303.152 seconds. The run completed 235 batches and every one of 3,760,000 submitted operations was accepted. Per node: bk2 592,000; mk2 576,000; bk1 592,000; mist1 528,000; eug-2c 720,000; eul-4c 752,000.\n\nThis is the canonical sustained [[fleet]] number. It replaces the invalid six-times-single-node extrapolation: the six workers share one client CPU and network origin while every node is under simultaneous load. It measures signed admission into each node\'s local cold-start cache, not replica-certified durability and not a cumulative operation counter.' },
            { value: 'burst', title: 'Historical short-burst peak · 6 nodes, 868 ms',
              content: '79,654 ops/s across 6 chain-servers, zero errors\n\nOn 2026-10-08, chain-server deployed to six nodes across three regions: flx-bk2, flx-mk2, flx-bk1, flx-mist1 (InterServer, US), flx-eug-2c, flx-eul-4c (different provider, Brazil, AMD EPYC 9355P). A client on bk2 fanned 32 chains × 200 operations at each server concurrently. Every node admitted all 6,400 operations, zero refusals; 38,400 operations total in 868 ms wall-clock across the whole fleet.\n\nThis short run proves parallel burst capacity without a global-order bottleneck. The five-minute run above is the sustained headline because it also includes shared client, network-origin and simultaneous-server contention.',
              blocks: [
                { block: 'table', props: { caption: 'Each chain-server in the 868 ms burst', maxHeight: 'compact',
                  columns: [{ key: 'node', label: 'Node' }, { key: 'ops', label: 'Ops / s', numeric: true }, { key: 'role', label: 'Role' }, { key: 'note', label: 'Note' }], rows: rows(BURST_NODES, ['node', 'ops', 'role', 'note']) } },
                { block: 'accordion', props: { label: 'Single-pair detail', items: [
                  { value: 'pair', title: 'Single-pair detail · bk2 → mk2, 128 chains × 500 interleaved',
                    content: 'On 2026-10-08, with server-side burst batching enabled (admit_burst drains up to 64 pipelined lines per window and calls verify_batch once), the real cross-WAN number climbs. Build on flx-bk2 (Ubuntu 24.04, Xeon Gold 6230R); server on flx-mk2 (EPYC); one persistent TCP connection; line-framed protocol. The multi-chain run interleaves 128 holders so each burst spans many chains — the natural shape when a real fleet holds thousands of identities.\n\nThe 22,559/s on fleet LAN is the chosen number — a real, multi-chain, zero-error, cross-WAN run. Both nodes see the same chain-head CID for every holder after the run. Fork evidence detected on bk2 is gossiped to mk2 in the same session and accepted (Ok("fork")) — see "Fork gossip" below.',
                    blocks: [
                      { block: 'table', props: { caption: 'bk2 → mk2 and the comparison runs', maxHeight: 'compact',
                        columns: [{ key: 'run', label: 'Measurement' }, { key: 'ops', label: 'Ops / s', numeric: true }, { key: 'what', label: 'What it is' }], rows: rows(PAIR, ['run', 'ops', 'what']) } }
                    ] }
                ] } }
              ] }
          ] } }
        ] },
        { value: 'machine', label: 'One machine', blocks: [
          { block: 'accordion', props: { label: 'Single-machine measurements', items: [
            { value: 'today', title: 'Measured today',
              content: fmt(BENCH.burst64Qps) + ' ops/s, one core\n\nRun on the author\'s Mac, release build, 32 holders × 1,000 operations each = 32,000 total, interleaved so each burst spans every chain. Different silicon from the fleet, so the number is for shape, not comparison — the cost split and the size of the batch win are what travel.\n\nGrammar admission is 3.3% of CPU on the chain path, same shape as the 2.1% on the transfer path. Signature verification is still the whole mountain, which is why batching across chains is where the win lives.\n\nA single chain is strictly sequential — position n cannot be verified until n-1 is appended — so the burst must span many chains to pay. In production this is the natural shape: many identities, each short-sequential. Same cofactored caveat as the transfer path.',
              blocks: [
                { block: 'meter', props: { label: 'CPU breakdown on the chain resolver', max: 100, items: CPU.map(function (p) { return { label: p.label, value: p.pct, display: p.pct.toFixed(1) + '%' }; }) } },
                { block: 'facts', props: { label: 'What each part of the CPU time does', columns: 1, items: CPU.map(function (p) { return { term: p.label, value: p.note }; }) } },
                { block: 'table', props: { caption: 'Per-item and batch verification, one core', maxHeight: 'compact',
                  columns: [{ key: 'mode', label: 'Mode' }, { key: 'ops', label: 'Ops / s', numeric: true }, { key: 'note', label: 'Note' }],
                  rows: [
                    { mode: 'Per-item verification', ops: fmt(BENCH.perItemQps), note: 'baseline, one verification per operation' },
                    { mode: 'Batch verify, burst 64', ops: fmt(BENCH.burst64Qps), note: '+' + BENCH.gainPct.toFixed(0) + '% over baseline' },
                    { mode: 'Batch verify, burst 256', ops: fmt(BENCH.burst256Qps), note: 'keeps climbing with burst size; cofactored caveat applies' }
                  ] } }
              ] },
            { value: 'm2', title: 'Current local resolver audit · Apple M2',
              content: '51,065 hot · 279,269 certified · 812,268 transport ops/s\n\nMatched release measurement: 20,000 independent-holder operations reached 51,065 ops/s with full per-operation verification and 279,269 ops/s when one signed root was verified once and the records stored across eight holder shards—a 5.47× gain. A separate two-peer test transported and reconstructed one 1,024-operation compact binary segment at 812,268 effective ops/s. That third number is transport, not accepted chain admission.\n\nThe new binary envelope removes the outer W<hex> expansion. Real-shaped 488-byte operations measure 150.9 bytes/op in a segment, 6.47× below the former 976-byte wrapped payload. Exact operation bytes reconstruct, and legacy v1 frames remain readable.',
              blocks: [
                { block: 'actions', props: { label: 'The record behind it', items: [{ label: 'Read BENCH-005', href: 'doc:docs/evidence/bench-005-million-ops-audit.md', tone: 'link' }] } }
              ] }
          ] } }
        ] },
        { value: 'attacks', label: 'Attacks', blocks: [
          { block: 'table', props: { caption: 'Attack suite · 7 of 7 refused: what the resolver refuses, and why', maxHeight: 'compact',
            columns: [{ key: 'attack', label: 'Attack' }, { key: 'outcome', label: 'Outcome' }, { key: 'why', label: 'Why' }], rows: rows(ATTACKS, ['attack', 'outcome', 'why']) } },
          note('Every row above is cargo test chain::, source in dense-wire/src/chain.rs. The one owed next: an IPFS-gossip test that proves equivocation evidence actually reaches a third observer. That belongs in step 5 of the design doc\'s implementation sequence.'),
          { block: 'accordion', props: { label: 'When a holder equivocates', items: [
            { value: 'gossip', title: 'Fork gossip · a third observer learns about equivocation',
              content: 'Signatures tell on their own holder\n\nIf a holder signs two different entries at the same chain position, each half is self-incriminating evidence under their own key. A third node that only saw one half can learn about the fork from a peer\'s gossip: receive_fork_evidence(a, b) checks that the pair is actually from one signer at one position with different content, verifies both signatures, and freezes the chain. Any later append from that holder is refused.\n\nThree tests in chain::tests: equivocation_gossip_freezes_the_chain_on_a_third_observer (the live flow), fork_evidence_is_refused_when_shape_is_wrong (different signer or same bytes), fork_evidence_with_bad_signature_is_refused (flipped sig).' }
          ] } }
        ] },
        { value: 'durability', label: 'Durability', blocks: [
          { block: 'table', props: { caption: 'The fleet is the backing store', maxHeight: 'compact',
            columns: [{ key: 'mode', label: 'Mode' }, { key: 'ops', label: 'Ops / s', numeric: true }, { key: 'survives', label: 'Record survives' }, { key: 'lost', label: 'Is lost if' }],
            rows: REPLICATION.map(function (d) { return { mode: d[0], ops: fmt(d[1]), survives: d[2], lost: d[3] }; }) } },
          longNote('Durability · K-of-N peer replication, not disk sync\n\nIn this stack an entry is durable when K of N peers hold its content-addressed [[CID]]. The chain head is gossiped so peers always know what to pull. The resolver\'s admit path pushes the record to peers before returning Ok; if fewer than K acks come back, the admit returns Replication {{ got_acks, need }} and nothing in memory changes. A node that cold-starts can rebuild its chains by walking back from each chain\'s known head CID — the local on-disk cache is a convenience for faster boot, not the source of truth.\n\nMeasured in chain::tests::bench_replication_cost, 32 chains × 500 operations, burst 64. The simulated peer is an in-process channel, so the number above is the handoff + broadcast overhead. A real fleet adds the pair-wise RTT on top (BENCH-003 §16: 71 ms GPU box to bk2, 143 ms to eul-4c). A node near its peers pays the RTT once per burst, not per operation; batched broadcast hides the latency.\n\nA tamper check runs on cold-start: fast replay (default) verifies the head of each chain under the writer\'s key and uses the hash chain to establish the rest; strict replay (open_cache_strict) re-verifies every signature. Fast replay is ' + fmt(REPLAY.fast.qps) + ' ops/s vs strict\'s ' + fmt(REPLAY.strict.qps) + ' ops/s — about ' + (REPLAY.fast.qps / REPLAY.strict.qps).toFixed(1) + 'x faster for the same guarantee, because the hash chain is cheaper than Ed25519 and the head signature does the certifying for the tail. Three tamper tests in chain::tests::durable_tampered_*: head catches a head-signature flip, middle catches a middle-byte flip via hash chain, first catches a first-line flip under both modes.\n\nThe old transfer path still uses an on-disk log without peer replication; that gap is open in prototype-to-production.md §1.1.\n\nRecovery is faster than ingestion. Fast replay reads at ' + fmt(REPLAY.fast.qps) + '/s while hot admission tops out at ' + fmt(FLEET_LAN_QPS) + '/s on fleet LAN today — about ' + (REPLAY.fast.qps / FLEET_LAN_QPS).toFixed(1) + 'x of slack. A peer that fell behind catches up roughly an order of magnitude faster than live traffic flows in, so a node joining late or recovering from a crash does not stay behind. The fast path verifies only each chain\'s head signature; the hash chain certifies the tail. Hot write cannot use the same shortcut — every incoming entry needs its own signature to admit at the gate — but server-side burst batching (verify_batch over 64 pipelined lines) is the equivalent shape there.', 'How durability works')
        ] }
      ] } },
      { insert: 'main', was: WAS.insert },
      { block: 'pager', id: 'statsledger-onward', was: WAS['statsledger-onward'], props: { label: 'Read and verify', relatedLabel: 'Read and verify', related: [
        { label: 'The design document · why this is the way to prod', href: 'doc:docs/finance-ledger-design.md' },
        { label: 'The pre-prod checklist · what the design closes, item by item', href: 'doc:docs/prototype-to-production.md' },
        { label: 'Back to the main measurements', href: 'route:stats' }
      ] } }
    ];
  }

  ArkUI.pageModules.statsLedger = {
    spec: spec,
    mount: function (host) {
      return ArkUI.page(spec(), host, { page: 'stats/ledger', className: 'stats-ledger-page', titleId: 'statsledger-title' });
    }
  };
})();

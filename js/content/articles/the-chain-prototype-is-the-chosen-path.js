/* Loaded only when this article is requested. */
LearningContent.load("the-chain-prototype-is-the-chosen-path", {
  "core": "The chain path now has three separately measured layers: 51,065 ops/s local hot admission, 279,269 ops/s local certified holder-sharded application, and 812,268 effective ops/s for compact segment transport between two local peers. The latest sustained public-fleet baseline remains 12,403 accepted ops/s across six nodes until the certified path is deployed and rerun.",
  "relevance": "Read this to distinguish hot admission, certified segment application, compact P2P transport, replay, short bursts and sustained fleet throughput. Local resolver rates are not multiplied into fleet claims.",
  "reviewed": "2026-10-08",
  "evidenceLabel": "The live fleet pulse — see for yourself",
  "evidenceHref": "/api/fleet-pulse",
  "relatedPage": "stats/ledger",
  "actionLabel": "Open /monitor",
  "actionPage": "monitor",
  "questions": [
    "What exactly moved?",
    "What does the five-minute fleet result describe?",
    "What does the older 79,654 peak describe?",
    "What does the recovery-slack number mean?",
    "What is the live pulse endpoint?",
    "How do I run the pulse against my own nodes?",
    "What is still open?",
    "What is the honest ceiling now?"
  ],
  "sections": [
    [
      "What exactly moved",
      "Twenty-four hours ago the finance resolver was a design document, a test suite that proved seven of seven attacks are refused, and one Mac-core number (41,762 ops/s with burst batch verification across 32 chains). It was the direction we were going; it was not production. In this working session the whole pipeline landed on a real six-node fleet.",
      "The chain-server binary — the TCP endpoint that admits <TAG>\\t<MANIFEST>\\n lines, calls admit_burst, and returns one OK\\t<CID> per operation — is now running on flx-bk2, flx-mk2, flx-bk1, flx-mist1 (InterServer VPS, US) and on flx-eug-2c, flx-eul-4c (a different provider in Brazil). Each node has its own ledger, its own cold-start cache, its own iptables rule for port 19501. There is no central registry; each chain lives on exactly one server, and the server's only serialisation is a per-holder mutex."
    ],
    [
      "The sustained number: 12,403 ops/s",
      "One Apple arm64 client drove all six public chain-servers concurrently for 303 seconds. Each fleet-many batch carried 32 holder chains × 500 operations. The fleet accepted 3,760,000 of 3,760,000 submitted operations in 235 completed batches, with zero transport, protocol, or admission failures.",
      "Per node: bk2 accepted 592,000; mk2 576,000; bk1 592,000; mist1 528,000; eug-2c 720,000; eul-4c 752,000. The measured sustained average was 12,403 ops/s. It is not six times the earlier single-node run because the six workers share one client CPU and network origin while the servers experience simultaneous load."
    ],
    [
      "The historical short peak: 79,654 ops/s",
      "A traditional chain pays a coordination cost per transaction: validators have to agree who got there first, and that agreement is the serial step that caps throughput. The chain prototype has no global order. Each identity's chain lives on exactly one server. The only ordered step in the resolver is the atomic put_if_absent on (G, pos), per holder — never globally. Two different holders admitting at the same instant on different nodes do not block each other, do not see each other, do not need to. The nodes do not vote.",
      "The 79,654 ops/s run remains valid as an 868 ms burst: 38,400 operations, zero errors, with one short parallel stream per node. It is useful peak evidence, but the five-minute soak proved it must not be presented as sustained throughput or multiplied from a single-node result."
    ],
    [
      "Recovery outruns ingestion",
      "Fast replay — the cold-start path — reads at 279,149 ops/s. Sustained six-node admission measured 12,403 ops/s, while the per-pair peak is 22,559 ops/s and the historical fleet burst peak is 79,654 ops/s. These are different windows and are labeled separately.",
      "Replay only needs to verify each chain's head signature. The hash chain certifies every earlier entry — because once G is pinned, the only way to construct an entry whose C[0] matches the hash of a specific predecessor is for that predecessor to be the bytes the writer actually signed. Hot admission cannot use the same shortcut; every incoming entry needs its own signature verified at the gate. The practical consequence is that a peer which has fallen behind catches up at twelve times live-traffic rate. A node joining the fleet late reaches current within a window far smaller than the window of its absence. This is the real durability story: K-of-N peer replication of content-addressed CIDs plus a recovery path that is twelve times faster than ingestion."
    ],
    [
      "A live pulse endpoint so anyone can watch",
      "A new binary, fleet-pulse, runs a short self-bench against each configured chain-server every hour from flx-bk2 and publishes the current result through the monitor endpoint. Public browsers read it through the same-origin HTTPS route /api/fleet-pulse; the raw pulse service remains an operator endpoint. The /monitor page polls it every sixty seconds, draws a per-node table of current ops/s, and keeps a small session history so you can watch the number move while the tab is open.",
      "When a seventh node joins, the pulse adds a row. When a node drops, the pulse records the error against that address and the aggregate adjusts. This is the growth signal we wanted — share the /monitor link with a friend, add a chain-server on their machine, and the pulse will show it."
    ],
    [
      "Run the pulse against your own nodes",
      "The pulse endpoint on bk2 is one example; the binary is portable. Clone defxn-defi-rs, build the dense-wire crate (cargo build --release --bin fleet-pulse), and run it with PULSE_NODES set to the chain-servers you want to measure. One-shot writes JSON to PULSE_OUT and exits; set PULSE_INTERVAL_SEC and the binary loops forever, serving the latest sample at PULSE_HTTP_ADDR with permissive CORS.",
      "On /monitor, setting window.ArkPulseEndpoint before the page loads points the live-pulse panel at your endpoint instead of bk2's. That is how you run it locally and watch /monitor pick up the change. The purpose of this plumbing is simple: the fleet exists for other people to join, and the pulse is how joining shows up."
    ],
    [
      "What is still open",
      "Independent security review. The resolver has twenty-four chain tests and three TCP tests, and seven of seven attacks are refused by construction — but nobody outside this project has looked at it. That is the one real gap left and the one the site is explicit about everywhere.",
      "The IPFS pin sidecar remains optional. Certified segment application, holder sharding and binary libp2p transport are now built and locally measured. Production still requires the authorized validator key source, quorum roster, group-commit segment emitter and an eight-node sustained rerun; those credentials and results are not fabricated."
    ],
    [
      "The honest ceiling now",
      "The newest sustained fleet number remains 12,403 accepted ops/s: 3,760,000 operations over 303 seconds across six public nodes, zero failures. Current local measurements are 51,065 hot admission, 279,269 certified sharded application and 812,268 effective compact-segment transport. The 79,654 ops/s number remains the historical 868 ms fleet burst. Each describes a different measured boundary; none is substituted for another.",
      "This is where the chain prototype stops being a direction and becomes the production path. The articles before this one explained how we got the certified fabric to 24,908 transfers a second across ten machines; that number is real, it is still true, and it is the ceiling of the old shape. The chain prototype's shape is different: no voting, no mempool, no global order to compete for. The number grows with the fleet."
    ]
  ]
});

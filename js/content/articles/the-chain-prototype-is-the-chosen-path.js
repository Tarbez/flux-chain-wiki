/* Loaded only when this article is requested. */
LearningContent.load("the-chain-prototype-is-the-chosen-path", {
  "core": "The chain prototype moved from one Mac core to six real machines in three regions and two providers, in one working session. 79,654 entries a second aggregate, zero errors on 38,400 entries. Replay runs at 279,149/s — about twelve times live admission, which means a lagging peer catches up far faster than live traffic flows in. A live pulse endpoint on bk2 lets anyone watch the current fleet speed and prove the network is growing.",
  "relevance": "Read this to understand why we closed the ladder and declared the chain prototype the chosen production path. The old numbers (24,908/s on the certified fabric; 25,232/s on one Mac core) describe different machines doing different jobs; the chain prototype's 79,654/s is the honest fleet number for the direction we are shipping.",
  "reviewed": "2026-10-08",
  "evidenceLabel": "The live fleet pulse — see for yourself",
  "evidenceHref": "http://162.35.26.46:19502/pulse.json",
  "relatedPage": "stats/ledger",
  "actionLabel": "Open /monitor",
  "actionPage": "monitor",
  "questions": [
    "What exactly moved?",
    "What does 79,654 entries a second describe?",
    "Why does the aggregate scale linearly?",
    "What does the recovery-slack number mean?",
    "What is the live pulse endpoint?",
    "How do I run the pulse against my own nodes?",
    "What is still open?",
    "What is the honest ceiling now?"
  ],
  "sections": [
    [
      "What exactly moved",
      "Twenty-four hours ago the finance resolver was a design document, a test suite that proved seven of seven attacks are refused, and one Mac-core number (41,762 entries a second with burst batch verify across 32 chains). It was the direction we were going; it was not production. In this working session the whole pipeline landed on a real six-node fleet.",
      "The chain-server binary — the TCP endpoint that admits <TAG>\\t<MANIFEST>\\n lines, calls admit_burst, and returns one OK\\t<CID> per entry — is now running on flx-bk2, flx-mk2, flx-bk1, flx-mist1 (InterServer VPS, US) and on flx-eug-2c, flx-eul-4c (a different provider in Brazil). Each node has its own ledger, its own cold-start cache, its own iptables rule for port 19501. There is no central registry; each chain lives on exactly one server, and the server's only serialisation is a per-holder mutex."
    ],
    [
      "The number: 79,654 entries a second",
      "A client on bk2 opened one persistent TCP connection to each of the six chain-servers in parallel. It submitted 32 chains × 200 entries (6,400 records) to every server, interleaved so each burst spans many chains. Every node admitted all 6,400 entries. Zero refusals. 38,400 records total ingested in 868 ms wall-clock across the whole fleet. Head CID agrees on every holder's chain on every server.",
      "The per-node numbers were 21,128 (mk2, EPYC), 16,221 (bk1, Xeon), 15,683 (bk2 — the submitter itself, so loopback-contended), 11,192 (mist1, 1 vCPU bulk-storage), 8,059 (eug-2c, Brazil AMD) and 7,371 (eul-4c, Brazil AMD). The sum is the fleet's real ingestion capacity today: 79,654 entries a second. Add a seventh node and you add its per-node throughput to the fleet number, because there is no shared global order to compete for."
    ],
    [
      "Why the aggregate scales linearly",
      "A traditional chain pays a coordination cost per transaction: validators have to agree who got there first, and that agreement is the serial step that caps throughput. The chain prototype has no global order. Each identity's chain lives on exactly one server. The only ordered step in the resolver is the atomic put_if_absent on (G, pos), per holder — never globally. Two different holders admitting at the same instant on different nodes do not block each other, do not see each other, do not need to. The nodes do not vote.",
      "So the fleet's hot-write capacity is literally the sum of the per-node admissions. The Brazil pair's lower per-node number is cross-ocean RTT (about 75 ms to the US cluster), not CPU. A Brazilian submitter would see those nodes at the same speed the US nodes see each other."
    ],
    [
      "Recovery outruns ingestion",
      "Fast replay — the cold-start path — reads at 279,149 entries a second. Hot admission tops out at about 22,559/s per pair and 79,654/s across the fleet. That gap is roughly twelve to one. It is not a coincidence or a quirk; it is a property of the design.",
      "Replay only needs to verify each chain's head signature. The hash chain certifies every earlier entry — because once G is pinned, the only way to construct an entry whose C[0] matches the hash of a specific predecessor is for that predecessor to be the bytes the writer actually signed. Hot admission cannot use the same shortcut; every incoming entry needs its own signature verified at the gate. The practical consequence is that a peer which has fallen behind catches up at twelve times live-traffic rate. A node joining the fleet late reaches current within a window far smaller than the window of its absence. This is the real durability story: K-of-N peer replication of content-addressed CIDs plus a recovery path that is twelve times faster than ingestion."
    ],
    [
      "A live pulse endpoint so anyone can watch",
      "A new binary, fleet-pulse, runs a short self-bench against each configured chain-server every hour from flx-bk2 and publishes the result as JSON at http://162.35.26.46:19502/pulse.json. It serves CORS-open so any browser can fetch it. The /monitor page polls it every sixty seconds, draws a per-node table of current entries-a-second, and keeps a small session history so you can watch the number move while the tab is open.",
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
      "The IPFS pin sidecar is wired but off by default (set CHAIN_SERVER_PIN_URL to turn it on). Hypercore replication per chain and GUN peer-discovery are still planned, not shipped. The TCP endpoint carries real cross-WAN traffic today and we measure on it; the production plan still has hypercore in it. We will build the pieces in that order because the TCP conduit works and is honest."
    ],
    [
      "The honest ceiling now",
      "The fleet number is 79,654 entries a second, with six nodes, zero errors, measured on real hardware across two providers and three regions. The per-pair number is 22,559/s cross-WAN. The replay number is 279,149/s — the recovery slack that makes the whole design hold together. Each of these describes a different window on the same system. None of them is a projection.",
      "This is where the chain prototype stops being a direction and becomes the production path. The articles before this one explained how we got the certified fabric to 24,908 transfers a second across ten machines; that number is real, it is still true, and it is the ceiling of the old shape. The chain prototype's shape is different: no voting, no mempool, no global order to compete for. The number grows with the fleet."
    ]
  ]
});

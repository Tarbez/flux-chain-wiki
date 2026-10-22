/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "spec",
  "title": "Benchmarks",
  "route": "/concept/spec",
  "group": "theory",
  "meta": {
    "placement": "rail",
    "next": "stats",
    "docs": "docs/protocol/benchmarks.md",
    "back": "concept"
  },
  "fields": {
    "EYEBROW": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "Page",
      "value": "FLUX PROTOCOL / BENCHMARKS"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "What is actually measured?"
    },
    "DECK": {
      "label": "Intro",
      "kind": "text",
      "section": "Page",
      "value": "Three of the six verified records, each with where and when it ran: 46,178 swaps a second in a batched auction on one machine with no network (2026-10-10); 61,398 operations a second applied on every replica of eight fleet servers plus one local node (2026-10-08); and 11,318 operations a second accepted on six public nodes with live 4-of-6 approval signing (2026-10-09/10). None is a production result, and none is added to another."
    },
    "CTA": {
      "label": "Link on the theory page",
      "kind": "line",
      "section": "Links",
      "value": "REVIEW THE EVIDENCE STANDARD"
    },
    "POINT1.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 1",
      "value": "Current conclusion: verified at stated boundaries."
    },
    "POINT1.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 1",
      "value": "A record is promoted only when its evidence record names the workload, the machine or fleet, the date and the method beside the number. Six records meet that today. A local result is not a fleet result, a fleet result is not production, and a rate in one unit is never compared with a rate in another."
    },
    "POINT2.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 2",
      "value": "Comparable tests must share a mode."
    },
    "POINT2.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 2",
      "value": "Sequential, concurrent, local-process, multi-host, and rate-limited external runs answer different questions. They must not be collapsed into one multiplier."
    },
    "POINT3.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 3",
      "value": "Incomplete runs remain incomplete."
    },
    "POINT3.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 3",
      "value": "A smoke sample or unfinished soak cannot be presented as sustained performance, a ceiling, or a production-readiness result."
    },
    "POINT4.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 4",
      "value": "Every result needs its conditions."
    },
    "POINT4.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 4",
      "value": "A publishable record names hardware, operating system, network conditions, dataset, warm-up, repetitions, aggregation method, units, uncertainty, and known limitations."
    },
    "POINT5.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 5",
      "value": "Raw artifacts come before the headline."
    },
    "POINT5.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 5",
      "value": "The evidence registry must link the raw result and digest before a public page can promote a measurement from Unverified to Live or Partial."
    },
    "POINT6.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 6",
      "value": "Verified on one machine."
    },
    "POINT6.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 6",
      "value": "BENCH-006 (Local, verified): 279,269 ops/s certified sharded segment application, 5.47× the 51,065 ops/s per-operation admission; one local Apple M-series machine, 2026-10-08; no eight-node projection. BENCH-013 (Local, verified): every operation in its own unit, one machine, no network, median of 5 reps, 2026-10-10: 13,476 same-shard transfers/s, 6,799 cross-shard transfers/s, 46,178 swaps/s in a batched auction. BENCH-015 (Local, verified): 4,425 swaps/s at 1 connection and ~31,000 at 1,000, one local node over loopback, unbacked, zero-confirmation store, 2026-10-15; not a fleet figure."
    },
    "POINT7.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 7",
      "value": "Verified on the fleet."
    },
    "POINT7.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 7",
      "value": "BENCH-007 (Fleet, verified application boundary): 61,398 all-replica logical ops/s, bounded by the slowest replica; one 20,000-operation segment applied on eight VPS nodes plus one local node, 180,000/180,000 applied, zero errors, 2026-10-08; broadcast and durable segment commit excluded. BENCH-009 (Fleet, verified): 11,318 accepted ops/s with live 4-of-6 cross-node certified-segment signing, against 11,169 with no approval; six public nodes, 300 s per configuration, zero failures, 2026-10-09/10; acceptance does not imply inclusion in a signed segment. BENCH-012 (Fleet, verified): 15,360 swaps in 60 batches of 256, broadcast to 10 live replicas, 60/60 audits passed, 13.874 ms batch latency, 2026-10-10; the unpipelined broadcast dominates end to end."
    },
    "STATUS.TITLE": {
      "label": "Status heading",
      "kind": "line",
      "section": "Evidence",
      "value": "Status / Six records verified"
    },
    "STATUS.TEXT": {
      "label": "Status text",
      "kind": "text",
      "section": "Evidence",
      "value": "Six benchmark records are verified, each at its own stated boundary. Each number, with its machine or fleet and date, is under Step by step. What is still not verified is under Evidence."
    },
    "LIMIT.TITLE": {
      "label": "Limitation heading",
      "kind": "line",
      "section": "Evidence",
      "value": "No cross-system conclusion"
    },
    "LIMIT.TEXT": {
      "label": "Limitation text",
      "kind": "text",
      "section": "Evidence",
      "value": "Still not verified. BENCH-001 (Partial): a 10,000-transfer real-fleet run of the directory registry did not complete. BENCH-002 (Partial): the gap between the writer-contention model and the fleet's multi-second p50 is not yet explained. BENCH-003 (Partial): the Rust rebuild's fleet figures; membership is not persisted across restarts. BENCH-004 (Partial): 12,403 accepted ops/s over 303.152 seconds from one arm64 client, not cumulative growth or replica-certified durability. BENCH-005 (Superseded in part): one million accepted durable ops/s remains unverified. BENCH-008 (Historical): the six-node baseline, superseded. BENCH-011 (Partial): 82,863 signed transfers/s on all 10 nodes; raw JSON and source revision still to be attached. BENCH-014 (Partial): 17 claims/s durable on two fleet nodes over real WAN, not the 3-of-9 shape, not on production. No verified record is a throughput, latency or scale claim for production, and none is a comparison with an external chain."
    },
    "EVIDENCE": {
      "label": "Canonical evidence link",
      "kind": "line",
      "section": "Links",
      "value": "READ THE BENCHMARK STANDARD"
    },
    "NEXT": {
      "label": "Onward link (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "SEE THE MEASURED RESULTS"
    },
    "RUN": {
      "label": "Run-it-yourself link (in Evidence)",
      "kind": "line",
      "section": "Links",
      "value": "RUN DEFXN FROM SOURCE"
    },
    "RUN.HREF": {
      "label": "Run-it-yourself link (in Evidence): where it goes",
      "kind": "link",
      "section": "Links",
      "value": "route:download"
    },
    "BACK": {
      "label": "Link back to the theory (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "OPERATING MODEL"
    },
    "STATS": {
      "label": "Live fleet dashboard link",
      "kind": "line",
      "section": "Links",
      "value": "See the measured results on the fleet dashboard"
    },
    "STATS.HREF": {
      "label": "Live fleet dashboard target",
      "kind": "link",
      "section": "Links",
      "value": "route:stats"
    },
    "GPU": {
      "label": "GPU measurement link",
      "kind": "line",
      "section": "Links",
      "value": "Why the GPU does nothing here"
    },
    "GPU.HREF": {
      "label": "GPU measurement target",
      "kind": "link",
      "section": "Links",
      "value": "route:stats/gpu"
    },
    "LEDGER": {
      "label": "Finance resolver link",
      "kind": "line",
      "section": "Links",
      "value": "A finance resolver by construction"
    },
    "LEDGER.HREF": {
      "label": "Finance resolver target",
      "kind": "link",
      "section": "Links",
      "value": "route:stats/ledger"
    }
  }
});

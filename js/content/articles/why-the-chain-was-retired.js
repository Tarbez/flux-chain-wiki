/* Loaded only when this article is requested. */
LearningContent.load("why-the-chain-was-retired", {
  "core": "The first block-ordered chain was retired and the agreement fabric replaced it. The current design keeps the fabric's lesson, that unrelated work should never wait in one global queue, and brings the chain back as one grammar-only chain per identity, with resolvers on top.",
  "relevance": "Written before resolver chains and capabilities (2026-10-18) and kept as dated history. For how a resolver works now, read What is a resolver (/what-is-a-resolver). Use this note to see how the architecture got here, what each change kept, and which measurements back the current design.",
  "reviewed": "2026-10-08",
  "evidenceLabel": "BENCH-003: the measured fleet ceiling",
  "evidenceHref": "doc:docs/evidence/bench-003-rust-fleet-ceiling.md",
  "relatedPage": "route:chain",
  "actionLabel": "See every measurement",
  "actionPage": "route:stats",
  "questions": [
    "Was there a real chain?",
    "What did the agreement fabric change?",
    "What is the chain now?",
    "Which numbers can be quoted?",
    "What remains unproven?"
  ],
  "sections": [
    [
      "The earlier architecture",
      "Project material describes an earlier block-ordered implementation called flxd-chain. Every transaction waited for one global block order, so unrelated work queued behind everything else.",
      "Earlier copy gave throughput figures for local and network tests. Those figures are not repeated here because the evidence registry does not contain the workload, environment, source revision, raw artifact, and digest needed to inspect them."
    ],
    [
      "The agreement fabric",
      "The agreement fabric replaced the block order with signed records linked by causal CID references. Each agreement became its own trail, so unrelated work no longer waited behind yours.",
      "That idea survives. What changed is where the records live and who checks them."
    ],
    [
      "One chain per identity",
      "The current design, described in the FXN whitepaper, brings the chain back in a smaller form: every identity has its own signed, append-only chain. The chain admits a record only if its grammar is well-formed, its signature verifies, and it extends that holder's current head at a free position. It then copies the record to K-of-N peers.",
      "The chain carries no payload meaning. Transfers, books, markets, streams, governance and agreements are resolvers that read records on top. Because chains are disjoint, admission on one never blocks another, which is why capacity grows as nodes join."
    ],
    [
      "What the numbers say now",
      "The current design has dated, reproducible fleet measurements. On the full ten-node public mesh with Lever A+B+C (TransferAtomic for same-shard, TransferSend/Receive for cross-shard, hot-path cleanup), the DeFi transfer resolver completed 82,863 cross-shard transfers per second over a ten-second window with zero errors — 108,362 combined with one Mac. A separate soak sustained 12,403 chain records a second for 303 seconds, 3,760,000 in all, with zero failures.",
      "Completed transfers and logical operations were always reported separately and never merged into one figure; a per-replica figure once shown beside them was arithmetic, not a measurement, and is retired (docs/deprecated.md). There is still no registered record that compares the retired chain with the current one, so no multiplier is quoted."
    ],
    [
      "What remains unproven",
      "Independent-operator readiness, economic settlement, and production activation remain unverified in this site's evidence registry. A fleet benchmark is not a production claim.",
      "A cleaner headline cannot substitute for a reproducible measurement. Every number here links to the run that produced it."
    ]
  ],
  "numbers": false
});

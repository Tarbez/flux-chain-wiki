/* Loaded only when this article is requested. */
LearningContent.load("why-the-chain-was-retired", {
  "core": "The first block-and-validator chain was retired and the agreement fabric replaced it. The current design keeps the fabric's lesson, that unrelated work should never wait in one global queue, and brings the chain back as one grammar-only chain per identity, with resolvers on top.",
  "relevance": "Use this note to see how the architecture got here, what each change kept, and which measurements back the current design.",
  "reviewed": "2026-10-08",
  "evidenceLabel": "BENCH-003: the measured fleet ceiling",
  "evidenceHref": "docs/evidence/bench-003-rust-fleet-ceiling.md",
  "relatedPage": "concept/depth",
  "actionLabel": "See every measurement",
  "actionPage": "stats",
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
      "Project material describes an earlier block-and-validator implementation called flxd-chain. Every transaction waited for one global block order, so unrelated work queued behind everything else.",
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
      "The current design has dated, reproducible fleet measurements. On the six-node public mesh, the DeFi transfer resolver finalized 42,637 cross-shard transfers per second over a ten-second window, with zero errors. A separate soak sustained 12,403 accepted chain records per second for 303 seconds, 3,760,000 in all, with zero failures.",
      "Finalized transfers, logical operations and replica applications are always reported separately and never merged into one figure. There is still no registered record that compares the retired chain with the current one, so no multiplier is quoted."
    ],
    [
      "What remains unproven",
      "Independent-operator readiness, economic settlement, and production activation remain unverified in this site's evidence registry. A fleet benchmark is not a production claim.",
      "A cleaner headline cannot substitute for a reproducible measurement. Every number here links to the run that produced it."
    ]
  ],
  "numbers": false
});

/* Loaded only when this article is requested. */
LearningContent.load("why-the-chain-was-retired", {
  "core": "Project material describes replacing an earlier block-and-validator design with the agreement fabric. This site has no complete public benchmark record to verify the performance comparison yet.",
  "relevance": "Use this note to understand the architectural change and the evidence still needed to evaluate its performance claims.",
  "reviewed": "2026-09-30",
  "evidenceLabel": "Benchmark evidence standard and current status",
  "evidenceHref": "docs/protocol/benchmarks.md",
  "relatedPage": "concept/depth",
  "actionLabel": "Review the benchmark evidence standard",
  "actionPage": "concept/spec",
  "questions": [
    "Was there a real chain?",
    "Why retire it?",
    "Which numbers can be compared?",
    "What remains unproven?",
    "Why keep the distinctions?"
  ],
  "sections": [
    [
      "The earlier architecture",
      "Project material describes an earlier block-and-validator implementation called flxd-chain. It is part of the architecture's history, not the current agreement path.",
      "Earlier copy gave throughput figures for local and network tests. Those figures are not repeated here because the evidence registry does not contain the workload, environment, source revision, raw artifact, and digest needed to inspect them."
    ],
    [
      "Why the design changed",
      "The agreement fabric uses signed manifests and causal CID references instead of a global block order. Project records describe it as the replacement for the earlier chain design.",
      "The comparative result and the reported retirement state still need a dated, reproducible record before this site can present either as independently verified."
    ],
    [
      "What a comparison would require",
      "A valid comparison must identify the exact release, execution mode, environment, workload, sample size, and raw result for both systems. Local accept-and-store throughput is not the same measure as multi-host agreement finality.",
      "No complete public benchmark record is registered here. Until one exists, there is no supported multiplier, best-result figure, or external-chain comparison to quote."
    ],
    [
      "What's still in progress",
      "Independent-host readiness, sustained throughput, and a completed full-semantics soak remain unverified in this site's evidence registry.",
      "An early smoke sample cannot be promoted into a finished throughput result. The next publishable record needs the raw output, method, source revision, observation date, and digest."
    ],
    [
      "Why this discipline matters",
      "A cleaner headline cannot substitute for a reproducible measurement. The architecture story may be told now; the performance story must wait for evidence another operator can inspect."
    ]
  ],
  "numbers": false
});

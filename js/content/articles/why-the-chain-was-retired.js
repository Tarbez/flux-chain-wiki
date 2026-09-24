/* Loaded only when this article is requested. */
LearningContent.load("why-the-chain-was-retired", {
  "core": "The agreement fabric beat a real block-and-validator chain on the same five-validator mesh, so that chain was retired. The performance numbers still belong to distinct releases and test conditions.",
  "questions": [
    "Was there a real chain?",
    "Why retire it?",
    "Which numbers can be compared?",
    "What remains unproven?",
    "Why keep the distinctions?"
  ],
  "sections": [
    [
      "A real chain, built and measured",
      "DeadArk built a conventional block/validator chain first — flxd-chain, single-writer blocks, a fixed validator set, the design most people picture when they hear \"chain.\" It wasn't a placeholder: it had a real consensus path, and it was benchmarked honestly before anything replaced it.",
      "On a local, single-process path, flxd-chain reached about 3,900–4,100 tx/s sequential and 8,200–9,200 tx/s concurrent. Those are real numbers. They're also not a network finality result — single-process accept-and-store isn't the same measurement as five geographically separate validators agreeing over a real network."
    ],
    [
      "The comparison that retired it",
      "The agreement fabric — signed manifests, causal CID references, no global block order — was built as the alternative and measured against flxd-chain on the same five-validator WireGuard mesh. It won. flxd-chain was confirmed disabled on all five validator VPS after the results; the agreement fabric is the active finality path today.",
      "That's the actual reason this site doesn't talk about blocks: not a stylistic choice, a measured one."
    ],
    [
      "The numbers, kept separate by release",
      "This is the part worth being careful about, because it's easy to compress into one clean-sounding sentence that turns out to be wrong. Release 2.0.4 reached 65.2/s sustained concurrent throughput — the best measured number on this site — but there is no valid concurrent Solana comparison for that run. Solana's own concurrent Devnet attempts were rejected by rate limiting every time they were tried.",
      "Every Solana comparison that does exist is sequential-only, against Solana Devnet's own sequential baseline of 0.134/s, and comes from three different releases: the retired flxd-chain reached 5.85x that baseline; an early agreement-fabric build reached 7.34x; release 1.5.1 reached 20.46x; release 2.0.4 reached 18.81x. Three different releases, not one multiplier restated three times."
    ],
    [
      "What's still in progress",
      "The most recent release, 2.1.0, started a 24-hour full-semantics soak that had not completed at last measurement. Its first two 100-operation batches ran near 2.8/s — far below the 65.2/s figure above, and explicitly an early smoke sample, not a throughput ceiling. Reporting it as a finished result would be reporting a conclusion the system hadn't reached yet."
    ],
    [
      "Why this discipline matters",
      "A chain's whole job is to be trusted without having to re-verify it yourself. That only works if the numbers describing it stay exactly as precise as the measurements that produced them — which release, which configuration, sequential or concurrent, against what baseline. Flattening that for a cleaner headline is the one thing this page won't do."
    ]
  ],
  "numbers": false
});
